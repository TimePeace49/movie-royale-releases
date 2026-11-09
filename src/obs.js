// 🎥 OBS (obs-websocket, built into OBS 28 and newer: Tools → WebSocket Server Settings).
// Used by the wheel's Doomsday: mute your mic, hide your camera, and end the stream.
import crypto from 'crypto';
import WebSocket from 'ws';
import { db, save } from './store.js';

const sha = s => crypto.createHash('sha256').update(s).digest('base64');
export const status = { state: 'off', error: null };

/** One-off connection: connect, log in, run the requests, close. */
async function session(fn) {
  const s = db.settings, url = (s.obsUrl || 'ws://127.0.0.1:4455').trim();
  const ws = new WebSocket(url);
  let nextId = 1; const waiting = new Map();
  const ready = new Promise((ok, bad) => {
    const t = setTimeout(() => bad(new Error("couldn't reach OBS. Is OBS open, with Tools → WebSocket Server Settings → Enable turned on?")), 6000);
    ws.on('error', () => { clearTimeout(t); bad(new Error("couldn't reach OBS. Is OBS open, with the WebSocket server turned on?")); });
    ws.on('message', raw => {
      const m = JSON.parse(raw);
      if (m.op === 0) { // hello: log in (with the password if OBS asks for one)
        const auth = m.d.authentication;
        if (auth && !s.obsPassword) { clearTimeout(t); return bad(new Error('OBS wants a password: copy it from Tools → WebSocket Server Settings → Show Connect Info.')); }
        ws.send(JSON.stringify({ op: 1, d: { rpcVersion: 1, ...(auth ? { authentication: sha(sha(s.obsPassword + auth.salt) + auth.challenge) } : {}) } }));
      } else if (m.op === 2) { clearTimeout(t); ok(); }
      else if (m.op === 7) { const w = waiting.get(m.d.requestId); if (w) { waiting.delete(m.d.requestId); m.d.requestStatus.result ? w.ok(m.d.responseData || {}) : w.bad(new Error(m.d.requestStatus.comment || m.d.requestType + ' failed')); } }
    });
    ws.on('close', code => { clearTimeout(t); if (code === 4009) bad(new Error('OBS said the password is wrong.')); else bad(new Error('OBS closed the connection.')); });
  });
  const call = (requestType, requestData = {}) => new Promise((ok, bad) => { const requestId = String(nextId++); waiting.set(requestId, { ok, bad }); ws.send(JSON.stringify({ op: 6, d: { requestType, requestId, requestData } })); setTimeout(() => { if (waiting.delete(requestId)) bad(new Error(requestType + ' timed out')); }, 8000); });
  try { await ready; status.state = 'online'; status.error = null; return await fn(call); }
  catch (e) { status.state = 'error'; status.error = e.message; throw e; }
  finally { try { ws.close(); } catch {} }
}
/** Check the connection, and list your audio + video sources so you can pick your mic and camera. */
export async function test() {
  return session(async call => {
    const v = await call('GetVersion'), inputs = (await call('GetInputList')).inputs || [];
    return { obs: v.obsVersion, inputs: inputs.map(i => ({ name: i.inputName, kind: i.inputKind })) };
  });
}
// 🎙️ which OBS sources are "your mic" and "your camera": the names in Settings → 🎥 OBS (any upper/lower case),
// or, if a box is empty, every mic-type / camera-type source OBS has. A name OBS doesn't have = a clear error listing what it does have.
const MIC_KIND = /input_capture$|^wasapi_input|^coreaudio_input|^pulse_input|^alsa_input|^jack_input/i;
const CAM_KIND = /^dshow_input|^av_capture_input|^macos_avcapture|^v4l2_input/i;
async function findSources(call) {
  const s = db.settings, inputs = (await call('GetInputList')).inputs || [];
  const pick = (want, kindRe, what, box) => {
    want = String(want || '').trim();
    if (!want) return inputs.filter(i => kindRe.test(i.inputKind || '')).map(i => i.inputName);
    const hit = inputs.find(i => i.inputName === want) || inputs.find(i => i.inputName.trim().toLowerCase() === want.toLowerCase());
    if (!hit) throw new Error(`OBS has no source called "${want}" (your ${what}). Pick it from the list in ${box}. OBS has: ${inputs.map(i => i.inputName).join(', ') || 'nothing'}`);
    return [hit.inputName];
  };
  // global audio devices (Settings → Audio in OBS) show up as inputs too, so "Mic/Aux" works when that's your mic
  return { mics: pick(s.obsMic, MIC_KIND, 'mic', 'Settings → 🎥 OBS'), cams: pick(s.obsCam, CAM_KIND, 'camera', 'Settings → 🎥 OBS') };
}
async function hideCams(call, cams) { // hide each camera in every scene it's in; remembers which ones were showing
  const items = [];
  if (!cams.length) return items;
  for (const sc of (await call('GetSceneList')).scenes || []) for (const cam of cams) {
    try { const { sceneItemId } = await call('GetSceneItemId', { sceneName: sc.sceneName, sourceName: cam }); const { sceneItemEnabled } = await call('GetSceneItemEnabled', { sceneName: sc.sceneName, sceneItemId }); if (sceneItemEnabled) { items.push([sc.sceneName, sceneItemId]); await call('SetSceneItemEnabled', { sceneName: sc.sceneName, sceneItemId, sceneItemEnabled: false }); } } catch {}
  }
  return items;
}
/** Test tab: mic off + camera hidden for a few seconds, then back how they were. Never ends the stream. */
export async function muteTest(ms = 5000) {
  let found, muted = [], items = [];
  await session(async call => {
    found = await findSources(call);
    if (!found.mics.length && !found.cams.length) throw new Error("Couldn't find a mic or a camera in OBS. Pick them in Settings → 🎥 OBS (press Save & test the connection to fill the list).");
    for (const m of found.mics) { const { inputMuted } = await call('GetInputMute', { inputName: m }); if (!inputMuted) { await call('SetInputMute', { inputName: m, inputMuted: true }); muted.push(m); } }
    items = await hideCams(call, found.cams);
  });
  await new Promise(r => setTimeout(r, ms));
  await session(async call => {
    for (const m of muted) await call('SetInputMute', { inputName: m, inputMuted: false }).catch(() => {}); // only the ones that were on before
    for (const [sceneName, sceneItemId] of items) await call('SetSceneItemEnabled', { sceneName, sceneItemId, sceneItemEnabled: true }).catch(() => {});
  });
  return { cam: items.length, mics: found.mics, muted, cams: found.cams, alreadyMuted: found.mics.filter(m => !muted.includes(m)) };
}
/** Doomsday: mic off and camera off right away, the stream ends 15 seconds later. Once OBS says the stream is
 *  really over, your mic and camera come back on (only the ones Doomsday turned off). Not live = a full rehearsal:
 *  mic + camera off for 15 seconds, no stream to stop, then back on. */
const sleep = ms => new Promise(r => setTimeout(r, ms));
export async function streaming() { return session(async call => !!(await call('GetStreamStatus')).outputActive); }
export async function doomsday(delay = 15000) {
  let muted = [], items = [];
  await session(async call => {
    let found = { mics: [], cams: [] }; try { found = await findSources(call); } catch (e) { console.error('[obs]', e.message); }
    for (const m of found.mics) { const { inputMuted } = await call('GetInputMute', { inputName: m }).catch(() => ({ inputMuted: false })); if (!inputMuted) { await call('SetInputMute', { inputName: m, inputMuted: true }).catch(() => {}); muted.push(m); } }
    items = await hideCams(call, found.cams);
  });
  db.doomRestore = { mics: muted, items, at: Date.now() }; save(); // (remembered, so they still come back if Movie Royal is closed in the middle)
  await sleep(delay);
  let wasLive = false;
  await session(async call => { wasLive = !!(await call('GetStreamStatus')).outputActive; if (wasLive) await call('StopStream'); });
  for (let i = 0; wasLive && i < 45; i++) { // wait until the stream is really over (OBS takes a few seconds), then turn things back on
    await sleep(2000);
    if (!(await streaming().catch(() => false))) break;
  }
  await restoreDoom();
  return { ended: wasLive, mics: muted, cams: items.length };
}
/** After Doomsday: the mic(s) Doomsday muted and the camera(s) it hid come back on (never while you're still streaming). */
export async function restoreDoom() {
  const r = db.doomRestore; if (!r) return { restored: false };
  await session(async call => {
    if ((await call('GetStreamStatus')).outputActive && Date.now() - r.at < 120000) throw new Error('still streaming');
    for (const m of r.mics || []) await call('SetInputMute', { inputName: m, inputMuted: false }).catch(() => {});
    for (const [sceneName, sceneItemId] of r.items || []) await call('SetSceneItemEnabled', { sceneName, sceneItemId, sceneItemEnabled: true }).catch(() => {});
  });
  delete db.doomRestore; save(); return { restored: true };
}

// 📺 Capture window (Battle tab): a small window capture (e.g. your browser playing a YouTube video) in the top-left corner
// of whatever scene is live. Movie Royal makes the OBS source the first time ("Movie Royal capture window"), puts it on top,
// sizes it, and shows / hides it. You pick which window it captures from Movie Royal (or in OBS, the source's properties).
export const CAP_NAME = 'Movie Royal capture window';
const capName = () => String(db.settings.capName || '').trim() || CAP_NAME;
async function capInput(call) { // the source: make it if it isn't there (window capture, with sound)
  const name = capName(), inputs = (await call('GetInputList')).inputs || [];
  const have = inputs.find(i => i.inputName === name);
  if (have) return { name, made: false };
  const kinds = (await call('GetInputKindList', { unversioned: true })).inputKinds || [];
  const kind = ['window_capture', 'xcomposite_input', 'screen_capture', 'macos_screen_capture'].find(k => kinds.includes(k));
  if (!kind) throw new Error("this OBS can't capture a window.");
  const { currentProgramSceneName } = await call('GetCurrentProgramScene');
  await call('CreateInput', { sceneName: currentProgramSceneName, inputName: name, inputKind: kind, inputSettings: { capture_audio: true, ...(db.settings.capWindow ? { window: db.settings.capWindow } : {}) }, sceneItemEnabled: false });
  return { name, made: true };
}
/** The open windows OBS can capture (for the drop-down in Movie Royal). */
export async function captureWindows() {
  return session(async call => {
    const { name } = await capInput(call);
    const items = (await call('GetInputPropertiesListPropertyItems', { inputName: name, propertyName: 'window' }).catch(() => ({}))).propertyItems || [];
    const cur = (await call('GetInputSettings', { inputName: name })).inputSettings?.window || '';
    return { windows: items.filter(i => i.itemValue).map(i => ({ name: i.itemName, value: i.itemValue })), current: cur };
  });
}
/** Show (on) or hide (off) the capture window in the live scene. */
export async function capture(on) {
  return session(async call => {
    const { name } = await capInput(call);
    const s = db.settings;
    if (s.capWindow) await call('SetInputSettings', { inputName: name, inputSettings: { window: s.capWindow, capture_audio: true }, overlay: true });
    const { currentProgramSceneName: scene } = await call('GetCurrentProgramScene');
    if (!on) { // hide it in every scene it's in
      for (const sc of (await call('GetSceneList')).scenes || []) {
        const id = await call('GetSceneItemId', { sceneName: sc.sceneName, sourceName: name }).then(r => r.sceneItemId).catch(() => null);
        if (id != null) await call('SetSceneItemEnabled', { sceneName: sc.sceneName, sceneItemId: id, sceneItemEnabled: false });
      }
      return { on: false, scene };
    }
    let id = await call('GetSceneItemId', { sceneName: scene, sourceName: name }).then(r => r.sceneItemId).catch(() => null);
    if (id == null) id = (await call('CreateSceneItem', { sceneName: scene, sourceName: name, sceneItemEnabled: false })).sceneItemId;
    const v = await call('GetVideoSettings'), W = v.baseWidth || 1920, H = v.baseHeight || 1080;
    const pct = Math.max(10, Math.min(60, Number(s.capSize) || 30)) / 100, m = Math.round(W * .012);
    await call('SetSceneItemTransform', { sceneName: scene, sceneItemId: id, sceneItemTransform: { positionX: m, positionY: m, alignment: 5, boundsType: 'OBS_BOUNDS_SCALE_INNER', boundsAlignment: 5, boundsWidth: Math.round(W * pct), boundsHeight: Math.round(H * pct), rotation: 0 } });
    const n = ((await call('GetSceneItemList', { sceneName: scene })).sceneItems || []).length;
    await call('SetSceneItemIndex', { sceneName: scene, sceneItemId: id, sceneItemIndex: Math.max(0, n - 1) }).catch(() => {}); // on top of everything
    await call('SetSceneItemEnabled', { sceneName: scene, sceneItemId: id, sceneItemEnabled: true });
    return { on: true, scene };
  });
}
// 🎉 Viewer's choice: a browser source (Movie Royal's celebration page) on top of every scene. Only added when you turn it on.
/** 🎬 Your OBS scenes (for picking where the celebration goes): names, the one on stream now, and the ones that already have it. */
// 🎛️ (1.85.0) the scenes of the scene collection OBS has open (Stream Deck scene keys)
export async function scenesNow() {
  return session(async call => {
    const r = await call('GetSceneList'), c = await call('GetSceneCollectionList').catch(() => ({}));
    return { scenes: (r.scenes || []).map(x => x.sceneName).reverse(), current: r.currentProgramSceneName || null, collection: c.currentSceneCollectionName || '' };
  });
}
// 🎛️ switch to a scene (preview = put it in Studio Mode's preview when Studio Mode is on, like OBS's own scene keys)
export async function goScene(name, preview = false) {
  return session(async call => {
    const r = await call('GetSceneList');
    if (!(r.scenes || []).some(x => x.sceneName === name)) { const c = await call('GetSceneCollectionList').catch(() => ({})); throw new Error(`OBS has no scene called “${name}” right now${c.currentSceneCollectionName ? ` (OBS has your “${c.currentSceneCollectionName}” scenes open)` : ''}.`); }
    let studio = false; if (preview) studio = !!(await call('GetStudioModeEnabled').catch(() => ({}))).studioModeEnabled;
    await call(studio ? 'SetCurrentPreviewScene' : 'SetCurrentProgramScene', { sceneName: name });
    return { studio };
  });
}
export async function sceneList(source = 'Movie Royal celebration') {
  return session(async call => {
    const r = await call('GetSceneList'), scenes = (r.scenes || []).map(x => x.sceneName).reverse(); // (OBS lists them bottom-up)
    const has = [];
    for (const sc of scenes) if (await call('GetSceneItemId', { sceneName: sc, sourceName: source }).then(() => true).catch(() => false)) has.push(sc);
    return { scenes, current: r.currentProgramSceneName || null, has };
  });
}
// 🎉 The viewer's choice celebration as an OBS browser source, on top of the scenes you picked (1.58.1, Derek: you pick the scenes,
// not every scene). pick = scene names (it's taken out of the others); null = keep it in the scenes that already have it.
export async function celebrateSource(on, file, pick = null) {
  return browserSource('Movie Royal celebration', on, (W, H) => ({ is_local_file: true, local_file: file, width: W, height: H, fps: 60, reroute_audio: false, shutdown: false, restart_when_active: false, css: 'body { background-color: rgba(0,0,0,0); margin: 0; overflow: hidden; }' }), pick);
}
// 📣 Roll call as its own OBS browser source (1.61.0, Derek): Movie Royal's /rollcall.html, on top of the scenes you picked.
export const ROLL_NAME = 'Movie Royal roll call';
export async function rollSource(on, url, pick = null) {
  return browserSource(ROLL_NAME, on, (W, H) => ({ is_local_file: false, url, width: W, height: H, fps: 30, reroute_audio: false, shutdown: false, restart_when_active: false, css: 'body { background-color: rgba(0,0,0,0); margin: 0; overflow: hidden; }' }), pick);
}
export const MARA_NAME = 'Movie Royal marathon';
/** 🏃 the marathon overlay (battles owed counter + the pop-up when someone gets a battle), 1.76.0 */
export async function maraSource(on, url, pick = null) {
  return browserSource(MARA_NAME, on, (W, H) => ({ is_local_file: false, url, width: W, height: H, fps: 30, reroute_audio: false, shutdown: false, restart_when_active: false, css: 'body { background-color: rgba(0,0,0,0); margin: 0; overflow: hidden; }' }), pick);
}
// 📜 (1.78.0, Derek) "battles are paused" message: one line of white text scrolling right to left. ▶ Show puts it on (on top)
// in the scene you're in right now; ⏸ Hide turns it off in every scene (the source stays in OBS, so wherever you moved it stays).
export const TICKER_NAME = 'Movie Royal paused message';
export async function tickerSource(on, url) {
  return session(async call => {
    const inputs = (await call('GetInputList')).inputs || [], have = inputs.find(i => i.inputName === TICKER_NAME);
    const all = ((await call('GetSceneList')).scenes || []).map(s => s.sceneName);
    const inScene = async sc => call('GetSceneItemId', { sceneName: sc, sourceName: TICKER_NAME }).then(r => r.sceneItemId).catch(() => null);
    if (!on) { let n = 0; if (have) for (const sc of all) { const id = await inScene(sc); if (id != null) { await call('SetSceneItemEnabled', { sceneName: sc, sceneItemId: id, sceneItemEnabled: false }).catch(() => {}); n++; } } return { on: false, hidden: n }; }
    const cur = await call('GetCurrentProgramScene'), scene = cur.currentProgramSceneName || cur.sceneName; if (!scene) throw new Error('OBS has no scene showing.');
    const v = await call('GetVideoSettings'), W = v.baseWidth || 1920, H = v.baseHeight || 1080;
    const settings = { is_local_file: false, url, width: W, height: H, fps: 60, reroute_audio: false, shutdown: false, restart_when_active: false, css: 'body { background-color: rgba(0,0,0,0); margin: 0; overflow: hidden; }' };
    let id = null, fresh = false;
    if (!have) { id = (await call('CreateInput', { sceneName: scene, inputName: TICKER_NAME, inputKind: 'browser_source', inputSettings: settings, sceneItemEnabled: true })).sceneItemId; fresh = true; }
    else { const cs = (await call('GetInputSettings', { inputName: TICKER_NAME }).catch(() => ({}))).inputSettings || {}; if (cs.url !== url) await call('SetInputSettings', { inputName: TICKER_NAME, inputSettings: settings, overlay: true }); id = await inScene(scene); if (id == null) { id = (await call('CreateSceneItem', { sceneName: scene, sourceName: TICKER_NAME, sceneItemEnabled: true })).sceneItemId; fresh = true; } }
    if (fresh) {
      await call('SetSceneItemTransform', { sceneName: scene, sceneItemId: id, sceneItemTransform: { positionX: 0, positionY: 0, alignment: 5, boundsType: 'OBS_BOUNDS_STRETCH', boundsAlignment: 0, boundsWidth: W, boundsHeight: H, rotation: 0 } }).catch(() => {});
      const n = ((await call('GetSceneItemList', { sceneName: scene })).sceneItems || []).length;
      await call('SetSceneItemIndex', { sceneName: scene, sceneItemId: id, sceneItemIndex: Math.max(0, n - 1) }).catch(() => {}); // on top of everything
    }
    await call('SetSceneItemEnabled', { sceneName: scene, sceneItemId: id, sceneItemEnabled: true });
    return { on: true, scene };
  });
}
/** Is the paused message showing in the scene you're in right now? */
export async function tickerState() {
  return session(async call => {
    const cur = await call('GetCurrentProgramScene'), scene = cur.currentProgramSceneName || cur.sceneName;
    const id = await call('GetSceneItemId', { sceneName: scene, sourceName: TICKER_NAME }).then(r => r.sceneItemId).catch(() => null);
    const on = id != null && !!(await call('GetSceneItemEnabled', { sceneName: scene, sceneItemId: id }).catch(() => ({}))).sceneItemEnabled;
    return { on, scene };
  });
}
/** A browser source on top of the scenes you picked (taken out of the others); off = removed from OBS. */
async function browserSource(name, on, mkSettings, pick = null) {
  return session(async call => {
    const inputs = (await call('GetInputList')).inputs || [], have = inputs.find(i => i.inputName === name);
    if (!on) { if (have) await call('RemoveInput', { inputName: name }); return { on: false, removed: !!have }; }
    const v = await call('GetVideoSettings'), W = v.baseWidth || 1920, H = v.baseHeight || 1080;
    const all = ((await call('GetSceneList')).scenes || []).map(s => s.sceneName); if (!all.length) throw new Error('OBS has no scenes.');
    const inScene = async sc => call('GetSceneItemId', { sceneName: sc, sourceName: name }).then(r => r.sceneItemId).catch(() => null);
    let target;
    if (Array.isArray(pick)) target = pick.filter(sc => all.includes(sc));
    else { target = []; if (have) for (const sc of all) if (await inScene(sc) != null) target.push(sc); }
    if (!target.length) throw new Error(Array.isArray(pick) && pick.length ? 'Those scenes aren\'t in OBS any more: pick your scenes again.' : 'Pick at least one OBS scene for it.');
    const settings = mkSettings(W, H);
    if (!have) await call('CreateInput', { sceneName: target[0], inputName: name, inputKind: 'browser_source', inputSettings: settings, sceneItemEnabled: true });
    else { await call('SetInputSettings', { inputName: name, inputSettings: settings, overlay: true }); await call('PressInputPropertiesButton', { inputName: name, propertyName: 'refreshnocache' }).catch(() => {}); } // (reload it: the file may have changed)
    let added = 0;
    for (const sc of target) {
      let id = await inScene(sc), fresh = false;
      if (id == null) { id = (await call('CreateSceneItem', { sceneName: sc, sourceName: name, sceneItemEnabled: true })).sceneItemId; added++; fresh = true; }
      if (!fresh && have) continue; // (already in this scene: left how you have it)
      await call('SetSceneItemTransform', { sceneName: sc, sceneItemId: id, sceneItemTransform: { positionX: 0, positionY: 0, alignment: 5, boundsType: 'OBS_BOUNDS_STRETCH', boundsAlignment: 0, boundsWidth: W, boundsHeight: H, rotation: 0 } }).catch(() => {});
      const n = ((await call('GetSceneItemList', { sceneName: sc })).sceneItems || []).length;
      await call('SetSceneItemIndex', { sceneName: sc, sceneItemId: id, sceneItemIndex: Math.max(0, n - 1) }).catch(() => {}); // on top of everything
      await call('SetSceneItemEnabled', { sceneName: sc, sceneItemId: id, sceneItemEnabled: true });
    }
    let removed = 0;
    if (Array.isArray(pick)) for (const sc of all) { if (target.includes(sc)) continue; const id = await inScene(sc); if (id != null) { await call('RemoveSceneItem', { sceneName: sc, sceneItemId: id }).catch(() => {}); removed++; } } // (taken out of scenes you didn't pick)
    return { on: true, scenes: target.length, sceneNames: target, added, removed };
  });
}

// ---------- 🎬 My videos (1.86.0, Derek: "make sure new stuff is added to OBS") ----------
// A video file from your PC as a looping Media Source "🎬 <name>", behind everything (the bottom of the source list), filling
// the screen, in the scenes you picked (taken out of the others). Already in a scene = left where you put it.
export const VIDEO_PREFIX = '🎬 ';
// (1.86.1) cover = when the video goes into a scene for the first time, the scene's own full-screen background piece is switched
// off (its eye), so the video is what shows: Movie Royal's title card (scenecard.html), or an overlay named after the scene
// ("Starting Overlay" in "Starting", "Just Chatting Overlay" in "Just Chatting"). Returns them in `hid` so they can come back.
const BG_KINDS = /browser_source|image_source|ffmpeg_source|color_source|slideshow/;
const sceneWords = sc => String(sc).toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/).filter(w => w.length >= 4 && !/^(stream|scene|movie|royal)$/.test(w));
async function findBackground(call, sceneName, mine) {
  const items = ((await call('GetSceneItemList', { sceneName })).sceneItems || []).slice().sort((a, b) => (a.sceneItemIndex ?? 0) - (b.sceneItemIndex ?? 0));
  const words = sceneWords(sceneName);
  for (const it of items) {
    if (it.sourceName === mine || it.sceneItemEnabled === false || it.isGroup || (it.inputKind && !BG_KINDS.test(it.inputKind))) continue;
    const nm = String(it.sourceName).toLowerCase();
    let url = ''; if (/browser/.test(it.inputKind || 'browser')) { try { url = (await call('GetInputSettings', { inputName: it.sourceName })).inputSettings?.url || ''; } catch {} }
    if (/scenecard\.html/.test(url) && !/k=sleep/.test(url)) return it;
    if (/overlay|background|screen|card/.test(nm) && words.some(w => nm.includes(w))) return it;
  }
  return null;
}
export async function showItems(list) { // put back pieces a video switched off
  return session(async call => { let n = 0; for (const h of list || []) { try { const id = (await call('GetSceneItemId', { sceneName: h.scene, sourceName: h.source })).sceneItemId; await call('SetSceneItemEnabled', { sceneName: h.scene, sceneItemId: id, sceneItemEnabled: true }); n++; } catch {} } return { shown: n }; });
}
export async function makeScene(sceneName) { return session(async call => { const all = ((await call('GetSceneList')).scenes || []).map(s => s.sceneName); if (!all.includes(sceneName)) await call('CreateScene', { sceneName }); return { made: !all.includes(sceneName) }; }); }
export async function videoSource(name, { file, scenes, on = true, loop = true, cover = false }) {
  return session(async call => {
    const inputs = (await call('GetInputList')).inputs || [], have = inputs.find(i => i.inputName === name);
    if (!on) { if (have) await call('RemoveInput', { inputName: name }); return { on: false, removed: !!have }; }
    const all = ((await call('GetSceneList')).scenes || []).map(s => s.sceneName); if (!all.length) throw new Error('OBS has no scenes.');
    const target = (scenes || []).filter(sc => all.includes(sc)); if (!target.length) throw new Error((scenes || []).length ? 'Those scenes aren\'t in OBS right now (is your other scene collection open?).' : 'Pick at least one OBS scene for it.');
    const v = await call('GetVideoSettings'), W = v.baseWidth || 1920, H = v.baseHeight || 1080;
    const settings = { is_local_file: true, local_file: file, looping: !!loop, restart_on_activate: false, close_when_inactive: false, hw_decode: true, clear_on_media_end: false };
    let fileChanged = false;
    if (!have) await call('CreateInput', { sceneName: target[0], inputName: name, inputKind: 'ffmpeg_source', inputSettings: settings, sceneItemEnabled: true });
    else { const cur = (await call('GetInputSettings', { inputName: name }).catch(() => ({}))).inputSettings || {}; if (cur.local_file !== file || cur.looping !== !!loop) { await call('SetInputSettings', { inputName: name, inputSettings: settings, overlay: true }); fileChanged = true; } }
    const inScene = async sc => call('GetSceneItemId', { sceneName: sc, sourceName: name }).then(r => r.sceneItemId).catch(() => null);
    let added = 0; const hid = [];
    for (const sc of target) {
      let id = await inScene(sc);
      if (id != null && !(!have && sc === target[0])) continue; // (already there: left how you have it)
      if (id == null) { id = (await call('CreateSceneItem', { sceneName: sc, sourceName: name, sceneItemEnabled: true })).sceneItemId; }
      added++;
      if (cover) { try { const bg = await findBackground(call, sc, name); if (bg) { await call('SetSceneItemEnabled', { sceneName: sc, sceneItemId: bg.sceneItemId, sceneItemEnabled: false }); hid.push({ scene: sc, source: bg.sourceName }); } } catch {} }
      await call('SetSceneItemTransform', { sceneName: sc, sceneItemId: id, sceneItemTransform: { positionX: 0, positionY: 0, alignment: 5, boundsType: 'OBS_BOUNDS_SCALE_OUTER', boundsAlignment: 0, boundsWidth: W, boundsHeight: H, rotation: 0 } }).catch(() => {});
      await call('SetSceneItemIndex', { sceneName: sc, sceneItemId: id, sceneItemIndex: 0 }).catch(() => {}); // behind everything
    }
    let removed = 0;
    for (const sc of all) { if (target.includes(sc)) continue; const id = await inScene(sc); if (id != null) { await call('RemoveSceneItem', { sceneName: sc, sceneItemId: id }).catch(() => {}); removed++; } }
    return { on: true, scenes: target.length, added, removed, fileChanged, made: !have, hid };
  });
}
// 🔄 play it from the start again (OBS opens the file again, so a video you replaced on disk shows up)
export async function videoReload(name) {
  return session(async call => { await call('TriggerMediaInputAction', { inputName: name, mediaAction: 'OBS_WEBSOCKET_MEDIA_INPUT_ACTION_RESTART' }); return { ok: true }; });
}

// ---------- 🤝 co-stream (1.71.0) ----------
// Your side: a small scene "🤝 Co-stream share" = your camera + your game screen (the SAME sources as on your stream, not copies,
// so it's the exact same fight), shown by OBS's Virtual Camera. A hidden window sends that picture to your partner (VDO.Ninja).
// Their side: one browser source with your picture, added twice to their scene: once cut to your camera, once cut to your battle.
export const CO_SCENE = '🤝 Co-stream share';
const GAME_URL = /(localhost|127\.0\.0\.1):\d+\/game\.html/i;
async function findGame(call, inputs) { // your game screen in OBS: Movie Royal's browser source (not a preview), else the capture window
  const want = String(db.settings.obsGame || '').trim();
  if (want) { const hit = inputs.find(i => i.inputName.toLowerCase() === want.toLowerCase()); if (hit) return hit.inputName; }
  for (const i of inputs.filter(i => /browser_source/.test(i.inputKind || ''))) {
    try { const { inputSettings: s } = await call('GetInputSettings', { inputName: i.inputName }); if (GAME_URL.test(s.url || '') && !/preview=1|side=1|lab=1/.test(s.url || '')) return i.inputName; } catch {}
  }
  return inputs.find(i => i.inputName === CAP_NAME)?.inputName || null;
}
async function ensureItem(call, sceneName, sourceName) {
  try { return (await call('GetSceneItemId', { sceneName, sourceName })).sceneItemId; }
  catch { return (await call('CreateSceneItem', { sceneName, sourceName, sceneItemEnabled: true })).sceneItemId; }
}
/** Make / fix your share scene and start the Virtual Camera. Returns the layout your partner needs to cut the picture. */
export async function coShare() {
  return session(async call => {
    const vs = await call('GetVideoSettings'), W = vs.baseWidth || 1920, H = vs.baseHeight || 1080;
    const inputs = (await call('GetInputList')).inputs || [];
    const game = await findGame(call, inputs), cams = (await findSources(call)).cams, cam = cams[0] || null;
    if (!game) throw new Error("couldn't find Movie Royal's game screen in OBS. Add it first (🧭 Setup guide → OBS), then try again.");
    const scenes = ((await call('GetSceneList')).scenes || []).map(s => s.sceneName);
    if (!scenes.includes(CO_SCENE)) await call('CreateScene', { sceneName: CO_SCENE });
    // battle = the top-left ¾, camera = the top-right corner (the rest stays black, which costs almost nothing to send)
    const layout = { W, H, battle: [0, 0, Math.round(W * .75), Math.round(H * .75)], cam: cam ? [Math.round(W * .75), 0, W - Math.round(W * .75), Math.round(H * .25)] : null };
    const place = async (src, [x, y, w, h]) => {
      const id = await ensureItem(call, CO_SCENE, src);
      await call('SetSceneItemTransform', { sceneName: CO_SCENE, sceneItemId: id, sceneItemTransform: { positionX: x, positionY: y, alignment: 5, boundsType: 'OBS_BOUNDS_SCALE_INNER', boundsAlignment: 0, boundsWidth: w, boundsHeight: h, cropLeft: 0, cropTop: 0, cropRight: 0, cropBottom: 0 } });
      await call('SetSceneItemEnabled', { sceneName: CO_SCENE, sceneItemId: id, sceneItemEnabled: true });
    };
    await place(game, layout.battle);
    if (cam) await place(cam, layout.cam);
    let started = false;
    try { if (!(await call('GetVirtualCamStatus')).outputActive) { await call('StartVirtualCam'); started = true; } } catch (e) { throw new Error("couldn't start OBS's Virtual Camera: " + e.message); }
    return { layout, game, cam, started };
  });
}
export async function coShareStop() { return session(async call => { try { if ((await call('GetVirtualCamStatus')).outputActive) await call('StopVirtualCam'); } catch {} return true; }); }

/** Your partner's picture in your OBS: one browser source, two pieces (their camera + their battle). Keeps where you moved them. */
export async function coViewer({ url, name, layout, scene, battleOn, autoBattle, camOn, camSide = 'right' }, saved = {}) {
  return session(async call => {
    const vs = await call('GetVideoSettings'), MW = vs.baseWidth || 1920, MH = vs.baseHeight || 1080;
    const inputs = (await call('GetInputList')).inputs || [], scenes = ((await call('GetSceneList')).scenes || []).map(s => s.sceneName);
    const sceneName = scene && scenes.includes(scene) ? scene : (saved.scene && scenes.includes(saved.scene) ? saved.scene : (await call('GetCurrentProgramScene')).currentProgramSceneName);
    const W = layout?.W || 1920, H = layout?.H || 1080, inputName = saved.input && inputs.some(i => i.inputName === saved.input) ? saved.input : `🤝 ${String(name || 'Co-streamer').slice(0, 30)} (co-stream)`;
    const settings = { url, width: W, height: H, reroute_audio: false, shutdown: false, restart_when_active: false, fps_custom: false };
    const out = { ...saved, scene: sceneName, input: inputName }, fresh = !inputs.some(i => i.inputName === inputName) || saved.scene !== sceneName;
    if (!inputs.some(i => i.inputName === inputName)) out.battleItem = (await call('CreateInput', { sceneName, inputName, inputKind: 'browser_source', inputSettings: settings, sceneItemEnabled: false })).sceneItemId;
    else { await call('SetInputSettings', { inputName, inputSettings: settings, overlay: true }); out.battleItem = await ensureItem(call, sceneName, inputName); }
    // the second piece (camera): the same source again (one connection, two cut-outs)
    const items = ((await call('GetSceneItemList', { sceneName })).sceneItems || []).filter(i => i.sourceName === inputName).map(i => i.sceneItemId);
    out.camItem = items.find(id => id !== out.battleItem) ?? (await call('CreateSceneItem', { sceneName, sourceName: inputName, sceneItemEnabled: true })).sceneItemId;
    const crop = ([x, y, w, h]) => ({ cropLeft: x, cropTop: y, cropRight: Math.max(0, W - x - w), cropBottom: Math.max(0, H - y - h) });
    const key = JSON.stringify(layout || null);
    if (layout && (fresh || out.layoutKey !== key)) {
      const b = layout.battle, bt = { ...crop(b), alignment: 5, boundsType: 'OBS_BOUNDS_NONE' };
      if (fresh || !out.layoutKey) Object.assign(bt, { positionX: 0, positionY: 0, scaleX: MW / b[2], scaleY: MH / b[3] }); // first time: their battle fills your screen
      await call('SetSceneItemTransform', { sceneName, sceneItemId: out.battleItem, sceneItemTransform: bt });
      if (layout.cam) await call('SetSceneItemTransform', { sceneName, sceneItemId: out.camItem, sceneItemTransform: { ...crop(layout.cam), alignment: 5, boundsType: 'OBS_BOUNDS_NONE' } });
      out.layoutKey = key;
    }
    if (layout?.cam && (fresh || out.camSide !== camSide)) { // their camera on THEIR side (Derek: Kirb left, Derek right, on both streams); after that you can move it
      const c = layout.cam, k = MW * .24 / c[2], x = camSide === 'left' ? Math.round(MW * .015) : Math.round(MW - c[2] * k - MW * .015);
      await call('SetSceneItemTransform', { sceneName, sceneItemId: out.camItem, sceneItemTransform: { positionX: x, positionY: Math.round(MH * .03), scaleX: k, scaleY: k } });
      out.camSide = camSide;
    }
    try { await call('SetSceneItemIndex', { sceneName, sceneItemId: out.camItem, sceneItemIndex: ((await call('GetSceneItemList', { sceneName })).sceneItems || []).length - 1 }); } catch {} // camera on top of the battle
    if (autoBattle) await call('SetSceneItemEnabled', { sceneName, sceneItemId: out.battleItem, sceneItemEnabled: !!battleOn });
    if (camOn != null) await call('SetSceneItemEnabled', { sceneName, sceneItemId: out.camItem, sceneItemEnabled: !!camOn && !!layout?.cam });
    return out;
  });
}
export async function coBattleShow(saved, on) {
  if (!saved?.scene || saved.battleItem == null) return false;
  return session(async call => { await call('SetSceneItemEnabled', { sceneName: saved.scene, sceneItemId: saved.battleItem, sceneItemEnabled: !!on }); return true; });
}
export async function coViewerRemove(saved) { if (!saved?.input) return true; return session(async call => { try { await call('RemoveInput', { inputName: saved.input }); } catch {} return true; }); }

/** 🩺 Lag check: is it the internet (dropped frames) or the PC (skipped frames)? */
export async function coStats() {
  return session(async call => {
    const st = await call('GetStats'), ss = await call('GetStreamStatus').catch(() => ({})), vc = await call('GetVirtualCamStatus').catch(() => ({}));
    const pct = (a, b) => b > 0 ? Math.round(1000 * a / b) / 10 : 0;
    return { at: Date.now(), cpu: Math.round(st.cpuUsage || 0), fps: Math.round(st.activeFps || 0), render: pct(st.renderSkippedFrames || 0, st.renderTotalFrames || 0), encode: pct(st.outputSkippedFrames || 0, st.outputTotalFrames || 0), live: !!ss.outputActive, net: pct(ss.outputSkippedFrames || 0, ss.outputTotalFrames || 0), congestion: Math.round((ss.outputCongestion || 0) * 100), vcam: !!vc.outputActive };
  });
}

// ---------- 🧰 Marathon OBS setup (1.79.0, Derek: "I want to make a new OBS profile for this stream, so we will have to make that too") ----------
// One button makes (or fixes) a separate OBS setup for the 🏃 marathon: a new PROFILE copied from the one you're using (stream
// key, video size, frame rate, output + audio settings) and a new SCENE COLLECTION with four scenes, each with the Movie Royal
// pieces already in place. Your normal profile + scenes are left alone (switch back any time: OBS's Profile / Scene Collection
// menus, or ↩️ in Movie Royal). Running it again on an existing setup only adds what's missing (nothing you moved is touched).
// OBS can't copy a camera or game capture between scene collections, so it makes new ones that you point at your camera / GTA once.
export const MARA_SCENES = { game: '🎮 GTA 6 Gameplay', co: '🤝 Co-stream (GTA 6)', battle: '⚔️ Battle', cook: '🍳 Cooking', chat: '💬 Just Chatting', brb: '☕ Be Right Back', sleep: '😴 Sleeping / AFK', soon: '⏳ Starting Soon' };
const OLD_SOON = '⏳ Starting Soon / BRB'; // (before 1.84.0 BRB shared the starting soon scene: renamed once)
export const YT_NAMES = { brb: '📺 BRB videos (YouTube)', sleep: '📺 Sleeping videos (YouTube)' };
// 🍳 (1.82.0, Derek: a cooking stream with 3 cameras, 1 big + 2 small) the cooking cameras and where they sit; cookBig(n) swaps which one is big
export const COOK_CAMS = ['📷 Cooking cam 1', '📷 Cooking cam 2', '📷 Cooking cam 3'];
const COOK_BOXES = [[0, 0, .75, .75], [.75, 0, .25, .25], [.75, .25, .25, .25]];
export const MARA_MINI = 'Movie Royal marathon (small)';
export const COOK_MIC = '🎙️ Cooking mics (wireless)'; // (1.82.7) the USB receiver of Derek's wireless mics: only in the 🍳 Cooking scene
const GAME_CAM = [.81, .785, .175, .19];
/** 🍳 make cooking camera n (1–3) the big one; the other two go small in order. */
export async function cookBig(n) {
  return session(async call => {
    const v = await call('GetVideoSettings'), W = v.baseWidth || 1920, H = v.baseHeight || 1080, sc = MARA_SCENES.cook;
    const ids = []; for (const c of COOK_CAMS) ids.push(await call('GetSceneItemId', { sceneName: sc, sourceName: c }).then(r => r.sceneItemId).catch(() => null));
    if (ids.every(x => x == null)) throw new Error(`OBS has no “${sc}” scene with the cooking cameras: make the marathon OBS setup first (🏃 Marathon tab → 🧰).`);
    const k = Math.max(1, Math.min(3, Number(n) || 1)) - 1, order = [k, ...[0, 1, 2].filter(i => i !== k)];
    for (let j = 0; j < 3; j++) { const id = ids[order[j]]; if (id == null) continue; const b = COOK_BOXES[j]; await call('SetSceneItemTransform', { sceneName: sc, sceneItemId: id, sceneItemTransform: { positionX: Math.round(b[0] * W), positionY: Math.round(b[1] * H), alignment: 5, boundsType: 'OBS_BOUNDS_SCALE_INNER', boundsAlignment: 0, boundsWidth: Math.round(b[2] * W), boundsHeight: Math.round(b[3] * H), rotation: 0 } }); }
    return { big: k + 1 };
  });
}
const PROFILE_PARAMS = [['Output', 'Mode'], ['SimpleOutput', 'VBitrate'], ['SimpleOutput', 'ABitrate'], ['SimpleOutput', 'StreamEncoder'], ['SimpleOutput', 'RecEncoder'], ['SimpleOutput', 'RecQuality'], ['SimpleOutput', 'RecFormat2'], ['SimpleOutput', 'FilePath'], ['SimpleOutput', 'Preset'], ['SimpleOutput', 'NVENCPreset2'], ['SimpleOutput', 'UseAdvanced'],
  ['AdvOut', 'Encoder'], ['AdvOut', 'RecEncoder'], ['AdvOut', 'RecFilePath'], ['AdvOut', 'RecFormat2'], ['AdvOut', 'TrackIndex'], ['AdvOut', 'RecTracks'], ['AdvOut', 'AudioEncoder'], ['AdvOut', 'RecAudioEncoder'], ['AdvOut', 'VodTrackEnabled'], ['AdvOut', 'VodTrackIndex'],
  ['Audio', 'SampleRate'], ['Audio', 'ChannelSetup'], ['Video', 'ScaleType'], ['Video', 'ColorFormat'], ['Video', 'ColorSpace'], ['Video', 'ColorRange']];
export async function obsSetups() { return session(async call => { const p = await call('GetProfileList'), c = await call('GetSceneCollectionList'), vs = await call('GetVideoSettings').catch(() => null); return { fps: vs ? Math.round(100 * vs.fpsNumerator / (vs.fpsDenominator || 1)) / 100 : null, profile: p.currentProfileName, profiles: p.profiles || [], collection: c.currentSceneCollectionName, collections: c.sceneCollections || [] }; }); }
export async function switchSetup(profile, collection) {
  return session(async call => {
    if ((await call('GetStreamStatus').catch(() => ({}))).outputActive || (await call('GetRecordStatus').catch(() => ({}))).outputActive) throw new Error("OBS is streaming or recording: OBS doesn't let anyone change the profile then. Switch after you stop, or use OBS's menus.");
    const p = await call('GetProfileList'), c = await call('GetSceneCollectionList');
    if (profile && p.currentProfileName !== profile) { if (!(p.profiles || []).includes(profile)) throw new Error(`OBS has no profile called “${profile}”.`); await call('SetCurrentProfile', { profileName: profile }); }
    if (collection && c.currentSceneCollectionName !== collection) { if (!(c.sceneCollections || []).includes(collection)) throw new Error(`OBS has no scene collection called “${collection}”.`); await call('SetCurrentSceneCollection', { sceneCollectionName: collection }); }
    return { profile: profile || p.currentProfileName, collection: collection || c.currentSceneCollectionName };
  });
}
/** 🎞️ (1.84.0, Derek: "I should be 60 fps") OBS's frame rate for the profile in use (not while streaming / recording). */
export async function setFps(n) {
  return session(async call => {
    n = Number(n) === 30 ? 30 : 60;
    if ((await call('GetStreamStatus').catch(() => ({}))).outputActive || (await call('GetRecordStatus').catch(() => ({}))).outputActive) throw new Error("OBS is streaming or recording: OBS only lets the frame rate change when you're not. Do it after you stop.");
    const v = await call('GetVideoSettings');
    await call('SetVideoSettings', { fpsNumerator: n, fpsDenominator: 1, baseWidth: v.baseWidth, baseHeight: v.baseHeight, outputWidth: v.outputWidth, outputHeight: v.outputHeight });
    const p = await call('GetProfileList'); return { fps: n, was: Math.round(100 * v.fpsNumerator / (v.fpsDenominator || 1)) / 100, profile: p.currentProfileName };
  });
}
/** urls: {game, mara, card(kind)}; extra: [{name, url}] browser sources to put in every scene too (celebration, roll call). dry = only say what it would do. */
export async function marathonSetup({ profile, collection, urls, extra = [], dry = false, coSide = 'right', keepScene = false }) {
  return session(async call => {
    const out = [], say = (icon, text) => out.push({ icon, text });
    if ((await call('GetStreamStatus').catch(() => ({}))).outputActive || (await call('GetRecordStatus').catch(() => ({}))).outputActive) throw new Error("OBS is streaming or recording right now: OBS doesn't let anyone switch profiles then. Do this before you go live.");
    const P = await call('GetProfileList'), C = await call('GetSceneCollectionList');
    const prev = { profile: P.currentProfileName, collection: C.currentSceneCollectionName };
    // 1) the profile: a copy of the one you're on (or switch to it if it's there already)
    if (P.currentProfileName === profile) say('✅', `Profile “${profile}” is already the one in use.`);
    else if ((P.profiles || []).includes(profile)) { if (!dry) await call('SetCurrentProfile', { profileName: profile }); say('🔁', `Switched to your profile “${profile}” (it was there already, so its settings were left as they are).`); }
    else {
      const video = await call('GetVideoSettings'), svc = await call('GetStreamServiceSettings').catch(() => null), params = [];
      for (const [cat, name] of PROFILE_PARAMS) { const r = await call('GetProfileParameter', { parameterCategory: cat, parameterName: name }).catch(() => null); if (r && r.parameterValue != null) params.push([cat, name, r.parameterValue]); }
      const recDir = await call('GetRecordDirectory').catch(() => null);
      if (!dry) {
        await call('CreateProfile', { profileName: profile }); // (OBS switches to it)
        await call('SetVideoSettings', { fpsNumerator: video.fpsNumerator, fpsDenominator: video.fpsDenominator, baseWidth: video.baseWidth, baseHeight: video.baseHeight, outputWidth: video.outputWidth, outputHeight: video.outputHeight }).catch(e => say('⚠️', `Couldn't copy the video size / frame rate (${e.message}): check Settings → Video.`));
        for (const [cat, name, v] of params) await call('SetProfileParameter', { parameterCategory: cat, parameterName: name, parameterValue: v }).catch(() => {});
        if (svc?.streamServiceSettings) await call('SetStreamServiceSettings', { streamServiceType: svc.streamServiceType, streamServiceSettings: svc.streamServiceSettings }).catch(e => say('⚠️', `Couldn't copy the stream key (${e.message}): set it in Settings → Stream.`));
        if (recDir?.recordDirectory) await call('SetRecordDirectory', { recordDirectory: recDir.recordDirectory }).catch(() => {});
      }
      say('🆕', `Made the profile “${profile}”: a copy of “${prev.profile}” (stream key, ${video.baseWidth}×${video.baseHeight} at ${Math.round(video.fpsNumerator / (video.fpsDenominator || 1))} fps, bitrate + recording settings).`);
    }
    // 2) the scene collection
    let fresh = false;
    if (C.currentSceneCollectionName === collection) say('✅', `Scene collection “${collection}” is already open.`);
    else if ((C.sceneCollections || []).includes(collection)) { if (!dry) await call('SetCurrentSceneCollection', { sceneCollectionName: collection }); say('🔁', `Opened your scene collection “${collection}”.`); }
    else { if (!dry) await call('CreateSceneCollection', { sceneCollectionName: collection }); fresh = true; say('🆕', `Made the scene collection “${collection}” (your normal scenes are still in “${prev.collection}”).`); }
    if (dry) { say('🎬', `Scenes it fills in: ${Object.values(MARA_SCENES).join(', ')} + ${CO_SCENE} (what the co-stream sends your partner).`); return { dry: true, steps: out, prev }; }
    // 3) the scenes + what's in them
    const v = await call('GetVideoSettings'), W = v.baseWidth || 1920, H = v.baseHeight || 1080;
    let have = ((await call('GetSceneList')).scenes || []).map(s => s.sceneName);
    if (have.includes(OLD_SOON) && !have.includes(MARA_SCENES.soon)) { await call('SetSceneName', { sceneName: OLD_SOON, newSceneName: MARA_SCENES.soon }).catch(() => {}); say('✏️', `Renamed “${OLD_SOON}” to “${MARA_SCENES.soon}” (Be Right Back has its own scene now).`); have = ((await call('GetSceneList')).scenes || []).map(s => s.sceneName); }
    for (const sc of Object.values(MARA_SCENES)) if (!have.includes(sc)) await call('CreateScene', { sceneName: sc });
    if (fresh) for (const sc of have) if (!Object.values(MARA_SCENES).includes(sc)) { const n = ((await call('GetSceneItemList', { sceneName: sc })).sceneItems || []).length; if (!n) await call('RemoveScene', { sceneName: sc }).catch(() => {}); } // (OBS's empty starter "Scene")
    have = ((await call('GetSceneList')).scenes || []).map(s => s.sceneName);
    const inputs = new Set(((await call('GetInputList')).inputs || []).map(i => i.inputName));
    const itemOf = (sc, src) => call('GetSceneItemId', { sceneName: sc, sourceName: src }).then(r => r.sceneItemId).catch(() => null);
    const browser = (url, o = {}) => ({ is_local_file: false, url, width: W, height: H, fps: 60, reroute_audio: !!o.audio, shutdown: !!o.shut, restart_when_active: false, css: 'body { background-color: rgba(0,0,0,0); margin: 0; overflow: hidden; }' });
    let made = 0, skipped = [];
    async function put(sc, name, kind, settings, box, on = true) { // box = [x, y, w, h] as parts of the canvas
      let id = await itemOf(sc, name), isNew = false;
      if (id == null) {
        try {
          if (!inputs.has(name)) { id = (await call('CreateInput', { sceneName: sc, inputName: name, inputKind: kind, inputSettings: settings, sceneItemEnabled: on })).sceneItemId; inputs.add(name); }
          else id = (await call('CreateSceneItem', { sceneName: sc, sourceName: name, sceneItemEnabled: on })).sceneItemId;
          isNew = true; made++;
        } catch (e) { if (!skipped.includes(name)) skipped.push(name); return; }
      }
      if (!isNew) return false; // (already there: left exactly how you have it)
      const [x, y, w, h] = box;
      await call('SetSceneItemTransform', { sceneName: sc, sceneItemId: id, sceneItemTransform: { positionX: Math.round(x * W), positionY: Math.round(y * H), alignment: 5, boundsType: 'OBS_BOUNDS_SCALE_INNER', boundsAlignment: 0, boundsWidth: Math.round(w * W), boundsHeight: Math.round(h * H), rotation: 0 } }).catch(() => {});
      const n = ((await call('GetSceneItemList', { sceneName: sc })).sceneItems || []).length;
      await call('SetSceneItemIndex', { sceneName: sc, sceneItemId: id, sceneItemIndex: Math.max(0, n - 1) }).catch(() => {}); // (each new piece goes on top, in the order below)
      return true;
    }
    const toBottom = async (sc, name) => { const id = await itemOf(sc, name); if (id != null) await call('SetSceneItemIndex', { sceneName: sc, sceneItemId: id, sceneItemIndex: 0 }).catch(() => {}); };
    const hide = async (sc, name) => { const id = await itemOf(sc, name); if (id != null) await call('SetSceneItemEnabled', { sceneName: sc, sceneItemId: id, sceneItemEnabled: false }).catch(() => {}); };
    const S = MARA_SCENES, CAM = '📷 Camera (marathon)', GAME = '🎮 GTA 6 capture', BATTLE = 'Movie Royal battle', FULL = [0, 0, 1, 1];
    const cam = ['dshow_input', { video_device_id: '' }], gameCap = ['game_capture', { capture_mode: 'any_fullscreen', capture_cursor: false, allow_transparency: false }];
    const box = (sc, name, b) => itemOf(sc, name).then(id => id == null ? null : call('SetSceneItemTransform', { sceneName: sc, sceneItemId: id, sceneItemTransform: { positionX: Math.round(b[0] * W), positionY: Math.round(b[1] * H), alignment: 5, boundsType: 'OBS_BOUNDS_SCALE_INNER', boundsAlignment: 0, boundsWidth: Math.round(b[2] * W), boundsHeight: Math.round(b[3] * H), rotation: 0 } }).catch(() => {}));
    const refit = async (sc, name, oldB, newB) => { // (1.82.0) a piece still exactly where an older setup put it moves to the new spot; one you moved stays
      const id = await itemOf(sc, name); if (id == null) return; const t = (await call('GetSceneItemTransform', { sceneName: sc, sceneItemId: id }).catch(() => ({}))).sceneItemTransform || {};
      if (Math.abs((t.boundsWidth || 0) - oldB[2] * W) < 3 && Math.abs((t.boundsHeight || 0) - oldB[3] * H) < 3 && Math.abs((t.positionX || 0) - oldB[0] * W) < 3) { await box(sc, name, newB); say('🎮', `Moved “${name}” in ${sc} to its new spot.`); return true; }
      return false;
    };
    const above = async (sc, name, under) => { // keep a piece above another (a camera must never end up behind the full-screen game)
      const list = (await call('GetSceneItemList', { sceneName: sc }).catch(() => ({}))).sceneItems || [], a = list.findIndex(i => i.sourceName === name), b = list.findIndex(i => i.sourceName === under);
      if (a >= 0 && b >= 0 && a < b) await call('SetSceneItemIndex', { sceneName: sc, sceneItemId: list[a].sceneItemId, sceneItemIndex: b }).catch(() => {});
    };
    // 🎮 gameplay (1.82.0, Derek: more minimal): GTA full screen, a small camera bottom right, the battle hidden, a tiny counter (top middle)
    await put(S.game, GAME, ...gameCap, FULL);
    await put(S.game, CAM, ...cam, GAME_CAM);
    await refit(S.game, CAM, [.015, .69, .27, .28], GAME_CAM);
    await put(S.game, BATTLE, 'browser_source', browser(urls.game), [.56, .52, .42, .45], false);
    await above(S.game, CAM, GAME);
    // 🤝 co-stream gameplay: GTA full screen, your camera small at the top on YOUR side (your partner's camera goes on theirs: Movie Royal adds it), the battle hidden
    await put(S.co, GAME, ...gameCap, FULL);
    await put(S.co, CAM, ...cam, coSide === 'left' ? [.015, .03, .24, .24] : [.745, .03, .24, .24]);
    await put(S.co, BATTLE, 'browser_source', browser(urls.game), [.56, .52, .42, .45], false);
    await above(S.co, CAM, GAME);
    // 🤝 the scene the co-stream sends to your partner (OBS's Virtual Camera shows it): the battle top-left ¾ + your camera top-right
    if (!have.includes(CO_SCENE)) await call('CreateScene', { sceneName: CO_SCENE }).catch(() => {});
    await put(CO_SCENE, BATTLE, 'browser_source', browser(urls.game), [0, 0, .75, .75]);
    await put(CO_SCENE, CAM, ...cam, [.75, 0, .25, .25]);
    // 🍳 cooking: a background with the title, 3 cameras (1 big + 2 small), the battle hidden
    await put(S.cook, 'Movie Royal background (cooking)', 'browser_source', browser(urls.card('chat'), { shut: true }), FULL);
    const newCook = [];
    for (let i = 0; i < 3; i++) { const had = inputs.has(COOK_CAMS[i]); await put(S.cook, COOK_CAMS[i], ...cam, COOK_BOXES[i]); if (!had && inputs.has(COOK_CAMS[i])) newCook.push(COOK_CAMS[i]); }
    if (newCook.length) { // pick the cameras your stream camera ISN'T using (each new cooking camera gets the next free one)
      try {
        const devs = ((await call('GetInputPropertiesListPropertyItems', { inputName: newCook[0], propertyName: 'video_device_id' })).propertyItems || []).filter(x => x.itemEnabled !== false && x.itemValue).map(x => ({ id: x.itemValue, name: x.itemName }));
        const used = new Set(); for (const n of [CAM, ...COOK_CAMS]) { if (newCook.includes(n)) continue; const v = (await call('GetInputSettings', { inputName: n }).catch(() => ({}))).inputSettings?.video_device_id; if (v) used.add(v); }
        const free = devs.filter(d => !used.has(d.id)), got = [];
        for (const n of newCook) { const d = free.shift(); if (!d) break; await call('SetInputSettings', { inputName: n, inputSettings: { video_device_id: d.id }, overlay: true }).catch(() => {}); got.push(`${n} = ${d.name}`); }
        if (got.length) say('🍳', `Cooking cameras: ${got.join(', ')}.${got.length < newCook.length ? ` OBS found only ${got.length} free camera${got.length === 1 ? '' : 's'}: pick the rest in OBS (double-click them).` : ' (Wrong one? Double-click it in OBS and pick another.)'}`);
        else say('🍳', "OBS didn't list any free cameras: plug them in, then double-click each 📷 Cooking cam in OBS and pick it.");
      } catch { say('🍳', 'Double-click each 📷 Cooking cam in OBS and pick its camera.'); }
    }
    await put(S.cook, BATTLE, 'browser_source', browser(urls.game), [.03, .05, .69, .65], false);
    // 🎙️ (1.82.7, Derek: "GoXLR on the PC, wireless mics for cooking", USB receiver) the wireless mics live in the cooking scene
    { const had = inputs.has(COOK_MIC); await put(S.cook, COOK_MIC, 'wasapi_input_capture', { device_id: '' }, FULL); if (!had && inputs.has(COOK_MIC)) say('🎙️', await pickCookMic(call)); }
    // 💬 just chatting (1.84.0, Derek: "just a full screen of my camera"): only the camera, full screen. An older setup's camera
    // that's still where it was put moves to full screen and the background + battle there get hidden (not deleted)
    if (await refit(S.chat, CAM, [.025, .22, .37, .56], FULL)) { await hide(S.chat, 'Movie Royal background (chatting)'); await hide(S.chat, BATTLE); say('💬', `Just Chatting is your camera full screen now (the background + battle there are hidden, not deleted: tick them in OBS to bring them back).`); }
    await put(S.chat, CAM, ...cam, FULL);
    // ⚔️ battle (1.84.0, Derek: "a battle scene where the app is bigger than in Just Chatting"): the battle full screen over the
    // neon background, your camera small bottom right
    await put(S.battle, 'Movie Royal background (battle)', 'browser_source', browser(urls.card('chat'), { shut: true }), FULL);
    await put(S.battle, BATTLE, 'browser_source', browser(urls.game), FULL);
    await put(S.battle, CAM, ...cam, GAME_CAM);
    await above(S.battle, CAM, BATTLE);
    // ☕ be right back (1.84.0, Derek: "a BRB scene which I will play YouTube videos in"): the Be right back screen, your BRB
    // YouTube videos over it (Marathon tab → 📺 YouTube videos; see-through when there are none). Its sound goes through OBS.
    await put(S.brb, 'Movie Royal be right back', 'browser_source', browser(urls.card('brb'), { shut: true }), FULL);
    await put(S.brb, YT_NAMES.brb, 'browser_source', browser(urls.yt('brb'), { audio: true, shut: true }), FULL);
    // 😴 sleeping (1.84.0, Derek: "YouTube videos playing while sleeping"): the sleeping videos full screen, your camera small,
    // the "sleeping stream" banner on top. An older setup's full-screen camera moves to the small spot.
    if (await put(S.sleep, YT_NAMES.sleep, 'browser_source', browser(urls.yt('sleep'), { audio: true, shut: true }), FULL)) await toBottom(S.sleep, YT_NAMES.sleep);
    await refit(S.sleep, CAM, FULL, GAME_CAM);
    await put(S.sleep, CAM, ...cam, GAME_CAM);
    await put(S.sleep, 'Movie Royal sleeping banner', 'browser_source', browser(urls.card('sleep')), FULL);
    // ⏳ starting soon: the title screen
    await put(S.soon, 'Movie Royal starting soon / BRB', 'browser_source', browser(urls.card('soon'), { shut: true }), FULL);
    // the 🏃 marathon overlay (battles owed counter + pop-ups) and anything else you have on (celebration, roll call): gameplay scenes get the small one
    const mini = [S.game, S.co];
    for (const sc of Object.values(S)) {
      if (mini.includes(sc)) { const had = (await itemOf(sc, MARA_MINI)) != null; await put(sc, MARA_MINI, 'browser_source', browser(urls.maraMini), FULL); if (!had) { const big = await itemOf(sc, MARA_NAME); if (big != null) await call('SetSceneItemEnabled', { sceneName: sc, sceneItemId: big, sceneItemEnabled: false }).catch(() => {}); } }
      else await put(sc, MARA_NAME, 'browser_source', browser(urls.mara), FULL);
      for (const x of extra) await put(sc, x.name, 'browser_source', x.local ? { ...browser(''), is_local_file: true, local_file: x.url } : browser(x.url), FULL);
    }
    if (!keepScene) await call('SetCurrentProgramScene', { sceneName: S.soon }).catch(() => {}); // (not when 🔄 Keep OBS up to date tops it up)
    say('🎬', `Filled in the scenes ${Object.values(S).join(', ')} (${made} new piece${made === 1 ? '' : 's'}${made ? '' : ': everything was there already'}).`);
    if (skipped.length) say('⚠️', `Couldn't add ${skipped.join(', ')} (this OBS doesn't have that kind of source): add your own instead.`);
    else if (made) say('👉', `Things to do once in OBS: double-click “${CAM}” and pick your camera, and double-click “${GAME}” (it grabs any full-screen game; pick GTA 6 if you want it to only show that). Check your mic in the Audio Mixer.`);
    return { steps: out, prev, scenes: Object.values(S), profile, collection };
  });
}

// 🎙️ (1.82.7, Derek: "for my PC setup I use my GoXLR, for cooking streams wireless mics" → auto switch) the mics
const NOT_RX = /goxlr|tc-helicon|virtual|cable|voicemeeter|nvidia|broadcast|steam|stereo mix|webcam|brio|c9[0-9]{2}|usb video|camera|^default$/i;
const RX = /wireless|dji|r[oø]de|hollyland|lark|saramonic|boya|sennheiser|shure|synco|comica|\bgo\b|go ii|rx|receiver|lav/i;
/** The wireless mics' USB receiver: the best-looking microphone that isn't the GoXLR or a camera. Returns a line for the setup report. */
async function pickCookMic(call) {
  try {
    const devs = ((await call('GetInputPropertiesListPropertyItems', { inputName: COOK_MIC, propertyName: 'device_id' })).propertyItems || []).filter(x => x.itemEnabled !== false && x.itemValue && x.itemValue !== 'default');
    const ok = devs.filter(d => !NOT_RX.test(d.itemName || '')), best = ok.find(d => RX.test(d.itemName || '')) || (ok.length === 1 ? ok[0] : null);
    if (!best) return `“${COOK_MIC}” is in the 🍳 Cooking scene: plug in the wireless mics' receiver, then double-click it in OBS and pick it${ok.length ? ` (OBS sees: ${ok.map(d => d.itemName).join(', ')})` : ''}.`;
    await call('SetInputSettings', { inputName: COOK_MIC, inputSettings: { device_id: best.itemValue }, overlay: true });
    return `“${COOK_MIC}” = ${best.itemName} (only heard in the 🍳 Cooking scene). Wrong one? Double-click it in OBS and pick another.`;
  } catch { return `Double-click “${COOK_MIC}” in OBS and pick your wireless mics' receiver.`; }
}
/** Every mic-type source OBS has (incl. the global Mic/Aux), with whether it's muted. */
export async function audioInputs() {
  return session(async call => {
    const ins = ((await call('GetInputList')).inputs || []).filter(i => MIC_KIND.test(i.inputKind || ''));
    const out = [];
    for (const i of ins) { const m = await call('GetInputMute', { inputName: i.inputName }).catch(() => null); out.push({ name: i.inputName, kind: i.inputKind, muted: m ? !!m.inputMuted : null }); }
    const sc = (await call('GetCurrentProgramScene').catch(() => ({}))).currentProgramSceneName || null;
    return { inputs: out, scene: sc };
  });
}
/** Mute some sources and unmute others (names OBS doesn't have are skipped). */
export async function setMutes(mute = [], unmute = []) {
  return session(async call => {
    const have = new Set(((await call('GetInputList')).inputs || []).map(i => i.inputName)), done = { muted: [], unmuted: [] };
    for (const n of mute) if (have.has(n)) { await call('SetInputMute', { inputName: n, inputMuted: true }).catch(() => {}); done.muted.push(n); }
    for (const n of unmute) if (have.has(n)) { await call('SetInputMute', { inputName: n, inputMuted: false }).catch(() => {}); done.unmuted.push(n); }
    return done;
  });
}
/** Stay connected and tell onScene(name) every time OBS changes scene (and once when it connects). Reconnects by itself. */
let watcher = null;
export function watchScenes(onScene) {
  stopWatch();
  const me = { on: true, ws: null, t: null };
  watcher = me;
  const again = () => { if (me.on) me.t = setTimeout(go, 15000); };
  function go() {
    if (!me.on) return;
    const s = db.settings, ws = new WebSocket((s.obsUrl || 'ws://127.0.0.1:4455').trim()); me.ws = ws;
    ws.on('error', () => {});
    ws.on('close', () => { if (me.ws === ws) { me.ws = null; again(); } });
    ws.on('message', raw => {
      let m; try { m = JSON.parse(raw); } catch { return; }
      if (m.op === 0) { const auth = m.d.authentication; if (auth && !s.obsPassword) return ws.close(); ws.send(JSON.stringify({ op: 1, d: { rpcVersion: 1, eventSubscriptions: 4, ...(auth ? { authentication: sha(sha(s.obsPassword + auth.salt) + auth.challenge) } : {}) } })); }
      else if (m.op === 2) ws.send(JSON.stringify({ op: 6, d: { requestType: 'GetCurrentProgramScene', requestId: 'w1', requestData: {} } }));
      else if (m.op === 7 && m.d.requestId === 'w1' && m.d.requestStatus?.result) { try { onScene(m.d.responseData.currentProgramSceneName, true); } catch {} }
      else if (m.op === 5 && m.d.eventType === 'CurrentProgramSceneChanged') { try { onScene(m.d.eventData.sceneName, false); } catch {} }
    });
  }
  go();
  return true;
}
export function stopWatch() { if (!watcher) return; watcher.on = false; clearTimeout(watcher.t); try { watcher.ws?.close(); } catch {} watcher = null; }
export const watching = () => !!(watcher && watcher.ws && watcher.ws.readyState === 1);

/** 🎬 Kick clips (1.90.1): Kick has no clip button for apps, so OBS keeps the last minute (its Replay Buffer) and saves it as a video file. */
const REPLAY_OFF = "OBS's Replay Buffer is off. In OBS: Settings → Output → Replay Buffer → tick Enable and set it to 60 seconds. Then press Clip again.";
export async function replayReady(start = true) {
  return session(async call => {
    let st; try { st = await call('GetReplayBufferStatus'); } catch { return { enabled: false, active: false }; }
    if (!st.outputActive && start) { try { await call('StartReplayBuffer'); return { enabled: true, active: true, started: true }; } catch { return { enabled: false, active: false }; } }
    return { enabled: true, active: !!st.outputActive };
  });
}
export async function saveReplay() {
  return session(async call => {
    let st; try { st = await call('GetReplayBufferStatus'); } catch { throw new Error(REPLAY_OFF); }
    if (!st.outputActive) { try { await call('StartReplayBuffer'); } catch { throw new Error(REPLAY_OFF); } throw new Error("OBS's Replay Buffer wasn't running, so I just started it. From now on, Clip saves the last minute."); }
    await call('SaveReplayBuffer');
    await new Promise(r => setTimeout(r, 1500));
    let file = ''; try { file = (await call('GetLastReplayBufferReplay')).savedReplayPath || ''; } catch {}
    return { file };
  });
}

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

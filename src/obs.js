// 🎥 OBS (obs-websocket, built into OBS 28 and newer: Tools → WebSocket Server Settings).
// Used by the wheel's Doomsday: mute your mic, hide your camera, and end the stream.
import crypto from 'crypto';
import WebSocket from 'ws';
import { db } from './store.js';

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
/** Doomsday: mic off and camera off right away, the stream ends 15 seconds later. */
export async function doomsday(delay = 15000) {
  await session(async call => {
    let found = { mics: [], cams: [] }; try { found = await findSources(call); } catch (e) { console.error('[obs]', e.message); }
    for (const m of found.mics) await call('SetInputMute', { inputName: m, inputMuted: true }).catch(() => {});
    await hideCams(call, found.cams);
  });
  await new Promise(r => setTimeout(r, delay));
  await session(call => call('StopStream'));
}

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
/** Doomsday: mic off and camera off right away, the stream ends 15 seconds later. */
export async function doomsday(delay = 15000) {
  const s = db.settings;
  await session(async call => {
    if (s.obsMic) await call('SetInputMute', { inputName: s.obsMic, inputMuted: true }).catch(() => {});
    if (s.obsCam) { // hide the camera in the scene that's on stream (and in any nested scene that holds it)
      const scenes = (await call('GetSceneList')).scenes || [];
      for (const sc of scenes) { try { const { sceneItemId } = await call('GetSceneItemId', { sceneName: sc.sceneName, sourceName: s.obsCam }); await call('SetSceneItemEnabled', { sceneName: sc.sceneName, sceneItemId, sceneItemEnabled: false }); } catch {} }
    }
  });
  await new Promise(r => setTimeout(r, delay));
  await session(call => call('StopStream'));
}

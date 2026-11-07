// 🔈 Chat voice (1.83.0, Derek: "turn on tts for all chat on and off… but only so I hear it, not chat" + "a different tts from
// donation or channel point tts… the other tts will not play those").
// Reads chat messages out loud on Derek's PC only: a hidden player window (desktop/main.cjs chatVoice.player →
// public/chatvoice.html, ws role 'chatvoice') plays each one on the speaker he picked (headphones), never on stream.
// The voice is a Windows voice (made by chatVoice.wav), so it never sounds like the StreamElements tip / points voice.
// Left out: cheers (bits), channel point messages, highlighted / paid messages, commands (!…), known bots, links (said as
// "a link"), emotes. Deleted messages and timed-out people come out of the line.
import { db, save } from './store.js';

let H = { broadcast() {}, pushState() {}, isBot: () => false, dev: () => false, act() {} };
export function setHooks(h) { H = { ...H, ...h }; }

export const DEF = { on: false, voice: '', rate: 1, vol: 80, sink: '', sinkLabel: '', names: true, skipMe: true, skipCmds: true, max: 160, backlog: 5 };
export function cfg() {
  const c = { ...DEF, ...(db.settings.marathon?.chatVoice || {}) };
  c.rate = Math.max(-10, Math.min(10, Math.round(Number(c.rate) || 0)));
  c.vol = Math.max(0, Math.min(100, Math.round(Number(c.vol ?? 80))));
  c.max = Math.max(20, Math.min(500, Math.round(Number(c.max) || 160)));
  c.backlog = Math.max(1, Math.min(30, Math.round(Number(c.backlog) || 5)));
  return c;
}
export function setCfg(o) {
  const c = cfg(), keep = {};
  for (const k of Object.keys(DEF)) if (k in o) keep[k] = typeof DEF[k] === 'boolean' ? !!o[k] : typeof DEF[k] === 'number' ? Number(o[k]) : String(o[k] ?? '').slice(0, 300);
  db.settings.marathon = { ...(db.settings.marathon || {}), chatVoice: { ...c, ...keep } }; save();
  if ('on' in keep && !keep.on) stop(true);
  ensurePlayer(); H.pushState(); return cfg();
}
export const on = () => H.dev() && cfg().on;

// ── turning a chat message into words ─────────────────────────────────────────────────────────────
// emotes tag: "25:0-4,12-16/1902:6-10" (letter positions, counted in whole characters)
function dropEmotes(text, emotes) {
  if (!emotes) return text;
  const chars = [...text], cut = new Array(chars.length).fill(false);
  for (const part of String(emotes).split('/')) for (const r of (part.split(':')[1] || '').split(',')) { const [a, b] = r.split('-').map(Number); if (Number.isFinite(a) && Number.isFinite(b)) for (let i = a; i <= b && i < chars.length; i++) cut[i] = true; }
  return chars.map((ch, i) => cut[i] ? ' ' : ch).join('');
}
export function spokenName(n) { return String(n || '').replace(/[_]+/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/([A-Za-z])(\d)/g, '$1 $2').trim(); }
// why a message isn't read (null = read it)
export function skipWhy(m, c = cfg()) {
  if (!m || m.self) return 'Movie Royal\'s own message';
  if (H.isBot(m.login)) return 'a bot';
  if (Number(m.bits) > 0) return 'a cheer (the alerts read those)';
  if (m.reward) return 'a channel point message (the alerts read those)';
  if (m.paidMsg) return 'a highlighted / paid message';
  if (c.skipMe && m.badges?.broadcaster) return 'your own message';
  const t = String(m.text || '').trim();
  if (!t) return 'empty';
  if (c.skipCmds && /^[!\/]/.test(t)) return 'a command';
  return null;
}
export function words(m, c = cfg()) {
  let t = dropEmotes(String(m.text || ''), m.emotes);
  t = t.replace(/\bhttps?:\/\/\S+|\bwww\.\S+|\b\S+\.(?:com|net|org|tv|gg|io|ly|me|co|be)(?:\/\S*)?/gi, ' a link ')
    .replace(/@(\w+)/g, (_, n) => spokenName(n))
    .replace(/(.)\1{3,}/gu, '$1$1$1') // loooooool → loool
    .replace(/[^\p{L}\p{N}\p{P}\p{Zs}'’$%&+=<>#]/gu, ' ') // emoji and odd symbols
    .replace(/\s+/g, ' ').trim();
  if (!/[\p{L}\p{N}]/u.test(t)) return '';
  if ([...t].length > c.max) t = [...t].slice(0, c.max).join('').replace(/\s+\S*$/, '') + '…';
  return c.names ? `${spokenName(m.name || m.login)}: ${t}` : t;
}

// ── the line + the player ─────────────────────────────────────────────────────────────────────────
let q = [], playing = null, n = 0, recent = [], dropped = 0, lastErr = null, players = 0;
export const state = () => ({ cfg: cfg(), waiting: q.length, playing: playing ? playing.say : null, recent: recent.slice(0, 6), dropped, err: lastErr, player: players > 0, engine: engine(), needSink: needSink(), voices: voiceList, devices: devList, windows: !!globalThis.__desktop?.chatVoice?.ok?.() });
const engine = () => globalThis.__desktop?.chatVoice?.ok?.() ? 'windows' : 'browser';
let voiceList = [], devList = [];
export async function loadVoices() {
  try { const v = await globalThis.__desktop?.chatVoice?.voices?.(); if (Array.isArray(v) && v.length) voiceList = v; } catch {}
  return voiceList;
}
export function chat(m) {
  if (!on()) return null;
  const c = cfg(), why = skipWhy(m, c); if (why) return null;
  if (needSink()) return null; // (in the app: nothing is read until you pick the speaker only you hear)
  const say = words(m, c); if (!say) return null;
  q.push({ id: ++n, say, login: String(m.login || '').toLowerCase(), msgId: m.id || null, at: Date.now() });
  while (q.length > c.backlog) { q.shift(); dropped++; } // (keeps up with chat: old ones drop off when it gets busy)
  next(); return say;
}
// a deleted message / a timed-out or banned person: out of the line
export function clear(c) {
  if (!c) return;
  const before = q.length;
  if (c.id) q = q.filter(x => x.msgId !== c.id);
  else if (c.login) q = q.filter(x => x.login !== String(c.login).toLowerCase());
  else q = [];
  if (playing && ((c.id && playing.msgId === c.id) || (c.login && playing.login === String(c.login).toLowerCase()) || (!c.id && !c.login))) skip();
  if (q.length !== before) H.pushState();
}
export const needSink = () => engine() === 'windows' && !cfg().sink && !cfg().sinkLabel;
export function test(say) { if (needSink()) throw new Error('Pick the speaker only you hear first (🎧 Speaker).'); q.unshift({ id: ++n, say, login: '', msgId: null, at: Date.now(), test: true }); ensurePlayer(); next(); return say; }
export function skip() { if (!playing) return false; H.broadcast({ type: 'cvStop', id: playing.id }, 'chatvoice'); done(playing.id); return true; }
export function stop(all) { q = []; if (playing) skip(); if (all) dropped = 0; H.pushState(); }
function done(id) { if (!playing || playing.id !== id) return; clearTimeout(playing.t); playing = null; setTimeout(next, 250); H.pushState(); }
async function next() {
  if (playing || !q.length) return;
  if (!players) { ensurePlayer(); return; } // (the player window is opening: it asks for the next one when it connects)
  const it = q.shift(), c = cfg();
  playing = { ...it, t: setTimeout(() => done(it.id), 45000) };
  recent.unshift({ say: it.say, at: Date.now(), test: !!it.test }); recent = recent.slice(0, 20);
  let wav = null;
  if (engine() === 'windows') { try { wav = (await globalThis.__desktop.chatVoice.wav(it.say, { voice: c.voice, rate: c.rate })).toString('base64'); lastErr = null; } catch (e) { lastErr = e.message; } }
  if (!playing || playing.id !== it.id) return; // (skipped while the voice was being made)
  if (engine() === 'windows' && !wav) { done(it.id); return; } // (never falls back to a voice that might play on the stream's speaker)
  H.broadcast({ type: 'cvPlay', id: it.id, say: it.say, wav, voice: c.voice, rate: c.rate, vol: c.vol, sink: c.sink, sinkLabel: c.sinkLabel }, 'chatvoice');
  H.pushState();
}
// messages from the player page
export function fromPlayer(m) {
  if (m.type === 'cvDone') done(Number(m.id));
  else if (m.type === 'cvError') { lastErr = String(m.msg || '').slice(0, 200); done(Number(m.id)); }
  else if (m.type === 'cvDevices') { devList = (Array.isArray(m.list) ? m.list : []).slice(0, 40).map(d => ({ id: String(d.id || ''), label: String(d.label || '').slice(0, 120) })); if (!voiceList.length && Array.isArray(m.voices)) voiceList = m.voices.slice(0, 60).map(String); H.pushState(); }
}
export function playerJoin(d) { players = Math.max(0, players + d); if (d > 0) setTimeout(next, 200); H.pushState(); }
// in the app: open the hidden player window while the chat voice is on, close it when it's off
export function ensurePlayer() {
  const want = on(), dk = globalThis.__desktop?.chatVoice; if (!dk) return;
  try { if (want) { dk.player(`http://localhost:${process.env.PORT || 3737}/chatvoice.html`); loadVoices().then(v => v.length && H.pushState()); } else dk.player(null); } catch (e) { lastErr = e.message; }
}

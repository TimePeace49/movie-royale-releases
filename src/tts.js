// 🗣️ Donation text to speech (1.170.0, Derek: "add tts from donations to Birx ed also" + "a way to set what the tts settings are in the Settings tab")
// The app itself reads the message of a donation / cheer / resub out loud ON STREAM (through the 🔊 sound alerts source in OBS, like the sound
// alerts; in the app when OBS isn't showing it). The voice is one of the PC's own Windows voices or a downloaded one (src/piper.js), so nothing
// is sent to a voice service. Off until it's switched on. One message at a time, the rest wait in a line. Mods can skip / mute from chat.
import { db, save } from './store.js';

let H = { wav: async () => { throw new Error('no voice'); }, play() { return { where: 'none' }; }, stop() {}, clean: t => String(t || ''), pushState() {}, act() {}, on: () => false, say() {} };
export function setHooks(h) { H = { ...H, ...h }; }

export const DEF = { on: false, voice: '', rate: 1, vol: 80, tips: true, tipMin: 1, bits: true, bitsMin: 100, subs: false, names: true, max: 200, links: false, block: '', muted: false, hear: null, skipCmd: '!skiptts', offCmd: '!ttsoff', onCmd: '!ttson', cmds: true };
export function cfg() {
  const c = { ...DEF, ...(db.tts || {}) };
  c.rate = Math.max(-10, Math.min(10, Math.round(Number(c.rate) || 0)));
  c.vol = Math.max(0, Math.min(100, Math.round(Number(c.vol ?? 80))));
  c.max = Math.max(20, Math.min(500, Math.round(Number(c.max) || 200)));
  c.tipMin = Math.max(0, Math.round((Number(c.tipMin) || 0) * 100) / 100); c.bitsMin = Math.max(0, Math.round(Number(c.bitsMin) || 0));
  return c;
}
export function setCfg(o = {}) {
  const c = cfg(), keep = {};
  for (const k of Object.keys(DEF)) if (k in o) keep[k] = k === 'hear' ? (o[k] == null ? null : !!o[k]) : typeof DEF[k] === 'boolean' ? !!o[k] : typeof DEF[k] === 'number' ? Number(o[k]) : String(o[k] ?? '').slice(0, 600).trim();
  for (const k of ['skipCmd', 'offCmd', 'onCmd']) if (k in keep) keep[k] = keep[k].split(/\s+/)[0].toLowerCase().slice(0, 30);
  db.tts = { ...c, ...keep }; save();
  if (('on' in keep && !keep.on) || ('muted' in keep && keep.muted)) stop();
  H.pushState(); return cfg();
}
export const on = () => H.on() && cfg().on;

const money = a => (a.currency && a.currency !== 'USD' ? '' : '$') + (Math.round((Number(a.amount) || 0) * 100) / 100) + (a.currency && a.currency !== 'USD' ? ' ' + a.currency : '');
const blockList = c => String(c.block || '').toLowerCase().split(/[,\n]+/).map(w => w.trim()).filter(Boolean);
// what gets read for this alert (pure): { say } or { skip: why }
export function lineFor(a, c = cfg(), clean = H.clean) {
  if (!a) return { skip: 'nothing came in' };
  const kind = a.kind, n = Number(a.amount) || 0;
  if (kind === 'tip') { if (!c.tips) return { skip: 'donations aren\'t read' }; if (n < c.tipMin) return { skip: `under ${money({ amount: c.tipMin })}` }; }
  else if (kind === 'bits') { if (!c.bits) return { skip: 'cheers aren\'t read' }; if (n < c.bitsMin) return { skip: `under ${c.bitsMin} bits` }; }
  else if (kind === 'sub') { if (!c.subs) return { skip: 'sub messages aren\'t read' }; }
  else return { skip: 'not a donation, cheer or sub message' };
  let raw = String(a.msg || '');
  if (kind === 'bits') raw = raw.replace(/\b[A-Za-z]{3,}\d+\b/g, ' '); // (Cheer100, Kappa50 … the cheer words themselves)
  if (!c.links && /https?:\/\/|www\.|\b\S+\.(com|net|org|tv|gg|io|ly)\b/i.test(raw)) return { skip: 'it has a link in it' };
  const low = raw.toLowerCase(), hit = blockList(c).find(w => low.includes(w)); if (hit) return { skip: 'it has a word from your never-read list' };
  const msg = clean(raw, c.max);
  if (!msg) return { skip: 'no message to read' };
  const who = String(a.name || 'Someone').replace(/_/g, ' ');
  const lead = !c.names ? '' : kind === 'tip' ? `${who} donated ${money(a).replace('$', '')} ${a.currency && a.currency !== 'USD' ? '' : 'dollars'}`.replace(/\s+/g, ' ').trim() + ': ' : kind === 'bits' ? `${who} cheered ${n} bits: ` : `${who} says: `;
  return { say: lead + msg };
}

// ── the line ──────────────────────────────────────────────────────────────────────────────────────
let q = [], playing = null, n = 0, recent = [], lastErr = null;
const wavSecs = b => { try { const rate = b.readUInt32LE(28); return rate > 0 ? Math.max(.3, (b.length - 44) / rate) : 3; } catch { return 3; } };
export const state = () => ({ cfg: cfg(), on: on(), allowed: H.on(), waiting: q.length, playing: playing ? playing.say : null, recent: recent.slice(0, 6), err: lastErr });
function push(say, o = {}) { q.push({ id: ++n, say, test: !!o.test }); while (q.length > 15) q.shift(); next(); H.pushState(); return say; }
export function onAlert(a) {
  if (!on()) return null; const c = cfg(); if (c.muted) return null;
  const l = lineFor(a, c); if (!l.say) return null;
  H.act('money', `Text to speech read ${a.name || 'someone'}'s ${a.kind === 'tip' ? 'donation' : a.kind === 'bits' ? 'cheer' : 'sub'} message`, { icon: '🗣️', kind: 'tts' });
  return push(l.say);
}
export function test(text) { return push(String(text || 'Test donor donated 5 dollars: Hello! This is how donation messages sound on stream.').slice(0, 500), { test: true }); }
export function skip() { if (!playing) return false; H.stop(playing.id); done(playing.id); return true; }
export function stop() { q = []; if (playing) skip(); H.pushState(); }
function done(id) { if (!playing || playing.id !== id) return; clearTimeout(playing.t); playing = null; setTimeout(next, 400); H.pushState(); }
async function next() {
  if (playing || !q.length) return;
  const it = q.shift(), c = cfg();
  playing = { ...it, t: setTimeout(() => done(it.id), 60000) };
  recent.unshift({ say: it.say, at: Date.now(), test: it.test }); recent = recent.slice(0, 20);
  let buf = null; try { buf = await H.wav(it.say, { voice: c.voice, rate: c.rate }); lastErr = null; } catch (e) { lastErr = e.message; }
  if (!playing || playing.id !== it.id) return; // (skipped while the voice was being made)
  if (!buf) { done(it.id); return; }
  const r = H.play(it.id, buf, c.vol, c.hear); playing.where = r?.where;
  clearTimeout(playing.t); playing.t = setTimeout(() => done(it.id), wavSecs(buf) * 1000 + 700);
  H.pushState();
}
// chat: the streamer and mods can skip / mute / unmute (the same words as the StreamElements TTS uses)
export function onChat(m) {
  if (!on() || !m) return false; const c = cfg(); if (!c.cmds) return false;
  if (!(m.badges?.broadcaster || m.badges?.mod)) return false;
  const w = String(m.text || '').trim().split(/\s+/)[0].toLowerCase(); if (!w) return false;
  if (c.skipCmd && w === c.skipCmd) { skip(); return true; }
  if (c.offCmd && w === c.offCmd) { if (!c.muted) { setCfg({ muted: true }); H.say('🔇 Text to speech is muted.'); } return true; }
  if (c.onCmd && w === c.onCmd) { if (c.muted) { setCfg({ muted: false }); H.say('🔊 Text to speech is back on.'); } return true; }
  return false;
}

// 🧪 the rules on pretend alerts (nothing is read)
export function demo() {
  const c = { ...DEF, on: true, block: 'badword, spoiler' }, cl = (t, max) => String(t).replace(/\s+/g, ' ').trim().slice(0, max);
  const T = [
    ['A $5 donation with a message', { kind: 'tip', name: 'Bob_Smith', amount: 5, msg: 'love the stream' }, c, 'Bob Smith donated 5 dollars: love the stream'],
    ['A $0.50 donation (under the $1 minimum)', { kind: 'tip', name: 'Bob', amount: .5, msg: 'hi' }, c, null],
    ['A donation with no message', { kind: 'tip', name: 'Bob', amount: 5, msg: '' }, c, null],
    ['A donation in euros', { kind: 'tip', name: 'Ana', amount: 3, currency: 'EUR', msg: 'hola' }, c, 'Ana donated 3 EUR: hola'],
    ['300 bits with a message', { kind: 'bits', name: 'Cy', amount: 300, msg: 'Cheer300 nice one' }, c, 'Cy cheered 300 bits: nice one'],
    ['50 bits (under the 100 minimum)', { kind: 'bits', name: 'Cy', amount: 50, msg: 'Cheer50 hi' }, c, null],
    ['A cheer that is only the cheer word', { kind: 'bits', name: 'Cy', amount: 100, msg: 'Cheer100' }, c, null],
    ['A message with a link', { kind: 'tip', name: 'Bob', amount: 5, msg: 'go to www.example.com now' }, c, null],
    ['A message with a never-read word', { kind: 'tip', name: 'Bob', amount: 5, msg: 'here is a SPOILER for you' }, c, null],
    ['A resub message (sub messages off)', { kind: 'sub', name: 'Dee', amount: 4, msg: 'four months!' }, c, null],
    ['A resub message (sub messages on)', { kind: 'sub', name: 'Dee', amount: 4, msg: 'four months!' }, { ...c, subs: true }, 'Dee says: four months!'],
    ['Without saying who', { kind: 'tip', name: 'Bob', amount: 5, msg: 'hello there' }, { ...c, names: false }, 'hello there'],
    ['Donations switched off', { kind: 'tip', name: 'Bob', amount: 5, msg: 'hello' }, { ...c, tips: false }, null],
    ['A follow (never read)', { kind: 'follow', name: 'Eve' }, c, null]
  ];
  const rows = T.map(([what, a, cc, want]) => { const l = lineFor(a, cc, cl); return { what, got: l.say || 'not read: ' + l.skip, ok: (l.say || null) === want }; });
  return { ok: rows.every(r => r.ok), rows };
}

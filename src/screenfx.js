// 🌀 Screen effects (1.155.0, Derek: "chat can mess with my screen: turn my game capture black and white, or drunk view… what I see, and the stream too";
// he isn't sure yet whether it'll be channel points or real money, so every way in has its own switch + price).
// The effect list + its maths live in public/screenfx.js (the app uses the same file for the Game capture tab's picture).
import { db, save } from './store.js';
import '../public/screenfx.js';
const { FX, MOVES, frame } = globalThis.SCREENFX;
export { FX };
const H = { on: () => false, send: () => {}, say: () => {}, act: () => {}, obsOk: () => true, play: null, stop: () => {}, changed: () => {} };
export const setHooks = h => Object.assign(H, h);
const clamp = (v, lo, hi, d) => { v = Number(v); return Number.isFinite(v) ? Math.max(lo, Math.min(hi, v)) : d; };
/** the saved settings, filled in */
export function cfg() {
  const c = db.settings.screenFx || {}, fx = {};
  for (const [k, d] of Object.entries(FX)) { const o = c.fx?.[k] || {}; fx[k] = { on: o.on !== false, secs: clamp(o.secs, 5, 600, d.secs), pts: clamp(o.pts, 1, 10000000, d.pts), bits: clamp(o.bits, 0, 1000000, d.bits), tip: clamp(o.tip, 0, 100000, d.tip) }; }
  return { on: !!c.on, points: c.points !== false, bits: !!c.bits, tips: !!c.tips, stream: c.stream !== false, source: String(c.source || ''), say: c.say !== false, mara: !!c.mara, gap: clamp(c.gap, 0, 120, 3), fx };
}
export const on = () => H.on() && cfg().on;
export const title = k => `Screen: ${FX[k].icon} ${FX[k].name}`;
export const rewards = () => Object.fromEntries(Object.keys(FX).map(k => [title(k), k]));
export const kindOfTitle = t => Object.keys(FX).find(k => title(k).toLowerCase() === String(t || '').toLowerCase()) || null;
export function setCfg(b = {}) {
  const c = (db.settings.screenFx ||= {});
  for (const k of ['on', 'points', 'bits', 'tips', 'stream', 'say', 'mara']) if (typeof b[k] === 'boolean') c[k] = b[k];
  if (typeof b.source === 'string') c.source = b.source.slice(0, 120);
  if (b.gap != null) c.gap = clamp(b.gap, 0, 120, 3);
  if (b.fx && typeof b.fx === 'object') for (const [k, o] of Object.entries(b.fx)) { if (!FX[k] || !o) continue; const x = ((c.fx ||= {})[k] ||= {});
    if (typeof o.on === 'boolean') x.on = o.on; if (o.secs != null) x.secs = clamp(o.secs, 5, 600, FX[k].secs); if (o.pts != null) x.pts = clamp(o.pts, 1, 10000000, FX[k].pts); if (o.bits != null) x.bits = clamp(o.bits, 0, 1000000, FX[k].bits); if (o.tip != null) x.tip = clamp(o.tip, 0, 100000, FX[k].tip); }
  save(); H.changed(); return cfg();
}
// ---- playing: one at a time, the rest wait in a line (a redeem is never thrown away: the app never refunds) ----
let cur = null, timer = null, last = null; const q = [];
export const now = () => (cur ? { id: cur.id, kind: cur.kind, name: FX[cur.kind].name, icon: FX[cur.kind].icon, secs: cur.secs, at: cur.at, left: Math.max(0, Math.round((cur.at + cur.secs * 1000 - Date.now()) / 1000)), by: cur.by, via: cur.via, test: !!cur.test, stream: cur.stream } : null);
export const state = () => ({ now: now(), queue: q.map(x => ({ kind: x.kind, name: FX[x.kind].name, icon: FX[x.kind].icon, secs: x.secs, by: x.by, via: x.via })), last });
/** start (or line up) an effect. via: points | bits | tip | mara | you | test. dry = only in the app, OBS is left alone */
export function start({ kind, secs, by = '', via = 'you', test = false, dry = false } = {}) {
  if (!FX[kind]) throw new Error('Which effect?');
  const c = cfg(), item = { id: Math.random().toString(36).slice(2, 10), kind, secs: clamp(secs, 3, 600, c.fx[kind].secs), by: String(by || '').slice(0, 40), via, test: !!test, dry: !!dry };
  if (q.length >= 40) q.shift();
  q.push(item); const waiting = !!cur; if (!cur) next();
  return { ok: true, id: item.id, waiting, ahead: waiting ? q.length : 0, kind, name: FX[kind].name, secs: item.secs };
}
function next() {
  if (cur || !q.length) return;
  const it = q.shift(), c = cfg(), F = FX[it.kind];
  cur = { ...it, at: Date.now(), stream: null };
  H.send({ type: 'screenFx', fx: now(), queue: q.length });
  if (!it.test) { if (c.say && it.via !== 'you') H.say(`${F.icon} ${it.by ? '@' + it.by : 'Someone'} hit the screen with ${F.name.toUpperCase()} for ${it.secs} seconds!`); H.act(`${F.name} on the screen for ${it.secs} s${it.via === 'mara' ? ' (it won the battle)' : it.via === 'you' ? ' (started by hand)' : ''}`, { icon: F.icon, who: it.via === 'you' || it.via === 'mara' ? undefined : it.by, kind: 'screenfx' }); }
  const mine = cur;
  if (c.stream && !it.dry && H.play && H.obsOk()) {
    mine.stream = 'on';
    H.play({ source: c.source, secs: it.secs, frame: t => frame(it.kind, t, it.secs), moves: !!MOVES[it.kind] })
      .then(r => { mine.stream = r?.errors?.length ? 'part' : 'ok'; last = { ...(last || {}), obs: r, obsErr: r?.errors?.[0] || '' }; })
      .catch(e => { mine.stream = 'off'; last = { ...(last || {}), obsErr: e.message }; H.changed(); });
  } else mine.stream = it.dry ? 'dry' : 'off';
  timer = setTimeout(() => end(mine), it.secs * 1000);
}
function end(mine, stopped) {
  if (cur !== mine) return; clearTimeout(timer); timer = null;
  last = { kind: mine.kind, by: mine.by, via: mine.via, at: mine.at, secs: mine.secs, stream: mine.stream, stopped: !!stopped, obsErr: last?.obsErr || '', obs: last?.obs || null };
  cur = null; try { H.stop(); } catch {}
  H.send({ type: 'screenFx', fx: null, queue: q.length }); H.changed();
  if (q.length) setTimeout(next, cfg().gap * 1000);
}
/** 🛑 stop what's playing (all = and empty the line) */
export function stop(all = false) { if (all) q.length = 0; const had = !!cur; if (cur) end(cur, true); return { ok: true, had, queue: q.length }; }
// ---- the ways in ----
/** money: bits or a tip. Which effect? One they named in their message (if they paid enough for it), else the dearest one the amount covers. Pure. */
export function pickFor(kindOfMoney, amount, text = '', c = cfg()) {
  const key = kindOfMoney === 'bits' ? 'bits' : 'tip', n = Number(amount) || 0, can = Object.keys(FX).filter(k => c.fx[k].on && c.fx[k][key] > 0 && c.fx[k][key] <= n);
  if (!can.length) return null;
  const said = String(text || '').toLowerCase(), words = k => [k, FX[k].name.toLowerCase(), ...FX[k].name.toLowerCase().split(/[^a-z]+/).filter(w => w.length > 3 && !['view', 'screen', 'world', 'slow', 'trip'].includes(w))];
  const named = can.find(k => words(k).some(w => said.includes(w)));
  return named || can.sort((a, b) => c.fx[b][key] - c.fx[a][key])[0];
}
export function money(a, { test = false } = {}) {
  const c = cfg(); if (!test && (!on() || (a.kind === 'bits' ? !c.bits : !c.tips))) return null;
  const k = pickFor(a.kind, a.amount, a.text, c); if (!k) return null;
  return start({ kind: k, by: a.name, via: a.kind === 'bits' ? 'bits' : 'tip', test });
}
export function redeem(r, kind) {
  const c = cfg(); if (!r.test && (!on() || !c.points || !c.fx[kind]?.on)) return null; // (switched off: the redeem is left alone for the streamer, never refunded by the app)
  return start({ kind, by: r.name, via: 'points', test: !!r.test });
}
/** 🧪 the picking rule on made-up prices (nothing starts) */
export function demo() {
  const c = cfg(); for (const k of Object.keys(FX)) Object.assign(c.fx[k], { on: true, bits: FX[k].bits, tip: FX[k].tip });
  c.fx.flip.on = false;
  const rows = [], T = (label, got, want) => rows.push({ label, got: got ? FX[got].name : 'nothing', ok: got === want });
  T('100 bits: not enough for anything', pickFor('bits', 100, '', c), null);
  T('150 bits: Black & white (the only one it covers)', pickFor('bits', 150, '', c), 'bw');
  T('450 bits, no message: the dearest it covers (Drunk view)', pickFor('bits', 450, '', c), 'drunk');
  T('450 bits “make it rainbow”: the one they named', pickFor('bits', 450, 'make it rainbow lol', c), 'rainbow');
  T('200 bits “drunk”: named one costs more, so the dearest it covers', pickFor('bits', 200, 'drunk', c), ['rainbow', 'fried'].includes(pickFor('bits', 200, 'drunk', c)) ? pickFor('bits', 200, 'drunk', c) : 'x');
  T('1000 bits “upside down”: that one is switched off, so the dearest that is on (Slow spin)', pickFor('bits', 1000, 'upside down', c), 'spin');
  T('$5 tip: Drunk view', pickFor('tip', 5, '', c), 'drunk');
  T('$1 tip: nothing', pickFor('tip', 1, '', c), null);
  const f = frame('bw', 5, 30), g = frame('flip', 5, 30), e = frame('drunk', 29.99, 30);
  rows.push({ label: 'Black & white: colour all the way out', got: 'colour ' + f.sat, ok: f.sat === -1 && f.rot === 0 });
  rows.push({ label: 'Upside down: turned 180°', got: g.rot + '°', ok: g.rot === 180 });
  rows.push({ label: 'Every effect eases back to normal at the end', got: 'turn ' + e.rot.toFixed(2) + '°, size ' + e.s.toFixed(3), ok: Math.abs(e.rot) < 0.2 && Math.abs(e.s - 1) < 0.01 });
  return { ok: rows.every(r => r.ok), rows };
}

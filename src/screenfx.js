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
  for (const [k, d] of Object.entries(FX)) { const o = c.fx?.[k] || {}; fx[k] = { on: o.on !== false, secs: clamp(o.secs, 5, 600, d.secs) }; }
  // (1.156.3, Derek: "it will be random, they do not get to choose") ONE price for a random effect, not one per effect
  return { on: !!c.on, points: c.points !== false, bits: !!c.bits, tips: !!c.tips, stream: c.stream !== false, source: String(c.source || ''), say: c.say !== false, timer: c.timer !== false, mara: !!c.mara, gap: clamp(c.gap, 0, 120, 0),
    pts: clamp(c.pts, 1, 10000000, PRICE.pts), bitsCost: clamp(c.bitsCost, 0, 1000000, PRICE.bits), tip: clamp(c.tip, 0, 100000, PRICE.tip), fx };
}
export const PRICE = { pts: 2500, bits: 300, tip: 3 };
export const on = () => H.on() && cfg().on;
export const RANDOM_TITLE = 'Screen: 🎲 Random effect';
export const onKinds = (c = cfg()) => Object.keys(FX).filter(k => c.fx[k].on);
/** 🎲 a random switched-on effect, never the same one twice in a row when there's a choice. Pure (rnd can be given). */
export function pickRandom(c = cfg(), avoid = [], rnd = Math.random) {
  const all = onKinds(c); if (!all.length) return null;
  const fresh = all.filter(k => !avoid.includes(k)), from = fresh.length ? fresh : all.filter(k => k !== avoid[0]).length ? all.filter(k => k !== avoid[0]) : all;
  return from[Math.floor(rnd() * from.length) % from.length];
}
export const title = k => `Screen: ${FX[k].icon} ${FX[k].name}`;
/** the one channel point reward now; the old one-per-effect rewards (1.155.0) are kept switched off on Twitch, and a redeem of one still counts as a random effect */
export const rewards = () => ({ [RANDOM_TITLE]: 'random' });
export const oldRewards = () => Object.fromEntries(Object.keys(FX).map(k => [title(k), k]));
export const kindOfTitle = t => { t = String(t || '').toLowerCase(); return t === RANDOM_TITLE.toLowerCase() || Object.keys(FX).some(k => title(k).toLowerCase() === t) ? 'random' : null; };
export function setCfg(b = {}) {
  const c = (db.settings.screenFx ||= {});
  for (const k of ['on', 'points', 'bits', 'tips', 'stream', 'say', 'timer', 'mara']) if (typeof b[k] === 'boolean') c[k] = b[k];
  if (typeof b.source === 'string') c.source = b.source.slice(0, 120);
  if (b.gap != null) c.gap = clamp(b.gap, 0, 120, 0);
  if (b.pts != null) c.pts = clamp(b.pts, 1, 10000000, PRICE.pts); if (b.bitsCost != null) c.bitsCost = clamp(b.bitsCost, 0, 1000000, PRICE.bits); if (b.tip != null) c.tip = clamp(b.tip, 0, 100000, PRICE.tip);
  if (b.fx && typeof b.fx === 'object') for (const [k, o] of Object.entries(b.fx)) { if (!FX[k] || !o) continue; const x = ((c.fx ||= {})[k] ||= {});
    if (typeof o.on === 'boolean') x.on = o.on; if (o.secs != null) x.secs = clamp(o.secs, 5, 600, FX[k].secs); }
  save(); H.changed(); return cfg();
}
// ---- playing: one at a time, the rest wait in a line (a redeem is never thrown away: the app never refunds) ----
let cur = null, timer = null, last = null; const q = [];
export const now = () => (cur ? { id: cur.id, kind: cur.kind, name: FX[cur.kind].name, icon: FX[cur.kind].icon, secs: cur.secs, at: cur.at, left: Math.max(0, Math.round((cur.at + cur.secs * 1000 - Date.now()) / 1000)), by: cur.by, via: cur.via, test: !!cur.test, stream: cur.stream } : null);
export const state = () => ({ now: now(), queue: q.map(x => x.kind === 'random' ? { kind: 'random', name: 'Random', icon: '🎲', secs: null, by: x.by, via: x.via } : { kind: x.kind, name: FX[x.kind].name, icon: FX[x.kind].icon, secs: x.secs, by: x.by, via: x.via }), last });
/** start (or line up) an effect. kind 'random' = picked when its turn comes (Derek: viewers don't choose). via: points | bits | tip | mara | you | test. dry = only in the app, OBS is left alone */
export function start({ kind, secs, by = '', via = 'you', test = false, dry = false } = {}) {
  const c = cfg();
  if (kind === 'random') { if (!onKinds(c).length) throw new Error('Every screen effect is switched off.'); }
  else if (!FX[kind]) throw new Error('Which effect?');
  const item = { id: Math.random().toString(36).slice(2, 10), kind, secs: kind === 'random' ? (secs != null ? clamp(secs, 3, 600, 120) : null) : clamp(secs, 3, 600, c.fx[kind].secs), by: String(by || '').slice(0, 40), via, test: !!test, dry: !!dry };
  if (q.length >= 40) q.shift();
  q.push(item); const waiting = !!cur; if (!cur) next(); else H.send({ type: 'screenFx', fx: now(), queue: q.length }); // (the timers show how many are next)
  if (waiting && c.say && !test && via !== 'you') H.say(`🎲 @${item.by || 'Someone'}'s screen effect is in line (${q.length} waiting). It starts right after the one playing now.`);
  const shown = waiting ? item : (cur?.id === item.id ? cur : item);
  return { ok: true, id: item.id, waiting, ahead: waiting ? q.length : 0, kind: shown.kind, name: shown.kind === 'random' ? 'a random effect' : FX[shown.kind].name, secs: shown.secs };
}
function next() {
  if (cur || !q.length) return;
  const it = q.shift(), c = cfg();
  if (it.kind === 'random') { it.kind = pickRandom(c, [cur?.kind, last?.kind].filter(Boolean)) || 'bw'; if (it.secs == null) it.secs = c.fx[it.kind].secs; it.random = true; }
  const F = FX[it.kind];
  cur = { ...it, at: Date.now(), stream: null };
  H.send({ type: 'screenFx', fx: now(), queue: q.length });
  if (!it.test) { if (c.say && it.via !== 'you') H.say(`${F.icon} ${it.by ? '@' + it.by : 'Someone'} ${it.random ? 'rolled' : 'hit the screen with'} ${F.name.toUpperCase()}${it.random ? ' 🎲' : ''} for ${it.secs >= 120 && it.secs % 60 === 0 ? it.secs / 60 + ' minutes' : it.secs + ' seconds'}!`); H.act(`${F.name} on the screen for ${it.secs} s${it.via === 'mara' ? ' (it won the battle)' : it.via === 'you' ? ' (started by hand)' : ''}`, { icon: F.icon, who: it.via === 'you' || it.via === 'mara' ? undefined : it.by, kind: 'screenfx' }); }
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
/** money: bits or a tip. How many random effects does it buy? One per full price (up to 10); 0 = not enough (or that price is 0 = off). Pure. */
export const MAX_BUY = 10;
export function howMany(kindOfMoney, amount, c = cfg()) {
  const price = kindOfMoney === 'bits' ? c.bitsCost : c.tip, n = Number(amount) || 0;
  return price > 0 && n >= price ? Math.min(MAX_BUY, Math.floor(n / price + 1e-9)) : 0;
}
export function money(a, { test = false } = {}) {
  const c = cfg(); if (!test && (!on() || (a.kind === 'bits' ? !c.bits : !c.tips))) return null;
  const n = howMany(a.kind, a.amount, c); if (!n || !onKinds(c).length) return null;
  let r = null; for (let i = 0; i < n; i++) { const x = start({ kind: 'random', by: a.name, via: a.kind === 'bits' ? 'bits' : 'tip', test }); if (!r) r = x; }
  return { ...r, count: n };
}
export function redeem(r) {
  const c = cfg(); if (!r.test && (!on() || !c.points || !onKinds(c).length)) return null; // (switched off: the redeem is left alone for the streamer, never refunded by the app)
  return start({ kind: 'random', by: r.name, via: 'points', test: !!r.test });
}
/** 🧪 the picking rule on made-up prices (nothing starts) */
export function demo() {
  const c = cfg(); for (const k of Object.keys(FX)) c.fx[k].on = true; Object.assign(c, { bitsCost: 300, tip: 3 });
  c.fx.flip.on = false;
  const rows = [], T = (label, got, ok) => rows.push({ label, got, ok });
  T('100 bits (price 300): not enough', howMany('bits', 100, c), howMany('bits', 100, c) === 0);
  T('300 bits: one random effect', howMany('bits', 300, c), howMany('bits', 300, c) === 1);
  T('950 bits: three, one after another', howMany('bits', 950, c), howMany('bits', 950, c) === 3);
  T('$5 tip (price $3): one', howMany('tip', 5, c), howMany('tip', 5, c) === 1);
  T('$100 tip: at most ' + MAX_BUY, howMany('tip', 100, c), howMany('tip', 100, c) === MAX_BUY);
  T('Tip price $0 = tips can\'t buy one', howMany('tip', 50, { ...c, tip: 0 }), howMany('tip', 50, { ...c, tip: 0 }) === 0);
  const seen = new Set(); let twice = 0, prev = null, off = 0; for (let i = 0; i < 600; i++) { const k = pickRandom(c, prev ? [prev] : []); seen.add(k); if (k === prev) twice++; if (k === 'flip') off++; prev = k; }
  T('Random: every switched-on effect comes up', `${seen.size} of ${onKinds(c).length}`, seen.size === onKinds(c).length);
  T('Random: a switched-off one (Upside down) never comes up', off + ' times', off === 0);
  T('Random: never the same one twice in a row', twice + ' repeats in 600', twice === 0);
  T('Random: only one switched on = that one', pickRandom({ ...c, fx: Object.fromEntries(Object.keys(FX).map(k => [k, { on: k === 'tv', secs: 120 }])) }, ['tv']), pickRandom({ ...c, fx: Object.fromEntries(Object.keys(FX).map(k => [k, { on: k === 'tv', secs: 120 }])) }, ['tv']) === 'tv');
  T('Every effect lasts 2 minutes unless you change it', [...new Set(Object.values(FX).map(F => F.secs))].join(', ') + ' s', Object.values(FX).every(F => F.secs === 120));
  const f = frame('bw', 5, 30), g = frame('flip', 5, 30), e = frame('drunk', 29.99, 30);
  rows.push({ label: 'Black & white: colour all the way out', got: 'colour ' + f.sat, ok: f.sat === -1 && f.rot === 0 });
  rows.push({ label: 'Upside down: turned 180°', got: g.rot + '°', ok: g.rot === 180 });
  rows.push({ label: 'Every effect eases back to normal at the end', got: 'turn ' + e.rot.toFixed(2) + '°, size ' + e.s.toFixed(3), ok: Math.abs(e.rot) < 0.2 && Math.abs(e.s - 1) < 0.01 });
  return { ok: rows.every(r => r.ok), rows };
}

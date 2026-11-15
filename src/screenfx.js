// 🌀 Screen effects (1.155.0, Derek: "chat can mess with my screen: turn my game capture black and white, or drunk view… what I see, and the stream too";
// he isn't sure yet whether it'll be channel points or real money, so every way in has its own switch + price).
// The effect list + its maths live in public/screenfx.js (the app uses the same file for the Game capture tab's picture).
import { db, save } from './store.js';
import '../public/screenfx.js';
const { FX, MOVES, frame, mix } = globalThis.SCREENFX;
export { FX };
const H = { on: () => false, send: () => {}, say: () => {}, act: () => {}, obsOk: () => true, play: null, stop: () => {}, changed: () => {} };
export const setHooks = h => Object.assign(H, h);
const clamp = (v, lo, hi, d) => { v = Number(v); return Number.isFinite(v) ? Math.max(lo, Math.min(hi, v)) : d; };
/** the saved settings, filled in */
export function cfg() {
  const c = db.settings.screenFx || {}, fx = {};
  for (const [k, d] of Object.entries(FX)) { const o = c.fx?.[k] || {}; fx[k] = { on: o.on !== false, secs: clamp(o.secs, 5, 600, d.secs) }; }
  // (1.156.3, Derek: "it will be random, they do not get to choose") ONE price for a random effect, not one per effect
  return { on: !!c.on, points: c.points !== false, bits: !!c.bits, tips: !!c.tips, stream: c.stream !== false, source: String(c.source || ''), say: c.say !== false, timer: c.timer !== false, away: c.away !== false, mara: !!c.mara, gap: clamp(c.gap, 0, 120, 0),
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
  for (const k of ['on', 'points', 'bits', 'tips', 'stream', 'say', 'timer', 'away', 'mara']) if (typeof b[k] === 'boolean') c[k] = b[k];
  if (typeof b.source === 'string') c.source = b.source.slice(0, 120);
  if (b.gap != null) c.gap = clamp(b.gap, 0, 120, 0);
  if (b.pts != null) c.pts = clamp(b.pts, 1, 10000000, PRICE.pts); if (b.bitsCost != null) c.bitsCost = clamp(b.bitsCost, 0, 1000000, PRICE.bits); if (b.tip != null) c.tip = clamp(b.tip, 0, 100000, PRICE.tip);
  if (b.fx && typeof b.fx === 'object') for (const [k, o] of Object.entries(b.fx)) { if (!FX[k] || !o) continue; const x = ((c.fx ||= {})[k] ||= {});
    if (typeof o.on === 'boolean') x.on = o.on; if (o.secs != null) x.secs = clamp(o.secs, 5, 600, FX[k].secs); }
  save(); applyHold(); H.changed(); return cfg();
}
// ---- playing: one at a time, the rest wait in a line (a redeem is never thrown away: the app never refunds) ----
let cur = null, timer = null, last = null; const q = [];
const ownName = ks => ks.map(k => FX[k].name).join(' + '), ownIcon = ks => ks.map(k => FX[k].icon).join('');
export const now = () => (cur && cur.forever ? { id: cur.id, kind: cur.kind, kinds: cur.kinds, forever: true, name: ownName(cur.kinds), icon: ownIcon(cur.kinds), secs: null, at: cur.at, left: null, paused: false, pausedBy: '', by: 'you', via: 'you', test: !!cur.test, stream: cur.stream }
  : cur ? { id: cur.id, kind: cur.kind, name: FX[cur.kind].name, icon: FX[cur.kind].icon, secs: cur.secs, at: cur.at, left: Math.max(0, Math.round((cur.pl != null ? cur.pl : cur.at + cur.secs * 1000 - Date.now()) / 1000)), paused: cur.pl != null, pausedBy: cur.pl != null ? (hold.hand ? 'you' : 'away') : '', by: cur.by, via: cur.via, test: !!cur.test, stream: cur.stream } : null);
export const state = () => ({ own: ownState(), now: now(), paused: !!cur && cur.pl != null, away: hold.auto, waiting: !cur && !!q.length && blockedNext(), queue: q.map(x => x.kind === 'random' ? { kind: 'random', name: 'Random', icon: '🎲', secs: null, by: x.by, via: x.via } : { kind: x.kind, name: FX[x.kind].name, icon: FX[x.kind].icon, secs: x.secs, by: x.by, via: x.via }), last });
/** start (or line up) an effect. kind 'random' = picked when its turn comes (Derek: viewers don't choose). via: points | bits | tip | mara | you | test. dry = only in the app, OBS is left alone */
export function start({ kind, secs, by = '', via = 'you', test = false, dry = false } = {}) {
  const c = cfg();
  if (kind === 'random') { if (!onKinds(c).length) throw new Error('Every screen effect is switched off.'); }
  else if (!FX[kind]) throw new Error('Which effect?');
  const item = { id: Math.random().toString(36).slice(2, 10), kind, secs: kind === 'random' ? (secs != null ? clamp(secs, 3, 600, 120) : null) : clamp(secs, 3, 600, c.fx[kind].secs), by: String(by || '').slice(0, 40), via, test: !!test, dry: !!dry };
  if (q.length >= 40) q.shift();
  q.push(item); const waiting = !!cur && !cur.forever; if (!waiting) next(); // (your own stay-on effect steps aside for it: see next)
  if (waiting) H.send({ type: 'screenFx', fx: now(), queue: q.length }); // (the timers show how many are next)
  if (waiting && c.say && !test && via !== 'you') H.say(`🎲 @${item.by || 'Someone'}'s screen effect is in line (${q.length} waiting). It starts right after the one playing now.`);
  const shown = waiting ? item : (cur?.id === item.id ? cur : item);
  return { ok: true, id: item.id, waiting, ahead: waiting ? q.length : 0, kind: shown.kind, name: shown.kind === 'random' ? 'a random effect' : FX[shown.kind].name, secs: shown.secs };
}
// ⏸ (1.159.0, Derek: "if I switch off the capture screen pause effects and resume them once I full screen the capture screen again" + "a pause and play button on the effect timer")
// Two reasons to hold: 'auto' = the Game capture screen isn't showing (the server says), 'hand' = he pressed ⏸. A held effect keeps its time left; the line waits behind it.
// Effects he starts himself (▶ by hand, tests) are never held by 'auto', so they can be tried from any tab.
const hold = { auto: false, hand: false };
const exempt = it => !!it && !it.noExempt && (!!it.test || it.via === 'you');
const heldFor = it => hold.hand || (hold.auto && cfg().away && !exempt(it));
const blockedNext = () => !!q.length && hold.auto && cfg().away && !exempt(q[0]);
function run(mine, el = 0) { // play (the rest of) it: OBS + the end timer. el = seconds already played
  const c = cfg(), left = mine.forever ? 1e9 : Math.max(0.05, mine.secs - el);
  if (c.stream && !mine.dry && H.play && H.obsOk()) {
    mine.stream = 'on';
    H.play(mine.forever ? { source: c.source, secs: left, frame: t => mix(mine.kinds, t, Infinity), moves: mine.kinds.some(k => MOVES[k]) } : { source: c.source, secs: left, frame: t => frame(mine.kind, t + el, mine.secs), moves: !!MOVES[mine.kind] })
      .then(r => { mine.stream = r?.errors?.length ? 'part' : 'ok'; last = { ...(last || {}), obs: r, obsErr: r?.errors?.[0] || '' }; })
      .catch(e => { mine.stream = 'off'; last = { ...(last || {}), obsErr: e.message }; H.changed(); });
  } else mine.stream = mine.dry ? 'dry' : 'off';
  clearTimeout(timer); timer = mine.forever ? null : setTimeout(() => end(mine), left * 1000);
}
function pauseNow() { if (!cur || cur.forever || cur.pl != null) return; clearTimeout(timer); timer = null; cur.pl = Math.max(0, cur.at + cur.secs * 1000 - Date.now()); try { H.stop(); } catch {} H.send({ type: 'screenFx', fx: now(), queue: q.length }); H.changed(); }
function resumeNow() { if (!cur || cur.pl == null) return; const el = cur.secs - cur.pl / 1000; cur.at = Date.now() - el * 1000; delete cur.pl; run(cur, el); H.send({ type: 'screenFx', fx: now(), queue: q.length }); H.changed(); }
function applyHold() { if (cur && !cur.forever) { if (heldFor(cur)) pauseNow(); else resumeNow(); } else if (q.length) next(); }
/** the server: is the Game capture screen showing? (off = effects wait) */
export function setAway(v) { v = !!v; if (hold.auto === v) return; hold.auto = v; applyHold(); }
/** ⏸ / ▶ by hand (the small button on the timer). on: true = pause, false = play, 'toggle' */
export function pause(on = 'toggle') {
  if (!cur) throw new Error('No screen effect is playing.');
  if (cur.forever) throw new Error('That is your own effect: it stays on until you turn it off (Ctrl+Alt+D on the Game capture tab).');
  const want = on === 'toggle' ? cur.pl == null : !!on;
  if (!want && hold.auto && cfg().away && !exempt(cur)) { hold.hand = false; throw new Error('It is paused because the Game capture screen isn\'t showing. It carries on when you are back on it.'); }
  hold.hand = want; applyHold(); return { ok: true, paused: cur.pl != null, now: now() };
}
function next() {
  if ((cur && !cur.forever) || !q.length) return;
  if (blockedNext()) return void ownBack(); // (waits in the line until the Game capture screen is back)
  if (cur?.forever) { ownKeep = { kinds: cur.kinds, dry: cur.dry, test: cur.test }; cur = null; try { H.stop(); } catch {} } // 🎛️ your own effect steps aside for chat's, and comes back after the line is empty
  const it = q.shift(), c = cfg();
  if (it.kind === 'random') { it.kind = pickRandom(c, [cur?.kind, last?.kind].filter(Boolean)) || 'bw'; if (it.secs == null) it.secs = c.fx[it.kind].secs; it.random = true; }
  const F = FX[it.kind];
  cur = { ...it, at: Date.now(), stream: null };
  H.send({ type: 'screenFx', fx: now(), queue: q.length });
  if (!it.test) { if (c.say && it.via !== 'you') H.say(`${F.icon} ${it.by ? '@' + it.by : 'Someone'} ${it.random ? 'rolled' : 'hit the screen with'} ${F.name.toUpperCase()}${it.random ? ' 🎲' : ''} for ${it.secs >= 120 && it.secs % 60 === 0 ? it.secs / 60 + ' minutes' : it.secs + ' seconds'}!`); H.act(`${F.name} on the screen for ${it.secs} s${it.via === 'mara' ? ' (it won the battle)' : it.via === 'you' ? ' (started by hand)' : ''}`, { icon: F.icon, who: it.via === 'you' || it.via === 'mara' ? undefined : it.by, kind: 'screenfx' }); }
  run(cur, 0);
}
function end(mine, stopped) {
  if (cur !== mine) return; clearTimeout(timer); timer = null;
  last = { kind: mine.kind, by: mine.by, via: mine.via, at: mine.at, secs: mine.secs, stream: mine.stream, stopped: !!stopped, obsErr: last?.obsErr || '', obs: last?.obs || null };
  cur = null; hold.hand = false; try { H.stop(); } catch {}
  H.send({ type: 'screenFx', fx: null, queue: q.length }); H.changed();
  if (q.length) setTimeout(next, cfg().gap * 1000); else ownBack();
}
// 🎛️ (1.163.0, Derek: "ctrl+alt+d in capture screen and a popup will pop up that will let me do my own effects. these last forever until I turn them off")
// His own effects: any mix of the effects, on until he turns them off. They use the same one slot as chat's effects: when a viewer's effect comes in,
// his steps aside (kept in ownKeep), the viewer's plays (a paid effect is never thrown away), and his comes back when the line is empty.
let ownKeep = null;
const ownClean = ks => [...new Set((Array.isArray(ks) ? ks : []).map(String).filter(k => FX[k]))].slice(0, 8);
function ownStart(o) { ownKeep = null; cur = { id: Math.random().toString(36).slice(2, 10), kind: o.kinds[0], kinds: o.kinds, forever: true, secs: null, by: 'you', via: 'you', test: !!o.test, dry: !!o.dry, at: Date.now(), stream: null };
  H.send({ type: 'screenFx', fx: now(), queue: q.length }); run(cur, 0); H.changed(); }
function ownBack() { if (!cur && ownKeep) ownStart(ownKeep); }
export const ownState = () => ({ kinds: cur?.forever ? cur.kinds : ownKeep ? ownKeep.kinds : [], waiting: !cur?.forever && !!ownKeep });
/** set which of his own effects are on. kinds = the whole list ([] = all off); or kind + on (true / false / 'toggle') for one */
export function own({ kinds, kind, on = 'toggle', dry = false, test = false } = {}) {
  if (!H.on()) throw new Error('Screen effects are not part of this edition.');
  let ks = ownState().kinds.slice();
  if (kinds) ks = ownClean(kinds);
  else { if (!FX[kind]) throw new Error('Which effect?'); const has = ks.includes(kind), want = on === 'toggle' ? !has : !!on; ks = want ? ownClean([...ks, kind]) : ks.filter(k => k !== kind); }
  const was = ownState().kinds.join(',');
  if (cur?.forever) { const mine = cur; cur = null; try { H.stop(); } catch {} if (!ks.length) { last = { kind: mine.kind, by: 'you', via: 'you', at: mine.at, secs: null, stream: mine.stream, stopped: true, obsErr: last?.obsErr || '', obs: last?.obs || null }; H.send({ type: 'screenFx', fx: null, queue: q.length }); H.changed(); } }
  if (!ks.length) ownKeep = null;
  else if (cur) ownKeep = { kinds: ks, dry, test }; // (a viewer's effect is playing: yours starts when the line is empty)
  else ownStart({ kinds: ks, dry, test });
  if (!test && was !== ks.join(',')) H.act(ks.length ? `Your own screen effect: ${ownName(ks)} (stays on until you turn it off)` : 'Your own screen effects turned off', { icon: '🎛️', kind: 'screenfx' });
  if (!cur && q.length) next();
  return { ok: true, own: ownState(), now: now() };
}
/** 🛑 stop what's playing (all = and empty the line) */
export function stop(all = false) { if (all) { q.length = 0; ownKeep = null; } const had = !!cur; if (cur) end(cur, true); return { ok: true, had, queue: q.length }; }
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
/** 🧪 pause + resume, for real but short and only in the app (OBS is left alone). Refuses while something plays. */
export async function pauseDemo() {
  if (cur || q.length) throw new Error('A screen effect is playing or waiting. Stop it first (🛑), then check again.');
  const was = { ...hold }, rows = [], T = (label, got, ok) => rows.push({ label, got: String(got), ok: !!ok }), wait = ms => new Promise(r => setTimeout(r, ms));
  const c0 = db.settings.screenFx?.away; (db.settings.screenFx ||= {}).away = true;
  try {
    hold.hand = false; hold.auto = true;
    q.push({ id: 'pd' + Date.now(), kind: 'bw', secs: 20, by: 'test', via: 'points', test: true, dry: true, noExempt: true }); next();
    T('Away from the Game capture screen: a new effect waits in the line', cur ? 'started' : 'waiting', !cur && q.length === 1);
    setAway(false); T('Back on the Game capture screen: it starts', cur ? 'playing' : 'not started', !!cur && cur.pl == null);
    await wait(1100); setAway(true); const l1 = now()?.left;
    T('Leave the screen: it pauses with its time kept', now()?.paused ? `paused, ${l1} s left` : 'still playing', now()?.paused && l1 >= 18 && l1 <= 19);
    await wait(1100); T('While paused the time does not run', `${now()?.left} s left`, now()?.left === l1);
    setAway(false); T('Come back: it carries on from there', now()?.paused ? 'still paused' : `${now()?.left} s left`, !now()?.paused && Math.abs(now().left - l1) <= 1);
    pause(true); T('⏸ button: paused', now()?.paused ? 'paused' : 'playing', now()?.paused && now().pausedBy === 'you');
    setAway(true); setAway(false); T('Paused by hand stays paused when you come back', now()?.paused ? 'paused' : 'playing', now()?.paused);
    pause(false); T('▶ button: playing again', now()?.paused ? 'paused' : 'playing', !now()?.paused);
    stop(); T('Stop still works', cur ? 'playing' : 'stopped', !cur);
  } finally { if (cur?.noExempt) stop(); const i = q.findIndex(x => x.noExempt); if (i >= 0) q.splice(i, 1); if (c0 === undefined) delete db.settings.screenFx.away; else db.settings.screenFx.away = c0; hold.hand = false; hold.auto = was.auto; applyHold(); }
  return { ok: rows.every(r => r.ok), rows };
}
/** 🧪 your own stay-on effects, for real but only in the app (OBS is left alone, about 5 seconds). Refuses while something plays. */
export async function ownDemo() {
  if (cur || q.length || ownKeep) throw new Error('A screen effect is playing or waiting (or your own effects are on). Turn them off first, then check again.');
  const rows = [], T = (label, got, ok) => rows.push({ label, got: String(got), ok: !!ok }), wait = ms => new Promise(r => setTimeout(r, ms)), was = { ...hold };
  try {
    hold.hand = false; hold.auto = true; // (even away from the Game capture screen: yours never wait)
    own({ kind: 'bw', on: true, dry: true, test: true });
    T('Turn on Black & white: it is on with no end time', now()?.forever ? 'on, no timer' : 'not on', now()?.forever && now().left == null && now().kinds.join() === 'bw');
    own({ kind: 'tiny', on: true, dry: true, test: true });
    T('Add Tiny screen: both are on together', now()?.name || 'nothing', now()?.kinds?.join() === 'bw,tiny');
    const f = mix(['bw', 'tiny'], 5, Infinity); T('Together: no colour AND small', `colour ${f.sat}, size ${f.s.toFixed(2)}`, f.sat === -1 && Math.abs(f.s - 0.32) < 0.01);
    await wait(1200); T('It is still on after a while', now()?.forever ? 'on' : 'off', !!now()?.forever);
    let threw = ''; try { pause(true); } catch (e) { threw = e.message; } T('It can\'t be paused, only turned off', threw ? 'refused' : 'paused', !!threw && !!now()?.forever);
    hold.auto = false; start({ kind: 'dark', secs: 3, by: 'Pretend_Viewer', via: 'test', test: true, dry: true });
    T('A viewer\'s effect comes in: yours steps aside and theirs plays', now()?.name || 'nothing', now()?.kind === 'dark' && !now().forever && ownState().waiting);
    await wait(3300); T('Theirs is over: yours comes back by itself', now()?.name || 'nothing', now()?.forever && now().kinds.join() === 'bw,tiny');
    own({ kind: 'bw', on: false, dry: true, test: true }); T('Turn one off: the other stays', now()?.name || 'nothing', now()?.kinds?.join() === 'tiny');
    own({ kinds: [], test: true }); T('Turn everything off: the picture is normal again', cur ? 'still on' : 'off', !cur && !ownKeep);
  } finally { if (cur?.test) { cur = null; clearTimeout(timer); timer = null; try { H.stop(); } catch {} H.send({ type: 'screenFx', fx: null, queue: q.length }); } ownKeep = null; for (let i = q.length - 1; i >= 0; i--) if (q[i].test) q.splice(i, 1); hold.hand = false; hold.auto = was.auto; applyHold(); }
  return { ok: rows.every(r => r.ok), rows };
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

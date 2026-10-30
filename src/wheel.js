// 🎡 The Wheel: a full Wheel of Names replacement inside Movie Royal.
// Saved wheels (in folders), spots with sizes / colors / rules / pictures / sounds, a 2-minute "round timer",
// spot types (timer / auto / countdown), the optional 🕳️ VOID spot, channel point respins / moves / grows,
// saved respins (!respin), money pop-ups, undo, and full history + stats.
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { db, save, uid, norm, streamerName, UPLOADS } from './store.js';
import { importLink } from './importer.js';

const TAU = Math.PI * 2;
const VX = '🕳️'; // the VOID (and "bring back a voided spot")
const RX = '🔁'; // a respin
const mod = (a, n) => ((a % n) + n) % n;
const rnd = () => crypto.randomInt(0, 1e9) / 1e9;
export const PAL = ['#ff4f6d', '#ffb547', '#ffe066', '#5ce1a7', '#4fc3ff', '#7c6cff', '#ff7ad9', '#46d6c7', '#ff8a4c', '#a4e05a', '#5d8bff', '#e05ad0'];
const REWARDS = { respin: 'Wheel: Respin', move: 'Wheel: Move a spot', up: 'Wheel: Move up a spot', down: 'Wheel: Move down a spot', grow: 'Wheel: Grow a spot', shrink: 'Wheel: Shrink a spot', double: 'Wheel: Double trouble', stop: 'Wheel: Force stop' };
// every wheel has its own settings (shrink, void and doomsday are off until you turn them on)
export const DEF_OPTS = { speed: 1, confetti: true, ticks: true, winSound: true, recent: true, showPct: true, chat: true, bankRespin: true, growPct: 10,
  rules: true, // off = a plain wheel: no spot types, no rules, no round timer, no void
  round: { on: true, len: 2, unit: 'min' }, // the round timer: starts when the first spin lands, runs out = that's the winner
  collide: { on: true, secs: 5 }, // respins that come in at almost the same time: the first spins, the rest are saved for later
  points: { respin: true, move: true, up: true, down: true, grow: true, shrink: false, double: true, stop: true },
  void: { on: false, label: 'VOID', weight: 1, color: '#0b0b12', landings: 5, doomsday: false, monthly: true },
  pop: { on: true, sub: true, gift: true, bits: true, money: true, grow: true, shrink: false, spins: true, unvoid: true } };
export const mergeOpts = o => ({ ...DEF_OPTS, ...(o || {}), round: { ...DEF_OPTS.round, ...(o?.round || {}) }, collide: { ...DEF_OPTS.collide, ...(o?.collide || {}) }, points: { ...DEF_OPTS.points, ...(o?.points || {}) }, void: { ...DEF_OPTS.void, ...(o?.void || {}) }, pop: { ...DEF_OPTS.pop, ...(o?.pop || {}) } });
export const TYPES = { timer: '⏱️ Timer', auto: '⚡ Auto', autolink: '⚡🔀 Auto + Link', countdown: '🔢 Countdown', autocount: '⚡🔢 Auto + countdown', timercount: '⏱️🔢 Timer + countdown', timermax: '⏱️🏆 Timer + max wins a night', void: '🕳️ Void' };
const DEF_LOOK = { bg: '', bgImage: '', rim: '#2a1846', bulbs: true, pointer: '#ffffff', hub: '🎡', hubImage: '', lines: '#ffffff', font: 'Inter', textScale: 1, textColor: '' };

export function W() {
  const w = db.wheel ||= {};
  w.wheels ||= []; w.history ||= []; w.rewards = { ...REWARDS, ...(w.rewards || {}) }; w.costs = { respin: 1000, move: 500, up: 500, down: 500, grow: 2000, shrink: 2000, double: 3000, stop: 5000, ...(w.costs || {}) };
  w.pointsOn ??= true; w.show ??= false; w.bank ||= {}; w.grants ||= []; w.folders ||= [];
  w.mine ||= { perStream: 3, left: 3 }; w.cmd = { respin: '!respin', spins: '!myspins', ...(w.cmd || {}) }; if (w.cmd.spins === '!spins') w.cmd.spins = '!myspins';
  w.redeemLog ||= []; w.voidHits ||= {}; w.bringBack ||= { month: '', used: 0 };
  w.auto = { subSpins: 1, giftSpins: 1, bitsPer: 500, bitsSpins: 1, dollarsPer: 5, popBits: 100, tierMult: true, ...(w.auto || {}) };
  w.boosts ||= [];
  if (!w.wheels.length) w.wheels.push(newWheel('My wheel', ['Spot 1', 'Spot 2', 'Spot 3', 'Spot 4', 'Spot 5', 'Spot 6'].map(t => ({ text: t }))));
  for (const x of w.wheels) {
    x.look = { ...DEF_LOOK, ...(x.look || {}) }; x.opts = mergeOpts(x.opts); x.folder ||= '';
    if (x.opts.void.label !== 'VOID' && x.opts.void.label.replace(/[^A-Z]/g, '') === 'VOID') x.opts.void.label = 'VOID';
    for (const e of x.entries) { if (!TYPES[e.type]) e.type = 'timer'; if (e.image === '/gauntlet.svg') e.image = ''; } // old "normal" spots are timer spots now
  }
  if (!w.wheels.some(x => x.id === w.activeId)) w.activeId = w.wheels[0].id;
  return w;
}
export function newWheel(name, entries = [], extra = {}) {
  return { id: uid(), name: String(name || 'New wheel').slice(0, 80), title: '', folder: '', createdAt: Date.now(), spinSecs: 10, removeWinner: false, rot: 0, palette: null, look: { ...DEF_LOOK }, opts: mergeOpts(), ...extra, entries: entries.map(cleanEntry) };
}
const num = (v, d, lo, hi) => { const n = Number(v); return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : d; };
const fileOk = v => /^(\/uploads\/[\w.-]+|https?:\/\/\S+)$/.test(v || '') ? v : '';
// 🔗 an optional web page for a spot (a game, a site…): a button opens it when the spot wins
export const cleanLink = v => { let u = String(v || '').trim(); if (!u) return ''; if (!/^https?:\/\//i.test(u)) u = 'https://' + u; try { const x = new URL(u); return /^https?:$/.test(x.protocol) && x.hostname.includes('.') ? x.href.slice(0, 500) : ''; } catch { return ''; } };
// 🔀 a spot can send you to another wheel or a battle when it wins: { kind: 'wheel' | 'battle', id, auto (battle: start it by itself) }
const cleanGoTo = g => g && (g.kind === 'wheel' || g.kind === 'battle' || g.kind === 'cards') && g.id ? { kind: g.kind, id: String(g.id).slice(0, 80), auto: g.auto !== false } : null;
export function cleanEntry(e) {
  const type = TYPES[e.type] ? e.type : 'timer'; // old normal / timer / refund spots are all timer spots now
  const out = { id: e.id || uid(), text: String(e.text ?? e.label ?? '').slice(0, 200), weight: e.weight === 0 || e.weight === '0' ? 0 : num(e.weight, 1, 0, 1e7) || 1, color: /^#[0-9a-f]{6}$/i.test(e.color || '') ? e.color : null,
    rule: String(e.rule || '').slice(0, 2000), on: e.on !== false && e.enabled !== false, type, voided: e.voided || null, image: fileOk(e.image === '/gauntlet.svg' ? '' : e.image), sound: fileOk(e.sound),
    noPointRespin: !!e.noPointRespin, noBankRespin: !!e.noBankRespin, link: cleanLink(e.link), goTo: cleanGoTo(e.goTo) };
  if (type === 'countdown' || type === 'autocount') { out.countStart = Math.round(num(e.countStart, 3, 1, 100000)); out.count = Math.round(num(e.count ?? out.countStart, out.countStart, 0, 100000)); out.autoKnock = e.autoKnock !== false; }
  if (type === 'timercount') { out.countStart = Math.round(num(e.countStart, 3, 1, 100000)); out.count = Math.round(num(e.count ?? out.countStart, out.countStart, 0, 100000)); } // a timer spot: each WIN takes one off, at 0 it goes invisible
  if (type === 'timermax') { out.maxWins = Math.round(num(e.maxWins, 1, 1, 1000)); out.wins = Math.round(num(e.wins, 0, 0, 1000)); out.maxedOff = !!e.maxedOff; } // a timer spot that can only win so many times a night
  return out;
}
const active = () => W().wheels.find(x => x.id === W().activeId);
export const getWheel = id => W().wheels.find(x => x.id === id);
// the optional 🕳️ VOID spot lives on the wheel as a spot (only when rules are on)
export function syncVoid(w) {
  const v = w.opts.void, has = w.entries.find(e => e.type === 'void'), want = v.on && w.opts.rules !== false;
  if (want && !has) w.entries.push(cleanEntry({ id: 'void-' + w.id, text: v.label || 'VOID', type: 'void', weight: v.weight || 1, color: v.color || '#0b0b12', rule: 'Respins! Whatever it lands on next is gone for the rest of the stream.' }));
  else if (!want && has) w.entries = w.entries.filter(e => e.type !== 'void');
  else if (has) { has.text = v.label || has.text; has.color = v.color || has.color; }
}
function layout(w) {
  const on = w.entries.filter(e => e.on !== false && e.weight > 0 && !e.voided), tot = on.reduce((a, e) => a + e.weight, 0) || 1; let a = 0;
  return on.map((e, i) => { const s = { e, i, a0: a, a1: a + e.weight / tot * TAU, pct: Math.round(e.weight / tot * 10000) / 100, color: e.color || (w.palette || PAL)[i % (w.palette || PAL).length] }; a = s.a1; return s; });
}
const rulesOn = w => w?.opts?.rules !== false;
// the words shown in the slice: countdown spots show how many are left, auto spots say (auto)
const slotLabel = (w, e) => !rulesOn(w) ? e.text : e.type === 'autocount' ? `${e.text} (auto ${e.count})` : e.type === 'countdown' || e.type === 'timercount' ? `${e.text} (${e.count})` : e.type === 'timermax' ? `${e.text} (${Math.max(0, e.maxWins - (e.wins || 0))} left)` : /^auto/.test(e.type) ? `${e.text} (auto)` : e.text;
// a spot WON (the round timer ran out on it, or the next fresh spin started with no round timer): timer + countdown / timer + max spots count it
function countWin(w, entryId) {
  if (!w || !rulesOn(w)) return;
  const e = w.entries.find(x => x.id === entryId); if (!e) return;
  if (e.type === 'timercount' && e.count > 0) e.count--;
  if (e.type === 'timermax') e.wins = (e.wins || 0) + 1;
}
// used up: invisible from the next spin (timer + countdown at 0 for good, timer + max until the next stream)
function hideUsedUp(w) {
  for (const e of w.entries) {
    if (e.type === 'timercount' && e.count <= 0 && e.on) e.on = false;
    if (e.type === 'timermax' && (e.wins || 0) >= e.maxWins && e.on) { e.on = false; e.maxedOff = true; }
  }
}
// what the screens need to draw it (colors filled in so both screens match)
export const view = w => w && ({ id: w.id, name: w.name, title: w.title, rot: w.rot || 0, spinSecs: w.spinSecs, look: w.look, rules: rulesOn(w),
  opts: { confetti: w.opts.confetti, ticks: w.opts.ticks, winSound: w.opts.winSound, recent: w.opts.recent, showPct: w.opts.showPct },
  voidOn: !!w.opts.void.on && rulesOn(w), voided: w.entries.filter(e => e.voided).map(e => e.text),
  entries: layout(w).map(s => ({ id: s.e.id, text: s.e.text, label: slotLabel(w, s.e), weight: s.e.weight, color: s.color, rule: rulesOn(w) ? s.e.rule : '', image: s.e.image, sound: s.e.sound, type: rulesOn(w) ? s.e.type : 'timer', count: s.e.count })) });

let hooks = { broadcast: () => {}, pushState: () => {}, say: async () => {}, obsDoom: async () => {}, openBattle: () => 'not ready', openCards: () => 'not ready', goView: () => {} };
let busyUntil = 0, spinning = null; const queue = []; let qTimer = null;
export function initWheel(h) { hooks = { ...hooks, ...h }; W(); const st = W(); if (st.round?.state === 'running') { st.round.state = 'paused'; st.round.why = 'you'; } }
export function wheelMsg() { const w = W(), a = active(); return { type: 'wheel', show: w.show, wheel: view(a), last: w.last && w.last.wheelId === a?.id ? w.last : null, final: w.final && w.final.wheelId === a?.id ? w.final : null, round: roundView() }; }
export function setShow(on) { W().show = !!on; save(); hooks.broadcast(wheelMsg()); hooks.pushState(); }
const bump = () => { const st = W(); st.ver = (st.ver || 0) + 1; };
const note = text => hooks.broadcast({ type: 'toast', text: '🎡 ' + text }, 'control');
function log(rec) { const st = W(); st.history.push({ id: uid(), at: Date.now(), ...rec }); if (st.history.length > 50000) st.history = st.history.slice(-50000); }
const lastEntry = () => { const st = W(); if (!st.last) return null; return getWheel(st.last.wheelId)?.entries.find(e => e.id === st.last.entryId) || null; };
const lastWheel = () => { const st = W(); return (st.last && getWheel(st.last.wheelId)) || active(); };
const say = t => hooks.say(t).catch(() => {});
const sayW = (w, t) => { if (w?.opts?.chat !== false) say(t); };
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const banner = (html, extra = {}) => hooks.broadcast({ type: 'wheelBanner', html, ...extra }, 'overlay');
const refresh = () => { bump(); save(); hooks.broadcast(wheelMsg()); hooks.pushState(); };

// ---------- ⏪ undo: every change to the wheel can be taken back, step by step ----------
const undo = [];
function snap(label) {
  const st = W(), w = lastWheel();
  undo.push({ id: uid(), at: Date.now(), label, wheelId: w?.id, entries: JSON.stringify(w?.entries || []), rot: w?.rot || 0, last: st.last ? JSON.stringify(st.last) : null, final: st.final ? JSON.stringify(st.final) : null,
    round: st.round ? JSON.stringify(roundSave()) : null, bank: JSON.stringify(st.bank), mine: st.mine.left, hist: st.history.length, voidHits: JSON.stringify(st.voidHits) });
  if (undo.length > 60) undo.shift();
}
export const undoList = () => undo.slice().reverse().map(u => ({ id: u.id, at: u.at, label: u.label }));
export function undoTo(id) {
  const i = id ? undo.findIndex(u => u.id === id) : undo.length - 1; if (i < 0) throw new Error('Nothing to go back to.');
  const u = undo[i], st = W(), w = getWheel(u.wheelId);
  queue.length = 0; clearTimeout(qTimer); clearTimeout(roundT); for (const t of voidTimers) clearTimeout(t); voidTimers.length = 0; busyUntil = 0; spinning = null;
  if (w) { w.entries = JSON.parse(u.entries); w.rot = u.rot; }
  st.last = u.last ? JSON.parse(u.last) : null; st.final = u.final ? JSON.parse(u.final) : null; st.bank = JSON.parse(u.bank); st.mine.left = u.mine; st.voidHits = JSON.parse(u.voidHits);
  st.round = u.round ? JSON.parse(u.round) : null; if (st.round?.state === 'running') { st.round.state = 'paused'; st.round.why = 'you'; } // back in time: the timer waits for you
  const gone = st.history.length - u.hist; st.history.length = u.hist;
  undo.length = i;
  log({ kind: 'undo', wheelId: w?.id, wheelName: w?.name, text: `Went back to before: ${u.label}`, steps: gone, by: { name: streamerName(), source: 'you' } });
  refresh(); hooks.broadcast({ type: 'wheelUndo' }, 'overlay');
  return { label: u.label };
}

// ---------- ⏱️ the round timer ----------
// Starts when the first spin lands. Keep spinning (respins, moves) until it runs out: where it is then is the winner.
// ⚡ auto and 🔢 countdown spots pause it until you spin again. You can pause it any time.
let roundT = null;
const roundLen = w => { const r = w.opts.round; return Math.max(5, (Number(r.len) || 2) * (r.unit === 'sec' ? 1 : 60)) * 1000; };
function roundSave() { const r = W().round; if (!r) return null; return { ...r, left: r.state === 'running' ? Math.max(0, r.endsAt - Date.now()) : r.left }; }
function roundView() { const r = roundSave(); if (!r) return null; return { state: r.state, left: r.left, total: r.total, why: r.why || '', endsAt: r.state === 'running' ? Date.now() + r.left : null, wheelId: r.wheelId }; }
export const getRound = () => roundView();
function roundOn(w) { return rulesOn(w) && w.opts.round.on !== false; }
function sendRound(extra = {}) { bump(); save(); hooks.broadcast({ type: 'wheelRound', round: roundView(), ...extra }); hooks.pushState(); }
function armRound() { clearTimeout(roundT); const r = W().round; if (!r || r.state !== 'running') return; roundT = setTimeout(roundOut, Math.max(0, r.endsAt - Date.now()) + 30); }
function roundRun() { const r = W().round; r.endsAt = Date.now() + r.left; r.state = 'running'; r.why = ''; armRound(); }
function roundPause(why) { const r = W().round; if (!r || r.state !== 'running') return; r.left = Math.max(0, r.endsAt - Date.now()); r.state = 'paused'; r.why = why; clearTimeout(roundT); }
export function roundCmd(cmd, secs) {
  const st = W(), r = st.round; if (!r || r.state === 'ended') throw new Error('No round timer going. It starts when the first spin lands.');
  if (cmd === 'pause') roundPause('you');
  else if (cmd === 'start' || cmd === 'resume') { if (r.state === 'paused' || r.state === 'armed') { if (r.state === 'armed') r.left = r.total; roundRun(); } }
  else if (cmd === 'add') { const ms = (Number(secs) || 30) * 1000; r.total = Math.max(5000, r.total + ms); if (r.state === 'running') { r.endsAt = Math.max(Date.now() + 1000, r.endsAt + ms); armRound(); } else r.left = Math.max(1000, r.left + ms); }
  else if (cmd === 'end') { if (r.state === 'running') r.left = 0; roundOut(true); return; }
  else if (cmd === 'cancel') { clearTimeout(roundT); st.round = null; sendRound(); return; }
  sendRound();
}
function roundOut(force) { // time's up!
  const st = W(), r = st.round; if (!r || r.state === 'ended') return;
  if (!force && r.state === 'running' && r.endsAt - Date.now() > 50) return armRound();
  clearTimeout(roundT); r.left = 0;
  if (spinning) { r.state = 'ending'; sendRound(); return; } // a spin is still going: whatever it lands on wins
  finalize();
}
function finalize() {
  const st = W(), r = st.round, rec = st.last; if (!r) return;
  snap('the timer ran out');
  r.state = 'ended'; r.left = 0; clearTimeout(roundT);
  if (!rec) { sendRound(); return; }
  st.final = { ...rec, at: Date.now() };
  const w = getWheel(rec.wheelId); countWin(w, rec.entryId); bump(); save();
  log({ kind: 'final', wheelId: rec.wheelId, wheelName: rec.wheelName, entryId: rec.entryId, text: rec.text, rule: rec.rule, pct: rec.pct, by: { name: '⏱️ Time ran out', source: 'timer' } });
  sendRound({ final: st.final }); hooks.broadcast(wheelMsg());
  sayW(w, `⏱️ TIME! The wheel has spoken: 🏆 ${rec.text}${rec.rule ? ' — ' + rec.rule.slice(0, 200) : ''}`);
  followLink(w, rec);
}
// ---------- 🔀 linked spots: win → spin another wheel / play a battle → come back ----------
// st.chain = where to come back to: [{ from: wheelId, to: wheelId }] or [{ from: wheelId, battle: listId }] (newest last)
const LINK_WAIT = 4000, BACK_WAIT = 8000;
let linkT = null;
function followLink(w, rec, mid = false) {
  const st = W(); st.chain ||= [];
  // mid = an ⚡ auto spot with a link, in the middle of a round: remember this wheel's paused timer for when we come back
  const keep = mid ? { round: st.round ? { ...st.round } : null, last: st.last ? { ...st.last } : null } : undefined;
  const e = w.entries.find(x => x.id === rec.entryId), go = e?.goTo;
  clearTimeout(linkT);
  if (go && !rec.voided && st.chain.length < 6) {
    if (go.kind === 'wheel') {
      const to = getWheel(go.id); if (!to || to.id === w.id) return note(`“${e.text}” links to a wheel that isn't there any more.`);
      st.chain.push({ from: w.id, to: to.id, keep }); save();
      linkT = setTimeout(() => {
        st.activeId = to.id; st.show = true; refresh(); hooks.goView('wheel');
        banner(`🔀 ${esc(e.text)}<small>Off to ${esc(to.name)}!</small>`);
        sayW(w, `🔀 ${e.text} → spinning “${to.name}”!`);
        setTimeout(() => { try { request('spin', { name: `🔀 ${e.text}`, source: 'link' }, { wheelId: to.id }); } catch (err) { note(err.message); } }, 2500);
      }, LINK_WAIT);
      return;
    }
    if (go.kind === 'cards') { // 🃏 a card battle, then back
      st.chain.push({ from: w.id, cards: go.id, keep }); save();
      linkT = setTimeout(() => {
        banner(`🔀 ${esc(e.text)}<small>Card battle time!</small>`);
        sayW(w, `🔀 ${e.text} → card battle time!`);
        const err = hooks.openCards(go.id, go.auto, e.text);
        if (err) { note(`Couldn't open the card battle: ${err}`); st.chain.pop(); save(); }
      }, LINK_WAIT);
      return;
    }
    if (go.kind === 'battle') {
      st.chain.push({ from: w.id, battle: go.id, keep }); save();
      linkT = setTimeout(() => {
        banner(`🔀 ${esc(e.text)}<small>Battle time!</small>`);
        sayW(w, `🔀 ${e.text} → battle time!`);
        const err = hooks.openBattle(go.id, go.auto, e.text);
        if (err) { note(`Couldn't open the battle: ${err}`); st.chain.pop(); save(); }
      }, LINK_WAIT);
      return;
    }
  }
  // a wheel we were sent to has its winner: go back to where we came from
  const top = st.chain[st.chain.length - 1];
  if (top?.to === w.id) linkT = setTimeout(() => linkBack(), BACK_WAIT);
}
/** Go back to the wheel we came from (after a linked wheel or battle is done). */
export function linkBack() {
  const st = W(); const top = (st.chain ||= []).pop(); if (!top) return false;
  const from = getWheel(top.from); save();
  if (!from) return false;
  if (top.keep) { // back in the middle of a round (we left from a linked ⚡ auto spot): the timer waits paused, like on any auto spot
    clearTimeout(roundT); st.round = top.keep.round; st.last = top.keep.last; st.final = null; save(); sendRound();
  }
  st.activeId = from.id; st.show = true; refresh(); hooks.goView('wheel');
  banner(`↩️ Back to ${esc(from.name)}`);
  return true;
}
export const linkWaiting = () => { const c = W().chain || []; return c[c.length - 1] || null; };
export function linkClear() { W().chain = []; clearTimeout(linkT); save(); }

// after every landing: start / pause the round timer
function landed(w, rec) {
  spinning = null;
  const st = W(); let r = st.round;
  if (!roundOn(w)) { if (!queue.length && rec.by?.source !== 'void' && rec.type !== 'void') followLink(w, rec); return; } // no round timer: where it stops is the win
  if (r?.state === 'ending') return finalize();
  if (!r || r.state === 'ended' || r.wheelId !== w.id) return; // no round going
  if (/^auto/.test(rec.type) && !queue.length && w.entries.find(x => x.id === rec.entryId)?.goTo) { // ⚡ auto spot with a link: the clock pauses and the link happens right away
    if (r.state === 'running') roundPause('auto');
    sendRound(); followLink(w, rec, true); return;
  }
  if (r.state === 'armed') { r.left = r.total; roundRun(); }
  else if (r.state === 'paused' && r.why !== 'you' && !/^auto/.test(rec.type) && rec.type !== 'countdown') roundRun(); // moved / respun off an auto or countdown spot: the clock goes again
  if (/^auto/.test(rec.type)) roundPause('auto');
  else if (rec.type === 'countdown') roundPause('countdown');
  sendRound();
}

// ---------- spinning ----------
/** kind: spin | respin | up | down. by: { name, login, source: 'you' | 'points' | 'mod' | 'bank' | 'mine' | 'void' } */
export function request(kind, by = {}, opts = {}) {
  const st = W(); if (!['spin', 'respin', 'up', 'down'].includes(kind)) throw new Error('Unknown wheel action');
  if ((kind === 'up' || kind === 'down') && !st.last) throw new Error('Spin the wheel first: there is no spot to move yet.');
  const why = blocked(kind, by.source); if (why) throw new Error(why);
  queue.push({ kind, by: { name: by.name || streamerName(), login: by.login || '', source: by.source || 'you', cost: by.cost || 0 }, wheelId: opts.wheelId || st.activeId, force: opts.force || null });
  pump();
  return { queued: queue.length, busy: Date.now() < busyUntil };
}
// spots can say "no respins with channel points" / "no respins from saved spins"; a finished round takes no more respins
function blocked(kind, source) {
  if (kind === 'spin' || source === 'void') return null;
  const st = W(), w = lastWheel();
  if (st.round?.state === 'ended' && st.round.wheelId === w?.id && roundOn(w) && ['points', 'bank', 'mine'].includes(source)) return 'the timer already ran out on this one.';
  if (kind !== 'respin') return null;
  const e = lastEntry(); if (!e || !rulesOn(w)) return null;
  if (/^auto/.test(e.type) && source !== 'you') return `“${e.text}” is an ⚡ auto spot: no respins on it.`; // (Derek: nobody can respin an auto spot; you carry on with 🎡 SPIN)
  if (source === 'points' && e.noPointRespin) return `“${e.text}” can't be respun with channel points.`;
  if (source === 'bank' && e.noBankRespin) return `“${e.text}” can't be respun with saved spins.`;
  return null;
}
// two people ask for a respin at almost the same time: the first one spins, everyone else gets a saved respin instead
let lastRespinAt = 0;
function collides(w) { const c = w?.opts?.collide; if (!c || c.on === false) return false; return spinning?.kind === 'respin' && Date.now() - lastRespinAt < (Number(c.secs) || 5) * 1000 || queue.some(j => j.kind === 'respin'); }
function pump() {
  clearTimeout(qTimer);
  if (!queue.length) return;
  const wait = busyUntil - Date.now();
  if (wait > 0) { qTimer = setTimeout(pump, wait + 50); return; }
  const job = queue.shift();
  try { run(job); } catch (e) { note(e.message); if (job.by.source === 'bank') refundBank(job.by); if (job.by.source === 'mine') { W().mine.left++; save(); } }
  if (queue.length) qTimer = setTimeout(pump, Math.max(200, busyUntil - Date.now() + 50));
}
const voidTimers = [];
function run({ kind, by, wheelId, force }) { // force = a spot id to land on (Test tab only)
  const st = W();
  let w = getWheel(wheelId) || active();
  if ((kind === 'up' || kind === 'down' || kind === 'respin') && st.last) w = getWheel(st.last.wheelId) || w; // respins and moves act on the wheel that was just spun
  const why = blocked(kind, by.source); if (why) throw new Error(why);
  const r = st.round, live = r && r.wheelId === w.id && !['ended'].includes(r.state);
  // pressing SPIN while a round is going = a respin (and it gets the timer going again after an auto / countdown spot)
  if (kind === 'spin' && live && roundOn(w) && st.last) kind = 'respin';
  // a respin gets the timer going again after an auto / countdown spot (if you paused it yourself, only you can restart it)
  if (kind === 'respin' && live && roundOn(w) && r.state === 'paused' && (r.why !== 'you' || by.source === 'you')) roundRun();
  snap(kind === 'spin' ? 'a new spin' : kind === 'respin' ? `${by.name}'s respin` : `${by.name} moved it ${kind}`);
  if (kind === 'spin') { // a fresh spin: last winner leaves (if set), finished countdowns leave, a new round timer gets ready
    const sl0 = layout(w);
    if (w.removeWinner && st.last?.wheelId === w.id) { const e = w.entries.find(x => x.id === st.last.entryId); if (e && sl0.length > 1) e.on = false; }
    for (const e of w.entries) if ((e.type === 'countdown' || e.type === 'autocount') && e.count <= 0 && e.on) e.on = false;
    if (!roundOn(w) && st.last?.wheelId === w.id) countWin(w, st.last.entryId); // no round timer: the last landing was the winner
    hideUsedUp(w);
    st.final = null; st.last = null;
    st.round = roundOn(w) ? { wheelId: w.id, state: 'armed', total: roundLen(w), left: roundLen(w), why: '' } : null;
  }
  const sl = layout(w); if (!sl.length) throw new Error(`"${w.name}" has no spots to land on.`);
  if (kind === 'up' || kind === 'down') { if (!st.last || !sl.some(s => s.e.id === st.last.entryId)) throw new Error('That spot is not on the wheel any more.'); }
  if ((kind === 'respin' || kind === 'up' || kind === 'down') && !st.last) kind = 'spin';
  const rot0 = w.rot || 0;
  let idx, to, dur, phi;
  if (kind === 'spin' || kind === 'respin') {
    const r0 = rnd() * TAU; idx = force ? sl.findIndex(s => s.e.id === force) : -1; if (idx < 0) idx = sl.findIndex(s => r0 >= s.a0 && r0 < s.a1); if (idx < 0) idx = sl.length - 1;
    const s = sl[idx]; phi = s.a0 + (s.a1 - s.a0) * (.1 + rnd() * .8); // never right on a line
    dur = Math.max(2, Math.min(60, Number(w.spinSecs) || 10)) * (kind === 'respin' ? .8 : 1);
    const turns = Math.max(2, Math.round(dur * .9 * (Number(w.opts.speed) || 1)));
    to = rot0 + turns * TAU + mod(-phi - rot0, TAU);
    if (kind === 'respin') lastRespinAt = Date.now();
  } else {
    const cur = sl.findIndex(s => s.e.id === st.last.entryId);
    idx = mod(cur + (kind === 'up' ? -1 : 1), sl.length); const s = sl[idx]; phi = (s.a0 + s.a1) / 2;
    to = rot0 + (mod(-phi - rot0 + Math.PI, TAU) - Math.PI); dur = 1.6;
  }
  const s = sl[idx], prev = st.last, rules = rulesOn(w);
  // leaving a countdown spot that already had one knocked off? give it back (not ⚡🔢 auto + countdown: an auto spot already ran when it landed)
  if (kind !== 'spin' && prev?.knocked) { const pe = getWheel(prev.wheelId)?.entries.find(e => e.id === prev.entryId); if (pe && pe.type === 'countdown') pe.count = Math.min(pe.countStart, pe.count + 1); }
  const spinId = kind === 'spin' ? uid() : prev?.spinId || uid();
  const type = rules ? s.e.type : 'timer';
  const rec = { id: uid(), at: Date.now(), wheelId: w.id, wheelName: w.name, kind, by: { ...by }, spinId, entryId: s.e.id, text: s.e.text, rule: rules ? s.e.rule || '' : '', pct: s.pct, color: s.color, spots: sl.length, type, sound: s.e.sound || '', link: s.e.link || '',
    from: kind === 'spin' ? null : prev ? { entryId: prev.entryId, text: prev.text, pct: prev.pct } : null };
  if (type === 'countdown' || type === 'autocount') { rec.countBefore = s.e.count; if (s.e.autoKnock && s.e.count > 0) { s.e.count--; rec.knocked = true; } rec.countLeft = s.e.count; }
  if (by.source === 'void' && type !== 'void') rec.voided = true;
  st.history.push(rec); if (st.history.length > 50000) st.history = st.history.slice(-50000);
  w.rot = mod(to, TAU);
  st.last = { ...rec };
  st.show = true; bump();
  spinning = { kind, at: Date.now() };
  busyUntil = Date.now() + dur * 1000 + (by.source === 'points' || by.source === 'bank' ? 4500 : 1500);
  save();
  hooks.broadcast({ type: 'wheelSpin', wheel: { ...view(w), rot: rot0 }, from: rot0, to, dur, ease: kind === 'up' || kind === 'down' ? 'inout' : 'out', kind, by: rec.by, index: idx, result: rec, round: roundView() });
  hooks.pushState();
  voidTimers.push(setTimeout(() => landed(w, rec), dur * 1000 + 100));
  if (type === 'void') voidLanded(w, s, rec, by, dur);
  else if (by.source === 'void') voidTimers.push(setTimeout(() => { // the void eats this spot for the rest of the stream
    s.e.voided = streamKey();
    log({ kind: 'void', wheelId: w.id, wheelName: w.name, entryId: s.e.id, text: s.e.text, by: { name: `${VX} The void`, source: 'void' } });
    refresh(); banner(`${VX} VOIDED!<small>${esc(s.e.text)} is gone for the rest of the stream</small>`);
    sayW(w, `${VX} The void ate “${s.e.text}”! It's off the wheel for the rest of the stream… unless someone saves it with a sub, gift sub, bits or a donation 👀`);
  }, dur * 1000 + 2200));
  if ((by.source === 'points' || by.source === 'bank') && type !== 'void') {
    const what = kind === 'respin' ? `used a ${RX} RESPIN` : kind === 'up' ? 'moved the wheel ⬆️ UP a spot' : kind === 'down' ? 'moved the wheel ⬇️ DOWN a spot' : 'spun the wheel 🎡';
    setTimeout(() => sayW(w, `🎡 ${by.name} ${what}! It landed on: ${s.e.text}${rec.rule ? ' — ' + rec.rule.slice(0, 200) : ''}`), dur * 1000 + 300);
  }
  return rec;
}

// ---------- 🕳️ the void ----------
// Lands on VOID: it respins by itself and whatever it lands on next is gone for the rest of the stream.
// Lands on VOID again while respinning: VOID grows (in [landings] times it would fill the whole wheel) and respins again.
function voidLanded(w, s, rec, by, dur) {
  const st = W(), v = w.opts.void, N = Math.max(1, Number(v.landings) || 5);
  busyUntil = Date.now() + dur * 1000 + 200;
  if (by.source === 'void') { // VOID landed on VOID: it grows
    const hits = (st.voidHits[w.id] ||= { n: 0, base: s.pct / 100, stream: streamKey() });
    if (hits.stream !== streamKey()) Object.assign(hits, { n: 0, base: s.pct / 100, stream: streamKey() });
    hits.n++;
    const share = Math.min(.985, hits.base + (1 - hits.base) * hits.n / N);
    voidTimers.push(setTimeout(() => {
      setShare(w, s.e, share);
      log({ kind: 'voidgrow', wheelId: w.id, wheelName: w.name, entryId: s.e.id, text: s.e.text, pct: Math.round(share * 1000) / 10, hits: hits.n, of: N, by: { name: `${VX} The void`, source: 'void' } });
      refresh();
      if (hits.n >= N) {
        if (v.doomsday) return doomsday(w);
        banner(`${VX} THE VOID IS FULL<small>It can't grow any more. Spin again when you're ready.</small>`); return;
      }
      banner(`${VX} THE VOID GROWS!<small>It's now ${Math.round(share * 100)}% of the wheel… and it's still hungry</small>`);
      sayW(w, `${VX} The void landed on itself and GREW to ${Math.round(share * 100)}% of the wheel! (${hits.n}/${N}) It spins again…`);
      voidTimers.push(setTimeout(() => { try { request('respin', { name: `${VX} The void`, source: 'void' }, { wheelId: w.id }); } catch (e) { note(e.message); } }, 2400));
    }, dur * 1000 + 300));
    return;
  }
  voidTimers.push(setTimeout(() => banner(`${VX} THE VOID!<small>Respinning… whatever it lands on is gone for the rest of the stream</small>`), dur * 1000 + 300));
  voidTimers.push(setTimeout(() => { try { request('respin', { name: `${VX} The void`, source: 'void' }, { wheelId: w.id }); } catch (e) { note(e.message); } }, dur * 1000 + 2600));
}
function doomsday(w) {
  const name = streamerName();
  log({ kind: 'doomsday', wheelId: w.id, wheelName: w.name, text: `${name} will return for Doomsday`, by: { name: `${VX} The void`, source: 'void' } });
  save();
  hooks.broadcast({ type: 'wheelDoom', text: `${name.toUpperCase()} WILL RETURN FOR DOOMSDAY!!!` }, 'overlay');
  hooks.broadcast({ type: 'toast', text: `${VX} DOOMSDAY: the stream ends in 15 seconds.` }, 'control');
  hooks.obsDoom().catch(e => note('OBS: ' + e.message));
}

// ---------- after it lands: knock one off ----------
export function knock(delta = -1) {
  const st = W(), e = lastEntry(); if (!e || (e.type !== 'countdown' && e.type !== 'autocount')) throw new Error('The last spot is not a countdown spot.');
  snap(delta < 0 ? `knocked one off ${e.text}` : `put one back on ${e.text}`);
  e.count = Math.max(0, Math.min(e.countStart, e.count + delta)); st.last.countLeft = e.count;
  if (delta < 0) st.last.knocked = true;
  log({ kind: 'knock', wheelId: st.last.wheelId, wheelName: st.last.wheelName, entryId: e.id, text: e.text, amount: delta, countLeft: e.count, by: { name: streamerName(), source: 'you' } });
  refresh();
  return e.count;
}

// ---------- spins people have saved up (given by you, subs, bits, collisions…) ----------
const bkey = login => norm(String(login || '').replace(/^@/, ''));
export function giveSpins(who, n, reason = '', by = {}) {
  const st = W(), name = String(who || '').replace(/^@/, '').trim(); const k = bkey(name); if (!k) throw new Error('Who gets the spins?');
  n = Math.round(Number(n) || 0); if (!n) throw new Error('How many spins?');
  const b = st.bank[k] ||= { name, login: name.toLowerCase(), spins: 0, got: 0, used: 0 };
  if (/[A-Z]/.test(name) || !b.name) b.name = name;
  b.spins = Math.max(0, b.spins + n); if (n > 0) b.got += n;
  b.log ||= []; b.log.unshift({ at: Date.now(), n, reason: String(reason || '').slice(0, 120) }); b.log = b.log.slice(0, 50);
  st.grants.push({ id: uid(), at: Date.now(), login: b.login, name: b.name, amount: n, reason: String(reason || '').slice(0, 120), by: by.name || streamerName() }); if (st.grants.length > 20000) st.grants = st.grants.slice(-20000);
  bump(); save(); hooks.pushState();
  return b.spins;
}
function refundBank(by) { const b = W().bank[bkey(by.login || by.name)]; if (b) { b.spins++; b.used = Math.max(0, b.used - 1); save(); } }
export function useMine() { // the streamer's own respins: a few per stream (3 by default), they come back when a new stream starts
  const st = W(); if (!st.last) throw new Error('Spin the wheel first.');
  if ((st.mine.left || 0) <= 0) throw new Error(`No streamer respins left this stream (you get ${st.mine.perStream} each stream).`);
  st.mine.left--; save();
  try { return { ...request('respin', { name: streamerName(), source: 'mine' }), left: st.mine.left }; } catch (e) { st.mine.left++; save(); throw e; }
}
const streamKey = () => db.stream?.startedAt || W().streamAt || (W().streamAt = Date.now());
export function newStream() { const st = W(); st.mine.left = st.mine.perStream; st.streamAt = Date.now(); st.voidHits = {}; for (const w of st.wheels) for (const e of w.entries) { e.voided = null; if (e.type === 'timermax') { e.wins = 0; if (e.maxedOff) { e.on = true; e.maxedOff = false; } } } refresh(); }
const monthKey = () => new Date().toISOString().slice(0, 7);
/** bring a voided spot back. by.source 'you' = you did it yourself (1 per month if that's on); money pop-ups don't count */
export function unvoid(entryId, by = {}, reason = '', wheelId, force) {
  const st = W(), w = getWheel(wheelId) || active(), e = w?.entries.find(x => x.id === entryId && x.voided) || w?.entries.find(x => x.voided && norm(x.text) === norm(entryId));
  if (!e) throw new Error('That spot is not voided.');
  const mine = (by.source || 'you') === 'you';
  let broke = false;
  if (mine && w.opts.void.monthly !== false) {
    if (st.bringBack.month !== monthKey()) st.bringBack = { month: monthKey(), used: 0 };
    if (st.bringBack.used >= 1) { if (!force) return { needOverride: true, text: e.text }; broke = true; }
    st.bringBack.used++;
  }
  snap(`brought back ${e.text}`);
  e.voided = null;
  log({ kind: 'unvoid', wheelId: w.id, wheelName: w.name, entryId: e.id, text: e.text, reason: String(reason || '').slice(0, 120), broke, by: { name: by.name || streamerName(), login: by.login || '', source: by.source || 'you' } });
  refresh();
  if (broke) hooks.broadcast({ type: 'wheelSiren', who: streamerName(), text: e.text }, 'overlay'); // 🚨
  else banner(`${VX} SAVED FROM THE VOID!<small>${esc(by.name || '')} brought back ${esc(e.text)}</small>`);
  return { text: e.text, broke };
}
// chat: !respin uses one of your saved spins, !myspins tells you how many you have, and "up" / "down" after a move redemption
const movers = new Map(); // login -> who redeemed "Move a spot" and is choosing up or down
const doublers = new Map(); // login -> who redeemed "Double trouble" and is typing which spot
/** ✌️ Double trouble: that spot doubles its share of the wheel (others shrink evenly; the void's size stays the same; at most 90%) */
function doubleSpot(w, e, by) {
  if (e.type === 'void') throw new Error("channel points can't change the void.");
  if (e.voided) throw new Error(`“${e.text}” is voided tonight.`);
  if (e.on === false || !(e.weight > 0)) throw new Error(`“${e.text}” isn't on the wheel right now.`);
  snap(`doubled ${e.text}`);
  const before = pctOf(w, e), voidE = w.entries.find(x => x.type === 'void' && x.on !== false && !x.voided);
  setShare(w, e, Math.min(.9, before / 100 * 2), voidE && voidE !== e ? [voidE] : []);
  const after = pctOf(w, e);
  log({ kind: 'grow', wheelId: w.id, wheelName: w.name, entryId: e.id, text: e.text, amount: Math.round((after - before) * 10) / 10, before, after, reason: 'double trouble', by: { name: by.name, login: by.login || '', source: 'points', cost: by.cost || 0 } });
  refresh();
  banner(`✌️ DOUBLE TROUBLE!<small>${esc(by.name || '')} doubled ${esc(e.text)}: ${before}% → ${after}% of the wheel</small>`);
  return { before, after };
}
export function wheelChat(m) {
  const st = W(), t = String(m.text || '').trim().toLowerCase(), cmd = t.split(/\s+/)[0];
  const dt = doublers.get(m.login);
  if (dt && t && !t.startsWith('!')) { // ✌️ they're telling us which spot to double
    const w = getWheel(dt.wheelId) || lastWheel() || active(), e = findSpot(w, m.text);
    if (!e) { sayW(w, `✌️ @${m.name} I couldn't find a spot called “${String(m.text).slice(0, 40)}”. Type part of its name (you have ${Math.max(1, Math.ceil((dt.at + 120000 - Date.now()) / 60000))} min).`); return true; }
    doublers.delete(m.login);
    try { const r = doubleSpot(w, e, { name: m.name, login: m.login, cost: dt.cost }); logRedeem(dt.r, `doubled “${e.text}” (${r.before}% → ${r.after}%)`); sayW(w, `✌️ DOUBLE TROUBLE! @${m.name} doubled “${e.text}”: now ${r.after}% of the wheel!`); }
    catch (err) { note(`${m.name}: ${err.message}`); logRedeem(dt.r, err.message); sayW(w, `✌️ Sorry @${m.name}, ${err.message} Pick another spot!`); doublers.set(m.login, dt); }
    return true;
  }
  const mv = movers.get(m.login);
  if (mv && /^(up|down)\b/.test(t)) {
    movers.delete(m.login);
    const kind = t.startsWith('up') ? 'up' : 'down';
    try { request(kind, { name: m.name, login: m.login, source: 'points', cost: mv.cost }); logRedeem(mv.r, `moved it ${kind} (typed "${t.slice(0, 10)}")`); }
    catch (e) { note(`${m.name}: ${e.message}`); logRedeem(mv.r, e.message); sayW(lastWheel(), `🎡 Sorry @${m.name}, ${e.message} 💜`); }
    return true;
  }
  if (cmd === String(st.cmd.spins || '').toLowerCase()) { const b = st.bank[bkey(m.login)]; say(b?.spins ? `🎡 @${m.name} you have ${b.spins} wheel respin${b.spins === 1 ? '' : 's'} saved up! Type ${st.cmd.respin} to use one.` : `🎡 @${m.name} you don't have any wheel respins right now — but stick around, they come your way! 💜`); return true; }
  if (cmd !== String(st.cmd.respin || '').toLowerCase()) return false;
  const b = st.bank[bkey(m.login)], lw = lastWheel();
  if (lw && lw.opts.bankRespin === false) { say(`🎡 @${m.name} saved respins can't be used on this wheel tonight — yours are safe for later! 💜`); return true; }
  if (!b || b.spins <= 0) { say(`🎡 Aw @${m.name}, you don't have any wheel respins right now! 💜 Keep hanging out and you might earn some.`); return true; }
  if (!st.last) { say(`🎡 @${m.name} hang tight, the wheel hasn't been spun yet! Your ${b.spins} respin${b.spins === 1 ? ' is' : 's are'} safe.`); return true; }
  const why = blocked('respin', 'bank'); if (why) { say(`🎡 Sorry @${m.name}, ${why} Your respin${b.spins === 1 ? ' is' : 's are'} still saved! 💜`); return true; }
  if (collides(lw)) { say(`🎡 @${m.name} someone beat you to it by a hair! Your respin is still saved (${b.spins}) 💜`); log({ kind: 'collide', wheelId: lw.id, wheelName: lw.name, text: 'Respin came in at the same time: kept for later', by: { name: m.name, login: m.login, source: 'bank' } }); bump(); return true; }
  b.spins--; b.used++; b.usedLog ||= []; b.usedLog.unshift(Date.now()); b.usedLog = b.usedLog.slice(0, 100); save();
  try { request('respin', { name: m.name, login: m.login, source: 'bank' }); say(`🎡 @${m.name} used a saved respin! ${RX} Respinning… (${b.spins} left)`); }
  catch (e) { b.spins++; b.used--; save(); say(/auto spot/.test(e.message) ? `😏 Nice try @${m.name}, sneaky sneaky! No respins on an ⚡ auto spot. Your respin is still saved for later (${b.spins}) 💜` : `🎡 @${m.name} ${e.message} Your respin is still saved.`); }
  return true;
}
// subs, gift subs, bits and donations ("money"): with the wheel on stream you get a pop-up to grow / shrink spots, give respins
// or bring back a voided spot; with the wheel off stream, the automatic spins (if set) are given.
function addBoost(b) {
  const st = W();
  if (b.kind === 'gift' && b.login) { // a gift bomb arrives one sub at a time: fold them into one pop-up
    const g = st.boosts.find(x => x.kind === 'gift' && x.login === b.login && Date.now() - x.at < 15000);
    if (g) { g.count += b.count || 1; g.suggest += b.suggest; g.title = `${g.name} gifted ${g.count} sub${g.count === 1 ? '' : 's'}!`; bump(); sendBoosts(); return; }
  }
  st.boosts.unshift({ id: uid(), at: Date.now(), count: 1, ...b }); st.boosts = st.boosts.slice(0, 50);
  bump(); save(); sendBoosts();
}
function sendBoosts() { hooks.broadcast({ type: 'wheelBoosts', boosts: W().boosts }, 'control'); }
const popWheel = () => active();
const popOn = kind => { const st = W(), w = popWheel(), p = w?.opts.pop; if (!st.show || !p?.on || !p[kind]) return false; const any = p.grow || (p.shrink) || p.spins || (p.unvoid && w.opts.void.on); return !!any; };
export function onSub(s) {
  const st = W(), a = st.auto, mult = a.tierMult ? (s.tier || 1) : 1, kind = s.kind === 'gift' ? 'gift' : 'sub';
  const per = s.kind === 'gift' ? a.giftSpins : a.subSpins, n = Math.max(1, (per || 1) * mult);
  if (popOn(kind)) return addBoost({ kind, login: s.login, name: s.name || 'Anonymous', icon: s.kind === 'gift' ? '🎁' : '⭐', title: s.kind === 'gift' ? `${s.name || 'Anonymous'} gifted a sub!` : `${s.name} ${s.kind === 'resub' ? 'resubbed' : 'subscribed'}${s.tier > 1 ? ` (tier ${s.tier})` : ''}!`, suggest: n, reason: s.kind === 'gift' ? 'gift sub' : s.kind });
  if (!s.login || !(per > 0)) return;
  giveSpins(s.name || s.login, per * mult, s.kind === 'gift' ? `gifted a sub to ${s.recipient || 'someone'}` : s.kind === 'resub' ? 'resubbed' : 'subscribed', { name: 'auto' });
  note(`${s.name} got ${per * mult} wheel respin(s) for ${s.kind === 'gift' ? 'a gift sub' : 'subbing'}.`);
}
export function onBits(c) {
  const st = W(), a = st.auto;
  if (c.bits >= (a.popBits || 1) && popOn('bits')) return addBoost({ kind: 'bits', login: c.login, name: c.name || 'Anonymous', icon: '💎', title: `${c.name || 'Anonymous'} cheered ${c.bits.toLocaleString()} bits!`, suggest: Math.max(1, a.bitsPer > 0 ? Math.floor(c.bits / a.bitsPer) * (a.bitsSpins || 1) : 1), reason: `${c.bits} bits` });
  if (!(a.bitsPer > 0) || !c.login) return;
  const n = Math.floor(c.bits / a.bitsPer) * (a.bitsSpins || 1); if (n <= 0) return;
  giveSpins(c.name || c.login, n, `cheered ${c.bits} bits`, { name: 'auto' }); note(`${c.name} got ${n} wheel respin(s) for ${c.bits} bits.`);
  say(`🎡 Thanks for the bits @${c.name}! You got ${n} wheel respin${n === 1 ? '' : 's'} — type ${st.cmd.respin} to use one.`);
}
export function onMoney({ name, amount, currency = 'USD', source = '' }) {
  const a = W().auto; amount = Number(amount) || 0; const cur = currency && currency !== 'USD' ? ` ${currency}` : '';
  if (!popOn('money')) { note(`💵 ${name} donated $${amount}${cur}${source ? ' (' + source + ')' : ''}.`); return; }
  addBoost({ kind: 'money', login: String(name || '').toLowerCase(), name: String(name || 'Someone').slice(0, 40), icon: '💵', title: `${name} donated ${cur ? amount + cur : '$' + amount.toLocaleString()}!`, suggest: Math.max(1, a.dollarsPer > 0 ? Math.floor(amount / a.dollarsPer) : 1), reason: `$${amount}${cur} donation${source ? ' (' + source + ')' : ''}` });
}
export function boostAct(id, { action, n, entryId, grows, text }) {
  const st = W(), b = st.boosts.find(x => x.id === id); if (!b) throw new Error('That pop-up is already done.');
  if (action === 'dismiss') { st.boosts = st.boosts.filter(x => x.id !== id); bump(); save(); sendBoosts(); hooks.pushState(); return { msg: '' }; }
  const money = b.kind !== 'points', by = { name: b.name, login: b.login || '', source: money ? 'auto' : 'points', cost: b.cost || 0 }, why = b.reason || b.kind; let msg = '';
  n = Math.max(1, Math.round(Number(n) || 1));
  const w = popWheel(), pick = () => { const e = (entryId && w.entries.find(x => x.id === entryId)) || findSpot(w, text, money); if (!e) throw new Error(`No spot called “${text || ''}” on this wheel.`); return e; };
  if (action === 'grow' || action === 'shrink') { const e = pick(), pct = grow(e.id, action === 'shrink' ? -n : n, by, why, w.id, money); msg = `${action === 'shrink' ? '📉 Shrunk' : '📈 Grew'} “${e.text}” for ${b.name} (now ${pct}% of the wheel).`; }
  else if (action === 'unvoid') { const r = unvoid(entryId || text, by, why, w.id); msg = `${VX} ${b.name} saved “${r.text}” from the void.`; sayW(w, `${VX} @${b.name} saved “${r.text}” from the void! It's back on the wheel 💜`); }
  else if (action === 'growMany') { const list = (grows || []).filter(g => g.n > 0); if (!list.length) throw new Error('Pick how many grows for at least one spot.'); for (const g of list) grow(g.entryId, g.n, by, why, w.id, money); msg = `📈 Grew ${list.length} spots for ${b.name}.`; }
  else if (action === 'spins') { const left = giveSpins(b.name, n, why, { name: streamerName() }); msg = `🎟️ ${b.name} got ${n} respin${n === 1 ? '' : 's'} (has ${left}).`; say(`🎡 @${b.name} thank you! You got ${n} wheel respin${n === 1 ? '' : 's'} — type ${st.cmd.respin} whenever you want to use ${n === 1 ? 'it' : 'one'}! 💜`); }
  st.boosts = st.boosts.filter(x => x.id !== id); bump(); save(); sendBoosts(); hooks.pushState();
  return { msg };
}

// ---------- growing and shrinking spots: ± 10% of the whole wheel, the other spots make room ----------
// While the 🕳️ VOID is on the wheel it keeps its size when others change, and only money can grow or shrink it.
function shares(w) { const sl = layout(w), tot = sl.reduce((a, s) => a + s.e.weight, 0) || 1; return { sl, tot }; }
function setShare(w, e, share, frozen = []) {
  const { sl, tot } = shares(w);
  const fixed = sl.filter(s => s.e !== e && frozen.includes(s.e)).reduce((a, s) => a + s.e.weight, 0);
  const others = sl.filter(s => s.e !== e && !frozen.includes(s.e)), oTot = others.reduce((a, s) => a + s.e.weight, 0);
  const room = 1 - fixed / tot; share = Math.max(.005, Math.min(room - .005 * Math.max(1, others.length), share));
  if (!others.length) return;
  const want = share * tot, left = tot - fixed - want;
  e.weight = Math.round(want * 10000) / 10000;
  for (const s of others) s.e.weight = Math.max(.0001, Math.round(s.e.weight / (oTot || 1) * left * 10000) / 10000);
}
const pctOf = (w, e) => { const { tot } = shares(w); return Math.round(e.weight / tot * 1000) / 10; };
export function grow(entryId, amount = 1, by = {}, reason = '', wheelId, money) {
  const st = W(), w = getWheel(wheelId) || (st.last && getWheel(st.last.wheelId)?.entries.some(e => e.id === entryId) ? getWheel(st.last.wheelId) : active());
  const e = w?.entries.find(x => x.id === entryId); if (!e) throw new Error('No such spot.');
  if (e.voided) throw new Error(`“${e.text}” is voided. Bring it back first.`);
  if (e.type === 'void' && !money && by.source && !['you', 'mod'].includes(by.source)) throw new Error('Only money (subs, gift subs, bits, donations) or the streamer can grow or shrink the VOID.');
  if (!e.on || !(e.weight > 0)) { e.on = true; e.weight = e.weight > 0 ? e.weight : 1; }
  snap(`${amount > 0 ? 'grew' : 'shrank'} ${e.text}`);
  const before = pctOf(w, e), step = (Number(w.opts.growPct) || 10) / 100;
  const voidE = w.entries.find(x => x.type === 'void' && x.on !== false && !x.voided);
  setShare(w, e, before / 100 + amount * step, voidE && voidE !== e ? [voidE] : []);
  const after = pctOf(w, e);
  log({ kind: 'grow', wheelId: w.id, wheelName: w.name, entryId: e.id, text: e.text, amount: Math.round((after - before) * 10) / 10, before, after, reason: String(reason || '').slice(0, 120), by: { name: by.name || streamerName(), login: by.login || '', source: by.source || 'you', cost: by.cost || 0 } });
  refresh();
  if (by.source === 'points' || by.source === 'auto') banner(amount > 0 ? `📈 ${esc(e.text)} GREW!<small>${esc(by.name || '')} made it ${after}% of the wheel</small>` : `📉 ${esc(e.text)} SHRANK!<small>${esc(by.name || '')} made it ${after}% of the wheel</small>`);
  return after;
}
export function resetSizes(wheelId) {
  const w = getWheel(wheelId) || active(); const before = w.entries.map(e => ({ id: e.id, weight: e.weight }));
  snap('reset all sizes');
  for (const e of w.entries) e.weight = e.type === 'void' ? (w.opts.void.weight || 1) : 1;
  w.sizeBackup = { at: Date.now(), before };
  log({ kind: 'reset', wheelId: w.id, wheelName: w.name, text: 'All spots back to the same size', by: { name: streamerName(), source: 'you' } });
  refresh();
}
export function undoReset(wheelId) { const w = getWheel(wheelId) || active(); if (!w.sizeBackup) throw new Error('Nothing to undo.'); for (const b of w.sizeBackup.before) { const e = w.entries.find(x => x.id === b.id); if (e) e.weight = b.weight; } w.sizeBackup = null; refresh(); }
// match a typed spot name (pop-ups)
function findSpot(w, text, withVoid) {
  const raw = String(text || '').trim(), q = norm(raw); if (!q || !w) return null;
  const on = w.entries.filter(e => e.text && (withVoid || e.type !== 'void'));
  if (/^#?\d+$/.test(raw)) { const i = Number(raw.replace('#', '')) - 1; if (on[i]) return on[i]; } // "3" = the 3rd spot
  const hit = on.find(e => norm(e.text) === q) || on.find(e => norm(e.text).startsWith(q)) || on.find(e => norm(e.text).includes(q)) || on.find(e => q.includes(norm(e.text)) && norm(e.text).length > 2);
  if (hit) return hit;
  const words = raw.toLowerCase().split(/\W+/).filter(x => x.length > 2); let best = null, bs = 0; // most words in common
  for (const e of on) { const t = e.text.toLowerCase(), sc = words.filter(x => t.includes(x)).length; if (sc > bs) { bs = sc; best = e; } }
  return bs ? best : null;
}
export const findSpotIn = (wheelId, text) => findSpot(getWheel(wheelId) || active(), text);

// channel points: returns true if it was one of the wheel rewards. Every wheel redemption also goes in the wheel history.
function logRedeem(r, result) { const st = W(); log({ kind: 'redeem', wheelId: lastWheel()?.id, wheelName: lastWheel()?.name, text: r.title, input: r.input || '', result, by: { name: r.name, login: r.login, source: 'points', cost: r.cost || 0 } }); bump(); }
export function wheelRedeem(r) {
  const st = W();
  const kind = r.testKind || Object.entries(st.rewards).find(([, t]) => t && norm(t) === norm(r.title))?.[0]; // (testKind: 🧪 pretend redeems work even before the reward exists on Twitch)
  const logIt = result => { st.redeemLog.unshift({ at: Date.now(), title: r.title, name: r.name, input: r.input || '', cost: r.cost || 0, result }); st.redeemLog = st.redeemLog.slice(0, 60); if (kind) logRedeem(r, result); bump(); };
  if (!kind) { logIt('not a wheel reward'); return false; }
  if (st.pointsOn === false) { logIt('wheel channel points are switched off'); return false; }
  const giveBack = msg => { note(msg + ' (refund it in your Twitch reward queue if you want)'); logIt(msg); }; // refunds are yours to do on Twitch
  const cost = r.cost || st.costs?.[kind] || 0, wh = lastWheel();
  if (wh.opts.points[kind] === false) { giveBack(`${r.name} redeemed "${r.title}" but that's off for “${wh.name}”.`); sayW(wh, `🎡 Sorry @${r.name}, that one is turned off for this wheel 💜`); return true; }
  if (kind === 'grow' || kind === 'shrink') { // you pick the spot (type it in the pop-up), chat doesn't
    addBoost({ kind: 'points', only: kind, login: r.login, name: r.name, icon: kind === 'grow' ? '📈' : '📉', title: `${r.name} redeemed “${r.title}” — pick a spot to ${kind}`, suggest: 1, reason: 'channel points', cost });
    logIt(`waiting for you to pick the spot to ${kind}`); return true;
  }
  if (kind === 'double') { // ✌️ they type which spot in chat
    doublers.set(r.login, { r, cost, at: Date.now(), wheelId: wh.id });
    setTimeout(() => { if (doublers.get(r.login)?.r === r) { doublers.delete(r.login); logIt('never typed a spot'); note(`${r.name} redeemed Double trouble but never typed a spot.`); } }, 120000);
    logIt('waiting for them to type a spot'); sayW(wh, `✌️ @${r.name} DOUBLE TROUBLE! Type the spot you want to double in chat (part of its name is fine). You have 2 minutes!`); return true;
  }
  if (kind === 'stop') { // 🛑 the round ends now: the spot it's on has to be done
    const rd = st.round;
    if (!st.last || !rd || rd.state === 'ended' || rd.wheelId !== wh.id) { giveBack(`${r.name} redeemed Force stop but no round is going.`); sayW(wh, `🛑 @${r.name} there's no round going right now to stop! 💜`); return true; }
    const what = st.last.text; logIt(`force stopped the round on “${what}”`);
    banner(`🛑 FORCE STOP!<small>${esc(r.name)} stopped the round: ${esc(what)} has to be done!</small>`);
    sayW(wh, `🛑 FORCE STOP! @${r.name} ended the round: “${what}” has to be done!`);
    roundCmd('end'); return true;
  }
  if ((kind === 'up' || kind === 'down' || kind === 'move') && !st.last) { giveBack(`${r.name} redeemed "${r.title}" but nothing has been spun yet.`); return true; }
  if (kind === 'move') { // they type "up" or "down" in chat
    movers.set(r.login, { r, cost, at: Date.now() });
    setTimeout(() => { if (movers.get(r.login)?.r === r) { movers.delete(r.login); logIt('never typed up or down'); note(`${r.name} redeemed a move but never typed up or down.`); } }, 120000);
    logIt('waiting for them to type up or down'); sayW(wh, `🎡 @${r.name} type UP or DOWN in chat to move the wheel! ⬆️⬇️`); return true;
  }
  if (kind === 'respin' && collides(wh)) { // someone beat them to it: it becomes a saved respin
    const left = giveSpins(r.name, 1, 'respin redeemed at the same time as someone else', { name: 'auto' });
    logIt(`came in at the same time as another respin: saved for later (has ${left})`);
    sayW(wh, `🎡 @${r.name} someone beat you to it by a hair! Your respin is saved for later — type ${st.cmd.respin} when you want it (${left} saved) 💜`); return true;
  }
  try { request(kind, { name: r.name, login: r.login, source: 'points', cost }); logIt(kind); }
  catch (e) {
    if (/auto spot/.test(e.message) && kind === 'respin') { const left = giveSpins(r.name, 1, 'respin redeemed on an auto spot', { name: 'auto' }); logIt(`landed on an auto spot: saved for later (has ${left})`); sayW(wh, `😏 Nice try @${r.name}, sneaky sneaky! No respins on an ⚡ auto spot, so no spin for you right now… but one has been added to your account for the future 💜 Type ${st.cmd.respin} when you want it (${left} saved)`); return true; }
    if (/ran out/.test(e.message) && kind === 'respin') { const left = giveSpins(r.name, 1, 'respin redeemed after the timer ran out', { name: 'auto' }); logIt(`the timer had run out: saved for later (has ${left})`); sayW(wh, `🎡 @${r.name} the timer already ran out! Your respin is saved for next time — type ${st.cmd.respin} when you want it 💜`); return true; }
    giveBack(`${r.name}: ${e.message}`); sayW(wh, `🎡 Sorry @${r.name}, ${e.message} 💜`);
  }
  return true;
}

// spot pictures / sounds from imports (data: URLs) are saved as files
export function saveDataUrl(u, prefix = 'wheel') {
  const m = String(u || '').match(/^data:([\w/+.-]+);base64,(.+)$/); if (!m) return /^https?:\/\//.test(u || '') ? u : '';
  const ext = ({ 'image/png': 'png', 'image/jpeg': 'jpg', 'image/gif': 'gif', 'image/webp': 'webp', 'image/svg+xml': 'svg', 'audio/mpeg': 'mp3', 'audio/mp3': 'mp3', 'audio/wav': 'wav', 'audio/ogg': 'ogg' })[m[1]] || 'bin';
  const file = `${prefix}-${uid()}.${ext}`; try { fs.writeFileSync(path.join(UPLOADS, file), Buffer.from(m[2], 'base64')); return '/uploads/' + file; } catch { return ''; }
}

// ---------- importing (Wheel of Names .wheel files / JSON, share links, or pasted text) ----------
function wheelFromJson(j) {
  let best = null;
  const walk = (v, d, up) => {
    if (d > 8 || !v || typeof v !== 'object') return;
    if (Array.isArray(v)) {
      const items = v.filter(o => o && typeof o === 'object' && (typeof o.text === 'string' || typeof o.name === 'string' || typeof o.label === 'string'));
      if (items.length && (!best || items.length > best.items.length)) best = { items, cfg: up };
      for (const x of v) walk(x, d + 1, up); return;
    }
    for (const [, x] of Object.entries(v)) walk(x, d + 1, v);
  };
  walk(j, 0, j);
  if (!best) return null;
  const cfg = best.cfg || {}, root = j.wheelConfig || j.config || j, C = k => root[k] ?? cfg[k];
  const pal = (C('colorSettings') || []).filter(c => c && c.enabled !== false && /^#[0-9a-f]{6}$/i.test(c.color || '')).map(c => c.color);
  const strip = s => String(s ?? '').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').trim();
  const pic = v => typeof v === 'string' && /^(data:image\/|https?:\/\/)/.test(v) ? saveDataUrl(v, 'won') : '';
  const look = {}, opts = {};
  // everything Wheel of Names keeps: pictures, background, colors, sounds on/off, confetti, remove winner, speed
  const hub = pic(C('customPictureDataUri')) || pic(C('pictureDataUri')) || pic(C('centerImage')); if (hub) look.hubImage = hub;
  if (C('pictureType') === 'text' && C('centerText')) look.hub = strip(C('centerText')).slice(0, 4);
  const cover = pic(C('customCoverImageDataUri')) || pic(C('coverImageDataUri')) || pic(C('backgroundImageDataUri')); if (cover) look.bgImage = cover;
  if (/^#[0-9a-f]{6}$/i.test(C('pageBackgroundColor') || '')) look.bg = C('pageBackgroundColor');
  if (C('drawOutlines') === false) look.lines = 'transparent';
  if (C('launchConfetti') === false) opts.confetti = false;
  if (C('duringSpinSound') === 'no-sound' || C('duringSpinSoundVolume') === 0) opts.ticks = false;
  if (C('afterSpinSound') === 'no-sound' || C('afterSpinSoundVolume') === 0) opts.winSound = false;
  if (C('slowSpin')) opts.speed = .6;
  return {
    title: strip(C('title') || ''), spinSecs: Number(C('spinTime')) || undefined, palette: pal.length ? pal : null, removeWinner: !!C('autoRemoveWinner'), look, opts,
    entries: best.items.map(o => ({ text: strip(o.text ?? o.name ?? o.label), weight: Number(o.weight) > 0 ? Number(o.weight) : 1, color: o.color, on: o.enabled !== false, image: pic(o.image) || pic(o.imageDataUri), rule: strip(o.message || '') })).filter(e => e.text || e.image).map(e => ({ ...e, text: e.text || 'Picture' }))
  };
}
export async function importWheel({ url, text, name }) {
  let got = null;
  const t = String(text || '').replace(/^﻿/, '').trim();
  if (t && /^[[{]/.test(t)) { try { got = wheelFromJson(JSON.parse(t)); } catch {} }
  if (!got && t) got = { entries: t.split(/\r?\n/).map(l => l.trim()).filter(Boolean).map(l => { const m = l.match(/^(.*?)\s+x(\d+(?:\.\d+)?)$/i); return m ? { text: m[1], weight: Number(m[2]) } : { text: l }; }) };
  if (!got && url) {
    let u = String(url).trim(); if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
    const p = new URL(u), id = p.pathname.replace(/^\/+|\/+$/g, '').split('/').pop();
    if (/wheelofnames\.com$/i.test(p.hostname) && id) {
      const key = (db.settings.wheelOfNamesKey || '').trim(), h = key ? { 'x-api-key': key } : {};
      for (const href of [`https://wheelofnames.com/api/v1/wheels/shared/${encodeURIComponent(id)}`, `https://wheelofnames.com/api/v1/wheels/${encodeURIComponent(id)}`, `https://wheelofnames.com/api/v2/wheels/${encodeURIComponent(id)}`]) {
        try { const r = await fetch(href, { headers: { Accept: 'application/json', 'User-Agent': 'MovieRoyal', ...h }, signal: AbortSignal.timeout(10000) }); if (!r.ok) continue; got = wheelFromJson(await r.json()); if (got?.entries.length) break; } catch {}
      }
    }
    if (!got?.entries?.length) got = { entries: (await importLink(u)).map(i => ({ text: i.label, weight: i.weight })) };
  }
  if (!got?.entries?.length) throw new Error('Nothing to import. Paste a Wheel of Names share link, open a .wheel / .json file, or paste the entries (one per line).');
  const w = newWheel(name || got.title || 'Imported wheel', got.entries, { title: got.title || '', ...(got.spinSecs ? { spinSecs: Math.min(60, Math.max(2, got.spinSecs)) } : {}), palette: got.palette || null, removeWinner: !!got.removeWinner, look: { ...DEF_LOOK, ...(got.look || {}) }, opts: mergeOpts(got.opts) });
  W().wheels.push(w); W().activeId = w.id; save();
  return w;
}

// ---------- stats ----------
export function wheelStats({ wheelId = 'all', since = 0, until = 0 } = {}) {
  const st = W();
  const all = st.history.filter(r => (wheelId === 'all' || r.wheelId === wheelId) && r.at >= since && (!until || r.at < until));
  const recs = all.filter(r => ['spin', 'respin', 'up', 'down'].includes(r.kind));
  const finals = new Map(); for (const r of recs) finals.set(r.spinId, r); // the last thing that happened in each spin is where it ended up
  const finalIds = new Set([...finals.values()].map(r => r.id));
  const ents = new Map(), ppl = new Map(), nights = new Set();
  const E = (id, text, wheelName) => { const k = norm(text) || id; if (!ents.has(k)) ents.set(k, { text, wheels: new Set(), grows: 0, grownBy: 0, landed: 0, firstHits: 0, respunAway: 0, movedAway: 0, movedTo: 0, respinHits: 0, pctSum: 0, pctN: 0, last: 0 }); const e = ents.get(k); e.text = text; e.wheels.add(wheelName); return e; };
  const P = by => { const k = by.source === 'you' && !by.login ? '§you' : norm(by.login || by.name); if (!ppl.has(k)) ppl.set(k, { name: by.source === 'you' && !by.login ? `${by.name} (you)` : by.name, grows: 0, given: 0, saved: 0, mine: 0, spins: 0, respins: 0, ups: 0, downs: 0, points: 0, spent: 0, last: 0 }); return ppl.get(k); };
  for (const r of recs) {
    nights.add(new Date(r.at).toDateString());
    const e = E(r.entryId, r.text, r.wheelName); e.pctSum += r.pct; e.pctN++; e.last = Math.max(e.last, r.at);
    if (r.kind === 'spin') e.firstHits++;
    if (r.kind === 'respin') e.respinHits++;
    if (r.kind === 'up' || r.kind === 'down') e.movedTo++;
    if (finalIds.has(r.id)) e.landed++;
    if (r.from) { const f = E(r.from.entryId, r.from.text, r.wheelName); if (r.kind === 'respin') f.respunAway++; else f.movedAway++; }
    const p = P(r.by || {}); p.last = Math.max(p.last, r.at);
    if (r.kind === 'spin') p.spins++; else if (r.kind === 'respin') p.respins++; else if (r.kind === 'up') p.ups++; else p.downs++;
    if (r.by?.source === 'points') { p.points++; p.spent += r.by.cost || 0; }
    if (r.by?.source === 'bank') p.saved++;
    if (r.by?.source === 'mine') p.mine++;
  }
  for (const r of all) if (r.kind === 'void') { E(r.entryId, r.text, r.wheelName).voided = (E(r.entryId, r.text, r.wheelName).voided || 0) + 1; }
  for (const r of all) if (r.kind === 'redeem') { const p = P(r.by || {}); p.redeems = (p.redeems || 0) + 1; }
  for (const r of all) if (r.kind === 'grow') { const e = E(r.entryId, r.text, r.wheelName); e.grows++; e.grownBy += r.amount || 0; const p = P(r.by || {}); p.grows++; if (r.by?.source === 'points') { p.points++; p.spent += r.by.cost || 0; } }
  for (const g of st.grants) if (g.at >= since && (!until || g.at < until) && g.amount > 0) { const p = P({ name: g.name, login: g.login }); p.given += g.amount; }
  const count = k => recs.filter(r => r.kind === k).length;
  return {
    totals: { grows: all.filter(r => r.kind === 'grow').length, refunds: all.filter(r => r.kind === 'refund').reduce((a, r) => a + (r.count || 0), 0), saved: recs.filter(r => r.by?.source === 'bank').length, mine: recs.filter(r => r.by?.source === 'mine').length, spins: count('spin'), respins: count('respin'), ups: count('up'), downs: count('down'), points: recs.filter(r => r.by?.source === 'points').length, nights: nights.size, all: st.history.length, first: st.history[0]?.at || null },
    entries: [...ents.values()].map(e => ({ ...e, wheels: [...e.wheels].join(', '), avgPct: e.pctN ? Math.round(e.pctSum / e.pctN * 100) / 100 : 0, pctSum: undefined, pctN: undefined })),
    people: [...ppl.values()].map(p => ({ ...p, total: p.spins + p.respins + p.ups + p.downs, bank: W().bank[norm(p.name.replace(/ \(you\)$/, ''))]?.spins || 0 }))
  };
}
export function history({ wheelId = 'all', limit = 2000 } = {}) {
  const h = W().history; const out = [];
  for (let i = h.length - 1; i >= 0 && out.length < limit; i--) if (wheelId === 'all' || h[i].wheelId === wheelId) out.push(h[i]);
  return out;
}
export const REWARD_INFO = {
  respin: { prompt: 'Respin the wheel! Whatever it landed on is out, it spins again.', color: '#FF4F6D' },
  up: { prompt: 'Move the wheel up one spot from where it landed.', color: '#5CE1A7' },
  down: { prompt: 'Move the wheel down one spot from where it landed.', color: '#4FC3FF' },
  move: { prompt: 'Move the wheel one spot! After you redeem, type UP or DOWN in chat.', color: '#46D6C7' },
  grow: { prompt: 'Make a spot on the wheel bigger! (the streamer picks which)', color: '#FFB547' },
  shrink: { prompt: 'Make a spot on the wheel smaller! (the streamer picks which)', color: '#7C6CFF' },
  double: { prompt: 'Double trouble! Pick any spot on the wheel and it doubles in size. After you redeem, type the spot in chat.', color: '#FF7A1A' },
  stop: { prompt: 'Force stop! The round ends right now: whatever spot the wheel is on has to be done.', color: '#E0245E' }
};

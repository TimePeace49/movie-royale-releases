// 🎡 The Wheel: a full Wheel of Names replacement inside Movie Royal.
// Many saved wheels, sized spots (weights), colors, a rule per spot, spins shown on the battle screen,
// channel point respins / move-up / move-down, and full history + stats (who spun, when, the spot's size when it hit).
import crypto from 'crypto';
import { db, save, uid, norm, streamerName } from './store.js';
import { importLink } from './importer.js';

const TAU = Math.PI * 2;
const GX = '<img class="gx" src="gauntlet.svg">'; // the VOID's golden gauntlet
const mod = (a, n) => ((a % n) + n) % n;
const rnd = () => crypto.randomInt(0, 1e9) / 1e9;
export const PAL = ['#ff4f6d', '#ffb547', '#ffe066', '#5ce1a7', '#4fc3ff', '#7c6cff', '#ff7ad9', '#46d6c7', '#ff8a4c', '#a4e05a', '#5d8bff', '#e05ad0'];
const REWARDS = { respin: 'Wheel: Respin', up: 'Wheel: Move up a spot', down: 'Wheel: Move down a spot', grow: 'Wheel: Grow a spot', shrink: 'Wheel: Shrink a spot' };
// every wheel has its own settings (shrink + void are off until you turn them on)
export const DEF_OPTS = { speed: 1, confetti: true, ticks: true, recent: true, showPct: true, chat: true, bankRespin: true, growStep: 1,
  points: { respin: true, up: true, down: true, grow: true, shrink: false },
  void: { on: false, label: 'VOID', weight: 1, color: '#0b0b12' },
  pop: { on: true, sub: true, gift: true, bits: true, money: true, grow: true, shrink: false, spins: true, unvoid: true } };
const mergeOpts = o => ({ ...DEF_OPTS, ...(o || {}), points: { ...DEF_OPTS.points, ...(o?.points || {}) }, void: { ...DEF_OPTS.void, ...(o?.void || {}) }, pop: { ...DEF_OPTS.pop, ...(o?.pop || {}) } });
export const TYPES = { normal: '🎯 Normal', timer: '⏱️ Timer', auto: '⚡ Auto', countdown: '🔢 Countdown', void: '🧤 Void' };
const DEF_LOOK = { bg: '', bgImage: '', rim: '#2a1846', bulbs: true, pointer: '#ffffff', hub: '🎡', hubImage: '', lines: '#ffffff', font: 'Inter', textScale: 1, textColor: '' };

export function W() {
  const w = db.wheel ||= {};
  w.wheels ||= []; w.history ||= []; w.rewards = { ...REWARDS, ...(w.rewards || {}) }; w.costs = { respin: 1000, up: 500, down: 500, grow: 2000, shrink: 2000, ...(w.costs || {}) };
  w.pointsOn ??= true; w.show ??= false; w.bank ||= {}; w.grants ||= [];
  w.mine ||= { perStream: 3, left: 3 }; w.cmd = { respin: '!respin', spins: '!myspins', ...(w.cmd || {}) }; if (w.cmd.spins === '!spins') w.cmd.spins = '!myspins';
  w.redeemLog ||= [];
  w.auto = { subSpins: 1, giftSpins: 1, bitsPer: 500, bitsSpins: 1, dollarsPer: 5, popBits: 100, tierMult: true, ...(w.auto || {}) };
  w.boosts ||= [];
  w.growStep ??= 1;
  if (!w.wheels.length) w.wheels.push(newWheel('My wheel', ['Spot 1', 'Spot 2', 'Spot 3', 'Spot 4', 'Spot 5', 'Spot 6'].map(t => ({ text: t }))));
  for (const x of w.wheels) { x.look = { ...DEF_LOOK, ...(x.look || {}) }; x.opts = mergeOpts(x.opts); if (/VOID/.test(x.opts.void.label) && x.opts.void.label !== 'VOID' && x.opts.void.label.replace(/[^A-Z]/g, '') === 'VOID') x.opts.void.label = 'VOID'; if (x.opts.growStep == null) x.opts.growStep = w.growStep ?? 1; }
  if (!w.wheels.some(x => x.id === w.activeId)) w.activeId = w.wheels[0].id;
  return w;
}
export function newWheel(name, entries = [], extra = {}) {
  return { id: uid(), name: String(name || 'New wheel').slice(0, 80), title: '', createdAt: Date.now(), spinSecs: 10, removeWinner: false, rot: 0, palette: null, look: { ...DEF_LOOK }, ...extra, entries: entries.map(cleanEntry) };
}
const num = (v, d, lo, hi) => { const n = Number(v); return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : d; };
export function cleanEntry(e) {
  const type = TYPES[e.type] ? e.type : 'normal'; // (old 💸 refund spots become normal spots: refunds are done by hand on Twitch)
  const out = { id: e.id || uid(), text: String(e.text ?? e.label ?? '').slice(0, 200), weight: e.weight === 0 || e.weight === '0' ? 0 : num(e.weight, 1, 0, 100000) || 1, color: /^#[0-9a-f]{6}$/i.test(e.color || '') ? e.color : null,
    rule: String(e.rule || '').slice(0, 2000), on: e.on !== false && e.enabled !== false, type, voided: e.voided || null, image: /^(\/uploads\/[\w.-]+|https?:\/\/\S+)$/.test(e.image || '') ? e.image : '',
    noPointRespin: !!e.noPointRespin, noBankRespin: !!e.noBankRespin };
  if (type === 'timer') out.timerMins = num(e.timerMins, 5, .1, 600);
  if (type === 'countdown') { out.countStart = Math.round(num(e.countStart, 3, 1, 100000)); out.count = Math.round(num(e.count ?? out.countStart, out.countStart, 0, 100000)); out.autoKnock = e.autoKnock !== false; }
  if (type === 'refund') { out.refundUnder = Math.round(num(e.refundUnder, 10000, 1, 10000000)); out.autoRefund = !!e.autoRefund; }
  return out;
}
const active = () => W().wheels.find(x => x.id === W().activeId);
// the optional 🧤 VOID spot lives on the wheel as a normal-looking spot
export function syncVoid(w) {
  const v = w.opts.void, has = w.entries.find(e => e.type === 'void');
  if (v.on && !has) w.entries.push(cleanEntry({ id: 'void-' + w.id, text: v.label || 'VOID', image: '/gauntlet.svg', type: 'void', weight: v.weight || 1, color: v.color || '#0b0b12', rule: 'Respins! Whatever it lands on next is gone for the rest of the stream.' }));
  else if (!v.on && has) w.entries = w.entries.filter(e => e.type !== 'void');
  else if (has) { if (!has.image) has.image = '/gauntlet.svg'; has.text = v.label || has.text; has.color = v.color || has.color; has.weight = v.weight || has.weight; }
}
export const getWheel = id => W().wheels.find(x => x.id === id);
function layout(w) {
  const on = w.entries.filter(e => e.on !== false && e.weight > 0 && !e.voided), tot = on.reduce((a, e) => a + e.weight, 0) || 1; let a = 0;
  return on.map((e, i) => { const s = { e, i, a0: a, a1: a + e.weight / tot * TAU, pct: Math.round(e.weight / tot * 10000) / 100, color: e.color || (w.palette || PAL)[i % (w.palette || PAL).length] }; a = s.a1; return s; });
}
// what the screens need to draw it (colors filled in so both screens match)
export const view = w => w && ({ id: w.id, name: w.name, title: w.title, rot: w.rot || 0, spinSecs: w.spinSecs, look: w.look, opts: { confetti: w.opts.confetti, ticks: w.opts.ticks, recent: w.opts.recent, showPct: w.opts.showPct }, voidOn: !!w.opts.void.on, voided: w.entries.filter(e => e.voided).map(e => e.text), entries: layout(w).map(s => ({ id: s.e.id, text: s.e.text, weight: s.e.weight, color: s.color, rule: s.e.rule, image: s.e.image, type: s.e.type, count: s.e.count, timerMins: s.e.timerMins })) });

let hooks = { broadcast: () => {}, pushState: () => {}, say: async () => {}, refund: async () => ({ count: 0, points: 0 }), cancel: async () => {} };
let busyUntil = 0; const queue = []; let qTimer = null;
export function initWheel(h) { hooks = { ...hooks, ...h }; W(); }
const mineName = () => `${streamerName()}'s spins`;
export function wheelMsg() { const w = W(), a = active(); return { type: 'wheel', show: w.show, wheel: view(a), last: w.last && w.last.wheelId === a?.id ? w.last : null, timer: timerView(), mine: { name: mineName(), left: w.mine.left, per: w.mine.perStream } }; }
export function setShow(on) { W().show = !!on; save(); hooks.broadcast(wheelMsg()); hooks.pushState(); }
const bump = () => { const st = W(); st.ver = (st.ver || 0) + 1; };
const note = text => hooks.broadcast({ type: 'toast', text: '🎡 ' + text }, 'control');
function log(rec) { const st = W(); st.history.push({ id: uid(), at: Date.now(), ...rec }); if (st.history.length > 50000) st.history = st.history.slice(-50000); }
const lastEntry = () => { const st = W(); if (!st.last) return null; return getWheel(st.last.wheelId)?.entries.find(e => e.id === st.last.entryId) || null; };

// ---------- spinning ----------
/** kind: spin | respin | up | down. by: { name, login, source: 'you' | 'points' | 'mod' | 'bank' | 'mine' } */
export function request(kind, by = {}, opts = {}) {
  const w = W(); if (!['spin', 'respin', 'up', 'down'].includes(kind)) throw new Error('Unknown wheel action');
  if ((kind === 'up' || kind === 'down') && !w.last) throw new Error('Spin the wheel first: there is no spot to move yet.');
  const why = blocked(kind, by.source); if (why) throw new Error(why);
  queue.push({ kind, by: { name: by.name || streamerName(), login: by.login || '', source: by.source || 'you', cost: by.cost || 0, redemption: by.redemption || null }, wheelId: opts.wheelId || w.activeId });
  pump();
  return { queued: queue.length, busy: Date.now() < busyUntil };
}
// spots can say "no respins with channel points" / "no respins from given spins"
function blocked(kind, source) {
  if (kind !== 'respin') return null;
  const e = lastEntry(); if (!e) return null;
  if (source === 'points' && e.noPointRespin) return `“${e.text}” can't be respun with channel points.`;
  if (source === 'bank' && e.noBankRespin) return `“${e.text}” can't be respun with saved spins.`;
  return null;
}
function pump() {
  clearTimeout(qTimer);
  if (!queue.length) return;
  const wait = busyUntil - Date.now();
  if (wait > 0) { qTimer = setTimeout(pump, wait + 50); return; }
  const job = queue.shift();
  try { run(job); } catch (e) { note(e.message); if (job.by.source === 'bank') refundBank(job.by); if (job.by.source === 'mine') { W().mine.left++; save(); } }
  if (queue.length) qTimer = setTimeout(pump, Math.max(200, busyUntil - Date.now() + 50));
}
function run({ kind, by, wheelId }) {
  const st = W();
  let w = getWheel(wheelId) || active();
  if ((kind === 'up' || kind === 'down' || kind === 'respin') && st.last) w = getWheel(st.last.wheelId) || w; // respins and moves act on the wheel that was just spun
  const why = blocked(kind, by.source); if (why) throw new Error(why);
  if (kind === 'spin') { // a fresh spin: last spin's winner leaves (if set), finished countdowns leave
    const sl0 = layout(w);
    if (w.removeWinner && st.last?.wheelId === w.id) { const e = w.entries.find(x => x.id === st.last.entryId); if (e && sl0.length > 1) e.on = false; }
    for (const e of w.entries) if (e.type === 'countdown' && e.count <= 0 && e.on) e.on = false;
    stopTimer(true);
  }
  const sl = layout(w); if (!sl.length) throw new Error(`"${w.name}" has no spots to land on.`);
  if (kind === 'up' || kind === 'down') { if (!st.last || !sl.some(s => s.e.id === st.last.entryId)) throw new Error('That spot is not on the wheel any more.'); }
  if ((kind === 'respin' || kind === 'up' || kind === 'down') && !st.last) kind = 'spin';
  const rot0 = w.rot || 0;
  let idx, to, dur, phi;
  if (kind === 'spin' || kind === 'respin') {
    const pickIdx = () => { const r = rnd() * TAU; const i = sl.findIndex(s => r >= s.a0 && r < s.a1); return i < 0 ? sl.length - 1 : i; };
    idx = pickIdx();
    if (by.source === 'void') for (let k = 0; k < 60 && sl[idx].e.type === 'void'; k++) idx = pickIdx(); // the void never voids itself
    if (by.source === 'void' && sl[idx].e.type === 'void') idx = sl.findIndex(s => s.e.type !== 'void');
    if (idx < 0) throw new Error('Nothing left on the wheel for the void to eat.');
    const s = sl[idx]; phi = s.a0 + (s.a1 - s.a0) * (.1 + rnd() * .8); // never right on a line
    dur = Math.max(2, Math.min(60, Number(w.spinSecs) || 10)) * (kind === 'respin' ? .8 : 1);
    const turns = Math.max(2, Math.round(dur * .9 * (Number(w.opts.speed) || 1)));
    to = rot0 + turns * TAU + mod(-phi - rot0, TAU);
  } else {
    const cur = sl.findIndex(s => s.e.id === st.last.entryId);
    idx = mod(cur + (kind === 'up' ? -1 : 1), sl.length); const s = sl[idx]; phi = (s.a0 + s.a1) / 2;
    to = rot0 + (mod(-phi - rot0 + Math.PI, TAU) - Math.PI); dur = 1.6;
  }
  const s = sl[idx], prev = st.last;
  // leaving a countdown spot that already had one knocked off? give it back
  if (kind !== 'spin' && prev?.knocked) { const pe = getWheel(prev.wheelId)?.entries.find(e => e.id === prev.entryId); if (pe && pe.type === 'countdown') pe.count = Math.min(pe.countStart, pe.count + 1); }
  const spinId = kind === 'spin' ? uid() : prev?.spinId || uid();
  const rec = { id: uid(), at: Date.now(), wheelId: w.id, wheelName: w.name, kind, by: { ...by, redemption: undefined }, spinId, entryId: s.e.id, text: s.e.text, rule: s.e.rule || '', pct: s.pct, color: s.color, spots: sl.length, type: s.e.type,
    from: kind === 'spin' ? null : prev ? { entryId: prev.entryId, text: prev.text, pct: prev.pct } : null };
  if (s.e.type === 'countdown') { rec.countBefore = s.e.count; if (s.e.autoKnock && s.e.count > 0) { s.e.count--; rec.knocked = true; } rec.countLeft = s.e.count; }
  if (s.e.type === 'timer') rec.timerMins = s.e.timerMins;
  if (s.e.type === 'refund') rec.refundUnder = s.e.refundUnder;
  if (by.source === 'void') rec.voided = true;
  st.history.push(rec); if (st.history.length > 50000) st.history = st.history.slice(-50000);
  w.rot = mod(to, TAU);
  st.last = { ...rec };
  st.show = true; bump();
  busyUntil = Date.now() + dur * 1000 + (by.source === 'points' || by.source === 'bank' ? 4500 : 1500);
  save();
  hooks.broadcast({ type: 'wheelSpin', wheel: { ...view(w), rot: rot0 }, from: rot0, to, dur, ease: kind === 'up' || kind === 'down' ? 'inout' : 'out', kind, by: rec.by, index: idx, result: rec, mine: { name: mineName(), left: st.mine.left } });
  hooks.pushState();
  if (s.e.type === 'void' && by.source !== 'void') { // 🧤 landed on the void: it respins by itself, and the next spot is gone for the night
    busyUntil = Date.now() + dur * 1000 + 200;
    setTimeout(() => { hooks.broadcast({ type: 'wheelBanner', html: `${GX} THE VOID!<small>Respinning… whatever it lands on is gone for the rest of the stream</small>` }, 'overlay'); }, dur * 1000 + 300);
    setTimeout(() => { try { request('respin', { name: '🧤 The void', source: 'void' }, { wheelId: w.id }); } catch (e) { note(e.message); } }, dur * 1000 + 2600);
  }
  if (by.source === 'void') setTimeout(() => {
    s.e.voided = streamKey();
    log({ kind: 'void', wheelId: w.id, wheelName: w.name, entryId: s.e.id, text: s.e.text, by: { name: '🧤 The void', source: 'void' } });
    bump(); save(); hooks.broadcast({ type: 'wheelBanner', html: `${GX} VOIDED!<small>${esc(s.e.text)} is gone for the rest of the stream</small>` }, 'overlay'); hooks.broadcast(wheelMsg()); hooks.pushState();
    if (w.opts.chat) say(`🧤 The void ate “${s.e.text}”! It's off the wheel for the rest of the stream… unless someone saves it with a sub, gift sub, bits or a donation 👀`);
  }, dur * 1000 + 2200);
  if ((by.source === 'points' || by.source === 'bank') && w.opts.chat) {
    const what = kind === 'respin' ? 'used a 🕳️ RESPIN' : kind === 'up' ? 'moved the wheel ⬆️ UP a spot' : kind === 'down' ? 'moved the wheel ⬇️ DOWN a spot' : 'spun the wheel 🎡';
    setTimeout(() => say(`🎡 ${by.name} ${what}! It landed on: ${s.e.text}${s.e.rule ? ' — ' + s.e.rule.slice(0, 200) : ''}`), dur * 1000 + 300);
  }
  return rec;
}
const say = t => hooks.say(t).catch(() => {});

// ---------- after it lands: knock one off, timer ----------
export function knock(delta = -1) {
  const st = W(), e = lastEntry(); if (!e || e.type !== 'countdown') throw new Error('The last spot is not a countdown spot.');
  e.count = Math.max(0, Math.min(e.countStart, e.count + delta)); st.last.countLeft = e.count;
  if (delta < 0) st.last.knocked = true;
  log({ kind: 'knock', wheelId: st.last.wheelId, wheelName: st.last.wheelName, entryId: e.id, text: e.text, amount: delta, countLeft: e.count, by: { name: streamerName(), source: 'you' } });
  bump(); save(); hooks.broadcast(wheelMsg()); hooks.pushState();
  return e.count;
}
let timer = null, timerT = null;
function timerView() { if (!timer) return null; const left = timer.paused ? timer.left : Math.max(0, timer.endsAt - Date.now()); return { label: timer.label, total: timer.total, left, paused: timer.paused, endsAt: timer.endsAt, done: left <= 0 }; }
export function startTimer(mins, label) {
  const e = lastEntry(); mins = Number(mins) || e?.timerMins || 5;
  timer = { label: label || e?.text || 'Timer', total: mins * 60000, endsAt: Date.now() + mins * 60000, left: mins * 60000, paused: false };
  armTimer(); log({ kind: 'timer', wheelId: W().last?.wheelId, wheelName: W().last?.wheelName, entryId: e?.id, text: timer.label, minutes: mins, by: { name: streamerName(), source: 'you' } }); bump(); save();
  sendTimer();
}
function armTimer() { clearTimeout(timerT); if (!timer || timer.paused) return; const ms = timer.endsAt - Date.now(); timerT = setTimeout(() => { hooks.broadcast({ type: 'wheelTimer', timer: timerView(), ding: true }); hooks.pushState(); }, Math.max(0, ms)); }
export function timerCmd(cmd, mins) {
  if (!timer) throw new Error('No timer running.');
  if (cmd === 'pause' && !timer.paused) { timer.left = Math.max(0, timer.endsAt - Date.now()); timer.paused = true; }
  else if (cmd === 'resume' && timer.paused) { timer.endsAt = Date.now() + timer.left; timer.paused = false; }
  else if (cmd === 'add') { const ms = (Number(mins) || 1) * 60000; timer.total += ms; if (timer.paused) timer.left += ms; else timer.endsAt += ms; }
  else if (cmd === 'stop') return stopTimer();
  armTimer(); sendTimer();
}
function stopTimer(quiet) { clearTimeout(timerT); const had = !!timer; timer = null; if (had && !quiet) sendTimer(); else if (had) hooks.broadcast({ type: 'wheelTimer', timer: null }); }
function sendTimer() { hooks.broadcast({ type: 'wheelTimer', timer: timerView() }); hooks.pushState(); }
export const getTimer = () => timerView();

// ---------- spins people have saved up (given by you, subs, bits…) ----------
const bkey = login => norm(String(login || '').replace(/^@/, ''));
export function giveSpins(who, n, reason = '', by = {}) {
  const st = W(), name = String(who || '').replace(/^@/, '').trim(); const k = bkey(name); if (!k) throw new Error('Who gets the spins?');
  n = Math.round(Number(n) || 0); if (!n) throw new Error('How many spins?');
  const b = st.bank[k] ||= { name, login: name.toLowerCase(), spins: 0, got: 0, used: 0 };
  if (/[A-Z]/.test(name) || !b.name) b.name = name;
  b.spins = Math.max(0, b.spins + n); if (n > 0) b.got += n;
  st.grants.push({ id: uid(), at: Date.now(), login: b.login, name: b.name, amount: n, reason: String(reason || '').slice(0, 120), by: by.name || streamerName() }); if (st.grants.length > 20000) st.grants = st.grants.slice(-20000);
  bump(); save(); hooks.pushState();
  return b.spins;
}
function refundBank(by) { const b = W().bank[bkey(by.login || by.name)]; if (b) { b.spins++; b.used = Math.max(0, b.used - 1); save(); } }
export function useMine() {
  const st = W(); if (st.mine.left <= 0) throw new Error(`No ${mineName()} left this stream.`);
  if (!st.last) throw new Error('Spin the wheel first.');
  const why = blocked('respin', 'mine'); if (why) throw new Error(why);
  st.mine.left--; save();
  return request('respin', { name: streamerName(), source: 'mine' });
}
const streamKey = () => db.stream?.startedAt || W().streamAt || (W().streamAt = Date.now());
export function newStream() { const st = W(); st.mine.left = st.mine.perStream; st.streamAt = Date.now(); for (const w of st.wheels) for (const e of w.entries) e.voided = null; bump(); save(); hooks.broadcast(wheelMsg()); hooks.pushState(); }
export function unvoid(entryId, by = {}, reason = '', wheelId) {
  const w = getWheel(wheelId) || active(), e = w?.entries.find(x => x.id === entryId && x.voided) || w?.entries.find(x => x.voided && norm(x.text) === norm(entryId));
  if (!e) throw new Error('That spot is not voided.');
  e.voided = null;
  log({ kind: 'unvoid', wheelId: w.id, wheelName: w.name, entryId: e.id, text: e.text, reason: String(reason || '').slice(0, 120), by: { name: by.name || streamerName(), login: by.login || '', source: by.source || 'you' } });
  bump(); save(); hooks.broadcast(wheelMsg()); hooks.pushState();
  hooks.broadcast({ type: 'wheelBanner', html: `♻️ SAVED FROM THE VOID!<small>${esc(by.name || '')} brought back ${esc(e.text)}</small>` }, 'overlay');
  return e.text;
}
// chat: !respin uses one of your saved spins, !spins tells you how many you have
export function wheelChat(m) {
  const st = W(), t = String(m.text || '').trim().toLowerCase(), cmd = t.split(/\s+/)[0];
  if (cmd === String(st.cmd.spins || '').toLowerCase()) { const b = st.bank[bkey(m.login)]; say(b?.spins ? `🎡 @${m.name} you have ${b.spins} wheel spin${b.spins === 1 ? '' : 's'} saved up! Type ${st.cmd.respin} to use one.` : `🎡 @${m.name} you don't have any wheel spins right now — but stick around, they come your way! 💜`); return true; }
  if (cmd !== String(st.cmd.respin || '').toLowerCase()) return false;
  const b = st.bank[bkey(m.login)], lw = (st.last && getWheel(st.last.wheelId)) || active();
  if (lw && lw.opts.bankRespin === false) { say(`🎡 @${m.name} saved spins can't be used on this wheel tonight — yours are safe for later! 💜`); return true; }
  if (!b || b.spins <= 0) { say(`🎡 Aw @${m.name}, you don't have any wheel spins right now! 💜 Keep hanging out and you might earn some.`); return true; }
  if (!st.last) { say(`🎡 @${m.name} hang tight, the wheel hasn't been spun yet! Your ${b.spins} spin${b.spins === 1 ? ' is' : 's are'} safe.`); return true; }
  const why = blocked('respin', 'bank'); if (why) { say(`🎡 Sorry @${m.name}, ${why} Your spin${b.spins === 1 ? ' is' : 's are'} still saved! 💜`); return true; }
  b.spins--; b.used++; save();
  try { request('respin', { name: m.name, login: m.login, source: 'bank' }); say(`🎡 @${m.name} used a saved spin! 🕳️ Respinning… (${b.spins} left)`); }
  catch (e) { b.spins++; b.used--; save(); say(`🎡 @${m.name} ${e.message} Your spin is still saved.`); }
  return true;
}
// subs, gift subs, bits and donations: with the wheel on stream you get a pop-up to grow spots or give respins;
// with the wheel off stream, the automatic spins (if set) are given.
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
  note(`${s.name} got ${per * mult} wheel spin(s) for ${s.kind === 'gift' ? 'a gift sub' : 'subbing'}.`);
}
export function onBits(c) {
  const st = W(), a = st.auto;
  if (c.bits >= (a.popBits || 1) && popOn('bits')) return addBoost({ kind: 'bits', login: c.login, name: c.name || 'Anonymous', icon: '💎', title: `${c.name || 'Anonymous'} cheered ${c.bits.toLocaleString()} bits!`, suggest: Math.max(1, a.bitsPer > 0 ? Math.floor(c.bits / a.bitsPer) * (a.bitsSpins || 1) : 1), reason: `${c.bits} bits` });
  if (!(a.bitsPer > 0) || !c.login) return;
  const n = Math.floor(c.bits / a.bitsPer) * (a.bitsSpins || 1); if (n <= 0) return;
  giveSpins(c.name || c.login, n, `cheered ${c.bits} bits`, { name: 'auto' }); note(`${c.name} got ${n} wheel spin(s) for ${c.bits} bits.`);
  say(`🎡 Thanks for the bits @${c.name}! You got ${n} wheel spin${n === 1 ? '' : 's'} — type ${st.cmd.respin} to use one.`);
}
export function onMoney({ name, amount, currency = 'USD', source = '' }) {
  const a = W().auto; amount = Number(amount) || 0; const cur = currency && currency !== 'USD' ? ` ${currency}` : '';
  if (!popOn('money')) { note(`💵 ${name} donated $${amount}${cur}${source ? ' (' + source + ')' : ''}.`); return; }
  addBoost({ kind: 'money', login: String(name || '').toLowerCase(), name: String(name || 'Someone').slice(0, 40), icon: '💵', title: `${name} donated ${cur ? amount + cur : '$' + amount.toLocaleString()}!`, suggest: Math.max(1, a.dollarsPer > 0 ? Math.floor(amount / a.dollarsPer) : 1), reason: `$${amount}${cur} donation${source ? ' (' + source + ')' : ''}` });
}
export function boostAct(id, { action, n, entryId, grows, text }) {
  const st = W(), b = st.boosts.find(x => x.id === id); if (!b) throw new Error('That pop-up is already done.');
  const by = { name: b.name, login: b.login || '', source: b.kind === 'points' ? 'points' : 'auto', cost: b.cost || 0 }, why = b.reason || b.kind; let msg = '';
  n = Math.max(1, Math.round(Number(n) || 1));
  const w = popWheel(), pick = () => { const e = (entryId && w.entries.find(x => x.id === entryId)) || findSpot(w, text); if (!e) throw new Error(`No spot called “${text || ''}” on this wheel.`); return e; };
  if (action === 'grow' || action === 'shrink') { const e = pick(), nw = grow(e.id, action === 'shrink' ? -n : n, by, why, w.id); msg = `${action === 'shrink' ? '📉 Shrunk' : '📈 Grew'} “${e.text}” ${n}× for ${b.name} (now size ${nw}).`; }
  else if (action === 'unvoid') { const t = unvoid(entryId || text, by, why, w.id); msg = `♻️ ${b.name} saved “${t}” from the void.`; if (w.opts.chat) say(`♻️ @${b.name} saved “${t}” from the void! It's back on the wheel 💜`); }
  else if (action === 'growMany') { const list = (grows || []).filter(g => g.n > 0); if (!list.length) throw new Error('Pick how many grows for at least one spot.'); for (const g of list) grow(g.entryId, g.n, by, why); msg = `📈 Grew ${list.length} spots for ${b.name}.`; }
  else if (action === 'spins') { const left = giveSpins(b.name, n, why, { name: streamerName() }); msg = `🎟️ ${b.name} got ${n} respin${n === 1 ? '' : 's'} (has ${left}).`; say(`🎡 @${b.name} thank you! You got ${n} wheel respin${n === 1 ? '' : 's'} — type ${st.cmd.respin} whenever you want to use ${n === 1 ? 'it' : 'one'}! 💜`); }
  st.boosts = st.boosts.filter(x => x.id !== id); bump(); save(); sendBoosts(); hooks.pushState();
  return { msg };
}

// ---------- growing spots (and shrinking, and resetting) ----------
export function grow(entryId, amount = 1, by = {}, reason = '', wheelId) {
  const st = W(), w = getWheel(wheelId) || (st.last && getWheel(st.last.wheelId)?.entries.some(e => e.id === entryId) ? getWheel(st.last.wheelId) : active());
  const e = w?.entries.find(x => x.id === entryId); if (!e) throw new Error('No such spot.');
  const step = Number(w.opts?.growStep) || Number(st.growStep) || 1, add = Number(amount) * step; const before = e.weight;
  e.weight = Math.max(add < 0 ? Math.min(before, step * .1) : 0, Math.round((e.weight + add) * 1000) / 1000); if (e.weight > 0) e.on = true; // shrinking never makes a spot vanish
  log({ kind: 'grow', wheelId: w.id, wheelName: w.name, entryId: e.id, text: e.text, amount: add, before, after: e.weight, reason: String(reason || '').slice(0, 120), by: { name: by.name || streamerName(), login: by.login || '', source: by.source || 'you', cost: by.cost || 0 } });
  bump(); save(); hooks.broadcast(wheelMsg()); hooks.pushState();
  if (by.source === 'points' || by.source === 'auto') hooks.broadcast({ type: 'wheelBanner', html: add > 0 ? `📈 ${esc(e.text)} GREW!<small>${esc(by.name || '')} made it bigger</small>` : `📉 ${esc(e.text)} SHRANK!<small>${esc(by.name || '')} made it smaller</small>` }, 'overlay');
  return e.weight;
}
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export function resetSizes(wheelId) {
  const w = getWheel(wheelId) || active(); const before = w.entries.map(e => ({ id: e.id, weight: e.weight }));
  for (const e of w.entries) e.weight = 1;
  w.sizeBackup = { at: Date.now(), before };
  log({ kind: 'reset', wheelId: w.id, wheelName: w.name, text: 'All spot sizes back to 1', by: { name: streamerName(), source: 'you' } });
  bump(); save(); hooks.broadcast(wheelMsg()); hooks.pushState();
}
export function undoReset(wheelId) { const w = getWheel(wheelId) || active(); if (!w.sizeBackup) throw new Error('Nothing to undo.'); for (const b of w.sizeBackup.before) { const e = w.entries.find(x => x.id === b.id); if (e) e.weight = b.weight; } w.sizeBackup = null; bump(); save(); hooks.broadcast(wheelMsg()); hooks.pushState(); }
// match a typed spot name ("grow a spot" reward)
function findSpot(w, text) {
  const raw = String(text || '').trim(), q = norm(raw); if (!q || !w) return null;
  const on = w.entries.filter(e => e.text && e.type !== 'void');
  if (/^#?\d+$/.test(raw)) { const i = Number(raw.replace('#', '')) - 1; if (on[i]) return on[i]; } // "3" = the 3rd spot
  const hit = on.find(e => norm(e.text) === q) || on.find(e => norm(e.text).startsWith(q)) || on.find(e => norm(e.text).includes(q)) || on.find(e => q.includes(norm(e.text)) && norm(e.text).length > 2);
  if (hit) return hit;
  const words = raw.toLowerCase().split(/\W+/).filter(x => x.length > 2); let best = null, bs = 0; // most words in common
  for (const e of on) { const t = e.text.toLowerCase(), sc = words.filter(x => t.includes(x)).length; if (sc > bs) { bs = sc; best = e; } }
  return bs ? best : null;
}
export const findSpotIn = (wheelId, text) => findSpot(getWheel(wheelId) || active(), text);

// channel points: returns true if it was one of the wheel rewards
export function wheelRedeem(r) {
  const st = W();
  const kind = Object.entries(st.rewards).find(([, t]) => t && norm(t) === norm(r.title))?.[0];
  const logIt = result => { st.redeemLog.unshift({ at: Date.now(), title: r.title, name: r.name, input: r.input || '', cost: r.cost || 0, result }); st.redeemLog = st.redeemLog.slice(0, 60); bump(); };
  if (!kind) { logIt('not a wheel reward'); return false; }
  if (st.pointsOn === false) { logIt('wheel channel points are switched off'); return false; }
  const giveBack = msg => { note(msg + ' (refund it in your Twitch reward queue if you want)'); logIt(msg); }; // refunds are yours to do on Twitch
  const cost = r.cost || st.costs?.[kind] || 0, wh = (st.last && getWheel(st.last.wheelId)) || active();
  if (wh.opts.points[kind] === false) { giveBack(`${r.name} redeemed "${r.title}" but that's off for “${wh.name}”.`); say(`🎡 Sorry @${r.name}, that one is turned off for this wheel — 💜`); return true; }
  if (kind === 'grow' || kind === 'shrink') { // you pick the spot (type it in the pop-up), chat doesn't
    addBoost({ kind: 'points', only: kind, login: r.login, name: r.name, icon: kind === 'grow' ? '📈' : '📉', title: `${r.name} redeemed “${r.title}” — pick a spot to ${kind}`, suggest: 1, reason: 'channel points', cost });
    logIt(`waiting for you to pick the spot to ${kind}`); return true;
  }
  if ((kind === 'up' || kind === 'down') && !st.last) { giveBack(`${r.name} redeemed "${r.title}" but nothing has been spun yet.`); return true; }
  try { request(kind, { name: r.name, login: r.login, source: 'points', cost, redemption: r.id }); logIt(kind); }
  catch (e) { giveBack(`${r.name}: ${e.message}`); say(`🎡 Sorry @${r.name}, ${e.message} 💜`); }
  return true;
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
  const cfg = best.cfg || {}, root = j.wheelConfig || j.config || j;
  const pal = (root.colorSettings || cfg.colorSettings || []).filter(c => c && c.enabled !== false && /^#[0-9a-f]{6}$/i.test(c.color || '')).map(c => c.color);
  const strip = s => String(s ?? '').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').trim();
  return {
    title: strip(root.title || cfg.title || ''), spinSecs: Number(root.spinTime || cfg.spinTime) || undefined, palette: pal.length ? pal : null,
    entries: best.items.map(o => ({ text: strip(o.text ?? o.name ?? o.label), weight: Number(o.weight) > 0 ? Number(o.weight) : 1, color: o.color, on: o.enabled !== false })).filter(e => e.text)
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
  const w = newWheel(name || got.title || 'Imported wheel', got.entries, { title: got.title || '', ...(got.spinSecs ? { spinSecs: Math.min(60, Math.max(2, got.spinSecs)) } : {}), palette: got.palette || null });
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
  grow: { prompt: 'Make a spot on the wheel bigger! (the streamer picks which)', color: '#FFB547' },
  shrink: { prompt: 'Make a spot on the wheel smaller! (the streamer picks which)', color: '#7C6CFF' }
};

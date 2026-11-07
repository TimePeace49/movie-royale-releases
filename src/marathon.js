// 🏃 Marathon battles (1.76.0, Derek: "a battle per sub… they can pick the map and one item to give 1% luck to until it wins
// and it resets… they can change map or luck up to the point I hit start battle… if they don't choose anything it will be a
// random map but they can go on the site later and add their luck").
// Each paid battle (paid.js line) can carry a 🗺️ map pick and a 🍀 luck pick. Picks come from chat (`!map 3` / `!luck 12`, or
// without the !) or from the 🌐 viewer website (signed in with Twitch; a pick made there can't be changed from chat, so a
// stray chat message doesn't undo it). The luck is given when Derek starts that battle (+1% by default, Settings) and stays on
// that thing until it wins, then it starts over. A battle that starts without a luck pick leaves a 🍀 luck token for that person,
// spent later from chat or the website (it's given right away then).
import crypto from 'crypto';
import { db, save } from './store.js';
import * as paid from './paid.js';

let H = { list: () => null, maps: () => [], say: () => {}, act: () => {}, popup: () => {}, changed: () => {}, siteUrl: () => '' };
export function setHooks(h) { H = { ...H, ...h }; }
export const cfg = () => ({ luckPer: 1, popSecs: 40, guessSecs: 90, counter: true, corner: 'bl', popup: true, itemLook: true, timerOn: true, alarmSecs: 5, waitRemind: true, waitMins: 30, ...(db.settings.marathon || {}) });

// 🏋️ (1.77.0, Derek) a workout fights as a character in gym clothes holding a sign; everything else fights as the thing itself.
// The pool can say which by hand (entry.mk 'thing' | 'workout'); otherwise it's guessed from the words.
const WORKOUT = /\b(push[- ]?ups?|press[- ]?ups?|sit[- ]?ups?|squats?|jumping[- ]?jacks?|star[- ]?jumps?|planks?|wall[- ]?sits?|burpees?|lunges?|crunch(es)?|pull[- ]?ups?|chin[- ]?ups?|jog(ging)?|run(ning)?|sprints?|high[- ]?knees|mountain[- ]?climbers?|leg[- ]?raises?|calf[- ]?raises?|dips|bear[- ]?crawls?|jump(ing)?[- ]?rope|skipping|stretch(es|ing)?|yoga|toe[- ]?touch(es)?|exercises?|workout|work[- ]?out|reps)\b/i;
export const kindOf = e => e?.mk === 'thing' || e?.mk === 'workout' ? e.mk : WORKOUT.test(`${e?.label || ''} ${e?.sub || ''}`) ? 'workout' : 'thing';
/** ⏱️ how long a timed one lasts, in seconds (entry.mSecs by hand, else read from the words: "45-second plank", "1 minute wall sit",
 *  "1:30 plank", "2 mins", "30s"). 0 = not timed. */
export function secsOf(e) {
  if (e?.mSecs != null && e.mSecs !== '') return Math.max(0, Math.min(7200, Number(e.mSecs) || 0));
  const t = `${e?.label || ''} ${e?.sub || ''}`.toLowerCase();
  let m = t.match(/\b(\d{1,2}):([0-5]\d)\b/); if (m) return Number(m[1]) * 60 + Number(m[2]);
  let n = 0; const re = /(\d+(?:\.\d+)?|a|an|one|two|three|four|five|half an?)\s*[- ]?\s*(hours?|hrs?|minutes?|mins?|seconds?|secs?|s)\b/g, W = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5 };
  while ((m = re.exec(t))) { const v = /^half/.test(m[1]) ? .5 : W[m[1]] ?? Number(m[1]), u = m[2]; if (!(v > 0)) continue; if (u === 's' && !/\d$/.test(m[1])) continue; n += v * (/^h/.test(u) ? 3600 : /^m/.test(u) ? 60 : 1); }
  return Math.round(Math.min(7200, n));
}
export const list = () => H.list();
export const tokens = () => (db.paidTokens ||= []);
const uid = () => crypto.randomBytes(6).toString('hex');
const r2 = n => Math.round((Number(n) || 0) * 100) / 100;
const pct = n => (r2(n) % 1 ? r2(n) : Math.round(n)) + '%';
export const norm = s => String(s || '').toLowerCase().replace(/[^a-z0-9_]/g, '');
/** Is this paid battle / luck token this person's? (Twitch login; tips only have the name the person typed) */
export const owns = (x, login, name) => !!x && x.who !== 'Anonymous' && ((x.login && norm(x.login) === norm(login)) || (!x.login && !!x.who && (norm(x.who) === norm(login) || (!!name && norm(x.who) === norm(name)))));

/** The maps viewers can pick, numbered (A–Z, the same numbers on stream, in chat and on the website). */
export function maps() { return H.maps().map((m, i) => ({ n: i + 1, id: m.id, name: m.name, icon: m.icon || '🗺️' })); }
/** The things in the marathon battle, numbered in the pool's order (only the ones that are in). */
export function items() {
  const l = list(); if (!l) return [];
  return l.entries.filter(e => e.status === 'active').map((e, i) => ({ n: i + 1, id: e.id, label: e.label, sub: e.sub || '', image: e.image || null, luck: r2(e.vLuck), wins: e.vWins || 0, kind: kindOf(e), secs: secsOf(e), mk: e.mk || null, mSecs: e.mSecs ?? null }));
}
function find(arr, v, what) {
  const s = String(v ?? '').trim().replace(/^#/, ''); if (!s) return { error: `Which ${what}? Type its number.` };
  if (/^\d+$/.test(s)) { const x = arr.find(a => a.n === Number(s)); return x || { error: `There's no ${what} #${s} (1–${arr.length}).` }; }
  const k = norm(s), lab = a => norm(a.name || a.label);
  const exact = arr.filter(a => lab(a) === k); if (exact.length === 1) return exact[0];
  const some = arr.filter(a => lab(a).includes(k)); if (some.length === 1) return some[0];
  return { error: some.length ? `More than one ${what} matches “${s}”: use its number.` : `No ${what} called “${s}”. Use its number.` };
}
export const findMap = v => find(maps(), v, 'map');
export const findItem = v => find(items(), v, 'thing');

/** What one person has: their battles in the line and their unspent 🍀 tokens. */
export function mine(login, name) {
  return { battles: paid.queue().filter(x => owns(x, login, name)), tokens: tokens().filter(t => owns(t, login, name)) };
}

/** Pick a map and/or the thing to give luck to. via = 'chat' | 'site' | 'you'. */
export function pick({ login, name, qid, map, luck, via = 'chat' }) {
  const { battles, tokens: toks } = mine(login, name);
  if (!battles.length && !toks.length) return { ok: false, none: true, error: "You don't have a battle waiting (or a 🍀 to give)." };
  if (qid && !battles.some(x => x.id === qid)) return { ok: false, error: "That battle isn't yours, or it already started." };
  const usable = k => battles.filter(x => (qid ? x.id === qid : true) && !(via === 'chat' && x[k + 'Via'] === 'site'));
  const out = []; let lockedOut = false;
  if (map != null && map !== '') {
    const m = findMap(map); if (m.error) return { ok: false, error: m.error };
    if (!battles.length) return { ok: false, error: 'Maps are picked for a battle that is still waiting. Yours already ran: you can still give your 🍀 luck.' };
    const can = usable('map'); if (!can.length) lockedOut = true;
    else { const t = can.find(x => !x.map) || can[can.length - 1]; t.map = m.id; t.mapVia = via; out.push(`🗺️ ${m.icon} ${m.name}${battles.length > 1 ? ` (battle #${paid.queue().indexOf(t) + 1} in line)` : ''}`); }
  }
  if (luck != null && luck !== '') {
    const it = findItem(luck); if (it.error) return { ok: false, error: it.error };
    const can = usable('luck'), t = can.find(x => !x.luck) || (qid ? can[0] : null);
    if (t) { t.luck = it.id; t.luckVia = via; out.push(`🍀 +${pct(cfg().luckPer)} to ${it.label} when that battle starts`); }
    else if (toks.length) { const tk = toks[0]; db.paidTokens = tokens().filter(x => x !== tk); give(it.id, tk.who, via); out.push(`🍀 +${pct(cfg().luckPer)} to ${it.label} (given now: it has ${pct(list().entries.find(e => e.id === it.id)?.vLuck)})`); }
    else if (can.length) { const t2 = can[can.length - 1]; t2.luck = it.id; t2.luckVia = via; out.push(`🍀 changed to ${it.label} (when that battle starts)`); }
    else lockedOut = true;
  }
  if (!out.length) return lockedOut ? { ok: false, site: true, error: 'You picked that on the website, so chat can\'t change it: change it there.' } : { ok: false, error: 'Tell me a map (map 3) or a thing for your luck (luck 12).' };
  save(); H.changed();
  H.act(`picked ${out.join(' and ')}${via === 'site' ? ' on the website' : via === 'chat' ? ' in chat' : ''}`, { who: battles[0]?.who || toks[0]?.who || name || login });
  return { ok: true, text: out.join(' · ') };
}
/** Give the 🍀 luck now (a battle starting, or a token being spent). */
export function give(entryId, who, via) {
  const l = list(), e = l?.entries.find(x => x.id === entryId); if (!e) return null;
  const was = r2(e.vLuck); e.vLuck = r2(was + Number(cfg().luckPer || 1)); (e.vLuckBy ||= []).push({ who, at: Date.now() }); e.vLuckBy = e.vLuckBy.slice(-60); save();
  H.act(`gave 🍀 +${pct(cfg().luckPer)} luck to “${e.label}” in “${l.name}” (${pct(was)} → ${pct(e.vLuck)})`, { who, luck: true });
  return { e, was };
}
/** Your 🎟️ ▶ Start: the battle uses their map (else a random one), their luck goes on, or they keep a 🍀 token for later. Returns an undo for a battle that couldn't start. */
export function atStart(item, randomMap) {
  const okMap = item.map && maps().some(m => m.id === item.map), map = okMap ? item.map : randomMap();
  let gave = null, tok = null;
  if (item.luck) gave = give(item.luck, item.who, 'start');
  if (!gave && item.who !== 'Anonymous') { tok = { id: uid(), who: item.who, login: item.login || null, at: Date.now(), from: item.id, ...(item.test ? { test: true } : {}) }; tokens().push(tok); save(); }
  return { map, mapPicked: okMap, gave, tok, undo() { if (gave) { gave.e.vLuck = gave.was; gave.e.vLuckBy?.pop(); } if (tok) db.paidTokens = tokens().filter(x => x !== tok); save(); } };
}
/** A marathon battle was won: that thing's 🍀 starts over. */
export function won(listId, winnerId) {
  const l = list(); if (!l || l.id !== listId) return;
  const w = l.entries.find(e => e.id === winnerId); if (!w) return;
  w.vWins = (w.vWins || 0) + 1; const had = r2(w.vLuck);
  if (had) { w.vLuck = 0; w.vLuckBy = []; H.act(`“${w.label}” won, so its 🍀 luck from chat starts over (${pct(had)} → 0%)`, { luck: true, reset: true }); }
  save();
}
export function resetLuck(entryId) { const l = list(); if (!l) return 0; let n = 0; for (const e of l.entries) if ((!entryId || e.id === entryId) && e.vLuck) { e.vLuck = 0; e.vLuckBy = []; n++; } save(); H.changed(); return n; }

// ---------- 💬 chat: "!map 3" / "map 3" / "!luck 12" / "luck pickle balls" (only from people with a battle or a 🍀 token) ----------
const replyAt = {};
export function chat(m) {
  const mm = String(m.text || '').trim().match(/^!?(map|luck)\s+(.{1,60})$/i); if (!mm || !paid.cfg().on) return false;
  const kind = mm[1].toLowerCase(), r = pick({ login: m.login, name: m.name || m.display, [kind]: mm[2], via: 'chat' });
  if (r.none) return false;
  const k = norm(m.login); if (!r.ok && Date.now() - (replyAt[k] || 0) < 8000) return true; replyAt[k] = Date.now();
  const site = H.siteUrl();
  H.say(r.ok ? `@${m.login} ${r.text}` : r.site ? `@${m.login} you picked that on the website, so chat won't change it${site ? `: change it at ${site}` : ''}` : `@${m.login} ${r.error}`);
  return true;
}

// ---------- 🎟️ new paid battles: one pop-up + one chat line per person (a 5-gift bomb = "got 5 battles") ----------
const pend = new Map();
export function announce(items, info) {
  if (!paid.cfg().on && !info.test) return false;
  const key = norm(info.login || info.who); let p = pend.get(key);
  if (!p) { p = { who: info.who, login: info.login, whats: [], n: 0, test: !!info.test }; pend.set(key, p); }
  p.n += items.length; p.whats.push(info.what); clearTimeout(p.t);
  p.t = setTimeout(() => { pend.delete(key); flush(p); }, 2500);
  return true; // (we say it in chat ourselves)
}
function flush(p) {
  const gifts = p.whats.filter(w => /gift sub/.test(w)).length, what = p.whats.length === 1 ? p.whats[0] : gifts === p.whats.length ? `${gifts} gift subs` : p.whats.join(' + ');
  const owed = paid.queue().length, site = H.siteUrl(), anon = p.who === 'Anonymous';
  H.popup({ who: p.who, n: p.n, what, test: p.test, anon, paused: !!db.paidPaused });
  if (paid.cfg().say) H.say(`⚔️ ${p.login ? '@' + p.login : p.who} got ${p.n === 1 ? 'a battle' : p.n + ' battles'} (${what})! ${anon ? '' : `Pick the map: map # · give 🍀 +${pct(cfg().luckPer)} luck to one thing: luck # (the lists are on screen)${site ? ` or pick at ${site}` : ''}. `}🎟️ ${owed} battle${owed === 1 ? '' : 's'} owed.${db.paidPaused ? " ⏸ Battles are paused right now: yours is safe in the line and runs when they're back on." : ''}`);
}
/** What the 🏃 marathon overlay shows all the time. */
export const counter = () => ({ on: !!paid.cfg().on && cfg().counter !== false, owed: paid.queue().length, next: paid.queue().slice(0, 4).map(x => x.who), corner: cfg().corner || 'bl', paused: !!db.paidPaused });

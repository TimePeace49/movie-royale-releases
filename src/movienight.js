// 🍿 Movie night voting (1.93.0, made for Birx & Jess; Derek's edition has it in dev mode to try first).
// Before the stream you type tonight's movies (and who asked for each). ▶ Open voting pins the list in chat, and chat types
// "!vote 3" or "!vote the thing". Birx's rules: everyone gets ONE vote and ONE vote change; you get TWO votes if you raided tonight,
// were the first one to type in chat, or it's your birthday and today is a Wednesday or a Sunday.
// Every vote pops up in the app so Jess can click whether Birx guessed it right: that count shows on screen and is kept per chatter.
import { db, save, uid } from './store.js';
import * as bdays from './birthdays.js';
import { is } from './edition.js';

const H = { say: async () => {}, pin: async () => null, act: () => {}, send: () => {}, on: () => false, isBot: () => false, me: () => '', info: async () => null };
export const setHooks = h => Object.assign(H, h);
export const on = () => !!H.on();

export function data(d = (db.movieNight ||= {})) {
  d.movies ||= []; d.votes ||= {}; d.raiders ||= []; d.extra ||= {}; d.birthdays ||= {}; d.guesses ||= [];
  if (d === db.movieNight) { const all = bdays.days(); if (d.birthdays !== all) { if (!d.bdayMoved) { for (const [l, v] of Object.entries(d.birthdays)) all[l] ??= v; d.bdayMoved = 1; } d.birthdays = all; } } // 🎂 one birthday list for the whole app (1.96.0)
  d.stats ||= { right: 0, wrong: 0, per: {} }; d.past ||= []; d.opts ||= {};
  return d;
}
export const opts = (d = data()) => ({ command: '!vote', changes: 1, reply: true, overlay: true, lastMins: 5, bonusDays: [0, 3], guesser: is('birx') ? 'Birx' : 'Guess', ...d.opts });
/** Which day a moment belongs to: the shared birthday rule (Birx & Jess: a new day starts at 6 AM, so live at 1:30 AM Tuesday = Monday). A pretend night (`d.dayStart`) brings its own. */
export const dayOf = (now = Date.now(), d = data()) => (d !== db.movieNight ? now - (d.dayStart ?? 6) * 3600000 : bdays.dayOf(now));
const low = s => String(s || '').trim().toLowerCase().replace(/^@/, '');
const plain = s => String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/&/g, 'and').replace(/[^a-z0-9]+/g, ' ').trim();
const mmdd = bdays.mmdd;
export const readDay = bdays.readDay;

/** Why this person has two votes tonight (empty = one vote). */
export function bonusWhy(login, d = data(), now = Date.now()) {
  const l = low(login), why = [];
  if (d.raiders.includes(l)) why.push('raided');
  if (d.first === l) why.push('first in chat');
  if (d.birthdays[l] === mmdd(dayOf(now, d)) && opts(d).bonusDays.includes(new Date(dayOf(now, d)).getDay())) why.push('birthday');
  return why;
}
export const votesAllowed = (login, d = data(), now = Date.now()) => (bonusWhy(login, d, now).length ? 2 : 1) + Math.max(0, Math.round(Number(d.extra[low(login)]) || 0));

export function findMovie(arg, d = data()) {
  const t = String(arg || '').trim(); if (!t) return null;
  if (/^#?\d{1,3}$/.test(t)) return d.movies[Number(t.replace('#', '')) - 1] || null;
  const q = plain(t); if (!q) return null;
  const by = f => d.movies.filter(m => f(plain(m.title)));
  let hit = by(x => x === q); if (hit.length === 1) return hit[0];
  hit = by(x => x.startsWith(q)); if (hit.length === 1) return hit[0];
  hit = by(x => x.includes(q)); if (hit.length === 1) return hit[0];
  if (hit.length > 1) return { many: hit.slice(0, 4) };
  /* a vote with more words after it ("3 this one has to win", "the thing because it's scary"): the number, or the first words that are exactly a title */
  const num = t.match(/^#?(\d{1,3})[\s,.:;!-]+\S/); if (num) return d.movies[Number(num[1]) - 1] || null;
  const words = t.split(/\s+/); for (let n = words.length - 1; n >= 1; n--) { const q2 = plain(words.slice(0, n).join(' ')); if (!q2) continue; const h2 = by(x => x === q2); if (h2.length === 1) return h2[0]; }
  return null;
}
export function tally(d = data()) {
  const n = {}; for (const v of Object.values(d.votes)) for (const x of v.list) n[x.movie] = (n[x.movie] || 0) + 1;
  return d.movies.map((m, i) => ({ id: m.id, n: i + 1, title: m.title, by: m.by || '', votes: n[m.id] || 0 }));
}
export function leaders(d = data()) { const t = tally(d), top = Math.max(0, ...t.map(x => x.votes)); return top ? t.filter(x => x.votes === top) : []; }

/** One vote from chat (or typed in by hand). Pure on `d`: returns what happened. */
export function cast(login, name, movie, d = data(), now = Date.now()) {
  const l = low(login), o = opts(d), allowed = votesAllowed(l, d, now), mine = (d.votes[l] ||= { name: name || l, list: [], changes: 0 });
  mine.name = name || mine.name; const n = d.movies.findIndex(m => m.id === movie.id) + 1;
  if (mine.list.length < allowed) { mine.list.push({ movie: movie.id, at: now }); return { ok: true, kind: 'vote', n, left: allowed - mine.list.length, changesLeft: Math.max(0, o.changes - mine.changes), allowed }; }
  const i = mine.list.findIndex(x => x.movie !== movie.id);
  if (i < 0) { return { ok: false, why: 'same', n, allowed }; }
  if (mine.changes >= o.changes) return { ok: false, why: 'used', n, allowed };
  const from = d.movies.find(m => m.id === mine.list[i].movie); mine.list[i] = { movie: movie.id, at: now, changed: true }; mine.changes++;
  return { ok: true, kind: 'change', n, from: from ? from.title : '', left: 0, changesLeft: Math.max(0, o.changes - mine.changes), allowed };
}

let lastNo = 0;
const sayOnce = (text, gap = 15000) => { if (Date.now() - lastNo < gap) return; lastNo = Date.now(); H.say(text).catch(() => {}); };
export function state() {
  const d = data(), o = opts(d), now = Date.now();
  const right = d.guesses.filter(g => g.right === true).length, wrong = d.guesses.filter(g => g.right === false).length;
  return {
    on: on(), open: !!d.open, openedAt: d.openedAt || 0, endsAt: d.open ? d.endsAt || 0 : 0, movies: d.movies, tally: tally(d).map(t => ({ ...t, right: d.guesses.filter(g => g.movie === t.id && g.right === true).length, wrong: d.guesses.filter(g => g.movie === t.id && g.right === false).length })), leaders: leaders(d).map(x => x.title), total: Object.values(d.votes).reduce((a, v) => a + v.list.length, 0),
    voters: Object.entries(d.votes).map(([login, v]) => ({ login, name: v.name, changes: v.changes, allowed: votesAllowed(login, d, now), why: bonusWhy(login, d, now), picks: v.list.map(x => ({ n: d.movies.findIndex(m => m.id === x.movie) + 1, title: d.movies.find(m => m.id === x.movie)?.title || '(removed)', changed: !!x.changed })) })).sort((a, b) => a.name.localeCompare(b.name)),
    pending: d.guesses.filter(g => g.right == null && !g.skip).slice(0, 30), guess: { right, wrong, total: right + wrong }, guesses: d.guesses.slice(-60).reverse(),
    stats: { right: d.stats.right, wrong: d.stats.wrong, per: Object.entries(d.stats.per).map(([login, s]) => ({ login, ...s })).sort((a, b) => (b.right + b.wrong) - (a.right + a.wrong)) },
    first: d.first || '', raiders: d.raiders, extra: d.extra, birthdays: d.birthdays, bonusToday: o.bonusDays.includes(new Date(dayOf(now, d)).getDay()), dayStart: bdays.opts().dayStart, dayName: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date(dayOf(now, d)).getDay()], opts: o, pinned: d.pinnedAt || 0, pinError: d.pinError || '', past: d.past.slice(0, 30),
  };
}
export function screen() { // what the on-stream box shows
  const d = data(), s = state();
  return { type: 'mnState', show: opts(d).overlay !== false && (d.open || s.total > 0 || !!d.closedAt), open: s.open, endsAt: s.endsAt, movies: s.tally, total: s.total, guess: s.guess, leaders: s.leaders, closed: !!d.closedAt && !d.open, command: opts(d).command };
}
function changed() { save(); H.send({ type: 'movieNight' }, 'control'); H.send(screen(), 'movienight'); }

// ---- the list ----
export function setMovies(list) { // [{title, by}] or lines "Title | who asked" / "Title - who asked"
  const d = data(); if (d.open) throw new Error('Voting is open: close it first (adding one movie with ➕ still works).');
  const rows = (Array.isArray(list) ? list : String(list || '').split(/\r?\n/)).map(x => typeof x === 'string' ? (() => { const m = x.match(/^\s*(?:\d+[.)]\s*)?(.*?)\s*(?:\||\s[-–—]\s|\t)\s*(.*)$/); return m && m[1] ? { title: m[1], by: m[2] } : { title: x.replace(/^\s*\d+[.)]\s*/, ''), by: '' }; })() : x)
    .map(x => ({ title: String(x.title || '').trim().slice(0, 120), by: String(x.by || '').trim().replace(/^@/, '').slice(0, 40) })).filter(x => x.title);
  d.movies = rows.slice(0, 60).map(x => { const old = d.movies.find(m => plain(m.title) === plain(x.title)); return { id: old ? old.id : uid(), title: x.title, by: x.by }; });
  for (const v of Object.values(d.votes)) v.list = v.list.filter(x => d.movies.some(m => m.id === x.movie));
  changed(); return state();
}
export function addMovie(title, by) {
  const d = data(), t = String(title || '').trim().slice(0, 120); if (!t) throw new Error('Type the movie first.');
  if (d.movies.some(m => plain(m.title) === plain(t))) throw new Error('That movie is already on the list.');
  if (d.movies.length >= 60) throw new Error('60 movies is the most one night can have.');
  d.movies.push({ id: uid(), title: t, by: String(by || '').trim().replace(/^@/, '').slice(0, 40) }); changed(); return state();
}
export function editMovie(id, o) {
  const d = data(), i = d.movies.findIndex(m => m.id === id); if (i < 0) throw new Error("That movie isn't on the list.");
  const m = d.movies[i];
  if ('title' in o) { const t = String(o.title || '').trim().slice(0, 120); if (t) m.title = t; }
  if ('by' in o) m.by = String(o.by || '').trim().replace(/^@/, '').slice(0, 40);
  if (o.remove) { if (d.open) throw new Error("Voting is open: the numbers chat sees can't change now. Close voting first."); d.movies.splice(i, 1); for (const v of Object.values(d.votes)) v.list = v.list.filter(x => x.movie !== id); }
  if (o.dir) { if (d.open) throw new Error("Voting is open: the numbers chat sees can't change now."); const j = i + (o.dir < 0 ? -1 : 1); if (j >= 0 && j < d.movies.length) [d.movies[i], d.movies[j]] = [d.movies[j], d.movies[i]]; }
  changed(); return state();
}

// ---- the night ----
export function pinText(d = data()) {
  const o = opts(d), head = `🍿 Movie night vote! Type ${o.command} and a number: `, tail = ` (1 vote + ${o.changes} change each)`;
  for (const max of [60, 40, 28, 20, 14, 10]) {
    const t = head + d.movies.map((m, i) => `${i + 1}) ${m.title.length > max ? m.title.slice(0, max - 1).trim() + '…' : m.title}`).join('  ') + tail;
    if (t.length <= 480) return t;
  }
  return (head + d.movies.map((m, i) => `${i + 1}) ${m.title.slice(0, 9)}`).join(' ')).slice(0, 480);
}
export async function pin() {
  const d = data(); if (!d.movies.length) throw new Error('Add tonight\'s movies first.');
  try { await H.pin(pinText(d)); d.pinnedAt = Date.now(); d.pinError = ''; }
  catch (e) { d.pinError = e.message; try { await H.say(pinText(d)); } catch {} }
  changed(); return { pinned: !d.pinError, pinError: d.pinError, text: pinText(d) };
}
export async function open(yes, { quiet = false } = {}) {
  const d = data();
  if (yes) {
    if (d.movies.length < 2) throw new Error('Add at least two movies first.');
    d.open = true; d.openedAt = Date.now(); delete d.closedAt; delete d.endsAt; changed();
    H.act(`Movie night voting opened: ${d.movies.length} movies`, { icon: '🍿', kind: 'open' });
    return quiet ? { open: true } : { open: true, ...(await pin()) };
  }
  if (!d.open) return { open: false };
  d.open = false; d.closedAt = Date.now(); delete d.endsAt; changed();
  const top = leaders(d), t = tally(d), n = top[0]?.votes || 0;
  const line = !top.length ? '🍿 Voting is closed. Nobody voted!' : top.length === 1 ? `🍿 Voting is closed! Tonight's movie: ${top[0].title} (${n} vote${n === 1 ? '' : 's'})` : `🍿 Voting is closed! It's a tie at ${n}: ${top.map(x => x.title).join(' / ')}`;
  H.act(line.replace(/^🍿 /, ''), { icon: '🍿', kind: 'close', items: t.map(x => ({ label: x.title, n: x.votes })) });
  if (!quiet) H.say(line).catch(() => {});
  return { open: false, line };
}
/** ⏳ Last call (Birx: "a 5 min countdown at the end for people to change votes"): a countdown on screen; voting closes by itself at 0. */
export function lastCall(yes, mins) {
  const d = data(), o = opts(d); if (!d.open) throw new Error('Open voting first.');
  if (!yes) { if (d.endsAt) { delete d.endsAt; changed(); H.say('🍿 The countdown is off: voting stays open.').catch(() => {}); } return state(); }
  const m = Math.max(0.25, Math.min(60, Number(mins) || o.lastMins || 5)); d.endsAt = Date.now() + Math.round(m * 60000); changed();
  const word = m >= 1 ? `${Math.round(m * 10) / 10} minute${m === 1 ? '' : 's'}` : `${Math.round(m * 60)} seconds`;
  H.say(`⏳ Last call! Voting closes in ${word}. Vote or change your vote now with ${o.command} and a number.`).catch(() => {});
  H.act(`Movie night: last call, voting closes in ${word}`, { icon: '⏳', kind: 'lastcall' }); return state();
}
let warned = 0;
export function tick() { // every second from the server
  const d = db.movieNight; if (!d || !d.open || !d.endsAt) return;
  const left = d.endsAt - Date.now();
  if (left <= 0) { open(false).catch(() => {}); return; }
  if (left <= 60000 && left > 58000 && warned !== d.endsAt && opts(d).lastMins > 1) { warned = d.endsAt; H.say('⏳ One minute left to vote or change your vote!').catch(() => {}); }
}
/** A fresh night: tonight goes into the list of past nights, votes + bonus votes are wiped. The movie list is kept unless `clear`. */
export function newNight({ clear = false } = {}) {
  const d = data(), t = tally(d), total = t.reduce((a, x) => a + x.votes, 0);
  if (total || d.guesses.length) {
    const right = d.guesses.filter(g => g.right === true).length, wrong = d.guesses.filter(g => g.right === false).length;
    d.past.unshift({ at: d.openedAt || Date.now(), movies: t.map(x => ({ title: x.title, by: x.by, votes: x.votes })), winner: leaders(d).map(x => x.title).join(' / '), voters: Object.keys(d.votes).length, right, wrong }); d.past = d.past.slice(0, 100);
  }
  d.open = false; delete d.endsAt; d.votes = {}; d.guesses = []; d.raiders = []; d.extra = {}; d.first = ''; delete d.closedAt; delete d.openedAt; delete d.pinnedAt; d.pinError = '';
  if (clear) d.movies = [];
  changed(); H.act('Movie night: a new night started (votes cleared)', { icon: '🍿', kind: 'new' }); return state();
}
export function streamStart() { const d = data(); if (!on()) return; d.first = ''; d.raiders = []; save(); } // a new stream: nobody was "first in chat" or a raider yet

// ---- chat ----
export function noteChat(m) { // the first person to type in chat tonight gets two votes
  if (!on() || !m || m.self) return; const d = data(); if (d.first) return;
  const l = low(m.login); if (!l || l === low(H.me()) || m.badges?.broadcaster || H.isBot(l)) return;
  d.first = l; d.firstName = m.name || l; changed();
  H.act(`was the first one in chat: two votes for movie night`, { icon: '🍿', who: m.name || l, kind: 'first', test: !!m.pretend });
}
export function onAlert(a) { // a raid tonight = two votes for the raider
  if (!on() || !a || a.kind !== 'raid') return; const d = data(), l = low(a.login || a.name); if (!l || d.raiders.includes(l)) return;
  d.raiders.push(l); changed(); H.act(`raided: two votes for movie night`, { icon: '🍿', who: a.name || l, kind: 'raid' });
}
export function onChat(m) {
  if (!on()) return false; const d = data(), o = opts(d), cmd = low(o.command);
  const text = String(m.text || '').trim(), sp = text.split(/\s+/);
  if (!cmd || low(sp[0]) !== cmd) return false;
  if (!d.open) { if (d.movies.length && d.closedAt) sayOnce(`🍿 @${m.name || m.login} voting is closed for tonight.`); return !!d.movies.length; }
  const arg = text.slice(sp[0].length).trim(), name = m.name || m.login;
  if (!arg) { sayOnce(`🍿 @${name} type ${o.command} and the number or name of a movie (1 to ${d.movies.length}).`, 8000); return true; }
  const movie = findMovie(arg, d);
  if (!movie) { sayOnce(`🍿 @${name} I couldn't find that one. Type ${o.command} and a number from 1 to ${d.movies.length}.`, 8000); return true; }
  if (movie.many) { sayOnce(`🍿 @${name} that fits more than one (${movie.many.map(x => x.title).join(', ')}). Use the number.`, 8000); return true; }
  vote(m.login, name, movie, { via: 'chat', test: !!m.pretend, said: text, userId: m.userId || null }); return true;
}
/** Count one vote, tell chat, and queue the "did Birx guess it?" pop-up. */
export function vote(login, name, movie, { via = 'chat', test = false, quiet = false, said = '', userId = null } = {}) {
  const d = data(), o = opts(d), r = cast(login, name, movie, d);
  if (!r.ok) { if (!quiet) sayOnce(r.why === 'same' ? `🍿 @${name} you already voted for that one.` : `🍿 @${name} you've used your vote${r.allowed > 1 ? 's' : ''} and your change for tonight.`, 6000); return r; }
  const g = { id: uid(), login: low(login), name, movie: movie.id, title: movie.title, n: r.n, kind: r.kind, from: r.from || '', at: Date.now(), right: null, ...(said ? { said: String(said).slice(0, 300) } : {}), ...(test ? { test: true } : {}) };
  d.guesses.push(g); d.guesses = d.guesses.slice(-400); changed();
  H.send({ type: 'mnVote', vote: g }, 'control');
  Promise.resolve().then(() => H.info(g.login, userId, test)).then(x => { if (!x) return; if (x.avatar) g.avatar = x.avatar; if (x.followed !== undefined) g.followed = x.followed; changed(); H.send({ type: 'mnVote', vote: g, update: true }, 'control'); }).catch(() => {}); /* (their picture + how long they've followed, for the pop-up: looked up after, so the vote itself never waits) */
  H.act(r.kind === 'change' ? `changed their movie night vote to #${r.n} ${movie.title}` : `voted for #${r.n} ${movie.title}`, { icon: '🗳️', who: name, kind: 'vote', test });
  if (!quiet && o.reply !== false) H.say(r.kind === 'change' ? `🗳️ @${name} changed to #${r.n} ${movie.title}.` : `🗳️ @${name} voted for #${r.n} ${movie.title}.${r.left ? ` You have ${r.left} more vote${r.left === 1 ? '' : 's'}.` : ''}`).catch(() => {});
  return { ...r, guess: g };
}
/** Jess clicks: did Birx guess this vote? (right = true / false, null = undo, 'skip' = no guess) */
export function guess(id, right) {
  const d = data(), g = d.guesses.find(x => x.id === id); if (!g) throw new Error('That vote is gone.');
  const per = (d.stats.per[g.login] ||= { name: g.name, right: 0, wrong: 0 }); per.name = g.name;
  const undo = () => { if (g.test) return; if (g.right === true) { d.stats.right--; per.right--; } if (g.right === false) { d.stats.wrong--; per.wrong--; } };
  undo(); delete g.skip;
  if (right === 'skip') { g.right = null; g.skip = true; }
  else if (right === true || right === false) { g.right = right; if (!g.test) { if (right) { d.stats.right++; per.right++; } else { d.stats.wrong++; per.wrong++; } } }
  else g.right = null;
  if (!per.right && !per.wrong) delete d.stats.per[g.login];
  changed(); return state();
}
export function setBirthday(name, day) { bdays.set(name, day); changed(); return state(); }
export function setExtra(name, n) { const d = data(), l = low(name); if (!l) throw new Error('Type their chat name.'); const v = Math.max(0, Math.min(10, Math.round(Number(n) || 0))); if (v) d.extra[l] = v; else delete d.extra[l]; changed(); return state(); }
export function setRaider(name, yes) { const d = data(), l = low(name); if (!l) throw new Error('Type their chat name.'); d.raiders = d.raiders.filter(x => x !== l); if (yes) d.raiders.push(l); changed(); return state(); }
export function setFirst(name) { const d = data(); d.first = low(name); changed(); return state(); }
export function setOpts(o) {
  const d = data(), x = d.opts;
  if ('command' in o) { const c = String(o.command || '').trim().toLowerCase().split(/\s+/)[0]; if (/^![a-z0-9_]{2,20}$/.test(c)) x.command = c; else throw new Error('The command has to look like !vote'); }
  if ('guesser' in o) { const g = String(o.guesser || '').trim().slice(0, 20); if (g) x.guesser = g; }
  if ('changes' in o) x.changes = Math.max(0, Math.min(5, Math.round(Number(o.changes) || 0)));
  if ('reply' in o) x.reply = !!o.reply;
  if ('overlay' in o) x.overlay = !!o.overlay;
  if ('lastMins' in o) x.lastMins = Math.max(0.25, Math.min(60, Number(o.lastMins) || 5));
  changed(); return state();
}
export function clearTests() { const d = data(); for (const [l, v] of Object.entries(d.votes)) if (/^pretend_/.test(l)) delete d.votes[l]; d.guesses = d.guesses.filter(g => !g.test); d.raiders = d.raiders.filter(l => !/^pretend_/.test(l)); if (/^pretend_/.test(d.first || '')) d.first = ''; changed(); return state(); }

/** 🧪 The rules walked through with pretend people on a pretend night (nothing saved, nothing said). */
export function rulesDemo() {
  const wed = new Date(2026, 10, 11, 20).getTime(), mon = new Date(2026, 10, 9, 20).getTime(), rows = [], ok = [];
  const fresh = () => data({ movies: [{ id: 'a', title: 'Alpha' }, { id: 'b', title: 'Bravo' }, { id: 'c', title: 'Charlie' }], raiders: ['raider'], first: 'early', birthdays: { cake: '11-11', monday: '11-09' } });
  const run = (who, picks, now, want, note) => { const d = fresh(), got = picks.map(p => { const r = cast(who, who, d.movies.find(m => m.id === p), d, now); return r.ok ? r.kind : 'no (' + r.why + ')'; }); const good = got.join(', ') === want.join(', '); ok.push(good); rows.push({ who: note, tried: picks.map(p => p.toUpperCase()).join(' → '), got: got.join(', '), allowed: votesAllowed(who, d, now), ok: good }); };
  run('viewer', ['a', 'b', 'c'], wed, ['vote', 'change', 'no (used)'], 'A normal viewer');
  run('viewer', ['a', 'a'], wed, ['vote', 'no (same)'], 'A viewer voting the same movie twice');
  run('raider', ['a', 'b', 'c', 'a'], wed, ['vote', 'vote', 'change', 'no (used)'], 'Someone who raided');
  run('early', ['a', 'a', 'b'], wed, ['vote', 'vote', 'change'], 'The first one in chat');
  run('cake', ['a', 'b', 'c'], wed, ['vote', 'vote', 'change'], 'Birthday on a Wednesday');
  run('monday', ['a', 'b', 'c'], mon, ['vote', 'change', 'no (used)'], 'Birthday on a Monday (no bonus)');
  run('cake', ['a', 'b', 'c'], new Date(2026, 10, 12, 1, 30).getTime(), ['vote', 'vote', 'change'], 'Wednesday birthday, live at 1:30 AM Thursday (still counts as Wednesday)');
  run('cake', ['a', 'b', 'c'], new Date(2026, 10, 11, 1, 30).getTime(), ['vote', 'change', 'no (used)'], 'Wednesday birthday, live at 1:30 AM Wednesday (that is still Tuesday night)');
  const f = fresh(), finds = [['2', 'Bravo'], ['#3', 'Charlie'], ['alp', 'Alpha'], ['CHARLIE', 'Charlie'], ['9', null], ['zzz', null]].map(([q, want]) => { const m = findMovie(q, f), got = m && !m.many ? m.title : null; ok.push(got === want); return { typed: q, found: got || 'nothing', ok: got === want }; });
  const days = [['3/14', '03-14'], ['March 14', '03-14'], ['14 mar', '03-14'], ['12-25', '12-25'], ['banana', null]].map(([q, want]) => { const got = readDay(q); ok.push(got === want); return { typed: q, read: got || 'not a date', ok: got === want }; });
  return { ok: ok.every(Boolean), rows, finds, days };
}

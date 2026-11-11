// 🎂 Birthdays (1.96.0, Derek, every edition): viewers save their own with !bday 3/14 (never a year), the bot wishes them a happy
// birthday the first time they chat that day. Kept on this PC only. Birx & Jess's movie night uses the same list for its two-vote rule.
import { db, save } from './store.js';
import { is } from './edition.js';

const H = { say: async () => {}, act: () => {}, changed: () => {}, isBot: () => false, pop: () => {} };
export const setHooks = h => Object.assign(H, h);
const low = s => String(s || '').trim().toLowerCase().replace(/^@/, '');
const D = () => { const d = (db.bdays ||= {}); d.days ||= {}; d.at ||= {}; d.wished ||= {}; d.popped ||= {}; d.opts ||= {}; return d; };
/** dayStart: the hour a new day starts. Birx & Jess go live around 1:30 AM and count that as the day before, so theirs starts at 6 AM; everyone else's at midnight. */
export const opts = () => ({ on: true, command: '!bday', days: 30, wish: true, pop: true, popSound: true, popVol: 25, popStream: true, streamVol: 35, text: '🎂 Happy birthday, {name}! 🎉', dayStart: is('birx') ? 6 : 0, ...D().opts });
export const days = () => D().days;
export const dayOf = (now = Date.now(), o = opts()) => now - (Number(o.dayStart) || 0) * 3600000;
export const mmdd = t => { const x = new Date(t); return String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); };
const ymd = t => { const x = new Date(t); return x.getFullYear() + '-' + mmdd(t); };
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const nice = md => { const [m, dd] = String(md).split('-').map(Number); return `${MONTHS[m - 1] || '?'} ${dd}`; };
/** "3/14", "03-14", "March 14", "14 march" → "03-14" (null when it isn't a date). A year, if someone types one, is thrown away: it is never kept. */
export function readDay(s) {
  const t = String(s || '').trim().toLowerCase().replace(/[,\s\/\-.]+(?:19|20)\d\d$/, '').replace(/^(\d{1,2}\s*[\/\-.]\s*\d{1,2})\s*[\/\-.]\s*\d{2}$/, '$1').trim(); let m = t.match(/^(\d{1,2})\s*[\/\-. ]\s*(\d{1,2})$/), mo, da;
  const MON = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  if (m) { mo = +m[1]; da = +m[2]; }
  else if ((m = t.match(/^([a-z]{3,9})\.?\s+(\d{1,2})(?:st|nd|rd|th)?$/)) || (m = t.match(/^(\d{1,2})(?:st|nd|rd|th)?\s+([a-z]{3,9})\.?$/))) { const w = isNaN(+m[1]) ? m[1] : m[2], n = isNaN(+m[1]) ? m[2] : m[1]; mo = MON.indexOf(w.slice(0, 3)) + 1; da = +n; }
  if (!mo || !da || mo > 12 || da > [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][mo - 1]) return null;
  return String(mo).padStart(2, '0') + '-' + String(da).padStart(2, '0');
}
const said = new Map();
/** !bday 3/14 in chat: saves the viewer's own birthday. They can change it again after `days` days; the streamer can always change it by hand. */
export function chat(m, arg, d = D(), o = opts(), now = Date.now()) {
  const l = low(m.login), name = m.name || m.login, has = d.days[l], at = d.at[l] || 0, gap = (Number(o.days) || 0) * 86400000;
  const say = t => { if (now - (said.get(l) || 0) < 4000) return; said.set(l, now); if (said.size > 500) said.clear(); H.say(t).catch(() => {}); };
  if (!arg) { say(has ? `🎂 @${name} your birthday is saved as ${nice(has)}. To change it: ${o.command} and the date.` : `🎂 @${name} type ${o.command} and your birthday (just the month and day), like ${o.command} 3/14 or ${o.command} March 14.`); return { ok: false, why: 'empty' }; }
  const x = readDay(arg); if (!x) { say(`🎂 @${name} I couldn't read that date. Type just the month and day, like ${o.command} 3/14 or ${o.command} March 14.`); return { ok: false, why: 'date' }; }
  if (has === x) { say(`🎂 @${name} your birthday is already saved as ${nice(x)}.`); return { ok: false, why: 'same' }; }
  if (has && at && now - at < gap) { const left = Math.ceil((gap - (now - at)) / 86400000); say(`🎂 @${name} you set your birthday not long ago (${nice(has)}). You can change it again in ${left} day${left === 1 ? '' : 's'}, or ask the streamer to fix it.`); return { ok: false, why: 'wait', left }; }
  d.days[l] = x; d.at[l] = now; if (d === D()) { H.act(`${name} saved their birthday (${nice(x)})`, { who: name, kind: 'bday', test: !!m.pretend }); save(); H.changed(); }
  say(`🎂 @${name} got it: ${nice(x)}.`); return { ok: true, day: x };
}
/** Every chat message: the birthday command, and the happy-birthday wish the first time a birthday person chats that day. */
export function onChat(m, now = Date.now()) {
  const o = opts(); if (o.on === false || !m?.login) return false; const d = D(), text = String(m.text || '').trim(), sp = text.split(/\s+/);
  if (o.command && low(sp[0]) === low(o.command)) { chat(m, text.slice(sp[0].length).trim(), d, o, now); return true; }
  wish(m, d, o, now); popCheck(m, d, o, now); return false;
}
/** 🎉 (1.126.0, Derek) a birthday person chats: the first time that day the app shows a pop-up about them (with a quiet party-whistle sound); every chat of theirs that day is sent too, so an open pop-up keeps showing what they say. */
export function popCheck(m, d = D(), o = opts(), now = Date.now()) {
  const l = low(m.login), day = dayOf(now, o); if (o.pop === false || !d.days[l] || d.days[l] !== mmdd(day) || H.isBot(l)) return null;
  const key = ymd(day), first = d.popped[l] !== key;
  if (first) { d.popped ||= {}; d.popped[l] = key; if (d === D()) { for (const k of Object.keys(d.popped)) if (d.popped[k] !== key) delete d.popped[k]; save(); } }
  const msg = { login: l, name: m.name || m.login, day: nice(d.days[l]), text: String(m.text || '').slice(0, 500), first, userId: m.userId || '', test: !!m.pretend, at: now };
  if (d === D()) H.pop(msg); return msg;
}
export function wish(m, d = D(), o = opts(), now = Date.now()) {
  const l = low(m.login), day = dayOf(now, o); if (o.wish === false || !d.days[l] || d.days[l] !== mmdd(day) || H.isBot(l)) return false;
  const key = ymd(day); if (d.wished[l] === key) return false; d.wished[l] = key;
  if (d !== D()) return true;
  for (const k of Object.keys(d.wished)) if (d.wished[k] !== key) delete d.wished[k]; // only today's are worth keeping
  save(); H.say(String(o.text || '🎂 Happy birthday, {name}! 🎉').replace(/\{name\}/g, '@' + (m.name || m.login))).catch(() => {});
  H.act(`Wished ${m.name || m.login} a happy birthday`, { who: m.name || m.login, kind: 'bdayWish', test: !!m.pretend }); return true;
}
/** By hand (the streamer): no waiting time, and it doesn't start one. Empty day = remove. */
export function set(name, day) {
  const d = D(), l = low(name); if (!/^[a-z0-9_]{2,25}$/.test(l)) throw new Error('Type their chat name.');
  if (!day) { delete d.days[l]; delete d.at[l]; delete d.wished[l]; save(); H.changed(); return state(); }
  const x = readDay(day); if (!x) throw new Error('Type the birthday like 3/14 or March 14 (no year).');
  d.days[l] = x; delete d.at[l]; save(); H.changed(); return state();
}
export function setOpts(b, voteCommand = '') {
  const x = D().opts;
  if ('on' in b) x.on = !!b.on; if ('wish' in b) x.wish = !!b.wish; if ('pop' in b) x.pop = !!b.pop; if ('popSound' in b) x.popSound = !!b.popSound; if ('popStream' in b) x.popStream = !!b.popStream; if ('streamVol' in b) x.streamVol = Math.max(0, Math.min(100, Math.round(Number(b.streamVol) || 0))); if ('popVol' in b) x.popVol = Math.max(0, Math.min(100, Math.round(Number(b.popVol) || 0)));
  if ('days' in b) x.days = Math.max(0, Math.min(365, Math.round(Number(b.days) || 0)));
  if ('dayStart' in b) x.dayStart = Math.max(0, Math.min(12, Math.round(Number(b.dayStart) || 0)));
  if ('text' in b) x.text = String(b.text || '').trim().slice(0, 300) || '🎂 Happy birthday, {name}! 🎉';
  if ('command' in b) { const c = String(b.command || '').trim().toLowerCase().split(/\s+/)[0]; if (/^![a-z0-9_]{2,20}$/.test(c) && c !== voteCommand) x.command = c; else throw new Error('The command has to look like !bday'); }
  save(); H.changed(); return state();
}
export const state = (now = Date.now()) => { const d = D(), o = opts(), t = dayOf(now, o), today = mmdd(t); return { opts: o, today, dayName: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date(t).getDay()], list: Object.entries(d.days).map(([login, day]) => ({ login, day, nice: nice(day), byChat: !!d.at[login], today: day === today, wished: d.wished[login] === ymd(t) })).sort((a, b) => a.day.localeCompare(b.day) || a.login.localeCompare(b.login)) }; };
export function clearTests() { const d = D(); for (const l of Object.keys(d.days)) if (/^pretend_/.test(l)) { delete d.days[l]; delete d.at[l]; delete d.wished[l]; delete d.popped[l]; } save(); H.changed(); return state(); }
/** 🧪 walked through with pretend people (nothing saved, nothing said) */
export function demo() {
  const keep = H.say; H.say = async () => {}; const rows = [], add = (what, ok) => rows.push({ what, ok: !!ok });
  try {
    const d = { days: {}, at: {}, wished: {} }, o = { ...opts(), dayStart: 0, days: 30 }, t0 = new Date(2026, 2, 14, 20).getTime(), go = (arg, now) => { said.clear(); return chat({ login: 'newbie', name: 'Newbie' }, arg, d, o, now); };
    add('!bday March 14 saves a birthday', go('March 14', t0 - 40 * 86400000).ok && d.days.newbie === '03-14');
    add('A year is thrown away, never kept (3/14/1990 → March 14)', readDay('3/14/1990') === '03-14' && readDay('March 14, 1990') === '03-14' && !JSON.stringify(d).includes('1990'));
    const r2 = go('3/15', t0 - 35 * 86400000); add('Changing it 5 days later is refused (30-day wait)', r2.why === 'wait' && r2.left === 25);
    add("A date it can't read is refused", go('banana', t0).why === 'date' && readDay('2/30') === null);
    add('Wished happy birthday the first time they chat that day', wish({ login: 'newbie', name: 'Newbie' }, d, o, t0) === true);
    add('…and only once that day', wish({ login: 'newbie', name: 'Newbie' }, d, o, t0 + 3600000) === false);
    { const dd = { days: { newbie: mmdd(t0) }, at: {}, wished: {}, popped: {} }, a = popCheck({ login: 'newbie', name: 'Newbie', text: 'hi' }, dd, o, t0), b = popCheck({ login: 'newbie', name: 'Newbie', text: 'again' }, dd, o, t0 + 60000), c = popCheck({ login: 'newbie', name: 'Newbie', text: 'x' }, dd, o, t0 + 86400000);
      add('🎉 Pop-up: the first chat on their birthday opens it, later chats that day are added to it, not on other days', !!a && a.first === true && !!b && b.first === false && b.text === 'again' && c === null);
      add('🎉 Pop-up can be switched off', popCheck({ login: 'newbie', name: 'Newbie', text: 'hi' }, { ...dd, popped: {} }, { ...o, pop: false }, t0) === null); }
    add('No wish on other days', wish({ login: 'newbie', name: 'Newbie' }, { ...d, wished: {} }, o, t0 + 86400000) === false);
    const late = new Date(2026, 2, 15, 1, 30).getTime();
    add('Late-night rule (a new day starts at 6 AM): chatting at 1:30 AM on March 15 still counts as March 14', wish({ login: 'newbie', name: 'Newbie' }, { ...d, wished: {} }, { ...o, dayStart: 6 }, late) === true && wish({ login: 'newbie', name: 'Newbie' }, { ...d, wished: {} }, o, late) === false);
  } finally { H.say = keep; said.clear(); }
  return { ok: rows.every(r => r.ok), rows };
}

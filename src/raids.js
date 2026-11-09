// 🚀 Raid tab (1.95.0, Derek: "show everyone who is live they follow sorted by most recently raided by them. then can raid from this tab")
// The channels YOU follow that are live now, each with when YOU last raided them. Nothing is sent anywhere but Twitch.
import { db, save } from './store.js';

let hooks = { on: () => false, followed: async () => [], canSee: () => false, start: async () => {}, cancel: async () => {}, say: async () => {}, act: () => {}, changed: () => {}, signedIn: () => false };
export const setHooks = h => { hooks = { ...hooks, ...h }; };
const D = () => (db.raidsOut = db.raidsOut || {}); // { login: { id, name, at, n, viewers } }
let cache = null, fake = null, going = null; // cache {at, list}; fake = 🧪 pretend live list; going = {login, name, at, test}

/** You raided someone (from this tab, the 🚀 raid reward, or by typing /raid yourself: Twitch tells Movie Royal). */
export function note(t, { test, quiet } = {}) {
  const login = String(t?.login || '').toLowerCase(); if (!login) return null;
  if (test) return { login, at: Date.now(), test: true };
  const d = D(), was = d[login], now = Date.now();
  if (was && now - was.at < 10 * 60000) { was.viewers = t.viewers ?? was.viewers; save(); return was; } // the same raid, heard twice
  d[login] = { id: t.id || was?.id || null, name: t.name || was?.name || login, at: now, before: was?.at || 0, n: (was?.n || 0) + 1, viewers: t.viewers ?? null };
  save(); if (!quiet) hooks.act('stream', `Raided ${d[login].name}${t.viewers ? ` with ${t.viewers} viewers` : ''}`, { icon: '🚀', kind: 'raidOut' });
  if (going && going.login === login) going.done = now;
  hooks.changed(); return d[login];
}
const row = (x, d) => ({ ...x, thumb: String(x.thumb || '').replace('{width}', '440').replace('{height}', '248'), lastAt: d[x.login.toLowerCase()]?.at || 0, times: d[x.login.toLowerCase()]?.n || 0 });
export const SORTS = ['recent', 'oldest', 'viewers', 'fewest', 'az'];
export function sortRows(rows, sort = 'recent') {
  const r = [...rows], v = (a, b) => b.viewers - a.viewers;
  if (sort === 'viewers') return r.sort(v);
  if (sort === 'fewest') return r.sort((a, b) => a.viewers - b.viewers);
  if (sort === 'az') return r.sort((a, b) => a.name.localeCompare(b.name));
  if (sort === 'oldest') return r.sort((a, b) => (a.lastAt || 0) - (b.lastAt || 0) || v(a, b)); // never raided first, then the longest ago
  return r.sort((a, b) => (b.lastAt || 0) - (a.lastAt || 0) || v(a, b)); // the ones you raided most recently first, then never raided by viewers
}
export async function list({ fresh, sort } = {}) {
  const d = D(), base = { on: true, sort: SORTS.includes(sort) ? sort : (db.settings.raidSort || 'recent'), going: going && Date.now() - going.at < 120000 && !going.done ? going : null, history: Object.entries(d).map(([login, x]) => ({ login, ...x })).sort((a, b) => b.at - a.at).slice(0, 30) };
  if (fake) return { ...base, test: true, signedIn: true, canSee: true, at: Date.now(), rows: sortRows(fake.map(x => row(x, { ...d, ...fakeLast })), base.sort) };
  if (!hooks.signedIn()) return { ...base, signedIn: false, canSee: false, rows: [] };
  if (!hooks.canSee()) return { ...base, signedIn: true, canSee: false, rows: [] };
  if (fresh || !cache || Date.now() - cache.at > 45000) cache = { at: Date.now(), list: await hooks.followed() };
  return { ...base, signedIn: true, canSee: true, at: cache.at, rows: sortRows(cache.list.map(x => row(x, d)), base.sort) };
}
export function setSort(sort) { if (!SORTS.includes(sort)) throw new Error('Pick one of the ways to sort.'); db.settings.raidSort = sort; save(); return sort; }
/** 🚀 Start the raid. Twitch then counts down about 90 seconds (or you press Raid Now on Twitch); ✖ Cancel stops it. */
export async function start({ id, login, name }) {
  login = String(login || '').toLowerCase(); if (!login) throw new Error('Pick a channel to raid.');
  const test = !!fake && fake.some(x => x.login === login);
  if (!test) { if (!id) throw new Error("That channel isn't in the live list any more. Press 🔄 and try again."); await hooks.start(id); }
  going = { login, name: name || login, id, at: Date.now(), test };
  if (test) fakeLast[login] = { at: Date.now(), n: (fakeLast[login]?.n || 0) + 1 };
  else { note({ id, login, name }); hooks.say(`🚀 RAID! We're heading to ${name || login}: twitch.tv/${login} 💜`).catch(() => {}); }
  hooks.changed(); return { ok: true, test, going };
}
export async function cancel() {
  const g = going; if (!g) throw new Error('No raid is on its way.');
  if (!g.test) { await hooks.cancel(); const d = D(), x = d[g.login]; if (x && Date.now() - x.at < 3 * 60000) { if (x.n > 1 && x.before) { x.n--; x.at = x.before; } else delete d[g.login]; save(); } }
  else delete fakeLast[g.login];
  going = null; hooks.changed(); return { ok: true };
}
export function forget(login) { const d = D(); delete d[String(login || '').toLowerCase()]; save(); hooks.changed(); return { ok: true }; }

// 🧪 pretend live channels (nothing is asked from or sent to Twitch; nothing is saved)
let fakeLast = {};
const FAKES = [['pretend_pixelpal', 'Pretend PixelPal', 'Speedrunning the tutorial', 'Retro', 212], ['pretend_cozycat', 'Pretend CozyCat', 'Late night chill + chat', 'Just Chatting', 48], ['pretend_bossrush', 'Pretend BossRush', 'No-hit attempts!', 'Action', 1204], ['pretend_tinystream', 'Pretend TinyStream', 'First stream back', 'Indie', 6], ['pretend_moviebuff', 'Pretend MovieBuff', 'Bad movie marathon', 'Watch Party', 97]];
export function pretend(on) {
  if (!on) { fake = null; fakeLast = {}; going = going?.test ? null : going; hooks.changed(); return { ok: true, off: true }; }
  const now = Date.now(); fake = FAKES.map(([login, name, title, game, viewers], i) => ({ id: 'pretend' + i, login, name, title, game, viewers, startedAt: now - (i + 1) * 37 * 60000, thumb: '' }));
  fakeLast = { pretend_cozycat: { at: now - 2 * 86400000, n: 3 }, pretend_bossrush: { at: now - 40 * 86400000, n: 1 }, pretend_moviebuff: { at: now - 9 * 86400000, n: 2 } };
  hooks.changed(); return { ok: true, n: fake.length };
}
export const pretending = () => !!fake;
/** 🧪 the sorting rule, walked through (nothing saved) */
export function sortDemo() {
  const rows = [{ name: 'Never raided, 500 watching', viewers: 500, lastAt: 0 }, { name: 'Raided yesterday', viewers: 20, lastAt: Date.now() - 86400000 }, { name: 'Raided a month ago', viewers: 900, lastAt: Date.now() - 30 * 86400000 }, { name: 'Never raided, 10 watching', viewers: 10, lastAt: 0 }];
  const want = { recent: ['Raided yesterday', 'Raided a month ago', 'Never raided, 500 watching', 'Never raided, 10 watching'], oldest: ['Never raided, 500 watching', 'Never raided, 10 watching', 'Raided a month ago', 'Raided yesterday'], viewers: ['Raided a month ago', 'Never raided, 500 watching', 'Raided yesterday', 'Never raided, 10 watching'] };
  const out = Object.keys(want).map(k => { const got = sortRows(rows, k).map(r => r.name); return { sort: k, got, ok: got.join('|') === want[k].join('|') }; });
  return { ok: out.every(o => o.ok), out };
}

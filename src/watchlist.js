// 📋 Movie watchlist (1.133.0, Derek for Birx & Jess): their IMDb watchlist + their IMDb ratings, brought in from IMDb's own export files.
// Chat can suggest a movie (it lands on the watchlist here, unless it's already on it or already rated) and ask what a movie was rated.
// IMDb gives apps no way to ADD to someone's watchlist, so a suggestion is marked "not on IMDb yet": the History tab has a button that
// opens the movie's IMDb page, where the streamer clicks IMDb's own Watchlist button. Nothing here signs in to IMDb.
import { db, save } from './store.js';

let H = { details: async () => undefined, linkOk: () => true, read: async () => { throw new Error('Reading IMDb is not set up.'); }, on: () => false, say: async () => {}, allowed: () => true, lookup: async () => null, act: () => {}, send: () => {}, isBot: () => false, names: () => 'They' };
export const setHooks = h => { H = { ...H, ...h }; };
const uid = () => 'w' + Date.now().toString(36) + Math.floor(Math.random() * 1e5).toString(36);
const low = s => String(s || '').trim().toLowerCase();
/** A title for comparing: no accents, no punctuation, no "(1999)" at the end. */
export const norm = t => String(t || '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s*\(\d{4}\)\s*$/, '').replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, ' ').trim();
export const yearOf = t => { const m = /\((\d{4})\)\s*$/.exec(String(t || '')); return m ? m[1] : ''; };
const bare = t => String(t || '').replace(/\s*\(\d{4}\)\s*$/, '').trim();

export function data(d = (db.watch ||= {})) { d.list ||= []; d.rated ||= []; d.opts ||= {}; return d; }
export const opts = (d = data()) => ({ command: '!suggest', rateCommand: '!rating', perm: 'all', perUser: 0, reply: true, cd: 0, listUrl: '', ratedUrl: '', auto: true, ...d.opts });
export function setOpts(b) {
  const d = data(), x = d.opts;
  for (const k of ['command', 'rateCommand']) if (k in b) { let c = low(b[k]).replace(/\s+/g, ''); if (c && !c.startsWith('!')) c = '!' + c; x[k] = c.slice(0, 25); }
  if ('perm' in b) x.perm = ['all', 'followers', 'subs', 'vips', 'mods'].includes(b.perm) ? b.perm : 'all';
  if ('perUser' in b) x.perUser = Math.max(0, Math.min(50, Math.round(Number(b.perUser) || 0)));
  if ('reply' in b) x.reply = !!b.reply; if ('auto' in b) x.auto = !!b.auto;
  for (const k of ['listUrl', 'ratedUrl']) if (k in b) { const v = String(b[k] || '').trim(); if (v && !H.linkOk(v)) throw new Error("That isn't an IMDb watchlist or ratings link. It looks like imdb.com/user/…/watchlist (or …/ratings)."); x[k] = v.slice(0, 200); }
  changed(); return state();
}
function changed() { save(); H.send({ type: 'watchlist' }, 'control'); }

/** Is this the same movie? By IMDb id when both have one, else by name (and by year when both have a year). */
export function same(a, b) {
  if (a.imdb && b.imdb) return a.imdb === b.imdb;
  if (norm(a.title) !== norm(b.title) || !norm(a.title)) return false;
  return !(a.year && b.year) || String(a.year) === String(b.year);
}
export const onList = (m, d = data()) => d.list.find(x => same(x, m)) || null;
export const ratedAs = (m, d = data()) => d.rated.find(x => same(x, m)) || null;
/** Find a movie by what someone typed: the exact name first, then a name that starts with it, then one that has it (only when just one fits). */
export function findIn(arr, q) {
  const n = norm(q), y = yearOf(q); if (!n) return null; const fit = x => !y || !x.year || String(x.year) === y;
  const ex = arr.filter(x => norm(x.title) === n && fit(x)); if (ex.length) return ex.sort((a, b) => (b.at || 0) - (a.at || 0))[0];
  const st = arr.filter(x => norm(x.title).startsWith(n + ' ') && fit(x)); if (st.length === 1) return st[0];
  const inn = n.length >= 4 ? arr.filter(x => (' ' + norm(x.title) + ' ').includes(' ' + n + ' ') && fit(x)) : []; return inn.length === 1 ? inn[0] : null;
}

/* ---- IMDb's export files (Your watchlist → Export, Your ratings → Export): a CSV with a header row ---- */
export function csvRows(text) {
  const rows = []; let row = [], cell = '', q = false; const s = String(text || '').replace(/^﻿/, '');
  for (let i = 0; i < s.length; i++) { const c = s[i];
    if (q) { if (c === '"') { if (s[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; }
    else if (c === '"') q = true; else if (c === ',') { row.push(cell); cell = ''; } else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; } else if (c !== '\r') cell += c; }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter(r => r.some(x => String(x).trim()));
}
/** Reads an IMDb export. kind 'auto' = a ratings file when it has ratings and no list position, else a watchlist. Plain lines (one movie per line) work too. */
export function readFile(text, kind = 'auto') {
  const rows = csvRows(text); if (!rows.length) return { kind: kind === 'auto' ? 'watch' : kind, items: [], note: 'The file is empty.' };
  const head = rows[0].map(h => low(h)), col = (...names) => head.findIndex(h => names.includes(h));
  const cId = col('const', 'imdb id', 'tconst'), cT = col('title', 'original title', 'name'), cY = col('year', 'release year'), cR = col('your rating', 'rating', 'my rating'), cD = col('date rated', 'created', 'date added'), cType = col('title type', 'type'), cPos = col('position'), cG = col('genres', 'genre'), cDir = col('directors', 'director'), cIR = col('imdb rating');
  if (cT < 0 && cId < 0) { /* no header we know: one movie per line, "Name (1999)" or "Name | 8" */
    const items = String(text).split(/\r?\n/).map(l => l.trim()).filter(Boolean).map(l => { const [t, r] = l.split('|').map(x => x.trim()); return { title: bare(t), year: yearOf(t), imdb: '', rate: Number(r) > 0 ? Math.min(10, Number(r)) : null, at: 0 }; }).filter(x => x.title);
    const k = kind === 'auto' ? (items.some(x => x.rate) ? 'rated' : 'watch') : kind; return { kind: k, items: k === 'rated' ? items.filter(x => x.rate) : items, note: 'No header row found: read it as one movie per line.' };
  }
  const items = [], skipped = [];
  for (const r of rows.slice(1)) {
    const title = bare(cT >= 0 ? r[cT] : ''), imdb = cId >= 0 && /^tt\d+$/.test(String(r[cId]).trim()) ? String(r[cId]).trim() : ''; if (!title && !imdb) continue;
    const type = cType >= 0 ? low(r[cType]) : ''; if (type && !/movie|film|video|special|short/.test(type)) { skipped.push(title); continue; } /* (TV series / episodes / games are left out: this is a movie list) */
    const rate = cR >= 0 && Number(r[cR]) > 0 ? Math.min(10, Number(r[cR])) : null, dv = cD >= 0 ? String(r[cD]).trim() : '', at = dv ? Date.parse(/^\d{4}-\d{2}-\d{2}$/.test(dv) ? dv + 'T12:00:00' : dv) || 0 : 0; /* (a bare date is that day here, not the evening before) */
    const extra = { ...(cG >= 0 && String(r[cG]).trim() ? { g: String(r[cG]).trim().slice(0, 120) } : {}), ...(cDir >= 0 && String(r[cDir]).trim() ? { dir: String(r[cDir]).trim().slice(0, 120) } : {}), ...(cIR >= 0 && Number(r[cIR]) > 0 ? { ir: Math.round(Number(r[cIR]) * 10) / 10 } : {}) }; /* 🎲 genres, director and IMDb's own rating ride along for "help me pick" */
    items.push({ ...extra, title: title || imdb, year: cY >= 0 && /^\d{4}/.test(String(r[cY]).trim()) ? String(r[cY]).trim().slice(0, 4) : '', imdb, rate, at });
  }
  const k = kind === 'auto' ? (cPos < 0 && cR >= 0 && items.length && items.filter(x => x.rate).length >= items.length * .8 ? 'rated' : 'watch') : kind;
  return { kind: k, items: k === 'rated' ? items.filter(x => x.rate) : items, skipped: skipped.length, note: skipped.length ? `${skipped.length} that aren't movies (TV shows, episodes…) were left out.` : '' };
}
/** Bring a read file in. Watchlist: movies new to the list are added as "on IMDb"; ones already here are marked on IMDb. Ratings: kept by movie; a rated movie comes off the watchlist. */
export function applyImport(p, { replace = false, d = data(), quiet = false } = {}) {
  const r = { kind: p.kind, added: 0, same: 0, onImdb: 0, offList: 0, total: p.items.length };
  if (p.kind === 'rated') {
    if (replace) d.rated = [];
    for (const it of p.items) { const have = ratedAs(it, d); if (have) { if (have.rate !== it.rate || (!have.imdb && it.imdb)) { have.rate = it.rate; have.imdb ||= it.imdb; have.year ||= it.year; } r.same++; } else { d.rated.push({ title: it.title, year: it.year, imdb: it.imdb, rate: it.rate, at: it.at || Date.now() }); r.added++; } }
    const before = d.list.length; d.list = d.list.filter(x => !ratedAs(x, d)); r.offList = before - d.list.length; /* watched = no longer "to watch" */
  } else {
    if (replace) d.list = d.list.filter(x => !x.onImdb);
    for (const it of p.items) { const have = onList(it, d); if (have) { if (!have.onImdb) { have.onImdb = true; r.onImdb++; } have.imdb ||= it.imdb; have.year ||= it.year; for (const k of ['g', 'dir', 'ir']) if (it[k] && !have[k]) have[k] = it[k]; r.same++; } else if (ratedAs(it, d)) r.offList++; else { d.list.push({ ...(it.g ? { g: it.g } : {}), ...(it.dir ? { dir: it.dir } : {}), ...(it.ir ? { ir: it.ir } : {}), id: uid(), title: it.title, year: it.year, imdb: it.imdb, by: '', login: '', at: it.at || Date.now(), src: 'imdb', onImdb: true }); r.added++; } }
  }
  if (d === data()) { d[p.kind === 'rated' ? 'ratedAt' : 'listAt'] = Date.now(); if (!quiet) H.act(p.kind === 'rated' ? `IMDb ratings brought in: ${r.added} new, ${r.same} already there` : `IMDb watchlist brought in: ${r.added} new, ${r.same} already there`, { kind: 'watchImport' }); changed(); }
  return r;
}

/** 🔄 Read the IMDb links again (their public watchlist + ratings pages) and bring in what's new. Only ever ADDS: a page that loaded half never removes anything. */
let syncing = false;
export async function sync(why = 'you') {
  const d = data(), o = opts(d); if (syncing) return { busy: true }; if (!o.listUrl && !o.ratedUrl) throw new Error('Paste your IMDb watchlist link or ratings link first.');
  syncing = true; const out = { at: Date.now(), why }; H.send({ type: 'watchlist', syncing: true }, 'control');
  try { for (const [k, url] of [['rated', o.ratedUrl], ['list', o.listUrl]]) { if (!url) continue;
      try { const p = await H.read(url); if (!p.items.length) throw new Error(p.seen ? `the page loaded (${p.seen} movies), but no ratings could be read from it. Use the Export file for now [${p.shape || ""}]` : 'no movies were found on that page (is it public on IMDb?)'); const r = applyImport({ kind: p.kind, items: p.items }, { quiet: true }); out[k] = { n: p.items.length, pages: p.pages || 1, added: r.added, offList: r.offList || 0, onImdb: r.onImdb || 0 }; }
      catch (e) { const t = String(e.message || e); out[k] = { err: (/fetch failed|ENOTFOUND|ECONN|timed? ?out|aborted/i.test(t) ? "couldn't reach IMDb (no internet, or IMDb refused the app)" : t).slice(0, 420) }; } }
  } finally { syncing = false; }
  d.sync = out; const added = (out.list?.added || 0) + (out.rated?.added || 0); if (added) H.act(`IMDb read again: ${out.list?.added || 0} new on the watchlist, ${out.rated?.added || 0} new rating${out.rated?.added === 1 ? '' : 's'}`, { kind: 'watchSync' }); changed(); return out;
}
/** Someone suggests a movie (chat, or the streamer by hand). Refused when it's on the watchlist or already rated. */
export async function suggest(m, text, { hand = false, test = false, d = data(), lookup = H.lookup } = {}) {
  const o = opts(d), typed = String(text || '').trim().slice(0, 120); if (!bare(typed)) return { ok: false, why: 'empty' };
  let it = { title: bare(typed), year: yearOf(typed), imdb: '' };
  const quick = ratedAs(it, d) || findIn(d.rated, typed); if (quick) return { ok: false, why: 'rated', movie: quick };
  const here = onList(it, d) || findIn(d.list, typed); if (here) return { ok: false, why: 'dupe', movie: here };
  if (!hand && o.perUser) { const n = d.list.filter(x => x.login && x.login === low(m.login) && !x.onImdb).length; if (n >= o.perUser) return { ok: false, why: 'limit', n }; }
  let found = null; try { found = await lookup(it.title, it.year); } catch {} /* the real name, year and IMDb id (when a movie key is set up) */
  if (found && found.title) { it = { title: found.title, year: found.year || it.year, imdb: found.imdb || '' }; const r2 = ratedAs(it, d); if (r2) return { ok: false, why: 'rated', movie: r2 }; const h2 = onList(it, d); if (h2) return { ok: false, why: 'dupe', movie: h2 }; }
  const row = { id: uid(), title: it.title, year: it.year, imdb: it.imdb, by: m.name || m.login || '', login: low(m.login), at: Date.now(), src: hand ? 'hand' : 'chat', onImdb: false, found: !!found, ...(test ? { test: true } : {}) };
  d.list.push(row); if (row.login) { (d.sugg ||= []).push({ title: row.title, year: row.year, imdb: row.imdb, login: row.login, name: row.by, at: row.at, ...(test ? { test: true } : {}) }); if (d.sugg.length > 5000) d.sugg.splice(0, d.sugg.length - 5000); }
  if (d === data()) { H.act(`${row.by || 'You'} suggested a movie for the watchlist: ${row.title}${row.year ? ` (${row.year})` : ''}`, { who: row.by, kind: 'watchSuggest', test }); changed(); }
  return { ok: true, movie: row };
}
const nice = x => `${x.title}${x.year ? ` (${x.year})` : ''}`;
/** What `!rating a movie` answers. */
export function ratingText(q, name, d = data()) {
  const o = opts(d), who = H.names(); if (!bare(q)) return `🎬 @${name} type ${o.rateCommand} and a movie's name to see what ${who} rated it.`;
  const r = findIn(d.rated, q); if (r) return `⭐ @${name} ${who} rated ${nice(r)} ${r.rate}/10 on IMDb.`;
  const w = findIn(d.list, q); if (w) return `📋 @${name} ${nice(w)} isn't rated yet: it's on the watchlist${w.by ? ` (suggested by ${w.by})` : ''}.`;
  return `🎬 @${name} no rating found for “${bare(q).slice(0, 60)}”.${o.command ? ` Not watched yet? Suggest it with ${o.command} ${bare(q).slice(0, 40)}` : ''}`;
}
let lastSay = {};
export async function onChat(m) {
  if (!H.on() || !m || !m.text) return false; const d = data(), o = opts(d), t = String(m.text).trim(), w = low(t.split(/\s+/)[0]), arg = t.slice(w.length).trim(), name = m.name || m.login;
  const say = s => (o.reply ? H.say(s).catch(() => {}) : null);
  if (o.rateCommand && w === o.rateCommand) { say(ratingText(arg, name, d)); return true; }
  if (!o.command || w !== o.command) return false;
  if (!arg) { say(`📋 @${name} suggest a movie for the watchlist: ${o.command} and the movie's name (add the year if there are several, like ${o.command} Dune (1984)).`); return true; }
  if (!(await H.allowed(m, o.perm))) { const k = 'perm'; if (Date.now() - (lastSay[k] || 0) > 60000) { lastSay[k] = Date.now(); say(`📋 @${name} suggesting movies is for ${{ followers: 'followers', subs: 'subs', vips: 'VIPs', mods: 'mods' }[o.perm] || 'everyone'}.`); } return true; }
  const r = await suggest(m, arg, { test: !!m.pretend });
  if (r.ok) say(`📋 @${name} added ${nice(r.movie)} to the watchlist. Thanks!`);
  else if (r.why === 'rated') say(`⭐ @${name} ${H.names()} already watched ${nice(r.movie)}: rated ${r.movie.rate}/10.`);
  else if (r.why === 'dupe') say(`📋 @${name} ${nice(r.movie)} is already on the watchlist${r.movie.by ? ` (suggested by ${r.movie.by})` : ''}.`);
  else if (r.why === 'limit') say(`📋 @${name} you already have ${r.n} suggestion${r.n === 1 ? '' : 's'} waiting: that's the most for one person.`);
  return true;
}

/* 🎲 (1.134.0, Derek: "type in a subject, genre, year, decade, actor, director, suggester name and it will give me a list of 20 movies in the watchlist to choose from") */
/** What the words typed mean: a decade (80s, 1990s), a year or a span of years (1984, 1990-1995), and words that must all be found somewhere on the movie. */
export function readQuery(q) {
  let t = ' ' + String(q || '').toLowerCase() + ' ', from = 0, to = 0;
  t = t.replace(/\b((?:19|20)\d{2})\s*(?:-|–|to)\s*((?:19|20)\d{2})\b/, (_, a, b) => { from = Math.min(+a, +b); to = Math.max(+a, +b); return ' '; });
  if (!from) t = t.replace(/\b((?:19|20)\d)0'?s\b/, (_, a) => { from = +(a + '0'); to = from + 9; return ' '; });
  if (!from) t = t.replace(/(^|\s)(\d)0'?s\b/, (_, s, a) => { from = (+a >= 3 ? 1900 : 2000) + +a * 10; to = from + 9; return ' '; }); /* 80s = the 1980s, 10s = the 2010s */
  if (!from) t = t.replace(/\b((?:19|20)\d{2})\b/, (_, a) => { from = to = +a; return ' '; });
  return { from, to, words: norm(t).split(' ').filter(w => w && !['the', 'a', 'an', 'of', 'and', 'movies', 'movie', 'films', 'film', 'from', 'with', 'by', 'in', 'about'].includes(w)) };
}
const hay = x => ' ' + norm([x.title, x.g, x.dir, x.act, x.plot, x.by].filter(Boolean).join(' ')) + ' ';
/** Up to n watchlist movies that fit, in a mixed-up order (ask again for another 20). `skip` = titles already on tonight's list. */
/** `web` = what a quick online look-up found for some of the typed words (1.135.0): [{label, words[], movies[{title, year}]}]. Those words count as found when the movie is in that list
 *  (an actor's or director's films, movies about a subject), even before its own actors / plot have come in. */
export function pick(q, { n = 20, skip = [], d = data(), rnd = Math.random, web = [] } = {}) {
  const Q = readQuery(q), out = new Set(skip.map(norm));
  const groups = web.map(g => ({ label: g.label, words: g.words, ny: new Set(g.movies.map(m => norm(m.title) + '|' + (m.year || ''))), nn: new Set(g.movies.map(m => norm(m.title))), hits: 0 }));
  const inGroup = (g, x) => (x.year ? g.ny.has(norm(x.title) + '|' + x.year) : g.nn.has(norm(x.title))), used = new Set(groups.flatMap(g => g.words)), rest = Q.words.filter(w => !used.has(w));
  const fits = d.list.filter(x => { if (out.has(norm(x.title))) return false; if (Q.from && !(Number(x.year) >= Q.from && Number(x.year) <= Q.to)) return false; if (!Q.words.length) return true; const h = hay(x); x._via = [];
    if (!rest.every(w => h.includes(' ' + w))) return false;
    for (const g of groups) { if (inGroup(g, x)) x._via.push(g.label); else if (!g.words.every(w => h.includes(' ' + w))) return false; } return true; });
  for (const x of fits) for (const g of groups) if ((x._via || []).includes(g.label)) g.hits++;
  const want = Math.max(1, Math.min(50, n)), mix = arr => arr.map(x => [rnd(), x]).sort((a, b) => a[0] - b[0]).map(a => a[1]);
  const mixed = mix(fits).slice(0, want), got = new Set(mixed.map(x => x.id)), tier = new Map(), why = new Map();
  /* 🎲 (1.137.0, Derek: "try to give at least 20") not enough that fit everything → movies that fit PART of it (most parts first), then ones like the picks (same genre), then anything else on the watchlist */
  if (mixed.length < want && (Q.words.length || Q.from)) {
    const parts = [...rest.map(w => ({ label: w, ok: (x, h) => h.includes(' ' + w) })), ...groups.map(g => ({ label: g.label, ok: (x, h) => inGroup(g, x) || g.words.every(w => h.includes(' ' + w)) })), ...(Q.from ? [{ label: Q.from === Q.to ? String(Q.from) : `${Q.from}–${Q.to}`, ok: x => Number(x.year) >= Q.from && Number(x.year) <= Q.to }] : [])];
    const close = []; for (const x of d.list) { if (got.has(x.id) || out.has(norm(x.title))) continue; const h = hay(x), hit = parts.filter(p => p.ok(x, h)); if (hit.length) close.push([hit.length + rnd() * .5, x, hit.map(p => p.label)]); }
    close.sort((a, b) => b[0] - a[0]); for (const [, x, labels] of close) { if (mixed.length >= want) break; mixed.push(x); got.add(x.id); tier.set(x.id, 1); why.set(x.id, labels); }
  }
  if (mixed.length < want) {
    const gs = new Set(mixed.flatMap(x => String(x.g || '').toLowerCase().split(/,\s*/).filter(Boolean))), left = d.list.filter(x => !got.has(x.id) && !out.has(norm(x.title)));
    const like = gs.size ? left.filter(x => String(x.g || '').toLowerCase().split(/,\s*/).some(g => gs.has(g))) : [], likeIds = new Set(like.map(x => x.id));
    for (const x of [...mix(like), ...mix(left.filter(x => !likeIds.has(x.id)))]) { if (mixed.length >= want) break; mixed.push(x); got.add(x.id); tier.set(x.id, likeIds.has(x.id) ? 2 : 3); }
  }
  const res = { total: fits.length, query: Q, web: groups.map(g => ({ label: g.label, n: g.hits, found: g.nn.size })), list: mixed.map(x => ({ id: x.id, title: x.title, year: x.year || '', by: x.by || '', g: x.g || '', dir: x.dir || '', act: x.act || '', plot: x.plot || '', ir: x.ir || 0, onImdb: !!x.onImdb, via: x._via || [], tier: tier.get(x.id) || 0, fit: why.get(x.id) || [], link: imdbLink(x) })), info: infoCount(d) };
  for (const x of d.list) delete x._via; return res;
}
export const infoCount = (d = data()) => ({ all: d.list.length, have: d.list.filter(x => x.act || x.plot).length, tried: d.list.filter(x => x.infoAt).length });
/** Fills in what the movies are about (actors, plot, genres, director) a few at a time, so the search can find them. Each movie is asked for once a month at most. */
let filling = false;
export async function fillInfo(max = 40) {
  if (filling || !H.on()) return 0; const d = data(), todo = d.list.filter(x => !(x.act || x.plot) && !(x.infoAt && Date.now() - x.infoAt < 30 * 864e5)).slice(0, max); if (!todo.length) return 0;
  filling = true; let n = 0;
  try { for (const x of todo) { let f; try { f = await H.details({ imdb: x.imdb, title: x.title, year: x.year }); } catch { break; } if (f === undefined) break; /* no movie key: nothing to ask */
      x.infoAt = Date.now(); if (f) { x.g = f.genres || x.g || ''; x.dir = f.directors || x.dir || ''; x.act = f.actors || ''; x.plot = f.plot || ''; if (f.rating) x.ir = f.rating; x.year ||= f.year; x.imdb ||= f.imdb; n++; } await new Promise(r => setTimeout(r, 350)); }
  } finally { filling = false; }
  save(); return n;
}
/** 🍿 Who suggested this movie (for movie night's "who asked" box): only an exact name match counts. */
export function suggestedBy(title) { const d = data(), n = norm(title), y = yearOf(title); if (!n) return ''; const x = d.list.filter(m => m.by && norm(m.title) === n && (!y || !m.year || String(m.year) === y)).sort((a, b) => b.at - a.at)[0]; return x ? x.by : ''; }
export function edit(b) {
  if (b.all) { const d = data(), n = d.list.filter(x => !x.onImdb).length; if (b.all === 'added') for (const x of d.list) x.onImdb = true; else if (b.all === 'remove') d.list = d.list.filter(x => x.onImdb); else throw new Error('Unknown action'); if (n) H.act(b.all === 'added' ? `${n} watchlist suggestion${n === 1 ? '' : 's'} marked as added on IMDb` : `${n} watchlist suggestion${n === 1 ? '' : 's'} removed`, { kind: 'watchAll' }); changed(); return { ...state(), n }; } /* ✅ All added / 🗑 Remove all (the suggestions only) */
  const d = data(), x = d.list.find(y => y.id === b.id); if (!x) throw new Error("That movie isn't on the watchlist any more.");
  if (b.remove) d.list = d.list.filter(y => y !== x);
  else { if ('onImdb' in b) x.onImdb = !!b.onImdb; if ('title' in b && bare(b.title)) { x.title = bare(b.title); x.year = yearOf(b.title) || x.year; } if ('by' in b) x.by = String(b.by || '').trim().slice(0, 40); }
  changed(); return state();
}
/** Where the "Add on IMDb" button goes: the movie's own page when its id is known, else IMDb's search for it. */
export const imdbLink = x => (x.imdb ? `https://www.imdb.com/title/${x.imdb}/` : `https://www.imdb.com/find/?s=tt&ttype=ft&q=${encodeURIComponent(x.title + (x.year ? ' ' + x.year : ''))}`);
/* 🙋 (1.138.0) Who suggested what, kept for good (a movie leaves the watchlist once it's rated, but the suggestion stays): for profiles and the chat stats. */
const suggLog = d => { if (!d.suggFilled) { d.suggFilled = true; d.sugg ||= []; for (const x of d.list) if (x.login && !d.sugg.some(s => s.login === x.login && same(s, x))) d.sugg.push({ title: x.title, year: x.year, imdb: x.imdb, login: x.login, name: x.by, at: x.at, ...(x.test ? { test: true } : {}) }); } return d.sugg || []; };
/** One person's suggestions, newest first: each with where it stands now (rated with the rating / on the watchlist / waiting / taken off). */
export function mine(login, d = data()) {
  const k = low(login); if (!k) return [];
  return suggLog(d).filter(s => s.login === k).sort((a, b) => b.at - a.at).map(s => { const r = ratedAs(s, d), l = r ? null : onList(s, d); return { title: s.title, year: s.year || '', at: s.at, test: !!s.test, rate: r ? r.rate : 0, where: r ? 'rated' : l ? (l.onImdb ? 'list' : 'waiting') : 'gone' }; });
}
/** For the chat stats: who suggested the most, and how many of everyone's suggestions got watched. */
export function suggStats(skip = () => false, d = data()) {
  const per = new Map(); let all = 0, watched = 0;
  for (const s of suggLog(d)) { if (skip(s.login, s)) continue; all++; const r = ratedAs(s, d); if (r) watched++; const p = per.get(s.login) || { login: s.login, name: s.name || s.login, n: 0, watched: 0 }; p.n++; if (r) p.watched++; if (s.name) p.name = s.name; per.set(s.login, p); }
  return { all, watched, top: [...per.values()].sort((a, b) => b.n - a.n || b.watched - a.watched).slice(0, 25) };
}
export function clearTests() { const d = data(), n = d.list.length; d.list = d.list.filter(x => !x.test); if (d.sugg) d.sugg = d.sugg.filter(x => !x.test); if (d.list.length !== n) changed(); return n - d.list.length; }
export function state() {
  const d = data(), o = opts(d), row = x => { const { plot, act, ...r } = x; return { ...r, link: imdbLink(x) }; };
  return { on: H.on(), opts: o, names: H.names(), sync: d.sync || null, syncing, listAt: d.listAt || 0, ratedAt: d.ratedAt || 0,
    waiting: d.list.filter(x => !x.onImdb).sort((a, b) => b.at - a.at).map(row), list: d.list.filter(x => x.onImdb).sort((a, b) => a.title.localeCompare(b.title)).map(row),
    rated: [...d.rated].sort((a, b) => (b.at || 0) - (a.at || 0)), counts: { waiting: d.list.filter(x => !x.onImdb).length, list: d.list.filter(x => x.onImdb).length, rated: d.rated.length } };
}

/** 🧪 A walk-through on pretend lists: nothing is saved, nothing is said in chat. */
export async function demo() {
  const d = { list: [], rated: [], opts: {} }, rows = [], add = (what, ok, got) => rows.push({ what, ok: !!ok, got: got == null ? '' : String(got) });
  const WL = 'Position,Const,Created,Modified,Description,Title,URL,Title Type,IMDb Rating,Runtime (mins),Year,Genres,Num Votes,Release Date,Directors,Your Rating,Date Rated\n1,tt0084787,2026-01-02,2026-01-02,,The Thing,https://www.imdb.com/title/tt0084787/,Movie,8.2,109,1982,Horror,1,1982-06-25,John Carpenter,,\n2,tt0088930,2026-01-03,2026-01-03,,Clue,https://www.imdb.com/title/tt0088930/,Movie,7.2,94,1985,Comedy,1,1985-12-13,Jonathan Lynn,,\n3,tt0903747,2026-01-04,2026-01-04,,Breaking Bad,https://www.imdb.com/title/tt0903747/,TV Series,9.5,49,2008,Crime,1,2008-01-20,,,\n';
  const RT = 'Const,Your Rating,Date Rated,Title,URL,Title Type,IMDb Rating,Runtime (mins),Year,Genres,Num Votes,Release Date,Directors\ntt0073195,9,2025-10-31,Jaws,https://www.imdb.com/title/tt0073195/,Movie,8.1,124,1975,Thriller,1,1975-06-20,Steven Spielberg\ntt0078748,10,2025-11-01,Alien,https://www.imdb.com/title/tt0078748/,Movie,8.5,117,1979,Horror,1,1979-06-22,Ridley Scott\ntt0087363,6,2025-11-02,"Gremlins, The ""Director\'s"" Cut",https://www.imdb.com/title/tt0087363/,Movie,7.3,106,1984,Comedy,1,1984-06-08,Joe Dante\n';
  const w = readFile(WL), r = readFile(RT);
  add('📥 A watchlist file is read as a watchlist: 2 movies, the TV series left out', w.kind === 'watch' && w.items.length === 2 && w.skipped === 1, `${w.kind}, ${w.items.length} movies, ${w.skipped} left out`);
  add('📥 A ratings file is read as ratings, with the rating out of 10 and commas / quotes inside a name kept', r.kind === 'rated' && r.items.length === 3 && r.items[0].rate === 9 && /Director's/.test(r.items[2].title), `${r.kind}, ${r.items.map(x => x.title + ' ' + x.rate).join(' · ')}`);
  const a1 = applyImport(w, { d }), a2 = applyImport(r, { d });
  add('Both come in: 2 on the watchlist (marked on IMDb), 3 rated', a1.added === 2 && a2.added === 3 && d.list.every(x => x.onImdb), `${d.list.length} on the list, ${d.rated.length} rated`);
  const again = applyImport(readFile(WL), { d }); add('Bringing the same watchlist in again adds nothing twice', again.added === 0 && d.list.length === 2, `${again.added} added, ${again.same} already there`);
  const look = async (t, y) => ({ 'tremors': { title: 'Tremors', year: '1990', imdb: 'tt0100814' }, 'the thing': { title: 'The Thing', year: y === '2011' ? '2011' : '1982', imdb: y === '2011' ? 'tt0905372' : 'tt0084787' } }[norm(t)] || null);
  const A = { login: 'pretend_ash', name: 'Pretend_Ash' }, B = { login: 'pretend_bee', name: 'Pretend_Bee' };
  const s1 = await suggest(A, 'tremors', { d, lookup: look }); add('A new suggestion lands on the watchlist as "not on IMDb yet", with its real name, year and IMDb page', s1.ok && s1.movie.title === 'Tremors' && s1.movie.year === '1990' && !s1.movie.onImdb && /tt0100814/.test(imdbLink(s1.movie)), s1.ok ? nice(s1.movie) + ' → ' + imdbLink(s1.movie) : s1.why);
  const s2 = await suggest(B, 'Tremors', { d, lookup: look }); add("The same movie can't be suggested twice", !s2.ok && s2.why === 'dupe', s2.why);
  const s3 = await suggest(B, 'the thing', { d, lookup: look }); add("A movie that's already on the IMDb watchlist is refused", !s3.ok && s3.why === 'dupe', s3.why);
  const s4 = await suggest(B, 'JAWS', { d, lookup: look }); add('A movie that was already rated is refused, with the rating', !s4.ok && s4.why === 'rated' && s4.movie.rate === 9, s4.why + (s4.movie ? ' ' + s4.movie.rate + '/10' : ''));
  const s5 = await suggest(B, 'The Thing (2011)', { d, lookup: look }); add('The same name from another year is a different movie', s5.ok && s5.movie.year === '2011', s5.ok ? nice(s5.movie) : s5.why);
  const s6 = await suggest(B, 'Some Movie Nobody Knows', { d, lookup: look }); add("A name the movie look-up doesn't know is added as typed (IMDb's search opens for it)", s6.ok && !s6.movie.imdb && /find/.test(imdbLink(s6.movie)), s6.ok ? imdbLink(s6.movie) : s6.why);
  d.opts.perUser = 1; const s7 = await suggest(A, 'Another One', { d, lookup: look }); add('With a limit of 1 per person, a second waiting suggestion is refused', !s7.ok && s7.why === 'limit', s7.why); d.opts.perUser = 0;
  const t1 = ratingText('alien', 'Pretend_Bee', d), t2 = ratingText('clue', 'Pretend_Bee', d), t3 = ratingText('nothing like it', 'Pretend_Bee', d);
  add('⭐ The rating command says what a watched movie was rated', /Alien \(1979\) 10\/10/.test(t1), t1); add("…that a watchlist movie isn't rated yet", /isn't rated yet/.test(t2), t2); add('…and that an unknown movie has no rating', /no rating found/.test(t3), t3);
  const rated2 = applyImport(readFile('Const,Your Rating,Date Rated,Title,Title Type,Year\ntt0100814,8,2026-11-10,Tremors,Movie,1990\n'), { d }); add('Once a watchlist movie shows up in the ratings file, it comes off the watchlist', rated2.offList === 1 && !findIn(d.list, 'tremors') && ratedAs({ title: 'Tremors', year: '1990' }, d), `${rated2.offList} taken off`);
  { const P = { opts: {}, rated: [], list: [{ id: 'a', title: 'The Thing', year: '1982', g: 'Horror, Mystery, Sci-Fi', dir: 'John Carpenter', act: 'Kurt Russell, Wilford Brimley', plot: 'A research team in Antarctica is hunted by a shape-shifting alien.', by: '' }, { id: 'b', title: 'Clue', year: '1985', g: 'Comedy, Crime, Mystery', dir: 'Jonathan Lynn', act: 'Tim Curry, Madeline Kahn', plot: 'Six guests are invited to a strange house and must cooperate to find a killer.', by: 'NightOwl' }, { id: 'c', title: 'Big Trouble in Little China', year: '1986', g: 'Action, Comedy', dir: 'John Carpenter', act: 'Kurt Russell, Kim Cattrall', plot: 'A trucker gets dragged into a mystical battle in Chinatown.', by: '' }, { id: 'e', title: 'Tremors', year: '1990', g: 'Comedy, Horror', dir: 'Ron Underwood', act: 'Kevin Bacon, Fred Ward', plot: 'Giant worms attack a desert town.', by: 'Pretend_Ash' }] };
    const names = (q, o) => pick(q, { d: P, ...o }).list.filter(x => !x.tier).map(x => x.title).sort().join(', ');
    add('🎲 Help me pick: a genre', names('horror') === 'The Thing, Tremors', names('horror')); add('…a decade', names('80s') === 'Big Trouble in Little China, Clue, The Thing', names('80s')); add('…a year', names('1990') === 'Tremors', names('1990'));
    add('…a director', names('john carpenter') === 'Big Trouble in Little China, The Thing', names('john carpenter')); add('…an actor plus a genre', names('kurt russell comedy') === 'Big Trouble in Little China', names('kurt russell comedy'));
    add('…a subject from the plot', names('alien antarctica') === 'The Thing', names('alien antarctica')); add('…who suggested it', names('nightowl') === 'Clue', names('nightowl'));
    add("…movies already on tonight's list are left out", names('comedy', { skip: ['Clue (1985)'] }) === 'Big Trouble in Little China, Tremors', names('comedy', { skip: ['Clue (1985)'] })); { const bare2 = { opts: {}, rated: [], list: P.list.map(x => ({ id: x.id, title: x.title, year: x.year, by: x.by })) }, web = [{ label: '🎭 Kurt Russell', words: ['kurt', 'russell'], movies: [{ title: 'The Thing', year: '1982' }, { title: 'Big Trouble in Little China', year: '1986' }, { title: 'Escape from New York', year: '1981' }] }], r = pick('kurt russell 1982', { d: bare2, web }); add("…an online look-up finds an actor's movies even before the watchlist's own details came in", r.list.filter(x => !x.tier).map(x => x.title).join() === 'The Thing' && r.web[0].n === 1, r.list.filter(x => !x.tier).map(x => x.title).join(', ') + ' (via ' + r.web[0].label + ')'); }
    { const big = { opts: {}, rated: [], list: [...P.list, ...Array.from({ length: 30 }, (_, i) => ({ id: 'x' + i, title: 'Pretend Movie ' + (i + 1), year: String(1970 + i), g: i % 3 ? 'Drama' : 'Horror, Thriller', dir: '', act: '', plot: '', by: '' }))] }, r = pick('kurt russell comedy', { d: big }), t = r.list.map(x => x.tier); add('…too few that fit: it still gives 20, the exact ones first, then close ones, then more like them', r.list.length === 20 && r.total === 1 && r.list[0].title === 'Big Trouble in Little China' && t.join() === [...t].sort().join() && r.list[1].tier === 1 && (r.list[1].fit || []).length > 0, `${r.list.length} shown: ${t.filter(x => !x).length} exact, ${t.filter(x => x === 1).length} close, ${t.filter(x => x > 1).length} more ideas`); }
    add('…and nothing typed gives a mixed handful', pick('', { d: P }).total === 4, pick('', { d: P }).total + ' movies'); }
  { const P = { opts: {}, rated: [], list: [] }; await suggest({ login: 'Pretend_Ash', name: 'Pretend_Ash' }, 'Tremors (1990)', { d: P, lookup: async () => null }); await suggest({ login: 'pretend_ash', name: 'Pretend_Ash' }, 'Clue (1985)', { d: P, lookup: async () => null }); applyImport(readFile('Const,Your Rating,Date Rated,Title,Title Type,Year\ntt0100814,8,2026-11-10,Tremors,Movie,1990\n'), { d: P });
    const m = mine('PRETEND_ASH', P), st = suggStats(() => false, P); add("🙋 A person's suggestions are kept, and one that got watched shows its rating", m.length === 2 && m.find(x => x.title === 'Tremors')?.rate === 8 && m.find(x => x.title === 'Clue')?.where === 'waiting', m.map(x => `${x.title}: ${x.rate ? x.rate + '/10' : x.where}`).join(', ')); add('…and the stats count who suggested the most', st.all === 2 && st.watched === 1 && st.top[0].n === 2, `${st.top[0].name}: ${st.top[0].n} suggested, ${st.top[0].watched} watched`); }
  return { ok: rows.every(x => x.ok), rows };
}

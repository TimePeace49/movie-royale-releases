// Match results (every finish with its time) + lifetime stats for people and entries.
// Results: one small file per round in data/results (newest 600 kept).
// Stats: running totals in db.stats, split by battle type and map so the Stats tab can filter without re-reading anything.
import fs from 'fs';
import path from 'path';
import { db, save, DATA, norm, streamerName } from './store.js';

const RES = path.join(DATA, 'results');
fs.mkdirSync(RES, { recursive: true });
export const MODES = { movies: 'Movie matches', custom: 'Custom battles', chat: 'Chat royals', giveaway: 'Giveaways' };
export const modeOf = list => !list ? 'custom' : list.giveaway ? 'giveaway' : list.type === 'movies' ? 'movies' : list.type === 'chat' ? 'chat' : 'custom';
// [battles, wins, 2nds, 3rds, 4ths, top 5, top 10, luck spent]
const B = 0, WIN = 1, P2 = 2, P3 = 3, P4 = 4, T5 = 5, T10 = 6, LUCK = 7;
const blank = () => [0, 0, 0, 0, 0, 0, 0, 0];
const SPOT = '🎟️ Wild card spot';

function ensure() {
  if (db.stats?.v === 1) return db.stats;
  // first run: start from what history already knows (winners + top 5), so the numbers aren't empty
  const st = db.stats = { v: 1, since: Math.min(db.firstRunAt || Date.now(), db.history[0]?.at || Infinity), total: 0, byMode: {}, byMap: {}, people: {}, entries: {}, spots: { k: {} }, imported: db.history.length };
  for (const h of db.history) {
    const mode = h.kind === 'movies' || h.kind === 'films' ? 'movies' : h.kind === 'chat' ? (h.listId === 'giveaway' ? 'giveaway' : 'chat') : 'custom';
    count(st, mode, h.map || '?');
    const top = (h.top?.length ? h.top : [h.winner]).map((x, i) => ({ ...x, place: i + 1, luck: i === 0 ? h.winner?.luck || 0 : 0, spot: i === 0 && String(h.winner?.id || '').startsWith('spot-') }));
    for (const x of top) if (x?.label) tally(st, mode, h.map || '?', x, new Set(), new Set());
  }
  return st;
}
function count(st, mode, map) { st.total++; st.byMode[mode] = (st.byMode[mode] || 0) + 1; st.byMap[map] = (st.byMap[map] || 0) + 1; }
function bump(row, key, x) {
  const a = row.k[key] ||= blank(); const p = x.place;
  a[B]++; if (p === 1) { a[WIN]++; a[LUCK] += Math.round((x.luck || 0) * 10) / 10; }
  if (p === 2) a[P2]++; if (p === 3) a[P3]++; if (p === 4) a[P4]++; if (p <= 5) a[T5]++; if (p <= 10) a[T10]++;
}
// one finisher. "seenP" stops a person with 3 movies in one battle counting as 3 battles
function tally(st, mode, map, x, seenP, seenE) {
  const key = mode + '|' + map;
  const who = x.spot ? SPOT : (x.owner || x.label), pk = x.spot ? 'spot' : norm(x.ownerLogin || who);
  if (pk) {
    const row = st.people[pk] ||= { n: who, k: {}, m: {} };
    row.n = who;
    const first = !seenP.has(pk); seenP.add(pk);
    const a = row.k[key] ||= blank();
    if (first) a[B]++;
    const p = x.place; if (p === 1) { a[WIN]++; a[LUCK] += Math.round((x.luck || 0) * 10) / 10; }
    if (p === 2) a[P2]++; if (p === 3) a[P3]++; if (p === 4) a[P4]++; if (p <= 5) a[T5]++; if (p <= 10) a[T10]++;
    if (mode === 'movies' && !x.spot) row.m[norm(x.label + ' ' + (x.sub || ''))] = 1; // how many different movies they've put in
  }
  const ek = x.spot ? 'spot' : norm(x.label + ' ' + (x.sub || ''));
  if (ek && !seenE.has(ek)) { seenE.add(ek); const row = st.entries[ek] ||= { n: x.spot ? SPOT : x.label + (x.sub ? ` (${x.sub})` : ''), k: {}, m: {} }; bump(row, key, x); }
  if (x.spot) bump(st.spots, key, x);
}

// called for every real round (practice rounds never count)
export function recordRound({ game, list, m, startedAt, test }) {
  const st = ensure(), mode = test ? 'practice' : modeOf(list), map = game.map || '?';
  const byId = new Map(game.fighters.map(f => [f.id, f]));
  const order = (Array.isArray(m.order) ? m.order : [m.winnerId]).filter((id, i, a) => byId.has(id) && a.indexOf(id) === i);
  const times = Array.isArray(m.times) ? m.times : [];
  for (const f of game.fighters) if (!order.includes(f.id)) order.push(f.id);
  const results = order.map((id, i) => { const f = byId.get(id); return { place: i + 1, id, label: f.label, sub: f.sub || '', owner: f.showOwner || mode !== 'custom' ? (f.owner || '') : '', ownerLogin: f.ownerLogin || '', luck: f.luck || 0, odds: f.weight || 1, spot: !!f.spot, t: typeof times[i] === 'number' ? times[i] : null }; });
  if (!test) { // practice rounds get a results page but never count in the stats
    count(st, mode, map);
    const seenP = new Set(), seenE = new Set();
    for (const x of results) tally(st, mode, map, x, seenP, seenE);
  }
  const doc = { gameId: game.id, at: startedAt || Date.now(), endedAt: Date.now(), listName: test ? 'Practice round' : list?.name || '', listId: list?.id || null, mode, map, total: game.total, entrants: results.length, duration: results[0]?.t ?? null, suddenDeath: !!m.suddenDeath,
    events: (Array.isArray(m.events) ? m.events : []).slice(0, 300).map(e => ({ event: String(e.event).slice(0, 40), by: String(e.by || '').slice(0, 40), t: typeof e.t === 'number' ? e.t : null })), results };
  try { fs.writeFileSync(path.join(RES, safe(game.id) + '.json'), JSON.stringify(doc)); prune(); } catch (e) { console.error('[results]', e.message); }
  if (!test) save();
  return doc;
}
const safe = id => String(id).replace(/[^a-z0-9-]/gi, '');
let pruneAt = 0;
function prune() {
  if (Date.now() - pruneAt < 60000) return; pruneAt = Date.now();
  const files = fs.readdirSync(RES).filter(f => f.endsWith('.json')).map(f => ({ f, t: fs.statSync(path.join(RES, f)).mtimeMs })).sort((a, b) => b.t - a.t);
  for (const x of files.slice(600)) try { fs.unlinkSync(path.join(RES, x.f)); } catch {}
}
export function getResults(id) { try { return JSON.parse(fs.readFileSync(path.join(RES, safe(id) + '.json'), 'utf8')); } catch { return null; } }
export function listResults(limit = 100) {
  try {
    return fs.readdirSync(RES).filter(f => f.endsWith('.json')).map(f => ({ f, t: fs.statSync(path.join(RES, f)).mtimeMs })).sort((a, b) => b.t - a.t).slice(0, limit)
      .map(x => { const d = getResults(x.f.replace(/\.json$/, '')); return d && { gameId: d.gameId, at: d.at, listName: d.listName, mode: d.mode, map: d.map, entrants: d.entrants, winner: d.results[0]?.label, owner: d.results[0]?.owner }; }).filter(Boolean);
  } catch { return []; }
}

// the Stats tab: add up the slices that match the filters
export function statsView({ mode = 'all', map = 'all', group = 'people' } = {}) {
  const st = ensure();
  const want = k => { const [md, mp] = k.split('|'); return (mode === 'all' || md === mode) && (map === 'all' || mp === map); };
  const sum = row => { const a = blank(); for (const [k, v] of Object.entries(row.k)) if (want(k)) for (let i = 0; i < 8; i++) a[i] += v[i]; return a; };
  const rows = [];
  for (const [id, row] of Object.entries(group === 'entries' ? st.entries : st.people)) {
    const a = sum(row); if (!a[B]) continue;
    rows.push({ id, name: row.n, spot: id === 'spot', battles: a[B], wins: a[WIN], p2: a[P2], p3: a[P3], p4: a[P4], top5: a[T5], top10: a[T10], luck: Math.round(a[LUCK] * 10) / 10, movies: Object.keys(row.m || {}).length, winPct: Math.round(a[WIN] / a[B] * 1000) / 10 });
  }
  const sp = sum(st.spots);
  const battles = Object.entries(st.byMode).reduce((n, [md, c]) => n + (mode === 'all' || md === mode ? c : 0), 0);
  const totalsByMode = Object.fromEntries(Object.keys(MODES).map(md => [md, st.byMode[md] || 0]));
  return { total: st.total, since: st.since, imported: st.imported || 0, battles: map === 'all' ? battles : null, byMode: totalsByMode, byMap: st.byMap, modes: MODES,
    spots: { battles: sp[B], wins: sp[WIN], top5: sp[T5], top10: sp[T10], p2: sp[P2], p3: sp[P3], luck: Math.round(sp[LUCK] * 10) / 10, name: db.settings.spotName || streamerName() }, rows };
}
export const statsReady = () => ensure();

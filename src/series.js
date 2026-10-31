// 🎞️ Series in order + series locks (Derek, 1.63.0)
// - A movie in a series (TMDB "collection") can only be picked once you've watched every movie in that series that came out before it.
//   The later ones go on the banned list (🎞️ sequel) and come off by themselves once you've watched the one before.
// - Whoever picks the next movie to watch in a series gets the series 🔒 locked: nobody else can pick its next movie.
//   When their movie gets watched, the next one opens up only for them. If they use their next picks on other movies
//   (or drop the movie), the series opens up for everyone again. Derek can lock / unlock a series by hand (🚫 Banned Movies).
import { db, save, getList } from './store.js';
import { tmdbGet, getMovie } from './tmdb.js';
import * as lb from './letterboxd.js';
import { setSeriesHook } from './movies.js';

const IN_POOL = ['active', 'benched', 'paused', 'away'];
const today = () => new Date().toISOString().slice(0, 10);
export const partLabel = p => `${p.title}${p.year ? ` (${p.year})` : ''}`;
let hooks = { changed: () => {}, streamer: () => 'the streamer', toast: () => {} };
export const setHooks = h => Object.assign(hooks, h);

// ---------- the rules (pure; a COPY is in cloud-worker.js: keep them the same) ----------
export function nextPart(parts, seen) { const t = today(); return parts.filter(p => p.date && p.date <= t).find(p => !seen(p)) || null; }
export function seriesRule({ parts, seen, lock, movieId, userId, name, streamer, ok }) {
  const me = parts.find(p => String(p.id) === String(movieId)); if (!me?.date || seen(me) || ok?.(me)) return null;
  const next = nextPart(parts, seen); if (!next) return null;
  if (String(me.id) !== String(next.id) && me.date > next.date)
    return { key: 'sequel', next, short: '🎞️ watch in order', msg: `🎞️ **${partLabel(me)}** can't be picked yet: ${streamer} watches the *${name}* in order, so **${partLabel(next)}** has to be watched first.` };
  if (String(me.id) === String(next.id) && lock?.discordId && lock.discordId !== userId)
    return { key: 'locked', next, short: `🔒 ${lock.name}'s series`, msg: `🔒 The *${name}* is locked for **${lock.name}**: they get first pick of **${partLabel(next)}**. If they don't pick it with their next movies, it opens up for everyone.` };
  return null;
}
// who holds a series: ctx = { next, holder (who has the next movie in the pool), addedSince(discordId, t), max, now }
export function lockStep(lock, { next, holder, addedSince, max, now }) {
  if (!next) return { lock: null, event: lock ? 'done' : null }; // every movie in it is watched
  const nid = String(next.id);
  if (holder) {
    if (!lock || lock.discordId !== holder.discordId) return { lock: { discordId: holder.discordId, name: holder.name, since: now, nextId: nid, held: true }, event: 'locked' };
    return { lock: { ...lock, name: holder.name || lock.name, nextId: nid, held: true }, event: lock.held && lock.nextId === nid ? null : 'held' };
  }
  if (!lock) return { lock: null, event: null };
  if (lock.nextId !== nid) return { lock: { ...lock, nextId: nid, held: false, waitFrom: now }, event: 'advanced' }; // their movie got watched: the next one waits for them
  if (lock.held) return { lock: null, event: 'dropped' }; // they had it and let it go
  if (addedSince(lock.discordId, lock.waitFrom || lock.since) >= max) return { lock: null, event: 'expired' }; // a whole new set of picks without it
  return { lock, event: null };
}

// ---------- saved data ----------
const S = () => { const s = (db.seriesInfo ||= {}); s.known ||= {}; s.locks ||= {}; s.collOf ||= {}; s.log ||= []; return s; };
export async function partsOf(cid, maxAge = 7 * 86400e3) { // the movies in a series, oldest first (TMDB, kept a week)
  const C = (db.tmdbColl ||= {}), hit = C[cid]; if (hit && Date.now() - hit.at < maxAge) return hit.parts;
  try {
    const r = await tmdbGet(`/collection/${encodeURIComponent(cid)}?language=en-US`, 10000);
    const parts = (r.parts || []).map(p => ({ id: String(p.id), title: p.title, year: (p.release_date || '').slice(0, 4), date: p.release_date || '' })).sort((a, b) => (a.date || '9').localeCompare(b.date || '9'));
    C[cid] = { at: Date.now(), name: r.name || hit?.name || '', parts }; if (r.name) S().known[cid] = r.name; return parts;
  } catch (e) { if (hit) return hit.parts; throw e; }
}
const nameOf = cid => S().known[cid] || db.tmdbColl?.[cid]?.name || 'series';
const ml = () => getList('movies') || { entries: [] };
function seenFn() {
  const won = new Set(ml().entries.filter(e => e.status === 'watched' && e.tmdbId).map(e => String(e.tmdbId)));
  return p => won.has(String(p.id)) || !!lb.lookup({ title: p.title, year: p.year, tmdbId: p.id });
}
const okFn = () => { const ok = new Set((db.banOk || []).map(String)); return p => ok.has(String(p.id)); };
function holderOf(next) {
  const e = next && ml().entries.find(x => String(x.tmdbId) === String(next.id) && IN_POOL.includes(x.status) && x.backers?.[0]);
  return e ? { discordId: e.backers[0].discordId, name: e.backers[0].name } : null;
}
const addedSince = (id, t) => ml().entries.filter(e => e.kind !== 'spot' && (e.addedAt || 0) > t && e.backers?.[0]?.discordId === id).length;

// what the pick commands ask (sync: uses what's saved; ensure() fills it in first)
export function blockFor(movie, user) {
  const cid = movie?.collection?.id; if (!cid) return null;
  const c = db.tmdbColl?.[cid]; if (!c?.parts) return null;
  return seriesRule({ parts: c.parts, seen: seenFn(), ok: okFn(), lock: S().locks[cid], movieId: movie.id, userId: user?.discordId || null, name: movie.collection.name || nameOf(cid), streamer: hooks.streamer() });
}
export async function ensure(movie) { const c = movie?.collection; if (!c?.id) return; S().known[c.id] ||= c.name; await partsOf(c.id).catch(() => {}); }
export const lockedNext = () => new Map(Object.entries(S().locks).filter(([, l]) => l?.nextId).map(([cid, l]) => [String(l.nextId), { by: l.name, series: nameOf(cid) }]));

function log(cid, event, lock, next) {
  const st = S(), who = lock?.name || '';
  st.log = [{ at: Date.now(), cid, name: nameOf(cid), event, who, next: next ? partLabel(next) : '' }, ...st.log].slice(0, 60);
}
const EVENT_TXT = { locked: (n, w, x) => `🔒 ${w} picked ${x}, so the ${n} is locked for them`, advanced: (n, w, x) => `🎞️ ${n}: next up is ${x}, only ${w} can pick it until their next picks`, expired: (n, w, x) => `🔓 ${w} didn't pick ${x} with their next movies, so the ${n} is open for everyone`, dropped: (n, w, x) => `🔓 ${w} let go of ${x}, so the ${n} is open for everyone`, held: (n, w, x) => `🔒 ${w} picked ${x} and keeps the ${n}`, done: n => `✅ Every movie in the ${n} is watched` };
export const eventText = l => (EVENT_TXT[l.event] || (() => l.event))(l.name, l.who || 'someone', l.next || 'the next movie');

// ---------- keep the locks + the 🎞️ sequel bans up to date ----------
let busy = null; export const state = { running: false, step: '', at: 0, error: null };
export function refresh(opts = {}) { if (busy) return busy.then(() => opts.only ? refresh(opts) : null); busy = run(opts).finally(() => { busy = null; }); return busy; }
async function run({ deep = false, only = null } = {}) {
  const st = S(), now = Date.now(); let changed = false;
  state.running = true; state.error = null; state.step = 'Finding series…';
  try {
    for (const l of [ml(), ...db.lists.filter(x => x.source?.kind === 'web')]) for (const e of l.entries || []) { // series of the movies people picked + the 🌐 web lists
      const c = e.details?.collection; if (c?.id && e.status !== 'removed') { if (!st.known[c.id]) { st.known[c.id] = c.name; changed = true; } st.collOf[e.tmdbId] = c.id; }
    }
    if (deep) { // ones you've watched (Letterboxd) + picks without details: find their series once; then popular series once a day
      const ids = [...new Set([...(lb.exportWatched().tmdb || []), ...ml().entries.filter(e => e.tmdbId && !e.details).map(e => String(e.tmdbId))])].filter(id => !(id in st.collOf));
      const until = Date.now() + 120000;
      for (let i = 0; i < ids.length && Date.now() < until; i += 8) {
        state.step = `Finding series of movies you watched… ${i} of ${ids.length}`;
        await Promise.all(ids.slice(i, i + 8).map(async id => { try { const m = await getMovie(id, 8000); st.collOf[id] = m.collection?.id || 0; if (m.collection && !st.known[m.collection.id]) { st.known[m.collection.id] = m.collection.name; changed = true; } } catch {} }));
      }
      if (now - (st.popAt || 0) > 86400e3) {
        state.step = 'Finding popular series…'; const pop = new Set();
        for (const path of ['/movie/popular', '/movie/top_rated']) for (let pg = 1; pg <= 5; pg++) { try { const r = await tmdbGet(`${path}?language=en-US&page=${pg}`, 10000); for (const m of r.results || []) pop.add(String(m.id)); } catch {} }
        const todo = [...pop].filter(id => !(id in st.collOf));
        for (let i = 0; i < todo.length && Date.now() < until + 60000; i += 8) await Promise.all(todo.slice(i, i + 8).map(async id => { try { const m = await getMovie(id, 8000); st.collOf[id] = m.collection?.id || 0; if (m.collection && !st.known[m.collection.id]) { st.known[m.collection.id] = m.collection.name; changed = true; } } catch {} }));
        st.popAt = now;
      }
    }
    const seen = seenFn(), ok = okFn(), max = Number(db.settings.maxPerUser) || 3, want = new Map(), looked = new Set();
    const cids = Object.keys(st.known).filter(c => !only || String(c) === String(only));
    let i = 0;
    for (const cid of cids) {
      if (++i % 20 === 0) state.step = `Checking series… ${i} of ${cids.length}`;
      let parts; try { parts = await partsOf(cid, deep ? 7 * 86400e3 : Infinity); } catch { continue; }
      looked.add(String(cid));
      const next = nextPart(parts, seen), old = st.locks[cid] || null;
      const r = lockStep(old, { next, holder: holderOf(next), addedSince, max, now });
      if (JSON.stringify(r.lock) !== JSON.stringify(old)) { if (r.lock) st.locks[cid] = r.lock; else delete st.locks[cid]; changed = true; }
      if (r.event) { log(cid, r.event, r.lock || old, next); if (r.event !== 'held' && st.ready) hooks.toast(eventText(st.log[0])); } // (no pop-ups for what it finds the first time)
      if (next) for (const p of parts) if (p.date && p.date > next.date && String(p.id) !== String(next.id) && !seen(p) && !ok(p)) want.set(String(p.id), { p, next, cid });
    }
    // 🎞️ sequel bans: add the missing ones, take off the ones that don't apply any more (they never take a movie out of the pool)
    db.bans ||= [];
    for (const b of [...db.bans]) if (b.auto === 'sequel' && looked.has(String(b.series)) && !want.has(String(b.tmdbId))) { db.bans = db.bans.filter(x => x !== b); changed = true; }
    for (const [id, w] of want) {
      const have = db.bans.find(b => String(b.tmdbId) === id), reason = `sequel: watch ${partLabel(w.next)} first`;
      if (!have) { db.bans.push({ tmdbId: Number(id) || id, title: w.p.title, year: w.p.year, poster: null, reason, at: now, auto: 'sequel', series: String(w.cid), next: partLabel(w.next) }); changed = true; }
      else if (have.auto === 'sequel' && (have.reason !== reason || have.next !== partLabel(w.next))) { have.reason = reason; have.next = partLabel(w.next); changed = true; }
    }
    state.at = Date.now(); if (!only && !st.ready) { st.ready = true; changed = true; }
  } catch (e) { state.error = e.message; console.error('[series] ' + e.message); }
  finally { state.running = false; state.step = ''; }
  if (changed) { save(); try { hooks.changed(); } catch {} }
  return { changed };
}

// ---------- by hand (🚫 Banned Movies → 🎞️ Series) ----------
export async function setLock(cid, user) {
  const st = S(); if (!st.known[cid]) { const parts = await partsOf(cid); if (!parts) throw new Error('Unknown series'); }
  const parts = await partsOf(cid), next = nextPart(parts, seenFn());
  if (!user) { if (st.locks[cid]) log(cid, 'unlocked', st.locks[cid], next); delete st.locks[cid]; st.manualOpen = { ...(st.manualOpen || {}), [cid]: Date.now() }; }
  else { if (!next) throw new Error("You've watched every movie in that series."); st.locks[cid] = { discordId: user.discordId, name: user.name, since: Date.now(), nextId: String(next.id), held: !!holderOf(next) && holderOf(next).discordId === user.discordId, waitFrom: Date.now(), manual: true }; log(cid, 'manual', st.locks[cid], next); }
  save(); try { hooks.changed(); } catch {}
  return { lock: st.locks[cid] || null };
}
export async function addSeries(cid) { const parts = await partsOf(cid, 0); S().known[cid] ||= db.tmdbColl?.[cid]?.name || 'series'; await refresh({ only: cid }); return parts; }
export function list() { // for the 🚫 Banned Movies tab
  const st = S(), seen = seenFn(), ok = okFn();
  return Object.keys(st.known).map(cid => {
    const c = db.tmdbColl?.[cid], parts = c?.parts || [], next = parts.length ? nextPart(parts, seen) : null, lock = st.locks[cid] || null;
    return { id: cid, name: nameOf(cid), next: next ? { id: next.id, label: partLabel(next) } : null, lock,
      parts: parts.map(p => ({ id: p.id, label: partLabel(p), seen: seen(p), ok: ok(p), next: next && String(p.id) === String(next.id), banned: !!(db.bans || []).find(b => String(b.tmdbId) === String(p.id) && b.auto === 'sequel'), soon: !p.date || p.date > today() })) };
  }).filter(x => x.parts.length > 1).sort((a, b) => (b.lock ? 1 : 0) - (a.lock ? 1 : 0) || a.name.localeCompare(b.name));
}
export const recent = () => S().log.slice(0, 30);

setSeriesHook({ block: blockFor, ensure, picked: e => { const cid = e?.details?.collection?.id; if (cid) refresh({ only: cid }).catch(() => {}); } });

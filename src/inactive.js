// 🧹 Inactive people's movies (1.74.0, Derek): "automatically remove movies from people who have not entered a movie battle in 3 months.
// This will put their movies back into the pool of movies [people] can choose again. They can claim them again later."
// Per battle (the ones with people's movies): l.inactive = { on (default on), n (3), unit days|weeks|months|years (months) }.
// "Entered" = one of their movies was on the cliff in a real (not practice) battle of that battle: l.lastIn[discordId] = time.
// Their movies go to status 'removed' (hiding, never deleting: ▶ Bring back works), so anyone can pick them again in Discord,
// and their own picks reset (no movies left = a fresh set of picks).
import fs from 'fs';
import path from 'path';
import { db, save, DATA } from './store.js';
import { act } from './activity.js';

export const UNITS = { days: 1, weeks: 7, months: 30.4375, years: 365.25 };
const DAY = 86400000;
const IN_POOL = ['active', 'benched', 'paused', 'away'];
export const DEF = { on: true, n: 3, unit: 'months' };

// which battles this is for: the Discord battle, or any battle whose entries were picked by people
export const forList = l => !!l && !l.giveaway && (l.type === 'movies' || (l.entries || []).some(e => e.backers?.some(b => b.discordId)));
export function ruleOf(l) {
  const r = { ...DEF, ...(l?.inactive || {}) };
  r.n = Math.max(1, Math.min(999, Math.round(Number(r.n) || DEF.n))); if (!UNITS[r.unit]) r.unit = DEF.unit; r.on = r.on !== false;
  return r;
}
export const spanMs = r => r.n * UNITS[r.unit] * DAY;
export const ruleWords = r => `${r.n} ${r.n === 1 ? r.unit.replace(/s$/, '') : r.unit}`;
export function setRule(l, b) {
  const cur = ruleOf(l), was = JSON.stringify(cur);
  if (b.on != null) cur.on = !!b.on;
  if (b.n != null) cur.n = b.n;
  if (b.unit != null) cur.unit = String(b.unit);
  l.inactive = ruleOf({ inactive: cur });
  return was !== JSON.stringify(l.inactive);
}

// a real battle of this list started: everyone whose movie is on the cliff "entered"
export function entered(l, fighters, at = Date.now()) {
  if (!forList(l)) return;
  const byId = new Map(l.entries.map(e => [e.id, e]));
  l.lastIn ||= {};
  for (const f of fighters || []) for (const b of byId.get(f.id)?.backers || []) if (b.discordId) l.lastIn[b.discordId] = Math.max(l.lastIn[b.discordId] || 0, at);
}

// first time: fill lastIn from the saved battle results (they go back a few hundred battles). lastInSince = how far back we know,
// so someone we have no record of is only counted from then (nobody loses movies just because the records are short).
export function backfill(l) {
  if (!l || l.lastInSince) return;
  l.lastIn ||= {};
  const byId = new Map(l.entries.map(e => [e.id, e]));
  let oldest = Date.now();
  try {
    const dir = path.join(DATA, 'results');
    for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.json'))) {
      let d; try { d = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); } catch { continue; }
      if (!d || d.listId !== l.id || d.mode === 'practice' || !d.at) continue;
      oldest = Math.min(oldest, d.at);
      for (const x of d.results || []) for (const b of byId.get(x.id)?.backers || []) if (b.discordId) l.lastIn[b.discordId] = Math.max(l.lastIn[b.discordId] || 0, d.at);
    }
  } catch {}
  l.lastInSince = oldest;
}

// everyone with movies in this battle: when they last entered, and whether they're past the limit
export function people(l, now = Date.now()) {
  const r = ruleOf(l), cut = now - spanMs(r), map = new Map();
  for (const e of l.entries || []) {
    if (!IN_POOL.includes(e.status) || e.kind === 'spot') continue;
    const b = e.backers?.[0]; if (!b?.discordId) continue; // (movies you added yourself never go)
    const p = map.get(b.discordId) || { discordId: b.discordId, name: b.name || '?', movies: [], waiting: Infinity };
    p.movies.push(e); p.waiting = Math.min(p.waiting, e.addedAt || 0); map.set(b.discordId, p);
  }
  return [...map.values()].map(p => {
    const last = l.lastIn?.[p.discordId] || 0;
    const since = Math.max(last, l.lastInSince || 0, p.waiting === Infinity ? 0 : p.waiting); // (a new person's movie hasn't waited long enough yet)
    return { discordId: p.discordId, name: p.name, last, since, due: since < cut, goesAt: since + spanMs(r), movies: p.movies.map(e => ({ id: e.id, label: e.label, sub: e.sub || '' })), entries: p.movies };
  }).sort((a, b) => a.since - b.since);
}

// take out the movies of everyone past the limit (skips a battle that's playing right now)
export function sweep(l, { busy = false, now = Date.now(), quiet = false } = {}) {
  if (!forList(l)) return { ok: false, out: [] };
  backfill(l);
  const r = ruleOf(l);
  if (!r.on || busy) return { ok: true, out: [], off: !r.on, busy };
  const out = [];
  for (const p of people(l, now).filter(p => p.due)) {
    for (const e of p.entries) { e.status = 'removed'; e.inactiveOut = now; }
    out.push({ name: p.name, discordId: p.discordId, last: p.last, movies: p.movies });
    if (!quiet) act('discord', `hasn't been in a battle of “${l.name}” for ${ruleWords(r)}: ${p.movies.length === 1 ? 'their movie' : `their ${p.movies.length} movies`} went back for anyone to pick (${p.movies.map(m => `“${m.label}”`).join(', ')})`, { icon: '🧹', who: p.name, kind: 'inactive', list: l.name, items: p.movies.map(m => m.label + (m.sub ? ` (${m.sub})` : '')) });
  }
  if (out.length) save();
  return { ok: true, out };
}

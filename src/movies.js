// Movie suggestion rules shared by the Discord bot and the control panel.
import { db, save, getList, streamerName } from './store.js';
import * as lb from './letterboxd.js';
import { getMovie, searchMovies } from './tmdb.js';

export const moviesList = () => getList('movies');

export function findMovie(tmdbId) {
  return moviesList().entries.find(e => String(e.tmdbId) === String(tmdbId));
}

// Pick rule: each person gets maxPerUser picks, one movie each, and nobody can pick a movie someone else already picked.
// They can't pick again until every one of those picks has been watched (or removed by the streamer).
export function userActive(discordId) {
  // benched movies (their owner already won this week) still count as unwatched picks
  return moviesList().entries.filter(e => (e.status === 'active' || e.status === 'benched' || e.status === 'away' || e.status === 'paused') && e.backers?.some(b => b.discordId === discordId));
}
export function picksUsed(discordId) {
  db.picks ||= {};
  if (!userActive(discordId).length) db.picks[discordId] = 0; // everything watched -> fresh set of picks
  return db.picks[discordId] || 0;
}
function usePick(discordId) { db.picks ||= {}; db.picks[discordId] = picksUsed(discordId) + 1; }
function lockedMsg(discordId) {
  const left = userActive(discordId);
  return `🔒 You've used all ${db.settings.maxPerUser} picks. You get ${db.settings.maxPerUser} new ones once all of them have been picked — still waiting on: ${left.map(e => `**${e.label} (${e.sub})**${e.status === 'benched' ? ' (sitting out this week)' : ''}`).join(', ')}.`;
}

// ---------- what can't be picked (one place, so Discord, the app and the type-ahead list all agree) ----------
const IN_POOL = ['active', 'benched', 'paused', 'away'];
export const currentYear = () => String(new Date().getFullYear());
export const isBanned = id => (db.bans || []).find(b => String(b.tmdbId) === String(id));
/** Why this movie can't be picked right now, or null. short = the tag shown in Discord's list. */
export function blockReason(movie, user = null, opts = {}) {
  const label = `${movie.title}${movie.year ? ` (${movie.year})` : ''}`;
  const seen = lb.lookup({ title: movie.title, year: movie.year, tmdbId: movie.id });
  if (seen) return { short: '✅ already watched', msg: `✅ ${streamerName()} has already watched **${label}**${seen.rating ? ` (rated it ${lb.stars(seen.rating)})` : ''} — pick another movie!` };
  const ban = isBanned(movie.id);
  if (ban) return { short: '🚫 banned', msg: `🚫 **${label}** is banned${ban.reason ? ` (${ban.reason})` : ''} — pick another movie!` };
  if (db.settings.banCurrentYear !== false && movie.year === currentYear() && !(db.yearAllow || []).includes(String(movie.id)))
    return { short: `🚫 ${currentYear()} movie`, msg: `🚫 Movies from ${currentYear()} aren't allowed — **${label}** is too new. Pick another movie!` };
  const existing = findMovie(movie.id);
  if (existing?.status === 'watched') return { short: '✅ already won', msg: `✅ **${label}** already won a royale and got watched.` };
  if (movie.collection && !opts.ignoreSeries) {
    const sib = moviesList().entries.find(e => IN_POOL.includes(e.status) && e.details?.collection?.id === movie.collection.id && String(e.tmdbId) !== String(movie.id) && e.id !== opts.swapFrom);
    if (sib) return { short: `🚫 series taken`, msg: `🚫 **${sib.label}${sib.sub ? ` (${sib.sub})` : ''}** from the *${movie.collection.name}* is already picked, so no other movie from that series can go in. Pick something else!` };
  }
  if (existing && IN_POOL.includes(existing.status) && existing.id !== opts.swapFrom) { // one person per movie: nobody can pick a movie that's already in
    const who = existing.backers?.[0]?.name || streamerName();
    return { short: '🔒 already picked', msg: `🔒 **${label}** was already picked by **${who}** — everyone needs a different movie. Pick another one!` };
  }
  return null;
}

/** value can be a TMDB id (from autocomplete) or free text. user = {discordId,name,avatar} or null for streamer */
export async function suggest(value, user, opts = {}) { // opts.force: streamer adding for someone (skips pick limit)
  rollWeek();
  let movie;
  if (/^\d+$/.test(String(value))) movie = await getMovie(value);
  else {
    const res = await searchMovies(value);
    if (!res.length) return { ok: false, msg: `Couldn't find a movie called "${value}".` };
    movie = await getMovie(res[0].id);
  }
  const label = `${movie.title}${movie.year ? ` (${movie.year})` : ''}`;
  const block = blockReason(movie, user);
  if (block) return { ok: false, msg: block.msg };

  const existing = findMovie(movie.id);

  if (user && !opts.force && picksUsed(user.discordId) >= db.settings.maxPerUser) return { ok: false, msg: lockedMsg(user.discordId) };
  if (user) usePick(user.discordId);
  const entry = makeEntry(movie, user, existing);
  if (!existing) moviesList().entries.push(entry);
  save();
  const left = user ? db.settings.maxPerUser - picksUsed(user.discordId) : 0;
  if (entry.status === 'benched') return { ok: true, public: false, picksLeft: left, msg: `🎬 **${label}** is saved! Your movie already won this week, so it sits out until **${backOn()}**, then it jumps into the royale.`, entry };
  return { ok: true, public: true, picksLeft: left, msg: `🎬 **${label}** joined the royale${user ? `, suggested by <@${user.discordId}>` : ''}!`, entry };
}
function makeEntry(movie, user, existing, luckPct = 0) {
  const entry = existing || { id: 'tmdb-' + movie.id, tmdbId: movie.id };
  return Object.assign(entry, {
    label: movie.title, sub: movie.year, poster: movie.poster,
    details: { director: movie.director, cast: movie.cast, genres: movie.genres, synopsis: movie.synopsis, runtime: movie.runtime, collection: movie.collection, imdbId: movie.imdbId },
    weight: 1, backers: user ? [user] : [], status: user && wonThisWeek(user.discordId) ? 'benched' : 'active', addedAt: Date.now(), luckPct
  });
}

// ---------- swaps: trade one of your movies for another, 1 for 1, until the stream starts ----------
export const swapsLocked = () => !!db.swapLock || (db.settings.lockSwapsWhenLive !== false && !!db.live);
export async function swapMovie(user, oldEntryId, newValue) {
  if (swapsLocked()) return { ok: false, msg: `🔒 Swaps are closed — ${streamerName()} is live. You can swap again after the stream.` };
  const l = moviesList(), old = l.entries.find(e => e.id === oldEntryId || String(e.tmdbId) === String(oldEntryId));
  if (!old || !IN_POOL.includes(old.status) || !old.backers?.some(b => b.discordId === user.discordId)) return { ok: false, msg: "That isn't one of your movies — pick one from the list." };
  let movie;
  if (/^\d+$/.test(String(newValue))) movie = await getMovie(newValue);
  else { const r = await searchMovies(newValue); if (!r.length) return { ok: false, msg: `Couldn't find a movie called "${newValue}".` }; movie = await getMovie(r[0].id); }
  if (String(movie.id) === String(old.tmdbId)) return { ok: false, msg: "That's the same movie." };
  const block = blockReason(movie, user, { swapFrom: old.id });
  if (block) return { ok: false, msg: block.msg };
  const existing = findMovie(movie.id);
  if (existing && existing.status === 'active') return { ok: false, msg: `**${movie.title}** is already in the pool — pick a different one to swap to.` };
  // take them off the old movie (it leaves the pool if they were the only one on it)
  const luck = old.backers[0]?.discordId === user.discordId ? (old.luckPct || 0) : 0;
  old.backers = old.backers.filter(b => b.discordId !== user.discordId);
  if (old.backers.length) old.weight = Math.max(1, (old.weight || 1) - 1); else old.status = 'removed';
  const entry = makeEntry(movie, user, existing, luck); // picks used stays the same: it's a 1-for-1 trade
  if (old.status === 'benched') entry.status = 'benched';
  if (!existing) l.entries.push(entry);
  save();
  return { ok: true, public: true, msg: `🔁 <@${user.discordId}> swapped **${old.label}${old.sub ? ` (${old.sub})` : ''}** for **${movie.title}${movie.year ? ` (${movie.year})` : ''}**.`, entry };
}

// ---------- luck: every battle your movie is on the cliff it gets a little luckier, until one of your movies wins ----------
export const luckOn = () => !!db.settings.luckOn;
export const luckMultiplier = e => luckOn() ? 1 + Math.max(0, Number(e.luckPct) || 0) / 100 : 1;
export function addLuck(entryIds) {
  if (!luckOn()) return;
  const per = Math.max(0, Number(db.settings.luckPerBattle ?? 0.01));
  for (const e of moviesList().entries) if (entryIds.includes(e.id) && e.kind !== 'spot') e.luckPct = Math.round(((e.luckPct || 0) + per) * 10000) / 10000;
  save();
}
function resetLuckFor(discordId) {
  for (const e of moviesList().entries) if (e.backers?.[0]?.discordId === discordId) e.luckPct = 0;
}

/** After Letterboxd refreshes, retire any pooled movie you've since watched. */
export function sweepWatched() {
  let n = 0;
  for (const e of moviesList().entries) {
    if (e.status === 'active' && lb.lookup({ title: e.label, year: e.sub, tmdbId: e.tmdbId })) { e.status = 'watched'; n++; }
  }
  if (n) save();
  return n;
}

// ---------- weekly rules (automatic, based on the calendar) ----------
// A "week" starts on settings.weekStart (0 = Sunday … 6 = Saturday) at midnight, your local time.
const DAY = 864e5;
export function weekStartDate(d = new Date()) {
  const start = Number(db.settings.weekStart ?? 0);
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - ((x.getDay() - start + 7) % 7));
  return x;
}
export const weekKey = (d = new Date()) => { const x = weekStartDate(d); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`; };
export const nextWeekDate = () => new Date(weekStartDate().getTime() + 7 * DAY + 3600e3); // +1h guards DST
export const backOn = () => nextWeekDate().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
const week = () => { db.week ||= { key: weekKey(), winners: [], spotWon: false }; return db.week; };
export const wonThisWeek = discordId => week().winners.includes(discordId);
export const isSpot = e => e?.kind === 'spot';

/** Runs all the time (startup, every few minutes, before every round and every /suggest). Catches up after days off. */
export function rollWeek(force = false) {
  const k = weekKey();
  if (!force && db.week?.key === k) return null;
  const l = moviesList();
  let back = 0;
  l.entries = l.entries.filter(e => !(isSpot(e) && e.status !== 'active')); // clean up used spots
  for (const e of l.entries) if (e.status === 'benched') { e.status = 'active'; back++; }
  db.week = { key: k, winners: [], spotWon: false };
  const spots = db.settings.autoSpots !== false || force ? addSpots() : 0;
  save();
  return { back, spots, week: k };
}

/** Add "Kirb spots" (wildcard entries) up to the max. Returns how many were added. */
export function addSpots() {
  if (week().spotWon) return 0; // one of them already won this week
  const l = moviesList(), max = Math.max(0, Number(db.settings.spotMax ?? 3));
  const have = l.entries.filter(e => isSpot(e) && e.status === 'active').length;
  const name = db.settings.spotName || 'Kirb';
  let n = 0;
  for (let i = have; i < max; i++, n++) l.entries.push({ id: 'spot-' + Math.random().toString(36).slice(2, 10), kind: 'spot', label: `${name}'s Pick`, sub: '', weight: 1, backers: [], status: 'active', addedAt: Date.now() });
  save();
  return n;
}
/** Called when a Discord-movies round is won. */
export function afterMovieWin(winnerId) {
  rollWeek();
  const l = moviesList(), w = l.entries.find(e => e.id === winnerId);
  if (!w) return { benched: 0, spotsRemoved: 0 };
  let benched = 0, spotsRemoved = 0;
  if (isSpot(w)) { // a Kirb spot won: all of them are gone for the rest of the week
    spotsRemoved = l.entries.filter(e => isSpot(e)).length;
    l.entries = l.entries.filter(e => !isSpot(e) || e === w);
    w.status = 'used'; week().spotWon = true;
  } else if (!w.backers?.[0]) { w.status = 'watched'; w.wonAt = Date.now(); lb.markWatched({ title: w.label, year: w.sub, tmdbId: w.tmdbId }); // your own movie
  } else { // won a movie: sit out the rest of the week
    const who = w.backers[0].discordId;
    if (!week().winners.includes(who)) week().winners.push(who);
    resetLuckFor(who); // their movie got picked: everyone of theirs starts over
    w.status = 'watched'; w.wonAt = Date.now(); // landed on = picked: it leaves the pool and counts toward their picks
    lb.markWatched({ title: w.label, year: w.sub, tmdbId: w.tmdbId });
    for (const e of l.entries) if (e !== w && e.status === 'active' && e.backers?.[0]?.discordId === who) { e.status = 'benched'; benched++; }
  }
  save();
  return { benched, spotsRemoved, person: isSpot(w) ? null : w.backers?.[0]?.name };
}
/** The New week button: same as the automatic rollover, right now. */
export function newWeek() { return rollWeek(true); }

// ---------- people added by the streamer (moving over from a wheel) ----------
/** Move everything from one person id to another (e.g. a manually added person who later shows up in Discord). */
export function mergePerson(fromId, to) {
  if (!fromId || fromId === to.discordId) return false;
  let moved = false;
  for (const e of moviesList().entries) for (const b of e.backers || []) if (b.discordId === fromId) { b.discordId = to.discordId; b.name = to.name || b.name; b.avatar = to.avatar || b.avatar; moved = true; }
  db.picks ||= {};
  if (db.picks[fromId]) { db.picks[to.discordId] = Math.max(db.picks[to.discordId] || 0, db.picks[fromId]); delete db.picks[fromId]; }
  if (db.links[fromId] && !db.links[to.discordId]) db.links[to.discordId] = db.links[fromId];
  delete db.links[fromId];
  if (db.manualPeople) delete db.manualPeople[fromId];
  if (db.stream?.active?.includes(fromId)) db.stream.active = [...new Set(db.stream.active.map(x => x === fromId ? to.discordId : x))];
  if (db.week?.winners?.includes(fromId)) db.week.winners = db.week.winners.map(x => x === fromId ? to.discordId : x);
  save();
  return moved;
}
/** Someone in Discord: if the streamer already added them by hand (same Twitch name or same name), take over that entry. */
export function claimManual(user, twitchLogin) {
  const mp = db.manualPeople || {};
  const norm = s => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const id = Object.keys(mp).find(k => (twitchLogin && mp[k].twitch === twitchLogin) || (!twitchLogin && norm(mp[k].name) === norm(user.name)) || (twitchLogin && norm(mp[k].name) === norm(twitchLogin)));
  return id ? mergePerson(id, user) : false;
}

// ---------- ban list ----------
export function banMovie(m, reason = '') {
  db.bans ||= [];
  if (isBanned(m.id ?? m.tmdbId)) return false;
  db.bans.push({ tmdbId: m.id ?? m.tmdbId, title: m.title, year: m.year, poster: m.poster || null, reason: String(reason || '').slice(0, 80), at: Date.now() });
  // pull it out of the pool if it's in there
  const e = findMovie(m.id ?? m.tmdbId); if (e && IN_POOL.includes(e.status)) e.status = 'removed';
  save(); return true;
}
export function unbanMovie(tmdbId) { db.bans = (db.bans || []).filter(b => String(b.tmdbId) !== String(tmdbId)); save(); }
export function allowThisYear(tmdbId, allow = true) {
  db.yearAllow ||= []; const k = String(tmdbId);
  db.yearAllow = allow ? [...new Set([...db.yearAllow, k])] : db.yearAllow.filter(x => x !== k);
  save();
}

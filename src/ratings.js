// Ratings for the winner screen: Rotten Tomatoes + IMDb (via OMDb, free key) and Letterboxd (read from letterboxd.com).
import { db, save } from './store.js';
import { omdbProxy } from './shared.js';

/** ⭐🍅 (1.128.0) where to ask OMDb: your own key, else the key the app's maker shares through his 24/7 bot (no key in the app), else nowhere */
export const omdbWhere = () => (db.settings.omdbKey || '').trim() ? 'own' : omdbProxy() ? 'shared' : '';
function omdbUrl(q) { const key = (db.settings.omdbKey || '').trim(); if (key) return `https://www.omdbapi.com/?${q}&apikey=${encodeURIComponent(key)}`; const p = omdbProxy(); return p ? `${p}?${q}` : ''; }

const UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36' };

async function omdb(imdbId) {
  const u = imdbId ? omdbUrl(`i=${encodeURIComponent(imdbId)}`) : '';
  if (!u) return {};
  const r = await fetch(u, { signal: AbortSignal.timeout(8000) });
  const j = await r.json();
  if (j.Response === 'False') throw new Error(j.Error || 'OMDb error');
  const rt = (j.Ratings || []).find(x => x.Source === 'Rotten Tomatoes')?.Value || null;
  return { rt, imdb: j.imdbRating && j.imdbRating !== 'N/A' ? `${j.imdbRating}/10` : null };
}

/** ⭐🍅 By the movie's name (+ year), for the movie night leaderboard: { imdb: 7.7, rt: 97 } (numbers; 0 = not listed), null = not found, undefined = no OMDb key. Cached a week. */
/** 📋 The real name, year and IMDb id of a movie someone typed (for watchlist suggestions). null = not found; undefined = no OMDb key. */
export async function omdbFind(title, year) {
  if (!omdbWhere()) return undefined;
  const r = await fetch(omdbUrl(`t=${encodeURIComponent(title)}${year ? '&y=' + encodeURIComponent(year) : ''}&type=movie`), { signal: AbortSignal.timeout(9000) }), j = await r.json();
  if (j.Response === 'False' || !j.Title) return null;
  return { title: j.Title, year: /^\d{4}/.test(j.Year || '') ? String(j.Year).slice(0, 4) : '', imdb: /^tt\d+$/.test(j.imdbID || '') ? j.imdbID : '' };
}
/** 🎲 What a movie is about, for the watchlist's "help me pick" search: genres, director, actors, plot, IMDb rating. undefined = no OMDb key; null = not found. */
export async function omdbDetails({ imdb, title, year }) {
  if (!omdbWhere()) return undefined;
  const q = imdb ? `i=${encodeURIComponent(imdb)}` : `t=${encodeURIComponent(title)}${year ? '&y=' + encodeURIComponent(year) : ''}&type=movie`;
  const r = await fetch(omdbUrl(q + '&plot=short'), { signal: AbortSignal.timeout(9000) }), j = await r.json();
  if (j.Response === 'False' || !j.Title) { if (/limit|key/i.test(j.Error || '')) throw new Error(j.Error); return null; }
  const na = v => (v && v !== 'N/A' ? String(v) : ''), im = parseFloat(j.imdbRating);
  return { genres: na(j.Genre), directors: na(j.Director), actors: na(j.Actors), plot: na(j.Plot).slice(0, 400), rating: im > 0 ? Math.round(im * 10) / 10 : 0, year: /^\d{4}/.test(j.Year || '') ? String(j.Year).slice(0, 4) : '', imdb: /^tt\d+$/.test(j.imdbID || '') ? j.imdbID : '' };
}
export async function ratingsByTitle(title, year) {
  if (!omdbWhere()) return undefined;
  db.ratingsT ||= {}; const k = `${String(title).trim().toLowerCase()}|${year || ''}`, hit = db.ratingsT[k];
  if (hit && Date.now() - hit.at < 7 * 864e5) return hit.v;
  const r = await fetch(omdbUrl(`t=${encodeURIComponent(title)}${year ? '&y=' + encodeURIComponent(year) : ''}&type=movie`), { signal: AbortSignal.timeout(9000) });
  const j = await r.json(); let v = null;
  if (j.Response === 'False') { if (!/not found/i.test(j.Error || '')) throw new Error(j.Error || 'OMDb error'); }
  else { const rt = parseInt((j.Ratings || []).find(x => x.Source === 'Rotten Tomatoes')?.Value || '', 10), im = parseFloat(j.imdbRating); v = { year: /^\d{4}/.test(j.Year || '') ? String(j.Year).slice(0, 4) : '', imdb: im > 0 ? Math.round(im * 10) / 10 : 0, rt: rt >= 0 ? rt : 0, rtHas: rt >= 0, poster: /^https:\/\//.test(j.Poster || '') ? j.Poster : '' }; }
  db.ratingsT[k] = { at: Date.now(), v }; const ks = Object.keys(db.ratingsT); if (ks.length > 600) for (const x of ks.slice(0, 200)) delete db.ratingsT[x]; save(); return v;
}

async function letterboxd(tmdbId) {
  if (!tmdbId) return {};
  // letterboxd.com/tmdb/<id>/ jumps to the film's page, which carries its average rating
  const r = await fetch(`https://letterboxd.com/tmdb/${encodeURIComponent(tmdbId)}/`, { headers: UA, redirect: 'follow', signal: AbortSignal.timeout(8000) });
  if (!r.ok) return {};
  const html = await r.text();
  const m = html.match(/name="twitter:data2" content="([\d.]+) out of 5"/) || html.match(/"ratingValue":\s*([\d.]+)/);
  return { lb: m ? `${Number(m[1]).toFixed(1)}/5` : null };
}

/** { rt: '94%', imdb: '8.9/10', lb: '4.4/5' } — cached a week. Missing pieces are just left out. */
export async function getRatings({ tmdbId, imdbId }, force = false) {
  db.ratings ||= {};
  const k = String(tmdbId || imdbId || '');
  const hit = db.ratings[k];
  if (!force && hit && Date.now() - hit.at < 7 * 864e5) return hit.v;
  const [a, b] = await Promise.allSettled([omdb(imdbId), letterboxd(tmdbId)]);
  const v = { ...(a.value || {}), ...(b.value || {}) };
  if (Object.keys(v).length) { db.ratings[k] = { at: Date.now(), v }; save(); }
  return v;
}

export async function testOmdb() {
  if (!omdbWhere()) return { ok: false, error: 'Paste your OMDb key first.' };
  try { const v = await omdb('tt0120737'); return { ok: !!(v.imdb || v.rt), via: omdbWhere(), sample: `The Fellowship of the Ring: IMDb ${v.imdb || '?'} · Rotten Tomatoes ${v.rt || '?'}` }; }
  catch (e) { return { ok: false, error: /invalid api key/i.test(e.message) ? "OMDb says that key isn't valid yet. Did you click the activation link in their email?" : e.message }; }
}

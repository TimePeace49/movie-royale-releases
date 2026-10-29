// TMDB = free movie database used for the "type a movie, see title + year" search.
import { db } from './store.js';

const cache = new Map();
const IMG = 'https://image.tmdb.org/t/p/w342';

function req(pathAndQuery) {
  const key = (db.settings.tmdbKey || '').trim();
  if (!key) throw new Error('TMDB key not set (Settings in the control panel)');
  const bearer = key.length > 40; // v4 "Read Access Token" vs v3 "API Key"
  const url = `https://api.themoviedb.org/3${pathAndQuery}${bearer ? '' : `${pathAndQuery.includes('?') ? '&' : '?'}api_key=${key}`}`;
  return fetch(url, { headers: bearer ? { Authorization: `Bearer ${key}` } : {}, signal: AbortSignal.timeout(2500) })
    .then(r => { if (!r.ok) throw new Error('TMDB HTTP ' + r.status); return r.json(); });
}

const shape = m => ({ id: m.id, title: m.title, year: (m.release_date || '').slice(0, 4), poster: m.poster_path ? IMG + m.poster_path : null, popularity: m.popularity || 0, lang: m.original_language || '' });

export async function searchMovies(q) {
  q = (q || '').trim();
  if (q.length < 2) return [];
  const k = q.toLowerCase();
  const hit = cache.get(k);
  if (hit && Date.now() - hit.t < 600000) return hit.v;
  const data = await req(`/search/movie?query=${encodeURIComponent(q)}&include_adult=false&language=en-US&page=1`);
  const v = (data.results || []).map(shape);
  cache.set(k, { t: Date.now(), v });
  return v;
}

/** 🎬 an IMDb id (tt0123456) → the TMDB movie (exact, no guessing by title). */
export async function findImdb(tt) {
  const data = await req(`/find/${encodeURIComponent(tt)}?external_source=imdb_id`);
  const m = (data.movie_results || [])[0]; return m ? shape(m) : null;
}

const firstSentence = t => {
  t = (t || '').trim();
  const m = t.match(/^.{25,}?[.!?](?=\s+[A-Z"'“]|$)/s);
  return (m ? m[0] : t).slice(0, 220);
};

/** Full details: director, top cast, genres, one-sentence synopsis, series (collection), IMDb id. Cached. */
const details = new Map();
export async function getMovie(id) {
  const k = String(id), hit = details.get(k);
  if (hit && Date.now() - hit.t < 6 * 3600e3) return hit.v;
  const m = await req(`/movie/${encodeURIComponent(id)}?language=en-US&append_to_response=credits`);
  const v = {
    ...shape(m),
    director: (m.credits?.crew || []).filter(c => c.job === 'Director').map(c => c.name).slice(0, 2).join(' & '),
    cast: (m.credits?.cast || []).slice(0, 3).map(c => c.name),
    genres: (m.genres || []).map(g => g.name).slice(0, 3),
    synopsis: firstSentence(m.overview),
    runtime: m.runtime || null,
    collection: m.belongs_to_collection ? { id: m.belongs_to_collection.id, name: m.belongs_to_collection.name } : null,
    imdbId: m.imdb_id || null
  };
  details.set(k, { t: Date.now(), v });
  return v;
}
/** Details for many movies at once (used to mark series in the Discord search list). Never slower than `ms`. */
export async function getMany(ids, ms = 1800) {
  const out = new Map();
  await Promise.race([
    Promise.all(ids.map(id => getMovie(id).then(v => out.set(String(id), v)).catch(() => {}))),
    new Promise(r => setTimeout(r, ms))
  ]);
  return out;
}
export const cachedMovie = id => details.get(String(id))?.v || null;

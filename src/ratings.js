// Ratings for the winner screen: Rotten Tomatoes + IMDb (via OMDb, free key) and Letterboxd (read from letterboxd.com).
import { db, save } from './store.js';

const UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36' };

async function omdb(imdbId) {
  const key = (db.settings.omdbKey || '').trim();
  if (!key || !imdbId) return {};
  const r = await fetch(`https://www.omdbapi.com/?i=${encodeURIComponent(imdbId)}&apikey=${encodeURIComponent(key)}`, { signal: AbortSignal.timeout(6000) });
  const j = await r.json();
  if (j.Response === 'False') throw new Error(j.Error || 'OMDb error');
  const rt = (j.Ratings || []).find(x => x.Source === 'Rotten Tomatoes')?.Value || null;
  return { rt, imdb: j.imdbRating && j.imdbRating !== 'N/A' ? `${j.imdbRating}/10` : null };
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
  if (!db.settings.omdbKey) return { ok: false, error: 'Paste your OMDb key first.' };
  try { const v = await omdb('tt0120737'); return { ok: !!(v.imdb || v.rt), sample: `The Fellowship of the Ring: IMDb ${v.imdb || '?'} · Rotten Tomatoes ${v.rt || '?'}` }; }
  catch (e) { return { ok: false, error: /invalid api key/i.test(e.message) ? "OMDb says that key isn't valid yet. Did you click the activation link in their email?" : e.message }; }
}

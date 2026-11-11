// ⭐🍅 (1.128.0, Derek: "everyone just uses my IMDb and Rotten Tomatoes key so they don't have to set one up")
// Things the streamer who makes the app shares with every copy of it. Right now: the address of his 24/7 bot's OMDb helper
// (it adds his key there, so the key itself is never in the app or on GitHub). Read from src/shared.json in the build, and
// checked on GitHub every 6 hours so a new share works without a new version.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from './store.js';
import { ALL } from './edition.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const REPO = ALL.public?.repo || 'TimePeace49/movie-royale-releases';
let built = {}; try { built = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'shared.json'), 'utf8')); } catch {}
const RAW = process.env.SHARED_URL || `https://raw.githubusercontent.com/${REPO}/main/src/shared.json`;
export const status = { at: 0, error: '' };
/** the shared settings: what GitHub said last (kept in db.shared), else what the build came with */
export const get = () => ({ ...built, ...(db.shared?.v || {}) });
const okUrl = u => /^https:\/\/[a-z0-9.-]+(:\d+)?\/omdb$/i.test(String(u || '')) || /^http:\/\/(127\.0\.0\.1|localhost):\d+\/omdb$/i.test(String(u || ''));
/** the OMDb helper's address ('' = none shared) */
export const omdbProxy = () => { const u = String(get().omdb || '').trim(); return okUrl(u) ? u : ''; };
export async function refresh() {
  try { const r = await fetch(RAW + '?t=' + Date.now(), { signal: AbortSignal.timeout(10000) }); if (!r.ok) throw new Error('GitHub answered ' + r.status); const j = await r.json(); db.shared = { at: Date.now(), v: j && typeof j === 'object' ? j : {} }; status.at = Date.now(); status.error = ''; }
  catch (e) { status.error = e.message || String(e); }
  return get();
}
setTimeout(() => refresh().catch(() => {}), 20000); setInterval(() => refresh().catch(() => {}), 6 * 3600000).unref?.();

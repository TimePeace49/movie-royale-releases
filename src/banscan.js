// 🚫 Ban list builder (Derek, 1.51.0): looks up TMDB for movies that break the ban rules and adds them to the banned list,
// so people see them banned before anyone tries to pick them. Runs once by itself the first time Movie Royal opens after
// the update, and any time Derek presses 🔄 Update the ban list. It only ADDS: movies already banned aren't added twice,
// pre-approved (unbanned) movies and movies already in the pool are skipped (🔎 Check movies already picked shows those).
// 📅 This year's movies are listed too (auto 'year'); when the year changes they come off the list (unless another rule
// bans them) and the new year's movies go on.
import { db, save, getList } from './store.js';
import { tmdbGet, shape, getMovie } from './tmdb.js';
import { autoBan, isBanned, currentYear } from './movies.js';

export const scan = { running: false, step: '', done: 0, total: 0, added: 0, skipped: 0, at: 0, error: null, fake: false };
let hooks = { changed: () => {} };
export const setScanHooks = h => { hooks = { ...hooks, ...h }; };
const IN_POOL = ['active', 'benched', 'paused', 'away'];
const LANGS = ['fr', 'es', 'ja', 'ko', 'de', 'it', 'zh', 'cn', 'hi', 'ru', 'pt', 'sv', 'da', 'no', 'tr', 'th', 'pl', 'nl', 'fa', 'ar', 'id', 'te', 'ta', 'ml', 'he', 'fi', 'cs', 'hu', 'el', 'uk', 'ro', 'tl', 'bn', 'is'];
const STORY_IDS = '28,12,16,35,18,14,27,9648,10749,878,53,37'; // action adventure animation comedy drama fantasy horror mystery romance sci-fi thriller western
const REL_WORDS = ['christian film', 'faith-based', 'faith based film', 'biblical epic', 'bible', 'jesus christ', 'moses', 'old testament', 'new testament', 'crucifixion', 'ten commandments', 'gospel', 'christianity'];
const sleep = ms => new Promise(r => setTimeout(r, ms));
const inPool = id => (getList('movies')?.entries || []).some(e => String(e.tmdbId) === String(id) && IN_POOL.includes(e.status));

function add(m, key, reason, extra = {}) { // (no save per movie: there can be hundreds)
  const id = String(m.id);
  if (isBanned(id) || (db.bans || []).some(b => String(b.tmdbId) === id) || (db.banOk || []).includes(id) || inPool(id)) { scan.skipped++; return false; }
  (db.bans ||= []).push({ tmdbId: m.id, title: m.title, year: m.year || '', poster: m.poster || null, reason, at: Date.now(), auto: key, ...extra });
  scan.added++; return true;
}
async function pages(path, n) { // TMDB discover pages → movies
  const out = [];
  for (let p = 1; p <= n; p++) {
    const d = await tmdbGet(`${path}${path.includes('?') ? '&' : '?'}page=${p}`); out.push(...(d.results || []).map(shape));
    if (p >= (d.total_pages || 1)) break; await sleep(60);
  }
  return out;
}
async function checkEach(list, want) { // full details (spoken languages, keywords) → the same rules Discord uses
  const todo = list.filter(m => !(db.bans || []).some(b => String(b.tmdbId) === String(m.id)) && !(db.banOk || []).includes(String(m.id)));
  scan.skipped += list.length - todo.length; scan.total += todo.length;
  let i = 0;
  const worker = async () => { while (i < todo.length) { const m = todo[i++]; try { const d = await getMovie(m.id, 10000), rb = autoBan(d); if (rb && rb.key === want) add(d, rb.key, rb.reason); } catch {} scan.done++; } };
  await Promise.all(Array.from({ length: 6 }, worker));
}

export async function runScan({ fake = false, only = null } = {}) {
  if (scan.running) return scan;
  Object.assign(scan, { running: true, step: 'Starting…', done: 0, total: 0, added: 0, skipped: 0, error: null, fake });
  hooks.changed();
  try {
    if (fake) await fakeScan();
    else {
      if (!String(db.settings.tmdbKey || '').trim()) throw new Error('needs your TMDB key (Settings → Movie info)');
      const R = db.settings.banRules || {}, Y = currentYear();
      if ((!only || only === 'year') && db.settings.banCurrentYear !== false) {
        scan.step = `📅 ${Y} movies`; hooks.changed();
        for (const m of await pages(`/discover/movie?primary_release_year=${Y}&sort_by=popularity.desc&include_adult=false&language=en-US`, 15))
          if (m.year === Y && !(db.yearAllow || []).includes(String(m.id))) add(m, 'year', `${Y} movie`);
        db.banYear = Y;
      }
      if ((!only || only === 'documentary') && R.documentary !== false) {
        scan.step = '🎥 documentaries'; hooks.changed();
        for (const m of await pages(`/discover/movie?with_genres=99&without_genres=${STORY_IDS}&sort_by=vote_count.desc&vote_count.gte=25&include_adult=false&language=en-US`, 15)) add(m, 'documentary', 'documentary');
      }
      if ((!only || only === 'religious') && R.religious !== false) {
        scan.step = '⛪ religious movies'; hooks.changed();
        const ids = [];
        for (const w of REL_WORDS) { try { const k = (await tmdbGet(`/search/keyword?query=${encodeURIComponent(w)}`)).results || []; const hit = k.find(x => x.name.toLowerCase() === w); if (hit) ids.push(hit.id); } catch {} }
        if (ids.length) await checkEach(await pages(`/discover/movie?with_keywords=${ids.join('|')}&sort_by=vote_count.desc&vote_count.gte=15&include_adult=false&language=en-US`, 15), 'religious');
      }
      if ((!only || only === 'english') && R.english !== false) {
        for (const L of LANGS) {
          scan.step = `🌍 movies not in English (${L})`; hooks.changed();
          try { await checkEach(await pages(`/discover/movie?with_original_language=${L}&sort_by=vote_count.desc&vote_count.gte=150&include_adult=false&language=en-US`, 3), 'english'); } catch {}
        }
      }
      db.banSeed = 1; // (the first-time build is done)
    }
    scan.step = 'Done'; scan.at = Date.now();
  } catch (e) { scan.error = e.message; scan.step = 'Stopped'; console.error('[bans] updating the ban list:', e.message); }
  finally { scan.running = false; save(); hooks.changed(); }
  return scan;
}

// 🗣️ dubbed movies are allowed now (1.61.0, Derek): movies the "not in English" rule banned before get checked again once
// (and again when the 🗣️ setting changes), and come off the list when they likely have an English dub. Bans by hand stay.
export const dubFix = { running: false, done: 0, total: 0, removed: 0 };
export async function dubCleanup({ fake = false } = {}) {
  if (dubFix.running) return dubFix;
  const R = db.settings.banRules || {};
  if (R.english === false || R.dubbed === false) return dubFix;
  const list = (db.bans || []).filter(b => b.auto === 'english' && (fake ? b.test && b.fake : !b.test));
  Object.assign(dubFix, { running: true, done: 0, total: list.length, removed: 0 });
  let i = 0;
  const worker = async () => { while (i < list.length) { const b = list[i++];
    try { const d = fake ? { id: b.tmdbId, ...b.fake } : await getMovie(b.tmdbId, 10000), rb = autoBan(d);
      if (!rb) { db.bans = db.bans.filter(x => x !== b); dubFix.removed++; } else if (rb.key !== b.auto) { b.auto = rb.key; b.reason = rb.reason; } } catch {}
    dubFix.done++; if (!fake) await sleep(60); } };
  try { await Promise.all(Array.from({ length: 4 }, worker)); }
  finally { dubFix.running = false; if (!fake) db.dubChecked = 1; save(); hooks.changed(); }
  return dubFix;
}

// 📅 new year: last year's "this year" bans come off (unless another rule bans them), and the new year's go on
export async function yearCleanup(now = currentYear()) {
  const old = (db.bans || []).filter(b => b.auto === 'year' && String(b.year) !== now);
  let removed = 0, kept = 0;
  for (const b of old) {
    let rb = null;
    if (!b.test) { try { rb = autoBan(await getMovie(b.tmdbId, 10000)); } catch { continue; } } // (TMDB not reachable: try again later; it doesn't block meanwhile)
    if (rb) { b.auto = rb.key; b.reason = rb.reason; kept++; } else { db.bans = db.bans.filter(x => x !== b); removed++; }
  }
  if (old.length) { save(); hooks.changed(); }
  if (!old.some(b => b.test) && db.banYear && db.banYear !== now && db.settings.banCurrentYear !== false && !scan.running) runScan({ only: 'year' }).catch(() => {});
  return { removed, kept };
}

// 🧪 pretend update (no internet): adds a few made-up movies of each kind, and tries some that are already banned
async function fakeScan() {
  const Y = currentYear(), kinds = [['english', 'not in English', 'Le Petit Village'], ['religious', 'religious movie', 'The Holy Road'], ['documentary', 'documentary', 'Planet Rivers'], ['year', `${Y} movie`, 'Brand New Blockbuster']];
  scan.total = 20;
  for (let i = 0; i < 20; i++) {
    const [key, reason, t] = kinds[i % 4]; scan.step = '🧪 pretend update'; scan.done = i + 1;
    add({ id: 'scan-test' + (i % 16), title: `🧪 ${t} ${Math.floor(i / 4) + 1}`, year: key === 'year' ? Y : String(1960 + i * 3), poster: null }, key, reason, { test: true }); // (the last 4 are already on the list: skipped)
    hooks.changed(); await sleep(120);
  }
}

// Knows which movies you've already watched/rated on Letterboxd.
// Two sources: your Letterboxd export CSVs (full history) + your public RSS feed (recent, auto-refreshes).
import fs from 'fs';
import path from 'path';
import { ROOT, DATA, norm } from './store.js';

const byKey = new Map();   // "title|year" -> entry
const byTmdb = new Map();  // tmdb id -> entry
let lastRss = null, rssError = null;

function parseCSV(text) {
  const rows = []; let row = [], f = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; }
      else f += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(f); f = ''; }
    else if (c === '\n') { row.push(f); rows.push(row); row = []; f = ''; }
    else if (c !== '\r') f += c;
  }
  if (f || row.length) { row.push(f); rows.push(row); }
  return rows;
}

function add({ title, year, rating, tmdbId }) {
  if (!title) return;
  const key = norm(title) + '|' + (year || '');
  const prev = byKey.get(key) || {};
  const e = { title, year: year || prev.year, rating: rating ?? prev.rating ?? null, tmdbId: tmdbId || prev.tmdbId || null };
  byKey.set(key, e);
  if (e.tmdbId) byTmdb.set(String(e.tmdbId), e);
}

function findFiles(dir, names, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, f.name);
    if (f.isDirectory()) findFiles(p, names, out);
    else if (names.includes(f.name.toLowerCase())) out.push(p);
  }
  return out;
}

export function loadCsvs() {
  const dirs = [path.join(ROOT, 'letterboxd'), path.join(DATA, 'letterboxd')];
  let n = 0;
  // order matters: ratings last so ratings win
  for (const name of ['watched.csv', 'diary.csv', 'reviews.csv', 'ratings.csv']) {
    for (const dir of dirs) for (const file of findFiles(dir, [name])) {
      const rows = parseCSV(fs.readFileSync(file, 'utf8'));
      const h = rows.shift()?.map(x => x.trim().toLowerCase()) || [];
      const iN = h.indexOf('name'), iY = h.indexOf('year'), iR = h.indexOf('rating');
      if (iN < 0) continue;
      for (const r of rows) {
        if (!r[iN]) continue;
        add({ title: r[iN], year: r[iY], rating: iR >= 0 && r[iR] ? Number(r[iR]) : undefined });
        n++;
      }
    }
  }
  return n;
}

const tag = (xml, t) => { const m = xml.match(new RegExp(`<${t}>([\\s\\S]*?)</${t}>`)); return m ? m[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim() : null; };

export async function refreshRss(user) {
  if (!user) return;
  try {
    const res = await fetch(`https://letterboxd.com/${encodeURIComponent(user)}/rss/`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) MovieRoyale/1.0' },
      signal: AbortSignal.timeout(10000)
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const xml = await res.text();
    for (const item of xml.split('<item>').slice(1)) {
      const title = tag(item, 'letterboxd:filmTitle');
      if (!title) continue;
      const r = tag(item, 'letterboxd:memberRating');
      add({ title, year: tag(item, 'letterboxd:filmYear'), rating: r ? Number(r) : undefined, tmdbId: tag(item, 'tmdb:movieId') });
    }
    lastRss = new Date().toISOString(); rssError = null;
  } catch (e) { rssError = e.message; }
}

// ---------- your whole public profile (letterboxd.com/you/films), not just the recent RSS ----------
const slugs = new Set();
let profile = { count: 0, at: null, error: null };
const PROFILE_FILE = () => path.join(DATA, 'letterboxd', 'profile.json');
const MARKED_FILE = () => path.join(DATA, 'letterboxd', 'marked.json');
export const slugify = s => String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/&/g, 'and').replace(/['’‘.:,!?]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const decodeHtml = s => s.replace(/&amp;/g, '&').replace(/&#0?39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
function loadSaved() {
  try { const j = JSON.parse(fs.readFileSync(PROFILE_FILE(), 'utf8')); (j.slugs || []).forEach(x => slugs.add(x)); profile = { count: slugs.size, at: j.at, error: null }; } catch {}
  try { for (const m of JSON.parse(fs.readFileSync(MARKED_FILE(), 'utf8'))) add(m); } catch {}
}
loadSaved();
const sleep = ms => new Promise(r => setTimeout(r, ms));
export async function refreshProfile(user) {
  if (!user) return;
  const found = new Set();
  try {
    for (let page = 1; page <= 400; page++) {
      const res = await fetch(`https://letterboxd.com/${encodeURIComponent(user)}/films/${page > 1 ? `page/${page}/` : ''}`, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36', Accept: 'text/html', 'Accept-Language': 'en-US,en;q=0.9' },
        signal: AbortSignal.timeout(15000)
      });
      if (res.status === 404 && page === 1) throw new Error('profile not found — check the username');
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const html = await res.text();
      let n = 0;
      for (const m of html.matchAll(/data-(?:film|item)-slug="([^"]+)"|data-target-link="\/film\/([^"\/]+)\/"/g)) { const sl = (m[1] || m[2]).replace(/^\/?film\//, '').replace(/\/$/, ''); if (!found.has(sl)) { found.add(sl); n++; } }
      for (const m of html.matchAll(/data-(?:film|item)-name="([^"]+)"/g)) { const t = decodeHtml(m[1]).match(/^(.*?)\s*\((\d{4})\)$/); if (t) add({ title: t[1], year: t[2] }); }
      if (!n || !/\/films\/page\/\d+\//.test(html) || !html.includes(`/films/page/${page + 1}/`)) break;
      await sleep(300);
    }
    if (!found.size) throw new Error("couldn't read any films — is your profile public?");
    slugs.clear(); found.forEach(x => slugs.add(x));
    profile = { count: slugs.size, at: new Date().toISOString(), error: null };
    fs.mkdirSync(path.dirname(PROFILE_FILE()), { recursive: true });
    fs.writeFileSync(PROFILE_FILE(), JSON.stringify({ at: profile.at, slugs: [...slugs] }));
  } catch (e) { profile.error = e.message; }
}
/** Marking a movie watched in Movie Royale remembers it, so it can never be suggested again (even if Letterboxd misses it). */
export function markWatched(m) {
  if (!m?.title) return;
  add({ title: m.title, year: m.year, tmdbId: m.tmdbId });
  let list = []; try { list = JSON.parse(fs.readFileSync(MARKED_FILE(), 'utf8')); } catch {}
  if (!list.some(x => (m.tmdbId && String(x.tmdbId) === String(m.tmdbId)) || (norm(x.title) === norm(m.title) && x.year == m.year))) {
    list.push({ title: m.title, year: m.year, tmdbId: m.tmdbId || null });
    fs.mkdirSync(path.dirname(MARKED_FILE()), { recursive: true }); fs.writeFileSync(MARKED_FILE(), JSON.stringify(list));
  }
}
export function unmarkWatched(m) {
  let list = []; try { list = JSON.parse(fs.readFileSync(MARKED_FILE(), 'utf8')); } catch { return; }
  list = list.filter(x => !((m.tmdbId && String(x.tmdbId) === String(m.tmdbId)) || (norm(x.title) === norm(m.title) && x.year == m.year)));
  fs.writeFileSync(MARKED_FILE(), JSON.stringify(list));
  const k = norm(m.title) + '|' + (m.year || ''); byKey.delete(k); if (m.tmdbId) byTmdb.delete(String(m.tmdbId));
}

export function lookup({ title, year, tmdbId }) {
  const hit = lookupMaps({ title, year, tmdbId });
  if (hit) return hit;
  // whole-profile list (by Letterboxd's film link names, which are the title + the year when needed)
  const sl = slugify(title), y = Number(year);
  if (sl && (slugs.has(sl) || (y && (slugs.has(`${sl}-${y}`) || slugs.has(`${sl}-${y - 1}`) || slugs.has(`${sl}-${y + 1}`))))) return { title, year, rating: null };
  return null;
}
function lookupMaps({ title, year, tmdbId }) {
  if (tmdbId && byTmdb.has(String(tmdbId))) return byTmdb.get(String(tmdbId));
  const k = norm(title);
  const y = Number(year);
  return byKey.get(k + '|' + year) || (y && (byKey.get(k + '|' + (y - 1)) || byKey.get(k + '|' + (y + 1)))) || null;
}

export const stars = r => r == null || isNaN(r) ? '' : '★'.repeat(Math.floor(r)) + (r % 1 ? '½' : '');
export const stats = () => ({ count: Math.max(byKey.size, slugs.size), profileCount: slugs.size, profileAt: profile.at, profileError: profile.error, lastRss, rssError });

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
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) MovieRoyal/1.0' },
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
/** Marking a movie watched in Movie Royal remembers it, so it can never be suggested again (even if Letterboxd misses it). */
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

/** Everything you've watched, compact, for the cloud bot. */
export const exportWatched = () => ({ tmdb: [...byTmdb.keys()], keys: [...byKey.keys()], slugs: [...slugs] });

/** Read the films on a Letterboxd page (a list, or a "films" page like the lowest rated), in order, up to max.
 *  Returns [{ slug, title, year }]. Works page by page like a browser would. */
export const WORST_URL = 'https://letterboxd.com/films/by/rating-lowest/';
export async function fetchFilmList(url, max = 500, onPage = () => {}) {
  let base = String(url || WORST_URL).trim(); if (!/^https?:\/\//.test(base)) base = 'https://' + base;
  base = base.replace(/[?#].*$/, '').replace(/\/page\/\d+\/?$/, '').replace(/\/?$/, '/');
  const headers = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36', Accept: 'text/html,*/*', 'Accept-Language': 'en-US,en;q=0.9', 'X-Requested-With': 'XMLHttpRequest' };
  // "films" pages load their posters separately (an "ajax" address); lists are plain pages
  const variants = /letterboxd\.com\/films\//.test(base) && !/\/ajax\//.test(base) ? [base.replace('letterboxd.com/films/', 'letterboxd.com/films/ajax/'), base] : [base];
  const out = [], seen = new Set();
  let use = null, lastErr = null;
  for (let page = 1; page <= 60 && out.length < max; page++) {
    let html = null;
    const hasFilms = h => /data-(?:film|item)-slug=|data-target-link="\/film\//.test(h);
    for (const v of use ? [use] : variants) {
      if (v === 'browser') break;
      try {
        const res = await fetch(page > 1 ? `${v}page/${page}/` : v, { headers, signal: AbortSignal.timeout(20000) });
        if (!res.ok) { lastErr = new Error('Letterboxd said ' + res.status); continue; }
        const h = await res.text();
        if (hasFilms(h)) { html = h; use = v; break; }
        lastErr = new Error('no films on that page');
      } catch (e) { lastErr = e; }
    }
    // Letterboxd turns away plain requests for some pages (403): read them like a real browser does instead (Windows app only)
    if (!html && globalThis.__desktop?.getPage && (!use || use === 'browser')) {
      const url = page > 1 ? `${base}page/${page}/` : base;
      try {
        let r = await globalThis.__desktop.getPage(url);
        if (r.status !== 200 || !hasFilms(r.text)) r = await globalThis.__desktop.getPage(url, { render: true, wait: '[data-film-slug],[data-item-slug],[data-target-link^="/film/"]' });
        if (hasFilms(r.text)) { html = r.text; use = 'browser'; } else lastErr = new Error(r.status === 200 ? 'no films on that page' : 'Letterboxd said ' + r.status);
      } catch (e) { lastErr = e; }
    }
    if (!html) break;
    let n = 0;
    for (const m of html.matchAll(/<[^>]*(?:data-(?:film|item)-slug="[^"]+"|data-target-link="\/film\/[^"]+")[^>]*>/g)) {
      const tag = m[0];
      const slug = (tag.match(/data-(?:film|item)-slug="([^"]+)"/)?.[1] || tag.match(/data-target-link="\/film\/([^"\/]+)\/?"/)?.[1] || '').replace(/^\/?film\//, '').replace(/\/$/, '');
      if (!slug || seen.has(slug)) continue;
      const nm = decodeHtml(tag.match(/data-(?:film|item)-name="([^"]+)"/)?.[1] || tag.match(/data-(?:film|item)-full-display-name="([^"]+)"/)?.[1] || '');
      const ym = nm.match(/^(.*?)\s*\((\d{4})\)$/), y2 = tag.match(/data-film-release-year="(\d{4})"/)?.[1];
      const title = ym ? ym[1] : nm || slug.replace(/-\d{4}$/, '').replace(/-/g, ' ');
      const year = ym ? ym[2] : y2 || (slug.match(/-(\d{4})$/)?.[1] || '');
      seen.add(slug); out.push({ slug, title, year }); n++;
      if (out.length >= max) break;
    }
    onPage(page, out.length);
    if (!n) break;
    await sleep(400);
  }
  if (!out.length) throw new Error(`Couldn't read the films from Letterboxd${lastErr ? ` (${lastErr.message})` : ''}. Try again later, or paste a Letterboxd list link instead.`);
  return out;
}

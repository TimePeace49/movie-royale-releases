// 🌐 Movie lists from IMDb and Rotten Tomatoes (for battles like "the 500 worst movies").
// Reads a list/chart/search page from IMDb, or a Rotten Tomatoes guide/browse page, and gives back the movies on it in
// order: [{ key, title, year, imdbId?, rating? (IMDb, out of 10), rt? (Rotten Tomatoes %) }]. Inside the Windows app it reads pages with a hidden browser window (so pages
// that load with JavaScript, and "50 more" / "Load more" buttons, work); otherwise it uses a plain download.
// NOTE: written without being able to reach IMDb or Rotten Tomatoes from the cloud session (blocked there), so the
// readers are built to be forgiving: they try the page's own data first, then fall back to reading the links.

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
const decode = s => String(s || '').replace(/&amp;/g, '&').replace(/&#0?39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n)).replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

export const PRESETS = [ // shown in the control panel
  { id: 'rt-worst', site: 'rt', name: "🍅 Rotten Tomatoes: 100 worst movies of all time", url: 'https://editorial.rottentomatoes.com/guide/worst-movies-of-all-time/' },
  { id: 'imdb-lowest', site: 'imdb', name: '🎬 IMDb: lowest rated movies (10,000+ votes)', url: 'https://www.imdb.com/search/title/?title_type=feature&num_votes=10000,&sort=user_rating,asc' },
  { id: 'imdb-bottom', site: 'imdb', name: '🎬 IMDb: Bottom 100', url: 'https://www.imdb.com/chart/bottom/' }
];
export const siteOf = url => /imdb\.com/i.test(url) ? 'imdb' : /rottentomatoes\.com/i.test(url) ? 'rt' : null;

async function getHtml(url, opts = {}) {
  const d = globalThis.__desktop;
  if (d?.getPage) { const r = await d.getPage(url, { render: !!opts.render, wait: opts.wait || 'body', timeout: opts.timeout || 30000, more: opts.more, settle: opts.settle }); if (r.status >= 400) throw new Error(`the page answered ${r.status}`); return r.text; }
  const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'text/html,*/*', 'Accept-Language': 'en-US,en;q=0.9' }, signal: AbortSignal.timeout(20000) });
  if (!r.ok) throw new Error(`the page answered ${r.status}`); return r.text();
}

// ---------- 🎬 IMDb ----------
const rateNum = v => { const n = Number(v); return v != null && v !== '' && isFinite(n) && n > 0 && n <= 10 ? Math.round(n * 10) / 10 : null; };
function imdbFromJson(html) { // the page's own data (__NEXT_DATA__): every title object with an id like tt0123456
  const out = [], seen = new Map();
  const m = html.match(/<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/); if (!m) return out;
  let data; try { data = JSON.parse(m[1]); } catch { return out; }
  const walk = (o, depth = 0) => {
    if (!o || typeof o !== 'object' || depth > 40) return;
    if (Array.isArray(o)) { for (const x of o) walk(x, depth + 1); return; }
    const id = o.id || o.titleId || o.const, tt = typeof id === 'string' && /^tt\d+$/.test(id) ? id : null;
    const title = o.titleText?.text || (typeof o.titleText === 'string' ? o.titleText : null) || o.originalTitleText?.text;
    const rating = rateNum((o.ratingsSummary || o.ratingSummary)?.aggregateRating); // ⭐ the IMDb rating (charts: ratingsSummary, search: ratingSummary)
    if (tt && title && !seen.has(tt)) { const type = o.titleType?.id || o.titleType?.text || ''; if (!/series|episode|game|podcast|music/i.test(type)) { seen.set(tt, out.length); out.push({ key: tt, imdbId: tt, title, year: o.releaseYear?.year || (typeof o.releaseYear === 'number' ? o.releaseYear : null) || null, rating }); } }
    else if (tt && rating != null && seen.has(tt) && out[seen.get(tt)].rating == null) out[seen.get(tt)].rating = rating;
    for (const k in o) walk(o[k], depth + 1);
  };
  walk(data); return out;
}
function imdbFromLd(html) { // JSON-LD item lists (names + links, no years)
  const out = [];
  for (const m of html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)) {
    let d; try { d = JSON.parse(m[1]); } catch { continue; }
    for (const it of d?.itemListElement || []) { const x = it.item || it, tt = String(x.url || '').match(/tt\d+/)?.[0]; if (tt && x.name) out.push({ key: tt, imdbId: tt, title: decode(x.name), year: null, rating: rateNum(x.aggregateRating?.ratingValue) }); }
  }
  return out;
}
function imdbFromLinks(html) { // last try: the title links on the page
  const out = [], seen = new Set();
  for (const m of html.matchAll(/href="\/title\/(tt\d+)\/[^"]*"[^>]*>([\s\S]{1,300}?)<\/a>/g)) {
    const tt = m[1], t = decode(m[2]).replace(/^\d+\.\s*/, ''); if (!t || seen.has(tt) || /^(see|more|\d+)$/i.test(t)) continue; seen.add(tt);
    const after = html.slice(m.index, m.index + 900).match(/\b(19\d\d|20\d\d)\b/);
    let near = html.slice(m.index + m[0].length, m.index + 3000); const nx = near.search(new RegExp(`href="/title/(?!${tt})tt\\d+`)); if (nx > 0) near = near.slice(0, nx); // (only up to the next movie)
    const r = near.match(/ipc-rating-star--rating[^>]*>\s*([\d.]+)/) || near.match(/IMDb rating:?\s*([\d.]+)/i);
    out.push({ key: tt, imdbId: tt, title: t, year: after ? +after[1] : null, rating: r ? rateNum(r[1]) : null });
  }
  return out;
}
function imdbParse(html) { // the page's data first, then any more titles on the page (pressing "50 more" adds them to the page but not to its data)
  const out = [], seen = new Map(); for (const list of [imdbFromJson(html), imdbFromLd(html), imdbFromLinks(html)]) for (const it of list) { const i = seen.get(it.key); if (i == null) { seen.set(it.key, out.length); out.push(it); } else if (out[i].rating == null && it.rating != null) out[i].rating = it.rating; } return out;
}
async function readImdb(url, want, onPage) {
  const u = new URL(url), isList = /\/list\/ls\d+/.test(u.pathname), isSearch = /\/search\//.test(u.pathname);
  if (isSearch) { // the search page shows 50, then a "50 more" button: the hidden browser keeps pressing it
    const html = await getHtml(url, { render: true, wait: '.ipc-metadata-list-summary-item, a[href*="/title/tt"]', timeout: 90000, more: { click: 'button.ipc-see-more__button, .ipc-see-more button', count: '.ipc-metadata-list-summary-item', want } });
    const r = imdbParse(html); onPage(1, r.length); return r;
  }
  const out = [], seen = new Set();
  for (let page = 1; page <= 20 && out.length < want; page++) {
    if (isList) u.searchParams.set('page', page); else if (page > 1) break;
    const items = imdbParse(await getHtml(u.toString(), { render: true, wait: '.ipc-metadata-list-summary-item, a[href*="/title/tt"]' }));
    let added = 0; for (const it of items) if (!seen.has(it.key)) { seen.add(it.key); out.push(it); added++; }
    onPage(page, out.length); if (!added) break;
  }
  return out;
}

/* 📋 (1.133.0) Someone's own IMDb pages: their watchlist (imdb.com/user/ur…/watchlist) and their ratings (…/ratings). Both have to be PUBLIC on IMDb.
   The ratings page carries what THEY rated each movie: read from the page's own data (userRating next to a title), else from the star shown on each row. */
export const imdbUserUrl = u => { try { const x = new URL(String(u || '').trim()); if (!/(^|\.)imdb\.com$/i.test(x.hostname)) return null; const m = x.pathname.match(/^\/user\/(ur\d+|p\.[a-z0-9]+)\/(watchlist|ratings)\/?/i) || x.pathname.match(/^\/(list)\/(ls\d+)\/?/i); return m ? { url: `https://www.imdb.com${x.pathname.replace(/\/$/, '')}/`, kind: /ratings/i.test(m[2]) ? 'rated' : 'watch' } : null; } catch { return null; } };
export function imdbUserRatings(html) {
  const out = new Map(), put = (tt, rate, at) => { const r = Math.round(Number(rate)); if (/^tt\d+$/.test(tt || '') && r >= 1 && r <= 10 && !out.has(tt)) out.set(tt, { rate: r, at: at ? Date.parse(at) || 0 : 0 }); };
  const m = html.match(/<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (m) { let data = null; try { data = JSON.parse(m[1]); } catch {}
    const idOf = o => (o && typeof o === 'object' ? [o.id, o.titleId, o.const].find(x => typeof x === 'string' && /^tt\d+$/.test(x)) : null);
    const walk = (o, depth = 0) => { if (!o || typeof o !== 'object' || depth > 40) return; if (Array.isArray(o)) { for (const x of o) walk(x, depth + 1); return; }
      const ur = o.userRating || o.otherUserRating || o.authorRating; const val = ur && typeof ur === 'object' ? ur.value ?? ur.rating : typeof ur === 'number' ? ur : null;
      if (val != null) { const tt = idOf(o) || idOf(o.title) || idOf(o.node) || idOf(o.item) || idOf(o.listItem); if (tt) put(tt, val, ur && (ur.date || ur.ratedOn)); }
      for (const k in o) walk(o[k], depth + 1); };
    walk(data); }
  /* the rows on the page (also the ones a "more" press added): the title link + the rater's own star (1.136.2: the star's drawing sits between its name and its number, and it is long) */
  for (const row of imdbRows(html)) { const tt = (row.match(/\/title\/(tt\d+)\//) || [])[1]; if (!tt) continue; const st = rowRating(row); if (st) put(tt, st); }
  return out;
}
/** 🎬 Movies only (1.138.2, Derek: a TV show's episodes came in with the ratings): the ids on a page that are NOT movies (TV series, episodes, games, podcasts, music videos). TV movies / specials / shorts / videos stay. */
const NOT_MOVIE = /series|episode|game|podcast|music/i;
export function imdbNotMovies(html) {
  const out = new Set(), m = html.match(/<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (m) { let data = null; try { data = JSON.parse(m[1]); } catch {}
    const walk = (o, depth = 0) => { if (!o || typeof o !== 'object' || depth > 40) return; if (Array.isArray(o)) { for (const x of o) walk(x, depth + 1); return; }
      const id = [o.id, o.titleId, o.const].find(x => typeof x === 'string' && /^tt\d+$/.test(x)); const type = o.titleType?.id || o.titleType?.text || (typeof o.titleType === 'string' ? o.titleType : '');
      if (id && (NOT_MOVIE.test(type) || (o.series && typeof o.series === 'object'))) out.add(id);
      for (const k in o) walk(o[k], depth + 1); };
    walk(data); }
  for (const row of imdbRows(html)) { const text = row.replace(/<svg[\s\S]*?<\/svg>/g, ' '); /* a row's own words: its type label ("TV Episode"), an episode number ("S1.E4"), an episodes link */
    if (/>\s*(TV (Mini[ -]?)?Series|TV Episode|Video Game|Podcast (Series|Episode)|Music Video)\s*</i.test(text) || />\s*S\d{1,3}\s*[.·∙]\s*E\d{1,4}\b/.test(text) || /dli-ep-title|\/episodes\/?\?season/i.test(text)) for (const t of text.matchAll(/\/title\/(tt\d+)\//g)) out.add(t[1]); }
  return out;
}
const imdbRows = html => { let rows = html.split(/(?=<li[^>]*ipc-metadata-list-summary-item)/).slice(1); if (!rows.length) rows = html.split(/(?=<a[^>]+href="\/title\/tt\d+\/[^"]*"[^>]*ipc-title-link)/).slice(1); return rows; };
function rowRating(row) {
  const lab = [...row.matchAll(/aria-label="([^"]{0,80}?rating:?\s*(\d{1,2}))"/gi)].find(m => !/imdb/i.test(m[1])); if (lab) return lab[2];
  const st = row.match(/ipc-rating-star--(?:otherUserAlt|otherUser|currentUser|user|rate)\b[^>]*>[\s\S]{0,3000}?<span[^>]*ipc-rating-star--rating[^>]*>\s*(\d{1,2})\s*</i) || row.match(/(?:user-rating|userRating|ratingGroup--user)[^>]*>[\s\S]{0,3000}?<span[^>]*ipc-rating-star--rating[^>]*>\s*(\d{1,2})\s*</i); if (st) return st[1];
  const all = [...row.matchAll(/ipc-rating-star--rating[^>]*>\s*([\d.]{1,4})\s*</g)].map(m => m[1]); /* IMDb's own score has a decimal ("7.4"); a second, whole number on the row is the person's */
  if (all.length >= 2) { const whole = all.filter(x => /^\d{1,2}$/.test(x)); if (whole.length) return whole[whole.length - 1]; }
  return null;
}
/** What a ratings page looks like when nothing could be read from it (short, no personal data): it goes in the error line so a screenshot shows what to fix. */
export function imdbShape(html) {
  const rows = imdbRows(html), cls = [...new Set([...html.matchAll(/ipc-rating-star--([\w-]+)/g)].map(m => m[1]))].filter(x => !/^(base|rating|voteCount|maxRating)$/.test(x)).slice(0, 8);
  const labs = [...new Set([...html.matchAll(/aria-label="([^"]{0,60}rating[^"]{0,20})"/gi)].map(m => m[1].replace(/\d+(\.\d+)?/g, '#')))].slice(0, 4);
  const keys = [...new Set([...html.matchAll(/"(\w*[rR]ating\w*)"\s*:/g)].map(m => m[1]))].filter(x => !/^(ratingsSummary|aggregateRating|ratingSummary|canRate|voteCount)$/.test(x)).slice(0, 8);
  return `rows ${rows.length}; stars ${cls.join(',') || 'none'}; labels ${labs.join(' | ') || 'none'}; data ${keys.join(',') || 'none'}`;
}
/** Reads every page of someone's watchlist / ratings (IMDb shows 250 a page: ?page=2, 3…) until a page brings nothing new. `get(url)` gives a page's HTML. */
export async function imdbUserPages(base, kind, get, want = 3000) {
  const items = [], seen = new Set(), rates = new Map(), skip = new Set(); let shape = '', pages = 0;
  for (let pg = 1; pg <= Math.ceil(want / 250) + 1 && items.length < want; pg++) {
    let html; try { html = await get(pg === 1 ? base : `${base}?page=${pg}`, pg); } catch (e) { if (pg === 1) throw e; break; }
    if (pg === 1 && /private|isn't public|is not public|sign in to/i.test(html.slice(0, 200000)) && !/\/title\/tt\d+/.test(html)) throw new Error('IMDb says that page is private. Set it to public on IMDb (Your account → Privacy), or use the Export file instead.');
    const titles = imdbParse(html), not = imdbNotMovies(html); let fresh = 0; for (const x of not) skip.add(x);
    for (const t of titles) { const k = t.imdbId || (t.title + '|' + t.year); if (seen.has(k)) continue; seen.add(k); fresh++; if (t.imdbId && not.has(t.imdbId)) continue; /* (not a movie: counted as seen so the paging still works, but left out) */ items.push({ title: t.title, year: t.year ? String(t.year) : '', imdb: t.imdbId || '', rate: null, at: 0 }); }
    if (kind === 'rated') { for (const [k, v] of imdbUserRatings(html)) if (!rates.has(k)) rates.set(k, v); if (pg === 1) shape = imdbShape(html); }
    pages = pg; if (!fresh || titles.length < 200) break; /* a short page is the last one; a page with nothing new means IMDb gave the same page again */
  }
  if (kind === 'rated') { for (const it of items) { const x = rates.get(it.imdb); if (x) { it.rate = x.rate; it.at = x.at; } } return { kind: 'rated', items: items.filter(x => x.rate), seen: items.length, pages, shape, skip: [...skip] }; }
  return { kind: 'watch', items, seen: items.length, pages, skip: [...skip] };
}
export async function readImdbUser(url, want = 3000) {
  const u = imdbUserUrl(url); if (!u) throw new Error("That isn't an IMDb watchlist or ratings link. It looks like imdb.com/user/…/watchlist (or …/ratings).");
  return imdbUserPages(u.url, u.kind, page => getHtml(page, { render: true, wait: '.ipc-metadata-list-summary-item, a[href*="/title/tt"]', timeout: 120000, more: { click: 'button.ipc-see-more__button, .ipc-see-more button', count: '.ipc-metadata-list-summary-item', want: 250 }, ...(u.kind === 'rated' ? { settle: { count: '.ipc-rating-star--rating, [class*="ipc-rating-star--"]', ms: 30000 } } : {}) }), want);
}

// ---------- 🍅 Rotten Tomatoes ----------
function rtParse(html) {
  const out = [], seen = new Map(), push = (slug, title, year, rt) => { slug = slug.replace(/\/$/, ''); if (!slug || !title) return; const i = seen.get(slug); if (i != null) { if (out[i].rt == null && rt != null) out[i].rt = rt; return; } seen.set(slug, out.length); out.push({ key: 'rt:' + slug, title, year: year || null, rt: rt ?? null }); };
  const score = chunk => { const m = chunk.match(/tMeterScore[^>]*>\s*(\d{1,3})\s*%/) || chunk.match(/criticsscore="(\d{1,3})"/i) || chunk.match(/slot="critics-?score"[^>]*>\s*(\d{1,3})\s*%/i); return m ? Math.min(100, +m[1]) : null; }; // 🍅 the Tomatometer next to it
  // editorial guides ("the 100 worst movies"): <div class="article_movie_title"><h2><a href=".../m/slug">Title</a> <span class="subtle start-year">(2002)</span>
  for (const m of html.matchAll(/<a[^>]+href="(?:https?:\/\/www\.rottentomatoes\.com)?\/m\/([\w-]+)\/?"[^>]*>([\s\S]{1,200}?)<\/a>\s*(?:<span[^>]*start-year[^>]*>\s*\(?(\d{4})\)?)?/g)) {
    const t = decode(m[2]); if (!t || /^\d+%?$/.test(t) || /^(read|see|watch|more)/i.test(t)) continue;
    const y = m[3] ? +m[3] : +(html.slice(m.index, m.index + 600).match(/\((19\d\d|20\d\d)\)/)?.[1] || 0) || null;
    let near = html.slice(m.index, m.index + 900); const nx = near.slice(m[0].length).search(/href="(?:https?:\/\/www\.rottentomatoes\.com)?\/m\//); if (nx > 0) near = near.slice(0, m[0].length + nx);
    push(m[1], t, y, score(near));
  }
  // browse pages: tiles with a title span inside a link to /m/slug
  for (const m of html.matchAll(/href="\/m\/([\w-]+)"[\s\S]{0,1500}?data-qa="discovery-media-list-item-title"[^>]*>([\s\S]*?)<\/span>/g)) push(m[1], decode(m[2]), null, score(m[0]));
  return out;
}
async function readRt(url, want, onPage) {
  const browse = /\/browse\//.test(url);
  const out = [], seen = new Set();
  if (browse) { const html = await getHtml(url, { render: true, wait: '[data-qa="discovery-media-list-item"], a[href^="/m/"]', timeout: 90000, more: { click: 'button[data-qa="dlp-load-more-button"], button.discovery__actions button', count: '[data-qa="discovery-media-list-item"], tile-dynamic', want } }); const r = rtParse(html); onPage(1, r.length); return r; }
  let next = url;
  for (let page = 1; page <= 10 && next && out.length < want; page++) { // guides split over pages: follow the "next page" link
    const html = await getHtml(next, { render: true, wait: '.article_movie_title, a[href*="/m/"]' });
    for (const it of rtParse(html)) if (!seen.has(it.key)) { seen.add(it.key); out.push(it); }
    onPage(page, out.length);
    const nx = html.match(/<a[^>]+rel="next"[^>]+href="([^"]+)"/) || html.match(/<a[^>]+href="([^"]+)"[^>]*class="[^"]*\bnext\b/); next = nx ? new URL(decode(nx[1]), next).toString() : null;
  }
  return out;
}

/** The movies on a page, in order (reads further pages until it has `want`, when the page has more). */
export async function readList(url, want = 500, onPage = () => {}) {
  const site = siteOf(url); if (!site) throw new Error('That link isn\'t IMDb or Rotten Tomatoes.');
  const items = site === 'imdb' ? await readImdb(url, want, onPage) : await readRt(url, want, onPage);
  if (!items.length) throw new Error(`no movies found on ${site === 'imdb' ? 'IMDb' : 'Rotten Tomatoes'} at that link`);
  return items;
}
export const _test = { imdbParse, rtParse }; // (for the checks in scripts / tests)

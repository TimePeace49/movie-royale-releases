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
  if (d?.getPage) { const r = await d.getPage(url, { render: !!opts.render, wait: opts.wait || 'body', timeout: opts.timeout || 30000, more: opts.more }); if (r.status >= 400) throw new Error(`the page answered ${r.status}`); return r.text; }
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

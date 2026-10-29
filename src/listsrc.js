// 🌐 Movie lists from IMDb and Rotten Tomatoes (for battles like "the 500 worst movies").
// Reads a list/chart/search page from IMDb, or a Rotten Tomatoes guide/browse page, and gives back the movies on it in
// order: [{ key, title, year, imdbId? }]. Inside the Windows app it reads pages with a hidden browser window (so pages
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
function imdbFromJson(html) { // the page's own data (__NEXT_DATA__): every title object with an id like tt0123456
  const out = [], seen = new Set();
  const m = html.match(/<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/); if (!m) return out;
  let data; try { data = JSON.parse(m[1]); } catch { return out; }
  const walk = (o, depth = 0) => {
    if (!o || typeof o !== 'object' || depth > 40) return;
    if (Array.isArray(o)) { for (const x of o) walk(x, depth + 1); return; }
    const id = o.id || o.titleId || o.const, tt = typeof id === 'string' && /^tt\d+$/.test(id) ? id : null;
    const title = o.titleText?.text || (typeof o.titleText === 'string' ? o.titleText : null) || o.originalTitleText?.text;
    if (tt && title && !seen.has(tt)) { const type = o.titleType?.id || o.titleType?.text || ''; if (!/series|episode|game|podcast|music/i.test(type)) { seen.add(tt); out.push({ key: tt, imdbId: tt, title, year: o.releaseYear?.year || (typeof o.releaseYear === 'number' ? o.releaseYear : null) || null }); } }
    for (const k in o) walk(o[k], depth + 1);
  };
  walk(data); return out;
}
function imdbFromLd(html) { // JSON-LD item lists (names + links, no years)
  const out = [];
  for (const m of html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)) {
    let d; try { d = JSON.parse(m[1]); } catch { continue; }
    for (const it of d?.itemListElement || []) { const x = it.item || it, tt = String(x.url || '').match(/tt\d+/)?.[0]; if (tt && x.name) out.push({ key: tt, imdbId: tt, title: decode(x.name), year: null }); }
  }
  return out;
}
function imdbFromLinks(html) { // last try: the title links on the page
  const out = [], seen = new Set();
  for (const m of html.matchAll(/href="\/title\/(tt\d+)\/[^"]*"[^>]*>([\s\S]{1,300}?)<\/a>/g)) {
    const tt = m[1], t = decode(m[2]).replace(/^\d+\.\s*/, ''); if (!t || seen.has(tt) || /^(see|more|\d+)$/i.test(t)) continue; seen.add(tt);
    const after = html.slice(m.index, m.index + 900).match(/\b(19\d\d|20\d\d)\b/); out.push({ key: tt, imdbId: tt, title: t, year: after ? +after[1] : null });
  }
  return out;
}
function imdbParse(html) { // the page's data first, then any more titles on the page (pressing "50 more" adds them to the page but not to its data)
  const out = [], seen = new Set(); for (const list of [imdbFromJson(html), imdbFromLd(html), imdbFromLinks(html)]) for (const it of list) if (!seen.has(it.key)) { seen.add(it.key); out.push(it); } return out;
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
  const out = [], seen = new Set(), push = (slug, title, year) => { slug = slug.replace(/\/$/, ''); if (!slug || seen.has(slug) || !title) return; seen.add(slug); out.push({ key: 'rt:' + slug, title, year: year || null }); };
  // editorial guides ("the 100 worst movies"): <div class="article_movie_title"><h2><a href=".../m/slug">Title</a> <span class="subtle start-year">(2002)</span>
  for (const m of html.matchAll(/<a[^>]+href="(?:https?:\/\/www\.rottentomatoes\.com)?\/m\/([\w-]+)\/?"[^>]*>([\s\S]{1,200}?)<\/a>\s*(?:<span[^>]*start-year[^>]*>\s*\(?(\d{4})\)?)?/g)) {
    const t = decode(m[2]); if (!t || /^\d+%?$/.test(t) || /^(read|see|watch|more)/i.test(t)) continue;
    const y = m[3] ? +m[3] : +(html.slice(m.index, m.index + 600).match(/\((19\d\d|20\d\d)\)/)?.[1] || 0) || null;
    push(m[1], t, y);
  }
  // browse pages: tiles with a title span inside a link to /m/slug
  for (const m of html.matchAll(/href="\/m\/([\w-]+)"[\s\S]{0,1500}?data-qa="discovery-media-list-item-title"[^>]*>([\s\S]*?)<\/span>/g)) push(m[1], decode(m[2]), null);
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

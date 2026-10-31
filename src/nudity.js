// 🔞 Nudity heads-up for the winner card (1.66.0, Derek: "in the winner tab add a red text if there is nudity warning me").
// Only for you in the control panel: never on stream, never in chat.
// Looks at: the IMDb Parents Guide ("Sex & Nudity": its level + what people wrote there), TMDB's tags on the movie
// (like "nudity" / "female nudity") and the age-rating notes TMDB has from other countries. Any of them = the warning.
// NOTE: written without being able to reach IMDb from the cloud session (blocked there), so the reader is forgiving:
// it tries the page's own data first, then the page's text. Tested on sample pages only.
import { db, save } from './store.js';
import { getMovie, tmdbGet } from './tmdb.js';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
const LEVELS = ['None', 'Mild', 'Moderate', 'Severe'];
const NUDE = /\b(nud(e|es|ity)|naked|topless|bottomless|bare[- ]?(breast\w*|chest\w*|butt\w*|bottom|behind|rear)|breasts?|nipples?|buttocks|butt[- ]?cheeks|genital\w*|penis(es)?|vagina\w*|pubic|full[- ]frontal|frontal|skinny[- ]?dip\w*|strip(per|pers|ping|tease|s naked| club)|nudist\w*)\b/i;
const SEX = /\b(sex|sexual (scene|content|activity|intercourse|encounter|situation)s?|having sex|making love|make love|makes love|love[- ]?making|love scenes?|thrust\w*|orgasm\w*|erotic\w*|softcore)\b/i;
const NUDE_TAG = /nud|naked|topless|frontal|skinny dipping|stripper|strip club|nudist|softcore|erotic/i;
const SEX_TAG = /\bsex\b|sex scene|sexual|love scene|erotic/i;

const decode = t => String(t || '').replace(/<br\s*\/?>/gi, '. ').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&#0?39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n)).replace(/\s+/g, ' ').trim();
// "No nudity." / "there's no sex or nudity" / "not naked": those don't count
const noNegated = t => String(t || '').replace(/\b(no|not|never|without|zero|isn't|aren't|wasn't|nothing|none)\b(\s+(any|is|are|shown|seen|real|actual|explicit|graphic|on[- ]screen|onscreen|of|the|or|and|sex|sexual|content|frontal|full)){0,4}\s+(nud\w*|naked|sex\w*|topless|breasts?|genitals?)/gi, ' ');
const levelOf = v => { const m = String(v || '').match(/none|mild|moderate|severe/i); return m ? LEVELS.find(l => l.toLowerCase() === m[0].toLowerCase()) : null; };

/** Read the "Sex & Nudity" part of an IMDb Parents Guide page → { level, text } (null = couldn't find it). */
export function parseGuide(html) {
  html = String(html || '');
  let level = null; const texts = [];
  const nd = html.match(/<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (nd) { // the page's own data: the category whose id/name is about nudity, with its level + every line written under it
    let data = null; try { data = JSON.parse(nd[1]); } catch {}
    const leaves = (o, out, d = 0) => { if (d > 30 || o == null) return; if (typeof o === 'string') { out.push(o); return; } if (typeof o !== 'object') return; for (const k in o) { if (/^(__typename|id|category)$/.test(k)) continue; leaves(o[k], out, d + 1); } };
    const walk = (o, d = 0) => {
      if (!o || typeof o !== 'object' || d > 40) return;
      if (Array.isArray(o)) { for (const x of o) walk(x, d + 1); return; }
      const cat = o.category || o.categoryType || null, catTxt = typeof cat === 'string' ? cat : `${cat?.id || ''} ${cat?.text || ''}`;
      if (cat && /nudity/i.test(catTxt)) {
        let lv = levelOf(typeof o.severity === 'string' ? o.severity : o.severity?.text || o.severity?.id || o.severitySummary?.text || o.severitySummary?.id);
        if (!lv && Array.isArray(o.severityBreakdowns)) { const top = [...o.severityBreakdowns].sort((a, b) => (b.votes ?? b.voteCount ?? 0) - (a.votes ?? a.voteCount ?? 0))[0]; lv = levelOf(top?.voteType || top?.severity || top?.text); }
        if (lv) level = level || lv;
        const out = []; leaves({ ...o, severity: undefined, severitySummary: undefined, severityBreakdowns: undefined }, out); texts.push(...out.map(decode).filter(t => t.length > 12 && !/^(none|mild|moderate|severe|sex & nudity)$/i.test(t) && !/^[\w-]+$/.test(t)));
        return;
      }
      for (const k in o) walk(o[k], d + 1);
    };
    if (data) walk(data);
  }
  if (!level && !texts.length) { // the page's text: from the "Sex & Nudity" heading to the next part (violence)
    const start = html.search(/advisory-nudity|sub-section-nudity|id="nudity"|Sex (?:&amp;|&) Nudity/i);
    if (start >= 0) {
      let part = html.slice(start, start + 20000); const end = part.slice(40).search(/advisory-violence|sub-section-violence|id="violence"|Violence (?:&amp;|&) Gore/i); if (end > 0) part = part.slice(0, end + 40).replace(/<[^>]*$/, '');
      const lv = part.match(/(?:ipl-status-pill|signpost__text|severity)[^>]*>\s*(None|Mild|Moderate|Severe)\b/i) || decode(part).match(/\b(None|Mild|Moderate|Severe)\b/);
      level = levelOf(lv?.[1]);
      // each thing people wrote is its own line: old page = <li> items, new page = ipc-html-content blocks
      const bits = part.split(/<li\b|ipc-html-content-inner-div/i).slice(1).map(decode).map(t => t.replace(/^[^>]*>\s*/, '').replace(/\s*(Edit|Spoilers?|\d+ of \d+ found this \w+)\s*$/i, '').trim()).filter(t => t.length > 12);
      texts.push(...(bits.length ? bits : [decode(part).replace(/^.*?Sex (?:&|and) Nudity/i, '')]));
    }
  }
  const items = [...new Set(texts.map(t => t.replace(/\s+/g, ' ').trim()))];
  return level || items.length ? { level, items, text: items.join(' . ') } : null;
}

// ⏱️ about when in the movie (Derek: "tell around what runtime it is, list all of them"): a time when the person who wrote it
// gave one (1:12:30, 45:00, "at 52 minutes", "an hour in"), else a rough spot from words like "opening scene" / "near the end"
const clock = min => { min = Math.max(0, Math.round(min)); const h = Math.floor(min / 60), m = min % 60; return h ? `${h} h${m ? ` ${m} min` : ''}` : `${m} min`; }; // 72 → "1 h 12 min"
export function timeOf(text, runtime) {
  const t = String(text || ''), rt = Number(runtime) || 0;
  let m = t.match(/\b(\d{1,2}):([0-5]\d):([0-5]\d)\b/); if (m) return { at: +m[1] * 60 + +m[2], label: `at ${+m[1]}:${m[2]}:${m[3]}`, exact: true };
  m = t.match(/\b(\d{1,3}):([0-5]\d)\b/); if (m && !/\b\d{1,2}:[0-5]\d\s*(a\.?m|p\.?m)\b/i.test(t)) { const a = +m[1], b = +m[2], min = a <= 3 ? a * 60 + b : a; if (!rt || min <= rt + 5) return { at: min, label: `~${clock(min)} in`, exact: true }; }
  m = t.match(/\b(\d)\s*(?:h|hr|hrs|hours?)\b(?:\s*(?:and\s*)?(\d{1,2})\s*(?:m|min|mins|minutes?)\b)?/i); if (m) { const min = +m[1] * 60 + (+m[2] || 0); return { at: min, label: `~${clock(min)} in`, exact: true }; }
  m = t.match(/\b(an?|one|two)\s+hours?\s+(in|into)\b/i); if (m) { const min = /two/i.test(m[1]) ? 120 : 60; return { at: min, label: `~${clock(min)} in`, exact: false }; }
  m = t.match(/\b(\d{1,3})\s*(?:m|min|mins|minutes?)\b(?:\s*(?:in|into|mark))?/i); if (m && (!rt || +m[1] <= rt + 5)) return { at: +m[1], label: `~${clock(+m[1])} in`, exact: true };
  const span = (a, b, word) => ({ at: a, label: rt ? `${word} (${a < 1 ? '0' : clock(a)} – ${clock(b)} in)` : word, exact: false });
  if (/\b(end|closing) credits|during the credits|after the credits|post-credits?\b/i.test(t)) return span(Math.max(0, rt - 8), rt || 0, 'during the end credits');
  if (/\b(opening (scene|shot|credits|sequence|minutes?)|(at|in) the (very )?(beginning|start)|first (scene|few minutes|minutes)|begins with|starts with|movie opens|film opens|opens with)\b/i.test(t)) return span(0, Math.min(12, rt || 12), 'near the start');
  if (/\b(final (scene|act|minutes|moments|shot)|last (scene|act|few minutes|shot)|(near|at|towards?) the end|end of the (film|movie)|ending|climax)\b/i.test(t)) return span(Math.max(0, rt - 20), Math.max(0, rt - 5), 'near the end');
  if (/\b(midway|halfway|half-way|middle of the (film|movie)|mid-film|mid-movie)\b/i.test(t)) return span(Math.max(0, rt / 2 - 10), rt / 2 + 10, 'around the middle');
  if (/\b(early (on|in the (film|movie))|early scene)\b/i.test(t)) return span(5, Math.min(30, rt || 30), 'early on');
  if (/\b(later (on|in the (film|movie))|late in the (film|movie))\b/i.test(t)) return span(Math.max(0, rt * .6), Math.max(0, rt - 10), 'later on');
  return { at: null, label: 'time not listed', exact: false };
}
const shortTxt = t => { t = String(t || '').trim(); return t.length > 170 ? t.slice(0, 165).replace(/\s+\S*$/, '') + '…' : t; };

/** Decide from what we found → { has, sex, level, why[], checked[] }. */
export function judge({ guide, tags = [], notes = [], runtime = 0 } = {}) {
  const why = [], checked = [];
  // 🔞 every line from the parents guide that mentions nudity (or, when none do, sex), each with about when it happens
  const scenes = []; for (const it of guide?.items || []) { const w = noNegated(it), nude = NUDE.test(w), sx = !nude && SEX.test(w); if (nude || sx) scenes.push({ nude, ...timeOf(it, runtime), text: shortTxt(it) }); }
  scenes.sort((a, b) => (b.nude - a.nude) || ((a.at ?? 1e9) - (b.at ?? 1e9)));
  const words = guide ? noNegated(guide.text) : '';
  const nudeWord = words.match(NUDE)?.[0], sexWord = words.match(SEX)?.[0];
  const nudeTags = tags.filter(t => NUDE_TAG.test(t)), sexTags = tags.filter(t => SEX_TAG.test(t) && !NUDE_TAG.test(t));
  const nudeNotes = notes.filter(t => /nud|naked/i.test(t)), sexNotes = notes.filter(t => /\bsex/i.test(t) && !/nud|naked/i.test(t));
  if (guide) checked.push('IMDb parents guide');
  if (tags.length || notes.length || guide?.tmdb) checked.push('TMDB');
  const level = guide?.level || null;
  const has = !!(nudeWord || nudeTags.length || nudeNotes.length || level === 'Severe');
  const sex = !has && !!(sexWord || sexTags.length || sexNotes.length || level === 'Moderate');
  if (level) why.push(`IMDb parents guide: ${level}${nudeWord ? ` (mentions “${nudeWord.toLowerCase()}”)` : sexWord && !has ? ` (mentions “${sexWord.toLowerCase()}”)` : ''}`);
  else if (nudeWord) why.push(`IMDb parents guide mentions “${nudeWord.toLowerCase()}”`);
  if (nudeTags.length) why.push(`TMDB tags: ${nudeTags.slice(0, 3).join(', ')}`);
  else if (sexTags.length && !has) why.push(`TMDB tags: ${sexTags.slice(0, 3).join(', ')}`);
  if (nudeNotes.length) why.push(`age rating notes: ${[...new Set(nudeNotes)].slice(0, 2).join(', ')}`);
  const keep = has ? scenes.filter(x => x.nude) : sex ? scenes : [];
  return { has, sex, level, why, checked, scenes: keep.slice(0, 15), more: Math.max(0, keep.length - 15) };
}

async function readGuide(imdbId) {
  if (!imdbId) return null;
  const url = `https://www.imdb.com/title/${encodeURIComponent(imdbId)}/parentalguide/`, d = globalThis.__desktop;
  let html = '';
  if (d?.getPage) { // the Windows app: a hidden browser window (IMDb turns some plain downloads away)
    const r = await d.getPage(url, { render: true, wait: 'script#__NEXT_DATA__, #advisory-nudity, [data-testid*="nudity"]', timeout: 25000 }).catch(() => null);
    if (r && r.status < 400) html = r.text;
  }
  if (!html) { const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'text/html,*/*', 'Accept-Language': 'en-US,en;q=0.9' }, signal: AbortSignal.timeout(15000) }); if (!r.ok) throw new Error(`IMDb answered ${r.status}`); html = await r.text(); }
  return parseGuide(html);
}
async function readNotes(tmdbId) { // age-rating notes (TMDB "descriptors"): some countries list "Nudity" / "Sex"
  const j = await tmdbGet(`/movie/${encodeURIComponent(tmdbId)}/release_dates`, 8000);
  const out = []; for (const c of j?.results || []) for (const r of c.release_dates || []) for (const x of r.descriptors || []) if (x) out.push(String(x));
  return out;
}

/** The heads-up for one movie (cached 30 days). → { has, sex, level, why[], checked[], scenes[{nude, at, label, exact, text}], at } or { unknown: true } */
export async function checkNudity({ tmdbId, imdbId, runtime }, force = false) {
  db.nudity ||= {};
  const k = String(tmdbId || imdbId || ''); if (!k) return { unknown: true };
  const hit = db.nudity[k];
  if (!force && hit && hit.v === 2 && Date.now() - hit.at < 30 * 864e5) return hit;
  let tags = [], tmdbOk = false;
  if (tmdbId && (db.settings.tmdbKey || '').trim()) { const m = await getMovie(tmdbId, 8000).catch(() => null); if (m) { tmdbOk = true; tags = m.keywords || []; imdbId ||= m.imdbId; runtime ||= m.runtime; } }
  const [g, n] = await Promise.allSettled([readGuide(imdbId), tmdbOk ? readNotes(tmdbId) : Promise.resolve([])]);
  const guide = g.value || null, notes = n.value || [];
  if (!guide && !tmdbOk) return { unknown: true, error: g.reason?.message || null };
  const v = { ...judge({ guide: guide || (tmdbOk ? { tmdb: true, level: null, text: '', items: [] } : null), tags, notes, runtime }), at: Date.now(), v: 2 };
  if (!guide) v.why.push("(couldn't read the IMDb parents guide: TMDB only)");
  if (!guide && !v.checked.includes('TMDB')) v.checked.push('TMDB');
  db.nudity[k] = v; save();
  return v;
}

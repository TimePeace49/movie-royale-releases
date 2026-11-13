// 🖼️ Pictures of the marathon's things (1.77.0, Derek: "I want the character to be what the item is. So if it's a can it will
// be that can. Get just the image off the internet. If it's a bag of chips then it will be that bag of chips").
// For each thing without a picture: search the web's pictures for its name (DuckDuckGo images, then Bing images), save the
// first one that downloads on this PC (so it works offline and on stream) and keep the other results, so 🔄 Another picture
// can step through them. The game screens cut the picture out of its background (public/cutout.js).
// Workouts don't get one: they fight as a 🏋️ character holding a sign.
import fs from 'fs';
import path from 'path';
import { db, save, UPLOADS } from './store.js';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
const DAY = 864e5;
async function getText(url, headers = {}) {
  if (globalThis.__desktop?.getPage && !Object.keys(headers).length) { const r = await globalThis.__desktop.getPage(url); if (r.status >= 400) throw new Error(`answered ${r.status}`); return r.text; }
  const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'text/html,application/json,*/*', 'Accept-Language': 'en-US,en;q=0.9', ...headers }, signal: AbortSignal.timeout(15000) });
  if (!r.ok) throw new Error(`answered ${r.status}`); return r.text();
}
const decode = t => String(t || '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&#x27;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
async function ddg(q) {
  const html = await getText(`https://duckduckgo.com/?q=${encodeURIComponent(q)}&iax=images&ia=images`);
  const vqd = (html.match(/vqd=["']?([\d-]+)["']?/) || [])[1]; if (!vqd) throw new Error('no picture search key');
  const j = JSON.parse(await getText(`https://duckduckgo.com/i.js?l=us-en&o=json&q=${encodeURIComponent(q)}&vqd=${vqd}&f=,,,,,&p=1`, { Referer: 'https://duckduckgo.com/', Accept: 'application/json' }));
  return (j.results || []).map(x => x.image || x.thumbnail).filter(Boolean);
}
async function bing(q) {
  const html = await getText(`https://www.bing.com/images/search?q=${encodeURIComponent(q)}&form=HDRSC2&first=1`);
  const out = []; for (const m of html.matchAll(/murl&quot;:&quot;(.*?)&quot;/g)) out.push(decode(m[1]));
  if (!out.length) for (const m of html.matchAll(/"murl":"(.*?)"/g)) out.push(m[1].replace(/\\\//g, '/'));
  return out;
}
/** Picture links for a thing's name (the best first). */
export async function search(name) {
  const q = String(name || '').trim().slice(0, 100); if (!q) return [];
  const errs = [];
  for (const fn of [ddg, bing]) { try { const r = (await fn(q + ' product')).filter(u => /^https?:\/\//.test(u)); if (r.length) return [...new Set(r)].slice(0, 15); } catch (e) { errs.push(`${fn.name}: ${e.message}`); } }
  throw new Error(errs.length ? `Couldn't reach the picture search (${errs.join(' · ')})` : 'No pictures found for that name.');
}
async function download(url, name) {
  try {
    const r = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(20000) });
    if (!r.ok) return null;
    const type = r.headers.get('content-type') || ''; if (!/^image\//.test(type) && !/\.(png|jpe?g|webp|gif)(\?|$)/i.test(url)) return null;
    const ext = /svg/.test(type) ? 'svg' : /png/.test(type) ? 'png' : /webp/.test(type) ? 'webp' : /gif/.test(type) ? 'gif' : 'jpg';
    const buf = Buffer.from(await r.arrayBuffer()); if (buf.length < 200 || buf.length > 15e6) return null;
    fs.mkdirSync(UPLOADS, { recursive: true }); const file = `${name}.${ext}`; fs.writeFileSync(path.join(UPLOADS, file), buf); return '/uploads/' + file;
  } catch { return null; }
}
const wanted = (e, kindOf) => e.status === 'active' && !e.fx && kindOf(e) !== 'workout'; /* (🌀 screen effects in the marathon battle aren't products: no picture search) */
/** Find (or with next: step to the next) picture for one thing. Returns {ok, image} or {error}. */
export async function findOne(e, { next = false } = {}) {
  let alts = Array.isArray(e.picAlts) ? e.picAlts : null, i = next ? (Number(e.picIdx) || 0) + 1 : 0;
  if (!alts || !alts.length || (!next && e.picFor !== e.label)) { alts = await search(e.label); e.picAlts = alts; e.picFor = e.label; i = 0; }
  for (let tries = 0; tries < alts.length; tries++, i++) {
    const k = i % alts.length, img = await download(alts[k], `item-${e.id}-${Date.now().toString(36)}`);
    if (img) { if (e.picAuto && /^\/uploads\/item-[\w-]+\.\w+$/.test(e.image || '')) { try { fs.unlinkSync(path.join(UPLOADS, e.image.slice(9))); } catch {} } e.image = img; // (the picture it found before goes: only ones it found itself)
      e.picIdx = k; e.picAuto = true; e.picTried = Date.now(); save(); return { ok: true, image: img, n: k + 1, of: alts.length }; }
  }
  e.picTried = Date.now(); save(); return { error: 'None of the pictures found would download.' };
}
let busy = false;
/** Every thing in the marathon battle that has no picture yet (each one tried at most once a day unless force). */
export async function fillMissing(list, kindOf, { force = false, onEach } = {}) {
  if (!list || busy) return { busy };
  busy = true; const done = [], failed = [];
  try {
    for (const e of list.entries.filter(x => wanted(x, kindOf) && !x.image && (force || !(Date.now() - (x.picTried || 0) < DAY)))) {
      try { const r = await findOne(e); (r.ok ? done : failed).push(e.label); } catch (err) { e.picTried = Date.now(); failed.push(e.label); if (!failed.err) failed.err = err.message; }
      onEach?.();
    }
  } finally { busy = false; save(); }
  return { done, failed, err: failed.err };
}
export const missing = (list, kindOf) => list ? list.entries.filter(x => wanted(x, kindOf) && !x.image).length : 0;

// 🧪 pretend product photos on a white background (the cloud test machine can't reach picture sites): proves the cut-out
const FAKE = {
  can: (c, t) => `<rect width="300" height="400" fill="#fff"/><ellipse cx="150" cy="70" rx="80" ry="22" fill="#bbb"/><rect x="70" y="70" width="160" height="270" fill="${c}"/><ellipse cx="150" cy="340" rx="80" ry="22" fill="${c}"/><rect x="70" y="150" width="160" height="70" fill="#fff" opacity=".9"/><text x="150" y="198" font-size="34" font-family="Arial Black,Arial" text-anchor="middle" fill="${c}">${t}</text>`,
  bag: (c, t) => `<rect width="300" height="400" fill="#fff"/><path d="M60 50 L240 50 L250 70 L235 340 L245 360 L55 360 L65 340 L50 70 Z" fill="${c}"/><circle cx="150" cy="200" r="62" fill="#ffd23a"/><text x="150" y="212" font-size="32" font-family="Arial Black,Arial" text-anchor="middle" fill="#a01010">${t}</text>`,
  jar: (c, t) => `<rect width="300" height="400" fill="#f4f4f4"/><rect x="90" y="40" width="120" height="40" rx="8" fill="#c8c8c8"/><rect x="65" y="80" width="170" height="280" rx="40" fill="${c}" opacity=".9"/><rect x="80" y="170" width="140" height="80" fill="#fff8e0"/><text x="150" y="222" font-size="30" font-family="Arial Black,Arial" text-anchor="middle" fill="#2a5a1a">${t}</text>`,
  box: (c, t) => `<rect width="300" height="400" fill="#fff"/><rect x="60" y="30" width="180" height="340" fill="${c}"/><rect x="60" y="30" width="180" height="40" fill="#fff" opacity=".25"/><circle cx="150" cy="230" r="55" fill="#fff" opacity=".85"/><text x="150" y="130" font-size="34" font-family="Arial Black,Arial" text-anchor="middle" fill="#fff">${t}</text>`
};
export const FAKE_THINGS = [['Fizzy Cola', 'can', '#d01818', 'COLA'], ['Cheese Puffs', 'bag', '#f07a10', 'PUFFS'], ['Pickle Jar', 'jar', '#5aa83a', 'PICKLE'], ['Choco Crunch', 'box', '#6a3a1a', 'CRUNCH'], ['Lemon Soda', 'can', '#e8c818', 'LEMON'], ['Spicy Chips', 'bag', '#b01030', 'SPICY'], ['Ghost Peppers', 'jar', '#c82a1a', 'HOT!'], ['Oat Rings', 'box', '#3a6ad8', 'OATS']];
export function fakePic(i) {
  const [name, kind, col, word] = FAKE_THINGS[i % FAKE_THINGS.length], file = `test-thing-${i % FAKE_THINGS.length}.svg`, f = path.join(UPLOADS, file);
  if (!fs.existsSync(f)) { fs.mkdirSync(UPLOADS, { recursive: true }); fs.writeFileSync(f, `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="400" viewBox="0 0 300 400">${FAKE[kind](col, word)}</svg>`); }
  return { name, image: '/uploads/' + file };
}

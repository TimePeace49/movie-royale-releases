// 🧾 The complete history (1.72.0, Derek: "in the history tab add a tab that it leaves a history for everything that is done.
// from spin, what it landed on, to luck earned to lost reset to a win. to what card pack wins. this is a complete history"):
// one line for everything that happens, kept for good: one file per day in data/activity/ (2026-11-04.jsonl, one line each).
// Nothing is ever taken out: ⏪ undo adds a line, it never erases the spins it took back. History → 🧾 Everything shows it.
import fs from 'fs';
import path from 'path';
import { DATA, uid } from './store.js';

export const DIR = path.join(DATA, 'activity');
try { fs.mkdirSync(DIR, { recursive: true }); } catch {}
// the kinds of things (History → 🧾 Everything filters by these)
export const CATS = {
  wheel: ['🎡', 'Wheel'], battle: ['⚔️', 'Battles'], luck: ['🍀', 'Luck'], cards: ['🃏', 'Card battles'], spins: ['🎟️', 'Free spins'],
  points: ['💜', 'Channel points'], money: ['💵', 'Subs, bits & tips'], chat: ['💬', 'Chat'], discord: ['🎬', 'Discord picks'], stream: ['📺', 'Stream'], test: ['🧪', 'Tests']
};
const p2 = n => String(n).padStart(2, '0');
export const dayOf = t => { const d = new Date(t); return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`; };
const fileOf = day => path.join(DIR, day + '.jsonl');
let buf = [], flushT = null, hook = () => {}, errAt = 0, seq = 0;
const cache = new Map(); // day → its lines (oldest first); a few days are kept in memory, today's always
export function onLine(fn) { hook = fn; }
const short = (v, n) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, n);
/** Something happened: one line in the complete history. cat = a CATS key; text = plain words; x = { icon, who, kind, list, wheel, n, test, items: [short lines], id… } */
export function act(cat, text, x = {}) {
  try {
    const r = { id: uid(), at: Date.now(), cat: CATS[cat] ? cat : 'stream', text: short(text, 500) };
    if (x.icon) r.icon = short(x.icon, 8); if (x.who) r.who = short(x.who, 60); if (x.kind) r.kind = short(x.kind, 30);
    if (x.list) r.list = short(x.list, 80); if (x.wheel) r.wheel = short(x.wheel, 80); if (x.test) r.test = true;
    if (Number.isFinite(x.n)) r.n = x.n;
    if (Array.isArray(x.items) && x.items.length) r.items = x.items.slice(0, 60).map(s => short(s, 160)).filter(Boolean);
    r.seq = ++seq; // (lines from the same moment keep their order)
    buf.push(r); const d = dayOf(r.at); if (cache.has(d)) cache.get(d).push(r);
    if (!flushT) flushT = setTimeout(flush, 250);
    try { hook(r); } catch {}
    return r;
  } catch { return null; } // (the history must never break the thing that happened)
}
export function flush() {
  clearTimeout(flushT); flushT = null; if (!buf.length) return;
  const by = new Map(); for (const r of buf) { const d = dayOf(r.at); if (!by.has(d)) by.set(d, []); by.get(d).push(JSON.stringify(r)); }
  buf = [];
  for (const [d, lines] of by) {
    try { fs.appendFileSync(fileOf(d), lines.join('\n') + '\n'); }
    catch (e) { if (Date.now() - errAt > 60000) { errAt = Date.now(); console.error('[history] couldn\'t save the complete history:', e.message); } }
  }
}
process.on('exit', flush);
function readDay(day) {
  if (cache.has(day)) { const v = cache.get(day); cache.delete(day); cache.set(day, v); return v; } // (most recently used last)
  let rows = [];
  try { for (const l of fs.readFileSync(fileOf(day), 'utf8').split('\n')) { if (!l) continue; try { rows.push(JSON.parse(l)); } catch {} } } catch {}
  rows.sort((a, b) => a.at - b.at || (a.seq || 0) - (b.seq || 0));
  cache.set(day, rows);
  const today = dayOf(Date.now());
  while (cache.size > 12) { const k = [...cache.keys()].find(x => x !== today); if (!k) break; cache.delete(k); }
  return rows;
}
export function days() { try { return fs.readdirSync(DIR).filter(f => /^\d{4}-\d\d-\d\d\.jsonl$/.test(f)).map(f => f.slice(0, 10)).sort().reverse(); } catch { return []; } }
const matches = (r, f) => (!f.cats || f.cats.includes(r.cat)) && (f.tests || !r.test) && (!f.q || [r.text, r.who, r.list, r.wheel, ...(r.items || [])].some(v => v && String(v).toLowerCase().includes(f.q)));
/** Newest first. before (+ beforeSeq) = only lines older than that line; cats = ['wheel', …]; q = words to find; tests = include 🧪 practice / test lines. */
export function read({ before = Infinity, beforeSeq = Infinity, limit = 300, cats = null, q = '', tests = true, day = null } = {}) {
  flush();
  const f = { cats: cats && cats.length ? cats : null, q: String(q || '').toLowerCase().trim(), tests: tests !== false }, out = [];
  let more = false;
  const list = day ? [day] : days();
  for (const d of list) {
    if (Number.isFinite(before) && d > dayOf(before)) continue;
    const rows = readDay(d);
    for (let i = rows.length - 1; i >= 0; i--) {
      const r = rows[i]; if (r.at > before || (r.at === before && (r.seq || 0) >= beforeSeq)) continue;
      if (!matches(r, f)) continue;
      if (out.length >= limit) { more = true; break; }
      out.push(r);
    }
    if (more) break;
  }
  return { rows: out, more, next: out.length ? out[out.length - 1].at : null };
}
/** How many lines a day had, per kind (the day headers in History → 🧾 Everything). */
export function dayCount(day) { const c = {}; for (const r of readDay(day)) c[r.cat] = (c[r.cat] || 0) + 1; return c; }
const csvCell = v => { const s = String(v ?? ''); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
/** ⬇️ Download: everything from `from` to `to` (times), oldest first, as a spreadsheet file. */
export function csv({ from = 0, to = Date.now(), cats = null, q = '', tests = true } = {}) {
  flush();
  const f = { cats: cats && cats.length ? cats : null, q: String(q || '').toLowerCase().trim(), tests: tests !== false };
  const lines = ['date,time,kind,who,what,battle or wheel,details'];
  for (const d of days().reverse()) {
    if (d < dayOf(from) || d > dayOf(to)) continue;
    for (const r of readDay(d)) {
      if (r.at < from || r.at > to || !matches(r, f)) continue;
      const t = new Date(r.at);
      lines.push([`${t.getFullYear()}-${p2(t.getMonth() + 1)}-${p2(t.getDate())}`, t.toLocaleTimeString('en-US'), (CATS[r.cat] || ['', r.cat])[1], r.who || '', `${r.icon ? r.icon + ' ' : ''}${r.text}`, r.list || r.wheel || '', (r.items || []).join(' | ')].map(csvCell).join(','));
    }
  }
  return '﻿' + lines.join('\r\n');
}
/** Once, when the complete history starts (1.72.0): what the older history lists already had (wheel spins, battle wins, card packs,
 * free spins, alerts) goes in at the time it happened, marked `old` (it has less detail: luck changes weren't kept before). */
export function importOld(list) {
  flush();
  const by = new Map(); let n = 0;
  for (const x of list || []) {
    if (!x || !Number.isFinite(x.at) || !x.text) continue;
    const r = { id: uid(), at: x.at, cat: CATS[x.cat] ? x.cat : 'stream', text: short(x.text, 500), old: true, seq: ++n };
    for (const k of ['icon', 'who', 'kind', 'list', 'wheel']) if (x[k]) r[k] = short(x[k], k === 'icon' ? 8 : 80);
    if (x.test) r.test = true; if (Array.isArray(x.items) && x.items.length) r.items = x.items.slice(0, 60).map(s => short(s, 160));
    const d = dayOf(r.at); if (!by.has(d)) by.set(d, []); by.get(d).push(JSON.stringify(r));
  }
  for (const [d, lines] of by) { try { fs.appendFileSync(fileOf(d), lines.join('\n') + '\n'); } catch (e) { console.error('[history] couldn\'t fill in the older history:', e.message); } cache.delete(d); }
  return n;
}
/** 🧪 Test tab: the newest lines + where they're kept, to check it works. */
export function info() { flush(); const d = days(); return { dir: DIR, days: d.length, first: d[d.length - 1] || null, today: dayOf(Date.now()), todayLines: d[0] === dayOf(Date.now()) ? readDay(d[0]).length : 0 }; }
// small helpers for the words in the lines
export const pctW = n => `${Math.round((Number(n) || 0) * 100) / 100}%`;
export const plural = (n, a, b = a + 's') => `${n} ${n === 1 ? a : b}`;
export const q = s => `“${short(s, 120)}”`;

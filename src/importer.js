// Turns lists from other tools into Movie Royale lines ("Name x3"):
// Wheel of Names (.wheel files, share links, copied entries), Marbles on Stream / any CSV, JSON or plain text.
import { db } from './store.js';

const clean = s => String(s ?? '').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
const NAME_KEYS = ['text', 'name', 'label', 'title', 'username', 'user', 'displayName', 'display_name', 'entry', 'value', 'marble', 'player'];
const WEIGHT_KEYS = ['weight', 'odds', 'tickets', 'count', 'entries', 'chances', 'points'];

function fromObjects(arr) {
  const out = [];
  for (const o of arr) {
    if (typeof o === 'string' || typeof o === 'number') { const t = clean(o); if (t) out.push({ label: t, weight: 1 }); continue; }
    if (!o || typeof o !== 'object') continue;
    if (o.enabled === false || o.disabled === true) continue; // hidden wheel entries
    const k = NAME_KEYS.find(k => typeof o[k] === 'string' || typeof o[k] === 'number');
    if (!k) continue;
    const label = clean(o[k]); if (!label) continue;
    const wk = WEIGHT_KEYS.find(k => Number(o[k]) > 0);
    out.push({ label, weight: wk ? Number(o[wk]) : 1 });
  }
  return out;
}
/** Finds the biggest list of entries anywhere in a JSON blob (Wheel of Names keeps them under wheelConfig/config.entries). */
function fromJson(j) {
  let best = [];
  const walk = (v, depth) => {
    if (depth > 8 || !v || typeof v !== 'object') return;
    if (Array.isArray(v)) { const got = fromObjects(v); if (got.length > best.length) best = got; for (const x of v) if (x && typeof x === 'object') walk(x, depth + 1); return; }
    for (const [k, x] of Object.entries(v)) {
      if (k === 'entries' && Array.isArray(x)) { const got = fromObjects(x); if (got.length) { if (got.length >= best.length) best = got; continue; } }
      walk(x, depth + 1);
    }
  };
  walk(j, 0);
  return best;
}
function splitCsvLine(line, sep) {
  const out = []; let cur = '', q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') { if (q && line[i + 1] === '"') { cur += '"'; i++; } else q = !q; }
    else if (c === sep && !q) { out.push(cur); cur = ''; }
    else cur += c;
  }
  out.push(cur); return out.map(x => x.trim());
}
function fromCsv(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (!lines.length) return [];
  const sep = (lines[0].match(/\t/g) || []).length > (lines[0].match(/,/g) || []).length ? '\t' : lines[0].includes(';') && !lines[0].includes(',') ? ';' : ',';
  let rows = lines.map(l => splitCsvLine(l, sep));
  let ni = 0, wi = -1;
  const head = rows[0].map(h => h.toLowerCase());
  const hn = head.findIndex(h => NAME_KEYS.map(k => k.toLowerCase()).includes(h));
  if (hn >= 0) { ni = hn; wi = head.findIndex(h => WEIGHT_KEYS.includes(h)); rows = rows.slice(1); }
  else if (rows.every(r => r.length >= 2 && Number(r[1]) > 0)) wi = 1; // "name,3"
  return rows.map(r => ({ label: clean(r[ni]), weight: wi >= 0 && Number(r[wi]) > 0 ? Number(r[wi]) : 1 })).filter(x => x.label);
}
export function parseImport(text, name = '') {
  const t = String(text || '').replace(/^﻿/, '').trim();
  if (!t) return [];
  if (/^[[{]/.test(t)) { try { const got = fromJson(JSON.parse(t)); if (got.length) return got; } catch {} }
  if (/\.(csv|tsv)$/i.test(name) || (t.split(/\r?\n/).length > 1 && t.split(/\r?\n/).every(l => !l.trim() || /[,\t]/.test(l)) && /\.(csv|tsv|txt)$/i.test(name))) return fromCsv(t);
  return null; // plain text: let the normal list parser handle it (commas / new lines / x3)
}
export const toLines = items => items.map(i => `${i.label.replace(/,/g, ' ')}${i.weight && i.weight !== 1 ? ` x${Math.round(i.weight * 100) / 100}` : ''}`).join('\n');

/** Grab a list from a link: Wheel of Names share links, or any page/file that is JSON, CSV or text. */
export async function importLink(url) {
  url = String(url || '').trim();
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
  const u = new URL(url);
  const tries = [];
  if (/wheelofnames\.com$/i.test(u.hostname)) {
    const id = u.pathname.replace(/^\/+|\/+$/g, '').split('/').pop();
    if (!id) throw new Error('That Wheel of Names link has no wheel in it. Use the Share link (wheelofnames.com/xxx-xxx).');
    const key = (db.settings.wheelOfNamesKey || '').trim();
    const h = key ? { 'x-api-key': key } : {};
    tries.push([`https://wheelofnames.com/api/v1/wheels/shared/${encodeURIComponent(id)}`, h], [`https://wheelofnames.com/api/v1/wheels/${encodeURIComponent(id)}`, h], [`https://wheelofnames.com/api/v2/wheels/${encodeURIComponent(id)}`, h]);
  } else tries.push([url, {}]);
  let lastErr = null;
  for (const [href, headers] of tries) {
    try {
      const r = await fetch(href, { headers: { 'User-Agent': 'MovieRoyale', Accept: 'application/json,text/plain,*/*', ...headers }, signal: AbortSignal.timeout(10000) });
      if (!r.ok) { lastErr = new Error(`${r.status}`); continue; }
      const text = await r.text();
      const items = parseImport(text, u.pathname) || (/<html/i.test(text) ? [] : text.split(/\r?\n/).map(l => ({ label: clean(l), weight: 1 })).filter(x => x.label));
      if (items.length) return items;
    } catch (e) { lastErr = e; }
  }
  if (/wheelofnames/i.test(u.hostname)) throw new Error(`Wheel of Names didn't hand over that wheel${lastErr?.message === '401' || lastErr?.message === '403' ? ' (it needs an API key — add yours in Settings → Game)' : ''}. Easy way: open the wheel, click in the entries box, press Ctrl+A then Ctrl+C, and paste here.`);
  throw new Error(`Couldn't read a list from that link${lastErr ? ` (${lastErr.message})` : ''}.`);
}

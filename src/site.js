// 🌐 Viewer website (1.75.0, Derek: "a command in chat that sends a link… my stream, tabs with stats, history… stream interaction…
// a bootleg extension… history shows all things I tried, who's donated for battle, what it landed on, a link to the timestamp in the VOD").
// The page runs on the streamer's 24/7 Discord bot (Cloudflare: <bot>/live), so the PC is never reachable from the internet and
// the site stays up while the PC is off. Movie Royal connects to the bot's "site:main" room with the SYNC_KEY and keeps it fed:
//  info (channel, Twitch app id for sign-in), live (the battle on right now + the paid line), stats, history rows, profiles on request.
// Viewers sign in with Twitch on the page to guess the winner (points, leaderboard), vote in polls Derek starts, and see their own page.
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import WebSocket from 'ws';
import { db, save, ROOT } from './store.js';

export const status = { state: 'off', error: null, since: 0, viewers: 0, page: null, predCounts: null, pollCounts: null, lastPred: null };
let hooks = { info: () => ({}), live: () => ({}), stats: () => ({}), mara: () => null, pick: () => ({ ok: false }), rows: () => [], profile: async () => null, predDone: () => {}, pollResult: () => {}, changed: () => {} };
export function setHooks(h) { hooks = { ...hooks, ...h }; }
export const SITE_V = 19; // the 24/7 bot version that has the website
const cloud = () => db.settings.cloud || {};
export const canRun = () => !!cloud().enabled && !!cloud().url && !!cloud().syncKey;
export const on = () => db.settings.siteOn === true && canRun();
export const url = () => canRun() ? cloud().url.replace(/\/+$/, '') + '/live' : '';
const PAGE = path.join(ROOT, 'public', 'live.html');

// ---------- the connection ----------
let ws = null, retry = 3000, retryT = null, pingT = null, tickT = null, sent = {}, rowHash = new Map(), lastRowsV = -1, haveLast = 0;
function setState(s, err = null) { if (status.state !== s || status.error !== err) { status.state = s; status.error = err; if (s === 'online') status.since = Date.now(); hooks.changed(); } }
export function connect() {
  clearTimeout(retryT); clearInterval(pingT);
  if (ws) { try { ws.removeAllListeners(); ws.terminate(); } catch {} ws = null; }
  if (!on()) { setState('off'); return; }
  const c = cloud(), u = c.url.replace(/\/+$/, '').replace(/^http/, 'ws') + '/site/app';
  setState('connecting', status.error);
  let sock; try { sock = new WebSocket(u, { headers: { Authorization: `Bearer ${c.syncKey}` }, handshakeTimeout: 12000 }); } catch (e) { return later(e.message); }
  ws = sock;
  sock.on('open', () => { retry = 3000; setState('online'); pingT = setInterval(() => { try { sock.ping(); } catch {} }, 30000); uploadPage().catch(() => {}); });
  sock.on('message', raw => { let m; try { m = JSON.parse(String(raw)); } catch { return; } onMsg(m).catch(e => console.error('[viewer site]', e.message)); });
  sock.on('unexpected-response', (req, res) => later(res.statusCode === 404 || res.statusCode === 501 ? 'your 24/7 bot needs an update first (Settings → 🌐 Viewer site → Update)' : `the 24/7 bot answered ${res.statusCode}`));
  sock.on('error', e => { if (ws === sock) later(/ENOTFOUND|EAI_AGAIN/.test(e.message) ? 'no internet' : e.message); });
  sock.on('close', code => { if (ws !== sock) return; later(code === 4000 ? null : status.error); });
}
function later(err) {
  if (ws) { try { ws.removeAllListeners(); ws.terminate(); } catch {} ws = null; }
  clearInterval(pingT); clearTimeout(retryT);
  if (!on()) return setState('off');
  setState('waiting', err || null);
  retryT = setTimeout(connect, retry); retry = Math.min(retry * 1.7, 60000);
}
const send = m => { if (!ws || ws.readyState !== 1) return false; try { ws.send(JSON.stringify(m)); return true; } catch { return false; } };
export const online = () => !!ws && ws.readyState === 1;

async function onMsg(m) {
  if (m.t === 'have') { haveLast = m.last || 0; sent = {}; rowHash.clear(); lastRowsV = -1; status.viewers = m.viewers || 0; tick(true); return; }
  if (m.t === 'viewers') { status.viewers = m.n || 0; hooks.changed(); return; }
  if (m.t === 'want') { const p = await hooks.profile(m.login, m); if (p) send({ t: 'profile', login: m.login, profile: p }); return; }
  if (m.t === 'pick') { let r; try { r = await hooks.pick(m); } catch (e) { r = { ok: false, error: e.message }; } send({ t: 'toUser', login: m.login, msg: { t: 'pickRes', ok: !!r.ok, text: r.text || '', error: r.error || '' } }); return; } // 🏃 a pick from the website
  if (m.t === 'predCounts') { status.predCounts = { pid: m.pid, counts: m.counts }; hooks.changed(); return; }
  if (m.t === 'predDone') { status.lastPred = m; hooks.predDone(m); hooks.changed(); return; }
  if (m.t === 'pollCounts') { status.pollCounts = { id: m.id, counts: m.counts }; hooks.changed(); return; }
  if (m.t === 'pollResult') { status.pollCounts = { id: m.id, counts: m.counts }; hooks.pollResult(m); hooks.changed(); }
}
/** Send what changed (live every ~1.5 s, stats/history when they change). */
function tick(all) {
  if (!online()) return;
  for (const [k, fn] of [['info', hooks.info], ['live', hooks.live], ['stats', hooks.stats], ['mara', hooks.mara]]) {
    if (k === 'stats' && !all && Date.now() - (sent.statsAt || 0) < 20000) continue;
    let v; try { v = fn(); } catch (e) { console.error('[viewer site] ' + k, e.message); continue; }
    const j = JSON.stringify(v); if (j === sent[k]) continue;
    if (send({ t: k, [k]: v })) { sent[k] = j; if (k === 'stats') sent.statsAt = Date.now(); }
  }
  let rows; try { rows = hooks.rows(); } catch (e) { console.error('[viewer site] history', e.message); rows = []; }
  const out = [], recent = new Set(rows.slice(-30).map(r => r.id)); // (after reconnecting: the bot already has everything up to haveLast; only the newest 30 are sent again in case they changed)
  for (const r of rows) { const h = JSON.stringify(r); if (rowHash.get(r.id) === h) continue; rowHash.set(r.id, h); if (all && r.at <= haveLast && !recent.has(r.id)) continue; out.push(r); }
  for (let i = 0; i < out.length; i += 200) send({ t: 'hist', rows: out.slice(i, i + 200) });
}
clearInterval(tickT); tickT = setInterval(() => { if (online()) tick(false); }, 1500);

/** The page itself lives in the bot's storage: uploaded when this copy of Movie Royal has a different one. */
async function uploadPage() {
  const c = cloud(), body = fs.readFileSync(PAGE, 'utf8'), v = crypto.createHash('sha256').update(body).digest('hex').slice(0, 16);
  const have = await fetch(c.url.replace(/\/+$/, '') + '/site/page/v', { signal: AbortSignal.timeout(10000) }).then(r => r.ok ? r.text() : '').catch(() => '');
  if (have.trim() === v) { status.page = v; return; }
  const r = await fetch(c.url.replace(/\/+$/, '') + '/site/page?v=' + v, { method: 'PUT', headers: { Authorization: `Bearer ${c.syncKey}`, 'content-type': 'text/html' }, body, signal: AbortSignal.timeout(30000) });
  if (!r.ok) throw new Error('page upload ' + r.status);
  status.page = v; hooks.changed();
}

// ---------- 🖼️ pictures for the website (map screenshots, battle pictures): uploaded once each, by their content ----------
const imgCache = new Map(); let imgBusy = false; const imgQ = [];
/** The website address of a picture on this PC (null until it's known). Uploads it in the background the first time. */
export function img(file) {
  if (!file || !canRun()) return null;
  let st; try { st = fs.statSync(file); } catch { return null; }
  const key = file + ':' + st.mtimeMs, c = imgCache.get(key); if (c) return c.url;
  const h = crypto.createHash('sha1').update(fs.readFileSync(file)).digest('hex').slice(0, 32), url = '/site/img/' + h;
  imgCache.set(key, { url }); if (!(db.siteImgs ||= {})[h]) { imgQ.push({ file, h }); pumpImgs(); }
  return url;
}
async function pumpImgs() {
  if (imgBusy || !online()) return; imgBusy = true;
  try { while (imgQ.length && online()) { const { file, h } = imgQ.shift(); if (db.siteImgs[h]) continue; const ext = path.extname(file).slice(1).toLowerCase(); const r = await fetch(cloud().url.replace(/\/+$/, '') + '/site/img?h=' + h, { method: 'PUT', headers: { Authorization: `Bearer ${cloud().syncKey}`, 'content-type': ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : ext === 'gif' ? 'image/gif' : 'image/jpeg' }, body: fs.readFileSync(file), signal: AbortSignal.timeout(30000) }).catch(() => null); if (r?.ok) { db.siteImgs[h] = 1; save(); } } } finally { imgBusy = false; }
}
setInterval(pumpImgs, 30000);

// ---------- 🗳️ polls + 🔮 guesses ----------
export function pollStart({ q, opts, mins }) {
  const o = (opts || []).map(x => String(x || '').trim()).filter(Boolean).slice(0, 6);
  if (!String(q || '').trim() || o.length < 2) throw new Error('A poll needs a question and at least 2 answers.');
  if (!online()) throw new Error("The viewer website isn't connected right now.");
  const poll = { id: crypto.randomBytes(5).toString('hex'), q: String(q).trim().slice(0, 140), opts: o, endsAt: Date.now() + Math.max(0.5, Math.min(60, Number(mins) || 2)) * 60000 };
  db.sitePoll = poll; status.pollCounts = { id: poll.id, counts: o.map(() => 0) }; save(); send({ t: 'poll', poll }); hooks.changed();
  return poll;
}
export function pollEnd() { if (!db.sitePoll) return; send({ t: 'pollEnd' }); }
export function pollClear() { db.sitePoll = null; save(); send({ t: 'poll', poll: null }); hooks.changed(); }
export const result = r => send({ t: 'result', ...r }); // { pid, winnerId, winner, pct }
export const resetPoints = () => send({ t: 'resetPoints' });
export const wipeHistory = () => { rowHash.clear(); return send({ t: 'wipe' }); };
export const resend = () => { sent = {}; rowHash.clear(); tick(true); };

// ---------- ▶ VOD links ----------
// A battle remembers which Twitch stream it was in + when it started; the VOD (Twitch's "past broadcast") is found later by the
// stream id (Twitch cuts streams at 48 hours, so a marathon is several streams: each battle points into its own VOD).
let streamNow = null, streamAt = 0, lookups = {};
export function setStream(s) { streamNow = s; streamAt = Date.now(); }
export const vodNow = () => streamNow && Date.now() - streamAt < 20 * 60000 ? { sid: String(streamNow.id), st: streamNow.startedAt } : null;
export function vodUrl(vod, at, find) {
  if (!vod?.sid) return null;
  const vid = (db.vodIds || {})[vod.sid];
  if (!vid) { if (find && Date.now() - (lookups[vod.sid] || 0) > 5 * 60000) { lookups[vod.sid] = Date.now(); find(vod.sid).then(id => { if (id) { (db.vodIds ||= {})[vod.sid] = id; save(); } }).catch(() => {}); } return null; }
  const s = Math.max(0, Math.round(((at || 0) - (vod.st || 0)) / 1000) - 10), h = Math.floor(s / 3600), mm = Math.floor(s % 3600 / 60), ss = s % 60; // (10 s early, so you see it start)
  return `https://www.twitch.tv/videos/${vid}?t=${h}h${mm}m${ss}s`;
}
export const info = () => ({ on: on(), canRun: canRun(), url: url(), state: status.state, error: status.error, viewers: status.viewers, poll: db.sitePoll || null, pollCounts: status.pollCounts, predCounts: status.predCounts, lastPred: status.lastPred, page: status.page });

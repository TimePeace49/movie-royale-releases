// 🟢 Kick (1.90.0, Derek, dev mode only): "make this work with Kick. Make it easy to switch it over."
// Part 1 = chat: Movie Royal reads your Kick chat and answers in it, so !join, your 🤖 chat bot commands, quotes, timers…
// work there. One switch picks the platform (Twitch or Kick); nothing is deleted when you switch back.
//  - READING chat needs no sign-in: Kick's public chat feed (a Pusher websocket, the same one the website uses). It is not an
//    official tool for apps, so Kick could change it.
//  - TALKING needs a sign-in with a Kick app of your own (client id + secret from kick.com → Settings → Developer), like Twitch.
//  - Live / offline comes from the official channel info every minute.
// Data: db.kick = { on, clientId, secret, token {access, refresh, exp}, user {id, name, slug}, slug, chatroomId, chatroomFor }
import crypto from 'crypto';
import WebSocket from 'ws';
import { db, save } from './store.js';

const ID = process.env.KICK_ID_URL || 'https://id.kick.com';
const API = process.env.KICK_API_URL || 'https://api.kick.com/public/v1';
const WEB = process.env.KICK_WEB_URL || 'https://kick.com';
const WS = process.env.KICK_WS_URL || 'wss://ws-us2.pusher.com/app/32cbd69e4b950bf97679?protocol=7&client=js&version=8.4.0&flash=false';
export const SCOPES = ['user:read', 'channel:read', 'chat:write', 'events:subscribe'];
export const redirectUri = port => `http://localhost:${port}/kick/callback`;

const H = { chat: () => {}, live: () => {}, changed: () => {}, dev: () => false, getPage: null };
export const setHooks = h => Object.assign(H, h);
export const status = { chat: 'off', chatError: null, live: null, startedAt: 0, lastMsgAt: 0, sayError: null, lines: 0 };
export function data() { const d = (db.kick ||= {}); return d; }
export const on = () => H.dev() && !!data().on;
export const signedIn = () => !!data().token?.access;
export const canSay = () => on() && signedIn();
export const slug = () => String(data().slug || data().user?.slug || '').trim().toLowerCase();

// ---------- sign-in (OAuth 2.1 with PKCE) ----------
const pending = new Map(); // state → {verifier, at}
const b64u = b => Buffer.from(b).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
export function authUrl(port) {
  const d = data(); if (!d.clientId || !d.secret) throw new Error('Paste your Kick app\'s Client ID and Client Secret first');
  const state = crypto.randomBytes(16).toString('hex'), verifier = b64u(crypto.randomBytes(48)), challenge = b64u(crypto.createHash('sha256').update(verifier).digest());
  pending.set(state, { verifier, at: Date.now() }); for (const [k, v] of pending) if (Date.now() - v.at > 600000) pending.delete(k);
  const q = new URLSearchParams({ response_type: 'code', client_id: d.clientId, redirect_uri: redirectUri(port), scope: SCOPES.join(' '), code_challenge: challenge, code_challenge_method: 'S256', state });
  return `${ID}/oauth/authorize?${q}`;
}
async function tokenCall(form) {
  const r = await fetch(`${ID}/oauth/token`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(form), signal: AbortSignal.timeout(15000) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.access_token) throw new Error(j.error_description || j.message || j.error || `Kick sign-in answered ${r.status}`);
  return { access: j.access_token, refresh: j.refresh_token || null, exp: Date.now() + (Number(j.expires_in) || 3600) * 1000, scope: j.scope || '' };
}
export async function finishAuth(port, code, state) {
  const p = pending.get(state); if (!p) throw new Error('That sign-in is too old. Press Sign in with Kick again.'); pending.delete(state);
  const d = data();
  d.token = await tokenCall({ grant_type: 'authorization_code', code, client_id: d.clientId, client_secret: d.secret, redirect_uri: redirectUri(port), code_verifier: p.verifier });
  save(); await whoAmI().catch(e => { status.sayError = e.message; }); restart(); H.changed(); return d.user;
}
async function refresh() {
  const d = data(); if (!d.token?.refresh) throw new Error('Sign in with Kick again');
  const t = await tokenCall({ grant_type: 'refresh_token', refresh_token: d.token.refresh, client_id: d.clientId, client_secret: d.secret });
  d.token = { ...t, refresh: t.refresh || d.token.refresh }; save();
}
async function api(pathQ, opts = {}, retry = true) {
  const d = data(); if (!d.token?.access) throw new Error('Sign in with Kick first');
  if (d.token.exp && Date.now() > d.token.exp - 60000 && d.token.refresh) await refresh().catch(() => {});
  const r = await fetch(`${API}/${pathQ}`, { signal: AbortSignal.timeout(15000), ...opts, headers: { Authorization: `Bearer ${data().token.access}`, 'Content-Type': 'application/json', Accept: 'application/json', ...(opts.headers || {}) } });
  if (r.status === 401 && retry && data().token?.refresh) { await refresh(); return api(pathQ, opts, false); }
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.message || j.error || `Kick answered ${r.status}`);
  return j;
}
export async function whoAmI() {
  const d = data(), u = (await api('users')).data?.[0] || {}, c = (await api('channels').catch(() => ({}))).data?.[0] || {};
  d.user = { id: u.user_id || c.broadcaster_user_id || null, name: u.name || c.slug || '', slug: String(c.slug || u.name || '').toLowerCase(), avatar: u.profile_picture || '' };
  if (!d.slug) d.slug = d.user.slug; save(); liveFrom(c); return d.user;
}
export function signOut() { const d = data(); d.token = null; d.user = null; save(); H.changed(); }

// ---------- talking ----------
export async function say(message) {
  const d = data(); if (!d.token?.access) throw new Error('Sign in with Kick first');
  const body = { content: String(message).slice(0, 500), type: 'user' }; if (d.user?.id) body.broadcaster_user_id = Number(d.user.id) || d.user.id;
  try { const j = await api('chat', { method: 'POST', body: JSON.stringify(body) }); status.sayError = null; return j.data?.message_id || true; }
  catch (e) { status.sayError = e.message; throw e; }
}

// ---------- live / offline (official channel info, once a minute) ----------
function liveFrom(c) {
  if (!c || !c.stream) return; const was = status.live, now = !!c.stream.is_live;
  status.live = now; status.startedAt = now ? Date.parse(c.stream.start_time || '') || status.startedAt || Date.now() : 0;
  if (was !== now && on()) { try { H.live(now); } catch {} H.changed(); }
}
async function liveCheck() { if (!on() || !signedIn()) return; try { liveFrom((await api('channels')).data?.[0]); } catch {} }
setInterval(liveCheck, 60000);

// ---------- reading chat (Kick's public chat feed) ----------
let sock = null, wantSock = false, retryT = null, pingT = null, lastData = 0;
function badgesOf(list) { const t = new Set((list || []).map(b => String(b.type || '').toLowerCase())); return { broadcaster: t.has('broadcaster'), mod: t.has('moderator'), vip: t.has('vip') || t.has('og'), sub: t.has('subscriber') || t.has('founder'), tier: t.has('subscriber') || t.has('founder') ? 1 : 0, months: Number((list || []).find(b => /subscriber/i.test(b.type))?.count) || 0 }; }
/** a Kick chat message → the same shape the rest of Movie Royal uses for Twitch chat */
export function toChat(p) {
  const s = p.sender || {}, text = String(p.content || '').replace(/\[emote:\d+:([^\]]+)\]/g, '$1').trim();
  return { kick: true, platform: 'kick', self: false, login: String(s.slug || s.username || '').toLowerCase(), name: s.username || s.slug || 'someone', text, userId: s.id != null ? 'k' + s.id : null, id: p.id || null, color: s.identity?.color || null, emotes: '', badges: badgesOf(s.identity?.badges), first: false, bits: 0, reward: null };
}
async function findChatroom(sl) { // the chat room's number, from the channel's public page data (asked once, then remembered)
  const d = data(); if (d.chatroomId && d.chatroomFor === sl) return d.chatroomId;
  const url = `${WEB}/api/v2/channels/${encodeURIComponent(sl)}`; let text = '';
  try { const r = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36' }, signal: AbortSignal.timeout(15000) }); if (r.ok) text = await r.text(); } catch {}
  if (!/"chatroom"/.test(text) && H.getPage) { try { text = String(await H.getPage(url)) || text; } catch {} } // (Kick's site sometimes only answers a real browser: the app's hidden window asks)
  const m = text.match(/"chatroom"\s*:\s*\{[^{}]*?"id"\s*:\s*(\d+)/); if (!m) throw new Error(`Could not find the chat room of kick.com/${sl}. Check the channel name, or type the chat room number in by hand.`);
  d.chatroomId = Number(m[1]); d.chatroomFor = sl; save(); return d.chatroomId;
}
function setChat(st, err) { if (status.chat === st && status.chatError === (err || null)) return; status.chat = st; status.chatError = err || null; H.changed(); }
async function connect() {
  clearTimeout(retryT); if (!wantSock) return;
  const sl = slug(); if (!sl) return setChat('off', 'Type your Kick channel name first');
  let room; try { room = await findChatroom(sl); } catch (e) { setChat('error', e.message); retryT = setTimeout(connect, 60000); return; }
  if (!wantSock) return;
  setChat('connecting');
  const ws = sock = new WebSocket(WS);
  const again = why => { if (sock !== ws) return; sock = null; clearInterval(pingT); if (wantSock) { setChat('error', why || 'The chat connection dropped: trying again'); retryT = setTimeout(connect, 5000); } };
  ws.on('open', () => { lastData = Date.now(); clearInterval(pingT); pingT = setInterval(() => { if (ws.readyState !== 1) return; if (Date.now() - lastData > 150000) { try { ws.terminate(); } catch {} return; } try { ws.send(JSON.stringify({ event: 'pusher:ping', data: {} })); } catch {} }, 45000); });
  ws.on('message', raw => {
    lastData = Date.now(); let m; try { m = JSON.parse(String(raw)); } catch { return; }
    if (m.event === 'pusher:connection_established') { try { ws.send(JSON.stringify({ event: 'pusher:subscribe', data: { auth: '', channel: `chatrooms.${room}.v2` } })); } catch {} return; }
    if (m.event === 'pusher_internal:subscription_succeeded') return setChat('on');
    if (m.event === 'pusher:ping') { try { ws.send(JSON.stringify({ event: 'pusher:pong', data: {} })); } catch {} return; }
    if (m.event !== 'App\\Events\\ChatMessageEvent') return;
    let p; try { p = typeof m.data === 'string' ? JSON.parse(m.data) : m.data; } catch { return; }
    if (!p || !p.sender) return;
    status.lastMsgAt = Date.now(); status.lines++;
    const c = toChat(p); if (!c.text || !on()) return;
    try { H.chat(c); } catch (e) { console.error('[kick] chat', e.message); }
  });
  ws.on('close', () => again()); ws.on('error', e => again('Could not reach Kick chat: ' + (e.message || e)));
}
export function restart() { stop(); if (on()) { wantSock = true; connect(); liveCheck(); } }
export function stop() { wantSock = false; clearTimeout(retryT); clearInterval(pingT); const s = sock; sock = null; try { s?.close(); } catch {} setChat('off'); }

// ---------- settings ----------
export function setCfg(b) {
  const d = data(); let re = false;
  if (b.clientId != null && String(b.clientId).trim() !== (d.clientId || '')) { d.clientId = String(b.clientId).trim(); }
  if (b.secret != null && String(b.secret).trim() && !/^•+/.test(String(b.secret))) d.secret = String(b.secret).trim();
  if (b.slug != null) { const s = String(b.slug).trim().toLowerCase().replace(/^https?:\/\/(www\.)?kick\.com\//, '').replace(/[^a-z0-9_-]/g, ''); if (s !== (d.slug || '')) { d.slug = s; d.chatroomId = null; re = true; } }
  if (b.chatroomId != null) { const n = Math.round(Number(b.chatroomId)); d.chatroomId = n > 0 ? n : null; d.chatroomFor = n > 0 ? slug() : null; re = true; }
  if (b.on != null && !!b.on !== !!d.on) { d.on = !!b.on; re = true; }
  save(); if (re) restart(); H.changed(); return info();
}
export const info = () => { const d = data(); return { on: !!d.on, dev: H.dev(), clientId: d.clientId || '', hasSecret: !!d.secret, signedIn: signedIn(), user: d.user ? { name: d.user.name, slug: d.user.slug } : null, slug: slug(), chatroomId: d.chatroomId || null, chat: status.chat, chatError: status.chatError, live: status.live, lastMsgAt: status.lastMsgAt, lines: status.lines, sayError: status.sayError, scopes: SCOPES }; };
export function start() { if (on()) restart(); }
setInterval(() => { if (on() !== wantSock) restart(); }, 15000); // (dev mode or the switch changed)

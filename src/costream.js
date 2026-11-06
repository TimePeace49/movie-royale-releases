// 🤝 Co-stream (1.71.0, Derek + Kirb): two streamers' Movie Royals linked for a shared stream.
//  • The one who invites hosts a private "room" on their 24/7 Discord bot (Cloudflare, cloud-worker.js → CoRoom). The invite
//    code = that bot's address + a long random room name. The friend pastes it once; both apps connect to the room with a WebSocket.
//  • Through the room each app shares its battle's state (running or not, map, …). While YOUR battle isn't running but your
//    partner's is, your chat's channel point / bits chaos goes into THEIR battle (and theirs into yours).
//  • Camera + battle picture: OBS's Virtual Camera shows a small "🤝 Co-stream share" scene (your camera + your game screen),
//    a hidden window sends it with VDO.Ninja (free, about a quarter second), and the partner's OBS gets it as a browser
//    source cut into two pieces: their camera, and their battle (that one shows by itself while their battle runs).
//    It's a picture of the real game screen, so both streams show the exact same fight.
import crypto from 'crypto';
import WebSocket from 'ws';
import { db, save } from './store.js';

const VERSION = 1;
export const CODE_PREFIX = 'MRCO1-';
export const status = { state: 'off', error: null, since: 0, partner: null, sending: false, video: { state: 'off', error: null }, pretend: null };
let hooks = { local: () => ({}), chaos: () => {}, changed: () => {}, partnerChanged: () => {}, log: () => {} };
export function setHooks(h) { hooks = { ...hooks, ...h }; }

export function cfg() {
  const c = (db.costream ||= {});
  c.me ||= crypto.randomBytes(8).toString('hex'); // this app (so a reconnect replaces its old seat in the room)
  c.chaos ??= true; c.showBattle ??= true; c.showCam ??= true; c.quality ||= 'normal'; // (low ≈ 1.2 Mbps, normal ≈ 2.5, high ≈ 4: Derek worried about lag, 1.71.0) c.video ??= true;
  return c;
}
/** Which side of BOTH streams your camera goes on (Derek, 1.71.0: "his camera is on the left side and mine on the right, for both streams"). Default: the one who invites = right, the one who joins = left. */
export const mySide = () => { const c = cfg(); return c.camSide === 'left' || c.camSide === 'right' ? c.camSide : c.role === 'guest' ? 'left' : 'right'; };
export const linked = () => !!(cfg().room && cfg().url);
const slug = s => String(s || '').toLowerCase().replace(/[^a-z0-9_]/g, '');
/** The VDO.Ninja names: made from the room + the streamer's Twitch name, so each side knows the other's without typing anything. */
export const streamId = (room, login) => 'mr' + crypto.createHash('sha256').update(String(room) + ':' + slug(login)).digest('hex').slice(0, 18);

// ---------- invite codes ----------
const b64 = s => Buffer.from(s).toString('base64url');
export function makeCode({ url, room, name }) { return CODE_PREFIX + b64(JSON.stringify({ u: url, r: room, n: name || '' })); }
export function readCode(code) {
  const s = String(code || '').trim().replace(/\s+/g, '');
  const i = s.indexOf(CODE_PREFIX); if (i < 0) throw new Error("That doesn't look like a co-stream code. It starts with " + CODE_PREFIX);
  let j; try { j = JSON.parse(Buffer.from(s.slice(i + CODE_PREFIX.length), 'base64url').toString('utf8')); } catch { throw new Error('That co-stream code is cut off or mistyped. Copy the whole thing again.'); }
  if (!/^(https:\/\/[^\s/]+|http:\/\/(127\.0\.0\.1|localhost)[:/])/.test(j.u || '') || !/^[a-zA-Z0-9_-]{16,64}$/.test(j.r || '')) throw new Error('That co-stream code is cut off or mistyped. Copy the whole thing again.');
  return { url: j.u.replace(/\/+$/, ''), room: j.r, name: String(j.n || '').slice(0, 40) };
}

// ---------- the room connection ----------
let ws = null, retry = 2000, retryTimer = null, pingTimer = null, sendTimer = null, lastSent = '', partners = new Map();
function setState(s, err = null) { if (status.state !== s || status.error !== err) { status.state = s; status.error = err; if (s === 'online') status.since = Date.now(); hooks.changed(); } }
function pickPartner() { // the other streamer (if a third app ever joins, the newest one with a state)
  const list = [...partners.values()].sort((a, b) => (b.at || 0) - (a.at || 0));
  const p = list.find(x => x.state) || list[0] || null;
  const before = JSON.stringify(status.partner); status.partner = p ? { ...p } : null;
  const nm = p?.state?.name || p?.who; if (nm && cfg().partnerName !== nm) { cfg().partnerName = nm; save(); } // (remembered for when they're away)
  if (JSON.stringify(status.partner) !== before) { hooks.partnerChanged(status.partner); hooks.changed(); }
}
export function connect() {
  clearTimeout(retryTimer); clearInterval(pingTimer);
  if (ws) { try { ws.removeAllListeners(); ws.terminate(); } catch {} ws = null; }
  if (!linked()) { setState('off'); partners.clear(); pickPartner(); return; }
  const c = cfg(), L = hooks.local() || {};
  const url = `${c.url.replace(/^http/, 'ws')}/co/${c.room}?id=${c.me}&who=${encodeURIComponent(L.name || 'streamer')}`;
  setState('connecting', status.error);
  let sock; try { sock = new WebSocket(url, { handshakeTimeout: 12000 }); } catch (e) { return later(e.message); }
  ws = sock;
  sock.on('open', () => { retry = 2000; setState('online'); lastSent = ''; sendState(true); pingTimer = setInterval(() => { try { sock.send('ping'); } catch {} }, 25000); });
  sock.on('message', raw => { const s = String(raw); if (s === 'pong') return; let m; try { m = JSON.parse(s); } catch { return; } onMessage(m); });
  sock.on('unexpected-response', (req, res) => { let body = ''; res.on('data', d => body += d); res.on('end', () => { let why = `the room answered ${res.statusCode}`; try { why = JSON.parse(body).error || why; } catch {} later(res.statusCode === 404 ? "the inviter's 24/7 bot doesn't have co-streaming yet: they need to update it in Movie Royal" : why); }); });
  sock.on('error', e => { if (ws === sock) later(friendly(e.message)); });
  sock.on('close', code => { if (ws !== sock) return; clearInterval(pingTimer); partners.clear(); pickPartner(); later(code === 4000 ? null : status.error); });
}
const friendly = m => /ENOTFOUND|EAI_AGAIN|getaddrinfo/i.test(m) ? "couldn't find the room (no internet, or the code is wrong)" : /ECONNREFUSED|ECONNRESET|socket hang up|timed? ?out/i.test(m) ? "couldn't reach the room (internet hiccup)" : m;
function later(err) {
  if (ws) { try { ws.removeAllListeners(); ws.terminate(); } catch {} ws = null; }
  clearInterval(pingTimer); clearTimeout(retryTimer);
  if (!linked()) return setState('off');
  setState('waiting', err || null);
  retryTimer = setTimeout(connect, retry); retry = Math.min(retry * 1.7, 30000);
}
export function disconnect() { const c = cfg(); c.room = ''; c.url = ''; save(); connect(); }

function onMessage(m) {
  const now = Date.now();
  if (m.t === 'room') { partners.clear(); for (const a of m.here || []) partners.set(a.id, { id: a.id, who: a.who, state: a.state || null, at: now }); pickPartner(); return; }
  if (m.t === 'join') { partners.set(m.from, { id: m.from, who: m.who, state: partners.get(m.from)?.state || null, at: now }); pickPartner(); lastSent = ''; sendState(true); return; } // (send ours again so the newcomer has it)
  if (m.t === 'leave') { partners.delete(m.from); pickPartner(); return; }
  if (m.t === 'state') { partners.set(m.from, { id: m.from, who: m.who, state: m.state || null, at: now }); pickPartner(); return; }
  if (m.t === 'chaos') { try { hooks.chaos(m); } catch (e) { hooks.log('[co-stream] ' + e.message); } return; }
}
function send(m) { if (!ws || ws.readyState !== 1) return false; try { ws.send(JSON.stringify(m)); return true; } catch { return false; } }

/** What this app tells the room about itself (hooks.local() + the camera picture info). Sent when it changes. */
export function localState() {
  const L = hooks.local() || {}, c = cfg();
  return { v: VERSION, ...L, camSide: mySide(), chaosIn: c.chaos !== false && L.chaosIn !== false, video: c.video !== false && status.video.state === 'on' ? { id: streamId(c.room, L.login || L.name), layout: status.video.layout || null, q: c.quality } : null };
}
function sendState(force) {
  if (!linked()) return;
  const st = localState(), k = JSON.stringify(st);
  if (!force && k === lastSent) return;
  if (send({ t: 'state', state: st })) lastSent = k;
}
clearInterval(sendTimer); sendTimer = setInterval(() => sendState(false), 1000);
export const nudge = () => sendState(false);

// ---------- chaos across the two chats ----------
const partnerState = () => status.pretend?.state || status.partner?.state || null;
export const partnerName = () => status.pretend?.who || partnerState()?.name || status.partner?.who || cfg().partnerName || 'your co-streamer';
export const partnerOnline = () => !!status.pretend || (status.state === 'online' && !!status.partner);
/** Is the partner's battle running right now (a ball battle that takes chaos)? */
export function partnerBattle() { const s = partnerState(); return !!(partnerOnline() && s && (s.phase === 'lobby' || s.phase === 'running') && !s.cards); }
/** Is a battle on the partner's screen right now (any kind: ball, characters, card packs)? Their battle picture shows in your OBS / app (1.75.0, Derek: watch each other's battles). */
export function partnerShowing() { const s = partnerState(); return !!(partnerOnline() && s && (s.showing ?? (s.phase === 'lobby' || s.phase === 'running'))); }
/** Should this chaos go to the partner? (yours isn't running, theirs is, both of you allow it, and it can do something on their map) */
export function wantsChaos(event, groundEvents = []) {
  const c = cfg(), s = partnerState();
  if (c.chaos === false || !partnerBattle() || s?.chaosIn === false) return false;
  if (s?.solid && groundEvents.includes(event)) return false; // (an edge collapse / lightning can't break a solid map)
  return true;
}
export function sendChaos(fx) {
  if (status.pretend) { status.pretend.got.push({ ...fx, at: Date.now() }); hooks.changed(); return true; }
  return send({ t: 'chaos', id: fx.id, event: fx.event, by: fx.by, source: fx.source });
}

// ---------- 🧪 pretend partner (Test tab: no second PC needed) ----------
export function pretend(on, opts = {}) {
  if (!on) { status.pretend = null; hooks.changed(); hooks.partnerChanged(null); return null; }
  status.pretend = { who: opts.name || 'Pretend partner', got: [], until: Date.now() + 10 * 60000, state: { v: VERSION, name: opts.name || 'Pretend partner', login: 'pretend_partner', phase: opts.phase || 'running', cards: false, map: 'cliff', mapName: 'Cliff', solid: false, chaosIn: true, video: null } };
  hooks.changed(); hooks.partnerChanged(status.pretend);
  return status.pretend;
}
setInterval(() => { if (status.pretend && Date.now() > status.pretend.until) pretend(false); }, 15000);

// ---------- what the control panel shows ----------
export function info() {
  const c = cfg(), p = status.partner, ps = partnerState();
  return {
    linked: linked(), role: c.role || '', state: status.state, error: status.error, since: status.since, code: c.role === 'host' ? c.code || '' : '',
    partner: status.pretend ? { who: status.pretend.who, pretend: true, state: ps, got: status.pretend.got.slice(-5) } : p ? { who: p.who, state: ps } : null,
    partnerName: partnerName(), partnerBattle: partnerBattle(), partnerShowing: partnerShowing(), watchPop: c.watchPop !== false, chaos: c.chaos !== false, showBattle: c.showBattle !== false, showCam: c.showCam !== false,
    video: c.video !== false, obsTipDone: !!c.obsTipDone, quality: c.quality, camSide: mySide(), partnerSide: ps?.camSide || (mySide() === 'left' ? 'right' : 'left'), scene: c.scene || '', videoStatus: { ...status.video, layout: undefined }, obsItems: !!c.obs?.input,
    myId: c.room ? streamId(c.room, (hooks.local() || {}).login || (hooks.local() || {}).name) : ''
  };
}

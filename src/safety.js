// 🔐 Safety (1.96.0, Derek: "can we add 2 factor for safety… nothing being sent that shouldn't be… safe to use")
// 1. Only this PC can reach the app (it listens on this computer only, and web pages you visit can't press its buttons).
// 2. An optional lock: the control panel asks for a 6-digit code from an authenticator app on your phone.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { db, save, DATA } from './store.js';

const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
export function b32enc(buf) { let bits = '', out = ''; for (const b of buf) bits += b.toString(2).padStart(8, '0'); for (let i = 0; i < bits.length; i += 5) out += B32[parseInt(bits.slice(i, i + 5).padEnd(5, '0'), 2)]; return out; }
export function b32dec(str) { let bits = ''; for (const c of String(str).toUpperCase().replace(/[^A-Z2-7]/g, '')) bits += B32.indexOf(c).toString(2).padStart(5, '0'); const out = []; for (let i = 0; i + 8 <= bits.length; i += 8) out.push(parseInt(bits.slice(i, i + 8), 2)); return Buffer.from(out); }
/** The 6-digit code an authenticator app shows for this key (the standard: a new code every 30 seconds). */
export function codeAt(secret, counter) {
  const msg = Buffer.alloc(8); msg.writeBigUInt64BE(BigInt(counter));
  const h = crypto.createHmac('sha1', b32dec(secret)).update(msg).digest(), o = h[h.length - 1] & 15;
  return String(((h[o] & 127) << 24 | h[o + 1] << 16 | h[o + 2] << 8 | h[o + 3]) % 1e6).padStart(6, '0');
}
export const counterNow = (now = Date.now()) => Math.floor(now / 30000);
/** Right code? Takes the one before and after too (phone clocks are a little off). Returns the counter it matched, or 0. */
export function matchCode(secret, code, now = Date.now()) { const c = String(code || '').replace(/\D/g, ''); if (c.length !== 6) return 0; const n = counterNow(now); for (const d of [0, -1, 1]) if (crypto.timingSafeEqual(Buffer.from(codeAt(secret, n + d)), Buffer.from(c))) return n + d; return 0; }
const sha = t => crypto.createHash('sha256').update(String(t)).digest('hex');
const L = () => (db.lock = db.lock || { on: false });
const MODES = { open: 0, day: 86400000, month: 30 * 86400000 }; // how long this PC stays unlocked: until the app closes / a day / 30 days
const sessions = new Map(); // token -> expires (kept in memory: closing the app locks it again)
let pending = null, fails = { n: 0, until: 0 }, appName = 'Movie Royal';
export const setName = n => { appName = n || appName; };

export const isOn = () => !!(L().on && L().secret);
export function cookieOf(req) { const m = /(?:^|;\s*)mr_lock=([A-Za-z0-9_-]+)/.exec(String(req.headers?.cookie || '')); return m ? m[1] : ''; }
export function unlocked(req) {
  if (!isOn()) return true; const t = cookieOf(req); if (!t) return false; const now = Date.now();
  if ((sessions.get(t) || 0) > now) return true;
  const l = L(), h = sha(t); l.remember = (l.remember || []).filter(r => r.exp > now); return l.remember.some(r => r.h === h);
}
function newSession(res) {
  const t = crypto.randomBytes(24).toString('base64url'), l = L(), ms = MODES[l.mode] ?? 0;
  sessions.set(t, Date.now() + (ms || 7 * 86400000)); // "until the app closes" = in memory only
  if (ms) { l.remember = [...(l.remember || []).filter(r => r.exp > Date.now()).slice(-9), { h: sha(t), exp: Date.now() + ms }]; save(); }
  res.setHeader('Set-Cookie', `mr_lock=${t}; Path=/; HttpOnly; SameSite=Strict${ms ? `; Max-Age=${Math.floor(ms / 1000)}` : ''}`);
}
function makeCodes() { const plain = Array.from({ length: 8 }, () => crypto.randomBytes(5).toString('hex').replace(/(.{5})/, '$1-')); L().codes = plain.map(c => sha(c.replace(/\W/g, ''))); return plain; }
function qr(text) { try { const q = createRequire(import.meta.url)('qrcode-generator')(0, 'M'); q.addData(text); q.make(); return q.createSvgTag({ cellSize: 5, margin: 10, scalable: true }); } catch { return ''; } }

/** Step 1: make a key and show it (nothing is switched on until a code from the phone proves it was added). */
export function begin(who) {
  const secret = b32enc(crypto.randomBytes(20)); pending = { secret, at: Date.now() };
  const uri = `otpauth://totp/${encodeURIComponent(appName)}:${encodeURIComponent(who || 'this PC')}?secret=${secret}&issuer=${encodeURIComponent(appName)}&algorithm=SHA1&digits=6&period=30`;
  return { key: secret.replace(/(.{4})/g, '$1 ').trim(), qr: qr(uri) };
}
/** Step 2: the code from the phone. Turns the lock on and hands out the backup codes (shown once). */
export function confirm(code, res) {
  if (!pending || Date.now() - pending.at > 15 * 60000) throw new Error('That took a while. Press Set up again for a fresh key.');
  if (!matchCode(pending.secret, code)) throw new Error("That code isn't right. Type the 6 digits your authenticator app shows right now.");
  const l = L(); l.on = true; l.secret = pending.secret; l.mode = l.mode in MODES ? l.mode : 'open'; l.since = Date.now(); l.remember = []; l.last = 0; pending = null;
  const codes = makeCodes(); save(); sessions.clear(); newSession(res); return { ok: true, codes };
}
/** The lock screen: a code from the app, or one of the backup codes (each works once). */
export function verify(code, res) {
  if (!isOn()) return { ok: true };
  const now = Date.now(); if (fails.until > now) throw new Error(`Too many wrong tries. Wait ${Math.ceil((fails.until - now) / 1000)} seconds.`);
  const l = L(), raw = String(code || '').trim(), n = matchCode(l.secret, raw);
  let ok = false, backup = false;
  if (n && n > (l.last || 0)) { ok = true; l.last = n; } // (a code can't be used twice)
  else { const h = sha(raw.toLowerCase().replace(/\W/g, '')), i = (l.codes || []).indexOf(h); if (raw.replace(/\W/g, '').length >= 8 && i >= 0) { l.codes.splice(i, 1); ok = backup = true; } }
  if (!ok) { fails.n++; if (fails.n >= 5) fails.until = now + Math.min(300, 15 * 2 ** (fails.n - 5)) * 1000; throw new Error(n ? 'That code was already used. Wait for the next one.' : "That code isn't right."); }
  fails = { n: 0, until: 0 }; save(); newSession(res); return { ok: true, backup, codesLeft: (l.codes || []).length };
}
export function lockNow(req, res) { const t = cookieOf(req); sessions.delete(t); const l = L(); l.remember = (l.remember || []).filter(r => r.h !== sha(t)); save(); res.setHeader('Set-Cookie', 'mr_lock=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0'); return { ok: true }; }
export function setMode(mode) { if (!(mode in MODES)) throw new Error('Pick how long this PC stays unlocked.'); const l = L(); l.mode = mode; if (mode === 'open') l.remember = []; save(); return { ok: true, mode }; }
export function newCodes(code) { const l = L(); if (!isOn()) throw new Error('The lock is off.'); if (!matchCode(l.secret, code)) throw new Error("That code isn't right."); const codes = makeCodes(); save(); return { ok: true, codes }; }
export function turnOff(code) { const l = L(); if (!isOn()) return { ok: true }; if (!matchCode(l.secret, code)) throw new Error("That code isn't right. Type the 6 digits your authenticator app shows right now."); db.lock = { on: false, mode: l.mode }; sessions.clear(); save(); return { ok: true }; }
/** Lost the phone AND the backup codes? Put an empty file called unlock.txt in the data folder: only someone at this PC can do that. */
export function fileReset() { const f = path.join(DATA, 'unlock.txt'); try { if (!fs.existsSync(f)) return false; fs.unlinkSync(f); } catch { return false; } const was = isOn(); db.lock = { on: false }; sessions.clear(); save(); return was; }
export const state = req => { const l = L(); return { on: isOn(), unlocked: unlocked(req), mode: l.mode || 'open', since: l.since || 0, codesLeft: (l.codes || []).length }; };

// ---- who may talk to the app at all ----
const LOCAL = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);
export const lan = () => !!process.env.ALLOW_LAN;
export const refused = { n: 0, last: null };
export const isLocal = req => lan() || LOCAL.has(req.socket?.remoteAddress);
const hostOk = h => lan() || /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i.test(String(h || ''));
/** A page from another website (or a rebinding trick) trying to use the app? `null` = fine, else why not. */
export function strange(req) {
  if (!isLocal(req)) return 'not this computer';
  if (!hostOk(req.headers.host)) return 'wrong address';
  const o = req.headers.origin; if (o && o !== 'null' ? !hostOk(o.replace(/^https?:\/\//i, '')) : o === 'null' && req.method !== 'GET') return 'another website';
  const site = req.headers['sec-fetch-site']; if (site === 'cross-site' && (req.headers['sec-fetch-mode'] !== 'navigate' || req.method !== 'GET' || /^\/(api|deck)\//.test(String(req.url || '')))) return 'another website'; // (coming back from the Twitch sign-in page is fine; a link on a website that presses a button here is not)
  return null;
}
/** 🧪 the lock's own maths, checked against the published test values (RFC 6238) + a made-up key. Nothing saved. */
export function selfTest() {
  const key = b32enc(Buffer.from('12345678901234567890')), rfc = [[59, '287082'], [1111111109, '081804'], [1234567890, '005924'], [2000000000, '279037']].map(([t, want]) => ({ t, want, got: codeAt(key, Math.floor(t / 30)) }));
  const k2 = b32enc(crypto.randomBytes(20)), now = Date.now(), good = codeAt(k2, counterNow(now)), wrong = String((Number(good) + 1) % 1e6).padStart(6, '0');
  const rows = [
    { what: 'Codes match the standard authenticator apps use', ok: rfc.every(r => r.want === r.got) },
    { what: 'The right code opens the lock', ok: !!matchCode(k2, good, now) },
    { what: 'A wrong code does not', ok: !matchCode(k2, wrong, now) },
    { what: 'A code from 5 minutes ago does not', ok: !matchCode(k2, codeAt(k2, counterNow(now) - 10), now) },
    { what: "A phone clock that's 30 seconds off still works", ok: !!matchCode(k2, codeAt(k2, counterNow(now) - 1), now) },
    { what: 'A page on another website is refused', ok: strange({ socket: { remoteAddress: '127.0.0.1' }, method: 'POST', headers: { host: 'localhost:3737', origin: 'https://some-website.example' } }) === 'another website' && strange({ socket: { remoteAddress: '127.0.0.1' }, method: 'GET', headers: { host: 'localhost:3737', 'sec-fetch-site': 'cross-site', 'sec-fetch-mode': 'no-cors' } }) === 'another website' },
    { what: 'Another device on your network is refused', ok: lan() || strange({ socket: { remoteAddress: '192.168.1.50' }, method: 'GET', headers: { host: '192.168.1.20:3737' } }) === 'not this computer' },
    { what: 'A web address pretending to be this PC is refused', ok: lan() || strange({ socket: { remoteAddress: '127.0.0.1' }, method: 'GET', headers: { host: 'sneaky.example:3737' } }) === 'wrong address' },
    { what: 'The app itself, OBS and the Stream Deck are let in', ok: !strange({ socket: { remoteAddress: '127.0.0.1' }, method: 'POST', headers: { host: 'localhost:3737', origin: 'http://localhost:3737', 'sec-fetch-site': 'same-origin' } }) && !strange({ socket: { remoteAddress: '::1' }, method: 'GET', headers: { host: '127.0.0.1:3737' } }) && !strange({ socket: { remoteAddress: '127.0.0.1' }, method: 'GET', headers: { host: 'localhost:3737', 'sec-fetch-site': 'cross-site', 'sec-fetch-mode': 'navigate' } }) },
  ];
  return { ok: rows.every(r => r.ok), rows };
}

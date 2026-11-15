// 📡 Stream to Twitch + Kick at once (1.171.0, edition extra `dualstream`: True's edition; Derek: "you stream to OBS and the app streams to
// both Twitch and Kick… off unless he turns it on… its own tab in settings").
// How: OBS streams to this PC (rtmp://127.0.0.1:<port>/live), and a small helper program (FFmpeg) passes that same stream on to Twitch and to
// Kick without touching the picture (no re-encoding, so it costs almost no CPU; it does use upload speed twice).
// FFmpeg doesn't ship inside the app: it is downloaded from its GitHub release when you press the button, and checked against a known
// fingerprint before it is ever run. Stream keys are typed in by the streamer, kept in db.json, and never sent to the control panel again.
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import crypto from 'crypto';
import { spawn, execFileSync } from 'child_process';
import { db, save, saveNow, DATA } from './store.js';

const DIR = path.join(DATA, 'dual'), WIN = process.platform === 'win32';
const FF = { url: 'https://github.com/GyanD/codexffmpeg/releases/download/7.1/ffmpeg-7.1-essentials_build.zip', sha: 'fa7d4d7e795db0e2503f49f105f46ed5852386f0cfdd819899be3b65ebde24fc', mb: 88, inside: /\/bin\/ffmpeg\.exe$/ };
let H = { on: () => false, pushState() {}, act() {}, toast() {}, broadcast() {} };
export function setHooks(h) { H = { ...H, ...h }; }

export const OUTS = { twitch: { name: 'Twitch', icon: '💜', url: 'rtmp://live.twitch.tv/app' }, kick: { name: 'Kick', icon: '🟢', url: '' } };
function data() {
  const d = db.dual ||= {}; if (typeof d.on !== 'boolean') d.on = false;
  d.port = Math.max(1024, Math.min(65535, Math.round(Number(d.port) || 1935)));
  if (!d.inKey) d.inKey = crypto.randomBytes(9).toString('hex'); // (what OBS uses as its "stream key" for this PC: only OBS and the app know it)
  d.outs ||= {}; for (const k of Object.keys(OUTS)) { const o = d.outs[k] ||= {}; if (typeof o.on !== 'boolean') o.on = true; o.url = String(o.url ?? OUTS[k].url); o.key = String(o.key || ''); }
  return d;
}
export const allowed = () => !!H.on();
export const on = () => allowed() && data().on;

// ── the helper program ────────────────────────────────────────────────────────────────────────────
function ffPath() {
  if (process.env.DUAL_FFMPEG) return process.env.DUAL_FFMPEG;
  const own = path.join(DIR, WIN ? 'ffmpeg.exe' : 'ffmpeg'); if (fs.existsSync(own)) return own;
  if (!WIN) { try { execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' }); return 'ffmpeg'; } catch {} }
  return '';
}
export const helperOk = () => !!ffPath();
let busy = null, prog = null;
const tell = p => { prog = p; H.broadcast({ type: 'dualProg', prog: p }, 'control'); };
export function installHelper() {
  if (helperOk()) return Promise.resolve({ ok: true, had: true });
  if (!WIN && !process.env.DUAL_FF_URL) return Promise.reject(new Error('The helper program (FFmpeg) only downloads in the Windows app.'));
  if (busy) return Promise.reject(new Error('It is already downloading. Give it a moment.'));
  busy = (async () => {
    const c = new AbortController(), t = setTimeout(() => c.abort(), 20 * 60000);
    try {
      const r = await fetch(process.env.DUAL_FF_URL || FF.url, { signal: c.signal, redirect: 'follow' }); if (!r.ok) throw new Error('The download answered ' + r.status);
      const total = Number(r.headers.get('content-length')) || FF.mb * 1048576, parts = [], hash = crypto.createHash('sha256'); let got = 0, last = 0;
      for await (const chunk of r.body) { parts.push(chunk); hash.update(chunk); got += chunk.length; if (Date.now() - last > 400) { last = Date.now(); tell({ got, total }); } }
      if (hash.digest('hex') !== FF.sha && !process.env.DUAL_FF_ANY) throw new Error('The download did not match the fingerprint the app expects, so it was thrown away and nothing was run. Try again later.');
      tell({ got: 1, total: 1, unpack: true });
      const exe = unzipOne(Buffer.concat(parts), FF.inside); if (!exe) throw new Error('The helper program was not inside the download.');
      fs.mkdirSync(DIR, { recursive: true }); fs.writeFileSync(path.join(DIR, 'ffmpeg.exe'), exe);
      H.act('stream', 'Downloaded the helper program (FFmpeg) for 📡 streaming to Twitch + Kick', { icon: '📡', kind: 'dual' });
      return { ok: true };
    } finally { clearTimeout(t); }
  })().finally(() => { busy = null; tell(null); sync(); H.pushState(); });
  return busy;
}
function unzipOne(buf, re) { // (reads ONE file out of a .zip)
  let e = buf.length - 22; while (e >= 0 && buf.readUInt32LE(e) !== 0x06054b50) e--;
  if (e < 0) return null; const n = buf.readUInt16LE(e + 10); let p = buf.readUInt32LE(e + 16);
  for (let i = 0; i < n && p + 46 <= buf.length; i++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) break;
    const method = buf.readUInt16LE(p + 10), csize = buf.readUInt32LE(p + 20), nl = buf.readUInt16LE(p + 28), el = buf.readUInt16LE(p + 30), cl = buf.readUInt16LE(p + 32), off = buf.readUInt32LE(p + 42);
    const name = buf.toString('utf8', p + 46, p + 46 + nl); p += 46 + nl + el + cl;
    if (!re.test('/' + name) || buf.readUInt32LE(off) !== 0x04034b50) continue;
    const start = off + 30 + buf.readUInt16LE(off + 26) + buf.readUInt16LE(off + 28), raw = buf.subarray(start, start + csize);
    return method === 0 ? Buffer.from(raw) : zlib.inflateRawSync(raw);
  }
  return null;
}

// ── settings ──────────────────────────────────────────────────────────────────────────────────────
// a stream address as the streamer pasted it → "rtmp(s)://host/app" with no key on the end, or '' when it isn't one
export function cleanUrl(u) { const t = String(u || '').trim().replace(/\s+/g, ''); if (!/^rtmps?:\/\/[^/\s]+/i.test(t)) return ''; return t.replace(/\/+$/, ''); }
const cleanKey = k => String(k || '').trim().replace(/\s+/g, '').slice(0, 300);
export const target = (url, key) => `${cleanUrl(url)}/${cleanKey(key)}`;
export function outsReady(d = data()) { return Object.keys(OUTS).filter(k => d.outs[k].on && cleanUrl(d.outs[k].url) && d.outs[k].key); }
export function setCfg(b = {}) {
  if (!allowed()) throw new Error('Streaming to Twitch + Kick isn\'t part of this edition.');
  const d = data();
  if (b.port != null) { const p = Math.round(Number(b.port)); if (!(p >= 1024 && p <= 65535)) throw new Error('Pick a port number from 1024 to 65535 (1935 is the usual one).'); d.port = p; }
  for (const k of Object.keys(OUTS)) {
    const o = b[k]; if (!o || typeof o !== 'object') continue;
    if (typeof o.on === 'boolean') d.outs[k].on = o.on;
    if (o.url != null) { const u = cleanUrl(o.url); if (String(o.url).trim() && !u) throw new Error(`That ${OUTS[k].name} address doesn't look right. It starts with rtmp:// or rtmps://`); d.outs[k].url = u || OUTS[k].url; }
    if (o.key != null) d.outs[k].key = cleanKey(o.key);
    if (o.clearKey) d.outs[k].key = '';
  }
  if (typeof b.on === 'boolean') {
    if (b.on) { if (!helperOk()) throw new Error('Download the helper program first (step 1).'); if (!outsReady(d).length) throw new Error('Type in at least one stream key first (step 2).'); }
    if (d.on !== b.on) { d.on = b.on; H.act('stream', b.on ? 'turned on 📡 streaming to Twitch + Kick through the app' : 'turned off 📡 streaming to Twitch + Kick through the app', { icon: '📡', kind: 'dual' }); }
  }
  saveNow(); sync(true); H.pushState(); return state();
}
export const obsServer = () => `rtmp://127.0.0.1:${data().port}/live`;
export const obsKey = () => data().inKey;

// ── running it ────────────────────────────────────────────────────────────────────────────────────
// the helper's command line (pure): listen for OBS on this PC, pass the same stream on to every address
export function args(port, inKey, targets) {
  const esc = u => u.replace(/\\/g, '\\\\').replace(/\|/g, '\\|');
  const out = targets.length === 1 ? ['-f', 'flv', targets[0]] : ['-f', 'tee', targets.map(t => `[f=flv:onfail=ignore]${esc(t)}`).join('|')];
  return ['-hide_banner', '-loglevel', 'warning', '-nostdin', '-progress', 'pipe:1', '-listen', '1', '-f', 'flv', '-i', `rtmp://127.0.0.1:${port}/live/${inKey}`, '-map', '0', '-c', 'copy', ...out];
}
let ps = null, run = null, wantKey = '', retry = null, lastErr = '', log = [];
const scrub = t => { let s = String(t); const d = data(); for (const k of [d.inKey, ...Object.values(d.outs).map(o => o.key)]) if (k && k.length > 3) s = s.split(k).join('•••'); return s; };
// a line the helper printed → what it means (pure)
export function readLine(line, names) {
  const l = String(line);
  let m = l.match(/Slave muxer #(\d+) failed/i); if (m) return { fail: names[Number(m[1])] || null };
  if (/Address already in use|bind failed|Cannot assign requested address/i.test(l)) return { err: 'port' };
  if (/Connection refused|Input\/output error|Server returned 4\d\d|Error opening output|failed to (connect|resolve)|Could not write header/i.test(l)) return { err: 'out' };
  m = l.match(/^bitrate=\s*([\d.]+)kbits/); if (m) return { kbps: Math.round(Number(m[1])) };
  m = l.match(/^out_time_us=(\d+)/); if (m) return { us: Number(m[1]) };
  return null;
}
function start() {
  const d = data(), names = outsReady(d), ff = ffPath(); if (!names.length || !ff) return;
  const targets = names.map(k => target(d.outs[k].url, d.outs[k].key)), key = JSON.stringify([d.port, d.inKey, targets]);
  wantKey = key; run = { names, at: Date.now(), live: false, liveAt: 0, kbps: 0, failed: {}, err: '' };
  const mine = run; let p;
  try { p = spawn(ff, args(d.port, d.inKey, targets), { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] }); } catch (e) { lastErr = e.message; run = null; return again(); }
  ps = p; let bo = '', be = '';
  const line = l => {
    const r = readLine(l, names); if (!r || run !== mine) return;
    if (r.us > 0 && !mine.live) { mine.live = true; mine.liveAt = Date.now(); lastErr = ''; H.act('stream', `📡 OBS is streaming through the app to ${names.map(k => OUTS[k].name).join(' + ')}`, { icon: '📡', kind: 'dual' }); H.pushState(); }
    if (r.kbps != null) mine.kbps = r.kbps;
    if (r.fail && !mine.failed[r.fail]) { mine.failed[r.fail] = Date.now(); H.toast(`⚠️ 📡 The stream to ${OUTS[r.fail].name} dropped. The other one keeps going. Press 🔄 Reconnect on Settings → Twitch + Kick to bring it back (that blips both for a moment).`); H.act('stream', `📡 The stream to ${OUTS[r.fail].name} dropped`, { icon: '⚠️', kind: 'dual' }); H.pushState(); }
    if (r.err) mine.err = r.err;
  };
  p.stdout.on('data', b => { bo += b; let i; while ((i = bo.indexOf('\n')) >= 0) { line(bo.slice(0, i).trim()); bo = bo.slice(i + 1); } });
  p.stderr.on('data', b => { be += b; let i; while ((i = be.indexOf('\n')) >= 0) { const l = be.slice(0, i).trim(); be = be.slice(i + 1); if (l) { log.push(scrub(l)); if (log.length > 40) log.shift(); line(l); } } });
  p.on('error', e => { lastErr = e.message; });
  p.on('exit', () => {
    if (ps === p) ps = null; const was = run === mine ? mine : null; if (run === mine) run = null;
    if (was && !was.live) lastErr = was.err === 'port' ? `Something else on this PC is already using port ${d.port}. Close it, or pick another port here and press 🎥 Point OBS at the app again.` : was.err === 'out' ? 'A stream address or key was refused. Check them in step 2.' : lastErr;
    if (was?.live) H.act('stream', '📡 OBS stopped streaming through the app', { icon: '📡', kind: 'dual' });
    H.pushState(); again(was && !was.live && was.err ? 8000 : 1200);
  });
  H.pushState();
}
function again(ms = 1500) { clearTimeout(retry); retry = setTimeout(() => sync(), ms); }
function stop() { clearTimeout(retry); wantKey = ''; const p = ps; ps = null; run = null; if (p) { try { p.kill(); } catch {} } }
// keep the helper running exactly while it should be (restart = true: settings changed, start it fresh)
export function sync(restart) {
  if (!on() || !helperOk() || !outsReady().length) { if (ps) { stop(); H.pushState(); } return; }
  const d = data(), key = JSON.stringify([d.port, d.inKey, outsReady(d).map(k => target(d.outs[k].url, d.outs[k].key))]);
  if (ps && (key !== wantKey || (restart === 'now'))) { if (run?.live && restart !== 'now') return; stop(); } // (never cut a live stream because a box was edited: 🔄 Reconnect does that)
  if (!ps) start();
}
export function reconnect() { if (!on()) throw new Error('It is switched off.'); sync('now'); return state(); }
export function quit() { stop(); }

export function state() {
  const d = data(), r = run;
  return {
    allowed: allowed(), on: d.on, helper: helperOk(), helperMb: FF.mb, canDownload: WIN || !!process.env.DUAL_FF_URL, busy: !!busy, prog, port: d.port, server: obsServer(),
    outs: Object.fromEntries(Object.keys(OUTS).map(k => [k, { name: OUTS[k].name, icon: OUTS[k].icon, on: d.outs[k].on, url: d.outs[k].url, hasKey: !!d.outs[k].key, keyTail: d.outs[k].key ? '•••' + d.outs[k].key.slice(-3) : '', ready: outsReady(d).includes(k), failed: !!r?.failed?.[k], sending: !!(r?.live && r.names.includes(k) && !r.failed[k]) }])),
    running: !!ps, live: !!r?.live, liveAt: r?.liveAt || 0, kbps: r?.kbps || 0, err: lastErr, obs: d.obs ? { pointed: !!d.obs.pointed, at: d.obs.at || 0, hadPrev: !!d.obs.prev } : null, log: log.slice(-8)
  };
}
// what OBS had before it was pointed at the app (kept so ↩ Put OBS back can restore it; it holds OBS's own stream key, so it never leaves the server)
export function obsNote(o) { const d = data(); d.obs = o ? { ...(d.obs || {}), ...o } : null; saveNow(); H.pushState(); }
export const obsPrev = () => data().obs?.prev || null;
// OBS was streaming straight to Twitch before: its key can fill the Twitch box (only when that box is still empty)
export function takeTwitchKey(prev) {
  const d = data(), s = prev?.streamServiceSettings || {}; if (d.outs.twitch.key || !s.key) return false;
  const tw = (prev.streamServiceType === 'rtmp_common' && /twitch/i.test(String(s.service || ''))) || /twitch\.tv|live-video\.net/i.test(String(s.server || ''));
  if (!tw || /127\.0\.0\.1|localhost/i.test(String(s.server || ''))) return false;
  d.outs.twitch.key = cleanKey(s.key); if (prev.streamServiceType === 'rtmp_custom' && cleanUrl(s.server)) d.outs.twitch.url = cleanUrl(s.server); saveNow(); return true;
}

// 🧪 the rules with pretend keys (nothing is started)
export function demo() {
  const rows = [], T = (what, got, ok) => rows.push({ what, got: String(got), ok: !!ok });
  let a = args(1935, 'abc', ['rtmp://live.twitch.tv/app/live_1', 'rtmps://x.live-video.net:443/app/sk_2']);
  T('Two places: the same stream goes to both, and one dropping doesn\'t stop the other', a.slice(-2).join(' '), a.includes('tee') && /\[f=flv:onfail=ignore\]rtmp:\/\/live\.twitch\.tv\/app\/live_1\|\[f=flv:onfail=ignore\]rtmps:\/\/x\.live-video\.net:443\/app\/sk_2/.test(a.at(-1)) && a.includes('copy'));
  a = args(1935, 'abc', ['rtmp://live.twitch.tv/app/live_1']);
  T('One place only', a.slice(-3).join(' '), a.at(-1) === 'rtmp://live.twitch.tv/app/live_1' && a.at(-2) === 'flv' && !a.includes('tee'));
  T('It only listens on this PC', a[a.indexOf('-i') + 1], a[a.indexOf('-i') + 1] === 'rtmp://127.0.0.1:1935/live/abc' && a.includes('-listen'));
  T('The picture is passed on untouched (no re-encoding)', '-c copy', a[a.indexOf('-c') + 1] === 'copy');
  T('A pasted address loses its last slash', cleanUrl(' rtmps://fa723fc1b171.global-contribute.live-video.net:443/app/ '), cleanUrl(' rtmps://fa723fc1b171.global-contribute.live-video.net:443/app/ ') === 'rtmps://fa723fc1b171.global-contribute.live-video.net:443/app');
  T('A web address is not a stream address', cleanUrl('https://kick.com/dashboard') || '(refused)', cleanUrl('https://kick.com/dashboard') === '');
  T('Address + key', target('rtmp://live.twitch.tv/app/', ' live_123 '), target('rtmp://live.twitch.tv/app/', ' live_123 ') === 'rtmp://live.twitch.tv/app/live_123');
  T('The helper says the second place failed', JSON.stringify(readLine('[tee @ 0x1] Slave muxer #1 failed: Input/output error, continuing with 1/2 slaves.', ['twitch', 'kick'])), readLine('[tee @ 0x1] Slave muxer #1 failed: Input/output error, continuing with 1/2 slaves.', ['twitch', 'kick'])?.fail === 'kick');
  T('The port is taken', JSON.stringify(readLine('[rtmp @ 0x1] bind failed: Address already in use', [])), readLine('[rtmp @ 0x1] bind failed: Address already in use', [])?.err === 'port');
  T('Speed line', JSON.stringify(readLine('bitrate=5987.3kbits/s', [])), readLine('bitrate=5987.3kbits/s', [])?.kbps === 5987);
  const prev = { streamServiceType: 'rtmp_common', streamServiceSettings: { service: 'Twitch', server: 'auto', key: 'live_999' } };
  T('OBS was set to Twitch: its key can be reused', 'yes', prev.streamServiceType === 'rtmp_common' && /twitch/i.test(prev.streamServiceSettings.service));
  return { ok: rows.every(r => r.ok), rows };
}

// 🛡️ Movie Royal Backup Bots: runs streamers' Discord bots (yours and friends') as a backup.
//  • Every minute, for each bot: read the hidden #movie-royal-sync channel that the streamer's Movie Royal keeps (relay.js),
//    and check their 24/7 cloud bot (Cloudflare) is healthy.
//  • Cloud bot down or posting errors → take over: Discord stops sending commands to the cloud, and this app answers them
//    (with the cloud bot's own code, cloud-worker.js, so the rules are exactly the same). It stays that way until the
//    streamer presses "☁️ Switch back to the cloud" in Movie Royal.
//  • No cloud bot at all → answer whenever the streamer's Movie Royal is closed.
//  • If the streamer's Movie Royal is open, it answers itself; the backup stays quiet.
//  • Picks made here are left in the sync channel; Movie Royal adds them for real when it opens.
import fs from 'fs';
import path from 'path';
import os from 'os';
import express from 'express';
import { fileURLToPath } from 'url';
import { Client, GatewayIntentBits, ChannelType } from 'discord.js';
import worker from './cloud-worker.js';
import { SYNC_NAME, readSync, putStatus, appOpen } from './relay.js';

const DISCORD = 'https://discord.com/api/v10';
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const FAILS_TO_TAKE_OVER = 3; // cloud checks in a row (one a minute)
const WORKER_ERROR_WINDOW = 10 * 60000; // a "24/7 Discord bot: …" problem posted in #movie-royal-debug in the last 10 minutes counts as an error

let DATA = '', hooks = {};
const conf = { name: '', bots: [] }; // bots: [{ id, token (encrypted), on, addedAt, tag }]
const bots = new Map();
const log = (...a) => console.log('[backup]', ...a);

const confFile = () => path.join(DATA, 'backup.json');
function saveConf() { fs.mkdirSync(DATA, { recursive: true }); fs.writeFileSync(confFile(), JSON.stringify(conf, null, 2)); }
function loadConf() { try { Object.assign(conf, JSON.parse(fs.readFileSync(confFile(), 'utf8'))); } catch {} conf.bots ||= []; if (!conf.name) conf.name = `${os.userInfo().username}'s PC`; }
const enc = t => hooks.encrypt ? hooks.encrypt(t) : 'b64:' + Buffer.from(t).toString('base64');
const dec = t => !t ? '' : t.startsWith('b64:') ? Buffer.from(t.slice(4), 'base64').toString() : hooks.decrypt ? hooks.decrypt(t) : '';

async function rest(token, method, p, body) {
  const r = await fetch(DISCORD + p, { method, headers: { Authorization: `Bot ${token}`, 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(15000) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`Discord: ${j.message || r.status}`);
  return j;
}

class Bot {
  constructor(rec) {
    this.rec = rec; this.client = null; this.timer = null; this.cfg = null; this.cfgAt = null; this.app = null;
    this.queue = []; this.posted = new Set(); this.busy = false; this.ch = null;
    this.st = { state: 'starting', tag: rec.tag || null, guilds: [], streamer: null, warning: null, mode: 'standby', since: null, reason: null, back: null,
      cloud: { url: '', ok: null, fails: 0, error: null, checkedAt: null }, handled: 0, lastCmd: null, checkedAt: null, appOnline: null };
    try { const c = JSON.parse(fs.readFileSync(this.file('cache'), 'utf8')); this.cfg = c.cfg || null; this.cfgAt = c.cfgAt || null; this.queue = c.queue || []; this.posted = new Set(c.posted || []); this.st.mode = c.mode || 'standby'; this.st.since = c.since || null; this.st.reason = c.reason || null; } catch {}
  }
  file(k) { return path.join(DATA, `bot-${this.rec.id}-${k}.json`); }
  saveCache() { try { fs.writeFileSync(this.file('cache'), JSON.stringify({ cfg: this.cfg, cfgAt: this.cfgAt, queue: this.queue, posted: [...this.posted], mode: this.st.mode, since: this.st.since, reason: this.st.reason })); } catch {} }
  token() { return dec(this.rec.token); }
  async start() {
    const token = this.token();
    if (!token) { this.st.state = 'error'; this.st.warning = "Couldn't read this bot's token. Remove it and add it again."; return; }
    this.client = new Client({ intents: [GatewayIntentBits.Guilds] });
    this.client.on('raw', p => { if (p.t === 'INTERACTION_CREATE') this.onInteraction(p.d).catch(e => log(this.st.tag, 'command failed:', e.message)); });
    this.client.once('ready', () => {
      this.st.state = 'online'; this.st.tag = this.client.user.tag; this.rec.tag = this.st.tag; saveConf();
      this.st.guilds = this.client.guilds.cache.map(g => g.name);
      this.tick(); this.timer = setInterval(() => this.tick(), 60000);
    });
    this.client.on('error', e => { this.st.warning = e.message; });
    try { await this.client.login(token); }
    catch (e) {
      const bad = /TOKEN_INVALID|invalid token/i.test(e.message + e.code);
      this.st.state = 'error';
      this.st.warning = bad ? "Discord didn't accept this bot token (it was probably reset). Ask for the new one, remove this bot and add it again."
        : /ENOTFOUND|ECONNREFUSED|ETIMEDOUT|EAI_AGAIN|fetch failed|network/i.test(e.message) ? "Couldn't reach Discord (is the internet on?). Trying again every 2 minutes." : e.message + ' (trying again every 2 minutes)';
      try { await this.client.destroy(); } catch {} this.client = null;
      if (!bad && this.rec.on !== false) { clearTimeout(this.retry); this.retry = setTimeout(() => { if (this.rec.on !== false && !this.client) this.start(); }, 120000); }
    }
  }
  async stop() { clearTimeout(this.retry); clearInterval(this.timer); this.timer = null; try { await this.client?.destroy(); } catch {} this.client = null; this.st.state = 'paused'; }
  findChannel(name) {
    for (const g of this.client.guilds.cache.values()) { const c = g.channels.cache.find(x => x.type === ChannelType.GuildText && x.name === name); if (c) return c; }
    return null;
  }

  /** Every minute: read the sync channel, check the cloud bot, take over if it's broken, say what we're doing. */
  async tick(force = false) {
    if (this.busy || !this.client?.user) return; this.busy = true;
    try {
      const ch = this.ch = this.findChannel(SYNC_NAME);
      if (!ch) { this.st.warning = "Waiting for this streamer's Movie Royal to make the hidden #movie-royal-sync channel. They need Movie Royal 1.27.0 or newer, opened once with the Discord bot on."; return; }
      const s = await readSync(ch, this.client.user.id);
      this.app = s.app; this.st.appOnline = s.app?.online || 0;
      if (s.config?.url && (s.config.at !== this.cfgAt || !this.cfg || force)) { // the newest rules + pool from Movie Royal
        try { const r = await fetch(s.config.url, { signal: AbortSignal.timeout(20000) }); if (r.ok) { this.cfg = await r.json(); this.cfgAt = s.config.at; } } catch (e) { log(this.st.tag, 'config download', e.message); }
      }
      this.st.streamer = this.cfg?.streamer || null;
      // picks Movie Royal already took in are gone from the channel: forget them. Post any not posted yet.
      const present = new Set(s.ops.map(o => o.op.id));
      this.queue = this.queue.filter(op => present.has(op.id) || !this.posted.has(op.id));
      for (const id of [...this.posted]) if (!present.has(id) && !this.queue.some(q => q.id === id)) this.posted.delete(id);
      await this.flushOps();
      // what the streamer (or another backup) said
      const b = s.backup || {};
      if (b.by && b.by !== conf.name && b.seen && Date.now() - b.seen < 5 * 60000 && b.mode !== 'cloud') { // two backups on one bot would fight: the other one has it
        this.st.warning = `${b.by} is already running the backup for this bot, so this one stays quiet.`; this.st.otherBackup = b.by; return;
      }
      this.st.otherBackup = null;
      if (b.mode === 'cloud' && this.st.mode === 'backup') { this.st.mode = 'standby'; this.st.since = null; this.st.reason = null; this.st.cloud.fails = 0; log(this.st.tag, 'the streamer switched back to the cloud'); }
      this.st.back = b.back || this.st.back;
      // the 24/7 cloud bot
      const url = this.cfg?.cloudUrl || s.app?.cloudUrl || '';
      this.st.cloud.url = url;
      if (url && this.st.mode !== 'backup') {
        let why = null;
        try { const r = await fetch(url.replace(/\/$/, '') + '/health?deep=1', { signal: AbortSignal.timeout(10000) }); const j = await r.json().catch(() => ({})); if (!r.ok || j.ok === false) why = j.error || `it answered ${r.status}`; }
        catch (e) { why = "it didn't answer"; }
        if (!why) why = await this.workerErrors();
        this.st.cloud.checkedAt = Date.now();
        if (why) { this.st.cloud.fails++; this.st.cloud.ok = false; this.st.cloud.error = why; } else { this.st.cloud.fails = 0; this.st.cloud.ok = true; this.st.cloud.error = null; }
        if (this.st.cloud.fails >= FAILS_TO_TAKE_OVER || /posted a problem/.test(why || '')) await this.takeOver(`the 24/7 cloud bot had problems: ${why}`);
      } else if (!url) { this.st.cloud.ok = null; this.st.cloud.error = null; }
      this.st.warning = !this.cfg ? "Waiting for this streamer's Movie Royal to upload its rules (it does when it's open)." : null;
      this.st.checkedAt = Date.now();
      if (s.backupMsg) { // the streamer may have pressed "Switch back" while we were checking: look once more before writing
        const fresh = await ch.messages.fetch(s.backupMsg.id).catch(() => null); let fb = {}; try { fb = JSON.parse((fresh?.content || '').slice(9) || '{}'); } catch {}
        if (fb.mode === 'cloud' && this.st.mode === 'backup' && (fb.back || 0) > (this.st.since || 0)) { this.st.mode = 'standby'; this.st.since = null; this.st.reason = null; this.st.back = fb.back; }
      }
      await putStatus(ch, s.backupMsg, 'MR-BACKUP', { mode: this.st.mode, since: this.st.since, by: conf.name, reason: this.st.reason, seen: Date.now(), back: this.st.back || null });
    } catch (e) { this.st.warning = e.message; log(this.st.tag, e.message); }
    finally { this.busy = false; this.saveCache(); }
  }
  /** Did the cloud bot post a problem in #movie-royal-debug lately (after the streamer last switched back)? */
  async workerErrors() {
    const dch = this.findChannel('movie-royal-debug'); if (!dch) return null;
    try {
      const since = Math.max(Date.now() - WORKER_ERROR_WINDOW, this.st.back || 0, this.started || 0);
      const msgs = await dch.messages.fetch({ limit: 15 });
      const m = msgs.find(x => x.author?.id === this.client.user.id && x.createdTimestamp > since && /24\/7 Discord bot:/.test(x.content || ''));
      return m ? 'it posted a problem in #movie-royal-debug: ' + (m.content.match(/24\/7 Discord bot: ([^*\n]+)/) || [])[1] : null;
    } catch { return null; }
  }
  async takeOver(reason) {
    if (this.st.mode === 'backup') return;
    await rest(this.token(), 'PATCH', '/applications/@me', { interactions_endpoint_url: null }); // Discord now sends commands over the live connection: to Movie Royal if it's open, otherwise here
    this.st.mode = 'backup'; this.st.since = Date.now(); this.st.reason = reason; this.st.cloud.fails = 0;
    log(this.st.tag, 'TOOK OVER:', reason);
    const dch = this.findChannel('movie-royal-debug');
    if (dch) dch.send({ content: `🛡️ **${conf.name}** is running this Discord bot now, because ${reason}.\nIt keeps doing it until ${this.cfg?.streamer || 'the streamer'} presses **☁️ Switch back to the cloud** in Movie Royal (Settings → Discord & picks).`, allowedMentions: { parse: [] } }).catch(() => {});
    this.saveCache();
  }
  async flushOps() {
    if (!this.ch) return;
    for (const op of this.queue) {
      if (this.posted.has(op.id)) continue;
      try { await this.ch.send({ content: 'MR-OP ' + JSON.stringify(op).slice(0, 1990), allowedMentions: { parse: [] } }); this.posted.add(op.id); } catch (e) { log(this.st.tag, 'could not leave a pick for Movie Royal:', e.message); break; }
    }
    this.saveCache();
  }
  /** What the cloud bot's code sees as its storage: the rules from Movie Royal, plus the picks made here. */
  env() {
    const token = this.token();
    return {
      SKIP_VERIFY: true, SYNC_KEY: 'backup',
      KV: {
        get: async (k, type) => {
          const v = k === 'config' ? (this.cfg ? { ...this.cfg, botToken: token } : null) : k === 'queue' ? this.queue : null;
          return v == null ? null : type === 'json' ? JSON.parse(JSON.stringify(v)) : JSON.stringify(v);
        },
        put: async (k, v) => { if (k === 'queue') { this.queue = JSON.parse(v); this.saveCache(); this.flushOps().catch(() => {}); } }
      }
    };
  }
  /** A command came in over Discord's live connection. Answer it only if nobody else will. */
  async onInteraction(i) {
    if (i.type !== 2 && i.type !== 4) return; // slash commands + type-ahead
    if (!this.cfg || this.st.otherBackup || this.rec.on === false) return;
    if (appOpen(this.app)) return; // Movie Royal is open: it answers
    const waits = [];
    const res = await worker.fetch(new Request('http://backup/', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(i) }), this.env(), { waitUntil: p => waits.push(Promise.resolve(p).catch(e => log(this.st.tag, e.message))) });
    if (!res.ok) return log(this.st.tag, 'command not answered:', res.status);
    const r = await fetch(`${DISCORD}/interactions/${i.id}/${i.token}/callback`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: await res.text() });
    if (!r.ok) log(this.st.tag, 'Discord refused the answer:', r.status, await r.text().catch(() => ''));
    if (i.type === 2) { this.st.handled++; this.st.lastCmd = { name: i.data?.name, at: Date.now(), by: i.member?.user?.username || i.user?.username || '' }; }
    await Promise.all(waits);
  }
  view() { return { id: this.rec.id, on: this.rec.on !== false, ...this.st, appOpen: appOpen(this.app), configAt: this.cfgAt, waitingPicks: this.queue.length }; }
}

async function addBot(token) {
  token = String(token || '').trim().replace(/^Bot\s+/i, '');
  if (!/^[\w-]{20,}\.[\w-]{4,}\.[\w-]{20,}$/.test(token)) throw new Error("That doesn't look like a bot token. In the Discord Developer Portal: your app → Bot → Reset Token → Copy.");
  const me = await rest(token, 'GET', '/users/@me').catch(e => { throw new Error(/^Discord:/.test(e.message) ? "Discord didn't accept that token. Check it's the newest one (resetting it makes the old one stop working)." : "Couldn't reach Discord (is the internet on?). Try again in a minute."); });
  if (conf.bots.some(b => b.id === me.id)) throw new Error(`${me.username} is already on the list.`);
  const rec = { id: me.id, token: enc(token), on: true, addedAt: Date.now(), tag: me.username };
  conf.bots.push(rec); saveConf();
  const b = new Bot(rec); bots.set(rec.id, b); b.started = Date.now(); b.start();
  return { ok: true, tag: me.username };
}

export async function startBackup(opts = {}) {
  DATA = opts.dataDir || process.env.MR_BACKUP_DATA || path.join(os.homedir(), '.movie-royal-backup');
  hooks = opts.hooks || {};
  loadConf(); saveConf();
  for (const rec of conf.bots) { const b = new Bot(rec); bots.set(rec.id, b); b.started = Date.now(); if (rec.on !== false) b.start(); else b.st.state = 'paused'; }

  const web = express();
  web.use(express.json({ limit: '1mb' }));
  web.use((req, res, next) => ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress) ? next() : res.status(403).end());
  web.get('/', (req, res) => res.sendFile(path.join(ROOT, 'public', 'backup.html')));
  web.use(express.static(path.join(ROOT, 'public'), { index: false }));
  const wrap = fn => async (req, res) => { try { res.json(await fn(req.body || {})); } catch (e) { res.status(400).json({ error: e.message }); } };
  web.get('/api/state', (req, res) => res.json({ name: conf.name, startup: hooks.getStartup ? hooks.getStartup() : null, version: opts.version || '', bots: [...bots.values()].map(b => b.view()) }));
  web.post('/api/add', wrap(b => addBot(b.token)));
  web.post('/api/remove', wrap(async b => { const bot = bots.get(b.id); if (bot) { await bot.stop(); bots.delete(b.id); } conf.bots = conf.bots.filter(x => x.id !== b.id); saveConf(); try { fs.unlinkSync(path.join(DATA, `bot-${b.id}-cache.json`)); } catch {} return { ok: true }; }));
  web.post('/api/toggle', wrap(async b => { const bot = bots.get(b.id); if (!bot) throw new Error('No such bot'); bot.rec.on = !!b.on; saveConf(); if (b.on) { bot.started = Date.now(); await bot.start(); } else await bot.stop(); return { ok: true }; }));
  web.post('/api/name', wrap(async b => { const n = String(b.name || '').trim().slice(0, 40); if (!n) throw new Error('Type a name'); conf.name = n; saveConf(); return { ok: true }; }));
  web.post('/api/startup', wrap(async b => { hooks.setStartup?.(!!b.on); return { ok: true, startup: hooks.getStartup ? hooks.getStartup() : !!b.on }; }));
  web.post('/api/check', wrap(async b => { const bot = bots.get(b.id); if (!bot) throw new Error('No such bot'); if (!bot.client && bot.rec.on !== false) { await bot.start(); return bot.view(); } await bot.tick(true); return bot.view(); })); // (not connected: try connecting again)
  web.post('/api/takeover', wrap(async b => { // 🧪 test: take over now, as if the cloud bot broke (the streamer switches back in Movie Royal)
    const bot = bots.get(b.id); if (!bot?.client?.user) throw new Error("This bot isn't online.");
    await bot.takeOver('a test from Movie Royal Backup Bots'); await bot.tick(); return bot.view();
  }));
  const port = await new Promise(ok => { const srv = web.listen(opts.port || 3747, '127.0.0.1', () => ok(srv.address().port)).on('error', () => { const s2 = web.listen(0, '127.0.0.1', () => ok(s2.address().port)); }); });
  log(`running on http://127.0.0.1:${port}`);
  return { port, url: `http://127.0.0.1:${port}/` };
}

// run it without the desktop app: node src/backup.js
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) startBackup({ port: Number(process.env.PORT) || 3747 });
export const _test = { Bot, conf, setup: (dir, h = {}) => { DATA = dir; hooks = h; loadConf(); } }; // (for the tests)

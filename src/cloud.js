// 24/7 mode: a tiny copy of the Discord bot runs free on Cloudflare Workers, so /suggest works when this PC is off.
// This file sets it up (one click in Settings) and keeps it in sync while Movie Royal is running.
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { db, save, ROOT, streamerName } from './store.js';
import * as lb from './letterboxd.js';
import { picksClosed, closedMsg, moviesList, picksUsed, wonThisWeek, backOn, swapsLocked, luckOn, suggest, swapMovie, claimManual, swapMsg, swapHint } from './movies.js';
import { helpText, peopleIndex } from './discord.js';
import * as looks from './looks.js';

const CF = 'https://api.cloudflare.com/client/v4';
const DISCORD = 'https://discord.com/api/v10';
const SCRIPT = 'movie-royal-bot';
export const status = { lastSync: null, lastPush: null, lastError: null, pulled: 0, rejected: [], outdated: false };
// the version of the 24/7 bot that comes with this copy of Movie Royal (the bot on Cloudflare only changes when you update it)
const BOT_V = (() => { try { return Number((fs.readFileSync(path.join(ROOT, 'src', 'cloud-worker.js'), 'utf8').match(/WORKER_V = (\d+)/) || [])[1]) || 1; } catch { return 1; } })();
let checkedV = false;
/** Is the bot on Cloudflare older than the one that comes with this version? (checks once) */
export const botVersion = () => BOT_V;
export const versionKnown = () => checkedV; // (false = couldn't ask the bot on Cloudflare yet, e.g. no internet)
export async function botOutdated() { if (!enabled()) return false; if (!checkedV) await checkVersion(); return !!status.outdated; }
async function checkVersion() {
  try { const r = await fetch(cloud().url + '/health', { signal: AbortSignal.timeout(10000) }); const j = await r.json(); status.botV = Number(j.v) || 1; status.outdated = status.botV < BOT_V; checkedV = true; } catch {}
}
let onChange = () => {}, timer = null, lastHash = '', busy = false;

const cloud = () => db.settings.cloud || {};
export const enabled = () => !!cloud().enabled && !!cloud().url;
let backupHolds = () => false; // 🛡️ the backup bot server took over: don't point Discord back at the cloud by yourself
export function setBackupCheck(fn) { backupHolds = fn; }

async function cf(token, method, p, body, isForm) {
  const r = await fetch(CF + p, { method, headers: { Authorization: `Bearer ${token}`, ...(isForm || !body ? {} : { 'content-type': 'application/json' }) }, body: isForm ? body : body ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.success === false) { const e = new Error((j.errors || []).map(x => x.message).join('; ') || `Cloudflare ${r.status}`); e.code = j.errors?.[0]?.code; e.status = r.status; throw e; }
  return j.result;
}
async function discord(method, p, body) {
  const token = (db.settings.discordToken || '').trim();
  if (!token) throw new Error('Set up the Discord bot first (Settings → Discord).');
  const r = await fetch(DISCORD + p, { method, headers: { Authorization: `Bot ${token}`, 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`Discord: ${j.message || r.status}${j.errors ? ' ' + JSON.stringify(j.errors).slice(0, 200) : ''}`);
  return j;
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

/** Everything the cloud bot needs to apply your rules. */
export function buildConfig() {
  const list = moviesList(), ids = new Set();
  const pool = list.entries.filter(e => e.status !== 'removed').map(e => {
    for (const b of e.backers || []) ids.add(b.discordId);
    return { id: e.id, tmdbId: e.tmdbId || null, label: e.label, sub: e.sub || '', status: e.status, kind: e.kind || null, weight: e.weight || 1, luckPct: e.luckPct || 0, backers: (e.backers || []).map(b => ({ discordId: b.discordId, name: b.name })), collection: e.details?.collection || null };
  });
  for (const id of Object.keys(db.manualPeople || {})) ids.add(id);
  const users = {}; for (const id of ids) { const free = (db.freePicks || {})[id] || 0; users[id] = { used: Math.max(0, picksUsed(id) - free), free, wonThisWeek: wonThisWeek(id) }; } // free replacement picks (older 24/7 bots just see fewer picks used)
  const w = lb.exportWatched();
  return {
    v: 1, streamer: streamerName(), maxPerUser: Number(db.settings.maxPerUser) || 3, banCurrentYear: db.settings.banCurrentYear !== false,
    yearAllow: (db.yearAllow || []).map(String), bans: (db.bans || []).filter(b => !b.test && b.auto !== 'year').map(b => ({ tmdbId: String(b.tmdbId), reason: b.reason || '' })), banOk: (db.banOk || []).map(String), banRules: db.settings.banRules || {}, banAsk: String(db.settings.banAsk || '').trim() || 'Kirb',
    watched: { tmdb: w.tmdb.map(String), keys: w.keys, slugs: w.slugs },
    wonIds: list.entries.filter(e => e.status === 'watched' && e.tmdbId).map(e => String(e.tmdbId)),
    pool, users, people: peopleIndex().map(p => ({ discordId: p.discordId, name: p.name })), links: db.links || {},
    backOn: backOn(), swapsLocked: swapsLocked(), swapMsg: swapMsg(), swapHint: swapHint(), picksClosed: picksClosed(), closedMsg: closedMsg(), luckOn: luckOn(),
    channels: Object.fromEntries(Object.entries(db.discordChannels || {}).map(([g, c]) => [g, c.channelId])),
    debugChannels: db.settings.discordDebug === false ? [] : Object.values(db.discordDebug || {}).map(r => r.channelId).filter(Boolean),
    // 🎨 /character: everyone's picks (numbers only), the part names, and the picture sheets' version once they're uploaded from this PC
    looksOn: looks.on(), looks: Object.fromEntries(Object.entries(db.looks || {}).map(([id, l]) => [id, looks.nums(l)])), lookNames: looks.NAMES, lookPics: status.picsV === looks.picsVersion ? looks.picsVersion : null, picsUrl: cloud().url || '',
    helpText: helpText(), tmdbKey: db.settings.tmdbKey || '', botToken: db.settings.discordToken || '', publicKey: cloud().publicKey || ''
  };
}

async function api(method, body) {
  const c = cloud();
  const r = await fetch(c.url + '/sync', { method, headers: { Authorization: `Bearer ${c.syncKey}`, 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(15000) });
  if (!r.ok) throw new Error(`24/7 bot: ${r.status} ${await r.text().catch(() => '')}`.trim());
  return r.json();
}

async function tellUser(discordId, text) { // DM someone whose pick couldn't be added after all
  try { const ch = await discord('POST', '/users/@me/channels', { recipient_id: discordId }); await discord('POST', `/channels/${ch.id}/messages`, { content: text, allowed_mentions: { parse: [] } }); } catch {}
}

/** Add picks / swaps / Twitch links made in Discord while Movie Royal was closed (from the 24/7 bot or the backup bot server).
 *  Returns the ids that are done (added, or turned away with a DM saying why). */
export async function applyOps(queue) {
  const ack = [];
  for (const op of queue) {
    try {
      const user = { discordId: op.user.discordId, name: op.user.name, avatar: op.user.avatar || null };
      if (op.type === 'look') { const { look } = looks.check(op.look || {}); looks.setLook(user.discordId, look, user.name); lookPicture(op, look, user).catch(e => console.error('[24/7] character picture:', e.message)); } // 🎨 /character from the 24/7 bot: save it, then send a picture of it
      else if (op.type === 'link') { db.links[user.discordId] = op.login; (db.linkNames ||= {})[user.discordId] = { name: user.name, avatar: user.avatar }; claimManual(user, op.login); }
      else if (op.type === 'suggest') {
        claimManual(user, db.links[user.discordId] || null);
        const r = await suggest(String(op.movie.id), user, { cloud: true }); // the 24/7 bot already checked picks were open
        if (!r.ok) { status.rejected.unshift({ at: Date.now(), name: user.name, movie: op.movie.title, why: r.msg.replace(/\*\*/g, '') }); tellUser(user.discordId, `🍿 Sorry — your pick **${op.movie.title}** couldn't be added after all: ${r.msg}`); }
      } else if (op.type === 'swap') {
        const r = await swapMovie(user, op.oldId, String(op.movie.id), true);
        if (!r.ok) { status.rejected.unshift({ at: Date.now(), name: user.name, movie: op.movie.title, why: r.msg.replace(/\*\*/g, '') }); tellUser(user.discordId, `🍿 Sorry — your swap to **${op.movie.title}** couldn't be done: ${r.msg}`); }
      }
      ack.push(op.id); status.pulled++;
    } catch (e) { console.error('[24/7] op failed', e.message); if (Date.now() - op.at > 864e5) ack.push(op.id); }
  }
  status.rejected = status.rejected.slice(0, 20);
  if (queue.length) { save(); onChange(); }
  return ack;
}

/** 🖼️ A /character made through the 24/7 bot: draw it here and add the picture to their answer (Discord keeps that answer
 *  editable for 15 minutes) + show it off in the movie channel (Settings: lookPost, at most every 5 minutes a person). */
async function lookPicture(op, look, user) {
  const png = await looks.picture(look, user.name); if (!png) return;
  const multipart = (payload) => { const fd = new FormData(); fd.append('payload_json', JSON.stringify({ ...payload, attachments: [{ id: 0, filename: 'character.png' }] })); fd.append('files[0]', new Blob([png], { type: 'image/png' }), 'character.png'); return fd; };
  if (op.token && op.app && Date.now() - op.at < 14 * 60e3) await fetch(`${DISCORD}/webhooks/${op.app}/${op.token}/messages/@original`, { method: 'PATCH', body: multipart({}) }).catch(() => {});
  const token = db.settings.discordToken, ch = op.ch || Object.values(db.discordChannels || {})[0]?.channelId;
  if (token && ch && looks.postOk(user.discordId)) await fetch(`${DISCORD}/channels/${ch}/messages`, { method: 'POST', headers: { Authorization: `Bot ${token}` }, body: multipart({ content: looks.postText(user.name, op.first), allowed_mentions: { parse: [] } }) }).catch(() => {});
}

/** 🎨 The /character picture sheets: Cloudflare gets them from this PC (uploaded once, again only when they change),
 *  so the 24/7 bot can show them while this PC is off. */
async function uploadPics() {
  const c = cloud();
  try {
    const r = await fetch(c.url + '/chars/v', { signal: AbortSignal.timeout(10000) });
    if (r.ok && (await r.text()).trim() === looks.picsVersion) { status.picsV = looks.picsVersion; return; } // already there
    for (const sh of looks.SHEETS) {
      const up = await fetch(`${c.url}/sync/pic?name=${sh}&v=${looks.picsVersion}`, { method: 'PUT', headers: { Authorization: `Bearer ${c.syncKey}`, 'content-type': 'image/png' }, body: fs.readFileSync(looks.sheetFile(sh)), signal: AbortSignal.timeout(30000) });
      if (!up.ok) throw new Error(`picture ${sh}: ${up.status}`);
    }
    const fin = await fetch(`${c.url}/sync/pic?done=1&v=${looks.picsVersion}`, { method: 'PUT', headers: { Authorization: `Bearer ${c.syncKey}` }, signal: AbortSignal.timeout(15000) });
    if (!fin.ok) throw new Error('pictures: ' + fin.status);
    status.picsV = looks.picsVersion; lastHash = ''; // (the rules sent right after say the pictures are there)
  } catch (e) { console.error('[24/7] couldn\'t upload the /character pictures:', e.message); }
}

/** Pull picks made in Discord while we were away, add them for real, then upload the latest rules. */
export async function sync(force = false) {
  if (!enabled() || busy) return status;
  busy = true;
  try {
    const { queue = [] } = await api('GET');
    const ack = await applyOps(queue);
    if (!checkedV) await checkVersion();
    if (status.picsV !== looks.picsVersion && (status.botV || 0) >= 8) await uploadPics(); // 🎨 before the rules, so the bot hears the pictures are there
    const config = buildConfig(), hash = JSON.stringify(config);
    const due = force || ack.length || (hash !== lastHash && Date.now() - (status.lastPush || 0) > 120000);
    if (due) { await api('POST', { config, ack }); lastHash = hash; status.lastPush = Date.now(); }
    status.lastSync = Date.now(); status.lastError = null; status.netFails = 0;
    if (!checkedV) await checkVersion();
  } catch (e) {
    status.lastError = e.message;
    // a one-off internet hiccup (timeout, no connection) fixes itself on the next check: only log it if it keeps happening
    const net = /timeout|aborted|fetch failed|ENOTFOUND|ECONNRESET|ETIMEDOUT|EAI_AGAIN|socket hang up|network/i.test(e.message);
    status.netFails = net ? (status.netFails || 0) + 1 : 0;
    if (!net || status.netFails === 3) console.error('[24/7]', net ? `couldn't reach the 24/7 bot 3 times in a row: ${e.message}` : e.message);
  }
  finally { busy = false; onChange(); }
  return status;
}

export function start(changed) {
  onChange = changed || onChange;
  clearInterval(timer); clearInterval(linkTimer);
  if (!enabled()) return;
  setTimeout(() => sync(true).then(() => checkLink()), 3000);
  timer = setInterval(() => sync(false), 60000);
  linkTimer = setInterval(() => checkLink(), 10 * 60000);
}
/** Is Discord really sending /suggest, /linktwitch… to the 24/7 bot? If not, the bot only "works" while the app is open.
 *  Checks Discord, and re-connects it by itself when it slipped (or never stuck). */
let linkTimer = null;
export async function checkLink(fix = true) {
  if (!enabled()) { status.linked = null; return status; }
  const url = cloud().url + '/';
  try {
    const app = await discord('GET', '/applications/@me');
    if (app.verify_key && app.verify_key !== cloud().publicKey) { db.settings.cloud = { ...cloud(), publicKey: app.verify_key }; save(); lastHash = ''; await sync(true); }
    status.linked = app.interactions_endpoint_url === url;
    if (!status.linked && fix && backupHolds()) { status.backupHolds = true; }
    else if (!status.linked && fix) {
      await sync(true);
      await discord('PATCH', '/applications/@me', { interactions_endpoint_url: url });
      status.linked = true; status.relinked = Date.now(); console.log('[24/7] Discord was not pointed at the 24/7 bot — fixed');
    }
    status.linkError = null;
  } catch (e) { status.linked = false; status.linkError = e.message; if (!/timeout|aborted|fetch failed|ENOTFOUND|ECONNRESET|ETIMEDOUT|EAI_AGAIN|network/i.test(e.message)) console.error('[24/7] link check', e.message); } // (internet hiccups: checked again in 10 minutes)
  try { const r = await fetch(cloud().url + '/health', { signal: AbortSignal.timeout(10000) }); status.botUp = r.ok; } catch { status.botUp = false; }
  status.checkedAt = Date.now(); onChange();
  return status;
}

/** One click: put the bot on Cloudflare, connect Discord to it. */
export async function enable(cfToken) {
  cfToken = String(cfToken || '').trim();
  if (!cfToken) throw new Error('Paste your Cloudflare API token first.');
  if (!db.settings.discordToken || !db.settings.discordClientId) throw new Error('Set up the Discord bot first (Settings → Discord).');
  if (!db.settings.tmdbKey) throw new Error('Set up movie search (TMDB) first.');
  const steps = [];
  const accounts = await cf(cfToken, 'GET', '/accounts');
  if (!accounts?.length) throw new Error('That Cloudflare token can’t see your account. Make it with the “Edit Cloudflare Workers” template.');
  const accountId = accounts[0].id; steps.push('account');
  const spaces = await cf(cfToken, 'GET', `/accounts/${accountId}/storage/kv/namespaces?per_page=100`);
  let kv = spaces.find(n => n.title === 'movie-royal') || spaces.find(n => n.title === 'movie-royale'); // older setups used the misspelled name
  if (!kv) kv = await cf(cfToken, 'POST', `/accounts/${accountId}/storage/kv/namespaces`, { title: 'movie-royal' });
  steps.push('storage');
  const syncKey = cloud().syncKey || crypto.randomBytes(24).toString('hex');
  const code = fs.readFileSync(path.join(ROOT, 'src', 'cloud-worker.js'), 'utf8');
  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify({ main_module: 'worker.js', compatibility_date: '2024-09-23', bindings: [{ type: 'kv_namespace', name: 'KV', namespace_id: kv.id }, { type: 'secret_text', name: 'SYNC_KEY', text: syncKey }] })], { type: 'application/json' }));
  form.append('worker.js', new Blob([code], { type: 'application/javascript+module' }), 'worker.js');
  await cf(cfToken, 'PUT', `/accounts/${accountId}/workers/scripts/${SCRIPT}`, form, true);
  steps.push('bot uploaded');
  let sub;
  try { sub = (await cf(cfToken, 'GET', `/accounts/${accountId}/workers/subdomain`))?.subdomain; } catch {}
  if (!sub) sub = (await cf(cfToken, 'PUT', `/accounts/${accountId}/workers/subdomain`, { subdomain: 'movieroyal-' + crypto.randomBytes(3).toString('hex') })).subdomain;
  await cf(cfToken, 'POST', `/accounts/${accountId}/workers/scripts/${SCRIPT}/subdomain`, { enabled: true, previews_enabled: false });
  const url = `https://${SCRIPT}.${sub}.workers.dev`;
  steps.push('online at ' + url);
  const app = await discord('GET', '/applications/@me');
  db.settings.cloud = { enabled: true, url, accountId, kvId: kv.id, syncKey, publicKey: app.verify_key, at: Date.now() }; save(); status.linked = false;
  // a brand-new workers.dev address can take a little while to come alive
  let pushed = false, lastErr;
  for (let i = 0; i < 20 && !pushed; i++) { try { await api('POST', { config: buildConfig() }); pushed = true; } catch (e) { lastErr = e; await sleep(3000); } }
  if (!pushed) throw new Error(`The bot was uploaded but isn't answering yet (${lastErr?.message}). Wait a minute and press Turn on again.`);
  lastHash = ''; steps.push('rules uploaded');
  let linked = false;
  for (let i = 0; i < 5 && !linked; i++) { try { await discord('PATCH', '/applications/@me', { interactions_endpoint_url: url + '/' }); linked = true; } catch (e) { lastErr = e; await sleep(4000); } }
  if (!linked) { status.linked = false; status.linkError = lastErr?.message; throw new Error(`Couldn't connect Discord to the 24/7 bot: ${lastErr?.message}. Movie Royal will keep trying by itself; you can also press Turn on again.`); }
  status.linked = true;
  steps.push('Discord connected');
  checkedV = false; status.outdated = false;
  start();
  return { url, steps };
}

export async function disable() {
  if (enabled()) { try { await sync(true); } catch {} }
  try { await discord('PATCH', '/applications/@me', { interactions_endpoint_url: null }); } catch (e) { console.error('[24/7] unlink', e.message); }
  db.settings.cloud = { ...cloud(), enabled: false }; save();
  clearInterval(timer);
}

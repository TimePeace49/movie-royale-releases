// Movie Royal — local server. Open http://localhost:3737 for the control panel.
import express from 'express';
import http from 'http';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { WebSocketServer } from 'ws';
import os from 'os';
import { spawn } from 'child_process';
import { streamerName } from './store.js';
import { db, save, uid, getList, norm, ROOT, DATA, UPLOADS, IMGCACHE, EVENTS } from './store.js';
import * as lb from './letterboxd.js';
import * as discord from './discord.js';
import * as twitch from './twitch.js';
import { getMany, searchMovies, findImdb } from './tmdb.js';
import { scan as banScan, runScan, yearCleanup, setScanHooks } from './banscan.js';
import * as listsrc from './listsrc.js';
import { undoMovieWin, resetCooldowns } from './movies.js';
import { setBattleCheck, lockMode, autoLocked } from './movies.js';
import { resetLuckFor, giveLuckBack, picksClosed, setOwner, claimManual, mergePerson, watchedElsewhere, unwatchedElsewhere, setWatchedElsewhereHook, wonThisWeek, freePicks } from './movies.js';
import { getRatings, testOmdb } from './ratings.js';
import { parseImport, toLines, importLink } from './importer.js';
import * as cloud from './cloud.js';
import * as backuplink from './backuplink.js';
import { MAP_LIST, mapById, GROUND_EVENTS } from './maps.js';
import * as wheel from './wheel.js';
import { renameUser } from './rename.js';
import * as donations from './donations.js';
import * as obs from './obs.js';
import * as cards from './cards.js';
import * as chatlog from './chat.js';
import { recordRound, getResults, listResults, statsView, statsReady } from './stats.js';
import { getMovie as tmdbMovie } from './tmdb.js';
import { blockReason, banMovie, unbanMovie, unapprove, autoBan, isBanned as isBannedId, allowThisYear, addLuck, luckMultiplier, luckOn, swapsLocked } from './movies.js';
import { suggest, sweepWatched, picksUsed, addSpots, resetSpots, afterMovieWin, newWeek, isSpot, rollWeek, weekStartDate, backOn, weekKey } from './movies.js';

import * as errlog from './errlog.js';

// ⚠️ every error anywhere in the app also goes in the error history (Test tab → ⚠️ Errors)
{
  const ce = console.error.bind(console);
  console.error = (...a) => {
    ce(...a);
    try {
      const first = typeof a[0] === 'string' ? a[0] : '', m = first.match(/^\[([^\]]+)\]\s*/);
      const parts = (m ? [first.slice(m[0].length), ...a.slice(1)] : a).map(x => x instanceof Error ? x.message : typeof x === 'string' ? x : (() => { try { return JSON.stringify(x); } catch { return String(x); } })()).filter(Boolean);
      errlog.logErr(m ? m[1].toLowerCase() : 'app', parts.join(' '), a.find(x => x instanceof Error)?.stack || '');
    } catch {}
  };
  process.on('unhandledRejection', r => console.error('[app] Unhandled problem:', r instanceof Error ? r : String(r)));
}

const PORT = Number(process.env.PORT) || 3737;
const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

// ---------- live state ----------
const live = {
  phase: 'idle',   // idle | lobby | running | ended
  game: null,      // { id, listId, fighters }
  lastWinner: null,
  claim: null,     // { winner, endsAt, claimed }
  chatLog: []      // recent twitch chat
};

function broadcast(msg, role) {
  const s = JSON.stringify(msg);
  for (const c of wss.clients) if (c.readyState === 1 && (!role || c.role === role)) c.send(s);
}
let stateTimer;
function pushState() { clearTimeout(stateTimer); stateTimer = setTimeout(() => broadcast({ type: 'state', state: publicState() }, 'control'), 100); refreshPreview(); }

// While no round is running, the game screen shows the active list's pieces waiting on the cliff (updates live as entries are added).
let previewTimer, previewIds = null, previewList = null;
// a finished round is still on screen but you moved on (picked another battle, or the game window reloaded): back to the waiting cliff
function leaveEnded(keepMap) {
  if (live.phase !== 'ended') return;
  if (live.claim) clearTimeout(live.claim.timer); live.claim = null; if (!keepMap && !live.game?.cards) nextMap(); // (a card battle on a ball map doesn't move the ball map rotation on)
  live.phase = 'idle'; live.game = null;
  broadcast({ type: 'reset' }, 'overlay');
}
var lastPreview = null, previewError = null; // the last cliff sent to the game screens (they check in every few seconds; any that missed it get it again)
function refreshPreview(now = false) {
  clearTimeout(previewTimer); clearTimeout(refreshPreview.rw); refreshPreview.rw = setTimeout(() => syncRewards().catch(() => {}), 1500); // channel point rewards follow the map and battle
  previewTimer = setTimeout(async () => { try {
    if (live.phase !== 'idle') return;
    const cp = cards.ballPreview(); // 🃏 Card battles tab with a ball map: the card fighters wait on that map
    if (cp) { const fighters = cp.fighters.map(f => ({ id: f.id, label: f.name + (f.tag ? ' ' + f.tag : ''), sub: f.game || '', image: f.image || null, weight: 1, kind: 'cards' }));
      lastPreview = { type: 'preview', map: cp.map, fighters, total: fighters.length, listName: cp.name, kind: 'cards', skin: 'cards', queued: 0, chaos: chaosState(), chatGate: false }; lastPreview.key = fighters.map(f => f.id).join(',');
      broadcast(lastPreview, 'overlay'); lastPreview.at = Date.now(); return; }
    const list = getList(db.activeListId);
    if (!list) return;
    if (previewList !== list.id) { previewIds = null; previewList = list.id; }
    const { fighters, total } = await buildFighters(list, previewIds);
    if (live.phase !== 'idle') return;
    previewIds = fighters.map(f => f.id);
    lastPreview = { type: 'preview', map: currentMap(), fighters, total, listName: list.screenTitle || list.name, kind: list.type, skin: list.chars ? 'chars' : undefined, queued: db.pendingEffects.length, chaos: chaosState(), chatGate: list.type === 'movies' && db.settings.chatGate !== false }; lastPreview.key = fighters.map(f => f.id).sort().join(',');
    broadcast(lastPreview, 'overlay');
    lastPreview.at = Date.now(); previewError = null;
  } catch (e) { console.error('[preview]', e); previewError = e.message; broadcast({ type: 'toast', text: `⚠️ The cliff couldn't be set up: ${e.message}` }, 'control'); } 
  }, now ? 0 : 300);
}

setWatchedElsewhereHook((e, b) => {
  const manual = String(b.discordId).startsWith('manual-'), who = manual ? `**${b.name}**` : `<@${b.discordId}>`;
  discord.notify(`🎬 ${who}, your movie **${e.label}${e.sub ? ` (${e.sub})` : ''}** got watched! You get a **free pick** to replace it: use \`/suggest\` any time, even if picks are closed or you've used all your picks. It only counts for this one movie.`).catch(() => {});
  broadcast({ type: 'toast', text: `🎟️ ${b.name} gets a free replacement pick for ${e.label} (told them in Discord)` }, 'control');
  if (cloud.enabled()) cloud.sync(true).catch?.(() => {});
});
const PKG = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const VERSION = process.env.MR_VERSION || PKG.version;
let historyVersion = 0;
try { statsReady(); } catch (e) { console.error("[stats]", e.message); }
function discordPeople() {
  const m = new Map();
  for (const e of getList('movies')?.entries || []) for (const b of e.backers || []) {
    let p = m.get(b.discordId);
    if (!p) { p = { discordId: b.discordId, name: b.name, avatar: b.avatar, active: [], watched: 0 }; m.set(b.discordId, p); }
    if (e.status === 'active' || e.status === 'benched' || e.status === 'paused') p.active.push({ id: e.id, label: e.label, sub: e.sub, benched: e.status === 'benched', paused: e.status === 'paused' });
    else if (e.status === 'watched') p.watched++;
  }
  for (const [id, mp] of Object.entries(db.manualPeople || {})) if (!m.has(id)) m.set(id, { discordId: id, name: mp.name, avatar: null, active: [], watched: 0 });
  for (const [id, login] of Object.entries(db.links || {})) if (!m.has(id) && login) { const n = db.linkNames?.[id]; m.set(id, { discordId: id, name: n?.name || login, avatar: n?.avatar || null, active: [], watched: 0 }); } // linked their Twitch in Discord, no movies yet
  for (const p of m.values()) p.manual = String(p.discordId).startsWith('manual-');
  const on = activeSet();
  return [...m.values()].map(p => ({ ...p, twitch: db.links[p.discordId] || '', used: picksUsed(p.discordId), free: freePicks(p.discordId), max: db.settings.maxPerUser, chatting: on.has(p.discordId) }))
    .sort((a, b) => b.active.length - a.active.length || a.name.localeCompare(b.name));
}
function findHistory(id) { return id && db.history.find(h => h.id === id); }

function publicState() {
  const mask = v => (v ? '••••••' + String(v).slice(-4) : '');
  const st = db.settings;
  return {
    cloud: { enabled: cloud.enabled(), url: st.cloud?.url || '', ...cloud.status },
    backup: { ...backuplink.status, _ref: undefined, watching: backuplink.backupWatching(), active: backuplink.backupActive() },
    settings: { ...st, cloud: { enabled: !!st.cloud?.enabled, url: st.cloud?.url || '' }, seJwt: mask(st.seJwt), slToken: mask(st.slToken), obsPassword: mask(st.obsPassword), discordToken: mask(st.discordToken), twitchClientSecret: mask(st.twitchClientSecret), tmdbKey: mask(st.tmdbKey), omdbKey: mask(st.omdbKey), wheelOfNamesKey: mask(st.wheelOfNamesKey) },
    lists: db.lists, activeListId: db.activeListId, history: db.history.slice(-15).reverse().map(h => ({ label: h.winner?.label ?? h.label, sub: h.winner?.sub ?? h.sub, at: h.at, listName: h.listName })),
    week: { start: weekStartDate().toISOString(), backOn: backOn(), winners: db.week?.winners?.length || 0, spotWon: !!db.week?.spotWon },
    version: VERSION, historyVersion, wheelVer: wheel.W().ver || 0, wheelShow: !!wheel.W().show, owner: db.owner ? { name: db.owner.name, avatar: db.owner.avatar, login: db.owner.login } : null, people: discordPeople(),
    pendingEffects: db.pendingEffects, events: EVENTS,
    status: { discord: discord.status, twitch: twitch.status, donations: donations.status, letterboxd: lb.stats(), overlays: [...wss.clients].filter(c => c.role === 'overlay').length },
    movieNo: (stream().movies || 0) + 1, phase: live.phase, lastWinner: live.lastWinner, claim: live.claim && { ...live.claim, timer: undefined },
    noShowStreak: db.noShowStreak || 0, chatters: stream().active, phaseAt: live.phaseAt || 0, recentChatters: recentChatters(), wheelChatters: chattersForWheel(), gather: live.gather ? { endsAt: live.gather.endsAt } : null, rollcall: live.rollcall && { ...live.rollcall, timer: undefined }, awayCount: (getList('movies')?.entries || []).filter(e => e.status === 'away').length,
    maps: mapsWithTags(), mapNow: (live.phase === 'lobby' || live.phase === 'running') && live.game?.map || currentMap(), vote: live.vote && { options: live.vote.options, endsAt: live.vote.endsAt }, colorCount: Object.keys(db.colors || {}).length,
    rewardsByHand: rewardsByHand || [], backupDue: backupDue(), lastBackupAt: db.lastBackupAt || null, luckSaves: (db.luckSaves || []).map(x => ({ id: x.id, at: x.at, name: x.name, listId: x.listId || 'movies', kind: x.kind || 'luck', count: Object.keys(x.luck).length, total: Math.round(Object.values(x.luck).reduce((a, b) => a + b, 0) * 10) / 10 })), series: live.series && !live.series.done ? { listId: live.series.listId, bestOf: live.series.bestOf, need: live.series.need, round: live.series.round, tally: Object.entries(live.series.wins).sort((a, b) => b[1] - a[1]).map(([id, n]) => ({ label: live.series.names[id], n })) } : null, chaos: chaosState(), calls: { open: live.phase !== 'running' && live.phase !== 'ended', count: live.calls?.size || 0, top: live.calls ? callSummary().slice(0, 6) : [] }, picksClosed: picksClosed(), picksClosedManual: !!db.picksClosed, raid: live.raid ? { by: live.raid.name, target: live.raid.target, started: live.raid.started || null, test: !!live.raid.test } : null, raidSetup: db.raidSetup || null, vrSetup: db.vrSetup || null, choiceObs: !!db.settings.choiceObs, chatBot: db.twitchBot ? { name: db.twitchBot.user?.name, login: db.twitchBot.user?.login, avatar: db.twitchBot.user?.avatar, on: twitch.botOn(), error: twitch.botStatus.error } : null, announce: Object.fromEntries(Object.entries(annState()).map(([k, a]) => [k, { on: !!a?.on, last: a?.last || 0, error: a?.error || null, kind: a?.kind || null }])), annKind: annKind(), cards: cards.stateFor(), capture: { on: !!live.capture, error: live.captureError || null, size: Number(db.settings.capSize) || 30, autoHide: !!db.settings.capAutoHide, window: db.settings.capWindow || '' }, announceMins: Math.max(5, Number(db.settings.announceMins) || 60), announceDefaults: ANNOUNCE_DEFAULTS, pickLock: lockMode(), autoLocked: autoLocked(), live: !!db.live || !!live.fakeLive, fakeLive: !!live.fakeLive, swapLock: !!db.swapLock, swapsLocked: swapsLocked(), luckOn: luckOn(), banCount: (db.bans || []).length,
    port: PORT
  };
}

// ---------- helpers ----------
const IMG_HOSTS = ['static-cdn.jtvnw.net', 'cdn.discordapp.com', 'media.discordapp.net', 'image.tmdb.org'];
const proxied = u => !u ? null : u.startsWith('/') ? u : `/img?u=${encodeURIComponent(u)}`;

function parseLines(text) {
  const out = [];
  // commas or new lines both separate items ("Heat, Jaws x2"). Lines with a link keep their commas.
  const lines = String(text || '').split(/\r?\n/).flatMap(l => /https?:\/\//i.test(l) ? [l] : l.split(/,(?!\s*\d+(?:\.\d+)?\s*(?:,|$))/));
  for (let line of lines) {
    line = line.trim().replace(/^[-*•]\s+/, '').replace(/^\d+[.)]\s+/, '');
    if (!line) continue;
    let weight = 1, image = null;
    const w = line.match(/^(.*?)(?:\s*[|,]\s*|\s+[x×*])(\d+(?:\.\d+)?)\s*$/i);
    if (w && w[1]) { line = w[1].trim(); weight = Math.max(0.1, Number(w[2])); }
    const im = line.match(/^(.*?)\s*\|?\s*(https?:\/\/\S+)$/i);
    if (im) {
      image = im[2];
      line = im[1].replace(/\|\s*$/, '').trim() || decodeURIComponent(image.split('/').pop().split('?')[0]).replace(/\.\w+$/, '').replace(/[-_]+/g, ' ');
    }
    out.push({ label: line.slice(0, 80), weight, image });
  }
  return out;
}

function addEntry(list, { label, weight = 1, image = null, twitch: tw = null, sub = '' }) {
  const key = norm(tw || label);
  const ex = list.entries.find(e => e.status === 'active' && norm(e.twitch || e.label) === key);
  if (ex) { ex.weight = Math.round(((ex.weight || 1) + weight) * 10) / 10; if (image && !ex.image) ex.image = image; return ex; }
  const old = list.entries.find(e => e.status === 'removed' && norm(e.twitch || e.label) === key); // taken out earlier (entries are only hidden, never deleted): bring that one back
  if (old) { old.status = 'active'; old.weight = weight; if (image) old.image = image; if (sub) old.sub = sub; old.addedAt = Date.now(); return old; }
  const e = { id: uid(), label, sub, weight, image, twitch: tw, status: 'active', addedAt: Date.now() };
  list.entries.push(e);
  return e;
}

async function fillTwitchAvatars(list) {
  const need = list.entries.filter(e => e.twitch && !e.image);
  if (!need.length) return;
  const users = await twitch.getUsers(need.map(e => e.twitch));
  for (const e of need) { const u = users.get(e.twitch); if (u) { e.image = u.avatar; e.label = u.name; } }
  save(); pushState();
}

function weightedPick(arr, w = x => x.weight || 1) {
  let total = arr.reduce((s, x) => s + w(x), 0), r = Math.random() * total;
  for (const x of arr) { r -= w(x); if (r <= 0) return x; }
  return arr[arr.length - 1];
}

async function buildFighters(list, keepIds = null) {
  let pool = list.entries.filter(e => e.status === 'active');
  if (list.type === 'movies' && db.settings.chatGate !== false) { const on = activeSet(); pool = pool.filter(e => e.kind === 'spot' || e.forceIn || !e.backers?.length || on.has(e.backers[0].discordId)); } // forceIn = you put it back yourself
  const max = Math.max(2, Number(db.settings.maxFighters) || 40);
  let picked = pool;
  if (pool.length > max) { // weighted qualifiers (keeps whoever is already waiting on the cliff)
    const keep = new Set(keepIds || []);
    picked = pool.filter(e => keep.has(e.id)).slice(0, max);
    const rest = pool.filter(e => !picked.includes(e));
    while (picked.length < max) { const p = weightedPick(rest); picked.push(p); rest.splice(rest.indexOf(p), 1); }
  }
  // figure pictures: movies use the suggester's Twitch pic (if linked) else Discord pic
  const logins = [];
  for (const e of picked) {
    if (list.type === 'movies' && isSpot(e)) { if (db.settings.spotTwitch) logins.push(db.settings.spotTwitch); }
    else if (list.type === 'movies') { const b = e.backers?.[0]; const tw = b && db.links[b.discordId]; if (tw) logins.push(tw); }
    else if (e.twitch) logins.push(e.twitch);
  }
  const users = await Promise.race([twitch.getUsers(logins).catch(() => new Map()), new Promise(r => setTimeout(() => r(new Map()), 4000))]); // pictures are nice, but never hold up the cliff
  return {
    total: pool.length,
    fighters: picked.map(e => {
      let image = e.image, owner = null, ownerLogin = null;
      if (list.type === 'movies' && isSpot(e)) {
        ownerLogin = db.settings.spotTwitch ? db.settings.spotTwitch.toLowerCase() : null;
        owner = db.settings.spotName || 'Kirb';
        image = (ownerLogin && users.get(ownerLogin)?.avatar) || null;
      } else if (list.type === 'movies') {
        const b = e.backers?.[0];
        ownerLogin = b ? db.links[b.discordId] || null : null;
        const u = ownerLogin && users.get(ownerLogin);
        image = u?.avatar || b?.avatar || null;
        owner = b ? (u?.name || b.name) : streamerName();
      } else if (e.twitch) { ownerLogin = e.twitch; owner = e.label; image = users.get(e.twitch)?.avatar || e.image; }
      const wl = watchLuck(list, ownerLogin); // 👀 watch luck (this battle's setting)
      const gender = list.chars ? genderOf(list, ownerLogin) : undefined; // 🧍 characters: man / woman / non-binary
      return {
        id: e.id, label: e.label, sub: e.sub || '', weight: Math.round((e.weight || 1) * (list.type === 'movies' ? luckMultiplier(e) : 1) * (1 + wl / 100) * 10000) / 10000, luck: Math.min(100, (list.type === 'movies' && luckOn() ? (e.luckPct || 0) : 0) + wl), watchLuck: wl || undefined,
        // the glow + flames show on every battle type and every map: movies use their luck, custom/chat/giveaway lists use their extra odds (x2 = 10%, x6 = 50% flames)
        glow: Math.min(100, (e.luckPct > 0 ? e.luckPct : Math.max(0, Math.round(((e.weight || 1) - 1) * 10))) + wl),
        image: proxied(image), poster: proxied(e.poster), owner, ownerLogin,
        showOwner: list.type === 'movies' || (list.type === 'chat' && !!e.joined), color: (db.settings.colorsOn !== false && ownerLogin && db.colors?.[ownerLogin.toLowerCase()]) || null,
        backers: e.backers?.length || 0, kind: list.type, details: e.details || null, spot: isSpot(e), tmdbId: e.tmdbId || null, powers: list.type === 'chat' && list.fun?.powerups && e.powers ? e.powers : null, gender
      };
    })
  };
}

// 🧍 characters: who someone said they are with !id (m / f / n; nothing = non-binary, no tag). Off for this battle = everyone non-binary.
const ID_WORDS = { m: /^(man|male|boy|guy|he|him|m)$/, f: /^(woman|women|female|girl|she|her|f|w)$/, n: /^(none|nonbinary|non-binary|nb|enby|they|them|neither|other|n)$/ };
const ID_LABEL = { m: '👨 man', f: '👩 woman', n: '🧑 non-binary' };
function genderOf(list, login) { if (db.settings.charGenders === false || db.settings.idOn === false || list?.charIds === false || !login) return 'n'; return db.ids?.[String(login).toLowerCase()] || 'n'; }
function idChat(m) {
  if (db.settings.idOn === false) return false; // (Settings: the !id command is off)
  const cmd = String(db.settings.idCommand || '!id').trim().toLowerCase(), words = m.text.trim().toLowerCase().split(/\s+/); if (!cmd || words[0] !== cmd) return false;
  const w = (words[1] || '').replace(/[^a-z-]/g, ''), login = m.login, say = t => { if (twitch.canSay()) twitch.say(`@${m.name} ${t}`).catch(() => {}); };
  if (!w) { const cur = db.ids?.[login]; say(`your battle character is ${cur ? ID_LABEL[cur] : '🧑 non-binary (no tag)'}. Change it: ${cmd} man · ${cmd} woman · ${cmd} none · ${cmd} remove`); return true; }
  db.ids ||= {};
  if (/^(remove|clear|reset|delete|off)$/.test(w)) { delete db.ids[login]; save(); say(`🧑 tag removed: your battle character is non-binary.`); pushState(); return true; }
  const k = Object.keys(ID_WORDS).find(x => ID_WORDS[x].test(w)); if (!k) { say(`try ${cmd} man, ${cmd} woman, ${cmd} none or ${cmd} remove`); return true; }
  db.ids[login] = k; save(); say(`${ID_LABEL[k]}: got it! That's your character in battles that use characters.`); pushState(); refreshPreview(); return true;
}
// 👀 watch luck: in a battle with it on, every `every` streams someone watched since it was turned on = +`amount` luck (max 100)
function watchHours(list, login) { const k = String(login || '').toLowerCase(), v = k && db.viewers?.[k]; if (!v) return 0; return Math.max(0, (v.watchMins || 0) - (list.watchLuck?.base?.[k] || 0)) / 60; } // hours watched since watch luck was turned on
function watchLuck(list, login) { const w = list?.watchLuck; if (!w?.on || !login) return 0; return Math.min(100, Math.floor(watchHours(list, login) / Math.max(1, w.hours || 10)) * (w.amount || 1)); }
app.get('/api/lists/:id/watch-luck', (req, res) => { // who has watch luck right now (for the settings window)
  const l = getList(req.params.id); if (!l) return res.status(404).json({ error: 'No such battle' });
  const w = l.watchLuck || { on: false, hours: 10, amount: 1, since: 0 }, rows = [];
  for (const e of l.entries.filter(x => x.status === 'active')) { const login = l.type === 'movies' ? (e.backers?.[0] ? db.links[e.backers[0].discordId] : null) : e.twitch; if (!login) continue; const h = Math.round(watchHours(l, login) * 10) / 10; rows.push({ label: e.label, login, hours: h, luck: watchLuck(l, login) }); }
  rows.sort((a, b) => b.luck - a.luck || b.hours - a.hours); res.json({ on: !!w.on, hours: w.hours || 10, amount: w.amount || 1, since: w.since, rows: rows.slice(0, 50), linked: rows.length });
});
// ---------- 🎉 chat battle power-ups: a viewer powers up their own ball ----------
const POWER_INFO = { shield: { icon: '🛡️', say: 'a shield (it saves them once)' }, mega: { icon: '💪', say: 'a MEGA ball' }, turbo: { icon: '⚡', say: 'turbo speed' }, ghost: { icon: '👻', say: 'GHOST mode (nobody can bump them for the first 10 seconds)' }, spiky: { icon: '🦔', say: 'SPIKES (bumping them hurts)' }, magnet: { icon: '🧲', say: 'a MAGNET (it pulls everyone in)' } };
function powerUp(r, kind) {
  const l = getList(db.activeListId), say = t => { if (twitch.canSay()) twitch.say(t).catch(() => {}); };
  if (!(l?.type === 'chat' && l.fun?.powerups)) return say(`@${r.name} power-ups only work during a chat battle with power-ups turned on.`);
  if (l.fun.powersOff?.[kind]) return say(`@${r.name} ${POWER_INFO[kind]?.icon || ''} that power-up is turned off right now.`);
  const e = l.entries.find(x => x.status === 'active' && norm(x.twitch || x.label) === norm(r.login));
  if (!e) return say(`@${r.name} you're not in the battle yet: type ${db.settings.joinCommand || '!join'} first!`);
  e.powers ||= {};
  if (kind === 'shield') e.powers.shield = Math.min(3, (e.powers.shield || 0) + 1); else e.powers[kind] = true;
  save();
  if ((live.phase === 'lobby' || live.phase === 'running') && live.game?.listId === l.id) broadcast({ type: 'power', id: e.id, power: kind, name: r.name }, 'overlay');
  else refreshPreview();
  say(`${POWER_INFO[kind]?.icon || '✨'} @${r.name} powered up their ball with ${POWER_INFO[kind]?.say || kind}!`);
  pushState();
}
// pause the channel point rewards that can't do anything right now, unpause the ones that can
// (ground-breaking chaos on maps where nothing breaks; ball power-ups outside a chat battle with power-ups on)
let rewardKey = '', rewardBusy = false;
// Every channel point reward Movie Royal made is paused unless it can be used right now:
// battle chaos only while the battle is on stream (and never ground-breakers on solid maps), ball power-ups only in a fun chat battle,
// wheel rewards only while the wheel is on stream, the ball color reward only while the battle is up. Anything else the app made stays paused.
// (Pausing only. Never refunds, cancels or completes anything.)
var rewardsByHand = []; // rewards with our names that were made by hand on Twitch: we can't pause them
function rewardWants() {
  const inUse = !!db.live || live.phase === 'lobby' || live.phase === 'running'; // not streaming = nothing can be redeemed
  const st = db.settings, on = st.pointsOn !== false && inUse, map = mapById(currentMap()), l = getList(db.activeListId), W = wheel.W(), wheelUp = !!W.show;
  const want = {}; // title → should it be paused?
  for (const [title, ev] of Object.entries(st.rewards || {})) want[title.toLowerCase()] = !on || wheelUp || (!!map?.solid && GROUND_EVENTS.includes(ev));
  const powersOn = on && !wheelUp && l?.type === 'chat' && !!l.fun?.powerups;
  for (const [title, kind] of Object.entries(st.powerRewards || {})) want[title.toLowerCase()] = !powersOn || !!l?.fun?.powersOff?.[kind]; // (each power-up can be switched off on the Chat battle tab)
  const wh = W.wheels.find(w => w.id === W.activeId), P = { respin: true, move: true, up: true, down: true, grow: true, shrink: false, ...(wh?.opts?.points || {}) };
  const onAuto = /^auto/.test(W.last?.type || '') && W.round?.state !== 'ended' && !W.final; // ⚡ landed on an auto spot: no respins (Derek)
  for (const [kind, title] of Object.entries(W.rewards || {})) if (title) want[title.toLowerCase()] = !(inUse && wheelUp && W.pointsOn !== false && P[kind] !== false && !(kind === 'respin' && onAuto));
  if (st.colorReward) want[st.colorReward.toLowerCase()] = !(inUse && st.colorsOn !== false && st.colorMode === 'points' && !wheelUp);
  if (st.raidOn !== false && st.raidTitle) want[st.raidTitle.toLowerCase()] = !(db.live && !stream().raidUsed); // 🚀 while you're live, until someone redeems it
  for (const k of Object.keys(VR)) want[vrTitle(k).toLowerCase()] = false; // 💧🙆🎩🎉 always on in the menu
  for (const [t, m] of Object.entries(db.rewardModes || {})) { if (m === 'off') want[t] = true; else if (m === 'on' || m === 'once') want[t] = false; else if (m === 'count') want[t] = countLeft(t) <= 0; } // (🔢 countdown: on until it's been used that many times this stream) // 💰 your override (Settings → Rewards & prices) beats the rules
  return want;
}
async function syncRewards(all = null) {
  if (!twitch.status.userId || rewardBusy) return;
  const want = all == null ? rewardWants() : null;
  const key = all == null ? JSON.stringify(want) : 'all:' + all; if (key === rewardKey) return;
  rewardBusy = true;
  try {
    const mine = await twitch.listRewards(); // only the rewards this app made
    const pause = r => all != null ? all : (r.title.toLowerCase() in want ? want[r.title.toLowerCase()] : true);
    // not usable right now = switched OFF (hidden from the channel points menu, so it doesn't clog it up); usable = on
    await Promise.allSettled(mine.filter(r => r.enabled === pause(r) || r.paused).map(r => twitch.updateReward(r.id, { enabled: !pause(r), paused: false })));
    rewardKey = key;
    try { // look for look-alikes made by hand on Twitch: we can't touch them, so tell you
      const ids = new Set(mine.map(r => r.id)), names = new Set(Object.keys(want || rewardWants()));
      const byHand = (await twitch.listAllRewards()).filter(r => !ids.has(r.id) && names.has(r.title.toLowerCase())).map(r => r.title);
      if (JSON.stringify(byHand) !== JSON.stringify(rewardsByHand)) { rewardsByHand = byHand; pushState(); }
    } catch {}
  } catch (e) { console.error('[rewards]', e.message); }
  finally { rewardBusy = false; }
}
setInterval(() => syncRewards().catch(() => {}), 15000); // follows the wheel / battle on stream
let lastOnAuto = false; setInterval(() => { const W = wheel.W(), on = /^auto/.test(W.last?.type || '') && W.round?.state !== 'ended' && !W.final; if (on !== lastOnAuto) { lastOnAuto = on; syncRewards().catch(() => {}); } }, 1500); // ⚡ the Respin reward hides quickly while the wheel sits on an auto spot
setInterval(() => { rewardKey = ''; }, 5 * 60000); // and double-checks Twitch every few minutes
setTimeout(() => { rewardKey = ''; syncRewards().catch(() => {}); }, 8000);

// ---------- chaos events from channel points / bits ----------
function triggerEvent(event, by, source) {
  if (!EVENTS[event]) return;
  const fx = { id: uid(), event, by, source, at: Date.now() };
  if ((live.phase === 'lobby' || live.phase === 'running') && !live.game?.cards) broadcast({ type: 'effect', effect: fx }, 'overlay');
  else { db.pendingEffects.push(fx); db.pendingEffects = db.pendingEffects.slice(-25); save(); broadcast({ type: 'queued', effect: fx }, 'overlay'); }
  pushState();
}

async function avatarFor(login) { if (!login) return null; const u = (await twitch.getUsers([login])).get(login.toLowerCase()); return proxied(u?.avatar); }

async function fetchWinnerRatings(f, rec, gameId) {
  try {
    const imdbId = f.details?.imdbId || (await tmdbMovie(f.tmdbId).catch(() => null))?.imdbId;
    const r = await getRatings({ tmdbId: f.tmdbId, imdbId });
    rec.winner.ratings = r; save(); historyVersion++;
    if (live.lastWinner?.id === f.id) live.lastWinner.ratings = r;
    broadcast({ type: 'ratings', gameId, id: f.id, ratings: r }, 'overlay'); pushState();
  } catch (e) { console.error('[ratings]', e.message); }
}
// winner goes into Twitch chat once the replay on screen is done (so chat doesn't spoil it)
function announceWinner(f, list) {
  if (db.settings.announceWinner === false || !twitch.canSay()) return;
  const name = `${f.label}${f.sub ? ` (${f.sub})` : ''}`;
  const by = f.owner && f.showOwner ? (list?.type === 'chat' ? '' : ` — picked by ${f.owner}`) : '';
  const msg = f.spot ? `🎟️ ${f.label} wins the Movie Royal — ${streamerName()}'s choice!`
    : list?.giveaway ? `🎉 @${f.ownerLogin || f.label} wins the giveaway${giveawaySettings().prize ? `: ${giveawaySettings().prize}` : ''}! Type in chat to claim it.`
    : list?.type === 'chat' ? `🏆 @${f.ownerLogin || f.label} wins the ${list.screenTitle || list.name}${f.series ? ` (best of ${f.series.bestOf})` : ''}!`
    : `🏆 ${list?.type === 'movies' || list?.type === 'films' ? 'Tonight’s movie' : 'Winner'}: ${name}${by}!`;
  const lk = Math.round((f.luck || 0) * 10) / 10, odds = Math.round((f.weight || 1) * 100) / 100;
  const luckNote = f.spot ? '' : lk > 0 ? ` 🍀 Won with ${lk}% luck!` : list?.type !== 'movies' && odds > 1 ? ` 🎲 Won with x${odds} odds!` : '';
  const wait = (db.settings.replayOn !== false ? 12 : 2) * 1000;
  setTimeout(() => twitch.say(msg + luckNote).catch(e => console.error('[twitch say]', e.message)), wait);
}
// "!moviesroyal": every Twitch chat command in one reply (30s cooldown so it can't be spammed)
let helpCd = 0;
// Twitch chat messages max out around 500 characters: long ones go out in a few parts
async function sayLong(text) {
  const parts = []; let cur = '';
  for (const bit of text.split(' · ')) { if (cur && (cur + ' · ' + bit).length > 450) { parts.push(cur); cur = bit; } else cur = cur ? cur + ' · ' + bit : bit; }
  if (cur) parts.push(cur);
  for (const p of parts) { await twitch.say(p).catch(() => {}); await new Promise(r => setTimeout(r, 1200)); }
}
function helpChatText(kind = live.view === 'cards' ? 'cards' : annKind()) { // 📋 the commands for what's going on: the tab you're on (Battle / Chat battle / Giveaway / Wheel / Card battles)
  const st = db.settings, parts = [], idc = st.idCommand || '!id';
  const idLine = st.idOn !== false ? `${idc} man / woman / none / remove (your battle character)` : null;
  if (kind === 'wheel') { const wc = wheel.W().cmd; parts.push(`${wc.respin} (use a saved respin)`, `${wc.spins} (how many respins you have)`); }
  else if (kind === 'giveaway') { if (giveawaySettings().command) parts.push(`${giveawaySettings().command} (enter the giveaway)`); parts.push(idLine); }
  else if (kind === 'chat') { parts.push(`${st.joinCommand || '!join'} (join the battle: your Twitch picture is your piece)`); if (st.colorsOn !== false) parts.push(st.colorMode === 'points' ? `color: redeem "${st.colorReward}" and type a color` : `${st.colorCommand || '!color'} <color> (your color)`); parts.push(idLine); parts.push('type 1-4 during a map vote'); }
  else if (kind === 'cards') parts.push('🃏 card battle: the packs fight it out, the last one standing gets opened!', idLine);
  else {
    parts.push(`${st.twitchMoviesCommand || '!mymovies'} (your movies, or add a name)`);
    if (st.callsOn !== false) parts.push(`${st.callCommand || '!call'} <movie> (call the winner before the fight: +${st.callLuck ?? 1}% luck if you're right)`);
    if (st.colorsOn !== false) parts.push(st.colorMode === 'points' ? `color: redeem "${st.colorReward}" and type a color` : `${st.colorCommand || '!color'} <color> (your ball color)`);
    parts.push(`${st.sitOutCommand || '!sitout'} (too late? your movies skip tonight's battles) · ${st.backCommand || '!imback'}`);
    parts.push(idLine); parts.push('your movie won? type anything in chat to claim it'); parts.push('type 1-4 during a map vote');
  }
  const tail = kind === 'battle' ? ' Pick movies in Discord with /suggest.' : '';
  const head = { wheel: '🎡 Wheel commands', chat: '🎲 Chat battle commands', giveaway: '🎁 Giveaway commands', cards: '🃏 Card battle', battle: '🍿 Movie Royal commands' }[kind] || '🍿 Movie Royal commands';
  return `${head}: ${parts.filter(Boolean).join(' · ')}.${tail}`;
}
function helpChatCommand(m) {
  const cmd = String(db.settings.helpCommand || '!moviesroyal').trim().toLowerCase(); if (!cmd) return;
  const first = m.text.toLowerCase().split(/\s+/)[0]; if (first !== cmd && first !== '!movieroyal') return;
  if (Date.now() - helpCd < 60000 || !twitch.canSay()) return; helpCd = Date.now(); // (1 minute between lists; switching tabs resets it: Derek)
  sayLong(helpChatText());
}
// !sitout / !imback: a viewer takes their movies out of tonight's battles (too late to watch) or puts them back
function sitOutChat(m) {
  const first = m.text.toLowerCase().split(/\s+/)[0], out = String(db.settings.sitOutCommand || '!sitout').toLowerCase(), back = String(db.settings.backCommand || '!imback').toLowerCase();
  if (first !== out && first !== back) return;
  const p = discordPeople().find(x => chatMatches({ ...x, login: x.twitch || null }, m)); if (!p) { if (twitch.canSay()) twitch.say(`@${m.name} I don't see any movies for you yet.`).catch(() => {}); return; }
  let n = 0;
  for (const e of getList('movies')?.entries || []) {
    if (e.kind === 'spot' || e.backers?.[0]?.discordId !== p.discordId) continue;
    if (first === out && e.status === 'active') { e.status = 'away'; e.awayDay = todayKey(); e.satOut = true; n++; }
    if (first === back && e.status === 'away') { e.status = 'active'; delete e.awayDay; delete e.satOut; n++; }
  }
  if (first === back) { const st = stream(); if (!st.active.includes(p.discordId)) st.active.push(p.discordId); }
  save(); pushState(); refreshPreview();
  broadcast({ type: 'toast', text: first === out ? `🛌 ${p.name} sat out tonight (${n} movie${n === 1 ? '' : 's'} off the cliff)` : `🙋 ${p.name} is back in (${n} movie${n === 1 ? '' : 's'})` }, 'control');
  if (twitch.canSay()) twitch.say(first === out ? `@${m.name} 🛌 your movies sit out the rest of tonight's battles. Type ${back} if you change your mind!` : `@${m.name} 🙋 your movies are back in the battle!`).catch(() => {});
}
const chatCooldown = new Map();
async function moviesChatCommand(m) {
  const cmd = (db.settings.twitchMoviesCommand || '!mymovies').toLowerCase();
  if (m.text.toLowerCase().split(/\s+/)[0] !== cmd) return;
  const cd = Math.max(0, Number(db.settings.twitchCooldown ?? 30)) * 1000;
  if (Date.now() - (chatCooldown.get(m.login) || 0) < cd) return; // per-person cooldown
  chatCooldown.set(m.login, Date.now());
  const arg = m.text.trim().split(/\s+/)[1];
  let text;
  if (arg && norm(arg) !== norm(m.name) && norm(arg) !== norm(m.login)) { // "!mymovies lucy" -> Lucy's movies
    const o = discord.findPerson(arg);
    text = o ? `@${m.name} ${discord.othersText(o, true)}` : `@${m.name} I couldn't find anyone called ${arg.replace(/^@/, '')} with movies.`;
  } else {
    const p = discordPeople().find(x => chatMatches({ ...x, login: x.twitch || null }, m));
    text = p ? `@${m.name} ${discord.myMoviesText(p.discordId, true)}` : `@${m.name} I don't see any movies for you yet — use /suggest in Discord, then /linktwitch ${m.login} so I know it's you!`;
  }
  try { await twitch.say(text); } catch (e) { console.error('[twitch say]', e.message); broadcast({ type: 'toast', text: `Couldn't reply in Twitch chat: ${e.message}` }, 'control'); }
}
const twitchHandlers = {
  change: pushState,
  live(isLive) {
    if (!!db.live === !!isLive) return;
    if (!isLive && db.live) announceOff(); // 📣 the stream ended: hourly chat messages stop
    db.live = !!isLive; rewardKey = ''; setTimeout(() => syncRewards().catch(() => {}), 500); if (isLive) { stream().movies = 0; stream().tonight = []; delete stream().spotPending; stream().raidUsed = false; live.raid = null; stream().startedAt = Date.now(); wheel.newStream(); } // new stream: movie count starts over
    cloud.sync(true); // lock / unlock swaps on the 24/7 bot right away
    if (lockMode() === 'live' && !db.picksClosed && db.settings.announcePicks !== false) discord.notify(isLive ? '🔒 **Movie picks are closed** while the stream is live. They open again when it ends.' : '🍿 **Movie picks are open again!** Use `/suggest` to add yours.').catch(() => {});
    save(); pushState();
    if (lockMode() === 'live') broadcast({ type: 'toast', text: isLive ? '🔴 You went live — Discord picks and swaps are now locked.' : '⚫ Stream ended — Discord picks and swaps are open again.' }, 'control');
    discord.refreshPinned?.();
  },
  async redeem(r) {
    const mode = (db.rewardModes || {})[String(r.title || '').toLowerCase()];
    if (mode === 'off') return; // ⏸ paused by you (it's hidden on Twitch too)
    if (mode === 'once') { db.rewardModes[r.title.toLowerCase()] = 'off'; save(); rewardKey = ''; setTimeout(() => syncRewards().catch(() => {}), 300); pushState(); } // used once: off until you turn it on again
    if (mode === 'count') { const t = r.title.toLowerCase(); if (countLeft(t) <= 0) return; const st = stream(); (st.rewardUses ||= {})[t] = (st.rewardUses[t] || 0) + 1; save(); if (countLeft(t) <= 0) { rewardKey = ''; setTimeout(() => syncRewards().catch(() => {}), 300); } pushState(); } // 🔢 one less this stream (none left = off until the next stream)
    return this.redeemNow(r);
  },
  async redeemNow(r) {
    if (db.settings.raidOn !== false && db.settings.raidTitle && r.title.toLowerCase() === db.settings.raidTitle.toLowerCase()) return raidRedeem(r); // 🚀
    { const k = vrKind(r.title); if (k) return vrRedeem(k, r); } // 💧🙆🎩🎉 viewer rewards
    if (wheel.wheelRedeem(r)) return; // 🎡 wheel respin / move up / move down
    if (db.settings.colorReward && r.title.toLowerCase() === db.settings.colorReward.toLowerCase()) { if (db.settings.colorMode === 'points') setColor(r.login, r.input); return; }
    if (db.settings.pointsOn === false) return; // channel point chaos switched off
    const pw = Object.entries(db.settings.powerRewards || {}).find(([t]) => t.toLowerCase() === r.title.toLowerCase());
    if (pw) return powerUp(r, pw[1]); // 🎉 chat battle power-up for their own ball
    const entry = Object.entries(db.settings.rewards).find(([t]) => t.toLowerCase() === r.title.toLowerCase());
    if (!entry) return;
    triggerEvent(entry[1], { name: r.name, avatar: await avatarFor(r.login) }, 'points');
  },
  sub(sb) { if (db.moneyPaused?.wheelSubs) return; try { wheel.onSub(sb); } catch (e) { console.error('[wheel sub]', e.message); } },
  async cheer(c) {
    if (!db.moneyPaused?.wheelBits) { try { wheel.onBits(c); } catch (e) { console.error('[wheel bits]', e.message); } }
    if (db.settings.bitsOn === false) return; // bits chaos switched off
    const tiers = Object.entries(db.settings.bits).map(([b, e]) => [Number(b), e]).filter(([b]) => c.bits >= b && !db.moneyPaused?.bits?.[b]).sort((a, b) => b[0] - a[0]); // (⏸ paused amounts skipped)
    if (!tiers.length) return;
    triggerEvent(tiers[0][1], { name: c.name, avatar: await avatarFor(c.login), bits: c.bits }, 'bits');
  },
  alert(a) { try { chatlog.onAlert(a); } catch (e) { console.error('[alert]', e.message); } },
  clear(c) { try { chatlog.onClear(c); } catch {} },
  async chat(m) {
    if (m.self) return; // 🤖 Movie Royal's own chat bot talking: not a viewer
    try { chatlog.onChat(m); } catch (e) { console.error('[chatlog]', e.message); }
    const newFace = !live.chatLog.some(x => x.login === m.login && Date.now() - x.at < 5 * 60000);
    live.chatLog.push({ ...m, at: Date.now() }); live.chatLog = live.chatLog.slice(-300);
    if (raidChat(m)) return; // 🚀 the raid picker typing who to raid
    if (idChat(m)) return; // 🧍 !id man / woman / none / remove
    if (hatChat(m)) return; // 🎩 picking a hat
    wheel.wheelChat(m); // 🎡 !respin / !spins
    moviesChatCommand(m); sitOutChat(m); chatVote(m); chatColor(m); if (!boardVote(m)) chatCall(m); helpChatCommand(m); giveawayChat(m);
    if (newFace) pushState(); // keeps "Recent chatters" in the control panel up to date
    if (live.rollcall && !live.rollcall.done) {
      const p = live.rollcall.people.find(x => !x.here && chatMatches(x, m));
      if (p) checkIn(p);
    } else activateFromChat(m);
    // claim pop-up: show chat, stop when the winner talks
    if (live.claim && !live.claim.done) {
      const isWinner = isWinnerMsg(live.claim.winner, m);
      broadcast({ type: 'chat', msg: { name: m.name, text: m.text, winner: isWinner, emotes: m.emotes || '', color: m.color || null } }, 'overlay');
      if (isWinner && !live.claim.waiting) { if (db.settings.claimApprove !== false) claimWait(m); else finishClaim(true, m.text); }
      else if (isWinner && live.claim.waiting) claimAnswer(m); // !accept / !pass
    } else if (!live.claim && live.phase === 'ended' && live.lastWinner && !live.lastWinner.spot && isWinnerMsg(live.lastWinner, m)) {
      autoClaim(m.text, m); // winner spoke up before the claim timer was even started
    }
    // "!join" lists
    const list = getList(db.activeListId);
    const cmd = (db.settings.joinCommand || '!join').toLowerCase();
    if (list?.type === 'chat' && !list.giveaway && list.joinOpen && m.text.toLowerCase().split(/\s+/)[0] === cmd) {
      if (list.entries.some(e => e.status === 'active' && e.twitch === m.login)) return;
      const e = addEntry(list, { label: m.name, twitch: m.login }); e.joined = true; // came from chat, so the winner screen shows their name
      save(); pushState();
      fillTwitchAvatars(list);
      broadcast({ type: 'joined', name: e.label }, 'overlay');
    }
  }
};

const isWinnerMsg = (w, m) => !!w && ((w.ownerLogin && m.login === w.ownerLogin.toLowerCase()) || (w.owner && norm(w.owner) === norm(m.name)));
// 📌 a claimed movie gets pinned at the top of Twitch chat
// 📌 tonight's movies, written out for the Twitch pin: "#1 Heat (1995) — Lucy's movie"
const movieLine = x => `#${x.n} ${x.label}${x.sub ? ` (${x.sub})` : ''}${x.viaSpot ? ` — 🎟️ ${x.owner || db.settings.spotName || 'Kirb'}'s pick (wild spot)` : x.owner ? ` — ${x.owner}'s movie` : ''}`;
function pinText(head, n, tonight = stream().tonight) {
  const earlier = (tonight || []).filter(x => x.n < n && !x.text); // (text entries are left out: Derek pins those himself) // the movies watched before this one tonight
  const add = earlier.length ? ` ⏪ Earlier tonight: ${earlier.map(movieLine).join(' · ')}` : '';
  return (head + add).length > 480 ? (head + add).slice(0, 477) + '…' : head + add;
}
function pinSay(text) {
  live.lastPin = { text, at: Date.now() }; discord.refreshPinned?.(); // (the pinned Discord message lists tonight's movies too)
  twitch.sayAndPin(text).catch(e => broadcast({ type: 'toast', text: `📌 Couldn't pin the movie in chat: ${e.message}` }, 'control'));
}
function pinWinner(w) {
  if (!w || w.test || db.settings.pinWinner === false || !twitch.status.canChat) return; // (test battles never pin)
  if (!(w.kind === 'movies' || w.tmdbId) || w.spot || w.viaSpot) return; // (wild spots + the Kirb spot battle's winner are pinned right at the win)
  const n = stream().movies || 1;
  pinSay(pinText(`📌🍿 Movie #${n} of tonight's stream: ${w.label}${w.sub ? ` (${w.sub})` : ''}${w.owner ? ` — ${w.owner}'s movie` : ''}`, n));
}
// 🎟️ the Kirb spot battle's winner = the movie (a text entry isn't pinned: Derek pins those himself)
function pinSpotMovie(t) {
  if (db.settings.pinWinner === false || !twitch.status.canChat) return;
  const who = t.owner || db.settings.spotName || 'Kirb';
  pinSay(pinText(`📌🍿 Movie #${t.n} of tonight's stream: ${t.label}${t.sub ? ` (${t.sub})` : ''} — 🎟️ ${who}'s pick (a wild spot won, then this won the ${who} spot battle)`, t.n));
}
// the winner typed in chat: the timer stops and you decide (✅ accept or ⏭️ pass)
function claimWait(m, instant = false) {
  const c = live.claim; clearTimeout(c.timer);
  c.waiting = { text: m.text, name: m.name, at: Date.now() }; c.instant = instant;
  broadcast({ type: 'claimWaiting', winner: c.winner, name: m.name, text: m.text, streamer: streamerName(), accept: claimCmds().accept, pass: claimCmds().pass }, 'overlay');
  broadcast({ type: 'toast', text: `✋ ${m.name} is here! Movie Royal asked them in chat: ${claimCmds().accept} or ${claimCmds().pass}. (You can also press ✅ Accept / ⏭️ Pass on the winner card.)` }, 'control');
  pushState();
  if (claimAnswer(m, true)) return; // their first message already typed !accept / !pass
  const w = c.winner, label = `${w?.label || 'Your movie'}${w?.sub ? ` (${w.sub})` : ''}`;
  const ask = `@${m.name} 🍿 ${label} won! Type ${claimCmds().accept} to watch it now, or ${claimCmds().pass} to save it for another night (you keep your luck).`;
  c.asked = Date.now();
  if (!twitch.canSay()) { broadcast({ type: 'toast', text: `⚠️ Movie Royal couldn't ask ${m.name} in chat (not signed in to Twitch chat). Press ✅ Accept or ⏭️ Pass on the winner card.` }, 'control'); return; }
  twitch.say(ask).catch(e => { console.error('[claim] couldn\'t ask the winner in chat:', e.message); broadcast({ type: 'toast', text: `⚠️ Couldn't ask ${m.name} in chat: ${e.message}. Press ✅ Accept or ⏭️ Pass on the winner card.` }, 'control'); });
}
const claimCmds = () => ({ accept: db.settings.acceptCommand || '!accept', pass: db.settings.passCommand || '!pass' });
// the winner answers in chat: !accept / !pass (or yes / no)
// (the message that made them the claimer only counts if it's the exact command: a happy "YES!" when their movie wins
//  isn't an answer, because they haven't been asked yet — 1.49.1, Derek: it was claimed without asking)
function claimAnswer(m, firstMsg = false) {
  const c = live.claim; if (!c?.waiting || c.done || !isWinnerMsg(c.winner, m)) return false;
  const t = String(m.text || '').trim().toLowerCase(), first = t.split(/\s+/)[0], k = claimCmds();
  const words = !firstMsg && !!c.asked;
  const yes = first === k.accept.toLowerCase() || (words && /^(accept|yes|yep|yeah|y|approve|watch|watch it)$/.test(t.replace(/[!.]/g, '')));
  const no = first === k.pass.toLowerCase() || (words && /^(pass|no|nope|n|skip|later|not tonight)$/.test(t.replace(/[!.]/g, '')));
  if (yes === no) return false;
  if (yes) { acceptClaim(m.name); if (twitch.canSay()) twitch.say(`@${m.name} ✅ Locked in! Enjoy the movie 🍿`).catch(() => {}); }
  else { passClaim(m.name); if (twitch.canSay()) twitch.say(`@${m.name} ⏭️ No problem! Your movie goes back in the battle and keeps its luck.`).catch(() => {}); }
  return true;
}
function autoClaim(text, m) {
  const w = live.lastWinner;
  if (db.settings.claimApprove !== false && m) { live.claim = { winner: w, claimed: false, done: false }; claimWait(m, true); return; }
  pinWinner(w);
  live.claim = { winner: w, claimed: true, done: true, instant: true };
  const h = findHistory(w?.historyId); if (h) { h.claimed = 'instant'; historyVersion++; save(); }
  db.noShowStreak = 0; save();
  broadcast({ type: 'claimedDirect', winner: w, text: text || '' }, 'overlay');
  pushState();
}

// ---------- roll call: after no-shows, everyone with a movie has to type in chat ----------
const todayKey = () => new Date().toDateString();
function rollcallPeople() {
  const by = new Map();
  for (const e of getList('movies')?.entries || []) {
    if (e.status !== 'active' || e.kind === 'spot' || !e.backers?.[0]) continue;
    const b = e.backers[0];
    let p = by.get(b.discordId);
    if (!p) { p = { key: b.discordId, name: b.name, login: db.links[b.discordId] || null, avatar: b.avatar || null, entries: [], here: false }; by.set(b.discordId, p); }
    p.entries.push(e.id);
  }
  return [...by.values()].sort((a, b) => a.name.localeCompare(b.name));
}
function checkIn(p) {
  p.here = true;
  broadcast({ type: 'rollcallUpdate', key: p.key, here: true, count: live.rollcall.people.filter(x => x.here).length }, 'overlay');
  pushState();
  if (live.rollcall.people.every(x => x.here)) endRollcall(); // everyone showed up
}
function endRollcall() {
  const rc = live.rollcall; if (!rc || rc.done) return;
  clearTimeout(rc.timer); rc.done = true;
  const here = rc.people.filter(p => p.here), away = rc.people.filter(p => !p.here);
  // reset the list: only people who typed during the roll call stay on the cliff
  stream().active = here.map(p => p.key);
  const removed = away.reduce((n, p) => n + p.entries.length, 0);
  rc.removed = removed; rc.awayNames = away.map(p => p.name);
  db.noShowStreak = 0; save();
  broadcast({ type: 'rollcallEnd', removed, away: rc.awayNames, here: rc.people.filter(p => p.here).length }, 'overlay');
  pushState(); refreshPreview();
}
// ---------- active chatters: Discord movies only go on the cliff once their person chats this stream ----------
// 🔢 "countdown" reward rule: it can be used N times per stream, then it's off until the next stream
const countMax = t => Math.max(1, Math.round(Number(db.rewardCounts?.[t]) || 3));
const countLeft = t => countMax(t) - (stream().rewardUses?.[t] || 0);
function stream() {
  const day = todayKey();
  if (!db.stream || db.stream.day !== day) { db.stream = { day, active: [] }; save(); } // new day = new stream
  return db.stream;
}
const activeSet = () => new Set(stream().active);
const chatMatches = (p, m) => (p.login && p.login === m.login) || norm(p.name) === norm(m.name) || (p.login && norm(p.login) === norm(m.name));
function discordPeopleWithMovies() {
  const by = new Map();
  for (const e of getList('movies')?.entries || []) {
    if (e.status !== 'active' || e.kind === 'spot' || !e.backers?.[0]) continue;
    const b = e.backers[0];
    if (!by.has(b.discordId)) by.set(b.discordId, { key: b.discordId, name: b.name, login: db.links[b.discordId] || null });
  }
  return [...by.values()];
}
function activateFromChat(m) {
  if (db.settings.chatGate === false) return;
  const st = stream(), on = new Set(st.active);
  const ps = discordPeopleWithMovies().filter(x => !on.has(x.key) && chatMatches(x, m));
  if (!ps.length) return;
  for (const x of ps) st.active.push(x.key); save(); const p = ps[0];
  if (db.activeListId === 'movies') broadcast({ type: 'joined', name: `${p.name}'s movies` }, 'overlay');
  broadcast({ type: 'toast', text: `💬 ${p.name} is chatting — their movies are on the cliff${live.phase === 'ended' ? ' (shows after Next round)' : ''}` }, 'control');
  pushState(); refreshPreview(); if (live.board) sendBoard();
}
// 🎡 names for the Wheel tab's "who's spinning" / "give spins" boxes: people who chatted most recently first, no bots
const BOT_NAMES = ['nightbot', 'streamelements', 'streamlabs', 'moobot', 'fossabot', 'wizebot', 'soundalerts', 'sery_bot', 'kofistreambot', 'botrixoficial', 'commanderroot', 'streamstickers', 'pokemoncommunitygame', 'blerp', 'own3d', 'lumiastream', 'tangiabot', 'frostytoolsdotcom'];
function isChatBot(login) {
  login = String(login || '').toLowerCase(); if (!login) return true;
  const extra = String(giveawaySettings?.().bots || '').toLowerCase().split(/[\s,]+/).filter(Boolean);
  return BOT_NAMES.includes(login) || extra.includes(login) || login === String(db.twitchBot?.login || '').toLowerCase(); // only KNOWN bots (Derek: a real person can have "bot" in their name)
}
function chattersForWheel() { const seen = new Set(), out = []; for (const m of [...live.chatLog].reverse()) { const k = String(m.login || '').toLowerCase(); if (!k || seen.has(k) || isChatBot(k)) continue; seen.add(k); out.push(m.name || m.login); if (out.length >= 40) break; } return out; }
function recentChatters() {
  const cutoff = Date.now() - 30 * 60000, seen = new Map();
  for (const m of [...live.chatLog].reverse()) { if (m.at < cutoff || seen.has(m.login)) continue; seen.set(m.login, m); if (seen.size >= 15) break; }
  const people = discordPeople();
  return [...seen.values()].map(m => { const p = people.find(x => chatMatches({ ...x, login: x.twitch || null }, m)); return { login: m.login, name: m.name, person: p ? p.name : null, personId: p?.discordId || null }; });
}
function restoreAway(onlyOld = false) {
  let n = 0;
  for (const e of getList('movies')?.entries || []) if (e.status === 'away' && (!onlyOld || e.awayDay !== todayKey())) { e.status = 'active'; delete e.awayDay; n++; }
  if (n) save();
  return n;
}

function finishClaim(claimed, text) {
  if (!live.claim) return;
  clearTimeout(live.claim.timer);
  live.claim.claimed = claimed;
  live.claim.done = true; delete live.claim.waiting;
  if (claimed) pinWinner(live.claim.winner);
  const h = findHistory(live.claim.winner?.historyId); if (h) { h.claimed = claimed; historyVersion++; save(); }
  if (live.claim.winner?.kind === 'movies' && !live.claim.winner.test) db.noShowStreak = claimed ? 0 : (db.noShowStreak || 0) + 1;
  save();
  broadcast({ type: claimed ? 'claimed' : 'claimExpired', text: text || '' }, 'overlay');
  pushState();
}

// ---------- websocket ----------
wss.on('connection', (ws, req) => {
  ws.role = new URL(req.url, 'http://x').searchParams.get('role') || 'control';
  if (!isLocal(req)) return ws.close(4001, 'local only');
  if (ws.role === 'control') ws.send(JSON.stringify({ type: 'state', state: publicState() }));
  if (ws.role === 'celebrate') ws.send(JSON.stringify(audioMsg()));
  if (ws.role === 'overlay') { ws.send(JSON.stringify(cards.sceneMsg())); if (live.board) ws.send(JSON.stringify({ type: 'gatherBoard', board: { rows: boardRows(), bonus: db.settings.callsOn === false ? 0 : Number(db.settings.callLuck ?? 1), endsAt: live.gather?.endsAt || 0, open: true } })); if (live.phase === 'ended' && !live.claim && !new URL(req.url, 'http://x').searchParams.get('side')) leaveEnded(); /* a popped-out wheel window doesn't count */ ws.send(JSON.stringify(wheel.wheelMsg())); ws.send(JSON.stringify(audioMsg())); ws.send(JSON.stringify(camMsg())); ws.send(JSON.stringify(gfxMsg())); refreshPreview(true); if (live.gather) setTimeout(() => ws.send(JSON.stringify({ type: 'gather', endsAt: live.gather?.endsAt })), 500); }
  pushState();
  ws.on('close', pushState);
  ws.on('message', raw => {
    let m; try { m = JSON.parse(raw); } catch { return; }
    if (ws.role !== 'overlay') return;
    if (m.type === 'overlayError') { const t = `${m.msg} ${m.where || ''} (${m.phase || ''})`; console.error('[game screen]', t); live.overlayErrors = [{ at: Date.now(), text: t }, ...(live.overlayErrors || [])].slice(0, 10); broadcast({ type: 'toast', text: `⚠️ Game screen problem: ${String(m.msg).slice(0, 120)}` }, 'control'); return; }
    if (m.type === 'cliff') { // a game screen checking in: between battles it must show the same pieces as the app
      const ok = live.phase !== 'idle' || !lastPreview || ((m.phase === 'idle' || m.phase === 'waiting') && m.key === lastPreview.key) || (!lastPreview.fighters.length && !lastPreview.chatGate);
      ws.badCliff = ok ? 0 : (ws.badCliff || 0) + 1;
      if (ws.badCliff >= 2) { ws.badCliff = 0; console.log('[cliff] a game screen was out of step, sending the pieces again'); ws.send(JSON.stringify({ ...lastPreview, heal: true })); }
      return;
    }
    if (m.type === 'cardResult') { cards.result(m); return; } // 🃏 a card battle has its winner
    if (m.type === 'phase' && live.game && m.gameId === live.game.id) { live.phase = m.phase; live.phaseAt = Date.now(); if (m.phase === 'running' && live.board) closeBoard(); pushState(); } // (the vote list goes away when the fight starts)
    if (m.type === 'result' && live.game && m.gameId === live.game.id && !live.game.done) {
      live.game.done = true; live.phase = 'ended'; live.phaseAt = Date.now();
      const f = live.game.fighters.find(x => x.id === m.winnerId);
      if (!f) return;
      if (live.game.cards) { live.lastWinner = { ...f, at: Date.now(), cards: true, gameId: live.game.id, listName: live.game.testName || '🃏 Card battle' }; try { markMapRun(live.game.map); } catch {} cards.result({ fightId: live.game.cards, winnerId: f.id, order: m.order }); save(); pushState(); return; } // 🃏 a card battle on a ball map
      if (live.game.test) { try { recordRound({ game: live.game, list: null, m, startedAt: live.game.startedAt, test: true }); } catch {} live.lastWinner = { ...f, listName: live.game.testName || 'Practice round', at: Date.now(), test: true, gameId: live.game.id }; pushState(); battleDoneForWheel(); return; } // practice rounds never touch real lists or history
      const list = getList(live.game.listId);
      try { recordRound({ game: live.game, list, m, startedAt: live.game.startedAt }); } catch (e) { console.error('[stats]', e.message); }
      markMapRun(live.game.map); // full results + lifetime stats (every round, series rounds too)
      // best of 3/5/7/9 (custom battles, chat battles, giveaways): first to win enough rounds takes it
      let seriesInfo = null;
      if (list && list.type !== 'movies' && (Number(list.bestOf) || 1) > 1) {
        const bo = Number(list.bestOf), need = Math.ceil(bo / 2);
        let sr = live.series; if (!sr || sr.listId !== list.id || sr.done || sr.bestOf !== bo) sr = live.series = { listId: list.id, bestOf: bo, need, wins: {}, names: {}, round: 0 };
        sr.round++; (sr.games ||= []).push(live.game.id); sr.wins[f.id] = (sr.wins[f.id] || 0) + 1; sr.names[f.id] = f.label;
        const tally = Object.entries(sr.wins).sort((a, b) => b[1] - a[1]).map(([id, n]) => ({ id, label: sr.names[id], n }));
        seriesInfo = { round: sr.round, bestOf: bo, need, tally, done: sr.wins[f.id] >= need };
        broadcast({ type: 'series', gameId: live.game.id, series: seriesInfo, winnerId: f.id }, 'overlay');
        if (!seriesInfo.done) {
          live.lastWinner = { ...f, listId: list.id, listName: list.name, at: Date.now(), series: seriesInfo, interim: true, gameId: live.game.id };
          if (twitch.canSay() && db.settings.announceWinner !== false) setTimeout(() => twitch.say(`🥊 Round ${sr.round} goes to ${f.ownerLogin && f.showOwner ? '@' + f.ownerLogin : f.label}! (${tally.slice(0, 3).map(x => `${x.label} ${x.n}`).join(' · ')} — first to ${need})`).catch(() => {}), (db.settings.replayOn !== false ? 12 : 2) * 1000);
          if (db.settings.seriesAuto === true) setTimeout(nextSeriesRound, (db.settings.replayOn !== false ? 19 : 8) * 1000);
          save(); pushState(); return;
        }
        sr.done = true;
      }
      const byId = new Map(live.game.fighters.map(x => [x.id, x]));
      const order = (Array.isArray(m.order) ? m.order : [f.id]).filter(id => byId.has(id));
      const totalW = live.game.fighters.reduce((a, x) => a + (x.weight || 1), 0) || 1;
      const slim = x => ({ label: x.label, sub: x.sub, owner: x.owner, image: x.image, poster: x.poster });
      const rec = {
        id: uid(), listId: list?.id, listName: list?.name, kind: list?.type, at: Date.now(),
        winner: { ...slim(f), id: f.id, details: f.details || null, odds: (f.weight || 1) / totalW, luck: f.luck || 0 },
        entrants: live.game.fighters.length, total: live.game.total,
        top: order.slice(0, 5).map(id => slim(byId.get(id))),
        events: (Array.isArray(m.events) ? m.events : []).slice(0, 40).map(e => ({ event: String(e.event), by: String(e.by || '').slice(0, 40) })),
        claimed: null, outcome: null, gameId: live.game.id, map: live.game.map, rounds: live.series?.listId === list?.id && live.series?.games?.length > 1 ? live.series.games.slice() : undefined
      };
      db.history.push(rec); db.history = db.history.slice(-1000); historyVersion++;
      live.lastWinner = { ...f, listId: list?.id, listName: list?.name, at: Date.now(), historyId: rec.id, gameId: live.game.id };
      battleDoneForWheel();
      if (seriesInfo) { live.lastWinner.series = seriesInfo; rec.series = seriesInfo; f.series = seriesInfo; }
      if (list?.giveaway) { db.giveawayWinners ||= []; db.giveawayWinners.push({ login: f.ownerLogin || norm(f.label), name: f.label, prize: giveawaySettings().prize || giveawaySettings().title, at: Date.now() }); db.giveawayWinners = db.giveawayWinners.slice(-500); if (giveawaySettings().removeWinner) { const we = list.entries.find(x => x.id === f.id); if (we) we.status = 'out'; } }
      if (list?.type === 'chat') for (const x of list.entries) delete x.powers; // power-ups last one battle
      announceWinner(f, list);
      { const c = resolveCalls(f, list); if (c) { live.lastWinner.calls = { total: c.total, right: c.right.length, names: c.right.slice(0, 8).map(o => o.name) }; rec.calls = live.lastWinner.calls; } }
      if (list?.type === 'movies' && !live.game.test) { // movie # of the night (+ tonight's list for the pinned messages)
        if (f.spot) { stream().spotPending = { at: Date.now(), label: f.label, gameId: live.game.id }; } // a wild spot won: no movie yet and nothing pinned (Derek's wish): the Kirb spot battle picks it
        else { delete stream().spotPending; stream().movies = (stream().movies || 0) + 1; stream().tonight = [...(stream().tonight || []), { id: f.id, label: f.label, sub: f.sub || '', owner: f.owner || '', n: stream().movies }]; }
        discord.refreshPinned?.();
      } else if (stream().spotPending && !live.game.test && list && !['chat'].includes(list.type) && !list.giveaway) { // 🎟️ the Kirb spot battle: its winner is the movie we watch
        delete stream().spotPending; stream().movies = (stream().movies || 0) + 1;
        const t = { id: f.id, listId: list.id, label: f.label, sub: f.sub || '', owner: db.settings.spotName || 'Kirb', viaSpot: true, n: stream().movies };
        stream().tonight = [...(stream().tonight || []), t];
        f.viaSpot = true; live.lastWinner.viaSpot = true; live.lastWinner.movieNo = t.n; rec.viaSpot = true;
        if (f.tmdbId) pinSpotMovie(t); else { t.text = true; discord.refreshPinned?.(); }
      }
      if (list?.type === 'movies') addLuck(live.game.fighters.filter(x => x.id !== f.id).map(x => x.id), `${stream().day}:${stream().startedAt || ''}`); // everyone who lost gets a little luckier
      if ((list?.type === 'movies' || list?.type === 'films') && f.tmdbId && !f.spot) fetchWinnerRatings(f, rec, live.game.id);
      if (list?.type === 'movies') { const r = afterMovieWin(f.id); live.lastWinner.benched = r.benched; live.lastWinner.spotsRemoved = r.spotsRemoved; rec.benched = r.benched; rec.spotsRemoved = r.spotsRemoved; if (!f.spot) rec.outcome = 'watched'; }
      save(); pushState();
    }
  });
});

const camMsg = () => ({ type: 'camera', base: clampN(db.settings.cliffSize, 60, 250, 130) / 100, auto: db.settings.autoCamera !== false, replay: db.settings.replayOn !== false });
const clampN = (v, a, b, d) => { const n = Number(v); return Number.isFinite(n) ? Math.max(a, Math.min(b, n)) : d; };
// 🖥️ graphics (Settings → Graphics): resolution, frame rate cap, quality, FPS counter — for every game screen (OBS, the app, pop-outs)
const gfxMsg = () => ({ type: 'gfx', res: String(db.settings.gfxRes || '1080'), fps: Number(db.settings.gfxFps) || 0, quality: ['low', 'medium', 'high'].includes(db.settings.gfxQuality) ? db.settings.gfxQuality : 'high', showFps: !!db.settings.gfxShowFps, appSaver: db.settings.gfxAppSaver !== false, scale: clampN(db.settings.gfxScale, 50, 200, 100), glow: db.settings.gfxGlow !== false, particles: ['few', 'lots'].includes(db.settings.gfxParticles) ? db.settings.gfxParticles : 'auto', shake: clampN(db.settings.gfxShake, 0, 200, 100), flash: db.settings.gfxFlash !== false, smooth: db.settings.gfxSmooth !== false });
const audioMsg = () => ({ type: 'audio', on: db.settings.soundOn !== false, sfx: Number(db.settings.sfxVolume ?? 70) / 100, music: Number(db.settings.musicVolume ?? 35) / 100 });

// ---------- http ----------
app.use(express.json({ limit: '50mb' }));

// ---------- account: sign in with Twitch (optional) ----------
// Everything is saved automatically in the data folder whether or not you sign in.
// Signing in connects your Twitch account: your name/picture, channel points, bits and chat.
// The app only answers your own computer.
const LOCAL = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);
const isLocal = req => process.env.ALLOW_LAN || LOCAL.has(req.socket.remoteAddress);
app.use((req, res, next) => isLocal(req) ? next() : res.status(403).send('Movie Royal only runs on this computer.'));
const pendingStates = new Map();
app.get('/api/login-info', (req, res) => res.json({
  ready: !!(db.settings.twitchClientId && db.settings.twitchClientSecret), port: PORT,
  owner: db.owner ? { name: db.owner.name, avatar: db.owner.avatar } : null
}));
app.post('/api/setup', (req, res) => {
  const id = String(req.body?.twitchClientId || '').trim(), secret = String(req.body?.twitchClientSecret || '').trim();
  if (!id || !secret) return res.status(400).json({ error: 'Paste both the Client ID and the Client Secret.' });
  db.settings.twitchClientId = id; db.settings.twitchClientSecret = secret; save();
  res.json({ ok: true });
});
app.get('/auth/twitch', (req, res) => {
  if (!db.settings.twitchClientId || !db.settings.twitchClientSecret) return res.redirect('/login.html');
  const state = crypto.randomBytes(16).toString('hex');
  pendingStates.set(state, Date.now());
  for (const [k, t] of pendingStates) if (Date.now() - t > 600000) pendingStates.delete(k);
  res.redirect(twitch.authUrl(PORT, state));
});
const botStates = new Map(); // 🤖 sign-ins for the chat bot account
app.get('/auth/twitch-bot', (req, res) => {
  if (!db.settings.twitchClientId || !db.settings.twitchClientSecret) return res.redirect('/login.html');
  const state = 'bot' + crypto.randomBytes(16).toString('hex'); botStates.set(state, Date.now());
  res.redirect(twitch.botAuthUrl(PORT, state));
});
app.post('/api/twitch-bot/off', (req, res) => { db.twitchBot = null; save(); pushState(); res.json({ ok: true }); });
app.post('/api/twitch-bot/test', async (req, res) => { try { await twitch.say(`🤖 ${db.twitchBot?.user?.name || 'Movie Royal'} here! Movie Royal's chat messages come from me now. Type ${db.settings.helpCommand || '!moviesroyal'} to see the commands.`); res.json({ ok: true, as: twitch.botOn() && !twitch.botStatus.error ? db.twitchBot.user.name : (db.owner?.name || 'you'), error: twitch.botStatus.error }); } catch (e) { res.status(400).json({ error: e.message }); } });
app.get('/twitch/callback', async (req, res) => {
  const fail = msg => res.redirect('/login.html?error=' + encodeURIComponent(msg));
  if (req.query.error) return fail('Twitch sign-in was cancelled.');
  const state = String(req.query.state || '');
  if (botStates.has(state)) { // 🤖 the chat bot account signed in
    botStates.delete(state);
    try {
      const { user, tokens } = await twitch.signIn(String(req.query.code || ''), PORT);
      if (db.owner && db.owner.id === user.id) return res.send(donePage('That was your own account', 'To use a chat bot, sign in with the bot account (for example MoviesRoyalBot), not your streaming account. On the Twitch page, press “Not you?” and log in as the bot. Then try again from Movie Royal.'));
      db.twitchBot = { user, tokens, at: Date.now() }; twitch.botStatus.error = null; save(); pushState();
      return res.send(donePage(`🤖 ${user.name} is your chat bot!`, `Movie Royal's chat messages now come from ${user.name}. Tip: type /mod ${user.login} in your Twitch chat so it never gets slowed down. You can close this tab.`));
    } catch (e) { return fail('Bot sign-in failed: ' + e.message); }
  }
  if (!pendingStates.has(state)) return fail('That sign-in link expired. Try again.');
  pendingStates.delete(state);
  try {
    const { user, tokens } = await twitch.signIn(String(req.query.code || ''), PORT);
    if (db.owner && db.owner.id !== user.id) db.settings.twitchChannel = user.login; // switched accounts
    db.owner = user;
    twitch.useTokens(tokens); // the same sign-in powers channel points, bits and chat
    if (!db.settings.twitchChannel) db.settings.twitchChannel = user.login;
    save();
    twitch.start(twitchHandlers); pushState();
    if (DESKTOP) return res.send(donePage(`Signed in as ${user.name}!`, 'You can close this tab and go back to Movie Royal.'));
    res.redirect('/control.html?twitch=ok');
  } catch (e) { fail('Twitch sign-in failed: ' + e.message); }
});
app.post('/auth/logout', (req, res) => { db.owner = null; db.twitchToken = null; save(); twitch.start(twitchHandlers); pushState(); res.json({ ok: true }); });

// backup / restore everything (lists, odds, history, settings, Discord picks)
const stamp = () => { const d = new Date(), p = n => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}-${p(d.getMinutes())}`; };
// a dated safety copy of everything in data/backups (made before anything that wipes something, like resetting luck). Keeps the newest 30.
function autoBackup(why) {
  try {
    const dir = path.join(DATA, 'backups'); fs.mkdirSync(dir, { recursive: true });
    const { twitchToken, ...rest } = db;
    fs.writeFileSync(path.join(dir, `movie-royal-backup-${stamp()}-${why}.json`), JSON.stringify(rest));
    const old = fs.readdirSync(dir).filter(f => f.endsWith('.json')).sort(); for (const f of old.slice(0, Math.max(0, old.length - 30))) fs.unlinkSync(path.join(dir, f));
  } catch (e) { console.error('[backup]', e.message); }
}
// monthly reminder to download a backup (keeps it somewhere other than this PC)
db.firstRunAt ||= Date.now();
const backupDue = () => Date.now() - (db.lastBackupAt || db.firstRunAt) > 30 * 864e5 && Date.now() > (db.backupSnooze || 0);
app.post('/api/backup/snooze', (req, res) => { db.backupSnooze = Date.now() + 7 * 864e5; save(); pushState(); res.json({ ok: true }); });
app.get('/api/backup', (req, res) => {
  db.lastBackupAt = Date.now(); save(); setTimeout(pushState, 200);
  const { twitchToken, ...rest } = db;
  res.setHeader('Content-Disposition', `attachment; filename="movie-royal-backup-${stamp()}.json"`);
  res.type('application/json').send(JSON.stringify(rest, null, 1));
});
app.post('/api/restore', (req, res) => {
  const b = req.body;
  if (!b || !Array.isArray(b.lists) || !b.settings) return res.status(400).json({ error: "That doesn't look like a Movie Royal backup." });
  autoBackup('before-restore');
  for (const k of ['settings', 'lists', 'activeListId', 'history', 'links', 'picks', 'pendingEffects', 'bans', 'manualPeople', 'yearAllow', 'colors', 'luckSaves']) if (k in b) db[k] = b[k];
  if (!db.lists.find(l => l.id === 'movies')) db.lists.unshift({ id: 'movies', name: 'Discord Movies', type: 'movies', entries: [] });
  historyVersion++; save(); discord.start(pushState); twitch.start(twitchHandlers); pushState();
  res.json({ ok: true });
});

// history
const normHist = h => h.winner ? h : { ...h, id: h.id || 'old-' + h.at, winner: { label: h.label, sub: h.sub, owner: h.owner }, top: [], events: [] };
// ---------- 🎡 wheel ----------
const startDonationFeed = () => donations.startDonations({ tip: t => { try { chatlog.onAlert({ kind: 'tip', login: String(t.name || '').toLowerCase(), name: t.name, amount: t.amount, text: `donated ${t.currency && t.currency !== 'USD' ? t.amount + ' ' + t.currency : '$' + t.amount}${t.message ? ': ' + t.message : ''}` }); if (!db.moneyPaused?.donations) wheel.onMoney(t); } catch (e) { console.error('[donation]', e.message); } }, change: pushState });
setTimeout(startDonationFeed, 1500);
setTimeout(() => { const r = wheel.W().rewards; twitch.noInput([r.grow, r.shrink]).catch(() => {}); }, 20000); // grow/shrink rewards made by older versions asked chat to type a spot
wheel.initWheel({ broadcast, pushState, say: t => twitch.canSay() && db.wheel?.chatOn !== false ? twitch.say(t) : Promise.resolve(), obsDoom: () => obs.doomsday(), openBattle: (id, auto, why) => openBattleFromWheel(id, auto, why), openCards: (id, auto, why) => cards.openFromWheel(id, auto, why), goView: v => broadcast({ type: 'goView', view: v }, 'control') });
if (db.doomRestore) setTimeout(() => obs.restoreDoom().catch(() => {}), 20000); // ☠️ Doomsday turned your mic / camera off and Movie Royal closed before it could turn them back on: do it now (once the stream is over)
// 🃏 card battles (Card pool + Card battles tabs)
cards.initCards({ broadcast, pushState, preview: () => refreshPreview(true), mapTag: id => mapsWithTags().find(m => m.id === id)?.tag || null,
  startBall: (fight, b) => { // ⚪🃏 a card battle on a ball map: the ball game plays it with card fighters (no luck: every pack the same odds)
    if (live.phase === 'lobby' || live.phase === 'running') return 'A ball battle is going right now. Stop it first.';
    if (![...wss.clients].some(c => c.role === 'overlay')) return "The game screen isn't open. Reload the control panel (or bring back the pop-out game window).";
    leaveEnded(true); if (wheel.W().show) wheel.setShow(false);
    const fighters = fight.fighters.map(f => ({ id: f.id, label: f.name + (f.tag ? ' ' + f.tag : ''), sub: f.game || '', image: f.image || null, weight: 1, kind: 'cards', color: f.color }));
    live.game = { id: uid(), cards: fight.id, listId: null, fighters, total: fighters.length, map: fight.map, startedAt: Date.now(), ...(fight.test ? { test: true, testName: fight.name } : {}) };
    live.phase = 'lobby'; live.claim = null;
    broadcast({ type: 'start', map: fight.map, gameId: live.game.id, fighters, total: fighters.length, listName: fight.name, kind: 'cards', skin: 'cards', lobbySeconds: 3, gameSeconds: b.length || db.settings.gameSeconds, pacer: b.pace ?? 50, fairOdds: true, queued: [] }, 'overlay');
    pushState(); return null;
  },
  stopBall: () => { if (live.game?.cards) { live.phase = 'idle'; live.game = null; broadcast({ type: 'reset' }, 'overlay'); pushState(); refreshPreview(true); } },
 say: t => twitch.canSay() ? twitch.say(t) : Promise.resolve(), goView: v => broadcast({ type: 'goView', view: v }, 'control'), linkDone: () => { if (wheel.linkWaiting()?.cards) { cards.setShow(false); wheel.linkBack(); wheelChanged(); } } });
// 🔀 a wheel spot sent us to a battle: put it on stream (and start it), then go back to the wheel once it has a winner
function openBattleFromWheel(listId, auto, why) {
  cards.setShow(false); // (a battle goes on stream: no card battle on top of it)
  const l = getList(listId); if (!l) return "that battle isn't there any more";
  if (live.phase === 'lobby' || live.phase === 'running') return 'a battle is already going';
  leaveEnded(); if (db.activeListId !== l.id) { db.activeListId = l.id; previewIds = null; }
  live.wheelLink = { listId: l.id, at: Date.now() };
  wheel.setShow(false); save(); pushState(); refreshPreview(true);
  broadcast({ type: 'goView', view: 'battle' }, 'control');
  broadcast({ type: 'toast', text: `🔀 “${why}” sent you to the battle “${l.name}”${auto ? ': it starts in a few seconds' : ": press START when you're ready"}. Then it goes back to the wheel.` }, 'control');
  if (auto) setTimeout(async () => { if (live.phase === 'lobby' || live.phase === 'running' || live.wheelLink?.listId !== l.id) return; const err = await startRound(); if (err) broadcast({ type: 'toast', text: '🔀 ' + err }, 'control'); }, 6000);
  return null;
}
function battleDoneForWheel() { // the battle a wheel spot sent us to has its winner: back to the wheel (after the winner card, and the claim if there is one)
  if (!live.wheelLink) return;
  live.wheelLink = null;
  if (!wheel.linkWaiting()?.battle) return;
  const started = Date.now();
  const back = () => { if (live.claim && !live.claim.done && Date.now() - started < 180000) return setTimeout(back, 5000); live.claim && clearTimeout(live.claim.timer); wheel.linkBack(); wheelChanged(); };
  setTimeout(back, 15000);
}
// 🔒 picks + swaps lock while a Discord movie battle is going (from Start until it has its winner), when that's the rule (the default)
setBattleCheck(() => !!live.game && live.game.listId === 'movies' && ['lobby', 'running', 'waiting'].includes(live.phase));
let lockWas = autoLocked();
setInterval(() => { // tell the 24/7 bot and the pinned Discord message right away when the lock changes
  const now = autoLocked(); if (now === lockWas) return; lockWas = now;
  pushState(); discord.refreshPinned?.(); if (db.settings.cloud?.enabled) cloud.sync(true)?.catch?.(() => {});
}, 1500);
// 📣 hourly chat messages: a button on the Battle / Chat battle / Giveaway / Wheel tab posts that mode's message in Twitch chat
// right away and then every hour (Settings → Twitch: the words, how often, your Discord link). Off: press it again, or the stream ends.
const ANNOUNCE_DEFAULTS = {
  battle: '🍿 Want YOUR movie in the battle royale? Join the Discord: {discord} → go to #{channel} and type /suggest to add a movie. Every movie fights on the cliff, the last one standing gets watched! Type {commands} to see all the chat commands.',
  chat: '⚔️ Chat battle time! Type {join} in chat to jump in: your Twitch picture becomes your piece, last one standing wins. Type {commands} to see all the chat commands.',
  giveaway: '🎁 Giveaway{prize}! Type {enter} in chat to enter. Type {commands} to see all the chat commands.',
  wheel: '🎡 The wheel is spinning! Use channel points to 🔁 respin it or ↕️ move it. Got a saved respin? Type {respin} ({myspins} shows how many you have). Type {commands} to see all the chat commands.'
};
const ANNOUNCE_KEYS = { battle: 'announceBattle', chat: 'announceChat', giveaway: 'announceGiveaway', wheel: 'announceWheel' };
function announceText(kind) {
  const st = db.settings, ga = giveawaySettings(), wc = wheel.W().cmd || {};
  const link = String(st.discordServerLink || '').trim() || db.discordInviteAuto || ''; // (your own link, or one the bot made)
  const t = String(st[ANNOUNCE_KEYS[kind]] || '').trim() || ANNOUNCE_DEFAULTS[kind];
  return t.replace(/\{discord\}/g, link || '(ask a mod for the Discord link)').replace(/\{channel\}/g, (st.discordChannelName || 'movies-royal').replace(/^#/, ''))
    .replace(/\{commands\}/g, st.helpCommand || '!moviesroyal').replace(/\{join\}/g, st.joinCommand || '!join').replace(/\{enter\}/g, ga.command || '!enter')
    .replace(/\{prize\}/g, ga.prize ? `: ${ga.prize}` : '').replace(/\{respin\}/g, wc.respin || '!respin').replace(/\{myspins\}/g, wc.spins || '!myspins')
    .replace(/\{streamer\}/g, streamerName()).slice(0, 490);
}
// ONE on/off for every tab (Derek): each time it posts, it posts the message for the tab you're on right now
const annState = () => { const a = (db.announce ||= {}); if (!a.all) { a.all = { on: Object.values(a).some(x => x?.on), last: Math.max(0, ...Object.values(a).map(x => x?.last || 0)) }; for (const k of Object.keys(ANNOUNCE_DEFAULTS)) delete a[k]; } return a; };
function annKind() { // which tab's message: the tab you're on (Battle / Chat battle / Giveaway / Wheel), else what's on stream
  const v = live.view, l = getList(db.activeListId), fromList = l?.giveaway ? 'giveaway' : l?.type === 'chat' ? 'chat' : 'battle';
  if (v === 'wheel' || v === 'chat' || v === 'giveaway') return v;
  if (v === 'battle') return fromList;
  return wheel.W().show ? 'wheel' : (live.lastGameView && live.lastGameView !== 'battle' ? live.lastGameView : fromList);
}
async function announceNow() {
  const a = annState().all; if (!a?.on) return;
  const kind = annKind();
  if (kind === 'battle' && !String(db.settings.discordServerLink || '').trim()) await discord.inviteLink?.().catch(() => null); // no link pasted: the bot makes one
  a.last = Date.now(); a.kind = kind; save();
  try { await twitch.say(announceText(kind)); a.error = null; } catch (e) { a.error = e.message; console.error('[twitch] hourly chat message:', e.message); }
  pushState();
}
app.post('/api/view', (req, res) => { // the control panel says which tab you're on (for the chat message)
  const v = String(req.body?.view || ''); if (v !== live.view) helpCd = 0; live.view = v; // (a new tab = !moviesroyal can list its commands right away)
  if (v === 'cards' || v === 'battle') { if (live.phase === 'ended' && (v === 'cards') !== !!live.game?.cards) { leaveEnded(true); } } // (each tab shows its own battle)
  if (v === 'cards') { if (wheel.W().show) wheel.setShow(false); cards.setShow(true); } else if (v === 'battle' || v === 'wheel') cards.setShow(false);
  if (v === 'cards' || v === 'battle') refreshPreview(true); // 🃏 Card battles tab = the card battle on stream
  if (['battle', 'chat', 'giveaway', 'wheel'].includes(v)) live.lastGameView = v; res.json({ ok: true, kind: annKind() });
});
app.post('/api/announce', async (req, res) => { // { on } — or { now: true } to post right away — or { preview, kind } to see a message
  const a = annState().all;
  if (req.body?.preview) { const kind = ANNOUNCE_DEFAULTS[req.body.kind] ? req.body.kind : annKind(); return res.json({ text: announceText(kind), kind }); }
  if ('on' in (req.body || {})) { a.on = !!req.body.on; a.since = a.on ? Date.now() : null; save(); }
  if (a.on && (req.body?.on || req.body?.now)) await announceNow(); // turning it on posts it right away (off + on again = post now)
  pushState(); res.json({ ok: true, on: a.on, error: a.error || null, kind: a.kind || annKind(), text: announceText(a.kind || annKind()) });
});
setInterval(() => { // every minute: due?
  const every = Math.max(5, Number(db.settings.announceMins) || 60) * 60000, a = annState().all;
  if (a?.on && Date.now() - (a.last || 0) >= every) announceNow();
}, 60000);
const announceOff = () => { const a = annState().all; if (a?.on) { a.on = false; save(); pushState(); } };
// 🔗 the day each viewer linked their Twitch in Discord (/linktwitch, the 24/7 bot, the backup, or you in the People tab)
setInterval(() => { let n = 0; db.linkDates ||= {}; for (const id of Object.keys(db.links || {})) if (!db.linkDates[id]) { db.linkDates[id] = Date.now(); n++; } if (n) save(); }, 20000);
// 🚀 the raid reward (Settings → Rewards & prices, on by default): someone redeems it while you're live, Movie Royal asks them in chat
// who to raid, they type a Twitch name, a pop-up celebrates it and a box at the top of the app shows it: click it to start the raid.
// The reward then hides for the rest of the stream. Movie Royal makes the reward itself (an old "raid" reward's price is kept).
async function raidSetup() {
  const st = db.settings, title = st.raidTitle || '🚀 Pick who we raid!';
  const all = await twitch.listAllRewards(), mine = new Set((await twitch.listRewards()).map(r => r.id));
  const old = all.filter(r => /raid/i.test(r.title)), out = { made: false, removed: [], byHand: [], cost: 0 };
  const priced = old.find(r => r.cost); st.raidCost = priced ? priced.cost : (Number(st.raidCost) || 1500); out.cost = st.raidCost;
  for (const r of old) { if (mine.has(r.id)) { await twitch.deleteReward(r.id).catch(() => {}); out.removed.push(`${r.title} (${r.cost})`); } else out.byHand.push({ title: r.title, cost: r.cost }); }
  if (!out.byHand.some(x => x.title.toLowerCase() === title.toLowerCase()))
    out.made = await twitch.createReward({ title, cost: st.raidCost, prompt: 'Pick the channel we raid at the end of the stream! After you redeem, type their Twitch name in chat.', color: '#9146FF', input: false, queue: true }).catch(e => { out.error = e.message; return false; });
  db.raidSetup = { at: Date.now(), ...out }; save(); rewardKey = ''; syncRewards().catch(() => {}); pushState();
  return out;
}
setInterval(() => { if (twitch.status.userId && db.settings.raidOn !== false && !db.raidSetup && !raidSetup.busy) { raidSetup.busy = true; raidSetup().catch(e => console.error('[twitch] raid reward:', e.message)).finally(() => { raidSetup.busy = false; }); } }, 30000);
function raidRedeem(r) {
  if (!r.test) { stream().raidUsed = true; save(); rewardKey = ''; syncRewards().catch(() => {}); } // gone from the menu for the rest of the stream
  live.raid = { by: r.login, name: r.name, at: Date.now(), target: null, test: !!r.test };
  twitch.say(`🚀 @${r.name} you get to pick who we raid! Type their Twitch name in chat.`).catch(() => {});
  setTimeout(() => { if (live.raid && !live.raid.target && live.raid.by === r.login) twitch.say(`🚀 @${r.name} still waiting: who should we raid? Type their Twitch name in chat.`).catch(() => {}); }, 120000);
  broadcast({ type: 'toast', text: `🚀 ${r.name} redeemed the raid reward: waiting for them to type a channel in chat` }, 'control'); pushState();
}
function raidChat(m) {
  const rd = live.raid; if (!rd || rd.target || rd.busy || m.login !== rd.by) return false;
  const name = String(m.text || '').trim().split(/\s+/)[0].replace(/^@/, '').replace(/[^A-Za-z0-9_]/g, ''); if (!name || name.startsWith('!')) return false;
  rd.busy = true;
  twitch.getUsers([name]).then(us => {
    const u = us.get(name.toLowerCase());
    if (!u && !rd.test) { twitch.say(`🚀 @${m.name} I couldn't find a Twitch channel called “${name}”. Check the spelling and type it again!`).catch(() => {}); return; }
    rd.target = u ? { login: u.login, name: u.name, id: u.id, avatar: proxied(u.avatar) } : { login: name.toLowerCase(), name, id: null, avatar: null }; // (🧪 pretend raids take any name) rd.pickedAt = Date.now();
    const t = rd.target; twitch.say(`🚀 @${m.name} picked our raid: ${t.name}! twitch.tv/${t.login} — we'll head over there at the end of the stream 💜`).catch(() => {});
    broadcast({ type: 'raidPicked', raid: rd }, 'control'); pushState();
  }).catch(e => console.error('[twitch] raid pick:', e.message)).finally(() => { rd.busy = false; });
  return true;
}
app.post('/api/raid/start', async (req, res) => {
  const t = live.raid?.target; if (!t) return res.status(400).json({ error: 'Nobody has been picked to raid yet.' });
  try { await twitch.startRaid(t.id); live.raid.started = Date.now(); twitch.say(`🚀 RAID! We're heading to ${t.name}: twitch.tv/${t.login} 💜`).catch(() => {}); pushState(); res.json({ ok: true, target: t }); }
  catch (e) { res.status(400).json({ error: e.message }); }
});
// 💧🙆🎩🎉 viewer rewards: Hydrate, Stretch, Pick a hat, Viewer's choice. Always on in the channel points menu.
// Set up once you're signed in (and with "Set up again" on Settings → Rewards & prices): a reward you already have keeps its name and price
// (Movie Royal deletes its own old one and makes it again; one made by hand on Twitch can only be deleted on Twitch, and still works meanwhile).
const VR = {
  hydrate: { re: /hydrat/i, title: '💧 Hydrate!', cost: 300, prompt: 'Remind the streamer to drink some water!', color: '#3FA9F5' },
  stretch: { re: /stretch/i, title: '🙆 Stretch!', cost: 300, prompt: 'Time for the streamer to stretch!', color: '#4CC77A' },
  hat: { re: /\bhats?\b/i, title: '🎩 Pick a hat', cost: 1000, prompt: 'Pick a hat for the streamer! After you redeem, type the number or the name of a hat in chat.', color: '#B07AF5' },
  choice: { re: /viewer.?s?.?\s*choice/i, title: "🎉 Viewer's Choice", cost: 5000, prompt: 'You get to choose! Type what you choose.', color: '#FFB020', input: true }
};
const HATS_DEFAULT = 'Cowboy hat\nTop hat\nWizard hat\nPirate hat\nBaseball cap\nBeanie\nParty hat\nCrown';
const vrTitle = k => db.settings.vrTitles?.[k] || VR[k].title;
const vrKind = title => Object.keys(VR).find(k => vrTitle(k).toLowerCase() === String(title || '').toLowerCase()) || null;
const hats = () => String(db.settings.hatList || HATS_DEFAULT).split('\n').map(x => x.trim()).filter(Boolean).slice(0, 30);
async function vrSetup() {
  const all = await twitch.listAllRewards(), mine = new Set((await twitch.listRewards()).map(r => r.id)), out = {};
  db.settings.vrTitles ||= {}; db.settings.vrCosts ||= {};
  for (const [k, d] of Object.entries(VR)) {
    const olds = all.filter(r => d.re.test(r.title) && !Object.entries(VR).some(([k2, d2]) => k2 !== k && vrTitle(k2).toLowerCase() === r.title.toLowerCase())), o = { removed: [], byHand: [], made: false };
    const old = olds.find(r => !mine.has(r.id)) || olds[0], title = old?.title || db.settings.vrTitles[k] || d.title, cost = old?.cost || db.settings.vrCosts[k] || d.cost;
    db.settings.vrTitles[k] = title; db.settings.vrCosts[k] = cost; o.title = title; o.cost = cost;
    for (const r of olds) { if (mine.has(r.id)) { await twitch.deleteReward(r.id).catch(() => {}); o.removed.push(`${r.title} (${r.cost})`); } else o.byHand.push({ title: r.title, cost: r.cost }); }
    if (!o.byHand.length) o.made = await twitch.createReward({ title, cost, prompt: old?.prompt || d.prompt, color: old?.color || d.color, input: old ? old.input : !!d.input, queue: old ? !old.skip : false }).catch(e => { o.error = e.message; return false; });
    out[k] = o;
  }
  db.vrSetup = { at: Date.now(), ...out }; save(); rewardKey = ''; syncRewards().catch(() => {}); pushState();
  if (db.settings.choiceObs) choiceFile().then(f => obs.celebrateSource(true, f.file)).catch(() => {}); // (a remade reward has a new id: the OBS file gets it)
  return out;
}
setInterval(() => { if (twitch.status.userId && !db.vrSetup && !vrSetup.busy) { vrSetup.busy = true; vrSetup().catch(e => console.error('[twitch] viewer rewards:', e.message)).finally(() => { vrSetup.busy = false; }); } }, 30000);
function vrRedeem(kind, r) {
  const name = r.name || r.login || 'Someone';
  if (kind === 'hydrate' || kind === 'stretch') return broadcast({ type: 'vrPop', kind, name }, 'control'); // the pop-up + sound in the app (only if it's the window you're on)
  if (kind === 'hat') {
    const list = hats(); live.hat = { by: r.login, name, at: Date.now(), list };
    let msg = `🎩 @${name} pick a hat! Type the number or the name: `; for (let i = 0; i < list.length; i++) { const add = `${i + 1}. ${list[i]}${i < list.length - 1 ? ' · ' : ''}`; if ((msg + add).length > 480) break; msg += add; }
    twitch.say(msg).catch(() => {});
    broadcast({ type: 'toast', text: `🎩 ${name} redeemed Pick a hat: waiting for them to pick in chat` }, 'control'); return;
  }
  if (kind === 'choice') return celebrate({ name, input: String(r.input || '').slice(0, 200), login: r.login });
}
function hatChat(m) {
  const h = live.hat; if (!h || m.login !== h.by) return false;
  if (Date.now() - h.at > 5 * 60000) { live.hat = null; return false; }
  const t = String(m.text || '').trim().replace(/^#/, ''), n = Number(t.match(/^\d+/)?.[0]);
  const pick = n >= 1 && n <= h.list.length ? h.list[n - 1] : h.list.find(x => x.toLowerCase() === t.toLowerCase()) || h.list.find(x => t.length >= 3 && x.toLowerCase().includes(t.toLowerCase()));
  if (!pick) return false;
  live.hat = null;
  twitch.say(`🎩 @${m.name} picked the ${pick}! ${streamerName()} is putting it on 😎`).catch(() => {});
  broadcast({ type: 'vrPop', kind: 'hat', name: m.name, hat: pick }, 'control');
  return true;
}
// 🎉 Viewer's choice: confetti, balloons and a big pop-up for 10 seconds, on stream (the OBS source, when you turned it on) and on your screen
async function celebrate(c) {
  const msg = { type: 'celebrate', name: c.name, input: c.input || '', headline: db.settings.choiceHeadline || "VIEWER'S CHOICE!", vol: db.settings.soundOn === false ? 0 : Number(db.settings.sfxVolume ?? 70) / 100, avatar: c.login ? await avatarFor(c.login).catch(() => null) : null, sound: true, at: Date.now() };
  broadcast(msg, 'celebrate'); // 📺 the OBS source
  if (db.settings.choiceScreen !== false) globalThis.__desktop?.celebrate?.(`http://127.0.0.1:${PORT}/celebrate.html?desk=1${db.settings.choiceObs ? '&quiet=1' : ''}#${encodeURIComponent(JSON.stringify(msg))}`); // 🖥️ over whatever you're looking at
  broadcast({ type: 'toast', text: `🎉 ${c.name} redeemed Viewer's choice!${c.input ? ' “' + c.input + '”' : ''}` }, 'control');
}
// 📺 the OBS browser source, on top of every scene (only when you turn it on). It's a file on your PC with your channel and the
// Viewer's choice reward written in: it reads your Twitch chat by itself, so it works with just OBS open (Movie Royal can be closed).
async function choiceFile() {
  const login = twitch.status.login || db.owner?.login; if (!login) throw new Error('Sign in with Twitch first.');
  const title = vrTitle('choice'), rw = (await twitch.listAllRewards()).find(r => r.title.toLowerCase() === title.toLowerCase());
  if (!rw) throw new Error(`There's no “${title}” reward on Twitch yet. Press 🎁 Make / fix the viewer rewards now first.`);
  const cfg = { channel: login, reward: rw.id, text: db.settings.choiceHeadline || "VIEWER'S CHOICE!", vol: db.settings.soundOn === false ? 0 : Math.round(Number(db.settings.sfxVolume ?? 70)), sound: db.settings.soundOn === false ? '0' : '1' };
  const tpl = fs.readFileSync(path.join(ROOT, 'public', 'obs', 'viewers-choice.html'), 'utf8').replace('<script>', `<script>window.MR_CONFIG = ${JSON.stringify(cfg).replace(/</g, '\\u003c')};</script>\n<script>`);
  const dir = path.join(DATA, 'obs'); fs.mkdirSync(dir, { recursive: true }); const file = path.join(dir, 'viewers-choice.html'); fs.writeFileSync(file, tpl);
  return { file, needsText: !rw.input };
}
async function choiceSource(on) {
  db.settings.choiceObs = !!on; save();
  let note = null, file = null;
  if (on) { const f = await choiceFile(); file = f.file; if (f.needsText) note = 'Your Viewer\'s choice reward doesn\'t ask viewers to type something, so it can\'t be seen in chat. On Twitch, turn on “Require Viewer to Enter Text” for it.'; }
  const r = await obs.celebrateSource(on, file);
  pushState(); return { ...r, note };
}
setInterval(() => { if (db.settings.choiceObs && twitch.status.userId) choiceFile().then(f => obs.celebrateSource(true, f.file)).catch(() => {}); }, 10 * 60000); // (new scenes get it too, and a new reward or channel is written in)
app.get('/api/vr/obs-file', (req, res) => res.download(path.join(ROOT, 'public', 'obs', 'viewers-choice.html'), 'viewers-choice.html')); // ⬇️ the file for OBS (it sets itself up when you open it)
app.post('/api/vr/setup', async (req, res) => { try { res.json({ ok: true, ...(await vrSetup()) }); } catch (e) { res.status(400).json({ error: e.message }); } });
app.post('/api/vr/source', async (req, res) => { try { res.json({ ok: true, ...(await choiceSource(!!req.body?.on)) }); } catch (e) { pushState(); res.status(400).json({ error: e.message }); } });
app.post('/api/test/vr', (req, res) => { // 🧪 pretend someone redeemed one
  const kind = String(req.body?.kind || ''); if (!VR[kind]) return res.status(400).json({ error: 'Which reward?' });
  twitch.pretend.until = Date.now() + 10 * 60000;
  vrRedeem(kind, { login: 'test_viewer', name: 'test_viewer', title: vrTitle(kind), input: kind === 'choice' ? String(req.body?.input || 'We watch a scary movie next!') : '', test: true });
  res.json({ ok: true });
});
app.post('/api/raid/clear', (req, res) => { live.raid = null; pushState(); res.json({ ok: true }); });
app.post('/api/raid/setup', async (req, res) => { try { res.json({ ok: true, ...(await raidSetup()) }); } catch (e) { res.status(400).json({ error: e.message }); } });
app.post('/api/test/raid-redeem', (req, res) => { twitch.pretend.until = Date.now() + 10 * 60000; const name = String(req.body?.name || 'test_viewer'); raidRedeem({ login: name.toLowerCase().replace(/\s+/g, '_'), name, title: db.settings.raidTitle, test: true }); res.json({ ok: true }); });
app.post('/api/test/raid-pick', (req, res) => { const login = String(req.body?.login || 'movieroyal_test').toLowerCase(); live.raid = { by: 'test_viewer', name: 'test_viewer', at: Date.now(), target: { login, name: req.body?.name || login, id: null, avatar: null }, pickedAt: Date.now(), test: true }; broadcast({ type: 'raidPicked', raid: live.raid }, 'control'); pushState(); res.json({ ok: true }); }); // 🧪 shows the pop-up + box without Twitch
// 💰 Settings → Rewards & prices: every channel point reward, bits amount and donation amount in one place, sorted by tab.
// Each reward: follow the rules (default) · always on · off (hidden on Twitch) · on, then off after one use. Bits / subs / donations can be paused.
async function pricesInfo() {
  const st = db.settings, W = wheel.W(), modes = db.rewardModes || {}, P = db.moneyPaused || {};
  let tw = []; const mine = new Set(); let twErr = null;
  try { tw = await twitch.listAllRewards(); for (const r of await twitch.listRewards()) mine.add(r.id); } catch (e) { twErr = twitch.status.userId ? e.message : 'Sign in with Twitch to see and change the prices on Twitch.'; }
  const R = (group, key, title, what, cost) => { const t = tw.find(x => x.title.toLowerCase() === String(title).toLowerCase()); return { group, key, title, what, cost: t?.cost ?? cost ?? null, onTwitch: !!t, mine: !!t && mine.has(t.id), enabled: t ? t.enabled : null, mode: modes[String(title).toLowerCase()] || 'rules', count: countMax(String(title).toLowerCase()), left: countLeft(String(title).toLowerCase()) }; };
  const rewards = [];
  for (const [title, ev] of Object.entries(st.rewards || {})) rewards.push(R('battle', 'chaos:' + title, title, `${EVENTS[ev]?.icon || ''} ${EVENTS[ev]?.name || ev} (chaos)`, null));
  if (st.colorReward) rewards.push(R('battle', 'color', st.colorReward, '🎨 Pick your ball color' + (st.colorMode === 'points' ? '' : ' (only used when ball colors are set to channel points)'), null));
  for (const [title, kind] of Object.entries(st.powerRewards || {})) rewards.push(R('chat', 'power:' + kind, title, ({ shield: '🛡️ Shield', mega: '💪 Mega ball', turbo: '⚡ Turbo', ghost: '👻 Ghost ball', spiky: '🦔 Spiky ball', magnet: '🧲 Magnet ball' })[kind] || kind, st.powerCosts?.[kind]));
  const WN = { respin: '🔁 Respin', move: '↕️ Move a spot', up: '⬆️ Move up', down: '⬇️ Move down', grow: '📈 Grow a spot', shrink: '📉 Shrink a spot', double: '✌️ Double trouble', stop: '🛑 Force stop' };
  for (const [k, title] of Object.entries(W.rewards || {})) if (title) rewards.push(R('wheel', 'wheel:' + k, title, WN[k] || k, W.costs?.[k]));
  for (const [k, d] of Object.entries(VR)) rewards.push(R('viewer', 'vr:' + k, vrTitle(k), ({ hydrate: '💧 Hydrate (pop-up + chugging sound)', stretch: '🙆 Stretch (pop-up + stretching sound)', hat: '🎩 Pick a hat (they pick from your hat list in chat)', choice: "🎉 Viewer's choice (confetti, balloons, big pop-up)" })[k], db.settings.vrCosts?.[k] ?? d.cost));
  if (st.raidTitle) rewards.push(R('raid', 'raid', st.raidTitle, '🚀 Pick who we raid' + (st.raidOn === false ? ' (raid reward is off)' : ''), st.raidCost));
  const bits = Object.entries(st.bits || {}).map(([b, ev]) => ({ amount: Number(b), what: `${EVENTS[ev]?.icon || ''} ${EVENTS[ev]?.name || ev}`, event: ev, paused: !!P.bits?.[b] })).sort((a, b) => a.amount - b.amount);
  return { rewards, bits, wheel: { ...W.auto }, paused: { wheelBits: !!P.wheelBits, wheelSubs: !!P.wheelSubs, donations: !!P.donations }, twErr, bitsOn: st.bitsOn !== false, pointsOn: st.pointsOn !== false, wheelPointsOn: W.pointsOn !== false };
}
app.get('/api/prices', async (req, res) => res.json(await pricesInfo()));
app.post('/api/prices/reward', async (req, res) => {
  const b = req.body || {}, title = String(b.title || ''), key = String(b.key || ''); if (!title) return res.status(400).json({ error: 'Which reward?' });
  try {
    if (b.mode) { db.rewardModes ||= {}; if (b.mode === 'rules') delete db.rewardModes[title.toLowerCase()]; else if (['on', 'off', 'once', 'count'].includes(b.mode)) db.rewardModes[title.toLowerCase()] = b.mode; }
    if (b.count != null) { (db.rewardCounts ||= {})[title.toLowerCase()] = Math.max(1, Math.min(999, Math.round(Number(b.count) || 1))); }
    if (b.resetCount) { const st = stream(); if (st.rewardUses) delete st.rewardUses[title.toLowerCase()]; }
    let note = null;
    if (b.cost != null) {
      const cost = Math.max(1, Math.round(Number(b.cost) || 0)); if (!cost) throw new Error('Type a price.');
      const W = wheel.W();
      if (key.startsWith('wheel:')) { W.costs[key.slice(6)] = cost; wheelChanged(); }
      else if (key.startsWith('power:')) { (db.settings.powerCosts ||= {})[key.slice(6)] = cost; }
      else if (key === 'raid') db.settings.raidCost = cost;
      else if (key.startsWith('vr:')) (db.settings.vrCosts ||= {})[key.slice(3)] = cost;
      const t = (await twitch.listRewards().catch(() => [])).find(x => x.title.toLowerCase() === title.toLowerCase());
      if (t) await twitch.updateReward(t.id, { cost });
      else if ((await twitch.listAllRewards().catch(() => [])).some(x => x.title.toLowerCase() === title.toLowerCase())) note = 'That reward was made by hand on Twitch, so only Twitch can change its price (Twitch → Creator Dashboard → Channel Points).';
      else note = "It isn't on Twitch yet: the new price is used when Movie Royal makes it.";
    }
    save(); rewardKey = ''; syncRewards().catch(() => {}); pushState(); res.json({ ok: true, note });
  } catch (e) { res.status(400).json({ error: e.message }); }
});
app.post('/api/prices/money', (req, res) => { // bits amounts, the wheel's sub / bits / donation amounts, and pausing them
  const b = req.body || {}, W = wheel.W(); db.moneyPaused ||= { bits: {} }; db.moneyPaused.bits ||= {};
  if (b.pause) { const [k, v] = [String(b.pause), !!b.paused]; if (k.startsWith('bits:')) db.moneyPaused.bits[k.slice(5)] = v; else if (['wheelBits', 'wheelSubs', 'donations'].includes(k)) db.moneyPaused[k] = v; }
  if (b.bitsFrom != null && b.bitsTo != null) { const from = String(Math.round(Number(b.bitsFrom))), to = Math.round(Number(b.bitsTo)); if (!(to >= 1)) return res.status(400).json({ error: 'Type an amount of bits.' }); const ev = db.settings.bits?.[from]; if (ev) { const nb = { ...db.settings.bits }; delete nb[from]; nb[String(to)] = ev; db.settings.bits = nb; if (db.moneyPaused.bits[from] != null) { db.moneyPaused.bits[String(to)] = db.moneyPaused.bits[from]; delete db.moneyPaused.bits[from]; } } }
  if (b.wheel && typeof b.wheel === 'object') for (const k of ['subSpins', 'giftSpins', 'bitsPer', 'bitsSpins', 'dollarsPer', 'popBits']) if (b.wheel[k] != null) W.auto[k] = Math.max(0, Number(b.wheel[k]) || 0);
  save(); wheelChanged(); pushState(); res.json({ ok: true });
});
const wheelChanged = () => { const w = wheel.W(); w.ver = (w.ver || 0) + 1; save(); broadcast(wheel.wheelMsg(), 'overlay'); pushState(); };
// 🎡 ready-made wheels that come with the app (src/defaults/*.json, Movie Royal share files). Each is added once: delete it and it stays deleted.
for (const [key, file] of [['madeKirbportions', 'wheel-of-kirbportions.json']]) {
  if (db.settings[key]) continue;
  try {
    const s = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'defaults', file), 'utf8')).wheel;
    if (!wheel.W().wheels.some(w => w.name.trim().toLowerCase() === String(s.name).trim().toLowerCase())) {
      const w = wheel.newWheel(s.name, s.entries || [], { title: s.title || '', spinSecs: s.spinSecs || 10, removeWinner: !!s.removeWinner, palette: s.palette || null, ...(s.look ? { look: s.look } : {}), opts: wheel.mergeOpts(s.opts) });
      wheel.syncVoid(w); wheel.W().wheels.push(w); wheel.W().ver = (wheel.W().ver || 0) + 1;
    }
    db.settings[key] = true; save();
  } catch (e) { console.error('[wheel] ready-made wheel', file, e.message); }
}
app.get('/api/wheel/spin-log', (req, res) => { // 🎟️ History → Free spins: every saved spin given, used or given back (newest first)
  const st = wheel.W(), out = [];
  for (const g of st.grants || []) out.push({ at: g.at, kind: g.amount >= 0 ? 'given' : 'taken', name: g.name, n: Math.abs(g.amount), reason: g.reason || '', by: g.by || '' });
  for (const u of st.spinLog || []) out.push({ at: u.at, kind: u.kind, name: u.name, n: u.n || 1, reason: u.reason || '', wheel: u.wheel || '', left: u.left });
  out.sort((a, b) => b.at - a.at); res.json({ rows: out.slice(0, Math.min(5000, Number(req.query.limit) || 2000)), bank: Object.values(st.bank || {}).map(b => ({ name: b.name, spins: b.spins, got: b.got || 0, used: b.used || 0 })).sort((a, b) => b.spins - a.spins) });
});
app.get('/api/wheel', (req, res) => { const w = wheel.W(); res.json({ wheels: w.wheels, activeId: w.activeId, show: w.show, last: w.last || null, rewards: w.rewards, costs: w.costs, pointsOn: w.pointsOn !== false, chatOn: w.chatOn !== false, ver: w.ver || 0, historyCount: w.history.length, palette: wheel.PAL, canPoints: !!twitch.status.userId, types: wheel.TYPES, mine: { ...w.mine, name: `${streamerName()}'s spins` }, bank: Object.values(w.bank).sort((a, b) => b.spins - a.spins || a.name.localeCompare(b.name)), grants: w.grants.slice(-300).reverse(), boosts: w.boosts, auto: w.auto, redeemLog: w.redeemLog, donations: { ...donations.status, se: !!db.settings.seJwt, sl: !!db.settings.slToken, seState: donations.status.se, slState: donations.status.sl }, cmd: w.cmd, streamer: streamerName(), round: wheel.getRound(), undo: wheel.undoList(), folders: w.folders, final: w.final || null, bringBack: w.bringBack, live: !!db.live, obs: { set: !!(db.settings.obsMic || db.settings.obsCam || db.settings.obsPassword), ...obs.status } }); });
app.post('/api/wheel', (req, res) => { const w = wheel.newWheel(req.body?.name || 'New wheel', Array.isArray(req.body?.entries) ? req.body.entries : []); wheel.W().wheels.push(w); wheel.W().activeId = w.id; wheelChanged(); res.json({ ok: true, id: w.id }); });
app.put('/api/wheel/:id', (req, res) => {
  const w = wheel.getWheel(req.params.id); if (!w) return res.status(404).json({ error: 'No such wheel' });
  const b = req.body || {};
  if (b.name != null) w.name = String(b.name).slice(0, 80) || w.name;
  if (b.title != null) w.title = String(b.title).slice(0, 120);
  if (b.spinSecs != null) w.spinSecs = Math.max(2, Math.min(60, Number(b.spinSecs) || 10));
  if (b.removeWinner != null) w.removeWinner = !!b.removeWinner;
  if (b.folder != null) { w.folder = String(b.folder).slice(0, 60); const W0 = wheel.W(); if (w.folder && !W0.folders.includes(w.folder)) W0.folders.push(w.folder); }
  if (b.palette !== undefined) w.palette = Array.isArray(b.palette) && b.palette.length ? b.palette.filter(c => /^#[0-9a-f]{6}$/i.test(c)).slice(0, 24) : null;
  if (Array.isArray(b.entries)) w.entries = b.entries.slice(0, 5000).map(wheel.cleanEntry);
  if (b.opts && typeof b.opts === 'object') { const o = b.opts, cur = w.opts; for (const k of ['speed', 'growPct']) if (o[k] != null) cur[k] = Math.max(k === 'speed' ? .1 : 1, Math.min(k === 'speed' ? 5 : 50, Number(o[k]) || (k === 'speed' ? 1 : 10))); for (const k of ['confetti', 'ticks', 'winSound', 'recent', 'showPct', 'chat', 'bankRespin', 'rules']) if (o[k] != null) cur[k] = !!o[k]; if (o.round) { if (o.round.on != null) cur.round.on = !!o.round.on; if (o.round.len != null) cur.round.len = Math.max(1, Math.min(600, Number(o.round.len) || 2)); if (o.round.unit) cur.round.unit = o.round.unit === 'sec' ? 'sec' : 'min'; } if (o.collide) { if (o.collide.on != null) cur.collide.on = !!o.collide.on; if (o.collide.secs != null) cur.collide.secs = Math.max(1, Math.min(120, Number(o.collide.secs) || 5)); } for (const g of ['points', 'pop']) if (o[g]) for (const [k, v] of Object.entries(o[g])) if (k in cur[g]) cur[g][k] = !!v; if (o.void) { for (const k of ['on', 'doomsday', 'monthly']) if (o.void[k] != null) cur.void[k] = !!o.void[k]; if (o.void.landings != null) cur.void.landings = Math.max(1, Math.min(100, Math.round(Number(o.void.landings) || 5))); if (o.void.label) cur.void.label = String(o.void.label).slice(0, 40); if (o.void.weight != null) cur.void.weight = Math.max(.1, Number(o.void.weight) || 1); if (/^#[0-9a-f]{6}$/i.test(o.void.color || '')) cur.void.color = o.void.color; } }
  wheel.syncVoid(w);
  if (b.look && typeof b.look === 'object') w.look = { ...w.look, ...Object.fromEntries(Object.entries(b.look).filter(([k, v]) => ['bg', 'bgImage', 'rim', 'pointer', 'lines', 'textColor', 'font', 'hub', 'hubImage'].includes(k) ? typeof v === 'string' && v.length < 300 : k === 'bulbs' ? typeof v === 'boolean' : k === 'textScale' ? Number(v) > 0 : false)) };
  wheelChanged(); res.json({ ok: true });
});
app.delete('/api/wheel/:id', (req, res) => { const w = wheel.W(); if (w.wheels.length <= 1) return res.status(400).json({ error: 'You need at least one wheel.' }); w.wheels = w.wheels.filter(x => x.id !== req.params.id); wheel.W(); wheelChanged(); res.json({ ok: true }); });
app.post('/api/wheel/:id/duplicate', (req, res) => { const o = wheel.getWheel(req.params.id), b = req.body || {}; if (!o) return res.status(404).json({ error: 'No such wheel' }); const w = wheel.newWheel(String(b.name || '').trim() || o.name + ' (copy)', o.entries.filter(e => e.type !== 'void').map(e => { const c = { ...e, id: null, voided: null }; if (b.resetSizes) c.weight = 1; if (b.resetCounts !== false && (c.type === 'countdown' || c.type === 'autocount')) { c.count = c.countStart; c.on = true; } if (b.keepLook === false) { c.color = null; c.image = ''; } return c; }), { title: '', folder: o.folder || '', spinSecs: o.spinSecs, removeWinner: o.removeWinner, opts: JSON.parse(JSON.stringify(o.opts)), palette: b.keepLook === false ? null : o.palette, look: b.keepLook === false ? undefined : { ...o.look } }); wheel.syncVoid(w); wheel.W().wheels.push(w); wheel.W().activeId = w.id; wheelChanged(); res.json({ ok: true, id: w.id }); });
app.post('/api/wheel/active', (req, res) => { if (!wheel.getWheel(req.body?.id)) return res.status(404).json({ error: 'No such wheel' }); wheel.W().activeId = req.body.id; wheelChanged(); res.json({ ok: true }); });
// 🧪 every test puts the right thing on stream: battle tests show the battle, wheel tests show the wheel (so the preview window shows it)
const WHEEL_TESTS = /^\/(wheel-boost|donation|wheel-land|doom-preview|doomsday|wheel-redeem|wheel-redeem-raw)$/, BATTLE_TESTS = /^\/(discord-battle|chat-join|sitout|everyone-in|claim-chat|power|redeem|cheer|battle)$/;
function testScene(path, body) {
  if (WHEEL_TESTS.test(path)) return 'wheel';
  if (BATTLE_TESTS.test(path)) return 'battle';
  if (path === '/chat') { // pretend chat: what they typed decides
    const t = String(body?.text || '').trim().toLowerCase(), first = t.split(/\s+/)[0], cmd = wheel.W().cmd || {}, name = String(body?.name || '').toLowerCase();
    if (['up', 'down', String(cmd.respin || '!respin').toLowerCase(), String(cmd.spins || '!myspins').toLowerCase()].includes(first)) return 'wheel';
    const battleCmds = [db.settings.joinCommand || '!join', db.settings.sitOutCommand || '!sitout', db.settings.backCommand || '!imback', db.settings.twitchMoviesCommand || '!mymovies', db.settings.callCommand || '!call', db.settings.colorCommand || '!color', giveawaySettings().command || '!enter', db.settings.acceptCommand || '!accept', db.settings.passCommand || '!pass'].map(x => String(x).toLowerCase());
    if (battleCmds.includes(first)) return 'battle';
    if (live.claim && !live.claim.done && isWinnerMsg(live.claim.winner, { login: name, name: body?.name || '' })) return 'battle'; // the winner claiming
    if (live.vote && /^[1-4]$/.test(t)) return 'battle'; // map vote
  }
  return null;
}
app.use('/api/test', (req, res, next) => {
  try { const sc = req.method === 'POST' && testScene(req.path, req.body); const on = !!wheel.W().show;
    if (sc === 'battle' && on) { wheel.setShow(false); wheelChanged(); } else if (sc === 'wheel' && !on) { wheel.setShow(true); wheelChanged(); }
  } catch (e) { console.error('[test scene]', e.message); }
  next();
});
app.post('/api/wheel/show', (req, res) => { if (req.body?.show) cards.setShow(false); wheel.setShow(!!req.body?.show); wheelChanged(); res.json({ ok: true }); });
app.post('/api/wheel/spin', (req, res) => { try { const b = req.body || {}; const by = b.by && String(b.by).trim() ? { name: String(b.by).trim().slice(0, 40), login: String(b.by).trim().replace(/^@/, '').toLowerCase(), source: 'mod' } : {}; res.json({ ok: true, ...wheel.request(String(b.kind || 'spin'), by, { wheelId: b.wheelId }) }); } catch (e) { res.status(400).json({ error: e.message }); } });
app.post('/api/wheel/import', async (req, res) => { try { const w = await wheel.importWheel(req.body || {}); wheelChanged(); res.json({ ok: true, id: w.id, name: w.name, count: w.entries.length }); } catch (e) { res.status(400).json({ error: e.message }); } });
app.post('/api/wheel/settings', (req, res) => { const w = wheel.W(), b = req.body || {};
  if (b.auto) for (const k of ['subSpins', 'giftSpins', 'bitsPer', 'bitsSpins', 'dollarsPer', 'popBits']) if (b.auto[k] != null) w.auto[k] = Math.max(0, Number(b.auto[k]) || 0);
  if (b.auto?.tierMult != null) w.auto.tierMult = !!b.auto.tierMult;
  if (b.cmd) for (const k of ['respin', 'spins']) if (b.cmd[k]) w.cmd[k] = String(b.cmd[k]).trim().split(/\s+/)[0].slice(0, 30);
  if (b.growStep != null) w.growStep = Math.max(.1, Math.min(100, Number(b.growStep) || 1));
  if (b.perStream != null) { w.mine.perStream = Math.max(0, Math.min(100, Math.round(Number(b.perStream) || 0))); } if (b.pointsOn != null) w.pointsOn = !!b.pointsOn; if (b.chatOn != null) w.chatOn = !!b.chatOn; for (const k of ['respin', 'move', 'up', 'down', 'grow', 'shrink']) { if (b.rewards?.[k] != null) w.rewards[k] = String(b.rewards[k]).slice(0, 45); if (b.costs?.[k] != null) w.costs[k] = Math.max(1, Number(b.costs[k]) || 1); } wheelChanged(); res.json({ ok: true }); });
// 🎡 make the wheel's 🔁 Respin, ⬆️ Up and ⬇️ Down rewards Movie Royal's own (so it can switch them on and off).
// Ones already on Twitch keep their price: Movie Royal's own are remade right away; ones made by hand on Twitch can only be
// deleted on Twitch (Twitch's rule), so it remembers their price and tells you which to delete, then you press again.
app.post('/api/wheel/rewards/takeover', async (req, res) => {
  try {
    const w = wheel.W(), kinds = ['respin', 'up', 'down'], made = [], byHand = [], remade = [];
    const all = await twitch.listAllRewards(), mine = new Set((await twitch.listRewards()).map(r => r.id));
    const looks = { respin: t => /respin/i.test(t), up: t => /\bup\b/i.test(t) && !/down/i.test(t), down: t => /\bdown\b/i.test(t) && !/\bup\b/i.test(t) };
    for (const k of kinds) {
      const title = w.rewards[k] || wheel.REWARDS?.[k]; if (!title) continue;
      const same = all.filter(r => r.title.toLowerCase() === title.toLowerCase() || (!mine.has(r.id) && looks[k](r.title) && /wheel|spin|move|🎡/i.test(r.title)));
      const priced = same.find(r => r.cost); if (priced) w.costs[k] = priced.cost; // keep the price people already know
      for (const r of same) {
        if (mine.has(r.id)) { await twitch.deleteReward(r.id).catch(() => {}); remade.push(r.title); }
        else byHand.push({ title: r.title, cost: r.cost });
      }
      if (byHand.some(x => x.title.toLowerCase() === title.toLowerCase())) continue; // the name is taken until you delete it on Twitch
      if (await twitch.createReward({ title, cost: w.costs[k], prompt: wheel.REWARD_INFO[k]?.prompt || '', color: wheel.REWARD_INFO[k]?.color || '#4FC3FF', input: false, queue: true })) made.push(`${title} (${w.costs[k]})`);
      w.opts && (w.opts.points = { ...(w.opts.points || {}), [k]: true });
    }
    save(); rewardKey = ''; syncRewards().catch(() => {}); wheelChanged();
    res.json({ ok: true, made, remade, byHand, dashboard: twitch.status.login ? `https://dashboard.twitch.tv/u/${twitch.status.login}/viewer-rewards/channel-points/rewards` : '' });
  } catch (e) { res.status(400).json({ error: e.message }); }
});
app.post('/api/wheel/rewards', async (req, res) => { try { const w = wheel.W(), made = []; const want = Array.isArray(req.body?.kinds) && req.body.kinds.length ? req.body.kinds : ['respin', 'move', 'grow', 'shrink', 'double', 'stop']; for (const k of want) if (w.rewards[k] && await twitch.createReward({ title: w.rewards[k], cost: w.costs[k], prompt: wheel.REWARD_INFO[k].prompt, color: wheel.REWARD_INFO[k].color, input: !!wheel.REWARD_INFO[k].input, queue: true })) made.push(w.rewards[k]); await twitch.noInput([w.rewards.grow, w.rewards.shrink]).catch(() => {}); res.json({ ok: true, made }); } catch (e) { res.status(400).json({ error: e.message }); } });
const wTry = fn => async (req, res) => { try { res.json({ ok: true, ...(await fn(req.body || {}, req)) }); } catch (e) { res.status(400).json({ error: e.message }); } };
app.get('/api/renames', (req, res) => res.json(db.renames || []));
// ---------- 💬 chat tab + 👤 viewer profiles ----------
chatlog.initChat({ send: m => { broadcast(m, 'control'); broadcast(m, 'chatview'); } });
setInterval(() => { if (db.live) twitch.chatters().then(chatlog.tickWatch).catch(() => {}); }, 5 * 60000); // watch time while live
let badgeCache = { at: 0, map: {} };
app.get('/api/chat/recent', async (req, res) => {
  if (Date.now() - badgeCache.at > 3600000) { badgeCache = { at: Date.now(), map: await twitch.badges().catch(() => ({})) }; }
  const emotes = await chatlog.thirdPartyEmotes(twitch.broadcasterId()).catch(() => ({}));
  const sc = twitch.status.scopes || [];
  res.json({ messages: chatlog.getRecent(Number(req.query.n) || 400), alerts: chatlog.getAlerts(150), badges: badgeCache.map, emotes, channel: twitch.status.login || db.settings.twitchChannel || '',
    canChat: !!twitch.status.canChat, canMod: sc.includes('moderator:manage:banned_users'), canDelete: sc.includes('moderator:manage:chat_messages'), canWatch: sc.includes('moderator:read:chatters') });
});
app.get('/api/chat/search', (req, res) => res.json(chatlog.search({ q: req.query.q, login: req.query.login, days: Math.min(365, Number(req.query.days) || 30) })));
app.get('/api/chat/names', (req, res) => res.json(chatlog.names(String(req.query.q || ''))));
app.post('/api/chat/say', wTry(async b => { await twitch.say(String(b.text || '').slice(0, 490)); return {}; }));
app.post('/api/chat/mod', wTry(async b => {
  const login = String(b.login || '').replace(/^@/, '').toLowerCase();
  if (b.action === 'delete') await twitch.deleteMessage(b.id);
  else if (b.action === 'timeout') await twitch.timeout(login, Number(b.seconds) || 600, b.reason || '');
  else if (b.action === 'ban') await twitch.timeout(login, 0, b.reason || '');
  else if (b.action === 'unban') await twitch.unban(login);
  else throw new Error('Unknown action');
  return {};
}));
app.get('/api/viewer-lookup', (req, res) => { // double-clicked a word: is it someone we know?
  const q = String(req.query.name || '').replace(/^@/, '').trim(), k = q.toLowerCase(), n = norm(q); if (!q) return res.status(404).json({});
  const vs = db.viewers || {}, hit = vs[k] || Object.values(vs).find(v => norm(v.name) === n);
  if (hit) return res.json({ login: hit.login });
  const bank = Object.values(db.wheel?.bank || {}).find(b => norm(b.name) === n || b.login === k); if (bank) return res.json({ login: bank.login });
  const dp = discordPeople().find(p => norm(p.name) === n || norm(p.twitch) === n); if (dp) return res.json({ login: dp.twitch || '', discordId: dp.discordId, name: dp.name });
  res.status(404).json({});
});
app.get('/api/viewer/:login', async (req, res) => {
  const login = String(req.params.login || '').replace(/^@/, '').toLowerCase().replace(/^_$/, ''), n = norm(login);
  const v = (db.viewers || {})[login] || null, w = wheel.W(), bank = w.bank[n] || Object.values(w.bank).find(b => b.login === login) || null;
  const tw = login ? (await twitch.getUsers([login]).catch(() => new Map())).get(login) : null;
  let follow; try { follow = tw?.id ? await twitch.followedAt(tw.id) : undefined; } catch {}
  const discordId = req.query.discordId || Object.entries(db.links || {}).find(([, l]) => String(l).toLowerCase() === login)?.[0] || null;
  const dp = discordId ? discordPeople().find(p => p.discordId === discordId) : null;
  const linkedAt = discordId && db.links?.[discordId] ? (db.linkDates?.[discordId] || null) : null; // (negative = linked before Movie Royal kept dates)
  // 🎡 respins: now, used this stream, and what they had when the stream started
  const since = db.stream?.startedAt || 0, isMe = r => r.by && (String(r.by.login || '').toLowerCase() === login || norm(r.by.name) === n);
  const used = w.history.filter(r => r.by?.source === 'bank' && isMe(r)).map(r => ({ at: r.at, text: r.text, wheel: r.wheelName }));
  const usedNow = used.filter(r => r.at >= since).length, givenNow = w.grants.filter(g => g.at >= since && (g.login === login || norm(g.name) === n)).reduce((a, g) => a + g.amount, 0);
  const spinsNow = bank?.spins || 0;
  const st = (db.stats?.people || {})[n] || (dp ? (db.stats?.people || {})[norm(dp.name)] : null);
  const sum = st ? Object.values(st.k).reduce((a, x) => a.map((y, i) => y + x[i]), [0, 0, 0, 0, 0, 0, 0, 0]) : null;
  const wins = db.history.filter(h => (h.winner?.owner && (norm(h.winner.owner) === n || (dp && norm(h.winner.owner) === norm(dp.name)))) || (h.kind === 'chat' && norm(h.winner?.label) === n)).slice(-30).reverse().map(h => ({ at: h.at, label: h.winner.label, sub: h.winner.sub, list: h.listName }));
  const mon = new Date().toLocaleDateString('en-CA').slice(0, 7), yr = mon.slice(0, 4);
  res.json({
    linked: !!(discordId && db.links?.[discordId]), linkedAt, tracked: chatlog.tracked(login),
    id: db.settings.idOn !== false ? (db.ids?.[login] || null) : null,
    login, name: tw?.name || v?.name || bank?.name || dp?.name || login, avatar: tw?.avatar || null, twitchId: tw?.id || v?.id || null, createdAt: tw?.createdAt || null, about: tw?.about || '',
    followedAt: follow === undefined ? (v?.followedAt || undefined) : follow, url: login ? `https://twitch.tv/${login}` : null,
    sub: v ? { now: !!v.sub, months: v.subMonths || 0 } : null, mod: !!v?.mod, vip: !!v?.vip, streak: chatlog.watchStreak(v), twitchStreak: v?.streak || 0, streams: (v?.watched || []).length, lastStreams: chatlog.lastStreams(v), color: v?.color || null,
    watch: v ? { total: v.watchMins || 0, stream: v.streamKey === (db.stream?.startedAt || 0) ? v.streamWatch || 0 : 0 } : null,
    chats: v ? { stream: v.streamKey === (db.stream?.startedAt || 0) ? v.streamMsgs || 0 : 0, month: v.byMonth?.[mon] || 0, year: v.byYear?.[yr] || 0, total: v.msgs || 0, first: v.first, last: v.last } : null,
    discord: dp ? { id: dp.discordId, name: dp.name, avatar: dp.avatar, movies: dp.active, watched: dp.watched, picksUsed: dp.used, max: dp.max } : null,
    stats: sum ? { battles: sum[0], wins: sum[1], p2: sum[2], p3: sum[3], top5: sum[5], top10: sum[6], luck: Math.round(sum[7] * 10) / 10 } : null, wins,
    spins: { now: spinsNow, usedStream: usedNow, beforeStream: Math.max(0, spinsNow + usedNow - givenNow), gotTotal: bank?.got || 0, usedTotal: bank?.used || 0, used: used.slice(-50).reverse(), grants: w.grants.filter(g => g.login === login || norm(g.name) === n).slice(-50).reverse() },
    log: chatlog.search({ login, days: 120, limit: 200 })
  });
});
app.post('/api/rename', wTry(b => { const r = renameUser(b.from, b.to); wheelChanged(); historyVersion++; pushState(); return r; }));
app.post('/api/wheel/boost', wTry(b => { wheel.onMoney({ name: b.name, amount: b.amount }); return {}; }));
app.post('/api/wheel/boost/:id', wTry((b, req) => wheel.boostAct(req.params.id, b)));
app.post('/api/test/wheel-boost', wTry(b => { if (b.kind === 'bits') wheel.onBits({ bits: Number(b.bits) || 500, login: 'test_viewer', name: 'Test_Viewer' }); else wheel.onSub({ kind: b.kind || 'sub', login: 'test_viewer', name: 'Test_Viewer', tier: 1, recipient: 'someone' }); return {}; }));
app.post('/api/wheel/unvoid', wTry(b => wheel.unvoid(b.entryId, {}, 'by hand', b.wheelId, !!b.force)));
app.post('/api/test/donation', wTry(b => { wheel.onMoney({ name: b.name || 'Test_Donor', amount: Number(b.amount) || 10, source: 'test' }); return {}; }));
app.post('/api/wheel/knock', wTry(b => ({ left: wheel.knock(Number(b.delta) || -1) })));
app.post('/api/wheel/timer', wTry(b => { wheel.roundCmd(b.cmd, b.secs); return { round: wheel.getRound() }; }));
app.get('/api/wheel/undo', (req, res) => res.json(wheel.undoList()));
app.post('/api/wheel/undo', wTry(b => wheel.undoTo(b.id)));
app.post('/api/wheel/folders', wTry(b => { const W0 = wheel.W(), n = String(b.name || '').trim().slice(0, 60); if (b.remove) { W0.folders = W0.folders.filter(f => f !== n); for (const x of W0.wheels) if (x.folder === n) x.folder = ''; } else if (n && !W0.folders.includes(n)) W0.folders.push(n); wheelChanged(); return { folders: W0.folders }; }));
app.post('/api/obs/test', wTry(async () => obs.test()));
// 📺 capture window on stream (Battle tab): shows a window (your browser, a YouTube video…) small in the top-left corner, through OBS
async function setCapture(on) {
  try { await obs.capture(!!on); live.capture = !!on; live.captureError = null; }
  catch (e) { live.captureError = `Couldn't ${on ? 'show' : 'hide'} the capture window: ${e.message}`; console.error('[obs] capture window:', e.message); pushState(); throw new Error(live.captureError); }
  pushState(); return { on: live.capture };
}
app.post('/api/capture', wTry(b => setCapture(b.on)));
// 🃏 card pool + card battles
app.post('/api/cards/search', wTry(async b => cards.searchPacks(b.q)));
app.post('/api/cards/search/stop', wTry(() => cards.stopSearch()));
app.post('/api/cards/add', wTry(b => cards.addPack(b)));
app.post('/api/cards/pack', wTry(b => cards.editPack(b)));
app.post('/api/cards/upload', express.raw({ type: '*/*', limit: '15mb' }), (req, res) => {
  const name = String(req.query.name || 'pack.png'), ext = (name.match(/\.(png|jpe?g|gif|webp)$/i) || [, 'png'])[1].toLowerCase();
  const file = 'pack-' + uid() + '.' + ext; fs.writeFileSync(path.join(UPLOADS, file), req.body); res.json({ ok: true, url: '/uploads/' + file });
});
app.post('/api/cards/battle', wTry(b => cards.saveBattle(b)));
app.post('/api/cards/keep', wTry(b => cards.setKeep(!!b.on)));
app.post('/api/cards/ring-logo', wTry(b => cards.setRingLogo(b.url || '')));
app.post('/api/cards/battle/remove', wTry(b => cards.removeBattle(b.id)));
app.post('/api/cards/active', wTry(b => cards.setActive(b.id)));
app.post('/api/cards/start', wTry(b => { if (wheel.W().show) wheel.setShow(false); return cards.start({ test: !!b.test, n: b.n, map: b.test ? b.map : null }); }));
app.post('/api/cards/stop', wTry(() => cards.stop()));
app.post('/api/cards/reset', wTry(() => cards.reset()));
app.get('/api/cards/piles', (req, res) => res.json(cards.pileState())); // 💀 how many finishers / celebrations are left in each map's pile
app.post('/api/cards/wacky', wTry(b => b.allOff ? cards.wackyOff() : cards.setWacky(b.key, b.on)));
app.post('/api/cards/show', wTry(b => { if (b.show && wheel.W().show) wheel.setShow(false); cards.setShow(!!b.show); return {}; }));
app.post('/api/capture/windows', wTry(async () => obs.captureWindows()));
app.post('/api/capture/settings', wTry(async b => {
  if ('window' in b) db.settings.capWindow = String(b.window || '');
  if ('size' in b) db.settings.capSize = Math.max(10, Math.min(60, Math.round(Number(b.size) || 30)));
  if ('autoHide' in b) db.settings.capAutoHide = !!b.autoHide;
  save(); pushState();
  if (live.capture && ('window' in b || 'size' in b)) await setCapture(true).catch(() => {}); // showing: update it now
  return { window: db.settings.capWindow, size: db.settings.capSize, autoHide: !!db.settings.capAutoHide };
}));
app.post('/api/wheel/mine', wTry(b => { if (b.action === 'reset') { wheel.newStream(); return {}; } if (b.action === 'set') { wheel.W().mine.left = Math.max(0, Math.round(Number(b.left) || 0)); wheelChanged(); return {}; } return wheel.useMine(); }));
app.post('/api/wheel/bank', wTry(b => ({ spins: wheel.giveSpins(b.who, b.n, b.reason) })));
app.post('/api/wheel/grow', wTry(b => ({ pct: wheel.grow(b.entryId, Number(b.amount) || 1, b.who ? { name: String(b.who).slice(0, 40), login: String(b.who).replace(/^@/, '').toLowerCase(), source: b.money ? 'auto' : 'mod' } : {}, b.reason, b.wheelId, !!b.money) })));
app.post('/api/wheel/reset-sizes', wTry(b => { b.undo ? wheel.undoReset(b.wheelId) : wheel.resetSizes(b.wheelId); return {}; }));
app.post('/api/wheel/upload', express.raw({ type: '*/*', limit: '25mb' }), (req, res) => {
  const name = String(req.query.name || 'file.png'), ext = (name.match(/\.(png|jpe?g|gif|webp|mp4|webm|mp3|wav|ogg|m4a)$/i) || [, 'png'])[1].toLowerCase();
  const file = 'wheel-' + uid() + '.' + ext; fs.writeFileSync(path.join(UPLOADS, file), req.body); res.json({ ok: true, url: '/uploads/' + file });
});
app.get('/api/wheel/history', (req, res) => res.json(wheel.history({ wheelId: String(req.query.wheelId || 'all'), limit: Math.min(50000, Number(req.query.limit) || 3000) })));
app.delete('/api/wheel/history/:id', (req, res) => { const w = wheel.W(); w.history = w.history.filter(r => r.id !== req.params.id); wheelChanged(); res.json({ ok: true }); });
app.get('/api/wheel/stats', (req, res) => res.json(wheel.wheelStats({ wheelId: String(req.query.wheelId || 'all'), since: Number(req.query.since) || 0, until: Number(req.query.until) || 0 })));
app.get('/api/stats', (req, res) => res.json(statsView({ mode: String(req.query.mode || 'all'), map: String(req.query.map || 'all'), group: req.query.group === 'entries' ? 'entries' : 'people' })));
app.get('/api/results', (req, res) => res.json(listResults(Math.min(600, Number(req.query.limit) || 100))));
app.get('/api/results/:id', (req, res) => { const d = getResults(req.params.id); d ? res.json(d) : res.status(404).json({ error: 'No results saved for that round (results are kept from version 1.8.0 on).' }); });
app.get('/api/history', (req, res) => {
  const id = req.query.listId;
  const lists = [...new Map(db.history.map(h => [h.listId || h.listName, { id: h.listId || null, name: h.listName }])).values()];
  const rows = db.history.map(normHist).filter(h => !id || id === 'all' || h.listId === id || (!h.listId && getList(id)?.name === h.listName));
  res.json({ rows: rows.reverse(), lists });
});
app.delete('/api/history/:id', (req, res) => { db.history = db.history.filter(h => normHist(h).id !== req.params.id); historyVersion++; save(); pushState(); res.json({ ok: true }); });
app.post('/api/history/clear', (req, res) => {
  const id = req.body?.listId, name = getList(id)?.name;
  db.history = db.history.filter(h => !(h.listId === id || (!h.listId && h.listName === name)));
  historyVersion++; save(); pushState(); res.json({ ok: true });
});

// discord people: reset picks, fix Twitch links, remove a backer
// ---------- people you add yourself (moving over from a wheel) ----------
function addManualPerson(name, twitch) {
  name = String(name || '').trim().slice(0, 40); twitch = String(twitch || '').trim().replace(/^@/, '').toLowerCase();
  if (!name && !twitch) return null;
  if (twitch && !/^[a-z0-9_]{3,25}$/.test(twitch)) throw new Error(`"${twitch}" isn't a valid Twitch username.`);
  // already known (by Twitch name or display name)? reuse them
  const known = discordPeople().find(p => (twitch && p.twitch === twitch) || norm(p.name) === norm(name || twitch));
  if (known) { if (twitch && !db.links[known.discordId]) db.links[known.discordId] = twitch; return known.discordId; }
  const id = 'manual-' + uid();
  db.manualPeople ||= {}; db.manualPeople[id] = { name: name || twitch, twitch: twitch || null };
  if (twitch) db.links[id] = twitch;
  return id;
}
const personUser = id => { const p = discordPeople().find(x => x.discordId === id); return p ? { discordId: id, name: p.name, avatar: p.avatar || null } : null; };
// 👥 Refresh: pull new picks + Twitch links from the 24/7 bot, and look up Discord names for people who linked their Twitch
app.post('/api/people/refresh', async (req, res) => {
  let named = 0, pulled = 0;
  if (cloud.enabled()) { const st = await cloud.sync(true).catch(() => null); pulled = st?.pulled || 0; }
  const tok = db.settings.discordToken, need = Object.keys(db.links || {}).filter(id => !db.linkNames?.[id]?.name && /^\d+$/.test(id));
  if (tok) for (const id of need.slice(0, 50)) {
    try {
      const r = await fetch('https://discord.com/api/v10/users/' + id, { headers: { Authorization: 'Bot ' + tok }, signal: AbortSignal.timeout(8000) });
      if (!r.ok) continue; const u = await r.json();
      (db.linkNames ||= {})[id] = { name: u.global_name || u.username, avatar: u.avatar ? `https://cdn.discordapp.com/avatars/${id}/${u.avatar}.png?size=128` : null }; named++;
    } catch {}
  }
  save(); pushState(); refreshPreview(true);
  res.json({ ok: true, people: discordPeople().length, linked: Object.keys(db.links || {}).length, named, pulled });
});
app.post('/api/people', (req, res) => {
  try { const id = addManualPerson(req.body?.name, req.body?.twitch); if (!id) return res.status(400).json({ error: 'Type a name or a Twitch username.' }); save(); pushState(); res.json({ id }); }
  catch (e) { res.status(400).json({ error: e.message }); }
});
app.post('/api/people/:id/movie', async (req, res) => {
  const u = personUser(req.params.id); if (!u) return res.sendStatus(404);
  try { const r = await suggest(String(req.body?.tmdbId || req.body?.query || ''), u, { force: true }); save(); pushState(); refreshPreview(); res.json(r); }
  catch (e) { res.status(400).json({ error: e.message }); }
});
app.delete('/api/people/:id', (req, res) => { // removes a person you added (and takes them off their movies)
  const id = req.params.id;
  for (const e of getList('movies')?.entries || []) if (e.backers?.some(b => b.discordId === id)) { e.backers = e.backers.filter(b => b.discordId !== id); if (!e.backers.length && e.status === 'active') e.status = 'removed'; }
  if (db.manualPeople) delete db.manualPeople[id]; delete db.links[id]; if (db.picks) delete db.picks[id];
  save(); pushState(); refreshPreview(); res.json({ ok: true });
});
// import from an old wheel. One person per line:  name (or @twitch): Movie One, Movie Two (1999), Movie Three
app.post('/api/people/import', async (req, res) => {
  const lines = String(req.body?.text || '').split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const report = { people: 0, movies: 0, failed: [] };
  for (const line of lines) {
    const m = line.match(/^@?([^:|=-][^:|=]*?)\s*[:|=]\s*(.*)$/);
    if (!m) { report.failed.push(`${line} — use "name: Movie, Movie"`); continue; }
    let who = m[1].trim(), twitch = null;
    const tw = who.match(/^(.*?)\s*\(@?([A-Za-z0-9_]{3,25})\)$/); // "Lucy (lucy_tv)"
    if (tw) { who = tw[1].trim(); twitch = tw[2]; } else if (/^[A-Za-z0-9_]{3,25}$/.test(who)) twitch = who;
    let id; try { id = addManualPerson(who, twitch); } catch (e) { report.failed.push(e.message); continue; }
    report.people++;
    const u = personUser(id) || { discordId: id, name: who };
    for (const title of m[2].split(/\s*[,;]\s*/).filter(Boolean)) {
      try { const r = await suggest(title, u, { force: true }); r.ok ? report.movies++ : report.failed.push(`${who}: ${title} — ${r.msg.replace(/\*\*/g, '')}`); }
      catch (e) { report.failed.push(`${who}: ${title} — ${e.message}`); }
    }
  }
  save(); pushState(); refreshPreview(); res.json(report);
});

app.post('/api/discord/people/:id', (req, res) => {
  const id = req.params.id;
  if (req.body?.picksUsed != null) { db.picks ||= {}; db.picks[id] = Math.max(0, Math.min(99, Math.round(Number(req.body.picksUsed)) || 0)); }
  if (req.body?.name != null && db.manualPeople?.[id]) { const n = String(req.body.name).trim().slice(0, 40); if (n) { db.manualPeople[id].name = n; for (const e of getList('movies')?.entries || []) for (const b of e.backers || []) if (b.discordId === id) b.name = n; } }
  if (req.body?.resetPicks) { db.picks ||= {}; db.picks[id] = 0; }
  if (req.body?.twitch != null) {
    const t = String(req.body.twitch).trim().replace(/^@/, '').toLowerCase();
    if (t && !/^[a-z0-9_]{3,25}$/.test(t)) return res.status(400).json({ error: "That isn't a valid Twitch username." });
    if (t) db.links[id] = t; else delete db.links[id];
    if (db.manualPeople?.[id]) db.manualPeople[id].twitch = t || null;
  }
  save(); refreshPreview(); pushState(); res.json({ ok: true });
});
app.delete('/api/movies/:eid/backers/:did', (req, res) => {
  const e = getList('movies')?.entries.find(x => x.id === req.params.eid);
  if (!e) return res.sendStatus(404);
  const before = e.backers?.length || 0;
  e.backers = (e.backers || []).filter(b => b.discordId !== req.params.did);
  if (e.backers.length < before) { e.weight = Math.max(1, (e.weight || 1) - 1); db.picks ||= {}; db.picks[req.params.did] = Math.max(0, (db.picks[req.params.did] || 0) - 1); }
  save(); pushState(); res.json({ ok: true });
});
app.use(express.static(path.join(ROOT, 'public')));
app.use('/uploads', express.static(UPLOADS));
app.get('/', (req, res) => res.redirect('/control.html'));

app.get('/api/state', (req, res) => res.json(publicState()));

// ---------- desktop app, setup guide, updates ----------
const DESKTOP = !!process.env.MR_DESKTOP;
// where updates come from: your own setting, or the GitHub repo this copy was built from
const updateRepo = () => (db.settings.updateRepo || PKG.updateRepo || '').trim();
function donePage(title, msg) {
  return `<!doctype html><meta charset="utf-8"><title>Movie Royal</title><body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#120a24;color:#f3edff;font:18px Segoe UI,system-ui,sans-serif;text-align:center">
  <div><div style="font-size:64px">✅</div><h1 style="color:#ffc94a;margin:10px 0">${title.replace(/</g, '&lt;')}</h1><p>${msg}</p></div></body>`;
}
app.get('/api/app', (req, res) => res.json({ version: VERSION, desktop: DESKTOP, dataDir: DATA, updateRepo: db.settings.updateRepo || '', defaultRepo: PKG.updateRepo || '', discordInvite: discord.inviteUrl(), guilds: discord.status.guilds || [] }));
app.get('/api/close-check', async (req, res) => { // the Discord bot stops when the app closes (unless the 24/7 bot really has Discord)
  if (DESKTOP && db.settings.discordToken && cloud.enabled()) { await Promise.race([cloud.checkLink(true), new Promise(r => setTimeout(r, 6000))]); }
  res.json({ ask: DESKTOP && !!db.settings.discordToken && (!cloud.enabled() || cloud.status.linked === false) && !backuplink.backupWatching() && db.settings.closeAskBot !== false, /* (a backup bot server is watching: Discord keeps working) */ broken: cloud.enabled() && cloud.status.linked === false, why: cloud.status.linkError || '' });
});
// 🛡️ backup bot server
app.post('/api/backup/switch-back', async (req, res) => { try { const r = await backuplink.switchBack(); pushState(); res.json(r); } catch (e) { res.status(400).json({ error: e.message }); } });
app.post('/api/backup/check', async (req, res) => { const st = await backuplink.tick({ force: true }); pushState(); res.json({ ...st, _ref: undefined, discord: discord.status.state, watching: backuplink.backupWatching() }); });
app.post('/api/backup/token', (req, res) => { // only for you to give to a friend running a backup
  if (!db.settings.discordToken) return res.status(400).json({ error: 'Set up the Discord bot first.' });
  let copied = false; try { copied = !!globalThis.__desktop?.copy?.(db.settings.discordToken); } catch {}
  res.json({ token: db.settings.discordToken, copied });
});
app.post('/api/backup/add-here', async (req, res) => { // 🛡️ one click: put my bot in Movie Royal Backup Bots on this PC (it reads the token from Movie Royal itself)
  if (!db.settings.discordToken) return res.status(400).json({ error: 'Set up the Discord bot first.' });
  try {
    const r = await fetch('http://127.0.0.1:3747/api/add-mine', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}', signal: AbortSignal.timeout(20000) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return res.status(400).json({ error: /already on the list/.test(j.error || '') ? 'Your bot is already in Movie Royal Backup Bots on this PC.' : j.error || 'The backup app said no.' });
    setTimeout(() => backuplink.tick({ force: true }).then(pushState).catch(() => {}), 15000);
    res.json({ ok: true, tag: j.tag });
  } catch { res.status(400).json({ error: "Movie Royal Backup Bots isn't open on this PC. Install it (its own installer on the release page), open it, then press this again." }); }
});
app.post('/api/cloud/check', async (req, res) => { const st = await cloud.checkLink(true); pushState(); res.json({ enabled: cloud.enabled(), linked: st.linked, botUp: st.botUp, error: st.linkError || st.lastError || null, lastSync: st.lastSync, botV: st.botV || null, relinked: st.relinked || null }); }); // the Discord bot stops when the app closes
app.post('/api/app/quit', (req, res) => { if (req.body?.dontAsk) { db.settings.closeAskBot = false; save(); } res.json({ ok: true }); setTimeout(() => globalThis.__desktop?.quit(), 300); });
app.post('/api/window', (req, res) => { const a = String(req.body?.action || ''); if (['window', 'borderless', 'fullscreen'].includes(a)) { db.settings.windowMode = a; save(); } globalThis.__desktop?.windowAction?.(a); res.json({ ok: !!globalThis.__desktop }); }); // 🖥️ window mode / minimize / close (borderless has no title bar)
app.post('/api/refocus', (req, res) => { globalThis.__desktop?.refocus?.(); res.json({ ok: true }); });
app.post('/api/open-data-folder', (req, res) => { globalThis.__desktop?.openPath?.(DATA); res.json({ ok: !!globalThis.__desktop }); });
app.post('/api/test/tmdb', async (req, res) => {
  try { const r = await searchMovies('Jaws'); res.json({ ok: r.length > 0, sample: r[0] ? `${r[0].title} (${r[0].year})` : null }); }
  catch (e) { res.json({ ok: false, error: /401/.test(e.message) ? "TMDB said the key is wrong. Copy the long 'API Read Access Token' and paste it again." : e.message }); }
});
app.post('/api/test/letterboxd', async (req, res) => {
  if (req.body?.user != null) { db.settings.letterboxdUser = String(req.body.user).trim(); save(); }
  await Promise.all([lb.refreshRss(db.settings.letterboxdUser), lb.refreshProfile(db.settings.letterboxdUser)]); const n = sweepWatched(); pushState();
  const st = lb.stats(); res.json({ ok: st.count > 0, ...st, retired: n });
});
const newer = (a, b) => { const x = String(a).replace(/^v/, '').split('.').map(Number), y = String(b).replace(/^v/, '').split('.').map(Number); for (let i = 0; i < 3; i++) { if ((x[i] || 0) > (y[i] || 0)) return true; if ((x[i] || 0) < (y[i] || 0)) return false; } return false; };
// updates: everyone gets the LATEST release; turn on "test builds" in Settings to also get pre-releases
const repoName = () => updateRepo().replace(/^https?:\/\/github\.com\//, '').replace(/\/$/, '');
async function ghReleases() {
  const r = await fetch(`https://api.github.com/repos/${repoName()}/releases?per_page=60`, { headers: { 'User-Agent': 'MovieRoyal' }, signal: AbortSignal.timeout(10000) });
  if (!r.ok) throw new Error(r.status === 404 ? 'No releases found for ' + repoName() : 'GitHub ' + r.status);
  return (await r.json()).filter(x => !x.draft).map(x => ({ tag: x.tag_name, version: x.tag_name.replace(/^v/, ''), name: x.name, pre: !!x.prerelease, at: x.published_at, notes: x.body || '', url: ((x.assets || []).find(a => /^MovieRoyal-Setup.*\.exe$/i.test(a.name)) || (x.assets || []).find(a => /\.exe$/i.test(a.name) && !/backup/i.test(a.name)))?.browser_download_url || null, page: x.html_url }));
}
app.get('/api/update/check', async (req, res) => {
  if (!repoName()) return res.json({ configured: false, version: VERSION });
  try {
    const beta = !!db.settings.betaUpdates, list = (await ghReleases()).filter(x => x.url && (beta || !x.pre));
    const best = list.reduce((a, x) => !a || newer(x.version, a.version) ? x : a, null);
    res.json({ configured: true, version: VERSION, beta, latest: best?.tag, pre: !!best?.pre, available: !!best && newer(best.version, VERSION), url: best?.url, notes: (best?.notes || '').slice(0, 1500) });
  } catch (e) { res.json({ configured: true, version: VERSION, error: e.message }); }
});
app.get('/api/update/releases', async (req, res) => { try { res.json({ version: VERSION, releases: (await ghReleases()).filter(x => x.url) }); } catch (e) { res.json({ version: VERSION, error: e.message, releases: [] }); } });
// 📝 patch notes: the notes of every LATEST release (from GitHub), with the copy that came with this version as a backup
// 🆕 when an update adds something you have to set up (like an account), say so once after updating
const NEW_SETUP = [
  { id: 'donations', since: '1.11.0', title: '💵 Donations', why: 'Connect StreamElements or Streamlabs so tips pop up for the wheel.', done: () => !!(db.settings.seJwt || db.settings.slToken) },
  { id: 'twitch', since: '1.12.0', title: '💜 Sign in with Twitch again', why: 'Gives Movie Royal the new chat permissions: delete messages, timeouts, bans and watch time in the 💬 Chat tab.', done: () => ['moderator:manage:banned_users', 'moderator:manage:chat_messages', 'moderator:read:chatters'].every(x => (twitch.status.scopes || []).includes(x)) || !db.owner }
];
app.get('/api/cloud/outdated', async (req, res) => { // ☁️ the "Update your 24/7 Discord bot" pop-up: only when the bot on Cloudflare really is older than this version
  if (req.query.test) return res.json({ outdated: true, v: cloud.botVersion(), test: true }); // 🧪 Test tab: show the pop-up
  try {
    const out = await cloud.botOutdated();
    res.json({ outdated: out && db.settings.botRemind !== false, v: cloud.botVersion(), unknown: cloud.enabled() && !cloud.versionKnown() });
  } catch { res.json({ outdated: false, unknown: true }); }
});
// 🧭 the Setup guide's steps (setup.html has the pages). A step added since you last opened the guide pops up when the app starts,
// every time, until you open the guide, set it up, or press "Don't show again". (since = the version that added it)
const GUIDE_STEPS = [
  { id: 'twitch', title: '💜 Sign in with Twitch' }, { id: 'rewards', title: '💎 Channel points & bits' }, { id: 'tmdb', title: '🎬 Movie search' }, { id: 'omdb', title: '🍅 Ratings' },
  { id: 'letterboxd', title: '📗 Letterboxd' }, { id: 'discord', title: '🤖 Discord bot' }, { id: 'cloud', title: '☁️ 24/7 Discord bot' }, { id: 'donations', title: '💵 Donations' },
  { id: 'stream', title: '📺 Put it on stream' }, { id: 'obs', title: '🎥 OBS control' },
  { id: 'choice', since: '1.38.0', title: "🎉 Viewer's Choice in OBS", why: "Confetti, balloons and a big pop-up on stream when someone redeems Viewer's Choice. Works with just OBS open.", done: () => !!db.settings.choiceObs }
];
function guideSeen() {
  if (!Array.isArray(db.settings.setupStepsSeen)) { const was = db.settings.lastSeenVersion || '1.10.0'; db.settings.setupStepsSeen = GUIDE_STEPS.filter(x => !x.since || !newer(x.since, was)).map(x => x.id); save(); } // (first time: the steps you already had count as seen)
  return new Set(db.settings.setupStepsSeen);
}
app.post('/api/setup/seen', (req, res) => { const seen = guideSeen(); for (const id of Array.isArray(req.body?.ids) ? req.body.ids : GUIDE_STEPS.map(x => x.id)) seen.add(String(id)); db.settings.setupStepsSeen = [...seen]; save(); res.json({ ok: true }); });
app.get('/api/whatsnew', (req, res) => {
  const from = db.settings.lastSeenVersion || '1.10.0';
  if (!db.settings.setupSeen) { db.settings.lastSeenVersion = VERSION; db.settings.setupStepsSeen = GUIDE_STEPS.map(x => x.id); save(); return res.json({ steps: [] }); }
  const seen = guideSeen();
  const steps = NEW_SETUP.filter(x => newer(x.since, from) && !newer(x.since, VERSION) && !x.done()).map(({ id, title, why }) => ({ id, title, why }));
  for (const x of GUIDE_STEPS) if (!seen.has(x.id) && !x.done?.() && !steps.some(y => y.id === x.id)) steps.push({ id: x.id, title: x.title, why: x.why || '', guide: true }); // 🆕 new in the Setup guide
  db.settings.lastSeenVersion = VERSION; save();
  res.json({ from, to: VERSION, steps });
});
app.get('/api/patchnotes', async (req, res) => {
  let local = ''; try { local = fs.readFileSync(path.join(ROOT, 'PATCHNOTES.md'), 'utf8'); } catch {}
  let releases = []; try { releases = (await ghReleases()).filter(x => !x.pre).map(x => ({ tag: x.tag, at: x.at, notes: x.notes })); } catch {}
  res.json({ version: VERSION, local, releases });
});
function runInstaller(file, res) {
  if (!DESKTOP || process.platform !== 'win32') return res.status(400).json({ error: 'Updates install from the Windows app.' });
  // run the installer quietly, then open Movie Royal again once it's done (a little helper script waits for it)
  const exe = process.execPath, bat = path.join(os.tmpdir(), 'MovieRoyal-Update.cmd');
  fs.writeFileSync(bat, `@echo off\r\nstart "" /wait "${file}" /UPDATE\r\ntimeout /t 2 /nobreak >nul\r\nstart "" "${exe}"\r\n`); // the installer shows its progress bar, then closes by itself
  const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => !/^ELECTRON_/i.test(k)));
  spawn('cmd.exe', ['/c', bat], { detached: true, stdio: 'ignore', windowsHide: true, env }).unref();
  res.json({ ok: true });
  setTimeout(() => globalThis.__desktop?.quit(), 600);
}
app.post('/api/update/install-file', express.raw({ type: '*/*', limit: '500mb' }), (req, res) => {
  if (!req.body?.length || req.body.slice(0, 2).toString() !== 'MZ') return res.status(400).json({ error: "That isn't a Movie Royal installer (.exe)." });
  const file = path.join(os.tmpdir(), 'MovieRoyal-Update.exe');
  fs.writeFileSync(file, req.body); runInstaller(file, res);
});
app.post('/api/update/install-latest', async (req, res) => {
  try {
    const url = String(req.body?.url || '');
    if (!/^https:\/\/github\.com\//.test(url)) return res.status(400).json({ error: 'Bad update link' });
    const r = await fetch(url); if (!r.ok) throw new Error('Download failed (' + r.status + ')');
    const file = path.join(os.tmpdir(), 'MovieRoyal-Update.exe');
    // download with a progress bar in the app (the control panel shows how far along it is)
    const total = Number(r.headers.get('content-length')) || 0, chunks = []; let got = 0, last = 0;
    const tell = stage => broadcast({ type: 'updProgress', stage, got, total }, 'control');
    tell('download');
    for await (const ch of r.body) { chunks.push(ch); got += ch.length; if (Date.now() - last > 250) { last = Date.now(); tell('download'); } }
    tell('install');
    fs.writeFileSync(file, Buffer.concat(chunks)); runInstaller(file, res);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

const RESTART_DISCORD = ['discordToken', 'discordClientId', 'discordGuildId'];
const RESTART_TWITCH = ['twitchClientId', 'twitchClientSecret', 'twitchChannel'];
app.post('/api/settings', (req, res) => {
  const body = req.body || {};
  let rd = false, rt = false, rl = false; const rdName = db.settings.discordChannelName, mapWas = db.settings.map, colWas = db.settings.colorsOn;
  for (const [k, v] of Object.entries(body)) {
    if (!(k in db.settings)) continue;
    if (typeof v === 'string' && v.startsWith('••••••')) continue; // masked, unchanged
    if (JSON.stringify(db.settings[k]) === JSON.stringify(v)) continue;
    db.settings[k] = v;
    if (RESTART_DISCORD.includes(k)) rd = true;
    if (RESTART_TWITCH.includes(k)) rt = true;
    if (k === 'letterboxdUser') rl = true;
    if (k === 'seJwt' || k === 'slToken') startDonationFeed();
  }
  if ('weekStart' in body && db.week) db.week.key = weekKey(); // changing the start day never resets anyone mid-week
  if (['maxPerUser', 'banCurrentYear', 'luckOn', 'twitchMoviesCommand', 'streamerName', 'ideasDoc', 'banAsk'].some(k => k in body)) discord.refreshPinned?.();
  if ('discordChannelName' in body && body.discordChannelName !== undefined && rdName !== db.settings.discordChannelName) rd = true; // makes/finds the new channel
  if ('spotName' in body) for (const e of getList('movies')?.entries || []) if (e.kind === 'spot') e.label = `${db.settings.spotName || 'Kirb'}'s Pick`;
  if ('map' in body && db.settings.map !== 'random' && !mapById(db.settings.map)) db.settings.map = 'random';
  if (mapWas !== db.settings.map) { live.map = null; live.mapUsed = false; if (live.phase === 'idle') refreshPreview(true); }
  if (colWas !== db.settings.colorsOn && live.phase === 'idle') refreshPreview();
  save();
  globalThis.__desktop?.applySettings?.({ runInBackground: db.settings.runInBackground !== false, startWithWindows: !!db.settings.startWithWindows, muteUnfocused: db.settings.muteUnfocused !== false, windowMode: db.settings.windowMode || 'window' });
  broadcast(audioMsg(), 'overlay'); broadcast(audioMsg(), 'celebrate'); broadcast(camMsg(), 'overlay'); broadcast(gfxMsg(), 'overlay');
  if (rd) discord.start(pushState);
  if (rt) twitch.start(twitchHandlers);
  if (rl) Promise.all([lb.refreshRss(db.settings.letterboxdUser), lb.refreshProfile(db.settings.letterboxdUser)]).then(() => { sweepWatched(); pushState(); });
  pushState();
  res.json({ ok: true });
});

// ---------- 📤 share files: send a wheel or a battle to another streamer (they open it with 📥 Import) ----------
const MIME = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml', mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg', m4a: 'audio/mp4' };
function packFile(p) { // your own pictures / sounds go inside the file, so they work on someone else's computer too
  if (!/^\/uploads\/[\w.-]+$/.test(p || '')) return p || '';
  try { const f = path.join(UPLOADS, path.basename(p)), ext = path.extname(f).slice(1).toLowerCase(); if (!MIME[ext] || fs.statSync(f).size > 8e6) return ''; return `data:${MIME[ext]};base64,` + fs.readFileSync(f).toString('base64'); } catch { return ''; }
}
function unpackFile(v) {
  const m = /^data:([\w/+.-]+);base64,(.+)$/s.exec(v || ''); if (!m) return /^https?:\/\//.test(v || '') ? v : '';
  const ext = Object.entries(MIME).find(([, t]) => t === m[1])?.[0]; if (!ext) return '';
  const file = 'shared-' + uid() + '.' + ext; fs.writeFileSync(path.join(UPLOADS, file), Buffer.from(m[2], 'base64')); return '/uploads/' + file;
}
const shareName = s => String(s || 'movie-royal').replace(/[^\w -]+/g, '').trim().replace(/\s+/g, '-').slice(0, 60) || 'movie-royal';
app.get('/api/wheel/:id/export', (req, res) => {
  const w = wheel.getWheel(req.params.id); if (!w) return res.sendStatus(404);
  const entries = w.entries.filter(e => e.type !== 'void').map(e => { const x = { ...e, voided: null, image: packFile(e.image), sound: packFile(e.sound) }; delete x.id; if (x.type === 'timermax') { x.wins = 0; if (x.maxedOff) { x.on = true; x.maxedOff = false; } } if (x.type === 'countdown' || x.type === 'autocount' || x.type === 'timercount') x.count = x.countStart; return x; });
  const out = { movieRoyal: 'wheel', v: 1, from: streamerName(), app: VERSION, wheel: { name: w.name, title: w.title, spinSecs: w.spinSecs, removeWinner: w.removeWinner, palette: w.palette, look: w.look, opts: w.opts, entries } };
  res.attachment(`${shareName(w.name)}.movieroyal-wheel.json`); res.type('application/json'); res.send(JSON.stringify(out, null, 1));
});
app.get('/api/lists/:id/export', (req, res) => {
  const l = getList(req.params.id); if (!l) return res.sendStatus(404);
  const keep = ['label', 'sub', 'weight', 'tmdbId', 'poster', 'details', 'twitch', 'kind'];
  const entries = l.entries.filter(e => ['active', 'paused', 'benched', 'away'].includes(e.status || 'active') && e.kind !== 'spot').map(e => { const x = {}; for (const k of keep) if (e[k] != null) x[k] = e[k]; if (e.image) x.image = packFile(e.image); if (l.type === 'movies' && e.backers?.[0]) x.pickedBy = e.backers[0].name; return x; });
  const out = { movieRoyal: 'battle', v: 1, from: streamerName(), app: VERSION, battle: { name: l.type === 'movies' ? `${streamerName()}'s Discord movies` : l.name, type: l.type === 'movies' ? 'films' : l.type, screenTitle: l.screenTitle || '', bestOf: l.bestOf || 1, entries } };
  res.attachment(`${shareName(out.battle.name)}.movieroyal-battle.json`); res.type('application/json'); res.send(JSON.stringify(out, null, 1));
});
app.post('/api/share/import', (req, res) => { // open a share file: makes a NEW wheel or battle (nothing of yours is changed)
  let j; try { j = JSON.parse(String(req.body?.text || '').replace(/^\uFEFF/, '')); } catch { return res.status(400).json({ error: "That isn't a Movie Royal share file." }); }
  if (j?.movieRoyal === 'wheel' && j.wheel) {
    const s = j.wheel, w = wheel.newWheel(s.name || 'Shared wheel', (s.entries || []).map(e => ({ ...e, image: unpackFile(e.image), sound: unpackFile(e.sound) })), { title: s.title || '', spinSecs: s.spinSecs || 10, removeWinner: !!s.removeWinner, palette: s.palette || null, ...(s.look ? { look: s.look } : {}), opts: wheel.mergeOpts(s.opts) });
    wheel.syncVoid(w); wheel.W().wheels.push(w); wheel.W().activeId = w.id; wheelChanged();
    return res.json({ ok: true, kind: 'wheel', id: w.id, name: w.name, count: w.entries.length, from: j.from || '' });
  }
  if (j?.movieRoyal === 'battle' && j.battle) {
    const b = j.battle, type = ['text', 'pics', 'chat', 'films'].includes(b.type) ? b.type : 'text';
    const l = { id: uid(), name: String(b.name || 'Shared battle').slice(0, 60), type, entries: [], joinOpen: false, screenTitle: String(b.screenTitle || '').slice(0, 60), bestOf: [1, 3, 5, 7, 9].includes(b.bestOf) ? b.bestOf : 1 };
    for (const e of (b.entries || []).slice(0, 5000)) { if (!e?.label) continue; const x = { id: uid(), label: String(e.label).slice(0, 120), sub: String(e.sub || '').slice(0, 40), weight: Math.max(0.1, Math.min(1000, Number(e.weight) || 1)), status: 'active', addedAt: Date.now() }; for (const k of ['tmdbId', 'poster', 'details', 'twitch']) if (e[k] != null) x[k] = e[k]; if (e.image) x.image = unpackFile(e.image); l.entries.push(x); }
    db.lists.push(l); db.activeListId = l.id; leaveEnded(); save(); pushState(); refreshPreview(true);
    return res.json({ ok: true, kind: 'battle', id: l.id, name: l.name, count: l.entries.length, from: j.from || '' });
  }
  res.status(400).json({ error: "That isn't a Movie Royal share file." });
});

// lists
app.post('/api/lists', (req, res) => {
  const { name, type } = req.body;
  if (!['text', 'pics', 'chat', 'films'].includes(type)) return res.status(400).json({ error: 'bad type' });
  const l = { id: uid(), name: (name || 'New list').slice(0, 60), type, entries: [], joinOpen: false };
  db.lists.push(l); db.activeListId = l.id; leaveEnded(); save(); pushState(); refreshPreview(true); res.json(l);
});
app.patch('/api/lists/:id', (req, res) => {
  const l = getList(req.params.id); if (!l) return res.sendStatus(404);
  if (req.body.name != null) l.name = String(req.body.name).slice(0, 60);
  if (req.body.joinOpen != null) l.joinOpen = !!req.body.joinOpen;
  if (req.body.chars != null) { l.chars = !!req.body.chars; refreshPreview(); } // 🧍 characters instead of balls (this battle)
  if (req.body.charIds != null) { l.charIds = !!req.body.charIds; refreshPreview(); } // 👫 use chat's !id for the characters (off = everyone non-binary)
  if (req.body.watchLuck && typeof req.body.watchLuck === 'object') { // 👀 watch luck: every N hours watched (counted from when it's turned on) = +X% luck in this battle
    const w = req.body.watchLuck, cur = l.watchLuck ||= { on: false, hours: 10, amount: 1, since: 0, base: {} };
    const snap = () => { cur.since = Date.now(); cur.base = Object.fromEntries(Object.entries(db.viewers || {}).filter(([, v]) => v.watchMins > 0).map(([k, v]) => [k, v.watchMins])); }; // (watch time before today doesn't count)
    if (w.on != null) { if (w.on && !cur.on) snap(); cur.on = !!w.on; }
    if (w.hours != null) cur.hours = Math.max(1, Math.min(500, Math.round(Number(w.hours) || 10)));
    if (w.amount != null) cur.amount = Math.max(1, Math.min(100, Math.round(Number(w.amount) || 1)));
    if (w.restart) snap();
    refreshPreview();
  }
  if (req.body.bestOf != null && l.type !== 'movies') { l.bestOf = [1, 3, 5, 7, 9].includes(Number(req.body.bestOf)) ? Number(req.body.bestOf) : 1; if (live.series?.listId === l.id) live.series = null; if (l.giveaway) giveawaySettings().bestOf = l.bestOf; }
  if (req.body.screenTitle != null) { l.screenTitle = String(req.body.screenTitle).slice(0, 60); refreshPreview(); }
  if (req.body.fun && typeof req.body.fun === 'object' && l.type === 'chat') { // 🎉 fun mode for chat battles
    const f = req.body.fun, cur = l.fun ||= { powerups: false, wacky: {} };
    if (f.powerups != null) cur.powerups = !!f.powerups;
    if (f.wacky && typeof f.wacky === 'object') for (const k of ['bouncy', 'lowgrav', 'sizes', 'disco', 'chaos', 'bigheads', 'slippery', 'swappy', 'speedy', 'googly']) if (k in f.wacky) cur.wacky[k] = !!f.wacky[k];
    if (f.powersOff && typeof f.powersOff === 'object') { cur.powersOff ||= {}; for (const k of Object.keys(POWER_INFO)) if (k in f.powersOff) cur.powersOff[k] = !!f.powersOff[k]; } // each power-up on/off
    syncRewards(); refreshPreview();
  }
  save(); pushState(); res.json({ ok: true });
});
app.delete('/api/lists/:id', (req, res) => {
  if (req.params.id === 'movies') return res.status(400).json({ error: "The Discord movie list can't be deleted" });
  db.lists = db.lists.filter(l => l.id !== req.params.id);
  if (db.activeListId === req.params.id) db.activeListId = 'movies';
  save(); pushState(); res.json({ ok: true });
});
app.post('/api/active', (req, res) => { if (getList(req.body.id) && req.body.id !== db.activeListId) { db.activeListId = req.body.id; leaveEnded(); } save(); pushState(); refreshPreview(true); res.json({ ok: true }); });

app.post('/api/lists/:id/bulk', async (req, res) => {
  const l = getList(req.params.id); if (!l) return res.sendStatus(404);
  const items = parseLines(req.body.text);
  const report = { added: 0, failed: [] };
  if (l.type === 'films' && req.body.plain) { // 📝 plain text (not movies) in a custom movie battle
    for (const it of items) { addEntry(l, it); report.added++; }
  } else if (l.type === 'films') {
    for (const it of items) {
      try { const e = await addFilm(l, it.label); e.weight = it.weight; report.added++; } catch (err) { report.failed.push(`${it.label}: ${err.message}`); }
    }
  } else if (l.type === 'movies') {
    for (const it of items) {
      try { const r = await suggest(it.label, null); if (r.ok) { if (it.weight !== 1) r.entry.weight = it.weight; report.added++; } else report.failed.push(`${it.label}: ${r.msg.replace(/\*\*/g, '')}`); }
      catch (e) { report.failed.push(`${it.label}: ${e.message}`); }
    }
  } else {
    for (const it of items) {
      if (l.type === 'chat') addEntry(l, { label: it.label.replace(/^@/, ''), weight: it.weight, twitch: it.label.replace(/^@/, '').toLowerCase() });
      else addEntry(l, it);
      report.added++;
    }
    if (l.type === 'chat') fillTwitchAvatars(l);
  }
  save(); pushState(); res.json(report);
});

app.post('/api/lists/:id/upload', express.raw({ type: '*/*', limit: '15mb' }), (req, res) => {
  const l = getList(req.params.id); if (!l) return res.sendStatus(404);
  const name = String(req.query.name || 'image.png');
  const ext = (name.match(/\.(png|jpe?g|gif|webp)$/i) || [, 'png'])[1].toLowerCase();
  const file = uid() + '.' + ext;
  fs.writeFileSync(path.join(UPLOADS, file), req.body);
  const label = name.replace(/\.\w+$/, '').replace(/[-_]+/g, ' ').trim().slice(0, 80) || 'Picture';
  addEntry(l, { label, image: '/uploads/' + file });
  save(); pushState(); res.json({ ok: true });
});

app.patch('/api/lists/:id/entries/:eid', (req, res) => {
  const l = getList(req.params.id); const e = l?.entries.find(x => x.id === req.params.eid);
  if (!e) return res.sendStatus(404);
  if (req.body.weight != null) e.weight = Math.max(0.1, Math.min(1000, Math.round(Number(req.body.weight) * 10) / 10 || 1));
  if (req.body.label != null && l.type !== 'movies') { e.label = String(req.body.label).slice(0, 80); setTimeout(() => refreshPreview(), 0); }
  if (req.body.status) setTimeout(() => refreshPreview(), 0);
  if (req.body.status) {
    if (l.type === 'movies' && req.body.status === 'watched' && e.status !== 'watched' && e.backers?.[0]) e.luckSnap = resetLuckFor(e.backers[0].discordId); // watched: that person's luck starts over
    if (l.type === 'movies' && req.body.status !== 'watched' && e.status === 'watched' && e.luckSnap) { giveLuckBack(e.luckSnap); delete e.luckSnap; }
    if (l.type === 'movies' && req.body.status === 'watched' && e.status !== 'watched') setTimeout(() => watchedElsewhere(e), 0); // watched outside a battle: they get a free replacement pick
    if (l.type === 'movies' && req.body.status !== 'watched' && e.status === 'watched') unwatchedElsewhere(e);
    if (l.type === 'movies' && e.tmdbId) { if (req.body.status === 'watched') lb.markWatched({ title: e.label, year: e.sub, tmdbId: e.tmdbId }); else if (e.status === 'watched') lb.unmarkWatched({ title: e.label, year: e.sub, tmdbId: e.tmdbId }); }
    if (req.body.status === 'active' && ['benched', 'paused', 'away'].includes(e.status) && req.body.force !== false) e.forceIn = true; // you put it back yourself: skips cooldowns and the chat check
    else if (req.body.status !== 'active') delete e.forceIn;
    e.status = req.body.status;
  }
  save(); pushState(); res.json({ ok: true });
});
app.post('/api/lists/:id/resume-all', (req, res) => { // bring every paused item back
  const l = getList(req.params.id); if (!l) return res.sendStatus(404);
  let n = 0; for (const e of l.entries) if (e.status === 'paused') { e.status = 'active'; n++; }
  save(); pushState(); refreshPreview(); res.json({ back: n });
});
app.post('/api/lists/:id/reset-entries', (req, res) => { // ↺ Reset entries (Battle tab): empty the battle so its list starts over
  const l = getList(req.params.id); if (!l) return res.sendStatus(404);
  if (l.type === 'movies') return res.status(400).json({ error: "The Discord movie battle is everyone's picks, so it can't be emptied from here. Take movies out in the 🎬 Movie Pool tab." });
  if (live.phase === 'lobby' || live.phase === 'running') return res.status(400).json({ error: 'A battle is going. Reset entries once it ends.' });
  let n = 0;
  for (const e of l.entries) if (e.status === 'active') { e.status = 'paused'; n++; } // everything is paused, nothing deleted: it stays in the pool list, darker (▶ brings one back)
  save(); pushState(); refreshPreview(true); res.json({ ok: true, n, type: l.type });
});
app.post('/api/lists/:id/reset-odds', (req, res) => {
  const l = getList(req.params.id); if (!l) return res.sendStatus(404);
  for (const e of l.entries) e.weight = l.type === 'movies' ? Math.max(1, e.backers?.length || 1) : 1;
  save(); pushState(); res.json({ ok: true });
});
app.post('/api/lists/:id/clear', (req, res) => {
  const l = getList(req.params.id); if (!l) return res.sendStatus(404);
  l.entries.forEach(e => { if (e.status === 'active') e.status = 'paused'; }); // paused, never deleted: they stay in the pool list, darker
  save(); pushState(); res.json({ ok: true });
});
app.post('/api/lists/:id/restore', (req, res) => { // bring back everything taken out
  const l = getList(req.params.id); if (!l) return res.sendStatus(404);
  if (l.type !== 'movies') l.entries.forEach(e => { e.status = 'active'; });
  else l.entries.forEach(e => { if (e.status === 'removed' || e.status === 'paused') e.status = 'active'; }); // Discord movies: only the ones you paused or took out (watched ones stay watched)
  save(); pushState(); refreshPreview(true); res.json({ ok: true });
});

app.post('/api/chatters/link', (req, res) => { // "this chatter is that person"
  const login = String(req.body?.login || '').toLowerCase(), id = String(req.body?.discordId || '');
  if (!/^[a-z0-9_]{2,25}$/.test(login) || !id) return res.status(400).json({ error: 'Pick a person' });
  db.links[id] = login; if (db.manualPeople?.[id]) db.manualPeople[id].twitch = login;
  const st = stream(); if (!st.active.includes(id)) st.active.push(id);
  save(); pushState(); refreshPreview(); res.json({ ok: true });
});
app.post('/api/stream/new', (req, res) => { db.stream = { day: todayKey(), active: [] }; save(); pushState(); refreshPreview(); res.json({ ok: true }); });
app.post('/api/stream/toggle', (req, res) => {
  const st = stream(), id = String(req.body?.discordId || '');
  st.active = st.active.includes(id) ? st.active.filter(x => x !== id) : [...st.active, id];
  save(); pushState(); refreshPreview(); res.json({ ok: true, active: st.active.includes(id) });
});
app.post('/api/rollcall/start', (req, res) => {
  if (live.phase === 'lobby' || live.phase === 'running') return res.status(400).json({ error: 'Wait for the fight to finish first.' });
  const people = rollcallPeople();
  if (!people.length) return res.status(400).json({ error: 'Nobody has a movie in the pool right now.' });
  if (live.rollcall) clearTimeout(live.rollcall.timer);
  if (live.claim) { clearTimeout(live.claim.timer); live.claim = null; }
  const seconds = Math.max(10, Number(req.body?.seconds) || 120);
  live.rollcall = { people, endsAt: Date.now() + seconds * 1000, done: false };
  live.rollcall.timer = setTimeout(endRollcall, seconds * 1000);
  // anyone who already typed in the last 15 seconds counts
  for (const m of live.chatLog.filter(m => Date.now() - m.at < 15000)) { const p = people.find(x => !x.here && chatMatches(x, m)); if (p) p.here = true; }
  broadcast({ type: 'rollcallStart', seconds, people: people.map(p => ({ key: p.key, name: p.name, avatar: proxied(p.avatar), here: p.here, movies: p.entries.length })) }, 'overlay');
  pushState(); res.json({ ok: true });
});
app.post('/api/rollcall/checkin', (req, res) => { const p = live.rollcall?.people.find(x => x.key === req.body?.key); if (p && !live.rollcall.done && !p.here) checkIn(p); res.json({ ok: true }); });
app.post('/api/rollcall/end', (req, res) => { endRollcall(); res.json({ ok: true }); });
app.post('/api/rollcall/cancel', (req, res) => { if (live.rollcall) clearTimeout(live.rollcall.timer); live.rollcall = null; broadcast({ type: 'rollcallClose' }, 'overlay'); pushState(); res.json({ ok: true }); });
app.post('/api/rollcall/close', (req, res) => { live.rollcall = null; broadcast({ type: 'rollcallClose' }, 'overlay'); pushState(); res.json({ ok: true }); });
app.post('/api/rollcall/restore', (req, res) => { const n = restoreAway(); live.rollcall = null; broadcast({ type: 'rollcallClose' }, 'overlay'); pushState(); refreshPreview(); res.json({ back: n }); });
app.post('/api/movies/reset-spots', (req, res) => { rollWeek(); const r = resetSpots(); pushState(); refreshPreview(true); res.json(r); });
app.post('/api/movies/spots', (req, res) => { rollWeek(); const n = addSpots(); pushState(); res.json({ added: n, spotWon: !!db.week?.spotWon }); });
app.post('/api/movies/new-week', (req, res) => { const r = newWeek(); pushState(); res.json(r); });
// ---------- custom movie lists ("Movies" battles: your own picks, full winner screen) ----------
async function addFilm(l, value) {
  let id = String(value);
  if (!/^\d+$/.test(id)) { const r = await searchMovies(id); if (!r.length) throw new Error('not found on TMDB'); id = String(r[0].id); }
  const m = await tmdbMovie(id);
  if (l.entries.some(e => String(e.tmdbId) === String(m.id) && e.status === 'active')) throw new Error('already in this list');
  const e = { id: 'film-' + m.id + '-' + uid().slice(0, 4), tmdbId: m.id, label: m.title, sub: m.year, poster: m.poster, weight: 1, status: 'active', addedAt: Date.now(),
    details: { director: m.director, cast: m.cast, genres: m.genres, synopsis: m.synopsis, runtime: m.runtime, collection: m.collection, imdbId: m.imdbId } };
  l.entries.push(e); return e;
}
// 💩 a battle pool made from a Letterboxd page (default: the 500 lowest rated films). "🔄 Update from Letterboxd" fetches it again:
// new films come in, films that dropped off the list leave, everything else (odds, paused…) stays as you set it.
async function syncLetterboxdList(l) {
  const src = l.source || {}; l.job = { running: true, step: 'Reading Letterboxd…', done: 0, total: 0, at: Date.now() }; pushState();
  try {
    const english = src.english !== false, max = src.max || 500;
    let films = await lb.fetchFilmList(src.url || lb.WORST_URL, english ? max * 3 : max, (page, n) => { l.job.step = `Reading Letterboxd… page ${page} (${n} films)`; pushState(); }); // English only: read extra, since some get skipped
    const cache = (db.lbTmdb ||= {}); let added = 0, gone = 0, missed = [], foreign = 0;
    // find each film on TMDB (remembered, so updates are quick), then keep the first `max` (English ones only, unless that's switched off)
    l.job = { running: true, step: 'Looking up the movies…', done: 0, total: films.length, at: Date.now() }; pushState();
    const look = async f => {
      let c = cache[f.slug]; if (typeof c === 'string') c = { id: c };
      if (!c?.id) { const r = await searchMovies(f.title); const hit = r.find(m => f.year && String(m.year) === String(f.year)) || r.find(m => m.title.toLowerCase() === f.title.toLowerCase()) || r[0]; if (!hit) throw new Error('not on TMDB'); c = { id: String(hit.id), lang: hit.lang || '' }; }
      if (c.lang == null || c.lang === '') { const m = await tmdbMovie(c.id).catch(() => null); c.lang = m?.lang || ''; }
      cache[f.slug] = c; return c;
    };
    { let k = 0; await Promise.all(Array.from({ length: 6 }, async () => { while (k < films.length) { const f = films[k++]; try { f.tm = await look(f); } catch { f.tm = null; } l.job.done++; if (l.job.done % 15 === 0) pushState(); } })); }
    if (english) { foreign = films.filter(f => f.tm && f.tm.lang && f.tm.lang !== 'en').length; films = films.filter(f => !f.tm || !f.tm.lang || f.tm.lang === 'en'); }
    films = films.slice(0, max);
    const want = new Set(films.map(f => f.slug)), have = new Map(l.entries.filter(e => e.lbSlug && e.status !== 'removed').map(e => [e.lbSlug, e]));
    films.forEach((f, i) => { const e = have.get(f.slug); if (e) e.lbRank = i + 1; });
    const todo = films.map((f, i) => ({ ...f, rank: i + 1 })).filter(f => !have.has(f.slug));
    l.job = { running: true, step: 'Adding the movies…', done: 0, total: todo.length, at: Date.now() }; pushState();
    let k = 0;
    const worker = async () => {
      while (k < todo.length) {
        const f = todo[k++];
        try {
          if (!f.tm?.id) throw new Error('not on TMDB');
          const id = f.tm.id;
          if (!l.entries.some(e => String(e.tmdbId) === String(id) && e.status !== 'removed')) { const e = await addFilm(l, id); e.lbSlug = f.slug; e.lbRank = f.rank; added++; }
          else { const e = l.entries.find(x => String(x.tmdbId) === String(id) && x.status !== 'removed'); e.lbSlug ||= f.slug; e.lbRank = f.rank; }
        } catch (err) { missed.push(`${f.title}${f.year ? ` (${f.year})` : ''}`); }
        l.job.done++; if (l.job.done % 10 === 0) pushState();
      }
    };
    await Promise.all(Array.from({ length: 5 }, worker));
    for (const e of l.entries) if (e.lbSlug && !want.has(e.lbSlug) && ['active', 'paused'].includes(e.status)) { e.status = 'removed'; gone++; }
    l.source = { ...src, kind: 'letterboxd', url: src.url || lb.WORST_URL, max, english, at: Date.now(), count: films.length, added, gone, foreign, missed: missed.slice(0, 50), error: null };
    l.job = null; save(); pushState(); refreshPreview();
    broadcast({ type: 'toast', text: `🎞️ “${l.name}” is up to date: ${films.length} films (${added} new${gone ? `, ${gone} dropped off` : ''}${foreign ? `, ${foreign} not in English skipped` : ''}${missed.length ? `, ${missed.length} not found` : ''})` }, 'control');
  } catch (e) {
    l.source = { ...src, error: e.message, at: src.at || null }; l.job = null; save(); pushState();
    broadcast({ type: 'toast', text: `⚠️ Letterboxd: ${e.message}` }, 'control');
  }
}

// 🌐 a battle made from IMDb and/or Rotten Tomatoes pages (like "the 500 worst movies"). It reads the links in order and
// keeps going (more pages, then the next link) until it has `max` movies, skipping movies that aren't in English, that
// are already on the Discord movie list, or that you've watched / rated on Letterboxd (each skip can be turned off).
// "🔄 Update" reads them again: new ones come in, ones that dropped off (or that you've watched since) leave.
async function syncWebList(l) {
  const src = l.source || {}, max = src.max || 500, urls = (src.urls || []).filter(Boolean), fake = src.fake;
  l.job = { running: true, step: 'Reading the lists…', done: 0, total: 0, at: Date.now() }; pushState();
  try {
    const onDiscord = new Set((getList('movies')?.entries || []).filter(e => e.tmdbId && e.status !== 'removed').map(e => String(e.tmdbId)));
    const cache = (db.webTmdb ||= {}), kept = [], seenTm = new Set(), stats = { foreign: 0, discord: 0, watched: 0, missed: [], read: 0, sources: [] };
    const look = async it => { // the TMDB movie for a list item (IMDb ids match exactly; Rotten Tomatoes goes by title + year)
      if (fake) return it.tmdbId ? { id: String(it.tmdbId), lang: it.lang || 'en', title: it.title, year: it.year } : null;
      let c = cache[it.key]; if (c?.id && c.lang != null) return c;
      let hit = it.imdbId ? await findImdb(it.imdbId).catch(() => null) : null;
      if (!hit) { const r = await searchMovies(it.title).catch(() => []); hit = r.find(m => it.year && Math.abs(Number(m.year) - Number(it.year)) <= 1 && m.title.toLowerCase() === it.title.toLowerCase()) || r.find(m => it.year && String(m.year) === String(it.year)) || r.find(m => m.title.toLowerCase() === it.title.toLowerCase()) || (!it.year ? r[0] : null); }
      if (!hit) return null; c = { id: String(hit.id), lang: hit.lang || '', title: hit.title, year: hit.year }; cache[it.key] = c; return c;
    };
    const take = async items => { // check items in order until there are enough
      for (let i = 0; i < items.length && kept.length < max; i += 8) {
        const batch = items.slice(i, i + 8); const tms = await Promise.all(batch.map(it => look(it).catch(() => null)));
        batch.forEach((it, j) => { if (kept.length >= max) return; const tm = tms[j]; stats.read++;
          if (!tm) { stats.missed.push(`${it.title}${it.year ? ` (${it.year})` : ''}`); return; }
          if (seenTm.has(tm.id)) return; seenTm.add(tm.id);
          if (src.english !== false && tm.lang && tm.lang !== 'en') { stats.foreign++; return; }
          if (src.skipDiscord !== false && onDiscord.has(tm.id)) { stats.discord++; return; }
          if (src.skipWatched !== false && lb.lookup({ title: tm.title || it.title, year: tm.year || it.year, tmdbId: tm.id })) { stats.watched++; return; }
          kept.push({ ...it, tm, rank: kept.length + 1 }); });
        l.job = { running: true, step: `Checking the movies… ${kept.length} of ${max} so far`, done: stats.read, total: 0, at: Date.now() }; pushState();
      }
    };
    if (fake) await take(fake);
    else for (const url of urls) { // each link in order, reading deeper (more pages) while it still needs movies
      if (kept.length >= max) break;
      let want = (max - kept.length) * 2 + 20, items = [], err = null;
      try { items = await listsrc.readList(url, Math.min(2500, want), (page, n) => { l.job = { running: true, step: `Reading ${listsrc.siteOf(url) === 'imdb' ? 'IMDb' : 'Rotten Tomatoes'}… page ${page} (${n} movies)`, done: 0, total: 0, at: Date.now() }; pushState(); }); } catch (e) { err = e.message; }
      stats.sources.push({ url, found: items.length, error: err });
      const before = kept.length; await take(items);
      if (kept.length < max && items.length >= Math.min(2500, want) && !err) { const more = await listsrc.readList(url, Math.min(2500, want * 3), () => {}).catch(() => []); await take(more.slice(items.length)); } // (still short: read further down that list)
      stats.sources[stats.sources.length - 1].used = kept.length - before;
    }
    if (!kept.length) throw new Error(stats.sources.find(x => x.error)?.error || 'no movies left after skipping (try turning a skip off)');
    // add the new ones, keep the ones still on it, and hide the ones that dropped off (never deleted)
    const want = new Set(kept.map(k => k.tm.id)), have = new Map(l.entries.filter(e => e.tmdbId && e.status !== 'removed').map(e => [String(e.tmdbId), e]));
    const todo = kept.filter(k => !have.has(k.tm.id)); let added = 0, gone = 0;
    kept.forEach(k => { const e = have.get(k.tm.id); if (e) e.webRank = k.rank; });
    l.job = { running: true, step: 'Adding the movies…', done: 0, total: todo.length, at: Date.now() }; pushState();
    let k = 0;
    await Promise.all(Array.from({ length: fake ? 1 : 5 }, async () => { while (k < todo.length) { const it = todo[k++];
      try { const removed = l.entries.find(e => String(e.tmdbId) === it.tm.id && e.status === 'removed');
        if (removed) { removed.status = 'active'; removed.webRank = it.rank; }
        else if (fake) l.entries.push({ id: 'film-' + it.tm.id + '-' + uid().slice(0, 4), tmdbId: it.tm.id, label: it.title, sub: String(it.year || ''), weight: 1, status: 'active', addedAt: Date.now(), webRank: it.rank });
        else { const e = await addFilm(l, it.tm.id); e.webRank = it.rank; }
        added++; } catch { stats.missed.push(it.title); }
      l.job.done++; if (l.job.done % 10 === 0) pushState(); } }));
    for (const e of l.entries) if (e.tmdbId && !want.has(String(e.tmdbId)) && ['active', 'paused'].includes(e.status)) { e.status = 'removed'; gone++; }
    l.source = { ...src, at: Date.now(), count: kept.length, added, gone, foreign: stats.foreign, discord: stats.discord, watched: stats.watched, missed: stats.missed.slice(0, 50), sources: stats.sources, error: null };
    l.job = null; save(); pushState(); refreshPreview();
    const skip = [stats.foreign && `${stats.foreign} not in English`, stats.discord && `${stats.discord} on the Discord list`, stats.watched && `${stats.watched} you've watched`].filter(Boolean).join(', ');
    broadcast({ type: 'toast', text: `🌐 “${l.name}” is ready: ${kept.length} movies (${added} new${gone ? `, ${gone} left` : ''})${skip ? ` · skipped ${skip}` : ''}${kept.length < max ? ` · only found ${kept.length} of ${max}: add another link to fill it up` : ''}` }, 'control');
  } catch (e) {
    console.error('[web list] ' + e.message);
    l.source = { ...src, error: e.message, at: src.at || null }; l.job = null; save(); pushState();
    broadcast({ type: 'toast', text: `⚠️ ${l.name}: ${e.message}` }, 'control');
  }
}
app.get('/api/lists/web/presets', (req, res) => res.json(listsrc.PRESETS));
app.post('/api/lists/web', (req, res) => { // make a new IMDb / Rotten Tomatoes battle, or change + update one
  const b = req.body || {}; let l = b.listId ? getList(b.listId) : null;
  if (l?.job?.running) return res.status(400).json({ error: 'Already updating, give it a minute.' });
  const urls = Array.isArray(b.urls) ? b.urls.map(u => String(u).trim()).filter(u => /^https?:\/\//i.test(u)).slice(0, 10) : null;
  if (urls) { const bad = urls.find(u => !listsrc.siteOf(u)); if (bad) return res.status(400).json({ error: `That link isn't IMDb or Rotten Tomatoes: ${bad}` }); }
  const opts = { ...(urls ? { urls } : {}), ...(b.max != null ? { max: Math.max(10, Math.min(1000, Number(b.max) || 500)) } : {}), ...['english', 'skipDiscord', 'skipWatched'].reduce((o, k) => (b[k] != null ? { ...o, [k]: !!b[k] } : o), {}) };
  if (!l) {
    if (!b.fake && !(urls || []).length) return res.status(400).json({ error: 'Add at least one IMDb or Rotten Tomatoes link.' });
    l = { id: uid(), name: String(b.name || '💩 The 500 worst movies').slice(0, 60), type: 'films', entries: [], joinOpen: false, source: { kind: 'web', max: 500, english: true, skipDiscord: true, skipWatched: true, urls: [], ...opts, ...(b.fake ? { fake: b.fake } : {}) } };
    db.lists.push(l); db.activeListId = l.id; leaveEnded(); save();
  } else l.source = { ...(l.source || {}), kind: 'web', ...opts };
  syncWebList(l);
  pushState(); res.json({ ok: true, id: l.id });
});
app.post('/api/test/web-list', (req, res) => { // 🧪 a pretend IMDb battle (made-up movies, no internet): shows the skipping + "keep going until full"
  const fake = Array.from({ length: 40 }, (_, i) => ({ key: 'tt-test-' + i, title: `Bad Movie ${i + 1}`, year: 1990 + (i % 30), tmdbId: 990000 + i, lang: i % 7 === 3 ? 'fr' : 'en' }));
  const movies = getList('movies'); if (movies && !movies.entries.some(e => String(e.tmdbId) === '990005')) movies.entries.push({ id: 'film-990005-test', tmdbId: 990005, label: 'Bad Movie 6', sub: '1995', weight: 1, status: 'active', addedAt: Date.now(), test: true });
  req.body = { name: '🧪 Pretend worst movies (IMDb test)', fake, max: Number(req.body?.max) || 20, english: true, skipDiscord: true, skipWatched: true };
  const b = req.body, l = { id: uid(), name: b.name, type: 'films', entries: [], joinOpen: false, source: { kind: 'web', max: b.max, english: true, skipDiscord: true, skipWatched: true, urls: [], fake } };
  db.lists.push(l); db.activeListId = l.id; leaveEnded(); save(); syncWebList(l).then(() => { const mv = getList('movies'); if (mv) mv.entries = mv.entries.filter(e => e.id !== 'film-990005-test'); save(); });
  pushState(); res.json({ ok: true, id: l.id });
});
app.post('/api/lists/numbers', (req, res) => { // 🔢 a battle where every ball is a number (pick a number from 1 to N)
  const a = Math.round(Number(req.body?.from) || 1), b = Math.round(Number(req.body?.to) || 10), lo = Math.min(a, b), hi = Math.max(a, b);
  if (hi - lo + 1 > 1000) return res.status(400).json({ error: 'That is more than 1,000 numbers. Pick a smaller range.' });
  if (hi - lo + 1 < 2) return res.status(400).json({ error: 'Pick at least 2 numbers.' });
  const l = { id: uid(), name: String(req.body?.name || `🔢 ${lo} to ${hi}`).slice(0, 60), type: 'text', entries: [], joinOpen: false, numbers: { from: lo, to: hi } };
  for (let n = lo; n <= hi; n++) l.entries.push({ id: uid(), label: String(n), sub: '', weight: 1, status: 'active', addedAt: Date.now() });
  db.lists.push(l); db.activeListId = l.id; leaveEnded(); save(); pushState(); refreshPreview(true); res.json({ ok: true, id: l.id, count: l.entries.length });
});
app.post('/api/lists/:id/numbers', (req, res) => { // change a number battle's range later (numbers you keep keep their odds)
  const l = getList(req.params.id); if (!l || l.type !== 'text') return res.sendStatus(404);
  const a = Math.round(Number(req.body?.from) || 1), b = Math.round(Number(req.body?.to) || 10), lo = Math.min(a, b), hi = Math.max(a, b);
  if (hi - lo + 1 > 1000 || hi - lo + 1 < 2) return res.status(400).json({ error: 'Pick between 2 and 1,000 numbers.' });
  const isNum = e => /^-?\d+$/.test(e.label);
  for (const e of l.entries) if (isNum(e) && e.status !== 'removed' && (+e.label < lo || +e.label > hi)) e.status = 'removed';
  const have = new Set(l.entries.filter(e => isNum(e) && e.status !== 'removed').map(e => +e.label));
  for (let n = lo; n <= hi; n++) if (!have.has(n)) l.entries.push({ id: uid(), label: String(n), sub: '', weight: 1, status: 'active', addedAt: Date.now() });
  l.numbers = { from: lo, to: hi }; if (/^🔢 -?\d+ to -?\d+$/.test(l.name)) l.name = `🔢 ${lo} to ${hi}`;
  save(); pushState(); refreshPreview(true); res.json({ ok: true, count: l.entries.filter(e => e.status === 'active').length });
});
app.post('/api/lists/letterboxd', (req, res) => { // make a new Letterboxd battle, or update one
  const b = req.body || {}; let l = b.listId ? getList(b.listId) : null;
  if (l?.job?.running) return res.status(400).json({ error: 'Already updating, give it a minute.' });
  if (!l) {
    l = { id: uid(), name: String(b.name || '💩 Letterboxd’s worst 500').slice(0, 60), type: 'films', entries: [], joinOpen: false, source: { kind: 'letterboxd', url: String(b.url || '').trim() || lb.WORST_URL, max: Math.max(10, Math.min(2000, Number(b.max) || 500)) } };
    db.lists.push(l); db.activeListId = l.id; leaveEnded(); save();
  } else if (b.url != null || b.max != null || b.english != null) l.source = { ...(l.source || {}), ...(b.english != null ? { english: !!b.english } : {}), kind: 'letterboxd', url: String(b.url || l.source?.url || lb.WORST_URL).trim(), max: Math.max(10, Math.min(2000, Number(b.max) || l.source?.max || 500)) };
  syncLetterboxdList(l);
  pushState(); res.json({ ok: true, id: l.id });
});
app.post('/api/lists/:id/film', async (req, res) => {
  const l = getList(req.params.id); if (!l || l.type !== 'films') return res.sendStatus(404);
  const text = String(req.body?.text || '').trim().slice(0, 120);
  if (text) { const e = addEntry(l, { label: text }); save(); pushState(); refreshPreview(); return res.json({ ok: true, msg: `Added ${e.label} (plain text, not a movie)` }); } // 📝 not a movie
  try { const e = await addFilm(l, req.body?.tmdbId || req.body?.query); save(); pushState(); res.json({ ok: true, msg: `Added ${e.label} (${e.sub})` }); }
  catch (e) { res.status(400).json({ error: e.message }); }
});

// ---------- import lists from Wheel of Names, Marbles on Stream, CSV / JSON / text files ----------
app.post('/api/import/parse', (req, res) => {
  const items = parseImport(req.body?.text, req.body?.name);
  res.json({ text: items ? toLines(items) : String(req.body?.text || ''), count: items ? items.length : null });
});
app.post('/api/import/link', async (req, res) => {
  try { const items = await importLink(req.body?.url); res.json({ text: toLines(items), count: items.length }); }
  catch (e) { res.status(400).json({ error: e.message }); }
});

// ---------- ban list ----------
app.get('/api/bans', (req, res) => res.json({ ok: (db.banOk || []).map(id => ({ tmdbId: id, title: db.banOkTitles?.[id] || null })), bans: [...(db.bans || [])].sort((a, b) => b.at - a.at), yearAllow: (db.yearAllow || []).map(id => ({ tmdbId: id, title: db.yearAllowTitles?.[id] || null })), year: new Date().getFullYear() }));
app.post('/api/bans', async (req, res) => {
  try {
    let id = String(req.body?.tmdbId || '');
    if (!/^\d+$/.test(id)) { const r = await searchMovies(String(req.body?.query || '')); if (!r.length) return res.status(400).json({ error: 'Movie not found' }); id = String(r[0].id); }
    const m = await tmdbMovie(id);
    const added = banMovie({ id: m.id, title: m.title, year: m.year, poster: m.poster }, req.body?.reason);
    pushState(); refreshPreview(); res.json({ ok: true, msg: added ? `Banned ${m.title} (${m.year})` : `${m.title} was already banned` });
  } catch (e) { res.status(400).json({ error: e.message }); }
});
app.delete('/api/bans/:id', (req, res) => { unbanMovie(req.params.id); pushState(); res.json({ ok: true }); });
// 🔄 the ban list builder (banscan.js): progress goes to the control panel as it runs
let scanPushAt = 0;
setScanHooks({ changed: () => { broadcast({ type: 'banScan', scan: banScan }, 'control'); if (!banScan.running || Date.now() - scanPushAt > 15000) { scanPushAt = Date.now(); pushState(); } } });
app.get('/api/bans/scan', (req, res) => res.json(banScan));
app.post('/api/bans/scan', (req, res) => { if (banScan.running) return res.json({ ok: false, error: 'Already updating the list.' }); runScan({ only: req.body?.only || null }).catch(() => {}); res.json({ ok: true }); });
app.post('/api/test/ban-scan', (req, res) => { if (banScan.running) return res.json({ ok: false, error: 'Already updating the list.' }); runScan({ fake: true }).catch(() => {}); res.json({ ok: true }); });
app.post('/api/test/ban-year', async (req, res) => { // 🧪 pretend it's a new year: last year's pretend "this year" bans come off the list
  const last = String(Number(new Date().getFullYear()) - 1);
  for (let i = 0; i < 3; i++) (db.bans ||= []).push({ tmdbId: 'year-test' + i, title: `🧪 Last Year's Hit ${i + 1}`, year: last, poster: null, reason: `${last} movie`, auto: 'year', at: Date.now(), test: true });
  save(); const before = db.bans.length, r = await yearCleanup(); pushState();
  res.json({ ok: true, added: 3, removed: r.removed, kept: r.kept, before, after: db.bans.length });
});
// first open after the update: build the ban list once (when TMDB is set up), and check the "this year" bans every 6 hours
setTimeout(() => { yearCleanup().catch(() => {}); if (!db.banSeed && String(db.settings.tmdbKey || '').trim()) runScan().catch(() => {}); }, 20000);
setInterval(() => { yearCleanup().catch(() => {}); }, 6 * 3600e3);
// 🚫 search for the Bans tab: which movies the automatic rules ban (and which are banned / pre-approved)
app.get('/api/bans/search', async (req, res) => {
  try {
    const r = (await searchMovies(String(req.query.q || ''))).slice(0, 8), full = await getMany(r.map(m => m.id), 2500);
    res.json(r.map(m => { const d = full.get(String(m.id)), rb = d ? autoBan(d) : null; return { ...m, rule: rb ? rb.reason : null, ok: (db.banOk || []).includes(String(m.id)) }; }));
  } catch (e) { res.json({ error: e.message }); }
});
// ✅ pre-approve (unban) a movie the rules would ban, or take that back
app.post('/api/bans/ok', (req, res) => {
  const id = String(req.body?.tmdbId || ''); if (!id) return res.sendStatus(400);
  if (req.body?.ok === false) unapprove(id); else unbanMovie(id, req.body?.title || null);
  pushState(); res.json({ ok: true });
});
// 🔎 movies already in the pool that break the ban rules (Derek decides: ban them or leave them)
app.post('/api/bans/pool-check', async (req, res) => {
  const IN = ['active', 'benched', 'paused', 'away'], ents = (getList('movies')?.entries || []).filter(e => IN.includes(e.status) && e.tmdbId && !isBannedId(e.tmdbId));
  const out = [], until = Date.now() + 45000;
  for (let i = 0; i < ents.length && Date.now() < until; i += 8) {
    const full = await getMany(ents.slice(i, i + 8).map(e => e.tmdbId), 6000);
    for (const e of ents.slice(i, i + 8)) { const d = full.get(String(e.tmdbId)), rb = d ? autoBan(d) : null; if (rb) out.push({ tmdbId: e.tmdbId, title: e.label, year: e.sub, poster: e.poster || d.poster, reason: rb.reason, key: rb.key, who: e.backers?.[0]?.name || null }); }
  }
  res.json({ checked: ents.length, found: out, partial: Date.now() >= until });
});
app.post('/api/bans/rule-ban', (req, res) => { // ban the movies the pool check found (one or all)
  let n = 0; for (const m of req.body?.movies || []) if (banMovie({ id: m.tmdbId, title: m.title, year: m.year, poster: m.poster }, m.reason, m.key || 'rule')) n++;
  pushState(); refreshPreview(); res.json({ ok: true, n });
});
// 🧪 Test tab: the ban rules on made-up TMDB details (no internet needed), and lots of pretend bans for trying the search box
app.post('/api/test/ban-rules', (req, res) => {
  const T = [
    ['Amélie (2001)', { lang: 'fr', spoken: ['fr'], allGenres: ['Comedy', 'Romance'], keywords: ['paris'] }],
    ['Inglourious Basterds (2009): some French/German, mostly English', { lang: 'en', spoken: ['en', 'de', 'fr', 'it'], allGenres: ['Drama', 'Thriller', 'War'], keywords: ['nazi'] }],
    ['Parasite (2019)', { lang: 'ko', spoken: ['ko', 'en'], allGenres: ['Comedy', 'Thriller', 'Drama'], keywords: [] }],
    ['Apocalypto (2006)', { lang: 'en', spoken: ['yua'], allGenres: ['Action', 'Drama'], keywords: [] }],
    ['The Passion of the Christ (2004)', { lang: 'en', spoken: ['en', 'he', 'la'], allGenres: ['Drama', 'History'], keywords: ['jesus christ', 'crucifixion', 'bible'] }],
    ['The Ten Commandments (1956)', { lang: 'en', spoken: ['en'], allGenres: ['Drama', 'History'], keywords: ['moses', 'ten commandments', 'old testament'] }],
    ["God's Not Dead (2014)", { lang: 'en', spoken: ['en'], allGenres: ['Drama'], keywords: ['christian film', 'atheism'] }],
    ["Monty Python's Life of Brian (1979)", { lang: 'en', spoken: ['en'], allGenres: ['Comedy'], keywords: ['jesus christ', 'bible', 'satire'] }],
    ['The Book of Eli (2010)', { lang: 'en', spoken: ['en'], allGenres: ['Action', 'Thriller', 'Science Fiction'], keywords: ['bible', 'post-apocalyptic'] }],
    ['The Exorcist (1973)', { lang: 'en', spoken: ['en'], allGenres: ['Horror'], keywords: ['exorcism', 'priest', 'catholic', 'faith', 'god'] }],
    ['Free Solo (2018)', { lang: 'en', spoken: ['en'], allGenres: ['Documentary'], keywords: ['climbing'] }],
    ['Jackass: The Movie (2002)', { lang: 'en', spoken: ['en'], allGenres: ['Comedy', 'Documentary'], keywords: ['stunt'] }],
    ['Heat (1995)', { lang: 'en', spoken: ['en', 'es'], allGenres: ['Crime', 'Drama', 'Action'], keywords: ['heist'] }]
  ].map(([t, d]) => { const rb = autoBan({ id: 'test', ...d }); return { title: t, banned: !!rb, reason: rb?.reason || null }; });
  res.json({ ok: true, rows: T, rules: db.settings.banRules || {} });
});
app.post('/api/test/ban-many', (req, res) => {
  db.bans = (db.bans || []).filter(b => !b.test);
  if (!req.body?.clear) {
    const words = ['Night', 'Shadow', 'River', 'Silent', 'Golden', 'Last', 'Broken', 'Winter', 'Holy', 'Lost', 'Red', 'Paper', 'Iron', 'Secret', 'Little'], things = ['Garden', 'Prayer', 'Village', 'Mountain', 'Kingdom', 'Letters', 'Harvest', 'Road', 'Bells', 'Sea'];
    const rs = [['not in English', 'english'], ['religious movie', 'religious'], ['documentary', 'documentary']];
    for (let i = 0; i < 300; i++) { const [reason, auto] = rs[i % 3]; db.bans.push({ tmdbId: 'test' + i, title: `🧪 ${words[i % words.length]} ${things[(i * 7) % things.length]}${i > 149 ? ' II' : ''}`, year: String(1950 + (i * 13) % 74), poster: null, reason, auto, at: Date.now() - i * 60000, test: true }); }
  }
  save(); pushState(); res.json({ ok: true, n: db.bans.filter(b => b.test).length });
});
app.post('/api/year-allow', async (req, res) => {
  const id = String(req.body?.tmdbId || ''); if (!id) return res.sendStatus(400);
  allowThisYear(id, req.body?.allow !== false);
  if (req.body?.allow !== false) { db.yearAllowTitles ||= {}; try { const m = await tmdbMovie(id); db.yearAllowTitles[id] = `${m.title} (${m.year})`; } catch {} save(); }
  pushState(); res.json({ ok: true });
});

// ---------- one-click on/off for channel points and bits ----------
const chaosState = () => ({ points: db.settings.pointsOn !== false, bits: db.settings.bitsOn !== false });
app.post('/api/powerups/rewards', async (req, res) => { // add the ball power-up rewards to Twitch (they stay paused unless a chat battle with power-ups is playing)
  try {
    const st = db.settings, made = [], prompts = { shield: 'Chat battles: your ball gets a shield that saves it once. Type !join first!', mega: 'Chat battles: your ball becomes a big heavy MEGA ball. Type !join first!', turbo: 'Chat battles: your ball gets turbo speed. Type !join first!', ghost: 'Chat battles: nobody can bump your ball for the first 10 seconds. Type !join first!', spiky: 'Chat battles: your ball grows spikes, bumping it hurts. Type !join first!', magnet: 'Chat battles: your ball pulls everyone close to it. Type !join first!' };
    for (const [title, kind] of Object.entries(st.powerRewards || {})) if (await twitch.createReward({ title, cost: st.powerCosts?.[kind] || 1000, prompt: prompts[kind] || '', color: '#9B4DFF', queue: true })) made.push(title);
    rewardKey = ''; await syncRewards();
    res.json({ ok: true, made });
  } catch (e) { res.status(400).json({ error: e.message }); }
});
app.post('/api/rewards/pause-all', async (req, res) => { // the app is closing: nothing can be redeemed while it's off
  rewardBusy = false; rewardKey = ''; await Promise.all([syncRewards(true).catch(() => {}), Promise.race([backuplink.tick({ closing: true }).catch(() => {}), new Promise(r => setTimeout(r, 4000))])]); rewardKey = 'closed'; res.json({ ok: true }); // (and tell the backup bot server Movie Royal is closing)
});
app.post('/api/chaos-toggle', async (req, res) => {
  const b = req.body || {}, msgs = [];
  if (b.points != null) db.settings.pointsOn = !!b.points;
  if (b.bits != null) db.settings.bitsOn = !!b.bits;
  save(); pushState(); refreshPreview(true); rewardKey = '';
  // also pause/unpause the rewards on Twitch so nobody spends points on something that won't happen
  if (b.points != null && twitch.status.userId) {
    rewardBusy = false; await syncRewards().catch(() => {}); // the rewards follow what's usable right now
    msgs.push(db.settings.pointsOn ? 'rewards turn on on Twitch whenever they can be used' : 'rewards paused on Twitch');
  }
  res.json({ ok: true, ...chaosState(), msg: msgs.join(' · ') });
});

// ---------- chat battle: viewers type !join ----------
function chatBattle() {
  let l = getList('chat-join');
  if (!l) { l = { id: 'chat-join', name: 'Chat battle', type: 'chat', entries: [], joinOpen: false }; db.lists.push(l); save(); }
  return l;
}
chatBattle(); // always there, ready for a giveaway
app.post('/api/chatbattle', (req, res) => {
  const l = chatBattle(), b = req.body || {};
  if (b.open != null) { l.joinOpen = !!b.open; if (l.joinOpen) db.activeListId = l.id; } // !join only counts while this battle is the one playing
  if (b.select) db.activeListId = l.id;
  if (b.clear) for (const e of l.entries) if (e.status === 'active') e.status = 'removed';
  if (b.select || b.open) leaveEnded();
  save(); pushState(); refreshPreview(true); res.json({ ok: true, id: l.id });
});

// ---------- 🎁 giveaways: a chat battle with rules (who can enter, extra odds for subs, past winners…) ----------
const GA_DEFAULT = {
  title: 'Giveaway', prize: '', command: '!enter',
  everyone: true, followers: true, subs: true, vips: true, mods: true, minFollowDays: 0, minSubMonths: 0,
  excludeBroadcaster: true, excludeBots: true, bots: 'nightbot, streamelements, streamlabs, moobot, fossabot, wizebot, soundalerts, sery_bot',
  subMult1: 2, subMult2: 3, subMult3: 4, subMonthBonus: 0, followerMult: 1, vipMult: 1, modMult: 1,
  maxEntrants: 0, pastWinners: 'never', autoCloseSeconds: 0, removeWinner: true, bestOf: 1,
  announceOpen: true, announceWinner: true, confirmEntry: false
};
function giveawaySettings() { return (db.giveaway = { ...GA_DEFAULT, ...(db.giveaway || {}) }); }
function giveawayList() {
  let l = getList('giveaway');
  if (!l) { l = { id: 'giveaway', name: 'Giveaway', type: 'chat', giveaway: true, entries: [], joinOpen: false }; db.lists.push(l); save(); }
  return l;
}
giveawayList();
let gaTimer = null;
function gaWonBefore(login) {
  const g = giveawaySettings(), w = (db.giveawayWinners || []).filter(x => x.login === login);
  if (!w.length || g.pastWinners === 'never') return false;
  const last = Math.max(...w.map(x => x.at));
  if (g.pastWinners === 'always') return true;
  if (g.pastWinners === 'week') return Date.now() - last < 7 * 864e5;
  if (g.pastWinners === 'month') return Date.now() - last < 30 * 864e5;
  return last >= (stream().startedAt || new Date().setHours(0, 0, 0, 0)); // this stream
}
async function giveawayChat(m) {
  const l = getList('giveaway'); if (!l || !l.joinOpen) return;
  const g = giveawaySettings(), cmd = String(g.command || '!enter').trim().toLowerCase();
  if (!cmd || m.text.toLowerCase().split(/\s+/)[0] !== cmd) return;
  const login = m.login.toLowerCase(), b = m.badges || {};
  if (l.entries.some(e => e.status === 'active' && e.twitch === login)) return;
  if (g.excludeBroadcaster && (b.broadcaster || login === (db.owner?.login || '').toLowerCase())) return;
  if (g.excludeBots && String(g.bots).toLowerCase().split(/[\s,]+/).filter(Boolean).includes(login)) return;
  if (g.maxEntrants > 0 && l.entries.filter(e => e.status === 'active').length >= g.maxEntrants) return;
  if (gaWonBefore(login)) return;
  let followed;
  if (!g.everyone || g.minFollowDays > 0 || Number(g.followerMult) !== 1) { try { followed = await twitch.followedAt(m.userId); } catch { followed = undefined; } }
  const follows = followed === undefined ? null : !!followed, followDays = followed ? (Date.now() - followed) / 864e5 : 0;
  const isSub = !!b.sub && (b.months || 0) >= (g.minSubMonths || 0);
  let ok = g.everyone || (g.subs && isSub) || (g.vips && b.vip) || (g.mods && (b.mod || b.broadcaster)) || (g.followers && follows !== false);
  if (ok && g.minFollowDays > 0 && !isSub && !b.vip && !b.mod && follows !== null && (!follows || followDays < g.minFollowDays)) ok = false;
  if (!ok) return;
  let w = 1;
  if (b.sub) w *= Number(b.tier >= 3 ? g.subMult3 : b.tier === 2 ? g.subMult2 : g.subMult1) || 1;
  if (b.vip) w *= Number(g.vipMult) || 1;
  if (b.mod) w *= Number(g.modMult) || 1;
  if (follows) w *= Number(g.followerMult) || 1;
  if (b.sub && g.subMonthBonus) w += (b.months || 0) * Number(g.subMonthBonus);
  w = Math.max(.1, Math.round(w * 100) / 100);
  if (l.entries.some(e => e.status === 'active' && e.twitch === login)) return; // (checked again after the follower lookup)
  const e = addEntry(l, { label: m.name, twitch: login, weight: w }); e.joined = true;
  e.badges = { sub: !!b.sub, tier: b.tier || 0, months: b.months || 0, vip: !!b.vip, mod: !!b.mod, follows };
  save(); pushState(); fillTwitchAvatars(l);
  broadcast({ type: 'joined', name: e.label }, 'overlay');
  if (g.confirmEntry && twitch.canSay()) twitch.say(`🎁 @${m.name} you're in${w !== 1 ? ` (x${w} odds)` : ''}!`).catch(() => {});
}
function giveawayOpen(open) {
  const l = giveawayList(), g = giveawaySettings();
  l.joinOpen = !!open; clearTimeout(gaTimer);
  if (open) {
    db.activeListId = l.id; l.screenTitle = `🎁 ${g.title}${g.prize ? ': ' + g.prize : ''}`; l.bestOf = Number(g.bestOf) || 1;
    if (g.autoCloseSeconds > 0) gaTimer = setTimeout(() => { giveawayOpen(false); pushState(); if (twitch.canSay()) twitch.say(`⏹ Giveaway entries are closed! ${l.entries.filter(e => e.status === 'active').length} people are in.`).catch(() => {}); }, g.autoCloseSeconds * 1000);
    if (g.announceOpen && twitch.canSay()) {
      const who = g.everyone ? '' : ` (${[g.followers && 'followers', g.subs && 'subs', g.vips && 'VIPs', g.mods && 'mods'].filter(Boolean).join(', ')} only)`;
      twitch.say(`🎁 GIVEAWAY${g.prize ? `: ${g.prize}` : ''}! Type ${g.command} to enter${who}.${g.subMult1 > 1 ? ` Subs get x${g.subMult1}+ odds!` : ''}${g.autoCloseSeconds > 0 ? ` Closes in ${Math.round(g.autoCloseSeconds)}s.` : ''}`).catch(() => {});
    }
  }
  save();
}
app.get('/api/giveaway', (req, res) => res.json({ settings: giveawaySettings(), winners: (db.giveawayWinners || []).slice(-50).reverse(), canFollowers: !!twitch.status.canFollowers }));
app.post('/api/giveaway', (req, res) => {
  const b = req.body || {}, l = giveawayList();
  if (b.settings) { const cur = giveawaySettings(); for (const k of Object.keys(GA_DEFAULT)) if (k in b.settings) cur[k] = typeof GA_DEFAULT[k] === 'number' ? Number(b.settings[k]) || 0 : typeof GA_DEFAULT[k] === 'boolean' ? !!b.settings[k] : String(b.settings[k]); db.giveaway = cur; l.bestOf = Number(cur.bestOf) || 1; if (l.joinOpen) l.screenTitle = `🎁 ${cur.title}${cur.prize ? ': ' + cur.prize : ''}`; }
  if (b.open != null) giveawayOpen(b.open);
  if (b.select) { db.activeListId = l.id; l.screenTitle = `🎁 ${giveawaySettings().title}${giveawaySettings().prize ? ': ' + giveawaySettings().prize : ''}`; l.bestOf = Number(giveawaySettings().bestOf) || 1; }
  if (b.clear) for (const e of l.entries) if (e.status === 'active') e.status = 'removed';
  if (b.clearWinners) db.giveawayWinners = [];
  if (b.select) leaveEnded();
  save(); pushState(); refreshPreview(true); res.json({ ok: true });
});

// ---------- 24/7 Discord bot (Cloudflare) ----------
app.post('/api/cloud/enable', async (req, res) => {
  try { const r = await cloud.enable(req.body?.token); pushState(); res.json({ ok: true, ...r }); }
  catch (e) { res.status(400).json({ error: e.message }); }
});
app.post('/api/cloud/disable', async (req, res) => { await cloud.disable(); pushState(); res.json({ ok: true }); });
app.post('/api/cloud/sync', async (req, res) => { const st = await cloud.sync(true); pushState(); res.json({ ok: !st.lastError, error: st.lastError, pulled: st.pulled }); });

// ---------- maps: pick one, random, or let chat vote ----------
// 🔴 NEW = never played on stream, 🔵 UPDATED = changed since you last played it on stream
function mapRuns() {
  if (!db.mapRuns) { db.mapRuns = {}; for (const h of db.history || []) if (h.map && mapById(h.map)) db.mapRuns[h.map] = { rev: 1, at: h.at }; } // older versions: count maps your history shows
  return db.mapRuns;
}
function mapsWithTags() { const r = mapRuns(); return MAP_LIST.map(m => ({ ...m, tag: !r[m.id] ? 'new' : (r[m.id].rev || 1) < (m.rev || 1) ? 'updated' : null })).sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })); } /* A to Z in every map menu */
app.post('/api/maps/reset-tags', (req, res) => { // ↺ the 🔴 NEW / 🔵 UPDATED tags back on: one map ({id, kind:'ball'|'card'}) or every ball + card map
  const id = req.body?.id ? String(req.body.id) : null;
  if (!id) { db.mapRuns = {}; cards.resetTags(); }
  else if (req.body.kind === 'card') cards.resetTags(id); else delete mapRuns()[id];
  save(); pushState(); cards.sendScene?.(); res.json({ ok: true });
});
function markMapRun(id) { const m = mapById(id); if (!m || !db.live) return; mapRuns()[id] = { rev: m.rev || 1, at: Date.now() }; } // only battles while you're live count
function currentMap() {
  if (!live.map) {
    const want = db.settings.map || 'random';
    if (mapById(want)) live.map = want;
    else { const pool = MAP_LIST.filter(m => m.id !== db.lastMap); live.map = pool[Math.floor(Math.random() * pool.length)].id; }
  }
  return live.map;
}
function nextMap() { if (live.mapUsed) { db.lastMap = live.map; live.map = null; live.mapUsed = false; } }
app.post('/api/map', (req, res) => {
  const id = String(req.body?.id || 'random'); if (id !== 'random' && !mapById(id)) return res.status(400).json({ error: 'Unknown map' });
  db.settings.map = id; save(); live.map = null; live.mapUsed = false; if (live.vote) endVote(true);
  if (live.phase === 'idle') refreshPreview(true); pushState(); res.json({ ok: true, map: currentMap() });
});
app.post('/api/shuffle', (req, res) => { broadcast({ type: 'shuffle' }, 'overlay'); res.json({ ok: true }); });
// chat vote: 4 random maps, type 1-4 in chat
const voteMsg = quiet => ({ type: 'vote', vote: live.vote && { options: live.vote.options, endsAt: live.vote.endsAt, quiet } });
let voteBcast;
function endVote(cancel) {
  const v = live.vote; if (!v) return; clearTimeout(v.timer); live.vote = null;
  if (cancel) { broadcast({ type: 'vote', vote: null }, 'overlay'); pushState(); return; }
  const top = Math.max(...v.options.map(o => o.count)), best = v.options.filter(o => o.count === top), win = best[Math.floor(Math.random() * best.length)];
  live.map = win.id; live.mapUsed = false;
  broadcast({ type: 'voteEnd', id: win.id, name: win.name }, 'overlay');
  broadcast({ type: 'toast', text: `🗳️ Chat picked ${win.icon} ${win.name} (${win.count} vote${win.count === 1 ? '' : 's'})` }, 'control');
  if (twitch.canSay()) twitch.say(`🗳️ Chat picked the map: ${win.icon} ${win.name}!`).catch(() => {});
  if (live.phase === 'idle') refreshPreview(true); pushState();
}
app.post('/api/vote/start', (req, res) => {
  if (live.phase === 'lobby' || live.phase === 'running') return res.status(400).json({ error: 'Start the vote before the battle.' });
  if (live.vote) endVote(true);
  const seconds = clampN(req.body?.seconds ?? db.settings.voteSeconds, 10, 180, 30);
  const pool = MAP_LIST.slice().sort(() => Math.random() - .5).slice(0, 4).map(m => ({ id: m.id, name: m.name, icon: m.icon, count: 0 }));
  live.vote = { options: pool, voters: new Map(), endsAt: Date.now() + seconds * 1000 };
  live.vote.timer = setTimeout(() => endVote(false), seconds * 1000);
  broadcast(voteMsg(false), 'overlay'); pushState();
  if (twitch.canSay()) twitch.say(`🗳️ Vote for the map! Type the number: ${pool.map((o, i) => `${i + 1} = ${o.name}`).join(' · ')} (${seconds}s)`).catch(() => {});
  res.json({ ok: true });
});
app.post('/api/vote/end', (req, res) => { endVote(!!req.body?.cancel); res.json({ ok: true }); });
// ---------- chat calls the winner: "!call Heat" before the fight. Called it? +1% luck on your own movies ----------
live.calls = new Map(); // twitch login -> { id, spot, label, name }
let callsBcast;
function chatCall(m) {
  if (db.settings.callsOn === false || !m.login) return;
  const cmd = String(db.settings.callCommand || '!call').trim().toLowerCase(), text = String(m.text).trim();
  if (!cmd || !text.toLowerCase().startsWith(cmd + ' ')) return;
  if (live.phase === 'running' || live.phase === 'ended') return; // calls close when the fight starts
  const l = getList(db.activeListId); if (!l || l.type !== 'movies') return;
  const q = norm(text.slice(cmd.length)); if (q.length < 2) return;
  const pool = l.entries.filter(e => e.status === 'active');
  const spot = pool.find(e => e.kind === 'spot');
  if (spot && (norm(spot.label).startsWith(q) || q === norm(db.settings.spotName))) { live.calls.set(m.login.toLowerCase(), { spot: true, label: spot.label, name: m.name }); }
  else {
    const movies = pool.filter(e => e.kind !== 'spot'), one = arr => arr.length === 1 ? arr[0] : null;
    const hit = movies.find(e => norm(e.label) === q) || one(movies.filter(e => norm(e.label).startsWith(q))) || one(movies.filter(e => norm(e.label).includes(q)));
    if (!hit) return;
    live.calls.set(m.login.toLowerCase(), { id: hit.id, label: hit.label, name: m.name });
  }
  clearTimeout(callsBcast); callsBcast = setTimeout(pushState, 400);
}
const callSummary = () => { const c = new Map(); for (const v of live.calls.values()) { const k = v.spot ? 'spot' : v.id; const x = c.get(k) || { label: v.label, n: 0 }; x.n++; c.set(k, x); } return [...c.values()].sort((a, b) => b.n - a.n); };
function resolveCalls(f, list) {
  if (!live.calls.size || list?.type !== 'movies') { live.calls.clear(); return null; }
  const right = [...live.calls.entries()].filter(([, v]) => v.spot ? f.spot : v.id === f.id);
  const total = live.calls.size; live.calls.clear();
  if (!right.length) return { total, right: [] };
  const amt = Math.max(0, Number(db.settings.callLuck ?? 1));
  const byLogin = new Map(Object.entries(db.links || {}).map(([pid, login]) => [String(login).toLowerCase(), pid]));
  const out = [];
  for (const [login, v] of right) {
    const pid = byLogin.get(login); let boosted = 0;
    if (pid && amt && !wonThisWeek(pid)) for (const e of list.entries) if (e.kind !== 'spot' && ['active', 'paused', 'away'].includes(e.status) && e.backers?.[0]?.discordId === pid && e.id !== f.id) { e.luckPct = (e.luckPct || 0) + amt; boosted++; }
    out.push({ login, name: v.name, boosted });
  }
  if (twitch.canSay()) {
    const names = out.slice(0, 12).map(o => '@' + o.login).join(' ') + (out.length > 12 ? ` +${out.length - 12} more` : '');
    const lucky = out.some(o => o.boosted) ? ` +${amt}% luck on your movies 🍀` : '';
    setTimeout(() => twitch.say(`🔮 ${out.length} of ${total} called it! ${names}${lucky}`).catch(() => {}), (db.settings.replayOn !== false ? 14 : 4) * 1000);
  }
  return { total, right: out };
}
function chatVote(m) {
  const v = live.vote; if (!v) return;
  const mm = String(m.text).trim().match(/^(?:!(?:vote|map)\s*)?([1-4])$/i); if (!mm) return;
  const i = Number(mm[1]) - 1; if (!v.options[i]) return;
  const prev = v.voters.get(m.login); if (prev === i) return;
  if (prev != null) v.options[prev].count--;
  v.options[i].count++; v.voters.set(m.login, i);
  clearTimeout(voteBcast); voteBcast = setTimeout(() => { if (live.vote) { broadcast(voteMsg(true), 'overlay'); pushState(); } }, 250);
}
// ball colours: "!color red" / "!color #ff66aa" (silent, no reply in chat) or the channel point reward with text
const NAMED = { red: '#ff3b3b', orange: '#ff8a1f', yellow: '#ffd93b', gold: '#ffc23b', lime: '#9dff3b', green: '#2fd65a', teal: '#1fd1c1', cyan: '#3bf2ff', blue: '#3b7bff', navy: '#23338f', purple: '#9b4dff', violet: '#b06bff', magenta: '#ff3bd8', pink: '#ff7ac8', hotpink: '#ff3b8d', brown: '#9a5a2e', white: '#f4f4f8', black: '#2a2a33', gray: '#8a8f9c', grey: '#8a8f9c', silver: '#c9ced8', maroon: '#8f1d2c', mint: '#7dffc4', peach: '#ffb38a', lavender: '#c8b6ff' };
const colorCd = new Map();
function setColor(login, raw) {
  if (db.settings.colorsOn === false || !login) return false;
  const v = String(raw || '').trim().toLowerCase().replace(/\s+/g, '');
  if (v === 'reset' || v === 'default') { if (db.colors) delete db.colors[login.toLowerCase()]; save(); broadcast({ type: 'recolor', login: login.toLowerCase(), color: null }, 'overlay'); if (live.phase === 'idle') refreshPreview(); return true; }
  let hex = NAMED[v] || (/^#?[0-9a-f]{6}$/.test(v) ? '#' + v.replace('#', '') : /^#?[0-9a-f]{3}$/.test(v) ? '#' + v.replace('#', '').split('').map(c => c + c).join('') : null);
  if (v === 'rainbow' || v === 'random') hex = '#' + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0');
  if (!hex) return false;
  db.colors ||= {}; db.colors[login.toLowerCase()] = hex; save();
  broadcast({ type: 'recolor', login: login.toLowerCase(), color: hex }, 'overlay'); // every piece of theirs changes color right away, even mid-fight
  if (live.phase === 'idle') refreshPreview();
  return true;
}
function chatColor(m) {
  if (db.settings.colorsOn === false || db.settings.colorMode === 'points') return; // points mode: only the one reward changes colours
  const cmd = String(db.settings.colorCommand ?? '!color').trim().toLowerCase(), parts = String(m.text).trim().split(/\s+/);
  if (!cmd || !(parts[0].toLowerCase() === cmd || (cmd === '!color' && parts[0].toLowerCase() === '!colour')) || !parts[1]) return;
  if (Date.now() - (colorCd.get(m.login) || 0) < 10000) return;
  colorCd.set(m.login, Date.now());
  setColor(m.login, parts.slice(1).join(''));
}
// quick add (Battle tab): a person + their movie in one go, e.g. to copy your old wheel exactly
app.post('/api/quickadd', async (req, res) => {
  try {
    const who = String(req.body?.person || '').trim(), id = String(req.body?.tmdbId || '');
    if (!who || !id) return res.status(400).json({ error: 'Type a name and pick a movie.' });
    const p = discordPeople().find(x => norm(x.name) === norm(who) || (x.twitch && norm(x.twitch) === norm(who)));
    const pid = p ? p.discordId : addManualPerson(who, /^[a-z0-9_]{3,25}$/i.test(who) ? who : '');
    const u = personUser(pid); if (!u) return res.status(400).json({ error: 'Could not add that person.' });
    const r = await suggest(id, u, { force: true }); save(); pushState(); refreshPreview();
    res.json({ ...r, person: u.name });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// ---------- who picked it: tag a movie to someone (updates the app, Discord and the 24/7 bot) ----------
app.get('/api/people/find', async (req, res) => {
  const q = String(req.query.q || '').trim().replace(/^@/, ''), nq = norm(q);
  const known = discordPeople().filter(p => !q || norm(p.name).includes(nq) || (p.twitch && p.twitch.includes(q.toLowerCase()))).slice(0, 8)
    .map(p => ({ discordId: p.discordId, name: p.name, twitch: p.twitch || '', manual: p.manual, known: true }));
  const members = q.length >= 2 ? (await discord.searchMembers(q).catch(() => [])).filter(m => !known.some(k => k.discordId === m.discordId)) : [];
  res.json([...known, ...members.map(m => ({ ...m, discord: true }))]);
});
app.post('/api/movies/:id/owner', async (req, res) => {
  const e = getList('movies')?.entries.find(x => x.id === req.params.id);
  if (!e || e.kind === 'spot') return res.status(404).json({ error: 'Movie not found.' });
  try {
    let u = null;
    const b = req.body || {};
    if (b.discordId) u = personUser(b.discordId) || { discordId: String(b.discordId), name: String(b.name || 'someone').slice(0, 40), avatar: b.avatar || null };
    else if (String(b.person || '').trim()) {
      const who = String(b.person).trim().replace(/^@/, '');
      const p = discordPeople().find(x => norm(x.name) === norm(who) || (x.twitch && norm(x.twitch) === norm(who)));
      u = personUser(p ? p.discordId : addManualPerson(who, /^[a-z0-9_]{3,25}$/i.test(who) ? who : ''));
    }
    if (!u && !b.nobody) return res.status(400).json({ error: 'Pick someone.' });
    const prev = e.backers?.[0]?.name;
    if (!setOwner(e, u)) return res.json({ ok: true, same: true });
    pushState(); refreshPreview();
    const label = `${e.label}${e.sub ? ` (${e.sub})` : ''}`;
    if (u && !String(u.discordId).startsWith('manual-') && db.settings.announceOwner !== false) discord.notify(`🏷️ **${label}** is now tagged to <@${u.discordId}>${prev ? ` (was ${prev})` : ''} — it counts as one of their picks.`).catch(() => {});
    if (db.settings.cloud?.enabled) cloud.sync(true).catch?.(() => {});
    res.json({ ok: true, name: u?.name || null });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

// ---------- open / close movie picks ----------
app.post('/api/picks-toggle', (req, res) => {
  const b = req.body || {};
  const was = picksClosed();
  if ('open' in b) db.picksClosed = !b.open;
  save(); pushState(); discord.refreshPinned?.();
  const now = picksClosed();
  if (was !== now && db.settings.announcePicks !== false) discord.notify(now ? '🔒 **Movie picks are closed** for now. Your movies are still in, and you can still check `/mymovies` and `/list`.' : '🍿 **Movie picks are open!** Use `/suggest` to add yours.').catch(() => {});
  if (db.settings.cloud?.enabled) cloud.sync(true)?.catch?.(() => {});
  res.json({ ok: true, closed: now });
});

// ---------- swaps ----------
app.post('/api/swaps/lock', (req, res) => { db.swapLock = !!req.body?.locked; save(); pushState(); res.json({ ok: true }); });

// ---------- luck saves: save everyone's luck, reset it for some battles, bring it back later ----------
// movies keep LUCK; custom battles keep their ODDS (e.g. everyone at 1 for a week, then bring everyone's odds back)
const isLuckList = l => l?.type === 'movies';
const luckSnap = l => isLuckList(l) ? Object.fromEntries(l.entries.filter(e => e.luckPct > 0).map(e => [e.id, e.luckPct])) : Object.fromEntries(l.entries.filter(e => e.status !== 'removed').map(e => [e.id, e.weight || 1]));
function saveLuck(name, listId = 'movies') {
  const l = getList(listId) || getList('movies'), luck = luckSnap(l);
  db.luckSaves ||= []; db.luckSaves.unshift({ id: uid(), at: Date.now(), name: String(name || '').slice(0, 60) || 'Saved luck', luck, listId: l.id, kind: isLuckList(l) ? 'luck' : 'odds' });
  db.luckSaves = db.luckSaves.slice(0, 60);
  return db.luckSaves[0];
}
const when = () => new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
app.post('/api/luck/save', (req, res) => { const s = saveLuck(req.body?.name || `Saved ${when()}`, req.body?.listId); save(); pushState(); res.json({ ok: true, id: s.id }); });
app.post('/api/luck/reset', (req, res) => {
  const l = getList(req.body?.listId || 'movies'); if (!l) return res.sendStatus(404);
  saveLuck(`Before reset · ${when()}`, l.id); autoBackup(isLuckList(l) ? 'luck-reset' : 'odds-reset'); // always kept, just in case
  const to = isLuckList(l) ? 0 : Math.max(.1, Number(req.body?.to) || 1);
  for (const e of l.entries) { if (isLuckList(l)) e.luckPct = 0; else e.weight = to; }
  save(); pushState(); refreshPreview(); res.json({ ok: true });
});
app.post('/api/luck/restore', (req, res) => {
  const s = (db.luckSaves || []).find(x => x.id === req.body?.id); if (!s) return res.status(404).json({ error: 'That save is gone.' });
  const l = getList(s.listId || 'movies'); if (!l) return res.status(404).json({ error: 'That battle is gone.' });
  saveLuck(`Before bringing back “${s.name}” · ${when()}`, l.id);
  autoBackup(isLuckList(l) ? 'luck-restore' : 'odds-restore');
  for (const e of l.entries) { if (isLuckList(l)) e.luckPct = s.luck[e.id] || 0; else if (e.id in s.luck) e.weight = s.luck[e.id]; }
  save(); pushState(); refreshPreview(); res.json({ ok: true, name: s.name });
});
app.delete('/api/luck/saves/:id', (req, res) => { db.luckSaves = (db.luckSaves || []).filter(x => x.id !== req.params.id); save(); pushState(); res.json({ ok: true }); });

// ---------- luck (manual, e.g. for Kirb spots) ----------
app.post('/api/luck', (req, res) => {
  const l = getList(req.body?.listId || 'movies'), e = l?.entries.find(x => x.id === req.body?.id);
  if (!e) return res.sendStatus(404);
  e.luckPct = Math.max(0, Math.min(1000, Number(req.body.luckPct) || 0)); save(); pushState(); refreshPreview(); res.json({ ok: true });
});

// ---------- channel point rewards (edit price, name, on/off) ----------
app.get('/api/twitch/rewards-list', async (req, res) => {
  try {
    const list = await twitch.listRewards();
    res.json({ rewards: list.map(r => ({ ...r, event: Object.entries(db.settings.rewards).find(([t]) => t.toLowerCase() === r.title.toLowerCase())?.[1] || null })) });
  } catch (e) { res.status(400).json({ error: e.message }); }
});
app.patch('/api/twitch/rewards/:id', async (req, res) => {
  try {
    const before = (await twitch.listRewards()).find(r => r.id === req.params.id);
    const after = await twitch.updateReward(req.params.id, req.body || {});
    // keep the "reward title → chaos event" link pointing at the right reward
    const rw = { ...db.settings.rewards };
    const oldKey = Object.keys(rw).find(t => before && t.toLowerCase() === before.title.toLowerCase());
    const ev = req.body && 'event' in req.body ? req.body.event : (oldKey && rw[oldKey]);
    if (oldKey) delete rw[oldKey];
    if (ev && after) rw[after.title] = ev;
    db.settings.rewards = rw; save(); pushState();
    res.json({ ok: true });
  } catch (e) { res.status(400).json({ error: e.message }); }
});
app.delete('/api/twitch/rewards/:id', async (req, res) => {
  try { const before = (await twitch.listRewards()).find(r => r.id === req.params.id); await twitch.deleteReward(req.params.id); if (before) { const rw = { ...db.settings.rewards }; for (const t of Object.keys(rw)) if (t.toLowerCase() === before.title.toLowerCase()) delete rw[t]; db.settings.rewards = rw; save(); } pushState(); res.json({ ok: true }); }
  catch (e) { res.status(400).json({ error: e.message }); }
});

// ---------- custom sounds ----------
const SOUND_LIST = ['music', 'lobby', 'go', 'tick', 'final5', 'land', 'bonk', 'dash', 'crumble', 'fall', 'out', 'lucky', 'alert', 'comet', 'smack', 'boom', 'collapse', 'earthquake', 'meteors', 'wind', 'ice', 'tornado', 'shockwave', 'thunder', 'lightning', 'boulder', 'swap', 'lowgrav', 'suddendeath', 'fanfare', 'claimStart', 'pop', 'ding', 'celebrate', 'buzzer', 'queued', 'joined', 'wheelSpin', 'wheelTick', 'wheelWin', 'wheelMove', 'wheelTimer', 'wheelGrow'];
// each map can have its own sounds too (data/sounds/maps/<map>/), they win over the all-maps ones on that map
const soundScope = map => !!map && (!!mapById(map) || /^wheel(-[a-z0-9]+)?$/i.test(map)); // 🎡 the wheel has its own sounds too
const soundDir = map => soundScope(map) ? path.join(DATA, 'sounds', 'maps', map) : path.join(DATA, 'sounds');
const listDir = d => { try { return fs.readdirSync(d).filter(f => /\.(mp3|wav|ogg|m4a)$/i.test(f)); } catch { return []; } };
app.get('/api/sounds/list', (req, res) => {
  const files = listDir(path.join(DATA, 'sounds')), map = soundScope(req.query.map) ? req.query.map : null, mf = map ? listDir(soundDir(map)) : [];
  const find = (arr, n) => arr.find(f => f.replace(/\.\w+$/, '').toLowerCase() === n.toLowerCase()) || null;
  const wheelScopes = () => { try { return fs.readdirSync(path.join(DATA, 'sounds', 'maps')).filter(d => /^wheel(-[a-z0-9]+)?$/i.test(d)); } catch { return []; } };
  const perMap = Object.fromEntries([...new Set([...MAP_LIST.map(m => m.id), 'wheel', ...wheelScopes()])].map(id => [id, listDir(soundDir(id)).length]));
  res.json({ map, perMap, sounds: SOUND_LIST.map(n => ({ name: n, custom: find(files, n), mapCustom: map ? find(mf, n) : null })) });
});
app.post('/api/sounds/upload', express.raw({ type: '*/*', limit: '30mb' }), (req, res) => {
  const name = String(req.query.name || ''), ext = String(req.query.ext || 'mp3').toLowerCase();
  if (!SOUND_LIST.includes(name) || !['mp3', 'wav', 'ogg', 'm4a'].includes(ext)) return res.status(400).json({ error: 'Use an mp3, wav, ogg or m4a file.' });
  const dir = soundDir(req.query.map); fs.mkdirSync(dir, { recursive: true });
  for (const f of fs.readdirSync(dir)) if (f.replace(/\.\w+$/, '').toLowerCase() === name.toLowerCase()) fs.rmSync(path.join(dir, f));
  fs.writeFileSync(path.join(dir, `${name}.${ext}`), req.body);
  broadcast({ type: 'reloadSounds' }, 'overlay'); res.json({ ok: true });
});
app.delete('/api/sounds/:name', (req, res) => {
  const dir = soundDir(req.query.map); fs.mkdirSync(dir, { recursive: true });
  for (const f of fs.readdirSync(dir)) if (f.replace(/\.\w+$/, '').toLowerCase() === req.params.name.toLowerCase()) fs.rmSync(path.join(dir, f));
  broadcast({ type: 'reloadSounds' }, 'overlay'); res.json({ ok: true });
});

// ---------- Test tab: try every feature without waiting for real viewers ----------
app.post('/api/test/alert', (req, res) => { chatlog.onAlert({ kind: String(req.body?.kind || 'sub'), login: 'test_viewer', name: 'Test_Viewer', amount: 5, text: String(req.body?.text || 'subscribed · 5 months') }); res.json({ ok: true }); });
app.post('/api/test/discord-battle', async (req, res) => { // a Discord movies battle with the real pieces on the cliff, but it changes nothing (no winner, no luck, no cooldowns)
  if (live.phase === 'lobby' || live.phase === 'running') return res.status(400).json({ error: 'A battle is already going.' });
  leaveEnded(); if (db.activeListId !== 'movies') { db.activeListId = 'movies'; previewIds = null; }
  const err = await startRound({ test: true }); err ? res.status(400).json({ error: err }) : res.json({ ok: true });
});
app.post('/api/test/reset-cooldowns', (req, res) => { // for testing: everyone's movies back in, nobody benched or out tonight
  if (live.phase === 'ended') leaveEnded();
  const r = resetCooldowns(); db.noShowStreak = 0; resetSpots(); save(); pushState(); refreshPreview(true); res.json({ ok: true, ...r });
});
// 🔍 Test tab: why is nobody (or only some) on the cliff? Everything that decides it, in plain words.
app.get('/api/test/cliff-why', async (req, res) => {
  const list = getList(db.activeListId), out = { gameScreenErrors: live.overlayErrors || [], phase: live.phase, list: list ? `${list.name} (${list.type})` : 'none', overlays: [...wss.clients].filter(c => c.role === 'overlay').length, chatGate: list?.type === 'movies' && db.settings.chatGate !== false, previewError, lastPreview: lastPreview ? { at: lastPreview.at, pieces: lastPreview.fighters.length } : null };
  if (list) {
    const by = {}; for (const e of list.entries) by[e.status || 'active'] = (by[e.status || 'active'] || 0) + 1; out.statuses = by;
    try { const { fighters } = await buildFighters(list, null); out.wouldShow = fighters.length; out.sample = fighters.slice(0, 12).map(f => f.label); } catch (e) { out.buildError = e.message; }
    if (list.type === 'movies') {
      const on = activeSet();
      out.people = discordPeople().map(p => { const mine = list.entries.filter(e => e.backers?.[0]?.discordId === p.discordId); return { name: p.name, twitch: p.twitch || '', chatting: on.has(p.discordId), active: mine.filter(e => e.status === 'active').length, benched: mine.filter(e => e.status === 'benched').length, away: mine.filter(e => e.status === 'away').length, paused: mine.filter(e => e.status === 'paused').length }; });
      out.spots = list.entries.filter(e => isSpot(e)).map(e => e.status);
      out.wonThisWeek = (db.week?.winners || []).length;
    }
  }
  res.json(out);
});
// ⚠️ error history (Test tab → ⚠️ Errors)
app.get('/api/errors', (req, res) => res.json(errlog.errors().map(e => ({ ...e, ...errlog.plain(e) }))));
app.post('/api/errors/clear', (req, res) => { errlog.clear(); res.json({ ok: true }); });
app.post('/api/errors/report', (req, res) => { const b = req.body || {}; errlog.logErr(String(b.source || 'control panel').slice(0, 30), b.msg, b.detail); res.json({ ok: true }); }); // from the control panel itself
app.get('/api/debug-report', (req, res) => { // everything Claude needs to find a problem, as plain text (no passwords or tokens)
  const st = db.settings, list = getList(db.activeListId), has = k => (st[k] ? 'set' : 'missing');
  const lines = [
    `Movie Royal ${VERSION} · ${process.platform} ${os.release()} · node ${process.version}${process.versions.electron ? ' · electron ' + process.versions.electron : ''} · ${new Date().toString()}`,
    `phase=${live.phase} activeList=${db.activeListId} (${list?.type || '?'}, ${list?.entries.length ?? 0} entries) map=${currentMap()} live=${!!db.live} overlays=${[...wss.clients].filter(c => c.role === 'overlay').length} wheelShow=${!!wheel.W().show}`,
    `lastPreview=${lastPreview ? `${lastPreview.fighters.length} pieces ${Math.round((Date.now() - (lastPreview.at || 0)) / 1000)}s ago` : 'none'} previewError=${previewError || '-'}`,
    `twitch=${twitch.status.state} chat=${twitch.status.chat} login=${twitch.status.login || '-'} canChat=${!!twitch.status.canChat} err=${twitch.status.error || '-'}`,
    `discord=${discord.status.state} err=${discord.status.error || '-'} guilds=${(discord.status.guilds || []).length}`,
    `cloud enabled=${cloud.enabled()} linked=${cloud.status.linked} botUp=${cloud.status.botUp} lastSync=${cloud.status.lastSync ? new Date(cloud.status.lastSync).toISOString() : '-'} err=${cloud.status.lastError || cloud.status.linkError || '-'}`,
    `letterboxd user=${st.letterboxdUser ? 'set' : 'missing'} ${JSON.stringify(lb.stats())}`,
    `keys: tmdb=${has('tmdbKey')} omdb=${has('omdbKey')} discordToken=${has('discordToken')} twitchClient=${has('twitchClientId')}`,
    `settings: chatGate=${st.chatGate !== false} fairOdds=${st.fairOdds !== false} claimApprove=${st.claimApprove !== false} pinWinner=${st.pinWinner !== false} maxFighters=${st.maxFighters} map=${st.map} pointsOn=${st.pointsOn !== false}`,
    list?.type === 'movies' ? `stream active=${JSON.stringify(stream().active)} weekWinners=${(db.week?.winners || []).length} statuses=${JSON.stringify(list.entries.reduce((o, e) => (o[e.status || 'active'] = (o[e.status || 'active'] || 0) + 1, o), {}))}` : '',
    '', `--- errors (newest first, ${errlog.errors().length}) ---`,
    ...errlog.errors().slice(0, 60).map(e => `${new Date(e.at).toISOString()} [${e.source}]${e.count > 1 ? ` x${e.count}` : ''} ${e.msg}${e.detail ? '\n    ' + e.detail.split('\n').slice(0, 6).join('\n    ') : ''}`)
  ].filter(x => x !== '');
  res.type('text/plain').send(lines.join('\n'));
});
// problems that show up as a status (not a crash) go in the history too, once each time they change
{
  const seen = {};
  const watch = (k, src, v) => { v = v ? String(v) : ''; if (v && v !== seen[k]) errlog.logErr(src, v); seen[k] = v; };
  setInterval(() => {
    watch('tw', 'twitch', twitch.status.error); watch('dc', 'discord', discord.status.error);
    const L = lb.stats(); watch('lbp', 'letterboxd', L.profileError); watch('lbr', 'letterboxd', L.rssError);
    watch('cl', '24/7', cloud.status.lastError); watch('cll', '24/7', cloud.status.linkError); watch('obs', 'obs', obs.status.error);
  }, 10000);
}
const debugText = e => { const p = errlog.plain(e); return `⚠️ **${p.who}: ${p.what}**${p.fix ? `\n👉 ${p.fix}` : ''}\n\`\`\`\n[${e.source}] ${String(e.msg).slice(0, 700)}${e.detail ? '\n' + e.detail.split('\n').slice(0, 5).join('\n').slice(0, 600) : ''}\nMovie Royal ${VERSION} · ${new Date(e.at).toLocaleString()}\n\`\`\``; };
errlog.setOnNew(e => {
  broadcast({ type: 'errorLogged' }, 'control');
  if (['discord', '24/7', 'cloud'].includes(e.source) || db.settings.discordDebugAll) discord.postDebug(debugText(e)); // 🐞 Discord problems go to the mods-only #movie-royal-debug channel too
});
app.post('/api/discord/restart', async (req, res) => { // 🔄 turn the Discord bot off and on again (reconnects, re-makes slash commands, channels and pins)
  if (!db.settings.discordToken || !db.settings.discordClientId) return res.status(400).json({ error: 'Put in the Application ID and Bot token first.' });
  await discord.start(pushState);
  for (let i = 0; i < 20 && discord.status.state === 'connecting'; i++) await new Promise(r => setTimeout(r, 500)); // (wait up to 10 s to say how it went)
  pushState(); res.json({ ok: true, state: discord.status.state, error: discord.status.error || null });
});
app.post('/api/discord/debug-setup', async (req, res) => { try { const w = await discord.setupDebugAll(); pushState(); res.json({ ok: true, warnings: w }); } catch (e) { res.status(400).json({ error: e.message }); } });
app.post('/api/test/discord-selftest', async (req, res) => { // 🤖 everything about Discord the app can check by itself
  try {
    const out = await discord.selfTest();
    if (cloud.enabled()) { const st = await cloud.checkLink(true); out.push({ ok: !!st.linked && st.botUp !== false, label: '24/7 bot: Discord is connected to it (works with Movie Royal closed)', detail: st.linkError || (st.botUp === false ? "the 24/7 bot isn't answering" : '') }); }
    else out.push({ ok: null, label: '24/7 bot is off (Discord only works while Movie Royal is open)' });
    const bad = out.filter(x => x.ok === false);
    discord.postDebug(`🤖 **Discord self-test:** ${bad.length ? `${bad.length} problem${bad.length === 1 ? '' : 's'}` : 'everything passed ✅'}\n${out.map(x => `${x.ok === false ? '❌' : x.ok ? '✅' : '🟡'} ${x.label}${x.detail ? ` — ${x.detail}` : ''}`).join('\n')}`);
    res.json({ ok: true, results: out });
  } catch (e) { res.status(400).json({ error: e.message }); }
});
app.post('/api/test/discord-debug', (req, res) => { // Test tab: a pretend problem in the debug channel
  discord.postDebug(debugText({ source: 'discord', msg: 'This is a test from the 🧪 Test tab. If you can read this, the debug channel works!', detail: '', at: Date.now() }));
  res.json({ ok: !!Object.keys(db.discordDebug || {}).length && discord.status.state === 'online' });
});
app.post('/api/test/chat-join', (req, res) => { // someone with Discord movies "types in Twitch chat"
  const on = activeSet(), p = discordPeople().find(x => !on.has(x.discordId) && getList('movies')?.entries.some(e => e.status === 'active' && e.backers?.[0]?.discordId === x.discordId)) || discordPeople()[0];
  if (!p) return res.json({ ok: false, error: 'Nobody has Discord movies yet.' });
  const name = p.twitch || p.name; twitchHandlers.chat({ login: name.toLowerCase(), name, text: 'hi! 👋' }); res.json({ ok: true, name: p.name });
});
app.post('/api/test/sitout', async (req, res) => { // someone types !sitout, then !imback a few seconds later
  const p = discordPeople().find(x => getList('movies')?.entries.some(e => ['active', 'away'].includes(e.status) && e.backers?.[0]?.discordId === x.discordId));
  if (!p) return res.json({ ok: false, error: 'Nobody has Discord movies yet.' });
  const name = p.twitch || p.name, say = t => twitchHandlers.chat({ login: name.toLowerCase(), name, text: t });
  say(db.settings.sitOutCommand || '!sitout'); setTimeout(() => say(db.settings.backCommand || '!imback'), 5000); res.json({ ok: true, name: p.name });
});
app.post('/api/test/everyone-in', (req, res) => { // for testing: pretend everyone with a movie typed in chat
  if (live.phase === 'ended') leaveEnded(); // a battle that finished but never got "Next round"
  if (db.activeListId !== 'movies') { db.activeListId = 'movies'; previewIds = null; }
  const st = stream(); st.active = [...new Set([...st.active, ...discordPeopleWithMovies().map(p => p.key)])];
  const sp = resetSpots(); // the wild spots too
  save(); pushState(); refreshPreview(true); res.json({ ok: true, people: st.active.length, spots: sp.total });
});
twitch.sayListeners.add(t => broadcast({ type: 'botSay', text: t }, 'control'));
// 🧪 Test tab: walk through tonight's pinned messages with pretend movies (nothing is pinned or counted)
app.post('/api/test/pin-sim', (req, res) => {
  const step = String(req.body?.step || ''), who = db.settings.spotName || 'Kirb';
  const S = live.pinSim ||= { movies: 0, tonight: [], spotPending: null };
  const pool = (getList('movies')?.entries || []).filter(e => e.kind !== 'spot'), films = db.lists.filter(l => l.type === 'films').flatMap(l => l.entries || []);
  const pick = (arr, fb) => { const e = arr[Math.floor(Math.random() * arr.length)]; return e ? { id: e.id, label: e.label, sub: e.sub || '', owner: e.backers?.[0]?.name || '' } : fb; };
  let text = '';
  if (step === 'clear') { live.pinSim = null; return res.json({ ok: true, text: '', discord: '' }); }
  if (step === 'movie') { const m = pick(pool, { id: 'p' + S.movies, label: 'Heat', sub: '1995', owner: 'Lucy' }); S.spotPending = null; S.movies++; const t = { ...m, n: S.movies }; S.tonight.push(t); text = pinText(`📌🍿 Movie #${t.n} of tonight's stream: ${t.label}${t.sub ? ` (${t.sub})` : ''}${t.owner ? ` — ${t.owner}'s movie` : ''}`, t.n, S.tonight); }
  else if (step === 'spot') { S.spotPending = { label: `${who}'s Pick` }; text = `(nothing is pinned yet: the ${who} spot battle's winner gets pinned)`; }
  else if (step === 'kirb' || step === 'kirbText') { if (!S.spotPending) return res.json({ ok: false, error: `Press "🎟️ A wild spot wins" first.` }); const plain = step === 'kirbText', m = plain ? { id: 'kt' + S.movies, label: 'Pizza night', sub: '' } : pick(films, { id: 'k' + S.movies, label: 'Paddington 2', sub: '2017' }); S.spotPending = null; S.movies++; const t = { ...m, owner: who, viaSpot: true, n: S.movies, text: plain || undefined }; S.tonight.push(t); text = plain ? `(nothing is pinned: “${t.label}” is a text entry, so you pin it yourself)` : pinText(`📌🍿 Movie #${t.n} of tonight's stream: ${t.label}${t.sub ? ` (${t.sub})` : ''} — 🎟️ ${who}'s pick (a wild spot won, then this won the ${who} spot battle)`, t.n, S.tonight); }
  else return res.json({ ok: false, error: 'Unknown step.' });
  const lines = S.tonight.filter(x => !x.text).map(movieLine);
  res.json({ ok: true, text, discord: lines.length ? `🎬 Tonight's movies:\n${lines.map(l => '• ' + l).join('\n')}` : '' });
});
app.post('/api/test/claim-chat', (req, res) => { // Test tab: the movie winner "types in chat"
  let w = live.lastWinner;
  if (!w || w.spot || live.phase !== 'ended' || !(w.ownerLogin || w.owner)) { // no movie winner up: make a pretend one (a test winner changes nothing)
    if (live.phase === 'lobby' || live.phase === 'running') return res.json({ ok: false, error: 'Wait for the battle to end first.' });
    const pool = (getList('movies')?.entries || []).filter(e => e.status === 'active' && e.kind !== 'spot' && e.backers?.[0]);
    if (!pool.length) return res.json({ ok: false, error: 'Nobody has a Discord movie yet, so there is no winner to pretend with.' });
    const e = pool[Math.floor(Math.random() * pool.length)], b = e.backers[0], login = db.links?.[b.discordId] || null;
    if (live.claim) clearTimeout(live.claim.timer);
    w = live.lastWinner = { ...e, owner: b.name, ownerLogin: login, kind: 'movies', test: true, listId: 'movies', listName: '🧪 Pretend winner', at: Date.now() };
    live.claim = null; live.phase = 'ended';
    pushState();
  }
  if (!live.claim || live.claim.done) { live.claim = { winner: w, endsAt: Date.now() + 30000, claimed: false, done: false }; live.claim.timer = setTimeout(() => finishClaim(false), 30000); broadcast({ type: 'claimStart', winner: w, seconds: 30, recent: [] }, 'overlay'); } // start the claim timer if it isn't going
  const login = (w.ownerLogin || norm(w.owner || 'winner')).toLowerCase();
  if (req.body?.say === false) return res.json({ ok: true, name: w.owner || login, login, label: w.label }); // the pretend chat window types it instead
  twitchHandlers.chat({ login, name: w.owner || login, text: "I'm here! 🍿" }); res.json({ ok: true, name: w.owner || login, login, label: w.label });
});
app.post('/api/test/pin', async (req, res) => { try { await twitch.sayAndPin('📌 Movie Royal test: pinned messages work! (unpin it any time)'); res.json({ ok: true }); } catch (e) { res.status(400).json({ error: e.message }); } });
app.post('/api/test/chat', (req, res) => { twitch.pretend.until = Date.now() + 10 * 60000; const name = String(req.body?.name || 'test_viewer').trim().replace(/^@/, ''); twitchHandlers.chat({ login: name.toLowerCase(), name, text: String(req.body?.text || 'hello!'), badges: req.body?.badges || {}, userId: null, emotes: req.body?.emotes || '', color: req.body?.color || null, badgeList: req.body?.badgeList || '' }); res.json({ ok: true }); });
app.post('/api/test/pc-movie', async (req, res) => { // 💬 pretend chat: this pretend viewer adds a movie, as if they used /suggest in Discord (and linked their Twitch)
  twitch.pretend.until = Date.now() + 10 * 60000;
  const name = String(req.body?.name || 'test_viewer').trim().replace(/^@/, '') || 'test_viewer', login = name.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 25) || 'test_viewer';
  const title = String(req.body?.title || '').trim(); if (!title) return res.status(400).json({ error: 'Type a movie title first' });
  const user = { discordId: 'pretend-' + login, name, avatar: null };
  db.links ||= {}; if (!db.links[user.discordId]) { db.links[user.discordId] = login; (db.linkDates ||= {})[user.discordId] = Date.now(); (db.linkNames ||= {})[user.discordId] = { name, avatar: null }; }
  try { const r = await suggest(title, user); save(); pushState(); refreshPreview(); res.json({ ok: !!r.ok, msg: String(r.msg || '').replace(/\*\*/g, ''), pretend: true }); }
  catch (e) { res.status(400).json({ error: e.message }); }
});
app.post('/api/test/pc-movie-clear', (req, res) => { // 🧹 take the pretend viewers' movies (and links) out again
  let n = 0; const l = getList('movies');
  for (const e of l?.entries || []) if (e.backers?.length && e.backers.every(b => String(b.discordId).startsWith('pretend-')) && e.status !== 'removed') { e.status = 'removed'; n++; }
  for (const k of Object.keys(db.links || {})) if (k.startsWith('pretend-')) { delete db.links[k]; delete db.linkDates?.[k]; delete db.linkNames?.[k]; }
  save(); pushState(); refreshPreview(true); res.json({ ok: true, n });
});
app.post('/api/test/wheel-land', wTry(b => wheel.request(b.kind === 'respin' ? 'respin' : 'spin', {}, { force: String(b.entryId || ''), wheelId: b.wheelId }))); // Test tab: land on a spot you pick
app.post('/api/test/doom-preview', (req, res) => { broadcast({ type: 'wheelDoom', text: `${streamerName().toUpperCase()} WILL RETURN FOR DOOMSDAY!!!`, preview: true }, 'overlay'); res.json({ ok: true }); }); // just the screen, nothing turns off
app.post('/api/test/obs-mute', wTry(async () => obs.muteTest(5000)));
// ☠️ Test tab: the WHOLE Doomsday for real (the screen + mic and camera off + the stream ends 15 s later if you're live, then mic + camera back on).
// While you're live it first asks (the pop-up with the 5-second wait is in the control panel); the real Doomsday never asks.
app.post('/api/test/doomsday', wTry(async b => {
  const obsLive = await obs.streaming().catch(() => null), isLive = !!db.live || obsLive === true;
  if (isLive && !b.confirm) return { needConfirm: true };
  broadcast({ type: 'wheelDoom', text: `${streamerName().toUpperCase()} WILL RETURN FOR DOOMSDAY!!!`, ...(isLive ? {} : { test: true }) }, 'overlay');
  broadcast({ type: 'toast', text: isLive ? '☠️ DOOMSDAY TEST: your stream ends in 15 seconds.' : '☠️ Doomsday test (not live): mic + camera off for 15 seconds, then back on.' }, 'control');
  obs.doomsday(15000).then(r => broadcast({ type: 'toast', text: `☠️ Doomsday test done: ${r.ended ? 'the stream ended, ' : ''}${r.mics.length} mic(s) + ${r.cams} camera spot(s) back on.` }, 'control'))
    .catch(e => { console.error('[obs] Doomsday test:', e.message); broadcast({ type: 'toast', text: '⚠️ Doomsday test: ' + e.message }, 'control'); });
  return { ok: true, live: isLive, obs: obsLive !== null };
}));
app.post('/api/test/power', (req, res) => { const kind = String(req.body?.kind || 'shield'), name = String(req.body?.name || 'test_viewer'); const title = Object.entries(db.settings.powerRewards || {}).find(([, k]) => k === kind)?.[0]; if (!title) return res.status(400).json({ error: 'no such power-up' }); twitchHandlers.redeem({ title, login: name.toLowerCase(), name, input: '' }); res.json({ ok: true }); }); // Test tab: pretend someone redeemed a ball power-up
app.post('/api/test/live', (req, res) => { // Test tab: pretend you went live / offline. Only inside Movie Royal: Twitch, Discord and your rewards don't change.
  const on = !!req.body?.live, was = !!live.fakeLive; live.fakeLive = on;
  if (on && !was && !db.live) { stream().movies = 0; stream().tonight = []; delete stream().spotPending; stream().raidUsed = false; live.raid = null; stream().startedAt = Date.now(); wheel.newStream(); } // what a new stream does inside the app
  broadcast({ type: 'toast', text: on ? '🔴 Pretending you\'re live (only inside Movie Royal: Twitch and Discord don\'t know)' : '⚫ Stopped pretending to be live' }, 'control');
  save(); pushState(); res.json({ ok: true, live: on });
}); // Test tab: pretend you went live / offline
app.post('/api/test/wheel-redeem-raw', (req, res) => { const b = req.body || {}; const ok = wheel.wheelRedeem({ title: String(b.title || ''), input: b.input, login: String(b.name || 'test').toLowerCase(), name: String(b.name || 'test'), cost: 100 }); res.json({ ok }); });
app.post('/api/test/wheel-redeem', (req, res) => { twitch.pretend.until = Date.now() + 10 * 60000; const k = String(req.body?.kind || 'respin'), name = String(req.body?.name || 'test_viewer'); const ok = wheel.wheelRedeem({ title: wheel.W().rewards[k] || k, testKind: k, login: name.toLowerCase().replace(/\s+/g, '_'), name }); res.json({ ok }); });
app.post('/api/test/reward-redeem', async (req, res) => { twitch.pretend.until = Date.now() + 10 * 60000; const title = String(req.body?.title || ''); if (!title) return res.status(400).json({ error: 'Which reward?' }); await twitchHandlers.redeem({ login: 'test_viewer', name: 'test_viewer', title, input: String(req.body?.input || '') }); res.json({ ok: true, left: (db.rewardModes || {})[title.toLowerCase()] === 'count' ? countLeft(title.toLowerCase()) : null }); }); // 🧪 pretend a channel point redeem of any reward (its rules too)
app.post('/api/test/redeem', (req, res) => { triggerEvent(req.body?.event || 'random', { name: String(req.body?.name || 'test_viewer'), avatar: null }, req.body?.bits ? 'bits' : 'points'); res.json({ ok: true }); });
app.post('/api/test/cheer', async (req, res) => { await twitchHandlers.cheer({ bits: Number(req.body?.bits) || 100, login: null, name: String(req.body?.name || 'test_viewer') }); res.json({ ok: true }); });
app.post('/api/test/check-movie', async (req, res) => {
  try {
    const q = String(req.body?.query || ''); const r = await searchMovies(q); if (!r.length) return res.json({ msg: `TMDB found nothing for "${q}".` });
    const m = await tmdbMovie(r[0].id); const b = blockReason(m, null);
    res.json({ msg: b ? `Discord would say: ${b.msg.replace(/\*/g, '')}` : `✅ ${m.title} (${m.year}) can be picked.${m.collection ? ` (Part of the ${m.collection.name} — once it's in, the rest of the series is blocked.)` : ''}` });
  } catch (e) { res.status(400).json({ error: e.message }); }
});
app.post('/api/test/discord', async (req, res) => { try { res.json({ msg: (await discord.postTest()).join(' · ') }); } catch (e) { res.status(400).json({ error: e.message }); } });
app.post('/api/test/twitch-say', async (req, res) => { try { await twitch.say(String(req.body?.text || '🧪 Movie Royal test message')); res.json({ msg: 'Sent! Check your Twitch chat.' }); } catch (e) { res.status(400).json({ error: e.message }); } });
app.post('/api/test/omdb', async (req, res) => res.json(await testOmdb()));
app.post('/api/test/battle', async (req, res) => { // a practice round with made-up entries; your real lists and history aren't touched
  if (live.phase === 'lobby' || live.phase === 'running') return res.status(400).json({ error: 'A battle is already going.' });
  if (wheel.W().show) wheel.setShow(false); // the battle goes on stream
  const names = ['Popcorn Pete', 'Reel Goblin', 'VHS Kid', 'Night Owl', 'Mia', 'Big Screen Bob', 'Lena', 'Ozzy', 'Frames', 'Snack Attack'];
  const movies = [['The Thing', '1982'], ['Heat', '1995'], ['Coco', '2017'], ['Jaws', '1975'], ['Alien', '1979'], ['Arrival', '2016'], ['Hot Fuzz', '2007'], ['Oldboy', '2003'], ['Paddington 2', '2017'], ['Knives Out', '2019']];
  const count = clampN(req.body?.count, 2, Math.max(2, Number(db.settings.maxFighters) || 1000), 10);
  const many = Array.from({ length: count }, (_, i) => i < movies.length ? movies[i] : [`${movies[i % movies.length][0]} ${Math.floor(i / movies.length) + 1}`, movies[i % movies.length][1]]);
  const lucks = [0, 0, 5, 10, 20, 35, 50, 65, 80, 100]; // practice rounds show off the luck glow and flames
  const fighters = many.map(([t, y], i) => ({ id: 'test-' + i, label: t, sub: y, weight: 1, luck: req.body?.luck === false ? 0 : lucks[i % lucks.length], owner: names[i % names.length], showOwner: true, kind: 'films', details: { director: 'Test', genres: ['Test'], synopsis: 'This is a practice round.' } }));
  if (req.body?.fun) { const F = getList('chat-join')?.fun || {}, kinds = Object.keys(POWER_INFO).filter(k => !F.powersOff?.[k]); fighters.forEach((f, i) => { if (kinds.length && i % 2 === 0) { const k = kinds[(i / 2) % kinds.length]; f.powers = { [k]: k === 'shield' ? 1 : true }; f.label += ' ' + POWER_INFO[k].icon; } }); } // 🎉 Chat battle tab → 🧪 Try it: half of them powered up
  if (req.body?.chars) fighters.forEach((f, i) => { f.gender = db.settings.charGenders === false || db.settings.idOn === false ? 'n' : ['m', 'f', 'n'][i % 3]; }); // 🧍 characters: men, women and non-binary
  if (req.body?.numbers) fighters.forEach((f, i) => Object.assign(f, { label: String(i + 1), sub: '', luck: 0, owner: null, showOwner: false, details: null, image: null, poster: null, kind: 'text' })); // 🔢 a number battle
  const tmap = req.body?.map && req.body.map !== 'random' && mapById(req.body.map) ? req.body.map : req.body?.map === 'random' ? MAP_LIST[Math.floor(Math.random() * MAP_LIST.length)].id : currentMap();
  live.game = { id: 'test-' + uid(), listId: null, fighters, total: fighters.length, test: true, map: tmap, startedAt: Date.now() };
  live.phase = 'lobby'; live.claim = null;
  broadcast({ type: 'start', gameId: live.game.id, fighters, total: fighters.length, map: tmap, listName: req.body?.fun ? '🎉 Pretend fun battle' : '🧪 Practice round', kind: 'films', skin: req.body?.chars ? 'chars' : undefined, fun: req.body?.fun ? { ...(getList('chat-join')?.fun?.wacky || {}) } : null, lobbySeconds: req.body?.lobby != null ? clampN(req.body.lobby, 0, 120, 10) : db.settings.lobbySeconds, gameSeconds: req.body?.game != null ? clampN(req.body.game, 10, 600, 30) : db.settings.gameSeconds, pacer: clampN(req.body?.pacer ?? db.settings.pacer ?? 50, 0, 100, 50), fairOdds: true, laps: clampN(req.body?.laps ?? db.settings.f8Laps ?? 5, 1, 50, 5), survival: req.body?.survival ?? null, queued: [] }, 'overlay');
  pushState(); res.json({ ok: true });
});

app.get('/api/search', async (req, res) => {
  try {
    const r = await searchMovies(req.query.q);
    res.json(r.slice(0, 10).map(m => ({ ...m, watched: lb.lookup({ title: m.title, year: m.year, tmdbId: m.id }) })));
  } catch (e) { res.status(400).json({ error: e.message }); }
});
app.post('/api/movies/add', async (req, res) => {
  try { const r = await suggest(String(req.body.tmdbId), null); pushState(); res.json(r); } catch (e) { res.status(400).json({ error: e.message }); }
});

// game
function nextSeriesRound() { // best-of: the next round starts by itself
  const sr = live.series; if (!sr || sr.done || live.phase !== 'ended' || db.activeListId !== sr.listId) return;
  if (live.claim) clearTimeout(live.claim.timer); live.claim = null; nextMap(); live.phase = 'idle'; live.game = null;
  broadcast({ type: 'reset' }, 'overlay'); pushState(); refreshPreview(true);
  setTimeout(() => startRound().then(err => { if (err) broadcast({ type: 'toast', text: '⚠️ ' + err }, 'control'); }), 2500);
}
async function startRound(opts = {}) {
  cards.setShow(false); // returns an error message, or null when the round started (opts.test: a test battle with the real pieces that changes nothing)
  if (wheel.W().show) wheel.setShow(false); // a battle is starting: the battle goes on stream
  rollWeek();
  const list = getList(db.activeListId);
  const active = list?.entries.filter(e => e.status === 'active') || [];
  if (active.length < 2) return 'Need at least 2 entries in the list to start.';
  if (![...wss.clients].some(c => c.role === 'overlay')) return "The game screen isn't open. Reload the control panel (or bring back the pop-out game window).";
  const { fighters, total } = await buildFighters(list, previewList === list.id ? previewIds : null);
  if (fighters.length < 2) {
    if (list.type !== 'movies' || db.settings.chatGate === false) return 'Need at least 2 entries on the cliff to start.';
    const on = fighters.map(f => `${f.label}${f.owner ? ' (' + f.owner + ')' : ''}`).join(', ') || 'nothing yet';
    return `Only ${fighters.length} movie on the cliff (${on}) — need at least 2. Movies join when their person types in Twitch chat. If someone typed but didn't get in, link them under "Recent chatters" in the Pool tab, or switch them on in the People tab.`;
  }
  previewIds = null; if (live.vote) endVote();
  live.game = { id: uid(), listId: list.id, fighters, total, map: currentMap(), startedAt: Date.now(), ...(opts.test ? { test: true, testName: `🧪 Test: ${list.name}` } : {}) }; live.mapUsed = !opts.test;
  live.phase = 'lobby'; live.claim = null;
  const queued = opts.test ? [] : db.pendingEffects; if (!opts.test) db.pendingEffects = []; save();
  broadcast({
    type: 'start', map: currentMap(), gameId: live.game.id, fighters, total, listName: list.screenTitle || list.name, kind: list.type, skin: list.chars ? 'chars' : undefined, movieNo: list.type === 'movies' || (stream().spotPending && list.type !== 'chat' && !list.giveaway && !live.game.test) ? (stream().movies || 0) + 1 : null,
    lobbySeconds: db.settings.lobbySeconds, gameSeconds: db.settings.gameSeconds, pacer: clampN(db.settings.pacer ?? 50, 0, 100, 50), fairOdds: true, /* 🎯 every battle's winner is drawn by the odds before it starts (luck included), and the battle plays out around it (Derek's rule) */ laps: clampN(db.settings.f8Laps ?? 5, 1, 50, 5), fun: list.type === 'chat' ? { ...(list.fun?.wacky || {}) } : null, chaos: chaosState(), queued,
    series: list.type !== 'movies' && (Number(list.bestOf) || 1) > 1 ? (live.series && !live.series.done && live.series.listId === list.id ? { bestOf: live.series.bestOf, need: live.series.need, round: live.series.round + 1, tally: Object.entries(live.series.wins).sort((a, b) => b[1] - a[1]).map(([id, n]) => ({ id, label: live.series.names[id], n })) } : { bestOf: Number(list.bestOf), need: Math.ceil(Number(list.bestOf) / 2), round: 1, tally: [] }) : null
  }, 'overlay');
  if (list.type !== 'movies' && live.series && (live.series.done || live.series.listId !== list.id)) live.series = null;
  pushState();
  if (live.capture && db.settings.capAutoHide) setCapture(false).catch(() => {}); // 📺 the battle starts: hide the capture window (if you chose that)
  return null;
}
function stopGather(silent) { if (!live.gather) return; clearTimeout(live.gather.timer); live.gather = null; if (!silent) broadcast({ type: 'gather', endsAt: null }, 'overlay'); }
app.post('/api/stop', (req, res) => { // stop a battle mid-fight: no winner, nothing saved
  if (live.phase !== 'lobby' && live.phase !== 'running') return res.json({ ok: true });
  live.phase = 'idle'; live.game = null; live.claim = null; live.series = null; live.mapUsed = false; closeBoard();
  broadcast({ type: 'reset' }, 'overlay'); pushState(); refreshPreview(true); res.json({ ok: true });
});
app.post('/api/start', async (req, res) => {
  stopGather(true);
  const err = await startRound();
  err ? res.status(400).json({ error: err }) : res.json({ ok: true });
});
// "give people time to chat": countdown on the cliff, pieces drop in as people chat. Other battles start by themselves
// when it runs out. 🎬 Discord battles (Derek's way): the board is reset (only people who chat during it get on), a
// numbered list of every movie shows on the right of the battle screen, chat votes who'll win by typing the number or
// the movie name (right = +luck on their own movies next time), and the battle does NOT start by itself: Derek starts it.
live.board = null;
function boardRows() {
  const l = getList('movies'); if (!l || !live.board) return [];
  const on = activeSet(), gate = db.settings.chatGate !== false, votes = new Map(); for (const v of live.calls.values()) { const k = v.spot ? 'spot' : v.id; votes.set(k, (votes.get(k) || 0) + 1); }
  return live.board.rows.map(r => { const e = l.entries.find(x => x.id === r.id); const login = r.ownerId ? db.links[r.ownerId] : null, wl = e ? watchLuck(l, login) : 0;
    return { ...r, luck: e ? Math.round(((luckOn() ? (e.luckPct || 0) : 0) + wl) * 10) / 10 : 0, on: !!e && e.status === 'active' && (r.spot || !gate || !r.ownerId || on.has(r.ownerId) || !!e.forceIn), votes: votes.get(r.spot ? 'spot' : r.id) || 0 }; });
}
let boardT = null;
function sendBoard(now) { clearTimeout(boardT); const go = () => broadcast({ type: 'gatherBoard', board: live.board ? { rows: boardRows(), bonus: db.settings.callsOn === false ? 0 : Number(db.settings.callLuck ?? 1), endsAt: live.gather?.endsAt || 0, open: live.phase !== 'running' && live.phase !== 'ended' } : null }, 'overlay'); if (now) go(); else boardT = setTimeout(go, 500); }
function closeBoard() { if (!live.board) return; live.board = null; sendBoard(true); }
function makeBoard() { // every movie in the Discord battle, numbered (by who picked it, then title), so chat can vote by number
  const l = getList('movies'); if (!l) return null;
  const pool = l.entries.filter(e => e.status === 'active').sort((a, b) => (a.kind === 'spot') - (b.kind === 'spot') || String(a.backers?.[0]?.name || '').localeCompare(String(b.backers?.[0]?.name || '')) || a.label.localeCompare(b.label));
  return { rows: pool.map((e, i) => ({ n: i + 1, id: e.id, label: e.label, sub: e.sub || '', owner: e.kind === 'spot' ? '' : (e.backers?.[0]?.name || ''), ownerId: e.backers?.[0]?.discordId || null, spot: e.kind === 'spot' || undefined })) };
}
function boardVote(m) { // 🔮 a plain number or movie name in chat while the board is up = a call on that movie
  if (!live.board || !m.login || live.phase === 'running' || live.phase === 'ended' || db.settings.callsOn === false) return false;
  const text = String(m.text || '').trim(); if (!text || text.length > 80) return false;
  const rows = live.board.rows; let hit = null;
  const num = text.match(/^#?(\d{1,3})$/); if (num) hit = rows.find(r => r.n === Number(num[1]));
  else { const q = norm(text); if (q.length < 2) return false; hit = rows.find(r => norm(r.label) === q); if (!hit && q.length >= 4) { const sw = rows.filter(r => norm(r.label).startsWith(q)); if (sw.length === 1) hit = sw[0]; } }
  if (!hit) return false;
  live.calls.set(m.login.toLowerCase(), hit.spot ? { spot: true, label: hit.label, name: m.name } : { id: hit.id, label: hit.label, name: m.name });
  sendBoard(); clearTimeout(callsBcast); callsBcast = setTimeout(pushState, 400); return true;
}
app.post('/api/gather/start', (req, res) => {
  if (live.phase === 'lobby' || live.phase === 'running') return res.status(400).json({ error: 'A battle is already going.' });
  if (live.phase === 'ended' || live.claim) { // coming from a finished round: put the next round's pieces back first
    if (live.claim) clearTimeout(live.claim.timer);
    live.claim = null; live.phase = 'idle'; live.game = null; broadcast({ type: 'reset' }, 'overlay'); refreshPreview(true);
  }
  stopGather(true);
  const seconds = Math.max(10, Number(req.body?.seconds) || 120), discordBattle = db.activeListId === 'movies';
  live.gather = { endsAt: Date.now() + seconds * 1000, discord: discordBattle };
  if (discordBattle) { // 🎬 reset the board: only people who chat now get their movies on (plus anything you put in with ▶)
    if (db.settings.chatGate !== false) { stream().active = []; save(); }
    live.calls.clear(); live.board = makeBoard(); refreshPreview(true); sendBoard(true);
    const n = live.board?.rows.length || 0, luck = Number(db.settings.callLuck ?? 1);
    if (twitch.canSay()) twitch.say(`⏱️ ${Math.round(seconds / 60 * 10) / 10} minutes to join the battle! Got a movie in Discord? Type anything in chat to put it on the battlefield. 🔮 Who's gonna win? Type the NUMBER or the MOVIE NAME from the list on screen (1–${n})${db.settings.callsOn !== false && luck ? `: if it wins, +${luck}% luck on your own movies next time 🍀` : ''}`).catch(() => {});
  }
  live.gather.timer = setTimeout(async () => {
    const g = live.gather; live.gather = null; broadcast({ type: 'gather', endsAt: null }, 'overlay');
    if (g?.discord) { // 🎬 Discord battles: time's up, but YOU start the battle
      sendBoard(true); broadcast({ type: 'toast', text: '⏱️ Join time is up. Press START ROYAL when you\'re ready (people can still vote until the fight starts).' }, 'control');
      if (twitch.canSay() && live.board) twitch.say('⏱️ Time\'s up! The battle starts soon: last chance to vote who wins (type the number or the movie name) 🔮').catch(() => {});
      pushState(); return;
    }
    const err = await startRound();
    if (err) { broadcast({ type: 'gatherFailed', error: err }, 'overlay'); pushState(); }
  }, seconds * 1000);
  setTimeout(() => broadcast({ type: 'gather', endsAt: live.gather?.endsAt || null, seconds, discord: discordBattle }, 'overlay'), 400);
  pushState(); res.json({ ok: true });
});
app.post('/api/gather/cancel', (req, res) => { stopGather(); closeBoard(); pushState(); res.json({ ok: true }); });
app.post('/api/reset', (req, res) => { closeBoard(); nextMap(); live.phase = 'idle'; live.game = null; if (live.claim) clearTimeout(live.claim.timer); live.claim = null; broadcast({ type: 'reset' }, 'overlay'); pushState(); refreshPreview(true); res.json({ ok: true }); });
// sounds: any file in public/assets/sounds named after a sound (e.g. fanfare.mp3, music.mp3) replaces the built-in one
const SOUND_DIRS = [path.join(DATA, 'sounds'), path.join(ROOT, 'public', 'assets', 'sounds')];
app.get('/api/sounds', (req, res) => {
  const files = new Set();
  for (const d of SOUND_DIRS) { try { fs.readdirSync(d).filter(f => /\.(mp3|wav|ogg|m4a)$/i.test(f)).forEach(f => files.add(f)); } catch {} }
  if (req.query.v === '2') return res.json({ all: [...files], maps: Object.fromEntries([...new Set([...MAP_LIST.map(m => m.id), 'wheel', ...(() => { try { return fs.readdirSync(path.join(DATA, 'sounds', 'maps')).filter(d => /^wheel-/i.test(d)); } catch { return []; } })()])].map(id => [id, listDir(soundDir(id))]).filter(([, f]) => f.length)) });
  res.json([...files]);
});
app.get('/assets/sounds/maps/:map/:f', (req, res) => { const p = path.join(soundDir(req.params.map), path.basename(req.params.f)); fs.existsSync(p) && soundScope(req.params.map) ? res.sendFile(p) : res.sendStatus(404); });
app.get('/assets/background.png', (req, res, next) => { // your own sky: put background.png in the data folder
  const p = path.join(DATA, 'background.png'); fs.existsSync(p) ? res.sendFile(p) : next();
});
app.get('/assets/sounds/:f', (req, res, next) => { // your own sounds (data folder) win over built-in ones
  const f = path.basename(req.params.f), p = path.join(DATA, 'sounds', f);
  fs.existsSync(p) ? res.sendFile(p) : next();
});
app.post('/api/camera', (req, res) => { const a = String(req.body?.action || ''); if (['in', 'out', 'reset', 'auto', 'left', 'right', 'up', 'down', 'skip', 'next', 'prev', 'overview'].includes(a)) broadcast({ type: 'camera', action: a }, 'overlay'); res.json({ ok: true }); });
app.post('/api/sound-test', (req, res) => { broadcast({ type: 'soundTest', name: req.body?.name || 'fanfare', map: req.body?.map || null }, 'overlay'); res.json({ ok: true }); });
app.post('/api/effect', (req, res) => { triggerEvent(req.body.event, { name: streamerName(), avatar: proxied(db.owner?.avatar) }, 'panel'); res.json({ ok: true }); });

app.post('/api/winner/undo', (req, res) => { // movie winner didn't get watched after all: put it back
  const w = live.lastWinner; if (!w) return res.sendStatus(404);
  const e = getList(w.listId)?.entries.find(x => x.id === w.id);
  if (e && e.status === 'watched') { e.status = 'active'; lb.unmarkWatched({ title: e.label, year: e.sub, tmdbId: e.tmdbId }); if (e.luckSnap) { giveLuckBack(e.luckSnap); delete e.luckSnap; } }
  const h = findHistory(w.historyId); if (h) { h.outcome = 'put back'; historyVersion++; }
  live.lastWinner.undone = true; save(); pushState(); refreshPreview(); res.json({ ok: true });
});
app.post('/api/winner/out', (req, res) => { // take winner out of the pool (movies: mark watched)
  const w = live.lastWinner; if (!w) return res.sendStatus(404);
  const l = getList(w.listId); const e = l?.entries.find(x => x.id === w.id);
  if (e) e.status = l.type === 'movies' ? 'watched' : 'out';
  const h = findHistory(w.historyId); if (h) { h.outcome = l?.type === 'movies' ? 'watched' : 'out'; historyVersion++; }
  save(); pushState(); res.json({ ok: true });
});

// claim pop-up
app.post('/api/claim/start', (req, res) => {
  const w = live.lastWinner; if (!w) return res.status(400).json({ error: 'No winner yet' });
  if (w.spot) return res.status(400).json({ error: `${w.label} doesn't need a claim — it's your pick!` });
  if (live.claim) clearTimeout(live.claim.timer);
  // already talked in chat since they won? give it to them right away
  const early = live.chatLog.find(m => m.at >= w.at && isWinnerMsg(w, m));
  if (early) { autoClaim(early.text, early); return res.json({ ok: true, instant: true }); }
  const seconds = Number(req.body?.seconds) || 30;
  live.claim = { winner: w, endsAt: Date.now() + seconds * 1000, claimed: false, done: false };
  live.claim.timer = setTimeout(() => finishClaim(false), seconds * 1000);
  const recent = live.chatLog.slice(-8).map(m => ({ name: m.name, text: m.text, winner: (w.ownerLogin && m.login === w.ownerLogin.toLowerCase()) || norm(m.name) === norm(w.owner) }));
  broadcast({ type: 'claimStart', winner: w, seconds, recent }, 'overlay');
  pushState(); res.json({ ok: true });
});
app.post('/api/claim/confirm', (req, res) => { finishClaim(true); res.json({ ok: true }); });
// ✅ they're here and they're watching (the winner typed !accept in chat, or you pressed Accept)
function acceptClaim(by = 'you') {
  const c = live.claim; if (!c || c.done) return 'Nothing to accept.';
  const text = c.waiting?.text || '';
  if (c.instant) { pinWinner(c.winner); c.claimed = true; c.done = true; delete c.waiting; const h = findHistory(c.winner?.historyId); if (h) { h.claimed = 'instant'; historyVersion++; } db.noShowStreak = 0; save(); broadcast({ type: 'claimedDirect', winner: c.winner, text }, 'overlay'); pushState(); }
  else finishClaim(true, text);
  if (by !== 'you') broadcast({ type: 'toast', text: `✅ ${by} accepted: their movie is tonight's pick!` }, 'control');
  return null;
}
// ⏭️ not tonight: their movie goes back in and they keep their luck (the winner typed !pass in chat, or you pressed Pass)
function passClaim(by = 'you') {
  const c = live.claim, w = c?.winner || live.lastWinner; if (!w) return 'No winner to pass on.';
  if (c) { clearTimeout(c.timer); c.done = true; c.claimed = false; c.passed = true; delete c.waiting; } else live.claim = { winner: w, done: true, claimed: false, passed: true };
  if (!w.test && w.viaSpot) { const t = stream().tonight || [], i = t.map(x => x.id).lastIndexOf(w.id); if (i >= 0) { t.splice(i, 1); if (stream().movies > 0) stream().movies--; stream().spotPending = { at: Date.now(), label: `${db.settings.spotName || 'Kirb'}'s Pick` }; } discord.refreshPinned?.(); } // passed in the Kirb spot battle: run it again
  else if (!w.test && w.spot && getList(w.listId)?.type === 'movies') { undoMovieWin(w.id); delete stream().spotPending; discord.refreshPinned?.(); }
  else if (!w.test && getList(w.listId)?.type === 'movies') { undoMovieWin(w.id); if (!w.passed && stream().movies > 0) stream().movies--; const t = stream().tonight || [], i = t.map(x => x.id).lastIndexOf(w.id); if (i >= 0) t.splice(i, 1); discord.refreshPinned?.(); } // not watched: it doesn't count as tonight's movie
  const h = findHistory(w.historyId); if (h) { h.claimed = 'passed'; h.outcome = 'passed'; historyVersion++; }
  live.lastWinner.passed = true; save();
  broadcast({ type: 'claimPassed', winner: w }, 'overlay'); pushState(); refreshPreview();
  if (by !== 'you') broadcast({ type: 'toast', text: `⏭️ ${by} passed: their movie goes back in and keeps its luck.` }, 'control');
  return null;
}
app.post('/api/claim/accept', (req, res) => { const err = acceptClaim(); err ? res.status(400).json({ error: err }) : res.json({ ok: true }); });
app.post('/api/claim/pass', (req, res) => { const err = passClaim(); err ? res.status(400).json({ error: err }) : res.json({ ok: true }); });
app.post('/api/claim/close', (req, res) => { // close the pop-up and put the next round's pieces back on the cliff
  if (live.claim) clearTimeout(live.claim.timer); live.claim = null; nextMap();
  live.phase = 'idle'; live.game = null;
  broadcast({ type: 'reset' }, 'overlay'); pushState(); refreshPreview(true); res.json({ ok: true });
});

app.post('/api/win/hide', (req, res) => { broadcast({ type: 'winHide' }, 'overlay'); res.json({ ok: true }); }); // just hides the winner pop-up on stream

// letterboxd
app.post('/api/letterboxd/refresh', async (req, res) => { lb.loadCsvs(); await Promise.all([lb.refreshRss(db.settings.letterboxdUser), lb.refreshProfile(db.settings.letterboxdUser)]); const n = sweepWatched(); pushState(); res.json({ ok: true, retired: n, ...lb.stats() }); });
app.post('/api/letterboxd/upload', express.text({ type: '*/*', limit: '20mb' }), (req, res) => {
  const name = path.basename(String(req.query.name || 'watched.csv')).toLowerCase();
  if (!name.endsWith('.csv')) return res.status(400).json({ error: 'CSV files only' });
  fs.writeFileSync(path.join(DATA, 'letterboxd', name), req.body);
  lb.loadCsvs(); const n = sweepWatched(); pushState(); res.json({ ok: true, retired: n, ...lb.stats() });
});

// twitch
app.get('/twitch/login', (req, res) => res.redirect('/auth/twitch'));
// ball colours: free (chat command) or channel points (ONE reward, viewer types any colour)
async function colorRewardOnTwitch() { const t = (db.settings.colorReward || '').toLowerCase(); return t ? (await twitch.listRewards()).find(r => r.title.toLowerCase() === t) : null; }
app.post('/api/colors/mode', async (req, res) => {
  const mode = ['free', 'points', 'off'].includes(req.body?.mode) ? req.body.mode : 'free';
  try {
    if (mode === 'points') {
      if (!twitch.status.userId) return res.status(400).json({ error: 'Sign in with Twitch first.' });
      db.settings.colorReward ||= 'Royal: Ball color';
      const have = await colorRewardOnTwitch();
      if (have) await twitch.updateReward(have.id, { paused: false, enabled: true }); else await twitch.createColorReward(db.settings.colorReward);
    } else if (twitch.status.userId) { // free or off: pause the reward (if you made one) so nobody spends points on it
      const have = await colorRewardOnTwitch().catch(() => null); if (have) await twitch.updateReward(have.id, { paused: true }).catch(() => {});
    }
    db.settings.colorMode = mode === 'off' ? db.settings.colorMode : mode; db.settings.colorsOn = mode !== 'off';
    save(); pushState(); if (live.phase === 'idle') refreshPreview();
    res.json({ ok: true, mode, title: db.settings.colorReward });
  } catch (e) { res.status(400).json({ error: e.message }); }
});
app.post('/api/colors/clear', (req, res) => { db.colors = {}; save(); if (live.phase === 'idle') refreshPreview(); pushState(); res.json({ ok: true }); });
app.post('/api/twitch/rewards', async (req, res) => { try { const made = await twitch.createRewards(); db.settings.rewardsCreated = true; save(); pushState(); res.json({ made }); } catch (e) { res.status(400).json({ error: e.message }); } });

// test helper: pretend someone typed in Twitch chat (only when started with ROYAL_DEBUG=1)
if (process.env.ROYAL_DEBUG) app.post('/api/debug/chat', (req, res) => { twitchHandlers.chat({ login: String(req.body.login || '').toLowerCase(), name: req.body.name || req.body.login, text: req.body.text || 'hi' }); res.json({ ok: true }); });

// image proxy + disk cache (keeps pictures working smoothly in OBS)
app.get('/img', async (req, res) => {
  let u; try { u = new URL(String(req.query.u)); } catch { return res.sendStatus(400); }
  if (u.protocol !== 'https:' || !IMG_HOSTS.includes(u.hostname)) return res.sendStatus(403);
  const file = path.join(IMGCACHE, crypto.createHash('sha1').update(u.href).digest('hex'));
  if (fs.existsSync(file)) return res.type(fs.readFileSync(file + '.type', 'utf8')).sendFile(file);
  try {
    const r = await fetch(u.href, { signal: AbortSignal.timeout(8000) });
    if (!r.ok) return res.sendStatus(502);
    const buf = Buffer.from(await r.arrayBuffer()), type = r.headers.get('content-type') || 'image/png';
    fs.writeFileSync(file, buf); fs.writeFileSync(file + '.type', type);
    res.type(type).send(buf);
  } catch { res.sendStatus(502); }
});

// ---------- boot ----------
server.on('error', e => {
  const msg = e.code === 'EADDRINUSE' ? `Movie Royal is already running (port ${PORT} is busy). Close the other copy and try again.` : e.message;
  console.error('\n  ' + msg + '\n');
  if (globalThis.__desktop) globalThis.__desktop.fatal(msg); else process.exit(1);
});
server.listen(PORT, process.env.ALLOW_LAN ? '0.0.0.0' : undefined, async () => {
  globalThis.__desktop?.applySettings?.({ runInBackground: db.settings.runInBackground !== false, startWithWindows: !!db.settings.startWithWindows, muteUnfocused: db.settings.muteUnfocused !== false, windowMode: db.settings.windowMode || 'window' });
  globalThis.__desktop?.ready(`http://localhost:${PORT}/`);
  console.log(`\n  🍿 Movie Royal is running!\n  Open http://localhost:${PORT} in your browser (keep this window open while you stream)\n`);
  const n = lb.loadCsvs();
  if (n) console.log(`  Letterboxd: loaded ${n} rows from your export`);
  discord.start(pushState);
  cloud.start(pushState);
  backuplink.start(pushState);
  twitch.start(twitchHandlers);
  if (rollWeek()) console.log('  New week: benched movies are back, spots refilled');
  restoreAway(true);
  setInterval(() => discord.keepPinsOnTop().catch?.(() => {}), 30 * 60 * 1000); // 📌 Movie Royal's pinned messages stay on top
  setInterval(() => { const a = rollWeek(), b = restoreAway(true); if (a || b) { pushState(); refreshPreview(); } }, 5 * 60 * 1000);
  const tick = async () => { await lb.refreshRss(db.settings.letterboxdUser); sweepWatched(); pushState(); };
  tick(); setInterval(tick, 30 * 60 * 1000);
  const full = async (first) => { if (!db.settings.letterboxdUser) return; await lb.refreshProfile(db.settings.letterboxdUser); const n = sweepWatched(); pushState(); if (first) { const st = lb.stats(); setTimeout(() => broadcast({ type: 'toast', text: st.profileError ? `📗 Couldn't update Letterboxd: ${st.profileError}` : `📗 Letterboxd updated: ${st.count} watched${n ? `, ${n} taken out of the battles` : ''}` }, 'control'), 1500); } };
  full(true); setInterval(full, 6 * 60 * 60 * 1000); // whole profile when the app opens, then every 6 hours
});

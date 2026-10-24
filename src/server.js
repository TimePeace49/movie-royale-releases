// Movie Royale — local server. Open http://localhost:3737 for the control panel.
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
import { searchMovies } from './tmdb.js';
import { claimManual, mergePerson } from './movies.js';
import { getRatings, testOmdb } from './ratings.js';
import { parseImport, toLines, importLink } from './importer.js';
import { getMovie as tmdbMovie } from './tmdb.js';
import { blockReason, banMovie, unbanMovie, allowThisYear, addLuck, luckMultiplier, luckOn, swapsLocked } from './movies.js';
import { suggest, sweepWatched, picksUsed, addSpots, afterMovieWin, newWeek, isSpot, rollWeek, weekStartDate, backOn, weekKey } from './movies.js';

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
function refreshPreview(now = false) {
  clearTimeout(previewTimer);
  previewTimer = setTimeout(async () => {
    if (live.phase !== 'idle') return;
    const list = getList(db.activeListId);
    if (!list) return;
    if (previewList !== list.id) { previewIds = null; previewList = list.id; }
    const { fighters, total } = await buildFighters(list, previewIds);
    previewIds = fighters.map(f => f.id);
    broadcast({ type: 'preview', fighters, total, listName: list.screenTitle || list.name, kind: list.type, queued: db.pendingEffects.length, chaos: chaosState(), chatGate: list.type === 'movies' && db.settings.chatGate !== false }, 'overlay');
  }, now ? 0 : 300);
}

let historyVersion = 0;
function discordPeople() {
  const m = new Map();
  for (const e of getList('movies')?.entries || []) for (const b of e.backers || []) {
    let p = m.get(b.discordId);
    if (!p) { p = { discordId: b.discordId, name: b.name, avatar: b.avatar, active: [], watched: 0 }; m.set(b.discordId, p); }
    if (e.status === 'active' || e.status === 'benched' || e.status === 'paused') p.active.push({ id: e.id, label: e.label, sub: e.sub, benched: e.status === 'benched', paused: e.status === 'paused' });
    else if (e.status === 'watched') p.watched++;
  }
  for (const [id, mp] of Object.entries(db.manualPeople || {})) if (!m.has(id)) m.set(id, { discordId: id, name: mp.name, avatar: null, active: [], watched: 0 });
  for (const p of m.values()) p.manual = String(p.discordId).startsWith('manual-');
  const on = activeSet();
  return [...m.values()].map(p => ({ ...p, twitch: db.links[p.discordId] || '', used: picksUsed(p.discordId), max: db.settings.maxPerUser, chatting: on.has(p.discordId) }))
    .sort((a, b) => b.active.length - a.active.length || a.name.localeCompare(b.name));
}
function findHistory(id) { return id && db.history.find(h => h.id === id); }

function publicState() {
  const mask = v => (v ? '••••••' + String(v).slice(-4) : '');
  const st = db.settings;
  return {
    settings: { ...st, discordToken: mask(st.discordToken), twitchClientSecret: mask(st.twitchClientSecret), tmdbKey: mask(st.tmdbKey), omdbKey: mask(st.omdbKey), wheelOfNamesKey: mask(st.wheelOfNamesKey) },
    lists: db.lists, activeListId: db.activeListId, history: db.history.slice(-15).reverse().map(h => ({ label: h.winner?.label ?? h.label, sub: h.winner?.sub ?? h.sub, at: h.at, listName: h.listName })),
    week: { start: weekStartDate().toISOString(), backOn: backOn(), winners: db.week?.winners?.length || 0, spotWon: !!db.week?.spotWon },
    historyVersion, owner: db.owner ? { name: db.owner.name, avatar: db.owner.avatar, login: db.owner.login } : null, people: discordPeople(),
    pendingEffects: db.pendingEffects, events: EVENTS,
    status: { discord: discord.status, twitch: twitch.status, letterboxd: lb.stats(), overlays: [...wss.clients].filter(c => c.role === 'overlay').length },
    movieNo: (stream().movies || 0) + 1, phase: live.phase, lastWinner: live.lastWinner, claim: live.claim && { ...live.claim, timer: undefined },
    noShowStreak: db.noShowStreak || 0, chatters: stream().active, phaseAt: live.phaseAt || 0, recentChatters: recentChatters(), gather: live.gather ? { endsAt: live.gather.endsAt } : null, rollcall: live.rollcall && { ...live.rollcall, timer: undefined }, awayCount: (getList('movies')?.entries || []).filter(e => e.status === 'away').length,
    chaos: chaosState(), live: !!db.live, swapLock: !!db.swapLock, swapsLocked: swapsLocked(), luckOn: luckOn(), banCount: (db.bans || []).length,
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
  if (list.type === 'movies' && db.settings.chatGate !== false) { const on = activeSet(); pool = pool.filter(e => e.kind === 'spot' || !e.backers?.length || on.has(e.backers[0].discordId)); }
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
  const users = await twitch.getUsers(logins);
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
      return {
        id: e.id, label: e.label, sub: e.sub || '', weight: Math.round((e.weight || 1) * (list.type === 'movies' ? luckMultiplier(e) : 1) * 10000) / 10000, luck: list.type === 'movies' && luckOn() ? (e.luckPct || 0) : 0,
        image: proxied(image), poster: proxied(e.poster), owner, ownerLogin,
        showOwner: list.type === 'movies' || (list.type === 'chat' && !!e.joined),
        backers: e.backers?.length || 0, kind: list.type, details: e.details || null, spot: isSpot(e), tmdbId: e.tmdbId || null
      };
    })
  };
}

// ---------- chaos events from channel points / bits ----------
function triggerEvent(event, by, source) {
  if (!EVENTS[event]) return;
  const fx = { id: uid(), event, by, source, at: Date.now() };
  if (live.phase === 'lobby' || live.phase === 'running') broadcast({ type: 'effect', effect: fx }, 'overlay');
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
  if (db.settings.announceWinner === false || !twitch.status.canChat) return;
  const name = `${f.label}${f.sub ? ` (${f.sub})` : ''}`;
  const by = f.owner && f.showOwner ? (list?.type === 'chat' ? '' : ` — picked by ${f.owner}`) : '';
  const msg = f.spot ? `🎟️ ${f.label} wins the Movie Royale — ${streamerName()}'s choice!`
    : list?.type === 'chat' ? `🏆 @${f.ownerLogin || f.label} wins the ${list.screenTitle || list.name}!`
    : `🏆 ${list?.type === 'movies' || list?.type === 'films' ? 'Tonight’s movie' : 'Winner'}: ${name}${by}!`;
  const wait = (db.settings.replayOn !== false ? 12 : 2) * 1000;
  setTimeout(() => twitch.say(msg).catch(e => console.error('[twitch say]', e.message)), wait);
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
    db.live = !!isLive; if (isLive) stream().movies = 0; // new stream: movie count starts over
    save(); pushState();
    broadcast({ type: 'toast', text: isLive ? '🔴 You went live — Discord swaps are now locked.' : '⚫ Stream ended — Discord swaps are open again.' }, 'control');
    discord.refreshPinned?.();
  },
  async redeem(r) {
    if (db.settings.pointsOn === false) return; // channel point chaos switched off
    const entry = Object.entries(db.settings.rewards).find(([t]) => t.toLowerCase() === r.title.toLowerCase());
    if (!entry) return;
    triggerEvent(entry[1], { name: r.name, avatar: await avatarFor(r.login) }, 'points');
  },
  async cheer(c) {
    if (db.settings.bitsOn === false) return; // bits chaos switched off
    const tiers = Object.entries(db.settings.bits).map(([b, e]) => [Number(b), e]).filter(([b]) => c.bits >= b).sort((a, b) => b[0] - a[0]);
    if (!tiers.length) return;
    triggerEvent(tiers[0][1], { name: c.name, avatar: await avatarFor(c.login), bits: c.bits }, 'bits');
  },
  async chat(m) {
    const newFace = !live.chatLog.some(x => x.login === m.login && Date.now() - x.at < 5 * 60000);
    live.chatLog.push({ ...m, at: Date.now() }); live.chatLog = live.chatLog.slice(-300);
    moviesChatCommand(m);
    if (newFace) pushState(); // keeps "Recent chatters" in the control panel up to date
    if (live.rollcall && !live.rollcall.done) {
      const p = live.rollcall.people.find(x => !x.here && chatMatches(x, m));
      if (p) checkIn(p);
    } else activateFromChat(m);
    // claim pop-up: show chat, stop when the winner talks
    if (live.claim && !live.claim.done) {
      const isWinner = isWinnerMsg(live.claim.winner, m);
      broadcast({ type: 'chat', msg: { name: m.name, text: m.text, winner: isWinner } }, 'overlay');
      if (isWinner) finishClaim(true, m.text);
    } else if (!live.claim && live.phase === 'ended' && live.lastWinner && !live.lastWinner.spot && isWinnerMsg(live.lastWinner, m)) {
      autoClaim(m.text); // winner spoke up before the claim timer was even started: instant win
    }
    // "!join" lists
    const list = getList(db.activeListId);
    const cmd = (db.settings.joinCommand || '!join').toLowerCase();
    if (list?.type === 'chat' && list.joinOpen && m.text.toLowerCase().split(/\s+/)[0] === cmd) {
      if (list.entries.some(e => e.status === 'active' && e.twitch === m.login)) return;
      const e = addEntry(list, { label: m.name, twitch: m.login }); e.joined = true; // came from chat, so the winner screen shows their name
      save(); pushState();
      fillTwitchAvatars(list);
      broadcast({ type: 'joined', name: e.label }, 'overlay');
    }
  }
};

const isWinnerMsg = (w, m) => !!w && ((w.ownerLogin && m.login === w.ownerLogin.toLowerCase()) || (w.owner && norm(w.owner) === norm(m.name)));
function autoClaim(text) {
  const w = live.lastWinner;
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
  const p = discordPeopleWithMovies().find(x => !on.has(x.key) && chatMatches(x, m));
  if (!p) return;
  st.active.push(p.key); save();
  if (db.activeListId === 'movies') broadcast({ type: 'joined', name: `${p.name}'s movies` }, 'overlay');
  broadcast({ type: 'toast', text: `💬 ${p.name} is chatting — their movies are on the cliff${live.phase === 'ended' ? ' (shows after Next round)' : ''}` }, 'control');
  pushState(); refreshPreview();
}
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
  live.claim.done = true;
  const h = findHistory(live.claim.winner?.historyId); if (h) { h.claimed = claimed; historyVersion++; save(); }
  if (live.claim.winner?.kind === 'movies') db.noShowStreak = claimed ? 0 : (db.noShowStreak || 0) + 1;
  save();
  broadcast({ type: claimed ? 'claimed' : 'claimExpired', text: text || '' }, 'overlay');
  pushState();
}

// ---------- websocket ----------
wss.on('connection', (ws, req) => {
  ws.role = new URL(req.url, 'http://x').searchParams.get('role') || 'control';
  if (!isLocal(req)) return ws.close(4001, 'local only');
  if (ws.role === 'control') ws.send(JSON.stringify({ type: 'state', state: publicState() }));
  if (ws.role === 'overlay') { ws.send(JSON.stringify(audioMsg())); ws.send(JSON.stringify(camMsg())); refreshPreview(true); if (live.gather) setTimeout(() => ws.send(JSON.stringify({ type: 'gather', endsAt: live.gather?.endsAt })), 500); }
  pushState();
  ws.on('close', pushState);
  ws.on('message', raw => {
    let m; try { m = JSON.parse(raw); } catch { return; }
    if (ws.role !== 'overlay') return;
    if (m.type === 'phase' && live.game && m.gameId === live.game.id) { live.phase = m.phase; live.phaseAt = Date.now(); pushState(); }
    if (m.type === 'result' && live.game && m.gameId === live.game.id && !live.game.done) {
      live.game.done = true; live.phase = 'ended'; live.phaseAt = Date.now();
      const f = live.game.fighters.find(x => x.id === m.winnerId);
      if (!f) return;
      if (live.game.test) { live.lastWinner = { ...f, listName: 'Practice round', at: Date.now(), test: true }; pushState(); return; } // practice rounds never touch real lists or history
      const list = getList(live.game.listId);
      const byId = new Map(live.game.fighters.map(x => [x.id, x]));
      const order = (Array.isArray(m.order) ? m.order : [f.id]).filter(id => byId.has(id));
      const totalW = live.game.fighters.reduce((a, x) => a + (x.weight || 1), 0) || 1;
      const slim = x => ({ label: x.label, sub: x.sub, owner: x.owner, image: x.image, poster: x.poster });
      const rec = {
        id: uid(), listId: list?.id, listName: list?.name, kind: list?.type, at: Date.now(),
        winner: { ...slim(f), id: f.id, details: f.details || null, odds: (f.weight || 1) / totalW },
        entrants: live.game.fighters.length, total: live.game.total,
        top: order.slice(0, 5).map(id => slim(byId.get(id))),
        events: (Array.isArray(m.events) ? m.events : []).slice(0, 40).map(e => ({ event: String(e.event), by: String(e.by || '').slice(0, 40) })),
        claimed: null, outcome: null
      };
      db.history.push(rec); db.history = db.history.slice(-1000); historyVersion++;
      live.lastWinner = { ...f, listId: list?.id, listName: list?.name, at: Date.now(), historyId: rec.id };
      announceWinner(f, list);
      if (list?.type === 'movies') { stream().movies = (stream().movies || 0) + 1; } // movie # of the night
      if (list?.type === 'movies') addLuck(live.game.fighters.filter(x => x.id !== f.id && !x.spot).map(x => x.id)); // everyone who lost gets a little luckier
      if ((list?.type === 'movies' || list?.type === 'films') && f.tmdbId && !f.spot) fetchWinnerRatings(f, rec, live.game.id);
      if (list?.type === 'movies') { const r = afterMovieWin(f.id); live.lastWinner.benched = r.benched; live.lastWinner.spotsRemoved = r.spotsRemoved; rec.benched = r.benched; rec.spotsRemoved = r.spotsRemoved; if (!f.spot) rec.outcome = 'watched'; }
      save(); pushState();
    }
  });
});

const camMsg = () => ({ type: 'camera', base: clampN(db.settings.cliffSize, 60, 250, 130) / 100, auto: db.settings.autoCamera !== false, replay: db.settings.replayOn !== false });
const clampN = (v, a, b, d) => { const n = Number(v); return Number.isFinite(n) ? Math.max(a, Math.min(b, n)) : d; };
const audioMsg = () => ({ type: 'audio', on: db.settings.soundOn !== false, sfx: Number(db.settings.sfxVolume ?? 70) / 100, music: Number(db.settings.musicVolume ?? 35) / 100 });

// ---------- http ----------
app.use(express.json({ limit: '50mb' }));

// ---------- account: sign in with Twitch (optional) ----------
// Everything is saved automatically in the data folder whether or not you sign in.
// Signing in connects your Twitch account: your name/picture, channel points, bits and chat.
// The app only answers your own computer.
const LOCAL = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);
const isLocal = req => process.env.ALLOW_LAN || LOCAL.has(req.socket.remoteAddress);
app.use((req, res, next) => isLocal(req) ? next() : res.status(403).send('Movie Royale only runs on this computer.'));
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
app.get('/twitch/callback', async (req, res) => {
  const fail = msg => res.redirect('/login.html?error=' + encodeURIComponent(msg));
  if (req.query.error) return fail('Twitch sign-in was cancelled.');
  const state = String(req.query.state || '');
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
    if (DESKTOP) return res.send(donePage(`Signed in as ${user.name}!`, 'You can close this tab and go back to Movie Royale.'));
    res.redirect('/control.html?twitch=ok');
  } catch (e) { fail('Twitch sign-in failed: ' + e.message); }
});
app.post('/auth/logout', (req, res) => { db.owner = null; db.twitchToken = null; save(); twitch.start(twitchHandlers); pushState(); res.json({ ok: true }); });

// backup / restore everything (lists, odds, history, settings, Discord picks)
app.get('/api/backup', (req, res) => {
  const { twitchToken, ...rest } = db;
  res.setHeader('Content-Disposition', `attachment; filename="movie-royale-backup-${new Date().toISOString().slice(0, 10)}.json"`);
  res.type('application/json').send(JSON.stringify(rest, null, 1));
});
app.post('/api/restore', (req, res) => {
  const b = req.body;
  if (!b || !Array.isArray(b.lists) || !b.settings) return res.status(400).json({ error: "That doesn't look like a Movie Royale backup." });
  for (const k of ['settings', 'lists', 'activeListId', 'history', 'links', 'picks', 'pendingEffects']) if (k in b) db[k] = b[k];
  if (!db.lists.find(l => l.id === 'movies')) db.lists.unshift({ id: 'movies', name: 'Discord Movies', type: 'movies', entries: [] });
  historyVersion++; save(); discord.start(pushState); twitch.start(twitchHandlers); pushState();
  res.json({ ok: true });
});

// history
const normHist = h => h.winner ? h : { ...h, id: h.id || 'old-' + h.at, winner: { label: h.label, sub: h.sub, owner: h.owner }, top: [], events: [] };
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
const PKG = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const VERSION = process.env.MR_VERSION || PKG.version;
// where updates come from: your own setting, or the GitHub repo this copy was built from
const updateRepo = () => (db.settings.updateRepo || PKG.updateRepo || '').trim();
function donePage(title, msg) {
  return `<!doctype html><meta charset="utf-8"><title>Movie Royale</title><body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#120a24;color:#f3edff;font:18px Segoe UI,system-ui,sans-serif;text-align:center">
  <div><div style="font-size:64px">✅</div><h1 style="color:#ffc94a;margin:10px 0">${title.replace(/</g, '&lt;')}</h1><p>${msg}</p></div></body>`;
}
app.get('/api/app', (req, res) => res.json({ version: VERSION, desktop: DESKTOP, dataDir: DATA, updateRepo: db.settings.updateRepo || '', defaultRepo: PKG.updateRepo || '', discordInvite: discord.inviteUrl(), guilds: discord.status.guilds || [] }));
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
app.get('/api/update/check', async (req, res) => {
  const repo = updateRepo().replace(/^https?:\/\/github\.com\//, '').replace(/\/$/, '');
  if (!repo) return res.json({ configured: false, version: VERSION });
  try {
    const r = await fetch(`https://api.github.com/repos/${repo}/releases/latest`, { headers: { 'User-Agent': 'MovieRoyale' }, signal: AbortSignal.timeout(10000) });
    if (!r.ok) throw new Error(r.status === 404 ? 'No releases found for ' + repo : 'GitHub ' + r.status);
    const j = await r.json(), asset = (j.assets || []).find(a => /\.exe$/i.test(a.name));
    res.json({ configured: true, version: VERSION, latest: j.tag_name, available: newer(j.tag_name, VERSION) && !!asset, url: asset?.browser_download_url, notes: (j.body || '').slice(0, 1500) });
  } catch (e) { res.json({ configured: true, version: VERSION, error: e.message }); }
});
function runInstaller(file, res) {
  if (!DESKTOP || process.platform !== 'win32') return res.status(400).json({ error: 'Updates install from the Windows app.' });
  spawn(file, ['/S', '/UPDATE'], { detached: true, stdio: 'ignore' }).unref(); // silent update, relaunches when done
  res.json({ ok: true });
  setTimeout(() => globalThis.__desktop?.quit(), 600);
}
app.post('/api/update/install-file', express.raw({ type: '*/*', limit: '500mb' }), (req, res) => {
  if (!req.body?.length || req.body.slice(0, 2).toString() !== 'MZ') return res.status(400).json({ error: "That isn't a Movie Royale installer (.exe)." });
  const file = path.join(os.tmpdir(), 'MovieRoyale-Update.exe');
  fs.writeFileSync(file, req.body); runInstaller(file, res);
});
app.post('/api/update/install-latest', async (req, res) => {
  try {
    const url = String(req.body?.url || '');
    if (!/^https:\/\/github\.com\//.test(url)) return res.status(400).json({ error: 'Bad update link' });
    const r = await fetch(url); if (!r.ok) throw new Error('Download failed (' + r.status + ')');
    const file = path.join(os.tmpdir(), 'MovieRoyale-Update.exe');
    fs.writeFileSync(file, Buffer.from(await r.arrayBuffer())); runInstaller(file, res);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

const RESTART_DISCORD = ['discordToken', 'discordClientId', 'discordGuildId'];
const RESTART_TWITCH = ['twitchClientId', 'twitchClientSecret', 'twitchChannel'];
app.post('/api/settings', (req, res) => {
  const body = req.body || {};
  let rd = false, rt = false, rl = false; const rdName = db.settings.discordChannelName;
  for (const [k, v] of Object.entries(body)) {
    if (!(k in db.settings)) continue;
    if (typeof v === 'string' && v.startsWith('••••••')) continue; // masked, unchanged
    if (JSON.stringify(db.settings[k]) === JSON.stringify(v)) continue;
    db.settings[k] = v;
    if (RESTART_DISCORD.includes(k)) rd = true;
    if (RESTART_TWITCH.includes(k)) rt = true;
    if (k === 'letterboxdUser') rl = true;
  }
  if ('weekStart' in body && db.week) db.week.key = weekKey(); // changing the start day never resets anyone mid-week
  if (['maxPerUser', 'banCurrentYear', 'luckOn', 'twitchMoviesCommand', 'streamerName'].some(k => k in body)) discord.refreshPinned?.();
  if ('discordChannelName' in body && body.discordChannelName !== undefined && rdName !== db.settings.discordChannelName) rd = true; // makes/finds the new channel
  if ('spotName' in body) for (const e of getList('movies')?.entries || []) if (e.kind === 'spot') e.label = `${db.settings.spotName || 'Kirb'}'s Pick`;
  save();
  globalThis.__desktop?.applySettings?.({ runInBackground: db.settings.runInBackground !== false, startWithWindows: !!db.settings.startWithWindows });
  broadcast(audioMsg(), 'overlay'); broadcast(camMsg(), 'overlay');
  if (rd) discord.start(pushState);
  if (rt) twitch.start(twitchHandlers);
  if (rl) Promise.all([lb.refreshRss(db.settings.letterboxdUser), lb.refreshProfile(db.settings.letterboxdUser)]).then(() => { sweepWatched(); pushState(); });
  pushState();
  res.json({ ok: true });
});

// lists
app.post('/api/lists', (req, res) => {
  const { name, type } = req.body;
  if (!['text', 'pics', 'chat', 'films'].includes(type)) return res.status(400).json({ error: 'bad type' });
  const l = { id: uid(), name: (name || 'New list').slice(0, 60), type, entries: [], joinOpen: false };
  db.lists.push(l); db.activeListId = l.id; save(); pushState(); res.json(l);
});
app.patch('/api/lists/:id', (req, res) => {
  const l = getList(req.params.id); if (!l) return res.sendStatus(404);
  if (req.body.name != null) l.name = String(req.body.name).slice(0, 60);
  if (req.body.joinOpen != null) l.joinOpen = !!req.body.joinOpen;
  if (req.body.screenTitle != null) { l.screenTitle = String(req.body.screenTitle).slice(0, 60); refreshPreview(); }
  save(); pushState(); res.json({ ok: true });
});
app.delete('/api/lists/:id', (req, res) => {
  if (req.params.id === 'movies') return res.status(400).json({ error: "The Discord movie list can't be deleted" });
  db.lists = db.lists.filter(l => l.id !== req.params.id);
  if (db.activeListId === req.params.id) db.activeListId = 'movies';
  save(); pushState(); res.json({ ok: true });
});
app.post('/api/active', (req, res) => { if (getList(req.body.id)) db.activeListId = req.body.id; save(); pushState(); res.json({ ok: true }); });

app.post('/api/lists/:id/bulk', async (req, res) => {
  const l = getList(req.params.id); if (!l) return res.sendStatus(404);
  const items = parseLines(req.body.text);
  const report = { added: 0, failed: [] };
  if (l.type === 'films') {
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
  if (req.body.label != null && l.type !== 'movies') e.label = String(req.body.label).slice(0, 80);
  if (req.body.status) setTimeout(() => refreshPreview(), 0);
  if (req.body.status) {
    if (l.type === 'movies' && e.tmdbId) { if (req.body.status === 'watched') lb.markWatched({ title: e.label, year: e.sub, tmdbId: e.tmdbId }); else if (e.status === 'watched') lb.unmarkWatched({ title: e.label, year: e.sub, tmdbId: e.tmdbId }); }
    e.status = req.body.status;
  }
  save(); pushState(); res.json({ ok: true });
});
app.post('/api/lists/:id/resume-all', (req, res) => { // bring every paused item back
  const l = getList(req.params.id); if (!l) return res.sendStatus(404);
  let n = 0; for (const e of l.entries) if (e.status === 'paused') { e.status = 'active'; n++; }
  save(); pushState(); refreshPreview(); res.json({ back: n });
});
app.post('/api/lists/:id/reset-odds', (req, res) => {
  const l = getList(req.params.id); if (!l) return res.sendStatus(404);
  for (const e of l.entries) e.weight = l.type === 'movies' ? Math.max(1, e.backers?.length || 1) : 1;
  save(); pushState(); res.json({ ok: true });
});
app.post('/api/lists/:id/clear', (req, res) => {
  const l = getList(req.params.id); if (!l) return res.sendStatus(404);
  if (l.type === 'movies') l.entries.forEach(e => { if (e.status === 'active') e.status = 'removed'; });
  else l.entries = [];
  save(); pushState(); res.json({ ok: true });
});
app.post('/api/lists/:id/restore', (req, res) => { // bring back everything taken out
  const l = getList(req.params.id); if (!l) return res.sendStatus(404);
  if (l.type !== 'movies') l.entries.forEach(e => { e.status = 'active'; });
  save(); pushState(); res.json({ ok: true });
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
app.post('/api/lists/:id/film', async (req, res) => {
  const l = getList(req.params.id); if (!l || l.type !== 'films') return res.sendStatus(404);
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
app.get('/api/bans', (req, res) => res.json({ bans: [...(db.bans || [])].sort((a, b) => b.at - a.at), yearAllow: (db.yearAllow || []).map(id => ({ tmdbId: id, title: db.yearAllowTitles?.[id] || null })), year: new Date().getFullYear() }));
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
app.post('/api/year-allow', async (req, res) => {
  const id = String(req.body?.tmdbId || ''); if (!id) return res.sendStatus(400);
  allowThisYear(id, req.body?.allow !== false);
  if (req.body?.allow !== false) { db.yearAllowTitles ||= {}; try { const m = await tmdbMovie(id); db.yearAllowTitles[id] = `${m.title} (${m.year})`; } catch {} save(); }
  pushState(); res.json({ ok: true });
});

// ---------- one-click on/off for channel points and bits ----------
const chaosState = () => ({ points: db.settings.pointsOn !== false, bits: db.settings.bitsOn !== false });
app.post('/api/chaos-toggle', async (req, res) => {
  const b = req.body || {}, msgs = [];
  if (b.points != null) db.settings.pointsOn = !!b.points;
  if (b.bits != null) db.settings.bitsOn = !!b.bits;
  save(); pushState(); refreshPreview(true);
  // also pause/unpause the rewards on Twitch so nobody spends points on something that won't happen
  if (b.points != null && twitch.status.userId) {
    try {
      const titles = new Set(Object.keys(db.settings.rewards).map(t => t.toLowerCase()));
      const mine = (await twitch.listRewards()).filter(r => titles.has(r.title.toLowerCase()));
      await Promise.allSettled(mine.map(r => twitch.updateReward(r.id, { paused: !db.settings.pointsOn })));
      if (mine.length) msgs.push(`${mine.length} reward${mine.length === 1 ? '' : 's'} ${db.settings.pointsOn ? 'unpaused' : 'paused'} on Twitch`);
    } catch (e) { msgs.push(`couldn't update Twitch: ${e.message}`); }
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
  save(); pushState(); refreshPreview(true); res.json({ ok: true, id: l.id });
});

// ---------- swaps ----------
app.post('/api/swaps/lock', (req, res) => { db.swapLock = !!req.body?.locked; save(); pushState(); res.json({ ok: true }); });

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
const SOUND_LIST = ['music', 'lobby', 'go', 'tick', 'final5', 'land', 'bonk', 'dash', 'crumble', 'fall', 'out', 'lucky', 'alert', 'comet', 'smack', 'boom', 'collapse', 'earthquake', 'meteors', 'wind', 'ice', 'tornado', 'shockwave', 'thunder', 'lightning', 'boulder', 'swap', 'lowgrav', 'suddendeath', 'fanfare', 'claimStart', 'pop', 'ding', 'celebrate', 'buzzer', 'queued', 'joined'];
app.get('/api/sounds/list', (req, res) => {
  const dir = path.join(DATA, 'sounds'); let files = []; try { files = fs.readdirSync(dir); } catch {}
  res.json({ sounds: SOUND_LIST.map(n => ({ name: n, custom: files.find(f => f.replace(/\.\w+$/, '').toLowerCase() === n.toLowerCase()) || null })) });
});
app.post('/api/sounds/upload', express.raw({ type: '*/*', limit: '30mb' }), (req, res) => {
  const name = String(req.query.name || ''), ext = String(req.query.ext || 'mp3').toLowerCase();
  if (!SOUND_LIST.includes(name) || !['mp3', 'wav', 'ogg', 'm4a'].includes(ext)) return res.status(400).json({ error: 'Use an mp3, wav, ogg or m4a file.' });
  const dir = path.join(DATA, 'sounds');
  for (const f of fs.readdirSync(dir)) if (f.replace(/\.\w+$/, '').toLowerCase() === name.toLowerCase()) fs.rmSync(path.join(dir, f));
  fs.writeFileSync(path.join(dir, `${name}.${ext}`), req.body);
  broadcast({ type: 'reloadSounds' }, 'overlay'); res.json({ ok: true });
});
app.delete('/api/sounds/:name', (req, res) => {
  const dir = path.join(DATA, 'sounds');
  for (const f of fs.readdirSync(dir)) if (f.replace(/\.\w+$/, '').toLowerCase() === req.params.name.toLowerCase()) fs.rmSync(path.join(dir, f));
  broadcast({ type: 'reloadSounds' }, 'overlay'); res.json({ ok: true });
});

// ---------- Test tab: try every feature without waiting for real viewers ----------
app.post('/api/test/chat', (req, res) => { const name = String(req.body?.name || 'test_viewer').trim().replace(/^@/, ''); twitchHandlers.chat({ login: name.toLowerCase(), name, text: String(req.body?.text || 'hello!') }); res.json({ ok: true }); });
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
app.post('/api/test/twitch-say', async (req, res) => { try { await twitch.say(String(req.body?.text || '🧪 Movie Royale test message')); res.json({ msg: 'Sent! Check your Twitch chat.' }); } catch (e) { res.status(400).json({ error: e.message }); } });
app.post('/api/test/omdb', async (req, res) => res.json(await testOmdb()));
app.post('/api/test/battle', async (req, res) => { // a practice round with made-up entries; your real lists and history aren't touched
  if (live.phase === 'lobby' || live.phase === 'running') return res.status(400).json({ error: 'A battle is already going.' });
  const names = ['Popcorn Pete', 'Reel Goblin', 'VHS Kid', 'Night Owl', 'Mia', 'Big Screen Bob', 'Lena', 'Ozzy', 'Frames', 'Snack Attack'];
  const movies = [['The Thing', '1982'], ['Heat', '1995'], ['Coco', '2017'], ['Jaws', '1975'], ['Alien', '1979'], ['Arrival', '2016'], ['Hot Fuzz', '2007'], ['Oldboy', '2003'], ['Paddington 2', '2017'], ['Knives Out', '2019']];
  const fighters = movies.map(([t, y], i) => ({ id: 'test-' + i, label: t, sub: y, weight: 1, owner: names[i], showOwner: true, kind: 'films', details: { director: 'Test', genres: ['Test'], synopsis: 'This is a practice round.' } }));
  live.game = { id: 'test-' + uid(), listId: null, fighters, total: fighters.length, test: true };
  live.phase = 'lobby'; live.claim = null;
  broadcast({ type: 'start', gameId: live.game.id, fighters, total: fighters.length, listName: '🧪 Practice round', kind: 'films', lobbySeconds: db.settings.lobbySeconds, gameSeconds: db.settings.gameSeconds, fairOdds: true, queued: [] }, 'overlay');
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
async function startRound() { // returns an error message, or null when the round started
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
  previewIds = null;
  live.game = { id: uid(), listId: list.id, fighters, total };
  live.phase = 'lobby'; live.claim = null;
  const queued = db.pendingEffects; db.pendingEffects = []; save();
  broadcast({
    type: 'start', gameId: live.game.id, fighters, total, listName: list.screenTitle || list.name, kind: list.type, movieNo: list.type === 'movies' ? (stream().movies || 0) + 1 : null,
    lobbySeconds: db.settings.lobbySeconds, gameSeconds: db.settings.gameSeconds, fairOdds: db.settings.fairOdds, chaos: chaosState(), queued
  }, 'overlay');
  pushState();
  return null;
}
function stopGather(silent) { if (!live.gather) return; clearTimeout(live.gather.timer); live.gather = null; if (!silent) broadcast({ type: 'gather', endsAt: null }, 'overlay'); }
app.post('/api/start', async (req, res) => {
  stopGather(true);
  const err = await startRound();
  err ? res.status(400).json({ error: err }) : res.json({ ok: true });
});
// "give people time to chat": countdown on the cliff, pieces drop in as people chat, then the battle starts by itself
app.post('/api/gather/start', (req, res) => {
  if (live.phase === 'lobby' || live.phase === 'running') return res.status(400).json({ error: 'A battle is already going.' });
  if (live.phase === 'ended' || live.claim) { // coming from a finished round: put the next round's pieces back first
    if (live.claim) clearTimeout(live.claim.timer);
    live.claim = null; live.phase = 'idle'; live.game = null; broadcast({ type: 'reset' }, 'overlay'); refreshPreview(true);
  }
  stopGather(true);
  const seconds = Math.max(10, Number(req.body?.seconds) || 120);
  live.gather = { endsAt: Date.now() + seconds * 1000 };
  live.gather.timer = setTimeout(async () => {
    live.gather = null; broadcast({ type: 'gather', endsAt: null }, 'overlay');
    const err = await startRound();
    if (err) { broadcast({ type: 'gatherFailed', error: err }, 'overlay'); pushState(); }
  }, seconds * 1000);
  setTimeout(() => broadcast({ type: 'gather', endsAt: live.gather?.endsAt || null, seconds }, 'overlay'), 400);
  pushState(); res.json({ ok: true });
});
app.post('/api/gather/cancel', (req, res) => { stopGather(); pushState(); res.json({ ok: true }); });
app.post('/api/reset', (req, res) => { live.phase = 'idle'; live.game = null; if (live.claim) clearTimeout(live.claim.timer); live.claim = null; broadcast({ type: 'reset' }, 'overlay'); pushState(); refreshPreview(true); res.json({ ok: true }); });
// sounds: any file in public/assets/sounds named after a sound (e.g. fanfare.mp3, music.mp3) replaces the built-in one
const SOUND_DIRS = [path.join(DATA, 'sounds'), path.join(ROOT, 'public', 'assets', 'sounds')];
app.get('/api/sounds', (req, res) => {
  const files = new Set();
  for (const d of SOUND_DIRS) { try { fs.readdirSync(d).filter(f => /\.(mp3|wav|ogg|m4a)$/i.test(f)).forEach(f => files.add(f)); } catch {} }
  res.json([...files]);
});
app.get('/assets/background.png', (req, res, next) => { // your own sky: put background.png in the data folder
  const p = path.join(DATA, 'background.png'); fs.existsSync(p) ? res.sendFile(p) : next();
});
app.get('/assets/sounds/:f', (req, res, next) => { // your own sounds (data folder) win over built-in ones
  const f = path.basename(req.params.f), p = path.join(DATA, 'sounds', f);
  fs.existsSync(p) ? res.sendFile(p) : next();
});
app.post('/api/camera', (req, res) => { const a = String(req.body?.action || ''); if (['in', 'out', 'reset', 'auto', 'left', 'right', 'up', 'down', 'skip', 'next', 'prev', 'overview'].includes(a)) broadcast({ type: 'camera', action: a }, 'overlay'); res.json({ ok: true }); });
app.post('/api/sound-test', (req, res) => { broadcast({ type: 'soundTest', name: req.body?.name || 'fanfare' }, 'overlay'); res.json({ ok: true }); });
app.post('/api/effect', (req, res) => { triggerEvent(req.body.event, { name: streamerName(), avatar: proxied(db.owner?.avatar) }, 'panel'); res.json({ ok: true }); });

app.post('/api/winner/undo', (req, res) => { // movie winner didn't get watched after all: put it back
  const w = live.lastWinner; if (!w) return res.sendStatus(404);
  const e = getList(w.listId)?.entries.find(x => x.id === w.id);
  if (e && e.status === 'watched') { e.status = 'active'; lb.unmarkWatched({ title: e.label, year: e.sub, tmdbId: e.tmdbId }); }
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
  if (early) { autoClaim(early.text); return res.json({ ok: true, instant: true }); }
  const seconds = Number(req.body?.seconds) || 30;
  live.claim = { winner: w, endsAt: Date.now() + seconds * 1000, claimed: false, done: false };
  live.claim.timer = setTimeout(() => finishClaim(false), seconds * 1000);
  const recent = live.chatLog.slice(-8).map(m => ({ name: m.name, text: m.text, winner: (w.ownerLogin && m.login === w.ownerLogin.toLowerCase()) || norm(m.name) === norm(w.owner) }));
  broadcast({ type: 'claimStart', winner: w, seconds, recent }, 'overlay');
  pushState(); res.json({ ok: true });
});
app.post('/api/claim/confirm', (req, res) => { finishClaim(true); res.json({ ok: true }); });
app.post('/api/claim/close', (req, res) => { // close the pop-up and put the next round's pieces back on the cliff
  if (live.claim) clearTimeout(live.claim.timer); live.claim = null;
  live.phase = 'idle'; live.game = null;
  broadcast({ type: 'reset' }, 'overlay'); pushState(); refreshPreview(true); res.json({ ok: true });
});

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
app.post('/api/twitch/rewards', async (req, res) => { try { const made = await twitch.createRewards(); db.settings.rewardsCreated = true; save(); pushState(); res.json({ made }); } catch (e) { res.status(400).json({ error: e.message }); } });

// test helper: pretend someone typed in Twitch chat (only when started with ROYALE_DEBUG=1)
if (process.env.ROYALE_DEBUG) app.post('/api/debug/chat', (req, res) => { twitchHandlers.chat({ login: String(req.body.login || '').toLowerCase(), name: req.body.name || req.body.login, text: req.body.text || 'hi' }); res.json({ ok: true }); });

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
  const msg = e.code === 'EADDRINUSE' ? `Movie Royale is already running (port ${PORT} is busy). Close the other copy and try again.` : e.message;
  console.error('\n  ' + msg + '\n');
  if (globalThis.__desktop) globalThis.__desktop.fatal(msg); else process.exit(1);
});
server.listen(PORT, process.env.ALLOW_LAN ? '0.0.0.0' : undefined, async () => {
  globalThis.__desktop?.applySettings?.({ runInBackground: db.settings.runInBackground !== false, startWithWindows: !!db.settings.startWithWindows });
  globalThis.__desktop?.ready(`http://localhost:${PORT}/`);
  console.log(`\n  🍿 Movie Royale is running!\n  Open http://localhost:${PORT} in your browser (keep this window open while you stream)\n`);
  const n = lb.loadCsvs();
  if (n) console.log(`  Letterboxd: loaded ${n} rows from your export`);
  discord.start(pushState);
  twitch.start(twitchHandlers);
  if (rollWeek()) console.log('  New week: benched movies are back, spots refilled');
  restoreAway(true);
  setInterval(() => { const a = rollWeek(), b = restoreAway(true); if (a || b) { pushState(); refreshPreview(); } }, 5 * 60 * 1000);
  const tick = async () => { await lb.refreshRss(db.settings.letterboxdUser); sweepWatched(); pushState(); };
  tick(); setInterval(tick, 30 * 60 * 1000);
  const full = async () => { await lb.refreshProfile(db.settings.letterboxdUser); sweepWatched(); pushState(); };
  full(); setInterval(full, 6 * 60 * 60 * 1000); // whole profile every 6 hours
});

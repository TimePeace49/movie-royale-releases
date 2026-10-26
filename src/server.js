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
import { searchMovies } from './tmdb.js';
import { resetLuckFor, giveLuckBack, picksClosed, setOwner, claimManual, mergePerson, watchedElsewhere, unwatchedElsewhere, setWatchedElsewhereHook, wonThisWeek, freePicks } from './movies.js';
import { getRatings, testOmdb } from './ratings.js';
import { parseImport, toLines, importLink } from './importer.js';
import * as cloud from './cloud.js';
import { MAP_LIST, mapById } from './maps.js';
import * as wheel from './wheel.js';
import { renameUser } from './rename.js';
import * as donations from './donations.js';
import * as obs from './obs.js';
import * as chatlog from './chat.js';
import { recordRound, getResults, listResults, statsView, statsReady } from './stats.js';
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
// a finished round is still on screen but you moved on (picked another battle, or the game window reloaded): back to the waiting cliff
function leaveEnded() {
  if (live.phase !== 'ended') return;
  if (live.claim) clearTimeout(live.claim.timer); live.claim = null; nextMap();
  live.phase = 'idle'; live.game = null;
  broadcast({ type: 'reset' }, 'overlay');
}
function refreshPreview(now = false) {
  clearTimeout(previewTimer);
  previewTimer = setTimeout(async () => {
    if (live.phase !== 'idle') return;
    const list = getList(db.activeListId);
    if (!list) return;
    if (previewList !== list.id) { previewIds = null; previewList = list.id; }
    const { fighters, total } = await buildFighters(list, previewIds);
    previewIds = fighters.map(f => f.id);
    broadcast({ type: 'preview', map: currentMap(), fighters, total, listName: list.screenTitle || list.name, kind: list.type, queued: db.pendingEffects.length, chaos: chaosState(), chatGate: list.type === 'movies' && db.settings.chatGate !== false }, 'overlay');
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
    settings: { ...st, cloud: { enabled: !!st.cloud?.enabled, url: st.cloud?.url || '' }, seJwt: mask(st.seJwt), slToken: mask(st.slToken), obsPassword: mask(st.obsPassword), discordToken: mask(st.discordToken), twitchClientSecret: mask(st.twitchClientSecret), tmdbKey: mask(st.tmdbKey), omdbKey: mask(st.omdbKey), wheelOfNamesKey: mask(st.wheelOfNamesKey) },
    lists: db.lists, activeListId: db.activeListId, history: db.history.slice(-15).reverse().map(h => ({ label: h.winner?.label ?? h.label, sub: h.winner?.sub ?? h.sub, at: h.at, listName: h.listName })),
    week: { start: weekStartDate().toISOString(), backOn: backOn(), winners: db.week?.winners?.length || 0, spotWon: !!db.week?.spotWon },
    version: VERSION, historyVersion, wheelVer: wheel.W().ver || 0, wheelShow: !!wheel.W().show, owner: db.owner ? { name: db.owner.name, avatar: db.owner.avatar, login: db.owner.login } : null, people: discordPeople(),
    pendingEffects: db.pendingEffects, events: EVENTS,
    status: { discord: discord.status, twitch: twitch.status, donations: donations.status, letterboxd: lb.stats(), overlays: [...wss.clients].filter(c => c.role === 'overlay').length },
    movieNo: (stream().movies || 0) + 1, phase: live.phase, lastWinner: live.lastWinner, claim: live.claim && { ...live.claim, timer: undefined },
    noShowStreak: db.noShowStreak || 0, chatters: stream().active, phaseAt: live.phaseAt || 0, recentChatters: recentChatters(), gather: live.gather ? { endsAt: live.gather.endsAt } : null, rollcall: live.rollcall && { ...live.rollcall, timer: undefined }, awayCount: (getList('movies')?.entries || []).filter(e => e.status === 'away').length,
    maps: mapsWithTags(), mapNow: (live.phase === 'lobby' || live.phase === 'running') && live.game?.map || currentMap(), vote: live.vote && { options: live.vote.options, endsAt: live.vote.endsAt }, colorCount: Object.keys(db.colors || {}).length,
    backupDue: backupDue(), lastBackupAt: db.lastBackupAt || null, luckSaves: (db.luckSaves || []).map(x => ({ id: x.id, at: x.at, name: x.name, listId: x.listId || 'movies', kind: x.kind || 'luck', count: Object.keys(x.luck).length, total: Math.round(Object.values(x.luck).reduce((a, b) => a + b, 0) * 10) / 10 })), series: live.series && !live.series.done ? { listId: live.series.listId, bestOf: live.series.bestOf, need: live.series.need, round: live.series.round, tally: Object.entries(live.series.wins).sort((a, b) => b[1] - a[1]).map(([id, n]) => ({ label: live.series.names[id], n })) } : null, chaos: chaosState(), calls: { open: live.phase !== 'running' && live.phase !== 'ended', count: live.calls?.size || 0, top: live.calls ? callSummary().slice(0, 6) : [] }, picksClosed: picksClosed(), picksClosedManual: !!db.picksClosed, live: !!db.live, swapLock: !!db.swapLock, swapsLocked: swapsLocked(), luckOn: luckOn(), banCount: (db.bans || []).length,
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
        // the glow + flames show on every battle type and every map: movies use their luck, custom/chat/giveaway lists use their extra odds (x2 = 10%, x6 = 50% flames)
        glow: e.luckPct > 0 ? e.luckPct : Math.max(0, Math.round(((e.weight || 1) - 1) * 10)),
        image: proxied(image), poster: proxied(e.poster), owner, ownerLogin,
        showOwner: list.type === 'movies' || (list.type === 'chat' && !!e.joined), color: (db.settings.colorsOn !== false && ownerLogin && db.colors?.[ownerLogin.toLowerCase()]) || null,
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
function helpChatText() {
  const st = db.settings, parts = [];
  parts.push(`${st.twitchMoviesCommand || '!mymovies'} (your movies, or add a name)`);
  if (st.callsOn !== false) parts.push(`${st.callCommand || '!call'} <movie> (call the winner before the fight: +${st.callLuck ?? 1}% luck if you're right)`);
  if (st.colorsOn !== false) parts.push(st.colorMode === 'points' ? `color: redeem "${st.colorReward}" and type a color` : `${st.colorCommand || '!color'} <color> (your ball color)`);
  parts.push(`${st.joinCommand || '!join'} (chat battles)`);
  if (giveawaySettings().command) parts.push(`${giveawaySettings().command} (giveaways)`);
  parts.push('type 1-4 during a map vote');
  { const wc = wheel.W().cmd; parts.push(`🎡 wheel: ${wc.respin} (use a saved respin) · ${wc.spins} (how many respins you have)`); }
  return `🍿 Movie Royal commands: ${parts.join(' · ')}. Pick movies in Discord with /suggest.`;
}
function helpChatCommand(m) {
  const cmd = String(db.settings.helpCommand || '!moviesroyal').trim().toLowerCase(); if (!cmd) return;
  const first = m.text.toLowerCase().split(/\s+/)[0]; if (first !== cmd && first !== '!movieroyal') return;
  if (Date.now() - helpCd < 30000 || !twitch.status.canChat) return; helpCd = Date.now();
  twitch.say(helpChatText()).catch(() => {});
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
    db.live = !!isLive; if (isLive) { stream().movies = 0; stream().startedAt = Date.now(); wheel.newStream(); } // new stream: movie count starts over
    cloud.sync(true); // lock / unlock swaps on the 24/7 bot right away
    if (db.settings.closePicksWhenLive && !db.picksClosed && db.settings.announcePicks !== false) discord.notify(isLive ? '🔒 **Movie picks are closed** while the stream is live. They open again when it ends.' : '🍿 **Movie picks are open again!** Use `/suggest` to add yours.').catch(() => {});
    save(); pushState();
    broadcast({ type: 'toast', text: isLive ? '🔴 You went live — Discord swaps are now locked.' : '⚫ Stream ended — Discord swaps are open again.' }, 'control');
    discord.refreshPinned?.();
  },
  async redeem(r) {
    if (wheel.wheelRedeem(r)) return; // 🎡 wheel respin / move up / move down
    if (db.settings.colorReward && r.title.toLowerCase() === db.settings.colorReward.toLowerCase()) { if (db.settings.colorMode === 'points') setColor(r.login, r.input); return; }
    if (db.settings.pointsOn === false) return; // channel point chaos switched off
    const entry = Object.entries(db.settings.rewards).find(([t]) => t.toLowerCase() === r.title.toLowerCase());
    if (!entry) return;
    triggerEvent(entry[1], { name: r.name, avatar: await avatarFor(r.login) }, 'points');
  },
  sub(sb) { try { wheel.onSub(sb); } catch (e) { console.error('[wheel sub]', e.message); } },
  async cheer(c) {
    try { wheel.onBits(c); } catch (e) { console.error('[wheel bits]', e.message); }
    if (db.settings.bitsOn === false) return; // bits chaos switched off
    const tiers = Object.entries(db.settings.bits).map(([b, e]) => [Number(b), e]).filter(([b]) => c.bits >= b).sort((a, b) => b[0] - a[0]);
    if (!tiers.length) return;
    triggerEvent(tiers[0][1], { name: c.name, avatar: await avatarFor(c.login), bits: c.bits }, 'bits');
  },
  alert(a) { try { chatlog.onAlert(a); } catch (e) { console.error('[alert]', e.message); } },
  clear(c) { try { chatlog.onClear(c); } catch {} },
  async chat(m) {
    try { chatlog.onChat(m); } catch (e) { console.error('[chatlog]', e.message); }
    const newFace = !live.chatLog.some(x => x.login === m.login && Date.now() - x.at < 5 * 60000);
    live.chatLog.push({ ...m, at: Date.now() }); live.chatLog = live.chatLog.slice(-300);
    wheel.wheelChat(m); // 🎡 !respin / !spins
    moviesChatCommand(m); chatVote(m); chatColor(m); chatCall(m); helpChatCommand(m); giveawayChat(m);
    if (newFace) pushState(); // keeps "Recent chatters" in the control panel up to date
    if (live.rollcall && !live.rollcall.done) {
      const p = live.rollcall.people.find(x => !x.here && chatMatches(x, m));
      if (p) checkIn(p);
    } else activateFromChat(m);
    // claim pop-up: show chat, stop when the winner talks
    if (live.claim && !live.claim.done) {
      const isWinner = isWinnerMsg(live.claim.winner, m);
      broadcast({ type: 'chat', msg: { name: m.name, text: m.text, winner: isWinner, emotes: m.emotes || '', color: m.color || null } }, 'overlay');
      if (isWinner) finishClaim(true, m.text);
    } else if (!live.claim && live.phase === 'ended' && live.lastWinner && !live.lastWinner.spot && isWinnerMsg(live.lastWinner, m)) {
      autoClaim(m.text); // winner spoke up before the claim timer was even started: instant win
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
  const ps = discordPeopleWithMovies().filter(x => !on.has(x.key) && chatMatches(x, m));
  if (!ps.length) return;
  for (const x of ps) st.active.push(x.key); save(); const p = ps[0];
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
  if (ws.role === 'overlay') { if (live.phase === 'ended' && !live.claim) leaveEnded(); ws.send(JSON.stringify(wheel.wheelMsg())); ws.send(JSON.stringify(audioMsg())); ws.send(JSON.stringify(camMsg())); refreshPreview(true); if (live.gather) setTimeout(() => ws.send(JSON.stringify({ type: 'gather', endsAt: live.gather?.endsAt })), 500); }
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
      if (live.game.test) { try { recordRound({ game: live.game, list: null, m, startedAt: live.game.startedAt, test: true }); } catch {} live.lastWinner = { ...f, listName: 'Practice round', at: Date.now(), test: true, gameId: live.game.id }; pushState(); return; } // practice rounds never touch real lists or history
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
          if (twitch.status.canChat && db.settings.announceWinner !== false) setTimeout(() => twitch.say(`🥊 Round ${sr.round} goes to ${f.ownerLogin && f.showOwner ? '@' + f.ownerLogin : f.label}! (${tally.slice(0, 3).map(x => `${x.label} ${x.n}`).join(' · ')} — first to ${need})`).catch(() => {}), (db.settings.replayOn !== false ? 12 : 2) * 1000);
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
      if (seriesInfo) { live.lastWinner.series = seriesInfo; rec.series = seriesInfo; f.series = seriesInfo; }
      if (list?.giveaway) { db.giveawayWinners ||= []; db.giveawayWinners.push({ login: f.ownerLogin || norm(f.label), name: f.label, prize: giveawaySettings().prize || giveawaySettings().title, at: Date.now() }); db.giveawayWinners = db.giveawayWinners.slice(-500); if (giveawaySettings().removeWinner) { const we = list.entries.find(x => x.id === f.id); if (we) we.status = 'out'; } }
      announceWinner(f, list);
      { const c = resolveCalls(f, list); if (c) { live.lastWinner.calls = { total: c.total, right: c.right.length, names: c.right.slice(0, 8).map(o => o.name) }; rec.calls = live.lastWinner.calls; } }
      if (list?.type === 'movies') { stream().movies = (stream().movies || 0) + 1; } // movie # of the night
      if (list?.type === 'movies') addLuck(live.game.fighters.filter(x => x.id !== f.id).map(x => x.id), `${stream().day}:${stream().startedAt || ''}`); // everyone who lost gets a little luckier
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
const startDonationFeed = () => donations.startDonations({ tip: t => { try { chatlog.onAlert({ kind: 'tip', login: String(t.name || '').toLowerCase(), name: t.name, amount: t.amount, text: `donated ${t.currency && t.currency !== 'USD' ? t.amount + ' ' + t.currency : '$' + t.amount}${t.message ? ': ' + t.message : ''}` }); wheel.onMoney(t); } catch (e) { console.error('[donation]', e.message); } }, change: pushState });
setTimeout(startDonationFeed, 1500);
setTimeout(() => { const r = wheel.W().rewards; twitch.noInput([r.grow, r.shrink]).catch(() => {}); }, 20000); // grow/shrink rewards made by older versions asked chat to type a spot
wheel.initWheel({ broadcast, pushState, say: t => twitch.status.canChat && db.wheel?.chatOn !== false ? twitch.say(t) : Promise.resolve(), obsDoom: () => obs.doomsday() });
const wheelChanged = () => { const w = wheel.W(); w.ver = (w.ver || 0) + 1; save(); broadcast(wheel.wheelMsg(), 'overlay'); pushState(); };
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
app.post('/api/wheel/:id/duplicate', (req, res) => { const o = wheel.getWheel(req.params.id), b = req.body || {}; if (!o) return res.status(404).json({ error: 'No such wheel' }); const w = wheel.newWheel(String(b.name || '').trim() || o.name + ' (copy)', o.entries.filter(e => e.type !== 'void').map(e => { const c = { ...e, id: null, voided: null }; if (b.resetSizes) c.weight = 1; if (b.resetCounts !== false && c.type === 'countdown') { c.count = c.countStart; c.on = true; } if (b.keepLook === false) { c.color = null; c.image = ''; } return c; }), { title: '', folder: o.folder || '', spinSecs: o.spinSecs, removeWinner: o.removeWinner, opts: JSON.parse(JSON.stringify(o.opts)), palette: b.keepLook === false ? null : o.palette, look: b.keepLook === false ? undefined : { ...o.look } }); wheel.syncVoid(w); wheel.W().wheels.push(w); wheel.W().activeId = w.id; wheelChanged(); res.json({ ok: true, id: w.id }); });
app.post('/api/wheel/active', (req, res) => { if (!wheel.getWheel(req.body?.id)) return res.status(404).json({ error: 'No such wheel' }); wheel.W().activeId = req.body.id; wheelChanged(); res.json({ ok: true }); });
app.post('/api/wheel/show', (req, res) => { wheel.setShow(!!req.body?.show); wheelChanged(); res.json({ ok: true }); });
app.post('/api/wheel/spin', (req, res) => { try { const b = req.body || {}; const by = b.by && String(b.by).trim() ? { name: String(b.by).trim().slice(0, 40), login: String(b.by).trim().replace(/^@/, '').toLowerCase(), source: 'mod' } : {}; res.json({ ok: true, ...wheel.request(String(b.kind || 'spin'), by, { wheelId: b.wheelId }) }); } catch (e) { res.status(400).json({ error: e.message }); } });
app.post('/api/wheel/import', async (req, res) => { try { const w = await wheel.importWheel(req.body || {}); wheelChanged(); res.json({ ok: true, id: w.id, name: w.name, count: w.entries.length }); } catch (e) { res.status(400).json({ error: e.message }); } });
app.post('/api/wheel/settings', (req, res) => { const w = wheel.W(), b = req.body || {};
  if (b.auto) for (const k of ['subSpins', 'giftSpins', 'bitsPer', 'bitsSpins', 'dollarsPer', 'popBits']) if (b.auto[k] != null) w.auto[k] = Math.max(0, Number(b.auto[k]) || 0);
  if (b.auto?.tierMult != null) w.auto.tierMult = !!b.auto.tierMult;
  if (b.cmd) for (const k of ['respin', 'spins']) if (b.cmd[k]) w.cmd[k] = String(b.cmd[k]).trim().split(/\s+/)[0].slice(0, 30);
  if (b.growStep != null) w.growStep = Math.max(.1, Math.min(100, Number(b.growStep) || 1));
  if (b.perStream != null) { w.mine.perStream = Math.max(0, Math.min(100, Math.round(Number(b.perStream) || 0))); } if (b.pointsOn != null) w.pointsOn = !!b.pointsOn; if (b.chatOn != null) w.chatOn = !!b.chatOn; for (const k of ['respin', 'move', 'up', 'down', 'grow', 'shrink']) { if (b.rewards?.[k] != null) w.rewards[k] = String(b.rewards[k]).slice(0, 45); if (b.costs?.[k] != null) w.costs[k] = Math.max(1, Number(b.costs[k]) || 1); } wheelChanged(); res.json({ ok: true }); });
app.post('/api/wheel/rewards', async (req, res) => { try { const w = wheel.W(), made = []; const want = Array.isArray(req.body?.kinds) && req.body.kinds.length ? req.body.kinds : ['respin', 'move', 'grow', 'shrink']; for (const k of want) if (w.rewards[k] && await twitch.createReward({ title: w.rewards[k], cost: w.costs[k], prompt: wheel.REWARD_INFO[k].prompt, color: wheel.REWARD_INFO[k].color, input: !!wheel.REWARD_INFO[k].input, queue: true })) made.push(w.rewards[k]); await twitch.noInput([w.rewards.grow, w.rewards.shrink]).catch(() => {}); res.json({ ok: true, made }); } catch (e) { res.status(400).json({ error: e.message }); } });
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
    login, name: tw?.name || v?.name || bank?.name || dp?.name || login, avatar: tw?.avatar || null, twitchId: tw?.id || v?.id || null, createdAt: tw?.createdAt || null, about: tw?.about || '',
    followedAt: follow === undefined ? (v?.followedAt || undefined) : follow, url: login ? `https://twitch.tv/${login}` : null,
    sub: v ? { now: !!v.sub, months: v.subMonths || 0 } : null, mod: !!v?.mod, vip: !!v?.vip, streak: v?.streak || 0, color: v?.color || null,
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
  return (await r.json()).filter(x => !x.draft).map(x => ({ tag: x.tag_name, version: x.tag_name.replace(/^v/, ''), name: x.name, pre: !!x.prerelease, at: x.published_at, notes: x.body || '', url: (x.assets || []).find(a => /\.exe$/i.test(a.name))?.browser_download_url || null, page: x.html_url }));
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
app.get('/api/cloud/outdated', async (req, res) => { try { res.json({ outdated: !db.settings.botUpdatePrompted && await cloud.botOutdated() }); } catch { res.json({ outdated: false }); } });
app.get('/api/whatsnew', (req, res) => {
  const from = db.settings.lastSeenVersion || '1.10.0';
  if (!db.settings.setupSeen) { db.settings.lastSeenVersion = VERSION; save(); return res.json({ steps: [] }); }
  const steps = NEW_SETUP.filter(x => newer(x.since, from) && !newer(x.since, VERSION) && !x.done()).map(({ id, title, why }) => ({ id, title, why }));
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
  fs.writeFileSync(bat, `@echo off\r\nstart "" /wait "${file}" /S /UPDATE\r\ntimeout /t 2 /nobreak >nul\r\nstart "" "${exe}"\r\n`);
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
    fs.writeFileSync(file, Buffer.from(await r.arrayBuffer())); runInstaller(file, res);
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
  if (['maxPerUser', 'banCurrentYear', 'luckOn', 'twitchMoviesCommand', 'streamerName', 'ideasDoc'].some(k => k in body)) discord.refreshPinned?.();
  if ('discordChannelName' in body && body.discordChannelName !== undefined && rdName !== db.settings.discordChannelName) rd = true; // makes/finds the new channel
  if ('spotName' in body) for (const e of getList('movies')?.entries || []) if (e.kind === 'spot') e.label = `${db.settings.spotName || 'Kirb'}'s Pick`;
  if ('map' in body && db.settings.map !== 'random' && !mapById(db.settings.map)) db.settings.map = 'random';
  if (mapWas !== db.settings.map) { live.map = null; live.mapUsed = false; if (live.phase === 'idle') refreshPreview(true); }
  if (colWas !== db.settings.colorsOn && live.phase === 'idle') refreshPreview();
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
  db.lists.push(l); db.activeListId = l.id; leaveEnded(); save(); pushState(); refreshPreview(true); res.json(l);
});
app.patch('/api/lists/:id', (req, res) => {
  const l = getList(req.params.id); if (!l) return res.sendStatus(404);
  if (req.body.name != null) l.name = String(req.body.name).slice(0, 60);
  if (req.body.joinOpen != null) l.joinOpen = !!req.body.joinOpen;
  if (req.body.bestOf != null && l.type !== 'movies') { l.bestOf = [1, 3, 5, 7, 9].includes(Number(req.body.bestOf)) ? Number(req.body.bestOf) : 1; if (live.series?.listId === l.id) live.series = null; if (l.giveaway) giveawaySettings().bestOf = l.bestOf; }
  if (req.body.screenTitle != null) { l.screenTitle = String(req.body.screenTitle).slice(0, 60); refreshPreview(); }
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
    if (l.type === 'movies' && req.body.status === 'watched' && e.status !== 'watched' && e.backers?.[0]) e.luckSnap = resetLuckFor(e.backers[0].discordId); // watched: that person's luck starts over
    if (l.type === 'movies' && req.body.status !== 'watched' && e.status === 'watched' && e.luckSnap) { giveLuckBack(e.luckSnap); delete e.luckSnap; }
    if (l.type === 'movies' && req.body.status === 'watched' && e.status !== 'watched') setTimeout(() => watchedElsewhere(e), 0); // watched outside a battle: they get a free replacement pick
    if (l.type === 'movies' && req.body.status !== 'watched' && e.status === 'watched') unwatchedElsewhere(e);
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
  if (g.confirmEntry && twitch.status.canChat) twitch.say(`🎁 @${m.name} you're in${w !== 1 ? ` (x${w} odds)` : ''}!`).catch(() => {});
}
function giveawayOpen(open) {
  const l = giveawayList(), g = giveawaySettings();
  l.joinOpen = !!open; clearTimeout(gaTimer);
  if (open) {
    db.activeListId = l.id; l.screenTitle = `🎁 ${g.title}${g.prize ? ': ' + g.prize : ''}`; l.bestOf = Number(g.bestOf) || 1;
    if (g.autoCloseSeconds > 0) gaTimer = setTimeout(() => { giveawayOpen(false); pushState(); if (twitch.status.canChat) twitch.say(`⏹ Giveaway entries are closed! ${l.entries.filter(e => e.status === 'active').length} people are in.`).catch(() => {}); }, g.autoCloseSeconds * 1000);
    if (g.announceOpen && twitch.status.canChat) {
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
function mapsWithTags() { const r = mapRuns(); return MAP_LIST.map(m => ({ ...m, tag: !r[m.id] ? 'new' : (r[m.id].rev || 1) < (m.rev || 1) ? 'updated' : null })); }
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
  if (twitch.status.canChat) twitch.say(`🗳️ Chat picked the map: ${win.icon} ${win.name}!`).catch(() => {});
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
  if (twitch.status.canChat) twitch.say(`🗳️ Vote for the map! Type the number: ${pool.map((o, i) => `${i + 1} = ${o.name}`).join(' · ')} (${seconds}s)`).catch(() => {});
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
  if (twitch.status.canChat) {
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
  if ('whenLive' in b) db.settings.closePicksWhenLive = !!b.whenLive;
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
app.post('/api/test/chat', (req, res) => { const name = String(req.body?.name || 'test_viewer').trim().replace(/^@/, ''); twitchHandlers.chat({ login: name.toLowerCase(), name, text: String(req.body?.text || 'hello!'), badges: req.body?.badges || {}, userId: null, emotes: req.body?.emotes || '', color: req.body?.color || null, badgeList: req.body?.badgeList || '' }); res.json({ ok: true }); });
app.post('/api/test/wheel-land', wTry(b => wheel.request(b.kind === 'respin' ? 'respin' : 'spin', {}, { force: String(b.entryId || ''), wheelId: b.wheelId }))); // Test tab: land on a spot you pick
app.post('/api/test/doom-preview', (req, res) => { broadcast({ type: 'wheelDoom', text: `${streamerName().toUpperCase()} WILL RETURN FOR DOOMSDAY!!!`, preview: true }, 'overlay'); res.json({ ok: true }); }); // just the screen, nothing turns off
app.post('/api/test/obs-mute', wTry(async () => obs.muteTest(5000)));
app.post('/api/test/live', (req, res) => { twitchHandlers.live(!!req.body?.live); res.json({ ok: true, live: !!db.live }); }); // Test tab: pretend you went live / offline
app.post('/api/test/wheel-redeem-raw', (req, res) => { const b = req.body || {}; const ok = wheel.wheelRedeem({ title: String(b.title || ''), input: b.input, login: String(b.name || 'test').toLowerCase(), name: String(b.name || 'test'), cost: 100 }); res.json({ ok }); });
app.post('/api/test/wheel-redeem', (req, res) => { const k = String(req.body?.kind || 'respin'), name = String(req.body?.name || 'test_viewer'); const ok = wheel.wheelRedeem({ title: wheel.W().rewards[k] || '', login: name.toLowerCase(), name }); res.json({ ok }); });
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
  const fighters = many.map(([t, y], i) => ({ id: 'test-' + i, label: t, sub: y, weight: 1, luck: lucks[i % lucks.length], owner: names[i % names.length], showOwner: true, kind: 'films', details: { director: 'Test', genres: ['Test'], synopsis: 'This is a practice round.' } }));
  const tmap = req.body?.map && req.body.map !== 'random' && mapById(req.body.map) ? req.body.map : req.body?.map === 'random' ? MAP_LIST[Math.floor(Math.random() * MAP_LIST.length)].id : currentMap();
  live.game = { id: 'test-' + uid(), listId: null, fighters, total: fighters.length, test: true, map: tmap, startedAt: Date.now() };
  live.phase = 'lobby'; live.claim = null;
  broadcast({ type: 'start', gameId: live.game.id, fighters, total: fighters.length, map: tmap, listName: '🧪 Practice round', kind: 'films', lobbySeconds: db.settings.lobbySeconds, gameSeconds: db.settings.gameSeconds, fairOdds: true, queued: [] }, 'overlay');
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
async function startRound() { // returns an error message, or null when the round started
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
  live.game = { id: uid(), listId: list.id, fighters, total, map: currentMap(), startedAt: Date.now() }; live.mapUsed = true;
  live.phase = 'lobby'; live.claim = null;
  const queued = db.pendingEffects; db.pendingEffects = []; save();
  broadcast({
    type: 'start', map: currentMap(), gameId: live.game.id, fighters, total, listName: list.screenTitle || list.name, kind: list.type, movieNo: list.type === 'movies' ? (stream().movies || 0) + 1 : null,
    lobbySeconds: db.settings.lobbySeconds, gameSeconds: db.settings.gameSeconds, fairOdds: db.settings.fairOdds, chaos: chaosState(), queued,
    series: list.type !== 'movies' && (Number(list.bestOf) || 1) > 1 ? (live.series && !live.series.done && live.series.listId === list.id ? { bestOf: live.series.bestOf, need: live.series.need, round: live.series.round + 1, tally: Object.entries(live.series.wins).sort((a, b) => b[1] - a[1]).map(([id, n]) => ({ id, label: live.series.names[id], n })) } : { bestOf: Number(list.bestOf), need: Math.ceil(Number(list.bestOf) / 2), round: 1, tally: [] }) : null
  }, 'overlay');
  if (list.type !== 'movies' && live.series && (live.series.done || live.series.listId !== list.id)) live.series = null;
  pushState();
  return null;
}
function stopGather(silent) { if (!live.gather) return; clearTimeout(live.gather.timer); live.gather = null; if (!silent) broadcast({ type: 'gather', endsAt: null }, 'overlay'); }
app.post('/api/stop', (req, res) => { // stop a battle mid-fight: no winner, nothing saved
  if (live.phase !== 'lobby' && live.phase !== 'running') return res.json({ ok: true });
  live.phase = 'idle'; live.game = null; live.claim = null; live.series = null; live.mapUsed = false;
  broadcast({ type: 'reset' }, 'overlay'); pushState(); refreshPreview(true); res.json({ ok: true });
});
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
app.post('/api/reset', (req, res) => { nextMap(); live.phase = 'idle'; live.game = null; if (live.claim) clearTimeout(live.claim.timer); live.claim = null; broadcast({ type: 'reset' }, 'overlay'); pushState(); refreshPreview(true); res.json({ ok: true }); });
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
  if (live.claim) clearTimeout(live.claim.timer); live.claim = null; nextMap();
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
  globalThis.__desktop?.applySettings?.({ runInBackground: db.settings.runInBackground !== false, startWithWindows: !!db.settings.startWithWindows });
  globalThis.__desktop?.ready(`http://localhost:${PORT}/`);
  console.log(`\n  🍿 Movie Royal is running!\n  Open http://localhost:${PORT} in your browser (keep this window open while you stream)\n`);
  const n = lb.loadCsvs();
  if (n) console.log(`  Letterboxd: loaded ${n} rows from your export`);
  discord.start(pushState);
  cloud.start(pushState);
  twitch.start(twitchHandlers);
  if (rollWeek()) console.log('  New week: benched movies are back, spots refilled');
  restoreAway(true);
  setInterval(() => { const a = rollWeek(), b = restoreAway(true); if (a || b) { pushState(); refreshPreview(); } }, 5 * 60 * 1000);
  const tick = async () => { await lb.refreshRss(db.settings.letterboxdUser); sweepWatched(); pushState(); };
  tick(); setInterval(tick, 30 * 60 * 1000);
  const full = async () => { await lb.refreshProfile(db.settings.letterboxdUser); sweepWatched(); pushState(); };
  full(); setInterval(full, 6 * 60 * 60 * 1000); // whole profile every 6 hours
});

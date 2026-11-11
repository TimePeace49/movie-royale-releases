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
import { db, save, saveNow, uid, getList, norm, ROOT, DATA, UPLOADS, IMGCACHE, EVENTS, saveInfo, DB_FILE } from './store.js';
import * as lb from './letterboxd.js';
import * as series from './series.js';
import * as discord from './discord.js';
import * as twitch from './twitch.js';
import { getMany, searchMovies, findImdb, tmdbGet } from './tmdb.js';
import { notesFor } from './notesfilter.js';
import { scan as banScan, runScan, yearCleanup, setScanHooks, dubCleanup, dubFix } from './banscan.js';
import * as listsrc from './listsrc.js';
import { undoMovieWin, resetCooldowns, movieLuck, watchLuckFor, spotLuckMode, spotLuckGain } from './movies.js';
import { setBattleCheck, lockMode, autoLocked } from './movies.js';
import { resetLuckFor, giveLuckBack, picksClosed, setOwner, claimManual, mergePerson, watchedElsewhere, unwatchedElsewhere, setWatchedElsewhereHook, wonThisWeek, freePicks } from './movies.js';
import { getRatings, testOmdb, ratingsByTitle, omdbWhere, omdbFind, omdbDetails } from './ratings.js';
import * as shared from './shared.js';
import { ruleBan } from './banrules.js';
import { checkNudity, parseGuide as nudeParse, judge as nudeJudge } from './nudity.js';
import { parseImport, toLines, importLink } from './importer.js';
import * as cloud from './cloud.js';
import * as looks from './looks.js';
import * as backuplink from './backuplink.js';
import { MAP_LIST, mapById, GROUND_EVENTS, RACE_MAPS } from './maps.js';
import * as wheel from './wheel.js';
import { renameUser } from './rename.js';
import * as donations from './donations.js';
import * as obs from './obs.js';
import * as movienight from './movienight.js';
import * as watchlist from './watchlist.js';
import * as raids from './raids.js';
import * as birthdays from './birthdays.js';
import * as songs from './songs.js';
import * as pstats from './pstats.js';
import * as eggs from './eggs.js';
import * as safety from './safety.js';
import * as xlsx from './xlsx.js';
import { is as edition_is, setDevMode as edSetDevMode, setLive as edSetLive, lists as edLists } from './edition.js';
import { EDITION, APP as APP_NAME, brand, brandFile, feat as edFeat, FEATS as ED_FEATS, has as edHas, scrub as edScrub, appNow as edAppNow, scrubNow as edScrubNow, info as editionInfo, offNow as edOffNow, setLookAs as edLookAs, lookingAs as edLooking } from './edition.js';
import * as costream from './costream.js';
import * as site from './site.js';
import * as paid from './paid.js';
import * as marathon from './marathon.js';
import * as itempics from './itempics.js';
import * as cards from './cards.js';
import * as inactive from './inactive.js';
import * as chatlog from './chat.js';
import * as chatvoice from './chatvoice.js';
import * as spamban from './spamban.js';
import * as chatbot from './chatbot.js';
import * as appcmds from './appcmds.js';
import * as kick from './kick.js';
import * as deck from './deck.js';
import { recordRound, getResults, listResults, statsView, statsReady } from './stats.js';
import { getMovie as tmdbMovie } from './tmdb.js';
import { blockReason, banMovie, unbanMovie, unapprove, autoBan, isBanned as isBannedId, allowThisYear, addLuck, luckMultiplier, luckOn, swapsLocked } from './movies.js';
import { suggest, sweepWatched, picksUsed, addSpots, resetSpots, afterMovieWin, newWeek, isSpot, rollWeek, weekStartDate, backOn, weekKey } from './movies.js';

import * as errlog from './errlog.js';
import * as activity from './activity.js';
import { act, pctW } from './activity.js';

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
// 🔐 Safety (1.96.0): the very first thing every request meets. Only this PC, only the app's own pages: a page on another website
// (or another device on the network) is turned away before anything else runs. See src/safety.js
safety.setName(APP_NAME); try { if (safety.fileReset()) console.log('[safety] unlock.txt found: the lock is off'); } catch {}
try { if (db.lock && db.lock.on) { db.lock.on = false; db.lock.remember = []; save(); console.log('[safety] the 2-step lock was taken out of the app (1.109.0): it is off now'); } } catch {} /* 🔓 Derek: "just get rid of 2 factor from everyone" (the code stays, unused) */
app.use((req, res, next) => { const why = safety.strange(req); if (!why) return next(); safety.refused.n++; safety.refused.last = { at: Date.now(), why }; res.status(403).send('Movie Royal only runs on this computer.'); });
let lockPage = null, lockPageFor = null;
app.use((req, res, next) => { // 🔒 the optional lock: the control panel + setup guide ask for the authenticator code first (stream screens, OBS and the Stream Deck keep working)
  if (!safety.isOn() || safety.unlocked(req)) return next();
  const p = req.path; if (p.startsWith('/api/lock/')) return next();
  if (req.method === 'GET' && (p === '/' || p === '/control.html' || p === '/setup.html')) { try { lockPage = (lockPageFor === edLooking() && lockPage) || brandFile(fs.readFileSync(path.join(ROOT, 'public', 'lock.html'), 'utf8')); } catch { return res.status(401).send('Locked.'); } return res.set('Cache-Control', 'no-store').type('html').send(lockPage); }
  let from = ''; try { from = new URL(String(req.headers.referer || '')).pathname; } catch {}
  if (p.startsWith('/api/') && (from === '/' || from === '/control.html' || from === '/setup.html')) return res.status(401).json({ error: 'Movie Royal is locked. Type your code first.', locked: true });
  next();
});
activity.onLine(r => broadcast({ type: 'activity', row: r }, 'control')); // 🧾 History → Everything shows new lines as they happen

// ---------- live state ----------
const live = {
  lookSeed: Math.random().toString(36).slice(2), // 🎨 random character looks for this battle (a new one after every battle; same on every game screen)
  phase: 'idle',   // idle | lobby | running | ended
  game: null,      // { id, listId, fighters }
  lastWinner: null,
  claim: null,     // { winner, endsAt, claimed }
  chatLog: []      // recent twitch chat
};

// 🎥 What Movie Royal may do in OBS (1.61.0, Derek: every OBS thing can be switched off in Settings → 🎥 OBS). obsOn = all of it.
const obsOk = kind => db.settings.obsOn !== false && (!kind || db.settings['obs' + kind + 'On'] !== false);
// 📣 roll call goes to the game screen (unless you switched that off) and to the roll call browser source (/rollcall.html, 1.61.0)
function rollSend(msg) { broadcast(msg, 'rollcall'); if (db.settings.rollOnGame !== false) broadcast(msg, 'overlay'); }
const rollStartMsg = () => { const rc = live.rollcall; return { type: 'rollcallStart', seconds: Math.max(0, Math.round((rc.endsAt - Date.now()) / 1000)), people: rc.people.map(p => ({ key: p.key, name: p.name, avatar: proxied(p.avatar), here: p.here, movies: p.entries.length })) }; };
function broadcast(msg, role) {
  if (msg && msg.type === 'toast' && msg.text) msg = { ...msg, text: brand(msg.text) }; /* 🏷️ pop-ups say the edition's name */
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
  live.phase = 'idle'; live.game = null; cards.endChars();
  broadcast({ type: 'reset' }, 'overlay');
}
// 🍀 Luck in your own battles (1.72.0, Derek: "basically a discord battle but instead of movies it will be stuff for me to do…
// all entries stay on and not removed unless I remove it, chat won't be able to enter" + he picked the Discord battle's luck):
// a switch per battle (l.luckOn, off by default) for word / picture / movie lists you fill yourself. Every battle, the ones on the
// cliff that lost get a little luckier (l.luckPer %, default = Settings → 🍀 Luck's amount); the winner stays in and only its luck starts over.
const OWN_LUCK = ['text', 'pics', 'films'];
const ownLuckOk = l => !!l && OWN_LUCK.includes(l.type) && !l.giveaway;
const ownLuck = l => ownLuckOk(l) && !!l.luckOn;
const ownLuckPer = l => Math.round(clampN(l?.luckPer ?? db.settings.luckPerBattle ?? 1, 0, 100, 1) * 100) / 100;
function ownLuckAfter(list, winnerId, fighters, quiet) {
  const per = ownLuckPer(list), ids = new Set(fighters.map(x => x.id)), items = [];
  for (const e of list.entries) {
    if (!ids.has(e.id) || e.id === winnerId || e.status !== 'active' || !per) continue;
    const was = e.luckPct || 0; e.luckPct = Math.round((was + per) * 10000) / 10000; items.push(`${e.label}: ${pctW(was)} → ${pctW(e.luckPct)}`);
  }
  const w = list.entries.find(e => e.id === winnerId), had = w?.luckPct || 0; if (w) w.luckPct = 0;
  if (quiet) return { per, up: items.length, had };
  if (items.length) act('luck', `${items.length === 1 ? '1 entry' : items.length + ' entries'} that lost in “${list.name}” got luckier (+${pctW(per)} each)${had ? '' : ` · the winner “${w?.label || '?'}” stays in`}`, { icon: '🍀', kind: 'earned', list: list.name, items });
  if (had) act('luck', `“${w?.label || '?'}” won, so its luck starts over (${pctW(had)} → 0%). It stays in “${list.name}”`, { icon: '🍀', kind: 'reset', list: list.name });
  return { per, up: items.length, had };
}
const mapLabel = id => { const m = mapById(id) || cards.cardMaps(true).find(x => x.id === id); return m ? `${m.icon || '🗺️'} ${m.name}` : String(id || 'a map'); };
const chanceOf = (f, tot) => { const p = (f.weight || 1) / (tot || 1) * 100; return `${p < 10 ? Math.round(p * 10) / 10 : Math.round(p)}%`; };
function winLine(f, list, totalW, series) {
  const who = !f.owner ? '' : list?.type === 'movies' ? (f.spot ? '' : ` (${f.owner}'s pick)`) : f.showOwner && f.owner !== f.label ? ` (${f.owner})` : '';
  return `“${f.label}${f.sub ? ` (${f.sub})` : ''}” won “${list?.name || 'the battle'}”${who}${series ? ` · best of ${series.bestOf}` : ''} · had a ${chanceOf(f, totalW)} chance${f.luck ? ` with ${pctW(f.luck)} luck` : ''}`;
}
const fighterLine = (f, tot) => `${f.label}${f.sub ? ` (${f.sub})` : ''}${f.owner && f.showOwner && f.owner !== f.label ? ` · ${f.owner}` : ''} · ${chanceOf(f, tot)} chance${f.luck ? ` · 🍀 ${pctW(f.luck)}` : ''}`;
/** A battle has its winner: the game screen (ball maps) or the card fight engine (🧍 characters on a character-only map) says who. */
function gameResult(m) {
  if (!(live.game && m.gameId === live.game.id && !live.game.done)) return;
  live.lookSeed = uid(); // 🎨 the next battle's random characters get new looks (they never stick to anyone)

      live.game.done = true; live.phase = 'ended'; live.phaseAt = Date.now();
      const f = live.game.fighters.find(x => x.id === m.winnerId);
      if (!f) return;
      if (live.game.cards) { live.lastWinner = { ...f, at: Date.now(), cards: true, gameId: live.game.id, listName: live.game.testName || '🃏 Card battle' }; try { markMapRun(live.game.map); } catch {} cards.result({ fightId: live.game.cards, winnerId: f.id, order: m.order }); save(); pushState(); return; } // 🃏 a card battle on a ball map
      if (live.game.test && live.game.eggTest) { const o = eggs.opts(); broadcast({ type: 'toast', text: `🥚 Practice: in a real chat battle these ${live.game.fighters.length} creatures would each get ${o.xpJoin} XP, and ${hEsc(f.label)}'s would get ${o.xpWin} XP for winning. Nothing was saved.` }, 'control'); }
      if (live.game.test) { act('battle', `Practice battle: “${f.label}” won${live.game.testName ? ` (${live.game.testName.replace(/^🧪 Test: /, '')})` : ''} · nothing changed`, { icon: '🧪', kind: 'win', test: true, list: live.game.testName || 'Practice round' }); try { recordRound({ game: live.game, list: null, m, startedAt: live.game.startedAt, test: true }); } catch {} live.lastWinner = { ...f, listName: live.game.testName || 'Practice round', at: Date.now(), test: true, gameId: live.game.id }; if (live.game.nudeTest) { live.lastWinner.nudity = fakeNudity(f.details?.runtime); nudeToStream(f, live.lastWinner.nudity); } if (live.game.maraTest) { const tl = getList(live.game.listId); if (tl && tl.id === paid.cfg().listId && paid.dev()) maraTimerWin(tl, f, true); } pushState(); battleDoneForWheel(); return; } // practice rounds never touch real lists or history (🔞 nudeTest: a pretend nudity result for the winner)
      const list = getList(live.game.listId);
      try { recordRound({ game: live.game, list, m, startedAt: live.game.startedAt }); } catch (e) { console.error('[stats]', e.message); }
      if (list?.type === 'chat') { try { eggs.afterChatBattle(live.game.fighters, f.id); } catch (e) { console.error('[eggs]', e.message); } } // 🥚 every creature that fought earns XP, the winner's the most
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
          if (live.game.pid) { const tw0 = live.game.fighters.reduce((a, x) => a + (x.weight || 1), 0) || 1; site.result({ pid: live.game.pid, winnerId: f.id, winner: f.label, pct: Math.round((f.weight || 1) / tw0 * 1000) / 10 }); }
          act('battle', `Round ${sr.round} of best of ${bo} in “${list.name}”: “${f.label}” won it (${tally.slice(0, 4).map(x => `${x.label} ${x.n}`).join(', ')} · first to ${need})`, { icon: '🥊', kind: 'round', list: list.name });
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
        claimed: null, outcome: null, gameId: live.game.id, map: live.game.map, started: live.game.startedAt, ...(live.game.paid ? { paid: live.game.paid } : {}), ...(live.game.vod ? { vod: live.game.vod } : {}), rounds: live.series?.listId === list?.id && live.series?.games?.length > 1 ? live.series.games.slice() : undefined
      };
      db.history.push(rec); db.history = db.history.slice(-1000); historyVersion++;
      if (live.game.pid) site.result({ pid: live.game.pid, winnerId: f.id, winner: f.label, pct: Math.round((f.weight || 1) / totalW * 1000) / 10 }); // 🔮 score the viewer website's guesses
      act('battle', winLine(f, list, totalW, seriesInfo), { icon: '🏆', kind: 'win', list: list?.name, items: order.slice(0, 10).map((id, i) => `${i + 1}. ${byId.get(id)?.label || ''}`) }); // 🧾
      live.lastWinner = { ...f, listId: list?.id, listName: list?.name, at: Date.now(), historyId: rec.id, gameId: live.game.id };
      battleDoneForWheel();
      if (seriesInfo) { live.lastWinner.series = seriesInfo; rec.series = seriesInfo; f.series = seriesInfo; }
      if (list?.giveaway) { db.giveawayWinners ||= []; db.giveawayWinners.push({ login: f.ownerLogin || norm(f.label), name: f.label, prize: giveawaySettings().prize || giveawaySettings().title, at: Date.now() }); db.giveawayWinners = db.giveawayWinners.slice(-500); if (giveawaySettings().removeWinner) { const we = list.entries.find(x => x.id === f.id); if (we) { we.status = 'out'; act('battle', `“${f.label}” is out of the giveaway entries now (winners leave)`, { icon: '🚪', kind: 'out', list: list.name }); } } }
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
      if (list && list.id === paid.cfg().listId && paid.dev()) maraTimerWin(list, f, !!live.game.test); // ⏱️ a timed thing won: its timer waits for your click
      if (list && !live.game.test) { marathon.won(list.id, f.id); maraGuessResult(live.game, f.id); } // 🏃 (+ 🎯 the guessers who called it win a battle) the chat-given 🍀 on the winner starts over
      if (ownLuck(list)) ownLuckAfter(list, f.id, live.game.fighters); // 🍀 your own battle with luck: the ones that lost get luckier, the winner's luck starts over (it stays in)
      if (list?.type === 'movies') addLuck(live.game.fighters.filter(x => x.id !== f.id).map(x => x.id), `${stream().day}:${stream().startedAt || ''}`, !!db.live || !!live.fakeLive); // everyone who lost gets a little luckier (🎟️ wild spots: once a night while live, see Settings → 🍀 Luck)
      if ((list?.type === 'movies' || list?.type === 'films') && f.tmdbId && !f.spot) { fetchWinnerRatings(f, rec, live.game.id); fetchWinnerNudity(f, rec); }
      if (list?.type === 'movies') { const r = afterMovieWin(f.id); live.lastWinner.benched = r.benched; live.lastWinner.spotsRemoved = r.spotsRemoved; rec.benched = r.benched; rec.spotsRemoved = r.spotsRemoved; if (!f.spot) rec.outcome = 'watched';
        if (r.benched) act('battle', `${r.person || 'Their'}'s ${r.benched === 1 ? 'other movie sits' : r.benched + ' other movies sit'} out until ${backOn()} (one of theirs won this week)`, { icon: '💤', kind: 'bench', list: list.name });
        if (f.spot) act('battle', `Every wild spot sits out for the rest of the week (one of them won)`, { icon: '🎟️', kind: 'bench', list: list.name }); }
      save(); pushState();
}
// 📋 Who's really in the battle (1.61.0, Derek: the list under the battle shows who entered, not everyone in the pool):
// while a battle runs = its pieces; otherwise = the pieces waiting on the cliff for the battle that's picked.
function cliffInfo() {
  if ((live.phase === 'lobby' || live.phase === 'running' || live.phase === 'over') && live.game && live.game.listId) return { listId: live.game.listId, ids: live.game.fighters.map(f => f.id), running: true };
  return previewList && previewList === db.activeListId && previewIds ? { listId: previewList, ids: previewIds } : null;
}
var lastPreview = null, previewError = null; // the last cliff sent to the game screens (they check in every few seconds; any that missed it get it again)
function refreshPreview(now = false) {
  clearTimeout(previewTimer); clearTimeout(refreshPreview.rw); refreshPreview.rw = setTimeout(() => syncRewards().catch(() => {}), 1500); // channel point rewards follow the map and battle
  previewTimer = setTimeout(async () => { try {
    if (live.phase !== 'idle') return;
    const cp = cards.ballPreview(); // 🃏 Card battles tab with a ball map: the card fighters wait on that map
    if (cp) { cards.charPreview(null); const fighters = cp.fighters.map(f => ({ id: f.id, label: f.name + (f.tag ? ' ' + f.tag : ''), sub: f.game || '', image: f.image || null, weight: 1, kind: 'cards' }));
      lastPreview = { type: 'preview', mapSize: mapSizeK(), map: cp.map, fighters, total: fighters.length, listName: cp.name, kind: 'cards', skin: 'cards', queued: 0, chaos: chaosState(), chatGate: false }; lastPreview.key = fighters.map(f => f.id).join(',');
      broadcast(lastPreview, 'overlay'); lastPreview.at = Date.now(); return; }
    const list = getList(db.activeListId);
    if (!list) return;
    if (previewList !== list.id) { previewIds = null; previewList = list.id; }
    const { fighters, total } = await buildFighters(list, previewIds);
    if (live.phase !== 'idle') return;
    previewIds = fighters.map(f => f.id); cliffN = fighters.length;
    { const k = list.id + ':' + previewIds.join(','); if (k !== refreshPreview.cliffKey) { refreshPreview.cliffKey = k; broadcast({ type: 'cliff', cliff: cliffInfo() }, 'control'); } } // 📋 the Battle tab's list shows who's really in
    const pmap = currentMap(); cards.charPreview(isCharMap(pmap) && (list.chars || itemLook(list)) ? { map: pmap, name: list.screenTitle || list.name, fighters: charFighters(fighters), pace: fightPacer(list), length: fightSecs(list), lookSeed: live.lookSeed } : null); // 🧍 a character-only map: the card fight engine shows them waiting
    lastPreview = { type: 'preview', mapSize: mapSizeK(), map: pmap, lookSeed: live.lookSeed, fighters, total, listName: list.screenTitle || list.name, kind: list.type, skin: itemLook(list) ? 'items' : list.chars ? 'chars' : undefined, queued: db.pendingEffects.length, chaos: chaosState(), chatGate: list.type === 'movies' && db.settings.chatGate !== false }; lastPreview.key = fighters.map(f => f.id).sort().join(',');
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
    if (e.status === 'active' || e.status === 'benched' || e.status === 'paused' || e.status === 'away') p.active.push({ id: e.id, label: e.label, sub: e.sub, benched: e.status === 'benched', paused: e.status === 'paused', away: e.status === 'away' }); // (1.61.0, Derek: sitting out keeps their movies on the People list, it's to see the community)
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

// 🧍 Battles use characters by default (1.59.0, Derek): when men/women characters or character creation is on (said yes on the start-up
// questions), every battle shows characters, unless you changed that battle's 🧍 box yourself (l.charsSet). Setting `charsDefault`.
function applyCharsDefault() { const on = !!db.settings.charsDefault; for (const l of db.lists || []) if (!l.charsSet && !!l.chars !== on) l.chars = on; }
applyCharsDefault();
function publicState() { applyCharsDefault();
  const mask = v => (v ? '••••••' + String(v).slice(-4) : '');
  const st = db.settings;
  return {
    cloud: { enabled: cloud.enabled(), url: st.cloud?.url || '', ...cloud.status },
    costream: { ...costream.info(), obsError: costream.cfg().obsError || null, partnerView: (() => { const v = costream.status.partner?.state?.video; return v?.id ? { url: vdoView(v.id, v.q), layout: v.layout || null } : null; })() }, // (👀 watch their battle inside the app, 1.74.0)
    site: { ...site.info(), signin: db.siteSignin && db.siteSignin.url === site.url() ? db.siteSignin : null, clientTail: String(db.settings.twitchClientId || '').slice(-6), command: db.settings.siteCommand || '!site', predict: db.settings.sitePredict !== false, botV: cloud.status.botV || 0, needV: site.SITE_V, clientId: db.settings.twitchClientId ? 'yes' : '' },
    paid: paid.info(),
    ads: { on: !!db.settings.adBot, scope: (twitch.status.scopes || []).includes('channel:read:ads'), signedIn: !!twitch.status.userId, now: ad.on },
    mara: { guess: live.maraGuess ? { endsAt: live.maraGuess.endsAt, who: live.maraGuess.item.who, count: live.maraGuess.guesses.length, last: live.maraGuess.guesses.slice(-8).map(x => `${x.name} #${x.n}`) } : null, seen: maraSeen(), maps: marathon.maps(), items: marathon.items(), tokens: marathon.tokens().map(t => ({ who: t.who, test: t.test })), cfg: marathon.cfg(), listId: paid.cfg().listId || '', obs: !!db.settings.marathon?.obs, dev: !!db.settings.betaUpdates, timer: live.maraTimer || null, items2: itemLook(maraList()), ticker: { ...(live.ticker || {}), cfg: tickerCfg() }, paused: !!db.paidPaused, cards: cardsCfg(), obsSetup: obsSetupCfg(), tts: ttsCfg(), scare: scareCfg(), mics: micState(), clock: clockState(), voice: chatvoice.state(), yt: paid.dev() ? ytState() : null },
    songPlayers: songPlayers(), obsGames: obsGames(), obsKeep: { on: db.settings.obsKeep !== false, last: live.obsSync }, obsVideoN: obsVideos().length,
    kick: kick.info(),
    edition: { hide: editionInfo().hide, id: EDITION.id, name: EDITION.name, app: edAppNow(), dev: EDITION.dev && !edLooking(), realDev: EDITION.dev, off: edOffNow(), lookAs: edLooking(), all: EDITION.dev ? editionInfo().all.map(x => ({ id: x.id, name: x.name, app: x.app })) : undefined, on: ED_FEATS.filter(feat) },
    mnight: feat('movienight') ? { open: !!db.movieNight?.open, pending: (db.movieNight?.guesses || []).filter(g => g.right == null && !g.skip).length } : null,
    botCount: (db.chatbot?.commands || []).length,
    omdb: { via: omdbWhere(), shared: !!shared.omdbProxy(), dev: !!EDITION.dev, mine: !!EDITION.dev && !!shared.omdbProxy() && !!db.settings.cloud?.url && shared.omdbProxy().startsWith(String(db.settings.cloud.url).replace(/\/+$/, '')) }, /* ⭐🍅 (1.128.0) own key / the shared one */
    clip: { who: clipWho(), canFollow: (twitch.status.scopes || []).includes('moderator:read:followers'), signedIn: !!twitch.status.userId, ok: twitch.canClip(), live: !!db.live, kick: kick.on(), list: (db.clips || []).slice(0, 10) },
    spam: { ...spamban.cfg(), list: spamban.list().slice(0, 30), canBan: (twitch.status.scopes || []).includes('moderator:manage:banned_users'), signedIn: !!twitch.status.userId },
    backup: { ...backuplink.status, _ref: undefined, watching: backuplink.backupWatching(), active: backuplink.backupActive() },
    settings: { ...st, cloud: { enabled: !!st.cloud?.enabled, url: st.cloud?.url || '' }, seJwt: mask(st.seJwt), slToken: mask(st.slToken), obsPassword: mask(st.obsPassword), discordToken: mask(st.discordToken), twitchClientSecret: mask(st.twitchClientSecret), tmdbKey: mask(st.tmdbKey), omdbKey: mask(st.omdbKey), wheelOfNamesKey: mask(st.wheelOfNamesKey) },
    lists: edHas('movies') ? db.lists : db.lists.filter(l => l.id !== 'movies'), activeListId: db.activeListId, history: db.history.slice(-15).reverse().map(h => ({ label: h.winner?.label ?? h.label, sub: h.winner?.sub ?? h.sub, at: h.at, listName: h.listName })),
    week: { start: weekStartDate().toISOString(), backOn: backOn(), winners: db.week?.winners?.length || 0, spotWon: !!db.week?.spotWon },
    version: VERSION, historyVersion, wheelVer: wheel.W().ver || 0, wheelShow: !!wheel.W().show, owner: db.owner ? { name: db.owner.name, avatar: db.owner.avatar, login: db.owner.login } : null, people: discordPeople(),
    pendingEffects: db.pendingEffects, events: EVENTS,
    status: { discord: discord.status, twitch: twitch.status, donations: donations.status, letterboxd: lb.stats(), overlays: [...wss.clients].filter(c => c.role === 'overlay').length },
    movieNo: (stream().movies || 0) + 1, phase: live.phase, lastWinner: live.lastWinner, claim: live.claim && { ...live.claim, timer: undefined },
    noShowStreak: db.noShowStreak || 0, chatters: stream().active, cliff: cliffInfo(), phaseAt: live.phaseAt || 0, fightSecs: live.game?.secs || null, recentChatters: recentChatters(), wheelChatters: chattersForWheel(), gather: live.gather ? { endsAt: live.gather.endsAt } : null, rollcall: live.rollcall && { ...live.rollcall, timer: undefined }, awayCount: (getList('movies')?.entries || []).filter(e => e.status === 'away').length,
    raceMax: raceMax(), cliffN: cliffCount(), redoSkip: live.redoSkip || null, maps: mapsWithTags(), mapNow: (live.phase === 'lobby' || live.phase === 'running') && live.game?.map || currentMap(), vote: live.vote && { options: live.vote.options, endsAt: live.vote.endsAt }, colorCount: Object.keys(db.colors || {}).length,
    rewardsByHand: rewardsByHand || [], backupDue: backupDue(), lastBackupAt: db.lastBackupAt || null, luckSaves: (db.luckSaves || []).map(x => ({ id: x.id, at: x.at, name: x.name, listId: x.listId || 'movies', kind: x.kind || 'luck', count: Object.keys(x.luck).length, total: Math.round(Object.values(x.luck).reduce((a, b) => a + b, 0) * 10) / 10 })), series: live.series && !live.series.done ? { listId: live.series.listId, bestOf: live.series.bestOf, need: live.series.need, round: live.series.round, tally: Object.entries(live.series.wins).sort((a, b) => b[1] - a[1]).map(([id, n]) => ({ label: live.series.names[id], n })) } : null, chaos: chaosState(), calls: { open: live.phase !== 'running' && live.phase !== 'ended', count: live.calls?.size || 0, top: live.calls ? callSummary().slice(0, 6) : [] }, picksClosed: picksClosed(), picksClosedManual: !!db.picksClosed, raid: live.raid ? { by: live.raid.name, target: live.raid.target, started: live.raid.started || null, test: !!live.raid.test } : null, raidSetup: db.raidSetup || null, vrSetup: db.vrSetup || null, choiceObs: !!db.settings.choiceObs, chatBot: db.twitchBot ? { name: db.twitchBot.user?.name, login: db.twitchBot.user?.login, avatar: db.twitchBot.user?.avatar, on: twitch.botOn(), error: twitch.botStatus.error } : null, announce: Object.fromEntries(Object.entries(annState()).map(([k, a]) => [k, { on: !!a?.on, last: a?.last || 0, error: a?.error || null, kind: a?.kind || null }])), annKind: annKind(), cards: cards.stateFor(), capture: { on: !!live.capture, error: live.captureError || null, size: Number(db.settings.capSize) || 30, autoHide: !!db.settings.capAutoHide, autoShow: db.settings.capAutoShow !== false, allowed: obsOk('Cap'), window: db.settings.capWindow || '' }, announceMins: Math.max(5, Number(db.settings.announceMins) || 60), announceDefaults: ANNOUNCE_DEFAULTS, pickLock: lockMode(), autoLocked: autoLocked(), live: !!db.live || !!live.fakeLive, fakeLive: !!live.fakeLive, swapLock: !!db.swapLock, swapsLocked: swapsLocked(), luckOn: luckOn(), banCount: (db.bans || []).length,
    port: PORT
  };
}

// ---------- helpers ----------
const IMG_HOSTS = ['static-cdn.jtvnw.net', 'cdn.discordapp.com', 'media.discordapp.net', 'image.tmdb.org', 'm.media-amazon.com' /* OMDb's posters (movie night leaderboard) */];
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
  let pool = list.entries.filter(e => e.status === 'active' && !(list.type === 'movies' && e.skipNext) && !e.restNext && !(live.redoSkip && live.redoSkip.listId === list.id && live.redoSkip.id === e.id)); // (⏭️ !skip = sits out the next battle · 🔁 redo without the passed movie)
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
  const spotOrder = list.type === 'movies' ? list.entries.filter(x => isSpot(x) && x.status === 'active').sort((a, b) => (a.addedAt || 0) - (b.addedAt || 0) || String(a.id).localeCompare(String(b.id))).map(x => x.id) : [], spotLooks = (db.settings.spotLooks || []).filter(Boolean); // 🎟️ wild spots wear your wild spot characters in order
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
      let cr = null; if (list.type === 'chat' && e.twitch) { try { cr = eggs.entrant(e.twitch); } catch {} } // 🥚 egg game: the creature they have out is their piece (a stronger one = slightly better odds)
      const gender = list.chars ? genderOf(list, ownerLogin) : undefined; // 🧍 characters: man / woman / non-binary
      const lk = !list.chars ? undefined : list.type === 'movies' && isSpot(e) && spotLooks.length ? looks.check(spotLooks[Math.max(0, spotOrder.indexOf(e.id)) % spotLooks.length]).look : looks.lookFor({ discordId: list.type === 'movies' && !isSpot(e) ? e.backers?.[0]?.discordId : null, login: ownerLogin, gender }); // 🎨 wild spots: your wild spot characters; everyone else: their own /character (wins over !id)
      return {
        id: e.id, label: e.label, sub: e.sub || '', weight: Math.round((e.weight || 1) * (list.type === 'movies' ? luckMultiplier(e) : ownLuck(list) ? 1 + Math.max(0, Number(e.luckPct) || 0) / 100 : 1) * (1 + wl / 100) * (1 + Math.max(0, Number(e.vLuck) || 0) / 100) * (1 + (cr?.boost || 0)) * 10000) / 10000, creature: cr ? { n: cr.n, lvl: cr.lvl, name: cr.name } : undefined, luck: Math.min(100, ((list.type === 'movies' && luckOn()) || ownLuck(list) ? (e.luckPct || 0) : 0) + wl + (Number(e.vLuck) || 0)), vLuck: e.vLuck || undefined, // (🍀 vLuck = luck chat gave it with 🏃 marathon picks, 1.76.0) watchLuck: wl || undefined, // (🍀 your own battles with luck on work like the Discord battle)
        // the glow + flames show on every battle type and every map: movies use their luck, custom/chat/giveaway lists use their extra odds (x2 = 10%, x6 = 50% flames)
        glow: Math.min(100, (e.luckPct > 0 && (list.type === 'movies' || ownLuck(list)) ? e.luckPct : Math.max(0, Math.round(((e.weight || 1) - 1) * 10))) + wl + (Number(e.vLuck) || 0)),
        image: proxied(image), poster: proxied(e.poster), owner, ownerLogin,
        showOwner: list.type === 'movies' || (list.type === 'chat' && !!e.joined), color: (db.settings.colorsOn !== false && ownerLogin && db.colors?.[ownerLogin.toLowerCase()]) || null,
        backers: e.backers?.length || 0, kind: list.type, details: e.details || null, spot: isSpot(e), tmdbId: e.tmdbId || null, powers: list.type === 'chat' && list.fun?.powerups && e.powers ? e.powers : null, gender, look: lk,
        ...(itemLook(list) ? (marathon.kindOf(e) === 'workout' ? { gym: true, sign: e.label } : { item: true }) : {}) // 🏃 marathon: the thing itself, or a 🏋️ workout character with a sign
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
  act('battle', `powered up their ball with ${POWER_INFO[kind]?.say || kind}`, { icon: POWER_INFO[kind]?.icon || '✨', who: r.name, kind: 'power', list: l.name }); // 🧾
  pushState();
}
// ---------- 🏁 race power-ups (1.60.0, Derek): in a chat battle on a race map with 🏁 race power-ups ticked, chatters boost / shield / drop oil / fire a rocket / ☢️ nuke ----------
// They really can change who wins (Derek), so a battle with them on has no winner picked ahead of time (fairOdds: false). Never refunds.
const RACE_INFO = { boost: { icon: '💨', say: 'a BOOST' }, shield: { icon: '🛡️', say: 'a SHIELD' }, oil: { icon: '🛢️', say: 'an OIL SLICK behind them' }, rocket: { icon: '🚀', say: 'a ROCKET straight ahead' }, nuke: { icon: '☢️', say: 'a ☢️ NUKE. Everyone else is about to be wiped out' } };
const isRaceMap = id => RACE_MAPS.includes(id);
// 🏁 no races with more than settings.raceMax pieces (Derek: 50): random / vote / start skip the race maps, picking one is refused
const raceMax = () => Math.max(2, Math.round(Number(db.settings.raceMax) || 50));
let cliffN = null; // how many pieces the active battle has on the cliff right now (set by refreshPreview / startRound)
function cliffCount() {
  if ((live.phase === 'lobby' || live.phase === 'running') && live.game?.fighters) return live.game.fighters.length;
  if (cliffN != null && previewList === db.activeListId) return cliffN;
  const l = getList(db.activeListId); return Math.min((l?.entries || []).filter(e => e.status === 'active').length, Number(db.settings.maxFighters) || 1000);
}
const raceOk = (n = cliffCount()) => n <= raceMax();
function mapSizeK() { return clampN(db.settings.mapSize, 50, 200, 100) / 100; } // 📏 map size for every ball map (Battle tab, right side): bigger cliffs + longer race tracks
const MAPS_ON = () => { const l = MAP_LIST.filter(m => edHas('map:' + m.id)); return l.length ? l : MAP_LIST; }; // 🎭 the maps this edition has (the Editions list can switch single maps off)
const nonRaceMap = () => { const pool = MAPS_ON().filter(m => !isRaceMap(m.id) && m.id !== db.lastMap); return pool[Math.floor(Math.random() * pool.length)].id; };
const racePowersOn = l => !!(l?.type === 'chat' && l.fun?.racePowers && isRaceMap(currentMap()));
// ⛈️ the Pirate Battle's storm powers (1.70.0, Derek): chat sends big waves, lightning bolts and kraken tentacle swipes with channel points while a Pirate Battle plays.
// They never change who wins (cardfight.js: the fair winner and the smaller crew can't be knocked out by them, so it still ends one pirate from each crew).
const STORM_INFO = { wave: { icon: '🌊', say: 'a BIG WAVE', what: '🌊 Pirate Battle: a big wave crashes over a ship' }, bolt: { icon: '⚡', say: 'a LIGHTNING BOLT', what: '⚡ Pirate Battle: lightning strikes a pirate' }, tentacle: { icon: '🐙', say: 'a KRAKEN TENTACLE', what: '🐙 Pirate Battle: a kraken tentacle swipes a deck' } };
const STORM_PROMPTS = { wave: 'Pirate Battle: a huge wave crashes over one of the ships and washes pirates around (maybe overboard)!', bolt: 'Pirate Battle: a lightning bolt strikes one of the pirates!', tentacle: 'Pirate Battle: a kraken tentacle comes up out of the sea and swipes across a deck!' };
const stormOn = () => cards.live.phase === 'fight' && cards.live.fight?.map === 'pirates' && (!cards.live.fight.chars || (live.phase === 'running' && !!live.game?.charFight)); // (a battle's 🧍 characters on the Battle tab, or 📦 card packs on the Card battles tab, 1.73.0)
const stormTips = () => db.settings.pointsOn === false ? null : [...Object.keys(db.settings.stormRewards || {}).map(t => t.replace(/^pirates:\s*/i, '')), ...Object.keys(db.settings.monkeyRewards || {}).map(t => '🐒 ' + t)];
const MONKEY_INFO = edScrub ? { T: { i: 0, name: 'Red', what: '🐒 Pirate Battle: take out the red monkey in the rowboat', prompt: 'Pirate Battle: the little red monkey in the rowboat between the ships gets taken out!' }, K: { i: 1, name: 'Blue', what: '🐒 Pirate Battle: take out the blue monkey in the rowboat', prompt: 'Pirate Battle: the little blue monkey in the rowboat between the ships gets taken out!' } } : { T: { i: 0, name: 'Time', what: '🐒 Pirate Battle: take out the red T monkey (Time) in the rowboat', prompt: 'Pirate Battle: the little red T monkey (Time) in the rowboat between the ships gets taken out!' }, K: { i: 1, name: 'Kirb', what: '🐒 Pirate Battle: take out the blue K monkey (Kirb) in the rowboat', prompt: 'Pirate Battle: the little blue K monkey (Kirb) in the rowboat between the ships gets taken out!' } };
function monkeyRedeem(r, who, test) { // 🐒 chat takes out Time or Kirb: the next way in the shuffled pile (cards.monkeyOut)
  const say = t => { if (!test && twitch.canSay()) twitch.say(t).catch(() => {}); }, M = MONKEY_INFO[who]; if (!M) return 'Which monkey?';
  if (!stormOn()) { say(`@${r.name} the monkeys are only out during a 🏴‍☠️ Pirate Battle.`); return 'Start a Pirate Battle first (🏴‍☠️ Practice battle).'; }
  if (!cards.monkeyOut(M.i, r.name)) { say(`@${r.name} the ${M.name} monkey is already gone this battle.`); return `The ${M.name} monkey is already gone this battle.`; }
  say(`🐒 @${r.name} took out ${M.name}!`); act('battle', `took out the ${M.name} monkey in the Pirate Battle`, { icon: '🐒', who: r.name, kind: 'monkey', test: !!test }); rewardKey = ''; setTimeout(() => syncRewards().catch(() => {}), 300); return null;
}
function stormSend(kind, name) { broadcast({ type: 'cardStorm', kind, name, pick: Math.random(), ship: Math.random() < .5 ? 0 : 1, z: Math.random() }, 'overlay'); }
function stormPowerUp(r, kind) {
  const say = t => { if (twitch.canSay()) twitch.say(t).catch(() => {}); };
  if (!STORM_INFO[kind]) return;
  if (!stormOn()) return say(`@${r.name} the storm powers only work during a 🏴‍☠️ Pirate Battle.`);
  stormSend(kind, r.name); say(`${STORM_INFO[kind].icon} @${r.name} sent ${STORM_INFO[kind].say}!`);
  act('battle', `sent ${STORM_INFO[kind].say} into the Pirate Battle`, { icon: STORM_INFO[kind].icon, who: r.name, kind: 'storm' }); // 🧾
}
async function stormSetup() { // ⛈️ make the storm power rewards on Twitch (switched off until a Pirate Battle plays)
  if (!pointsOn()) return { made: [], skipped: true };
  const st = db.settings, made = [];
  for (const [title, kind] of Object.entries(st.stormRewards || {})) if (await twitch.createReward({ title, cost: st.stormCosts?.[kind] || 750, prompt: STORM_PROMPTS[kind] || '', color: '#3A7BFF', queue: true })) made.push(title);
  for (const [title, who] of Object.entries(st.monkeyRewards || {})) if (await twitch.createReward({ title, cost: st.monkeyCosts?.[who] || 10000, prompt: MONKEY_INFO[who]?.prompt || '', color: '#8A5A2A', queue: true })) made.push(title); // 🐒
  db.stormSetup = { at: Date.now(), made }; save(); rewardKey = ''; await syncRewards(); return { made };
}
function racePowerUp(r, kind) {
  const l = getList(db.activeListId), say = t => { if (twitch.canSay()) twitch.say(t).catch(() => {}); };
  if (!(l?.type === 'chat' && l.fun?.racePowers)) return say(`@${r.name} race power-ups only work during a chat battle with 🏁 race power-ups turned on.`);
  if (!isRaceMap(live.game?.listId === l.id ? live.game.map : currentMap())) return say(`@${r.name} race power-ups only work on race maps.`);
  const e = l.entries.find(x => x.status === 'active' && norm(x.twitch || x.label) === norm(r.login));
  if (!e) return say(`@${r.name} you're not in the race yet: type ${db.settings.joinCommand || '!join'} first!`);
  const running = (live.phase === 'lobby' || live.phase === 'running') && live.game?.listId === l.id;
  if (kind === 'nuke') { if (running && live.game.nuked) return say(`@${r.name} a nuke already went off in this race.`); if (running) live.game.nuked = true; else if (l.entries.some(x => (x.racePend || []).some(p => p.kind === 'nuke'))) return say(`@${r.name} someone already has a nuke waiting for this race.`); }
  if (running) broadcast({ type: 'racePower', id: e.id, kind, name: r.name }, 'overlay');
  else { (e.racePend ||= []).push({ kind, name: r.name }); e.racePend = e.racePend.slice(-5); save(); } // (before the race: it goes off right after the green flag)
  say(`${RACE_INFO[kind]?.icon || '✨'} @${r.name} used ${RACE_INFO[kind]?.say || kind}!${running ? '' : ' (it goes off right after the green flag)'}`);
  act('battle', `used ${RACE_INFO[kind]?.say || kind}${running ? '' : ' (goes off at the green flag)'}`, { icon: RACE_INFO[kind]?.icon || '🏁', who: r.name, kind: 'power', list: l.name }); // 🧾
  if (kind === 'nuke') { rewardKey = ''; syncRewards().catch(() => {}); }
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
  const mineUp = (live.phase === 'lobby' || live.phase === 'running') && !live.game?.cards, toPartner = !mineUp && costream.partnerBattle() && costream.cfg().chaos !== false; // 🤝 chaos goes into your co-streamer's battle right now
  const solidNow = toPartner ? !!costream.status.partner?.state?.solid : !!map?.solid;
  for (const [title, ev] of Object.entries(st.rewards || {})) want[title.toLowerCase()] = !on || wheelUp || (solidNow && GROUND_EVENTS.includes(ev));
  const powersOn = on && !wheelUp && l?.type === 'chat' && !!l.fun?.powerups;
  for (const [title, kind] of Object.entries(st.powerRewards || {})) want[title.toLowerCase()] = !powersOn || !!l?.fun?.powersOff?.[kind]; // (each power-up can be switched off on the Chat battle tab)
  const raceOn = on && !wheelUp && racePowersOn(l); // 🏁 race power-ups: a chat battle on a race map with them ticked
  for (const [title, kind] of Object.entries(st.raceRewards || {})) want[title.toLowerCase()] = !raceOn || (kind === 'nuke' && !!(live.game?.nuked && live.game.listId === l?.id && (live.phase === 'lobby' || live.phase === 'running')));
  const stormNow = on && !wheelUp && stormOn(); // ⛈️ storm powers: only while a Pirate Battle is playing
  for (const title of Object.keys(st.stormRewards || {})) want[title.toLowerCase()] = !stormNow;
  for (const [title, who] of Object.entries(st.monkeyRewards || {})) want[title.toLowerCase()] = !(stormNow && MONKEY_INFO[who] && cards.monkeyIn(MONKEY_INFO[who].i)); // 🐒 (only while that monkey is still in the rowboat)
  const wh = W.wheels.find(w => w.id === W.activeId), P = { respin: true, move: true, up: true, down: true, grow: true, shrink: false, ...(wh?.opts?.points || {}) };
  const onAuto = wheel.isAutoType(W.last?.type) && W.round?.state !== 'ended' && !W.final; // ⚡ landed on an auto spot: no respins (Derek)
  for (const [kind, title] of Object.entries(W.rewards || {})) if (title) want[title.toLowerCase()] = !(inUse && wheelUp && W.pointsOn !== false && P[kind] !== false && !(kind === 'respin' && onAuto));
  if (st.colorReward) want[st.colorReward.toLowerCase()] = !(inUse && st.colorsOn !== false && st.colorMode === 'points' && !wheelUp);
  if (st.raidOn !== false && st.raidTitle) want[st.raidTitle.toLowerCase()] = !(db.live && !stream().raidUsed); // 🚀 while you're live, until someone redeems it
  if (feat('eggs')) want[eggs.opts().buyTitle.toLowerCase()] = false; // 🥚 buy an egg: always in the menu (like the viewer rewards)
  for (const k of Object.keys(VR)) want[vrTitle(k).toLowerCase()] = vrOff(k); // 💧🙆🎩🎉 on in the menu, unless you switched that one off (1.61.0)
  for (const [t, m] of Object.entries(db.rewardModes || {})) { if (m === 'off') want[t] = true; else if (m === 'on' || m === 'once') want[t] = false; else if (m === 'count') want[t] = countLeft(t) <= 0; } // (🔢 countdown: on until it's been used that many times this stream) // 💰 your override (Settings → Rewards & prices) beats the rules
  return want;
}
/* 💎 An edition can have channel points switched off altogether (1.120.0, Birx & Jess: their channel has none): nothing is made, synced or listened to. */
const pointsOn = () => edHas('points');
async function syncRewards(all = null) {
  if (!twitch.status.userId || rewardBusy || !pointsOn()) return;
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
let lastOnAuto = false; setInterval(() => { const W = wheel.W(), on = wheel.isAutoType(W.last?.type) && W.round?.state !== 'ended' && !W.final; if (on !== lastOnAuto) { lastOnAuto = on; syncRewards().catch(() => {}); } }, 1500); // ⚡ the Respin reward hides quickly while the wheel sits on an auto spot
setInterval(() => { rewardKey = ''; }, 5 * 60000); // and double-checks Twitch every few minutes
setTimeout(() => { rewardKey = ''; syncRewards().catch(() => {}); }, 8000);

// ---------- chaos events from channel points / bits ----------
function triggerEvent(event, by, source) {
  if (!EVENTS[event]) return;
  const fx = { id: uid(), event, by, source, at: Date.now() };
  const mine = (live.phase === 'lobby' || live.phase === 'running') && !live.game?.cards;
  const how = source === 'points' ? ' with channel points' : source === 'bits' ? ` with ${by?.bits || ''} bits` : source === 'co' ? " (from your co-streamer's chat)" : '';
  if (!mine && (source === 'points' || source === 'bits') && costream.wantsChaos(event, GROUND_EVENTS) && coSendChaos(fx)) { act('battle', `sent ${EVENTS[event].icon} ${EVENTS[event].name}${how} into your co-streamer's battle`, { icon: '🤝', who: by?.name || '', kind: 'chaos' }); return pushState(); } // 🤝 your battle isn't on, your co-streamer's is: it goes into theirs
  act('battle', `sent ${EVENTS[event].icon} ${EVENTS[event].name}${how}${mine ? '' : ' (saved for the next battle)'}`, { icon: '⚡', who: source === 'panel' ? streamerName() : by?.name || '', kind: 'chaos' }); // 🧾
  if (mine) broadcast({ type: 'effect', effect: fx }, 'overlay');
  else { db.pendingEffects.push(fx); db.pendingEffects = db.pendingEffects.slice(-25); save(); broadcast({ type: 'queued', effect: fx }, 'overlay'); }
  pushState();
}

// ---------- 🤝 co-stream (1.71.0): linked with a friend's Movie Royal (src/costream.js) ----------
const coOn = () => costream.linked() || !!costream.status.pretend;
function coSendChaos(fx) {
  const by = { name: fx.by?.name || 'someone', avatar: /^\/img\?u=/.test(fx.by?.avatar || '') ? fx.by.avatar : null, ...(fx.by?.bits ? { bits: fx.by.bits } : {}) };
  if (!costream.sendChaos({ ...fx, by })) return false; // (not connected right now: it stays with your own battle, like before)
  const e = EVENTS[fx.event], who = costream.partnerName();
  if (twitch.canSay() && !costream.status.pretend) twitch.say(`${e.icon} @${by.name} sent ${e.name} into ${who}'s battle! 🤝`).catch(() => {});
  broadcast({ type: 'toast', text: hEsc(`🤝 ${e.icon} ${by.name} sent ${e.name} into ${who}'s battle`) }, 'control');
  return true;
}
function coChaosIn(m) { // chaos from your co-streamer's chat → your battle
  const e = EVENTS[m.event]; if (!e) return;
  if (costream.cfg().chaos === false) return;
  if (m.source === 'bits' ? db.settings.bitsOn === false : db.settings.pointsOn === false) return;
  const name = String(m.by?.name || 'someone').slice(0, 40), from = String(m.who || costream.partnerName()).slice(0, 40);
  triggerEvent(m.event, { name: `${name} (${from}'s chat)`, avatar: /^\/img\?u=/.test(m.by?.avatar || '') ? m.by.avatar : null, ...(m.by?.bits ? { bits: Number(m.by.bits) || 0 } : {}) }, 'co');
  if (twitch.canSay()) twitch.say(`${e.icon} ${name} from ${from}'s chat sent ${e.name} into the battle! 🤝`).catch(() => {});
}
// 📷 your camera + battle → your partner (OBS Virtual Camera + a hidden VDO.Ninja window), their picture → your OBS
const CO_Q = { low: 1200, normal: 2500, high: 4000 };
const vdoPush = (id, q) => `https://vdo.ninja/?push=${id}&webcam&autostart&videodevice=OBS_Virtual_Camera&audiodevice=0&quality=${q === 'high' ? 0 : 1}&label=${encodeURIComponent(streamerName().slice(0, 30))}`;
const vdoView = (id, q) => `https://vdo.ninja/?view=${id}&noaudio&cleanoutput&bitrate=${CO_Q[q] || CO_Q.normal}`;
const co = { viewerKey: '', battleShown: null, busy: false, failAt: 0, vBusy: false, started: false };
async function coVideo(on) {
  const c = costream.cfg(), D = globalThis.__desktop;
  if (!on || !costream.linked()) {
    D?.coSender?.(null);
    if (co.started) { co.started = false; await obs.coShareStop().catch(() => {}); }
    costream.status.video = { state: 'off', error: null }; costream.nudge(); pushState(); return costream.status.video;
  }
  if (!D?.coSender) { costream.status.video = { state: 'error', error: 'Sending your camera only works in the Movie Royal app.' }; pushState(); return costream.status.video; }
  if (co.vBusy) return costream.status.video; co.vBusy = true;
  costream.status.video = { ...costream.status.video, state: 'starting', error: null }; pushState();
  try {
    const r = await obs.coShare();
    if (r.started) co.started = true;
    D.coSender(vdoPush(costream.streamId(c.room, db.owner?.login || streamerName()), c.quality));
    costream.status.video = { state: 'on', error: null, layout: r.layout, cam: r.cam, game: r.game, at: Date.now(), noCam: !r.cam };
  } catch (e) { costream.status.video = { state: 'error', error: e.message, at: Date.now() }; }
  finally { co.vBusy = false; }
  costream.nudge(); pushState();
  return costream.status.video;
}
async function coViewerSync(force) { // your partner's picture in your OBS (made / fixed when it changes, battle piece shown while their battle runs)
  const c = costream.cfg(), v = costream.status.partner?.state?.video;
  if (!costream.linked() || !v?.id) return;
  const side = costream.status.partner?.state?.camSide || (costream.mySide() === 'left' ? 'right' : 'left'), url = vdoView(v.id, v.q), key = JSON.stringify([url, v.layout, c.scene || '', c.showCam !== false, costream.partnerName(), side]), battleOn = costream.partnerShowing(); // (1.75.0: card battles too, Derek: watch each other's battles)
  if (!force && key === co.viewerKey) {
    if (c.showBattle !== false && battleOn !== co.battleShown) { co.battleShown = battleOn; obs.coBattleShow(c.obs, battleOn).catch(() => { co.battleShown = null; }); }
    return;
  }
  if (co.busy || (!force && Date.now() - co.failAt < 20000)) return; co.busy = true;
  try { c.obs = await obs.coViewer({ url, name: costream.partnerName(), layout: v.layout, scene: c.scene, battleOn, autoBattle: c.showBattle !== false, camOn: c.showCam !== false, camSide: side }, c.obs || {}); co.viewerKey = key; co.battleShown = battleOn; c.obsError = null; save(); }
  catch (e) { co.failAt = Date.now(); c.obsError = e.message; }
  finally { co.busy = false; pushState(); }
}
function coWantVideo() { const c = costream.cfg(); return costream.linked() && c.video !== false; }
setInterval(() => { // keeps the picture going: OBS opened later, the hidden window crashed…
  if (!coWantVideo() || co.vBusy) return;
  const v = costream.status.video, D = globalThis.__desktop;
  if (v.state === 'off' || (v.state === 'error' && Date.now() - (v.at || 0) > 60000) || (v.state === 'on' && D?.coSending && !D.coSending())) coVideo(true).catch(() => {});
}, 10000);
setInterval(() => coViewerSync(false).catch(() => {}), 3000);
costream.setHooks({
  local: () => { const m = live.map || currentMap(), mp = mapById(m); return { name: streamerName(), login: db.owner?.login || '', phase: live.phase, showing: live.phase === 'lobby' || live.phase === 'running' || cards.live.phase === 'fight', cards: !!(live.game?.cards || live.game?.charFight), map: m, mapName: mp?.name || m, solid: !!mp?.solid, chaosIn: db.settings.pointsOn !== false || db.settings.bitsOn !== false }; },
  chaos: coChaosIn,
  changed: () => pushState(),
  partnerChanged: () => { rewardKey = ''; setTimeout(() => syncRewards().catch(() => {}), 200); coViewerSync(false).catch(() => {}); },
  log: m => console.error(m)
});
setTimeout(() => { if (costream.linked()) { costream.connect(); if (coWantVideo()) setTimeout(() => coVideo(true).catch(() => {}), 8000); } }, 3000);

// ---------- 🎟️ Paid battles + 🌐 Viewer website (1.75.0) ----------
let sitePid = uid(); // 🔮 the guess round the viewer website is on (the battle that's waiting / starting)
const pubImg = u => /^https:\/\//.test(String(u || '')) ? String(u) : null;
const paidSay = t => { if (twitch.canSay()) twitch.say(t).catch(() => {}); };
paid.setHooks({ act: (text, x) => act('money', text, { icon: '🎟️', who: x.who, kind: 'paid', test: !!x.test }), say: paidSay, changed: () => { pushState(); maraCount(); }, added: (items, info) => marathon.announce(items, info) });
// 📺 Ad warnings (1.76.0, Derek: "a 1 min warning in chat of incoming ad and when the ad ends… more so I know when ads are
// playing", off by default): Twitch's ad schedule every 15 s while live → chat + a pop-up in Movie Royal a minute before, and when it ends.
const AD_WARN = '📺 Heads up chat: ads start in about 1 minute! Grab a drink, stretch, I\'ll be right here.', AD_END = '✅ Ads are over, welcome back!';
const ad = { warned: 0, endAt: 0, endT: null, on: null };
const adOk = () => !!db.settings.adBot && (twitch.status.scopes || []).includes('channel:read:ads');
function adToast(text) { broadcast({ type: 'toast', text, ms: 15000 }, 'control'); broadcast({ type: 'adAlert', text }, 'control'); }
function adEndAt(t, test) {
  if (ad.endT && Math.abs(ad.endAt - t) < 15000) return; clearTimeout(ad.endT); ad.endAt = t;
  ad.endT = setTimeout(() => { ad.endT = null; ad.on = null; pushState(); paidSay(db.settings.adEndText || AD_END); adToast('✅ The ad break is over: you\'re back on.'); act('stream', 'The ad break ended', { icon: '📺', kind: 'ad', test }); }, Math.max(0, t - Date.now()));
}
async function adTick() {
  if (!adOk() || !db.live) return;
  let sch; try { sch = await twitch.adSchedule(); } catch (e) { return; } if (!sch?.next) return;
  const left = sch.next - Date.now();
  if (left > 0 && left <= 75000 && Math.abs(ad.warned - sch.next) > 30000) {
    ad.warned = sch.next; ad.on = { at: sch.next, secs: sch.secs }; pushState();
    paidSay(db.settings.adWarnText || AD_WARN); adToast(`📺 An ad break (${sch.secs || '?'} s) starts in about ${Math.round(left / 1000)} seconds.`);
    act('stream', `Warned chat: an ad break (${sch.secs} s) starts in about a minute`, { icon: '📺', kind: 'ad' });
    if (sch.secs) adEndAt(sch.next + sch.secs * 1000 + 2000);
  }
}
setInterval(adTick, 15000);
function adBreakIn({ secs, at, auto }) { // (an ad started: also ones you ran yourself, which have no warning)
  if (!db.settings.adBot) return;
  ad.on = { at, secs }; pushState(); adToast(`📺 Ads are playing now (${secs} s${auto ? '' : ', you started them'}).`);
  act('stream', `An ad break started (${secs} s${auto ? ', scheduled' : ''})`, { icon: '📺', kind: 'ad' });
  if (secs) adEndAt(at + secs * 1000 + 2000);
}
app.post('/api/test/ad', (req, res) => { // 🧪 pretend: the warning (then the end 20 s later) — goes to chat like the real thing (pretend chat when not signed in)
  ad.on = { at: Date.now() + 5000, secs: 15 }; pushState();
  paidSay(db.settings.adWarnText || AD_WARN); adToast('📺 (test) An ad break starts in about a minute.');
  adEndAt(Date.now() + 20000, true); res.json({ endsIn: 20 });
});

// 🏃 Marathon battles (1.76.0): the maps chat can pick (A–Z, numbered), the pop-up + "battles owed" counter in OBS (/marathon.html)
function maraSeen() { // 👀 when the people with a battle waiting last chatted (so you can run the battles of people who are here)
  const want = new Set(paid.queue().map(x => marathon.norm(x.login || x.who))), out = {};
  for (const m of live.chatLog) for (const k of [marathon.norm(m.login), marathon.norm(m.name)]) if (want.has(k)) out[k] = Math.max(out[k] || 0, m.at || 0);
  return out;
}
// ⏱️ (1.82.8, Derek: "have a total live time counter on all scenes") every time you go live / offline is kept in db.liveLog
// [{s, e}] (e = null while live). The marathon overlay (in every marathon scene) shows the total live time since the clock
// started (settings.marathon.clock.from; null = this stream only), counting only the time you were live, + any fix you made.
function liveLogMark(on) {
  const L = (db.liveLog ||= []), last = L[L.length - 1], now = Date.now();
  if (on) { if (!last || last.e) L.push({ s: now, e: null }); }
  else if (last && !last.e) last.e = now;
  if (L.length > 2000) L.splice(0, L.length - 2000);
  setTimeout(() => clockSend(true), 0);
}
(function liveLogSeed() { const L = (db.liveLog ||= []), last = L[L.length - 1]; if (db.live && (!last || last.e)) L.push({ s: db.stream?.startedAt || Date.now(), e: null }); else if (!db.live && last && !last.e) last.e = Date.now(); })();
// mode 'auto' (default) = this stream + the ones right before it with less than CLOCK_GAP offline between (restarts for the
// co-stream etc. count as one marathon); 'from' = since you pressed 🏁 Start counting now; 'stream' = this stream only.
const CLOCK_GAP = 6 * 3600000;
const clockCfg = () => ({ on: true, mode: 'auto', from: null, add: 0, corner: 'tr', ...(db.settings.marathon?.clock || {}) });
function clockFrom(now = Date.now()) {
  const c = clockCfg(), L = db.liveLog || [], last = L[L.length - 1];
  if (!last) return now;
  if (c.mode === 'from' && c.from) return c.from;
  if (c.mode === 'stream') return last.s;
  let i = L.length - 1; while (i > 0 && L[i].s - (L[i - 1].e || L[i].s) < CLOCK_GAP) i--;
  return L[i].s;
}
function clockTotal(now = Date.now()) {
  const c = clockCfg(), L = db.liveLog || [], from = clockFrom(now);
  let ms = 0; for (const x of L) { const a = Math.max(x.s, from), b = Math.min(x.e || now, now); if (b > a) ms += b - a; }
  return Math.max(0, ms + (Number(c.add) || 0));
}
const clockMsg = () => { const c = clockCfg(); return { type: 'maraClock', on: paid.dev() && c.on !== false, ms: clockTotal(), live: !!db.live, at: Date.now(), corner: c.corner || 'tr' }; };
const clockState = () => { const c = clockCfg(); return { ...c, ms: clockTotal(), live: !!db.live, text: hms(clockTotal()), since: (db.liveLog || []).length ? clockFrom() : null, gapH: CLOCK_GAP / 3600000 }; };
let clockKey = '';
function clockSend(force) { const m = clockMsg(), k = [m.on, m.live, m.corner, Math.round(m.ms / 30000)].join('|'); if (!force && k === clockKey) return; clockKey = k; broadcast(m, 'mara'); }
setInterval(() => clockSend(), 10000);
const hms = ms => { const t = Math.floor(ms / 1000); return `${Math.floor(t / 3600)}:${String(Math.floor(t / 60) % 60).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`; };
// 🔔 (1.82.6, Derek: "if someone has a battle queued for longer than 30 mins, when they type in chat remind me in chat they have a
// battle queued; easy button on the Marathon tab to turn it on and off") once per person per waitMins.
const maraWaitAt = new Map();
function maraWaitText(name, mine, mins) {
  const me = twitch.status.login || db.owner?.login, oldest = Math.min(...mine.map(x => x.at || Date.now())), age = Math.max(1, Math.round((Date.now() - oldest) / 60000));
  const ageW = age >= 120 ? `${Math.round(age / 6) / 10} hours` : `${age} min`;
  return `🔔 ${me ? '@' + me + ' ' : ''}${name} is here and has ${mine.length === 1 ? 'a battle' : mine.length + ' battles'} waiting (in the line for ${ageW}).`;
}
function maraWaitFor(m) { const k = [marathon.norm(m.login), marathon.norm(m.name)]; return paid.queue().filter(x => k.includes(marathon.norm(x.login || x.who))); }
function maraWaitChat(m, force) {
  const c = marathon.cfg(); if (!force && (!paid.cfg().on || c.waitRemind === false)) return null;
  const mins = Math.max(1, Number(c.waitMins) || 30), mine = maraWaitFor(m); if (!mine.length) return null;
  const oldest = Math.min(...mine.map(x => x.at || Date.now()));
  if (!force && Date.now() - oldest < mins * 60000) return null;
  const k = marathon.norm(m.login || m.name); if (!force && Date.now() - (maraWaitAt.get(k) || 0) < mins * 60000) return null;
  if (!force) maraWaitAt.set(k, Date.now());
  const text = maraWaitText(m.name || m.login, mine, mins);
  if (!force) { paidSay(text); broadcast({ type: 'toast', text: `🔔 ${hEsc(m.name || m.login)} is in chat and has ${mine.length === 1 ? 'a battle' : mine.length + ' battles'} waiting.` }, 'control'); act('battle', `is in chat with ${mine.length === 1 ? 'a battle' : mine.length + ' battles'} waiting (reminder)`, { icon: '🔔', who: m.name || m.login, kind: 'reminder' }); }
  return text;
}
function maraMapList() { // 🏃 (1.81.0, Derek: "no car/ball maps should be on marathon battles") only the character maps (the marathon's own map first)
  return cards.CARD_MAPS.map(m => ({ id: m.id, name: m.name, icon: m.icon, only: !!m.maraOnly })).sort((a, b) => (b.only - a.only) || a.name.localeCompare(b.name));
}
// 🗺️ (1.81.0, Derek: "give me an option to pick a map if I want") the map for battles where nobody picked one: '' = 🎲 random
const maraDefMap = () => { const id = marathon.cfg().defMap || ''; return id && marathon.maps().some(m => m.id === id) ? id : ''; };
const maraRandomMap = () => { const d = maraDefMap(); if (d) return d; const ms = marathon.maps().filter(m => m.id !== db.lastMap); const all = ms.length ? ms : marathon.maps(); return all.length ? all[Math.floor(Math.random() * all.length)].id : 'kungfu'; };
let maraCountKey = '';
function maraCount(force) { const c = marathon.counter(), k = JSON.stringify(c); if (!force && k === maraCountKey) return; maraCountKey = k; broadcast({ type: 'maraCount', ...c }, 'mara'); }
function maraPopMsg(p) {
  const site2 = site.on() ? site.url() : '';
  return { type: 'maraPop', id: uid(), who: p.who, n: p.n, what: p.what, anon: !!p.anon, test: !!p.test, paused: !!db.paidPaused, owed: paid.queue().length, luckPer: marathon.cfg().luckPer, secs: Math.max(10, Math.min(120, Number(marathon.cfg().popSecs) || 40)), site: site2.replace(/^https?:\/\//, ''),
    maps: marathon.maps().map(m => ({ n: m.n, name: m.name, icon: m.icon })), items: marathon.items().map(x => ({ n: x.n, label: x.label, luck: x.luck })) };
}
marathon.setHooks({
  list: () => { const id = paid.cfg().listId; return id ? getList(id) : null; },
  maps: maraMapList, say: paidSay, siteUrl: () => site.on() ? site.url() : '',
  started: (login, name) => { const k = marathon.norm(login || name), it = live.maraGuess?.item || (live.phase !== 'idle' && live.phase !== 'ended' ? live.game?.paid : null); return !!(it && k && (marathon.norm(it.login || '') === k || marathon.norm(it.who || '') === k)); }, // (🍀 their battle is under way: picks are locked in)
  act: (text, x) => x.rest ? act('battle', text, { icon: '😴', kind: 'rest' }) : act(x.luck ? 'luck' : 'money', text, { icon: x.luck ? '🍀' : '🎟️', who: x.who, kind: x.reset ? 'reset' : 'pick' }),
  popup: p => { if (marathon.cfg().popup !== false) broadcast(maraPopMsg(p), 'mara'); maraCount(); },
  changed: () => { pushState(); maraCount(); }
});
setInterval(() => maraCount(), 3000);

const pctOf = (f, tot) => Math.round((f.weight || 1) / (tot || 1) * 1000) / 10;
function siteLive() {
  const st = db.settings, q = paid.queue(), view = wheel.W().show ? 'wheel' : cards.live.show || cards.live.phase === 'fight' ? 'cards' : 'battle';
  let phase = live.phase, fighters = [], list = null, winner = null, game = live.game;
  if ((phase === 'lobby' || phase === 'running' || phase === 'ended') && game && !game.test) { list = getList(game.listId); fighters = game.fighters; }
  else if (phase === 'idle' && lastPreview && lastPreview.kind !== 'cards' && view === 'battle') { list = getList(db.activeListId); fighters = lastPreview.fighters || []; phase = 'ready'; }
  else if (phase !== 'idle' && game?.test) phase = 'idle'; // (practice battles don't show on the website)
  const tot = fighters.reduce((a, x) => a + (x.weight || 1), 0) || 1;
  if (phase === 'ended' && live.lastWinner && !live.lastWinner.test) winner = { id: live.lastWinner.id, label: live.lastWinner.label, sub: live.lastWinner.sub || '', pct: fighters.length ? pctOf(fighters.find(x => x.id === live.lastWinner.id) || {}, tot) : null };
  const pid = phase === 'ready' ? sitePid : game?.pid || null;
  return {
    phase, view, pid, predictOpen: st.sitePredict !== false && !!pid && (phase === 'ready' || phase === 'lobby') && fighters.length >= 2 && list?.type !== 'cards',
    list: list ? (list.screenTitle || list.name) : null, kind: list?.type || null, map: phase === 'idle' ? null : mapLabel(game && phase !== 'ready' ? game.map : currentMap()),
    fighters: [...fighters].sort((a, b) => (b.weight || 1) - (a.weight || 1)).slice(0, 80).map(f => ({ id: f.id, label: f.label, sub: f.sub || '', pct: pctOf(f, tot), luck: Math.round((f.luck || 0) * 10) / 10, image: pubImg(f.image || f.poster), owner: list?.type === 'movies' && !f.spot ? f.owner || '' : '' })),
    n: fighters.length, paid: phase !== 'ready' && game?.paid ? { who: game.paid.who, what: game.paid.what } : null,
    next: phase === 'ready' && q[0] && paid.cfg().listId === db.activeListId ? { who: q[0].who, what: q[0].what } : null,
    queue: q.slice(0, 12).map(x => ({ who: x.who, what: x.what })), waiting: q.length, winner,
    wheel: view === 'wheel' ? { name: wheel.W().name || 'Wheel', last: wheel.W().last?.text || null } : null,
    live: !!db.live, stream: db.stream?.startedAt || null, title: st.siteTitle || ''
  };
}
let siteRowsKey = '', siteRowsCache = [];
function siteRows() { // every real battle in the history (newest 1000): what landed, who paid, ▶ the VOD spot
  const k = historyVersion + ':' + Object.keys(db.vodIds || {}).length; if (k === siteRowsKey) return siteRowsCache;
  siteRowsCache = db.history.filter(h => h.winner && h.listName).map(h => ({
    id: h.id, at: h.at, list: h.listName, kind: h.kind, label: h.winner.label, sub: h.winner.sub || '', owner: h.kind === 'movies' ? h.winner.owner || '' : '', image: pubImg(h.winner.poster || h.winner.image),
    pct: Math.round((h.winner.odds || 0) * 1000) / 10, luck: Math.round((h.winner.luck || 0) * 10) / 10, n: h.entrants || 0, map: h.map ? mapLabel(h.map) : '',
    paid: h.paid ? { who: h.paid.who, what: h.paid.what } : null, vod: site.vodUrl(h.vod, h.started || h.at, sid => twitch.vodFor(sid)), outcome: h.outcome || null
  }));
  siteRowsKey = k; return siteRowsCache;
}
function siteStats() {
  const rows = siteRows(), since = db.stream?.startedAt || 0, tally = (arr, key) => { const m = new Map(); for (const r of arr) { const kk = key(r); if (!kk) continue; const o = m.get(kk) || { n: 0, last: 0 }; o.n++; if (r.at > o.last) { o.last = r.at; o.vod = r.vod; o.label = r.label; o.list = r.list; o.who = r.paid?.who; } m.set(kk, o); } return [...m.entries()].map(([k2, o]) => ({ key: k2, ...o })); };
  const paidRows = rows.filter(r => r.paid), kinds = {}; for (const h of db.history) if (h.paid) kinds[h.paid.kind] = (kinds[h.paid.kind] || 0) + 1;
  return {
    battles: rows.length, today: rows.filter(r => r.at >= since).length, paid: paidRows.length, paidKinds: kinds, waiting: paid.queue().length,
    supporters: tally(paidRows, r => r.paid.who).sort((a, b) => b.n - a.n).slice(0, 20).map(x => ({ who: x.key, n: x.n })),
    tried: tally(rows.filter(r => r.kind !== 'movies' && r.kind !== 'chat'), r => r.list + '\u0001' + r.label).sort((a, b) => b.last - a.last).slice(0, 300).map(x => ({ label: x.label, list: x.list, n: x.n, last: x.last, vod: x.vod || null, who: x.who || null })),
    movies: rows.filter(r => r.kind === 'movies').slice(-15).reverse().map(r => ({ label: r.label, sub: r.sub, owner: r.owner, at: r.at, vod: r.vod })),
    lists: tally(rows, r => r.list).sort((a, b) => b.n - a.n).slice(0, 12).map(x => ({ list: x.key, n: x.n })),
    first: rows[0]?.at || null
  };
}
function siteInfo() {
  return { channel: db.owner?.login || db.settings.twitchChannel || '', name: streamerName(), avatar: pubImg(db.owner?.avatar), clientId: db.settings.twitchClientId || '', title: db.settings.siteTitle || '', command: db.settings.siteCommand || '!site', discord: db.settings.discordServerLink || db.discordInviteAuto || '', predict: db.settings.sitePredict !== false, points: 'Longer odds = more points: 50% → 2, 10% → 10, 2% → 50.', v: VERSION };
}
async function siteProfile(login) { // 👤 what a signed-in viewer sees about themselves (no chat log, nothing private)
  login = String(login || '').toLowerCase(); const n = norm(login), v = (db.viewers || {})[login] || null;
  const discordId = Object.entries(db.links || {}).find(([, l]) => String(l).toLowerCase() === login)?.[0] || null, dp = discordId ? discordPeople().find(p => p.discordId === discordId) : null;
  const rows = siteRows(), mine = db.history.filter(h => h.paid && (h.paid.login === login || norm(h.paid.who) === n)).map(h => rows.find(r => r.id === h.id)).filter(Boolean).reverse();
  const ents = getList('movies')?.entries || [], bank = Object.values(wheel.W().bank || {}).find(b => b.login === login || norm(b.name) === n);
  return {
    name: v?.name || dp?.name || login, streak: v ? chatlog.watchStreak(v) : 0, streams: (v?.watched || []).length, watchHours: Math.round(((v?.watchMins || 0) + (v?.watchOld || 0)) / 6) / 10,
    paid: mine.slice(0, 50).map(r => ({ at: r.at, label: r.label, list: r.list, what: r.paid?.what, vod: r.vod })), paidN: mine.length,
    waiting: paid.queue().filter(x => x.login === login || norm(x.who) === n).length,
    movies: dp ? dp.active.map(m => { const e = ents.find(x => x.id === m.id), L = e ? movieLuck(e) : { total: 0 }; return { label: m.label, sub: m.sub || '', luck: L.total }; }) : null,
    wins: db.history.filter(h => h.winner?.owner && (norm(h.winner.owner) === n || (dp && norm(h.winner.owner) === norm(dp.name)))).slice(-15).reverse().map(h => ({ at: h.at, label: h.winner.label, list: h.listName })),
    spins: bank?.spins || 0, id: db.settings.idOn !== false ? (db.ids?.[login] || null) : null, linked: !!dp
  };
}
function siteMara() { // 🏃 what the website needs to pick a map / give 🍀 luck (1.76.0)
  const l = marathon.list(); if (!l || !paid.cfg().on) return null;
  const tk = new Map(); for (const t of marathon.tokens()) { if (t.test) continue; const k = marathon.norm(t.login || t.who); const o = tk.get(k) || { who: t.who, login: t.login || null, n: 0 }; o.n++; tk.set(k, o); }
  return {
    list: l.screenTitle || l.name, luckPer: marathon.cfg().luckPer, owed: paid.queue().length,
    maps: marathon.maps().map(m => ({ ...m, img: site.img(path.join(ROOT, 'public', 'maps', m.id + '.jpg')) })),
    items: marathon.items().map(x => ({ n: x.n, id: x.id, label: x.label, sub: x.sub, luck: x.luck, wins: x.wins, img: pubImg(x.image) || (/^\/uploads\//.test(x.image || '') ? site.img(path.join(UPLOADS, path.basename(x.image))) : null) })),
    queue: paid.queue().slice(0, 300).map(x => ({ id: x.id, who: x.who, login: x.login, what: x.what, map: x.map || null, luck: x.luck || null, mapVia: x.mapVia || null, luckVia: x.luckVia || null })),
    tokens: [...tk.values()]
  };
}
site.setHooks({
  mara: siteMara, pick: m => marathon.pick({ login: m.login, name: m.name, qid: m.qid, map: m.map, luck: m.luck, via: 'site' }),
  info: siteInfo, live: siteLive, stats: siteStats, rows: siteRows, profile: login => siteProfile(login).catch(() => null), changed: () => pushState(),
  predDone: m => { if (m.total && db.settings.sitePredSay !== false) paidSay(`🔮 ${m.nRight} of ${m.total} on the website called it: ${m.winner}${m.nRight ? ` (+${m.pts} pts${m.nRight <= 3 ? ': ' + m.right.join(', ') : ''})` : ''}. Guess the next one: ${db.settings.siteCommand || '!site'}`); if (m.total) act('chat', `${m.nRight} of ${m.total} called “${m.winner}” on the viewer website (+${m.pts} points each)`, { icon: '🔮', kind: 'guess' }); },
  pollResult: m => { const tot = m.counts.reduce((a, b) => a + b, 0), top = Math.max(...m.counts), wins = m.opts.filter((_, i) => m.counts[i] === top && top > 0); if (db.sitePoll?.id === m.id) { db.sitePoll.ended = Date.now(); db.sitePoll.counts = m.counts; save(); } paidSay(tot ? `🗳️ “${m.q}”: ${wins.join(' & ')} ${wins.length > 1 ? 'tie' : 'wins'} (${top} of ${tot} votes)` : `🗳️ “${m.q}”: nobody voted`); act('chat', `Poll “${m.q}”: ${m.opts.map((o, i) => `${o} ${m.counts[i]}`).join(' · ')}`, { icon: '🗳️', kind: 'poll' }); broadcast({ type: 'toast', text: `🗳️ Poll over: ${tot ? hEsc(wins.join(' & ')) + ` (${top} of ${tot} votes)` : 'nobody voted'}` }, 'control'); }
});
async function siteStreamCheck() { if (!twitch.status.userId) return; try { const s2 = await twitch.streamInfo(); site.setStream(s2); if (s2) vodBackfill(s2); } catch {} }
// ▶ (1.82.8) battles that started before Twitch knew about a restarted stream get their VOD spot now (same live part only)
function vodBackfill(s2) {
  const seg = liveSegStart(); if (!seg || !(s2.startedAt >= seg - 3 * 60000)) return;
  let n = 0;
  for (const h of (db.history || []).slice(-300)) if (!h.vod && !h.test && (h.started || h.at) >= Math.max(seg, s2.startedAt - 60000)) { h.vod = { sid: String(s2.id), st: s2.startedAt }; n++; }
  if (n) { historyVersion++; save(); }
}
// ▶ (1.82.8, Derek deletes the co-stream part's VOD) a VOD that's gone from Twitch stops getting links: recent ones are re-checked
async function vodRecheck() {
  if (!twitch.status.userId || !db.vodIds) return;
  const week = Date.now() - 7 * 86400000, recent = new Set((db.history || []).filter(h => h.vod?.sid && (h.started || h.at) > week).map(h => h.vod.sid));
  let changed = false;
  for (const sid of recent) { if (!db.vodIds[sid]) continue; try { const id = await twitch.vodFor(sid); if (!id) { db.vodIds[sid] = 0; changed = true; act('stream', '▶ A VOD is gone from Twitch, so the website stops linking to it', { icon: '▶', kind: 'vod' }); } else if (id !== db.vodIds[sid]) { db.vodIds[sid] = id; changed = true; } } catch {} }
  if (changed) { historyVersion++; save(); }
}
setInterval(vodRecheck, 30 * 60000); setTimeout(vodRecheck, 90000);
const liveSegStart = () => { const L = db.liveLog || [], last = L[L.length - 1]; return db.live && last && !last.e ? last.s : null; };
setInterval(siteStreamCheck, 5 * 60000); setTimeout(siteStreamCheck, 20000);
let siteCd = 0;
function siteChat(m) { // !site → the link
  const cmd = String(db.settings.siteCommand || '!site').trim().toLowerCase(); if (!cmd || !site.on()) return;
  if (m.text.toLowerCase().split(/\s+/)[0] !== cmd || Date.now() - siteCd < 30000 || !twitch.canSay()) return; siteCd = Date.now();
  twitch.say(`🌐 ${site.url()} : watch, every battle with who paid + a link to that moment in the VOD, stats, and guess the winner for points (sign in with Twitch)`).catch(() => {});
}
setTimeout(() => site.connect(), 6000);

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
// 🔞 nudity heads-up on the winner card (control panel only: never on stream or in chat), with about when each scene is
async function fetchWinnerNudity(f, rec) {
  if (db.settings.nudityCheck === false) return;
  if (live.lastWinner?.id === f.id) { live.lastWinner.nudity = { checking: true }; pushState(); }
  let r;
  try { r = await checkNudity({ tmdbId: f.tmdbId, imdbId: f.details?.imdbId, runtime: f.details?.runtime }); }
  catch (e) { r = { unknown: true, error: e.message }; }
  rec.winner.nudity = r; save(); historyVersion++;
  if (live.lastWinner?.id === f.id) { live.lastWinner.nudity = r; pushState(); }
  nudeToStream(f, r);
}
// 📺 the winner pop-up on stream gets a red "has nudity" line (1.66.1, Derek: fine on the pop-up, NOT typed in chat; 1.66.2: no times there)
const nudeSlim = n => n?.has ? { has: true } : null; // (1.66.2, Derek: on stream just say there's nudity, no times)
function nudeToStream(f, n) { if (db.settings.nudityCheck === false || db.settings.nudityStream === false) return; broadcast({ type: 'nudity', id: f.id, nudity: nudeSlim(n) }, 'overlay'); }
function fakeNudity(runtime = 112) { // 🧪 a pretend Parents Guide page → the same reader + rules the real check uses
  const items = ['In the opening scene a man runs out of a lake naked; his bare buttocks are seen from behind.', 'A woman is shown topless in a shower scene at 1:12:30, for a few seconds.', 'A couple has sex under the sheets, no nudity is shown.', 'There is no frontal nudity.', 'Near the end, a woman takes off her top and her breasts are briefly seen.', 'Around 47 minutes in, people skinny dip in a pool at night (from a distance).', 'A painting of a nude woman hangs on a wall.'];
  const html = `<script id="__NEXT_DATA__" type="application/json">${JSON.stringify({ props: { pageProps: { categories: [{ category: { id: 'NUDITY', text: 'Sex & Nudity' }, severity: { text: 'Moderate' }, guideItems: { edges: items.map(t => ({ node: { text: { plaidHtml: t } } })) } }] } } })}</script>`;
  return { ...nudeJudge({ guide: nudeParse(html), tags: ['female nudity'], runtime }), at: Date.now(), test: true };
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
    parts.push(`${st.sitOutCommand || '!sitout'} (too late? your movies skip tonight's battles) · ${st.backCommand || '!imback'}`, `${st.skipCommand || '!skip'} <movie> (that movie sits out the next battle)`);
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
function sitOutPerson(p, out) { // 🛌 out = their movies skip tonight's battles · back in
  let n = 0;
  for (const e of getList('movies')?.entries || []) {
    if (e.kind === 'spot' || e.backers?.[0]?.discordId !== p.discordId) continue;
    if (out && e.status === 'active') { e.status = 'away'; e.awayDay = stream().day; e.satOut = true; n++; }
    if (!out && e.status === 'away') { e.status = 'active'; delete e.awayDay; delete e.satOut; n++; }
  }
  if (!out) { const st = stream(); if (!st.active.includes(p.discordId)) st.active.push(p.discordId); }
  act('chat', out ? `is sitting out tonight (${n === 1 ? '1 movie' : n + ' movies'} off the cliff)` : `is back in (${n === 1 ? '1 movie' : n + ' movies'})`, { icon: out ? '🛌' : '🙋', who: p.name, kind: 'sitout' }); // 🧾
  save(); pushState(); refreshPreview();
  broadcast({ type: 'toast', text: out ? `🛌 ${hEsc(p.name)} sat out tonight (${n} movie${n === 1 ? '' : 's'} off the cliff)` : `🙋 ${hEsc(p.name)} is back in (${n} movie${n === 1 ? '' : 's'})` }, 'control');
  return n;
}
const backCmd = () => db.settings.backCommand || '!imback';
const sitOutBye = name => `@${name} 🛌 your movies sit out the rest of tonight's battles. Want back in? Type ${backCmd()} any time tonight and they jump right back in!`;
function sitOutChat(m) {
  const first = m.text.toLowerCase().split(/\s+/)[0], out = String(db.settings.sitOutCommand || '!sitout').toLowerCase(), back = String(backCmd()).toLowerCase();
  if (first !== out && first !== back) return;
  const p = discordPeople().find(x => chatMatches({ ...x, login: x.twitch || null }, m)); if (!p) { if (twitch.canSay()) twitch.say(`@${m.name} I don't see any movies for you yet.`).catch(() => {}); return; }
  if (live.passAsk?.login === m.login) live.passAsk = null;
  sitOutPerson(p, first === out);
  if (twitch.canSay()) twitch.say(first === out ? sitOutBye(m.name) : `@${m.name} 🙋 your movies are back in the battle!`).catch(() => {});
}
// ⏭️ after a pass: the bot asks if they want to sit out the rest of tonight (yes = all their movies sit out)
function passAskAnswer(m) {
  const a = live.passAsk; if (!a || a.login !== m.login) return false;
  if (Date.now() > a.until) { live.passAsk = null; return false; }
  const t = String(m.text || '').trim().toLowerCase().replace(/[!.]/g, '');
  const yes = /^(yes|yep|yeah|y|sure|ok|okay|sit out|sitout|yes please)$/.test(t), no = /^(no|nope|n|nah|no thanks|stay|stay in)$/.test(t);
  if (!yes && !no) return false;
  live.passAsk = null;
  if (no) { if (twitch.canSay()) twitch.say(`@${m.name} 👍 Your other movies stay in tonight's battles.`).catch(() => {}); return true; }
  if (a.test) { if (twitch.canSay()) twitch.say(`${sitOutBye(m.name)} (🧪 test: nothing changed)`).catch(() => {}); return true; }
  const p = discordPeople().find(x => x.discordId === a.discordId) || discordPeople().find(x => chatMatches({ ...x, login: x.twitch || null }, m));
  if (p) sitOutPerson(p, true);
  if (twitch.canSay()) twitch.say(sitOutBye(m.name)).catch(() => {});
  return true;
}
function askSitOut(w, name) { // after a pass: offer to sit out the rest of tonight
  const b = w?.backers?.[0], login = (w?.ownerLogin || (b && db.links?.[b.discordId]) || w?.owner || '').toLowerCase().replace(/^@/, '');
  if (!login || w.spot || !twitch.canSay()) return;
  live.passAsk = { login, name: name || w.owner || login, discordId: b?.discordId || null, until: Date.now() + 3 * 60000, test: !!w.test };
  twitch.say(`@${live.passAsk.name} Want to sit out the rest of tonight too? Type yes and all your movies take a break till next stream (or no to stay in). Changed your mind later? ${backCmd()} brings them back.`).catch(() => {});
}
// ⏭️ !skip: one of your movies sits out the NEXT battle only (Derek)
const skipCmd = () => db.settings.skipCommand || '!skip';
function skipChat(m) {
  const parts = m.text.trim().split(/\s+/); if (parts[0].toLowerCase() !== skipCmd().toLowerCase()) return false;
  const p = discordPeople().find(x => chatMatches({ ...x, login: x.twitch || null }, m)), say = t => { if (twitch.canSay()) twitch.say(`@${m.name} ${t}`).catch(() => {}); };
  if (!p) { say("I don't see any movies for you yet."); return true; }
  const mine = (getList('movies')?.entries || []).filter(e => e.kind !== 'spot' && e.status === 'active' && e.backers?.[0]?.discordId === p.discordId);
  if (!mine.length) { say(`none of your movies are in tonight's battles right now (${backCmd()} if they're sitting out).`); return true; }
  const arg = parts.slice(1).join(' ').trim(), num = /^\d+$/.test(arg) ? Number(arg) : 0;
  let e = num ? mine[num - 1] : arg ? (mine.find(x => norm(x.label) === norm(arg)) || mine.find(x => norm(x.label).startsWith(norm(arg))) || mine.find(x => norm(x.label).includes(norm(arg)))) : mine.length === 1 ? mine[0] : null;
  if (!e) { say(`which one? ${mine.map((x, i) => `${skipCmd()} ${i + 1} = ${x.label}${x.sub ? ` (${x.sub})` : ''}`).join(' · ')}`); return true; }
  const lbl = `${e.label}${e.sub ? ` (${e.sub})` : ''}`, n = mine.indexOf(e) + 1;
  if (e.skipNext) { delete e.skipNext; say(`🙋 ${lbl} is back in the next battle.`); }
  else { e.skipNext = true; say(`⏭️ ${lbl} sits out the next battle, then it's back in. (Changed your mind? ${skipCmd()} ${n} again.)`); }
  act('chat', e.skipNext ? `skips the next battle with “${lbl}” (${skipCmd()})` : `put “${lbl}” back in the next battle`, { icon: e.skipNext ? '⏭️' : '🙋', who: p.name, kind: 'skip' }); // 🧾
  save(); pushState(); if (live.phase === 'idle' || live.phase === 'ended') refreshPreview();
  broadcast({ type: 'toast', text: e.skipNext ? `⏭️ ${hEsc(p.name)}: ${hEsc(lbl)} sits out the next battle` : `🙋 ${hEsc(p.name)}: ${hEsc(lbl)} is back in the next battle` }, 'control');
  return true;
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
// 🧾 subs, gift subs, bits, tips, raids, follows and watch streaks go in the complete history (redeems: the redeem handler does those)
function alertLine(a) { // → [kind of thing, words, extra] (null = not one for the history)
  const k = a?.kind; if (!k || k === 'redeem' || k === 'announce') return null;
  const icon = { sub: '⭐', gift: '🎁', bits: '💎', tip: '💵', raid: '🚀', follow: '💙', streak: '🔥' }[k] || '🔔';
  const text = k === 'tip' && a.amount != null && !/^donated/.test(a.text || '') ? `donated ${a.currency && a.currency !== 'USD' ? `${a.amount} ${a.currency}` : '$' + a.amount}${a.text ? `: “${String(a.text).slice(0, 120)}”` : ''}` : String(a.text || k);
  return [['sub', 'gift', 'bits', 'tip'].includes(k) ? 'money' : 'chat', text, { icon, who: a.name || '', kind: k }];
}
function alertAct(a) { const L = alertLine(a); if (L) act(L[0], L[1], L[2]); }
// 🧾 once (1.72.0): the complete history starts with what Movie Royal already kept: wheel spins, battle wins, card pack wins, free spins, alerts
function activityBackfill() {
  if (db.activityFilled) return;
  const rows = [], C = { true: ' · ✅ claimed', instant: ' · ⚡ claimed right away', false: ' · ⏰ nobody claimed it', passed: ' · ⏭️ passed' };
  try { rows.push(...wheel.oldLines()); } catch (e) { console.error('[history] older wheel history:', e.message); }
  for (const h of db.history || []) { try { const w = h.winner || {};
    rows.push({ at: h.at, cat: 'battle', icon: '🏆', kind: 'win', list: h.listName, text: `“${w.label}${w.sub ? ` (${w.sub})` : ''}” won “${h.listName || 'a battle'}”${w.owner && w.owner !== w.label ? ` (${w.owner})` : ''}${h.entrants ? ` out of ${h.entrants}` : ''}${w.odds ? ` · had a ${Math.round(w.odds * 1000) / 10}% chance` : ''}${w.luck ? ` with ${pctW(w.luck)} luck` : ''}${C[String(h.claimed)] || ''}${h.outcome === 'put back' ? ' · ↩️ put back' : h.outcome === 'out' ? ' · 🚪 taken out' : ''}`, items: [...(h.top || []).map((t, i) => `${i + 1}. ${t.label}`), ...(h.events || []).map(e => `⚡ ${EVENTS[e.event]?.name || e.event}${e.by ? ` by ${e.by}` : ''}`)] }); } catch {} }
  for (const h of db.cards?.history || []) rows.push({ at: h.at, cat: 'cards', icon: '🏆', kind: 'win', list: h.battle, text: `“${h.name}”${h.game ? ` (${h.game})` : ''} won the card battle “${h.battle || ''}”${h.fighters ? ` out of ${h.fighters}` : ''}${h.kept ? ' · 📌 kept in your Card pool' : h.leftAfter != null ? ` · ${h.leftAfter} left after` : ''}` });
  for (const a of db.alerts || []) { const L = alertLine(a); if (L) rows.push({ at: a.at, cat: L[0], text: L[1], ...L[2] }); }
  const n = activity.importOld(rows);
  db.activityFilled = { at: Date.now(), n }; save(); broadcast({ type: 'activityFilled' }, 'control');
  console.log(`[history] the complete history starts with ${n} lines from the older history lists`);
}
/** 🎭 an extra made for an edition (or everything, in the dev edition with dev mode on) */
const feat = name => edFeat(name, db.settings.betaUpdates);
edSetDevMode(() => !!db.settings.betaUpdates); /* 🛠️ the dev edition with dev mode on has every part (edition.js) */
/* 🔴 (1.142.0, Derek: "turn on off features to ed live") Live edition switches: what you tick on the server app's Editions tab reaches installed apps without a new version. The app reads src/editions.json from the public GitHub at start and every 5 minutes, applies the off / on lists (edition.js setLive) and keeps the last answer for starting without internet. */
const ED_RAW = process.env.EDITIONS_URL || `https://raw.githubusercontent.com/${editionInfo().all.find(x => x.id === 'public')?.repo || 'TimePeace49/movie-royale-releases'}/main/src/editions.json`;
const edLive = { at: 0, error: '', changedAt: 0 };
try { if (db.editionLive?.ver === PKG.version && db.editionLive.lists) edSetLive(db.editionLive.lists); } catch {} /* (the last list this version heard; a new version starts from its own) */
/* (Derek: "this live update shouldn't stop any battles, songs playing, wheels") a switch change never lands in the middle of something: while a battle / card fight / join timer / wheel round / song is going, the new set WAITS and is applied once things are quiet (checked every 15 s). */
function edBusy() { const why = [];
  try { if (['lobby', 'running'].includes(live.phase)) why.push('a battle'); } catch {} try { if (live.fight) why.push('a card battle'); } catch {} try { if (live.gather) why.push('a join timer'); } catch {} try { if (live.claim) why.push('a winner claiming'); } catch {}
  try { const st = wheel.W(); if (st.round?.state === 'running' || wheel.busyNow()) why.push('the wheel'); } catch {} try { if (keepers.music || live.sp?.src) why.push('a song'); } catch {} try { if (movienight.data().open) why.push('movie night voting'); } catch {}
  return why; }
let edPending = null, edPendT = null;
function edApply(j, why) { const before = edOffNow().length + '|' + JSON.stringify(editionInfo().hide), changed = edSetLive(j); db.editionLive = { ver: PKG.version, at: Date.now(), lists: edLists() }; saveNow();
  if (changed) { edLive.changedAt = Date.now(); const mine = before !== edOffNow().length + '|' + JSON.stringify(editionInfo().hide);
    try { editionNoMovies(); } catch {} try { syncRewards(); } catch {} try { pushState(); } catch {}
    if (mine) { try { broadcast({ type: 'toast', text: '🎭 This edition just got its switches changed: some parts were turned on or off.' }, 'control'); } catch {} try { act('stream', 'The edition switches changed (Editions tab): parts turned on or off', { icon: '🎭', kind: 'editionLive' }); } catch {} } }
  return changed; }
function edWait() { clearTimeout(edPendT); if (!edPending) return; const busy = edBusy(); if (busy.length) { edLive.waiting = busy; edPendT = setTimeout(edWait, 15000); return; } const j = edPending; edPending = null; edLive.waiting = null; edApply(j, 'waited'); }
async function editionLive(why = 'timer') {
  try { const r = await fetch(ED_RAW + (ED_RAW.includes('?') ? '&' : '?') + 't=' + Date.now(), { signal: AbortSignal.timeout(10000) }); if (!r.ok) throw new Error('GitHub answered ' + r.status); const j = await r.json(); if (!j || typeof j !== 'object' || !j.public) throw new Error("that didn't look like the edition list");
    edLive.at = Date.now(); edLive.error = '';
    const differs = JSON.stringify(Object.fromEntries(Object.entries(edLists()).map(([k, v]) => [k, [v.off, v.on]]))) !== JSON.stringify(Object.fromEntries(Object.keys(edLists()).map(k => [k, [Array.isArray(j[k]?.off) ? j[k].off : edLists()[k].off, Array.isArray(j[k]?.on) ? j[k].on : edLists()[k].on]])));
    const busy = differs ? edBusy() : []; let changed = false;
    if (differs && busy.length) { edPending = j; edLive.waiting = busy; clearTimeout(edPendT); edPendT = setTimeout(edWait, 15000); return { ok: true, changed: false, waiting: busy, why }; }
    edPending = null; edLive.waiting = null; changed = edApply(j, why);
    return { ok: true, changed, why };
  } catch (e) { edLive.error = e.message || String(e); return { ok: false, error: edLive.error, why }; }
}
setTimeout(() => editionLive('start').catch(() => {}), 8000); setInterval(() => editionLive('timer').catch(() => {}), 5 * 60000).unref?.();
const twitchHandlers = {
  adBreak: x => adBreakIn(x), // 📺 ad warnings
  change: pushState,
  live(isLive, from) {
    if (kick.on() !== (from === 'kick')) return; // 🟢 the platform switch: only the platform you picked says when you're live
    if (isLive && from === 'kick' && db.settings.obsOn !== false) obs.replayReady(true).catch(() => {}); /* 🎬 Kick clips come from OBS's Replay Buffer: have it running */
    if (!!db.live === !!isLive) return;
    if (!isLive && db.live) announceOff(); // 📣 the stream ended: hourly chat messages stop
    act('stream', isLive ? 'You went live 🔴' : 'The stream ended ⚫', { icon: isLive ? '🔴' : '⚫', kind: isLive ? 'live' : 'offline' }); // 🧾
    liveLogMark(!!isLive); // ⏱️ the marathon's total live time
    if (isLive) { for (const ms of [5000, 30000, 90000, 180000]) setTimeout(siteStreamCheck, ms); } else site.setStream(null); // ▶ a restarted stream = a new VOD: find its id right away
    const st0 = db.stream, back = isLive && st0 && st0.startedAt && !nightOver(st0); // 🌙 back within an hour = the same night
    if (!isLive && st0) { st0.offAt = Math.max(st0.liveSeen || 0, Date.now() - 5 * 60000); } // (an app that was closed while live: counts from when we last saw you live)
    db.live = !!isLive; rewardKey = ''; setTimeout(() => syncRewards().catch(() => {}), 500);
    if (back) { delete st0.offAt; st0.liveSeen = Date.now(); act('stream', `Back live within an hour: still the same stream night (movie #${(st0.movies || 0) + 1} is next)`, { icon: '🌙', kind: 'live' }); }
    else if (isLive) { stream().movies = 0; stream().tonight = []; delete stream().spotPending; stream().raidUsed = false; live.raid = null; stream().startedAt = Date.now(); stream().liveSeen = Date.now(); movienight.streamStart(); wheel.newStream(); } // new stream: movie count starts over
    cloud.sync(true); // lock / unlock swaps on the 24/7 bot right away
    if (lockMode() === 'live' && !db.picksClosed && db.settings.announcePicks !== false) discord.notify(isLive ? '🔒 **Movie picks are closed** while the stream is live. They open again when it ends.' : '🍿 **Movie picks are open again!** Use `/suggest` to add yours.').catch(() => {});
    save(); pushState();
    if (lockMode() === 'live') broadcast({ type: 'toast', text: isLive ? '🔴 You went live — Discord picks and swaps are now locked.' : '⚫ Stream ended — Discord picks and swaps are open again.' }, 'control');
    discord.refreshPinned?.();
  },
  async redeem(r) {
    if (!pointsOn()) return;
    const mode = (db.rewardModes || {})[String(r.title || '').toLowerCase()];
    act('points', `redeemed “${r.title}”${r.cost ? ` (${Number(r.cost).toLocaleString('en-US')} points)` : ''}${r.input ? `: “${String(r.input).slice(0, 120)}”` : ''}${mode === 'off' ? ' · it\'s switched off in Movie Royal, so nothing happened' : ''}`, { icon: '💜', who: r.name, kind: 'redeem' }); // 🧾 (every redeem, ours or not)
    if (mode === 'off') return; // ⏸ paused by you (it's hidden on Twitch too)
    if (mode === 'once') { db.rewardModes[r.title.toLowerCase()] = 'off'; save(); rewardKey = ''; setTimeout(() => syncRewards().catch(() => {}), 300); pushState(); } // used once: off until you turn it on again
    if (mode === 'count') { const t = r.title.toLowerCase(); if (countLeft(t) <= 0) return; const st = stream(); (st.rewardUses ||= {})[t] = (st.rewardUses[t] || 0) + 1; save(); if (countLeft(t) <= 0) { rewardKey = ''; setTimeout(() => syncRewards().catch(() => {}), 300); } pushState(); } // 🔢 one less this stream (none left = off until the next stream)
    return this.redeemNow(r);
  },
  async redeemNow(r) {
    if (db.settings.raidOn !== false && db.settings.raidTitle && r.title.toLowerCase() === db.settings.raidTitle.toLowerCase()) return raidRedeem(r); // 🚀
    { const k = vrKind(r.title); if (k) return vrRedeem(k, r); } // 💧🙆🎩🎉 viewer rewards
    if (feat('eggs') && r.title.toLowerCase() === eggs.opts().buyTitle.toLowerCase()) return void eggs.buy({ login: r.login, name: r.name }, { test: !!r.test }); // 🥚 buy an egg
    if (wheel.wheelRedeem(r)) return; // 🎡 wheel respin / move up / move down
    if (db.settings.colorReward && r.title.toLowerCase() === db.settings.colorReward.toLowerCase()) { if (db.settings.colorMode === 'points') setColor(r.login, r.input); return; }
    if (db.settings.pointsOn === false) return; // channel point chaos switched off
    const pw = Object.entries(db.settings.powerRewards || {}).find(([t]) => t.toLowerCase() === r.title.toLowerCase());
    if (pw) return powerUp(r, pw[1]); // 🎉 chat battle power-up for their own ball
    const rp = Object.entries(db.settings.raceRewards || {}).find(([t]) => t.toLowerCase() === r.title.toLowerCase());
    if (rp) return racePowerUp(r, rp[1]); // 🏁 race power-up
    const sp = Object.entries(db.settings.stormRewards || {}).find(([t]) => t.toLowerCase() === r.title.toLowerCase());
    if (sp) return stormPowerUp(r, sp[1]); // ⛈️ Pirate Battle storm power
    const mr = Object.entries(db.settings.monkeyRewards || {}).find(([t]) => t.toLowerCase() === r.title.toLowerCase());
    if (mr) return void monkeyRedeem(r, mr[1]); // 🐒 take out Time / Kirb
    const entry = Object.entries(db.settings.rewards).find(([t]) => t.toLowerCase() === r.title.toLowerCase());
    if (!entry) return;
    triggerEvent(entry[1], { name: r.name, avatar: await avatarFor(r.login) }, 'points');
  },
  sub(sb) { try { paid.onSub(sb); } catch (e) { console.error('[paid battles]', e.message); } if (db.moneyPaused?.wheelSubs) return; try { wheel.onSub(sb); } catch (e) { console.error('[wheel sub]', e.message); } },
  async cheer(c) {
    try { paid.onBits(c); } catch (e) { console.error('[paid battles]', e.message); }
    if (!db.moneyPaused?.wheelBits) { try { wheel.onBits(c); } catch (e) { console.error('[wheel bits]', e.message); } }
    if (db.settings.bitsOn === false) return; // bits chaos switched off
    const tiers = Object.entries(db.settings.bits).map(([b, e]) => [Number(b), e]).filter(([b]) => c.bits >= b && !db.moneyPaused?.bits?.[b]).sort((a, b) => b[0] - a[0]); // (⏸ paused amounts skipped)
    if (!tiers.length) return;
    triggerEvent(tiers[0][1], { name: c.name, avatar: await avatarFor(c.login), bits: c.bits }, 'bits');
  },
  alert(a) { try { chatlog.onAlert(a); } catch (e) { console.error('[alert]', e.message); } alertAct(a); try { eggs.onAlert(a); } catch (e) { console.error('[eggs]', e.message); } try { movienight.onAlert(a); } catch (e) { console.error('[movie night]', e.message); } try { scareFor(a); } catch (e) { console.error('[scare pop-up]', e.message); } },
  clear(c) { try { chatlog.onClear(c); } catch {} try { chatvoice.clear(c); } catch {} },
  raidOut(t) { try { raids.note(t); } catch (e) { console.error('[raid tab]', e.message); } }, // 🚀 you raided someone (Twitch says so, also for /raid typed by hand)
  async chat(m) {
    if (m.self) return; // 🤖 Movie Royal's own chat bot talking: not a viewer
    if (!m.pretend && !kick.both() && kick.on() !== !!m.kick) return; // 🟢 the platform switch: only chat from the platform you picked counts (💜🟢 both: everyone counts)
    if (!m.kick && spamCheck(m)) return; // 🛡️ a spam bot selling viewers / followers / art: banned, nothing else looks at it
    try { chatlog.onChat(m); } catch (e) { console.error('[chatlog]', e.message); }
    const newFace = !live.chatLog.some(x => x.login === m.login && Date.now() - x.at < 5 * 60000);
    live.chatLog.push({ ...m, at: Date.now() }); live.chatLog = live.chatLog.slice(-300);
    if (!m.force && chatCmdOff(m)) { if (m.pretend) { const w = String(m.text || '').trim().split(/\s+/)[0]; for (const f of twitch.sayListeners) { try { f(`🎭 (test note) ${w} is switched off in this edition, so nothing answers it. It's a tick box on the server app's Editions tab.`); } catch {} } } return; } // 🎭 a chat command this edition doesn't have: nothing answers it
    try { if (await appcmds.blocked(m)) return; } catch (e) { console.error('[app commands]', e.message); } // 🧩 the app's own commands: off / who / where / waits (Chat bot → Commands)
    try { pstats.chat(m); } catch (e) { console.error('[stats]', e.message); } // 📊 which commands each person uses
    try { movienight.noteChat(m); } catch (e) { console.error('[movie night]', e.message); } // 🍿 the first one in chat gets two movie night votes
    try { maraWaitChat(m); } catch (e) { console.error('[marathon reminder]', e.message); } // 🔔 someone with a battle waiting 30+ min is here
    try { chatvoice.chat(m); } catch (e) { console.error('[chat voice]', e.message); } // 🔈 read chat out loud to you only (not cheers / channel point messages)
    if (raidChat(m)) return; // 🚀 the raid picker typing who to raid
    if (idChat(m)) return; // 🧍 !id man / woman / none / remove
    if (hatChat(m)) return; // 🎩 picking a hat
    wheel.wheelChat(m); // 🎡 !respin / !spins
    if (passAskAnswer(m)) return; // ⏭️ yes / no: sit out the rest of tonight after a pass
    try { if (birthdays.onChat(m)) return; } catch (e) { console.error('[birthdays]', e.message); } // 🎂 !bday 3/14, and a happy birthday the first time they chat that day
    if (movienight.onChat(m)) return; // 🍿 !vote 3 on a movie night
    try { if (await watchlist.onChat(m)) return; } catch (e) { console.error('[watchlist]', e.message); } // 📋 !suggest a movie / !rating a movie
    try { if (songs.onChat(m)) return; } catch (e) { console.error('[songs]', e.message); } // 🎵 !sr a song
    try { eggs.onChatPoints(m); if (eggs.onChat(m)) return; } catch (e) { console.error('[eggs]', e.message); } // 🥚 chatting fills your egg; !egg, !pet, !battle…
    if (clipChatCmd(m)) return; // 🎬 !clip: anyone can clip the last minute
    if (chatbot.onChat(m)) return; // 🤖 your own chat commands, quotes (dev mode)
    if (skipChat(m)) return; // ⏭️ !skip <movie>: sits out the next battle
    if (maraGuessChat(m)) return; // 🎯 a number while chat guesses the marathon battle's winner
    if (marathon.chat(m)) return; // 🏃 map 3 / luck 12 from someone with a paid battle waiting
    moviesChatCommand(m); sitOutChat(m); chatVote(m); chatColor(m); if (!boardVote(m)) chatCall(m); helpChatCommand(m); siteChat(m); giveawayChat(m);
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
      act('chat', `joined “${list.name}” (${cmd})`, { icon: '👋', who: m.name, kind: 'join', list: list.name }); // 🧾
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
  else { const w = c.winner; passClaim(m.name); if (twitch.canSay()) twitch.say(`@${m.name} ⏭️ No problem! Your movie goes back in the battle and keeps its luck.`).catch(() => {}); setTimeout(() => askSitOut(w, m.name), 2500); }
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
  rollSend({ type: 'rollcallUpdate', key: p.key, here: true, count: live.rollcall.people.filter(x => x.here).length });
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
  rollSend({ type: 'rollcallEnd', removed, away: rc.awayNames, here: rc.people.filter(p => p.here).length });
  pushState(); refreshPreview();
}
// ---------- active chatters: Discord movies only go on the cliff once their person chats this stream ----------
// 🔢 "countdown" reward rule: it can be used N times per stream, then it's off until the next stream
const countMax = t => Math.max(1, Math.round(Number(db.rewardCounts?.[t]) || 3));
const countLeft = t => countMax(t) - (stream().rewardUses?.[t] || 0);
// 🌙 one stream night (1.86.3, Derek: "start counting until I go offline for longer than an hour before resetting it"):
// while live it never resets (not at midnight, not after a short internet drop); after going offline it ends once you've
// been offline for more than an hour. Never went live: a new calendar day = a new night (like before).
const NIGHT_GAP = 60 * 60000;
function nightOver(st, now = Date.now(), liveNow = db.live, day = todayKey()) {
  if (!st) return true;
  if (liveNow) return false;
  if (st.offAt) return now - st.offAt > NIGHT_GAP;
  return st.day !== day;
}
function stream() {
  if (nightOver(db.stream)) { db.stream = { day: todayKey(), active: [] }; save(); }
  return db.stream;
}
setInterval(() => { if (db.live && db.stream) db.stream.liveSeen = Date.now(); }, 60000); // (the last time we knew you were live, for a PC that was off)
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
  for (const e of getList('movies')?.entries || []) if (e.status === 'away' && (!onlyOld || e.awayDay !== stream().day)) { e.status = 'active'; delete e.awayDay; n++; }
  if (n) save();
  return n;
}

function finishClaim(claimed, text) {
  if (!live.claim) return;
  clearTimeout(live.claim.timer);
  live.claim.claimed = claimed;
  live.claim.done = true; delete live.claim.waiting;
  if (claimed) pinWinner(live.claim.winner);
  { const w = live.claim.winner || {}; act('battle', claimed ? `claimed “${w.label}”${text ? `: “${String(text).slice(0, 120)}”` : ''}` : `Nobody claimed “${w.label}” in time`, { icon: claimed ? '✅' : '⏰', who: claimed ? w.owner || '' : '', kind: 'claim', list: w.listName, test: !!w.test }); } // 🧾
  const h = findHistory(live.claim.winner?.historyId); if (h) { h.claimed = claimed; historyVersion++; save(); }
  if (live.claim.winner?.kind === 'movies' && !live.claim.winner.test) db.noShowStreak = claimed ? 0 : (db.noShowStreak || 0) + 1;
  save();
  broadcast({ type: claimed ? 'claimed' : 'claimExpired', text: text || '' }, 'overlay');
  pushState();
}

// ---------- websocket ----------
wss.on('connection', (ws, req) => {
  ws.role = new URL(req.url, 'http://x').searchParams.get('role') || 'control'; ws.ua = String(req.headers['user-agent'] || ''); // (OBS's browser says "OBS/31…": 🤖 Test all looks for it)
  if (!isLocal(req) || safety.strange(req)) return ws.close(4001, 'local only');
  if (ws.role === 'control' && safety.isOn() && !safety.unlocked(req)) return ws.close(4003, 'locked');
  if (ws.role === 'control') ws.send(JSON.stringify({ type: 'state', state: publicState() }));
  if (ws.role === 'celebrate') ws.send(JSON.stringify(audioMsg()));
  if (ws.role === 'mara') { ws.send(JSON.stringify({ type: 'maraCount', ...marathon.counter() })); ws.send(JSON.stringify(clockMsg())); if (live.maraGuess) ws.send(JSON.stringify(maraGuessMsg())); if (live.maraTimer) ws.send(JSON.stringify(mtMsg())); ws.send(JSON.stringify(cardsMsg())); ws.send(JSON.stringify(audioMsg())); ws.send(JSON.stringify(ytMsg())); } // 🏃 the marathon overlay (counter + pop-ups) + 📺 the YouTube players
  if (ws.role === 'rollcall' && live.rollcall && !live.rollcall.done) ws.send(JSON.stringify(rollStartMsg()));
  if (ws.role === 'songs') ws.send(JSON.stringify(songs.screen())); // 🎵 the now-playing box
  if (ws.role === 'eggs') ws.send(JSON.stringify({ type: 'eggBadges', badges: feat('eggs') ? eggs.badges() : {} })); // 🥚 the creature chat box
  if (ws.role === 'movienight') ws.send(JSON.stringify(movienight.screen())); // 🍿 the movie night vote box
  if (ws.role === 'ticker') ws.send(JSON.stringify(tickerMsg())); // 📜 the paused message page gets its words + look // (a roll call browser source opened late: it joins in)
  if (ws.role === 'overlay' && live.gather) ws.send(JSON.stringify({ type: 'gather', endsAt: live.gather.endsAt, seconds: Math.max(1, Math.round((live.gather.endsAt - Date.now()) / 1000)), discord: !!live.gather.discord })); // (⏱️ a game screen that opens / comes back during the join timer)
  if (ws.role === 'control' && live.editionNote && Date.now() - live.editionNote.at < 300000) setTimeout(() => { try { ws.send(JSON.stringify({ type: 'toast', text: brand(live.editionNote.text), ms: 12000 })); } catch {} }, 2500); /* 🚚 moved over from another edition */
  if (ws.role === 'control' && live.resumeNote && Date.now() - live.resumeNote.at < 120000) setTimeout(() => { try { ws.send(JSON.stringify({ type: 'toast', text: live.resumeNote.text })); } catch {} }, 1500); // 🔄 what came back after a restart
  if (ws.role === 'overlay') { ws.send(JSON.stringify(audioMsg())); if (/\bOBS\//.test(ws.ua)) { setTimeout(() => broadcast(audioMsg(), 'overlay'), 200); ws.on('close', () => setTimeout(() => { broadcast(audioMsg(), 'overlay'); pushState(); }, 200)); } } // 🔇 an OBS game screen opened / closed: the app's game screen goes quiet / plays again
  if (ws.role === 'overlay') { ws.send(JSON.stringify(cards.sceneMsg())); if (live.board) ws.send(JSON.stringify({ type: 'gatherBoard', board: { rows: boardRows(), bonus: db.settings.callsOn === false ? 0 : Number(db.settings.callLuck ?? 1), endsAt: live.gather?.endsAt || 0, open: true } })); if (live.phase === 'ended' && !live.claim && !new URL(req.url, 'http://x').searchParams.get('side')) leaveEnded(); /* a popped-out wheel window doesn't count */ ws.send(JSON.stringify(wheel.wheelMsg())); ws.send(JSON.stringify(audioMsg())); ws.send(JSON.stringify(camMsg())); ws.send(JSON.stringify(gfxMsg())); refreshPreview(true); if (live.gather) setTimeout(() => ws.send(JSON.stringify({ type: 'gather', endsAt: live.gather?.endsAt })), 500); }
  pushState();
  if (ws.role === 'songplay') { ws.send(JSON.stringify({ type: 'spLoad', src: live.sp?.src || '' })); setTimeout(pushState, 200); ws.on('close', () => setTimeout(pushState, 200)); }
  if (ws.role === 'chatvoice') { chatvoice.playerJoin(1); ws.on('close', () => chatvoice.playerJoin(-1)); }
  ws.on('close', pushState);
  ws.on('message', raw => {
    let m; try { m = JSON.parse(raw); } catch { return; }
    if (ws.role === 'chatvoice') { chatvoice.fromPlayer(m); return; }
    if (ws.role === 'songplay' && m.type === 'spInfo') { broadcast({ type: 'spInfo', info: m.info || {} }, 'control'); return; } // 🎚️ what the music player in OBS is playing
    if (ws.role === 'mara' && (m.type === 'ytAt' || m.type === 'ytErr')) { ytFromPlayer(m); return; } // 📺 what the BRB / sleeping videos are playing
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
    if (m.type === 'result') { gameResult(m); return; }
  });
});

const camMsg = () => ({ type: 'camera', base: clampN(db.settings.cliffSize, 60, 250, 130) / 100, auto: db.settings.autoCamera !== false, replay: db.settings.replayOn !== false });
const clampN = (v, a, b, d) => { const n = Number(v); return Number.isFinite(n) ? Math.max(a, Math.min(b, n)) : d; };
// ⏱️⏳ each battle can have its own battle timer + elimination pacer (Settings → Game); not set = the ones for all battles
function fightSecs(l) { return Math.round(clampN(Number(l?.gameSeconds) > 0 ? l.gameSeconds : db.settings.gameSeconds, 5, 600, 30)); }
function fightPacer(l) { return Math.round(clampN(l?.pacer != null && l.pacer !== '' && Number(l.pacer) >= 0 ? l.pacer : (db.settings.pacer ?? 50), 0, 100, 50)); }
// 🖥️ graphics (Settings → Graphics): resolution, frame rate cap, quality, FPS counter — for every game screen (OBS, the app, pop-outs)
const gfxMsg = () => ({ type: 'gfx', res: String(db.settings.gfxRes || '1080'), fps: Number(db.settings.gfxFps) || 0, quality: ['low', 'medium', 'high'].includes(db.settings.gfxQuality) ? db.settings.gfxQuality : 'high', showFps: !!db.settings.gfxShowFps, appSaver: db.settings.gfxAppSaver !== false, scale: clampN(db.settings.gfxScale, 50, 200, 100), glow: db.settings.gfxGlow !== false, particles: ['few', 'lots'].includes(db.settings.gfxParticles) ? db.settings.gfxParticles : 'auto', shake: clampN(db.settings.gfxShake, 0, 200, 100), flash: db.settings.gfxFlash !== false, smooth: db.settings.gfxSmooth !== false });
// 🔇 (1.84.3, Derek: "double audio with the app and OBS open with a scene with the app on it") how many OBS game screens are open
// (OBS's browser says "OBS/…"): while there's one, the game screens that AREN'T in OBS (inside the app, popped out) go quiet, so
// the battle / wheel sounds play once (setting appQuietObs, Settings → 🔊 Sounds)
/* 🎚️ (1.140.0) the music player page inside OBS (role songplay): the app's Chat tab drives it; `live.sp.src` = what it should be playing (a page that reloads picks it up again) */
const songPlayers = () => { let n = 0; for (const c of wss.clients) if (c.role === 'songplay' && c.readyState === 1) n++; return n; };
const obsGames = () => { let n = 0; for (const c of wss.clients) if (c.role === 'overlay' && c.readyState === 1 && /\bOBS\//.test(c.ua || '')) n++; return n; };
const audioMsg = () => ({ type: 'audio', obsGame: obsGames(), appQuiet: db.settings.appQuietObs !== false, on: db.settings.soundOn !== false, sfx: Number(db.settings.sfxVolume ?? 70) / 100, music: Number(db.settings.musicVolume ?? 35) / 100 });

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
// ---------- 🟢 Kick (1.90.0, dev mode only): chat from / to Kick, one switch ----------
kick.setHooks({ redeem: r => { if (r.key === 'egg' && feat('eggs')) eggs.buy({ login: r.login, name: r.name, kick: true }); }, /* 🟢🥚 Kick channel points: Buy an egg (never accepted / rejected / refunded by the app) */ dev: () => feat('kick'), /* 🟢 True's edition has Kick (he streams on both); Derek's with dev mode on */ chat: m => twitchHandlers.chat(m), live: isLive => twitchHandlers.live(isLive, 'kick'), changed: () => pushState(),
  getPage: async url => { const g = globalThis.__desktop?.getPage; if (!g) return ''; const r = await g(url); return r?.text || ''; } });
twitch.route.on = () => kick.on(); twitch.route.both = () => kick.both(); twitch.route.say = t => kick.say(t); twitch.route.canSay = () => kick.canSay();
setTimeout(() => kick.start(), 4000);
const kickDev = (req, res) => { if (feat('kick')) return true; res.status(400).json({ error: 'Kick is not part of this edition.' }); return false; };
app.get('/api/kick', (req, res) => res.json({ ...kick.info(), redirect: kick.redirectUri(PORT) }));
app.post('/api/kick/settings', (req, res) => { if (!kickDev(req, res)) return; const was = kick.on(), wasB = kick.both(); let r; try { r = kick.setCfg(req.body || {}); } catch (e) { return res.status(400).json({ error: e.message }); } if (was !== kick.on()) act('stream', `Platform switched to ${kick.on() ? 'Kick 🟢' : 'Twitch 💜'}`, { icon: '🔀', kind: 'platform' }); if (wasB !== kick.both()) broadcast({ type: 'chatBoth', both: kick.both() }, 'chatview'); if (wasB !== kick.both()) act('stream', kick.both() ? 'Both chats on: Twitch 💜 + Kick 🟢' : `Both chats off: back to ${kick.on() ? 'Kick 🟢' : 'Twitch 💜'} only`, { icon: '🔀', kind: 'platform' }); res.json({ ok: true, ...r }); });
app.get('/auth/kick', (req, res) => { try { if (!feat('kick')) throw new Error('Kick is not part of this edition.'); res.redirect(kick.authUrl(PORT)); } catch (e) { res.status(400).send(`<body style="font-family:sans-serif;background:#1a1030;color:#fff;padding:40px"><h2>🟢 Kick sign-in</h2><p>${hEsc(e.message)}</p><p>Close this tab and go back to Movie Royal.</p></body>`); } });
app.get('/kick/callback', async (req, res) => {
  const page = (ok, msg) => res.send(`<body style="font-family:sans-serif;background:#1a1030;color:#fff;padding:40px"><h2>${ok ? '✅ Signed in with Kick' : '⚠️ Kick sign-in did not work'}</h2><p>${hEsc(msg)}</p><p>You can close this tab and go back to Movie Royal.</p></body>`);
  try { if (req.query.error) throw new Error(String(req.query.error_description || req.query.error)); const u = await kick.finishAuth(PORT, String(req.query.code || ''), String(req.query.state || '')); act('stream', `Signed in with Kick as ${u?.name || '?'}`, { icon: '🟢', kind: 'kick' }); page(true, `Hello ${u?.name || ''}! Movie Royal can now talk in your Kick chat.`); }
  catch (e) { page(false, e.message || String(e)); }
});
app.post('/api/kick/signout', (req, res) => { kick.signOut(); res.json({ ok: true }); });
app.post('/api/kick/say-test', async (req, res) => { if (!kickDev(req, res)) return; try { await kick.say('🟢 Movie Royal is connected to this Kick chat!'); res.json({ ok: true }); } catch (e) { res.status(400).json({ error: e.message }); } });
// 🧪 a pretend Kick chat message, read the same way a real one is (replies show in the pretend chat window)
app.post('/api/test/both-chats', async (req, res) => { /* 🧪 (1.139.2) a pretend Twitch viewer and a pretend Kick viewer chat: both lines land in the chat log, the Kick one marked */
  twitch.pretend.until = Date.now() + 10 * 60000; const t = Date.now();
  await twitchHandlers.chat({ login: 'pretend_twitchy', name: 'Pretend_Twitchy', text: 'hello from Twitch!', userId: 'p-tw', badges: {}, pretend: true, id: 'tw' + t });
  await twitchHandlers.chat({ ...kick.toChat({ id: 'kk' + t, content: 'hello from Kick!', sender: { id: 4243, username: 'Pretend_Kicky', slug: 'pretend_kicky', identity: { color: '#53fc18', badges: [] } } }), pretend: true });
  const rec = chatlog.getRecent(20), a = rec.find(x => x.id === 'tw' + t), b = rec.find(x => x.id === 'kk' + t), rows = [{ what: 'The Twitch viewer\'s message is in the chat', ok: !!a && !a.kick }, { what: 'The Kick viewer\'s message is in the chat, marked as Kick', ok: !!b && !!b.kick }];
  res.json({ ok: rows.every(x => x.ok), rows, both: kick.both() });
});
app.post('/api/test/kick-chat', (req, res) => {
  const b = req.body || {}, role = String(b.role || '');
  const m = kick.toChat({ id: 'test' + Date.now(), content: String(b.text || '!hello'), sender: { id: 4242, username: String(b.name || 'KickViewer'), slug: String(b.name || 'KickViewer').toLowerCase(), identity: { color: '#53fc18', badges: role ? [{ type: role, text: role }] : [] } } });
  twitch.pretend.until = Date.now() + 10 * 60000; twitchHandlers.chat({ ...m, pretend: true });
  res.json({ ok: true, read: { name: m.name, login: m.login, text: m.text, badges: m.badges, userId: m.userId } });
});
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
const startDonationFeed = () => donations.startDonations({ tip: t => { try { alertAct({ kind: 'tip', name: t.name, amount: t.amount, currency: t.currency, text: t.message || '' }); try { eggs.onAlert({ kind: 'tip', login: String(t.name || '').toLowerCase().replace(/[^a-z0-9_]/g, ''), name: t.name, amount: t.amount }); } catch {} try { scareFor({ kind: 'tip', name: t.name, amount: t.amount, currency: t.currency }); } catch (e) { console.error('[scare pop-up]', e.message); } chatlog.onAlert({ kind: 'tip', login: String(t.name || '').toLowerCase(), name: t.name, amount: t.amount, text: `donated ${t.currency && t.currency !== 'USD' ? t.amount + ' ' + t.currency : '$' + t.amount}${t.message ? ': ' + t.message : ''}` }); try { paid.onTip(t); } catch (e) { console.error('[paid battles]', e.message); } if (!db.moneyPaused?.donations) wheel.onMoney(t); } catch (e) { console.error('[donation]', e.message); } }, change: pushState });
setTimeout(startDonationFeed, 1500);
setTimeout(() => { const r = wheel.W().rewards; twitch.noInput([r.grow, r.shrink]).catch(() => {}); }, 20000); // grow/shrink rewards made by older versions asked chat to type a spot
wheel.initWheel({ broadcast, pushState, say: t => twitch.canSay() && db.wheel?.chatOn !== false ? twitch.say(t) : Promise.resolve(), obsDoom: () => obsOk('Doom') ? obs.doomsday() : Promise.resolve(null), theme: () => db.settings.revealThemed !== false ? live.appStyle || null : null, openBattle: (id, auto, why) => openBattleFromWheel(id, auto, why), openCards: (id, auto, why) => cards.openFromWheel(id, auto, why), goView: v => broadcast({ type: 'goView', view: v }, 'control') });
if (db.doomRestore) setTimeout(() => obs.restoreDoom().catch(() => {}), 20000); // ☠️ Doomsday turned your mic / camera off and Movie Royal closed before it could turn them back on: do it now (once the stream is over)
// 🃏 card battles (Card pool + Card battles tabs)
cards.initCards({ broadcast, pushState, shipIcons: () => shipIcons(), stormTips: () => stormTips(), rewardsNow: () => setTimeout(() => syncRewards().catch(() => {}), 400), // (⛈️🐒 a card fight started / ended: the Pirate Battle rewards follow it)
  preview: () => refreshPreview(true), charResult: (gameId, winnerId, order) => gameResult({ gameId, winnerId, order, events: [] }), mapTag: id => mapsWithTags().find(m => m.id === id)?.tag || null,
  startBall: (fight, b) => { // ⚪🃏 a card battle on a ball map: the ball game plays it with card fighters (no luck: every pack the same odds)
    if (live.phase === 'lobby' || live.phase === 'running') return 'A ball battle is going right now. Stop it first.';
    if (![...wss.clients].some(c => c.role === 'overlay')) return "The game screen isn't open. Reload the control panel (or bring back the pop-out game window).";
    leaveEnded(true); if (wheel.W().show) wheel.setShow(false);
    const fighters = fight.fighters.map(f => ({ id: f.id, label: f.name + (f.tag ? ' ' + f.tag : ''), sub: f.game || '', image: f.image || null, weight: 1, kind: 'cards', color: f.color }));
    live.game = { id: uid(), cards: fight.id, listId: null, fighters, total: fighters.length, map: fight.map, startedAt: Date.now(), ...(fight.test ? { test: true, testName: fight.name } : {}) };
    live.phase = 'lobby'; live.claim = null;
    broadcast({ type: 'start', mapSize: mapSizeK(), map: fight.map, gameId: live.game.id, fighters, total: fighters.length, listName: fight.name, kind: 'cards', skin: 'cards', lobbySeconds: 3, gameSeconds: b.length || db.settings.gameSeconds, pacer: b.pace ?? 50, fairOdds: true, queued: [] }, 'overlay');
    pushState(); return null;
  },
  stopBall: () => { if (live.game?.cards) { live.phase = 'idle'; live.game = null; broadcast({ type: 'reset' }, 'overlay'); pushState(); refreshPreview(true); } }, // (STOP FIGHT and ↺ Reset battlefield: going, or finished and still on screen)
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
// 🎬 Clips (1.88.0, Derek: "a clipping feature in all versions… a button on every battle and wheel tab"): one press = a Twitch clip of the last minute
let clipAt = 0;
async function makeClip(via, test, by) {
  if (!test && Date.now() - clipAt < 8000) throw new Error('A clip was just made. Give it a few seconds.');
  let c; const onKick = test === 'kick' || (!test && kick.on()); /* 🟢 Kick has no clip button for apps: OBS saves the last minute as a video file instead */
  if (test) { if (test === 'fail') throw new Error("Twitch only makes clips while you're live"); c = onKick ? { id: 'PretendClip' + Date.now().toString(36), url: '', file: 'Videos\\Replay pretend.mp4', kind: 'obs' } : { id: 'PretendClip' + Date.now().toString(36), url: 'https://clips.twitch.tv/PretendClip', edit: '' }; }
  else if (onKick) {
    if (db.settings.obsOn === false) throw new Error('On Kick, clips are saved by OBS, and OBS is switched off in Settings → 🎥 OBS.');
    clipAt = Date.now(); try { const r = await obs.saveReplay(); c = { id: 'obs' + Date.now().toString(36), url: '', file: r.file || '', kind: 'obs' }; } catch (e) { clipAt = 0; throw e; }
  }
  else { clipAt = Date.now(); try { c = await twitch.createClip(by ? `Clipped by ${by}` : ''); } catch (e) { clipAt = 0; throw e; } }
  const rec = { ...c, at: Date.now(), via: String(via || '').slice(0, 20), ...(by ? { by } : {}), ...(test ? { test: true } : {}) };
  if (!test) { db.clips = [rec, ...(db.clips || [])].slice(0, 100); save(); if (!by && db.settings.clipChat !== false) twitch.say(rec.url ? `🎬 New clip: ${rec.url}` : '🎬 Clipped! The last minute was saved.').catch(() => {}); pushState(); }
  act('stream', `${by ? 'clipped the last minute with !clip' : (test ? 'Pretend clip' : 'Clip') + ' made'}: ${rec.url || 'saved by OBS' + (rec.file ? ' as ' + rec.file : '')}`, { icon: '🎬', kind: 'clip', test: !!test, ...(by ? { who: by } : {}) });
  return rec;
}
// 💬 !clip (1.88.2, Derek: "anyone in chat can do it"): the same clip, named "Clipped by <them>" (Twitch still lists the streamer as the maker: the app makes it)
let clipCmdAt = 0, clipNoAt = 0;
// 🙋 who may use !clip (1.88.3, Derek: checkboxes streamer / mods / VIPs / subs / followers / none; 'all' = everyone)
const CLIP_WHO = { all: 'everyone', streamer: 'the streamer', mods: 'mods', vips: 'VIPs', subs: 'subs', followers: 'followers' };
function clipWho() { if (db.settings.clipCmdOn === false) return []; const w = db.settings.clipWho; return Array.isArray(w) ? w.filter(k => CLIP_WHO[k]) : ['all']; }
async function clipAllowed(m, who = clipWho()) {
  if (!who.length) return false; if (who.includes('all')) return true;
  const b = m.badges || {}, me = !!b.broadcaster || (!!m.login && m.login === String(db.owner?.login || twitch.status.login || '').toLowerCase());
  if ((who.includes('streamer') && me) || (who.includes('mods') && b.mod) || (who.includes('vips') && b.vip) || (who.includes('subs') && b.sub)) return true;
  if (who.includes('followers')) { if (m.pretend) return !!m.follows; try { const f = await twitch.followedAt(m.userId); if (f) return true; } catch {} }
  return false;
}
function clipChatCmd(m) {
  const cmd = String(db.settings.clipCommand || '!clip').trim().toLowerCase(), who = clipWho(); if (!cmd || !who.length) return false;
  if (String(m.text || '').trim().toLowerCase().split(/\s+/)[0] !== cmd) return false;
  const name = m.name || m.login || 'someone';
  clipAllowed(m, who).then(ok => { if (ok) return clipChatGo(m, name); if (Date.now() - clipNoAt > 60000 && twitch.canSay()) { clipNoAt = Date.now(); twitch.say(`🎬 @${name} !clip is for ${who.map(k => CLIP_WHO[k]).join(', ').replace(/, ([^,]*)$/, ' and $1')}.`).catch(() => {}); } }).catch(() => {});
  return true;
}
function clipChatGo(m, name) {
  const now = Date.now();
  if (now - clipCmdAt < 30000) { if (now - clipNoAt > 20000 && twitch.canSay()) { clipNoAt = now; twitch.say(`🎬 @${name} a clip was just made. Try again in a few seconds.`).catch(() => {}); } return true; }
  clipCmdAt = now;
  makeClip('chat', m.pretend ? (m.kick ? 'kick' : 'ok') : false, name).then(c => {
    twitch.say(c.url ? `🎬 @${name} clipped the last minute: ${c.url}` : `🎬 @${name} clipped the last minute! It's saved for the streamer.`).catch(() => {});
    broadcast({ type: 'toast', text: `🎬 ${hEsc(name)} made a clip with !clip${c.test ? ' (pretend)' : c.url ? `: <a href="${hEsc(c.url)}" target="_blank" rel="noopener">▶ Watch it</a>` : c.file ? `: saved as ${hEsc(c.file)}` : ''}` }, 'control');
  }).catch(e => { clipCmdAt = 0; if (now - clipNoAt > 20000 && twitch.canSay()) { clipNoAt = Date.now(); twitch.say(`🎬 @${name} no clip: ${/live/i.test(e.message) ? 'clips only work while the stream is live' : /sign in/i.test(e.message) ? 'the streamer needs to sign in with Twitch again first' : kick.on() ? 'OBS could not save it right now' : 'Twitch could not make it right now'}.`).catch(() => {}); } });
  return true;
}
app.post('/api/clip/who', (req, res) => { const w = (Array.isArray(req.body?.who) ? req.body.who : []).filter(k => CLIP_WHO[k]); db.settings.clipWho = w.includes('all') ? ['all'] : [...new Set(w)]; db.settings.clipCmdOn = true; save(); pushState(); res.json({ ok: true, who: clipWho() }); });
app.post('/api/test/clip-who', async (req, res) => { // 🧪 would these people be let in right now? (pretend people, nothing sent)
  const P = [['the streamer', { badges: { broadcaster: true } }], ['a mod', { badges: { mod: true } }], ['a VIP', { badges: { vip: true } }], ['a sub', { badges: { sub: true } }], ['a follower', { pretend: true, follows: true }], ['someone new', { pretend: true }]];
  const who = clipWho(), rows = []; for (const [name, m] of P) rows.push({ name, ok: await clipAllowed(m, who) }); res.json({ who, rows });
});
// 📣 (1.127.0, Derek) shout-out button (Chat tab tools box + profile pop-ups): a chat line "go check out …" + Twitch's own shout-out box (on Kick: only the chat line, Kick has no shout-out for apps)
const soLast = new Map(); let soAt = 0;
async function shoutOut(name, via, test, opt = {}) {
  const login = String(name || '').trim().replace(/^@/, '').toLowerCase(); if (!/^[a-z0-9_]{2,25}$/.test(login)) throw new Error('Type their channel name.');
  const o = db.settings, text0 = o.soText || '📣 Go check out {name} at https://twitch.tv/{login}{game}! Give them a follow 💜';
  let u = null, info = null;
  if (test) u = { login, name: name.replace(/^@/, ''), id: 'pretend' };
  else { try { u = (await twitch.getUsers([login])).get(login) || null; } catch {} if (!u && !kick.on()) throw new Error(`Twitch doesn't know a channel called “${login}”.`); if (u?.id) info = await twitch.channelInfo(u.id); }
  if (test) info = { game: 'Just Chatting' };
  const shown = u?.name || login, line = text0.replace(/\{name\}/g, shown).replace(/\{login\}/g, login).replace(/\{game\}/g, info?.game ? ` (last seen playing ${info.game})` : '');
  const r = { ok: true, name: shown, login, line, twitch: null, test: !!test };
  if (test) { r.twitch = 'pretend'; act('chat', `Pretend shout-out for ${shown}${opt.by ? ' by ' + opt.by : ''}`, { icon: '📣', kind: 'shoutout', test: true }); return r; }
  if (o.soChat !== false && opt.say !== false) await twitch.say(line).catch(() => {});
  if (!kick.on() && u?.id && o.soTwitch !== false) {
    if (Date.now() - soAt < 120000) r.twitch = 'Twitch only allows one shout-out box every 2 minutes, so this time it was just the chat line.';
    else if ((soLast.get(login) || 0) > Date.now() - 3600000) r.twitch = `Twitch allows the shout-out box for ${shown} once an hour, so this time it was just the chat line.`;
    else { try { await twitch.shoutout(u.id); soAt = Date.now(); soLast.set(login, soAt); r.twitch = 'ok'; } catch (e) { r.twitch = e.message || String(e); } }
  }
  act('chat', `shouted out ${shown}${opt.by ? ' with !so' : ''}${r.twitch === 'ok' ? ' (with the Twitch shout-out box)' : ''}`, { icon: '📣', kind: 'shoutout', who: opt.by || 'You' });
  return r;
}
// ⭐🍅 (1.128.0, Derek) share YOUR OMDb key with every edition: the key goes to your 24/7 bot (only it uses it), and the bot's address is saved in src/shared.json on GitHub
// by the Backup Bots app (it has the GitHub key). Every Movie Royal without its own key then asks your bot. Dev edition only.
async function omdbShare(on) {
  if (!EDITION.dev) throw new Error('Only the dev edition can share its key.');
  const key = String(db.settings.omdbKey || '').trim(); if (on && !key) throw new Error('Save your own OMDb key first (Settings → 🎬 Movie info).');
  if (!cloud.enabled()) throw new Error('Set up your 24/7 bot first (Setup guide): the shared key lives on it.');
  const base = String(db.settings.cloud.url || '').replace(/\/+$/, ''), proxy = base + '/omdb', steps = [];
  const r = await fetch(base + '/omdb/key', { method: 'PUT', headers: { Authorization: `Bearer ${db.settings.cloud.syncKey}`, 'content-type': 'application/json' }, body: JSON.stringify({ key: on ? key : '' }), signal: AbortSignal.timeout(15000) }).catch(e => ({ ok: false, status: 0, e }));
  if (r.status === 404) throw new Error('Your 24/7 bot needs an update first (Settings → 🤖 Discord & picks → Update the 24/7 bot), then press this again.');
  if (!r.ok) throw new Error(`Your 24/7 bot didn't take it (${r.status || r.e?.message || 'no answer'}).`);
  steps.push(on ? '✅ Your key is on your 24/7 bot (only it uses the key)' : '✅ Your 24/7 bot stopped sharing the key');
  if (on) { const t = await fetch(`${proxy}?i=tt0120737`, { signal: AbortSignal.timeout(15000) }).then(x => x.json()).catch(() => null); if (t?.imdbRating) steps.push(`✅ It works: The Fellowship of the Ring = IMDb ${t.imdbRating}`); else steps.push('⚠️ Your bot asked OMDb but got no rating back: ' + (t?.Error || 'no answer')); }
  const want = on ? proxy : '', now = shared.get().omdb || '';
  if (want !== now) {
    const b = await fetch('http://127.0.0.1:3747/api/shared/save', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ omdb: want }), signal: AbortSignal.timeout(20000) }).then(async x => ({ ok: x.ok, j: await x.json().catch(() => ({})) })).catch(() => null);
    if (!b) { steps.push('⚠️ Open the 🛡️ Backup Bots app (it has your GitHub key) and press this again, so every edition learns your bot’s address.'); return { ok: false, steps, proxy, needBackup: true }; }
    if (!b.ok) { steps.push('⚠️ ' + (b.j.error || 'The Backup Bots app could not save it to GitHub')); return { ok: false, steps, proxy }; }
    steps.push(on ? '✅ Saved on GitHub: every edition picks it up within 6 hours (or when it opens)' : '✅ Taken off GitHub'); db.shared = { at: Date.now(), v: { ...shared.get(), omdb: want } }; save();
  } else steps.push(on ? '✅ GitHub already has your bot’s address' : '✅ GitHub already had nothing shared');
  act('stream', on ? 'Shared the OMDb (IMDb + Rotten Tomatoes) key with every edition through the 24/7 bot' : 'Stopped sharing the OMDb key', { icon: '🍅', kind: 'omdb' }); pushState();
  return { ok: true, steps, proxy };
}
app.post('/api/omdb/share', async (req, res) => { try { res.json({ ok: true, ...(await omdbShare(req.body?.on !== false)) }); } catch (e) { res.status(400).json({ error: e.message }); } });
app.post('/api/omdb/refresh', async (req, res) => { await shared.refresh(); pushState(); res.json({ via: omdbWhere(), shared: shared.omdbProxy(), error: shared.status.error }); });
app.get('/api/test/omdb-share', async (req, res) => { // 🧪 which OMDb address the app asks in each case (nothing is sent)
  const keepK = db.settings.omdbKey, keepS = db.shared, rows = [], add = (what, ok) => rows.push({ what, ok: !!ok });
  try {
    db.settings.omdbKey = 'abc12345'; db.shared = { at: Date.now(), v: { omdb: 'https://pretend-bot.workers.dev/omdb' } };
    add('Your own key saved → the app asks OMDb with your key', omdbWhere() === 'own');
    db.settings.omdbKey = ''; add('No key, but one is shared → the app asks the sharer’s 24/7 bot (no key in the app)', omdbWhere() === 'shared');
    db.shared = { at: Date.now(), v: { omdb: '' } }; add('No key and nothing shared → no ratings (it asks for a key)', omdbWhere() === '');
    db.shared = { at: Date.now(), v: { omdb: 'https://evil.example.com/steal' } }; add('A strange address is never used', omdbWhere() === '');
  } finally { db.settings.omdbKey = keepK; db.shared = keepS; }
  res.json({ ok: rows.every(r => r.ok), rows, now: { via: omdbWhere(), shared: shared.omdbProxy(), checked: shared.status.at, error: shared.status.error } });
});
app.post('/api/shoutout', async (req, res) => { try { res.json(await shoutOut(req.body?.name, req.body?.via, false)); } catch (e) { res.status(400).json({ error: e.message || String(e) }); } });
app.post('/api/test/shoutout', async (req, res) => { try { res.json(await shoutOut(req.body?.name || 'pretend_friend', 'test', true)); } catch (e) { res.status(400).json({ error: e.message || String(e) }); } });
app.post('/api/clip', async (req, res) => { try { res.json({ ok: true, clip: await makeClip(req.body?.via) }); } catch (e) { res.status(400).json({ error: e.message || String(e) }); } });
app.post('/api/clip/open', (req, res) => { const c = (db.clips || []).find(x => x.id === req.body?.id); if (!c?.file || !globalThis.__desktop?.openPath) return res.status(400).json({ error: 'That clip has no file to show.' }); globalThis.__desktop.openPath(path.dirname(c.file)); res.json({ ok: true }); });
app.post('/api/test/clip', async (req, res) => { try { res.json({ ok: true, clip: await makeClip('test', req.body?.fail ? 'fail' : req.body?.kick ? 'kick' : 'ok') }); } catch (e) { res.status(400).json({ error: e.message || String(e) }); } });
// 🎮 Game capture tab (1.87.0, dev only): its sound keeps playing when Movie Royal isn't the window in front
/* (1.140.1) two things can keep the app's sound on while its window isn't in front: 🎮 the game capture and 🎵 a song request that is playing */
const keepers = { gc: false, music: false };
const keepSoundNow = () => { let kept = null; try { kept = globalThis.__desktop?.keepSound?.(keepers.gc || keepers.music) ?? null; } catch {} return kept; };
app.post('/api/gamecap/sound', (req, res) => { const on = !!req.body?.on && !!db.settings.betaUpdates; keepers.gc = on; res.json({ ok: true, on, kept: keepSoundNow() }); });
app.post('/api/songs/sound', (req, res) => { const on = !!req.body?.on && feat('songs') && !songs.opts().muteUnfocused; keepers.music = on; res.json({ ok: true, on, kept: keepSoundNow() }); }); /* 🎵 (Derek: "music from song request always stays on no matter what your setting is… by default music will always play even when tabbed out") */
app.post('/api/view', (req, res) => { // the control panel says which tab you're on (for the chat message)
  const v = String(req.body?.view || ''); if (v !== live.view) helpCd = 0; live.view = v; // (a new tab = !moviesroyal can list its commands right away)
  if (v === 'mara') { // 🏃 Marathon tab = the marathon battle on stream (when nothing is running)
    if (wheel.W().show) wheel.setShow(false); cards.setShow(false);
    const ml = marathon.list(); if (ml && db.activeListId !== ml.id && live.phase !== 'lobby' && live.phase !== 'running' && !live.gather) { leaveEnded(); db.activeListId = ml.id; previewIds = null; save(); }
    refreshPreview(true); live.lastGameView = 'battle'; pushState(); return res.json({ ok: true, kind: annKind() });
  }
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
  if (!pointsOn()) return { made: false, skipped: true, byHand: [] };
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
  try { await twitch.startRaid(t.id); live.raid.started = Date.now(); try { raids.note(t); } catch {} twitch.say(`🚀 RAID! We're heading to ${t.name}: twitch.tv/${t.login} 💜`).catch(() => {}); pushState(); res.json({ ok: true, target: t }); }
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
// 🎉 Viewer's choice (1.61.3, Derek: "don't say what they are picking, they tell me later"): the pick stays a secret unless
// settings.choiceShowPick. The reward still asks them to type something (the OBS celebration page sees redeems in chat by that).
const CHOICE_PROMPTS = { show: VR.choice.prompt, secret: 'You get to choose! Type anything to redeem, then tell the streamer your pick.' };
const choicePrompt = () => db.settings.choiceShowPick ? CHOICE_PROMPTS.show : CHOICE_PROMPTS.secret;
async function fixChoicePrompt() { // (only our own reward, and only if it still has one of our prompts: one you wrote yourself stays)
  if (!twitch.status.userId) return;
  const title = vrTitle('choice').toLowerCase(), mine = new Set((await twitch.listRewards()).map(r => r.id));
  for (const r of await twitch.listAllRewards()) if (mine.has(r.id) && r.title.toLowerCase() === title && Object.values(CHOICE_PROMPTS).includes(r.prompt) && r.prompt !== choicePrompt()) await twitch.updateReward(r.id, { prompt: choicePrompt() });
}
const HATS_DEFAULT = 'Cowboy hat\nTop hat\nWizard hat\nPirate hat\nBaseball cap\nBeanie\nParty hat\nCrown';
const vrTitle = k => db.settings.vrTitles?.[k] || VR[k].title;
const vrOff = k => db.settings['vr' + k[0].toUpperCase() + k.slice(1) + 'On'] === false; // (1.61.0, Derek: hat / hydrate / stretch / viewer's choice each on or off: vrHydrateOn, vrStretchOn, vrHatOn, vrChoiceOn)
const vrKind = title => Object.keys(VR).find(k => vrTitle(k).toLowerCase() === String(title || '').toLowerCase()) || null;
const hats = () => String(db.settings.hatList || HATS_DEFAULT).split('\n').map(x => x.trim()).filter(Boolean).slice(0, 30);
async function vrSetup() {
  if (!pointsOn()) return {};
  const all = await twitch.listAllRewards(), mine = new Set((await twitch.listRewards()).map(r => r.id)), out = {};
  db.settings.vrTitles ||= {}; db.settings.vrCosts ||= {};
  for (const [k, d] of Object.entries(VR)) {
    const olds = all.filter(r => d.re.test(r.title) && !Object.entries(VR).some(([k2, d2]) => k2 !== k && vrTitle(k2).toLowerCase() === r.title.toLowerCase())), o = { removed: [], byHand: [], made: false };
    const old = olds.find(r => !mine.has(r.id)) || olds[0], title = old?.title || db.settings.vrTitles[k] || d.title, cost = old?.cost || db.settings.vrCosts[k] || d.cost;
    db.settings.vrTitles[k] = title; db.settings.vrCosts[k] = cost; o.title = title; o.cost = cost;
    for (const r of olds) { if (mine.has(r.id)) { await twitch.deleteReward(r.id).catch(() => {}); o.removed.push(`${r.title} (${r.cost})`); } else o.byHand.push({ title: r.title, cost: r.cost }); }
    if (!o.byHand.length) o.made = await twitch.createReward({ title, cost, prompt: old?.prompt || (k === 'choice' ? choicePrompt() : d.prompt), color: old?.color || d.color, input: old ? old.input : !!d.input, queue: old ? !old.skip : false }).catch(e => { o.error = e.message; return false; });
    out[k] = o;
  }
  db.vrSetup = { at: Date.now(), ...out }; save(); rewardKey = ''; syncRewards().catch(() => {}); pushState();
  if (db.settings.choiceObs && obsOk()) choiceFile().then(f => obs.celebrateSource(true, f.file, choicePick())).catch(() => {}); // (a remade reward has a new id: the OBS file gets it)
  return out;
}
setInterval(() => { if (twitch.status.userId && !fixChoicePrompt.done) { fixChoicePrompt.done = true; fixChoicePrompt().catch(e => console.error('[twitch] viewer\'s choice prompt:', e.message)); } }, 45000);
setInterval(() => { if (twitch.status.userId && !db.vrSetup && !vrSetup.busy) { vrSetup.busy = true; vrSetup().catch(e => console.error('[twitch] viewer rewards:', e.message)).finally(() => { vrSetup.busy = false; }); } }, 30000);
function vrRedeem(kind, r) {
  if (vrOff(kind)) return; // (switched off: it's hidden on Twitch too)
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
  if (!db.settings.choiceShowPick) c = { ...c, input: '' }; // 🤫 their pick stays a secret: they tell you later
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
  const cfg = { channel: login, reward: rw.id, hidePick: !db.settings.choiceShowPick, text: db.settings.choiceHeadline || "VIEWER'S CHOICE!", vol: db.settings.soundOn === false ? 0 : Math.round(Number(db.settings.sfxVolume ?? 70)), sound: db.settings.soundOn === false ? '0' : '1' };
  const tpl = fs.readFileSync(path.join(ROOT, 'public', 'obs', 'viewers-choice.html'), 'utf8').replace('<script>', `<script>window.MR_CONFIG = ${JSON.stringify(cfg).replace(/</g, '\\u003c')};</script>\n<script>`);
  const dir = path.join(DATA, 'obs'); fs.mkdirSync(dir, { recursive: true }); const file = path.join(dir, 'viewers-choice.html'); fs.writeFileSync(file, tpl);
  return { file, needsText: !rw.input };
}
const choicePick = () => Array.isArray(db.settings.choiceScenes) && db.settings.choiceScenes.length ? db.settings.choiceScenes : null; // 🎬 the OBS scenes you picked (null = the ones that have it)
async function choiceSource(on, scenes) {
  if (on && !obsOk()) throw new Error('Movie Royal is switched off for OBS: turn on 🎥 Let Movie Royal use OBS in Settings → 🎥 OBS first.');
  if (on && Array.isArray(scenes)) { if (!scenes.length) throw new Error('Pick at least one OBS scene for it.'); db.settings.choiceScenes = scenes.map(String).slice(0, 200); }
  db.settings.choiceObs = !!on; save();
  let note = null, file = null;
  if (on) { const f = await choiceFile(); file = f.file; if (f.needsText) note = 'Your Viewer\'s choice reward doesn\'t ask viewers to type something, so it can\'t be seen in chat. On Twitch, turn on “Require Viewer to Enter Text” for it.'; }
  let r; try { r = await obs.celebrateSource(on, file, choicePick()); } catch (e) { if (on) { db.settings.choiceObs = false; save(); } throw e; }
  pushState(); return { ...r, note };
}
setInterval(() => { if (db.settings.choiceObs && obsOk() && twitch.status.userId) choiceFile().then(f => obs.celebrateSource(true, f.file, choicePick())).catch(() => {}); }, 10 * 60000); // (keeps it in the scenes you picked, and a new reward or channel is written in)
app.get('/api/vr/scenes', async (req, res) => { if (req.query.for === 'video') { const v = obsVideos().find(x => x.id === req.query.id); try { return res.json({ ok: true, ...(await obs.sceneList(v ? videoInput(v) : '-')), picked: v?.scenes || [] }); } catch (e) { return res.status(400).json({ error: e.message }); } } const roll = req.query.for === 'roll', mara = req.query.for === 'mara', mnf = req.query.for === 'mn'; try { res.json({ ok: true, ...(await obs.sceneList(mnf ? obs.MN_NAME : mara ? obs.MARA_NAME : roll ? obs.ROLL_NAME : undefined)), picked: (mnf ? db.settings.mnScenes : mara ? db.settings.marathon?.scenes : roll ? db.settings.rollScenes : db.settings.choiceScenes) || null }); } catch (e) { res.status(400).json({ error: e.message }); } }); // 🎬 your OBS scenes, to pick where it goes
app.get('/api/vr/obs-file', (req, res) => res.download(path.join(ROOT, 'public', 'obs', 'viewers-choice.html'), 'viewers-choice.html')); // ⬇️ the file for OBS (it sets itself up when you open it)
app.post('/api/vr/setup', async (req, res) => { try { res.json({ ok: true, ...(await vrSetup()) }); } catch (e) { res.status(400).json({ error: e.message }); } });
// 📣 roll call browser source in OBS (1.61.0): Movie Royal adds /rollcall.html to the scenes you pick (or you add it by hand: the address is in Settings → 🎥 OBS)
const rollUrl = () => `http://localhost:${PORT}/rollcall.html`;
async function rollObsSource(on, scenes) {
  if (on && !obsOk()) throw new Error('Movie Royal is switched off for OBS: turn on 🎥 Let Movie Royal use OBS in Settings → 🎥 OBS first.');
  if (on && Array.isArray(scenes)) { if (!scenes.length) throw new Error('Pick at least one OBS scene for it.'); db.settings.rollScenes = scenes.map(String).slice(0, 200); }
  const pick = Array.isArray(db.settings.rollScenes) && db.settings.rollScenes.length ? db.settings.rollScenes : null;
  const r = await obs.rollSource(!!on, rollUrl(), pick);
  db.settings.rollObs = !!on; save(); pushState(); return r;
}
/* 🎚️ Audio levels on the Chat tab (1.118.0): the control panel says "I'm showing the meters" every few seconds; while it does, the app keeps
   one connection to OBS for its volume meters and passes them on (about 12 a second). Nothing is kept or sent anywhere else. */
const meters = { until: 0, fakeT: null };
function metersWant(on) {
  meters.until = on ? Date.now() + 20000 : 0;
  if (on && !obs.metering() && !meters.started && !meters.fakeT) { meters.started = true; obs.watchMeters(list => broadcast({ type: 'obsMeters', list }, 'control'), ok => broadcast({ type: 'obsMeters', state: ok ? 'on' : 'lost' }, 'control')); }
  if (!on) metersStop();
}
function metersStop() { if (meters.started) { obs.stopMeters(); meters.started = false; } }
setInterval(() => { if (meters.started && Date.now() > meters.until) metersStop(); }, 5000);
app.post('/api/obs/meters', (req, res) => { try { if (!feat('dash')) throw new Error('The Chat tab boxes are not part of this edition.'); if (req.body?.on && !obsOk()) throw new Error('Movie Royal is switched off for OBS: turn on 🎥 Let Movie Royal use OBS in Settings → 🎥 OBS first.'); metersWant(!!req.body?.on); res.json({ ok: true, on: !!req.body?.on, connected: obs.metering() }); } catch (e) { res.status(400).json({ error: e.message }); } });
/* 📊 Stream stats box on the Chat tab (1.121.0): OBS's stats, asked for every few seconds while the box shows. The bitrate is worked out from how many bytes went out since the last look. */
let statLast = null;
app.get('/api/obs/stats', async (req, res) => {
  try { if (!obsOk()) throw new Error('Movie Royal is switched off for OBS.');
    const st = await obs.streamStats(), now = Date.now(); let kbps = null;
    if (st.stream && st.stream.on) { if (statLast && st.stream.bytes >= statLast.bytes && now - statLast.at < 20000 && now > statLast.at) kbps = Math.round((st.stream.bytes - statLast.bytes) * 8 / (now - statLast.at)); statLast = { bytes: st.stream.bytes, at: now }; } else statLast = null;
    res.json({ ok: true, ...st, kbps });
  } catch (e) { res.status(400).json({ error: e.message }); }
});
app.get('/api/test/obs-stats', (req, res) => { const t = Date.now() / 1000, w = (a, b, f) => a + Math.sin(t * f) * b; /* 🧪 pretend numbers, no OBS needed */
  res.json({ ok: true, test: true, cpu: w(11, 4, .7), mem: 1420 + Math.sin(t / 5) * 30, disk: 412000, fps: w(59.9, .2, 1.3), frameMs: w(6.4, 1.5, .9), renderSkip: 12, renderAll: 216000, encSkip: 3, encAll: 215400, kbps: Math.round(w(6000, 350, .5)),
    stream: { on: true, reconnecting: false, time: new Date((t % 86400) * 1000).toISOString().slice(11, 19), ms: 0, bytes: 0, drop: 41, all: 215400, congestion: Math.max(0, w(.08, .08, .4)) }, rec: { on: false, paused: false, time: '', bytes: 0 } }); });
app.post('/api/obs/mute', async (req, res) => { try { if (!obsOk()) throw new Error('Movie Royal is switched off for OBS.'); res.json({ ok: true, ...(await obs.muteInput(String(req.body?.name || ''), !!req.body?.muted)) }); } catch (e) { res.status(400).json({ error: e.message }); } });
/* 🧪 pretend levels for 12 seconds (no OBS needed): a mic that talks, desktop sound, music, and one that is muted */
app.post('/api/test/obs-meters', (req, res) => {
  clearInterval(meters.fakeT); metersStop(); const t0 = Date.now(); let talk = 0;
  meters.fakeT = setInterval(() => { const t = (Date.now() - t0) / 1000; if (t > 12) { clearInterval(meters.fakeT); meters.fakeT = null; return broadcast({ type: 'obsMeters', state: 'testDone' }, 'control'); }
    talk = Math.random() < .08 ? Math.random() : talk * .93; const w = (a, f, n) => Math.round((a + Math.sin(t * f) * 6 + (Math.random() - .5) * n) * 10) / 10;
    broadcast({ type: 'obsMeters', test: true, list: { '🎙️ Mic (pretend)': { db: [w(-48 + talk * 46, 3, 5), w(-48 + talk * 46, 3, 5)], muted: false }, '🖥️ Desktop audio (pretend)': { db: [w(-24, 1.3, 8), w(-26, 1.7, 8)], muted: false }, '🎵 Music (pretend)': { db: [w(-14, .8, 5), w(-13, .9, 5)], muted: false }, '🔇 Muted one (pretend)': { db: [w(-20, 2, 6), w(-20, 2, 6)], muted: true } } }, 'control'); }, 90);
  res.json({ ok: true, secs: 12 });
});
/* 🔊 sound alerts in EVERY OBS scene (1.124.1, Derek: "sound effect should play on every scene"): one shared browser source, kept in new scenes by 🔄 Keep OBS up to date */
const sfxUrl = () => `http://localhost:${PORT}/soundboard.html`;
const sfxWanted = () => db.settings.sfxObs === true || (db.settings.sfxObs == null && (db.chatbot?.commands || []).some(c => c.sound || c.soundMissing));
/* 🎚️ (1.140.0, Derek: "auto route out music to vod so can play dmca music without getting muted vod… stream can still hear it… all the other app sounds play on vod") song request music out of the Twitch VOD: it plays in its own OBS source with the VOD track unticked */
const musicUrl = () => `http://localhost:${PORT}/songplayer.html`;
async function musicObs(on, o = {}) {
  if (on && !feat('songs')) throw new Error('Song requests are not part of this edition.');
  if (on && !obsOk()) throw new Error('Movie Royal is switched off for OBS: turn on 🎥 Let Movie Royal use OBS in Settings → 🎥 OBS first.');
  const so = songs.opts(); return obs.musicSource(!!on, musicUrl(), { monitor: so.vodMonitor !== false, fixVod: !!o.fixVod });
}
app.get('/api/songs/vod', async (req, res) => { const o = songs.opts(), out = { on: !!o.vodRoute, monitor: o.vodMonitor !== false, players: songPlayers(), url: musicUrl() }; try { out.obs = await obs.musicState(); } catch (e) { out.obsError = e.message; } res.json(out); });
app.post('/api/songs/vod', async (req, res) => { const b = req.body || {};
  try { if (!feat('songs')) throw new Error('Song requests are not part of this edition.');
    if ('monitor' in b) songs.setOpts({ vodMonitor: !!b.monitor }); const want = 'on' in b ? !!b.on : !!songs.opts().vodRoute; let r = {};
    if (want || 'on' in b) r = await musicObs(want, { fixVod: !!b.fixVod }); /* (OBS first: the switch only flips when OBS took it) */
    if ('on' in b) { songs.setOpts({ vodRoute: want }); if (!want) { live.sp = { src: '' }; broadcast({ type: 'spLoad', src: '' }, 'songplay'); } act('stream', want ? 'Song request music now plays through OBS, off the Twitch VOD track' : 'Song request music plays in the app again (it is on the VOD)', { icon: '🎚️', kind: 'vodRoute' }); }
    broadcast({ type: 'songs' }, 'control'); pushState(); res.json({ ok: true, on: !!songs.opts().vodRoute, players: songPlayers(), ...r });
  } catch (e) { res.status(400).json({ error: e.message }); } });
app.post('/api/songs/player', (req, res) => { const b = req.body || {}; /* the Chat tab's remote control for the music player in OBS */
  if ('src' in b) { const src = String(b.src || ''); if (src && !/^https:\/\/www\.youtube(-nocookie)?\.com\/embed\//.test(src)) return res.status(400).json({ error: 'Not a YouTube player address.' }); live.sp = { src, at: Date.now() }; broadcast({ type: 'spLoad', src }, 'songplay'); }
  if (b.cmd && typeof b.cmd.func === 'string' && /^[a-zA-Z]{3,30}$/.test(b.cmd.func)) broadcast({ type: 'spCmd', cmd: { func: b.cmd.func, args: Array.isArray(b.cmd.args) ? b.cmd.args.slice(0, 4) : [] } }, 'songplay');
  res.json({ ok: true, players: songPlayers() });
});
app.get('/api/test/song-vod', (req, res) => { /* 🧪 the parts of "music off the VOD" that can be checked without OBS */
  const rows = [], add = (what, ok, got) => rows.push({ what, ok: !!ok, got: String(got) }), page = (() => { try { return fs.readFileSync(path.join(ROOT, 'public', 'songplayer.html'), 'utf8'); } catch { return ''; } })();
  add('The music player page for OBS is in the app', /role=songplay/.test(page), page ? 'songplayer.html' : 'missing');
  add('It only ever loads YouTube players', /youtube\(-nocookie\)\?\\\.com\\\/embed/.test(page), 'checked');
  add('The setting is saved with the song request settings', 'vodRoute' in { vodRoute: songs.opts().vodRoute ?? false }, songs.opts().vodRoute ? 'on' : 'off');
  add('Music players connected right now (OBS has the source open)', true, songPlayers());
  res.json({ ok: rows.every(x => x.ok), rows, on: !!songs.opts().vodRoute, players: songPlayers() });
});
async function sfxObsSource(on) {
  if (on && !obsOk()) throw new Error('Movie Royal is switched off for OBS: turn on 🎥 Let Movie Royal use OBS in Settings → 🎥 OBS first.');
  const r = await obs.sfxSource(!!on, sfxUrl()); db.settings.sfxObs = !!on; save(); pushState(); return r;
}
const sfxSoon = () => { if (db.settings.obsKeep !== false && db.settings.sfxObs == null && sfxWanted()) setTimeout(() => obsSync('sounds').catch(() => {}), 3000); }; /* (the first sound alert: put the sound page in OBS without waiting 10 min) */
app.post('/api/obs/sfx-source', async (req, res) => { try { res.json({ ok: true, url: sfxUrl(), ...(await sfxObsSource(!!req.body?.on)) }); } catch (e) { res.status(400).json({ error: e.message }); } });
/* 🍿 movie night leaderboard browser source in OBS (1.116.0): added to the scenes you pick, see-through around the board */
const mnUrl = () => `http://localhost:${PORT}/movienight.html`;
async function mnObsSource(on, scenes) {
  if (on && !feat('movienight')) throw new Error('Movie night voting is not part of this edition.');
  if (on && !obsOk()) throw new Error('Movie Royal is switched off for OBS: turn on 🎥 Let Movie Royal use OBS in Settings → 🎥 OBS first.');
  if (on && Array.isArray(scenes)) { if (!scenes.length) throw new Error('Pick at least one OBS scene for it.'); db.settings.mnScenes = scenes.map(String).slice(0, 200); }
  const pick = Array.isArray(db.settings.mnScenes) && db.settings.mnScenes.length ? db.settings.mnScenes : null;
  const mo = movienight.opts(), r = await obs.mnSource(!!on, mnUrl(), pick, { side: mo.side, at: mo.at });
  db.settings.mnObs = !!on; save(); pushState(); return r;
}
app.post('/api/obs/mn-source', async (req, res) => { try { res.json({ ok: true, url: mnUrl(), ...(await mnObsSource(!!req.body?.on, req.body?.scenes)) }); } catch (e) { pushState(); res.status(400).json({ error: e.message }); } });
app.post('/api/obs/roll-source', async (req, res) => { try { res.json({ ok: true, url: rollUrl(), ...(await rollObsSource(!!req.body?.on, req.body?.scenes)) }); } catch (e) { pushState(); res.status(400).json({ error: e.message }); } });
app.post('/api/vr/source', async (req, res) => { try { res.json({ ok: true, ...(await choiceSource(!!req.body?.on, req.body?.scenes)) }); } catch (e) { pushState(); res.status(400).json({ error: e.message }); } });
app.post('/api/test/vr', (req, res) => { // 🧪 pretend someone redeemed one
  const kind = String(req.body?.kind || ''); if (!VR[kind]) return res.status(400).json({ error: 'Which reward?' });
  if (vrOff(kind)) return res.status(400).json({ off: true, error: `That reward is switched off (Settings → 💰 Rewards & prices → 🎁 Viewer rewards), so nothing happens.` }); // (switched off: redeems do nothing)
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
  for (const [title, kind] of Object.entries(st.raceRewards || {})) rewards.push(R('chat', 'race:' + kind, title, ({ boost: '💨 Race: boost', shield: '🛡️ Race: shield', oil: '🛢️ Race: drop oil', rocket: '🚀 Race: rocket straight ahead', nuke: '☢️ Race: NUKE (wipes out everyone else)' })[kind] || kind, st.raceCosts?.[kind]));
  for (const [title, kind] of Object.entries(st.stormRewards || {})) rewards.push(R('battle', 'storm:' + kind, title, STORM_INFO[kind]?.what || kind, st.stormCosts?.[kind]));
  for (const [title, who] of Object.entries(st.monkeyRewards || {})) rewards.push(R('battle', 'monkey:' + who, title, MONKEY_INFO[who]?.what || who, st.monkeyCosts?.[who]));
  const WN = { respin: '🔁 Respin', move: '↕️ Move a spot', up: '⬆️ Move up', down: '⬇️ Move down', grow: '📈 Grow a spot', shrink: '📉 Shrink a spot', double: '✌️ Double trouble', stop: '🛑 Force stop' };
  for (const [k, title] of Object.entries(W.rewards || {})) if (title) rewards.push(R('wheel', 'wheel:' + k, title, WN[k] || k, W.costs?.[k]));
  for (const [k, d] of Object.entries(VR)) rewards.push(R('viewer', 'vr:' + k, vrTitle(k), ({ hydrate: '💧 Hydrate (pop-up + chugging sound)', stretch: '🙆 Stretch (pop-up + stretching sound)', hat: '🎩 Pick a hat (they pick from your hat list in chat)', choice: "🎉 Viewer's choice (confetti, balloons, big pop-up)" })[k], db.settings.vrCosts?.[k] ?? d.cost));
  if (feat('eggs')) rewards.push(R('viewer', 'egg:buy', eggs.opts().buyTitle, '🥚 Buy an egg (egg game: one more egg for their nest)', eggs.opts().buyCost));
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
      else if (key.startsWith('race:')) { (db.settings.raceCosts ||= {})[key.slice(5)] = cost; }
      else if (key.startsWith('storm:')) { (db.settings.stormCosts ||= {})[key.slice(6)] = cost; }
      else if (key.startsWith('monkey:')) { (db.settings.monkeyCosts ||= {})[key.slice(7)] = cost; }
      else if (key === 'raid') db.settings.raidCost = cost;
      else if (key.startsWith('vr:')) (db.settings.vrCosts ||= {})[key.slice(3)] = cost;
      else if (key === 'egg:buy') { eggs.data().opts.buyCost = cost; broadcast({ type: 'eggs' }, 'control'); const kw = feat('kick') && kick.watched('egg'); if (kw) kick.updateReward(kw.id, { cost }).then(() => { kw.cost = cost; save(); }).catch(e => console.error('[kick] egg price:', e.message)); }
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
  if (key === 'madeKirbportions' && !edHas('kirbWheel')) continue; /* 🎭 editions without the Kirb wheels */
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
app.get('/api/wheel', (req, res) => { const w = wheel.W(); res.json({ wheels: w.wheels, activeId: w.activeId, show: w.show, last: w.last || null, reveal: wheel.revealState(), rewards: w.rewards, costs: w.costs, pointsOn: w.pointsOn !== false, chatOn: w.chatOn !== false, ver: w.ver || 0, historyCount: w.history.length, palette: wheel.PAL, canPoints: !!twitch.status.userId, types: wheel.TYPES, mine: { ...w.mine, name: `${streamerName()}'s spins` }, bank: Object.values(w.bank).sort((a, b) => b.spins - a.spins || a.name.localeCompare(b.name)), grants: w.grants.slice(-300).reverse(), boosts: w.boosts, auto: w.auto, redeemLog: w.redeemLog, donations: { ...donations.status, se: !!db.settings.seJwt, sl: !!db.settings.slToken, seState: donations.status.se, slState: donations.status.sl }, cmd: w.cmd, streamer: streamerName(), round: wheel.getRound(), undoN: wheel.undoCount(), folders: w.folders, final: w.final || null, bringBack: w.bringBack, live: !!db.live, obs: { set: !!(db.settings.obsMic || db.settings.obsCam || db.settings.obsPassword), ...obs.status } }); });
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
  if (Array.isArray(b.entries)) { const before = w.entries.map(e => ({ ...e })); w.entries = b.entries.slice(0, 5000).map(wheel.cleanEntry); wheel.setupEdit(w, before); } // (↺ what you change here is part of the setup Reset wheel goes back to)
  if (b.opts && typeof b.opts === 'object') { const o = b.opts, cur = w.opts; for (const k of ['speed', 'growPct']) if (o[k] != null) cur[k] = Math.max(k === 'speed' ? .1 : 1, Math.min(k === 'speed' ? 5 : 50, Number(o[k]) || (k === 'speed' ? 1 : 10))); for (const k of ['confetti', 'ticks', 'winSound', 'recent', 'showPct', 'chat', 'bankRespin', 'rules']) if (o[k] != null) cur[k] = !!o[k]; if (o.round) { if (o.round.on != null) cur.round.on = !!o.round.on; if (o.round.len != null) cur.round.len = Math.max(1, Math.min(600, Number(o.round.len) || 2)); if (o.round.unit) cur.round.unit = o.round.unit === 'sec' ? 'sec' : 'min'; } if (o.collide) { if (o.collide.on != null) cur.collide.on = !!o.collide.on; if (o.collide.secs != null) cur.collide.secs = Math.max(1, Math.min(120, Number(o.collide.secs) || 5)); } for (const g of ['points', 'pop']) if (o[g]) for (const [k, v] of Object.entries(o[g])) if (k in cur[g]) cur[g][k] = !!v; if (o.void) { for (const k of ['on', 'doomsday', 'monthly']) if (o.void[k] != null) cur.void[k] = !!o.void[k]; if (o.void.landings != null) cur.void.landings = Math.max(1, Math.min(100, Math.round(Number(o.void.landings) || 5))); if (o.void.label) cur.void.label = String(o.void.label).slice(0, 40); if (o.void.weight != null) cur.void.weight = Math.max(.1, Number(o.void.weight) || 1); if (/^#[0-9a-f]{6}$/i.test(o.void.color || '')) cur.void.color = o.void.color; } }
  wheel.syncVoid(w);
  if (b.look && typeof b.look === 'object') w.look = { ...w.look, ...Object.fromEntries(Object.entries(b.look).filter(([k, v]) => ['bg', 'bgImage', 'rim', 'pointer', 'lines', 'textColor', 'font', 'hub', 'hubImage'].includes(k) ? typeof v === 'string' && v.length < 300 : k === 'bulbs' ? typeof v === 'boolean' : k === 'textScale' ? Number(v) > 0 : false)) };
  wheelChanged(); res.json({ ok: true });
});
app.delete('/api/wheel/:id', (req, res) => { const w = wheel.W(); if (w.wheels.length <= 1) return res.status(400).json({ error: 'You need at least one wheel.' }); w.wheels = w.wheels.filter(x => x.id !== req.params.id); wheel.W(); wheelChanged(); res.json({ ok: true }); });
app.post('/api/wheel/:id/duplicate', (req, res) => { const o = wheel.getWheel(req.params.id), b = req.body || {}; if (!o) return res.status(404).json({ error: 'No such wheel' }); const w = wheel.newWheel(String(b.name || '').trim() || o.name + ' (copy)', o.entries.filter(e => e.type !== 'void').map(e => { const c = { ...e, id: null, voided: null }; if (b.resetSizes) c.weight = 1; if (b.resetCounts !== false && (c.type === 'countdown' || c.type === 'autocount')) { c.count = c.countStart; c.on = true; } if (b.keepLook === false) { c.color = null; c.image = ''; } return c; }), { title: '', folder: o.folder || '', spinSecs: o.spinSecs, removeWinner: o.removeWinner, opts: JSON.parse(JSON.stringify(o.opts)), palette: b.keepLook === false ? null : o.palette, look: b.keepLook === false ? undefined : { ...o.look } }); wheel.syncVoid(w); wheel.W().wheels.push(w); wheel.W().activeId = w.id; wheelChanged(); res.json({ ok: true, id: w.id }); });
app.post('/api/wheel/active', (req, res) => { if (!wheel.getWheel(req.body?.id)) return res.status(404).json({ error: 'No such wheel' }); wheel.W().activeId = req.body.id; wheelChanged(); res.json({ ok: true }); });
// 🧪 every test puts the right thing on stream: battle tests show the battle, wheel tests show the wheel (so the preview window shows it)
const WHEEL_TESTS = /^\/(wheel-boost|donation|wheel-land|doom-preview|doomsday|wheel-redeem|wheel-redeem-raw)$/, BATTLE_TESTS = /^\/(discord-battle|chat-join|sitout|skip-one|everyone-in|claim-chat|power|redeem|cheer|battle)$/;
function testScene(path, body) {
  if (WHEEL_TESTS.test(path)) return 'wheel';
  if (BATTLE_TESTS.test(path)) return 'battle';
  if (path === '/chat') { // pretend chat: what they typed decides
    const t = String(body?.text || '').trim().toLowerCase(), first = t.split(/\s+/)[0], cmd = wheel.W().cmd || {}, name = String(body?.name || '').toLowerCase();
    if (['up', 'down', String(cmd.respin || '!respin').toLowerCase(), String(cmd.spins || '!myspins').toLowerCase()].includes(first)) return 'wheel';
    const battleCmds = [db.settings.joinCommand || '!join', db.settings.sitOutCommand || '!sitout', db.settings.skipCommand || '!skip', db.settings.backCommand || '!imback', db.settings.twitchMoviesCommand || '!mymovies', db.settings.callCommand || '!call', db.settings.colorCommand || '!color', giveawaySettings().command || '!enter', db.settings.acceptCommand || '!accept', db.settings.passCommand || '!pass'].map(x => String(x).toLowerCase());
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
setInterval(() => { if (db.live) twitch.chatters().then(list => { chatlog.tickWatch(list); try { eggs.onWatch(list); } catch (e) { console.error('[eggs]', e.message); } }).catch(() => {}); }, 5 * 60000); // watch time while live (+ 🥚 eggs)
let badgeCache = { at: 0, map: {} };
app.get('/api/chat/recent', async (req, res) => {
  if (Date.now() - badgeCache.at > 3600000) { badgeCache = { at: Date.now(), map: await twitch.badges().catch(() => ({})) }; }
  const emotes = await chatlog.thirdPartyEmotes(twitch.broadcasterId()).catch(() => ({}));
  const sc = twitch.status.scopes || [];
  res.json({ messages: chatlog.getRecent(Number(req.query.n) || 400), alerts: chatlog.getAlerts(150), badges: badgeCache.map, emotes, channel: twitch.status.login || db.settings.twitchChannel || '',
    canChat: !!twitch.status.canChat, canMod: sc.includes('moderator:manage:banned_users'), canDelete: sc.includes('moderator:manage:chat_messages'), canWatch: sc.includes('moderator:read:chatters'), both: kick.both(), kick: kick.on() });
});
app.get('/api/chat/search', (req, res) => res.json(chatlog.search({ q: req.query.q, login: req.query.login, days: Math.min(365, Number(req.query.days) || 30) })));
app.get('/api/chat/names', (req, res) => res.json(chatlog.names(String(req.query.q || ''))));
app.post('/api/chat/say', wTry(async b => { /* 💬 the app's own chat box. (1.132.4) A command (!sr …) goes out exactly as typed, as you: with the bot's name tag in front (or from the bot account) nothing recognised it as a command */
  const text = String(b.text || '').trim().slice(0, 490); if (!text) return {};
  if (!/^!\S/.test(text)) { await twitch.say(text); return { command: false }; }
  const me = twitch.status.login || db.owner?.login || 'streamer', mine = () => twitchHandlers.chat({ pretend: true, login: String(me).toLowerCase(), name: db.owner?.name || me, text, userId: twitch.status.userId || null, emotes: '', badgeList: 'broadcaster/1', badges: { broadcaster: true, mod: false, vip: false, sub: false, tier: 0, months: 0 } });
  if (b.test) { /* 🧪 nothing goes to the real chat: run it as you and collect what the app answers */
    twitch.pretend.until = Date.now() + 10 * 60000; const replies = [], f = t => replies.push(t); twitch.sayListeners.add(f);
    try { await mine(); await new Promise(r => setTimeout(r, 900)); } finally { twitch.sayListeners.delete(f); }
    return { command: true, test: true, as: me, replies };
  }
  if (twitch.route.on()) { await twitch.route.say(text); return { command: true, as: me }; } /* 🟢 Kick: its chat feed brings it back like anyone's message */
  if (!twitch.status.canChat) { if (Date.now() < twitch.pretend.until) { await mine(); return { command: true, as: me, pretend: true }; } throw new Error('Sign in with Twitch first, so the app can type in your chat'); }
  await twitch.sayAsMe(text); /* Twitch chat sends it back to the app like any chat message, from you (the streamer), and the command runs */
  return { command: true, as: me };
}));
/* 📝 (1.132.5, Derek: "a stream detail dock… change title, category, those type of things") Chat tab box 📝 Stream details */
const SD_CATS = [['509658', 'Just Chatting'], ['26936', 'Music'], ['509663', 'Special Events'], ['417752', 'Talk Shows & Podcasts'], ['27471', 'Minecraft'], ['509660', 'Art'], ['488190', 'Poker'], ['518203', 'Sports']];
const sdTags = t => { const l = (Array.isArray(t) ? t : String(t || '').split(/[,\n]+/)).map(x => String(x).replace(/[^\p{L}\p{N}]/gu, '').slice(0, 25)).filter(Boolean); return [...new Set(l.map(x => x.toLowerCase()))].map(k => l.find(x => x.toLowerCase() === k)).slice(0, 10); }; /* Twitch: up to 10 tags, 25 letters each, no spaces or symbols */
const sdPretend = () => (live.sdTest && Date.now() < live.sdTest.until ? live.sdTest : null);
app.get('/api/stream/details', async (req, res) => {
  const t = sdPretend(); if (t) return res.json({ ok: true, pretend: true, can: true, signedIn: true, details: t.d });
  if (kick.on()) return res.json({ ok: false, why: 'kick', msg: "Kick is picked as your platform: the title and category can only be changed for Twitch from here." });
  if (!twitch.status.userId) return res.json({ ok: false, why: 'signin', msg: 'Sign in with Twitch first (Settings → 💜 Twitch).' });
  try { res.json({ ok: true, can: twitch.canDetails(), signedIn: true, details: await twitch.streamDetails() }); } catch (e) { res.json({ ok: false, why: 'error', msg: e.message }); }
});
app.post('/api/stream/details', wTry(async b => {
  const d = {}; if ('title' in b) { d.title = String(b.title || '').trim().slice(0, 140); if (!d.title) throw new Error('The title is empty: type a title first.'); }
  if ('gameId' in b) d.gameId = String(b.gameId || ''); if ('tags' in b) d.tags = sdTags(b.tags);
  const t = sdPretend(); if (t) { Object.assign(t.d, d, 'game' in b ? { game: String(b.game || '') } : {}); return { pretend: true, details: t.d }; }
  if (kick.on()) throw new Error('Kick is picked as your platform: the title and category can only be changed for Twitch from here.');
  await twitch.setStreamDetails(d); const now = await twitch.streamDetails();
  act('stream', `Stream details changed: “${now.title}”${now.game ? ' · ' + now.game : ''}`, { icon: '📝', kind: 'streamDetails' });
  return { details: now };
}));
app.get('/api/stream/categories', async (req, res) => {
  const q = String(req.query.q || '').trim(); if (!q) return res.json({ list: [] });
  if (sdPretend()) return res.json({ list: SD_CATS.filter(c => c[1].toLowerCase().includes(q.toLowerCase())).map(([id, name]) => ({ id, name, box: '' })), pretend: true });
  try { res.json({ list: await twitch.searchCategories(q) }); } catch (e) { res.json({ list: [], error: e.message }); }
});
app.post('/api/test/stream-details', (req, res) => { /* 🧪 10 minutes of pretend details: nothing goes to Twitch */
  if (req.body?.off) { live.sdTest = null; return res.json({ ok: true, off: true }); }
  live.sdTest = { until: Date.now() + 10 * 60000, d: { title: '🧪 Pretend stream title (test)', game: 'Just Chatting', gameId: '509658', tags: ['English', 'Chill', 'Test'], lang: 'en' } };
  res.json({ ok: true, tags: sdTags('Family Friendly, chill!!, CHILL, ' + 'x'.repeat(40)) });
});
app.post('/api/chat/mod', wTry(async b => {
  const login = String(b.login || '').replace(/^@/, '').toLowerCase();
  if (b.action === 'delete') await twitch.deleteMessage(b.id);
  else if (b.action === 'timeout') await twitch.timeout(login, Number(b.seconds) || 600, b.reason || '');
  else if (b.action === 'ban') await twitch.timeout(login, 0, b.reason || '');
  else if (b.action === 'unban') await twitch.unban(login);
  else throw new Error('Unknown action');
  return {};
}));
app.get('/api/test/person-stats', (req, res) => res.json(pstats.demo())); // 🧪 the profile's Stats tab rules with a pretend person (nothing saved)
// 🎭 Chat commands the Editions list can switch off per edition ("chat:<name>" in editions.json `off`): [id, the words that start it]
const CHAT_CMDS = [['chat:id', () => db.settings.idCommand], ['chat:call', () => db.settings.callCommand], ['chat:help', () => db.settings.helpCommand], ['chat:mymovies', () => db.settings.twitchMoviesCommand], ['chat:color', () => db.settings.colorCommand],
  ['chat:accept', () => [db.settings.acceptCommand, db.settings.passCommand]], ['chat:sitout', () => [db.settings.sitOutCommand, db.settings.backCommand]], ['chat:skip', () => db.settings.skipCommand], ['chat:clip', () => db.settings.clipCommand], ['chat:join', () => db.settings.joinCommand],
  ['chat:respin', () => ['!respin', '!myspins']], ['chat:site', () => db.settings.siteCommand], ['chat:bday', () => birthdays.opts().command], ['chat:vote', () => [movienight.opts().command, movienight.opts().myCommand]],
  ['chat:sr', () => { const o = songs.opts(); return [o.command, o.nowCommand, o.queueCommand, o.mineCommand, o.wrongCommand]; }], ['chat:songskip', () => { const o = songs.opts(); return [o.voteCommand, o.skipCommand, o.volCommand]; }],
  ['chat:quote', () => ['!quote', '!addquote', '!delquote']], ['chat:addcom', () => ['!addcom', '!editcom', '!delcom', '!command']]];
// 🧩 (1.129.0) the app's own chat commands, one row each in Chat bot → Commands (only the ones this edition has). set = rename it (where the app lets you).
const sSet = k => c => { db.settings[k] = c; save(); pushState(); };
const APP_CMDS = () => { const L = [], has = id => edHas(id), A = (key, group, label, why, ok, get, set, own) => { if (ok) L.push({ key, group, label, why, words: get, set, own }); };
  const so = songs.opts(), mo = movienight.opts(), eo = eggs.opts(), bo = birthdays.opts();
  A('join', '⚔️ Battles', 'Join a chat battle', 'Jumps into the chat battle / giveaway that is open', has('chat:join') && (has('chatBattle') || has('battle')), () => db.settings.joinCommand, sSet('joinCommand'));
  A('mymovies', '🎬 Movies', 'My movies', 'Lists their Discord movie picks + luck', has('chat:mymovies') && has('movies'), () => db.settings.twitchMoviesCommand, sSet('twitchMoviesCommand'));
  A('accept', '🎬 Movies', 'Accept a win', 'The winner says yes to their movie', has('chat:accept') && has('movies'), () => db.settings.acceptCommand, sSet('acceptCommand'));
  A('pass', '🎬 Movies', 'Pass on a win', 'The winner passes: their movie goes back in', has('chat:accept') && has('movies'), () => db.settings.passCommand, sSet('passCommand'));
  A('sitout', '🎬 Movies', 'Sit out tonight', "Takes their movies out of tonight's battles", has('chat:sitout') && has('movies'), () => db.settings.sitOutCommand, sSet('sitOutCommand'));
  A('imback', '🎬 Movies', "I'm back", 'Puts their movies back in', has('chat:sitout') && has('movies'), () => db.settings.backCommand, sSet('backCommand'));
  A('skip', '🎬 Movies', 'Skip a movie', 'One of their movies sits out the next battle', has('chat:skip') && has('movies'), () => db.settings.skipCommand, sSet('skipCommand'));
  A('call', '⚔️ Battles', 'Call the winner', 'Guess who wins the battle for luck', has('chat:call') && (has('battle') || has('chatBattle')), () => db.settings.callCommand, sSet('callCommand'));
  A('id', '⚔️ Battles', 'Pick man / woman', 'How their character looks in battles', has('chat:id') && (has('battle') || has('chatBattle')), () => db.settings.idCommand, sSet('idCommand'));
  A('color', '⚔️ Battles', 'Ball color', 'Picks the color of their ball', has('chat:color') && (has('battle') || has('chatBattle')), () => db.settings.colorCommand, sSet('colorCommand'));
  A('help', '💬 Chat', 'All commands', 'Lists the chat commands', has('chat:help'), () => db.settings.helpCommand, sSet('helpCommand'));
  A('respin', '🎡 Wheel', 'Use a saved respin', 'Spends one of their saved respins', has('chat:respin') && has('wheel'), () => '!respin', null);
  A('myspins', '🎡 Wheel', 'My respins', 'How many saved respins they have', has('chat:respin') && has('wheel'), () => '!myspins', null);
  A('clip', '💬 Chat', 'Clip', 'Clips the last minute of the stream', has('chat:clip'), () => db.settings.clipCommand, sSet('clipCommand'), 'Who can !clip also has its own boxes in Settings → 💜 Twitch → Clips');
  A('bday', '🎂 Birthdays', 'Save my birthday', 'Saves their birthday (month + day)', has('chat:bday') && bo.on !== false, () => bo.command, c => birthdays.setOpts({ command: c }, mo.command));
  A('vote', '🍿 Movie night', 'Vote', "Votes for one of tonight's movies", has('chat:vote') && feat('movienight') && movienight.live(), () => mo.command, c => movienight.setOpts({ command: c }));
  { const wo = watchlist.opts(); A('suggest', '🍿 Movie night', 'Suggest a movie', 'Adds a movie to the watchlist (History → 📋 Watchlist)', feat('movienight') && !!wo.command, () => wo.command, c => watchlist.setOpts({ command: c })); A('rating', '🍿 Movie night', 'Movie rating', 'Says what the movie was rated on IMDb', feat('movienight') && !!wo.rateCommand, () => wo.rateCommand, c => watchlist.setOpts({ rateCommand: c })); }
  A('myvotes', '🍿 Movie night', 'My votes', 'Who they voted for + votes / changes left', has('chat:vote') && feat('movienight'), () => mo.myCommand, c => movienight.setOpts({ myCommand: c }));
  for (const [k, label, why] of [['command', 'Song request', 'Asks for a song'], ['nowCommand', 'Song playing', "Says what's playing"], ['queueCommand', 'Song queue', "What's coming up"], ['mineCommand', 'My songs', 'Their songs in the queue'], ['wrongCommand', 'Wrong song', 'Takes their last song back out']])
    A('song:' + k, '🎵 Songs', label, why, has('chat:sr') && feat('songs') && !!so[k], () => so[k], c => songs.setOpts({ [k]: c }));
  for (const [k, label, why] of [['voteCommand', 'Vote to skip a song', 'Counts a skip vote (mods / the requester skip at once)'], ['skipCommand', 'Skip the song', 'Mods: skips the song'], ['volCommand', 'Song volume', 'Mods: changes the volume']])
    A('song:' + k, '🎵 Songs', label, why, has('chat:songskip') && feat('songs') && !!so[k], () => so[k], c => songs.setOpts({ [k]: c }));
  for (const [k, label, why] of [['eggCommand', 'My egg', 'How close their egg is to hatching'], ['petCommand', 'My creature', 'The creature they have out'], ['petsCommand', 'All my creatures', 'Every creature they have'], ['equipCommand', 'Pick my creature', 'Sends a different creature out'], ['battleCommand', 'Creature battle', 'Challenges someone'], ['linkCommand', 'Link Twitch + Kick', 'Joins their two profiles'], ['topCommand', 'Top players', 'The best creature trainers'], ['skillsCommand', 'Skills', "Their creature's skills"], ['powersCommand', 'Powers', 'The powers they can equip'], ['powerCommand', 'Equip a power', 'Puts a power on their creature']])
    A('egg:' + k, '🥚 Eggs', label, why, feat('eggs'), () => eo[k], c => eggs.setOpts({ [k]: c }));
  A('quote', '📝 Quotes', 'Quote', 'Shows a quote', has('chat:quote'), () => '!quote', null);
  A('addquote', '📝 Quotes', 'Add a quote', 'Mods: adds a quote', has('chat:quote'), () => '!addquote', null, 'Only mods, always');
  A('delquote', '📝 Quotes', 'Remove a quote', 'Mods: removes a quote', has('chat:quote'), () => '!delquote', null, 'Only mods, always');
  A('addcom', '🤖 Chat bot', 'Add / change / remove a command', 'Mods: !addcom / !editcom / !delcom / !command', has('chat:addcom'), () => ['!addcom', '!editcom', '!delcom', '!command'], null, 'Only mods, always');
  return L; };
appcmds.setHooks({ list: APP_CMDS, allowed: (m, p) => chatbot.allowed(m, p), say: t => twitch.say(t), channel: () => db.owner?.login || twitch.status.login || '', sound: (f, v) => sfxPlay(f, v), kick: () => feat('kick'), changed: () => broadcast({ type: 'chatbot' }, 'control'),
  sounds: () => { try { return fs.readdirSync(path.join(DATA, 'sounds', 'sfx')).filter(f => /\.(mp3|wav|ogg|m4a|flac|aac|opus)$/i.test(f)).sort(); } catch { return []; } } });
app.get('/api/appcmds', (req, res) => res.json(appcmds.info()));
app.post('/api/appcmds', (req, res) => { try { res.json({ ok: true, list: appcmds.set(req.body?.key, req.body || {}) }); } catch (e) { res.status(400).json({ error: e.message }); } });
app.get('/api/test/appcmds', async (req, res) => res.json({ ...(await appcmds.demo()), count: appcmds.list().length })); // 🧪 the rules with a pretend command (nothing said or saved)
function chatCmdOff(m) { const w = String(m?.text || '').trim().split(/\s+/)[0].toLowerCase(); if (w[0] !== '!') return false; try { return CHAT_CMDS.some(([id, get]) => !edHas(id) && [].concat(get()).some(c => c && String(c).toLowerCase() === w)); } catch { return false; } }
/* 💬 (1.141.0, Derek: "update buttons on test chat for everything that is needed and make them per edition") the pretend chat's quick buttons: one per chat command THIS edition has (with something sensible typed after it), grouped */
const PC_SAMPLE = { skip: ' 1', call: ' 1', id: ' woman', color: ' red', bday: ' 3/14', vote: ' 1', suggest: ' Jaws', rating: ' Jaws', 'song:command': ' never gonna give you up', 'song:volCommand': ' 50', 'egg:equipCommand': ' 1', 'egg:battleCommand': ' pretend_bo', 'egg:powerCommand': ' 1', addquote: ' This is a test quote', delquote: ' 1' };
app.get('/api/test/chat-buttons', (req, res) => { const out = [], seen = new Set(), add = (group, label, text, tip) => { const k = text.toLowerCase(); if (!text || seen.has(k)) return; seen.add(k); out.push({ group, label, text, tip: tip || '' }); };
  if (edHas('movies') || edHas('battle') || edHas('chatBattle')) add('⚔️ Battles', "✋ I'm here!", "I'm here! 🍿", 'A plain chat message (counts as being here)');
  for (const c of APP_CMDS()) { let w = ''; try { w = [].concat(c.words()).filter(Boolean)[0] || ''; } catch {} if (!w || chatCmdOff({ text: w })) continue; if (c.key === 'addcom') { add(c.group, '!addcom', '!addcom !testhello Hello from a test command!', c.why); continue; } add(c.group, w, w + (PC_SAMPLE[c.key] || ''), c.why); }
  try { for (const r of chatbot.readyList()) if (r.id && r.name) add('🤖 Chat bot', r.name, r.name + (r.key === 'so' ? ' pretend_ana' : ''), r.why); } catch {}
  try { for (const c of chatbot.data().commands.filter(c => !c.ready && c.on !== false).slice(0, 8)) add(c.sound || c.soundMissing ? '🔊 Sound alerts' : '🤖 Chat bot', c.name, c.name, 'One of your own commands'); } catch {}
  if (edHas('tab:wheel') && pointsOn()) { add('🎡 Wheel', 'up', 'up', 'After a Move redeem: move the spot up'); add('🎡 Wheel', 'down', 'down', 'After a Move redeem: move the spot down'); }
  res.json({ buttons: out, redeem: edHas('tab:wheel') && pointsOn(), movies: edHas('movies'), winner: edHas('battle') || edHas('chatBattle') || edHas('movies') });
});
app.get('/api/test/chat-off', (req, res) => res.json({ rows: CHAT_CMDS.map(([id, get]) => { let words = []; try { words = [].concat(get()).filter(Boolean); } catch {} return { id, words, on: edHas(id) }; }) })); // 🧪 which chat commands this edition has
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
    bday: (() => { const md = birthdays.days()[login]; return md ? { day: birthdays.nice(md), today: md === birthdays.mmdd(birthdays.dayOf()) } : null; })(), // 🎂 their birthday, if they told chat (never a year)
    slim: !edHas('battle'), // 🎭 an edition without battles: no character, respins, movies or games on the profile
    suggested: feat('movienight') ? watchlist.mine(login) : null, // 🙋 the movies they suggested for the watchlist (with the rating once it was watched)
    acts: feat('songs') || feat('movienight') ? pstats.of(login) : null, // 📊 the Stats tab: songs asked for, movie votes, skips, commands (newest first)
    songs: feat('songs') ? songs.mine(login) : null, // 🎵 their songs in the queue, with the place each one has
    look: (() => { const l = looks.lookOf(discordId) || looks.lookOf(looks.discordFor(login)); return l ? looks.nums(l) : null; })(), // 🎨 their own /character
    login, name: tw?.name || v?.name || bank?.name || dp?.name || login, avatar: tw?.avatar || null, twitchId: tw?.id || v?.id || null, createdAt: tw?.createdAt || null, about: tw?.about || '',
    followedAt: follow === undefined ? (v?.followedAt || undefined) : follow, url: login ? `https://twitch.tv/${login}` : null,
    sub: v ? { now: !!v.sub, months: v.subMonths || 0 } : null, mod: !!v?.mod, vip: !!v?.vip, streak: chatlog.watchStreak(v), twitchStreak: v?.streak || 0, streams: (v?.watched || []).length, lastStreams: chatlog.lastStreams(v), color: v?.color || null,
    watch: v ? { total: (v.watchMins || 0) + (v.watchOld || 0), stream: v.streamKey === (db.stream?.startedAt || 0) ? v.streamWatch || 0 : 0 } : null,
    chats: v ? { stream: v.streamKey === (db.stream?.startedAt || 0) ? v.streamMsgs || 0 : 0, month: v.byMonth?.[mon] || 0, year: v.byYear?.[yr] || 0, total: v.msgs || 0, first: v.first, last: v.last } : null,
    discord: dp ? (() => { // 🍀 each movie's luck (own luck + 👀 watch luck), like !mymovies shows
      const ents = getList('movies')?.entries || [], on = luckOn(), wl = watchLuckFor(dp.discordId);
      const movies = dp.active.map(m => { const e = ents.find(x => x.id === m.id), L = e ? movieLuck(e) : { own: 0, wl: 0, total: 0 }; return { ...m, luck: L.total, ownLuck: L.own, watchLuck: L.wl }; });
      return { id: dp.discordId, name: dp.name, avatar: dp.avatar, movies, watched: dp.watched, picksUsed: dp.used, max: dp.max, luckOn: on, watchLuck: wl };
    })() : null,
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
app.post('/api/wheel/reveal', wTry(b => b.close ? wheel.revealClose() : String(b.id || '').startsWith('test-') ? wheel.revealOpenTest(String(b.id)) : wheel.revealOpen(b.id))); // 🎁 open the mystery card pack / close it
app.post('/api/test/cap-join', wTry(async () => { // 🧪 the capture window shows like it does when the join timer starts, then hides after 10 s
  if (!db.settings.capWindow) throw new Error('Pick a window first: Settings → 🎥 OBS → 📺 Capture window → ⚙ Set it up.');
  await setCapture(true); live.capAutoOn = true; setTimeout(() => { if (live.capAutoOn) setCapture(false).catch(() => {}); }, 10000); return { ok: true };
}));
// 🧪 Test tab → 🎬 Scenes: straight to the last two (kind: ball = FINAL SHOWDOWN, card = a card battle's FINAL FIGHT, chars = characters' FINAL FIGHT)
app.post('/api/test/final', async (req, res) => {
  const map = String(req.body?.map || ''), kind = req.body?.kind === 'card' && cards.CARD_MAPS.find(m => m.id === map)?.charOnly ? 'chars' : String(req.body?.kind || 'ball'); // (🏴‍☠️ a character-only map: with characters)
  if (live.phase === 'lobby' || live.phase === 'running') return res.status(400).json({ error: 'A battle is going: wait for it to finish (or ↺ Reset battlefield).' });
  if (kind === 'card') { try { if (wheel.W().show) wheel.setShow(false); const finals = cards.cardMaps().filter(m => m.finalFight && !m.ball).map(m => m.id); return res.json({ ok: true, ...cards.start({ test: true, n: 3, map: finals.includes(map) ? map : 'kungfu', finalNow: true }) }); } catch (e) { return res.status(400).json({ error: e.message }); } }
  const body = { count: 3, lobby: 0, game: 40, luck: false, showdownTest: true, ...(kind === 'chars' ? { chars: true, map: map || 'kungfu' } : { map: map && mapById(map) ? map : 'classic' }) };
  try { const r = await fetch(`http://127.0.0.1:${PORT}/api/test/battle`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); res.status(r.status).json(await r.json()); }
  catch (e) { res.status(400).json({ error: e.message }); }
});
// 🧪 Test tab: what !mymovies (Twitch), /mymovies (the app's Discord bot) and the 24/7 bot answer for someone, with every movie's 🍀 luck
app.post('/api/test/spot-luck', (req, res) => { // 🧪 🎟️ wild spot luck: pretend nights of Discord movie battles the spot loses (nothing real changes)
  const mode = ['off', 'night', 'battle'].includes(req.body?.mode) ? req.body.mode : spotLuckMode(), n = Math.max(1, Math.min(6, Math.round(Number(req.body?.battles) || 3)));
  const night = (e, key, isLive) => Array.from({ length: n }, () => Math.round(spotLuckGain(e, key, isLive, mode) * 100) / 100);
  const run = isLive => { const e = { kind: 'spot', luckPct: 0 }, a = night(e, 'test-night-1', isLive), b = night(e, 'test-night-2', isLive); return { night1: a, night2: b, total: Math.round([...a, ...b].reduce((x, y) => x + y, 0) * 100) / 100 }; };
  const spots = (getList('movies')?.entries || []).filter(e => e.kind === 'spot' && e.status !== 'removed').map(e => ({ label: e.label, luck: Math.round((e.luckPct || 0) * 100) / 100, status: e.status }));
  res.json({ mode, battles: n, luckOn: luckOn(), live: run(true), notLive: run(false), liveNow: !!db.live || !!live.fakeLive, spots, per: Number(db.settings.luckPerBattle ?? 1), nightAmt: Number(db.settings.spotLuckNight ?? 1) });
});
app.post('/api/test/mymovies', async (req, res) => {
  const all = discordPeople().filter(p => p.active.length), want = String(req.body?.who || '');
  const p = all.find(x => x.discordId === want) || all[0];
  if (!p) return res.status(400).json({ error: 'Nobody has a movie in the Discord movie battle yet. Add one first (Movie Pool, or 💬 Pretend chat → pretend movie).' });
  const cmd = db.settings.twitchMoviesCommand || '!mymovies', t = await myMoviesTexts(p);
  res.json({ ok: true, name: p.name, twitch: p.twitch || '', people: all.map(x => ({ id: x.discordId, name: x.name })), id: p.discordId, luckOn: !!db.settings.luckOn, watchOn: !!getList('movies')?.watchLuck?.on, cmd, ...t });
});
async function myMoviesTexts(p) { // what Twitch chat, Movie Royal's Discord bot and the 24/7 bot answer to !mymovies / /mymovies (nothing is sent)
  let cloudTxt = null; try { const wk = await import('./cloud-worker.js'), cfg = cloud.buildConfig(), st = { cfg, queue: [], pool: (cfg.pool || []).map(e => ({ ...e })), users: JSON.parse(JSON.stringify(cfg.users || {})), links: { ...(cfg.links || {}) }, looks: {} }; cloudTxt = wk.__test?.myMoviesText(st, p.discordId) || null; } catch (e) { cloudTxt = '(could not make it: ' + e.message + ')'; }
  return { chat: `@${p.twitch || p.name} ${discord.myMoviesText(p.discordId, true)}`, discord: discord.myMoviesText(p.discordId), cloud: cloudTxt };
}
app.post('/api/test/reveal', wTry(b => { if (!wheel.W().show) wheel.setShow(true); return wheel.revealTest({ theme: b.theme || null, text: b.text, image: b.image }); })); // 🧪 a pretend mystery card (theme = a holiday to try)
app.post('/api/app-style', (req, res) => { const id = String(req.body?.id || '').replace(/[^\w-]/g, '').slice(0, 20); live.appStyle = id || null; res.json({ ok: true }); }); // 🎨 the control panel says which holiday style it shows (🎁 mystery packs match it)
app.post('/api/wheel/knock', wTry(b => ({ left: wheel.knock(Number(b.delta) || -1) })));
app.post('/api/wheel/timer', wTry(b => { wheel.roundCmd(b.cmd, b.secs); return { round: wheel.getRound() }; }));
app.get('/api/wheel/undo', (req, res) => res.json(wheel.undoList({ limit: Math.max(1, Math.min(500, Number(req.query.limit) || 60)), before: req.query.before ? String(req.query.before) : null, wheelId: req.query.wheelId ? String(req.query.wheelId) : null }))); // ⏪ newest first, a page at a time (+ ⏮️ where this wheel started)
app.post('/api/wheel/undo', wTry(b => wheel.undoTo(b.id)));
app.post('/api/wheel/folders', wTry(b => { const W0 = wheel.W(), n = String(b.name || '').trim().slice(0, 60); if (b.remove) { W0.folders = W0.folders.filter(f => f !== n); for (const x of W0.wheels) if (x.folder === n) x.folder = ''; } else if (n && !W0.folders.includes(n)) W0.folders.push(n); wheelChanged(); return { folders: W0.folders }; }));
app.post('/api/obs/test', wTry(async () => obs.test()));
// 📺 capture window on stream (Battle tab): shows a window (your browser, a YouTube video…) small in the top-left corner, through OBS
async function setCapture(on) {
  if (on && !obsOk('Cap')) throw new Error('📺 The capture window is switched off in Settings → 🎥 OBS.');
  if (!on) live.capAutoOn = false;
  try { await obs.capture(!!on); live.capture = !!on; live.captureError = null; }
  catch (e) {
    if (!on && errlog.quiet('obs', e.message)) { live.capture = false; live.captureError = null; pushState(); return { on: false }; } // (OBS is closed: nothing to hide, no message)
    live.captureError = `Couldn't ${on ? 'show' : 'hide'} the capture window: ${e.message}`; console.error('[obs] capture window:', e.message); pushState(); throw new Error(live.captureError); }
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
  if ('autoShow' in b) db.settings.capAutoShow = !!b.autoShow;
  save(); pushState();
  if (live.capture && ('window' in b || 'size' in b)) await setCapture(true).catch(() => {}); // showing: update it now
  return { window: db.settings.capWindow, size: db.settings.capSize, autoHide: !!db.settings.capAutoHide, autoShow: db.settings.capAutoShow !== false };
}));
app.post('/api/wheel/mine', wTry(b => { if (b.action === 'reset') { wheel.newStream(); return {}; } if (b.action === 'set') { wheel.W().mine.left = Math.max(0, Math.round(Number(b.left) || 0)); wheelChanged(); return {}; } return wheel.useMine(); }));
app.post('/api/wheel/bank', wTry(b => ({ spins: wheel.giveSpins(b.who, b.n, b.reason) })));
app.post('/api/wheel/grow', wTry(b => ({ pct: wheel.grow(b.entryId, Number(b.amount) || 1, b.who ? { name: String(b.who).slice(0, 40), login: String(b.who).replace(/^@/, '').toLowerCase(), source: b.money ? 'auto' : 'mod' } : {}, b.reason, b.wheelId, !!b.money) })));
app.post('/api/wheel/reset-sizes', wTry(b => { b.undo ? wheel.undoReset(b.wheelId) : wheel.resetSizes(b.wheelId); return {}; })); // ⚖️ every spot the same size
app.post('/api/wheel/reset', wTry(b => b.undo ? (wheel.undoReset(b.wheelId), {}) : wheel.resetWheel(b.wheelId))); // ↺ back to how you set it up (before the first spin)
app.get('/api/wheel/setup', (req, res) => res.json(wheel.setupDiff(String(req.query.wheelId || '')))); // what ↺ Reset wheel would change (nothing changes)
app.post('/api/test/wheel-reset', (req, res) => res.json(wheel.resetSelfTest())); // 🧪 the reset on a pretend wheel
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
app.delete('/api/history/:id', (req, res) => { const h0 = db.history.find(h => normHist(h).id === req.params.id); if (h0) act('battle', `deleted the round “${h0.winner?.label || '?'}” won from the 📜 Every round list (it stays in 🧾 Everything)`, { icon: '🗑️', who: streamerName(), kind: 'history', list: h0.listName }); db.history = db.history.filter(h => normHist(h).id !== req.params.id); historyVersion++; save(); pushState(); res.json({ ok: true }); });
app.post('/api/history/clear', (req, res) => {
  const id = req.body?.listId, name = getList(id)?.name;
  act('battle', `cleared the 📜 Every round list for “${name || id}” (🧾 Everything keeps all of it)`, { icon: '🗑️', who: streamerName(), kind: 'history', list: name });
  db.history = db.history.filter(h => !(h.listId === id || (!h.listId && h.listName === name)));
  historyVersion++; save(); pushState(); res.json({ ok: true });
});
// 🧾 History → Everything (the complete history, src/activity.js): newest first, a page at a time; never cleared
const actCats = v => String(v || '').split(',').map(x => x.trim()).filter(x => activity.CATS[x]);
app.get('/api/activity', (req, res) => {
  const r = activity.read({ before: Number(req.query.before) || Infinity, beforeSeq: req.query.before ? Number(req.query.seq) || 0 : Infinity, limit: Math.max(1, Math.min(1000, Number(req.query.limit) || 300)), cats: actCats(req.query.cats), q: String(req.query.q || '').slice(0, 80), tests: req.query.tests !== '0' });
  res.json({ ...r, cats: activity.CATS, days: activity.days().length });
});
app.get('/api/activity/export', (req, res) => { // ⬇️ a spreadsheet file (CSV) of everything (or the last N days)
  const days = Math.max(0, Number(req.query.days) || 0), from = days ? Date.now() - days * 864e5 : 0;
  res.setHeader('Content-Type', 'text/csv; charset=utf-8'); res.setHeader('Content-Disposition', `attachment; filename="movie-royal-history-${activity.dayOf(Date.now())}.csv"`);
  res.send(activity.csv({ from, cats: actCats(req.query.cats), q: String(req.query.q || '').slice(0, 80), tests: req.query.tests !== '0' }));
});
app.post('/api/test/undo-start', (req, res) => { try { res.json(wheel.undoSelfTest(Number(req.body?.n) || 14)); } catch (e) { res.status(400).json({ error: e.message }); } }); // 🧪 ⏮️ all the way back, on a pretend wheel nobody sees
app.post('/api/test/own-luck', (req, res) => { // 🧪 🍀 6 pretend battles of a pretend "stuff to do" battle with luck: who wins and everyone's luck after each one (nothing real changes)
  const real = getList(req.body?.listId), per = Number(req.body?.per) > 0 ? Math.min(100, Number(req.body.per)) : ownLuckPer(real);
  const things = ownLuckOk(real) && real.entries.filter(e => e.status === 'active').length >= 2 ? real.entries.filter(e => e.status === 'active').slice(0, 12).map(e => e.label) : ['Do 20 push-ups', 'Sing a song', 'Talk in an accent for 10 minutes', 'Play a horror game', 'Eat something spicy', 'Draw what chat says'];
  const l = { id: 'test-luck', name: '🧪 Stuff to do', type: 'text', luckOn: true, luckPer: per, entries: things.map((t, i) => ({ id: 't' + i, label: t, weight: 1, status: 'active', luckPct: 0 })) }, rounds = [];
  for (let b = 1; b <= Math.max(1, Math.min(20, Number(req.body?.battles) || 6)); b++) {
    const fighters = l.entries.map(e => ({ id: e.id, label: e.label, weight: Math.round((e.weight || 1) * (1 + (e.luckPct || 0) / 100) * 10000) / 10000 })), tot = fighters.reduce((a, f) => a + f.weight, 0);
    const win = weightedPick(fighters), chance = Object.fromEntries(fighters.map(f => [f.id, Math.round(f.weight / tot * 1000) / 10]));
    ownLuckAfter(l, win.id, fighters, true); // (the same rule a real battle uses)
    rounds.push({ n: b, winner: win.label, chance: chance[win.id], luck: l.entries.map(e => ({ label: e.label, luck: e.luckPct, chance: chance[e.id] })) });
  }
  res.json({ ok: true, per, name: ownLuckOk(real) ? real.name : null, rounds });
});
app.post('/api/test/activity', (req, res) => { // 🧪 Test tab: one pretend line, so you can see it show up (it's marked 🧪 and the 🧪 switch hides it)
  const r = act('test', String(req.body?.text || 'This is a test line from the 🧪 Test tab. Nothing else happened.').slice(0, 200), { icon: '🧪', who: streamerName(), kind: 'test', test: true });
  res.json({ ok: !!r, row: r, info: activity.info() });
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
// 🏷️ pages are sent with the name people see (TimePeace Chatbot, or the edition's own name) in place of "Movie Royal"
const brandCache = new Map();
app.use((req, res, next) => {
  if ((edAppNow() === 'Movie Royal' && !edScrubNow()) || req.method !== 'GET') return next();
  let rel = decodeURIComponent(req.path); if (rel === '/') rel = '/index.html';
  if (!/^\/[\w./-]+\.(html|js)$/.test(rel) || rel.includes('..')) return next();
  const file = path.join(ROOT, 'public', rel);
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) return next();
    const hit = brandCache.get(file);
    if (hit && hit.m === st.mtimeMs) return res.type(rel.endsWith('.js') ? 'application/javascript' : 'html').send(hit.t);
    fs.readFile(file, 'utf8', (e2, text) => { if (e2) return next(); const t = brandFile(text); brandCache.set(file, { m: st.mtimeMs, t }); res.type(rel.endsWith('.js') ? 'application/javascript' : 'html').send(t); });
  });
});
app.use(express.static(path.join(ROOT, 'public')));
app.use('/uploads', express.static(UPLOADS));
app.get('/', (req, res) => res.redirect('/control.html'));

app.get('/api/state', (req, res) => res.json(publicState()));

// ---------- desktop app, setup guide, updates ----------
const DESKTOP = !!process.env.MR_DESKTOP;
// where updates come from: your own setting, or the GitHub repo this copy was built from
const updateRepo = () => (db.settings.updateRepo || PKG.updateRepo || EDITION.repo || '').trim();
// 🎭 Editions (1.91.0): dev mode (marathon, game capture, chat bot, Kick…) only exists in editions marked `dev` (Derek's). In the others the same
// switch was also "install test builds": that part moves to its own setting (`testBuilds`), and dev mode stays off. `devWas` brings dev mode back
// when a copy that had it on is later updated to a dev edition.
function editionDev() {
  const st = db.settings; let ch = false;
  if (!EDITION.dev && st.betaUpdates) { st.testBuilds = true; st.devWas = true; st.betaUpdates = false; ch = true; }
  else if (EDITION.dev && st.devWas) { st.betaUpdates = true; delete st.devWas; ch = true; }
  return ch;
}
if (editionDev()) save();
// 🚚 Installing a different edition over this one (1.107.0, Derek: "it will auto move everything from old edition to the new one"). Every edition uses the
// same data folder, so the lists, wheels, history, people and settings are simply there. What still pointed at the OLD edition is moved here:
// where updates come from, the old edition's names (🧽), the Test tab's default, and the battle on screen when the new edition has no movie battles.
const ED_ALL = Object.fromEntries(editionInfo().all.map(x => [x.id, x]));
function editionMoveSteps(st, from, to = EDITION.id, toScrub = edScrub) {
  const out = [], repos = Object.values(ED_ALL).map(x => String(x.repo || '').toLowerCase()).filter(Boolean), clean = r => String(r || '').replace(/^https?:\/\/github\.com\//, '').replace(/\/$/, '').toLowerCase();
  if (st.updateRepo && repos.includes(clean(st.updateRepo))) out.push({ k: 'updateRepo', v: '', text: 'Updates now come from this edition' });
  if (toScrub) { if (st.spotName === 'Kirb') out.push({ k: 'spotName', v: 'Wild', text: 'Wild spots are called “Wild”' }); if (st.banAsk === 'Kirb') out.push({ k: 'banAsk', v: 'the streamer', text: 'Banned movie messages say “the streamer”' }); }
  else if (from && ED_ALL[from] && ED_ALL[from].scrub) { if (st.spotName === 'Wild') out.push({ k: 'spotName', v: 'Kirb', text: 'Wild spots are called “Kirb” again' }); if (st.banAsk === 'the streamer') out.push({ k: 'banAsk', v: 'Kirb', text: 'Banned movie messages say “Kirb” again' }); }
  if (from && from !== to && st.testTab != null && !(ED_ALL[to] || {}).dev && ED_ALL[from] && ED_ALL[from].dev) out.push({ k: 'testTab', v: null, text: 'The Test tab starts as just Errors (turn it on in Settings)' });
  return out;
}
function editionMove() {
  const from = db.editionId || '', moved = !!from && from !== EDITION.id, steps = editionMoveSteps(db.settings, from).filter(x => moved || !from || x.k !== 'updateRepo'); /* (a GitHub you typed in yourself later is left alone) */
  if (!moved && !steps.length && from) return;
  for (const x of steps) db.settings[x.k] = x.v;
  db.editionId = EDITION.id;
  if (moved) { db.editionMoved = { from, to: EDITION.id, at: Date.now(), steps: steps.map(x => x.text) };
    const text = `🚚 This is now the ${EDITION.name} edition (it was ${(ED_ALL[from] || {}).name || from}). Everything came along: your lists, wheels, history, people and settings.${steps.length ? ' ' + steps.map(x => x.text).join('. ') + '.' : ''}`;
    live.editionNote = { at: Date.now(), text }; setTimeout(() => { try { act('stream', text.replace(/^🚚 /, ''), { icon: '🚚', kind: 'edition' }); } catch {} }, 8000); }
  save();
}
editionMove();
/* 🔊 (1.140.0, Derek: "birx ed make it so default sound stays on when not focused on") Birx & Jess's edition: the app's sound keeps playing when its window isn't the one in front (once; they can turn 🔇 Mute when unfocused back on in Settings → Sounds) */
if (EDITION.id === 'birx' && !db.settings.birxSoundBg) { db.settings.muteUnfocused = false; db.settings.birxSoundBg = true; save(); }
// 🎭 an edition without movie battles (True's, Birx's): the Discord movie battle is never the one on screen: the first time, a plain battle of your own takes its place
function editionNoMovies() {
  if (!edHas('battle') && !db.editionClean) { /* 🎭 an edition without battles (Birx & Jess): the ready-made wheels and battles go, once. Things you made yourself stay. */
    db.editionClean = Date.now(); const gone = [];
    const W = db.wheel; if (W && Array.isArray(W.wheels)) { const keep = W.wheels.filter(w => !/kirbportions/i.test(String(w.name || ''))); if (keep.length !== W.wheels.length) { gone.push('Wheel of Kirbportions'); W.wheels = keep; if (!keep.some(w => w.id === W.activeId)) W.activeId = keep[0] ? keep[0].id : null; } }
    const starter = l => l.id !== 'movies' && l.type !== 'chat' && (/^🔢 Worse Movies$|^My battle$/.test(String(l.name || ''))) && !(l.entries || []).some(x => x.wins || x.backers || x.addedBy);
    for (const l of db.lists.filter(starter)) { gone.push(l.name); db.lists = db.lists.filter(x => x !== l); }
    if (gone.length) { console.log('  Edition clean-up: removed ' + gone.join(', ')); save(); }
  }
  if (edHas('movies') || db.activeListId !== 'movies') { if (!edHas('battle') && !db.lists.some(l => l.id === db.activeListId)) { db.activeListId = (db.lists.find(l => l.id === 'giveaway') || db.lists.find(l => l.id !== 'movies') || db.lists[0] || {}).id; save(); } return; }
  let l = db.lists.find(x => x.id !== 'movies');
  if (!l && !edHas('battle')) { l = { id: 'giveaway', name: 'Giveaway', type: 'chat', giveaway: true, entries: [], joinOpen: false }; db.lists.push(l); }
  if (!l) { l = { id: uid(), name: 'My battle', type: 'text', entries: [], joinOpen: false }; db.lists.push(l); }
  db.activeListId = l.id; save();
}
setTimeout(editionNoMovies, 200);
const wantTests = () => !!db.settings.betaUpdates || !!db.settings.testBuilds;
function donePage(title, msg) {
  return `<!doctype html><meta charset="utf-8"><title>Movie Royal</title><body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#120a24;color:#f3edff;font:18px Segoe UI,system-ui,sans-serif;text-align:center">
  <div><div style="font-size:64px">✅</div><h1 style="color:#ffc94a;margin:10px 0">${title.replace(/</g, '&lt;')}</h1><p>${msg}</p></div></body>`;
}
app.get('/api/app', (req, res) => {
  const seen = db.settings.setupSeen ? guideSeen() : null, sc = twitch.status.scopes || [];
  res.json({ version: VERSION, edition: editionInfo(), desktop: DESKTOP, dataDir: DATA, updateRepo: db.settings.updateRepo || '', defaultRepo: PKG.updateRepo || EDITION.repo || '', discordInvite: discord.inviteUrl(), guilds: discord.status.guilds || [],
    guideNew: seen ? GUIDE_STEPS.filter(x => guideShown(x) && !seen.has(x.id)).map(x => x.id) : [], // 🆕 steps you haven't seen in the Setup guide yet
    twitchMissing: twitch.status.userId && sc.length ? twitch.SCOPES.filter(x => !sc.includes(x) && x !== 'clips:edit' && (x !== 'user:read:follows' || feat('raids')) && (x === 'user:read:follows' || !twitch.OPTIONAL_SCOPES.includes(x) || db.settings.adBot)) : [] }); // signed in before a newer permission was added: sign in again
});
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
    const beta = wantTests(), list = (await ghReleases()).filter(x => x.url && (beta || !x.pre));
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
    res.json({ outdated: out, v: cloud.botVersion(), unknown: cloud.enabled() && !cloud.versionKnown() });
  } catch { res.json({ outdated: false, unknown: true }); }
});
// 🧭 the Setup guide's steps (setup.html has the pages). A step added since you last opened the guide pops up when the app starts,
// every time, until you open the guide, set it up, or press "Don't show again". (since = the version that added it)
const GUIDE_MOVIES = ['tmdb', 'omdb', 'letterboxd', 'discord', 'cloud', 'backup']; /* 🎭 setup steps that only matter with movie battles */
const guideShown = x => edHas('guide:' + x.id) && (!x.feat || feat(x.feat)) && (!x.dev || !!db.settings.betaUpdates) && (edHas('movies') || !GUIDE_MOVIES.includes(x.id)); // 🛠️ dev mode steps (the 🌐 viewer website, 1.81.2) only show in dev mode
const GUIDE_STEPS = [
  { id: 'twitch', title: '💜 Sign in with Twitch' }, { id: 'rewards', title: '💎 Channel points & bits' }, { id: 'tmdb', title: '🎬 Movie search' }, { id: 'omdb', title: '🍅 Ratings' },
  { id: 'letterboxd', title: '📗 Letterboxd' }, { id: 'discord', title: '🤖 Discord bot' }, { id: 'cloud', title: '☁️ 24/7 Discord bot' }, { id: 'donations', title: '💵 Donations' },
  { id: 'botimport', title: '🤖 Bring your old chat bot over' }, { id: 'stream', title: '📺 Put it on stream' }, { id: 'obs', title: '🎥 OBS control' },
  { id: 'choice', since: '1.38.0', title: "🎉 Viewer's Choice in OBS", why: "Confetti, balloons and a big pop-up on stream when someone redeems Viewer's Choice. Works with just OBS open.", how: ['Connect OBS first: Settings → 🎥 OBS (OBS: Tools → WebSocket Server Settings → Enable, then paste the password).', 'Press 🧭 Set it up below and tick the OBS scenes it should show in.'], done: () => !!db.settings.choiceObs },
  { id: 'rollcall', since: '1.61.0', title: '📣 Roll call in OBS', why: 'Roll call can show in any OBS scene, even ones without the game screen (like your camera scene).', how: ['Connect OBS first (🎥 OBS control step).', 'Press 🧭 Set it up and tick the scenes, or add a Browser source with the address shown there.'], done: () => !!db.settings.rollObs },
  { id: 'botimport', since: '1.108.0', title: '🧳 Bring everything over from Streamlabs Chatbot', why: 'Movie Royal has its own chat bot (🤖 Chat bot tab): commands, timers, quotes and sound alerts. Everything you built in Streamlabs Chatbot can move over in one go.', how: ['In Streamlabs Chatbot: Connections (bottom left) → Cloud → Pick Folder → Save Settings → Create Excel Files. That makes Data.xlsx (and Songlist.xlsx) in the folder you picked.', 'In Movie Royal: 🤖 Chat bot tab → 📥 Import / export → 🧳 pick those files (you can pick several at once).', 'Look at what was found, then press ✅ Bring it all over. Sound files are copied in when they are on this PC.', 'Sound alerts land on the 🔊 Sound alerts tab; any with a ⚠️ need their sound file picked again.'], done: () => (db.chatbot?.commands || []).length > 0 },
  { id: 'costream', since: '1.71.0', title: '🤝 Co-stream with a friend', why: 'Stream together with a friend who also has Movie Royal: cameras in each other\'s OBS, their battle on your stream while it runs, and chaos across both chats.', how: ['Do the 🎥 OBS control step first.', 'One of you: Settings → 🤝 Co-stream → 🎟️ Make an invite code, and send it in Discord. The other: paste it and press 🤝 Join.', 'One time in OBS: ⚙ next to Start Virtual Camera → Output type: Scene → 🤝 Co-stream share.'], done: () => costream.linked() },
  { id: 'site', dev: true, since: '1.75.0', title: '🌐 Viewer website', why: 'A website for your viewers (!site): your stream, every battle with who paid and a ▶ link into your VOD, stats, guesses and polls. It runs on your 24/7 Discord bot.', how: ['Do the ☁️ 24/7 Discord bot step first.', 'Settings → 🌐 Viewer site → 🌐 Turn on the viewer site.', 'One time on Twitch (Settings → 🌐 Viewer site → 🔑 Let viewers sign in): 📋 copy your website\'s address, 🟣 open dev.twitch.tv → Manage on your Movie Royal app, paste it under OAuth Redirect URLs → Add → Save, then ✅ Check it.'], done: () => site.on() },
  // 1.136.0 (Derek: "make a custom setup guide for them"): the steps for editions with movie night (Birx & Jess)
  { id: 'mnkeys', feat: 'movienight', since: '1.136.0', title: '🎬 Movie look-up keys', why: 'Two free keys make movie night smarter: movie names finish themselves as you type, chat suggestions find the right movie, 🎲 Help me pick can search by actor, director or subject, and the vote board shows ratings and posters.', how: ['Press 🧭 Set it up: the guide walks you through getting the free TMDB key (and the OMDb one, if the shared one is not enough).', 'Later: Settings → 🔗 Connections has both keys.'], done: () => !!(db.settings.tmdbKey || '').trim() && !!omdbWhere() },
  { id: 'imdb', feat: 'movienight', since: '1.136.0', title: '📋 IMDb watchlist & ratings', why: 'Bring in your IMDb watchlist and ratings: chat can then suggest movies (ones you have or already rated are refused), ask what you rated a movie, and Help me pick searches your watchlist.', how: ['Press 🧭 Set it up and paste the links to your IMDb watchlist and ratings pages (both set to public on IMDb).', 'Or use the Export files from IMDb.', 'Later: 📜 History → 📋 Watchlist.'], done: () => { const w = watchlist.state(); return !!(w.counts.list || w.counts.rated || w.opts.listUrl || w.opts.ratedUrl); } },
  { id: 'mnobs', feat: 'movienight', since: '1.136.0', title: '🍿 Movie night on stream', why: 'The vote board with the big last-call timer and the alarm bell, as a source in OBS.', how: ['Do the 🎥 OBS control step first, with OBS open.', 'Press 🧭 Set it up, then 🍿 Add it to my OBS.'], done: () => !!db.settings.mnObs },
  // 1.59.7 (Derek: keep the Setup guide up to date): three new steps
  { id: 'chatbot', since: '1.59.7', title: '🤖 Chat bot account', why: 'Movie Royal can talk in your Twitch chat as a bot account (like MoviesRoyalBot) instead of as you.', how: ['Make a second Twitch account for the bot, like MoviesRoyalBot (Twitch names can\'t have spaces).', 'Open the sign-in link below in a private (incognito) browser window, log in there as the BOT, and press Authorize. (Or press 🔑 Sign in as the bot: if Twitch shows your own account, press "Not you?" and log in as the bot.)', 'In your Twitch chat, type /mod and the bot\'s name (like /mod MoviesRoyalBot).'], done: () => !!db.twitchBot },
  { id: 'chars', since: '1.59.7', title: '🧍 Characters', why: 'Battles with people instead of balls: chat picks man / woman with !id, and people make their own character in Discord with /character.', how: ['Press 🧭 Set it up and answer the two questions (men and women characters, character creation).', 'Or later: Settings → ⚔️ Game → 🧍 Characters.'], done: () => !!(db.settings.featAsk?.ids && db.settings.featAsk?.looks) },
  { id: 'backup', since: '1.59.7', title: '🛡️ Backup bots', why: 'A second app that keeps your Discord bot answering if the 24/7 bot has problems (on your PC or a friend\'s).', how: ['Download MovieRoyalBackupBots-Setup from the latest release page on GitHub (under Assets) and install it.', 'Open Movie Royal Backup Bots, then in Movie Royal: Settings → 🤖 Discord & picks → 🛡️ Add my bot to the backup on this PC.'], done: () => backuplink.backupWatching() || backuplink.backupActive() }
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
  for (const x of GUIDE_STEPS) if (guideShown(x) && !seen.has(x.id) && !x.done?.() && !steps.some(y => y.id === x.id)) steps.push({ id: x.id, title: x.title, why: x.why || '', how: x.how || [], guide: true }); // 🆕 new in the Setup guide (with how to do it, right in the pop-up)
  db.settings.lastSeenVersion = VERSION; save();
  res.json({ from, to: VERSION, steps });
});
app.get('/api/patchnotes', async (req, res) => {
  let local = ''; try { local = fs.readFileSync(path.join(ROOT, 'PATCHNOTES.md'), 'utf8'); } catch {}
  let releases = []; try { releases = (await ghReleases()).filter(x => !x.pre).map(x => ({ tag: x.tag, at: x.at, notes: x.notes })); } catch {}
  local = notesFor(local, edLooking() || EDITION.id); /* 📝 only the lines that are for this edition */
  res.json({ version: VERSION, local: brand(local), releases: releases.map(x => ({ ...x, notes: brand(x.notes || '') })) });
});
// 🔄 Pick up where you left off (1.82.2, Derek: "when updating app while live save battle or wheel status as is… so if I send an update
// to a friend during stream he can update and leave off what he is currently doing"). The wheels, battles, pools, luck, picks and
// tonight's movies are already saved all the time; this keeps the bits that only live while the app is open (the map you picked, a
// best-of series, the winner waiting to !accept / !pass, the join timer + chat's votes) and puts them back when the app opens again
// within 30 minutes. A battle that was playing can't carry on mid-fight: nothing of it counted, so you just press Start again.
const RESUME_MS = 30 * 60000;
function resumeData(why) {
    const c = live.claim, game = live.game;
    return {
      at: Date.now(), why, version: VERSION, phase: live.phase, listId: game?.listId || null, test: !!game?.test, cardsFight: cards.live.phase === 'fight' && !cards.live.fight?.chars ? !!cards.live.fight?.test : null,
      map: live.map ?? null, mapPick: live.mapPick ?? null, mapUsed: !!live.mapUsed, raceSkip: live.raceSkip ?? null, series: live.series || null, redoSkip: live.redoSkip || null, lookSeed: live.lookSeed,
      lastWinner: live.lastWinner || null, claim: c ? { winner: c.winner, claimed: !!c.claimed, done: !!c.done, passed: !!c.passed, instant: !!c.instant, waiting: c.waiting || null, asked: c.asked || null, left: c.endsAt ? Math.max(0, c.endsAt - Date.now()) : 0 } : null,
      gather: live.gather ? { left: Math.max(0, live.gather.endsAt - Date.now()), discord: !!live.gather.discord } : null, board: live.board || null, calls: [...(live.calls || new Map())],
      round: (() => { const R = wheel.W().round; return R?.state === 'running' ? 'running' : null; })(),
    };
}
function resumeSave(why) { try { db.resume = resumeData(why); saveNow(); } catch (e) { console.error('[resume] couldn\'t keep what was going on:', e.message); } }
// 🧪 Test tab: what would come back if Movie Royal closed right now (nothing is saved or changed)
app.get('/api/test/resume', (req, res) => {
  const r = resumeData('test'), W = wheel.W(), aw = W.wheels.find(w => w.id === W.activeId), out = [];
  if (aw) out.push(`🎡 “${aw.name}”: ${aw.entries.filter(e => e.on !== false && !e.voided).length} spots on, ${aw.entries.filter(e => e.on === false).length} off, ${aw.entries.filter(e => e.voided).length} voided, ${aw.entries.filter(e => e.count != null).length} countdowns (saved all the time)`);
  if (W.round) out.push(`⏱️ the wheel's round timer (${W.round.state === 'running' ? 'comes back paused: press ▶' : W.round.state})`);
  out.push(`⚔️ the battle you're on: “${getList(db.activeListId)?.name || '?'}” and every pool, luck and pick (saved all the time)`);
  if (r.map) out.push(`🗺️ the map: ${mapLabel(r.map)}`);
  if (r.series && !r.series.done) out.push(`🏆 best of ${r.series.bestOf}, round ${r.series.round}`);
  if (r.lastWinner) out.push(`🏆 the winner card: “${r.lastWinner.label}”${r.claim && !r.claim.done ? ' (still waiting for !accept / !pass)' : ''}`);
  if (r.gather) out.push(`⏱️ the join timer (${Math.round(r.gather.left / 1000)} s left)`);
  if (r.board) out.push(`🔮 chat's votes (${r.calls.length})`);
  if (r.phase === 'lobby' || r.phase === 'running') out.push('⚠️ the battle playing right now would NOT carry on (nothing of it counts): press Start again after');
  if (r.cardsFight != null) out.push('⚠️ the card battle playing right now would NOT carry on (no pack is used): start it again after');
  res.json({ ok: true, items: out, mins: RESUME_MS / 60000 });
});
function resumeLoad() {
  const r = db.resume; if (!r) return; delete db.resume; save();
  if (!(Date.now() - r.at < RESUME_MS)) return;
  const notes = [];
  try {
    if (r.map != null) { live.map = r.map; live.mapUsed = !!r.mapUsed; } if (r.mapPick != null) live.mapPick = r.mapPick; if (r.raceSkip != null) live.raceSkip = r.raceSkip;
    if (r.series && !r.series.done) { live.series = r.series; notes.push(`🏆 best of ${r.series.bestOf} (round ${r.series.round})`); }
    if (r.redoSkip) live.redoSkip = r.redoSkip; if (r.lookSeed) live.lookSeed = r.lookSeed;
    if (r.lastWinner) live.lastWinner = r.lastWinner;
    if (r.claim && r.lastWinner) {
      const c = live.claim = { winner: r.claim.winner, claimed: r.claim.claimed, done: r.claim.done, passed: r.claim.passed, instant: r.claim.instant };
      if (r.claim.waiting) { c.waiting = r.claim.waiting; c.asked = r.claim.asked; } // (the bot already asked them: !accept / !pass still works)
      else if (!c.done) { const ms = Math.max(15000, r.claim.left || 0); c.endsAt = Date.now() + ms; c.timer = setTimeout(() => finishClaim(false), ms); }
      if (!c.done) notes.push(`🏆 ${r.lastWinner.label}'s claim`);
    }
    if (r.gather && r.gather.left > 3000 && (r.phase === 'idle' || r.phase === 'ended')) {
      live.gather = { endsAt: Date.now() + r.gather.left, discord: r.gather.discord }; live.gather.timer = setTimeout(gatherTimeUp, r.gather.left);
      notes.push(`⏱️ the join timer (${Math.round(r.gather.left / 1000)} s left)`);
    }
    if (r.board) { live.board = r.board; for (const [k, v] of r.calls || []) live.calls.set(k, v); setTimeout(() => sendBoard(true), 2500); notes.push(`🔮 chat's ${(r.calls || []).length} votes`); }
    if (r.round) notes.push('⏱️ the wheel\'s round timer (paused: press ▶ to keep going)');
    if (r.phase === 'lobby' || r.phase === 'running') notes.push(`⚠️ the ${r.test ? 'practice ' : ''}battle that was playing couldn't carry on, nothing of it counted: press Start to run it again`);
    if (r.cardsFight != null) notes.push(`⚠️ the ${r.cardsFight ? 'practice ' : ''}card battle that was playing couldn't carry on, no pack was used: start it again`);
  } catch (e) { console.error('[resume] couldn\'t put everything back:', e.message); }
  const mins = Math.max(1, Math.round((Date.now() - r.at) / 60000));
  live.resumeNote = { at: Date.now(), text: `🔄 Picked up where you left off (closed ${mins} min ago${r.version && r.version !== VERSION ? `, updated ${r.version} → ${VERSION}` : ''}): your wheels, battles and pools are as you left them${notes.length ? ', plus ' + notes.join(', ') : ''}.` };
  act('stream', `Movie Royal opened again ${mins} min after closing${r.version && r.version !== VERSION ? ` (updated ${r.version} → ${VERSION})` : ''}: picked up where it left off`, { icon: '🔄', kind: 'resume' });
  pushState();
}
function runInstaller(file, res) {
  if (!DESKTOP || process.platform !== 'win32') return res.status(400).json({ error: 'Updates install from the Windows app.' });
  // run the installer quietly, then open Movie Royal again once it's done (a little helper script waits for it)
  const exe = process.execPath, bat = path.join(os.tmpdir(), 'MovieRoyal-Update.cmd');
  fs.writeFileSync(bat, `@echo off\r\nstart "" /wait "${file}" /UPDATE\r\ntimeout /t 2 /nobreak >nul\r\nstart "" "${exe}"\r\n`); // the installer shows its progress bar, then closes by itself
  const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => !/^ELECTRON_/i.test(k)));
  spawn('cmd.exe', ['/c', bat], { detached: true, stdio: 'ignore', windowsHide: true, env }).unref();
  res.json({ ok: true });
  resumeSave('update'); // 🔄 keep what's going on for when the new version opens
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

const RESTART_DISCORD = ['discordToken', 'discordClientId', 'discordGuildId', 'discordFolder', 'discordCategory', 'charChannel', 'charChannelName', 'looksOn']; // (the channel folder / character channel get made or moved again)
const RESTART_TWITCH = ['twitchClientId', 'twitchClientSecret', 'twitchChannel'];
app.post('/api/settings', (req, res) => {
  const body = req.body || {};
  let rd = false, rt = false, rl = false; const rdName = db.settings.discordChannelName, mapWas = db.settings.map, colWas = db.settings.colorsOn, rulesWas = { ...(db.settings.banRules || {}) };
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
  if ('banRules' in body && (body.banRules?.dubbed !== false) && String(db.settings.tmdbKey || '').trim()) { const was = rulesWas || {}; if (was.dubbed === false || (was.dubVotes || 1000) !== (db.settings.banRules?.dubVotes || 1000) || was.english === false) dubCleanup().then(() => pushState()).catch(() => {}); } // 🗣️ dubbed movies allowed again / a new vote limit: check the old bans
  if (('obsOn' in body && body.obsOn === false) || ('obsCapOn' in body && body.obsCapOn === false)) { if (live.capture) obs.capture(false).catch(() => {}); live.capture = false; live.capAutoOn = false; } // 🎥 switched off: Movie Royal takes its things back out of OBS
  if ('obsOn' in body && body.obsOn === false) { if (db.settings.choiceObs) obs.celebrateSource(false).catch(() => {}); if (db.settings.rollObs) obs.rollSource(false).catch(() => {}); }
  if ('obsOn' in body && body.obsOn === true) { if (db.settings.choiceObs && twitch.status.userId) choiceFile().then(f => obs.celebrateSource(true, f.file, choicePick())).catch(() => {}); if (db.settings.rollObs) rollObsSource(true).catch(() => {}); }
  if ('choiceShowPick' in body) { fixChoicePrompt().catch(e => console.error('[twitch] viewer\'s choice prompt:', e.message)); if (db.settings.choiceObs && obsOk() && twitch.status.userId) choiceFile().then(f => obs.celebrateSource(true, f.file, choicePick())).catch(() => {}); } // 🤫 show / hide their pick
  if ('weekStart' in body && db.week) db.week.key = weekKey(); // changing the start day never resets anyone mid-week
  if (['maxPerUser', 'banCurrentYear', 'luckOn', 'twitchMoviesCommand', 'streamerName', 'ideasDoc', 'banAsk'].some(k => k in body)) discord.refreshPinned?.();
  if ('discordChannelName' in body && body.discordChannelName !== undefined && rdName !== db.settings.discordChannelName) rd = true; // makes/finds the new channel
  if ('spotName' in body) for (const e of getList('movies')?.entries || []) if (e.kind === 'spot') e.label = `${db.settings.spotName || 'Kirb'}'s Pick`;
  if ('map' in body && db.settings.map !== 'random' && !mapById(db.settings.map) && !isCharMap(db.settings.map)) db.settings.map = 'random';
  if (mapWas !== db.settings.map) { live.map = null; live.mapUsed = false; if (live.phase === 'idle') refreshPreview(true); }
  if (colWas !== db.settings.colorsOn && live.phase === 'idle') refreshPreview();
  if ('spotLooks' in body && live.phase === 'idle') refreshPreview(); // 🎨 wild spot characters changed
  if (('mapSize' in body || 'raceMax' in body) && live.phase === 'idle') { refreshPreview(true); pushState(); } // 📏 map size / 🏁 race limit changed
  if ('betaUpdates' in body) editionDev(); /* 🎭 dev mode only exists in a dev edition */
  if ('betaUpdates' in body && !db.settings.betaUpdates && edLooking()) { edLookAs(''); brandCache.clear(); lockPage = ''; lockPageFor = ''; } /* 👀 dev mode off = back to your own edition */
  if ('betaUpdates' in body && db.settings.betaUpdates) maraBattleOnce();
  if ('betaUpdates' in body) chatvoice.ensurePlayer(); // 🔈 the chat voice is dev mode only
  if ('betaUpdates' in body) site.connect(); // 🌐 the viewer website is a dev mode thing for now (Derek, 1.81.2): on/off with dev mode // 🏃 dev mode on: Derek's marathon battle comes with it (once)
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
  const entries = w.entries.filter(e => e.type !== 'void').map(e => { const x = { ...e, voided: null, image: packFile(e.image), sound: packFile(e.sound), ...(e.reveal ? { reveal: { ...e.reveal, image: packFile(e.reveal.image) } } : {}) }; delete x.id; if (x.type === 'timermax') { x.wins = 0; if (x.maxedOff) { x.on = true; x.maxedOff = false; } } if (x.type === 'countdown' || x.type === 'autocount' || x.type === 'timercount') x.count = x.countStart; return x; });
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
    const s = j.wheel, w = wheel.newWheel(s.name || 'Shared wheel', (s.entries || []).map(e => ({ ...e, image: unpackFile(e.image), sound: unpackFile(e.sound), ...(e.reveal ? { reveal: { ...e.reveal, image: unpackFile(e.reveal.image) } } : {}) })), { title: s.title || '', spinSecs: s.spinSecs || 10, removeWinner: !!s.removeWinner, palette: s.palette || null, ...(s.look ? { look: s.look } : {}), opts: wheel.mergeOpts(s.opts) });
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
  if (req.body.luckOn && ownLuckOk(l)) l.luckOn = true; // 🍀 (made with luck on: a "stuff to do" battle)
  act('battle', `made a new battle: “${l.name}”${l.luckOn ? ' (with 🍀 luck)' : ''}`, { icon: '🆕', who: streamerName(), kind: 'list', list: l.name });
  db.lists.push(l); db.activeListId = l.id; leaveEnded(); save(); pushState(); refreshPreview(true); res.json(l);
});
// 🧹 Inactive people's movies (1.74.0, Derek): check every battle with people's movies (on open + every hour + when the setting changes)
function inactiveSweep(only = null) {
  const done = [];
  for (const l of db.lists || []) {
    if (only && l.id !== only) continue; if (!inactive.forList(l)) continue;
    const busy = live.game?.listId === l.id && ['lobby', 'running'].includes(live.phase) || (!!live.gather && db.activeListId === l.id);
    let r; try { r = inactive.sweep(l, { busy }); } catch (e) { console.error('[inactive]', e.message); continue; }
    if (r.out?.length) {
      done.push(...r.out);
      broadcast({ type: 'toast', text: `🧹 ${hEsc(r.out.map(p => p.name).join(', '))} ${r.out.length === 1 ? "hasn't" : "haven't"} been in a battle of “${hEsc(l.name)}” for ${hEsc(inactive.ruleWords(inactive.ruleOf(l)))}: ${r.out.reduce((a, p) => a + p.movies.length, 0)} movie(s) went back for anyone to pick` }, 'control');
    }
  }
  if (done.length) { pushState(); try { discord.refreshPinned?.(); } catch {} if (cloud.enabled()) cloud.sync(true)?.catch?.(() => {}); }
  return done;
}
setTimeout(() => inactiveSweep(), 30000); setInterval(() => inactiveSweep(), 3600000);
const inactiveView = l => { inactive.backfill(l); const r = inactive.ruleOf(l), now = Date.now(); return { rule: r, words: inactive.ruleWords(r), since: l.lastInSince || 0, people: inactive.people(l, now).map(({ entries, ...p }) => p) }; };
app.get('/api/lists/:id/inactive', (req, res) => { const l = getList(req.params.id); if (!inactive.forList(l)) return res.status(400).json({ error: "This battle doesn't have people's movies." }); res.json(inactiveView(l)); });
app.post('/api/lists/:id/inactive/run', (req, res) => { const l = getList(req.params.id); if (!inactive.forList(l)) return res.status(400).json({ error: "This battle doesn't have people's movies." }); if (!inactive.ruleOf(l).on) return res.status(400).json({ error: 'It\'s turned off for this battle.' }); res.json({ ok: true, out: inactiveSweep(l.id) }); });
// pretend: 5 people on a pretend battle, how long ago they were last in a battle → who'd lose their movies (nothing saved)
app.post('/api/test/inactive', (req, res) => {
  const n = Number(req.body?.n) || 3, unit = inactive.UNITS[req.body?.unit] ? req.body.unit : 'months', DAY = 86400000, now = Date.now();
  const ago = [['Ava', 3], ['Ben', 40], ['Cal', 80], ['Dee', 100], ['Eli', 400]], newbie = ['Fay', 2];
  const l = { id: 'test-inactive', name: '🧪 Pretend battle', type: 'movies', inactive: { on: true, n, unit }, lastIn: {}, lastInSince: now - 800 * DAY, entries: [] };
  for (const [name, d] of ago) { l.lastIn['t-' + name] = now - d * DAY; l.entries.push({ id: 'm-' + name, label: `${name}'s movie`, status: 'active', addedAt: now - 500 * DAY, backers: [{ discordId: 't-' + name, name }] }); }
  l.entries.push({ id: 'm-Fay', label: "Fay's movie", status: 'active', addedAt: now - newbie[1] * DAY, backers: [{ discordId: 't-Fay', name: 'Fay' }] });
  const before = inactive.people(l, now).map(p => ({ name: p.name, last: p.last ? Math.round((now - p.last) / DAY) : null, due: p.due }));
  const r = inactive.sweep(l, { now, quiet: true });
  res.json({ ok: true, words: inactive.ruleWords(inactive.ruleOf(l)), people: before, out: r.out.map(p => p.name), stillIn: l.entries.filter(e => e.status === 'active').map(e => e.backers[0].name) });
});
app.patch('/api/lists/:id', (req, res) => {
  const l = getList(req.params.id); if (!l) return res.sendStatus(404);
  if (req.body.name != null) l.name = String(req.body.name).slice(0, 60);
  if (req.body.joinOpen != null) l.joinOpen = !!req.body.joinOpen;
  if (req.body.chars != null) { l.chars = !!req.body.chars; l.charsSet = true; refreshPreview(); } // 🧍 characters instead of balls (this battle; you changed it, so the default leaves it alone)
  if (req.body.charIds != null) { l.charIds = !!req.body.charIds; refreshPreview(); } // 👫 use chat's !id for the characters (off = everyone non-binary)
  if ('gameSeconds' in req.body) { const v = Math.round(Number(req.body.gameSeconds) || 0); if (v > 0) l.gameSeconds = Math.max(10, Math.min(600, v)); else delete l.gameSeconds; refreshPreview(); } // ⏱️ this battle's own timer (0 = the one for all battles)
  if ('pacer' in req.body) { const v = req.body.pacer; if (v == null || v === '' || Number(v) < 0) delete l.pacer; else l.pacer = Math.round(clampN(v, 0, 100, 50)); refreshPreview(); } // ⏳ this battle's own elimination pacer (null = the one for all battles)
  if (req.body.inactive && typeof req.body.inactive === 'object' && inactive.forList(l)) { // 🧹 take out the movies of people who haven't been in a battle for a while
    if (inactive.setRule(l, req.body.inactive)) { const r = inactive.ruleOf(l); act('discord', `${r.on ? `set “${l.name}” to take out the movies of people who haven't been in a battle for ${inactive.ruleWords(r)}` : `turned off taking out inactive people's movies in “${l.name}”`}`, { icon: '🧹', who: streamerName(), kind: 'setting', list: l.name }); setTimeout(() => inactiveSweep(l.id), 300); }
  }
  if (req.body.watchLuck && typeof req.body.watchLuck === 'object') { // 👀 watch luck: every N hours watched (counted from when it's turned on) = +X% luck in this battle
    const w = req.body.watchLuck, cur = l.watchLuck ||= { on: false, hours: 10, amount: 1, since: 0, base: {} };
    const snap = () => { cur.since = Date.now(); cur.base = Object.fromEntries(Object.entries(db.viewers || {}).filter(([, v]) => v.watchMins > 0).map(([k, v]) => [k, v.watchMins])); }; // (watch time before today doesn't count)
    if (w.on != null) { if (w.on && !cur.on) snap(); cur.on = !!w.on; }
    if (w.hours != null) cur.hours = Math.max(1, Math.min(500, Math.round(Number(w.hours) || 10)));
    if (w.amount != null) cur.amount = Math.max(1, Math.min(100, Math.round(Number(w.amount) || 1)));
    if (w.restart) snap();
    refreshPreview();
  }
  if ((req.body.luckOn != null || req.body.luckPer != null) && ownLuckOk(l)) { // 🍀 luck like the Discord battle (your own battles, off by default)
    const was = !!l.luckOn, wasPer = ownLuckPer(l);
    if (req.body.luckOn != null) l.luckOn = !!req.body.luckOn;
    if (req.body.luckPer != null) { const v = Number(req.body.luckPer); if (Number.isFinite(v) && v >= 0) l.luckPer = Math.round(Math.min(100, v) * 100) / 100; }
    if (was !== !!l.luckOn) act('luck', `turned 🍀 luck ${l.luckOn ? 'on' : 'off'} for “${l.name}”${l.luckOn ? ` (+${pctW(ownLuckPer(l))} every battle an entry loses)` : ''}`, { icon: '🍀', who: streamerName(), kind: 'setting', list: l.name });
    else if (wasPer !== ownLuckPer(l)) act('luck', `changed the 🍀 luck in “${l.name}” to +${pctW(ownLuckPer(l))} a battle`, { icon: '🍀', who: streamerName(), kind: 'setting', list: l.name });
    refreshPreview();
  }
  if (req.body.bestOf != null && l.type !== 'movies') { l.bestOf = [1, 3, 5, 7, 9].includes(Number(req.body.bestOf)) ? Number(req.body.bestOf) : 1; if (live.series?.listId === l.id) live.series = null; if (l.giveaway) giveawaySettings().bestOf = l.bestOf; }
  if (req.body.screenTitle != null) { l.screenTitle = String(req.body.screenTitle).slice(0, 60); refreshPreview(); }
  if (req.body.fun && typeof req.body.fun === 'object' && l.type === 'chat') { // 🎉 fun mode for chat battles
    const f = req.body.fun, cur = l.fun ||= { powerups: false, wacky: {} };
    if (f.powerups != null) cur.powerups = !!f.powerups;
    if (f.racePowers != null) cur.racePowers = !!f.racePowers; // 🏁 race power-ups (on race maps)
    if (f.wacky && typeof f.wacky === 'object') for (const k of ['bouncy', 'lowgrav', 'sizes', 'disco', 'chaos', 'bigheads', 'slippery', 'swappy', 'speedy', 'googly']) if (k in f.wacky) cur.wacky[k] = !!f.wacky[k];
    if (f.powersOff && typeof f.powersOff === 'object') { cur.powersOff ||= {}; for (const k of Object.keys(POWER_INFO)) if (k in f.powersOff) cur.powersOff[k] = !!f.powersOff[k]; } // each power-up on/off
    syncRewards(); refreshPreview();
  }
  save(); pushState(); res.json({ ok: true });
});
app.delete('/api/lists/:id', (req, res) => {
  if (req.params.id === 'movies') return res.status(400).json({ error: "The Discord movie list can't be deleted" });
  { const l0 = getList(req.params.id); if (l0) act('battle', `deleted the battle “${l0.name}”`, { icon: '🗑️', who: streamerName(), kind: 'list', list: l0.name }); }
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
  if (report.added) act('battle', `added ${report.added === 1 ? '1 entry' : report.added + ' entries'} to “${l.name}”${report.failed.length ? ` (${report.failed.length} couldn't be added)` : ''}`, { icon: '➕', who: streamerName(), kind: 'add', list: l.name, items: items.slice(0, 40).map(it => it.label) }); // 🧾
  save(); pushState(); res.json(report);
});

app.post('/api/lists/:id/upload', express.raw({ type: '*/*', limit: '15mb' }), (req, res) => {
  const l = getList(req.params.id); if (!l) return res.sendStatus(404);
  const name = String(req.query.name || 'image.png');
  const ext = (name.match(/\.(png|jpe?g|gif|webp)$/i) || [, 'png'])[1].toLowerCase();
  const file = uid() + '.' + ext;
  fs.writeFileSync(path.join(UPLOADS, file), req.body);
  const label = name.replace(/\.\w+$/, '').replace(/[-_]+/g, ' ').trim().slice(0, 80) || 'Picture';
  addEntry(l, { label, image: '/uploads/' + file }); act('battle', `added the picture “${label}” to “${l.name}”`, { icon: '🖼️', who: streamerName(), kind: 'add', list: l.name });
  save(); pushState(); res.json({ ok: true });
});

app.post('/api/lists/:id/entries/:eid/picture', express.raw({ type: '*/*', limit: '15mb' }), (req, res) => { // 🖼️ a picture for one entry (🏃 Marathon pool)
  const l = getList(req.params.id), e = l?.entries.find(x => x.id === req.params.eid); if (!e) return res.sendStatus(404);
  if (!req.body?.length) { delete e.image; save(); pushState(); refreshPreview(); return res.json({ ok: true }); }
  const ext = (String(req.query.name || '').match(/\.(png|jpe?g|gif|webp)$/i) || [, 'png'])[1].toLowerCase(), file = uid() + '.' + ext;
  fs.writeFileSync(path.join(UPLOADS, file), req.body); e.image = '/uploads/' + file; e.picAuto = false; save(); pushState(); refreshPreview(); res.json({ ok: true, image: e.image });
});
app.patch('/api/lists/:id/entries/:eid', (req, res) => {
  const l = getList(req.params.id); const e = l?.entries.find(x => x.id === req.params.eid);
  if (!e) return res.sendStatus(404);
  if (req.body.weight != null) { const was = e.weight || 1; e.weight = Math.max(0.1, Math.min(1000, Math.round(Number(req.body.weight) * 10) / 10 || 1)); if (e.weight !== was) act('battle', `changed the odds of “${e.label}” in “${l.name}”: ${was} → ${e.weight}`, { icon: '🎲', who: streamerName(), kind: 'odds', list: l.name }); }
  if (req.body.label != null && l.type !== 'movies') { e.label = String(req.body.label).slice(0, 80); setTimeout(() => refreshPreview(), 0); }
  if (req.body.sub != null && l.type !== 'movies') { e.sub = String(req.body.sub).slice(0, 80); setTimeout(() => refreshPreview(), 0); } // (🏃 Marathon pool: the small line under a name)
  if (req.body.status) setTimeout(() => refreshPreview(), 0);
  if (req.body.status) {
    if (req.body.status !== e.status) act('battle', `${{ active: 'put', paused: 'paused', removed: 'took', watched: 'marked', away: 'set' }[req.body.status] || 'changed'} “${e.label}”${{ active: ' back in', paused: ' (off the cliff for now)', removed: ' out', watched: ' as watched', away: ' as out tonight' }[req.body.status] || ''} in “${l.name}”`, { icon: { active: '▶', paused: '⏸️', removed: '✕', watched: '✅', away: '🛌' }[req.body.status] || '✏️', who: streamerName(), kind: 'entry', list: l.name }); // 🧾
    if (l.type === 'movies' && req.body.status === 'watched' && e.status !== 'watched' && e.backers?.[0]) e.luckSnap = resetLuckFor(e.backers[0].discordId, `you marked “${e.label}” as watched`); // watched: that person's luck starts over
    if (l.type === 'movies' && req.body.status !== 'watched' && e.status === 'watched' && e.luckSnap) { giveLuckBack(e.luckSnap, `“${e.label}” is back in the pool`); delete e.luckSnap; }
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
  if (n) act('battle', `brought back every paused entry in “${l.name}” (${n})`, { icon: '▶', who: streamerName(), kind: 'entry', list: l.name });
  save(); pushState(); refreshPreview(); res.json({ back: n });
});
app.post('/api/lists/:id/reset-entries', (req, res) => { // ↺ Reset entries (Battle tab): empty the battle so its list starts over
  const l = getList(req.params.id); if (!l) return res.sendStatus(404);
  if (l.type === 'movies') return res.status(400).json({ error: "The Discord movie battle is everyone's picks, so it can't be emptied from here. Take movies out in the 🎬 Movie Pool tab." });
  if (live.phase === 'lobby' || live.phase === 'running') return res.status(400).json({ error: 'A battle is going. Reset entries once it ends.' });
  let n = 0;
  for (const e of l.entries) if (e.status === 'active') { e.status = 'paused'; n++; } // everything is paused, nothing deleted: it stays in the pool list, darker (▶ brings one back)
  act('battle', `reset the entries of “${l.name}” (${n} paused)`, { icon: '↺', who: streamerName(), kind: 'entry', list: l.name });
  save(); pushState(); refreshPreview(true); res.json({ ok: true, n, type: l.type });
});
app.post('/api/lists/:id/reset-odds', (req, res) => {
  const l = getList(req.params.id); if (!l) return res.sendStatus(404);
  for (const e of l.entries) e.weight = l.type === 'movies' ? Math.max(1, e.backers?.length || 1) : 1;
  act('battle', `set every entry's odds in “${l.name}” back to the same`, { icon: '🎲', who: streamerName(), kind: 'odds', list: l.name });
  save(); pushState(); res.json({ ok: true });
});
app.post('/api/lists/:id/clear', (req, res) => {
  const l = getList(req.params.id); if (!l) return res.sendStatus(404);
  l.entries.forEach(e => { if (e.status === 'active') e.status = 'paused'; }); // paused, never deleted: they stay in the pool list, darker
  act('battle', `cleared “${l.name}” (everything paused)`, { icon: '⏸️', who: streamerName(), kind: 'entry', list: l.name });
  save(); pushState(); res.json({ ok: true });
});
app.post('/api/lists/:id/restore', (req, res) => { // bring back everything taken out
  const l = getList(req.params.id); if (!l) return res.sendStatus(404);
  if (l.type !== 'movies') l.entries.forEach(e => { e.status = 'active'; });
  else l.entries.forEach(e => { if (e.status === 'removed' || e.status === 'paused') e.status = 'active'; }); // Discord movies: only the ones you paused or took out (watched ones stay watched)
  act('battle', `brought back everything that was taken out of “${l.name}”`, { icon: '▶', who: streamerName(), kind: 'entry', list: l.name });
  save(); pushState(); refreshPreview(true); res.json({ ok: true });
});

app.post('/api/chatters/link', (req, res) => { // "this chatter is that person"
  const login = String(req.body?.login || '').toLowerCase(), id = String(req.body?.discordId || '');
  if (!/^[a-z0-9_]{2,25}$/.test(login) || !id) return res.status(400).json({ error: 'Pick a person' });
  db.links[id] = login; if (db.manualPeople?.[id]) db.manualPeople[id].twitch = login;
  const st = stream(); if (!st.active.includes(id)) st.active.push(id);
  save(); pushState(); refreshPreview(); res.json({ ok: true });
});
// 🧪 🌙 stream night walk-through (pretend times, nothing saved)
app.get('/api/test/stream-night', (req, res) => {
  const H = 3600000, t0 = new Date(2026, 10, 7, 22, 30).getTime(), dayOf = t => new Date(t).toDateString();
  const steps = [], st = { day: dayOf(t0), startedAt: t0, movies: 0 };
  const check = (what, t, liveNow, expectSame) => { const over = nightOver(st, t, liveNow, dayOf(t)); const ok = over === !expectSame; steps.push({ what, same: !over, ok }); return ok; };
  st.movies = 1; check('10:30 pm: live, movie #1 won', t0, true, true);
  check('12:15 am: still live after midnight', t0 + 1.75 * H, true, true);
  st.offAt = t0 + 2 * H; check('12:32 am: internet dropped 2 minutes ago', t0 + 2 * H + 2 * 60000, false, true);
  delete st.offAt; st.movies = 2; check('12:35 am: back live, movie #2 won', t0 + 2.1 * H, true, true);
  st.offAt = t0 + 3 * H; check('1:59 am: offline for 59 minutes', t0 + 3 * H + 59 * 60000, false, true);
  check('2:31 am: offline for over an hour', t0 + 4 * H + 60000, false, false);
  const st2 = { day: dayOf(t0) }; const ok2 = nightOver(st2, t0 + 26 * H, false, dayOf(t0 + 26 * H)) === true; steps.push({ what: 'Never went live, next day', same: !ok2, ok: ok2 });
  res.json({ ok: steps.every(x => x.ok), steps, gapMins: NIGHT_GAP / 60000, now: { live: !!db.live, movies: db.stream?.movies || 0, offAt: db.stream?.offAt || null, startedAt: db.stream?.startedAt || null } });
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
  rollSend(rollStartMsg());
  pushState(); res.json({ ok: true });
});
app.post('/api/rollcall/checkin', (req, res) => { const p = live.rollcall?.people.find(x => x.key === req.body?.key); if (p && !live.rollcall.done && !p.here) checkIn(p); res.json({ ok: true }); });
app.post('/api/rollcall/end', (req, res) => { endRollcall(); res.json({ ok: true }); });
app.post('/api/rollcall/cancel', (req, res) => { if (live.rollcall) clearTimeout(live.rollcall.timer); live.rollcall = null; rollSend({ type: 'rollcallClose' }); pushState(); res.json({ ok: true }); });
app.post('/api/rollcall/close', (req, res) => { live.rollcall = null; rollSend({ type: 'rollcallClose' }); pushState(); res.json({ ok: true }); });
app.post('/api/rollcall/restore', (req, res) => { const n = restoreAway(); live.rollcall = null; rollSend({ type: 'rollcallClose' }); pushState(); refreshPreview(); res.json({ back: n }); });
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
    details: { director: m.director, cast: m.cast, genres: m.genres, synopsis: m.synopsis, runtime: m.runtime, collection: m.collection, imdbId: m.imdbId, tmdbRating: m.rating ?? null } };
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
const webLook = async (it, fake) => { // the TMDB movie for a list item (IMDb ids match exactly; Rotten Tomatoes goes by title + year)
  if (fake) return it.tmdbId ? { id: String(it.tmdbId), lang: it.lang || 'en', title: it.title, year: it.year } : null;
  const cache = (db.webTmdb ||= {}); let c = cache[it.key]; if (c?.id && c.lang != null) return c;
  let hit = it.imdbId ? await findImdb(it.imdbId).catch(() => null) : null;
  if (!hit) { const r = await searchMovies(it.title).catch(() => []); hit = r.find(m => it.year && Math.abs(Number(m.year) - Number(it.year)) <= 1 && m.title.toLowerCase() === it.title.toLowerCase()) || r.find(m => it.year && String(m.year) === String(it.year)) || (it.year ? null : r[0]); }
  if (!hit) return null; c = { id: String(hit.id), lang: hit.lang || '', title: hit.title, year: hit.year }; cache[it.key] = c; return c;
};
// ⭐ the rating the list itself shows (IMDb out of 10 / Rotten Tomatoes %): kept on the entry as webRating, shown in the pool + battle list
const webRate = it => it?.rating != null ? { site: 'imdb', v: Number(it.rating) } : it?.rt != null ? { site: 'rt', v: Number(it.rt) } : null;
const setRate = (e, it) => { const r = webRate(it); if (r) e.webRating = r; if (it?.runtime && !e.details?.runtime) e.details = { ...(e.details || {}), runtime: it.runtime }; };
const hEsc = t => String(t ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
// 🎞️ sequels: a movie in a series only goes on a 🌐 web list once you've watched every movie in that series that came out before it
const seriesParts = cid => series.partsOf(cid);
const seenMovie = p => !!lb.lookup({ title: p.title, year: p.year, tmdbId: p.id }) || (getList('movies')?.entries || []).some(e => String(e.tmdbId) === String(p.id) && e.status === 'watched');
async function sequelGap(tm, src, it) { // → the earlier movie in its series you haven't watched (null = fine)
  let parts;
  if (src.fake) { parts = it.coll ? src.fakeColl?.[it.coll] : null; if (!parts) return null; }
  else {
    const c = (db.webTmdb ||= {})[it.key]; let cid = c?.coll;
    if (cid === undefined) { const m = await tmdbMovie(tm.id, 8000); cid = m?.collection?.id || 0; if (c) c.coll = cid; }
    if (!cid) return null; parts = await seriesParts(cid);
  }
  const me = parts.find(p => String(p.id) === String(tm.id)); if (!me?.date) return null;
  return parts.find(p => p.date && p.date < me.date && String(p.id) !== String(tm.id) && !seenMovie(p)) || null;
}
// 🎬 movies someone picked in Discord (any that aren't hidden: in the pool, sitting out, benched or already watched) never go on a 🌐 web list
const discordPicked = () => { const m = new Map((getList('movies')?.entries || []).filter(e => e.tmdbId && e.status !== 'removed').map(e => [String(e.tmdbId), e])); for (const [id, l] of series.lockedNext()) if (!m.has(id)) m.set(id, { by: `${l.by} (🔒 their ${l.series})` }); return m; }; // (+ 🔒 the next movie of a series locked for someone: it's theirs)
async function syncWebList(l) {
  const src = l.source || {}, max = src.max || 500, urls = (src.urls || []).filter(Boolean), fake = src.fake;
  l.job = { running: true, step: 'Reading the lists…', done: 0, total: 0, at: Date.now() }; pushState();
  try {
    const onDiscord = new Set(discordPicked().keys());
    const kept = [], seenTm = new Set(), stats = { foreign: 0, discord: 0, watched: 0, sequel: 0, sequels: [], missed: [], read: 0, sources: [] };
    const look = it => webLook(it, fake);
    let spare = []; // the next ones on the list after it's full: they take the place of any that get picked in Discord
    const take = async items => { // check items in order until there are enough (returns how many it went through)
      let used = items.length;
      for (let i = 0; i < items.length && kept.length < max; i += 8) {
        const batch = items.slice(i, i + 8); const tms = await Promise.all(batch.map(it => look(it).catch(() => null)));
        const gaps = src.skipSequels === false ? [] : await Promise.all(batch.map((it, j) => tms[j] && !onDiscord.has(tms[j].id) ? sequelGap(tms[j], src, it).catch(() => null) : null));
        batch.forEach((it, j) => { if (kept.length >= max) return; const tm = tms[j]; stats.read++; if (kept.length + 1 >= max) used = i + j + 1;
          if (!tm) { stats.missed.push(`${it.title}${it.year ? ` (${it.year})` : ''}`); return; }
          if (seenTm.has(tm.id)) return; seenTm.add(tm.id);
          if (src.english !== false && tm.lang && tm.lang !== 'en') { stats.foreign++; return; }
          if (onDiscord.has(tm.id)) { stats.discord++; return; } // (always: a movie someone picked in Discord is theirs)
          if (src.skipWatched !== false && lb.lookup({ title: tm.title || it.title, year: tm.year || it.year, tmdbId: tm.id })) { stats.watched++; return; }
          if (gaps[j]) { stats.sequel++; if (stats.sequels.length < 50) stats.sequels.push(`${tm.title || it.title} (needs ${gaps[j].title}${gaps[j].year ? ` (${gaps[j].year})` : ''})`); return; } // 🎞️ you haven't watched the one before it
          kept.push({ ...it, tm, rank: kept.length + 1 }); });
        l.job = { running: true, step: `Checking the movies… ${kept.length} of ${max} so far`, done: stats.read, total: 0, at: Date.now() }; pushState();
      }
      return used;
    };
    const keepSpare = (items, used) => { if (kept.length >= max) spare = items.slice(used, used + 120).map(it => ({ key: it.key, title: it.title, year: it.year, imdbId: it.imdbId, tmdbId: it.tmdbId, lang: it.lang, rating: it.rating, rt: it.rt, runtime: it.runtime })); };
    if (fake) keepSpare(fake, await take(fake));
    else for (const url of urls) { // each link in order, reading deeper (more pages) while it still needs movies
      if (kept.length >= max) break;
      let want = (max - kept.length) * 2 + 20, items = [], err = null;
      try { items = await listsrc.readList(url, Math.min(2500, want), (page, n) => { l.job = { running: true, step: `Reading ${listsrc.siteOf(url) === 'imdb' ? 'IMDb' : 'Rotten Tomatoes'}… page ${page} (${n} movies)`, done: 0, total: 0, at: Date.now() }; pushState(); }); } catch (e) { err = e.message; }
      stats.sources.push({ url, found: items.length, error: err });
      const before = kept.length; keepSpare(items, await take(items));
      if (kept.length < max && items.length >= Math.min(2500, want) && !err) { const more = (await listsrc.readList(url, Math.min(2500, want * 3), () => {}).catch(() => [])).slice(items.length); keepSpare(more, await take(more)); } // (still short: read further down that list)
      stats.sources[stats.sources.length - 1].used = kept.length - before;
    }
    if (!kept.length) throw new Error(stats.sources.find(x => x.error)?.error || 'no movies left after skipping (try turning a skip off)');
    // add the new ones, keep the ones still on it, and hide the ones that dropped off (never deleted)
    const want = new Set(kept.map(k => k.tm.id)), have = new Map(l.entries.filter(e => e.tmdbId && e.status !== 'removed').map(e => [String(e.tmdbId), e]));
    const todo = kept.filter(k => !have.has(k.tm.id)); let added = 0, gone = 0;
    kept.forEach(k => { const e = have.get(k.tm.id); if (e) { e.webRank = k.rank; setRate(e, k); } });
    l.job = { running: true, step: 'Adding the movies…', done: 0, total: todo.length, at: Date.now() }; pushState();
    let k = 0;
    await Promise.all(Array.from({ length: fake ? 1 : 5 }, async () => { while (k < todo.length) { const it = todo[k++];
      try { const removed = l.entries.find(e => String(e.tmdbId) === it.tm.id && e.status === 'removed');
        if (removed) { removed.status = 'active'; removed.webRank = it.rank; delete removed.webTaken; setRate(removed, it); }
        else if (fake) { const e = { id: 'film-' + it.tm.id + '-' + uid().slice(0, 4), tmdbId: it.tm.id, label: it.title, sub: String(it.year || ''), weight: 1, status: 'active', addedAt: Date.now(), webRank: it.rank }; setRate(e, it); l.entries.push(e); }
        else { const e = await addFilm(l, it.tm.id); e.webRank = it.rank; setRate(e, it); }
        added++; } catch { stats.missed.push(it.title); }
      l.job.done++; if (l.job.done % 10 === 0) pushState(); } }));
    for (const e of l.entries) if (e.tmdbId && !want.has(String(e.tmdbId)) && ['active', 'paused'].includes(e.status)) { e.status = 'removed'; gone++; }
    l.source = { ...src, spare, rulesV: 2, at: Date.now(), count: kept.length, added, gone, foreign: stats.foreign, discord: stats.discord, watched: stats.watched, sequel: stats.sequel, sequels: stats.sequels, missed: stats.missed.slice(0, 50), sources: stats.sources, error: null };
    l.job = null; save(); pushState(); refreshPreview(); if (!fake) setTimeout(() => fillMovieInfo().catch(() => {}), 3000); // (⏱️ ⭐ any that are missing their length / rating)
    const skip = [stats.foreign && `${stats.foreign} not in English`, stats.discord && `${stats.discord} picked in Discord`, stats.watched && `${stats.watched} you've watched`, stats.sequel && `${stats.sequel} sequels (you haven't seen the one before)`].filter(Boolean).join(', ');
    broadcast({ type: 'toast', text: `🌐 “${l.name}” is ready: ${kept.length} movies (${added} new${gone ? `, ${gone} left` : ''})${skip ? ` · skipped ${skip}` : ''}${kept.length < max ? ` · only found ${kept.length} of ${max}: add another link to fill it up` : ''}` }, 'control');
  } catch (e) {
    console.error('[web list] ' + e.message);
    l.source = { ...src, error: e.message, at: src.at || null }; l.job = null; save(); pushState();
    broadcast({ type: 'toast', text: `⚠️ ${l.name}: ${e.message}` }, 'control');
  }
}
// 🎬→🌐 someone picked (in Discord) a movie that's on a web list: it leaves that list and the next movie on it takes its place
async function webReplace(l, rank, extraPicked) {
  const src = l.source || {}, picked = new Set([...discordPicked().keys(), ...(extraPicked ? extraPicked.keys() : [])]);
  const inList = new Set(l.entries.filter(e => e.tmdbId && ['active', 'paused'].includes(e.status)).map(e => String(e.tmdbId))), spare = [...(src.spare || [])];
  while (spare.length) {
    const it = spare.shift(), tm = await webLook(it, src.fake).catch(() => null); if (!tm) continue;
    if (inList.has(tm.id) || picked.has(tm.id)) continue;
    if (src.english !== false && tm.lang && tm.lang !== 'en') continue;
    if (src.skipWatched !== false && lb.lookup({ title: tm.title || it.title, year: tm.year || it.year, tmdbId: tm.id })) continue;
    if (src.skipSequels !== false && await sequelGap(tm, src, it).catch(() => null)) continue; // 🎞️
    let e = l.entries.find(x => String(x.tmdbId) === tm.id && x.status === 'removed');
    try {
      if (e) { e.status = 'active'; delete e.webTaken; }
      else if (src.fake) { e = { id: 'film-' + tm.id + '-' + uid().slice(0, 4), tmdbId: tm.id, label: it.title, sub: String(it.year || ''), weight: 1, status: 'active', addedAt: Date.now() }; l.entries.push(e); }
      else e = await addFilm(l, tm.id);
    } catch { continue; }
    e.webRank = rank; e.webSpare = true; setRate(e, it); l.source.spare = spare; return e;
  }
  l.source.spare = [];
  if (!src.fake) setTimeout(() => { if (!l.job?.running) syncWebList(l).catch(() => {}); }, 1500); // no spares left: read the lists again (it fills back up)
  return null;
}
let webSweepBusy = false;
async function webTakenSweep(opts = {}) { // opts.extra = Map(tmdbId → pretend Discord pick) for the test; opts.only = one list
  if (webSweepBusy) return []; webSweepBusy = true; const done = [];
  try {
    const picked = discordPicked(); for (const [k, v] of opts.extra || []) picked.set(k, v);
    for (const l of db.lists) {
      if (l.source?.kind !== 'web' || l.job?.running || (opts.only && l.id !== opts.only)) continue;
      if (live.game?.listId === l.id && ['lobby', 'running'].includes(live.phase)) continue; // its battle is going: after it's over
      const hits = l.entries.filter(e => e.tmdbId && ['active', 'paused'].includes(e.status) && picked.has(String(e.tmdbId)));
      for (const e of hits) {
        const d = picked.get(String(e.tmdbId)), by = d.backers?.[0]?.name || d.by || db.settings.streamerName || db.owner?.name || 'someone';
        e.status = 'removed'; e.webTaken = { by, at: Date.now() };
        const rep = await webReplace(l, e.webRank, opts.extra);
        const t = { title: `${e.label}${e.sub ? ` (${e.sub})` : ''}`, by, at: Date.now(), rep: rep ? `${rep.label}${rep.sub ? ` (${rep.sub})` : ''}` : null };
        l.source.taken = [t, ...(l.source.taken || [])].slice(0, 20); done.push({ list: l.name, ...t });
        broadcast({ type: 'toast', text: `🎬 ${hEsc(by)} picked <b>${hEsc(t.title)}</b> in Discord, so it left “${hEsc(l.name)}”${t.rep ? ` and <b>${hEsc(t.rep)}</b> took its place` : ' (no more spares: reading the list again to fill it back up)'}.` }, 'control');
      }
      if (hits.length) { save(); pushState(); if (db.activeListId === l.id) refreshPreview(); }
    }
  } catch (e) { console.error('[web list] ' + e.message); }
  finally { webSweepBusy = false; }
  return done;
}
setInterval(() => webTakenSweep().catch(() => {}), 5000);
// ⏱️ ⭐ movie length (and the TMDB rating, for 🌐 web lists that didn't show one) for movies that are missing it:
// a few at a time in the background (older entries, and ones added before we kept it). Each one is only tried once a week.
let fillBusy = false;
async function fillMovieInfo(max = 80) {
  if (fillBusy || !(db.settings.tmdbKey || '').trim()) return 0; fillBusy = true; let n = 0;
  try {
    const todo = [];
    for (const l of db.lists) if (l.type === 'movies' || l.type === 'films') for (const e of l.entries) {
      if (!e.tmdbId || e.kind === 'spot' || e.test || e.status === 'removed' || l.source?.fake) continue;
      const needRun = !e.details?.runtime, needRate = l.source?.kind === 'web' && !e.webRating && e.details?.tmdbRating == null;
      if ((needRun || needRate) && !(e.infoTry > Date.now() - 7 * 864e5)) todo.push(e);
    }
    for (const e of todo.slice(0, max)) {
      e.infoTry = Date.now();
      const m = await tmdbMovie(e.tmdbId, 8000).catch(() => null); if (!m) continue;
      e.details = { ...(e.details || {}) }; if (m.runtime) e.details.runtime = m.runtime; if (m.rating != null) e.details.tmdbRating = m.rating; if (!e.details.imdbId && m.imdbId) e.details.imdbId = m.imdbId;
      n++; await new Promise(r => setTimeout(r, 120));
    }
    if (todo.length) { save(); pushState(); }
  } catch (e) { console.error('[movie info] ' + e.message); }
  finally { fillBusy = false; }
  return n;
}
setTimeout(() => fillMovieInfo().catch(() => {}), 40000); setInterval(() => fillMovieInfo().catch(() => {}), 10 * 60000);
// 🏴‍☠️ the Pirate Battle's ships are named after these channels (Derek, 1.69.2): their figureheads wear the channels' Twitch pictures (1.70.0)
const SHIP_LOGINS = edScrub ? [] : ['timepeace49', 'kirbgames']; // (🧽 other streamers' editions: plain skull figureheads)
const shipIcons = () => SHIP_LOGINS.map(l => proxied(db.shipPics?.[l] || (String(db.owner?.login || '').toLowerCase() === l ? db.owner.avatar : '')) || '');
async function refreshShipPics(force) {
  const c = db.shipPics ||= {};
  if (!force && c.at && Date.now() - c.at < 12 * 3600e3 && SHIP_LOGINS.every(l => c[l])) return { ok: true, cached: true, pics: shipIcons() };
  const m = await twitch.getUsers(SHIP_LOGINS).catch(() => new Map()); let changed = false;
  for (const l of SHIP_LOGINS) { const a = m.get(l)?.avatar; if (a && a !== c[l]) { c[l] = a; changed = true; } }
  if (m.size) c.at = Date.now();
  if (changed) { save(); cards.sendScene(); pushState(); }
  return { ok: m.size > 0, found: SHIP_LOGINS.filter(l => m.get(l)?.avatar), pics: shipIcons() };
}
setTimeout(() => refreshShipPics().catch(() => {}), 30000); setInterval(() => refreshShipPics().catch(() => {}), 6 * 3600e3);
// 🎞️ series locks + sequel bans: a quick check every minute (nothing to download unless a new series turns up)
series.setHooks({ streamer: () => streamerName(), toast: t => broadcast({ type: 'toast', text: hEsc(t) }, 'control'), changed: () => { pushState(); if (cloud.enabled()) cloud.sync(true).catch?.(() => {}); webTakenSweep().catch(() => {}); } });
setInterval(() => { if (!openLast.running) series.refresh().catch(() => {}); }, 60000);
// 🔚 the LAST thing on open (Derek): once everything else has started (Letterboxd, the ban list builder), update the 🎞️ series bans, then read the 🌐 web lists (the 500 worst) again
const openLast = { running: false, step: '', at: 0 };
async function runOpenLast(waitFor) {
  openLast.running = true;
  try {
    await new Promise(r => setTimeout(r, 30000));
    await Promise.race([Promise.resolve(waitFor).catch(() => {}), new Promise(r => setTimeout(r, 180000))]); // (Letterboxd first: it says what you've watched)
    for (let i = 0; i < 60 && (banScan.running || dubFix.running); i++) await new Promise(r => setTimeout(r, 5000));
    openLast.step = 'series'; await series.refresh({ deep: true }).catch(() => {});
    for (const l of db.lists) if (l.source?.kind === 'web' && !l.source.fake && (l.source.urls || []).length && !l.job?.running && !(live.game?.listId === l.id && ['lobby', 'running'].includes(live.phase))) { openLast.step = 'web'; await syncWebList(l).catch(() => {}); }
    openLast.at = Date.now();
  } finally { openLast.running = false; openLast.step = ''; }
}
app.post('/api/test/web-taken', async (req, res) => { // 🧪 pretend someone picks a movie from the pretend IMDb battle in Discord (nothing real changes)
  const l = [...db.lists].reverse().find(x => x.source?.kind === 'web' && x.source.fake);
  if (!l) return res.status(400).json({ error: 'Make the pretend IMDb battle first: 🧪 Test tab → 🌐 IMDb / Rotten Tomatoes battle → Try it.' });
  if (l.job?.running) return res.status(400).json({ error: 'The pretend battle is still filling up, try again in a second.' });
  const act = l.entries.filter(e => e.status === 'active' && e.tmdbId); if (!act.length) return res.status(400).json({ error: 'The pretend battle has no movies.' });
  const e = act[Math.floor(Math.random() * act.length)], before = act.length, spares = (l.source.spare || []).length;
  for (let i = 0; i < 20 && webSweepBusy; i++) await new Promise(r => setTimeout(r, 100));
  const done = await webTakenSweep({ only: l.id, extra: new Map([[String(e.tmdbId), { by: 'Pretend_Picker' }]]) });
  res.json({ ok: true, list: l.name, picked: `${e.label}${e.sub ? ` (${e.sub})` : ''}`, done, before, after: l.entries.filter(x => x.status === 'active').length, sparesBefore: spares, sparesAfter: (l.source.spare || []).length, listId: l.id });
});
app.get('/api/lists/web/presets', (req, res) => res.json(listsrc.PRESETS));
app.post('/api/lists/web', (req, res) => { // make a new IMDb / Rotten Tomatoes battle, or change + update one
  const b = req.body || {}; let l = b.listId ? getList(b.listId) : null;
  if (l?.job?.running) return res.status(400).json({ error: 'Already updating, give it a minute.' });
  const urls = Array.isArray(b.urls) ? b.urls.map(u => String(u).trim()).filter(u => /^https?:\/\//i.test(u)).slice(0, 10) : null;
  if (urls) { const bad = urls.find(u => !listsrc.siteOf(u)); if (bad) return res.status(400).json({ error: `That link isn't IMDb or Rotten Tomatoes: ${bad}` }); }
  const opts = { ...(urls ? { urls } : {}), ...(b.max != null ? { max: Math.max(10, Math.min(1000, Number(b.max) || 500)) } : {}), ...['english', 'skipDiscord', 'skipWatched', 'skipSequels'].reduce((o, k) => (b[k] != null ? { ...o, [k]: !!b[k] } : o), {}) };
  if (!l) {
    if (!b.fake && !(urls || []).length) return res.status(400).json({ error: 'Add at least one IMDb or Rotten Tomatoes link.' });
    l = { id: uid(), name: String(b.name || '💩 The 500 worst movies').slice(0, 60), type: 'films', entries: [], joinOpen: false, source: { kind: 'web', max: 500, english: true, skipDiscord: true, skipWatched: true, urls: [], ...opts, ...(b.fake ? { fake: b.fake } : {}) } };
    db.lists.push(l); db.activeListId = l.id; leaveEnded(); save();
  } else l.source = { ...(l.source || {}), kind: 'web', ...opts };
  syncWebList(l);
  pushState(); res.json({ ok: true, id: l.id });
});
app.post('/api/test/nudity', async (req, res) => { // 🧪 🔞 the nudity heads-up: a real check of any movie, or a pretend one (no internet)
  const b = req.body || {};
  if (b.fake) return res.json({ title: 'Pretend Movie (2001)', runtime: 112, nudity: fakeNudity(112) }); // (no internet)
  const q = String(b.query || '').trim(); if (!q) return res.status(400).json({ error: 'Type a movie name first.' });
  try {
    const hit = /^\d+$/.test(q) ? { id: q } : (await searchMovies(q))[0]; if (!hit) return res.status(404).json({ error: `Couldn't find “${q}” on TMDB.` });
    const m = await tmdbMovie(hit.id, 8000);
    res.json({ title: `${m.title}${m.year ? ` (${m.year})` : ''}`, runtime: m.runtime, nudity: await checkNudity({ tmdbId: m.id, imdbId: m.imdbId, runtime: m.runtime }, !!b.force) });
  } catch (e) { res.status(400).json({ error: e.message }); }
});
app.post('/api/test/web-list', (req, res) => { // 🧪 a pretend IMDb battle (made-up movies, no internet): shows the skipping + "keep going until full"
  const fake = Array.from({ length: 40 }, (_, i) => ({ key: 'tt-test-' + i, title: `Bad Movie ${i + 1}`, year: 1990 + (i % 30), tmdbId: 990000 + i, lang: i % 7 === 3 ? 'fr' : 'en', rating: Math.round((1 + i * 0.07) * 10) / 10, runtime: 78 + (i * 13) % 60 })); // (⭐ pretend IMDb ratings + ⏱️ lengths)
  fake[1].coll = 'c1'; fake[12] = { ...fake[12], title: 'Bad Movie 2: The Sequel', year: 2005, coll: 'c1' }; // 🎞️ a pretend series: the sequel is skipped (you haven't watched Bad Movie 2)
  const fakeColl = { c1: [{ id: '990001', title: 'Bad Movie 2', year: '1991', date: '1991-05-01' }, { id: '990012', title: 'Bad Movie 2: The Sequel', year: '2005', date: '2005-05-01' }] };
  const movies = getList('movies'); if (movies && !movies.entries.some(e => String(e.tmdbId) === '990005')) movies.entries.push({ id: 'film-990005-test', tmdbId: 990005, label: 'Bad Movie 6', sub: '1995', weight: 1, status: 'active', addedAt: Date.now(), test: true });
  req.body = { name: '🧪 Pretend worst movies (IMDb test)', fake, max: Number(req.body?.max) || 20, english: true, skipDiscord: true, skipWatched: true };
  const b = req.body, l = { id: uid(), name: b.name, type: 'films', entries: [], joinOpen: false, source: { kind: 'web', max: b.max, english: true, skipDiscord: true, skipWatched: true, skipSequels: true, urls: [], fake, fakeColl } };
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
// ⬇️⬆️ the movies YOU banned (not the automatic ones): export as a spreadsheet file, import it again (here or on another PC)
const myBans = () => (db.bans || []).filter(b => !b.auto && !b.test).sort((a, b) => (a.at || 0) - (b.at || 0));
const csvCell = v => { const t = String(v ?? ''); return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t; };
function bansCsv() { return ['tmdbId,title,year,reason,banned on', ...myBans().map(b => [b.tmdbId, b.title, b.year || '', b.reason || '', b.at ? new Date(b.at).toISOString().slice(0, 10) : ''].map(csvCell).join(','))].join('\r\n') + '\r\n'; }
function parseCsv(text) { // (quotes, commas inside quotes, "" = a quote)
  const rows = [], t = String(text || '').replace(/^﻿/, ''); let row = [], cell = '', q = false;
  for (let i = 0; i < t.length; i++) { const ch = t[i];
    if (q) { if (ch === '"' && t[i + 1] === '"') { cell += '"'; i++; } else if (ch === '"') q = false; else cell += ch; }
    else if (ch === '"') q = true; else if (ch === ',') { row.push(cell); cell = ''; } else if (ch === '\n' || ch === '\r') { if (ch === '\r' && t[i + 1] === '\n') i++; row.push(cell); cell = ''; if (row.some(x => x.trim())) rows.push(row); row = []; } else cell += ch; }
  row.push(cell); if (row.some(x => x.trim())) rows.push(row); return rows;
}
function bansFromFile(text) { // → [{tmdbId, title, year, reason}] from our CSV (or a JSON list)
  const s = String(text || '').trim(); if (!s) return [];
  if (s[0] === '{' || s[0] === '[') { const j = JSON.parse(s), list = Array.isArray(j) ? j : j.bans || []; return list.map(b => ({ tmdbId: b.tmdbId ?? b.id, title: b.title || '', year: b.year || '', reason: b.reason || '' })).filter(b => /^\d+$/.test(String(b.tmdbId))); }
  const rows = parseCsv(s), head = rows[0].map(h => h.trim().toLowerCase()), ix = k => head.indexOf(k), hasHead = ix('tmdbid') >= 0;
  return (hasHead ? rows.slice(1) : rows).map(r => ({ tmdbId: (r[hasHead ? ix('tmdbid') : 0] || '').trim(), title: (r[hasHead ? ix('title') : 1] || '').trim(), year: (r[hasHead ? ix('year') : 2] || '').trim(), reason: (r[hasHead ? ix('reason') : 3] || '').trim() })).filter(b => /^\d+$/.test(b.tmdbId));
}
app.get('/api/bans/export', (req, res) => { res.setHeader('Content-Type', 'text/csv; charset=utf-8'); res.setHeader('Content-Disposition', `attachment; filename="movie-royal-my-bans-${new Date().toISOString().slice(0, 10)}.csv"`); res.send('﻿' + bansCsv()); });
app.post('/api/bans/import', express.text({ type: '*/*', limit: '5mb' }), (req, res) => { // adds them as your own bans (never removes any)
  let list; try { list = bansFromFile(req.body); } catch (e) { return res.status(400).json({ error: "That file isn't a Movie Royal bans file (CSV or JSON)." }); }
  if (!list.length) return res.status(400).json({ error: 'No movies found in that file (it needs a tmdbId column).' });
  let added = 0, had = 0;
  for (const b of list) { if (isBannedId(b.tmdbId) || (db.bans || []).some(x => String(x.tmdbId) === String(b.tmdbId))) { had++; continue; } if (banMovie({ id: Number(b.tmdbId), title: b.title || `TMDB ${b.tmdbId}`, year: b.year || null }, b.reason)) added++; }
  if (added) act('discord', `added ${added} bans from a bans file`, { icon: '⬆️', who: streamerName(), kind: 'ban' }); // 🧾
  save(); pushState(); refreshPreview(); if (cloud.enabled()) cloud.sync(true).catch?.(() => {});
  res.json({ ok: true, found: list.length, added, had });
});
app.post('/api/test/ban-export', (req, res) => { // 🧪 the export file, read back (nothing changes)
  const csv = bansCsv(), back = bansFromFile(csv), mine = myBans();
  res.json({ ok: true, mine: mine.length, lines: csv.trim().split(/\r?\n/).slice(0, 6), readBack: back.length, same: back.length === mine.length && back.every((b, i) => String(b.tmdbId) === String(mine[i].tmdbId) && b.title === mine[i].title) });
});
app.get('/api/bans', (req, res) => res.json({ ok: (db.banOk || []).map(id => ({ tmdbId: id, title: db.banOkTitles?.[id] || null })), bans: [...(db.bans || [])].sort((a, b) => b.at - a.at), yearAllow: (db.yearAllow || []).map(id => ({ tmdbId: id, title: db.yearAllowTitles?.[id] || null })), year: new Date().getFullYear() }));
app.post('/api/bans', async (req, res) => {
  try {
    let id = String(req.body?.tmdbId || '');
    if (!/^\d+$/.test(id)) { const r = await searchMovies(String(req.body?.query || '')); if (!r.length) return res.status(400).json({ error: 'Movie not found' }); id = String(r[0].id); }
    const m = await tmdbMovie(id);
    const added = banMovie({ id: m.id, title: m.title, year: m.year, poster: m.poster }, req.body?.reason);
    if (added) act('discord', `banned “${m.title}${m.year ? ` (${m.year})` : ''}”${req.body?.reason ? `: ${String(req.body.reason).slice(0, 100)}` : ''}`, { icon: '🚫', who: streamerName(), kind: 'ban' }); // 🧾
    pushState(); refreshPreview(); res.json({ ok: true, msg: added ? `Banned ${m.title} (${m.year})` : `${m.title} was already banned` });
  } catch (e) { res.status(400).json({ error: e.message }); }
});
app.delete('/api/bans/:id', (req, res) => { const b0 = (db.bans || []).find(x => String(x.tmdbId) === String(req.params.id)); unbanMovie(req.params.id); if (b0) act('discord', `unbanned “${b0.title}${b0.year ? ` (${b0.year})` : ''}”`, { icon: '✅', who: streamerName(), kind: 'unban' }); pushState(); res.json({ ok: true }); });
// 🎞️ series in order + 🔒 series locks (🚫 Banned Movies → 🎞️ Series)
app.get('/api/series', (req, res) => res.json({ series: series.list(), log: series.recent().map(l => ({ ...l, text: series.eventText(l) })), state: series.state, openLast, people: discordPeople().map(p => ({ id: p.discordId, name: p.name })).sort((a, b) => a.name.localeCompare(b.name)) }));
app.post('/api/series/lock', async (req, res) => { // by hand: lock a series for someone (or open it for everyone)
  try { const id = String(req.body?.discordId || ''), p = id ? discordPeople().find(x => x.discordId === id) : null; if (id && !p) throw new Error("That person isn't on the Discord list."); const r = await series.setLock(String(req.body?.id), p ? { discordId: p.discordId, name: p.name } : null); res.json({ ok: true, ...r }); }
  catch (e) { res.status(400).json({ error: e.message }); }
});
app.post('/api/series/refresh', (req, res) => { if (series.state.running) return res.json({ ok: false, error: 'Already checking the series.' }); series.refresh({ deep: !!req.body?.deep }).then(() => broadcast({ type: 'toast', text: '🎞️ Series checked: the sequel bans and locks are up to date.' }, 'control')).catch(() => {}); res.json({ ok: true }); });
app.post('/api/series/add', async (req, res) => { // add a series by one of its movies (so its sequels get banned now)
  try { let id = String(req.body?.tmdbId || ''); if (!/^\d+$/.test(id)) { const r = await searchMovies(String(req.body?.query || '')); if (!r.length) throw new Error('Movie not found'); id = String(r[0].id); }
    const m = await tmdbMovie(id, 8000); if (!m.collection) throw new Error(`${m.title} isn't part of a series on TMDB.`);
    await series.addSeries(m.collection.id); res.json({ ok: true, name: m.collection.name, id: m.collection.id }); }
  catch (e) { res.status(400).json({ error: e.message }); }
});
app.post('/api/test/series', (req, res) => { // 🧪 a pretend series, step by step (nothing real changes)
  const parts = [1, 2, 3, 4].map(n => ({ id: 'w' + n, title: `Wizard School ${n}`, year: String(2000 + n * 2), date: `${2000 + n * 2}-06-01` }));
  const seenSet = new Set(), seen = p => seenSet.has(p.id), out = [], A = { discordId: 'pa', name: 'Pretend_Alex' }, B = { discordId: 'pb', name: 'Pretend_Bea' };
  let lock = null, pool = [], t = 1000; const max = 3;
  const ask = (who, n) => { const r = series.seriesRule({ parts, seen, lock, movieId: 'w' + n, userId: who.discordId, name: 'Wizard School series', streamer: streamerName() }); return r ? r.msg.replace(/\*\*/g, '').replace(/\*/g, '') : `✅ ${who.name} can pick Wizard School ${n}`; };
  const step = () => { const next = series.nextPart(parts, seen), h = next && pool.find(x => x.id === next.id); const r = series.lockStep(lock, { next, holder: h ? h.who : null, addedSince: (id, since) => pool.filter(x => x.who.discordId === id && x.at > since).length, max, now: ++t }); lock = r.lock; return r.event; };
  const state = () => { const next = series.nextPart(parts, seen); return `next to watch: ${next ? next.title : 'none'} · banned: ${parts.filter(p => next && p.date > next.date && !seen(p)).map(p => p.title.replace('Wizard School ', '#')).join(', ') || 'none'} · ${lock ? `🔒 locked for ${lock.name}` : '🔓 open for everyone'}`; };
  out.push({ say: '1. Nobody has watched any of it yet', state: state(), checks: [ask(B, 2), ask(B, 1)] });
  pool.push({ id: 'w1', who: A, at: ++t }); step(); out.push({ say: '2. Pretend_Alex picks Wizard School 1', state: state(), checks: [ask(B, 2)] });
  seenSet.add('w1'); pool = pool.filter(x => x.id !== 'w1'); step(); out.push({ say: '3. Wizard School 1 wins and gets watched', state: state(), checks: [ask(B, 2), ask(A, 2), ask(A, 3)] });
  for (let i = 1; i <= 3; i++) { pool.push({ id: 'other' + i, who: A, at: ++t }); step(); }
  out.push({ say: "4. Alex's next 3 picks are other movies (not Wizard School 2)", state: state(), checks: [ask(B, 2)] });
  pool.push({ id: 'w2', who: B, at: ++t }); step(); out.push({ say: '5. Pretend_Bea picks Wizard School 2', state: state(), checks: [ask(A, 2), ask(A, 3)] });
  res.json({ ok: true, steps: out });
});
// 🔄 the ban list builder (banscan.js): progress goes to the control panel as it runs
let scanPushAt = 0;
// 🔄 refresh the WHOLE banned list (Banned Movies, top): the rule scan, last year's bans, the dub check and every 🎞️ series. Only adds / removes automatic bans, never yours.
const banAll = { running: false, at: 0 };
app.post('/api/bans/refresh-all', async (req, res) => {
  if (banAll.running || banScan.running) return res.json({ ok: false, error: 'Already refreshing the banned list.' });
  banAll.running = true; res.json({ ok: true }); const fake = !!req.body?.fake; // (🧪 fake = pretend movies, no internet)
  const before = (db.bans || []).length, mineBefore = (db.bans || []).filter(b => !b.auto && !b.test).length, show = step => broadcast({ type: 'banScan', scan: { ...banScan, running: true, all: true, step } }, 'control');
  let err = null;
  try {
    if (fake) await runScan({ fake: true }); else if (String(db.settings.tmdbKey || '').trim()) await runScan(); else err = 'needs your TMDB key (Settings → Movie info) to look movies up';
    show("📅 Taking off last year's “this year” bans…"); if (!fake) await yearCleanup().catch(() => {});
    show('🗣️ Checking “not in English” bans for English dubs…'); await dubCleanup({ fake }).catch(() => {});
    show('🎞️ Checking every series (sequels + locks)…'); await series.refresh({ deep: !fake }).catch(() => {});
  } catch (e) { err = e.message; }
  banAll.running = false; banAll.at = Date.now(); save(); pushState(); if (cloud.enabled()) cloud.sync(true).catch?.(() => {});
  const after = (db.bans || []).length, mineAfter = (db.bans || []).filter(b => !b.auto && !b.test).length;
  if (mineAfter < mineBefore) console.error(`[bans] refresh-all: your own bans went from ${mineBefore} to ${mineAfter} (should never happen)`);
  broadcast({ type: 'banScan', scan: { ...banScan, running: false, all: false, allDone: { before, after, at: banAll.at, err } } }, 'control');
});
setScanHooks({ changed: () => { broadcast({ type: 'banScan', scan: { ...banScan, all: banAll.running } }, 'control'); if (!banScan.running || Date.now() - scanPushAt > 15000) { scanPushAt = Date.now(); pushState(); } } });
app.get('/api/bans/scan', (req, res) => res.json({ ...banScan, all: banAll.running }));
app.post('/api/bans/scan', (req, res) => { if (banScan.running) return res.json({ ok: false, error: 'Already updating the list.' }); runScan({ only: req.body?.only || null }).catch(() => {}); res.json({ ok: true }); });
app.post('/api/test/ban-scan', (req, res) => { if (banScan.running) return res.json({ ok: false, error: 'Already updating the list.' }); runScan({ fake: true }).catch(() => {}); res.json({ ok: true }); });
app.post('/api/test/ban-year', async (req, res) => { // 🧪 pretend it's a new year: last year's pretend "this year" bans come off the list
  const last = String(Number(new Date().getFullYear()) - 1);
  for (let i = 0; i < 3; i++) (db.bans ||= []).push({ tmdbId: 'year-test' + i, title: `🧪 Last Year's Hit ${i + 1}`, year: last, poster: null, reason: `${last} movie`, auto: 'year', at: Date.now(), test: true });
  save(); const before = db.bans.length, r = await yearCleanup(); pushState();
  res.json({ ok: true, added: 3, removed: r.removed, kept: r.kept, before, after: db.bans.length });
});
// first open after the update: build the ban list once (when TMDB is set up), and check the "this year" bans every 6 hours
setTimeout(() => { yearCleanup().catch(() => {}); if (!db.banSeed && String(db.settings.tmdbKey || '').trim()) runScan().catch(() => {}); else if (!db.dubChecked && String(db.settings.tmdbKey || '').trim()) dubCleanup().then(r => { if (r.removed) console.log(`[bans] ${r.removed} movies with an English dub came off the ban list`); pushState(); }).catch(() => {}); }, 20000);
app.post('/api/test/ban-dub', async (req, res) => { // 🧪 dubbed movies: three pretend "not in English" bans get checked again (no internet)
  const mk = (i, title, fake) => ({ tmdbId: 'dub-test' + i, title, year: '2010', poster: null, reason: 'not in English', auto: 'english', at: Date.now(), test: true, fake });
  db.bans = (db.bans || []).filter(b => !String(b.tmdbId).startsWith('dub-test'));
  db.bans.push(mk(1, '🧪 Anime With a Dub', { lang: 'ja', spoken: ['ja'], allGenres: ['Animation', 'Fantasy'], keywords: [], votes: 80 }), mk(2, '🧪 Famous Foreign Hit', { lang: 'fr', spoken: ['fr'], allGenres: ['Drama'], keywords: [], votes: 6000 }), mk(3, '🧪 Small Foreign Film', { lang: 'fr', spoken: ['fr'], allGenres: ['Drama'], keywords: [], votes: 40 }));
  const r = await dubCleanup({ fake: true }); const left = db.bans.filter(b => String(b.tmdbId).startsWith('dub-test')).map(b => b.title);
  db.bans = db.bans.filter(b => !String(b.tmdbId).startsWith('dub-test')); save(); pushState();
  res.json({ ok: true, removed: r.removed, stillBanned: left, on: (db.settings.banRules || {}).dubbed !== false && (db.settings.banRules || {}).english !== false });
});
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
// 🚫 sample movies for the ban rules, with what each one should get under the standard rules (🤖 Test all checks them; 🧪 Try the rules shows them)
const BAN_SAMPLES = [
    ['Amélie (2001): well-known, so it likely has an English dub', { lang: 'fr', spoken: ['fr'], allGenres: ['Comedy', 'Romance'], keywords: ['paris'], votes: 11000 }, null],
    ['Spirited Away (2001): anime, has an English dub', { lang: 'ja', spoken: ['ja'], allGenres: ['Animation', 'Family', 'Fantasy'], keywords: [], votes: 17000 }, null],
    ['Le Petit Village (a small French movie, 40 votes)', { lang: 'fr', spoken: ['fr'], allGenres: ['Drama'], keywords: [], votes: 40 }, 'english'],
    ['Inglourious Basterds (2009): some French/German, mostly English', { lang: 'en', spoken: ['en', 'de', 'fr', 'it'], allGenres: ['Drama', 'Thriller', 'War'], keywords: ['nazi'] }, null],
    ['Parasite (2019)', { lang: 'ko', spoken: ['ko', 'en'], allGenres: ['Comedy', 'Thriller', 'Drama'], keywords: [] }, null],
    ['Apocalypto (2006)', { lang: 'en', spoken: ['yua'], allGenres: ['Action', 'Drama'], keywords: [] }, 'english'],
    ['The Passion of the Christ (2004)', { lang: 'en', spoken: ['en', 'he', 'la'], allGenres: ['Drama', 'History'], keywords: ['jesus christ', 'crucifixion', 'bible'] }, 'religious'],
    ['The Ten Commandments (1956)', { lang: 'en', spoken: ['en'], allGenres: ['Drama', 'History'], keywords: ['moses', 'ten commandments', 'old testament'] }, 'religious'],
    ["God's Not Dead (2014)", { lang: 'en', spoken: ['en'], allGenres: ['Drama'], keywords: ['christian film', 'atheism'] }, 'religious'],
    ["Monty Python's Life of Brian (1979)", { lang: 'en', spoken: ['en'], allGenres: ['Comedy'], keywords: ['jesus christ', 'bible', 'satire'] }, null],
    ['The Book of Eli (2010)', { lang: 'en', spoken: ['en'], allGenres: ['Action', 'Thriller', 'Science Fiction'], keywords: ['bible', 'post-apocalyptic'] }, null],
    ['The Exorcist (1973)', { lang: 'en', spoken: ['en'], allGenres: ['Horror'], keywords: ['exorcism', 'priest', 'catholic', 'faith', 'god'] }, null],
    ['Free Solo (2018)', { lang: 'en', spoken: ['en'], allGenres: ['Documentary'], keywords: ['climbing'] }, 'documentary'],
    ['Jackass: The Movie (2002)', { lang: 'en', spoken: ['en'], allGenres: ['Comedy', 'Documentary'], keywords: ['stunt'] }, null],
    ['Heat (1995)', { lang: 'en', spoken: ['en', 'es'], allGenres: ['Crime', 'Drama', 'Action'], keywords: ['heist'] }, null]
];
app.post('/api/test/ban-rules', (req, res) => {
  const T = BAN_SAMPLES.map(([t, d]) => { const rb = autoBan({ id: 'test', ...d }); return { title: t, banned: !!rb, reason: rb?.reason || null }; });
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
app.post('/api/racepowers/rewards', async (req, res) => { // 🏁 add the race power-up rewards to Twitch (paused unless a chat battle with race power-ups is on a race map)
  try {
    const st = db.settings, made = [], prompts = { boost: 'Race: a speed boost for your car. Type !join first!', shield: 'Race: a shield that blocks one rocket, oil slick or crash. Type !join first!', oil: 'Race: drop an oil slick behind you; whoever drives over it spins out. Type !join first!', rocket: 'Race: fire a rocket straight ahead at whoever is in front of you. Type !join first!', nuke: 'Race: ☢️ NUKE. You get a force field and everyone else is wiped out. You win the race. Type !join first!' };
    for (const [title, kind] of Object.entries(st.raceRewards || {})) if (await twitch.createReward({ title, cost: st.raceCosts?.[kind] || 1000, prompt: prompts[kind] || '', color: kind === 'nuke' ? '#7DFF3A' : '#FF8A3A', queue: true })) made.push(title);
    rewardKey = ''; await syncRewards();
    res.json({ ok: true, made });
  } catch (e) { res.status(400).json({ error: e.message }); }
});
app.post('/api/stormpowers/rewards', async (req, res) => { try { res.json({ ok: true, ...(await stormSetup()) }); } catch (e) { res.status(400).json({ error: e.message }); } }); // ⛈️ add the storm power rewards to Twitch
setInterval(() => { if (twitch.status.userId && !db.stormSetup && !stormSetup.busy) { stormSetup.busy = true; stormSetup().catch(e => console.error('[twitch] storm rewards:', e.message)).finally(() => { stormSetup.busy = false; }); } }, 30000); // (made once by itself after signing in)
app.post('/api/test/monkey', (req, res) => { const who = String(req.body?.who || 'T').toUpperCase(), err = monkeyRedeem({ name: 'test_viewer', login: 'test_viewer' }, who, true); err ? res.status(400).json({ error: err }) : res.json({ ok: true }); }); // 🧪 a pretend Take out Time / Kirb
app.post('/api/test/storm', (req, res) => { // 🧪 a pretend storm power in the Pirate Battle on stream
  const kind = String(req.body?.kind || 'wave'); if (!STORM_INFO[kind]) return res.status(400).json({ error: 'Which storm power?' });
  if (!stormOn()) return res.status(400).json({ error: 'Start a Pirate Battle first (🏴‍☠️ Practice battle).' });
  stormSend(kind, String(req.body?.name || 'test_viewer')); res.json({ ok: true });
});
app.post('/api/rewards/pause-all', async (req, res) => { // the app is closing: nothing can be redeemed while it's off
  resumeSave('close'); activity.flush(); // (🧾 the last lines of the complete history are saved right away)
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
  act('chat', `entered the giveaway${w !== 1 ? ` (×${w} odds)` : ''}`, { icon: '🎁', who: m.name, kind: 'join', list: l.name }); // 🧾
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
function mapsWithTags() { const r = mapRuns(); return MAPS_ON().map(m => ({ ...m, tag: !r[m.id] ? 'new' : (r[m.id].rev || 1) < (m.rev || 1) ? 'updated' : null })).sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })); } /* A to Z in every map menu */
app.post('/api/maps/reset-tags', (req, res) => { // ↺ the 🔴 NEW / 🔵 UPDATED tags back on: one map ({id, kind:'ball'|'card'}) or every ball + card map
  const id = req.body?.id ? String(req.body.id) : null;
  if (!id) { db.mapRuns = {}; cards.resetTags(); }
  else if (req.body.kind === 'card') cards.resetTags(id); else delete mapRuns()[id];
  save(); pushState(); cards.sendScene?.(); res.json({ ok: true });
});
function markMapRun(id) { const m = mapById(id); if (!m || !db.live) return; mapRuns()[id] = { rev: m.rev || 1, at: Date.now() }; } // only battles while you're live count
// 🧍 character-only maps (Kung Fu Town, Royal Rumble, Wizard Battle, Colosseum, WW2): battles with characters on can use them
const isCharMap = id => cards.CARD_MAPS.some(m => m.id === id);
const charsOn = () => { const l = getList(db.activeListId); return !!l?.chars || itemLook(l) || maraCharList(l); };
const maraCharList = l => paid.dev() && !!l && l.id === paid.cfg().listId; // 🏃 (1.81.0) the marathon battle only uses character maps, so it always fights with characters / things // (🏃 the marathon's things can use the character maps too)
/** 🏃 (1.77.0) the marathon battle's pieces are the things themselves (Settings → 💰 → 🏃 Marathon picks: "things look like themselves") */
function itemLook(l) { return paid.dev() && !!l && l.id === paid.cfg().listId && marathon.cfg().itemLook !== false; } // (🛠️ dev mode only)
const charFighters = fighters => fighters.map(f => ({ id: f.id, packId: f.id, name: f.label, tag: '', game: f.owner || '', image: f.image || f.poster || null, color: f.color || null, char: !f.item, item: f.item || undefined, gym: f.gym || undefined, sign: f.sign || undefined, look: f.look || null, gender: f.gender || 'n', chaos: f.chaos || undefined }));
function currentMap() {
  { const l = getList(db.activeListId); if (maraCharList(l) && live.phase !== 'lobby' && live.phase !== 'running' && (!live.map || !marathon.maps().some(m => m.id === live.map) || (!live.mapPick && maraDefMap() && live.map !== maraDefMap()))) { live.map = maraRandomMap(); live.mapPick = false; } } // 🏃 marathon battle: never a ball / car map
  if (live.map && isCharMap(live.map) && !charsOn()) live.map = null; // (characters turned off: back to a ball map)
  { const want = db.settings.map; if (isCharMap(want) && charsOn() && !live.mapPick && live.map !== want && live.phase !== 'lobby' && live.phase !== 'running') live.map = want; } // (🏃 mapPick: a marathon battle's picked map stays) // (characters turned on with a character-only map picked)
  const idle = live.phase !== 'lobby' && live.phase !== 'running';
  if (idle && live.map && isRaceMap(live.map) && !raceOk()) { live.raceSkip = live.map; live.map = null; } // 🏁 too many pieces for a race
  if (idle && live.raceSkip && raceOk() && (!live.map || !isRaceMap(live.map))) { live.map = live.raceSkip; live.raceSkip = null; } // (few enough again: back to that race)
  if (!live.map) {
    const want = db.settings.map || 'random', big = !raceOk();
    if ((mapById(want) && !(big && isRaceMap(want))) || (isCharMap(want) && charsOn())) live.map = want;
    else { const pool = MAPS_ON().filter(m => m.id !== db.lastMap && !(big && isRaceMap(m.id))); live.map = pool[Math.floor(Math.random() * pool.length)].id; }
  }
  return live.map;
}
function nextMap() { if (live.mapUsed) { db.lastMap = live.map; live.map = null; live.mapUsed = false; live.raceSkip = null; live.mapPick = false; } }
app.post('/api/map', (req, res) => {
  const id = String(req.body?.id || 'random'); if (id !== 'random' && !mapById(id) && !isCharMap(id)) return res.status(400).json({ error: 'Unknown map' });
  if (isRaceMap(id) && !raceOk()) return res.status(400).json({ error: `🏁 No races with more than ${raceMax()} pieces: this battle has ${cliffCount()}. (Change the number in Settings → ⚔️ Game.)` });
  db.settings.map = id; save(); live.map = null; live.mapUsed = false; live.raceSkip = null; if (live.vote) endVote(true);
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
  live.map = win.id; live.mapUsed = false; live.raceSkip = null;
  broadcast({ type: 'voteEnd', id: win.id, name: win.name }, 'overlay');
  broadcast({ type: 'toast', text: `🗳️ Chat picked ${win.icon} ${win.name} (${win.count} vote${win.count === 1 ? '' : 's'})` }, 'control');
  if (twitch.canSay()) twitch.say(`🗳️ Chat picked the map: ${win.icon} ${win.name}!`).catch(() => {});
  if (live.phase === 'idle') refreshPreview(true); pushState();
}
app.post('/api/vote/start', (req, res) => {
  if (live.phase === 'lobby' || live.phase === 'running') return res.status(400).json({ error: 'Start the vote before the battle.' });
  if (live.vote) endVote(true);
  const seconds = clampN(req.body?.seconds ?? db.settings.voteSeconds, 10, 180, 30);
  const big = !raceOk(), pool = MAPS_ON().filter(m => !(big && isRaceMap(m.id))).sort(() => Math.random() - .5).slice(0, 4).map(m => ({ id: m.id, name: m.name, icon: m.icon, count: 0 })); // (🏁 no races in the vote when there are too many)
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
  if (!right.length) { act('luck', `Nobody in chat called it (${total} ${total === 1 ? 'call' : 'calls'})`, { icon: '🔮', kind: 'calls', list: list?.name }); return { total, right: [] }; }
  const amt = Math.max(0, Number(db.settings.callLuck ?? 1));
  const byLogin = new Map(Object.entries(db.links || {}).map(([pid, login]) => [String(login).toLowerCase(), pid]));
  const out = [];
  for (const [login, v] of right) {
    const pid = byLogin.get(login); let boosted = 0;
    if (pid && amt && !wonThisWeek(pid)) for (const e of list.entries) if (e.kind !== 'spot' && ['active', 'paused', 'away'].includes(e.status) && e.backers?.[0]?.discordId === pid && e.id !== f.id) { e.luckPct = (e.luckPct || 0) + amt; boosted++; }
    out.push({ login, name: v.name, boosted });
  }
  act('luck', `${out.length} of ${total} in chat called it right${out.some(o => o.boosted) ? `: +${pctW(amt)} luck on their movies` : ''}`, { icon: '🔮', kind: 'calls', list: list?.name, items: out.map(o => `${o.name}${o.boosted ? ` · +${pctW(amt)} on ${o.boosted === 1 ? '1 movie' : o.boosted + ' movies'}` : ''}`) }); // 🧾
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
const isLuckList = l => l?.type === 'movies' || ownLuck(l); // (🍀 your own battles with luck on: their luck tools save / reset luck, not odds)
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
  act('luck', isLuckList(l) ? `reset everyone's luck in “${l.name}” to 0% (saved first, so it can come back)` : `set everyone's odds in “${l.name}” to ${to} (saved first)`, { icon: '↺', who: streamerName(), kind: 'reset', list: l.name }); // 🧾
  save(); pushState(); refreshPreview(); res.json({ ok: true });
});
app.post('/api/luck/restore', (req, res) => {
  const s = (db.luckSaves || []).find(x => x.id === req.body?.id); if (!s) return res.status(404).json({ error: 'That save is gone.' });
  const l = getList(s.listId || 'movies'); if (!l) return res.status(404).json({ error: 'That battle is gone.' });
  saveLuck(`Before bringing back “${s.name}” · ${when()}`, l.id);
  autoBackup(isLuckList(l) ? 'luck-restore' : 'odds-restore');
  for (const e of l.entries) { if (isLuckList(l)) e.luckPct = s.luck[e.id] || 0; else if (e.id in s.luck) e.weight = s.luck[e.id]; }
  act('luck', `brought back the saved ${isLuckList(l) ? 'luck' : 'odds'} “${s.name}” in “${l.name}”`, { icon: '📂', who: streamerName(), kind: 'restore', list: l.name }); // 🧾
  save(); pushState(); refreshPreview(); res.json({ ok: true, name: s.name });
});
app.delete('/api/luck/saves/:id', (req, res) => { db.luckSaves = (db.luckSaves || []).filter(x => x.id !== req.params.id); save(); pushState(); res.json({ ok: true }); });

// ---------- luck (manual, e.g. for Kirb spots) ----------
app.post('/api/luck', (req, res) => {
  const l = getList(req.body?.listId || 'movies'), e = l?.entries.find(x => x.id === req.body?.id);
  if (!e) return res.sendStatus(404);
  const was = e.luckPct || 0; e.luckPct = Math.max(0, Math.min(1000, Number(req.body.luckPct) || 0));
  if (e.luckPct !== was) act('luck', `set the luck of “${e.label}” in “${l.name}”: ${pctW(was)} → ${pctW(e.luckPct)}`, { icon: '🍀', who: streamerName(), kind: 'set', list: l.name }); // 🧾
  save(); pushState(); refreshPreview(); res.json({ ok: true });
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
const SOUND_LIST = ['music', 'lobby', 'go', 'tick', 'final5', 'land', 'bonk', 'dash', 'crumble', 'fall', 'out', 'lucky', 'alert', 'comet', 'smack', 'boom', 'collapse', 'earthquake', 'meteors', 'wind', 'ice', 'tornado', 'shockwave', 'thunder', 'lightning', 'boulder', 'swap', 'lowgrav', 'suddendeath', 'fanfare', 'claimStart', 'pop', 'ding', 'celebrate', 'buzzer', 'queued', 'joined', 'wheelSpin', 'wheelTick', 'wheelWin', 'wheelMove', 'wheelTimer', 'wheelGrow', 'packShake', 'packTear', 'cardReveal'];
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
// 🏃🧪 (1.81.2, Derek: "a test marathon battle in Test, only in dev mode") your real Marathon Battle (its things, pictures, odds and
// chat luck) on a character map, as a practice round: nobody's battle is used, nothing wins, no luck changes, no history. A timed
// thing that wins shows its ⏱️ timer (a 🧪 one) so you can try that too.
app.post('/api/test/mara-battle', async (req, res) => {
  if (!paid.dev()) return res.status(400).json({ error: 'The test marathon battle is a 🛠️ dev mode feature: turn on Dev mode in Settings → 👤 Account & updates.' });
  if (live.phase === 'lobby' || live.phase === 'running') return res.status(400).json({ error: 'A battle is already going.' });
  if (live.maraGuess) return res.status(400).json({ error: 'Chat is guessing for a marathon battle right now.' });
  const l = maraList(); if (!l) return res.status(400).json({ error: 'Pick your marathon battle first (🏃 Marathon pool tab).' });
  leaveEnded(); if (db.activeListId !== l.id) { db.activeListId = l.id; previewIds = null; }
  const want = String(req.body?.map || ''), map = want && marathon.maps().some(m => m.id === want) ? want : maraRandomMap();
  const mapWas = live.map, pickWas = live.mapPick; live.map = map; live.mapUsed = false; live.raceSkip = null; live.mapPick = true;
  const err = await startRound({ test: true });
  if (err) { live.map = mapWas; live.mapPick = pickWas; return res.status(400).json({ error: err }); }
  if (live.game) { live.game.maraTest = true; live.game.testName = `🧪 Test: ${l.name}`; }
  res.json({ ok: true, map, mapName: mapLabel(map), n: live.game?.fighters?.length || 0 });
});
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
app.get('/api/errors', (req, res) => res.json(errlog.shown().map(e => ({ ...e, ...errlog.plain(e) }))));
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
    ...errlog.errors().slice(0, 60).map(e => `${new Date(e.at).toISOString()} [${e.source}]${e.count > 1 ? ` x${e.count}` : ''}${e.quiet ? ' (quiet: OBS closed, not shown to Derek)' : ''} ${e.msg}${e.detail ? '\n    ' + e.detail.split('\n').slice(0, 6).join('\n    ') : ''}`)
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
// ---------- 🎛️ Stream Deck (1.85.0, Derek) ----------
// each Stream Deck key opens /deck/<secret key>/<button> in the background (deck.js); it presses the same thing as in the app
deck.setHooks({
  port: PORT, data: DATA, root: ROOT, dev: () => paid.dev(),
  scenes: () => { if (db.settings.obsOn === false) throw new Error('Movie Royal isn\'t allowed to use OBS (Settings → 🎥 OBS).'); return obs.scenesNow(); },
  scene: (name, preview) => { if (db.settings.obsOn === false) throw new Error('Movie Royal isn\'t allowed to use OBS (Settings → 🎥 OBS), so it can\'t switch scenes.'); return obs.goScene(name, preview); },
  call: async (method, p, body) => {
    if (method === 'GOVIEW') { await deck_call('/api/view', { view: p }); broadcast({ type: 'goView', view: p, force: true }, 'control'); return {}; }
    return deck_call(p, body);
  },
  state: () => {
    const st = wheel.W(), yt = live.ytNow || {}, ytK = ['brb', 'sleep'].sort((a, b) => (yt[b]?.at || 0) - (yt[a]?.at || 0))[0];
    return { round: wheel.getRound(), reveal: st.reveal?.id || null, capture: !!live.capture, soundOn: db.settings.soundOn !== false, maraTimer: live.maraTimer || null, ttsMuted: !!ttsCfg().muted, chatVoice: !!chatvoice.cfg().on, ytK, ytPaused: !!yt[ytK]?.paused };
  }
});
async function deck_call(p, body) { // (the same as clicking the button in the app: it goes through the app's own address)
  const r = await fetch(`http://127.0.0.1:${PORT}${p}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body || {}), signal: AbortSignal.timeout(20000) });
  let j = {}; try { j = await r.json(); } catch {}
  if (!r.ok || j.error) throw new Error(j.error || `It didn't work (${r.status}).`);
  return j;
}
async function deckPress(req, res) {
  if (!deck.keyOk(req.params.key)) return res.status(403).type('text').send('Wrong Stream Deck key. Make the Stream Deck pages again in Movie Royal (Settings → 🖥️ App & background → 🎛️ Stream Deck).');
  try { const msg = await deck.press(String(req.params.id || ''), req.query.test ? 'test' : 'deck', req.query); pushState(); res.type('text').send('✅ ' + msg); }
  catch (e) { const b = deck.BUTTONS[req.params.id]; broadcast({ type: 'toast', text: `🎛️ Stream Deck${b ? ` (${b.label})` : ''}: ${e.message}`, ms: 6000 }, 'control'); pushState(); res.status(e.code || 409).type('text').send('⚠️ ' + e.message); }
}
app.get('/deck/:key/:id', deckPress); app.post('/deck/:key/:id', deckPress);
// 🎞️ the Chat tab's scene buttons: read OBS's scenes, switch to one
app.get('/api/obs/scenes-now', wTry(async () => { if (db.settings.obsOn === false) throw new Error("Movie Royal isn't allowed to use OBS (Settings → 🎥 OBS)."); const r = await obs.scenesNow(); return { scenes: r.scenes || [], current: r.current || '' }; }));
app.post('/api/obs/scene', wTry(async b => { if (db.settings.obsOn === false) throw new Error("Movie Royal isn't allowed to use OBS (Settings → 🎥 OBS), so it can't switch scenes."); const name = String(b.name || '').trim(); if (!name) throw new Error('Pick a scene.'); if (b.test) return { ok: true, test: true, name }; await obs.goScene(name, false); act('stream', `Switched OBS to the scene “${name}”`, { icon: '🎞️', kind: 'scene' }); return { ok: true, name }; }));
app.get('/api/deck', (req, res) => res.json(deck.state()));
app.get('/api/deck/icon', (req, res) => { const f = deck.iconPath(req.query.k); f ? res.sendFile(f) : res.status(404).end(); }); // (a scene key's picture, once it's drawn)
app.post('/api/deck/scenes', wTry(async () => { const r = await deck.readScenes(); if (!r.ok) throw new Error(`Couldn't read your scenes from OBS: ${r.error}`); return { ...r, state: deck.state() }; }));
app.post('/api/deck/settings', wTry(b => { deck.setCfg(b); return deck.state(); }));
app.post('/api/deck/new-key', wTry(() => { deck.newKey(); return deck.state(); })); // (the old pages stop working: make them again)
app.post('/api/deck/make', wTry(async b => { const r = await deck.makeAll(); act('stream', `made the Stream Deck pages (${r.pages.length})`, { icon: '🎛️' }); return { ...r, state: deck.state() }; }));
app.post('/api/deck/open', wTry(async b => { // 🎛️ hand the pages to the Stream Deck app (it asks to import each one)
  const r = await deck.makeAll(), want = b.id ? r.pages.filter(p => p.id === b.id) : r.pages, op = globalThis.__desktop?.openPath;
  if (!op) return { opened: 0, pages: r.pages, note: 'Open the files yourself (this is only automatic in the Windows app).' };
  for (const [i, p] of want.entries()) setTimeout(() => { try { op(p.path); } catch {} }, i * 2500);
  return { opened: want.length, pages: r.pages };
}));
app.get('/api/deck/file/:id', async (req, res) => { const r = await deck.makeAll({ scenes: false }), p = r.pages.find(x => x.id === req.params.id); if (!p) return res.status(404).end(); res.download(p.path, p.file); });
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
// 🤖 Test all (1.67.0, Derek: "a test all in the checklist: it does all the checks by itself in the background, lists them and
// ticks them off as they're done"). These are the checks the server does; the control panel does the battle ones in a hidden test screen.
// Every check is read-only: nothing goes on stream, in chat or in Discord, nothing is fixed or saved.
// Each answers { ok: true | false | 'warn' | null (= skipped: not set up, or can't be checked right now), note, items? }.
const within = (p, ms, what) => Promise.race([p, new Promise((_, no) => setTimeout(() => no(new Error(`${what} took too long to answer`)), ms))]);
const plural = (n, a, b = a + 's') => `${n} ${n === 1 ? a : b}`;
const SELF_CHECKS = {
  async twitch() {
    if (!db.settings.twitchClientId) return { ok: false, note: "Twitch isn't set up yet: 🧭 Setup guide → Twitch" };
    if (!twitch.status.userId) return { ok: false, note: 'not signed in: Settings → 💜 Twitch → Sign in with Twitch' };
    const me = await within(twitch.meCheck(), 15000, 'Twitch').catch(e => { throw new Error(`Twitch didn't accept your sign-in (${e.message}): sign in again`); });
    return me ? { ok: true, note: `signed in as ${me}` } : { ok: false, note: "Twitch didn't say who you are: sign in again" };
  },
  async twitchPerms() {
    if (!twitch.status.userId) return { ok: null, note: 'not signed in' };
    const sc = twitch.status.scopes || [], miss = twitch.SCOPES.filter(x => !sc.includes(x) && x !== 'clips:edit' && (x !== 'user:read:follows' || feat('raids')) && (x === 'user:read:follows' || !twitch.OPTIONAL_SCOPES.includes(x) || db.settings.adBot));
    return miss.length ? { ok: false, note: `sign in again so Movie Royal gets ${plural(miss.length, 'new permission')} (Settings → 💜 Twitch)` } : { ok: true, note: `all ${sc.length} there` };
  },
  async twitchChat() { if (!twitch.status.userId) return { ok: null, note: 'not signed in' }; const c = String(twitch.status.chat || 'off'); return /^reading/.test(c) ? { ok: true, note: c } : { ok: false, note: `chat: ${c}` }; },
  async twitchPost() { if (!twitch.status.userId) return { ok: null, note: 'not signed in' }; return twitch.status.canChat ? { ok: true, note: 'allowed' } : { ok: false, note: 'sign in again and allow "send chat messages" (Settings → 💜 Twitch)' }; },
  async chatBot() {
    if (!db.twitchBot) return { ok: null, note: 'no bot account: Movie Royal talks in chat as you, with the 🤖 name tag' };
    const l = await within(twitch.botCheck(), 15000, 'Twitch').catch(e => { throw new Error(`the bot account's sign-in stopped working (${e.message}): Settings → 💜 Twitch → 🤖 sign in as the bot again`); });
    return l ? { ok: true, note: `posts as ${l}${twitch.botOn() ? '' : ' (switched off in Settings → 💜 Twitch)'}` } : { ok: false, note: "Twitch didn't say who the bot is: sign in as the bot again" };
  },
  async rewards() {
    if (!twitch.status.userId) return { ok: null, note: 'not signed in' };
    let all; try { all = await within(twitch.listAllRewards(), 15000, 'Twitch'); } catch (e) { return /affiliate|partner|403/i.test(e.message) ? { ok: null, note: "channel points aren't on for this channel" } : { ok: false, note: e.message }; }
    const byHand = rewardsByHand || [];
    return byHand.length ? { ok: 'warn', note: `made by hand on Twitch, so Movie Royal can't switch them off: ${byHand.join(', ')}` } : { ok: true, note: `${plural(all.length, 'reward')} on your channel, none in the way` };
  },
  async discord() {
    if (!db.settings.discordToken) return { ok: null, note: "the Discord bot isn't set up" };
    const out = await within(discord.selfTest(), 45000, 'The Discord check'), bad = out.filter(x => x.ok === false);
    return { ok: !bad.length, note: bad.length ? bad.slice(0, 3).map(x => `${x.label}${x.detail ? ` (${x.detail})` : ''}`).join(' · ') : `${plural(out.filter(x => x.ok).length, 'thing')} checked, all fine`, items: out.map(x => ({ ok: x.ok, label: x.label, detail: x.detail || '' })) };
  },
  async cloud() {
    if (!cloud.enabled()) return { ok: null, note: 'the 24/7 bot is off (Discord only works while Movie Royal is open)' };
    const st = await within(cloud.checkLink(false), 30000, 'The 24/7 bot'); // (false = only look: the usual check every 10 minutes fixes the link)
    if (!st.linked) return { ok: false, note: st.linkError ? `Discord isn't pointed at it (${st.linkError})` : "Discord isn't pointed at it (Movie Royal fixes that by itself within 10 minutes)" };
    if (st.botUp === false) return { ok: false, note: "it isn't answering" };
    if (await cloud.botOutdated()) return { ok: false, note: 'it needs its update: Settings → 🤖 Discord & picks → ☁️ Update the 24/7 bot' };
    return { ok: true, note: `up to date${cloud.status.botV ? ` (v${cloud.status.botV})` : ''} and connected to Discord` };
  },
  async backup() {
    if (!db.backupSeen && !backuplink.backupWatching()) return { ok: null, note: 'no backup bot server (it\'s optional)' };
    await within(backuplink.tick({ force: true }), 20000, 'The backup check').catch(() => {});
    return backuplink.backupWatching() ? { ok: true, note: 'a backup bot server is watching your Discord bot' } : { ok: false, note: "the backup bot server hasn't checked in lately: is Movie Royal Backup Bots running?" };
  },
  async tmdb() {
    if (!(db.settings.tmdbKey || '').trim()) return { ok: false, note: 'no TMDB key: Settings → 🎬 Movie info' };
    const r = await within(searchMovies('Jaws'), 15000, 'TMDB').catch(e => { throw new Error(/401/.test(e.message) ? 'TMDB says the key is wrong: paste the long "API Read Access Token" again' : e.message); });
    return r.length ? { ok: true, note: `found ${r[0].title} (${r[0].year})` } : { ok: false, note: 'TMDB found nothing for "Jaws"' };
  },
  async omdb() { if (!omdbWhere()) return { ok: null, note: 'no OMDb key (only needed for Rotten Tomatoes + IMDb ratings)' }; const r = await within(testOmdb(), 15000, 'OMDb'); return r.ok ? { ok: true, note: r.sample || 'works' } : { ok: false, note: r.error || 'OMDb said no' }; },
  async letterboxd() {
    if (!db.settings.letterboxdUser) return { ok: null, note: 'no Letterboxd username' };
    const st = lb.stats();
    if (!(st.count > 0)) return { ok: false, note: `no watched movies read from ${db.settings.letterboxdUser} yet${st.profileError ? ` (${st.profileError})` : ''}` };
    return st.profileError ? { ok: 'warn', note: `${st.count} watched known, but the last update failed: ${st.profileError}` } : { ok: true, note: `${st.count} watched movies known` };
  },
  async donations() {
    const se = !!db.settings.seJwt, sl = !!db.settings.slToken; if (!se && !sl) return { ok: null, note: 'not set up (StreamElements / Streamlabs)' };
    const bad = [se && donations.status.se !== 'online' && `StreamElements: ${donations.status.se}`, sl && donations.status.sl !== 'online' && `Streamlabs: ${donations.status.sl}`].filter(Boolean);
    return bad.length ? { ok: false, note: bad.join(' · ') } : { ok: true, note: [se && 'StreamElements', sl && 'Streamlabs'].filter(Boolean).join(' + ') + ' connected' };
  },
  async obs() {
    if (db.settings.obsOn === false) return { ok: null, note: 'Movie Royal is set not to use OBS (Settings → 🎥 OBS)' };
    let v; try { v = await within(obs.test(), 8000, 'OBS'); } catch { return { ok: null, note: "OBS is closed (or can't be reached): open OBS and test again" }; }
    const screens = [...wss.clients].filter(c => c.role === 'overlay'), inObs = screens.filter(c => /\bOBS\//i.test(c.ua || '')).length, other = screens.filter(c => !/Electron|HeadlessChrome/i.test(c.ua || '')).length;
    return inObs || other ? { ok: true, note: `OBS ${v.obs}: the game screen is open in it` } : { ok: false, note: `OBS ${v.obs} is open, but the Movie Royal game screen isn't loaded in it: 🧭 Setup guide → OBS` };
  },
  async update() {
    if (!repoName()) return { ok: null, note: 'no update address set' };
    const list = (await within(ghReleases(), 15000, 'GitHub')).filter(x => x.url && (wantTests() || !x.pre));
    const best = list.reduce((a, x) => !a || newer(x.version, a.version) ? x : a, null);
    if (!best) return { ok: null, note: 'no versions found' };
    return newer(best.version, VERSION) ? { ok: 'warn', note: `${best.tag} is out (you have v${VERSION}): Settings → 👤 Account & updates → 🔄 Check for updates` } : { ok: true, note: `v${VERSION} is the newest` };
  },
  async data() {
    let size = 0; try { const txt = fs.readFileSync(DB_FILE, 'utf8'); size = txt.length; JSON.parse(txt); } catch (e) { return { ok: false, note: `your data file can't be read: ${e.message}` }; }
    if (saveInfo.err && saveInfo.errAt > saveInfo.at) return { ok: false, note: `the last save didn't work: ${saveInfo.err}` };
    const mb = size > 1e6 ? (size / 1e6).toFixed(1) + ' MB' : Math.max(1, Math.round(size / 1e3)) + ' KB', days = db.lastBackupAt ? Math.floor((Date.now() - db.lastBackupAt) / 864e5) : null;
    if (days == null || days > 30) return { ok: 'warn', note: `saves fine (${mb}), but ${days == null ? 'no backup downloaded yet' : `the last backup is ${days} days old`}: Settings → 👤 Account & updates → ⬇️ Download backup` };
    return { ok: true, note: `saves fine (${mb}); last backup ${days ? plural(days, 'day') + ' ago' : 'today'}` };
  },
  async files() {
    const names = new Set([...JSON.stringify(db).matchAll(/\/uploads\/([^"'?#\\\s)]+)/g)].map(m => { try { return decodeURIComponent(m[1]); } catch { return m[1]; } }));
    const missing = [...names].filter(n => !fs.existsSync(path.join(UPLOADS, n)));
    return missing.length ? { ok: 'warn', note: `${plural(missing.length, 'picture')} you added ${missing.length === 1 ? 'is' : 'are'} missing: ${missing.slice(0, 4).join(', ')}${missing.length > 4 ? '…' : ''}` } : { ok: true, note: names.size ? `${plural(names.size, 'picture')} you added, all there` : 'no pictures added yet' };
  },
  async errors() {
    const day = errlog.shown().filter(e => Date.now() - (e.at || 0) < 864e5).sort((a, b) => (b.at || 0) - (a.at || 0));
    return day.length ? { ok: 'warn', note: `${plural(day.length, 'error')} in the last day (newest: ${errlog.plain(day[0]).what}): see ⚠️ Errors` } : { ok: true, note: 'none in the last day' };
  },
  async banRules() { // the sample movies against the standard rules (your own rule settings aren't used, so the answers are always the same)
    const R = { english: true, religious: true, documentary: true, dubbed: true, dubVotes: 1000 }, wrong = [];
    for (const [t, d, want] of BAN_SAMPLES) { const rb = ruleBan({ id: 'test', ...d }, R); if ((rb?.key || null) !== want) wrong.push(`${t.split(':')[0]}: ${rb?.key || 'not banned'} (should be ${want || 'not banned'})`); }
    return wrong.length ? { ok: false, note: wrong.slice(0, 3).join(' · ') } : { ok: true, note: `${BAN_SAMPLES.length} sample movies all right` };
  },
  async botRules() { // the 24/7 bot has its own copy of the ban + series rules: do they still give the same answers?
    const wk = await import('./cloud-worker.js'); if (!wk.__test?.blockReason || !wk.__test?.seriesRule) return { ok: false, note: "the 24/7 bot's code couldn't be checked" };
    const R = { english: true, religious: true, documentary: true, dubbed: true, dubVotes: 1000 }, wrong = [];
    BAN_SAMPLES.forEach(([t, d], i) => { const a = ruleBan({ id: 'test', ...d }, R), b = wk.__test.blockReason({ cfg: { banRules: R, bans: [], banOk: [], wonIds: [], seriesLocks: {}, banCurrentYear: false, watched: {}, streamer: 'the streamer' }, pool: [] }, { id: 'sample-' + i, title: t.split(' (')[0], year: '', ...d });
      if (!!a !== !!b || (a && b.short !== '🚫 ' + a.short)) wrong.push(`${t.split(':')[0]}: Movie Royal ${a ? a.short : 'allows it'}, the 24/7 bot ${b ? b.short.replace('🚫 ', '') : 'allows it'}`); });
    const parts = [1, 2, 3].map(n => ({ id: 'p' + n, title: 'Part ' + n, year: String(2000 + n), date: `${2000 + n}-01-01` })), seenSet = new Set(['p1']), seen = p => seenSet.has(p.id);
    for (const [movieId, userId, lock] of [['p2', 'a', null], ['p3', 'a', null], ['p2', 'b', { discordId: 'a', name: 'A' }], ['p2', 'a', { discordId: 'a', name: 'A' }]]) {
      const o = { parts, seen, lock, movieId, userId, name: 'Sample series', streamer: 'the streamer' }, a = series.seriesRule(o), b = wk.__test.seriesRule(o);
      if ((a?.key || null) !== (b?.key || null)) wrong.push(`series rule (${movieId}): Movie Royal ${a?.key || 'allows it'}, the 24/7 bot ${b?.key || 'allows it'}`);
    }
    return wrong.length ? { ok: false, note: wrong.slice(0, 3).join(' · ') } : { ok: true, note: `${BAN_SAMPLES.length} ban samples + 4 series cases give the same answers` };
  },
  async series() { // 🎞️ the series rules + 🔒 locks, step by step (a pretend series: nothing real changes)
    const parts = [1, 2, 3, 4].map(n => ({ id: 'w' + n, title: `Wizard School ${n}`, year: String(2000 + n * 2), date: `${2000 + n * 2}-06-01` })), seenSet = new Set(), seen = p => seenSet.has(p.id);
    const A = { discordId: 'pa', name: 'Pretend_Alex' }, B = { discordId: 'pb', name: 'Pretend_Bea' }; let lock = null, pool = [], t = 1000;
    const ask = (who, n) => series.seriesRule({ parts, seen, lock, movieId: 'w' + n, userId: who.discordId, name: 'Wizard School series', streamer: 'the streamer' })?.key || 'ok';
    const step = () => { const next = series.nextPart(parts, seen), h = next && pool.find(x => x.id === next.id); const r = series.lockStep(lock, { next, holder: h ? h.who : null, addedSince: (id, since) => pool.filter(x => x.who.discordId === id && x.at > since).length, max: 3, now: ++t }); lock = r.lock; };
    const got = [], want = ['sequel', 'ok', 'sequel', 'locked', 'ok', 'sequel', 'ok', 'locked', 'sequel'];
    got.push(ask(B, 2), ask(B, 1));
    pool.push({ id: 'w1', who: A, at: ++t }); step(); got.push(ask(B, 2));
    seenSet.add('w1'); pool = pool.filter(x => x.id !== 'w1'); step(); got.push(ask(B, 2), ask(A, 2), ask(A, 3));
    for (let i = 1; i <= 3; i++) { pool.push({ id: 'other' + i, who: A, at: ++t }); step(); } got.push(ask(B, 2));
    pool.push({ id: 'w2', who: B, at: ++t }); step(); got.push(ask(A, 2), ask(A, 3));
    const bad = want.map((w, i) => w !== got[i] ? `step ${i + 1}: ${got[i]} (should be ${w})` : null).filter(Boolean);
    return bad.length ? { ok: false, note: bad.slice(0, 3).join(' · ') } : { ok: true, note: 'sequel bans, locks, and the lock opening up after 3 other picks all right' };
  },
  async spotLuck() {
    const L = Math.max(0, Math.min(100, Number(db.settings.spotLuckNight ?? 1))), per = Math.max(0, Number(db.settings.luckPerBattle ?? 1)), e = {};
    const got = [spotLuckGain(e, 'n1', true, 'night'), spotLuckGain(e, 'n1', true, 'night'), spotLuckGain(e, 'n2', false, 'night'), spotLuckGain(e, 'n2', true, 'night'), spotLuckGain({}, 'n3', true, 'off'), spotLuckGain({}, 'n3', true, 'battle')], want = [L, 0, 0, L, 0, per];
    return got.every((g, i) => g === want[i]) ? { ok: true, note: `once a night: +${L}% the first battle a wild spot loses while you're live, then nothing until the next stream` } : { ok: false, note: `got ${got.join(', ')} (should be ${want.join(', ')})` };
  },
  async nudity() {
    const n = fakeNudity(112), labels = (n.scenes || []).map(x => x.label);
    const good = n.has && labels.length === 5 && labels.includes('at 1:12:30') && labels.includes('~47 min in') && labels.some(l => /^near the start/.test(l)) && labels.some(l => /^near the end/.test(l));
    return good ? { ok: true, note: '5 scenes found in the pretend Parents Guide page, with their times' } : { ok: false, note: `found ${labels.length} scenes: ${labels.join(', ')}` };
  },
  async lists() { // 🌐 the IMDb / Rotten Tomatoes readers on sample pages (no internet)
    const nd = { props: { pageProps: { searchResults: { titleResults: { titleListItems: [{ titleId: 'tt0000001', titleText: 'Sample Worst One', releaseYear: 2008, ratingSummary: { aggregateRating: 1.9 }, titleType: { id: 'movie' } }, { titleId: 'tt0000002', titleText: 'Sample Worst Two', releaseYear: 2004, ratingSummary: { aggregateRating: 2.2 } }] } } } } };
    const imdb = listsrc._test.imdbParse(`<script id="__NEXT_DATA__" type="application/json">${JSON.stringify(nd)}</script><li><a href="/title/tt0000003/"><h3>51. Sample Worst Three</h3></a><span>2010</span><span class="ipc-rating-star--rating">1.8</span></li>`);
    const rt = listsrc._test.rtParse(`<div class="article_movie_title"><h2><a href="https://www.rottentomatoes.com/m/sample_bad">Sample Bad</a> <span class="subtle start-year">(2002)</span> <span class="tMeterScore">0%</span></h2></div>`);
    const good = imdb.length === 3 && imdb.map(x => x.rating).join() === '1.9,2.2,1.8' && rt.length === 1 && rt[0].rt === 0 && rt[0].year === 2002;
    return good ? { ok: true, note: 'IMDb (with ratings) and Rotten Tomatoes (with 🍅 %) sample pages read right' } : { ok: false, note: `IMDb: ${imdb.map(x => `${x.title} ${x.rating}`).join(', ')} · RT: ${rt.map(x => `${x.title} ${x.rt}`).join(', ')}` };
  },
  async undoBack() { let r; try { r = wheel.undoSelfTest(); } catch (e) { return { ok: null, note: e.message }; } return r.ok ? { ok: true, note: `a pretend wheel had ${r.changes} changes, then ⏮️ went back to its start: exactly how it began, nothing else changed (${r.steps.toLocaleString()} real steps saved)` } : { ok: false, note: `⏪ undo all the way back: ${r.why}` }; },
  async ownLuck() { // 🍀 the own-battle luck rule on a pretend list: losers +x%, the winner stays in at 0%
    const l = { name: 'pretend', type: 'text', luckOn: true, luckPer: 1, entries: ['a', 'b', 'c'].map(id => ({ id, label: id, status: 'active', weight: 1, luckPct: id === 'b' ? 5 : 0 })) };
    ownLuckAfter(l, 'b', l.entries, true); const L = Object.fromEntries(l.entries.map(e => [e.id, e.luckPct]));
    return L.a === 1 && L.c === 1 && L.b === 0 && l.entries.every(e => e.status === 'active') ? { ok: true, note: 'in a pretend battle the two that lost got +1%, and the winner stayed in with its luck back to 0%' } : { ok: false, note: `🍀 own battle luck went wrong: ${JSON.stringify(L)}` };
  },
  async history() { // 🧾 the complete history can be written and read back
    try { fs.accessSync(activity.DIR, fs.constants.W_OK); } catch (e) { return { ok: false, note: `🧾 the complete history's folder can't be written: ${e.message}` }; }
    const i = activity.info(), r = activity.read({ limit: 1 });
    return { ok: true, note: `${i.days} day${i.days === 1 ? '' : 's'} kept${i.first ? ` (since ${i.first})` : ''}, ${i.todayLines} line${i.todayLines === 1 ? '' : 's'} today${r.rows[0] ? `; newest: ${r.rows[0].text.slice(0, 60)}` : ''}` };
  },
  async wheelReset() { const r = wheel.resetSelfTest(); return r.ok ? { ok: true, note: 'a pretend wheel (grown, voided, counted down, maxed out, one spot changed by you) went back to exactly how it was set up' } : { ok: false, note: 'the pretend wheel didn\'t come back the same' }; },
  async banExport() { const csv = bansCsv(), back = bansFromFile(csv), mine = myBans(); const same = back.length === mine.length && back.every((b, i) => String(b.tmdbId) === String(mine[i].tmdbId) && b.title === mine[i].title); return same ? { ok: true, note: mine.length ? `${plural(mine.length, 'movie')} you banned: the file reads back the same` : "you haven't banned any movies yourself yet (the file works)" } : { ok: false, note: `${mine.length} banned, ${back.length} read back` }; },
  async myMovies() {
    const p = discordPeople().find(x => x.active.length); if (!p) return { ok: null, note: 'nobody has a movie in the Discord movie battle yet' };
    const t = await myMoviesTexts(p), titles = (getList('movies')?.entries || []).filter(e => e.backers?.[0]?.discordId === p.discordId && e.status === 'active').map(e => e.label).slice(0, 3);
    const miss = [['Twitch chat', t.chat], ["Movie Royal's Discord bot", t.discord], ...(cloud.enabled() ? [['the 24/7 bot', t.cloud]] : [])].filter(([, x]) => !x || /could not make it/.test(x) || !titles.every(tt => x.includes(tt))).map(([w]) => w);
    return miss.length ? { ok: false, note: `${miss.join(', ')}: the answer for ${p.name} is missing their movies` } : { ok: true, note: `${p.name}'s movies show right in Twitch chat, Discord${cloud.enabled() ? ' and the 24/7 bot' : ''}` };
  }
};
app.post('/api/test/check', async (req, res) => { // 🤖 Test all: one check at a time (the control panel lists them and ticks them off)
  const id = String(req.body?.id || ''), f = SELF_CHECKS[id]; if (!f) return res.status(404).json({ ok: false, note: 'unknown check' });
  try { res.json(await within(f(), 60000, 'This check')); } catch (e) { res.json({ ok: false, note: e.message }); }
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
app.post('/api/test/skip-one', (req, res) => { // 🧪 someone types !skip (one of their movies sits out the next battle), then again to put it back
  const p = discordPeople().find(x => (getList('movies')?.entries || []).filter(e => e.status === 'active' && e.kind !== 'spot' && e.backers?.[0]?.discordId === x.discordId).length);
  if (!p) return res.json({ ok: false, error: 'Nobody has a Discord movie in the battle yet.' });
  twitch.pretend.until = Date.now() + 10 * 60000;
  const name = p.twitch || p.name, say = t => twitchHandlers.chat({ login: name.toLowerCase(), name, text: t });
  say(`${skipCmd()} 1`); if (req.body?.undo !== false) setTimeout(() => say(`${skipCmd()} 1`), 8000); res.json({ ok: true, name: p.name });
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
app.post('/api/test/ship-pics', async (req, res) => { // 🏴‍☠️ Test tab: look up the figureheads' Twitch pictures again
  try { const r = await refreshShipPics(true); res.json({ ...r, logins: SHIP_LOGINS }); } catch (e) { res.status(500).json({ error: e.message }); }
});
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
app.post('/api/test/chat', (req, res) => { twitch.pretend.until = Date.now() + 10 * 60000; const name = String(req.body?.name || 'test_viewer').trim().replace(/^@/, ''); twitchHandlers.chat({ pretend: true, first: !!req.body?.first, login: name.toLowerCase(), name, text: String(req.body?.text || 'hello!'), badges: req.body?.badges || {}, userId: null, emotes: req.body?.emotes || '', color: req.body?.color || null, badgeList: req.body?.badgeList || '' }); res.json({ ok: true }); });
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
  if (!obsOk('Doom')) { broadcast({ type: 'wheelDoom', text: `${streamerName().toUpperCase()} WILL RETURN FOR DOOMSDAY!!!`, test: true }, 'overlay'); return { ok: true, off: true }; } // (switched off in Settings → 🎥 OBS: just the screen)
  const obsLive = await obs.streaming().catch(() => null), isLive = !!db.live || obsLive === true;
  if (isLive && !b.confirm) return { needConfirm: true };
  broadcast({ type: 'wheelDoom', text: `${streamerName().toUpperCase()} WILL RETURN FOR DOOMSDAY!!!`, ...(isLive ? {} : { test: true }) }, 'overlay');
  broadcast({ type: 'toast', text: isLive ? '☠️ DOOMSDAY TEST: your stream ends in 15 seconds.' : '☠️ Doomsday test (not live): mic + camera off for 15 seconds, then back on.' }, 'control');
  obs.doomsday(15000).then(r => broadcast({ type: 'toast', text: `☠️ Doomsday test done: ${r.ended ? 'the stream ended, ' : ''}${r.mics.length} mic(s) + ${r.cams} camera spot(s) back on.` }, 'control'))
    .catch(e => { console.error('[obs] Doomsday test:', e.message); broadcast({ type: 'toast', text: '⚠️ Doomsday test: ' + e.message }, 'control'); });
  return { ok: true, live: isLive, obs: obsLive !== null };
}));
app.post('/api/test/race-power', (req, res) => { // 🧪 a pretend race power-up (or ☢️ nuke) on a random racer in the race on stream
  const kind = String(req.body?.kind || 'boost'); if (!RACE_INFO[kind]) return res.status(400).json({ error: 'Which power-up?' });
  if (!(live.phase === 'lobby' || live.phase === 'running') || !isRaceMap(live.game?.map)) return res.status(400).json({ error: 'Start a race first (🏁 Start a test race).' });
  broadcast({ type: 'racePower', id: req.body?.id || null, kind, name: String(req.body?.name || 'test_viewer') }, 'overlay'); res.json({ ok: true });
});
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
// 🖼️ Test tab: the small picture the app posts in Discord when someone saves /character
app.get('/api/test/look-picture', async (req, res) => {
  let look = {}; try { look = JSON.parse(String(req.query.look || '{}')); } catch {}
  const png = await looks.picture(looks.check(look).look, String(req.query.name || 'Test viewer'));
  if (!png) return res.status(501).json({ error: "Only the Movie Royal app on your PC can draw the picture." });
  res.type('png').send(png);
});
// 🎨 Test tab: what /character answers in Discord, for a pretend Discord person (saved as test-discord: not a real person)
app.post('/api/test/character', (req, res) => {
  const picks = {}; for (const k of looks.PARTS) if (req.body?.[k] != null && req.body[k] !== '') picks[k] = req.body[k];
  const r = looks.characterReply({ discordId: 'test-discord', name: 'Pretend Discord person', linked: true }, picks);
  if (r.saved) pushState();
  res.json({ ...r, pics: Object.keys(picks).length ? [] : looks.SHEETS.map(s => ({ url: `/chars/${s}.png`, title: looks.SHEET_TITLE[s] })) });
});
app.post('/api/test/battle', async (req, res) => { // a practice round with made-up entries; your real lists and history aren't touched
  const tList = req.body?.list ? getList(String(req.body.list)) : null; // ⏱️⏳ {list}: use that battle's own timer + pacer
  if (live.phase === 'lobby' || live.phase === 'running') return res.status(400).json({ error: 'A battle is already going.' });
  if (wheel.W().show) wheel.setShow(false); // the battle goes on stream
  cards.endChars(); // (a 🧍 character fight from before leaves the screen)
  const names = ['Popcorn Pete', 'Reel Goblin', 'VHS Kid', 'Night Owl', 'Mia', 'Big Screen Bob', 'Lena', 'Ozzy', 'Frames', 'Snack Attack'];
  const movies = [['The Thing', '1982'], ['Heat', '1995'], ['Coco', '2017'], ['Jaws', '1975'], ['Alien', '1979'], ['Arrival', '2016'], ['Hot Fuzz', '2007'], ['Oldboy', '2003'], ['Paddington 2', '2017'], ['Knives Out', '2019']];
  const count = clampN(req.body?.count, 2, Math.max(2, Number(db.settings.maxFighters) || 1000), 10);
  const many = Array.from({ length: count }, (_, i) => i < movies.length ? movies[i] : [`${movies[i % movies.length][0]} ${Math.floor(i / movies.length) + 1}`, movies[i % movies.length][1]]);
  const lucks = [0, 0, 5, 10, 20, 35, 50, 65, 80, 100]; // practice rounds show off the luck glow and flames
  const fighters = many.map(([t, y], i) => ({ id: 'test-' + i, label: t, sub: y, weight: 1, luck: req.body?.luck === false ? 0 : lucks[i % lucks.length], owner: names[i % names.length], showOwner: true, kind: 'films', details: { director: 'Test', genres: ['Test'], synopsis: 'This is a practice round.', runtime: 88 + (i * 17) % 75 } }));
  if (req.body?.fun) { const F = getList('chat-join')?.fun || {}, kinds = Object.keys(POWER_INFO).filter(k => !F.powersOff?.[k]); fighters.forEach((f, i) => { if (kinds.length && i % 2 === 0) { const k = kinds[(i / 2) % kinds.length]; f.powers = { [k]: k === 'shield' ? 1 : true }; f.label += ' ' + POWER_INFO[k].icon; } }); } // 🎉 Chat battle tab → 🧪 Try it: half of them powered up
  if (req.body?.chars) fighters.forEach((f, i) => { f.gender = db.settings.charGenders === false || db.settings.idOn === false ? 'n' : ['m', 'f', 'n'][i % 3]; }); // 🧍 characters: men, women and non-binary
  if (req.body?.eggs) { const o = eggs.opts(), lv = [1, 3, 6, 9, 12, 18, 24, 27, 33, 40]; fighters.forEach((f, i) => { const fam = Math.floor(Math.random() * 40), l = lv[i % lv.length], st = l >= o.evolve[1] ? 2 : l >= o.evolve[0] ? 1 : 0; Object.assign(f, { label: names[i % names.length] + (i >= names.length ? ' ' + (Math.floor(i / names.length) + 1) : ''), sub: '', luck: 0, details: null, kind: 'chat', creature: { n: fam * 3 + st + 1, lvl: l } }); }); } // 🥚 egg game: everyone brings a creature
  if (req.body?.chaos) fighters.forEach(f => { f.chaos = true; }); // 🤪 every random character is a chaos one (Test tab)
  if (req.body?.spots) { const L = (db.settings.spotLooks || []).filter(Boolean); fighters.slice(0, Math.max(2, Math.min(4, L.length || 2))).forEach((f, i) => Object.assign(f, { label: `${db.settings.spotName || 'Kirb'}'s Pick`, sub: '', owner: db.settings.spotName || 'Kirb', spot: true, look: L.length ? looks.check(L[i % L.length]).look : undefined })); } // 🎟️ wild spots in their characters
  if (req.body?.looks) fighters.forEach((f, i) => { f.look = i === 0 && typeof req.body.looks === 'object' ? looks.check(req.body.looks).look : looks.randomLook(); if (i === 0 && typeof req.body.looks === 'object') f.owner = 'You (test)'; }); // 🎨 /character looks (the first one = the look picked on the Test tab)
  if (req.body?.bodies) { const nB = looks.NAMES.body.length - 24, R = n => 1 + Math.floor(Math.random() * n); fighters.forEach((f, i) => { f.look = { hair: R(50), outfit: R(50), makeup: 1, facialhair: R(2) > 1 ? R(25) : 1, body: 25 + (i % nB), skin: R(8), haircolor: R(7), accessory: 1, hairaccessory: 1 }; }); } // 🧍 Test tab: everyone in the new body types (25+: men's builds + odd ones)
  if (req.body?.items) { const W = ['45-second plank', '20 push-ups', '1 minute wall sit', '30 jumping jacks']; fighters.forEach((f, i) => { const gym = i % 3 === 2; if (gym) Object.assign(f, { label: W[(i / 3 | 0) % W.length], sub: '', gym: true, sign: W[(i / 3 | 0) % W.length], owner: null, showOwner: false, details: null, kind: 'text' }); else { const p = itempics.fakePic(i - (i / 3 | 0)); Object.assign(f, { label: p.name, sub: '', item: true, image: p.image, owner: null, showOwner: false, details: null, kind: 'text' }); } }); } // 🏃 pretend marathon things (pictures on a white background, cut out on the screen) + 🏋️ workouts
  if (req.body?.numbers) fighters.forEach((f, i) => Object.assign(f, { label: String(i + 1), sub: '', luck: 0, owner: null, showOwner: false, details: null, image: null, poster: null, kind: 'text' })); // 🔢 a number battle
  let tmap = req.body?.map && req.body.map !== 'random' && (mapById(req.body.map) || ((req.body.chars || req.body.items) && isCharMap(req.body.map))) ? req.body.map : req.body?.map === 'random' || (isCharMap(currentMap()) && !req.body?.chars && !req.body?.items) ? MAP_LIST[Math.floor(Math.random() * MAP_LIST.length)].id : currentMap();
  let raceSkipped = null; if (isRaceMap(tmap) && fighters.length > raceMax()) { raceSkipped = tmap; tmap = nonRaceMap(); broadcast({ type: 'toast', text: `🏁 ${fighters.length} pieces is too many for a race (${raceMax()} at most), so it's ${hEsc(mapById(tmap)?.name || tmap)} instead.` }, 'control'); }
  live.game = { id: 'test-' + uid(), listId: null, fighters, total: fighters.length, test: true, eggTest: !!req.body?.eggs, nudeTest: !!req.body?.nudity, map: tmap, startedAt: Date.now(), secs: req.body?.game != null ? clampN(req.body.game, 10, 600, 30) : fightSecs(tList) };
  live.phase = 'lobby'; live.claim = null;
  if (isCharMap(tmap)) { cards.setShow(false); cards.endChars(); const err = startCharFight(req.body?.chaos ? '🤪 Chaos practice round' : req.body?.showdownTest ? '🥊 Final fight test' : '🧪 Practice round', true, !!req.body?.showdownTest); return err ? res.status(400).json({ error: err }) : res.json({ ok: true }); } // 🧍 a character-only map
  broadcast({ type: 'start', mapSize: req.body?.mapSize != null ? clampN(req.body.mapSize, 50, 200, 100) / 100 : mapSizeK(), gameId: live.game.id, fighters, total: fighters.length, map: tmap, listName: req.body?.fun ? '🎉 Pretend fun battle' : tList ? `🧪 Practice: ${tList.screenTitle || tList.name}` : '🧪 Practice round', kind: 'films', skin: req.body?.items ? 'items' : req.body?.chars ? 'chars' : undefined, fun: req.body?.fun ? { ...(getList('chat-join')?.fun?.wacky || {}) } : null, lobbySeconds: req.body?.lobby != null ? clampN(req.body.lobby, 0, 120, 10) : db.settings.lobbySeconds, gameSeconds: req.body?.game != null ? clampN(req.body.game, 10, 600, 30) : fightSecs(tList), pacer: req.body?.pacer != null ? clampN(req.body.pacer, 0, 100, 50) : fightPacer(tList), fairOdds: !req.body?.racePowers, racePowers: !!req.body?.racePowers, laps: clampN(req.body?.laps ?? db.settings.f8Laps ?? 5, 1, 50, 5), survival: req.body?.survival ?? null, queued: [], showdownTest: !!req.body?.showdownTest }, 'overlay');
  pushState(); res.json({ ok: true, map: tmap, raceSkipped });
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
  cards.setShow(false); cards.endChars(); // returns an error message, or null when the round started (opts.test: a test battle with the real pieces that changes nothing)
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
  previewIds = null; cliffN = fighters.length; if (live.vote) endVote();
  if (live.redoSkip?.listId === list.id) live.redoSkip = null; // 🔁 (the redo leaves it out once)
  if (!opts.test) { try { inactive.backfill(list); inactive.entered(list, fighters); } catch (e) { console.error('[inactive]', e.message); } } // 🧹 everyone whose movie is in this battle entered it
  if (list.type === 'movies' && !opts.test) for (const e of list.entries) if (e.skipNext) { delete e.skipNext; e.skippedAt = Date.now(); } // ⏭️ sat out this battle: back in the next one
  if (!opts.test) for (const e of list.entries) if (e.restNext) { delete e.restNext; act('battle', `“${e.label}” sat this battle out after winning, it's back in the next one`, { icon: '😴', kind: 'rest', list: list.name }); } // 😴 won last time: sat this one out, back in the next
  { const m0 = currentMap(); if (isRaceMap(m0) && fighters.length > raceMax()) { live.raceSkip = m0; live.map = nonRaceMap(); broadcast({ type: 'toast', text: `🏁 ${fighters.length} pieces is too many for a race (${raceMax()} at most), so it's ${hEsc(mapById(live.map)?.name || live.map)} instead.` }, 'control'); } }
  live.game = { id: uid(), listId: list.id, fighters, total, map: currentMap(), secs: fightSecs(list), startedAt: Date.now(), pid: opts.test ? null : sitePid, ...(opts.paid ? { paid: opts.paid } : {}), ...(!opts.test && db.live && site.vodNow(liveSegStart()) ? { vod: site.vodNow(liveSegStart()) } : {}), ...(opts.test ? { test: true, testName: `🧪 Test: ${list.name}` } : {}) }; live.mapUsed = !opts.test; if (!opts.test) sitePid = uid(); // (🎟️ who paid, ▶ the VOD spot, 🔮 the viewer website's guesses made while it waited)
  live.phase = 'lobby'; live.claim = null;
  { const tw = fighters.reduce((a, x) => a + (x.weight || 1), 0); act('battle', `${opts.test ? 'Practice battle' : 'Battle'} started: “${list.name}” on ${mapLabel(live.game.map)} with ${fighters.length} ${list.type === 'chat' ? 'people' : 'pieces'}${total > fighters.length ? ` (of ${total})` : ''}${opts.paid ? ` · 🎟️ paid for by ${opts.paid.who} (${opts.paid.what})` : ''}`, { icon: opts.test ? '🧪' : '⚔️', kind: 'start', list: list.name, test: !!opts.test, items: [...fighters].sort((a, b) => (b.weight || 1) - (a.weight || 1)).map(x => fighterLine(x, tw)) }); } // 🧾 (with everyone's chance + luck)
  if (isCharMap(live.game.map)) return startCharFight(list.screenTitle || list.name, !!opts.test); // 🧍 a character-only map: the card fight engine plays it
  const queued = opts.test ? [] : db.pendingEffects; if (!opts.test) db.pendingEffects = []; save();
  broadcast({
    type: 'start', mapSize: mapSizeK(), map: currentMap(), lookSeed: live.lookSeed, gameId: live.game.id, fighters, total, listName: list.screenTitle || list.name, kind: list.type, skin: itemLook(list) ? 'items' : list.chars ? 'chars' : undefined, movieNo: list.type === 'movies' || (stream().spotPending && list.type !== 'chat' && !list.giveaway && !live.game.test) ? (stream().movies || 0) + 1 : null,
    lobbySeconds: db.settings.lobbySeconds, gameSeconds: live.game.secs, pacer: fightPacer(list), fairOdds: !racePowersOn(list), racePowers: racePowersOn(list), /* 🏁 race power-ups can change who wins (Derek), so then no winner is picked ahead of time */ /* 🎯 every battle's winner is drawn by the odds before it starts (luck included), and the battle plays out around it (Derek's rule) */ laps: clampN(db.settings.f8Laps ?? 5, 1, 50, 5), fun: list.type === 'chat' ? { ...(list.fun?.wacky || {}) } : null, chaos: chaosState(), queued,
    series: list.type !== 'movies' && (Number(list.bestOf) || 1) > 1 ? (live.series && !live.series.done && live.series.listId === list.id ? { bestOf: live.series.bestOf, need: live.series.need, round: live.series.round + 1, tally: Object.entries(live.series.wins).sort((a, b) => b[1] - a[1]).map(([id, n]) => ({ id, label: live.series.names[id], n })) } : { bestOf: Number(list.bestOf), need: Math.ceil(Number(list.bestOf) / 2), round: 1, tally: [] }) : null
  }, 'overlay');
  if (racePowersOn(list)) { for (const e of list.entries) { for (const p of e.racePend || []) { if (p.kind === 'nuke') live.game.nuked = true; broadcast({ type: 'racePower', id: e.id, kind: p.kind, name: p.name }, 'overlay'); } delete e.racePend; } save(); } // 🏁 redeemed before the race: they go off after the green flag
  if (list.type !== 'movies' && live.series && (live.series.done || live.series.listId !== list.id)) live.series = null;
  pushState();
  if (live.capture && (db.settings.capAutoHide || live.capAutoOn)) setCapture(false).catch(() => {}); // 📺 the battle starts: hide the capture window (if you chose that, or it came on by itself for the join timer)
  return null;
}
// 🧍 the battle (live.game) on a character-only map: the card fight engine plays it, with the same fair winner (odds + luck)
function startCharFight(name, test, finalNow) {
  const g = live.game, tot = g.fighters.reduce((a, f) => a + (f.weight || 1), 0); let r = Math.random() * tot;
  const destined = (g.fighters.find(f => (r -= (f.weight || 1)) <= 0) || g.fighters[g.fighters.length - 1]).id;
  try { cards.startChars({ gameId: g.id, map: g.map, name, fighters: charFighters(g.fighters), destined, pace: fightPacer(getList(g.listId)), length: g.secs || fightSecs(getList(g.listId)), lookSeed: live.lookSeed, test, finalNow: !!finalNow }); }
  catch (e) { live.game = null; live.phase = 'idle'; return e.message; }
  g.charFight = true; live.phase = 'running'; live.phaseAt = Date.now(); if (live.board) closeBoard();
  if (g.map === 'pirates') { rewardKey = ''; setTimeout(() => syncRewards().catch(() => {}), 400); } // (⛈️ the storm power rewards come on)
  pushState(); return null;
}
function stopGather(silent) { if (!live.gather) return; clearTimeout(live.gather.timer); live.gather = null; if (!silent) broadcast({ type: 'gather', endsAt: null }, 'overlay'); }
app.post('/api/stop', (req, res) => { // stop a battle mid-fight: no winner, nothing saved
  if (live.phase !== 'lobby' && live.phase !== 'running') return res.json({ ok: true });
  live.phase = 'idle'; live.game = null; live.claim = null; live.series = null; live.mapUsed = false; closeBoard(); cards.endChars();
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
async function gatherTimeUp() { // ⏱️ the join timer ran out
    const g = live.gather; live.gather = null; broadcast({ type: 'gather', endsAt: null }, 'overlay');
    if (g?.discord) { // 🎬 Discord battles: time's up, but YOU start the battle
      sendBoard(true); broadcast({ type: 'toast', text: '⏱️ Join time is up. Press START ROYAL when you\'re ready (people can still vote until the fight starts).' }, 'control');
      if (twitch.canSay() && live.board) twitch.say('⏱️ Time\'s up! The battle starts soon: last chance to vote who wins (type the number or the movie name) 🔮').catch(() => {});
      pushState(); return;
    }
    const err = await startRound();
    if (err) { broadcast({ type: 'gatherFailed', error: err }, 'overlay'); pushState(); }
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
  if (db.settings.capAutoShow !== false && db.settings.capWindow && obsOk('Cap') && !live.capture) setCapture(true).then(() => { live.capAutoOn = true; }).catch(() => {}); // 📺 the small window shows during the join timer (1.61.0, Derek), hidden when the battle starts
  if (discordBattle) { // 🎬 reset the board: only people who chat now get their movies on (plus anything you put in with ▶)
    if (db.settings.chatGate !== false) { stream().active = []; save(); }
    live.calls.clear(); live.board = makeBoard(); refreshPreview(true); sendBoard(true);
    const n = live.board?.rows.length || 0, luck = Number(db.settings.callLuck ?? 1);
    if (twitch.canSay()) twitch.say(`⏱️ ${Math.round(seconds / 60 * 10) / 10} minutes to join the battle! Got a movie in Discord? Type anything in chat to put it on the battlefield. 🔮 Who's gonna win? Type the NUMBER or the MOVIE NAME from the list on screen (1–${n})${db.settings.callsOn !== false && luck ? `: if it wins, +${luck}% luck on your own movies next time 🍀` : ''}`).catch(() => {});
  }
  live.gather.timer = setTimeout(gatherTimeUp, seconds * 1000);
  setTimeout(() => broadcast({ type: 'gather', endsAt: live.gather?.endsAt || null, seconds, discord: discordBattle }, 'overlay'), 400);
  pushState(); res.json({ ok: true });
});
app.post('/api/gather/cancel', (req, res) => { stopGather(); closeBoard(); if (live.capture && live.capAutoOn) setCapture(false).catch(() => {}); pushState(); res.json({ ok: true }); });
app.post('/api/reset', (req, res) => { if (live.game?.cards) cards.reset(); /* (a card battle on a ball map: its card side resets too) */ closeBoard(); nextMap(); live.phase = 'idle'; live.game = null; cards.endChars(); if (live.claim) clearTimeout(live.claim.timer); live.claim = null; broadcast({ type: 'reset' }, 'overlay'); pushState(); refreshPreview(true); res.json({ ok: true }); });
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
// ---------- 🤝 co-stream routes (1.71.0) ----------
async function coRoomCheck(url, room) { // is the inviter's 24/7 bot new enough to host the room?
  let r; try { r = await fetch(`${url}/co/${room}`, { signal: AbortSignal.timeout(10000) }); } catch { throw new Error("Couldn't reach the room. Check your internet and try again."); }
  if (r.status === 404) throw new Error('That 24/7 bot is older than co-streaming. The person who invited you needs to update their 24/7 bot (Movie Royal shows an "Update your 24/7 bot" pop-up), then try again.');
  const j = await r.json().catch(() => ({})); if (!r.ok || !j.room) throw new Error(j.error || 'That 24/7 bot is older than co-streaming. The person who invited you needs to update their 24/7 bot (Movie Royal shows an "Update your 24/7 bot" pop-up), then try again.');
}
app.get('/api/co', (req, res) => res.json({ ...costream.info(), obsError: costream.cfg().obsError || null }));
app.post('/api/co/invite', async (req, res) => {
  try {
    if (!cloud.enabled()) throw new Error('Co-streaming uses your 24/7 Discord bot to host the room. Turn it on first: Settings → 🤖 Discord & picks → ☁️ 24/7 mode.');
    const c = costream.cfg(), url = String(db.settings.cloud.url).replace(/\/+$/, '');
    const room = c.role === 'host' && c.room && !req.body?.fresh ? c.room : crypto.randomBytes(18).toString('base64url');
    await coRoomCheck(url, room);
    Object.assign(c, { role: 'host', room, url, code: costream.makeCode({ url, room, name: streamerName() }), at: Date.now() }); save();
    costream.connect(); if (coWantVideo()) coVideo(true).catch(() => {});
    pushState(); res.json({ ok: true, code: c.code });
  } catch (e) { res.status(400).json({ error: e.message }); }
});
app.post('/api/co/join', async (req, res) => {
  try {
    const j = costream.readCode(req.body?.code);
    await coRoomCheck(j.url, j.room);
    const c = costream.cfg(); Object.assign(c, { role: 'guest', room: j.room, url: j.url, code: '', partnerName: j.name, at: Date.now() }); save();
    costream.connect(); if (coWantVideo()) coVideo(true).catch(() => {});
    pushState(); res.json({ ok: true, partner: j.name });
  } catch (e) { res.status(400).json({ error: e.message }); }
});
app.post('/api/co/leave', async (req, res) => {
  const c = costream.cfg();
  await coVideo(false).catch(() => {});
  if (req.body?.keepObs !== true && c.obs) await obs.coViewerRemove(c.obs).catch(() => {});
  c.obs = null; c.obsError = null; co.viewerKey = ''; co.battleShown = null;
  costream.disconnect(); rewardKey = ''; syncRewards().catch(() => {}); pushState(); res.json({ ok: true });
});
app.post('/api/co/settings', async (req, res) => {
  const c = costream.cfg(), b = req.body || {}, was = { q: c.quality, video: c.video, scene: c.scene, cam: c.showCam };
  for (const k of ['chaos', 'showBattle', 'showCam', 'video', 'obsTipDone', 'watchPop']) if (typeof b[k] === 'boolean') c[k] = b[k]; // (obsTipDone: ✅ hid the one-time OBS box, 1.71.1)
  if (['low', 'normal', 'high'].includes(b.quality)) c.quality = b.quality;
  if (typeof b.scene === 'string') c.scene = b.scene.slice(0, 200);
  if (b.camSide === 'left' || b.camSide === 'right') { c.camSide = b.camSide; costream.nudge(); } // (your partner's app moves your camera piece to that side)
  save();
  if (c.video !== was.video) await coVideo(c.video !== false);
  else if (c.quality !== was.q && costream.status.video.state === 'on') { globalThis.__desktop?.coSender?.(null); await coVideo(true); }
  if (c.scene !== was.scene || c.showCam !== was.cam) { co.viewerKey = ''; coViewerSync(true).catch(() => {}); }
  if ('chaos' in b) { rewardKey = ''; syncRewards().catch(() => {}); }
  pushState(); res.json({ ok: true, ...costream.info() });
});
app.post('/api/co/obs', async (req, res) => { // 🔧 set OBS up again (both your share scene and your partner's picture)
  const out = {};
  if (coWantVideo()) { globalThis.__desktop?.coSender?.(null); out.video = await coVideo(true); }
  co.viewerKey = ''; co.failAt = 0; await coViewerSync(true).catch(() => {});
  out.viewer = costream.cfg().obsError || (costream.cfg().obs ? 'ok' : costream.status.partner?.state?.video ? 'not yet' : 'partner not sharing yet');
  res.json(out);
});
app.post('/api/co/preview', (req, res) => { // 👀 see a picture in its own window: yours (what your partner gets) or theirs
  const D = globalThis.__desktop, c = costream.cfg(), who = req.body?.who === 'partner' ? 'partner' : 'me';
  const v = who === 'partner' ? costream.status.partner?.state?.video : costream.status.video.state === 'on' ? { id: costream.streamId(c.room, db.owner?.login || streamerName()), q: c.quality } : null;
  if (!v?.id) return res.status(400).json({ error: who === 'partner' ? `${costream.partnerName()} isn't sending a picture right now.` : "You aren't sending a picture right now: turn on 📷 Send my camera + battle first." });
  const url = vdoView(v.id, v.q);
  if (!D?.coPreview) return res.json({ ok: true, url });
  D.coPreview(url, who === 'partner' ? `${costream.partnerName()}'s picture` : 'What your co-streamer sees'); res.json({ ok: true });
});
// 🎟️ Paid battles (1.75.0)
app.get('/api/paid', (req, res) => res.json(paid.info()));
app.post('/api/paid/settings', wTry(b => { const c = { ...paid.rawCfg() }; if (typeof b.on === 'boolean') c.on = b.on; if (typeof b.say === 'boolean') c.say = b.say; if (typeof b.listId === 'string') c.listId = b.listId; for (const k of ['tip', 'bits', 'subs']) if (b[k] !== undefined) c[k] = Math.max(0, Number(b[k]) || 0); db.settings.paidBattles = c; save(); pushState(); return paid.info(); }));
app.post('/api/paid/start', async (req, res) => { // ▶ the next paid battle (or a picked one): 🎯 a guess countdown first (marathon), then its battle goes on, logged with who paid
  if (live.phase === 'lobby' || live.phase === 'running') return res.status(400).json({ error: 'A battle is already going. Start the next one when it ends.' });
  if (live.maraGuess) return res.status(400).json({ error: 'Chat is still guessing for the next battle: ▶ Start now or ✕ Cancel it first.' });
  if (!paid.dev()) return res.status(400).json({ error: 'Paid battles are a 🛠️ dev mode feature: turn on Dev mode in Settings → 👤 Account & updates.' });
  if (db.paidPaused) return res.status(400).json({ error: 'Battles are paused (📜 the paused message is on). Press ▶ Hide it + resume battles on the Marathon tab (or P) to start them again.' }); // 📜 (1.78.1, Derek)
  const it = paid.take(req.body?.id); if (!it) return res.status(400).json({ error: 'Nobody is waiting for a battle.' });
  const c = paid.cfg(), l = c.listId && getList(c.listId);
  if (c.listId && !l) { paid.putBack(it); return res.status(400).json({ error: "The battle picked for paid battles isn't there any more: pick one in Settings → 💰 Rewards & prices." }); }
  cards.setShow(false); if (wheel.W().show) wheel.setShow(false);
  if (live.phase === 'ended' || live.claim) { if (live.claim) clearTimeout(live.claim.timer); live.claim = null; live.phase = 'idle'; live.game = null; broadcast({ type: 'reset' }, 'overlay'); }
  stopGather(true);
  if (l && db.activeListId !== l.id) { leaveEnded(); db.activeListId = l.id; previewIds = null; save(); }
  const map = it.map && marathon.maps().some(m => m.id === it.map) ? it.map : maraRandomMap(); // (their 🗺️ map, else a random one: it shows on the cliff while chat guesses)
  const secs = Number(marathon.cfg().guessSecs ?? 90);
  broadcast({ type: 'goView', view: 'battle' }, 'control');
  if (secs > 0 && !req.body?.now && l) { maraGuessBegin(it, map, secs); return res.json({ ok: true, item: it, guessing: secs }); }
  const err = await paidRun(it, map, null);
  if (err) { paid.putBack(it); return res.status(400).json({ error: err }); }
  res.json({ ok: true, item: it });
});
/** The paid battle goes on: their 🍀 luck (no pick = a random thing), the map, the battle. Returns an error text, or nothing. */
async function paidRun(it, map, guess, st0) {
  const st = st0 || marathon.atStart(it, () => map), mapWas = live.map; // 🏃 their 🗺️ map + their 🍀 luck (no pick = a random thing gets it)
  live.map = st.map; live.mapUsed = false; live.raceSkip = null; live.mapPick = true;
  const err = await startRound({ paid: { who: it.who, login: it.login, kind: it.kind, what: it.what, at: it.at, test: it.test || undefined, map: st.map, mapPicked: st.mapPicked || undefined, luck: st.gave ? st.gave.e.label : undefined } });
  if (err) { st.undo(); live.map = mapWas; live.mapPick = false; return err; }
  if (guess && live.game) live.game.maraGuess = guess; // 🎯 who guessed what (paid out at the result)
  if (paid.cfg().say) paidSay(`⚔️ This battle is for ${it.login ? '@' + it.login : it.who} (${it.what})! 🗺️ ${mapLabel(st.map)}${st.mapPicked ? '' : maraDefMap() === st.map ? '' : ' (random)'}${st.gave ? ` · 🍀${st.gave.random ? ' 🎲 random:' : ''} ${st.gave.e.label} is at ${Math.round(st.gave.e.vLuck * 100) / 100}%` : st.tok ? ' · 🍀 they can still give their luck later' : ''}.${paid.queue().length ? ` ${paid.queue().length} more waiting.` : ''}`);
  return null;
}
// 🎯 Guess the winner (1.76.0, Derek: "a 1 min countdown before battle to let chat guess the winner. Number them, they type in chat
// what number wins. If that number wins they win a battle. They pick map and luck in the order they typed"):
// ▶ Run → the battle waits on the cliff for guessSecs; chat types a number (one guess each, the first one counts); then it starts.
// Everyone who typed the winner's number gets a battle, added to the line in the order they guessed.
function maraGuessMsg() { const g = live.maraGuess; return g ? { type: 'maraGuess', on: true, at: g.at, endsAt: g.endsAt, who: g.item.who, map: mapLabel(g.map), items: g.nums.map(x => ({ n: x.n, label: x.label, luck: x.luck, plus: x.plus || 0, rnd: !!x.rnd })), count: g.guesses.length, last: g.guesses.slice(-6).map(x => x.name) } : { type: 'maraGuess', on: false }; }
function maraGuessBegin(it, map, secs) {
  // 🍀 (1.83.2, Derek: "luck won't be added until I hit start for that battle… people can change luck on the website until I
  // hit start") pressing ▶ Run = the start: their luck goes on NOW (before chat guesses, so the guess pop-up shows it), and from
  // here their picks are locked. ✕ Cancel takes it back off.
  const st = marathon.atStart(it, () => map); map = st.map;
  live.map = map; live.mapUsed = false; live.raceSkip = null; live.mapPick = true; refreshPreview(true);
  live.maraGuess = { item: it, map, st, at: Date.now(), endsAt: Date.now() + secs * 1000, nums: marathon.items().map(x => ({ n: x.n, id: x.id, label: x.label, luck: x.luck, ...(st.gave?.e.id === x.id ? { plus: Math.round((st.gave.e.vLuck - st.gave.was) * 100) / 100, rnd: !!st.gave.random } : {}) })), guesses: [], timer: setTimeout(() => maraGuessEnd(), secs * 1000) };
  broadcast(maraGuessMsg(), 'mara'); pushState();
  paidSay(`🎯 GUESS THE WINNER! Type the number of the thing you think wins (one guess each, numbers are on screen). Right = you win a battle! ${secs} seconds. This one is for ${it.login ? '@' + it.login : it.who}.${st.gave ? ` 🍀 +${Math.round((st.gave.e.vLuck - st.gave.was) * 100) / 100}% to ${st.gave.e.label}${st.gave.random ? ' (🎲 random: no pick)' : ''}.` : ''}`);
  act('battle', `Chat is guessing the winner for ${it.who}'s battle (${secs} s)`, { icon: '🎯', kind: 'guess' });
}
async function maraGuessEnd(cancel) {
  const g = live.maraGuess; if (!g) return; clearTimeout(g.timer); live.maraGuess = null; broadcast({ type: 'maraGuess', on: false }, 'mara');
  if (cancel) { g.st?.undo(); paid.putBack(g.item); live.mapPick = false; pushState(); return; } // (🍀 their luck comes back off: the battle didn't happen)
  const err = await paidRun(g.item, g.map, { nums: g.nums.map(x => ({ n: x.n, id: x.id })), guesses: g.guesses }, g.st);
  if (err) { paid.putBack(g.item); broadcast({ type: 'toast', text: `⚠️ ${hEsc(err)}` }, 'control'); }
  pushState();
}
function maraGuessChat(m) { // a number while chat is guessing (one guess each; the first one counts)
  const g = live.maraGuess; if (!g) return false;
  const mm = String(m.text || '').trim().match(/^(?:!?guess\s*)?#?\s*(\d{1,3})$/i); if (!mm) return false;
  const n = Number(mm[1]); if (!g.nums.some(x => x.n === n)) return true;
  const k = marathon.norm(m.login); if (g.guesses.some(x => x.k === k)) return true;
  g.guesses.push({ k, login: m.login, name: m.name || m.login, n, at: Date.now() });
  broadcast({ type: 'maraGuessN', count: g.guesses.length, last: g.guesses.slice(-6).map(x => x.name) }, 'mara'); pushState();
  return true;
}
function maraGuessResult(game, winnerId) { // 🎯 everyone who called it gets a battle, in the order they guessed
  const G = game.maraGuess; if (!G) return;
  const n = G.nums.find(x => x.id === winnerId)?.n, right = n ? G.guesses.filter(x => x.n === n) : [];
  for (const x of right) paid.award({ who: x.name, login: x.login, what: `guessing #${n} right`, kind: 'guess', test: !!game.paid?.test });
  const label = game.fighters.find(f => f.id === winnerId)?.label || '?';
  broadcast({ type: 'maraGuessWin', n, label, names: right.map(x => x.name), total: G.guesses.length }, 'mara');
  if (G.guesses.length) paidSay(right.length ? `🎯 #${n} ${label} won! ${right.map(x => '@' + x.login).join(', ')} called it: ${right.length === 1 ? 'you win a battle' : 'you each win a battle'} (in the order you guessed)!` : `🎯 #${n} ${label} won! Nobody called it (${G.guesses.length} guess${G.guesses.length === 1 ? '' : 'es'}).`);
  act('battle', `${right.length} of ${G.guesses.length} guessed #${n} ${label}${right.length ? ': ' + right.map(x => x.name).join(', ') + ' won a battle' : ''}`, { icon: '🎯', kind: 'guess' });
}
// ⏱️ (1.77.0, Derek: "when it's a timed physical thing like a wall sit… I have a wireless mouse to start the timer, but have an
// alarm go off for 5 seconds when the timer is finished"): a thing in the marathon battle with a time in its name (45-second
// plank, 1 minute wall sit, 1:30…) or set by hand in the Marathon pool wins → Movie Royal comes to the front with "click to
// start"; any mouse button (or Space) starts it; the countdown shows on stream (marathon overlay) and in the app; at 0 the
// alarm rings for alarmSecs (5) seconds.
let mtTimer = null;
const secsWord = n => n >= 60 && n % 60 === 0 ? `${n / 60}-minute` : n > 60 ? `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}` : `${n}-second`;
const mtMsg = () => ({ type: 'maraTimer', t: live.maraTimer ? { ...live.maraTimer, alarmSecs: Math.max(1, Math.min(30, Number(marathon.cfg().alarmSecs) || 5)) } : null, now: Date.now() });
function mtSend() { const m = mtMsg(); broadcast(m, 'mara'); broadcast(m, 'control'); }
function maraTimerWin(list, f, test) {
  if (marathon.cfg().timerOn === false) return;
  const e = list.entries.find(x => x.id === f.id), secs = e ? marathon.secsOf(e) : 0; if (!(secs > 0)) return;
  clearTimeout(mtTimer); live.maraTimer = { id: uid(), label: f.label, secs, state: 'ready', at: Date.now(), who: live.game?.paid?.who || null, test: !!test };
  mtSend(); try { globalThis.__desktop?.front?.(); } catch {}
  act('battle', `⏱️ ${f.label} won: a ${secsWord(secs)} timer is ready (click to start)`, { icon: '⏱️', kind: 'timer', test });
}
function maraTimerCmd(cmd) {
  const T = live.maraTimer; if (!T) throw new Error('There is no timer right now.');
  clearTimeout(mtTimer);
  if (cmd === 'start' || cmd === 'resume') {
    if (T.state === 'running') return T;
    const left = T.state === 'paused' ? T.left : T.secs; Object.assign(T, { state: 'running', endsAt: Date.now() + left * 1000, startedAt: T.startedAt || Date.now() }); delete T.left;
    mtTimer = setTimeout(maraTimerDone, left * 1000);
    if (cmd === 'start') act('battle', `⏱️ Started the ${secsWord(T.secs)} timer for ${T.label}`, { icon: '⏱️', kind: 'timer', test: T.test });
  } else if (cmd === 'pause') { if (T.state !== 'running') return T; T.left = Math.max(0, (T.endsAt - Date.now()) / 1000); T.state = 'paused'; delete T.endsAt; }
  else if (cmd === 'restart') { Object.assign(T, { state: 'ready' }); delete T.endsAt; delete T.left; delete T.startedAt; }
  else if (cmd === 'close') { live.maraTimer = null; }
  else if (cmd === 'done') return maraTimerDone();
  mtSend(); return live.maraTimer;
}
function maraTimerDone() {
  const T = live.maraTimer; if (!T) return null; clearTimeout(mtTimer);
  T.state = 'done'; T.doneAt = Date.now(); delete T.endsAt; mtSend();
  act('battle', `⏱️ Time's up: ${T.label} (${secsWord(T.secs)})`, { icon: '⏰', kind: 'timer', test: T.test });
  const id = T.id; mtTimer = setTimeout(() => { if (live.maraTimer?.id === id) { live.maraTimer = null; mtSend(); } }, (Math.max(1, Number(marathon.cfg().alarmSecs) || 5) + 12) * 1000);
  return T;
}
app.get('/api/mara/timer', (req, res) => res.json(mtMsg()));
app.post('/api/mara/timer', wTry(b => ({ t: maraTimerCmd(String(b.cmd || '')) })));
app.post('/api/test/mara-timer', wTry(b => { // 🧪 pretend a timed thing just won (nothing else happens)
  const secs = Math.max(3, Math.min(600, Math.round(Number(b.secs) || 10)));
  clearTimeout(mtTimer); live.maraTimer = { id: uid(), label: String(b.label || `${secs}-second plank (test)`).slice(0, 80), secs, state: 'ready', at: Date.now(), who: 'Test_Viewer', test: true };
  mtSend(); try { globalThis.__desktop?.front?.(); } catch {} return { t: live.maraTimer };
}));
app.get('/api/test/mara-secs', (req, res) => res.json({ label: String(req.query.label || ''), kind: marathon.kindOf({ label: String(req.query.label || '') }), secs: marathon.secsOf({ label: String(req.query.label || '') }) }));

// 🖼️ (1.77.0) pictures of the marathon's things from the internet (itempics.js): every thing without one gets one by itself
// (25 s after opening, then every 5 minutes, each tried at most once a day); 🔄 in the Marathon pool steps to another picture.
const maraList = () => { const id = paid.cfg().listId; return id ? getList(id) : null; };
// 🏃 Derek's own marathon battle (1.80.0, Derek: "add my battle for stream to app"): src/defaults/marathon-battle.json (a share
// file) is added ONCE, the first time the app opens in 🛠️ dev mode (friends without dev mode never get it). Skipped when a battle
// called "marathon battle" is already there (his imported one); either way it becomes the marathon battle if none is picked yet.
// Delete it and it stays deleted (Marathon pool → ➕ Add my Marathon Battle brings a fresh copy back).
function maraBattleMake() {
  const b = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'defaults', 'marathon-battle.json'), 'utf8')).battle;
  const l = { id: uid(), name: String(b.name).slice(0, 60), type: b.type || 'text', entries: [], joinOpen: false, screenTitle: String(b.screenTitle || '').slice(0, 60), bestOf: 1, madeBy: 'marathon' };
  for (const e of b.entries || []) l.entries.push({ id: uid(), label: String(e.label).slice(0, 120), sub: String(e.sub || '').slice(0, 40), weight: Math.max(0.1, Number(e.weight) || 1), status: 'active', addedAt: Date.now(), ...(e.restAfterWin ? { restAfterWin: true } : {}), ...(e.desc ? { desc: String(e.desc).slice(0, 600) } : {}) });
  db.lists.push(l); return l;
}
function maraBattleOnce() {
  if (!db.settings.betaUpdates || db.settings.madeMaraBattle) return null;
  db.settings.madeMaraBattle = true;
  let l = null;
  try { l = db.lists.find(x => /marathon battle/i.test(x.name)) || null; if (!l) { l = maraBattleMake(); act('battle', `🏃 Your marathon battle “${l.name}” was added (${l.entries.length} things)`, { icon: '🏃', kind: 'list', list: l.name }); } }
  catch (e) { console.error('[marathon] ready-made battle:', e.message); }
  const pc = db.settings.paidBattles ||= {};
  if (l && !(pc.listId && getList(pc.listId))) pc.listId = l.id;
  save(); pushState(); return l;
}
setTimeout(maraBattleOnce, 1500);
// 🎲 (1.81.1, Derek: "all odds should start even") the marathon battle made before 1.81.1 still had the old odds (8 for pickle
// balls, 2 for DOUBLE…). Once: if a marathon battle still has exactly those old odds (you never changed them), every thing → 1.
const MARA_OLD_ODDS = { 'Pickle Balls': 8, 'Ketchup candy cane': 8, 'Hot Dog candy': 8, 'Toxic Waste': 6, 'Toxic Waste x3': 2, 'BeanBoozled': 6, 'Heksehyl salt licorice': 4, 'Fazer Salmiakki': 5, 'Durian candy': 4, 'Octopus': 3, 'Mushroom tempura seaweed': 6, 'BBQ seaweed roll': 7, "Thai prawn Lay's": 7, 'Jolt energy drink': 4, 'KitKat NY Cheesecake': 7, 'KitKat Matcha': 7, 'KitKat Strawberry': 7, 'Kopiko coffee candy': 7, 'Muscat gummies': 7, '10 push-ups': 8, '20 sit-ups': 8, '20 squats': 8, '30 jumping jacks': 6, '45-second plank': 6, '1-minute wall sit': 5, '10 burpees': 3, 'MERCY': 5, "CHAT'S CHOICE": 2, 'DOUBLE': 2 };
function maraEvenOnce() {
  if (db.settings.maraEvenOdds) return; db.settings.maraEvenOdds = true;
  for (const l of db.lists || []) {
    if (l.madeBy !== 'marathon' && !/marathon battle/i.test(l.name)) continue;
    const known = l.entries.filter(e => e.label in MARA_OLD_ODDS);
    if (known.length < 10 || known.some(e => Number(e.weight || 1) !== MARA_OLD_ODDS[e.label]) || l.entries.some(e => !(e.label in MARA_OLD_ODDS) && Number(e.weight || 1) !== 1)) continue; // (you changed some odds yourself: left as it is)
    for (const e of l.entries) e.weight = 1;
    act('battle', `🎲 every thing in “${l.name}” starts with even odds now (1 each)`, { icon: '🎲', kind: 'odds', list: l.name });
  }
  save();
}
setTimeout(maraEvenOnce, 1200);
// 🎯 (1.82.4, Derek: "change the timer for chat to vote on winner to 90 seconds just in case of lag") once: a guess countdown
// still on the old 60-second default → 90. One you set to something else yourself stays.
function maraGuess90Once() {
  if (db.settings.maraGuess90) return; db.settings.maraGuess90 = true;
  const m = db.settings.marathon; if (m && Number(m.guessSecs) === 60) m.guessSecs = 90;
  save();
}
setTimeout(maraGuess90Once, 1200);
// 💪 (1.82.9, Derek: "make it default 5 push-ups") once: the marathon battle's "10 push-ups" → "5 push-ups" (runs after the even-odds
// check above, which still looks for the old name). A thing you renamed yourself stays as it is.
function maraPush5Once() {
  if (db.settings.maraPush5) return; db.settings.maraPush5 = true;
  for (const l of db.lists || []) {
    if (l.madeBy !== 'marathon' && !/marathon battle/i.test(l.name)) continue;
    for (const e of l.entries) if (e.label === '10 push-ups') { e.label = '5 push-ups'; if (/10 push/i.test(e.sign || '')) e.sign = '5 push-ups'; act('battle', `💪 “10 push-ups” in “${l.name}” is “5 push-ups” now`, { icon: '💪', kind: 'edit', list: l.name }); }
  }
  save();
}
setTimeout(maraPush5Once, 1300);
// 😴 (1.83.1, Derek: "for MERCY, if it wins it goes away the next battle so I can't get it twice, but comes back after") once:
// the marathon battle's MERCY gets "sits out the battle after it wins" (any thing can have it: 🏃 Marathon pool → 😴)
function maraMercyOnce() {
  if (db.settings.maraMercyRest) return; db.settings.maraMercyRest = true;
  for (const l of db.lists || []) { if (l.madeBy !== 'marathon' && !/marathon battle/i.test(l.name)) continue; for (const e of l.entries) if (/^\s*mercy\b/i.test(e.label)) e.restAfterWin = true; }
  save();
}
setTimeout(maraMercyOnce, 1300);
// 🎁 (1.90.2, Derek: "make sure all these items are on the battle, also have a small 1 paragraph description… think Price is Right") once:
// the marathon battle gets the snacks from his photo that were missing, and every thing gets its prize description (only where there is none yet)
function maraPrizes(l, dry) {
  const b = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'defaults', 'marathon-battle.json'), 'utf8')).battle, out = { added: [], described: [] };
  for (const d of b.entries || []) {
    let re; try { re = new RegExp(d.match || '^$', 'i'); } catch { continue; }
    const e = l.entries.find(x => x.label === d.label) || l.entries.find(x => re.test(x.label));
    if (e) { if (d.desc && !e.desc) { out.described.push(e.label); if (!dry) e.desc = d.desc; } continue; }
    if (!d.since) continue; /* only the new snacks are added: things you took out stay out */
    out.added.push(d.label);
    if (!dry) l.entries.push({ id: uid(), label: d.label, sub: String(d.sub || ''), weight: 1, status: 'active', addedAt: Date.now(), ...(d.desc ? { desc: d.desc } : {}) });
  }
  return out;
}
function maraPrizesOnce() {
  if (db.settings.maraPrizes1) return; db.settings.maraPrizes1 = true;
  for (const l of db.lists || []) {
    if (l.madeBy !== 'marathon' && !/marathon battle/i.test(l.name)) continue;
    const r = maraPrizes(l); if (r.added.length || r.described.length) act('battle', `🎁 “${l.name}”: ${r.added.length ? `added ${r.added.join(', ')}` : 'nothing new to add'} · ${r.described.length} things got a prize description`, { icon: '🎁', kind: 'edit', list: l.name });
  }
  save();
}
setTimeout(maraPrizesOnce, 1400);
// 🥚 The egg game (1.100.0, True's edition; Derek's with dev mode on): see src/eggs.js + public/creatures.js
eggs.setHooks({ on: () => feat('eggs'), say: t => twitch.say(t), live: () => !!db.live || !!live.fakeLive, act: (text, o = {}) => act('chat', text, { icon: '🥚', ...o }), send: (msg, role) => broadcast(msg, role), changed: () => { broadcast({ type: 'eggs' }, 'control'); broadcast({ type: 'eggBadges', badges: eggs.badges() }, 'eggs'); eggSiteSoon(); }, isBot: l => BOT_NAMES.includes(l) || l === String(db.twitchBot?.login || '').toLowerCase() });
const egTry = fn => async (req, res) => { try { if (!feat('eggs')) throw new Error('The egg game is not part of this edition.'); const r = await fn(req.body || {}, req); res.json(r && r.players ? { state: r } : r || {}); } catch (e) { res.status(400).json({ error: e.message }); } };
app.get('/api/eggs', (req, res) => res.json(feat('eggs') ? { ...eggs.state({ q: String(req.query.q || '') }), site: eggSite, reward: db.eggs?.rewardSetup || null, signedIn: !!twitch.status.userId, kick: feat('kick') ? { signedIn: kick.signedIn(), can: kick.canRewards(), resign: kick.needsResign(), reward: kick.watched('egg'), error: kick.status.rewardError || eggKickSetup.error || null, redeems: kick.status.redeems || 0 } : null } : { on: false }));
app.get('/api/eggs/public', (req, res) => res.json(feat('eggs') ? eggs.publicData() : { players: [] })); // (what the viewer page shows: names + creatures)
app.get('/api/eggs/badges', (req, res) => res.json(feat('eggs') ? eggs.badges() : {}));
app.post('/api/eggs/opts', egTry(b => eggs.setOpts(b)));
app.post('/api/eggs/give', egTry(b => eggs.grant(b.name, b.pts)));
app.post('/api/eggs/remove', egTry(b => eggs.removePlayer(b.key)));
app.post('/api/eggs/give-egg', egTry(b => eggs.grantEggs(b.name, b.n)));
// 🥚 the "Buy an egg" channel point reward: made once by itself after signing in (never refunds: every redeem is an egg)
async function eggRewardSetup() {
  if (!pointsOn()) return { skipped: true };
  const o = eggs.opts(), all = await twitch.listAllRewards(), mine = new Set((await twitch.listRewards()).map(r => r.id)), old = all.find(r => r.title.toLowerCase() === o.buyTitle.toLowerCase()), out = { title: o.buyTitle, cost: old?.cost || o.buyCost, made: false, byHand: !!old && !mine.has(old.id) };
  if (old) eggs.data().opts.buyCost = old.cost; else out.made = await twitch.createReward({ title: o.buyTitle, cost: o.buyCost, prompt: 'One more egg for your nest! Only one egg incubates at a time; the next one starts when it hatches. Which creature is inside is a surprise.', color: '#FFB020', input: false, queue: false }).catch(e => { out.error = e.message; return false; });
  eggs.data().rewardSetup = { at: Date.now(), ...out }; save(); rewardKey = ''; syncRewards().catch(() => {}); broadcast({ type: 'eggs' }, 'control'); return out;
}
setInterval(() => { if (feat('eggs') && twitch.status.userId && !db.eggs?.rewardSetup && !eggRewardSetup.busy) { eggRewardSetup.busy = true; eggRewardSetup().catch(e => console.error('[twitch] egg reward:', e.message)).finally(() => { eggRewardSetup.busy = false; }); } }, 30000);
app.post('/api/eggs/reward', egTry(async () => ({ ok: true, ...(await eggRewardSetup()) })));
// 🟢 the same reward on Kick (Kick has channel points since 2026): made once after signing in with Kick, redemptions read every few seconds
async function eggKickSetup() {
  if (!feat('kick')) throw new Error('Kick is not part of this edition.'); if (!kick.signedIn()) throw new Error('Sign in with Kick first (Settings → Twitch → Kick).'); if (kick.needsResign()) throw new Error('Sign in with Kick once more: channel points need two new permissions (read + manage channel rewards).');
  const o = eggs.opts(); const r = await kick.ensureReward('egg', { title: o.buyTitle, cost: o.buyCost, description: 'One more egg for your nest! Only one egg incubates at a time; the next one starts when it hatches. Which creature is inside is a surprise.', color: '#FFB020' });
  eggs.data().kickSetup = { at: Date.now(), title: r.title, cost: r.cost, had: r.had }; save(); broadcast({ type: 'eggs' }, 'control'); return r;
}
setInterval(() => { if (feat('eggs') && feat('kick') && kick.canRewards() && !kick.watched('egg') && !eggKickSetup.busy && Date.now() - (eggKickSetup.failAt || 0) > 10 * 60000) { eggKickSetup.busy = true; eggKickSetup().catch(e => { eggKickSetup.failAt = Date.now(); eggKickSetup.error = e.message; console.error('[kick] egg reward:', e.message); broadcast({ type: 'eggs' }, 'control'); }).finally(() => { eggKickSetup.busy = false; }); } }, 30000);
app.post('/api/eggs/kick-reward', egTry(async () => { try { eggKickSetup.error = null; return { ok: true, ...(await eggKickSetup()) }; } catch (e) { eggKickSetup.error = e.message; throw e; } }));
app.post('/api/test/kick-redeem', async (req, res) => { try { if (!feat('eggs')) throw new Error('The egg game is not part of this edition.'); twitch.pretend.until = Date.now() + 10 * 60000; const name = String(req.body?.name || 'Pretend_kicker'), r = eggs.buy({ login: name.toLowerCase(), name, kick: true }, { test: true }); res.json({ ok: true, waiting: r.waiting, started: r.started }); } catch (e) { res.status(400).json({ error: e.message }); } }); // (a pretend Kick viewer redeems Buy an egg)
// 🌐 the public egg page on your own 24/7 bot (Cloudflare): the page + the creature drawings once, then a copy of names + creatures at most every 5 minutes, only when something changed
const eggSite = { url: '', at: 0, error: '', v: '' }; let eggSiteT = null, eggSiteLast = '';
function eggSiteSoon() { if (eggSiteT || !feat('eggs') || db.eggs?.opts?.site === false) return; eggSiteT = setTimeout(() => { eggSiteT = null; eggSitePush().catch(e => { eggSite.error = e.message; }); }, Math.max(15000, 5 * 60000 - (Date.now() - eggSite.at))); }
async function eggSitePush(force) {
  if (!feat('eggs') || db.eggs?.opts?.site === false) return eggSite; let on = false; try { on = cloud.enabled(); } catch {} if (!on) { eggSite.error = 'Set up the 24/7 bot first (Setup guide): the egg website lives on it.'; eggSite.url = ''; return eggSite; }
  const base = String(db.settings.cloud.url || '').replace(/\/+$/, ''), key = db.settings.cloud.syncKey, put = (name, body, type, v) => fetch(`${base}/eggs/put?name=${name}${v ? '&v=' + v : ''}`, { method: 'PUT', headers: { Authorization: `Bearer ${key}`, 'content-type': type }, body, signal: AbortSignal.timeout(30000) });
  const page = brandFile(fs.readFileSync(path.join(ROOT, 'public', 'eggpage.html'), 'utf8')), js = fs.readFileSync(path.join(ROOT, 'public', 'creatures.js'), 'utf8'), v = crypto.createHash('sha256').update(page + js).digest('hex').slice(0, 16);
  const have = await fetch(base + '/eggs/v', { signal: AbortSignal.timeout(10000) }).then(r => (r.ok ? r.text() : r.status === 404 ? '404' : '')).catch(() => '');
  if (have === '404') { eggSite.error = 'Your 24/7 bot needs an update first (Settings → 🤖 Discord & picks → Update the 24/7 bot), then the egg website works.'; eggSite.url = ''; return eggSite; }
  if (have.trim() !== v) { for (const [n, b, t] of [['js', js, 'application/javascript'], ['page', page, 'text/html']]) { const r = await put(n, b, t, v); if (!r.ok) throw new Error('egg website upload: ' + r.status); } }
  const body = JSON.stringify(eggs.publicData()), h = crypto.createHash('sha256').update(body.replace(/"at":\d+,/, '')).digest('hex');
  if (force || h !== eggSiteLast) { const r = await put('data', body, 'application/json'); if (!r.ok) throw new Error('egg website data: ' + r.status); eggSiteLast = h; }
  eggSite.url = base + '/eggs'; eggSite.at = Date.now(); eggSite.error = ''; eggSite.v = v; return eggSite;
}
setTimeout(() => eggSitePush().catch(e => { eggSite.error = e.message; }), 40000);
app.post('/api/eggs/site', egTry(async b => { if ('on' in b) { eggs.data().opts.site = !!b.on; save(); } try { await eggSitePush(true); } catch (e) { eggSite.error = e.message; } return { site: eggSite, on: db.eggs?.opts?.site !== false }; }));
app.post('/api/test/eggs', egTry(async b => {
  if (b.action === 'rules') return eggs.demo();
  if (b.action === 'clear') return eggs.clearTests();
  twitch.pretend.until = Date.now() + 10 * 60000; const d = eggs.data(), names = ['pretend_ash', 'pretend_bee', 'pretend_cy', 'pretend_dot'];
  if (b.action === 'buy') { const r = eggs.buy({ login: names[0], name: 'Pretend_ash' }, { test: true }); return { ok: true, waiting: r.waiting, started: r.started }; }
  if (b.action === 'fill') { for (const n of names) { const p = eggs.player({ login: n, name: n.replace('pretend_', 'Pretend_') }, d); eggs.addEggs(p, 6, { d }); eggs.give(p, eggs.opts().need * (2 + Math.floor(Math.random() * 4)) + Math.floor(Math.random() * eggs.opts().need), 'test', { quiet: true, test: true }); for (const c of p.pets) eggs.addXp(c, Math.floor(Math.random() * 1500)); } save(); broadcast({ type: 'eggs' }, 'control'); broadcast({ type: 'eggBadges', badges: eggs.badges() }, 'eggs'); return eggs.state(); }
  if (b.action === 'hatch') { const p = eggs.player({ login: names[0], name: 'Pretend_ash' }, d); if (!eggs.hasEgg(p)) eggs.addEggs(p, 1, { d }); const got = eggs.give(p, eggs.opts().need - p.pts, 'test', { test: true }); save(); broadcast({ type: 'eggs' }, 'control'); return { ok: true, hatched: got.length }; }
  if (b.action === 'powers') { const p = eggs.player({ login: names[0], name: 'Pretend_ash' }, d); if (!p.pets.length) eggs.give(p, eggs.opts().need, 'test', { quiet: true, test: true }); const c = p.pets[p.eq] || p.pets[0]; if (c.lvl < 12) { c.lvl = 12; c.xp = 0; if (c.stage < 1) c.stage = 1; } c.pw = []; save(); const o = eggs.opts(), say = (t, ms) => setTimeout(() => twitchHandlers.chat({ login: names[0], name: 'Pretend_ash', text: t, userId: 'p-ash', badges: {}, pretend: true }), ms); say(o.skillsCommand, 0); say(o.powersCommand, 700); say(o.powerCommand + ' 1', 1400); say(o.powerCommand + ' crowd', 2100); return { ok: true }; }
  if (b.action === 'battle') { for (const n of names.slice(0, 2)) { const p = eggs.player({ login: n, name: n.replace('pretend_', 'Pretend_') }, d); if (!p.pets.length) eggs.give(p, eggs.opts().need, 'test', { quiet: true, test: true }); } twitchHandlers.chat({ login: names[0], name: 'Pretend_ash', text: `${eggs.opts().battleCommand} ${names[1]}`, userId: 'p-ash', badges: {}, pretend: true }); await new Promise(r => setTimeout(r, 400)); twitchHandlers.chat({ login: names[1], name: 'Pretend_bee', text: eggs.opts().battleCommand, userId: 'p-bee', badges: {}, pretend: true }); return { ok: true }; }
  twitchHandlers.chat({ login: names[0], name: 'Pretend_ash', text: String(b.text || eggs.opts().eggCommand), userId: 'p-ash', badges: {}, pretend: true }); return { ok: true };
}));
// 🎵 Song requests + ratings (1.98.0, Birx & Jess's edition; Derek's with dev mode on): see src/songs.js
const ytTitles = new Map();
async function ytTitle(id) { // (the only thing looked up: a YouTube link's title, the way a link preview does; no key, nothing about you is sent)
  if (ytTitles.has(id)) return ytTitles.get(id);
  try { const r = await fetch('https://www.youtube.com/oembed?format=json&url=' + encodeURIComponent('https://www.youtube.com/watch?v=' + id), { signal: AbortSignal.timeout(6000) }); const j = r.ok ? await r.json() : null; const t = j?.title ? String(j.title) : ''; if (t) ytTitles.set(id, t); return t; } catch { return ''; }
}
// 🎼 What a song request rule needs to know about a YouTube video (music only, length, views, DMCA-free channel): its public page, read the way a browser would, no key.
function ytWatchParse(html) { const s = String(html || ''), g = re => { const m = s.match(re); return m ? m[1] : ''; }, num = v => (v === '' ? null : Number(v));
  const secs = num(g(/"lengthSeconds":"(\d+)"/)), views = num(g(/"viewCount":"(\d+)"/)), category = g(/"category":"([^"]{1,40})"/), author = g(/"ownerChannelName":"([^"]{1,100})"/) || g(/"author":"([^"]{1,100})"/), live = /"isLiveContent":true/.test(s), loudS = g(/"loudnessDb":(-?[\d.]+)/), loud = loudS === '' ? null : Number(loudS); /* (🔊 loudnessDb: how much louder (+) or quieter (−) than YouTube's normal level) */
  return secs == null && views == null && !category && !author ? null : { secs: secs || 0, views, category, author, live, loud: Number.isFinite(loud) ? loud : null }; }
const ytInfos = new Map();
async function ytInfo(id) {
  if (ytInfos.has(id)) return ytInfos.get(id);
  let info = null, title = '', author = '';
  try { const r = await fetch('https://www.youtube.com/oembed?format=json&url=' + encodeURIComponent('https://www.youtube.com/watch?v=' + id), { signal: AbortSignal.timeout(6000) }); const j = r.ok ? await r.json() : null; title = String(j?.title || ''); author = String(j?.author_name || ''); if (title) ytTitles.set(id, title); } catch {}
  try { const r = await fetch('https://www.youtube.com/watch?v=' + encodeURIComponent(id) + '&hl=en', { headers: { 'accept-language': 'en-US,en;q=0.8', 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36' }, signal: AbortSignal.timeout(8000) }); if (r.ok) info = ytWatchParse(await r.text()); } catch {}
  if (!info && (title || author)) info = { secs: 0, views: null, category: '', author, live: false };
  if (info) { info.title = title; if (author) info.author = author; ytInfos.set(id, info); if (ytInfos.size > 500) ytInfos.delete(ytInfos.keys().next().value); }
  return info;
}
// 🔎 A typed song name is looked up on YouTube's own search page (no key): the videos it lists, in order, with their length and views when shown.
function ytSearchParse(html) { const s = String(html || ''), out = [], seen = new Set(), secsOf = t => { const p = String(t || '').split(':').map(Number); return p.some(isNaN) ? 0 : p.reduce((a, b) => a * 60 + b, 0); };
  const all = [...s.matchAll(/"videoRenderer":\{"videoId":"([\w-]{11})"/g)];
  for (const [n, m] of all.entries()) { const id = m[1]; if (seen.has(id)) continue; seen.add(id); const part = s.slice(m.index, Math.min(m.index + 9000, all[n + 1] ? all[n + 1].index : s.length)), g = re => { const x = part.match(re); return x ? x[1] : ''; };
    const title = g(/"title":\{"runs":\[\{"text":"((?:[^"\\]|\\.)*)"/), author = g(/"(?:ownerText|longBylineText)":\{"runs":\[\{"text":"((?:[^"\\]|\\.)*)"/), len = g(/"lengthText":\{.{0,400}?"simpleText":"([\d:]+)"/), views = g(/"viewCountText":\{"simpleText":"([\d,.]+)/);
    let t = title, a = author; try { t = JSON.parse('"' + title + '"'); a = JSON.parse('"' + author + '"'); } catch {}
    out.push({ id, title: t, author: a, secs: secsOf(len), views: views ? Number(views.replace(/[,.]/g, '')) : null, artist: /OFFICIAL_ARTIST_BADGE/.test(part) || undefined, verified: /BADGE_STYLE_TYPE_VERIFIED/.test(part) || undefined }); if (out.length >= 15) break; }
  return out; }
const ytSearches = new Map();
async function ytSearch(q) { const k = String(q || '').trim().toLowerCase(); if (!k) return []; if (ytSearches.has(k)) return ytSearches.get(k);
  let res = []; try { const r = await fetch('https://www.youtube.com/results?hl=en&search_query=' + encodeURIComponent(k), { headers: { 'accept-language': 'en-US,en;q=0.8', 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36' }, signal: AbortSignal.timeout(8000) }); if (r.ok) res = ytSearchParse(await r.text()); } catch {}
  if (res.length) { ytSearches.set(k, res); if (ytSearches.size > 300) ytSearches.delete(ytSearches.keys().next().value); }
  return res; }
app.get('/api/test/yt-parse', (req, res) => { /* 🧪 the two YouTube page readers, on small sample pages (no internet) */
  const w = ytWatchParse('x"lengthSeconds":"275","ownerChannelName":"TotoVEVO","viewCount":"912345","category":"Music","isLiveContent":false,"audioConfig":{"loudnessDb":-4.5,"perceptualLoudnessDb":-18.5} y'), sr = ytSearchParse('{"videoRenderer":{"videoId":"FTQbiNvZqaY","thumbnail":{},"title":{"runs":[{"text":"Toto - Africa (Official HD Video)"}]},"longBylineText":{"runs":[{"text":"TotoVEVO"}]},"lengthText":{"accessibility":{"label":"4 minutes"},"simpleText":"4:35"},"viewCountText":{"simpleText":"1,012,345 views"}}}{"videoRenderer":{"videoId":"aaaaaaaaaaa","title":{"runs":[{"text":"Other \\"one\\""}]}}}');
  const ok = !!w && w.secs === 275 && w.loud === -4.5 && w.category === 'Music' && w.views === 912345 && w.author === 'TotoVEVO' && sr.length === 2 && sr[0].id === 'FTQbiNvZqaY' && sr[0].secs === 275 && sr[0].views === 1012345 && sr[0].author === 'TotoVEVO' && sr[1].title === 'Other "one"';
  res.json({ ok, watch: w, search: sr }); });
app.get('/api/test/song-vol', async (req, res) => { try { res.json(await songs.volDemo()); } catch (e) { res.status(400).json({ error: e.message }); } }); /* 🧪 (1.132.3) who can change the song volume from chat */
app.get('/api/test/song-search', (req, res) => res.json(songs.searchDemo())); /* 🧪 (1.131.0) the smart search + volume levelling on pretend results */
app.post('/api/songs/search-try', async (req, res) => { /* 🔎 a real YouTube search, ranked the way a !sr would be (nothing is added) */
  try { if (!feat('songs')) throw new Error('Song requests are not part of this edition.'); const q = String(req.body?.q || '').trim().slice(0, 140); if (!q) throw new Error('Type a song to look for.'); const o = songs.opts(), qs = songs.searchQueries(q, o);
    const got = await Promise.all(qs.map(x => ytSearch(x).catch(() => []))), list = songs.pickBest(got.flatMap(l => l.map((r, i) => ({ ...r, rank: i }))), q, o).slice(0, 10);
    res.json({ q, searches: qs, found: got.reduce((a, l) => a + l.length, 0), list }); } catch (e) { res.status(400).json({ error: e.message }); } });
app.get('/api/songs/level', async (req, res) => { /* 🔊 how loud one YouTube video is, and how many times the song volume it should play at */
  const yt = String(req.query.yt || ''); if (!/^[\w-]{11}$/.test(yt)) return res.json({ db: null, gain: 1 });
  let info = null; try { info = await ytInfo(yt); } catch {} const db = info && info.loud != null ? info.loud : null; res.json({ yt, db, gain: songs.levelGain(db) }); });
songs.setHooks({ movieSkip: () => edHas('movies'), note: pstats.note, info: ytInfo, search: ytSearch, on: () => feat('songs'), say: t => twitch.say(t), allowed: (m, perm) => chatbot.allowed(m, perm), title: ytTitle, act: (text, o = {}) => act('chat', text, { icon: '🎵', ...o }), send: (msg, role) => broadcast(msg, role), isBot: l => BOT_NAMES.includes(l) });
const sgTry = fn => async (req, res) => { try { if (!feat('songs')) throw new Error('Song requests are not part of this edition.'); const r = await fn(req.body || {}, req); res.json(r && r.queue ? { state: r } : { ...(r || {}), state: songs.state() }); } catch (e) { res.status(400).json({ error: e.message }); } };
app.get('/api/songs', (req, res) => res.json(feat('songs') ? songs.state({ q: String(req.query.q || ''), sort: String(req.query.sort || 'last') }) : { on: false }));
app.post('/api/songs/add', sgTry(async b => { const r = await songs.request({ login: '', name: String(b.by || '').trim() }, String(b.song || ''), { hand: true }); if (!r.ok) throw new Error(r.why === 'banned' ? 'That song is on your banned list.' : r.why === 'dupe' ? 'That song is already in the queue.' : r.why === 'link' ? 'Only YouTube links (or a song name).' : 'Type a song name or paste a YouTube link.'); return r; }));
app.post('/api/songs/next', sgTry(b => songs.next(b.id)));
app.post('/api/songs/stop', sgTry(() => songs.stop()));
app.post('/api/songs/remove', sgTry(b => songs.remove(b.id)));
app.post('/api/songs/move', sgTry(b => songs.move(b.id, b.dir)));
app.post('/api/songs/clear', sgTry(() => songs.clear()));
app.post('/api/songs/open', sgTry(b => songs.setOpen(!!b.on)));
app.post('/api/songs/rate', sgTry(b => songs.rate(b.key, b.who, b.value)));
app.post('/api/songs/song', sgTry(b => songs.editSong(b.key, b)));
app.post('/api/songs/ban', sgTry(b => (b.user ? songs.banUser(b.user, !b.remove) : b.remove ? songs.unban(b.key) : songs.ban(b))));
app.post('/api/songs/opts', sgTry(b => songs.setOpts(b)));
app.post('/api/songs/playlist', sgTry(b => songs.playlist(b))); // 📻 add / rename / remove one of your YouTube playlists
/* 📋 (1.133.0) Movie watchlist + IMDb ratings (feat movienight): History → 📋 Watchlist, chat !suggest / !rating */
const wlLookup = async (title, year) => { let f; try { f = await omdbFind(title, year); } catch { f = undefined; } if (f) return f; if (f === null) return null;
  try { const l = await searchMovies(title + (year ? ' ' + year : '')); const m = (year && l.find(x => String(x.year) === String(year))) || l[0]; return m ? { title: m.title, year: m.year ? String(m.year) : '', imdb: '' } : null; } catch { return null; } };
watchlist.setHooks({ details: x => omdbDetails(x), linkOk: u => !!listsrc.imdbUserUrl(u), read: u => listsrc.readImdbUser(u), on: () => feat('movienight'), say: t => twitch.say(t), allowed: (m, perm) => chatbot.allowed(m, perm), lookup: wlLookup, act: (text, o = {}) => act('chat', text, { icon: '📋', ...o }), send: (msg, role) => broadcast(msg, role), names: () => (edition_is('birx') ? 'Birx & Jess' : streamerName()) });
const wlTry = fn => wTry(async (b, req) => { if (!feat('movienight')) throw new Error('The movie watchlist is not part of this edition.'); const r = await fn(b, req); return r && r.counts ? { state: r, n: r.n } : { ...(r || {}), state: watchlist.state() }; });
app.get('/api/watchlist', (req, res) => res.json(feat('movienight') ? watchlist.state() : { on: false }));
app.post('/api/watchlist/import', wlTry(b => { const p = watchlist.readFile(String(b.text || ''), ['watch', 'rated'].includes(b.kind) ? b.kind : 'auto'); if (!p.items.length) throw new Error(p.note || "No movies found in that file. Use the Export button on your IMDb watchlist or ratings page."); if (b.dry) return { found: { kind: p.kind, n: p.items.length, note: p.note || '', sample: p.items.slice(0, 5) } }; return { result: watchlist.applyImport(p, { replace: !!b.replace }) }; }));
app.post('/api/watchlist/suggest', wlTry(async b => { const r = await watchlist.suggest({ login: '', name: String(b.by || '').trim() }, String(b.title || ''), { hand: true }); if (!r.ok) throw new Error(r.why === 'rated' ? `Already watched: ${r.movie.title} was rated ${r.movie.rate}/10.` : r.why === 'dupe' ? `${r.movie.title} is already on the watchlist.` : 'Type a movie name first.'); return { movie: r.movie }; }));
app.post('/api/watchlist/edit', wlTry(b => watchlist.edit(b)));
app.post('/api/watchlist/opts', wlTry(b => watchlist.setOpts(b)));
/* 🔎 (1.135.0, Derek: "can you google it to find the answer faster and compare that to the watchlist") Help me pick looks the words up online first (TMDB):
   a name = that actor's / director's films, a subject = movies tagged with it. The watchlist is then matched against those lists, so it works at once
   instead of waiting for every watchlist movie's own actors and plot to come in. */
const wlWebCache = new Map(), WL_GENRES = new Set(['action', 'adventure', 'animation', 'animated', 'comedy', 'crime', 'documentary', 'drama', 'family', 'fantasy', 'history', 'horror', 'music', 'musical', 'mystery', 'romance', 'romantic', 'scifi', 'sci', 'fi', 'thriller', 'war', 'western']);
async function wlWeb(words) {
  if (!(db.settings.tmdbKey || '').trim() || !words.length) return []; const key = words.join(' '), hit = wlWebCache.get(key); if (hit && Date.now() - hit.at < 6 * 3600000) return hit.v;
  const groups = [], mv = l => (l || []).filter(m => m && m.title).map(m => ({ title: m.title, year: String(m.release_date || '').slice(0, 4) })).concat((l || []).filter(m => m && m.original_title && m.original_title !== m.title).map(m => ({ title: m.original_title, year: String(m.release_date || '').slice(0, 4) })));
  let rest = [...words]; const tries = [words.join(' ')]; for (let i = 0; i + 1 < words.length && tries.length < 4; i++) if (words.length > 2) tries.push(words[i] + ' ' + words[i + 1]);
  for (const t of tries) { const tw = t.split(' '); if (tw.every(w => WL_GENRES.has(w))) continue; let p = null;
    try { const r = await tmdbGet('/search/person?query=' + encodeURIComponent(t) + '&include_adult=false'); p = (r.results || []).find(x => { const nw = watchlist.norm(x.name).split(' '); return tw.every(w => nw.includes(w)) && (tw.length >= 2 || nw.length === 1); }) || null; } catch { break; }
    if (!p) continue;
    try { const c = await tmdbGet(`/person/${p.id}/movie_credits`); groups.push({ label: `${p.known_for_department === 'Directing' ? '🎬' : '🎭'} ${p.name}`, words: tw, movies: mv([...(c.cast || []), ...(c.crew || []).filter(x => ['Director', 'Writer', 'Screenplay', 'Producer'].includes(x.job))]) }); rest = rest.filter(w => !tw.includes(w)); } catch {}
    break; }
  for (const w of rest.filter(x => x.length >= 3 && !WL_GENRES.has(x)).slice(0, 3)) { /* a subject: sharks, heist, vampire… */
    try { const k = ((await tmdbGet('/search/keyword?query=' + encodeURIComponent(w))).results || []).filter(x => (' ' + watchlist.norm(x.name) + ' ').includes(' ' + w)).slice(0, 5); if (!k.length) continue; const all = [];
      for (let pg = 1; pg <= 3; pg++) { const d = await tmdbGet(`/discover/movie?with_keywords=${k.map(x => x.id).join('|')}&sort_by=vote_count.desc&include_adult=false&page=${pg}`); all.push(...(d.results || [])); if (pg >= (d.total_pages || 1)) break; }
      if (all.length) groups.push({ label: `🔑 ${w}`, words: [w], movies: mv(all) }); } catch {} }
  wlWebCache.set(key, { at: Date.now(), v: groups }); if (wlWebCache.size > 200) wlWebCache.delete(wlWebCache.keys().next().value); return groups;
}
const WL_FAKE_WEB = [{ label: '🎭 Kurt Russell', words: ['kurt', 'russell'], movies: [{ title: 'The Thing', year: '1982' }, { title: 'Big Trouble in Little China', year: '1986' }, { title: 'Tombstone', year: '1993' }] }];
app.get('/api/watchlist/pick', async (req, res) => { if (!feat('movienight')) return res.json({ list: [], total: 0 }); // 🎲 help me pick: 20 watchlist movies: the ones that fit the words typed, filled up with close ones
  const q = String(req.query.q || ''), words = watchlist.readQuery(q).words; let web = [];
  if (req.query.fake) web = WL_FAKE_WEB.filter(g => g.words.every(w => words.includes(w))); else { try { web = await Promise.race([wlWeb(words), new Promise(r => setTimeout(() => r([]), 7000))]); } catch { web = []; } }
  const r = watchlist.pick(q, { n: Number(req.query.n) || 20, skip: (movienight.data().movies || []).map(m => m.title), web }); res.json({ ...r, key: !!omdbWhere(), tmdb: !!(db.settings.tmdbKey || '').trim() }); if (r.info.have < r.info.all) watchlist.fillInfo(40).catch(() => {}); });
setInterval(() => { if (feat('movienight')) watchlist.fillInfo(40).then(() => watchlist.typeCheck(80)).catch(() => {}); }, 5 * 60000); setTimeout(() => { if (feat('movienight')) watchlist.typeCheck(400).then(() => watchlist.fillInfo(40)).catch(() => {}); }, 90000); /* (actors + plots come in a few at a time, so "help me pick" can search them) */
app.post('/api/watchlist/sync', wlTry(async () => ({ sync: await watchlist.sync('you') }))); // 🔄 read the IMDb watchlist + ratings links again now
setTimeout(() => { try { const o = watchlist.opts(); if (feat('movienight') && o.auto !== false && (o.listUrl || o.ratedUrl)) watchlist.sync('open').then(r => { const bad = [r.list, r.rated].filter(x => x && x.err); if (bad.length) console.error('[watchlist] could not read IMDb on open: ' + bad[0].err); }).catch(() => {}); } catch {} }, 60000); /* 📋 every time the app opens: bring the watchlist + ratings up to date from the IMDb links */
app.get('/api/test/watchlist-read', async (req, res) => { /* 🧪 the IMDb page readers on sample pages (no internet) */
  const page = `<html><script id="__NEXT_DATA__" type="application/json">${JSON.stringify({ props: { pageProps: { mainColumnData: { advancedTitleSearch: { edges: [{ node: { title: { id: 'tt0073195', titleText: { text: 'Jaws' }, releaseYear: { year: 1975 }, titleType: { id: 'movie' } }, userRating: { value: 9, date: '2025-10-31' } } }, { node: { title: { id: 'tt0078748', titleText: { text: 'Alien' }, releaseYear: { year: 1979 }, titleType: { id: 'movie' } }, userRating: { value: 10 } } }] } } } } })}</script><ul><li class="ipc-metadata-list-summary-item"><a href="/title/tt0087363/?ref_=x">3. Gremlins</a><span>1984</span><span class="ipc-rating-star ipc-rating-star--otherUserAlt"><svg></svg><span class="ipc-rating-star--rating">6</span></span></li></ul></html>`;
  const r = listsrc.imdbUserRatings(page), rows = [], add = (what, ok, got) => rows.push({ what, ok: !!ok, got: String(got) });
  add("Ratings from the page's own data", r.get('tt0073195')?.rate === 9 && r.get('tt0078748')?.rate === 10, [...r].map(([k, v]) => k + ' ' + v.rate).join(', '));
  add('A rating from the star on a row', r.get('tt0087363')?.rate === 6, r.get('tt0087363')?.rate);
  { const svg = '<svg class="ipc-icon">' + '<path d="' + 'M12 2l3 7 '.repeat(90) + '"></path></svg>', row2 = `<li class="ipc-metadata-list-summary-item"><a href="/title/tt0084787/?ref_=x" class="ipc-title-link-wrapper">4. The Thing</a><span class="ipc-rating-star ipc-rating-star--base ipc-rating-star--imdb" aria-label="IMDb rating: 8.2">${svg}<span class="ipc-rating-star--rating">8.2</span></span><span class="ipc-rating-star ipc-rating-star--base ipc-rating-star--otherUserAlt">${svg}<span class="ipc-rating-star--rating">9</span></span></li><li class="ipc-metadata-list-summary-item"><a href="/title/tt0088930/?ref_=x">5. Clue</a><span class="ipc-rating-star ipc-rating-star--imdb">${svg}<span class="ipc-rating-star--rating">7.2</span></span><span class="ipc-rating-star ipc-rating-star--somethingNew">${svg}<span class="ipc-rating-star--rating">7</span></span></li>`, r2 = listsrc.imdbUserRatings(`<html><ul>${row2}</ul></html>`);
    add('A star with a long drawing before its number (the real page)', r2.get('tt0084787')?.rate === 9, r2.get('tt0084787')?.rate);
    add("A star style the app hasn't seen: the whole number next to IMDb's score", r2.get('tt0088930')?.rate === 7, r2.get('tt0088930')?.rate); }
  for (const [u, k] of [['https://www.imdb.com/user/ur12345678/watchlist', 'watch'], ['https://m.imdb.com/user/ur12345678/ratings/?ref_=x', 'rated'], ['https://www.imdb.com/list/ls012345678/', 'watch'], ['https://www.imdb.com/user/p.zf4tntyuu3csrlgtldkyqjfcty/watchlist/', 'watch'], ['https://www.imdb.com/user/p.zf4tntyuu3csrlgtldkyqjfcty/ratings/', 'rated']]) add('Link understood: ' + u, listsrc.imdbUserUrl(u)?.kind === k, listsrc.imdbUserUrl(u)?.kind);
  for (const u of ['https://www.imdb.com/title/tt0073195/', 'https://example.com/user/ur1/watchlist', 'jaws']) add('Refused (not a watchlist / ratings link): ' + u, !listsrc.imdbUserUrl(u), listsrc.imdbUserUrl(u) ? 'taken' : 'refused');
  { const pg = n => `<html><ul>${Array.from({ length: n === 3 ? 40 : 250 }, (_, i) => { const id = 'tt' + String(1000000 + (n - 1) * 250 + i); return `<li class="ipc-metadata-list-summary-item"><a href="/title/${id}/?ref_=x" class="ipc-title-link-wrapper"><h3 class="ipc-title__text">${(n - 1) * 250 + i + 1}. Pretend Movie ${(n - 1) * 250 + i + 1}</h3></a><span class="dli-title-metadata-item">1990</span></li>`; }).join('')}</ul></html>`, asked = [];
    const w = await listsrc.imdbUserPages('https://www.imdb.com/user/p.x/watchlist/', 'watch', async (u, n) => { asked.push(n); return pg(n); });
    add('A long watchlist is read page by page (250 + 250 + 40)', w.items.length === 540 && w.pages === 3, `${w.items.length} movies from ${w.pages} pages`);
    const same = await listsrc.imdbUserPages('https://www.imdb.com/user/p.x/watchlist/', 'watch', async () => pg(1));
    add('IMDb giving the same page again stops the reading', same.items.length === 250 && same.pages === 2, `${same.items.length} movies, asked ${same.pages} times`); }
  { const star = n => `<span class="ipc-rating-star ipc-rating-star--base ipc-rating-star--otherUserAlt"><span class="ipc-rating-star--rating">${n}</span></span>`, li = (tt, t, extra, n) => `<li class="ipc-metadata-list-summary-item"><a href="/title/${tt}/?ref_=x" class="ipc-title-link-wrapper"><h3 class="ipc-title__text">${t}</h3></a><span class="dli-title-metadata-item">2002</span>${extra}${star(n)}</li>`;
    const pg = `<html><ul>${li('tt0073195', 'Jaws', '', 9)}${li('tt0100001', 'Who Is the Better Boxer?', '<span class="dli-title-type-data">TV Episode</span>', 8)}${li('tt0100002', 'Who Can Stay Awake the Longest?', '<a href="/title/tt0100009/">Kenny vs. Spenny</a><span>S1.E4</span>', 7)}${li('tt0100003', 'Columbo: Murder by the Book', '<span class="dli-title-type-data">TV Movie</span>', 8)}</ul></html>`;
    const not = listsrc.imdbNotMovies(pg), rd = await listsrc.imdbUserPages('https://www.imdb.com/user/p.x/ratings/', 'rated', async () => pg);
    add('🎬 Movies only: TV episodes on a ratings page are left out (a TV movie stays)', not.has('tt0100001') && not.has('tt0100002') && !not.has('tt0073195') && !not.has('tt0100003') && rd.items.length === 2 && rd.items.every(x => /Jaws|Columbo/.test(x.title)), rd.items.map(x => x.title).join(', ') + ` · ${not.size} left out`);
    const P = { opts: {}, list: [], rated: [{ title: 'Jaws', imdb: 'tt0073195', rate: 9 }, { title: 'Who Is the Better Boxer?', imdb: 'tt0100001', rate: 8 }] };
    const tc = await watchlist.typeCheck(60, P, async ({ imdb }) => ({ type: imdb === 'tt0100001' ? 'episode' : 'movie' }));
    add('🎬 Episodes that already came in are taken out by the look-up check', tc.gone === 1 && P.rated.length === 1 && P.rated[0].title === 'Jaws', `${tc.checked} checked, ${tc.gone} taken out`); }
  { const B = watchlist.BIRX_IMDB, def = watchlist.linkDefaults(), birx = edition_is('birx'); add('Built-in IMDb links (Birx & Jess edition only)', listsrc.imdbUserUrl(B.listUrl) && listsrc.imdbUserUrl(B.ratedUrl) && (birx ? def.listUrl === B.listUrl && def.ratedUrl === B.ratedUrl : !def.listUrl && !def.ratedUrl), birx ? 'filled in for this edition' : 'not in this edition (boxes start empty)'); }
  res.json({ ok: rows.every(x => x.ok), rows });
});
app.get('/api/test/watchlist', async (req, res) => { try { res.json(await watchlist.demo()); } catch (e) { res.status(400).json({ error: e.message }); } });
app.post('/api/test/watchlist', wTry(async b => { /* 🧪 a pretend chatter suggests a movie + asks for a rating (kept as a test row), or the test rows are cleared */
  if (b.action === 'clear') return { cleared: watchlist.clearTests() };
  const o = watchlist.opts(), replies = [], f = t => replies.push(t); twitch.pretend.until = Date.now() + 10 * 60000; twitch.sayListeners.add(f);
  try { for (const t of [`${o.command} ${b.title || 'Pretend Movie About Sharks'}`, `${o.rateCommand} ${b.title || 'Pretend Movie About Sharks'}`]) await twitchHandlers.chat({ login: 'pretend_ash', name: 'Pretend_Ash', text: t, userId: 'p-ash', badges: {}, pretend: true }); await new Promise(r => setTimeout(r, 700)); } finally { twitch.sayListeners.delete(f); }
  return { replies, state: watchlist.state() };
}));
app.get('/api/chatters/common', (req, res) => { // 🙋 (1.132.10) names to suggest while typing who asked for something: who is chatting now first, then your most regular chatters (no bots)
  const seen = new Set(), out = [], add = n => { const k = String(n || '').toLowerCase(); if (!k || seen.has(k) || isChatBot(k) || /^pretend_/.test(k) && !req.query.tests) return; seen.add(k); out.push(n); };
  for (const n of chattersForWheel()) add(n);
  for (const v of Object.values(db.viewers || {}).filter(v => v && v.login && (v.msgs || 0) > 0).sort((a, b) => (b.msgs || 0) - (a.msgs || 0)).slice(0, 150)) add(v.name || v.login);
  res.json({ names: out.slice(0, 160) });
});
app.get('/api/history/music', (req, res) => { if (!feat('songs')) return res.json({ on: false }); res.json({ on: true, ...songs.history() }); }); // 🕰️ History → 🎵 Music
app.get('/api/history/chat', (req, res) => { // 🕰️ History → 💬 Chat stats: who chats and watches the most, and which commands get used
  const skip = new Set([...BOT_NAMES, String(db.twitchBot?.user?.login || '').toLowerCase()].filter(Boolean)), now = new Date(), mk = now.toISOString().slice(0, 7), yk = mk.slice(0, 4);
  const all = Object.values(db.viewers || {}).filter(v => v && v.login && !skip.has(v.login) && (req.query.tests || !/^pretend_/.test(v.login)));
  const row = (v, n) => ({ login: v.login, name: v.name || v.login, n }), top = (f, k = 25) => all.map(v => row(v, f(v))).filter(x => x.n > 0).sort((a, b) => b.n - a.n).slice(0, k);
  const months = []; for (let i = 11; i >= 0; i--) { const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1)), k = d.toISOString().slice(0, 7); months.push({ k, n: all.reduce((a, v) => a + ((v.byMonth || {})[k] || 0), 0), people: all.filter(v => (v.byMonth || {})[k]).length }); }
  const cmds = {}; for (const [login, p] of Object.entries(db.pstats || {})) { if (skip.has(login) || (!req.query.tests && /^pretend_/.test(login))) continue; for (const [c, x] of Object.entries(p.cmd || {})) { const y = (cmds[c] ||= { cmd: c, n: 0, people: 0, last: 0 }); y.n += x.n || 0; y.people++; y.last = Math.max(y.last, x.last || 0); } }
  const sugg = feat('movienight') ? watchlist.suggStats((l, s) => skip.has(l) || (!req.query.tests && (s.test || /^pretend_/.test(l)))) : null;
  res.json({ sugg, people: all.length, msgs: all.reduce((a, v) => a + (v.msgs || 0), 0), month: months[11].n, monthPeople: months[11].people, year: all.reduce((a, v) => a + ((v.byYear || {})[yk] || 0), 0), hours: Math.round(all.reduce((a, v) => a + (v.watchMins || 0) + (v.watchOld || 0), 0) / 60),
    topAll: top(v => v.msgs || 0), topMonth: top(v => (v.byMonth || {})[mk] || 0), topYear: top(v => (v.byYear || {})[yk] || 0), topWatch: top(v => Math.round(((v.watchMins || 0) + (v.watchOld || 0)) / 6) / 10),
    newest: [...all].filter(v => v.first).sort((a, b) => b.first - a.first).slice(0, 15).map(v => ({ login: v.login, name: v.name || v.login, at: v.first })), months, commands: Object.values(cmds).sort((a, b) => b.n - a.n).slice(0, 40) });
});
app.post('/api/songs/playlist-song', sgTry(b => songs.plSong(b))); // ⭐ save a song to (or take it out of) your own saved-songs playlist
app.post('/api/songs/backup', sgTry(b => songs.setBackup(String(b.id || '')))); // 📻 the playlist that plays when no requests are left
app.post('/api/songs/hold', sgTry(b => songs.setHold(String(b.id || '')))); // ⏸ pause the requests and play a playlist ('' = back to requests)
app.post('/api/songs/import', sgTry(b => { // a spreadsheet (.xlsx as base64), a CSV / text file, or pasted lines; kind: songs | banned; dry = only show what was found
  const kind = b.kind === 'banned' ? 'banned' : 'songs', who = Number(b.who) === 1 ? 1 : 0; let p;
  if (b.xlsx) { const all = xlsx.sheets(Buffer.from(String(b.xlsx), 'base64')).filter(sh => sh.rows.length), want = all.filter(sh => (kind === 'banned' ? /ban|black|block/i : /song|queue|rating|list|played|request|sheet/i).test(sh.name)), use = want.length ? want : all.slice(0, 1); p = { songs: [], note: '' }; for (const sh of use) { const t = songs.readTable(sh.rows, kind, undefined, who); p.songs.push(...t.songs); if (t.rym) p.rymNote = t.note; } p.note = `Read as an Excel file (page${use.length === 1 ? '' : 's'}: ${use.map(x => x.name).join(', ')}).`; }
  else p = songs.readText(b.text, kind, undefined, who);
  if (!p.songs.length) throw new Error("I couldn't find any songs in that. A spreadsheet needs a first line naming the columns (Song, Link, " + songs.opts().raters.join(', ') + '…), or paste one song per line.');
  if (b.dry) return { found: p.songs.length, sample: p.songs.slice(0, 12), note: p.note, rym: !!p.rym, albums: p.songs.filter(x => x.album).length, withRatings: p.songs.filter(x => x.rate.some(v => v != null)).length, withLinks: p.songs.filter(x => x.yt).length };
  return { done: songs.applyImport(p, { kind, replace: !!b.replace }), note: p.note };
}));
app.get('/api/songs/export', (req, res) => { if (!feat('songs')) return res.status(400).send('Not part of this edition.'); const x = songs.exportAll(), cell = v => /[",\n]/.test(String(v)) ? '"' + String(v).replace(/"/g, '""') + '"' : String(v), which = req.query.kind === 'banned'; res.setHeader('Content-Type', 'text/csv; charset=utf-8'); res.setHeader('Content-Disposition', `attachment; filename="${which ? 'banned-songs' : 'song-ratings'}.csv"`); res.send('\uFEFF' + (which ? [['Banned song', 'YouTube link'], ...x.banned] : [x.head, ...x.rows]).map(r => r.map(cell).join(',')).join('\r\n')); });
app.post('/api/test/songs', sgTry(async b => {
  if (b.action === 'rules') return songs.demo();
  if (b.action === 'rym') { const p = songs.readText('RYM Album, First Name,Last Name,First Name localized, Last Name localized,Title,Release_Date,Rating,Ownership,Purchase Date,Media Type,Review\n1,"","Toto","","","Toto IV",1982,9,n,,,""\n2,"Daft","Punk","","","Discovery",2001,10,o,,,""\n3,"","Queen","","","A Night at the Opera",1975,7,n,,,""\n4,"","Nobody","","","Never rated",1999,0,w,,,""\n', 'songs', undefined, Number(b.who) === 1 ? 1 : 0); return { found: p.songs.length, note: p.note, sample: p.songs, raters: songs.opts().raters }; } // (a pretend RateYourMusic file: only read, nothing added)
  if (b.action === 'clear') return songs.clearTests();
  if (b.action === 'banhist') { // 🧪 (1.127.0) the Chat tab song box: ⛔ SR off refuses requests, 🚫 Ban on a History row blocks that song, ✅ Unban lets it back (nothing said in chat)
    const rows = [], add = (what, ok) => rows.push({ what, ok: !!ok }), T = 'Pretend History Song ' + Date.now().toString(36), m = { login: 'pretend_amy', name: 'pretend_amy' }, clone = x => JSON.parse(JSON.stringify(x));
    const off = await songs.request(m, T, { test: true, quiet: true, d: { ...clone(songs.data()), open: false } }); add('⛔ SR off: a request is refused (“song requests are closed”)', off.why === 'closed');
    const was = songs.data().banned.length; songs.ban({ title: T }); const key = songs.data().banned[0]?.key, ban1 = await songs.request(m, T, { test: true, quiet: true, d: { ...clone(songs.data()), open: true, queue: [] } });
    add('🚫 Ban: that song is refused from then on', songs.data().banned.length === was + 1 && ban1.ok === false);
    songs.unban(key); add('✅ Unban: it is off the banned list again', songs.data().banned.length === was && !songs.data().banned.some(x => x.key === key));
    return { ok: rows.every(r => r.ok), rows };
  }
  const PRE = ['Pretend Song About Rain', 'Pretend Disco Banger', 'Pretend Slow Ballad', 'Pretend Sea Shanty', 'Pretend Power Anthem', 'Pretend Lo-fi Loop'], who = ['pretend_amy', 'pretend_bob', 'pretend_cat'];
  twitch.pretend.until = Date.now() + 10 * 60000;
  if (b.action === 'fill') { for (let i = 0; i < 4; i++) await songs.request({ login: who[i % 3], name: who[i % 3] }, PRE[i], { test: true, quiet: true }); for (const q of songs.data().queue) if (q.test && songs.data().lib[q.key]) songs.data().lib[q.key].test = true; return songs.next(); }
  const n = PRE[Math.floor(Math.random() * PRE.length)]; twitchHandlers.chat({ login: 'pretend_dj', name: 'Pretend_DJ', text: `${songs.opts().command} ${b.song || n}`, userId: 'pretend-dj', badges: {}, pretend: true }); await new Promise(r => setTimeout(r, 300)); for (const q of songs.data().queue) if (q.login === 'pretend_dj') { q.test = true; if (songs.data().lib[q.key]) songs.data().lib[q.key].test = true; } return { ok: true };
}));
// 🎂 Birthdays (1.96.0, every edition): !bday in chat (never a year), a happy-birthday wish, the list in Settings → 💜 Twitch. See src/birthdays.js
birthdays.setHooks({ pop: async p => { const o = birthdays.opts(), send = x => broadcast({ type: 'bdayPop', ...p, ...x, sound: o.popSound !== false, vol: o.popVol, file: bdaySoundUrl() }, 'control'); if (!p.first) return send({}); if (o.popStream !== false) bdayStreamSound(o.streamVol); let avatar = ''; try { avatar = p.test ? '' : (await Promise.race([twitch.getUsers([p.login]), new Promise(r => setTimeout(() => r(null), 1500))]))?.get?.(p.login)?.avatar || ''; } catch {} send({ avatar }); }, say: t => twitch.say(t), act: (text, o = {}) => act('chat', text, { icon: '🎂', ...o }), changed: () => broadcast({ type: 'birthdays' }, 'control'), isBot: l => BOT_NAMES.includes(l) || l === String(db.twitchBot?.login || '').toLowerCase() });
app.get('/api/birthdays', (req, res) => res.json({ ...birthdays.state(), sound: bdaySoundUrl(), remindOk: feat('bdremind') })); /* (📅 the start-up reminder: an edition extra, Birx & Jess's) */
app.post('/api/birthdays', wTry(b => birthdays.set(b.login, b.day)));
app.post('/api/birthdays/opts', wTry(b => { const r = birthdays.setOpts(b, String(db.movieNight?.opts?.command || '!vote')); broadcast({ type: 'movieNight' }, 'control'); return r; }));
app.post('/api/test/birthday', wTry(b => {
  if (b.action === 'rules') return birthdays.demo();
  if (b.action === 'clear') return birthdays.clearTests();
  const today = birthdays.mmdd(birthdays.dayOf()).replace('-', '/'), name = 'pretend_birthday'; twitch.pretend.until = Date.now() + 10 * 60000; // a pretend viewer whose birthday is today: saves it with the command, then says hi
  if (b.action === 'pop') { birthdays.set(name, today); const d = db.bdays; if (d?.popped) delete d.popped[name]; if (d?.wished) delete d.wished[name]; const say = t => twitchHandlers.chat({ login: name, name: 'Pretend_Birthday', text: t, userId: 'pretend-bday', badges: {}, pretend: true }); say('hey chat, guess what day it is 🥳'); setTimeout(() => say('thanks for the wishes everyone!'), 2500); setTimeout(() => say('this is my second message after the pop-up opened'), 5000); return { ok: true, did: 'pop', today }; }
  if (b.action === 'wish') { birthdays.set(name, today); const d = db.bdays; if (d?.wished) delete d.wished[name]; twitchHandlers.chat({ login: name, name: 'Pretend_Birthday', text: 'hi everyone!', userId: 'pretend-bday', badges: {}, pretend: true }); return { ok: true, did: 'wish', today }; }
  twitchHandlers.chat({ login: name, name: 'Pretend_Birthday', text: `${birthdays.opts().command} ${b.text || today}`, userId: 'pretend-bday', badges: {}, pretend: true }); return { ok: true, did: 'save', state: birthdays.state() };
}));
// 🔐 The lock + the safety check (Settings → 👤 Account & updates → 🔐 Safety & privacy)
const lkTry = (fn, open) => (req, res) => { try { if (!open && !safety.unlocked(req)) throw new Error('Unlock Movie Royal first.'); res.json(fn(req.body || {}, req, res)); } catch (e) { res.status(400).json({ error: e.message }); } };
app.get('/api/lock/state', (req, res) => res.json(safety.state(req)));
app.post('/api/lock/verify', lkTry((b, req, res) => { const r = safety.verify(b.code, res); act('stream', r.backup ? 'Unlocked with a backup code' : 'Unlocked with the authenticator code', { icon: '🔓', kind: 'lock' }); return r; }, true));
app.post('/api/lock/begin', lkTry(() => safety.begin(db.owner?.name || twitch.status.login || '')));
app.post('/api/lock/confirm', lkTry((b, req, res) => { const r = safety.confirm(b.code, res); act('stream', 'Turned the 🔐 lock on', { icon: '🔐', kind: 'lock' }); return r; }));
app.post('/api/lock/lock', lkTry((b, req, res) => safety.lockNow(req, res)));
app.post('/api/lock/mode', lkTry(b => safety.setMode(b.mode)));
app.post('/api/lock/codes', lkTry(b => safety.newCodes(b.code)));
app.post('/api/lock/off', lkTry(b => { const r = safety.turnOff(b.code); act('stream', 'Turned the 🔐 lock off', { icon: '🔓', kind: 'lock' }); return r; }));
function safetyReport(req) {
  const st = db.settings, a = server.address(), using = [];
  const add = (on, name, what) => { if (on) using.push({ name, what }); };
  add(db.owner || twitch.status.userId, 'Twitch', 'your sign-in, chat, channel points, alerts, raids and clips');
  add(st.discordToken, 'Discord', 'your own Discord bot: movie picks and its messages');
  add((() => { try { return cloud.enabled(); } catch { return false; } })(), 'Your Cloudflare account', 'the 24/7 bot: picks, bans and settings it needs (never your passwords or sign-ins)');
  add(st.tmdbKey, 'TMDB', 'movie titles you search for');
  add(st.omdbKey, 'OMDb', 'the movie that won, to get its ratings');
  add(!st.omdbKey && omdbWhere() === 'shared', 'The app maker’s 24/7 bot (shared OMDb key)', 'a movie’s name and year (or IMDb id), to get its IMDb + Rotten Tomatoes ratings: no key and nothing about you');
  add(st.letterboxdUser, 'Letterboxd', 'reads your public watched list');
  add(st.seJwt, 'StreamElements', 'listens for tips'); add(st.slToken, 'Streamlabs', 'listens for tips');
  add(st.obsOn !== false && st.obsPassword, 'OBS on this PC', 'adds and switches sources');
  add(db.kick?.on, 'Kick', 'chat'); add(db.costream?.room, 'Co-stream partner', 'battle state, and your game + camera picture if you turned that on');
  return { local: !safety.lan(), listening: a ? a.address : '', port: PORT, lock: safety.state(req), refused: safety.refused, data: DATA, using };
}
app.get('/api/safety', (req, res) => res.json(safetyReport(req)));
app.get('/api/test/safety', (req, res) => { const t = safety.selfTest(), a = server.address(), onlyHere = !!a && (a.address === '127.0.0.1' || a.address === '::1'); t.rows.unshift({ what: 'The app listens on this PC only', ok: onlyHere || safety.lan(), note: safety.lan() ? 'network access was switched on by hand (ALLOW_LAN)' : '' }); res.json({ ...t, ok: t.ok && (onlyHere || safety.lan()), report: safetyReport(req) }); });
// 🚀 Raid tab (1.95.0; Birx's, Kirb's and Derek's editions): the live channels you follow, the ones you raided most recently first. See src/raids.js
raids.setHooks({
  on: () => feat('raids'), signedIn: () => !!twitch.status.userId, canSee: () => twitch.canSeeFollows(), followed: () => twitch.followedLive(), search: q => twitch.searchLive(q),
  start: id => twitch.startRaid(id), cancel: () => twitch.cancelRaid(), say: t => twitch.say(t), act: (cat, text, o) => act(cat, text, o), changed: () => broadcast({ type: 'raids' }, 'control'),
});
const rdTry = fn => wTry(async (b, req) => { if (!feat('raids')) throw new Error('The Raid tab is not part of this edition.'); return fn(b, req); });
app.get('/api/raids', async (req, res) => { if (!feat('raids')) return res.json({ on: false }); try { res.json(await raids.list({ fresh: req.query.fresh === '1', sort: req.query.sort })); } catch (e) { res.status(400).json({ error: e.message }); } });
if (!db.settings.raidDelay3) { db.settings.raidDelay3 = true; if (!db.settings.raidDelay) db.settings.raidDelay = 180; save(); } /* ⏱️ (1.132.6, Derek) the raid wait starts at 3 minutes (once: a wait of 0 from before becomes 3 min; the slider still goes to 0) */
app.get('/api/raids/search', async (req, res) => { if (!feat('raids')) return res.json({ rows: [] }); try { res.json(await raids.search(req.query.q)); } catch (e) { res.status(400).json({ error: e.message }); } }); // 🔎 live channels by name, followed or not
app.post('/api/raids/go', rdTry(b => raids.plan({ ...b, secs: b.secs != null ? b.secs : (db.settings.raidDelay ?? 180) })));
app.post('/api/raids/delay', rdTry(b => { db.settings.raidDelay = Math.max(0, Math.min(600, Math.round(Number(b.secs) || 0))); save(); return { ok: true, secs: db.settings.raidDelay }; })); /* ⏱️ the slider */
app.post('/api/raids/cancel', rdTry(() => raids.cancel()));
app.post('/api/raids/sort', rdTry(b => ({ ok: true, sort: raids.setSort(b.sort) })));
app.post('/api/raids/forget', rdTry(b => raids.forget(b.login)));
app.post('/api/test/raids', rdTry(b => (b.action === 'sort' ? raids.sortDemo() : raids.pretend(b.action !== 'clear'))));
// 🍿 Movie night voting (1.93.0, Birx & Jess's edition; in Derek's with dev mode on): see src/movienight.js
/* ⭐🍅 a movie's IMDb + Rotten Tomatoes ratings for the movie night leaderboard, by its name (OMDb; undefined = no key yet / couldn't reach it, null = not found) */
async function mnRating(title) {
  const m = /^(.*?)\s*\((\d{4})\)\s*$/.exec(String(title));
  try { return await ratingsByTitle(m ? m[1] : String(title), m ? m[2] : ''); } catch { return undefined; }
}
setInterval(() => { if (feat('movienight')) movienight.fillRatings().catch(() => {}); }, 120000);
const mnTimer = m => { /* ⏳⏰ (1.132.6) the last-call timer pop-up; the bell rings on the stream's vote box when OBS has it, else in the app (never both: no double sound) */
  const obs = [...wss.clients].some(c => c.readyState === 1 && c.role === 'movienight');
  if (m.bell) m = { ...m, kind: movienight.opts().bellKind, file: mnBellUrl() }; /* (1.139.1: which sound rings) */
  broadcast({ type: 'mnTimer', ...m, bell: !!m.bell }, 'movienight'); broadcast({ type: 'mnTimer', ...m, bell: !!m.bell && !obs }, 'control');
};
movienight.setHooks({ bellUrl: () => mnBellUrl(), suggestedBy: t => (feat('movienight') ? watchlist.suggestedBy(t) : ''), timer: mnTimer, rating: t => mnRating(t), note: pstats.note,
  on: () => feat('movienight'), say: t => twitch.say(t), pin: t => twitch.sayAndPin(t), me: () => db.owner?.login || twitch.status.login || '',
  isBot: l => BOT_NAMES.includes(l) || l === String(db.twitchBot?.login || '').toLowerCase(),
  act: (text, o = {}) => act('chat', text, { icon: '🍿', ...o }), send: (msg, role) => broadcast(msg, role),
  info: async (login, userId, test) => { // the voter's Twitch picture + when they followed (pretend voters get a pretend date)
    if (test || /^pretend_/.test(login)) return { avatar: '', followed: Date.now() - (200 + login.length * 37) * 86400000 };
    const u = (await Promise.race([twitch.getUsers([login]).catch(() => new Map()), new Promise(r => setTimeout(() => r(new Map()), 4000))])).get(login);
    let followed; try { followed = await twitch.followedAt(String(userId || u?.id || '').replace(/^k/, '')); } catch {}
    return { avatar: u?.avatar ? proxied(u.avatar) : '', followed };
  },
});
setInterval(() => { try { movienight.tick(); } catch (e) { console.error('[movie night]', e.message); } }, 1000);
const mnTry = fn => wTry(async (b, req) => { if (!feat('movienight')) throw new Error('Movie night voting is not part of this edition.'); const r = await fn(b, req); return r && r.movies ? { state: r } : { ...(r || {}), state: movienight.state() }; });
app.get('/api/movienight', (req, res) => res.json(feat('movienight') ? movienight.state() : { on: false }));
app.get('/api/movienight/history', (req, res) => res.json(feat('movienight') ? movienight.history() : { nights: [] })); /* 🕰️ every movie night (History tab + the leaderboard replay) */
/* 🍿 suggestions while typing a movie (1.115.0): movies from earlier nights first, then TMDB's search (needs the key); fake = the Test tab's pretend answers */
const MN_FAKE = [['Jaws', 1975], ['Jaws 2', 1978], ['Jawbreaker', 1999], ['Jaws: The Revenge', 1987], ['Jack Frost', 1998], ['Jumanji', 1995]];
app.get('/api/movienight/suggest', async (req, res) => {
  try {
    if (!feat('movienight')) return res.status(400).json({ error: 'Movie night voting is not part of this edition.' });
    const q = String(req.query.q || '').trim().toLowerCase(), key = !!String(db.settings.tmdbKey || '').trim(), out = [], seen = new Set();
    const add = (title, year, from) => { const k = String(title).toLowerCase().replace(/\s*\(\d{4}\)\s*$/, '') + '|' + (year || ''); if (!title || seen.has(k) || out.length >= 8) return; seen.add(k); out.push({ title: String(title), year: year || '', from }); };
    if (q.length < 2) return res.json({ list: [], key });
    const st = movienight.state(), tonight = new Set((st.movies || []).map(m => String(m.title).toLowerCase()));
    for (const n of db.movieNight?.past || []) for (const m of n.movies || []) if (String(m.title).toLowerCase().includes(q) && !tonight.has(String(m.title).toLowerCase())) add(m.title, '', 'past');
    out.splice(3);
    if (req.query.fake) for (const [t, y] of MN_FAKE) { if (t.toLowerCase().includes(q)) add(t, y, 'tmdb'); }
    else if (key) { const r = await within(searchMovies(q), 6000, 'TMDB').catch(() => []); for (const m of r) add(m.title, m.year, 'tmdb'); }
    res.json({ list: out, key: key || !!req.query.fake });
  } catch (e) { res.status(400).json({ error: e.message }); }
});
app.post('/api/movienight/ratings', mnTry(async () => { for (const m of movienight.data().movies) m.rateFor = ''; const n = await movienight.fillRatings(); return { looked: n, key: !!omdbWhere() }; })); /* 🔄 look every movie's ratings + poster up again (numbers typed by hand stay) */
app.post('/api/movienight/movies', mnTry(b => 'text' in b || Array.isArray(b.list) ? movienight.setMovies(b.list || b.text) : b.id ? movienight.editMovie(b.id, b) : movienight.addMovie(b.title, b.by)));
app.post('/api/movienight/open', mnTry(b => movienight.open(!!b.on)));
app.post('/api/movienight/lastcall', mnTry(b => movienight.lastCall(b.on !== false, b.mins)));
app.post('/api/movienight/pin', mnTry(() => movienight.pin()));
app.get('/api/test/movienight-pin', (req, res) => res.json(feat('movienight') ? { text: movienight.pinText(), auto: movienight.opts().autoPin !== false } : { error: 'Movie night voting is not part of this edition.' })); /* 🧪 what would be pinned (nothing is sent) */
app.post('/api/movienight/new', mnTry(b => movienight.newNight({ clear: !!b.clear })));
app.post('/api/movienight/guess', mnTry(b => movienight.guess(String(b.id || ''), b.right)));
app.post('/api/movienight/vote', mnTry(b => { const d = movienight.data(), m = movienight.findMovie(String(b.movie || ''), d); if (!m || m.many) throw new Error('Pick a movie from the list (its number works).'); const who = String(b.name || '').trim().replace(/^@/, ''); if (!who) throw new Error('Type who is voting.'); if (!d.open) throw new Error('Open voting first.'); const r = movienight.vote(who, who, m, { via: 'you', quiet: true }); if (!r.ok) throw new Error(r.why === 'same' ? 'They already voted for that one.' : 'They have used their votes and their change.'); return {}; }));
app.post('/api/movienight/people', mnTry(b => b.kind === 'bday' ? movienight.setBirthday(b.name, b.remove ? '' : b.day) : b.kind === 'extra' ? movienight.setExtra(b.name, b.remove ? 0 : b.n) : b.kind === 'raid' ? movienight.setRaider(b.name, !b.remove) : b.kind === 'first' ? movienight.setFirst(b.remove ? '' : b.name) : (() => { throw new Error('bad kind'); })()));
app.post('/api/movienight/opts', mnTry(b => movienight.setOpts(b)));
/** 🚲 (1.139.1, Derek: "for end of 5 min timer use this one… options to change them") the timer's sound: a bicycle bell (built in, the default), the old alarm clock, or your own file (kept with the sound alert files). */
function mnBellUrl() { const f = String(movienight.opts().bellFile || ''); try { return f && fs.existsSync(path.join(SFXDIR, f)) ? '/sfx/' + encodeURIComponent(f) : ''; } catch { return ''; } }
app.get('/api/movienight/bell', (req, res) => { const o = movienight.opts(); res.json({ kind: o.bellKind, file: mnBellUrl() ? o.bellFile : '', url: mnBellUrl(), vol: o.bellVol }); });
app.post('/api/movienight/bell', wTry(b => {
  if (b.remove) movienight.setOpts({ bellFile: '' });
  else if (b.kind) movienight.setOpts({ bellKind: b.kind, bellFile: '' });
  else { let name = String(b.name || '').replace(/[\\/:*?"<>|]/g, '').trim().slice(-100); if (!SFX_OK.test(name)) throw new Error('Pick a sound file (mp3, wav, ogg, m4a, flac, aac or opus).');
    const buf = Buffer.from(String(b.data || '').replace(/^data:[^,]*,/, ''), 'base64'); if (!buf.length) throw new Error('That file is empty.'); if (buf.length > 25e6) throw new Error('That file is too big (25 MB at most).');
    fs.mkdirSync(SFXDIR, { recursive: true }); name = sfxFree(name, buf); fs.writeFileSync(path.join(SFXDIR, name), buf); movienight.setOpts({ bellFile: name }); }
  broadcast({ type: 'movieNight' }, 'control'); const o = movienight.opts(); return { kind: o.bellKind, file: mnBellUrl() ? o.bellFile : '', url: mnBellUrl() };
}));
app.get('/api/test/mn-bell', (req, res) => { /* 🧪 the timer sound choices (your own choice is put back) */
  const o = movienight.opts(), was = { bellKind: o.bellKind, bellFile: o.bellFile || '' }, rows = [], add = (what, ok, got) => rows.push({ what, ok: !!ok, got: String(got) });
  add('The bicycle bell sound is in the app', fs.existsSync(path.join(ROOT, 'public', 'sounds', 'bike-bell.wav')), 'bike-bell.wav');
  movienight.setOpts({ bellKind: 'nonsense', bellFile: '' }); add('The bicycle bell is the default', movienight.opts().bellKind === 'bike' && !mnBellUrl(), movienight.opts().bellKind);
  movienight.setOpts({ bellKind: 'clock' }); add('The old alarm clock can be picked', movienight.opts().bellKind === 'clock', movienight.opts().bellKind);
  movienight.setOpts({ bellFile: 'not-there.mp3' }); add('A file of your own that is gone = the picked bell (never silence)', mnBellUrl() === '', mnBellUrl() || 'the picked bell');
  movienight.setOpts(was); res.json({ ok: rows.every(x => x.ok), rows });
});
app.get('/api/test/movienight-rules', (req, res) => res.json(movienight.rulesDemo()));
app.post('/api/test/movienight', mnTry(async b => { // 🧪 pretend people vote through the pretend chat (nothing is sent to Twitch); 'clear' takes them out again
  const d = movienight.data();
  if (b.action === 'first') { const dd = db.movieNight || {}, keep = [dd.first, dd.firstName], replies = [], f = t => replies.push(t); dd.first = ''; twitch.pretend.until = Date.now() + 10 * 60000; twitch.sayListeners.add(f); try { await twitchHandlers.chat({ login: 'pretend_early', name: 'Pretend_EarlyBird', text: 'first!', userId: 'p-early', badges: {}, pretend: true, force: true }); await new Promise(r => setTimeout(r, 400)); } finally { twitch.sayListeners.delete(f); if (db.movieNight) { db.movieNight.first = keep[0] || ''; db.movieNight.firstName = keep[1] || ''; save(); } } return { ok: true, replies }; } /* 🧪 🥇 who was first: the real one is put back */
  if (b.action === 'switch') { const dd = db.movieNight || (db.movieNight = {}), oo = dd.opts || (dd.opts = {}), keep = oo.enabled, out = [], f = t => out.push(t), o = movienight.opts(), w = watchlist.opts(); const run = async text => { const at = out.length; await twitchHandlers.chat({ login: 'pretend_ana', name: 'pretend_ana', text, userId: 'p-pretend_ana', badges: {}, pretend: true, force: true }); await new Promise(r => setTimeout(r, 350)); return { text, replies: out.slice(at) }; }; oo.enabled = false; twitch.pretend.until = Date.now() + 10 * 60000; twitch.sayListeners.add(f); const rows = []; try { rows.push(await run(`${o.command} 1`)); rows.push(await run(`${w.rateCommand} jaws`)); } finally { twitch.sayListeners.delete(f); if (keep === undefined) delete oo.enabled; else oo.enabled = keep; save(); } return { ok: true, rows, was: keep !== false }; } /* 🧪 voting off for a moment: the vote command stays quiet, the watchlist still answers; the switch is put back */
  if (b.action === 'night') return movienight.testNight(); /* 🕰️ a pretend earlier night for the History tab + replay */
  if (b.action === 'clear') return movienight.clearTests();
  if (b.action === 'fill') { if (d.movies.length) throw new Error('Your list already has movies: this only fills an empty list.'); return movienight.setMovies([{ title: 'Jaws (1975)', by: 'pretend_ana', imdb: 8.1, rt: 97, poster: '/deck/home.png' }, { title: 'Alien (1979)', by: '', imdb: 8.5, rt: 93 }, { title: 'The Thing (1982)', by: 'pretend_bo', imdb: 8.2, rt: 85 }, { title: 'Clue (1985)', by: '', imdb: 7.2, rt: 72 }]); }
  if (!d.movies.length) throw new Error('Add movies first (or press 📋 Fill a pretend list).');
  if (!d.open) await movienight.open(true, { quiet: true });
  if (b.action === 'raid') { movienight.onAlert({ kind: 'raid', login: 'pretend_raider', name: 'pretend_raider' }); return {}; }
  const names = ['pretend_ana', 'pretend_bo', 'pretend_cy', 'pretend_raider', 'pretend_dee'], who = b.name || names[Math.floor(Math.random() * names.length)], n = b.n || 1 + Math.floor(Math.random() * d.movies.length);
  twitch.pretend.until = Date.now() + 600000;
  if (b.action === 'timer') { const secs = Math.max(5, Math.min(60, Number(b.secs) || 12)), o = movienight.opts(); mnTimer({ endsAt: Date.now() + secs * 1000, pop: true, test: true }); setTimeout(() => mnTimer({ endsAt: 0, done: true, bell: o.bell !== false, vol: o.bellVol, pop: true, test: true }), secs * 1000); return { ok: true, secs }; } /* 🧪 a short pretend countdown: nothing is said in chat, voting isn't touched */
  for (const nm of b.action === 'three' ? names.slice(0, 3) : [who]) if (/^pretend_/.test(nm)) delete d.votes[nm]; /* (1.139.2: a pretend voter who already used their vote + change got no pop-up; each test starts them fresh) */
  if (b.action === 'three') { const said = ['', 'this one has to win!!', 'ok fine, changing my mind']; for (let i = 0; i < 3; i++) await twitchHandlers.chat({ login: names[i], name: names[i], text: `${movienight.opts().command} ${1 + ((n - 1 + i) % d.movies.length)} ${said[i]}`.trim(), badges: {}, pretend: true, force: true, userId: 'p-' + names[i] }); return { who: names.slice(0, 3).join(', '), n, offHere: chatCmdOff({ text: movienight.opts().command }) }; } // (three pop-ups, shown one after another in the order they voted)
  await twitchHandlers.chat({ login: who, name: who, text: `${movienight.opts().command} ${n}`, badges: {}, pretend: true, force: true, userId: 'p-' + who });
  return { who, n, offHere: chatCmdOff({ text: movienight.opts().command }) };
}));
app.post('/api/test/edition-look', (req, res) => { // 👀 the dev edition shows the app the way another edition has it: its name, its tabs, its extras, the hidden names, no dev things (until you switch back or restart; nothing is saved or removed)
  if (!EDITION.dev) return res.status(400).json({ error: "Only the dev edition can look like the others." });
  if (String(req.body?.id || '') && !db.settings.betaUpdates) return res.status(400).json({ error: 'Switching editions is a dev mode thing: turn on Dev mode in Settings → Account & updates first.' }); /* (going back to your own is always allowed) */
  const id = edLookAs(String(req.body?.id || '')); brandCache.clear(); lockPage = ''; lockPageFor = id; editionNoMovies(); pushState(); res.json({ ok: true, lookAs: id, off: edOffNow(), app: edAppNow() });
});
// 🧪 what moving from another edition to this one would change (pretend: nothing is saved)
app.post('/api/test/edition-move', (req, res) => { const from = String(req.body?.from || ''); if (!ED_ALL[from]) return res.status(400).json({ error: 'Pick an edition' });
  const pretend = { ...db.settings, updateRepo: ED_ALL[from].repo, spotName: ED_ALL[from].scrub ? 'Wild' : 'Kirb', banAsk: ED_ALL[from].scrub ? 'the streamer' : 'Kirb', testTab: ED_ALL[from].dev ? true : db.settings.testTab };
  res.json({ ok: true, from: ED_ALL[from].name, to: EDITION.name, same: from === EDITION.id, steps: editionMoveSteps(pretend, from).map(x => x.text), last: db.editionMoved || null }); });
app.post('/api/edition/refresh', async (req, res) => { const r = await editionLive('you'); res.json({ ...r, at: edLive.at, changedAt: edLive.changedAt, off: edOffNow().length, from: ED_RAW.replace(/\?.*$/, '') }); }); /* 🔄 read the Editions tab switches from GitHub right now */
app.get('/api/test/edition-live', (req, res) => { /* 🧪 a pretend "switch flipped" on a copy of the lists (nothing is kept): the change is noticed, junk is ignored */
  const L = JSON.parse(JSON.stringify(edLists())), id = EDITION.id, rows = [], add = (what, ok, got) => rows.push({ what, ok: !!ok, got: String(got) });
  const clean = a => (Array.isArray(a) ? a.filter(x => typeof x === 'string' && x.length < 80) : null), same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const flipped = { ...L, [id]: { off: [...L[id].off.filter(x => x !== 'cards'), ...(L[id].off.includes('cards') ? [] : ['cards'])], on: L[id].on } };
  add('A switch flipped on the Editions tab is noticed', !same(flipped[id].off, L[id].off), `${L[id].off.length} → ${flipped[id].off.length} parts off`);
  add('Anything that is not a plain list is ignored', clean('nope') === null && same(clean(['a', 5, {}, 'b']), ['a', 'b']), 'ignored');
  add('A change waits while a battle, the wheel, a song or a vote is going (nothing is interrupted)', typeof edBusy === 'function' && Array.isArray(edBusy()), edBusy().length ? 'busy right now: ' + edBusy().join(', ') : 'nothing going on right now: a change would apply at once');
  add('The app has read the real list from GitHub', edLive.at > 0, edLive.at ? 'last read ' + new Date(edLive.at).toLocaleTimeString() : edLive.error || 'not yet (it reads 8 seconds after opening)');
  res.json({ ok: rows.slice(0, 2).every(x => x.ok), rows, at: edLive.at, error: edLive.error, changedAt: edLive.changedAt });
});
app.get('/api/test/edition', (req, res) => res.json({ ...editionInfo(), updatesFrom: repoName(), devMode: !!db.settings.betaUpdates, testBuilds: wantTests(), version: VERSION }));
app.get('/api/test/mara-prizes', (req, res) => { const l = maraList(); if (!l) return res.status(400).json({ error: 'There is no marathon battle yet (dev mode makes it).' }); res.json({ name: l.name, things: l.entries.filter(e => e.status === 'active').map((e, i) => ({ n: i + 1, label: e.label, sub: e.sub || '', desc: e.desc || '' })), would: maraPrizes(l, true) }); });
// 😱 (1.82.5, Derek: "do it to every screen") once: the scare pop-ups go on every screen
function scareAllOnce() {
  if (db.settings.scareAllScreens) return; db.settings.scareAllScreens = true;
  const m = db.settings.marathon; if (m?.scare) m.scare.where = 'all';
  save();
}
setTimeout(scareAllOnce, 1200);
app.post('/api/mara/add-battle', wTry(b => { // ➕ a fresh copy of Derek's marathon battle (Marathon pool tab), made the marathon battle
  if (!paid.dev()) throw new Error('This is a 🛠️ dev mode feature: turn on Dev mode in Settings → 👤 Account & updates.');
  const l = maraBattleMake(); db.settings.madeMaraBattle = true; (db.settings.paidBattles ||= {}).listId = l.id;
  act('battle', `➕ added a fresh copy of the marathon battle “${l.name}” (${l.entries.length} things)`, { icon: '🏃', who: streamerName(), kind: 'list', list: l.name });
  save(); pushState(); refreshPreview(); return { id: l.id, name: l.name, count: l.entries.length };
}));
// ↕️ (1.80.0, Derek: "edit pool in marathon pool tab") move a thing up / down / to a number: the numbers are what chat types
app.post('/api/mara/move', wTry(b => {
  const l = maraList(); if (!l) throw new Error('Pick your marathon battle first.');
  const on = l.entries.filter(e => e.status === 'active'), e = on.find(x => x.id === b.id); if (!e) throw new Error('That thing is not in the marathon battle.');
  const from = on.indexOf(e), to = Math.max(0, Math.min(on.length - 1, b.to != null ? Math.round(Number(b.to)) - 1 : from + (Number(b.dir) < 0 ? -1 : 1)));
  if (!Number.isFinite(to) || to === from) return { n: from + 1 };
  const target = on[to]; l.entries.splice(l.entries.indexOf(e), 1); const ti = l.entries.indexOf(target); l.entries.splice(to > from ? ti + 1 : ti, 0, e);
  act('battle', `moved “${e.label}” in the marathon battle: #${from + 1} → #${to + 1}`, { icon: '↕️', who: streamerName(), kind: 'entry', list: l.name });
  save(); pushState(); maraCount(true); return { n: to + 1 };
}));
async function maraPicsAuto(force) {
  const l = maraList(); if (!itemLook(l) || !itempics.missing(l, marathon.kindOf)) return { done: [], failed: [] };
  const r = await itempics.fillMissing(l, marathon.kindOf, { force, onEach: () => pushState() });
  if (r.done?.length) { act('battle', `🖼️ Found pictures for ${r.done.length} thing${r.done.length === 1 ? '' : 's'} in “${l.name}”: ${r.done.slice(0, 6).join(', ')}${r.done.length > 6 ? '…' : ''}`, { icon: '🖼️', kind: 'pics' }); refreshPreview(); pushState(); }
  if (r.failed?.length && force) console.error(`[marathon] couldn't find pictures for ${r.failed.length} thing(s): ${r.failed.slice(0, 5).join(', ')}${r.err ? ' (' + r.err + ')' : ''}`);
  return r;
}
setTimeout(() => maraPicsAuto().catch(() => {}), 25000); setInterval(() => maraPicsAuto().catch(() => {}), 5 * 60000);
app.post('/api/mara/pics', wTry(async b => {
  const l = maraList(); if (!l) throw new Error('Pick the marathon battle first (Settings → 💰 → 🎟️ Paid battles).');
  if (!b.id) { const r = await maraPicsAuto(true); return { done: r.done?.length || 0, failed: r.failed?.length || 0, busy: !!r.busy, err: r.err || null }; }
  const e = l.entries.find(x => x.id === b.id); if (!e) throw new Error('That thing is not in the marathon battle.');
  const r = await itempics.findOne(e, { next: !!b.next }); if (r.error) throw new Error(r.error);
  act('battle', `🖼️ ${b.next ? 'Another' : 'A'} picture for “${e.label}” (${r.n} of ${r.of})`, { icon: '🖼️', kind: 'pics' }); refreshPreview(); pushState(); return r;
}));
app.post('/api/mara/entry', wTry(b => { // 🏋️ thing or workout + ⏱️ timer seconds, by hand (Marathon pool)
  const l = maraList(), e = l?.entries.find(x => x.id === b.id); if (!e) throw new Error('That thing is not in the marathon battle.');
  if ('mk' in b) { if (b.mk === 'thing' || b.mk === 'workout') e.mk = b.mk; else delete e.mk; }
  if ('mSecs' in b) { if (b.mSecs === '' || b.mSecs == null) delete e.mSecs; else e.mSecs = Math.max(0, Math.min(7200, Math.round(Number(b.mSecs) || 0))); }
  if ('rest' in b) { if (b.rest) e.restAfterWin = true; else { delete e.restAfterWin; delete e.restNext; } } // 😴 sits out the battle after it wins
  if ('restNow' in b) { if (b.restNow) e.restNext = true; else delete e.restNext; }
  if ('desc' in b) { const t = String(b.desc || '').trim().slice(0, 600); if (t) e.desc = t; else delete e.desc; } /* 🎁 the prize description (shown on the winner card) */
  save(); refreshPreview(); pushState(); return { kind: marathon.kindOf(e), secs: marathon.secsOf(e), rest: !!e.restAfterWin, restNext: !!e.restNext };
}));
// 🧪 🍀 a luck pick goes on only at ▶ Run (pretend battle, everything put back)
app.post('/api/test/mara-luck-start', wTry(() => {
  const l = maraList(), e = l?.entries.find(x => x.status === 'active'); if (!e) throw new Error('No marathon battle yet.');
  const was = e.vLuck || 0, it = { id: 'test-' + uid(), who: 'Test_Viewer', login: 'test_viewer', luck: e.id, test: true };
  const st = marathon.atStart(it, () => maraRandomMap()), run = e.vLuck || 0; st.undo(); const cancel = e.vLuck || 0;
  return { label: e.label, picked: was, run, cancel, ok: run > was && cancel === was };
}));
// 🧪 😴 what happens after a thing that rests wins (nothing saved): the next battle without it, the one after with it
app.post('/api/test/mara-rest', wTry(async b => {
  const l = maraList(); if (!l) throw new Error('No marathon battle yet.');
  const e = l.entries.find(x => x.id === b.id) || l.entries.find(x => x.restAfterWin && x.status === 'active') || l.entries.find(x => /mercy/i.test(x.label));
  if (!e) throw new Error('No thing to try it with.');
  const keep = { rest: e.restAfterWin, next: e.restNext };
  try {
    e.restAfterWin = true; e.restNext = true; const a = (await buildFighters(l)).fighters.some(f => f.id === e.id);
    delete e.restNext; const c = (await buildFighters(l)).fighters.some(f => f.id === e.id);
    return { label: e.label, rests: !!keep.rest, nextBattle: a, afterThat: c, ok: !a && c };
  } finally { if (keep.rest) e.restAfterWin = true; else delete e.restAfterWin; if (keep.next) e.restNext = true; else delete e.restNext; }
}));
app.post('/api/mara/guess/now', wTry(async () => { if (!live.maraGuess) throw new Error('Chat isn\'t guessing right now.'); await maraGuessEnd(); return {}; }));
app.post('/api/mara/guess/cancel', wTry(async () => { if (!live.maraGuess) throw new Error('Chat isn\'t guessing right now.'); await maraGuessEnd(true); return {}; }));
app.post('/api/test/mara-guess', wTry(b => { if (!live.maraGuess) throw new Error('Press ▶ Run on a battle first (chat guesses before it starts).'); const n = Number(b.n) || 1, name = String(b.name || 'Test_Guesser'); return { took: maraGuessChat({ login: name.toLowerCase(), name, text: String(n) }), count: live.maraGuess.guesses.length }; }));
// 🏃 Marathon (1.76.0)
// 😱 (1.82.3, Derek: "make the scare pop-ups pop up on whatever screen I am focused on so it will scare me. I might be in game")
// The StreamElements jump-scare alerts play on stream / the phone; this plays the same scare in a see-through window on top of
// whatever you're using (the screen your mouse is on, or every screen). Same small / medium / big rules as the alerts' defaults.
const SCARE_DEF = { on: true, where: 'all', sound: false, vol: 70, flash: true, kinds: { follow: true, sub: true, gift: true, bits: true, tip: true, raid: true }, bitsMed: 500, bitsBig: 2500, tipMed: 5, tipBig: 25, giftMed: 2, giftBig: 10, raidMed: 10, raidBig: 50 };
function scareCfg() { const c = { ...SCARE_DEF, ...(db.settings.marathon?.scare || {}) }; c.kinds = { ...SCARE_DEF.kinds, ...(c.kinds || {}) }; return c; }
function scareJob(a) {
  const c = scareCfg(), n = Number(a.amount) || 0, nm = a.name || 'Someone', lv = (v, m, b) => v >= b ? 3 : v >= m ? 2 : 1;
  const money = v => (a.currency && a.currency !== 'USD' ? '' : '$') + (Math.round(v * 100) / 100) + (a.currency && a.currency !== 'USD' ? ' ' + a.currency : '');
  switch (a.kind) {
    case 'follow': return { lvl: 1, label: 'New follower', line: nm, plate: 'FOLLOW' };
    case 'sub': { const t3 = /tier 3/i.test(a.text || ''); return { lvl: t3 ? 3 : 2, label: t3 ? 'Tier 3 sub!' : 'New subscriber', line: nm, sub: n > 1 ? `${n} months` : '', plate: n > 1 ? `${n} MO` : 'SUB' }; }
    case 'gift': return n > 1 ? { lvl: lv(n, c.giftMed, c.giftBig), label: 'Gift bomb!', line: nm, sub: `gifted ${n} subs`, plate: `${n} SUBS` } : { lvl: 2, label: 'Gift sub', line: nm, sub: String(a.text || 'gifted a sub').slice(0, 60), plate: 'GIFT' };
    case 'bits': return { lvl: lv(n, c.bitsMed, c.bitsBig), label: 'Bits!', line: nm, sub: `${n} bits`, plate: `${n} BITS` };
    case 'tip': return { lvl: lv(n, c.tipMed, c.tipBig), label: 'Tip!', line: nm, sub: money(n), plate: money(n) };
    case 'raid': return { lvl: lv(n, c.raidMed, c.raidBig), label: 'Raid!', line: nm, sub: `raiding with ${n} viewer${n === 1 ? '' : 's'}`, plate: 'RAID' };
  }
  return null;
}
const scareQ = []; let scareBusy = false;
function scareFor(a, force) {
  const c = scareCfg();
  if (!force && (!paid.dev() || !c.on || !c.kinds[a.kind])) return null;
  const j = scareJob(a); if (!j) return null;
  if (!globalThis.__desktop?.scarePop) return { ...j, noDesktop: true };
  scareQ.push(j); if (scareQ.length > 12) scareQ.splice(0, scareQ.length - 12);
  scareNext(); return j;
}
function scareNext() {
  if (scareBusy || !scareQ.length) return;
  const j = scareQ.shift(), c = scareCfg(); scareBusy = true;
  const msg = { ...j, vol: c.sound ? Math.max(0, Math.min(100, Number(c.vol) || 0)) : 0, flash: c.flash !== false, shake: true, pos: 'bottom' };
  try { globalThis.__desktop.scarePop(`http://127.0.0.1:${PORT}/scare.html#${encodeURIComponent(JSON.stringify(msg))}`, c.where === 'all' ? 'all' : 'mouse', 12500); } catch (e) { console.error('[scare pop-up]', e.message); }
  setTimeout(() => { scareBusy = false; scareNext(); }, 12800); // one at a time, like the alerts
}
app.post('/api/mara/scare', wTry(b => {
  if (!paid.dev()) throw new Error('The scare pop-ups are a 🛠️ dev mode feature.');
  const c = { ...(db.settings.marathon?.scare || {}) };
  for (const k of ['on', 'sound', 'flash']) if (typeof b[k] === 'boolean') c[k] = b[k];
  if (['mouse', 'all'].includes(b.where)) c.where = b.where;
  if (b.vol != null) c.vol = Math.max(0, Math.min(100, Math.round(Number(b.vol) || 0)));
  if (b.kinds && typeof b.kinds === 'object') { c.kinds = { ...scareCfg().kinds }; for (const k of Object.keys(SCARE_DEF.kinds)) if (typeof b.kinds[k] === 'boolean') c.kinds[k] = b.kinds[k]; }
  for (const k of ['bitsMed', 'bitsBig', 'tipMed', 'tipBig', 'giftMed', 'giftBig', 'raidMed', 'raidBig']) if (b[k] != null && Number(b[k]) >= 0) c[k] = Number(b[k]);
  db.settings.marathon = { ...(db.settings.marathon || {}), scare: c }; save(); pushState(); return scareCfg();
}));
// 🧪 a real pop-up on your screen (lvl 1 / 2 / 3), or {kind, amount} = what that alert would do
app.post('/api/test/scare-pop', wTry(b => {
  if (!paid.dev()) throw new Error('The scare pop-ups are a 🛠️ dev mode feature.');
  const a = b.kind ? { kind: b.kind, name: 'TestViewer', amount: b.amount, text: b.text || '' } : { kind: ['follow', 'sub', 'tip'][(Number(b.lvl) || 1) - 1] || 'follow', name: 'TestViewer', amount: [0, 1, 50][(Number(b.lvl) || 1) - 1], text: '' };
  const j = b.dry ? scareJob(a) : scareFor(a, true);
  return { job: j, desktop: !!globalThis.__desktop?.scarePop, queued: scareQ.length };
}));
// 🎙️ (1.82.7, Derek: "for my PC setup I use my GoXLR, for cooking streams wireless mics" + picked auto switch, USB receiver)
// In the marathon scenes: going to 🍳 Cooking mutes the PC mics that were on (GoXLR) and turns the wireless mics on; leaving
// it turns the wireless mics off and puts back exactly the mics it muted. Scenes from your normal setup are left alone.
const micCfg = () => ({ auto: true, pc: null, ...(db.settings.marathon?.mics || {}) });
const micLive = { mode: null, at: 0, err: null };
const micState = () => ({ ...micCfg(), mode: micLive.mode, at: micLive.at, err: micLive.err, watching: obs.watching() });
function micModeFor(scene) { const S = obs.MARA_SCENES; return scene === S.cook ? 'cook' : (Object.values(S).includes(scene) || scene === obs.CO_SCENE) ? 'pc' : null; }
async function micPlan(mode, inputs) { // → {mute, unmute} (names)
  const c = micCfg(), names = inputs.map(i => i.name), cook = names.includes(obs.COOK_MIC) ? [obs.COOK_MIC] : [];
  const pcAll = Array.isArray(c.pc) && c.pc.length ? c.pc.filter(n => names.includes(n)) : names.filter(n => n !== obs.COOK_MIC && (!db.settings.obsMic || n === db.settings.obsMic));
  if (mode === 'cook') return { mute: pcAll.filter(n => inputs.find(i => i.name === n)?.muted === false), unmute: cook };
  const back = (db.micMuted || []).filter(n => names.includes(n));
  return { mute: cook, unmute: back.length ? back : [] };
}
async function micApply(mode, why) {
  const { inputs } = await obs.audioInputs(), plan = await micPlan(mode, inputs);
  const done = await obs.setMutes(plan.mute, plan.unmute);
  if (mode === 'cook') db.micMuted = [...new Set([...(db.micMuted || []), ...done.muted])]; else db.micMuted = [];
  save(); micLive.mode = mode; micLive.at = Date.now(); micLive.err = null;
  const txt = mode === 'cook' ? `🍳 Cooking mics on${done.muted.length ? `, ${done.muted.join(', ')} muted` : ''}` : `🎙️ PC mic back on${done.unmuted.length ? ` (${done.unmuted.join(', ')})` : ''}${done.muted.length ? `, wireless mics off` : ''}`;
  act('stream', `${txt}${why ? ` (${why})` : ''}`, { icon: '🎙️', kind: 'mics' });
  broadcast({ type: 'toast', text: '🎙️ ' + hEsc(txt) }, 'control'); pushState();
  return { mode, ...done };
}
let micWatchOn = false;
function micWatch() {
  const want = paid.dev() && micCfg().auto !== false && !!db.settings.marathon?.obsSetup?.madeAt && db.settings.obsOn !== false;
  if (want && !micWatchOn) { micWatchOn = true; obs.watchScenes((scene, first) => { const m = micModeFor(scene); if (!m || (first && m === 'pc' && !(db.micMuted || []).length) || m === micLive.mode && !first) return; micApply(m, first ? 'OBS was already on ' + scene : 'switched to ' + scene).catch(e => { micLive.err = e.message; }); }); }
  else if (!want && micWatchOn) { micWatchOn = false; obs.stopWatch(); }
}
setTimeout(micWatch, 5000); setInterval(micWatch, 60000);
// 🗣️ (1.82.3, Derek: "a stop button on the marathon battle tab to mute tts or skip tts") the TTS lives in the StreamElements
// jump-scare alerts (they read tips / bits / the 500-point reward). Movie Royal can't reach that widget directly, so the
// buttons type the widget's chat commands as you (no name tag): every copy of the overlay (OBS + the phone) hears them.
const TTS_DEF = { skip: '!skiptts', off: '!ttsoff', on: '!ttson', muted: false };
function ttsCfg() { const t = { ...TTS_DEF, ...(db.settings.marathon?.tts || {}) }; for (const k of ['skip', 'off', 'on']) t[k] = String(t[k] || TTS_DEF[k]).trim().slice(0, 40) || TTS_DEF[k]; return t; }
function ttsSave(o) { db.settings.marathon = { ...(db.settings.marathon || {}), tts: { ...ttsCfg(), ...o } }; save(); pushState(); }
app.post('/api/mara/tts', wTry(async b => {
  if (!paid.dev()) throw new Error('The TTS buttons are a 🛠️ dev mode feature.');
  const c = ttsCfg();
  if (b.cmd === 'words') { const o = {}; for (const k of ['skip', 'off', 'on']) if (typeof b[k] === 'string' && b[k].trim()) o[k] = b[k].trim().slice(0, 40); ttsSave(o); return ttsCfg(); }
  const said = b.cmd === 'skip' ? c.skip : b.cmd === 'mute' ? c.off : b.cmd === 'unmute' ? c.on : null;
  if (!said) throw new Error('Pick skip, mute or unmute.');
  if (!b.test) await twitch.sayAsMe(said);
  if (b.cmd !== 'skip') ttsSave({ muted: b.cmd === 'mute' });
  act('chat', b.cmd === 'skip' ? 'skipped the text to speech that was talking' : b.cmd === 'mute' ? 'muted text to speech' : 'turned text to speech back on', { icon: b.cmd === 'skip' ? '⏭️' : b.cmd === 'mute' ? '🔇' : '🔊', who: streamerName(), kind: 'tts', test: !!b.test });
  return { ...ttsCfg(), said, test: !!b.test };
}));
// 🧪 test: what the buttons would type, nothing sent
app.get('/api/test/mara-tts', wTry(() => { const c = ttsCfg(); return { skip: c.skip, mute: c.off, unmute: c.on, muted: c.muted, canChat: !!twitch.status?.canChat }; }));
// 🔈 (1.83.0, Derek: "tts for all chat on and off… only so I hear it, not chat"; separate from the tip / channel point TTS and
// never reads those) src/chatvoice.js + desktop/main.cjs chatVoice + public/chatvoice.html (a hidden window that plays it).
chatvoice.setHooks({ broadcast, pushState, isBot: l => isChatBot(l), dev: () => paid.dev(), act });
setTimeout(() => chatvoice.ensurePlayer(), 4000);
app.post('/api/mara/chatvoice', wTry(async b => {
  if (!paid.dev()) throw new Error('Reading chat out loud is a 🛠️ dev mode feature.');
  if (b.skip) { chatvoice.skip(); return chatvoice.state(); }
  if (b.clear) { chatvoice.stop(); return chatvoice.state(); }
  if (b.test) { const c = chatvoice.cfg(); chatvoice.ensurePlayer(); chatvoice.test(c.names ? `${chatvoice.spokenName(streamerName())}: This is how chat sounds. Only you can hear this.` : 'This is how chat sounds. Only you can hear this.'); return chatvoice.state(); }
  const o = { ...b }; delete o.skip; delete o.clear; delete o.test;
  const was = chatvoice.cfg().on, c = chatvoice.setCfg(o);
  if ('on' in o && c.on !== was) act('chat', c.on ? 'turned on 🔈 reading chat out loud (only you hear it)' : 'turned off 🔈 reading chat out loud', { icon: '🔈', who: streamerName(), kind: 'chatvoice' });
  if (o.on || o.voice != null) chatvoice.loadVoices().then(() => pushState());
  return chatvoice.state();
}));
// 🧪 what the chat voice would say for a pretend message (or why it'd skip it). say:true = read it out too
app.post('/api/test/chatvoice', wTry(b => {
  const m = { login: 'pretend_viewer', name: b.name || 'Pretend_Viewer42', text: String(b.text || ''), emotes: b.emotes || '', bits: b.kind === 'bits' ? 100 : 0, reward: b.kind === 'reward' ? 'test-reward' : null, paidMsg: b.kind === 'highlight', badges: { broadcaster: b.kind === 'me' } };
  const c = chatvoice.cfg(), skip = chatvoice.skipWhy(m, c), say = skip ? '' : chatvoice.words(m, c);
  if (b.say && say) { chatvoice.ensurePlayer(); chatvoice.test(say); }
  return { skip, say, on: chatvoice.on() };
}));
// 🛡️ (1.83.0, Derek: "auto ban any bots that come into my chat trying to sell something") src/spamban.js: first messages that
// sell viewers / followers / promotion / art with a way to buy → banned (or timed out / deleted), logged, undo = Unban.
const spamBusy = new Set();
function spamCheck(m) {
  const k = String(m.login || '').toLowerCase(); if (!k) return false;
  const seen = (db.viewers?.[k]?.msgs || 0) > 0 || live.chatLog.some(x => x.login === m.login);
  const why = spamban.check(m, seen); if (!why) return false;
  if (spamBusy.has(k)) return true; spamBusy.add(k); setTimeout(() => spamBusy.delete(k), 60000);
  const c = spamban.cfg(), name = m.name || m.login;
  (async () => {
    let done = c.action, err = null;
    if (m.pretend) done = 'test'; // (🧪 pretend chat: nothing is sent to Twitch)
    else try {
      if (c.action === 'delete') { if (m.id) await twitch.deleteMessage(m.id); }
      else { if (m.id) await twitch.deleteMessage(m.id).catch(() => {}); await twitch.timeout(m.login, c.action === 'timeout' ? 86400 : 0, `Movie Royal: spam bot (${why})`); }
    } catch (e) { err = e.message; done = 'failed'; }
    if (!m.pretend) spamban.remember({ login: k, name, text: String(m.text || '').slice(0, 300), why, action: done, err });
    try { chatvoice.clear({ login: k }); } catch {}
    act('chat', err ? `looks like a spam bot (${why}) but couldn't be removed: ${err}` : done === 'test' ? `would be ${c.action === 'ban' ? 'banned' : c.action === 'timeout' ? 'timed out' : 'deleted'} as a 🛡️ spam bot (${why}) (pretend chat: nothing sent)` : `was ${done === 'ban' ? 'banned' : done === 'timeout' ? 'timed out for a day' : 'deleted'} as a 🛡️ spam bot (${why})`, { icon: '🛡️', who: name, kind: 'spam', test: done === 'test' });
    broadcast({ type: 'toast', text: done === 'test' ? `🧪🛡️ Pretend chat: <b>${hEsc(name)}</b> would be ${c.action === 'ban' ? 'banned' : c.action === 'timeout' ? 'timed out' : 'deleted'} as a spam bot (${hEsc(why)}). Nothing was sent to Twitch.` : err ? `🛡️ <b>${hEsc(name)}</b> looks like a spam bot, but Movie Royal couldn't ${c.action === 'delete' ? 'delete it' : 'ban them'}: ${hEsc(err)}` : `🛡️ ${done === 'ban' ? 'Banned' : done === 'timeout' ? 'Timed out' : 'Deleted'} spam bot <b>${hEsc(name)}</b> (${hEsc(why)}). Undo: Settings → Twitch → 🛡️ Spam bots.` }, 'control');
    pushState();
  })();
  return true;
}
app.post('/api/spam', wTry(b => { const c = spamban.setCfg(b || {}); pushState(); return c; }));
app.post('/api/spam/unban', wTry(async b => {
  const k = String(b.login || '').toLowerCase(); if (!k) throw new Error('Who?');
  const r = spamban.list().find(x => x.login === k);
  if (r && (r.action === 'ban' || r.action === 'timeout')) await twitch.unban(k);
  spamban.forget(k); act('chat', 'was unbanned (it wasn\'t a spam bot after all)', { icon: '🛡️', who: r?.name || k, kind: 'spam' }); pushState(); return { ok: true };
}));
// 🧪 is this line a spam bot? (nothing is banned) + every sample line checked
// ---------- 🤖 Chat bot (1.89.0, dev mode only): your own commands, timers, quotes + import ----------
const BOT_RESERVED = ['!join', '!leave', '!mymovies', '!moviesroyal', '!respin', '!myspins', '!spins', '!call', '!id', '!clip', '!vote', '!enter', '!up', '!down', '!map', '!luck', '!command', '!commands', '!addcom', '!editcom', '!delcom', '!quote', '!addquote', '!delquote'];
chatbot.setHooks({
  say: t => twitch.say(t), canSay: () => twitch.canSay(), follows: m => twitch.followedAt(m.userId),
  live: () => !!db.live || !!live.fakeLive, startedAt: () => db.stream?.startedAt || 0, channel: () => db.owner?.login || twitch.status.login || '',
  chatters: () => [...new Set(live.chatLog.slice(-60).map(x => x.name || x.login))], dev: () => true, /* 🤖 every edition since 1.108.0 (Derek: "the chatbot tab should be on all editions") */
  reserved: () => [...new Set([...BOT_RESERVED, ...Object.entries(db.settings).filter(([k, v]) => /Command$/.test(k) && typeof v === 'string').map(([, v]) => v.trim().toLowerCase())])],
  changed: () => broadcast({ type: 'chatbot' }, 'control'),
  sound: (file, vol) => sfxPlay(file, vol), soundIn: from => sfxTake(from),
  shoutout: async (name, m) => (await shoutOut(name, 'chat', !!m?.pretend, { say: false, by: m?.name || m?.login || '' })).line, /* 📣 (1.128.0) !so: the bot's answer is the shout-out line; the Twitch box is tried too */
  watchTime: login => { const v = db.viewers?.[String(login || '').toLowerCase()]; return v ? (v.watchMins || 0) + (v.watchOld || 0) : null; }, /* (watchOld = hours brought over from Streamlabs Chatbot) */
  followAge: async (login, m) => { if (m?.pretend) return m.follows === false ? null : Date.now() - 432 * 864e5; /* (🧪 pretend chat: a pretend follow date) */ let id = m?.userId || db.viewers?.[login]?.id; if (!id && !m) { try { id = (await twitch.getUsers([login])).get(login)?.id; } catch {} } if (!id) return undefined; return twitch.followedAt(id); }
});
// 🔊 Sound alerts (1.98.0, Derek: Birx's Streamlabs "SFX"): a chat bot command can play a sound file. Files live in the data folder (sounds/sfx).
// Where it plays: a 🔊 soundboard page in OBS if you added one, else the battle screen in OBS, else the app itself.
const SFXDIR = path.join(DATA, 'sounds', 'sfx'); try { fs.mkdirSync(SFXDIR, { recursive: true }); } catch {}
app.use('/sfx', express.static(SFXDIR));
const sfxName = n => String(n || 'sound').replace(/^.*[\\/]/, '').replace(/[^\w.\- ]+/g, '_').slice(-80) || 'sound.mp3';
const SFX_OK = /\.(mp3|wav|ogg|m4a|flac|aac|opus)$/i;
const sfxFree = (name, buf) => { const f = path.join(SFXDIR, name); try { if (!fs.existsSync(f) || fs.readFileSync(f).equals(buf)) return name; } catch {} return crypto.createHash('sha1').update(buf).digest('hex').slice(0, 6) + '-' + name; }; /* (two different sounds with the same file name: the second one gets its own name) */
function sfxTake(from) { // (import: the old bot's sound file is on this same PC → copy it in; not there → the command says so until you pick the file)
  try { from = String(from || '').trim().replace(/^"|"$/g, ''); if (!SFX_OK.test(from) || !fs.existsSync(from)) return null; const st = fs.statSync(from); if (!st.isFile() || st.size > 25e6) return null; const buf = fs.readFileSync(from), name = sfxFree(sfxName(from), buf); fs.writeFileSync(path.join(SFXDIR, name), buf); return name; } catch { return null; }
}
/* 🔎 (1.128.0, Derek: "is there a way the app remembers where the sound files are from the Streamlabs bot") Streamlabs Chatbot keeps each sound's place only in its locked
   storage, so the app can't read it. Instead it REMEMBERS the folders the sounds were found in (settings.sfxFolders) and looks there first; it can also search this PC's
   usual folders (Documents, Music, Downloads, Desktop, Videos, OneDrive) for files named like the alerts that still need one. Every sound it finds is copied in, so it
   works even if the old folder moves later. */
const sndKeyS = n => String(n || '').replace(/^.*[\\/]/, '').replace(/\.[a-z0-9]{2,5}$/i, '').replace(/^[!?.$~+\-]/, '').toLowerCase().replace(/[^a-z0-9]+/g, '');
function sfxSearchRoots() { const h = os.homedir(), L = ['Documents', 'Music', 'Downloads', 'Desktop', 'Videos', 'OneDrive', path.join('OneDrive', 'Documents'), path.join('OneDrive', 'Desktop'), path.join('AppData', 'Roaming', 'Streamlabs')]; return L.map(x => path.join(h, x)); }
const sfxFindRun = { running: false, last: null };
async function sfxWalk(roots, want, { maxFiles = 40000, depth = 6 } = {}) {
  const got = new Map(), seen = new Set(); let n = 0;
  const walk = async (dir, d) => {
    if (d > depth || n > maxFiles || got.size >= want.size || seen.has(dir)) return; seen.add(dir);
    let ents; try { ents = await fs.promises.readdir(dir, { withFileTypes: true }); } catch { return; }
    for (const e of ents) {
      if (++n > maxFiles || got.size >= want.size) return; const p = path.join(dir, e.name);
      if (e.isDirectory()) { if (!/^(\.|node_modules$|\$|System Volume|Windows$|Program Files|AppData$|Movie Royal$)/i.test(e.name)) await walk(p, d + 1); }
      else if (SFX_OK.test(e.name)) { const k = sndKeyS(e.name); if (want.has(k) && !got.has(k)) got.set(k, p); }
    }
  };
  for (const r of roots) { if (got.size >= want.size) break; await walk(r, 0); }
  return got;
}
/** find files for the sound alerts that still need one: in the remembered folders (+ a folder just picked), and with search: true this PC's usual folders */
async function sfxFind({ search = false, folder = '', why = 'button' } = {}) {
  if (sfxFindRun.running) return { busy: true };
  const cmds = chatbot.data().commands.filter(c => !c.sound && (c.soundMissing || c.soundOnly)); const want = new Map();
  for (const c of cmds) { const k = sndKeyS(c.soundMissing) || sndKeyS(c.name); if (k && !want.has(k)) want.set(k, c); const k2 = sndKeyS(c.name); if (k2 && !want.has(k2)) want.set(k2, c); }
  const saved = (db.settings.sfxFolders || []).filter(Boolean);
  if (folder) { db.settings.sfxFolders = [...new Set([folder, ...saved])].slice(0, 12); save(); }
  if (!want.size) { sfxFindRun.last = { at: Date.now(), found: 0, left: 0, why }; return { found: 0, left: 0, folders: db.settings.sfxFolders || [] }; }
  sfxFindRun.running = true;
  try {
    const roots = [...new Set([folder, ...saved, ...(search ? sfxSearchRoots() : [])].filter(Boolean))].filter(r => { try { return fs.statSync(r).isDirectory(); } catch { return false; } });
    const hit = await sfxWalk(roots, want), names = [], dirs = new Set();
    for (const c of cmds) {
      if (c.sound) continue; const p = hit.get(sndKeyS(c.soundMissing)) || hit.get(sndKeyS(c.name)); if (!p) continue;
      const got = sfxTake(p); if (!got) continue; c.sound = got; delete c.soundMissing; names.push(c.name); dirs.add(path.dirname(p));
    }
    if (dirs.size) db.settings.sfxFolders = [...new Set([...(db.settings.sfxFolders || []), ...dirs])].slice(0, 12);
    const left = chatbot.data().commands.filter(c => !c.sound && c.soundMissing).length;
    save(); if (names.length) { broadcast({ type: 'chatbot' }, 'control'); sfxSoon(); act('chat', `Found ${names.length} sound file${names.length === 1 ? '' : 's'} for the sound alerts on this PC (${names.slice(0, 6).join(', ')}${names.length > 6 ? '…' : ''})`, { icon: '🔎', kind: 'sfx' }); if (why !== 'button') broadcast({ type: 'toast', text: `🔎 Found ${names.length} sound file${names.length === 1 ? '' : 's'} for your sound alerts on this PC${left ? ` (${left} still missing)` : ''}` }, 'control'); }
    sfxFindRun.last = { at: Date.now(), found: names.length, left, why, names: names.slice(0, 30) };
    return { found: names.length, left, names, folders: db.settings.sfxFolders || [], looked: roots.length };
  } finally { sfxFindRun.running = false; }
}
app.get('/api/chatbot/sound-find', (req, res) => res.json({ folders: db.settings.sfxFolders || [], last: sfxFindRun.last, running: sfxFindRun.running, canPick: !!globalThis.__desktop?.pickFolder, roots: sfxSearchRoots().filter(r => fs.existsSync(r)) }));
app.post('/api/chatbot/sound-find', wTry(async b => {
  let folder = String(b.folder || '').trim();
  if (b.pick) { if (!globalThis.__desktop?.pickFolder) throw new Error('Picking a folder this way only works in the Windows app.'); folder = await globalThis.__desktop.pickFolder('Pick the folder your sound files are in'); if (!folder) return { canceled: true }; }
  if (b.forget) { db.settings.sfxFolders = (db.settings.sfxFolders || []).filter(f => f !== b.forget); save(); return { folders: db.settings.sfxFolders }; }
  return sfxFind({ search: !!b.search, folder });
}));
app.post('/api/test/sound-find', wTry(async () => { // 🧪 pretend: two sound files in a test folder → two alerts that need them → found + remembered; then cleaned up
  const dir = path.join(DATA, 'test-sounds'), sub = path.join(dir, 'Streamlabs sounds'); fs.mkdirSync(sub, { recursive: true });
  const wav = Buffer.from('RIFF$\x00\x00\x00WAVEfmt \x10\x00\x00\x00\x01\x00\x01\x00@\x1f\x00\x00\x80>\x00\x00\x02\x00\x10\x00data\x00\x00\x00\x00', 'binary');
  fs.writeFileSync(path.join(sub, 'Pretend Airhorn.mp3'), wav); fs.writeFileSync(path.join(sub, 'pretendtada.wav'), wav);
  const d = chatbot.data(), mk = (name, from) => { const c = { id: 'test' + Math.random().toString(36).slice(2, 8), uses: 0, on: true, at: Date.now(), name, text: '', aliases: [], perm: 'all', cd: 0, ucd: 0, soundMissing: from, test: true }; d.commands.push(c); return c; };
  const a = mk('!pretendairhorn', 'C:\\Old PC\\Sounds\\Pretend Airhorn.mp3'), t = mk('!pretendtada', 'Pretend Tada');
  const keep = db.settings.sfxFolders; db.settings.sfxFolders = [];
  try {
    const r = await sfxFind({ folder: dir, why: 'test' }), rows = [];
    rows.push({ what: 'Both sound alerts got their file from the picked folder (inside a sub-folder, matched by name)', ok: !!a.sound && !!t.sound });
    rows.push({ what: 'The folder the sounds were in is remembered for next time', ok: (db.settings.sfxFolders || []).includes(sub) });
    return { ok: rows.every(x => x.ok), rows, found: r.found };
  } finally {
    for (const c of [a, t]) { if (c.sound) try { fs.unlinkSync(path.join(SFXDIR, c.sound)); } catch {} const i = d.commands.indexOf(c); if (i >= 0) d.commands.splice(i, 1); }
    db.settings.sfxFolders = keep; save(); try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  }
}));
setTimeout(() => { try { if ((db.settings.sfxFolders || []).length && chatbot.data().commands.some(c => !c.sound && c.soundMissing)) sfxFind({ why: 'start' }).catch(() => {}); } catch {} }, 40000); // (on open: look in the remembered folders again)
/** 🎵 (1.139.0, Derek: "for birthday popup sound use this one instead") your own sound file for the birthday pop-up (app + stream) instead of the built-in party whistle. Kept with the sound alert files. */
function bdaySoundUrl() { const f = String(birthdays.opts().soundFile || ''); try { return f && fs.existsSync(path.join(SFXDIR, f)) ? '/sfx/' + encodeURIComponent(f) : ''; } catch { return ''; } }
app.post('/api/birthdays/sound', wTry(b => {
  if (b.remove) { birthdays.setOpts({ soundFile: '' }); broadcast({ type: 'birthdays' }, 'control'); return { file: '', url: '' }; }
  let name = String(b.name || '').replace(/[\\/:*?"<>|]/g, '').trim().slice(-100); if (!SFX_OK.test(name)) throw new Error('Pick a sound file (mp3, wav, ogg, m4a, flac, aac or opus).');
  const buf = Buffer.from(String(b.data || '').replace(/^data:[^,]*,/, ''), 'base64'); if (!buf.length) throw new Error('That file is empty.'); if (buf.length > 25e6) throw new Error('That file is too big (25 MB at most).');
  fs.mkdirSync(SFXDIR, { recursive: true }); name = sfxFree(name, buf); fs.writeFileSync(path.join(SFXDIR, name), buf); birthdays.setOpts({ soundFile: name }); broadcast({ type: 'birthdays' }, 'control'); return { file: name, url: bdaySoundUrl() };
}));
app.post('/api/test/bday-sound', wTry(b => { /* 🧪 own birthday sound: a generated beep is set as the sound, checked, then the old choice is put back */
  const was = birthdays.opts().soundFile || '', sr = 8000, n = sr / 4, wav = Buffer.alloc(44 + n * 2); wav.write('RIFF', 0); wav.writeUInt32LE(36 + n * 2, 4); wav.write('WAVEfmt ', 8); wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22); wav.writeUInt32LE(sr, 24); wav.writeUInt32LE(sr * 2, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(n * 2, 40); for (let i = 0; i < n; i++) wav.writeInt16LE(Math.round(Math.sin(i / sr * 2 * Math.PI * 880) * 9000), 44 + i * 2);
  fs.mkdirSync(SFXDIR, { recursive: true }); const f = 'test-birthday-beep.wav'; fs.writeFileSync(path.join(SFXDIR, f), wav); birthdays.setOpts({ soundFile: f }); const url = bdaySoundUrl(), rows = [{ what: 'Your own file becomes the birthday sound (app + stream)', ok: url === '/sfx/' + f, got: url || 'none' }];
  birthdays.setOpts({ soundFile: '' }); rows.push({ what: 'Taking it off goes back to the party whistle', ok: bdaySoundUrl() === '', got: bdaySoundUrl() || 'party whistle' });
  birthdays.setOpts({ soundFile: 'not-there.mp3' }); rows.push({ what: 'A file that is gone = the party whistle (never silence)', ok: bdaySoundUrl() === '', got: bdaySoundUrl() || 'party whistle' });
  birthdays.setOpts({ soundFile: was }); try { fs.unlinkSync(path.join(SFXDIR, f)); } catch {} return { ok: rows.every(x => x.ok), rows };
}));
/** 🥳 (1.126.1, Derek: "the party sound can happen on stream") the birthday party whistle through OBS: the sound alert page (in every scene) or the battle screen in OBS. Never the app (it plays its own). */
function bdayStreamSound(vol = 35) {
  const msg = { type: 'sfxCmd', url: bdaySoundUrl() || '/sounds/party-whistle.wav', vol: Math.max(0, Math.min(100, Number(vol) || 0)) / 100 }, has = role => [...wss.clients].some(c => c.readyState === 1 && c.role === role && (role !== 'overlay' || /OBS\//.test(c.ua || '')));
  const where = has('sfx') ? 'sfx' : has('overlay') ? 'overlay' : null; if (where) broadcast(msg, where); return { ok: !!where, where };
}
app.post('/api/test/bday-stream-sound', wTry(b => bdayStreamSound(b.vol ?? birthdays.opts().streamVol)));
function sfxPlay(file, vol = 80, test) {
  if (!file || !fs.existsSync(path.join(SFXDIR, sfxName(file)))) return { ok: false, why: 'missing' };
  const msg = { type: 'sfxCmd', url: '/sfx/' + encodeURIComponent(sfxName(file)), vol: Math.max(0, Math.min(100, Number(vol) || 0)) / 100 }, has = role => [...wss.clients].some(c => c.readyState === 1 && c.role === role && (role !== 'overlay' || /OBS\//.test(c.ua || '')));
  const where = has('sfx') ? 'sfx' : has('overlay') ? 'overlay' : 'control'; broadcast(msg, where); return { ok: true, where };
}

setInterval(() => { try { chatbot.tick(); } catch (e) { console.error('[chat bot] timer', e.message); } }, 30000);
const botDev = fn => wTry(fn); /* (every edition since 1.108.0) */
app.get('/api/chatbot', (req, res) => res.json(chatbot.info()));
app.post('/api/chatbot/opts', botDev(b => chatbot.setOpts(b)));
app.post('/api/chatbot/ready', botDev(b => ({ ready: chatbot.setReady(b.key, b) }))); // ⭐ (1.128.0) ready-made !so / !watchtime / !followage: on/off + cooldowns
app.post('/api/chatbot/command', botDev(b => ({ command: chatbot.saveCommand(b) })));
app.post('/api/chatbot/sound', botDev(b => {
  const c = db.chatbot?.commands?.find(x => x.id === b.id); if (!c) throw new Error('Save the command first.');
  if (b.remove) return { command: chatbot.saveCommand({ ...c, sound: '', text: c.text || c.name }) };
  if (b.play) { const r = sfxPlay(c.sound, b.vol ?? c.vol ?? 80, true); if (!r.ok) throw new Error("That command has no sound file yet."); return r; }
  let name = sfxName(b.name); if (!SFX_OK.test(name)) throw new Error('Pick a sound file (mp3, wav, ogg, m4a, flac).');
  const buf = Buffer.from(String(b.data || '').replace(/^data:[^,]*,/, ''), 'base64'); if (!buf.length) throw new Error('That file is empty.'); if (buf.length > 25e6) throw new Error('That sound is too big (25 MB at most).');
  name = sfxFree(name, buf); fs.writeFileSync(path.join(SFXDIR, name), buf); const out = { command: chatbot.saveCommand({ ...c, sound: name }) }; sfxSoon(); return out;
}));
app.post('/api/chatbot/command/remove', botDev(b => ({ command: chatbot.removeCommand(b.id) })));
app.post('/api/chatbot/timer', botDev(b => ({ timer: chatbot.saveTimer(b) })));
app.post('/api/chatbot/timer/remove', botDev(b => ({ timer: chatbot.removeTimer(b.id) })));
app.post('/api/chatbot/quote', botDev(b => ({ quote: b.n ? chatbot.editQuote(b.n, b.text) : chatbot.addQuote(b.text, b.by || 'you') })));
app.post('/api/chatbot/quote/remove', botDev(b => ({ quote: chatbot.removeQuote(b.n) })));
app.post('/api/chatbot/import', botDev(b => { const p = b.xlsx ? botXlsx(b.xlsx, b.kind || 'auto', !!b.cdMins) : chatbot.parseImport(b.text, b.kind || 'auto', { cdMins: !!b.cdMins }); if (b.dry) return { found: p }; return { found: { note: p.note, commands: p.commands.length, timers: p.timers.length, quotes: p.quotes.length }, done: chatbot.applyImport(p, { replace: !!b.replace }) }; }));
// 🧳 Everything from Streamlabs Chatbot in one go (1.101.0, Derek: "allow for imports of quotes, sound alerts, timers, basically everything"):
// several files at once (Data.xlsx, Songlist.xlsx, exported .abcom / .abcomg command files, CSV). Each page of each file is sorted by its name:
// commands, timers, quotes, sound alerts → the chat bot; the song list / banned songs → 🎵 Songs (editions that have it); pages there is no
// place for yet (points, ranks, counters, the viewer queue…) are listed so nothing vanishes silently. dry = only look.
function botImportAll(files, { cdMins = true } = {}) {
  const out = { commands: [], timers: [], quotes: [], songs: [], banned: [], hours: [], pages: [], other: [] }, hasSongs = feat('songs');
  const kindOf = (name, file) => /quote/i.test(name) ? 'quotes' : /timer/i.test(name) ? 'timers' : /sfx|sound/i.test(name) ? 'sfx' : /black|banned|block/i.test(name) && /song|music|sr\b/i.test(name + ' ' + file) ? 'banned' : /song|playlist|music/i.test(name) || (/song/i.test(file) && !/black|ban/i.test(name)) ? 'songs' : /command/i.test(name) ? 'commands' : null;
  const add = (k, p, label) => { if (k === 'songs' || k === 'banned') { out[k].push(...p.songs); out.pages.push({ label, kind: k, n: p.songs.length }); return; } const n = p.commands.length + p.timers.length + p.quotes.length; out.commands.push(...p.commands); out.timers.push(...p.timers); out.quotes.push(...p.quotes); out.pages.push({ label, kind: k || 'auto', n }); };
  for (const f of (files || []).slice(0, 12)) {
    const name = String(f.name || 'file').slice(0, 80);
    try {
      if (f.xlsx) { for (const sh of xlsx.sheets(Buffer.from(String(f.xlsx), 'base64'))) { const rows = sh.rows.filter(r => r.some(c => String(c ?? '').trim())); if (rows.length < 2) { if (rows.length) (out.empty ||= []).push(sh.name); continue; } const k = kindOf(sh.name, name), label = `${name} → ${sh.name}`;
          if (!k && /currency|points/i.test(sh.name)) { const head = rows[0].map(h => String(h).trim().toLowerCase()), ni = head.findIndex(h => /^(name|user|username)$/.test(h)), hi = head.findIndex(h => /^hours?$/.test(h)); /* ⏱️ (1.125.1) Streamlabs' Currency page: watch hours → $watchtime */
            if (ni >= 0 && hi >= 0) { let n = 0; for (const r of rows.slice(1)) { const login = String(r[ni] || '').trim().toLowerCase().replace(/^@/, ''), h = Number(String(r[hi]).replace(',', '.')); if (/^\w{2,30}$/.test(login) && h > 0) { out.hours.push({ login, name: String(r[ni]).trim(), mins: Math.round(h * 60) }); n++; } } out.pages.push({ label, kind: 'hours', n }); if (n) continue; }
            out.other.push({ label, n: rows.length - 1 }); continue; }
          if (!k) { out.other.push({ label, n: rows.length - 1 }); continue; }
          if (k === 'songs' || k === 'banned') { if (!hasSongs) { out.other.push({ label, n: rows.length - 1, why: 'songs' }); continue; } add(k, songs.readTable(rows, k), label); continue; }
          add(k, chatbot.parseImport(xlsx.toCsv(rows), k, { cdMins }), label); } }
      else if (String(f.text || '').trim()) { const k = /song/i.test(name) ? (/black|ban/i.test(name) ? 'banned' : 'songs') : /sfx|sound/i.test(name) ? 'sfx' : /quote/i.test(name) ? 'quotes' : /timer/i.test(name) ? 'timers' : 'auto';
        if (k === 'songs' || k === 'banned') { if (!hasSongs) out.other.push({ label: name, n: 0, why: 'songs' }); else add(k, songs.readText(f.text, k), name); }
        else add(k, chatbot.parseImport(f.text, k, { cdMins: cdMins || /\.abcomg?$/i.test(name) }), name); }
    } catch (e) { out.other.push({ label: name, n: 0, why: 'error', err: e.message }); }
  }
  { /* 🔊 (1.124.0) Streamlabs Chatbot keeps sounds on their own SFX page (name + volume, no file): a sound with the same name as a command goes onto that command */
    const snd = new Map(); for (const c of out.commands) if (c.sfxOnly && !snd.has(c.name)) snd.set(c.name, c);
    for (const c of out.commands) if (!c.sfxOnly && !c.soundFrom && snd.has(c.name)) { const s = snd.get(c.name); c.soundFrom = s.soundFrom; c.vol = s.vol; s.used = true; }
    out.commands = out.commands.filter(c => !c.used); out.emptySkipped = [];
    out.commands = out.commands.filter(c => { if (!String(c.text || '').trim() && !c.soundFrom) { out.emptySkipped.push(c.name); return false; } c.text = String(c.text || '').trim(); return true; }); }
  const seen = new Set(); out.commands = out.commands.filter(c => !seen.has(c.name) && seen.add(c.name)); // (the same command in two files: once)
  for (const c of out.commands) if (c.soundFrom) { try { const from = c.soundFrom.replace(/^"|"$/g, ''); c.fileHere = SFX_OK.test(from) && fs.existsSync(from); } catch { c.fileHere = false; } }
  return out;
}
app.post('/api/chatbot/import-all', botDev(b => {
  const p = botImportAll(b.files, { cdMins: b.cdMins !== false }), snd = p.commands.filter(c => c.soundFrom);
  const found = { hours: p.hours.length, commands: p.commands.length - snd.length, sounds: snd.length, soundFiles: snd.filter(c => c.fileHere).length, emptySkipped: p.emptySkipped || [], empty: [...new Set(p.empty || [])], timers: p.timers.length, quotes: p.quotes.length, songs: p.songs.length, banned: p.banned.length, pages: p.pages, other: p.other,
    sample: { commands: p.commands.filter(c => !c.soundFrom).slice(0, 8).map(c => ({ name: c.name, text: c.text })), sounds: snd.slice(0, 8).map(c => ({ name: c.name, file: c.soundFrom, here: !!c.fileHere })), timers: p.timers.slice(0, 5).map(t => ({ mins: t.mins, text: t.text })), quotes: p.quotes.slice(0, 5).map(q => ({ text: q.text })), songs: p.songs.slice(0, 5).map(x => ({ title: x.title || 'YouTube video ' + x.yt })) } };
  if (!(found.commands + found.sounds + found.timers + found.quotes + found.songs + found.banned + found.hours)) throw new Error(p.other.length ? "I read the file" + (b.files?.length === 1 ? '' : 's') + " but found nothing I can bring over. Pages I saw: " + p.other.map(o => o.label).join(', ') : 'Nothing to read: pick the files Streamlabs Chatbot made (Data.xlsx, Songlist.xlsx) first.');
  if (b.dry) return { found };
  const done = chatbot.applyImport({ commands: p.commands, timers: p.timers, quotes: p.quotes }, { replace: !!b.replace });
  if (p.songs.length) done.songs = songs.applyImport({ songs: p.songs }, { kind: 'songs', replace: !!b.replace });
  if (p.banned.length) done.bannedSongs = songs.applyImport({ songs: p.banned }, { kind: 'banned' });
  if (p.hours.length) { let n = 0; for (const x of p.hours) { const v = chatlog.viewer(x.login, x.name); if (v && (v.watchOld || 0) < x.mins) { v.watchOld = x.mins; n++; } } done.hours = n; save(); } /* (kept apart from the app's own count, never added twice: the bigger import wins) */
  sfxSoon(); if (done.soundsMissing || chatbot.data().commands.some(c => c.soundMissing && !c.sound)) setTimeout(() => sfxFind({ search: true, why: 'import' }).catch(() => {}), 500); return { found, done };
}));
app.post('/api/test/chatbot-sound', botDev(async () => { // 🧪 a !testbeep sound alert (a short beep made here), used by a pretend viewer
  const name = 'test-beep.wav', file = path.join(SFXDIR, name);
  if (!fs.existsSync(file)) { const rate = 8000, n = 2400, b = Buffer.alloc(44 + n * 2); b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(rate, 24); b.writeUInt32LE(rate * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(n * 2, 40); for (let i = 0; i < n; i++) b.writeInt16LE(Math.round(9000 * Math.sin(i / rate * 2 * Math.PI * 880) * Math.min(1, (n - i) / 600)), 44 + i * 2); fs.writeFileSync(file, b); }
  const cur = db.chatbot?.commands?.find(c => c.name === '!testbeep'); chatbot.saveCommand({ id: cur?.id, name: '!testbeep', text: '', sound: name, vol: 70, cd: 0, perm: 'all' });
  twitch.pretend.until = Date.now() + 10 * 60000; twitchHandlers.chat({ login: 'pretend_dj', name: 'Pretend_DJ', text: '!testbeep', userId: 'pretend-dj', badges: {}, pretend: true }); await new Promise(r => setTimeout(r, 300));
  const has = role => [...wss.clients].some(c => c.readyState === 1 && c.role === role && (role !== 'overlay' || /OBS\//.test(c.ua || ''))); return { ok: true, where: has('sfx') ? 'sfx' : has('overlay') ? 'overlay' : 'control' };
}));
app.post('/api/test/chatbot-import-all', botDev(() => { // 🧪 a pretend Streamlabs export (two pages + a sound that isn't on this PC): looked at only, nothing is added
  const p = botImportAll([{ name: 'Commands.csv', text: 'Command,Response,Permission,Cooldown\n!discord,Join us: discord.gg/pretend,Everyone,1\n!lurk,$username is lurking,Everyone,0' }, { name: 'SFX.csv', text: 'Command,File,Volume,Cooldown,Permission\n!airhorn,C:\\Pretend\\airhorn.mp3,60,1,Everyone' }, { name: 'Timers.csv', text: 'Name,Message,Interval\nSocials,Follow the socials!,15' }, { name: 'Quotes.csv', text: 'Quote\n"It works on my stream"' }]);
  const rows = [['2 commands read', p.commands.filter(c => !c.soundFrom).length === 2], ['Waits turned from minutes into seconds (1 min = 60 s)', p.commands.find(c => c.name === '!discord')?.cd === 60], ['1 sound alert read, with its file path and volume', p.commands.filter(c => c.soundFrom).length === 1 && p.commands.find(c => c.soundFrom).vol === 60], ['A sound file that is not on this PC is noticed', p.commands.find(c => c.soundFrom).fileHere === false], ['1 timer read', p.timers.length === 1], ['1 quote read', p.quotes.length === 1]].map(([what, ok]) => ({ what, ok: !!ok }));
  return { ok: rows.every(r => r.ok), rows };
}));
// 📗 an Excel file (Streamlabs Chatbot → Connections → Cloud → Create Excel Files = Data.xlsx): every sheet is read like a spreadsheet; the sheet's name says what it holds
function botXlsx(b64, kind, cdMins) {
  const out = { commands: [], timers: [], quotes: [], note: '' }, seen = [];
  for (const sh of xlsx.sheets(Buffer.from(String(b64), 'base64'))) {
    if (sh.rows.length < 2) continue;
    const k = kind !== 'auto' ? kind : /quote/i.test(sh.name) ? 'quotes' : /timer/i.test(sh.name) ? 'timers' : /sfx|sound/i.test(sh.name) ? 'sfx' : /command/i.test(sh.name) ? 'commands' : null; if (!k) continue;
    let p; try { p = chatbot.parseImport(xlsx.toCsv(sh.rows), k, { cdMins }); } catch { continue; }
    out.commands.push(...p.commands); out.timers.push(...p.timers); out.quotes.push(...p.quotes); seen.push(sh.name);
  }
  if (!seen.length) throw new Error("I couldn't find commands, timers or quotes in that Excel file (its pages should be named Commands, Timers, Quotes or SFX).");
  out.note = `Read as an Excel file (pages: ${seen.join(', ')}).`; return out;
}
app.get('/api/chatbot/export', (req, res) => { res.setHeader('Content-Disposition', 'attachment; filename="movie-royal-chat-bot.json"'); res.json(chatbot.exportAll()); });
app.post('/api/test/chatbot', wTry(b => ({ says: chatbot.preview(b.text, b.who || 'TestViewer', b.typed || '') }))); // 🧪 what the bot would answer (nothing is sent)
app.post('/api/test/chatbot-import', wTry(() => { // 🧪 the importer on three sample files (nothing is saved)
  const A = chatbot.parseImport(JSON.stringify([{ Command: '!discord', Permission: 'Everyone', Response: 'Join us: discord.gg/example $username', Cooldown: 1, UserCooldown: 2, Enabled: true, Count: 12 }, { Command: '!so', Permission: 'Moderator', Response: 'Go follow $targetname!', Cooldown: 0 }]), 'auto', { cdMins: true });
  const B = chatbot.parseImport('name,message,userlevel,cooldown\n!lurk,"{user} is lurking, thanks!",everyone,30\n!rules,"Be kind, no spoilers",subscriber,60');
  const C = chatbot.parseImport('1. I meant to do that\n2. That was the plan all along', 'quotes');
  const ok = A.commands.length === 2 && A.commands[0].cd === 60 && A.commands[1].perm === 'mods' && B.commands.length === 2 && B.commands[1].perm === 'subs' && C.quotes.length === 2 && C.quotes[1].n === 2;
  return { ok, files: [{ name: 'Streamlabs Chatbot style file', ...A }, { name: 'Spreadsheet (CSV)', ...B }, { name: 'Plain quote lines', ...C }] };
}));
app.post('/api/test/spam', wTry(b => {
  const samples = spamban.SAMPLES.map(([text, spam]) => { const w = spamban.why(text); return { text, spam, why: w, ok: !!w === spam }; });
  const t = String(b.text || ''); return { why: t ? spamban.why(t) : null, would: t ? spamban.check({ login: 'test', text: t, first: !!b.first, badges: {} }, !b.first) : null, samples, cfg: spamban.cfg() };
}));
// 🧪 what the reminder would say for the first person in the line (nothing is sent)
app.post('/api/test/mara-wait', wTry(() => {
  const it = paid.queue()[0]; if (!it) throw new Error('Nobody is in the line. Add a pretend one first (🎟️ Paid battles test card).');
  return { text: maraWaitChat({ login: it.login || it.who, name: it.who, text: 'hi' }, true), on: marathon.cfg().waitRemind !== false, mins: Number(marathon.cfg().waitMins) || 30, waited: Math.round((Date.now() - it.at) / 60000) };
}));
app.get('/api/mara/mics', wTry(async () => { let inputs = null, scene = null, err = null; try { const r = await obs.audioInputs(); inputs = r.inputs; scene = r.scene; } catch (e) { err = e.message; } return { ...micState(), inputs, scene, err, cookMic: obs.COOK_MIC }; }));
app.post('/api/mara/mics', wTry(b => {
  if (!paid.dev()) throw new Error('The mic switching is a 🛠️ dev mode feature.');
  const c = { ...micCfg() }; if (typeof b.auto === 'boolean') c.auto = b.auto; if (b.pc === null || Array.isArray(b.pc)) c.pc = b.pc ? b.pc.map(String).slice(0, 20) : null;
  db.settings.marathon = { ...(db.settings.marathon || {}), mics: { auto: c.auto, pc: c.pc } }; save(); micWatch(); pushState(); return micState();
}));
app.post('/api/mara/mics/now', wTry(async b => { if (!paid.dev()) throw new Error('The mic switching is a 🛠️ dev mode feature.'); if (!['cook', 'pc'].includes(b.to)) throw new Error('Pick cook or pc.'); return micApply(b.to, 'you pressed the button'); }));
// 🧪 what switching would do (nothing changes in OBS): {to: 'cook'|'pc'}
app.post('/api/test/mara-mics', wTry(async b => { const r = await obs.audioInputs(); return { to: b.to, ...(await micPlan(b.to === 'pc' ? 'pc' : 'cook', r.inputs)), inputs: r.inputs, scene: r.scene, remembered: db.micMuted || [] }; }));
app.post('/api/mara/clock', wTry(b => {
  if (!paid.dev()) throw new Error('The live time counter is a 🛠️ dev mode feature.');
  const c = { ...clockCfg() };
  if (typeof b.on === 'boolean') c.on = b.on;
  if (['tl', 'tr', 'bl', 'br'].includes(b.corner)) c.corner = b.corner;
  if (b.start) { c.mode = 'from'; c.from = Date.now(); c.add = 0; act('stream', '⏱️ The marathon live time counter starts now (0:00:00)', { icon: '⏱️', kind: 'clock' }); }
  if (b.stream) { c.mode = 'stream'; c.add = 0; act('stream', '⏱️ The live time counter shows this stream only', { icon: '⏱️', kind: 'clock' }); }
  if (b.auto) { c.mode = 'auto'; c.from = null; c.add = 0; act('stream', '⏱️ The live time counter is back on automatic (stream restarts count as one marathon)', { icon: '⏱️', kind: 'clock' }); }
  if (b.addMins != null) { const was = clockTotal(); c.add = (Number(c.add) || 0) + Math.round(Number(b.addMins) || 0) * 60000; db.settings.marathon = { ...(db.settings.marathon || {}), clock: c }; const now = clockTotal(); if (now <= 0 && b.addMins < 0) c.add -= now; act('stream', `⏱️ Fixed the live time counter: ${hms(was)} → ${hms(clockTotal())}`, { icon: '⏱️', kind: 'clock' }); }
  if (b.set != null) { const want = Math.max(0, Math.round(Number(b.set) || 0)) * 1000; c.add = 0; db.settings.marathon = { ...(db.settings.marathon || {}), clock: c }; c.add = want - clockTotal(); act('stream', `⏱️ Set the live time counter to ${hms(want)}`, { icon: '⏱️', kind: 'clock' }); }
  db.settings.marathon = { ...(db.settings.marathon || {}), clock: c }; save(); clockSend(true); pushState();
  return clockState();
}));
// 🧪 ▶ which stream new battles link to right now, and the newest battles' VOD spots (nothing changes)
app.get('/api/test/vod-check', wTry(() => { const si = site.streamInfoNow(), seg = liveSegStart(); return { live: !!db.live, liveSince: seg, twitchStream: si ? { id: si.id, startedAt: si.startedAt } : null, linksTo: db.live ? site.vodNow(seg) : null, recent: (db.history || []).slice(-8).reverse().map(h => ({ label: h.winner?.label, at: h.started || h.at, sid: h.vod?.sid || null, vod: h.vod ? (db.vodIds || {})[h.vod.sid] === 0 ? 'gone' : (db.vodIds || {})[h.vod.sid] ? 'found' : 'not found yet' : 'none' })) }; }));
// 🧪 the counter right now + the live times it adds up (nothing changes)
app.get('/api/test/mara-clock', wTry(() => ({ ...clockState(), segs: (db.liveLog || []).slice(-8).map(x => ({ s: x.s, e: x.e })) })));
app.post('/api/mara/settings', wTry(b => { const c = { ...(db.settings.marathon || {}) }; if (b.luckPer != null) c.luckPer = Math.max(0.1, Math.min(50, Number(b.luckPer) || 1)); if (b.popSecs != null) c.popSecs = Math.max(10, Math.min(120, Number(b.popSecs) || 40)); if (b.guessSecs != null) c.guessSecs = Math.max(0, Math.min(300, Math.round(Number(b.guessSecs) || 0))); for (const k of ['counter', 'popup', 'itemLook', 'timerOn', 'waitRemind']) if (typeof b[k] === 'boolean') c[k] = b[k]; if (b.waitMins != null) c.waitMins = Math.max(1, Math.min(600, Math.round(Number(b.waitMins) || 30))); if (b.alarmSecs != null) c.alarmSecs = Math.max(1, Math.min(30, Math.round(Number(b.alarmSecs) || 5))); if (['tl', 'tr', 'bl', 'br'].includes(b.corner)) c.corner = b.corner; if (typeof b.defMap === 'string') { if (b.defMap && !marathon.maps().some(m => m.id === b.defMap)) throw new Error('That map isn\'t one of the marathon\'s maps.'); c.defMap = b.defMap; if (live.phase !== 'lobby' && live.phase !== 'running' && maraCharList(getList(db.activeListId)) && !live.maraGuess) { live.map = null; live.mapPick = false; setTimeout(() => refreshPreview(true), 0); } act('battle', b.defMap ? `set the marathon map to ${mapLabel(b.defMap)} (for battles where nobody picked one)` : 'set the marathon map back to 🎲 random', { icon: '🗺️', who: streamerName(), kind: 'setting' }); } db.settings.marathon = c; save(); pushState(); maraCount(true); if ('itemLook' in b) { refreshPreview(); if (b.itemLook) maraPicsAuto().catch(() => {}); } return marathon.cfg(); }));
app.post('/api/mara/set', wTry(b => { // you change someone's picks yourself (Marathon tab: the map / 🍀 menus on a battle in the line)
  const it = paid.queue().find(x => x.id === b.id); if (!it) throw new Error('That battle already ran or was taken out.');
  if (b.map !== undefined) { if (!b.map) { it.map = null; it.mapVia = null; } else { const m = marathon.findMap(b.map); if (m.error) throw new Error(m.error); it.map = m.id; it.mapVia = 'you'; } }
  if (b.luck !== undefined) { if (!b.luck) { it.luck = null; it.luckVia = null; } else { const x = marathon.items().find(i => i.id === b.luck); if (!x) throw new Error('That thing is not in the marathon battle.'); it.luck = x.id; it.luckVia = 'you'; } }
  save(); pushState(); return paid.info();
}));
app.get('/api/test/mara-maps', (req, res) => { // 🧪 (1.81.0) the marathon's maps: character maps only + what the next battles would get (nothing changes)
  const maps = marathon.maps(), def = maraDefMap(), next = Array.from({ length: 5 }, () => maraRandomMap()), bad = maps.filter(m => !isCharMap(m.id)).map(m => m.name);
  res.json({ maps, def, defName: def ? mapLabel(def) : '', next: next.map(mapLabel), bad: bad.length ? `Not character maps: ${bad.join(', ')}` : '' });
});
app.post('/api/mara/luck-reset', wTry(b => { const n = marathon.resetLuck(b.id || null); if (n) act('luck', b.id ? 'reset the chat-given 🍀 luck on one thing in the marathon battle' : `reset all the chat-given 🍀 luck in the marathon battle (${n})`, { icon: '🍀', who: streamerName(), kind: 'reset' }); refreshPreview(); return { reset: n }; }));
app.post('/api/mara/token-remove', wTry(b => { db.paidTokens = marathon.tokens().filter((t, i) => i !== Number(b.i)); save(); pushState(); return {}; }));
app.post('/api/mara/pop-again', wTry(b => { const it = paid.queue().find(x => x.id === b.id) || paid.queue()[0]; if (!it) throw new Error('Nobody is waiting.'); broadcast(maraPopMsg({ who: it.who, n: paid.queue().filter(x => marathon.norm(x.who) === marathon.norm(it.who)).length, what: it.what, test: it.test }), 'mara'); return {}; }));
const maraUrl = () => `http://localhost:${PORT}/marathon.html`;
// 🧰 (1.79.0, Derek) the marathon's own OBS setup: a profile copied from yours + a scene collection with 4 scenes (obs.marathonSetup).
// The title screens are public/scenecard.html?k=soon|sleep|chat (ws role 'mara': battles owed + the words below, changeable live).
const cardsCfg = () => { const c = db.settings.marathon?.cards || {}; return { title: String(c.title || '').trim() || 'GTA 6 MARATHON', soonMode: c.soonMode === 'brb' ? 'brb' : 'soon', soon: String(c.soon || '').trim() || 'Starting soon', brb: String(c.brb || '').trim() || 'Be right back', sleep: String(c.sleep || '').trim() || 'Shh… sleeping stream' }; };
const cardsMsg = () => ({ type: 'sceneCard', ...cardsCfg() });
const obsSetupCfg = () => { const o = db.settings.marathon?.obsSetup || {}; return { profile: o.profile || 'GTA 6 Marathon', collection: o.collection || 'GTA 6 Marathon', prev: o.prev || null, madeAt: o.madeAt || null, cookBig: db.settings.marathon?.cookBig || 1 }; };
app.get('/api/obs/marathon-setup', async (req, res) => { let now = null, err = null; try { now = await obs.obsSetups(); } catch (e) { err = e.message; } res.json({ ...obsSetupCfg(), now, err, cards: cardsCfg(), scenes: Object.values(obs.MARA_SCENES) }); });
app.post('/api/obs/marathon-setup', wTry(async b => maraObsSetup(b)));
async function maraObsSetup(b) { // (also used by 🔄 Keep OBS up to date with keepScene: adds what's missing, never switches the scene)
  if (!paid.dev()) throw new Error('The marathon OBS setup is a 🛠️ dev mode feature: turn on Dev mode in Settings → 👤 Account & updates.');
  if (!b.dry && !b.go) throw new Error('Press 🧰 Make it to make the marathon OBS setup.'); // (only the button really changes OBS)
  const c = { ...(db.settings.marathon || {}) }, o = { ...(c.obsSetup || {}) };
  const clean = (v, d) => String(v || '').replace(/[\\/:*?"<>|]/g, '').trim().slice(0, 60) || d;
  const profile = clean(b.profile, o.profile || 'GTA 6 Marathon'), collection = clean(b.collection, o.collection || 'GTA 6 Marathon');
  const extra = [];
  if (!b.dry && db.settings.choiceObs && obsOk()) { try { const f = await choiceFile(); extra.push({ name: 'Movie Royal celebration', url: f.file, local: true }); } catch {} } // 🎉 Viewer's Choice, if you have it in OBS
  if (!b.dry && db.settings.rollObs && obsOk()) extra.push({ name: obs.ROLL_NAME, url: rollUrl() }); // 📣 roll call, if you have it in OBS
  const r = await obs.marathonSetup({ profile, collection, dry: !!b.dry, extra, keepScene: !!b.keepScene, coSide: costream.mySide(), urls: { game: `http://localhost:${PORT}/game.html`, mara: maraUrl(), maraMini: maraUrl() + '?mini=1', card: k => `http://localhost:${PORT}/scenecard.html?k=${k}`, yt: k => `http://localhost:${PORT}/ytplay.html?k=${k}` } });
  if (!b.dry) {
    o.profile = profile; o.collection = collection; o.madeAt = Date.now(); if (r.prev && (r.prev.profile !== profile || r.prev.collection !== collection)) o.prev = r.prev;
    c.obsSetup = o; c.obs = true; c.scenes = r.scenes; db.settings.marathon = c;
    if (db.costream && !db.costream.scene) db.costream.scene = obs.MARA_SCENES.co; // 🤝 your partner's camera + battle go in the co-stream gameplay scene
    save(); pushState();
    setTimeout(micWatch, 500); // 🎙️ start switching the mics with the scenes
    act('stream', b.keepScene ? `🔄 Topped up the marathon OBS scenes (profile “${profile}”, scene collection “${collection}”)` : `🧰 Made the marathon OBS setup: profile “${profile}” + scene collection “${collection}”`, { icon: b.keepScene ? '🔄' : '🧰', kind: 'obs' });
  }
  return r;
}
app.post('/api/obs/cook-big', wTry(async b => { // 🍳 (1.82.0) which cooking camera is the big one
  if (!paid.dev()) throw new Error('The marathon OBS setup is a 🛠️ dev mode feature.');
  const r = await obs.cookBig(b.n); db.settings.marathon = { ...(db.settings.marathon || {}), cookBig: r.big }; save(); pushState(); return r;
}));
app.post('/api/obs/marathon-switch', wTry(async b => { // ↩️ back to your normal setup / 🏃 to the marathon one
  if (!paid.dev()) throw new Error('The marathon OBS setup is a 🛠️ dev mode feature.');
  const o = obsSetupCfg(), to = b.to === 'normal' ? o.prev : { profile: o.profile, collection: o.collection };
  if (!to) throw new Error("Movie Royal doesn't know your normal setup yet: make the marathon setup first (or switch in OBS: Profile / Scene Collection menus).");
  const r = await obs.switchSetup(to.profile, to.collection); act('stream', `🔁 Switched OBS to ${b.to === 'normal' ? 'your normal' : 'the marathon'} setup (${r.profile} / ${r.collection})`, { icon: '🔁', kind: 'obs' }); return r;
}));
// 📺 (1.84.0, Derek: "a BRB scene which I will play YouTube videos… YouTube videos playing while sleeping") the YouTube links for
// the ☕ Be Right Back + 😴 Sleeping scenes (public/ytplay.html in OBS, ws role 'mara'). settings.marathon.yt {brb:{list, shuffle},
// sleep:{list, shuffle}, vol}; where each one is up to = db.ytPos[k] {i, t, sub, order, n} (so it carries on when the scene comes back).
const YT_KS = ['brb', 'sleep'];
const ytCfg = () => { const y = db.settings.marathon?.yt || {}, one = (o, sh) => ({ list: (Array.isArray(o?.list) ? o.list : []).map(String).filter(Boolean).slice(0, 300), shuffle: o?.shuffle ?? sh }); return { brb: one(y.brb, false), sleep: one(y.sleep, true), vol: Math.max(0, Math.min(100, Number(y.vol ?? 60))) }; };
const ytMsg = () => ({ type: 'ytCfg', ...ytCfg(), pos: db.ytPos || {} });
live.ytNow = {};
function ytFromPlayer(m) {
  const k = YT_KS.includes(m.k) ? m.k : null; if (!k) return;
  if (m.type === 'ytErr') { live.ytNow[k] = { ...(live.ytNow[k] || {}), err: `A video couldn't play (YouTube said ${m.code === 101 || m.code === 150 ? "it can't be played outside YouTube" : m.code === 100 ? 'it was removed or is private' : 'the link is wrong'}): skipped`, errAt: Date.now() }; pushState(); return; }
  const was = live.ytNow[k] || {}, now = { i: Number(m.i) || 0, n: Number(m.n) || 0, t: Number(m.t) || 0, title: String(m.title || '').slice(0, 160), paused: !!m.paused, at: Date.now(), err: was.errAt > Date.now() - 60000 ? was.err : null, errAt: was.errAt };
  live.ytNow[k] = now;
  db.ytPos = { ...(db.ytPos || {}), [k]: { i: now.i, t: now.t, sub: Number(m.sub) || 0, order: Array.isArray(m.order) ? m.order.slice(0, 300) : [], n: now.n } }; save();
  if (was.title !== now.title || was.paused !== now.paused || was.n !== now.n) pushState();
}
function ytState() { const c = ytCfg(); return { ...c, now: live.ytNow, count: Object.fromEntries(YT_KS.map(k => [k, ytParse(c[k].list.join('\n')).ok.length])) }; }
// a pasted block of links → which ones are YouTube videos / playlists (the same rules as ytplay.html)
function ytParse(text) {
  const ok = [], bad = [];
  for (const raw of String(text || '').split(/[\n\r]+|\s{2,}|,\s*(?=https?:)/)) {
    const t = raw.trim(); if (!t) continue; let it = null;
    if (/^[\w-]{11}$/.test(t)) it = { v: t };
    else { try { const u = new URL(/^https?:/i.test(t) ? t : 'https://' + t), h = u.hostname.replace(/^(www|m|music)\./, ''), list = u.searchParams.get('list');
      if (/^(youtu\.be|youtube\.com|youtube-nocookie\.com)$/.test(h)) {
        if (list && !/^RD/.test(list)) it = { list };
        else { const v = h === 'youtu.be' ? u.pathname.slice(1, 12) : u.searchParams.get('v') || (u.pathname.match(/^\/(?:shorts|live|embed|v)\/([\w-]{11})/) || [])[1]; if (v && /^[\w-]{11}$/.test(v)) it = { v }; }
      } } catch {} }
    (it ? ok : bad).push(it ? { link: t, ...it } : t);
  }
  return { ok, bad, videos: ok.filter(x => x.v && !x.list).length, lists: ok.filter(x => x.list).length };
}
app.post('/api/mara/yt', wTry(b => {
  if (!paid.dev()) throw new Error('The marathon YouTube videos are a 🛠️ dev mode feature.');
  if (b.cmd) { const k = YT_KS.includes(b.k) ? b.k : null; if (!k || !['next', 'prev', 'pause', 'play', 'reload'].includes(b.cmd)) throw new Error('Which videos?'); broadcast({ type: 'ytCmd', k, cmd: b.cmd }, 'mara'); return ytState(); }
  const c = { ...(db.settings.marathon || {}) }, y = { ...(c.yt || {}) };
  for (const k of YT_KS) if (b[k]) { const o = { ...(y[k] || {}) }; if ('list' in b[k]) { const p = ytParse(Array.isArray(b[k].list) ? b[k].list.join('\n') : b[k].list); o.list = p.ok.map(x => x.link); if (db.ytPos?.[k]) db.ytPos[k] = { ...db.ytPos[k], n: -1 }; } if ('shuffle' in b[k]) o.shuffle = !!b[k].shuffle; y[k] = o; }
  if ('vol' in b) y.vol = Math.max(0, Math.min(100, Math.round(Number(b.vol) || 0)));
  c.yt = y; db.settings.marathon = c; save(); broadcast(ytMsg(), 'mara'); pushState(); return ytState();
}));
app.post('/api/test/yt-links', wTry(b => ytParse(b.text))); // 🧪 which pasted links are YouTube videos / playlists (nothing saved)
// 🎞️ (1.84.0, Derek: "I should be 60 fps") OBS's frame rate
app.get('/api/obs/fps', async (req, res) => { try { const r = await obs.obsSetups(); res.json({ fps: r.fps, profile: r.profile }); } catch (e) { res.json({ fps: null, err: e.message }); } });
app.post('/api/obs/fps', wTry(async b => { const r = await obs.setFps(b.fps); act('stream', `🎞️ Set OBS to ${r.fps} fps (was ${r.was}) in the profile “${r.profile}”`, { icon: '🎞️', kind: 'obs' }); return r; }));
app.post('/api/mara/cards', wTry(b => { if (!paid.dev()) throw new Error('The marathon title screens are a 🛠️ dev mode feature.'); // ✏️ the title screens' words (+ ⏳ Starting soon / 👋 Be right back)
  const c = { ...(db.settings.marathon || {}) }, k = { ...(c.cards || {}) };
  for (const f of ['title', 'soon', 'brb', 'sleep']) if (f in b) { const v = String(b[f] || '').replace(/\s+/g, ' ').trim().slice(0, 80); if (v) k[f] = v; else delete k[f]; }
  if (b.soonMode === 'soon' || b.soonMode === 'brb') k.soonMode = b.soonMode;
  c.cards = k; db.settings.marathon = c; save(); broadcast(cardsMsg(), 'mara'); pushState(); return cardsCfg();
}));
// 📜 (1.78.0, Derek) "battles are paused" message for OBS: one line of white text scrolling right to left (public/ticker.html).
// Marathon tab → 📜 Paused message: ▶ Show / ⏸ Hide in the scene you're in; ✏️ the words, speed, size, top or bottom.
const TICKER_TEXT = "⏸️ Battles are paused right now, but don't worry: every battle is added to the queue, and we'll run them as soon as they're back on! Can't stick around? No worries, come say hi any other time during the stream to redeem your battles. If you can't make it back, they'll be run in the last part of the stream, and the VOD will be up to watch later. 🎟️";
const tickerCfg = () => { const t = db.settings.marathon?.ticker || {}; return { text: String(t.text || '').trim() || TICKER_TEXT, own: !!String(t.text || '').trim(), speed: Math.max(40, Math.min(400, Number(t.speed) || 140)), size: Math.max(20, Math.min(90, Number(t.size) || 44)), pos: t.pos === 'top' ? 'top' : 'bottom', band: !!t.band }; };
const tickerMsg = () => ({ type: 'ticker', ...tickerCfg() });
const tickerUrl = () => `http://localhost:${PORT}/ticker.html`;
live.ticker = { on: false, scene: '', checkedAt: 0 };
// (1.78.1, Derek: "when I turn on the source it will pause the battles, and turning it off will resume them": db.paidPaused)
async function tickerShow(on, here) {
  let r, warn = null;
  try { r = await obs.tickerSource(on, tickerUrl()); } catch (e) { if (here) throw e; r = { on: false, scene: '' }; warn = `OBS: ${e.message}`; } // (the pause still works when OBS isn't reachable)
  live.ticker = { on: !!r.on, scene: r.scene || '', checkedAt: Date.now(), ...(warn ? { err: warn } : {}) };
  const was = !!db.paidPaused; db.paidPaused = !!on; save();
  if (!here && was !== !!on) {
    const owed = paid.queue().length;
    act('battle', on ? `⏸ Paused the paid battles (📜 paused message on${r.scene ? ' in ' + r.scene : ''}; ${owed} owed)` : `▶ Paid battles are back on (📜 paused message off; ${owed} owed)`, { icon: on ? '⏸' : '▶', kind: 'pause' });
    if (paid.cfg().say) paidSay(on ? `⏸ Battles are paused for now. Every battle stays in the line (🎟️ ${owed} owed) and we'll run them when they're back on!` : `▶ Battles are back on! 🎟️ ${owed} owed.`);
  }
  pushState(); maraCount(true); return { ...r, paused: !!db.paidPaused, warn, ticker: live.ticker };
}
app.get('/api/mara/ticker', async (req, res) => { // (checks OBS: is it showing in the scene you're in?)
  try { const r = await obs.tickerState(); live.ticker = { on: r.on, scene: r.scene, checkedAt: Date.now() }; } catch (e) { live.ticker = { ...live.ticker, err: e.message, checkedAt: Date.now() }; }
  res.json({ ...live.ticker, cfg: tickerCfg(), paused: !!db.paidPaused });
});
app.post('/api/mara/ticker/show', wTry(async b => !paid.dev() && b.on !== false ? (() => { throw new Error('The paused message is a 🛠️ dev mode feature.'); })() : b.here ? tickerShow(true, true) : tickerShow(b.on === 'toggle' ? !db.paidPaused : !!b.on))); // (here: paused already, show it in the scene you switched to)
app.post('/api/mara/ticker', wTry(b => { if (!paid.dev()) throw new Error('The paused message is a 🛠️ dev mode feature.'); // ✏️ words + look (saved right away, the OBS page changes live)
  const c = { ...(db.settings.marathon || {}) }, t = { ...(c.ticker || {}) };
  if ('text' in b) { const v = String(b.text || '').replace(/\s+/g, ' ').trim().slice(0, 600); if (v && v !== TICKER_TEXT) t.text = v; else delete t.text; }
  if (b.speed != null) t.speed = Math.max(40, Math.min(400, Number(b.speed) || 140));
  if (b.size != null) t.size = Math.max(20, Math.min(90, Number(b.size) || 44));
  if (b.pos === 'top' || b.pos === 'bottom') t.pos = b.pos;
  if (typeof b.band === 'boolean') t.band = b.band;
  c.ticker = t; db.settings.marathon = c; save(); broadcast(tickerMsg(), 'ticker'); pushState(); return tickerCfg();
}));
// ---------- 🔄 Keep OBS up to date + 🎬 My videos (1.86.0, Derek: "give me an option to make sure new stuff is added to OBS") ----------
// Keep OBS up to date (setting obsKeep, on by default): on start (45 s) and every 10 minutes Movie Royal checks the OBS pieces you've
// turned on (🎉 celebration, 📣 roll call, 🏃 marathon counter, 🎬 your videos) and puts back / adds what's missing. After an update
// it also tops up the 🧰 marathon scenes once (only while OBS has the marathon scenes open and you're not live; never switches scenes).
const VIDEO_EXT = /\.(mp4|webm|mov|mkv|m4v|avi|flv|gif)$/i;
const obsVideos = () => (Array.isArray(db.settings.obsVideos) ? db.settings.obsVideos : []);
const videoInput = v => obs.VIDEO_PREFIX + v.name;
const videosFolder = () => { const h = process.env.USERPROFILE || process.env.HOME; return h ? path.join(h, 'Videos') : null; };
function videoFiles() {
  const d = videosFolder(); if (!d) return [];
  try { return fs.readdirSync(d).filter(f => VIDEO_EXT.test(f)).map(f => { const st = fs.statSync(path.join(d, f)); return { name: f, file: path.join(d, f), mb: Math.round(st.size / 1e5) / 10, at: st.mtimeMs }; }).sort((a, b) => b.at - a.at).slice(0, 80); } catch { return []; }
}
const videoName = n => String(n || '').replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, ' ').trim().slice(0, 50);
async function videoApply(v, coll) {
  if (v.on === false) { await videoUnhide(v); return obs.videoSource(videoInput(v), { on: false }); }
  if (!v.file || !fs.existsSync(v.file)) throw new Error(`The video file isn't there any more (${v.file || 'no file'}): pick it again.`);
  const r = await obs.videoSource(videoInput(v), { file: v.file, scenes: v.scenes || [], loop: v.loop !== false, cover: !!v.cover });
  if (r.hid?.length) { if (coll === undefined) coll = (await obs.obsSetups().catch(() => ({}))).collection || ''; v.hidden = [...(v.hidden || []), ...r.hid.map(h => ({ ...h, coll }))].slice(-60); save(); }
  return r;
}
async function videoUnhide(v) { // (1.86.1) the backgrounds a video switched off come back when it's turned off / removed (this scene collection's ones)
  if (!v.hidden?.length) return; const coll = (await obs.obsSetups().catch(() => null))?.collection; if (coll == null) return;
  const mine = v.hidden.filter(h => h.coll === coll); if (!mine.length) return;
  await obs.showItems(mine).catch(() => {}); v.hidden = v.hidden.filter(h => h.coll !== coll); save();
}
// 🌴 Ready-made backgrounds (1.86.1, Derek: "videos are not installed on my obs"): when one of these files is in your Videos folder,
// Keep OBS up to date puts it on 🎬 My videos BY ITSELF and into the matching scenes of each scene collection the first time that
// collection is open (and you're not live): its own background switched off, video behind everything. Taking it off the list =
// it's never added again (settings.obsVideoAuto[key] = 'gone'). Scenes can still be changed in 🎬 Scenes.
const READY_VIDEOS = [
  { key: 'vice-bg', file: /^vice background\b.*\.(mp4|mov|mkv|webm)$/i, name: 'Vice background', want: /chatting/i },
  { key: 'vice-start', file: /^vice starting soon\b.*\.(mp4|mov|mkv|webm)$/i, name: 'Vice starting soon', want: /starting|\bsoon\b/i },
  { key: 'vice-end', file: /^vice thanks for watching\b.*\.(mp4|mov|mkv|webm)$/i, name: 'Vice thanks for watching', want: /ending|\bend\b|thanks|outro|offline|goodbye/i, make: '👋 Thanks for Watching' },
];
async function readyVideos(setup, isLive) {
  const files = videoFiles(), seen = db.settings.obsVideoAuto || {}, notes = [];
  for (const R of READY_VIDEOS) {
    if (seen[R.key] === 'gone') continue;
    const f = files.find(x => R.file.test(x.name)); if (!f) continue;
    const list = obsVideos().slice(); let v = list.find(x => x.auto === R.key);
    if (!v) { v = { id: uid(), name: list.some(x => x.name.toLowerCase() === R.name.toLowerCase()) ? R.name + ' 2' : R.name, file: f.file, scenes: [], on: true, loop: true, at: Date.now(), auto: R.key, cover: true, autoColl: [] }; list.push(v); db.settings.obsVideos = list; db.settings.obsVideoAuto = { ...seen, [R.key]: 'added' }; save(); notes.push(`🎬 ${v.name} added to My videos`); act('stream', `🎬 Found “${f.name}” in your Videos folder: added it to 🎬 My videos`, { icon: '🎬', kind: 'obs' }); }
    if (!fs.existsSync(v.file)) v.file = f.file;
    if (isLive || v.on === false || (v.autoColl || []).includes(setup.collection)) continue;
    let names = []; try { names = ((await obs.sceneList(videoInput(v))).scenes || []).map(s => s.name ?? s); } catch { continue; }
    let hit = names.filter(n => R.want.test(n) && !/^\s*-/.test(n) && n !== obs.CO_SCENE);
    if (!hit.length && R.make && setup.collection === db.settings.marathon?.obsSetup?.collection) { try { await obs.makeScene(R.make); hit = [R.make]; notes.push(`made the scene ${R.make}`); } catch {} }
    v.autoColl = [...(v.autoColl || []), setup.collection]; v.scenes = [...new Set([...(v.scenes || []), ...hit])]; save();
  }
  return notes;
}
let obsSyncBusy = false; live.obsSync = null;
async function obsSync(why = 'check', force = false) {
  if (db.settings.obsOn === false) return (live.obsSync = { at: Date.now(), why, items: [], note: 'Movie Royal isn\'t allowed to use OBS (the switch at the top of Settings → 🎥 OBS).' });
  if (!force && db.settings.obsKeep === false) return live.obsSync;
  if (obsSyncBusy) return live.obsSync; obsSyncBusy = true;
  const items = [], add = (id, name, ok, msg) => items.push({ id, name, ok, msg });
  try {
    let setup; try { setup = await obs.obsSetups(); } catch (e) { live.obsSync = { at: Date.now(), why, items, note: 'OBS isn\'t open (or Movie Royal can\'t reach it), so nothing was checked. It checks again when OBS is open.' }; return live.obsSync; }
    const live_ = await obs.streaming().catch(() => false);
    const r1 = (r, what) => r.added ? `added to ${r.added} scene${r.added === 1 ? '' : 's'}` : r.fileChanged ? 'video file updated' : `${what || 'everything'} is there`;
    if (db.settings.choiceObs && twitch.status.userId) { try { const f = await choiceFile(); add('choice', '🎉 Viewer\'s choice celebration', true, r1(await obs.celebrateSource(true, f.file, choicePick()))); } catch (e) { add('choice', '🎉 Viewer\'s choice celebration', false, e.message); } }
    if (db.settings.rollObs) { try { add('roll', '📣 Roll call', true, r1(await obs.rollSource(true, rollUrl(), Array.isArray(db.settings.rollScenes) && db.settings.rollScenes.length ? db.settings.rollScenes : null))); } catch (e) { add('roll', '📣 Roll call', false, e.message); } }
    if (feat('songs') && songs.opts().vodRoute) { try { const r = await musicObs(true); add('music', '🎚️ Song request music (off the VOD track)', true, r1(r)); if (r.state && (!r.state.vod.on || r.state.vod.same)) add('musicVod', '🎚️ Twitch VOD track', false, 'OBS has no separate Twitch VOD track switched on, so the music still goes on the VOD: open Chat bot → Songs → Settings → 🎚️ and press Set it up.'); } catch (e) { add('music', '🎚️ Song request music (off the VOD track)', false, e.message); } }
    if (sfxWanted()) { try { add('sfx', '🔊 Sound alerts (every scene)', true, r1(await obs.sfxSource(true, sfxUrl()))); } catch (e) { add('sfx', '🔊 Sound alerts (every scene)', false, e.message); } }
    if (db.settings.mnObs && feat('movienight')) { try { add('mnight', '🍿 Movie night leaderboard', true, r1(await obs.mnSource(true, mnUrl(), Array.isArray(db.settings.mnScenes) && db.settings.mnScenes.length ? db.settings.mnScenes : null))); } catch (e) { add('mnight', '🍿 Movie night leaderboard', false, e.message); } }
    const mc = db.settings.marathon || {};
    if (paid.dev() && mc.obs && Array.isArray(mc.scenes) && mc.scenes.length && mc.obsSetup?.collection !== undefined && setup.collection === mc.obsSetup?.collection) { try { add('mara', '🏃 Marathon counter', true, r1(await obs.maraSource(true, maraUrl(), mc.scenes))); } catch (e) { add('mara', '🏃 Marathon counter', false, e.message); } }
    const ms = mc.obsSetup;
    if (paid.dev() && ms?.madeAt) {
      const nm = '🧰 Marathon scenes';
      if (setup.collection !== ms.collection || setup.profile !== ms.profile) add('marasetup', nm, null, `waiting until OBS has your “${ms.collection}” scenes open`);
      else if (live_) add('marasetup', nm, null, 'waiting until you\'re not live (OBS can\'t change these while streaming)');
      else if (!force && db.settings.obsSyncVer === PKG.version) add('marasetup', nm, true, `up to date for v${PKG.version}`);
      else { try { const r = await maraObsSetup({ go: true, keepScene: true }); db.settings.obsSyncVer = PKG.version; save(); const last = (r.steps || []).filter(x => x.icon === '🎬').pop(); add('marasetup', nm, true, last ? last.text.replace(/^Filled in the scenes .*? \(/, '(') : 'checked'); } catch (e) { add('marasetup', nm, false, e.message); } }
    }
    try { await readyVideos(setup, live_); } catch (e) { console.error('[obs] ready-made videos: ' + e.message); }
    for (const v of obsVideos()) { if (v.on === false) continue; if (!(v.scenes || []).length) { add('video:' + v.id, '🎬 ' + v.name, null, v.auto ? (live_ ? 'waiting until you\'re not live' : 'no matching scene in this scene collection: pick some in 🎬 Scenes') : 'no scenes picked yet (🎬 Scenes)'); continue; } try { add('video:' + v.id, '🎬 ' + v.name, true, r1(await videoApply(v, setup.collection), 'the video')); } catch (e) { add('video:' + v.id, '🎬 ' + v.name, (v.auto && /aren't in OBS right now/.test(e.message)) ? null : false, v.auto && /aren't in OBS right now/.test(e.message) ? 'none of its scenes are in this scene collection' : e.message); } }
    live.obsSync = { at: Date.now(), why, items };
    const fixed = items.filter(x => x.ok && /^added|updated/.test(x.msg || '')); if (fixed.length && why !== 'button') { broadcast({ type: 'toast', text: `🔄 Put back in OBS: ${fixed.map(x => x.name).join(', ')}`, ms: 7000 }, 'control'); act('stream', `🔄 Keep OBS up to date added: ${fixed.map(x => `${x.name} (${x.msg})`).join(', ')}`, { icon: '🔄', kind: 'obs' }); }
    return live.obsSync;
  } finally { obsSyncBusy = false; pushState(); }
}
setTimeout(() => obsSync('start').catch(() => {}), 45000);
setInterval(() => obsSync('timer').catch(() => {}), 10 * 60000);
app.post('/api/obs/sync', wTry(async b => { if ('keep' in b) { db.settings.obsKeep = !!b.keep; save(); pushState(); if (!b.keep) return { keep: false, last: live.obsSync }; } return { keep: db.settings.obsKeep !== false, last: await obsSync('button', true) }; }));
app.get('/api/obs/videos', (req, res) => res.json({ list: obsVideos().map(v => ({ ...v, exists: !!v.file && fs.existsSync(v.file) })), folder: videosFolder(), files: videoFiles(), canPick: !!globalThis.__desktop?.pickFile }));
app.post('/api/obs/videos/pick', wTry(async () => { if (!globalThis.__desktop?.pickFile) throw new Error('Picking a file only works in the Windows app: type or paste the file\'s address instead.'); return { file: await globalThis.__desktop.pickFile('Pick a video for OBS', ['mp4', 'webm', 'mov', 'mkv', 'm4v', 'avi', 'flv', 'gif']) }; }));
app.post('/api/obs/videos', wTry(async b => { // add / change / remove one of your videos ({id?, name, file, scenes, on, loop, remove})
  const list = obsVideos().slice(); let v = b.id ? list.find(x => x.id === b.id) : null;
  if (b.remove) { if (!v) throw new Error('That video is gone already.'); try { await videoUnhide(v); await obs.videoSource(videoInput(v), { on: false }); } catch {} if (v.auto) db.settings.obsVideoAuto = { ...(db.settings.obsVideoAuto || {}), [v.auto]: 'gone' }; db.settings.obsVideos = list.filter(x => x !== v); save(); pushState(); act('stream', `🎬 Took “${v.name}” out of OBS`, { icon: '🎬', kind: 'obs' }); return { removed: true }; }
  if (!v) { const file = String(b.file || '').trim().replace(/^"|"$/g, ''); if (!file) throw new Error('Pick a video file first.'); if (!VIDEO_EXT.test(file)) throw new Error('That isn\'t a video file Movie Royal knows (mp4, webm, mov, mkv…).'); if (!fs.existsSync(file)) throw new Error(`Can't find that file on this PC: ${file}`);
    const name = videoName(b.name || path.basename(file).replace(VIDEO_EXT, '')); if (!name) throw new Error('Give it a name.'); if (list.some(x => x.name.toLowerCase() === name.toLowerCase())) throw new Error('You already have a video with that name.');
    v = { id: uid(), name, file, scenes: [], on: true, loop: true, at: Date.now() }; list.push(v); }
  const old = { ...v };
  if (b.file && b.file !== v.file) { const f = String(b.file).trim().replace(/^"|"$/g, ''); if (!fs.existsSync(f)) throw new Error(`Can't find that file on this PC: ${f}`); v.file = f; }
  if (b.name && videoName(b.name) && videoName(b.name) !== v.name) { if (list.some(x => x !== v && x.name.toLowerCase() === videoName(b.name).toLowerCase())) throw new Error('You already have a video with that name.'); v.name = videoName(b.name); }
  if (Array.isArray(b.scenes)) v.scenes = b.scenes.map(String).slice(0, 60);
  if ('on' in b) v.on = !!b.on; if ('loop' in b) v.loop = !!b.loop;
  if ('cover' in b) { v.cover = !!b.cover; if (!v.cover) await videoUnhide(v); }
  db.settings.obsVideos = list; save(); pushState();
  if (old.name !== v.name) { try { await obs.videoSource(obs.VIDEO_PREFIX + old.name, { on: false }); } catch {} } // (renamed: the old source goes)
  if (!v.scenes.length && v.on !== false) return { video: v, note: 'Saved. Now pick the scenes it goes in (🎬 Scenes).' };
  const r = await videoApply(v); act('stream', v.on === false ? `🎬 Took “${v.name}” out of OBS` : `🎬 “${v.name}” is in OBS: ${v.scenes.length} scene${v.scenes.length === 1 ? '' : 's'}`, { icon: '🎬', kind: 'obs' });
  return { video: v, ...r };
}));
app.post('/api/obs/videos/reload', wTry(async b => { const v = obsVideos().find(x => x.id === b.id); if (!v) throw new Error('That video is gone.'); return obs.videoReload(videoInput(v)); }));
app.post('/api/obs/mara-source', async (req, res) => { try { if (req.body?.on && !paid.dev()) throw new Error('The marathon counter is a 🛠️ dev mode feature.'); const on = !!req.body?.on, sc = req.body?.scenes; const c = { ...(db.settings.marathon || {}) }; if (on && Array.isArray(sc)) { if (!sc.length) throw new Error('Pick at least one OBS scene for it.'); c.scenes = sc.map(String).slice(0, 200); } const pick = Array.isArray(c.scenes) && c.scenes.length ? c.scenes : null; const r = await obs.maraSource(on, maraUrl(), pick); c.obs = on; db.settings.marathon = c; save(); pushState(); res.json({ ok: true, url: maraUrl(), ...r }); } catch (e) { pushState(); res.status(400).json({ error: e.message }); } });
app.post('/api/test/mara-chat', wTry(b => { const name = String(b.name || 'Test_Viewer'); return marathon.pick({ login: name.toLowerCase(), name, [b.kind === 'map' ? 'map' : 'luck']: b.value, via: b.via === 'site' ? 'site' : 'chat' }); })); // 🧪 pretend Test_Viewer types map # / luck # (or picks on the website)
app.post('/api/test/mara-pop', wTry(b => { broadcast(maraPopMsg({ who: String(b.name || 'Test_Viewer'), n: Number(b.n) || 1, what: String(b.what || 'a $5 tip'), test: true }), 'mara'); return { maps: marathon.maps().length, items: marathon.items().length }; }));
app.post('/api/paid/remove', wTry(b => { paid.remove(b.id); return paid.info(); }));
app.post('/api/paid/move', wTry(b => { paid.move(b.id, Number(b.dir)); return paid.info(); }));
app.post('/api/paid/add', wTry(b => { paid.byHand(b.who, b.what, b.n); return paid.info(); }));
app.post('/api/test/paid', wTry(b => { const name = String(b.name || 'Test_Viewer'), login = name.toLowerCase(), k = String(b.kind || 'tip'); const items = k === 'bits' ? paid.onBits({ login, name, bits: Number(b.amount) || 500, test: true }) : k === 'sub' || k === 'gift' ? paid.onSub({ kind: k, login, name, recipient: k === 'gift' ? 'someone' : null, test: true }) : paid.onTip({ name, amount: Number(b.amount) || 5, test: true }); return { added: items.length, ...paid.info() }; }));
app.post('/api/test/paid-clear', wTry(() => { paid.clearTests(); return paid.info(); }));
// 🌐 Viewer website (1.75.0)
app.get('/api/site', (req, res) => res.json({ ...site.info(), command: db.settings.siteCommand || '!site', predict: db.settings.sitePredict !== false }));
// 🔑 (1.80.1, Derek: stuck on the Twitch step) does Twitch know the website's address yet? Ask Twitch's sign-in page with that
// address as the "send them back to" address, without signing anyone in: Twitch answers "redirect_uri does not match" when it
// isn't in the app's OAuth Redirect URLs. (Couldn't reach Twitch from the cloud test machine: only tested with pretend answers.)
function signinVerdict(status, text) {
  const t = String(text || '');
  if (/redirect_mismatch|redirect_uri does not match|does not match (the )?registered|redirect uri.{0,40}(mismatch|not match)/i.test(t)) return { ok: false, why: 'missing' };
  if (/invalid[ _]client|client[_ ]id.{0,30}invalid|invalid.{0,20}client[_ ]id/i.test(t)) return { ok: false, why: 'client' };
  if (status >= 200 && status < 400) return { ok: true };
  return { ok: null, why: 'other', note: `Twitch answered ${status}${t ? ': ' + t.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 160) : ''}` };
}
async function siteSigninCheck() {
  const url = site.url(), id = String(db.settings.twitchClientId || '').trim();
  if (!url) return { ok: false, why: 'nosite' };
  if (!id) return { ok: false, why: 'noclient' };
  const q = `https://id.twitch.tv/oauth2/authorize?client_id=${encodeURIComponent(id)}&redirect_uri=${encodeURIComponent(url)}&response_type=token&scope=`;
  let r; try { r = await fetch(q, { redirect: 'manual', headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Movie Royal', Accept: 'text/html,application/json' }, signal: AbortSignal.timeout(15000) }); }
  catch (e) { return { ok: null, why: 'offline', note: e.message }; }
  const v = signinVerdict(r.status, await r.text().catch(() => ''));
  db.siteSignin = { ok: v.ok, at: Date.now(), url }; save(); pushState();
  return { ...v, url };
}
app.post('/api/site/check-signin', wTry(() => siteSigninCheck()));
app.post('/api/test/site-signin', wTry(b => ({ ...signinVerdict(Number(b.status) || 400, String(b.text || '')), pretend: true }))); // 🧪 how a Twitch answer is read
app.post('/api/site/settings', wTry(b => { if (b.siteOn === true && !db.settings.betaUpdates) throw new Error('The viewer website is a 🛠️ dev mode feature for now: turn on Dev mode in Settings → 👤 Account & updates.'); const st = db.settings; for (const k of ['siteOn', 'sitePredict', 'sitePredSay']) if (typeof b[k] === 'boolean') st[k] = b[k]; if (typeof b.siteCommand === 'string') st.siteCommand = b.siteCommand.trim().slice(0, 30) || '!site'; if (typeof b.siteTitle === 'string') st.siteTitle = b.siteTitle.trim().slice(0, 80); save(); site.connect(); pushState(); return site.info(); }));
app.post('/api/site/poll', wTry(b => { const p = site.pollStart(b); paidSay(`🗳️ Poll on the website: “${p.q}” (${p.opts.join(' / ')}). Vote: ${site.url()}`); act('chat', `Poll started on the viewer website: “${p.q}” (${p.opts.join(' / ')})`, { icon: '🗳️', kind: 'poll' }); return site.info(); }));
app.post('/api/site/poll/end', wTry(() => { site.pollEnd(); return site.info(); }));
app.post('/api/site/poll/clear', wTry(() => { site.pollClear(); return site.info(); }));
app.post('/api/site/points/reset', wTry(() => { if (!site.resetPoints()) throw new Error("The viewer website isn't connected right now."); act('chat', 'The viewer website guess points were reset', { icon: '🔮', kind: 'guess' }); return {}; }));
app.post('/api/site/resend', wTry(() => { site.resend(); return site.info(); }));
app.post('/api/test/site-vod', wTry(b => { const sid = 'test-' + Date.now().toString(36); site.setStream({ id: sid, startedAt: Date.now() - (Number(b.minsIn) || 95) * 60000 }); (db.vodIds ||= {})[sid] = String(b.videoId || '1234567890'); save(); return { streamId: sid, note: 'Battles started in the next 20 minutes get a pretend ▶ VOD link (the video id is made up, so the link goes to a missing video).' }; })); // 🧪 pretend this is a live stream with a VOD
app.get('/api/test/site', async (req, res) => { try { res.json({ url: site.url(), info: siteInfo(), live: siteLive(), stats: siteStats(), rows: siteRows().slice(-15).reverse(), profile: await siteProfile(String(req.query.login || db.owner?.login || 'test_viewer')) }); } catch (e) { res.status(500).json({ error: e.message }); } });
app.get('/api/co/stats', async (req, res) => { try { res.json({ ok: true, ...(await obs.coStats()), sending: !!globalThis.__desktop?.coSending?.() }); } catch (e) { res.json({ ok: false, error: e.message }); } });
// 🧪 pretend partner (Test tab): no second PC needed
app.post('/api/test/co', (req, res) => {
  const a = String(req.body?.action || '');
  if (a === 'pretend') { costream.pretend(req.body?.on !== false, { phase: req.body?.phase || 'running', name: req.body?.name }); rewardKey = ''; syncRewards().catch(() => {}); return res.json({ ok: true, ...costream.info() }); }
  if (a === 'phase') { if (!costream.status.pretend) return res.status(400).json({ error: 'Turn on the pretend partner first.' }); costream.status.pretend.state.phase = req.body?.phase === 'idle' ? 'idle' : 'running'; costream.status.pretend.until = Date.now() + 10 * 60000; rewardKey = ''; pushState(); return res.json({ ok: true, ...costream.info() }); }
  if (a === 'send') { // a pretend viewer of yours redeems chaos: where does it go?
    const before = costream.status.pretend?.got.length || 0;
    triggerEvent(req.body?.event || 'comet', { name: 'test_viewer', avatar: null }, 'points');
    const went = (costream.status.pretend?.got.length || 0) > before;
    return res.json({ ok: true, went: went ? 'partner' : (live.phase === 'lobby' || live.phase === 'running') ? 'yours' : 'queued for your next battle', ...costream.info() });
  }
  if (a === 'incoming') { coChaosIn({ event: req.body?.event || 'comet', by: { name: 'their_viewer' }, who: costream.partnerName(), source: 'points' }); return res.json({ ok: true, phase: live.phase }); }
  if (a === 'code') { try { return res.json({ ok: true, read: costream.readCode(costream.makeCode({ url: 'https://movie-royal-bot.example.workers.dev', room: 'testroomtestroom1234', name: streamerName() })) }); } catch (e) { return res.status(400).json({ error: e.message }); } }
  res.status(400).json({ error: 'action?' });
});
app.post('/api/effect', (req, res) => { triggerEvent(req.body.event, { name: streamerName(), avatar: proxied(db.owner?.avatar) }, 'panel'); res.json({ ok: true }); });

app.post('/api/winner/undo', (req, res) => { // movie winner didn't get watched after all: put it back
  const w = live.lastWinner; if (!w) return res.sendStatus(404);
  const e = getList(w.listId)?.entries.find(x => x.id === w.id);
  if (e && e.status === 'watched') { e.status = 'active'; lb.unmarkWatched({ title: e.label, year: e.sub, tmdbId: e.tmdbId }); if (e.luckSnap) { giveLuckBack(e.luckSnap, `you put “${e.label}” back in the pool`); delete e.luckSnap; } }
  act('battle', `put “${w.label}” back in the pool (not watching it after all)`, { icon: '↩️', who: streamerName(), kind: 'putback', list: w.listName }); // 🧾
  const h = findHistory(w.historyId); if (h) { h.outcome = 'put back'; historyVersion++; }
  live.lastWinner.undone = true; save(); pushState(); refreshPreview(); res.json({ ok: true });
});
app.post('/api/winner/out', (req, res) => { // take winner out of the pool (movies: mark watched)
  const w = live.lastWinner; if (!w) return res.sendStatus(404);
  const l = getList(w.listId); const e = l?.entries.find(x => x.id === w.id);
  if (e) e.status = l.type === 'movies' ? 'watched' : 'out';
  act('battle', `took the winner “${w.label}” out of “${l?.name || w.listName}”`, { icon: '🚪', who: streamerName(), kind: 'out', list: l?.name || w.listName }); // 🧾
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
  if (c.instant) { act('battle', `accepted: “${c.winner?.label}” is tonight's pick`, { icon: '✅', who: by === 'you' ? streamerName() : by, kind: 'claim', list: c.winner?.listName, test: !!c.winner?.test }); pinWinner(c.winner); c.claimed = true; c.done = true; delete c.waiting; const h = findHistory(c.winner?.historyId); if (h) { h.claimed = 'instant'; historyVersion++; } db.noShowStreak = 0; save(); broadcast({ type: 'claimedDirect', winner: c.winner, text }, 'overlay'); pushState(); }
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
  act('battle', `passed on “${w.label}”: it goes back in the pool${getList(w.listId)?.type === 'movies' ? ' and keeps its luck' : ''}`, { icon: '⏭️', who: by === 'you' ? streamerName() : by, kind: 'pass', list: w.listName, test: !!w.test }); // 🧾
  live.lastWinner.passed = true; save();
  broadcast({ type: 'claimPassed', winner: w }, 'overlay'); pushState(); refreshPreview();
  if (by !== 'you') broadcast({ type: 'toast', text: `⏭️ ${by} passed: their movie goes back in and keeps its luck.` }, 'control');
  return null;
}
app.post('/api/claim/accept', (req, res) => { const err = acceptClaim(); err ? res.status(400).json({ error: err }) : res.json({ ok: true }); });
app.post('/api/claim/pass', (req, res) => { const w = live.claim?.winner || live.lastWinner, err = passClaim(); if (!err) setTimeout(() => askSitOut(w), 1500); err ? res.status(400).json({ error: err }) : res.json({ ok: true }); });
app.post('/api/battle/redo', async (req, res) => { // 🔁 the winner passed: battle again right away, without that movie
  const w = live.lastWinner; if (!w?.passed || !w.listId) return res.status(400).json({ error: 'Only after a winner passed.' });
  if (live.phase === 'lobby' || live.phase === 'running') return res.status(400).json({ error: 'A battle is already going.' });
  if (live.claim) clearTimeout(live.claim.timer); live.claim = null;
  if (db.activeListId !== w.listId && getList(w.listId)) db.activeListId = w.listId;
  live.redoSkip = { listId: w.listId, id: w.id, label: w.label }; live.phase = 'idle'; live.game = null; live.lastWinner = { ...w, redone: true };
  broadcast({ type: 'reset' }, 'overlay'); await refreshPreview(true);
  const err = await startRound(w.test ? { test: true } : {}); if (err) { live.redoSkip = null; pushState(); return res.status(400).json({ error: err }); }
  broadcast({ type: 'toast', text: `🔁 Battle again without ${hEsc(w.label)}` }, 'control'); res.json({ ok: true });
});
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
// 🔐 Only this computer: the app listens on this PC's own address, not on the network (before 1.96.0 it listened everywhere and turned others away at the door).
if (!process.env.ALLOW_LAN) { const s6 = http.createServer(app); s6.on('upgrade', (req, sock, head) => { if (!wss.shouldHandle(req)) return sock.destroy(); wss.handleUpgrade(req, sock, head, ws => wss.emit('connection', ws, req)); }); s6.on('error', () => {}); s6.listen(PORT, '::1'); } // ("localhost" can mean ::1 on Windows)
server.listen(PORT, process.env.ALLOW_LAN ? '0.0.0.0' : '127.0.0.1', async () => {
  resumeLoad(); // 🔄 opened again soon after closing (an update while live): put back what was going on
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
  setTimeout(() => { try { activityBackfill(); } catch (e) { console.error('[history] filling in the older history:', e.message); } }, 6000); // 🧾 (once)
  setInterval(() => discord.keepPinsOnTop().catch?.(() => {}), 30 * 60 * 1000); // 📌 Movie Royal's pinned messages stay on top
  setInterval(() => { const a = rollWeek(), b = restoreAway(true); if (a || b) { pushState(); refreshPreview(); } }, 5 * 60 * 1000);
  const tick = async () => { await lb.refreshRss(db.settings.letterboxdUser); sweepWatched(); pushState(); };
  tick(); setInterval(tick, 30 * 60 * 1000);
  const full = async (first) => { if (!db.settings.letterboxdUser) return; await lb.refreshProfile(db.settings.letterboxdUser); const n = sweepWatched(); pushState(); if (first) { const st = lb.stats(); setTimeout(() => broadcast({ type: 'toast', text: st.profileError ? `📗 Couldn't update Letterboxd: ${st.profileError}` : `📗 Letterboxd updated: ${st.count} watched${n ? `, ${n} taken out of the battles` : ''}` }, 'control'), 1500); } };
  const lbFirst = full(true); setInterval(full, 6 * 60 * 60 * 1000); // whole profile when the app opens, then every 6 hours
  runOpenLast(lbFirst).catch(() => {}); // 🔚 the last thing on open: 🎞️ series bans, then the 🌐 web lists
});

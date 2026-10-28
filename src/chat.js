// 💬 Twitch chat history, alerts, per-viewer stats (chat counts, watch time, streaks, sub months) and emotes.
// Chat is saved per day in data/chat/YYYY-MM-DD.jsonl so you can search it later and see anyone's chat log.
import fs from 'fs';
import path from 'path';
import { db, save, DATA, norm } from './store.js';

const DIR = path.join(DATA, 'chat');
fs.mkdirSync(DIR, { recursive: true });
const recent = [];      // the last messages (in memory, for the Chat tab)
const MAX = 1500;
let hooks = { send: () => {} };
export function initChat(h) { hooks = { ...hooks, ...h }; V(); }

const V = () => { db.viewers ||= {}; db.alerts ||= []; return db.viewers; };
const day = (t = Date.now()) => new Date(t).toLocaleDateString('en-CA'); // YYYY-MM-DD in your time zone
const month = (t = Date.now()) => day(t).slice(0, 7), year = (t = Date.now()) => day(t).slice(0, 4);
const streamKey = () => db.stream?.startedAt || 0;
// 🔗 only viewers who linked their Twitch in Discord (/linktwitch) get stats (setting trackLinkedOnly, on by default). Chat is still logged for everyone.
let linkedCache = { at: 0, set: new Set() };
export function tracked(login) {
  if (db.settings.trackLinkedOnly === false) return true;
  const k = String(login || '').toLowerCase(); if (!k) return false;
  if (Date.now() - linkedCache.at > 5000) linkedCache = { at: Date.now(), set: new Set([...Object.values(db.links || {}).map(x => String(x).toLowerCase()), String(db.owner?.login || '').toLowerCase()]) };
  return linkedCache.set.has(k);
}
export function viewer(login, name) {
  const k = String(login || '').toLowerCase(); if (!k) return null;
  const v = V()[k] ||= { login: k, name: name || k, first: Date.now(), last: 0, msgs: 0, byMonth: {}, byYear: {}, streamMsgs: 0, streamKey: 0, watchMins: 0, streamWatch: 0, subMonths: 0, streak: 0 };
  if (name) v.name = name;
  return v;
}

let saveT = null; const soon = () => { clearTimeout(saveT); saveT = setTimeout(save, 4000); };

// 🔥 Movie Royal's own watch streak: someone "watched" a stream if they chatted or were in the viewer list at some point while you were live.
// streamList = every stream [{ start, end }] (oldest first); a viewer's `watched` = the starts of the streams they watched.
const SL = () => (db.streamList ||= []);
const NEAR = 15 * 60000;
/** The stream that was on between start and end (made if new). Returns its key (its start time).
 *  Every stream is kept on its own: it's the same stream only if it started at about the same time (within 10 minutes),
 *  or this sighting is inside a stream we already know. Ending and starting again later = a new stream. */
export function streamAt(start, end = start) {
  const L = SL(), SLACK = 2 * 60000;
  let e = L.find(x => Math.abs(x.start - start) < 10 * 60000) || L.find(x => start >= x.start - SLACK && start <= (x.end || x.start) + SLACK);
  if (e) { e.end = Math.max(e.end || e.start, end); return e.start; }
  e = { start, end }; L.push(e); L.sort((a, b) => a.start - b.start); if (L.length > 600) L.splice(0, L.length - 600);
  return e.start;
}
const liveKey = () => db.live && db.stream?.startedAt ? streamAt(db.stream.startedAt, Date.now()) : null; // (pretend-live tests don't count)
export function markWatched(login, name, key) {
  if (!key || !tracked(login)) return; const v = viewer(login, name); if (!v) return;
  v.watched ||= []; if (v.watched.includes(key)) return;
  v.watched.push(key); v.watched.sort((a, b) => a - b); if (v.watched.length > 600) v.watched.splice(0, v.watched.length - 600);
  soon();
}
/** How many streams in a row they watched, counting back from the newest. The stream that's on right now doesn't break it if they haven't shown up yet. */
/** The last few streams, newest first: did they watch each one? (for the profile) */
export function lastStreams(v, n = 10) { const have = new Set(v?.watched || []); return SL().slice(-n).reverse().map(x => ({ start: x.start, end: x.end, watched: have.has(x.start) })); }
export function watchStreak(v) {
  if (!v?.watched?.length) return 0;
  const have = new Set(v.watched), L = SL(); let n = 0;
  for (let i = L.length - 1; i >= 0; i--) {
    if (have.has(L[i].start)) n++;
    else if (i === L.length - 1 && db.live && Date.now() - (L[i].end || 0) < NEAR) continue;
    else break;
  }
  return n;
}
export function onChat(m, opts = {}) {
  const t = opts.imported ? (m.at || Date.now()) : Date.now(); // imported = chat the backup bot server saw while Movie Royal was closed
  const v = tracked(m.login) ? viewer(m.login, m.name) : null;
  if (v) {
  v.last = Math.max(v.last || 0, t); v.msgs++; v.byMonth[month(t)] = (v.byMonth[month(t)] || 0) + 1; v.byYear[year(t)] = (v.byYear[year(t)] || 0) + 1;
  if (!opts.imported || (streamKey() && t >= streamKey())) { // (old chat doesn't count toward this stream)
    if (v.streamKey !== streamKey()) { v.streamKey = streamKey(); v.streamMsgs = 0; v.streamWatch = 0; }
    v.streamMsgs++;
  }
  if (m.userId) v.id = m.userId; if (m.color) v.color = m.color;
  if (m.badges?.months) v.subMonths = Math.max(v.subMonths || 0, m.badges.months);
  if (!opts.imported || t >= (v.badgesAt || 0)) { v.sub = !!m.badges?.sub; v.mod = !!m.badges?.mod; v.vip = !!m.badges?.vip; v.badgesAt = t; }
  if (!v.first || t < v.first) v.first = t;
  }
  const msg = { id: m.id || `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, at: m.at || Date.now(), login: m.login, name: m.name, text: m.text, color: m.color || null, emotes: m.emotes || '', badges: m.badgeList || '', ...(opts.imported ? { offline: 1 } : {}) };
  if (!opts.imported) { recent.push(msg); if (recent.length > MAX) recent.splice(0, recent.length - MAX); }
  try { fs.appendFileSync(path.join(DIR, day(msg.at) + '.jsonl'), JSON.stringify(msg) + '\n'); } catch {}
  if (!opts.imported) { hooks.send({ type: 'chatmsg', msg }); markWatched(m.login, m.name, liveKey()); }
  else if (m.ls) markWatched(m.login, m.name, streamAt(m.ls, msg.at)); // (the backup saw them chat while you were live)
  soon();
}
/** 🛡️ Chat (and subs / streaks) the backup bot server saw while Movie Royal was closed: add it to the viewer profiles and the chat log.
 *  Skips any message Movie Royal already has (same message id in that day's chat file). Returns how many were new. */
export function importChat(list) {
  if (!Array.isArray(list) || !list.length) return 0;
  list = [...list].sort((a, b) => (a.at || 0) - (b.at || 0));
  const have = new Set();
  for (const d of new Set(list.map(r => day(r.at || Date.now())))) {
    try { for (const l of fs.readFileSync(path.join(DIR, d + '.jsonl'), 'utf8').split('\n')) { if (!l) continue; try { const id = JSON.parse(l).id; if (id) have.add(id); } catch {} } } catch {}
  }
  let n = 0;
  for (const r of list) {
    const { t, ...rec } = r;
    if (t === 'watch') { const key = streamAt(rec.start, rec.end || rec.start); for (const l of rec.logins || []) markWatched(l, null, key); continue; } // the backup's viewer list while you were live
    if (t === 'alert') {
      if (db.alerts.some(a => a.kind === rec.kind && a.login === rec.login && Math.abs((a.at || 0) - (rec.at || 0)) < 60000)) continue;
      onAlert({ ...rec, offline: 1 }); continue;
    }
    if (!rec.login || (rec.id && have.has(rec.id))) continue;
    if (rec.id) have.add(rec.id);
    onChat(rec, { imported: true }); n++;
  }
  db.alerts.sort((a, b) => (b.at || 0) - (a.at || 0));
  save();
  return n;
}
export function onClear(c) { // a deleted message, a timeout or a ban
  for (const m of recent) if ((c.id && m.id === c.id) || (c.login && m.login === c.login)) m.gone = c.id ? 'deleted' : c.duration ? `timed out ${c.duration}s` : 'banned';
  hooks.send({ type: 'chatclear', ...c });
}
export function onAlert(a) {
  const al = db.alerts, now = Date.now();
  if (a.kind === 'gift' && a.amount === 1 && al.some(x => x.kind === 'gift' && x.login === a.login && x.amount > 1 && now - x.at < 20000)) return; // one alert per gift bomb
  const tv = () => tracked(a.login) ? viewer(a.login, a.name) : null;
  if (a.kind === 'sub' && a.months) { const v = tv(); if (v) v.subMonths = Math.max(v.subMonths || 0, a.months); }
  if (a.kind === 'streak') { const v = tv(); if (v) { v.streak = a.amount; v.streakAt = now; } }
  if (a.kind === 'follow') { const v = tv(); if (v) v.followedAt = a.at || now; }
  const x = { id: now.toString(36) + Math.random().toString(36).slice(2, 5), at: now, ...a };
  al.unshift(x); if (al.length > 500) al.length = 500;
  hooks.send({ type: 'chatalert', alert: x }); soon();
}
// ⏱️ watch time: every 5 minutes while live, everyone in chat gets 5 minutes
export function tickWatch(list) {
  if (!list) return;
  const key = liveKey(); for (const c of list) markWatched(c.login, c.name, key); // in the viewer list while live = watched this stream
  for (const c of list) { if (!tracked(c.login)) continue; const v = viewer(c.login, c.name); if (!v) continue; if (v.streamKey !== streamKey()) { v.streamKey = streamKey(); v.streamMsgs = 0; v.streamWatch = 0; } v.watchMins += 5; v.streamWatch += 5; v.lastSeen = Date.now(); if (c.id) v.id = c.id; }
  soon();
}

export const getRecent = (n = 400) => recent.slice(-n);
export const getAlerts = (n = 100) => db.alerts.slice(0, n);
// search old chat (last `days` days of files)
export function search({ q = '', login = '', days = 30, limit = 300 } = {}) {
  const files = fs.readdirSync(DIR).filter(f => f.endsWith('.jsonl')).sort().reverse().slice(0, days), out = [], ql = String(q).toLowerCase(), lg = String(login).toLowerCase();
  for (const f of files) {
    let lines; try { lines = fs.readFileSync(path.join(DIR, f), 'utf8').trim().split('\n').reverse(); } catch { continue; }
    for (const l of lines) { let m; try { m = JSON.parse(l); } catch { continue; } if (lg && m.login !== lg) continue; if (ql && !(`${m.name} ${m.text}`.toLowerCase().includes(ql))) continue; out.push(m); if (out.length >= limit) return out; }
  }
  return out;
}
export function names(q) { // usernames seen in chat that match (for finding someone)
  const ql = norm(q); return Object.values(V()).filter(v => !ql || norm(v.login).includes(ql) || norm(v.name).includes(ql)).sort((a, b) => (b.last || 0) - (a.last || 0)).slice(0, 60).map(v => ({ login: v.login, name: v.name, last: v.last, msgs: v.msgs }));
}

// 😀 7TV / BTTV / FFZ emotes for your channel (+ their global sets)
let emoteCache = { at: 0, map: {} };
export async function thirdPartyEmotes(twitchId) {
  if (Date.now() - emoteCache.at < 30 * 60000 && emoteCache.for === twitchId) return emoteCache.map;
  const map = {}, get = async (u) => { try { const r = await fetch(u, { headers: { 'User-Agent': 'MovieRoyal' }, signal: AbortSignal.timeout(8000) }); return r.ok ? await r.json() : null; } catch { return null; } };
  const add = (name, url) => { if (name && url && !map[name]) map[name] = url; };
  const [bg, ffg, stvg, bc, ffc, stvc] = await Promise.all([
    get('https://api.betterttv.net/3/cached/emotes/global'), get('https://api.frankerfacez.com/v1/set/global'), get('https://7tv.io/v3/emote-sets/global'),
    twitchId ? get(`https://api.betterttv.net/3/cached/users/twitch/${twitchId}`) : null, twitchId ? get(`https://api.frankerfacez.com/v1/room/id/${twitchId}`) : null, twitchId ? get(`https://7tv.io/v3/users/twitch/${twitchId}`) : null
  ]);
  const sev = set => (set?.emotes || []).forEach(e => { const h = e.data?.host; if (h?.url) add(e.name, `https:${h.url}/1x.webp`); });
  sev(stvc?.emote_set); for (const e of [...(bc?.channelEmotes || []), ...(bc?.sharedEmotes || [])]) add(e.code, `https://cdn.betterttv.net/emote/${e.id}/1x`);
  for (const st of Object.values(ffc?.sets || {})) for (const e of st.emoticons || []) add(e.name, e.urls?.['1'] ? (String(e.urls['1']).startsWith('http') ? e.urls['1'] : 'https:' + e.urls['1']) : null);
  sev(stvg); for (const e of bg || []) add(e.code, `https://cdn.betterttv.net/emote/${e.id}/1x`);
  for (const st of Object.values(ffg?.sets || {})) for (const e of st.emoticons || []) add(e.name, e.urls?.['1'] ? (String(e.urls['1']).startsWith('http') ? e.urls['1'] : 'https:' + e.urls['1']) : null);
  emoteCache = { at: Date.now(), for: twitchId, map };
  return map;
}

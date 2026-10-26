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
export function viewer(login, name) {
  const k = String(login || '').toLowerCase(); if (!k) return null;
  const v = V()[k] ||= { login: k, name: name || k, first: Date.now(), last: 0, msgs: 0, byMonth: {}, byYear: {}, streamMsgs: 0, streamKey: 0, watchMins: 0, streamWatch: 0, subMonths: 0, streak: 0 };
  if (name) v.name = name;
  return v;
}

let saveT = null; const soon = () => { clearTimeout(saveT); saveT = setTimeout(save, 4000); };
export function onChat(m) {
  const v = viewer(m.login, m.name);
  v.last = Date.now(); v.msgs++; v.byMonth[month()] = (v.byMonth[month()] || 0) + 1; v.byYear[year()] = (v.byYear[year()] || 0) + 1;
  if (v.streamKey !== streamKey()) { v.streamKey = streamKey(); v.streamMsgs = 0; v.streamWatch = 0; }
  v.streamMsgs++; if (m.userId) v.id = m.userId; if (m.color) v.color = m.color;
  if (m.badges?.months) v.subMonths = Math.max(v.subMonths || 0, m.badges.months);
  v.sub = !!m.badges?.sub; v.mod = !!m.badges?.mod; v.vip = !!m.badges?.vip;
  const msg = { id: m.id || `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, at: m.at || Date.now(), login: m.login, name: m.name, text: m.text, color: m.color || null, emotes: m.emotes || '', badges: m.badgeList || '' };
  recent.push(msg); if (recent.length > MAX) recent.splice(0, recent.length - MAX);
  try { fs.appendFileSync(path.join(DIR, day() + '.jsonl'), JSON.stringify(msg) + '\n'); } catch {}
  hooks.send({ type: 'chatmsg', msg });
  soon();
}
export function onClear(c) { // a deleted message, a timeout or a ban
  for (const m of recent) if ((c.id && m.id === c.id) || (c.login && m.login === c.login)) m.gone = c.id ? 'deleted' : c.duration ? `timed out ${c.duration}s` : 'banned';
  hooks.send({ type: 'chatclear', ...c });
}
export function onAlert(a) {
  const al = db.alerts, now = Date.now();
  if (a.kind === 'gift' && a.amount === 1 && al.some(x => x.kind === 'gift' && x.login === a.login && x.amount > 1 && now - x.at < 20000)) return; // one alert per gift bomb
  if (a.kind === 'sub' && a.months) { const v = viewer(a.login, a.name); if (v) v.subMonths = Math.max(v.subMonths || 0, a.months); }
  if (a.kind === 'streak') { const v = viewer(a.login, a.name); if (v) { v.streak = a.amount; v.streakAt = now; } }
  if (a.kind === 'follow') { const v = viewer(a.login, a.name); if (v) v.followedAt = a.at || now; }
  const x = { id: now.toString(36) + Math.random().toString(36).slice(2, 5), at: now, ...a };
  al.unshift(x); if (al.length > 500) al.length = 500;
  hooks.send({ type: 'chatalert', alert: x }); soon();
}
// ⏱️ watch time: every 5 minutes while live, everyone in chat gets 5 minutes
export function tickWatch(list) {
  if (!list) return;
  for (const c of list) { const v = viewer(c.login, c.name); if (!v) continue; if (v.streamKey !== streamKey()) { v.streamKey = streamKey(); v.streamMsgs = 0; v.streamWatch = 0; } v.watchMins += 5; v.streamWatch += 5; v.lastSeen = Date.now(); if (c.id) v.id = c.id; }
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

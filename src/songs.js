// 🎵 Song requests + song ratings (1.98.0, made for Birx & Jess; Derek's edition has it in dev mode to try first).
// Chat types "!sr a YouTube link" or "!sr the name of a song". The queue shows in the app; ⏭ Next song moves on. Every song that plays
// goes into the song database with how often it was played, who asked, and the two ratings (Birx's and Jess's): when a song comes round
// again its old ratings show, and can be changed. Banned songs and banned requesters are refused. Old lists (songs, ratings, banned
// songs) can be imported from a spreadsheet or pasted lines. Everything stays on this PC; only a YouTube link's title is looked up.
import { db, save } from './store.js';
import { is } from './edition.js';

const H = { say: async () => {}, act: () => {}, send: () => {}, on: () => false, allowed: async () => true, title: async () => '', info: async () => null, search: async () => [], isBot: () => false, note: () => {}, movieSkip: () => false, plRead: async () => null };
export const setHooks = h => Object.assign(H, h);
export const on = () => !!H.on();
const low = s => String(s || '').trim().toLowerCase().replace(/^@/, '');
const uid = () => Math.random().toString(36).slice(2, 10);
const clampN = (v, lo, hi, d) => { v = Number(v); return Number.isFinite(v) ? Math.max(lo, Math.min(hi, v)) : d; };
export function data(d = (db.songs ||= {})) {
  d.queue ||= []; d.lib ||= {}; d.played ||= []; d.banned ||= []; d.bannedUsers ||= []; d.req ||= {}; d.opts ||= {};
  if (!d.xlog) { d.xlog = d.played.map(p => ({ at: p.at, key: p.key, title: p.title, by: p.by || '', old: 1 })).reverse(); } /* 🎄 (1.154.0) a lasting list of every request (when, which song, who): started from the songs already played */
  if (d.open === undefined) d.open = true;
  if (d.opts.scale === 100) { for (const L of Object.values(d.lib)) if (L.rate) L.rate = L.rate.map(r => (r == null ? null : Math.round(r / 10 * 2) / 2)); d.opts.scale = 10; } /* (1.132.5) "out of 100" is gone: those ratings became out of 10 */
  return d;
}
/** 🛡️ Channels whose music is made to be safe on stream (the "DMCA-free only" switch; you can change the list). No list can promise a song is safe. */
export const DMCA_DEFAULT = ['NoCopyrightSounds', 'StreamBeats', 'Harris Heller', 'Lofi Girl', 'Chillhop Music', 'Audio Library', 'Vlog No Copyright Music', 'Pretzel', 'TheFatRat', 'Bass Rebels', 'Infraction - No Copyright Music', 'Kevin MacLeod', 'Ninety9 LIVE', 'Uppbeat', 'RFM - Royalty Free Music'];
const DMCA_WORDS = /\b(no copyright|copyright[- ]free|royalty[- ]free|dmca[- ]free|stream[- ]safe|ncs release)\b/i;
/** Is this video from a DMCA-free channel (or does its title say so)? */
export function dmcaOk(info, title, o) { const n = s => norm(String(s || '')), who = n(info && info.author), list = (o.dmcaList || DMCA_DEFAULT).map(n).filter(Boolean); return !!((who && list.some(x => who === x || who.includes(x) || x.includes(who))) || DMCA_WORDS.test(String(title || ''))); }
/** Why a looked-up video is refused by the request rules ('' = fine). What YouTube didn't tell us is not held against the song, except for DMCA-free only, which needs to be sure. */
export function infoWhy(info, title, o) {
  if (o.dmcaFree && !dmcaOk(info, title, o)) return 'dmca';
  if (!info) return '';
  if (o.musicOnly && info.category && !/music/i.test(info.category)) return 'notmusic';
  if (o.maxMins > 0 && info.secs > o.maxMins * 60) return 'long';
  if (o.maxMins > 0 && info.live && !info.secs) return 'long';
  if (o.minViews > 0 && info.views != null && info.views < o.minViews) return 'views';
  return '';
}
/** 🔎 (1.131.0, Derek: "make the request song search as smart as possible… look for recorded lyric videos before live versions").
 * YouTube's own order is only a starting point: every result gets points, the best one that passes the request rules wins.
 * + every word you typed that's in the title / channel, the artist's own channel (Topic = the studio recording, VEVO, official artist), the kind you prefer
 *   (lyric video / official audio / official video), lots of views, a normal song length, YouTube's own rank (a little).
 * − live, covers / karaoke, remixes / sped up / nightcore / slowed / 8D / loops, reactions / tutorials / shorts: each only when the request didn't ask for it
 *   ("africa toto live" still finds a live one), a missing word, too short / very long. Pure, so 🧪 can walk it through. */
const SW = new Set(['the', 'a', 'an', 'by', 'and', 'of', 'to', 'in', 'on', 'ft', 'feat', 'featuring', 'song', 'music', 'official', 'video', 'lyrics', 'lyric', 'audio', 'hd', 'hq', 'please', 'pls', 'plz']);
const wordsOf = t => norm0(t).split(' ').filter(w => w && !SW.has(w));
const norm0 = t => String(t || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, ' ').trim();
export const SEARCH_KINDS = {
  live: { re: /[([][^)\]]*\blive\b[^)\]]*[)\]]|\blive (at|from|in|on|version|performance|session|stream)\b|\b(in concert|concert|unplugged|tiny desk|live lounge|kexp|full show|world tour|on tour|festival|glastonbury|coachella|lollapalooza|bbc session|audience|fan ?cam|soundcheck|rehearsal)\b/i, ask: /\b(live|concert|unplugged|tour|session|tiny desk)\b/i, pts: 60, label: 'live' },
  covers: { re: /\b(cover|covers|covered by|karaoke|instrumental|tribute|piano version|guitar version|piano tutorial|8 ?bit|lullaby|parody|a cappella|acapella|backing track|sing along|music box)\b/i, ask: /\b(cover|karaoke|instrumental|tribute|piano|acoustic|8 ?bit|lullaby|parody|a ?cappella|backing)\b/i, pts: 55, label: 'cover / karaoke' },
  edits: { re: /\b(sped up|speed up|nightcore|slowed|reverb|8d|bass ?boost(ed)?|remix|mashup|mash up|loop|looped|\d+ ?hours?|1 ?hr|extended|edit audio|tiktok version|clean version|radio edit|mix)\b/i, ask: /\b(sped|speed|nightcore|slowed|reverb|8d|bass|remix|mashup|mash|loop|hour|extended|edit|mix|tiktok)\b/i, pts: 45, label: 'remix / sped up / loop' },
  junk: { re: /\b(reaction|reacts?|reacting|first time hearing|tutorial|lesson|how to (play|sing)|review|explained|meaning|breakdown|behind the|interview|making of|trailer|teaser|snippet|preview|#shorts|shorts|tiktok compilation|vocals only|isolated|drum cover|bass cover)\b/i, ask: /\b(reaction|tutorial|lesson|review|interview|isolated|vocals only)\b/i, pts: 70, label: 'reaction / tutorial / clip' } };
export const PREFER = { lyrics: { re: /\blyrics?\b|\blyric video\b/i, label: '📝 lyric video' }, audio: { re: /\bofficial audio\b|\(audio\)|\[audio\]|\baudio\b/i, label: '🎧 official audio' }, video: { re: /\bofficial (music )?video\b|\bmusic video\b|\bofficial mv\b|\bmv\b/i, label: '🎬 official video' }, any: { re: /$^/, label: 'any' } };
/** points for one search result (higher = better) + the reasons, for the 🧪 table */
export function scoreResult(r, query, o = {}, rank = 0) {
  const title = String(r.title || ''), who = String(r.author || ''), q = String(query || ''), why = [], add = (n, t) => { if (n) { s += n; why.push((n > 0 ? '+' : '') + Math.round(n) + ' ' + t); } }; let s = 0;
  const qw = [...new Set(wordsOf(q))], hay = ' ' + norm0(title + ' ' + who.replace(/ - topic$/i, '')) + ' ', hit = qw.filter(w => hay.includes(' ' + w + ' ') || (w.length > 4 && hay.includes(' ' + w.slice(0, -1))));
  const cover = qw.length ? hit.length / qw.length : 1; add(Math.round(cover * 40), `of the words you typed are there (${hit.length}/${qw.length})`); if (qw.length >= 2 && cover < .5) add(-40, 'most of the words are missing');
  const a = norm0(who.replace(/ - topic$/i, '').replace(/vevo$/i, '')), artistIn = a && a.length > 1 && (' ' + norm0(q) + ' ').includes(' ' + a + ' ');
  if (/ - topic$/i.test(who)) add(artistIn ? 22 : 12, 'studio recording (a “Topic” channel)'); else if (/vevo$/i.test(who.replace(/\s+/g, ''))) add(16, 'the artist’s VEVO channel');
  else if (r.artist) add(16, 'official artist channel'); else if (artistIn) add(12, 'the artist’s own channel'); else if (r.verified) add(4, 'verified channel');
  const p = PREFER[o.searchPrefer || 'lyrics']; if (p && o.searchPrefer !== 'any' && p.re.test(title)) add(35, p.label + ' (what you prefer)');
  else if ((o.searchPrefer || 'lyrics') !== 'any' && /\bofficial\b/i.test(title) && !/\b(live|teaser|trailer)\b/i.test(title)) add(6, 'official upload');
  if (/ - topic$/i.test(who) && (o.searchPrefer || 'lyrics') === 'audio') add(10, 'Topic = the plain studio audio');
  for (const [k, K] of Object.entries(SEARCH_KINDS)) { const on = k === 'junk' ? o.avoidJunk !== false : k === 'live' ? o.avoidLive !== false : k === 'covers' ? o.avoidCovers !== false : o.avoidEdits !== false;
    const m = title.match(K.re); if (o._asked ? o._asked.has(k) : K.ask.test(q)) { if (m) add(40, `${K.label}: what was asked for`); continue; } if (!on) continue; if (m) add(-K.pts, `${K.label} (“${m[0].replace(/[()[\]]/g, '').trim()}”)`); }
  const secs = r.secs || 0; if (secs) { if (secs < 60) add(-40, 'under a minute (a clip?)'); else if (secs > 15 * 60 && !/\b(hour|hours|album|mix|full)\b/i.test(q)) add(-35, 'over 15 min'); else if (secs >= 100 && secs <= 480) add(5, 'normal song length'); }
  if (r.views != null && r.views > 0) add(Math.min(12, Math.max(0, Math.log10(r.views) - 3) * 2), 'views (' + (r.views >= 1e6 ? Math.round(r.views / 1e5) / 10 + 'M' : r.views >= 1e3 ? Math.round(r.views / 100) / 10 + 'K' : r.views) + ')');
  add(Math.max(0, 8 - rank) * 1.2, 'YouTube’s own order (#' + (rank + 1) + ')');
  return { score: Math.round(s), why };
}
/** the results best first (same video only once). `o.smartSearch === false` = YouTube's own order, like before. */
export function pickBest(results, query, o = {}) {
  const seen = new Set(), list = (results || []).filter(r => r && r.id && !seen.has(r.id) && seen.add(r.id));
  if (o.smartSearch === false) return list.map((r, i) => ({ ...r, score: 0, why: ['YouTube’s own order (#' + (i + 1) + ')'] }));
  /* a kind's word in the request that is really part of the song's name ("Live Forever", "Cover Me") shows up in most results: then it wasn't a wish for that kind */
  const _asked = new Set(Object.entries(SEARCH_KINDS).filter(([, K]) => { const w = String(query || '').match(K.ask); if (!w) return false; const re = new RegExp('\\b' + w[0].replace(/[^a-z0-9 ]/gi, '') + '\\b', 'i'); return list.filter(r => re.test(r.title || '')).length < Math.max(2, list.length * .6); }).map(([k]) => k));
  return list.map((r, i) => ({ ...r, ...scoreResult(r, query, { ...o, _asked }, r.rank ?? i) })).sort((a, b) => b.score - a.score);
}
/** what to look up on YouTube for a typed name: the name itself, plus the name + "lyrics" / "official audio" / "official video" (the kind you prefer) */
export const searchQueries = (q, o = {}) => { const p = o.smartSearch === false ? 'any' : (o.searchPrefer || 'lyrics'), x = { lyrics: ' lyrics', audio: ' official audio', video: ' official video' }[p];
  return x && !new RegExp(x.trim().split(' ').pop(), 'i').test(q) ? [q, q + x] : [q]; };

export const opts = (d = data()) => ({ command: '!sr', nowCommand: '!song', queueCommand: '!queue', wrongCommand: '!wrongsong', mineCommand: '!mysongs', voteCommand: '!skip', skipCommand: '!skipsong', volCommand: '!volume', perUserSub: 0, cd: 0, maxMins: 10, minViews: 0, skipVotes: 3, solo: false, sayNow: false, search: true, vol: 60, musicOnly: true, dmcaFree: false, dmcaList: DMCA_DEFAULT, perm: 'all', skipPerm: 'all', vetoPerm: 'mods', volPerm: 'all', reqInfo: '', skipInfo: '', vetoInfo: '', skipSay: '', vetoSay: '', perVip: 0, perMod: 0, onlyKnown: false, showVideo: false, quality: 'auto', smartSearch: true, searchPrefer: 'lyrics', avoidLive: true, avoidCovers: true, avoidEdits: true, avoidJunk: true, level: true, levelDown: false, levelMax: 2.5, perUser: 2, max: 50, reply: true, overlay: true, links: 'any', raters: is('birx') ? ['Birx', 'Jess'] : ['Rating 1', 'Rating 2'], scale: 10, ...d.opts });

// ---------- what a request is ----------
/** A YouTube link or id → the 11-character video id ('' when it isn't one). */
export function ytId(t) {
  t = String(t || '').trim(); let m = t.match(/(?:youtube\.com\/(?:watch\?(?:[^ ]*&)?v=|shorts\/|live\/|embed\/)|youtu\.be\/|music\.youtube\.com\/watch\?(?:[^ ]*&)?v=)([\w-]{11})/i);
  if (m) return m[1]; return /^[\w-]{11}$/.test(t) && /[A-Z]/.test(t) && /[a-z0-9_-]/.test(t) && !/^[a-z]+$/i.test(t) ? t : '';
}
export const norm = t => String(t || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/\(.*?(official|lyrics?|video|audio|hd|4k|remaster).*?\)|\[.*?\]/g, ' ').replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, ' ').trim();
export const keyOf = x => (x.yt ? 'yt:' + x.yt : 't:' + norm(x.title));
const lib = (d, x) => { const k = x.key || keyOf(x); return (d.lib[k] ||= { key: k, title: x.title || '', yt: x.yt || '', plays: 0, requests: 0, first: 0, last: 0, rate: [null, null], by: {} }); };
/** Why this song can't be asked for ('' = fine): its link, its exact name, or a banned word/phrase in its name. */
export function bannedWhy(x, d = data()) {
  const k = keyOf(x), n = norm(x.title);
  for (const b of d.banned) { if ((b.yt && x.yt && b.yt === x.yt) || (b.key && b.key === k)) return b.title || 'that song'; const bn = norm(b.title); if (bn && n && (n === bn || (b.words && n.includes(bn)))) return b.title; }
  return '';
}

// ---------- chat ----------
let lastSay = 0;
const say = (t, gap = 0) => { if (gap && Date.now() - lastSay < gap) return; lastSay = Date.now(); if (opts().reply !== false) H.say(t).catch(() => {}); };
/** 🎵 Someone's songs: what's playing if it's theirs (pos 0) and each one waiting with its place in the queue. */
export function mine(login, d = data()) { const l = low(login), out = []; if (!l) return out; if (d.now && d.now.login === l) out.push({ title: d.now.title, pos: 0, yt: d.now.yt || '' }); d.queue.forEach((q, i) => { if (q.login === l) out.push({ title: q.title, pos: i + 1, yt: q.yt || '' }); }); return out; }
/** ✏️ (1.148.0, Derek: "allow custom message for when a song is skipped by chat") your own chat line for a skipped song; empty = the usual line. Words: {song} {name} (who skipped / cast the last vote) {by} (who asked for the song) {votes}. */
export const skipLine = (tpl, usual, n, name, votes) => { tpl = String(tpl || '').trim(); if (!tpl) return usual; return tpl.replace(/\{song\}/gi, n.title || 'that song').replace(/\{name\}/gi, name || 'chat').replace(/\{by\}/gi, n.by || 'someone').replace(/\{votes\}/gi, String(votes || 0)).slice(0, 450); };
export function onChat(m) {
  if (!on() || !m?.login) return false; const d = data(), o = opts(d), text = String(m.text || '').trim(), sp = text.split(/\s+/), w = low(sp[0]), arg = text.slice(sp[0].length).trim(), name = m.name || m.login;
  if (!d.open) return false; /* (1.144.3, Derek: "sr is off turn off all the commands for it") song requests switched off = every song command is off (request, now playing, queue, skip, volume, my songs…), with no answer in chat */
  if (o.command && w === low(o.command)) { if (!arg) { say(o.reqInfo ? `🎵 @${name} ${o.reqInfo}` : `🎵 @${name} type ${o.command} and a YouTube link${o.links === 'any' ? ' or the name of a song' : ''}.`, 6000); return true; } request(m, arg).catch(e => console.error('[songs]', e.message)); return true; }
  if (o.nowCommand && w === low(o.nowCommand)) { say(d.now ? `🎵 Now playing: ${d.now.title}${d.now.by ? ` (asked by ${d.now.by})` : ''}` : '🎵 Nothing is playing right now.', 5000); return true; }
  if (o.queueCommand && w === low(o.queueCommand)) { say(d.queue.length ? `🎵 Next up (${d.queue.length}): ${d.queue.slice(0, 5).map((q, i) => `${i + 1}. ${q.title}`).join(' · ')}${d.queue.length > 5 ? ' …' : ''}`.slice(0, 480) : '🎵 The song queue is empty.', 8000); return true; }
  /* ⏭ skipping: mods and the streamer skip right away, and so does the person whose song it is; anyone else counts as a vote to skip (when votes are on). "!skip song" works like the skip command. */
  const PW = { all: 'everyone', followers: 'followers', subs: 'subs', vips: 'VIPs', mods: 'mods', streamer: 'the streamer' };
  const voteSkip = () => { if (!(o.skipVotes > 0) || !d.now) return false; if (o.skipPerm && o.skipPerm !== 'all') { const at = d.now.id; H.allowed(m, o.skipPerm).then(ok => { if (!d.now || d.now.id !== at) return; if (ok) voteNow(); else say(`🎵 @${name} ${o.skipInfo || 'voting to skip is for ' + (PW[o.skipPerm] || 'others') + '.'}`, 8000); }).catch(() => {}); return true; } return voteNow(); };
  const voteNow = () => { if (!d.now) return false; const v = (d.vs && d.vs.id === d.now.id) ? d.vs : (d.vs = { id: d.now.id, who: [] }); if (v.who.includes(low(m.login))) return true; v.who.push(low(m.login));
    if (v.who.length >= o.skipVotes) { const n = d.now; next(); if (n.login) H.note(n.login, n.by, 'skipped', `${n.title} (chat voted)`); say(skipLine(o.skipSay, `🎵 Chat voted to skip: ${n.title}`, n, name, v.who.length)); } else say(`🎵 ${name} voted to skip (${v.who.length} of ${o.skipVotes}).`, 4000); return true; };
  if ((o.skipCommand && w === low(o.skipCommand)) || (w === '!skip' && /^song\b/i.test(arg) && (o.skipCommand || o.voteCommand))) { if (!d.now) { say('🎵 Nothing is playing right now.', 5000); return true; } const own = d.now.login === low(m.login);
    H.allowed(m, o.vetoPerm || 'mods').then(ok => { if (!d.now) return; if (ok || own) { const n = d.now; next(); H.note(m.login, name, 'skip', n.title); if (n.login && !own) H.note(n.login, n.by, 'skipped', `${n.title} (by ${name})`); say(skipLine(o.vetoSay, `🎵 ${name} skipped: ${n.title}`, n, name, 0)); } else if (!voteSkip()) say(`🎵 @${name} ${o.vetoInfo || 'only ' + (PW[o.vetoPerm || 'mods'] || 'mods') + ' can skip a song (or the person who asked for it).'}`, 8000); }).catch(() => {}); return true; }
  if (o.voteCommand && w === low(o.voteCommand)) { if (w === '!skip' && arg && H.movieSkip()) return false; /* ("!skip 3" in an edition with movie battles is the movie skip) */ voteSkip(); return true; }
  if (o.volCommand && w === low(o.volCommand)) { const n = Number(arg); if (!arg || !Number.isFinite(n)) { say(`🔉 The song volume is ${o.vol}.`, 4000); return true; } /* (1.132.3, Derek: anyone can change the volume by default; volPerm = who may) */
    H.allowed(m, o.volPerm || 'all').then(ok => { if (!ok) return say(`🔉 @${name} only ${PW[o.volPerm] || 'mods'} can change the song volume.`, 8000); d.opts.vol = Math.round(Math.max(0, Math.min(100, n))); changed(); H.send({ type: 'songVol', vol: d.opts.vol }, 'control'); say(`🔉 Song volume: ${d.opts.vol}`); }).catch(() => {}); return true; }
  if (o.mineCommand && w === low(o.mineCommand)) { const who = arg && /^@?\w{2,30}$/.test(arg) ? arg.replace(/^@/, '') : m.login, own = low(who) === low(m.login), l = mine(who, d), nm = own ? name : who; say(l.length ? `🎵 @${name} ${own ? 'your' : nm + "'s"} song${l.length === 1 ? '' : 's'}: ${l.map(x => x.pos ? `#${x.pos} ${x.title}` : `▶ playing now: ${x.title}`).join(' · ')}`.slice(0, 480) : `🎵 @${name} ${own ? 'you have' : nm + ' has'} no songs in the queue.`, 3000); return true; }
  if (o.wrongCommand && w === low(o.wrongCommand)) { const i = d.queue.map(q => q.login).lastIndexOf(low(m.login)); if (i < 0) say(`🎵 @${name} you have no song in the queue.`, 5000); else { const [q] = d.queue.splice(i, 1); changed(); say(`🎵 @${name} took out: ${q.title}`); } return true; }
  return false;
}
/** One request from chat (or typed by hand: `by` only). Returns {ok, why, item}. */
export async function request(m, arg, { hand = false, test = false, now = Date.now(), d = data(), quiet = false, info: given } = {}) {
  const o = opts(d), login = low(m.login), name = m.name || m.login || '', no = (why, t) => { if (!quiet && !hand && t) say(`🎵 @${name} ${t}`, 3000); return { ok: false, why }; };
  if (!hand) {
    if (!d.open) return no('closed', 'song requests are closed right now.');
    if (d.bannedUsers.includes(login)) return no('user');
    if (!(await H.allowed(m, o.perm))) return no('perm', 'song requests are for ' + ({ followers: 'followers', subs: 'subs', vips: 'VIPs', mods: 'mods', streamer: 'the streamer' }[o.perm] || 'others') + ' right now.');
    if (d.queue.length >= o.max) return no('full', 'the song queue is full. Try again in a bit.');
    { let lim = o.perUser; /* (subs, VIPs and mods can be given more: the biggest number that fits them counts; 0 = same as everyone) */
      for (const [k, p] of [['perUserSub', 'subs'], ['perVip', 'vips'], ['perMod', 'mods']]) if (lim && o[k] > lim && (await H.allowed(m, p))) lim = o[k];
      if (lim && d.queue.filter(q => q.login === login).length >= lim) return no('limit', `you already have ${lim} song${lim === 1 ? '' : 's'} in the queue.`); }
    { const last = d.req[login] && d.req[login].last, left = o.cd > 0 && last ? Math.ceil((last + o.cd * 1000 - now) / 1000) : 0; if (left > 0 && !(await H.allowed(m, 'mods'))) return no('wait', `you can ask for another song in ${left >= 90 ? Math.round(left / 60) + ' min' : left + ' s'}.`); }
  }
  let yt = ytId(arg), title = yt ? '' : String(arg).replace(/\s+/g, ' ').trim().slice(0, 140), found = null;
  if (!yt && /^https?:\/\//i.test(title)) return no('link', 'I can only take YouTube links (or the name of a song).');
  if (!yt && title && !hand && o.search !== false && !d.lib['t:' + norm(title)]) { /* 🔎 a typed name is looked up on YouTube: the first result that fits the rules is the song (a name you already have in your songs stays that song) */
    let res = []; try { const qs = searchQueries(title, o), got = await Promise.all(qs.map(q => Promise.resolve(H.search(q)).catch(() => []))); res = pickBest(got.flatMap(l => (l || []).map((r, i) => ({ ...r, rank: i }))), title, o); } catch {}
    for (const r of res.slice(0, 5)) { if (!r || !r.id) continue; let info = { secs: r.secs || 0, views: r.views ?? null, author: r.author || '', category: '', title: r.title || '' };
      if (o.musicOnly) { try { const full = await H.info(r.id); if (full) info = { ...info, ...full, title: full.title || info.title }; } catch {} }
      if (!infoWhy(info, info.title, o) && !bannedWhy({ yt: r.id, title: info.title }, d)) { found = info; yt = r.id; title = ''; break; } }
    if (!found && res.length && (o.dmcaFree || o.links === 'youtube')) return no('nofit', "I couldn't find a version of that song that fits the request rules.");
  }
  if (!yt && (o.links === 'youtube' || o.dmcaFree) && !hand) return no('needlink', o.dmcaFree ? `only DMCA-free music right now: send a YouTube link from a stream-safe channel.` : `send a YouTube link: ${o.command} and the link.`);
  if (yt && !hand && (o.musicOnly || o.dmcaFree || o.maxMins > 0 || o.minViews > 0)) { /* 🎼 the request rules that need to know the video: music only, DMCA-free only, how long, how many views */
    let info = given; if (info === undefined) info = found; if (info === undefined || info === null) { try { info = await H.info(yt); } catch { info = null; } }
    const why = infoWhy(info, (info && info.title) || d.lib['yt:' + yt]?.title || '', o);
    if (why) return no(why, { dmca: "that isn't from a DMCA-free channel, and only stream-safe music is allowed right now.", notmusic: 'only music videos can be requested.', long: `that one is too long (the limit is ${o.maxMins} min).`, views: `that video needs at least ${Number(o.minViews).toLocaleString()} views.` }[why]);
  }
  if (yt) { title = d.lib['yt:' + yt]?.title || (found && found.title) || ''; if (!title) { try { title = String(await H.title(yt) || '').slice(0, 140); } catch {} } if (!title) title = 'YouTube video ' + yt; }
  if (!title) return no('empty');
  const x = { yt, title }, key = keyOf(x), ban = bannedWhy(x, d); if (d.lib[key]?.title && !/^YouTube video /.test(d.lib[key].title)) x.title = title = d.lib[key].title; /* (a song you know keeps the name you gave it) */ if (ban) return no('banned', "that song is on the banned list, sorry.");
  if (o.onlyKnown && !hand && !(d.lib[key] && (d.lib[key].plays || d.lib[key].old || d.lib[key].requests))) return no('unknown', 'right now only songs already in the song list can be requested.');
  if (d.queue.some(q => q.key === key) || d.now?.key === key) return no('dupe', 'that song is already in the queue.');
  const item = { id: uid(), key, title, yt, by: name, login, at: now, test: test || undefined };
  d.queue.push(item); if (!test && d.xlog) { d.xlog.push({ at: now, key, title, by: name || '', login: login || '' }); if (d.xlog.length > 30000) d.xlog.splice(0, d.xlog.length - 30000); } if (login && !test && !hand) H.note(login, name, 'song', title); const L = lib(d, { key, title, yt }); L.requests++; if (!L.first) L.first = now; if (login) { L.by[login] = (L.by[login] || 0) + 1; if (!hand && !test) { const r = (d.req[login] ||= { name, n: 0 }); r.n++; r.name = name; r.last = now; } }
  if (d === data()) { changed(); H.act(`${name || 'You'} asked for a song: ${title}`, { who: name, kind: 'songReq', test }); }
  if (!quiet && !hand) { const old = L.plays ? ` (played ${L.plays} time${L.plays === 1 ? '' : 's'} before${rateText(L, o) ? ', ' + rateText(L, o) : ''})` : ''; say(`🎵 @${name} added: ${title}, #${d.queue.length} in the queue${old}`.slice(0, 480)); }
  return { ok: true, item };
}
export const rateText = (L, o = opts()) => (L?.rate || []).map((r, i) => (r == null ? '' : `${o.raters[i]} ${r}/${o.scale}`)).filter(Boolean).join(', ');

// ---------- the queue ----------
/** 🎼 (1.150.0) what the small now-playing strip shows for the song that is really playing (a request, or a playlist song) */
export function nowInfo(yt, title) { const d = data(), o = opts(d), req = d.now && (!yt || d.now.yt === yt) ? d.now : null, key = req ? req.key : yt ? 'yt:' + yt : '', L = key ? d.lib[key] : null, r = o.noRate ? [] : (L?.rate || []).slice(0, o.solo ? 1 : 2);
  return { title: req ? req.title : String(title || L?.title || ''), by: req ? req.by || '' : '', rate: r.map(x => (x == null ? null : x)), raters: o.raters, scale: o.scale, request: !!req }; }
function changed() { save(); H.send({ type: 'songs' }, 'control'); H.send(screen(), 'songs'); }
function finish(d, now) { if (!d.now) return; const L = lib(d, d.now); L.last = now; d.played.unshift({ key: d.now.key, title: d.now.title, by: d.now.by, at: d.now.startedAt || now }); d.played.length = Math.min(d.played.length, 500); d.now = null; }
/** ⏭ the next song in the queue becomes "now playing" (the one before goes into the history). `id` = play that one now. */
export function next(id, now = Date.now()) {
  const d = data(); finish(d, now); const i = id ? d.queue.findIndex(q => q.id === id) : 0;
  if (i >= 0 && d.queue[i]) { const [q] = d.queue.splice(i, 1); d.now = { ...q, startedAt: now }; const L = lib(d, q); L.plays++; if (!L.first) L.first = now; L.last = now; if (!L.title || /^YouTube video /.test(L.title)) L.title = q.title; H.act(`Now playing: ${q.title}${q.by ? ` (asked by ${q.by})` : ''}`, { kind: 'songPlay', test: !!q.test }); d.vs = null; if (opts(d).sayNow && !q.test) say(`🎵 Now playing: ${q.title}${q.by ? ` (asked by ${q.by})` : ''}`); }
  changed(); return state();
}
export function stop() { const d = data(); finish(d, Date.now()); changed(); return state(); }
export function remove(id) { const d = data(), i = d.queue.findIndex(q => q.id === id); if (i >= 0) d.queue.splice(i, 1); changed(); return state(); }
export function move(id, dir) { const d = data(), i = d.queue.findIndex(q => q.id === id); if (i < 0) return state(); const j = dir === 'top' ? 0 : Math.max(0, Math.min(d.queue.length - 1, i + (dir === 'up' ? -1 : 1))); const [q] = d.queue.splice(i, 1); d.queue.splice(j, 0, q); changed(); return state(); }
export function clear() { const d = data(); d.queue = []; changed(); return state(); }
export const isOpen = () => !!data().open;
export function setOpen(yes) { const d = data(); d.open = !!yes; changed(); if (opts(d).reply !== false) H.say(yes ? `🎵 Song requests are open! Type ${opts(d).command} and a YouTube link or a song name.` : '🎵 Song requests are closed for now.').catch(() => {}); return state(); }
/** A rating: who = 0 or 1 (the two people), value = a number up to the scale, or null to clear it. */
export function rate(key, who, value) {
  const d = data(), o = opts(d); let L = d.lib[key]; const ym = /^yt:([A-Za-z0-9_-]{11})$/.exec(String(key || ''));
  if (!L && ym) L = lib(d, { key, yt: ym[1], title: String(arguments[3] || '').trim().slice(0, 140) || titleMap(d)[ym[1]] || 'YouTube video ' + ym[1] }); /* (1.146.0) a playlist song can be rated too: it joins the song database when you rate it */
  if (!L) throw new Error("That song isn't in the database."); if (ym && arguments[3] && /^YouTube video /.test(L.title)) L.title = String(arguments[3]).trim().slice(0, 140) || L.title; who = who ? 1 : 0;
  L.rate ||= [null, null]; L.rate[who] = value === null || value === '' || value === undefined ? null : Math.round(clampN(value, 0, o.scale, 0) * 2) / 2; L.ratedAt = Date.now(); changed(); return state();
}
export function editSong(key, b) {
  const d = data(), L = d.lib[key]; if (!L) throw new Error("That song isn't in the database.");
  if (b.remove) { delete d.lib[key]; changed(); return state(); }
  if ('title' in b) { const t = String(b.title || '').trim().slice(0, 140); if (!t) throw new Error('Type the song name.'); L.title = t; if (!L.yt) { const nk = keyOf(L); if (nk !== key && !d.lib[nk]) { delete d.lib[key]; L.key = nk; d.lib[nk] = L; } } }
  if ('plays' in b) L.plays = Math.round(clampN(b.plays, 0, 1e6, L.plays));
  changed(); return state();
}
export function ban(b) {
  const d = data(), title = String(b.title || '').trim().slice(0, 140), yt = (/^[A-Za-z0-9_-]{11}$/.test(String(b.yt || '')) ? String(b.yt) : '') || ytId(b.yt || b.link || title) || (b.key && d.lib[b.key]?.yt) || '';
  const t = (b.key && d.lib[b.key]?.title) || (yt && d.lib['yt:' + yt]?.title) || (yt && yt === ytId(title) ? '' : title); if (!t && !yt) throw new Error('Type a song name or paste a YouTube link.');
  const e = { title: t || 'YouTube video ' + yt, yt, key: yt ? 'yt:' + yt : 't:' + norm(t), words: !!b.words && !yt, at: Date.now() };
  if (!d.banned.some(x => x.key === e.key && !!x.words === e.words)) d.banned.unshift(e);
  d.queue = d.queue.filter(q => !bannedWhy(q, d));
  for (const k of ['holdPlay', 'backupPlay']) { const hp = d[k]; if (hp && hp.ids) { hp.items = (hp.items || hp.ids.map(y => ({ yt: y, title: '' }))).filter(x => !ytBanned(d, x.yt)); hp.ids = hp.items.map(x => x.yt); } } /* (a playlist that is playing loses the song too) */
  if (d.now && bannedWhy(d.now, d)) { H.act(`Banned while it played, so it was skipped: ${d.now.title}`, { kind: 'songSkip' }); const st = next(); return { ...st, skipped: true }; } /* (1.146.0, Derek: "when a song gets banned while playing it skips it") */
  changed(); return state();
}
export function unban(key) { const d = data(); d.banned = d.banned.filter(b => b.key !== key); changed(); return state(); }
export function banUser(name, yes = true) { const d = data(), l = low(name); if (!/^[a-z0-9_]{2,25}$/.test(l)) throw new Error('Type their chat name.'); d.bannedUsers = d.bannedUsers.filter(x => x !== l); if (yes) { d.bannedUsers.push(l); d.queue = d.queue.filter(q => q.login !== l); } changed(); return state(); }
/* 📻 Your own YouTube playlists: one can play while song requests are paused, and one can fill in when the queue is empty.
   The app only keeps the playlist's id and your name for it: YouTube's own player plays the list. */
export const plId = s => { const t = String(s || '').trim(), m = t.match(/[?&]list=([A-Za-z0-9_-]{10,80})/); return m ? m[1] : /^[A-Za-z0-9_-]{10,80}$/.test(t) ? t : ''; };
export function playlist(b) {
  const d = data(), L = (d.playlists ||= []);
  if (b.remove) { const i = L.findIndex(p => p.id === b.id); if (i >= 0) L.splice(i, 1); if (d.backup === b.id) d.backup = ''; if (d.hold === b.id) { d.hold = ''; delete d.holdPlay; } refill(d); changed(); return state(); }
  if (b.id) { const p = L.find(x => x.id === b.id); if (!p) throw new Error("That playlist isn't in your list any more."); if ('name' in b) p.name = String(b.name || '').trim().slice(0, 60) || p.name; if ('shuffle' in b) p.shuffle = !!b.shuffle; if ('link' in b) { const l = plId(b.link); if (!l) throw new Error("That doesn't look like a YouTube playlist link (it has list= in it)."); p.list = l; } changed(); return state(); }
  const list = plId(b.link); if (!list) throw new Error("That doesn't look like a YouTube playlist link. Open the playlist on YouTube and copy the address (it has list= in it).");
  if (L.length >= 40) throw new Error('That is a lot of playlists: remove one first.'); if (L.some(p => p.list === list)) throw new Error('That playlist is already in your list.');
  L.push({ id: 'pl' + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36), name: String(b.name || '').trim().slice(0, 60) || 'Playlist ' + (L.length + 1), list, shuffle: !!b.shuffle }); changed(); return state();
}
/** ⭐ (1.132.4) Your own saved songs: a playlist kept in the app (YouTube can't be written to from here). `{yt | key, title}` adds the song,
 *  the same again (or `remove`) takes it out. The first saved-songs playlist is used; one is made when there is none. */
export function plSong(b) {
  const d = data(), L = (d.playlists ||= []); let yt = /^[A-Za-z0-9_-]{11}$/.test(String(b.yt || '')) ? String(b.yt) : '';
  const key = String(b.key || ''); if (!yt && key.startsWith('yt:')) yt = key.slice(3); if (!yt && key && d.lib[key] && d.lib[key].yt) yt = d.lib[key].yt;
  if (!yt) throw new Error("This song has no YouTube link, so it can't be saved to your playlist.");
  let p = (b.id && L.find(x => x.id === b.id && x.songs)) || L.find(x => x.songs);
  if (!p) { const id = 'pl' + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36); p = { id, name: '⭐ My saved songs', list: 'app-' + id, shuffle: true, songs: [] }; L.push(p); }
  const i = p.songs.findIndex(x => x.yt === yt); let added = false;
  if (i >= 0) { if (b.add !== true) p.songs.splice(i, 1); }
  else if (!b.remove) { if (p.songs.length >= 150) throw new Error('That playlist is full (150 songs): take one out first.'); p.songs.push({ yt, title: String(b.title || (d.lib['yt:' + yt] && d.lib['yt:' + yt].title) || 'Song').slice(0, 140) }); added = true; }
  if (!p.songs.length) { if (d.backup === p.id) d.backup = ''; if (d.hold === p.id) d.hold = ''; }
  refill(d); changed(); return { ...state(), added, playlist: p.name, n: p.songs.length };
}
/* 📻 (1.145.0, Derek: "import youtube playlist and make them my playlist… a way to combine playlist… check marks and if they are checked they will be added to main playlist… play in order or by default random")
   A playlist can now carry its songs (`tracks`, read from YouTube when it is added, or learned from the player the first time it plays). Ticked playlists (`main !== false`) together are the MAIN playlist. */
const tracksOf = p => (p && (p.tracks || p.songs) || []).map(x => x.yt).filter(y => /^[A-Za-z0-9_-]{11}$/.test(String(y || '')));
/* (1.146.0) the player now gets the songs one by one (`items`: link + name), so the app knows which playlist song is on: it can be rated, banned, and shown as a queue. Banned songs are left out. */
const ytBanned = (d, yt) => (d.banned || []).some(b => b.yt === yt || b.key === 'yt:' + yt);
const titleMap = d => { const m = {}; for (const p of d.playlists || []) for (const x of p.tracks || p.songs || []) if (x && x.yt && x.title && !m[x.yt]) m[x.yt] = x.title; return m; };
const playItems = (d, ids) => { const tm = titleMap(d); return ids.filter(yt => !ytBanned(d, yt)).map(yt => ({ yt, title: tm[yt] || ((d.lib || {})['yt:' + yt] && !/^YouTube video /.test(d.lib['yt:' + yt].title) ? d.lib['yt:' + yt].title : '') || '' })); };
const withItems = (d, o) => { if (o.ids) { o.items = playItems(d, o.ids); o.ids = o.items.map(x => x.yt); } return o; };
const PLAY_MAX = 150; /* (how many songs one go of the player gets: YouTube's player takes a list of about that many) */
export function mainIds(d = data()) { return [...new Set((d.playlists || []).filter(p => p.main !== false).flatMap(tracksOf))]; }
const mix = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
/** What the player gets for a playlist ('main' or a playlist id): the songs to play (shuffled or in order), or, for a YouTube playlist whose songs the app doesn't know, just its list id. */
export function playOf(id, shuffle, d = data()) {
  if (id === 'main') { const all = mainIds(d); if (!all.length) throw new Error('Your main playlist is empty. Tick at least one playlist whose songs the app knows (Chat bot → 🎵 Song requests → 📻 Playlists).'); return withItems(d, { id, key: Date.now().toString(36), name: '⭐ Main playlist', ids: (shuffle ? mix(all) : all).slice(0, PLAY_MAX), n: all.length, shuffle: !!shuffle }); }
  const p = (d.playlists || []).find(x => x.id === id); if (!p) throw new Error("That playlist isn't in your list any more.");
  const all = tracksOf(p); if (all.length) return withItems(d, { id, key: Date.now().toString(36), name: p.name, ids: (shuffle ? mix(all) : all).slice(0, PLAY_MAX), n: all.length, shuffle: !!shuffle });
  if (p.songs) throw new Error('That playlist has no songs in it yet.');
  return { id, key: Date.now().toString(36), name: p.name, ids: null, list: p.list, n: 0, shuffle: !!shuffle };
}
/** ➕ Add a YouTube playlist and read its songs (so it can be mixed into the main playlist). `reread` reads an existing one again. */
export async function playlistAdd(b) {
  const d = data(); let p;
  if (b.reread) { p = (d.playlists || []).find(x => x.id === b.id); if (!p || p.songs) throw new Error("That playlist can't be read again."); }
  else { playlist(b); p = d.playlists[d.playlists.length - 1]; p.main = true; }
  let got = null; try { got = await H.plRead(p.list); } catch {}
  if (got && got.tracks && got.tracks.length) { p.tracks = got.tracks.slice(0, 1000).map(x => ({ yt: x.yt, title: String(x.title || '').slice(0, 140) })); p.readAt = Date.now(); if (!String(b.name || '').trim() && got.title && !b.reread) p.name = String(got.title).slice(0, 60); }
  else p.readFail = Date.now();
  refill(d); changed(); H.act(`Playlist ${b.reread ? 'read again' : 'added'}: “${p.name}”${p.tracks ? ` (${p.tracks.length} songs)` : ' (its songs could not be read yet)'}`, { icon: '📻', kind: 'playlist' });
  return { ...state(), added: p.name, n: (p.tracks || []).length, read: !!(p.tracks && p.tracks.length) };
}
/** The player learned what is in a YouTube playlist (it tells us the song ids while it plays): kept, so the playlist can join the main one. */
export function playlistTracks(id, ids) { const d = data(), p = (d.playlists || []).find(x => x.id === id); if (!p || p.songs || (p.tracks && p.tracks.length)) return state(); const ok = [...new Set((Array.isArray(ids) ? ids : []).filter(y => /^[A-Za-z0-9_-]{11}$/.test(String(y || ''))))].slice(0, 1000); if (!ok.length) return state(); p.tracks = ok.map(yt => ({ yt, title: (d.lib['yt:' + yt] && d.lib['yt:' + yt].title) || '' })); p.readAt = Date.now(); p.learned = true; refill(d); changed(); return state(); }
/** ☑ in / out of the main playlist, and how the main playlist plays (🔀 shuffle is the default). */
export function playlistMain(b) { const d = data(); if (b.id) { const p = (d.playlists || []).find(x => x.id === b.id); if (!p) throw new Error("That playlist isn't in your list any more."); p.main = !!b.main; } if (b.order) d.mainOrder = b.order === 'order' ? 'order' : 'shuffle'; refill(d); changed(); return state(); }
function refill(d) { if (d.backup) { try { d.backupPlay = playOf(d.backup, d.backup === 'main' ? d.mainOrder !== 'order' : !!((d.playlists || []).find(x => x.id === d.backup) || {}).shuffle, d); } catch { d.backup = ''; delete d.backupPlay; } } else delete d.backupPlay; } /* (the fill-in playlist's songs are worked out again when the playlists change) */
/** 📻 The playlist that plays by itself when no song requests are left ('' = none). */
export function setBackup(id) { const d = data(); if (id && id !== 'main' && !(d.playlists || []).some(p => p.id === id)) throw new Error("That playlist isn't in your list any more."); if (id) d.backupPlay = playOf(id, id === 'main' ? d.mainOrder !== 'order' : !!((d.playlists || []).find(x => x.id === id) || {}).shuffle, d); else delete d.backupPlay; d.backup = id || ''; changed(); return state(); }
/** ⏸ Pause the song requests and play a playlist ('' = back to the requests). Requests still come in and wait their turn. */
export function setHold(id, shuffle) { const d = data(), p = id && id !== 'main' ? (d.playlists || []).find(x => x.id === id) : null; if (id && id !== 'main' && !p) throw new Error("That playlist isn't in your list any more."); if (id) { const sh = shuffle == null ? (id === 'main' ? d.mainOrder !== 'order' : !!p.shuffle) : !!shuffle; d.holdPlay = playOf(id, sh, d); if (p) p.shuffle = sh; else d.mainOrder = sh ? 'shuffle' : 'order'; } else delete d.holdPlay; d.hold = id || ''; H.act(id ? `Song requests paused: playing ${p ? `the playlist “${p.name}”` : 'the main playlist'}${d.holdPlay && d.holdPlay.shuffle ? ' (shuffled)' : ' (in order)'}` : 'Back to the song requests', { kind: 'songHold' }); changed(); return state(); }
export function setOpts(b) {
  const d = data(), x = d.opts;
  for (const k of ['command', 'nowCommand', 'queueCommand', 'wrongCommand', 'mineCommand', 'voteCommand', 'skipCommand', 'volCommand']) if (k in b) { const c = String(b[k] || '').trim().toLowerCase().split(/\s+/)[0]; if (!c) x[k] = ''; /* (left blank = that command is turned off) */ else if (/^![a-z0-9_]{2,20}$/.test(c)) x[k] = c; else throw new Error('A command has to look like !sr (or leave the box empty to turn it off)'); }
  for (const k of ['perm', 'skipPerm', 'vetoPerm', 'volPerm']) if (k in b && ['all', 'followers', 'subs', 'vips', 'mods', 'streamer'].includes(b[k])) x[k] = b[k];
  for (const k of ['reqInfo', 'skipInfo', 'vetoInfo', 'skipSay', 'vetoSay']) if (k in b) x[k] = String(b[k] || '').replace(/\s+/g, ' ').trim().slice(0, 300);
  for (const k of ['perVip', 'perMod']) if (k in b) x[k] = Math.round(clampN(b[k], 0, 50, 0));
  if ('searchPrefer' in b && PREFER[b.searchPrefer]) x.searchPrefer = b.searchPrefer; if ('levelMax' in b) x.levelMax = clampN(b.levelMax, 1, 4, 2.5);
  if ('quality' in b) x.quality = ['auto', 'small', 'medium', 'large', 'hd720', 'hd1080'].includes(b.quality) ? b.quality : 'auto';
  if ('perUser' in b) x.perUser = Math.round(clampN(b.perUser, 0, 50, 2)); if ('max' in b) x.max = Math.round(clampN(b.max, 1, 500, 50));
  if ('reply' in b) x.reply = !!b.reply; if ('overlay' in b) x.overlay = !!b.overlay; if ('links' in b) x.links = b.links === 'youtube' ? 'youtube' : 'any';
  if ('perUserSub' in b) x.perUserSub = Math.round(clampN(b.perUserSub, 0, 50, 0)); if ('cd' in b) x.cd = Math.round(clampN(b.cd, 0, 86400, 0)); if ('maxMins' in b) x.maxMins = clampN(b.maxMins, 0, 600, 10); if ('minViews' in b) x.minViews = Math.round(clampN(b.minViews, 0, 1e9, 0));
  if ('skipVotes' in b) x.skipVotes = Math.round(clampN(b.skipVotes, 0, 500, 0)); if ('vol' in b) x.vol = Math.round(clampN(b.vol, 0, 100, 60));
  for (const k of ['sayNow', 'musicOnly', 'dmcaFree', 'search', 'solo', 'noRate', 'onlyKnown', 'showVideo', 'smartSearch', 'avoidLive', 'avoidCovers', 'avoidEdits', 'avoidJunk', 'level', 'levelDown', 'vodRoute', 'vodMonitor', 'muteUnfocused']) if (k in b) x[k] = !!b[k]; /* (noRate = no song ratings at all: the stars are hidden everywhere, saved ratings are kept) */ /* (solo = only one person rates: the second rating is hidden everywhere) */
  if ('dmcaList' in b) { const l = (Array.isArray(b.dmcaList) ? b.dmcaList : String(b.dmcaList || '').split(/[\n,]+/)).map(s => String(s).trim().slice(0, 60)).filter(Boolean).slice(0, 200); if (l.length) x.dmcaList = l; else delete x.dmcaList; }
  if ('scale' in b) { const was = opts(d).scale, to = Number(b.scale) === 5 ? 5 : 10; if (to !== was) for (const L of Object.values(d.lib || {})) if (L.rate) L.rate = L.rate.map(r => (r == null ? null : Math.round(r * to / was * 2) / 2)); x.scale = to; } /* (1.132.5) out of 5 or 10 only; the ratings you already gave move over to the new scale */
  if ('raters' in b && Array.isArray(b.raters)) x.raters = [0, 1].map(i => String(b.raters[i] || '').trim().slice(0, 20) || opts(d).raters[i]);
  changed(); return state();
}

// ---------- import: an old song list, old ratings, banned songs ----------
function csvRows(text) {
  const first = text.split('\n')[0], sep = (first.match(/\t/g) || []).length ? '\t' : (first.match(/;/g) || []).length > (first.match(/,/g) || []).length ? ';' : ',';
  const rows = []; let row = [], cur = '', q = false;
  for (let i = 0; i < text.length; i++) { const ch = text[i];
    if (q) { if (ch === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; }
    else if (ch === '"') q = true; else if (ch === sep) { row.push(cur); cur = ''; } else if (ch === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; } else if (ch !== '\r') cur += ch; }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  return rows.filter(r => r.some(c => String(c).trim()));
}
const HEAD = { title: /^(song|title|name|track|song ?name|song ?title|video ?title)$/i, artist: /^(artist|band|by|singer|author|channel)$/i, link: /^(link|url|youtube|youtube ?(link|url|id)|video ?(id|link|url)|id)$/i, by: /^(requested ?by|requester|request(ed)? ?(user|from)|user|username|viewer|who)$/i, plays: /^(plays?|times ?played|play ?count|count|times|requests?)$/i, date: /^(date|last ?played|played|added|time)$/i, rate: /^(rating|score|stars?|rate)$/i, banned: /^(banned|blacklist(ed)?|blocked)$/i };
const numIn = v => { const m = String(v ?? '').replace(',', '.').match(/-?\d+(\.\d+)?/); return m ? Number(m[0]) : null; };
/** Read a table (rows of cells: from a spreadsheet page or CSV) or plain lines into songs. kind: songs | banned. Returns {songs:[{title,yt,by,plays,rate:[a,b],at}], note}. */
// 💿 RateYourMusic's own export (profile page → Export your data): one line per album / single they rated or catalogued.
// Header: RYM Album, First Name, Last Name, First Name localized, Last Name localized, Title, Release_Date, Rating, Ownership, Purchase Date, Media Type, Review
// Rating there = half stars (1–10; 0 = not rated). It is read from the file only: the app never visits rateyourmusic.com (they don't allow robots).
export const isRym = head => !!head && head.some(c => /^rym ?album$/i.test(c)) || (!!head && head.some(c => /^release_?date$/i.test(c)) && head.some(c => /^last ?name$/i.test(c)) && head.some(c => /^rating$/i.test(c)));
export function readRym(rows, hi, o = opts(), who = 0) {
  const head = rows[hi], col = re => head.findIndex(c => re.test(c)), cF = col(/^first ?name$/i), cL = col(/^last ?name$/i), cFL = col(/^first ?name localized$/i), cLL = col(/^last ?name localized$/i), cT = col(/^title$/i), cY = col(/^release_?date$/i), cR = col(/^rating$/i), out = []; let unrated = 0;
  for (const r of rows.slice(hi + 1)) {
    const artist = [cF >= 0 ? r[cF] : '', cL >= 0 ? r[cL] : ''].filter(Boolean).join(' ').trim() || [cFL >= 0 ? r[cFL] : '', cLL >= 0 ? r[cLL] : ''].filter(Boolean).join(' ').trim(), title = cT >= 0 ? r[cT] : ''; if (!title) continue;
    const v = cR >= 0 ? numIn(r[cR]) : null; if (!(v > 0)) { unrated++; continue; } /* (catalogued or wish-listed, never rated) */
    const rate = [null, null]; rate[who ? 1 : 0] = Math.round(Math.min(10, v) / 10 * o.scale * 2) / 2; const year = cY >= 0 ? (String(r[cY]).match(/\d{4}/) || [''])[0] : '';
    out.push({ title: ((artist ? artist + ' - ' : '') + title).slice(0, 140), yt: '', by: '', plays: 0, rate, at: 0, album: true, artist: artist.slice(0, 80), year });
  }
  return { songs: out, note: `Read as a RateYourMusic export: ${out.length} rated album${out.length === 1 ? '' : 's'} and singles${unrated ? ` (${unrated} without a rating left out)` : ''}. They go in as ${o.raters[who ? 1 : 0]}'s ratings.`, kind: 'songs', rym: true };
}
export function readTable(rows, kind = 'songs', o = opts(), who = 0) {
  rows = rows.map(r => r.map(c => String(c ?? '').trim())).filter(r => r.some(Boolean)); const out = [];
  { const ri = rows.slice(0, 5).findIndex(isRym); if (ri >= 0 && kind !== 'banned') return readRym(rows, ri, o, who); }
  const isHead = r => r.filter(c => Object.values(HEAD).some(re => re.test(c)) || o.raters.some(n => low(n) === low(c))).length >= 1 && r.every(c => c.length < 40 && !ytId(c));
  const hi = rows.findIndex(isHead), head = hi >= 0 && hi < 5 ? rows[hi] : null;
  const col = re => (head ? head.findIndex(c => re.test(c)) : -1), cT = col(HEAD.title), cA = col(HEAD.artist), cL = col(HEAD.link), cB = col(HEAD.by), cP = col(HEAD.plays), cD = col(HEAD.date);
  const rA = head ? head.findIndex(c => low(c).startsWith(low(o.raters[0])) || /^(rating|score) ?1$|^my rating$/i.test(c)) : -1, rB = head ? head.findIndex(c => low(c).startsWith(low(o.raters[1])) || /^(rating|score) ?2$/i.test(c)) : -1, rOne = col(HEAD.rate);
  for (const r of head ? rows.slice(hi + 1) : rows) {
    let title = '', yt = '';
    if (head) { yt = cL >= 0 ? ytId(r[cL]) : ''; title = cT >= 0 ? r[cT] : ''; if (cA >= 0 && r[cA] && title && !low(title).includes(low(r[cA]))) title = r[cA] + ' - ' + title; if (!yt) for (const c of r) { const y = /youtu/i.test(c) ? ytId(c) : ''; if (y) { yt = y; break; } } if (!title && cT < 0) title = r.find(c => c && !ytId(c) && numIn(c) === null) || ''; }
    else { const line = r.join(' ').replace(/^\s*(?:#?\d+[.):\]-]\s+)/, '').trim(); const m = line.match(/https?:\/\/\S+/); yt = ytId(m ? m[0] : line); title = (m ? line.replace(m[0], '') : yt ? '' : line).replace(/^[\s|:\-–—]+|[\s|:\-–—]+$/g, ''); }
    if (ytId(title)) { yt = yt || ytId(title); title = ''; }
    if (!title && !yt) continue;
    const one = rA < 0 && rB < 0 && rOne >= 0 ? numIn(r[rOne]) : null, a = rA >= 0 ? numIn(r[rA]) : rOne >= 0 && rB < 0 && !who ? numIn(r[rOne]) : one != null && !who ? one : null, b = rB >= 0 ? numIn(r[rB]) : one != null && who ? one : null, /* (a single Rating column goes to the person picked) */ at = cD >= 0 ? Date.parse(r[cD]) || 0 : 0;
    out.push({ title: title.slice(0, 140), yt, by: cB >= 0 ? r[cB].replace(/^@/, '') : '', plays: cP >= 0 ? Math.max(0, Math.round(numIn(r[cP]) || 0)) : 0, rate: [a, b], at });
  }
  return { songs: out, note: head ? `Read as a table (columns: ${head.filter(Boolean).join(', ')}).` : 'Read as plain lines (one song per line).', kind };
}
export const readText = (text, kind, o, who = 0) => { text = String(text || '').replace(/^﻿/, ''); if (!text.trim()) throw new Error('Nothing to read: pick a file or paste the text first'); if (/^\s*[\[{]/.test(text)) { try { const j = JSON.parse(text), arr = Array.isArray(j) ? j : j.songs || j.Songs || j.queue || j.banned || Object.values(j).find(Array.isArray) || []; if (arr.length && typeof arr[0] === 'object') { const keys = [...new Set(arr.flatMap(x => Object.keys(x || {})))]; return readTable([keys, ...arr.map(x => keys.map(k => (x && x[k] != null ? (typeof x[k] === 'object' ? JSON.stringify(x[k]) : x[k]) : '')))], kind, o, who); } if (arr.length) return readTable(arr.map(x => [x]), kind, o, who); } catch {} } return readTable(csvRows(text), kind, o, who); };
/** Put what was read into the database (or the banned list). Nothing already there is lost: plays add up only when `addPlays`, ratings fill in blanks unless `replace`. */
export function applyImport(p, { kind = 'songs', replace = false } = {}) {
  const d = data(), o = opts(d), r = { added: 0, updated: 0, ratings: 0, banned: 0, skipped: 0 };
  for (const s of p.songs || []) {
    if (kind === 'banned') { const e = { title: s.title || 'YouTube video ' + s.yt, yt: s.yt || '', key: s.yt ? 'yt:' + s.yt : 't:' + norm(s.title), words: false, at: Date.now() }; if (!e.key || e.key === 't:' || d.banned.some(x => x.key === e.key)) { r.skipped++; continue; } d.banned.push(e); r.banned++; continue; }
    const key = keyOf(s); if (key === 't:') { r.skipped++; continue; }
    const had = !!d.lib[key], L = lib(d, { key, title: s.title || 'YouTube video ' + s.yt, yt: s.yt }); had ? r.updated++ : r.added++;
    if (s.title && (!L.title || /^YouTube video /.test(L.title))) L.title = s.title;
    if (s.album) { L.album = true; L.artist = s.artist || L.artist || ''; if (s.year) L.year = s.year; }
    if (!had) { L.plays = s.plays || 0; L.requests = s.plays || 0; L.first = s.at || 0; L.last = s.at || 0; L.old = true; } else if (s.plays > L.plays) L.plays = s.plays;
    if (s.by) { const l = low(s.by); if (/^[a-z0-9_]{2,25}$/.test(l)) L.by[l] = Math.max(L.by[l] || 0, 1); }
    L.rate ||= [null, null]; for (const i of [0, 1]) { const v = s.rate?.[i]; if (v == null) continue; if (L.rate[i] == null || replace) { L.rate[i] = Math.round(clampN(v, 0, o.scale, 0) * 2) / 2; r.ratings++; } }
  }
  if (kind === 'banned') d.queue = d.queue.filter(q => !bannedWhy(q, d));
  changed(); H.act(kind === 'banned' ? `Song import: ${r.banned} banned song${r.banned === 1 ? '' : 's'}` : `Song import: ${r.added} new song${r.added === 1 ? '' : 's'}, ${r.updated} updated, ${r.ratings} rating${r.ratings === 1 ? '' : 's'}`, { kind: 'songImport' });
  return r;
}
export function exportAll() { const d = data(), o = opts(d); return { head: ['Song', 'YouTube link', 'Times played', 'Times asked for', o.raters[0], o.raters[1], 'Last played'], rows: Object.values(d.lib).sort((a, b) => a.title.localeCompare(b.title)).map(L => [L.title, L.yt ? 'https://youtu.be/' + L.yt : '', L.plays, L.requests, L.rate?.[0] ?? '', L.rate?.[1] ?? '', L.last ? new Date(L.last).toISOString().slice(0, 10) : '']), banned: d.banned.map(b => [b.title, b.yt ? 'https://youtu.be/' + b.yt : '']) }; }

// ---------- what the app and the stream see ----------
/** 💿 Albums (from a RateYourMusic import) by the artist of this song: the artist's name has to be in the song's title as whole words. Best rated first. */
export function albumsFor(title, d = data()) {
  const t = ' ' + norm(title) + ' '; if (t.trim().length < 3) return []; const avg = L => { const r = (L.rate || []).filter(x => x != null); return r.length ? r.reduce((a, b) => a + b, 0) / r.length : -1; };
  return Object.values(d.lib).filter(L => L.album && L.artist && norm(L.artist).length >= 3 && t.includes(' ' + norm(L.artist) + ' ') && norm(L.title) !== t.trim()).sort((a, b) => avg(b) - avg(a)).slice(0, 5).map(L => ({ title: L.artist && L.title.startsWith(L.artist + ' - ') ? L.title.slice(L.artist.length + 3) : L.title, artist: L.artist, year: L.year || '', rate: L.rate || [null, null] }));
}
const view = (d, q, o) => (q ? { ...q, albums: albumsFor(q.title, d), lib: (L => (L ? { plays: L.plays, requests: L.requests, rate: L.rate || [null, null], last: L.last, old: !!L.old } : null))(d.lib[q.key]) } : null);
function plRates(d) { const out = {}; for (const hp of [d.holdPlay, d.backupPlay]) for (const yt of (hp && hp.ids) || []) { const L = d.lib['yt:' + yt]; if (L && (L.rate || []).some(x => x != null)) out[yt] = L.rate; } return out; }
/** 📥 (1.146.0, Derek: "won't let me add these to main list") playlists whose songs the app doesn't know yet are read from YouTube by themselves (when the app opens, when the Playlists tab opens, every hour). */
let readingAll = false;
export async function playlistReadAll(force) {
  const d = data(); if (readingAll) return { busy: true }; const noNames = p => !!p.learned && (p.tracks || []).some(x => !x.title) && Date.now() - (p.nameTry || 0) > 86400000; /* (songs the player told us about come without names: read the playlist once more for them) */
  const todo = (d.playlists || []).filter(p => !p.songs && ((!tracksOf(p).length && (force || !p.readFail || Date.now() - p.readFail > 50 * 60000)) || noNames(p))); if (!todo.length) return { read: 0, failed: 0 };
  readingAll = true; let read = 0, failed = 0;
  try { for (const p of todo) { const had = tracksOf(p).length > 0; if (had) p.nameTry = Date.now(); let got = null; try { got = await H.plRead(p.list); } catch {} if (had && !(got && got.tracks && got.tracks.length && !got.partial)) continue; if (got && got.tracks && got.tracks.length) { delete p.learned; p.tracks = got.tracks.slice(0, 1000).map(x => ({ yt: x.yt, title: String(x.title || '').slice(0, 140) })); p.readAt = Date.now(); delete p.readFail; read++; H.act(`Playlist read: “${p.name}” (${p.tracks.length} songs)`, { icon: '📻', kind: 'playlist' }); } else { p.readFail = Date.now(); failed++; } } }
  finally { readingAll = false; }
  if (read) refill(d); changed(); return { read, failed };
}
/** The player told us a playlist song's name: kept, so the list of what's next shows names. */
export function playlistTitle(yt, title) { const d = data(); title = String(title || '').trim().slice(0, 140); if (!/^[A-Za-z0-9_-]{11}$/.test(String(yt || '')) || !title) return {}; let n = 0;
  for (const p of d.playlists || []) for (const x of p.tracks || []) if (x.yt === yt && !x.title) { x.title = title; n++; }
  for (const hp of [d.holdPlay, d.backupPlay]) for (const x of (hp && hp.items) || []) if (x.yt === yt && !x.title) { x.title = title; n++; }
  if (n) save(); return { n }; }
export function state({ q = '', sort = 'last', limit = 200 } = {}) {
  const d = data(), o = opts(d), all = Object.values(d.lib), s = norm(q);
  let rows = s ? all.filter(L => norm(L.title).includes(s) || Object.keys(L.by || {}).some(l => l.includes(low(q)))) : all;
  const avg = L => { const r = (L.rate || []).filter(x => x != null); return r.length ? r.reduce((a, b) => a + b, 0) / r.length : -1; };
  rows = rows.sort(sort === 'title' ? (a, b) => a.title.localeCompare(b.title) : sort === 'plays' ? (a, b) => b.plays - a.plays || a.title.localeCompare(b.title) : sort === 'rating' ? (a, b) => avg(b) - avg(a) || b.plays - a.plays : sort === 'a' ? (a, b) => (b.rate?.[0] ?? -1) - (a.rate?.[0] ?? -1) : sort === 'b' ? (a, b) => (b.rate?.[1] ?? -1) - (a.rate?.[1] ?? -1) : (a, b) => (b.last || 0) - (a.last || 0) || a.title.localeCompare(b.title));
  const rated = all.filter(L => (L.rate || []).some(x => x != null));
  const plOk = id => id === 'main' ? mainIds(d).length > 0 : (d.playlists || []).some(p => p.id === id);
  return { on: true, open: d.open, playlists: (d.playlists || []).map(p => ({ ...p, tracks: undefined, n: tracksOf(p).length, known: tracksOf(p).length > 0, main: p.main !== false })), mainN: mainIds(d).length, mainOrder: d.mainOrder === 'order' ? 'order' : 'shuffle', backup: plOk(d.backup) ? d.backup : '', hold: plOk(d.hold) && d.holdPlay ? d.hold : '', holdPlay: plOk(d.hold) ? d.holdPlay || null : null, backupPlay: plOk(d.backup) ? d.backupPlay || null : null, plRate: plRates(d), unread: (d.playlists || []).filter(p => !p.songs && !tracksOf(p).length).length, reading: !!readingAll, opts: o, now: view(d, d.now, o), queue: d.queue.map(x => view(d, x, o)), played: d.played.slice(0, 40).map(x => ({ ...x, rate: (d.lib[x.key] && d.lib[x.key].rate) || [null, null], yt: (d.lib[x.key] && d.lib[x.key].yt) || '' })), banned: d.banned, bannedUsers: d.bannedUsers,
    lib: rows.slice(0, limit).map(L => ({ key: L.key, title: L.title, yt: L.yt, plays: L.plays, requests: L.requests, rate: L.rate || [null, null], last: L.last, album: !!L.album, year: L.year || '', who: Object.entries(L.by || {}).sort((a, b) => b[1] - a[1]).slice(0, 3).map(x => x[0]) })), found: rows.length, total: all.length, q, sort,
    stats: { albums: all.filter(L => L.album).length, songs: all.length, plays: all.reduce((n, L) => n + (L.plays || 0), 0), rated: rated.length, avg: [0, 1].map(i => { const v = all.map(L => L.rate?.[i]).filter(x => x != null); return v.length ? Math.round(10 * v.reduce((a, b) => a + b, 0) / v.length) / 10 : null; }),
      requesters: Object.entries(d.req).map(([login, x]) => ({ login, name: x.name || login, n: x.n, last: x.last || 0 })).sort((a, b) => b.n - a.n).slice(0, 25),
      top: [...all].filter(L => L.requests || L.plays).sort((a, b) => (b.requests || 0) - (a.requests || 0) || b.plays - a.plays).slice(0, 15).map(L => ({ title: L.title, requests: L.requests, plays: L.plays })),
      best: [...rated].sort((a, b) => avg(b) - avg(a)).slice(0, 10).map(L => ({ title: L.title, rate: L.rate })) } };
}
/** 🕰️ (1.132.6) History → 🎵 Music: the totals, top lists and every song that was played (newest first). */
export function history() { const d = data(), s = state(), o = s.opts; return { raters: o.raters, scale: o.scale, solo: !!o.solo, noRate: !!o.noRate, stats: s.stats, rated: Object.entries(d.lib).filter(([, L]) => (L.rate || []).some(r => r != null)).map(([key, L]) => ({ key, title: L.title || key, rate: L.rate, plays: L.plays || 0, last: L.last || 0, at: L.ratedAt || L.last || 0, album: !!L.album })), played: d.played.map(x => ({ key: x.key, title: x.title, by: x.by || '', at: x.at, rate: (d.lib[x.key] && d.lib[x.key].rate) || [null, null], plays: (d.lib[x.key] && d.lib[x.key].plays) || 0 })) }; }
export function screen() { const d = data(), o = opts(d); return { type: 'songState', show: on() && o.overlay !== false && !!(d.now || d.queue.length), now: d.now ? { title: d.now.title, by: d.now.by, rate: o.noRate ? [null, null] : o.solo ? [(d.lib[d.now.key]?.rate || [null])[0], null] : d.lib[d.now.key]?.rate || [null, null], plays: d.lib[d.now.key]?.plays || 0 } : null, next: d.queue.slice(0, 3).map(q => ({ title: q.title, by: q.by })), more: Math.max(0, d.queue.length - 3), raters: o.raters, scale: o.scale, command: o.command, open: d.open }; }
// 🎄 Christmas songs, month by month (1.154.0, Derek for Birx & Jess). A song counts when its name has a Christmas word, or when it was marked by hand (lib `xmas` true / false wins).
const XMAS = /\b(christmas|x-?mas|santa|jingle|noel|no[eë]l|sleigh|rudolph|frosty|mistletoe|reindeer|yuletide|yule|navidad|silent night|holy night|winter wonderland|let it snow|deck the halls?|holly jolly|drummer boy|feliz navidad|white christmas|the grinch|grinch|nutcracker|carol of the bells|auld lang syne|fairytale of new york|wonderful time of the year|chestnuts roasting|bells? ring|sugar plum|12 days|twelve days|first snow|merry little|baby,? it'?s cold outside|snowman|do they know it'?s|wenceslas|three kings|away in a manger|joy to the world|hark!? the herald|o come all ye|god rest ye|little saint nick|run ?run rudolph|last christmas|underneath the tree|step into christmas)\b/i;
export const isXmas = (title, L) => (L && typeof L.xmas === 'boolean' ? L.xmas : XMAS.test(String(title || '')));
export function xmasMark(key, yes) { const d = data(), L = d.lib[key]; if (!L) throw new Error('That song is not in the song list any more.'); if (yes == null) delete L.xmas; else L.xmas = !!yes; changed(); return xmasHist(); }
export function xmasHist(d = data()) {
  const months = new Map(), songs = new Map(), people = new Map(), other = new Map(), mk = t => { const x = new Date(t); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0'); };
  for (const r of d.xlog || []) { const L = d.lib[r.key], title = (L && L.title) || r.title || r.key;
    if (!isXmas(title, L)) { if (L) { const o = other.get(r.key) || { key: r.key, title, n: 0, last: 0 }; o.n++; o.last = Math.max(o.last, r.at); other.set(r.key, o); } continue; }
    const k = mk(r.at), M = months.get(k) || { k, n: 0, who: new Set(), songs: new Map() }; months.set(k, M); M.n++; if (r.by) M.who.add(r.by.toLowerCase());
    const s = M.songs.get(r.key) || { key: r.key, title, n: 0, by: [], last: 0, can: !!L, marked: !!(L && L.xmas === true) }; M.songs.set(r.key, s); s.n++; s.last = Math.max(s.last, r.at); if (r.by && !s.by.includes(r.by)) s.by.push(r.by);
    const t = songs.get(r.key) || { key: r.key, title, n: 0 }; songs.set(r.key, t); t.n++;
    if (r.by) { const p = people.get(r.by.toLowerCase()) || { login: r.login || r.by.toLowerCase(), name: r.by, n: 0 }; people.set(r.by.toLowerCase(), p); p.n++; } }
  const list = [...months.values()].sort((a, b) => (a.k < b.k ? 1 : -1)).map(M => ({ k: M.k, n: M.n, people: M.who.size, songs: [...M.songs.values()].sort((a, b) => b.n - a.n || b.last - a.last) })), years = {}; for (const M of list) years[M.k.slice(0, 4)] = (years[M.k.slice(0, 4)] || 0) + M.n;
  const first = (d.xlog || [])[0];
  return { months: list, years: Object.entries(years).sort((a, b) => (a[0] < b[0] ? 1 : -1)).map(([y, n]) => ({ y, n })), total: list.reduce((a, M) => a + M.n, 0), songs: songs.size, top: [...songs.values()].sort((a, b) => b.n - a.n).slice(0, 15), who: [...people.values()].sort((a, b) => b.n - a.n).slice(0, 15), other: [...other.values()].sort((a, b) => b.last - a.last).slice(0, 400), since: first ? first.at : 0, log: (d.xlog || []).length };
}
/** 🧪 pretend requests over a few months (marked `test`, taken out again by clearTests / off) */
export function xmasTest(on) { const d = data(); d.xlog = d.xlog.filter(r => !r.test); if (on) { const y = new Date().getFullYear(), at = (yy, m, day) => new Date(yy, m - 1, day, 21, 30).getTime(), T = (yy, m, day, title, by) => d.xlog.push({ at: at(yy, m, day), key: 't:' + norm(title), title, by, login: by.toLowerCase(), test: 1 });
    T(y - 1, 11, 28, 'Pretend Band - Last Christmas', 'Pretend_Ash'); T(y - 1, 12, 3, 'Pretend Band - Last Christmas', 'Pretend_Bee'); T(y - 1, 12, 3, 'Pretend Choir - Jingle Bells', 'Pretend_Ash'); T(y - 1, 12, 10, 'Pretend Singer - Let It Snow', 'Pretend_Cy'); T(y - 1, 12, 17, 'Pretend Band - Last Christmas', 'Pretend_Cy'); T(y - 1, 12, 24, 'Pretend Choir - Silent Night', 'Pretend_Bee'); T(y - 1, 12, 24, 'Pretend Rock Song', 'Pretend_Bee'); T(y, 1, 2, 'Pretend Singer - Let It Snow', 'Pretend_Ash'); T(y, 7, 25, 'Pretend Band - Xmas In July', 'Pretend_Cy');
    d.xlog.sort((a, b) => a.at - b.at); } changed(); return xmasHist(); }
export function clearTests() { const d = data(); if (d.xlog) d.xlog = d.xlog.filter(r => !r.test); d.queue = d.queue.filter(q => !q.test); if (d.now?.test) d.now = null; for (const [k, L] of Object.entries(d.lib)) if (L.test) delete d.lib[k]; for (const l of Object.keys(d.req)) if (/^pretend_/.test(l)) delete d.req[l]; d.played = d.played.filter(p => d.lib[p.key] || !/^Pretend /.test(p.title)); changed(); return state(); }

/** 🧪 the rules + the importer, walked through on pretend data (nothing saved, nothing said, nothing looked up) */
export async function demo() {
  const keep = { ...H }; Object.assign(H, { say: async () => {}, act: () => {}, send: () => {}, allowed: async (m, p) => p === 'all' || !!m.sub || (p === 'vips' && !!m.vip) || (p === 'mods' && !!m.mod), title: async id => 'Looked-up title ' + id, info: async () => null }); const rows = [], add = (what, ok) => rows.push({ what, ok: !!ok });
  try {
    const d = data({ opts: { perUser: 2, max: 4 } }), o = opts(d), v = n => ({ login: n, name: n }), R = (n, a, x = {}) => request(v(n), a, { d, quiet: true, ...x });
    add('A YouTube link is understood (watch, youtu.be, shorts, music)', ytId('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10') === 'dQw4w9WgXcQ' && ytId('https://youtu.be/dQw4w9WgXcQ') === 'dQw4w9WgXcQ' && ytId('https://youtube.com/shorts/dQw4w9WgXcQ') === 'dQw4w9WgXcQ' && ytId('just a song name') === '');
    const a = await R('amy', 'https://youtu.be/dQw4w9WgXcQ'); add('A link is added with its looked-up title', a.ok && a.item.title === 'Looked-up title dQw4w9WgXcQ');
    add('A song name is added as typed', (await R('amy', 'Bohemian Rhapsody')).ok && d.queue.length === 2);
    add('The same song twice is refused', (await R('bob', 'bohemian  RHAPSODY')).why === 'dupe');
    add('A third song from the same person is refused (2 each)', (await R('amy', 'Africa')).why === 'limit');
    d.banned.push({ title: 'Baby Shark', key: 't:baby shark', words: true }); add('A banned song is refused (also inside a longer name)', (await R('bob', 'baby shark (10 hours)')).why === 'banned');
    d.bannedUsers.push('troll'); add('A banned requester is refused', (await R('troll', 'Something nice')).why === 'user');
    add('Other links are refused', (await R('bob', 'https://example.com/song.mp3')).why === 'link');
    await R('bob', 'Africa'); await R('cat', 'Take On Me'); add('A full queue is refused', (await R('dan', 'One More')).why === 'full');
    { const d3 = data({ opts: { perUser: 9, max: 50 } }), V = (a, info, extra) => { Object.assign(d3.opts, { musicOnly: true, dmcaFree: false, maxMins: 10, minViews: 0, ...extra }); return request(v('zed'), 'https://youtu.be/' + a, { d: d3, quiet: true, info }); };
      add('🎼 Music only: a music video is taken, a gaming video is refused', (await V('aaaaaaaaaa1', { category: 'Music', secs: 200, author: 'Some Band' })).ok && (await V('aaaaaaaaaa2', { category: 'Gaming', secs: 200 })).why === 'notmusic');
      add("🎼 Music only: when YouTube doesn't say what kind it is, the song is still taken", (await V('aaaaaaaaaa3', null)).ok);
      add('⏱️ A song over the length limit is refused', (await V('aaaaaaaaaa4', { category: 'Music', secs: 3600 })).why === 'long');
      add('👁️ A video under the view limit is refused', (await V('aaaaaaaaaa5', { category: 'Music', secs: 100, views: 12 }, { minViews: 1000 })).why === 'views');
      add('🛡️ DMCA-free only: a stream-safe channel is taken, another channel is refused, a typed name is refused', (await V('aaaaaaaaaa6', { category: 'Music', secs: 200, author: 'NoCopyrightSounds' }, { dmcaFree: true })).ok && (await V('aaaaaaaaaa7', { category: 'Music', secs: 200, author: 'Big Label VEVO' }, { dmcaFree: true })).why === 'dmca' && (await request(v('zed'), 'Africa', { d: d3, quiet: true })).why === 'needlink');
      Object.assign(d3.opts, { dmcaFree: false, cd: 60 }); await request(v('yan'), 'One', { d: d3, quiet: true }); d3.req.yan = { name: 'yan', n: 1, last: Date.now() }; add('⏳ A wait between requests is kept', (await request(v('yan'), 'Two', { d: d3, quiet: true })).why === 'wait'); }
    { const d4 = data({ opts: { perUser: 9, max: 50 } }), was = H.search; H.search = async q => (/africa/i.test(q) ? [{ id: 'bbbbbbbbbb1', title: 'Toto - Africa (10 hours)', secs: 36000, author: 'Loops' }, { id: 'bbbbbbbbbb2', title: 'Toto - Africa (Official Video)', secs: 275, author: 'TotoVEVO', views: 900000 }] : []);
      const hit = await request(v('zed'), 'africa toto', { d: d4, quiet: true }), miss = await request(v('zed'), 'a song nobody has', { d: d4, quiet: true }); H.search = was;
      add('🔎 A typed song name is looked up on YouTube: the first result that fits the rules is added (the 10-hour one is passed over)', hit.ok && hit.item.yt === 'bbbbbbbbbb2' && hit.item.title === 'Toto - Africa (Official Video)');
      add('🔎 A name YouTube finds nothing for is still added as typed', miss.ok && !miss.item.yt && miss.item.title === 'a song nobody has'); }
    { const mm = mine('amy', d); add('!mysongs: each person\'s songs come with their place in the queue', mm.length === 2 && mm[0].pos === 1 && mm[1].pos === 2 && mine('nobody', d).length === 0); }
    { add('📻 A playlist link gives its list id, and a plain video link is refused', plId('https://www.youtube.com/playlist?list=PLabcdefghij12345') === 'PLabcdefghij12345' && plId('https://youtu.be/dQw4w9WgXcQ?list=PLabcdefghij12345&index=2') === 'PLabcdefghij12345' && plId('https://youtu.be/dQw4w9WgXcQ') === ''); }
    { const d5 = data({ opts: { perUser: 1, perVip: 3, max: 50, search: false } }), V5 = (who, a, x = {}) => request({ login: who, name: who, ...x }, a, { d: d5, quiet: true });
      const vic = []; for (const t of ['V1', 'V2', 'V3', 'V4']) vic.push(await V5('vic', t, { vip: true })); const pam = [await V5('pam', 'P1'), await V5('pam', 'P2')];
      add('👑 VIPs can be given more songs in the queue than everyone else (3 here, everyone else 1)', vic.slice(0, 3).every(r => r.ok) && vic[3].why === 'limit' && pam[0].ok && pam[1].why === 'limit'); }
    { const d6 = data({ opts: { perUser: 9, max: 50, search: false, onlyKnown: true } }); lib(d6, { key: 't:' + norm('Known Song'), title: 'Known Song', yt: '' }).old = true;
      add('📚 Only songs already in the song list: a known song is taken, a new one is refused', (await request(v('kim'), 'Known Song', { d: d6, quiet: true })).ok && (await request(v('kim'), 'Brand New Song', { d: d6, quiet: true })).why === 'unknown'); }
    { const said = [], was = H.say; H.say = async t => { said.push(t); }; const o0 = { ...data().opts }; try { Object.assign(data().opts, { reqInfo: 'Send a link, friend!', reply: true }); lastSay = 0; onChat({ login: 'zed', name: 'zed', text: (opts().command || '!sr') }); } finally { data().opts = Object.assign(data().opts, o0); if (!('reqInfo' in o0)) delete data().opts.reqInfo; H.say = was; }
      add('✏️ Your own "chat voted to skip" line is used, with the song, who asked and the votes filled in', skipLine('💀 {song} (asked by {by}) is gone after {votes} votes, thanks {name}', 'usual', { title: 'Africa', by: 'amy' }, 'bob', 3) === '💀 Africa (asked by amy) is gone after 3 votes, thanks bob' && skipLine('', 'usual', { title: 'x' }, 'bob', 1) === 'usual');
      add('💬 Your own request help line is said when someone types the request command alone', !on() || !opts().command || said.some(t => /Send a link, friend!/.test(t))); }
    d.open = false; add('Closed = no requests', (await R('dan', 'Later')).why === 'closed'); d.open = true;
    const rym = readText('RYM Album, First Name,Last Name,First Name localized, Last Name localized,Title,Release_Date,Rating,Ownership,Purchase Date,Media Type,Review\n1,"","Toto","","","Toto IV",1982,9,n,,,""\n2,"Daft","Punk","","","Discovery",2001,10,o,,,"great, really"\n3,"","Nobody","","","Wishlist only",1999,0,w,,,""\n', 'songs', { ...o, raters: ['Birx', 'Jess'] }, 1);
    add('A RateYourMusic export is read: artist + album, the rating out of 10, unrated ones left out, for the person you pick', rym.rym && rym.songs.length === 2 && rym.songs[0].title === 'Toto - Toto IV' && rym.songs[0].rate[1] === 9 && rym.songs[0].rate[0] === null && rym.songs[1].title === 'Daft Punk - Discovery' && rym.songs[1].year === '2001' && rym.songs[1].album);
    { const d2 = { lib: { 't:toto toto iv': { key: 't:toto toto iv', title: 'Toto - Toto IV', album: true, artist: 'Toto', year: '1982', rate: [9, null] } } }, hit = albumsFor('Toto - Africa (Official Video)', d2), miss = albumsFor('Totoro theme song', d2); add('When a song by that artist plays, their rated albums show (and only for that artist)', hit.length === 1 && hit[0].title === 'Toto IV' && !miss.length); }
    const t = readTable([['Song', 'Artist', 'Link', 'Birx', 'Jess', 'Times played'], ['Africa', 'Toto', 'https://youtu.be/FTQbiNvZqaY', '9', '8.5', '4'], ['Take On Me', 'a-ha', '', '7', '', '2']], 'songs', { ...o, raters: ['Birx', 'Jess'] });
    add('A ratings spreadsheet is read (song, artist, link, both ratings, plays)', t.songs.length === 2 && t.songs[0].title === 'Toto - Africa' && t.songs[0].yt === 'FTQbiNvZqaY' && t.songs[0].rate[0] === 9 && t.songs[0].rate[1] === 8.5 && t.songs[0].plays === 4 && t.songs[1].rate[1] === null);
    const b = readText('1. Baby Shark\nhttps://www.youtube.com/watch?v=XqZsoesa55w\nNever Gonna Give You Up | https://youtu.be/dQw4w9WgXcQ', 'banned', o);
    add('A pasted banned-songs list is read (names, links, both)', b.songs.length === 3 && b.songs[0].title === 'Baby Shark' && b.songs[1].yt === 'XqZsoesa55w' && b.songs[2].yt === 'dQw4w9WgXcQ' && b.songs[2].title === 'Never Gonna Give You Up');
  } finally { Object.assign(H, keep); }
  return { ok: rows.every(r => r.ok), rows };
}

/** 🔊 (1.131.0, Derek: "look at volume and try to keep volume the same: turning up quieter songs and vice versa"). YouTube measures every video's loudness
 * (loudnessDb on its page: 0 = its normal level, + = louder, − = quieter) and already turns LOUD videos down by itself, but never turns quiet ones up.
 * So the app turns quiet songs up by the missing amount (up to levelMax ×), and with levelDown also turns loud ones down itself (for when they still stand out).
 * Returns how many times the song volume to play at (1 = as is). The boost needs room: at a song volume of 100 nothing can go louder. */
export function levelGain(db, o = opts()) {
  if (o.level === false || db == null || !Number.isFinite(Number(db))) return 1; db = Number(db);
  if (db > 0 && !o.levelDown) return 1;
  return Math.max(0.25, Math.min(o.levelMax || 2.5, Math.pow(10, -db / 20)));
}
/** 🧪 the smart search + volume levelling on pretend YouTube results (nothing is looked up) */
export function searchDemo(o0 = {}) {
  const o = { ...opts(), ...o0 }, rows = [], add = (what, ok, extra) => rows.push({ what, ok: !!ok, ...(extra || {}) });
  const R = (id, title, author, secs, views, x) => ({ id: id.padEnd(11, 'x').slice(0, 11), title, author, secs, views, ...(x || {}) });
  const africa = [R('live1', 'Toto - Africa (Live at Montreux 1991)', 'Toto', 330, 8e6), R('cov1', 'Africa - Toto (Cover by Pretend Band)', 'Pretend Band', 270, 2e6), R('sped1', 'toto - africa (sped up)', 'speed songs', 190, 3e6),
    R('lyr1', 'Toto - Africa (Lyrics)', '7clouds', 295, 9e7), R('vid1', 'Toto - Africa (Official HD Video)', 'TotoVEVO', 275, 9e8, { artist: true }), R('top1', 'Africa', 'Toto - Topic', 296, 1.2e8), R('react1', 'FIRST TIME HEARING Toto - Africa | REACTION', 'Pretend Reacts', 720, 4e5)];
  const best = (q, x, list = africa) => pickBest(list, q, { ...o, ...x })[0]?.id.replace(/x+$/, '');
  add('📝 Prefer lyric videos: the lyric video wins over the live one that YouTube listed first', best('africa toto', { searchPrefer: 'lyrics' }) === 'lyr1');
  add('🎧 Prefer official audio: the studio recording (Topic channel) wins', best('africa toto', { searchPrefer: 'audio' }) === 'top1');
  add('🎬 Prefer the official video: the VEVO video wins', best('toto africa', { searchPrefer: 'video' }) === 'vid1');
  add('🎤 Asking for “live” finds the live one', best('africa toto live', {}) === 'live1');
  add('🎸 Asking for a “cover” finds the cover', best('africa toto cover', {}) === 'cov1');
  add('⏩ Asking for “sped up” finds the sped up one', best('africa sped up', {}) === 'sped1');
  add('🚫 A reaction video never wins', !pickBest(africa, 'africa toto', o).slice(0, 3).some(r => r.id.startsWith('react')));
  const oasis = [R('olive', 'Oasis - Live Forever (Live at Knebworth)', 'Oasis', 290, 5e6), R('ostu', 'Oasis - Live Forever (Official Video)', 'Oasis', 276, 6e7, { artist: true })];
  add('🎶 A song with “live” in its name (Live Forever) isn’t treated as a live version, but the concert one still loses', best('live forever oasis', {}, oasis) === 'ostu');
  add('↩️ Smart search off = YouTube’s own order (the live one first)', best('africa toto', { smartSearch: false }) === 'live1');
  const qs = searchQueries('africa toto', { ...o, searchPrefer: 'lyrics' }); add('🔎 Two searches: the name, and the name + “lyrics”', qs.length === 2 && qs[1] === 'africa toto lyrics');
  const g = (db, x) => levelGain(db, { ...o, level: true, levelDown: false, levelMax: 2.5, ...x });
  add('🔉 A quiet song (−6 dB) is turned up about 2×', Math.abs(g(-6) - 1.995) < .01);
  add('🔊 A loud song is left to YouTube (it turns loud ones down by itself)', g(5) === 1);
  add('🔊 …or turned down by the app too, with “Turn loud songs down” on', Math.abs(g(6, { levelDown: true }) - .501) < .01);
  add('📏 Never more than the most it may boost (2.5×)', g(-20) === 2.5);
  add('❔ A song YouTube says nothing about stays as is', g(null) === 1);
  return { ok: rows.every(r => r.ok), rows, table: pickBest(africa, 'africa toto', o).map(r => ({ title: r.title, author: r.author, score: r.score, why: r.why })) };
}

/** 🧪 (1.132.3) who can change the song volume from chat, walked through with pretend chatters (nothing said, the real volume is put back) */
export async function volDemo() {
  const d = data(), keep = { vol: d.opts.vol, perm: d.opts.volPerm, say: H.say, send: H.send, allowed: H.allowed, on: H.on, reply: d.opts.reply }, said = [], rows = [], add = (what, ok) => rows.push({ what, ok: !!ok });
  const wait = () => new Promise(r => setTimeout(r, 15)), cmd = opts(d).volCommand || '!volume', m = (login, badges = {}) => ({ login, name: login, text: '', badges, pretend: true });
  H.say = async t => { said.push(t); }; H.send = () => {}; H.on = () => true; H.allowed = async (x, perm) => perm === 'all' || (perm === 'mods' && !!(x.badges.mod || x.badges.broadcaster)) || (perm === 'subs' && !!(x.badges.subscriber || x.badges.mod || x.badges.broadcaster)); d.opts.reply = true;
  try {
    d.opts.volPerm = 'all'; d.opts.vol = 60; lastSay = 0; onChat({ ...m('pretend_viewer'), text: cmd + ' 35' }); await wait(); add('Everyone: a viewer types ' + cmd + ' 35 → the volume is 35', d.opts.vol === 35);
    d.opts.volPerm = 'mods'; lastSay = 0; onChat({ ...m('pretend_viewer'), text: cmd + ' 90' }); await wait(); add('Mods only: the same viewer can\'t change it (stays 35) and is told who can', d.opts.vol === 35 && said.some(t => /only mods/.test(t)));
    lastSay = 0; onChat({ ...m('pretend_mod', { mod: '1' }), text: cmd + ' 50' }); await wait(); add('Mods only: a mod sets it to 50', d.opts.vol === 50);
    lastSay = 0; said.length = 0; onChat({ ...m('pretend_viewer'), text: cmd }); await wait(); add('Anyone can still ask what the volume is', said.some(t => /volume is 50/.test(t)));
    d.opts.volPerm = 'subs'; lastSay = 0; onChat({ ...m('pretend_sub', { subscriber: '1' }), text: cmd + ' 44' }); await wait(); add('Subs: a sub sets it to 44', d.opts.vol === 44);
  } finally { if (keep.vol === undefined) delete d.opts.vol; else d.opts.vol = keep.vol; if (keep.perm === undefined) delete d.opts.volPerm; else d.opts.volPerm = keep.perm; if (keep.reply === undefined) delete d.opts.reply; else d.opts.reply = keep.reply; H.say = keep.say; H.send = keep.send; H.allowed = keep.allowed; H.on = keep.on; }
  return { ok: rows.every(r => r.ok), rows };
}

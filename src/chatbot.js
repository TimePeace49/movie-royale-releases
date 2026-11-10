// 🤖 Chat bot (1.89.0, Derek, dev mode only for now): "make this app replace Streamlabs bot… adding commands, song request,
// sound alerts… allow imports for easy transfer". Part 1: your own chat commands, timers (messages every so often), quotes,
// and an importer (Streamlabs Chatbot / Cloudbot style files, spreadsheets, or plain lines).
// Data: db.chatbot = { on, commands [{id, name, aliases[], text, perm, cd, ucd, on, uses}], timers [{id, name, text, mins, lines, on, last}],
//                      quotes [{n, text, by, at}], opts {quoteOn, quotePerm, timersLive} }
import { db, save } from './store.js';
import { act } from './activity.js';

export const PERMS = { all: 'Everyone', followers: 'Followers', subs: 'Subs', vips: 'VIPs', mods: 'Mods', streamer: 'Only me' };
const H = { say: async () => {}, canSay: () => true, follows: async () => false, live: () => false, startedAt: () => 0, channel: () => '', chatters: () => [], reserved: () => [], dev: () => false, changed: () => {}, sound: () => {}, soundIn: () => null };
export const setHooks = h => Object.assign(H, h);
const uid = () => Math.random().toString(36).slice(2, 10);
const clampN = (v, lo, hi, d) => { v = Math.round(Number(v)); return Number.isFinite(v) ? Math.max(lo, Math.min(hi, v)) : d; };

export function data() {
  const d = (db.chatbot ||= {});
  d.commands ||= []; d.timers ||= []; d.quotes ||= []; d.opts ||= {};
  if (d.on === undefined) d.on = true;
  return d;
}
export const on = () => H.dev() && data().on !== false;
export const cleanName = n => { n = String(n || '').trim().toLowerCase().split(/\s+/)[0] || ''; if (!n) return ''; return (/^[!?.$~+\-]/.test(n) ? n : '!' + n).slice(0, 40); };

// ---------- who may use a command ----------
export async function allowed(m, perm) {
  if (!perm || perm === 'all') return true;
  const b = m.badges || {}, me = !!b.broadcaster || (!!m.login && m.login === String(H.channel() || '').toLowerCase());
  if (me) return true; if (perm === 'streamer') return false;
  if (b.mod) return true; if (perm === 'mods') return false;
  if (b.vip) return true; if (perm === 'vips') return false;
  if (b.sub) return true; if (perm === 'subs') return false;
  if (perm === 'followers') { if (m.pretend) return !!m.follows; try { return !!(await H.follows(m)); } catch { return false; } }
  return false;
}
const isMod = m => { const b = m.badges || {}; return !!(b.broadcaster || b.mod) || (!!m.login && m.login === String(H.channel() || '').toLowerCase()); };

// ---------- the words in an answer: $user, $target, $arg1, $count, $randnum(1,6)… (Streamlabs Chatbot style) and {user}, {1}, {touser}… (Cloudbot style) ----------
function ago(ms) { const s = Math.max(0, Math.floor(ms / 1000)), h = Math.floor(s / 3600), mi = Math.floor(s % 3600 / 60); return h ? `${h} h ${mi} min` : mi ? `${mi} min` : `${s} s`; }
export function fill(text, m, cmd, args) {
  const user = m.name || m.login || 'someone', a = args || [], t1 = String(a[0] || '').replace(/^@/, ''), target = t1 || user, rest = a.join(' ');
  const up = () => H.live() && H.startedAt() ? ago(Date.now() - H.startedAt()) : 'not live right now';
  const rnd = (lo, hi) => { lo = Math.round(Number(lo)); hi = Math.round(Number(hi)); if (!Number.isFinite(lo) || !Number.isFinite(hi)) return ''; if (hi < lo) [lo, hi] = [hi, lo]; return String(lo + Math.floor(Math.random() * (hi - lo + 1))); };
  const someone = () => { const L = H.chatters().filter(Boolean); return L.length ? L[Math.floor(Math.random() * L.length)] : user; };
  const now = new Date();
  let out = String(text || '');
  out = out.replace(/\$randnum\(\s*(-?\d+)\s*,\s*(-?\d+)\s*\)/gi, (_, x, y) => rnd(x, y)).replace(/\{random\.(-?\d+)-(-?\d+)\}/gi, (_, x, y) => rnd(x, y));
  out = out.replace(/\$(?:arg|num)(\d)\b/gi, (_, i) => a[Number(i) - 1] || '').replace(/\{(\d)\}/g, (_, i) => a[Number(i) - 1] || '');
  out = out.replace(/\$(?:targetname|targetid|target|touser)\b/gi, target).replace(/\{(?:touser(?:\.name)?|target)\}/gi, target);
  out = out.replace(/\$(?:username|userid|user)\b/gi, user).replace(/\{user(?:\.name)?\}/gi, user);
  out = out.replace(/\$(?:msg|message)\b/gi, rest).replace(/\{(?:msg|message|query)\}/gi, rest);
  out = out.replace(/\$count\b/gi, String(cmd?.uses ?? 0)).replace(/\{count\}/gi, String(cmd?.uses ?? 0));
  out = out.replace(/\$(?:mychannel|channel)\b/gi, H.channel()).replace(/\{channel(?:\.name)?\}/gi, H.channel());
  out = out.replace(/\$uptime\b/gi, up).replace(/\{uptime\}/gi, up);
  out = out.replace(/\$randusr\b/gi, someone).replace(/\{random\.chatter\}/gi, someone);
  out = out.replace(/\$date\b/gi, now.toLocaleDateString()).replace(/\$time\b/gi, now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }));
  return out.replace(/\s+/g, ' ').trim().slice(0, 480);
}
export const WORDS = [['$user', 'who typed it'], ['$target', 'the name they typed after it (else themselves)'], ['$arg1 … $arg9', 'the 1st … 9th word they typed after it'], ['$msg', 'everything they typed after it'], ['$count', 'how many times the command was used'], ['$randnum(1,100)', 'a random number'], ['$randusr', 'a random recent chatter'], ['$uptime', 'how long you have been live'], ['$channel', 'your channel name'], ['$date / $time', "today's date / the time"]];

// ---------- commands ----------
const byName = n => data().commands.find(c => c.name === n || (c.aliases || []).includes(n));
const cool = new Map(); // "id" / "id:login" → when it was last used
export function saveCommand(b) {
  const d = data(), name = cleanName(b.name); if (!name) throw new Error('Give the command a name, like !discord');
  const text = String(b.text || '').trim().slice(0, 480), hasSound = !!(b.sound || b.soundFrom || (b.id && d.commands.find(c => c.id === b.id)?.sound && b.sound !== ''));
  if (!text && !hasSound) throw new Error('Type what the bot should answer');
  if (H.reserved().includes(name)) throw new Error(`${name} is already one of Movie Royal's own commands. Pick another name.`);
  const aliases = [...new Set((Array.isArray(b.aliases) ? b.aliases : String(b.aliases || '').split(/[\s,]+/)).map(cleanName).filter(x => x && x !== name && !H.reserved().includes(x)))].slice(0, 8);
  const cur = b.id ? d.commands.find(c => c.id === b.id) : null;
  const clash = d.commands.find(c => c !== cur && [name, ...aliases].some(x => c.name === x || (c.aliases || []).includes(x)));
  if (clash) throw new Error(`${clash.name} already uses that name. Edit that one, or pick another name.`);
  const c = cur || { id: uid(), uses: 0, on: true, at: Date.now() };
  Object.assign(c, { name, text, aliases, perm: PERMS[b.perm] ? b.perm : (c.perm || 'all'), cd: clampN(b.cd, 0, 86400, c.cd ?? 5), ucd: clampN(b.ucd, 0, 86400, c.ucd ?? 0) });
  if (b.on != null) c.on = !!b.on; if (b.uses != null) c.uses = clampN(b.uses, 0, 1e9, c.uses || 0);
  if (b.sound !== undefined) { if (b.sound) { c.sound = String(b.sound); delete c.soundMissing; } else { delete c.sound; delete c.soundMissing; } } // 🔊 sound alert: a sound file that plays when the command is used
  if (b.soundFrom) { const got = H.soundIn(String(b.soundFrom)); if (got) { c.sound = got; delete c.soundMissing; } else if (!c.sound) c.soundMissing = String(b.soundFrom).slice(0, 300); }
  if (b.vol != null) c.vol = clampN(b.vol, 0, 100, c.vol ?? 80);
  if (!cur) d.commands.push(c);
  d.commands.sort((x, y) => x.name.localeCompare(y.name)); save(); H.changed(); return c;
}
export function removeCommand(id) { const d = data(), i = d.commands.findIndex(c => c.id === id || c.name === id); if (i < 0) throw new Error('That command is gone already'); const [c] = d.commands.splice(i, 1); save(); H.changed(); return c; }

// ---------- quotes ----------
export function addQuote(text, by) { const d = data(); text = String(text || '').trim().replace(/^["“]|["”]$/g, '').slice(0, 400); if (!text) throw new Error('Type the quote'); const n = d.quotes.reduce((mx, q) => Math.max(mx, q.n), 0) + 1; const q = { n, text, by: String(by || '').slice(0, 40), at: Date.now() }; d.quotes.push(q); save(); H.changed(); return q; }
export function editQuote(n, text) { const q = data().quotes.find(x => x.n === Number(n)); if (!q) throw new Error('No quote with that number'); q.text = String(text || '').trim().slice(0, 400) || q.text; save(); H.changed(); return q; }
export function removeQuote(n) { const d = data(), i = d.quotes.findIndex(x => x.n === Number(n)); if (i < 0) throw new Error('No quote with that number'); const [q] = d.quotes.splice(i, 1); save(); H.changed(); return q; }
const quoteLine = q => `💬 Quote #${q.n}: “${q.text}”${q.at ? ` (${new Date(q.at).toLocaleDateString()})` : ''}`;

// ---------- timers: a message every so many minutes, while you're live and chat is moving ----------
let lines = 0; // chat lines since the bot started counting (timers wait for chat to move)
export function saveTimer(b) {
  const d = data(), text = String(b.text || '').trim().slice(0, 480); if (!text) throw new Error('Type the message');
  const cur = b.id ? d.timers.find(t => t.id === b.id) : null, t = cur || { id: uid(), on: true, last: 0, lineAt: lines };
  Object.assign(t, { name: String(b.name || '').trim().slice(0, 40) || text.slice(0, 24), text, mins: clampN(b.mins, 1, 1440, t.mins ?? 15), lines: clampN(b.lines, 0, 1000, t.lines ?? 5) });
  if (b.on != null) t.on = !!b.on; if (!cur) d.timers.push(t); save(); H.changed(); return t;
}
export function removeTimer(id) { const d = data(), i = d.timers.findIndex(t => t.id === id); if (i < 0) throw new Error('That timer is gone already'); const [t] = d.timers.splice(i, 1); save(); H.changed(); return t; }
export function timerDue(t, now = Date.now(), liveNow = H.live(), n = lines) { if (!t.on) return false; if (data().opts.timersLive !== false && !liveNow) return false; if (now - (t.last || 0) < t.mins * 60000) return false; return n - (t.lineAt || 0) >= (t.lines || 0); }
export function tick(now = Date.now()) {
  if (!on() || !H.canSay()) return 0; let sent = 0;
  for (const t of data().timers) { if (!t.last) { t.last = now - Math.floor(Math.random() * 60000); continue; } if (sent || !timerDue(t, now)) continue; t.last = now; t.lineAt = lines; sent++; H.say(fill(t.text, { name: H.channel() }, null, [])).catch(() => {}); }
  if (sent) save(); return sent;
}

// ---------- chat ----------
const reply = t => H.say(t).catch(() => {});
function manage(m, w0, rest) { // mods: !command add|edit|remove !name words…   ·   !addcom / !editcom / !delcom
  let op = '', body = rest;
  if (w0 === '!command' || w0 === '!commands') { const [o, ...r] = rest.split(/\s+/); op = { add: 'add', edit: 'edit', remove: 'remove', delete: 'remove', del: 'remove' }[String(o || '').toLowerCase()] || ''; body = r.join(' '); if (!op) return false; }
  else op = { '!addcom': 'add', '!editcom': 'edit', '!delcom': 'remove' }[w0];
  if (!op) return false; if (!isMod(m)) return true;
  const [n, ...t] = body.trim().split(/\s+/), name = cleanName(n), text = t.join(' ');
  try {
    if (!name) throw new Error(`type it like: ${w0 === '!command' ? '!command ' + op : w0} !name ${op === 'remove' ? '' : 'the answer'}`);
    const cur = byName(name);
    if (op === 'remove') { if (!cur) throw new Error(`there is no ${name}`); removeCommand(cur.id); reply(`🗑️ ${name} is gone.`); }
    else if (op === 'add') { if (cur) throw new Error(`${name} is there already (edit it instead)`); saveCommand({ name, text }); reply(`✅ ${name} added.`); }
    else { if (!cur) throw new Error(`there is no ${name}`); saveCommand({ ...cur, text }); reply(`✅ ${name} changed.`); }
    act('chat', `${op === 'add' ? 'added' : op === 'edit' ? 'changed' : 'removed'} the chat command ${name}`, { icon: '🤖', who: m.name || m.login, kind: 'botcmd' });
  } catch (e) { reply(`⚠️ @${m.name || m.login} ${e.message}`); }
  return true;
}
function quotes(m, w0, rest) {
  const o = data().opts; if (o.quoteOn === false) return false;
  if (w0 === '!addquote' || (w0 === '!quote' && /^add\b/i.test(rest))) { if (!isMod(m)) return true; try { const q = addQuote(rest.replace(/^add\s*/i, ''), m.name || m.login); reply(`✅ Quote #${q.n} saved.`); } catch (e) { reply(`⚠️ ${e.message}`); } return true; }
  if (w0 === '!delquote' || (w0 === '!quote' && /^(remove|delete|del)\b/i.test(rest))) { if (!isMod(m)) return true; try { const q = removeQuote(rest.replace(/^\D+/, '')); reply(`🗑️ Quote #${q.n} is gone.`); } catch (e) { reply(`⚠️ ${e.message}`); } return true; }
  if (w0 !== '!quote') return false;
  const L = data().quotes; if (!L.length) { reply('💬 No quotes saved yet. Mods can add one with !addquote the words'); return true; }
  const n = Number(rest.trim().replace(/^#/, '')), q = n ? L.find(x => x.n === n) : rest.trim() ? L.filter(x => x.text.toLowerCase().includes(rest.trim().toLowerCase())).sort(() => Math.random() - .5)[0] : L[Math.floor(Math.random() * L.length)];
  reply(q ? quoteLine(q) : `💬 No quote ${n ? '#' + n : 'with those words'} (there are ${L.length}).`); return true;
}
/** a chat message came in: true = the chat bot handled it */
export function onChat(m) {
  if (!on() || m.self) return false;
  lines++;
  const text = String(m.text || '').trim(); if (!text) return false;
  const [w, ...args] = text.split(/\s+/), w0 = w.toLowerCase(), rest = text.slice(w.length).trim();
  if (!H.canSay()) return false;
  if (manage(m, w0, rest)) return true;
  if (quotes(m, w0, rest)) return true;
  const c = byName(w0); if (!c || !c.on) return false;
  const now = Date.now(), who = m.login || m.name || '', mod = isMod(m);
  if (!mod && ((c.cd && now - (cool.get(c.id) || 0) < c.cd * 1000) || (c.ucd && now - (cool.get(c.id + ':' + who) || 0) < c.ucd * 1000))) return true; // (too soon: quietly skipped)
  allowed(m, c.perm).then(ok => { if (!ok) return; cool.set(c.id, Date.now()); cool.set(c.id + ':' + who, Date.now()); c.uses = (c.uses || 0) + 1; save(); if (c.sound) H.sound(c.sound, c.vol ?? 80, c); if (c.text) reply(fill(c.text, m, c, args)); H.changed(); }).catch(() => {});
  return true;
}

// ---------- import: Streamlabs Chatbot / Cloudbot style files, spreadsheets (CSV), or plain lines ----------
const PERM_IN = [[/caster|broadcaster|streamer|owner|only me/i, 'streamer'], [/editor|mod/i, 'mods'], [/vip/i, 'vips'], [/sub/i, 'subs'], [/regular|follow/i, 'followers'], [/every|all|viewer|anyone|public/i, 'all']];
const permIn = v => { if (typeof v === 'number') return v >= 4 ? 'streamer' : v === 3 ? 'mods' : v === 2 ? 'subs' : v === 1 ? 'followers' : 'all'; const s = String(v ?? ''); return (PERM_IN.find(([re]) => re.test(s)) || [0, 'all'])[1]; };
const pick = (o, keys) => { const low = Object.fromEntries(Object.entries(o || {}).map(([k, v]) => [k.toLowerCase().replace(/[\s_-]/g, ''), v])); for (const k of keys) if (low[k] != null && low[k] !== '') return low[k]; return undefined; };
function csvRows(text) { // (a small CSV reader: quotes, commas or tabs or semicolons)
  const sep = (text.split('\n')[0].match(/\t/g) || []).length ? '\t' : (text.split('\n')[0].match(/;/g) || []).length > (text.split('\n')[0].match(/,/g) || []).length ? ';' : ',';
  const rows = []; let row = [], cur = '', q = false;
  for (let i = 0; i < text.length; i++) { const ch = text[i];
    if (q) { if (ch === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; }
    else if (ch === '"') q = true; else if (ch === sep) { row.push(cur); cur = ''; } else if (ch === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; } else if (ch !== '\r') cur += ch; }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  return rows.filter(r => r.some(c => String(c).trim()));
}
function fromObject(o, out, hint) {
  if (o == null || typeof o !== 'object') return;
  const name = pick(o, ['command', 'trigger', 'name', 'cmd', 'commandname']), text = pick(o, ['response', 'message', 'reply', 'text', 'output', 'content', 'quote']);
  const mins = pick(o, ['interval', 'minutes', 'mins', 'every', 'timer']), isQuote = hint === 'quotes' || (pick(o, ['quote']) != null && name == null);
  const file = pick(o, ['file', 'filepath', 'path', 'sound', 'soundfile', 'filename', 'audiofile']); // 🔊 Streamlabs Chatbot's SFX page: a command + a sound file
  if ((hint === 'sfx' || (typeof file === 'string' && /\.(mp3|wav|ogg|m4a|flac|aac|opus)$/i.test(file.trim()))) && name != null && cleanName(name)) {
    const unit = out.cdMins ? 60 : 1, v = Number(pick(o, ['volume', 'vol']));
    return void out.commands.push({ name: cleanName(name), text: typeof text === 'string' && !/\.(mp3|wav|ogg|m4a|flac|aac|opus)$/i.test(text.trim()) ? text.trim() : '', soundFrom: String(file || '').trim(), vol: Number.isFinite(v) ? clampN(v <= 1 ? v * 100 : v, 0, 100, 80) : 80, perm: permIn(pick(o, ['permission', 'userlevel', 'access', 'level', 'perm', 'accesslevel'])), cd: clampN(Number(pick(o, ['cooldown', 'globalcooldown', 'cd'])) * unit, 0, 86400, 5), ucd: clampN(Number(pick(o, ['usercooldown', 'ucd', 'usercd'])) * unit, 0, 86400, 0), uses: clampN(pick(o, ['count', 'uses', 'used']), 0, 1e9, 0), on: pick(o, ['enabled', 'on', 'active']) !== false, aliases: [] });
  }
  if (typeof text !== 'string' || !text.trim()) return;
  if (isQuote) return void out.quotes.push({ text: text.trim(), by: String(pick(o, ['by', 'author', 'addedby', 'user']) || ''), at: Date.parse(pick(o, ['date', 'at', 'created', 'createdat']) || '') || 0, n: Number(pick(o, ['id', 'n', 'number', 'index'])) || 0 });
  if (hint === 'timers' || (mins != null && (hint !== 'commands') && (name == null || !/^[!?.]/.test(String(name))))) return void out.timers.push({ name: String(name || '').trim(), text: text.trim(), mins: clampN(mins, 1, 1440, 15), lines: clampN(pick(o, ['chatlines', 'minlines', 'lines', 'minimumlines']), 0, 1000, 5), on: pick(o, ['enabled', 'on', 'active']) !== false });
  if (name == null || !cleanName(name)) return;
  const cdRaw = pick(o, ['cooldown', 'globalcooldown', 'cd']), ucdRaw = pick(o, ['usercooldown', 'ucd', 'usercd']), unit = out.cdMins ? 60 : 1;
  out.commands.push({ name: cleanName(name), text: text.trim(), perm: permIn(pick(o, ['permission', 'userlevel', 'access', 'level', 'perm', 'accesslevel'])), cd: clampN(Number(cdRaw) * unit, 0, 86400, 5), ucd: clampN(Number(ucdRaw) * unit, 0, 86400, 0), uses: clampN(pick(o, ['count', 'uses', 'used']), 0, 1e9, 0), on: pick(o, ['enabled', 'on', 'active']) !== false, aliases: [].concat(pick(o, ['aliases', 'alias']) || []).flatMap(x => String(x).split(/[\s,]+/)) });
}
/** read an export / pasted text into { commands, timers, quotes, note }. kind: auto | commands | timers | quotes. cdMins: cooldowns in the file are minutes */
export function parseImport(text, kind = 'auto', opt = {}) {
  const out = { commands: [], timers: [], quotes: [], note: '', cdMins: !!opt.cdMins };
  text = String(text || '').replace(/^﻿/, '').trim(); if (!text) throw new Error('Nothing to read: pick a file or paste the text first');
  const hint = kind === 'auto' ? '' : kind;
  let j; if (/^[\[{]/.test(text)) { try { j = JSON.parse(text); } catch {} }
  if (j !== undefined) {
    const walk = (v, h) => { if (Array.isArray(v)) v.forEach(x => typeof x === 'string' ? (h === 'quotes' && out.quotes.push({ text: x.trim(), by: '', at: 0, n: 0 })) : walk(x, h)); else if (v && typeof v === 'object') { const before = out.commands.length + out.timers.length + out.quotes.length; fromObject(v, out, h); if (out.commands.length + out.timers.length + out.quotes.length === before) for (const [k, x] of Object.entries(v)) if (x && typeof x === 'object') walk(x, h || (/quote/i.test(k) ? 'quotes' : /timer/i.test(k) ? 'timers' : /command/i.test(k) ? 'commands' : '')); } };
    walk(j, hint); out.note = 'Read as a bot export file.';
  } else {
    const rows = csvRows(text), head = (rows[0] || []).map(h => String(h).trim()), looksCsv = rows.length > 1 && head.length > 1 && head.some(h => /^(command|trigger|name|response|message|quote|text|reply|file|file ?path|sound)$/i.test(h));
    if (looksCsv) { for (const r of rows.slice(1)) fromObject(Object.fromEntries(head.map((h, i) => [h, r[i] ?? ''])), out, hint); out.note = 'Read as a spreadsheet (the first line names the columns).'; }
    else {
      for (const line of text.split(/\r?\n/).map(l => l.trim()).filter(Boolean).filter((l, i) => !(i === 0 && /^"?(quotes?|text|messages?|commands?|timers?)"?$/i.test(l)))) { /* (a one-column page's title line is not an entry) */
        if (hint === 'quotes' || (!hint && !/^[!?.]\S/.test(line))) { const mq = line.match(/^#?(\d+)[.:)\]\s-]+(.+)$/); out.quotes.push({ text: (mq ? mq[2] : line).trim(), by: '', at: 0, n: mq ? Number(mq[1]) : 0 }); continue; }
        if (hint === 'timers') { const mt = line.match(/^(\d+)\s*(?:m|min|mins|minutes)?[\s:|-]+(.+)$/i); out.timers.push({ name: '', text: (mt ? mt[2] : line).trim(), mins: mt ? clampN(mt[1], 1, 1440, 15) : 15, lines: 5, on: true }); continue; }
        const [n, ...t] = line.split(/\s+/); if (t.length) out.commands.push({ name: cleanName(n), text: t.join(' ').replace(/^[:=|-]+\s*/, ''), perm: 'all', cd: 5, ucd: 0, uses: 0, on: true, aliases: [] });
      }
      out.note = 'Read as plain lines (one per line).';
    }
  }
  delete out.cdMins; return out;
}
/** add what parseImport read. Commands with a name that exists are skipped unless replace is on; quotes with the same words are skipped */
export function applyImport(p, { replace = false } = {}) {
  const d = data(), r = { commands: 0, replaced: 0, skipped: [], timers: 0, quotes: 0 };
  for (const c of p.commands || []) { const cur = byName(c.name); try { if (cur && !replace) { r.skipped.push(`${c.name} (already there)`); continue; } const sc = saveCommand({ ...c, id: cur?.id }); cur ? r.replaced++ : r.commands++; if (c.soundFrom) { if (sc.sound) r.sounds = (r.sounds || 0) + 1; else (r.soundsMissing ||= []).push(c.name); } } catch (e) { r.skipped.push(`${c.name || '?'} (${e.message})`); } }
  for (const t of p.timers || []) { if (d.timers.some(x => x.text === t.text)) continue; try { saveTimer(t); r.timers++; } catch {} }
  for (const q of (p.quotes || []).slice().sort((a, b) => (a.n || 1e9) - (b.n || 1e9))) { if (!q.text || d.quotes.some(x => x.text === q.text)) continue; const nq = addQuote(q.text, q.by); if (q.at) nq.at = q.at; r.quotes++; }
  save(); H.changed();
  act('chat', `Chat bot import: ${r.commands} command${r.commands === 1 ? '' : 's'}${r.replaced ? ` (+${r.replaced} replaced)` : ''}, ${r.timers} timer${r.timers === 1 ? '' : 's'}, ${r.quotes} quote${r.quotes === 1 ? '' : 's'}`, { icon: '🤖', kind: 'botimport' });
  return r;
}
export function exportAll() { const d = data(); return { movieRoyal: 'chatbot', v: 1, commands: d.commands.map(({ id, at, ...c }) => c), timers: d.timers.map(({ id, last, lineAt, ...t }) => t), quotes: d.quotes }; }
export const info = () => { const d = data(); return { on: d.on !== false, opts: { quoteOn: d.opts.quoteOn !== false, timersLive: d.opts.timersLive !== false }, commands: d.commands, timers: d.timers.map(t => ({ ...t, due: timerDue(t) })), quotes: d.quotes.slice().sort((a, b) => b.n - a.n), perms: PERMS, words: WORDS, lines }; };
export function setOpts(b) { const d = data(); if (b.on != null) d.on = !!b.on; for (const k of ['quoteOn', 'timersLive']) if (b[k] != null) d.opts[k] = !!b[k]; save(); H.changed(); return info(); }
// 🧪 a pretend run of one command (nothing is sent to chat)
export function preview(text, who = 'TestViewer', typed = '') { return fill(text, { name: who }, { uses: 7 }, String(typed || '').trim().split(/\s+/).filter(Boolean)); }

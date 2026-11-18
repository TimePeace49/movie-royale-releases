// 📊 Stream report (dev / marathon, Derek: "for this stream only… everyone who was in my list of viewers, how many times they
// chatted, how long they viewed, top 50, how much they donated and how many channel points they used").
// A report counts from the moment it starts: chat lines + watch minutes = today's totals minus what each person had at the start;
// channel points, bits, subs, gift subs and tips are counted as they come in. It never touches a redemption (no refunds, no completing).
import fs from 'fs';
import path from 'path';

let H = { db: () => ({}), save: () => {}, dir: '', bot: () => false };
export const setHooks = h => { H = { ...H, ...h }; };

const low = s => String(s || '').toLowerCase().replace(/[^a-z0-9_]/g, '');
const D = () => H.db().streamReport || null;
const money0 = () => ({ tips: 0, tipN: 0, bits: 0, subs: 0, gifts: 0 });
export const SUB_USD = 5; // (a rough value for one sub / gift sub, only for the "about $" column)

export function start(name) {
  const db = H.db();
  db.streamReport = { on: true, name: String(name || 'This stream').slice(0, 80), from: Date.now(), to: 0, chat: {}, watch: {}, pts: {}, money: {}, names: {} };
  H.save(); return info();
}
export function stop() { const d = D(); if (!d || !d.on) return info(); d.on = false; d.to = Date.now(); H.save(); writeFiles(); return info(); }
// 💬 every chat line (the report counts everyone itself, whether or not the app keeps stats on them)
export function onChat(m) { const d = D(); if (!d || !d.on || !m || m.pretend) return; const k = low(m.login || m.name); if (!k) return; d.chat[k] = (d.chat[k] || 0) + 1; if (m.name) d.names[k] = String(m.name).slice(0, 40); H.save(); }
// 👥 the viewer list, every `mins` minutes while live
export function onWatch(list, mins = 5) { const d = D(); if (!d || !d.on) return; for (const c of list || []) { const k = low(c.login || c.name); if (!k) continue; d.watch[k] = (d.watch[k] || 0) + mins; if (c.name && !d.names[k]) d.names[k] = String(c.name).slice(0, 40); } H.save(); }

// 👀 one look at the viewer count while live (every 2 min): live time, biggest and average viewership
export function sample(viewers, now = Date.now()) {
  const d = D(); if (!d || !d.on) return;
  const v = d.view ||= { liveMs: 0, sum: 0, n: 0, peak: 0, peakAt: 0, last: 0 };
  if (v.last && now - v.last < 6 * 60000) v.liveMs += now - v.last; // (a longer gap = the stream or the app was off in between)
  v.last = now;
  if (viewers != null && viewers >= 0) { v.sum += viewers; v.n++; if (viewers > v.peak) { v.peak = viewers; v.peakAt = now; } }
  H.save();
}
export function onAlert(a) {
  const d = D(); if (!d || !d.on || !a || a.test) return;
  const k = low(a.login || a.name); if (!k || /^anonymous$/.test(k)) return;
  const amt = Number(a.amount) || 0; if (a.name) d.names[k] = String(a.name).slice(0, 40);
  if (a.kind === 'follow') { const f = d.follows ||= []; if (!f.includes(k)) f.push(k); }
  else if (a.kind === 'redeem') { const p = d.pts[k] ||= { n: 0, cost: 0 }; p.n++; p.cost += Math.max(0, amt); }
  else if (a.kind === 'bits') { (d.money[k] ||= money0()).bits += Math.max(0, amt); }
  else if (a.kind === 'sub') { (d.money[k] ||= money0()).subs += 1; }
  else if (a.kind === 'gift') { (d.money[k] ||= money0()).gifts += Math.max(1, amt); }
  else if (a.kind === 'tip') { const m = d.money[k] ||= money0(); m.tips += Math.max(0, amt); m.tipN++; }
  else return;
  H.save();
}

// pure: the rows from a report record + today's viewer records
export function build(d, viewers = {}, isBot = () => false) {
  const rows = new Map();
  const row = (k, name) => { let r = rows.get(k); if (!r) rows.set(k, r = { login: k, name: name || k, msgs: 0, mins: 0, pts: 0, redeems: 0, tips: 0, bits: 0, subs: 0, gifts: 0 }); else if (name && r.name === k) r.name = name; return r; };
  for (const [k, n] of Object.entries(d.chat || {})) row(k, d.names?.[k] || viewers[k]?.name).msgs = n;
  for (const [k, n] of Object.entries(d.watch || {})) row(k, d.names?.[k] || viewers[k]?.name).mins = n;
  for (const [k, p] of Object.entries(d.pts || {})) { const r = row(k, d.names?.[k] || viewers[k]?.name); r.pts = p.cost; r.redeems = p.n; }
  for (const [k, m] of Object.entries(d.money || {})) { const r = row(k, d.names?.[k] || viewers[k]?.name); r.tips = Math.round(m.tips * 100) / 100; r.bits = m.bits; r.subs = m.subs; r.gifts = m.gifts; }
  const list = [...rows.values()].filter(r => !isBot(r.login));
  for (const r of list) r.usd = Math.round((r.tips + r.bits / 100 + (r.subs + r.gifts) * SUB_USD) * 100) / 100;
  list.sort((a, b) => b.mins - a.mins || b.msgs - a.msgs || a.name.localeCompare(b.name));
  const top = (f, n = 50) => list.filter(r => f(r) > 0).sort((a, b) => f(b) - f(a) || b.mins - a.mins).slice(0, n);
  const sum = f => list.reduce((a, r) => a + f(r), 0);
  return {
    name: d.name, from: d.from, to: d.to || 0, on: !!d.on, rows: list, stats: stats(d, list),
    total: { people: list.length, msgs: sum(r => r.msgs), mins: sum(r => r.mins), pts: sum(r => r.pts), redeems: sum(r => r.redeems), tips: Math.round(sum(r => r.tips) * 100) / 100, bits: sum(r => r.bits), subs: sum(r => r.subs), gifts: sum(r => r.gifts), usd: Math.round(sum(r => r.usd) * 100) / 100 },
    top: { watch: top(r => r.mins), chat: top(r => r.msgs), money: top(r => r.usd), points: top(r => r.pts) },
  };
}
function stats(d, list) {
  const v = d.view || {}, sum = f => list.reduce((a, r) => a + f(r), 0), r2 = n => Math.round(n * 100) / 100;
  const liveH = (v.liveMs || 0) / 36e5, tips = r2(sum(r => r.tips)), bits = sum(r => r.bits), subs = sum(r => r.subs), gifts = sum(r => r.gifts);
  const money = { tips, bits: r2(bits / 100), subs: subs * SUB_USD, gifts: gifts * SUB_USD }; money.all = r2(money.tips + money.bits + money.subs + money.gifts);
  return { follows: (d.follows || []).length, followNames: (d.follows || []).map(k => d.names?.[k] || k), liveH: r2(liveH), watchH: Math.round(sum(r => r.mins) / 6) / 10, chats: sum(r => r.msgs), peak: v.peak || 0, peakAt: v.peakAt || 0, avg: v.n ? Math.round(v.sum / v.n) : 0, money, perHour: liveH >= 0.05 ? r2(money.all / liveH) : 0 };
}
export function report() { const d = D(); return d ? build(d, H.db().viewers || {}, H.bot) : null; }
export function info() { const d = D(); if (!d) return { have: false }; const r = report(); return { have: true, on: r.on, name: r.name, from: r.from, to: r.to, total: r.total, stats: r.stats, top3: { watch: r.top.watch.slice(0, 3), chat: r.top.chat.slice(0, 3), money: r.top.money.slice(0, 3), points: r.top.points.slice(0, 3) }, file: H.dir ? path.join(H.dir, 'stream-report.html') : '' }; }

export const hm = mins => { const m = Math.round(mins); return m >= 60 ? `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m` : `${m}m`; };
const num = n => Number(n || 0).toLocaleString('en-US');
const usd = n => '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const when = t => new Date(t).toLocaleString('en-US', { timeZone: 'America/Chicago', weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) + ' CT';

export function csv(r) {
  const q = s => /[",\n]/.test(String(s)) ? '"' + String(s).replace(/"/g, '""') + '"' : String(s);
  const head = ['Name', 'Chat messages', 'Watch minutes', 'Watch time', 'Channel points used', 'Redeems', 'Tips ($)', 'Bits', 'Subs', 'Gift subs', 'About ($)'];
  return '﻿' + [head, ...r.rows.map(x => [x.name, x.msgs, Math.round(x.mins), hm(x.mins), x.pts, x.redeems, x.tips.toFixed(2), x.bits, x.subs, x.gifts, x.usd.toFixed(2)])].map(l => l.map(q).join(',')).join('\r\n') + '\r\n';
}
export function html(r) {
  const T = r.total;
  const tbl = (title, list, cols) => `<h2>${title}</h2>${list.length ? `<table><tr><th>#</th><th>Name</th>${cols.map(c => `<th>${c[0]}</th>`).join('')}</tr>${list.map((x, i) => `<tr><td>${i + 1}</td><td>${esc(x.name)}</td>${cols.map(c => `<td>${c[1](x)}</td>`).join('')}</tr>`).join('')}</table>` : '<p class="m">Nobody yet.</p>'}`;
  const all = [['Chat', x => num(x.msgs)], ['Watched', x => hm(x.mins)], ['Points used', x => num(x.pts)], ['Redeems', x => num(x.redeems)], ['Tips', x => x.tips ? usd(x.tips) : ''], ['Bits', x => x.bits ? num(x.bits) : ''], ['Subs', x => x.subs || ''], ['Gift subs', x => x.gifts || ''], ['About', x => x.usd ? usd(x.usd) : '']];
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(r.name)}: stream report</title><style>
body{font:15px/1.45 system-ui,Segoe UI,Arial,sans-serif;margin:0;padding:22px;background:#14121c;color:#eee}h1{margin:0 0 4px;font-size:26px}h2{margin:26px 0 8px;font-size:19px}
.m{color:#a9a4bd}.tiles{display:flex;flex-wrap:wrap;gap:10px;margin:14px 0}.t{background:#211d2e;border-radius:10px;padding:10px 14px;min-width:120px}.t b{display:block;font-size:22px}
table{border-collapse:collapse;width:100%;max-width:1100px}th,td{text-align:left;padding:5px 9px;border-bottom:1px solid #2c2740;white-space:nowrap}th{color:#c9b8ff;font-size:13px}td:first-child{color:#a9a4bd;width:34px}
@media print{body{background:#fff;color:#000}.t{background:#f1f1f1}th{color:#000}td,th{border-color:#ccc}}</style></head><body>
<h1>📊 ${esc(r.name)}</h1><div class="m">${when(r.from)} → ${r.to ? when(r.to) : when(Date.now()) + ' (still counting)'}</div>
<div class="tiles"><div class="t"><b>${num(T.people)}</b>people</div><div class="t"><b>${num(T.msgs)}</b>chat messages</div><div class="t"><b>${hm(T.mins)}</b>watched in all</div><div class="t"><b>${num(T.pts)}</b>channel points used</div><div class="t"><b>${usd(T.tips)}</b>tips</div><div class="t"><b>${num(T.bits)}</b>bits</div><div class="t"><b>${num(T.subs)}</b>subs</div><div class="t"><b>${num(T.gifts)}</b>gift subs</div><div class="t"><b>${usd(T.usd)}</b>about, in all</div></div>
<h2>📈 The whole stream</h2><div class="tiles"><div class="t"><b>${r.stats.liveH.toFixed(1)} h</b>live</div><div class="t"><b>${num(r.stats.watchH)} h</b>watched in all</div><div class="t"><b>${num(r.stats.chats)}</b>total chats</div><div class="t"><b>${num(r.stats.peak)}</b>biggest viewership${r.stats.peakAt ? '<br><span class="m">' + when(r.stats.peakAt) + '</span>' : ''}</div><div class="t"><b>${num(r.stats.avg)}</b>average viewership</div><div class="t"><b>${num(r.stats.follows)}</b>new followers</div></div>
<div class="tiles"><div class="t"><b>${usd(r.stats.money.bits)}</b>from bits</div><div class="t"><b>${usd(r.stats.money.subs)}</b>from subs</div><div class="t"><b>${usd(r.stats.money.gifts)}</b>from gifted subs</div><div class="t"><b>${usd(r.stats.money.tips)}</b>from donations</div><div class="t"><b>${usd(r.stats.money.all)}</b>money in all</div><div class="t"><b>${usd(r.stats.perHour)}</b>money per live hour</div></div>
<p class="m">"About" = tips + bits (100 = $1) + subs and gift subs at $${SUB_USD} each. Watch time counts while someone is in the viewer list. Channel points = every redeem, from any reward.</p>
${tbl('🏆 Top 50: watched the longest', r.top.watch, [['Watched', x => hm(x.mins)], ['Chat', x => num(x.msgs)]])}
${tbl('💬 Top 50: chatted the most', r.top.chat, [['Chat', x => num(x.msgs)], ['Watched', x => hm(x.mins)]])}
${tbl('💵 Top 50: gave the most', r.top.money, [['About', x => usd(x.usd)], ['Tips', x => x.tips ? usd(x.tips) : ''], ['Bits', x => x.bits ? num(x.bits) : ''], ['Subs', x => x.subs || ''], ['Gift subs', x => x.gifts || '']])}
${tbl('💜 Top 50: channel points used', r.top.points, [['Points', x => num(x.pts)], ['Redeems', x => num(x.redeems)]])}
${r.stats.follows ? `<h2>💜 New followers (${num(r.stats.follows)})</h2><p>${r.stats.followNames.map(esc).join(', ')}</p>` : ''}
${tbl(`👥 Everyone (${num(T.people)})`, r.rows, all)}
</body></html>`;
}
export function writeFiles() {
  const r = report(); if (!r || !H.dir) return null;
  try { fs.mkdirSync(H.dir, { recursive: true }); fs.writeFileSync(path.join(H.dir, 'stream-report.html'), html(r)); fs.writeFileSync(path.join(H.dir, 'stream-report.csv'), csv(r)); return H.dir; } catch { return null; }
}

// 🧪 pretend report (nothing saved): checks the counting rules
export function demo() {
  const d = { on: true, name: 'Pretend stream', from: Date.now() - 36e5, to: 0, chat: {}, watch: {}, pts: {}, money: {}, names: {} };
  const viewers = { oldtimer: { name: 'OldTimer', msgs: 900, watchMins: 4000 } };
  const keep = H.db; let fake = { streamReport: d, viewers }; H.db = () => fake; const saveKeep = H.save; H.save = () => {};
  try {
    for (let i = 0; i < 42; i++) onChat({ login: 'alice', name: 'Alice' }); for (let i = 0; i < 7; i++) onChat({ login: 'newbie', name: 'Newbie' }); for (let i = 0; i < 50; i++) onChat({ login: 'nightbot', name: 'Nightbot' }); onChat({ login: 'pretend_pat', name: 'Pat', pretend: true });
    for (let i = 0; i < 36; i++) onWatch([{ login: 'alice', name: 'Alice' }, { login: 'lurker', name: 'Lurker' }, { login: 'nightbot' }]); for (let i = 0; i < 13; i++) onWatch([{ login: 'bob', name: 'Bob' }]); for (let i = 0; i < 4; i++) onWatch([{ login: 'newbie' }]);
    onAlert({ kind: 'redeem', login: 'alice', name: 'Alice', amount: 2500 }); onAlert({ kind: 'redeem', login: 'alice', name: 'Alice', amount: 500 });
    onAlert({ kind: 'bits', login: 'bob', name: 'Bob', amount: 300 }); onAlert({ kind: 'sub', login: 'bob', name: 'Bob', amount: 14 });
    onAlert({ kind: 'gift', login: 'newbie', name: 'Newbie', amount: 5 }); onAlert({ kind: 'tip', name: 'Tipper Tom', amount: 12.5 });
    onAlert({ kind: 'tip', name: 'Alice', amount: 3 }); onAlert({ kind: 'bits', login: 'x', name: 'Test', amount: 999, test: true }); onAlert({ kind: 'follow', login: 'bob', name: 'Bob' }); onAlert({ kind: 'follow', login: 'bob', name: 'Bob' }); onAlert({ kind: 'follow', login: 'fan9', name: 'Fan9' });
    const t0 = Date.now() - 6e5; sample(20, t0); sample(40, t0 + 120000); sample(60, t0 + 240000); sample(40, t0 + 360000); sample(40, t0 + 36e5); // (the last one is after a long gap: no live time added)
    const r = build(d, viewers, k => k === 'nightbot'), by = Object.fromEntries(r.rows.map(x => [x.login, x]));
    const rows = [
      ['Every chat line since the report started counts', by.alice?.msgs === 42],
      ['Watch time adds up from the viewer list (3 hours)', by.alice?.mins === 180],
      ['Someone who only watched and never chatted is in', by.lurker?.mins === 180 && by.lurker?.msgs === 0],
      ['Someone who was not here this stream is left out', !by.oldtimer],
      ['A brand-new viewer is in', by.newbie?.msgs === 7 && by.newbie?.mins === 20],
      ['Channel points add up per person (2,500 + 500, 2 redeems)', by.alice?.pts === 3000 && by.alice?.redeems === 2],
      ['Bits and a sub count for the right person', by.bob?.bits === 300 && by.bob?.subs === 1],
      ['Gift subs count by how many were gifted', by.newbie?.gifts === 5],
      ['A tip from someone not in chat still shows', by.tippertom?.tips === 12.5],
      ['A tip lands on the same person as their chat name', by.alice?.tips === 3],
      ['"About" adds tips + bits + subs', by.bob?.usd === 8 && by.newbie?.usd === 25],
      ['Bots are left out', !by.nightbot],
      ['Pretend / test chat and alerts are not counted', !by.x && !by.pretend_pat],
      ['Top lists are in order', r.top.watch[0]?.login === 'alice' && r.top.money[0]?.login === 'newbie' && r.top.points[0]?.login === 'alice' && r.top.chat[0]?.login === 'alice'],
      ['Live time, biggest and average viewership come from the viewer counts', r.stats.peak === 60 && r.stats.avg === 40 && r.stats.liveH === 0.1],
      ['New followers are counted once each', r.stats.follows === 2 && !by.fan9],
      ['Money splits into bits, subs, gifted subs and donations', r.stats.money.bits === 3 && r.stats.money.subs === 5 && r.stats.money.gifts === 25 && r.stats.money.tips === 15.5 && r.stats.money.all === 48.5],
      ['Money per live hour = all the money ÷ hours live', r.stats.perHour === 485],
      ['The page and the spreadsheet file can be made', html(r).includes('Top 50') && csv(r).split('\r\n').length === r.rows.length + 2],
    ].map(([name, ok]) => ({ name, ok: !!ok }));
    return { ok: rows.every(x => x.ok), rows, sample: { total: r.total, rows: r.rows }, html: html(r) };
  } finally { H.db = keep; H.save = saveKeep; }
}

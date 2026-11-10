// 🥚 The egg game (1.100.0, made for True's edition; Derek's has it in dev mode to try first).
// Every viewer has an egg. It fills up while they watch and chat, and faster with subs, gift subs, bits, tips (and Kick's Kicks once
// Kick alerts exist). A full egg hatches into one of 40 creature families (120 creatures with their grown forms, 8 elements, all original:
// see public/creatures.js). Creatures earn XP in chat battles, level up and evolve. One profile across Twitch and Kick (!link).
// Everything is kept on this PC; the viewer website gets a public copy (names + creatures) when the 24/7 bot is set up.
import fs from 'node:fs';
import path from 'node:path';
import { db, save, ROOT } from './store.js';

export const DATA = JSON.parse(fs.readFileSync(path.join(ROOT, 'public', 'creatures.js'), 'utf8').match(/\/\*DATA\*\/([\s\S]*?)\/\*END\*\//)[1]);
const FAM = DATA.families, EL = DATA.elements;
export const COUNT = FAM.length * 3;
export const info = n => { n = Math.round(Number(n)); if (!(n >= 1 && n <= COUNT)) return null; const f = Math.floor((n - 1) / 3), st = (n - 1) % 3, F = FAM[f]; return { n, fam: f, stage: st, name: F.names[st], el: F.el, icon: EL[F.el].icon, elName: EL[F.el].name, rare: F.rare, rareName: DATA.rarities[F.rare] }; };

const H = { say: async () => {}, act: () => {}, send: () => {}, on: () => false, live: () => false, isBot: () => false, changed: () => {} };
export const setHooks = h => Object.assign(H, h);
export const on = () => !!H.on();
const low = s => String(s || '').trim().toLowerCase().replace(/^@/, '');
const clampN = (v, lo, hi, d) => { v = Number(v); return Number.isFinite(v) ? Math.max(lo, Math.min(hi, v)) : d; };
export function data(d = (db.eggs ||= {})) { d.players ||= {}; d.alias ||= {}; d.codes ||= {}; d.opts ||= {}; return d; }
export const opts = (d = data()) => ({ need: 240, watch: 5, chat: 1, chatGap: 30, sub: 120, gift: 120, bitsPer: 10, tip: 30, kick: 1, reply: true, liveOnly: true, battleCd: 120, eggCommand: '!egg', petCommand: '!pet', petsCommand: '!pets', equipCommand: '!equip', battleCommand: '!battle', linkCommand: '!link', topCommand: '!eggtop', evolve: [10, 25], ...d.opts });
export const xpNeed = lvl => 30 + lvl * 10; // XP to get from this level to the next
const RARE_W = [60, 28, 10, 2];

// ---------- players (one profile across Twitch and Kick) ----------
export const keyOf = m => (m.kick ? 'k:' : '') + low(m.login);
const realKey = (k, d) => d.alias[k] || k;
export function player(m, d = data(), make = true) {
  const k = realKey(typeof m === 'string' ? m : keyOf(m), d); if (!k || k === 'k:') return null; let p = d.players[k];
  if (!p && make) p = d.players[k] = { key: k, name: (typeof m === 'object' && (m.name || m.login)) || k.replace(/^k:/, ''), pts: 0, seed: Math.floor(Math.random() * 1e6), pets: [], eq: -1, hatched: 0, wins: 0, losses: 0, at: Date.now(), on: {} };
  if (p && typeof m === 'object') { if (m.name) p.name = m.name; p.on[m.kick ? 'kick' : 'twitch'] = low(m.login); }
  return p || null;
}
const eq = p => (p && p.pets[p.eq]) || (p && p.pets[0]) || null;
export const petName = c => (c ? info(c.fam * 3 + c.stage + 1).name : '');
const petInfo = c => info(c.fam * 3 + c.stage + 1);

// ---------- the egg ----------
/** Add hatch points. Returns the creatures that hatched (usually none). `rand` = a 0..1 source (tests). */
export function give(p, pts, why, { d = data(), rand = Math.random, quiet = false, test = false } = {}) {
  if (!p || !(pts > 0)) return []; const o = opts(d), out = []; p.pts += pts; p.got = (p.got || 0) + pts;
  while (p.pts >= o.need && out.length < 500) { p.pts -= o.need; out.push(hatch(p, { d, rand, quiet, test })); }
  return out;
}
export function pickFamily(rand = Math.random) {
  let x = rand() * RARE_W.reduce((a, b) => a + b, 0), rare = 0; for (let i = 0; i < RARE_W.length; i++) { if (x < RARE_W[i]) { rare = i; break; } x -= RARE_W[i]; }
  const pool = FAM.map((F, i) => i).filter(i => FAM[i].rare === rare); return pool[Math.floor(rand() * pool.length) % pool.length];
}
function hatch(p, { d, rand, quiet, test }) {
  const fam = pickFamily(rand), have = p.pets.find(c => c.fam === fam); p.hatched++; p.seed = Math.floor(rand() * 1e6);
  let res;
  if (have) { const up = addXp(have, 60, d); res = { fam, dupe: true, pet: have, up }; } // (one you already have: it gets a big helping of XP instead)
  else { const c = { fam, stage: 0, lvl: 1, xp: 0, at: Date.now() }; p.pets.push(c); if (p.eq < 0) p.eq = 0; res = { fam, dupe: false, pet: c, up: null }; }
  if (!quiet) {
    const I = petInfo(res.pet), F = FAM[fam];
    H.say(res.dupe ? `🥚 @${p.name}'s egg hatched: another ${FAM[fam].names[0]} ${I.icon}! Their ${I.name} gets +60 XP${res.up?.evolved ? ` and evolved into ${I.name}!` : res.up?.levels ? ` (now level ${res.pet.lvl})` : ''}.` : `🥚 @${p.name}'s egg hatched into ${I.name} ${I.icon}${F.rare ? ` (${DATA.rarities[F.rare]}!)` : ''}! A new egg is on its way.`).catch(() => {});
    H.act(`${p.name}'s egg hatched: ${I.name}${res.dupe ? ' (again: +60 XP)' : ''}`, { who: p.name, kind: 'eggHatch', test });
  }
  return res;
}
/** XP → levels → evolving (at level 10 and 25). */
export function addXp(c, xp, d = data()) {
  const o = opts(d), r = { levels: 0, evolved: false }; c.xp += xp;
  while (c.xp >= xpNeed(c.lvl) && c.lvl < 99) { c.xp -= xpNeed(c.lvl); c.lvl++; r.levels++; }
  const st = c.lvl >= o.evolve[1] ? 2 : c.lvl >= o.evolve[0] ? 1 : 0; if (st > c.stage) { c.stage = st; r.evolved = true; }
  return r;
}

// ---------- what feeds the egg ----------
const lastChat = new Map();
export function onChatPoints(m, now = Date.now()) {
  if (!on() || !m?.login || H.isBot(low(m.login))) return; const d = data(), o = opts(d); if (o.liveOnly && !H.live() && !m.pretend) return;
  const k = keyOf(m); if (now - (lastChat.get(k) || 0) < o.chatGap * 1000) return; lastChat.set(k, now); if (lastChat.size > 5000) lastChat.clear();
  const p = player(m, d); give(p, o.chat, 'chat', { test: !!m.pretend }); soon();
}
/** Every 5 minutes while live: everyone in the viewer list. */
export function onWatch(list) { if (!on() || !list) return; const d = data(), o = opts(d); for (const c of list) { if (!c?.login || H.isBot(low(c.login))) continue; const p = player({ login: c.login, name: c.name }, d); give(p, o.watch, 'watch'); const e = eq(p); if (e) addXp(e, 2, d); } /* (watching also trains the creature you have out, a little) */ soon(); H.changed(); }
/** Subs, gift subs, bits, tips (and Kick's Kicks). */
export function onAlert(a) {
  if (!on() || !a?.login) return; const d = data(), o = opts(d), m = { login: a.login, name: a.name, kick: !!a.kick };
  const pts = a.kind === 'sub' ? o.sub : a.kind === 'gift' ? o.gift * Math.max(1, Number(a.amount) || 1) : a.kind === 'bits' ? Math.floor((Number(a.amount) || 0) / Math.max(1, o.bitsPer)) : a.kind === 'tip' ? Math.round((Number(a.amount) || 0) * o.tip) : a.kind === 'kicks' ? Math.round((Number(a.amount) || 0) * o.kick) : 0;
  if (pts > 0) { give(player(m, d), pts, a.kind, { test: !!a.test }); soon(); H.changed(); }
}
let saveT = null; const soon = () => { if (!saveT) saveT = setTimeout(() => { saveT = null; save(); }, 5000); };

// ---------- chat ----------
const said = new Map();
const say = (key, t, gap = 4000) => { const now = Date.now(); if (now - (said.get(key) || 0) < gap) return; said.set(key, now); if (said.size > 2000) said.clear(); if (opts().reply !== false) H.say(t.slice(0, 480)).catch(() => {}); };
const petLine = c => { const I = petInfo(c); return `${I.name} ${I.icon} Lv ${c.lvl}`; };
export function onChat(m) {
  if (!on() || !m?.login) return false; const d = data(), o = opts(d), text = String(m.text || '').trim(), sp = text.split(/\s+/), w = low(sp[0]), arg = text.slice(sp[0].length).trim(), k = keyOf(m);
  if (![o.eggCommand, o.petCommand, o.petsCommand, o.equipCommand, o.battleCommand, o.linkCommand, o.topCommand].map(low).includes(w)) return false;
  const p = player(m, d), name = p.name;
  if (w === low(o.eggCommand)) { const pct = Math.floor(100 * p.pts / o.need); say(k, `🥚 @${name} your egg is ${pct}% of the way there${pct >= 80 ? ', almost!' : '.'} It fills while you watch and chat, and faster with subs, gifts and bits. Hatched so far: ${p.hatched}.`); return true; }
  if (w === low(o.petCommand)) { const c = eq(p); say(k, c ? `🐾 @${name}: ${petLine(c)} (${c.xp}/${xpNeed(c.lvl)} XP${c.stage < 2 ? `, evolves at level ${o.evolve[c.stage]}` : ''}) · ${p.wins} wins. ${o.petsCommand} lists all ${p.pets.length}.` : `🐾 @${name} no creature yet: your egg is ${Math.floor(100 * p.pts / o.need)}% there. ${o.eggCommand} shows it.`); return true; }
  if (w === low(o.petsCommand)) { say(k, p.pets.length ? `🐾 @${name} (${p.pets.length} of ${FAM.length}): ${p.pets.map((c, i) => `${i + 1}. ${petLine(c)}${i === p.eq ? ' ⭐' : ''}`).join(' · ')}. ${o.equipCommand} and a number picks your fighter.` : `🐾 @${name} no creatures yet. ${o.eggCommand} shows your egg.`); return true; }
  if (w === low(o.equipCommand)) { const i = /^\d+$/.test(arg) ? Number(arg) - 1 : p.pets.findIndex(c => low(petName(c)).startsWith(low(arg)) && arg); if (!p.pets[i]) say(k, `🐾 @${name} type ${o.equipCommand} and the number of one of your creatures (${o.petsCommand} lists them).`); else { p.eq = i; soon(); H.changed(); say(k, `⭐ @${name} your fighter is now ${petLine(p.pets[i])}.`); } return true; }
  if (w === low(o.topCommand)) { const t = top(d, 5); say('top', t.length ? `🏆 Most creatures: ${t.map((x, i) => `${i + 1}. ${x.name} (${x.pets}, best Lv ${x.best})`).join(' · ')}` : '🏆 Nobody has hatched an egg yet.', 15000); return true; }
  if (w === low(o.linkCommand)) { link(m, arg, d); return true; }
  if (w === low(o.battleCommand)) { challenge(m, arg, d); return true; }
  return false;
}
/** One profile across Twitch and Kick: !link on one gives a code, !link CODE on the other joins them. */
export function link(m, arg, d = data(), now = Date.now()) {
  const k = keyOf(m), p = player(m, d), o = opts(d), code = String(arg || '').trim().toUpperCase();
  for (const [c, x] of Object.entries(d.codes)) if (now - x.at > 7 * 86400000) delete d.codes[c];
  if (!code) { const c = Math.random().toString(36).slice(2, 8).toUpperCase(); d.codes[c] = { key: realKey(k, d), at: now, from: m.kick ? 'kick' : 'twitch' }; soon(); say(k, `🔗 @${p.name} your code is ${c}. Type ${o.linkCommand} ${c} in my ${m.kick ? 'Twitch' : 'Kick'} chat to share one egg and one set of creatures in both. (Good for 7 days.)`, 2000); return { code: c }; }
  const x = d.codes[code]; if (!x) { say(k, `🔗 @${p.name} I don't know that code. Type ${o.linkCommand} in the other chat to get one.`); return { ok: false, why: 'code' }; }
  if (x.from === (m.kick ? 'kick' : 'twitch')) { say(k, `🔗 @${p.name} use that code in my ${m.kick ? 'Twitch' : 'Kick'} chat, not here.`); return { ok: false, why: 'same' }; }
  const main = d.players[x.key], mine = realKey(k, d); if (!main || mine === x.key) { delete d.codes[code]; return { ok: false, why: 'gone' }; }
  merge(main, d.players[mine], d); delete d.players[mine]; for (const [a, b] of Object.entries(d.alias)) if (b === mine) d.alias[a] = x.key; d.alias[k] = x.key; d.alias[mine] = x.key; main.on[m.kick ? 'kick' : 'twitch'] = low(m.login); delete d.codes[code];
  save(); H.changed(); say(k, `🔗 @${p.name} done! Your egg and your ${main.pets.length} creature${main.pets.length === 1 ? '' : 's'} are the same on Twitch and Kick now.`, 0); return { ok: true, key: x.key };
}
function merge(a, b, d) { if (!b) return; a.pts += b.pts; a.hatched += b.hatched; a.wins += b.wins; a.losses += b.losses; a.got = (a.got || 0) + (b.got || 0); for (const c of b.pets) { const h = a.pets.find(x => x.fam === c.fam); if (!h) a.pets.push(c); else if (c.lvl > h.lvl) Object.assign(h, c); } if (a.eq < 0 && a.pets.length) a.eq = 0; const o = opts(d); while (a.pts >= o.need) { a.pts -= o.need; hatch(a, { d, rand: Math.random, quiet: true }); } }

// ---------- battles ----------
const pending = new Map(), lastFight = new Map(); // target key -> {from, at}
export const power = c => 10 + c.lvl * 3 + c.stage * 8 + FAM[c.fam].rare * 2;
export const edge = (a, b) => (EL[FAM[a.fam].el].beats.includes(FAM[b.fam].el) ? 1.15 : 1);
/** A fight: best of three rounds. Each round = power × element edge × luck (±35%). Returns {win: 0|1, score:[a,b], rounds}. */
export function fight(a, b, rand = Math.random) { const s = [0, 0], rounds = []; for (let i = 0; i < 3 && s[0] < 2 && s[1] < 2; i++) { const x = power(a) * edge(a, b) * (.65 + rand() * .7), y = power(b) * edge(b, a) * (.65 + rand() * .7), w = x >= y ? 0 : 1; s[w]++; rounds.push(w); } return { win: s[0] > s[1] ? 0 : 1, score: s, rounds }; }
export function challenge(m, arg, d = data(), now = Date.now()) {
  const k = realKey(keyOf(m), d), p = player(m, d), o = opts(d), mine = eq(p), key = keyOf(m);
  if (!mine) { say(key, `⚔️ @${p.name} you need a creature first: your egg is ${Math.floor(100 * p.pts / o.need)}% there.`); return { ok: false, why: 'none' }; }
  const cd = o.battleCd * 1000 - (now - (lastFight.get(k) || 0)); if (cd > 0) { say(key, `⚔️ @${p.name} your ${petName(mine)} is catching its breath (${Math.ceil(cd / 1000)} s).`); return { ok: false, why: 'cd' }; }
  const want = low(arg.split(/\s+/)[0]), inv = pending.get(k);
  if (inv && now - inv.at < 90000 && (!want || realKey((m.kick ? 'k:' : '') + want, d) === inv.from || want === low(d.players[inv.from]?.name))) { pending.delete(k); return run(d.players[inv.from], p, d, now); } // (answering a challenge)
  if (!want) { say(key, `⚔️ @${p.name} type ${o.battleCommand} and a name to challenge them. They answer with ${o.battleCommand} to fight.`); return { ok: false, why: 'who' }; }
  const tk = realKey((m.kick ? 'k:' : '') + want, d), t = d.players[tk] || Object.values(d.players).find(x => low(x.name) === want);
  if (!t || t === p) { say(key, t === p ? `⚔️ @${p.name} you can't battle yourself!` : `⚔️ @${p.name} ${arg.split(/\s+/)[0]} has no creature yet.`); return { ok: false, why: 'target' }; }
  if (!eq(t)) { say(key, `⚔️ @${p.name} ${t.name} has no creature yet.`); return { ok: false, why: 'target' }; }
  pending.set(t.key, { from: k, at: now }); say(key, `⚔️ @${t.name}, ${p.name}'s ${petLine(mine)} challenges your ${petLine(eq(t))}! Type ${o.battleCommand} to fight (90 seconds).`, 0); return { ok: true, asked: t.key };
}
function run(a, b, d, now, rand = Math.random, quiet = false) {
  const ca = eq(a), cb = eq(b); if (!ca || !cb) return { ok: false, why: 'none' }; const r = fight(ca, cb, rand), W = r.win ? b : a, L = r.win ? a : b, cw = r.win ? cb : ca, cl = r.win ? ca : cb, nameW = petName(cw), nameL = petName(cl);
  const xw = 30 + Math.max(0, cl.lvl - cw.lvl) * 3, xl = 10, uw = addXp(cw, xw, d), ul = addXp(cl, xl, d); W.wins++; L.losses++; lastFight.set(a.key, now); lastFight.set(b.key, now); save(); H.changed();
  const e = edge(cw, cl) > 1 ? ` ${petInfo(cw).icon} beats ${petInfo(cl).icon}.` : '', up = (who, c, u, was) => (u.evolved ? ` ${who}'s ${was} evolved into ${petName(c)}! ✨` : u.levels ? ` ${who}'s ${petName(c)} is now level ${c.lvl}!` : '');
  if (!quiet) { H.say(`⚔️ ${a.name}'s ${petInfo(ca).icon} ${r.win ? nameL : nameW} vs ${b.name}'s ${petInfo(cb).icon} ${r.win ? nameW : nameL}: ${W.name} wins ${Math.max(...r.score)}–${Math.min(...r.score)}!${e} +${xw} XP / +${xl} XP.${up(W.name, cw, uw, nameW)}${up(L.name, cl, ul, nameL)}`.slice(0, 480)).catch(() => {}); H.act(`Creature battle: ${W.name}'s ${nameW} beat ${L.name}'s ${nameL}`, { kind: 'eggBattle' }); H.send({ type: 'eggBattle', a: { name: a.name, n: petInfo(ca).n, lvl: ca.lvl }, b: { name: b.name, n: petInfo(cb).n, lvl: cb.lvl }, win: r.win, score: r.score }, 'eggs'); }
  return { ok: true, fought: true, win: r.win, winner: W.name, score: r.score };
}

// ---------- the app, the stream and the website ----------
const top = (d, n) => Object.values(d.players).filter(p => p.pets.length).map(p => ({ name: p.name, pets: p.pets.length, best: Math.max(...p.pets.map(c => c.lvl)), wins: p.wins })).sort((a, b) => b.pets - a.pets || b.best - a.best || b.wins - a.wins).slice(0, n);
const pub = (p, o) => ({ name: p.name, key: p.key, pct: Math.floor(100 * p.pts / o.need), seed: p.seed, hatched: p.hatched, wins: p.wins, losses: p.losses, eq: eq(p) ? p.pets.indexOf(eq(p)) : -1, pets: p.pets.map(c => ({ n: c.fam * 3 + c.stage + 1, lvl: c.lvl, xp: c.xp, need: xpNeed(c.lvl) })), on: Object.keys(p.on || {}) });
export function state({ q = '', limit = 200 } = {}) {
  const d = data(), o = opts(d), all = Object.values(d.players), s = low(q), rows = (s ? all.filter(p => low(p.name).includes(s) || p.pets.some(c => low(petName(c)).includes(s))) : all).sort((a, b) => b.pets.length - a.pets.length || (b.got || 0) - (a.got || 0));
  const seen = new Set(); for (const p of all) for (const c of p.pets) for (let st = 0; st <= c.stage; st++) seen.add(c.fam * 3 + st + 1);
  return { on: true, opts: o, players: rows.slice(0, limit).map(p => pub(p, o)), found: rows.length, total: all.length, withPets: all.filter(p => p.pets.length).length, hatched: all.reduce((n, p) => n + p.hatched, 0), seen: seen.size, count: COUNT, top: top(d, 10), linked: Object.keys(d.alias).length };
}
/** What the public website shows: names, eggs and creatures only (what chat can already see). */
export function publicData() { const d = data(), o = opts(d); return { at: Date.now(), count: COUNT, commands: { egg: o.eggCommand, pet: o.petCommand, pets: o.petsCommand, equip: o.equipCommand, battle: o.battleCommand, link: o.linkCommand }, players: Object.values(d.players).filter(p => p.pets.length || p.pts > 0).sort((a, b) => b.pets.length - a.pets.length || (b.got || 0) - (a.got || 0)).slice(0, 2000).map(p => { const x = pub(p, o); delete x.key; return x; }) }; }
/** login → the creature next to their name (the on-stream chat box). */
export function badges() { const d = data(), out = {}; for (const p of Object.values(d.players)) { const c = eq(p); if (!c) continue; const v = { n: c.fam * 3 + c.stage + 1, lvl: c.lvl }; for (const [plat, l] of Object.entries(p.on || {})) out[(plat === 'kick' ? 'k:' : '') + l] = v; } return out; }
export function setOpts(b) {
  const d = data(), x = d.opts;
  for (const [k, lo, hi] of [['need', 20, 100000], ['watch', 0, 1000], ['chat', 0, 100], ['chatGap', 0, 3600], ['sub', 0, 100000], ['gift', 0, 100000], ['bitsPer', 1, 10000], ['tip', 0, 10000], ['kick', 0, 10000], ['battleCd', 0, 86400]]) if (k in b) x[k] = Math.round(clampN(b[k], lo, hi, opts(d)[k]));
  for (const k of ['reply', 'liveOnly']) if (k in b) x[k] = !!b[k];
  for (const k of ['eggCommand', 'petCommand', 'petsCommand', 'equipCommand', 'battleCommand', 'linkCommand', 'topCommand']) if (k in b) { const c = String(b[k] || '').trim().toLowerCase().split(/\s+/)[0]; if (/^![a-z0-9_]{2,20}$/.test(c)) x[k] = c; else throw new Error('A command has to look like !egg'); }
  save(); H.changed(); return state();
}
/** By hand (the streamer): give hatch points, or take a player out. */
export function grant(name, pts) { const d = data(), p = player({ login: low(name), name }, d); if (!p) throw new Error('Type their chat name.'); const got = give(p, Math.round(clampN(pts, 1, 1e6, 0)), 'hand'); save(); H.changed(); return { hatched: got.length, state: state() }; }
export function removePlayer(key) { const d = data(); delete d.players[key]; for (const [a, b] of Object.entries(d.alias)) if (b === key) delete d.alias[a]; save(); H.changed(); return state(); }
export function clearTests() { const d = data(); for (const k of Object.keys(d.players)) if (/^(k:)?pretend_/.test(k)) delete d.players[k]; for (const [a, b] of Object.entries(d.alias)) if (/pretend_/.test(a) || /pretend_/.test(b)) delete d.alias[a]; save(); H.changed(); return state(); }

/** 🧪 the whole game walked through with pretend people (nothing saved, nothing said) */
export function demo() {
  const keep = { ...H }; Object.assign(H, { say: async () => {}, act: () => {}, send: () => {}, changed: () => {} }); const rows = [], add = (what, ok) => rows.push({ what, ok: !!ok });
  try {
    let seed = 7; const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    const d = data({ opts: { need: 100 } }), o = opts(d), A = player({ login: 'amy', name: 'Amy' }, d), B = player({ login: 'bob', name: 'Bob' }, d);
    add('120 creatures: 40 families × 3 forms, every name different', COUNT === 120 && new Set(Array.from({ length: COUNT }, (_, i) => info(i + 1).name)).size === 120);
    add('Every element beats two others', Object.values(EL).every(e => e.beats.length === 2 && e.beats.every(b => EL[b])));
    give(A, 60, 'watch', { d, rand, quiet: true }); add('An egg fills up (60 of 100 points = 60%)', A.pts === 60 && !A.pets.length);
    give(A, 50, 'chat', { d, rand, quiet: true }); add('A full egg hatches, and the extra carries over to the next egg', A.pets.length === 1 && A.pts === 10 && A.hatched === 1 && A.eq === 0);
    const before = A.pets.length; give(A, 100 * 30, 'sub', { d, rand, quiet: true }); add('A big gift hatches several at once (no creature twice: a repeat gives XP)', A.hatched === 31 && A.pets.length > before && new Set(A.pets.map(c => c.fam)).size === A.pets.length);
    const c = { fam: 0, stage: 0, lvl: 1, xp: 0 }; addXp(c, 4000, d); add('XP makes levels, and it evolves at level 10 and 25', c.lvl >= 25 && c.stage === 2 && info(c.fam * 3 + c.stage + 1).name === FAM[0].names[2]);
    const weak = { fam: 10, stage: 0, lvl: 5, xp: 0 }, strong = { fam: 0, stage: 0, lvl: 5, xp: 0 }; let w = 0; for (let i = 0; i < 400; i++) if (fight(strong, weak, rand).win === 0) w++; add(`The element edge matters (🔥 beats 🌿 at the same level: wins ${Math.round(w / 4)}% of 400 fights)`, w > 240);
    const hi = { fam: 5, stage: 2, lvl: 40, xp: 0 }, lo = { fam: 5, stage: 0, lvl: 2, xp: 0 }; let w2 = 0; for (let i = 0; i < 200; i++) if (fight(hi, lo, rand).win === 0) w2++; add('A much higher level wins', w2 === 200);
    give(B, 100, 'x', { d, rand, quiet: true }); const r = run(A, B, d, Date.now(), rand, true); add('A battle gives XP to both and counts a win and a loss', r.fought && A.wins + B.wins === 1 && A.losses + B.losses === 1);
    const K = player({ login: 'amy_k', name: 'AmyOnKick', kick: true }, d); give(K, 100, 'x', { d, rand, quiet: true }); const got = link({ login: 'amy', name: 'Amy' }, '', d), petsBefore = A.pets.length, done = link({ login: 'amy_k', name: 'AmyOnKick', kick: true }, got.code, d);
    add('Twitch + Kick: a code from one chat, typed in the other, makes one profile', done.ok && player({ login: 'amy_k', kick: true }, d, false) === A && A.pets.length >= petsBefore && !d.players['k:amy_k']);
    let counts = [0, 0, 0, 0]; for (let i = 0; i < 4000; i++) counts[FAM[pickFamily(rand)].rare]++; add(`Rare ones are rare (of 4000 eggs: ${counts.join(' / ')} common / uncommon / rare / legendary)`, counts[0] > counts[1] && counts[1] > counts[2] && counts[2] > counts[3] && counts[3] > 0);
  } finally { Object.assign(H, keep); pending.clear(); lastFight.clear(); }
  return { ok: rows.every(r => r.ok), rows };
}

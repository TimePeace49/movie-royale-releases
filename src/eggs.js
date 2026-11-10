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
export const opts = (d = data()) => ({ need: 240, watch: 5, chat: 1, chatGap: 30, sub: 120, gift: 120, bitsPer: 10, tip: 30, kick: 1, reply: true, liveOnly: true, battleCd: 120, eggCommand: '!egg', petCommand: '!pet', petsCommand: '!pets', equipCommand: '!equip', battleCommand: '!battle', linkCommand: '!link', topCommand: '!eggtop', skillsCommand: '!skills', powersCommand: '!powers', powerCommand: '!power', evolve: [10, 25], chatBattle: true, oddsBoost: true, xpJoin: 15, xpWin: 60, buyTitle: '🥚 Buy an egg', buyCost: 1000, ...d.opts });
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

// ---------- skills (one per form reached) and powers (unlocked by level, a creature holds stage + 1 of them) ----------
export const POWERS = DATA.powers, TIERS = DATA.skillTiers;
const has = (c, id) => !!c && Array.isArray(c.pw) && c.pw.includes(id);
export const skillsOf = c => EL[FAM[c.fam].el].skills.slice(0, c.stage + 1);
export const slots = c => c.stage + 1;
export const unlocked = c => POWERS.filter(p => c.lvl >= p.lvl);
/** Put a power on (or take it off). A full creature swaps out the one it has had the longest. */
export function togglePower(c, id) {
  const p = POWERS.find(x => x.id === id); if (!p) return { ok: false, why: 'unknown' }; if (c.lvl < p.lvl) return { ok: false, why: 'level', power: p };
  c.pw = (c.pw || []).filter(x => POWERS.some(q => q.id === x)); if (c.pw.includes(id)) { c.pw = c.pw.filter(x => x !== id); return { ok: true, on: false, power: p }; }
  let dropped = null; if (c.pw.length >= slots(c)) dropped = POWERS.find(x => x.id === c.pw.shift()); c.pw.push(id); return { ok: true, on: true, power: p, dropped };
}
const xpK = c => (has(c, 'learner') ? 1.5 : 1);

// ---------- the egg ----------
// Everyone starts with ONE free egg. More eggs are bought with channel points (or given by the streamer) and wait in the nest: only one
// incubates at a time, and the next one starts by itself when it hatches. Every egg is a surprise (which creature is only rolled when it hatches).
const MONEY = new Set(['sub', 'gift', 'bits', 'tip', 'kicks', 'hand', 'test', 'x']);
export const hasEgg = p => !!p && !p.noEgg;
export const waiting = p => (p && Array.isArray(p.bag) ? p.bag.length : 0);
const newSeed = rand => Math.floor(rand() * 1e6);
/** Add hatch points. Returns the creatures that hatched (usually none). `rand` = a 0..1 source (tests).
 *  No egg in the incubator: watching and chatting do nothing; subs, gifts, bits and tips are kept for the next egg. */
export function give(p, pts, why, { d = data(), rand = Math.random, quiet = false, test = false } = {}) {
  if (!p || !(pts > 0)) return []; const o = opts(d); if (!hasEgg(p) && !MONEY.has(why)) return [];
  if (has(eq(p), 'warm') && why !== 'hand' && why !== 'test') pts = Math.round(pts * 1.25 * 100) / 100; /* 🔥 Egg Warmer */ p.pts = Math.min(o.need * 50, p.pts + pts); p.got = (p.got || 0) + pts;
  return crack(p, { d, rand, quiet, test });
}
function crack(p, { d = data(), rand = Math.random, quiet = false, test = false } = {}) {
  const o = opts(d), out = []; while (hasEgg(p) && p.pts >= o.need && out.length < 500) { p.pts -= o.need; const next = waiting(p) ? p.bag.shift() : null; out.push(hatch(p, { d, rand, quiet, test, last: next == null, left: waiting(p) })); if (next == null) p.noEgg = true; else p.seed = next; }
  return out;
}
/** Put `n` eggs in someone's nest (bought or given). The first goes straight into an empty incubator. */
export function addEggs(p, n = 1, { d = data(), rand = Math.random, quiet = true, test = false } = {}) {
  if (!p) return null; n = Math.max(1, Math.min(100, Math.round(Number(n) || 1))); p.bag = Array.isArray(p.bag) ? p.bag : []; let started = false;
  for (let i = 0; i < n; i++) { if (p.noEgg) { p.noEgg = false; p.seed = newSeed(rand); started = true; } else p.bag.push(newSeed(rand)); }
  p.bought = (p.bought || 0) + n; const out = crack(p, { d, rand, quiet, test }); return { started, waiting: waiting(p), hatched: out };
}
/** Someone redeemed the channel point reward (never refunded: every redeem is an egg, there is no limit). */
export function buy(m, { test = false } = {}) {
  if (!on() || !m?.login) return null; const d = data(), o = opts(d), p = player(m, d), r = addEggs(p, 1, { d, quiet: false, test }); save(); H.changed();
  H.say(r.hatched.length ? `🥚 @${p.name} bought an egg and it's in the incubator${waiting(p) ? ` (${waiting(p)} more waiting)` : ''}.` : r.started ? `🥚 @${p.name} bought an egg! It's in the incubator now: watch and chat to hatch it (${o.eggCommand} shows how far it is).` : `🥚 @${p.name} bought an egg! It waits in their nest (${waiting(p)} waiting) until the one in the incubator hatches.`).catch(() => {});
  H.act(`${p.name} bought an egg (${waiting(p)} waiting)`, { who: p.name, kind: 'eggBuy', test }); return r;
}
export function pickFamily(rand = Math.random) {
  let x = rand() * RARE_W.reduce((a, b) => a + b, 0), rare = 0; for (let i = 0; i < RARE_W.length; i++) { if (x < RARE_W[i]) { rare = i; break; } x -= RARE_W[i]; }
  const pool = FAM.map((F, i) => i).filter(i => FAM[i].rare === rare); return pool[Math.floor(rand() * pool.length) % pool.length];
}
function hatch(p, { d, rand, quiet, test, last = false, left = 0 }) {
  const fam = pickFamily(rand), have = p.pets.find(c => c.fam === fam); p.hatched++;
  let res;
  if (have) { const up = addXp(have, 60, d); res = { fam, dupe: true, pet: have, up }; } // (one you already have: it gets a big helping of XP instead)
  else { const c = { fam, stage: 0, lvl: 1, xp: 0, at: Date.now() }; p.pets.push(c); if (p.eq < 0) p.eq = 0; res = { fam, dupe: false, pet: c, up: null }; }
  if (!quiet) {
    const I = petInfo(res.pet), F = FAM[fam], o = opts(d), nx = last ? ` That was their last egg: get another with channel points (${o.buyTitle}).` : ` Their next egg is in the incubator${left ? ` (${left} more waiting)` : ''}.`;
    H.say(res.dupe ? `🥚 @${p.name}'s egg hatched: another ${FAM[fam].names[0]} ${I.icon}! Their ${I.name} gets +60 XP${res.up?.evolved ? ` and evolved into ${I.name}!` : res.up?.levels ? ` (now level ${res.pet.lvl})` : ''}.${nx}` : `🥚 @${p.name}'s egg hatched into ${I.name} ${I.icon}${F.rare ? ` (${DATA.rarities[F.rare]}!)` : ''}!${nx}`).catch(() => {});
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
  if (![o.eggCommand, o.petCommand, o.petsCommand, o.equipCommand, o.battleCommand, o.linkCommand, o.topCommand, o.skillsCommand, o.powersCommand, o.powerCommand].map(low).includes(w)) return false;
  const p = player(m, d), name = p.name;
  if (w === low(o.eggCommand)) { const pct = Math.min(99, Math.floor(100 * p.pts / o.need)); say(k, hasEgg(p) ? `🥚 @${name} your egg is ${pct}% of the way there${pct >= 80 ? ', almost!' : '.'} It fills while you watch and chat, and faster with subs, gifts and bits. Eggs waiting: ${waiting(p)}. Hatched so far: ${p.hatched}.` : `🥚 @${name} you have no egg right now (hatched so far: ${p.hatched}). Get another with channel points: ${o.buyTitle}.`); return true; }
  if (w === low(o.petCommand)) { const c = eq(p); say(k, c ? `🐾 @${name}: ${petLine(c)} (${c.xp}/${xpNeed(c.lvl)} XP${c.stage < 2 ? `, evolves at level ${o.evolve[c.stage]}` : ''}) · ${p.wins} wins. ${o.petsCommand} lists all ${p.pets.length}.` : `🐾 @${name} no creature yet: your egg is ${Math.floor(100 * p.pts / o.need)}% there. ${o.eggCommand} shows it.`); return true; }
  if (w === low(o.petsCommand)) { say(k, p.pets.length ? `🐾 @${name} (${p.pets.length} of ${FAM.length}): ${p.pets.map((c, i) => `${i + 1}. ${petLine(c)}${i === p.eq ? ' ⭐' : ''}`).join(' · ')}. ${o.equipCommand} and a number picks your fighter.` : `🐾 @${name} no creatures yet. ${o.eggCommand} shows your egg.`); return true; }
  if (w === low(o.equipCommand)) { const i = /^\d+$/.test(arg) ? Number(arg) - 1 : p.pets.findIndex(c => low(petName(c)).startsWith(low(arg)) && arg); if (!p.pets[i]) say(k, `🐾 @${name} type ${o.equipCommand} and the number of one of your creatures (${o.petsCommand} lists them).`); else { p.eq = i; soon(); H.changed(); say(k, `⭐ @${name} your fighter is now ${petLine(p.pets[i])}.`); } return true; }
  if (w === low(o.topCommand)) { const t = top(d, 5); say('top', t.length ? `🏆 Most creatures: ${t.map((x, i) => `${i + 1}. ${x.name} (${x.pets}, best Lv ${x.best})`).join(' · ')}` : '🏆 Nobody has hatched an egg yet.', 15000); return true; }
  if (w === low(o.skillsCommand)) { const c = eq(p); if (!c) say(k, `✨ @${name} no creature yet: ${o.eggCommand} shows your egg.`); else { const sk = skillsOf(c), all = EL[FAM[c.fam].el].skills; say(k, `✨ @${name}'s ${petLine(c)} knows: ${sk.join(', ')}.${c.stage < 2 ? ` It learns ${all[c.stage + 1]} when it evolves at level ${o.evolve[c.stage]}.` : ' That is all three!'} Skills go off by themselves in battles.`); } return true; }
  if (w === low(o.powersCommand)) { const c = eq(p); if (!c) say(k, `💪 @${name} no creature yet: ${o.eggCommand} shows your egg.`); else { const un = unlocked(c), next = POWERS.find(x => x.lvl > c.lvl); say(k, un.length ? `💪 @${name}'s ${petLine(c)} can wear ${slots(c)} power${slots(c) === 1 ? '' : 's'}: ${un.map(x => `${POWERS.indexOf(x) + 1}. ${x.icon} ${x.name}${has(c, x.id) ? ' ⭐' : ''}`).join(' · ')}.${next ? ` Next at level ${next.lvl}.` : ''} ${o.powerCommand} and a number puts one on or off.` : `💪 @${name} your ${petLine(c)} unlocks its first power (${POWERS[0].icon} ${POWERS[0].name}) at level ${POWERS[0].lvl}. Battle and watch to level up!`); } return true; }
  if (w === low(o.powerCommand)) { const c = eq(p); if (!c) { say(k, `💪 @${name} no creature yet.`); return true; } const pw = /^\d+$/.test(arg) ? POWERS[Number(arg) - 1] : arg ? POWERS.find(x => low(x.name).startsWith(low(arg))) : null; if (!pw) { say(k, `💪 @${name} type ${o.powerCommand} and a power's number (${o.powersCommand} lists them).`); return true; }
    const r = togglePower(c, pw.id); if (!r.ok) say(k, `💪 @${name} ${pw.icon} ${pw.name} unlocks when your ${petName(c)} reaches level ${pw.lvl} (it is level ${c.lvl}).`); else { soon(); H.changed(); say(k, r.on ? `💪 @${name}'s ${petName(c)} now has ${pw.icon} ${pw.name}: ${pw.text}${r.dropped ? ` (${r.dropped.name} came off: it holds ${slots(c)}.)` : ''}` : `💪 @${name} took ${pw.icon} ${pw.name} off their ${petName(c)}.`); } return true; }
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
function merge(a, b, d) { if (!b) return; a.bag = [...(a.bag || []), ...(b.bag || [])]; if (hasEgg(b)) { if (a.noEgg) { a.noEgg = false; a.seed = b.seed; } else a.bag.push(b.seed); } /* (both profiles' eggs are kept: one incubates, the rest wait) */ a.bought = (a.bought || 0) + (b.bought || 0); a.pts += b.pts; a.hatched += b.hatched; a.wins += b.wins; a.losses += b.losses; a.got = (a.got || 0) + (b.got || 0); for (const c of b.pets) { const h = a.pets.find(x => x.fam === c.fam); if (!h) a.pets.push(c); else if (c.lvl > h.lvl) Object.assign(h, c); } if (a.eq < 0 && a.pets.length) a.eq = 0; crack(a, { d, quiet: true }); }

// ---------- battles ----------
const pending = new Map(), lastFight = new Map(); // target key -> {from, at}
export const power = c => 10 + c.lvl * 3 + c.stage * 8 + FAM[c.fam].rare * 2;
export const edge = (a, b) => (EL[FAM[a.fam].el].beats.includes(FAM[b.fam].el) ? 1.15 : 1);
/** A fight: best of three rounds. Each round = power × element edge × luck (±35%) × a skill if one goes off, bent by the powers each has on. */
export function fight(a, b, rand = Math.random) {
  const s = [0, 0], rounds = [], used = [], lost = [false, false], side = [a, b];
  const hit = (me, foe, i, round) => {
    let e = has(foe, 'skin') ? 1 : edge(me, foe); if (e > 1 && has(me, 'master')) e = 1 + (e - 1) * 2;
    let luck = .65 + rand() * .7; if (has(me, 'charm')) luck = Math.max(luck, .85); if (has(me, 'will') && round === 0) luck = Math.max(luck, 1);
    let k = 1; if (has(me, 'claws')) k *= 1.08; if (has(me, 'will')) k *= 1.12; if (has(me, 'wind') && lost[i]) k *= 1.2; if (has(me, 'finisher') && round === 2) k *= 1.2; if (has(me, 'underdog') && foe.lvl > me.lvl) k *= 1 + Math.min(.3, (foe.lvl - me.lvl) * .03);
    const sk = skillsOf(me); for (let t = sk.length - 1; t >= 0; t--) if (rand() < TIERS[t].chance * (has(me, 'showoff') ? 1.6 : 1)) { k *= TIERS[t].mult; used.push({ side: i, round, skill: sk[t] }); break; }
    return power(me) * e * luck * k;
  };
  for (let r = 0; r < 3 && s[0] < 2 && s[1] < 2; r++) { const x = hit(a, b, 0, r), y = hit(b, a, 1, r), w = x >= y ? 0 : 1; s[w]++; rounds.push(w); lost[1 - w] = true; lost[w] = false; }
  return { win: s[0] > s[1] ? 0 : 1, score: s, rounds, used };
}
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
  const xw = Math.round((30 + Math.max(0, cl.lvl - cw.lvl) * 3) * xpK(cw)), xl = Math.round(10 * xpK(cl)), uw = addXp(cw, xw, d), ul = addXp(cl, xl, d), best = r.used.filter(u => u.side === r.win).pop(), move = best ? ` ${nameW} used ${best.skill}!` : ''; W.wins++; L.losses++; lastFight.set(a.key, now); lastFight.set(b.key, now); save(); H.changed();
  const e = edge(cw, cl) > 1 ? ` ${petInfo(cw).icon} beats ${petInfo(cl).icon}.` : '', up = (who, c, u, was) => (u.evolved ? ` ${who}'s ${was} evolved into ${petName(c)}! ✨` : u.levels ? ` ${who}'s ${petName(c)} is now level ${c.lvl}!` : '');
  if (!quiet) { H.say(`⚔️ ${a.name}'s ${petInfo(ca).icon} ${r.win ? nameL : nameW} vs ${b.name}'s ${petInfo(cb).icon} ${r.win ? nameW : nameL}: ${W.name} wins ${Math.max(...r.score)}–${Math.min(...r.score)}!${move}${e} +${xw} XP / +${xl} XP.${up(W.name, cw, uw, nameW)}${up(L.name, cl, ul, nameL)}`.slice(0, 480)).catch(() => {}); H.act(`Creature battle: ${W.name}'s ${nameW} beat ${L.name}'s ${nameL}`, { kind: 'eggBattle' }); H.send({ type: 'eggBattle', a: { name: a.name, n: petInfo(ca).n, lvl: ca.lvl }, b: { name: b.name, n: petInfo(cb).n, lvl: cb.lvl }, win: r.win, score: r.score }, 'eggs'); }
  return { ok: true, fought: true, win: r.win, winner: W.name, score: r.score, used: r.used };
}

// ---------- the on-stream chat battle (!join): your creature is your piece, and it earns XP for fighting ----------
/** The creature a chatter brings into the chat battle (null = none yet): what the piece looks like + how much its strength helps the odds. */
export function entrant(login, kick) {
  if (!on()) return null; const d = data(), o = opts(d); if (o.chatBattle === false) return null; const l = low(login), p = d.players[realKey(kick ? 'k:' + l : l, d)] || d.players[realKey('k:' + l, d)], c = eq(p); if (!c) return null;
  const boost = o.oddsBoost === false ? 0 : Math.min(.5, Math.max(0, (power(c) - 13) / 340)) + (has(c, 'crowd') ? .1 : 0);
  return { n: c.fam * 3 + c.stage + 1, lvl: c.lvl, name: petName(c), boost: Math.round(boost * 1000) / 1000 };
}
/** After a chat battle: every creature that fought gets XP, the winner's much more. `fighters` = [{ownerLogin, id}], says one line in chat. */
export function afterChatBattle(fighters, winnerId, { d = data(), quiet = false, test = false } = {}) {
  if (d === data() && !on()) return null; const o = opts(d); if (o.chatBattle === false) return null; const ups = []; let n = 0, win = null;
  for (const f of fighters || []) { const l = low(f.ownerLogin || f.twitch || ''); if (!l) continue; const p = d.players[realKey(l, d)] || d.players[realKey('k:' + l, d)], c = eq(p); if (!c) continue;
    const won = f.id === winnerId, was = petName(c), xp = Math.round((won ? o.xpWin : o.xpJoin) * xpK(c)), u = addXp(c, xp, d); n++; if (won) { win = { name: p.name, pet: petName(c), xp, lvl: c.lvl }; p.arena = (p.arena || 0) + 1; }
    if (u.evolved) ups.push(`${p.name}'s ${was} evolved into ${petName(c)} ✨`); else if (u.levels && won) ups.push(`${p.name}'s ${petName(c)} is level ${c.lvl}`); }
  if (!n) return { n: 0 }; if (d === data()) { save(); H.changed(); }
  if (!quiet) { H.say(`🥚 ${n} creature${n === 1 ? '' : 's'} fought and earned ${o.xpJoin} XP.${win ? ` 🏆 ${win.name}'s ${win.pet} won: +${win.xp} XP!` : ''}${ups.length ? ' ' + ups.slice(0, 4).join(' · ') + (ups.length > 4 ? ` · +${ups.length - 4} more` : '') : ''}`.slice(0, 480)).catch(() => {}); H.act(`Chat battle: ${n} creature${n === 1 ? '' : 's'} earned XP${win ? ` (${win.name}'s ${win.pet} won)` : ''}`, { kind: 'eggArena', test }); }
  return { n, win, ups };
}

// ---------- the app, the stream and the website ----------
const top = (d, n) => Object.values(d.players).filter(p => p.pets.length).map(p => ({ name: p.name, pets: p.pets.length, best: Math.max(...p.pets.map(c => c.lvl)), wins: p.wins })).sort((a, b) => b.pets - a.pets || b.best - a.best || b.wins - a.wins).slice(0, n);
const pub = (p, o) => ({ name: p.name, key: p.key, pct: hasEgg(p) ? Math.min(99, Math.floor(100 * p.pts / o.need)) : 0, egg: hasEgg(p), eggs: waiting(p), seed: p.seed, hatched: p.hatched, wins: p.wins, losses: p.losses, eq: eq(p) ? p.pets.indexOf(eq(p)) : -1, pets: p.pets.map(c => ({ n: c.fam * 3 + c.stage + 1, lvl: c.lvl, xp: c.xp, need: xpNeed(c.lvl), pw: (c.pw || []).filter(x => POWERS.some(q => q.id === x)) })), arena: p.arena || 0, on: Object.keys(p.on || {}) });
export function state({ q = '', limit = 200 } = {}) {
  const d = data(), o = opts(d), all = Object.values(d.players), s = low(q), rows = (s ? all.filter(p => low(p.name).includes(s) || p.pets.some(c => low(petName(c)).includes(s))) : all).sort((a, b) => b.pets.length - a.pets.length || (b.got || 0) - (a.got || 0));
  const seen = new Set(); for (const p of all) for (const c of p.pets) for (let st = 0; st <= c.stage; st++) seen.add(c.fam * 3 + st + 1);
  return { on: true, opts: o, players: rows.slice(0, limit).map(p => pub(p, o)), found: rows.length, total: all.length, withPets: all.filter(p => p.pets.length).length, hatched: all.reduce((n, p) => n + p.hatched, 0), seen: seen.size, count: COUNT, top: top(d, 10), linked: Object.keys(d.alias).length };
}
/** What the public website shows: names, eggs and creatures only (what chat can already see). */
export function publicData() { const d = data(), o = opts(d); return { at: Date.now(), count: COUNT, buyTitle: o.buyTitle, commands: { egg: o.eggCommand, pet: o.petCommand, pets: o.petsCommand, equip: o.equipCommand, battle: o.battleCommand, link: o.linkCommand, skills: o.skillsCommand, powers: o.powersCommand, power: o.powerCommand }, chatBattle: o.chatBattle !== false, players: Object.values(d.players).filter(p => p.pets.length || p.pts > 0).sort((a, b) => b.pets.length - a.pets.length || (b.got || 0) - (a.got || 0)).slice(0, 2000).map(p => { const x = pub(p, o); delete x.key; return x; }) }; }
/** login → the creature next to their name (the on-stream chat box). */
export function badges() { const d = data(), out = {}; for (const p of Object.values(d.players)) { const c = eq(p); if (!c) continue; const v = { n: c.fam * 3 + c.stage + 1, lvl: c.lvl }; for (const [plat, l] of Object.entries(p.on || {})) out[(plat === 'kick' ? 'k:' : '') + l] = v; } return out; }
export function setOpts(b) {
  const d = data(), x = d.opts;
  for (const [k, lo, hi] of [['need', 20, 100000], ['watch', 0, 1000], ['chat', 0, 100], ['chatGap', 0, 3600], ['sub', 0, 100000], ['gift', 0, 100000], ['bitsPer', 1, 10000], ['tip', 0, 10000], ['kick', 0, 10000], ['battleCd', 0, 86400]]) if (k in b) x[k] = Math.round(clampN(b[k], lo, hi, opts(d)[k]));
  for (const k of ['reply', 'liveOnly', 'chatBattle', 'oddsBoost']) if (k in b) x[k] = !!b[k];
  if ('buyTitle' in b) { const t = String(b.buyTitle || '').trim().slice(0, 45); if (t) x.buyTitle = t; }
  for (const [k, lo, hi] of [['xpJoin', 0, 10000], ['xpWin', 0, 10000], ['buyCost', 1, 10000000]]) if (k in b) x[k] = Math.round(clampN(b[k], lo, hi, opts(d)[k]));
  for (const k of ['eggCommand', 'petCommand', 'petsCommand', 'equipCommand', 'battleCommand', 'linkCommand', 'topCommand', 'skillsCommand', 'powersCommand', 'powerCommand']) if (k in b) { const c = String(b[k] || '').trim().toLowerCase().split(/\s+/)[0]; if (/^![a-z0-9_]{2,20}$/.test(c)) x[k] = c; else throw new Error('A command has to look like !egg'); }
  save(); H.changed(); return state();
}
/** By hand (the streamer): give hatch points, or take a player out. */
export function grant(name, pts) { const d = data(), p = player({ login: low(name), name }, d); if (!p) throw new Error('Type their chat name.'); const got = give(p, Math.round(clampN(pts, 1, 1e6, 0)), 'hand'); save(); H.changed(); return { hatched: got.length, state: state() }; }
export function removePlayer(key) { const d = data(); delete d.players[key]; for (const [a, b] of Object.entries(d.alias)) if (b === key) delete d.alias[a]; save(); H.changed(); return state(); }
export function grantEggs(name, n) { const d = data(), p = player({ login: low(name), name }, d); if (!p) throw new Error('Type their chat name.'); const r = addEggs(p, n, { d, quiet: false }); save(); H.changed(); return { waiting: waiting(p), started: r.started, hatched: r.hatched.length, state: state() }; }
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
    give(A, 50, 'chat', { d, rand, quiet: true }); add('A full egg hatches. That was the free one: no egg left, so nothing is in the incubator', A.pets.length === 1 && A.hatched === 1 && A.eq === 0 && !hasEgg(A));
    give(A, 500, 'watch', { d, rand, quiet: true }); add('With no egg, watching and chatting fill nothing', A.hatched === 1 && A.pts === 10);
    const b1 = addEggs(A, 3, { d, rand }); add('Bought eggs: one goes into the incubator, the others wait their turn', b1.started && hasEgg(A) && waiting(A) === 2);
    give(A, 95, 'watch', { d, rand, quiet: true }); add('When it hatches, the next waiting egg starts by itself', A.hatched === 2 && hasEgg(A) && waiting(A) === 1 && A.pts === 5);
    give(A, 1000, 'sub', { d, rand, quiet: true }); add('A big gift only hatches the eggs they have (the rest is kept for the next egg)', A.hatched === 4 && !hasEgg(A) && A.pts > 0); const kept = A.pts; addEggs(A, 1, { d, rand }); add('…and the next egg they buy starts with it', (kept >= 100) ? A.hatched === 5 : A.pts === kept); A.pts = 10; addEggs(A, 40, { d, rand });
    const before = A.pets.length; const h0 = A.hatched; give(A, 100 * 30, 'sub', { d, rand, quiet: true }); add('Lots of eggs hatch one after another (no creature twice: a repeat gives XP)', A.hatched === h0 + 30 && A.pets.length > before && new Set(A.pets.map(c => c.fam)).size === A.pets.length);
    const c = { fam: 0, stage: 0, lvl: 1, xp: 0 }; addXp(c, 4000, d); add('XP makes levels, and it evolves at level 10 and 25', c.lvl >= 25 && c.stage === 2 && info(c.fam * 3 + c.stage + 1).name === FAM[0].names[2]);
    const weak = { fam: 10, stage: 0, lvl: 5, xp: 0 }, strong = { fam: 0, stage: 0, lvl: 5, xp: 0 }; let w = 0; for (let i = 0; i < 400; i++) if (fight(strong, weak, rand).win === 0) w++; add(`The element edge matters (🔥 beats 🌿 at the same level: wins ${Math.round(w / 4)}% of 400 fights)`, w > 240);
    const hi = { fam: 5, stage: 2, lvl: 40, xp: 0 }, lo = { fam: 5, stage: 0, lvl: 2, xp: 0 }; let w2 = 0; for (let i = 0; i < 200; i++) if (fight(hi, lo, rand).win === 0) w2++; add('A much higher level wins', w2 === 200);
    give(B, 100, 'x', { d, rand, quiet: true }); const r = run(A, B, d, Date.now(), rand, true); add('A battle gives XP to both and counts a win and a loss', r.fought && A.wins + B.wins === 1 && A.losses + B.losses === 1);
    const K = player({ login: 'amy_k', name: 'AmyOnKick', kick: true }, d); give(K, 100, 'x', { d, rand, quiet: true }); const got = link({ login: 'amy', name: 'Amy' }, '', d), petsBefore = A.pets.length, done = link({ login: 'amy_k', name: 'AmyOnKick', kick: true }, got.code, d);
    add('Twitch + Kick: a code from one chat, typed in the other, makes one profile', done.ok && player({ login: 'amy_k', kick: true }, d, false) === A && A.pets.length >= petsBefore && !d.players['k:amy_k']);
    add('Every element has three skills, and a creature knows one per form it has reached', Object.values(EL).every(e => e.skills?.length === 3) && skillsOf({ fam: 0, stage: 0 }).length === 1 && skillsOf({ fam: 0, stage: 2 }).length === 3);
    const pc = { fam: 5, stage: 0, lvl: 2, xp: 0 }, t1 = togglePower(pc, 'claws'); pc.lvl = 12; const t2 = togglePower(pc, 'claws'), t3 = togglePower(pc, 'warm');
    add('Powers unlock by level, and a first-form creature holds one (a new one swaps the old one out)', t1.why === 'level' && t2.on && t3.on && t3.dropped?.id === 'claws' && pc.pw.length === 1);
    pc.stage = 2; togglePower(pc, 'claws'); togglePower(pc, 'crowd'); add('A fully grown creature holds three powers', pc.pw.length === 3 && slots(pc) === 3);
    const plain = { fam: 5, stage: 1, lvl: 15, xp: 0 }, geared = { fam: 5, stage: 1, lvl: 15, xp: 0, pw: ['claws', 'wind'] }; let w3 = 0; for (let i = 0; i < 600; i++) if (fight(geared, plain, rand).win === 0) w3++; add(`Powers make a creature stronger (the same creature with 2 powers wins ${Math.round(w3 / 6)}% of 600 fights against itself without)`, w3 > 320);
    let sk = 0; for (let i = 0; i < 200; i++) sk += fight(hi, lo, rand).used.length; add('Skills go off during fights', sk > 50);
    const E1 = player({ login: 'eve', name: 'Eve' }, d), E2 = player({ login: 'fin', name: 'Fin' }, d); give(E1, 100, 'x', { d, rand, quiet: true }); give(E2, 100, 'x', { d, rand, quiet: true }); const x1 = E1.pets[0].xp + E1.pets[0].lvl * 1000, x2 = E2.pets[0].xp + E2.pets[0].lvl * 1000, ar = afterChatBattle([{ id: 'a', ownerLogin: 'eve' }, { id: 'b', ownerLogin: 'fin' }, { id: 'c', ownerLogin: 'nobody' }], 'a', { d, quiet: true });
    add('Chat battle: everyone who fought with a creature gets XP, the winner a lot more', ar.n === 2 && ar.win?.name === 'Eve' && E1.pets[0].xp + E1.pets[0].lvl * 1000 > x1 && E2.pets[0].xp + E2.pets[0].lvl * 1000 > x2 && ar.win.xp === o.xpWin);
    let counts = [0, 0, 0, 0]; for (let i = 0; i < 4000; i++) counts[FAM[pickFamily(rand)].rare]++; add(`Rare ones are rare (of 4000 eggs: ${counts.join(' / ')} common / uncommon / rare / legendary)`, counts[0] > counts[1] && counts[1] > counts[2] && counts[2] > counts[3] && counts[3] > 0);
  } finally { Object.assign(H, keep); pending.clear(); lastFight.clear(); }
  return { ok: rows.every(r => r.ok), rows };
}

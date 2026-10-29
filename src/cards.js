// 🃏 Card battles: your sealed card packs fight each other.
// 🃏 Card pool tab = your packs (search TCGplayer, a count for each pack you own, its picture is downloaded).
// 🃏 Card battles tab = the fights (on stream in the game screen: public/cardfight.js). The winner gets opened: one comes off its count.
// No luck, no chat power-ups. Wacky settings (low gravity, extreme gore, teleport switches…) can be turned on before or during a fight.
import fs from 'fs';
import path from 'path';
import { db, save, uid, UPLOADS } from './store.js';
import { MAP_LIST } from './maps.js';

let hooks = { broadcast: () => {}, pushState: () => {}, say: async () => {}, linkDone: () => {}, goView: () => {}, startBall: () => 'not ready', stopBall: () => {}, preview: () => {} };
export function initCards(h) { hooks = { ...hooks, ...h }; C(); }

export const WACKY = {
  lowgrav: { name: '🪶 Low gravity', desc: 'Floaty jumps and big flying knockbacks' },
  gore: { name: '🩸 Extreme gore', desc: 'Much more blood, packs lose arms and legs, and their face (the top of the pack) can get chopped off' },
  teleport: { name: '🔀 Teleport switches', desc: 'Every few seconds two fighters swap places' },
  turbo: { name: '⚡ Turbo', desc: 'Everyone moves and hits much faster' },
  slowmo: { name: '🐌 Slow motion', desc: 'The whole fight in slow motion, like the movies' },
  giant: { name: '🦍 Giant packs', desc: 'Everyone is huge' },
  tiny: { name: '🐜 Tiny packs', desc: 'Everyone is tiny' },
  slippery: { name: '🧊 Slippery street', desc: 'The street is iced over: everyone slides around and slips' },
  boom: { name: '💣 Exploding K.O.s', desc: 'A knocked-out pack explodes and hurts everyone next to it' },
  onehit: { name: '☠️ One-hit K.O.', desc: 'Every clean hit knocks a pack out' },
  rage: { name: '😡 Rage mode', desc: 'The more hurt a pack is, the harder it hits' },
  weapons: { name: '🗡️ Weapons', desc: 'Swords, staffs and nunchucks drop into the street: whoever grabs one hits harder', maps: ['kungfu'] },
  lions: { name: '🦁 Lions', desc: 'Colosseum only: lions come out of the tunnels and hunt the gladiators. Turn it off and they stop attacking and go back to the tunnels', maps: ['colosseum'] }
};
export const CARD_MAPS = [ // 🃏 card-only maps (drawn by cardfight.js). finalFight = the last two get a weapon each and a FINAL FIGHT with its own timer.
  { id: 'kungfu', name: 'Kung Fu Town', icon: '🏯', desc: 'A martial arts showdown in an old Chinese town, like an old kung fu movie: lanterns, tiled roofs and a dusty street.', modes: ['card'], finalFight: true },
  { id: 'ring', name: 'Rumble Ring', icon: '🔔', desc: 'Every pack starts in a wrestling ring. Slams, suplexes, clotheslines and steel chairs: the only way out is over the top rope (the more hurt a pack is, the easier it goes over). Last pack in the ring wins.', modes: ['card'], finalFight: true },
  { id: 'wizard', name: 'Wizard Battle', icon: '🧙', desc: 'Wizards on a giant floating platform in the night sky. Magic bolts, fireballs, lightning and meteors crack the platform and knock parts away: fall through a hole or off the edge and you\'re out. No weapons.', modes: ['card'], finalFight: true },
  { id: 'colosseum', name: 'Colosseum', icon: '🏛️', desc: 'A gladiator battle in the arena: every pack starts with its own weapon (swords, spears, tridents, axes, maces, flails, hammers, scimitars) and keeps it. Turn on 🦁 Lions and lions come out of the tunnels.', modes: ['card'], finalFight: true }
];
// every map a card battle can use: the card-only maps + every ball map that's for both (played by the ball game, with card fighters)
export const cardMaps = () => [...CARD_MAPS, ...MAP_LIST.filter(m => m.modes?.includes('card')).map(m => ({ id: m.id, name: m.name, icon: m.icon, desc: m.desc, modes: m.modes, ball: true }))];
export const isBallMap = id => !CARD_MAPS.some(m => m.id === id) && MAP_LIST.some(m => m.id === id);
const DEF_BATTLE = () => ({ id: 'cards-main', name: '🃏 Card battle', games: [], mode: 'all', map: 'kungfu' });
export function C() {
  const c = (db.cards ||= {});
  c.pool ||= []; c.history ||= []; c.wacky ||= {};
  if (!Array.isArray(c.battles) || !c.battles.length) c.battles = [DEF_BATTLE()];
  if (!c.battles.some(b => b.id === c.activeId)) c.activeId = c.battles[0].id;
  return c;
}
export const left = p => Math.max(0, Math.round(Number(p.count) || 0));
const activeBattle = () => C().battles.find(b => b.id === C().activeId) || C().battles[0];
export const getBattle = id => C().battles.find(b => b.id === id) || null;
export const games = () => [...new Set(C().pool.filter(p => p.status !== 'hidden').map(p => p.game || 'Other'))].sort();

// ---------- 🔍 searching packs (TCGplayer's own site search: every card game, with pictures) ----------
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
const IMG = id => `https://tcgplayer-cdn.tcgplayer.com/product/${id}_in_400x400.jpg`;
// More than one place to look, because one alone often finds nothing:
//  1. TCGplayer's search page, opened in a hidden browser window inside Movie Royal (like you'd see it), read for products
//  2. TCGplayer's own search service (what their page asks behind the scenes)
//  3. 🌐 pictures from the web (DuckDuckGo images) for the words you typed: pick the right picture
const decode = t => String(t || '').replace(/&amp;/g, '&').replace(/&#39;|&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim();
async function getText(url, headers = {}) {
  if (globalThis.__desktop?.getPage && !Object.keys(headers).length) { const r = await globalThis.__desktop.getPage(url); if (r.status >= 400) throw new Error(`answered ${r.status}`); return r.text; }
  const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'text/html,application/json,*/*', 'Accept-Language': 'en-US,en;q=0.9', ...headers }, signal: AbortSignal.timeout(15000) });
  if (!r.ok) throw new Error(`answered ${r.status}`); return r.text();
}
async function tcgPage(q) { // 1
  if (!globalThis.__desktop?.getPage) return [];
  const url = `https://www.tcgplayer.com/search/all/product?q=${encodeURIComponent(q)}&view=grid&productTypeName=Sealed+Products`;
  const { text } = await globalThis.__desktop.getPage(url, { render: true, wait: 'a[href*="/product/"] img', timeout: 22000 });
  const out = new Map();
  for (const m of text.matchAll(/<a[^>]+href="(?:https:\/\/www\.tcgplayer\.com)?\/product\/(\d+)\/([^"?#]*)[^"]*"[^>]*>([\s\S]*?)<\/a>/g)) {
    const id = Number(m[1]), inner = m[3]; if (!id || out.has(id)) continue;
    const pick = re => decode((inner.match(re) || [])[1]);
    const name = pick(/product-card__title[^"]*"[^>]*>([^<]+)</) || pick(/<img[^>]+alt="([^"]+)"/) || decode(m[2].replace(/-/g, ' '));
    if (!name) continue;
    out.set(id, { productId: id, name, game: pick(/product-card__category-name[^"]*"[^>]*>([^<]+)</) || (m[2].split('-')[0] || 'Other').replace(/^./, c => c.toUpperCase()), set: pick(/product-card__set-name[^"]*"[^>]*>([^<]+)</), image: IMG(id), price: Number(pick(/\$([\d,.]+)/).replace(/,/g, '')) || null, source: 'tcgplayer' });
  }
  return [...out.values()].slice(0, 24);
}
async function tcgApi(q) { // 2
  const body = sealed => ({
    algorithm: 'sales_synonym_v2', from: 0, size: 24,
    filters: { term: sealed ? { productTypeName: ['Sealed Products'] } : {}, range: {}, match: {} },
    listingSearch: { context: { cart: {} }, filters: { term: { sellerStatus: 'Live', channelId: 0 }, range: { quantity: { gte: 1 } }, exclude: { channelExclusion: 0 } } },
    context: { cart: {}, shippingCountry: 'US', userProfile: {} }, settings: { useFuzzySearch: true, didYouMean: {} }, sort: {}
  });
  const ask = async sealed => {
    const r = await fetch(`https://mp-search-api.tcgplayer.com/v1/search/request?q=${encodeURIComponent(q)}&isList=false`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json', Origin: 'https://www.tcgplayer.com', Referer: 'https://www.tcgplayer.com/', 'User-Agent': UA },
      body: JSON.stringify(body(sealed)), signal: AbortSignal.timeout(15000)
    });
    if (!r.ok) throw new Error(`answered ${r.status}`);
    const j = await r.json();
    return (j?.results?.[0]?.results || []).map(x => {
      const id = Math.round(Number(x.productId)); if (!id) return null;
      return { productId: id, name: String(x.productName || '').trim(), game: String(x.productLineName || '').trim() || 'Other', set: String(x.setName || '').trim(), image: IMG(id), price: Number(x.marketPrice) || null, source: 'tcgplayer' };
    }).filter(Boolean);
  };
  let out = await ask(true); if (!out.length) out = await ask(false); return out;
}
async function webPictures(q) { // 3
  const qq = /pack|booster|box/i.test(q) ? q : q + ' booster pack';
  const html = await getText(`https://duckduckgo.com/?q=${encodeURIComponent(qq)}&iax=images&ia=images`);
  const vqd = (html.match(/vqd=["']?([\d-]+)["']?/) || [])[1]; if (!vqd) throw new Error('no picture search key');
  const j = JSON.parse(await getText(`https://duckduckgo.com/i.js?l=us-en&o=json&q=${encodeURIComponent(qq)}&vqd=${vqd}&f=,,,,,&p=1`, { Referer: 'https://duckduckgo.com/', Accept: 'application/json' }));
  return (j.results || []).filter(x => x.image || x.thumbnail).slice(0, 12).map(x => ({ productId: null, name: q, game: '', set: '', image: x.thumbnail || x.image, full: x.image || x.thumbnail, from: (() => { try { return new URL(x.url || x.image).hostname.replace(/^www\./, ''); } catch { return 'web'; } })(), title: decode(x.title).slice(0, 120), source: 'web' }));
}
export async function searchPacks(q) {
  q = String(q || '').trim().slice(0, 120); if (q.length < 2) return { results: [], errors: [] };
  const errors = [], seen = new Set(), results = [];
  const add = list => { for (const x of list) { const k = x.productId ? 'p' + x.productId : 'w' + x.image; if (!seen.has(k)) { seen.add(k); results.push(x); } } };
  const [page, api, web] = await Promise.allSettled([tcgPage(q), tcgApi(q), webPictures(q)]);
  if (page.status === 'fulfilled') add(page.value); else errors.push(`TCGplayer page: ${page.reason?.message || 'failed'}`);
  if (api.status === 'fulfilled') add(api.value); else errors.push(`TCGplayer search: ${api.reason?.message || 'failed'}`);
  if (web.status === 'fulfilled') add(web.value); else errors.push(`web pictures: ${web.reason?.message || 'failed'}`);
  if (errors.length === 3) console.error('[cards] pack search found nothing anywhere:', errors.join(' · '));
  return { results, errors: results.length ? [] : errors };
}
async function download(url, name) { // the pack's picture, saved on this PC (so it works offline and on stream)
  try {
    const r = await fetch(url, { headers: { 'User-Agent': UA, Referer: 'https://www.tcgplayer.com/' }, signal: AbortSignal.timeout(20000) });
    if (!r.ok) return null;
    const type = r.headers.get('content-type') || '', ext = /png/.test(type) ? 'png' : /webp/.test(type) ? 'webp' : /gif/.test(type) ? 'gif' : 'jpg';
    const buf = Buffer.from(await r.arrayBuffer()); if (buf.length < 200 || buf.length > 15e6) return null;
    const file = `${name}.${ext}`; fs.writeFileSync(path.join(UPLOADS, file), buf); return '/uploads/' + file;
  } catch { return null; }
}
const fileOk = v => /^(\/uploads\/[\w.-]+|https?:\/\/\S+|data:image\/[\w+]+;base64,[\w+/=]+)$/.test(String(v || '')) ? String(v) : '';
/** Add packs to the pool (a pack you already have just gets more on its count). */
export async function addPack(b) {
  const c = C(), count = Math.max(1, Math.min(9999, Math.round(Number(b.count) || 1)));
  const pid = Math.round(Number(b.productId)) || null;
  let p = pid ? c.pool.find(x => x.productId === pid) : c.pool.find(x => !x.productId && x.name.toLowerCase() === String(b.name || '').trim().toLowerCase());
  if (p) { p.count = left(p) + count; if (p.status !== 'active') p.status = 'active'; save(); hooks.pushState(); return { pack: p, added: count, more: true }; }
  const name = String(b.name || '').trim().slice(0, 120); if (!name) throw new Error('Give the pack a name.');
  let image = fileOk(b.image);
  const full = fileOk(b.full);
  if (/^https?:/i.test(full)) { const d = await download(full, 'pack-' + (pid || uid())); if (d) image = d; } // (a 🌐 web picture: the big one if it downloads)
  if (/^https?:/i.test(image)) image = (await download(image, 'pack-' + (pid || uid()))) || image; // keep the web link if the download didn't work
  p = { id: uid(), productId: pid, name, game: String(b.game || '').trim().slice(0, 60) || 'Other', set: String(b.set || '').trim().slice(0, 120), image, count, opened: 0, status: 'active', addedAt: Date.now() };
  c.pool.push(p); save(); hooks.pushState();
  return { pack: p, added: count, more: false };
}
/** Change a pack: count, name, game, picture, or hide it / bring it back (packs are never deleted). */
export function editPack(b) {
  const p = C().pool.find(x => x.id === b.id); if (!p) throw new Error('That pack is not in your pool.');
  if ('count' in b) { p.count = Math.max(0, Math.min(9999, Math.round(Number(b.count) || 0))); if (p.count > 0 && p.status === 'used') p.status = 'active'; if (p.count === 0 && p.status === 'active') p.status = 'used'; }
  if ('name' in b && String(b.name).trim()) p.name = String(b.name).trim().slice(0, 120);
  if ('game' in b) p.game = String(b.game || '').trim().slice(0, 60) || 'Other';
  if ('image' in b) p.image = fileOk(b.image);
  if (b.hide === true) p.status = 'hidden';
  if (b.hide === false) p.status = left(p) > 0 ? 'active' : 'used';
  save(); hooks.pushState(); return { pack: p };
}

// ---------- ⚔️ card battle setups (which packs fight: every pack, or 1 of each; all games or some) ----------
export function saveBattle(b) {
  const c = C(); let x = b.id ? getBattle(b.id) : null;
  if (!x) { x = { ...DEF_BATTLE(), id: uid(), name: '🃏 New card battle' }; c.battles.push(x); }
  if ('name' in b && String(b.name).trim()) x.name = String(b.name).trim().slice(0, 60);
  if ('games' in b) x.games = (Array.isArray(b.games) ? b.games : []).map(g => String(g).slice(0, 60)).slice(0, 50);
  if ('mode' in b) x.mode = b.mode === 'one' ? 'one' : 'all';
  if ('map' in b) x.map = b.map === 'random' || cardMaps().some(m => m.id === b.map) ? b.map : 'kungfu';
  if ('pace' in b) x.pace = Math.max(0, Math.min(100, Math.round(Number(b.pace) || 0))); // ⏳ elimination pacer strength (0 = off)
  if ('length' in b) x.length = Math.max(0, Math.min(240, Math.round(Number(b.length) || 0))); // how long a fight should last (0 = by how many packs)
  if (b.activate !== false) c.activeId = x.id;
  save(); hooks.pushState(); sendScene(); return { battle: x };
}
export function removeBattle(id) { const c = C(); if (c.battles.length <= 1) throw new Error('You need at least one card battle.'); c.battles = c.battles.filter(b => b.id !== id); C(); save(); hooks.pushState(); sendScene(); return {}; }
export function setActive(id) { if (getBattle(id)) { C().activeId = id; save(); hooks.pushState(); sendScene(); } return {}; }

const MAX_FIGHTERS = 80;
export function fightersFor(b = activeBattle()) {
  const packs = C().pool.filter(p => p.status === 'active' && left(p) > 0 && (!b.games?.length || b.games.includes(p.game || 'Other')));
  let out = [];
  for (const p of packs) { const n = b.mode === 'one' ? 1 : left(p); for (let k = 0; k < n; k++) out.push({ id: `${p.id}#${k + 1}`, packId: p.id, name: p.name, tag: n > 1 ? `#${k + 1}` : '', game: p.game, image: p.image }); }
  let cut = 0; if (out.length > MAX_FIGHTERS) { cut = out.length - MAX_FIGHTERS; out = out.sort(() => Math.random() - .5).slice(0, MAX_FIGHTERS); }
  return { fighters: out, cut };
}
// pretend packs for the 🧪 Test tab (they never touch your pool)
const TEST_COLORS = ['#e8443a', '#3a7be8', '#f2c230', '#3ac46b', '#a04ae8', '#ff8a3a', '#3ad6d6', '#e84ab0'];
const testFighters = n => Array.from({ length: n }, (_, i) => ({ id: 'test-' + i, packId: 'test-' + i, name: ['Blaze Booster', 'Tidal Pack', 'Thunder Pack', 'Forest Booster', 'Mystic Pack', 'Ember Booster', 'Frost Pack', 'Shadow Booster'][i % 8] + (i >= 8 ? ' ' + (Math.floor(i / 8) + 1) : ''), tag: '', game: '🧪 Pretend', image: '', color: TEST_COLORS[i % 8], test: true }));

// ---------- live: what's on stream ----------
export const live = { show: false, phase: 'idle', fight: null, last: null, wheelLink: null };
const wackyOn = () => Object.fromEntries(Object.keys(WACKY).map(k => [k, !!C().wacky[k]]));
export function sceneMsg() {
  const b = activeBattle(), f = live.fight;
  const map = f?.map || b.map || 'kungfu', ball = f ? !!f.ball : (b.map === 'random' ? false : isBallMap(map));
  return { type: 'cardScene', show: live.show && !ball, ball, phase: live.phase, map: map === 'random' ? 'kungfu' : map, finalFight: !!CARD_MAPS.find(m => m.id === map)?.finalFight, battleName: f?.name || b.name, fighters: f ? f.fighters : fightersFor(b).fighters, fightId: f?.id || null, startedAt: f?.startedAt || 0, seed: f?.seed || 0, destined: f?.destined || null, pace: (f ? getBattle(f.battleId) : b)?.pace ?? 50, length: (f ? getBattle(f.battleId) : b)?.length || 0, wacky: wackyOn(), last: live.phase === 'ended' ? live.last : null, test: !!f?.test, logo: ringLogo() };
}
// 🤼 the picture in the middle of the Rumble Ring: your own, or your Twitch picture
export const ringLogo = () => C().ringLogo || db.owner?.avatar || '';
export function setRingLogo(url) { const c = C(); c.ringLogo = url ? fileOk(url) : ''; if (url && !c.ringLogo) throw new Error('That picture didn\'t work.'); save(); sendScene(); hooks.pushState(); return { logo: ringLogo(), own: !!c.ringLogo }; }
export function sendScene() { hooks.broadcast(sceneMsg(), 'overlay'); }
export function setShow(on) { if (live.show === !!on) return; live.show = !!on; sendScene(); hooks.pushState(); hooks.preview(); }
/** On the Card battles tab with a ball map: the ball game shows the card fighters waiting on that map. */
export function ballPreview() { if (!live.show || live.phase === 'fight') return null; const b = activeBattle(); if (!isBallMap(b.map)) return null; const { fighters } = fightersFor(b); return { map: b.map, name: b.name, fighters, pace: b.pace ?? 50, length: b.length || 0 }; }
export function setWacky(key, on) {
  if (!WACKY[key]) throw new Error('Unknown wacky setting.');
  C().wacky[key] = !!on;
  if (on && key === 'giant') C().wacky.tiny = false; if (on && key === 'tiny') C().wacky.giant = false;
  if (on && key === 'turbo') C().wacky.slowmo = false; if (on && key === 'slowmo') C().wacky.turbo = false;
  save(); hooks.broadcast({ type: 'cardWacky', wacky: wackyOn(), key, on: !!on }, 'overlay'); hooks.pushState(); return { wacky: wackyOn() };
}
export function wackyOff() { for (const k of Object.keys(C().wacky)) C().wacky[k] = false; save(); hooks.broadcast({ type: 'cardWacky', wacky: wackyOn() }, 'overlay'); hooks.pushState(); return {}; }
/** ▶ FIGHT! (opts.test = pretend packs, nothing in your pool changes) */
export function start(opts = {}) {
  if (live.phase === 'fight') throw new Error('A card battle is already going.');
  const b = activeBattle();
  let { fighters, cut } = opts.test ? { fighters: testFighters(Math.max(2, Math.min(40, Number(opts.n) || 8))), cut: 0 } : fightersFor(b);
  if (fighters.length < 2) throw new Error(C().pool.some(p => p.status === 'active' && left(p) > 0) ? 'Need at least 2 packs in this card battle (check which games it uses, or "1 of each").' : 'Add at least 2 packs in the 🃏 Card pool tab first.');
  const pickMap = opts.map && cardMaps().some(m => m.id === opts.map) ? opts.map : b.map === 'random' ? (() => { const all = cardMaps(); return all[Math.floor(Math.random() * all.length)].id; })() : (b.map || 'kungfu');
  live.fight = { id: uid(), battleId: b.id, name: opts.test ? '🧪 Pretend card battle' : b.name, map: pickMap, ball: isBallMap(pickMap), fighters, startedAt: Date.now(), test: !!opts.test,
    seed: Math.floor(Math.random() * 2 ** 31), destined: fighters[Math.floor(Math.random() * fighters.length)].id }; // every pack has the same chance (no luck); every game screen plays the same fight from the same seed
  if (live.fight.ball) { const err = hooks.startBall(live.fight, b); if (err) { live.fight = null; throw new Error(err); } } // ⚪ a ball map: the ball game plays it, with card fighters
  live.phase = 'fight'; live.show = true; live.last = null;
  hooks.goView('cards');
  sendScene(); hooks.pushState();
  return { n: fighters.length, cut };
}
export function stop() { if (live.phase !== 'fight') return {}; if (live.fight?.ball) hooks.stopBall(); live.phase = 'idle'; live.fight = null; sendScene(); hooks.pushState(); if (live.wheelLink) { live.wheelLink = null; } return {}; }
export function reset() { live.phase = 'idle'; live.fight = null; live.last = null; sendScene(); hooks.pushState(); return {}; }
/** The game screen says who won (first screen to answer counts). */
export function result(m) {
  const f = live.fight; if (!f || live.phase !== 'fight' || m.fightId !== f.id) return;
  const w = f.fighters.find(x => x.id === m.winnerId); if (!w) return;
  live.phase = 'ended';
  const rec = { id: uid(), at: Date.now(), packId: w.packId, name: w.name, game: w.game, image: w.image, fighters: f.fighters.length, battle: f.name, map: f.map, wacky: Object.keys(WACKY).filter(k => C().wacky[k]), kos: Array.isArray(m.order) ? m.order.length : 0 };
  if (!f.test) {
    const p = C().pool.find(x => x.id === w.packId);
    if (p) { p.count = Math.max(0, left(p) - 1); p.opened = (p.opened || 0) + 1; p.lastWon = Date.now(); if (p.count === 0) p.status = 'used'; rec.leftAfter = p.count; } // 📦 the winner gets opened: one comes off its count
    C().history.push(rec); if (C().history.length > 2000) C().history = C().history.slice(-2000);
    if (db.settings.announceWinner !== false) hooks.say(`🃏 Card battle winner: ${w.name}! Time to open it 🎉`).catch(() => {});
  }
  live.last = { ...rec, test: f.test };
  save(); sendScene(); hooks.pushState();
  hooks.broadcast({ type: 'toast', text: `🃏 ${w.name} won the card battle!${f.test ? ' (pretend: nothing changed)' : ' One comes off its count in the Card pool.'}` }, 'control');
  if (live.wheelLink) { live.wheelLink = null; setTimeout(() => hooks.linkDone(), 12000); } // 🔀 a wheel spot sent us here: back to the wheel
}
/** 🔀 a wheel spot links to a card battle: put it on stream (and start it by itself if the spot says so). */
export function openFromWheel(id, auto, why) {
  if (live.phase === 'fight') return 'a card battle is already going';
  if (id && getBattle(id)) C().activeId = id;
  live.wheelLink = { id, at: Date.now() }; live.show = true; live.phase = 'idle'; live.fight = null;
  save(); hooks.goView('cards'); sendScene(); hooks.pushState();
  hooks.broadcast({ type: 'toast', text: `🔀 “${why}” sent you to the card battle “${activeBattle().name}”${auto ? ': it starts in a few seconds' : ': press FIGHT when you\'re ready'}. Then it goes back to the wheel.` }, 'control');
  if (auto) setTimeout(() => { if (live.phase === 'fight' || !live.wheelLink) return; try { start(); } catch (e) { hooks.broadcast({ type: 'toast', text: '🔀 ' + e.message }, 'control'); } }, 6000);
  return null;
}
export function stateFor() {
  const c = C(), b = activeBattle(), { fighters, cut } = fightersFor(b);
  return { mapNow: live.fight?.map || b.map, ringLogo: ringLogo(), ringLogoOwn: !!c.ringLogo, pool: c.pool, battles: c.battles, activeId: c.activeId, games: games(), wacky: wackyOn(), wackyList: WACKY, maps: cardMaps(), history: c.history.slice(-30).reverse(),
    live: { show: live.show, phase: live.phase, fightId: live.fight?.id || null, n: live.fight?.fighters.length || 0, startedAt: live.fight?.startedAt || 0, test: !!live.fight?.test, last: live.last, link: !!live.wheelLink }, inBattle: fighters.length, cut };
}

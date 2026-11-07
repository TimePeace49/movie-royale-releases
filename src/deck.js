// 🎛️ Stream Deck pages (1.85.0, Derek: "I have a stream deck so let's make a page or pages and icons for that… I only have a
// 15 button one and need one to be left open for home page").
// Every button is a Stream Deck "Website" action set to "GET request in background": it opens
//   http://127.0.0.1:<port>/deck/<key>/<button id>
// on this PC, which presses the same thing as the button in Movie Royal. <key> is a random secret made once per install, so
// a web page in your browser can't press Movie Royal's buttons by guessing the address.
// The pages are made as .streamDeckProfile files (old "1.0" format: one page per profile, which every Stream Deck app still
// imports). Like Derek's own setup: one profile per section, linked with Switch Profile buttons; the bottom-left key is the
// 🏠 Home key (goes to the Stream Deck profile picked in Settings, or stays empty for your own).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { db, save } from './store.js';

let H = { call: async () => ({}), state: () => ({}), dev: () => false, port: 3737, data: '.', root: '.' };
export function setHooks(h) { H = { ...H, ...h }; }

export function key() { if (!db.deckKey || !/^[a-z0-9]{12}$/.test(db.deckKey)) { db.deckKey = crypto.randomBytes(9).toString('base64').replace(/[^a-z0-9]/gi, '').toLowerCase().padEnd(12, '7').slice(0, 12); save(); } return db.deckKey; }
export function newKey() { db.deckKey = null; key(); return db.deckKey; }
export const urlFor = id => `http://127.0.0.1:${H.port}/deck/${key()}/${id}`;
export function keyOk(k) { const a = Buffer.from(String(k || '')), b = Buffer.from(key()); return a.length === b.length && crypto.timingSafeEqual(a, b); }

// ── the buttons ─────────────────────────────────────────────────────────────────────────────────────
// run() returns a short "done" line, or throws with the reason it couldn't (the key shows ⚠ then, and Movie Royal says why)
const P = (p, b) => H.call('POST', p, b || {});
const go = v => H.call('GOVIEW', v);
const toggle = (on, a, b) => on ? a : b;
export const BUTTONS = {
  // 🎡 wheel
  spin: { icon: '🎡', label: 'SPIN', page: 'wheel', run: async () => { await P('/api/wheel/spin', { kind: 'spin' }); return 'Spinning'; } },
  myspin: { icon: '🎟️', label: 'My respin', page: 'wheel', run: async () => { await P('/api/wheel/mine', {}); return 'Used one of your respins'; } },
  undo: { icon: '⏪', label: 'Undo', page: 'wheel', run: async () => { const r = await P('/api/wheel/undo', {}); return `Went back to before ${r.label || 'the last step'}`; } },
  timer: { icon: '⏯️', label: 'Round timer', page: 'wheel', run: async () => { const r = H.state().round; if (!r || r.state === 'ended') throw new Error('No round timer going. It starts when the first spin lands.'); const cmd = r.state === 'running' ? 'pause' : 'start'; await P('/api/wheel/timer', { cmd }); return cmd === 'pause' ? 'Round timer paused' : 'Round timer going'; } },
  endround: { icon: '⏹️', label: 'End round', page: 'wheel', run: async () => { await P('/api/wheel/timer', { cmd: 'end' }); return 'Round ended: that spot wins'; } },
  plus30: { icon: '➕', label: '+30 sec', page: 'wheel', run: async () => { await P('/api/wheel/timer', { cmd: 'add', secs: 30 }); return '30 seconds added'; } },
  minus30: { icon: '➖', label: '−30 sec', page: 'wheel', run: async () => { await P('/api/wheel/timer', { cmd: 'add', secs: -30 }); return '30 seconds taken off'; } },
  packopen: { icon: '🎁', label: 'Open pack', page: 'wheel', run: async () => { const id = H.state().reveal; if (!id) throw new Error('No mystery card pack is up right now.'); await P('/api/wheel/reveal', { id }); return 'Card pack opened'; } },
  packclose: { icon: '✖️', label: 'Close pack', page: 'wheel', run: async () => { await P('/api/wheel/reveal', { close: true }); return 'Card pack closed'; } },
  wheeltab: { icon: '📺', label: 'Wheel on stream', page: 'wheel', run: async () => { await go('wheel'); return 'The wheel is on stream (Wheel tab)'; } },
  // ⚔️ battles
  battletab: { icon: '📺', label: 'Battle on stream', page: 'battle', run: async () => { await go('battle'); return 'The battle is on stream (Battle tab)'; } },
  join: { icon: '⏳', label: 'Join timer', page: 'battle', run: async () => { await P('/api/gather/start', {}); return 'Join timer started'; } },
  joincancel: { icon: '🚫', label: 'Cancel timer', page: 'battle', run: async () => { await P('/api/gather/cancel', {}); return 'Join timer cancelled'; } },
  start: { icon: '▶️', label: 'Start battle', page: 'battle', run: async () => { await P('/api/start', {}); return 'Battle started'; } },
  stop: { icon: '⏹️', label: 'Stop battle', page: 'battle', run: async () => { await P('/api/stop', {}); return 'Battle stopped (no winner)'; } },
  reset: { icon: '🧹', label: 'Reset field', page: 'battle', run: async () => { await P('/api/reset', {}); return 'Battlefield reset'; } },
  randmap: { icon: '🎲', label: 'Random map', page: 'battle', run: async () => { await P('/api/map', { id: 'random' }); return 'Random map'; } },
  accept: { icon: '✅', label: 'Accept', page: 'battle', run: async () => { await P('/api/claim/accept', {}); return 'Winner accepted'; } },
  pass: { icon: '❌', label: 'Pass', page: 'battle', run: async () => { await P('/api/claim/pass', {}); return 'Winner passed'; } },
  redo: { icon: '🔁', label: 'Redo battle', page: 'battle', run: async () => { await P('/api/battle/redo', {}); return 'Battling again without that movie'; } },
  autocam: { icon: '🎥', label: 'Auto camera', page: 'battle', run: async () => { await P('/api/camera', { action: 'auto' }); return 'Camera back on auto'; } },
  // 🃏 card battles + more
  cardtab: { icon: '📺', label: 'Cards on stream', page: 'cards', run: async () => { await go('cards'); return 'The card battle is on stream (Card battles tab)'; } },
  cardstart: { icon: '🃏', label: 'Start cards', page: 'cards', run: async () => { await P('/api/cards/start', {}); await go('cards'); return 'Card battle started'; } },
  cardstop: { icon: '⏹️', label: 'Stop cards', page: 'cards', run: async () => { await P('/api/cards/stop', {}); return 'Card battle stopped'; } },
  cardreset: { icon: '🧹', label: 'Reset cards', page: 'cards', run: async () => { await P('/api/cards/reset', {}); return 'Card battlefield reset'; } },
  practice: { icon: '🧪', label: 'Practice', page: 'cards', run: async () => { await P('/api/test/battle', {}); await go('battle'); return 'Practice battle (nothing counts)'; } },
  announce: { icon: '📣', label: 'Announce', page: 'cards', run: async () => { const r = await P('/api/announce', { now: true }); if (!r.on) throw new Error('The 📣 announcer is off: turn it on with 📣 on the Battle or Wheel tab first.'); if (r.error) throw new Error(r.error); return 'Posted in chat + Discord'; } },
  capture: { icon: '🪟', label: 'Capture window', page: 'cards', run: async () => { const on = !H.state().capture; await P('/api/capture', { on }); return on ? 'Capture window shown' : 'Capture window hidden'; } },
  discord: { icon: '🔄', label: 'Restart Discord', page: 'cards', run: async () => { await P('/api/discord/restart', {}); return 'Discord bot restarted'; } },
  sound: { icon: '🔊', label: 'Sound on/off', page: 'cards', run: async () => { const on = !H.state().soundOn; await P('/api/settings', { soundOn: on }); return on ? '🔊 Sound on' : '🔇 Sound off'; } },
  // 🏃 marathon (🛠️ dev mode)
  maratab: { icon: '📺', label: 'Marathon tab', page: 'mara', dev: true, run: async () => { await go('mara'); return 'Marathon battle on stream'; } },
  maranext: { icon: '▶️', label: 'Run next', page: 'mara', dev: true, run: async () => { await P('/api/paid/start', {}); return 'Next paid battle: chat is guessing'; } },
  guessnow: { icon: '⚡', label: 'Start now', page: 'mara', dev: true, run: async () => { await P('/api/mara/guess/now', {}); return 'Guessing over: battle!'; } },
  guesscancel: { icon: '🚫', label: 'Cancel guess', page: 'mara', dev: true, run: async () => { await P('/api/mara/guess/cancel', {}); return 'Guessing cancelled (the battle goes back in line)'; } },
  marapause: { icon: '⏸️', label: 'Pause battles', page: 'mara', dev: true, run: async () => { const r = await P('/api/mara/ticker/show', { on: 'toggle' }); return r?.paused ? 'Battles paused (📜 message on)' : 'Battles back on'; } },
  maratimer: { icon: '⏱️', label: 'Timer', page: 'mara', dev: true, run: async () => { const t = H.state().maraTimer; if (!t) throw new Error('No ⏱️ timer up right now (it pops up when a timed thing wins).'); const cmd = t.state === 'ready' ? 'start' : t.state === 'running' ? 'pause' : t.state === 'paused' ? 'resume' : 'restart'; await P('/api/mara/timer', { cmd }); return { start: 'Timer going', pause: 'Timer paused', resume: 'Timer going again', restart: 'Timer started over' }[cmd]; } },
  maradone: { icon: '🏁', label: 'Timer done', page: 'mara', dev: true, run: async () => { await P('/api/mara/timer', { cmd: 'done' }); return 'Timer done'; } },
  ttsskip: { icon: '⏭️', label: 'Skip TTS', page: 'mara', dev: true, run: async () => { await P('/api/mara/tts', { cmd: 'skip' }); return 'TTS skipped'; } },
  ttsmute: { icon: '🤐', label: 'TTS on/off', page: 'mara', dev: true, run: async () => { const m = !H.state().ttsMuted; await P('/api/mara/tts', { cmd: m ? 'mute' : 'unmute' }); return m ? 'TTS muted' : 'TTS back on'; } },
  cvoice: { icon: '🗣️', label: 'Read chat', page: 'mara', dev: true, run: async () => { const on = !H.state().chatVoice; await P('/api/mara/chatvoice', { on }); return on ? 'Reading chat to you' : 'Stopped reading chat'; } },
  cvskip: { icon: '🔕', label: 'Skip chat line', page: 'mara', dev: true, run: async () => { await P('/api/mara/chatvoice', { skip: true }); return 'Skipped'; } },
  // 🎬 marathon stream (🛠️ dev mode)
  cook1: { icon: '🍳', label: 'Big cam 1', page: 'mara2', dev: true, run: async () => { await P('/api/obs/cook-big', { n: 1 }); return 'Camera 1 is the big one'; } },
  cook2: { icon: '🍳', label: 'Big cam 2', page: 'mara2', dev: true, run: async () => { await P('/api/obs/cook-big', { n: 2 }); return 'Camera 2 is the big one'; } },
  cook3: { icon: '🍳', label: 'Big cam 3', page: 'mara2', dev: true, run: async () => { await P('/api/obs/cook-big', { n: 3 }); return 'Camera 3 is the big one'; } },
  micpc: { icon: '🎙️', label: 'PC mic', page: 'mara2', dev: true, run: async () => { await P('/api/mara/mics/now', { to: 'pc' }); return 'PC mic on'; } },
  miccook: { icon: '📡', label: 'Cooking mic', page: 'mara2', dev: true, run: async () => { await P('/api/mara/mics/now', { to: 'cook' }); return 'Cooking mic on'; } },
  ytnext: { icon: '⏭️', label: 'Next video', page: 'mara2', dev: true, run: async () => { await P('/api/mara/yt', { k: H.state().ytK, cmd: 'next' }); return 'Next video'; } },
  ytprev: { icon: '⏮️', label: 'Last video', page: 'mara2', dev: true, run: async () => { await P('/api/mara/yt', { k: H.state().ytK, cmd: 'prev' }); return 'Previous video'; } },
  ytpause: { icon: '⏯️', label: 'Video pause', page: 'mara2', dev: true, run: async () => { const s = H.state(); await P('/api/mara/yt', { k: s.ytK, cmd: s.ytPaused ? 'play' : 'pause' }); return s.ytPaused ? 'Video playing' : 'Video paused'; } }
};

// ── the pages (5 across × 3 down; "x,y") ───────────────────────────────────────────────────────────
// 0,2 = 🏠 Home (your own Stream Deck home profile, picked in Settings; empty when none). 1,2 = 🎬 Movie Royal menu.
export const PAGES = {
  hub: { name: 'Movie Royal', icon: '🎬', color: '#8b5cf6', uuid: '6D0B1E00-4D52-4F59-A1A0-000000000001',
    keys: { '0,0': '>wheel', '1,0': '>battle', '2,0': '>cards', '3,0': '>mara', '4,0': '>mara2', '0,1': 'spin', '1,1': 'myspin', '2,1': 'undo', '3,1': 'join', '4,1': 'start', '1,2': 'accept', '2,2': 'pass', '3,2': 'timer', '4,2': 'sound' },
    noDev: { '3,0': 'announce', '4,0': 'autocam' } },
  wheel: { name: 'Movie Royal – Wheel', icon: '🎡', color: '#f59e0b', uuid: '6D0B1E00-4D52-4F59-A1A0-000000000002',
    keys: { '0,0': 'spin', '1,0': 'myspin', '2,0': 'undo', '3,0': 'timer', '4,0': 'endround', '0,1': 'plus30', '1,1': 'minus30', '2,1': 'packopen', '3,1': 'packclose', '4,1': 'wheeltab', '1,2': '>hub', '2,2': '>battle', '3,2': 'sound', '4,2': 'announce' } },
  battle: { name: 'Movie Royal – Battle', icon: '⚔️', color: '#ef4444', uuid: '6D0B1E00-4D52-4F59-A1A0-000000000003',
    keys: { '0,0': 'battletab', '1,0': 'join', '2,0': 'start', '3,0': 'stop', '4,0': 'reset', '0,1': 'randmap', '1,1': 'accept', '2,1': 'pass', '3,1': 'redo', '4,1': 'autocam', '1,2': '>hub', '2,2': '>wheel', '3,2': 'joincancel', '4,2': 'sound' } },
  cards: { name: 'Movie Royal – Cards & more', icon: '🃏', color: '#14b8a6', uuid: '6D0B1E00-4D52-4F59-A1A0-000000000004',
    keys: { '0,0': 'cardtab', '1,0': 'cardstart', '2,0': 'cardstop', '3,0': 'cardreset', '4,0': 'autocam', '0,1': 'announce', '1,1': 'capture', '2,1': 'discord', '3,1': 'practice', '4,1': 'sound', '1,2': '>hub', '2,2': '>battle', '3,2': '>wheel', '4,2': 'randmap' } },
  mara: { name: 'Movie Royal – Marathon', icon: '🏃', color: '#22c55e', dev: true, uuid: '6D0B1E00-4D52-4F59-A1A0-000000000005',
    keys: { '0,0': 'maratab', '1,0': 'maranext', '2,0': 'guessnow', '3,0': 'guesscancel', '4,0': 'marapause', '0,1': 'maratimer', '1,1': 'maradone', '2,1': 'ttsskip', '3,1': 'ttsmute', '4,1': 'cvoice', '1,2': '>hub', '2,2': '>mara2', '3,2': 'cvskip', '4,2': 'ytnext' } },
  mara2: { name: 'Movie Royal – Marathon stream', icon: '🎬', color: '#3b82f6', dev: true, uuid: '6D0B1E00-4D52-4F59-A1A0-000000000006',
    keys: { '0,0': 'cook1', '1,0': 'cook2', '2,0': 'cook3', '3,0': 'micpc', '4,0': 'miccook', '0,1': 'ytnext', '1,1': 'ytprev', '2,1': 'ytpause', '3,1': 'ttsskip', '4,1': 'cvoice', '1,2': '>hub', '2,2': '>mara', '3,2': 'marapause', '4,2': 'cvskip' } }
};
export const NAV_LABEL = { hub: 'Menu', wheel: 'Wheel', battle: 'Battle', cards: 'Cards & more', mara: 'Marathon', mara2: 'Marathon stream' };
export const HOME_KEY = '0,2';
export function pagesFor(dev = H.dev()) {
  const out = [];
  for (const [id, p] of Object.entries(PAGES)) {
    if (p.dev && !dev) continue;
    const keys = { ...p.keys, ...(!dev && p.noDev ? p.noDev : {}) };
    for (const [pos, k] of Object.entries(keys)) { const nav = k.startsWith('>') ? k.slice(1) : null; if (nav ? PAGES[nav]?.dev && !dev : BUTTONS[k]?.dev && !dev) delete keys[pos]; }
    out.push({ id, ...p, keys });
  }
  return out;
}
// ── 🎞️ scene keys (1.85.0, Derek: "also going to want ones for my scenes for my stream") ──────────
// Movie Royal reads the scenes of the scene collection OBS has open when you press Add (and remembers each collection it saw),
// then makes "Movie Royal – Scenes" page(s): one key per scene (its own picture), Home + Menu in the bottom-left like the rest.
export const SCENE_COLOR = '#ec4899';
const SCENE_ICONS = [[/start|soon|intro|waiting/i, '⏳'], [/brb|be right back|break|pause/i, '☕'], [/just chat|chatting|\bchat\b|talk/i, '💬'], [/sleep|afk|night|bed/i, '😴'], [/end|outro|bye|ending|offline/i, '👋'], [/cook|kitchen|food/i, '🍳'], [/battle|royal/i, '⚔️'], [/co-?stream|duo|collab|friend/i, '🤝'], [/race|iracing|racing|car\b/i, '🏎️'], [/console|xbox|ps5|playstation|switch/i, '🕹️'], [/gta|game|gaming|play|main/i, '🎮'], [/no ?cam/i, '🖥️'], [/cam|camera|face/i, '📷'], [/monitor|screen|desktop|\bpc\b|left|right/i, '🖥️'], [/phone|mobile/i, '📱'], [/music|song|dj/i, '🎵'], [/wheel/i, '🎡'], [/movie|film|watch/i, '🍿'], [/alert|test/i, '🧪']];
const EMO = /^((?:\p{Extended_Pictographic}|\p{Regional_Indicator})(?:\uFE0F|\u200D(?:\p{Extended_Pictographic})|\p{Emoji_Modifier}|\uFE0F)*)\s*/u;
export function sceneLook(name) {
  const n = String(name || ''), m = n.match(EMO), rest = (m ? n.slice(m[0].length) : n).trim() || n;
  return { icon: m ? m[1] : (SCENE_ICONS.find(([re]) => re.test(n)) || [])[1] || '🎬', label: rest.slice(0, 28), color: SCENE_COLOR, scene: n };
}
const hex = t => crypto.createHash('sha1').update(String(t)).digest('hex');
const sets = () => (cfg().sceneSets && typeof cfg().sceneSets === 'object' ? cfg().sceneSets : {});
// the scene pages: the collection OBS had open last first, then the others Movie Royal has seen
const SLOTS = ['0,0', '1,0', '2,0', '3,0', '4,0', '0,1', '1,1', '2,1', '3,1', '4,1', '2,2', '3,2', '4,2'];
export function scenePages() {
  const all = sets(), now = cfg().sceneNow, names = Object.keys(all).sort((a, b) => (b === now) - (a === now) || (all[b].at || 0) - (all[a].at || 0));
  const out = [];
  names.forEach((coll, si) => {
    const list = (all[coll].list || []).slice(0, 60), other = names.length > 1 ? names[(si + 1) % names.length] : null;
    const per = SLOTS.length - (other ? 1 : 0), multi = list.length > per, cap = per - (multi ? 1 : 0), n = Math.max(1, Math.ceil(list.length / cap));
    for (let i = 0; i < n; i++) {
      const id = `scenes-${si}-${i}`, keys = {}; const part = list.slice(i * cap, i * cap + cap); let k = 0;
      for (const sc of part) keys[SLOTS[k++]] = 'scene:' + sc;
      keys['1,2'] = '>hub';
      if (multi) keys['4,2'] = `>scenes-${si}-${(i + 1) % n}~more`;
      if (other) keys[multi ? '3,2' : '4,2'] = `>scenes-${(si + 1) % names.length}-0~other:${other}`;
      out.push({ id, name: `Movie Royal – Scenes${names.length > 1 ? ` (${coll})` : ''}${n > 1 ? ` ${i + 1}` : ''}`, icon: '🎞️', color: SCENE_COLOR, coll, uuid: `6D0B1E00-4D52-4F59-A1A1-${hex(coll).slice(0, 10).toUpperCase()}${String(i).padStart(2, '0')}`, keys });
    }
  });
  return out;
}
const pageById = id => PAGES[id] ? { id, ...PAGES[id] } : scenePages().find(p => p.id === id) || null;
// what a key shows: {icon, label, color, nav?, scene?}
export function keyLook(k, pageId) {
  if (k === 'home') return { icon: '🏠', label: 'Home', color: '#64748b' };
  if (k.startsWith('scene:')) return sceneLook(k.slice(6));
  if (k.startsWith('>')) {
    const [id, kind] = k.slice(1).split('~');
    if (/^scenes/.test(id)) { const kd = (kind || '').split(':')[0]; return { icon: kd === 'more' ? '⏭️' : kd === 'other' ? '🔀' : '🎞️', label: kd === 'more' ? 'More scenes' : kd === 'other' ? `${(kind.split(':').slice(1).join(':') || 'Other').slice(0, 18)} scenes` : 'Scenes', color: SCENE_COLOR, nav: true, img: kd === 'more' ? 'nav-scenesmore' : kd === 'other' ? 'nav-otherset' : 'nav-scenes' }; }
    const p = PAGES[id]; return { icon: p.icon, label: NAV_LABEL[id], color: p.color, nav: true };
  }
  const b = BUTTONS[k]; return { icon: b.icon, label: b.label, color: PAGES[b.page]?.color || PAGES[pageId]?.color };
}
// all pages: the built-in ones (the menu gets a 🎞️ Scenes key once Movie Royal knows your scenes) + the scene pages
export function allPages(dev = H.dev()) {
  const sp = scenePages(), ps = pagesFor(dev);
  if (sp.length) { const hub = ps.find(p => p.id === 'hub'); if (hub) hub.keys = { ...hub.keys, '4,2': `>${sp[0].id}` }; }
  return [...ps, ...sp];
}

// ── pressing a button ──────────────────────────────────────────────────────────────────────────────
let lastPress = null;
export async function press(id, via = 'deck', q = {}) {
  if (id === 'scene') { // 🎞️ /deck/<key>/scene?name=<scene>
    const name = String(q.name || '').slice(0, 200); if (!name) throw Object.assign(new Error('Which scene?'), { code: 400 });
    try { const r = await H.scene(name, cfg().sceneTarget === 'preview'); const msg = `${r?.studio ? 'In the preview' : 'Switched to'}: ${name}`; lastPress = { id, label: sceneLook(name).label, ok: true, msg, at: Date.now(), via }; return msg; }
    catch (e) { lastPress = { id, label: sceneLook(name).label, ok: false, msg: e.message, at: Date.now(), via }; throw Object.assign(e, { code: 409 }); }
  }
  const b = BUTTONS[id]; if (!b) throw Object.assign(new Error(`There's no Stream Deck button called "${id}". Make the pages again in Settings → 🖥️ App → 🎛️ Stream Deck.`), { code: 404 });
  if (b.dev && !H.dev()) throw Object.assign(new Error(`${b.label} is a 🛠️ dev mode button.`), { code: 409 });
  try { const msg = await b.run(); lastPress = { id, label: b.label, ok: true, msg, at: Date.now(), via }; return msg; }
  catch (e) { lastPress = { id, label: b.label, ok: false, msg: e.message, at: Date.now(), via }; throw Object.assign(e, { code: e.code || 409 }); }
}
export const last = () => lastPress;

// ── your Stream Deck profiles (to pick the 🏠 Home one) ───────────────────────────────────────────
function sdDirs() {
  const base = process.env.APPDATA ? path.join(process.env.APPDATA, 'Elgato', 'StreamDeck') : process.env.HOME ? path.join(process.env.HOME, 'Library', 'Application Support', 'com.elgato.StreamDeck') : null;
  return base ? ['ProfilesV3', 'ProfilesV2'].map(d => path.join(base, d)) : [];
}
export function sdProfiles() {
  for (const dir of sdDirs()) {
    let names; try { names = fs.readdirSync(dir).filter(n => /\.sdProfile$/i.test(n)); } catch { continue; }
    const out = [];
    for (const n of names) { try { const m = JSON.parse(fs.readFileSync(path.join(dir, n, 'manifest.json'), 'utf8')); if (m.InstalledByPluginUUID) continue; out.push({ uuid: n.replace(/\.sdProfile$/i, '').toUpperCase(), name: String(m.Name || '').slice(0, 60), model: m.Device?.Model || m.DeviceModel || '' }); } catch {} }
    const ours = new Set(Object.values(PAGES).map(p => p.uuid));
    return { found: true, dir, list: out.filter(p => !ours.has(p.uuid)).sort((a, b) => a.name.localeCompare(b.name)) };
  }
  return { found: false, list: [] };
}
export function cfg() { return { home: '', model: '', sceneTarget: 'live', ...(db.settings.deck || {}) }; }
export function setCfg(o) { const c = cfg(); if ('home' in o) c.home = String(o.home || '').toUpperCase().replace(/[^0-9A-F-]/g, '').slice(0, 36); if ('model' in o) c.model = String(o.model || '').slice(0, 30); if (['live', 'preview'].includes(o.sceneTarget)) c.sceneTarget = o.sceneTarget; if (o.forget) { const ss = { ...(c.sceneSets || {}) }; delete ss[o.forget]; c.sceneSets = ss; } db.settings.deck = c; save(); return c; }
// the Home profile: picked, else one called "Home"
export function homeProfile() {
  const c = cfg(), sd = sdProfiles();
  if (c.home === 'NONE') return null;
  if (c.home) return sd.list.find(p => p.uuid === c.home) || { uuid: c.home, name: 'your home profile', model: '' };
  return sd.list.find(p => /^home$/i.test(p.name)) || null;
}
function deviceModel(home) {
  const c = cfg(); if (c.model) return c.model;
  if (home?.model) return home.model;
  const n = {}; for (const p of sdProfiles().list) if (p.model && /^20G/.test(p.model)) n[p.model] = (n[p.model] || 0) + 1;
  return Object.entries(n).sort((a, b) => b[1] - a[1])[0]?.[0] || '20GAA9901'; // (a 15-key Stream Deck)
}

// ── making the .streamDeckProfile files ───────────────────────────────────────────────────────────
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = buf => { let c = 0xFFFFFFFF; for (const b of buf) c = CRC[(c ^ b) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
export function zip(files) { // [{name, data: Buffer}] → a plain (stored) zip
  const parts = [], dir = []; let off = 0;
  for (const f of files) {
    const name = Buffer.from(f.name, 'utf8'), data = f.data || Buffer.alloc(0), crc = crc32(data), isDir = f.name.endsWith('/');
    const lh = Buffer.alloc(30); lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(0x0800, 6); lh.writeUInt16LE(0, 8); lh.writeUInt32LE(0x5C210000, 10); lh.writeUInt32LE(crc, 14); lh.writeUInt32LE(data.length, 18); lh.writeUInt32LE(data.length, 22); lh.writeUInt16LE(name.length, 26); lh.writeUInt16LE(0, 28);
    parts.push(lh, name, data);
    const ch = Buffer.alloc(46); ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(20, 4); ch.writeUInt16LE(20, 6); ch.writeUInt16LE(0x0800, 8); ch.writeUInt16LE(0, 10); ch.writeUInt32LE(0x5C210000, 12); ch.writeUInt32LE(crc, 16); ch.writeUInt32LE(data.length, 20); ch.writeUInt32LE(data.length, 24); ch.writeUInt16LE(name.length, 28); ch.writeUInt32LE(isDir ? 0x10 : 0, 38); ch.writeUInt32LE(off, 42);
    dir.push(ch, name); off += 30 + name.length + data.length;
  }
  const cd = Buffer.concat(dir), end = Buffer.alloc(22); end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10); end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(off, 16);
  return Buffer.concat([...parts, cd, end]);
}
const sceneIconFile = look => path.join(H.data, 'streamdeck', 'icons', hex(`${look.icon}|${look.label}|${look.color}|v1`).slice(0, 16) + '.png');
function iconFile(k) {
  if (k === 'home') return path.join(H.root, 'public', 'deck', 'home.png');
  const look = keyLook(k);
  if (look.scene) return sceneIconFile(look);
  if (look.img) return path.join(H.root, 'public', 'deck', look.img + '.png');
  return path.join(H.root, 'public', 'deck', `${k.split('~')[0].replace(/^>/, 'nav-')}.png`);
}
// draws a scene key's picture (public/deckicon.html in a hidden window; Playwright when it isn't the Windows app, for tests)
async function renderIcon(look) {
  const url = `http://127.0.0.1:${H.port}/deckicon.html?icon=${encodeURIComponent(look.icon)}&label=${encodeURIComponent(look.label)}&color=${encodeURIComponent(look.color)}`;
  let png = null;
  try {
    if (globalThis.__desktop?.renderPicture) png = await globalThis.__desktop.renderPicture(url, 10000);
    else {
      const { createRequire } = await import('node:module'); const req = createRequire(import.meta.url); let pw;
      for (const p of ['playwright', ...(process.env.NODE_PATH || '').split(/[:;]/).filter(Boolean).map(d => d + '/playwright')]) { try { pw = req(p); break; } catch {} }
      if (pw) { const b = await pw.chromium.launch(); try { const pg = await b.newPage(); await pg.goto(url); png = await pg.waitForFunction(() => window.__png, null, { timeout: 10000 }).then(h => h.jsonValue()); } finally { await b.close(); } }
    }
  } catch (e) { console.error('[deck] couldn\'t draw a scene key picture:', e.message); }
  return png && String(png).startsWith('data:image/png;base64,') ? Buffer.from(String(png).split(',')[1], 'base64') : null;
}
const STATE = img => ({ FFamily: '', FSize: '', FStyle: '', FUnderline: '', Image: img ? 'state0.png' : '', Title: '', TitleAlignment: '', TitleColor: '', TitleShow: '' });
// one page → {file name, zip}
export function buildPage(p, home, model) {
  const folder = `${p.uuid}.sdProfile`, acts = {}, files = [{ name: folder + '/' }];
  const keys = { ...p.keys }; if (home) keys[HOME_KEY] = 'home';
  for (const [pos, k] of Object.entries(keys)) {
    const look = keyLook(k, p.id), img = iconFile(k), has = fs.existsSync(img);
    let a;
    if (k === 'home') a = { Name: 'Switch Profile', Settings: { DeviceUUID: '', ProfileUUID: home.uuid }, UUID: 'com.elgato.streamdeck.profile.rotate' };
    else if (k.startsWith('>')) a = { Name: 'Switch Profile', Settings: { DeviceUUID: '', ProfileUUID: pageById(k.slice(1).split('~')[0])?.uuid || PAGES.hub.uuid }, UUID: 'com.elgato.streamdeck.profile.rotate' };
    else if (look.scene) a = { Name: `Scene: ${look.scene}`, Settings: { openInBrowser: false, path: `${urlFor('scene')}?name=${encodeURIComponent(look.scene)}` }, UUID: 'com.elgato.streamdeck.system.website' };
    else a = { Name: `Movie Royal: ${look.label}`, Settings: { openInBrowser: false, path: urlFor(k) }, UUID: 'com.elgato.streamdeck.system.website' };
    const st = STATE(has); if (!has && look.scene) Object.assign(st, { Title: look.label, TitleAlignment: 'middle', TitleShow: '' }); // (no picture: at least the name)
    acts[pos] = { ...a, State: 0, States: [st] };
    files.push({ name: `${folder}/${pos}/` }, { name: `${folder}/${pos}/CustomImages/` });
    if (has) files.push({ name: `${folder}/${pos}/CustomImages/state0.png`, data: fs.readFileSync(img) });
  }
  const man = { Actions: acts, DeviceModel: model, DeviceUUID: '', Name: p.name, Version: '1.0' };
  files.splice(1, 0, { name: `${folder}/manifest.json`, data: Buffer.from(JSON.stringify(man)) });
  return { id: p.id, name: p.name, file: `${p.name.replace(/[–]/g, '-').replace(/[^\w &+-]/g, '').trim()}.streamDeckProfile`, data: zip(files), keys: Object.keys(acts).length };
}
// asks OBS for the scenes it has open now (kept per scene collection; OBS closed = the ones Movie Royal saw before)
export async function readScenes() {
  try { const r = await H.scenes(); const c = cfg(), coll = r.collection || 'OBS'; db.settings.deck = { ...c, sceneNow: coll, sceneErr: null, sceneSets: { ...(c.sceneSets || {}), [coll]: { list: r.scenes, at: Date.now() } } }; save(); return { ok: true, collection: coll, count: r.scenes.length }; }
  catch (e) { db.settings.deck = { ...cfg(), sceneErr: e.message }; save(); return { ok: false, error: e.message }; }
}
// all pages, saved to DATA/streamdeck/ (old files there are replaced)
export async function makeAll({ scenes = true } = {}) {
  const sc = scenes ? await readScenes() : null;
  const home = homeProfile(), model = deviceModel(home), dir = path.join(H.data, 'streamdeck');
  fs.mkdirSync(path.join(dir, 'icons'), { recursive: true });
  const pages = allPages();
  for (const p of pages) for (const k of Object.values(p.keys)) { if (!k.startsWith('scene:')) continue; const look = keyLook(k), f = sceneIconFile(look); if (!fs.existsSync(f)) { const png = await renderIcon(look); if (png) fs.writeFileSync(f, png); } }
  for (const f of fs.readdirSync(dir)) if (/\.streamDeckProfile$/i.test(f)) { try { fs.unlinkSync(path.join(dir, f)); } catch {} }
  const out = pages.map(p => buildPage(p, home, model));
  for (const o of out) fs.writeFileSync(path.join(dir, o.file), o.data);
  db.settings.deck = { ...cfg(), madeAt: Date.now(), madeKey: key() }; save();
  return { dir, home, model, scenes: sc, pages: out.map(o => ({ id: o.id, name: o.name, file: o.file, path: path.join(dir, o.file), keys: o.keys, bytes: o.data.length })) };
}
export function iconPath(k) { const f = iconFile(String(k || '')); return fs.existsSync(f) ? f : null; }
export function state() {
  const c = cfg(), sd = sdProfiles(), home = homeProfile();
  return { key: key(), base: `http://127.0.0.1:${H.port}/deck/${key()}/`, home: home ? { uuid: home.uuid, name: home.name } : null, homePick: c.home || '', sd: { found: sd.found, list: sd.list.map(p => ({ uuid: p.uuid, name: p.name })) }, madeAt: c.madeAt || null, oldKey: !!c.madeKey && c.madeKey !== key(), last: lastPress,
    sceneTarget: c.sceneTarget, sceneNow: c.sceneNow || null, sceneErr: c.sceneErr || null, sceneSets: Object.entries(sets()).map(([coll, v]) => ({ coll, n: (v.list || []).length, at: v.at || null })),
    pages: allPages().map(p => ({ id: p.id, name: p.name, icon: p.icon, color: p.color, scenes: !!p.coll, keys: Object.fromEntries(Object.entries({ ...p.keys, ...(home ? { [HOME_KEY]: 'home' } : {}) }).map(([pos, k]) => { const L = keyLook(k, p.id); return [pos, { k, ...L, src: k === 'home' ? '/deck/home.png' : L.scene ? `/api/deck/icon?k=${encodeURIComponent(k)}` : `/deck/${L.img || k.split('~')[0].replace(/^>/, 'nav-')}.png` }]; })) })) };
}

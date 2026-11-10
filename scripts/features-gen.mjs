// 🎭 Builds src/features.json = the list of everything the Editions tab (Backup Bots app) can switch per edition.
// = src/features.base.json (written by hand) + everything found by looking at the running app:
//   every Settings section, Test card, Setup guide step, map, chat command, wheel spot kind, sub-tab and Chat tab box.
// Run it after adding Settings sections / Test cards / maps / commands:
//   PORT=3801 MOVIE_ROYAL_DATA=/tmp/x MOVIE_ROYAL_EDITION=derek node src/server.js   (in another shell)
//   NODE_PATH=$(npm root -g) node scripts/features-gen.mjs
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url'; import { createRequire } from 'module';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), URL0 = 'http://127.0.0.1:' + (process.env.PORT || 3801);
const { chromium } = createRequire(import.meta.url)('playwright');
const base = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/features.base.json'), 'utf8')), out = [...base], ids = new Set(base.map(f => f.id));
const slug = t => t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'x';
const add = (id, cat, name, text, hide) => { let k = id, n = 2; while (ids.has(k)) k = id + '-' + n++; ids.add(k); out.push({ id: k, kind: 'off', cat, name, text, ...(hide ? { hide } : {}) }); };
const post = (u, b) => fetch(URL0 + u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) }).then(r => r.json());
await post('/api/settings', { betaUpdates: true });
const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1600, height: 1000 } });
await p.goto(URL0 + '/control.html'); await p.goto(URL0 + '/control.html'); await p.waitForTimeout(4000);
await p.evaluate(() => { const d = document.getElementById('startDlg'); if (d && d.open) d.close(); });
// ⚙️ every Settings section
const secs = await p.evaluate(async () => { const w = ms => new Promise(r => setTimeout(r, ms)), res = []; setView('settings'); await w(800);
  for (const btn of [...document.querySelectorAll('#subnav [data-s]')]) { const k = btn.dataset.s; if (btn.classList.contains('devOnly')) continue; try { setSub(k); } catch {} await w(700);
    const pane = document.querySelector(`#settingsBody .sub[data-s="${k}"]`); if (!pane || k === 'notes') continue; /* (patch notes sections aren't options) */ const name = btn.textContent.trim().replace(/\s+/g, ' ');
    for (const h of pane.querySelectorAll('h3, .obsBox h4')) { if (h.closest('.devOnly')) continue; const t = h.textContent.trim().replace(/\s+/g, ' '); if (t && t.length < 90) res.push({ k, name, t, feat: h.closest('[data-feat]')?.dataset.feat || '' }); } }
  return res; });
const APPN = (await fetch(URL0 + '/api/app').then(r => r.json())).edition.app; /* the app's shown name differs per edition: kept as § in the heading note */
for (const x of secs) add(`sec:${x.k}:${slug(x.t)}`, `Settings: ${x.name}`, x.t.split(APPN).join('the app'), `One section of Settings → ${x.name}.${x.feat ? ' (Only in editions that have the extra “' + x.feat + '”.)' : ''}`, { sub: x.k, h: x.t.split(APPN).join('§') });
// 🧪 every Test card
const cards = await p.evaluate(async () => { setView('test'); await new Promise(r => setTimeout(r, 1200)); try { testTab('tests'); testCat('all'); } catch {} await new Promise(r => setTimeout(r, 600));
  return [...document.querySelectorAll('#v-test .card[id]')].filter(c => !c.classList.contains('devOnly') && c.querySelector('h3')).map(c => ({ id: c.id, t: c.querySelector('h3').textContent.trim().replace(/\s+/g, ' ') })); });
for (const c of cards) add(`test:${c.id}`, 'Test tab cards', c.t, 'One card on the 🧪 Test tab.', { sel: '#' + c.id });
// 🗂️ sub-tabs + boxes
for (const [k, n] of [['commands', '📜 Commands'], ['sounds', '🔊 Sound alerts'], ['timers', '⏰ Timers'], ['quotes', '💬 Quotes'], ['import', '🧳 Import']]) add(`bot:${k}`, 'Chat bot', n + ' (Chat bot tab)', 'One of the buttons across the top of the Chat bot tab.', { sel: `#botTop [onclick="botGo('${k}')"]` });
for (const [k, n] of [['lib', '🎵 Song database'], ['stats', '📊 Song stats'], ['ban', '🚫 Banned songs'], ['imp', '🧳 Song import'], ['set', '⚙ Song settings']]) add(`songs:${k}`, 'Chat bot', n, 'One of the buttons inside Song requests.', { sel: `[onclick="sgTabSet('${k}')"]` });
add('songs:playlists', 'Chat bot', '📻 Playlists', 'The playlist button in the music box and in Song settings.', { sel: '[onclick="dashPlMenu()"]' });
for (const [k, n] of [['prev', '📺 Stream preview box'], ['song', '🎵 Music box'], ['night', '🍿 Movie night box'], ['feed', '🔔 Alerts box'], ['tools', '🧰 Stream tools box'], ['audio', '🎚️ Audio levels box'], ['stats', '📊 Stream stats box'], ['chat', '💬 Chat box']]) add(`dash:${k}`, 'Chat tab', n, 'One of the boxes on the Chat tab dashboard.', { sel: `#dashGrid .dbox[data-b="${k}"]` });
const hist = await p.evaluate(() => [...HIST_TABS.map(x => [x[0], x[1]]), ['mnight', '🍿 Movie nights']]);
for (const [k, n] of hist) add(`hist:${k}`, 'History', n, 'One of the buttons across the top of the History tab.', { sel: `[onclick="histMode='${k}';drawHistory()"]` });
add('clip:buttons', 'Clips', '🎬 Clip buttons', 'Every 🎬 Clip button in the app (the chat command is its own switch).', { sel: '.clipBtn, #clipBox' });
// 🎡 wheel spot kinds
const types = await p.evaluate(async () => { setView('wheel'); await new Promise(r => setTimeout(r, 1500)); return Object.entries((typeof WD !== 'undefined' && WD && WD.types) || {}); });
for (const [k, n] of types) if (k !== 'timer' && k !== 'void') add(`spot:${k}`, 'Wheel', 'Spot kind: ' + n, 'One choice in the wheel’s spot kind menu.', { sel: `#v-wheel select option[value="${k}"], dialog select option[value="${k}"]` });
// 🧭 Setup guide steps
const g = await b.newPage(); await g.goto(URL0 + '/setup.html'); await g.waitForTimeout(2500);
const steps = await g.evaluate(() => ALL_STEPS.filter(x => !x.dev).map(x => [x.id, x.title || x.name || x.id]));
for (const [k, n] of steps) add(`guide:${k}`, 'Setup guide', String(n).replace(/<[^>]+>/g, ''), 'One step of the Setup guide (and its start-up reminder).');
// 💬 chat commands
const cmds = await fetch(URL0 + '/api/test/chat-off').then(r => r.json());
const CN = { 'chat:id': '!id (man / woman for characters)', 'chat:call': '!call (guess the winner)', 'chat:help': 'The help command', 'chat:mymovies': '!mymovies', 'chat:color': '!color', 'chat:accept': '!accept / !pass (claims)', 'chat:sitout': '!sitout / !imback', 'chat:skip': '!skip (movie battles)', 'chat:clip': '!clip', 'chat:join': '!join', 'chat:respin': '!respin / !myspins', 'chat:site': '!site', 'chat:bday': '!bday', 'chat:vote': '!vote (movie night)', 'chat:sr': 'Song commands (!sr, !song, !queue, !mysongs, !wrongsong)', 'chat:songskip': 'Song skip commands (vote skip, mod skip, volume)', 'chat:quote': '!quote / !addquote / !delquote', 'chat:addcom': '!addcom / !editcom / !delcom' };
for (const r of cmds.rows) add(r.id, 'Chat commands', CN[r.id] || r.id, 'Off = the app ignores this command in chat. Right now: ' + (r.words.join(', ') || 'no word set') + '.');
// 🗺️ maps
const { MAP_LIST } = await import(path.join(ROOT, 'src/maps.js')), { CARD_MAPS } = await import(path.join(ROOT, 'src/cards.js'));
for (const m of [...MAP_LIST].sort((a, c) => a.name.localeCompare(c.name))) add(`map:${m.id}`, m.race ? 'Maps: races' : m.holiday ? 'Maps: holiday' : 'Maps: ball battles', `${m.icon || ''} ${m.name}`.trim(), 'Off = this map isn’t in the menus or the random pick.');
for (const m of CARD_MAPS.filter(m => !m.maraOnly)) add(`map:${m.id}`, 'Maps: character / card', `${m.icon || ''} ${m.name}`.trim(), 'Off = this map isn’t in the character / card map menus.');
fs.writeFileSync(path.join(ROOT, 'src/features.json'), '[\n' + out.map(f => ' ' + JSON.stringify(f)).join(',\n') + '\n]\n');
const by = {}; for (const f of out) by[f.cat] = (by[f.cat] || 0) + 1; console.log(out.length, 'features'); console.log(by);
await b.close(); process.exit(0);

// 🃏 Card battles on the game screen (OBS + the app): card packs with stick arms and legs and angry faces have a
// martial arts brawl (Kung Fu Town) or a wrestling rumble (Royal Rumble: out only over the top rope). Health bars on top, blood, and wacky settings (low gravity, extreme gore, teleport switches…).
// The server picks the winner fairly (no luck) and gives every screen the same seed, so they all play the same fight.
// Gets the graphics settings and the connection to the server from game.html (window.__royal).
(() => {
  const RY = () => window.__royal || {}, GFX = new Proxy({}, { get: (_, k) => (RY().GFX || {})[k] });
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), pick = a => a[Math.floor(Math.random() * a.length)];
  const send = o => RY().send?.(o), PREVIEW_WIN = new URLSearchParams(location.search).has('preview');
  const layer = document.getElementById('cardLayer'), cv = document.getElementById('cardCv'), g = cv.getContext('2d');
  const W = 1920, H = 1080, GY0 = 660, GY1 = 1012, DT = 1 / 60;
  const FONT = "'Lilita One', Impact, 'Arial Black', sans-serif";
  const imgs = new Map();
  const imgFor = src => { if (!src) return null; let i = imgs.get(src); if (!i) { i = new Image(); i.decoding = 'async'; i.src = src; imgs.set(src, i); } return i.complete && i.naturalWidth ? i : null; };
  const vr = (a = 1, b) => b === undefined ? Math.random() * a : a + Math.random() * (b - a); // visual-only randomness
  // 🧍 a battle with characters on a character-only map: fighters are people (charparts.js) instead of packs.
  // Their own /character, else a random look for this battle (scene.lookSeed: the same on every game screen; themed by map).
  const CP = () => window.CHAR_PARTS;
  const charLook = f => { const k = scene.lookSeed + scene.map + (f.team ?? ''); if (f._lk && f._lkK === k) return f._lk; const base = f.look || CP().auto(String(f.id) + (scene.lookSeed || ''), f.gender, scene.map, f.chaos); f._lkK = k; return (f._lk = PIR() && f.team != null ? pirDress(base, f) : base); };
  function charCanvas(f) { // drawn once (again when their picture arrives): head to waist, the movie poster / Twitch picture on the chest
    const img = imgFor(f.image), k = `${scene.lookSeed}|${scene.map}|${img ? 1 : 0}|${f.team ?? ''}`; if (f._cc && f._ccK === k) return f._cc;
    const c = f._cc || document.createElement('canvas'); c.width = 200; c.height = 200; const cg = c.getContext('2d'); cg.clearRect(0, 0, 200, 200);
    CP().draw(cg, 100, 62, charLook(f), img, f.color, (f.name || '?').split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase());
    f._cc = c; f._ccK = k; return c;
  }
  const CHAR_COLS = ['#e8454a', '#3a8ad8', '#3aa85a', '#c77dff', '#f0a020', '#e05aa8', '#2ab0b0', '#8a6a4a', '#5a6ad8', '#d8603a']; // (outfit colours: the drawing needs #rrggbb)
  const CHAR_SRC = [100 - 62 * .82, 100 - 62 * 1.2, 62 * 1.64, 62 * 2.2]; // the part of that canvas that fills the pack's box (x, y, w, h)
  const limbCol = f => { if (!f.char || !CP()) return { leg: '#151515', shoe: '#151515', arm: '#151515', hand: '#f2e0c4' }; const l = CP().limbs(charLook(f), f.color); return { leg: l.legs === 'pants' || l.legs === 'shorts' ? l.pants : l.skin, shoe: l.shoe, arm: l.arm, hand: l.skin }; };
  function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const hash = s => { let h = 2166136261; for (const ch of String(s)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
  // 🏴‍☠️ everyone on the Pirate Battle wears pirate clothes in their crew's colour (their own face, hair and skin stay):
  // a pirate coat, a striped shirt or a tunic, and a tricorn hat, a bandana, or an eye patch + a rolled bandana
  function pirDress(b, f) {
    const r = mulberry(hash(String(f.id) + '|pirate|' + (scene.lookSeed || ''))), c = CREW[f.team] || CREW[0], o = r(), a = r();
    const outfit = o < .45 ? 57 : o < .8 ? 76 : 74; // (57 pirate coat, 76 = T-shirt "Striped", 74 tunic)
    let accessory = 29, hairaccessory = 1; if (a >= .42 && a < .77) accessory = 6; else if (a >= .77) { accessory = 49; hairaccessory = 17; }
    let facialhair = b.facialhair || 1; if (f.gender === 'm' && facialhair === 1 && !f.look && r() < .6) facialhair = [8, 7, 5, 3, 18, 9, 4, 17][Math.floor(r() * 8)]; // (random men: a pirate beard more often)
    return { ...b, outfit, accessory, hairaccessory, facialhair, col: c.col, rc: c.col };
  }
  let R = Math.random; const rr = (a, b) => a + R() * (b - a);
  const snd = (n, o) => { if (scene.show && !replayOn) SFX.play(n, o); }; // (a fight still finishing behind another tab stays quiet)

  let scene = { show: false, phase: 'idle', fighters: [], wacky: {}, map: 'kungfu' };
  let F = [], parts = [], texts = [], flyers = [], weapons = [], petals = [];
  const FINAL_INTRO = 8; // ⏱️ seconds the 🥊 FINAL FIGHT! scene shows before the last two fight (Derek, 1.51.0; was 3.2)
  let T = 0, acc = 0, running = false, replayOn = false, rbuf = [], replay = null, weapDrops = 0, lastKO = 0, D = 60, PACE = 50, showdownSaid = false, finalLeft = 0, finalPair = null, mode = 'lobby', modeT = 0, fightId = null, destined = null, order = [], winner = null, sent = false, teleT = 5, weapT = 7, slowUntil = 0;
  const floor = document.createElement('canvas'), fg = floor.getContext('2d'); floor.width = W; floor.height = H;
  const crat = document.createElement('canvas'), cg = crat.getContext('2d'); crat.width = W; crat.height = H; // 💥 craters (broken ground) on their own layer: the FINAL FIGHT fixes the ground but the blood stays (1.61.4)
  let bg = null, bgScale = 0, bgMap = null;

  // ---------- helpers ----------
  const zY = z => GY0 + z * (GY1 - GY0);
  const sizeK = () => (scene.wacky.giant ? 1.55 : scene.wacky.tiny ? .62 : 1);
  const baseSize = n => clamp(1.55 - n * .028, .5, 1.35);
  const timeK = () => (scene.wacky.slowmo ? .45 : 1) * (T < slowUntil ? .3 : 1);
  const speedK = () => scene.wacky.turbo ? 1.7 : 1;
  const grav = () => scene.wacky.lowgrav ? 520 : 1900;
  const alive = () => F.filter(f => f.alive);
  const S = f => (.72 + f.z * .4) * f.size * sizeK(); // on-screen scale (closer = bigger)
  // 🗺️ the maps (Kung Fu Town = a street, Royal Rumble = a wrestling ring you can only leave over the top rope)
  const MAPINFO = { kungfu: { title: '🏯 KUNG FU TOWN', intro: 'KUNG FU TOWN', weapons: ['sword', 'staff', 'nunchaku'], drops: () => scene.wacky.weapons }, ring: { title: '🔔 ROYAL RUMBLE', intro: 'ROYAL RUMBLE', weapons: ['chair'], drops: () => true },
    wizard: { title: '🧙 WIZARD BATTLE', intro: 'WIZARD BATTLE', weapons: [], drops: () => false }, colosseum: { title: '🏛️ COLOSSEUM', intro: 'THE COLOSSEUM', weapons: [], drops: () => false, armed: true },
    ww2: { title: '🪖 WW2 BATTLEFIELD', intro: 'WW2 BATTLEFIELD', weapons: [], drops: () => false, armed: true },
    pirates: { title: '🏴‍☠️ PIRATE BATTLE', intro: 'PIRATE BATTLE', weapons: [], drops: () => false, armed: true } };
  // 🗡️ weapons: how much harder they hit (d), how much further they reach (r), slower swings (cd), the hit word (w)
  const WSTAT = { sword: { d: 2.6, r: 30, w: 'SLASH!' }, staff: { d: 2.2, r: 40 }, nunchaku: { d: 2.4, r: 30 }, chair: { d: 2.4, r: 30, w: 'CLANG!' },
    gladius: { d: 1.6, r: 26, w: 'SLASH!', sharp: 1 }, spear: { d: 1.45, r: 62, w: 'STAB!', sharp: 1 }, trident: { d: 1.5, r: 56, w: 'STAB!', sharp: 1 }, axe: { d: 1.9, r: 30, cd: 1.25, w: 'CHOP!', sharp: 1 },
    rifle: { d: 1.5, r: 34, w: 'BUTT STROKE!' }, mace: { d: 1.8, r: 28, cd: 1.15, w: 'BONK!' }, flail: { d: 1.75, r: 38, w: 'WHAM!' }, hammer: { d: 2, r: 32, cd: 1.3, w: 'SMASH!' }, scimitar: { d: 1.65, r: 32, w: 'SLASH!', sharp: 1 },
    cutlass: { d: 1.7, r: 32, w: 'SLASH!', sharp: 1 }, saber: { d: 1.6, r: 38, w: 'SLASH!', sharp: 1 }, pin: { d: 1.55, r: 24, w: 'BONK!' }, oar: { d: 1.6, r: 46, cd: 1.15, w: 'WHACK!' } };
  const GLAD = ['gladius', 'spear', 'trident', 'axe', 'mace', 'flail', 'hammer', 'scimitar'], PWEAP = ['cutlass', 'cutlass', 'saber', 'axe', 'pin', 'oar']; // (🏴‍☠️ pirates: cutlasses, sabers, boarding axes, belaying pins, oars)
  const wReach = f => f.weapon ? (WSTAT[f.weapon]?.r ?? 30) : 0;
  const MI = () => MAPINFO[scene.map] || MAPINFO.kungfu, RUMBLE = () => scene.map === 'ring';
  const crazy = () => Object.entries(scene.wacky || {}).some(([k, v]) => v && k !== 'lions'); // a map condition is on: big cartoon physics are allowed
  const ringL = z => 430 - z * 140, ringR = z => 1490 + z * 140, OUT_Y = 58; // the ring's sides (wider toward the front); the arena floor is OUT_Y below the mat
  const gnd = f => RUMBLE() && f.out && (f.x < ringL(f.z) - 8 || f.x > ringR(f.z) + 8) ? -OUT_Y : 0;
  const edgeD = f => Math.min(f.x - ringL(f.z), ringR(f.z) - f.x), sideOf = f => f.x - ringL(f.z) < ringR(f.z) - f.x ? -1 : 1;
  const WIZ = () => scene.map === 'wizard', COLO = () => scene.map === 'colosseum', WAR = () => scene.map === 'ww2', PIR = () => scene.map === 'pirates';
  const bounds = z => RUMBLE() ? [ringL(z) + 34, ringR(z) - 34] : WIZ() ? [platL(z) - 300, platR(z) + 300] : PIR() ? [20, W - 20] : COLO() || WAR() ? [120, W - 120] : [90, W - 90];
  // 🏴‍☠️ Pirate Battle (characters only, 1.69.0, Derek): two pirate ships side by side (bows away from us, sterns at the front), a
  // gap of sea between them. Ship 0 (left) = the 🔴 red crew, ship 1 (right) = the 🔵 blue crew. Pirates only fight the other
  // crew, crossing on two gangplanks or swinging over on ropes; off the side = into the sea. The cannons fire across.
  const CREW = [{ name: 'RED CREW', ship: 'TimePeace49', col: '#d0283c', dk: '#5a0e16', lt: '#ff9aa4', dot: '🔴' }, { name: 'BLUE CREW', ship: 'Kirbgames', col: '#2a66dc', dk: '#0e2a64', lt: '#9ac4ff', dot: '🔵' }]; // (ship names: Derek's)
  const GAPX = W / 2, gapW = z => 78 + 46 * z, outerX = z => 132 + 238 * (1 - z) * (1 - z), FREE = z => 92 + 36 * z; // half the gap, the outer side of the hulls, the deck's height above the water
  const seaY = z => zY(z) + FREE(z); // the water's surface at depth z
  const deckLo = (s, z) => s ? GAPX + gapW(z) : outerX(z), deckHi = (s, z) => s ? W - outerX(z) : GAPX - gapW(z), deckMid = (s, z) => (deckLo(s, z) + deckHi(s, z)) / 2;
  const PLANKS = [.3, .72], PLK = .05, PZ0 = .03, PZ1 = .97; // 🪵 the two gangplanks (their depth, half width); how far back / forward the decks go
  let pir = null; const pirNew = () => ({ sunk: null, safe: null, planks: true, cannons: [], balls: [], cd: [3, 4.5], rings: [], debris: [], kr: null, drop: [], storm: { q: [], fx: [], next: 0 } }); // (storm: ⛈️ chat's waves / lightning / tentacles)
  const WX = { drops: [], flash: 0, flashT: 3, sky: null, rumble: null }; // ⛈️ the storm's rain and lightning (only looks: never touches the fight)
  const pirS = () => pir || (pir = pirNew());
  const shipOf = (x, z) => x <= GAPX - gapW(z) ? 0 : x >= GAPX + gapW(z) ? 1 : -1; // which side of the gap (−1 = over the gap)
  const onShip = (s, x, z, m = 0) => pirS().sunk !== s && x >= deckLo(s, z) + m && x <= deckHi(s, z) - m;
  const onPlank = (x, z) => pirS().planks && Math.abs(x - GAPX) <= gapW(z) + 4 && PLANKS.some(p => Math.abs(z - p) <= PLK);
  const onDeck = (x, z) => z >= PZ0 - .001 && z <= PZ1 + .001 && (onShip(0, x, z) || onShip(1, x, z) || onPlank(x, z));
  let crewC = null; const crewN = t => { if (!crewC) { crewC = [0, 0]; for (const f of F) if (f.alive && f.team != null) crewC[f.team]++; } return crewC[t]; }; // (how many of each crew are left: counted once, again after a K.O.)
  // a pirate can't go out while its crew is the smaller one: the crews stay even, so it always comes down to one pirate from each crew (Derek)
  const pirKeep = o => PIR() && o.team != null && crewN(o.team) < crewN(1 - o.team);
  let pirForce = false; // (🧪 straight to the final: knocks the extras out without the crew rule)
  // 🧙 Wizard Battle: a floating platform of stone tiles; spells crack them and they fall away (fall through = out)
  const PC = 12, PR = 5, platL = z => 400 - z * 130, platR = z => 1520 + z * 130;
  let tiles = [], bolts = [], zaps = [], lions = [], meteorT = 8, crumbleT = 1, lionT = 0, tanks = [], shells = [], planes = [], bombs = [], planeT = 7;
  const newTiles = () => Array.from({ length: PC * PR }, (_, i) => ({ hp: 2, fallT: 0, c: 34 + ((i * 7919) % 13), rune: (i * 37) % 5 === 0 }));
  const tileAt = (x, z) => { const u = (x - platL(z)) / (platR(z) - platL(z)); if (u < 0 || u >= 1 || z < 0 || z > 1) return null; return tiles[Math.min(PR - 1, Math.floor(z * PR)) * PC + Math.floor(u * PC)] || null; };
  const solid = (x, z) => { const t = tileAt(x, z); return !!t && t.hp > 0; };
  const tileXZ = i => { const r = Math.floor(i / PC), c = i % PC, z = (r + .5) / PR; return [platL(z) + (c + .5) / PC * (platR(z) - platL(z)), z]; };
  function safeSpot(x, z) { let best = null, bd = 1e9; tiles.forEach((t, i) => { if (t.hp <= 0) return; const [tx, tz] = tileXZ(i), d = Math.abs(tx - x) + Math.abs(tz - z) * 900; if (d < bd) { bd = d; best = [tx, tz]; } }); return best; }
  function tileQuad(i, drop = 0) { const r = Math.floor(i / PC), c = i % PC, z0 = r / PR, z1 = (r + 1) / PR, X = (z, k) => platL(z) + k / PC * (platR(z) - platL(z)); return [[X(z0, c), zY(z0) + drop], [X(z0, c + 1), zY(z0) + drop], [X(z1, c + 1), zY(z1) + drop], [X(z1, c), zY(z1) + drop]]; }
  function hurtTile(t, n) { // a spell hits the platform: cracks, then the tile falls away
    if (!t || t.hp <= 0) return;
    const d = F.find(f => f.id === destined), live = alive().length, left = tiles.filter(x => x.hp > 0).length;
    t.hp -= n;
    if (t.hp > 0) return;
    if ((d?.alive && tileAt(d.x, d.z) === t) || left <= Math.max(8, live * 2)) { t.hp = 1; return; } // (the platform never gets too small, and never drops the fair winner)
    t.hp = 0; t.fallT = 0; snd('crumble');
    const i = tiles.indexOf(t), q = tileQuad(i); fg.save(); fg.globalCompositeOperation = 'destination-out'; fg.beginPath(); q.forEach(([x, y], k) => k ? fg.lineTo(x, y) : fg.moveTo(x, y)); fg.closePath(); fg.fill(); fg.restore(); // (blood on it goes too)
    const [tx, tz] = tileXZ(i); for (let k = 0; k < 16; k++) parts.push({ x: tx + vr(-60, 60), y: zY(tz) + vr(-10, 10), vx: vr(-120, 120), vy: vr(-200, 50), g: 1400, life: vr(.6, 1.2), max: 1.2, size: vr(3, 8), color: Math.random() < .5 ? '#5a5a72' : '#3a3a50', gz: null });
  }
  function fallCheck(f) { // standing on nothing: out (the fair winner, or a pack the pacer saves, blinks back onto the platform)
    if (f.id === destined || R() < paceHold(alive().length)) { const sp = safeSpot(f.x, f.z); if (sp) { puff(f, '#c88cff'); f.x = sp[0]; f.z = sp[1]; f.vx = f.vz = 0; f.stun = .6; puff(f, '#c88cff'); word(f.id === destined ? 'BLINK!' : 'GRABS THE EDGE!', f.x, zY(f.z) - 200 * S(f), '#d6a8ff', 36); snd('swap'); return; } }
    ko(f, f.lastBy || null, false, 0, true);
  }
  const GRAB = { slam: 1, suplex: 1, toss: 1, whip: 1 };
  const grabbable = o => o.alive && !o.heldBy && !o.whip && !(o.rebound > 0) && o.h === 0 && !o.atk?.o;

  function makeFighters(list) {
    crewC = null; tiles = newTiles(); bolts = []; zaps = []; lions = []; meteorT = 8; crumbleT = 1; lionT = 1.5; tanks = [{ x: 260, side: -1, aim: 0, cd: 3, recoil: 0 }, { x: 1660, side: 1, aim: 0, cd: 5, recoil: 0 }]; shells = []; planes = []; bombs = []; planeT = 7;
    pir = pirNew(); for (const s of [0, 1]) for (const z of [.16, .5, .86]) pir.cannons.push({ s, z, recoil: 0, fireAt: 0 }); if (PIR()) pir.cd = [rr(3, 5), rr(4.5, 6.5)];
    const n = list.length, size = baseSize(n) * (PIR() ? .88 : 1);
    const team = PIR() ? pirTeams(list) : null, crew = [[], []]; if (team) for (const p of list) crew[team.get(p.id)].push(p); // 🏴‍☠️ two crews, one on each ship
    const cols = Math.ceil(Math.sqrt(n * 2.4)), rows = Math.ceil(n / cols);
    return list.map((p, i) => {
      let c = i % cols, r = Math.floor(i / cols), z, lo, hi, cc = cols;
      if (team) { const t = team.get(p.id), m = crew[t], k = m.indexOf(p); cc = Math.ceil(Math.sqrt(m.length * 1.3)); const rw = Math.ceil(m.length / cc); c = k % cc; r = Math.floor(k / cc);
        z = clamp(rw === 1 ? .55 : .14 + r / Math.max(1, rw - 1) * .72 + rr(-.03, .03), .08, .92); lo = deckLo(t, z) + 70; hi = deckHi(t, z) - 70; }
      else { z = rows === 1 ? .55 : .12 + r / Math.max(1, rows - 1) * .8 + rr(-.03, .03); [lo, hi] = RUMBLE() ? [ringL(clamp(z, 0, 1)) + 70, ringR(clamp(z, 0, 1)) - 70] : WIZ() ? [platL(clamp(z, 0, 1)) + 90, platR(clamp(z, 0, 1)) - 90] : COLO() || WAR() ? [230, 1690] : [150, 1770]; }
      const x = lo + (c + .5) * ((hi - lo) / cc) + rr(-20, 20), tm = team ? team.get(p.id) : null;
      return { ...p, x, z: clamp(z, 0, 1), h: 0, vx: 0, vz: 0, vh: 0, face: tm != null ? (tm ? -1 : 1) : x < W / 2 ? 1 : -1, hp: 100, alive: true, size: size * rr(.94, 1.06),
        cd: rr(.3, 1.4), stun: 0, atk: null, block: 0, target: null, retarget: 0, ph: rr(0, 6), limbs: { la: 1, ra: 1, ll: 1, rl: 1 }, head: true, team: tm, swing: null, route: null, routeT: 0,
        stains: [], hurtT: 0, koT: 0, weapon: null, yell: 0, down: 0, heldBy: null, lie: 0, whip: 0, whipBy: null, rebound: 0, out: false, falling: false, color: p.color || (p.char ? CHAR_COLS[[...String(p.id)].reduce((a, ch) => a + ch.charCodeAt(0), 0) % CHAR_COLS.length] : `hsl(${Math.floor(R() * 360)},65%,48%)`), weapon: COLO() ? GLAD[Math.floor(R() * GLAD.length)] : WAR() ? 'rifle' : PIR() ? PWEAP[Math.floor(R() * PWEAP.length)] : null };
    });
  }
  // 🏴‍☠️ who's in which crew: the same on every screen and in the lobby (from their id + this battle's look seed), and the
  // crews stay even (a new pirate joining moves at most one or two others over)
  function pirTeams(list) {
    const key = p => hash(String(p.id) + '|crew|' + (scene.lookSeed || '')), m = new Map(), c = [[], []];
    for (const p of list) { const h = key(p); c[h & 1].push([h, p]); }
    while (Math.abs(c[0].length - c[1].length) > 1) { const [from, to] = c[0].length > c[1].length ? [c[0], c[1]] : [c[1], c[0]]; from.sort((a, b) => a[0] - b[0]); to.push(from.pop()); }
    c.forEach((l, t) => l.forEach(([, p]) => m.set(p.id, t))); return m;
  }

  // ---------- 🎬 scene messages from the server ----------
  function msg(m) {
    if (m.type === 'cardWacky') { scene.wacky = m.wacky || {}; if (m.key && scene.show && (m.on || m.key === 'lions')) { toast(m.key === 'lions' && !m.on ? '🦁 Lions back to the tunnels!' : `${(WN[m.key] || m.key)}!`); snd(m.key === 'lions' ? 'roar' : 'gong'); } return; }
    if (m.type === 'finTest') return finTest(m);
    if (m.type === 'cardStorm') return pirStorm(m); // ⛈️ a channel point storm power (Pirate Battle)
    if (m.type === 'cardMonkey') return pirMonkeyOut(m); // 🐒 chat took out Time or Kirb (channel points)
    if (m.type !== 'cardScene') return;
    const was = scene; scene = { ...m, wacky: m.wacky || {} };
    layer.classList.toggle('hidden', !m.show); document.body.classList.toggle('charFight', !!(m.show && m.chars)); // (🧍 the claim pop-up shows on top of a characters fight)
    if (m.show) SFX.setMap?.('card-' + (m.map || 'kungfu'));
    if (!running) { running = true; requestAnimationFrame(frame); } // (keeps going behind another tab until a fight is finished, without drawing or sound)
    if (!m.show && was.show) SFX.stopMusic?.();
    if (!m.show && m.phase !== 'fight') return;
    if (m.phase === 'fight' && m.fightId && m.fightId !== fightId) { // a new fight
      fightId = m.fightId; destined = m.destined; R = mulberry(m.seed || 1); order = []; winner = null; sent = false;
      cam.follow = null; cam.manual = false; cam.overview = false;
      F = makeFighters(m.fighters); parts = []; texts = []; flyers = []; weapons = []; fg.clearRect(0, 0, W, H); cg.clearRect(0, 0, W, H);
      Object.assign(cine, { rot: 0, quake: 0, punch: null, hit: null, saved: null, from: null, end: null }); FIN.on = false; FIN.flash = null;
      mode = 'intro'; modeT = 0; T = 0; acc = 0; teleT = 5; weapT = 7; slowUntil = 0; weapDrops = 0; lastKO = 0; rbuf = []; replay = null; replayOn = false; showdownSaid = false; finalLeft = 0; finalPair = null;
      PACE = clamp(Number(m.pace ?? 50), 0, 100); D = clamp(Number(m.length) || (25 + F.length * 1.6), 15, 240); // ⏳ how long the fight should take, and how hard the pacer works
      const late = (Date.now() - (m.startedAt || Date.now())) / 1000 - 2.4; // a screen that opened in the middle of the fight catches up (same seed = same fight)
      if (late > 1) { mode = 'fight'; modeT = 0; const quiet = SFX.play; SFX.play = () => {};
        try { if (late > D * 2.5) { const w = F.find(f => f.id === destined) || F[0]; for (const f of F) if (f !== w) { f.alive = false; f.koT = 9; order.push(f.id); } finish(w, true); } // (long over: just show who won)
          else for (let i = 0; i < late * 60 && !winner; i++) step(DT); } finally { SFX.play = quiet; }
        parts = []; texts = []; rbuf = []; }
      else bell();
      if (m.show) SFX.music?.('fight');
    } else if (m.phase !== 'fight' && m.phase !== 'ended') { // lobby: the packs lined up and waiting
      if (mode !== 'lobby' || was.map !== m.map || F.length !== m.fighters.length || F.some((f, i) => f.id !== m.fighters[i]?.id)) { /* (a new map: line them up again for it) */ R = Math.random; F = makeFighters(m.fighters); fg.clearRect(0, 0, W, H); cg.clearRect(0, 0, W, H); parts = []; flyers = []; weapons = []; petals = []; }
      mode = 'lobby'; fightId = null; winner = null; replay = null; FIN.on = false; if (m.show) SFX.music?.('lobby');
    } else if (m.phase === 'ended' && m.last && mode !== 'won' && mode !== 'replay' && mode !== 'over' && !winner) { // (a screen that joined late: show the winner)
      if (!F.length || F.some((f, i) => f.id !== m.fighters[i]?.id)) { R = Math.random; F = makeFighters(m.fighters); fightId = m.fightId; }
      if (!winner) { winner = F.find(f => f.packId === m.last.packId) || null; if (winner) { for (const f of F) if (f !== winner) { f.alive = false; f.koT = 6; } mode = 'won'; modeT = 1; } }
    }
  }
  const WN = { lowgrav: '🪶 LOW GRAVITY', gore: '🩸 EXTREME GORE', teleport: '🔀 TELEPORT SWITCHES', turbo: '⚡ TURBO', slowmo: '🐌 SLOW MOTION', giant: '🦍 GIANT PACKS', tiny: '🐜 TINY PACKS', slippery: '🧊 SLIPPERY STREET', boom: '💣 EXPLODING K.O.s', onehit: '☠️ ONE-HIT K.O.', rage: '😡 RAGE MODE', weapons: '🗡️ WEAPONS', lions: '🦁 LIONS' };
  const bell = () => snd(RUMBLE() ? 'bell' : 'gong');
  let toastText = '', toastT = 0; const toast = t => { toastText = t; toastT = 2.4; };

  // ---------- 🥋 the fight ----------
  // ⏳ pacer: knockouts spread over the fight's length D (the slider in the card battle settings; 0 = off)
  const paceTarget = () => Math.max(1, Math.round(F.length * Math.pow(1 - clamp(T / (D * .95), 0, 1), 1.15)));
  function paceHold(n) {
    if (!PACE || n <= 2) return 0; const k = PACE / 50, tg = paceTarget(), gap = clamp((D * .95 - T) / Math.max(1, n - 2) * .75, .35, 6);
    if (n <= tg && T - lastKO < gap) return Math.min(1, k);
    return n >= tg ? 0 : clamp((tg - n) / Math.max(2, tg * .5) * k, 0, .95);
  }
  const paceBoost = () => { if (!PACE) return 1; const n = alive().length, tg = paceTarget(); return n > tg ? 1 + clamp((n - tg) / Math.max(2, tg), 0, 1.5) * PACE / 100 : 1; }; // behind pace: hits land harder
  const holders = () => F.filter(o => o.alive && o.weapon);
  const inCombat = f => f.hurtT > 0 || F.some(o => o !== f && o.alive && Math.abs(o.x - f.x) < 115 * S(f) && Math.abs(o.z - f.z) < .08); // someone is right next to it (or it just got hit)
  function pickTarget(f) {
    const others = F.filter(o => o.alive && o !== f && (!PIR() || (o.team !== f.team && !o.swing))); if (!others.length) return null; // (🏴‍☠️ pirates only go after the other crew)
    // (going after weapons is decided in step: only when not already fighting someone)
    if (R() < (WIZ() ? .6 : PIR() ? .15 : .25)) return others[Math.floor(R() * others.length)]; // (wizards can hit anyone, from anywhere)
    let best = null, bd = 1e9; for (const o of others) { const d = Math.abs(o.x - f.x) + Math.abs(o.z - f.z) * 900 + (PIR() && (o.id === destined || pirKeep(o)) ? 520 : 0); if (d < bd) { bd = d; best = o; } } return best; // (🏴‍☠️ rather someone who can go out right now)
  }
  function step(dt) {
    crewC = null;
    if (mode === 'final') { for (const f of F) { f.ph += dt * 3; if (!f.alive) physics(f, dt); } return; } // (the clock stops while FINAL FIGHT shows; the last one out still lands)
    T += dt;
    const live = alive();
    if (mode === 'fight' && scene.finalNow && T > 1.2 && live.length > 2 && !finalPair) { if (PIR()) pirFinalNow(live); else for (const o of live.filter(x => x.id !== destined).slice(0, live.length - 2)) ko(o, null); return; } // 🧪 Test tab → 🎬 Scenes: straight to the last two (FINAL FIGHT)
    if (mode === 'fight' && PIR() && scene.finalFight && live.length === 2 && !showdownSaid && T > .8) { showdownSaid = true; startFinal(); return; } // (🏴‍☠️ only two pirates: straight to the kraken)
    if (mode !== 'fight') { for (const f of F) { if (FIN.on && (f === FIN.W || f === FIN.L)) continue; f.ph += dt * 3; physics(f, dt); } return; }
    if (scene.wacky.teleport && (teleT -= dt) <= 0 && live.length > 2) { // 🔀 two packs swap places
      teleT = rr(3.5, 6); const a = live[Math.floor(R() * live.length)]; let b = live[Math.floor(R() * live.length)]; if (b === a) b = live[(live.indexOf(a) + 1) % live.length];
      for (const f of [a, b]) puff(f, '#c88cff'); [a.x, b.x] = [b.x, a.x]; [a.z, b.z] = [b.z, a.z]; for (const f of [a, b]) puff(f, '#c88cff');
      word('SWITCH!', (a.x + b.x) / 2, zY((a.z + b.z) / 2) - 200, '#d6a8ff', 54); snd('swap');
    }
    if (MI().drops() && weapDrops < 2 && (weapT -= dt) <= 0) { weapT = rr(5, 8); weapDrops++; const ks = MI().weapons, kind = ks[Math.floor(R() * ks.length)], z = rr(.1, .9), [lo, hi] = bounds(z);
      weapons.push({ kind, x: RUMBLE() ? rr(lo + 40, hi - 40) : rr(200, 1720), z, h: RUMBLE() ? 260 : 700, vh: 0 }); if (RUMBLE()) { word('A CHAIR!', weapons[weapons.length - 1].x, zY(z) - 320, '#d6e2ee', 40); snd('crowd', { v: .6 }); } }
    if (WIZ()) wizStep(dt, live); if (COLO()) lionStep(dt); if (WAR()) warStep(dt, live); if (PIR()) pirStep(dt, live);
    for (const w of weapons) if (w.h > 0) { w.vh -= grav() * dt; w.h = Math.max(0, w.h + w.vh * dt); if (w.h === 0) { w.vh = 0; dust(w.x, w.z, 6); snd('land', { p: 1.4 }); } }
    for (const f of F) {
      f.ph += dt * (f.atk ? 6 : Math.abs(f.vx) > 20 || Math.abs(f.vz) > .02 ? 9 : 3);
      f.hurtT = Math.max(0, f.hurtT - dt); f.yell = Math.max(0, f.yell - dt);
      if (!f.alive) { physics(f, dt); continue; }
      if (f.swing) { pirSwing(f, dt); continue; } // 🏴‍☠️ swinging over to the other ship on a rope
      if (T > D * 1.8 && f.id !== destined) damage(null, f, 1.5 * dt * 10, 'bleed'); // (very long fights: the end comes)
      f.cd -= dt * speedK(); f.stun -= dt; f.retarget -= dt; f.block = Math.max(0, f.block - dt);
      if ((f.down > 0 || f.heldBy || f.whip || f.rebound > 0) && rumbleState(f, dt)) continue;
      if (!f.target?.alive || f.retarget <= 0) { f.target = pickTarget(f); f.retarget = rr(1.5, 3.5); }
      // 🗡️ not fighting anyone right now and empty-handed: go grab a weapon lying in the street, or go after whoever has one
      if (!f.weapon && !f.atk && f.stun <= 0 && !MI().armed && MI().weapons.length && !inCombat(f)) {
        const far = o => Math.abs(o.x - f.x) + Math.abs(o.z - f.z) * 900; // whichever is closer: a dropped weapon, or someone holding one
        const opts = [...weapons.filter(w => w.h === 0).map(w => ({ w, d: far(w) })), ...holders().filter(o => o !== f).map(o => ({ o, d: far(o) }))];
        const best = opts.length ? opts.reduce((a, b) => a.d < b.d ? a : b) : null;
        f.seek = best?.w || null; if (best?.o) { f.target = best.o; f.retarget = 1; }
      } else f.seek = null;
      if (f.seek && !weapons.includes(f.seek)) f.seek = null;
      if (f.seek && f.stun <= 0) { // walk to the weapon (no swinging on the way)
        const s = S(f), w = f.seek, dx = w.x - f.x, dz = w.z - f.z, legs = f.limbs.ll + f.limbs.rl, sp = 170 * speedK() * (legs === 2 ? 1 : legs === 1 ? .6 : .32);
        f.face = dx >= 0 ? 1 : -1;
        if (Math.abs(dz) > .02) f.vz += Math.sign(dz) * .9 * dt * speedK();
        if (Math.abs(dx) > 10 * s) f.vx += Math.sign(dx) * sp * 6 * dt;
        if (Math.abs(dx) < 34 * s && Math.abs(dz) < .06) { f.weapon = w.kind; weapons.splice(weapons.indexOf(w), 1); f.seek = null; word('GOT IT!', f.x, zY(f.z) - 190 * s, '#ffe08a', 30); snd('clash'); }
        physics(f, dt); continue;
      }
      const t = f.target;
      if (f.stun > 0 || !t) { physics(f, dt); continue; }
      const s = S(f), reach = (52 + wReach(f)) * s, dx = t.x - f.x, dz = t.z - f.z;
      if (!f.atk) f.face = dx >= 0 ? 1 : -1;
      if (!f.weapon && weapons.length) { const w = weapons.find(w => w.h === 0 && Math.abs(w.x - f.x) < 34 * s && Math.abs(w.z - f.z) < .06); if (w) { f.weapon = w.kind; weapons.splice(weapons.indexOf(w), 1); word('GOT IT!', f.x, zY(f.z) - 190 * s, '#ffe08a', 30); snd('clash'); } }
      if (WIZ() && !f.atk && wizAI(f, t, dx, dz, reach, dt)) { physics(f, dt); continue; }
      if (WAR() && !f.atk && warAI(f, t, dx, dz, reach, dt)) { physics(f, dt); continue; } // 🪖 keeps some distance and shoots // 🧙 keeps its distance and casts spells
      if (PIR() && !f.atk && pirAI(f, t, dx, dz, reach, dt)) { physics(f, dt); continue; } // 🏴‍☠️ crosses over to the other ship (gangplank or rope)
      if (f.atk) { attack(f, dt); }
      else {
        const legs = f.limbs.ll + f.limbs.rl, sp = 170 * speedK() * (legs === 2 ? 1 : legs === 1 ? .6 : .32);
        if (Math.abs(dz) > .03) f.vz += Math.sign(dz) * .9 * dt * speedK() * (legs ? 1 : .4);
        if (Math.abs(dx) > reach * .9) f.vx += Math.sign(dx) * sp * 6 * dt;
        else if (Math.abs(dx) < reach * .45) f.vx -= Math.sign(dx) * sp * 3 * dt; // a little room to swing
        if (RUMBLE() && f.cd <= 0 && Math.abs(dz) < .06 && Math.abs(dx) < reach * 1.15 && f.h === 0 && grabbable(t) && f.limbs.la + f.limbs.ra && (t.down > 0 || R() < .45)) { // 🤼 grab them
          const near = edgeD(t) < 150; let k = null;
          if (t.down > 0) k = near ? 'toss' : R() < .4 ? 'whip' : R() < .5 ? 'slam' : null;
          else k = near && R() < .6 ? 'toss' : R() < .45 ? 'whip' : R() < .5 ? 'slam' : R() < .6 ? 'suplex' : null;
          if (k) startAtk(f, k, t); else if (t.down > 0) startAtk(f, 'elbow', t); else startAtk(f, R() < .62 ? 'punch' : 'kick');
        }
        else if (f.cd <= 0 && Math.abs(dz) < .06 && Math.abs(dx) < reach * 1.15 && f.h === 0) startAtk(f, Math.abs(dx) > reach * .8 && R() < .3 ? 'jump' : R() < .62 ? 'punch' : 'kick');
        else if (f.cd <= 0 && Math.abs(dz) < .06 && Math.abs(dx) < reach * 3.2 && f.h === 0 && R() < .02) startAtk(f, 'jump');
        if (t.atk && Math.abs(dx) < reach * 1.3 && R() < .01) f.block = .5;
      }
      physics(f, dt);
    }
    for (let i = 0; i < F.length; i++) { const a = F[i]; if (!a.alive || a.swing) continue; for (let j = i + 1; j < F.length; j++) { const b = F[j]; if (!b.alive || b.swing || b.down > 0 || b.heldBy || b.whip || b.rebound > 0 || a.down > 0 || a.heldBy || a.whip || a.rebound > 0) continue; // they don't stand inside each other
      const dz = b.z - a.z, dx = b.x - a.x, m = 40 * (S(a) + S(b)) / 2; if (Math.abs(dz) < .035 && Math.abs(dx) < m) { const k = (m - Math.abs(dx)) / 2 * (dx >= 0 ? 1 : -1); if (!PIR() || onDeck(a.x - k, a.z) || !onDeck(a.x, a.z)) a.x -= k; if (!PIR() || onDeck(b.x + k, b.z) || !onDeck(b.x, b.z)) b.x += k; } } } // (🏴‍☠️ never shoved off the side just by the crowd)
    if (finalLeft > 0 && finalPair && live.length === 2) { finalLeft -= dt; if (finalLeft <= 0) { const loser = finalPair.find(f => f.id !== destined && f.alive) || finalPair[1]; const w = finalPair.find(f => f !== loser); if (RUMBLE()) { loser.heldBy = null; ko(loser, w, false, sideOf(loser)); } else if (WIZ()) { const t = tileAt(loser.x, loser.z); if (t) { t.hp = 0; t.fallT = 0; snd('crumble'); } word('THE FLOOR GIVES WAY!', loser.x, zY(loser.z) - 240, '#d6a8ff', 44); ko(loser, w, false, 0, true); } else ko(loser, w, !!scene.wacky.gore); } } // ⏱️ time's up: the finishing blow
    if (live.length <= 1 && !winner) finish(live[0] || F.find(f => f.id === destined) || F[0]);
  }
  // ---------- 🧙 wizards: spells ----------
  function wizAI(f, t, dx, dz, reach, dt) { // 🧙 casts at anyone, from anywhere on the platform (no need to get close or line up)
    const adx = Math.abs(dx), legs = f.limbs.ll + f.limbs.rl, sp = 120 * speedK() * (legs === 2 ? 1 : legs === 1 ? .6 : .32);
    if (adx < reach * 1.2 && Math.abs(dz) < .06 && R() < .5) return false; // up close: a wand whack or a kick (normal fighting)
    if (!f.wander || (f.wanderT -= dt) <= 0 || Math.abs(f.wander[0] - f.x) + Math.abs(f.wander[1] - f.z) * 900 < 30) { f.wanderT = rr(1.5, 3.5); const i = Math.floor(R() * tiles.length); f.wander = tiles[i]?.hp > 0 ? tileXZ(i) : [f.x, f.z]; } // strolls around the platform
    if (adx < 200 && Math.abs(dz) < .08) f.vx -= Math.sign(dx || 1) * sp * 5 * dt; // a little room
    else { const [wx, wz] = f.wander; if (Math.abs(wx - f.x) > 20) f.vx += Math.sign(wx - f.x) * sp * 4 * dt; if (Math.abs(wz - f.z) > .03) f.vz += Math.sign(wz - f.z) * .6 * dt * speedK(); }
    if (f.cd <= 0 && f.h === 0 && t?.alive) { const r = R(); startAtk(f, 'cast'); f.face = dx >= 0 ? 1 : -1; f.atk.spell = r < .5 ? 'bolt' : r < .82 ? 'fire' : 'zap'; f.atk.foe = t; f.cd = rr(1.1, 1.9); }
    return true;
  }
  function castSpell(f, kind, t) {
    const s = S(f), hx = f.x + f.face * 50 * s, hh = 95 * s;
    if (kind === 'shot') { const tx = t?.alive ? t.x : f.x + f.face * 900, tz = (t?.alive ? t.z : f.z) + rr(-.03, .03), sp = 2300, dist = Math.max(60, Math.abs(tx - hx)), x0 = f.x + f.face * 78 * s; bolts.push({ kind, x: x0, z: f.z, h: 92 * s, vx: Math.sign(tx - x0 || f.face) * sp, vz: (tz - f.z) / (dist / sp), life: dist / sp + .25, owner: f }); f.flash = .08; snd('gun', { v: .6 }); return; } // 🔫 a rifle shot (it can hit whoever's in the way)
    if (kind === 'zap') { if (!t?.alive) return; zaps.push({ x: t.x, z: t.z, t: .7, owner: f }); word('⚡', t.x, zY(t.z) - 260 * S(t), '#ffe27a', 50); snd('alert'); return; } // ⚡ lightning from the sky (after a warning)
    const tx = t?.alive ? t.x : f.x + f.face * 600, tz = t?.alive ? t.z : f.z, dist = Math.max(60, Math.abs(tx - hx)), sp = kind === 'fire' ? 760 : 1000;
    bolts.push({ kind, x: hx, z: f.z, h: hh, vx: Math.sign(tx - hx || f.face) * sp, vz: (tz - f.z) / (dist / sp), life: dist / sp + .35, owner: f });
    snd(kind === 'fire' ? 'whoosh' : 'spell');
  }
  function fireBoom(x, z, owner) { // 🔥 a fireball goes off: hurts whoever is close and cracks the floor
    for (const o of F) if (o.alive && !o.falling && o !== owner && Math.abs(o.x - x) < 130 && Math.abs(o.z - z) < .1) { o.vx += Math.sign(o.x - x || 1) * 260 * (crazy() ? 2 : 1); o.stun = .5; o.hurtT = .3; o.lastBy = owner; damage(owner, o, rr(10, 15) * paceBoost() * (T > D * 1.35 ? 2 : 1), 'fire'); }
    hurtTile(tileAt(x, z), 1); for (const [ddx, ddz] of [[90, 0], [-90, 0], [0, .2], [0, -.2]]) if (R() < .3) hurtTile(tileAt(x + ddx, z + ddz), 1);
    for (let i = 0; i < 26; i++) parts.push({ x, y: zY(z) - 30, vx: vr(-380, 380), vy: vr(-420, 60), g: 500, life: vr(.3, .7), max: .7, size: vr(5, 12), color: ['#ffcf4a', '#ff7a2a', '#ffe9a0', '#c83a1a'][Math.floor(Math.random() * 4)], gz: null });
    word('BOOM!', x, zY(z) - 120, '#ffb02a', 48); snd('boom');
  }
  function wizStep(dt, live) {
    for (const b of bolts) { b.life -= dt; b.x += b.vx * dt; b.z += b.vz * dt; let hitF = null;
      for (const o of F) if (o.alive && !o.falling && o !== b.owner && Math.abs(o.x - b.x) < 34 * S(o) && Math.abs(o.z - b.z) < .06) { hitF = o; break; }
      if (hitF || b.life <= 0 || b.x < 0 || b.x > W) { b.dead = true; if (b.kind === 'fire') fireBoom(hitF ? hitF.x : b.x, hitF ? hitF.z : b.z, b.owner); else if (hitF && b.owner.alive) hit(b.owner, hitF, 'bolt'); } }
    bolts = bolts.filter(b => !b.dead);
    for (const z of zaps) { z.t -= dt; if (z.t > 0 || z.done) continue; z.done = true; z.flash = .25;
      if (z.meteor) { const t = tileAt(z.x, z.z); hurtTile(t, 9); if (R() < .6) hurtTile(tileAt(z.x + (R() < .5 ? -1 : 1) * 95, z.z), 9); word('METEOR!', z.x, zY(z.z) - 180, '#ff7a2a', 56); snd('boom'); for (const o of F) if (o.alive && !o.falling && Math.abs(o.x - z.x) < 110 && Math.abs(o.z - z.z) < .1) { o.stun = .5; damage(null, o, rr(8, 12), 'fire'); } continue; }
      for (const o of F) if (o.alive && !o.falling && Math.abs(o.x - z.x) < 70 * S(o) && Math.abs(o.z - z.z) < .07) { o.stun = .5; o.hurtT = .3; o.lastBy = z.owner; damage(z.owner?.alive ? z.owner : null, o, rr(12, 18) * paceBoost() * (T > D * 1.35 ? 2 : 1), 'zap'); }
      hurtTile(tileAt(z.x, z.z), 1); snd('thunder'); sparks(z.x, zY(z.z) - 20); }
    for (const z of zaps) if (z.flash > 0) z.flash -= dt; zaps = zaps.filter(z => !z.done || z.flash > 0);
    for (const t of tiles) if (t.hp <= 0) t.fallT += dt;
    if (mode !== 'fight' || finalLeft > 0) return;
    const n = live.length;
    if ((meteorT -= dt * (n > paceTarget() ? 1.7 : 1)) <= 0) { meteorT = rr(6, 10); // ☄️ a meteor smashes part of the platform (where a pack stands)
      const pool = live.filter(f => f.id !== destined && !f.falling);
      if (pool.length && n > 2 && R() >= paceHold(n)) { const f = pool[Math.floor(R() * pool.length)]; zaps.push({ x: f.x, z: f.z, t: 1.4, meteor: true }); snd('alert'); } }
    if (T > D * 1.2 && (crumbleT -= dt) <= 0) { crumbleT = 1.2; const edge = tiles.map((t, i) => [t, i]).filter(([t, i]) => t.hp > 0 && (i % PC === 0 || i % PC === PC - 1 || !tiles[i - 1]?.hp || !tiles[i + 1]?.hp)); if (edge.length) hurtTile(edge[Math.floor(R() * edge.length)][0], 9); } // (long fight: the edges crumble)
  }
  // ---------- 🪖 WW2 Battlefield: rifles, two tanks shelling the field, bombers flying over ----------
  function warAI(f, t, dx, dz, reach, dt) { // keeps some distance, strafes up and down the field, and shoots
    const adx = Math.abs(dx), legs = f.limbs.ll + f.limbs.rl, sp = 140 * speedK() * (legs === 2 ? 1 : legs === 1 ? .6 : .32), arms = f.limbs.la + f.limbs.ra;
    if (adx < reach * 1.1 && Math.abs(dz) < .06 && R() < .6) return false; // up close: rifle butt or a kick (normal fighting)
    const want = finalLeft > 0 ? 420 : 520; if (adx < want * .7) f.vx -= Math.sign(dx || 1) * sp * 4 * dt; else if (adx > want * 1.5) f.vx += Math.sign(dx) * sp * 4 * dt;
    if (!f.wz || (f.wzT -= dt) <= 0) { f.wzT = rr(1.2, 2.6); f.wz = clamp(t.z + rr(-.25, .25), .05, .95); } if (Math.abs(f.wz - f.z) > .03) f.vz += Math.sign(f.wz - f.z) * .7 * dt * speedK(); // (lines up a shot, then moves again)
    if (f.cd <= 0 && f.h === 0 && t?.alive && arms && Math.abs(dz) < .22) { startAtk(f, 'cast'); f.face = dx >= 0 ? 1 : -1; f.atk.spell = 'shot'; f.atk.foe = t; f.atk.dur = .4; f.atk.hitAt = .22; f.cd = rr(.9, 1.7) * (finalLeft > 0 ? .7 : 1); }
    return true;
  }
  function boom(x, z, r, dmg, word1) { quake(12); // 💥 a shell or a bomb goes off: a crater, flying dirt, and everyone close gets hurt and thrown
    for (const o of F) if (o.alive && !o.falling && Math.abs(o.x - x) < r && Math.abs(o.z - z) < r / 1100) { const k = 1 - Math.abs(o.x - x) / r; o.vx += Math.sign(o.x - x || 1) * 420 * (k + .3); o.vh = Math.max(o.vh, 240 * k); o.stun = .55; o.hurtT = .3; o.atk = null; damage(null, o, dmg * (.5 + .5 * k) * paceBoost() * (T > D * 1.35 ? 2 : 1), 'boom'); }
    for (let i = 0; i < 30; i++) parts.push({ x, y: zY(z) - 20, vx: vr(-420, 420), vy: vr(-620, -80), g: 1100, life: vr(.5, 1), max: 1, size: vr(4, 11), color: ['#5a4632', '#3a2e22', '#ffb02a', '#ff6a1a', '#7a6a5a'][Math.floor(Math.random() * 5)], gz: null });
    for (let i = 0; i < 12; i++) parts.push({ x: x + vr(-40, 40), y: zY(z) - vr(20, 90), vx: vr(-60, 60), vy: vr(-90, -20), g: -20, life: vr(.8, 1.6), max: 1.6, size: vr(14, 30), color: 'rgba(60,56,50,.55)', gz: null, dust: true });
    const s = .7 + z * .4; cg.fillStyle = 'rgba(30,22,14,.55)'; cg.beginPath(); cg.ellipse(x, zY(z), 58 * s, 16 * s, 0, 0, 7); cg.fill(); cg.fillStyle = 'rgba(20,14,8,.5)'; cg.beginPath(); cg.ellipse(x, zY(z) + 2, 36 * s, 9 * s, 0, 0, 7); cg.fill(); // the crater stays (until the FINAL FIGHT fixes the ground)
    word(word1 || 'BOOM!', x, zY(z) - 150, '#ffb02a', 58); snd('boom');
  }
  function warTarget() { const n = alive().length, pool = F.filter(f => f.alive && !f.falling && f.id !== destined); if (!pool.length || n <= 2 || R() < paceHold(n)) return null; return pool[Math.floor(R() * pool.length)]; } // (never the fair winner; the pacer can hold fire)
  function warStep(dt, live) {
    for (const b of bolts) { b.life -= dt; b.x += b.vx * dt; b.z += b.vz * dt; let hitF = null;
      for (const o of F) if (o.alive && !o.falling && o !== b.owner && Math.abs(o.x - b.x) < 30 * S(o) && Math.abs(o.z - b.z) < .05) { hitF = o; break; }
      if (hitF || b.life <= 0 || b.x < 0 || b.x > W) { b.dead = true; if (hitF && b.owner.alive) hit(b.owner, hitF, 'shot'); else if (hitF) damage(null, hitF, rr(8, 12), 'shot'); else dust(b.x, b.z, 3); } }
    bolts = bolts.filter(b => !b.dead);
    for (const s of shells) { s.t -= dt; if (s.t <= 0 && !s.done) { s.done = true; boom(s.x, s.z, 170, rr(22, 32), pick(['KABOOM!', 'DIRECT HIT!', 'BOOM!'])); } } shells = shells.filter(s => !s.done || (s.t > -.3));
    for (const b of bombs) { b.t -= dt; if (b.t <= 0 && !b.done) { b.done = true; boom(b.x, b.z, 150, rr(20, 30), pick(['BOMBED!', 'KABOOM!', 'INCOMING!'])); } } bombs = bombs.filter(b => !b.done);
    for (const p of planes) { p.x += p.vx * dt; } planes = planes.filter(p => p.x > -500 && p.x < W + 500);
    for (const tk of tanks) { tk.recoil = Math.max(0, tk.recoil - dt * 3); tk.x += Math.sin(T * .35 + tk.side) * 18 * dt; }
    if (mode !== 'fight' || finalLeft > 0) return; // (they hold fire for the final fight)
    const n = live.length, behind = n > paceTarget();
    for (const tk of tanks) { if ((tk.cd -= dt * (behind ? 1.6 : 1)) > 0) continue; tk.cd = rr(4.5, 7.5); const o = warTarget(); if (!o) continue; const x = o.x + rr(-40, 40), z = clamp(o.z + rr(-.04, .04), 0, 1); shells.push({ x, z, t: 1.5, tank: tk, from: tk.x }); tk.aim = Math.atan2(zY(z) - 560, x - tk.x); tk.fireAt = T + 1.1; snd('alert', { v: .5 }); }
    for (const tk of tanks) if (tk.fireAt && T >= tk.fireAt) { tk.fireAt = 0; tk.recoil = 1; snd('tank'); }
    if ((planeT -= dt * (behind ? 1.5 : 1)) <= 0) { planeT = rr(9, 14); const dir = R() < .5 ? 1 : -1, z0 = rr(.15, .85), y = rr(120, 220); planes.push({ x: dir > 0 ? -300 : W + 300, y, vx: dir * 620, dir }); snd('plane');
      for (let i = 0; i < 5; i++) { const x = 260 + i * 350 + rr(-60, 60), bx = dir > 0 ? x : W - x, o = warTarget(); bombs.push({ x: o && Math.abs(o.x - bx) < 300 ? o.x : bx, z: o ? clamp(o.z + rr(-.05, .05), 0, 1) : clamp(z0 + rr(-.2, .2), 0, 1), t: ((dir > 0 ? bx + 300 : W + 300 - bx) / 620) + .9 }); } }
  }
  // ---------- 🏴‍☠️ Pirate Battle: crossing over, rope swings, cannons, the sea, and the 🐙 kraken final ----------
  function pirAI(f, t, dx, dz, reach, dt) { // gets over to the ship the pirate it's after is on (a gangplank, or a rope swing); same ship = fight normally
    const s = S(f), close = o => o.alive && o.team !== f.team && !o.swing && !o.falling && Math.abs(o.z - f.z) < .07 && Math.abs(o.x - f.x) < 130 * s;
    if (close(t)) return false;
    const near = F.filter(close).sort((a, b) => ((a.id === destined || pirKeep(a)) - (b.id === destined || pirKeep(b))) || Math.abs(a.x - f.x) - Math.abs(b.x - f.x))[0];
    if (near) { f.target = near; f.retarget = rr(1, 2); return false; } // (someone from the other crew right here: fight them)
    const sf = shipOf(f.x, f.z), st = t.swing ? -2 : shipOf(t.x, t.z);
    if (pir.sunk != null || sf === -1 || st === -2 || sf === st) return false; // (same ship, on a gangplank already, or after the kraken: just fight)
    const toward = sf === 0 ? 1 : -1, legs = f.limbs.ll + f.limbs.rl, sp = 170 * speedK() * (legs === 2 ? 1 : legs === 1 ? .6 : .32), edge = sf === 0 ? deckHi(0, f.z) : deckLo(1, f.z);
    f.face = toward;
    if (st === -1) { // they're on a gangplank: get on it too
      if (Math.abs(f.z - t.z) > PLK * .5) { f.vz += Math.sign(t.z - f.z) * .9 * dt * speedK(); const gx = edge - toward * 90; if (Math.abs(gx - f.x) > 30) f.vx += Math.sign(gx - f.x) * sp * 4 * dt; }
      else { f.vz += (t.z - f.z) * 5 * dt; f.vx += toward * sp * 6 * dt; }
      return true;
    }
    if (!f.route || (f.routeT -= dt) <= 0) { f.route = pir.planks && R() < .6 ? 'plank' : 'swing'; f.routeT = rr(3, 6); }
    if (f.route === 'swing' || !pir.planks) { // 🪢 up to the rail, then swing over
      const gx = edge - toward * 30 * s, wz = clamp(t.z, .12, .88);
      if (Math.abs(gx - f.x) > 12) f.vx += Math.sign(gx - f.x) * sp * 6 * dt;
      if (Math.abs(wz - f.z) > .06) f.vz += Math.sign(wz - f.z) * .5 * dt * speedK();
      if (Math.abs(gx - f.x) < 40 && f.cd <= 0 && f.h === 0 && f.stun <= 0) startSwing(f, t);
      return true;
    }
    const pz = PLANKS.reduce((a, b) => Math.abs(b - f.z) < Math.abs(a - f.z) ? b : a); // 🪵 line up with the nearest gangplank, then across
    if (Math.abs(f.z - pz) > PLK * .5) { f.vz += Math.sign(pz - f.z) * .9 * dt * speedK(); const gx = edge - toward * 110; if (Math.abs(gx - f.x) > 30) f.vx += Math.sign(gx - f.x) * sp * 4 * dt; }
    else { f.vz += (pz - f.z) * 5 * dt; f.vx += toward * sp * 6 * dt; }
    return true;
  }
  function startSwing(f, t) { // 🪢 grabs a rope and swings over to the other ship, landing near the pirate it's after
    const s1 = 1 - shipOf(f.x, f.z); if (s1 > 1 || pir.sunk === s1) return;
    const z1 = clamp(t.z + rr(-.1, .1), .1, .9), x1 = s1 ? deckLo(1, z1) + rr(70, 210) : deckHi(0, z1) - rr(70, 210);
    f.swing = { t: 0, dur: rr(.85, 1.05), x0: f.x, z0: f.z, x1, z1, ax: GAPX + (s1 ? -1 : 1) * 34 }; f.atk = null; f.vx = f.vz = f.vh = 0; f.cd = rr(.3, .6); f.face = s1 ? 1 : -1; f.route = null;
    if (Math.random() < .4) word(pick(['YARRR!', 'SWING!', 'AHOY!', 'BOARD HER!', 'WHEEE!']), f.x, zY(f.z) - 210 * S(f), '#ffe08a', 34); snd('whoosh');
  }
  function pirSwing(f, dt) {
    const w = f.swing; w.t += dt * speedK(); const u = Math.min(1, w.t / w.dur), e = u * u * (3 - 2 * u);
    f.x = w.x0 + (w.x1 - w.x0) * e; f.z = w.z0 + (w.z1 - w.z0) * u; f.h = Math.sin(u * Math.PI) * 190;
    if (u >= 1) { f.swing = null; f.h = 0; f.vh = 0; f.vx = f.face * 120; dust(f.x, f.z, 6); snd('land', { p: 1.1 }); if (!onDeck(f.x, f.z)) pirOver(f); }
  }
  const cannonX = c => c.s ? deckLo(1, c.z) + 44 : deckHi(0, c.z) - 44;
  function pirStep(dt, live) { // 💥 each ship's cannons fire at the other crew on the other ship (a red crosshair shows where first)
    for (const c of pir.cannons) c.recoil = Math.max(0, c.recoil - dt * 2.5);
    for (const b of pir.balls) { b.t -= dt; if (b.t <= 0 && !b.done) { b.done = true; pirBoom(b); } } pir.balls = pir.balls.filter(b => !b.done);
    for (const c of pir.cannons) if (c.fireAt && T >= c.fireAt) { c.fireAt = 0; c.recoil = 1; snd('cannon'); const x = cannonX(c), d = c.s ? -1 : 1, y = zY(c.z) - 26 * (.72 + c.z * .4); for (let i = 0; i < 16; i++) parts.push({ x: x + d * 50, y, vx: d * vr(60, 280), vy: vr(-90, 10), g: -30, life: vr(.6, 1.3), max: 1.3, size: vr(10, 24), color: i < 4 ? '#ffd27a' : 'rgba(225,225,225,.6)', gz: null, dust: true }); }
    if (mode === 'fight' && Math.random() < dt / 9) snd('creak'); // (the ships creak now and then)
    stormStep(dt); // ⛈️ chat's waves / lightning / tentacles
    if (mode !== 'fight' || finalLeft > 0 || finalPair || pir.sunk != null) return; // (they hold fire for the final)
    const n = live.length, behind = n > paceTarget();
    for (const s of [0, 1]) {
      if ((pir.cd[s] -= dt * (behind ? 1.6 : 1)) > 0) continue; pir.cd[s] = rr(5, 8);
      const pool = live.filter(o => !o.falling && !o.swing && o.team !== s && o.id !== destined && shipOf(o.x, o.z) === 1 - s && !pirKeep(o)); // (only the other crew, on the other ship; never the fair winner)
      if (!pool.length || n <= 2 || R() < paceHold(n)) continue;
      const o = pool[Math.floor(R() * pool.length)], z = clamp(o.z + rr(-.04, .04), PZ0, PZ1), x = o.x + rr(-30, 30);
      const c = pir.cannons.filter(c => c.s === s).reduce((a, b) => Math.abs(b.z - z) < Math.abs(a.z - z) ? b : a);
      pir.balls.push({ x, z, t: 1.5, c, s }); c.fireAt = T + 1.05; snd('alert', { v: .5 });
    }
  }
  function pirBoom(b) { // a cannonball lands: the other crew close by gets hurt and thrown (never its own crew), wood flies, a scorch mark
    const { x, z } = b, r = 150;
    if (!onDeck(x, z)) { pirSplash(x, z, 1.2); word('MISSED!', x, seaY(z) - 90, '#9fe0ff', 40); return; }
    quake(10);
    for (const o of F) if (o.alive && !o.falling && !o.swing && o.team !== b.s && Math.abs(o.x - x) < r && Math.abs(o.z - z) < r / 1100) { const k = 1 - Math.abs(o.x - x) / r; o.vx += Math.sign(o.x - x || 1) * 380 * (k + .3); o.vh = Math.max(o.vh, 220 * k); o.stun = .55; o.hurtT = .3; o.atk = null; damage(null, o, rr(18, 28) * (.5 + .5 * k) * paceBoost() * (T > D * 1.35 ? 2 : 1), 'boom'); }
    for (let i = 0; i < 24; i++) parts.push({ x, y: zY(z) - 20, vx: vr(-420, 420), vy: vr(-620, -80), g: 1100, life: vr(.5, 1), max: 1, size: vr(4, 10), color: ['#8a5a2a', '#5a3818', '#ffb02a', '#ff6a1a', '#c89a5a'][Math.floor(Math.random() * 5)], gz: null });
    for (let i = 0; i < 10; i++) parts.push({ x: x + vr(-40, 40), y: zY(z) - vr(20, 90), vx: vr(-60, 60), vy: vr(-90, -20), g: -20, life: vr(.8, 1.6), max: 1.6, size: vr(14, 28), color: 'rgba(60,56,50,.55)', gz: null, dust: true });
    const s = .7 + z * .4; cg.fillStyle = 'rgba(30,18,8,.5)'; cg.beginPath(); cg.ellipse(x, zY(z), 50 * s, 13 * s, 0, 0, 7); cg.fill();
    word(pick(['KABOOM!', 'BROADSIDE!', 'DIRECT HIT!', 'BOOM!']), x, zY(z) - 150, '#ffb02a', 56); snd('boom');
  }
  function pirOver(f) { // 🌊 off the side: into the sea (the fair winner, a pirate that can't go out yet, the last two, or one the pacer saves grabs a rope)
    if (f.id === destined || pirKeep(f) || finalPair || (!(f.washed > T) && R() < paceHold(alive().length))) { // (⛈️ washed over by chat's storm: the pacer doesn't save them)
      const [x, z] = pirSafe(f); puff(f, '#bfe8ff'); Object.assign(f, { x, z, vx: 0, vz: 0, vh: 0, h: 0, stun: .6, swing: null, atk: null });
      word(pick(['GRABS A ROPE!', 'HANGS ON!', 'NOT TODAY!']), f.x, zY(f.z) - 200 * S(f), '#9fe0ff', 34); snd('whoosh'); return;
    }
    ko(f, f.lastBy || null, false, 0, true);
  }
  function pirSafe(f) { // the closest spot back on a deck (on a ship that's still there)
    let s = shipOf(f.x, f.z); if (s < 0 || pir.sunk === s) s = pir.sunk != null ? 1 - pir.sunk : f.x < GAPX ? 0 : 1;
    const z = clamp(f.z, .08, .92); return [clamp(f.x, deckLo(s, z) + 50, deckHi(s, z) - 50), z];
  }
  function pirSplash(x, z, k = 1, quiet) { // 💦
    const y = seaY(z); for (let i = 0; i < 26 * k; i++) parts.push({ x: x + vr(-20, 20), y, vx: vr(-260, 260) * k, vy: -vr(250, 700) * k, g: 1500, life: vr(.5, .9), max: .9, size: vr(3, 8), color: Math.random() < .5 ? '#e8f8ff' : '#8ad0f0', gz: null });
    pirS().rings.push({ x, z, t: 0, k }); if (!quiet) snd('splash');
  }
  function pirSink(f, dt) { // 🌊 falls to the water, a splash, then goes under (only the part above the water is drawn)
    f.koT += dt; const wl = -FREE(f.z);
    if (!f.splashed) { f.vh -= grav() * dt; f.h += f.vh * dt; f.x += f.vx * dt; if (f.h <= wl) { f.splashed = true; f.h = wl; f.vh = -70; pirSplash(f.x, f.z, 1); } }
    else if (f.h > wl - 400) f.h += f.vh * dt;
  }
  // ---------- ⛈️ the storm's chat powers (1.70.0, Derek): channel points send 🌊 big waves, ⚡ lightning bolts and 🐙 kraken tentacles ----------
  // The server picks the ship / spot (pick, ship, z: the same on every game screen). They go off one at a time in the fight (they wait while the kraken and the
  // FINAL FIGHT intro play). They never change who wins: the fair winner and the smaller crew can't be knocked out by them, so it still ends one pirate from each crew.
  const STORM_WORD = { wave: '🌊 BIG WAVE!', bolt: '⚡ LIGHTNING!', tentacle: '🐙 KRAKEN TENTACLE!' };
  function pirStorm(m) {
    if (!PIR() || !STORM_WORD[m.kind] || mode === 'won' || mode === 'over' || mode === 'replay' || FIN.on || winner) return;
    pirS().storm.q.push({ kind: m.kind, name: String(m.name || '').slice(0, 25), pick: clamp(Number(m.pick) || 0, 0, .9999), ship: m.ship ? 1 : 0, z: clamp(Number(m.z ?? .5), 0, 1) });
  }
  const outerOf = (s, z) => s ? deckHi(1, z) : deckLo(0, z), innerOf = (s, z) => s ? deckLo(1, z) : deckHi(0, z); // (outer = the open sea side, inner = the gap)
  function stormStep(dt) {
    const ST = pir.storm;
    if (ST.q.length && mode === 'fight' && !winner && T >= ST.next) { const e = ST.q.shift(); ST.next = T + 1.2; stormStart(e); }
    for (const e of ST.fx) { e.t += dt; stormTick(e); } ST.fx = ST.fx.filter(e => e.t < e.dur);
  }
  function stormStart(e) {
    e.t = 0; e.s = pir.sunk === e.ship ? 1 - e.ship : e.ship; // (only a ship that's still there)
    toast(e.name ? `${STORM_WORD[e.kind]} (${e.name})` : STORM_WORD[e.kind]);
    if (e.kind === 'wave') { e.dur = 3; e.hitAt = 1.15; snd('bigwave'); }
    else if (e.kind === 'tentacle') { e.dur = 2.6; e.z0 = clamp(.14 + e.z * .72, .12, .88); e.hits = new Set(); e.prev = null; snd('kraken'); }
    else { e.dur = 1.1; e.hitAt = .1; // ⚡ who it hits: one it can knock out if there is one (the server's pick says which)
      const all = F.filter(o => o.alive && !o.falling && !o.swing && onDeck(o.x, o.z)).sort((a, b) => String(a.id) < String(b.id) ? -1 : 1);
      const can = all.filter(o => o.id !== destined && !pirKeep(o) && !finalPair), pool = can.length ? can : all, o = pool[Math.floor(e.pick * pool.length)];
      if (o) { e.target = o.id; e.x = o.x; e.z = o.z; } else { e.x = 300 + e.pick * (W - 600); e.z = .2 + e.z * .6; }
      WX.flash = Math.max(WX.flash, 1.2); snd('thunder'); }
    pir.storm.fx.push(e);
  }
  function stormTick(e) {
    const s = e.s, inward = s ? -1 : 1;
    if (e.kind === 'wave' && !e.hit && e.t > .35 && Math.random() < .5) { const z = vr(0, 1); parts.push({ x: outerOf(s, z) - inward * vr(0, 60), y: zY(z) - (300 + 280 * z) * (.72 + z * .4) * easeIO(clamp(e.t / e.hitAt, 0, 1)), vx: inward * vr(40, 260), vy: -vr(60, 260), g: 900, life: vr(.4, .8), max: .8, size: vr(3, 7), color: 'rgba(235,248,255,.9)', gz: null }); } // (spray blowing off its top)
    if (e.kind === 'wave' && !e.hit && e.t >= e.hitAt) { e.hit = true; quake(9); snd('splash'); snd('boom'); // 🌊 it crashes over the deck: everyone on that ship is washed toward the gap (maybe overboard)
      for (const o of F) if (o.alive && !o.falling && !o.swing && o.h <= 40 && onShip(s, o.x, o.z)) {
        const k = .8 + .4 * R(); o.vx += inward * 640 * k; o.vz += rr(-.3, .3); o.vh = Math.max(o.vh, 230 * k); o.h = Math.max(o.h, 2); o.stun = Math.max(o.stun || 0, 1.15); o.atk = null; o.block = 0; o.washed = T + 3; o.lastBy = null;
        damage(null, o, rr(5, 10), 'storm', true); }
      for (let i = 0; i < 60; i++) { const z = vr(0, 1); parts.push({ x: outerOf(s, z) + inward * vr(0, 260), y: zY(z) - vr(0, 90), vx: inward * vr(150, 700), vy: -vr(200, 700), g: 1400, life: vr(.5, 1.1), max: 1.1, size: vr(3, 9), color: Math.random() < .55 ? '#e8f8ff' : '#9ad6f2', gz: null }); }
      word('SPLASH!', deckMid(s, .55), zY(.55) - 240, '#9fe0ff', 62);
    }
    if (e.kind === 'tentacle' && e.t >= .7 && e.t <= 1.45) { // 🐙 it sweeps across the deck from the open sea side: everyone in its way is flung toward the gap
      const z = e.z0, x0 = outerOf(s, z) - inward * 40, x1 = innerOf(s, z) + inward * 70, tip = x0 + (x1 - x0) * easeIO(clamp((e.t - .7) / .75, 0, 1)), prev = e.prev ?? x0; e.prev = tip;
      if (!e.swish) { e.swish = true; snd('whoosh'); }
      for (const o of F) if (o.alive && !o.falling && !o.swing && !e.hits.has(o.id) && Math.abs(o.z - z) < .17 && (o.x - prev) * inward >= -12 && (o.x - tip) * inward <= 0 && onShip(s, o.x, o.z)) {
        e.hits.add(o.id); o.vx = inward * rr(600, 820); o.vz += (o.z - z) * 2; o.vh = Math.max(o.vh, rr(280, 380)); o.h = Math.max(o.h, 4); o.stun = Math.max(o.stun || 0, 1.25); o.atk = null; o.block = 0; o.washed = T + 3; o.hurtT = .3; o.lastBy = null;
        word(pick(['WHAM!', 'SLAPPED!', 'TENTACLED!', 'SPLAT!']), o.x, zY(o.z) - 200 * S(o), '#e08aff', 46); snd('slam'); quake(5);
        damage(null, o, rr(16, 24) * paceBoost(), 'storm'); }
    }
    if (e.kind === 'bolt' && !e.hit && e.t >= e.hitAt) { e.hit = true; quake(8); snd('zap'); // ⚡ it strikes: knocked out (or badly shocked if it can't go out), people close by jump back
      const o = e.target != null ? F.find(x => x.id === e.target) : null;
      if (o && o.alive) { e.x = o.x; e.z = o.z; e.y = zY(o.z) - o.h - 70 * S(o);
        for (const n of F) if (n !== o && n.alive && !n.falling && Math.abs(n.x - o.x) < 120 * S(o) && Math.abs(n.z - o.z) < .12) { n.vx += Math.sign(n.x - o.x || 1) * 280; n.stun = Math.max(n.stun || 0, .45); n.atk = null; }
        o.charT = T; o.stun = Math.max(o.stun || 0, 1.4); o.atk = null; o.block = 0; o.vh = Math.max(o.vh, 160);
        if (o.id !== destined && !pirKeep(o) && !finalPair) { o.zapT = T; o.hp = 0; ko(o, null, false); }
        else { damage(null, o, rr(28, 38), 'storm'); if (o.alive) word(pick(['SHOCKED!', 'ZZZAP!', 'STILL STANDING!']), o.x, zY(o.z) - 210 * S(o), '#fff27a', 44); }
      } else { e.y = onDeck(e.x, e.z) ? zY(e.z) : seaY(e.z); if (!onDeck(e.x, e.z)) pirSplash(e.x, e.z, 1.3, true); }
      if (onDeck(e.x, e.z)) { const sc = .7 + e.z * .4; cg.fillStyle = 'rgba(20,14,10,.55)'; cg.beginPath(); cg.ellipse(e.x, zY(e.z), 46 * sc, 12 * sc, 0, 0, 7); cg.fill(); } // a scorch mark
      for (let i = 0; i < 28; i++) parts.push({ x: e.x, y: e.y, vx: vr(-420, 420), vy: vr(-520, 60), g: 1200, life: vr(.25, .6), max: .6, size: vr(2, 5), color: Math.random() < .5 ? '#fff6a0' : '#9ad8ff', gz: null });
    }
  }
  const KRAKEN_T = 5.5; // 🐙 seconds of the kraken scene before the FINAL FIGHT intro
  const finIntro = () => FINAL_INTRO + (PIR() ? KRAKEN_T : 0);
  function pirFinal(a, b) { // 🐙 the kraken takes the ship the last two AREN'T on (split up: the fair winner's ship stays); they face off on the one that's left
    const d = a.id === destined ? a : b.id === destined ? b : a, sa = shipOf(a.x, a.z), sb = shipOf(b.x, b.z);
    let safe = sa === sb && sa >= 0 ? sa : shipOf(d.x, d.z); if (safe < 0) safe = d.x < GAPX ? 0 : 1;
    const doomed = 1 - safe; Object.assign(pir, { safe, sunk: doomed, planks: false, balls: [], kr: { safe, doomed, tents: pirTentacles(doomed), fired: new Set() } }); pir.storm.fx = [];
    const z = .55, mid = deckMid(safe, z), [l, r] = a.x <= b.x ? [a, b] : [b, a];
    for (const [f, x, face] of [[l, mid - 150, 1], [r, mid + 150, -1]]) {
      f.pm = { x: f.x, z: f.z, h: Math.max(0, f.h), leap: shipOf(f.x, f.z) !== safe }; // (drawn getting there during the kraken scene: the one on the other ship jumps across)
      Object.assign(f, { x, z, h: 0, vx: 0, vz: 0, vh: 0, face, atk: null, stun: 0, block: 0, swing: null, target: f === a ? b : a, down: 0, heldBy: null, lie: 0, whip: 0, rebound: 0 });
    }
    for (const f of F) if (!f.alive && !f.falling && shipOf(f.x, f.z) === doomed) f.wreck = true; // (knocked-out pirates on that ship go down with it)
    fg.save(); fg.globalCompositeOperation = 'destination-out'; pirDeckPath(fg, doomed, 30); fg.fill(); fg.restore(); // (its blood goes down with it)
    snd('kraken'); quake(12);
  }
  function pirFinalNow(live) { // 🧪 straight to the last two: the fair winner + one pirate from the other crew (the rest go out)
    const d = live.find(o => o.id === destined) || live[0], other = live.find(o => o.team !== d.team); if (!other) return;
    pirForce = true; try { for (const o of live) if (o !== d && o !== other && o.alive) ko(o, null); } finally { pirForce = false; }
  }

  // ---------- 🦁 Colosseum lions (an on/off setting; turned off = back to the tunnels) ----------
  const GATES = [330, 1590];
  function lionStep(dt) {
    const want = !!scene.wacky.lions && mode === 'fight';
    if (want && (lionT -= dt) <= 0 && lions.filter(l => l.state !== 'leave').length < 2) { lionT = rr(3, 5); const side = lions.length % 2; lions.push({ x: GATES[side], z: .02, side, state: 'hunt', cd: 1.2, vx: 0, vz: 0, h: 0, vh: 0, face: side ? -1 : 1, ph: 0 }); word('ROAR!', GATES[side], zY(0) - 140, '#ffb02a', 54); snd('roar'); }
    for (const L of lions) {
      L.ph += dt * (Math.abs(L.vx) > 30 ? 10 : 2); L.cd -= dt;
      if (!scene.wacky.lions && L.state !== 'leave') { L.state = 'leave'; L.pounce = null; }
      let gx, gz, sp;
      if (L.state === 'leave') { gx = GATES[L.side]; gz = 0; sp = 330; if (Math.abs(L.x - gx) < 40 && L.z < .06) { L.gone = true; continue; } }
      else { let tg = null, bd = 1e9; for (const f of F) if (f.alive && !f.falling) { const d = Math.abs(f.x - L.x) + Math.abs(f.z - L.z) * 900 + (f.id === destined ? 250 : 0); if (d < bd) { bd = d; tg = f; } }
        if (!tg) { gx = L.x; gz = L.z; sp = 0; } else { gx = tg.x; gz = tg.z; sp = 250 * speedK();
          if (L.cd <= 0 && L.h === 0 && Math.abs(tg.x - L.x) < 170 && Math.abs(tg.z - L.z) < .07) { L.cd = rr(1.8, 3); L.vh = 520; L.vx = Math.sign(tg.x - L.x || 1) * 430; L.pounce = tg; snd('roar'); }
          if (L.pounce && L.h > 0 && L.pounce.alive && Math.abs(L.x - L.pounce.x) < 60 && Math.abs(L.z - L.pounce.z) < .08) { const o = L.pounce; L.pounce = null; o.vx += Math.sign(o.x - L.x || 1) * 300; o.stun = .55; o.hurtT = .3; o.atk = null; damage(null, o, rr(12, 20) * paceBoost(), 'lion'); word(pick(['MAULED!', 'CHOMP!', 'RAWR!']), o.x, zY(o.z) - 200 * S(o), '#ffb02a', 44); snd('punch'); } } }
      if (L.h === 0 && sp) { L.face = gx >= L.x ? 1 : -1; if (Math.abs(gx - L.x) > 50) L.vx += Math.sign(gx - L.x) * sp * 6 * dt; if (Math.abs(gz - L.z) > .02) L.vz += Math.sign(gz - L.z) * dt * 1.1; }
      L.x += L.vx * dt; L.z = clamp(L.z + L.vz * dt, 0, 1); L.vx *= Math.pow(L.h > 0 ? .995 : .86, dt * 60); L.vz *= Math.pow(.8, dt * 60);
      if (L.h > 0 || L.vh > 0) { L.h += L.vh * dt; L.vh -= 1900 * dt; if (L.h <= 0) { L.h = 0; L.vh = 0; L.pounce = null; dust(L.x, L.z, 6); } }
      L.x = clamp(L.x, 100, W - 100);
    }
    lions = lions.filter(l => !l.gone);
  }
  function startAtk(f, kind, o) {
    const arms = f.limbs.la + f.limbs.ra, legs = f.limbs.ll + f.limbs.rl;
    if ((GRAB[kind] || kind === 'elbow') && !arms) kind = legs ? 'kick' : 'head';
    if (GRAB[kind]) { // 🤼 a hold: the other pack is grabbed and moved by this one until the move lands
      const dur = { slam: .9, suplex: 1, toss: .85, whip: .35 }[kind];
      f.atk = { kind, t: 0, dur, hitAt: dur * (kind === 'whip' ? .6 : .65), done: false, o }; f.cd = rr(.9, 1.5); f.vx = 0; f.yell = .5;
      if (o.atk?.o) o.atk.o.heldBy = null; Object.assign(o, { heldBy: f, atk: null, block: 0, down: 0, vx: 0, vz: 0, vh: 0, lie: 0 });
      if (kind !== 'whip') snd('whoosh'); return;
    }
    if (kind === 'elbow') { f.atk = { kind, t: 0, dur: 1.1, hitAt: 9, done: false }; f.cd = rr(.8, 1.3); f.vh = scene.wacky.lowgrav ? 520 : 560; f.vx = Math.sign((o?.x ?? f.x) - f.x || f.face) * 150; f.yell = .6; snd('whoosh'); return; }
    if (kind === 'punch' && !arms) kind = legs ? 'kick' : 'head';
    if (kind === 'kick' && !legs) kind = arms ? 'punch' : 'head';
    if (kind === 'jump' && !legs) kind = arms ? 'punch' : 'head';
    const dur = { punch: .32, kick: .42, jump: .7, head: .4, cast: .55 }[kind];
    f.atk = { kind, t: 0, dur, hitAt: dur * .45, done: false };
    f.cd = rr(.55, 1.15) * (WSTAT[f.weapon]?.cd || 1) / (scene.wacky.rage ? 1 + (1 - f.hp / 100) * .8 : 1);
    if (kind === 'jump') { f.vh = scene.wacky.lowgrav ? 520 : 620; f.vx = f.face * 380 * speedK(); f.yell = .5; snd('whoosh'); }
    else if (R() < .25) f.yell = .4;
  }
  function attack(f, dt) {
    const a = f.atk; a.t += dt * speedK();
    if (GRAB[a.kind]) return grapple(f, a);
    if (a.kind === 'cast') { if (!a.done && a.t >= a.hitAt) { a.done = true; castSpell(f, a.spell, a.foe); } if (a.t >= a.dur) f.atk = null; return; }
    if (a.kind === 'elbow') { // 💪 jump and drop an elbow on someone lying down
      if (!a.done && a.t > .25 && f.vh < 0) { const s = S(f); for (const o of F) { if (o === f || !o.alive || !(o.down > 0)) continue; if (Math.abs(o.x - f.x) < 70 * s && Math.abs(o.z - f.z) < .07) { a.done = true; hit(f, o, 'elbow'); break; } } }
      if (a.t >= a.dur) f.atk = null; return;
    }
    const hitting = a.kind === 'jump' ? a.t > .12 && f.h > 0 : a.t >= a.hitAt && a.t < a.hitAt + .1;
    if (hitting && !a.done) {
      const s = S(f), reach = ({ punch: 70, kick: 84, jump: 70, head: 50 }[a.kind] + wReach(f)) * s;
      for (const o of F) { if (o === f || !o.alive || (PIR() && (o.team === f.team || o.swing))) continue; const dx = (o.x - f.x) * f.face; if (dx > -12 * s && dx < reach && Math.abs(o.z - f.z) < .065 && Math.abs(o.h - f.h) < 90) { a.done = true; hit(f, o, a.kind); break; } } // (🏴‍☠️ never your own crew)
    }
    if (a.t >= a.dur) f.atk = null;
  }
  function grapple(f, a) {
    const o = a.o, s = S(f);
    if (!o?.alive || o.heldBy !== f) { f.atk = null; return; }
    const u = Math.min(1, a.t / a.hitAt);
    f.vx *= .5;
    if (a.kind === 'whip') { o.x = f.x + f.face * 40 * s; o.z = f.z; o.h = 0; }
    else if (a.kind === 'suplex') { const th = u * Math.PI; o.x = f.x + f.face * Math.cos(th) * 46 * s; o.z = f.z + .002; o.h = Math.sin(th) * 150 * s; o.lie = u; }
    else { o.x = f.x + f.face * 14 * s; o.z = f.z + .002; o.h = Math.sin(u * Math.PI / 2) * 150 * s; o.lie = u; } // lifted up over the head
    if (a.t < a.hitAt || a.done) { if (a.t >= a.dur) f.atk = null; return; }
    a.done = true; o.heldBy = null; o.lie = 0;
    if (a.kind === 'whip') { // 🔁 Irish whip: sent running into the ropes
      o.whip = f.face; o.whipBy = f; o.stun = 0; word('IRISH WHIP!', o.x, zY(o.z) - 190 * S(o), '#9fd6ff', 34); snd('whoosh'); return;
    }
    if (a.kind === 'toss') { // ⬆️ over the top rope?
      const d = sideOf(o); o.x = clamp(o.x, ...bounds(o.z));
      if (tryOver(o, f, d)) return;
      o.h = 0; o.stun = .5; o.x += -d * 30 * S(o); word(pick(['HANGS ON!', 'GRABS THE ROPE!', 'NOT OVER!']), o.x, zY(o.z) - 210 * S(o), '#9fffb0', 34); snd('crowd', { v: .7 }); return;
    }
    o.h = 0; if (a.kind === 'suplex') { o.x = f.x - f.face * 50 * s; f.down = .45; }
    o.x = clamp(o.x, ...bounds(o.z));
    dust(o.x, o.z, 12); snd('slam'); word(a.kind === 'slam' ? 'BODY SLAM!' : 'SUPLEX!', o.x, zY(o.z) - 160 * S(o), '#ffd23a', 46);
    damage(f, o, (a.kind === 'slam' ? rr(11, 16) : rr(13, 19)) * paceBoost() * (T > D * 1.35 ? 2 : 1), a.kind);
    if (o.alive) o.down = Math.max(o.down, a.kind === 'slam' ? 1.2 : 1.4);
  }
  // 🤼 can this pack be thrown over the top rope? (the more hurt it is, the easier; the fair winner always fights it off)
  function tryOver(o, f, d) {
    if (!o.alive) return false;
    if (o.id === destined) {
      word('REVERSAL!', o.x, zY(o.z) - 220 * S(o), '#ffe08a', 44); snd('crowd', { v: .8 });
      if (f && f.alive && f !== o && !f.heldBy) { if (f.atk?.o) f.atk.o.heldBy = null; f.atk = null; f.down = 0; f.whip = d; f.whipBy = o; } // …and sends the thrower into the ropes instead
      return false;
    }
    let ch = (.05 + (1 - clamp(o.hp, 0, 100) / 100) * .75) * paceBoost(); if (o.hp <= 0) ch = .95; if (T > D * 1.6) ch = Math.max(ch, .6);
    if (R() < ch && !(R() < paceHold(alive().length))) { ko(o, f, false, d); return true; }
    return false;
  }
  function rumbleState(f, dt) {
    if (f.heldBy) { if (!f.heldBy.alive || f.heldBy.atk?.o !== f) { f.heldBy = null; f.lie = 0; return false; } return true; } // (the one holding it moves it)
    if (f.down > 0) { f.down -= dt; f.atk = null; if (f.down <= 0) { f.down = 0; f.stun = .3; } physics(f, dt); return true; }
    if (f.whip) {
      const d = f.whip; f.vx = d * 560 * speedK() * (crazy() ? 1.4 : 1); f.vz = 0; f.atk = null; f.whipT = (f.whipT || 0) + dt;
      if ((d < 0 ? f.x <= ringL(f.z) + 42 : f.x >= ringR(f.z) - 42) || f.whipT > 2.5) { f.whipT = 0; f.whip = 0; snd('punch');
        if (!tryOver(f, f.whipBy, d)) { f.vx = -d * 520 * speedK(); f.rebound = .8; word('OFF THE ROPES!', f.x, zY(f.z) - 200 * S(f), '#fff', 30); } }
      physics(f, dt); return true;
    }
    if (f.rebound > 0) {
      f.rebound -= dt; f.vx = Math.sign(f.vx || 1) * 520 * speedK(); f.vz = 0; f.atk = null;
      const by = f.whipBy;
      if (by?.alive && !by.atk && !by.heldBy && !(by.down > 0) && !by.whip && by.stun <= 0 && Math.abs(by.z - f.z) < .08 && Math.abs(by.x - f.x) < 95 * S(by)) { // 💥 CLOTHESLINE on the way back
        by.face = Math.sign(f.x - by.x) || 1; by.atk = { kind: 'clothes', t: 0, dur: .45, hitAt: 0, done: true }; f.rebound = 0; f.vx = 0; hit(by, f, 'clothes');
      }
      if (f.rebound <= 0) f.stun = Math.max(f.stun, .2);
      physics(f, dt); return true;
    }
    return false;
  }
  function hit(f, o, kind) {
    let dmg = { punch: rr(7, 11), kick: rr(10, 15), jump: rr(14, 21), head: rr(6, 9), clothes: rr(13, 18), elbow: rr(12, 18), bolt: rr(8, 12), shot: rr(9, 14) }[kind];
    if (f.weapon && kind !== 'clothes' && kind !== 'elbow' && kind !== 'bolt' && kind !== 'shot') dmg *= WSTAT[f.weapon]?.d || 2.4; // 🗡️ weapons (and steel chairs) hit much harder
    if (scene.wacky.rage) dmg *= 1 + (1 - f.hp / 100) * 1.2;
    dmg *= (T > D * 1.35 ? 4 : T > D ? 2 : 1) * paceBoost();
    if (pirKeep(f)) dmg *= 1.7; // 🏴‍☠️ the smaller crew makes a last stand: hits harder
    const blocked = o.block > 0 && o.face === -f.face;
    if (blocked) { dmg *= .2; word('BLOCK!', o.x, zY(o.z) - 160 * S(o), '#9fd6ff', 30); snd('clash'); o.vx += f.face * 120; return damage(f, o, dmg, kind, true); }
    if (scene.wacky.onehit) dmg = 999;
    if (o.atk?.o) o.atk.o.heldBy = null; // (a hit breaks the hold)
    o.vx += (kind === 'bolt' || kind === 'shot' ? Math.sign(o.x - f.x) || f.face : f.face) * (160 + dmg * 14) * (scene.wacky.lowgrav ? 1.6 : 1) * (RUMBLE() && !crazy() ? .45 : 1); // (the ring keeps it real unless a wacky setting is on) if (scene.wacky.lowgrav || kind === 'jump') o.vh = Math.max(o.vh, scene.wacky.lowgrav ? 260 + dmg * 12 : 160);
    o.stun = (.22 + Math.min(.5, dmg / 60)) * (pirKeep(o) ? .35 : 1); o.atk = null; o.hurtT = .3; // (🏴‍☠️ …and shrugs hits off quicker)
    const sx = o.x - f.face * 18 * S(o), sy = zY(o.z) - o.h - (60 + R() * 70) * S(o);
    o.lastBy = f;
    const WR = { jump: 'DROPKICK!', clothes: 'CLOTHESLINE!', elbow: 'ELBOW DROP!' }, big = kind === 'jump' || kind === 'clothes' || kind === 'elbow';
    word(kind === 'shot' ? pick(['BANG!', 'HIT!', 'BLAM!', 'POW!']) : kind === 'bolt' ? pick(['ZAP!', 'FWOOSH!', 'ZING!']) : PIR() && Math.random() < .22 ? pick(['ARRR!', 'YARRR!', 'AVAST!', 'TAKE THAT!', 'SCALLYWAG!', 'BILGE RAT!']) : f.weapon && !WR[kind] ? (WSTAT[f.weapon]?.w || 'THWACK!') : RUMBLE() && WR[kind] ? WR[kind] : pickW(kind), sx, sy - 40, big ? '#ffd23a' : '#fff', big ? 46 : 36);
    if (PIR() && onPlank(o.x, o.z) && R() < .35) o.vz += rr(-.5, .5); // (🪵 a hit on a gangplank can knock you off the side)
    sparks(sx, sy); snd(kind === 'shot' ? 'bonk' : kind === 'bolt' ? 'zap' : f.weapon && WSTAT[f.weapon]?.sharp && !WR[kind] ? 'chop' : f.weapon === 'chair' && !WR[kind] ? 'chair' : kind === 'clothes' || kind === 'elbow' ? 'slam' : kind === 'kick' || kind === 'jump' ? 'kick' : 'punch');
    if (RUMBLE() && big) snd('crowd', { v: .6 });
    if (!MI().armed && o.weapon && !f.weapon && R() < .3) { f.weapon = o.weapon; o.weapon = null; word('STOLEN!', f.x, zY(f.z) - 200 * S(f), '#ffe08a', 40); snd('clash'); } // knocked loose and grabbed
    if (kind === 'jump' && !RUMBLE()) snd('hyah');
    damage(f, o, dmg, kind);
    if ((kind === 'clothes' || kind === 'elbow') && o.alive) { o.down = Math.max(o.down, kind === 'clothes' ? 1.5 : 1.1); o.vx *= .3; }
  }
  const W_P = ['POW!', 'BAM!', 'WHAM!', 'HYAH!', 'SMACK!'], W_K = ['KAPOW!', 'WHACK!', 'CRACK!', 'HI-YAH!'];
  const pickW = k => (k === 'punch' || k === 'head' ? W_P : W_K)[Math.floor(Math.random() * (k === 'punch' ? 5 : 4))];
  function damage(f, o, dmg, kind, soft) {
    if (!o.alive) return;
    const keep = o.id === destined, gore = !!scene.wacky.gore;
    o.hp -= dmg; if (keep) o.hp = Math.max(8, o.hp); // (the fair winner is drawn at the start; it gets hurt but stays up)
    const s = S(o), bx = o.x, by = zY(o.z) - o.h - 80 * s;
    if (!soft) onHit(bx, by, dmg); // 🎥
    if (!soft && kind !== 'bleed') {
      blood(bx, by, o.z, Math.round(dmg * (gore ? 2.4 : .9)), f ? f.face : 0, gore ? 1.5 : 1);
      if (o.stains.length < 14) o.stains.push({ x: Math.random(), y: Math.random() * .9 + .05, r: .06 + Math.random() * .1 * (gore ? 1.6 : 1) });
      if (gore && !keep && dmg >= 10 && R() < .16) loseLimb(o, f);
    }
    if (RUMBLE()) { // 🤼 nobody is knocked out in the ring: at 0 health they go down (and go over the top rope easily)
      if (o.hp <= 0) { o.hp = 0; if (!(o.down > 0) && !o.heldBy && !o.whip) { o.down = 1.8; o.atk = null; if (kind !== 'bleed') word(pick(['DOWN!', 'HE\'S HURT!', 'STAY DOWN!']), o.x, zY(o.z) - 200 * s, '#ff8a5a', 40); } }
      if (gore && !keep && o.hp < 25 && !soft && kind !== 'bleed' && R() < .07) ko(o, f, true);
      return;
    }
    if (o.hp <= 0 && !keep && kind !== 'bleed' && kind !== 'storm' && R() < paceHold(alive().length)) { o.hp = rr(4, 10); if (R() < .5) word(pick(['STILL STANDING!', 'NOT YET!', 'HANGING ON!']), o.x, zY(o.z) - 210 * s, '#9fffb0', 34); } // ⏳ too many out too fast: hangs on
    if (o.hp <= 0 && pirKeep(o)) { o.hp = rr(6, 12); if (Math.random() < .4) word(pick(['NOT TODAY!', 'STILL STANDING!', 'ARRR, NOT YET!']), o.x, zY(o.z) - 210 * s, '#9fffb0', 34); } // 🏴‍☠️ (the smaller crew hangs on: the crews stay even)
    if (o.hp <= 0) ko(o, f, gore && !keep && R() < .55);
    else if (gore && !keep && o.hp < 25 && !soft && R() < .07 && !pirKeep(o)) ko(o, f, true);
  }
  function loseLimb(o, f) {
    const have = Object.keys(o.limbs).filter(k => o.limbs[k]); if (!have.length) return;
    const k = have[Math.floor(R() * have.length)]; o.limbs[k] = 0;
    const s = S(o), arm = k[1] === 'a', side = k[0] === 'l' ? -1 : 1;
    flyers.push({ kind: arm ? 'arm' : 'leg', x: o.x + side * 34 * s, y: zY(o.z) - o.h - (arm ? 70 : 20) * s, gz: o.z, vx: (f ? f.face : side) * vr(150, 380), vy: -vr(300, 560), rot: 0, vrot: vr(-14, 14), s, rest: false, blood: 1.2 });
    blood(o.x + side * 30 * s, zY(o.z) - o.h - (arm ? 70 : 20) * s, o.z, 26, f ? f.face : side, 1.7);
    word(arm ? 'ARM OFF!' : 'LEG OFF!', o.x, zY(o.z) - 210 * s, '#ff4a4a', 40); snd('chop');
  }
  function ko(o, f, decap, over, fall) {
    if (PIR() && !finalPair && !pirForce && (o.id === destined || pirKeep(o))) { o.hp = Math.max(o.hp, 6); return; } // 🏴‍☠️ (the crews stay even: it always comes down to one pirate from each)
    if (finCan(o)) { const w = finalPair.find(x => x !== o); if (w) return startFinisher(o, w); } // 💀 the final K.O. staggers them instead: FINISHER time
    if (o.atk?.o) o.atk.o.heldBy = null; if (o.heldBy) { o.heldBy.atk = null; o.heldBy = null; }
    o.alive = false; o.hp = 0; o.koT = 0; o.atk = null; o.down = 0; o.whip = 0; o.rebound = 0; o.lie = 0; o.swing = null; order.push(o.id); crewC = null;
    if (over) { o.out = true; const k = crazy() ? 2 : 1; o.vx = over * rr(260, 340) * k * (scene.wacky.lowgrav ? 1.4 : 1); o.vh = rr(440, 520) * (crazy() ? 1.25 : 1); o.h = Math.max(o.h, 30); } // ⬆️ up and over the top rope, down to the floor
    else if (fall) { o.falling = true; o.vh = Math.min(o.vh, 0); o.vx *= .3; o.vz = 0; } // 🕳️ down through the platform
    else o.vx += (f ? f.face : vr(-1, 1)) * 260;
    onKO(o); lastKO = T; if (o.weapon && !MI().armed) { weapons.push({ kind: o.weapon, x: o.x, z: o.z, h: 60, vh: 200 }); o.weapon = null; } // the weapon drops for someone else
    if (alive().length === 2 && !showdownSaid) { showdownSaid = true;
      if (scene.finalFight) startFinal(); else { toast('🥊 FINAL SHOWDOWN!'); bell(); } }
    const s = S(o);
    if (decap) { // 🩸 the face comes off (the top of the pack)
      o.head = false;
      flyers.push({ kind: 'head', f: o, x: o.x, y: zY(o.z) - o.h - 150 * s, gz: o.z, vx: (f ? f.face : 1) * vr(220, 480), vy: -vr(500, 800), rot: 0, vrot: vr(-10, 10), s, rest: false, blood: 2 });
      blood(o.x, zY(o.z) - o.h - 120 * s, o.z, 60, f ? f.face : 0, 2.2); word('HEADLESS!', o.x, zY(o.z) - 240 * s, '#ff3030', 58); snd('chop'); snd('splat');
    } else if (fall) { word(PIR() ? pick(['OVERBOARD!', 'MAN OVERBOARD!', 'SPLASH!', 'SWIM FOR IT!']) : pick(['FELL!', 'INTO THE VOID!', 'GONE!']), o.x, zY(o.z) - 200 * s, PIR() ? '#9fe0ff' : '#d6a8ff', 54); snd('whoosh'); }
    else if (over) { word(pick(['ELIMINATED!', 'OVER THE TOP!', 'GONE!']), o.x, zY(o.z) - 220 * s, '#ff5a5a', 56); snd('crowd'); snd('whoosh'); }
    else if (o.zapT === T) { word(pick(['ZAPPED!', 'FRIED!', 'SHOCKING!', 'STRUCK DOWN!']), o.x, zY(o.z) - 200 * s, '#fff27a', 56); snd('zap'); } // ⚡ (chat's lightning)
    else { word(pick(['K.O.!', 'DOWN!', 'FINISHED!']), o.x, zY(o.z) - 200 * s, '#ff5a5a', 52); snd('splat'); }
    if (!over && !fall) snd('fall'); if (fall) snd('fall');
    if (scene.wacky.boom) { // 💣 it explodes
      for (let i = 0; i < 40; i++) parts.push({ x: o.x, y: zY(o.z) - 60 * s, vx: vr(-600, 600), vy: vr(-700, -100), g: 900, life: vr(.4, 1), max: 1, size: vr(5, 12), color: ['#ffcf4a', '#ff7a2a', '#fff2a0', '#5a3a2a'][Math.floor(Math.random() * 4)], gz: null });
      snd('boom'); word('BOOM!', o.x, zY(o.z) - 140 * s, '#ffb02a', 64);
      for (const n of F) if (n.alive && n !== o && Math.abs(n.x - o.x) < 170 * s && Math.abs(n.z - o.z) < .15) { n.vx += Math.sign(n.x - o.x || 1) * 520; n.vh = 300; damage(null, n, 16, 'boom'); }
    }
    if (alive().length === 1) slowUntil = T + 1.4;
  }
  function startFinal() { // 🥊 FINAL FIGHT (maps that have one): the clock stops, the last two face off across the street with a weapon each, a bell, then a timed fight
    const [a, b] = alive(); finalPair = [a, b]; mode = 'final'; modeT = 0; finalCam();
    const kinds = MI().weapons, k1 = Math.floor(R() * Math.max(1, kinds.length));
    if (WIZ()) { tiles.forEach(t => { t.hp = 2; t.fallT = 0; }); bolts = []; zaps = []; word('THE PLATFORM REBUILDS!', W / 2, 600, '#d6a8ff', 50); } // 🧙 a whole platform for the duel
    cg.clearRect(0, 0, W, H); // (1.61.4, Derek: the broken ground is fixed (craters gone, fallen tiles back), the blood where the ground didn't fall stays)
    weapons = [];
    if (PIR()) return pirFinal(a, b); // 🐙 the kraken drags one ship under, the last two face off on the other one
    for (const [f, x, face, k] of [[a, W * .4, 1, kinds[k1]], [b, W * .6, -1, kinds[(k1 + 1 + Math.floor(R() * 2)) % kinds.length]]]) { puff(f, '#ffd23a'); Object.assign(f, { x, z: .55, h: 0, vx: 0, vz: 0, vh: 0, face, atk: null, stun: 0, block: 0, weapon: MI().armed ? f.weapon : k || null, target: f === a ? b : a, down: 0, heldBy: null, lie: 0, whip: 0, rebound: 0 }); puff(f, '#ffd23a'); }
    bell();
  }
  function physics(f, dt) {
    const slip = scene.wacky.slippery;
    if (f.falling) { if (PIR()) return pirSink(f, dt); if (f.h > -1400) { f.vh -= grav() * dt; f.h += f.vh * dt; f.x += f.vx * dt; } f.koT += dt; return; } // 🕳️ falling away below the platform
    const px = f.x, pz = f.z;
    f.x += f.vx * dt; f.z = clamp(f.z + f.vz * dt, PIR() ? PZ0 : 0, PIR() ? PZ1 : 1);
    const fr = f.h > 0 ? .995 : slip ? .985 : .86; f.vx *= Math.pow(fr, dt * 60); f.vz *= Math.pow(slip ? .97 : .8, dt * 60);
    const gl = gnd(f);
    if (f.h > gl || f.vh > 0) { f.h += f.vh * dt; f.vh -= grav() * dt; if (f.h <= gl) { const hard = f.vh < -450; f.h = gl; f.vh = 0; if (f.atk?.kind === 'jump' || f.atk?.kind === 'elbow') f.atk = null; dust(f.x, f.z, 5); if (hard && f.out) { snd('slam'); dust(f.x, f.z, 10); } } }
    if (f.out && f.h === 0 && !gl) f.vx = Math.sign(f.vx || 1) * Math.max(Math.abs(f.vx), 220); // (still on the edge of the mat: keeps going over)
    if (slip && f.alive && f.h === 0 && Math.abs(f.vx) > 160 && R() < .004) { f.stun = .9; word('SLIP!', f.x, zY(f.z) - 150 * S(f), '#bfefff', 30); snd('bonk'); }
    if (f.out) f.x = clamp(f.x, 30, W - 30);
    else { const [lo, hi] = bounds(f.z), bk = RUMBLE() ? .6 : .4; if (RUMBLE()) f.z = clamp(f.z, .04, .96); // (the ring ropes bounce you back in)
      if (f.x < lo) { f.x = lo; f.vx = Math.abs(f.vx) * bk; } if (f.x > hi) { f.x = hi; f.vx = -Math.abs(f.vx) * bk; } }
    if (WIZ() && (mode === 'fight' || mode === 'final') && f.h <= 0 && !solid(f.x, f.z)) { // 🧙 a hole or the edge: walking stops there; knocked into it (or the floor goes) = falls
      if (f.alive && !(f.stun > 0) && solid(px, pz)) { f.x = px; f.z = pz; f.vx = 0; f.vz = 0; }
      else if (f.alive) fallCheck(f); else { f.falling = true; f.vh = 0; }
    }
    if (PIR() && (mode === 'fight' || mode === 'final') && f.h <= 0 && !f.swing && !onDeck(f.x, f.z)) { // 🏴‍☠️ the edge of a deck: walking stops there (slides along it); knocked over it = into the sea
      if (f.alive && !(f.stun > 0) && onDeck(px, pz)) { if (onDeck(f.x, pz)) { f.z = pz; f.vz = 0; } else if (onDeck(px, f.z)) { f.x = px; f.vx = 0; } else { f.x = px; f.z = pz; f.vx = 0; f.vz = 0; } }
      else if (f.alive) pirOver(f); else if (!f.wreck) { f.falling = true; f.vh = 0; }
    }
    if (!f.alive) f.koT += dt;
  }
  function finish(w, quick) {
    winner = w; mode = 'won'; modeT = 0; slowUntil = T + 1.2;
    if (!quick && rbuf.length > 60) { mode = 'over'; setTimeout(() => { if (winner !== w || mode !== 'over') return; replay = { frames: rbuf.slice(-180), i: 0 }; mode = 'replay'; modeT = 0; }, 1800); } // ⏪ then the replay of the last moments
    else setTimeout(() => snd('fanfare'), 600);
    bell(); if (RUMBLE()) snd('crowd'); if (scene.show) SFX.music?.(null);
    if (!sent && !PREVIEW_WIN) { sent = true; setTimeout(() => send({ type: 'cardResult', fightId, winnerId: w.id, order: [w.id, ...order.slice().reverse()] }), 1800); }
  }


  // ---------- 💀 FINISHERS + 🏆 CELEBRATIONS (Derek, 1.51.0) ----------
  // On a map with a FINAL FIGHT, the hit that would knock the loser out staggers them instead (💀 FINAL BLOW!), the winner
  // does a finisher (20 per map, some brutal, some silly: public/finishers.js), its name shows, the REPLAY is the finisher
  // again in slow motion, then the winner does a celebration that fits the map (10 per map), then the winner screen.
  // The server picks which one from a shuffled pile (each one once before any repeats) so every screen plays the same one.
  const FIN = { on: false };
  function finTest(m) { // 🧪 Test tab: two packs, straight to the stagger + finisher (+ celebration) of your choice
    const map = m.map || 'kungfu', pirates = map === 'pirates'; scene = { ...scene, show: true, phase: 'fight', map, finalFight: true, fin: Number.isInteger(m.fin) ? m.fin : null, cel: Number.isInteger(m.cel) ? m.cel : null, wacky: scene.wacky || {}, ...(pirates ? { chars: true, lookSeed: scene.lookSeed || 'fin' + Math.floor(Math.random() * 1e6) } : {}) };
    layer.classList.remove('hidden'); SFX.setMap?.('card-' + map);
    const packs = m.fighters || (pirates ? [{ id: 'fa', packId: 'fa', name: 'Captain Winner', game: 'Test', image: null, char: true, gender: 'm' }, { id: 'fb', packId: 'fb', name: 'Loser Pirate', game: 'Test', image: null, char: true, gender: 'f' }] // (🏴‍☠️ characters only: two pirates, one from each crew)
      : [{ id: 'fa', packId: 'fa', name: 'Winner Pack', game: 'Test', image: null, color: '#e8b830' }, { id: 'fb', packId: 'fb', name: 'Loser Pack', game: 'Test', image: null, color: '#5a8aff' }]);
    R = Math.random; fightId = 'fintest-' + Date.now(); destined = packs[0].id; order = []; winner = null; sent = true; F = makeFighters(packs); parts = []; texts = []; flyers = []; weapons = []; fg.clearRect(0, 0, W, H); cg.clearRect(0, 0, W, H);
    const [a, b] = F; Object.assign(a, { x: W * .4, z: .55, face: 1, weapon: MI().armed ? a.weapon : (MI().weapons[0] || null) }); Object.assign(b, { x: W * .6, z: .55, face: -1, hp: 5 });
    if (PIR()) { a.team = 0; b.team = 1; a.x = deckMid(0, .55) - 150; b.x = deckMid(0, .55) + 150; Object.assign(pir, { safe: 0, sunk: 1, planks: false, kr: null }); } // (after the kraken: only the red ship is left)
    finalPair = [a, b]; showdownSaid = true; mode = 'fight'; finalLeft = 10; FIN.on = false; Object.assign(cine, { rot: 0, quake: 0, punch: null, hit: null, saved: null, from: null, end: null });
    if (!running) { running = true; requestAnimationFrame(frame); }
    startFinisher(b, a);
  }
  const finLib = (kind, map = scene.map) => ((window.ROYAL_FINISHERS || {})[map] || {})[kind] || [];
  const STAG = 2.4, NAME_T = 2.2, REPLAY_K = .6;
  function finCan(o) { return scene.show && scene.finalFight && finalPair && finalPair.includes(o) && alive().length === 2 && mode === 'fight' && !FIN.on && finLib('fin').length; }
  function startFinisher(L, Wn) {
    const fins = finLib('fin'), cels = finLib('cel');
    const fi = Number.isInteger(scene.fin) ? scene.fin % fins.length : Math.floor(Math.random() * fins.length), ci = Number.isInteger(scene.cel) ? scene.cel % Math.max(1, cels.length) : Math.floor(Math.random() * Math.max(1, cels.length));
    const dir = Wn.x <= L.x ? 1 : -1, cx = PIR() && pir?.safe != null ? deckMid(pir.safe, .55) : clamp((Wn.x + L.x) / 2, 520, W - 520); // (🏴‍☠️ in the middle of the ship that's left)
    for (const f of [L, Wn]) Object.assign(f, { vx: 0, vz: 0, vh: 0, atk: null, stun: 0, block: 0, down: 0, heldBy: null, lie: 0, whip: 0, rebound: 0, falling: false, out: false, h: 0, z: .55, alive: true, hp: Math.max(1, f.hp) });
    Object.assign(FIN, { on: true, phase: 'stagger', t: 0, L, W: Wn, dir, fin: fins[fi], cel: cels[ci] || null, Lx0: L.x, Wx0: Wn.x, Lx: cx + dir * 135, Wx: cx - dir * 135, fired: new Set(), snap: { limbs: { ...L.limbs }, head: L.head }, camHint: null, end: null });
    if (WIZ()) tiles.forEach(t => { t.hp = 2; t.fallT = 0; }); crewC = null; // (solid ground under both)
    winner = Wn; order.push(L.id); finalLeft = 0; mode = 'finisher'; modeT = 0; slowUntil = 0;
    word('💫 STAGGERED!', L.x, zY(L.z) - 260 * S(L), '#ffd23a', 50); snd('slowhit'); snd(RUMBLE() ? 'crowd' : 'gong'); quake(10);
    if (!sent && !PREVIEW_WIN) { sent = true; setTimeout(() => send({ type: 'cardResult', fightId, winnerId: Wn.id, order: [Wn.id, ...order.slice().reverse()] }), 1800); }
  }
  const blankPose = (f, x, face) => ({ x, h: 0, face, atk: null, rot: 0, sx: 1, sy: 1, hide: false, filter: '', alpha: 1, split: 0, splitV: true, dazed: false, oy: 0, lost: new Set(), noHead: false, walk: false });
  function finApi(t, dur, live) { // the toolbox every finisher / celebration uses (t = seconds into it)
    const L = FIN.L, Wf = FIN.W, s = S(L), gy = zY(L.z), dir = FIN.dir;
    const P = { W: blankPose(Wf, FIN.Wx, dir), L: blankPose(L, FIN.Lx, -dir) }; P.L.dazed = true;
    let n = 0; const once = (t0, fn) => { const k = n++; if (live !== false && t >= t0 && !FIN.fired.has(k)) { FIN.fired.add(k); try { fn(); } catch (e) { console.warn(e); } } };
    const u = (t0, t1) => clamp((t - t0) / Math.max(1e-6, t1 - t0), 0, 1), e = x => x < .5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2, inw = (t0, t1) => t >= t0 && t < t1;
    const body = who => { const p = who === 'W' ? P.W : P.L; return [p.x, gy - p.h - 70 * s]; }, headAt = () => { const p = P.L; return [p.x, gy - p.h - 128 * s * p.sy]; };
    const props = [], back = [];
    const A = { t, dur, s, gy, dir, P, Wf, Lf: L, g, map: scene.map, W, H, Lx: FIN.Lx, Wx: FIN.Wx, u, e, in: inw, body, headAt, vr, pick, clamp,
      at: once,
      say: (t0, txt, col = '#ffd23a', size = 60, x, y) => once(t0, () => word(txt, x ?? P.L.x, y ?? gy - 290 * s, col, size)),
      snd: (t0, name, o) => once(t0, () => { if (scene.show) SFX.play(name, o); }),
      quake: (t0, q = 12) => once(t0, () => quake(q)),
      flash: (t0, col = '#fff', a = .8) => once(t0, () => { FIN.flash = { col, a, t: performance.now() }; }),
      walk: (t0, t1, gap = 120) => { const k = e(u(t0, t1)); if (t >= t0) { P.W.x = FIN.Wx + ((FIN.Lx - dir * gap) - FIN.Wx) * k; if (t < t1) P.W.walk = true; } FIN.wGap = t >= t1 ? gap : FIN.wGap; },
      stay: gap => { P.W.x = FIN.Lx - dir * gap; },
      strike: (t0, kind = 'punch', d = .32, fx = 'hit') => { if (inw(t0, t0 + d)) P.W.atk = { kind, t: t - t0, dur: d }; once(t0 + d * .5, () => A.fxHit(fx)); },
      combo: (t0, t1, every = .16, kinds = ['punch', 'kick'], fx = 'hit') => { for (let i = 0, tt = t0; tt < t1; i++, tt += every) A.strike(tt, kinds[i % kinds.length], every * .95, fx); if (inw(t0, t1 + .2)) P.L.rot += Math.sin(t * 40) * .06; },
      fxHit: fx => { if (typeof fx === 'function') return fx(); if (fx === 'none') return; const [x, y] = body('L'); sparks(x - dir * 20, y); snd(pick(['punch', 'kick', 'smack'])); quake(fx === 'big' ? 14 : 5); if (fx === 'big' || fx === 'blood') blood(x, y, L.z, fx === 'big' ? 30 : 14, dir, 1.4); if (fx === 'star') word(pick(['BONK!', 'POW!', 'BOP!', 'WHAP!', 'BOING!']), x, y - 120 * s, '#7dd3fc', 44); },
      jolt: (t0, k = 30) => { const v = u(t0, t0 + .25); if (t >= t0 && v < 1) P.L.x += dir * k * Math.sin(v * Math.PI); },
      pose: (t0, t1, fn) => { if (t >= t0) fn(e(u(t0, t1)), P.W, P.L, u(t0, t1)); },
      fly: (who, t0, t1, dx, peak, spins = 0, dy = 0) => { if (t < t0) return; const v = u(t0, t1), p = P[who]; p.x += dx * v; p.h += -dy * v + peak * 4 * v * (1 - v) * (v < 1 ? 1 : 0); p.rot += spins * Math.PI * 2 * v * (p === P.L ? dir : 1); },
      hold: (t0, t1) => { if (!inw(t0, t1)) return; P.W.atk = { kind: 'hold', o: true, t: 0, dur: 1 }; P.L.x = P.W.x; P.L.h = 175 * s; P.L.rot = dir * Math.PI / 2; P.L.dazed = false; },
      lose: (t0, k = 'any') => { const have = ['la', 'ra', 'll', 'rl'].filter(x => FIN.snap.limbs[x]); const kk = k === 'any' ? have[(n * 7) % Math.max(1, have.length)] : k; const id = n; if (t >= t0 && kk) P.L.lost.add(kk); once(t0, () => { if (!kk) return; const arm = kk[1] === 'a', side = kk[0] === 'l' ? -1 : 1, [x, y] = body('L'); flyers.push({ kind: arm ? 'arm' : 'leg', x: x + side * 34 * s, y: y + (arm ? -10 : 50) * s, gz: L.z, vx: dir * vr(150, 420), vy: -vr(300, 620), rot: 0, vrot: vr(-14, 14), s, rest: false, blood: 1.2 }); blood(x, y, L.z, 26, dir, 1.6); snd('chop'); }); },
      decap: (t0, vx = 1) => { if (t >= t0) P.L.noHead = true; once(t0, () => { const [x, y] = headAt(); flyers.push({ kind: 'head', f: L, x, y: y + 30 * s, gz: L.z, vx: dir * vx * vr(220, 480), vy: -vr(500, 820), rot: 0, vrot: vr(-10, 10), s, rest: false, blood: 2 }); blood(x, y + 20 * s, L.z, 60, dir, 2.2); snd('chop'); snd('splat'); }); },
      gib: (t0, cols) => { if (t >= t0) P.L.hide = true; once(t0, () => { const [x, y] = body('L'); for (const k of ['la', 'ra', 'll', 'rl']) if (FIN.snap.limbs[k]) flyers.push({ kind: k[1] === 'a' ? 'arm' : 'leg', x: x + vr(-30, 30), y: y + vr(-30, 30), gz: L.z, vx: vr(-520, 520), vy: -vr(400, 900), rot: 0, vrot: vr(-18, 18), s, rest: false, blood: 1.5 }); if (FIN.snap.head) flyers.push({ kind: 'head', f: L, x, y: y - 50 * s, gz: L.z, vx: vr(-400, 400), vy: -vr(700, 1000), rot: 0, vrot: vr(-12, 12), s, rest: false, blood: 2 });
        if (cols) A.burstNow(x, y, 120, cols, 900, 900, 7); else blood(x, y, L.z, 140, 0, 3); quake(22); snd('splat'); snd('boom'); }); },
      poof: (t0, col = '#fff') => { if (t >= t0) P.L.hide = true; once(t0, () => { const [x, y] = body('L'); A.burstNow(x, y, 60, [col, '#ddd', '#bbb'], 420, 0, 9, true); snd('pop'); }); },
      hide: t0 => { if (t >= t0) P.L.hide = true; },
      filter: (t0, css, who = 'L') => { if (t >= t0) P[who].filter = css; },
      split: (t0, t1, dist = 120, vertical = true) => { if (t >= t0) { P.L.split = dist * e(u(t0, t1)); P.L.splitV = vertical; P.L.dazed = false; } once(t0, () => { const [x, y] = body('L'); blood(x, y, L.z, 50, 0, 1.8); snd('chop'); }); },
      boom: (t0, x, y, size = 1) => once(t0, () => { const [bx, by] = body('L'); x ??= bx; y ??= by; A.burstNow(x, y, 70 * size, ['#ffd23a', '#ff8a1a', '#ff3a1a', '#fff2a0'], 700 * size, 300, 9 * size); A.burstNow(x, y, 40 * size, ['#555', '#777', '#333'], 300 * size, -60, 14 * size, true); quake(18 * size); FIN.flash = { col: '#ffe9b0', a: .7, t: performance.now() }; snd('boom'); }),
      blood: (t0, cnt = 30, x, y, d = dir, spread = 1.5) => once(t0, () => { const [bx, by] = body('L'); blood(x ?? bx, y ?? by, L.z, cnt, d, spread); snd('splat'); }),
      burstNow: (x, y, cnt, cols, sp = 500, gr = 900, size = 6, dust = false) => { const cap = GFX.particles === 'few' ? 160 : GFX.particles === 'lots' ? 4000 : GFX.quality === 'low' ? 200 : 1200; for (let i = 0; i < cnt && parts.length < cap; i++) { const a = vr(0, Math.PI * 2), v = vr(.25, 1) * sp; parts.push({ x: x + vr(-10, 10), y: y + vr(-10, 10), vx: Math.cos(a) * v, vy: Math.sin(a) * v - sp * .35, g: gr, life: dust ? vr(.8, 1.8) : vr(1.2, 2.6), max: dust ? 1.8 : 2.6, size: vr(.5, 1) * size, color: pick(cols), dust }); } },
      burst: (t0, x, y, cnt, cols, sp, gr, size, dust) => once(t0, () => A.burstNow(x, y, cnt, cols, sp, gr, size, dust)),
      confetti: (t0, x, y, cnt = 90) => once(t0, () => { const [bx, by] = body('W'); A.burstNow(x ?? bx, y ?? by - 120 * s, cnt, ['#ff4a6a', '#ffd23a', '#4ad0ff', '#6aff7a', '#c77dff', '#fff'], 650, 500, 6); snd('confettiPop'); }),
      sparks: (t0, x, y) => once(t0, () => sparks(x, y)),
      stain: (t0, x, r = 40, col = 'rgba(120,0,10,.55)') => once(t0, () => stamp(x ?? P.L.x, gy, r, col)),
      prop: (t0, t1, fn, behind = false) => { if (inw(t0, t1)) (behind ? back : props).push(() => fn(u(t0, t1), g, A)); },
      emoji: (t0, t1, ch, x, y, size = 80, rot = 0, alpha = 1, behind = false) => A.prop(t0, t1, v => { g.save(); g.globalAlpha = alpha; g.translate(typeof x === 'function' ? x(v) : x, typeof y === 'function' ? y(v) : y); g.rotate(typeof rot === 'function' ? rot(v) : rot); g.fillStyle = '#000'; g.font = `${typeof size === 'function' ? size(v) : size}px 'Segoe UI Emoji','Apple Color Emoji','Noto Color Emoji',sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(ch, 0, 0); g.restore(); }, behind),
      cam: (z, x, y) => { FIN.camHint = { z, x: x ?? (P.W.x + P.L.x) / 2, y: y ?? gy - 140 * s }; },
      // 🏴‍☠️ Pirate Battle: the deck's edge past the loser, the water's height there, a splash, the two crews' colours
      edge: PIR() ? (dir > 0 ? deckHi(pir?.safe ?? 0, L.z) : deckLo(pir?.safe ?? 0, L.z)) : dir > 0 ? W - 80 : 80, edge2: PIR() ? (dir > 0 ? deckLo(pir?.safe ?? 0, L.z) : deckHi(pir?.safe ?? 0, L.z)) : dir > 0 ? 80 : W - 80, water: gy + (PIR() ? FREE(L.z) : 120), // (edge2 = the other side, behind the winner)
      splash: (t0, x, k = 1) => once(t0, () => { if (PIR()) pirSplash(x ?? P.L.x, L.z, k); else { A.burstNow(x ?? P.L.x, gy, 30 * k, ['#e8f8ff', '#8ad0f0'], 500, 1200, 6); snd('splash'); } }),
      crewW: CREW[Wf.team] || CREW[0], crewL: CREW[L.team] || CREW[1],
      // 🏆 celebrations (the winner)
      dance: (t0, t1, k = 1) => { if (!inw(t0, t1)) return; P.W.walk = true; P.W.h += Math.abs(Math.sin(t * 7 * k)) * 26 * s; P.W.face = Math.sin(t * 2.2 * k) > 0 ? dir : -dir; P.W.rot += Math.sin(t * 7 * k) * .1; },
      spinW: (t0, t1, turns = 2) => { if (inw(t0, t1)) { const v = e(u(t0, t1)); P.W.sx = Math.cos(v * turns * Math.PI * 2); P.W.face = P.W.sx < 0 ? -dir : dir; P.W.sx = Math.abs(P.W.sx) * .9 + .1; } },
      hop: (t0, t1, height = 140, flips = 0) => { if (inw(t0, t1)) { const v = u(t0, t1); P.W.h += height * 4 * v * (1 - v); P.W.rot += flips * Math.PI * 2 * e(v) * dir; } },
      raise: (t0, t1) => { if (inw(t0, t1)) P.W.atk = { kind: 'hold', o: true, t: 0, dur: 1 }; },
      wPose: (t0, t1, kind, d = .3) => { if (inw(t0, t1)) P.W.atk = { kind, t: ((t - t0) % d), dur: d }; }
    };
    return { A, P, props, back };
  }
  function finTick(real) { // the timeline: stagger → finisher → its name → replay (slow) → celebration → winner screen
    if (!FIN.on || FIN.phase === 'done') return;
    FIN.t += real; const fdur = FIN.fin.dur || 5, cdur = FIN.cel?.dur || 5;
    if (FIN.phase === 'stagger' && FIN.t > STAG) { FIN.phase = 'act'; FIN.t = 0; FIN.fired = new Set(); }
    else if (FIN.phase === 'act' && FIN.t > fdur) { FIN.phase = 'name'; FIN.t = 0; snd(FIN.fin.tone === 'funny' ? 'bonk' : 'gong'); }
    else if (FIN.phase === 'name' && FIN.t > NAME_T) { FIN.phase = 'replay'; FIN.t = 0; FIN.fired = new Set(); flyers = flyers.filter(o => o.f !== FIN.L && !o.fin); parts = []; texts = []; snd('whoosh'); }
    else if (FIN.phase === 'replay' && FIN.t > fdur / REPLAY_K + .6) { FIN.phase = FIN.cel ? 'cel' : 'done'; FIN.t = 0; FIN.celFired = new Set(); if (FIN.cel) { snd('crowdWild'); SFX.music?.(null); } else finWon(); }
    else if (FIN.phase === 'cel' && FIN.t > cdur) { FIN.phase = 'done'; finWon(); }
  }
  function finWon() { mode = 'won'; modeT = 0; setTimeout(() => snd('fanfare'), 300); bell(); if (scene.show) SFX.music?.(null); }
  function finFrame() { // poses for this frame
    const ph = FIN.phase, fdur = FIN.fin.dur || 5;
    if (ph === 'stagger') { const r = finApi(0, fdur, false), v = Math.min(1, FIN.t / .8), k = v * v * (3 - 2 * v); r.P.L.x = FIN.Lx0 + (FIN.Lx - FIN.Lx0) * k; r.P.W.x = FIN.Wx0 + (FIN.Wx - FIN.Wx0) * k; r.P.W.walk = v < 1; r.P.W.atk = FIN.t > 1 ? { kind: 'hold', o: true, t: 0, dur: 1 } : null; return r; }
    const ft = ph === 'act' ? FIN.t : ph === 'replay' ? Math.min(fdur, FIN.t * REPLAY_K) : fdur;
    if (ph === 'replay' || ph === 'act') return run(FIN.fin, ft, true);
    const r = run(FIN.fin, fdur, false); // (the finisher's last frame: what's left of the loser stays as it ended)
    if (ph === 'cel' || ph === 'done') { r.P.W = blankPose(FIN.W, FIN.W.x, FIN.dir); r.P.W.x = FIN.endW ?? FIN.Wx; r.props.length = 0;
      if (FIN.cel) { const saved = FIN.fired; FIN.fired = FIN.celFired; const c = finApi(ph === 'cel' ? FIN.t : FIN.cel.dur || 5, FIN.cel.dur || 5, ph === 'cel'); c.P.L = r.P.L; c.P.W.x = r.P.W.x; try { FIN.cel.run(c.A.t, c.A); } catch (e) { console.warn('celebration', e); (FIN.errs ||= []).push('🏆 ' + FIN.cel.name + ': ' + e.message); } FIN.fired = saved; return { ...c, back: [...r.back, ...c.back] }; } }
    return r;
    function run(fin, t, live) { const r = finApi(t, fin.dur || 5, live); try { fin.run(t, r.A); } catch (e) { console.warn('finisher', fin.name, e); (FIN.errs ||= []).push('💀 ' + fin.name + ': ' + e.message); } if (ph === 'act' && t >= (fin.dur || 5) - .05) FIN.endW = r.P.W.x; return r; }
  }
  function drawPose(f, p, t) {
    if (p.hide) return;
    const keep = { x: f.x, h: f.h, face: f.face, atk: f.atk, alive: f.alive, koT: f.koT, limbs: f.limbs, head: f.head, down: f.down, lie: f.lie, heldBy: f.heldBy, ph: f.ph, block: f.block, hurtT: f.hurtT };
    const limbs = { ...(f === FIN.L ? FIN.snap.limbs : f.limbs) }; for (const k of p.lost) limbs[k] = 0;
    Object.assign(f, { x: p.x, h: p.h, face: p.face, atk: p.atk, alive: true, koT: 0, down: 0, lie: 0, heldBy: null, block: 0, limbs, head: f === FIN.L ? FIN.snap.head && !p.noHead : f.head });
    if (p.walk) f.ph = t * 12; if (p.dazed) { p.rot += Math.sin(t * 5) * .14; p.x += Math.sin(t * 3.1) * 8; f.x = p.x; }
    const s = S(f), ax = f.x, ay = zY(f.z) - p.h - 70 * s;
    g.save(); g.globalAlpha *= p.alpha; if (p.filter) g.filter = p.filter;
    g.translate(ax, ay); g.rotate(p.rot); g.scale(p.sx, p.sy); g.translate(-ax, -ay);
    if (p.split > 0) { for (const sd of [-1, 1]) { g.save(); g.beginPath(); if (p.splitV) g.rect(sd < 0 ? ax - 400 : ax, ay - 400, 400, 800); else g.rect(ax - 400, sd < 0 ? ay - 400 : ay - 20 * s, 800, 400); g.clip(); if (p.splitV) g.translate(sd * p.split, sd * p.split * .15); else g.translate(sd < 0 ? p.split : 0, sd < 0 ? -p.split * .3 : 0); if (sd < 0 && !p.splitV) { g.translate(ax, ay); g.rotate(p.split / 300 * FIN.dir); g.translate(-ax, -ay); } drawFighter(f); g.restore(); }
      g.fillStyle = '#a0101a'; if (p.splitV) for (const sd of [-1, 1]) g.fillRect(ax + sd * p.split - 3, ay - 110 * s, 6, 200 * s); }
    else drawFighter(f);
    g.restore();
    if (p.dazed) for (let i = 0; i < 3; i++) { const a = t * 4 + i * 2.1, hx = f.x + Math.cos(a) * 46 * s, hy = zY(f.z) - p.h - 170 * s + Math.sin(a) * 12 * s; g.fillStyle = '#000'; g.font = `${Math.round(30 * s)}px 'Segoe UI Emoji','Apple Color Emoji','Noto Color Emoji',sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(i === 1 ? '💫' : '⭐', hx, hy); }
    Object.assign(f, keep);
  }
  function finDraw(now) {
    const r = finFrame(); FIN.cur = r; const t = now / 1000;
    for (const d of r.back) { g.save(); try { d(); } catch (e) { console.warn(e); (FIN.errs ||= []).push('prop: ' + e.message); } g.restore(); }
    const pair = [[FIN.L, r.P.L], [FIN.W, r.P.W]].sort((a, b) => (a[1].h > 120 ? 1 : 0) - (b[1].h > 120 ? 1 : 0));
    for (const [f, p] of pair) drawPose(f, p, t);
    for (const d of r.props) { g.save(); try { d(); } catch (e) { console.warn(e); (FIN.errs ||= []).push('prop: ' + e.message); } g.restore(); }
  }
  function finHud(now) { // banners on top (they don't move with the camera)
    if (!FIN.on) return; const ph = FIN.phase, fin = FIN.fin;
    if (FIN.flash) { const a = FIN.flash.a * Math.max(0, 1 - (performance.now() - FIN.flash.t) / 350); if (a > 0) { g.fillStyle = FIN.flash.col; g.globalAlpha = a; g.fillRect(0, 0, W, H); g.globalAlpha = 1; } }
    if (ph === 'stagger') { const k = Math.min(1, FIN.t / .3); g.save(); g.translate(W / 2, 330); g.scale(.6 + .4 * k, .6 + .4 * k); g.translate(-W / 2, -330); banner('💀 FINAL BLOW!', 330, 128, '#ff2a2a'); g.restore(); g.font = `46px ${FONT}`; banner(`Finish it, ${(FIN.W.name || '').slice(0, 26)}!`, 430, 46, '#fff'); }
    if (ph === 'name' || (ph === 'replay' && FIN.t < 1.2)) { const k = Math.min(1, (ph === 'name' ? FIN.t : 9) / .25); g.save(); g.translate(W / 2, 300); g.scale(.5 + .5 * k, .5 + .5 * k); g.translate(-W / 2, -300); banner(fin.tone === 'funny' ? '🤪 SILLY FINISHER!' : '☠️ BRUTAL FINISHER!', 300, 96, fin.tone === 'funny' ? '#ffb02a' : '#ff2a2a'); g.restore(); banner(fin.name.toUpperCase(), 410, 64, '#fff'); }
    if (ph === 'replay') { g.fillStyle = '#000'; g.fillRect(0, 0, W, 70); g.fillRect(0, H - 70, W, 70); if (Math.floor(now / 500) % 2) { g.font = `44px ${FONT}`; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillStyle = '#ff3a3a'; g.fillText('⏪ REPLAY', 40, H - 35); } g.font = `36px ${FONT}`; g.textAlign = 'right'; g.fillStyle = '#ddd'; g.fillText(fin.name, W - 40, H - 35); }
    if (ph === 'cel' && FIN.cel) { banner(`🏆 ${(FIN.W.name || '').slice(0, 28)} WINS!`, 200, 76, '#ffd23a'); g.font = `40px ${FONT}`; banner(FIN.cel.name, 280, 44, '#fff'); }
  }

  // ---------- ✨ effects ----------
  function blood(x, y, z, n, dir, spread = 1) {
    const cap = GFX.particles === 'few' ? 120 : GFX.particles === 'lots' ? 4000 : GFX.quality === 'low' ? 160 : 900;
    for (let i = 0; i < n && parts.length < cap; i++) parts.push({ x: x + vr(-8, 8), y: y + vr(-10, 10), vx: dir * vr(40, 360) * spread + vr(-140, 140), vy: -vr(80, 520) * spread, g: 1500, life: 3, max: 3, size: vr(2.5, 6.5), color: Math.random() < .3 ? '#8a0010' : '#c8102a', gz: z, blood: true });
  }
  function sparks(x, y) { for (let i = 0; i < 10; i++) parts.push({ x, y, vx: vr(-420, 420), vy: vr(-420, 260), g: 600, life: vr(.15, .35), max: .35, size: vr(2, 5), color: Math.random() < .5 ? '#fff' : '#ffe27a', gz: null }); }
  function dust(x, z, n) { for (let i = 0; i < n; i++) parts.push({ x: x + vr(-20, 20), y: zY(z), vx: vr(-90, 90), vy: -vr(20, 80), g: 40, life: vr(.4, .8), max: .8, size: vr(5, 11), color: 'rgba(190,160,120,.45)', gz: null, dust: true }); }
  function puff(f, col) { const y = zY(f.z) - 70 * S(f); for (let i = 0; i < 22; i++) parts.push({ x: f.x, y, vx: vr(-260, 260), vy: vr(-260, 200), g: 0, life: vr(.3, .7), max: .7, size: vr(6, 14), color: col, gz: null, dust: true }); }
  function word(t, x, y, color, size) { if (texts.length > 18) texts.shift(); texts.push({ t, x, y, color, size, life: .9, max: .9, rot: vr(-.15, .15) }); }
  function stamp(x, y, r, col) { fg.fillStyle = col; fg.beginPath(); fg.ellipse(x, y, r * 1.6, r * .6, 0, 0, 7); fg.fill(); }

  // ---------- 🏯 Kung Fu Town (drawn once, then reused) ----------
  function roof(c, x, y, w, h, col, eave = .18) { // a curved tiled roof with turned-up ends
    c.fillStyle = col; c.beginPath(); c.moveTo(x - w * eave, y + h * .25); c.quadraticCurveTo(x - w * eave * .6, y + h * .9, x, y + h); c.lineTo(x + w, y + h); c.quadraticCurveTo(x + w + w * eave * .6, y + h * .9, x + w + w * eave, y + h * .25);
    c.quadraticCurveTo(x + w * .82, y + h * .7, x + w * .7, y); c.lineTo(x + w * .3, y); c.quadraticCurveTo(x + w * .18, y + h * .7, x - w * eave, y + h * .25); c.fill();
    c.strokeStyle = 'rgba(0,0,0,.25)'; c.lineWidth = 2; for (let i = 1; i < 10; i++) { const xx = x + w * i / 10; c.beginPath(); c.moveTo(xx, y + h * .2); c.lineTo(xx, y + h); c.stroke(); }
  }
  function drawBg(k) {
    const c = document.createElement('canvas'); c.width = W * k; c.height = H * k; const b = c.getContext('2d'); b.scale(k, k);
    const sky = b.createLinearGradient(0, 0, 0, GY0); sky.addColorStop(0, '#2a1440'); sky.addColorStop(.45, '#a8443a'); sky.addColorStop(.8, '#f0a050'); sky.addColorStop(1, '#f6c27a');
    b.fillStyle = sky; b.fillRect(0, 0, W, GY0 + 5);
    b.fillStyle = 'rgba(255,230,180,.85)'; b.beginPath(); b.arc(1380, 300, 120, 0, 7); b.fill(); // the setting sun
    const mtn = (y, col, amp, seed) => { b.fillStyle = col; b.beginPath(); b.moveTo(0, GY0); for (let x = 0; x <= W; x += 40) b.lineTo(x, y - Math.abs(Math.sin(x / (170 + seed) + seed)) * amp - Math.sin(x / 61 + seed) * amp * .2); b.lineTo(W, GY0); b.fill(); };
    mtn(420, 'rgba(90,40,70,.55)', 170, 1.3); mtn(470, 'rgba(70,30,55,.7)', 120, 4.1);
    // the pagoda on the hill
    b.fillStyle = '#3a1a28'; for (let i = 0; i < 5; i++) { const w = 150 - i * 22, x = 520 - w / 2, y = 400 - i * 52; b.fillRect(x + w * .15, y, w * .7, 46); roof(b, x, y - 22, w, 30, '#2a1020', .22); }
    b.fillRect(517, 120, 6, 50);
    // street buildings at the back
    const shops = [['#7a2a1e', '武'], ['#5a2a1a', '茶'], ['#7a3a1e', '酒'], ['#6a1e1e', '館'], ['#5e2a22', '龍'], ['#743020', '面'], ['#62281c', '藥']];
    for (let i = 0; i < 7; i++) {
      const x = -40 + i * 290, w = 270, top = 470 + (i % 2) * 20, [col, sign] = shops[i];
      b.fillStyle = col; b.fillRect(x, top, w, GY0 - top + 10);
      b.fillStyle = 'rgba(0,0,0,.25)'; b.fillRect(x, top, 10, GY0 - top); b.fillRect(x + w - 10, top, 10, GY0 - top); // pillars
      b.fillStyle = '#c0302a'; b.fillRect(x + 6, top, 14, GY0 - top); b.fillRect(x + w - 20, top, 14, GY0 - top);
      const win = b.createLinearGradient(0, top + 60, 0, top + 140); win.addColorStop(0, '#ffd890'); win.addColorStop(1, '#e89a40');
      b.fillStyle = win; b.fillRect(x + 50, top + 70, 70, 70); b.fillRect(x + 150, top + 70, 70, 70); // glowing paper windows
      b.strokeStyle = '#4a1a10'; b.lineWidth = 3; for (const wx of [x + 50, x + 150]) { b.strokeRect(wx, top + 70, 70, 70); b.beginPath(); b.moveTo(wx + 35, top + 70); b.lineTo(wx + 35, top + 140); b.moveTo(wx, top + 105); b.lineTo(wx + 70, top + 105); b.stroke(); }
      roof(b, x, top - 60, w, 64, i % 2 ? '#24343a' : '#2c2a3a', .12);
      if (i !== 3) { b.fillStyle = '#1a0a08'; b.fillRect(x + w / 2 - 34, top + 8, 68, 50); b.fillStyle = '#f2c84a'; b.font = `700 40px 'Segoe UI Emoji','Apple Color Emoji','Noto Color Emoji',sans-serif`; b.textAlign = 'center'; b.textBaseline = 'middle'; b.fillText(sign, x + w / 2, top + 34); } // (the middle shop is behind the gate)
    }
    // the gate (paifang) in the middle
    b.fillStyle = '#9a2018'; b.fillRect(820, 400, 26, 270); b.fillRect(1074, 400, 26, 270); b.fillRect(800, 430, 320, 22); roof(b, 790, 365, 340, 50, '#1e2a30', .14);
    b.fillStyle = '#1a0a08'; b.fillRect(900, 455, 120, 44); b.fillStyle = '#f2c84a'; b.font = '700 34px serif'; b.fillText('功夫', 960, 478);
    // the street: stone slabs going back into the distance
    const st = b.createLinearGradient(0, GY0, 0, H); st.addColorStop(0, '#8a7258'); st.addColorStop(1, '#5e4a38');
    b.fillStyle = st; b.fillRect(0, GY0, W, H - GY0);
    b.strokeStyle = 'rgba(40,25,15,.35)'; b.lineWidth = 2;
    for (let i = 0; i <= 12; i++) { const y = GY0 + Math.pow(i / 12, 1.6) * (H - GY0); b.beginPath(); b.moveTo(0, y); b.lineTo(W, y); b.stroke(); }
    for (let i = -10; i <= 30; i++) { const x0 = 960 + (i - 10) * 70, x1 = 960 + (i - 10) * 210; b.beginPath(); b.moveTo(x0, GY0); b.lineTo(x1, H); b.stroke(); }
    for (let i = 0; i < 260; i++) { b.fillStyle = `rgba(${Math.random() < .5 ? '255,240,210' : '30,20,10'},${vr(.04, .1)})`; b.fillRect(vr(0, W), vr(GY0, H), vr(2, 6), vr(1, 3)); }
    // barrels + crates at the sides
    const barrel = (x, y, s) => { b.fillStyle = '#6a3a1e'; b.beginPath(); b.ellipse(x, y, 34 * s, 46 * s, 0, 0, 7); b.fill(); b.strokeStyle = '#2a1608'; b.lineWidth = 4 * s; for (const d of [-22, 22]) { b.beginPath(); b.ellipse(x, y + d * s, 33 * s, 8 * s, 0, 0, Math.PI); b.stroke(); } };
    barrel(60, GY0 + 30, 1); barrel(1860, GY0 + 40, 1.05); b.fillStyle = '#7a5530'; b.fillRect(1760, GY0 - 30, 80, 70); b.strokeStyle = '#3a2410'; b.lineWidth = 4; b.strokeRect(1760, GY0 - 30, 80, 70);
    return c;
  }
  // ---------- 🔔 Royal Rumble (arena + ring drawn once; logo, lights and front ropes every frame) ----------
  const ROPES = [38, 76, 114], postH = 150;
  function ropeY(x0, y0, x1, y1, k0, k1, h) { return [y0 - h * k0, y1 - h * k1]; }
  function drawRing(b, front) { // back + side ropes (front = false) or the front ropes and posts (front = true)
    const BL = [ringL(0), GY0], BR = [ringR(0), GY0], FL = [ringL(1), GY1], FR = [ringR(1), GY1], kB = .72, kF = 1.12;
    const post = ([x, y], k) => { const w = 16 * k; b.fillStyle = '#2a2d33'; b.fillRect(x - w / 2, y - postH * k, w, postH * k); b.fillStyle = 'rgba(255,255,255,.18)'; b.fillRect(x - w / 2, y - postH * k, w * .3, postH * k);
      for (const [i, h] of ROPES.entries()) { b.fillStyle = ['#d8202a', '#f2f2f2', '#2050d8'][i]; b.beginPath(); b.roundRect?.(x - w * .9, y - h * k - 8 * k, w * 1.8, 16 * k, 4 * k); b.fill(); } };
    const rope = (A, B, kA, kB2, i) => { const h = ROPES[i]; b.strokeStyle = ['#d8202a', '#f2f2f2', '#2050d8'][i]; b.lineWidth = 4.5 * (kA + kB2) / 2; b.beginPath(); b.moveTo(A[0], A[1] - h * kA); b.quadraticCurveTo((A[0] + B[0]) / 2, (A[1] - h * kA + B[1] - h * kB2) / 2 + 6, B[0], B[1] - h * kB2); b.stroke(); };
    if (!front) { post(BL, kB); post(BR, kB); for (let i = 0; i < 3; i++) { rope(BL, BR, kB, kB, i); rope(BL, FL, kB, kF, i); rope(BR, FR, kB, kF, i); } }
    else { for (let i = 0; i < 3; i++) rope(FL, FR, kF, kF, i); post(FL, kF); post(FR, kF); }
  }
  function drawBgRumble(k) {
    const c = document.createElement('canvas'); c.width = W * k; c.height = H * k; const b = c.getContext('2d'); b.scale(k, k);
    const sky = b.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, '#06060e'); sky.addColorStop(.5, '#141022'); sky.addColorStop(1, '#0a0a12'); b.fillStyle = sky; b.fillRect(0, 0, W, H);
    // the lighting rig at the top
    b.fillStyle = '#1c1c26'; b.fillRect(0, 70, W, 26); for (let x = 60; x < W; x += 140) { b.fillStyle = '#2a2a36'; b.fillRect(x - 18, 96, 36, 30); b.fillStyle = 'rgba(255,240,200,.85)'; b.beginPath(); b.arc(x, 126, 10, 0, 7); b.fill(); }
    // the big screen
    b.fillStyle = '#111'; b.fillRect(760, 150, 400, 150); const sc = b.createLinearGradient(0, 160, 0, 290); sc.addColorStop(0, '#3a2a7a'); sc.addColorStop(1, '#a0204a'); b.fillStyle = sc; b.fillRect(772, 162, 376, 126);
    b.fillStyle = '#ffd23a'; b.font = `64px ${FONT}`; b.textAlign = 'center'; b.textBaseline = 'middle'; b.fillText('RUMBLE!', 960, 226);
    // the crowd: rows of fans going up into the dark
    for (let row = 0; row < 11; row++) {
      const y = 600 - row * 34, sz = 15 - row * .7, dark = .25 + row * .06;
      for (let x = -10 + (row % 2) * 14; x < W + 20; x += sz * 1.9 + vr(0, 6)) {
        if (row > 6 && x > 740 && x < 1180) continue; // (under the big screen)
        const col = `hsl(${Math.floor(vr(0, 360))},${Math.floor(vr(10, 50))}%,${Math.floor(vr(18, 42) * (1 - dark * .6))}%)`;
        b.fillStyle = col; b.beginPath(); b.ellipse(x, y + 16, sz * .95, sz * 1.1, 0, 0, 7); b.fill(); // shoulders
        b.fillStyle = `rgba(${Math.floor(vr(150, 230))},${Math.floor(vr(110, 180))},${Math.floor(vr(90, 150))},${1 - dark * .7})`; b.beginPath(); b.arc(x, y, sz * .55, 0, 7); b.fill();
        if (Math.random() < .07) { b.fillStyle = ['#ffd23a', '#ff4a6a', '#4ad0ff', '#fff'][Math.floor(Math.random() * 4)]; b.fillRect(x - 12, y - 32, 24, 16); } // signs
      }
      b.fillStyle = `rgba(6,6,14,${dark * .5})`; b.fillRect(0, y - 20, W, 34);
    }
    // barricade + arena floor
    b.fillStyle = '#1a1a22'; b.fillRect(0, 610, W, 40); b.fillStyle = '#2a2a3a'; b.fillRect(0, 610, W, 5);
    const fl = b.createLinearGradient(0, 650, 0, H); fl.addColorStop(0, '#24242e'); fl.addColorStop(1, '#14141a'); b.fillStyle = fl; b.fillRect(0, 650, W, H - 650);
    b.strokeStyle = 'rgba(255,255,255,.05)'; b.lineWidth = 2; for (let i = 0; i < 9; i++) { const y = 650 + Math.pow(i / 9, 1.5) * 430; b.beginPath(); b.moveTo(0, y); b.lineTo(W, y); b.stroke(); }
    // ring apron (front skirt) + the mat
    b.fillStyle = '#121216'; b.beginPath(); b.moveTo(ringL(1) - 10, GY1); b.lineTo(ringR(1) + 10, GY1); b.lineTo(ringR(1) + 10, GY1 + OUT_Y + 6); b.lineTo(ringL(1) - 10, GY1 + OUT_Y + 6); b.fill();
    b.fillStyle = 'rgba(255,210,60,.85)'; b.font = `40px ${FONT}`; b.textAlign = 'center'; b.textBaseline = 'middle'; b.fillText('🔔  ROYAL RUMBLE  🔔', 960, GY1 + 32);
    b.fillStyle = '#1a1a22'; b.beginPath(); b.moveTo(ringL(0) - 16, GY0 - 4); b.lineTo(ringR(0) + 16, GY0 - 4); b.lineTo(ringR(1) + 18, GY1 + 4); b.lineTo(ringL(1) - 18, GY1 + 4); b.fill(); // the apron edge
    const mat = b.createLinearGradient(0, GY0, 0, GY1); mat.addColorStop(0, '#c8ccd6'); mat.addColorStop(1, '#eef0f4'); b.fillStyle = mat;
    b.beginPath(); b.moveTo(ringL(0), GY0); b.lineTo(ringR(0), GY0); b.lineTo(ringR(1), GY1); b.lineTo(ringL(1), GY1); b.fill();
    b.strokeStyle = 'rgba(0,0,0,.06)'; b.lineWidth = 2; for (let i = 1; i < 8; i++) { const z = i / 8; b.beginPath(); b.moveTo(ringL(z), zY(z)); b.lineTo(ringR(z), zY(z)); b.stroke(); }
    for (let i = 0; i < 260; i++) { const z = Math.random(); b.fillStyle = `rgba(0,0,0,${vr(.02, .05)})`; b.fillRect(vr(ringL(z), ringR(z)), zY(z), vr(2, 6), vr(1, 3)); }
    drawRing(b, false);
    return c;
  }
  function ringLogo() { // the picture in the middle of the mat (your own, or your Twitch picture)
    const img = imgFor(scene.logo), cx = 960, cy = zY(.5), r = 175;
    g.save(); g.translate(cx, cy); g.scale(1, .4);
    g.fillStyle = 'rgba(20,20,30,.12)'; g.beginPath(); g.arc(0, 0, r + 18, 0, 7); g.fill();
    g.beginPath(); g.arc(0, 0, r, 0, 7); g.save(); g.clip();
    if (img) { const q = Math.max(2 * r / img.naturalWidth, 2 * r / img.naturalHeight); g.globalAlpha = .92; g.drawImage(img, -img.naturalWidth * q / 2, -img.naturalHeight * q / 2, img.naturalWidth * q, img.naturalHeight * q); g.globalAlpha = 1; }
    else { g.fillStyle = '#7a2ad8'; g.fillRect(-r, -r, 2 * r, 2 * r); g.fillStyle = '#ffd23a'; g.font = `120px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('🤼', 0, 0); }
    g.restore(); g.lineWidth = 10; g.strokeStyle = 'rgba(255,210,60,.9)'; g.beginPath(); g.arc(0, 0, r, 0, 7); g.stroke(); g.restore();
  }
  function arenaLights(t) { // spotlights sweeping and camera flashes in the crowd
    if (GFX.quality === 'low') return;
    g.save(); g.globalCompositeOperation = 'lighter';
    for (const [x0, sp, ph, col] of [[300, .5, 0, 'rgba(120,160,255,.06)'], [1620, .45, 2, 'rgba(255,120,200,.06)'], [960, .3, 4, 'rgba(255,240,200,.05)']]) {
      const tx = 960 + Math.sin(t * sp + ph) * 520; g.fillStyle = col; g.beginPath(); g.moveTo(x0 - 20, 110); g.lineTo(x0 + 20, 110); g.lineTo(tx + 170, 960); g.lineTo(tx - 170, 960); g.fill();
    }
    g.restore();
    for (let i = 0; i < 3; i++) if (Math.random() < .12) { const x = vr(0, W), y = vr(270, 590); g.fillStyle = 'rgba(255,255,255,.9)'; g.beginPath(); g.arc(x, y, vr(2, 5), 0, 7); g.fill(); g.fillStyle = 'rgba(255,255,255,.15)'; g.beginPath(); g.arc(x, y, 22, 0, 7); g.fill(); }
  }
  // ---------- 🧙 Wizard Battle: night sky, the floating platform (tiles drawn every frame: they crack and fall) ----------
  function drawBgWizard(k) {
    const c = document.createElement('canvas'); c.width = W * k; c.height = H * k; const b = c.getContext('2d'); b.scale(k, k);
    const sky = b.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, '#05031a'); sky.addColorStop(.45, '#24104a'); sky.addColorStop(.8, '#4a1e6a'); sky.addColorStop(1, '#7a3a7a'); b.fillStyle = sky; b.fillRect(0, 0, W, H);
    for (let i = 0; i < 260; i++) { b.fillStyle = `rgba(255,255,${Math.floor(vr(200, 255))},${vr(.3, 1)})`; b.beginPath(); b.arc(vr(0, W), vr(0, 620), vr(.6, 2.2), 0, 7); b.fill(); }
    const aur = b.createLinearGradient(0, 120, 0, 380); aur.addColorStop(0, 'rgba(90,255,200,0)'); aur.addColorStop(.5, 'rgba(90,255,200,.12)'); aur.addColorStop(1, 'rgba(160,90,255,0)'); b.fillStyle = aur;
    b.beginPath(); b.moveTo(0, 260); for (let x = 0; x <= W; x += 60) b.lineTo(x, 220 + Math.sin(x / 220) * 70); for (let x = W; x >= 0; x -= 60) b.lineTo(x, 330 + Math.sin(x / 180 + 1) * 60); b.fill();
    b.fillStyle = 'rgba(255,248,220,.95)'; b.beginPath(); b.arc(1560, 170, 90, 0, 7); b.fill(); b.fillStyle = 'rgba(200,190,170,.35)'; for (const [x, y, r] of [[1530, 150, 18], [1590, 200, 12], [1575, 140, 8]]) { b.beginPath(); b.arc(x, y, r, 0, 7); b.fill(); }
    const isle = (x, y, w, col) => { b.fillStyle = col; b.beginPath(); b.ellipse(x, y, w, w * .12, 0, 0, 7); b.fill(); b.beginPath(); b.moveTo(x - w, y); b.quadraticCurveTo(x - w * .3, y + w * .5, x, y + w * .9); b.quadraticCurveTo(x + w * .3, y + w * .5, x + w, y); b.fill(); // a floating island far away
      b.fillStyle = 'rgba(20,10,40,.8)'; b.fillRect(x - w * .15, y - w * .5, w * .1, w * .5); b.beginPath(); b.moveTo(x - w * .2, y - w * .5); b.lineTo(x - w * .1, y - w * .8); b.lineTo(x, y - w * .5); b.fill(); };
    isle(230, 420, 110, 'rgba(40,20,70,.85)'); isle(1700, 470, 80, 'rgba(50,25,80,.8)'); isle(700, 330, 50, 'rgba(40,20,70,.6)');
    for (let i = 0; i < 9; i++) { const y = 860 + i * 26, a = .1 + i * .05; b.fillStyle = `rgba(${200 - i * 6},${170 - i * 6},${230 - i * 4},${a})`; for (let x = -100; x < W + 100; x += 140) { b.beginPath(); b.ellipse(x + (i % 2) * 70 + vr(-20, 20), y + vr(-8, 8), vr(90, 150), vr(20, 34), 0, 0, 7); b.fill(); } } // clouds far below
    return c;
  }
  function drawPlatform(t) { // the stone tiles, their cracks, and the ones falling away
    const under = (x0, y0, x1, y1, i) => { g.fillStyle = '#2a2238'; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.lineTo(x1, y1 + 46); g.lineTo(x0, y0 + 46); g.fill(); g.fillStyle = '#1a1428'; g.beginPath(); const m = (x0 + x1) / 2; g.moveTo(x0, y0 + 46); g.lineTo(x1, y1 + 46); g.lineTo(m + 10, y0 + 46 + 60 + (i * 53 % 70)); g.fill(); };
    for (let i = 0; i < tiles.length; i++) { const tl = tiles[i]; if (tl.hp > 0 || tl.fallT > 1.6) continue; const d = tl.fallT * tl.fallT * 500, q = tileQuad(i, d); g.globalAlpha = Math.max(0, 1 - tl.fallT / 1.6); g.fillStyle = `hsl(250,12%,${tl.c - 6}%)`; g.beginPath(); q.forEach(([x, y], k) => k ? g.lineTo(x, y) : g.moveTo(x, y)); g.fill(); under(q[3][0], q[3][1], q[2][0], q[2][1], i); g.globalAlpha = 1; }
    for (let r = PR - 1; r >= 0; r--) for (let c = 0; c < PC; c++) { const i = r * PC + c, tl = tiles[i]; if (tl.hp <= 0) continue; const front = r === PR - 1 || tiles[i + PC].hp <= 0; if (front) { const q = tileQuad(i); under(q[3][0], q[3][1], q[2][0], q[2][1], i); } }
    for (let i = 0; i < tiles.length; i++) { const tl = tiles[i]; if (tl.hp <= 0) continue; const q = tileQuad(i);
      g.fillStyle = `hsl(250,12%,${tl.c}%)`; g.beginPath(); q.forEach(([x, y], k) => k ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); g.fill(); g.strokeStyle = 'rgba(10,6,20,.55)'; g.lineWidth = 2; g.stroke();
      const cx = (q[0][0] + q[2][0]) / 2, cy = (q[0][1] + q[2][1]) / 2;
      if (tl.rune) { g.strokeStyle = `rgba(170,120,255,${.35 + Math.sin(t * 2 + i) * .15})`; g.lineWidth = 2; g.beginPath(); g.ellipse(cx, cy, 16, 6, 0, 0, 7); g.moveTo(cx - 10, cy); g.lineTo(cx + 10, cy); g.stroke(); }
      if (tl.hp < 2) { g.strokeStyle = 'rgba(10,5,15,.85)'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(cx - 30, cy - 6); g.lineTo(cx - 8, cy + 3); g.lineTo(cx + 4, cy - 5); g.lineTo(cx + 28, cy + 7); g.moveTo(cx - 8, cy + 3); g.lineTo(cx - 2, cy + 12); g.stroke(); g.fillStyle = 'rgba(255,120,60,.15)'; g.beginPath(); g.ellipse(cx, cy, 30, 9, 0, 0, 7); g.fill(); }
    }
    const mc = zY(.5); g.strokeStyle = `rgba(190,140,255,${.25 + Math.sin(t * 1.5) * .1})`; g.lineWidth = 4; g.beginPath(); g.ellipse(960, mc, 230, 62, 0, 0, 7); g.stroke(); g.beginPath(); g.ellipse(960, mc, 180, 48, 0, 0, 7); g.stroke(); // the magic circle
    for (const [x, z, ph] of [[platL(0) - 30, 0, 0], [platR(0) + 30, 0, 2], [platL(1) - 40, 1, 4], [platR(1) + 40, 1, 1]]) { const y = zY(z) - 120 + Math.sin(t * 1.6 + ph) * 12; g.fillStyle = 'rgba(160,110,255,.25)'; g.beginPath(); g.arc(x, y, 28, 0, 7); g.fill(); g.fillStyle = '#b48cff'; g.beginPath(); g.moveTo(x, y - 30); g.lineTo(x + 13, y); g.lineTo(x, y + 30); g.lineTo(x - 13, y); g.fill(); g.fillStyle = 'rgba(255,255,255,.6)'; g.beginPath(); g.moveTo(x, y - 30); g.lineTo(x + 5, y); g.lineTo(x, y + 8); g.fill(); } // floating crystals
  }
  function drawSpells(t) {
    for (const b of bolts) { const x = b.x, y = zY(b.z) - b.h, fire = b.kind === 'fire', r = fire ? 18 : 11;
      g.fillStyle = fire ? 'rgba(255,140,40,.3)' : 'rgba(120,220,255,.3)'; g.beginPath(); g.ellipse(x - Math.sign(b.vx) * 26, y, 34, r * .8, 0, 0, 7); g.fill();
      g.fillStyle = fire ? '#ff8a2a' : '#7ae0ff'; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(x, y, r * .45, 0, 7); g.fill();
      if (Math.random() < .7) parts.push({ x, y, vx: -b.vx * .08 + vr(-40, 40), vy: vr(-40, 40), g: 0, life: .3, max: .3, size: vr(2, fire ? 6 : 4), color: fire ? '#ffcf4a' : '#c8f4ff', gz: null, dust: true }); }
    for (const z of zaps) { const y = zY(z.z);
      if (z.t > 0) { const u = 1 - z.t / (z.meteor ? 1.4 : .7); g.strokeStyle = z.meteor ? `rgba(255,90,40,${.5 + u * .5})` : `rgba(255,230,120,${.4 + u * .5})`; g.lineWidth = 4; g.setLineDash([10, 8]); g.beginPath(); g.ellipse(z.x, y, z.meteor ? 120 : 60, z.meteor ? 32 : 16, 0, 0, 7); g.stroke(); g.setLineDash([]);
        if (z.meteor && u > .4) { const k = (u - .4) / .6, mx = z.x + 300 * (1 - k), my = y - 900 * (1 - k); g.fillStyle = 'rgba(255,120,40,.35)'; g.beginPath(); g.arc(mx, my, 50, 0, 7); g.fill(); g.fillStyle = '#5a3a2a'; g.beginPath(); g.arc(mx, my, 30, 0, 7); g.fill(); } }
      else if (z.flash > 0 && !z.meteor) { g.strokeStyle = '#fff6b0'; g.lineWidth = 6; g.shadowColor = '#ffe27a'; g.shadowBlur = GFX.quality === 'low' ? 0 : 20; g.beginPath(); let x = z.x + vr(-40, 40); g.moveTo(x, 0); for (let yy = 0; yy < y; yy += 70) { x = z.x + vr(-35, 35); g.lineTo(x, yy); } g.lineTo(z.x, y - 10); g.stroke(); g.shadowBlur = 0; } }
  }
  // ---------- 🏛️ Colosseum (drawn once) + lions ----------
  function drawBgColosseum(k) {
    const c = document.createElement('canvas'); c.width = W * k; c.height = H * k; const b = c.getContext('2d'); b.scale(k, k);
    const sky = b.createLinearGradient(0, 0, 0, 420); sky.addColorStop(0, '#3a7ad0'); sky.addColorStop(1, '#bcdcf4'); b.fillStyle = sky; b.fillRect(0, 0, W, 430);
    for (let i = 0; i < 6; i++) { b.fillStyle = 'rgba(255,255,255,.8)'; const x = vr(0, W), y = vr(40, 200); for (let j = 0; j < 4; j++) { b.beginPath(); b.ellipse(x + j * 45, y + vr(-10, 10), vr(40, 70), vr(18, 28), 0, 0, 7); b.fill(); } }
    // the stands: two rows of arches + the crowd on top
    b.fillStyle = '#d8b88a'; b.fillRect(0, 250, W, 410); b.fillStyle = 'rgba(0,0,0,.08)'; b.fillRect(0, 250, W, 8);
    for (let row = 0; row < 7; row++) { const y = 262 + row * 20; for (let x = -10 + (row % 2) * 10; x < W + 20; x += 18 + vr(0, 5)) { b.fillStyle = `hsl(${Math.floor(vr(0, 360))},${Math.floor(vr(20, 55))}%,${Math.floor(vr(30, 55))}%)`; b.beginPath(); b.ellipse(x, y + 8, 8, 9, 0, 0, 7); b.fill(); b.fillStyle = `rgb(${Math.floor(vr(170, 230))},${Math.floor(vr(130, 180))},${Math.floor(vr(100, 150))})`; b.beginPath(); b.arc(x, y, 5, 0, 7); b.fill(); } }
    for (const [y, h, w] of [[410, 110, 78], [530, 120, 96]]) { b.fillStyle = '#c8a474'; b.fillRect(0, y - 8, W, 8); for (let x = 20; x < W; x += w + 24) { b.fillStyle = '#3a2a1e'; b.beginPath(); b.moveTo(x, y + h); b.lineTo(x, y + w / 2); b.arc(x + w / 2, y + w / 2, w / 2, Math.PI, 0); b.lineTo(x + w, y + h); b.fill(); b.fillStyle = 'rgba(255,255,255,.12)'; b.fillRect(x + w + 4, y, 16, h); } }
    // the emperor's box
    b.fillStyle = '#8a1a2a'; b.fillRect(820, 330, 280, 70); b.fillStyle = '#ffd23a'; b.fillRect(820, 330, 280, 8); b.fillStyle = '#5a1a6a'; for (const x of [840, 1060]) b.fillRect(x, 338, 20, 90); b.fillStyle = '#ffd23a'; b.font = '700 30px serif'; b.textAlign = 'center'; b.textBaseline = 'middle'; b.fillText('🦅', 960, 372);
    // the wall around the sand + the two lion tunnels
    b.fillStyle = '#b89464'; b.fillRect(0, 600, W, GY0 - 600 + 4); b.fillStyle = 'rgba(0,0,0,.15)'; for (let x = 0; x < W; x += 120) b.fillRect(x, 600, 3, GY0 - 600);
    for (const gx of GATES) { b.fillStyle = '#1a120c'; b.beginPath(); b.moveTo(gx - 70, GY0 + 4); b.lineTo(gx - 70, 560); b.arc(gx, 560, 70, Math.PI, 0); b.lineTo(gx + 70, GY0 + 4); b.fill(); b.strokeStyle = '#6a5a4a'; b.lineWidth = 5; for (let x = gx - 55; x <= gx + 55; x += 22) { b.beginPath(); b.moveTo(x, 505); b.lineTo(x, 540); b.stroke(); } b.strokeStyle = '#c8a474'; b.lineWidth = 10; b.beginPath(); b.arc(gx, 560, 75, Math.PI, 0); b.stroke(); }
    for (const x of [600, 1320]) { b.fillStyle = '#8a1a2a'; b.beginPath(); b.moveTo(x - 40, 430); b.lineTo(x + 40, 430); b.lineTo(x + 40, 560); b.lineTo(x, 530); b.lineTo(x - 40, 560); b.fill(); b.fillStyle = '#ffd23a'; b.font = '700 34px serif'; b.fillText('⚔', x, 480); } // banners
    // the sand
    const sand = b.createLinearGradient(0, GY0, 0, H); sand.addColorStop(0, '#d8b878'); sand.addColorStop(1, '#b8945a'); b.fillStyle = sand; b.fillRect(0, GY0, W, H - GY0);
    b.strokeStyle = 'rgba(120,90,50,.18)'; b.lineWidth = 2; for (let i = 0; i < 14; i++) { const y = GY0 + Math.pow(i / 14, 1.4) * (H - GY0); b.beginPath(); b.moveTo(0, y); for (let x = 0; x <= W; x += 80) b.lineTo(x, y + Math.sin(x / 90 + i) * 3); b.stroke(); }
    for (let i = 0; i < 400; i++) { b.fillStyle = `rgba(${Math.random() < .5 ? '255,240,200' : '90,60,30'},${vr(.05, .15)})`; b.fillRect(vr(0, W), vr(GY0, H), vr(2, 5), vr(1, 3)); }
    return c;
  }
  function drawLion(L) {
    const s = .8 + L.z * .45, X = L.x, Y = zY(L.z), f = L.face, wl = Math.sin(L.ph), y = Y - L.h - 44 * s;
    g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.ellipse(X, Y, 70 * s, 12 * s, 0, 0, 7); g.fill();
    g.strokeStyle = '#b07a32'; g.lineCap = 'round'; g.lineWidth = 10 * s;
    for (const [lx, ph] of [[-40, 0], [-28, Math.PI], [28, 0], [40, Math.PI]]) { const k = L.h > 0 ? .6 : Math.sin(L.ph + ph); g.beginPath(); g.moveTo(X + lx * s * f, y + 10 * s); g.lineTo(X + (lx + k * 10) * s * f, Y - L.h - 2 * s); g.stroke(); }
    g.lineWidth = 5 * s; g.beginPath(); g.moveTo(X - 52 * s * f, y); g.quadraticCurveTo(X - 85 * s * f, y - 10 * s + wl * 8 * s, X - 80 * s * f, y - 34 * s); g.stroke(); g.fillStyle = '#6a3a14'; g.beginPath(); g.arc(X - 80 * s * f, y - 36 * s, 7 * s, 0, 7); g.fill(); // tail
    g.fillStyle = '#d8a04a'; g.beginPath(); g.ellipse(X, y, 58 * s, 26 * s, 0, 0, 7); g.fill(); // body
    const hx = X + 52 * s * f, hy = y - 18 * s;
    g.fillStyle = '#8a4a1a'; g.beginPath(); for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2, r = (i % 2 ? 30 : 38) * s; g.lineTo(hx + Math.cos(a) * r, hy + Math.sin(a) * r); } g.fill(); // mane
    g.fillStyle = '#e0aa55'; g.beginPath(); g.arc(hx + 4 * s * f, hy, 21 * s, 0, 7); g.fill();
    g.fillStyle = '#111'; g.beginPath(); g.arc(hx + 10 * s * f, hy - 5 * s, 3.2 * s, 0, 7); g.fill(); g.beginPath(); g.arc(hx - 2 * s * f, hy - 5 * s, 3.2 * s, 0, 7); g.fill();
    g.strokeStyle = '#111'; g.lineWidth = 3 * s; g.beginPath(); g.moveTo(hx + 1 * s * f, hy - 12 * s); g.lineTo(hx + 12 * s * f, hy - 9 * s); g.stroke(); // angry brow
    g.fillStyle = '#5a2a10'; g.beginPath(); g.arc(hx + 18 * s * f, hy + 3 * s, 4.5 * s, 0, 7); g.fill();
    if (L.pounce || L.h > 0) { g.fillStyle = '#7a1010'; g.beginPath(); g.ellipse(hx + 12 * s * f, hy + 12 * s, 9 * s, 6 * s, 0, 0, 7); g.fill(); g.fillStyle = '#fff'; g.fillRect(hx + 6 * s * f - 2 * s, hy + 7 * s, 4 * s, 4 * s); g.fillRect(hx + 15 * s * f - 2 * s, hy + 7 * s, 4 * s, 4 * s); }
  }
  function lanterns(t) { // strings of red lanterns swaying across the street
    for (const [y0, sag, n, off] of [[140, 90, 9, 0], [250, 70, 7, 1]]) {
      g.strokeStyle = 'rgba(30,10,10,.8)'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, y0); g.quadraticCurveTo(W / 2, y0 + sag * 2, W, y0); g.stroke();
      for (let i = 1; i <= n; i++) {
        const u = i / (n + 1), x = u * W, y = y0 + 2 * u * (1 - u) * sag * 2, sw = Math.sin(t * 1.4 + i + off) * .12;
        g.save(); g.translate(x, y); g.rotate(sw); g.fillStyle = '#d0281e'; g.beginPath(); g.ellipse(0, 26, 20, 26, 0, 0, 7); g.fill();
        g.fillStyle = 'rgba(255,200,90,.35)'; g.beginPath(); g.ellipse(-5, 22, 7, 16, 0, 0, 7); g.fill();
        g.fillStyle = '#2a1008'; g.fillRect(-10, 0, 20, 5); g.fillRect(-10, 50, 20, 5); g.fillStyle = '#f2c84a'; g.fillRect(-2, 55, 4, 14); g.restore();
      }
    }
  }

  // ---------- 🖌️ drawing a fighter ----------
  function limb(x1, y1, x2, y2, bend, w) { // a stick arm / leg with a joint
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2, dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1, kx = mx - dy / L * bend, ky = my + dx / L * bend;
    g.lineWidth = w; g.beginPath(); g.moveTo(x1, y1); g.lineTo(kx, ky); g.lineTo(x2, y2); g.stroke();
  }
  function packPath(x, y, w, h, s, cut = 0) { // a pack: crimped top and bottom (cut = how much of the top is gone)
    const teeth = 8, tz = 5 * s, top = y + cut;
    g.beginPath(); g.moveTo(x, top);
    if (!cut) for (let i = 0; i <= teeth; i++) g.lineTo(x + w * i / teeth, top + (i % 2 ? tz : 0)); else for (let i = 0; i <= 10; i++) g.lineTo(x + w * i / 10, top + (i % 2 ? 7 : -5) * s); // a ragged cut
    g.lineTo(x + w, y + h); for (let i = teeth; i >= 0; i--) g.lineTo(x + w * i / teeth, y + h - (i % 2 ? tz : 0)); g.closePath();
  }
  function drawFace(f, cx, top, PW, PH, s, look) {
    if (f.char) return; // (🧍 characters have their own faces)
    const ey = top + PH * .3, ex = PW * .18, ko = !f.alive, hurt = f.hurtT > 0;
    // headband
    if (WIZ()) { // 🧙 a pointy wizard hat
      const hb = top + PH * .06, col = f.color || '#5a2a9a'; g.fillStyle = col; g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = 2 * s;
      g.beginPath(); g.ellipse(cx, hb, PW * .62, 7 * s, 0, 0, 7); g.fill(); g.stroke();
      g.beginPath(); g.moveTo(cx - PW * .38, hb); g.quadraticCurveTo(cx - PW * .1, hb - 40 * s, cx - f.face * 22 * s, hb - 70 * s + Math.sin(T * 3 + f.ph) * 3 * s); g.quadraticCurveTo(cx + PW * .12, hb - 36 * s, cx + PW * .38, hb); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = '#ffe27a'; g.font = `${Math.round(14 * s)}px serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('★', cx, hb - 22 * s);
    } else if (WAR()) { // 🪖 an army helmet
      const hb = top + PH * .14; g.fillStyle = '#4a5a32'; g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = 2 * s; g.beginPath(); g.arc(cx, hb, PW * .44, Math.PI, 0); g.closePath(); g.fill(); g.stroke(); g.fillStyle = '#3a4826'; g.beginPath(); g.ellipse(cx, hb, PW * .6, 6 * s, 0, 0, 7); g.fill(); g.stroke(); g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 1.5 * s; for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(cx + i * PW * .12, hb - PW * .38); g.lineTo(cx + i * PW * .16, hb); g.stroke(); } // (netting)
    } else if (COLO()) { // 🏛️ a gladiator helmet with a red crest
      const hb = top + PH * .16; g.fillStyle = '#9aa2aa'; g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = 2 * s; g.beginPath(); g.arc(cx, hb, PW * .46, Math.PI, 0); g.closePath(); g.fill(); g.stroke(); g.fillStyle = '#c8ced4'; g.fillRect(cx - PW * .5, hb - 3 * s, PW, 6 * s);
      g.fillStyle = '#c81e2a'; g.beginPath(); for (let i = 0; i <= 8; i++) { const a = Math.PI + i / 8 * Math.PI, r = PW * .46 + 16 * s + (i % 2) * 4 * s; g.lineTo(cx + Math.cos(a) * r * .9, hb + Math.sin(a) * r); } for (let i = 8; i >= 0; i--) { const a = Math.PI + i / 8 * Math.PI; g.lineTo(cx + Math.cos(a) * PW * .42, hb + Math.sin(a) * PW * .44); } g.fill();
    } else if (!RUMBLE()) { g.fillStyle = '#d82020'; g.fillRect(cx - PW / 2, top + PH * .12, PW, PH * .07); }
    const tx = RUMBLE() || WIZ() || COLO() || WAR() ? -9999 : cx - f.face * PW / 2, tw = Math.sin(T * 9 + f.ph) * 6 * s; g.strokeStyle = '#d82020'; g.lineWidth = 4 * s; g.beginPath(); g.moveTo(tx, top + PH * .15); g.quadraticCurveTo(tx - f.face * 18 * s, top + PH * .15 + tw, tx - f.face * 34 * s, top + PH * .2 - tw); g.stroke();
    for (const side of [-1, 1]) {
      const x = cx + side * ex + f.face * 3 * s;
      g.lineWidth = 2.4 * s; g.strokeStyle = '#111';
      if (ko) { g.beginPath(); g.moveTo(x - 7 * s, ey - 7 * s); g.lineTo(x + 7 * s, ey + 7 * s); g.moveTo(x + 7 * s, ey - 7 * s); g.lineTo(x - 7 * s, ey + 7 * s); g.stroke(); continue; }
      if (hurt) { g.beginPath(); g.moveTo(x - 8 * s, ey - 5 * s * side * -1); g.lineTo(x + 2 * s * side, ey); g.lineTo(x - 8 * s, ey + 5 * s * side * -1); g.stroke(); continue; }
      g.fillStyle = '#fff'; g.beginPath(); g.ellipse(x, ey, 9 * s, 10 * s, 0, 0, 7); g.fill(); g.stroke();
      g.fillStyle = '#111'; g.beginPath(); g.arc(x + look * 3.5 * s, ey + 1.5 * s, 4 * s, 0, 7); g.fill();
      g.lineWidth = 3.4 * s; g.beginPath(); g.moveTo(x - side * 11 * s, ey - 17 * s); g.lineTo(x + side * 7 * s, ey - 10 * s); g.stroke(); // angry eyebrows
    }
    const my = top + PH * .47; g.strokeStyle = '#111'; g.lineWidth = 2.6 * s;
    if (ko) { g.beginPath(); g.ellipse(cx, my, 7 * s, 4 * s, 0, 0, 7); g.stroke(); }
    else if (f.atk || f.yell > 0) { g.fillStyle = '#2a0808'; g.beginPath(); g.ellipse(cx + f.face * 2 * s, my, 9 * s, 8 * s, 0, 0, 7); g.fill(); g.stroke(); g.fillStyle = '#e04050'; g.beginPath(); g.ellipse(cx + f.face * 2 * s, my + 4 * s, 5 * s, 3 * s, 0, 0, 7); g.fill(); }
    else if (f.hp < 40) { g.beginPath(); for (let i = 0; i <= 6; i++) g.lineTo(cx - 10 * s + i * 20 / 6 * s, my + (i % 2 ? 3 : -2) * s); g.stroke(); g.fillStyle = '#9ad8ff'; g.beginPath(); g.ellipse(cx + 22 * s, top + PH * .22, 3 * s, 5 * s, 0, 0, 7); g.fill(); }
    else { g.fillStyle = '#fff'; g.fillRect(cx - 9 * s, my - 4 * s, 18 * s, 8 * s); g.strokeRect(cx - 9 * s, my - 4 * s, 18 * s, 8 * s); g.beginPath(); for (let i = 1; i < 4; i++) { g.moveTo(cx - 9 * s + i * 4.5 * s, my - 4 * s); g.lineTo(cx - 9 * s + i * 4.5 * s, my + 4 * s); } g.stroke(); }
  }
  function drawPackBody(f, x, top, PW, PH, s, cut) {
    if (f.char && CP()) { // 🧍 a character: their drawing fills the box (with the hurt flash / damage look like a pack)
      const c = charCanvas(f), [sx, sy, sw, sh] = CHAR_SRC, cy = cut ? sh * .42 : 0;
      g.save(); if (f.hurtT > 0) g.filter = `brightness(${1 + f.hurtT * 1.6})`; else if (f.charT != null && (!f.alive || T - f.charT < 3)) { const c = f.alive ? 1 - (T - f.charT) / 3 : 1; g.filter = `brightness(${1 - .6 * c}) sepia(${.6 * c})`; } else if (f.hp < 100) g.filter = `saturate(${.55 + .45 * Math.max(0, f.hp) / 100})`; // (⚡ charred by chat's lightning)
      g.drawImage(c, sx, sy + cy, sw, sh - cy, x - PW * .06, top + PH * cy / sh, PW * 1.12, PH - PH * cy / sh);
      g.restore();
      if (cut) { g.fillStyle = '#b0101c'; for (let i = 0; i < 6; i++) { g.beginPath(); g.ellipse(x + PW * (i + .5) / 6, top + PH * cy / sh + 3 * s, 6 * s, 4 * s, 0, 0, 7); g.fill(); } }
      return;
    }
    const img = imgFor(f.image);
    g.save(); packPath(x, top, PW, PH, s, cut); g.clip();
    if (img) { const r = Math.max(PW / img.naturalWidth, PH / img.naturalHeight), w = img.naturalWidth * r, h = img.naturalHeight * r; g.drawImage(img, x + (PW - w) / 2, top + (PH - h) / 2, w, h); }
    else { const gr = g.createLinearGradient(x, top, x + PW, top + PH); gr.addColorStop(0, f.color); gr.addColorStop(1, '#1a0a2a'); g.fillStyle = gr; g.fillRect(x, top, PW, PH); g.fillStyle = 'rgba(255,255,255,.85)'; g.font = `800 ${Math.max(8, 11 * s)}px Inter, sans-serif`; g.textAlign = 'center'; g.fillText((f.name || '').slice(0, 12), x + PW / 2, top + PH * .78); }
    const gl = g.createLinearGradient(x, top, x + PW, top + PH * .6); gl.addColorStop(0, 'rgba(255,255,255,.35)'); gl.addColorStop(.35, 'rgba(255,255,255,0)'); g.fillStyle = gl; g.fillRect(x, top, PW, PH);
    for (const st of f.stains) { g.fillStyle = 'rgba(160,0,16,.82)'; g.beginPath(); g.ellipse(x + st.x * PW, top + st.y * PH, st.r * PW, st.r * PW * .8, 0, 0, 7); g.fill(); }
    if (f.hp < 100) { g.fillStyle = `rgba(90,0,0,${(1 - Math.max(0, f.hp) / 100) * .28})`; g.fillRect(x, top, PW, PH); }
    if (f.hurtT > 0) { g.fillStyle = `rgba(255,255,255,${f.hurtT})`; g.fillRect(x, top, PW, PH); }
    g.restore();
    g.strokeStyle = 'rgba(20,10,20,.85)'; g.lineWidth = 2.2 * s; packPath(x, top, PW, PH, s, cut); g.stroke();
    if (cut) { g.fillStyle = '#b0101c'; for (let i = 0; i < 6; i++) { g.beginPath(); g.ellipse(x + PW * (i + .5) / 6, top + cut + 3 * s, 6 * s, 4 * s, 0, 0, 7); g.fill(); } }
  }
  function drawWeapon(kind, x, y, face, s, ang) {
    g.save(); g.translate(x, y); g.rotate(ang); g.scale(face, 1);
    if (kind === 'sword') { g.fillStyle = '#dfe6ee'; g.fillRect(0, -3 * s, 64 * s, 6 * s); g.fillStyle = '#c8a040'; g.fillRect(-4 * s, -9 * s, 5 * s, 18 * s); g.fillStyle = '#5a2a10'; g.fillRect(-16 * s, -3 * s, 12 * s, 6 * s); }
    else if (kind === 'staff') { g.fillStyle = '#8a5a2a'; g.fillRect(-40 * s, -3 * s, 110 * s, 6 * s); }
    else if (kind === 'gladius' || kind === 'scimitar') { g.fillStyle = '#e4eaf0'; if (kind === 'gladius') g.fillRect(0, -3.5 * s, 44 * s, 7 * s); else { g.beginPath(); g.moveTo(0, -3 * s); g.quadraticCurveTo(30 * s, -8 * s, 54 * s, -18 * s); g.quadraticCurveTo(34 * s, 2 * s, 0, 4 * s); g.fill(); } g.fillStyle = '#c8a040'; g.fillRect(-4 * s, -8 * s, 5 * s, 16 * s); g.fillStyle = '#5a2a10'; g.fillRect(-14 * s, -3 * s, 10 * s, 6 * s); }
    else if (kind === 'spear' || kind === 'trident') { g.fillStyle = '#8a5a2a'; g.fillRect(-40 * s, -2.5 * s, 110 * s, 5 * s); g.fillStyle = '#d8dee6';
      if (kind === 'spear') { g.beginPath(); g.moveTo(70 * s, -7 * s); g.lineTo(92 * s, 0); g.lineTo(70 * s, 7 * s); g.fill(); }
      else { g.fillRect(68 * s, -12 * s, 4 * s, 24 * s); for (const yy of [-12, 0, 12]) { g.beginPath(); g.moveTo(70 * s, yy * s - 2.5 * s); g.lineTo(90 * s, yy * s); g.lineTo(70 * s, yy * s + 2.5 * s); g.fill(); } } }
    else if (kind === 'axe') { g.fillStyle = '#7a4a22'; g.fillRect(-10 * s, -3 * s, 62 * s, 6 * s); g.fillStyle = '#c8d0d8'; g.beginPath(); g.moveTo(40 * s, -2 * s); g.quadraticCurveTo(58 * s, -22 * s, 56 * s, -24 * s); g.quadraticCurveTo(66 * s, -8 * s, 58 * s, 10 * s); g.quadraticCurveTo(50 * s, 6 * s, 40 * s, 4 * s); g.fill(); }
    else if (kind === 'mace') { g.fillStyle = '#6a4a2a'; g.fillRect(-10 * s, -3 * s, 46 * s, 6 * s); g.fillStyle = '#8a929a'; g.beginPath(); g.arc(44 * s, 0, 12 * s, 0, 7); g.fill(); g.fillStyle = '#c8d0d8'; for (let i = 0; i < 8; i++) { const a = i / 8 * 6.28; g.beginPath(); g.moveTo(44 * s + Math.cos(a) * 10 * s, Math.sin(a) * 10 * s); g.lineTo(44 * s + Math.cos(a) * 19 * s, Math.sin(a) * 19 * s); g.lineTo(44 * s + Math.cos(a + .3) * 10 * s, Math.sin(a + .3) * 10 * s); g.fill(); } }
    else if (kind === 'flail') { g.fillStyle = '#6a4a2a'; g.fillRect(-10 * s, -3 * s, 34 * s, 6 * s); const a = Math.sin(T * 9) * .9 + .6, bx = 24 * s + Math.cos(a) * 30 * s, by = Math.sin(a) * 30 * s; g.strokeStyle = '#999'; g.lineWidth = 2.5 * s; g.setLineDash([4 * s, 3 * s]); g.beginPath(); g.moveTo(24 * s, 0); g.lineTo(bx, by); g.stroke(); g.setLineDash([]); g.fillStyle = '#5a6068'; g.beginPath(); g.arc(bx, by, 10 * s, 0, 7); g.fill(); g.fillStyle = '#c8d0d8'; for (let i = 0; i < 6; i++) { const q = i / 6 * 6.28; g.beginPath(); g.arc(bx + Math.cos(q) * 11 * s, by + Math.sin(q) * 11 * s, 2.5 * s, 0, 7); g.fill(); } }
    else if (kind === 'hammer') { g.fillStyle = '#7a4a22'; g.fillRect(-10 * s, -3 * s, 64 * s, 6 * s); g.fillStyle = '#7a828a'; g.fillRect(48 * s, -16 * s, 20 * s, 32 * s); g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(48 * s, -16 * s, 5 * s, 32 * s); }
    else if (kind === 'rifle') { // 🔫 a bolt-action rifle
      g.fillStyle = '#6a4222'; g.beginPath(); g.moveTo(-22 * s, -2 * s); g.lineTo(30 * s, -3 * s); g.lineTo(30 * s, 4 * s); g.lineTo(-8 * s, 5 * s); g.lineTo(-24 * s, 11 * s); g.closePath(); g.fill(); // stock
      g.fillStyle = '#2a2a2e'; g.fillRect(10 * s, -5 * s, 72 * s, 4 * s); g.fillRect(14 * s, -8 * s, 4 * s, 4 * s); g.fillRect(26 * s, -2 * s, 6 * s, 6 * s); // barrel, sight, bolt
    }
    else if (kind === 'cutlass' || kind === 'saber') { // 🏴‍☠️ a curved pirate sword with a gold guard
      const L = kind === 'saber' ? 66 : 50, bw = kind === 'saber' ? 4.5 : 7;
      g.fillStyle = '#e2e8ee'; g.beginPath(); g.moveTo(2 * s, -bw / 2 * s); g.quadraticCurveTo(L * .6 * s, -bw * .9 * s, L * s, -bw * 2.4 * s); g.quadraticCurveTo(L * .62 * s, bw * .7 * s, 2 * s, bw / 2 * s); g.closePath(); g.fill();
      g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 1.2 * s; g.beginPath(); g.moveTo(6 * s, -bw * .2 * s); g.quadraticCurveTo(L * .55 * s, -bw * .55 * s, L * .9 * s, -bw * 1.9 * s); g.stroke();
      g.strokeStyle = '#d4a82a'; g.lineWidth = 3 * s; g.beginPath(); g.arc(-4 * s, 2 * s, 9 * s, -Math.PI * .45, Math.PI * .6); g.stroke(); g.fillStyle = '#d4a82a'; g.fillRect(-1 * s, -8 * s, 4 * s, 16 * s); g.fillStyle = '#3a2210'; g.fillRect(-14 * s, -3 * s, 13 * s, 6 * s);
    }
    else if (kind === 'pin') { g.fillStyle = '#9a6a3a'; g.beginPath(); g.moveTo(-14 * s, -3 * s); g.lineTo(6 * s, -3.5 * s); g.lineTo(44 * s, -6.5 * s); g.quadraticCurveTo(50 * s, 0, 44 * s, 6.5 * s); g.lineTo(6 * s, 3.5 * s); g.lineTo(-14 * s, 3 * s); g.closePath(); g.fill(); g.fillStyle = '#6a4220'; g.fillRect(4 * s, -4.5 * s, 4 * s, 9 * s); } // 🪵 a belaying pin (a wooden club)
    else if (kind === 'oar') { g.fillStyle = '#a8784a'; g.fillRect(-26 * s, -2.5 * s, 92 * s, 5 * s); g.beginPath(); g.moveTo(60 * s, -2.5 * s); g.quadraticCurveTo(76 * s, -11 * s, 96 * s, -9 * s); g.lineTo(96 * s, 9 * s); g.quadraticCurveTo(76 * s, 11 * s, 60 * s, 2.5 * s); g.closePath(); g.fill(); g.strokeStyle = 'rgba(60,30,10,.5)'; g.lineWidth = 1.5 * s; g.stroke(); } // 🚣 an oar
    else if (kind === 'chair') { // 🪑 a folding steel chair
      g.strokeStyle = '#3a3f46'; g.lineWidth = 3 * s; g.lineCap = 'round';
      g.beginPath(); g.moveTo(8 * s, -4 * s); g.lineTo(2 * s, 26 * s); g.moveTo(40 * s, -4 * s); g.lineTo(46 * s, 26 * s); g.moveTo(10 * s, -2 * s); g.lineTo(44 * s, 24 * s); g.stroke();
      const cg = g.createLinearGradient(0, -34 * s, 0, 0); cg.addColorStop(0, '#c8d0da'); cg.addColorStop(1, '#7a838e'); g.fillStyle = cg;
      g.fillRect(6 * s, -34 * s, 36 * s, 22 * s); g.strokeRect(6 * s, -34 * s, 36 * s, 22 * s); g.fillRect(2 * s, -6 * s, 44 * s, 6 * s); g.strokeRect(2 * s, -6 * s, 44 * s, 6 * s);
    }
    else { g.strokeStyle = '#999'; g.lineWidth = 2 * s; g.beginPath(); g.moveTo(10 * s, 0); g.lineTo(24 * s, 10 * s); g.stroke(); g.fillStyle = '#3a2a1a'; g.fillRect(-14 * s, -3 * s, 26 * s, 6 * s); g.save(); g.translate(24 * s, 10 * s); g.rotate(Math.sin(T * 20) * .8); g.fillRect(0, -3 * s, 26 * s, 6 * s); g.restore(); }
    g.restore();
  }
  function drawFighter(f) {
    const s = S(f), X = f.x, Y = zY(f.z), PW = 74 * s, PH = 112 * s, LL = 44 * s, AL = 40 * s, gl = gnd(f);
    const pc = PIR() && f.team != null && CREW[f.team], overSea = PIR() && (f.swing || f.falling || !onDeck(f.x, f.z));
    if (!overSea) { g.fillStyle = 'rgba(0,0,0,.32)'; g.beginPath(); g.ellipse(X, Y - gl, PW * .62 * (1 - Math.min(.5, (f.h - gl) / 400)), 11 * s, 0, 0, 7); g.fill(); } // shadow
    if (pc && f.alive && !overSea && !FIN.on && mode !== 'won') { g.strokeStyle = pc.col; g.lineWidth = 4 * s; g.globalAlpha = .9; g.beginPath(); g.ellipse(X, Y - gl, PW * .66, 12.5 * s, 0, 0, 7); g.stroke(); g.globalAlpha = 1; } // 🏴‍☠️ a ring in their crew's colour
    g.save();
    const lieK = !f.alive ? Math.min(1, f.koT * 3) : f.heldBy ? f.lie : f.down > 0 ? 1 : 0; // knocked out, lying down, or lifted up flat
    if (lieK) { const py = Y - f.h; g.translate(X, py); g.rotate(-f.face * lieK * Math.PI / 2 * .95); g.translate(-X, -py); }
    if (!f.alive && f.koT > 5 && !f.out) g.globalAlpha = Math.max(.35, 1 - (f.koT - 5) * .2);
    const fy = Y - f.h, hip = fy - LL, top = hip - PH, a = f.atk, walk = Math.sin(f.ph), lean = a ? f.face * .1 : 0;
    g.translate(X, hip); g.rotate(lean); g.translate(-X, -hip);
    const LC = limbCol(f); g.strokeStyle = LC.leg; g.lineCap = 'round'; g.lineJoin = 'round';
    // legs
    for (const [k, side] of [['ll', -1], ['rl', 1]]) {
      const hx = X + side * PW * .22, front = side === f.face;
      if (!f.limbs[k]) { g.fillStyle = '#a0101a'; g.beginPath(); g.arc(hx, hip + 2 * s, 5 * s, 0, 7); g.fill(); continue; }
      let fx = hx + walk * 12 * s * side, fyy = fy - Math.max(0, Math.cos(f.ph) * side) * 6 * s;
      if (f.alive && a?.kind === 'kick' && front) { const u = Math.sin(Math.min(1, a.t / a.dur) * Math.PI); fx = hx + f.face * LL * 1.25 * u; fyy = hip + 4 * s - u * LL * .1 + (1 - u) * LL; }
      if (f.alive && a?.kind === 'jump') { fx = front ? hx + f.face * LL * 1.2 : hx - f.face * LL * .3; fyy = front ? hip + 6 * s : hip + LL * .6; }
      limb(hx, hip, fx, fyy, -f.face * 7 * s, 5.5 * s);
      g.fillStyle = LC.shoe; g.beginPath(); g.ellipse(fx + f.face * 4 * s, fyy, 10 * s, 5 * s, 0, 0, 7); g.fill(); // kung fu slipper
    }
    drawPackBody(f, X - PW / 2, top, PW, PH, s, f.head ? 0 : PH * .38);
    if (f.head) drawFace(f, X, top, PW, PH, s, f.target ? Math.sign(f.target.x - f.x) : f.face);
    // arms
    const sy = top + PH * .48; g.strokeStyle = LC.arm;
    for (const [k, side] of [['la', -1], ['ra', 1]]) {
      const shx = X + side * PW * .48, front = side === f.face;
      if (!f.limbs[k]) { g.fillStyle = '#a0101a'; g.beginPath(); g.arc(shx, sy, 5 * s, 0, 7); g.fill(); continue; }
      let hx = shx + f.face * (front ? 18 : 8) * s, hy = sy - (front ? 20 : 12) * s + walk * 2 * s; // guard up
      if (f.alive && a?.kind === 'punch' && front) { const u = Math.sin(Math.min(1, a.t / a.dur) * Math.PI); hx = shx + f.face * AL * (.4 + 1.25 * u); hy = sy - 6 * s; }
      if (f.alive && a?.kind === 'jump') { hx = shx - f.face * AL * .5; hy = sy - AL * .7; }
      if (f.block > 0) { hx = shx + f.face * 14 * s; hy = sy - 30 * s; }
      if (f.alive && a?.o) { hx = shx + f.face * 16 * s; hy = sy - 44 * s; } // 🤼 holding someone up
      if (f.alive && a?.kind === 'clothes' && front) { hx = shx + f.face * AL * 1.6; hy = sy - 4 * s; }
      if (f.alive && a?.kind === 'elbow' && front) { hx = shx + f.face * 6 * s; hy = sy + AL * .6; }
      if (!f.alive) { hx = shx + side * AL * .9; hy = sy + AL * .2; }
      limb(shx, sy, hx, hy, side * 6 * s, 5 * s);
      if (f.alive && a?.kind === 'cast' && front) { const u = Math.sin(Math.min(1, a.t / a.dur) * Math.PI); hx = shx + f.face * AL * (.5 + 1.1 * u); hy = sy - 14 * s - u * 10 * s; }
      if (front && f.weapon) drawWeapon(f.weapon, hx, hy, f.face, s, a?.kind === 'punch' || (WAR() && a?.kind === 'cast') ? 0 : WAR() ? -.35 : -.9);
      if (front && WAR() && f.flash > 0) { f.flash -= 1 / 60; g.fillStyle = '#ffe27a'; g.beginPath(); g.arc(hx + f.face * 86 * s, hy - 3 * s, 10 * s, 0, 7); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(hx + f.face * 86 * s, hy - 3 * s, 4 * s, 0, 7); g.fill(); } // muzzle flash
      if (front && WIZ() && f.head !== undefined) { const ang = a?.kind === 'cast' ? -.15 : -1; g.save(); g.translate(hx, hy); g.rotate(ang * f.face); g.strokeStyle = '#4a2a14'; g.lineWidth = 4 * s; g.beginPath(); g.moveTo(0, 0); g.lineTo(f.face * 34 * s, 0); g.stroke(); g.fillStyle = a?.kind === 'cast' ? '#fff' : '#c8a0ff'; g.beginPath(); g.arc(f.face * 36 * s, 0, (a?.kind === 'cast' ? 6 : 3.5) * s, 0, 7); g.fill(); g.restore(); g.strokeStyle = LC.arm; } // 🪄 the wand
      g.fillStyle = LC.hand; g.strokeStyle = '#151515'; g.lineWidth = 2 * s; g.beginPath(); g.arc(hx, hy, 6.5 * s, 0, 7); g.fill(); g.stroke(); g.strokeStyle = LC.arm;
    }
    g.restore();
    if (f.alive && mode !== 'won' && !FIN.on) { // health bar on top
      const bw = Math.max(46, 92 * s), bx = X - bw / 2, by = top - f.h * 0 - 20 * s - 10, hp = clamp(f.hp / 100, 0, 1);
      g.fillStyle = pc ? pc.col : 'rgba(0,0,0,.7)'; g.fillRect(bx - 2, by - 2, bw + 4, 11); if (pc) { g.fillStyle = 'rgba(0,0,0,.65)'; g.fillRect(bx, by, bw, 7); } g.fillStyle = hp > .5 ? '#46e05a' : hp > .25 ? '#ffd23a' : '#ff3a3a'; g.fillRect(bx, by, bw * hp, 7); // (🏴‍☠️ the bar's frame is their crew's colour)
      g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(bx, by, bw * hp, 2);
      if (F.length <= 24 || s > .8) { g.font = `800 ${Math.round(clamp(13 * s, 10, 18))}px Inter, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'bottom'; g.lineWidth = 3; g.strokeStyle = 'rgba(0,0,0,.8)'; const nm = (f.name || '').length > 22 ? f.name.slice(0, 21) + '…' : f.name; g.strokeText(nm, X, by - 3); g.fillStyle = pc ? pc.lt : '#fff'; g.fillText(nm, X, by - 3); }
    }
  }
  function drawFlyer(o) {
    const s = o.s; g.save(); g.translate(o.x, o.y); g.rotate(o.rot);
    if (o.kind === 'head') { // the top of the pack (with its face) spinning away
      const f = o.f, PW = 74 * s, PH = 112 * s, img = imgFor(f.image);
      if (f.char && CP()) { const c = charCanvas(f), [sx, sy, sw, sh] = CHAR_SRC; g.drawImage(c, sx, sy, sw, sh * .42, -PW * .56, -PH * .2, PW * 1.12, PH * .42); g.fillStyle = '#b0101c'; g.fillRect(-PW / 2, PH * .2, PW, 5 * s); g.restore(); return; } // 🧍 a character's head
      g.save(); g.beginPath(); g.rect(-PW / 2, -PH * .2, PW, PH * .38); g.clip();
      if (img) { const r = Math.max(PW / img.naturalWidth, PH / img.naturalHeight), w = img.naturalWidth * r, h = img.naturalHeight * r; g.drawImage(img, -w / 2, -PH * .2 + (PH - h) / 2, w, h); } else { g.fillStyle = f.color; g.fillRect(-PW / 2, -PH * .2, PW, PH); }
      g.restore(); g.strokeStyle = '#111'; g.lineWidth = 2 * s; g.strokeRect(-PW / 2, -PH * .2, PW, PH * .38);
      g.fillStyle = '#b0101c'; g.fillRect(-PW / 2, PH * .16, PW, 5 * s);
      g.lineWidth = 2.4 * s; for (const side of [-1, 1]) { const x = side * PW * .18, y = -PH * .2 + PH * .3; g.beginPath(); g.moveTo(x - 6 * s, y - 6 * s); g.lineTo(x + 6 * s, y + 6 * s); g.moveTo(x + 6 * s, y - 6 * s); g.lineTo(x - 6 * s, y + 6 * s); g.stroke(); }
    } else { g.strokeStyle = '#151515'; g.lineCap = 'round'; g.lineWidth = 5 * s; g.beginPath(); g.moveTo(-20 * s, 0); g.lineTo(20 * s, 0); g.stroke(); g.fillStyle = o.kind === 'arm' ? '#f2e0c4' : '#151515'; g.beginPath(); g.ellipse(22 * s, 0, 7 * s, 5 * s, 0, 0, 7); g.fill(); g.fillStyle = '#a0101a'; g.beginPath(); g.arc(-20 * s, 0, 4 * s, 0, 7); g.fill(); }
    g.restore();
  }

  // ---------- 🎥 the camera (like the ball battles: auto, follow a pack, zoom, move) ----------
  // auto = gently zooms in on where the packs are (closer as fewer are left); scroll / drag / click on the game, the buttons
  // under it, or keys (Q/E zoom, WASD move, Tab follow, O whole map, R auto) take over until you go back to 🎥 Auto
  const cam = { x: W / 2, y: H / 2, z: 1, manual: false, overview: false, follow: null, lost: 0, auto: true };
  // 🎬 (Derek, 1.51.0) the camera goes back to auto 8 s after your last camera key / mouse move; FINAL FIGHT does a 360° spin
  // around the last two, then settles back on the view from before; K.O.s get a quick punch-in; big hits shake the screen
  const CAM_IDLE = 8000; let camTouch = 0; const touch = () => { camTouch = performance.now(); };
  const cine = { rot: 0, orb: null, snap: null, quake: 0, punch: null, hit: null, saved: null, from: null }; // orb = the FINAL FIGHT camera's angle while it circles the last two (Derek: a horizontal 360, around them on the ground)
  const easeIO = u => u < .5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
  function quake(n) { cine.quake = Math.min(13, cine.quake + n * .5); } // (1.61.1, Derek: less shaky: half the shake it had)
  function onHit(x, y, dmg) { cine.hit = { x, y, t: performance.now() }; if (dmg >= 18) quake(Math.min(6, dmg * .2)); }
  function onKO(o) { quake(10); if (!cam.manual && !cam.follow && !cam.overview && alive().length > 2) cine.punch = { x: o.x, y: zY(o.z) - o.h - 70 * S(o), t: 0, dur: 1.4 }; }
  function finalCam() { // remember the view from before the FINAL FIGHT spin
    cine.saved = { x: cam.x, y: cam.y, z: cam.z, manual: cam.manual, follow: cam.follow, overview: cam.overview }; cine.from = null; cine.punch = null; cam.sg = null;
    cam.follow = null; cam.overview = false; cam.manual = false; cine.end = null;
  }
  const camClamp = () => { cam.z = clamp(cam.z, 1, 3.2); const hw = W / 2 / cam.z, hh = H / 2 / cam.z; cam.x = clamp(cam.x, hw, W - hw); cam.y = clamp(cam.y, hh, H - hh); };
  const fpos = f => [f.x, zY(f.z) - f.h - 70 * S(f)];
  function camGoal() {
    if (FIN.on && !cam.manual) { const h = FIN.camHint; FIN.camHint = null; const s = S(FIN.L), gy = zY(FIN.L.z), cx = (FIN.Lx + FIN.Wx) / 2, ph = FIN.phase; if (h && (ph === 'act' || ph === 'replay')) return { x: h.x, y: h.y, z: h.z }; if (ph === 'cel' || ph === 'done') return { x: FIN.endW ?? FIN.Wx, y: gy - 120 * s, z: 2.1 }; return { x: cx, y: gy - 120 * s, z: ph === 'replay' ? 2.05 : ph === 'stagger' ? 2.2 : 1.75 }; }
    if (mode === 'over' && winner && modeT < 1.7 && !cam.manual) { const [x, y] = fpos(winner); return { x, y, z: 2.3 }; } // 🏆 swoop in on the winner
    if (mode === 'replay' || mode === 'over') return { x: W / 2, y: H / 2, z: 1 }; // (the replay shows everyone)
    if (cam.follow) { const f = cam.follow; if (!F.includes(f)) cam.follow = null; else { const [x, y] = fpos(f); return { x, y, z: 2.1 }; } }
    if (cam.overview || mode === 'lobby' || mode === 'intro' || mode === 'won' || !cam.auto || !F.length) return { x: W / 2, y: H / 2, z: 1 };
    const se = PIR() && pir?.storm?.fx.find(e => e.kind === 'bolt' ? e.t < .9 : e.t < 2.3); // ⛈️ chat's storm power: pull back to show it (a wave / a tentacle: that whole ship; lightning: where it strikes)
    if (se) { if (se.kind !== 'bolt') return { x: se.s ? W * .62 : W * .38, y: 560, z: 1.06 }; const o = se.target != null ? F.find(x => x.id === se.target) : null, [x, y] = o ? fpos(o) : [se.x, zY(se.z)]; return { x, y: y - 80, z: 1.3 }; }
    const live = mode === 'final' && finalPair ? finalPair : alive(); if (!live.length) return { x: W / 2, y: H / 2, z: 1 };
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; for (const f of live) { const [x, y] = fpos(f); x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y - 90); y1 = Math.max(y1, y + 110); }
    let z = clamp(Math.min(W / (x1 - x0 + 520), H / (y1 - y0 + 420)), 1, live.length <= 2 ? (finalLeft > 0 ? 1.95 : 1.75) : 1.45), x = (x0 + x1) / 2, y = (y0 + y1) / 2;
    if (cine.punch) return { x: cine.punch.x, y: cine.punch.y, z: 1.9 }; // 💥 a punch-in on a K.O.
    const h = cine.hit, age = h ? (performance.now() - h.t) / 1000 : 9;
    if (age < 1.6 && live.length > 2) { const k = .12 * (1 - age / 1.6); x += (h.x - x) * k; y += (h.y - y) * k; z += .04 * (1 - age / 1.6); } // leans a little toward the latest big hit
    if (finalLeft > 0 && finalLeft < 5) z += (5 - finalLeft) * .06; // the last seconds of the final fight: slowly pushes in
    const n = performance.now() / 1000; z *= 1 + .008 * Math.sin(n / 2.6); x += 5 * Math.sin(n / 4.2); // (it breathes a tiny bit: never a dead still shot)
    return { x, y, z };
  }
  function spinCam() { // 🥊 FINAL FIGHT (1.61.4, Derek's drawing): the camera walks a full circle around the last two, who stand still in the middle; the map is copied all the way round
    const [a, b] = finalPair, [ax, ay] = fpos(a), [bx, by] = fpos(b), px = (ax + bx) / 2, py = (ay + by) / 2 - 10;
    const S0 = .7, S1 = FINAL_INTRO - 1.9, t = modeT - (PIR() ? KRAKEN_T : 0), zz = clamp(1750 / (Math.abs(bx - ax) + 520), 1.2, 1.7); // (close in, both always fit)
    if (t < 0) return pirKrakenCam(modeT); // 🐙 first the kraken scene
    if (t < S0) { const k = easeIO(t / S0); cine.from ||= { x: cam.x, y: cam.y, z: cam.z }; cine.rot = 0; cine.orb = null; cam.x = cine.from.x + (px - cine.from.x) * k; cam.y = cine.from.y + (py - cine.from.y) * k; cam.z = cine.from.z + (zz - cine.from.z) * k; return; }
    if (t < S1) { if (!cine.orbit) cine.orbit = { px, yp: zY((a.z + b.z) / 2) }; cine.orb = easeIO((t - S0) / (S1 - S0)) * Math.PI * 2; cine.rot = 0; cam.x = px; cam.y = py; cam.z = zz; return; }
    cine.orb = null; cine.orbit = null; cine.rot = 0; const sv = cine.saved, goal = sv?.manual && !PIR() ? sv : camGoal(), k = easeIO(Math.min(1, (t - S1) / (FINAL_INTRO - S1 - .3))); // (🏴‍☠️ the map changed under a camera you'd moved: back to the two)
    cine.end ||= { x: cam.x, y: cam.y, z: cam.z }; cam.x = cine.end.x + (goal.x - cine.end.x) * k; cam.y = cine.end.y + (goal.y - cine.end.y) * k; cam.z = cine.end.z + (goal.z - cine.end.z) * k;
  }
  // The orbit, faked in 2D like a camera on a circular track around them (Derek's drawing): a picture of the whole stage (sky,
  // buildings, floor, blood) is taken once and copied all the way round (ORB_COPIES copies = one full circle). Turning the camera
  // slides it sideways: the scenery and the far floor slide one way, the floor right under the two doesn't move, and the floor in
  // front of them slides the other way (closer = faster), like a real camera walking around them. The two don't move.
  const ORB_COPIES = 4;
  const orbitKeep = () => RUMBLE() ? [[ringL(0) - 16, GY0 - 118], [ringR(0) + 16, GY0 - 118], [ringR(1) + 150, H + 60], [ringL(1) - 150, H + 60]] // (the ring, posts and all)
    : WIZ() ? [[platL(0) - 8, GY0 - 8], [platR(0) + 8, GY0 - 8], [platR(1) + 8, GY1 + 52], [W / 2 + 60, GY1 + 190], [W / 2 - 60, GY1 + 190], [platL(1) - 8, GY1 + 52]] : null; // (the platform and the rock under it)
  function pirOrbit(now, shift) { // 🏴‍☠️ the sea and the sky go round (copies of the background side by side), the ship they're on stays still, they stand still on it
    const x0 = cam.x - W / 2 / cam.z - 4, x1 = cam.x + W / 2 / cam.z + 4, top = cam.y - H / 2 / cam.z - 20, s = pir.safe;
    for (let m = Math.floor((x0 + shift) / W); m <= Math.floor((x1 + shift) / W) + 1; m++) { const sx = m * W - shift; g.drawImage(bg, 0, 0, bg.width, bg.height, sx, 0, W, H); const gr = g.createLinearGradient(sx - 120, 0, sx + 120, 0); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(.5, 'rgba(0,0,0,.3)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(sx - 120, Math.min(0, top), 240, H + 60); }
    g.drawImage(pirShipImg(s), 0, 0, W, H); pirFigure(s); for (const c of pir.cannons) if (c.s === s) pirCannon(c); g.drawImage(crat, 0, 0); g.drawImage(floor, 0, 0);
    for (const f of [...finalPair, ...MASTS[s]].sort((p, q) => p.z - q.z)) f.mast ? drawMast(f.mast, now) : drawFighter(f);
    pirSternRail(s);
  }
  function drawOrbit(now, k) {
    const o = cine.orbit, ang = cine.orb, hz = GY0 - 4, yp = Math.max(hz + 60, o.yp), shift = ang / (Math.PI * 2) * ORB_COPIES * W;
    if (PIR() && pir?.safe != null) return pirOrbit(now, shift);
    if (!o.snap) { // 📸 the stage as it is now (drawn on the screen once, then kept)
      g.save(); g.setTransform(k, 0, 0, k, 0, 0); drawStage(now, false); g.restore();
      const c = document.createElement('canvas'); c.width = cv.width; c.height = cv.height; c.getContext('2d').drawImage(cv, 0, 0); o.snap = c; o.sk = cv.width / W;
    }
    const snap = o.snap, sk = o.sk, x0 = cam.x - W / 2 / cam.z - 4, x1 = cam.x + W / 2 / cam.z + 4;
    const band = (y0, y1, sh, ty0 = y0, ty1 = y1) => { // one horizontal slice of the picture, copied side by side and slid by sh
      const m0 = Math.floor((x0 + sh) / W), m1 = Math.floor((x1 + sh) / W);
      for (let m = m0; m <= m1; m++) g.drawImage(snap, 0, y0 * sk, W * sk, (y1 - y0) * sk, m * W - sh, ty0, W, ty1 - ty0);
    };
    const top = cam.y - H / 2 / cam.z - 20, bot = cam.y + H / 2 / cam.z + 20, keep = orbitKeep();
    const joins = y1 => { const m0 = Math.floor((x0 + shift) / W), m1 = Math.floor((x1 + shift) / W); for (let m = m0; m <= m1 + 1; m++) { const sx = m * W - shift, gr = g.createLinearGradient(sx - 120, 0, sx + 120, 0); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(.5, 'rgba(0,0,0,.35)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(sx - 120, top, 240, y1 - top); } }; // (soft joins between the copies)
    if (keep) { // 🔔🧙 the ring / the floating platform turns as one piece with them in the middle: everything around it (crowd, sky) goes round
      band(0, H, shift, Math.min(0, top), Math.max(H, bot)); joins(Math.max(H, bot));
      g.save(); g.beginPath(); keep.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); g.clip(); g.drawImage(snap, 0, 0, snap.width, snap.height, 0, 0, W, H); g.restore();
    } else {
      band(0, hz, shift, Math.min(0, top), hz); // the scenery behind (stretched up if the camera shows above the picture)
      joins(hz);
      const STRIP = 6; // the floor, slice by slice: k = 1 at the horizon, 0 under the two, below 0 in front of them
      for (let y = hz; y < Math.max(H, bot); y += STRIP) { const yy = Math.min(y, H - STRIP), kk = 1 - (y + STRIP / 2 - hz) / (yp - hz); band(yy, yy + STRIP, shift * kk, y, y + STRIP + 1); }
    }
    for (const f of [...finalPair].sort((p, q) => p.z - q.z)) drawFighter(f); // the two: they stand still (the far one first)
  }

  function camStep(dt) {
    if (cine.quake > .2) cine.quake *= Math.pow(.03, dt); else cine.quake = 0;
    if (mode === 'final' && finalPair) { spinCam(); return; }
    if (cine.saved) { const sv = cine.saved; cine.saved = null; cam.sg = null; cine.end = null; cine.rot = 0; cine.orb = null; cine.orbit = null; cine.snap = null; if (sv.manual) { cam.manual = true; } else { cam.follow = sv.follow && sv.follow.alive ? sv.follow : null; cam.overview = sv.overview; } } // (back to how it was)
    if (cine.punch && (cine.punch.t += dt) > cine.punch.dur) cine.punch = null;
    if ((cam.manual || cam.follow || cam.overview) && camTouch && performance.now() - camTouch > CAM_IDLE) { cam.manual = false; cam.follow = null; cam.overview = false; camTouch = 0; } // 🎥 left alone: back to auto
    if (cam.follow && !cam.follow.alive) { cam.lost += dt; if (cam.lost > 1.4) { cam.follow = null; cam.lost = 0; } } else cam.lost = 0;
    if (!cam.manual) { // (1.61.1, Derek: less shaky) the goal is smoothed and small changes ignored, then the camera eases to it
      const g2 = camGoal(), sg = cam.sg || (cam.sg = { ...g2 }), quick = cine.punch || cam.follow || FIN.on || mode === 'over', kg = Math.min(1, dt * (quick ? 6 : 1.1)), k = Math.min(1, dt * (cine.punch ? 3.2 : cam.follow ? 3.5 : 1.5));
      if (quick || Math.abs(g2.z - sg.z) / sg.z > .02) sg.z += (g2.z - sg.z) * kg;
      if (quick || Math.hypot(g2.x - sg.x, g2.y - sg.y) > 22 / cam.z) { sg.x += (g2.x - sg.x) * kg; sg.y += (g2.y - sg.y) * kg; }
      cam.z += (sg.z - cam.z) * k; cam.x += (sg.x - cam.x) * k; cam.y += (sg.y - cam.y) * k;
    } else cam.sg = null;
    camClamp();
  }
  const camApply = () => {
    let sx = 0, sy = 0; if (cine.quake > .2) { const q = cine.quake * Math.max(0, Math.min(2, (GFX.shake ?? 100) / 100)); sx = (Math.random() - .5) * 2 * q; sy = (Math.random() - .5) * 2 * q; }
    g.translate(W / 2 + sx, H / 2 + sy); if (cine.rot) g.rotate(cine.rot); g.scale(cam.z, cam.z); g.translate(-cam.x, -cam.y);
  };
  const toWorld = (px, py) => { const dx = px - W / 2, dy = py - H / 2, c = Math.cos(-cine.rot), s2 = Math.sin(-cine.rot); return [cam.x + (dx * c - dy * s2) / cam.z, cam.y + (dx * s2 + dy * c) / cam.z]; };
  function camZoomAt(px, py, f) { touch(); const [wx, wy] = toWorld(px, py); cam.follow = null; cam.overview = false; cam.manual = true; cam.z = clamp(cam.z * f, 1, 3.2); cam.x = wx - (px - W / 2) / cam.z; cam.y = wy - (py - H / 2) / cam.z; camClamp(); }
  const followable = () => F.filter(f => f.alive).sort((a, b) => a.x - b.x);
  function camCmd(a) {
    if (a !== 'auto' && a !== 'reset') touch(); else camTouch = 0;
    if (a === 'next' || a === 'prev') { const l = followable(); if (!l.length) return; const i = cam.follow ? l.indexOf(cam.follow) : -1; cam.follow = l[(i + (a === 'next' ? 1 : -1) + l.length) % l.length]; cam.manual = false; cam.overview = false; return; }
    if (a === 'overview') { cam.follow = null; cam.manual = false; cam.overview = true; return; }
    if (a === 'auto' || a === 'reset') { cam.follow = null; cam.manual = false; cam.overview = false; return; }
    if (a === 'in') return camZoomAt(W / 2, H / 2, 1.25); if (a === 'out') return camZoomAt(W / 2, H / 2, 1 / 1.25);
    if (a === 'left' || a === 'right' || a === 'up' || a === 'down') { cam.manual = true; cam.follow = null; cam.overview = false; const d = 140 / cam.z; if (a === 'left') cam.x -= d; if (a === 'right') cam.x += d; if (a === 'up') cam.y -= d; if (a === 'down') cam.y += d; camClamp(); }
  }
  // the mouse on the card fight (it sits on top of the ball game, so the ball camera doesn't get these)
  const toCv = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * W / r.width, (e.clientY - r.top) * H / r.height]; };
  let cdrag = null;
  layer.addEventListener('wheel', e => { e.preventDefault(); e.stopPropagation(); const [x, y] = toCv(e); camZoomAt(x, y, Math.pow(1.0015, -e.deltaY)); }, { passive: false });
  layer.addEventListener('pointerdown', e => { e.stopPropagation(); if (e.button === 0) cdrag = { x: e.clientX, y: e.clientY, moved: false }; });
  layer.addEventListener('pointermove', e => { if (!cdrag) return; const r = cv.getBoundingClientRect(), dx = (e.clientX - cdrag.x) * W / r.width, dy = (e.clientY - cdrag.y) * H / r.height;
    if (!cdrag.moved && Math.hypot(dx, dy) < 4) return; cdrag.moved = true; touch(); cam.manual = true; cam.follow = null; cam.overview = false; cam.x -= dx / cam.z; cam.y -= dy / cam.z; camClamp(); cdrag.x = e.clientX; cdrag.y = e.clientY; });
  layer.addEventListener('pointerup', e => { e.stopPropagation(); const d = cdrag; cdrag = null; if (!d || d.moved) return;
    const [wx, wy] = toWorld(...toCv(e)); let best = null, bd = 1e9; for (const f of F) if (f.alive) { const [x, y] = fpos(f), dd = Math.hypot(x - wx, y - wy); if (dd < bd) { bd = dd; best = f; } }
    if (best && bd < 110 * S(best)) { touch(); cam.follow = best; cam.manual = false; cam.overview = false; } else if (cam.follow) cam.follow = null; });
  for (const ev of ['click', 'dblclick']) layer.addEventListener(ev, e => { e.stopPropagation(); if (ev === 'dblclick') camCmd('auto'); });

  // ---------- 🎞️ the frame ----------
  let lastFrame = 0;
  // ---------- 🪖 WW2 Battlefield (drawn once) + tanks, planes, shells, bullets ----------
  function drawBgWar(k) {
    const c = document.createElement('canvas'); c.width = W * k; c.height = H * k; const b = c.getContext('2d'); b.scale(k, k);
    const sky = b.createLinearGradient(0, 0, 0, GY0); sky.addColorStop(0, '#3a3a40'); sky.addColorStop(.5, '#6a6458'); sky.addColorStop(1, '#a08a68'); b.fillStyle = sky; b.fillRect(0, 0, W, GY0 + 5); // a gray, smoky sky
    for (let i = 0; i < 40; i++) { b.fillStyle = `rgba(${Math.floor(vr(40, 80))},${Math.floor(vr(38, 70))},${Math.floor(vr(34, 60))},${vr(.15, .35)})`; b.beginPath(); b.ellipse(vr(0, W), vr(40, 380), vr(80, 220), vr(30, 70), 0, 0, 7); b.fill(); }
    for (const x of [380, 1150, 1700]) { const gl = b.createRadialGradient(x, GY0 - 40, 10, x, GY0 - 40, 260); gl.addColorStop(0, 'rgba(255,140,40,.45)'); gl.addColorStop(1, 'rgba(255,90,20,0)'); b.fillStyle = gl; b.fillRect(x - 260, GY0 - 300, 520, 300); for (let i = 0; i < 9; i++) { b.fillStyle = `rgba(40,36,34,${.5 - i * .04})`; b.beginPath(); b.arc(x + i * 18 + vr(-10, 10), GY0 - 120 - i * 52, 40 + i * 12, 0, 7); b.fill(); } } // fires far away with smoke going up
    b.fillStyle = '#3a3630'; b.beginPath(); b.moveTo(0, GY0); for (let x = 0; x <= W; x += 30) b.lineTo(x, GY0 - 70 - Math.abs(Math.sin(x / 140)) * 40 - Math.sin(x / 37) * 8); b.lineTo(W, GY0); b.fill(); // hills
    const ruin = (x, w, h) => { b.fillStyle = '#2e2a26'; b.beginPath(); b.moveTo(x, GY0 - 20); b.lineTo(x, GY0 - h); b.lineTo(x + w * .3, GY0 - h + 20); b.lineTo(x + w * .45, GY0 - h * .7); b.lineTo(x + w * .7, GY0 - h * .85); b.lineTo(x + w, GY0 - h * .4); b.lineTo(x + w, GY0 - 20); b.fill(); b.fillStyle = 'rgba(255,170,90,.35)'; for (let i = 0; i < 4; i++) b.fillRect(x + 14 + i * w * .2, GY0 - h * .55, 12, 16); }; // bombed-out buildings
    ruin(80, 200, 230); ruin(620, 160, 180); ruin(1320, 240, 250); ruin(1760, 160, 170);
    b.strokeStyle = '#2a2622'; b.lineWidth = 3; for (let x = 40; x < W; x += 120) { b.beginPath(); b.moveTo(x, GY0 + 6); b.lineTo(x, GY0 - 40); b.stroke(); } b.lineWidth = 1.5; for (let i = 0; i < 3; i++) { b.beginPath(); for (let x = 40; x < W; x += 12) b.lineTo(x, GY0 - 34 + i * 12 + Math.sin(x / 9) * 3); b.stroke(); } // barbed wire along the back
    const gd = b.createLinearGradient(0, GY0, 0, H); gd.addColorStop(0, '#6a5a42'); gd.addColorStop(1, '#4a3c2a'); b.fillStyle = gd; b.fillRect(0, GY0, W, H - GY0); // mud
    for (let i = 0; i < 400; i++) { b.fillStyle = `rgba(${Math.random() < .5 ? '30,22,14' : '140,120,90'},${vr(.05, .15)})`; b.beginPath(); b.ellipse(vr(0, W), vr(GY0, H), vr(4, 22), vr(2, 6), 0, 0, 7); b.fill(); }
    for (let i = 0; i < 9; i++) { const x = vr(100, W - 100), y = vr(GY0 + 30, H - 40), s = .7 + (y - GY0) / (H - GY0) * .5; b.fillStyle = 'rgba(30,22,14,.4)'; b.beginPath(); b.ellipse(x, y, 60 * s, 16 * s, 0, 0, 7); b.fill(); } // old craters
    const bags = (x0, y0, n, s) => { for (let r = 0; r < 3; r++) for (let i = 0; i < n - r; i++) { const x = x0 + (i + r * .5) * 46 * s, y = y0 - r * 18 * s; b.fillStyle = r % 2 ? '#8a7a56' : '#9a8a62'; b.beginPath(); b.ellipse(x, y, 24 * s, 11 * s, 0, 0, 7); b.fill(); b.strokeStyle = 'rgba(0,0,0,.25)'; b.lineWidth = 1.5; b.stroke(); } }; // sandbag walls at the sides
    bags(20, GY0 + 60, 4, 1); bags(1730, GY0 + 70, 4, 1); bags(10, H - 30, 5, 1.2); bags(1640, H - 30, 5, 1.2);
    return c;
  }
  function drawTank(tk, t) { // 🛞 a tank (no flags or markings: just a number)
    const x = tk.x, y = GY0 - 4, d = -tk.side, rc = tk.recoil * 10;
    g.save(); g.translate(x, y);
    g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(0, 6, 150, 18, 0, 0, 7); g.fill();
    g.fillStyle = '#2a2a24'; g.beginPath(); g.roundRect?.(-140, -40, 280, 44, 22); g.fill(); g.fillStyle = '#4a4a40'; for (let i = 0; i < 7; i++) { g.beginPath(); g.arc(-108 + i * 36, -18, 14, 0, 7); g.fill(); } // tracks + wheels
    g.fillStyle = '#5a6a3a'; g.beginPath(); g.moveTo(-150, -40); g.lineTo(150, -40); g.lineTo(126, -84); g.lineTo(-126, -84); g.fill(); // hull
    g.save(); g.translate(0, -84); const a = clamp(tk.aim || 0, -.5, .5) * (d > 0 ? 1 : -1); g.fillStyle = '#4e5c32'; g.beginPath(); g.ellipse(0, 0, 70, 30, 0, Math.PI, 0); g.fill(); g.fillRect(-70, -2, 140, 8);
    g.save(); g.scale(d, 1); g.rotate(Math.abs(a) * .3); g.fillStyle = '#3a4426'; g.fillRect(40 - rc, -16, 130, 12); g.fillRect(160 - rc, -19, 18, 18); g.restore(); // the gun
    g.fillStyle = '#e8e0c0'; g.font = `700 22px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(tk.side < 0 ? '07' : '12', -24 * d, -12); g.restore();
    if (tk.recoil > .7) { g.fillStyle = 'rgba(255,220,120,.9)'; g.beginPath(); g.arc(d * 190, -98, 26 * tk.recoil, 0, 7); g.fill(); g.fillStyle = 'rgba(90,86,80,.5)'; g.beginPath(); g.arc(d * 210, -110, 40, 0, 7); g.fill(); }
    g.restore();
  }
  function drawTanks(t, front) { // the tanks behind the fight, and the warnings on the ground (crosshairs for shells, shadows for bombs)
    for (const tk of tanks) drawTank(tk, t);
    for (const s of shells) if (!s.done) { const y = zY(s.z), r = (40 + 30 * s.z) * (1 + Math.sin(t * 20) * .08); g.strokeStyle = 'rgba(255,60,40,.9)'; g.lineWidth = 3; g.beginPath(); g.ellipse(s.x, y, r * 1.6, r * .45, 0, 0, 7); g.stroke(); g.beginPath(); g.moveTo(s.x - r * 2, y); g.lineTo(s.x + r * 2, y); g.moveTo(s.x, y - r * .7); g.lineTo(s.x, y + r * .7); g.stroke(); }
    for (const b of bombs) if (!b.done && b.t < 1.6) { const y = zY(b.z), k = 1 - b.t / 1.6; g.fillStyle = `rgba(0,0,0,${.15 + .35 * k})`; g.beginPath(); g.ellipse(b.x, y, 30 + 40 * k, 8 + 10 * k, 0, 0, 7); g.fill(); }
  }
  function drawWar(t) { // bullets, falling shells and bombs, and the planes overhead
    for (const b of bolts) { const y = zY(b.z) - b.h; g.strokeStyle = 'rgba(255,230,140,.9)'; g.lineWidth = 3; g.beginPath(); g.moveTo(b.x, y); g.lineTo(b.x - Math.sign(b.vx) * 46, y); g.stroke(); }
    for (const s of shells) if (!s.done && s.t < .45) { const k = 1 - s.t / .45, y = zY(s.z) - 600 * (1 - k); g.fillStyle = '#2a2a2a'; g.beginPath(); g.ellipse(s.x, y, 8, 16, 0, 0, 7); g.fill(); g.strokeStyle = 'rgba(255,200,120,.6)'; g.lineWidth = 4; g.beginPath(); g.moveTo(s.x, y - 16); g.lineTo(s.x, y - 80); g.stroke(); }
    for (const b of bombs) if (!b.done && b.t < .9) { const k = 1 - b.t / .9, y = 200 + (zY(b.z) - 200) * k; g.save(); g.translate(b.x, y); g.fillStyle = '#3a3a34'; g.beginPath(); g.ellipse(0, 0, 9, 20, 0, 0, 7); g.fill(); g.fillRect(-10, -26, 20, 6); g.restore(); }
    for (const p of planes) { g.save(); g.translate(p.x, p.y); g.scale(p.dir, 1); // ✈️ a propeller bomber (no markings)
      g.fillStyle = '#5a6248'; g.beginPath(); g.ellipse(0, 0, 130, 22, 0, 0, 7); g.fill(); g.fillStyle = '#4a5238'; g.beginPath(); g.moveTo(-30, -4); g.lineTo(40, -4); g.lineTo(10, -110); g.lineTo(-20, -110); g.fill(); g.beginPath(); g.moveTo(-30, 4); g.lineTo(40, 4); g.lineTo(10, 60); g.lineTo(-20, 60); g.fill(); // body + wings
      g.beginPath(); g.moveTo(-110, -2); g.lineTo(-140, -50); g.lineTo(-120, -50); g.lineTo(-90, -4); g.fill(); g.fillStyle = 'rgba(180,220,255,.7)'; g.beginPath(); g.ellipse(90, -8, 22, 10, 0, 0, 7); g.fill();
      g.fillStyle = 'rgba(40,40,40,.5)'; for (const yy of [-70, 30]) { g.beginPath(); g.ellipse(30, yy, 4, 20 * Math.abs(Math.sin(t * 40)), 0, 0, 7); g.fill(); } g.restore(); }
  }
  // ---------- 🏴‍☠️ Pirate Battle drawing: the sea (drawn once), the two ships (each drawn once), masts, cannons, the kraken ----------
  const shadeC = (h, a) => { const n = parseInt(String(h).slice(1), 16), f = v => clamp(Math.round(v + a * 2.55), 0, 255); return `rgb(${f(n >> 16)},${f(n >> 8 & 255)},${f(n & 255)})`; };
  const BOW_Z = -.28, ROPE_Y = 376, HZ = 548; // the bow's point, where the swing ropes hang from, the horizon
  const MASTS = [0, 1].map(s => [.2, .62].map((z, i) => ({ mast: { s, i, z }, alive: true, z })));
  const pirMasts = () => [0, 1].filter(s => pirS().sunk !== s).flatMap(s => MASTS[s]);
  const krT = () => mode === 'final' && pir?.kr ? modeT : 99; // (seconds into the kraken scene)
  function skull(c, x, y, r, col, hole) { // ☠️ a skull and crossbones (drawn, so it looks the same on every computer)
    c.save(); c.strokeStyle = col; c.fillStyle = col; c.lineCap = 'round'; c.lineWidth = r * .26;
    for (const d of [-1, 1]) { c.beginPath(); c.moveTo(x - r * 1.05 * d, y + r * .05); c.lineTo(x + r * 1.05 * d, y + r * 1.05); c.stroke(); for (const [ex, ey] of [[x - r * 1.05 * d, y + r * .05], [x + r * 1.05 * d, y + r * 1.05]]) for (const k of [-1, 1]) { c.beginPath(); c.arc(ex + k * r * .1, ey - d * k * r * .1, r * .16, 0, 7); c.fill(); } }
    c.beginPath(); c.arc(x, y - r * .12, r * .64, 0, 7); c.fill(); c.fillRect(x - r * .36, y + r * .25, r * .72, r * .38);
    c.fillStyle = hole; for (const d of [-1, 1]) { c.beginPath(); c.ellipse(x + d * r * .25, y - r * .1, r * .17, r * .2, 0, 0, 7); c.fill(); }
    c.beginPath(); c.moveTo(x, y + r * .08); c.lineTo(x - r * .08, y + r * .22); c.lineTo(x + r * .08, y + r * .22); c.fill(); for (const d of [-.16, 0, .16]) c.fillRect(x + d * r - r * .03, y + r * .42, r * .06, r * .2);
    c.restore();
  }
  function drawBgSea(k) { // ⛈️ a big storm (1.70.0, Derek; it was a sunset): black storm clouds, grey rain far away and a rough sea (rain, lightning and big waves move on top)
    const c = document.createElement('canvas'); c.width = W * k; c.height = H * k; const b = c.getContext('2d'); b.scale(k, k);
    const sky = b.createLinearGradient(0, 0, 0, HZ); sky.addColorStop(0, '#06080e'); sky.addColorStop(.45, '#141a27'); sky.addColorStop(.8, '#283142'); sky.addColorStop(1, '#45516a'); b.fillStyle = sky; b.fillRect(0, 0, W, HZ + 2);
    const glow = b.createRadialGradient(GAPX, HZ - 30, 10, GAPX, HZ - 30, 540); glow.addColorStop(0, 'rgba(150,170,195,.32)'); glow.addColorStop(1, 'rgba(150,170,195,0)'); b.fillStyle = glow; b.fillRect(GAPX - 540, HZ - 420, 1080, 422); // (a little light far away)
    const cloud = (x, y, w, d) => { for (let j = 0; j < 7; j++) { const cx = x + (j - 3) * w * .16 + vr(-12, 12), cy = y + vr(-14, 14) + Math.abs(j - 3) * 5, rx = w * vr(.14, .22), ry = w * vr(.07, .11);
      const gr = b.createLinearGradient(0, cy - ry, 0, cy + ry); gr.addColorStop(0, `rgba(${d},${d + 4},${d + 12},.96)`); gr.addColorStop(1, `rgba(${d + 38},${d + 44},${d + 58},.92)`); b.fillStyle = gr; b.beginPath(); b.ellipse(cx, cy, rx, ry, 0, 0, 7); b.fill(); } };
    for (let i = 0; i < 16; i++) cloud(vr(-100, W + 100), vr(-40, 140), vr(320, 620), Math.floor(vr(12, 26))); // (the top: almost black)
    for (let i = 0; i < 15; i++) cloud(vr(-100, W + 100), vr(150, 390), vr(220, 460), Math.floor(vr(28, 46)));
    for (let i = 0; i < 8; i++) { const x = vr(-80, W), w = vr(80, 230), gr = b.createLinearGradient(0, 250, 0, HZ); gr.addColorStop(0, 'rgba(120,130,150,0)'); gr.addColorStop(.5, 'rgba(120,130,150,.15)'); gr.addColorStop(1, 'rgba(120,130,150,.26)'); b.fillStyle = gr; b.beginPath(); b.moveTo(x, 250); b.lineTo(x + w, 250); b.lineTo(x + w + 80, HZ); b.lineTo(x + 80, HZ); b.fill(); } // rain curtains far away
    const isle = (x, w, h) => { b.fillStyle = 'rgba(12,16,24,.96)'; b.beginPath(); b.moveTo(x - w, HZ + 1); b.quadraticCurveTo(x - w * .5, HZ - h, x, HZ - h * .9); b.quadraticCurveTo(x + w * .5, HZ - h * 1.1, x + w, HZ + 1); b.fill(); b.strokeStyle = 'rgba(12,16,24,.96)'; b.lineWidth = 3;
      for (const dd of [-.3, .22]) { const px = x + w * dd, py = HZ - h * .95; b.beginPath(); b.moveTo(px, py); b.quadraticCurveTo(px + 10, py - h * .7, px + 12, py - h); b.stroke(); for (let a = 0; a < 5; a++) { b.beginPath(); b.moveTo(px + 12, py - h); b.quadraticCurveTo(px + 22 + Math.cos(a * 1.25) * 18, py - h - 8, px + 26 + Math.cos(a * 1.25) * 28, py - h + 12); b.stroke(); } } }; // (with palm trees bent by the wind)
    isle(230, 120, 34); isle(1720, 160, 46); isle(1390, 60, 18);
    const sea = b.createLinearGradient(0, HZ, 0, H); sea.addColorStop(0, '#3a485c'); sea.addColorStop(.08, '#213248'); sea.addColorStop(.5, '#122234'); sea.addColorStop(1, '#07121e'); b.fillStyle = sea; b.fillRect(0, HZ, W, H - HZ);
    for (let i = 0; i < 380; i++) { const y = HZ + Math.pow(Math.random(), 1.3) * (H - HZ), q = (y - HZ) / (H - HZ); b.strokeStyle = `rgba(${Math.random() < .55 ? '150,175,200' : '3,10,20'},${vr(.12, .35)})`; b.lineWidth = 1 + q * 3; const x = vr(0, W), w = 12 + q * 80; b.beginPath(); b.moveTo(x - w, y + q * 6); b.quadraticCurveTo(x, y - 5 - q * 12, x + w, y + q * 6); b.stroke(); } // big rough waves
    for (let i = 0; i < 130; i++) { const y = HZ + Math.pow(Math.random(), 1.2) * (H - HZ), q = (y - HZ) / (H - HZ); b.fillStyle = `rgba(228,238,248,${vr(.14, .42)})`; b.beginPath(); b.ellipse(vr(0, W), y, vr(6, 26) * (1 + q * 1.5), vr(1.5, 3.5) * (1 + q), 0, 0, 7); b.fill(); } // whitecaps
    return c;
  }
  function pirDeckPath(c, s, grow = 0) { // the deck's outline: the outer side from the bow to the stern, across the stern, the inner side back, round the bow to its point
    const o = s ? 1 : -1, outer = z => (s ? deckHi(1, z) : deckLo(0, z)) + o * grow, inner = z => (s ? deckLo(1, z) : deckHi(0, z)) - o * grow, n = 14; c.beginPath();
    for (let i = 0; i <= n; i++) c.lineTo(outer(i / n), zY(i / n));
    c.lineTo(outer(1), zY(1) + grow); c.lineTo(inner(1), zY(1) + grow);
    for (let i = n; i >= 0; i--) c.lineTo(inner(i / n), zY(i / n));
    c.quadraticCurveTo(inner(0), zY(-.16), deckMid(s, 0), zY(BOW_Z) - grow); c.quadraticCurveTo(outer(0), zY(-.16), outer(0), zY(0)); c.closePath();
  }
  const shipImgs = new Map();
  // 🖋️ the ships' names in fancy pirate letters (1.70.0, Derek): the free font Pirata One (public/fonts, works without internet). The ship pictures are drawn again once it has loaded.
  const SHIP_FONT = "'Pirata One', 'Lilita One', Georgia, serif";
  try { const ff = new FontFace('Pirata One', "url('/fonts/pirata-one.woff2') format('woff2')"); document.fonts.add(ff); ff.load().then(() => shipImgs.clear(), () => {}); } catch {}
  function shipName(b, txt, x, y, maxW) { // gold letters with a dark edge and a little scroll either side
    let px = 42; b.font = `${px}px ${SHIP_FONT}`; while (b.measureText(txt).width > maxW - 96 && px > 18) b.font = `${--px}px ${SHIP_FONT}`;
    const w = b.measureText(txt).width; b.save(); b.textAlign = 'center'; b.textBaseline = 'middle'; b.lineJoin = 'round'; b.lineCap = 'round';
    const gr = b.createLinearGradient(0, y - px * .5, 0, y + px * .45); gr.addColorStop(0, '#fff4c0'); gr.addColorStop(.45, '#f2c84a'); gr.addColorStop(1, '#a8741a');
    b.lineWidth = 5; b.strokeStyle = '#2a1404'; b.strokeText(txt, x, y); b.fillStyle = gr; b.fillText(txt, x, y);
    b.strokeStyle = '#d4a82a'; b.lineWidth = 2.5; for (const d of [-1, 1]) { const x0 = x + d * (w / 2 + 10); b.beginPath(); b.moveTo(x0, y); b.bezierCurveTo(x0 + d * 9, y - 13, x0 + d * 25, y - 9, x0 + d * 22, y + 1); b.bezierCurveTo(x0 + d * 20, y + 8, x0 + d * 12, y + 5, x0 + d * 15, y - 2); b.stroke(); b.beginPath(); b.moveTo(x0 + d * 24, y + 1); b.lineTo(x0 + d * 38, y + 1); b.stroke(); b.fillStyle = '#d4a82a'; b.beginPath(); b.arc(x0 + d * 40, y + 1, 2.6, 0, 7); b.fill(); }
    b.restore();
  }
  function pirFigure(s) { // 🏴‍☠️ the figurehead on the bow (1.70.0, Derek): a carved scroll holding a gold medallion with the ship's channel's Twitch picture (no picture yet: a skull)
    const cr = CREW[s], o = s ? 1 : -1, tx = deckMid(s, 0), ty = zY(BOW_Z), R = 36, cx = tx - o * 12, cy = ty - 32, img = imgFor(scene.shipIcons?.[s]); // (low enough that the big sail doesn't hide it)
    g.save(); g.lineJoin = 'round'; g.lineCap = 'round';
    g.fillStyle = '#3a200c'; g.strokeStyle = '#1e1006'; g.lineWidth = 2; g.beginPath(); g.moveTo(tx - 15, ty + 6); g.quadraticCurveTo(tx - 20, cy + R * .8, cx - 12, cy + R * .95); g.lineTo(cx + 12, cy + R * .95); g.quadraticCurveTo(tx + 20, cy + R * .8, tx + 15, ty + 6); g.closePath(); g.fill(); g.stroke(); // the carved stem it stands on
    for (const d of [-1, 1]) { // carved gold wings
      g.fillStyle = '#c8962a'; g.strokeStyle = '#5a3a0c'; g.lineWidth = 2; g.beginPath(); g.moveTo(cx + d * R * .78, cy + R * .3); g.quadraticCurveTo(cx + d * R * 1.62, cy - R * .1, cx + d * R * 1.5, cy - R * .92); g.quadraticCurveTo(cx + d * R * 1.32, cy - R * .5, cx + d * R * 1.02, cy - R * .44); g.quadraticCurveTo(cx + d * R * 1.2, cy - R * .12, cx + d * R * .9, cy - R * .02); g.closePath(); g.fill(); g.stroke();
      g.strokeStyle = 'rgba(90,58,12,.75)'; g.lineWidth = 1.5; for (const k of [.3, .55, .8]) { g.beginPath(); g.moveTo(cx + d * R * (.95 + k * .2), cy + R * (.15 - k * .25)); g.lineTo(cx + d * R * (1.15 + k * .3), cy - R * (.05 + k * .6)); g.stroke(); }
    }
    const rim = g.createRadialGradient(cx - R * .35, cy - R * .4, R * .15, cx, cy, R * 1.2); rim.addColorStop(0, '#fff4c0'); rim.addColorStop(.5, '#e0aa30'); rim.addColorStop(1, '#7a4c0a');
    g.fillStyle = rim; g.beginPath(); g.arc(cx, cy, R + 8, 0, 7); g.fill(); g.strokeStyle = '#3a2206'; g.lineWidth = 2.5; g.stroke(); // gold rim
    g.fillStyle = cr.col; g.beginPath(); g.arc(cx, cy, R + 2, 0, 7); g.fill(); // a ring in the crew's colour
    g.save(); g.beginPath(); g.arc(cx, cy, R - 1.5, 0, 7); g.clip();
    if (img) { const k = Math.max(2 * R / img.naturalWidth, 2 * R / img.naturalHeight); g.drawImage(img, cx - img.naturalWidth * k / 2, cy - img.naturalHeight * k / 2, img.naturalWidth * k, img.naturalHeight * k); }
    else { g.fillStyle = cr.dk; g.fillRect(cx - R, cy - R, 2 * R, 2 * R); skull(g, cx, cy - R * .08, R * .42, '#f2e6c8', cr.dk); }
    const sh = g.createLinearGradient(0, cy - R, 0, cy + R); sh.addColorStop(0, 'rgba(255,255,255,.24)'); sh.addColorStop(.42, 'rgba(255,255,255,0)'); g.fillStyle = sh; g.fillRect(cx - R, cy - R, 2 * R, 2 * R); // (a glassy shine)
    g.restore();
    g.fillStyle = '#e0aa30'; g.strokeStyle = '#3a2206'; g.lineWidth = 2; g.beginPath(); g.moveTo(cx - 15, cy - R - 5); g.lineTo(cx - 17, cy - R - 18); g.lineTo(cx - 8, cy - R - 11); g.lineTo(cx, cy - R - 21); g.lineTo(cx + 8, cy - R - 11); g.lineTo(cx + 17, cy - R - 18); g.lineTo(cx + 15, cy - R - 5); g.closePath(); g.fill(); g.stroke(); // a little gold crown
    g.fillStyle = cr.lt; for (const d of [-1, 0, 1]) { g.beginPath(); g.arc(cx + d * 9, cy - R - 9, 2.2, 0, 7); g.fill(); }
    g.restore();
  }
  function pirShipImg(s) { // one ship's hull, deck, sides and rails, drawn once (masts, cannons and the stern rail are drawn every frame)
    const key = s + '|' + bgScale; if (shipImgs.has(key)) return shipImgs.get(key);
    const c = document.createElement('canvas'); c.width = W * bgScale; c.height = H * bgScale; const b = c.getContext('2d'); b.scale(bgScale, bgScale);
    const cr = CREW[s], o = s ? 1 : -1, outer = z => s ? deckHi(1, z) : deckLo(0, z), inner = z => s ? deckLo(1, z) : deckHi(0, z), P = z => .72 + z * .4;
    // the stern (the back of the ship, at the front of the screen) and the side facing the gap
    const lo1 = Math.min(outer(1), inner(1)), hi1 = Math.max(outer(1), inner(1)), sy = seaY(1);
    let gr = b.createLinearGradient(0, zY(1), 0, sy); gr.addColorStop(0, '#5a3418'); gr.addColorStop(1, '#2a160a'); b.fillStyle = gr; b.beginPath(); b.moveTo(lo1, zY(1)); b.lineTo(hi1, zY(1)); b.lineTo(hi1 - 14, sy); b.lineTo(lo1 + 14, sy); b.fill();
    b.strokeStyle = 'rgba(0,0,0,.3)'; b.lineWidth = 2; for (let y = zY(1) + 16; y < sy; y += 14) { b.beginPath(); b.moveTo(lo1 + 4, y); b.lineTo(hi1 - 4, y); b.stroke(); }
    b.fillStyle = cr.col; b.fillRect(lo1, zY(1), hi1 - lo1, 10); b.fillStyle = '#d4a82a'; b.fillRect(lo1, zY(1) + 10, hi1 - lo1, 3);
    const mx = (lo1 + hi1) / 2, py = zY(1) + 15, ph = 48; b.fillStyle = '#1e1008'; b.fillRect(mx - 205, py, 410, ph); b.strokeStyle = '#d4a82a'; b.lineWidth = 3; b.strokeRect(mx - 205, py, 410, ph); b.strokeStyle = 'rgba(212,168,42,.45)'; b.lineWidth = 1.5; b.strokeRect(mx - 199, py + 5, 398, ph - 10); // the name board
    shipName(b, cr.ship, mx, py + ph / 2 + 1, 396);
    for (const wx of [-300, -230, 230, 300]) { const wg = b.createLinearGradient(0, zY(1) + 22, 0, zY(1) + 70); wg.addColorStop(0, '#ffe9a0'); wg.addColorStop(1, '#e8902a'); b.fillStyle = wg; b.fillRect(mx + wx - 22, zY(1) + 24, 44, 44); b.strokeStyle = '#2a160a'; b.lineWidth = 4; b.strokeRect(mx + wx - 22, zY(1) + 24, 44, 44); b.beginPath(); b.moveTo(mx + wx, zY(1) + 24); b.lineTo(mx + wx, zY(1) + 68); b.stroke(); } // stern windows
    b.fillStyle = '#3a200e'; b.beginPath(); for (let i = 0; i <= 10; i++) b.lineTo(inner(i / 10), zY(i / 10)); for (let i = 10; i >= 0; i--) b.lineTo(inner(i / 10) - o * 16, seaY(i / 10)); b.fill(); // (the side facing the gap: seen almost edge-on)
    b.strokeStyle = cr.col; b.lineWidth = 5; b.beginPath(); for (let i = 0; i <= 10; i++) b.lineTo(inner(i / 10) - o * 3, zY(i / 10) + 5); b.stroke();
    // the deck: planks running from the bow to the stern
    gr = b.createLinearGradient(0, zY(BOW_Z), 0, zY(1)); gr.addColorStop(0, '#7a522c'); gr.addColorStop(1, '#b8844a'); b.fillStyle = gr; pirDeckPath(b, s); b.fill();
    b.save(); pirDeckPath(b, s); b.clip();
    b.strokeStyle = 'rgba(50,28,10,.32)'; b.lineWidth = 2; for (let k = 1; k < 16; k++) { const u = k / 16; b.beginPath(); for (let i = 0; i <= 12; i++) { const z = BOW_Z + (1 - BOW_Z) * i / 12, zz = Math.max(0, z), x = outer(zz) + (inner(zz) - outer(zz)) * u; b.lineTo(z < 0 ? deckMid(s, 0) + (x - deckMid(s, 0)) * (1 - z / BOW_Z) : x, zY(z)); } b.stroke(); }
    b.strokeStyle = 'rgba(50,28,10,.22)'; b.lineWidth = 1.5; for (let k = 0; k < 16; k++) for (let j = 0; j < 7; j++) { const z = (j + (k % 3) / 3) / 7, u0 = k / 16, u1 = (k + 1) / 16, x0 = outer(z) + (inner(z) - outer(z)) * u0, x1 = outer(z) + (inner(z) - outer(z)) * u1; b.beginPath(); b.moveTo(x0, zY(z)); b.lineTo(x1, zY(z)); b.stroke(); } // (the planks' ends)
    for (let i = 0; i < 160; i++) { const z = vr(0, 1); b.fillStyle = `rgba(${Math.random() < .5 ? '255,230,190' : '40,22,8'},${vr(.04, .1)})`; b.fillRect(vr(Math.min(outer(z), inner(z)), Math.max(outer(z), inner(z))), zY(z), vr(4, 14), vr(1, 3)); }
    const hz0 = .4, hz1 = .5; b.fillStyle = '#2a1608'; b.beginPath(); b.moveTo(deckMid(s, hz0) - 70, zY(hz0)); b.lineTo(deckMid(s, hz0) + 70, zY(hz0)); b.lineTo(deckMid(s, hz1) + 80, zY(hz1)); b.lineTo(deckMid(s, hz1) - 80, zY(hz1)); b.fill(); // a cargo hatch
    b.strokeStyle = '#6a4422'; b.lineWidth = 3; for (let k = 1; k < 6; k++) { b.beginPath(); b.moveTo(deckMid(s, hz0) - 70 + k * 23.3, zY(hz0)); b.lineTo(deckMid(s, hz1) - 80 + k * 26.6, zY(hz1)); b.stroke(); } for (let k = 1; k < 3; k++) { const z = hz0 + (hz1 - hz0) * k / 3; b.beginPath(); b.moveTo(deckMid(s, z) - 75, zY(z)); b.lineTo(deckMid(s, z) + 75, zY(z)); b.stroke(); }
    b.restore();
    // the outer side wall (bulwark) above the deck: its inside faces us
    b.beginPath(); for (let i = 0; i <= 14; i++) { const z = i / 14; b.lineTo(outer(z), zY(z) - 46 * P(z)); } for (let i = 14; i >= 0; i--) { const z = i / 14; b.lineTo(outer(z), zY(z)); } b.closePath();
    gr = b.createLinearGradient(0, zY(0) - 40, 0, zY(1)); gr.addColorStop(0, '#5a361a'); gr.addColorStop(1, '#7a4a24'); b.fillStyle = gr; b.fill();
    b.strokeStyle = 'rgba(0,0,0,.25)'; b.lineWidth = 1.5; for (const k of [.33, .66]) { b.beginPath(); for (let i = 0; i <= 14; i++) { const z = i / 14; b.lineTo(outer(z), zY(z) - 46 * P(z) * k); } b.stroke(); }
    b.strokeStyle = cr.col; b.lineWidth = 7; b.beginPath(); for (let i = 0; i <= 14; i++) { const z = i / 14; b.lineTo(outer(z), zY(z) - 46 * P(z) + 5); } b.stroke(); // (a stripe in the crew's colour)
    b.strokeStyle = '#3a200c'; b.lineWidth = 6; b.beginPath(); b.moveTo(deckMid(s, 0), zY(BOW_Z) - 32); b.quadraticCurveTo(outer(0), zY(-.16) - 36, outer(0), zY(0) - 33); for (let i = 0; i <= 14; i++) { const z = i / 14; b.lineTo(outer(z), zY(z) - 46 * P(z)); } b.stroke(); // its top
    // the low rail on the gap side (open where the gangplanks go) and round the bow
    const post = (x, y, h, w = 4) => { b.fillStyle = '#4a2a12'; b.fillRect(x - w / 2, y - h, w, h); };
    b.strokeStyle = '#4a2a12'; b.lineWidth = 4; b.beginPath(); b.moveTo(inner(0), zY(0) - 26); b.quadraticCurveTo(inner(0), zY(-.16) - 28, deckMid(s, 0), zY(BOW_Z) - 30); b.stroke();
    let seg = []; const flush = () => { if (seg.length > 1) { b.beginPath(); seg.forEach(([x, y], i) => i ? b.lineTo(x, y) : b.moveTo(x, y)); b.stroke(); } seg = []; };
    for (let i = 0; i <= 40; i++) { const z = i / 40, gap = PLANKS.some(p => Math.abs(z - p) < PLK + .015); if (gap) { flush(); continue; } seg.push([inner(z), zY(z) - 30 * P(z)]); if (i % 3 === 0) post(inner(z), zY(z), 30 * P(z)); } flush();
    // the bowsprit and its sail
    const tx = deckMid(s, 0), ty = zY(BOW_Z); b.strokeStyle = '#3a200c'; b.lineWidth = 8; b.beginPath(); b.moveTo(tx, ty - 10); b.lineTo(tx + o * 26, ty - 120); b.stroke();
    b.fillStyle = shadeC(cr.col, 25); b.globalAlpha = .9; b.beginPath(); b.moveTo(tx + o * 24, ty - 116); b.lineTo(deckMid(s, .2) + o * 10, 210); b.lineTo(deckMid(s, .2) + o * 4, zY(.2) - 150); b.closePath(); b.fill(); b.globalAlpha = 1;
    // barrels and a coil of rope by the outer wall
    const barrel = (x, z, sc) => { const y = zY(z), p = P(z) * sc; b.fillStyle = '#7a4a22'; b.beginPath(); b.ellipse(x, y - 30 * p, 22 * p, 30 * p, 0, 0, 7); b.fill(); b.strokeStyle = '#2a1608'; b.lineWidth = 3 * p; for (const d of [-14, 14]) { b.beginPath(); b.ellipse(x, y - 30 * p + d * p, 21 * p, 5 * p, 0, 0, Math.PI); b.stroke(); } b.fillStyle = '#5a3418'; b.beginPath(); b.ellipse(x, y - 58 * p, 18 * p, 6 * p, 0, 0, 7); b.fill(); };
    barrel(outer(.08) - o * 40, .08, 1); barrel(outer(.12) - o * 78, .12, .9); barrel(outer(.94) - o * 44, .94, 1.05);
    { const z = .3, x = outer(z) - o * 56, y = zY(z), p = P(z); b.strokeStyle = '#c8a870'; b.lineWidth = 4 * p; for (let r = 6; r < 26; r += 5) { b.beginPath(); b.ellipse(x, y - 4 * p, r * p * 1.3, r * p * .45, 0, 0, 7); b.stroke(); } } // a coil of rope
    shipImgs.set(key, c); if (shipImgs.size > 8) shipImgs.delete(shipImgs.keys().next().value); return c;
  }
  function drawMast(m, now, dy = 0) { // a mast with two square sails in the crew's colour (a skull on the big one), rigging, and a black flag on top
    const { s, i, z } = m, cr = CREW[s], p = .72 + z * .4, x = deckMid(s, z), base = zY(z) + dy, top = (i ? 64 : 92) + dy, t = now / 1000;
    g.save(); g.strokeStyle = 'rgba(30,18,8,.45)'; g.lineWidth = 1.8 * p;
    for (const ex of [deckLo(s, z) + 8, deckHi(s, z) - 8]) for (let k = 0; k < 3; k++) { g.beginPath(); g.moveTo(x + (ex > x ? 1 : -1) * 6 * p, top + 90 * p + k * 40 * p); g.lineTo(ex + (ex > x ? -1 : 1) * k * 30 * p, base - 34 * p); g.stroke(); } // the rigging
    const mw = 15 * p, mg = g.createLinearGradient(x - mw / 2, 0, x + mw / 2, 0); mg.addColorStop(0, '#3a2210'); mg.addColorStop(.5, '#8a5a30'); mg.addColorStop(1, '#2e1a0c'); g.fillStyle = mg; g.fillRect(x - mw / 2, top, mw, base - top);
    const sail = (y0, hw, hh, emblem) => {
      g.fillStyle = '#3a2210'; g.fillRect(x - hw - 16 * p, y0 - 5 * p, (hw + 16 * p) * 2, 8 * p); // the yard
      const bil = Math.sin(t * 1.3 + i * 2 + s) * 5 * p, sg = g.createLinearGradient(x - hw, 0, x + hw, 0); sg.addColorStop(0, shadeC(cr.col, -32)); sg.addColorStop(.5, cr.col); sg.addColorStop(1, shadeC(cr.col, -32));
      g.fillStyle = sg; g.beginPath(); g.moveTo(x - hw, y0); g.lineTo(x + hw, y0); g.quadraticCurveTo(x + hw + 9 * p, y0 + hh * .5, x + hw * .93, y0 + hh); g.quadraticCurveTo(x, y0 + hh + 24 * p + bil, x - hw * .93, y0 + hh); g.quadraticCurveTo(x - hw - 9 * p, y0 + hh * .5, x - hw, y0); g.fill();
      g.strokeStyle = 'rgba(0,0,0,.28)'; g.lineWidth = 2 * p; g.stroke(); g.strokeStyle = 'rgba(0,0,0,.12)'; g.lineWidth = 1.5 * p; for (let k = 1; k < 5; k++) { const xx = x - hw + hw * 2 * k / 5; g.beginPath(); g.moveTo(xx, y0 + 4 * p); g.lineTo(x + (xx - x) * .95, y0 + hh + 12 * p); g.stroke(); }
      if (emblem) skull(g, x, y0 + hh * .42, hh * .24, 'rgba(250,244,228,.95)', cr.col);
    };
    sail(top + 40 * p, 120 * p, 140 * p, false); sail(top + 216 * p, 168 * p, 190 * p, i === 1);
    const fw = 74 * p, fh = 48 * p, fx = x + mw / 2, fy = top - 4 * p; g.fillStyle = '#4a2a14'; g.fillRect(x - 2 * p, fy - fh - 12 * p, 4 * p, fh + 16 * p); // ☠️ the flag
    g.fillStyle = '#141418'; g.beginPath(); const fp = []; for (let k = 0; k <= 6; k++) { const u = k / 6, wv = Math.sin(t * 6 + u * 5 + s * 2 + i) * 5 * p * u; fp.push([fx + u * fw, fy - fh + wv]); } fp.forEach(([a, bb], k) => k ? g.lineTo(a, bb) : g.moveTo(a, bb)); for (let k = 6; k >= 0; k--) { const u = k / 6, wv = Math.sin(t * 6 + u * 5 + s * 2 + i) * 5 * p * u; g.lineTo(fx + u * fw, fy + wv); } g.closePath(); g.fill();
    skull(g, fx + fw * .48, fy - fh * .58 + Math.sin(t * 6 + 2.4 + s * 2 + i) * 2.4 * p, fh * .2, '#f4efe2', '#141418');
    g.fillStyle = cr.col; g.beginPath(); g.moveTo(fx, fy - fh - 14 * p); for (let k = 0; k <= 5; k++) { const u = k / 5; g.lineTo(fx + u * fw * 1.1, fy - fh - 14 * p + 6 * p * u + Math.sin(t * 7 + u * 4 + s) * 4 * p * u); } g.lineTo(fx, fy - fh - 2 * p); g.closePath(); g.fill(); // (a pennant in the crew's colour)
    g.restore();
  }
  function pirCannon(c) {
    const p = .72 + c.z * .4, d = c.s ? -1 : 1, x = cannonX(c) - d * c.recoil * 14 * p, y = zY(c.z);
    g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.ellipse(x, y, 34 * p, 7 * p, 0, 0, 7); g.fill();
    g.fillStyle = '#6a3e1c'; g.fillRect(x - 26 * p, y - 22 * p, 52 * p, 16 * p); g.fillStyle = '#2a1608'; for (const k of [-16, 16]) { g.beginPath(); g.arc(x + k * p, y - 6 * p, 7.5 * p, 0, 7); g.fill(); }
    g.save(); g.translate(x, y - 28 * p); g.scale(d, 1); g.rotate(-.08);
    g.fillStyle = '#1e1e22'; g.beginPath(); g.moveTo(-24 * p, -11 * p); g.lineTo(46 * p, -7 * p); g.lineTo(46 * p, 7 * p); g.lineTo(-24 * p, 11 * p); g.closePath(); g.fill(); g.beginPath(); g.arc(-24 * p, 0, 11 * p, Math.PI / 2, Math.PI * 1.5); g.fill();
    g.fillStyle = '#3a3a42'; g.fillRect(40 * p, -9 * p, 8 * p, 18 * p); g.fillStyle = 'rgba(255,255,255,.14)'; g.fillRect(-20 * p, -9 * p, 60 * p, 4 * p);
    g.restore();
  }
  function pirPlank(pz, dy = 0, a = 1) { // 🪵 a gangplank across the gap (rope rails on both sides)
    const x0 = deckHi(0, pz) - 16, x1 = deckLo(1, pz) + 16, y0 = zY(pz - PLK) + dy, y1 = zY(pz + PLK) + dy; g.save(); g.globalAlpha *= a;
    g.fillStyle = '#4a2c14'; g.fillRect(x0, y1, x1 - x0, 9); g.fillStyle = '#a8763e'; g.fillRect(x0, y0, x1 - x0, y1 - y0);
    g.strokeStyle = 'rgba(40,20,6,.45)'; g.lineWidth = 2; for (const k of [.33, .66]) { g.beginPath(); g.moveTo(x0, y0 + (y1 - y0) * k); g.lineTo(x1, y0 + (y1 - y0) * k); g.stroke(); } for (let x = x0 + 30; x < x1; x += 46) { g.beginPath(); g.moveTo(x, y0); g.lineTo(x, y1); g.stroke(); }
    g.strokeStyle = '#c8a870'; g.lineWidth = 2.5; for (const y of [y0, y1]) { g.beginPath(); g.moveTo(x0, y - 34); g.quadraticCurveTo((x0 + x1) / 2, y - 18, x1, y - 34); g.stroke(); g.fillStyle = '#4a2a12'; g.fillRect(x0 - 2, y - 36, 4, 36); g.fillRect(x1 - 2, y - 36, 4, 36); }
    g.restore();
  }
  function pirSternRail(s, dy = 0) { // the rail at the back of the ship: in front of everyone standing at the back
    const lo = Math.min(deckLo(s, 1), deckHi(s, 1)), hi = Math.max(deckLo(s, 1), deckHi(s, 1)), y = zY(1) + dy, h = 42, cr = CREW[s];
    g.fillStyle = '#4a2a12'; for (let x = lo + 6; x <= hi - 4; x += 34) g.fillRect(x - 3, y - h, 6, h);
    g.fillStyle = '#3a200c'; g.fillRect(lo - 4, y - h - 6, hi - lo + 8, 10); g.fillStyle = cr.col; g.fillRect(lo - 4, y - h + 4, hi - lo + 8, 5); g.fillStyle = '#5a3418'; g.fillRect(lo - 4, y - 8, hi - lo + 8, 8);
    const fl = .85 + Math.sin(performance.now() / 90 + s * 3) * .08; for (const lx of [lo + 10, hi - 10]) { g.fillStyle = '#2a1608'; g.fillRect(lx - 3, y - h - 60, 6, 60); const lg = g.createRadialGradient(lx, y - h - 72, 2, lx, y - h - 72, 60); lg.addColorStop(0, `rgba(255,220,130,${.55 * fl})`); lg.addColorStop(1, 'rgba(255,180,80,0)'); g.fillStyle = lg; g.fillRect(lx - 60, y - h - 132, 120, 120); g.fillStyle = '#ffd27a'; g.fillRect(lx - 8, y - h - 84, 16, 22); g.strokeStyle = '#2a1608'; g.lineWidth = 3; g.strokeRect(lx - 8, y - h - 84, 16, 22); } // stern lanterns
  }
  function pirTentacles(s) { // 🐙 where each tentacle comes up and what part of the ship it grabs (out of the gap, over the far side, and a big one at the back)
    const d = s ? -1 : 1, inn = z => s ? deckLo(1, z) : deckHi(0, z), out = z => s ? deckHi(1, z) : deckLo(0, z);
    return [{ bx: inn(.22) + d * 46, bz: .22, gx: inn(.25) - d * 170, gz: .25, up: 330, w: 46, at: .5, water: true },
      { bx: inn(.66) + d * 52, bz: .66, gx: inn(.62) - d * 210, gz: .62, up: 400, w: 56, at: .75, water: true },
      { bx: out(.4) - d * 24, by: zY(.4) - 40, bz: .4, gx: out(.45) + d * 200, gz: .45, up: 300, w: 44, at: .62 },
      { bx: out(.85) - d * 18, by: zY(.85) - 44, bz: .85, gx: out(.8) + d * 230, gz: .8, up: 270, w: 52, at: .9 },
      { bx: deckMid(s, 1) + d * 150, by: H + 140, bz: 1, gx: deckMid(s, .88) - d * 40, gz: .88, up: 470, w: 78, at: 1.05, front: true }];
  }
  function pirTentacle(tn, t, d, i) { // one tentacle: grows out of the water along an arch, grabs the deck, squeezes, then pulls it down
    const r = clamp((t - tn.at) / 1, 0, 1); if (r <= 0) return; const grow = 1 - Math.pow(1 - r, 3), sq = clamp((t - 1.6) / .8, 0, 1), now = performance.now() / 1000;
    const p = .72 + clamp(tn.gz, 0, 1) * .4, sink = Math.max(0, d - 132) * 1.1, by = (tn.by ?? seaY(tn.bz)) + sink, gy = zY(tn.gz) + d + 6, B = [[tn.bx, by], [tn.bx, by - tn.up], [tn.gx + (tn.bx - tn.gx) * .25, gy - tn.up * .8 + sq * 70], [tn.gx, gy]]; // (at the end they go under with the ship)
    const at = u => { const v = 1 - u; return [v * v * v * B[0][0] + 3 * v * v * u * B[1][0] + 3 * v * u * u * B[2][0] + u * u * u * B[3][0], v * v * v * B[0][1] + 3 * v * v * u * B[1][1] + 3 * v * u * u * B[2][1] + u * u * u * B[3][1]]; };
    const N = 30, L = [], Rr = [], mid = [];
    for (let k = 0; k <= N; k++) { const u = k / N * grow, [x, y] = at(u), [nx2, ny2] = at(Math.min(1, u + .01)), tx2 = nx2 - x || 1e-3, ty2 = ny2 - y, len = Math.hypot(tx2, ty2) || 1, nx = -ty2 / len, ny = tx2 / len;
      const wig = Math.sin(u * 7 + now * 4 + i) * 14 * (1 - sq * .7) * (1 - u * .3), px = x + nx * wig, py = y + ny * wig, w = tn.w * p * (1 - .84 * u / Math.max(.2, grow)) * (1 + Math.sin(now * 14) * .06 * sq) / 2;
      L.push([px + nx * w, py + ny * w]); Rr.push([px - nx * w, py - ny * w]); mid.push([px, py, nx, ny, w]); }
    g.fillStyle = '#7a2462'; g.strokeStyle = '#3a0a2c'; g.lineWidth = 3; g.beginPath(); [...L, ...Rr.reverse()].forEach(([x, y], k) => k ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); g.fill(); g.stroke();
    g.strokeStyle = 'rgba(220,110,170,.45)'; g.lineWidth = 4; g.beginPath(); mid.forEach(([x, y, nx, ny, w], k) => { const X = x + nx * w * .45, Y = y + ny * w * .45; k ? g.lineTo(X, Y) : g.moveTo(X, Y); }); g.stroke(); // (a shine on top)
    for (let k = 2; k < mid.length - 1; k += 3) { const [x, y, nx, ny, w] = mid[k], sx = x - nx * w * .5, sy = y - ny * w * .5, sr = Math.max(2, w * .28); g.fillStyle = '#f2b8d4'; g.beginPath(); g.ellipse(sx, sy, sr, sr * .8, 0, 0, 7); g.fill(); g.strokeStyle = '#a0406e'; g.lineWidth = 1.5; g.stroke(); } // suckers
  }
  function pirDrawDoomed(now) { // 🐙 the ship the kraken takes: shakes, cracks in the middle, and is pulled under (the water climbs it; the masts go last)
    const k = pir.kr, s = k.doomed, t = krT(); if (t > 5.3) return;
    const dd = t < 2.3 ? 0 : t < 3.2 ? 132 * easeIO((t - 2.3) / .9) : 132 + 860 * Math.pow(Math.min(1, (t - 3.2) / 2), 1.5), wob = t < 2.3 ? Math.sin(t * 11) * Math.min(1, t / 1.5) * 5 : Math.sin(t * 7) * 3;
    const yA = zY((dd - 92) / 36), yB = seaY(1) - dd;
    if (yB > yA) { g.save(); g.beginPath(); g.rect(-300, yA + dd, W + 600, yB - yA); g.clip(); g.translate(wob, dd); g.drawImage(pirShipImg(s), 0, 0, W, H); pirFigure(s);
      for (const c of pir.cannons) if (c.s === s) pirCannon(c);
      for (const f of F) if (f.wreck) drawFighter(f);
      if (t > 2.2) { g.strokeStyle = '#140a04'; g.lineWidth = 6; g.lineJoin = 'miter'; g.beginPath(); for (let j = 0; j <= 12; j++) { const z = .45 + (j % 2 ? .035 : -.03) * (j % 3 ? 1 : .5), u = j / 12; g.lineTo(deckLo(s, z) + (deckHi(s, z) - deckLo(s, z)) * u, zY(z)); } g.stroke(); } // the crack
      pirSternRail(s); g.restore(); }
    for (const { mast: m } of MASTS[s]) { g.save(); g.beginPath(); g.rect(-300, -3000, W + 600, seaY(m.z) + 3000); g.clip(); g.translate(wob, 0); drawMast(m, now, dd); g.restore(); } // each mast goes under at its own waterline
    k.tents.forEach((tn, i) => { g.save(); if (!tn.front) { g.beginPath(); g.rect(-300, -3000, W + 600, seaY(tn.bz) + 3000); g.clip(); } pirTentacle(tn, t, dd, i); g.restore(); });
  }
  function pirEye(t) { // 🐙 at the end the kraken's head comes up where the ship was, looks around, and sinks
    const k = pir.kr, u = clamp((t - 4.5) / .5, 0, 1) * (1 - clamp((t - 5.15) / .35, 0, 1)); if (u <= 0) return;
    const x = deckMid(k.doomed, .42), wy = seaY(.42), hh = 150 * u, blink = Math.abs(t - 4.95) < .07;
    g.save(); g.beginPath(); g.rect(x - 400, wy - 600, 800, 600); g.clip();
    g.fillStyle = '#6a1e56'; g.beginPath(); g.ellipse(x, wy + 70 - hh, 200, 130, 0, 0, 7); g.fill(); g.fillStyle = 'rgba(255,150,210,.18)'; for (const [a, b2, r2] of [[-90, -50, 18], [60, -80, 14], [120, -20, 10], [-140, 10, 12]]) { g.beginPath(); g.arc(x + a, wy + 70 - hh + b2, r2, 0, 7); g.fill(); }
    for (const d of [-1, 1]) { const ex = x + d * 72, ey = wy + 20 - hh * .95; g.fillStyle = '#ffd23a'; g.beginPath(); g.ellipse(ex, ey, 34, blink ? 4 : 28, 0, 0, 7); g.fill(); g.strokeStyle = '#3a0a2c'; g.lineWidth = 4; g.stroke(); if (!blink) { g.fillStyle = '#140008'; g.beginPath(); g.ellipse(ex + Math.sin(t * 3) * 6, ey, 22, 6, 0, 0, 7); g.fill(); } }
    g.restore();
    g.strokeStyle = 'rgba(230,248,255,.75)'; g.lineWidth = 4; g.beginPath(); g.ellipse(x, wy, 220 * u + 30, 22, 0, 0, 7); g.stroke();
  }
  function pirStage(now, orbit) { // the sea, anyone falling in, the ships, the gangplanks, the cannons (the masts stand among the pirates)
    const P = pirS(), t = now / 1000;
    g.strokeStyle = 'rgba(40,40,60,.75)'; g.lineWidth = 2.2; for (let i = 0; i < 4; i++) { const a = t * (.25 + i * .05) + i * 1.7, x = [420, 1500, 1180, 700][i] + Math.cos(a) * 120, y = [210, 170, 300, 120][i] + Math.sin(a * 1.3) * 30, s = [1, 1.1, .7, .8][i], fl = Math.sin(t * 8 + i) * 4 * s; g.beginPath(); g.moveTo(x - 14 * s, y - 4 * s + fl); g.quadraticCurveTo(x - 7 * s, y - 10 * s + fl, x, y); g.quadraticCurveTo(x + 7 * s, y - 10 * s + fl, x + 14 * s, y - 4 * s + fl); g.stroke(); } // seagulls
    g.strokeStyle = 'rgba(200,225,250,.32)'; g.lineWidth = 2.6; for (let i = 0; i < 64; i++) { const z = -.5 + (i % 32) * .047, y = seaY(z) + Math.sin(t * 1.6 + i) * 4, sp = 30 + (i % 5) * 14, x = ((i * 397 + t * sp) % (W + 200)) - 100, w = 18 + (z + .5) * 46; g.beginPath(); g.moveTo(x - w, y); g.quadraticCurveTo(x, y - 7 - (z + .5) * 6, x + w, y); g.stroke(); } // ⛈️ big moving waves
    stormSkyBolt(); if (!orbit) pirMonkeysDraw(t); // ⚡ far-away lightning; 🐒 the boat between the ships (behind the hulls)
    for (const s of [0, 1]) if (P.sunk !== s) { const sx = s ? 1 : -1; g.strokeStyle = 'rgba(240,250,255,.6)'; g.lineWidth = 3; g.beginPath(); for (let i = 0; i <= 18; i++) { const z = i / 18 * .86, x = (s ? deckLo(1, z) : deckHi(0, z)) - sx * 16 + Math.sin(t * 3 + i) * 3 * sx * -1; g.lineTo(x - sx * 4 * (1 + Math.sin(t * 2 + i * 1.7)), seaY(z) + Math.sin(t * 2.4 + i) * 2); } g.stroke(); } // foam where the hulls meet the water
    for (const r of P.rings) { const a = 1 - r.t / 1.8, w = (40 + r.t * 140) * r.k * (.72 + r.z * .4); g.strokeStyle = `rgba(235,250,255,${a * .8})`; g.lineWidth = 3; g.beginPath(); g.ellipse(r.x, seaY(r.z), w, w * .22, 0, 0, 7); g.stroke(); }
    if (P.kr?.crackAt) { const a = clamp(1 - (performance.now() - P.kr.crackAt) / 12000, 0, 1); if (a > 0) { const x = deckMid(P.kr.doomed, .45), y = seaY(.45); g.fillStyle = `rgba(230,246,255,${.35 * a})`; for (let j = 0; j < 9; j++) { g.beginPath(); g.ellipse(x + Math.sin(j * 2.3) * 260, y + Math.cos(j * 1.7) * 40, 120 + (j % 3) * 40, 22, 0, 0, 7); g.fill(); } } } // foam where it went down
    for (const d of P.debris) { g.save(); g.translate(d.x, d.float ? seaY(d.z) - 4 + Math.sin(t * 2 + d.rot) * 3 : d.y); g.rotate(d.float ? Math.sin(t + d.rot) * .15 + d.rot : d.rot); if (d.barrel) { g.fillStyle = '#7a4a22'; g.beginPath(); g.ellipse(0, 0, 18, 24, 0, 0, 7); g.fill(); g.strokeStyle = '#2a1608'; g.lineWidth = 3; g.beginPath(); g.moveTo(-17, -8); g.lineTo(17, -8); g.moveTo(-17, 8); g.lineTo(17, 8); g.stroke(); } else { g.fillStyle = d.col; g.fillRect(-d.w / 2, -d.h / 2, d.w, d.h); } g.restore(); }
    if (!orbit) for (const f of F) if (f.falling && f.h > -FREE(f.z) - 260) { g.save(); g.beginPath(); g.rect(-300, -3000, W + 600, seaY(f.z) + 3000); g.clip(); drawFighter(f); g.restore(); } // (overboard: behind the ships, under the water)
    if (P.kr) { pirDrawDoomed(now); pirEye(krT()); }
    if (P.planks || (P.kr && krT() < 3.4)) for (const pz of PLANKS) { const tt = P.kr ? krT() - 2.2 : -1, dy = tt > 0 ? 900 * tt * tt : 0; g.save(); g.beginPath(); g.rect(-300, -3000, W + 600, seaY(pz) + 3000); g.clip(); pirPlank(pz, dy); g.restore(); }
    for (const s of [0, 1]) if (P.sunk !== s) { g.drawImage(pirShipImg(s), 0, 0, W, H); pirFigure(s); for (const c of P.cannons) if (c.s === s) pirCannon(c); }
    for (const e of P.storm.fx) if (e.kind === 'wave') stormWaveBack(e); // 🌊 the wave rising beside the ship / water on its deck
    if (P.planks && P.sunk == null) { g.strokeStyle = 'rgba(40,24,10,.75)'; g.lineWidth = 3; for (const [z, y0] of [[.62, 300], [.2, 336]]) { g.beginPath(); g.moveTo(deckMid(0, z), y0); g.quadraticCurveTo(GAPX, y0 + (ROPE_Y + (z === .2 ? 30 : 0) - y0) * 2, deckMid(1, z), y0); g.stroke(); } } // grappling lines between the ships (the swing ropes hang from them)
    for (const b of P.balls) if (b.t > .45) { const y = zY(b.z), r = (40 + 30 * b.z) * (1 + Math.sin(t * 20) * .08); g.strokeStyle = 'rgba(255,60,40,.9)'; g.lineWidth = 3; g.setLineDash([10, 7]); g.beginPath(); g.ellipse(b.x, y, r * 1.6, r * .45, 0, 0, 7); g.stroke(); g.setLineDash([]); g.beginPath(); g.moveTo(b.x - r * 2, y); g.lineTo(b.x + r * 2, y); g.moveTo(b.x, y - r * .7); g.lineTo(b.x, y + r * .7); g.stroke(); } // 🎯 where a cannonball will land
  }
  // ---------- ⛈️ how the storm looks (only looks: the fight side is in stormStep) ----------
  function boltPts(x0, y0, x1, y1, n, jit) { const pts = [[x0, y0]]; for (let i = 1; i < n; i++) { const u = i / n; pts.push([x0 + (x1 - x0) * u + vr(-jit, jit), y0 + (y1 - y0) * u + vr(-jit * .3, jit * .3)]); } pts.push([x1, y1]); return pts; }
  function boltDraw(pts, w, a) { // a jagged bolt: a blue glow with a white middle
    g.save(); g.lineJoin = 'round'; g.lineCap = 'round'; const line = () => { g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.stroke(); };
    g.globalAlpha = a * .45; g.strokeStyle = '#8ab8ff'; g.lineWidth = w * 3.2; line(); g.globalAlpha = a; g.strokeStyle = '#eef6ff'; g.lineWidth = w; line(); g.restore();
  }
  function stormSkyBolt() { // ⚡ far away: from the clouds down to the sea (behind the ships)
    const k = WX.sky; if (!k) return; const now = performance.now(), a = clamp(1 - k.t / .45, 0, 1);
    if (!k.pts || now - k.at > 70) { k.at = now; k.pts = boltPts(k.x, k.y0, k.x + vr(-70, 70), HZ - 4, 9, 34); k.br = Math.random() < .6 ? boltPts(...k.pts[3], k.pts[3][0] + vr(-130, 130), k.pts[3][1] + vr(80, 170), 4, 18) : null; }
    const gl = g.createRadialGradient(k.x, k.y0, 10, k.x, k.y0, 280); gl.addColorStop(0, `rgba(200,215,255,${.38 * a})`); gl.addColorStop(1, 'rgba(200,215,255,0)'); g.fillStyle = gl; g.fillRect(k.x - 280, k.y0 - 280, 560, 560);
    boltDraw(k.pts, 2.6, a); if (k.br) boltDraw(k.br, 1.6, a * .8);
  }
  function stormBolt(e, now) { // ⚡ chat's lightning: from the top of the screen down onto the pirate
    if (e.kind !== 'bolt' || e.t > .5) return; const o = e.target != null && !e.hit ? F.find(x => x.id === e.target) : null;
    const x1 = o ? o.x : e.x, y1 = o ? zY(o.z) - o.h - 70 * S(o) : e.y ?? zY(e.z) - 60, top = cam.y - H / 2 / cam.z - 80, a = clamp(1 - e.t / .5, 0, 1) * (Math.sin(now / 18) > -.4 ? 1 : .55);
    if (!e.pts || now - (e.at || 0) > 50 || Math.abs(e.pts[e.pts.length - 1][0] - x1) > 30) { e.at = now; e.pts = boltPts(x1 + vr(-150, 150), top, x1, y1, 12, 46); e.br = [boltPts(...e.pts[4], e.pts[4][0] + vr(-170, 170), e.pts[4][1] + vr(120, 240), 5, 24), boltPts(...e.pts[7], e.pts[7][0] + vr(-120, 120), e.pts[7][1] + vr(80, 160), 4, 18)]; }
    boltDraw(e.pts, 8, a); for (const b of e.br) boltDraw(b, 3.2, a * .85);
    const gl = g.createRadialGradient(x1, y1, 4, x1, y1, 150); gl.addColorStop(0, `rgba(255,255,230,${.85 * a})`); gl.addColorStop(1, 'rgba(255,255,230,0)'); g.fillStyle = gl; g.fillRect(x1 - 150, y1 - 150, 300, 300);
  }
  function stormWaveBack(e) { // 🌊 a huge wall of water rearing up out of the sea beside the ship (behind the pirates), then the deck stays wet for a bit
    const s = e.s, o = s ? 1 : -1, P = z => .72 + z * .4; // (o = toward the open sea)
    if (e.t < e.hitAt + .25) { const u = easeIO(clamp(e.t / e.hitAt, 0, 1)), fall = clamp((e.t - e.hitAt) / .25, 0, 1), n = 18, top = [], base = [];
      for (let i = 0; i <= n; i++) { const z = -.1 + i / n * 1.2, zz = clamp(z, 0, 1), p = P(zz), h = (300 + 280 * zz) * p * u * (1 - fall * .8), over = 80 * p * u * u; top.push([outerOf(s, zz) + o * 130 * (1 - u) - o * over, zY(z) - h]); base.push([outerOf(s, zz) + o * (340 + 140 * zz), seaY(z) + 14]); }
      g.save(); const gr = g.createLinearGradient(0, 120, 0, H); gr.addColorStop(0, 'rgba(196,232,246,.97)'); gr.addColorStop(.25, 'rgba(84,150,186,.96)'); gr.addColorStop(.65, 'rgba(30,78,112,.97)'); gr.addColorStop(1, 'rgba(10,32,54,.99)'); g.fillStyle = gr;
      g.beginPath(); top.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); for (let i = n; i >= 0; i--) g.lineTo(...base[i]); g.closePath(); g.fill();
      g.fillStyle = 'rgba(12,40,64,.35)'; g.beginPath(); top.forEach(([x, y], i) => i ? g.lineTo(x + o * 40, y + 60) : g.moveTo(x + o * 40, y + 60)); for (let i = n; i >= 0; i--) g.lineTo(top[i][0] + o * 120, top[i][1] + 200); g.closePath(); g.fill(); // (the dark inside of the curl)
      g.strokeStyle = 'rgba(244,252,255,.95)'; g.lineWidth = 12; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); top.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.stroke(); // the foam lip
      g.fillStyle = 'rgba(244,252,255,.85)'; for (let i = 0; i < top.length; i++) { const [x, y] = top[i]; for (let j = 0; j < 2; j++) { g.beginPath(); g.arc(x + vr(-14, 14) - o * vr(0, 16), y + vr(-10, 8), vr(5, 14), 0, 7); g.fill(); } }
      g.restore(); }
    if (e.t >= e.hitAt) { const a = clamp(1 - (e.t - e.hitAt) / (e.dur - e.hitAt), 0, 1) * .42; g.save(); pirDeckPath(g, s); g.clip(); g.fillStyle = `rgba(120,185,220,${a})`; g.fillRect(0, 0, W, H); g.restore(); } // (the deck left wet)
  }
  function stormWaveFront(e) { // 🌊 the wave crashing across the deck (in front of the pirates)
    const c = (e.t - e.hitAt + .12) / .7; if (c <= 0 || c >= 1) return; const s = e.s, inward = s ? -1 : 1, u = easeIO(c), a = Math.min(.85, (1 - c) * 1.1), n = 16, P = z => .72 + z * .4, crest = [];
    for (let i = 0; i <= n; i++) { const z = i / n, x0 = outerOf(s, z), x1 = innerOf(s, z) + inward * 40; crest.push([x0 + (x1 - x0) * u, zY(z) - (170 * (1 - u) + 18) * P(z), z]); }
    g.save(); g.fillStyle = `rgba(140,200,228,${a})`; g.beginPath(); for (let i = 0; i <= n; i++) { const z = i / n; g.lineTo(outerOf(s, z) - inward * 30, zY(z) - (120 * (1 - u) + 40) * P(z)); } for (let i = n; i >= 0; i--) g.lineTo(crest[i][0], crest[i][1] + 34 * P(crest[i][2])); g.closePath(); g.fill();
    g.strokeStyle = `rgba(245,252,255,${Math.min(1, a * 1.3)})`; g.lineWidth = 9; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); crest.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.stroke();
    g.fillStyle = `rgba(245,252,255,${a})`; for (const [x, y, z] of crest) for (let j = 0; j < 2; j++) { g.beginPath(); g.arc(x + vr(-14, 14), y + vr(-10, 10), vr(7, 16) * P(z), 0, 7); g.fill(); }
    g.restore();
  }
  function stormTent(e) { // 🐙 chat's tentacle: up out of the sea beside the ship, across the deck, back down
    const s = e.s, inward = s ? -1 : 1, z = e.z0, p = .72 + z * .4, t = e.t, bx = outerOf(s, z) - inward * 95, by = seaY(z) + 14, x0 = outerOf(s, z) - inward * 40, x1 = innerOf(s, z) + inward * 70, hiY = zY(z) - 320 * p, deckY = zY(z) - 60 * p;
    let tx, ty, a = 1;
    if (t < .7) { const u = easeIO(t / .7); tx = bx + (x0 - bx) * u; ty = by + (hiY - by) * u; }
    else if (t < 1.45) { const u = easeIO((t - .7) / .75); tx = x0 + (x1 - x0) * u; ty = hiY + (deckY - hiY) * Math.min(1, u * 2.2); }
    else { const u = easeIO(clamp((t - 1.45) / 1, 0, 1)); tx = x1 + (bx - x1) * u; ty = deckY + (by + 60 - deckY) * u; a = 1 - clamp((t - 2.35) / .25, 0, 1); }
    const cx = (bx + tx) / 2 - inward * 30, cy = Math.min(by, ty) - 230 * p, at = u => [(1 - u) * (1 - u) * bx + 2 * u * (1 - u) * cx + u * u * tx, (1 - u) * (1 - u) * by + 2 * u * (1 - u) * cy + u * u * ty]; // (it arcs up over the rail)
    g.save(); g.globalAlpha = a; g.beginPath(); g.rect(-400, -3000, W + 800, seaY(z) + 3000); g.clip(); // (the part under the water isn't drawn)
    const N = 40, pts = []; for (let i = 0; i <= N; i++) { const u = i / N, [x, y] = at(u), [nx, ny] = at(Math.min(1, u + .01)), [px, py] = at(Math.max(0, u - .01)), dx = nx - px, dy = ny - py, l = Math.hypot(dx, dy) || 1; pts.push({ x, y, r: (38 - 29 * u) * p, nx: -dy / l, ny: dx / l }); }
    const side = k => pts.map(q => [q.x + q.nx * q.r * k, q.y + q.ny * q.r * k]);
    const L = side(1), Rr = side(-1).reverse(), tip = pts[N];
    const gr = g.createLinearGradient(pts[0].x, pts[0].y, tip.x, tip.y); gr.addColorStop(0, '#5a1a66'); gr.addColorStop(1, '#8a3a96'); g.fillStyle = gr;
    g.beginPath(); [...L, [tip.x + (tip.x - pts[N - 1].x) * .9, tip.y + (tip.y - pts[N - 1].y) * .9], ...Rr].forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(30,6,36,.6)'; g.lineWidth = 3; g.stroke();
    g.strokeStyle = 'rgba(255,200,255,.25)'; g.lineWidth = 5 * p; g.beginPath(); pts.forEach((q, i) => { const x = q.x + q.nx * q.r * .45, y = q.y + q.ny * q.r * .45; i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.stroke(); // (a shine)
    const under = pts[N >> 1].ny * inward > 0 ? -1 : 1; g.fillStyle = '#efc4f4'; g.strokeStyle = 'rgba(90,26,102,.7)'; g.lineWidth = 1.5;
    for (let i = 3; i < N - 1; i += 3) { const q = pts[i], sr = q.r * .32; g.beginPath(); g.arc(q.x + q.nx * q.r * .62 * under, q.y + q.ny * q.r * .62 * under, sr, 0, 7); g.fill(); g.stroke(); } // suckers underneath
    g.restore();
    if (t < .25 || (t > 2.05 && t < 2.35)) { g.strokeStyle = 'rgba(235,250,255,.7)'; g.lineWidth = 4; g.beginPath(); g.ellipse(bx, seaY(z), 60 * p, 12 * p, 0, 0, 7); g.stroke(); }
  }
  function pirWeather(real) { // ⛈️ rain over the whole screen + the lightning flash (on top of the picture, under the top bar)
    const n = GFX.quality === 'low' ? 60 : 150; while (WX.drops.length < n) WX.drops.push({ x: vr(-200, W), y: vr(-H, H), v: vr(1500, 2100), l: vr(20, 44), a: vr(.16, .42) }); if (WX.drops.length > n) WX.drops.length = n;
    g.save(); g.lineCap = 'round'; g.lineWidth = 1.6;
    for (const d of WX.drops) { d.y += d.v * real; d.x += d.v * .24 * real; if (d.y > H + 40) { d.y = vr(-120, -20); d.x = vr(-300, W); } g.strokeStyle = `rgba(200,215,235,${d.a})`; g.beginPath(); g.moveTo(d.x, d.y); g.lineTo(d.x - d.l * .24, d.y - d.l); g.stroke(); }
    if (WX.flash > 0 && GFX.flash !== false) { g.fillStyle = `rgba(215,228,255,${Math.min(.5, WX.flash * .45) * (Math.sin(performance.now() / 22) > 0 ? 1 : .6)})`; g.fillRect(0, 0, W, H); } // (no flash when screen flashes are switched off)
    g.restore();
  }

  // ---------- 🐒 the easter egg (1.70.0, Derek): in every Pirate Battle two little monkeys in pirate hats have a sword fight in a rowboat between the ships ----------
  // 🔴 T (TimePeace49) vs 🔵 K (Kirbgames). Who wins is random (the same on every screen: from the battle's id); the winner always gets grabbed by a kraken tentacle. Only looks.
  let MK = null, mkDbg = null; const MK_Z = -.3; // (just past the ships' bows: open water between them)
  function pirMonkeys(real) {
    const key = fightId || 'lobby|' + (scene.lookSeed || '') + '|' + F.length;
    if (!MK || MK.key !== key) { const h = hash(key + '|monkeys'), fast = !!scene.monkeyFast, sm = fightId && scene.mk && typeof scene.mk === 'object' ? scene.mk : null; // (sm: the server's plan for a real Pirate Battle)
      const end = Number.isInteger(sm?.end) && MK_ENDS[sm.end] ? sm.end : Number.isInteger(scene.monkey) && MK_ENDS[scene.monkey] ? scene.monkey : (h >>> 9) % MK_ENDS.length;
      MK = { key, t: fightId && mode === 'fight' && scene.startedAt ? Math.max(0, (Date.now() - scene.startedAt) / 1000) : 0, win: sm ? (sm.win ? 1 : 0) : h & 1, start: fast ? .6 : sm?.start ?? 2.5 + (h >>> 3) % 3, duel: fast ? 2.5 : sm?.duel ?? 9 + (h >>> 5) % 7, end, said: {}, clash: -1, chat: [null, null], early: null };
      MK.ko = MK.start + MK.duel; MK.e0 = MK.ko + 2.6;
      for (const [w, o] of Object.entries(sm?.out || {})) if (MK_ENDS[o?.end]) { const t0 = Math.max(0, (o.at - (scene.startedAt || o.at)) / 1000); MK.chat[w === '1' ? 1 : 0] = { end: o.end, t0, name: o.name }; if (t0 < MK.ko && (MK.early == null || t0 < MK.early)) MK.early = t0; } } // (a screen that opened late: chat's takeouts so far)
    MK.t = mode === 'lobby' ? 0 : Math.max(MK.t + real, mode === 'fight' && !finalPair ? T : 0);
    const t = MK.t, P2 = mkPlan(t), once = (k, at, fn) => { if (t >= at && !MK.said[k]) { MK.said[k] = 1; if (t - at < 1) fn(); } };
    if (t > MK.start && t < P2.duelEnd) { const c = Math.floor((t - MK.start) / .55); if (c !== MK.clash) { MK.clash = c; if (c % 2 === 0) { snd('clash', { v: .2 }); for (let i = 0; i < 6; i++) parts.push({ x: GAPX + vr(-6, 6), y: seaY(MK_Z) - 40, vx: vr(-140, 140), vy: vr(-200, -40), g: 900, life: vr(.15, .35), max: .35, size: vr(1.5, 3), color: '#ffe98a', gz: null }); } } } // (sword clinks + sparks)
    once('go', MK.start, () => snd('monkey'));
    if (P2.natural) once('ko', MK.ko, () => snd('bonk'));
    once('yay', P2.duelEnd + .5, () => snd('monkey'));
  }
  function pirMonkeyOut(m) { // 🐒 chat's "Take out Time" / "Take out Kirb" (channel points): that monkey goes the next way in the server's shuffled pile, right now
    if (!PIR() || !MK || !MK_ENDS[m.end] || !fightId) return; const i = m.who ? 1 : 0, e = mkPlan(MK.t).end[i];
    if (e && MK.t >= e.t0) return; // (already being taken out, or gone)
    MK.chat[i] = { end: m.end, t0: MK.t, name: m.name }; if (MK.t < MK.ko && MK.early == null) MK.early = MK.t; // (during the sword fight: the other one wins it)
    toast(`🐒 ${m.name ? m.name + ' TOOK OUT ' : ''}${i ? 'KIRB' : 'TIME'}!`);
  }
  function mkPlan(t) { // 🐒 who does what: the sword fight's plan + chat's takeouts
    const natural = MK.early == null, duelEnd = natural ? MK.ko : MK.early, end = [null, null];
    for (const i of [0, 1]) if (MK.chat[i]) end[i] = { idx: MK.chat[i].end, t0: MK.chat[i].t0 };
    const winner = natural ? MK.win : MK.chat[0] && MK.chat[0].t0 === MK.early ? 1 : 0; // (taken out during the fight = the other one wins it)
    if (natural && !end[MK.win]) end[MK.win] = { idx: MK.end, t0: MK.e0 }; // (the winner's usual ending, unless chat got it first)
    return { natural, duelEnd, end, winner };
  }
  function monkeyArt(x, y, f, pose, arm, rot, col, letter) { // 🐒 an original cartoon monkey (feet at x, y; f = which way it faces; arm: −1 low … 1 lunge, 2 = up)
    g.save(); g.translate(x, y); g.rotate(rot); g.lineCap = 'round'; g.lineJoin = 'round';
    const fur = '#7a4a26', tan = '#e0b884';
    g.strokeStyle = fur; g.lineWidth = 4; g.beginPath(); g.moveTo(-f * 6, -16); g.bezierCurveTo(-f * 20, -18, -f * 22, -36, -f * 12, -38); g.bezierCurveTo(-f * 6, -39, -f * 6, -32, -f * 11, -32); g.stroke(); // the curly tail
    g.lineWidth = 4.5; for (const d of [-1, 1]) { g.beginPath(); g.moveTo(d * 4, -14); g.lineTo(d * 6, 0); g.stroke(); } // legs
    g.fillStyle = fur; g.beginPath(); g.ellipse(0, -21, 9, 11, 0, 0, 7); g.fill(); g.fillStyle = tan; g.beginPath(); g.ellipse(f * 2, -20, 5.5, 7.5, 0, 0, 7); g.fill(); // body + belly
    g.strokeStyle = fur; g.lineWidth = 4; g.beginPath(); g.moveTo(-f * 6, -27); g.lineTo(-f * 13, pose === 'cheer' || pose === 'held' ? -40 : -18); g.stroke(); // the other arm
    const hx = f * 2, hy = -38;
    for (const d of [-1, 1]) { g.fillStyle = fur; g.beginPath(); g.arc(hx + d * 9, hy - 1, 3.8, 0, 7); g.fill(); g.fillStyle = tan; g.beginPath(); g.arc(hx + d * 9, hy - 1, 2, 0, 7); g.fill(); } // ears
    g.fillStyle = fur; g.beginPath(); g.arc(hx, hy, 9, 0, 7); g.fill();
    g.fillStyle = tan; g.beginPath(); g.ellipse(hx + f * 2.5, hy + 2.5, 6.5, 5, 0, 0, 7); g.fill(); g.beginPath(); g.arc(hx + f * 2.5 - 2.8, hy - 1.5, 3, 0, 7); g.arc(hx + f * 2.5 + 2.8, hy - 1.5, 3, 0, 7); g.fill(); // (a heart-shaped face)
    if (pose === 'down') { g.strokeStyle = '#2a1a10'; g.lineWidth = 1.3; for (const d of [-1, 1]) { const ex = hx + f * 2.5 + d * 2.6, ey = hy - 1; g.beginPath(); g.moveTo(ex - 1.5, ey - 1.5); g.lineTo(ex + 1.5, ey + 1.5); g.moveTo(ex + 1.5, ey - 1.5); g.lineTo(ex - 1.5, ey + 1.5); g.stroke(); } } // (x x eyes)
    else for (const d of [-1, 1]) { g.fillStyle = '#fff'; g.beginPath(); g.arc(hx + f * 2.5 + d * 2.6, hy - 1, pose === 'held' ? 2.3 : 1.9, 0, 7); g.fill(); g.fillStyle = '#1a1010'; g.beginPath(); g.arc(hx + f * 3.2 + d * 2.6, hy - .9, 1.05, 0, 7); g.fill(); }
    g.strokeStyle = '#4a2a14'; g.lineWidth = 1.2; g.beginPath(); if (pose === 'held') g.arc(hx + f * 2.5, hy + 4, 1.6, 0, 7); else g.arc(hx + f * 2.5, hy + 3, 2.2, pose === 'cheer' ? 0 : .25, pose === 'cheer' ? Math.PI : Math.PI - .25); g.stroke(); // mouth (an "O!" when grabbed)
    // 🏴‍☠️ a pirate hat in its crew's colour with its letter on the front (T = TimePeace49, K = Kirbgames)
    g.fillStyle = col; g.strokeStyle = '#1a0a06'; g.lineWidth = 1.4;
    g.beginPath(); g.moveTo(hx - 16, hy - 5); g.quadraticCurveTo(hx, hy - 1, hx + 16, hy - 5); g.quadraticCurveTo(hx + 12, hy - 10, hx + 10, hy - 14); g.quadraticCurveTo(hx, hy - 26, hx - 10, hy - 14); g.quadraticCurveTo(hx - 12, hy - 10, hx - 16, hy - 5); g.closePath(); g.fill(); g.stroke();
    g.strokeStyle = '#e0aa30'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(hx - 15, hy - 5.5); g.quadraticCurveTo(hx, hy - 1.5, hx + 15, hy - 5.5); g.stroke(); // (gold trim)
    g.font = `13px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = 2.6; g.strokeStyle = '#1a0a06'; g.strokeText(letter, hx, hy - 12.5); g.fillStyle = '#fff'; g.fillText(letter, hx, hy - 12.5);
    // the sword arm and a tiny cutlass
    const ax = f * 6, ay = -27, ang = arm >= 2 ? -Math.PI / 2 : -.55 + arm * .45, ex2 = ax + Math.cos(ang) * 10 * f, ey2 = ay + Math.sin(ang) * 10;
    g.strokeStyle = fur; g.lineWidth = 4; g.beginPath(); g.moveTo(ax, ay); g.lineTo(ex2, ey2); g.stroke();
    if (pose !== 'down' && pose !== 'held' && pose !== 'sit') { const bx = ex2 + Math.cos(ang) * 17 * f, by = ey2 + Math.sin(ang) * 17; g.strokeStyle = '#dfe4ec'; g.lineWidth = 2.6; g.beginPath(); g.moveTo(ex2, ey2); g.quadraticCurveTo((ex2 + bx) / 2 + 3, (ey2 + by) / 2 - 3, bx, by); g.stroke(); g.strokeStyle = '#e0aa30'; g.lineWidth = 3; g.beginPath(); g.moveTo(ex2 - Math.sin(ang) * 3.5, ey2 + Math.cos(ang) * 3.5); g.lineTo(ex2 + Math.sin(ang) * 3.5, ey2 - Math.cos(ang) * 3.5); g.stroke(); }
    g.restore();
  }
  // 🐒 the 20 ways the winning monkey gets taken out (1.70.0, Derek). The server picks one per battle from a shuffled pile (cards.js MONKEY_ENDS:
  // each gets used once before any repeats). ORDER MATTERS (the pile counts by position): only ADD new ones at the end and keep MONKEY_ENDS in step.
  // Boat coordinates: x across (0 = the middle of the boat), up is −y, the water is at y ≈ 4. Only looks: never touches the fight.
  const MKA = {
    under(fn) { g.save(); g.beginPath(); g.rect(-900, -1400, 1800, 1404); g.clip(); fn(); g.restore(); }, // (only the part above the water)
    fin(x, y) { g.fillStyle = '#5c6c7c'; g.beginPath(); g.moveTo(x - 9, y); g.quadraticCurveTo(x - 2, y - 14, x + 3, y - 24); g.quadraticCurveTo(x + 6, y - 10, x + 11, y); g.closePath(); g.fill(); },
    shark(x, y, rot, open, d) { g.save(); g.translate(x, y); g.rotate(rot); g.scale(d, 1);
      g.fillStyle = '#6a7c8e'; g.beginPath(); g.ellipse(0, 0, 44, 15, 0, 0, 7); g.fill(); g.fillStyle = '#e8eef2'; g.beginPath(); g.ellipse(4, 5, 34, 7, 0, 0, Math.PI); g.fill();
      g.fillStyle = '#5c6c7c'; g.beginPath(); g.moveTo(-6, -12); g.lineTo(4, -32); g.lineTo(12, -12); g.fill(); g.beginPath(); g.moveTo(-40, 0); g.lineTo(-62, -18); g.lineTo(-55, 0); g.lineTo(-62, 15); g.closePath(); g.fill();
      g.fillStyle = '#111'; g.beginPath(); g.arc(30, -5, 2.4, 0, 7); g.fill();
      if (open) { g.fillStyle = '#5a1018'; g.beginPath(); g.moveTo(45, -3); g.lineTo(24, 3); g.lineTo(45, 10); g.closePath(); g.fill(); g.fillStyle = '#fff'; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(29 + i * 3.8, 1.5); g.lineTo(30.9 + i * 3.8, -1.5); g.lineTo(32.8 + i * 3.8, 1.5); g.fill(); } }
      else { g.strokeStyle = '#2a3440'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(27, 4); g.lineTo(43, 2); g.stroke(); }
      g.restore(); },
    wave(x, h, d) { if (h < 2) return; g.save(); const gr = g.createLinearGradient(0, -h, 0, 6); gr.addColorStop(0, 'rgba(200,236,250,.95)'); gr.addColorStop(1, 'rgba(28,76,110,.95)'); g.fillStyle = gr; // a wave rearing up, curling over toward d
      g.beginPath(); g.moveTo(x - d * 90, 6); g.quadraticCurveTo(x - d * 70, -h * .8, x + d * 10, -h); g.quadraticCurveTo(x + d * 40, -h * 1.02, x + d * 46, -h * .72); g.quadraticCurveTo(x + d * 24, -h * .8, x + d * 30, 6); g.closePath(); g.fill();
      g.strokeStyle = 'rgba(246,252,255,.95)'; g.lineWidth = 5; g.lineCap = 'round'; g.beginPath(); g.moveTo(x - d * 60, -h * .7); g.quadraticCurveTo(x - d * 20, -h * 1.02, x + d * 46, -h * .72); g.stroke(); g.restore(); },
    ball(x, y) { g.fillStyle = 'rgba(200,200,200,.35)'; g.beginPath(); g.arc(x - 14, y + 4, 5, 0, 7); g.arc(x - 26, y + 8, 4, 0, 7); g.fill(); g.fillStyle = '#16161a'; g.beginPath(); g.arc(x, y, 7, 0, 7); g.fill(); g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.arc(x - 2, y - 2.5, 2.2, 0, 7); g.fill(); },
    puff(x, y, r, a) { if (a <= 0) return; g.save(); g.globalAlpha = a; for (const [dx, dy, k, c] of [[0, 0, 1, '#ffb02a'], [-r * .4, -r * .2, .7, '#ff6a1a'], [r * .45, -r * .1, .6, '#ffd27a'], [0, -r * .5, .55, '#5a5650']]) { g.fillStyle = c; g.beginPath(); g.arc(x + dx, y + dy, r * k, 0, 7); g.fill(); } g.restore(); },
    gull(x, y, fl, d = 1) { g.save(); g.translate(x, y); g.scale(d, 1); g.fillStyle = '#f4f4f0'; g.strokeStyle = '#1e1e24'; g.lineWidth = 1.6;
      for (const s of [-1, 1]) { g.beginPath(); g.moveTo(0, -2); g.quadraticCurveTo(s * 24, -16 - fl * 14, s * 52, -6 - fl * 22); g.quadraticCurveTo(s * 26, 2, 0, 4); g.closePath(); g.fill(); g.stroke(); g.fillStyle = '#5a5a66'; g.beginPath(); g.moveTo(s * 40, -8 - fl * 18); g.lineTo(s * 52, -6 - fl * 22); g.lineTo(s * 44, -2 - fl * 16); g.fill(); g.fillStyle = '#f4f4f0'; }
      g.beginPath(); g.ellipse(0, 0, 18, 8, 0, 0, 7); g.fill(); g.stroke(); g.beginPath(); g.arc(16, -6, 7, 0, 7); g.fill(); g.stroke(); g.fillStyle = '#f2b81a'; g.beginPath(); g.moveTo(22, -7); g.lineTo(31, -4); g.lineTo(22, -3); g.fill(); g.fillStyle = '#111'; g.beginPath(); g.arc(18, -8, 1.4, 0, 7); g.fill(); g.restore(); },
    barrel(x, y, rot, broken) { g.save(); g.translate(x, y); g.rotate(rot); g.fillStyle = '#8a5428'; g.beginPath(); g.ellipse(0, 0, 14, 18, 0, 0, 7); g.fill(); g.strokeStyle = '#3a200c'; g.lineWidth = 3; for (const d of [-9, 9]) { g.beginPath(); g.moveTo(-13, d); g.lineTo(13, d); g.stroke(); } if (broken) { g.strokeStyle = '#2a1608'; g.lineWidth = 2; g.beginPath(); g.moveTo(-6, -16); g.lineTo(-2, -4); g.lineTo(-8, 6); g.stroke(); } g.restore(); },
    banana(x, y, rot, peel) { g.save(); g.translate(x, y); g.rotate(rot); g.fillStyle = '#ffd83a'; g.strokeStyle = '#8a6a10'; g.lineWidth = 1.4;
      if (peel) { for (const a of [-1.2, -.4, .4, 1.2]) { g.beginPath(); g.ellipse(Math.sin(a) * 6, -Math.cos(a) * 3, 6, 2.4, a, 0, 7); g.fill(); g.stroke(); } }
      else { g.beginPath(); g.arc(0, 8, 12, Math.PI * 1.15, Math.PI * 1.85); g.arc(0, 8, 7, Math.PI * 1.85, Math.PI * 1.15, true); g.closePath(); g.fill(); g.stroke(); }
      g.restore(); },
    crab(x, y, snap) { g.save(); g.translate(x, y); g.strokeStyle = '#a01a14'; g.lineWidth = 2.4; g.lineCap = 'round'; for (const s of [-1, 1]) for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(s * 8, 2); g.lineTo(s * (16 + i * 3), 8 + i * 2); g.stroke(); }
      g.fillStyle = '#e0302a'; g.beginPath(); g.ellipse(0, 0, 14, 9, 0, 0, 7); g.fill(); for (const s of [-1, 1]) { g.beginPath(); g.moveTo(s * 10, -4); g.lineTo(s * 18, -14); g.stroke(); g.beginPath(); g.ellipse(s * 21, -17, 7, 5, s * .5, 0, 7); g.fill(); g.strokeStyle = '#7a0e0a'; g.beginPath(); g.moveTo(s * 25, -19); g.lineTo(s * (snap ? 19 : 29), -14); g.stroke(); g.strokeStyle = '#a01a14'; }
      for (const s of [-1, 1]) { g.strokeStyle = '#a01a14'; g.beginPath(); g.moveTo(s * 4, -7); g.lineTo(s * 5, -13); g.stroke(); g.fillStyle = '#fff'; g.beginPath(); g.arc(s * 5, -14, 2.6, 0, 7); g.fill(); g.fillStyle = '#111'; g.beginPath(); g.arc(s * 5, -14, 1.2, 0, 7); g.fill(); g.fillStyle = '#e0302a'; }
      g.restore(); },
    whale(x, y, k) { MKA.under(() => { g.save(); g.translate(x, y); g.fillStyle = '#3a4e6a'; g.beginPath(); g.ellipse(0, 26, 120, 40, 0, 0, 7); g.fill(); g.fillStyle = 'rgba(255,255,255,.12)'; g.beginPath(); g.ellipse(-20, 4, 70, 12, 0, Math.PI, 0); g.fill(); g.fillStyle = '#16202e'; g.beginPath(); g.ellipse(64, 6, 4, 3, 0, 0, 7); g.fill(); g.beginPath(); g.ellipse(-6, -12, 6, 2.5, 0, 0, 7); g.fill(); g.restore(); }); },
    spout(x, y, h, a) { if (a <= 0) return; g.save(); g.globalAlpha = a; const gr = g.createLinearGradient(0, y - h, 0, y); gr.addColorStop(0, 'rgba(236,248,255,.9)'); gr.addColorStop(1, 'rgba(170,214,236,.8)'); g.fillStyle = gr; g.beginPath(); g.moveTo(x - 7, y); g.quadraticCurveTo(x - 5, y - h * .6, x - 16, y - h); g.lineTo(x + 16, y - h); g.quadraticCurveTo(x + 5, y - h * .6, x + 7, y); g.closePath(); g.fill(); g.fillStyle = 'rgba(240,250,255,.9)'; for (let i = 0; i < 8; i++) { g.beginPath(); g.arc(x + Math.cos(i * .8) * 24, y - h + Math.sin(i * 1.7) * 10, 7, 0, 7); g.fill(); } g.restore(); },
    funnel(x, t) { g.save(); const top = -900, N = 16, Lp = [], Rp = []; // a twisting funnel of water from the clouds down to the sea
      for (let i = 0; i <= N; i++) { const u = i / N, y = top + (4 - top) * u, w = 84 - 70 * Math.pow(u, .7), sw = Math.sin(t * 6 + u * 5) * 16 * (1 - u * .5); Lp.push([x + sw - w, y]); Rp.push([x + sw + w, y]); }
      const gr = g.createLinearGradient(0, top, 0, 4); gr.addColorStop(0, 'rgba(110,122,140,.12)'); gr.addColorStop(.55, 'rgba(150,166,184,.55)'); gr.addColorStop(1, 'rgba(206,224,238,.75)'); g.fillStyle = gr;
      g.beginPath(); [...Lp, ...Rp.slice().reverse()].forEach(([px, py], i) => i ? g.lineTo(px, py) : g.moveTo(px, py)); g.closePath(); g.fill();
      g.strokeStyle = 'rgba(236,246,255,.5)'; g.lineWidth = 2; for (let j = 0; j < 6; j++) { g.beginPath(); for (let i = 0; i <= N; i++) { const u = i / N, [lx, y] = Lp[i], rx = Rp[i][0], m = (lx + rx) / 2, w = (rx - lx) / 2; g.lineTo(m + Math.sin(t * 9 + u * 14 + j * 1.05) * w, y); } g.stroke(); }
      g.fillStyle = 'rgba(236,248,255,.8)'; for (let i = 0; i < 12; i++) { const a = t * 8 + i * .52; g.beginPath(); g.arc(Lp[N][0] + 14 + Math.cos(a) * 34, 2 - Math.abs(Math.sin(a)) * 18, 4.5, 0, 7); g.fill(); } g.restore(); },
    line(x, y) { g.strokeStyle = 'rgba(230,230,220,.8)'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(x + 30, -1200); g.lineTo(x, y); g.stroke(); g.strokeStyle = '#c8ccd4'; g.lineWidth = 2.6; g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 14); g.arc(x - 5, y + 14, 5, 0, Math.PI); g.stroke(); g.fillStyle = '#e8303a'; g.beginPath(); g.arc(x, y - 30, 4, 0, 7); g.fill(); },
    hole(x) { g.fillStyle = '#100804'; g.beginPath(); g.moveTo(x - 16, -18); g.lineTo(x - 8, -12); g.lineTo(x - 2, -19); g.lineTo(x + 6, -12); g.lineTo(x + 16, -18); g.lineTo(x + 12, -8); g.lineTo(x - 12, -8); g.closePath(); g.fill(); },
    swordfish(x, y, d, rot) { g.save(); g.translate(x, y); g.rotate(rot); g.scale(d, 1); g.fillStyle = '#3a6aa8'; g.beginPath(); g.ellipse(0, 0, 30, 9, 0, 0, 7); g.fill(); g.fillStyle = '#c8d8e8'; g.beginPath(); g.ellipse(4, 3, 22, 4, 0, 0, Math.PI); g.fill(); g.strokeStyle = '#a8b8c8'; g.lineWidth = 3; g.lineCap = 'round'; g.beginPath(); g.moveTo(28, -1); g.lineTo(62, -3); g.stroke();
      g.fillStyle = '#2a5a98'; g.beginPath(); g.moveTo(-10, -7); g.quadraticCurveTo(0, -30, 14, -8); g.fill(); g.beginPath(); g.moveTo(-28, 0); g.lineTo(-44, -14); g.lineTo(-38, 0); g.lineTo(-44, 13); g.closePath(); g.fill(); g.fillStyle = '#111'; g.beginPath(); g.arc(20, -3, 1.8, 0, 7); g.fill(); g.restore(); },
    anchor(x, y, px, py) { g.strokeStyle = '#9a9aa6'; g.lineWidth = 3.5; g.setLineDash([5, 3]); g.beginPath(); g.moveTo(px, py); g.lineTo(x, y - 22); g.stroke(); g.setLineDash([]); // (on its chain)
      g.save(); g.translate(x, y); g.rotate(-Math.atan2(x - px, y - py)); g.scale(1.45, 1.45); g.strokeStyle = '#8a8a96'; g.fillStyle = '#8a8a96'; g.lineWidth = 5; g.lineCap = 'round'; g.beginPath(); g.moveTo(0, -20); g.lineTo(0, 16); g.moveTo(-10, -12); g.lineTo(10, -12); g.stroke(); g.beginPath(); g.arc(0, -24, 5, 0, 7); g.lineWidth = 3; g.stroke(); g.lineWidth = 5; g.beginPath(); g.arc(0, 4, 16, Math.PI * .15, Math.PI * .85); g.stroke(); for (const s of [-1, 1]) { g.beginPath(); g.moveTo(s * 15, 10); g.lineTo(s * 20, 2); g.lineTo(s * 9, 6); g.fill(); } g.restore(); },
    serpent(x, h, d, open) { if (h <= 0) return; MKA.under(() => { g.save(); g.lineCap = 'round'; const hx = x + d * 30, hy = 6 - h; g.strokeStyle = '#2e8a4a'; g.lineWidth = 22; g.beginPath(); g.moveTo(x - d * 30, 30); g.bezierCurveTo(x - d * 40, -h * .5, x + d * 40, -h * .8, hx, hy); g.stroke(); g.strokeStyle = '#9ae0a0'; g.lineWidth = 7; g.beginPath(); g.moveTo(x - d * 24, 30); g.bezierCurveTo(x - d * 32, -h * .5, x + d * 46, -h * .8, hx + d * 4, hy + 4); g.stroke(); // (its belly)
      g.fillStyle = '#2e8a4a'; g.beginPath(); g.ellipse(hx + d * 12, hy, 22, 15, d * .2, 0, 7); g.fill(); g.fillStyle = '#ffe14a'; g.beginPath(); g.arc(hx + d * 8, hy - 8, 4.5, 0, 7); g.fill(); g.fillStyle = '#111'; g.beginPath(); g.ellipse(hx + d * 8, hy - 8, 1.4, 3.6, 0, 0, 7); g.fill();
      if (open) { g.fillStyle = '#5a1018'; g.beginPath(); g.moveTo(hx + d * 34, hy - 6); g.lineTo(hx + d * 14, hy + 2); g.lineTo(hx + d * 34, hy + 14); g.closePath(); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.moveTo(hx + d * 26, hy - 3); g.lineTo(hx + d * 28, hy + 3); g.lineTo(hx + d * 30, hy - 4); g.fill(); } g.restore(); }); },
    rocket(x, y, rot, lit) { g.save(); g.translate(x, y); g.rotate(rot); if (lit) { g.fillStyle = '#ffb02a'; g.beginPath(); g.moveTo(-5, 14); g.lineTo(0, 30 + Math.random() * 14); g.lineTo(5, 14); g.fill(); g.fillStyle = '#fff2a0'; g.beginPath(); g.moveTo(-2.5, 14); g.lineTo(0, 22 + Math.random() * 6); g.lineTo(2.5, 14); g.fill(); }
      g.fillStyle = '#e8303a'; g.fillRect(-5, -12, 10, 26); g.fillStyle = '#fff'; g.fillRect(-5, -4, 10, 4); g.fillRect(-5, 6, 10, 4); g.fillStyle = '#ffd23a'; g.beginPath(); g.moveTo(-6, -12); g.lineTo(0, -24); g.lineTo(6, -12); g.fill(); g.strokeStyle = '#8a5a2a'; g.lineWidth = 2; g.beginPath(); g.moveTo(6, 10); g.lineTo(10, 40); g.stroke(); g.restore(); },
    burst(x, y, r, a) { if (a <= 0) return; g.save(); g.globalAlpha = a; const cols = ['#ff4a6a', '#ffd23a', '#4ad8ff', '#7dff7a', '#d07aff']; for (let i = 0; i < 24; i++) { const ang = i / 24 * Math.PI * 2; g.strokeStyle = cols[i % 5]; g.lineWidth = 3; g.beginPath(); g.moveTo(x + Math.cos(ang) * r * .35, y + Math.sin(ang) * r * .35); g.lineTo(x + Math.cos(ang) * r, y + Math.sin(ang) * r); g.stroke(); g.fillStyle = cols[(i + 2) % 5]; g.beginPath(); g.arc(x + Math.cos(ang) * r * 1.08, y + Math.sin(ang) * r * 1.08, 3, 0, 7); g.fill(); } g.restore(); },
    parrot(x, y, fl, col, d) { g.save(); g.translate(x, y); g.scale(d, 1); g.fillStyle = col; g.beginPath(); g.ellipse(0, 0, 10, 6, -.2, 0, 7); g.fill(); g.beginPath(); g.moveTo(-2, -2); g.lineTo(-10, -14 - fl * 8); g.lineTo(6, -3); g.fill(); g.beginPath(); g.moveTo(-8, 1); g.lineTo(-20, 6); g.lineTo(-8, 4); g.fill(); g.beginPath(); g.arc(9, -4, 4.6, 0, 7); g.fill(); g.fillStyle = '#ffd23a'; g.beginPath(); g.moveTo(12, -5); g.quadraticCurveTo(17, -3, 13, 0); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(10, -5.5, 1.6, 0, 7); g.fill(); g.restore(); },
    puffer(x, y, r) { g.save(); g.translate(x, y); g.strokeStyle = '#a8862a'; g.lineWidth = 2; for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; g.beginPath(); g.moveTo(Math.cos(a) * r * .9, Math.sin(a) * r * .9); g.lineTo(Math.cos(a) * r * 1.22, Math.sin(a) * r * 1.22); g.stroke(); } g.fillStyle = '#f0c850'; g.beginPath(); g.arc(0, 0, r, 0, 7); g.fill(); g.fillStyle = '#fff4d0'; g.beginPath(); g.ellipse(0, r * .35, r * .7, r * .45, 0, 0, 7); g.fill(); for (const s of [-1, 1]) { g.fillStyle = '#fff'; g.beginPath(); g.arc(s * r * .35, -r * .25, r * .2, 0, 7); g.fill(); g.fillStyle = '#111'; g.beginPath(); g.arc(s * r * .35, -r * .22, r * .1, 0, 7); g.fill(); } g.fillStyle = '#c84a4a'; g.beginPath(); g.ellipse(0, r * .15, r * .12, r * .1, 0, 0, 7); g.fill(); g.restore(); },
    bolt(x0, y0, x1, y1) { boltDraw(boltPts(x0, y0, x1, y1, 7, 10), 3, 1); }
  };
  const bob = (k, h = 6) => -Math.abs(Math.sin(k * 7)) * h, ease = easeIO;
  const MK_ENDS = [
    { name: 'Kraken tentacle', dur: 1.9, back: true, run(k, A) { const w = A.w, o = A.out, bx = w.x + o * 62, rise = ease(clamp(k / .8, 0, 1)), lift = clamp((k - .8) / .35, 0, 1), pull = clamp((k - 1.15) / .45, 0, 1);
      const hx = w.x + (bx - w.x) * ease(lift), hy = -6 - 46 * Math.sin(lift * Math.PI / 2) + 150 * ease(pull), tipX = k < .8 ? bx + (w.x - bx) * rise * .9 : hx, tipY = k < .8 ? 14 - 80 * rise : hy - 18;
      if (k < .8) A.mon(w.x, -6 + bob(k, 5), { pose: 'cheer' });
      MKA.under(() => { for (let i = 0; i <= 16; i++) { const u = i / 16, x = bx + (tipX - bx) * u + Math.sin(u * 3 + k * 4) * 6 * (1 - u), y = 30 + (tipY - 30) * u - Math.sin(u * Math.PI) * 30, r = 9 - 6 * u; g.fillStyle = i % 2 ? '#7a2a86' : '#6a2276'; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); if (i % 3 === 1) { g.fillStyle = '#e8b8f0'; g.beginPath(); g.arc(x, y + r * .5, r * .3, 0, 7); g.fill(); } }
        if (k >= .8 && k < 1.65) { A.mon(hx, hy, { pose: 'held', rot: Math.sin(k * 18) * .3 }); g.strokeStyle = '#7a2a86'; g.lineWidth = 5; g.beginPath(); g.ellipse(hx, hy - 20, 12, 5, .2, 0, 7); g.stroke(); } });
      A.once('s', 1.35, () => { A.splash(bx); A.word('GLUB!', bx); }); } },
    { name: 'Lightning', dur: 2.2, run(k, A) { const w = A.w, o = A.out; // a bolt hits the sword it's holding up
      if (k < .35) return A.mon(w.x, -6 + bob(k), { pose: 'cheer' });
      A.once('z', .35, () => { A.snd('zap'); A.snd('thunder'); A.flash(); A.word('ZAP!'); });
      if (k < .75) { MKA.bolt(w.x + 40, -520, w.x + w.f * 6, -60); A.mon(w.x, -6, { pose: 'cheer', burnt: 1, rot: Math.sin(k * 60) * .06 }); return; }
      const u = clamp((k - 1.05) / .6, 0, 1); A.mon(w.x + o * 46 * u, -6 + 110 * u * u, { pose: 'down', rot: o * 1.5 * clamp((k - .75) / .35, 0, 1), burnt: 1, under: true });
      A.once('s', 1.6, () => A.splash(w.x + o * 46)); } },
    { name: 'Shark', dur: 2, run(k, A) { const w = A.w, o = A.out, u = clamp((k - .35) / .9, 0, 1), sx = w.x + o * 100 - o * 200 * u, sy = 12 - Math.sin(u * Math.PI) * 92;
      if (u <= .45) A.mon(w.x, -6 + (k < .35 ? bob(k) : 0), { pose: k > .25 ? 'held' : 'cheer' });
      MKA.under(() => { if (k < .35) MKA.fin(w.x + o * (120 - k * 60), 4); else if (u < 1) { MKA.shark(sx, sy, o * (u - .5) * 2, u > .3 && u < .48, -o); if (u > .45) A.mon(sx - o * 30, sy + 2, { pose: 'held', rot: o * (u - .5) * 2, scale: .85 }); } });
      A.once('c', .35 + .9 * .45, () => { A.snd('bite'); A.word('CHOMP!'); }); A.once('s', 1.25, () => A.splash(w.x - o * 100)); } },
    { name: 'Big wave', dur: 2, back: true, run(k, A) { const w = A.w, o = A.out, r = ease(clamp(k / .7, 0, 1)), c = clamp((k - .7) / .7, 0, 1);
      MKA.wave(w.x - o * 30, 130 * r * (1 - c * .7), o);
      if (k < .75) A.mon(w.x, -6, { pose: k > .4 ? 'held' : 'cheer' }); else A.mon(w.x + o * 170 * c, -6 - Math.sin(c * Math.PI) * 60 + 50 * c * c, { pose: 'held', rot: o * c * 5, under: true });
      A.once('w', .75, () => { A.snd('splash'); A.word('SPLOOSH!'); }); A.once('s', 1.4, () => A.splash(w.x + o * 170)); } },
    { name: 'Cannonball', dur: 2.2, run(k, A) { const w = A.w, o = A.out, u = clamp(k / .45, 0, 1), bx = w.x - o * 300 + o * 300 * u, by = -200 + 170 * u; // (a stray shot from one of the ships)
      if (k < .45) { A.mon(w.x, -6 + bob(k), { pose: 'cheer' }); MKA.ball(bx, by); return; }
      A.once('b', .45, () => { A.snd('boom'); A.word('BOOM!'); }); const t = k - .45, f = clamp(t / 1.2, 0, 1); MKA.puff(w.x, -30, 22 + t * 70, 1 - t / .35);
      A.mon(w.x + o * 230 * f, -30 - Math.sin(f * Math.PI) * 130 + 60 * f * f, { pose: 'down', rot: o * f * 9, burnt: .6, under: true }); A.once('s', 1.65, () => A.splash(w.x + o * 230)); } },
    { name: 'Seagull', dur: 2.4, run(k, A) { const w = A.w, o = A.out, u = clamp(k / .7, 0, 1), up = clamp((k - .7) / 1.5, 0, 1); // a huge gull swoops down and carries it off
      const px = k < .7 ? w.x - o * 220 * (1 - ease(u)) : w.x + o * 300 * up * up, py = k < .7 ? -240 + 180 * ease(u) : -60 - 420 * up * up;
      if (k < .7) A.mon(w.x, -6 + bob(k), { pose: 'cheer' }); else A.mon(px - o * 2, py + 54, { pose: 'held', rot: Math.sin(k * 9) * .25 });
      MKA.gull(px, py, Math.sin(k * 16), o); A.once('g', .7, () => { A.snd('squawk'); A.word('SQUAWK!'); }); } },
    { name: 'Falling barrel', dur: 2.2, run(k, A) { const w = A.w, o = A.out, u = clamp(k / .5, 0, 1); // a barrel falls off a ship onto it
      if (k < .5) { A.mon(w.x, -6 + bob(k), { pose: 'cheer' }); MKA.barrel(w.x, -400 + 340 * u * u, k * 5); return; }
      A.once('b', .5, () => { A.snd('bonk'); A.word('BONK!'); }); const t = k - .5, sq = clamp(t / .1, 0, 1), roll = clamp((t - .7) / .8, 0, 1);
      A.mon(w.x + o * 90 * roll, -6 + 60 * roll * roll, { pose: 'down', sy: 1 - .7 * sq, sx: 1 + .5 * sq, under: true }); MKA.under(() => MKA.barrel(w.x + o * 100 * roll, -22 + 4 * sq + 70 * roll * roll, roll * 4, true));
      A.once('s', 1.45, () => A.splash(w.x + o * 90)); } },
    { name: 'Banana peel', dur: 2.3, run(k, A) { const w = A.w, o = A.out; // a snack, the peel, a slip, over the side
      if (k < .6) { A.mon(w.x, -6, { pose: 'idle', arm: -1 }); MKA.banana(w.x + w.f * 12, -32, -.4, false); return; }
      MKA.banana(w.x + o * 14, -9, 0, true); if (k < .9) return A.mon(w.x, -6, { pose: 'idle' });
      A.once('w', .9, () => { A.snd('whoosh'); A.word('WHOOPS!'); }); const u = clamp((k - .9) / .9, 0, 1);
      A.mon(w.x + o * 120 * u, -6 - Math.sin(u * Math.PI) * 70 + 70 * u * u, { pose: 'down', rot: o * u * 6, under: true }); A.once('s', 1.8, () => A.splash(w.x + o * 120)); } },
    { name: 'Crab', dur: 2.2, run(k, A) { const w = A.w, o = A.out, u = clamp(k / .6, 0, 1); // a crab climbs in and pinches its tail
      MKA.crab(w.x + o * (74 - 58 * u), -10 - 6 * Math.min(1, u * 2), Math.sin(k * 14) > 0);
      if (k < .75) return A.mon(w.x, -6 + (k < .6 ? bob(k) : 0), { pose: 'cheer' });
      A.once('p', .75, () => { A.snd('chop'); A.snd('monkey', { v: 1.4 }); A.word('YOWCH!'); }); const f = clamp((k - .75) / 1.1, 0, 1);
      A.mon(w.x + o * 150 * f, -6 - Math.sin(f * Math.PI) * 160 + 40 * f, { pose: 'held', rot: Math.sin(k * 20) * .2, under: true }); A.once('s', 1.85, () => A.splash(w.x + o * 150)); } },
    { name: 'Whale', dur: 2.6, back: true, run(k, A) { const w = A.w, o = A.out, r = ease(clamp(k / .6, 0, 1)), bl = clamp((k - .7) / .3, 0, 1), up = clamp((k - .75) / .9, 0, 1); // a whale comes up and blows it sky-high
      MKA.whale(w.x + o * 30, 30 - 28 * r, r); if (k > .7 && k < 1.7) MKA.spout(w.x, -6, 60 + 300 * bl, 1 - clamp((k - 1.35) / .35, 0, 1));
      A.mon(w.x, -6 - 640 * up * up, { pose: k > .3 ? 'held' : 'cheer', rot: up * 8 });
      A.once('f', .75, () => { A.snd('whoosh'); A.snd('splash'); A.word('FWOOSH!'); }); A.once('s', 2.45, () => A.splash(w.x + o * 260, .35)); } },
    { name: 'Waterspout', dur: 2.6, run(k, A) { const w = A.w, o = A.out, x = w.x + o * 230 - o * 230 * ease(clamp(k / .8, 0, 1)) + (k > 1.5 ? o * 420 * (k - 1.5) : 0), up = clamp((k - .8) / 1.2, 0, 1); // a twister of water sucks it up
      MKA.funnel(x, k); if (k < .8) A.mon(w.x, -6, { pose: k > .4 ? 'held' : 'cheer' }); else A.mon(x + Math.sin(k * 14) * (16 + 22 * up), -20 - 360 * up, { pose: 'held', rot: k * 12, scale: 1 - .5 * up });
      A.once('t', .8, () => { A.snd('whoosh'); A.word('WHOOOSH!'); }); } },
    { name: 'Fishing hook', dur: 2.2, run(k, A) { const w = A.w, d = clamp(k / .6, 0, 1), up = clamp((k - .85) / 1, 0, 1), hx = w.x + 2, hy = -480 + 405 * ease(d) - 520 * up * up; // a hook from the rigging snags its hat
      MKA.line(hx, hy); if (k >= .85) A.mon(hx, hy + 78, { pose: 'held', rot: Math.sin(k * 10) * .4 }); else A.mon(w.x, -6 + (k < .6 ? bob(k) : 0), { pose: k > .6 ? 'held' : 'cheer' });
      A.once('y', .85, () => { A.snd('whoosh'); A.word('YOINK!'); }); } },
    { name: 'Rotten plank', dur: 2, run(k, A) { const w = A.w; // it jumps for joy so hard the plank breaks
      if (k < .5) return A.mon(w.x, -6 + bob(k * 1.3, 11), { pose: 'cheer' });
      A.once('c', .5, () => { A.snd('chop'); A.word('CRACK!'); }); MKA.hole(w.x); const u = clamp((k - .55) / .5, 0, 1); A.mon(w.x, -6 + 90 * u * u, { pose: 'held', under: true }); A.once('s', .85, () => A.splash(w.x, .5)); } },
    { name: 'Swordfish', dur: 2, back: true, run(k, A) { const w = A.w, o = A.out, u = clamp((k - .2) / .7, 0, 1), fx = w.x - o * 130 + o * 230 * u, fy = 12 - Math.sin(u * Math.PI) * 64, hit = .2 + .7 * .5; // a swordfish has a sword too
      if (k < hit) A.mon(w.x, -6, { pose: 'fight', arm: Math.sin(k * 20) * .8, f: -o });
      MKA.under(() => { if (u > 0 && u < 1) MKA.swordfish(fx, fy, o, (u - .5) * o * 1.4); });
      if (k >= hit) { const f = clamp((k - hit) / .9, 0, 1); A.mon(w.x + o * 170 * f, -6 - Math.sin(f * Math.PI) * 90 + 50 * f, { pose: 'down', rot: o * f * 7, under: true }); }
      A.once('h', hit, () => { A.snd('clash'); A.word('SHING!'); }); A.once('s', hit + .9, () => A.splash(w.x + o * 170)); } },
    { name: 'Anchor', dur: 2.2, run(k, A) { const w = A.w, o = A.out, px = w.x - o * 150, py = -330, a = -1.15 + 2.3 * ease(clamp(k / .9, 0, 1)), ax = px + Math.sin(a) * 300 * -o * -1, ay = py + Math.cos(a) * 300; // it swings in on its chain
      MKA.anchor(ax, ay, px, py); const hit = .45;
      if (k < hit) return A.mon(w.x, -6 + bob(k), { pose: 'cheer' });
      A.once('a', hit, () => { A.snd('slam'); A.word('CLONK!'); }); const f = clamp((k - hit) / 1, 0, 1); A.mon(w.x + o * 190 * f, -6 - Math.sin(f * Math.PI) * 110 + 50 * f, { pose: 'down', rot: o * f * 8, under: true }); A.once('s', hit + 1, () => A.splash(w.x + o * 190)); } },
    { name: 'Sea serpent', dur: 2.4, back: true, run(k, A) { const w = A.w, o = A.out, r = ease(clamp(k / .7, 0, 1)), gulp = clamp((k - .9) / .25, 0, 1), down = clamp((k - 1.4) / .8, 0, 1); // a sea serpent snaps it up
      MKA.serpent(w.x + o * 70, 210 * r - 260 * down, -o, k > .65 && k < 1.05);
      if (k < .9) A.mon(w.x, -6, { pose: k > .5 ? 'held' : 'cheer' }); else if (gulp < 1) A.mon(w.x + o * 20 * gulp, -6 - 110 * gulp, { pose: 'held', scale: 1 - .6 * gulp });
      A.once('g', .9, () => { A.snd('bite'); A.word('GULP!'); }); A.once('s', 2.05, () => A.splash(w.x + o * 70)); } },
    { name: 'Firework', dur: 2.7, run(k, A) { const w = A.w, rx = w.x + w.f * 12; // it lights a victory rocket… and holds on to it
      if (k < .6) { A.mon(w.x, -6, { pose: 'cheer' }); MKA.rocket(rx, -72, 0, k > .3); return; }
      const u = clamp((k - .6) / 1, 0, 1), y = -72 - 330 * u * u; if (u < 1) { MKA.rocket(rx, y, Math.sin(k * 30) * .1, true); A.mon(rx, y + 66, { pose: 'held', rot: Math.sin(k * 30) * .2 }); }
      A.once('l', .6, () => { A.snd('whoosh'); A.word('WHEEE!'); }); if (k > 1.6) MKA.burst(rx, -402, 30 + (k - 1.6) * 150, 1 - (k - 1.6)); A.once('p', 1.6, () => { A.snd('confettiPop'); A.flash(); }); } },
    { name: 'Parrots', dur: 2.6, run(k, A) { const w = A.w, o = A.out, u = clamp(k / .7, 0, 1), up = clamp((k - .8) / 1.6, 0, 1); // a flock of parrots carries it off
      const px = k < .8 ? w.x - o * 250 * (1 - ease(u)) : w.x + o * 320 * up, py = k < .8 ? -270 + 200 * ease(u) : -66 - 330 * up;
      [[-16, '#e8303a'], [0, '#2ab84a'], [16, '#2a7ad8']].forEach(([dx, c], i) => MKA.parrot(px + dx, py - 10 - Math.abs(dx) * .4, Math.sin(k * 18 + i), c, o));
      if (k < .8) A.mon(w.x, -6 + bob(k), { pose: 'cheer' }); else A.mon(px, py + 54, { pose: 'held', rot: Math.sin(k * 8) * .2 });
      A.once('p', .8, () => { A.snd('squawk'); A.word('BYE BYE!'); }); } },
    { name: 'Pufferfish', dur: 2.2, run(k, A) { const w = A.w, o = A.out, r = 6 + 40 * ease(clamp((k - .3) / .3, 0, 1)), f = clamp((k - .62) / 1, 0, 1); // a pufferfish puffs up right under its feet
      if (k > .1) MKA.puffer(w.x + o * 6, -6 - r * .5, r);
      if (k < .62) A.mon(w.x, -6 - (k > .3 ? r * 1.4 : 0), { pose: k > .3 ? 'held' : 'cheer' }); else A.mon(w.x + o * 170 * f, -6 - 60 - Math.sin(f * Math.PI) * 120 + 130 * f * f, { pose: 'held', rot: o * f * 5, under: true });
      A.once('b', .62, () => { A.snd('bonk', { p: .7 }); A.word('BOING!'); }); A.once('s', 1.62, () => A.splash(w.x + o * 170)); } },
    { name: 'Revenge kick', dur: 2.6, revenge: true, run(k, A) { const w = A.w, L = A.L, o = A.out; // the loser wakes up early, sneaks up and kicks the winner overboard
      const sneak = ease(clamp((k - .3) / .65, 0, 1)), lx = L.x + (w.x - o * 16 - L.x) * sneak, kick = k > .95 && k < 1.2;
      if (k < .3) A.mon(L.x, -14, { who: 'L', pose: 'down', rot: -L.f * 1.45 });
      else A.mon(lx, -6 + (k < 1.35 ? bob(k * 1.6, 2) : bob(k, 8)), { who: 'L', pose: k >= 1.35 ? 'cheer' : kick ? 'fight' : 'idle', arm: kick ? 1 : k >= 1.35 ? 2 : -.7, f: k >= 1.35 ? -o : o });
      if (k < 1) A.mon(w.x, -6 + bob(k), { pose: 'cheer', f: o }); // (not looking: cheering out at the sea)
      else { const f = clamp((k - 1) / .9, 0, 1); A.mon(w.x + o * 160 * f, -6 - Math.sin(f * Math.PI) * 90 + 60 * f * f, { pose: 'held', rot: o * f * 6, under: true }); }
      A.once('k', 1, () => { A.snd('bonk'); A.snd('monkey'); A.word('KICKED!'); }); A.once('s', 1.9, () => A.splash(w.x + o * 160)); } }
  ];
  function pirMonkeysDraw(tt) { // the rowboat in the open water between the ships' bows (drawn before the ships)
    if (!MK) return; const t = MK.t, wy = seaY(MK_Z) + Math.sin(tt * 1.7) * 3, cx = GAPX + Math.sin(tt * .45) * 10, tilt = Math.sin(tt * 1.3) * .06, sc = 1.1;
    const P2 = mkPlan(t), ph = (t - MK.start) * 3.3, W2 = P2.winner, L2 = 1 - W2, runs = [];
    const m = [{ i: 0, x: -22, f: 1, col: CREW[0].col, letter: 'T' }, { i: 1, x: 22, f: -1, col: CREW[1].col, letter: 'K' }];
    const wE = P2.end[W2], wake = !P2.natural ? Infinity : wE ? (MK_ENDS[wE.idx].revenge ? wE.t0 : wE.t0 + MK_ENDS[wE.idx].dur + .8) : Infinity; // (the knocked-out loser wakes once the winner is gone)
    for (const o of m) { o.y = -6; o.pose = 'idle'; o.arm = -.7; o.rot = 0; o.show = true; const e = P2.end[o.i];
      if (e && t >= e.t0) { o.show = false; const E = MK_ENDS[e.idx] || MK_ENDS[0]; if (t - e.t0 < E.dur) runs.push({ o, E, ek: t - e.t0 }); continue; } // (being taken out: its ending draws it)
      if (t <= MK.start) o.y -= Math.abs(Math.sin(tt * 3 + o.i * 1.7)) * 2;
      else if (t < P2.duelEnd) { const l = Math.max(0, Math.sin(ph + o.i * 2.4)); o.x += o.f * l * 12; o.arm = l > .55 ? 1 : -.4 + Math.sin(ph * 2 + o.i) * .3; o.y -= Math.abs(Math.sin(ph * 1.3 + o.i)) * 4; o.pose = 'fight'; }
      else if (o.i === W2) { const c = t - P2.duelEnd; if (c < 2.6) { o.pose = 'cheer'; o.arm = 2; o.y -= Math.abs(Math.sin(c * 7)) * 12; } else { o.f = Math.sin(c * 1.3) > 0 ? 1 : -1; } } // (won: cheers, then looks around)
      else if (t < wake) { o.pose = 'down'; o.rot = -o.f * Math.min(1, (t - P2.duelEnd) / .35) * 1.45; o.y = -14; } // (knocked flat, dizzy)
      else if (wE && MK_ENDS[wE.idx].revenge && t < wake + MK_ENDS[wE.idx].dur + 2) { o.pose = 'cheer'; o.arm = 2; o.y -= Math.abs(Math.sin(t * 6)) * 6; } // (🙈 it got its revenge)
      else { o.pose = 'sit'; o.arm = -1; o.f = Math.sin((t - wake) * 2.6) > 0 ? 1 : -1; o.y = -2; } }
    const mystery = { i: -1, x: 0, f: 1, col: '#3a3a44', letter: '?' }; // (🙈 a revenge kick when the other monkey is already gone: a mystery monkey climbs in)
    const mkA = r => { const w = r.o, other = m[1 - w.i], L = r.otherHere ? other : { ...mystery, x: -w.x, f: -w.f };
      return { w, L, out: w.x < 0 ? -1 : 1,
        mon: (x, y, o = {}) => { const mm = o.who === 'L' ? L : w, d = () => { g.save(); g.translate(x, y); const z2 = o.scale ?? 1; if (z2 !== 1 || o.sx || o.sy) g.scale(z2 * (o.sx ?? 1), z2 * (o.sy ?? 1)); if (o.burnt) g.filter = `brightness(${1 - .65 * o.burnt})`; monkeyArt(0, 0, o.f ?? mm.f, o.pose ?? 'held', o.arm ?? (o.pose === 'cheer' ? 2 : -.7), o.rot ?? 0, mm.col, mm.letter); g.restore(); }; o.under ? MKA.under(d) : d(); },
        once: (key, at, fn) => { const kk = 'e' + w.i + key; if (r.ek >= at && !MK.said[kk]) { MK.said[kk] = 1; if (r.ek - at < 1) fn(); } },
        splash: (x, kk = .6) => pirSplash(cx + x * sc, MK_Z, kk, false), word: (txt, x) => word(txt, cx + (x ?? w.x) * sc, wy - 100 * sc, '#ffe98a', 34),
        snd: (n, o) => snd(n, o), flash: () => { WX.flash = Math.max(WX.flash, .9); } }; };
    for (const r of runs) { r.otherHere = m[1 - r.o.i].show; if (r.E.revenge && r.otherHere) m[1 - r.o.i].show = false; } // (🙈 the revenge ending moves the other monkey itself)
    g.save(); g.translate(cx, wy); g.rotate(tilt); g.scale(sc, sc);
    for (const r of runs) if (r.E.back) r.E.run(r.ek, mkA(r)); // (things that come up behind the boat)
    g.fillStyle = '#3a2210'; g.beginPath(); g.ellipse(0, -16, 68, 7, 0, 0, 7); g.fill(); // (the inside of the boat)
    for (const o of m) if (o.show) { monkeyArt(o.x, o.y, o.f, o.pose, o.arm, o.rot, o.col, o.letter); if (o.pose === 'down') for (let i = 0; i < 3; i++) { const a = tt * 5 + i * 2.1; g.fillStyle = '#ffd23a'; g.beginPath(); g.arc(o.x - o.f * 26 + Math.cos(a) * 9, -30 + Math.sin(a) * 3, 2.4, 0, 7); g.fill(); } } // (dizzy stars)
    g.fillStyle = '#5a341a'; g.beginPath(); g.moveTo(-72, -17); g.quadraticCurveTo(-66, 8, -30, 10); g.lineTo(30, 10); g.quadraticCurveTo(66, 8, 72, -17); g.closePath(); g.fill(); g.strokeStyle = '#2a1608'; g.lineWidth = 3; g.stroke();
    g.strokeStyle = 'rgba(160,110,60,.7)'; g.lineWidth = 2; for (const y of [-9, -1]) { g.beginPath(); g.moveTo(-66 + (y + 17) * .5, y); g.lineTo(66 - (y + 17) * .5, y); g.stroke(); }
    g.fillStyle = '#c8965a'; g.fillRect(-74, -20, 148, 5); g.strokeStyle = '#9a6a3a'; g.lineWidth = 3; g.beginPath(); g.moveTo(-44, -18); g.lineTo(-98, 6); g.moveTo(44, -18); g.lineTo(98, 6); g.stroke(); // the rim + the oars
    g.fillStyle = 'rgba(18,40,62,.88)'; g.beginPath(); g.ellipse(0, 7, 92, 8, 0, 0, 7); g.fill(); g.strokeStyle = 'rgba(220,240,255,.45)'; g.lineWidth = 2; g.beginPath(); g.ellipse(0, 7, 92, 8, 0, Math.PI * .05, Math.PI * .95); g.stroke(); // the water round it
    for (const r of runs) if (!r.E.back) r.E.run(r.ek, mkA(r)); // 🐒 how it gets taken out this time
    g.restore();
  }
  function pirFront(now) { // in front of the pirates: the stern rails, the swing ropes, cannonballs in the air
    const P = pirS();
    for (const e of P.storm.fx) e.kind === 'wave' ? stormWaveFront(e) : e.kind === 'tentacle' ? stormTent(e) : stormBolt(e, now); // ⛈️ chat's storm powers
    for (const s of [0, 1]) if (P.sunk !== s) pirSternRail(s);
    for (const f of F) if (f.swing && f.alive) { const s = S(f), hx = f.x + f.face * 8 * s, hy = zY(f.z) - f.h - 128 * s; g.strokeStyle = '#c8a870'; g.lineWidth = 3; g.beginPath(); g.moveTo(f.swing.ax, ROPE_Y); g.quadraticCurveTo((f.swing.ax + hx) / 2, (ROPE_Y + hy) / 2 + 12, hx, hy); g.stroke(); }
    for (const b of P.balls) if (b.t <= .45) { const k = 1 - b.t / .45, p = .72 + b.c.z * .4, d = b.c.s ? -1 : 1, x0 = cannonX(b.c) + d * 50 * p, y0 = zY(b.c.z) - 30 * p, x = x0 + (b.x - x0) * k, y = y0 + (zY(b.z) - 20 - y0) * k - 230 * 4 * k * (1 - k); g.fillStyle = 'rgba(200,200,200,.35)'; for (let j = 1; j < 5; j++) { const kk = Math.max(0, k - j * .05), xx = x0 + (b.x - x0) * kk, yy = y0 + (zY(b.z) - 20 - y0) * kk - 230 * 4 * kk * (1 - kk); g.beginPath(); g.arc(xx, yy, 7 + j * 2, 0, 7); g.fill(); } g.fillStyle = '#141416'; g.beginPath(); g.arc(x, y, 11 * (.72 + b.z * .4), 0, 7); g.fill(); }
  }
  function pirKrakenCam(t) { // 🐙 the camera watches the ship that's going down (and the one jumping across)
    const k = pir.kr; if (!k) return; k.cam0 ||= { x: cam.x, y: cam.y, z: cam.z }; cine.orb = null; cine.rot = 0;
    const goal = { x: deckMid(k.doomed, .45) * .7 + GAPX * .3, y: 560, z: 1.12 }, u = easeIO(Math.min(1, t / 1.1));
    cam.x = k.cam0.x + (goal.x - k.cam0.x) * u; cam.y = k.cam0.y + (goal.y - k.cam0.y) * u; cam.z = k.cam0.z + (goal.z - k.cam0.z) * u; camClamp();
  }
  function pirPmDraw(f) { // 🐙 during the kraken scene: the last two getting to their spots (the one on the other ship jumps across)
    const p = f.pm, t = modeT, keep = { x: f.x, z: f.z, h: f.h, ph: f.ph, face: f.face };
    if (p.leap) { const u = clamp((t - 1.25) / .9, 0, 1), e = u * u * (3 - 2 * u); f.x = p.x + (keep.x - p.x) * e; f.z = p.z + (keep.z - p.z) * e; f.h = p.h * (1 - u) + Math.sin(u * Math.PI) * 300; if (u < 1) f.face = keep.x > p.x ? 1 : -1; if (u <= 0) f.x += Math.sin(t * 11) * 4; }
    else { const u = clamp((t - .3) / 1.4, 0, 1), e = u * u * (3 - 2 * u); f.x = p.x + (keep.x - p.x) * e; f.z = p.z + (keep.z - p.z) * e; f.h = p.h * (1 - e); if (u > 0 && u < 1) { f.ph = t * 12; f.face = keep.x > p.x ? 1 : -1; } }
    drawFighter(f); Object.assign(f, keep);
  }
  function pirDebris(s, n) { for (let i = 0; i < n; i++) { const z = vr(.1, .9), x = vr(Math.min(deckLo(s, z), deckHi(s, z)), Math.max(deckLo(s, z), deckHi(s, z))); pir.debris.push({ x, y: zY(z) - vr(0, 40), z, vx: vr(-320, 320), vy: -vr(300, 820), rot: vr(0, 6), vr: vr(-8, 8), w: vr(30, 90), h: vr(8, 16), col: ['#8a5a2a', '#a8763e', '#6a4420', '#3a2410'][i % 4], barrel: Math.random() < .15, t: 0 }); } }
  function pirTick(real) { // 🏴‍☠️ things that only look nice (splash rings, wreckage) + the kraken scene's moments
    const P = pirS();
    WX.flash = Math.max(0, WX.flash - real * 3); if ((WX.flashT -= real) <= 0) { WX.flashT = vr(5, 12); WX.flash = Math.max(WX.flash, vr(.4, .75)); WX.sky = { x: vr(160, W - 160), y0: vr(110, 250), t: 0 }; WX.rumble = vr(.3, 1.4); } // ⛈️ lightning far away now and then, thunder a moment later
    if (WX.sky && (WX.sky.t += real) > .45) WX.sky = null; if (WX.rumble != null && (WX.rumble -= real) <= 0) { WX.rumble = null; snd('rumble'); }
    for (const f of F) if (f.charT != null && T - f.charT < (f.alive ? 2.5 : 7) && Math.random() < real * 12) parts.push({ x: f.x + vr(-14, 14), y: zY(f.z) - f.h - vr(40, 100) * S(f), vx: vr(-20, 20), vy: vr(-90, -40), g: -20, life: vr(.6, 1.2), max: 1.2, size: vr(6, 12), color: 'rgba(60,60,64,.5)', gz: null, dust: true }); // ⚡ smoke off anyone the lightning hit
    pirMonkeys(real); // 🐒 for (const r of P.rings) r.t += real; P.rings = P.rings.filter(r => r.t < 1.8);
    for (const d of P.debris) { if (!d.float) { d.vy += 1300 * real; d.x += d.vx * real; d.y += d.vy * real; d.rot += d.vr * real; if (d.vy > 0 && d.y >= seaY(d.z)) { d.float = true; pirSplash(d.x, d.z, .45, true); } } else d.t += real; } P.debris = P.debris.filter(d => !d.float || d.t < 20);
    const k = P.kr; if (!k || mode !== 'final') return; const t = modeT, once = (key, at, fn) => { if (t >= at && !k.fired.has(key)) { k.fired.add(key); fn(); } };
    k.tents.forEach((tn, i) => once('t' + i, tn.at, () => { if (tn.bz < 1 && !tn.by) pirSplash(tn.bx, tn.bz, .9, i > 0); }));
    for (const f of finalPair || []) if (f.pm?.leap) { once('leap', 1.25, () => { word('JUMPS FOR IT!', f.pm.x, zY(f.pm.z) - 240 * S(f), '#ffe08a', 46); snd('whoosh'); }); once('land', 2.15, () => { dust(f.x, f.z, 10); snd('land'); }); }
    once('squeeze', 1.6, () => snd('creak')); once('crack', 2.2, () => { k.crackAt = performance.now(); snd('shipbreak'); quake(22); word('CRUNCH!', deckMid(k.doomed, .45), zY(.45) - 170, '#ffb02a', 76); pirDebris(k.doomed, 28); });
    once('down', 2.45, () => snd('splash')); if (t > 2.4 && t < 4.7 && (k.sp = (k.sp ?? 0) - real) <= 0) { k.sp = .15; const z = vr(.05, .95); pirSplash(vr(Math.min(deckLo(k.doomed, z), deckHi(k.doomed, z)), Math.max(deckLo(k.doomed, z), deckHi(k.doomed, z))), z, .7, true); if (Math.random() < .2) quake(4); }
    once('eye', 4.5, () => snd('kraken'));
  }

  function frame(now) {
    if (!running) return; crewC = null;
    if (!scene.show && mode !== 'fight' && mode !== 'intro' && mode !== 'final') { running = false; lastFrame = 0; return; } // nothing to finish behind another tab: rest
    requestAnimationFrame(frame);
    const cap = scene.show ? GFX.fps || 0 : 30; if (cap && lastFrame && now - lastFrame < 1000 / cap - 1.5) return;
    const real = Math.min(.1, (now - (lastFrame || now)) / 1000); lastFrame = now;
    if (!scene.show) { modeT += real; if (mode === 'intro' && modeT > 2.4) { mode = 'fight'; modeT = 0; } if (mode === 'final' && modeT > finIntro()) { mode = 'fight'; modeT = 0; finalLeft = 20; } acc += real * timeK(); let n = 0; while (acc >= DT && n < 8) { step(DT); acc -= DT; n++; } if (n === 8) acc = 0; parts = []; texts = []; return; } // (behind another tab: just finish the fight)
    const k = RY().scale?.() || 1; if (cv.width !== Math.round(W * k)) { cv.width = Math.round(W * k); cv.height = Math.round(H * k); }
    if (!bg || bgScale !== Math.min(2, k) || bgMap !== scene.map) { bgScale = Math.min(2, k); bgMap = scene.map; bg = RUMBLE() ? drawBgRumble(bgScale) : WIZ() ? drawBgWizard(bgScale) : COLO() ? drawBgColosseum(bgScale) : WAR() ? drawBgWar(bgScale) : PIR() ? drawBgSea(bgScale) : drawBg(bgScale); }
    modeT += real; toastT -= real; finTick(real); camStep(real); if (PIR()) pirTick(real);
    if (mode === 'intro' && modeT > 2.4) { mode = 'fight'; modeT = 0; bell(); if (RUMBLE()) snd('crowd'); if (PIR()) snd('cannon'); }
    if (mode === 'final' && modeT > finIntro()) { mode = 'fight'; modeT = 0; finalLeft = 20; snd('bell'); snd(RUMBLE() ? 'crowd' : 'hyah'); } // 🔔 FIGHT! (the battle clock was stopped while FINAL FIGHT showed)
    if (mode === 'replay') { replayOn = true; replay.t = (replay.t ?? replay.frames[0].T) + real * .45; while (replay.i < replay.frames.length - 1 && replay.frames[replay.i + 1].T <= replay.t) replay.i++; if (replay.t >= replay.frames[replay.frames.length - 1].T + .4) { mode = 'won'; modeT = 0; replayOn = false; replay = null; snd('fanfare'); } }
    else { acc += real * timeK(); let n = 0; while (acc >= DT && n < 8) { step(DT); acc -= DT; n++; } if (n === 8) acc = 0; }
    if (mode === 'fight' || (mode === 'over' && modeT < 1.6)) { rbuf.push({ T, f: F.map(f => ({ x: f.x, z: f.z, h: f.h, face: f.face, ph: f.ph, atk: f.atk && { ...f.atk }, alive: f.alive, koT: f.koT, limbs: { ...f.limbs }, head: f.head, hp: f.hp, hurtT: f.hurtT, block: f.block, weapon: f.weapon, yell: f.yell, down: f.down, lie: f.lie, heldBy: !!f.heldBy, out: f.out, falling: f.falling, sn: f.stains.length, look: f.target ? Math.sign(f.target.x - f.x) : f.face })) }); if (rbuf.length > 260) rbuf.shift(); } // ⏪ the last few seconds, for the replay
    // effects move in real (slowed) time
    const vt = real * timeK();
    for (const p of parts) { p.vy += p.g * vt; p.x += p.vx * vt; p.y += p.vy * vt; p.life -= vt; if (p.blood && p.gz != null && p.y >= zY(p.gz) && p.vy > 0) { if ((WIZ() && !solid(p.x, p.gz)) || (PIR() && !onDeck(p.x, p.gz))) { p.gz = null; continue; } stamp(p.x, zY(p.gz) - vr(0, 6), p.size * vr(.8, 1.5), Math.random() < .5 ? 'rgba(130,0,12,.75)' : 'rgba(170,10,24,.65)'); p.life = 0; } }
    parts = parts.filter(p => p.life > 0);
    for (const o of flyers) { if (o.rest) continue; o.vy += 1500 * vt; o.x += o.vx * vt; o.y += o.vy * vt; o.rot += o.vrot * vt; if (o.blood > 0) { o.blood -= vt; if (Math.random() < .6) parts.push({ x: o.x, y: o.y, vx: vr(-60, 60), vy: vr(-60, 40), g: 1500, life: 2, max: 2, size: vr(2, 4), color: '#b0101c', gz: o.gz, blood: true }); } const gy = zY(o.gz) - 6; if (o.y > gy && o.vy > 0) { o.y = gy; o.vy *= -.35; o.vx *= .6; o.vrot *= .5; if (Math.abs(o.vy) < 60) { o.rest = true; o.vy = 0; } } }
    for (const t of texts) { t.life -= real; t.y -= 40 * real; } texts = texts.filter(t => t.life > 0);
    if (!RUMBLE() && !WAR() && !PIR() && petals.length < 40 && Math.random() < .3) petals.push({ x: vr(-100, W), y: -20, vx: vr(30, 90), vy: vr(30, 70), r: vr(0, 6), c: Math.random() < .5 ? '#ffc0d8' : '#ffd9e6' });
    for (const p of petals) { p.x += (p.vx + Math.sin(now / 700 + p.r) * 30) * real; p.y += p.vy * real; p.r += real * 2; } petals = petals.filter(p => p.y < H + 20 && p.x < W + 40);

    g.setTransform(k, 0, 0, k, 0, 0); g.imageSmoothingEnabled = GFX.smooth !== false;
    if (cine.rot) { g.fillStyle = '#000'; g.fillRect(0, 0, W, H); }
    g.save(); camApply(); // 🎥 the world (the top bar, banners and the winner screen stay put)
    if (cine.rot || cine.quake > .2) { g.drawImage(bg, -W * .75, -H * .75, W * 2.5, H * 2.5); g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(-W * .75, -H * .75, W * 2.5, H * 2.5); } // (past the edges while the camera spins / shakes)
    if (cine.orb != null && cine.orbit && finalPair) { drawOrbit(now, k); g.restore(); if (PIR()) pirWeather(real); hud(now); finHud(now); return; } // 🎥 the FINAL FIGHT camera circling the last two
    drawStage(now, false);
    for (const w of weapons) { const s = .9 + w.z * .4; g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.ellipse(w.x, zY(w.z), 30 * s, 7 * s, 0, 0, 7); g.fill(); drawWeapon(w.kind, w.x - 20 * s, zY(w.z) - w.h - (w.kind === 'chair' ? 28 * s : 6), 1, s, w.h > 0 ? T * 8 : 0); }
    const shown = mode === 'replay' && replay ? replay.frames[replay.i].f.map((sn, i) => ({ ...F[i], ...sn, stains: F[i].stains.slice(0, sn.sn), target: { x: F[i].x * 0 + sn.x + sn.look * 50, alive: true } })) : F;
    const order2 = [...shown.filter(f => !f.falling && !f.wreck), ...lions.map(L => ({ lion: L, alive: true, z: L.z })), ...(PIR() ? pirMasts() : [])].sort((a, b) => (a.alive - b.alive) || a.z - b.z);
    for (const f of order2) { if (FIN.on && (f === FIN.W || f === FIN.L)) continue; f.lion ? drawLion(f.lion) : f.mast ? drawMast(f.mast, now) : PIR() && f.pm && mode === 'final' ? pirPmDraw(f) : drawFighter(f); } // (🏴‍☠️ the masts stand among the pirates)
    if (FIN.on) finDraw(now);
    if (WIZ()) drawSpells(now / 1000); if (WAR()) drawWar(now / 1000); if (PIR()) pirFront(now);
    if (RUMBLE()) drawRing(g, true); // (the front ropes are in front of everyone)
    for (const o of flyers) drawFlyer(o);
    for (const p of parts) { g.globalAlpha = p.dust ? Math.max(0, p.life / p.max) : 1; g.fillStyle = p.color; g.beginPath(); g.arc(p.x, p.y, p.size, 0, 7); g.fill(); } g.globalAlpha = 1;
    for (const t of texts) { const a = Math.min(1, t.life / t.max * 2), sc = 1 + (1 - t.life / t.max) * .25; g.save(); g.translate(t.x, t.y); g.rotate(t.rot); g.scale(sc, sc); g.globalAlpha = a; g.font = `${t.size}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = 7; g.strokeStyle = '#1a0a08'; g.strokeText(t.t, 0, 0); g.fillStyle = t.color; g.fillText(t.t, 0, 0); g.restore(); }
    if (cam.follow?.alive && mode !== 'replay') { const f = cam.follow, s = S(f), [x, y] = fpos(f); g.strokeStyle = '#7dd3fc'; g.lineWidth = 3; g.setLineDash([8, 6]); g.beginPath(); g.ellipse(x, zY(f.z) - f.h, 60 * s, 16 * s, 0, now / 400, now / 400 + 6.3); g.stroke(); g.setLineDash([]); }
    g.restore();
    if (PIR()) pirWeather(real); // ⛈️ rain + lightning flashes
    for (const p of petals) { g.save(); g.translate(p.x, p.y); g.rotate(p.r); g.fillStyle = p.c; g.beginPath(); g.ellipse(0, 0, 6, 3.5, 0, 0, 7); g.fill(); g.restore(); }
    hud(now); finHud(now);
    if (cam.follow && mode !== 'replay' && mode !== 'won') { const txt = `🎥 Following ${cam.follow.name || ''}`; g.font = '800 24px Inter, sans-serif'; const tw = g.measureText(txt).width; g.fillStyle = 'rgba(10,20,40,.75)'; g.fillRect(W / 2 - tw / 2 - 16, H - 64, tw + 32, 40); g.fillStyle = '#7dd3fc'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, W / 2, H - 44); }
    const vg = g.createRadialGradient(W / 2, H / 2, H * .45, W / 2, H / 2, H * .95); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(20,6,0,.5)'); g.fillStyle = vg; g.fillRect(0, 0, W, H); // old film look
    if (GFX.quality === 'high') { g.fillStyle = 'rgba(255,230,190,.05)'; for (let i = 0; i < 3; i++) g.fillRect(vr(0, W), 0, 1.5, H); }
    if (mkDbg && MK && PIR()) { MK.end = mkDbg.end; if (mkDbg.win != null) MK.win = mkDbg.win; MK.t = mkDbg.t; MK.e0 = MK.ko + 2.6; g.setTransform(k, 0, 0, k, 0, 0); g.fillStyle = '#26364a'; g.fillRect(0, 0, W, H); g.save(); g.translate(W / 2, H * .72); g.scale(2.6, 2.6); g.translate(-GAPX, -seaY(MK_Z)); pirMonkeysDraw(now / 1000); g.restore(); } // (🧪 CARDS.mkView)
  }
  function drawStage(now, orbit) { // the map behind the fighters (orbit = the circling FINAL FIGHT camera drew the picture itself; nobody falling)
    if (!orbit) g.drawImage(bg, 0, 0, W, H);
    if (RUMBLE()) ringLogo(); else if (WIZ()) { if (!orbit) for (const f of F) if (f.falling && f.h > -1300) drawFighter(f); drawPlatform(now / 1000); } else if (WAR()) drawTanks(now / 1000, false); else if (PIR()) pirStage(now, orbit); else if (!COLO() && !orbit) lanterns(now / 1000); // (falling packs go behind the platform: you see them through the holes)
    g.drawImage(crat, 0, 0); g.drawImage(floor, 0, 0);
    if (RUMBLE()) arenaLights(now / 1000);
  }
  function banner(text, y, size, col = '#ffd23a') { g.font = `${size}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = size * .16; g.strokeStyle = '#2a0808'; g.strokeText(text, W / 2, y); g.fillStyle = col; g.fillText(text, W / 2, y); }
  function hud(now) {
    const live = alive().length, on = Object.keys(scene.wacky).filter(k => scene.wacky[k] && !(k === 'weapons' && !MI().drops()) && !(k === 'lions' && !COLO())); // (only the ones this map uses)
    g.fillStyle = 'rgba(20,6,6,.72)'; g.fillRect(0, 0, W, 62);
    g.font = `34px ${FONT}`; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillStyle = '#ffd23a'; g.fillText(`${MI().title} · ${scene.battleName || 'Card battle'}`, 24, 32);
    g.textAlign = 'right'; g.fillStyle = '#fff'; g.fillText(PIR() ? (mode === 'lobby' ? `${CREW[0].dot} ${F.filter(f => f.team === 0).length} vs ${F.filter(f => f.team === 1).length} ${CREW[1].dot} ready` : `${CREW[0].dot} ${crewN(0)} vs ${crewN(1)} ${CREW[1].dot} standing`) : mode === 'lobby' ? `${F.length} ${scene.chars ? 'fighter' : 'pack'}${F.length === 1 ? '' : 's'} ready` : `${live} of ${F.length} standing`, W - 24, 32);
    if (PIR() && scene.stormTips?.length && (mode === 'lobby' || mode === 'intro' || mode === 'fight')) { g.font = '800 20px Inter, sans-serif'; g.textAlign = 'left'; const t = `⛈️ Channel points: ${scene.stormTips.join('  ·  ')}`, w = g.measureText(t).width + 28; g.fillStyle = 'rgba(14,22,40,.8)'; g.fillRect(16, 68, w, 32); g.fillStyle = '#bfe4ff'; g.fillText(t, 30, 85); } // ⛈️ (what chat can send)
    if (on.length) { g.font = '800 20px Inter, sans-serif'; g.textAlign = 'center'; const t = on.map(k => WN[k] || k).join('   '); const w = g.measureText(t).width + 30; g.fillStyle = 'rgba(160,20,40,.8)'; g.fillRect(W / 2 - w / 2, 66, w, 32); g.fillStyle = '#fff'; g.fillText(t, W / 2, 83); }
    if (mode === 'fight' || mode === 'final' || mode === 'intro') { // ⏱️ the fight clock (stops while FINAL FIGHT shows)
      const left = finalLeft > 0 ? finalLeft : Math.max(0, D - T), txt = `${Math.floor(left / 60)}:${String(Math.floor(left % 60)).padStart(2, '0')}`;
      g.fillStyle = finalLeft > 0 ? 'rgba(200,30,30,.9)' : 'rgba(20,6,6,.8)'; g.beginPath(); g.roundRect?.(W / 2 - 90, 108, 180, 58, 14); g.fill(); g.font = `44px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#fff'; g.fillText(mode === 'final' ? '⏸ ' + txt : txt, W / 2, 138); }
    if (mode === 'final' && finalPair && PIR() && modeT < KRAKEN_T) { const u = Math.min(1, modeT / .35), k = pir?.kr; // 🐙 the kraken scene comes first
      if (modeT > .25) { g.save(); g.translate(W / 2, 300); g.scale(.6 + .4 * u, .6 + .4 * u); g.translate(-W / 2, -300); banner('🐙 THE KRAKEN! 🐙', 300, 120, '#c879ff'); g.restore(); }
      if (k && modeT > .9) { g.font = `48px ${FONT}`; banner(`It's dragging the ${CREW[k.doomed].ship} under!`, 400, 48, '#fff'); } }
    else if (mode === 'final' && finalPair) { const t0 = PIR() ? KRAKEN_T : 0, u = Math.min(1, (modeT - t0) / .35); g.save(); g.translate(W / 2, 360); g.scale(.6 + .4 * u, .6 + .4 * u); g.translate(-W / 2, -360); banner('🥊 FINAL FIGHT! 🥊', 330, 120, '#ff3a2a'); g.restore();
      g.font = `48px ${FONT}`; g.textAlign = 'center'; g.lineWidth = 8; g.strokeStyle = '#2a0808'; const vs = (PIR() ? `${CREW[finalPair[0].team]?.dot || ''} ${finalPair[0].name}  VS  ${finalPair[1].name} ${CREW[finalPair[1].team]?.dot || ''}` : `${finalPair[0].name}  VS  ${finalPair[1].name}`).slice(0, 74); g.strokeText(vs, W / 2, 430); g.fillStyle = '#fff'; g.fillText(vs, W / 2, 430);
      const left = finIntro() - .8 - modeT; // (3, 2, 1… then 🔔 FIGHT!)
      if (left > 0 && left <= 3) { const k = 1 - (left % 1); g.save(); g.globalAlpha = Math.min(1, (1 - k) * 2 + .2); g.font = `${Math.round(150 + 60 * k)}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = 12; g.strokeStyle = '#2a0808'; g.strokeText(String(Math.ceil(left)), W / 2, 580); g.fillStyle = '#ffd23a'; g.fillText(String(Math.ceil(left)), W / 2, 580); g.restore(); }
      if (left <= 0) banner('🔔 FIGHT!', 520, 90, '#ffd23a'); }
    if (toastT > 0) { g.globalAlpha = Math.min(1, toastT); banner(toastText, 200, 64, '#ff8ab0'); g.globalAlpha = 1; }
    if (mode === 'lobby') { banner(PIR() ? '🏴‍☠️ PIRATE BATTLE' : scene.chars ? '⚔️ BATTLE ROYAL' : '🃏 CARD BATTLE', 330, 110); g.font = '800 30px Inter, sans-serif'; g.fillStyle = '#fff'; g.textAlign = 'center'; g.fillText(PIR() && F.length >= 2 ? `${CREW[0].dot} ${CREW[0].ship} vs ${CREW[1].ship} ${CREW[1].dot}` : F.length >= 2 ? 'Waiting for the fight…' : scene.chars ? 'Waiting for fighters…' : 'Add packs in the 📦 Card pool tab', W / 2, 410); }
    if (mode === 'intro') { const u = modeT; if (u < 1.4) banner(MI().intro, 360, 120 + u * 20, '#ffd23a'); else banner(RUMBLE() ? 'BELL!' : PIR() ? 'BOARD \'EM!' : 'FIGHT!', 360, 170 + (u - 1.4) * 60, '#ff3a2a'); }
    if (mode === 'replay') { g.fillStyle = '#000'; g.fillRect(0, 0, W, 70); g.fillRect(0, H - 70, W, 70); g.font = `44px ${FONT}`; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillStyle = Math.sin(now / 250) > 0 ? '#ff4a4a' : '#ffffff'; g.fillText('⏪ REPLAY', 40, H - 35); }
    if (mode === 'won' && winner) {
      const u = Math.min(1, modeT / .8); g.fillStyle = `rgba(0,0,0,${.55 * u})`; g.fillRect(0, 0, W, H);
      if (u > .1) { // the winning pack, big, arms up
        const sc = 3.4 * u, PW = 74 * sc, PH = 112 * sc, top = 300, X = W / 2, hip = top + PH, f = winner;
        g.save(); g.shadowColor = '#ffd23a'; g.shadowBlur = 60; g.fillStyle = 'rgba(255,210,60,.18)'; g.beginPath(); g.ellipse(X, top + PH / 2, PW * .9, PH * .7, 0, 0, 7); g.fill(); g.restore();
        const LC = limbCol(f); g.strokeStyle = LC.leg; g.lineCap = 'round'; g.lineJoin = 'round';
        for (const side of [-1, 1]) { if (!f.limbs[side < 0 ? 'll' : 'rl']) continue; const hx = X + side * PW * .22, fx = hx + side * 10 * sc, fy = Math.min(H - 40, hip + 44 * sc * .55); limb(hx, hip, fx, fy, -side * 4 * sc, 5.5 * sc); }
        drawPackBody({ ...f, hp: Math.max(f.hp, 40), hurtT: 0 }, X - PW / 2, top, PW, PH, sc, f.head ? 0 : PH * .38);
        for (const side of [-1, 1]) { if (!f.limbs[side < 0 ? 'la' : 'ra']) continue; const shx = X + side * PW * .48, sy = top + PH * .48, hx = shx + side * 30 * sc, hy = sy - 46 * sc + Math.sin(modeT * 8 + side) * 6 * sc; g.strokeStyle = LC.arm; limb(shx, sy, hx, hy, side * 6 * sc, 5 * sc); g.fillStyle = LC.hand; g.lineWidth = 2 * sc; g.beginPath(); g.arc(hx, hy, 6.5 * sc, 0, 7); g.fill(); g.strokeStyle = '#151515'; g.stroke(); }
        if (f.head) { const keep = { atk: f.atk, yell: f.yell, alive: f.alive, hp: f.hp, hurtT: f.hurtT }; Object.assign(f, { atk: null, yell: 1, alive: true, hp: 100, hurtT: 0 }); drawFace(f, X, top, PW, PH, sc, 0); Object.assign(f, keep); }
      }
      banner('🏆 WINNER 🏆', 210, 96); banner(winner.name || '', 860, Math.min(76, 1800 / Math.max(8, (winner.name || '').length) * 1.6), '#fff');
      if (PIR() && CREW[winner.team]) { const c = CREW[winner.team]; banner(`${c.dot} ${c.name} WINS! ${c.dot}`, 128, 50, c.lt); } // 🏴‍☠️ which crew
      g.font = '800 30px Inter, sans-serif'; g.fillStyle = '#ffd23a'; g.textAlign = 'center'; g.fillText(scene.test ? (scene.chars ? '🧪 Practice round' : '🧪 Pretend fight') : scene.chars ? (winner.game && winner.game !== winner.name ? `🎬 ${winner.game}` : '🏆 Last one standing!') : scene.keep ? '📌 Stays in the pool' : 'Time to open it! 📦', W / 2, 930);
      if (Math.random() < .5) petals.push({ x: vr(0, W), y: -10, vx: vr(-40, 40), vy: vr(80, 160), r: 0, c: ['#ffd23a', '#ff5a7a', '#5ad6ff', '#ffffff'][Math.floor(Math.random() * 4)] });
    }
  }
  window.CARDS = { msg, on: () => !layer.classList.contains('hidden'), cam: a => camCmd(a), camAuto: on => { cam.auto = !!on; }, camState: () => ({ ...cam, follow: cam.follow?.name || null }), state: () => ({ mode, alive: alive().length, n: F.length, winner: winner?.id || null, T }),
    sim: secs => { const out = []; let last = alive().length; if (mode === 'intro') mode = 'fight'; for (let i = 0; i < secs * 60 && !winner; i++) { if (mode === 'final') { mode = 'fight'; finalLeft = 20; } step(DT); const n = alive().length; if (n !== last) { out.push([+T.toFixed(1), n]); last = n; } } return { out, T, winner: winner?.id || null, destined, falls: F.filter(f => f.falling).length, lions: lions.length }; },
    finList: map => ({ fin: finLib('fin', map).map(f => `${f.tone === 'funny' ? '🤪' : '☠️'} ${f.name}`), cel: finLib('cel', map).map(c => c.name) }),
    finCheck: (map, fps = 15) => { // (tests) run every finisher + celebration of a map through every frame, drawing it: returns any errors
      const errs = []; const lib = window.ROYAL_FINISHERS?.[map]; if (!lib) return ['no finishers for ' + map];
      finTest({ map }); const keep = { ...FIN };
      for (const [kind, list] of [['fin', lib.fin], ['cel', lib.cel]]) list.forEach((it, i) => {
        FIN.errs = []; Object.assign(FIN, keep, { fin: kind === 'fin' ? it : lib.fin[0], cel: kind === 'cel' ? it : lib.cel[0], fired: new Set(), celFired: new Set(), errs: [] });
        for (const ph of kind === 'fin' ? ['act', 'name', 'replay'] : ['cel', 'done']) { FIN.phase = ph; const d = ph === 'replay' ? (it.dur || 5) / REPLAY_K : it.dur || 5; FIN.fired = new Set(); FIN.celFired = new Set(); for (let t = 0; t <= d + .01; t += 1 / fps) { FIN.t = t; try { g.save(); finDraw(performance.now()); g.restore(); } catch (e) { FIN.errs.push(e.message); g.restore(); } } }
        if (!it.name || !it.run) FIN.errs.push('missing name/run'); if (kind === 'fin' && !['funny', 'brutal'].includes(it.tone)) FIN.errs.push('tone?');
        for (const e of new Set(FIN.errs)) errs.push(`${kind} #${i + 1} ${it.name}: ${e}`); parts = []; flyers = []; texts = [];
      });
      FIN.on = false; mode = 'lobby'; return errs; },
    state: () => ({ mode, orb: cine.orb == null ? null : +cine.orb.toFixed(2), fin: FIN.on ? { phase: FIN.phase, t: +FIN.t.toFixed(2), name: FIN.fin?.name, cel: FIN.cel?.name, errs: (FIN.errs || []).slice(-3) } : null, modeT: +modeT.toFixed(2), alive: alive().length, rot: +cine.rot.toFixed(2), z: +cam.z.toFixed(2), quake: +cine.quake.toFixed(1), punch: !!cine.punch, manual: cam.manual }), // (tests)
    dbg: () => alive().map(f => ({ id: f.id, d: f.id === destined, x: Math.round(f.x), z: +f.z.toFixed(2), h: Math.round(f.h), hp: Math.round(f.hp), down: +f.down.toFixed(2), held: !!f.heldBy, whip: f.whip, reb: +f.rebound.toFixed(2), atk: f.atk?.kind, stun: +f.stun.toFixed(2), tgt: f.target?.id, seek: !!f.seek, w: f.weapon, cd: +f.cd.toFixed(2), team: f.team, ship: PIR() ? shipOf(f.x, f.z) : undefined, swing: !!f.swing })),
    mk: () => MK && { t: MK.t, start: MK.start, ko: MK.ko, e0: MK.e0, win: MK.win, end: MK.end, chat: MK.chat, early: MK.early }, mkView: (end, t, win) => { mkDbg = end == null ? null : { end, t, win }; }, // (tests: mkView draws only the monkeys' rowboat, big, at that moment) storm: () => pir?.storm && { q: pir.storm.q.length, fx: pir.storm.fx.map(e => e.kind + ':' + e.t.toFixed(2)) }, // (tests: 🐒 the monkeys' clock, ⛈️ storm powers waiting / going)
    pir: () => PIR() && pir ? { crews: [crewN(0), crewN(1)], all: [F.filter(f => f.team === 0).length, F.filter(f => f.team === 1).length], sunk: pir.sunk, safe: pir.safe, planks: pir.planks, balls: pir.balls.length, pair: finalPair ? finalPair.map(f => ({ id: f.id, team: f.team, ship: shipOf(f.x, f.z), onDeck: onDeck(f.x, f.z) })) : null, overboard: F.filter(f => f.falling).length, mode } : null }; // (for testing: plays the fight fast, without drawing)
})();

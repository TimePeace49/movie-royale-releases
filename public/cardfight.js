// 🃏 Card battles on the game screen (OBS + the app): card packs with stick arms and legs and angry faces have a
// martial arts brawl (Kung Fu Town) or a wrestling rumble (Rumble Ring: out only over the top rope). Health bars on top, blood, and wacky settings (low gravity, extreme gore, teleport switches…).
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
  function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  let R = Math.random; const rr = (a, b) => a + R() * (b - a);
  const snd = (n, o) => { if (scene.show && !replayOn) SFX.play(n, o); }; // (a fight still finishing behind another tab stays quiet)

  let scene = { show: false, phase: 'idle', fighters: [], wacky: {}, map: 'kungfu' };
  let F = [], parts = [], texts = [], flyers = [], weapons = [], petals = [];
  let T = 0, acc = 0, running = false, replayOn = false, rbuf = [], replay = null, weapDrops = 0, lastKO = 0, D = 60, PACE = 50, showdownSaid = false, finalLeft = 0, finalPair = null, mode = 'lobby', modeT = 0, fightId = null, destined = null, order = [], winner = null, sent = false, teleT = 5, weapT = 7, slowUntil = 0;
  const floor = document.createElement('canvas'), fg = floor.getContext('2d'); floor.width = W; floor.height = H;
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
  // 🗺️ the maps (Kung Fu Town = a street, Rumble Ring = a wrestling ring you can only leave over the top rope)
  const MAPINFO = { kungfu: { title: '🏯 KUNG FU TOWN', intro: 'KUNG FU TOWN', weapons: ['sword', 'staff', 'nunchaku'], drops: () => scene.wacky.weapons }, ring: { title: '🔔 RUMBLE RING', intro: 'RUMBLE RING', weapons: ['chair'], drops: () => true },
    wizard: { title: '🧙 WIZARD BATTLE', intro: 'WIZARD BATTLE', weapons: [], drops: () => false }, colosseum: { title: '🏛️ COLOSSEUM', intro: 'THE COLOSSEUM', weapons: [], drops: () => false, armed: true } };
  // 🗡️ weapons: how much harder they hit (d), how much further they reach (r), slower swings (cd), the hit word (w)
  const WSTAT = { sword: { d: 2.6, r: 30, w: 'SLASH!' }, staff: { d: 2.2, r: 40 }, nunchaku: { d: 2.4, r: 30 }, chair: { d: 2.4, r: 30, w: 'CLANG!' },
    gladius: { d: 1.6, r: 26, w: 'SLASH!', sharp: 1 }, spear: { d: 1.45, r: 62, w: 'STAB!', sharp: 1 }, trident: { d: 1.5, r: 56, w: 'STAB!', sharp: 1 }, axe: { d: 1.9, r: 30, cd: 1.25, w: 'CHOP!', sharp: 1 },
    mace: { d: 1.8, r: 28, cd: 1.15, w: 'BONK!' }, flail: { d: 1.75, r: 38, w: 'WHAM!' }, hammer: { d: 2, r: 32, cd: 1.3, w: 'SMASH!' }, scimitar: { d: 1.65, r: 32, w: 'SLASH!', sharp: 1 } };
  const GLAD = ['gladius', 'spear', 'trident', 'axe', 'mace', 'flail', 'hammer', 'scimitar'];
  const wReach = f => f.weapon ? (WSTAT[f.weapon]?.r ?? 30) : 0;
  const MI = () => MAPINFO[scene.map] || MAPINFO.kungfu, RUMBLE = () => scene.map === 'ring';
  const crazy = () => Object.entries(scene.wacky || {}).some(([k, v]) => v && k !== 'lions'); // a map condition is on: big cartoon physics are allowed
  const ringL = z => 430 - z * 140, ringR = z => 1490 + z * 140, OUT_Y = 58; // the ring's sides (wider toward the front); the arena floor is OUT_Y below the mat
  const gnd = f => RUMBLE() && f.out && (f.x < ringL(f.z) - 8 || f.x > ringR(f.z) + 8) ? -OUT_Y : 0;
  const edgeD = f => Math.min(f.x - ringL(f.z), ringR(f.z) - f.x), sideOf = f => f.x - ringL(f.z) < ringR(f.z) - f.x ? -1 : 1;
  const WIZ = () => scene.map === 'wizard', COLO = () => scene.map === 'colosseum';
  const bounds = z => RUMBLE() ? [ringL(z) + 34, ringR(z) - 34] : WIZ() ? [platL(z) - 300, platR(z) + 300] : COLO() ? [120, W - 120] : [90, W - 90];
  // 🧙 Wizard Battle: a floating platform of stone tiles; spells crack them and they fall away (fall through = out)
  const PC = 12, PR = 5, platL = z => 400 - z * 130, platR = z => 1520 + z * 130;
  let tiles = [], bolts = [], zaps = [], lions = [], meteorT = 8, crumbleT = 1, lionT = 0;
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
    tiles = newTiles(); bolts = []; zaps = []; lions = []; meteorT = 8; crumbleT = 1; lionT = 1.5;
    const n = list.length, size = baseSize(n);
    const cols = Math.ceil(Math.sqrt(n * 2.4)), rows = Math.ceil(n / cols);
    return list.map((p, i) => {
      const c = i % cols, r = Math.floor(i / cols);
      const z = rows === 1 ? .55 : .12 + r / Math.max(1, rows - 1) * .8 + rr(-.03, .03), [lo, hi] = RUMBLE() ? [ringL(clamp(z, 0, 1)) + 70, ringR(clamp(z, 0, 1)) - 70] : WIZ() ? [platL(clamp(z, 0, 1)) + 90, platR(clamp(z, 0, 1)) - 90] : COLO() ? [230, 1690] : [150, 1770];
      const x = lo + (c + .5) * ((hi - lo) / cols) + rr(-20, 20);
      return { ...p, x, z: clamp(z, 0, 1), h: 0, vx: 0, vz: 0, vh: 0, face: x < W / 2 ? 1 : -1, hp: 100, alive: true, size: size * rr(.94, 1.06),
        cd: rr(.3, 1.4), stun: 0, atk: null, block: 0, target: null, retarget: 0, ph: rr(0, 6), limbs: { la: 1, ra: 1, ll: 1, rl: 1 }, head: true,
        stains: [], hurtT: 0, koT: 0, weapon: null, yell: 0, down: 0, heldBy: null, lie: 0, whip: 0, whipBy: null, rebound: 0, out: false, falling: false, color: p.color || `hsl(${Math.floor(R() * 360)},65%,48%)`, weapon: COLO() ? GLAD[Math.floor(R() * GLAD.length)] : null };
    });
  }

  // ---------- 🎬 scene messages from the server ----------
  function msg(m) {
    if (m.type === 'cardWacky') { scene.wacky = m.wacky || {}; if (m.key && scene.show && (m.on || m.key === 'lions')) { toast(m.key === 'lions' && !m.on ? '🦁 Lions back to the tunnels!' : `${(WN[m.key] || m.key)}!`); snd(m.key === 'lions' ? 'roar' : 'gong'); } return; }
    if (m.type !== 'cardScene') return;
    const was = scene; scene = { ...m, wacky: m.wacky || {} };
    layer.classList.toggle('hidden', !m.show);
    if (m.show) SFX.setMap?.('card-' + (m.map || 'kungfu'));
    if (!running) { running = true; requestAnimationFrame(frame); } // (keeps going behind another tab until a fight is finished, without drawing or sound)
    if (!m.show && was.show) SFX.stopMusic?.();
    if (!m.show && m.phase !== 'fight') return;
    if (m.phase === 'fight' && m.fightId && m.fightId !== fightId) { // a new fight
      fightId = m.fightId; destined = m.destined; R = mulberry(m.seed || 1); order = []; winner = null; sent = false;
      cam.follow = null; cam.manual = false; cam.overview = false;
      F = makeFighters(m.fighters); parts = []; texts = []; flyers = []; weapons = []; fg.clearRect(0, 0, W, H);
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
      if (mode !== 'lobby' || F.length !== m.fighters.length || F.some((f, i) => f.id !== m.fighters[i]?.id)) { R = Math.random; F = makeFighters(m.fighters); fg.clearRect(0, 0, W, H); parts = []; flyers = []; weapons = []; }
      mode = 'lobby'; fightId = null; winner = null; replay = null; if (m.show) SFX.music?.('lobby');
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
    const others = F.filter(o => o.alive && o !== f); if (!others.length) return null;
    // (going after weapons is decided in step: only when not already fighting someone)
    if (R() < (WIZ() ? .6 : .25)) return others[Math.floor(R() * others.length)]; // (wizards can hit anyone, from anywhere)
    let best = null, bd = 1e9; for (const o of others) { const d = Math.abs(o.x - f.x) + Math.abs(o.z - f.z) * 900; if (d < bd) { bd = d; best = o; } } return best;
  }
  function step(dt) {
    if (mode === 'final') { for (const f of F) { f.ph += dt * 3; if (!f.alive) physics(f, dt); } return; } // (the clock stops while FINAL FIGHT shows; the last one out still lands)
    T += dt;
    const live = alive();
    if (mode !== 'fight') { for (const f of F) { f.ph += dt * 3; physics(f, dt); } return; }
    if (scene.wacky.teleport && (teleT -= dt) <= 0 && live.length > 2) { // 🔀 two packs swap places
      teleT = rr(3.5, 6); const a = live[Math.floor(R() * live.length)]; let b = live[Math.floor(R() * live.length)]; if (b === a) b = live[(live.indexOf(a) + 1) % live.length];
      for (const f of [a, b]) puff(f, '#c88cff'); [a.x, b.x] = [b.x, a.x]; [a.z, b.z] = [b.z, a.z]; for (const f of [a, b]) puff(f, '#c88cff');
      word('SWITCH!', (a.x + b.x) / 2, zY((a.z + b.z) / 2) - 200, '#d6a8ff', 54); snd('swap');
    }
    if (MI().drops() && weapDrops < 2 && (weapT -= dt) <= 0) { weapT = rr(5, 8); weapDrops++; const ks = MI().weapons, kind = ks[Math.floor(R() * ks.length)], z = rr(.1, .9), [lo, hi] = bounds(z);
      weapons.push({ kind, x: RUMBLE() ? rr(lo + 40, hi - 40) : rr(200, 1720), z, h: RUMBLE() ? 260 : 700, vh: 0 }); if (RUMBLE()) { word('A CHAIR!', weapons[weapons.length - 1].x, zY(z) - 320, '#d6e2ee', 40); snd('crowd', { v: .6 }); } }
    if (WIZ()) wizStep(dt, live); if (COLO()) lionStep(dt);
    for (const w of weapons) if (w.h > 0) { w.vh -= grav() * dt; w.h = Math.max(0, w.h + w.vh * dt); if (w.h === 0) { w.vh = 0; dust(w.x, w.z, 6); snd('land', { p: 1.4 }); } }
    for (const f of F) {
      f.ph += dt * (f.atk ? 6 : Math.abs(f.vx) > 20 || Math.abs(f.vz) > .02 ? 9 : 3);
      f.hurtT = Math.max(0, f.hurtT - dt); f.yell = Math.max(0, f.yell - dt);
      if (!f.alive) { physics(f, dt); continue; }
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
      if (WIZ() && !f.atk && wizAI(f, t, dx, dz, reach, dt)) { physics(f, dt); continue; } // 🧙 keeps its distance and casts spells
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
    for (let i = 0; i < F.length; i++) { const a = F[i]; if (!a.alive) continue; for (let j = i + 1; j < F.length; j++) { const b = F[j]; if (!b.alive || b.down > 0 || b.heldBy || b.whip || b.rebound > 0 || a.down > 0 || a.heldBy || a.whip || a.rebound > 0) continue; // they don't stand inside each other
      const dz = b.z - a.z, dx = b.x - a.x, m = 40 * (S(a) + S(b)) / 2; if (Math.abs(dz) < .035 && Math.abs(dx) < m) { const k = (m - Math.abs(dx)) / 2 * (dx >= 0 ? 1 : -1); a.x -= k; b.x += k; } } }
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
      for (const o of F) { if (o === f || !o.alive) continue; const dx = (o.x - f.x) * f.face; if (dx > -12 * s && dx < reach && Math.abs(o.z - f.z) < .065 && Math.abs(o.h - f.h) < 90) { a.done = true; hit(f, o, a.kind); break; } }
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
    let dmg = { punch: rr(7, 11), kick: rr(10, 15), jump: rr(14, 21), head: rr(6, 9), clothes: rr(13, 18), elbow: rr(12, 18), bolt: rr(8, 12) }[kind];
    if (f.weapon && kind !== 'clothes' && kind !== 'elbow' && kind !== 'bolt') dmg *= WSTAT[f.weapon]?.d || 2.4; // 🗡️ weapons (and steel chairs) hit much harder
    if (scene.wacky.rage) dmg *= 1 + (1 - f.hp / 100) * 1.2;
    dmg *= (T > D * 1.35 ? 4 : T > D ? 2 : 1) * paceBoost();
    const blocked = o.block > 0 && o.face === -f.face;
    if (blocked) { dmg *= .2; word('BLOCK!', o.x, zY(o.z) - 160 * S(o), '#9fd6ff', 30); snd('clash'); o.vx += f.face * 120; return damage(f, o, dmg, kind, true); }
    if (scene.wacky.onehit) dmg = 999;
    if (o.atk?.o) o.atk.o.heldBy = null; // (a hit breaks the hold)
    o.vx += (kind === 'bolt' ? Math.sign(o.x - f.x) || f.face : f.face) * (160 + dmg * 14) * (scene.wacky.lowgrav ? 1.6 : 1) * (RUMBLE() && !crazy() ? .45 : 1); // (the ring keeps it real unless a wacky setting is on) if (scene.wacky.lowgrav || kind === 'jump') o.vh = Math.max(o.vh, scene.wacky.lowgrav ? 260 + dmg * 12 : 160);
    o.stun = .22 + Math.min(.5, dmg / 60); o.atk = null; o.hurtT = .3;
    const sx = o.x - f.face * 18 * S(o), sy = zY(o.z) - o.h - (60 + R() * 70) * S(o);
    o.lastBy = f;
    const WR = { jump: 'DROPKICK!', clothes: 'CLOTHESLINE!', elbow: 'ELBOW DROP!' }, big = kind === 'jump' || kind === 'clothes' || kind === 'elbow';
    word(kind === 'bolt' ? pick(['ZAP!', 'FWOOSH!', 'ZING!']) : f.weapon && !WR[kind] ? (WSTAT[f.weapon]?.w || 'THWACK!') : RUMBLE() && WR[kind] ? WR[kind] : pickW(kind), sx, sy - 40, big ? '#ffd23a' : '#fff', big ? 46 : 36);
    sparks(sx, sy); snd(kind === 'bolt' ? 'zap' : f.weapon && WSTAT[f.weapon]?.sharp && !WR[kind] ? 'chop' : f.weapon === 'chair' && !WR[kind] ? 'chair' : kind === 'clothes' || kind === 'elbow' ? 'slam' : kind === 'kick' || kind === 'jump' ? 'kick' : 'punch');
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
    if (o.hp <= 0 && !keep && kind !== 'bleed' && R() < paceHold(alive().length)) { o.hp = rr(4, 10); if (R() < .5) word(pick(['STILL STANDING!', 'NOT YET!', 'HANGING ON!']), o.x, zY(o.z) - 210 * s, '#9fffb0', 34); } // ⏳ too many out too fast: hangs on
    if (o.hp <= 0) ko(o, f, gore && !keep && R() < .55);
    else if (gore && !keep && o.hp < 25 && !soft && R() < .07) ko(o, f, true);
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
    if (o.atk?.o) o.atk.o.heldBy = null; if (o.heldBy) { o.heldBy.atk = null; o.heldBy = null; }
    o.alive = false; o.hp = 0; o.koT = 0; o.atk = null; o.down = 0; o.whip = 0; o.rebound = 0; o.lie = 0; order.push(o.id);
    if (over) { o.out = true; const k = crazy() ? 2 : 1; o.vx = over * rr(260, 340) * k * (scene.wacky.lowgrav ? 1.4 : 1); o.vh = rr(440, 520) * (crazy() ? 1.25 : 1); o.h = Math.max(o.h, 30); } // ⬆️ up and over the top rope, down to the floor
    else if (fall) { o.falling = true; o.vh = Math.min(o.vh, 0); o.vx *= .3; o.vz = 0; } // 🕳️ down through the platform
    else o.vx += (f ? f.face : vr(-1, 1)) * 260;
    lastKO = T; if (o.weapon && !MI().armed) { weapons.push({ kind: o.weapon, x: o.x, z: o.z, h: 60, vh: 200 }); o.weapon = null; } // the weapon drops for someone else
    if (alive().length === 2 && !showdownSaid) { showdownSaid = true;
      if (scene.finalFight) { // 🥊 FINAL FIGHT (maps that have one): the clock stops, the last two face off across the street with a weapon each, a bell, then a timed fight
        const [a, b] = alive(); finalPair = [a, b]; mode = 'final'; modeT = 0;
        const kinds = MI().weapons, k1 = Math.floor(R() * Math.max(1, kinds.length));
        if (WIZ()) { tiles.forEach(t => { t.hp = 2; t.fallT = 0; }); bolts = []; zaps = []; word('THE PLATFORM REBUILDS!', W / 2, 600, '#d6a8ff', 50); } // 🧙 a whole platform for the duel
        for (const [f, x, face, k] of [[a, W * .3, 1, kinds[k1]], [b, W * .7, -1, kinds[(k1 + 1 + Math.floor(R() * 2)) % kinds.length]]]) { puff(f, '#ffd23a'); Object.assign(f, { x, z: .55, h: 0, vx: 0, vz: 0, vh: 0, face, atk: null, stun: 0, block: 0, weapon: MI().armed ? f.weapon : k || null, target: f === a ? b : a, down: 0, heldBy: null, lie: 0, whip: 0, rebound: 0 }); puff(f, '#ffd23a'); }
        weapons = []; bell();
      } else { toast('🥊 FINAL SHOWDOWN!'); bell(); } }
    const s = S(o);
    if (decap) { // 🩸 the face comes off (the top of the pack)
      o.head = false;
      flyers.push({ kind: 'head', f: o, x: o.x, y: zY(o.z) - o.h - 150 * s, gz: o.z, vx: (f ? f.face : 1) * vr(220, 480), vy: -vr(500, 800), rot: 0, vrot: vr(-10, 10), s, rest: false, blood: 2 });
      blood(o.x, zY(o.z) - o.h - 120 * s, o.z, 60, f ? f.face : 0, 2.2); word('HEADLESS!', o.x, zY(o.z) - 240 * s, '#ff3030', 58); snd('chop'); snd('splat');
    } else if (fall) { word(pick(['FELL!', 'INTO THE VOID!', 'GONE!']), o.x, zY(o.z) - 200 * s, '#d6a8ff', 54); snd('whoosh'); }
    else if (over) { word(pick(['ELIMINATED!', 'OVER THE TOP!', 'GONE!']), o.x, zY(o.z) - 220 * s, '#ff5a5a', 56); snd('crowd'); snd('whoosh'); }
    else { word(pick(['K.O.!', 'DOWN!', 'FINISHED!']), o.x, zY(o.z) - 200 * s, '#ff5a5a', 52); snd('splat'); }
    if (!over && !fall) snd('fall'); if (fall) snd('fall');
    if (scene.wacky.boom) { // 💣 it explodes
      for (let i = 0; i < 40; i++) parts.push({ x: o.x, y: zY(o.z) - 60 * s, vx: vr(-600, 600), vy: vr(-700, -100), g: 900, life: vr(.4, 1), max: 1, size: vr(5, 12), color: ['#ffcf4a', '#ff7a2a', '#fff2a0', '#5a3a2a'][Math.floor(Math.random() * 4)], gz: null });
      snd('boom'); word('BOOM!', o.x, zY(o.z) - 140 * s, '#ffb02a', 64);
      for (const n of F) if (n.alive && n !== o && Math.abs(n.x - o.x) < 170 * s && Math.abs(n.z - o.z) < .15) { n.vx += Math.sign(n.x - o.x || 1) * 520; n.vh = 300; damage(null, n, 16, 'boom'); }
    }
    if (alive().length === 1) slowUntil = T + 1.4;
  }
  function physics(f, dt) {
    const slip = scene.wacky.slippery;
    if (f.falling) { if (f.h > -1400) { f.vh -= grav() * dt; f.h += f.vh * dt; f.x += f.vx * dt; } f.koT += dt; return; } // 🕳️ falling away below the platform
    const px = f.x, pz = f.z;
    f.x += f.vx * dt; f.z = clamp(f.z + f.vz * dt, 0, 1);
    const fr = f.h > 0 ? .995 : slip ? .985 : .86; f.vx *= Math.pow(fr, dt * 60); f.vz *= Math.pow(slip ? .97 : .8, dt * 60);
    const gl = gnd(f);
    if (f.h > gl || f.vh > 0) { f.h += f.vh * dt; f.vh -= grav() * dt; if (f.h <= gl) { const hard = f.vh < -450; f.h = gl; f.vh = 0; if (f.atk?.kind === 'jump' || f.atk?.kind === 'elbow') f.atk = null; dust(f.x, f.z, 5); if (hard && f.out) { snd('slam'); dust(f.x, f.z, 10); } } }
    if (f.out && f.h === 0 && !gl) f.vx = Math.sign(f.vx || 1) * Math.max(Math.abs(f.vx), 220); // (still on the edge of the mat: keeps going over)
    if (slip && f.alive && f.h === 0 && Math.abs(f.vx) > 160 && R() < .004) { f.stun = .9; word('SLIP!', f.x, zY(f.z) - 150 * S(f), '#bfefff', 30); snd('bonk'); }
    if (f.out) f.x = clamp(f.x, 30, W - 30);
    else { const [lo, hi] = bounds(f.z), bk = RUMBLE() ? .6 : .4; if (RUMBLE()) f.z = clamp(f.z, .04, .96); // (the ring ropes bounce you back in)
      if (f.x < lo) { f.x = lo; f.vx = Math.abs(f.vx) * bk; } if (f.x > hi) { f.x = hi; f.vx = -Math.abs(f.vx) * bk; } }
    if (WIZ() && f.h <= 0 && !solid(f.x, f.z)) { // 🧙 a hole or the edge: walking stops there; knocked into it (or the floor goes) = falls
      if (f.alive && !(f.stun > 0) && solid(px, pz)) { f.x = px; f.z = pz; f.vx = 0; f.vz = 0; }
      else if (f.alive) fallCheck(f); else { f.falling = true; f.vh = 0; }
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
      if (i !== 3) { b.fillStyle = '#1a0a08'; b.fillRect(x + w / 2 - 34, top + 8, 68, 50); b.fillStyle = '#f2c84a'; b.font = `700 40px serif`; b.textAlign = 'center'; b.textBaseline = 'middle'; b.fillText(sign, x + w / 2, top + 34); } // (the middle shop is behind the gate)
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
  // ---------- 🔔 Rumble Ring (arena + ring drawn once; logo, lights and front ropes every frame) ----------
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
    b.fillStyle = 'rgba(255,210,60,.85)'; b.font = `40px ${FONT}`; b.textAlign = 'center'; b.textBaseline = 'middle'; b.fillText('🔔  RUMBLE RING  🔔', 960, GY1 + 32);
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
    const ey = top + PH * .3, ex = PW * .18, ko = !f.alive, hurt = f.hurtT > 0;
    // headband
    if (WIZ()) { // 🧙 a pointy wizard hat
      const hb = top + PH * .06, col = f.color || '#5a2a9a'; g.fillStyle = col; g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = 2 * s;
      g.beginPath(); g.ellipse(cx, hb, PW * .62, 7 * s, 0, 0, 7); g.fill(); g.stroke();
      g.beginPath(); g.moveTo(cx - PW * .38, hb); g.quadraticCurveTo(cx - PW * .1, hb - 40 * s, cx - f.face * 22 * s, hb - 70 * s + Math.sin(T * 3 + f.ph) * 3 * s); g.quadraticCurveTo(cx + PW * .12, hb - 36 * s, cx + PW * .38, hb); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = '#ffe27a'; g.font = `${Math.round(14 * s)}px serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('★', cx, hb - 22 * s);
    } else if (COLO()) { // 🏛️ a gladiator helmet with a red crest
      const hb = top + PH * .16; g.fillStyle = '#9aa2aa'; g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = 2 * s; g.beginPath(); g.arc(cx, hb, PW * .46, Math.PI, 0); g.closePath(); g.fill(); g.stroke(); g.fillStyle = '#c8ced4'; g.fillRect(cx - PW * .5, hb - 3 * s, PW, 6 * s);
      g.fillStyle = '#c81e2a'; g.beginPath(); for (let i = 0; i <= 8; i++) { const a = Math.PI + i / 8 * Math.PI, r = PW * .46 + 16 * s + (i % 2) * 4 * s; g.lineTo(cx + Math.cos(a) * r * .9, hb + Math.sin(a) * r); } for (let i = 8; i >= 0; i--) { const a = Math.PI + i / 8 * Math.PI; g.lineTo(cx + Math.cos(a) * PW * .42, hb + Math.sin(a) * PW * .44); } g.fill();
    } else if (!RUMBLE()) { g.fillStyle = '#d82020'; g.fillRect(cx - PW / 2, top + PH * .12, PW, PH * .07); }
    const tx = RUMBLE() || WIZ() || COLO() ? -9999 : cx - f.face * PW / 2, tw = Math.sin(T * 9 + f.ph) * 6 * s; g.strokeStyle = '#d82020'; g.lineWidth = 4 * s; g.beginPath(); g.moveTo(tx, top + PH * .15); g.quadraticCurveTo(tx - f.face * 18 * s, top + PH * .15 + tw, tx - f.face * 34 * s, top + PH * .2 - tw); g.stroke();
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
    g.fillStyle = 'rgba(0,0,0,.32)'; g.beginPath(); g.ellipse(X, Y - gl, PW * .62 * (1 - Math.min(.5, (f.h - gl) / 400)), 11 * s, 0, 0, 7); g.fill(); // shadow
    g.save();
    const lieK = !f.alive ? Math.min(1, f.koT * 3) : f.heldBy ? f.lie : f.down > 0 ? 1 : 0; // knocked out, lying down, or lifted up flat
    if (lieK) { const py = Y - f.h; g.translate(X, py); g.rotate(-f.face * lieK * Math.PI / 2 * .95); g.translate(-X, -py); }
    if (!f.alive && f.koT > 5 && !f.out) g.globalAlpha = Math.max(.35, 1 - (f.koT - 5) * .2);
    const fy = Y - f.h, hip = fy - LL, top = hip - PH, a = f.atk, walk = Math.sin(f.ph), lean = a ? f.face * .1 : 0;
    g.translate(X, hip); g.rotate(lean); g.translate(-X, -hip);
    g.strokeStyle = '#151515'; g.lineCap = 'round'; g.lineJoin = 'round';
    // legs
    for (const [k, side] of [['ll', -1], ['rl', 1]]) {
      const hx = X + side * PW * .22, front = side === f.face;
      if (!f.limbs[k]) { g.fillStyle = '#a0101a'; g.beginPath(); g.arc(hx, hip + 2 * s, 5 * s, 0, 7); g.fill(); continue; }
      let fx = hx + walk * 12 * s * side, fyy = fy - Math.max(0, Math.cos(f.ph) * side) * 6 * s;
      if (f.alive && a?.kind === 'kick' && front) { const u = Math.sin(Math.min(1, a.t / a.dur) * Math.PI); fx = hx + f.face * LL * 1.25 * u; fyy = hip + 4 * s - u * LL * .1 + (1 - u) * LL; }
      if (f.alive && a?.kind === 'jump') { fx = front ? hx + f.face * LL * 1.2 : hx - f.face * LL * .3; fyy = front ? hip + 6 * s : hip + LL * .6; }
      limb(hx, hip, fx, fyy, -f.face * 7 * s, 5.5 * s);
      g.fillStyle = '#151515'; g.beginPath(); g.ellipse(fx + f.face * 4 * s, fyy, 10 * s, 5 * s, 0, 0, 7); g.fill(); // kung fu slipper
    }
    drawPackBody(f, X - PW / 2, top, PW, PH, s, f.head ? 0 : PH * .38);
    if (f.head) drawFace(f, X, top, PW, PH, s, f.target ? Math.sign(f.target.x - f.x) : f.face);
    // arms
    const sy = top + PH * .48;
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
      if (front && f.weapon) drawWeapon(f.weapon, hx, hy, f.face, s, a?.kind === 'punch' ? 0 : -.9);
      if (front && WIZ() && f.head !== undefined) { const ang = a?.kind === 'cast' ? -.15 : -1; g.save(); g.translate(hx, hy); g.rotate(ang * f.face); g.strokeStyle = '#4a2a14'; g.lineWidth = 4 * s; g.beginPath(); g.moveTo(0, 0); g.lineTo(f.face * 34 * s, 0); g.stroke(); g.fillStyle = a?.kind === 'cast' ? '#fff' : '#c8a0ff'; g.beginPath(); g.arc(f.face * 36 * s, 0, (a?.kind === 'cast' ? 6 : 3.5) * s, 0, 7); g.fill(); g.restore(); g.strokeStyle = '#151515'; } // 🪄 the wand
      g.fillStyle = '#f2e0c4'; g.strokeStyle = '#151515'; g.lineWidth = 2 * s; g.beginPath(); g.arc(hx, hy, 6.5 * s, 0, 7); g.fill(); g.stroke(); g.strokeStyle = '#151515';
    }
    g.restore();
    if (f.alive && mode !== 'won') { // health bar on top
      const bw = Math.max(46, 92 * s), bx = X - bw / 2, by = top - f.h * 0 - 20 * s - 10, hp = clamp(f.hp / 100, 0, 1);
      g.fillStyle = 'rgba(0,0,0,.7)'; g.fillRect(bx - 2, by - 2, bw + 4, 11); g.fillStyle = hp > .5 ? '#46e05a' : hp > .25 ? '#ffd23a' : '#ff3a3a'; g.fillRect(bx, by, bw * hp, 7);
      g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(bx, by, bw * hp, 2);
      if (F.length <= 24 || s > .8) { g.font = `800 ${Math.round(clamp(13 * s, 10, 18))}px Inter, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'bottom'; g.lineWidth = 3; g.strokeStyle = 'rgba(0,0,0,.8)'; const nm = (f.name || '').length > 22 ? f.name.slice(0, 21) + '…' : f.name; g.strokeText(nm, X, by - 3); g.fillStyle = '#fff'; g.fillText(nm, X, by - 3); }
    }
  }
  function drawFlyer(o) {
    const s = o.s; g.save(); g.translate(o.x, o.y); g.rotate(o.rot);
    if (o.kind === 'head') { // the top of the pack (with its face) spinning away
      const f = o.f, PW = 74 * s, PH = 112 * s, img = imgFor(f.image);
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
  const camClamp = () => { cam.z = clamp(cam.z, 1, 3.2); const hw = W / 2 / cam.z, hh = H / 2 / cam.z; cam.x = clamp(cam.x, hw, W - hw); cam.y = clamp(cam.y, hh, H - hh); };
  const fpos = f => [f.x, zY(f.z) - f.h - 70 * S(f)];
  function camGoal() {
    if (mode === 'replay' || mode === 'over') return { x: W / 2, y: H / 2, z: 1 }; // (the replay shows everyone)
    if (cam.follow) { const f = cam.follow; if (!F.includes(f)) cam.follow = null; else { const [x, y] = fpos(f); return { x, y, z: 2.1 }; } }
    if (cam.overview || mode === 'lobby' || mode === 'intro' || mode === 'won' || !cam.auto || !F.length) return { x: W / 2, y: H / 2, z: 1 };
    const live = mode === 'final' && finalPair ? finalPair : alive(); if (!live.length) return { x: W / 2, y: H / 2, z: 1 };
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; for (const f of live) { const [x, y] = fpos(f); x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y - 90); y1 = Math.max(y1, y + 110); }
    const z = clamp(Math.min(W / (x1 - x0 + 520), H / (y1 - y0 + 420)), 1, live.length <= 2 ? 1.75 : 1.45);
    return { x: (x0 + x1) / 2, y: (y0 + y1) / 2, z };
  }
  function camStep(dt) {
    if (cam.follow && !cam.follow.alive) { cam.lost += dt; if (cam.lost > 1.4) { cam.follow = null; cam.lost = 0; } } else cam.lost = 0;
    if (!cam.manual) { const g2 = camGoal(), k = Math.min(1, dt * (cam.follow ? 4 : 1.6)); cam.z += (g2.z - cam.z) * k; cam.x += (g2.x - cam.x) * k; cam.y += (g2.y - cam.y) * k; }
    camClamp();
  }
  const camApply = () => { g.translate(W / 2, H / 2); g.scale(cam.z, cam.z); g.translate(-cam.x, -cam.y); };
  const toWorld = (px, py) => [cam.x + (px - W / 2) / cam.z, cam.y + (py - H / 2) / cam.z];
  function camZoomAt(px, py, f) { const [wx, wy] = toWorld(px, py); cam.follow = null; cam.overview = false; cam.manual = true; cam.z = clamp(cam.z * f, 1, 3.2); cam.x = wx - (px - W / 2) / cam.z; cam.y = wy - (py - H / 2) / cam.z; camClamp(); }
  const followable = () => F.filter(f => f.alive).sort((a, b) => a.x - b.x);
  function camCmd(a) {
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
    if (!cdrag.moved && Math.hypot(dx, dy) < 4) return; cdrag.moved = true; cam.manual = true; cam.follow = null; cam.overview = false; cam.x -= dx / cam.z; cam.y -= dy / cam.z; camClamp(); cdrag.x = e.clientX; cdrag.y = e.clientY; });
  layer.addEventListener('pointerup', e => { e.stopPropagation(); const d = cdrag; cdrag = null; if (!d || d.moved) return;
    const [wx, wy] = toWorld(...toCv(e)); let best = null, bd = 1e9; for (const f of F) if (f.alive) { const [x, y] = fpos(f), dd = Math.hypot(x - wx, y - wy); if (dd < bd) { bd = dd; best = f; } }
    if (best && bd < 110 * S(best)) { cam.follow = best; cam.manual = false; cam.overview = false; } else if (cam.follow) cam.follow = null; });
  for (const ev of ['click', 'dblclick']) layer.addEventListener(ev, e => { e.stopPropagation(); if (ev === 'dblclick') camCmd('auto'); });

  // ---------- 🎞️ the frame ----------
  let lastFrame = 0;
  function frame(now) {
    if (!running) return;
    if (!scene.show && mode !== 'fight' && mode !== 'intro' && mode !== 'final') { running = false; lastFrame = 0; return; } // nothing to finish behind another tab: rest
    requestAnimationFrame(frame);
    const cap = scene.show ? GFX.fps || 0 : 30; if (cap && lastFrame && now - lastFrame < 1000 / cap - 1.5) return;
    const real = Math.min(.1, (now - (lastFrame || now)) / 1000); lastFrame = now;
    if (!scene.show) { modeT += real; if (mode === 'intro' && modeT > 2.4) { mode = 'fight'; modeT = 0; } if (mode === 'final' && modeT > 3.2) { mode = 'fight'; modeT = 0; finalLeft = 20; } acc += real * timeK(); let n = 0; while (acc >= DT && n < 8) { step(DT); acc -= DT; n++; } if (n === 8) acc = 0; parts = []; texts = []; return; } // (behind another tab: just finish the fight)
    const k = RY().scale?.() || 1; if (cv.width !== Math.round(W * k)) { cv.width = Math.round(W * k); cv.height = Math.round(H * k); }
    if (!bg || bgScale !== Math.min(2, k) || bgMap !== scene.map) { bgScale = Math.min(2, k); bgMap = scene.map; bg = RUMBLE() ? drawBgRumble(bgScale) : WIZ() ? drawBgWizard(bgScale) : COLO() ? drawBgColosseum(bgScale) : drawBg(bgScale); }
    modeT += real; toastT -= real; camStep(real);
    if (mode === 'intro' && modeT > 2.4) { mode = 'fight'; modeT = 0; bell(); if (RUMBLE()) snd('crowd'); }
    if (mode === 'final' && modeT > 3.2) { mode = 'fight'; modeT = 0; finalLeft = 20; snd('bell'); snd(RUMBLE() ? 'crowd' : 'hyah'); } // 🔔 FIGHT! (the battle clock was stopped while FINAL FIGHT showed)
    if (mode === 'replay') { replayOn = true; replay.t = (replay.t ?? replay.frames[0].T) + real * .45; while (replay.i < replay.frames.length - 1 && replay.frames[replay.i + 1].T <= replay.t) replay.i++; if (replay.t >= replay.frames[replay.frames.length - 1].T + .4) { mode = 'won'; modeT = 0; replayOn = false; replay = null; snd('fanfare'); } }
    else { acc += real * timeK(); let n = 0; while (acc >= DT && n < 8) { step(DT); acc -= DT; n++; } if (n === 8) acc = 0; }
    if (mode === 'fight' || (mode === 'over' && modeT < 1.6)) { rbuf.push({ T, f: F.map(f => ({ x: f.x, z: f.z, h: f.h, face: f.face, ph: f.ph, atk: f.atk && { ...f.atk }, alive: f.alive, koT: f.koT, limbs: { ...f.limbs }, head: f.head, hp: f.hp, hurtT: f.hurtT, block: f.block, weapon: f.weapon, yell: f.yell, down: f.down, lie: f.lie, heldBy: !!f.heldBy, out: f.out, falling: f.falling, sn: f.stains.length, look: f.target ? Math.sign(f.target.x - f.x) : f.face })) }); if (rbuf.length > 260) rbuf.shift(); } // ⏪ the last few seconds, for the replay
    // effects move in real (slowed) time
    const vt = real * timeK();
    for (const p of parts) { p.vy += p.g * vt; p.x += p.vx * vt; p.y += p.vy * vt; p.life -= vt; if (p.blood && p.gz != null && p.y >= zY(p.gz) && p.vy > 0) { if (WIZ() && !solid(p.x, p.gz)) { p.gz = null; continue; } stamp(p.x, zY(p.gz) - vr(0, 6), p.size * vr(.8, 1.5), Math.random() < .5 ? 'rgba(130,0,12,.75)' : 'rgba(170,10,24,.65)'); p.life = 0; } }
    parts = parts.filter(p => p.life > 0);
    for (const o of flyers) { if (o.rest) continue; o.vy += 1500 * vt; o.x += o.vx * vt; o.y += o.vy * vt; o.rot += o.vrot * vt; if (o.blood > 0) { o.blood -= vt; if (Math.random() < .6) parts.push({ x: o.x, y: o.y, vx: vr(-60, 60), vy: vr(-60, 40), g: 1500, life: 2, max: 2, size: vr(2, 4), color: '#b0101c', gz: o.gz, blood: true }); } const gy = zY(o.gz) - 6; if (o.y > gy && o.vy > 0) { o.y = gy; o.vy *= -.35; o.vx *= .6; o.vrot *= .5; if (Math.abs(o.vy) < 60) { o.rest = true; o.vy = 0; } } }
    for (const t of texts) { t.life -= real; t.y -= 40 * real; } texts = texts.filter(t => t.life > 0);
    if (!RUMBLE() && petals.length < 40 && Math.random() < .3) petals.push({ x: vr(-100, W), y: -20, vx: vr(30, 90), vy: vr(30, 70), r: vr(0, 6), c: Math.random() < .5 ? '#ffc0d8' : '#ffd9e6' });
    for (const p of petals) { p.x += (p.vx + Math.sin(now / 700 + p.r) * 30) * real; p.y += p.vy * real; p.r += real * 2; } petals = petals.filter(p => p.y < H + 20 && p.x < W + 40);

    g.setTransform(k, 0, 0, k, 0, 0); g.imageSmoothingEnabled = GFX.smooth !== false;
    g.save(); camApply(); // 🎥 the world (the top bar, banners and the winner screen stay put)
    g.drawImage(bg, 0, 0, W, H);
    if (RUMBLE()) ringLogo(); else if (WIZ()) { for (const f of F) if (f.falling && f.h > -1300) drawFighter(f); drawPlatform(now / 1000); } else if (!COLO()) lanterns(now / 1000); // (falling packs go behind the platform: you see them through the holes)
    g.drawImage(floor, 0, 0);
    if (RUMBLE()) arenaLights(now / 1000);
    for (const w of weapons) { const s = .9 + w.z * .4; g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.ellipse(w.x, zY(w.z), 30 * s, 7 * s, 0, 0, 7); g.fill(); drawWeapon(w.kind, w.x - 20 * s, zY(w.z) - w.h - (w.kind === 'chair' ? 28 * s : 6), 1, s, w.h > 0 ? T * 8 : 0); }
    const shown = mode === 'replay' && replay ? replay.frames[replay.i].f.map((sn, i) => ({ ...F[i], ...sn, stains: F[i].stains.slice(0, sn.sn), target: { x: F[i].x * 0 + sn.x + sn.look * 50, alive: true } })) : F;
    const order2 = [...shown.filter(f => !f.falling), ...lions.map(L => ({ lion: L, alive: true, z: L.z }))].sort((a, b) => (a.alive - b.alive) || a.z - b.z);
    for (const f of order2) f.lion ? drawLion(f.lion) : drawFighter(f);
    if (WIZ()) drawSpells(now / 1000);
    if (RUMBLE()) drawRing(g, true); // (the front ropes are in front of everyone)
    for (const o of flyers) drawFlyer(o);
    for (const p of parts) { g.globalAlpha = p.dust ? Math.max(0, p.life / p.max) : 1; g.fillStyle = p.color; g.beginPath(); g.arc(p.x, p.y, p.size, 0, 7); g.fill(); } g.globalAlpha = 1;
    for (const t of texts) { const a = Math.min(1, t.life / t.max * 2), sc = 1 + (1 - t.life / t.max) * .25; g.save(); g.translate(t.x, t.y); g.rotate(t.rot); g.scale(sc, sc); g.globalAlpha = a; g.font = `${t.size}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = 7; g.strokeStyle = '#1a0a08'; g.strokeText(t.t, 0, 0); g.fillStyle = t.color; g.fillText(t.t, 0, 0); g.restore(); }
    if (cam.follow?.alive && mode !== 'replay') { const f = cam.follow, s = S(f), [x, y] = fpos(f); g.strokeStyle = '#7dd3fc'; g.lineWidth = 3; g.setLineDash([8, 6]); g.beginPath(); g.ellipse(x, zY(f.z) - f.h, 60 * s, 16 * s, 0, now / 400, now / 400 + 6.3); g.stroke(); g.setLineDash([]); }
    g.restore();
    for (const p of petals) { g.save(); g.translate(p.x, p.y); g.rotate(p.r); g.fillStyle = p.c; g.beginPath(); g.ellipse(0, 0, 6, 3.5, 0, 0, 7); g.fill(); g.restore(); }
    hud(now);
    if (cam.follow && mode !== 'replay' && mode !== 'won') { const txt = `🎥 Following ${cam.follow.name || ''}`; g.font = '800 24px Inter, sans-serif'; const tw = g.measureText(txt).width; g.fillStyle = 'rgba(10,20,40,.75)'; g.fillRect(W / 2 - tw / 2 - 16, H - 64, tw + 32, 40); g.fillStyle = '#7dd3fc'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, W / 2, H - 44); }
    const vg = g.createRadialGradient(W / 2, H / 2, H * .45, W / 2, H / 2, H * .95); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(20,6,0,.5)'); g.fillStyle = vg; g.fillRect(0, 0, W, H); // old film look
    if (GFX.quality === 'high') { g.fillStyle = 'rgba(255,230,190,.05)'; for (let i = 0; i < 3; i++) g.fillRect(vr(0, W), 0, 1.5, H); }
  }
  function banner(text, y, size, col = '#ffd23a') { g.font = `${size}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = size * .16; g.strokeStyle = '#2a0808'; g.strokeText(text, W / 2, y); g.fillStyle = col; g.fillText(text, W / 2, y); }
  function hud(now) {
    const live = alive().length, on = Object.keys(scene.wacky).filter(k => scene.wacky[k]);
    g.fillStyle = 'rgba(20,6,6,.72)'; g.fillRect(0, 0, W, 62);
    g.font = `34px ${FONT}`; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillStyle = '#ffd23a'; g.fillText(`${MI().title} · ${scene.battleName || 'Card battle'}`, 24, 32);
    g.textAlign = 'right'; g.fillStyle = '#fff'; g.fillText(mode === 'lobby' ? `${F.length} pack${F.length === 1 ? '' : 's'} ready` : `${live} of ${F.length} standing`, W - 24, 32);
    if (on.length) { g.font = '800 20px Inter, sans-serif'; g.textAlign = 'center'; const t = on.map(k => WN[k] || k).join('   '); const w = g.measureText(t).width + 30; g.fillStyle = 'rgba(160,20,40,.8)'; g.fillRect(W / 2 - w / 2, 66, w, 32); g.fillStyle = '#fff'; g.fillText(t, W / 2, 83); }
    if (mode === 'fight' || mode === 'final' || mode === 'intro') { // ⏱️ the fight clock (stops while FINAL FIGHT shows)
      const left = finalLeft > 0 ? finalLeft : Math.max(0, D - T), txt = `${Math.floor(left / 60)}:${String(Math.floor(left % 60)).padStart(2, '0')}`;
      g.fillStyle = finalLeft > 0 ? 'rgba(200,30,30,.9)' : 'rgba(20,6,6,.8)'; g.beginPath(); g.roundRect?.(W / 2 - 90, 108, 180, 58, 14); g.fill(); g.font = `44px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#fff'; g.fillText(mode === 'final' ? '⏸ ' + txt : txt, W / 2, 138); }
    if (mode === 'final' && finalPair) { const u = Math.min(1, modeT / .35); g.save(); g.translate(W / 2, 360); g.scale(.6 + .4 * u, .6 + .4 * u); g.translate(-W / 2, -360); banner('🥊 FINAL FIGHT! 🥊', 330, 120, '#ff3a2a'); g.restore();
      g.font = `48px ${FONT}`; g.textAlign = 'center'; g.lineWidth = 8; g.strokeStyle = '#2a0808'; const vs = `${finalPair[0].name}  VS  ${finalPair[1].name}`.slice(0, 70); g.strokeText(vs, W / 2, 430); g.fillStyle = '#fff'; g.fillText(vs, W / 2, 430);
      if (modeT > 2.4) banner('🔔 FIGHT!', 520, 90, '#ffd23a'); }
    if (toastT > 0) { g.globalAlpha = Math.min(1, toastT); banner(toastText, 200, 64, '#ff8ab0'); g.globalAlpha = 1; }
    if (mode === 'lobby') { banner('🃏 CARD BATTLE', 330, 110); g.font = '800 30px Inter, sans-serif'; g.fillStyle = '#fff'; g.textAlign = 'center'; g.fillText(F.length >= 2 ? 'Waiting for the fight…' : 'Add packs in the 📦 Card pool tab', W / 2, 410); }
    if (mode === 'intro') { const u = modeT; if (u < 1.4) banner(MI().intro, 360, 120 + u * 20, '#ffd23a'); else banner(RUMBLE() ? 'BELL!' : 'FIGHT!', 360, 170 + (u - 1.4) * 60, '#ff3a2a'); }
    if (mode === 'replay') { g.fillStyle = '#000'; g.fillRect(0, 0, W, 70); g.fillRect(0, H - 70, W, 70); g.font = `44px ${FONT}`; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillStyle = Math.sin(now / 250) > 0 ? '#ff4a4a' : '#ffffff'; g.fillText('⏪ REPLAY', 40, H - 35); }
    if (mode === 'won' && winner) {
      const u = Math.min(1, modeT / .8); g.fillStyle = `rgba(0,0,0,${.55 * u})`; g.fillRect(0, 0, W, H);
      if (u > .1) { // the winning pack, big, arms up
        const sc = 3.4 * u, PW = 74 * sc, PH = 112 * sc, top = 300, X = W / 2, hip = top + PH, f = winner;
        g.save(); g.shadowColor = '#ffd23a'; g.shadowBlur = 60; g.fillStyle = 'rgba(255,210,60,.18)'; g.beginPath(); g.ellipse(X, top + PH / 2, PW * .9, PH * .7, 0, 0, 7); g.fill(); g.restore();
        g.strokeStyle = '#151515'; g.lineCap = 'round'; g.lineJoin = 'round';
        for (const side of [-1, 1]) { if (!f.limbs[side < 0 ? 'll' : 'rl']) continue; const hx = X + side * PW * .22, fx = hx + side * 10 * sc, fy = Math.min(H - 40, hip + 44 * sc * .55); limb(hx, hip, fx, fy, -side * 4 * sc, 5.5 * sc); }
        drawPackBody({ ...f, hp: Math.max(f.hp, 40), hurtT: 0 }, X - PW / 2, top, PW, PH, sc, f.head ? 0 : PH * .38);
        for (const side of [-1, 1]) { if (!f.limbs[side < 0 ? 'la' : 'ra']) continue; const shx = X + side * PW * .48, sy = top + PH * .48, hx = shx + side * 30 * sc, hy = sy - 46 * sc + Math.sin(modeT * 8 + side) * 6 * sc; limb(shx, sy, hx, hy, side * 6 * sc, 5 * sc); g.fillStyle = '#f2e0c4'; g.lineWidth = 2 * sc; g.beginPath(); g.arc(hx, hy, 6.5 * sc, 0, 7); g.fill(); g.stroke(); }
        if (f.head) { const keep = { atk: f.atk, yell: f.yell, alive: f.alive, hp: f.hp, hurtT: f.hurtT }; Object.assign(f, { atk: null, yell: 1, alive: true, hp: 100, hurtT: 0 }); drawFace(f, X, top, PW, PH, sc, 0); Object.assign(f, keep); }
      }
      banner('🏆 WINNER 🏆', 210, 96); banner(winner.name || '', 860, Math.min(76, 1800 / Math.max(8, (winner.name || '').length) * 1.6), '#fff');
      g.font = '800 30px Inter, sans-serif'; g.fillStyle = '#ffd23a'; g.textAlign = 'center'; g.fillText(scene.test ? '🧪 Pretend fight' : 'Time to open it! 📦', W / 2, 930);
      if (Math.random() < .5) petals.push({ x: vr(0, W), y: -10, vx: vr(-40, 40), vy: vr(80, 160), r: 0, c: ['#ffd23a', '#ff5a7a', '#5ad6ff', '#ffffff'][Math.floor(Math.random() * 4)] });
    }
  }
  window.CARDS = { msg, on: () => !layer.classList.contains('hidden'), cam: a => camCmd(a), camAuto: on => { cam.auto = !!on; }, camState: () => ({ ...cam, follow: cam.follow?.name || null }), state: () => ({ mode, alive: alive().length, n: F.length, winner: winner?.id || null, T }),
    sim: secs => { const out = []; let last = alive().length; if (mode === 'intro') mode = 'fight'; for (let i = 0; i < secs * 60 && !winner; i++) { if (mode === 'final') { mode = 'fight'; finalLeft = 20; } step(DT); const n = alive().length; if (n !== last) { out.push([+T.toFixed(1), n]); last = n; } } return { out, T, winner: winner?.id || null, destined, falls: F.filter(f => f.falling).length, lions: lions.length }; },
    dbg: () => alive().map(f => ({ id: f.id, d: f.id === destined, x: Math.round(f.x), z: +f.z.toFixed(2), h: Math.round(f.h), hp: Math.round(f.hp), down: +f.down.toFixed(2), held: !!f.heldBy, whip: f.whip, reb: +f.rebound.toFixed(2), atk: f.atk?.kind, stun: +f.stun.toFixed(2), tgt: f.target?.id, seek: !!f.seek, w: f.weapon, cd: +f.cd.toFixed(2) })) }; // (for testing: plays the fight fast, without drawing)
})();

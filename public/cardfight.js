// 🃏 Card battles on the game screen (OBS + the app): card packs with stick arms and legs and angry faces have a
// martial arts brawl. Health bars on top, blood, and wacky settings (low gravity, extreme gore, teleport switches…).
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
  let bg = null, bgScale = 0;

  // ---------- helpers ----------
  const zY = z => GY0 + z * (GY1 - GY0);
  const sizeK = () => (scene.wacky.giant ? 1.55 : scene.wacky.tiny ? .62 : 1);
  const baseSize = n => clamp(1.55 - n * .028, .5, 1.35);
  const timeK = () => (scene.wacky.slowmo ? .45 : 1) * (T < slowUntil ? .3 : 1);
  const speedK = () => scene.wacky.turbo ? 1.7 : 1;
  const grav = () => scene.wacky.lowgrav ? 520 : 1900;
  const alive = () => F.filter(f => f.alive);
  const S = f => (.72 + f.z * .4) * f.size * sizeK(); // on-screen scale (closer = bigger)

  function makeFighters(list) {
    const n = list.length, size = baseSize(n);
    const cols = Math.ceil(Math.sqrt(n * 2.4)), rows = Math.ceil(n / cols);
    return list.map((p, i) => {
      const c = i % cols, r = Math.floor(i / cols);
      const x = 150 + (c + .5) * (1620 / cols) + rr(-20, 20), z = rows === 1 ? .55 : .12 + r / Math.max(1, rows - 1) * .8 + rr(-.03, .03);
      return { ...p, x, z: clamp(z, 0, 1), h: 0, vx: 0, vz: 0, vh: 0, face: x < W / 2 ? 1 : -1, hp: 100, alive: true, size: size * rr(.94, 1.06),
        cd: rr(.3, 1.4), stun: 0, atk: null, block: 0, target: null, retarget: 0, ph: rr(0, 6), limbs: { la: 1, ra: 1, ll: 1, rl: 1 }, head: true,
        stains: [], hurtT: 0, koT: 0, weapon: null, yell: 0, color: p.color || `hsl(${Math.floor(R() * 360)},65%,48%)` };
    });
  }

  // ---------- 🎬 scene messages from the server ----------
  function msg(m) {
    if (m.type === 'cardWacky') { scene.wacky = m.wacky || {}; if (m.key && m.on && scene.show) { toast(`${(WN[m.key] || m.key)}!`); snd('gong'); } return; }
    if (m.type !== 'cardScene') return;
    const was = scene; scene = { ...m, wacky: m.wacky || {} };
    layer.classList.toggle('hidden', !m.show);
    if (m.show) SFX.setMap?.('card-' + (m.map || 'kungfu'));
    if (!running) { running = true; requestAnimationFrame(frame); } // (keeps going behind another tab until a fight is finished, without drawing or sound)
    if (!m.show && was.show) SFX.stopMusic?.();
    if (!m.show && m.phase !== 'fight') return;
    if (m.phase === 'fight' && m.fightId && m.fightId !== fightId) { // a new fight
      fightId = m.fightId; destined = m.destined; R = mulberry(m.seed || 1); order = []; winner = null; sent = false;
      F = makeFighters(m.fighters); parts = []; texts = []; flyers = []; weapons = []; fg.clearRect(0, 0, W, H);
      mode = 'intro'; modeT = 0; T = 0; acc = 0; teleT = 5; weapT = 7; slowUntil = 0; weapDrops = 0; lastKO = 0; rbuf = []; replay = null; replayOn = false; showdownSaid = false; finalLeft = 0; finalPair = null;
      PACE = clamp(Number(m.pace ?? 50), 0, 100); D = clamp(Number(m.length) || (25 + F.length * 1.6), 15, 240); // ⏳ how long the fight should take, and how hard the pacer works
      const late = (Date.now() - (m.startedAt || Date.now())) / 1000 - 2.4; // a screen that opened in the middle of the fight catches up (same seed = same fight)
      if (late > 1) { mode = 'fight'; modeT = 0; const quiet = SFX.play; SFX.play = () => {};
        try { if (late > D * 2.5) { const w = F.find(f => f.id === destined) || F[0]; for (const f of F) if (f !== w) { f.alive = false; f.koT = 9; order.push(f.id); } finish(w, true); } // (long over: just show who won)
          else for (let i = 0; i < late * 60 && !winner; i++) step(DT); } finally { SFX.play = quiet; }
        parts = []; texts = []; rbuf = []; }
      else snd('gong');
      if (m.show) SFX.music?.('fight');
    } else if (m.phase !== 'fight' && m.phase !== 'ended') { // lobby: the packs lined up and waiting
      if (mode !== 'lobby' || F.length !== m.fighters.length || F.some((f, i) => f.id !== m.fighters[i]?.id)) { R = Math.random; F = makeFighters(m.fighters); fg.clearRect(0, 0, W, H); parts = []; flyers = []; weapons = []; }
      mode = 'lobby'; fightId = null; winner = null; replay = null; if (m.show) SFX.music?.('lobby');
    } else if (m.phase === 'ended' && m.last && mode !== 'won' && mode !== 'replay' && mode !== 'over' && !winner) { // (a screen that joined late: show the winner)
      if (!F.length || F.some((f, i) => f.id !== m.fighters[i]?.id)) { R = Math.random; F = makeFighters(m.fighters); fightId = m.fightId; }
      if (!winner) { winner = F.find(f => f.packId === m.last.packId) || null; if (winner) { for (const f of F) if (f !== winner) { f.alive = false; f.koT = 6; } mode = 'won'; modeT = 1; } }
    }
  }
  const WN = { lowgrav: '🪶 LOW GRAVITY', gore: '🩸 EXTREME GORE', teleport: '🔀 TELEPORT SWITCHES', turbo: '⚡ TURBO', slowmo: '🐌 SLOW MOTION', giant: '🦍 GIANT PACKS', tiny: '🐜 TINY PACKS', slippery: '🧊 SLIPPERY STREET', boom: '💣 EXPLODING K.O.s', onehit: '☠️ ONE-HIT K.O.', rage: '😡 RAGE MODE', weapons: '🗡️ WEAPONS' };
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
    if (R() < .25) return others[Math.floor(R() * others.length)];
    let best = null, bd = 1e9; for (const o of others) { const d = Math.abs(o.x - f.x) + Math.abs(o.z - f.z) * 900; if (d < bd) { bd = d; best = o; } } return best;
  }
  function step(dt) {
    if (mode === 'final') { for (const f of F) f.ph += dt * 3; return; } // (the clock stops while FINAL FIGHT shows)
    T += dt;
    const live = alive();
    if (mode !== 'fight') { for (const f of F) { f.ph += dt * 3; physics(f, dt); } return; }
    if (scene.wacky.teleport && (teleT -= dt) <= 0 && live.length > 2) { // 🔀 two packs swap places
      teleT = rr(3.5, 6); const a = live[Math.floor(R() * live.length)]; let b = live[Math.floor(R() * live.length)]; if (b === a) b = live[(live.indexOf(a) + 1) % live.length];
      for (const f of [a, b]) puff(f, '#c88cff'); [a.x, b.x] = [b.x, a.x]; [a.z, b.z] = [b.z, a.z]; for (const f of [a, b]) puff(f, '#c88cff');
      word('SWITCH!', (a.x + b.x) / 2, zY((a.z + b.z) / 2) - 200, '#d6a8ff', 54); snd('swap');
    }
    if (scene.wacky.weapons && weapDrops < 2 && (weapT -= dt) <= 0) { weapT = rr(5, 8); weapDrops++; weapons.push({ kind: ['sword', 'staff', 'nunchaku'][Math.floor(R() * 3)], x: rr(200, 1720), z: rr(.1, .9), h: 700, vh: 0 }); }
    for (const w of weapons) if (w.h > 0) { w.vh -= grav() * dt; w.h = Math.max(0, w.h + w.vh * dt); if (w.h === 0) { w.vh = 0; dust(w.x, w.z, 6); snd('land', { p: 1.4 }); } }
    for (const f of F) {
      f.ph += dt * (f.atk ? 6 : Math.abs(f.vx) > 20 || Math.abs(f.vz) > .02 ? 9 : 3);
      f.hurtT = Math.max(0, f.hurtT - dt); f.yell = Math.max(0, f.yell - dt);
      if (!f.alive) { physics(f, dt); continue; }
      if (T > D * 1.8 && f.id !== destined) damage(null, f, 1.5 * dt * 10, 'bleed'); // (very long fights: the end comes)
      f.cd -= dt * speedK(); f.stun -= dt; f.retarget -= dt; f.block = Math.max(0, f.block - dt);
      if (!f.target?.alive || f.retarget <= 0) { f.target = pickTarget(f); f.retarget = rr(1.5, 3.5); }
      // 🗡️ not fighting anyone right now and empty-handed: go grab a weapon lying in the street, or go after whoever has one
      if (!f.weapon && !f.atk && f.stun <= 0 && !inCombat(f)) {
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
      const s = S(f), reach = (52 + (f.weapon ? 30 : 0)) * s, dx = t.x - f.x, dz = t.z - f.z;
      if (!f.atk) f.face = dx >= 0 ? 1 : -1;
      if (!f.weapon && weapons.length) { const w = weapons.find(w => w.h === 0 && Math.abs(w.x - f.x) < 34 * s && Math.abs(w.z - f.z) < .06); if (w) { f.weapon = w.kind; weapons.splice(weapons.indexOf(w), 1); word('GOT IT!', f.x, zY(f.z) - 190 * s, '#ffe08a', 30); snd('clash'); } }
      if (f.atk) { attack(f, dt); }
      else {
        const legs = f.limbs.ll + f.limbs.rl, sp = 170 * speedK() * (legs === 2 ? 1 : legs === 1 ? .6 : .32);
        if (Math.abs(dz) > .03) f.vz += Math.sign(dz) * .9 * dt * speedK() * (legs ? 1 : .4);
        if (Math.abs(dx) > reach * .9) f.vx += Math.sign(dx) * sp * 6 * dt;
        else if (Math.abs(dx) < reach * .45) f.vx -= Math.sign(dx) * sp * 3 * dt; // a little room to swing
        if (f.cd <= 0 && Math.abs(dz) < .06 && Math.abs(dx) < reach * 1.15 && f.h === 0) startAtk(f, Math.abs(dx) > reach * .8 && R() < .3 ? 'jump' : R() < .62 ? 'punch' : 'kick');
        else if (f.cd <= 0 && Math.abs(dz) < .06 && Math.abs(dx) < reach * 3.2 && f.h === 0 && R() < .02) startAtk(f, 'jump');
        if (t.atk && Math.abs(dx) < reach * 1.3 && R() < .01) f.block = .5;
      }
      physics(f, dt);
    }
    for (let i = 0; i < F.length; i++) { const a = F[i]; if (!a.alive) continue; for (let j = i + 1; j < F.length; j++) { const b = F[j]; if (!b.alive) continue; // they don't stand inside each other
      const dz = b.z - a.z, dx = b.x - a.x, m = 40 * (S(a) + S(b)) / 2; if (Math.abs(dz) < .035 && Math.abs(dx) < m) { const k = (m - Math.abs(dx)) / 2 * (dx >= 0 ? 1 : -1); a.x -= k; b.x += k; } } }
    if (finalLeft > 0 && finalPair && live.length === 2) { finalLeft -= dt; if (finalLeft <= 0) { const loser = finalPair.find(f => f.id !== destined && f.alive) || finalPair[1]; const w = finalPair.find(f => f !== loser); ko(loser, w, !!scene.wacky.gore); } } // ⏱️ time's up: the finishing blow
    if (live.length <= 1 && !winner) finish(live[0] || F.find(f => f.id === destined) || F[0]);
  }
  function startAtk(f, kind) {
    const arms = f.limbs.la + f.limbs.ra, legs = f.limbs.ll + f.limbs.rl;
    if (kind === 'punch' && !arms) kind = legs ? 'kick' : 'head';
    if (kind === 'kick' && !legs) kind = arms ? 'punch' : 'head';
    if (kind === 'jump' && !legs) kind = arms ? 'punch' : 'head';
    const dur = { punch: .32, kick: .42, jump: .7, head: .4 }[kind];
    f.atk = { kind, t: 0, dur, hitAt: dur * .45, done: false };
    f.cd = rr(.55, 1.15) / (scene.wacky.rage ? 1 + (1 - f.hp / 100) * .8 : 1);
    if (kind === 'jump') { f.vh = scene.wacky.lowgrav ? 520 : 620; f.vx = f.face * 380 * speedK(); f.yell = .5; snd('whoosh'); }
    else if (R() < .25) f.yell = .4;
  }
  function attack(f, dt) {
    const a = f.atk; a.t += dt * speedK();
    const hitting = a.kind === 'jump' ? a.t > .12 && f.h > 0 : a.t >= a.hitAt && a.t < a.hitAt + .1;
    if (hitting && !a.done) {
      const s = S(f), reach = ({ punch: 70, kick: 84, jump: 70, head: 50 }[a.kind] + (f.weapon ? 30 : 0)) * s;
      for (const o of F) { if (o === f || !o.alive) continue; const dx = (o.x - f.x) * f.face; if (dx > -12 * s && dx < reach && Math.abs(o.z - f.z) < .065 && Math.abs(o.h - f.h) < 90) { a.done = true; hit(f, o, a.kind); break; } }
    }
    if (a.t >= a.dur) f.atk = null;
  }
  function hit(f, o, kind) {
    let dmg = { punch: rr(7, 11), kick: rr(10, 15), jump: rr(14, 21), head: rr(6, 9) }[kind];
    if (f.weapon) dmg *= f.weapon === 'sword' ? 2.6 : f.weapon === 'staff' ? 2.2 : 2.4; // 🗡️ weapons hit much harder
    if (scene.wacky.rage) dmg *= 1 + (1 - f.hp / 100) * 1.2;
    dmg *= (T > D * 1.35 ? 4 : T > D ? 2 : 1) * paceBoost();
    const blocked = o.block > 0 && o.face === -f.face;
    if (blocked) { dmg *= .2; word('BLOCK!', o.x, zY(o.z) - 160 * S(o), '#9fd6ff', 30); snd('clash'); o.vx += f.face * 120; return damage(f, o, dmg, kind, true); }
    if (scene.wacky.onehit) dmg = 999;
    o.vx += f.face * (160 + dmg * 14) * (scene.wacky.lowgrav ? 1.6 : 1); if (scene.wacky.lowgrav || kind === 'jump') o.vh = Math.max(o.vh, scene.wacky.lowgrav ? 260 + dmg * 12 : 160);
    o.stun = .22 + Math.min(.5, dmg / 60); o.atk = null; o.hurtT = .3;
    const sx = o.x - f.face * 18 * S(o), sy = zY(o.z) - o.h - (60 + R() * 70) * S(o);
    word(f.weapon ? (f.weapon === 'sword' ? 'SLASH!' : 'THWACK!') : pickW(kind), sx, sy - 40, kind === 'jump' ? '#ffd23a' : '#fff', kind === 'jump' ? 46 : 36);
    sparks(sx, sy); snd(kind === 'kick' || kind === 'jump' ? 'kick' : 'punch');
    if (o.weapon && !f.weapon && R() < .3) { f.weapon = o.weapon; o.weapon = null; word('STOLEN!', f.x, zY(f.z) - 200 * S(f), '#ffe08a', 40); snd('clash'); } // knocked loose and grabbed
    if (kind === 'jump') snd('hyah');
    damage(f, o, dmg, kind);
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
  function ko(o, f, decap) {
    o.alive = false; o.hp = 0; o.koT = 0; o.atk = null; o.vx += (f ? f.face : vr(-1, 1)) * 260; order.push(o.id);
    lastKO = T; if (o.weapon) { weapons.push({ kind: o.weapon, x: o.x, z: o.z, h: 60, vh: 200 }); o.weapon = null; } // the weapon drops for someone else
    if (alive().length === 2 && !showdownSaid) { showdownSaid = true;
      if (scene.finalFight) { // 🥊 FINAL FIGHT (maps that have one): the clock stops, the last two face off across the street with a weapon each, a bell, then a timed fight
        const [a, b] = alive(); finalPair = [a, b]; mode = 'final'; modeT = 0;
        const kinds = ['sword', 'staff', 'nunchaku'], k1 = Math.floor(R() * 3);
        for (const [f, x, face, k] of [[a, W * .3, 1, kinds[k1]], [b, W * .7, -1, kinds[(k1 + 1 + Math.floor(R() * 2)) % 3]]]) { puff(f, '#ffd23a'); Object.assign(f, { x, z: .55, h: 0, vx: 0, vz: 0, vh: 0, face, atk: null, stun: 0, block: 0, weapon: k, target: f === a ? b : a }); puff(f, '#ffd23a'); }
        weapons = []; snd('gong');
      } else { toast('🥊 FINAL SHOWDOWN!'); snd('gong'); } }
    const s = S(o);
    if (decap) { // 🩸 the face comes off (the top of the pack)
      o.head = false;
      flyers.push({ kind: 'head', f: o, x: o.x, y: zY(o.z) - o.h - 150 * s, gz: o.z, vx: (f ? f.face : 1) * vr(220, 480), vy: -vr(500, 800), rot: 0, vrot: vr(-10, 10), s, rest: false, blood: 2 });
      blood(o.x, zY(o.z) - o.h - 120 * s, o.z, 60, f ? f.face : 0, 2.2); word('HEADLESS!', o.x, zY(o.z) - 240 * s, '#ff3030', 58); snd('chop'); snd('splat');
    } else { word(pick(['K.O.!', 'DOWN!', 'FINISHED!']), o.x, zY(o.z) - 200 * s, '#ff5a5a', 52); snd('splat'); }
    snd('fall');
    if (scene.wacky.boom) { // 💣 it explodes
      for (let i = 0; i < 40; i++) parts.push({ x: o.x, y: zY(o.z) - 60 * s, vx: vr(-600, 600), vy: vr(-700, -100), g: 900, life: vr(.4, 1), max: 1, size: vr(5, 12), color: ['#ffcf4a', '#ff7a2a', '#fff2a0', '#5a3a2a'][Math.floor(Math.random() * 4)], gz: null });
      snd('boom'); word('BOOM!', o.x, zY(o.z) - 140 * s, '#ffb02a', 64);
      for (const n of F) if (n.alive && n !== o && Math.abs(n.x - o.x) < 170 * s && Math.abs(n.z - o.z) < .15) { n.vx += Math.sign(n.x - o.x || 1) * 520; n.vh = 300; damage(null, n, 16, 'boom'); }
    }
    if (alive().length === 1) slowUntil = T + 1.4;
  }
  function physics(f, dt) {
    const slip = scene.wacky.slippery;
    f.x += f.vx * dt; f.z = clamp(f.z + f.vz * dt, 0, 1);
    const fr = f.h > 0 ? .995 : slip ? .985 : .86; f.vx *= Math.pow(fr, dt * 60); f.vz *= Math.pow(slip ? .97 : .8, dt * 60);
    if (f.h > 0 || f.vh > 0) { f.h += f.vh * dt; f.vh -= grav() * dt; if (f.h <= 0) { f.h = 0; f.vh = 0; if (f.atk?.kind === 'jump') f.atk = null; dust(f.x, f.z, 5); } }
    if (slip && f.alive && f.h === 0 && Math.abs(f.vx) > 160 && R() < .004) { f.stun = .9; word('SLIP!', f.x, zY(f.z) - 150 * S(f), '#bfefff', 30); snd('bonk'); }
    if (f.x < 90) { f.x = 90; f.vx = Math.abs(f.vx) * .4; } if (f.x > W - 90) { f.x = W - 90; f.vx = -Math.abs(f.vx) * .4; }
    if (!f.alive) f.koT += dt;
  }
  function finish(w, quick) {
    winner = w; mode = 'won'; modeT = 0; slowUntil = T + 1.2;
    if (!quick && rbuf.length > 60) { mode = 'over'; setTimeout(() => { if (winner !== w || mode !== 'over') return; replay = { frames: rbuf.slice(-180), i: 0 }; mode = 'replay'; modeT = 0; }, 1800); } // ⏪ then the replay of the last moments
    else setTimeout(() => snd('fanfare'), 600);
    snd('gong'); if (scene.show) SFX.music?.(null);
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
    g.fillStyle = '#d82020'; g.fillRect(cx - PW / 2, top + PH * .12, PW, PH * .07);
    const tx = cx - f.face * PW / 2, tw = Math.sin(T * 9 + f.ph) * 6 * s; g.strokeStyle = '#d82020'; g.lineWidth = 4 * s; g.beginPath(); g.moveTo(tx, top + PH * .15); g.quadraticCurveTo(tx - f.face * 18 * s, top + PH * .15 + tw, tx - f.face * 34 * s, top + PH * .2 - tw); g.stroke();
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
    else { g.strokeStyle = '#999'; g.lineWidth = 2 * s; g.beginPath(); g.moveTo(10 * s, 0); g.lineTo(24 * s, 10 * s); g.stroke(); g.fillStyle = '#3a2a1a'; g.fillRect(-14 * s, -3 * s, 26 * s, 6 * s); g.save(); g.translate(24 * s, 10 * s); g.rotate(Math.sin(T * 20) * .8); g.fillRect(0, -3 * s, 26 * s, 6 * s); g.restore(); }
    g.restore();
  }
  function drawFighter(f) {
    const s = S(f), X = f.x, Y = zY(f.z), PW = 74 * s, PH = 112 * s, LL = 44 * s, AL = 40 * s;
    g.fillStyle = 'rgba(0,0,0,.32)'; g.beginPath(); g.ellipse(X, Y, PW * .62 * (1 - Math.min(.5, f.h / 400)), 11 * s, 0, 0, 7); g.fill(); // shadow
    g.save();
    if (!f.alive) { const k = Math.min(1, f.koT * 3); g.translate(X, Y); g.rotate(-f.face * k * Math.PI / 2 * .95); g.translate(-X, -Y); if (f.koT > 5) g.globalAlpha = Math.max(.35, 1 - (f.koT - 5) * .2); }
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
      if (!f.alive) { hx = shx + side * AL * .9; hy = sy + AL * .2; }
      limb(shx, sy, hx, hy, side * 6 * s, 5 * s);
      if (front && f.weapon) drawWeapon(f.weapon, hx, hy, f.face, s, a?.kind === 'punch' ? 0 : -.9);
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
    if (!bg || bgScale !== Math.min(2, k)) { bgScale = Math.min(2, k); bg = drawBg(bgScale); }
    modeT += real; toastT -= real;
    if (mode === 'intro' && modeT > 2.4) { mode = 'fight'; modeT = 0; snd('gong'); }
    if (mode === 'final' && modeT > 3.2) { mode = 'fight'; modeT = 0; finalLeft = 20; snd('bell'); snd('hyah'); } // 🔔 FIGHT! (the battle clock was stopped while FINAL FIGHT showed)
    if (mode === 'replay') { replayOn = true; replay.t = (replay.t ?? replay.frames[0].T) + real * .45; while (replay.i < replay.frames.length - 1 && replay.frames[replay.i + 1].T <= replay.t) replay.i++; if (replay.t >= replay.frames[replay.frames.length - 1].T + .4) { mode = 'won'; modeT = 0; replayOn = false; replay = null; snd('fanfare'); } }
    else { acc += real * timeK(); let n = 0; while (acc >= DT && n < 8) { step(DT); acc -= DT; n++; } if (n === 8) acc = 0; }
    if (mode === 'fight' || (mode === 'over' && modeT < 1.6)) { rbuf.push({ T, f: F.map(f => ({ x: f.x, z: f.z, h: f.h, face: f.face, ph: f.ph, atk: f.atk && { ...f.atk }, alive: f.alive, koT: f.koT, limbs: { ...f.limbs }, head: f.head, hp: f.hp, hurtT: f.hurtT, block: f.block, weapon: f.weapon, yell: f.yell, sn: f.stains.length, look: f.target ? Math.sign(f.target.x - f.x) : f.face })) }); if (rbuf.length > 260) rbuf.shift(); } // ⏪ the last few seconds, for the replay
    // effects move in real (slowed) time
    const vt = real * timeK();
    for (const p of parts) { p.vy += p.g * vt; p.x += p.vx * vt; p.y += p.vy * vt; p.life -= vt; if (p.blood && p.gz != null && p.y >= zY(p.gz) && p.vy > 0) { stamp(p.x, zY(p.gz) - vr(0, 6), p.size * vr(.8, 1.5), Math.random() < .5 ? 'rgba(130,0,12,.75)' : 'rgba(170,10,24,.65)'); p.life = 0; } }
    parts = parts.filter(p => p.life > 0);
    for (const o of flyers) { if (o.rest) continue; o.vy += 1500 * vt; o.x += o.vx * vt; o.y += o.vy * vt; o.rot += o.vrot * vt; if (o.blood > 0) { o.blood -= vt; if (Math.random() < .6) parts.push({ x: o.x, y: o.y, vx: vr(-60, 60), vy: vr(-60, 40), g: 1500, life: 2, max: 2, size: vr(2, 4), color: '#b0101c', gz: o.gz, blood: true }); } const gy = zY(o.gz) - 6; if (o.y > gy && o.vy > 0) { o.y = gy; o.vy *= -.35; o.vx *= .6; o.vrot *= .5; if (Math.abs(o.vy) < 60) { o.rest = true; o.vy = 0; } } }
    for (const t of texts) { t.life -= real; t.y -= 40 * real; } texts = texts.filter(t => t.life > 0);
    if (petals.length < 40 && Math.random() < .3) petals.push({ x: vr(-100, W), y: -20, vx: vr(30, 90), vy: vr(30, 70), r: vr(0, 6), c: Math.random() < .5 ? '#ffc0d8' : '#ffd9e6' });
    for (const p of petals) { p.x += (p.vx + Math.sin(now / 700 + p.r) * 30) * real; p.y += p.vy * real; p.r += real * 2; } petals = petals.filter(p => p.y < H + 20 && p.x < W + 40);

    g.setTransform(k, 0, 0, k, 0, 0); g.imageSmoothingEnabled = GFX.smooth !== false;
    g.drawImage(bg, 0, 0, W, H);
    lanterns(now / 1000);
    g.drawImage(floor, 0, 0);
    for (const w of weapons) { const s = .9 + w.z * .4; g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.ellipse(w.x, zY(w.z), 30 * s, 7 * s, 0, 0, 7); g.fill(); drawWeapon(w.kind, w.x - 20 * s, zY(w.z) - w.h - 6, 1, s, w.h > 0 ? T * 8 : 0); }
    const shown = mode === 'replay' && replay ? replay.frames[replay.i].f.map((sn, i) => ({ ...F[i], ...sn, stains: F[i].stains.slice(0, sn.sn), target: { x: F[i].x * 0 + sn.x + sn.look * 50, alive: true } })) : F;
    const order2 = shown.slice().sort((a, b) => (a.alive - b.alive) || a.z - b.z);
    for (const f of order2) drawFighter(f);
    for (const o of flyers) drawFlyer(o);
    for (const p of parts) { g.globalAlpha = p.dust ? Math.max(0, p.life / p.max) : 1; g.fillStyle = p.color; g.beginPath(); g.arc(p.x, p.y, p.size, 0, 7); g.fill(); } g.globalAlpha = 1;
    for (const t of texts) { const a = Math.min(1, t.life / t.max * 2), sc = 1 + (1 - t.life / t.max) * .25; g.save(); g.translate(t.x, t.y); g.rotate(t.rot); g.scale(sc, sc); g.globalAlpha = a; g.font = `${t.size}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = 7; g.strokeStyle = '#1a0a08'; g.strokeText(t.t, 0, 0); g.fillStyle = t.color; g.fillText(t.t, 0, 0); g.restore(); }
    for (const p of petals) { g.save(); g.translate(p.x, p.y); g.rotate(p.r); g.fillStyle = p.c; g.beginPath(); g.ellipse(0, 0, 6, 3.5, 0, 0, 7); g.fill(); g.restore(); }
    hud(now);
    const vg = g.createRadialGradient(W / 2, H / 2, H * .45, W / 2, H / 2, H * .95); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(20,6,0,.5)'); g.fillStyle = vg; g.fillRect(0, 0, W, H); // old film look
    if (GFX.quality === 'high') { g.fillStyle = 'rgba(255,230,190,.05)'; for (let i = 0; i < 3; i++) g.fillRect(vr(0, W), 0, 1.5, H); }
  }
  function banner(text, y, size, col = '#ffd23a') { g.font = `${size}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = size * .16; g.strokeStyle = '#2a0808'; g.strokeText(text, W / 2, y); g.fillStyle = col; g.fillText(text, W / 2, y); }
  function hud(now) {
    const live = alive().length, on = Object.keys(scene.wacky).filter(k => scene.wacky[k]);
    g.fillStyle = 'rgba(20,6,6,.72)'; g.fillRect(0, 0, W, 62);
    g.font = `34px ${FONT}`; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillStyle = '#ffd23a'; g.fillText(`🏯 KUNG FU TOWN · ${scene.battleName || 'Card battle'}`, 24, 32);
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
    if (mode === 'intro') { const u = modeT; if (u < 1.4) banner('KUNG FU TOWN', 360, 120 + u * 20, '#ffd23a'); else banner('FIGHT!', 360, 170 + (u - 1.4) * 60, '#ff3a2a'); }
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
  window.CARDS = { msg, state: () => ({ mode, alive: alive().length, n: F.length, winner: winner?.id || null, T }) };
})();

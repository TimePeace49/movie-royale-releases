// 🥚 The 120 creatures of the egg game (1.100.0, made for True's edition): 40 families × 3 stages, 8 elements.
// All original: names and looks are made up here and drawn by the code below (no pictures, nothing borrowed from other games).
// The server reads the list between the DATA markers (src/eggs.js); keep it plain JSON. Only ADD families at the end: saved creatures point at them by number.
(function (root) {
  const DATA = /*DATA*/{
    "elements": {
      "ember": { "name": "Ember", "icon": "🔥", "hue": 14, "beats": ["sprout", "frost"], "skills": ["Ember Spit", "Flame Dash", "Inferno Crown"] },
      "tide": { "name": "Tide", "icon": "💧", "hue": 205, "beats": ["ember", "stone"], "skills": ["Splash", "Tidal Slam", "Maelstrom"] },
      "sprout": { "name": "Sprout", "icon": "🌿", "hue": 125, "beats": ["tide", "stone"], "skills": ["Thorn Flick", "Root Snare", "Overgrowth"] },
      "spark": { "name": "Spark", "icon": "⚡", "hue": 50, "beats": ["tide", "gale"], "skills": ["Static Snap", "Bolt Rush", "Thunderhead"] },
      "stone": { "name": "Stone", "icon": "🪨", "hue": 30, "beats": ["spark", "ember"], "skills": ["Pebble Toss", "Rock Shell", "Landslide"] },
      "frost": { "name": "Frost", "icon": "❄️", "hue": 185, "beats": ["sprout", "gale"], "skills": ["Frost Nip", "Ice Wall", "Whiteout"] },
      "gale": { "name": "Gale", "icon": "🌪️", "hue": 165, "beats": ["sprout", "shade"], "skills": ["Gust", "Cyclone Kick", "Skybreaker"] },
      "shade": { "name": "Shade", "icon": "🌙", "hue": 275, "beats": ["spark", "frost"], "skills": ["Spook", "Night Veil", "Eclipse"] }
    },
    "families": [
      { "el": "ember", "kind": "drake", "rare": 2, "names": ["Cindlet", "Cindrake", "Cindragon"] },
      { "el": "ember", "kind": "pup", "rare": 0, "names": ["Sootpup", "Soothound", "Pyrehound"] },
      { "el": "ember", "kind": "bird", "rare": 0, "names": ["Flickit", "Flickwing", "Flamarch"] },
      { "el": "ember", "kind": "bug", "rare": 1, "names": ["Lavalet", "Lavamaul", "Lavadon"] },
      { "el": "ember", "kind": "ghost", "rare": 1, "names": ["Wicklet", "Wickern", "Lanternox"] },
      { "el": "tide", "kind": "blob", "rare": 0, "names": ["Dribblet", "Ripplo", "Tidalune"] },
      { "el": "tide", "kind": "fish", "rare": 0, "names": ["Finnip", "Finnade", "Finnarch"] },
      { "el": "tide", "kind": "shell", "rare": 1, "names": ["Clamby", "Clamor", "Clamossus"] },
      { "el": "tide", "kind": "pup", "rare": 1, "names": ["Puddlepup", "Brookhound", "Riverwolf"] },
      { "el": "tide", "kind": "drake", "rare": 3, "names": ["Bubbit", "Bubblair", "Bubblord"] },
      { "el": "sprout", "kind": "plant", "rare": 0, "names": ["Budlet", "Budling", "Bloomarch"] },
      { "el": "sprout", "kind": "shell", "rare": 0, "names": ["Mossling", "Mossback", "Mosstitan"] },
      { "el": "sprout", "kind": "bug", "rare": 1, "names": ["Twigit", "Branchor", "Timberon"] },
      { "el": "sprout", "kind": "bird", "rare": 1, "names": ["Petalo", "Petaline", "Petalune"] },
      { "el": "sprout", "kind": "blob", "rare": 2, "names": ["Shroomp", "Shroomble", "Shroomagus"] },
      { "el": "spark", "kind": "pup", "rare": 0, "names": ["Zapplet", "Zappix", "Zappstorm"] },
      { "el": "spark", "kind": "drake", "rare": 2, "names": ["Voltip", "Voltail", "Voltiger"] },
      { "el": "spark", "kind": "bug", "rare": 0, "names": ["Buzzbit", "Buzzwing", "Buzzstrike"] },
      { "el": "spark", "kind": "blob", "rare": 1, "names": ["Fuzzap", "Fuzzolt", "Fuzzthunder"] },
      { "el": "spark", "kind": "ghost", "rare": 1, "names": ["Glimbulb", "Glimbeam", "Glimstar"] },
      { "el": "stone", "kind": "rock", "rare": 0, "names": ["Pebblit", "Bouldit", "Monolite"] },
      { "el": "stone", "kind": "shell", "rare": 1, "names": ["Rubblet", "Rubblor", "Rubbletitan"] },
      { "el": "stone", "kind": "pup", "rare": 0, "names": ["Cobbit", "Cragbit", "Cragolith"] },
      { "el": "stone", "kind": "rock", "rare": 2, "names": ["Orelet", "Orechin", "Orelord"] },
      { "el": "stone", "kind": "bug", "rare": 1, "names": ["Dustmite", "Dunecrab", "Dunecolossus"] },
      { "el": "frost", "kind": "blob", "rare": 0, "names": ["Shiverlet", "Shiverlow", "Shiverarch"] },
      { "el": "frost", "kind": "pup", "rare": 0, "names": ["Snowpip", "Snowpaw", "Snowmane"] },
      { "el": "frost", "kind": "rock", "rare": 1, "names": ["Icicub", "Icibear", "Icibjorn"] },
      { "el": "frost", "kind": "bird", "rare": 1, "names": ["Frostit", "Frostowl", "Frostwise"] },
      { "el": "frost", "kind": "drake", "rare": 3, "names": ["Slushlet", "Slushlide", "Glaciride"] },
      { "el": "gale", "kind": "ghost", "rare": 0, "names": ["Breezit", "Gustle", "Galeon"] },
      { "el": "gale", "kind": "blob", "rare": 0, "names": ["Puffloat", "Puffcloud", "Pufftempest"] },
      { "el": "gale", "kind": "bug", "rare": 1, "names": ["Whirlet", "Whirlwing", "Whirlstorm"] },
      { "el": "gale", "kind": "drake", "rare": 2, "names": ["Kitelet", "Kiteray", "Kitedrake"] },
      { "el": "gale", "kind": "bird", "rare": 1, "names": ["Featherip", "Feathawk", "Featharch"] },
      { "el": "shade", "kind": "blob", "rare": 0, "names": ["Gloamlet", "Gloamkin", "Gloamlord"] },
      { "el": "shade", "kind": "pup", "rare": 1, "names": ["Shadepup", "Shadefang", "Shademaw"] },
      { "el": "shade", "kind": "ghost", "rare": 1, "names": ["Wisplet", "Wispern", "Wispwraith"] },
      { "el": "shade", "kind": "bird", "rare": 0, "names": ["Eeklet", "Eekwing", "Eekarch"] },
      { "el": "shade", "kind": "fish", "rare": 3, "names": ["Inkblot", "Inkmoor", "Inkraken"] }
    ],
    "rarities": ["Common", "Uncommon", "Rare", "Legendary"],
    "skillTiers": [{ "mult": 1.12, "chance": 0.35 }, { "mult": 1.22, "chance": 0.3 }, { "mult": 1.38, "chance": 0.25 }],
    "powers": [
      { "id": "claws", "name": "Sharp Claws", "icon": "🗡️", "lvl": 3, "text": "Hits 8% harder in every round." },
      { "id": "warm", "name": "Egg Warmer", "icon": "🔥", "lvl": 5, "text": "Your egg fills 25% faster." },
      { "id": "learner", "name": "Quick Learner", "icon": "📚", "lvl": 7, "text": "Earns 50% more XP." },
      { "id": "wind", "name": "Second Wind", "icon": "💨", "lvl": 10, "text": "Loses a round? 20% stronger in the next one." },
      { "id": "crowd", "name": "Crowd Favorite", "icon": "📣", "lvl": 12, "text": "10% better odds in the chat battle." },
      { "id": "skin", "name": "Thick Skin", "icon": "🛡️", "lvl": 15, "text": "The other creature's element edge doesn't work on you." },
      { "id": "master", "name": "Element Master", "icon": "🌀", "lvl": 18, "text": "Your own element edge is twice as big." },
      { "id": "showoff", "name": "Show-off", "icon": "✨", "lvl": 21, "text": "Uses its skills much more often." },
      { "id": "underdog", "name": "Underdog", "icon": "🐾", "lvl": 25, "text": "Up to 30% stronger against a higher-level creature." },
      { "id": "charm", "name": "Lucky Charm", "icon": "🍀", "lvl": 30, "text": "Never has a really unlucky round." },
      { "id": "finisher", "name": "Finisher", "icon": "🏁", "lvl": 35, "text": "20% stronger in a deciding third round." },
      { "id": "will", "name": "Iron Will", "icon": "👑", "lvl": 40, "text": "12% harder hits and can't have an unlucky first round." }
    ]
  }/*END*/;

  const EL = DATA.elements, FAM = DATA.families;
  /** creature number (1..120) ↔ family + stage. Number = family × 3 + stage + 1. */
  const info = n => { n = Math.round(Number(n)); if (!(n >= 1 && n <= FAM.length * 3)) return null; const f = Math.floor((n - 1) / 3), st = (n - 1) % 3, F = FAM[f]; return { n, fam: f, stage: st, name: F.names[st], el: F.el, elName: EL[F.el].name, icon: EL[F.el].icon, kind: F.kind, rare: F.rare, rareName: DATA.rarities[F.rare] }; };
  const numOf = (fam, stage) => fam * 3 + stage + 1;
  const list = () => Array.from({ length: FAM.length * 3 }, (_, i) => info(i + 1));

  // ---------- drawing (2D canvas): each family has a body kind, its element's colours and a few marks of its own ----------
  const rnd = seed => () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const hsl = (h, s, l, a) => `hsla(${((h % 360) + 360) % 360},${s}%,${l}%,${a == null ? 1 : a})`;
  function draw(g, n, cx, cy, size, opt) {
    const I = info(n); if (!I) return; opt = opt || {}; const r = rnd(I.fam * 7919 + 17), E = EL[I.el], hue = E.hue + (r() - .5) * 26, st = I.stage, dark = I.el === 'shade';
    const sat = I.el === 'stone' ? 22 + r() * 14 : 62 + r() * 18, L = dark ? 34 : I.el === 'frost' ? 74 : 56;
    const body = hsl(hue, sat, L), bodyD = hsl(hue, sat, L - 16), bodyL = hsl(hue, sat, Math.min(92, L + 20)), belly = hsl(hue + 18, sat * .7, Math.min(94, L + 28)), acc = hsl(hue + (r() < .5 ? 150 : 40), 80, 60), line = hsl(hue, sat, Math.max(8, L - 38));
    const k = size / 100 * (st === 0 ? .74 : st === 1 ? .9 : 1.04), t = opt.t || 0, bob = Math.sin(t * 2.2 + I.fam) * 2 * k;
    const marks = Math.floor(r() * 4), eyeKind = Math.floor(r() * 3), earKind = Math.floor(r() * 3), tailKind = Math.floor(r() * 3);
    g.save(); g.translate(cx, cy + bob); g.scale(k, k); g.lineJoin = g.lineCap = 'round'; g.lineWidth = 3; g.strokeStyle = line;
    const ell = (x, y, rx, ry, fill, rot) => { g.beginPath(); g.ellipse(x, y, rx, ry, rot || 0, 0, 7); if (fill) { g.fillStyle = fill; g.fill(); } g.stroke(); };
    const tri = (x1, y1, x2, y2, x3, y3, fill) => { g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.lineTo(x3, y3); g.closePath(); g.fillStyle = fill; g.fill(); g.stroke(); };
    const eyes = (x, y, gap, s) => { for (const d of [-1, 1]) { g.save(); g.lineWidth = 2; ell(x + d * gap, y, s, eyeKind === 1 ? s * 1.25 : s, '#fff'); g.fillStyle = '#16121f'; g.beginPath(); g.arc(x + d * gap + s * .15, y + s * .1, s * .58, 0, 7); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(x + d * gap + s * .38, y - s * .28, s * .22, 0, 7); g.fill(); if (st === 2 || eyeKind === 2) { g.beginPath(); g.moveTo(x + d * (gap - s * 1.1), y - s * 1.35); g.lineTo(x + d * (gap + s * .9), y - s * (st === 2 ? .75 : 1.2)); g.lineWidth = 3; g.stroke(); } g.restore(); } };
    const mouth = (x, y, w) => { g.save(); g.lineWidth = 2.5; g.beginPath(); g.arc(x, y, w, .15 * Math.PI, .85 * Math.PI); g.stroke(); if (st === 2) { tri(x - w * .55, y + w * .5, x - w * .3, y + w * 1.15, x - w * .05, y + w * .75, '#fff'); } g.restore(); };
    const aura = () => { if (st < 2) return; const gr = g.createRadialGradient(0, 0, 8, 0, 0, 62); gr.addColorStop(0, hsl(hue, 90, 70, .55)); gr.addColorStop(1, hsl(hue, 90, 60, 0)); g.save(); g.fillStyle = gr; g.beginPath(); g.arc(0, 0, 62, 0, 7); g.fill(); g.restore(); };
    const elMark = (x, y, s) => { // the element's own touch: a flame tuft, a drop, a leaf, a bolt, a crystal, a snowflake, a swirl, a moon
      g.save(); g.translate(x, y); g.scale(s, s); g.lineWidth = 2.2 / s; g.fillStyle = acc;
      if (I.el === 'ember') { g.fillStyle = hsl(34, 100, 58); g.beginPath(); g.moveTo(0, 8); g.quadraticCurveTo(-9, 0, -3, -8); g.quadraticCurveTo(-2, -2, 1, -14); g.quadraticCurveTo(10, -3, 5, 8); g.closePath(); g.fill(); g.stroke(); }
      else if (I.el === 'tide') { g.fillStyle = hsl(198, 90, 70); g.beginPath(); g.moveTo(0, -12); g.quadraticCurveTo(9, 2, 0, 8); g.quadraticCurveTo(-9, 2, 0, -12); g.fill(); g.stroke(); }
      else if (I.el === 'sprout') { g.fillStyle = hsl(110, 70, 48); g.beginPath(); g.moveTo(0, 8); g.quadraticCurveTo(-12, -2, 0, -13); g.quadraticCurveTo(12, -2, 0, 8); g.fill(); g.stroke(); g.beginPath(); g.moveTo(0, 8); g.lineTo(0, -8); g.stroke(); }
      else if (I.el === 'spark') { g.fillStyle = hsl(52, 100, 60); g.beginPath(); g.moveTo(3, -13); g.lineTo(-7, 1); g.lineTo(-1, 1); g.lineTo(-4, 12); g.lineTo(7, -3); g.lineTo(1, -3); g.closePath(); g.fill(); g.stroke(); }
      else if (I.el === 'stone') { g.fillStyle = hsl(hue + 160, 45, 66); g.beginPath(); g.moveTo(0, -12); g.lineTo(8, -2); g.lineTo(4, 10); g.lineTo(-5, 10); g.lineTo(-8, -3); g.closePath(); g.fill(); g.stroke(); }
      else if (I.el === 'frost') { g.strokeStyle = '#fff'; g.lineWidth = 3 / s; for (let i = 0; i < 3; i++) { g.rotate(Math.PI / 3); g.beginPath(); g.moveTo(-11, 0); g.lineTo(11, 0); g.stroke(); } }
      else if (I.el === 'gale') { g.strokeStyle = '#fff'; g.lineWidth = 3 / s; g.beginPath(); g.arc(0, 0, 9, .3, 5.2); g.stroke(); g.beginPath(); g.arc(1, 1, 4, 1, 6); g.stroke(); }
      else { g.fillStyle = hsl(50, 95, 78); g.beginPath(); g.arc(0, 0, 10, .6, 5.2); g.quadraticCurveTo(-2, 0, 8.3, 5.6); g.fill(); g.stroke(); }
      g.restore();
    };
    const spots = (x, y, rx, ry) => { g.save(); g.fillStyle = bodyD; for (let i = 0; i < marks + st; i++) { const a = r() * 6.3, d = r() * .7; g.beginPath(); g.arc(x + Math.cos(a) * rx * d, y + Math.sin(a) * ry * d, 2.5 + r() * 3, 0, 7); g.fill(); } g.restore(); };
    const horns = (x, y, w) => { if (st === 0) return; for (const d of [-1, 1]) tri(x + d * w, y, x + d * (w + (st === 2 ? 9 : 5)), y - (st === 2 ? 26 : 15), x + d * (w - 7), y - 3, bodyL); };
    const wings = (x, y, s) => { for (const d of [-1, 1]) { g.save(); g.translate(x + d * 4, y); g.scale(d * s, s); g.rotate(-.25 + Math.sin(t * 6) * .12); g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(26, -34, 46, -10); g.quadraticCurveTo(34, -6, 34, 6); g.quadraticCurveTo(22, 2, 20, 12); g.quadraticCurveTo(10, 6, 0, 8); g.closePath(); g.fillStyle = bodyL; g.fill(); g.stroke(); g.restore(); } };
    const crown = (x, y) => { if (st < 2) return; g.save(); g.fillStyle = hsl(46, 100, 60); g.beginPath(); g.moveTo(x - 13, y); g.lineTo(x - 13, y - 12); g.lineTo(x - 6, y - 5); g.lineTo(x, y - 15); g.lineTo(x + 6, y - 5); g.lineTo(x + 13, y - 12); g.lineTo(x + 13, y); g.closePath(); g.fill(); g.stroke(); g.restore(); };
    g.save(); g.fillStyle = 'rgba(0,0,0,.22)'; g.beginPath(); g.ellipse(0, 40 - bob / k, 30, 7, 0, 0, 7); g.fill(); g.restore();
    aura();
    const K = I.kind;
    if (K === 'blob') { if (st === 2) wings(0, -2, .8); g.beginPath(); g.moveTo(-32, 30); g.quadraticCurveTo(-40, -6, -18, -26); g.quadraticCurveTo(0, -40 - st * 5, 18, -26); g.quadraticCurveTo(40, -6, 32, 30); g.quadraticCurveTo(0, 42, -32, 30); g.fillStyle = body; g.fill(); g.stroke(); ell(0, 16, 19, 13, belly); spots(0, -8, 26, 14); eyes(0, -6, 11, 6.5); mouth(0, 4, 6); horns(0, -30, 13); elMark(0, -40 - st * 5, .9 + st * .2); crown(0, -34 - st * 5); if (st > 0) for (const d of [-1, 1]) ell(d * 36, 12, 7, 10, body, d * .4); }
    else if (K === 'pup') { for (const d of [-1, 1]) { ell(d * 17, 32, 8, 10, bodyD); } if (tailKind === 0) { g.beginPath(); g.moveTo(26, 16); g.quadraticCurveTo(52, 6, 44, -14 - st * 6); g.lineWidth = 9; g.strokeStyle = line; g.stroke(); g.lineWidth = 5; g.strokeStyle = body; g.stroke(); g.lineWidth = 3; g.strokeStyle = line; } else elMark(40, 6, 1.1 + st * .25); ell(2, 16, 30, 21, body); ell(2, 22, 17, 11, belly); spots(2, 12, 24, 12); ell(-10, -14, 24, 21, body); for (const d of [-1, 1]) { if (earKind === 0) tri(-10 + d * 15, -28, -10 + d * 26, -52 - st * 5, -10 + d * 3, -33, body); else ell(-10 + d * 21, -24, 8, 15 + st * 3, bodyD, d * .5); } eyes(-10, -16, 10, 6); ell(-10, -5, 4.5, 3.2, line); mouth(-10, -3, 6); if (tailKind !== 0) horns(-10, -32, 9); if (st === 2) { elMark(-10, -42, 1.1); for (const d of [-1, 1]) tri(d * 30 + 2, 6, d * 44 + 2, -4, d * 31 + 2, 18, bodyL); } crown(-10, -34); }
    else if (K === 'bird') { wings(0, 2, st === 0 ? .55 : st === 1 ? .85 : 1.1); ell(0, 12, 24, 26, body); ell(0, 20, 14, 15, belly); ell(0, -20, 19, 17, body); eyes(0, -22, 8.5, 5.5); tri(-6, -14, 6, -14, 0, -3 + st * 2, hsl(38, 100, 58)); for (const d of [-1, 1]) { g.beginPath(); g.moveTo(d * 9, 37); g.lineTo(d * 9, 44); g.moveTo(d * 4, 46); g.lineTo(d * 9, 44); g.lineTo(d * 14, 46); g.stroke(); } for (let i = -1; i <= 1; i++) if (st > 0 || i === 0) tri(i * 8 - 4, -34, i * 8, -48 - st * 6 - (i === 0 ? 5 : 0), i * 8 + 4, -34, i === 0 ? acc : bodyL); if (st === 2) { for (let i = -1; i <= 1; i++) tri(i * 9 - 5, 34, i * 13, 56, i * 9 + 5, 34, i === 0 ? acc : bodyD); } elMark(0, 14, .8 + st * .15); crown(0, -37 - st * 6); }
    else if (K === 'bug') { if (st > 0) wings(0, -8, st === 1 ? .7 : 1); for (let i = 0; i < 3; i++) for (const d of [-1, 1]) { g.beginPath(); g.moveTo(d * 16, 6 + i * 10); g.lineTo(d * (32 + st * 3), 2 + i * 13); g.lineTo(d * (36 + st * 3), 14 + i * 13); g.stroke(); } ell(0, 18, 24, 21, body); g.save(); g.strokeStyle = bodyD; for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(-20 + i * 2, 10 + i * 9); g.quadraticCurveTo(0, 16 + i * 9, 20 - i * 2, 10 + i * 9); g.stroke(); } g.restore(); ell(0, -14, 20, 17, body); eyes(0, -16, 9.5, 7); mouth(0, -5, 5); for (const d of [-1, 1]) { g.beginPath(); g.moveTo(d * 8, -29); g.quadraticCurveTo(d * 14, -48 - st * 5, d * 24, -46 - st * 6); g.stroke(); g.beginPath(); g.arc(d * 24, -46 - st * 6, 3.5, 0, 7); g.fillStyle = acc; g.fill(); g.stroke(); } if (st === 2) for (const d of [-1, 1]) tri(d * 14, -4, d * 34, -14, d * 22, 4, bodyL); elMark(0, 20, .85 + st * .15); crown(0, -30); }
    else if (K === 'ghost') { g.beginPath(); g.moveTo(-28, 34); g.quadraticCurveTo(-36, -30, 0, -36 - st * 4); g.quadraticCurveTo(36, -30, 28, 34); for (let i = 0; i < 4; i++) { const x0 = 28 - i * 14; g.quadraticCurveTo(x0 - 3.5, 22 + Math.sin(t * 4 + i) * 3, x0 - 7, 34); g.quadraticCurveTo(x0 - 10.5, 44, x0 - 14, 34); } g.closePath(); g.fillStyle = body; g.globalAlpha = .93; g.fill(); g.globalAlpha = 1; g.stroke(); ell(0, 12, 15, 11, belly); eyes(0, -10, 11, 7); g.save(); g.lineWidth = 2.5; g.beginPath(); g.ellipse(0, 6, 5, st === 2 ? 7 : 4, 0, 0, 7); g.fillStyle = line; g.fill(); g.restore(); for (const d of [-1, 1]) ell(d * 34, 4 + Math.sin(t * 3 + d) * 3, 7, 9 + st * 2, body, d * .5); elMark(0, -46 - st * 4, 1 + st * .25); horns(0, -30, 14); crown(0, -34 - st * 4); if (st === 2) for (const d of [-1, 1]) elMark(d * 44, -22, .7); }
    else if (K === 'fish') { g.save(); g.rotate(-.08); tri(26, 8, 52 + st * 6, -14 - st * 4, 50 + st * 6, 30 + st * 4, bodyD); ell(0, 8, 34, 24 + st * 2, body); ell(-4, 16, 22, 12, belly); spots(6, 2, 22, 12); tri(-6, -14, 8, -36 - st * 8, 18, -12, bodyL); tri(-2, 26, 8, 42 + st * 4, 14, 24, bodyL); g.restore(); eyes(-14, 0, 8, 6.5); mouth(-22, 12, 5); if (st > 0) for (let i = 0; i < 2 + st; i++) { g.beginPath(); g.moveTo(-6 + i * 9, 30); g.quadraticCurveTo(-10 + i * 9 + Math.sin(t * 3 + i) * 4, 44, -4 + i * 9, 52 + st * 4); g.lineWidth = 5; g.strokeStyle = line; g.stroke(); g.lineWidth = 2.5; g.strokeStyle = bodyL; g.stroke(); g.lineWidth = 3; g.strokeStyle = line; } elMark(4, -4, .8 + st * .15); crown(-10, -18); }
    else if (K === 'shell') { for (const d of [-1, 1]) ell(d * 22, 34, 9, 8, bodyD); ell(-26, 8, 15, 13, belly); eyes(-28, 4, 6, 5); mouth(-28, 13, 4.5); g.beginPath(); g.moveTo(-18, 30); g.quadraticCurveTo(-24, -24 - st * 6, 10, -30 - st * 6); g.quadraticCurveTo(42, -22, 36, 30); g.closePath(); g.fillStyle = body; g.fill(); g.stroke(); g.save(); g.strokeStyle = bodyD; for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(-10 + i * 12, 28); g.quadraticCurveTo(-6 + i * 12, -4, 8 + i * 4, -26 - st * 5); g.stroke(); } g.restore(); if (st > 0) for (let i = 0; i < 2 + st; i++) tri(-8 + i * 13, -22 - st * 4, -2 + i * 13, -40 - st * 7, 4 + i * 13, -22 - st * 4, bodyL); elMark(10, 4, .9 + st * .2); crown(-26, -8); }
    else if (K === 'plant') { ell(0, 30, 22, 12, hsl(28, 45, 40)); g.beginPath(); g.moveTo(0, 26); g.quadraticCurveTo(-6, 8, 0, -6); g.lineWidth = 9; g.stroke(); g.lineWidth = 5; g.strokeStyle = hsl(118, 55, 42); g.stroke(); g.lineWidth = 3; g.strokeStyle = line; for (const d of [-1, 1]) { g.save(); g.translate(d * 3, 14); g.rotate(d * (.9 + Math.sin(t * 2) * .08)); ell(0, -16, 8 + st * 2, 17 + st * 3, hsl(118, 60, 46)); g.restore(); } const pn = 5 + st * 2; for (let i = 0; i < pn; i++) { g.save(); g.translate(0, -16); g.rotate(i / pn * 6.283 + t * .2); ell(0, -19 - st * 3, 8 + st, 12 + st * 3, i % 2 ? body : bodyL); g.restore(); } ell(0, -16, 15 + st * 2, 15 + st * 2, belly); eyes(0, -18, 6.5, 4.8); mouth(0, -11, 4.5); crown(0, -34 - st * 4); if (st === 2) for (const d of [-1, 1]) elMark(d * 34, 20, .8); }
    else if (K === 'rock') { g.beginPath(); g.moveTo(-30, 34); g.lineTo(-36, 4); g.lineTo(-20, -24 - st * 4); g.lineTo(6, -34 - st * 6); g.lineTo(30, -18 - st * 3); g.lineTo(38, 10); g.lineTo(28, 34); g.closePath(); g.fillStyle = body; g.fill(); g.stroke(); g.save(); g.strokeStyle = bodyD; g.beginPath(); g.moveTo(-20, -24 - st * 4); g.lineTo(-6, -4); g.lineTo(6, -34 - st * 6); g.moveTo(-6, -4); g.lineTo(-12, 22); g.moveTo(-6, -4); g.lineTo(22, 4); g.stroke(); g.restore(); eyes(0, 2, 11, 6.5); mouth(0, 14, 7); for (const d of [-1, 1]) { ell(d * 40, 14, 9 + st * 2, 9 + st * 2, bodyD); } if (st > 0) for (let i = 0; i < st + 1; i++) tri(-16 + i * 16, -22 - st * 4, -10 + i * 16, -44 - st * 8, -2 + i * 16, -24 - st * 4, acc); elMark(18, -8, .8 + st * .15); crown(0, -36 - st * 6); }
    else { /* drake */ wings(4, -4, st === 0 ? .5 : st === 1 ? .9 : 1.25); g.beginPath(); g.moveTo(22, 22); g.quadraticCurveTo(54, 30, 52, 4 - st * 4); g.lineWidth = 11; g.stroke(); g.lineWidth = 6; g.strokeStyle = body; g.stroke(); g.lineWidth = 3; g.strokeStyle = line; elMark(52, -2 - st * 4, .8 + st * .2); for (const d of [-1, 1]) ell(d * 14 + 4, 34, 9, 9, bodyD); ell(4, 14, 26, 22, body); ell(2, 20, 15, 13, belly); g.save(); g.strokeStyle = bodyD; for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(-9, 13 + i * 6); g.lineTo(13, 13 + i * 6); g.stroke(); } g.restore(); ell(-12, -16, 21, 18, body); ell(-22, -9, 12, 9, body); eyes(-11, -19, 9, 5.8); g.save(); g.fillStyle = line; g.beginPath(); g.arc(-27, -11, 1.6, 0, 7); g.arc(-21, -12, 1.6, 0, 7); g.fill(); g.restore(); mouth(-22, -5, 6); for (const d of [-1, 1]) tri(-12 + d * 10, -30, -12 + d * (16 + st * 3), -48 - st * 8, -12 + d * 2, -33, bodyL); if (st > 0) for (let i = 0; i < 3 + st; i++) tri(6 + i * 8, -4 + i * 5, 14 + i * 8, -14 + i * 5 - st * 3, 16 + i * 8, 2 + i * 5, acc); crown(-12, -34); }
    g.restore();
  }
  /** A ready-made picture (data URL) of one creature, for <img>. Cached. */
  const pics = {};
  function pic(n, size) { size = size || 96; const key = n + ':' + size; if (pics[key]) return pics[key]; if (typeof document === 'undefined') return ''; const c = document.createElement('canvas'); c.width = c.height = size * 2; const g = c.getContext('2d'); g.scale(2, 2); draw(g, n, size / 2, size / 2 + size * .04, size * .82); return (pics[key] = c.toDataURL('image/png')); }
  /** The egg: a speckled egg in the colours of nothing in particular, cracking as it gets close (p = 0..1). */
  function egg(g, cx, cy, size, p, seed) {
    const r = rnd((seed || 1) * 31 + 5), hue = ((seed || 1) * 67 + 20) % 360, k = size / 100; g.save(); g.translate(cx, cy); g.scale(k, k); g.rotate(p > .85 ? Math.sin(Date.now() / 90) * .06 : 0); g.lineWidth = 3; g.strokeStyle = hsl(hue, 30, 22);
    g.fillStyle = 'rgba(0,0,0,.2)'; g.beginPath(); g.ellipse(0, 42, 26, 6, 0, 0, 7); g.fill();
    g.beginPath(); g.moveTo(0, -44); g.bezierCurveTo(30, -44, 36, 8, 30, 22); g.bezierCurveTo(24, 46, -24, 46, -30, 22); g.bezierCurveTo(-36, 8, -30, -44, 0, -44); g.fillStyle = hsl(hue, 55, 86); g.fill(); g.stroke();
    g.save(); g.clip(); g.fillStyle = hsl(hue + 40, 65, 62); for (let i = 0; i < 9; i++) { g.beginPath(); g.ellipse((r() - .5) * 56, (r() - .5) * 80, 4 + r() * 7, 3 + r() * 6, r() * 3, 0, 7); g.fill(); } g.restore();
    if (p > .5) { g.beginPath(); g.moveTo(-28, 2); const n2 = 3 + Math.floor((p - .5) * 10); for (let i = 1; i <= n2; i++) g.lineTo(-28 + i * (56 / n2), 2 + (i % 2 ? -9 : 7) * Math.min(1, (p - .4) * 2)); g.stroke(); }
    g.restore();
  }
  /** The skills a creature has: one per form it has reached (its element's 1st, 2nd, 3rd). Powers it could equip: by level; it holds stage + 1 of them. */
  const skillsOf = n => { const I = info(n); return I ? EL[I.el].skills.slice(0, I.stage + 1) : []; };
  const api = { DATA, EL, FAM, info, numOf, list, draw, pic, egg, skillsOf, POWERS: DATA.powers, COUNT: FAM.length * 3 };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.CREATURES = api;
})(typeof window !== 'undefined' ? window : globalThis);

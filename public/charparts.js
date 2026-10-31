// 🎨 Characters (Derek, 1.55.0): every part a character can have, and how to draw one. People pick their own with
// /character in Discord (a number for each part); everyone else gets a random look from the same parts (themed on
// themed maps). Used by the battle screen (game.html), the picture sheets Discord shows (public/chars/*.png, made
// from charsheet.html) and the Test tab. Numbers start at 1.
// The NAMES block is also read by the server (src/looks.js): keep it plain JSON, in the same order as the drawings.
// Once people have picked numbers, only ADD new parts at the end of a list (their numbers must keep meaning the same).
(() => {
  const NAMES = /*NAMES*/{
    "hair": ["Short", "Spiky", "Buzz cut", "Bald", "Side part", "Mohawk", "Afro", "Curly top", "Crew cut", "Slicked back", "Pompadour", "Quiff", "Faux hawk", "Curtains", "Comb over", "Flat top", "Frosted tips", "Undercut", "Man bun", "Mullet", "Bowl cut", "Locs", "Cornrows", "Messy", "Long rocker",
      "Long straight", "Ponytail", "Bun", "Pigtails", "Braids", "Bob", "Pixie cut", "Long wavy", "Long curly", "High ponytail", "Side ponytail", "Space buns", "Top knot", "Half-up", "Shag", "Afro puff", "Single braid", "Fishtail braid", "Crown braid", "Beehive", "Side-swept long", "Emo fringe", "Wolf cut", "Curly bob", "Box braids"],
    "outfit": ["T-shirt", "Shirt and tie", "Hoodie", "Suit", "Sports jersey", "Overalls", "Tank top", "Leather jacket", "Lab coat", "Tuxedo", "Polo shirt", "Flannel shirt", "Denim jacket", "Varsity jacket", "Puffer jacket", "Trench coat", "Biker vest", "Hawaiian shirt", "Cowboy vest", "Chef jacket", "Firefighter coat", "Safety vest", "Scrubs", "Mechanic coveralls", "Sweater vest",
      "Dress", "Ball gown", "Sundress", "Blouse and skirt", "Cardigan", "Crop top", "Sweater dress", "Jumpsuit", "Wrap dress", "Polka dot dress", "Little black dress", "Pinafore", "Peasant blouse", "Cheer uniform", "Tutu", "Blazer and skirt", "Maxi dress", "Striped dress", "Sequin dress", "Denim skirt", "Floral dress", "Off-shoulder top", "Turtleneck", "Princess dress", "Witch dress",
      "Wizard robe", "Knight armor", "Superhero suit", "Astronaut suit", "Soldier uniform", "Wrestling singlet", "Pirate coat", "Ninja outfit", "Robot suit", "Roman toga", "Vampire cloak", "Mummy wraps", "Skeleton costume", "Pumpkin costume", "Elf outfit", "Santa suit", "Holiday sweater", "Pilgrim outfit", "Bunny onesie", "Hazmat suit", "Zombie survivor", "Ski jacket", "Safari outfit", "Peasant tunic", "Dino onesie"],
    "makeup": ["None", "Rosy cheeks", "Red lipstick", "Eyeliner", "Blue eyeshadow", "Freckles", "Glitter", "Face paint stripes", "Heart cheeks", "Clown nose", "Pink lipstick", "Purple lipstick", "Black lipstick", "Pink eyeshadow", "Gold eyeshadow", "Smoky eyes", "Rainbow eyeshadow", "Winged liner + red lips", "Star cheeks", "Beauty mark", "Cat whiskers", "Butterfly face paint", "Forehead gem", "Bronze glow", "Skeleton face paint"],
    "facialhair": ["None", "Stubble", "Mustache", "Handlebar mustache", "Goatee", "Soul patch", "Short beard", "Full beard", "Long beard", "Mutton chops", "Pencil mustache", "Walrus mustache", "Horseshoe mustache", "Van Dyke", "Chin strap", "Chin curtain", "Anchor beard", "Braided beard", "Forked beard", "Wizard beard", "Circle beard", "Box beard", "Droopy mustache", "Curled mustache", "Sideburns"],
    "body": ["Flat", "Curvy · size 2", "Curvy · size 1 (smallest)", "Curvy · size 3", "Curvy · size 4", "Curvy · size 5 (biggest)", "Thin · Flat", "Thin · Curvy · size 2", "Thin · Curvy · size 1 (smallest)", "Thin · Curvy · size 3", "Thin · Curvy · size 4", "Thin · Curvy · size 5 (biggest)", "Fat · Flat", "Fat · Curvy · size 2", "Fat · Curvy · size 1 (smallest)", "Fat · Curvy · size 3", "Fat · Curvy · size 4", "Fat · Curvy · size 5 (biggest)", "Athletic · Flat", "Athletic · Curvy · size 2", "Athletic · Curvy · size 1 (smallest)", "Athletic · Curvy · size 3", "Athletic · Curvy · size 4", "Athletic · Curvy · size 5 (biggest)"],
    "skin": ["Porcelain", "Light", "Fair", "Medium", "Olive", "Tan", "Brown", "Deep"],
    "haircolor": ["Black", "Dark brown", "Brown", "Blonde", "Ginger", "Gray", "White", "Blue", "Pink", "Green"],
    "accessory": ["None", "Headband", "Bow", "Flower", "Hair clip", "Bandana", "Sweatband", "Shades on top", "Headphones", "Cat ears", "Bunny ears", "Devil horns", "Halo", "Crown", "Tiara", "Feather", "Baseball cap", "Backwards cap", "Beanie", "Pom-pom beanie", "Cowboy hat", "Top hat", "Bowler hat", "Fedora", "Party hat", "Wizard hat", "Witch hat", "Santa hat", "Pirate hat", "Chef hat", "Hard hat", "Graduation cap", "Viking helmet", "Propeller cap", "Beret", "Bucket hat", "Visor", "Flower crown", "Antlers", "Unicorn horn", "Alien antennae", "Bee antennae", "Mouse ears", "Bear ears", "Fox ears", "Glasses", "Sunglasses", "Star glasses", "Eye patch", "Monocle", "Goggles"],
    "hairaccessory": ["None", "Headband", "Wide headband", "Top bow", "Side bow", "Big back bow", "Hibiscus flower", "Two daisies", "Pearl clip", "Two barrettes", "Butterfly clips", "Star clips", "Heart clips", "Top scrunchie", "Pigtail bobbles", "Hair ties", "Rolled bandana", "Pearl headband", "Hair beads", "Feather clip", "Ribbon", "Bobby pins", "Hair sticks", "Jeweled comb", "Daisy chain", "Cherry clip", "Hair gems", "Leaf clip", "Snowflake clip", "Rainbow clip", "Braided headband"]
  }/*END*/;
  // 🔢 20 versions of every part except the body (1.59.0, Derek). Number n of a part with N base parts = base ((n−1) % N) + 1,
  // version floor((n−1) / N) (0 = the original). So hair 51–100 are all 50 hair styles "Flipped", 101–150 "Big", and so on.
  // Skin and hair colors: each version is a family of colors. This block is read by the server too (src/looks.js): plain JSON.
  const VARS = /*VARS*/{
    "hair": ["Flipped", "Big", "Highlights", "Tall", "Wide", "Slim", "Ombre", "Two-tone", "Frosted tips", "Dyed tips", "Skunk stripe", "Rainbow streaks", "Glitter", "Wet look", "Messy", "Wavy", "Curly", "Shaved side", "Neon streak"],
    "outfit": ["Striped", "Pinstripe", "Polka dot", "Plaid", "Camo", "Stars", "Hearts", "Flames", "Zigzag", "Checkered", "Diamonds", "Sparkle", "Lightning", "Sash", "Two-tone", "Gold", "Midnight", "Pastel", "Neon"],
    "makeup": ["Glitter", "Freckles", "Blush", "Beauty mark", "Gold glow", "Tear drop", "Star", "Heart", "Lashes", "Bandage", "Scar", "War paint", "Sunburn", "Dimples", "Rhinestones", "Nose ring", "Eyebrow ring", "Cheek gem", "Sparkle eyes"],
    "facialhair": ["Gray", "Salt & pepper", "White", "Ginger", "Blond", "Black", "Blue", "Pink", "Green", "Purple", "Neon", "Frosted", "Bushy", "Trimmed", "Beaded", "Twirled", "Glitter", "Flowers", "Braided tip"],
    "skin": ["Warm", "Rosy", "Golden", "Olive", "Ashy", "Sun-kissed", "Pale", "Rich", "Mint", "Sky", "Lavender", "Ruby", "Zombie", "Alien", "Ocean", "Gold", "Silver", "Stone", "Ghost"],
    "haircolor": ["Light", "Dark", "Warm", "Cool", "Ash", "Golden", "Copper", "Rose", "Smoky", "Pastel", "Neon", "Faded", "Sunlit", "Midnight", "Cherry", "Mint", "Lilac", "Ocean", "Sunset"]
  }/*VEND*/;
  const BASE = NAMES; // (the original parts; NAMES below = every number, versions included)
  const vname = (k, b, base, tag) => k === 'skin' || k === 'haircolor' ? `${tag} ${base}` : k === 'makeup' && b === 1 ? tag : k === 'facialhair' && b === 1 ? `Shadow · ${tag}` : `${base} · ${tag}`; // (same in src/looks.js)
  const ALLN = Object.fromEntries(Object.entries(BASE).map(([k, list]) => [k, VARS[k] ? [...list, ...VARS[k].flatMap(tag => list.map((x, i) => vname(k, i + 1, x, tag)))] : list.slice()]));
  const sp = (k, n) => { const N0 = BASE[k].length, i = Math.max(0, (Number(n) || 1) - 1); return [i % N0 + 1, Math.floor(i / N0)]; }; // number → [base, version]
  // groups people see on the picture sheets (anyone can pick anything)
  const GROUPS = { hair: [[1, 25, "men's styles"], [26, 50, "women's styles"]], outfit: [[1, 25, "men's"], [26, 50, "women's"], [51, 75, 'costumes (anyone)']] };
  const SKIN = ['#fbe3d0', '#f6d7b8', '#eac39a', '#d6a37a', '#c4956a', '#b07a52', '#8a5a3a', '#5e3a24'];
  const HAIRC = ['#1a1210', '#3a2414', '#6a3e1e', '#e0c070', '#b8501e', '#8a8a8a', '#ecebe6', '#3a6ad8', '#e05aa8', '#3aa85a'];
  const PI = Math.PI;
  const shade = (hex, amt) => { const n = parseInt(String(hex).replace('#', '').slice(0, 6).padEnd(6, '8'), 16), c = v => Math.max(0, Math.min(255, v + amt)); return `rgb(${c(n >> 16)},${c((n >> 8) & 255)},${c(n & 255)})`; };
  const pick = (k, n) => Math.max(1, Math.min(ALLN[k].length, Math.round(Number(n) || 1)));

  // ---------- drawing helpers (head: x, y = centre, r = head radius) ----------
  const E = (g, x, y, rx, ry, rot = 0) => { g.beginPath(); g.ellipse(x, y, Math.max(.1, rx), Math.max(.1, ry), rot, 0, 7); g.fill(); };
  const C = (g, x, y, r) => E(g, x, y, r, r);
  const poly = (g, ...p) => { g.beginPath(); for (let i = 0; i < p.length; i += 2) g[i ? 'lineTo' : 'moveTo'](p[i], p[i + 1]); g.closePath(); g.fill(); };
  const line = (g, col, w, ...p) => { g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); for (let i = 0; i < p.length; i += 2) g[i ? 'lineTo' : 'moveTo'](p[i], p[i + 1]); g.stroke(); };
  const keep = (g, fn) => { const f = g.fillStyle; fn(); g.fillStyle = f; };

  // ---------- 💇 hair: { b: behind the head, f: in front } — (g, x, y, r, c) with fillStyle = the hair colour ----------
  const cap = (g, x, y, r, top = .62, low = .25) => { g.beginPath(); g.arc(x, y, r * 1.04, PI * 1.06, PI * 1.94); g.quadraticCurveTo(x, y - r * top, x - r, y - r * low); g.fill(); };
  const bangs = (g, x, y, r, low = .3) => { g.beginPath(); g.arc(x, y, r * 1.05, PI * 1.02, PI * 1.98); g.lineTo(x + r * .95, y - r * low); g.lineTo(x - r * .95, y - r * low); g.fill(); };
  const sweep = (g, x, y, r, s = 1) => { g.save(); g.translate(x, 0); g.scale(s, 1); g.beginPath(); g.arc(0, y, r * 1.06, PI * 1.05, PI * 1.95); g.quadraticCurveTo(r * .3, y - r * .5, 0, y - r * .62); g.quadraticCurveTo(-r * .4, y - r * .45, -r * 1.02, y - r * .2); g.fill(); g.restore(); };
  const spikes = (g, x, y, r, n, len, w = .12, base = .85, sp = .24) => { for (let i = -(n - 1) / 2; i <= (n - 1) / 2; i++) poly(g, x + i * r * sp - r * w, y - r * base + Math.abs(i) * r * .06, x + i * r * sp * 1.1, y - r * (base + len) + Math.abs(i) * r * .1, x + i * r * sp + r * w, y - r * base + Math.abs(i) * r * .06); };
  const ring = (g, x, y, r, a0, a1, n, rad, d = .98) => { for (let i = 0; i < n; i++) { const a = PI * (a0 + (a1 - a0) * i / Math.max(1, n - 1)); C(g, x + Math.cos(a) * r * d, y + Math.sin(a) * r * d, r * rad); } };
  const braid = (g, c, x0, y0, x1, y1, n, rad) => { g.strokeStyle = shade(c, -45); g.lineWidth = rad * .22; for (let i = 0; i < n; i++) { const t = i / Math.max(1, n - 1), bx = x0 + (x1 - x0) * t, by = y0 + (y1 - y0) * t; g.beginPath(); g.ellipse(bx, by, rad, rad * .72, i % 2 ? .5 : -.5, 0, 7); g.fill(); g.stroke(); } };
  const longBack = (g, x, y, r, w = 1.16, len = 1.4) => E(g, x, y + r * .55, r * w, r * len);
  const jag = (g, x, y, r, y0, n, w, d) => { for (let i = 0; i < n; i++) { const xx = x + (i - (n - 1) / 2) * r * w; poly(g, xx - r * w * .55, y + r * y0, xx, y + r * (y0 + d), xx + r * w * .55, y + r * y0); } };
  const HAIR = [
    // men's styles (1–25)
    { f: (g, x, y, r) => cap(g, x, y, r) },
    { f: (g, x, y, r) => { cap(g, x, y, r); spikes(g, x, y, r, 5, .5); } },
    { f: (g, x, y, r) => { g.globalAlpha *= .55; cap(g, x, y, r, .8, .2); g.globalAlpha /= .55; } },
    { f: (g, x, y, r) => { keep(g, () => { g.fillStyle = 'rgba(255,255,255,.28)'; E(g, x - r * .3, y - r * .66, r * .26, r * .12, -.4); }); } },
    { f: (g, x, y, r) => { cap(g, x, y, r); g.beginPath(); g.moveTo(x - r * .9, y - r * .5); g.quadraticCurveTo(x - r * .2, y - r * 1.3, x + r * 1.0, y - r * .55); g.quadraticCurveTo(x + r * .1, y - r * .75, x - r * .9, y - r * .5); g.fill(); } },
    { f: (g, x, y, r) => { g.globalAlpha *= .3; cap(g, x, y, r, .8, .2); g.globalAlpha /= .3; for (let i = -3; i <= 3; i++) poly(g, x - r * .14, y - r * .9 + Math.abs(i) * r * .2, x + i * r * .1, y - r * 1.5 + Math.abs(i) * r * .12, x + r * .14, y - r * .9 + Math.abs(i) * r * .2); } },
    { b: (g, x, y, r) => C(g, x, y - r * .25, r * 1.45), f: (g, x, y, r) => { g.beginPath(); g.arc(x, y - r * .6, r * .95, PI * .95, PI * 2.05); g.fill(); } },
    { f: (g, x, y, r) => ring(g, x, y, r, 1.05, 1.95, 9, .26) },
    { f: (g, x, y, r) => { cap(g, x, y, r, .72, .3); E(g, x, y - r * .84, r * .62, r * .2); } },
    { f: (g, x, y, r, c) => { cap(g, x, y, r, .45, .35); for (let i = -2; i <= 2; i++) line(g, shade(c, 45), r * .05, x + i * r * .2, y - r * .58, x + i * r * .26, y - r * .98); } },
    { f: (g, x, y, r, c) => { cap(g, x, y, r, .6, .3); E(g, x - r * .05, y - r * .98, r * .78, r * .36, -.12); line(g, shade(c, 50), r * .05, x - r * .45, y - r * 1.05, x + r * .2, y - r * 1.2); } },
    { f: (g, x, y, r) => { cap(g, x, y, r); g.beginPath(); g.moveTo(x - r * .7, y - r * .65); g.quadraticCurveTo(x - r * .3, y - r * 1.55, x + r * .75, y - r * 1.25); g.quadraticCurveTo(x + r * .35, y - r * .95, x + r * .8, y - r * .6); g.closePath(); g.fill(); } },
    { f: (g, x, y, r) => { cap(g, x, y, r, .7); spikes(g, x, y, r, 3, .4, .13, .88, .2); } },
    { f: (g, x, y, r, c) => { cap(g, x, y, r, .5, .35); for (const s of [-1, 1]) E(g, x + s * r * .48, y - r * .55, r * .55, r * .3, s * .55); line(g, shade(c, -35), r * .04, x, y - r * 1.0, x, y - r * .78); } },
    { f: (g, x, y, r, c) => { cap(g, x, y, r, .5, .3); for (let i = 0; i < 4; i++) line(g, shade(c, 35), r * .045, x - r * .72, y - r * (.6 + i * .12), x + r * .8, y - r * (.76 + i * .1)); } },
    { f: (g, x, y, r) => { cap(g, x, y, r, .6, .25); g.fillRect(x - r * .82, y - r * 1.32, r * 1.64, r * .56); } },
    { f: (g, x, y, r) => { cap(g, x, y, r); spikes(g, x, y, r, 5, .5); keep(g, () => { g.fillStyle = '#f6e7a0'; for (let i = -2; i <= 2; i++) { const tx = x + i * r * .24 * 1.1, tyy = y - r * 1.35 + Math.abs(i) * r * .1; poly(g, tx - r * .06, tyy + r * .2, tx, tyy, tx + r * .06, tyy + r * .2); } }); } },
    { f: (g, x, y, r) => { g.globalAlpha *= .35; cap(g, x, y, r, .8, .2); g.globalAlpha /= .35; E(g, x + r * .12, y - r * .88, r * .78, r * .3, .15); } },
    { b: (g, x, y, r) => C(g, x, y - r * 1.1, r * .3), f: (g, x, y, r) => cap(g, x, y, r, .5, .3) },
    { b: (g, x, y, r) => E(g, x, y + r * .55, r * 1.02, r * .8), f: (g, x, y, r) => cap(g, x, y, r, .6, .25) },
    { f: (g, x, y, r) => bangs(g, x, y, r, .28) },
    { b: (g, x, y, r) => { for (let i = -4; i <= 4; i++) E(g, x + i * r * .24, y + r * .35, r * .11, r * .85); }, f: (g, x, y, r) => { cap(g, x, y, r, .6, .28); for (let i = -3; i <= 3; i++) E(g, x + i * r * .27, y - r * .78 + Math.abs(i) * r * .04, r * .11, r * .28); } },
    { f: (g, x, y, r, c) => { cap(g, x, y, r, .55, .3); for (let i = -2; i <= 2; i++) line(g, shade(c, 40), r * .05, x + i * r * .22, y - r * .5, x + i * r * .17, y - r * 1.0); } },
    { f: (g, x, y, r) => { cap(g, x, y, r, .6); for (let i = 0; i < 7; i++) { const a = PI * (1.1 + i * .13), L = .3 + (i % 3) * .12; poly(g, x + Math.cos(a - .1) * r * .95, y + Math.sin(a - .1) * r * .95, x + Math.cos(a + .05) * r * (1 + L), y + Math.sin(a + .05) * r * (1 + L), x + Math.cos(a + .1) * r * .95, y + Math.sin(a + .1) * r * .95); } } },
    { b: (g, x, y, r) => E(g, x, y + r * .6, r * 1.2, r * 1.25), f: (g, x, y, r) => { cap(g, x, y, r, .5, .3); for (const s of [-1, 1]) E(g, x + s * r * .55, y - r * .45, r * .45, r * .3, s * .7); } },
    // women's styles (26–50)
    { b: (g, x, y, r) => longBack(g, x, y, r), f: (g, x, y, r) => cap(g, x, y, r, .55) },
    { b: (g, x, y, r) => E(g, x + r * 1.1, y + r * .25, r * .3, r * .78, -.35), f: (g, x, y, r) => cap(g, x, y, r) },
    { b: (g, x, y, r) => C(g, x, y - r * 1.12, r * .44), f: (g, x, y, r) => cap(g, x, y, r) },
    { b: (g, x, y, r) => { for (const s of [-1, 1]) E(g, x + s * r * 1.12, y + r * .35, r * .3, r * .7, s * .3); }, f: (g, x, y, r) => cap(g, x, y, r) },
    { b: (g, x, y, r) => { for (const s of [-1, 1]) for (let i = 0; i < 5; i++) C(g, x + s * r * (.92 - i * .02), y + r * (.1 + i * .36), r * .2); }, f: (g, x, y, r) => cap(g, x, y, r) },
    { b: (g, x, y, r) => E(g, x, y + r * .15, r * 1.2, r * 1.05), f: (g, x, y, r) => bangs(g, x, y, r, .3) },
    { f: (g, x, y, r) => { cap(g, x, y, r, .6, .3); E(g, x - r * .35, y - r * .62, r * .65, r * .28, -.35); } },
    { b: (g, x, y, r) => { E(g, x, y + r * .5, r * 1.05, r * 1.3); for (const s of [-1, 1]) for (let i = 0; i < 6; i++) C(g, x + s * r * (1.0 + .1 * (i % 2)), y + r * (-.1 + i * .34), r * .28); }, f: (g, x, y, r) => sweep(g, x, y, r) },
    { b: (g, x, y, r) => { E(g, x, y + r * .5, r * 1.0, r * 1.25); for (const s of [-1, 1]) for (let i = 0; i < 6; i++) C(g, x + s * r * (.92 + .16 * (i % 2)), y + r * (-.3 + i * .32), r * .34); }, f: (g, x, y, r) => ring(g, x, y, r, 1.05, 1.95, 9, .22) },
    { b: (g, x, y, r) => { C(g, x, y - r * 1.08, r * .2); E(g, x + r * .55, y - r * .62, r * .28, r * .72, .6); }, f: (g, x, y, r) => cap(g, x, y, r, .6, .3) },
    { b: (g, x, y, r) => E(g, x - r * 1.18, y + r * .35, r * .34, r * .8, .3), f: (g, x, y, r) => sweep(g, x, y, r, -1) },
    { b: (g, x, y, r) => { for (const s of [-1, 1]) C(g, x + s * r * .72, y - r * .92, r * .36); }, f: (g, x, y, r) => cap(g, x, y, r) },
    { b: (g, x, y, r) => C(g, x, y - r * 1.28, r * .42), f: (g, x, y, r) => cap(g, x, y, r, .5, .3) },
    { b: (g, x, y, r) => { longBack(g, x, y, r); C(g, x, y - r * 1.02, r * .24); }, f: (g, x, y, r) => cap(g, x, y, r) },
    { b: (g, x, y, r) => { E(g, x, y + r * .2, r * 1.2, r * 1.0); jag(g, x, y, r, 1.05, 7, .3, .4); }, f: (g, x, y, r) => { cap(g, x, y, r, .5, .3); for (let i = -2; i <= 2; i++) poly(g, x + i * r * .3 - r * .18, y - r * .72, x + i * r * .3, y - r * .38, x + i * r * .3 + r * .18, y - r * .72); } },
    { b: (g, x, y, r) => C(g, x, y - r * 1.15, r * .62), f: (g, x, y, r) => cap(g, x, y, r, .65, .25) },
    { b: (g, x, y, r) => E(g, x, y + r * .2, r * 1.1, r * .95), f: (g, x, y, r, c) => { cap(g, x, y, r, .55); braid(g, c, x + r * .78, y + r * .45, x + r * .7, y + r * 1.9, 7, r * .19); } },
    { b: (g, x, y, r) => E(g, x, y + r * .2, r * 1.08, r * .9), f: (g, x, y, r, c) => { cap(g, x, y, r, .55); braid(g, c, x - r * .95, y + r * .3, x - r * .72, y + r * 1.75, 8, r * .16); } },
    { f: (g, x, y, r, c) => { cap(g, x, y, r, .55, .3); g.strokeStyle = shade(c, -45); g.lineWidth = r * .03; for (let i = 0; i < 9; i++) { const a = PI * (1.08 + i * .105); g.beginPath(); g.ellipse(x + Math.cos(a) * r * 1.02, y + Math.sin(a) * r * 1.02, r * .16, r * .11, a + PI / 2, 0, 7); g.fill(); g.stroke(); } } },
    { b: (g, x, y, r) => E(g, x, y - r * .95, r * .82, r * .85), f: (g, x, y, r) => cap(g, x, y, r, .55, .3) },
    { b: (g, x, y, r) => longBack(g, x, y, r, 1.18, 1.45), f: (g, x, y, r) => sweep(g, x, y, r) },
    { b: (g, x, y, r) => E(g, x, y + r * .2, r * 1.12, r * 1.0), f: (g, x, y, r) => { g.beginPath(); g.arc(x, y, r * 1.06, PI * 1.0, PI * 1.96); g.lineTo(x + r * .5, y - r * .45); g.quadraticCurveTo(x - r * .05, y - r * .4, x - r * .45, y + r * .08); g.lineTo(x - r * 1.0, y + r * .12); g.closePath(); g.fill(); } },
    { b: (g, x, y, r) => { E(g, x, y + r * .3, r * 1.15, r * .95); jag(g, x, y, r, 1.1, 6, .34, .35); }, f: (g, x, y, r) => { cap(g, x, y, r, .55, .3); for (const s of [-1, 1]) E(g, x + s * r * .5, y - r * .5, r * .5, r * .28, s * .6); spikes(g, x, y, r, 3, .25, .14, .92, .26); } },
    { b: (g, x, y, r) => ring(g, x, y, r, -.1, 1.1, 10, .3, 1.02), f: (g, x, y, r) => ring(g, x, y, r, 1.05, 1.95, 8, .24) },
    { b: (g, x, y, r) => { for (let i = -5; i <= 5; i++) E(g, x + i * r * .2, y + r * .55, r * .075, r * 1.05); }, f: (g, x, y, r, c) => { cap(g, x, y, r, .55, .3); for (let i = -2; i <= 2; i++) line(g, shade(c, -35), r * .03, x + i * r * .2, y - r * .55, x + i * r * .22, y - r * 1.0); } }
  ];

  // ---------- 👕 outfits ----------
  // shapes (torso from ty to by): the outline every outfit is filled + clipped to
  const torso = (g, m, ty, by, rr, w1, w2) => { g.beginPath(); g.moveTo(m - rr * w1, ty + rr * .08); g.quadraticCurveTo(m - rr * w1, ty, m - rr * (w1 - .14), ty); g.lineTo(m + rr * (w1 - .14), ty); g.quadraticCurveTo(m + rr * w1, ty, m + rr * w1, ty + rr * .08); g.lineTo(m + rr * w2, by); g.lineTo(m - rr * w2, by); g.closePath(); };
  const skirt = (g, m, ty, by, rr, w2) => { g.beginPath(); g.moveTo(m - rr * .34, ty); g.lineTo(m + rr * .34, ty); g.lineTo(m + rr * w2, by + rr * .1); g.lineTo(m - rr * w2, by + rr * .1); g.closePath(); };
  const SH = {
    shirt: (g, m, ty, by, rr) => torso(g, m, ty, by, rr, .52, .44),
    wide: (g, m, ty, by, rr) => torso(g, m, ty, by, rr, .56, .47),
    slim: (g, m, ty, by, rr) => torso(g, m, ty, by, rr, .48, .42),
    long: (g, m, ty, by, rr) => torso(g, m, ty, by + rr * .14, rr, .53, .5),
    tank: (g, m, ty, by, rr) => { g.beginPath(); g.moveTo(m - rr * .32, ty); g.lineTo(m - rr * .2, ty); g.quadraticCurveTo(m, ty + rr * .2, m + rr * .2, ty); g.lineTo(m + rr * .32, ty); g.lineTo(m + rr * .4, by); g.lineTo(m - rr * .4, by); g.closePath(); },
    dress: (g, m, ty, by, rr) => skirt(g, m, ty, by, rr, .62),
    fit: (g, m, ty, by, rr) => { g.beginPath(); g.moveTo(m - rr * .36, ty); g.lineTo(m + rr * .36, ty); g.lineTo(m + rr * .3, ty + rr * .38); g.lineTo(m + rr * .62, by + rr * .1); g.lineTo(m - rr * .62, by + rr * .1); g.lineTo(m - rr * .3, ty + rr * .38); g.closePath(); },
    gown: (g, m, ty, by, rr) => { g.beginPath(); g.moveTo(m - rr * .3, ty); g.lineTo(m + rr * .3, ty); g.quadraticCurveTo(m + rr * .3, ty + rr * .35, m + rr * .82, by + rr * .32); g.lineTo(m - rr * .82, by + rr * .32); g.quadraticCurveTo(m - rr * .3, ty + rr * .35, m - rr * .3, ty); g.closePath(); },
    robe: (g, m, ty, by, rr) => skirt(g, m, ty, by + rr * .12, rr, .58),
    round: (g, m, ty, by, rr) => { g.beginPath(); g.ellipse(m, (ty + by) / 2 + rr * .04, rr * .6, (by - ty) / 2 + rr * .08, 0, 0, 7); }
  };
  // Q = a little toolbox in torso units: x from the middle (−.55 … .55), y from the top of the torso (0 … ~.73)
  function Q(g, m, ty, by, rr, c, skin) {
    const X = v => m + v * rr, Y = v => ty + v * rr;
    const q = { g, c, skin, rr, X, Y, H: (by - ty) / rr, dk: shade(c, -45), lt: shade(c, 45),
      R: (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(X(x), Y(y), w * rr, h * rr); },
      E: (x, y, rx, ry, col, rot = 0) => { g.fillStyle = col; E(g, X(x), Y(y), rx * rr, ry * rr, rot); },
      P: (col, ...p) => { g.fillStyle = col; poly(g, ...p.map((v, i) => i % 2 ? Y(v) : X(v))); },
      L: (col, w, ...p) => line(g, col, w * rr, ...p.map((v, i) => i % 2 ? Y(v) : X(v))),
      S: (x, y, s, col) => { g.fillStyle = col; g.beginPath(); for (let k = 0; k < 10; k++) { const a = k * PI / 5 - PI / 2, rad = (k % 2 ? s * .45 : s) * rr; g.lineTo(X(x) + Math.cos(a) * rad, Y(y) + Math.sin(a) * rad); } g.closePath(); g.fill(); },
      btn: (x, y0, y1, n, col) => { for (let i = 0; i < n; i++) q.E(x, y0 + (y1 - y0) * i / Math.max(1, n - 1), .028, .028, col); },
      hs: (col, n, w) => { for (let i = 0; i < n; i++) q.R(-.7, (i + .5) * (q.H + .1) / n - w / 2, 1.4, w, col); },
      dots: (col, step, rad) => { let k = 0; for (let y = .06; y < q.H + .12; y += step) { for (let x = -.6 + (k % 2) * step / 2; x < .62; x += step) q.E(x, y, rad, rad, col); k++; } },
      flowers: (c1, c2, list) => { for (const [x, y] of list) { for (let k = 0; k < 5; k++) { const a = k * PI * .4; q.E(x + Math.cos(a) * .045, y + Math.sin(a) * .045, .035, .035, c1); } q.E(x, y, .025, .025, c2); } },
      vest: (col, edge = .13) => { for (const s of [-1, 1]) q.P(col, s * .62, 0, s * edge, 0, s * (edge - .04), q.H + .1, s * .62, q.H + .1); },
      flaps: col => { for (const s of [-1, 1]) q.P(col, s * .16, 0, s * .02, 0, s * .07, .11, s * .18, .08); },
      belt: (y, col, buckle) => { q.R(-.7, y, 1.4, .07, col); if (buckle) { q.R(-.07, y - .015, .14, .1, buckle); q.R(-.035, y + .012, .07, .045, col); } },
      zip: col => q.L(col, .022, 0, .02, 0, q.H + .05)
    };
    return q;
  }
  // { s: shape, f: fill (none = the player's colour), d: decoration (clipped to the outfit), t: on top (not clipped), back: behind the body,
  //   legs: pants | shorts | bare | gown | robe, pants / arm: colour ('c' = the player's colour, 'skin'), shoe }
  const W = '#f4f4f0';
  const OUT = [
    // men's (1–25)
    { s: 'shirt', legs: 'pants', d: q => q.E(0, 0, .15, .07, q.dk) },
    { s: 'shirt', legs: 'pants', f: W, arm: W, d: q => { q.flaps('#dcdcd6'); q.P(q.dk, -.06, 0, .06, 0, .04, .09, -.04, .09); q.P(q.c, -.05, .08, .05, .08, .09, .55, 0, .66, -.09, .55); } },
    { s: 'shirt', legs: 'pants', d: q => { q.R(-.22, .44, .44, .2, 'rgba(0,0,0,.18)'); q.L('rgba(255,255,255,.75)', .025, -.1, 0, -.12, .3); q.L('rgba(255,255,255,.75)', .025, .1, 0, .12, .3); }, t: q => q.E(0, 0, .3, .08, q.dk) },
    { s: 'wide', legs: 'pants', pants: '#22242e', f: '#2a2c38', arm: '#2a2c38', d: q => { q.P(W, -.14, 0, .14, 0, 0, .4); q.R(-.04, .06, .08, .32, q.c); for (const s of [-1, 1]) q.L('rgba(255,255,255,.22)', .025, s * .14, 0, s * .05, .45); } },
    { s: 'shirt', legs: 'shorts', d: q => { q.R(-.62, 0, .1, 1, 'rgba(255,255,255,.75)'); q.R(.52, 0, .1, 1, 'rgba(255,255,255,.75)'); q.E(0, 0, .16, .07, '#fff'); } },
    { s: 'shirt', legs: 'pants', pants: '#3a5aa0', d: q => { q.R(-.3, .25, .6, 1, '#3a5aa0'); q.R(-.3, 0, .08, .3, '#3a5aa0'); q.R(.22, 0, .08, .3, '#3a5aa0'); q.E(-.26, .28, .04, .04, '#ffd23a'); q.E(.26, .28, .04, .04, '#ffd23a'); } },
    { s: 'tank', legs: 'shorts', arm: 'skin' },
    { s: 'wide', legs: 'pants', pants: '#1e1e24', f: '#2a1a14', arm: '#2a1a14', d: q => { q.R(-.14, 0, .28, 1, q.c); q.L('#c8c8c8', .02, .16, .08, .16, q.H); for (const s of [-1, 1]) q.P('#3a2a22', s * .14, 0, s * .32, 0, s * .2, .3); } },
    { s: 'long', legs: 'pants', f: '#f8f8f6', arm: '#f8f8f6', d: q => { q.P(q.c, -.14, 0, .14, 0, 0, .35); q.L('#3a6ad8', .03, -.32, .3, -.32, .45); q.L('rgba(0,0,0,.2)', .02, 0, .35, 0, 1); } },
    { s: 'wide', legs: 'pants', pants: '#141418', f: '#16161c', arm: '#16161c', d: q => { q.P('#fff', -.16, 0, .16, 0, .05, 1, -.05, 1); q.P(q.c, 0, .08, -.12, .02, -.12, .14); q.P(q.c, 0, .08, .12, .02, .12, .14); } },
    { s: 'shirt', legs: 'pants', d: q => { q.flaps(q.lt); q.R(-.035, 0, .07, .2, q.dk); q.btn(0, .05, .16, 2, '#fff'); } },
    { s: 'shirt', legs: 'pants', d: q => { for (let i = 0; i < 6; i++) q.R(-.55 + i * .2, 0, .07, 1, 'rgba(0,0,0,.26)'); for (let i = 0; i < 5; i++) q.R(-.7, .04 + i * .18, 1.4, .06, 'rgba(0,0,0,.26)'); for (let i = 0; i < 5; i++) q.R(-.7, .11 + i * .18, 1.4, .015, 'rgba(255,255,255,.35)'); q.flaps(q.dk); q.btn(0, .12, .7, 4, '#eee'); } },
    { s: 'wide', legs: 'pants', f: '#4a6ea8', arm: '#4a6ea8', d: q => { q.R(-.12, 0, .24, 1, q.c); for (const s of [-1, 1]) { q.L('#d8b060', .014, s * .45, .2, s * .15, .2); q.R(s > 0 ? .17 : -.39, .21, .22, .08, '#3a5a90'); } } },
    { s: 'shirt', legs: 'pants', arm: '#ececec', d: q => { q.R(-.7, .62, 1.4, .04, '#fff'); q.R(-.7, .68, 1.4, .03, '#fff'); q.btn(-.06, .1, .6, 4, '#fff'); }, t: q => { q.E(0, 0, .2, .07, '#fff'); q.E(0, 0, .15, .045, q.c); } },
    { s: 'wide', legs: 'pants', arm: 'c', d: q => { for (let i = 0; i < 4; i++) q.L('rgba(0,0,0,.25)', .025, -.7, .17 + i * .17, .7, .17 + i * .17); q.zip('rgba(255,255,255,.6)'); }, t: q => q.E(0, 0, .26, .08, q.dk) },
    { s: 'long', legs: 'pants', f: '#b89a6a', arm: '#b89a6a', d: q => { q.P(q.c, -.08, 0, .08, 0, 0, .15); for (const s of [-1, 1]) q.P('#a0845a', s * .16, 0, s * .02, 0, s * .06, .3); q.belt(.45, '#8a6a40', '#c8a050'); q.btn(-.12, .2, .7, 3, '#5a4020'); q.btn(.12, .2, .7, 3, '#5a4020'); } },
    { s: 'shirt', legs: 'pants', pants: '#2a2a32', d: q => { q.vest('#1e1e24', .14); for (const s of [-1, 1]) q.btn(s * .3, .12, .6, 4, '#c8c8c8'); } },
    { s: 'shirt', legs: 'pants', d: q => { q.flowers('#fff', '#ffd23a', [[-.36, .12], [.33, .1], [-.42, .5], [.38, .48], [0, .05], [-.18, .72], [.22, .7], [-.05, .4]]); q.flaps(q.lt); } },
    { s: 'shirt', legs: 'pants', pants: '#3a5aa0', f: '#e8dcc0', arm: '#e8dcc0', d: q => { q.vest('#7a4a22', .12); q.P(q.c, -.18, 0, .18, 0, 0, .2); q.btn(-.2, .25, .6, 3, '#d8b060'); } },
    { s: 'shirt', legs: 'pants', pants: '#2a2a30', f: '#f8f8f6', arm: '#f8f8f6', d: q => { q.btn(-.14, .14, .6, 4, '#999'); q.btn(.14, .14, .6, 4, '#999'); q.E(0, .02, .17, .06, q.c); } },
    { s: 'wide', legs: 'pants', pants: '#2c2c30', f: '#2c2c30', arm: '#2c2c30', shoe: '#111', d: q => { for (const y of [.18, .55]) { q.R(-.7, y, 1.4, .08, '#e8e040'); q.R(-.7, y + .025, 1.4, .03, '#c8c8c8'); } q.btn(0, .08, .7, 4, '#c8c8c8'); } },
    { s: 'shirt', legs: 'pants', d: q => { q.vest('#ff7a1a', .12); for (const s of [-1, 1]) { q.R(s > 0 ? .14 : -.62, .38, .48, .05, '#e0e0e0'); q.R(s > 0 ? .14 : -.62, .55, .48, .05, '#e0e0e0'); } } },
    { s: 'shirt', legs: 'pants', pants: '#3aa8a0', f: '#3aa8a0', arm: '#3aa8a0', d: q => { q.P('#2a8880', -.13, 0, .13, 0, 0, .18); q.R(-.42, .24, .15, .12, '#33988f'); q.L('#ddd', .02, -.37, .22, -.37, .3); } },
    { s: 'wide', legs: 'pants', pants: '#4a5a6a', f: '#4a5a6a', arm: '#4a5a6a', d: q => { q.zip('#c8c8c8'); q.E(-.32, .17, .1, .05, '#fff'); q.L('#d83030', .012, -.39, .17, -.25, .17); q.flaps('#3a4a5a'); q.R(-.7, .45, 1.4, .05, '#3a4a5a'); } },
    { s: 'shirt', legs: 'pants', f: W, arm: W, d: q => { q.P(q.c, -.62, .02, -.14, 0, 0, .3, .14, 0, .62, .02, .6, 1, -.6, 1); for (let i = 0; i < 3; i++) for (const s of [-1, 1]) q.P(q.dk, s * .32, .32 + i * .16, s * .38, .4 + i * .16, s * .32, .48 + i * .16, s * .26, .4 + i * .16); q.flaps('#e8e8e2'); } },
    // women's (26–50)
    { s: 'dress', legs: 'bare', d: q => q.R(-.7, q.H + .05, 1.4, .06, 'rgba(255,255,255,.35)') },
    { s: 'gown', legs: 'gown', d: q => { for (let i = 0; i < 6; i++) q.E(-.55 + i * .22, q.H + .2, .04, .04, 'rgba(255,255,255,.45)'); } },
    { s: 'dress', legs: 'bare', arm: 'skin', d: q => { q.R(-.7, 0, 1.4, .1, q.skin); q.R(-.24, 0, .05, .12, q.c); q.R(.19, 0, .05, .12, q.c); q.dots('rgba(255,255,255,.55)', .17, .025); } },
    { s: 'fit', legs: 'bare', f: '#f6f2ea', arm: '#f6f2ea', d: q => { q.P(q.c, -.34, .38, .34, .38, .7, 1, -.7, 1); q.R(-.36, .36, .72, .05, q.dk); q.E(-.04, .04, .05, .03, q.c); q.E(.04, .04, .05, .03, q.c); } },
    { s: 'shirt', legs: 'pants', f: '#f6f2ea', arm: 'c', d: q => { q.vest(q.c, .12); q.btn(-.15, .1, .65, 4, '#fff'); q.btn(.15, .1, .65, 4, '#fff'); } },
    { s: 'shirt', legs: 'pants', pants: '#2a3a6a', d: q => { q.R(-.7, .42, 1.4, .09, q.skin); q.R(-.7, .51, 1.4, .5, '#2a3a6a'); q.btn(0, .56, .56, 1, '#d8b060'); } },
    { s: 'fit', legs: 'bare', arm: 'c', d: q => { for (let x = -.5; x <= .5; x += .1) q.L(q.dk, .015, x, 0, x * 1.4, 1); }, t: q => q.E(0, 0, .18, .07, q.dk) },
    { s: 'shirt', legs: 'pants', pants: 'c', arm: 'c', d: q => { q.belt(.42, q.dk, '#d8b060'); q.P(q.dk, -.12, 0, .12, 0, 0, .18); } },
    { s: 'fit', legs: 'bare', d: q => { q.L(q.dk, .03, -.3, 0, .3, .42); q.E(.33, .42, .06, .04, q.dk); q.L(q.dk, .02, .33, .44, .38, .6); } },
    { s: 'dress', legs: 'bare', d: q => q.dots('#fff', .16, .035) },
    { s: 'fit', legs: 'bare', f: '#18181e', arm: 'skin', d: q => { q.R(-.7, 0, 1.4, .06, q.skin); for (let i = 0; i < 9; i++) { const a = PI * (.15 + i * .0875); q.E(Math.cos(a) * .22, .02 + Math.sin(a) * .12, .025, .025, '#fff'); } } },
    { s: 'fit', legs: 'bare', f: '#f6f2ea', arm: '#f6f2ea', d: q => { q.P(q.c, -.2, .15, .2, .15, .3, .38, .7, 1, -.7, 1, -.3, .38); q.R(-.23, 0, .06, .17, q.c); q.R(.17, 0, .06, .17, q.c); } },
    { s: 'shirt', legs: 'pants', f: '#f6f0e0', arm: '#f6f0e0', d: q => { q.E(0, 0, .32, .1, q.c); for (let i = 0; i < 7; i++) q.E(-.27 + i * .09, .1, .02, .02, q.c); q.L('rgba(0,0,0,.15)', .02, -.6, .5, .6, .5); } },
    { s: 'fit', legs: 'bare', arm: 'skin', d: q => { q.P('#fff', -.36, 0, -.22, 0, 0, .28, .22, 0, .36, 0, 0, .38); for (let x = -.5; x <= .5; x += .14) q.L(q.dk, .015, x * .6, .42, x, 1); q.R(-.8, q.H + .04, 1.6, .04, '#fff'); } },
    { s: 'fit', legs: 'bare', arm: 'skin', d: q => { q.R(-.7, 0, 1.4, .05, q.skin); }, t: q => { q.E(0, .52, .72, .12, q.lt); q.E(0, .48, .64, .1, shade(q.c, 25)); } },
    { s: 'fit', legs: 'bare', arm: 'c', d: q => { q.P('#fff', -.12, 0, .12, 0, 0, .3); for (const s of [-1, 1]) q.L('rgba(255,255,255,.3)', .02, s * .12, 0, s * .05, .36); q.P(q.dk, -.32, .4, .32, .4, .52, 1, -.52, 1); } },
    { s: 'gown', legs: 'gown', d: q => q.flowers(q.lt, '#ffd23a', [[-.15, .2], [.18, .3], [-.3, .55], [.32, .65], [0, .75], [-.5, .85], [.5, .9]]) },
    { s: 'dress', legs: 'bare', d: q => q.hs('rgba(255,255,255,.8)', 6, .05) },
    { s: 'fit', legs: 'bare', arm: 'skin', d: q => { q.R(-.7, 0, 1.4, .05, q.skin); for (let i = 0; i < 40; i++) q.E(((i * 37) % 100) / 100 * 1.3 - .65, ((i * 53) % 100) / 100 * (q.H + .1), .02, .02, i % 3 ? '#ffe27a' : '#fff'); } },
    { s: 'fit', legs: 'bare', d: q => { q.P('#4a6ea8', -.32, .4, .32, .4, .54, 1, -.54, 1); q.L('#d8b060', .012, -.3, .46, .3, .46); } },
    { s: 'dress', legs: 'bare', d: q => q.flowers('#fff', '#ffd23a', [[-.2, .15], [.2, .2], [-.4, .45], [.4, .5], [0, .62], [-.25, .78], [.3, .82]]) },
    { s: 'shirt', legs: 'pants', arm: 'skin', d: q => { q.R(-.7, 0, 1.4, .1, q.skin); for (let i = 0; i < 9; i++) q.E(-.48 + i * .12, .12, .07, .04, q.lt); } },
    { s: 'slim', legs: 'pants', arm: 'c', d: q => { for (let x = -.45; x <= .45; x += .09) q.L(q.dk, .012, x, .08, x * .9, 1); }, t: q => q.R(-.15, -.05, .3, .1, q.dk) },
    { s: 'gown', legs: 'gown', d: q => { q.R(-.4, 0, .8, .35, q.lt); for (let i = 0; i < 8; i++) q.S(-.5 + i * .14, .7 + (i % 2) * .12, .04, '#fff'); }, t: q => { for (const s of [-1, 1]) q.E(s * .4, .06, .14, .11, q.lt); } },
    { s: 'robe', legs: 'robe', f: '#2a1a3a', arm: '#2a1a3a', d: q => { q.belt(.38, q.c, '#ffd23a'); }, t: q => { for (let i = 0; i < 7; i++) q.P('#2a1a3a', -.62 + i * .18, q.H + .2, -.53 + i * .18, q.H + .34, -.44 + i * .18, q.H + .2); } },
    // costumes (51–75): anyone, and the themed maps
    { s: 'robe', legs: 'robe', d: q => { for (let i = 0; i < 4; i++) q.S((i % 2 ? .2 : -.2), .25 + i * .18, .06, '#ffd23a'); } },
    { s: 'wide', legs: 'pants', pants: '#8a929c', arm: '#9aa2ac', shoe: '#5a6068', f: (g, m, ty, by, rr) => { const gr = g.createLinearGradient(m - rr * .5, ty, m + rr * .5, by); gr.addColorStop(0, '#e8ecf0'); gr.addColorStop(1, '#7a828c'); return gr; }, d: q => { for (let i = 1; i < 4; i++) q.L('rgba(40,40,50,.6)', .02, -.6, i * q.H / 4, .6, i * q.H / 4); q.R(-.05, .05, .1, q.H, q.c); } },
    { s: 'shirt', legs: 'pants', pants: 'c', arm: 'c', cape: true, d: q => { q.S(0, .14, .11, '#ffd23a'); q.belt(.62, '#ffd23a'); } },
    { s: 'wide', legs: 'pants', pants: '#e8e8ec', arm: '#f2f2f4', shoe: '#c8c8cc', f: '#f2f2f4', d: q => { q.R(-.34, .06, .2, .13, '#3a3a44'); q.E(-.3, .1, .02, .02, '#ff4040'); q.E(-.24, .1, .02, .02, '#40ff60'); q.E(-.18, .1, .02, .02, '#40a0ff'); q.E(.34, .12, .07, .07, q.c); q.belt(.6, '#b8b8c0'); }, t: q => q.E(0, 0, .3, .07, '#c8c8d0') },
    { s: 'wide', legs: 'pants', pants: '#55663a', arm: '#5a6a3a', shoe: '#2a2015', f: '#5a6a3a', d: q => { for (const [x, y, rx, col] of [[-.4, .15, .12, '#4a5a2e'], [.3, .1, .1, '#6e7a46'], [-.1, .55, .14, '#4a5a2e'], [.4, .5, .11, '#3e4a26'], [-.45, .6, .1, '#6e7a46'], [.15, .3, .09, '#3e4a26']]) q.E(x, y, rx, rx * .7, col, x); for (const s of [-1, 1]) q.R(s > 0 ? .15 : -.39, .2, .24, .07, '#4a5a2e'); q.belt(.6, '#3a3020', '#8a8a6a'); } },
    { s: 'tank', legs: 'shorts', pants: 'c', arm: 'skin', d: q => { q.R(-.5, 0, .2, .05, q.skin); q.R(-.7, 0, .14, 1, q.dk); q.R(.56, 0, .14, 1, q.dk); q.R(-.4, .6, .8, .05, '#fff'); } },
    { s: 'long', legs: 'pants', pants: '#2a2a30', f: '#9a2020', arm: '#9a2020', d: q => { q.P('#f6f2ea', -.15, 0, .15, 0, 0, .45); for (let i = 0; i < 3; i++) q.L('#ddd', .02, -.06, .08 + i * .1, .06, .08 + i * .1); q.btn(-.2, .1, .7, 4, '#ffd23a'); q.btn(.2, .1, .7, 4, '#ffd23a'); q.belt(.44, q.c); } },
    { s: 'shirt', legs: 'pants', pants: '#1c1c24', f: '#1c1c24', arm: '#1c1c24', shoe: '#111', d: q => { q.L('rgba(255,255,255,.14)', .025, -.2, 0, .2, .4); q.belt(.44, q.c); q.E(.22, .5, .06, .05, q.c); q.L(q.c, .03, .22, .52, .28, .68); } },
    { s: 'wide', legs: 'pants', pants: '#8a929c', arm: '#a8b0b8', shoe: '#5a6068', f: (g, m, ty, by, rr) => { const gr = g.createLinearGradient(m, ty, m, by); gr.addColorStop(0, '#d8dee4'); gr.addColorStop(1, '#8a929c'); return gr; }, d: q => { for (const [x, col] of [[-.38, '#ff4040'], [-.28, '#ffd23a'], [-.18, '#40ff60']]) q.E(x, .12, .03, .03, col); q.E(.3, .14, .08, .08, q.c); q.L('#333', .015, .3, .14, .35, .09); for (const s of [-1, 1]) q.btn(s * .45, .1, .6, 3, '#6a7078'); } },
    { s: 'robe', legs: 'robe', f: '#f4efe2', arm: 'skin', shoe: '#8a5a2a', d: q => { q.P(q.c, -.5, 0, -.25, 0, .7, .8, .5, .95); for (let i = 0; i < 3; i++) q.L('rgba(0,0,0,.12)', .02, -.4 + i * .3, .3, -.3 + i * .3, 1); } },
    { s: 'shirt', legs: 'pants', pants: '#18181e', f: W, arm: '#18181e', back: q => { q.P('#b01020', -.5, 0, .5, 0, .72, q.H + .3, -.72, q.H + .3); q.P('#18181e', -.62, 0, -.48, 0, -.78, q.H + .3, -.9, q.H + .3); q.P('#18181e', .62, 0, .48, 0, .78, q.H + .3, .9, q.H + .3); }, d: q => { q.vest('#18181e', .14); q.E(0, .2, .05, .05, q.c); }, t: q => { for (const s of [-1, 1]) q.P('#18181e', s * .3, 0, s * .46, -.24, s * .2, -.02); } },
    { s: 'shirt', legs: 'pants', pants: '#e0d6b8', f: '#e8dfc4', arm: '#e8dfc4', shoe: '#e0d6b8', d: q => { for (let i = 0; i < 9; i++) q.L('rgba(120,100,70,.5)', .02, -.7, i * .1, .7, i * .1 + .16); q.P('#e8dfc4', .4, .5, .52, .5, .6, .8); } },
    { s: 'shirt', legs: 'pants', pants: '#18181e', f: '#18181e', arm: '#18181e', d: q => { q.R(-.025, 0, .05, 1, W); for (let i = 0; i < 4; i++) for (const s of [-1, 1]) q.L(W, .04, s * .05, .08 + i * .12, s * .34, .12 + i * .12); q.E(0, q.H - .02, .2, .06, W); } },
    { s: 'round', legs: 'pants', pants: '#2a7a2a', f: '#ff8a1a', arm: '#ff8a1a', d: q => { for (const x of [-.3, 0, .3]) q.L('rgba(150,60,0,.45)', .025, x, -.05, x * 1.15, .45, x, q.H + .1); q.P('#2a1408', -.36, .12, -.24, .04, -.22, .16); q.P('#2a1408', .36, .12, .24, .04, .22, .16); } },
    { s: 'shirt', legs: 'pants', pants: '#e83030', f: '#2a9a3a', arm: '#2a9a3a', shoe: '#2a9a3a', d: q => { for (let i = 0; i < 6; i++) q.P('#e83030', -.33 + i * .11, 0, -.275 + i * .11, .1, -.22 + i * .11, 0); q.belt(.5, '#18181e', '#ffd23a'); q.btn(0, .15, .4, 3, '#ffd23a'); } },
    { s: 'wide', legs: 'pants', pants: '#d42020', f: '#d42020', arm: '#d42020', shoe: '#18181e', d: q => { q.R(-.06, 0, .12, 1, '#fff'); q.R(-.7, q.H - .1, 1.4, .14, '#fff'); q.belt(.42, '#18181e', '#ffd23a'); } },
    { s: 'shirt', legs: 'pants', arm: 'c', d: q => { for (const yy of [.3, .5]) q.L('#fff', .04, ...Array.from({ length: 9 }, (_, k) => [-.48 + k * .12, yy + (k % 2 ? -.05 : .05)]).flat()); q.dots('rgba(255,255,255,.8)', .2, .018); } },
    { s: 'wide', legs: 'pants', pants: '#2a2a2e', f: '#2a2a2e', arm: '#2a2a2e', d: q => { q.P(W, -.34, 0, .34, 0, .26, .18, 0, .22, -.26, .18); q.belt(.5, '#18181e', '#c8c8c8'); } },
    { s: 'wide', legs: 'pants', pants: 'c', arm: 'c', back: q => { for (const s of [-1, 1]) { q.E(s * .2, -1.45, .1, .32, q.c, s * .15); q.E(s * .2, -1.42, .05, .22, '#ffb0c8', s * .15); } }, d: q => { q.E(0, .45, .3, .32, '#fff'); q.zip('rgba(0,0,0,.2)'); } },
    { s: 'wide', legs: 'pants', pants: '#e8d020', f: '#e8d020', arm: '#e8d020', shoe: '#2a2a2a', d: q => { q.zip('#888'); q.P('#18181e', -.38, .28, -.26, .08, -.14, .28); q.P('#e8d020', -.34, .26, -.26, .14, -.18, .26); for (const s of [-1, 1]) q.L('rgba(0,0,0,.2)', .02, s * .45, 0, s * .4, 1); }, t: q => q.E(0, 0, .3, .08, '#c8b010') },
    { s: 'shirt', legs: 'pants', pants: '#4a4a3a', d: q => { for (const [x, y] of [[-.35, .55], [.3, .2], [.4, .62], [-.2, .15]]) q.P('rgba(0,0,0,.45)', x - .05, y, x + .02, y - .06, x + .06, y + .02, x, y + .06); q.L('#5a3a1a', .09, -.55, 0, .45, q.H + .05); q.E(-.3, .4, .1, .06, 'rgba(110,80,40,.35)'); } },
    { s: 'wide', legs: 'pants', arm: 'c', d: q => { q.P('#fff', -.7, .3, 0, .45, .7, .3, .7, .38, 0, .53, -.7, .38); q.zip('rgba(0,0,0,.35)'); }, t: q => q.E(0, 0, .26, .08, q.dk) },
    { s: 'shirt', legs: 'shorts', pants: '#b09868', f: '#c8b080', arm: '#c8b080', shoe: '#5a3a1a', d: q => { q.flaps('#b09868'); for (const s of [-1, 1]) q.R(s > 0 ? .15 : -.37, .18, .22, .14, '#b8a070'); q.belt(.6, '#6a4a2a', '#c8a050'); } },
    { s: 'long', legs: 'pants', pants: '#5a4a3a', f: '#9a7a50', arm: '#9a7a50', shoe: '#4a3020', d: q => { q.P('#f0e6cc', -.1, 0, .1, 0, 0, .25); for (let i = 0; i < 3; i++) { q.L('#5a3a1a', .015, -.08, .04 + i * .07, .08, .1 + i * .07); q.L('#5a3a1a', .015, .08, .04 + i * .07, -.08, .1 + i * .07); } q.L('#d8c090', .04, -.7, .45, .7, .45); } },
    { s: 'wide', legs: 'pants', pants: 'c', arm: 'c', back: q => { for (let i = 0; i < 5; i++) q.P(q.dk, -.36 + i * .18, -1.08 - Math.sin(i / 4 * PI) * .2, -.27 + i * .18, -1.4 - Math.sin(i / 4 * PI) * .25, -.18 + i * .18, -1.08 - Math.sin(i / 4 * PI) * .2); }, d: q => { q.E(0, .45, .32, .34, q.lt); for (let i = 0; i < 3; i++) q.L(q.c, .02, -.22, .3 + i * .13, .22, .3 + i * .13); } }
  ];

  // ---------- 💄 makeup: { u: under the eyes, o: over the smile } and 🧔 facial hair ----------
  const lips = (g, x, y, r, col) => { g.fillStyle = col; E(g, x, y + r * .44, r * .2, r * .08); };
  const shadow = (g, x, y, r, col, big = 1) => { g.fillStyle = col; for (const s of [-1, 1]) { g.beginPath(); g.ellipse(x + s * r * .35, y - r * .2, r * .21 * big, r * .13 * big, 0, PI, 0); g.fill(); } };
  const liner = (g, x, y, r) => { g.strokeStyle = '#111'; g.lineWidth = r * .07; g.lineCap = 'round'; for (const s of [-1, 1]) { g.beginPath(); g.moveTo(x + s * r * .2, y - r * .2); g.lineTo(x + s * r * .55, y - r * .22); g.lineTo(x + s * r * .66, y - r * .32); g.stroke(); } };
  const star = (g, cx, cy, s) => { g.beginPath(); for (let k = 0; k < 10; k++) { const a = k * PI / 5 - PI / 2, rad = k % 2 ? s * .45 : s; g.lineTo(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad); } g.fill(); };
  const MAKEUP = [
    {},
    { u: (g, x, y, r) => { g.fillStyle = 'rgba(255,90,110,.35)'; for (const s of [-1, 1]) E(g, x + s * r * .55, y + r * .25, r * .2, r * .12); } },
    { o: (g, x, y, r) => lips(g, x, y, r, '#d0102a') },
    { o: (g, x, y, r) => liner(g, x, y, r) },
    { u: (g, x, y, r) => shadow(g, x, y, r, 'rgba(60,120,255,.6)') },
    { u: (g, x, y, r) => { g.fillStyle = 'rgba(140,70,30,.55)'; for (const s of [-1, 1]) for (let i = 0; i < 4; i++) C(g, x + s * r * (.4 + (i % 2) * .14), y + r * (.12 + Math.floor(i / 2) * .12), r * .04); } },
    { u: (g, x, y, r) => { for (let i = 0; i < 9; i++) { g.fillStyle = ['#fff', '#ffd23a', '#ff9ed8', '#9ff'][i % 4]; C(g, x + Math.cos(i * 2.4) * r * .6, y + Math.sin(i * 2.4) * r * .4 - r * .1, r * .045); } } },
    { u: (g, x, y, r, col) => { g.fillStyle = col || '#e03030'; for (const s of [-1, 1]) for (let i = 0; i < 2; i++) g.fillRect(x + s * r * .45 - r * .2, y + r * (.12 + i * .16), r * .4, r * .07); } },
    { u: (g, x, y, r) => { g.fillStyle = '#ff3a6a'; for (const s of [-1, 1]) { const hx = x + s * r * .55, hy = y + r * .22, k = r * .1; g.beginPath(); g.moveTo(hx, hy + k); g.bezierCurveTo(hx - k * 2, hy - k * .6, hx - k * .6, hy - k * 1.8, hx, hy - k * .4); g.bezierCurveTo(hx + k * .6, hy - k * 1.8, hx + k * 2, hy - k * .6, hx, hy + k); g.fill(); } } },
    { o: (g, x, y, r) => { g.fillStyle = '#e01020'; C(g, x, y + r * .12, r * .17); g.fillStyle = 'rgba(255,255,255,.6)'; C(g, x - r * .05, y + r * .07, r * .05); } },
    { o: (g, x, y, r) => lips(g, x, y, r, '#ff4a9a') },
    { o: (g, x, y, r) => lips(g, x, y, r, '#8a2ad0') },
    { o: (g, x, y, r) => lips(g, x, y, r, '#1a1a1e') },
    { u: (g, x, y, r) => shadow(g, x, y, r, 'rgba(255,90,180,.6)') },
    { u: (g, x, y, r) => shadow(g, x, y, r, 'rgba(240,185,40,.8)') },
    { u: (g, x, y, r) => shadow(g, x, y, r, 'rgba(25,25,35,.62)', 1.25) },
    { u: (g, x, y, r) => { for (const [i, col] of ['rgba(255,60,60,.7)', 'rgba(255,200,40,.7)', 'rgba(60,200,90,.7)', 'rgba(60,120,255,.7)'].entries()) shadow(g, x, y - r * .03 * i, r, col, 1 - i * .12); } },
    { o: (g, x, y, r) => { liner(g, x, y, r); lips(g, x, y, r, '#d0102a'); } },
    { u: (g, x, y, r) => { g.fillStyle = '#ffd23a'; for (const s of [-1, 1]) star(g, x + s * r * .56, y + r * .24, r * .13); } },
    { o: (g, x, y, r) => { g.fillStyle = '#2a1a14'; C(g, x + r * .42, y + r * .36, r * .04); } },
    { o: (g, x, y, r) => { g.fillStyle = '#2a1a14'; E(g, x, y + r * .12, r * .08, r * .055); for (const s of [-1, 1]) for (let i = -1; i <= 1; i++) line(g, '#2a1a14', r * .025, x + s * r * .25, y + r * (.22 + i * .07), x + s * r * .72, y + r * (.18 + i * .14)); } },
    { u: (g, x, y, r, col) => { g.globalAlpha *= .55; g.fillStyle = col || '#8a5cff'; for (const s of [-1, 1]) { E(g, x + s * r * .42, y - r * .12, r * .34, r * .26, s * .3); E(g, x + s * r * .36, y + r * .2, r * .2, r * .15, -s * .3); } g.globalAlpha /= .55; } },
    { o: (g, x, y, r, col) => { g.fillStyle = col || '#3ad8ff'; poly(g, x, y - r * .66, x + r * .08, y - r * .55, x, y - r * .44, x - r * .08, y - r * .55); g.fillStyle = 'rgba(255,255,255,.7)'; C(g, x - r * .02, y - r * .58, r * .025); } },
    { u: (g, x, y, r) => { g.fillStyle = 'rgba(200,120,60,.32)'; for (const s of [-1, 1]) E(g, x + s * r * .6, y + r * .18, r * .2, r * .28, s * .3); g.fillStyle = 'rgba(255,240,200,.35)'; for (const s of [-1, 1]) E(g, x + s * r * .45, y + r * .05, r * .12, r * .05); } },
    { u: (g, x, y, r) => { g.fillStyle = 'rgba(245,245,245,.55)'; E(g, x, y + r * .05, r * .9, r * .85); g.fillStyle = 'rgba(20,20,26,.75)'; for (const s of [-1, 1]) C(g, x + s * r * .35, y - r * .05, r * .27); poly(g, x - r * .07, y + r * .2, x + r * .07, y + r * .2, x, y + r * .08); }, o: (g, x, y, r) => { for (let i = -2; i <= 2; i++) line(g, 'rgba(20,20,26,.8)', r * .03, x + i * r * .08, y + r * .38, x + i * r * .08, y + r * .54); } }
  ];
  const BEARD = [
    () => {},
    (g, x, y, r) => { g.globalAlpha *= .35; g.beginPath(); g.arc(x, y + r * .05, r * .98, PI * .1, PI * .9); g.closePath(); g.fill(); g.globalAlpha /= .35; },
    (g, x, y, r) => { g.beginPath(); g.ellipse(x - r * .15, y + r * .3, r * .2, r * .08, .15, 0, 7); g.ellipse(x + r * .15, y + r * .3, r * .2, r * .08, -.15, 0, 7); g.fill(); },
    (g, x, y, r, c) => line(g, c, r * .1, x - r * .5, y + r * .12, x - r * .3, y + r * .32, x, y + r * .3, x + r * .3, y + r * .32, x + r * .5, y + r * .12),
    (g, x, y, r) => { E(g, x, y + r * .3, r * .26, r * .08); poly(g, x - r * .18, y + r * .55, x + r * .18, y + r * .55, x, y + r * .95); },
    (g, x, y, r) => poly(g, x - r * .08, y + r * .58, x + r * .08, y + r * .58, x, y + r * .76),
    (g, x, y, r, c) => { g.beginPath(); g.arc(x, y + r * .05, r * 1.0, PI * .05, PI * .95); g.quadraticCurveTo(x, y + r * .7, x + r, y + r * .2); g.fill(); g.fillStyle = shade(c, 25); E(g, x, y + r * .4, r * .22, r * .07); },
    (g, x, y, r) => { g.beginPath(); g.arc(x, y + r * .05, r * 1.02, PI * .02, PI * .98); g.quadraticCurveTo(x, y + r * 1.25, x + r * 1.02, y + r * .1); g.fill(); },
    (g, x, y, r) => { g.beginPath(); g.arc(x, y + r * .05, r * 1.02, PI * .02, PI * .98); g.quadraticCurveTo(x - r * .3, y + r * 1.9, x, y + r * 2.1); g.quadraticCurveTo(x + r * .3, y + r * 1.9, x + r * 1.02, y + r * .1); g.fill(); },
    (g, x, y, r) => { for (const s of [-1, 1]) poly(g, x + s * r * .98, y - r * .25, x + s * r * .98, y + r * .35, x + s * r * .55, y + r * .48, x + s * r * .7, y - r * .25); },
    (g, x, y, r, c) => line(g, c, r * .045, x - r * .24, y + r * .3, x + r * .24, y + r * .3),
    (g, x, y, r) => { E(g, x, y + r * .32, r * .36, r * .13); for (let i = -3; i <= 3; i++) poly(g, x + i * r * .1 - r * .05, y + r * .4, x + i * r * .1, y + r * .52, x + i * r * .1 + r * .05, y + r * .4); },
    (g, x, y, r) => { E(g, x, y + r * .3, r * .3, r * .08); g.fillRect(x - r * .36, y + r * .28, r * .1, r * .44); g.fillRect(x + r * .26, y + r * .28, r * .1, r * .44); },
    (g, x, y, r) => { E(g, x - r * .16, y + r * .3, r * .17, r * .07, .2); E(g, x + r * .16, y + r * .3, r * .17, r * .07, -.2); poly(g, x - r * .15, y + r * .6, x + r * .15, y + r * .6, x, y + r * 1.05); },
    (g, x, y, r, c) => { g.strokeStyle = c; g.lineWidth = r * .12; g.beginPath(); g.arc(x, y + r * .05, r * .97, PI * .05, PI * .95); g.stroke(); },
    (g, x, y, r) => { g.beginPath(); g.arc(x, y + r * .05, r * 1.02, PI * .05, PI * .95); g.arc(x, y + r * .2, r * .72, PI * .9, PI * .1, true); g.fill(); },
    (g, x, y, r, c) => { E(g, x, y + r * .3, r * .26, r * .08); g.strokeStyle = c; g.lineWidth = r * .1; g.beginPath(); g.arc(x, y + r * .15, r * .62, PI * .22, PI * .78); g.stroke(); poly(g, x - r * .12, y + r * .74, x + r * .12, y + r * .74, x, y + r * 1.05); },
    (g, x, y, r, c) => { g.beginPath(); g.arc(x, y + r * .05, r * 1.0, PI * .05, PI * .95); g.quadraticCurveTo(x, y + r * .7, x + r, y + r * .2); g.fill(); braid(g, c, x, y + r * 1.05, x, y + r * 1.7, 4, r * .13); },
    (g, x, y, r) => { g.beginPath(); g.arc(x, y + r * .05, r * 1.02, PI * .02, PI * .98); g.quadraticCurveTo(x, y + r * 1.1, x + r * 1.02, y + r * .1); g.fill(); poly(g, x - r * .45, y + r * .85, x - r * .05, y + r * 1.0, x - r * .3, y + r * 1.55); poly(g, x + r * .45, y + r * .85, x + r * .05, y + r * 1.0, x + r * .3, y + r * 1.55); },
    (g, x, y, r) => { g.beginPath(); g.arc(x, y + r * .05, r * 1.02, PI * .02, PI * .98); g.quadraticCurveTo(x - r * .4, y + r * 2.4, x, y + r * 2.7); g.quadraticCurveTo(x + r * .4, y + r * 2.4, x + r * 1.02, y + r * .1); g.fill(); },
    (g, x, y, r, c) => { g.strokeStyle = c; g.lineWidth = r * .1; g.beginPath(); g.ellipse(x, y + r * .44, r * .3, r * .2, 0, 0, 7); g.stroke(); },
    (g, x, y, r, c) => { g.beginPath(); g.moveTo(x - r * .98, y + r * .2); g.lineTo(x - r * .85, y + r * 1.2); g.lineTo(x + r * .85, y + r * 1.2); g.lineTo(x + r * .98, y + r * .2); g.quadraticCurveTo(x, y + r * .75, x - r * .98, y + r * .2); g.fill(); g.fillStyle = shade(c, 25); E(g, x, y + r * .4, r * .24, r * .07); },
    (g, x, y, r, c) => { E(g, x, y + r * .3, r * .25, r * .07); line(g, c, r * .07, x - r * .2, y + r * .32, x - r * .3, y + r * .95); line(g, c, r * .07, x + r * .2, y + r * .32, x + r * .3, y + r * .95); },
    (g, x, y, r, c) => { g.strokeStyle = c; g.lineWidth = r * .09; g.lineCap = 'round'; for (const s of [-1, 1]) { g.beginPath(); g.moveTo(x, y + r * .3); g.quadraticCurveTo(x + s * r * .35, y + r * .4, x + s * r * .5, y + r * .1); g.stroke(); } poly(g, x - r * .07, y + r * .68, x + r * .07, y + r * .68, x, y + r * .95); },
    (g, x, y, r) => { for (const s of [-1, 1]) poly(g, x + s * r * .99, y - r * .3, x + s * r * .99, y + r * .25, x + s * r * .8, y + r * .3, x + s * r * .82, y - r * .3); }
  ];
  if (HAIR.length !== BASE.hair.length || OUT.length !== BASE.outfit.length || MAKEUP.length !== BASE.makeup.length || BEARD.length !== BASE.facialhair.length) console.warn('[charparts] a list and its names are out of step');


  // ---------- 🔢 the 20 versions (1.59.0) ----------
  const hsl = hex => { const n = parseInt(String(hex).replace('#', '').slice(0, 6), 16), r = (n >> 16) / 255, gg = ((n >> 8) & 255) / 255, b = (n & 255) / 255, mx = Math.max(r, gg, b), mn = Math.min(r, gg, b), l = (mx + mn) / 2, d = mx - mn;
    let h = 0, sat = 0; if (d) { sat = d / (1 - Math.abs(2 * l - 1)); h = mx === r ? ((gg - b) / d) % 6 : mx === gg ? (b - r) / d + 2 : (r - gg) / d + 4; h *= 60; if (h < 0) h += 360; } return [h, sat, l]; };
  const hex = (h, sat, l) => { h = ((h % 360) + 360) % 360; sat = Math.max(0, Math.min(1, sat)); l = Math.max(0, Math.min(1, l)); const c = (1 - Math.abs(2 * l - 1)) * sat, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m0 = l - c / 2;
    const [r, gg, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x]; return '#' + [r, gg, b].map(v => Math.round((v + m0) * 255).toString(16).padStart(2, '0')).join(''); };
  const mixH = (a, b, t) => { const d = ((b - a + 540) % 360) - 180; return a + d * t; };
  // skin families: [hue (null = keep), hue mix, saturation ×/=, lightness shift / map]
  const SKIN_FAM = [
    c => [c[0] + 6, c[1] * 1.12, c[2]], c => [c[0] - 10, c[1] * .95, c[2] + .02], c => [mixH(c[0], 42, .5), c[1] * 1.3, c[2] + .01], c => [mixH(c[0], 55, .45), c[1] * .75, c[2] - .02],
    c => [c[0], c[1] * .5, c[2]], c => [c[0] + 3, c[1] * 1.2, c[2] - .04], c => [c[0], c[1] * .7, Math.min(.93, c[2] + .07)], c => [c[0] - 4, c[1] * 1.1, c[2] - .09],
    c => [150, .42, .45 + c[2] * .4], c => [200, .5, .42 + c[2] * .42], c => [272, .42, .45 + c[2] * .4], c => [350, .58, .3 + c[2] * .42], c => [95, .28, .32 + c[2] * .4], c => [112, .62, .3 + c[2] * .4],
    c => [212, .58, .28 + c[2] * .42], c => [44, .72, .32 + c[2] * .38], c => [215, .06, .4 + c[2] * .45], c => [30, .08, .3 + c[2] * .4], c => [230, .06, .78 + c[2] * .18]];
  const HAIRC_FAM = [
    c => [c[0], c[1], c[2] + .16], c => [c[0], c[1], c[2] - .13], c => [c[0] + 12, Math.max(.25, c[1] * 1.1), c[2]], c => [c[0] - 18, Math.max(.2, c[1]), c[2]], c => [c[0], c[1] * .35, c[2] + .03],
    c => [mixH(c[0], 45, .6), Math.max(.55, c[1]), Math.max(.35, c[2])], c => [mixH(c[0], 20, .7), Math.max(.6, c[1]), Math.max(.32, Math.min(.55, c[2]))], c => [mixH(c[0], 340, .6), Math.max(.45, c[1]), Math.max(.42, c[2])],
    c => [c[0], c[1] * .3, c[2] * .8], c => [c[0], .62, .76 + c[2] * .1], c => [c[0], 1, .55], c => [c[0], c[1] * .5, c[2] + .1], c => [mixH(c[0], 45, .4), c[1], c[2] + .08], c => [mixH(c[0], 232, .7), Math.max(.35, c[1]), c[2] * .55],
    c => [350, .75, .3 + c[2] * .25], c => [160, .5, .55 + c[2] * .25], c => [280, .45, .58 + c[2] * .25], c => [205, .7, .3 + c[2] * .3], c => [18, .85, .42 + c[2] * .2]];
  const famCol = (list, fam, k, n) => { const [b, v] = sp(k, n), base = list[b - 1]; if (!v) return base; const c = hsl(base); return hex(...fam[v - 1](c)); };
  const skinCol = n => famCol(SKIN, SKIN_FAM, 'skin', n), hairColN = n => famCol(HAIRC, HAIRC_FAM, 'haircolor', n);
  const heart = (g, x, y, s) => { g.beginPath(); g.moveTo(x, y + s * .35); g.bezierCurveTo(x - s * 1.1, y - s * .35, x - s * .45, y - s * 1.05, x, y - s * .45); g.bezierCurveTo(x + s * .45, y - s * 1.05, x + s * 1.1, y - s * .35, x, y + s * .35); g.fill(); };
  const twinkle = (g, x, y, s) => poly(g, x, y - s, x + s * .28, y - s * .28, x + s, y, x + s * .28, y + s * .28, x, y + s, x - s * .28, y + s * .28, x - s, y, x - s * .28, y - s * .28);
  // hair versions: drawn on top of the hair (1 Flipped and 2 Big change how the hair itself is drawn)
  // hair versions (1.59.4: the accessories moved to their own part, 🎩 Head accessory): 1 Flipped, 2 Big, 4 Tall, 5 Wide, 6 Slim change
  // how the hair is drawn (hairDo); the others paint over the hair only (drawn on a separate canvas, 'source-atop')
  const HFX = {
    3: (t, x, y, r, hc) => { t.globalAlpha = .7; for (const [a, b] of [[-.45, -.2], [-.05, .05], [.35, .3]]) line(t, shade(hc, 75), r * .06, x + r * a, y - r * .98, x + r * (a + b * .3), y - r * .7, x + r * b, y - r * .45); },
    7: (t, x, y, r, hc) => { const gr = t.createLinearGradient(0, y - r * 1.3, 0, y + r * .6); gr.addColorStop(0, shade(hc, -55)); gr.addColorStop(1, shade(hc, 70)); t.fillStyle = gr; t.globalAlpha = .75; t.fillRect(x - r * 2, y - r * 2, r * 4, r * 4); },
    8: (t, x, y, r, hc) => { t.fillStyle = shade(hc, 85); t.globalAlpha = .7; t.fillRect(x, y - r * 2, r * 2, r * 4); },
    9: (t, x, y, r) => { const gr = t.createRadialGradient(x, y - r * .2, r * .8, x, y - r * .2, r * 1.5); gr.addColorStop(0, 'rgba(255,248,220,0)'); gr.addColorStop(1, 'rgba(255,248,220,.95)'); t.fillStyle = gr; t.fillRect(x - r * 2, y - r * 2, r * 4, r * 4); },
    10: (t, x, y, r) => { const gr = t.createRadialGradient(x, y - r * .2, r * .8, x, y - r * .2, r * 1.5); gr.addColorStop(0, 'rgba(255,60,170,0)'); gr.addColorStop(1, 'rgba(255,60,170,.95)'); t.fillStyle = gr; t.fillRect(x - r * 2, y - r * 2, r * 4, r * 4); },
    11: (t, x, y, r) => { t.fillStyle = '#f4f4f0'; t.fillRect(x - r * .14, y - r * 2, r * .28, r * 4); },
    12: (t, x, y, r) => { ['#ff3a3a', '#ff9a2b', '#ffe12b', '#3ad86a', '#2b9aff', '#9a4bff'].forEach((c, i) => { t.fillStyle = c; t.globalAlpha = .8; t.fillRect(x - r * 1.2 + i * r * .42, y - r * 2, r * .2, r * 4); }); },
    13: (t, x, y, r) => { t.fillStyle = '#fff6b0'; for (let i = 0; i < 16; i++) twinkle(t, x + r * (((i * 37) % 23) / 23 * 2.2 - 1.1), y - r * (.2 + ((i * 53) % 19) / 19 * 1.1), r * .06); },
    14: (t, x, y, r) => { t.fillStyle = 'rgba(255,255,255,.55)'; E(t, x - r * .35, y - r * .78, r * .3, r * .08, -.4); E(t, x + r * .3, y - r * .72, r * .22, r * .06, .4); E(t, x - r * .75, y - r * .3, r * .06, r * .25, .2); },
    16: (t, x, y, r, hc) => { t.strokeStyle = shade(hc, -45); t.lineWidth = r * .045; for (let k = 0; k < 4; k++) { t.beginPath(); for (let i = 0; i <= 12; i++) { const xx = x - r * 1.2 + i * r * .2, yy = y - r * (1 - k * .22) + Math.sin(i * 1.4) * r * .05; i ? t.lineTo(xx, yy) : t.moveTo(xx, yy); } t.stroke(); } },
    17: (t, x, y, r, hc) => { t.strokeStyle = shade(hc, -45); t.lineWidth = r * .035; for (let i = 0; i < 22; i++) { t.beginPath(); t.arc(x + r * (((i * 29) % 17) / 17 * 2.2 - 1.1), y - r * (.1 + ((i * 41) % 13) / 13 * 1.1), r * .08, 0, 5.5); t.stroke(); } },
    18: (t, x, y, r) => { t.save(); t.globalCompositeOperation = 'destination-out'; t.fillRect(x - r * 2, y - r * 2, r * 1.45, r * 4); t.restore(); }
  };
  const HTOP = { // (drawn on top of the hair, may go past it)
    15: (g, x, y, r, hc) => { for (const [a, b, c] of [[-.5, -.9, -.8], [-.1, -1.05, -.3], [.35, -.95, .5], [.7, -.6, .9]]) line(g, hc, r * .05, x + r * a, y + r * b, x + r * (a + c * .15), y + r * (b - .25)); },
    18: (g, x, y, r) => { g.fillStyle = 'rgba(40,30,30,.35)'; for (let i = 0; i < 14; i++) C(g, x - r * (.55 + ((i * 7) % 5) * .08), y - r * (.2 + ((i * 11) % 9) * .07), r * .02); },
    19: (g, x, y, r) => line(g, '#2bd6ff', r * .13, x - r * .45, y - r * 1.0, x - r * .75, y - r * .6, x - r * .8, y - r * .15)
  };
  const HSHAPE = { 1: [-1, 1], 2: [1.15, 1.15], 4: [1, 1.2], 5: [1.15, 1], 6: [.9, 1] }; // [x, y] scale of the hair (Flipped, Big, Tall, Wide, Slim)
  /** Draw a hair layer (back or front) with its version: shape, then paint over the hair only. */
  function hairLayer(g, fn, hv, hx, hy, hr, hc) {
    const sh = HSHAPE[hv], fx = HFX[hv], draw0 = gg => { if (!sh) return fn(gg); gg.save(); gg.translate(hx, hy + hr * .1); gg.scale(sh[0], sh[1]); gg.translate(-hx, -hy - hr * .1); fn(gg); gg.restore(); };
    if (!fx || typeof document === 'undefined' || !g.getTransform) return draw0(g);
    const c = document.createElement('canvas'); c.width = g.canvas.width; c.height = g.canvas.height; const t = c.getContext('2d'); t.setTransform(g.getTransform()); t.lineJoin = t.lineCap = 'round';
    t.fillStyle = hc; t.strokeStyle = hc; draw0(t); t.globalCompositeOperation = 'source-atop'; t.save(); fx(t, hx, hy, hr, hc); t.restore();
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.drawImage(c, 0, 0); g.restore();
  }
  // 🎩 head accessories (1.59.4, Derek: their own part, 50 of them; 1 = none). Head centre x, y; radius r.
  const hatBrim = (g, x, y, r, c, w = 1.25, h = .16) => { g.fillStyle = shade(c, -25); E(g, x, y - r * .5, r * w, r * h); };
  const ACC = [null,
    (g, x, y, r, c) => { g.strokeStyle = c; g.lineWidth = r * .14; g.beginPath(); g.arc(x, y, r * 1.0, PI * 1.12, PI * 1.88); g.stroke(); },
    (g, x, y, r) => { g.fillStyle = '#ff4f9a'; const bx = x + r * .55, by = y - r * .88; poly(g, bx, by, bx - r * .32, by - r * .18, bx - r * .32, by + r * .18); poly(g, bx, by, bx + r * .32, by - r * .18, bx + r * .32, by + r * .18); g.fillStyle = '#c8186a'; C(g, bx, by, r * .08); },
    (g, x, y, r) => { const fx = x - r * .62, fy = y - r * .8; g.fillStyle = '#ffd1e8'; for (let k = 0; k < 5; k++) { const a = k * PI * .4; C(g, fx + Math.cos(a) * r * .1, fy + Math.sin(a) * r * .1, r * .085); } g.fillStyle = '#ffd23a'; C(g, fx, fy, r * .06); },
    (g, x, y, r) => { g.save(); g.translate(x + r * .55, y - r * .62); g.rotate(-.6); g.fillStyle = '#ffd23a'; g.fillRect(-r * .2, -r * .05, r * .4, r * .1); g.fillStyle = '#ff6a3d'; C(g, 0, 0, r * .05); g.restore(); },
    (g, x, y, r) => { g.fillStyle = '#d8283a'; g.beginPath(); g.arc(x, y, r * 1.06, PI * 1.05, PI * 1.95); g.quadraticCurveTo(x, y - r * .5, x - r * 1.03, y - r * .3); g.fill(); g.fillStyle = '#fff'; for (const [a, b] of [[-.5, -.8], [0, -.92], [.5, -.78]]) C(g, x + r * a, y + r * b, r * .05); g.fillStyle = '#d8283a'; poly(g, x + r * .95, y - r * .35, x + r * 1.3, y - r * .15, x + r * 1.15, y - r * .05); poly(g, x + r * .95, y - r * .3, x + r * 1.25, y + r * .1, x + r * 1.05, y + r * .12); },
    (g, x, y, r) => { g.strokeStyle = '#f4f4f0'; g.lineWidth = r * .2; g.beginPath(); g.arc(x, y + r * .08, r * .98, PI * 1.14, PI * 1.86); g.stroke(); g.strokeStyle = '#d8283a'; g.lineWidth = r * .05; g.beginPath(); g.arc(x, y + r * .08, r * .98, PI * 1.14, PI * 1.86); g.stroke(); },
    (g, x, y, r) => { g.fillStyle = '#1a1a22'; E(g, x - r * .3, y - r * .82, r * .25, r * .15); E(g, x + r * .3, y - r * .82, r * .25, r * .15); line(g, '#1a1a22', r * .06, x - r * .08, y - r * .84, x + r * .08, y - r * .84); g.fillStyle = 'rgba(255,255,255,.35)'; E(g, x - r * .36, y - r * .87, r * .08, r * .04); E(g, x + r * .24, y - r * .87, r * .08, r * .04); },
    (g, x, y, r, c) => { g.strokeStyle = '#2a2a33'; g.lineWidth = r * .1; g.beginPath(); g.arc(x, y, r * 1.12, PI * 1.02, PI * 1.98); g.stroke(); for (const s of [-1, 1]) { g.fillStyle = '#3a3a48'; E(g, x + s * r * 1.04, y - r * .02, r * .2, r * .3); g.fillStyle = c; E(g, x + s * r * 1.08, y - r * .02, r * .09, r * .16); } },
    (g, x, y, r, c, hc) => { for (const s of [-1, 1]) { g.fillStyle = hc; poly(g, x + s * r * .25, y - r * .9, x + s * r * .55, y - r * 1.45, x + s * r * .85, y - r * .7); g.fillStyle = '#ff9ab8'; poly(g, x + s * r * .38, y - r * .88, x + s * r * .55, y - r * 1.25, x + s * r * .72, y - r * .76); } },
    (g, x, y, r) => { for (const s of [-1, 1]) { g.fillStyle = '#f4f4f0'; E(g, x + s * r * .32, y - r * 1.45, r * .15, r * .5, s * .15); g.fillStyle = '#ffb0c8'; E(g, x + s * r * .32, y - r * 1.45, r * .07, r * .36, s * .15); } },
    (g, x, y, r) => { g.fillStyle = '#c8102e'; for (const s of [-1, 1]) { g.beginPath(); g.moveTo(x + s * r * .3, y - r * .85); g.quadraticCurveTo(x + s * r * .5, y - r * 1.25, x + s * r * .72, y - r * 1.4); g.quadraticCurveTo(x + s * r * .62, y - r * 1.05, x + s * r * .62, y - r * .78); g.closePath(); g.fill(); } },
    (g, x, y, r) => { g.save(); g.shadowColor = '#ffe98a'; g.shadowBlur = r * .4; g.strokeStyle = '#ffd23a'; g.lineWidth = r * .09; g.beginPath(); g.ellipse(x, y - r * 1.38, r * .55, r * .14, 0, 0, 7); g.stroke(); g.restore(); },
    (g, x, y, r) => { g.fillStyle = '#ffc93a'; poly(g, x - r * .55, y - r * .78, x - r * .6, y - r * 1.3, x - r * .3, y - r * 1.05, x, y - r * 1.4, x + r * .3, y - r * 1.05, x + r * .6, y - r * 1.3, x + r * .55, y - r * .78); g.fillStyle = '#e8304a'; C(g, x, y - r * .95, r * .08); g.fillStyle = '#2bd6ff'; C(g, x - r * .32, y - r * .92, r * .06); C(g, x + r * .32, y - r * .92, r * .06); },
    (g, x, y, r) => { g.fillStyle = '#e8e8f4'; poly(g, x - r * .5, y - r * .82, x - r * .3, y - r * 1.02, x - r * .15, y - r * .95, x, y - r * 1.2, x + r * .15, y - r * .95, x + r * .3, y - r * 1.02, x + r * .5, y - r * .82, x, y - r * .9); g.fillStyle = '#ff6ab8'; C(g, x, y - r * 1.04, r * .07); },
    (g, x, y, r, c) => { g.save(); g.translate(x + r * .65, y - r * .95); g.rotate(.7); g.fillStyle = c; E(g, 0, -r * .3, r * .12, r * .42); line(g, shade(c, -50), r * .03, 0, r * .15, 0, -r * .7); g.restore(); },
    // hats
    (g, x, y, r, c) => { g.fillStyle = c; g.beginPath(); g.arc(x, y - r * .35, r * 1.02, PI, 0); g.fill(); g.fillStyle = shade(c, -30); E(g, x + r * .55, y - r * .38, r * .62, r * .12); g.fillStyle = shade(c, 30); C(g, x, y - r * 1.36, r * .07); },
    (g, x, y, r, c) => { g.fillStyle = c; g.beginPath(); g.arc(x, y - r * .35, r * 1.02, PI, 0); g.fill(); g.fillStyle = shade(c, -30); E(g, x - r * .7, y - r * .4, r * .45, r * .1); g.fillStyle = '#fff'; g.fillRect(x - r * .12, y - r * .55, r * .24, r * .12); },
    (g, x, y, r, c) => { g.fillStyle = c; g.beginPath(); g.arc(x, y - r * .3, r * 1.05, PI, 0); g.fill(); g.fillStyle = shade(c, -25); g.fillRect(x - r * 1.08, y - r * .48, r * 2.16, r * .26); },
    (g, x, y, r, c) => { g.fillStyle = c; g.beginPath(); g.arc(x, y - r * .3, r * 1.05, PI, 0); g.fill(); g.fillStyle = shade(c, -25); g.fillRect(x - r * 1.08, y - r * .48, r * 2.16, r * .26); g.fillStyle = '#f4f4f0'; C(g, x, y - r * 1.42, r * .2); },
    (g, x, y, r) => { const c = '#8a5a2a'; hatBrim(g, x, y, r, c, 1.7, .22); g.fillStyle = c; poly(g, x - r * .75, y - r * .5, x - r * .65, y - r * 1.35, x - r * .2, y - r * 1.2, x, y - r * 1.35, x + r * .2, y - r * 1.2, x + r * .65, y - r * 1.35, x + r * .75, y - r * .5); g.fillStyle = '#5a3a1a'; g.fillRect(x - r * .72, y - r * .72, r * 1.44, r * .1); },
    (g, x, y, r) => { hatBrim(g, x, y, r, '#2a2a33', 1.25, .14); g.fillStyle = '#1a1a22'; g.fillRect(x - r * .62, y - r * 1.75, r * 1.24, r * 1.25); g.fillStyle = '#c8102e'; g.fillRect(x - r * .62, y - r * .78, r * 1.24, r * .14); },
    (g, x, y, r) => { hatBrim(g, x, y, r, '#2a2a33', 1.2, .14); g.fillStyle = '#1a1a22'; g.beginPath(); g.arc(x, y - r * .55, r * .72, PI, 0); g.fill(); },
    (g, x, y, r) => { hatBrim(g, x, y, r, '#3a3a48', 1.4, .16); g.fillStyle = '#4a4a5a'; poly(g, x - r * .7, y - r * .55, x - r * .55, y - r * 1.25, x, y - r * 1.1, x + r * .55, y - r * 1.25, x + r * .7, y - r * .55); g.fillStyle = '#1a1a22'; g.fillRect(x - r * .7, y - r * .72, r * 1.4, r * .12); },
    (g, x, y, r, c) => { g.fillStyle = c; poly(g, x - r * .55, y - r * .72, x + r * .1, y - r * 1.9, x + r * .55, y - r * .72); g.fillStyle = '#ffd23a'; for (const t of [.25, .5, .75]) C(g, x - r * .55 + (r * .65) * t + r * .3 * t, y - r * .72 - r * 1.18 * t, r * .06); g.fillStyle = '#fff'; C(g, x + r * .1, y - r * 1.92, r * .12); },
    (g, x, y, r) => { hatBrim(g, x, y, r, '#3a2a8a', 1.5, .18); g.fillStyle = '#4a3aaa'; poly(g, x - r * .75, y - r * .55, x + r * .25, y - r * 2.1, x + r * .75, y - r * .55); g.fillStyle = '#ffd23a'; star(g, x, y - r * 1.05, r * .14); star(g, x + r * .25, y - r * 1.5, r * .09); },
    (g, x, y, r) => { hatBrim(g, x, y, r, '#1a1a22', 1.6, .18); g.fillStyle = '#22182e'; poly(g, x - r * .7, y - r * .55, x + r * .45, y - r * 2.0, x + r * .7, y - r * .55); g.fillStyle = '#8a3ad8'; g.fillRect(x - r * .68, y - r * .74, r * 1.36, r * .14); },
    (g, x, y, r) => { g.fillStyle = '#d8283a'; poly(g, x - r * .95, y - r * .55, x - r * .2, y - r * 1.55, x + r * 1.05, y - r * 1.0, x + r * .95, y - r * .55); g.fillStyle = '#fff'; g.fillRect(x - r * 1.0, y - r * .68, r * 2.0, r * .22); C(g, x + r * 1.08, y - r * .95, r * .16); },
    (g, x, y, r) => { g.fillStyle = '#1a1a22'; g.beginPath(); g.moveTo(x - r * 1.3, y - r * .55); g.quadraticCurveTo(x, y - r * 1.9, x + r * 1.3, y - r * .55); g.quadraticCurveTo(x, y - r * .85, x - r * 1.3, y - r * .55); g.fill(); g.fillStyle = '#f4f4f0'; C(g, x, y - r * 1.05, r * .14); line(g, '#f4f4f0', r * .04, x - r * .14, y - r * .88, x + r * .14, y - r * .76); line(g, '#f4f4f0', r * .04, x + r * .14, y - r * .88, x - r * .14, y - r * .76); },
    (g, x, y, r) => { g.fillStyle = '#f4f4f0'; g.fillRect(x - r * .62, y - r * .95, r * 1.24, r * .45); for (const a of [-.4, 0, .4]) C(g, x + r * a, y - r * 1.2, r * .38); },
    (g, x, y, r) => { g.fillStyle = '#ffc81e'; g.beginPath(); g.arc(x, y - r * .38, r * 1.0, PI, 0); g.fill(); g.fillStyle = '#e0a800'; g.fillRect(x - r * 1.2, y - r * .48, r * 2.4, r * .14); g.fillRect(x - r * .08, y - r * 1.38, r * .16, r * .9); },
    (g, x, y, r) => { g.fillStyle = '#1a1a22'; poly(g, x - r * 1.15, y - r * .95, x, y - r * 1.3, x + r * 1.15, y - r * .95, x, y - r * .6); g.fillRect(x - r * .55, y - r * .9, r * 1.1, r * .35); line(g, '#ffd23a', r * .04, x + r * .3, y - r * .95, x + r * .9, y - r * .7, x + r * .95, y - r * .35); g.fillStyle = '#ffd23a'; C(g, x + r * .95, y - r * .32, r * .06); },
    (g, x, y, r) => { g.fillStyle = '#9a9aa8'; g.beginPath(); g.arc(x, y - r * .35, r * 1.02, PI, 0); g.fill(); g.fillStyle = '#7a7a88'; g.fillRect(x - r * 1.05, y - r * .5, r * 2.1, r * .16); g.fillStyle = '#f4f0e0'; for (const s of [-1, 1]) { g.beginPath(); g.moveTo(x + s * r * .85, y - r * .7); g.quadraticCurveTo(x + s * r * 1.45, y - r * .9, x + s * r * 1.4, y - r * 1.6); g.quadraticCurveTo(x + s * r * 1.15, y - r * 1.05, x + s * r * .7, y - r * .95); g.fill(); } },
    (g, x, y, r) => { for (let i = 0; i < 4; i++) { g.fillStyle = ['#e8304a', '#ffd23a', '#2b9aff', '#3ad86a'][i]; g.beginPath(); g.moveTo(x, y - r * .4); g.arc(x, y - r * .4, r * 1.02, PI + i * PI / 4, PI + (i + 1) * PI / 4); g.fill(); } g.fillStyle = '#e8304a'; E(g, x - r * .3, y - r * 1.55, r * .3, r * .07); E(g, x + r * .3, y - r * 1.55, r * .3, r * .07); line(g, '#555', r * .05, x, y - r * 1.4, x, y - r * 1.55); },
    (g, x, y, r) => { g.fillStyle = '#c8102e'; E(g, x - r * .15, y - r * .82, r * 1.0, r * .3, -.12); C(g, x - r * .1, y - r * 1.1, r * .06); },
    (g, x, y, r, c) => { g.fillStyle = c; poly(g, x - r * 1.25, y - r * .4, x - r * .75, y - r * 1.15, x + r * .75, y - r * 1.15, x + r * 1.25, y - r * .4); g.fillStyle = shade(c, -25); g.fillRect(x - r * .78, y - r * .7, r * 1.56, r * .1); },
    (g, x, y, r, c) => { g.fillStyle = c; g.beginPath(); g.ellipse(x + r * .55, y - r * .52, r * .75, r * .12, 0, 0, 7); g.fill(); g.strokeStyle = c; g.lineWidth = r * .14; g.beginPath(); g.arc(x, y, r * 1.0, PI * 1.15, PI * 1.85); g.stroke(); },
    (g, x, y, r) => { for (let k = 0; k < 9; k++) { const a = PI * (1.08 + k * .105), fx = x + Math.cos(a) * r * 1.0, fy = y + Math.sin(a) * r * 1.0; g.fillStyle = ['#ff8ac0', '#ffd23a', '#9ad0ff', '#c8a0ff'][k % 4]; for (let p = 0; p < 5; p++) { const b = p * PI * .4; C(g, fx + Math.cos(b) * r * .07, fy + Math.sin(b) * r * .07, r * .065); } g.fillStyle = '#fff'; C(g, fx, fy, r * .04); } },
    (g, x, y, r) => { g.strokeStyle = '#8a5a2a'; g.lineWidth = r * .1; for (const s of [-1, 1]) { g.beginPath(); g.moveTo(x + s * r * .4, y - r * .85); g.lineTo(x + s * r * .65, y - r * 1.55); g.moveTo(x + s * r * .52, y - r * 1.2); g.lineTo(x + s * r * .9, y - r * 1.35); g.moveTo(x + s * r * .6, y - r * 1.45); g.lineTo(x + s * r * .4, y - r * 1.75); g.stroke(); } },
    (g, x, y, r) => { const gr = g.createLinearGradient(x - r * .15, y - r * 1.8, x + r * .15, y - r * .9); gr.addColorStop(0, '#ffd1f0'); gr.addColorStop(1, '#9ad0ff'); g.fillStyle = gr; poly(g, x - r * .15, y - r * .95, x, y - r * 1.85, x + r * .15, y - r * .95); },
    (g, x, y, r) => { for (const s of [-1, 1]) { line(g, '#3ad86a', r * .05, x + s * r * .3, y - r * .9, x + s * r * .5, y - r * 1.5); g.fillStyle = '#a6ff2b'; C(g, x + s * r * .5, y - r * 1.55, r * .1); } },
    (g, x, y, r) => { for (const s of [-1, 1]) { line(g, '#1a1a22', r * .05, x + s * r * .25, y - r * .9, x + s * r * .4, y - r * 1.3, x + s * r * .55, y - r * 1.38); g.fillStyle = '#1a1a22'; C(g, x + s * r * .58, y - r * 1.38, r * .08); } },
    (g, x, y, r) => { for (const s of [-1, 1]) { g.fillStyle = '#2a2a33'; C(g, x + s * r * .75, y - r * .95, r * .38); g.fillStyle = '#ffb0c8'; C(g, x + s * r * .75, y - r * .95, r * .22); } },
    (g, x, y, r, c, hc) => { for (const s of [-1, 1]) { g.fillStyle = hc; C(g, x + s * r * .7, y - r * .85, r * .24); g.fillStyle = shade(hc, -30); C(g, x + s * r * .7, y - r * .85, r * .12); } },
    (g, x, y, r) => { for (const s of [-1, 1]) { g.fillStyle = '#e07a2a'; poly(g, x + s * r * .25, y - r * .88, x + s * r * .6, y - r * 1.5, x + s * r * .88, y - r * .65); g.fillStyle = '#f4f4f0'; poly(g, x + s * r * .45, y - r * .9, x + s * r * .6, y - r * 1.3, x + s * r * .72, y - r * .78); } },
    // face
    (g, x, y, r) => { g.strokeStyle = '#1a1a22'; g.lineWidth = r * .06; for (const s of [-1, 1]) { g.beginPath(); g.arc(x + s * r * .35, y - r * .05, r * .24, 0, 7); g.stroke(); } line(g, '#1a1a22', r * .05, x - r * .11, y - r * .08, x + r * .11, y - r * .08); },
    (g, x, y, r) => { g.fillStyle = '#111'; for (const s of [-1, 1]) E(g, x + s * r * .36, y - r * .03, r * .27, r * .2); line(g, '#111', r * .06, x - r * .62, y - r * .1, x + r * .62, y - r * .1); g.fillStyle = 'rgba(255,255,255,.35)'; E(g, x - r * .44, y - r * .1, r * .08, r * .04); E(g, x + r * .28, y - r * .1, r * .08, r * .04); },
    (g, x, y, r) => { g.fillStyle = '#ff4f9a'; for (const s of [-1, 1]) star(g, x + s * r * .37, y - r * .04, r * .3); g.fillStyle = 'rgba(30,10,30,.55)'; for (const s of [-1, 1]) star(g, x + s * r * .37, y - r * .04, r * .17); line(g, '#ff4f9a', r * .05, x - r * .1, y - r * .08, x + r * .1, y - r * .08); },
    (g, x, y, r) => { g.fillStyle = '#111'; E(g, x - r * .35, y - r * .05, r * .22, r * .2); line(g, '#111', r * .04, x - r * .95, y - r * .45, x + r * .95, y + r * .25); },
    (g, x, y, r) => { g.strokeStyle = '#d4a82a'; g.lineWidth = r * .05; g.beginPath(); g.arc(x + r * .35, y - r * .05, r * .24, 0, 7); g.stroke(); line(g, '#d4a82a', r * .025, x + r * .55, y + r * .1, x + r * .62, y + r * .55); },
    (g, x, y, r) => { line(g, '#5a3a1a', r * .12, x - r * .98, y - r * .55, x + r * .98, y - r * .55); for (const s of [-1, 1]) { g.fillStyle = '#5a3a1a'; C(g, x + s * r * .36, y - r * .62, r * .26); g.fillStyle = '#7ad0ff'; C(g, x + s * r * .36, y - r * .62, r * .18); g.fillStyle = 'rgba(255,255,255,.6)'; C(g, x + s * r * .32, y - r * .67, r * .05); } }
  ];
  // outfit versions: a pattern on the outfit (16–19 change its colour)
  const OUTCOL = { 16: () => '#d4a82a', 17: () => '#1c2240', 18: b => ['#ffb0d8', '#9ad0ff', '#b8eca0', '#ffe98a', '#d4b8ff'][b % 5], 19: b => ['#ff2bd6', '#2bd6ff', '#a6ff2b', '#ff8a2b', '#ffe12b'][b % 5] };
  const outCol = (n, col) => { const [b, v] = sp('outfit', n); return OUTCOL[v] ? OUTCOL[v](b) : col; };
  const OPAT = [null,
    q => q.hs('rgba(255,255,255,.3)', 5, .07),
    q => { for (let x = -.6; x <= .61; x += .1) q.L('rgba(255,255,255,.32)', .012, x, 0, x, q.H + .1); },
    q => q.dots('rgba(255,255,255,.38)', .17, .035),
    q => { q.hs('rgba(0,0,0,.2)', 4, .07); for (let x = -.55; x <= .6; x += .28) q.R(x, 0, .07, q.H + .2, 'rgba(0,0,0,.2)'); q.hs('rgba(255,255,255,.22)', 8, .012); },
    q => { const cs = ['rgba(60,80,40,.6)', 'rgba(110,90,50,.6)', 'rgba(30,40,25,.6)']; [[-.4, .1], [.2, .05], [-.1, .35], [.4, .4], [-.45, .6], [.1, .7], [.45, .8], [-.2, .9]].forEach(([x, y], i) => q.E(x, y, .16, .09, cs[i % 3], i)); },
    q => { for (let y = .1, k = 0; y < q.H + .1; y += .2, k++) for (let x = -.55 + (k % 2) * .12; x < .6; x += .24) q.S(x, y, .05, 'rgba(255,240,150,.9)'); },
    q => { q.g.fillStyle = 'rgba(255,90,140,.85)'; for (let y = .1, k = 0; y < q.H + .1; y += .2, k++) for (let x = -.55 + (k % 2) * .12; x < .6; x += .24) heart(q.g, q.X(x), q.Y(y), q.rr * .05); },
    q => { const b = q.H + .12; for (let i = 0; i < 7; i++) { const x = -.6 + i * .2; q.P('rgba(255,120,30,.85)', x - .1, b, x, b - .45 - (i % 2) * .15, x + .1, b); q.P('rgba(255,220,60,.9)', x - .05, b, x, b - .25 - (i % 2) * .08, x + .05, b); } },
    q => { for (const y of [.18, .45, .72]) { const p = []; for (let i = 0; i <= 12; i++) p.push(-.65 + i * .11, y + (i % 2 ? -.05 : .05)); q.L('rgba(255,255,255,.45)', .025, ...p); } },
    q => { const s = .14; for (let y = 0, k = 0; y < q.H + .1; y += s, k++) for (let x = -.7 + (k % 2) * s; x < .7; x += s * 2) q.R(x, y, s, s, 'rgba(0,0,0,.22)'); },
    q => { for (let y = .1, k = 0; y < q.H + .1; y += .18, k++) for (let x = -.6 + (k % 2) * .1; x < .65; x += .2) q.P('rgba(255,255,255,.28)', x, y - .07, x + .05, y, x, y + .07, x - .05, y); },
    q => { q.g.fillStyle = 'rgba(255,255,255,.9)'; [[-.45, .12], [.3, .2], [-.15, .45], [.48, .55], [-.5, .75], [.12, .82], [0, .2]].forEach(([x, y]) => twinkle(q.g, q.X(x), q.Y(y), q.rr * .045)); },
    q => q.P('#ffd23a', .12, .02, -.18, .42, .02, .42, -.12, .9, .22, .36, .02, .36),
    q => q.P('rgba(255,210,60,.9)', -.62, .02, -.45, .02, .62, q.H - .05, .62, q.H + .15, .45, q.H + .15, -.62, .2),
    q => q.R(0, 0, .7, q.H + .2, 'rgba(0,0,0,.35)')
  ];
  const tint = (q, n, fixed) => { const [b, v] = sp('outfit', n); if (OUTCOL[v] && fixed) q.R(-.7, 0, 1.4, q.H + .2, OUTCOL[v](b) + '73'); };
  // makeup versions: drawn on the face
  // 🎀 HAIR ACCESSORIES (1.60.4, Derek: "they are their own thing"): worn in the hair, together with a head accessory. 1 = none.
  const bow = (g, bx, by, sz, col, rot = 0) => { g.save(); g.translate(bx, by); g.rotate(rot); g.fillStyle = col; poly(g, 0, 0, -sz, -sz * .62, -sz * .92, sz * .62); poly(g, 0, 0, sz, -sz * .62, sz * .92, sz * .62); g.fillStyle = shade(col, -45); C(g, 0, 0, sz * .28); g.fillStyle = 'rgba(255,255,255,.3)'; E(g, -sz * .55, -sz * .25, sz * .18, sz * .1, -.4); g.restore(); };
  const flower = (g, fx, fy, sz, petal, mid, n = 5) => { g.fillStyle = petal; for (let k = 0; k < n; k++) { const a = k * 2 * PI / n; E(g, fx + Math.cos(a) * sz * .55, fy + Math.sin(a) * sz * .55, sz * .48, sz * .36, a); } g.fillStyle = mid; C(g, fx, fy, sz * .32); };
  const star5 = (g, sx0, sy0, sz, col) => { g.fillStyle = col; g.beginPath(); for (let i = 0; i < 10; i++) { const a = -PI / 2 + i * PI / 5, rr = i % 2 ? sz * .45 : sz; g.lineTo(sx0 + Math.cos(a) * rr, sy0 + Math.sin(a) * rr); } g.closePath(); g.fill(); };
  const heartC = (g, hx0, hy0, sz, col) => { g.fillStyle = col; g.beginPath(); g.moveTo(hx0, hy0 + sz * .9); g.bezierCurveTo(hx0 - sz * 1.3, hy0 - sz * .1, hx0 - sz * .6, hy0 - sz * 1.1, hx0, hy0 - sz * .35); g.bezierCurveTo(hx0 + sz * .6, hy0 - sz * 1.1, hx0 + sz * 1.3, hy0 - sz * .1, hx0, hy0 + sz * .9); g.fill(); };
  const band = (g, x, y, r, w, col, a0 = 1.12, a1 = 1.88, rad = 1) => { g.strokeStyle = col; g.lineWidth = r * w; g.lineCap = 'round'; g.beginPath(); g.arc(x, y, r * rad, PI * a0, PI * a1); g.stroke(); };
  const onArc = (x, y, r, a, rad = 1) => [x + Math.cos(PI * a) * r * rad, y + Math.sin(PI * a) * r * rad];
  const pearl = (g, px, py, pr) => { g.fillStyle = '#f6f2ea'; C(g, px, py, pr); g.fillStyle = 'rgba(255,255,255,.9)'; C(g, px - pr * .3, py - pr * .3, pr * .35); };
  const HAIRACC = [null,
    (g, x, y, r) => band(g, x, y, r, .12, '#ff5fa2'), // 2 headband
    (g, x, y, r) => { band(g, x, y, r, .24, '#2bb5a8'); g.fillStyle = '#fff'; for (let k = 0; k < 9; k++) C(g, ...onArc(x, y, r, 1.16 + k * .085), r * .035); }, // 3 wide headband
    (g, x, y, r) => bow(g, x, y - r * 1.02, r * .32, '#e8304a'), // 4 top bow
    (g, x, y, r) => bow(g, x + r * .72, y - r * .72, r * .24, '#9b5cff', .6), // 5 side bow
    (g, x, y, r) => bow(g, x, y - r * 1.1, r * .5, '#22202e'), // 6 big back bow
    (g, x, y, r) => { flower(g, x - r * .72, y - r * .62, r * .3, '#ff4f6d', '#ffd23a'); line(g, '#ffe98a', r * .03, x - r * .72, y - r * .62, x - r * .55, y - r * .78); }, // 7 hibiscus
    (g, x, y, r) => { for (const sd of [-1, 1]) flower(g, x + sd * r * .68, y - r * .66, r * .17, '#ffffff', '#ffc93a', 8); }, // 8 two daisies
    (g, x, y, r) => { for (let k = 0; k < 5; k++) pearl(g, x + r * (.4 + k * .12), y - r * (.88 - k * .12), r * .075); }, // 9 pearl clip
    (g, x, y, r) => { for (const [sd, c] of [[-1, '#ffc93a'], [1, '#ff7ab6']]) { g.save(); g.translate(x + sd * r * .7, y - r * .62); g.rotate(sd * .8); g.fillStyle = c; g.fillRect(-r * .27, -r * .07, r * .54, r * .14); g.fillStyle = 'rgba(255,255,255,.45)'; g.fillRect(-r * .24, -r * .055, r * .48, r * .035); g.restore(); } }, // 10 two barrettes
    (g, x, y, r) => { for (const [a, c] of [[1.22, '#4fc3ff'], [1.5, '#ff7ab6'], [1.76, '#ffd23a']]) { const [bx, by] = onArc(x, y, r, a, .98); g.fillStyle = c; E(g, bx - r * .1, by - r * .04, r * .11, r * .08, -.5); E(g, bx + r * .1, by - r * .04, r * .11, r * .08, .5); E(g, bx - r * .07, by + r * .07, r * .07, r * .055, .4); E(g, bx + r * .07, by + r * .07, r * .07, r * .055, -.4); g.fillStyle = '#2a2a33'; E(g, bx, by, r * .015, r * .07); } }, // 11 butterfly clips
    (g, x, y, r) => { for (const [a, sz] of [[1.62, .15], [1.74, .12], [1.85, .1]]) star5(g, ...onArc(x, y, r, a, .97), r * sz, '#ffd23a'); }, // 12 star clips
    (g, x, y, r) => { for (const [a, sz] of [[1.2, .13], [1.34, .11]]) heartC(g, ...onArc(x, y, r, a, .97), r * sz, '#e8304a'); }, // 13 heart clips
    (g, x, y, r) => { const bx = x, by = y - r * 1.05; for (let k = 0; k < 12; k++) { const a = k / 12 * 2 * PI; g.fillStyle = k % 2 ? '#ff8ac0' : '#ff6ab0'; C(g, bx + Math.cos(a) * r * .2, by + Math.sin(a) * r * .09, r * .09); } }, // 14 top scrunchie
    (g, x, y, r) => { for (const sd of [-1, 1]) for (const k of [0, 1]) { g.fillStyle = sd < 0 ? '#ff4f6d' : '#4fc3ff'; C(g, x + sd * r * (.96 + k * .02), y - r * (.3 - k * .2), r * .09); g.fillStyle = 'rgba(255,255,255,.5)'; C(g, x + sd * r * .93, y - r * (.33 - k * .2), r * .03); } }, // 15 pigtail bobbles
    (g, x, y, r) => { for (const [sd, c] of [[-1, '#7a5cff'], [1, '#3ad17a']]) { g.save(); g.translate(x + sd * r * .93, y - r * .2); g.rotate(sd * .3); g.fillStyle = c; g.fillRect(-r * .06, -r * .1, r * .12, r * .2); g.restore(); } }, // 16 hair ties
    (g, x, y, r) => { band(g, x, y, r, .2, '#d8283a'); g.fillStyle = '#fff'; for (let k = 0; k < 7; k++) C(g, ...onArc(x, y, r, 1.18 + k * .1), r * .03); g.fillStyle = '#d8283a'; const [kx, ky] = onArc(x, y, r, 1.86); poly(g, kx, ky, kx + r * .22, ky - r * .12, kx + r * .18, ky + r * .08); poly(g, kx, ky, kx + r * .14, ky + r * .22, kx - r * .02, ky + r * .2); }, // 17 rolled bandana
    (g, x, y, r) => { for (let k = 0; k < 13; k++) pearl(g, ...onArc(x, y, r, 1.14 + k * .06), r * .05); }, // 18 pearl headband
    (g, x, y, r) => { const cols = ['#ffd23a', '#ff4f6d', '#4fc3ff', '#3ad17a']; for (const sd of [-1, 1]) for (let k = 0; k < 5; k++) { g.fillStyle = cols[(k + (sd > 0 ? 2 : 0)) % 4]; C(g, x + sd * r * (.93 + k * .01), y - r * .35 + k * r * .14, r * .05); } }, // 19 hair beads
    (g, x, y, r) => { g.save(); g.translate(x + r * .78, y - r * .72); g.rotate(.9); g.fillStyle = '#1a8a7a'; E(g, 0, -r * .28, r * .12, r * .34); g.fillStyle = '#3a4ad8'; E(g, 0, -r * .44, r * .07, r * .09); g.fillStyle = '#ffd23a'; C(g, 0, -r * .44, r * .03); line(g, '#c8a46a', r * .025, 0, r * .05, 0, -r * .6); g.restore(); }, // 20 feather clip
    (g, x, y, r) => { bow(g, x + r * .62, y - r * .82, r * .22, '#3a7bff', .5); g.strokeStyle = '#3a7bff'; g.lineWidth = r * .07; g.lineCap = 'round'; for (const k of [0, 1]) { g.beginPath(); g.moveTo(x + r * .66, y - r * .78); g.quadraticCurveTo(x + r * (1.05 + k * .1), y - r * .2, x + r * (.95 + k * .15), y + r * (.4 + k * .1)); g.stroke(); } }, // 21 ribbon
    (g, x, y, r) => { for (const a of [.6, -.6]) { g.save(); g.translate(x - r * .7, y - r * .55); g.rotate(a); line(g, '#d8dde6', r * .055, -r * .24, 0, r * .24, 0); g.restore(); } }, // 22 bobby pins
    (g, x, y, r) => { for (const sd of [-1, 1]) { line(g, '#7a4a20', r * .05, x - sd * r * .55, y - r * 1.3, x + sd * r * .35, y - r * .82); g.fillStyle = '#d8283a'; C(g, x - sd * r * .55, y - r * 1.3, r * .05); } }, // 23 hair sticks
    (g, x, y, r) => { band(g, x, y, r, .08, '#d8b24a', 1.58, 1.82, .95); for (const [a, c] of [[1.62, '#e8304a'], [1.7, '#4fc3ff'], [1.78, '#3ad17a']]) { g.fillStyle = c; C(g, ...onArc(x, y, r, a, .95), r * .045); } }, // 24 jeweled comb
    (g, x, y, r) => { band(g, x, y, r, .04, '#3a8a3a'); for (let k = 0; k < 7; k++) flower(g, ...onArc(x, y, r, 1.16 + k * .113), r * .085, '#ffffff', '#ffc93a', 6); }, // 25 daisy chain
    (g, x, y, r) => { const bx = x + r * .74, by = y - r * .62; line(g, '#3a8a3a', r * .03, bx - r * .1, by + r * .05, bx, by - r * .18, bx + r * .12, by + r * .04); g.fillStyle = '#d8102a'; C(g, bx - r * .12, by + r * .09, r * .11); C(g, bx + r * .14, by + r * .08, r * .11); g.fillStyle = 'rgba(255,255,255,.55)'; C(g, bx - r * .13, by + r * .05, r * .025); C(g, bx + r * .09, by + r * .04, r * .025); g.fillStyle = '#3ad17a'; E(g, bx + r * .06, by - r * .16, r * .07, r * .035, -.5); }, // 26 cherry clip
    (g, x, y, r) => { const pts = [[1.2, .9], [1.32, .96], [1.45, .88], [1.55, .97], [1.66, .9], [1.78, .95]]; pts.forEach(([a, rad], k) => { const [gx, gy] = onArc(x, y, r, a, rad), sz = r * (k % 2 ? .08 : .1); g.fillStyle = k % 2 ? '#ffb0e0' : '#ffffff'; poly(g, gx, gy - sz, gx + sz * .3, gy - sz * .3, gx + sz, gy, gx + sz * .3, gy + sz * .3, gx, gy + sz, gx - sz * .3, gy + sz * .3, gx - sz, gy, gx - sz * .3, gy - sz * .3); }); }, // 27 hair gems
    (g, x, y, r) => { for (const [dx, a, c] of [[0, -.6, '#2e9a3a'], [r * .12, .2, '#4cc04c']]) { g.save(); g.translate(x - r * .72 + dx, y - r * .66); g.rotate(a); g.fillStyle = c; E(g, 0, 0, r * .23, r * .095); line(g, 'rgba(0,0,0,.25)', r * .02, -r * .2, 0, r * .2, 0); g.restore(); } }, // 28 leaf clip
    (g, x, y, r) => { const bx = x + r * .72, by = y - r * .68; for (let k = 0; k < 6; k++) { const a = k * PI / 3, ex = bx + Math.cos(a) * r * .22, ey = by + Math.sin(a) * r * .22; line(g, '#bfe8ff', r * .045, bx, by, ex, ey); line(g, '#bfe8ff', r * .02, bx + Math.cos(a) * r * .09, by + Math.sin(a) * r * .09, bx + Math.cos(a + .5) * r * .13, by + Math.sin(a + .5) * r * .13); } g.fillStyle = '#fff'; C(g, bx, by, r * .03); }, // 29 snowflake clip
    (g, x, y, r) => { const bx = x - r * .7, by = y - r * .5; ['#e8304a', '#ff9a2a', '#ffd23a', '#3ad17a', '#3a7bff', '#9b5cff'].forEach((c, k) => { g.strokeStyle = c; g.lineWidth = r * .035; g.beginPath(); g.arc(bx, by, r * (.3 - k * .04), PI * 1.05, PI * 1.95); g.stroke(); }); }, // 30 rainbow clip
    (g, x, y, r, c, hc) => { for (let k = 0; k < 12; k++) { const [bx, by] = onArc(x, y, r, 1.13 + k * .068); g.fillStyle = k % 2 ? shade(hc, 60) : shade(hc, 30); E(g, bx, by, r * .08, r * .05, PI * (1.13 + k * .068) + PI / 2 + (k % 2 ? .5 : -.5)); } } // 31 braided headband
  ];
  const MACC = [
    (g, x, y, r) => { g.fillStyle = '#fff6b0'; for (const [a, b] of [[-.55, .2], [-.45, .32], [-.62, .36], [.55, .2], [.45, .32], [.62, .36], [-.5, -.32], [.5, -.32]]) twinkle(g, x + r * a, y + r * b, r * .05); },
    (g, x, y, r) => { g.fillStyle = 'rgba(140,70,30,.6)'; for (const s of [-1, 1]) for (const [a, b] of [[.35, .15], [.5, .12], [.42, .25], [.58, .24], [.2, .1]]) C(g, x + s * r * a, y + r * b, r * .028); },
    (g, x, y, r) => { g.fillStyle = 'rgba(255,90,130,.38)'; for (const s of [-1, 1]) E(g, x + s * r * .55, y + r * .22, r * .2, r * .11); },
    (g, x, y, r) => { g.fillStyle = '#2a1a14'; C(g, x + r * .3, y + r * .42, r * .035); },
    (g, x, y, r) => { g.fillStyle = 'rgba(255,200,80,.35)'; for (const s of [-1, 1]) E(g, x + s * r * .5, y + r * .12, r * .22, r * .1, s * .3); },
    (g, x, y, r) => { g.fillStyle = '#4ab8ff'; const tx = x + r * .38, ty = y + r * .2; g.beginPath(); g.moveTo(tx, ty - r * .1); g.quadraticCurveTo(tx + r * .07, ty, tx, ty + r * .05); g.quadraticCurveTo(tx - r * .07, ty, tx, ty - r * .1); g.fill(); },
    (g, x, y, r) => { g.fillStyle = '#ffd23a'; star(g, x + r * .55, y + r * .25, r * .11); },
    (g, x, y, r) => { g.fillStyle = '#ff3a6a'; heart(g, x - r * .55, y + r * .25, r * .1); },
    (g, x, y, r) => { for (const s of [-1, 1]) for (let i = 0; i < 3; i++) line(g, '#111', r * .03, x + s * r * (.25 + i * .09), y - r * .24, x + s * r * (.22 + i * .11), y - r * .34); },
    (g, x, y, r) => { g.save(); g.translate(x + r * .5, y + r * .25); g.rotate(-.5); g.fillStyle = '#e8c49a'; g.fillRect(-r * .2, -r * .07, r * .4, r * .14); g.fillStyle = '#c8a07a'; for (const d of [-.06, 0, .06]) C(g, r * d, 0, r * .015); g.restore(); },
    (g, x, y, r) => { line(g, 'rgba(150,40,40,.8)', r * .04, x - r * .5, y - r * .35, x - r * .2, y + r * .15); for (const t of [.25, .5, .75]) line(g, 'rgba(150,40,40,.8)', r * .025, x - r * (.5 - .3 * t) - r * .06, y - r * (.35 - .5 * t) - r * .03, x - r * (.5 - .3 * t) + r * .06, y - r * (.35 - .5 * t) + r * .03); },
    (g, x, y, r) => { g.fillStyle = 'rgba(150,20,30,.85)'; for (const s of [-1, 1]) { g.fillRect(x + s * r * .55 - r * .15, y + r * .12, r * .3, r * .06); g.fillRect(x + s * r * .55 - r * .15, y + r * .22, r * .3, r * .06); } },
    (g, x, y, r) => { g.fillStyle = 'rgba(230,60,40,.35)'; E(g, x, y + r * .12, r * .7, r * .16); },
    (g, x, y, r) => { for (const s of [-1, 1]) { g.strokeStyle = 'rgba(80,30,30,.7)'; g.lineWidth = r * .03; g.beginPath(); g.arc(x + s * r * .28, y + r * .34, r * .05, 0, PI); g.stroke(); } },
    (g, x, y, r) => { g.fillStyle = '#9af0ff'; for (const s of [-1, 1]) for (let i = 0; i < 3; i++) C(g, x + s * r * (.55 + i * .06), y - r * (.05 - i * .07), r * .03); },
    (g, x, y, r) => { g.strokeStyle = '#ffd23a'; g.lineWidth = r * .03; g.beginPath(); g.arc(x + r * .07, y + r * .17, r * .05, 0, 7); g.stroke(); },
    (g, x, y, r) => { g.strokeStyle = '#d8d8e0'; g.lineWidth = r * .03; g.beginPath(); g.arc(x + r * .5, y - r * .3, r * .05, 0, 7); g.stroke(); },
    (g, x, y, r) => { g.fillStyle = '#5ae0ff'; poly(g, x - r * .55, y + r * .12, x - r * .48, y + r * .2, x - r * .55, y + r * .28, x - r * .62, y + r * .2); },
    (g, x, y, r) => { g.fillStyle = '#fff'; for (const s of [-1, 1]) twinkle(g, x + s * r * .4, y - r * .1, r * .06); }
  ];
  // facial hair versions: 1–12 colour it, 13–14 size, 15–19 add something
  const FCOL = { 1: '#9a9a9a', 2: '#7a7a7a', 3: '#ecebe6', 4: '#b8501e', 5: '#e0c070', 6: '#1a1210', 7: '#3a6ad8', 8: '#e05aa8', 9: '#3aa85a', 10: '#7a3ad8', 11: '#2bd6ff' };
  const FACC = {
    2: (g, x, y, r) => { g.fillStyle = '#e8e8e8'; for (let i = 0; i < 14; i++) C(g, x + r * (((i * 37) % 13) / 13 - .5) * 1.4, y + r * (.25 + ((i * 53) % 11) / 11 * .7), r * .025); },
    12: (g, x, y, r) => { g.fillStyle = 'rgba(255,255,255,.75)'; for (let i = 0; i < 10; i++) C(g, x + r * (((i * 29) % 11) / 11 - .5) * 1.3, y + r * (.55 + ((i * 41) % 7) / 7 * .45), r * .03); },
    15: (g, x, y, r) => { for (const [a, c] of [[-.18, '#ffd23a'], [0, '#e8304a'], [.18, '#2bd6ff']]) { g.fillStyle = c; C(g, x + r * a, y + r * .95, r * .07); } },
    16: (g, x, y, r, c) => { g.strokeStyle = c; g.lineWidth = r * .05; for (const s of [-1, 1]) { g.beginPath(); g.arc(x + s * r * .55, y + r * .28, r * .08, 0, PI * 1.6); g.stroke(); } },
    17: (g, x, y, r) => { g.fillStyle = '#fff6b0'; for (const [a, b] of [[-.3, .6], [.2, .7], [0, .9], [-.1, .45], [.35, .5]]) twinkle(g, x + r * a, y + r * b, r * .05); },
    18: (g, x, y, r) => { for (const [a, b] of [[-.3, .65], [.25, .75]]) { g.fillStyle = '#ffd1e8'; for (let k = 0; k < 5; k++) { const t = k * PI * .4; C(g, x + r * a + Math.cos(t) * r * .06, y + r * b + Math.sin(t) * r * .06, r * .05); } g.fillStyle = '#ffd23a'; C(g, x + r * a, y + r * b, r * .035); } },
    19: (g, x, y, r, c) => { g.fillStyle = c; braid(g, c, x, y + r * .95, x, y + r * 1.5, 4, r * .1); }
  };

  /** 👩 A chest shape that shows through the outfit (PG: just shading, 1.59.3 easier to see). Women characters + bodies 2–6.
   *  5 sizes (Derek): body 3 = size 1 (smallest), 2 = size 2, 4 = size 3, 5 = size 4, 6 = size 5. Random characters only get sizes 1–3. */
  const CHEST = { 2: 2, 3: 1, 4: 3, 5: 4, 6: 5 }, chestSize = body => CHEST[((Number(body) || 1) - 1) % 6 + 1] || 0;
  // 🧍 body types (1.59.3, Derek): 1–6 regular, 7–12 thin, 13–18 fat, 19–24 athletic (each: flat + the 5 chest sizes, in that order)
  const BUILD = [1, .84, 1.28, 1.14], buildOf = body => Math.min(3, Math.floor(((Number(body) || 1) - 1) / 6));
  function chest(g, m, ty, rr, size = 2) {
    const k = [0, .82, 1, 1.16, 1.32, 1.48][size] || 1, rx = rr * .15 * k, ry = rr * .118 * k, off = Math.min(rr * .3, rr * .148 * k + rr * .012);
    g.save();
    for (const s of [-1, 1]) {
      const cx = m + s * off, cy = ty + rr * (.19 + .035 * (k - 1));
      g.fillStyle = 'rgba(0,0,0,.2)'; g.beginPath(); g.ellipse(cx, cy + ry * .18, rx, ry * .95, 0, PI * .05, PI * .95); g.fill(); // (soft shadow underneath)
      const gr = g.createRadialGradient(cx - s * rx * .25, cy - ry * .35, rr * .01, cx, cy, rx * 1.05);
      gr.addColorStop(0, 'rgba(255,255,255,.34)'); gr.addColorStop(.6, 'rgba(255,255,255,.1)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; E(g, cx, cy, rx, ry);
      g.strokeStyle = 'rgba(0,0,0,.5)'; g.lineWidth = rr * .03; g.lineCap = 'round'; g.beginPath(); g.ellipse(cx, cy, rx * .92, ry * .88, 0, PI * .12, PI * .88); g.stroke();
    }
    g.restore();
  }

  /** A character on a token canvas (head centre m, m − .4·rr; the movie poster / Twitch picture is a badge on the chest). */
  function draw(g, m, rr, look, img, col, initials) {
    const L = norm(look), hr = rr * .58, hx = m, hy = m - rr * .4, ty = m + rr * .22, by = m + rr * .95, hairC = hairColN(L.haircolor), skin = skinCol(L.skin), out = OUT[sp('outfit', L.outfit)[0] - 1];
    const [hb, hv] = sp('hair', L.hair), hair = HAIR[hb - 1], ov = sp('outfit', L.outfit)[1], [mb, mv] = sp('makeup', L.makeup), [fb, fv] = sp('facialhair', L.facialhair);
    col = outCol(L.outfit, (look && look.col) || col || '#8a5cff');
    const hairCol = hairC;
    g.save(); g.lineJoin = 'round'; g.lineCap = 'round';
    const q = Q(g, m, ty, by, rr, col, skin), path = () => SH[out.s](g, m, ty, by, rr);
    const cs = chestSize(L.body), bld = buildOf(L.body), bw = BUILD[bld], wide = fn => { if (bw === 1) return fn(); g.save(); g.translate(m, 0); g.scale(bw, 1); g.translate(-m, 0); fn(); g.restore(); }; // (thin / fat / athletic: the body is narrower or wider, the head stays)
    wide(() => {
    if (out.cape) { g.fillStyle = shade(col, -45); g.beginPath(); g.moveTo(m - rr * .45, ty + rr * .02); g.lineTo(m + rr * .45, ty + rr * .02); g.lineTo(m + rr * .7, by + rr * .25); g.lineTo(m - rr * .7, by + rr * .25); g.closePath(); g.fill(); }
    if (out.back) out.back(q);
    });
    if (hair.b) hairLayer(g, gg => { gg.fillStyle = hairCol; hair.b(gg, hx, hy, hr, hairCol); }, hv, hx, hy, hr, hairCol);
    // body
    wide(() => {
    let fill = out.f;
    if (!fill) { fill = g.createLinearGradient(m - rr * .6, ty, m + rr * .6, by); fill.addColorStop(0, shade(col, 30)); fill.addColorStop(1, shade(col, -35)); }
    else if (typeof fill === 'function') fill = fill(g, m, ty, by, rr);
    g.fillStyle = fill; path(); g.fill();
    if (out.d || ov) { g.save(); path(); g.clip(); if (out.d) out.d(q); if (ov) { tint(q, L.outfit, typeof out.f === 'string'); if (OPAT[ov]) OPAT[ov](q); } g.restore(); }
    if (cs) chest(g, m, ty, rr, cs);
    if (bld === 2) { g.save(); path(); g.clip(); g.fillStyle = 'rgba(0,0,0,.13)'; E(g, m, by - rr * .12, rr * .42, rr * .26); g.fillStyle = 'rgba(255,255,255,.12)'; E(g, m - rr * .1, by - rr * .22, rr * .2, rr * .1); g.restore(); } // (a round belly)
    if (bld === 3 && !cs) { g.save(); g.strokeStyle = 'rgba(0,0,0,.28)'; g.lineWidth = rr * .025; for (const sx of [-1, 1]) { g.beginPath(); g.moveTo(m + sx * rr * .04, ty + rr * .28); g.quadraticCurveTo(m + sx * rr * .2, ty + rr * .33, m + sx * rr * .33, ty + rr * .22); g.stroke(); } g.restore(); } // (athletic: chest muscle lines)
    g.strokeStyle = 'rgba(15,10,20,.85)'; g.lineWidth = rr * .045; path(); g.stroke();
    if (out.t) out.t(q);
    });
    // the picture (movie poster / Twitch picture) on the chest, or the initials
    const ew = rr * (cs ? .31 - .016 * cs : .34), ex = m - ew / 2, ey = ty + rr * (cs ? .32 + .022 * cs : .26); // (lower + a bit smaller under a chest)
    g.save(); g.beginPath(); g.roundRect ? g.roundRect(ex, ey, ew, ew * 1.2, rr * .04) : g.rect(ex, ey, ew, ew * 1.2); g.fillStyle = '#fff'; g.fill(); g.clip();
    if (img && img.complete && img.naturalWidth) { const k = Math.max(ew / img.naturalWidth, ew * 1.2 / img.naturalHeight); g.drawImage(img, m - img.naturalWidth * k / 2, ey + ew * .6 - img.naturalHeight * k / 2, img.naturalWidth * k, img.naturalHeight * k); }
    else if (initials) { g.fillStyle = shade(col, -50); g.fillRect(ex, ey, ew, ew * 1.2); g.fillStyle = '#fff'; g.font = `${Math.round(ew * (String(initials).length > 2 ? .38 : .5))}px 'Lilita One', Impact, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(initials, m, ey + ew * .62); }
    g.restore(); g.strokeStyle = 'rgba(15,10,20,.8)'; g.lineWidth = rr * .025; g.strokeRect(ex, ey, ew, ew * 1.2);
    // face
    g.fillStyle = skin; g.strokeStyle = 'rgba(15,10,20,.9)'; g.lineWidth = rr * .045; g.beginPath(); g.arc(hx, hy, hr, 0, 7); g.fill(); g.stroke();
    g.fillStyle = shade(skin, -18); for (const s of [-1, 1]) E(g, hx + s * hr * .98, hy + hr * .05, hr * .13, hr * .2); // ears
    const mk = MAKEUP[mb - 1];
    if (mk.u) mk.u(g, hx, hy, hr, col);
    for (const s of [-1, 1]) { g.fillStyle = '#fff'; E(g, hx + s * hr * .35, hy - hr * .05, hr * .17, hr * .2); g.fillStyle = '#1a1a22'; C(g, hx + s * hr * .35 + hr * .03, hy - hr * .02, hr * .09); g.fillStyle = '#fff'; C(g, hx + s * hr * .35 + hr * .06, hy - hr * .06, hr * .03); }
    g.strokeStyle = 'rgba(40,20,20,.85)'; g.lineWidth = hr * .07; g.beginPath(); g.arc(hx, hy + hr * .28, hr * .22, PI * .15, PI * .85); g.stroke(); // smile
    if (mk.o) mk.o(g, hx, hy, hr, col);
    if (mv) { g.save(); MACC[mv - 1](g, hx, hy, hr); g.restore(); }
    { const bc = FCOL[fv] || hairCol, bf = BEARD[fb === 1 && fv ? 1 : fb - 1]; g.save(); if (fv === 13 || fv === 14) { const k = fv === 13 ? 1.16 : .86; g.translate(hx, hy + hr * .3); g.scale(k, k); g.translate(-hx, -hy - hr * .3); }
      g.fillStyle = bc; g.strokeStyle = bc; bf(g, hx, hy, hr, bc); g.restore(); if (FACC[fv] && !(fb === 1 && fv >= 15)) { g.save(); FACC[fv](g, hx, hy, hr, bc); g.restore(); } } // (version of "None" = a light shadow)
    if (hair.f) hairLayer(g, gg => { gg.fillStyle = hairCol; hair.f(gg, hx, hy, hr, hairCol); }, hv, hx, hy, hr, hairCol);
    if (HTOP[hv]) { g.save(); HTOP[hv](g, hx, hy, hr, hairCol); g.restore(); }
    if (HAIRACC[(L.hairaccessory || 1) - 1]) { g.save(); HAIRACC[L.hairaccessory - 1](g, hx, hy, hr, col, hairCol); g.restore(); } // 🎀 (under any hat)
    if (ACC[L.accessory - 1]) { g.save(); ACC[L.accessory - 1](g, hx, hy, hr, col, hairCol); g.restore(); } // 🎩
    const sh = g.createLinearGradient(0, hy - hr, 0, hy); sh.addColorStop(0, 'rgba(255,255,255,.18)'); sh.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = sh; E(g, hx, hy - hr * .5, hr * .6, hr * .32);
    g.restore();
  }
  function norm(look) { const L = look || {}; return { hair: pick('hair', L.hair), outfit: pick('outfit', L.outfit), makeup: pick('makeup', L.makeup), facialhair: pick('facialhair', L.facialhair), body: pick('body', L.body || 1), skin: pick('skin', L.skin || 3), haircolor: pick('haircolor', L.haircolor || 2), accessory: pick('accessory', L.accessory || 1), hairaccessory: pick('hairaccessory', L.hairaccessory || 1) }; }
  /** What the legs and arms look like for this look (game.html's charLimbs). */
  function limbs(look, col) {
    const L = norm(look), o = OUT[sp('outfit', L.outfit)[0] - 1], skin = skinCol(L.skin); col = outCol(L.outfit, (look && look.col) || col || '#8a5cff');
    const pants = o.pants === 'c' ? shade(col, -25) : o.pants || (o.legs === 'shorts' ? shade(col, -40) : '#2a3a6a');
    const arm = o.arm === 'skin' ? skin : o.arm === 'c' ? shade(col, -20) : o.arm || (typeof o.f === 'string' ? o.f : shade(col, -20));
    return { skin, legs: o.legs, pants, arm, shoe: o.shoe || (o.legs === 'bare' || o.legs === 'gown' ? '#c8102a' : '#1a1a1a') };
  }

  // ---------- 🎲 random looks for everyone without their own /character (themed on themed maps) ----------
  const r1 = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
  const VAL = ['#e8304a', '#ff6a9a', '#c81848', '#ff9ab8'], GREEN = ['#1f9a3a', '#38c058', '#0f7a2a', '#6ad46a'], PASTEL = ['#ffb0d8', '#9ad0ff', '#b8eca0', '#ffe98a', '#d4b8ff'], USA = ['#c8102e', '#f4f4f4', '#1a3a8a'], NEON = ['#ff2bd6', '#2bd6ff', '#a6ff2b', '#ff8a2b'];
  const EVERY = { m: r1(1, 25), f: r1(26, 50) };
  // map id → outfits (one list for everyone, or { m, f } for men / women; non-binary get both) + optional colours
  const THEMES = {
    warfield: { o: [55] }, rumble: { o: [56] }, space: { o: [54] }, castle: { o: [52, 52, 74, 51] }, pompeii: { o: [60, 60, 74] }, zombies: { o: [71, 71, 70, 9] },
    hero: { o: [53] }, elements: { o: [51] }, frost: { o: [72, 15, 72] }, haunted: { o: { m: [61, 62, 63, 64], f: [61, 62, 63, 64, 50, 50] } }, halloween: { o: { m: [61, 62, 63, 64, 51], f: [61, 62, 63, 64, 50, 50] } },
    xmas: { o: [65, 65, 66, 67] }, turkey: { o: { m: [68, 68, 12, 15], f: [68, 68, 30, 48] } }, easter: { o: { m: [69, 69, 1, 11, 18], f: [69, 69, 26, 28, 35, 46] }, col: PASTEL },
    newyear: { o: { m: [10, 4], f: [44, 36, 27] } }, hollywood: { o: { m: [10, 4], f: [27, 44, 36] } }, gas: { o: { m: [6, 12, 19], f: [6, 12, 37] } }, desert: { o: [73] }, plague: { o: [74, 74, 9] },
    kaiju: { o: [9, 70, 53] }, donut: { o: [20] }, cyber: { o: { m: [8, 13, 17, 59], f: [31, 8, 47, 59] }, col: NEON },
    valentine: { o: EVERY, col: VAL }, stpat: { o: EVERY, col: GREEN }, july4: { o: EVERY, col: USA },
    // 🃏 the character-only maps (a battle with characters on them runs in the card fight engine)
    kungfu: { o: [58, 58, 74] }, ring: { o: [56] }, wizard: { o: [51] }, colosseum: { o: [60, 60, 52] }, ww2: { o: [55] }
  };
  const hash = s => { let h = 2166136261; for (const ch of String(s)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
  /** A random look that stays the same for this piece on this map. gender 'm' | 'f' | 'n'. */
  function auto(seed, gender, mapId, forceChaos) {
    let h = hash(seed + '|' + (mapId || '')); const R = n => { h = (Math.imul(h, 1103515245) + 12345) >>> 0; return (h >>> 8) % n; }, from = a => a[R(a.length)];
    const g = gender === 'm' || gender === 'f' ? gender : 'n', th = THEMES[mapId];
    // 🤪 1 in 20 is pure chaos (Derek: "wtf or funny moments", but not all the time): every part picked from everything
    if (R(100) < CHAOS_PCT || forceChaos) return { hairaccessory: R(2) ? 1 + R(ALLN.hairaccessory.length) : 1, accessory: R(2) ? 1 + R(ALLN.accessory.length) : 1, hair: 1 + R(ALLN.hair.length), outfit: 1 + R(ALLN.outfit.length), makeup: 1 + R(ALLN.makeup.length), facialhair: 1 + R(ALLN.facialhair.length), body: R(4) * 6 + from([1, 1, 3, 2, 4]), skin: 1 + R(ALLN.skin.length), haircolor: 1 + R(ALLN.haircolor.length), col: CHAOS_COL[R(CHAOS_COL.length)], chaos: true };
    // the other 19 in 20 make sense
    const hair = g === 'm' ? 1 + R(25) : g === 'f' ? 26 + R(25) : 1 + R(50);
    let outfit;
    if (th) { const o = th.o; outfit = from(Array.isArray(o) ? o : g === 'n' ? [...o.m, ...o.f] : o[g]); }
    else outfit = R(12) === 0 ? from(EVERYDAY_COSTUMES) : g === 'm' ? 1 + R(25) : g === 'f' ? 26 + R(25) : 1 + R(50);
    const facialhair = g === 'm' && R(100) >= 45 ? from(BEARDS_OK) : 1;
    const makeup = g === 'f' ? (R(2) ? from(MAKEUP_F) : 1) : g === 'n' ? (R(4) ? 1 : from([...MAKEUP_F, ...MAKEUP_M])) : (R(12) ? 1 : from(MAKEUP_M));
    // 🔢 the versions (1.59.0): some random characters get one too, only the ones that make sense for regular folks
    const ver = (k, n, list, pct) => list.length && R(100) < pct ? n + from(list) * BASE[k].length : n;
    const ACC_OK = g === 'f' ? [2, 3, 4, 5, 15, 17, 19, 35, 38, 46, 47] : g === 'm' ? [6, 7, 17, 18, 19, 21, 24, 31, 36, 37, 46, 47] : [2, 6, 17, 18, 19, 35, 38, 46, 47], ACC_TH = { xmas: [28], halloween: [27, 12, 10], haunted: [27, 12], wizard: [26], elements: [26], newyear: [25, 22], easter: [11], stpat: [24], hero: [47] }; /* 🎩 sensible accessories (themed maps sometimes add their own) */
    const accessory = ACC_TH[mapId] && R(3) === 0 ? from(ACC_TH[mapId]) : R(100) < 18 ? from(ACC_OK) : 1;
    const HA_OK = g === 'f' ? [2, 3, 4, 5, 7, 8, 9, 10, 11, 13, 14, 15, 18, 21, 25, 26, 27, 31] : g === 'm' ? [17, 22, 23] : [2, 3, 9, 10, 16, 17, 22, 23, 28, 31], HA_TH = { xmas: [29], valentine: [13, 4], easter: [25, 8], stpat: [28], beach: [7], july4: [12] };
    const hairaccessory = accessory > 1 && accessory < 8 || accessory > 16 ? 1 : HA_TH[mapId] && R(4) === 0 ? from(HA_TH[mapId]) : R(100) < (g === 'f' ? 28 : g === 'm' ? 4 : 12) ? from(HA_OK) : 1; // 🎀 (never with a hat or another hair thing)
    return { accessory, hairaccessory, hair: ver('hair', hair, g === 'f' ? [1, 2, 3, 4, 5, 6, 7] : g === 'm' ? [1, 2, 3, 8, 9, 10] : [1, 2, 3, 4, 7, 8, 10], 30),
      outfit: th ? outfit : ver('outfit', outfit, [1, 2, 3, 4, 6, 7, 10, 11, 12, 14, 15, 16, 17, 18], 25),
      makeup: makeup > 1 ? ver('makeup', makeup, g === 'm' ? [2, 4] : [1, 2, 3, 4, 5, 9, 14], 25) : makeup,
      facialhair: facialhair > 1 ? ver('facialhair', facialhair, [1, 2, 3, 4, 5, 6, 13, 14], 30) : facialhair,
      body: from([0, 0, 0, 0, 1, 2, 3]) * 6 + (g === 'f' ? from([3, 2, 2, 4]) : 1), /* (any build; chest sizes 1–3 only: never the big ones at random) */ skin: ver('skin', 1 + R(8), [1, 2, 3, 4, 5, 6, 7, 8], 50), haircolor: R(20) ? ver('haircolor', 1 + R(7), [1, 2, 3, 4, 5, 6, 7, 9, 12, 13], 40) : 8 + R(3), col: th?.col ? from(th.col) : undefined };
  }
  // what "makes sense" for the random characters (the silly ones are left for chaos and for people's own /character)
  const CHAOS_PCT = 5, CHAOS_COL = ['#ff2bd6', '#2bd6ff', '#a6ff2b', '#ff8a2b', '#ffe12b', '#8a2bff', '#2bff9a'];
  const MAKEUP_F = [2, 3, 4, 5, 6, 7, 11, 12, 14, 15, 16, 18, 20, 24], MAKEUP_M = [2, 6, 20, 24];
  const BEARDS_OK = r1(2, 25).filter(n => n !== 18 && n !== 20); // (no braided or wizard beards on regular folks)
  const EVERYDAY_COSTUMES = [53, 57, 58, 67, 69, 72, 73, 75]; // costumes that still make sense in a normal battle (superhero, pirate, ninja, sweater, onesies…)
  window.CHAR_PARTS = { chestSize, buildOf, NAMES: ALLN, BASE, VARS, GROUPS, SKIN, HAIRC, THEMES, draw, norm, limbs, chest, auto, sp, skinCol, hairCol: hairColN };
})();

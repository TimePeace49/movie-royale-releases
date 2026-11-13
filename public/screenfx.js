/* 🌀 Screen effects (1.155.0, Derek: "chat can mess with my screen: black and white, drunk view, stuff like that").
   ONE list + ONE maths function, used by the app (the Game capture tab's picture) and by the server (the OBS game source), so both look alike.
   frame(kind, t, dur) -> { sat, con, bri, hue, blur, rot, s, sx, dx, dy }  (sat/con/bri: 0 = normal, hue in degrees, rot in degrees, s = size, sx = -1 mirrors, dx/dy = slide as a part of the picture's size) */
(function (g) {
  const FX = {
    bw: { icon: '⚫', name: 'Black & white', secs: 300, pts: 1500, bits: 150, tip: 2, what: 'all the colour drains out of the game' },
    drunk: { icon: '🥴', name: 'Drunk view', secs: 300, pts: 4000, bits: 400, tip: 5, what: 'the game sways, drifts and goes a bit blurry' },
    flip: { icon: '🙃', name: 'Upside down', secs: 300, pts: 6000, bits: 600, tip: 7, what: 'the game turns upside down' },
    mirror: { icon: '🪞', name: 'Mirror world', secs: 300, pts: 5000, bits: 500, tip: 6, what: 'left and right swap places' },
    tiny: { icon: '🔬', name: 'Tiny screen', secs: 300, pts: 3000, bits: 300, tip: 4, what: 'the game shrinks to a small box in the middle' },
    zoom: { icon: '🔍', name: 'Way too close', secs: 300, pts: 3000, bits: 300, tip: 4, what: 'zoomed in so far the edges are gone' },
    dark: { icon: '🌑', name: 'Lights out', secs: 300, pts: 2500, bits: 250, tip: 3, what: 'the game goes very dark' },
    rainbow: { icon: '🌈', name: 'Rainbow trip', secs: 300, pts: 2000, bits: 200, tip: 3, what: 'the colours keep cycling' },
    fried: { icon: '🍟', name: 'Deep fried', secs: 300, pts: 2000, bits: 200, tip: 3, what: 'colours and contrast turned way up' },
    shake: { icon: '🫨', name: 'Earthquake', secs: 300, pts: 3500, bits: 350, tip: 4, what: 'the game shakes' },
    spin: { icon: '🌀', name: 'Slow spin', secs: 300, pts: 7000, bits: 700, tip: 8, what: 'the game slowly turns all the way round, again and again' },
    tv: { icon: '📺', name: 'Old TV', secs: 300, pts: 2500, bits: 250, tip: 3, what: 'a fuzzy old TV: faded, flickering, with lines, static and a picture that rolls now and then' }
  };
  const MOVES = { drunk: 1, flip: 1, mirror: 1, tiny: 1, zoom: 1, shake: 1, spin: 1, tv: 1 }; // these move / turn the picture (the others only change its colours)
  const ease = x => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
  function frame(kind, t, dur) {
    const k = ease(Math.min(t / 0.6, (dur - t) / 0.6)), sin = Math.sin, f = { sat: 0, con: 0, bri: 0, hue: 0, blur: 0, rot: 0, s: 1, sx: 1, dx: 0, dy: 0, tv: 0 };
    switch (kind) {
      case 'bw': f.sat = -1 * k; break;
      case 'dark': f.bri = -0.62 * k; f.con = -0.2 * k; break;
      case 'fried': f.sat = 3.2 * k; f.con = 1.3 * k; break;
      case 'rainbow': f.hue = ((t * 80) % 360) * (k > 0 ? 1 : 0); f.sat = 0.6 * k; break;
      case 'drunk': f.rot = k * (5 * sin(t * 1.1) + 2.2 * sin(t * 2.7)); f.dx = k * 0.035 * sin(t * 0.8); f.dy = k * 0.025 * sin(t * 1.3 + 1); f.s = 1 + k * (0.14 + 0.04 * sin(t * 0.6)); f.hue = k * 14 * sin(t * 0.5); f.blur = k * (1.4 + 0.9 * sin(t * 0.9)); break;
      case 'flip': f.rot = 180 * k; break;
      case 'mirror': f.sx = 1 - 2 * k; break;
      case 'tiny': f.s = 1 - 0.68 * k; break;
      case 'zoom': f.s = 1 + 0.8 * k; break;
      case 'shake': f.dx = k * 0.022 * sin(t * 47) * sin(t * 13); f.dy = k * 0.03 * sin(t * 53 + 2) * sin(t * 17); f.rot = k * 1.2 * sin(t * 39); f.s = 1 + 0.06 * k; break;
      case 'tv': { f.sat = -0.82 * k; f.con = 0.35 * k; f.bri = k * (-0.06 + 0.07 * sin(t * 31) * sin(t * 7.3)); f.dx = k * 0.004 * sin(t * 90) + k * 0.012 * Math.max(0, sin(t * 1.7) - 0.93) * 14 * sin(t * 61); f.s = 1 - 0.04 * k; f.blur = 0.6 * k; f.tv = k;
        const ph = t % 7.5; if (t > 2 && ph < 0.55 && dur - t > 1.2) { const r = ph / 0.55; f.dy = k * (r < 0.5 ? r : r - 1); } break; } // (the picture "rolls" every few seconds, like a TV losing its hold)
      case 'spin': { const turns = Math.max(1, Math.round(dur / 10)); f.rot = 360 * turns * ease(t / dur); f.s = 1 - 0.25 * k; break; }
    }
    if (Math.abs(f.sx) < 0.02) f.sx = f.sx < 0 ? -0.02 : 0.02; // (never exactly flat: OBS refuses a size of 0)
    return f;
  }
  /** the same frame as CSS, for a <video> in the app */
  function css(f) {
    const fl = [];
    if (f.sat) fl.push(f.sat < 0 ? `grayscale(${Math.min(1, -f.sat).toFixed(3)})` : `saturate(${(1 + f.sat).toFixed(3)})`);
    if (f.con) fl.push(`contrast(${Math.max(0.1, 1 + f.con * 0.6).toFixed(3)})`);
    if (f.bri) fl.push(`brightness(${Math.max(0.05, 1 + f.bri * 1.2).toFixed(3)})`);
    if (f.hue) fl.push(`hue-rotate(${f.hue.toFixed(1)}deg)`);
    if (f.blur > 0.05) fl.push(`blur(${f.blur.toFixed(2)}px)`);
    const moved = f.rot || f.s !== 1 || f.sx !== 1 || f.dx || f.dy;
    return { filter: fl.join(' '), transform: moved ? `translate(${(f.dx * 100).toFixed(2)}%, ${(f.dy * 100).toFixed(2)}%) rotate(${f.rot.toFixed(2)}deg) scale(${(f.s * f.sx).toFixed(4)}, ${f.s.toFixed(4)})` : '' };
  }
  g.SCREENFX = { FX, MOVES, frame, css };
})(typeof globalThis !== 'undefined' ? globalThis : window);

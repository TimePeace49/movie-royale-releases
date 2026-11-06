// ✂️ Cut-out pictures (1.77.0, Derek: "if it's a can it will be that can… just the image, if it's a bag of chips it'll be
// that bag of chips"): a product photo off the internet usually sits on a plain (white) background. This floods that
// background away from the edges, softens the edge and trims the empty space, so the thing itself fights in the battle.
// Pictures that already have a see-through background are only trimmed. Same-origin pictures only (the app's /uploads).
window.CUTOUT = (() => {
  const cache = new Map(), MAX = 320;
  function get(src) {
    if (!src) return null; let e = cache.get(src); if (e) return e.c;
    e = { c: null }; cache.set(src, e);
    const im = new Image(); im.decoding = 'async';
    im.onload = () => { try { e.c = cut(im); } catch { e.c = im; } try { dispatchEvent(new Event('cutout')); } catch {} };
    im.onerror = () => { e.c = null; };
    im.src = src; return null;
  }
  function cut(im) {
    const k = Math.min(1, MAX / Math.max(im.naturalWidth, im.naturalHeight)), W = Math.max(1, Math.round(im.naturalWidth * k)), H = Math.max(1, Math.round(im.naturalHeight * k));
    const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(im, 0, 0, W, H);
    const d = g.getImageData(0, 0, W, H), p = d.data, at = (x, y) => (y * W + x) * 4;
    // already see-through around the edges? just trim
    let clear = 0, edge = 0; for (let x = 0; x < W; x++) for (const y of [0, H - 1]) { edge++; if (p[at(x, y) + 3] < 30) clear++; } for (let y = 0; y < H; y++) for (const x of [0, W - 1]) { edge++; if (p[at(x, y) + 3] < 30) clear++; }
    if (clear / edge < .6) {
      // the background colour = the most common colour along the edge (rounded)
      const votes = new Map(); const vote = (x, y) => { const i = at(x, y), key = (p[i] >> 4) << 8 | (p[i + 1] >> 4) << 4 | (p[i + 2] >> 4); votes.set(key, (votes.get(key) || 0) + 1); };
      for (let x = 0; x < W; x++) { vote(x, 0); vote(x, H - 1); } for (let y = 0; y < H; y++) { vote(0, y); vote(W - 1, y); }
      let best = 0, bk = 0; for (const [key, n] of votes) if (n > best) { best = n; bk = key; }
      if (best / edge < .25) return trim(c, g, W, H); // (a busy photo all the way to the edges: no clear background to take away)
      const br = ((bk >> 8) & 15) * 16 + 8, bg = ((bk >> 4) & 15) * 16 + 8, bb = (bk & 15) * 16 + 8, TOL = 46;
      const near = i => Math.abs(p[i] - br) + Math.abs(p[i + 1] - bg) + Math.abs(p[i + 2] - bb) < TOL * 1.6;
      const seen = new Uint8Array(W * H), st = [];
      const push = (x, y) => { const j = y * W + x; if (seen[j]) return; seen[j] = 1; if (near(j * 4)) st.push(j); };
      for (let x = 0; x < W; x++) { push(x, 0); push(x, H - 1); } for (let y = 0; y < H; y++) { push(0, y); push(W - 1, y); }
      while (st.length) { const j = st.pop(), x = j % W, y = (j / W) | 0; p[j * 4 + 3] = 0; if (x > 0) push(x - 1, y); if (x < W - 1) push(x + 1, y); if (y > 0) push(x, y - 1); if (y < H - 1) push(x, y + 1); }
      let gone = 0; for (let j = 0; j < W * H; j++) if (!p[j * 4 + 3]) gone++;
      if (gone / (W * H) > .93) return trim(c, g, W, H); // (it took everything: keep the photo as it was: nothing was put back on the canvas yet)
      // soft edge: pixels next to the taken-away background become half see-through
      const a2 = new Uint8ClampedArray(W * H); for (let j = 0; j < W * H; j++) a2[j] = p[j * 4 + 3];
      for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) { const j = y * W + x; if (!a2[j]) continue; const n = !a2[j - 1] + !a2[j + 1] + !a2[j - W] + !a2[j + W]; if (n) p[j * 4 + 3] = Math.min(p[j * 4 + 3], 255 - n * 50); }
      g.putImageData(d, 0, 0);
    }
    return trim(c, g, W, H);
  }
  function trim(c, g, W, H) {
    const d = g.getImageData(0, 0, W, H).data; let x0 = W, y0 = H, x1 = -1, y1 = -1;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (d[(y * W + x) * 4 + 3] > 20) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    if (x1 < 0) return c;
    const o = document.createElement('canvas'); o.width = x1 - x0 + 5; o.height = y1 - y0 + 5; o.getContext('2d').drawImage(c, x0 - 2, y0 - 2, o.width, o.height, 0, 0, o.width, o.height); return o;
  }
  return { get, cut };
})();

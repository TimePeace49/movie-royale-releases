// 🎡 The spinning wheel (used by the battle screen and the control panel).
// Pointer is on the right (3 o'clock), like Wheel of Names. Slice size = the spot's size (its weight).
window.WheelView = (() => {
  const PAL = ['#ff4f6d', '#ffb547', '#ffe066', '#5ce1a7', '#4fc3ff', '#7c6cff', '#ff7ad9', '#46d6c7', '#ff8a4c', '#a4e05a', '#5d8bff', '#e05ad0'];
  const TAU = Math.PI * 2;
  const mod = (a, n) => ((a % n) + n) % n;
  const ink = hex => { const n = parseInt(String(hex).replace('#', '').padEnd(6, '0').slice(0, 6), 16); const r = n >> 16 & 255, g = n >> 8 & 255, b = n & 255; return (r * 299 + g * 587 + b * 114) / 1000 > 150 ? '#1a1030' : '#ffffff'; };
  function layout(entries) {
    const on = (entries || []).filter(e => e.on !== false && (Number(e.weight) || 0) > 0);
    const tot = on.reduce((a, e) => a + Number(e.weight || 1), 0) || 1;
    let a = 0;
    return on.map((e, i) => { const w = Number(e.weight || 1) / tot * TAU, s = { e, i, a0: a, a1: a + w, color: e.color || PAL[i % PAL.length], pct: Number(e.weight || 1) / tot * 100 }; a += w; return s; });
  }
  function create(canvas, opts = {}) {
    const g = canvas.getContext('2d');
    let wheel = null, sl = [], rot = 0, anim = null, last = -1, hi = -1, hiT = 0, L = {};
    const imgs = new Map(); const img = src => { if (!src) return null; if (!imgs.has(src)) { const im = new Image(); im.onload = () => draw(); im.src = src; imgs.set(src, im); } const im = imgs.get(src); return im.complete && im.naturalWidth ? im : null; };
    const api = {
      onTick: null, onDone: null,
      set(w, r) { wheel = w; L = w?.look || {}; sl = layout(w?.entries); if (r != null) rot = r; draw(); },
      get rot() { return rot; }, get slices() { return sl; },
      indexAt(r = rot) { const phi = mod(-r, TAU); return sl.findIndex(s => phi >= s.a0 && phi < s.a1); },
      highlight(i) { hi = i; hiT = performance.now(); draw(); },
      spin({ from, to, dur, ease = 'out' }, done) {
        if (from != null) rot = from; const r0 = rot, t0 = performance.now(), D = Math.max(.2, dur) * 1000; hi = -1;
        cancelAnimationFrame(anim); last = api.indexAt();
        const step = now => {
          const u = Math.min(1, (now - t0) / D), k = ease === 'inout' ? (u < .5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2) : 1 - Math.pow(1 - u, 4);
          rot = r0 + (to - r0) * k;
          const i = api.indexAt(); if (i !== last) { last = i; api.onTick?.(i); }
          draw();
          if (u < 1) anim = requestAnimationFrame(step); else { anim = null; hi = api.indexAt(); hiT = performance.now(); draw(); (done || api.onDone)?.(hi); }
        };
        anim = requestAnimationFrame(step);
      },
      stop() { cancelAnimationFrame(anim); anim = null; },
      draw
    };
    function draw() {
      const W = canvas.width, H = canvas.height, cx = W / 2 - (opts.pointerRoom ?? 18), cy = H / 2, R = Math.min(cx, cy) - 14;
      if (hi >= 0 && !anim && performance.now() - hiT > 4000) hi = -1; // the winner flash fades after a few seconds
      g.clearRect(0, 0, W, H);
      if (!sl.length) { g.fillStyle = '#ffffff22'; g.beginPath(); g.arc(cx, cy, R, 0, TAU); g.fill(); g.fillStyle = '#fff'; g.font = `700 ${R * .1}px Inter, sans-serif`; g.textAlign = 'center'; g.fillText('Add some spots!', cx, cy); return; }
      // rim
      g.save(); g.shadowColor = 'rgba(0,0,0,.45)'; g.shadowBlur = R * .08; g.fillStyle = L.rim || '#2a1846'; g.beginPath(); g.arc(cx, cy, R + R * .045, 0, TAU); g.fill(); g.restore();
      const blink = Math.floor(performance.now() / 250) % 2;
      for (const s of sl) {
        const a0 = s.a0 + rot, a1 = s.a1 + rot;
        g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, R, a0, a1); g.closePath();
        g.fillStyle = s.color; g.fill();
        if (s.i === hi) { const p = .35 + .25 * Math.sin((performance.now() - hiT) / 120); g.fillStyle = `rgba(255,255,255,${p})`; g.fill(); }
        if (sl.length > 1 && sl.length < 400) { g.strokeStyle = L.lines || 'rgba(255,255,255,.55)'; g.lineWidth = Math.max(.5, R * .004); g.stroke(); }
        // text along the slice
        const span = s.a1 - s.a0, chord = span * R * .62; if (chord < 7) continue;
        const pic = img(s.e.image), ps = pic ? Math.min(span * R * .8 * .9, R * .24) : 0, outer = pic && ps > 14 ? R * .93 - ps - R * .03 : R * .93;
        g.save(); g.translate(cx, cy); g.rotate((a0 + a1) / 2);
        if (pic && ps > 14) { g.save(); g.beginPath(); g.arc(R * .93 - ps / 2, 0, ps / 2, 0, TAU); g.clip(); g.rotate(0); g.drawImage(pic, R * .93 - ps, -ps / 2, ps, ps); g.restore(); }
        const txt = String(s.e.label || s.e.text || ''); /* countdown spots show (3), auto spots show (auto) */ const fs = Math.min(R * .085, chord * .8, (R * .78) / Math.max(4, txt.length) * 1.8) * (Number(L.textScale) || 1);
        if (fs >= 6) {
          g.textAlign = 'right'; g.textBaseline = 'middle'; g.font = `800 ${fs}px ${L.font || 'Inter'}, Inter, sans-serif`; g.fillStyle = L.textColor || ink(s.color);
          let t = txt; const max = outer - R * .18; while (t.length > 1 && g.measureText(t).width > max) t = t.slice(0, -2) + '…';
          g.fillText(t, outer, 0);
        }
        g.restore();
      }
      // bulbs
      const nb = L.bulbs === false ? 0 : 36; for (let i = 0; i < nb; i++) { const a = i / nb * TAU; g.fillStyle = (i + blink) % 2 ? '#fff7c2' : '#ffc94a'; g.beginPath(); g.arc(cx + Math.cos(a) * (R + R * .022), cy + Math.sin(a) * (R + R * .022), R * .012, 0, TAU); g.fill(); }
      // hub
      const hr = R * .14; const hg = g.createRadialGradient(cx - hr * .3, cy - hr * .3, 2, cx, cy, hr); hg.addColorStop(0, '#fff3c4'); hg.addColorStop(1, '#ffb800');
      g.fillStyle = hg; g.beginPath(); g.arc(cx, cy, hr, 0, TAU); g.fill(); g.strokeStyle = '#2a1846'; g.lineWidth = R * .015; g.stroke();
      const hubPic = img(L.hubImage);
      if (hubPic) { g.save(); g.beginPath(); g.arc(cx, cy, hr * .92, 0, TAU); g.clip(); g.drawImage(hubPic, cx - hr, cy - hr, hr * 2, hr * 2); g.restore(); }
      else { g.fillStyle = L.rim || '#2a1846'; g.font = `${hr * .9}px 'Lilita One', Impact, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(L.hub || '🎡', cx, cy + 2); }
      // pointer (right side)
      const px = cx + R + R * .02, ps = R * .09;
      g.save(); g.shadowColor = 'rgba(0,0,0,.5)'; g.shadowBlur = 8; g.fillStyle = L.pointer || '#ffffff'; g.beginPath(); g.moveTo(px - ps * 1.1, cy); g.lineTo(px + ps * .7, cy - ps * .7); g.lineTo(px + ps * .7, cy + ps * .7); g.closePath(); g.fill(); g.restore();
      g.strokeStyle = '#2a1846'; g.lineWidth = 3; g.beginPath(); g.moveTo(px - ps * 1.1, cy); g.lineTo(px + ps * .7, cy - ps * .7); g.lineTo(px + ps * .7, cy + ps * .7); g.closePath(); g.stroke();
      if (hi >= 0 && !anim) requestAnimationFrame(draw);
    }
    return api;
  }
  return { create, layout, PAL };
})();

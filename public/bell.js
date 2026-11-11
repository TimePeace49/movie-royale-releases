/* 🔔 (1.132.6) An old-school twin-bell alarm clock, made with Web Audio (no sound file): a little hammer rattling between two bells.
   window.oldBell(vol 0–100, secs) → stop function. Used by the movie night timer (on stream + in the app). */
(function () {
  let ctx = null;
  window.oldBell = function (vol, secs) {
    try {
      ctx = ctx || new (window.AudioContext || window.webkitAudioContext)(); if (ctx.state === 'suspended') ctx.resume();
      const v = Math.max(0, Math.min(100, vol == null ? 60 : Number(vol))) / 100, dur = Math.max(1, Math.min(12, Number(secs) || 4)), t0 = ctx.currentTime + .03;
      const out = ctx.createGain(); out.gain.value = v * .5; const comp = ctx.createDynamicsCompressor(); out.connect(comp); comp.connect(ctx.destination);
      const strike = (at, f) => { /* one hammer hit: a few metal partials that ring out fast + a tiny click */
        for (const [k, a, d] of [[1, .5, .16], [2.76, .32, .11], [5.4, .2, .07], [8.93, .1, .05]]) { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.value = f * k; g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(a, at + .002); g.gain.exponentialRampToValueAtTime(.0008, at + d); o.connect(g); g.connect(out); o.start(at); o.stop(at + d + .02); }
      };
      const step = .043; let i = 0; /* about 23 hits a second, left bell / right bell */
      for (let t = 0; t < dur; t += step, i++) { const ring = (t % 2.2) < 1.75; if (ring) strike(t0 + t, i % 2 ? 2350 : 2093); } /* brrrring… brrrring… */
      setTimeout(() => { try { out.disconnect(); } catch {} }, dur * 1000 + 600);
      return () => { try { out.gain.setTargetAtTime(0, ctx.currentTime, .02); } catch {} };
    } catch { return () => {}; }
  };
  /* 🚲 (1.139.1, Derek) what rings when the movie night timer ends: your own sound file, else a bicycle bell (the default), else the old alarm clock.
     window.timerBell({vol 0–100, kind 'bike'|'clock', file url}, secs) → stop function. */
  window.timerBell = function (m, secs) {
    m = m || {}; const v = Math.max(0, Math.min(100, m.vol == null ? 60 : Number(m.vol))) / 100;
    if (!m.file && m.kind === 'clock') return window.oldBell(m.vol, secs || 4.5);
    try { const au = new Audio(m.file || '/sounds/bike-bell.mp3'); au.volume = v; au.play().catch(() => {}); return () => { try { au.pause(); } catch {} }; } catch { return () => {}; }
  };
})();

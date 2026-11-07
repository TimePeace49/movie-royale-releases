/* Neon Nights jump-scare alerts for StreamElements (custom widget).
   Small = gator, medium = headlights, big = spotlight ghoul. All art + sounds are drawn/made here. */
(() => {
  const W = 1920, H = 1080;
  const cv = document.getElementById('scare');
  const g = cv.getContext('2d');
  let F = {};
  let sym = '$';
  let ttsRewardSaved = '';
  let ttsMuted = false; // 🔇 !ttsoff / !ttson (Movie Royal's Marathon tab buttons type these)
  let learning = false;
  const IS_OBS = /OBS\//.test(navigator.userAgent) || !!window.obsstudio;

  // ---------- settings ----------
  const fv = (k, d) => (F[k] === undefined || F[k] === null || F[k] === '') ? d : F[k];
  const num = (k, d) => { const n = parseFloat(fv(k, d)); return isFinite(n) ? n : d; };
  const on = (k, d) => { const v = fv(k, d); return v === true || v === 'true' || v === 1 || v === '1'; };
  const soundHere = () => {
    const w = fv('soundWhere', 'all');
    return w === 'all' || (w === 'obs' && IS_OBS) || (w === 'phone' && !IS_OBS);
  };

  // ---------- canvas fit ----------
  let scale = 1, offX = 0, offY = 0;
  function fit() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(innerWidth * dpr);
    cv.height = Math.round(innerHeight * dpr);
    scale = Math.min(cv.width / W, cv.height / H);
    offX = (cv.width - W * scale) / 2;
    offY = (cv.height - H * scale) / 2;
  }
  addEventListener('resize', fit);
  fit();

  // ---------- helpers ----------
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = t => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
  const easeIn = t => Math.pow(clamp(t, 0, 1), 3);
  const now = () => performance.now() / 1000;
  function rng(seed) {
    let a = seed >>> 0;
    return () => { a += 0x6D2B79F5; let t = a; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }
  function rr(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }
  function fitFont(c, text, font, size, maxW) {
    let s = size;
    c.font = `${s}px ${font}`;
    while (s > 16 && c.measureText(text).width > maxW) { s -= 2; c.font = `${s}px ${font}`; }
    return s;
  }
  function glowText(c, text, x, y, color, glow, blur) {
    c.save();
    c.shadowColor = glow; c.shadowBlur = blur; c.fillStyle = color;
    c.fillText(text, x, y); c.shadowBlur = blur / 3; c.fillText(text, x, y);
    c.restore();
  }
  function wrap(c, text, maxW, maxLines) {
    const words = String(text).split(/\s+/); const lines = []; let line = '';
    for (const w of words) {
      const t = line ? line + ' ' + w : w;
      if (c.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t;
      if (lines.length >= maxLines) break;
    }
    if (line && lines.length < maxLines) lines.push(line);
    if (lines.length === maxLines && words.join(' ').length > lines.join(' ').length) lines[maxLines - 1] = lines[maxLines - 1].replace(/\s*\S*$/, '') + '…';
    return lines;
  }

  // ---------- sound ----------
  const A = { ctx: null, out: null, nb: null };
  function au() {
    if (!A.ctx) {
      const C = window.AudioContext || window.webkitAudioContext;
      if (!C) return null;
      A.ctx = new C();
      A.comp = A.ctx.createDynamicsCompressor();
      A.comp.threshold.value = -10; A.comp.ratio.value = 6;
      A.out = A.ctx.createGain();
      A.out.connect(A.comp); A.comp.connect(A.ctx.destination);
      const n = A.ctx.sampleRate * 2, b = A.ctx.createBuffer(1, n, A.ctx.sampleRate), d = b.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
      A.nb = b;
    }
    if (A.ctx.state === 'suspended') A.ctx.resume().catch(() => {});
    A.out.gain.value = soundHere() ? num('volume', 70) / 100 : 0;
    return A.ctx;
  }
  function bus() { const b = A.ctx.createGain(); b.gain.value = 1; b.connect(A.out); return b; }
  function env(p, t, a, peak, hold, rel) {
    p.setValueAtTime(0.0001, t);
    p.linearRampToValueAtTime(peak, t + a);
    p.setValueAtTime(peak, t + a + hold);
    p.exponentialRampToValueAtTime(0.0001, t + a + hold + rel);
  }
  function tone(dest, t, o) {
    const c = A.ctx, os = c.createOscillator(), gn = c.createGain();
    os.type = o.type || 'sine';
    os.frequency.setValueAtTime(o.f, t);
    if (o.f2) os.frequency.exponentialRampToValueAtTime(o.f2, t + (o.glide || o.dur || .3));
    if (o.det) os.detune.value = o.det;
    if (o.vib) { const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = o.vib; lg.gain.value = o.vibD || 20; l.connect(lg); lg.connect(os.frequency); l.start(t); l.stop(t + (o.dur || .3) + (o.rel || .2) + .1); }
    env(gn.gain, t, o.a || .01, o.peak || .2, Math.max(0, (o.dur || .3) - (o.a || .01)), o.rel || .2);
    let last = os;
    if (o.lp) { const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = o.lp; last.connect(f); last = f; }
    if (o.bp) { const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = o.bp; f.Q.value = o.q || 1; last.connect(f); last = f; }
    last.connect(gn); gn.connect(dest);
    os.start(t); os.stop(t + (o.dur || .3) + (o.rel || .2) + .1);
    return gn;
  }
  function noise(dest, t, o) {
    const c = A.ctx, s = c.createBufferSource(), f = c.createBiquadFilter(), gn = c.createGain();
    s.buffer = A.nb; s.loop = true;
    f.type = o.type || 'bandpass'; f.frequency.setValueAtTime(o.f || 1000, t); f.Q.value = o.q || 1;
    if (o.f2) f.frequency.exponentialRampToValueAtTime(o.f2, t + (o.glide || o.dur || .3));
    env(gn.gain, t, o.a || .005, o.peak || .3, Math.max(0, (o.dur || .3) - (o.a || .005)), o.rel || .2);
    s.connect(f); f.connect(gn); gn.connect(dest);
    if (o.lfo) { const l = c.createOscillator(), lg = c.createGain(), mg = c.createGain(); l.type = 'square'; l.frequency.value = o.lfo; lg.gain.value = .5; mg.gain.value = .5; l.connect(lg); lg.connect(mg.gain); gn.disconnect(); gn.connect(mg); mg.connect(dest); l.start(t); l.stop(t + (o.dur || .3) + (o.rel || .2) + .1); }
    s.start(t, Math.random()); s.stop(t + (o.dur || .3) + (o.rel || .2) + .1);
    return gn;
  }
  function chord(dest, t, fs, o) { fs.forEach(f => tone(dest, t, { ...o, f })); }
  function playOwn(lvl) {
    const url = fv('sound' + lvl, '');
    if (!url || !soundHere()) return false;
    try { const a = new Audio(url); a.volume = clamp(num('volume', 70) / 100, 0, 1); a.play().catch(() => {}); return true; } catch (e) { return false; }
  }

  // Build-up sounds (until the scare) + scare sounds, per level.
  const SND = {
    1: {
      build(b, t, B) {
        tone(b, t, { type: 'sawtooth', f: 60, dur: B, peak: .025, lp: 300, a: .4 });
        noise(b, t, { type: 'lowpass', f: 420, dur: B, peak: .07, a: .6, rel: .4 });
        chord(b, t, [220, 261.6, 329.6], { type: 'triangle', dur: B, peak: .03, a: .8, rel: .4 });
        for (let i = 0; i < 3; i++) tone(b, t + B - 1.3 + i * .32, { f: 260 + i * 60, f2: 520 + i * 80, dur: .07, peak: .06, rel: .05 });
      },
      scare(b, t, own) {
        if (!own) {
          noise(b, t, { f: 2500, dur: .02, peak: .9, rel: .05 });
          tone(b, t, { f: 140, f2: 45, dur: .16, peak: .8, rel: .12 });
          noise(b, t + .02, { type: 'highpass', f: 1200, dur: .35, peak: .5, rel: .7 });
          noise(b, t + .05, { f: 3200, q: 2, dur: .55, peak: .22, rel: .3, lfo: 28 });
          chord(b, t, [233, 247, 349, 370], { type: 'sawtooth', dur: .6, peak: .07, rel: .7, lp: 2600 });
        }
        noise(b, t + .45, { f: 2200, dur: .025, peak: 1, rel: .06 });
        tone(b, t + .45, { f: 110, f2: 38, dur: .2, peak: .9, rel: .15 });
        noise(b, t + 1, { type: 'lowpass', f: 900, dur: .5, peak: .35, rel: .7 });
      }
    },
    2: {
      build(b, t, B) {
        tone(b, t, { type: 'sawtooth', f: 52, dur: B, peak: .07, lp: 220, a: .3 });
        const notes = [110, 220, 261.6, 329.6, 392, 329.6, 261.6, 220];
        for (let i = 0; t + i * .18 < t + B - .2; i++) tone(b, t + i * .18, { type: 'square', f: notes[i % 8], dur: .09, peak: .035, rel: .08, lp: 1400 });
        noise(b, t + B - 1.8, { f: 380, f2: 700, glide: 1.8, dur: 1.8, peak: .12, a: 1.6, rel: .05 });
      },
      scare(b, t, own) {
        if (!own) {
          tone(b, t, { type: 'square', f: 415, dur: .85, peak: .15, lp: 2400, rel: .15 });
          tone(b, t, { type: 'square', f: 523, dur: .85, peak: .13, lp: 2400, rel: .15 });
          noise(b, t + .05, { f: 2600, f2: 3500, glide: .6, q: 9, dur: .6, peak: .55, rel: .15 });
          tone(b, t + .05, { f: 2900, f2: 3300, dur: .6, peak: .06, vib: 13, vibD: 80 });
        }
        noise(b, t + .32, { type: 'lowpass', f: 3500, dur: .22, peak: 1, rel: .9 });
        tone(b, t + .32, { f: 95, f2: 32, dur: .3, peak: 1, rel: .5 });
        for (let i = 0; i < 12; i++) tone(b, t + .34 + Math.random() * .7, { f: 3000 + Math.random() * 4500, dur: .02, peak: .06, rel: .25 });
      }
    },
    3: {
      build(b, t, B) {
        noise(b, t, { type: 'lowpass', f: 190, dur: B - .5, peak: .5, a: B - .8, rel: .05, lfo: 10 });
        tone(b, t, { f: 760, dur: B - .5, peak: .04, a: 1, rel: .05, vib: .7, vibD: 170 });
        tone(b, t, { type: 'sawtooth', f: 41, dur: B - .5, peak: .09, lp: 180, a: 1.5, rel: .05 });
        for (let k = t + Math.max(.5, B - 2.4); k < t + B - .6; k += .8) {
          tone(b, k, { f: 62, f2: 40, dur: .09, peak: .45, rel: .12 });
          tone(b, k + .18, { f: 55, f2: 36, dur: .08, peak: .3, rel: .12 });
        }
      },
      scare(b, t, own) {
        if (!own) {
          [520, 615, 770].forEach((f, i) => tone(b, t, { type: 'sawtooth', f, f2: f * 1.18, glide: .9, dur: .95, peak: .2, rel: .5, vib: 7 + i, vibD: 35, bp: 1300, q: 1.2 }));
          noise(b, t, { type: 'highpass', f: 300, dur: .35, peak: .6, rel: .6 });
          chord(b, t, [196, 207.6, 277.2, 293.7, 415.3], { type: 'sawtooth', dur: 1.1, peak: .07, rel: 1, lp: 3000 });
        }
        tone(b, t, { f: 72, f2: 26, dur: .8, peak: 1, rel: .6 });
      }
    },
    voice: {
      build(b, t) { chord(b, t, [523.3, 659.3, 784], { type: 'triangle', dur: .25, peak: .06, rel: .4 }); tone(b, t + .12, { f: 1046.5, dur: .15, peak: .05, rel: .3 }); },
      scare() {}
    }
  };

  // ---------- text to speech ----------
  let speaking = null;
  function cleanTts(text, cheer) {
    let s = String(text || '');
    if (cheer) s = s.replace(/(^|\s)[A-Za-z]+\d+(?=\s|$)/g, ' ');
    s = s.replace(/https?:\/\/\S+|www\.\S+/gi, ' link ');
    s = s.replace(/(.)\1{3,}/g, '$1$1$1');
    s = s.replace(/\s+/g, ' ').trim();
    const max = num('ttsMax', 200);
    if (s.length > max) s = s.slice(0, max).replace(/\s+\S*$/, '');
    const block = String(fv('ttsBlock', '')).toLowerCase().split(',').map(x => x.trim()).filter(Boolean);
    const low = s.toLowerCase();
    if (block.some(w => low.includes(w))) return '';
    return s;
  }
  function speak(text, done) {
    let finished = false, fellBack = false, audio = null;
    const fin = () => { if (finished) return; finished = true; clearTimeout(safety); speaking = null; done && done(); };
    const vol = clamp(num('ttsVolume', 85) / 100, 0, 1) * (soundHere() ? 1 : 0);
    const fallback = () => {
      if (fellBack || finished) return;
      fellBack = true;
      if (!window.speechSynthesis || !vol) return fin();
      try {
        const u = new SpeechSynthesisUtterance(text);
        u.volume = vol; u.rate = 1;
        u.onend = fin; u.onerror = fin;
        speechSynthesis.cancel(); speechSynthesis.speak(u);
      } catch (e) { fin(); }
    };
    const safety = setTimeout(fin, Math.min(30000, 4000 + text.length * 110)); // never hang the alerts if a voice gets stuck
    if (!vol) { setTimeout(fin, 400); return { stop: fin }; }
    try {
      audio = new Audio('https://api.streamelements.com/kappa/v2/speech?voice=' + encodeURIComponent(fv('ttsVoice', 'Brian')) + '&text=' + encodeURIComponent(text));
      audio.volume = vol;
      audio.onended = fin;
      audio.onerror = fallback;
      audio.play().catch(fallback);
    } catch (e) { fallback(); }
    speaking = { stop() { try { audio && audio.pause(); } catch (e) {} try { window.speechSynthesis && speechSynthesis.cancel(); } catch (e) {} fin(); } };
    return speaking;
  }

  // ---------- queue ----------
  const Q = [];
  let cur = null, raf = 0, lastT = 0;
  function push(job) { if (!job) return; Q.push(job); if (!cur) next(); }
  function next() {
    cur = Q.shift() || null;
    if (!cur) return;
    start(cur);
  }
  function finish() {
    if (cur && cur.bus) { try { cur.bus.gain.setTargetAtTime(0, A.ctx.currentTime, .05); } catch (e) {} }
    if (cur && cur.say) { try { cur.say.stop(); } catch (e) {} }
    cur = null;
    try { window.SE_API && SE_API.resumeQueue(); } catch (e) {}
    next();
  }
  function start(job) {
    job.t0 = now();
    const base = { 1: 2.0, 2: 2.6, 3: 3.4, voice: 0, info: 0 }[job.lvl];
    const after = { 1: 4.0, 2: 4.8, 3: 5.8, voice: 3.2, info: 4.5 }[job.lvl];
    job.B = base + (base ? Math.random() * 1.2 : 0);
    job.T = job.B + after;
    job.parts = []; job.seed = Math.floor(Math.random() * 1e9);
    job.speakAt = job.lvl === 'voice' ? .7 : job.B + 1.5;
    if (au() && SND[job.lvl]) {
      const t = A.ctx.currentTime + .03;
      job.build = bus(); job.bus = bus();
      SND[job.lvl].build(job.build, t, job.B);
      const own = !!fv('sound' + job.lvl, '');
      if (job.lvl === 3) { // a beat of dead silence right before the scare
        job.build.gain.setValueAtTime(1, t + job.B - .55);
        job.build.gain.linearRampToValueAtTime(0, t + job.B - .45);
      }
      SND[job.lvl].scare(job.bus, t + job.B, own);
      if (own) setTimeout(() => { if (cur === job) playOwn(job.lvl); }, job.B * 1000);
    }
    if (!raf) { lastT = now(); raf = requestAnimationFrame(frame); }
  }
  function frame() {
    const t = now(), dt = Math.min(.05, t - lastT); lastT = t;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, cv.width, cv.height);
    if (!cur) { raf = 0; return; }
    raf = requestAnimationFrame(frame);
    const s = t - cur.t0;
    // voice
    if (cur.tts && !cur.spoke && s >= cur.speakAt && ttsMuted) cur.spoke = true;
    if (cur.tts && !cur.spoke && s >= cur.speakAt) {
      cur.spoke = true; cur.talking = true;
      const job = cur;
      job.say = speak(job.tts, () => { job.talking = false; job.saidAt = now() - job.t0; });
    }
    if (cur.talking) cur.T = Math.max(cur.T, s + 1.2);
    if (s >= cur.T) { finish(); return; }
    draw(cur, s, dt);
  }

  // ---------- shared drawing ----------
  function panelBox(job) {
    const pw = 900, ph = 330;
    const pos = fv('position', 'bottom');
    const y = pos === 'top' ? 60 : pos === 'middle' ? (H - ph) / 2 : H - ph - 70;
    return { x: (W - pw) / 2, y, w: pw, h: ph };
  }
  function neonFrame(c, x, y, w, h, a) {
    c.save();
    c.globalAlpha *= a;
    const gr = c.createLinearGradient(x, y, x + w, y + h);
    gr.addColorStop(0, '#ff2fa0'); gr.addColorStop(.5, '#b14dff'); gr.addColorStop(1, '#22e4ff');
    rr(c, x, y, w, h, 28);
    c.lineWidth = 7; c.strokeStyle = gr;
    c.shadowColor = '#ff2fa0'; c.shadowBlur = 30; c.stroke();
    c.shadowColor = '#22e4ff'; c.shadowBlur = 18; c.stroke();
    c.shadowBlur = 0; c.lineWidth = 2; c.strokeStyle = 'rgba(255,255,255,.7)'; c.stroke();
    c.restore();
  }
  function panelAlpha(s, job) {
    // two soft neon-tube dips while it switches on, fade out at the end
    let a = ease(s / .35);
    if (s > .12 && s < .2) a *= .45;
    if (s > .28 && s < .33) a *= .7;
    const out = job.T - s;
    if (out < .6) a *= clamp(out / .6, 0, 1);
    return a;
  }
  function panel(job, s, inner, a) {
    const P = panelBox(job);
    g.save();
    g.globalAlpha = a;
    rr(g, P.x, P.y, P.w, P.h, 28);
    g.fillStyle = '#07041a'; g.fill();
    g.save(); g.clip();
    g.translate(P.x, P.y);
    inner(g, P.w, P.h, s);
    const sh = g.createLinearGradient(0, 0, P.w * .75, 0);
    sh.addColorStop(0, 'rgba(6,3,18,.86)'); sh.addColorStop(.6, 'rgba(6,3,18,.45)'); sh.addColorStop(1, 'rgba(6,3,18,0)');
    g.fillStyle = sh; g.fillRect(0, 0, P.w, P.h);
    words(job, P.w, P.h, s);
    g.restore();
    g.restore();
    neonFrame(g, P.x, P.y, P.w, P.h, a);
  }
  function words(job, w, h, s) {
    g.textBaseline = 'alphabetic';
    g.font = '50px Pacifico, cursive';
    glowText(g, job.label, 40, 76, '#ff7cc6', '#ff2fa0', 26);
    const ns = fitFont(g, job.line, 'Bungee, Impact, sans-serif', 66, w - 80);
    glowText(g, job.line, 40, 76 + ns + 14, '#ffffff', '#22e4ff', 24);
    let y = 76 + ns + 14 + 48;
    if (job.sub) {
      fitFont(g, job.sub, 'Bungee, Impact, sans-serif', 34, w - 80);
      glowText(g, job.sub, 42, y, '#ffd36b', '#ff8a00', 14);
      y += 44;
    }
    const msg = job.msg && on('showMessage', true) ? job.msg : '';
    if (msg) {
      g.font = '600 27px "Trebuchet MS", Arial, sans-serif';
      const lines = wrap(g, msg, w - 90, h - y > 70 ? 2 : 1);
      g.fillStyle = 'rgba(255,255,255,.88)';
      lines.forEach((l, i) => g.fillText(l, 42, y + i * 34));
    }
    if (job.talking) {
      const bx = w - 92, by = 40;
      for (let i = 0; i < 5; i++) {
        const hh = 10 + Math.abs(Math.sin(s * 9 + i * 1.3)) * 30;
        g.fillStyle = i % 2 ? '#22e4ff' : '#ff2fa0';
        g.fillRect(bx + i * 12, by + 40 - hh, 8, hh);
      }
    }
  }
  function shake(job, s) {
    if (!on('shake', true) || !job.shakeAt) return [0, 0];
    const u = s - job.shakeAt;
    if (u < 0 || u > job.shakeLen) return [0, 0];
    const k = (1 - u / job.shakeLen) * job.shakeAmp;
    return [(Math.random() * 2 - 1) * k, (Math.random() * 2 - 1) * k];
  }
  function flash(job, s, color) {
    if (!job.flashAt) return;
    const u = s - job.flashAt;
    if (u < 0 || u > .35) return;
    const peak = on('flash', true) ? .85 : .18;
    g.save(); g.globalAlpha = peak * (1 - u / .35); g.fillStyle = color; g.fillRect(-50, -50, W + 100, H + 100); g.restore();
  }
  function particles(job, dt) {
    const P = job.parts;
    for (let i = P.length - 1; i >= 0; i--) {
      const p = P[i];
      p.life -= dt; if (p.life <= 0) { P.splice(i, 1); continue; }
      p.vy += (p.grav || 1400) * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.r += (p.spin || 0) * dt;
      g.save(); g.globalAlpha = clamp(p.life / p.max, 0, 1); g.translate(p.x, p.y); g.rotate(p.r);
      if (p.kind === 'shard') {
        g.fillStyle = 'rgba(210,240,255,.75)'; g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = 1.5;
        g.beginPath(); g.moveTo(0, -p.size); g.lineTo(p.size * .6, p.size * .5); g.lineTo(-p.size * .5, p.size * .4); g.closePath(); g.fill(); g.stroke();
      } else {
        g.fillStyle = p.color; g.beginPath(); g.arc(0, 0, p.size, 0, 7); g.fill();
      }
      g.restore();
    }
  }
  function spawn(job, n, x, y, o) {
    for (let i = 0; i < n; i++) {
      const a = (o.a0 ?? -Math.PI) + Math.random() * (o.aw ?? Math.PI), sp = o.sp0 + Math.random() * o.sp;
      const life = (o.life || 1) * (.6 + Math.random() * .6);
      job.parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life, max: life, size: o.size0 + Math.random() * o.size, color: o.colors[i % o.colors.length], kind: o.kind, grav: o.grav, r: Math.random() * 6, spin: (Math.random() - .5) * 12 });
    }
  }

  // ---------- scenery ----------
  function skyline(c, w, horizon, seed, scaleY) {
    const r = rng(seed);
    let x = -10;
    c.fillStyle = '#0d0624';
    const wins = [];
    while (x < w + 20) {
      const bw = 30 + r() * 70, bh = (30 + r() * 110) * scaleY;
      c.fillRect(x, horizon - bh, bw, bh);
      if (r() < .5) c.fillRect(x + bw * .4, horizon - bh - 14 * scaleY, 4, 14 * scaleY);
      for (let i = 0; i < 4; i++) if (r() < .55) wins.push([x + 6 + r() * (bw - 14), horizon - bh + 8 + r() * (bh - 16), r() < .5 ? '#ff4fb4' : '#3fe9ff']);
      x += bw + 2;
    }
    wins.forEach(([wx, wy, col]) => { c.fillStyle = col; c.shadowColor = col; c.shadowBlur = 8; c.fillRect(wx, wy, 5, 3); });
    c.shadowBlur = 0;
  }
  function palm(c, x, baseY, h, lean, col) {
    c.save();
    c.strokeStyle = col; c.fillStyle = col; c.lineCap = 'round';
    const tx = x + lean * h * .35, ty = baseY - h;
    c.lineWidth = Math.max(2, h * .045);
    c.beginPath(); c.moveTo(x, baseY); c.quadraticCurveTo(x + lean * h * .05, baseY - h * .55, tx, ty); c.stroke();
    c.lineWidth = Math.max(2, h * .05);
    for (let i = 0; i < 7; i++) {
      const a = -Math.PI * .95 + i * (Math.PI * .95 / 6);
      const len = h * (.42 + (i % 2) * .08);
      const ex = tx + Math.cos(a) * len, ey = ty + Math.sin(a) * len * .5 + len * .35;
      c.beginPath(); c.moveTo(tx, ty);
      c.quadraticCurveTo(tx + Math.cos(a) * len * .55, ty + Math.sin(a) * len * .55 - h * .06, ex, ey);
      c.stroke();
    }
    c.beginPath(); c.arc(tx, ty + 2, h * .035, 0, 7); c.fill();
    c.restore();
  }

  // ---------- 1: the gator ----------
  function drawGator(c, cx, cy, k, open, t) {
    c.save();
    c.translate(cx, cy); c.scale(k, k);
    const up = .18 + .82 * open, dn = .18 + .82 * open;
    const skinG = (y0, y1) => { const s = c.createLinearGradient(0, y0, 0, y1); s.addColorStop(0, '#3f5c2b'); s.addColorStop(1, '#15220d'); return s; };
    const shoe = (rx, top, bot, sx) => { // horseshoe path: ends at y=bot, curve reaches y=top
      c.moveTo(-rx, bot); c.bezierCurveTo(-rx, bot + (top - bot) * .75, -rx * .55, top, 0, top);
      c.bezierCurveTo(rx * .55, top, rx, bot + (top - bot) * .75, rx, bot);
    };
    // throat
    const th = c.createRadialGradient(0, 30, 10, 0, 30, 260 * Math.max(up, .4));
    th.addColorStop(0, '#000'); th.addColorStop(.5, '#2a0410'); th.addColorStop(1, '#5e0f25');
    c.fillStyle = th; c.beginPath(); c.ellipse(0, 30, 250, 300 * Math.max(up, .2), 0, 0, 7); c.fill();
    // lower jaw: outer skin band, then the pink floor + tongue
    c.fillStyle = skinG(40, 420 * dn);
    c.beginPath(); shoe(285, 60 + 360 * dn, 40, 1); c.lineTo(250, 40); c.lineTo(-250, 40); c.closePath(); c.fill();
    c.fillStyle = '#a3344f';
    c.beginPath(); shoe(225, 60 + 290 * dn, 60, 1); c.closePath(); c.fill();
    c.fillStyle = '#c94d6c'; c.beginPath(); c.ellipse(0, 60 + 170 * dn, 110, 70 * dn + 10, 0, 0, 7); c.fill();
    c.strokeStyle = 'rgba(80,10,25,.6)'; c.lineWidth = 4; c.beginPath(); c.moveTo(0, 70); c.lineTo(0, 60 + 230 * dn); c.stroke();
    // lower teeth (point up / inward)
    for (let i = 0; i <= 18; i++) {
      const u = i / 18, a = Math.PI * u;
      const x = -Math.cos(a) * 222, y = 60 + Math.sin(a) * 285 * dn;
      const l = (26 + ((i * 7) % 4) * 9) * (.6 + .4 * dn);
      const ix = -x * .12, iy = -(y - 40) * .45;
      const len = Math.hypot(ix, iy) || 1;
      c.fillStyle = i % 5 === 2 ? '#d9c98f' : '#f3ecd6';
      c.beginPath(); c.moveTo(x - 10, y); c.lineTo(x + ix / len * l, y + iy / len * l); c.lineTo(x + 10, y); c.closePath(); c.fill();
    }
    // upper jaw: outer band (snout tip at the top), palate inside
    c.fillStyle = skinG(-420 * up, 60);
    c.beginPath(); shoe(300, 20 - 380 * up, 60, -1); c.lineTo(260, 60); c.lineTo(-260, 60); c.closePath(); c.fill();
    c.fillStyle = '#b8466a';
    c.beginPath(); shoe(235, 20 - 300 * up, 40, -1); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(255,200,215,.35)'; c.lineWidth = 5;
    for (let i = 1; i < 6; i++) { const y = 30 - i * 50 * up; const w = 200 - i * 26; c.beginPath(); c.moveTo(-w, y + 12); c.quadraticCurveTo(0, y - 10, w, y + 12); c.stroke(); }
    // deep throat between the palate and the floor
    const tg = c.createRadialGradient(0, 50, 5, 0, 50, 190);
    tg.addColorStop(0, '#000'); tg.addColorStop(.7, '#1c0209'); tg.addColorStop(1, 'rgba(60,8,24,0)');
    c.fillStyle = tg; c.beginPath(); c.ellipse(0, 50, 205, 30 + 85 * Math.min(up, dn), 0, 0, 7); c.fill();
    // upper teeth (point down / inward)
    for (let i = 0; i <= 20; i++) {
      const u = i / 20, a = Math.PI * u;
      const x = -Math.cos(a) * 232, y = 40 - Math.sin(a) * 300 * up;
      const l = (30 + ((i * 5) % 4) * 11) * (.6 + .4 * up);
      const ix = -x * .12, iy = (40 - y) * .45 + 8;
      const len = Math.hypot(ix, iy) || 1;
      c.fillStyle = i % 6 === 3 ? '#d9c98f' : '#f6f0dc';
      c.beginPath(); c.moveTo(x - 11, y); c.lineTo(x + ix / len * l, y + iy / len * l); c.lineTo(x + 11, y); c.closePath(); c.fill();
    }
    // nostrils at the snout tip
    const tipY = 20 - 380 * up;
    c.fillStyle = '#0a1205';
    c.beginPath(); c.ellipse(-26, tipY + 22, 11, 7, -.4, 0, 7); c.ellipse(26, tipY + 22, 11, 7, .4, 0, 7); c.fill();
    // scale bumps on the bands
    c.fillStyle = 'rgba(8,16,4,.55)';
    for (let i = 1; i < 10; i++) {
      const a = Math.PI * i / 10;
      c.beginPath(); c.ellipse(-Math.cos(a) * 268, 40 - Math.sin(a) * 340 * up, 12, 8, a, 0, 7); c.fill();
      c.beginPath(); c.ellipse(-Math.cos(a) * 255, 60 + Math.sin(a) * 325 * dn, 11, 7, -a, 0, 7); c.fill();
    }
    // eyes, hooded and mean, sitting behind the upper jaw
    [-1, 1].forEach(sd => {
      const ex = sd * 175, ey = tipY + 40 + 60 * up;
      c.fillStyle = '#243a17'; c.beginPath(); c.ellipse(ex, ey, 62, 44, sd * .25, 0, 7); c.fill();
      c.save();
      c.shadowColor = '#ff5a1f'; c.shadowBlur = 40;
      const eg = c.createRadialGradient(ex, ey + 4, 3, ex, ey + 4, 34);
      eg.addColorStop(0, '#fff7a8'); eg.addColorStop(.55, '#f0b414'); eg.addColorStop(1, '#8a3a00');
      c.fillStyle = eg; c.beginPath(); c.ellipse(ex, ey + 4, 36, 24, sd * .25, 0, 7); c.fill();
      c.restore();
      c.fillStyle = '#050505'; c.beginPath(); c.ellipse(ex, ey + 4, 4, 21, 0, 0, 7); c.fill();
      // heavy brow over the eye
      c.fillStyle = '#1a2a10';
      c.beginPath(); c.moveTo(ex - 70 * sd, ey - 34); c.quadraticCurveTo(ex, ey - 62, ex + 70 * sd, ey - 10); c.quadraticCurveTo(ex, ey - 20, ex - 70 * sd, ey - 34); c.fill();
    });
    // neon rim light on the outer edge
    c.save(); c.lineWidth = 7; c.globalAlpha = .85;
    c.strokeStyle = '#ff2fa0'; c.shadowColor = '#ff2fa0'; c.shadowBlur = 28;
    c.beginPath(); c.moveTo(-300, 60); c.bezierCurveTo(-300, 60 - 285 * up, -165, 20 - 380 * up, 0, 20 - 380 * up); c.stroke();
    c.beginPath(); c.moveTo(-285, 40); c.bezierCurveTo(-285, 40 + 315 * dn, -157, 60 + 360 * dn, 0, 60 + 360 * dn); c.stroke();
    c.strokeStyle = '#22e4ff'; c.shadowColor = '#22e4ff';
    c.beginPath(); c.moveTo(300, 60); c.bezierCurveTo(300, 60 - 285 * up, 165, 20 - 380 * up, 0, 20 - 380 * up); c.stroke();
    c.beginPath(); c.moveTo(285, 40); c.bezierCurveTo(285, 40 + 315 * dn, 157, 60 + 360 * dn, 0, 60 + 360 * dn); c.stroke();
    c.restore();
    c.restore();
  }
  function canal(c, w, h, s, job) {
    const hz = h * .55;
    const sky = c.createLinearGradient(0, 0, 0, hz);
    sky.addColorStop(0, '#0a0420'); sky.addColorStop(1, '#4a1252');
    c.fillStyle = sky; c.fillRect(0, 0, w, hz);
    c.save(); c.shadowColor = '#ffd9f0'; c.shadowBlur = 40; c.fillStyle = '#ffe9f5';
    c.beginPath(); c.arc(w * .8, 70, 34, 0, 7); c.fill(); c.restore();
    skyline(c, w, hz, 7, .7);
    palm(c, w * .93, hz + 6, 150, -.4, '#05020f');
    palm(c, w * .86, hz + 6, 110, .3, '#05020f');
    const wa = c.createLinearGradient(0, hz, 0, h);
    wa.addColorStop(0, '#120a35'); wa.addColorStop(1, '#02040d');
    c.fillStyle = wa; c.fillRect(0, hz, w, h - hz);
    for (let i = 0; i < 26; i++) {
      const y = hz + 6 + i * 6.5, x = w * .8 + Math.sin(s * 2 + i) * 18 - i * 1.5;
      c.fillStyle = `rgba(255,230,245,${.35 - i * .012})`; c.fillRect(x - 30 + i, y, 60 - i * 1.6, 2);
      c.fillStyle = `rgba(255,79,180,${.25 - i * .008})`; c.fillRect(w * .2 + Math.sin(s * 1.6 + i * .7) * 40, y + 3, 90, 2);
      c.fillStyle = `rgba(63,233,255,${.22 - i * .007})`; c.fillRect(w * .48 + Math.cos(s * 1.3 + i * .5) * 30, y + 1, 70, 2);
    }
    // eyes in the water before the scare
    const u = s - (job.B - 1.5);
    if (u > 0 && s < job.B) {
      const a = ease(u / .8), ex = w * .62, ey = h * .78 - u * 6, sp = 30 + u * 8;
      c.save(); c.globalAlpha = a; c.shadowColor = '#fff36b'; c.shadowBlur = 18; c.fillStyle = '#ffe85a';
      c.beginPath(); c.ellipse(ex - sp, ey, 7, 4, 0, 0, 7); c.ellipse(ex + sp, ey, 7, 4, 0, 0, 7); c.fill();
      c.restore();
      c.strokeStyle = `rgba(200,220,255,${.3 * a})`; c.lineWidth = 2;
      for (let i = 0; i < 2; i++) { c.beginPath(); c.ellipse(ex, ey + 8, 40 + ((s * 40 + i * 30) % 60), 7, 0, 0, 7); c.stroke(); }
    }
  }
  function scene1(job, s, dt) {
    const a = panelAlpha(s, job);
    panel(job, s, (c, w, h) => canal(c, w, h, s, job), a);
    const P = panelBox(job), u = s - job.B;
    if (u >= 0 && u < 1.6) {
      if (!job.hit) { job.hit = 1; job.shakeAt = job.B; job.shakeLen = .5; job.shakeAmp = 18; spawn(job, 40, P.x + P.w / 2, P.y + P.h * .8, { sp0: 500, sp: 900, size0: 4, size: 8, colors: ['#9fe8ff', '#ffffff', '#ff8fd0'], life: 1 }); }
      if (u > .45 && !job.hit2) { job.hit2 = 1; job.shakeAt = s; job.shakeLen = .4; job.shakeAmp = 26; }
      const up = ease(u / .22), down = easeIn((u - .95) / .55);
      const k = lerp(.3, 1.55, up) - down * 1.1;
      const cy = lerp(P.y + P.h + 160, H * .47, up) + down * 800;
      const open = u < .45 ? 1 : u < .52 ? 1 - (u - .45) / .07 : 0;
      g.save(); g.globalAlpha = clamp(1 - down * 1.2, 0, 1);
      drawGator(g, W / 2, cy, k, open, s);
      g.restore();
    }
    particles(job, dt);
  }

  // ---------- 2: the headlights ----------
  function road(c, w, h, s, job) {
    const hz = h * .46, vx = w * .62;
    const sky = c.createLinearGradient(0, 0, 0, hz);
    sky.addColorStop(0, '#0b0322'); sky.addColorStop(.7, '#5c1460'); sky.addColorStop(1, '#ff4f8b');
    c.fillStyle = sky; c.fillRect(0, 0, w, hz);
    const r = rng(3);
    for (let i = 0; i < 40; i++) { c.fillStyle = `rgba(255,255,255,${.3 + r() * .5})`; c.fillRect(r() * w, r() * hz * .6, 2, 2); }
    skyline(c, w, hz, 11, .55);
    c.fillStyle = '#05020c'; c.fillRect(0, hz, w, h - hz);
    // road
    c.fillStyle = '#100b1c';
    c.beginPath(); c.moveTo(vx - 8, hz); c.lineTo(vx + 8, hz); c.lineTo(w * 1.25, h); c.lineTo(-w * .05, h); c.closePath(); c.fill();
    c.strokeStyle = '#22e4ff'; c.lineWidth = 3; c.shadowColor = '#22e4ff'; c.shadowBlur = 12;
    c.beginPath(); c.moveTo(vx - 8, hz); c.lineTo(-w * .05, h); c.moveTo(vx + 8, hz); c.lineTo(w * 1.25, h); c.stroke();
    c.shadowBlur = 0;
    // dashes coming at you
    for (let i = 0; i < 8; i++) {
      const z = ((i / 8) + s * .9) % 1, zz = z * z;
      const y1 = hz + (h - hz) * zz, y2 = hz + (h - hz) * Math.min(1, (z + .05) * (z + .05));
      const x1 = vx + (w * .6 - vx) * zz, x2 = vx + (w * .6 - vx) * Math.min(1, (z + .05) * (z + .05));
      c.strokeStyle = '#ffd36b'; c.lineWidth = 1 + zz * 10;
      c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
    }
    // palms rushing past
    for (let i = 0; i < 4; i++) {
      const z = ((i / 4) + s * .45) % 1, zz = z * z;
      const y = hz + (h - hz) * zz;
      palm(c, vx + (-w * .1 - vx) * zz - 20, y + 4, 20 + zz * 260, .2, '#040109');
      palm(c, vx + (w * 1.3 - vx) * zz + 20, y + 4, 20 + zz * 260, -.2, '#040109');
    }
    // lights far ahead, getting closer
    const u = s - (job.B - 1.8);
    if (u > 0 && s < job.B) {
      const k = .2 + easeIn(u / 1.8) * 1.4;
      [-1, 1].forEach(sd => {
        const lx = vx + sd * 9 * k, ly = hz + 6 * k;
        const gl = c.createRadialGradient(lx, ly, 0, lx, ly, 18 * k);
        gl.addColorStop(0, 'rgba(255,255,235,.95)'); gl.addColorStop(1, 'rgba(255,240,180,0)');
        c.fillStyle = gl; c.beginPath(); c.arc(lx, ly, 18 * k, 0, 7); c.fill();
      });
    }
  }
  function drawCar(c, cx, cy, k, label) {
    c.save(); c.translate(cx, cy); c.scale(k, k);
    // headlight glare behind the body
    [-1, 1].forEach(sd => {
      const hx = sd * 215, hy = -15;
      const gl = c.createRadialGradient(hx, hy, 10, hx, hy, 420);
      gl.addColorStop(0, 'rgba(255,253,235,.9)'); gl.addColorStop(.3, 'rgba(255,240,190,.4)'); gl.addColorStop(1, 'rgba(255,230,160,0)');
      c.fillStyle = gl; c.beginPath(); c.arc(hx, hy, 420, 0, 7); c.fill();
    });
    // underglow
    const ug = c.createRadialGradient(0, 120, 10, 0, 120, 330);
    ug.addColorStop(0, 'rgba(255,47,160,.75)'); ug.addColorStop(1, 'rgba(255,47,160,0)');
    c.fillStyle = ug; c.fillRect(-340, 40, 680, 180);
    // body
    const bd = c.createLinearGradient(0, -150, 0, 110);
    bd.addColorStop(0, '#2b1240'); bd.addColorStop(1, '#0a0412');
    c.fillStyle = bd;
    c.beginPath();
    c.moveTo(-300, 90); c.lineTo(-310, -10); c.quadraticCurveTo(-290, -60, -220, -70);
    c.lineTo(-150, -150); c.lineTo(150, -150); c.lineTo(220, -70);
    c.quadraticCurveTo(290, -60, 310, -10); c.lineTo(300, 90); c.closePath(); c.fill();
    // windshield
    const ws = c.createLinearGradient(0, -145, 0, -75);
    ws.addColorStop(0, '#36d6ff'); ws.addColorStop(1, '#1a0a33');
    c.fillStyle = ws; c.globalAlpha = .55;
    c.beginPath(); c.moveTo(-135, -142); c.lineTo(135, -142); c.lineTo(195, -78); c.lineTo(-195, -78); c.closePath(); c.fill();
    c.globalAlpha = 1;
    // grille
    c.fillStyle = '#05020a'; rr(c, -120, -20, 240, 60, 12); c.fill();
    c.strokeStyle = '#3a2a55'; c.lineWidth = 4;
    for (let i = 0; i < 5; i++) { c.beginPath(); c.moveTo(-110, -10 + i * 11); c.lineTo(110, -10 + i * 11); c.stroke(); }
    // bumper + plate
    c.fillStyle = '#1b0f2b'; c.fillRect(-300, 60, 600, 34);
    c.fillStyle = '#f5f1e6'; rr(c, -85, 52, 170, 52, 6); c.fill();
    c.strokeStyle = '#ff2fa0'; c.lineWidth = 3; rr(c, -85, 52, 170, 52, 6); c.stroke();
    c.fillStyle = '#16123a'; c.textAlign = 'center'; c.textBaseline = 'middle';
    fitFont(c, label, 'Bungee, Impact, sans-serif', 30, 150);
    c.fillText(label, 0, 80);
    c.textAlign = 'left'; c.textBaseline = 'alphabetic';
    // headlights (the glow was drawn behind the car)
    [-1, 1].forEach(sd => {
      const hx = sd * 215, hy = -15;
      c.save(); c.shadowColor = '#fff3c4'; c.shadowBlur = 60; c.fillStyle = '#fffbe6';
      rr(c, hx - 70, hy - 22, 140, 44, 18); c.fill(); c.restore();
    });
    c.restore();
  }
  function cracks(job, s) {
    const u = s - (job.B + .32);
    if (u < 0 || u > 1.7) return;
    if (!job.crack) {
      const r = rng(job.seed), ox = W * (.4 + r() * .2), oy = H * (.35 + r() * .2), lines = [];
      for (let i = 0; i < 16; i++) {
        let a = (i / 16) * Math.PI * 2 + r() * .3, x = ox, y = oy; const pts = [[x, y]];
        for (let j = 0; j < 6; j++) { a += (r() - .5) * .6; const l = 60 + r() * 150; x += Math.cos(a) * l; y += Math.sin(a) * l; pts.push([x, y]); }
        lines.push(pts);
      }
      const rings = [60, 130, 220].map(rad => { const p = []; for (let i = 0; i < 18; i++) { const a = i / 18 * Math.PI * 2; p.push([ox + Math.cos(a) * rad * (.8 + r() * .4), oy + Math.sin(a) * rad * (.8 + r() * .4)]); } return p; });
      job.crack = { lines, rings, ox, oy };
    }
    const a = u < 1.1 ? 1 : 1 - (u - 1.1) / .6;
    g.save(); g.globalAlpha = a;
    g.fillStyle = 'rgba(200,230,255,.08)'; g.fillRect(0, 0, W, H);
    g.strokeStyle = 'rgba(235,248,255,.9)'; g.lineWidth = 2.5; g.shadowColor = '#bff4ff'; g.shadowBlur = 6;
    job.crack.lines.forEach(p => { g.beginPath(); g.moveTo(p[0][0], p[0][1]); p.slice(1).forEach(q => g.lineTo(q[0], q[1])); g.stroke(); });
    g.lineWidth = 1.5;
    job.crack.rings.forEach(p => { g.beginPath(); g.moveTo(p[0][0], p[0][1]); p.forEach(q => g.lineTo(q[0], q[1])); g.closePath(); g.stroke(); });
    g.restore();
  }
  function scene2(job, s, dt) {
    const a = panelAlpha(s, job);
    panel(job, s, (c, w, h) => road(c, w, h, s, job), a);
    const P = panelBox(job), u = s - job.B;
    if (u >= 0 && u < .42) {
      const k = .25 + Math.pow(u / .32, 2.2) * 3.2;
      // night falls over the screen, then the car comes out of it
      g.save(); g.globalAlpha = clamp(u / .12, 0, 1) * .6; g.fillStyle = '#05020c'; g.fillRect(-50, -50, W + 100, H + 100); g.restore();
      drawCar(g, W / 2, lerp(P.y + P.h * .45, H * .58, clamp(u / .32, 0, 1)), Math.min(k, 3.6), job.plate);
    }
    if (u >= .32 && !job.hit) {
      job.hit = 1; job.flashAt = s; job.shakeAt = s; job.shakeLen = .7; job.shakeAmp = 34;
      spawn(job, 46, W / 2, H * .45, { a0: 0, aw: Math.PI * 2, sp0: 300, sp: 1100, size0: 8, size: 22, colors: ['#fff'], kind: 'shard', life: 1.3, grav: 1600 });
    }
    flash(job, s, '#fff6e0');
    cracks(job, s);
    particles(job, dt);
  }

  // ---------- 3: the spotlight + the ghoul ----------
  function alley(c, s) {
    c.fillStyle = '#140a1c'; c.fillRect(0, 0, W, H);
    // bricks
    for (let y = 0; y < H * .72; y += 34) for (let x = ((y / 34) % 2) * -40; x < W; x += 80) {
      c.fillStyle = ((x * 7 + y * 3) % 5) ? '#3a1a28' : '#2f1420'; c.fillRect(x + 2, y + 2, 76, 30);
    }
    // neon flamingo sign
    c.save(); c.translate(W * .22, H * .3);
    c.lineWidth = 9; c.lineCap = 'round'; c.lineJoin = 'round';
    c.strokeStyle = '#ff5fb9'; c.shadowColor = '#ff2fa0'; c.shadowBlur = 30;
    c.beginPath(); c.ellipse(0, 40, 60, 38, -.2, 0, 7); c.stroke();
    c.beginPath(); c.moveTo(45, 15); c.bezierCurveTo(80, -40, 40, -90, 70, -120); c.quadraticCurveTo(95, -125, 100, -100); c.lineTo(85, -85); c.stroke();
    c.beginPath(); c.moveTo(-5, 78); c.lineTo(0, 170); c.moveTo(15, 75); c.lineTo(25, 125); c.lineTo(5, 140); c.stroke();
    c.restore();
    // vertical "OPEN LATE" sign
    c.save(); c.font = '58px Monoton, Bungee, sans-serif'; c.textAlign = 'center';
    const flick = Math.sin(s * 23) > .96 ? .3 : 1;
    'OPEN'.split('').forEach((ch, i) => glowText(c, ch, W * .82, H * .14 + i * 74, `rgba(120,250,255,${flick})`, '#22e4ff', 28));
    c.restore();
    // ground + puddle reflections
    const gr = c.createLinearGradient(0, H * .72, 0, H);
    gr.addColorStop(0, '#0d0614'); gr.addColorStop(1, '#030106');
    c.fillStyle = gr; c.fillRect(0, H * .72, W, H * .28);
    c.fillStyle = 'rgba(255,79,180,.18)'; c.beginPath(); c.ellipse(W * .25, H * .86, 220, 26, 0, 0, 7); c.fill();
    c.fillStyle = 'rgba(63,233,255,.15)'; c.beginPath(); c.ellipse(W * .78, H * .9, 260, 30, 0, 0, 7); c.fill();
    // dumpster
    c.fillStyle = '#0f2a2a'; c.fillRect(W * .62, H * .6, 260, 150); c.fillStyle = '#0a1d1d'; c.fillRect(W * .615, H * .58, 272, 24);
  }
  function drawGhoul(c, cx, cy, k, t) {
    c.save(); c.translate(cx, cy); c.scale(k, k);
    // shirt + collar
    c.fillStyle = '#0f8f8a';
    c.beginPath(); c.moveTo(-330, 520); c.quadraticCurveTo(-300, 330, -120, 300); c.lineTo(0, 400); c.lineTo(120, 300); c.quadraticCurveTo(300, 330, 330, 520); c.closePath(); c.fill();
    const r = rng(5);
    for (let i = 0; i < 9; i++) {
      const fx = -260 + r() * 520, fy = 340 + r() * 160; if (Math.abs(fx) < 60 && fy < 420) continue;
      c.fillStyle = i % 2 ? '#ff5fb9' : '#ffd36b';
      for (let p = 0; p < 5; p++) { const a = p / 5 * Math.PI * 2; c.beginPath(); c.ellipse(fx + Math.cos(a) * 16, fy + Math.sin(a) * 16, 13, 9, a, 0, 7); c.fill(); }
      c.fillStyle = '#7a1040'; c.beginPath(); c.arc(fx, fy, 6, 0, 7); c.fill();
    }
    c.fillStyle = '#0b6b67'; c.beginPath(); c.moveTo(-120, 300); c.lineTo(-40, 420); c.lineTo(0, 400); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(120, 300); c.lineTo(40, 420); c.lineTo(0, 400); c.closePath(); c.fill();
    // neck
    c.fillStyle = '#6f735e'; c.fillRect(-70, 200, 140, 130);
    c.strokeStyle = 'rgba(40,30,20,.5)'; c.lineWidth = 4;
    for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(-60, 230 + i * 22); c.lineTo(60, 236 + i * 22); c.stroke(); }
    // head
    const sk = c.createRadialGradient(-40, -60, 40, 0, 0, 330);
    sk.addColorStop(0, '#aab79a'); sk.addColorStop(.55, '#78846a'); sk.addColorStop(1, '#262c20');
    c.fillStyle = sk;
    c.beginPath();
    c.moveTo(0, -300); c.bezierCurveTo(190, -300, 235, -160, 220, -20);
    c.bezierCurveTo(210, 110, 150, 220, 0, 250); c.bezierCurveTo(-150, 220, -210, 110, -220, -20);
    c.bezierCurveTo(-235, -160, -190, -300, 0, -300); c.fill();
    // sunburn
    [[-130, 40], [130, 40], [0, -10]].forEach(([x, y], i) => { const b = c.createRadialGradient(x, y, 5, x, y, i === 2 ? 60 : 85); b.addColorStop(0, 'rgba(220,60,50,.55)'); b.addColorStop(1, 'rgba(220,60,50,0)'); c.fillStyle = b; c.beginPath(); c.arc(x, y, 90, 0, 7); c.fill(); });
    // sunken cheeks
    c.fillStyle = 'rgba(40,30,25,.35)';
    c.beginPath(); c.ellipse(-150, 90, 40, 80, .2, 0, 7); c.ellipse(150, 90, 40, 80, -.2, 0, 7); c.fill();
    // cracks
    c.strokeStyle = 'rgba(70,40,30,.6)'; c.lineWidth = 3;
    [[-90, -230, -60, -180, -75, -140], [110, -220, 90, -170, 120, -130], [-180, 0, -150, 30, -165, 70]].forEach(p => { c.beginPath(); c.moveTo(p[0], p[1]); c.lineTo(p[2], p[3]); c.lineTo(p[4], p[5]); c.stroke(); });
    // hair: thin strands hanging down the sides of the head
    c.strokeStyle = '#17130f'; c.lineCap = 'round';
    [-1, 1].forEach(sd => {
      for (let i = 0; i < 11; i++) {
        const sway = Math.sin(t * 5 + i * .9) * 8;
        c.lineWidth = 4 + (i % 3);
        c.beginPath();
        c.moveTo(sd * (30 + i * 15), -292 + i * 5);
        c.quadraticCurveTo(sd * (205 + i * 4) + sway, -230 + i * 6, sd * (228 + i * 3) + sway * 1.6, -30 + i * 26);
        c.stroke();
      }
    });
    // dark hollows round the eyes
    [-1, 1].forEach(sd => { const hg = c.createRadialGradient(sd * 100, -60, 20, sd * 100, -60, 130); hg.addColorStop(0, 'rgba(20,10,25,.75)'); hg.addColorStop(1, 'rgba(20,10,25,0)'); c.fillStyle = hg; c.beginPath(); c.arc(sd * 100, -60, 130, 0, 7); c.fill(); });
    // brow
    c.strokeStyle = 'rgba(40,30,20,.7)'; c.lineWidth = 5;
    c.beginPath(); c.moveTo(-180, -125); c.quadraticCurveTo(-90, -165, -20, -110); c.moveTo(180, -125); c.quadraticCurveTo(90, -165, 20, -110); c.stroke();
    // sunglasses
    const lens = (sx) => {
      c.save(); c.scale(sx, 1);
      c.beginPath(); c.moveTo(-15, -95); c.bezierCurveTo(-60, -110, -190, -110, -195, -70); c.bezierCurveTo(-200, 0, -120, 30, -75, 15); c.bezierCurveTo(-30, 0, -15, -50, -15, -95); c.closePath();
      c.restore();
    };
    [1, -1].forEach(sx => {
      lens(sx);
      const lg = c.createLinearGradient(0, -110, 0, 25);
      lg.addColorStop(0, '#2a0b45'); lg.addColorStop(.45, '#ff3fa4'); lg.addColorStop(.62, '#ffb347'); lg.addColorStop(.63, '#130626'); lg.addColorStop(1, '#22e4ff');
      c.fillStyle = lg; c.fill();
      c.lineWidth = 9; c.strokeStyle = '#0a0a0a'; c.stroke();
      // tiny palm reflection
      c.save(); lens(sx); c.clip(); palm(c, sx * -150, -12, 70, .2 * sx, 'rgba(10,2,25,.85)'); c.fillStyle = 'rgba(255,255,255,.45)'; c.save(); c.rotate(-.5); c.fillRect(sx * -60 - 10, -60, 14, 110); c.restore();
      if (sx === 1) { // the cracked lens: a hole with a red eye staring through
        c.fillStyle = '#050206'; c.beginPath(); c.moveTo(-150, -70); c.lineTo(-95, -95); c.lineTo(-60, -60); c.lineTo(-75, -15); c.lineTo(-125, -8); c.lineTo(-160, -35); c.closePath(); c.fill();
        c.save(); c.shadowColor = '#ff1a1a'; c.shadowBlur = 35; c.fillStyle = '#ff2a2a'; c.beginPath(); c.arc(-108, -50, 13, 0, 7); c.fill(); c.fillStyle = '#ffd0d0'; c.beginPath(); c.arc(-108, -50, 4, 0, 7); c.fill(); c.restore();
        c.strokeStyle = 'rgba(255,255,255,.85)'; c.lineWidth = 2.5;
        [[-95, -95, -40, -105], [-60, -60, -20, -40], [-75, -15, -60, 20], [-150, -70, -185, -90], [-125, -8, -140, 25]].forEach(q => { c.beginPath(); c.moveTo(q[0], q[1]); c.lineTo(q[2], q[3]); c.stroke(); });
      }
      c.restore();
    });
    c.lineWidth = 9; c.strokeStyle = '#0a0a0a'; c.beginPath(); c.moveTo(-18, -92); c.quadraticCurveTo(0, -102, 18, -92); c.stroke();
    // nose
    c.fillStyle = '#1a120c';
    c.beginPath(); c.moveTo(-8, 10); c.lineTo(-28, 52); c.lineTo(-10, 48); c.closePath(); c.moveTo(8, 10); c.lineTo(28, 52); c.lineTo(10, 48); c.closePath(); c.fill();
    // gaping grin with pointed teeth
    c.fillStyle = '#7a1a26';
    c.beginPath(); c.moveTo(-185, 70); c.quadraticCurveTo(0, 290, 185, 70); c.quadraticCurveTo(0, 120, -185, 70); c.closePath(); c.fill();
    c.fillStyle = '#0a0103';
    c.beginPath(); c.moveTo(-160, 92); c.quadraticCurveTo(0, 250, 160, 92); c.quadraticCurveTo(0, 150, -160, 92); c.closePath(); c.fill();
    for (let i = 0; i < 15; i++) {
      const u = i / 14, x = lerp(-165, 165, u);
      const yt = 82 + Math.sin(u * Math.PI) * 52, yb = 80 + Math.sin(u * Math.PI) * 200;
      const lt = 30 + Math.sin(u * Math.PI) * 24 + (i % 3) * 7, lb = 26 + Math.sin(u * Math.PI) * 26 + ((i + 1) % 3) * 8;
      c.fillStyle = i % 4 === 1 ? '#c9b46a' : '#efe6c4';
      c.beginPath(); c.moveTo(x - 11, yt); c.lineTo(x + 1, yt + lt); c.lineTo(x + 11, yt); c.closePath(); c.fill();
      c.beginPath(); c.moveTo(x - 10, yb); c.lineTo(x - 1, yb - lb); c.lineTo(x + 10, yb); c.closePath(); c.fill();
    }
    c.strokeStyle = '#3a1a14'; c.lineWidth = 6;
    c.beginPath(); c.moveTo(-185, 70); c.quadraticCurveTo(0, 290, 185, 70); c.stroke();
    c.strokeStyle = 'rgba(220,235,210,.55)'; c.lineWidth = 3;
    [[-90, 222, 60], [40, 236, 85], [120, 196, 45]].forEach(([x, y, l]) => { const d = l + Math.sin(t * 3 + x) * 12; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + 4, y + d * .6, x, y + d); c.stroke(); c.fillStyle = 'rgba(220,235,210,.6)'; c.beginPath(); c.arc(x, y + d, 5, 0, 7); c.fill(); });
    // neon rim light
    c.save(); c.lineWidth = 8; c.globalAlpha = .85;
    c.strokeStyle = '#ff2fa0'; c.shadowColor = '#ff2fa0'; c.shadowBlur = 30;
    c.beginPath(); c.moveTo(0, -300); c.bezierCurveTo(-190, -300, -235, -160, -220, -20); c.bezierCurveTo(-210, 110, -150, 220, -10, 250); c.stroke();
    c.strokeStyle = '#22e4ff'; c.shadowColor = '#22e4ff';
    c.beginPath(); c.moveTo(0, -300); c.bezierCurveTo(190, -300, 235, -160, 220, -20); c.bezierCurveTo(210, 110, 150, 220, 10, 250); c.stroke();
    c.restore();
    c.restore();
  }
  let dark = null;
  function scene3(job, s, dt) {
    const B = job.B, u = s - B;
    const end = job.T - s;
    const fadeOut = clamp(end / .6, 0, 1);
    const darkA = s < B + 1.1 ? ease(s / 1.4) * .9 : .9 * (1 - ease((u - 1.1) / .8));
    if (darkA > .01) {
      // spotlight path: sweeps, then locks on the figure
      const lock = clamp((s - (B - 1.2)) / .5, 0, 1);
      const sx = lerp(W * (.5 + .38 * Math.sin(s * 1.3)), W * .5, ease(lock));
      const sy = lerp(H * (.5 + .22 * Math.sin(s * 2.1 + 1)), H * .58, ease(lock));
      if (!dark) { dark = document.createElement('canvas'); dark.width = W; dark.height = H; }
      const d = dark.getContext('2d');
      d.globalCompositeOperation = 'source-over';
      d.clearRect(0, 0, W, H);
      alley(d, s);
      if (u < 0) {
        // the figure in the distance
        const fa = clamp((s - (B - 1.6)) / .4, 0, 1);
        d.save(); d.globalAlpha = fa; d.translate(W * .5, H * .62);
        d.fillStyle = '#050208';
        d.beginPath(); d.ellipse(0, -150, 34, 44, 0, 0, 7); d.fill();
        d.fillRect(-48, -110, 96, 170); d.fillRect(-40, 60, 30, 90); d.fillRect(10, 60, 30, 90);
        d.fillRect(-70, -100, 22, 140); d.fillRect(48, -100, 22, 140);
        d.fillStyle = '#ff4fb4'; d.shadowColor = '#ff4fb4'; d.shadowBlur = 12;
        d.fillRect(-24, -158, 18, 7); d.fillRect(6, -158, 18, 7);
        d.restore();
      }
      // darkness with a hole for the spotlight
      d.globalCompositeOperation = 'destination-in';
      const hole = d.createRadialGradient(sx, sy, 60, sx, sy, 290);
      hole.addColorStop(0, 'rgba(0,0,0,1)'); hole.addColorStop(1, 'rgba(0,0,0,0)');
      d.fillStyle = hole; d.fillRect(0, 0, W, H);
      d.globalCompositeOperation = 'source-over';
      g.save(); g.globalAlpha = darkA * fadeOut;
      g.fillStyle = '#020005'; g.fillRect(-60, -60, W + 120, H + 120);
      g.globalAlpha = Math.min(1, darkA * 1.1) * fadeOut;
      g.drawImage(dark, 0, 0);
      // soft police glow on the edges
      if (u < 0) {
        const p = (Math.sin(s * Math.PI * 1.4) + 1) / 2;
        const lg = g.createLinearGradient(0, 0, W * .35, 0);
        lg.addColorStop(0, `rgba(255,30,60,${.32 * p})`); lg.addColorStop(1, 'rgba(255,30,60,0)');
        g.fillStyle = lg; g.fillRect(0, 0, W * .35, H);
        const rg = g.createLinearGradient(W, 0, W * .65, 0);
        rg.addColorStop(0, `rgba(40,90,255,${.32 * (1 - p)})`); rg.addColorStop(1, 'rgba(40,90,255,0)');
        g.fillStyle = rg; g.fillRect(W * .65, 0, W * .35, H);
      }
      g.restore();
    }
    // the name card comes in after the scare (and sits on top during the build-up)
    const a = panelAlpha(s, job);
    panel(job, s, (c, w, h) => {
      const bg = c.createLinearGradient(0, 0, w, h);
      bg.addColorStop(0, '#1a0629'); bg.addColorStop(1, '#06132a');
      c.fillStyle = bg; c.fillRect(0, 0, w, h);
      c.save(); c.globalAlpha = .5; skyline(c, w, h, 21, 1); c.restore();
      palm(c, w * .9, h + 10, 230, -.3, '#05020f');
    }, a);
    if (u >= 0 && u < 1.25) {
      if (!job.hit) { job.hit = 1; job.flashAt = s; job.shakeAt = s; job.shakeLen = 1; job.shakeAmp = 40; }
      const k = u < .16 ? lerp(.12, 1.9, ease(u / .16)) : 1.9 + Math.sin(u * 40) * .02 + (u > .95 ? easeIn((u - .95) / .3) * 2.5 : 0);
      g.save(); g.globalAlpha = u > .95 ? clamp(1 - (u - .95) / .3, 0, 1) : 1;
      drawGhoul(g, W / 2 + (Math.random() - .5) * 10, lerp(H * .52, H * .55, ease(u / .16)), k, s);
      g.restore();
    }
    flash(job, s, '#ffffff');
    if (u > 1.2 && !job.burst) {
      const P = panelBox(job);
      job.burst = 1;
      spawn(job, 60, P.x + P.w / 2, P.y, { a0: -Math.PI, aw: Math.PI, sp0: 300, sp: 700, size0: 3, size: 6, colors: ['#ff2fa0', '#22e4ff', '#ffd36b', '#b14dff'], life: 1.6, grav: 700 });
    }
    particles(job, dt);
  }

  // ---------- voice-only card (channel points) + info card ----------
  function sceneVoice(job, s, dt) {
    const a = panelAlpha(s, job);
    panel(job, s, (c, w, h) => {
      const bg = c.createLinearGradient(0, 0, w, h);
      bg.addColorStop(0, '#1d0730'); bg.addColorStop(1, '#071b33');
      c.fillStyle = bg; c.fillRect(0, 0, w, h);
      // little speaker
      c.save(); c.translate(w - 150, h - 120);
      c.fillStyle = '#0b0614'; rr(c, -70, -90, 140, 180, 18); c.fill();
      c.strokeStyle = '#22e4ff'; c.lineWidth = 4; c.shadowColor = '#22e4ff'; c.shadowBlur = 14;
      const pulse = job.talking ? 1 + Math.abs(Math.sin(s * 12)) * .12 : 1;
      c.beginPath(); c.arc(0, 20, 45 * pulse, 0, 7); c.stroke();
      c.beginPath(); c.arc(0, -55, 16, 0, 7); c.stroke();
      c.restore();
    }, a);
    particles(job, dt);
  }

  function draw(job, s, dt) {
    const [sx, sy] = shake(job, s);
    g.setTransform(scale, 0, 0, scale, offX + sx * scale, offY + sy * scale);
    if (job.lvl === 1) scene1(job, s, dt);
    else if (job.lvl === 2) scene2(job, s, dt);
    else if (job.lvl === 3) scene3(job, s, dt);
    else sceneVoice(job, s, dt);
  }

  // ---------- turning events into alerts ----------
  const lvlOf = (v, med, big) => v >= big ? 3 : v >= med ? 2 : 1;
  const pickLvl = k => clamp(parseInt(fv(k, 1), 10) || 1, 1, 3);
  const money = n => sym + (Math.round(n * 100) / 100).toFixed(n % 1 ? 2 : 0);
  function makeJob(L, e) {
    const name = e.displayName || e.name || 'Someone';
    const amt = Number(e.amount) || 0;
    const ttsOn = on('ttsOn', true);
    if (L === 'follower-latest') return { lvl: pickLvl('followLevel'), label: 'New follower', line: name, plate: 'FOLLOW' };
    if (L === 'subscriber-latest') {
      if (e.isCommunityGift && !e.bulkGifted) return null;
      if (e.bulkGifted) {
        const gifter = e.sender || name;
        return { lvl: lvlOf(amt, num('giftMed', 2), num('giftBig', 10)), label: 'Gift bomb!', line: gifter, sub: `gifted ${amt} sub${amt === 1 ? '' : 's'}`, plate: `${amt} SUBS` };
      }
      const t3 = String(e.tier) === '3000';
      if (e.gifted) return { lvl: pickLvl(t3 ? 'tier3Level' : 'subLevel'), label: 'Gift sub', line: e.sender || 'Someone', sub: `gifted ${name} a sub`, plate: 'GIFT' };
      return { lvl: pickLvl(t3 ? 'tier3Level' : 'subLevel'), label: t3 ? 'Tier 3 sub!' : String(e.tier) === 'prime' ? 'Prime sub' : 'New subscriber', line: name, sub: amt > 1 ? `${amt} months` : '', msg: e.message || '', plate: amt > 1 ? `${amt} MO` : 'SUB' };
    }
    if (L === 'cheer-latest') {
      const msg = cleanTts(e.message, true);
      return { lvl: lvlOf(amt, num('bitsMed', 500), num('bitsBig', 2500)), label: 'Bits!', line: name, sub: `${amt} bits`, msg, plate: `${amt} BITS`, tts: ttsOn && amt >= num('ttsBits', 100) && msg ? msg : '' };
    }
    if (L === 'tip-latest') {
      const msg = cleanTts(e.message, false);
      return { lvl: lvlOf(amt, num('tipMed', 5), num('tipBig', 25)), label: 'Tip!', line: name, sub: money(amt), msg, plate: money(amt), tts: ttsOn && amt >= num('ttsTip', 1) && msg ? msg : '' };
    }
    if (L === 'raid-latest') return { lvl: lvlOf(amt, num('raidMed', 10), num('raidBig', 50)), label: 'Raid!', line: name, sub: `raiding with ${amt} viewer${amt === 1 ? '' : 's'}`, plate: 'RAID' };
    return null;
  }
  function saveTts() { try { SE_API.store.set('neonScareTts', { reward: ttsRewardSaved, muted: ttsMuted }); } catch (e) {} }
  function rewardId() { return String(fv('ttsReward', '') || ttsRewardSaved || '').trim(); }
  function chatMessage(d) {
    const data = (d.event && d.event.data) || {};
    const tags = data.tags || {};
    const text = String(data.text || '').trim();
    const badges = (data.badges || []).map(b => b.type).join(',') + ',' + (tags.badges || '');
    const boss = /broadcaster|moderator/.test(badges);
    const low = text.toLowerCase();
    const said = k => { const c = String(fv(k[0], k[1])).trim().toLowerCase(); return c && (low === c || low.endsWith(' ' + c)); };
    if (boss && said(['ttsSkip', '!skiptts'])) { if (speaking) speaking.stop(); return; }
    if (boss && said(['ttsOffCmd', '!ttsoff'])) { ttsMuted = true; saveTts(); if (speaking) speaking.stop(); return; }
    if (boss && said(['ttsOnCmd', '!ttson'])) { ttsMuted = false; saveTts(); return; }
    const rid = tags['custom-reward-id'];
    if (!rid) return;
    if (learning) {
      learning = false; ttsRewardSaved = rid;
      saveTts();
      push({ lvl: 'info', label: 'TTS reward saved', line: 'Learned it!', sub: 'That reward now talks', plate: '' });
      return;
    }
    if (!on('ttsOn', true) || ttsMuted || rid !== rewardId()) return;
    const msg = cleanTts(text, false);
    if (!msg) return;
    push({ lvl: 'voice', label: 'Channel points', line: data.displayName || data.nick || 'Someone', msg, tts: msg });
  }

  // ---------- phone: tap to turn sound on + keep the screen awake ----------
  let wake = null;
  async function keepAwake() { try { if (navigator.wakeLock && document.visibilityState === 'visible') wake = await navigator.wakeLock.request('screen'); } catch (e) {} }
  function tapGate() {
    if (IS_OBS) return;
    const b = document.createElement('button');
    b.textContent = '🔊 Tap to turn on alert sounds';
    b.style.cssText = 'position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:9;padding:22px 30px;font:700 22px Bungee,Arial,sans-serif;color:#fff;background:#1a0629;border:4px solid #ff2fa0;border-radius:18px;box-shadow:0 0 30px #ff2fa0;pointer-events:auto;cursor:pointer';
    const go = () => {
      au();
      try { const u = new SpeechSynthesisUtterance(' '); u.volume = 0; speechSynthesis.speak(u); } catch (e) {}
      try { const a = new Audio(); a.play().catch(() => {}); } catch (e) {}
      keepAwake(); b.remove();
    };
    b.addEventListener('click', go);
    document.addEventListener('visibilitychange', keepAwake);
    // in the StreamElements editor a click anywhere works too; on a phone the button shows
    if (/Android|iPhone|iPad|Mobile/i.test(navigator.userAgent)) document.body.appendChild(b);
    document.addEventListener('pointerdown', () => { au(); keepAwake(); }, { once: false });
  }

  window.__neonCur = () => cur; // used by the preview/tests
  window.__neonPlay = push; // Movie Royal's on-your-screen pop-up plays one scare with this

  // ---------- StreamElements hooks ----------
  window.addEventListener('onWidgetLoad', obj => {
    const d = obj.detail || {};
    F = d.fieldData || {};
    if (d.currency && d.currency.symbol) sym = d.currency.symbol;
    try { SE_API.store.get('neonScareTts').then(v => { if (v && v.reward) ttsRewardSaved = v.reward; if (v && typeof v.muted === 'boolean') ttsMuted = v.muted; }).catch(() => {}); } catch (e) {}
    if (document.fonts && document.fonts.load) ['50px Pacifico', '40px Bungee', '40px Monoton'].forEach(f => document.fonts.load(f).catch(() => {}));
    tapGate();
  });
  window.addEventListener('onEventReceived', obj => {
    const d = obj.detail || {};
    const L = d.listener;
    if (L === 'widget-button') {
      const f = d.field;
      if (f === 'testSmall') push({ lvl: 1, label: 'New follower', line: 'TestViewer', plate: 'FOLLOW' });
      if (f === 'testMedium') push({ lvl: 2, label: 'New subscriber', line: 'TestViewer', sub: '6 months', msg: 'drive safe out there', plate: '6 MO' });
      if (f === 'testBig') push({ lvl: 3, label: 'Tip!', line: 'TestViewer', sub: money(50), msg: 'Nobody is safe in this city.', plate: money(50), tts: on('ttsOn', true) ? 'Nobody is safe in this city.' : '' });
      if (f === 'testTts') push({ lvl: 'voice', label: 'Channel points', line: 'TestViewer', msg: 'Hello from the text to speech test. Can you hear me in the kitchen?', tts: 'Hello from the text to speech test. Can you hear me in the kitchen?' });
      if (f === 'learnReward') { learning = true; push({ lvl: 'info', label: 'Learning…', line: 'Redeem it now', sub: 'Redeem your TTS reward once', plate: '' }); }
      return;
    }
    if (L === 'event:skip') { if (cur) cur.T = Math.min(cur.T, now() - cur.t0 + .4); if (speaking) speaking.stop(); return; }
    if (L === 'message') { chatMessage(d); return; }
    const job = makeJob(L, d.event || {});
    if (job) push(job);
    else { try { SE_API.resumeQueue(); } catch (e) {} }
  });
})();

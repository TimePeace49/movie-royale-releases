// Movie Royal sound engine. Every sound is synthesized live with Web Audio, so there are no files to download.
// To replace any sound with your own, drop a file named after it into public/assets/sounds/
// (e.g. fanfare.mp3, music.mp3, lobby.mp3, comet.wav). See SOUND_NAMES below.
window.SFX = (() => {
  let ac = null, master, sfxBus, musicBus, comp, noiseBuf;
  const vol = { on: true, sfx: .7, music: .35 };
  const custom = {};      // name -> AudioBuffer
  const mapCustom = {};   // map id -> { name -> AudioBuffer } (that map's own sounds)
  let curMap = null;
  const lastPlay = {};    // name -> time, for rate limiting
  const LIMIT = { wheelTick: .03, toot: .07, pfft: .1, cushion: .12, squeak: .2, brrap: .25, rat: .15, cough: .18, clash: .08, arrows: .3, moo: .4, smack: .05, bonk: .06, crumble: .16, land: .05, pop: .05, fall: .12, out: .1, dash: .12, tick: .05, crowd: .7, chair: .08, slam: .06, spell: .06, zap: .05, roar: .6, chug: 2, stretch: 2, confettiPop: .5, crowdWild: 3 };

  function init() {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return ac; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
    ac = new AC();
    comp = ac.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4; comp.connect(ac.destination);
    master = ac.createGain(); master.connect(comp);
    sfxBus = ac.createGain(); sfxBus.connect(master);
    musicBus = ac.createGain(); musicBus.connect(master);
    noiseBuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    apply(); loadCustom();
    return ac;
  }
  function apply() { if (!ac) return; const t = ac.currentTime; master.gain.setTargetAtTime(vol.on ? 1 : 0, t, .05); sfxBus.gain.setTargetAtTime(vol.sfx, t, .05); musicBus.gain.setTargetAtTime(vol.music * .6, t, .1); }
  function setVolume(v) { Object.assign(vol, v); apply(); }

  async function loadCustom() {
    for (const k of Object.keys(custom)) delete custom[k];
    for (const k of Object.keys(mapCustom)) delete mapCustom[k];
    try {
      const j = await fetch('/api/sounds?v=2').then(r => r.ok ? r.json() : { all: [], maps: {} });
      for (const f of j.all || []) {
        const name = f.replace(/\.\w+$/, '').toLowerCase();
        try { custom[name] = await ac.decodeAudioData(await fetch('assets/sounds/' + encodeURIComponent(f) + '?t=' + Date.now()).then(r => r.arrayBuffer())); } catch {}
      }
      for (const [m, files] of Object.entries(j.maps || {})) for (const f of files) {
        const name = f.replace(/\.\w+$/, '').toLowerCase();
        try { (mapCustom[m] ||= {})[name] = await ac.decodeAudioData(await fetch(`assets/sounds/maps/${encodeURIComponent(m)}/${encodeURIComponent(f)}?t=${Date.now()}`).then(r => r.arrayBuffer())); } catch {}
      }
    } catch {}
    if (mode) { const m = mode; stopMusic(); music(m); }
  }

  // ---------- building blocks ----------
  const now = () => ac.currentTime;
  function env(g, t, a, peak, d) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); }
  function tone({ type = 'sine', f0 = 440, f1 = null, dur = .2, v = .3, a = .005, at = 0, bus = sfxBus, detune = 0, pan = 0 }) {
    const t = now() + at, o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); o.detune.value = detune;
    if (f1) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    env(g, t, a, v, dur);
    let out = g; if (pan && ac.createStereoPanner) { const p = ac.createStereoPanner(); p.pan.value = pan; g.connect(p); out = p; }
    o.connect(g); out.connect(bus); o.start(t); o.stop(t + a + dur + .05);
  }
  function noise({ dur = .3, v = .3, type = 'lowpass', f0 = 1000, f1 = null, q = 1, a = .005, at = 0, bus = sfxBus }) {
    const t = now() + at, s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = noiseBuf; s.loop = true;
    f.type = type; f.Q.value = q; f.frequency.setValueAtTime(f0, t); if (f1) f.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
    env(g, t, a, v, dur);
    s.connect(f); f.connect(g); g.connect(bus); s.start(t, Math.random()); s.stop(t + a + dur + .05);
  }
  // cartoon toot: a low buzzy oscillator whose pitch AND volume flutter fast (that rubbery "brrrt"), through a muffled filter
  function fart({ f0 = 95, f1 = 65, dur = .5, v = .35, rate = 26, at = 0, q = 2, cut = 650, pan = 0, squeal = 0, bus = sfxBus }) {
    const t = now() + at, o = ac.createOscillator(), lfo = ac.createOscillator(), lg = ac.createGain(), am = ac.createGain(), amd = ac.createGain(), f = ac.createBiquadFilter(), g = ac.createGain();
    o.type = 'sawtooth'; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(25, f1), t + dur);
    if (squeal) { o.frequency.setValueAtTime(f1, t + dur * .82); o.frequency.exponentialRampToValueAtTime(f1 * squeal, t + dur); }
    lfo.type = 'square'; lfo.frequency.setValueAtTime(rate, t);
    for (let k = 1; k < 6; k++) lfo.frequency.setValueAtTime(rate * (.7 + Math.random() * .6), t + dur * k / 6); // wobbly, never even
    lg.gain.value = f0 * .3; lfo.connect(lg); lg.connect(o.frequency);
    am.gain.value = .55; amd.gain.value = .45; lfo.connect(amd); amd.connect(am.gain);
    f.type = 'lowpass'; f.Q.value = q; f.frequency.setValueAtTime(cut, t); f.frequency.exponentialRampToValueAtTime(cut * .55, t + dur);
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(v, t + .015); g.gain.setValueAtTime(v, t + dur * .7); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    let out = g; if (pan && ac.createStereoPanner) { const pn = ac.createStereoPanner(); pn.pan.value = pan; g.connect(pn); out = pn; }
    o.connect(f); f.connect(am); am.connect(g); out.connect(bus);
    o.start(t); lfo.start(t); o.stop(t + dur + .05); lfo.stop(t + dur + .05);
    noise({ dur: dur * .8, v: v * .18, type: 'bandpass', f0: 320, q: 1.5, at, bus }); // a little air
  }
  const notes = (arr, step, fn) => arr.forEach((n, i) => n && fn(n, i * step));
  const hz = m => 440 * Math.pow(2, (m - 69) / 12); // midi -> Hz

  // ---------- the sounds ----------
  const S = {
    tick: (o = {}) => tone({ type: 'square', f0: o.high ? 1320 : 880, dur: .05, v: .12 }),
    go: () => { tone({ type: 'sawtooth', f0: 220, f1: 440, dur: .35, v: .25 }); tone({ type: 'square', f0: 440, f1: 880, dur: .35, v: .15 }); noise({ dur: .4, v: .2, type: 'highpass', f0: 2000 }); },
    land: (o = {}) => { tone({ type: 'sine', f0: 180 * (o.p || 1), f1: 60, dur: .15, v: .35 }); noise({ dur: .08, v: .12, f0: 800 }); },
    bonk: (o = {}) => { const p = o.p || 1; tone({ type: 'triangle', f0: 520 * p, f1: 180 * p, dur: .12, v: .22 * (o.v || 1), pan: o.pan || 0 }); noise({ dur: .05, v: .1 * (o.v || 1), type: 'bandpass', f0: 2500, q: 2 }); },
    dash: () => noise({ dur: .18, v: .08, type: 'bandpass', f0: 600, f1: 2400, q: 3 }),
    crumble: () => { noise({ dur: .35, v: .11, f0: 420 + Math.random() * 200, f1: 110, q: .8 }); tone({ type: 'sine', f0: 80 + Math.random() * 30, f1: 40, dur: .3, v: .1 }); },
    fall: (o = {}) => tone({ type: 'sine', f0: 900, f1: 120, dur: .9, v: .14, pan: o.pan || 0 }),
    out: () => { tone({ type: 'square', f0: 330, dur: .08, v: .08 }); tone({ type: 'square', f0: 247, dur: .14, v: .08, at: .09 }); },
    lucky: () => notes([84, 88, 91, 96], .06, (n, at) => tone({ type: 'triangle', f0: hz(n), dur: .18, v: .16, at })),
    alert: () => { tone({ type: 'sawtooth', f0: 660, dur: .1, v: .1 }); tone({ type: 'sawtooth', f0: 990, dur: .16, v: .1, at: .1 }); },
    // chaos events
    comet: () => { noise({ dur: 1.4, v: .3, type: 'bandpass', f0: 300, f1: 3000, q: 1.5, a: .4 }); tone({ type: 'sawtooth', f0: 120, f1: 60, dur: 1.3, v: .08, a: .3 }); },
    smack: () => { noise({ dur: .25, v: .35, f0: 3000, f1: 300 }); tone({ type: 'sine', f0: 200, f1: 50, dur: .25, v: .35 }); },
    boom: () => { noise({ dur: .9, v: .5, f0: 1200, f1: 60, q: .7 }); tone({ type: 'sine', f0: 110, f1: 30, dur: .8, v: .5 }); },
    collapse: () => { noise({ dur: 1.6, v: .35, f0: 400, f1: 80, a: .05 }); for (let i = 0; i < 6; i++) tone({ type: 'sine', f0: 70 + Math.random() * 60, f1: 35, dur: .3, v: .2, at: i * .2 }); },
    earthquake: () => { noise({ dur: 2.6, v: .4, f0: 160, f1: 60, a: .2 }); tone({ type: 'sawtooth', f0: 42, dur: 2.5, v: .12, a: .3 }); },
    meteors: () => noise({ dur: 1.2, v: .2, type: 'bandpass', f0: 400, f1: 2500, q: 1, a: .3 }),
    wind: () => { noise({ dur: 3.6, v: .3, type: 'bandpass', f0: 400, f1: 900, q: 2, a: .6 }); noise({ dur: 3.4, v: .12, type: 'bandpass', f0: 1400, f1: 700, q: 4, a: .8 }); },
    ice: () => notes([96, 91, 100, 95, 103], .07, (n, at) => tone({ type: 'sine', f0: hz(n), dur: .5, v: .1, at })),
    tornado: () => { noise({ dur: 5, v: .32, type: 'bandpass', f0: 300, f1: 700, q: 3, a: .8 }); noise({ dur: 5, v: .12, type: 'bandpass', f0: 1800, f1: 1100, q: 6, a: 1 }); },
    shockwave: () => { tone({ type: 'sine', f0: 80, f1: 30, dur: 1.2, v: .55 }); noise({ dur: 1, v: .35, f0: 4000, f1: 100 }); tone({ type: 'sawtooth', f0: 400, f1: 40, dur: .6, v: .12 }); },
    thunder: () => { noise({ dur: .12, v: .5, type: 'highpass', f0: 3000 }); noise({ dur: 1.6, v: .4, f0: 600, f1: 70, a: .03, at: .05 }); },
    lightning: () => noise({ dur: .3, v: .12, type: 'highpass', f0: 5000, a: .02 }),
    boulder: () => { noise({ dur: 2.6, v: .3, f0: 220, f1: 120, a: .3 }); for (let i = 0; i < 10; i++) tone({ type: 'sine', f0: 60 + Math.random() * 30, dur: .12, v: .15, at: i * .25 }); },
    swap: () => { tone({ type: 'sine', f0: 200, f1: 1600, dur: .35, v: .2 }); tone({ type: 'sine', f0: 1600, f1: 200, dur: .35, v: .2, at: .35 }); },
    lowgrav: () => [0, .25, .5].forEach(at => tone({ type: 'sine', f0: 180, f1: 620, dur: .22, v: .2, at })),
    // round flow
    final5: () => tone({ type: 'square', f0: 1046, dur: .07, v: .14 }),
    suddendeath: () => { for (let i = 0; i < 3; i++) { tone({ type: 'sawtooth', f0: 520, dur: .18, v: .16, at: i * .36 }); tone({ type: 'sawtooth', f0: 390, dur: .18, v: .16, at: i * .36 + .18 }); } },
    fanfare: () => {
      const seq = [[67, 0], [67, .12], [67, .24], [72, .4], [76, .75], [79, 1.0], [84, 1.3]];
      seq.forEach(([n, at]) => { tone({ type: 'sawtooth', f0: hz(n), dur: .32, v: .12, at }); tone({ type: 'square', f0: hz(n - 12), dur: .32, v: .07, at }); });
      [60, 64, 67, 72].forEach(n => tone({ type: 'triangle', f0: hz(n), dur: 1.6, v: .09, at: 1.3, a: .05 }));
      noise({ dur: 1.6, v: .1, type: 'highpass', f0: 6000, at: 1.3 });
    },
    claimStart: () => notes([72, 79], .15, (n, at) => tone({ type: 'triangle', f0: hz(n), dur: .25, v: .18, at })),
    pop: () => tone({ type: 'sine', f0: 700, f1: 1100, dur: .06, v: .1 }),
    ding: () => { tone({ type: 'sine', f0: hz(88), dur: 1, v: .25 }); tone({ type: 'sine', f0: hz(100), dur: .8, v: .1 }); },
    celebrate: () => {
      S.fanfare();
      for (let i = 0; i < 14; i++) noise({ dur: .1, v: .12, type: 'bandpass', f0: 1500 + Math.random() * 2500, q: 3, at: .2 + Math.random() * 2.2 }); // confetti pops
      noise({ dur: 2.5, v: .12, type: 'bandpass', f0: 1200, q: .5, a: .4, at: .3 }); // crowd-ish cheer
    },
    buzzer: () => { tone({ type: 'sawtooth', f0: 110, dur: .8, v: .22 }); tone({ type: 'square', f0: 116, dur: .8, v: .12 }); },
    queued: () => notes([79, 84], .08, (n, at) => tone({ type: 'square', f0: hz(n), dur: .07, v: .08, at })),
    joined: () => tone({ type: 'triangle', f0: hz(84), f1: hz(91), dur: .12, v: .12 }),
    // 💨 Whoopee Swamp sounds (all cartoon toots, all made right here)
    toot: (o = {}) => { const p = (o.p || 1) * (.8 + Math.random() * .5); fart({ f0: 170 * p, f1: 120 * p, dur: .16 + Math.random() * .12, rate: 34, v: .28 * (o.v ?? 1), cut: 900, pan: o.pan || 0 }); },
    pfft: (o = {}) => { noise({ dur: .22, v: .22 * (o.v ?? 1), type: 'bandpass', f0: 700, f1: 300, q: 2 }); fart({ f0: 240 * (o.p || 1), f1: 180, dur: .12, rate: 48, v: .12 * (o.v ?? 1), cut: 1200 }); },
    brrap: (o = {}) => { const p = o.p || 1; fart({ f0: 92 * p, f1: 52 * p, dur: .8 + Math.random() * .5, rate: 21, v: .4 * (o.v ?? 1), cut: 560, pan: o.pan || 0 }); },
    squeak: (o = {}) => { const p = o.p || 1; fart({ f0: 380 * p, f1: 560 * p, dur: .3 + Math.random() * .2, rate: 46, v: .18 * (o.v ?? 1), cut: 2400, q: 4 }); },
    cushion: (o = {}) => { const p = (o.p || 1) * (.85 + Math.random() * .3); fart({ f0: 135 * p, f1: 62 * p, dur: .95, rate: 25, v: .45 * (o.v ?? 1), cut: 760, squeal: 2.6, pan: o.pan || 0 }); },
    beans: () => { for (let i = 0; i < 9; i++) { const p = .6 + Math.random() * 1.3; fart({ f0: 120 * p, f1: 70 * p, dur: .35 + Math.random() * .7, rate: 20 + Math.random() * 25, v: .22, at: i * .09 + Math.random() * .1, cut: 500 + Math.random() * 900, pan: Math.random() * 1.6 - .8 }); } S.squeak({ p: 1.2 }); },
    // 🎡 wheel sounds (upload your own under Sounds → 🎡 Wheel)
    wheelSpin: () => S.claimStart(),
    siren: () => { for (let i = 0; i < 12; i++) { tone({ type: 'sawtooth', f0: 650, f1: 1250, dur: .25, v: .35, at: i * .5 }); tone({ type: 'sawtooth', f0: 1250, f1: 650, dur: .25, v: .35, at: i * .5 + .25 }); tone({ type: 'square', f0: 900, f1: 1400, dur: .25, v: .12, at: i * .5 + .1 }); } },
    doom: () => { tone({ type: 'sine', f0: 70, f1: 28, dur: 6, v: .6, a: .3 }); tone({ type: 'sawtooth', f0: 55, f1: 30, dur: 6, v: .2, a: .4 }); noise({ dur: 5, v: .25, f0: 400, f1: 60, a: .5 }); [0, 1.2, 2.4].forEach(at => tone({ type: 'square', f0: 110, f1: 55, dur: .9, v: .2, at })); },
    wheelTick: () => tone({ type: 'square', f0: 1400 + Math.random() * 200, dur: .025, v: .09 }),
    wheelWin: () => S.celebrate(),
    wheelMove: () => S.whoosh(),
    wheelTimer: () => { for (let i = 0; i < 3; i++) { tone({ type: 'square', f0: 880, dur: .18, v: .2, at: i * .3 }); tone({ type: 'square', f0: 660, dur: .18, v: .14, at: i * .3 + .1 }); } },
    wheelGrow: () => notes([72, 76, 79, 84], .07, (n, at) => tone({ type: 'triangle', f0: hz(n), dur: .14, v: .16, at })),
    // 🐄 Fart Farm, 🐀 Plague Town and ⚔️ Battlefield
    moo: (o = {}) => { const p = o.p || 1; tone({ type: 'sawtooth', f0: 165 * p, f1: 118 * p, dur: .9, v: .14 * (o.v ?? 1), a: .12 }); tone({ type: 'square', f0: 168 * p, f1: 120 * p, dur: .85, v: .05 * (o.v ?? 1), a: .15 }); tone({ type: 'sine', f0: 82 * p, f1: 60 * p, dur: .9, v: .18 * (o.v ?? 1), a: .1 }); },
    stampede: () => { noise({ dur: 1.8, v: .3, f0: 260, f1: 120, a: .25 }); for (let i = 0; i < 14; i++) tone({ type: 'sine', f0: 70 + Math.random() * 20, f1: 38, dur: .09, v: .3, at: i * .12 + Math.random() * .04 }); },
    ufo: (o = {}) => { const p = o.p || 1; for (let i = 0; i < 6; i++) tone({ type: 'sine', f0: 520 * p, f1: 900 * p, dur: .12, v: .1, at: i * .12 }); tone({ type: 'triangle', f0: 260 * p, dur: .8, v: .08 }); },
    beam: () => { tone({ type: 'sine', f0: 260, f1: 1400, dur: 1.6, v: .16, a: .1 }); tone({ type: 'triangle', f0: 520, f1: 2400, dur: 1.6, v: .07, a: .1 }); noise({ dur: 1.6, v: .06, type: 'bandpass', f0: 1500, q: 2, a: .2 }); },
    rat: (o = {}) => { for (let i = 0; i < 3; i++) tone({ type: 'square', f0: 2300 + Math.random() * 600, f1: 3100, dur: .05, v: .06 * (o.v ?? 1), at: i * .07 }); },
    cough: (o = {}) => { for (const at of [0, .22]) noise({ dur: .16, v: .28 * (o.v ?? 1), type: 'bandpass', f0: 900, f1: 500, q: 1.4, at }); },
    bell: (o = {}) => { for (const [f, v, d] of [[196, .22, 3], [392, .1, 2.2], [541, .08, 1.6], [784, .04, 1.2]]) tone({ type: 'sine', f0: f, dur: d, v: v * (o.v ?? 1), a: .004 }); },
    arrows: () => { for (let i = 0; i < 7; i++) noise({ dur: .4, v: .09, type: 'bandpass', f0: 3200, f1: 900, q: 7, at: i * .05 + Math.random() * .05 }); },
    clash: (o = {}) => { tone({ type: 'square', f0: 1900, f1: 1700, dur: .1, v: .1 * (o.v ?? 1) }); tone({ type: 'sine', f0: 2700, dur: .45, v: .1 * (o.v ?? 1) }); tone({ type: 'sine', f0: 3900, dur: .3, v: .05 * (o.v ?? 1) }); noise({ dur: .12, v: .2 * (o.v ?? 1), type: 'highpass', f0: 3000 }); },
    horn: (o = {}) => { const p = o.p || 1; tone({ type: 'sawtooth', f0: 98 * p, f1: 104 * p, dur: 1.5, v: .2, a: .18 }); tone({ type: 'sawtooth', f0: 147 * p, f1: 156 * p, dur: 1.5, v: .1, a: .22 }); tone({ type: 'sine', f0: 49 * p, dur: 1.5, v: .2, a: .2 }); },
    gallop: () => { for (let i = 0; i < 10; i++) { tone({ type: 'sine', f0: 95, f1: 50, dur: .07, v: .28, at: i * .14 }); tone({ type: 'sine', f0: 85, f1: 45, dur: .07, v: .2, at: i * .14 + .05 }); } },
    // 🃏 card battles (kung fu)
    punch: () => { noise({ dur: .09, v: .45, f0: 2200, f1: 400, q: .8 }); tone({ type: 'sine', f0: 160, f1: 60, dur: .12, v: .45 }); },
    kick: () => { noise({ dur: .14, v: .5, f0: 1600, f1: 250, q: .7 }); tone({ type: 'sine', f0: 120, f1: 45, dur: .18, v: .55 }); noise({ dur: .08, v: .2, type: 'highpass', f0: 5000 }); },
    gong: () => { for (const [f, v, d] of [[98, .4, 3.5], [147, .2, 3], [196, .14, 2.6], [261, .08, 2], [415, .05, 1.6]]) tone({ type: 'sine', f0: f, f1: f * .985, dur: d, v, a: .005 }); noise({ dur: .4, v: .2, type: 'bandpass', f0: 900, q: .6 }); },
    splat: () => { noise({ dur: .3, v: .35, type: 'lowpass', f0: 900, f1: 200, q: 2 }); tone({ type: 'sine', f0: 90, f1: 40, dur: .2, v: .3 }); },
    chop: () => { noise({ dur: .18, v: .4, type: 'highpass', f0: 3000, f1: 800 }); tone({ type: 'square', f0: 900, f1: 300, dur: .08, v: .08 }); noise({ dur: .35, v: .3, type: 'lowpass', f0: 700, f1: 150, q: 3, at: .06 }); },
    hyah: () => { const p = .85 + Math.random() * .4; tone({ type: 'sawtooth', f0: 330 * p, f1: 520 * p, dur: .09, v: .12 }); tone({ type: 'sawtooth', f0: 520 * p, f1: 260 * p, dur: .22, v: .14, at: .08 }); noise({ dur: .25, v: .08, type: 'bandpass', f0: 1800 * p, q: 1.5 }); },
    // 💧🙆🎩🎉 viewer rewards (Hydrate, Stretch, Pick a hat, Viewer's choice)
    chug: () => { for (let i = 0; i < 7; i++) { const at = .15 + i * .42, p = .9 + Math.random() * .2; tone({ type: 'sine', f0: 210 * p, f1: 90 * p, dur: .16, v: .45, at }); noise({ dur: .12, v: .16, type: 'lowpass', f0: 600 * p, f1: 250, q: 4, at: at + .02 }); tone({ type: 'sine', f0: 520 * p, f1: 380 * p, dur: .05, v: .06, at: at + .1 }); } noise({ dur: .5, v: .1, type: 'bandpass', f0: 1800, q: .8, at: 3.2 }); tone({ type: 'sawtooth', f0: 180, f1: 150, dur: .5, v: .06, at: 3.25, a: .05 }); }, // glug glug glug… ahh
    stretch: () => { tone({ type: 'sawtooth', f0: 150, f1: 210, dur: 1.4, v: .1, a: .3 }); tone({ type: 'sawtooth', f0: 210, f1: 120, dur: 1.4, v: .1, at: 1.4, a: .1 }); noise({ dur: 2.6, v: .05, type: 'bandpass', f0: 700, f1: 1100, q: 3, a: .4 }); for (const at of [2.9, 3.05, 3.15]) { noise({ dur: .04, v: .3, type: 'highpass', f0: 2500, at }); tone({ type: 'square', f0: 900, f1: 400, dur: .03, v: .05, at }); } tone({ type: 'sine', f0: 260, f1: 180, dur: .8, v: .08, at: 3.4, a: .1 }); }, // a long groaning stretch… and the back cracks
    confettiPop: () => { noise({ dur: .18, v: .7, type: 'highpass', f0: 1200, f1: 300 }); tone({ type: 'sine', f0: 140, f1: 50, dur: .25, v: .6 }); for (let i = 0; i < 18; i++) noise({ dur: .06, v: .12, type: 'bandpass', f0: 2000 + Math.random() * 4000, q: 4, at: .1 + Math.random() * 1.2 }); },
    crowdWild: () => { noise({ dur: 7, v: .32, type: 'bandpass', f0: 800, f1: 1200, q: .35, a: .5 }); noise({ dur: 6.5, v: .16, type: 'bandpass', f0: 2600, q: .6, a: .6 }); for (let i = 0; i < 26; i++) { const at = Math.random() * 5.5, p = 250 + Math.random() * 500; tone({ type: 'sawtooth', f0: p, f1: p * (1.2 + Math.random() * .5), dur: .5 + Math.random() * .6, v: .018, at, a: .1 }); } for (let i = 0; i < 30; i++) noise({ dur: .03, v: .08, type: 'highpass', f0: 3500, at: Math.random() * 6 }); }, // cheering, whoops and clapping
    // 🧙 Wizard Battle + 🏛️ Colosseum
    spell: () => { tone({ type: 'sine', f0: 900, f1: 1800, dur: .18, v: .12 }); tone({ type: 'triangle', f0: 1350, f1: 2600, dur: .22, v: .07, at: .03 }); noise({ dur: .2, v: .06, type: 'highpass', f0: 6000 }); },
    zap: () => { tone({ type: 'sawtooth', f0: 1400, f1: 300, dur: .14, v: .12 }); noise({ dur: .12, v: .2, type: 'bandpass', f0: 3000, q: 2 }); },
    roar: () => { const p = .85 + Math.random() * .3; noise({ dur: 1.1, v: .45, type: 'lowpass', f0: 700 * p, f1: 220, q: 3, a: .08 }); tone({ type: 'sawtooth', f0: 120 * p, f1: 70, dur: 1, v: .2, a: .08 }); tone({ type: 'square', f0: 90 * p, f1: 55, dur: .9, v: .08, a: .1 }); },
    // 🔔 Rumble Ring
    crowd: (o = {}) => { noise({ dur: 2.2, v: .16 * (o.v ?? 1), type: 'bandpass', f0: 900, f1: 1300, q: .4, a: .25 }); noise({ dur: 1.8, v: .08 * (o.v ?? 1), type: 'bandpass', f0: 2400, q: .7, a: .2 }); for (let i = 0; i < 6; i++) tone({ type: 'sawtooth', f0: 300 + Math.random() * 300, f1: 420 + Math.random() * 300, dur: .5, v: .012, at: Math.random() * .6, a: .1 }); },
    slam: () => { tone({ type: 'sine', f0: 90, f1: 35, dur: .35, v: .7 }); noise({ dur: .25, v: .45, type: 'lowpass', f0: 1400, f1: 200, q: .7 }); noise({ dur: .5, v: .12, type: 'bandpass', f0: 300, q: 2, at: .03 }); },
    chair: () => { tone({ type: 'square', f0: 620, f1: 540, dur: .12, v: .12 }); tone({ type: 'sine', f0: 1240, dur: .5, v: .12 }); tone({ type: 'sine', f0: 1870, dur: .35, v: .07 }); noise({ dur: .15, v: .3, type: 'highpass', f0: 2000 }); tone({ type: 'sine', f0: 140, f1: 60, dur: .12, v: .35 }); },
    whoosh: () => { noise({ dur: .55, v: .32, type: 'bandpass', f0: 300, f1: 4200, q: 1.2, a: .2 }); tone({ type: 'sine', f0: 140, f1: 60, dur: .5, v: .15, a: .15 }); },
    heartbeat: () => { tone({ type: 'sine', f0: 62, f1: 42, dur: .16, v: .45 }); tone({ type: 'sine', f0: 58, f1: 40, dur: .2, v: .32, at: .22 }); },
    slowhit: () => { noise({ dur: 1.4, v: .35, f0: 700, f1: 50, a: .02 }); tone({ type: 'sine', f0: 70, f1: 28, dur: 1.4, v: .5 }); tone({ type: 'sawtooth', f0: 110, f1: 40, dur: .9, v: .08 }); }
  };
  const SOUND_NAMES = Object.keys(S).concat(['music', 'lobby']);

  function play(name, opts) {
    if (!init() || !vol.on) return;
    const t = performance.now() / 1000;
    if (LIMIT[name] && t - (lastPlay[name] || 0) < LIMIT[name]) return;
    lastPlay[name] = t;
    const nm = String(name).toLowerCase(), own = mapCustom[curMap]?.[nm] || (String(curMap).startsWith('wheel-') && mapCustom.wheel?.[nm]) || custom[nm]; // a wheel's own sounds → all wheels → everywhere
    if (own) {
      const s = ac.createBufferSource(), g = ac.createGain(); s.buffer = own; g.gain.value = .9;
      if (opts?.p) s.playbackRate.value = opts.p; s.connect(g); g.connect(sfxBus); s.start(); return;
    }
    try { S[name]?.(opts || {}); } catch (e) { console.warn('sfx', name, e); }
  }

  // ---------- music: a looping chiptune-ish battle track (or your own music.mp3 / lobby.mp3) ----------
  let mode = null, timer = null, nextT = 0, step = 0, intensity = 0, track = null;
  const BPM = 138, STEP = 60 / BPM / 4;
  const bassA = [45, 0, 45, 0, 48, 0, 45, 0, 43, 0, 43, 0, 47, 0, 43, 0];
  const bassB = [41, 0, 41, 0, 45, 0, 41, 0, 43, 0, 43, 0, 40, 0, 43, 0];
  const lead = [69, 72, 76, 72, 69, 72, 76, 79, 67, 71, 74, 71, 67, 71, 74, 78, 65, 69, 72, 69, 65, 69, 72, 76, 67, 71, 74, 71, 76, 74, 71, 67];
  function sched() {
    while (nextT < ac.currentTime + .12) {
      const at = nextT - ac.currentTime, i = step % 16, bar = Math.floor(step / 16) % 4;
      if (curMap === 'card-ring' && mode === 'fight') { // 🔔 Rumble Ring: driving rock: kick, big snare, palm-muted power chords
        const riff = [40, 40, 40, 43, 40, 40, 45, 43, 40, 40, 40, 43, 47, 45, 43, 38][i] + (bar === 3 ? 5 : 0);
        if (i % 4 === 0 || i === 10) tone({ type: 'sine', f0: 150, f1: 45, dur: .16, v: .55, at, bus: musicBus });
        if (i % 8 === 4) { noise({ dur: .2, v: .32, type: 'bandpass', f0: 1500, q: .6, at, bus: musicBus }); tone({ type: 'triangle', f0: 200, f1: 150, dur: .08, v: .15, at, bus: musicBus }); }
        if (i % 2 === 0) noise({ dur: .03, v: .07, type: 'highpass', f0: 8000, at, bus: musicBus });
        for (const d of [0, 7, 12]) tone({ type: 'sawtooth', f0: hz(riff + d), dur: STEP * .8, v: .045 + intensity * .02, at, bus: musicBus, detune: d ? 6 : 0 });
        if (i === 0 && bar % 2 === 0) noise({ dur: 1.2, v: .1, type: 'highpass', f0: 5000, at, bus: musicBus }); // crash
      } else
      if (curMap === 'card-wizard' && mode === 'fight') { // 🧙 mysterious: a minor arpeggio on a harp-like pluck, low pad, soft chimes
        const arp = [57, 60, 64, 69, 64, 60, 57, 60, 55, 59, 62, 67, 62, 59, 55, 59][i] + (bar === 2 ? -2 : bar === 3 ? 3 : 0);
        tone({ type: 'triangle', f0: hz(arp + 12), dur: STEP * 2.5, v: .05 + intensity * .025, at, bus: musicBus });
        if (i === 0) [45, 52, 57].forEach(n => tone({ type: 'sine', f0: hz(n + (bar === 2 ? -2 : bar === 3 ? 3 : 0)), dur: STEP * 16, v: .05, a: .4, at, bus: musicBus }));
        if (i % 8 === 0) tone({ type: 'sine', f0: 110, f1: 50, dur: .25, v: .35, at, bus: musicBus });
        if (i === 6 || i === 14) tone({ type: 'sine', f0: hz(88 + (step % 3) * 2), dur: .8, v: .03, at, bus: musicBus });
      } else
      if (curMap === 'card-colosseum' && mode === 'fight') { // 🏛️ war drums and brass fanfares
        if (i % 4 === 0 || i === 3 || i === 11) tone({ type: 'sine', f0: 95, f1: 45, dur: .22, v: .6, at, bus: musicBus });
        if (i % 8 === 4) noise({ dur: .18, v: .25, type: 'bandpass', f0: 900, q: .7, at, bus: musicBus });
        if (i % 2 === 1) noise({ dur: .04, v: .06, type: 'highpass', f0: 5000, at, bus: musicBus });
        if (i % 4 === 0) { const hn = [55, 55, 58, 55, 60, 58, 55, 53][(step / 4) % 8 | 0] + (bar === 3 ? 2 : 0); tone({ type: 'sawtooth', f0: hz(hn), dur: STEP * 3.5, v: .05 + intensity * .03, a: .03, at, bus: musicBus }); tone({ type: 'sawtooth', f0: hz(hn + 7), dur: STEP * 3.5, v: .03, a: .03, at, bus: musicBus, detune: 6 }); }
      } else
      if (curMap === 'card-kungfu' && mode === 'fight') { // 🥋 kung fu: drums, woodblock, a pentatonic tune and a gong every 4 bars
        const pent = [62, 65, 67, 69, 72, 74, 77, 79], mel = [4, 0, 3, 2, 4, 5, 4, 2, 1, 0, 1, 2, 4, 2, 1, 0];
        if (i % 4 === 0) tone({ type: 'sine', f0: 130, f1: 50, dur: .18, v: .5, at, bus: musicBus });
        if (i % 4 === 2 || i === 15) tone({ type: 'sine', f0: 95, f1: 60, dur: .12, v: .3, at, bus: musicBus });
        if (i % 2 === 1) noise({ dur: .03, v: .14, type: 'bandpass', f0: 2600, q: 6, at, bus: musicBus });
        if (i % 2 === 0) { const n = pent[mel[(step / 2) % 16]] + (bar === 3 ? 5 : 0); tone({ type: 'sawtooth', f0: hz(n), dur: STEP * 1.8, v: .045 + intensity * .03, at, bus: musicBus }); tone({ type: 'triangle', f0: hz(n + 12), dur: STEP * 1.2, v: .03, at, bus: musicBus }); }
        if (i === 0 && bar === 0) for (const [f, v] of [[98, .12], [147, .06]]) tone({ type: 'sine', f0: f, dur: 2.5, v, at, bus: musicBus });
      } else
      if (curMap === 'gas' && mode) { // 💨 oom-pah polka on the tuba, a kazoo tune, and a toot to end each bar
        const fight = mode === 'fight', roots = [43, 38, 43, 38, 36, 38, 43, 43], root = roots[bar * 2 + (i >= 8 ? 1 : 0)];
        if (i % 4 === 0) fart({ f0: hz(root), f1: hz(root) * .98, dur: STEP * 1.6, rate: 14, v: fight ? .16 : .1, at, cut: 420, q: 1, bus: musicBus }); // tuba "oom"
        if (i % 4 === 2) [12, 16, 19].forEach(d => tone({ type: 'square', f0: hz(root + d + 12), dur: STEP * .8, v: fight ? .035 : .025, at, bus: musicBus })); // "pah"
        if (fight) { if (i % 4 === 0) tone({ type: 'sine', f0: 120, f1: 50, dur: .1, v: .35, at, bus: musicBus }); if (i % 2 === 1) noise({ dur: .03, v: .06, type: 'highpass', f0: 7000, at, bus: musicBus }); }
        if (fight && (intensity > .25 || bar % 2) && step % 2 === 0) { const kz = [67, 71, 74, 71, 72, 71, 69, 67, 66, 69, 72, 69, 67, 66, 67, 0][(step / 2) % 16]; if (kz) { tone({ type: 'sawtooth', f0: hz(kz), dur: STEP * 1.7, v: .045, at, bus: musicBus, detune: 12 }); tone({ type: 'square', f0: hz(kz), dur: STEP * 1.7, v: .025, at, bus: musicBus, detune: -9 }); } }
        if (i === 14 && (bar === 3 || Math.random() < .3)) fart({ f0: 160 + Math.random() * 120, f1: 110, dur: .2, rate: 36, v: .14, at, cut: 1000, bus: musicBus }); // the joke
      } else
      if (mode === 'fight') {
        const bass = bar % 2 ? bassB : bassA;
        if (bass[i]) tone({ type: 'sawtooth', f0: hz(bass[i]), dur: STEP * 1.6, v: .16, at, bus: musicBus });
        if (i % 4 === 0) { tone({ type: 'sine', f0: 140, f1: 45, dur: .16, v: .55, at, bus: musicBus }); }
        if (i % 8 === 4) noise({ dur: .14, v: .28, type: 'bandpass', f0: 1800, q: .8, at, bus: musicBus });
        if (i % 2 === 1 || intensity > .6) noise({ dur: .03, v: .08 + intensity * .05, type: 'highpass', f0: 8000, at, bus: musicBus });
        if (intensity > .3 && step % 2 === 0) tone({ type: 'square', f0: hz(lead[(step / 2) % 32] + (intensity > .8 ? 12 : 0)), dur: STEP * 1.5, v: .05 + intensity * .03, at, bus: musicBus });
      } else if (mode === 'lobby') {
        if (i === 0) [57, 60, 64].forEach(n => tone({ type: 'triangle', f0: hz(n + (bar % 2 ? -2 : 0)), dur: STEP * 15, v: .06, a: .3, at, bus: musicBus }));
        if (i % 4 === 0) noise({ dur: .05, v: .1, type: 'highpass', f0: 6000, at, bus: musicBus });
        if (i % 2 === 0) tone({ type: 'sine', f0: hz(45 + (bar % 2 ? -2 : 0)), dur: STEP, v: .1, at, bus: musicBus });
        if (i === 12 || i === 14) tone({ type: 'sine', f0: 100, f1: 50, dur: .1, v: .35, at, bus: musicBus });
      }
      nextT += STEP; step++;
    }
  }
  function music(m) {
    if (!init()) return;
    if (m === mode) return;
    stopMusic();
    mode = m; if (!m) return;
    const key = m === 'fight' ? 'music' : 'lobby', file = mapCustom[curMap]?.[key] || custom[key];
    if (file) { track = ac.createBufferSource(); track.buffer = file; track.loop = true; track.connect(musicBus); track.start(); return; }
    step = 0; nextT = ac.currentTime + .05; timer = setInterval(sched, 25);
  }
  function stopMusic() { clearInterval(timer); timer = null; if (track) { try { track.stop(); } catch {} track = null; } mode = null; }
  function setIntensity(x) { intensity = Math.max(0, Math.min(1, x)); }

  const blocked = () => ac && ac.state === 'suspended';
  const reload = () => { if (ac) loadCustom(); };
  // switching maps: that map's own sounds (and music) take over
  function playOn(map, name, opts) { const keep = curMap; curMap = map || curMap; try { play(name, opts); } finally { curMap = keep; } }
  function setMap(id) { if (id === curMap) return; const had = mapCustom[curMap]?.music || mapCustom[curMap]?.lobby, has = mapCustom[id]?.music || mapCustom[id]?.lobby; curMap = id; if (mode && (had || has)) { const m = mode; stopMusic(); music(m); } }
  return { play, music, stopMusic, setIntensity, setVolume, init, blocked, reload, setMap, playOn, SOUND_NAMES };
})();

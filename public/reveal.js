// 🎁 Mystery spot card pack (1.61.0, Derek): when the wheel lands on a hidden reveal spot, a card pack with the spot's cover pops up.
// Clicking the pack (control panel only) tears the top off and pulls a card out that shows the hidden words / picture.
// Shared by control.html (clickable) and game.html (the stream follows). Themed for the app's holiday style when that's on.
(() => {
  const THEMES = {
    normal: { a: '#5b21b6', b: '#c026d3', c: '#ffc94a', ink: '#2a1250', fx: ['✨', '⭐', '❓', '💫'], head: '❓ MYSTERY SPOT', face: '✨ REVEALED ✨' },
    newyear: { a: '#0b1d51', b: '#1e3a8a', c: '#f5c542', ink: '#0b1d51', fx: ['🎆', '✨', '🥂', '🎇'], head: '🎆 NEW YEAR SURPRISE', face: '🥂 REVEALED 🥂' },
    valentine: { a: '#be123c', b: '#f472b6', c: '#ffe4ef', ink: '#7f1d3a', fx: ['💘', '💖', '💕', '🌹'], head: '💘 SWEET SURPRISE', face: '💖 REVEALED 💖' },
    stpat: { a: '#14532d', b: '#22c55e', c: '#facc15', ink: '#14532d', fx: ['☘️', '🍀', '🌈', '🪙'], head: '🍀 LUCKY SURPRISE', face: '☘️ REVEALED ☘️' },
    easter: { a: '#8b5cf6', b: '#f9a8d4', c: '#fde68a', ink: '#4c1d95', fx: ['🐰', '🥚', '🌷', '🐣'], head: '🥚 EGG-CITING SURPRISE', face: '🐣 REVEALED 🐣' },
    july4: { a: '#1d3a8a', b: '#b91c1c', c: '#ffffff', ink: '#1d3a8a', fx: ['🎆', '⭐', '🎇', '⭐'], head: '🎆 STAR-SPANGLED SURPRISE', face: '⭐ REVEALED ⭐' },
    halloween: { a: '#3b0764', b: '#ea580c', c: '#fb923c', ink: '#3b0764', fx: ['🎃', '🦇', '👻', '🕸️'], head: '🎃 SPOOKY SURPRISE', face: '👻 REVEALED 👻' },
    turkey: { a: '#7c2d12', b: '#d97706', c: '#fde68a', ink: '#7c2d12', fx: ['🦃', '🍂', '🍁', '🌽'], head: '🦃 THANKFUL SURPRISE', face: '🍂 REVEALED 🍂' },
    xmas: { a: '#991b1b', b: '#15803d', c: '#fef3c7', ink: '#7f1d1d', fx: ['🎄', '❄️', '🎁', '⭐'], head: '🎁 HOLIDAY SURPRISE', face: '🎄 REVEALED 🎄' }
  };
  const mix = (h1, h2, k) => { const p = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)); const a = p(h1), b = p(h2); return '#' + a.map((v, i) => Math.round(v + (b[i] - v) * k).toString(16).padStart(2, '0')).join(''); }; // (mixed here: OBS's older browser can't mix colors in CSS)
  const vars = th => `--a:${th.a};--b:${th.b};--c:${th.c};--ink:${th.ink};--ad:${mix(th.a, '#000000', .4)};--bd:${mix(th.b, '#000000', .45)};--cl:${mix(th.c, '#ffffff', .65)};--inkl:${mix(th.ink, '#ffffff', .3)};`;
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const T = 84, H = 480; // the tear line (px from the top of the pack) and the pack's height
  const zig = [...Array(21)].map((_, k) => [k * 5, k % 2 ? T + 11 : T]); // the torn edge: every 5% across, up and down
  const topClip = `polygon(0 0, 100% 0, ${zig.slice().reverse().map(([x, y]) => `${x}% ${y}px`).join(', ')})`;
  const bodyClip = `polygon(${zig.map(([x, y]) => `${x}% ${y}px`).join(', ')}, 100% 100%, 0 100%)`;
  const CSS = `
  .rvWrap { position:absolute; inset:0; z-index:80; display:flex; align-items:center; justify-content:center; pointer-events:none; font-family:Inter, 'Segoe UI', system-ui, sans-serif; }
  .rvWrap.rvFixed { pointer-events:auto; }
  dialog.rvDlg { padding:0; margin:0; border:0; background:transparent; width:100vw; height:100vh; max-width:none; max-height:none; overflow:hidden; box-shadow:none; border-radius:0; outline:none; }
  dialog.rvDlg::backdrop { background:transparent; }
  .rvDim { position:absolute; inset:0; background:radial-gradient(circle at 50% 45%, rgba(20,8,40,.55), rgba(5,2,12,.82)); animation:rvFade .35s ease-out; }
  .rvWrap.rvBye { animation:rvFade .4s ease-in reverse forwards; }
  .rvStage { position:relative; width:340px; height:${H}px; animation:rvPop .6s cubic-bezier(.2,1.5,.4,1); }
  .rvPack { position:absolute; inset:0; animation:rvWiggle 1.8s ease-in-out infinite; transform-origin:50% 90%; }
  .rvWrap.rvClick .rvPack { cursor:pointer; pointer-events:auto; }
  .rvWrap.rvClick .rvPack:hover { filter:brightness(1.12) drop-shadow(0 0 26px var(--c)); }
  .rvPack.rvOpening, .rvPack.rvOpening:hover { animation:none; cursor:default; }
  .rvFoil { position:absolute; inset:0; border-radius:14px; background:
      repeating-linear-gradient(115deg, rgba(255,255,255,.09) 0 10px, transparent 10px 26px),
      linear-gradient(150deg, var(--a), var(--b)); box-shadow:inset 0 0 0 3px rgba(255,255,255,.18), inset 0 -30px 60px rgba(0,0,0,.25); overflow:hidden; }
  .rvFoil::after { content:''; position:absolute; inset:-40% -60%; background:linear-gradient(105deg, transparent 40%, rgba(255,255,255,.45) 50%, transparent 60%); animation:rvShine 2.6s ease-in-out infinite; }
  .rvBack { position:absolute; inset:0; border-radius:14px; background:linear-gradient(150deg, var(--ad), var(--bd)); box-shadow:0 26px 60px rgba(0,0,0,.55); z-index:1; }
  .rvBody { z-index:3; clip-path:${bodyClip}; }
  .rvTop { z-index:4; clip-path:${topClip}; transform-origin:0 ${T}px; }
  .rvCrimp { position:absolute; left:0; right:0; height:18px; background:repeating-linear-gradient(90deg, rgba(0,0,0,.28) 0 3px, rgba(255,255,255,.28) 3px 6px); }
  .rvTop .rvCrimp { top:0; } .rvBody .rvCrimp { bottom:0; }
  .rvTearLine { position:absolute; left:10px; right:10px; top:${T - 26}px; text-align:center; font:800 12px Inter, sans-serif; letter-spacing:2px; color:rgba(255,255,255,.85); border-bottom:2px dashed rgba(255,255,255,.55); padding-bottom:4px; text-shadow:0 1px 2px #0008; }
  .rvFx { position:absolute; font-size:30px; opacity:.24; filter:saturate(1.2); pointer-events:none; }
  .rvLabel { position:absolute; left:38px; right:38px; top:${T + 30}px; bottom:70px; background:rgba(255,255,255,.93); border:4px solid var(--c); border-radius:18px; box-shadow:0 8px 24px rgba(0,0,0,.35); display:flex; flex-direction:column; align-items:center; justify-content:center; gap:8px; padding:12px; text-align:center; color:var(--ink); overflow:hidden; }
  .rvLabel .rvK { font:900 14px Inter, sans-serif; letter-spacing:1.5px; color:var(--a); }
  .rvLabel img { max-width:100%; max-height:150px; border-radius:12px; object-fit:contain; }
  .rvLabel .rvCv { font:900 26px/1.1 'Lilita One', Inter, sans-serif; word-break:break-word; }
  .rvBrand { position:absolute; left:0; right:0; bottom:26px; text-align:center; font:900 15px 'Lilita One', Inter, sans-serif; letter-spacing:3px; color:rgba(255,255,255,.92); text-shadow:0 2px 0 rgba(0,0,0,.35); }
  .rvCard { position:absolute; left:22px; right:22px; top:22px; height:${H - 60}px; z-index:2; border-radius:16px; transition:transform .95s cubic-bezier(.2,.9,.3,1); transform:translateY(0); }
  .rvCardIn { position:absolute; inset:0; border-radius:16px; overflow:hidden; background:radial-gradient(circle at 50% 30%, #fff, var(--cl)); border:8px solid var(--c); box-shadow:0 0 0 3px var(--a), 0 18px 50px rgba(0,0,0,.5); display:flex; flex-direction:column; align-items:center; justify-content:center; gap:12px; padding:20px 16px; text-align:center; color:var(--ink); }
  .rvCardIn.rvBlank { background:repeating-linear-gradient(45deg, var(--a) 0 14px, var(--b) 14px 28px); }
  .rvFHead { font:900 16px Inter, sans-serif; letter-spacing:2px; color:var(--a); }
  .rvFrame { position:absolute; inset:10px; border:2px dashed var(--a); border-radius:10px; opacity:.35; pointer-events:none; }
  .rvCorner { position:absolute; font-size:30px; line-height:1; } .rvCorner.tl { left:14px; top:12px; } .rvCorner.br { right:14px; bottom:12px; transform:rotate(180deg); }
  .rvFImg { max-width:100%; max-height:52%; border-radius:12px; object-fit:contain; box-shadow:0 6px 18px rgba(0,0,0,.25); }
  .rvFText { font-family:'Lilita One', Inter, sans-serif; line-height:1.08; word-break:break-word; }
  .rvFFoot { font:700 12px Inter, sans-serif; color:var(--inkl); }
  .rvHolo { position:absolute; inset:0; background:linear-gradient(115deg, transparent 30%, rgba(255,255,255,.55) 45%, rgba(255,200,255,.35) 50%, transparent 65%); background-size:250% 100%; animation:rvHolo 2.4s linear infinite; mix-blend-mode:screen; pointer-events:none; }
  .rvPack.rvTorn .rvTop { animation:rvTear .75s cubic-bezier(.4,0,.6,1) forwards; }
  .rvPack.rvRise .rvCard { transform:translateY(-62%); }
  .rvPack.rvOut .rvCard { z-index:6; transform:translateY(-6%) scale(1.14); transition:transform .7s cubic-bezier(.2,1.3,.4,1); }
  .rvPack.rvOut .rvBody, .rvPack.rvOut .rvBack { transition:transform .7s ease-in, opacity .7s ease-in; transform:translateY(75%) rotate(-7deg); opacity:0; }
  .rvBurst { position:absolute; left:50%; top:45%; width:40px; height:40px; margin:-20px 0 0 -20px; border-radius:50%; background:radial-gradient(circle, #fff, var(--c) 40%, transparent 70%); z-index:5; animation:rvBurst .9s ease-out forwards; pointer-events:none; }
  .rvBit { position:absolute; left:50%; top:${T}px; width:10px; height:7px; background:var(--c); z-index:7; border-radius:2px; animation:rvBit 1s ease-out forwards; pointer-events:none; }
  .rvHint { position:absolute; left:-80px; right:-80px; top:${H + 18}px; text-align:center; font:900 22px 'Lilita One', Inter, sans-serif; color:#fff; text-shadow:0 3px 0 #000a, 0 0 18px var(--c); animation:rvPulse 1s ease-in-out infinite alternate; }
  .rvBtns { position:absolute; left:-80px; right:-80px; top:${H + 60}px; display:flex; gap:10px; justify-content:center; pointer-events:auto; }
  .rvBtns button { font:800 14px Inter, sans-serif; padding:9px 16px; border-radius:10px; border:0; cursor:pointer; background:#ffffffdd; color:#2a1250; }
  @keyframes rvFade { from { opacity:0 } to { opacity:1 } }
  @keyframes rvPop { from { transform:scale(.3) rotate(-12deg); opacity:0 } to { transform:none; opacity:1 } }
  @keyframes rvWiggle { 0%, 70%, 100% { transform:rotate(0) } 76% { transform:rotate(-4deg) } 82% { transform:rotate(4deg) } 88% { transform:rotate(-3deg) } 94% { transform:rotate(2deg) } }
  @keyframes rvShine { 0% { transform:translateX(-60%) } 60%, 100% { transform:translateX(60%) } }
  @keyframes rvHolo { from { background-position:150% 0 } to { background-position:-100% 0 } }
  @keyframes rvTear { 0% { transform:none } 35% { transform:rotate(-6deg) translate(-4px, -6px) } 100% { transform:translate(150px, -190px) rotate(38deg); opacity:0 } }
  @keyframes rvBurst { from { transform:scale(.2); opacity:1 } to { transform:scale(16); opacity:0 } }
  @keyframes rvBit { from { transform:translate(0, 0) rotate(0); opacity:1 } to { transform:translate(var(--dx), var(--dy)) rotate(var(--r)); opacity:0 } }
  @keyframes rvPulse { from { opacity:.75; transform:scale(.97) } to { opacity:1; transform:scale(1.03) } }`;
  const addCss = () => { if (document.getElementById('rvCss')) return; const st = document.createElement('style'); st.id = 'rvCss'; st.textContent = CSS; document.head.appendChild(st); };
  const theme = id => THEMES[id] || THEMES.normal;
  const textSize = t => { const n = String(t || '').length; return n <= 14 ? 46 : n <= 30 ? 38 : n <= 60 ? 30 : n <= 120 ? 23 : 18; };
  const fxSpans = th => [[3, 120], [304, 160], [3, 250], [304, 290], [3, 370], [304, 400], [150, 420]].map(([x, y], i) => `<span class="rvFx" style="left:${x}px;top:${y}px;transform:rotate(${(i * 37) % 60 - 30}deg)">${th.fx[i % th.fx.length]}</span>`).join('');
  let cur = null; // { id, el, opts }
  const R = {
    THEMES,
    isUp: () => !!cur,
    current: () => cur && { id: cur.id, open: cur.open },
    /** host: the element to cover; o = { id, cover:{text,image}, theme, clickable, onOpen(id), onClose(id), scale, fixed, sound(k) } */
    show(host, o) {
      addCss(); if (cur && cur.id === o.id) return cur.el; R.remove();
      const th = theme(o.theme), el = document.createElement('div');
      el.className = 'rvWrap' + (o.fixed ? ' rvFixed' : '') + (o.clickable ? ' rvClick' : '');
      el.innerHTML = `<div class="rvDim"></div><div class="rvStage" style="${vars(th)}${o.scale ? `transform:scale(${o.scale});` : ''}">
        <div class="rvPack" title="${o.clickable ? 'Click to open the pack' : ''}">
          <div class="rvBack"></div>
          <div class="rvCard"><div class="rvCardIn rvBlank"></div></div>
          <div class="rvFoil rvBody">${fxSpans(th)}<div class="rvLabel"><div class="rvK">${esc(th.head)}</div>${o.cover?.image ? `<img src="${esc(o.cover.image)}" alt="">` : ''}${o.cover?.text ? `<div class="rvCv">${esc(o.cover.text)}</div>` : ''}</div><div class="rvBrand">🎁 MOVIE ROYAL</div><div class="rvCrimp"></div></div>
          <div class="rvFoil rvTop"><div class="rvCrimp"></div><span class="rvFx" style="left:12px;top:22px;opacity:.5;font-size:24px">${th.fx[1]}</span><span class="rvFx" style="right:12px;top:22px;opacity:.5;font-size:24px">${th.fx[2]}</span><div class="rvTearLine">✂ TEAR HERE ✂</div></div>
        </div>
        <div class="rvHint">${o.clickable ? `👆 Click the pack to open it!${o.fixed ? ' <small style="opacity:.7">(or press Enter)</small>' : ''}` : '🎁 What\'s inside…?'}</div>
        ${o.fixed ? '<div class="rvBtns"><button data-rv="close" title="Close it here and on stream without opening it">✕ Close without opening</button></div>' : ''}
      </div>`;
      let dlg = null; const pack = el.querySelector('.rvPack');
      if (o.fixed) { // (a dialog of its own, so it sits on top of any other open window in the app; Enter / Space opens it, Esc does nothing)
        dlg = document.createElement('dialog'); dlg.className = 'rvDlg'; dlg.appendChild(el); document.body.appendChild(dlg);
        dlg.addEventListener('cancel', e => e.preventDefault());
        dlg.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ' || e.key === 'o' || e.key === 'O') { e.preventDefault(); if (cur && !cur.open) pack.click(); } });
        try { dlg.showModal(); } catch { dlg.setAttribute('open', ''); }
      } else host.appendChild(el);
      cur = { id: o.id, el, o, open: false, dlg };
      if (o.clickable) pack.addEventListener('click', () => { if (!cur || cur.open || cur.asked) return; cur.asked = true; el.querySelector('.rvHint').textContent = '✂ Opening…'; o.onOpen?.(o.id); });
      el.querySelector('[data-rv="close"]')?.addEventListener('click', () => o.onClose?.(o.id));
      o.sound?.('packShake'); cur.shakeT = setInterval(() => { if (cur && !cur.open) o.sound?.('packShake'); }, 1800);
      return el;
    },
    /** the pack opens: hidden = { text, image } */
    open(id, hidden, coverText) {
      if (!cur || (id && cur.id !== id) || cur.open) return;
      cur.open = true; clearInterval(cur.shakeT);
      const { el, o } = cur, th = theme(o.theme), pack = el.querySelector('.rvPack'), stage = el.querySelector('.rvStage');
      const ci = el.querySelector('.rvCardIn'); ci.classList.remove('rvBlank');
      ci.innerHTML = `<div class="rvFrame"></div><span class="rvCorner tl">${th.fx[0]}</span><span class="rvCorner br">${th.fx[0]}</span><div class="rvFHead">${esc(th.face)}</div>${hidden?.image ? `<img class="rvFImg" src="${esc(hidden.image)}" alt="">` : ''}${hidden?.text ? `<div class="rvFText" style="font-size:${hidden.image ? Math.min(30, textSize(hidden.text)) : textSize(hidden.text)}px">${esc(hidden.text)}</div>` : ''}<div class="rvFFoot">🎁 ${esc(coverText || o.cover?.text || 'Mystery spot')}</div><div class="rvHolo"></div>`;
      pack.classList.add('rvOpening', 'rvTorn'); o.sound?.('packTear');
      for (let i = 0; i < 16; i++) { const b = document.createElement('i'); b.className = 'rvBit'; b.style.cssText = `--dx:${Math.round(Math.random() * 360 - 120)}px;--dy:${Math.round(-60 - Math.random() * 220)}px;--r:${Math.round(Math.random() * 720 - 360)}deg;left:${20 + Math.random() * 60}%;animation-delay:${(Math.random() * .25).toFixed(2)}s;background:${i % 3 ? th.c : '#fff'}`; pack.appendChild(b); }
      el.querySelector('.rvHint').textContent = '';
      setTimeout(() => cur?.el === el && pack.classList.add('rvRise'), 600);
      setTimeout(() => { if (cur?.el !== el) return; pack.classList.add('rvOut'); const bu = document.createElement('div'); bu.className = 'rvBurst'; stage.appendChild(bu); o.sound?.('cardReveal');
        const btns = el.querySelector('.rvBtns'); if (btns) { btns.innerHTML = '<button data-rv="close">✕ Close (here and on stream)</button>'; btns.querySelector('button').addEventListener('click', () => o.onClose?.(o.id)); }
      }, 1650);
    },
    remove(fade) {
      if (!cur) return; const { el, shakeT, dlg } = cur; clearInterval(shakeT); cur = null;
      const gone = () => { el.remove(); if (dlg) { try { dlg.close(); } catch {} dlg.remove(); } };
      if (fade) { el.classList.add('rvBye'); setTimeout(gone, 420); } else gone();
    }
  };
  window.RevealPack = R;
})();

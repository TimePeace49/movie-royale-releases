/* A typing box that works inside the Windows app (the app blocks the browser's built-in prompt box).
   Use: const text = await ask('Question?', 'default')  →  the text, or null if they pressed Cancel. */
(function () {
  window.ask = function (msg, def = '') {
    return new Promise(done => {
      const bg = document.createElement('div');
      bg.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#0009;display:flex;align-items:center;justify-content:center;font-family:Inter,system-ui,sans-serif';
      bg.innerHTML = `<div style="background:#1d1233;color:#fff;border:1px solid #ffffff2e;border-radius:14px;padding:18px;width:min(460px,92vw);box-shadow:0 20px 60px #000a">
        <div class="askMsg" style="white-space:pre-wrap;margin-bottom:10px;font-size:14px;line-height:1.45"></div>
        <input class="askIn" style="width:100%;box-sizing:border-box;padding:9px 11px;border-radius:9px;border:1px solid #ffffff3a;background:#0b0618;color:#fff;font-size:14px">
        <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px">
          <button class="askNo" style="padding:7px 14px;border-radius:9px;border:1px solid #ffffff3a;background:transparent;color:#fff;cursor:pointer">Cancel</button>
          <button class="askOk" style="padding:7px 16px;border-radius:9px;border:0;background:#ffc94a;color:#1a1030;font-weight:700;cursor:pointer">OK</button></div></div>`;
      bg.querySelector('.askMsg').textContent = msg;
      const inp = bg.querySelector('.askIn'); inp.value = def ?? '';
      const end = v => { bg.remove(); done(v); };
      bg.querySelector('.askOk').onclick = () => end(inp.value);
      bg.querySelector('.askNo').onclick = () => end(null);
      bg.addEventListener('mousedown', e => { if (e.target === bg) end(null); });
      inp.addEventListener('keydown', e => { if (e.key === 'Enter') end(inp.value); if (e.key === 'Escape') end(null); });
      document.body.appendChild(bg); setTimeout(() => { inp.focus(); inp.select(); }, 30);
    });
  };
})();

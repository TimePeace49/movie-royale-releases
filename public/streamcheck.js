/* 🚀 Stream check (1.165.0, Derek: "on the test all make sure all the commands work and alerts, the text on top of the screen, lights,
   sound alerts, jump scares. when running these tests have a preview screen so I can see them… before going live… the ultimate test").
   One window: the steps on the left, a preview of the stream picture on the right. Steps Movie Royal can judge by itself tick themselves;
   the ones only you can judge (did you SEE it, did you HEAR it) wait for your answer. No wheel or movie steps.
   Uses the control panel's globals: $, esc, S, featOn, toast, FXC, SCREENFX. Talks to the server with its own fetch (the control's api()
   opens preview windows and switches tabs for test calls). */
(function () {
  const SECS = [['conn', '🔌 Connections'], ['cmds', '💬 Chat commands'], ['alerts', '🔔 Alerts'], ['text', '📣 Text on the stream'], ['fx', '🌀 Screen effects'], ['lights', '💡 Lights'], ['sounds', '🔊 Sound alerts'], ['scares', '😱 Jump scares'], ['battle', '⚔️ A test battle']];
  const ICON = { ok: '✅', bad: '❌', warn: '🟡', skip: '⚪', run: '🔄', ask: '👀', wait: '▫️' };
  // commands that would change something real when run as you: they are listed but not run
  const NO_RUN = /^!(skip|skipsong|wrongsong|voteskip|delquote|addquote|addcom|editcom|delcom|respin|accept|pass|sitout|imback|join|equip|battle|power|link)\b/i;
  const SKIP_GROUPS = /wheel|movie|battles|eggs/i; // (Derek: "won't be doing wheel stuff or movie stuff")
  const SC = window.SC = { on: false, steps: [], i: -1, res: {}, wait: null, stop: false, running: false, off: new Set(), info: null, sound: 0 };
  try { SC.off = new Set(JSON.parse(localStorage.scOff || '[]')); } catch {}
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  async function call(url, body, method) {
    const r = await fetch(url, { method: method || (body === undefined ? 'GET' : 'POST'), headers: { 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body || {}) });
    let j = {}; try { j = await r.json(); } catch {}
    if (!r.ok) throw new Error(j.error || `It answered ${r.status}`);
    return j;
  }
  const hasFeat = f => { try { return featOn(f); } catch { return false; } };
  const devMode = () => { try { return !!S.settings.betaUpdates; } catch { return false; } };

  // ---------- the preview (a 1920×1080 picture, scaled to fit) ----------
  const F = id => document.getElementById(id);
  function frame(id, src) { const f = F(id); if (!f) return; if (f.dataset.src !== src) { f.dataset.src = src; f.src = src || 'about:blank'; } f.style.display = src ? 'block' : 'none'; }
  function chatLine(who, text, cls) { const b = F('scChat'); if (!b) return; const d = document.createElement('div'); d.className = cls || ''; d.innerHTML = `<b>${esc(who)}</b> ${esc(String(text).slice(0, 220))}`; b.appendChild(d); while (b.children.length > 9) b.firstChild.remove(); b.style.display = 'block'; }
  function chatClear() { const b = F('scChat'); if (b) { b.innerHTML = ''; b.style.display = 'none'; } }
  function fit() { const st = F('scStage'), w = F('scWorld'); if (st && w) w.style.transform = `scale(${st.clientWidth / 1920})`; }
  function tick() { // the screen effect that is playing, on the pretend game picture
    if (!SC.on) return; requestAnimationFrame(tick);
    const bg = F('scBg'); if (!bg) return; let fx = null; try { fx = FXC; } catch {}
    if (!fx || fx.paused) { bg.style.filter = ''; bg.style.transform = ''; return; }
    const t = (Date.now() - fx.at) / 1000, f = fx.forever ? SCREENFX.mix(fx.kinds, t, Infinity) : SCREENFX.frame(fx.kind, Math.min(t, fx.secs), fx.secs), c = SCREENFX.css(f);
    bg.style.filter = c.filter; bg.style.transform = c.transform;
  }

  // ---------- the steps ----------
  const auto = (id, sec, label, run) => ({ id, sec, label, kind: 'auto', run });
  const see = (id, sec, label, look, run, o = {}) => ({ id, sec, label, kind: o.hear ? 'hear' : 'see', look, run, ...o });
  const srv = (id, label) => auto('c-' + id, 'conn', label, async () => { const r = await call('/api/test/check', { id }); const must = ['twitchChat', 'twitchPost', 'obs'].includes(id); return { s: r.ok === true ? 'ok' : r.ok === false ? 'bad' : r.ok === 'warn' || must ? 'warn' : 'skip', note: r.note || '' }; }); // (for going live, chat and OBS not being there is worth a yellow mark, not a quiet skip)
  async function plan() {
    const I = SC.info = await call('/api/test/stream-check'), L = [];
    L.push(srv('twitch', '💜 Twitch: signed in'), srv('twitchChat', '💜 Twitch: reading chat'), srv('twitchPost', '💜 Twitch: can post in chat'), srv('chatBot', '🤖 Your chat bot account'), srv('donations', '💰 Donations (StreamElements / Streamlabs)'), srv('obs', '🎥 OBS: connected'));
    // chat commands, one step per group
    let btn = { buttons: [] }; try { btn = await call('/api/test/chat-buttons'); } catch {}
    const groups = {}; for (const b of btn.buttons) { if (SKIP_GROUPS.test(b.group) || /sound alert/i.test(b.group) || !/^!/.test(b.text)) continue; (groups[b.group] ||= []).push(b.text); }
    for (const n of I.own || []) { const g = (groups['🤖 Chat bot'] ||= []); if (!g.some(t => t.split(' ')[0].toLowerCase() === n.toLowerCase())) g.push(n); }
    for (const [g, list] of Object.entries(groups)) L.push(/song/i.test(g) && !I.srOpen ? auto('cmd-' + g, 'cmds', `${g}: ${list.length} commands`, async () => ({ s: 'skip', note: 'song requests are switched off right now, so the song commands stay silent (that is how it should be)' })) : auto('cmd-' + g, 'cmds', `${g}: ${list.length} command${list.length === 1 ? '' : 's'}`, async () => {
      const items = []; let silent = 0, notRun = 0; chatClear();
      for (const full of list) { if (SC.stop) break;
        if (NO_RUN.test(full)) { notRun++; items.push(`⚪ ${full.split(' ')[0]}: not run (it would change something real)`); continue; }
        const text = /^!so\b/i.test(full) ? full : full.split(' ')[0]; // (only the bare command: nothing gets saved or changed)
        chatLine('you:', text, 'me');
        try { const r = await call('/api/chat/say', { text, test: true }), a = (r.replies || []).join(' · ');
          if (a) { items.push(`✅ ${text} → ${a.slice(0, 160)}`); chatLine('bot:', a); } else { silent++; items.push(`🟡 ${text}: no answer in chat`); }
        } catch (e) { silent++; items.push(`❌ ${text}: ${e.message}`); }
      }
      return { s: silent ? 'warn' : 'ok', note: silent ? `${silent} gave no answer (some only answer when there's something to say; open Details)` : `all answered${notRun ? ` · ${notRun} not run` : ''}`, items };
    }));
    // alerts
    L.push(auto('al-box', 'alerts', '🔔 A pretend sub shows in the alerts box', async () => { await call('/api/test/alert', { kind: 'sub' }); return { s: 'ok', note: 'look in the 💬 Chat tab\'s alerts box after the check: “Test_Viewer subscribed”' }; }));
    if (I.dev) L.push(I.mara.on ? see('al-pop', 'alerts', '🎟️ The “bought a battle” pop-up on stream', `A pop-up slides in on the picture: Test_Viewer got a battle, with the numbered maps and things to pick.${I.mara.clock ? ' Your total live time and the battles counter show too.' : ''}`, async () => { frame('scMara', '/marathon.html'); await sleep(SC.maraUp ? 300 : 1800); SC.maraUp = true; await call('/api/test/mara-pop', { name: 'Test_Viewer', n: 1, what: 'a $5 tip' }); }, { after: () => { frame('scMara', ''); SC.maraUp = false; } })
      : auto('al-pop', 'alerts', '🎟️ The “bought a battle” pop-up on stream', async () => ({ s: 'skip', note: 'paid battles are switched off (Settings → 💰), so tips, bits and subs don\'t buy battles' })));
    // text on the stream
    L.push(I.promo.on && I.promo.text ? see('tx-promo', 'text', '📣 The sell message scrolls along the picture', `White words scroll right to left: “${I.promo.text.slice(0, 90)}${I.promo.text.length > 90 ? '…' : ''}”`, async () => { const r = await call('/api/test/promo'); frame('scTick', '/ticker.html?role=promo&demo=1&clear=1&text=' + encodeURIComponent(I.promo.text)); if (r.rows && r.rows.some(x => !x.ok)) throw new Error('its words didn\'t check out: ' + r.rows.filter(x => !x.ok).map(x => x.label).join('; ')); }, { after: () => frame('scTick', '') })
      : auto('tx-promo', 'text', '📣 The sell message', async () => ({ s: 'skip', note: I.promo.on ? 'it has no words yet (nothing to sell is switched on)' : 'switched off (Settings → 🎥 OBS → 📣 Sell message)' })));
    if (I.dev) L.push(see('tx-pause', 'text', '📜 The “battles are paused” message', 'White words scroll along the bottom saying battles are paused and will be run later. (This only shows it here: your battles are NOT paused.)', async () => { frame('scTick', '/ticker.html?demo=1&clear=1'); }, { after: () => frame('scTick', '') }));
    // screen effects
    if (I.fx.feat) L.push(see('fx-one', 'fx', '🌀 A screen effect plays (black & white, 8 seconds)', 'The pretend game here turns black & white for 8 seconds, with a small timer in the top left. If OBS is open, your real game source does it too.', async () => { frame('scFxT', '/fxtimer.html'); await sleep(SC.fxUp ? 200 : 1200); SC.fxUp = true; await call('/api/test/screenfx', { kind: 'bw', secs: 8, dry: false }); }, { after: () => call('/api/screenfx/stop', {}).catch(() => {}) }));
    if (I.fx.feat && !I.fx.on) L.push(auto('fx-on', 'fx', '🌀 Screen effects for chat are switched on', async () => ({ s: 'warn', note: 'they are OFF: chat can\'t buy one until you tick “Screen effects on” (Settings → 🎥 OBS)' })));
    // lights
    if (I.smart) { let sm = null; try { sm = await call('/api/smart'); } catch {}
      const bulbs = sm ? (sm.devices || []).filter(d => d.fx && !d.hidden && !d.test) : [];
      if (!sm || !sm.on || !bulbs.length) L.push(auto('li-none', 'lights', '💡 Lights', async () => ({ s: 'skip', note: !sm || !sm.on ? 'smart plug controls are switched off' : 'no bulb is ticked to react to alerts (Settings → 🔌 Smart plug controls → 🔎 Find my devices)' })));
      else for (const [k, name] of [['sub', 'sub'], ['gift', 'gift sub'], ['raid', 'raid'], ['bits', 'bits'], ['tip', 'donation']]) { const e = sm.events?.[k]; if (!e) continue;
        L.push(e.on ? see('li-' + k, 'lights', `💡 Lights for a ${name}`, `Look at your lights (not this screen): ${bulbs.map(b => b.label || b.name).join(', ')} should do the ${name} show for about ${e.secs} seconds, then go back to how they were.`, async () => { await call('/api/smart/show', { kind: k }); })
          : auto('li-' + k, 'lights', `💡 Lights for a ${name}`, async () => ({ s: 'skip', note: 'switched off for this kind of alert' }))); }
    }
    // sound alerts
    const snd = I.sounds || [];
    L.push(auto('so-files', 'sounds', `🔊 Every sound alert has its sound file (${snd.length})`, async () => { const bad = snd.filter(x => !x.ok); return !snd.length ? { s: 'skip', note: 'you have no sound alerts' } : { s: bad.length ? 'bad' : 'ok', note: bad.length ? `${bad.length} without a sound file: ${bad.slice(0, 8).map(x => x.name).join(', ')}${bad.length > 8 ? '…' : ''}` : 'all there', items: snd.map(x => `${x.ok ? '✅' : '❌'} ${x.name}${x.file ? ' → ' + x.file : ''}`) }; }));
    const playable = snd.filter(x => x.ok);
    if (playable.length) L.push(see('so-hear', 'sounds', '🔊 A sound alert plays', '', async st => { const x = playable[SC.sound++ % playable.length]; st.look = `You should hear ${x.name} now${I.sfx.pages ? ' (it plays through OBS’s sound alerts source' + (I.sfx.hear ? ' and in this app)' : ')') : ' in this app'}. 🔁 Again plays the next one.`; await call('/api/chatbot/sound', { id: x.id, play: true }); }, { hear: true }));
    // jump scares
    if (I.dev) { if (!I.scare.on) L.push(auto('sc-off', 'scares', '😱 Jump scares', async () => ({ s: 'skip', note: 'switched off (🏃 Marathon tab → 😱 Scares on my screen)' })));
      else for (const [lvl, name] of [[1, 'small one (a follow)'], [3, 'big one (a $50 tip)']]) L.push(see('sc-' + lvl, 'scares', `😱 Jump scare: the ${name}`, `It plays here in the preview${I.scare.desktop ? ' AND pops up on your real screen' + (I.scare.where === 'all' ? 's' : '') : ' (the pop-up on your real screen only works in the Windows app)'}. It lasts about 12 seconds.`, async () => { const r = await call('/api/test/scare-pop', { lvl }); if (r.job) frame('scScare', '/scare.html?t=' + Date.now() + '#' + encodeURIComponent(JSON.stringify({ ...r.job, vol: I.scare.desktop ? 0 : 70, own: '/sounds/scare-scream.mp3', flash: true, shake: true, pos: 'bottom' }))); }, { after: () => frame('scScare', '') })); }
    // a test battle
    if (I.dev && I.mara.list) L.push(see('ba-run', 'battle', '⚔️ A test marathon battle plays to the end', 'A practice battle plays here (no sound in the preview) and ends with a winner. Nothing is counted: no luck, no history, nothing goes to chat.', async st => {
      frame('scGame', '/game.html?preview=1'); await sleep(2500); await call('/api/test/mara-battle', {});
      const t0 = Date.now(); let ran = false; st.look = 'A practice battle is playing here… (this takes a minute or two)'; draw();
      while (Date.now() - t0 < 240000 && !SC.stop) { await sleep(1000); let ph = ''; try { ph = S.phase; } catch {} if (ph === 'running' || ph === 'lobby') ran = true; else if (ran) break; }
      if (!ran) throw new Error('the battle never started');
      st.look = 'The battle is over. Did it play here and end with a winner?';
    }, { after: async () => { await call('/api/mara/timer', { cmd: 'close' }).catch(() => {}); await sleep(3500); await call('/api/reset', {}).catch(() => {}); frame('scGame', ''); } }));
    return L.filter(s => !SC.off.has(s.sec));
  }

  // ---------- drawing ----------
  const CSS = `
  #scDlg { width: min(1560px, 97vw); height: min(940px, 94vh); max-width: none; max-height: none; padding: 0; border-radius: 16px; overflow: hidden; }
  #scDlg[open] { display: flex; flex-direction: column; }
  #scTop { display: flex; gap: 10px; align-items: center; padding: 10px 16px; border-bottom: 1px solid rgba(255,255,255,.12); }
  #scTop h3 { margin: 0; flex: 1; } #scBarO { flex: 1; height: 8px; border-radius: 6px; background: rgba(255,255,255,.1); overflow: hidden; max-width: 320px; } #scBarO i { display: block; height: 100%; background: #7c4dff; transition: width .3s; }
  #scMain { flex: 1; min-height: 0; display: grid; grid-template-columns: minmax(300px, 390px) minmax(0, 1fr); }
  #scList { overflow-y: auto; padding: 8px 12px 14px; border-right: 1px solid rgba(255,255,255,.12); }
  #scList h4 { margin: 12px 0 4px; font-size: 13px; opacity: .8; } .scRow { display: flex; gap: 7px; padding: 4px 6px; border-radius: 8px; font-size: 13px; line-height: 1.3; } .scRow.now { background: rgba(124,77,255,.28); } .scRow small { display: block; opacity: .7; } .scRow.bad small { color: #ff9c9c; opacity: 1; }
  .scRow details { margin-top: 2px; } .scRow details div { font-size: 12px; opacity: .85; margin: 1px 0; overflow-wrap: anywhere; }
  #scRight { min-width: 0; min-height: 0; display: flex; flex-direction: column; padding: 12px 16px; gap: 10px; overflow-y: auto; }
  #scStage { position: relative; width: 100%; max-width: calc((94vh - 330px) * 16 / 9); margin: 0 auto; aspect-ratio: 16 / 9; background: #000; border-radius: 12px; overflow: hidden; flex: none; }
  #scWorld { position: absolute; left: 0; top: 0; width: 1920px; height: 1080px; transform-origin: 0 0; }
  #scBg { position: absolute; inset: 0; background: linear-gradient(135deg, #2c5f7a, #7a4c2c 55%, #3b7a2c); display: flex; align-items: center; justify-content: center; font: 800 64px Inter, sans-serif; color: rgba(255,255,255,.55); }
  #scBg::after { content: ''; position: absolute; left: 12%; top: 22%; width: 180px; height: 180px; border-radius: 30px; background: rgba(255,210,90,.75); animation: scMove 6s linear infinite alternate; }
  @keyframes scMove { to { transform: translate(1100px, 420px) rotate(260deg); } }
  #scWorld iframe { position: absolute; left: 0; top: 0; width: 1920px; height: 1080px; border: 0; background: transparent; pointer-events: none; display: none; }
  #scChat { position: absolute; left: 40px; bottom: 40px; width: 900px; padding: 18px 22px; border-radius: 18px; background: rgba(14,10,30,.86); font: 500 30px/1.35 Inter, sans-serif; color: #fff; display: none; } #scChat div { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; } #scChat .me b { color: #ffd166; } #scChat b { color: #b9a2ff; }
  #scNow { border-radius: 12px; padding: 12px 14px; background: rgba(255,255,255,.06); } #scNow h4 { margin: 0 0 4px; font-size: 17px; } #scNow p { margin: 0 0 8px; font-size: 14px; line-height: 1.4; } #scNow .row { gap: 8px; flex-wrap: wrap; }
  #scNow .big { font-size: 15px; padding: 8px 16px; }`;
  function shell() {
    let d = F('scDlg'); if (d) return d;
    const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    d = document.createElement('dialog'); d.id = 'scDlg';
    d.innerHTML = `<div id="scTop"><h3>🚀 Stream check</h3><div id="scBarO"><i id="scBar" style="width:0"></i></div><span class="pill" id="scPill"></span><button onclick="SC.close()" title="Stream check: stop and close this window (what was checked so far is kept)">✕ Close</button></div>
      <div id="scMain"><div id="scList"></div><div id="scRight">
        <div id="scStage" title="Stream check: a preview of your stream picture. The things being tested show up here, over a pretend game"><div id="scWorld"><div id="scBg">🎮 Pretend game picture</div>
          <iframe id="scGame"></iframe><iframe id="scMara"></iframe><iframe id="scFxT"></iframe><iframe id="scTick"></iframe><iframe id="scScare"></iframe><div id="scChat"></div></div></div>
        <div id="scNow"></div></div></div>`;
    document.body.appendChild(d);
    d.addEventListener('cancel', e => { e.preventDefault(); SC.close(); });
    new ResizeObserver(fit).observe(d.querySelector('#scStage'));
    return d;
  }
  function draw() {
    const list = F('scList'), now = F('scNow'); if (!list || !now) return;
    const done = SC.steps.filter(s => ['ok', 'bad', 'warn', 'skip'].includes(SC.res[s.id]?.s)).length, n = k => SC.steps.filter(s => SC.res[s.id]?.s === k).length;
    F('scBar').style.width = (SC.steps.length ? Math.round(done / SC.steps.length * 100) : 0) + '%'; F('scPill').textContent = SC.steps.length ? `${done} / ${SC.steps.length}` : '';
    const key = JSON.stringify([SC.i, SC.steps.map(s => [SC.res[s.id]?.s, SC.res[s.id]?.note, SC.res[s.id]?.items?.length])]);
    if (list._k !== key) { list._k = key;
      list.innerHTML = SC.steps.length ? SECS.filter(([k]) => SC.steps.some(s => s.sec === k)).map(([k, name]) => `<h4>${name}</h4>` + SC.steps.filter(s => s.sec === k).map(s => { const r = SC.res[s.id] || {}, cur = SC.steps[SC.i] === s;
        return `<div class="scRow ${r.s || ''}${cur ? ' now' : ''}" data-sc="${esc(s.id)}"><span>${ICON[r.s] || '▫️'}</span><span style="min-width:0">${esc(s.label)}${r.note ? `<small>${esc(r.note)}</small>` : ''}${r.items?.length ? `<details><summary class="help" style="margin:0">Details</summary>${r.items.map(x => `<div>${esc(x)}</div>`).join('')}</details>` : ''}</span></div>`; }).join('')).join('')
        : '<p class="help">Getting the list ready…</p>';
      list.querySelector('.scRow.now')?.scrollIntoView({ block: 'nearest' });
    }
    let h = ''; const s = SC.steps[SC.i], r = s ? SC.res[s.id] || {} : {};
    if (!SC.running && !SC.steps.length) h = startHTML();
    else if (SC.running && s && r.s === 'ask') h = `<h4>${s.kind === 'hear' ? '👂' : '👀'} ${esc(s.label)}</h4><p>${esc(s.look || '')}</p><div class="row"><button class="primary big" onclick="SC.ans('yes')" title="Stream check: yes, it worked. Ticks this step and goes to the next one">✅ Yes, ${s.kind === 'hear' ? 'I heard it' : 'I saw it'}</button><button class="danger big" onclick="SC.ans('no')" title="Stream check: no, it did not work. Marks this step as a problem and goes on">❌ No</button><button class="big" onclick="SC.ans('again')" title="Stream check: do this step once more">🔁 Again</button><button class="ghost big" onclick="SC.ans('skip')" title="Stream check: leave this step out and go on">⏭ Skip</button></div>`;
    else if (SC.running && s) h = `<h4>🔄 ${esc(s.label)}</h4><p>${s.kind === 'auto' ? 'Checking this one by itself…' : esc(s.look || 'Starting it…')}</p><div class="row"><button class="ghost" onclick="SC.halt()" title="Stream check: stop after this step (what was checked so far is kept)">⏹ Stop</button></div>`;
    else if (SC.steps.length) { const bad = SC.steps.filter(x => SC.res[x.id]?.s === 'bad'), warn = SC.steps.filter(x => SC.res[x.id]?.s === 'warn');
      h = `<h4>${bad.length ? '❌ Not ready yet' : warn.length ? '🟡 Nearly: have a look at the yellow ones' : '✅ Everything checked out. You\'re good to go live!'}</h4><p>✅ ${n('ok')} fine · ❌ ${n('bad')} problem${n('bad') === 1 ? '' : 's'} · 🟡 ${n('warn')} to look at · ⚪ ${n('skip')} skipped${SC.stop ? ' · stopped early' : ''}</p>${bad.length ? `<p><b>Fix these:</b><br>${bad.map(x => `❌ ${esc(x.label)}${SC.res[x.id].note ? ': ' + esc(SC.res[x.id].note) : ''}`).join('<br>')}</p>` : ''}
        <div class="row"><button class="primary big" onclick="SC.start()" title="Stream check: run every step again from the top">🔁 Run it all again</button>${bad.length + warn.length ? `<button class="big" onclick="SC.start(true)" title="Stream check: run only the steps that had a problem or a yellow mark">🔁 Only the ❌ and 🟡 ones</button>` : ''}<button class="big" onclick="SC.copy()" title="Stream check: copy the whole result as text (to paste to Claude or keep)">📋 Copy the result</button><button class="ghost big" onclick="SC.pick()" title="Stream check: choose which parts to run">☑️ Choose parts</button></div>`; }
    if (now._h !== h) { now._h = h; now.innerHTML = h; }
  }
  function startHTML() {
    return `<h4>🚀 The pre-stream check</h4><p>It goes through everything for your stream, one step at a time, and shows each thing in the preview. Steps it can judge by itself tick themselves. For the ones only you can judge it asks <b>did you see it</b> or <b>did you hear it</b>. Nothing goes to your real chat, and nothing is saved or counted. Lights, jump scares and screen effects are real (your bulbs flash, the scare pops up on your screen).</p>
      <p>${SECS.map(([k, name]) => `<label style="display:inline-flex;gap:5px;align-items:center;margin:2px 12px 2px 0"><input type="checkbox" ${SC.off.has(k) ? '' : 'checked'} onchange="SC.part('${k}', this.checked)" title="Stream check: include “${esc(name)}” in the run"> ${name}</label>`).join('')}</p>
      <div class="row"><button class="primary big" onclick="SC.start()" title="Stream check: start the run with the ticked parts">▶ Start the check</button>${SC.last ? `<span class="help" style="align-self:center;margin:0">Last time: ${esc(new Date(SC.last.at).toLocaleString())} · ✅ ${SC.last.ok} · ❌ ${SC.last.bad} · 🟡 ${SC.last.warn}</span>` : ''}</div>`;
  }

  // ---------- running ----------
  async function runStep(s) {
    SC.res[s.id] = { s: 'run' }; if (s.sec !== 'cmds') chatClear(); draw();
    try {
      const r = await s.run(s);
      if (s.kind === 'auto') { SC.res[s.id] = r && r.s ? r : { s: 'ok' }; return; }
      for (;;) {
        SC.res[s.id] = { s: 'ask' }; draw();
        const a = await new Promise(res => { SC.wait = res; }); SC.wait = null;
        if (a === 'again') { SC.res[s.id] = { s: 'run' }; draw(); await s.run(s); continue; }
        SC.res[s.id] = a === 'yes' ? { s: 'ok', note: s.kind === 'hear' ? 'you heard it' : 'you saw it' } : a === 'no' ? { s: 'bad', note: s.kind === 'hear' ? 'you did not hear it' : 'you did not see it' } : { s: 'skip', note: a === 'stop' ? 'stopped' : 'skipped by you' };
        break;
      }
    } catch (e) { SC.res[s.id] = { s: /not part of|dev mode|switched off|Turn on/i.test(e.message) ? 'skip' : 'bad', note: e.message || 'it failed' }; }
    finally { try { if (s.after) await s.after(); } catch {} }
  }
  SC.start = async function (onlyBad) {
    if (SC.running) return;
    SC.running = true; SC.stop = false; SC.i = -1; const was = SC.res; chatClear();
    try {
      if (!onlyBad || !SC.steps.length) { SC.steps = []; SC.res = {}; draw(); SC.steps = await plan(); }
      const todo = onlyBad ? SC.steps.filter(s => ['bad', 'warn'].includes(was[s.id]?.s)) : SC.steps;
      for (const s of todo) SC.res[s.id] = { s: 'wait' };
      for (const s of todo) { if (SC.stop) { SC.res[s.id] = was[s.id] && onlyBad ? was[s.id] : { s: 'skip', note: 'not run (stopped)' }; continue; } SC.i = SC.steps.indexOf(s); draw(); await runStep(s); await sleep(250); }
    } catch (e) { toast('⚠️ Stream check: ' + esc(e.message || e)); }
    SC.running = false; SC.i = -1; chatClear();
    const n = k => SC.steps.filter(s => SC.res[s.id]?.s === k).length; SC.last = { at: Date.now(), ok: n('ok'), bad: n('bad'), warn: n('warn'), skip: n('skip') };
    try { localStorage.scLast = JSON.stringify(SC.last); } catch {}
    draw();
  };
  SC.ans = a => { if (SC.wait) SC.wait(a); };
  SC.halt = () => { SC.stop = true; if (SC.wait) SC.wait('stop'); };
  SC.part = (k, on) => { if (on) SC.off.delete(k); else SC.off.add(k); try { localStorage.scOff = JSON.stringify([...SC.off]); } catch {} };
  SC.pick = () => { if (SC.running) return; SC.steps = []; SC.res = {}; draw(); };
  SC.text = () => SECS.filter(([k]) => SC.steps.some(s => s.sec === k)).map(([k, name]) => name + '\n' + SC.steps.filter(s => s.sec === k).map(s => { const r = SC.res[s.id] || {}; return `  ${ICON[r.s] || '▫️'} ${s.label}${r.note ? ' — ' + r.note : ''}${(r.items || []).filter(x => !/^✅/.test(x)).map(x => '\n      ' + x).join('')}`; }).join('\n')).join('\n');
  SC.copy = async () => { const t = `Stream check (${new Date().toLocaleString()})\n` + SC.text(); try { if (window.__desktop?.copy) window.__desktop.copy(t); else await navigator.clipboard.writeText(t); toast('📋 Copied the result'); } catch { toast('Could not copy it'); } };
  SC.open = function () {
    const d = shell(); try { SC.last = JSON.parse(localStorage.scLast || 'null'); } catch {}
    if (!d.open) d.showModal(); SC.on = true; fit(); requestAnimationFrame(tick); draw();
  };
  SC.close = function () {
    SC.halt(); SC.on = false; SC.maraUp = SC.fxUp = false;
    for (const id of ['scGame', 'scMara', 'scFxT', 'scTick', 'scScare']) frame(id, ''); // (no hidden pages left running)
    const d = F('scDlg'); if (d && d.open) d.close();
  };
  window.streamCheck = () => SC.open();
})();

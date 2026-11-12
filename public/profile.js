// 👤 Viewer profile pop-up: double-click anyone's name anywhere in Movie Royal.
window.Profile = (() => {
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const dt = t => t ? new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
  const ago = t => { if (!t) return ''; const d = Math.floor((Date.now() - t) / 864e5); return d < 1 ? 'today' : d < 31 ? `${d} day${d === 1 ? '' : 's'}` : d < 365 ? `${Math.floor(d / 30.4)} month${Math.floor(d / 30.4) === 1 ? '' : 's'}` : `${(d / 365).toFixed(1)} years`; };
  const hrs = m => m == null ? '—' : m < 60 ? `${m} min` : `${(m / 60).toFixed(m < 600 ? 1 : 0)} hours`;
  let dlg = null, cur = null, tab = 'overview';
  function ensure() {
    if (dlg) return dlg;
    const st = document.createElement('style');
    st.textContent = `#profDlg{background:#140c26;color:#f3edff;border:1px solid #3a2a5c;border-radius:18px;width:min(860px,96vw);padding:0;font:15px Inter,Segoe UI,system-ui,sans-serif}
      #profDlg::backdrop{background:#0008}#profDlg .ph{display:flex;gap:16px;align-items:center;padding:18px 20px;border-bottom:1px solid #3a2a5c}#profDlg .ph img{width:72px;height:72px;border-radius:50%;border:3px solid #9b4dff}
      #profDlg .pn{font-size:24px;font-weight:800}#profDlg .pb{padding:14px 20px;max-height:62vh;overflow:auto}#profDlg .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px}
      #profDlg .st{background:#ffffff0d;border-radius:12px;padding:8px 10px}#profDlg .st b{display:block;font-size:18px}#profDlg .st small{color:#a99cc9}#profDlg h4{margin:14px 0 6px;color:#ffc94a}
      #profDlg button{background:#2a1c47;color:#fff;border:1px solid #3a2a5c;border-radius:10px;padding:6px 11px;cursor:pointer}#profDlg button.pri{background:linear-gradient(90deg,#ffc94a,#ff8a3d);color:#1a1030;border:0;font-weight:700}#profDlg button.red{border-color:#ff6b6b;color:#ff9a9a}
      #profDlg .tabs{display:flex;gap:6px;padding:8px 20px 0}#profDlg .tabs button.on{background:#ffc94a;color:#1a1030}#profDlg .row{display:flex;gap:8px;flex-wrap:wrap;align-items:center}#profDlg .muted{color:#a99cc9}
      #profDlg .line{padding:3px 0;border-bottom:1px solid #ffffff10;font-size:14px}#profDlg a{color:#c9a8ff}`;
    document.head.appendChild(st);
    dlg = document.createElement('dialog'); dlg.id = 'profDlg'; document.body.appendChild(dlg);
    /* 🪟 (1.144.1, Derek: "make profile box moveable and it covers anything it's over so won't mess with other boxes") a floating window: drag it by its top part, it sits on top of everything and the app under it keeps working. Its spot is remembered. */
    st.textContent += `#profDlg{position:fixed;margin:0;z-index:9700;box-shadow:0 18px 60px rgba(0,0,0,.75);max-height:92vh;overflow:hidden}#profDlg::backdrop{background:transparent}#profDlg .ph{cursor:move;user-select:none;padding-right:54px}#profDlg .ph a,#profDlg .ph button{cursor:pointer}#profDlg.drag{opacity:.93}#profX{position:absolute;top:10px;right:10px;z-index:3;width:32px;height:32px;padding:0!important;border-radius:50%!important;font-size:16px}`;
    let dr = null;
    dlg.addEventListener('pointerdown', e => { if (e.target.closest('#profX')) { dlg.close(); return; } if (!e.target.closest('.ph') || e.target.closest('a,button,input,select,textarea')) return; const r = dlg.getBoundingClientRect(); dr = { dx: e.clientX - r.left, dy: e.clientY - r.top }; dlg.classList.add('drag'); try { dlg.setPointerCapture(e.pointerId); } catch {} e.preventDefault(); });
    dlg.addEventListener('pointermove', e => { if (!dr) return; place(e.clientX - dr.dx, e.clientY - dr.dy); });
    const drop = () => { if (!dr) return; dr = null; dlg.classList.remove('drag'); const r = dlg.getBoundingClientRect(); try { localStorage.profAt = JSON.stringify({ x: r.left / innerWidth, y: r.top / innerHeight }); } catch {} };
    dlg.addEventListener('pointerup', drop); dlg.addEventListener('pointercancel', drop);
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && dlg.open && !document.querySelector('dialog[open]:not(#profDlg)')) dlg.close(); });
    addEventListener('resize', () => { if (dlg.open) spot(); });
    return dlg;
  }
  function place(x, y) { const w = dlg.offsetWidth, h = dlg.offsetHeight; x = Math.max(8 - w + 120, Math.min(innerWidth - 120, x)); y = Math.max(0, Math.min(innerHeight - 60, y)); dlg.style.left = Math.round(x) + 'px'; dlg.style.top = Math.round(y) + 'px'; } /* (never off the screen: at least a handful of it stays reachable) */
  function spot() { let at = null; try { at = JSON.parse(localStorage.profAt || 'null'); } catch {} const w = dlg.offsetWidth, h = dlg.offsetHeight; if (at && isFinite(at.x) && isFinite(at.y)) place(at.x * innerWidth, at.y * innerHeight); else place((innerWidth - w) / 2, Math.max(10, (innerHeight - h) / 2)); }
  function showIt() { if (!dlg.open) { if (document.querySelector('dialog[open]')) dlg.showModal(); /* (opened from inside another pop-up: it has to go on top of that one) */ else dlg.show(); } if (!dlg.querySelector('#profX')) dlg.insertAdjacentHTML('afterbegin', '<button id="profX" title="Close this profile (Esc)">✕</button>'); spot(); }
  async function open(login, extra = {}) {
    if (!login && !extra.discordId) return;
    try { if (window.parent !== window && window.parent.Profile && window.parent.location.origin === location.origin) return window.parent.Profile.open(login, extra); } catch {} /* (inside one of the Chat tab's boxes: the profile opens in the app itself, so it floats over every box instead of being squeezed into this one) */
    ensure(); dlg.innerHTML = `<div class="pb">Loading ${esc(login)}…</div>`; showIt();
    const q = extra.discordId ? '?discordId=' + encodeURIComponent(extra.discordId) : '';
    cur = await fetch('/api/viewer/' + encodeURIComponent(login || '_') + q).then(r => r.json()); tab = 'overview'; draw();
  }
  function draw() {
    const p = cur, S = p.spins, C = p.chats, W = p.watch;
    const head = `<div class="ph">${p.avatar ? `<img src="${esc(p.avatar)}">` : '<div style="width:72px;height:72px;border-radius:50%;background:#2a1c47;display:grid;place-items:center;font-size:30px">👤</div>'}
      <div style="flex:1"><div class="pn" style="color:${esc(p.color || '#fff')}">${esc(p.name)}</div><div class="muted">${p.login ? `@${esc(p.login)} · <a href="${esc(p.url)}" target="_blank">twitch.tv/${esc(p.login)} ↗</a> <button style="padding:2px 9px;margin-left:4px" onclick="Profile.so()" title="Shout them out: a “go check them out” line in chat, plus Twitch’s own shout-out box when you're live">📣 Shout out</button><span id="profSo" class="muted" style="margin-left:6px"></span>` : 'No Twitch name linked'}${p.discord ? ` · Discord: <b>${esc(p.discord.name)}</b>` : ''}</div>
      <div class="muted" style="font-size:13px">${p.id && !p.slim ? `<span title="Picked in chat with !id">${p.id === 'm' ? '👨 man' : p.id === 'f' ? '👩 woman' : '🧑 non-binary'}</span> · ` : ''}${p.look && !p.slim ? `<span title="Made their own character in Discord with /character: ${Object.entries(p.look).map(([k, v]) => k + ' ' + v).join(', ')}">🎨 own character</span> · ` : ''}${p.discordName ? `<span title="The Discord name they typed in chat with !mydiscordname (not checked with Discord)">💬 Discord: <b>${esc(p.discordName)}</b></span> · ` : ''}${p.bday ? `<span title="They told chat their birthday (no year is ever kept)">🎂 ${esc(p.bday.day)}${p.bday.today ? ' <b>(today!)</b>' : ''}</span> · ` : ''}${p.mod ? '🛡️ mod · ' : ''}${p.vip ? '💎 VIP · ' : ''}${p.sub?.now ? '⭐ subscriber · ' : ''}${p.streak ? `🔥 ${p.streak}-stream watch streak` : ''}</div>
      <div style="font-size:13px;margin-top:2px${p.slim ? ';display:none' : ''}">${p.linked ? `🔗 Linked to Discord ${p.linkedAt > 0 ? 'on <b>' + new Date(p.linkedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) + '</b>' : p.linkedAt < 0 ? 'before ' + new Date(-p.linkedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : ''}` : `<span class="muted">🔗 Not linked to Discord${p.tracked ? '' : ': stats only count once they link their Twitch with <code>/linktwitch</code> in Discord'}</span>`}</div></div>
      <button onclick="Profile.close()">✕</button></div>`;
    const tabs = [['overview', '📋 Overview'], ...(p.acts ? [['stats', '📊 Stats']] : []), ...(p.slim ? [] : [['respins', '🎟️ Respins'], ['games', '🏆 Games']]), ['chat', '💬 Chat log']];
    const tb = `<div class="tabs">${tabs.map(([k, n]) => `<button class="${tab === k ? 'on' : ''}" onclick="Profile.tab('${k}')">${n}</button>`).join('')}</div>`;
    let body = '';
    const songBox = p.songs ? `<div style="margin:0 0 10px;padding:8px 10px;border:1px solid #ffffff22;border-radius:10px"><b>🎵 Songs in the queue</b>${p.songs.length ? p.songs.map(x => `<div style="margin-top:4px">${x.pos ? `<b>#${x.pos}</b>` : '<b>▶ playing now</b>'} ${esc(x.title)}</div>`).join('') : '<div class="muted" style="margin-top:4px">None right now.</div>'}</div>` : '';
    if (tab === 'overview') body = (p.slim ? '' : lookBox(p)) + songBox + `<div class="grid">
        <div class="st"><b>${dt(p.createdAt)}</b><small>Twitch account made${p.createdAt ? ` (${ago(Date.parse(p.createdAt))} ago)` : ''}</small></div>
        <div class="st"><b>${p.followedAt === null ? 'Not following' : p.followedAt ? dt(p.followedAt) : '—'}</b><small>Following since${p.followedAt ? ` (${ago(p.followedAt)})` : ''}</small></div>
        <div class="st"><b>${p.sub?.months ? `${p.sub.months} month${p.sub.months === 1 ? '' : 's'}` : p.sub?.now ? 'yes' : '—'}</b><small>Subscribed</small></div>
        <div class="st"><b>${p.streak ? `🔥 ${p.streak} stream${p.streak === 1 ? '' : 's'}` : '—'}</b><small>Watch streak (in a row: chatted or in the viewer list)${p.streams ? ` · ${p.streams} streams watched in all` : ''}${p.twitchStreak ? ` · Twitch says ${p.twitchStreak}` : ''}</small></div>
        ${p.bday ? `<div class="st"><b>🎂 ${esc(p.bday.day)}${p.bday.today ? ' 🎉' : ''}</b><small>Birthday${p.bday.today ? ' (today!)' : ''}</small></div>` : ''}
        <div class="st"><b>${hrs(W?.total)}</b><small>Watch time (this stream: ${hrs(W?.stream)})</small></div>
        ${p.slim ? '' : `<div class="st"><b>${S.now}</b><small>🎟️ respins right now</small></div>`}</div>
      ${p.lastStreams?.length ? `<h4>🔥 Your last ${p.lastStreams.length} streams</h4><div class="muted" style="display:flex;flex-wrap:wrap;gap:6px">${p.lastStreams.map(x => `<span title="${x.watched ? 'Watched (chatted or in the viewer list)' : 'Missed'}" style="padding:2px 8px;border-radius:8px;background:${x.watched ? '#7dffb022' : '#ff7a7a22'}">${x.watched ? '✅' : '❌'} ${new Date(x.start).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>`).join('')}</div><div class="muted" style="font-size:12px;margin-top:4px">Newest first. Missing one starts the streak over.</div>` : ''}
      <h4>💬 Chats</h4><div class="grid"><div class="st"><b>${C?.stream ?? 0}</b><small>this stream</small></div><div class="st"><b>${C?.month ?? 0}</b><small>this month</small></div><div class="st"><b>${C?.year ?? 0}</b><small>this year</small></div><div class="st"><b>${C?.total ?? 0}</b><small>all time${C?.first ? ` (since ${dt(C.first)})` : ''}</small></div></div>
      ${p.discord && !p.slim ? `<h4>🎬 Movies (Discord: ${esc(p.discord.name)})</h4>${movieLines(p.discord)}<div class="muted">${p.discord.watched} watched · picks used ${p.discord.picksUsed}/${p.discord.max}</div>` : ''}
      ${p.about ? `<h4>About</h4><div class="muted">${esc(p.about)}</div>` : ''}
      ${p.login ? `<h4>🛡️ Moderate</h4><div class="row"><button onclick="Profile.mod('timeout',60)">⏱ 1 min</button><button onclick="Profile.mod('timeout',600)">⏱ 10 min</button><button onclick="Profile.mod('timeout',3600)">⏱ 1 hour</button><button onclick="Profile.mod('timeout',0,true)">⏱ Custom…</button><button class="red" onclick="Profile.mod('ban')">🔨 Ban</button><button onclick="Profile.mod('unban')">↩️ Unban</button></div>` : ''}`;
    if (tab === 'stats' && p.acts) { const A = p.acts, when = t => new Date(t).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }), list = (rows, none, f) => rows.length ? `<div style="max-height:220px;overflow:auto">${rows.map(x => `<div class="line"><span class="muted">${esc(when(x.at))}</span> · ${f ? f(x) : esc(x.text)}</div>`).join('')}</div>` : `<div class="muted">${none}</div>`;
      body = `<div class="grid"><div class="st"><b>${A.songs.length}</b><small>🎵 songs asked for</small></div><div class="st"><b>${A.votes.length}</b><small>🍿 movie votes</small></div>${p.suggested ? `<div class="st"><b>${p.suggested.length}</b><small>🎬 movies suggested${p.suggested.some(x => x.rate) ? ` (${p.suggested.filter(x => x.rate).length} watched)` : ''}</small></div>` : ''}<div class="st"><b>${A.skips.length}</b><small>⏭ song skips</small></div><div class="st"><b>${A.commands.reduce((a, c) => a + c.n, 0)}</b><small>⌨️ commands typed</small></div></div><div class="muted" style="font-size:12px;margin-top:6px">Newest first. Counted from version 1.110 on.</div>
        <h4>🎵 Songs they asked for</h4>${list(A.songs, 'No songs yet.')}
        <h4>🍿 Movies they voted for</h4>${list(A.votes, 'No votes yet.')}
        ${p.suggested ? `<h4>🎬 Movies they suggested</h4>${p.suggested.length ? `<div style="max-height:220px;overflow:auto">${p.suggested.map(x => `<div class="line"><span class="muted">${esc(when(x.at))}</span> · <b>${esc(x.title)}</b>${x.year ? ` <span class="muted">(${esc(x.year)})</span>` : ''}${x.test ? ' <span class="muted">🧪</span>' : ''} ${x.rate ? `<span title="It was watched and rated" style="color:#ffd24b;font-weight:800">⭐ ${x.rate}/10</span>` : `<span class="muted">· ${x.where === 'list' ? 'on the watchlist' : x.where === 'waiting' ? 'waiting to be added' : 'taken off the list'}</span>`}</div>`).join('')}</div>` : '<div class="muted">No suggestions yet.</div>'}` : ''}
        <h4>⏭ Songs skipped</h4>${list(A.skips, 'No skips yet.', x => x.mine ? `their song was skipped: <b>${esc(x.text)}</b>` : `they skipped <b>${esc(x.text)}</b>`)}
        <h4>⌨️ Commands</h4>${A.commands.length ? `<div style="max-height:220px;overflow:auto">${A.commands.map(c => `<div class="line"><b>${esc(c.cmd)}</b> · ${c.n} time${c.n === 1 ? '' : 's'} <span class="muted">· last ${esc(when(c.last))}</span></div>`).join('')}</div>` : '<div class="muted">No commands yet.</div>'}`; }
    if (tab === 'respins') body = `<div class="grid"><div class="st"><b>${S.beforeStream}</b><small>had when the stream started</small></div><div class="st"><b>${S.usedStream}</b><small>used this stream</small></div><div class="st"><b>${S.now}</b><small>have right now</small></div><div class="st"><b>${S.gotTotal} / ${S.usedTotal}</b><small>ever given / ever used</small></div></div>
      <div class="row" style="margin-top:12px"><input id="profN" type="number" value="1" style="flex:none;width:80px;padding:6px;border-radius:8px;border:1px solid #3a2a5c;background:#0f0820;color:#fff"><input id="profWhy" placeholder="Why? (optional)" style="flex:1;padding:6px 10px;border-radius:8px;border:1px solid #3a2a5c;background:#0f0820;color:#fff"><button class="pri" onclick="Profile.spins(1)">➕ Give</button><button onclick="Profile.spins(-1)">➖ Take away</button></div>
      <h4>When they used them</h4>${S.used.length ? S.used.map(u => `<div class="line">${esc(new Date(u.at).toLocaleString())} · 🕳️ respun <b>${esc(u.text)}</b> <span class="muted">(${esc(u.wheel || '')})</span></div>`).join('') : '<div class="muted">Never used one yet.</div>'}
      <h4>Given</h4>${S.grants.length ? S.grants.map(g => `<div class="line">${esc(new Date(g.at).toLocaleString())} · ${g.amount > 0 ? '+' : ''}${g.amount} ${esc(g.reason || '')} <span class="muted">by ${esc(g.by || '')}</span></div>`).join('') : '<div class="muted">None yet.</div>'}`;
    if (tab === 'games') body = `${p.stats ? `<div class="grid"><div class="st"><b>${p.stats.battles}</b><small>battles</small></div><div class="st"><b>${p.stats.wins}</b><small>wins</small></div><div class="st"><b>${p.stats.p2} / ${p.stats.p3}</b><small>2nds / 3rds</small></div><div class="st"><b>${p.stats.top5} / ${p.stats.top10}</b><small>top 5 / top 10</small></div><div class="st"><b>${p.stats.luck}%</b><small>luck spent</small></div></div>` : '<div class="muted">No battle stats yet.</div>'}
      <h4>🏆 Wins</h4>${p.wins.length ? p.wins.map(h => `<div class="line">${esc(dt(h.at))} · <b>${esc(h.label)}</b>${h.sub ? ` (${esc(h.sub)})` : ''} <span class="muted">${esc(h.list || '')}</span></div>`).join('') : '<div class="muted">No wins yet.</div>'}`;
    if (tab === 'chat') body = p.log.length ? `<div style="font-size:14px">${p.log.map(m => window.ChatUI ? ChatUI.row(m) : `<div class="line">${esc(m.text)}</div>`).join('')}</div>` : '<div class="muted">Nothing they said is saved yet (chat is saved from version 1.12 on).</div>';
    dlg.innerHTML = head + tb + `<div class="pb">${body}</div>`; showIt();
    if (tab === 'overview') drawLook(p);
  }
  // 🎨 their own character (made in Discord with /character): a preview with their picture as the chest badge
  const PARTS = [['hair', '💇'], ['outfit', '👕'], ['makeup', '💄'], ['facialhair', '🧔'], ['body', '🧍'], ['skin', '✋'], ['haircolor', '🎨'], ['accessory', '🎩'], ['hairaccessory', '🎀']];
  function lookBox(p) {
    if (!p.look || !window.CHAR_PARTS) return '';
    const N = CHAR_PARTS.NAMES, L = CHAR_PARTS.norm(p.look);
    return `<h4 style="margin-top:4px">🎨 Their character <span class="muted" style="font-weight:400">(made in Discord with /character)</span></h4><div style="display:flex;gap:14px;align-items:center;flex-wrap:wrap;margin-bottom:10px">
      <canvas id="profLook" width="150" height="150" style="background:#1d1630;border-radius:12px;flex:none" title="Their own battle character"></canvas>
      <div class="muted" style="font-size:13px;line-height:1.6">${PARTS.map(([k, ic]) => `${ic} #${L[k]} ${esc(N[k][L[k] - 1] || '')}`).join('<br>')}</div></div>`;
  }
  // 🍀 their movies with each one's luck (own luck + 👀 watch luck), like !mymovies shows
  function movieLines(d) {
    if (!d.movies.length) return '<div class="muted">No movies in the pool right now.</div>';
    const pct = n => String(Math.round((Number(n) || 0) * 100) / 100), showLuck = d.luckOn || d.watchLuck > 0;
    const rows = d.movies.map(m => {
      const st = m.away ? ' <span class="muted">🛌 sitting out tonight</span>' : m.benched ? ' <span class="muted">💤 benched</span>' : m.paused ? ' <span class="muted">⏸ paused</span>' : '';
      const luck = showLuck ? ` <b class="profLuck" title="${m.watchLuck ? `${pct(m.ownLuck)}% own luck + ${pct(m.watchLuck)}% watch luck` : 'Luck on this movie'}" style="color:#7dffb0">🍀 ${pct(m.luck)}%</b>` : '';
      return `<div class="line">🎬 <b>${esc(m.label)}</b>${m.sub ? ` <span class="muted">(${esc(m.sub)})</span>` : ''}${luck}${st}</div>`;
    }).join('');
    const note = d.watchLuck > 0 ? `<div class="muted">👀 Includes +${pct(d.watchLuck)}% watch luck on each movie.</div>` : !d.luckOn ? '<div class="muted">🍀 Luck is turned off, so it isn\'t shown.</div>' : '';
    return rows + note;
  }
  function drawLook(p) {
    const c = document.getElementById('profLook'); if (!c || !window.CHAR_PARTS) return;
    const paint = img => { const g = c.getContext('2d'); g.clearRect(0, 0, c.width, c.height); const ini = String(p.name || '?').slice(0, 2).toUpperCase(); if (CHAR_PARTS.figureFit) CHAR_PARTS.figureFit(g, c.width * .06, c.height * .03, c.width * .88, c.height * .94, p.look, img, p.color || '#8a5cff', ini, c.width * .3); else CHAR_PARTS.draw(g, 75, 46, p.look, img, p.color || '#8a5cff', ini); }; // (🧍 the whole character, so the body type shows)
    paint(null);
    if (p.avatar) { const im = new Image(); im.onload = () => paint(im); im.src = p.avatar; }
  }
  async function post(url, body) { const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json()); if (r.error) alert('⚠️ ' + r.error); return r; }
  async function mod(action, seconds, ask) {
    if (ask) { const m = await ask('Time out for how many minutes?', '30'); if (!m) return; seconds = Math.max(1, Number(m) || 30) * 60; }
    if (action === 'ban' && !confirm(`Ban ${cur.name} from your chat?`)) return;
    const r = await post('/api/chat/mod', { action, login: cur.login, seconds }); if (!r.error) alert(action === 'unban' ? '↩️ Unbanned.' : action === 'ban' ? '🔨 Banned.' : '⏱ Timed out.');
  }
  async function so() { const el = document.getElementById('profSo'); if (el) el.textContent = '📣 …'; const r = await post('/api/shoutout', { name: cur.login, via: 'profile' }); if (el) el.textContent = r.error ? '⚠️ ' + r.error : r.twitch && r.twitch !== 'ok' ? '✅ Chat line sent. ' + r.twitch : r.twitch === 'ok' ? '✅ Shouted out (with Twitch’s shout-out box)' : '✅ Shouted out in chat'; }
  async function spins(sign) { const n = Math.abs(Number(document.getElementById('profN').value) || 1) * sign; const r = await post('/api/wheel/bank', { who: cur.login || cur.name, n, reason: document.getElementById('profWhy').value || (sign > 0 ? 'given' : 'taken away') }); if (!r.error) open(cur.login); }
  // double-click a name anywhere → their profile
  document.addEventListener('dblclick', async e => {
    if (e.target.closest('input,textarea,select,#profDlg')) return;
    const el = e.target.closest('[data-user],[data-discord]'); if (el && (el.dataset.user || el.dataset.discord)) return open(el.dataset.user || '', el.dataset.discord ? { discordId: el.dataset.discord } : {});
    const word = String(window.getSelection?.() || '').trim().replace(/^@/, '').replace(/[^\w]+$/, '');
    if (!word || word.length < 2 || word.length > 30) return;
    const r = await fetch('/api/viewer-lookup?name=' + encodeURIComponent(word)); if (!r.ok) return;
    const j = await r.json(); if (j.login || j.discordId) open(j.login, j);
  });
  return { open, close: () => dlg?.close(), tab: t => { tab = t; draw(); }, mod, spins, so };
})();

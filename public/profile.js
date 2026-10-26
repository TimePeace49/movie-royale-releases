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
    dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });
    return dlg;
  }
  async function open(login, extra = {}) {
    if (!login && !extra.discordId) return;
    ensure(); dlg.innerHTML = `<div class="pb">Loading ${esc(login)}…</div>`; if (!dlg.open) dlg.showModal();
    const q = extra.discordId ? '?discordId=' + encodeURIComponent(extra.discordId) : '';
    cur = await fetch('/api/viewer/' + encodeURIComponent(login || '_') + q).then(r => r.json()); tab = 'overview'; draw();
  }
  function draw() {
    const p = cur, S = p.spins, C = p.chats, W = p.watch;
    const head = `<div class="ph">${p.avatar ? `<img src="${esc(p.avatar)}">` : '<div style="width:72px;height:72px;border-radius:50%;background:#2a1c47;display:grid;place-items:center;font-size:30px">👤</div>'}
      <div style="flex:1"><div class="pn" style="color:${esc(p.color || '#fff')}">${esc(p.name)}</div><div class="muted">${p.login ? `@${esc(p.login)} · <a href="${esc(p.url)}" target="_blank">twitch.tv/${esc(p.login)} ↗</a>` : 'No Twitch name linked'}${p.discord ? ` · Discord: <b>${esc(p.discord.name)}</b>` : ''}</div>
      <div class="muted" style="font-size:13px">${p.mod ? '🛡️ mod · ' : ''}${p.vip ? '💎 VIP · ' : ''}${p.sub?.now ? '⭐ subscriber · ' : ''}${p.streak ? `🔥 ${p.streak}-stream watch streak` : ''}</div></div>
      <button onclick="Profile.close()">✕</button></div>`;
    const tabs = [['overview', '📋 Overview'], ['respins', '🎟️ Respins'], ['games', '🏆 Games'], ['chat', '💬 Chat log']];
    const tb = `<div class="tabs">${tabs.map(([k, n]) => `<button class="${tab === k ? 'on' : ''}" onclick="Profile.tab('${k}')">${n}</button>`).join('')}</div>`;
    let body = '';
    if (tab === 'overview') body = `<div class="grid">
        <div class="st"><b>${dt(p.createdAt)}</b><small>Twitch account made${p.createdAt ? ` (${ago(Date.parse(p.createdAt))} ago)` : ''}</small></div>
        <div class="st"><b>${p.followedAt === null ? 'Not following' : p.followedAt ? dt(p.followedAt) : '—'}</b><small>Following since${p.followedAt ? ` (${ago(p.followedAt)})` : ''}</small></div>
        <div class="st"><b>${p.sub?.months ? `${p.sub.months} month${p.sub.months === 1 ? '' : 's'}` : p.sub?.now ? 'yes' : '—'}</b><small>Subscribed</small></div>
        <div class="st"><b>${p.streak ? p.streak + ' streams' : '—'}</b><small>Watch streak</small></div>
        <div class="st"><b>${hrs(W?.total)}</b><small>Watch time (this stream: ${hrs(W?.stream)})</small></div>
        <div class="st"><b>${S.now}</b><small>🎟️ respins right now</small></div></div>
      <h4>💬 Chats</h4><div class="grid"><div class="st"><b>${C?.stream ?? 0}</b><small>this stream</small></div><div class="st"><b>${C?.month ?? 0}</b><small>this month</small></div><div class="st"><b>${C?.year ?? 0}</b><small>this year</small></div><div class="st"><b>${C?.total ?? 0}</b><small>all time${C?.first ? ` (since ${dt(C.first)})` : ''}</small></div></div>
      ${p.discord ? `<h4>🎬 Movies (Discord: ${esc(p.discord.name)})</h4><div class="muted">${p.discord.movies.length ? p.discord.movies.map(m => esc(m.label) + (m.sub ? ` (${esc(m.sub)})` : '')).join(' · ') : 'No movies in the pool right now.'} · ${p.discord.watched} watched · picks used ${p.discord.picksUsed}/${p.discord.max}</div>` : ''}
      ${p.about ? `<h4>About</h4><div class="muted">${esc(p.about)}</div>` : ''}
      ${p.login ? `<h4>🛡️ Moderate</h4><div class="row"><button onclick="Profile.mod('timeout',60)">⏱ 1 min</button><button onclick="Profile.mod('timeout',600)">⏱ 10 min</button><button onclick="Profile.mod('timeout',3600)">⏱ 1 hour</button><button onclick="Profile.mod('timeout',0,true)">⏱ Custom…</button><button class="red" onclick="Profile.mod('ban')">🔨 Ban</button><button onclick="Profile.mod('unban')">↩️ Unban</button></div>` : ''}`;
    if (tab === 'respins') body = `<div class="grid"><div class="st"><b>${S.beforeStream}</b><small>had when the stream started</small></div><div class="st"><b>${S.usedStream}</b><small>used this stream</small></div><div class="st"><b>${S.now}</b><small>have right now</small></div><div class="st"><b>${S.gotTotal} / ${S.usedTotal}</b><small>ever given / ever used</small></div></div>
      <div class="row" style="margin-top:12px"><input id="profN" type="number" value="1" style="flex:none;width:80px;padding:6px;border-radius:8px;border:1px solid #3a2a5c;background:#0f0820;color:#fff"><input id="profWhy" placeholder="Why? (optional)" style="flex:1;padding:6px 10px;border-radius:8px;border:1px solid #3a2a5c;background:#0f0820;color:#fff"><button class="pri" onclick="Profile.spins(1)">➕ Give</button><button onclick="Profile.spins(-1)">➖ Take away</button></div>
      <h4>When they used them</h4>${S.used.length ? S.used.map(u => `<div class="line">${esc(new Date(u.at).toLocaleString())} · 🕳️ respun <b>${esc(u.text)}</b> <span class="muted">(${esc(u.wheel || '')})</span></div>`).join('') : '<div class="muted">Never used one yet.</div>'}
      <h4>Given</h4>${S.grants.length ? S.grants.map(g => `<div class="line">${esc(new Date(g.at).toLocaleString())} · ${g.amount > 0 ? '+' : ''}${g.amount} ${esc(g.reason || '')} <span class="muted">by ${esc(g.by || '')}</span></div>`).join('') : '<div class="muted">None yet.</div>'}`;
    if (tab === 'games') body = `${p.stats ? `<div class="grid"><div class="st"><b>${p.stats.battles}</b><small>battles</small></div><div class="st"><b>${p.stats.wins}</b><small>wins</small></div><div class="st"><b>${p.stats.p2} / ${p.stats.p3}</b><small>2nds / 3rds</small></div><div class="st"><b>${p.stats.top5} / ${p.stats.top10}</b><small>top 5 / top 10</small></div><div class="st"><b>${p.stats.luck}%</b><small>luck spent</small></div></div>` : '<div class="muted">No battle stats yet.</div>'}
      <h4>🏆 Wins</h4>${p.wins.length ? p.wins.map(h => `<div class="line">${esc(dt(h.at))} · <b>${esc(h.label)}</b>${h.sub ? ` (${esc(h.sub)})` : ''} <span class="muted">${esc(h.list || '')}</span></div>`).join('') : '<div class="muted">No wins yet.</div>'}`;
    if (tab === 'chat') body = p.log.length ? `<div style="font-size:14px">${p.log.map(m => window.ChatUI ? ChatUI.row(m) : `<div class="line">${esc(m.text)}</div>`).join('')}</div>` : '<div class="muted">Nothing they said is saved yet (chat is saved from version 1.12 on).</div>';
    dlg.innerHTML = head + tb + `<div class="pb">${body}</div>`;
  }
  async function post(url, body) { const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json()); if (r.error) alert('⚠️ ' + r.error); return r; }
  async function mod(action, seconds, ask) {
    if (ask) { const m = await ask('Time out for how many minutes?', '30'); if (!m) return; seconds = Math.max(1, Number(m) || 30) * 60; }
    if (action === 'ban' && !confirm(`Ban ${cur.name} from your chat?`)) return;
    const r = await post('/api/chat/mod', { action, login: cur.login, seconds }); if (!r.error) alert(action === 'unban' ? '↩️ Unbanned.' : action === 'ban' ? '🔨 Banned.' : '⏱ Timed out.');
  }
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
  return { open, close: () => dlg?.close(), tab: t => { tab = t; draw(); }, mod, spins };
})();

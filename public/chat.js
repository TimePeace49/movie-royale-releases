// 💬 Twitch chat drawing (badges, colors, Twitch + 7TV / BTTV / FFZ emotes). Used by the Chat tab, the pop-out chat and the battle claim pop-up.
window.ChatUI = (() => {
  let A = { badges: {}, emotes: {} };
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const PAL = ['#ff7a7a', '#7ad0ff', '#9dff8a', '#ffd36b', '#d59bff', '#ff9ad5', '#6bffd3', '#ffb36b'];
  const colorFor = m => m.color || PAL[[...String(m.login || '')].reduce((a, c) => a + c.charCodeAt(0), 0) % PAL.length];
  async function load() { try { const r = await fetch('/api/chat/recent?n=1').then(r => r.json()); A = { badges: r.badges || {}, emotes: r.emotes || {} }; } catch {} return A; }
  function setAssets(a) { A = { badges: a.badges || A.badges, emotes: a.emotes || A.emotes }; }
  const img = (src, alt, cls = 'emote') => `<img class="${cls}" src="${esc(src)}" alt="${esc(alt)}" title="${esc(alt)}" loading="lazy">`;
  function words(t) { return t.split(/(\s+)/).map(w => A.emotes[w] ? img(A.emotes[w], w) : esc(w)).join(''); }
  function text(t, emotes) { // Twitch emotes come as "id:start-end,start-end/id2:…" (by character)
    const chars = Array.from(String(t || '')); const at = [];
    for (const part of String(emotes || '').split('/').filter(Boolean)) { const [id, pos] = part.split(':'); for (const p of (pos || '').split(',')) { const [a, b] = p.split('-').map(Number); if (b >= a) at.push({ id, a, b }); } }
    at.sort((x, y) => x.a - y.a);
    let out = '', i = 0;
    for (const e of at) { if (e.a < i) continue; out += words(chars.slice(i, e.a).join('')); const name = chars.slice(e.a, e.b + 1).join(''); out += img(`https://static-cdn.jtvnw.net/emoticons/v2/${e.id}/default/dark/1.0`, name); i = e.b + 1; }
    return out + words(chars.slice(i).join(''));
  }
  function badges(list) { return String(list || '').split(',').filter(Boolean).map(b => A.badges[b] ? img(A.badges[b], b.split('/')[0], 'badge') : '').join(''); }
  function row(m, opts = {}) {
    const t = new Date(m.at || Date.now()).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    return `<div class="cm${m.gone ? ' gone' : ''}" data-id="${esc(m.id || '')}" data-login="${esc(m.login || '')}">${opts.time !== false ? `<span class="ct">${t}</span>` : ''}${badges(m.badges)}<b class="cn" data-user="${esc(m.login || '')}" style="color:${esc(colorFor(m))}">${esc(m.name || m.login)}</b><span class="cx">: ${text(m.text, m.emotes)}</span>${m.gone ? `<i class="cg"> (${esc(m.gone)})</i>` : ''}${opts.tools ? `<span class="ctools"><button title="Profile" onclick="Profile.open('${esc(m.login)}')">👤</button><button title="Delete message" onclick="ChatUI.mod('delete','${esc(m.login)}','${esc(m.id || '')}')">🗑</button><button title="Timeout 10 minutes" onclick="ChatUI.mod('timeout','${esc(m.login)}')">⏱</button><button title="Ban" onclick="ChatUI.mod('ban','${esc(m.login)}')">🔨</button></span>` : ''}</div>`;
  }
  const ICON = { sub: '⭐', gift: '🎁', bits: '💎', raid: '🚀', follow: '💜', redeem: '🎟️', streak: '🔥', tip: '💵', announce: '📣' };
  function alertRow(a) { return `<div class="ca ca-${esc(a.kind)}"><span class="ct">${new Date(a.at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span> ${ICON[a.kind] || '🔔'} <b data-user="${esc(a.login || '')}">${esc(a.name || '')}</b> ${text(a.text || '')}</div>`; }
  async function mod(action, login, id) {
    let seconds = 600, reason = '';
    if (action === 'timeout') { const s = prompt(`Time out ${login} for how many minutes?`, '10'); if (s === null) return; seconds = Math.max(1, Number(s) || 10) * 60; reason = prompt('Reason (optional)', '') || ''; }
    if (action === 'ban' && !confirm(`Ban ${login} from your chat?`)) return;
    if (action === 'ban') reason = prompt('Reason (optional)', '') || '';
    const r = await fetch('/api/chat/mod', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, login, id, seconds, reason }) }).then(r => r.json());
    if (r.error) alert('⚠️ ' + r.error);
  }
  const CSS = `.cm{padding:3px 6px;border-radius:6px;line-height:1.5;word-wrap:break-word;position:relative}.cm:hover{background:#ffffff0d}.cm.gone{opacity:.45}.cm.gone .cx{text-decoration:line-through}
    .ct{color:#8f86a8;font-size:11px;margin-right:6px}.cn{cursor:pointer}.emote{height:26px;vertical-align:middle;margin:-4px 1px}.badge{height:16px;vertical-align:-2px;margin-right:3px}
    .ctools{display:none;position:absolute;right:4px;top:1px;background:#1b1230;border-radius:8px;padding:1px 3px}.cm:hover .ctools{display:inline-flex;gap:2px}.ctools button{background:none;border:0;cursor:pointer;font-size:14px;padding:2px 4px;color:#fff}
    .ca{padding:6px 8px;margin:3px 0;border-radius:8px;background:#ffffff0a;border-left:3px solid #9b4dff;font-size:14px}.ca-sub,.ca-gift{border-color:#ffc94a}.ca-bits{border-color:#4fc3ff}.ca-raid{border-color:#ff6a3d}.ca-tip{border-color:#5ce1a7}.ca-follow{border-color:#d59bff}`;
  return { load, setAssets, row, alertRow, text, mod, CSS, colorFor, esc };
})();

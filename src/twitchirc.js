// 💬 Read a Twitch chat anonymously (no sign-in needed): chat messages, plus subs / resubs / gift subs / watch streaks.
// Used by the backup bot server to keep chat stats while Movie Royal is closed. (Movie Royal itself reads chat in twitch.js.)
import WebSocket from 'ws';

const tagsOf = s => Object.fromEntries(String(s || '').split(';').filter(Boolean).map(kv => { const i = kv.indexOf('='); return [kv.slice(0, i), kv.slice(i + 1)]; }));
const dn = s => String(s || '').replace(/\\s/g, ' ');

/** Parse one IRC line into { chat } or { alert } (or null). Same fields as Movie Royal's own chat reader. */
export function parseLine(line) {
  const un = line.match(/^@(\S+) :tmi\.twitch\.tv USERNOTICE #\S+(?: :(.*))?$/);
  if (un) {
    const tg = tagsOf(un[1]), id = tg['msg-id'], plan = tg['msg-param-sub-plan'] || '1000', at = Number(tg['tmi-sent-ts']) || Date.now();
    const tier = plan === '3000' ? 3 : plan === '2000' ? 2 : 1, name = dn(tg['display-name']) || tg.login, months = Number(tg['msg-param-cumulative-months']) || 0;
    if (id === 'sub' || id === 'resub') return { alert: { kind: 'sub', login: tg.login, name, amount: months, months, at, text: `${id === 'resub' ? 'resubscribed' : 'subscribed'}${tier > 1 ? ` (tier ${tier})` : plan === 'Prime' ? ' with Prime' : ''}${months > 1 ? ` · ${months} months` : ''}${un[2] ? ': ' + un[2] : ''}` } };
    if (id === 'submysterygift') return { alert: { kind: 'gift', login: tg.login, name, amount: Number(tg['msg-param-mass-gift-count']) || 1, at, text: `gifted ${tg['msg-param-mass-gift-count'] || 1} subs!` } };
    if (id === 'subgift' && !tg['msg-param-origin-id']) return { alert: { kind: 'gift', login: tg.login, name, amount: 1, at, text: `gifted a sub to ${dn(tg['msg-param-recipient-display-name'])}` } };
    if (id === 'viewermilestone' && tg['msg-param-category'] === 'watch-streak') return { alert: { kind: 'streak', login: tg.login, name, amount: Number(tg['msg-param-value']) || 0, at, text: `is on a ${tg['msg-param-value']}-stream watch streak!${un[2] ? ' ' + un[2] : ''}` } };
    return null;
  }
  const m = line.match(/^(?:@(\S+) )?:(\w+)!\S+ PRIVMSG #\S+ :(.*)$/);
  if (!m) return null;
  const tags = tagsOf(m[1]);
  const badges = Object.fromEntries(String(tags.badges || '').split(',').filter(Boolean).map(b => b.split('/')));
  const info = Object.fromEntries(String(tags['badge-info'] || '').split(',').filter(Boolean).map(b => b.split('/')));
  const subV = Number(badges.subscriber || badges.founder || 0);
  return { chat: { login: m[2], name: tags['display-name'] || m[2], text: m[3].trim(), userId: tags['user-id'] || null, id: tags.id || null, color: tags.color || null, emotes: tags.emotes || '', badgeList: tags.badges || '', at: Number(tags['tmi-sent-ts']) || Date.now(),
    badges: { sub: 'subscriber' in badges || 'founder' in badges, tier: subV >= 3000 ? 3 : subV >= 2000 ? 2 : ('subscriber' in badges || 'founder' in badges) ? 1 : 0, months: Number(info.subscriber || info.founder || 0), vip: 'vip' in badges, mod: 'moderator' in badges, broadcaster: 'broadcaster' in badges } } };
}

/** Stay connected to one channel's chat (reconnects by itself). Returns { close(), status }. */
export function watchChat(channel, onEvent) {
  channel = String(channel || '').toLowerCase().replace(/^#/, '');
  const status = { channel, state: 'connecting', since: null, present: new Set() }; // present = the viewer list (people with chat open), from Twitch's join / leave notes
  let ws = null, stopped = false, retry = 3000;
  const connect = () => {
    if (stopped) return;
    ws = new WebSocket('wss://irc-ws.chat.twitch.tv:443');
    ws.on('open', () => {
      ws.send('CAP REQ :twitch.tv/tags twitch.tv/commands twitch.tv/membership'); ws.send('PASS SCHMOOPIIE');
      ws.send('NICK justinfan' + Math.floor(10000 + Math.random() * 80000)); ws.send('JOIN #' + channel);
      status.state = 'reading'; status.since = Date.now(); retry = 3000; status.present = new Set();
    });
    ws.on('message', raw => {
      for (const line of String(raw).split('\r\n')) {
        if (!line) continue;
        if (line.startsWith('PING')) { ws.send('PONG :tmi.twitch.tv'); continue; }
        const nm = line.match(/^:\S+ 353 \S+ [=*@] #\S+ :(.*)$/); // the viewer list when we join
        if (nm) { for (const l of nm[1].split(' ').filter(Boolean)) status.present.add(l.toLowerCase()); continue; }
        const jp = line.match(/^:(\w+)!\S+ (JOIN|PART) #/); // someone opened / closed chat (Twitch sends these in batches)
        if (jp) { const l = jp[1].toLowerCase(); if (!/^justinfan\d+$/.test(l)) { if (jp[2] === 'JOIN') { status.present.add(l); try { onEvent({ join: l }); } catch {} } else status.present.delete(l); } continue; }
        const ev = parseLine(line); if (ev) { try { onEvent(ev); } catch {} }
      }
    });
    ws.on('close', () => { if (stopped) return; status.state = 'reconnecting'; setTimeout(connect, retry); retry = Math.min(retry * 2, 60000); });
    ws.on('error', () => {});
  };
  connect();
  return { status, close() { stopped = true; try { ws?.close(); } catch {} status.state = 'off'; } };
}

/** Is the channel live right now? Uses Twitch's public live preview picture (no sign-in): offline channels get Twitch's "404" picture. */
export async function isLive(channel) {
  try {
    const r = await fetch(`https://static-cdn.jtvnw.net/previews-ttv/live_user_${encodeURIComponent(String(channel).toLowerCase())}-80x45.jpg`, { redirect: 'manual', signal: AbortSignal.timeout(10000) });
    if (r.status >= 300 && r.status < 400) return !/404_preview/.test(r.headers.get('location') || '');
    return r.ok ? !/404_preview/.test(r.url || '') : null;
  } catch { return null; } // couldn't tell
}

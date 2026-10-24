// Twitch: login (OAuth), channel point + bits events (EventSub), chat reader for !join, profile pictures.
import WebSocket from 'ws';
import { db, save } from './store.js';

export const SCOPES = ['channel:manage:redemptions', 'channel:read:redemptions', 'bits:read', 'user:write:chat'];
export const status = { state: 'off', error: null, login: null, chat: 'off' };

let handlers = { redeem: () => {}, cheer: () => {}, chat: () => {}, change: () => {}, live: () => {} };
let es = null, esAlive = false, chat = null, appToken = null, stopped = false;
const userCache = new Map();

const s = () => db.settings;
export const redirectUri = port => `http://localhost:${port}/twitch/callback`;

export function authUrl(port, state) {
  return `https://id.twitch.tv/oauth2/authorize?client_id=${encodeURIComponent(s().twitchClientId)}&redirect_uri=${encodeURIComponent(redirectUri(port))}&response_type=code&scope=${encodeURIComponent(SCOPES.join(' '))}&state=${encodeURIComponent(state)}`;
}

async function tokenRequest(params) {
  const res = await fetch('https://id.twitch.tv/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: s().twitchClientId, client_secret: s().twitchClientSecret, ...params })
  });
  const j = await res.json();
  if (!res.ok) throw new Error(j.message || 'Twitch token error');
  return j;
}

/** Sign-in: swap the code for tokens and find out who signed in. Does NOT store anything. */
export async function signIn(code, port) {
  const j = await tokenRequest({ code, grant_type: 'authorization_code', redirect_uri: redirectUri(port) });
  const v = await fetch('https://id.twitch.tv/oauth2/validate', { headers: { Authorization: `OAuth ${j.access_token}` } }).then(r => r.json());
  if (!v.user_id) throw new Error('Could not verify your Twitch account');
  let name = v.login, avatar = null;
  try {
    const u = await fetch(`https://api.twitch.tv/helix/users?id=${v.user_id}`, { headers: { 'Client-Id': s().twitchClientId, Authorization: `Bearer ${j.access_token}` } }).then(r => r.json());
    if (u.data?.[0]) { name = u.data[0].display_name; avatar = u.data[0].profile_image_url; }
  } catch {}
  return { user: { id: v.user_id, login: v.login, name, avatar }, tokens: { access: j.access_token, refresh: j.refresh_token } };
}
export function useTokens(tokens) { db.twitchToken = tokens; save(); }

async function refresh() {
  if (!db.twitchToken?.refresh) throw new Error('Not logged in to Twitch');
  const j = await tokenRequest({ grant_type: 'refresh_token', refresh_token: db.twitchToken.refresh });
  db.twitchToken = { access: j.access_token, refresh: j.refresh_token || db.twitchToken.refresh };
  save();
}

async function validate() {
  const res = await fetch('https://id.twitch.tv/oauth2/validate', { headers: { Authorization: `OAuth ${db.twitchToken.access}` } });
  if (res.status === 401) { await refresh(); return validate(); }
  if (!res.ok) throw new Error('Twitch validate failed');
  return res.json(); // { login, user_id, scopes }
}

async function getAppToken() {
  if (appToken && appToken.exp > Date.now()) return appToken.token;
  const j = await tokenRequest({ grant_type: 'client_credentials' });
  appToken = { token: j.access_token, exp: Date.now() + (j.expires_in - 60) * 1000 };
  return appToken.token;
}

async function helix(pathQ, opts = {}, retry = true) {
  const token = db.twitchToken?.access || await getAppToken();
  const res = await fetch('https://api.twitch.tv/helix/' + pathQ, {
    ...opts,
    headers: { 'Client-Id': s().twitchClientId, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(opts.headers || {}) }
  });
  if (res.status === 401 && retry && db.twitchToken) { await refresh(); return helix(pathQ, opts, false); }
  const j = res.status === 204 ? {} : await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j.message || `Twitch API ${res.status}`);
  return j;
}

/** logins -> Map(login -> {login, name, avatar}) */
export async function getUsers(logins) {
  const out = new Map();
  const need = [...new Set(logins.map(l => String(l).toLowerCase()))].filter(l => {
    if (userCache.has(l)) { out.set(l, userCache.get(l)); return false; } return /^[a-z0-9_]{2,25}$/.test(l);
  });
  if (!need.length || !s().twitchClientId || !s().twitchClientSecret) return out;
  for (let i = 0; i < need.length; i += 100) {
    try {
      const j = await helix('users?' + need.slice(i, i + 100).map(l => 'login=' + encodeURIComponent(l)).join('&'));
      for (const u of j.data || []) {
        const v = { login: u.login, name: u.display_name, avatar: u.profile_image_url };
        userCache.set(u.login, v); out.set(u.login, v);
      }
    } catch (e) { console.error('[twitch] users', e.message); }
  }
  return out;
}

export async function start(h) {
  handlers = { ...handlers, ...h };
  stop(); stopped = false;
  startChat();
  if (!s().twitchClientId || !s().twitchClientSecret) { status.state = 'not set up'; return handlers.change(); }
  if (!db.twitchToken) { status.state = 'not logged in'; return handlers.change(); }
  try {
    const v = await validate();
    status.login = v.login; status.userId = v.user_id; status.scopes = v.scopes || [];
    status.canChat = status.scopes.includes('user:write:chat');
    checkLive();
    if (!s().twitchChannel) { s().twitchChannel = v.login; save(); startChat(); }
    status.state = 'connecting';
    connectEventSub('wss://eventsub.wss.twitch.tv/ws', true);
  } catch (e) { status.state = 'error'; status.error = e.message; }
  handlers.change();
}

export function stop() {
  stopped = true;
  try { es?.close(); } catch {} es = null;
  try { chat?.close(); } catch {} chat = null;
  status.state = 'off'; status.chat = 'off';
}

function connectEventSub(url, subscribe) {
  const ws = new WebSocket(url);
  let keepalive;
  const kick = secs => { clearTimeout(keepalive); keepalive = setTimeout(() => ws.terminate(), (secs + 10) * 1000); };
  ws.on('message', async raw => {
    let m; try { m = JSON.parse(raw); } catch { return; }
    const type = m.metadata?.message_type;
    if (type === 'session_welcome') {
      kick(m.payload.session.keepalive_timeout_seconds || 10);
      const old = es; es = ws;
      if (old && old !== ws) old.close();
      if (subscribe) {
        const sid = m.payload.session.id;
        const cond = { broadcaster_user_id: status.userId };
        const subs = [['channel.channel_points_custom_reward_redemption.add', '1'], ['channel.cheer', '1'], ['stream.online', '1'], ['stream.offline', '1']];
        const errs = [];
        for (const [t, v] of subs) {
          try { await helix('eventsub/subscriptions', { method: 'POST', body: JSON.stringify({ type: t, version: v, condition: cond, transport: { method: 'websocket', session_id: sid } }) }); }
          catch (e) { errs.push(`${t}: ${e.message}`); }
        }
        status.error = errs.join(' | ') || null;
      }
      status.state = 'online'; esAlive = true; handlers.change();
    } else if (type === 'session_keepalive') kick(10);
    else if (type === 'session_reconnect') connectEventSub(m.payload.session.reconnect_url, false);
    else if (type === 'notification') {
      kick(10);
      const t = m.metadata.subscription_type, e = m.payload.event;
      if (t === 'channel.channel_points_custom_reward_redemption.add')
        handlers.redeem({ title: e.reward.title, login: e.user_login, name: e.user_name, input: e.user_input });
      else if (t === 'stream.online') handlers.live(true);
      else if (t === 'stream.offline') handlers.live(false);
      else if (t === 'channel.cheer')
        handlers.cheer({ bits: e.bits, login: e.is_anonymous ? null : e.user_login, name: e.is_anonymous ? 'Anonymous' : e.user_name });
    }
  });
  ws.on('close', () => {
    clearTimeout(keepalive);
    if (ws !== es || stopped) return;
    esAlive = false; status.state = 'reconnecting'; handlers.change();
    setTimeout(() => !stopped && connectEventSub('wss://eventsub.wss.twitch.tv/ws', true), 3000);
  });
  ws.on('error', e => console.error('[twitch eventsub]', e.message));
}

// Anonymous, read-only chat connection (no login needed) used for "!join" lists.
function startChat() {
  try { chat?.close(); } catch {}
  const channel = (s().twitchChannel || '').toLowerCase().replace(/^#/, '');
  if (!channel) { status.chat = 'no channel set'; return; }
  const ws = new WebSocket('wss://irc-ws.chat.twitch.tv:443');
  chat = ws;
  ws.on('open', () => {
    ws.send('CAP REQ :twitch.tv/tags');
    ws.send('PASS SCHMOOPIIE');
    ws.send('NICK justinfan' + Math.floor(10000 + Math.random() * 80000));
    ws.send('JOIN #' + channel);
    status.chat = 'reading #' + channel; handlers.change();
  });
  ws.on('message', raw => {
    for (const line of String(raw).split('\r\n')) {
      if (!line) continue;
      if (line.startsWith('PING')) { ws.send('PONG :tmi.twitch.tv'); continue; }
      const m = line.match(/^(?:@(\S+) )?:(\w+)!\S+ PRIVMSG #\S+ :(.*)$/);
      if (!m) continue;
      const tags = Object.fromEntries((m[1] || '').split(';').map(kv => kv.split('=')));
      handlers.chat({ login: m[2], name: tags['display-name'] || m[2], text: m[3].trim() });
    }
  });
  ws.on('close', () => { if (ws === chat && !stopped) { status.chat = 'reconnecting'; setTimeout(startChat, 3000); } });
  ws.on('error', () => {});
}

/** Creates the channel point rewards listed in settings (skips ones that already exist). */
export async function createRewards() {
  if (!status.userId) throw new Error('Log in to Twitch first');
  const existing = await helix(`channel_points/custom_rewards?broadcaster_id=${status.userId}`);
  const have = new Set((existing.data || []).map(r => r.title.toLowerCase()));
  const costs = { comet: 500, collapse: 750, earthquake: 1000, meteors: 1500, wind: 750, ice: 750, tornado: 2000, shockwave: 1500, lightning: 1000, boulder: 1500, swap: 2500, lowgrav: 750, random: 300 };
  const made = [];
  for (const [title, ev] of Object.entries(s().rewards)) {
    if (have.has(title.toLowerCase())) continue;
    await helix(`channel_points/custom_rewards?broadcaster_id=${status.userId}`, {
      method: 'POST',
      body: JSON.stringify({ title: title.slice(0, 45), cost: costs[ev] || 1000, prompt: 'Movie Royale chaos! Hits the whole cliff, nobody is safe.', is_enabled: true, background_color: '#F5A623' })
    });
    made.push(title);
  }
  return made;
}

/** Are you live right now? (asked at startup; after that Twitch tells us the moment you go live / end) */
async function checkLive() {
  try { const j = await helix(`streams?user_id=${status.userId}`); handlers.live(!!j.data?.length); } catch {}
}

/** Say something in your chat as you (needs the "send chat" permission from signing in). */
export async function say(message) {
  if (!status.userId) throw new Error('Sign in with Twitch first');
  if (!status.canChat) throw new Error('Sign in with Twitch again so Movie Royale can reply in chat (new permission)');
  const j = await helix('chat/messages', { method: 'POST', body: JSON.stringify({ broadcaster_id: status.userId, sender_id: status.userId, message: String(message).slice(0, 490) }) });
  const r = j.data?.[0];
  if (r && r.is_sent === false) throw new Error(r.drop_reason?.message || 'Twitch dropped the message');
  return true;
}

/** Channel point rewards Movie Royale made (the only ones Twitch lets us edit). */
export async function listRewards() {
  if (!status.userId) throw new Error('Sign in with Twitch first');
  const j = await helix(`channel_points/custom_rewards?broadcaster_id=${status.userId}&only_manageable_rewards=true`);
  return (j.data || []).map(r => ({ id: r.id, title: r.title, cost: r.cost, enabled: r.is_enabled, paused: r.is_paused, color: r.background_color, cooldown: r.global_cooldown_setting?.is_enabled ? r.global_cooldown_setting.global_cooldown_seconds : 0 }));
}
export async function updateReward(id, { title, cost, enabled, cooldown, paused }) {
  const body = {};
  if (paused != null) body.is_paused = !!paused;
  if (title != null) body.title = String(title).slice(0, 45);
  if (cost != null) body.cost = Math.max(1, Math.round(Number(cost)));
  if (enabled != null) body.is_enabled = !!enabled;
  if (cooldown != null) { const c = Math.max(0, Math.round(Number(cooldown))); body.is_global_cooldown_enabled = c > 0; if (c > 0) body.global_cooldown_seconds = c; }
  const j = await helix(`channel_points/custom_rewards?broadcaster_id=${status.userId}&id=${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(body) });
  return j.data?.[0];
}
export async function deleteReward(id) {
  await helix(`channel_points/custom_rewards?broadcaster_id=${status.userId}&id=${encodeURIComponent(id)}`, { method: 'DELETE' });
}

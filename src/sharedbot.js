// 🤖🤝 (1.151.0, Derek: "if I make a Twitch bot can it be used by everyone that uses the app" → yes)
// One Twitch bot account, signed in once by the app's maker and kept on HIS 24/7 bot (never in the app). Every other copy of
// the app can ask to use it: the maker allows the channel, and from then on what Movie Royal says in chat is passed to his
// 24/7 bot, which says it as the bot account. If anything fails the app talks as the streamer, like before.
import crypto from 'crypto';
import { db, save } from './store.js';
import * as shared from './shared.js';

const H = { channel: () => '', edition: () => '', app: () => '', ownBot: () => false, kick: () => '', ownKickBot: () => false };
export const setHooks = h => Object.assign(H, h);
const data = () => (db.sharedBot ||= {});
const id = () => { if (!/^[a-f0-9]{32}$/.test(String(db.installId || ''))) { db.installId = crypto.randomBytes(16).toString('hex'); save(); } return db.installId; };
const key = () => { const d = data(); if (!/^[a-f0-9]{48}$/.test(String(d.key || ''))) { d.key = crypto.randomBytes(24).toString('hex'); save(); } return d.key; };
const okUrl = u => /^https:\/\/[a-z0-9.-]+(:\d+)?\/sharedbot$/i.test(u) || /^http:\/\/(127\.0\.0\.1|localhost):\d+\/sharedbot$/i.test(u);
/** the shared bot's address on the app maker's 24/7 bot ('' = nobody shares one) */
export const url = () => { const u = String(process.env.SHAREDBOT_URL || shared.get().bot || '').trim(); return okUrl(u) ? u : ''; };
async function call(pathQ, body, method = body ? 'POST' : 'GET') {
  const base = url(); if (!base) throw new Error('No shared chat bot is set up yet.');
  const r = await fetch(base + pathQ, { method, headers: body ? { 'content-type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(12000) });
  const j = await r.json().catch(() => ({})); if (r.status === 404 && !j.error) throw new Error('The shared chat bot isn\'t there yet (its 24/7 bot needs an update).');
  if (!r.ok) throw new Error(j.error || 'the shared bot answered ' + r.status); return j;
}
const take = j => { const d = data(); d.state = j.state || 'none'; d.bot = j.bot || (j.kbot != null ? '' : d.bot) || ''; d.kbot = j.kbot || ''; d.kick = j.kick || ''; d.kickOk = !!j.kickOk; d.twitchOk = j.twitchOk == null ? d.state === 'allowed' : !!j.twitchOk; d.channel = j.channel || d.channel || ''; d.at = Date.now(); d.error = j.botError || ''; save(); return info(); };
/** using it right now: asked for, allowed, and no bot account of your own is signed in */
export const use = () => { const d = data(); return !!d.want && d.state === 'allowed' && d.twitchOk !== false && !!d.bot && !!url() && !H.ownBot(); };
/** 🟢 (1.152.0) the same on Kick: allowed for your Kick channel and no Kick bot account of your own */
export const useKick = () => { const d = data(); return !!d.want && d.state === 'allowed' && !!d.kickOk && !!d.kbot && !!url() && !H.ownKickBot(); };
export const botLogin = () => (data().want ? String(data().bot || '').toLowerCase() : '');
export const info = () => { const d = data(); return { can: !!url(), want: !!d.want, state: d.want ? d.state || 'none' : 'off', bot: d.bot || '', channel: d.channel || '', error: d.error || '', sayError: d.sayError || '', ownBot: !!H.ownBot(), using: use(), kbot: d.kbot || '', kick: d.kick || '', kickOk: !!d.kickOk, kickMine: String(H.kick() || '').toLowerCase(), usingKick: useKick(), kickSayError: d.kickSayError || '', said: d.said || 0, at: d.at || 0 }; };
/** ask to use the shared bot in your channel (the app's maker has to allow it) */
export async function join() {
  const channel = String(H.channel() || '').toLowerCase(), kslug = String(H.kick() || '').toLowerCase(); if (!channel && !kslug) throw new Error('Sign in with Twitch first, so the bot knows which channel is yours.');
  const j = await call('/join', { id: id(), key: key(), channel, kick: kslug, edition: H.edition(), app: H.app() }); data().want = true; return take(j);
}
export async function check() { const d = data(); if (!d.want || !url()) return info(); try { return take(await call(`/me?id=${id()}&key=${key()}`)); } catch (e) { d.error = e.message; return info(); } }
export function leave() { const d = data(); d.want = false; save(); return info(); }
/** say it as the shared bot; throws when it couldn't (the caller then talks as the streamer) */
export async function say(text) {
  const d = data();
  try { const j = await call('/say', { id: id(), key: key(), text: String(text).slice(0, 490) }); d.said = (d.said || 0) + 1; if (d.sayError) { d.sayError = ''; save(); } return j.id || true; }
  catch (e) { if (/not allowed|pending|which app/i.test(e.message)) { d.state = 'pending'; save(); } d.sayError = e.message; throw e; }
}
export async function sayKick(text) { const d = data(); try { const j = await call('/say', { id: id(), key: key(), to: 'kick', text: String(text).slice(0, 490) }); d.said = (d.said || 0) + 1; if (d.kickSayError) { d.kickSayError = ''; save(); } return j.id || true; } catch (e) { d.kickSayError = e.message; throw e; } }
/** signed in to Kick after asking? the request is sent again with the Kick channel (it then waits for a new yes) */
export const kickChanged = () => { const d = data(), mine = String(H.kick() || '').toLowerCase(); return !!d.want && !!mine && mine !== (d.kick || ''); };
setInterval(() => { const d = data(); if (d.want && d.state !== 'allowed') check().catch(() => {}); }, 60000).unref?.(); /* (waiting to be allowed: look once a minute) */
setInterval(() => { if (data().want) check().catch(() => {}); }, 30 * 60000).unref?.();

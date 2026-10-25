// 💵 Donations: listens to StreamElements and/or Streamlabs so tips show up in Movie Royal (the 🎡 wheel pop-up).
// StreamElements: your JWT token (StreamElements → Account → Channels → Show secrets).
// Streamlabs: your Socket API token (Streamlabs → Settings → API settings → API tokens).
import io from 'socket.io-client';
import { db } from './store.js';

export const status = { se: 'off', sl: 'off', last: null };
let se = null, sl = null, onTip = () => {}, onChange = () => {};
const seen = new Set(); // the same tip can arrive twice (reconnects / both services)

function tip(t) {
  const key = `${t.source}:${t.id || ''}:${t.name}:${t.amount}`; if (seen.has(key)) return; seen.add(key); if (seen.size > 500) seen.clear();
  status.last = { ...t, at: Date.now() }; onTip(t); onChange();
}

export function startDonations(handlers = {}) {
  if (handlers.tip) onTip = handlers.tip; if (handlers.change) onChange = handlers.change;
  stopDonations();
  const s = db.settings;
  if (s.seJwt) {
    status.se = 'connecting';
    se = io('https://realtime.streamelements.com', { transports: ['websocket'], reconnection: true });
    se.on('connect', () => se.emit('authenticate', { method: 'jwt', token: s.seJwt }));
    se.on('authenticated', () => { status.se = 'online'; onChange(); });
    se.on('unauthorized', () => { status.se = 'error: that StreamElements token was not accepted'; onChange(); });
    se.on('disconnect', () => { if (status.se === 'online') { status.se = 'reconnecting'; onChange(); } });
    se.on('event', ev => { if (ev?.type === 'tip') tip({ source: 'StreamElements', id: ev._id, name: ev.data?.displayName || ev.data?.username || 'Someone', amount: Number(ev.data?.amount) || 0, currency: ev.data?.currency || 'USD', message: ev.data?.message || '' }); });
    se.on('event:test', ev => { if (ev?.listener === 'tip-latest') tip({ source: 'StreamElements (test)', id: 'test' + Date.now(), name: ev.event?.name || 'Test', amount: Number(ev.event?.amount) || 5, currency: 'USD', message: ev.event?.message || '' }); });
  }
  if (s.slToken) {
    status.sl = 'connecting';
    sl = io(`https://sockets.streamlabs.com?token=${encodeURIComponent(s.slToken)}`, { transports: ['websocket'], reconnection: true });
    sl.on('connect', () => { status.sl = 'online'; onChange(); });
    sl.on('connect_error', () => { status.sl = 'error: could not connect (check the Streamlabs Socket API token)'; onChange(); });
    sl.on('disconnect', () => { if (status.sl === 'online') { status.sl = 'reconnecting'; onChange(); } });
    sl.on('event', ev => { if (ev?.type === 'donation') for (const m of ev.message || []) tip({ source: 'Streamlabs', id: m._id || m.id, name: m.name || m.from || 'Someone', amount: Number(m.amount) || 0, currency: m.currency || 'USD', message: m.message || '' }); });
  }
  onChange();
}
export function stopDonations() {
  try { se?.close(); } catch {} try { sl?.close(); } catch {}
  se = sl = null; status.se = db.settings.seJwt ? status.se : 'off'; status.sl = db.settings.slToken ? status.sl : 'off';
}

// 🛡️ Movie Royal's side of the backup bot server (the "Movie Royal Backup Bots" app, on your PC or a friend's).
// Every minute, in the hidden #movie-royal-sync channel: say "I'm open", upload the rules + pool, bring in picks the backup
// took while Movie Royal was closed, and read what the backup is doing. See relay.js for the messages.
import * as discord from './discord.js';
import * as cloud from './cloud.js';
import { db, save } from './store.js';
import { readSync, putStatus } from './relay.js';
import { importChat } from './chat.js';

export const status = { backup: db.backupSeen || null, checkedAt: null, error: null, pulled: 0, channels: 0 }; // (remembered, so a just-opened Movie Royal knows the backup has the bot)
let timer = null, busy = false, lastHash = '', lastCfgAt = 0, onChange = () => {};
const VERSION = process.env.MR_VERSION || '';
const BACKUP_SEEN_MS = 5 * 60000;

// while the backup holds the bot (it took over from a broken 24/7 cloud bot), Movie Royal doesn't point Discord back at the cloud by itself
cloud.setBackupCheck(() => status.backup?.mode === 'backup');
export const backupActive = () => status.backup?.mode === 'backup';
export const backupWatching = () => !!status.backup?.seen && Date.now() - status.backup.seen < BACKUP_SEEN_MS;

function configForBackup() {
  const cfg = cloud.buildConfig();
  delete cfg.botToken; // never in a Discord channel: the backup has its own copy of the token
  cfg.cloudUrl = cloud.enabled() ? db.settings.cloud.url : '';
  cfg.twitchChannel = (db.settings.twitchChannel || '').toLowerCase().replace(/^#/, ''); // the backup reads this chat while Movie Royal is closed (for the viewer profiles)
  return cfg;
}

/** One check-in. closing = Movie Royal is closing: say so, and leave the newest rules for the backup. */
export async function tick(opts = {}) {
  if (busy || db.settings.backupRelay === false) return status;
  const chs = discord.syncChannels(), botId = discord.botUserId();
  status.channels = chs.length;
  if (!chs.length || !botId) return status;
  busy = true;
  try {
    const cfg = configForBackup(), hash = JSON.stringify(cfg);
    const cfgDue = opts.force || opts.closing || hash !== lastHash && Date.now() - lastCfgAt > 5 * 60000;
    let best = null;
    for (const ch of chs) {
      const st = await readSync(ch, botId);
      if (st.ops.length) { // picks the backup took while we were closed
        const done = new Set(await cloud.applyOps(st.ops.map(o => o.op)));
        for (const o of st.ops) if (done.has(o.op.id)) { await o.msg.delete().catch(() => {}); status.pulled++; }
      }
      for (const c of st.chats) { // 💬 chat the backup saw while we were closed → the viewer profiles
        try { const r = await fetch(c.url, { signal: AbortSignal.timeout(30000) }); if (!r.ok) continue; const n = importChat(await r.json()); status.chatIn = (status.chatIn || 0) + n; status.chatAt = Date.now(); await c.msg.delete().catch(() => {}); }
        catch (e) { console.error('[backup link] chat', e.message); }
      }
      await putStatus(ch, st.appMsg, 'MR-APP', { online: opts.closing ? 0 : Date.now(), version: VERSION, cloudUrl: cfg.cloudUrl });
      if (cfgDue || !st.config || st.ops.length) {
        await ch.send({ content: 'MR-CONFIG', files: [{ attachment: Buffer.from(hash), name: 'config.json' }], allowedMentions: { parse: [] } });
        if (st.config) await st.config.msg.delete().catch(() => {});
      }
      if (st.backup && (!best || (st.backup.seen || 0) > (best.seen || 0))) best = { ...st.backup, msg: st.backupMsg, ch };
    }
    if (cfgDue) { lastHash = hash; lastCfgAt = Date.now(); }
    status.backup = best ? { ...best, msg: undefined, ch: undefined } : null; status._ref = best;
    if (JSON.stringify(db.backupSeen || null) !== JSON.stringify(status.backup)) { db.backupSeen = status.backup; save(); }
    status.checkedAt = Date.now(); status.error = null;
  } catch (e) {
    if (/Expected token|token to be set|destroyed/i.test(e.message)) { // the Discord bot restarted (or reconnected) in the middle of the check: not a real problem, try again shortly
      status.error = null; setTimeout(() => tick({ force: true }), 15000);
    } else { status.error = e.message; console.error('[backup link]', e.message); }
  }
  finally { busy = false; onChange(); }
  return status;
}

/** The streamer pressed "☁️ Switch back to the cloud": point Discord at the 24/7 bot again and tell the backup to stand by. */
export async function switchBack() {
  const ref = status._ref;
  if (ref?.msg) await putStatus(ref.ch, ref.msg, 'MR-BACKUP', { ...status.backup, mode: 'cloud', back: Date.now() });
  if (status.backup) { status.backup.mode = 'cloud'; db.backupSeen = status.backup; save(); }
  let st = null;
  if (cloud.enabled()) st = await cloud.checkLink(true);
  onChange();
  return { ok: true, linked: st?.linked ?? null, error: st?.linkError || null };
}

export function start(changed) {
  onChange = changed || onChange;
  clearInterval(timer);
  setTimeout(() => tick({ force: true }), 20000); // after the Discord bot is online
  timer = setInterval(() => tick(), 60000);
}

// 🛡️ The hidden #movie-royal-sync channel: how Movie Royal and the "Movie Royal Backup Bots" app talk to each other.
// Both sides use the SAME Discord bot (the streamer's), so no router setup or web address is needed.
// Only the bot can see the channel (server admins can too, so the bot token is never put in it).
//
// Messages (all posted by the bot, found by their first word):
//   MR-APP {json}     Movie Royal's heartbeat: { online: time it last checked in (0 = closed), version, cloudUrl }
//   MR-CONFIG         + config.json attachment: the rules + pool the backup needs (same as the 24/7 cloud bot gets, minus the token)
//   MR-BACKUP {json}  the backup's status: { mode: 'standby' | 'backup' | 'cloud', since, by, reason, seen, back }
//   MR-OP {json}      a pick / swap / Twitch link made on the backup while Movie Royal was closed (Movie Royal adds it, then deletes the message)
export const SYNC_NAME = 'movie-royal-sync';
export const SYNC_TOPIC = '🛡️ Movie Royal uses this hidden channel to talk to a backup bot server. Please don\'t type, edit or delete anything here.';
export const APP_FRESH_MS = 150000; // Movie Royal counts as open if it checked in within 2½ minutes

const parse = (content, tag) => { try { return JSON.parse(content.slice(tag.length).trim() || '{}'); } catch { return {}; } };

/** Read everything in the sync channel that the bot posted. */
export async function readSync(ch, botId) {
  const out = { app: null, appMsg: null, config: null, backup: null, backupMsg: null, ops: [] };
  let before;
  for (let page = 0; page < 5; page++) { // up to 500 messages (ops pile up only while Movie Royal is closed)
    const batch = await ch.messages.fetch({ limit: 100, ...(before ? { before } : {}) });
    if (!batch.size) break;
    for (const m of batch.values()) {
      if (m.author?.id !== botId) continue;
      const c = m.content || '';
      if (c.startsWith('MR-APP') && !out.appMsg) { out.appMsg = m; out.app = parse(c, 'MR-APP'); }
      else if (c.startsWith('MR-CONFIG') && !out.config) out.config = { msg: m, url: m.attachments.first()?.url || null, at: m.editedTimestamp || m.createdTimestamp };
      else if (c.startsWith('MR-BACKUP') && !out.backupMsg) { out.backupMsg = m; out.backup = parse(c, 'MR-BACKUP'); }
      else if (c.startsWith('MR-OP')) { const op = parse(c, 'MR-OP'); if (op.id) out.ops.push({ msg: m, op }); }
    }
    before = batch.last().id;
    if (batch.size < 100) break;
  }
  out.ops.sort((a, b) => (a.op.at || 0) - (b.op.at || 0));
  return out;
}
/** Post or edit one of the single status messages (MR-APP / MR-BACKUP). Returns the message. */
export async function putStatus(ch, msg, tag, data) {
  const content = `${tag} ${JSON.stringify(data)}`;
  if (msg) { try { return await msg.edit({ content }); } catch {} }
  return ch.send({ content, allowedMentions: { parse: [] } });
}
export const appOpen = app => !!app?.online && Date.now() - app.online < APP_FRESH_MS;

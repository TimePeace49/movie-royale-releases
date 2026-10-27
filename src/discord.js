// Discord bot: lives in its own #movies-royal channel.
// /suggest  /swap  /mymovies  /list  /linktwitch  /help — the commands message is pinned in the channel.
import { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, EmbedBuilder, MessageFlags, ChannelType, PermissionFlagsBits } from 'discord.js';
import { db, save, streamerName } from './store.js';
import { SYNC_NAME, SYNC_TOPIC } from './relay.js';
import { searchMovies, getMany, cachedMovie } from './tmdb.js';
import { suggest, moviesList, findMovie, userActive, picksUsed, wonThisWeek, backOn, rollWeek, claimManual, blockReason, swapMovie, swapsLocked, luckOn, freePicks } from './movies.js';

let client = null;
export const status = { state: 'off', error: null, tag: null, guilds: [], warnings: [] };
let onChange = () => {};

const commands = [
  new SlashCommandBuilder().setName('suggest').setDescription('Put a movie into the Movie Royal')
    .addStringOption(o => o.setName('movie').setDescription('Start typing a movie title').setRequired(true).setAutocomplete(true)),
  new SlashCommandBuilder().setName('swap').setDescription('Trade one of your movies for a different one (1 for 1, before the stream starts)')
    .addStringOption(o => o.setName('yours').setDescription('Which of your movies to swap out').setRequired(true).setAutocomplete(true))
    .addStringOption(o => o.setName('new').setDescription('The movie you want instead — start typing').setRequired(true).setAutocomplete(true)),
  new SlashCommandBuilder().setName('mymovies').setDescription("See your movies and picks left — or someone else's")
    .addStringOption(o => o.setName('person').setDescription("Someone else's name (leave empty for yours)").setAutocomplete(true)),
  new SlashCommandBuilder().setName('mine').setDescription('Same as /mymovies'),
  new SlashCommandBuilder().setName('list').setDescription('See every movie in the battle royal pool'),
  new SlashCommandBuilder().setName('linktwitch').setDescription('Connect your Twitch name (your picture on the cliff + chat check-in)')
    .addStringOption(o => o.setName('username').setDescription('Your Twitch username').setRequired(true)),
  new SlashCommandBuilder().setName('help').setDescription('How Movie Royal works')
].map(c => c.toJSON());

const cut = (s, n = 100) => s.length > n ? s.slice(0, n - 1) + '…' : s;
const active = () => moviesList().entries.filter(e => e.status === 'active');
const channelName = () => (db.settings.discordChannelName || 'movies-royal').toLowerCase().replace(/[^a-z0-9-]+/g, '-');

export function helpText() {
  const max = db.settings.maxPerUser, tw = db.settings.twitchMoviesCommand || '!mymovies';
  return [
    `**🍿 MOVIE ROYAL — how it works**`,
    `Your movies fight it out on a crumbling cliff on ${streamerName()}'s stream. Last one standing gets watched!`,
    ``,
    `**/suggest** — add a movie. Start typing and pick from the list. You get **${max} picks**, and ${max} new ones once all of yours have been picked.`,
    `**/swap** — trade one of your movies for a different one (1 for 1). Works until the stream goes live.`,
    `**/mymovies** — see your movies and picks left. Add a name to see someone else's (\`/mymovies person: Lucy\`). On Twitch: **${tw}** or **${tw} name**.`,
    `**/list** — everything in the pool right now.`,
    `**/linktwitch** — connect your Twitch name so your picture is your piece and chatting puts your movies on the cliff.`,
    `**On Twitch:** type anything in chat to claim your movie when it wins · **${db.settings.sitOutCommand || '!sitout'}** if it's too late for you (your movies skip tonight's battles) · **${db.settings.backCommand || '!imback'}** to jump back in · **${db.settings.helpCommand || '!moviesroyal'}** for all chat commands.`,
    ``,
    `**In the list you'll see:**`,
    `🚫 *banned*, *series taken* or *${new Date().getFullYear()} movie* · ✅ *already watched* · 🔒 *already picked* — somebody has it, so pick something else. Every movie can only be picked once.`,
    ``,
    `**Rules:** be in Twitch chat during the stream to get your movies on the cliff · if your movie wins, your other movies sit out until the new week (Sunday) · one movie per series${db.settings.banCurrentYear !== false ? ` · no ${new Date().getFullYear()} movies` : ''}${luckOn() ? ' · 🍀 every battle your movies lose, they get a little luckier' : ''}`,
    ...(db.settings.ideasDoc ? [``, `💡 **Got an idea for Movie Royal?** Maps, the wheel, how it looks, anything: [leave a note in the ideas doc](<${db.settings.ideasDoc}>) (anyone with the link can comment).`] : [])
  ].join('\n');
}

async function setupGuild(g) {
  const warn = [];
  db.discordChannels ||= {};
  let ch = g.channels.cache.get(db.discordChannels[g.id]?.channelId) || g.channels.cache.find(c => c.type === ChannelType.GuildText && c.name === channelName());
  try {
    if (!ch) ch = await g.channels.create({ name: channelName(), type: ChannelType.GuildText, topic: `🍿 Movie Royal — /suggest a movie for ${streamerName()}'s stream. Commands are pinned.` });
  } catch (e) { warn.push(`${g.name}: couldn't create #${channelName()} — give the bot "Manage Channels", or make the channel yourself.`); }
  if (!ch) return warn;
  const rec = db.discordChannels[g.id] = { ...(db.discordChannels[g.id] || {}), channelId: ch.id, name: ch.name };
  // pinned commands message (updated when the text changes)
  try {
    const text = helpText();
    let msg = rec.pinId ? await ch.messages.fetch(rec.pinId).catch(() => null) : null;
    if (msg && rec.pinText !== text) { await msg.edit({ content: text }).catch(() => { msg = null; }); }
    if (!msg) { msg = await ch.send({ content: text, allowedMentions: { parse: [] } }); await msg.pin().catch(() => warn.push(`${g.name}: couldn't pin the commands message — give the bot "Manage Messages".`)); }
    rec.pinId = msg.id; rec.pinText = text;
    await keepPinOnTop(ch, msg.id);
  } catch (e) { warn.push(`${g.name}: couldn't post in #${ch.name} (${e.message}).`); }
  save();
  return warn;
}
export async function refreshPinned() { if (!client) return; for (const g of client.guilds.cache.values()) await setupGuild(g); }

// 📌 keep Movie Royal's pinned message at the TOP of the channel's pins (if other messages got pinned after it, pin ours again)
// and clean up the little "pinned a message" notice that makes.
async function keepPinOnTop(ch, pinId) {
  try {
    if (!ch || !pinId) return;
    const pins = await ch.messages.fetchPinned();
    const first = pins.first(), ours = pins.get(pinId);
    if (ours && first?.id === pinId) return; // already on top
    const msg = ours || await ch.messages.fetch(pinId).catch(() => null); if (!msg) return;
    if (ours) await msg.unpin().catch(() => {});
    await msg.pin();
    const recent = await ch.messages.fetch({ limit: 10 }).catch(() => null); // remove the "… pinned a message" notice
    for (const m of recent?.values() || []) if (m.type === 6 && m.author?.id === client.user.id) await m.delete().catch(() => {});
  } catch (e) { console.log('[discord pins]', e.message); }
}
export async function keepPinsOnTop() {
  if (!client) return;
  for (const [gid, rec] of Object.entries(db.discordChannels || {})) await keepPinOnTop(client.channels.cache.get(rec.channelId), rec.pinId);
  for (const [gid, rec] of Object.entries(db.discordDebug || {})) await keepPinOnTop(client.channels.cache.get(rec.channelId), rec.pinId);
}

// 🐞 #movie-royal-debug: a hidden channel only mods and the server owner can see. Movie Royal posts its Discord problems there
// (plain words + the tech details). Nobody but the bot can type in it; a pinned message (and the channel topic) says so.
const DEBUG_NAME = 'movie-royal-debug';
const DEBUG_NOTE = '🔒 **Movie Royal debug channel.** Only mods and the server owner can see this. The bot posts Discord problems here automatically (what went wrong in plain words, plus tech details for fixing it). **Please don\'t type, edit or delete anything in here.**';
const DEBUG_TOPIC = '🔒 Movie Royal debug: the bot posts problems here. Mods only. Please don\'t type or edit anything.';
async function setupDebug(g) {
  const warn = [];
  if (db.settings.discordDebug === false) return warn;
  db.discordDebug ||= {};
  const P = PermissionFlagsBits;
  const modRoles = g.roles.cache.filter(r => r.id !== g.id && !r.managed && r.permissions.any([P.Administrator, P.ManageGuild, P.ManageMessages, P.ModerateMembers, P.KickMembers, P.BanMembers]));
  const overwrites = [
    { id: g.id, deny: [P.ViewChannel, P.SendMessages] }, // everyone: can't see it
    ...modRoles.map(r => ({ id: r.id, allow: [P.ViewChannel, P.ReadMessageHistory], deny: [P.SendMessages, P.SendMessagesInThreads, P.CreatePublicThreads, P.CreatePrivateThreads, P.AddReactions] })), // mods: read only
    { id: client.user.id, allow: [P.ViewChannel, P.SendMessages, P.ReadMessageHistory, P.ManageMessages, P.EmbedLinks] } // the bot posts
  ];
  let ch = g.channels.cache.get(db.discordDebug[g.id]?.channelId) || g.channels.cache.find(c => c.type === ChannelType.GuildText && c.name === DEBUG_NAME);
  try {
    if (!ch) ch = await g.channels.create({ name: DEBUG_NAME, type: ChannelType.GuildText, topic: DEBUG_TOPIC, permissionOverwrites: overwrites, reason: 'Movie Royal debug channel (mods only)' });
    else {
      await ch.permissionOverwrites.set(overwrites, 'Movie Royal debug channel: mods only, bot posts').catch(() => warn.push(`${g.name}: couldn't lock #${DEBUG_NAME} — give the bot "Manage Roles", or set it to mods-only yourself.`));
      if (ch.topic !== DEBUG_TOPIC) await ch.setTopic(DEBUG_TOPIC).catch(() => {});
    }
  } catch (e) { warn.push(`${g.name}: couldn't make the #${DEBUG_NAME} channel (${e.message}).`); return warn; }
  const rec = db.discordDebug[g.id] = { ...(db.discordDebug[g.id] || {}), channelId: ch.id };
  try { // the pinned "don't type here" message: always there and pinned
    let msg = rec.pinId ? await ch.messages.fetch(rec.pinId).catch(() => null) : null;
    if (msg && msg.content !== DEBUG_NOTE) await msg.edit({ content: DEBUG_NOTE }).catch(() => { msg = null; });
    if (!msg) msg = await ch.send({ content: DEBUG_NOTE, allowedMentions: { parse: [] } });
    if (!msg.pinned) await msg.pin().catch(() => warn.push(`${g.name}: couldn't pin the note in #${DEBUG_NAME} — give the bot "Manage Messages".`));
    rec.pinId = msg.id; await keepPinOnTop(ch, msg.id);
  } catch (e) { warn.push(`${g.name}: couldn't post in #${DEBUG_NAME} (${e.message}).`); }
  save();
  return warn;
}
// 🛡️ #movie-royal-sync: a hidden channel only the bot can see. Movie Royal and the backup bot server leave notes for each other here
// (see relay.js). Made in every server that has the movie channel.
async function setupSync(g) {
  const warn = [];
  if (db.settings.backupRelay === false || !db.discordChannels?.[g.id]) return warn;
  db.discordSync ||= {};
  const P = PermissionFlagsBits;
  const overwrites = [
    { id: g.id, deny: [P.ViewChannel] }, // nobody but the bot (and server admins, who see everything anyway)
    { id: client.user.id, allow: [P.ViewChannel, P.SendMessages, P.ReadMessageHistory, P.ManageMessages, P.AttachFiles] }
  ];
  let ch = g.channels.cache.get(db.discordSync[g.id]?.channelId) || g.channels.cache.find(c => c.type === ChannelType.GuildText && c.name === SYNC_NAME);
  try {
    if (!ch) ch = await g.channels.create({ name: SYNC_NAME, type: ChannelType.GuildText, topic: SYNC_TOPIC, permissionOverwrites: overwrites, reason: 'Movie Royal: talks to the backup bot server' });
    else await ch.permissionOverwrites.set(overwrites, 'Movie Royal sync channel: only the bot').catch(() => warn.push(`${g.name}: couldn't hide #${SYNC_NAME} — give the bot "Manage Roles", or hide it yourself.`));
  } catch (e) { warn.push(`${g.name}: couldn't make the #${SYNC_NAME} channel for the backup bot server (${e.message}).`); return warn; }
  db.discordSync[g.id] = { channelId: ch.id }; save();
  return warn;
}
/** The sync channels (for the backup bot server link). */
export const syncChannels = () => client ? Object.values(db.discordSync || {}).map(r => client.channels.cache.get(r.channelId)).filter(Boolean) : [];
export const botUserId = () => client?.user?.id || null;
export async function setupDebugAll() { if (!client) throw new Error('The Discord bot isn\'t online.'); const w = []; for (const g of client.guilds.cache.values()) w.push(...await setupDebug(g)); return w; }
// posting problems: a few at a time, never in a loop (posting errors are only printed, not logged again)
let debugQ = [], debugT = null;
export function postDebug(text) {
  if (!client || db.settings.discordDebug === false || !Object.keys(db.discordDebug || {}).length) return;
  debugQ.push(String(text).slice(0, 1800)); if (debugQ.length > 20) debugQ = debugQ.slice(-20);
  if (!debugT) debugT = setTimeout(flushDebug, 3000);
}
async function flushDebug() {
  debugT = null; const items = debugQ.splice(0); if (!items.length) return;
  let msg = ''; const parts = [];
  for (const it of items) { if ((msg + '\n\n' + it).length > 1900) { parts.push(msg); msg = it; } else msg = msg ? msg + '\n\n' + it : it; }
  if (msg) parts.push(msg);
  for (const [gid, rec] of Object.entries(db.discordDebug || {})) {
    const ch = client?.channels.cache.get(rec.channelId); if (!ch) continue;
    for (const p of parts) await ch.send({ content: p, allowedMentions: { parse: [] } }).catch(e => console.log('[discord debug] could not post:', e.message));
  }
}

export async function start(changed) {
  onChange = changed || onChange;
  await stop();
  const s = db.settings;
  if (!s.discordToken || !s.discordClientId) { status.state = 'not set up'; return; }
  status.state = 'connecting'; status.error = null;
  try {
    const rest = new REST({ version: '10' }).setToken(s.discordToken);
    const register = async guildId => {
      try { await rest.put(Routes.applicationGuildCommands(s.discordClientId, guildId), { body: commands }); }
      catch (e) { console.error('[discord] commands for', guildId, e.message); }
    };
    const prep = async g => { await register(g.id); const w = await setupGuild(g); w.push(...await setupDebug(g).catch(e => [`${g.name}: debug channel: ${e.message}`])); w.push(...await setupSync(g).catch(e => [`${g.name}: sync channel: ${e.message}`])); return w; };
    client = new Client({ intents: [GatewayIntentBits.Guilds] });
    client.rest.on?.('response', (req, res) => { // Discord turned the token down (it was reset on the Discord website): say so plainly
      if (res?.status === 401 && status.state !== 'token reset') { status.state = 'token reset'; status.error = "Discord doesn't accept your bot token any more (it was reset on the Discord website). Paste the new one in the Bot token box below and press Save."; onChange(); }
    });
    client.once('ready', async () => {
      status.state = 'online'; status.tag = client.user.tag;
      status.guilds = client.guilds.cache.map(g => g.name);
      status.warnings = [];
      for (const g of client.guilds.cache.values()) status.warnings.push(...await prep(g));
      onChange();
    });
    client.on('guildCreate', async g => { status.guilds = client.guilds.cache.map(x => x.name); status.warnings.push(...await prep(g)); onChange(); });
    let pinT = null; // someone pinned something else: put ours back on top (a few seconds later)
    client.on('channelPinsUpdate', ch => { const ids = [...Object.values(db.discordChannels || {}), ...Object.values(db.discordDebug || {})].map(r => r.channelId); if (!ids.includes(ch.id)) return; clearTimeout(pinT); pinT = setTimeout(() => keepPinsOnTop(), 4000); });
    client.on('guildDelete', () => { status.guilds = client.guilds.cache.map(x => x.name); onChange(); });
    client.on('interactionCreate', i => handle(i).catch(err => {
      console.error('[discord]', `/${i.commandName || '?'} by ${i.user?.username || '?'}: ${err.message}`, err);
      const reply = { content: '⚠️ ' + err.message, flags: MessageFlags.Ephemeral };
      if (i.isRepliable?.()) (i.deferred || i.replied ? i.followUp(reply) : i.reply(reply)).catch(() => {});
    }));
    await client.login(s.discordToken);
  } catch (e) {
    status.state = 'error';
    status.error = /TOKEN_INVALID|invalid token/i.test(e.message + e.code) ? "Discord didn't accept that bot token — reset it in the Developer Portal and paste the new one."
      : /disallowed intents/i.test(e.message) ? 'Discord blocked the bot — make sure it is a normal bot (no special intents needed).' : e.message;
    console.error('[discord]', e.message);
  }
  onChange();
}

export async function stop() {
  if (client) { try { await client.destroy(); } catch {} client = null; }
  status.state = 'off'; status.tag = null; status.guilds = [];
}

/** Movie search for the type-ahead list. Blocked movies stay visible (so people know they typed it right) but are marked 🚫 / ✅. */
async function movieChoices(q, user, opts = {}) {
  let results = [];
  try { results = (await searchMovies(q)).slice(0, 25); } catch { return []; }
  const full = await getMany(results.slice(0, 12).map(m => m.id), 1500); // series info for the top results
  return results.map(m => {
    const movie = full.get(String(m.id)) || cachedMovie(m.id) || m;
    const block = blockReason(movie, user, opts);
    const pooled = findMovie(m.id);
    const name = `${m.title} (${m.year || '????'})`;
    if (block) { const [icon, ...why] = block.short.split(' '); return { name: cut(`${icon} ${name} — ${why.join(' ')}`), value: 'x:' + m.id }; } // visible, but picking it just explains why
    return { name: cut(name), value: String(m.id) };
  });
}
async function explainBlocked(value, user) {
  const id = String(value).slice(2), movie = cachedMovie(id) || (await getMany([id], 2500)).get(id);
  return movie ? (blockReason(movie, user)?.msg || 'That movie can\'t be picked right now.') : 'That movie can\'t be picked right now.';
}

async function handle(i) {
  const user = i.user && { discordId: i.user.id, name: i.member?.displayName || i.user.globalName || i.user.username, avatar: i.user.displayAvatarURL({ extension: 'png', size: 128 }) };
  const home = i.guildId && db.discordChannels?.[i.guildId]?.channelId;
  const wrongPlace = () => home && i.channelId !== home;

  if (i.isAutocomplete()) {
    const f = i.options.getFocused(true), q = String(f.value || '');
    if (f.name === 'person') {
      const ql = q.toLowerCase();
      return i.respond(peopleIndex().filter(p => !ql || p.name.toLowerCase().includes(ql) || (p.twitch || '').includes(ql)).slice(0, 25).map(p => ({ name: cut(`${p.name}${p.twitch && p.twitch !== p.name.toLowerCase() ? ` (${p.twitch})` : ''}`), value: p.name })));
    }
    if (i.commandName === 'swap' && f.name === 'yours') {
      const mine = userActive(user.discordId).filter(e => e.label.toLowerCase().includes(q.toLowerCase()));
      return i.respond(mine.slice(0, 25).map(e => ({ name: cut(`${e.label}${e.sub ? ` (${e.sub})` : ''}`), value: e.id })));
    }
    if (q.length < 2) {
      if (i.commandName === 'swap') return i.respond([]);
      return i.respond([]);
    }
    const swapFrom = i.commandName === 'swap' ? i.options.getString('yours') : undefined;
    return i.respond(await movieChoices(q, user, { swapFrom }));
  }

  if (!i.isChatInputCommand()) return;
  const eph = content => ({ content, flags: MessageFlags.Ephemeral, allowedMentions: { parse: [] } });

  if (i.commandName === 'suggest' || i.commandName === 'swap') {
    if (wrongPlace()) return i.reply(eph(`🍿 Movie picks happen in <#${home}> — use /${i.commandName} there!`));
    await i.deferReply({ flags: MessageFlags.Ephemeral });
    claimManual(user, db.links[user.discordId] || null); // picks the streamer added for them by hand
    let r;
    if (i.commandName === 'suggest') {
      const v = i.options.getString('movie');
      r = v.startsWith('x:') ? { ok: false, msg: await explainBlocked(v, user) } : await suggest(v, user);
    } else {
      const v = i.options.getString('new');
      r = v.startsWith('x:') ? { ok: false, msg: await explainBlocked(v, user) } : await swapMovie(user, i.options.getString('yours'), v);
    }
    await i.editReply(r.ok ? `Done! ${r.msg.replace(/<@\d+>/, 'you')}\n🎟️ Picks left: ${db.settings.maxPerUser - picksUsed(user.discordId)} of ${db.settings.maxPerUser}` : r.msg);
    if (r.ok && r.public && i.channel) i.channel.send({ content: r.msg, allowedMentions: { parse: [] } }).catch(() => {});
    onChange();
    return;
  }

  if (i.commandName === 'list') {
    const list = active().sort((a, b) => b.weight - a.weight);
    const total = list.reduce((s, e) => s + (e.weight || 1), 0) || 1;
    const lines = list.slice(0, 40).map((e, n) => `**${n + 1}.** ${e.kind === 'spot' ? '🎟️ ' : ''}${e.label}${e.sub ? ` (${e.sub})` : ''} — ${Math.round((e.weight || 1) / total * 1000) / 10}% · ${e.backers.map(b => b.name).join(', ') || streamerName()}`);
    const embed = new EmbedBuilder().setTitle(`🍿 Movie Royal pool — ${list.length} movies`).setColor(0xf5a623)
      .setDescription(lines.join('\n').slice(0, 4000) || 'Empty! Use /suggest to add one.');
    if (list.length > 40) embed.setFooter({ text: `+${list.length - 40} more` });
    return i.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  }

  if (i.commandName === 'mymovies' || i.commandName === 'mine') {
    claimManual(user, db.links[user.discordId] || null);
    const who = i.commandName === 'mymovies' ? i.options.getString('person') : null;
    if (!who) return i.reply(eph(myMoviesText(user.discordId)));
    const cd = Math.max(0, Number(db.settings.twitchCooldown ?? 30)) * 1000, lastAt = lookupCooldown.get(user.discordId) || 0;
    if (Date.now() - lastAt < cd) return i.reply(eph(`⏳ Wait ${Math.ceil((cd - (Date.now() - lastAt)) / 1000)}s before looking someone up again.`));
    lookupCooldown.set(user.discordId, Date.now());
    const p = findPerson(who);
    return i.reply(eph(p ? othersText(p) : `Couldn't find anyone called **${who}** with movies.`));
  }

  if (i.commandName === 'help') return i.reply(eph(helpText()));

  if (i.commandName === 'linktwitch') {
    const name = i.options.getString('username').trim().replace(/^@/, '').toLowerCase();
    if (!/^[a-z0-9_]{3,25}$/.test(name)) return i.reply(eph("That doesn't look like a Twitch username."));
    db.links[user.discordId] = name; (db.linkNames ||= {})[user.discordId] = { name: user.name, avatar: user.avatar }; save();
    const merged = claimManual(user, name);
    onChange();
    return i.reply(eph(`Linked! Your piece will use **${name}**'s Twitch picture, and chatting as ${name} on Twitch puts your movies on the cliff.${merged ? `\n🎬 Found the movies ${streamerName()} already added for you — they're yours now. Check them with /mymovies.` : ''}`));
  }
}

const lookupCooldown = new Map();
/** Everyone who has (or had) movies: Discord pickers + people the streamer added, with their Twitch names. */
export function peopleIndex() {
  const m = new Map();
  for (const e of moviesList().entries) for (const b of e.backers || []) if (!m.has(b.discordId)) m.set(b.discordId, { discordId: b.discordId, name: b.name });
  for (const [id, mp] of Object.entries(db.manualPeople || {})) if (!m.has(id)) m.set(id, { discordId: id, name: mp.name });
  return [...m.values()].map(p => ({ ...p, twitch: db.links[p.discordId] || '' })).sort((a, b) => a.name.localeCompare(b.name));
}
/** Find someone by Discord name or Twitch name (exact first, then starts-with). */
export function findPerson(q) {
  const n = String(q || '').trim().replace(/^@/, '').toLowerCase(); if (!n) return null;
  const all = peopleIndex();
  return all.find(p => p.name.toLowerCase() === n || p.twitch === n) || all.find(p => p.name.toLowerCase().startsWith(n) || p.twitch.startsWith(n)) || null;
}
/** Someone else's movies, for "/mymovies person:" and "!mymovies name". */
export function othersText(p, plain = false) {
  const mine = userActive(p.discordId), b = s => plain ? s : `**${s}**`;
  if (!mine.length) return `${b(p.name)} has no movies in right now.`;
  return `🎬 ${b(p.name)}'s movies: ${mine.map(e => `${e.label}${e.sub ? ` (${e.sub})` : ''}${e.status === 'benched' ? ` 💤 back ${backOn()}` : e.status === 'paused' ? ' ⏸' : ''}${luckOn() && e.luckPct ? ` 🍀+${(+e.luckPct).toFixed(2)}%` : ''}`).join(', ')}`;
}

/** Shared by /mymovies and the Twitch chat command. */
export function myMoviesText(discordId, plain = false) {
  rollWeek();
  const mine = userActive(discordId);
  const used = picksUsed(discordId), max = db.settings.maxPerUser;
  const b = s => plain ? s : `**${s}**`;
  let head = used >= max ? `🔒 All ${max} picks used — you get ${max} new ones once these have all been picked.` : `🎟️ You have ${b(max - used)} of ${max} picks left.`;
  if (freePicks(discordId)) head += ` 🎟️ Plus ${b(freePicks(discordId))} free replacement pick${freePicks(discordId) === 1 ? '' : 's'} (use it any time).`;
  if (wonThisWeek(discordId)) head = `🏆 Your movie won this week — your movies sit out until ${b(backOn())}. ` + head;
  if (!plain && !swapsLocked() && mine.length) head += ' (You can /swap any of them until the stream starts.)';
  const tag = e => e.status === 'benched' ? ` 💤 back ${backOn()}` : e.status === 'paused' ? ' ⏸ paused' : e.status === 'away' ? ' 💤 out tonight' : '';
  const luck = e => luckOn() && e.luckPct ? ` 🍀+${(+e.luckPct).toFixed(2)}%` : '';
  if (plain) return `${head} ${mine.length ? 'Your movies: ' + mine.map(e => `${e.label}${e.sub ? ` (${e.sub})` : ''}${tag(e)}${luck(e)}`).join(', ') : 'No movies in yet — /suggest one in Discord!'}`;
  return head + (mine.length ? '\n' + mine.map(e => `• ${e.label}${e.sub ? ` (${e.sub})` : ''}${tag(e)}${luck(e)}`).join('\n') : '');
}

/** Post a message in the movie channel(s) (used by the cloud bot sync). */
/** Server members matching a name (for tagging someone to a movie in the app). */
export async function searchMembers(q) {
  if (!client || !q) return [];
  const out = [];
  for (const g of client.guilds.cache.values()) {
    try { const ms = await g.members.search({ query: q, limit: 8 }); for (const m of ms.values()) if (!m.user.bot && !out.some(o => o.discordId === m.id)) out.push({ discordId: m.id, name: m.displayName || m.user.globalName || m.user.username, username: m.user.username, avatar: m.displayAvatarURL?.({ size: 64 }) || null }); } catch {}
  }
  return out.slice(0, 10);
}
export async function notify(text) {
  if (!client) return;
  for (const g of client.guilds.cache.values()) {
    const id = db.discordChannels?.[g.id]?.channelId, ch = id && g.channels.cache.get(id);
    if (ch) await ch.send({ content: text, allowedMentions: { users: (text.match(/<@(\d+)>/g) || []).map(x => x.slice(2, -1)) } }).catch(() => {});
  }
}
export async function postTest() {
  if (!client) throw new Error('The Discord bot is not connected.');
  const out = [];
  for (const g of client.guilds.cache.values()) {
    const id = db.discordChannels?.[g.id]?.channelId, ch = id && g.channels.cache.get(id);
    if (!ch) { out.push(`${g.name}: no #${channelName()} channel yet`); continue; }
    await ch.send({ content: `🧪 Movie Royal test message — the bot can post here. (${new Date().toLocaleTimeString()})` });
    out.push(`${g.name}: posted in #${ch.name}`);
  }
  return out;
}

// View Channel + Send Messages + Manage Channels (to make #movies-royal) + Manage Messages (to pin) + Embed Links + Read History
export const inviteUrl = () => db.settings.discordClientId
  ? `https://discord.com/oauth2/authorize?client_id=${encodeURIComponent(db.settings.discordClientId)}&scope=bot+applications.commands&permissions=93200` : null;

/** 🤖 Discord self-test (🧪 Test tab): checks everything the bot can check by itself, without real people.
 *  (Bots can't press other bots' slash commands, so this runs the same code the commands use, with a pretend user.) */
export async function selfTest() {
  const out = [], add = (ok, label, detail = '') => out.push({ ok, label, detail });
  add(status.state === 'online', 'The bot is online', status.state === 'online' ? status.tag || '' : status.error || status.state);
  if (!client || status.state !== 'online') return out;
  const P = PermissionFlagsBits;
  for (const g of client.guilds.cache.values()) {
    add(true, `In the server “${g.name}”`);
    const me = g.members.me;
    const rec = db.discordChannels?.[g.id], ch = rec && g.channels.cache.get(rec.channelId);
    add(!!ch, `#${channelName()} exists`, ch ? '' : 'Settings → Discord: the bot makes it when it starts (needs "Manage Channels").');
    if (ch) {
      const p = ch.permissionsFor(me);
      add(p?.has([P.ViewChannel, P.SendMessages]), 'The bot can post in it');
      const pins = await ch.messages.fetchPinned().catch(() => null);
      add(!!pins?.get(rec.pinId), 'The commands message is pinned', pins ? '' : "couldn't read the pins");
      add(pins?.first()?.id === rec.pinId, 'It is the top pin', pins?.first()?.id === rec.pinId ? '' : 'it gets moved back to the top by itself');
      const everyone = ch.permissionsFor(g.roles.everyone);
      add(everyone?.has(P.ViewChannel) && everyone?.has(P.UseApplicationCommands), 'Everyone can see it and use the commands');
    }
    try {
      const cmds = await g.commands.fetch();
      const want = commands.map(c => c.name), have = new Set(cmds.filter(c => c.applicationId === client.user.id).map(c => c.name));
      const missing = want.filter(n => !have.has(n));
      add(!missing.length, `Slash commands are set up (${want.map(n => '/' + n).join(' ')})`, missing.length ? 'missing: ' + missing.map(n => '/' + n).join(' ') + ' (restart Movie Royal)' : '');
    } catch (e) { add(false, 'Slash commands are set up', e.message); }
    const drec = db.discordDebug?.[g.id], dch = drec && g.channels.cache.get(drec.channelId);
    if (db.settings.discordDebug !== false) {
      add(!!dch, '#movie-royal-debug exists', dch ? '' : 'Settings → Discord → Make / fix the debug channel');
      if (dch) {
        add(!dch.permissionsFor(g.roles.everyone)?.has(P.ViewChannel), 'Normal members can NOT see the debug channel');
        const mods = g.roles.cache.filter(r => r.id !== g.id && !r.managed && !r.permissions.has(P.Administrator) && r.permissions.any([P.ManageGuild, P.ManageMessages, P.ModerateMembers, P.KickMembers, P.BanMembers]));
        add(mods.every(r => dch.permissionsFor(r)?.has(P.ViewChannel) && !dch.permissionsFor(r)?.has(P.SendMessages)), `Mods can read it but not type in it${mods.size ? ` (${mods.map(r => r.name).join(', ')})` : ' (no mod roles found: the owner and admins still see it)'}`);
        const dp = await dch.messages.fetchPinned().catch(() => null);
        add(!!dp?.get(drec.pinId), 'The "don\'t type here" note is pinned');
      }
    }
  }
  // the same code the commands run, with a pretend user (nothing is added or changed)
  const fake = { discordId: 'selftest', name: 'Self-test' };
  try { const ch = await movieChoices('Jaws', fake); add(ch.length > 0, '/suggest movie search works', ch.length ? `found ${ch.length}, like “${ch[0].name}”` : 'no results (check the TMDB key)'); } catch (e) { add(false, '/suggest movie search works', e.message); }
  try { const t = myMoviesText('selftest'); add(!!t, '/mymovies answers', t.split('\n')[0].slice(0, 90)); } catch (e) { add(false, '/mymovies answers', e.message); }
  try { const t = helpText(); add(t.length > 50, '/help text is ready'); } catch (e) { add(false, '/help text is ready', e.message); }
  return out;
}

// Discord bot: lives in its own #movies-royal channel.
// /suggest  /swap  /mymovies  /list  /linktwitch  /help — the commands message is pinned in the channel.
import { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, EmbedBuilder, MessageFlags, ChannelType, PermissionFlagsBits } from 'discord.js';
import { db, save, streamerName } from './store.js';
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
  } catch (e) { warn.push(`${g.name}: couldn't post in #${ch.name} (${e.message}).`); }
  save();
  return warn;
}
export async function refreshPinned() { if (!client) return; for (const g of client.guilds.cache.values()) await setupGuild(g); }

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
    const prep = async g => { await register(g.id); return setupGuild(g); };
    client = new Client({ intents: [GatewayIntentBits.Guilds] });
    client.once('ready', async () => {
      status.state = 'online'; status.tag = client.user.tag;
      status.guilds = client.guilds.cache.map(g => g.name);
      status.warnings = [];
      for (const g of client.guilds.cache.values()) status.warnings.push(...await prep(g));
      onChange();
    });
    client.on('guildCreate', async g => { status.guilds = client.guilds.cache.map(x => x.name); status.warnings.push(...await prep(g)); onChange(); });
    client.on('guildDelete', () => { status.guilds = client.guilds.cache.map(x => x.name); onChange(); });
    client.on('interactionCreate', i => handle(i).catch(err => {
      console.error('[discord]', err.message);
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

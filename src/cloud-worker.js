// Movie Royal — 24/7 Discord bot (runs free on Cloudflare Workers).
// The Movie Royal app uploads this file for you (Settings → Discord → 24/7 mode). You never need to edit it.
//
// How it works:
//  • Discord sends /suggest, /swap, /mymovies… here (an "Interactions Endpoint URL"), so they work even when your PC is off.
//  • The app uploads a snapshot of your rules + pool ("config") whenever it's running.
//  • New picks made here wait in a queue; the app pulls them in the next time it opens (or within a minute if it's running).
// Storage: one Workers KV namespace bound as KV. Secret: SYNC_KEY (shared with the app).

const DISCORD = 'https://discord.com/api/v10';
const IMG = 'https://image.tmdb.org/t/p/w342';
const EPH = 64;

export const WORKER_V = 3; // bump when this file changes: the app offers to update the bot
export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    try {
      if (url.pathname === '/sync') return await sync(req, env);
      if (url.pathname === '/health') return json({ ok: true, at: Date.now(), v: WORKER_V });
      if (req.method === 'POST' && url.pathname === '/') {
        try { return await interaction(req, env, ctx); }
        catch (e) { // never leave Discord hanging ("the application did not respond"): say what went wrong
          console.error(e); const m = String(e?.message || e);
          return reply(/limit/i.test(m) ? "⚠️ The 24/7 bot hit Cloudflare's free daily limit. It works again tomorrow — tell the streamer if this keeps happening." : `⚠️ Something went wrong (${m.slice(0, 150)}). Try again in a minute.`);
        }
      }
      return new Response('Movie Royal bot is running 🍿', { headers: { 'content-type': 'text/plain; charset=utf-8' } });
    } catch (e) {
      console.error(e);
      return json({ error: String(e?.message || e) }, 500);
    }
  }
};

const json = (x, status = 200) => new Response(JSON.stringify(x), { status, headers: { 'content-type': 'application/json' } });

// ---------- app <-> cloud sync ----------
async function sync(req, env) {
  if ((req.headers.get('authorization') || '') !== `Bearer ${env.SYNC_KEY}`) return json({ error: 'bad key' }, 401);
  if (req.method === 'GET') return json({ queue: (await env.KV.get('queue', 'json')) || [] });
  const body = await req.json();
  if (body.config) { // only write when something changed: Cloudflare's free plan allows about 1,000 writes a day
    const next = JSON.stringify(body.config), cur = await env.KV.get('config');
    if (cur !== next) await env.KV.put('config', next);
  }
  if (Array.isArray(body.ack) && body.ack.length) {
    const q = (await env.KV.get('queue', 'json')) || [];
    const done = new Set(body.ack);
    await env.KV.put('queue', JSON.stringify(q.filter(o => !done.has(o.id))));
  }
  return json({ ok: true });
}

// ---------- Discord signature check ----------
const hex = h => new Uint8Array((h.match(/.{2}/g) || []).map(b => parseInt(b, 16)));
async function verify(req, body, publicKey) {
  const sig = req.headers.get('x-signature-ed25519'), ts = req.headers.get('x-signature-timestamp');
  if (!sig || !ts || !publicKey) return false;
  const data = new TextEncoder().encode(ts + body);
  for (const alg of [{ name: 'Ed25519' }, { name: 'NODE-ED25519', namedCurve: 'NODE-ED25519' }]) {
    try {
      const key = await crypto.subtle.importKey('raw', hex(publicKey), alg, false, ['verify']);
      return await crypto.subtle.verify(alg.name === 'Ed25519' ? 'Ed25519' : alg, key, hex(sig), data);
    } catch { /* try the older name */ }
  }
  return false;
}

// ---------- state = what the app uploaded + picks made since ----------
async function loadState(env, cfg0) {
  const [cfg, queue] = await Promise.all([cfg0 || env.KV.get('config', 'json'), env.KV.get('queue', 'json')]);
  if (!cfg) return null;
  const s = { cfg, queue: queue || [], pool: (cfg.pool || []).map(e => ({ ...e })), users: JSON.parse(JSON.stringify(cfg.users || {})), links: { ...(cfg.links || {}) } };
  for (const op of s.queue) applyOp(s, op);
  return s;
}
const IN_POOL = ['active', 'benched', 'paused', 'away'];
const userOf = (s, id) => (s.users[id] ||= { used: 0, wonThisWeek: false });
function applyOp(s, op) {
  if (op.type === 'suggest') {
    const u = userOf(s, op.user.discordId);
    s.pool.push({ id: 'tmdb-' + op.movie.id, tmdbId: op.movie.id, label: op.movie.title, sub: op.movie.year, status: u.wonThisWeek ? 'benched' : 'active', backers: [{ discordId: op.user.discordId, name: op.user.name }], collection: op.movie.collection || null, weight: 1, pending: true });
    if ((u.free || 0) > 0) u.free--; else u.used = (u.used || 0) + 1; // a free replacement pick doesn't count
  } else if (op.type === 'swap') {
    const old = s.pool.find(e => e.id === op.oldId);
    const benched = old?.status === 'benched';
    if (old) old.status = 'removed';
    s.pool.push({ id: 'tmdb-' + op.movie.id, tmdbId: op.movie.id, label: op.movie.title, sub: op.movie.year, status: benched ? 'benched' : 'active', backers: [{ discordId: op.user.discordId, name: op.user.name }], collection: op.movie.collection || null, weight: 1, luckPct: old?.luckPct || 0, pending: true });
  } else if (op.type === 'link') s.links[op.user.discordId] = op.login;
}
const mineOf = (s, id) => s.pool.filter(e => IN_POOL.includes(e.status) && e.backers?.some(b => b.discordId === id));
function picksUsed(s, id) { const u = userOf(s, id); return mineOf(s, id).length ? (u.used || 0) : 0; }

// ---------- the same rules as the app ----------
const norm = t => String(t || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '');
const slugify = t => String(t || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/&/g, 'and').replace(/['’‘.:,!?]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
function watched(cfg, m) {
  const w = cfg.watched || {};
  if ((w.tmdb || []).includes(String(m.id))) return true;
  const k = norm(m.title), y = Number(m.year), keys = new Set(w.keys || []), slugs = new Set(w.slugs || []);
  if (keys.has(k + '|' + m.year) || (y && (keys.has(k + '|' + (y - 1)) || keys.has(k + '|' + (y + 1))))) return true;
  const sl = slugify(m.title);
  return !!(sl && (slugs.has(sl) || (y && (slugs.has(`${sl}-${y}`) || slugs.has(`${sl}-${y - 1}`) || slugs.has(`${sl}-${y + 1}`)))));
}
function blockReason(s, m, opts = {}) {
  const cfg = s.cfg, label = `${m.title}${m.year ? ` (${m.year})` : ''}`, who = cfg.streamer || 'the streamer';
  const existing = s.pool.find(e => String(e.tmdbId) === String(m.id) && e.status !== 'removed');
  if (existing?.status === 'watched' || (cfg.wonIds || []).includes(String(m.id))) return { short: '✅ already won', msg: `✅ **${label}** already won a battle royal and got watched.` };
  if (watched(cfg, m)) return { short: '✅ already watched', msg: `✅ ${who} has already watched **${label}** — pick another movie!` };
  const ban = (cfg.bans || []).find(b => String(b.tmdbId) === String(m.id));
  if (ban) return { short: '🚫 banned', msg: `🚫 **${label}** is banned${ban.reason ? ` (${ban.reason})` : ''} — pick another movie!` };
  const year = String(new Date().getFullYear());
  if (cfg.banCurrentYear !== false && m.year === year && !(cfg.yearAllow || []).includes(String(m.id))) return { short: `🚫 ${year} movie`, msg: `🚫 Movies from ${year} aren't allowed — **${label}** is too new. Pick another movie!` };
  if (m.collection) {
    const sib = s.pool.find(e => IN_POOL.includes(e.status) && e.collection?.id === m.collection.id && String(e.tmdbId) !== String(m.id) && e.id !== opts.swapFrom);
    if (sib) return { short: '🚫 series taken', msg: `🚫 **${sib.label}${sib.sub ? ` (${sib.sub})` : ''}** from the *${m.collection.name}* is already picked, so no other movie from that series can go in. Pick something else!` };
  }
  if (existing && IN_POOL.includes(existing.status) && existing.id !== opts.swapFrom) return { short: '🔒 already picked', msg: `🔒 **${label}** was already picked by **${existing.backers?.[0]?.name || who}** — everyone needs a different movie. Pick another one!` };
  return null;
}

// ---------- TMDB ----------
async function tmdb(cfg, path) {
  const key = (cfg.tmdbKey || '').trim(), bearer = key.length > 40;
  const r = await fetch(`https://api.themoviedb.org/3${path}${bearer ? '' : `${path.includes('?') ? '&' : '?'}api_key=${key}`}`, { headers: bearer ? { Authorization: `Bearer ${key}` } : {} });
  if (!r.ok) throw new Error('TMDB ' + r.status);
  return r.json();
}
const shape = m => ({ id: m.id, title: m.title, year: (m.release_date || '').slice(0, 4), poster: m.poster_path ? IMG + m.poster_path : null });
const search = async (cfg, q) => ((await tmdb(cfg, `/search/movie?query=${encodeURIComponent(q)}&include_adult=false&language=en-US&page=1`)).results || []).map(shape);
async function movie(cfg, id) {
  const m = await tmdb(cfg, `/movie/${encodeURIComponent(id)}?language=en-US`);
  return { ...shape(m), collection: m.belongs_to_collection ? { id: m.belongs_to_collection.id, name: m.belongs_to_collection.name } : null };
}
async function manyMovies(cfg, ids, ms = 1600) {
  const out = new Map();
  await Promise.race([Promise.all(ids.map(id => movie(cfg, id).then(v => out.set(String(id), v)).catch(() => {}))), new Promise(r => setTimeout(r, ms))]);
  return out;
}

// ---------- Discord helpers ----------
const cut = t => t.length > 100 ? t.slice(0, 99) + '…' : t;
const reply = (content, ephemeral = true) => json({ type: 4, data: { content, flags: ephemeral ? EPH : 0, allowed_mentions: { parse: [] } } });
const opt = (i, name) => (i.data.options || []).find(o => o.name === name)?.value;
async function followup(i, content) {
  await fetch(`${DISCORD}/webhooks/${i.application_id}/${i.token}/messages/@original`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ content, allowed_mentions: { parse: [] } }) });
}
async function post(cfg, channelId, content) {
  if (!cfg.botToken || !channelId) return;
  await fetch(`${DISCORD}/channels/${channelId}/messages`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bot ${cfg.botToken}` }, body: JSON.stringify({ content, allowed_mentions: { parse: [] } }) }).catch(() => {});
}
async function enqueue(env, op) {
  const q = (await env.KV.get('queue', 'json')) || [];
  q.push(op);
  await env.KV.put('queue', JSON.stringify(q));
}
const backOn = cfg => cfg.backOn || 'the new week';

function myMoviesText(s, id) {
  const max = s.cfg.maxPerUser || 3, used = picksUsed(s, id), mine = mineOf(s, id), u = userOf(s, id);
  let head = used >= max ? `🔒 All ${max} picks used — you get ${max} new ones once these have all been picked.` : `🎟️ You have **${max - used}** of ${max} picks left.`;
  if (u.wonThisWeek) head = `🏆 Your movie won this week — your movies sit out until **${backOn(s.cfg)}**. ` + head;
  if (!s.cfg.swapsLocked && mine.length) head += ' (You can /swap any of them until the stream starts.)';
  const tag = e => e.status === 'benched' ? ` 💤 back ${backOn(s.cfg)}` : e.status === 'paused' ? ' ⏸ paused' : e.status === 'away' ? ' 💤 out tonight' : '';
  const luck = e => s.cfg.luckOn && e.luckPct ? ` 🍀+${(+e.luckPct).toFixed(2)}%` : '';
  return head + (mine.length ? '\n' + mine.map(e => `• ${e.label}${e.sub ? ` (${e.sub})` : ''}${tag(e)}${luck(e)}${e.pending ? ' ⏳' : ''}`).join('\n') : '');
}
function people(s) {
  const m = new Map();
  for (const e of s.pool) for (const b of e.backers || []) if (!m.has(b.discordId)) m.set(b.discordId, { discordId: b.discordId, name: b.name });
  for (const p of s.cfg.people || []) if (!m.has(p.discordId)) m.set(p.discordId, p);
  return [...m.values()].map(p => ({ ...p, twitch: s.links[p.discordId] || '' }));
}
function findPerson(s, q) {
  const n = String(q || '').trim().replace(/^@/, '').toLowerCase(); if (!n) return null;
  const all = people(s);
  return all.find(p => p.name.toLowerCase() === n || p.twitch === n) || all.find(p => p.name.toLowerCase().startsWith(n) || p.twitch.startsWith(n)) || null;
}

// ---------- commands ----------
async function interaction(req, env, ctx) {
  const body = await req.text();
  const cfg = await env.KV.get('config', 'json');
  if (!(await verify(req, body, cfg?.publicKey))) return new Response('bad signature', { status: 401 });
  const i = JSON.parse(body);
  if (i.type === 1) return json({ type: 1 }); // Discord checking the URL
  const s = await loadState(env, cfg);
  if (!s) return reply('🍿 Movie Royal is still being set up — open the app once.');
  const du = i.member?.user || i.user;
  const user = { discordId: du.id, name: i.member?.nick || du.global_name || du.username, avatar: du.avatar ? `https://cdn.discordapp.com/avatars/${du.id}/${du.avatar}.png?size=128` : null };
  const name = i.data?.name;

  if (i.type === 4) { // autocomplete
    const f = (i.data.options || []).find(o => o.focused) || {}, q = String(f.value || '');
    let choices = [];
    if (f.name === 'person') choices = people(s).filter(p => !q || p.name.toLowerCase().includes(q.toLowerCase()) || p.twitch.includes(q.toLowerCase())).slice(0, 25).map(p => ({ name: cut(p.name), value: p.name }));
    else if (name === 'swap' && f.name === 'yours') choices = mineOf(s, user.discordId).filter(e => e.label.toLowerCase().includes(q.toLowerCase())).slice(0, 25).map(e => ({ name: cut(`${e.label}${e.sub ? ` (${e.sub})` : ''}`), value: e.id }));
    else if (q.length >= 2) {
      const res = (await search(s.cfg, q).catch(() => [])).slice(0, 25);
      const full = await manyMovies(s.cfg, res.slice(0, 10).map(m => m.id));
      const swapFrom = name === 'swap' ? opt(i, 'yours') : undefined;
      choices = res.map(m => {
        const mm = full.get(String(m.id)) || m, b = blockReason(s, mm, { swapFrom }), label = `${m.title} (${m.year || '????'})`;
        if (b) { const [icon, ...why] = b.short.split(' '); return { name: cut(`${icon} ${label} — ${why.join(' ')}`), value: 'x:' + m.id }; }
        return { name: cut(label), value: String(m.id) };
      });
    }
    return json({ type: 8, data: { choices } });
  }

  const home = i.guild_id && s.cfg.channels?.[i.guild_id];
  if ((name === 'suggest' || name === 'swap') && home && i.channel_id !== home) return reply(`🍿 Movie picks happen in <#${home}> — use /${name} there!`);

  if (name === 'suggest' || name === 'swap') {
    ctx.waitUntil((async () => {
      const ch = home || i.channel_id;
      try { await followup(i, await (name === 'suggest' ? doSuggest(env, s, user, opt(i, 'movie'), ch) : doSwap(env, s, user, opt(i, 'yours'), opt(i, 'new'), ch))); }
      catch (e) { await followup(i, '⚠️ Something went wrong: ' + (e.message || e)); }
    })());
    return json({ type: 5, data: { flags: EPH } }); // "thinking…" while we look the movie up
  }
  if (name === 'mymovies' || name === 'mine') {
    const who = opt(i, 'person');
    if (!who) return reply(myMoviesText(s, user.discordId));
    const p = findPerson(s, who);
    if (!p) return reply(`Couldn't find anyone called **${who}** with movies.`);
    const mine = mineOf(s, p.discordId);
    return reply(mine.length ? `🎬 **${p.name}**'s movies: ${mine.map(e => `${e.label}${e.sub ? ` (${e.sub})` : ''}`).join(', ')}` : `**${p.name}** has no movies in right now.`);
  }
  if (name === 'list') {
    const list = s.pool.filter(e => e.status === 'active').sort((a, b) => (b.weight || 1) - (a.weight || 1));
    const total = list.reduce((t, e) => t + (e.weight || 1), 0) || 1;
    const lines = list.slice(0, 40).map((e, n) => `**${n + 1}.** ${e.kind === 'spot' ? '🎟️ ' : ''}${e.label}${e.sub ? ` (${e.sub})` : ''} — ${Math.round((e.weight || 1) / total * 1000) / 10}% · ${(e.backers || []).map(b => b.name).join(', ') || s.cfg.streamer || ''}`);
    return json({ type: 4, data: { flags: EPH, embeds: [{ title: `🍿 Movie Royal pool — ${list.length} movies`, color: 0xf5a623, description: (lines.join('\n') || 'Empty! Use /suggest to add one.').slice(0, 4000), footer: list.length > 40 ? { text: `+${list.length - 40} more` } : undefined }] } });
  }
  if (name === 'help') return reply(s.cfg.helpText || '🍿 Use /suggest to add a movie, /mymovies to see yours, /swap to trade one.');
  if (name === 'linktwitch') {
    const login = String(opt(i, 'username') || '').trim().replace(/^@/, '').toLowerCase();
    if (!/^[a-z0-9_]{3,25}$/.test(login)) return reply("That doesn't look like a Twitch username.");
    ctx.waitUntil(enqueue(env, { id: crypto.randomUUID(), at: Date.now(), type: 'link', user, login }).catch(e => console.error('link', e))); // answer Discord right away, save it right after
    return reply(`Linked! Your piece will use **${login}**'s Twitch picture, and chatting as ${login} on Twitch puts your movies on the cliff.`);
  }
  return reply('🤔 Unknown command.');
}

async function pickMovie(s, value) {
  if (String(value).startsWith('x:')) { const m = await movie(s.cfg, String(value).slice(2)); return { m, block: blockReason(s, m) || { msg: "That movie can't be picked right now." } }; }
  let id = String(value);
  if (!/^\d+$/.test(id)) { const r = await search(s.cfg, id); if (!r.length) return { err: `Couldn't find a movie called "${value}".` }; id = String(r[0].id); }
  return { m: await movie(s.cfg, id) };
}
async function doSuggest(env, s, user, value, ch) {
  const free = (userOf(s, user.discordId).free || 0) > 0; // free replacement pick: skips closed picks and the pick limit
  if (s.cfg.picksClosed && !free) return s.cfg.closedMsg || '🔒 Movie picks are closed right now.';
  const max = s.cfg.maxPerUser || 3;
  const { m, err, block } = await pickMovie(s, value);
  if (err) return err;
  if (block) return block.msg;
  const b = blockReason(s, m); if (b) return b.msg;
  if (!free && picksUsed(s, user.discordId) >= max) {
    const left = mineOf(s, user.discordId);
    return `🔒 You've used all ${max} picks. You get ${max} new ones once all of them have been picked — still waiting on: ${left.map(e => `**${e.label} (${e.sub})**`).join(', ')}.`;
  }
  const op = { id: crypto.randomUUID(), at: Date.now(), type: 'suggest', user, movie: m };
  await enqueue(env, op); applyOp(s, op);
  const label = `${m.title}${m.year ? ` (${m.year})` : ''}`, left = max - picksUsed(s, user.discordId);
  const benched = userOf(s, user.discordId).wonThisWeek;
  if (!benched) await post(s.cfg, ch, `🎬 **${label}** joined the battle royal, suggested by ${user.name}!`);
  return benched ? `🎬 **${label}** is saved! Your movie already won this week, so it sits out until **${backOn(s.cfg)}**.\n🎟️ Picks left: ${left} of ${max}`
    : `Done! 🎬 **${label}** joined the battle royal!\n🎟️ Picks left: ${left} of ${max}`;
}
async function doSwap(env, s, user, oldId, value, ch) {
  if (s.cfg.swapsLocked) return `🔒 Swaps are closed — ${s.cfg.streamer || 'the streamer'} is live. You can swap again after the stream.`;
  const old = mineOf(s, user.discordId).find(e => e.id === oldId);
  if (!old) return "That isn't one of your movies — pick one from the list.";
  const { m, err, block } = await pickMovie(s, value);
  if (err) return err;
  if (block) return block.msg;
  if (String(m.id) === String(old.tmdbId)) return "That's the same movie.";
  const b = blockReason(s, m, { swapFrom: old.id }); if (b) return b.msg;
  const op = { id: crypto.randomUUID(), at: Date.now(), type: 'swap', user, oldId: old.id, movie: m };
  await enqueue(env, op);
  const msg = `🔁 ${user.name} swapped **${old.label}${old.sub ? ` (${old.sub})` : ''}** for **${m.title}${m.year ? ` (${m.year})` : ''}**.`;
  await post(s.cfg, ch, msg);
  return 'Done! ' + msg;
}

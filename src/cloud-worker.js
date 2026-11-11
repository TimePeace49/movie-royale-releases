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

export const WORKER_V = 21;
export const WORKER_NEED = 16; // (1.71.0) the oldest 24/7 bot this app still works with: the "Update your 24/7 bot" pop-up only asks below this. 17 = the 🤝 co-stream room, only needed by whoever invites (they're asked in Settings → 🤝 Co-stream), so a friend who only joins isn't nagged
export const __test = { myMoviesText: (...a) => myMoviesText(...a), luckTxt: (...a) => luckTxt(...a), blockReason: (...a) => blockReason(...a), seriesRule: (...a) => seriesRule(...a) }; // (🧪 Movie Royal's Test tab shows what this bot would answer) // bump when this file changes: the app offers to update the bot
export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    try {
      if (url.pathname.startsWith('/co/')) return await coRoom(req, env, url); // 🤝 co-stream room (17): two streamers' Movie Royals linked
      if (url.pathname === '/live' || url.pathname === '/live/' || url.pathname.startsWith('/site/')) return await siteRoute(req, env, url); // 🌐 the viewer website (18)
      if (url.pathname === '/eggs' || url.pathname === '/eggs/' || url.pathname.startsWith('/eggs/') || url.pathname === '/creatures.js') return await eggRoute(req, env, url); // 🥚 the egg game's public page (20)
      if (url.pathname === '/omdb' || url.pathname === '/omdb/key') return await omdbRoute(req, env, url, ctx); // ⭐🍅 (21) the streamer's OMDb key, shared with every edition's app (the key itself never leaves here)
      if (url.pathname === '/sync') return await sync(req, env);
      if (url.pathname === '/sync/pic') return await putPic(req, env, url); // 🎨 the app uploads the /character picture sheets from the streamer's PC
      if (url.pathname === '/characters' || url.pathname === '/characters/' || url.pathname === '/characters.html') { const b = await env.KV.get('pic:sitehtml'); return new Response(b || 'The parts website is not uploaded yet: the streamer opens Movie Royal once.', { status: b ? 200 : 404, headers: { 'content-type': b ? 'text/html; charset=utf-8' : 'text/plain', 'cache-control': 'public, max-age=300' } }); } // 🌐 the parts website (uploaded from the streamer's PC)
      if (/^\/(characters\/)?charparts\.js$/.test(url.pathname)) { const b = await env.KV.get('pic:sitejs'); return new Response(b || '', { status: b ? 200 : 404, headers: { 'content-type': 'application/javascript; charset=utf-8', 'cache-control': 'public, max-age=300' } }); }
      if (url.pathname === '/chars/v') return new Response((await env.KV.get('picsV')) || '', { headers: { 'content-type': 'text/plain' } });
      const pm = url.pathname.match(/^\/chars\/([a-z0-9]+)\.png$/);
      if (pm) { const b = await env.KV.get('pic:' + pm[1], 'arrayBuffer'); return b ? new Response(b, { headers: { 'content-type': 'image/png', 'cache-control': 'public, max-age=86400' } }) : new Response('not found', { status: 404 }); }
      if (url.pathname === '/health') { // ?deep=1: also check the storage works (the backup bot server uses this)
        if (url.searchParams.has('deep')) { try { await env.KV.get('config'); } catch (e) { return json({ ok: false, error: 'storage: ' + (e?.message || e), v: WORKER_V }, 503); } }
        return json({ ok: true, at: Date.now(), v: WORKER_V });
      }
      if (req.method === 'POST' && url.pathname === '/') {
        try { return await interaction(req, env, ctx); }
        catch (e) { // never leave Discord hanging ("the application did not respond"): say what went wrong
          console.error(e); const m = String(e?.message || e); ctx.waitUntil(debugPost(env, null, 'a command failed', m));
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

// 🎨 /character picture sheets, sent from the streamer's PC (only when they change: KV writes are limited)
async function putPic(req, env, url) {
  if ((req.headers.get('authorization') || '') !== `Bearer ${env.SYNC_KEY}`) return json({ error: 'bad key' }, 401);
  if (req.method !== 'PUT') return json({ error: 'PUT only' }, 405);
  if (url.searchParams.get('done')) { await env.KV.put('picsV', String(url.searchParams.get('v') || '')); return json({ ok: true }); }
  const name = String(url.searchParams.get('name') || ''); if (!/^[a-z0-9]{1,20}$/.test(name)) return json({ error: 'bad name' }, 400);
  const buf = await req.arrayBuffer(); if (!buf.byteLength || buf.byteLength > 5e6) return json({ error: 'bad size' }, 400);
  await env.KV.put('pic:' + name, buf);
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
  const s = { cfg, queue: queue || [], pool: (cfg.pool || []).map(e => ({ ...e })), users: JSON.parse(JSON.stringify(cfg.users || {})), links: { ...(cfg.links || {}) }, looks: { ...(cfg.looks || {}) } };
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
  else if (op.type === 'look') s.looks[op.user.discordId] = op.look;
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
// 🚫 automatic ban rules: a COPY of src/banrules.js (keep them the same)
const STORY = /^(action|adventure|animation|comedy|drama|fantasy|horror|mystery|romance|science fiction|thriller|western)$/;
const HARD = /^(christian film|christian movie|christian drama|faith[- ]based( film| movie)?|religious film|biblical epic|bible epic)$/;
const STRONG = /^(bible|biblical|jesus christ|jesus|moses|old testament|new testament|ten commandments|crucifixion|passion of christ|gospel|apostle|virgin mary|noah's ark|life of jesus|resurrection of jesus|christian faith)$/;
const WEAK = /^(christianity|christian|religion|faith|god|prayer|church|pastor|catholic|catholicism|judaism|islam|prophet|miracle|heaven|angel|salvation|baptism|missionary|saint|evangelism|evangelical)$/;
const NOT_PREACHY = /^(comedy|horror|action|science fiction|thriller)$/; // satire, exorcism horror, action movies with a bible in them…
// 🗣️ dubbed movies are fine (1.61.0, Derek): TMDB doesn't say which movies have an English dub, so this guesses: cartoons/anime
// and well-known movies (at least rules.dubVotes TMDB votes, default 1000) almost always have one. Small foreign movies still get banned.
function likelyDubbed(m, g, rules = {}) { return g.includes('animation') || (Number(m.votes) || 0) >= Math.max(1, Number(rules.dubVotes) || 1000); }
function ruleBan(m, rules = {}) {
  if (!m || !Array.isArray(m.spoken)) return null; // needs the full TMDB details
  const g = (m.allGenres || m.genres || []).map(x => String(x).toLowerCase()), kw = (m.keywords || []).map(x => String(x).toLowerCase().trim());
  if (rules.english !== false) {
    const sp = m.spoken.filter(x => x && x !== 'xx'), orig = m.lang || '';
    if ((sp.length ? !sp.includes('en') : (orig && orig !== 'en' && orig !== 'xx')) && !(rules.dubbed !== false && likelyDubbed(m, g, rules))) return { key: 'english', short: 'not in English', reason: 'not in English' };
  }
  if (rules.documentary !== false && g.includes('documentary') && !g.some(x => STORY.test(x))) return { key: 'documentary', short: 'documentary', reason: 'documentary' };
  if (rules.religious !== false) {
    const hard = kw.some(k => HARD.test(k)), strong = kw.filter(k => STRONG.test(k)).length, weak = kw.filter(k => WEAK.test(k)).length;
    if (hard || (!g.some(x => NOT_PREACHY.test(x)) && (strong >= 1 || weak >= 3))) return { key: 'religious', short: 'religious', reason: 'religious movie' };
  }
  return null;
}
function blockReason(s, m, opts = {}) {
  const cfg = s.cfg, label = `${m.title}${m.year ? ` (${m.year})` : ''}`, who = cfg.streamer || 'the streamer';
  const existing = s.pool.find(e => String(e.tmdbId) === String(m.id) && e.status !== 'removed');
  if (existing?.status === 'watched' || (cfg.wonIds || []).includes(String(m.id))) return { short: '✅ already won', msg: `✅ **${label}** already won a battle royal and got watched.` };
  if (watched(cfg, m)) return { short: '✅ already watched', msg: `✅ ${who} has already watched **${label}** — pick another movie!` };
  const ban = (cfg.bans || []).find(b => String(b.tmdbId) === String(m.id));
  const banMsg = reason => `🚫 **${label}** is banned${reason ? ` (${reason})` : ''}. Banned movies need ${who}'s OK first: ask **${cfg.banAsk || 'Kirb'}** to unban it if you want to suggest it. Otherwise, pick another movie!`;
  if (ban?.auto === 'sequel') return { short: '🎞️ watch in order', msg: `🎞️ **${label}** can't be picked yet: ${who} watches series in order, so **${ban.next || 'the movie before it'}** has to be watched first.` };
  if (ban) return { short: '🚫 banned', msg: banMsg(ban.reason) };
  if (m.id) { const lk = Object.values(cfg.seriesLocks || {}).find(l => String(l.nextId) === String(m.id) && l.discordId !== opts.userId); // 🔒 someone's series
    if (lk && opts.userId !== undefined) return { short: `🔒 ${lk.name}'s series`, msg: `🔒 The *${lk.series || 'series'}* is locked for **${lk.name}**: they get first pick of **${label}**. If they don't pick it with their next movies, it opens up for everyone.` }; }
  const rb = (cfg.banOk || []).includes(String(m.id)) ? null : ruleBan(m, cfg.banRules || {});
  if (rb) return { short: '🚫 ' + rb.short, msg: banMsg(rb.reason) };
  const year = String(new Date().getFullYear());
  if (cfg.banCurrentYear !== false && m.year === year && !(cfg.yearAllow || []).includes(String(m.id))) return { short: `🚫 ${year} movie`, msg: `🚫 Movies from ${year} aren't allowed — **${label}** is too new. Pick another movie!` };
  if (m.collection) {
    const sib = s.pool.find(e => IN_POOL.includes(e.status) && e.collection?.id === m.collection.id && String(e.tmdbId) !== String(m.id) && e.id !== opts.swapFrom);
    if (sib) return { short: '🚫 series taken', msg: `🚫 **${sib.label}${sib.sub ? ` (${sib.sub})` : ''}** from the *${m.collection.name}* is already picked, so no other movie from that series can go in. Pick something else!` };
  }
  if (existing && IN_POOL.includes(existing.status) && existing.id !== opts.swapFrom) return { short: '🔒 already picked', msg: `🔒 **${label}** was already picked by **${existing.backers?.[0]?.name || who}** — everyone needs a different movie. Pick another one!` };
  return null;
}

// 🎞️ series in order: a COPY of nextPart/seriesRule in src/series.js (keep them the same)
const partLabel = p => `${p.title}${p.year ? ` (${p.year})` : ''}`;
function nextPart(parts, seen) { const t = new Date().toISOString().slice(0, 10); return parts.filter(p => p.date && p.date <= t).find(p => !seen(p)) || null; }
function seriesRule({ parts, seen, lock, movieId, userId, name, streamer, ok }) {
  const me = parts.find(p => String(p.id) === String(movieId)); if (!me?.date || seen(me) || ok?.(me)) return null;
  const next = nextPart(parts, seen); if (!next) return null;
  if (String(me.id) !== String(next.id) && me.date > next.date)
    return { key: 'sequel', next, short: '🎞️ watch in order', msg: `🎞️ **${partLabel(me)}** can't be picked yet: ${streamer} watches the *${name}* in order, so **${partLabel(next)}** has to be watched first.` };
  if (String(me.id) === String(next.id) && lock?.discordId && lock.discordId !== userId)
    return { key: 'locked', next, short: `🔒 ${lock.name}'s series`, msg: `🔒 The *${name}* is locked for **${lock.name}**: they get first pick of **${partLabel(next)}**. If they don't pick it with their next movies, it opens up for everyone.` };
  return null;
}
async function seriesBlock(s, m, userId) { // (a series Movie Royal hasn't seen yet: ask TMDB which movies are in it)
  const c = m?.collection; if (!c?.id || (s.cfg.banOk || []).includes(String(m.id))) return null;
  try {
    const r = await tmdb(s.cfg, `/collection/${encodeURIComponent(c.id)}?language=en-US`);
    const parts = (r.parts || []).map(p => ({ id: String(p.id), title: p.title, year: (p.release_date || '').slice(0, 4), date: p.release_date || '' })).sort((a, b) => (a.date || '9').localeCompare(b.date || '9'));
    const won = new Set([...(s.cfg.wonIds || []), ...s.pool.filter(e => e.status === 'watched').map(e => String(e.tmdbId))]);
    const seen = p => won.has(String(p.id)) || watched(s.cfg, p), lock = (s.cfg.seriesLocks || {})[c.id];
    return seriesRule({ parts, seen, lock, movieId: m.id, userId, name: r.name || c.name, streamer: s.cfg.streamer || 'the streamer', ok: p => (s.cfg.banOk || []).includes(String(p.id)) });
  } catch { return null; }
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
  const m = await tmdb(cfg, `/movie/${encodeURIComponent(id)}?language=en-US&append_to_response=keywords`);
  return { ...shape(m), collection: m.belongs_to_collection ? { id: m.belongs_to_collection.id, name: m.belongs_to_collection.name } : null,
    lang: m.original_language || '', votes: m.vote_count || 0, allGenres: (m.genres || []).map(g => g.name), spoken: (m.spoken_languages || []).map(l => l.iso_639_1), keywords: (m.keywords?.keywords || []).map(k => k.name) };
}
async function manyMovies(cfg, ids, ms = 1600) {
  const out = new Map();
  await Promise.race([Promise.all(ids.map(id => movie(cfg, id).then(v => out.set(String(id), v)).catch(() => {}))), new Promise(r => setTimeout(r, ms))]);
  return out;
}

// 🐞 problems go to the mods-only #movie-royal-debug channel (set up by the app)
async function debugPost(env, cfg, what, msg) {
  try {
    cfg ||= await env.KV.get('config', 'json');
    const text = `⚠️ **24/7 Discord bot: ${what}**\n👉 If it keeps happening: tell Claude (Movie Royal → 🧪 Test → ⚠️ Errors → 🛠️ For Claude).\n\`\`\`\n${String(msg).slice(0, 900)}\n24/7 bot v${WORKER_V} · ${new Date().toISOString()}\n\`\`\``;
    for (const ch of cfg?.debugChannels || []) await post(cfg, ch, text);
  } catch {}
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
  if (!s.cfg.swapsLocked && mine.length) head += s.cfg.swapHint || ' (You can /swap any of them until the stream starts.)';
  const tag = e => e.status === 'benched' ? ` 💤 back ${backOn(s.cfg)}` : e.status === 'paused' ? ' ⏸ paused' : e.status === 'away' ? ' 💤 out tonight' : '';
  return head + (mine.length ? '\n' + mine.map(e => `• ${e.label}${e.sub ? ` (${e.sub})` : ''}${tag(e)}${luckTxt(s, e)}${e.pending ? ' ⏳' : ''}`).join('\n') : '');
}
// 🍀 every movie's luck (1.61.5, the same words as the app's /mymovies): its own luck + the picker's 👀 watch luck
const pctTxt = n => String(Math.round((Number(n) || 0) * 100) / 100);
function luckTxt(s, e) {
  const own = s.cfg.luckOn ? Number(e.luckPct) || 0 : 0, wl = e.kind === 'spot' ? 0 : Number(s.users?.[e.backers?.[0]?.discordId]?.watchLuck) || 0; if (!s.cfg.luckOn && !wl) return '';
  return ` · 🍀 **${pctTxt(Math.min(100, own + wl))}%** luck${wl ? ` (${pctTxt(own)}% + 👀 ${pctTxt(wl)}% watch luck)` : ''}`;
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
  if (!env.SKIP_VERIFY && !(await verify(req, body, cfg?.publicKey))) return new Response('bad signature', { status: 401 }); // (SKIP_VERIFY: only the backup bot server, which gets commands straight from Discord's live connection)
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
      catch (e) { await followup(i, '⚠️ Something went wrong: ' + (e.message || e)); await debugPost(env, s.cfg, `/${name} by ${user.name} failed`, String(e?.message || e)); }
    })());
    return json({ type: 5, data: { flags: EPH } }); // "thinking…" while we look the movie up
  }
  if (name === 'mymovies' || name === 'mine') {
    const who = opt(i, 'person');
    if (!who) return reply(myMoviesText(s, user.discordId));
    const p = findPerson(s, who);
    if (!p) return reply(`Couldn't find anyone called **${who}** with movies.`);
    const mine = mineOf(s, p.discordId);
    return reply(mine.length ? `🎬 **${p.name}**'s movies: ${mine.map(e => `${e.label}${e.sub ? ` (${e.sub})` : ''}${luckTxt(s, e)}`).join(', ')}` : `**${p.name}** has no movies in right now.`);
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
  if (name === 'character') return characterCmd(env, ctx, s, i, user, new URL(req.url).origin);
  return reply('🤔 Unknown command.');
}

// 🎨 /character: a number for each part. A COPY of characterReply in src/looks.js (keep them alike).
const PARTS0 = ['hair', 'outfit', 'makeup', 'facialhair', 'body', 'skin', 'haircolor', 'accessory', 'hairaccessory']; // (v13: Movie Royal sends its own list in cfg.lookParts / cfg.lookLabels, so new parts work without a bot update)
const PLABEL0 = { hair: '💇 Hair', outfit: '👕 Outfit', makeup: '💄 Makeup', facialhair: '🧔 Facial hair', body: '🧍 Body', skin: '✋ Skin', haircolor: '🎨 Hair color', accessory: '🎩 Head accessory', hairaccessory: '🎀 Hair accessory' };
let PARTS = PARTS0, PLABEL = PLABEL0;
const SHEETS = [['hair', "💇 Hair 1–25 (men's styles)"], ['hair2', "💇 Hair 26–50 (women's styles)"], ['outfit', "👕 Outfits 1–25 (men's)"], ['outfit2', "👗 Outfits 26–50 (women's)"], ['outfit3', '🦸 Outfits 51–75 (costumes)'], ['makeup', '💄 Makeup'], ['facialhair', '🧔 Facial hair'], ['body', '🧍 Body'], ['colors', '🎨 Skin + hair color']];
const PDEF = { skin: 3, haircolor: 2, body: 1 };
function lookText(N, look) { return PARTS.map(k => `${PLABEL[k]} **#${look?.[k] || PDEF[k] || 1}** ${(N[k] || [])[(look?.[k] || PDEF[k] || 1) - 1] || '?'}${look?.[k] ? '' : ' *(not picked yet)*'}`).join('\n'); }
function characterCmd(env, ctx, s, i, user, origin) {
  const N = s.cfg.lookNames, cc = i.guild_id && s.cfg.charChannels?.[i.guild_id];
  PARTS = Array.isArray(s.cfg.lookParts) ? s.cfg.lookParts : PARTS0; PLABEL = { ...PLABEL0, ...(s.cfg.lookLabels || {}) };
  if (cc && i.channel_id !== cc) return reply(`🎨 Characters are made in <#${cc}>: use /character there!`);
  if (!N || s.cfg.looksOn === false) return reply(`🎨 Custom characters aren't on right now${N ? '' : ' (open Movie Royal once so the 24/7 bot gets them)'}.`);
  const cur = s.looks[user.discordId] || null, picks = {};
  for (const k of PARTS) { const v = opt(i, k); if (v != null) picks[k] = v; }
  const how = 'Type **/character** and fill in a number for each part, for example `/character hair:7 outfit:3 makeup:1 facialhair:8 accessory:17`. You only need the parts you want to change (also `hairaccessory`, `body`, `skin` and `haircolor`). Pick 1 of each.';
  if (!Object.keys(picks).length) {
    const site = s.cfg.charSite;
    const text = `🎨 **Make your own Movie Royal character!** ${site ? `See every part with its number (and try them on) here: <${site}>` : 'Look at the pictures below and pick a number for each part.'}\n${how}\n\n${cur ? `**Your character right now:**\n${lookText(N, cur)}` : "You haven't made one yet: until you do, your piece is a random character."}`;
    if (site) return reply(text); // 🌐 the parts website: just the link
    const base = s.cfg.picsUrl || origin, v = s.cfg.lookPics;
    const embeds = v ? SHEETS.map(([k, t]) => ({ title: t, color: 0xffd23f, image: { url: `${base}/chars/${k}.png?v=${v}` } })) : [];
    const list = v ? '' : '\n\n' + PARTS.map(k => `${PLABEL[k]}: ${N[k].map((x, n) => `${n + 1} ${x}`).join(' · ')}`).join('\n'); // no pictures uploaded yet: the numbers in words
    return json({ type: 4, data: { content: (text + list).slice(0, 2000), embeds, flags: EPH, allowed_mentions: { parse: [] } } });
  }
  const look = { ...(cur || {}) }, bad = [];
  for (const k of PARTS) { const v = picks[k]; if (v == null) continue; const n = Number(v); if (!Number.isInteger(n) || n < 1 || n > N[k].length) bad.push(`${PLABEL[k]}: pick 1 to ${N[k].length}`); else look[k] = n; }
  if (bad.length) return reply(`🤔 Those numbers aren't on the list:\n${bad.join('\n')}\n${s.cfg.charSite ? `Every part with its number: <${s.cfg.charSite}>` : 'Type **/character** with nothing after it to see the pictures again.'}`);
  const home = i.guild_id && s.cfg.channels?.[i.guild_id];
  ctx.waitUntil(enqueue(env, { id: crypto.randomUUID(), at: Date.now(), type: 'look', user, look, first: !cur, token: i.token, app: i.application_id, ch: cc || home || i.channel_id }).catch(e => console.error('look', e))); // answer Discord right away, save it right after (the app adds a picture: token = this answer)
  const linked = !!s.links[user.discordId];
  return reply(`✅ **Saved! This is your character now:**\n${lookText(N, look)}\n\nYou'll be this character in Movie Royal battles that use 🧍 characters${linked ? '' : ' (to be your character in Twitch chat battles too, link your Twitch name with **/linktwitch**)'}. Change any part any time with **/character**.\n🖼️ A small picture of your character shows up here once Movie Royal picks it up (in a minute or so while it's open).`);
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
  const b = blockReason(s, m, { userId: user.discordId }) || await seriesBlock(s, m, user.discordId); if (b) return b.msg;
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
  if (s.cfg.swapsLocked) return s.cfg.swapMsg || `🔒 Swaps are closed — ${s.cfg.streamer || 'the streamer'} is live. You can swap again after the stream.`;
  const old = mineOf(s, user.discordId).find(e => e.id === oldId);
  if (!old) return "That isn't one of your movies — pick one from the list.";
  const { m, err, block } = await pickMovie(s, value);
  if (err) return err;
  if (block) return block.msg;
  if (String(m.id) === String(old.tmdbId)) return "That's the same movie.";
  const b = blockReason(s, m, { swapFrom: old.id, userId: user.discordId }) || await seriesBlock(s, m, user.discordId); if (b) return b.msg;
  const op = { id: crypto.randomUUID(), at: Date.now(), type: 'swap', user, oldId: old.id, movie: m };
  await enqueue(env, op);
  const msg = `🔁 ${user.name} swapped **${old.label}${old.sub ? ` (${old.sub})` : ''}** for **${m.title}${m.year ? ` (${m.year})` : ''}**.`;
  await post(s.cfg, ch, msg);
  return 'Done! ' + msg;
}


// 🤝 Co-stream room (WORKER_V 17): the streamer who invites hosts the room here; both Movie Royals connect to it with a WebSocket.
// It only passes messages along (battle state + chat chaos) and remembers each side's last state for whoever joins next.
// The room name is a long random code from the invite, so nobody can guess it. Uses a free Durable Object (SQLite) called CO.
async function coRoom(req, env, url) {
  const room = url.pathname.slice(4).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64);
  if (room.length < 16) return json({ ok: false, error: 'bad room' }, 400);
  if (!env.CO) return json({ ok: false, error: 'This 24/7 bot was put on Cloudflare before co-streaming existed: update it in Movie Royal.' }, 501);
  if ((req.headers.get('Upgrade') || '').toLowerCase() !== 'websocket') return json({ ok: true, room: true, v: WORKER_V });
  return env.CO.get(env.CO.idFromName(room)).fetch(req);
}
export class CoRoom {
  constructor(ctx, env) {
    this.ctx = ctx; this.env = env;
    try { ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong')); } catch {} // (keep-alives don't wake the room up: cheaper)
  }
  async fetch(req) {
    if (new URL(req.url).pathname.startsWith('/site/')) return this.site(req); // 🌐 the same free room class runs the viewer website (one room called "site:main"), so no new Cloudflare setup step
    const url = new URL(req.url), clean = (v, n) => String(v || '').replace(/[\u0000-\u001f]/g, '').slice(0, n);
    const id = clean(url.searchParams.get('id'), 40) || crypto.randomUUID(), who = clean(url.searchParams.get('who'), 40) || 'someone';
    for (const old of this.ctx.getWebSockets(id)) { try { old.close(4000, 'replaced'); } catch {} } // the same app reconnecting
    if (this.ctx.getWebSockets().filter(w => (w.deserializeAttachment() || {}).id !== id).length >= 6) return new Response('room full', { status: 429 });
    const pair = new WebSocketPair(), [client, server] = Object.values(pair);
    this.ctx.acceptWebSocket(server, [id]);
    server.serializeAttachment({ id, who, state: null });
    const here = this.ctx.getWebSockets().filter(w => w !== server).map(w => w.deserializeAttachment()).filter(a => a && a.id !== id);
    server.send(JSON.stringify({ t: 'room', you: id, here }));
    this.cast(server, { t: 'join', from: id, who });
    return new Response(null, { status: 101, webSocket: client });
  }
  cast(from, msg) { const s = JSON.stringify(msg); for (const w of this.ctx.getWebSockets()) if (w !== from) { try { w.send(s); } catch {} } }
  async webSocketMessage(ws, raw) {
    if ((ws.deserializeAttachment() || {}).site) return this.siteMsg(ws, raw);
    if (typeof raw !== 'string' || raw.length > 16000) return;
    let m; try { m = JSON.parse(raw); } catch { return; }
    if (!m || typeof m.t !== 'string') return;
    const a = ws.deserializeAttachment() || {};
    if (m.t === 'state') { a.state = m.state ?? null; ws.serializeAttachment(a); }
    this.cast(ws, { ...m, from: a.id, who: a.who });
  }
  gone(ws) {
    const a = ws.deserializeAttachment() || {};
    if (a.site) return this.siteGone(ws);
    if (this.ctx.getWebSockets(a.id).some(w => w !== ws)) return; // (it reconnected already: not gone)
    this.cast(ws, { t: 'leave', from: a.id, who: a.who });
  }
  async webSocketClose(ws, code) { this.gone(ws); try { ws.close(code === 1000 || (code >= 3000 && code < 5000) ? code : 1000, 'bye'); } catch {} }
  async webSocketError(ws) { this.gone(ws); }
}

// ---------- 🌐 Viewer website (WORKER_V 18, Derek: "a bootleg extension") ----------
// <bot>/live = a page for viewers: the stream + the battle on right now (who's in, odds, who paid), the history of every battle
// with a link to that moment in the VOD, stats, predictions (sign in with Twitch) and polls. Movie Royal (on the streamer's PC)
// connects to the "site:main" room with the SYNC_KEY and sends everything; viewers only read, plus their own guesses / votes.
// The page itself is uploaded from the PC into KV (only when it changes). Everything else lives in the room's free SQLite storage.
// 🥚 The egg game's public page (20): the streamer's PC uploads the page + the creature drawings once (when they change) and a copy of
// names + creatures every few minutes (only when something changed: KV writes are limited). Viewers only read.
// ⭐🍅 (WORKER_V 21, Derek: "everyone just uses my IMDb and Rotten Tomatoes key so they don't have to set one up"): Movie Royal apps without their own OMDb key ask here;
// this adds the key that the streamer's own app stored (PUT /omdb/key with the sync key) and asks OMDb. Answers are cached a day, so the same movie isn't asked twice.
async function omdbRoute(req, env, url, ctx) {
  if (url.pathname === '/omdb/key') {
    if ((req.headers.get('authorization') || '') !== `Bearer ${env.SYNC_KEY}`) return json({ error: 'bad key' }, 401);
    if (req.method === 'GET') return json({ ok: true, shared: !!(await env.KV.get('omdb:key')) });
    if (req.method !== 'PUT') return json({ error: 'PUT only' }, 405);
    const b = await req.json().catch(() => ({})), k = String(b.key || '').trim();
    if (!k) { await env.KV.delete('omdb:key'); return json({ ok: true, shared: false }); }
    if (!/^[A-Za-z0-9]{6,40}$/.test(k)) return json({ error: "That doesn't look like an OMDb key" }, 400);
    await env.KV.put('omdb:key', k); return json({ ok: true, shared: true });
  }
  const q = new URLSearchParams(); for (const n of ['i', 't', 'y', 'type']) { const v = url.searchParams.get(n); if (v) q.set(n, v.slice(0, 200)); }
  if (!q.get('i') && !q.get('t')) return json({ Response: 'False', Error: 'Ask with ?i= (an IMDb id) or ?t= (a title)' }, 400);
  const key = await env.KV.get('omdb:key'); if (!key) return json({ Response: 'False', Error: 'The shared OMDb key is switched off' }, 503);
  const cache = globalThis.caches?.default, ck = new Request('https://omdb.cache/?' + q.toString()); const hit = cache && await cache.match(ck); if (hit) return hit;
  q.set('apikey', key); const r = await fetch('https://www.omdbapi.com/?' + q.toString()); const body = await r.text();
  const out = new Response(body, { status: r.ok ? 200 : r.status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'public, max-age=86400' } });
  if (cache && r.ok && !/Request limit|Invalid API key/i.test(body)) ctx?.waitUntil?.(cache.put(ck, out.clone())); return out;
}
async function eggRoute(req, env, url) {
  const p = url.pathname, text = (b, type, age) => new Response(b || 'The egg game page is not uploaded yet: the streamer opens Movie Royal once.', { status: b ? 200 : 404, headers: { 'content-type': b ? type : 'text/plain; charset=utf-8', 'cache-control': b ? `public, max-age=${age}` : 'no-store' } });
  if (p === '/eggs' || p === '/eggs/') return text(await env.KV.get('eggs:page'), 'text/html; charset=utf-8', 120);
  if (p === '/creatures.js' || p === '/eggs/creatures.js') return text(await env.KV.get('eggs:js'), 'application/javascript; charset=utf-8', 300);
  if (p === '/eggs/data') return new Response((await env.KV.get('eggs:data')) || '{"players":[],"count":120,"commands":{}}', { headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'public, max-age=60' } });
  if (p === '/eggs/v') return new Response((await env.KV.get('eggs:v')) || '', { headers: { 'content-type': 'text/plain' } });
  if (p === '/eggs/put') {
    if ((req.headers.get('authorization') || '') !== `Bearer ${env.SYNC_KEY}`) return json({ error: 'bad key' }, 401);
    if (req.method !== 'PUT') return json({ error: 'PUT only' }, 405);
    const name = url.searchParams.get('name'); if (!['page', 'js', 'data'].includes(name)) return json({ error: 'bad name' }, 400);
    const body = await req.text(); if (!body || body.length > 4e6) return json({ error: 'bad size' }, 400);
    await env.KV.put('eggs:' + name, body); if (name === 'page') await env.KV.put('eggs:v', String(url.searchParams.get('v') || '')); return json({ ok: true });
  }
  return json({ error: 'not found' }, 404);
}
async function siteRoute(req, env, url) {
  const p = url.pathname;
  if (p === '/live' || p === '/live/') { const b = await env.KV.get('site:page'); return new Response(b || 'The viewer website is not turned on yet: the streamer turns it on in Movie Royal (Settings → 🌐 Viewer site).', { status: b ? 200 : 404, headers: { 'content-type': b ? 'text/html; charset=utf-8' : 'text/plain; charset=utf-8', 'cache-control': 'no-cache' } }); }
  const authed = (req.headers.get('authorization') || '') === `Bearer ${env.SYNC_KEY}`;
  if (p === '/site/page/v') return new Response((await env.KV.get('site:pagev')) || '', { headers: { 'content-type': 'text/plain' } });
  if (p === '/site/page') { // (the PC uploads the page: only when it changed, KV writes are limited)
    if (!authed) return json({ error: 'bad key' }, 401);
    if (req.method !== 'PUT') return json({ error: 'PUT only' }, 405);
    const body = await req.text(); if (!body || body.length > 2e6) return json({ error: 'bad size' }, 400);
    await env.KV.put('site:page', body); await env.KV.put('site:pagev', String(url.searchParams.get('v') || '')); return json({ ok: true });
  }
  if (p.startsWith('/site/img/')) { // 🖼️ map screenshots + battle pictures for the website (19), uploaded once each by the PC
    const h = p.slice(10).replace(/[^a-f0-9]/g, '').slice(0, 40), v = h && await env.KV.getWithMetadata('site:img:' + h, { type: 'arrayBuffer' });
    if (!v?.value) return new Response('no picture', { status: 404 });
    return new Response(v.value, { headers: { 'content-type': v.metadata?.type || 'image/jpeg', 'cache-control': 'public, max-age=31536000, immutable' } });
  }
  if (p === '/site/img' && req.method === 'PUT') {
    if (!authed) return json({ error: 'bad key' }, 401);
    const h = String(url.searchParams.get('h') || '').replace(/[^a-f0-9]/g, '').slice(0, 40), body = await req.arrayBuffer();
    if (!h || !body.byteLength || body.byteLength > 3e6) return json({ error: 'bad picture' }, 400);
    await env.KV.put('site:img:' + h, body, { metadata: { type: String(req.headers.get('content-type') || 'image/jpeg').slice(0, 40) } }); return json({ ok: true });
  }
  if (!env.CO) return json({ error: 'This 24/7 bot needs an update in Movie Royal.' }, 501);
  if (p === '/site/app' && !authed) return json({ error: 'bad key' }, 401);
  const r = new Request(req); r.headers.set('x-mr-app', p === '/site/app' && authed ? '1' : '0');
  return env.CO.get(env.CO.idFromName('site:main')).fetch(r);
}
const b64u = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const ub64 = s => { s = String(s || '').replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; return atob(s); };
async function hmac(key, text) { const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(String(key || 'x')), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']); return b64u(await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(text))); }
const SITE_J = (x, status = 200) => new Response(JSON.stringify(x), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
const ptsFor = pct => Math.max(1, Math.min(50, Math.round(100 / Math.max(1, Number(pct) || 50)))); // longer odds = more points (50% → 2, 10% → 10, 2% → 50)
const SITE = {
  sInit() {
    if (this._sInit) return; this._sInit = true;
    const q = this.ctx.storage.sql;
    q.exec(`CREATE TABLE IF NOT EXISTS hist (id TEXT PRIMARY KEY, at INTEGER, j TEXT)`); q.exec(`CREATE INDEX IF NOT EXISTS hist_at ON hist(at)`);
    q.exec(`CREATE TABLE IF NOT EXISTS pred (pid TEXT, uid TEXT, login TEXT, name TEXT, pick TEXT, PRIMARY KEY (pid, uid))`);
    q.exec(`CREATE TABLE IF NOT EXISTS pts (uid TEXT PRIMARY KEY, login TEXT, name TEXT, pts INTEGER, right INTEGER, tries INTEGER)`);
    q.exec(`CREATE TABLE IF NOT EXISTS vote (poll TEXT, uid TEXT, opt INTEGER, PRIMARY KEY (poll, uid))`);
    q.exec(`CREATE TABLE IF NOT EXISTS prof (login TEXT PRIMARY KEY, at INTEGER, j TEXT)`);
    q.exec(`CREATE TABLE IF NOT EXISTS doc (k TEXT PRIMARY KEY, j TEXT)`);
  },
  sGet(k) { this.sInit(); const r = this.ctx.storage.sql.exec(`SELECT j FROM doc WHERE k = ?`, k).toArray()[0]; try { return r ? JSON.parse(r.j) : null; } catch { return null; } },
  sPut(k, v) { this.sInit(); this.ctx.storage.sql.exec(`INSERT INTO doc (k, j) VALUES (?, ?) ON CONFLICT(k) DO UPDATE SET j = excluded.j`, k, JSON.stringify(v ?? null)); },
  sApp() { return this.ctx.getWebSockets('app')[0] || null; },
  sToApp(m) { const a = this.sApp(); if (a) { try { a.send(JSON.stringify(m)); } catch {} } },
  sViewers() { return this.ctx.getWebSockets('viewer'); },
  sCast(m) { const s = JSON.stringify(m); for (const w of this.sViewers()) { try { w.send(s); } catch {} } },
  async sSession(tok) { // "<b64 json>.<sig>" made at sign-in
    const [body, sig] = String(tok || '').split('.'); if (!body || !sig) return null;
    if (await hmac(this.env.SYNC_KEY, 'site:' + body) !== sig) return null;
    try { const u = JSON.parse(decodeURIComponent(escape(ub64(body)))); return u.exp > Date.now() ? u : null; } catch { return null; }
  },
  sPollOut(poll, uid) {
    if (!poll) return null; this.sInit();
    const c = this.ctx.storage.sql.exec(`SELECT opt, COUNT(*) AS n FROM vote WHERE poll = ? GROUP BY opt`, poll.id).toArray(), counts = poll.opts.map((_, i) => Number(c.find(r => r.opt === i)?.n || 0));
    const mine = uid ? this.ctx.storage.sql.exec(`SELECT opt FROM vote WHERE poll = ? AND uid = ?`, poll.id, uid).toArray()[0] : null;
    return { ...poll, counts, mine: mine ? mine.opt : null };
  },
  sPredOut(pid, uid) {
    if (!pid) return null; this.sInit();
    const c = this.ctx.storage.sql.exec(`SELECT pick, COUNT(*) AS n FROM pred WHERE pid = ? GROUP BY pick`, pid).toArray(), counts = {}; for (const r of c) counts[r.pick] = Number(r.n);
    const mine = uid ? this.ctx.storage.sql.exec(`SELECT pick FROM pred WHERE pid = ? AND uid = ?`, pid, uid).toArray()[0] : null;
    return { pid, counts, mine: mine ? mine.pick : null };
  },
  sTop(n = 25) { this.sInit(); return this.ctx.storage.sql.exec(`SELECT login, name, pts, right, tries FROM pts ORDER BY pts DESC, right DESC LIMIT ?`, n).toArray(); },
  sLater(key, ms, fn) { (this._t ||= {}); if (this._t[key]) return; this._t[key] = setTimeout(() => { this._t[key] = null; try { fn(); } catch {} }, ms); },
  async site(req) {
    const url = new URL(req.url), p = url.pathname; this.sInit();
    if (p === '/site/app') { // Movie Royal (checked by the worker: x-mr-app)
      if (req.headers.get('x-mr-app') !== '1' || (req.headers.get('Upgrade') || '').toLowerCase() !== 'websocket') return SITE_J({ error: 'no' }, 401);
      for (const old of this.ctx.getWebSockets('app')) { try { old.close(4000, 'replaced'); } catch {} }
      const pair = new WebSocketPair(), [client, server] = Object.values(pair);
      this.ctx.acceptWebSocket(server, ['app']); server.serializeAttachment({ site: true, app: true });
      const last = this.ctx.storage.sql.exec(`SELECT MAX(at) AS m, COUNT(*) AS n FROM hist`).toArray()[0] || {};
      server.send(JSON.stringify({ t: 'have', last: Number(last.m || 0), n: Number(last.n || 0), viewers: this.sViewers().length }));
      this.sCast({ t: 'app', on: true });
      return new Response(null, { status: 101, webSocket: client });
    }
    if (p === '/site/ws') { // a viewer's page (live updates)
      if ((req.headers.get('Upgrade') || '').toLowerCase() !== 'websocket') return SITE_J({ ok: true });
      if (this.sViewers().length >= 2000) return new Response('busy', { status: 503 });
      const u = await this.sSession(url.searchParams.get('s'));
      const pair = new WebSocketPair(), [client, server] = Object.values(pair);
      this.ctx.acceptWebSocket(server, ['viewer']); server.serializeAttachment({ site: true, viewer: true, uid: u?.uid || null, login: u?.login || null, name: u?.name || null });
      const live = this.sGet('live');
      server.send(JSON.stringify({ t: 'hello', info: this.sGet('info'), live, stats: this.sGet('stats'), mara: this.sGet('mara'), poll: this.sPollOut(this.sGet('poll'), u?.uid), pred: this.sPredOut(live?.pid, u?.uid), lastPred: this.sGet('lastPred'), me: u ? { login: u.login, name: u.name, avatar: u.avatar } : null, appOnline: !!this.sApp() }));
      this.sLater('vc', 3000, () => this.sToApp({ t: 'viewers', n: this.sViewers().length }));
      return new Response(null, { status: 101, webSocket: client });
    }
    if (p === '/site/api/history') {
      const before = Number(url.searchParams.get('before')) || 9e15, lim = Math.min(100, Number(url.searchParams.get('limit')) || 50), q = String(url.searchParams.get('q') || '').toLowerCase().slice(0, 60);
      const rows = this.ctx.storage.sql.exec(q ? `SELECT j FROM hist WHERE at < ? AND lower(j) LIKE ? ORDER BY at DESC LIMIT ?` : `SELECT j FROM hist WHERE at < ? ORDER BY at DESC LIMIT ?`, ...(q ? [before, '%' + q.replace(/[%_]/g, '') + '%', lim] : [before, lim])).toArray().map(r => JSON.parse(r.j));
      return SITE_J({ rows, more: rows.length === lim });
    }
    if (p === '/site/api/top') return SITE_J({ top: this.sTop(50) });
    if (p === '/site/api/me') {
      const u = await this.sSession(url.searchParams.get('s')); if (!u) return SITE_J({ error: 'Sign in again.' }, 401);
      const pr = this.ctx.storage.sql.exec(`SELECT j, at FROM prof WHERE login = ?`, u.login).toArray()[0], pt = this.ctx.storage.sql.exec(`SELECT pts, right, tries FROM pts WHERE uid = ?`, u.uid).toArray()[0] || null;
      const rank = pt ? Number(this.ctx.storage.sql.exec(`SELECT COUNT(*) AS n FROM pts WHERE pts > ?`, pt.pts).toArray()[0]?.n || 0) + 1 : null;
      if (!pr || Date.now() - pr.at > 60000) this.sToApp({ t: 'want', login: u.login, uid: u.uid, name: u.name }); // (fresh one comes over the live connection)
      return SITE_J({ me: { login: u.login, name: u.name, avatar: u.avatar }, profile: pr ? JSON.parse(pr.j) : null, at: pr?.at || 0, points: pt, rank, appOnline: !!this.sApp() });
    }
    if (p === '/site/login' && req.method === 'POST') { // Twitch sign-in: the page got a token from Twitch, we check it's real and for this streamer's Twitch app
      const info = this.sGet('info') || {}; let body; try { body = await req.json(); } catch { body = {}; }
      const tok = String(body.token || '').slice(0, 200); if (!tok) return SITE_J({ error: 'no token' }, 400);
      const v = await fetch('https://id.twitch.tv/oauth2/validate', { headers: { Authorization: 'OAuth ' + tok } }).then(r => r.ok ? r.json() : null).catch(() => null);
      if (!v?.user_id || (info.clientId && v.client_id !== info.clientId)) return SITE_J({ error: "Twitch didn't accept that sign-in. Try again." }, 401);
      const uj = await fetch('https://api.twitch.tv/helix/users', { headers: { Authorization: 'Bearer ' + tok, 'Client-Id': v.client_id } }).then(r => r.ok ? r.json() : null).catch(() => null), tu = uj?.data?.[0] || {};
      const u = { uid: v.user_id, login: v.login, name: tu.display_name || v.login, avatar: tu.profile_image_url || '', exp: Date.now() + 30 * 864e5 };
      fetch('https://id.twitch.tv/oauth2/revoke', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: `client_id=${encodeURIComponent(v.client_id)}&token=${encodeURIComponent(tok)}` }).catch(() => {}); // (we only needed to know who it is)
      const b = b64u(new TextEncoder().encode(JSON.stringify(u)));
      return SITE_J({ session: b + '.' + await hmac(this.env.SYNC_KEY, 'site:' + b), me: { login: u.login, name: u.name, avatar: u.avatar } });
    }
    return SITE_J({ error: 'not found' }, 404);
  },
  async siteMsg(ws, raw) {
    if (typeof raw !== 'string' || raw.length > 400000) return;
    let m; try { m = JSON.parse(raw); } catch { return; }
    const a = ws.deserializeAttachment() || {}, q = this.ctx.storage.sql; this.sInit();
    if (a.app) { // ---- from Movie Royal ----
      if (m.t === 'info') { this.sPut('info', m.info); this.sCast({ t: 'info', info: m.info }); }
      else if (m.t === 'live') {
        const before = this.sGet('live'); this.sPut('live', m.live);
        this.sCast({ t: 'live', live: m.live, ...(m.live?.pid && m.live.pid !== before?.pid ? { pred: { pid: m.live.pid, counts: {}, mine: null } } : {}) });
      }
      else if (m.t === 'stats') { this.sPut('stats', m.stats); this.sCast({ t: 'stats', stats: m.stats }); }
      else if (m.t === 'mara') { this.sPut('mara', m.mara); this.sCast({ t: 'mara', mara: m.mara }); } // 🏃 (19) maps + things + luck for picking
      else if (m.t === 'toUser') { const s2 = JSON.stringify(m.msg || {}); for (const w of this.sViewers()) if ((w.deserializeAttachment() || {}).login === m.login) { try { w.send(s2); } catch {} } }
      else if (m.t === 'hist') { for (const r of (m.rows || []).slice(0, 500)) if (r?.id) q.exec(`INSERT INTO hist (id, at, j) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET at = excluded.at, j = excluded.j`, String(r.id), Number(r.at) || 0, JSON.stringify(r)); if (m.rows?.length) this.sCast({ t: 'hist', rows: m.rows.slice(0, 20) }); }
      else if (m.t === 'histDel') { for (const id of m.ids || []) q.exec(`DELETE FROM hist WHERE id = ?`, String(id)); this.sCast({ t: 'histDel', ids: m.ids || [] }); }
      else if (m.t === 'profile') { if (m.login) { q.exec(`INSERT INTO prof (login, at, j) VALUES (?, ?, ?) ON CONFLICT(login) DO UPDATE SET at = excluded.at, j = excluded.j`, String(m.login), Date.now(), JSON.stringify(m.profile || {})); for (const w of this.sViewers()) if ((w.deserializeAttachment() || {}).login === m.login) { try { w.send(JSON.stringify({ t: 'profile', profile: m.profile })); } catch {} } } }
      else if (m.t === 'poll') { // a new poll (or null = none)
        const poll = m.poll && Array.isArray(m.poll.opts) ? { id: String(m.poll.id), q: String(m.poll.q || '').slice(0, 140), opts: m.poll.opts.slice(0, 6).map(o => String(o).slice(0, 60)), endsAt: Number(m.poll.endsAt) || 0, open: true } : null;
        this.sPut('poll', poll); if (poll?.endsAt) await this.ctx.storage.setAlarm(poll.endsAt);
        this.sCast({ t: 'poll', poll: this.sPollOut(poll) });
      }
      else if (m.t === 'pollEnd') await this.sPollEnd();
      else if (m.t === 'result') { // a battle's winner: score the guesses
        const rows = q.exec(`SELECT uid, login, name, pick FROM pred WHERE pid = ?`, String(m.pid)).toArray(), right = [], pct = Number(m.pct) || 50, add = ptsFor(pct);
        for (const r of rows) {
          const ok = r.pick === String(m.winnerId); if (ok) right.push(r.name);
          q.exec(`INSERT INTO pts (uid, login, name, pts, right, tries) VALUES (?, ?, ?, ?, ?, 1) ON CONFLICT(uid) DO UPDATE SET login = excluded.login, name = excluded.name, pts = pts + excluded.pts, right = right + excluded.right, tries = tries + 1`, r.uid, r.login, r.name, ok ? add : 0, ok ? 1 : 0);
        }
        q.exec(`DELETE FROM pred WHERE pid = ?`, String(m.pid));
        const out = { pid: m.pid, winnerId: m.winnerId, winner: String(m.winner || ''), pct, pts: add, total: rows.length, right: right.slice(0, 30), nRight: right.length, at: Date.now() };
        this.sPut('lastPred', out); this.sCast({ t: 'predResult', res: out, top: this.sTop(10) }); this.sToApp({ t: 'predDone', ...out });
      }
      else if (m.t === 'resetPoints') { q.exec(`DELETE FROM pts`); this.sCast({ t: 'top', top: [] }); }
      else if (m.t === 'wipe') { q.exec(`DELETE FROM hist`); this.sCast({ t: 'histReset' }); }
      return;
    }
    // ---- from a viewer ----
    if (m.t === 'ping') return void ws.send('{"t":"pong"}');
    if (!a.uid) return void ws.send(JSON.stringify({ t: 'err', error: 'Sign in with Twitch first.' }));
    if (m.t === 'pick') { if (!this.sApp()) return void ws.send(JSON.stringify({ t: 'pickRes', ok: false, error: "The stream app isn't on right now: try again later." })); return this.sToApp({ t: 'pick', uid: a.uid, login: a.login, name: a.name, qid: m.qid ? String(m.qid).slice(0, 40) : null, map: m.map != null ? String(m.map).slice(0, 60) : null, luck: m.luck != null ? String(m.luck).slice(0, 60) : null }); } // 🏃 (19) a map / 🍀 pick for their paid battle (Movie Royal checks it's theirs)
    if (m.t === 'predict') {
      const live = this.sGet('live');
      if (!live?.pid || live.pid !== m.pid || !live.predictOpen) return void ws.send(JSON.stringify({ t: 'err', error: 'Guesses are closed for this battle.' }));
      if (!(live.fighters || []).some(f => f.id === m.pick)) return;
      q.exec(`INSERT INTO pred (pid, uid, login, name, pick) VALUES (?, ?, ?, ?, ?) ON CONFLICT(pid, uid) DO UPDATE SET pick = excluded.pick`, live.pid, a.uid, a.login, a.name, String(m.pick));
      ws.send(JSON.stringify({ t: 'pred', pred: this.sPredOut(live.pid, a.uid) }));
      this.sLater('pc', 1500, () => { const o = this.sPredOut(live.pid); this.sCast({ t: 'predCounts', pid: live.pid, counts: o.counts }); this.sToApp({ t: 'predCounts', pid: live.pid, counts: o.counts }); });
    } else if (m.t === 'vote') {
      const poll = this.sGet('poll'), i = Number(m.opt);
      if (!poll?.open || poll.id !== m.poll || !(i >= 0 && i < poll.opts.length) || (poll.endsAt && Date.now() > poll.endsAt)) return void ws.send(JSON.stringify({ t: 'err', error: 'That poll is closed.' }));
      q.exec(`INSERT INTO vote (poll, uid, opt) VALUES (?, ?, ?) ON CONFLICT(poll, uid) DO UPDATE SET opt = excluded.opt`, poll.id, a.uid, i);
      ws.send(JSON.stringify({ t: 'poll', poll: this.sPollOut(poll, a.uid) }));
      this.sLater('vt', 1500, () => { const o = this.sPollOut(poll); this.sCast({ t: 'pollCounts', id: poll.id, counts: o.counts }); this.sToApp({ t: 'pollCounts', id: poll.id, counts: o.counts }); });
    }
  },
  async sPollEnd() {
    const poll = this.sGet('poll'); if (!poll?.open) return;
    const out = this.sPollOut(poll); poll.open = false; poll.counts = out.counts; poll.endedAt = Date.now(); this.sPut('poll', poll);
    this.sCast({ t: 'poll', poll: { ...out, open: false } }); this.sToApp({ t: 'pollResult', id: poll.id, q: poll.q, opts: poll.opts, counts: out.counts });
  },
  async alarm() { await this.sPollEnd(); },
  siteGone(ws) { const a = ws.deserializeAttachment() || {}; if (a.app && !this.ctx.getWebSockets('app').some(w => w !== ws)) this.sCast({ t: 'app', on: false }); if (a.viewer) this.sLater('vc', 3000, () => this.sToApp({ t: 'viewers', n: this.sViewers().length })); }
};
Object.assign(CoRoom.prototype, SITE);

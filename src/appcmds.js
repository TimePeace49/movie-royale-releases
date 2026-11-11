// 🧩 (1.129.0, Derek: "in the command tab, all the different commands the app adds for that edition… a box for it and all the options for commands that you can do
// for Streamlabs Chatbot"). The app's own chat commands (!join, !sr, !vote, !bday, !clip…) each get Streamlabs-style options: on / off, the name, who can use it
// (+ named people), where (Twitch / Kick / both), a wait for everyone, a wait per person, mods skip the wait, a "wait" message, a sound with its volume, and how
// many times it was used. What a command SAYS is made by the app, so there's no answer box (that's what your own commands are for).
// The list itself (which commands this edition has, how to rename each) comes from server.js through setList(); this file keeps the rules and checks them.
import { db, save } from './store.js';

const H = { list: () => [], channel: () => '', allowed: async () => true, say: async () => {}, sound: () => {}, sounds: () => [], kick: () => false, changed: () => {} };
export const setHooks = h => Object.assign(H, h);
const low = s => String(s || '').trim().toLowerCase().replace(/^@/, '');
const clampN = (v, lo, hi, d) => { v = Math.round(Number(v)); return Number.isFinite(v) ? Math.max(lo, Math.min(hi, v)) : d; };
export const PERMS = { all: 'Everyone', followers: 'Followers', subs: 'Subs', vips: 'VIPs', mods: 'Mods', streamer: 'Only me', users: 'Only these people' };
export const USAGE = { both: 'Twitch + Kick', twitch: 'Twitch only', kick: 'Kick only' };
export const DEF = { on: true, perm: 'all', users: [], cd: 0, ucd: 0, modsSkip: true, cdSay: false, usage: 'both', sound: '', vol: 80, uses: 0 };
const R = () => (db.cmdRules ||= {});
export const rule = key => ({ ...DEF, ...(R()[key] || {}) });
const words = e => { try { return [].concat(e.words()).filter(Boolean).map(low); } catch { return []; } };
/** the app's commands this edition has, each with its rule */
export const list = () => H.list().map(e => ({ key: e.key, group: e.group, label: e.label, why: e.why, word: words(e)[0] || '', words: words(e), rename: !!e.set, own: e.own || '', ...rule(e.key) }));
const find = w => H.list().find(e => words(e).includes(w));
const cool = new Map(); let saidAt = new Map(), saveT = null;
const isMod = m => { const b = m.badges || {}; return !!(b.broadcaster || b.mod || b.moderator); };
/** a chat message: true = one of the app's commands that its rule stops here (off, wrong platform, not allowed, waiting). Uses + sound are counted when it goes through. */
export async function blocked(m, now = Date.now()) {
  const w = low(String(m?.text || '').trim().split(/\s+/)[0]); if (w[0] !== '!') return false;
  const e = find(w); if (!e) return false;
  const r = rule(e.key), who = low(m.login || m.name), mod = isMod(m) || (who && who === low(H.channel?.() || ''));
  if (!r.on) return true;
  const plat = m.kick ? 'kick' : 'twitch'; if (r.usage !== 'both' && r.usage !== plat && !m.pretend) return true;
  if (r.perm === 'users') { if (!mod && !(r.users || []).map(low).includes(who)) return true; }
  else if (r.perm !== 'all' && !(await H.allowed(m, r.perm))) return true;
  if (!(mod && r.modsSkip)) {
    const g = e.key, u = e.key + ':' + who, leftG = r.cd * 1000 - (now - (cool.get(g) || 0)), leftU = r.ucd * 1000 - (now - (cool.get(u) || 0)), left = Math.max(leftG, leftU);
    if (left > 0) { if (r.cdSay && now - (saidAt.get(u) || 0) > 10000) { saidAt.set(u, now); H.say(`⏳ @${m.name || m.login} ${w} can be used again in ${Math.ceil(left / 1000)}s.`).catch(() => {}); } return true; }
  }
  cool.set(e.key, now); cool.set(e.key + ':' + who, now);
  const x = (R()[e.key] ||= {}); x.uses = (x.uses || 0) + 1; if (!saveT) saveT = setTimeout(() => { saveT = null; save(); }, 3000);
  if (r.sound) try { H.sound(r.sound, r.vol); } catch {}
  return false;
}
/** change a command's options (and its name, when the app lets that one be renamed) */
export function set(key, b = {}) {
  const e = H.list().find(x => x.key === key); if (!e) throw new Error("That command isn't in this edition.");
  const x = (R()[key] ||= {});
  if ('name' in b && e.set) { const c = low(b.name).split(/\s+/)[0]; if (!/^![a-z0-9_]{2,25}$/.test(c)) throw new Error('A command name looks like !something (letters, numbers, _)'); const clash = H.list().find(o => o.key !== key && words(o).includes(c)); if (clash) throw new Error(`${c} is already the app's ${clash.label} command.`); e.set(c); }
  if ('on' in b) x.on = !!b.on;
  if ('perm' in b && PERMS[b.perm]) x.perm = b.perm;
  if ('users' in b) x.users = [...new Set((Array.isArray(b.users) ? b.users : String(b.users || '').split(/[\s,]+/)).map(low).filter(u => /^[a-z0-9_]{2,25}$/.test(u)))].slice(0, 50);
  if ('cd' in b) x.cd = clampN(b.cd, 0, 86400, 0); if ('ucd' in b) x.ucd = clampN(b.ucd, 0, 86400, 0);
  if ('modsSkip' in b) x.modsSkip = !!b.modsSkip; if ('cdSay' in b) x.cdSay = !!b.cdSay;
  if ('usage' in b && USAGE[b.usage]) x.usage = b.usage;
  if ('sound' in b) x.sound = String(b.sound || '').slice(0, 200); if ('vol' in b) x.vol = clampN(b.vol, 0, 100, 80);
  if (b.resetUses) x.uses = 0;
  save(); H.changed(); return list();
}
export const info = () => ({ list: list(), perms: PERMS, usage: USAGE, kick: !!H.kick(), sounds: H.sounds() });
/** 🧪 the rules walked through with a pretend command (nothing said, nothing saved) */
export async function demo() {
  const keep = { list: H.list, say: H.say, sound: H.sound, rules: db.cmdRules }, said = [], played = [], rows = [], add = (what, ok) => rows.push({ what, ok: !!ok });
  db.cmdRules = {}; H.list = () => [{ key: 'pt', label: 'Pretend', words: () => ['!pretend'] }]; H.say = async t => { said.push(t); }; H.sound = f => played.push(f);
  const m = (login, extra = {}) => ({ login, name: login, text: '!pretend hi', badges: {}, pretend: true, ...extra }); cool.clear(); saidAt = new Map();
  try {
    add('Something that isn\'t one of the app\'s commands goes through untouched', !(await blocked({ ...m('a'), text: '!somethingelse' })));
    set('pt', { on: false }); add('Turned off: nothing answers it', await blocked(m('a')));
    set('pt', { on: true, cd: 30 }); const t0 = Date.now(); add('Wait for everyone (30 s): the first one goes through…', !(await blocked(m('a'), t0))); add('…the next one 5 s later (someone else) waits', await blocked(m('b'), t0 + 5000));
    add('…a mod skips the wait', !(await blocked(m('c', { badges: { mod: true } }), t0 + 6000)));
    set('pt', { cd: 0, ucd: 60, cdSay: true }); cool.clear(); const t1 = t0 + 100000; await blocked(m('a'), t1); add('Wait per person (60 s): the same person again is stopped, with the "wait" message', (await blocked(m('a'), t1 + 2000)) && said.some(x => /can be used again/.test(x)));
    add('…someone else isn\'t', !(await blocked(m('b'), t1 + 2000)));
    set('pt', { ucd: 0, perm: 'users', users: 'friend1, friend2' }); add('Only these people: friend1 can', !(await blocked(m('friend1'), t1 + 9000))); add('…a stranger can\'t', await blocked(m('stranger'), t1 + 9000));
    set('pt', { perm: 'all', usage: 'kick' }); add('Kick only: a Twitch chat is stopped', await blocked({ ...m('a'), pretend: false }, t1 + 9500)); add('…a Kick chat goes through', !(await blocked({ ...m('a'), pretend: false, kick: true }, t1 + 9600)));
    set('pt', { usage: 'both', sound: 'pretend.mp3' }); await blocked(m('z'), t1 + 9700); add('A sound plays when it\'s used', played.includes('pretend.mp3'));
    add('Every use is counted', (db.cmdRules.pt.uses || 0) >= 5);
  } finally { H.list = keep.list; H.say = keep.say; H.sound = keep.sound; db.cmdRules = keep.rules; cool.clear(); }
  return { ok: rows.every(r => r.ok), rows };
}

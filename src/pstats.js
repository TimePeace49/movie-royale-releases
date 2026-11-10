// 📊 What each person did: songs they asked for, movie night votes, song skips and every chat command they used.
// Kept per person (newest first) for the Stats tab of their profile.
import { db, save } from './store.js';
const low = s => String(s || '').toLowerCase().replace(/^@/, '').trim();
const KINDS = ['song', 'vote', 'skip', 'skipped'], MAX_LOG = 400, MAX_CMD = 80;
const data = () => (db.pstats ||= {});
const person = (login, name) => { const d = data(), k = low(login); if (!k) return null; const p = (d[k] ||= { name: name || k, log: [], cmd: {}, n: {} }); if (name) p.name = name; return p; };
/** Something they did: kind song | vote | skip (they skipped one) | skipped (their song got skipped). */
export function note(login, name, kind, text, at = Date.now()) {
  if (!KINDS.includes(kind)) return; const p = person(login, name); if (!p) return;
  p.log.unshift({ at, k: kind, t: String(text || '').slice(0, 200) }); if (p.log.length > MAX_LOG) p.log.length = MAX_LOG;
  p.n[kind] = (p.n[kind] || 0) + 1; save();
}
/** A chat message that starts with a command: counted per command, with when they last used it. */
export function chat(m, at = Date.now()) {
  const t = String(m?.text || '').trim(); if (!m?.login || m.self || !/^![a-z0-9_]{1,24}(\s|$)/i.test(t)) return;
  const sp = t.toLowerCase().split(/\s+/), c = sp[0] === '!skip' && sp[1] === 'song' ? '!skip song' : sp[0];
  const p = person(m.login, m.name); if (!p) return;
  if (!p.cmd[c] && Object.keys(p.cmd).length >= MAX_CMD) return;
  const x = (p.cmd[c] ||= { n: 0, last: 0 }); x.n++; x.last = at; save();
}
/** For the profile: everything newest first. */
export function of(login) {
  const p = data()[low(login)]; const log = p ? p.log : [], pick = k => log.filter(x => x.k === k).map(x => ({ at: x.at, text: x.t }));
  return { songs: pick('song'), votes: pick('vote'), skips: log.filter(x => x.k === 'skip' || x.k === 'skipped').map(x => ({ at: x.at, text: x.t, mine: x.k === 'skipped' })),
    commands: p ? Object.entries(p.cmd).map(([c, x]) => ({ cmd: c, n: x.n, last: x.last })).sort((a, b) => b.last - a.last) : [], totals: p ? { ...p.n } : {} };
}
/** A walk-through with a pretend person: nothing is saved. */
export function demo() {
  const keep = db.pstats; db.pstats = {}; const rows = [], add = (what, ok) => rows.push({ what, ok: !!ok });
  try {
    note('Amy', 'Amy', 'song', 'First song', 1000); note('amy', 'Amy', 'song', 'Second song', 2000); note('amy', 'Amy', 'vote', '#2 Jaws', 3000); note('amy', 'Amy', 'skip', 'Loud song', 4000); note('amy', 'Amy', 'skipped', 'First song (by Bob)', 5000);
    chat({ login: 'amy', name: 'Amy', text: '!sr something' }, 6000); chat({ login: 'amy', name: 'Amy', text: '!sr more' }, 7000); chat({ login: 'amy', name: 'Amy', text: '!skip song' }, 8000); chat({ login: 'amy', name: 'Amy', text: 'hello !sr' }, 9000);
    const s = of('AMY');
    add('Songs they asked for are kept, newest first', s.songs.length === 2 && s.songs[0].text === 'Second song');
    add('Movie night votes are kept', s.votes.length === 1 && s.votes[0].text === '#2 Jaws');
    add('Skips are kept: the ones they skipped and their own songs that got skipped', s.skips.length === 2 && s.skips[0].mine === true && s.skips[1].mine === false);
    add('Each command is counted with when it was last used, newest first', s.commands.length === 2 && s.commands[0].cmd === '!skip song' && s.commands[1].cmd === '!sr' && s.commands[1].n === 2);
    add('A message that only mentions a command is not counted', !s.commands.some(c => c.n > 2));
    add('Someone who never did anything has an empty page', of('nobody').songs.length === 0 && of('nobody').commands.length === 0);
  } finally { db.pstats = keep; }
  return { ok: rows.every(r => r.ok), rows };
}

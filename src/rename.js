// ✏️ Someone changed their Twitch name: move everything from the old name to the new one
// (Discord movie links, picks shown under their name, ball color, chat/giveaway entries, history, stats, wheel spins + history).
import { db, save, norm } from './store.js';

export function renameUser(oldName, newName) {
  const o = String(oldName || '').replace(/^@/, '').trim(), n = String(newName || '').replace(/^@/, '').trim();
  if (!o || !n) throw new Error('Type the old name and the new name.');
  if (norm(o) === norm(n) && o === n) throw new Error('Those are the same name.');
  const ol = o.toLowerCase(), nl = n.toLowerCase(), ok = norm(o), nk = norm(n);
  const same = v => typeof v === 'string' && (v.toLowerCase() === ol || norm(v) === ok);
  const out = { links: 0, movies: 0, entries: 0, history: 0, stats: 0, wheel: 0, spins: 0 };

  // Discord ↔ Twitch links and people you added by hand
  for (const [id, login] of Object.entries(db.links || {})) if (same(login)) { db.links[id] = nl; out.links++; }
  for (const p of Object.values(db.manualPeople || {})) { if (same(p.twitch)) { p.twitch = nl; out.links++; } if (same(p.name)) p.name = n; }
  // ball color
  if (db.colors?.[ol] && !db.colors[nl]) { db.colors[nl] = db.colors[ol]; delete db.colors[ol]; }
  // movies (the name shown on their picks) and chat / giveaway entries
  for (const l of db.lists || []) for (const e of l.entries || []) {
    for (const b of e.backers || []) if (same(b.name)) { b.name = n; out.movies++; }
    if (same(e.twitch)) { e.twitch = nl; out.entries++; }
    if (l.type === 'chat' && same(e.label)) { e.label = n; out.entries++; }
  }
  // battle history + giveaway winners
  for (const h of db.history || []) {
    for (const x of [h.winner, ...(h.top || [])]) if (x) { if (same(x.owner)) { x.owner = n; out.history++; } if ((h.kind === 'chat') && same(x.label)) { x.label = n; out.history++; } }
  }
  for (const g of db.giveawayWinners || []) { if (same(g.login)) g.login = nl; if (same(g.name)) g.name = n; }
  // lifetime stats: fold the old row into the new one
  const ppl = db.stats?.people;
  if (ppl?.[ok]) {
    const a = ppl[ok], b = ppl[nk] ||= { n, k: {}, m: {} };
    for (const [k, v] of Object.entries(a.k)) { const t = b.k[k] ||= v.map(() => 0); v.forEach((x, i) => t[i] += x); }
    Object.assign(b.m, a.m); b.n = n; delete ppl[ok]; out.stats++;
  }
  // 🎡 wheel: saved spins, who gave/spun/grew what
  const w = db.wheel;
  if (w) {
    if (w.bank?.[ok]) {
      const a = w.bank[ok], b = w.bank[nk] ||= { name: n, login: nl, spins: 0, got: 0, used: 0 };
      b.spins += a.spins; b.got += a.got; b.used += a.used; b.name = n; b.login = nl; out.spins = b.spins; delete w.bank[ok];
    }
    for (const g of w.grants || []) { if (same(g.login) || same(g.name)) { g.login = nl; g.name = n; out.wheel++; } }
    for (const r of w.history || []) if (r.by && (same(r.by.login) || same(r.by.name))) { r.by.name = n; if (r.by.login) r.by.login = nl; out.wheel++; }
  }
  (db.renames ||= []).unshift({ at: Date.now(), from: o, to: n, moved: out }); db.renames = db.renames.slice(0, 200);
  save();
  return out;
}

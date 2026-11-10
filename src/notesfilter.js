// 📝 Patch notes per edition (1.116.5, Derek: "patch notes should only apply to whatever edition it affects").
// A bullet in PATCHNOTES.md can start with a tag in curly brackets; the bullet (and the lines tucked under it) is only kept for the
// editions the tag fits. Without a tag a bullet is for everyone.
//   {songs}            the edition has that extra (its "on" list in editions.json; the dev edition has every extra)
//   {ed:kirb}          that edition
//   {has:movies}       the edition has NOT switched that part off (its "off" list)
//   {!ed:birx}         a ! in front turns any of them round
//   {songs,ed:true}    commas = any one of them is enough
// A section with no bullets left is dropped altogether (that edition gets no patch notes for the release).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
let ALL = {}; try { ALL = JSON.parse(fs.readFileSync(path.join(HERE, 'editions.json'), 'utf8')); } catch {}

export function fits(tag, id, all = ALL) {
  const e = all[id] || {}, on = e.on || [], off = e.off || [];
  return String(tag).split(',').map(s => s.trim()).filter(Boolean).some(tok => {
    const not = tok.startsWith('!'); if (not) tok = tok.slice(1);
    const ok = tok.startsWith('ed:') ? tok.slice(3) === id : tok.startsWith('has:') ? !off.includes(tok.slice(4)) : (!!e.dev || on.includes(tok));
    return not ? !ok : ok;
  });
}
/** The whole file (or one section) with only the bullets that fit this edition; the tags themselves are taken out. */
export function notesFor(text, id, all = ALL) {
  const out = []; let skip = -1;
  for (const line of String(text || '').split('\n')) {
    const m = /^(\s*)[-*] /.exec(line), ind = m ? m[1].length : /^\s*$/.test(line) ? -1 : /^\s+/.test(line) ? /^(\s*)/.exec(line)[1].length : 0;
    if (skip >= 0) { if (ind > skip || (ind === -1 && false)) continue; skip = -1; }
    const t = m && /^(\s*[-*] )\{([^}]*)\}\s*/.exec(line);
    if (t) { if (!fits(t[2], id, all)) { skip = m[1].length; continue; } out.push(t[1] + line.slice(t[0].length)); continue; }
    out.push(line);
  }
  /* sections left with no bullets go */
  const parts = out.join('\n').split(/(?=^## )/m);
  return parts.filter((p, i) => !/^## v/.test(p) || /^\s*[-*] /m.test(p)).join('');
}
/** The newest section only (what a latest release shows), or '' when nothing in it is for this edition. */
export function topFor(text, id, all = ALL) {
  const top = String(text || '').split(/(?=^## v)/m).find(p => /^## v/.test(p)) || '';
  const kept = notesFor(top, id, all); return /^\s*[-*] /m.test(kept) ? kept.trimEnd() + '\n' : '';
}

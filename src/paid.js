// 🎟️ Paid battles (1.75.0, Derek: "5 buck donation, 500 bits, or 1 sub gets a battle"; he picked "Auto"):
// every tip / bits / sub that reaches the amount adds a battle with that person's name to a waiting line. Derek presses
// ▶ Start next and the battle is logged with who paid for it (history, the 🌐 viewer website). Leftovers carry over per
// person (a $3 tip + a $2 tip = one battle). Never refunds anything; nothing starts by itself.
import crypto from 'crypto';
import { db, save } from './store.js';

const DEF = { on: false, listId: '', tip: 5, bits: 500, subs: 1, say: true };
export const cfg = () => ({ ...DEF, ...(db.settings.paidBattles || {}) });
export const queue = () => (db.paidQueue ||= []);
let hooks = { act: () => {}, say: () => {}, changed: () => {}, added: () => false };
export function setHooks(h) { hooks = { ...hooks, ...h }; }
const uid = () => crypto.randomBytes(6).toString('hex');
const money = n => '$' + (Math.round(n * 100) / 100).toFixed(n % 1 ? 2 : 0);
const carryOf = key => { db.paidCarry ||= {}; return (db.paidCarry[key] ||= { tip: 0, bits: 0, subs: 0 }); };
const keyOf = (login, name) => String(login || name || 'someone').toLowerCase();

/** Put n battles in the line for someone. Returns the new items. */
function add({ who, login, kind, what, n = 1, test }) {
  const items = [];
  for (let i = 0; i < n; i++) items.push({ id: uid(), who: String(who || 'Someone').slice(0, 40), login: login ? String(login).toLowerCase() : null, kind, what, at: Date.now(), ...(test ? { test: true } : {}) });
  queue().push(...items); db.paidQueue = queue().slice(-500); save();
  const pos = queue().length;
  hooks.act(`paid for ${n === 1 ? 'a battle' : n + ' battles'} (${what}) · ${pos} waiting`, { who, test });
  if (!hooks.added(items, { who, login, what, n, test }) && cfg().say) hooks.say(`⚔️ ${login ? '@' + login : who} unlocked ${n === 1 ? 'a battle' : n + ' battles'} with ${what}! ${pos === 1 ? "It's up next." : `${pos} battles waiting.`}`); // (🏃 the marathon side batches gift bombs into one pop-up + one chat line)
  hooks.changed();
  return items;
}
/** How many battles an amount buys (with what this person had left over before). */
function count(key, kind, amount, per) {
  if (!(per > 0) || !(amount > 0)) return 0;
  const c = carryOf(key), total = Math.round(((c[kind] || 0) + amount) * 100) / 100, n = Math.floor(total / per + 1e-9);
  c[kind] = Math.round((total - n * per) * 100) / 100; save();
  return n;
}
export function onTip({ name, amount, currency = 'USD', test }) {
  const c = cfg(); if (!c.on && !arguments[0]?.test) return [];
  const a = Number(amount) || 0, key = keyOf(null, name), before = carryOf(key).tip || 0, n = count(key, 'tip', a, Number(c.tip));
  return n ? add({ who: name, login: null, kind: 'tip', what: `a ${currency && currency !== 'USD' ? a + ' ' + currency : money(a)} tip${before ? ` (+ ${money(before)} from before)` : ''}`, n, test }) : [];
}
export function onBits({ login, name, bits, test }) {
  const c = cfg(); if (!c.on && !arguments[0]?.test) return [];
  const b = Number(bits) || 0, before = carryOf(keyOf(login, name)).bits || 0, n = count(keyOf(login, name), 'bits', b, Number(c.bits));
  return n ? add({ who: name || login, login, kind: 'bits', what: `${b} bits${before ? ` (+ ${before} from before)` : ''}`, n, test }) : [];
}
export function onSub({ kind, login, name, recipient, test }) {
  const c = cfg(); if (!c.on && !arguments[0]?.test) return [];
  const gift = kind === 'gift', who = name || (gift ? 'Anonymous' : login), n = count(keyOf(login, who), 'subs', 1, Number(c.subs));
  return n ? add({ who, login, kind: gift ? 'gift' : 'sub', what: gift ? `a gift sub${recipient ? ' to ' + recipient : ''}` : kind === 'resub' ? 'a resub' : 'a sub', n, test }) : [];
}
/** 🎯 a battle won some other way (guessing the winner): goes in the line like a paid one. */
export function award({ who, login, what, kind = 'guess', test }) { return add({ who, login, kind, what, n: 1, test }); }
/** ➕ Add one by hand (cash, a tip Movie Royal didn't hear about…). */
export function byHand(who, what, n = 1) { return add({ who: String(who || '').trim() || 'Someone', login: /^[a-z0-9_]{3,25}$/i.test(String(who || '').trim()) ? String(who).trim() : null, kind: 'hand', what: String(what || '').trim() || 'added by hand', n: Math.max(1, Math.min(50, Number(n) || 1)) }); }
/** Take a battle out of the line (the first one, or a picked one). */
export function take(id) { const q = queue(), i = id ? q.findIndex(x => x.id === id) : 0; if (i < 0 || !q[i]) return null; const [it] = q.splice(i, 1); save(); hooks.changed(); return it; }
export function putBack(it) { if (!it) return; queue().unshift(it); save(); hooks.changed(); }
export function remove(id) { const it = take(id); if (it) hooks.act(`'s battle (${it.what}) was taken out of the line`, { who: it.who, test: it.test }); return it; }
export function move(id, dir) { const q = queue(), i = q.findIndex(x => x.id === id), j = i + (dir < 0 ? -1 : 1); if (i < 0 || j < 0 || j >= q.length) return; [q[i], q[j]] = [q[j], q[i]]; save(); hooks.changed(); }
export function clearTests() { db.paidQueue = queue().filter(x => !x.test); for (const k of Object.keys(db.paidCarry || {})) if (/^test/.test(k)) delete db.paidCarry[k]; save(); hooks.changed(); }
export const info = () => ({ ...cfg(), queue: queue().slice(0, 100), waiting: queue().length });

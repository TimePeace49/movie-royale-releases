// 🔔 Alert sounds (1.167.0, Derek: "in sound effect allow for changing follow alert, sub alert, gifted sub alert 1,5,10,20,50,100, bit alert and let
// you set up the amount for them like StreamElements lets you, and donations same as bits… option for exact amount, up to this amount, or anything over")
// A list of rules: when THIS happens (a follow, a sub, gift subs, bits, a donation, a raid) play THAT sound file. Rules with an amount say how it has to
// fit: exactly that amount, up to it, or that much and more. When several rules fit, an "exactly" one wins, else the one whose amount is closest.
import { db, save, uid } from './store.js';

export const KINDS = {
  follow: { icon: '💜', name: 'Follow', amount: false },
  sub: { icon: '⭐', name: 'Sub / resub', amount: false },
  gift: { icon: '🎁', name: 'Gifted subs', amount: true, unit: 'subs', whole: true },
  bits: { icon: '💎', name: 'Bits', amount: true, unit: 'bits', whole: true },
  tip: { icon: '💵', name: 'Donation', amount: true, unit: '$' },
  raid: { icon: '🚀', name: 'Raid', amount: true, unit: 'viewers', whole: true }
};
export const MODES = { over: 'this much or more', upto: 'up to this much', exact: 'exactly this much' };
export const GIFT_TIERS = [1, 5, 10, 20, 50, 100];
let H = { play: () => ({ ok: false }), changed: () => {}, has: () => true };
export function setHooks(h) { H = { ...H, ...h }; }

function data() { const d = db.eventSounds ||= {}; if (typeof d.on !== 'boolean') d.on = true; if (!Array.isArray(d.rules)) d.rules = []; return d; }
const num = (v, whole) => { let n = Number(String(v ?? '').replace(/[^0-9.]/g, '')); if (!Number.isFinite(n) || n < 0) n = 0; return whole ? Math.round(n) : Math.round(n * 100) / 100; };

// does this rule fit this amount? (kinds without an amount always fit)
export function fits(r, kind, amount) {
  if (!r || r.kind !== kind) return false; const K = KINDS[kind]; if (!K) return false;
  if (!K.amount) return true; const v = Number(amount) || 0, a = Number(r.amount) || 0;
  return r.mode === 'exact' ? v === a : r.mode === 'upto' ? v <= a : v >= a;
}
// the rule that plays: an exact one first, else the closest amount (so with 1 / 5 / 10 / 20 "or more" rules, 12 gift subs plays the 10 one)
export function pick(rules, kind, amount, { needFile = true } = {}) {
  const v = Number(amount) || 0, ok = (rules || []).filter(r => r.on !== false && (!needFile || r.file) && fits(r, kind, v));
  if (!ok.length) return null;
  return ok.slice().sort((a, b) => (a.mode === 'exact' ? 0 : 1) - (b.mode === 'exact' ? 0 : 1) || Math.abs((a.amount || 0) - v) - Math.abs((b.amount || 0) - v))[0];
}
const view = r => ({ id: r.id, kind: r.kind, mode: r.mode, amount: r.amount, file: r.file || '', missing: !!r.file && !H.has(r.file), vol: r.vol ?? 80, on: r.on !== false });
export function state() { const d = data(); return { on: d.on, rules: d.rules.map(view), kinds: KINDS, modes: MODES, tiers: GIFT_TIERS }; }

export function setOn(on) { data().on = !!on; save(); H.changed(); return state(); }
export function saveRule(b = {}) {
  const d = data(); let r = b.id ? d.rules.find(x => x.id === b.id) : null;
  if (!r) { if (!KINDS[b.kind]) throw new Error('Pick what the sound is for.'); if (d.rules.length >= 200) throw new Error('That is a lot of alert sounds (200 at most).'); r = { id: uid(), kind: b.kind, mode: 'over', amount: KINDS[b.kind].amount ? 1 : 0, file: '', vol: 80, on: true }; d.rules.push(r); }
  const K = KINDS[r.kind];
  if (b.mode != null && MODES[b.mode]) r.mode = b.mode;
  if (b.amount != null && K.amount) r.amount = num(b.amount, K.whole);
  if (b.vol != null) r.vol = Math.max(0, Math.min(100, Math.round(Number(b.vol) || 0)));
  if (typeof b.on === 'boolean') r.on = b.on;
  if (b.file != null) r.file = String(b.file || '');
  save(); H.changed(); return view(r);
}
export function removeRule(id) { const d = data(), i = d.rules.findIndex(x => x.id === id); if (i < 0) throw new Error('That alert sound is gone already.'); d.rules.splice(i, 1); save(); H.changed(); return state(); }
export function addGiftTiers() { // 🎁 1 · 5 · 10 · 20 · 50 · 100 gifted subs, each "this many or more" (only the ones that aren't there yet)
  const d = data(); let n = 0;
  for (const t of GIFT_TIERS) if (!d.rules.some(r => r.kind === 'gift' && r.mode === 'over' && Number(r.amount) === t)) { d.rules.push({ id: uid(), kind: 'gift', mode: 'over', amount: t, file: '', vol: 80, on: true }); n++; }
  save(); H.changed(); return { added: n, ...state() };
}
export function ruleOf(id) { return data().rules.find(x => x.id === id) || null; }

// an alert came in: play the sound that fits (returns what it did, for the tests)
export function onAlert(a, { test, dry } = {}) {
  const d = data(); if (!a || !KINDS[a.kind]) return null; if (!d.on && !test) return null;
  const amount = a.kind === 'sub' || a.kind === 'follow' ? 0 : Number(a.amount) || 0, r = pick(d.rules, a.kind, amount); if (!r) return { played: false, why: 'no rule fits' };
  if (dry) return { played: false, dry: true, rule: view(r) };
  const p = H.play(r.file, r.vol ?? 80); return { played: !!p?.ok, where: p?.where, why: p?.ok ? '' : 'the sound file is missing', rule: view(r) };
}

// 🧪 the rules walked through with pretend rules (nothing saved, nothing played)
export function demo() {
  const R = [
    { id: 'f', kind: 'follow', file: 'follow.mp3' }, { id: 's', kind: 'sub', file: 'sub.mp3' },
    ...GIFT_TIERS.map(t => ({ id: 'g' + t, kind: 'gift', mode: 'over', amount: t, file: `gift${t}.mp3` })),
    { id: 'b100', kind: 'bits', mode: 'exact', amount: 100, file: 'b100.mp3' }, { id: 'bu', kind: 'bits', mode: 'upto', amount: 99, file: 'small.mp3' }, { id: 'bo', kind: 'bits', mode: 'over', amount: 500, file: 'big.mp3' },
    { id: 't5', kind: 'tip', mode: 'exact', amount: 5, file: 'five.mp3' }, { id: 'to', kind: 'tip', mode: 'over', amount: 3, file: 'tip.mp3' }, { id: 'tu', kind: 'tip', mode: 'upto', amount: 2.99, file: 'coins.mp3' },
    { id: 'off', kind: 'bits', mode: 'over', amount: 1, file: 'off.mp3', on: false }, { id: 'nofile', kind: 'bits', mode: 'exact', amount: 250, file: '' }
  ];
  const T = [
    ['A follow', 'follow', 0, 'f'], ['A sub', 'sub', 0, 's'],
    ['1 gifted sub', 'gift', 1, 'g1'], ['4 gifted subs → the 1 one', 'gift', 4, 'g1'], ['5 gifted subs', 'gift', 5, 'g5'], ['12 gifted subs → the 10 one', 'gift', 12, 'g10'], ['20 gifted subs', 'gift', 20, 'g20'], ['75 gifted subs → the 50 one', 'gift', 75, 'g50'], ['100 gifted subs', 'gift', 100, 'g100'], ['300 gifted subs → the 100 one', 'gift', 300, 'g100'],
    ['50 bits → "up to 99"', 'bits', 50, 'bu'], ['100 bits → "exactly 100"', 'bits', 100, 'b100'], ['101 bits → nothing fits', 'bits', 101, null], ['500 bits → "500 or more"', 'bits', 500, 'bo'], ['5000 bits → "500 or more"', 'bits', 5000, 'bo'], ['250 bits: the rule has no sound yet → nothing', 'bits', 250, null],
    ['$1 → "up to $2.99"', 'tip', 1, 'tu'], ['$3 → "$3 or more"', 'tip', 3, 'to'], ['$5 → "exactly $5" wins over "$3 or more"', 'tip', 5, 't5'], ['$50 → "$3 or more"', 'tip', 50, 'to'],
    ['A raid with no raid rule → nothing', 'raid', 40, null]
  ];
  const rows = T.map(([what, kind, amount, want]) => { const r = pick(R, kind, amount); return { what, got: r ? r.file : 'no sound', want: want ? R.find(x => x.id === want).file : 'no sound', ok: (r ? r.id : null) === want }; });
  return { ok: rows.every(r => r.ok), rows };
}

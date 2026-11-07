// 🛡️ Spam bots (1.83.0, Derek: "auto ban any bots that come into my chat trying to sell something").
// Looks at a chatter's FIRST messages only (Twitch's first-msg tag, or nobody's seen them chat before) and bans them when the
// message is selling something: viewers / followers / promotion, art commissions, "become famous", with a way to buy it (a
// site, "dot com", Telegram, Discord, "DM me"…). Subs, VIPs, mods and you are never touched. Every ban is logged and can be
// undone from Settings → Twitch → 🛡️ Spam bots (Unban).
import { db, save } from './store.js';

export const DEF = { on: true, action: 'ban', firstOnly: true };
export function cfg() { return { ...DEF, ...(db.settings.spam || {}) }; }
export function setCfg(o) {
  const c = cfg();
  if ('on' in o) c.on = !!o.on;
  if ('firstOnly' in o) c.firstOnly = !!o.firstOnly;
  if (['ban', 'timeout', 'delete'].includes(o.action)) c.action = o.action;
  db.settings.spam = c; save(); return c;
}
export const list = () => db.spamBans || [];

// ── telling a spam bot from a person ───────────────────────────────────────────────────────────────
// Bots dress words up so filters miss them: "v i e w e r s", "vie.wers", Cyrillic letters that look Latin, "streamboo .com".
const LOOK = { 'а': 'a', 'е': 'e', 'о': 'o', 'р': 'p', 'с': 'c', 'у': 'y', 'х': 'x', 'і': 'i', 'ј': 'j', 'ѕ': 's', 'һ': 'h', 'ԁ': 'd', 'ɡ': 'g', 'ⅼ': 'l', 'ο': 'o', 'α': 'a', 'ν': 'v', 'ε': 'e', 'τ': 't', 'κ': 'k', 'ρ': 'p', 'ı': 'i', '0': 'o' };
export function plain(t) {
  let s = String(t || '').normalize('NFKD').replace(/[̀-ͯ​-‏⁠﻿]/g, '').toLowerCase();
  s = [...s].map(ch => LOOK[ch] || ch).join('');
  s = s.replace(/\b(?:[a-z][ .\-_*]){3,}[a-z]\b/g, m => m.replace(/[ .\-_*]/g, '')); // "v i e w e r s" → "viewers"
  return s.replace(/\s+/g, ' ');
}
const SELL = /\b(viewers?|view ?bots?|followers?|follows|primes?|prime subs|subs(?:cribers)?|chatters|chat ?bots|views|viewbot|promotion|promote|promoting|grow(?:ing)? your (?:channel|stream|audience)|boost(?:ing)? your|more viewers|real viewers|live viewers|organic|famous|popular|monetiz)/;
const DEAL = /\b(buy|cheap|cheapest|price|prices|discount|offer|free trial|for free|order|purchase|for sale|sell(?:ing)?|best (?:viewers|followers|service)|only \$|\$\s?\d|low cost|affordable|service)/;
const ART = /\b(emotes?|overlays?|panels?|logos?|banners?|alerts?|stream ?(?:package|graphics|design)|badges?|vtuber model|animations?)\b/;
const ARTSELL = /\b(commissions?|i (?:can )?(?:make|draw|design|create|do)|my portfolio|artist|graphic designer|check (?:out )?my (?:work|art|portfolio)|interested\??|want (?:some|one|new))\b/;
const CONTACT = /(\b[a-z0-9-]{3,}\s?(?:\.|\(dot\)|\[dot\]| dot )\s?(?:com|net|org|ru|shop|xyz|top|store|io|gg|live|pro|site|online|club|biz|info|cc|me|su|fun|space|art|link)\b|https?:|www\.|telegram|\btg\b|whatsapp|discord(?:\.gg| ?id| ?user| ?name| ?tag)?|\bdm me\b|\bdm\b|message me|contact me|text me|add me|reach (?:out|me)|in (?:my )?(?:bio|profile)|remove (?:the )?spaces?|instagram|\big\b|snap(?:chat)?|@\w{3,} on)/;
const FAMOUS = /(want to (?:become|be) famous|wanna (?:become|be) famous|become famous|do you want more (?:viewers|followers)|want more (?:viewers|followers)|sorry for (?:bothering|disturbing|interrupting) you|i (?:want|would like) to offer (?:you )?(?:promotion|my services)|i can help you (?:grow|get more|become))/;
// why this message is a spam bot (null = it isn't)
export function why(text) {
  const t = plain(text);
  if (FAMOUS.test(t) && (SELL.test(t) || CONTACT.test(t) || DEAL.test(t))) return 'selling “become famous” / promotion';
  if (SELL.test(t) && CONTACT.test(t) && (DEAL.test(t) || /\b(viewers?|followers?|primes?|views|viewbot|promotion|promot\w*)\b[^.?!]{0,30}\b(on|at|from|visit|via|with)\b/.test(t))) return 'selling viewers / followers / promotion';
  if (SELL.test(t) && DEAL.test(t) && /\b(viewers?|followers?|primes?|viewbot)\b/.test(t)) return 'selling viewers / followers';
  if (ART.test(t) && ARTSELL.test(t) && CONTACT.test(t)) return 'selling art (emotes / overlays / panels)';
  return null;
}
// should Movie Royal ban this chatter for this message? (seen = they've chatted here before)
export function check(m, seen) {
  const c = cfg(); if (!c.on || !m || m.self) return null;
  const b = m.badges || {}; if (b.broadcaster || b.mod || b.vip || b.sub) return null; // (never a sub, VIP, mod or you)
  if (c.firstOnly && !m.first && seen) return null; // (only someone's very first messages)
  return why(m.text);
}
export function remember(e) { db.spamBans = [{ ...e, at: Date.now() }, ...list()].slice(0, 100); save(); }
export function forget(login) { const l = String(login || '').toLowerCase(); const r = list().find(x => x.login === l); db.spamBans = list().filter(x => x.login !== l); save(); return r; }
// 🧪 sample lines the Test tab runs (spam = what we expect)
export const SAMPLES = [
  ['Best viewers on streamboo .com', true],
  ['Cheap viewers on vi ewerboost dot com', true],
  ['Wanna become famous? Buy followers, primes and viewers on bigfollows .com', true],
  ['Hello, sorry for bothering you. I want to offer promotion of your channel, viewers, followers, views, chat bots, etc...The price is lower than any competitor, the quality is guaranteed to be the best. Flexible and convenient order management panel, chat panel, everything is in your hands, a huge number of custom settings. Telegram: @promo_guy', true],
  ['Hey! I\'m a graphic designer, I make emotes, overlays and panels. Check my portfolio, DM me on discord: artguy#1234', true],
  ['Do you want more viewers? Get them at streamrise .shop', true],
  ['how many viewers does the stream usually get?', false],
  ['my followers on insta love this game lol', false],
  ['the overlay looks sick, who made the emotes?', false],
  ['buy GTA 6 when it comes out, its cheap on sale', false],
  ['check out my discord if you want to play later', false],
  ['lmao that was famous last words', false],
  ['how many viewers do you have? found you on reddit.com', false],
  ['I will promote your stream for free, add me on discord', true]
];

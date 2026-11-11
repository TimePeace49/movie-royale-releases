// 🎭 Editions (1.91.0, Derek: "make this app 5 things: Kirb, True, Birx, myself and public… customize them for each stream but still add things for everyone").
// ONE set of code. The build stamps `edition` into package.json; each edition has its own GitHub for downloads + updates (src/editions.json).
// Custom things per streamer are switched on with `is('kirb')` / `EDITION.dev`, never by copying the code.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = f => { try { return JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8')); } catch { return {}; } };
export const ALL = read('src/editions.json');
const want = String(process.env.MOVIE_ROYAL_EDITION || read('package.json').edition || 'public').toLowerCase();
const id = ALL[want] ? want : 'public';
export const EDITION = { id, name: ALL[id]?.name || 'Public', streamer: ALL[id]?.streamer || '', repo: ALL[id]?.repo || '', dev: !!ALL[id]?.dev, off: Array.isArray(ALL[id]?.off) ? ALL[id].off : [] };
/** Is this part of the app in this edition? (`off` in editions.json: movies, kirbWheel, cards, voidSetup) */
let lookAs = null; /* 👀 Derek's (dev) edition can look like another edition for a while, to try it before handing it over (not saved) */
export const offNow = () => (lookAs && ALL[lookAs] ? (Array.isArray(ALL[lookAs].off) ? ALL[lookAs].off : []) : EDITION.off);
export const has = f => !offNow().includes(f);
export function setLookAs(id) { lookAs = EDITION.dev && ALL[id] && id !== EDITION.id ? id : null; return lookAs; }
export const lookingAs = () => lookAs;
/** Extras made for one edition (editions.json `on`: movienight…). A dev edition has every one of them while dev mode is on, so they can be tried first. */
export const onNow = () => { const e = lookAs && ALL[lookAs] ? ALL[lookAs] : ALL[EDITION.id]; return Array.isArray(e?.on) ? e.on : []; };
export const feat = (name, devMode) => onNow().includes(name) || (!lookAs && EDITION.dev && !!devMode); /* (👀 while looking like another edition: only that edition's extras) */
export const FEATS = ['movienight', 'chatbot', 'kick', 'songs', 'dash', 'eggs', 'raids'];
export const is = (...ids) => ids.includes(lookAs || EDITION.id); /* (👀 1.130.0: while looking like another edition, its own defaults too: Birx & Jess's raters, guesser, 6 AM day start) */
/** 🎭 Every part that can be switched per edition (the Backup Bots app's Editions tab lists these). kind 'off' = on unless listed in `off`; kind 'on' = an extra, only when listed in `on`. */
export const FEATURES = (() => { let f = read('src/features.json'); if (!Array.isArray(f)) f = read('src/features.base.json'); return Array.isArray(f) ? f : []; })();
// 🏷️ The name people see (1.92.0, Derek: "rename the whole project to TimePeace Chatbot"; True's + Birx's editions carry their own name).
// Only what people SEE changes: the data folder, program file, installer file, OBS source names, Stream Deck page names and the Backup Bots
// app keep "Movie Royal", so nobody loses data and updates keep working. The code keeps saying "Movie Royal"; `brand()` swaps it on the way out.
export const APP = String(process.env.MOVIE_ROYAL_APP || ALL[id]?.app || 'Movie Royal');
const KEEP = '(?:e\\b| celebration| capture window| paused message| battle\\b| marathon\\b| roll call| Backup| starting soon| sleeping banner| be right back| background| sync channel| debug channel| [–—] |\\\\(?!\'))';
const SEEN = new RegExp('(?<![\\\\])Movie Royal(?!' + KEEP + ')', 'g'), SEEN_LOW = new RegExp('(?<![\\\\])movie royal(?!' + KEEP + ')', 'g');
// 🧽 Name scrub (1.97.0, Derek: "remove kirb, timepeace, timepeace49, derek names from any birx or trues editions"): editions with `scrub`
// never show those names. The code keeps them (Derek's and Kirb's editions want them); they are swapped on the way out, like the app's name.
export const scrub = !!ALL[id]?.scrub;
/** 👀 The name + the name scrub of the edition being shown right now (the dev edition can look like another one, 1.106.0). */
export const appNow = () => (lookAs && ALL[lookAs] ? String(ALL[lookAs].app || 'Movie Royal') : APP);
export const scrubNow = () => (lookAs && ALL[lookAs] ? !!ALL[lookAs].scrub : scrub);
const SCRUB = [[/(?<!github\.com\/)TimePeace49/g, 'Red Kraken'], [/Kirbgames/g, 'Blue Serpent'], [/timepeace49 and kirbgames/g, 'red kraken and blue serpent'],
  [/Take out Time/g, 'Take out Red'], [/Take out Kirb/g, 'Take out Blue'], [/take out kirb/g, 'take out blue'], [/'KIRB' : 'TIME'/g, "'BLUE' : 'RED'"], [/letter: 'T'/g, "letter: 'R'"], [/letter: 'K'/g, "letter: 'B'"],
  [/Kirb \(the blue K monkey\)/g, 'Blue (the blue B monkey)'], [/Time \(the red T monkey\)/g, 'Red (the red R monkey)'], [/blue K monkey/g, 'blue B monkey'], [/red T monkey/g, 'red R monkey'], [/ \((?:Kirb|Time)\)/g, ''],
  [/Kirb spots/g, 'Wild spots'], [/\(Kirb\) /g, ''], [/, kirb, luck/g, ', wheel, luck'], [/Wheel of Kirbportions/g, 'the ready-made wheel'], [/\bKirb's\b/g, "the streamer's"], [/\bKirb\b/g, 'the streamer'],
  [/placeholder="timepeace49"/g, 'placeholder="your_channel"'], [/derek\/movie-royal/g, 'username/movie-royal'], [/!call kirb/g, '!call wild'], [/friend kirb partner/g, 'friend partner'],
  [/\bDerek's\b/g, "the streamer's"], [/\bDerek\b/g, 'the streamer'], [/(?<![\w/.@-])TimePeace(?![\w])/g, 'the streamer']];
const scrubOut = t => { if (!scrubNow() || typeof t !== 'string') return t; for (const [re, to] of SCRUB) t = t.replace(re, to); return t; };
export const brand = t => { const A = appNow(); return scrubOut(A === 'Movie Royal' || typeof t !== 'string' || !t.includes('Movie Royal') ? t : t.replace(SEEN, A)); };
/** For page files: also the lower-case spelling (help mode's word patterns match what's on screen). */
export const brandFile = t => { const A = appNow(); return scrubOut(A === 'Movie Royal' ? t : t.replace(SEEN, A).replace(SEEN_LOW, A.toLowerCase()).replace(/MOVIE ROYAL/g, A.toUpperCase())); };
/** What the pages have to hide right now: the `hide` notes of every part this edition (or the one being looked at) doesn't have. */
export const hideNow = () => FEATURES.filter(f => f.hide && (f.kind === 'on' ? !onNow().includes(f.id) : !has(f.id))).map(f => f.hide);
export const info = () => ({ hide: hideNow(), id: EDITION.id, name: EDITION.name, app: appNow(), dev: EDITION.dev && !lookAs, realDev: EDITION.dev, off: offNow(), lookAs, lookName: lookAs ? ALL[lookAs].name : '', repo: EDITION.repo, all: Object.entries(ALL).map(([k, v]) => ({ id: k, name: v.name, app: v.app || 'Movie Royal', repo: v.repo, dev: !!v.dev, scrub: !!v.scrub })) });

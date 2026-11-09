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
export const feat = (name, devMode) => onNow().includes(name) || (EDITION.dev && !!devMode);
export const FEATS = ['movienight', 'chatbot', 'kick', 'songs', 'dash', 'eggs'];
export const is = (...ids) => ids.includes(EDITION.id);
// 🏷️ The name people see (1.92.0, Derek: "rename the whole project to TimePeace Chatbot"; True's + Birx's editions carry their own name).
// Only what people SEE changes: the data folder, program file, installer file, OBS source names, Stream Deck page names and the Backup Bots
// app keep "Movie Royal", so nobody loses data and updates keep working. The code keeps saying "Movie Royal"; `brand()` swaps it on the way out.
export const APP = String(process.env.MOVIE_ROYAL_APP || ALL[id]?.app || 'Movie Royal');
const KEEP = '(?:e\\b| celebration| capture window| paused message| battle\\b| marathon\\b| roll call| Backup| starting soon| sleeping banner| be right back| background| sync channel| debug channel| [–—] |\\\\(?!\'))';
const SEEN = new RegExp('(?<![\\\\])Movie Royal(?!' + KEEP + ')', 'g'), SEEN_LOW = new RegExp('(?<![\\\\])movie royal(?!' + KEEP + ')', 'g');
export const brand = t => (APP === 'Movie Royal' || typeof t !== 'string' || !t.includes('Movie Royal') ? t : t.replace(SEEN, APP));
/** For page files: also the lower-case spelling (help mode's word patterns match what's on screen). */
export const brandFile = t => (APP === 'Movie Royal' ? t : t.replace(SEEN, APP).replace(SEEN_LOW, APP.toLowerCase()).replace(/MOVIE ROYAL/g, APP.toUpperCase()));
export const info = () => ({ id: EDITION.id, name: EDITION.name, app: APP, dev: EDITION.dev, off: offNow(), lookAs, repo: EDITION.repo, all: Object.entries(ALL).map(([k, v]) => ({ id: k, name: v.name, repo: v.repo })) });

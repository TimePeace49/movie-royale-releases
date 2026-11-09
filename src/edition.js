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
export const is = (...ids) => ids.includes(EDITION.id);
export const info = () => ({ id: EDITION.id, name: EDITION.name, dev: EDITION.dev, off: offNow(), lookAs, repo: EDITION.repo, all: Object.entries(ALL).map(([k, v]) => ({ id: k, name: v.name, repo: v.repo })) });

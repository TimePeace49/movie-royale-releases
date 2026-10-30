// ⚠️ Error history: everything that went wrong, kept in data/errors.json (last 300).
// Shown in the 🧪 Test tab → ⚠️ Errors, in plain words and as a tech report Derek can paste to Claude.
import fs from 'fs';
import path from 'path';
import { DATA } from './store.js';

const FILE = path.join(DATA, 'errors.json');
let list = [];
try { list = JSON.parse(fs.readFileSync(FILE, 'utf8')); if (!Array.isArray(list)) list = []; } catch {}
let saveT = null, onNew = () => {};
const persist = () => { clearTimeout(saveT); saveT = setTimeout(() => { try { fs.writeFileSync(FILE, JSON.stringify(list.slice(0, 300))); } catch {} }, 1500); };
export const setOnNew = fn => { onNew = fn; };

// what each kind of problem means, in plain words (+ what to do)
const SOURCES = { twitch: 'Twitch', discord: 'Discord bot', '24/7': '24/7 Discord bot', cloud: '24/7 Discord bot', 'game screen': 'Game screen', preview: 'Setting up the cliff', cliff: 'Setting up the cliff', rewards: 'Channel point rewards', letterboxd: 'Letterboxd', stats: 'Battle stats', obs: 'OBS', donations: 'Donations', 'control panel': 'Control panel', tmdb: 'Movie search (TMDB)', app: 'Movie Royal' };
export function plain(e) {
  const m = String(e.msg || ''), who = SOURCES[e.source] || 'Movie Royal';
  let what = 'Something went wrong', fix = 'If it keeps happening: ⚠️ Errors → 🛠️ For Claude → Copy, and send it to Claude.';
  if (/HTTP 403/.test(m) && e.source === 'letterboxd') { what = 'Letterboxd turned away the full profile read'; fix = 'Your newest watched movies still come in (from your Letterboxd feed). Nothing to do.'; }
  else if (/401|unauthori[sz]ed|invalid.*token|token.*(expired|invalid)/i.test(m)) { what = 'The sign-in stopped working'; fix = e.source === 'twitch' ? 'Sign in with Twitch again (top right).' : 'Check the token / key in ⚙️ Settings.'; }
  else if (/403|forbidden|missing access|permission/i.test(m)) { what = "It wasn't allowed to do that"; fix = 'Check the permissions (sign in again, or re-invite the Discord bot).'; }
  else if (/fetch failed|ENOTFOUND|ECONNRESET|ETIMEDOUT|timeout|aborted|network|socket hang up|EAI_AGAIN/i.test(m)) { what = "Couldn't reach the internet (or that site was down)"; fix = 'Usually fixes itself. If it keeps happening, check your internet.'; }
  else if (/limit|429|too many/i.test(m)) { what = 'Hit a limit (too many requests)'; fix = 'Wait a bit; it works again later.'; }
  else if (/not found|404/i.test(m)) { what = "Couldn't find it"; fix = 'Check the name / link in ⚙️ Settings.'; }
  else if (/is not defined|cannot read|undefined|null|is not a function|syntax/i.test(m)) { what = 'A bug in Movie Royal'; fix = 'Copy the tech report and send it to Claude.'; }
  return { who, what, fix };
}
export function logErr(source, msg, detail = '') {
  msg = String(msg || '').slice(0, 600); if (!msg || /ResizeObserver loop|DeprecationWarning/i.test(msg)) return; // (harmless noise, not real problems)
  const last = list[0];
  if (last && last.source === source && last.msg === msg && Date.now() - last.at < 60000) { last.count = (last.count || 1) + 1; last.at = Date.now(); persist(); return; } // the same thing again: just count it
  const e = { id: Math.random().toString(36).slice(2, 10), at: Date.now(), source, msg, detail: String(detail || '').slice(0, 3000), count: 1 };
  if (quiet(source, msg)) e.quiet = true;
  list.unshift(e); list = list.slice(0, 300); persist();
  if (!e.quiet) try { onNew(e); } catch {}
}
// 🤫 OBS is just closed (1.58.3, Derek): not a problem, so no message about it. It's still kept for the tech report (🛠️ For Claude),
// in case something else goes wrong. Other OBS problems (wrong password…) still show.
const OBS_CLOSED = /couldn.t reach OBS|OBS closed the connection|ECONNREFUSED.*4455|connect ECONNREFUSED/i;
export const quiet = (source, msg) => source === 'obs' && OBS_CLOSED.test(String(msg || ''));
export const errors = () => list; // (everything, for the tech report)
export const shown = () => list.filter(e => !e.quiet); // (what the ⚠️ Errors tab and its count show)
export function clear() { list = []; persist(); }

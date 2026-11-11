// 📮 Error reports to the app's maker (1.143.0, Derek: "in the error tab on server app I can look at all the apps connected to it and get reports of their errors… a command center").
// Each app sends a small report to a mailbox on the maker's 24/7 bot: which edition / version / channel it is, its recent problems in plain words and the
// same no-secrets tech report the ⚠️ Errors tab makes. Nothing else, no passwords or keys. On by default; Settings → Account turns it off (privacy.html says so).
// The app can only DROP a report there; it can't read anything back.
import crypto from 'crypto';
import os from 'os';
import { db, save } from './store.js';
import { EDITION, APP } from './edition.js';
import * as errlog from './errlog.js';
import * as shared from './shared.js';

const H = { report: () => '', channel: () => '', version: () => '', live: () => false };
export const setHooks = h => Object.assign(H, h);
export const status = { at: 0, ok: null, error: '', why: '' };
export const on = () => db.settings.sendReports !== false;
export const url = () => process.env.REPORTS_URL || shared.reportsUrl();
const id = () => { if (!/^[a-f0-9]{32}$/.test(String(db.installId || ''))) { db.installId = crypto.randomBytes(16).toString('hex'); save(); } return db.installId; };
/** What gets sent (also shown by the 👀 button, so anyone can see it before it goes). */
export function build(why = 'timer') {
  const errors = errlog.shown().slice(0, 60).map(e => { let p = {}; try { p = errlog.plain(e) || {}; } catch {} return { at: e.at || 0, source: String(e.source || ''), who: p.who || '', what: p.what || '', fix: p.fix || '', msg: String(e.msg || '').slice(0, 500) }; });
  let report = ''; try { report = String(H.report() || '').slice(0, 30000); } catch {}
  return { id: id(), edition: EDITION.id, app: APP, channel: String(H.channel() || ''), version: String(H.version() || ''), os: `${process.platform} ${os.release()}`.slice(0, 60), live: !!H.live(), at: Date.now(), why, errors, report };
}
let busy = false;
export async function send(why = 'timer', { force = false } = {}) {
  if (!force && !on()) return { ok: false, off: true }; const u = url(); if (!u) return { ok: false, error: 'no mailbox to send to yet' }; if (busy) return { ok: false, busy: true };
  busy = true; status.why = why;
  try { const r = await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(build(why)), signal: AbortSignal.timeout(12000) }); const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || 'the mailbox answered ' + r.status); status.at = Date.now(); status.ok = true; status.error = ''; return { ok: true, wait: !!j.wait };
  } catch (e) { status.ok = false; status.error = String(e.message || e).slice(0, 200); return { ok: false, error: status.error }; } /* (never logged as an error: a report about a failed report would loop) */
  finally { busy = false; }
}
/** 🧹 (Derek: "when I clear them on server app it clears them on their app") the app asks the mailbox every 5 minutes whether its problem list was cleared from the command center; a newer time = clear the list here too, then send a fresh report. */
export async function checkClear() {
  if (!on()) return { ok: false, off: true }; const u = url(); if (!u) return { ok: false };
  try { const r = await fetch(u + '?id=' + id(), { signal: AbortSignal.timeout(10000) }); const j = await r.json().catch(() => ({})); const t = Number(j.clear) || 0;
    if (t > (Number(db.reportsClearAt) || 0)) { db.reportsClearAt = t; save(); if (errlog.errors().length) { errlog.clear(); try { H.cleared && H.cleared(); } catch {} } send('cleared').catch(() => {}); return { ok: true, cleared: true }; }
    return { ok: true, cleared: false };
  } catch (e) { return { ok: false, error: String(e.message || e).slice(0, 200) }; }
}
setTimeout(() => checkClear().catch(() => {}), 60000).unref?.(); setInterval(() => checkClear().catch(() => {}), 5 * 60000).unref?.();
let soonT = null;
/** a new problem was logged: send in a minute and a half (so a burst goes as one report) */
export const soon = () => { if (!on()) return; clearTimeout(soonT); soonT = setTimeout(() => send('error').catch(() => {}), 95000); soonT.unref?.(); };
export const state = () => ({ on: on(), url: url() ? url().replace(/^https?:\/\//, '').replace(/\/reports$/, '') : '', at: status.at, ok: status.ok, error: status.error });
setTimeout(() => send('start').catch(() => {}), 45000).unref?.(); setInterval(() => send('timer').catch(() => {}), 30 * 60000).unref?.();

// 🎨 Custom characters (1.55.0, Derek): people build their own battle character in Discord with /character —
// a number for each part (hair, outfit, makeup, facial hair, + skin and hair color). Saved by Discord id in db.looks.
// The part names live in public/charparts.js (the /*NAMES*/ … /*END*/ block) so the drawing and this stay in step.
// The 24/7 bot (cloud-worker.js) has its own copy of the /character answers: keep them alike.
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { db, save, ROOT } from './store.js';

const PUB = path.join(ROOT, 'public');
const src = fs.readFileSync(path.join(PUB, 'charparts.js'), 'utf8');
export const BASE_NAMES = JSON.parse(src.slice(src.indexOf('/*NAMES*/') + 9, src.indexOf('/*END*/')));
// 🔢 20 versions of every part except the body (1.59.0): the same expansion as charparts.js (keep alike)
export const VARS = JSON.parse(src.slice(src.indexOf('/*VARS*/') + 8, src.indexOf('/*VEND*/')));
const vname = (k, b, base, tag) => k === 'skin' || k === 'haircolor' ? `${tag} ${base}` : k === 'makeup' && b === 1 ? tag : k === 'facialhair' && b === 1 ? `Shadow · ${tag}` : `${base} · ${tag}`;
export const NAMES = Object.fromEntries(Object.entries(BASE_NAMES).map(([k, list]) => [k, VARS[k] ? [...list, ...VARS[k].flatMap(tag => list.map((x, i) => vname(k, i + 1, x, tag)))] : list.slice()]));
export const PARTS = ['hair', 'outfit', 'makeup', 'facialhair', 'body', 'skin', 'haircolor', 'accessory'];
export const LABEL = { hair: '💇 Hair', outfit: '👕 Outfit', makeup: '💄 Makeup', facialhair: '🧔 Facial hair', body: '🧍 Body', skin: '✋ Skin', haircolor: '🎨 Hair color', accessory: '🎩 Head accessory' };
export const SHEETS = ['hair', 'hair2', 'outfit', 'outfit2', 'outfit3', 'makeup', 'facialhair', 'body', 'colors']; // (same as public/charsheet.html) // the picture sheets (public/chars/<name>.png)
export const SHEET_TITLE = { hair: "💇 Hair 1–25 (men's styles)", hair2: "💇 Hair 26–50 (women's styles)", outfit: "👕 Outfits 1–25 (men's)", outfit2: "👗 Outfits 26–50 (women's)", outfit3: '🦸 Outfits 51–75 (costumes)', makeup: '💄 Makeup', facialhair: '🧔 Facial hair', body: '🧍 Body', colors: '🎨 Skin + hair color' };
export const sheetFile = s => path.join(PUB, 'chars', s + '.png');
const DEF = { skin: 3, haircolor: 2, body: 1 };
// 🎩 1.59.4 (Derek): hair versions 4–18 were accessories (Headband … Feather); they're their own part now. Anyone who picked one keeps the
// same look: plain hair + that accessory (accessory = version − 2). Runs once.
{
  const fix = l => { if (!l || !l.hair) return; const N0 = BASE_NAMES.hair.length, v = Math.floor((l.hair - 1) / N0); if (v >= 4 && v <= 18) { l.hair = (l.hair - 1) % N0 + 1; if (!l.accessory || l.accessory === 1) l.accessory = v - 2; } };
  if (!db.settings.v19acc) { db.settings.v19acc = true; for (const l of Object.values(db.looks || {})) fix(l); for (const l of db.settings.spotLooks || []) fix(l); save(); }
} // what the drawing uses when someone never picked these

/** A short code for the picture sheets: when they change, the app uploads them to the 24/7 bot again. */
export const SITE = { sitehtml: path.join(PUB, 'characters.html'), sitejs: path.join(PUB, 'charparts.js') }; // 🌐 the parts website (the 24/7 bot hosts it)
export const picsVersion = (() => { const h = crypto.createHash('sha1'); for (const f of [...SHEETS.map(sheetFile), ...Object.values(SITE)]) { try { h.update(fs.readFileSync(f)); } catch {} } return h.digest('hex').slice(0, 10); })();

export const on = () => db.settings.looksOn !== false;
export const lookOf = discordId => (discordId && db.looks?.[String(discordId)]) || null;
/** Discord id for a Twitch name (people link with /linktwitch). */
export function discordFor(login) {
  const l = String(login || '').toLowerCase(); if (!l) return null;
  for (const [id, tw] of Object.entries(db.links || {})) if (String(tw).toLowerCase() === l) return id;
  return null;
}
/** The look a battle piece uses (or undefined = a random character). Their own character always wins over !id;
 *  only when they never picked a body does !id woman give the chest shape. */
export function lookFor({ discordId, login, gender } = {}) {
  if (!on()) return undefined;
  const l = lookOf(discordId) || lookOf(discordFor(login)); if (!l) return undefined;
  const o = nums(l); if (!o.body) o.body = gender === 'f' ? 2 : 1; return o;
}

/** Check the numbers someone typed. Returns { look, bad } (bad = parts with a number that isn't on the sheet). */
export function check(picks, base = {}) {
  const look = { ...base }, bad = [];
  for (const k of PARTS) {
    const v = picks?.[k]; if (v == null || v === '') continue;
    const n = Number(v);
    if (!Number.isInteger(n) || n < 1 || n > NAMES[k].length) bad.push(`${LABEL[k]}: pick 1 to ${NAMES[k].length}`); else look[k] = n;
  }
  return { look, bad };
}
const nm = (k, n) => NAMES[k][(n || DEF[k] || 1) - 1] || '?';
/** "💇 Hair #7 Afro · 👕 Outfit #3 Hoodie · …" */
export function lookText(look, sep = '\n') {
  return PARTS.map(k => `${LABEL[k]} **#${look?.[k] || DEF[k] || 1}** ${nm(k, look?.[k])}${look?.[k] ? '' : ' *(not picked yet)*'}`).join(sep);
}
// 🌐 The parts website (1.59.0): the 24/7 bot (Cloudflare) hosts it once this PC uploaded it (db.charSite), or a link set by hand (settings.charSite)
export const site = () => { if (db.settings.charSite) return String(db.settings.charSite); const c = db.settings.cloud || {}; return c.enabled && c.url && db.charSite?.url ? db.charSite.url : null; };
export const counts = () => `${NAMES.hair.length} hair styles, ${NAMES.outfit.length} outfits, ${NAMES.accessory.length - 1} head accessories, ${NAMES.makeup.length} makeups, ${NAMES.facialhair.length} facial hairs, ${NAMES.body.length} bodies, ${NAMES.skin.length} skin colors and ${NAMES.haircolor.length} hair colors`;
export const howTo = () => `Type **/character** and fill in a number for each part, for example \`/character hair:7 outfit:3 makeup:1 facialhair:8 accessory:17\`. You only need the parts you want to change (also \`body\`, \`skin\` and \`haircolor\`). Pick 1 of each.`;

/** What /character answers (the app's own Discord bot and the 🧪 Test tab use this). */
export function characterReply(user, picks) {
  const cur = lookOf(user.discordId), any = PARTS.some(k => picks?.[k] != null);
  if (!any) return { saved: false, text: `🎨 **Make your own Movie Royal character!** ${site() ? `See every part with its number (and try them on) here: <${site()}>` : 'Look at the pictures below and pick a number for each part.'}\n${howTo()}\n\n${cur ? `**Your character right now:**\n${lookText(cur)}` : "You haven't made one yet: until you do, your piece is a random character."}` };
  const { look, bad } = check(picks, cur || {});
  if (bad.length) return { saved: false, text: `🤔 Those numbers aren't on the list:\n${bad.join('\n')}\n${site() ? `Every part with its number: <${site()}>` : 'Type **/character** with nothing after it to see the pictures again.'}` };
  setLook(user.discordId, look, user.name);
  return { saved: true, look, first: !cur, text: `✅ **Saved! This is your character now:**\n${lookText(look)}\n\nYou'll be this character in Movie Royal battles that use 🧍 characters${user.linked === false ? ' (to be your character in Twitch chat battles too, link your Twitch name with **/linktwitch**)' : ''}. Change any part any time with **/character**.` };
}
export function setLook(discordId, look, name) {
  db.looks ||= {};
  const clean = {}; for (const k of PARTS) if (look?.[k]) clean[k] = look[k];
  db.looks[String(discordId)] = { ...clean, name: name || db.looks[String(discordId)]?.name || '', at: Date.now() };
  save();
  return db.looks[String(discordId)];
}
/** Just the numbers (what battles and the 24/7 bot need). */
export const nums = l => { const o = {}; for (const k of PARTS) if (l?.[k]) o[k] = l[k]; return o; };
/** A random character (practice battles). */
export const randomLook = () => Object.fromEntries(PARTS.map(k => [k, 1 + Math.floor(Math.random() * NAMES[k].length)]));

// ---------- 🖼️ a small picture of someone's character (drawn by the app in a hidden window; posted in Discord) ----------
let base = 'http://127.0.0.1:' + (process.env.PORT || 3737);
export const setBase = u => { base = u; };
/** PNG (Buffer) of this look, or null if it can't be drawn here (only the Windows app can; tests use Playwright if it's there). */
export async function picture(look, name, size = 200) {
  const url = `${base}/charone.html?size=${size}&look=${encodeURIComponent(JSON.stringify(nums(look)))}&name=${encodeURIComponent(String(name || '').slice(0, 24))}`;
  let png = null;
  try {
    if (globalThis.__desktop?.renderPicture) png = await globalThis.__desktop.renderPicture(url);
    else { // (not the Windows app: try Playwright, for testing)
      const { createRequire } = await import('module'); const req = createRequire(import.meta.url); let pw;
      for (const p of ['playwright', ...(process.env.NODE_PATH || '').split(/[:;]/).filter(Boolean).map(d => d + '/playwright')]) { try { pw = req(p); break; } catch {} }
      if (pw) { const b = await pw.chromium.launch(); try { const pg = await b.newPage(); await pg.goto(url); png = await pg.waitForFunction(() => window.__png, null, { timeout: 10000 }).then(h => h.jsonValue()); } finally { await b.close(); } }
    }
  } catch (e) { console.error('[looks] couldn\'t draw the character picture:', e.message); }
  return png && String(png).startsWith('data:image/png;base64,') ? Buffer.from(String(png).split(',')[1], 'base64') : null;
}
const lastPost = new Map(); // someone fiddling with their character: post it in the channel at most every 5 minutes
export function postOk(discordId) { if (db.settings.lookPost === false) return false; const t = lastPost.get(discordId) || 0; if (Date.now() - t < 5 * 60e3) return false; lastPost.set(discordId, Date.now()); return true; }
export const postText = (name, first) => `🎨 **${name}** ${first ? 'made their' : 'changed their'} Movie Royal character! Make yours with **/character**.`;

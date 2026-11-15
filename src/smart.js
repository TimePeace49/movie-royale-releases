// 🔌 Smart plug controls (1.160.0, Derek: "I have a bunch of smart plugs and lights… buttons to control them in the app… when subs and raids go off
// only the Energizer bulbs go off… set them up through the app and skip Alexa… Stream Deck buttons I can add later". His edition only: extra `smart`).
// Two makers' online services, no Alexa in between (Alexa keeps working as it was: nothing is re-paired or unlinked):
//   Govee  = the key from the Govee Home app (Govee-API-Key header) → openapi.api.govee.com
//   Tuya   = Gosund + Energizer (both are built on Tuya): a free Tuya developer project's Access ID + Secret → openapi.tuya<region>.com
// Keys are typed in by the user in Settings, kept in db.smart, and never leave in state(), the debug report or a toast.
// UNTESTED against the real services from the cloud session (pretend servers only): env GOVEE_API_URL / TUYA_API_URL point at a pretend one.
import crypto from 'crypto';
import { db, save } from './store.js';

const H = { on: () => false, act: () => {}, changed: () => {}, toast: () => {} };
export const setHooks = h => Object.assign(H, h);
const clamp = (v, lo, hi, d) => { v = Number(v); return Number.isFinite(v) ? Math.max(lo, Math.min(hi, v)) : d; };
const sleep = ms => new Promise(r => setTimeout(r, ms));

export const REGIONS = { us: ['Western America', 'openapi.tuyaus.com'], ue: ['Eastern America', 'openapi-ueaz.tuyaus.com'], eu: ['Central Europe', 'openapi.tuyaeu.com'], we: ['Western Europe', 'openapi-weaz.tuyaeu.com'], in: ['India', 'openapi.tuyain.com'], cn: ['China', 'openapi.tuyacn.com'] };
export const EVENTS = { sub: ['💜 Sub', '#9146ff'], gift: ['🎁 Gift subs', '#ff4fa3'], raid: ['🚀 Raid', '#ff3b30'], bits: ['💎 Bits', '#ffd400'], tip: ['💵 Donation', '#22c55e'] };
export const MINS = { bits: 300, tip: 3 }; // (1.161.0, Derek: "any bits over 300 or donations over 3 bucks": that amount or more)
export const STYLES = { flash: 'Flash (colour ↔ dim)', quick: 'Fast flash (the bulb does it itself)', rainbow: 'Rainbow', solid: 'Hold the colour' };
export const QUICK_SPEED = 100; // the bulb's own 0–100 flash setting (which end is fastest differs by bulb: ▶ Try it shows)
const STEP = 1100; // (Tuya's online service: about one change a second per bulb, or it starts dropping them)

function data() {
  const d = (db.smart ||= {});
  d.govee ||= {}; d.tuya ||= {}; d.devices ||= []; d.events ||= {};
  return d;
}
export const on = () => H.on() && data().on !== false;
export function events() { const d = data(), out = {};
  for (const [k, [, col]] of Object.entries(EVENTS)) { const e = d.events[k] || {}; out[k] = { on: e.on !== false, ...(MINS[k] != null ? { min: clamp(e.min, 0, 1000000, MINS[k]) } : {}), style: STYLES[e.style] ? e.style : 'quick', /* (1.162.1, Derek: "add speed to raid, sub, and gifted subs too": every event starts on Fast flash; a style he picked himself stays) */ color: /^#[0-9a-f]{6}$/i.test(e.color || '') ? e.color : col, secs: clamp(e.secs, 3, 60, k === 'raid' ? 12 : 8), speed: clamp(e.speed, 0, 100, QUICK_SPEED) }; }
  return out; }

// ── colours ────────────────────────────────────────────────────────────────────────────────────────
export const hexRgb = h => { const m = /^#?([0-9a-f]{6})$/i.exec(String(h || '')); const n = m ? parseInt(m[1], 16) : 0xffffff; return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
export function rgbHsv([r, g, b]) { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; let h = 0;
  if (d) { if (mx === r) h = ((g - b) / d) % 6; else if (mx === g) h = (b - r) / d + 2; else h = (r - g) / d + 4; h = Math.round(h * 60); if (h < 0) h += 360; }
  return { h, s: mx ? d / mx : 0, v: mx }; }
export function hsvRgb(h, s, v) { const f = n => { const k = (n + h / 60) % 6; return Math.round(255 * (v - v * s * Math.max(0, Math.min(k, 4 - k, 1)))); }; return [f(5), f(3), f(1)]; }
const rgbHex = ([r, g, b]) => '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');

// ── Govee ──────────────────────────────────────────────────────────────────────────────────────────
const goveeBase = () => process.env.GOVEE_API_URL || 'https://openapi.api.govee.com';
async function govee(method, path, body) {
  const key = data().govee.key; if (!key) throw new Error('Govee isn\'t connected yet (paste your Govee key first).');
  let r; try { r = await fetch(goveeBase() + path, { method, headers: { 'Govee-API-Key': key, 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(12000) }); }
  catch (e) { throw new Error('Couldn\'t reach Govee (' + (e.name === 'TimeoutError' ? 'it took too long' : 'no connection') + ').'); }
  let j = {}; try { j = await r.json(); } catch {}
  if (r.status === 401 || r.status === 403) throw new Error('Govee didn\'t accept the key. Check it was pasted whole.');
  if (r.status === 429) throw new Error('Govee says: too many changes too fast. Wait a minute.');
  if (!r.ok || (j.code && j.code !== 200)) throw new Error('Govee said no: ' + String(j.message || j.msg || r.status).slice(0, 160));
  return j;
}
const goveeCap = (d, type, instance, value) => govee('POST', '/router/api/v1/device/control', { requestId: crypto.randomUUID(), payload: { sku: d.sku, device: d.dev, capability: { type: 'devices.capabilities.' + type, instance, value } } });
async function goveeList() {
  const j = await govee('GET', '/router/api/v1/user/devices');
  return (j.data || []).map(x => { const caps = (x.capabilities || []).map(c => c.instance), t = String(x.type || '');
    return { id: 'g:' + x.device, src: 'govee', dev: x.device, sku: x.sku, name: String(x.deviceName || x.sku || 'Govee device').slice(0, 60), type: /socket|plug/i.test(t) ? 'plug' : /light/i.test(t) || caps.includes('colorRgb') ? 'bulb' : 'other', color: caps.includes('colorRgb'), dim: caps.includes('brightness') }; });
}
async function goveeState(d) {
  const j = await govee('POST', '/router/api/v1/device/state', { requestId: crypto.randomUUID(), payload: { sku: d.sku, device: d.dev } });
  const caps = j.payload?.capabilities || [], v = i => caps.find(c => c.instance === i)?.state?.value;
  return { on: v('powerSwitch') === 1 || v('powerSwitch') === true, online: v('online') !== false, rgb: Number.isFinite(v('colorRgb')) ? v('colorRgb') : null, bright: Number.isFinite(v('brightness')) ? v('brightness') : null, kelvin: v('colorTemperatureK') || null };
}

// ── Tuya (Gosund, Energizer…) ──────────────────────────────────────────────────────────────────────
const tuyaBase = () => process.env.TUYA_API_URL || 'https://' + (REGIONS[data().tuya.region] || REGIONS.us)[1];
let tuyaTok = null; // {token, exp, forId}
export function tuyaSign(id, secret, token, t, nonce, method, path, body) { // (pure: Tuya's signing rule)
  const str = [method, crypto.createHash('sha256').update(body || '').digest('hex'), '', path].join('\n');
  return crypto.createHmac('sha256', secret).update(id + (token || '') + t + nonce + str).digest('hex').toUpperCase();
}
const TUYA_ERR = { 1004: 'Tuya didn\'t accept the Access ID / Secret (check both were pasted whole, and the data center)', 1010: 'Tuya sign-in ran out; try again', 1011: 'Tuya sign-in ran out; try again', 1106: 'Tuya says this project isn\'t allowed to use that device. Link your app account to the project (Devices → Link App Account) and give it “Controllable” permission', 2001: 'that device is offline', 2003: 'that device doesn\'t know that command', 2008: 'that device doesn\'t know that command', 28841002: 'your Tuya project\'s free “IoT Core” plan has run out. Renew it (free) on iot.tuya.com → Cloud → your project → Service API', 28841105: 'your Tuya project isn\'t signed up for this service. On iot.tuya.com → Cloud → your project → Service API, add “IoT Core”', 1100: 'something in the request was empty', 1109: 'wrong data center for this project: pick the one your Tuya project uses' };
async function tuyaRaw(method, path, body, token) {
  const c = data().tuya, t = String(Date.now()), nonce = crypto.randomUUID(), bs = body ? JSON.stringify(body) : '';
  let r; try { r = await fetch(tuyaBase() + path, { method, headers: { client_id: c.id, sign: tuyaSign(c.id, c.secret, token, t, nonce, method, path, bs), t, nonce, sign_method: 'HMAC-SHA256', ...(token ? { access_token: token } : {}), 'content-type': 'application/json' }, body: bs || undefined, signal: AbortSignal.timeout(12000) }); }
  catch (e) { throw new Error('Couldn\'t reach Tuya (' + (e.name === 'TimeoutError' ? 'it took too long' : 'no connection') + ').'); }
  let j = {}; try { j = await r.json(); } catch {}
  if (!j.success) { const e = new Error(TUYA_ERR[j.code] ? TUYA_ERR[j.code][0].toUpperCase() + TUYA_ERR[j.code].slice(1) + '.' : 'Tuya said no: ' + String(j.msg || r.status).slice(0, 160) + (j.code ? ` (${j.code})` : '')); e.tuya = j.code; throw e; }
  return j.result;
}
async function tuya(method, path, body) {
  const c = data().tuya; if (!c.id || !c.secret) throw new Error('Tuya isn\'t connected yet (paste your Access ID and Secret first).');
  for (let i = 0; i < 2; i++) {
    if (!tuyaTok || tuyaTok.forId !== c.id + tuyaBase() || tuyaTok.exp < Date.now() + 60000) { const r = await tuyaRaw('GET', '/v1.0/token?grant_type=1'); tuyaTok = { token: r.access_token, exp: Date.now() + (Number(r.expire_time) || 3600) * 1000, forId: c.id + tuyaBase() }; }
    try { return await tuyaRaw(method, path, body, tuyaTok.token); } catch (e) { if ((e.tuya === 1010 || e.tuya === 1011) && !i) { tuyaTok = null; continue; } throw e; }
  }
}
const BULB_CAT = /^(dj|dd|xdd|fwd|dc|tgq|tgkg|gyd|sxd|tyndj|fsd)$/, PLUG_CAT = /^(cz|pc|kg|tdq|dlq|wkcz)$/;
const tuyaRow = x => { const cat = String(x.category || ''); return { id: 't:' + x.id, src: 'tuya', dev: x.id, name: String(x.customName || x.custom_name || x.name || 'Tuya device').slice(0, 60), type: BULB_CAT.test(cat) ? 'bulb' : PLUG_CAT.test(cat) ? 'plug' : 'other', cat, product: String(x.productName || x.product_name || '').slice(0, 60), online: x.isOnline ?? x.online ?? null }; };
async function tuyaList() { // every device linked to the project (newer call first, then the older one)
  const out = [], seen = new Set(), add = x => { if (x?.id && !seen.has(x.id)) { seen.add(x.id); out.push(tuyaRow(x)); } };
  let err = null;
  try { let last = ''; for (let p = 0; p < 10; p++) { const r = await tuya('GET', '/v2.0/cloud/thing/device?' + (last ? 'last_id=' + encodeURIComponent(last) + '&' : '') + 'page_size=20'); const rows = Array.isArray(r) ? r : r?.list || []; rows.forEach(add); if (rows.length < 20) break; last = rows[rows.length - 1].id; } } catch (e) { err = e; }
  if (!out.length) { try { let key = ''; for (let p = 0; p < 10; p++) { const r = await tuya('GET', '/v1.0/iot-01/associated-users/devices?' + (key ? 'last_row_key=' + encodeURIComponent(key) + '&' : '') + 'size=50'); (r?.devices || []).forEach(add); if (!r?.has_more) break; key = r.last_row_key; } err = null; } catch (e) { err ||= e; } }
  if (!out.length && err) throw err;
  return out;
}
const tuyaStatus = async d => { const r = await tuya('GET', `/v1.0/iot-03/devices/${d.dev}/status`); return Object.fromEntries((r || []).map(x => [x.code, x.value])); };
const tuyaCmd = (d, commands) => tuya('POST', `/v1.0/iot-03/devices/${d.dev}/commands`, { commands });
const parseVal = v => { if (typeof v === 'string') { try { return JSON.parse(v); } catch { return null; } } return v; };
/** which command names this Tuya device uses (bulbs come in an older and a newer flavour; plugs say switch_1 or switch). Pure. */
export function tuyaCodes(st) {
  const has = k => k in st, sw = ['switch_led', 'switch_1', 'switch', 'led_switch'].find(has) || null;
  return { sw, colour: has('colour_data_v2') ? 'colour_data_v2' : has('colour_data') ? 'colour_data' : null, v2: has('colour_data_v2') || has('bright_value_v2'), bright: has('bright_value_v2') ? 'bright_value_v2' : has('bright_value') ? 'bright_value' : null, mode: has('work_mode') ? 'work_mode' : null, temp: has('temp_value_v2') ? 'temp_value_v2' : has('temp_value') ? 'temp_value' : null, scene: has('scene_data_v2') ? 'scene_data_v2' : null };
}
/** the commands that turn a Tuya bulb a colour (hex) at a brightness (0–1). Pure. */
export function tuyaColour(codes, hex, v = 1) {
  if (!codes.colour) return null; const { h, s } = rgbHsv(hexRgb(hex)), top = codes.v2 ? 1000 : 255;
  return [...(codes.sw ? [{ code: codes.sw, value: true }] : []), ...(codes.mode ? [{ code: codes.mode, value: 'colour' }] : []), { code: codes.colour, value: { h, s: Math.round(s * top), v: Math.max(codes.v2 ? 10 : 25, Math.round(v * top)) } }];
}
/** ⚡ Fast flash (1.161.0, Derek: "no way to make it go faster?"): ONE command that starts the bulb's own scene mode, jumping between the colour and near-dark.
 *  The bulb does the flashing itself, so it isn't held to one change a second. Only bulbs with scene_data_v2. Pure. */
export function tuyaQuick(codes, hex, speed = QUICK_SPEED) {
  if (!codes.scene) return null; const { h, s } = rgbHsv(hexRgb(hex)), sp = clamp(speed, 0, 100, QUICK_SPEED);
  const unit = v => ({ unit_change_mode: 'jump', unit_switch_duration: sp, unit_gradient_duration: sp, bright: 0, temperature: 0, h, s: Math.round(s * 1000), v });
  return [...(codes.sw ? [{ code: codes.sw, value: true }] : []), ...(codes.mode ? [{ code: codes.mode, value: 'scene' }] : []), { code: codes.scene, value: { scene_num: 1, scene_units: [unit(1000), unit(10)] } }];
}
/** the commands that put a Tuya device back the way `st` says it was (`scene` = its scene setting was changed too, put that back first). Pure. */
export function tuyaRestore(codes, st, scene) {
  const out = [];
  if (scene && codes.scene) { const v = parseVal(st[codes.scene]); if (v && typeof v === 'object') out.push({ code: codes.scene, value: v }); }
  if (codes.mode && st[codes.mode] != null) out.push({ code: codes.mode, value: st[codes.mode] });
  if (st[codes.mode] === 'colour' && codes.colour) { const v = parseVal(st[codes.colour]); if (v) out.push({ code: codes.colour, value: v }); }
  else { if (codes.bright && st[codes.bright] != null) out.push({ code: codes.bright, value: st[codes.bright] }); if (codes.temp && st[codes.temp] != null) out.push({ code: codes.temp, value: st[codes.temp] }); }
  if (codes.sw) out.push({ code: codes.sw, value: !!st[codes.sw] }); // (last: a bulb that was off goes off again)
  return out;
}

// ── the device list ────────────────────────────────────────────────────────────────────────────────
const dev = id => { const d = data().devices.find(x => x.id === id); if (!d) throw new Error('That plug / light isn\'t in the list any more. Press 🔎 Find my plugs and lights.'); return d; };
/** ask both services what they have; keeps your names, hidden ticks and "reacts to subs and raids" ticks */
export async function find({ fake } = {}) {
  const d = data(), errors = [], got = [];
  if (fake) got.push(...FAKE.map(x => ({ ...x })));
  else {
    if (d.govee.key) { try { got.push(...await goveeList()); d.govee.ok = true; d.govee.err = ''; } catch (e) { errors.push(e.message); d.govee.ok = false; d.govee.err = e.message; } }
    if (d.tuya.id && d.tuya.secret) { try { got.push(...await tuyaList()); d.tuya.ok = true; d.tuya.err = ''; } catch (e) { errors.push(e.message); d.tuya.ok = false; d.tuya.err = e.message; } }
    if (!d.govee.key && !(d.tuya.id && d.tuya.secret)) throw new Error('Connect Govee or Tuya first (the boxes above).');
  }
  const old = new Map(d.devices.map(x => [x.id, x])); let added = 0;
  for (const x of got) { const o = old.get(x.id);
    if (o) Object.assign(o, x, { label: o.label, hidden: o.hidden, fx: o.fx, kind: o.kind });
    else { added++; d.devices.push({ ...x, fx: x.src === 'tuya' && x.type === 'bulb', ...(fake ? { test: true } : {}) }); } } // (Derek: only the Energizer bulbs react; they're the Tuya bulbs. Change it with the tick)
  // a service that answered: what it no longer lists is gone (a service that failed keeps its devices)
  const ids = new Set(got.map(x => x.id)), okSrc = new Set([...(fake ? ['fake'] : []), ...(d.govee.ok && d.govee.key ? ['govee'] : []), ...(d.tuya.ok && d.tuya.id ? ['tuya'] : [])]);
  const before = d.devices.length; d.devices = d.devices.filter(x => ids.has(x.id) || !(fake ? x.test : okSrc.has(x.src) && !x.test)); const gone = before - d.devices.length;
  d.foundAt = Date.now(); save(); H.changed();
  return { added, gone, n: d.devices.length, errors };
}
export function clearTests() { const d = data(), n = d.devices.length; d.devices = d.devices.filter(x => !x.test); if (d.devices.length !== n) { save(); H.changed(); } return { removed: n - d.devices.length }; }
const FAKE = [
  { id: 't:test-bulb-1', src: 'tuya', dev: 'test-bulb-1', name: 'Pretend Energizer bulb 1', type: 'bulb', cat: 'dj', online: true },
  { id: 't:test-bulb-2', src: 'tuya', dev: 'test-bulb-2', name: 'Pretend Energizer bulb 2', type: 'bulb', cat: 'dj', online: true },
  { id: 't:test-plug-1', src: 'tuya', dev: 'test-plug-1', name: 'Pretend Gosund plug', type: 'plug', cat: 'cz', online: true },
  { id: 'g:test-govee-1', src: 'govee', dev: 'test-govee-1', sku: 'H6008', name: 'Pretend Govee bulb', type: 'bulb', color: true, dim: true },
  { id: 'g:test-govee-2', src: 'govee', dev: 'test-govee-2', sku: 'H5080', name: 'Pretend Govee plug', type: 'plug' }
];
const fakeSt = new Map(); // pretend devices: what they'd be showing (so tests can check "back the way it was")
const fakeOf = d => { if (!fakeSt.has(d.id)) fakeSt.set(d.id, d.type === 'bulb' ? { switch_led: false, work_mode: 'white', bright_value_v2: 600, temp_value_v2: 400, colour_data_v2: '{"h":0,"s":1000,"v":1000}', scene_data_v2: '{"scene_num":1,"scene_units":[]}' } : { switch_1: false }); return fakeSt.get(d.id); };
export const fakeLog = []; // what the pretend devices were told (tests read it)
const fakeDo = (d, commands) => { const st = fakeOf(d); for (const c of commands) st[c.code] = typeof c.value === 'object' ? JSON.stringify(c.value) : c.value; fakeLog.push({ id: d.id, at: Date.now(), commands }); if (fakeLog.length > 400) fakeLog.shift(); };

// ── doing things ───────────────────────────────────────────────────────────────────────────────────
const codesOf = async d => { if (d.test) return { st: { ...fakeOf(d) }, codes: tuyaCodes(fakeOf(d)) }; const st = await tuyaStatus(d); return { st, codes: tuyaCodes(st) }; };
/** is it on right now? (asks the service) */
export async function isOn(id) { const d = dev(id);
  if (d.test) { const st = fakeOf(d); return !!st[tuyaCodes(st).sw]; }
  if (d.src === 'govee') return (await goveeState(d)).on;
  const { st, codes } = await codesOf(d); if (!codes.sw) throw new Error(`${d.label || d.name} doesn't have an on / off switch the app knows.`); return !!st[codes.sw];
}
/** on / off / toggle */
export async function power(id, to = 'toggle', via = 'you') { const d = dev(id);
  let want = to; if (to === 'toggle' || to == null) want = !(await isOn(id)); want = !!want;
  if (d.test) fakeDo(d, [{ code: tuyaCodes(fakeOf(d)).sw, value: want }]);
  else if (d.src === 'govee') await goveeCap(d, 'on_off', 'powerSwitch', want ? 1 : 0);
  else { const { codes } = await codesOf(d); if (!codes.sw) throw new Error(`${d.label || d.name} doesn't have an on / off switch the app knows.`); await tuyaCmd(d, [{ code: codes.sw, value: want }]); }
  d.isOn = want; d.seenAt = Date.now(); save(); H.changed();
  if (via !== 'quiet') H.act(`${d.label || d.name} switched ${want ? 'on' : 'off'}${via === 'deck' ? ' (Stream Deck)' : ''}`, { icon: d.type === 'plug' ? '🔌' : '💡', kind: 'smart', test: !!d.test });
  return { id, on: want, name: d.label || d.name };
}
/** a light's colour (hex) and / or brightness (1–100) */
export async function look(id, { color, bright } = {}) { const d = dev(id); if (d.type !== 'bulb') throw new Error(`${d.label || d.name} isn't a light.`);
  const b = bright != null ? clamp(bright, 1, 100, 100) : null, hex = /^#[0-9a-f]{6}$/i.test(color || '') ? color : null;
  if (d.src === 'govee' && !d.test) { if (hex) { const [r, g, bl] = hexRgb(hex); await goveeCap(d, 'color_setting', 'colorRgb', (r << 16) | (g << 8) | bl); } if (b != null) await goveeCap(d, 'range', 'brightness', b); }
  else { const { codes } = await codesOf(d), cmds = [];
    if (hex) { const c = tuyaColour(codes, hex, b != null ? b / 100 : 1); if (!c) throw new Error(`${d.label || d.name} can't change colour.`); cmds.push(...c); }
    else if (b != null && codes.bright) cmds.push({ code: codes.bright, value: Math.round((codes.v2 ? 10 : 25) + (b / 100) * ((codes.v2 ? 1000 : 255) - (codes.v2 ? 10 : 25))) });
    if (!cmds.length) throw new Error('Nothing to change.');
    if (d.test) fakeDo(d, cmds); else await tuyaCmd(d, cmds); }
  if (hex) d.lastColor = hex; d.isOn = true; save(); H.changed();
  return { id, color: hex, bright: b };
}
/** your own name for it / hide it / does it react to subs and raids */
export function edit(id, b = {}) { const d = dev(id);
  if (typeof b.label === 'string') d.label = b.label.trim().slice(0, 40) || undefined;
  if (typeof b.hidden === 'boolean') d.hidden = b.hidden || undefined;
  if (typeof b.fx === 'boolean') d.fx = b.fx;
  if (b.kind === 'bulb' || b.kind === 'plug') { d.kind = b.kind; d.type = b.kind; }
  save(); H.changed(); return state(); }
export function setCfg(b = {}) { const d = data();
  if (typeof b.on === 'boolean') d.on = b.on;
  if (b.govee && typeof b.govee === 'object') { if (typeof b.govee.key === 'string') { const k = b.govee.key.trim(); if (k && (/\s/.test(k) || k.length < 16 || k.length > 120)) throw new Error('That doesn\'t look like a Govee key (it\'s one long line of letters, numbers and dashes).'); d.govee.key = k || undefined; d.govee.ok = undefined; d.govee.err = ''; if (!k) d.devices = d.devices.filter(x => x.src !== 'govee' || x.test); } }
  if (b.tuya && typeof b.tuya === 'object') { const t = b.tuya; tuyaTok = null;
    if (typeof t.id === 'string') { const v = t.id.trim(); if (v && !/^[a-z0-9]{12,40}$/i.test(v)) throw new Error('That doesn\'t look like a Tuya Access ID (about 20 letters and numbers, no spaces).'); d.tuya.id = v || undefined; }
    if (typeof t.secret === 'string') { const v = t.secret.trim(); if (v && !/^[a-z0-9]{16,64}$/i.test(v)) throw new Error('That doesn\'t look like a Tuya Access Secret (about 32 letters and numbers, no spaces).'); d.tuya.secret = v || undefined; }
    if (typeof t.region === 'string' && REGIONS[t.region]) d.tuya.region = t.region;
    if (t.off) { d.tuya.id = d.tuya.secret = undefined; d.devices = d.devices.filter(x => x.src !== 'tuya' || x.test); }
    d.tuya.ok = undefined; d.tuya.err = ''; }
  if (b.events && typeof b.events === 'object') for (const [k, o] of Object.entries(b.events)) { if (!EVENTS[k] || !o) continue; const e = (d.events[k] ||= {});
    if (typeof o.on === 'boolean') e.on = o.on; if (STYLES[o.style]) e.style = o.style; if (/^#[0-9a-f]{6}$/i.test(o.color || '')) e.color = o.color; if (o.secs != null) e.secs = clamp(o.secs, 3, 60, 8); if (o.speed != null) e.speed = clamp(o.speed, 0, 100, QUICK_SPEED); if (o.min != null && MINS[k] != null) e.min = clamp(o.min, 0, 1000000, MINS[k]); }
  save(); H.changed(); return state();
}

// ── light shows for subs and raids ─────────────────────────────────────────────────────────────────
/** the colours of a show, one per step. Pure. → [{hex, v}] */
export function showSteps(style, color, secs) {
  const n = Math.max(2, Math.round(secs * 1000 / STEP)), out = [];
  for (let i = 0; i < n; i++) {
    if (style === 'rainbow') out.push({ hex: rgbHex(hsvRgb((i * 53) % 360, 1, 1)), v: 1 });
    else if (style === 'solid') out.push({ hex: color, v: 1 });
    else out.push({ hex: color, v: i % 2 ? 0.12 : 1 });
  }
  return out;
}
let showing = null; const line = [];
export const showNow = () => showing && { kind: showing.kind, by: showing.by, test: showing.test, left: Math.max(0, showing.endsAt - Date.now()) };
/** start (or line up) the lights for an event. → {started | queued | skipped} */
export function show(kind, { by = '', test = false, bulbs, secs, style, color } = {}) {
  const ev = events()[kind] || { on: true, style: 'flash', color: '#ffffff', secs: 8 };
  const ids = bulbs || data().devices.filter(x => x.fx && x.type === 'bulb' && !x.hidden && (test ? true : !x.test)).map(x => x.id);
  if (!ids.length) return { skipped: 'no lights are ticked to react (Settings → Smart plug controls)' };
  const job = { kind, by, test, ids, secs: clamp(secs, 2, 60, ev.secs), style: STYLES[style] ? style : ev.style, color: color || ev.color, speed: ev.speed ?? QUICK_SPEED };
  if (showing) { if (line.length >= 3) return { skipped: 'the lights are busy (3 shows already waiting)' }; line.push(job); return { queued: line.length }; }
  run(job); return { started: true, bulbs: ids.length, secs: job.secs };
}
async function run(job) {
  showing = { ...job, endsAt: Date.now() + job.secs * 1000, stop: false }; const me = showing; H.changed();
  const name = (EVENTS[job.kind] || ['Lights'])[0];
  H.act(`${name} light show${job.by ? ' for ' + job.by : ''} (${job.ids.length} light${job.ids.length === 1 ? '' : 's'}, ${job.secs} s)`, { icon: '💡', kind: 'smart', test: !!job.test });
  const sets = []; // each bulb: how it was + its command names
  for (const id of job.ids) { try { const d = dev(id); if (d.src === 'govee' && !d.test) { sets.push({ d, govee: await goveeState(d) }); } else { const { st, codes } = await codesOf(d); if (codes.colour) sets.push({ d, st, codes }); } } catch (e) { me.err = e.message; } }
  try {
    if (!sets.length) throw new Error(me.err || 'none of the ticked lights can change colour');
    // ⚡ Fast flash: bulbs that have a scene mode get ONE command and flash by themselves; the rest (Govee, older bulbs) do the slow flash alongside
    let slow = sets;
    if (job.style === 'quick') { slow = [];
      await Promise.all(sets.map(async x => { const c = x.govee ? null : tuyaQuick(x.codes, job.color, job.speed); if (!c) return void slow.push(x);
        try { x.scene = true; if (x.d.test) fakeDo(x.d, c); else await tuyaCmd(x.d, c); } catch (e) { me.err = e.message; } }));
      me.quick = sets.length - slow.length; }
    for (const s of showSteps(job.style === 'quick' ? 'flash' : job.style, job.color, job.secs)) {
      if (me.stop) break; const t0 = Date.now();
      await Promise.all(slow.map(async x => { try {
        if (x.govee) { const [r, g, b] = hexRgb(s.hex); if (!x.lit) { await goveeCap(x.d, 'on_off', 'powerSwitch', 1); x.lit = true; } await goveeCap(x.d, 'color_setting', 'colorRgb', (Math.round(r * s.v) << 16) | (Math.round(g * s.v) << 8) | Math.round(b * s.v)); }
        else { const c = tuyaColour(x.codes, s.hex, s.v); if (x.d.test) fakeDo(x.d, c); else await tuyaCmd(x.d, c); }
      } catch (e) { me.err = e.message; } }));
      const wait = STEP - (Date.now() - t0); if (wait > 0) await sleep(job.fast ? 5 : wait);
    }
  } catch (e) { me.err = e.message; }
  // back the way they were (always, also after a stop or an error)
  await sleep(job.fast ? 5 : 400);
  for (const x of sets) { try {
    if (x.govee) { const g = x.govee; if (g.rgb != null && g.rgb > 0) await goveeCap(x.d, 'color_setting', 'colorRgb', g.rgb); else if (g.kelvin) await goveeCap(x.d, 'color_setting', 'colorTemperatureK', g.kelvin); if (g.bright != null && x.d.dim) await goveeCap(x.d, 'range', 'brightness', Math.max(1, g.bright)); if (!g.on) await goveeCap(x.d, 'on_off', 'powerSwitch', 0); }
    else { const c = tuyaRestore(x.codes, x.st, x.scene); if (x.d.test) fakeDo(x.d, c); else await tuyaCmd(x.d, c); }
  } catch (e) { me.err = e.message; } }
  if (me.err) { data().lastErr = { at: Date.now(), msg: me.err }; save(); if (!job.test) console.error('[smart lights] ' + me.err); }
  job.done?.(me.err || '');
  showing = null; H.changed();
  const nx = line.shift(); if (nx) run(nx);
}
export function stopShow(all) { if (all) line.length = 0; if (showing) showing.stop = true; return { ok: true }; }
/** which light show an alert sets off (null = none): subs, gift subs, raids, and bits / donations of at least their amount. Pure. */
export function eventFor(a, evs = events()) {
  if (!a) return null; const k = ['sub', 'gift', 'raid', 'bits', 'tip'].includes(a.kind) ? a.kind : null; if (!k) return null;
  const ev = evs[k]; if (!ev || !ev.on) return null;
  if (ev.min != null && !(Number(a.amount) >= ev.min)) return null;
  return k;
}
/** a Twitch / Kick alert or a donation came in */
export function onAlert(a) {
  if (!on()) return null; const k = eventFor(a); if (!k) return null;
  return show(k, { by: a.name || a.login || '' });
}

// ── what the Settings page shows (never the keys) ──────────────────────────────────────────────────
const tail = s => (s ? '…' + String(s).slice(-4) : '');
export function state() { const d = data();
  return { on: d.on !== false, feat: H.on(),
    govee: { has: !!d.govee.key, tail: tail(d.govee.key), ok: d.govee.ok ?? null, err: d.govee.err || '' },
    tuya: { has: !!(d.tuya.id && d.tuya.secret), idTail: tail(d.tuya.id), region: d.tuya.region || 'us', ok: d.tuya.ok ?? null, err: d.tuya.err || '' },
    regions: Object.entries(REGIONS).map(([k, [n]]) => [k, n]),
    devices: d.devices.map(x => ({ id: x.id, src: x.src, name: x.name, label: x.label || '', type: x.type, product: x.product || x.sku || '', online: x.online ?? null, hidden: !!x.hidden, fx: !!x.fx, isOn: x.isOn ?? null, lastColor: x.lastColor || '', test: !!x.test })),
    events: events(), eventNames: Object.fromEntries(Object.entries(EVENTS).map(([k, [n]]) => [k, n])), styles: STYLES,
    show: showNow(), waiting: line.length, foundAt: d.foundAt || 0, lastErr: d.lastErr && Date.now() - d.lastErr.at < 86400000 ? d.lastErr : null };
}

/** 🧪 the rules walked through on pretend lights (nothing real is touched, nothing is saved) */
export async function demo() {
  const rows = [], T = (label, got, ok) => rows.push({ label, got: String(got), ok: !!ok });
  T('Tuya signing matches a worked example', tuyaSign('id123', 'secret456', '', '1700000000000', 'n1', 'GET', '/v1.0/token?grant_type=1', '').length, tuyaSign('id123', 'secret456', '', '1700000000000', 'n1', 'GET', '/v1.0/token?grant_type=1', '') === crypto.createHmac('sha256', 'secret456').update('id123' + '1700000000000' + 'n1' + 'GET\n' + crypto.createHash('sha256').update('').digest('hex') + '\n\n/v1.0/token?grant_type=1').digest('hex').toUpperCase());
  const hsv = rgbHsv(hexRgb('#ff0000')); T('Red is hue 0, full colour', `h ${hsv.h} s ${hsv.s} v ${hsv.v}`, hsv.h === 0 && hsv.s === 1 && hsv.v === 1);
  const g = rgbHsv(hexRgb('#00ff00')); T('Green is hue 120', g.h, g.h === 120);
  T('Colour → and back', rgbHex(hsvRgb(210, 1, 1)), rgbHex(hsvRgb(210, 1, 1)) === '#0080ff');
  const newB = tuyaCodes({ switch_led: true, work_mode: 'white', bright_value_v2: 500, temp_value_v2: 300, colour_data_v2: '{}' }), oldB = tuyaCodes({ switch_led: true, work_mode: 'white', bright_value: 200, colour_data: '{}' }), plug = tuyaCodes({ switch_1: false, countdown_1: 0 });
  T('Newer bulb: colour goes 0–1000', JSON.stringify(tuyaColour(newB, '#ff0000', 1).at(-1).value), tuyaColour(newB, '#ff0000', 1).at(-1).value.s === 1000 && tuyaColour(newB, '#ff0000', 1).at(-1).code === 'colour_data_v2');
  T('Older bulb: colour goes 0–255', JSON.stringify(tuyaColour(oldB, '#ff0000', 1).at(-1).value), tuyaColour(oldB, '#ff0000', 1).at(-1).value.s === 255 && tuyaColour(oldB, '#ff0000', 1).at(-1).code === 'colour_data');
  T('A plug has a switch and no colour', `${plug.sw}, colour ${plug.colour}`, plug.sw === 'switch_1' && !plug.colour && tuyaColour(plug, '#ff0000') === null);
  const back = tuyaRestore(newB, { switch_led: false, work_mode: 'white', bright_value_v2: 500, temp_value_v2: 300, colour_data_v2: '{"h":1,"s":2,"v":3}' });
  T('A bulb that was off and white goes back to white, then off', back.map(c => c.code).join(' → '), back.at(-1).code === 'switch_led' && back.at(-1).value === false && back.some(c => c.code === 'bright_value_v2' && c.value === 500) && !back.some(c => c.code === 'colour_data_v2'));
  const backC = tuyaRestore(newB, { switch_led: true, work_mode: 'colour', bright_value_v2: 500, colour_data_v2: '{"h":200,"s":900,"v":800}' });
  T('A bulb that was blue goes back to its blue', JSON.stringify(backC.find(c => c.code === 'colour_data_v2')?.value), backC.find(c => c.code === 'colour_data_v2')?.value?.h === 200 && backC.at(-1).value === true);
  const fl = showSteps('flash', '#9146ff', 8), rb = showSteps('rainbow', '#000000', 12);
  T('Flash: bright, dim, bright… about one change a second', `${fl.length} steps`, fl.length === 7 && fl[0].v === 1 && fl[1].v < .2 && fl[2].v === 1);
  T('Rainbow: a different colour every step', `${new Set(rb.map(s => s.hex)).size} colours in ${rb.length} steps`, new Set(rb.map(s => s.hex)).size === rb.length);
  // a whole show on pretend bulbs: they change, then end up exactly as they were
  const D = data(), keep = D.devices; D.devices = FAKE.map(x => ({ ...x, test: true, fx: x.src === 'tuya' && x.type === 'bulb' })); fakeSt.clear(); fakeLog.length = 0;
  try {
    const b1 = D.devices[0]; fakeOf(b1).switch_led = true; fakeOf(b1).work_mode = 'colour'; fakeOf(b1).colour_data_v2 = '{"h":200,"s":900,"v":800}';
    const seen = () => JSON.stringify([0, 1].map(i => { const f = { ...fakeOf(D.devices[i]) }; if (f.work_mode !== 'colour') delete f.colour_data_v2; return f; })), was = seen(); // (what the bulb shows: a white bulb's stored colour doesn't count)
    const picked = D.devices.filter(x => x.fx && x.type === 'bulb').map(x => x.name);
    T('Only the Tuya (Energizer) bulbs react by default: not the Govee bulb, not plugs', picked.join(', '), picked.length === 2 && picked.every(n => /Energizer/.test(n)));
    const err = await new Promise(res => { const job = { kind: 'raid', by: 'Pretend_Raider', test: true, ids: D.devices.filter(x => x.fx).map(x => x.id), secs: 4, style: 'rainbow', color: '#ff3b30', fast: true, done: res }; if (showing) res('busy'); else run(job); });
    const told = fakeLog.filter(x => x.commands.some(c => c.code === 'colour_data_v2')).length;
    T('A pretend raid: both bulbs get colour changes', `${told} changes${err ? ' · ' + err : ''}`, told >= 8 && !err);
    T('…and afterwards both are exactly as they were (one blue and on, one white and off)', seen() === was ? 'same as before' : 'different', seen() === was);
    T('The pretend plug and the pretend Govee bulb were left alone', fakeLog.filter(x => /plug|govee/.test(x.id)).length + ' commands', !fakeLog.some(x => /plug|govee/.test(x.id)));
    const p = await power('t:test-plug-1', 'toggle', 'quiet'), p2 = await power('t:test-plug-1', 'toggle', 'quiet');
    T('Toggle a plug: on, then off', `${p.on ? 'on' : 'off'} → ${p2.on ? 'on' : 'off'}`, p.on === true && p2.on === false);
  } finally { D.devices = keep; fakeSt.clear(); save(); }
  // ⚡ fast flash
  const qB = tuyaCodes({ switch_led: true, work_mode: 'white', bright_value_v2: 500, colour_data_v2: '{}', scene_data_v2: '{}' }), q = tuyaQuick(qB, '#ff0000', 100), qv = q.at(-1).value;
  T('Fast flash = one command: scene mode, jumping between the colour and near-dark', q.map(c => c.code).join(' → '), q.length === 3 && q[1].value === 'scene' && qv.scene_units.length === 2 && qv.scene_units[0].unit_change_mode === 'jump' && qv.scene_units[0].v === 1000 && qv.scene_units[1].v === 10 && qv.scene_units[0].h === 0);
  T('A bulb without a scene mode can\'t fast flash (it does the slow flash instead)', String(tuyaQuick(newB, '#ff0000')), tuyaQuick(newB, '#ff0000') === null);
  const qBack = tuyaRestore(qB, { switch_led: false, work_mode: 'white', bright_value_v2: 500, scene_data_v2: '{"scene_num":3,"scene_units":[{"h":5}]}' }, true);
  T('After a fast flash the bulb\'s own saved scene is put back too', qBack.map(c => c.code).join(' → '), qBack[0].code === 'scene_data_v2' && qBack[0].value.scene_num === 3 && qBack.at(-1).code === 'switch_led');
  { const D2 = data(), keep2 = D2.devices; D2.devices = FAKE.map(x => ({ ...x, test: true, fx: x.src === 'tuya' && x.type === 'bulb' })); fakeSt.clear(); fakeLog.length = 0;
    try { delete fakeOf(D2.devices[1]).scene_data_v2; // (pretend bulb 2 is an older one)
      const was2 = JSON.stringify([fakeOf(D2.devices[0]), fakeOf(D2.devices[1])].map(f => { const g = { ...f }; delete g.colour_data_v2; return g; }));
      const err2 = await new Promise(res => { const job = { kind: 'sub', by: 'Pretend_Sub', test: true, ids: D2.devices.filter(x => x.fx).map(x => x.id), secs: 4, style: 'quick', color: '#9146ff', speed: 100, fast: true, done: res }; if (showing) res('busy'); else run(job); });
      const sc = fakeLog.filter(x => x.id === 't:test-bulb-1' && x.commands.some(c => c.code === 'scene_data_v2' && c.value.scene_units?.length === 2)).length, col1 = fakeLog.filter(x => x.id === 't:test-bulb-1' && x.commands.some(c => c.code === 'colour_data_v2')).length, col2 = fakeLog.filter(x => x.id === 't:test-bulb-2' && x.commands.some(c => c.code === 'colour_data_v2')).length;
      T('A pretend fast flash: the newer bulb gets 1 scene command and no colour steps, the older one flashes slowly', `scene ${sc} · colour steps ${col1} / ${col2}${err2 ? ' · ' + err2 : ''}`, sc === 1 && col1 === 0 && col2 >= 3 && !err2);
      const now2 = JSON.stringify([fakeOf(D2.devices[0]), fakeOf(D2.devices[1])].map(f => { const g = { ...f }; delete g.colour_data_v2; return g; }));
      T('…and both end up as they were (white, off, their own scene)', now2 === was2 ? 'same as before' : 'different', now2 === was2);
    } finally { D2.devices = keep2; fakeSt.clear(); save(); } }
  { const E = events(), F = (kind, amount) => eventFor({ kind, amount }, E);
    T('Bits: 300 or more set the lights off, 299 don\'t', `300 → ${F('bits', 300)} · 299 → ${F('bits', 299)} · 5000 → ${F('bits', 5000)}`, F('bits', 300) === 'bits' && F('bits', 299) === null && F('bits', 5000) === 'bits');
    T('Donations: $3 or more set the lights off, $2.99 doesn\'t', `3 → ${F('tip', 3)} · 2.99 → ${F('tip', 2.99)}`, F('tip', 3) === 'tip' && F('tip', 2.99) === null);
    T('Follows and channel point redeems leave the lights alone', `${F('follow')} · ${F('redeem')}`, F('follow') === null && F('redeem') === null);
    T('A switched-off event does nothing', String(eventFor({ kind: 'raid' }, { ...E, raid: { ...E.raid, on: false } })), eventFor({ kind: 'raid' }, { ...E, raid: { ...E.raid, on: false } }) === null); }
  const ev = events(); T('Subs, gift subs, raids, bits and donations each have a show with a speed (Fast flash unless you picked another style)', Object.entries(ev).map(([k, e]) => `${k}: ${e.style} ${e.secs}s speed ${e.speed}`).join(' · '), ev.raid.secs >= 3 && Object.values(ev).every(e => STYLES[e.style] && e.speed >= 0 && e.speed <= 100) && Object.keys(ev).every(k => D.events[k]?.style || ev[k].style === 'quick'));
  const st = JSON.stringify(state()); T('The Settings page never gets the keys', 'checked', !(D.govee.key && st.includes(D.govee.key)) && !(D.tuya.secret && st.includes(D.tuya.secret)));
  return { rows, ok: rows.every(r => r.ok) };
}

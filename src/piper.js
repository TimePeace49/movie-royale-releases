// 🗣️ More voices for "Read chat to me" (1.169.0, Derek: "is there a place I can find new ones besides the default for Windows" → "yes add that")
// Piper = a free, open-source voice maker that runs on your own PC (no internet once a voice is downloaded, nothing is sent anywhere).
// Nothing of it ships inside Movie Royal: when you press the button the app downloads
//   1. the Piper program itself from its official GitHub release (checked against a known fingerprint before it is ever run), and
//   2. the voice you pick from the Piper project's voice library on Hugging Face.
// Every voice has its own licence (the licence of the recordings it was made from). The app reads each voice's own "model card" and
// only lets you download the ones it can tell are free to use on a stream (public domain / CC0 / CC BY / CC BY-SA / MIT / Apache …),
// and that were not built on top of a voice that isn't. Anything else (research-only, non-commercial, or "can't tell") is shown greyed out with the reason.
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import crypto from 'crypto';
import { spawn, execFile } from 'child_process';
import { db, save, DATA } from './store.js';

const DIR = path.join(DATA, 'piper'), BIN_DIR = path.join(DIR, 'bin'), VOICE_DIR = path.join(DIR, 'voices');
const WIN = process.platform === 'win32';
// the Piper program: one fixed release, one fixed fingerprint (sha-256) per file. A download that doesn't match is thrown away.
const REL = '2023.11.14-2';
const BIN = WIN ? { file: 'piper_windows_amd64.zip', sha: 'f3c58906402b24f3a96d92145f58acba6d86c9b5db896d207f78dc80811efcea', mb: 22 }
  : process.platform === 'linux' && process.arch === 'x64' ? { file: 'piper_linux_x86_64.tar.gz', sha: 'a50cb45f355b7af1f6d758c1b360717877ba0a398cc8cbe6d2a7a3a26e225992', mb: 26 } : null;
const binUrl = () => (process.env.PIPER_BIN_URL || `https://github.com/rhasspy/piper/releases/download/${REL}`) + '/' + BIN.file;
const hfUrl = () => process.env.PIPER_HF_URL || 'https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0';
const exe = () => path.join(BIN_DIR, 'piper', WIN ? 'piper.exe' : 'piper');

let H = { broadcast() {}, pushState() {}, act() {} };
export function setHooks(h) { H = { ...H, ...h }; }

// the English voices in Piper's library (from its VOICES.md). q = the size offered here (medium where there is one). mb = rough download size.
const V = (id, name, where, q, many) => ({ id: `${id}-${q}`, key: id.split('-')[1], name, where, q, many: many || 0, dir: `en/${id.split('-')[0]}/${id.split('-')[1]}/${q}`, mb: q === 'high' ? 110 : 62 });
export const CATALOG = [
  V('en_US-ljspeech', 'LJ Speech', '🇺🇸 American', 'medium'), V('en_US-amy', 'Amy', '🇺🇸 American', 'medium'), V('en_US-kristin', 'Kristin', '🇺🇸 American', 'medium'), V('en_US-kathleen', 'Kathleen', '🇺🇸 American', 'low'),
  V('en_US-joe', 'Joe', '🇺🇸 American', 'medium'), V('en_US-john', 'John', '🇺🇸 American', 'medium'), V('en_US-bryce', 'Bryce', '🇺🇸 American', 'medium'), V('en_US-danny', 'Danny', '🇺🇸 American', 'low'),
  V('en_US-norman', 'Norman', '🇺🇸 American', 'medium'), V('en_US-kusal', 'Kusal', '🇺🇸 American', 'medium'), V('en_US-sam', 'Sam', '🇺🇸 American', 'medium'), V('en_US-reza_ibrahim', 'Reza Ibrahim', '🇺🇸 American', 'medium'),
  V('en_US-ryan', 'Ryan', '🇺🇸 American', 'medium'), V('en_US-lessac', 'Lessac', '🇺🇸 American', 'medium'), V('en_US-hfc_female', 'HFC (woman)', '🇺🇸 American', 'medium'), V('en_US-hfc_male', 'HFC (man)', '🇺🇸 American', 'medium'),
  V('en_US-libritts_r', 'LibriTTS-R', '🇺🇸 American · lots of speakers', 'medium', 904), V('en_US-libritts', 'LibriTTS', '🇺🇸 American · lots of speakers', 'high', 904), V('en_US-arctic', 'Arctic', '🇺🇸 mixed accents · several speakers', 'medium', 18), V('en_US-l2arctic', 'L2 Arctic', '🌍 non-native accents · several speakers', 'medium', 24),
  V('en_GB-alan', 'Alan', '🇬🇧 British', 'medium'), V('en_GB-alba', 'Alba', '🏴󠁧󠁢󠁳󠁣󠁴󠁿 Scottish', 'medium'), V('en_GB-cori', 'Cori', '🇬🇧 British', 'medium'), V('en_GB-aru', 'Aru', '🇬🇧 British · several speakers', 'medium', 12),
  V('en_GB-jenny_dioco', 'Jenny', '🇮🇪 Irish', 'medium'), V('en_GB-northern_english_male', 'Northern English (man)', '🇬🇧 Northern English', 'medium'), V('en_GB-southern_english_female', 'Southern English (woman)', '🇬🇧 Southern English', 'low'),
  V('en_GB-semaine', 'Semaine', '🇬🇧 British · several speakers', 'medium', 4), V('en_GB-vctk', 'VCTK', '🇬🇧 British Isles · lots of speakers', 'medium', 109)
];
const byId = id => CATALOG.find(v => v.id === id);
const data = () => { const d = db.piper ||= {}; d.cards ||= {}; return d; };

// ── licences ──────────────────────────────────────────────────────────────────────────────────────
// reads a voice's model card: { lic, url, train }
export function readCard(text) {
  const t = String(text || '').replace(/\r/g, ''), line = k => { const m = t.match(new RegExp('^\\s*[*-]?\\s*' + k + '\\s*:\\s*(.+)$', 'im')); return m ? m[1].trim() : ''; };
  const tm = t.match(/##\s*Training\s*\n+([\s\S]*?)(?:\n##|$)/i);
  return { lic: line('Licen[sc]e'), url: line('URL'), train: tm ? tm[1].replace(/\s+/g, ' ').trim() : '', seen: /model card|##\s*dataset/i.test(t) };
}
const BAD = /non[- ]?commercial|\bby[- ]nc\b|\bnc\b|research (purposes|only|use)|blizzard|no[- ]?deriv|\bby[- ]nd\b|\bnd\b|all rights reserved|academic|evaluation only|personal use/i;
const GOOD = /public[- ]?domain|\bcc[- ]?0\b|creativecommons\.org\/publicdomain|creativecommons\.org\/licenses\/by(-sa)?\/|\bcc[- ]by([- ]sa)?\b|\bmit\b|apache|\bbsd\b|unlicense|cdla-permissive/i;
// can this voice be used on a stream? pure: card = readCard(…), src = name → the verdict of the voice it was built on (or null when not known yet)
export function verdict(card, src = () => null) {
  if (!card || !card.seen) return { ok: false, why: 'its licence page could not be read' };
  const lic = `${card.lic}`.trim();
  if (!lic) return { ok: false, lic: '', why: 'its page does not say what licence its recordings have' };
  if (BAD.test(lic)) return { ok: false, lic, why: 'its recordings are for research / non-commercial use only' };
  if (!GOOD.test(lic)) return { ok: false, lic, why: 'the app can\'t tell from its licence whether it\'s free to use on a stream' };
  const tr = card.train || '';
  if (/fine-?tuned/i.test(tr)) { // built on top of another voice: that one has to be free to use too
    const names = CATALOG.map(v => v.key).filter(k => new RegExp('(^|[^a-z0-9])' + k.replace(/_/g, '[ _-]?') + '([^a-z0-9]|$)', 'i').test(tr)).sort((a, b) => b.length - a.length);
    if (!names.length) return { ok: false, lic, why: 'it was built on top of another voice and the app can\'t tell which' };
    const s = src(names[0]);
    if (!s) return { ok: false, lic, why: `it was built on top of the "${names[0]}" voice, whose licence could not be read`, base: names[0] };
    if (!s.ok) return { ok: false, lic, why: `it was built on top of the "${names[0]}" voice, and ${s.why}`, base: names[0] };
    return { ok: true, lic, base: names[0] };
  }
  return { ok: true, lic };
}
async function get(url, ms = 20000) { const c = new AbortController(), t = setTimeout(() => c.abort(), ms); try { const r = await fetch(url, { signal: c.signal, redirect: 'follow' }); if (!r.ok) throw new Error('answered ' + r.status); return r; } finally { clearTimeout(t); } }
async function cardOf(v, force) {
  const d = data(), have = d.cards[v.id];
  if (have && !force && Date.now() - have.at < 30 * 86400000 && have.seen) return have;
  let text = ''; try { text = await (await get(`${hfUrl()}/${v.dir}/MODEL_CARD`)).text(); } catch (e) { if (have) return have; return { seen: false, err: e.message, at: 0 }; }
  const c = { ...readCard(text.slice(0, 6000)), at: Date.now() }; d.cards[v.id] = c; save(); return c;
}
async function verdictOf(v, force, depth = 0) {
  const card = await cardOf(v, force), bases = {};
  const first = verdict(card, () => null);
  if (first.base && depth < 3) { const b = CATALOG.find(x => x.key === first.base && x.id !== v.id); if (b) bases[first.base] = await verdictOf(b, force, depth + 1); }
  return { ...verdict(card, k => bases[k] || null), url: card.url || '', err: card.err || '' };
}
let checking = null, checked = {};
// read every voice's licence page (once a month, or when asked)
export function check(force) {
  if (checking) return checking;
  checking = (async () => { const out = {}; for (const v of CATALOG) { try { out[v.id] = await verdictOf(v, force); } catch (e) { out[v.id] = { ok: false, why: 'its licence page could not be read', err: e.message }; } } checked = out; data().checkedAt = Date.now(); save(); return out; })().finally(() => { checking = null; H.pushState(); });
  return checking;
}

// ── the Piper program ─────────────────────────────────────────────────────────────────────────────
export const runtimeOk = () => { try { return !!BIN && fs.existsSync(exe()); } catch { return false; } };
let busy = null, prog = null;
const tell = p => { prog = p; H.broadcast({ type: 'piper', prog: p }, 'control'); };
async function download(url, file, label, want) {
  const r = await get(url, 15 * 60000), total = Number(r.headers.get('content-length')) || (want || 0) * 1048576, tmp = file + '.part';
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const out = fs.createWriteStream(tmp), hash = crypto.createHash('sha256'); let got = 0, last = 0;
  try {
    for await (const chunk of r.body) { hash.update(chunk); got += chunk.length; if (!out.write(chunk)) await new Promise(ok => out.once('drain', ok)); if (Date.now() - last > 400) { last = Date.now(); tell({ label, got, total }); } }
    await new Promise((ok, no) => out.end(e => e ? no(e) : ok()));
  } catch (e) { out.destroy(); try { fs.unlinkSync(tmp); } catch {} throw e; }
  return { tmp, sha: hash.digest('hex'), size: got };
}
function unzipTo(buf, dir) { // (a plain .zip reader: every file is written under dir, never outside it)
  let e = buf.length - 22; while (e >= 0 && buf.readUInt32LE(e) !== 0x06054b50) e--;
  if (e < 0) throw new Error('the download is not a zip file');
  const n = buf.readUInt16LE(e + 10); let p = buf.readUInt32LE(e + 16), made = 0;
  for (let i = 0; i < n && p + 46 <= buf.length; i++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) break;
    const method = buf.readUInt16LE(p + 10), csize = buf.readUInt32LE(p + 20), nl = buf.readUInt16LE(p + 28), el = buf.readUInt16LE(p + 30), cl = buf.readUInt16LE(p + 32), off = buf.readUInt32LE(p + 42);
    const name = buf.toString('utf8', p + 46, p + 46 + nl); p += 46 + nl + el + cl;
    const to = path.resolve(dir, name); if (!to.startsWith(path.resolve(dir) + path.sep)) continue;
    if (name.endsWith('/')) { fs.mkdirSync(to, { recursive: true }); continue; }
    if (buf.readUInt32LE(off) !== 0x04034b50) continue;
    const start = off + 30 + buf.readUInt16LE(off + 26) + buf.readUInt16LE(off + 28), raw = buf.subarray(start, start + csize);
    fs.mkdirSync(path.dirname(to), { recursive: true }); fs.writeFileSync(to, method === 0 ? raw : zlib.inflateRawSync(raw)); made++;
  }
  return made;
}
export function installRuntime() {
  if (runtimeOk()) return Promise.resolve({ ok: true, had: true });
  if (!BIN) return Promise.reject(new Error('These voices only work in the Windows app.'));
  if (busy) return Promise.reject(new Error('Something is already downloading. Give it a moment.'));
  busy = (async () => {
    const file = path.join(DIR, BIN.file), { tmp, sha } = await download(binUrl(), file, 'the voice maker (Piper)', BIN.mb);
    if (sha !== BIN.sha && !process.env.PIPER_BIN_ANY) { try { fs.unlinkSync(tmp); } catch {} throw new Error('The download did not match the fingerprint the app expects, so it was thrown away and nothing was run. Try again later.'); }
    tell({ label: 'unpacking', got: 1, total: 1 });
    fs.rmSync(BIN_DIR, { recursive: true, force: true }); fs.mkdirSync(BIN_DIR, { recursive: true });
    if (BIN.file.endsWith('.zip')) unzipTo(fs.readFileSync(tmp), BIN_DIR);
    else await new Promise((ok, no) => execFile('tar', ['-xzf', tmp, '-C', BIN_DIR], e => e ? no(e) : ok()));
    try { fs.unlinkSync(tmp); } catch {}
    if (!WIN) { try { fs.chmodSync(exe(), 0o755); } catch {} }
    if (!runtimeOk()) throw new Error('The voice maker was downloaded but could not be unpacked.');
    H.act('chat', 'Downloaded the voice maker (Piper) for 🔈 Read chat to me', { icon: '🗣️', kind: 'piper' });
    return { ok: true };
  })().finally(() => { busy = null; tell(null); H.pushState(); });
  return busy;
}

// ── voices ────────────────────────────────────────────────────────────────────────────────────────
const model = id => path.join(VOICE_DIR, id + '.onnx');
export const have = id => { try { return fs.existsSync(model(id)) && fs.existsSync(model(id) + '.json'); } catch { return false; } };
function speakers(id) { try { const j = JSON.parse(fs.readFileSync(model(id) + '.json', 'utf8')); return Math.max(1, Number(j.num_speakers) || 1); } catch { return 1; } }
export function install(id) {
  const v = byId(id); if (!v) return Promise.reject(new Error('No voice with that name.'));
  if (have(id)) return Promise.resolve({ ok: true, had: true });
  if (busy) return Promise.reject(new Error('Something is already downloading. Give it a moment.'));
  const run = (async () => {
    const ver = checked[id] || await verdictOf(v);
    if (!ver.ok) throw new Error(`${v.name} isn't offered: ${ver.why}.`);
    const base = `${hfUrl()}/${v.dir}/${v.id}.onnx`;
    const j = await download(base + '.json', model(id) + '.json', v.name, 0);
    try { JSON.parse(fs.readFileSync(j.tmp, 'utf8')); } catch { try { fs.unlinkSync(j.tmp); } catch {} throw new Error('The voice\'s settings file did not arrive in one piece. Try again.'); }
    const m = await download(base, model(id), v.name, v.mb);
    if (m.size < 1000000 && !process.env.PIPER_HF_URL) { try { fs.unlinkSync(m.tmp); fs.unlinkSync(j.tmp); } catch {} throw new Error('The voice did not arrive in one piece. Try again.'); }
    fs.renameSync(j.tmp, model(id) + '.json'); fs.renameSync(m.tmp, model(id));
    H.act('chat', `Downloaded the voice ${v.name} (${ver.lic || 'free to use'})`, { icon: '🗣️', kind: 'piper' });
    return { ok: true, id };
  })();
  busy = run.finally(() => { busy = null; tell(null); H.pushState(); });
  return busy;
}
export function remove(id) { for (const f of [model(id), model(id) + '.json']) { try { fs.unlinkSync(f); } catch {} } H.pushState(); return { ok: true }; }

// the voice name saved in the chat voice setting: "piper:<id>" or "piper:<id>#<speaker number>"
export const isPiper = v => /^piper:/.test(String(v || ''));
export function parse(v) { const m = String(v || '').match(/^piper:([^#]+)(?:#(\d+))?$/); return m ? { id: m[1], speaker: Number(m[2]) || 0 } : null; }
export const ready = v => { const p = parse(v); return !!p && runtimeOk() && have(p.id); };
// makes the wav for one line of text (a Buffer)
let n = 0;
export function wav(text, { voice, rate = 1 } = {}) {
  return new Promise((ok, no) => {
    const p = parse(voice); if (!p) return no(new Error('Not a downloaded voice'));
    if (!runtimeOk()) return no(new Error('The voice maker isn\'t downloaded yet'));
    if (!have(p.id)) return no(new Error('That voice isn\'t downloaded any more'));
    const file = path.join(DIR, `say-${process.pid}-${++n}.wav`), scale = Math.max(.5, Math.min(2, Math.pow(1.08, 1 - (Number(rate) || 0))));
    const args = ['--model', model(p.id), '--output_file', file, '--length_scale', scale.toFixed(3), '--quiet'];
    if (p.speaker > 0) args.push('--speaker', String(Math.min(p.speaker, speakers(p.id) - 1)));
    let ps, err = '', done = false;
    const fin = e => { if (done) return; done = true; clearTimeout(t); if (e) { try { fs.unlinkSync(file); } catch {} return no(e); } try { const b = fs.readFileSync(file); fs.unlink(file, () => {}); b.length > 44 ? ok(b) : no(new Error('The voice made no sound')); } catch (x) { no(x); } };
    const t = setTimeout(() => { try { ps.kill(); } catch {} fin(new Error('The voice took too long')); }, 25000);
    try { ps = spawn(exe(), args, { cwd: path.dirname(exe()), windowsHide: true, stdio: ['pipe', 'ignore', 'pipe'] }); } catch (e) { return fin(e); }
    ps.stderr.on('data', b => { err = (err + b).slice(-400); });
    ps.on('error', fin); ps.on('exit', code => fin(code === 0 ? null : new Error('The voice maker stopped' + (err ? ': ' + err.trim().split('\n').pop() : ''))));
    ps.stdin.on('error', () => {});
    ps.stdin.end(String(text || '').replace(/\s+/g, ' ').slice(0, 600) + '\n');
  });
}

export function state() {
  const d = data();
  return {
    can: !!BIN, runtime: runtimeOk(), runtimeMb: BIN?.mb || 0, busy: !!busy, prog, checking: !!checking, checkedAt: d.checkedAt || 0,
    voices: CATALOG.map(v => { const c = checked[v.id]; return { id: v.id, name: v.name, where: v.where, q: v.q, mb: v.mb, many: v.many, have: have(v.id), speakers: have(v.id) ? speakers(v.id) : v.many || 1, ok: c ? !!c.ok : null, lic: c?.lic || '', why: c?.why || '', url: c?.url || '' }; })
  };
}
// the voices that can be picked right now (for the voice menu)
export const mine = () => CATALOG.filter(v => have(v.id)).map(v => ({ id: v.id, name: v.name, where: v.where, speakers: speakers(v.id) }));

// 🧪 the licence rules on sample model cards (nothing downloaded)
export function demo() {
  const card = (lic, train, url = 'https://example.org/data') => `# Model card for x (medium)\n\n* Language: en_US\n* Speakers: 1\n* Quality: medium\n* Samplerate: 22,050Hz\n\n## Dataset\n\n* URL: ${url}\n* License: ${lic}\n\n## Training\n\n${train}\n`;
  const lessac = verdict(readCard(card('https://www.cstr.ed.ac.uk/projects/blizzard/2013/lessac_blizzard2013/license.html', 'Trained from scratch.')));
  const lj = verdict(readCard(card('Public Domain', 'Trained from scratch.')));
  const T = [
    ['Public domain, trained from scratch', verdict(readCard(card('Public Domain', 'Trained from scratch.'))), true],
    ['CC BY 4.0, trained from scratch', verdict(readCard(card('CC BY 4.0', 'Trained from scratch.'))), true],
    ['A Creative Commons BY-SA link', verdict(readCard(card('https://creativecommons.org/licenses/by-sa/4.0/', 'Trained from scratch.'))), true],
    ['CC0', verdict(readCard(card('CC0', 'Trained from scratch.'))), true],
    ['The Blizzard (research only) licence', lessac, false],
    ['CC BY-NC-SA 4.0 (non-commercial)', verdict(readCard(card('CC BY-NC-SA 4.0', 'Trained from scratch.'))), false],
    ['"Research purposes only"', verdict(readCard(card('Free for research purposes only', 'Trained from scratch.'))), false],
    ['A licence the app doesn\'t know', verdict(readCard(card('See the dataset page', 'Trained from scratch.'))), false],
    ['No licence line at all', verdict(readCard('# Model card for x\n\n## Dataset\n\n* URL: https://example.org\n\n## Training\n\nTrained from scratch.')), false],
    ['Public domain, but built on the research-only voice', verdict(readCard(card('Public Domain', 'Finetuned from U.S. English lessac voice (medium quality).')), k => k === 'lessac' ? lessac : null), false],
    ['Public domain, built on a public-domain voice', verdict(readCard(card('Public Domain', 'Finetuned from en_US ljspeech (medium).')), k => k === 'ljspeech' ? lj : null), true],
    ['Built on a voice the app can\'t name', verdict(readCard(card('CC BY 4.0', 'Finetuned from an internal checkpoint.'))), false],
    ['The page could not be read', verdict(readCard('')), false]
  ];
  const rows = T.map(([what, v, want]) => ({ what, got: v.ok ? 'offered' : 'not offered: ' + v.why, ok: v.ok === want }));
  const p = parse('piper:en_GB-vctk-medium#12');
  rows.push({ what: 'The saved voice name "piper:en_GB-vctk-medium#12"', got: p ? `${p.id}, speaker ${p.speaker}` : 'not read', ok: !!p && p.id === 'en_GB-vctk-medium' && p.speaker === 12 });
  return { ok: rows.every(r => r.ok), rows };
}

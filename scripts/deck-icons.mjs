// 🎛️ Makes the Stream Deck key pictures in public/deck/*.png (drawn at 256, saved at 144×144) from the buttons in src/deck.js.
// Run after adding / changing a Stream Deck button:  NODE_PATH=$(npm root -g) node scripts/deck-icons.mjs
// (needs Playwright; the pictures are kept in the repo, so the app never draws them itself)
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
process.env.MOVIE_ROYAL_DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'mr-deck-'));
const { BUTTONS, PAGES, NAV_LABEL, keyLook } = await import('../src/deck.js');
const { chromium } = createRequire(import.meta.url)('playwright');
const out = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'public', 'deck');
fs.mkdirSync(out, { recursive: true });
const jobs = [['home', keyLook('home')], ...Object.keys(PAGES).map(p => [`nav-${p}`, keyLook('>' + p)]), ...Object.keys(BUTTONS).map(k => [k, keyLook(k)])];
const only = process.argv.slice(2);
const html = `<!doctype html><meta charset="utf-8"><body style="margin:0;background:transparent"><canvas id="c" width="256" height="256"></canvas><script>
function draw(o) {
  const c = document.getElementById('c'), g = c.getContext('2d'), W = 256; g.clearRect(0, 0, W, W);
  // dark tile, a glow of the page's colour from the top, a thin coloured frame
  g.fillStyle = '#0d0b18'; g.fillRect(0, 0, W, W);
  let r = g.createRadialGradient(W / 2, 70, 10, W / 2, 90, 190); r.addColorStop(0, o.color + 'cc'); r.addColorStop(.55, o.color + '33'); r.addColorStop(1, '#0d0b1800'); g.fillStyle = r; g.fillRect(0, 0, W, W);
  const sh = g.createLinearGradient(0, 0, 0, W); sh.addColorStop(0, 'rgba(255,255,255,.10)'); sh.addColorStop(.5, 'rgba(255,255,255,0)'); g.fillStyle = sh; g.fillRect(0, 0, W, W / 2);
  g.lineWidth = 8; g.strokeStyle = o.color; g.globalAlpha = .85; rr(g, 6, 6, W - 12, W - 12, 34); g.stroke(); g.globalAlpha = 1;
  if (o.nav) { g.fillStyle = o.color; g.font = '900 30px "DejaVu Sans"'; g.textAlign = 'right'; g.textBaseline = 'top'; g.fillText('›', W - 22, 14); }
  // the picture
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.shadowColor = 'rgba(0,0,0,.6)'; g.shadowBlur = 14; g.shadowOffsetY = 6;
  g.font = (o.nav ? 104 : 118) + 'px "Noto Color Emoji", "DejaVu Sans"'; g.fillStyle = '#fff'; g.fillText(o.icon, W / 2, o.nav ? 98 : 102);
  g.shadowBlur = 0; g.shadowOffsetY = 0;
  // the words (shrink to fit, two lines when long)
  let words = o.label, size = 40, lines;
  const fit = s => { g.font = '900 ' + s + 'px "DejaVu Sans"'; return g.measureText(words).width <= W - 30; };
  while (size > 36 && !fit(size)) size -= 2; if (!words.includes(' ')) while (size > 26 && !fit(size)) size -= 2;
  if (fit(size)) lines = [words]; else { const w = words.split(' '); let best = null; for (let i = 1; i < w.length; i++) { const a = w.slice(0, i).join(' '), b = w.slice(i).join(' '); const m = Math.max(g.measureText(a).width, g.measureText(b).width); if (!best || m < best[0]) best = [m, a, b]; } lines = best ? [best[1], best[2]] : [words]; size = 36; g.font = '900 ' + size + 'px "DejaVu Sans"'; while (lines.some(l => g.measureText(l).width > W - 30) && size > 22) { size -= 2; g.font = '900 ' + size + 'px "DejaVu Sans"'; } }
  const y0 = lines.length > 1 ? 196 : 212;
  lines.forEach((l, i) => { const y = y0 + i * (size + 2); g.lineWidth = 7; g.strokeStyle = 'rgba(0,0,0,.85)'; g.lineJoin = 'round'; g.strokeText(l, W / 2, y); g.fillStyle = '#fff'; g.fillText(l, W / 2, y); });
}
function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
</script>`;
const br = await chromium.launch(), pg = await br.newPage({ viewport: { width: 256, height: 256 } });
await pg.setContent(html); await pg.waitForTimeout(300);
let n = 0;
for (const [file, look] of jobs) {
  if (only.length && !only.includes(file)) continue;
  await pg.evaluate(o => draw(o), look);
  const b64 = await pg.evaluate(() => { const o = document.createElement('canvas'); o.width = o.height = 144; const g = o.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(document.getElementById('c'), 0, 0, 144, 144); return o.toDataURL('image/png').split(',')[1]; }); // (144×144 = a 15-key Stream Deck's sharp size)
  fs.writeFileSync(path.join(out, file + '.png'), Buffer.from(b64, 'base64')); n++;
}
await br.close();
console.log(`made ${n} Stream Deck pictures in public/deck`);

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
const jobs = [['home', keyLook('home')], ['nav-scenes', keyLook('>scenes-0-0')], ['nav-scenesmore', keyLook('>scenes-0-1~more')], ['nav-otherset', { ...keyLook('>scenes-1-0~other:x'), label: 'Other scenes' }], ...Object.keys(PAGES).map(p => [`nav-${p}`, keyLook('>' + p)]), ...Object.keys(BUTTONS).map(k => [k, keyLook(k)])];
const only = process.argv.slice(2);
const html = fs.readFileSync(path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'public', 'deckicon.html'), 'utf8'); // (the same drawing Movie Royal uses for scene keys)
const br = await chromium.launch(), pg = await br.newPage({ viewport: { width: 256, height: 256 } });
await pg.setContent(html); await pg.waitForTimeout(300);
let n = 0;
for (const [file, look] of jobs) {
  if (only.length && !only.includes(file)) continue;
  await pg.evaluate(o => draw(o), look);
  const b64 = await pg.evaluate(() => png144().split(',')[1]); // (144×144 = a 15-key Stream Deck's sharp size)
  fs.writeFileSync(path.join(out, file + '.png'), Buffer.from(b64, 'base64')); n++;
}
await br.close();
console.log(`made ${n} Stream Deck pictures in public/deck`);

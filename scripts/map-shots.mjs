// 🖼️ Map screenshots for the 🌐 viewer website's 🏃 map picker (1.76.0): public/maps/<id>.jpg (480×270).
// Needs Movie Royal running (PORT, default 3801) and Python with Pillow for the resize. Usage: node scripts/map-shots.mjs [mapId…]
import { createRequire } from 'module';
const { chromium } = createRequire(import.meta.url)('playwright'); // (installed globally on the build machine)
import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';
const PORT = process.env.PORT || 3801, OUT = path.resolve('public/maps'), only = process.argv.slice(2);
fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch(), pg = await b.newPage({ viewport: { width: 1700, height: 1100 } });
await pg.goto(`http://localhost:${PORT}/control.html`); await pg.waitForTimeout(5000);
await pg.evaluate(() => { document.querySelectorAll('dialog[open]').forEach(d => d.close()); setView('test'); testGo('labCard'); });
await pg.evaluate(() => { const lp = labPost; window.labPost = m => lp(m.type === 'start' || m.type === 'cardScene' ? { ...m, listName: m.listName ? ' ' : m.listName, battleName: m.battleName ? ' ' : m.battleName, ...(m.chaos ? { chaos: { ...m.chaos, points: false, bits: false } } : {}) } : m); }); // (no "Test lab" title or chat power ticker in the pictures)
const maps = await pg.evaluate(() => [...(S.maps || []).map(m => ({ id: m.id, card: false })), ...(S.cards?.maps || []).filter(m => !m.ball).map(m => ({ id: m.id, card: true }))]);
await pg.evaluate(async () => { Object.assign(labSet, { type: 'ball', map: 'classic', n: 6, lobby: 0, sound: false }); labSave(true); labInit(); await labRun(); }); await pg.waitForTimeout(4000); // (warm-up: the lab screen's first battle can start before it's ready)
for (const m of maps) {
  if (only.length && !only.includes(m.id)) continue;
  await pg.evaluate(async m => {
    document.querySelectorAll('dialog[open]').forEach(d => d.close());
    Object.assign(labSet, m.card ? { type: 'card', cmap: m.id, cn: 10, cwho: 'chars', cgame: 60 } : { type: 'ball', map: m.id, n: 14, game: 60 }, { lobby: 0, sound: false });
    labSave(true); labInit(); await labRun();
  }, m);
  await pg.waitForTimeout(m.card ? 6000 : 8000);
  const tmp = path.join(OUT, m.id + '.png');
  await pg.locator('#labFrame').screenshot({ path: tmp });
  execFileSync('python3', ['-c', `from PIL import Image; im=Image.open(${JSON.stringify(tmp)}).convert('RGB'); im=im.resize((480, int(480*im.height/im.width))); w,h=im.size; t=max(0,(h-270)//2); im=im.crop((0,t,480,t+270)); im.save(${JSON.stringify(tmp.replace(/\.png$/, '.jpg'))}, quality=72, optimize=True)`]);
  fs.unlinkSync(tmp); console.log('✓', m.id);
}
await b.close();

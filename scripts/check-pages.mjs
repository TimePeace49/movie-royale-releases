// Fails if any page's script or any server file has a syntax mistake (so a broken build never gets published).
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
let bad = 0;
for (const f of fs.readdirSync('public').filter(f => f.endsWith('.html'))) {
  const s = fs.readFileSync(path.join('public', f), 'utf8');
  [...s.matchAll(/<script>([\s\S]*?)<\/script>/g)].forEach((m, i) => { try { new Function(m[1]); } catch (e) { bad++; console.error(`✗ public/${f} script ${i}: ${e.message}`); } });
}
for (const dir of ['src', 'public']) for (const f of fs.readdirSync(dir).filter(f => /\.(c|m)?js$/.test(f))) {
  try { execFileSync(process.execPath, ['--check', path.join(dir, f)], { stdio: 'pipe' }); } catch (e) { bad++; console.error(`✗ ${dir}/${f}: ${String(e.stderr || e.message).split('\n').slice(0, 5).join(' ')}`); }
}
if (bad) { console.error(`${bad} problem(s) found`); process.exit(1); }
console.log('✓ all pages and server files look fine');

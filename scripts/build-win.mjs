// Builds the Windows installer: dist/MovieRoyale-Setup-<version>.exe
//   npm run build:win
// 1) electron-builder packages the app (no installer)  2) app icon + version are stamped into the exe
// 3) NSIS turns it into an installer with an uninstaller (works on Windows, macOS and Linux build machines)
import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const VER = pkg.version;
const UNPACKED = path.join(ROOT, 'dist', 'win-unpacked');
const OUT = path.join(ROOT, 'dist', `MovieRoyale-Setup-${VER}.exe`);
const run = (cmd, args, opts = {}) => execFileSync(cmd, args, { stdio: 'inherit', cwd: ROOT, ...opts });

console.log(`\n▶ Packaging Movie Royale ${VER} for Windows…`);
fs.rmSync(UNPACKED, { recursive: true, force: true });
run(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['electron-builder', '--win', 'dir', '--x64'], { shell: process.platform === 'win32' });

console.log('\n▶ Stamping icon + version into MovieRoyale.exe…');
const ResEdit = await import('resedit');
const PELibrary = await import('pe-library');
const exePath = path.join(UNPACKED, 'MovieRoyale.exe');
const exe = PELibrary.NtExecutable.from(fs.readFileSync(exePath), { ignoreCert: true });
const res = PELibrary.NtExecutableResource.from(exe);
const ico = ResEdit.Data.IconFile.from(fs.readFileSync(path.join(ROOT, 'build', 'icon.ico')));
const groups = ResEdit.Resource.IconGroupEntry.fromEntries(res.entries);
const groupId = groups.length ? groups[0].id : 1, lang = groups.length ? groups[0].lang : 1033;
ResEdit.Resource.IconGroupEntry.replaceIconsForResource(res.entries, groupId, lang, ico.icons.map(i => i.data));
const vi = ResEdit.Resource.VersionInfo.fromEntries(res.entries)[0] || ResEdit.Resource.VersionInfo.createEmpty();
const [a, b, c] = VER.split('.').map(Number);
vi.setFileVersion(a, b, c, 0, 1033); vi.setProductVersion(a, b, c, 0, 1033);
vi.setStringValues({ lang: 1033, codepage: 1200 }, { ProductName: 'Movie Royale', FileDescription: 'Movie Royale', CompanyName: 'Movie Royale', FileVersion: VER, ProductVersion: VER, OriginalFilename: 'MovieRoyale.exe', InternalName: 'MovieRoyale', LegalCopyright: 'Movie Royale' });
vi.outputToResourceEntries(res.entries);
res.outputResource(exe);
fs.writeFileSync(exePath, Buffer.from(exe.generate()));

console.log('\n▶ Building the installer with NSIS…');
const cache = process.env.ELECTRON_BUILDER_CACHE || (process.platform === 'win32' ? path.join(process.env.LOCALAPPDATA, 'electron-builder', 'Cache') : path.join(os.homedir(), process.platform === 'darwin' ? 'Library/Caches/electron-builder' : '.cache/electron-builder'));
const findNsis = () => { try { return fs.readdirSync(path.join(cache, 'nsis')).filter(d => /^nsis-\d/.test(d)).map(d => path.join(cache, 'nsis', d)).sort().pop(); } catch { return null; } };
let nsisDir = findNsis();
if (!nsisDir) { // first build on this machine: fetch NSIS (same copy electron-builder uses)
  const url = 'https://github.com/electron-userland/electron-builder-binaries/releases/download/nsis-3.0.4.1/nsis-3.0.4.1.7z';
  const dest = path.join(cache, 'nsis', 'nsis-3.0.4.1'); fs.mkdirSync(dest, { recursive: true });
  const tmp = path.join(os.tmpdir(), 'nsis.7z');
  fs.writeFileSync(tmp, Buffer.from(await (await fetch(url)).arrayBuffer()));
  const { path7za } = await import('7zip-bin');
  run(path7za, ['x', '-y', `-o${dest}`, tmp]);
  nsisDir = dest;
}
const makensis = process.platform === 'win32' ? path.join(nsisDir, 'Bin', 'makensis.exe') : path.join(nsisDir, process.platform === 'darwin' ? 'mac' : 'linux', 'makensis');
fs.chmodSync(makensis, 0o755);
fs.rmSync(OUT, { force: true });
run(makensis, ['-V2', `-DVER=${VER}`, `-DSRC=${UNPACKED}`, `-DOUT=${OUT}`, path.join(ROOT, 'build', 'installer.nsi')], { env: { ...process.env, NSISDIR: nsisDir }, cwd: path.join(ROOT, 'build') });

const mb = (fs.statSync(OUT).size / 1048576).toFixed(0);
console.log(`\n✅ Done: ${path.relative(ROOT, OUT)} (${mb} MB)\n`);

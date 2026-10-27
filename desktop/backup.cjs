// 🛡️ Movie Royal Backup Bots: its own little app (same program as Movie Royal, started with --backup).
// Own window, own tray icon, own settings folder (%APPDATA%\Movie Royal Backup), starts with Windows hidden in the tray.
const { app, BrowserWindow, Tray, Menu, nativeImage, shell, safeStorage } = require('electron');
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');

app.setName('Movie Royal Backup Bots');
app.setPath('userData', path.join(app.getPath('appData'), 'Movie Royal Backup'));
if (process.platform === 'win32') app.setAppUserModelId('com.movieroyal.backup');
if (!app.requestSingleInstanceLock()) { app.quit(); return; }

const ICON = path.join(__dirname, 'icon.png');
const DATA = app.getPath('userData');
const PREFS = path.join(DATA, 'app-prefs.json'), RUNNING = path.join(DATA, 'running.json');
const startHidden = process.argv.includes('--hidden');
let win = null, tray = null, url = null, quitting = false;

const prefs = (() => { try { return JSON.parse(fs.readFileSync(PREFS, 'utf8')); } catch { return {}; } })();
const savePrefs = () => { try { fs.mkdirSync(DATA, { recursive: true }); fs.writeFileSync(PREFS, JSON.stringify(prefs)); } catch {} };
const loginArgs = () => app.isPackaged ? ['--backup', '--hidden'] : [app.getAppPath(), '--backup', '--hidden'];
function setStartup(on) {
  prefs.startup = !!on; savePrefs();
  try { app.setLoginItemSettings({ openAtLogin: !!on, path: process.execPath, args: loginArgs(), name: 'Movie Royal Backup Bots' }); } catch {}
}
if (prefs.startup === undefined) setStartup(true); // starts with Windows (hidden in the tray) unless you turn it off
else setStartup(prefs.startup); // (keeps the Windows entry pointing at the current install)

// "I'm running": if a Movie Royal update closes this app, Movie Royal opens it again afterwards
const beat = () => { try { fs.writeFileSync(RUNNING, JSON.stringify({ pid: process.pid, at: Date.now() })); } catch {} };
beat(); setInterval(beat, 60000);

function show() {
  if (!url) return;
  if (win && !win.isDestroyed()) { if (win.isMinimized()) win.restore(); win.show(); win.focus(); return; }
  win = new BrowserWindow({ width: 1100, height: 780, title: 'Movie Royal Backup Bots', icon: ICON, autoHideMenuBar: true, backgroundColor: '#120a24', webPreferences: { contextIsolation: true } });
  win.webContents.setWindowOpenHandler(({ url: u }) => { if (/^https?:\/\//.test(u)) shell.openExternal(u); return { action: 'deny' }; });
  win.on('close', e => { // closing the window keeps the backup running in the tray
    if (quitting) return; e.preventDefault(); win.hide();
    if (!prefs.toldTray && tray) { prefs.toldTray = true; savePrefs(); tray.displayBalloon?.({ title: 'The backup bots are still running', content: 'Right-click the shield icon by the clock to open or quit.' }); }
  });
  win.loadURL(url);
}
function makeTray() {
  tray = new Tray(nativeImage.createFromPath(ICON).resize({ width: 16, height: 16 }));
  tray.setToolTip('Movie Royal Backup Bots');
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Open Movie Royal Backup Bots', click: show },
    { label: 'Start with Windows', type: 'checkbox', checked: prefs.startup !== false, click: m => setStartup(m.checked) },
    { type: 'separator' },
    { label: 'Quit (the backup stops)', click: () => { quitting = true; app.quit(); } }
  ]));
  tray.on('click', show);
}
app.on('second-instance', show);
app.on('window-all-closed', e => { /* keep running in the tray */ });
app.on('before-quit', () => { quitting = true; try { fs.unlinkSync(RUNNING); } catch {} }); // a clean quit: Movie Royal won't reopen it

app.whenReady().then(async () => {
  const enc = t => safeStorage.isEncryptionAvailable() ? 'ss:' + safeStorage.encryptString(t).toString('base64') : 'b64:' + Buffer.from(t).toString('base64');
  const dec = t => t.startsWith('ss:') ? safeStorage.decryptString(Buffer.from(t.slice(3), 'base64')) : '';
  const { startBackup } = await import(pathToFileURL(path.join(__dirname, '..', 'src', 'backup.js')).href);
  const r = await startBackup({ dataDir: path.join(DATA, 'data'), version: app.getVersion(), hooks: { encrypt: enc, decrypt: dec, setStartup, getStartup: () => prefs.startup !== false, mrDb: path.join(app.getPath('appData'), 'Movie Royal', 'data', 'db.json') } }); // (Movie Royal's Twitch app keys on this PC: for Twitch's own "is it live?")
  url = r.url;
  makeTray();
  if (!startHidden) show();
});

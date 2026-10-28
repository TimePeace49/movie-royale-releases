// Movie Royal desktop app: runs the local server and shows it in its own window.
const { app, BrowserWindow, shell, dialog, Menu, Tray, nativeImage, net, clipboard } = require('electron');
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');

// 🛡️ "Movie Royal Backup Bots" is the same program started with --backup: its own window, tray icon and settings
// (its own installer copies the program as MovieRoyalBackup.exe, which always starts as the backup)
if (process.argv.includes('--backup') || /backup/i.test(require('path').basename(process.execPath))) { require('./backup.cjs'); return; }

app.setName('Movie Royal');
// your data lives in %APPDATA%\Movie Royal (older versions used a misspelled folder: move it over once)
{
  const oldDir = path.join(app.getPath('appData'), 'Movie Royale'), newDir = path.join(app.getPath('appData'), 'Movie Royal');
  if (fs.existsSync(path.join(oldDir, 'data')) && !fs.existsSync(path.join(newDir, 'data'))) {
    try { fs.renameSync(oldDir, newDir); } catch { try { fs.cpSync(oldDir, newDir, { recursive: true }); } catch {} }
  }
  app.setPath('userData', newDir);
}
if (process.platform === 'win32') app.setAppUserModelId('com.movieroyal.app');

if (!app.requestSingleInstanceLock()) { app.quit(); return; }
require('./contextmenu.cjs').attachContextMenu(); // 🖱️ normal right-click menu (copy, paste, …)

process.env.MOVIE_ROYAL_DATA = path.join(app.getPath('userData'), 'data');
process.env.MR_DESKTOP = '1';
process.env.MR_VERSION = app.getVersion();

const ICON = path.join(__dirname, 'icon.png');
const BASE = 'http://localhost:3737';
let win = null, readyUrl = null, tray = null, quitting = false;
const prefs = { runInBackground: false, startWithWindows: false };
const startHidden = process.argv.includes('--hidden');

function isOurs(url) { return url.startsWith(BASE + '/') || url === BASE; }

function hardenWindow(w) {
  // links to other sites (TMDB, Discord, Twitch sign-in…) open in your normal browser
  w.webContents.setWindowOpenHandler(({ url }) => {
    if (isOurs(url) && /\/game\.html/.test(url)) {
      return { action: 'allow', overrideBrowserWindowOptions: { width: 1280, height: 720, title: 'Movie Royal — Game', icon: ICON, autoHideMenuBar: true, backgroundColor: '#120a24', webPreferences: { backgroundThrottling: false } } };
    }
    if (/^https?:\/\//.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  w.webContents.on('will-navigate', (e, url) => {
    if (isOurs(url) && !/\/auth\/twitch/.test(url)) return;
    e.preventDefault();
    shell.openExternal(url); // Twitch sign-in happens in your browser, where you're probably already logged in
  });
  w.webContents.on('did-create-window', child => hardenWindow(child));
}

function createWindow() {
  win = new BrowserWindow({
    width: 1560, height: 980, minWidth: 1000, minHeight: 700,
    title: 'Movie Royal', icon: ICON, backgroundColor: '#120a24', autoHideMenuBar: true, show: false,
    webPreferences: { backgroundThrottling: false, spellcheck: true } // keeps the game smooth even when the window isn't focused (+ ✍️ spell check in text boxes)
  });
  hardenWindow(win);
  win.once('ready-to-show', () => { if (!startHidden) { win.maximize(); win.show(); } });
  win.on('close', e => {
    if (quitting || closeOk) return;
    if (!prefs.runInBackground) { e.preventDefault(); tryQuit(); return; } // closing the window = quitting: check the 24/7 bot first
    e.preventDefault(); win.hide(); // keep the Discord bot + Twitch running in the tray
    if (!prefs.toldAboutTray && tray) { prefs.toldAboutTray = true; tray.displayBalloon?.({ title: 'Movie Royal is still running', content: 'The Discord bot keeps working. Right-click the icon by the clock to quit.', iconType: 'info' }); }
  });
  win.on('closed', () => { win = null; if (!prefs.runInBackground || quitting) app.quit(); });
  win.loadURL(readyUrl);
}
function showWindow() { if (!win) return createWindow(); if (win.isMinimized()) win.restore(); win.show(); win.focus(); }
// 🛡️ an update closes every Movie Royal window, including the backup bots app: open it again if it was running
function reopenBackup() {
  try {
    const f = path.join(app.getPath('appData'), 'Movie Royal Backup', 'running.json');
    if (!fs.existsSync(f)) return; // it was quit on purpose (or never used)
    const r = JSON.parse(fs.readFileSync(f, 'utf8'));
    let alive = false; try { process.kill(r.pid, 0); alive = true; } catch {}
    if (alive || Date.now() - r.at > 15 * 60000) return;
    const { spawn } = require('child_process');
    const own = r.exe && fs.existsSync(r.exe) ? r.exe : null; // the Backup Bots' own install, if it has one
    spawn(own || process.execPath, own || app.isPackaged ? ['--backup', '--hidden'] : [app.getAppPath(), '--backup', '--hidden'], { detached: true, stdio: 'ignore' }).unref();
  } catch {}
}
function makeTray() {
  tray = new Tray(nativeImage.createFromPath(ICON).resize({ width: 16, height: 16 }));
  tray.setToolTip('Movie Royal');
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Open Movie Royal', click: showWindow },
    { type: 'separator' },
    { label: 'Quit Movie Royal', click: () => app.quit() }
  ]));
  tray.on('click', showWindow); tray.on('double-click', showWindow);
}
function applySettings(p) {
  Object.assign(prefs, p);
  try { app.setLoginItemSettings({ openAtLogin: !!prefs.startWithWindows, args: ['--hidden'] }); } catch {}
  muteCheck();
}
// 🔇 sounds only while you're in Movie Royal (Settings → App & background, on by default): clicking into another
// program mutes every Movie Royal window (the stream in OBS keeps its own sound); coming back turns it on again
function muteCheck() {
  setTimeout(() => { // (wait a moment: going from one Movie Royal window to another isn't leaving the app)
    const mute = prefs.muteUnfocused !== false && !BrowserWindow.getFocusedWindow();
    for (const w of BrowserWindow.getAllWindows()) { try { if (!w.isDestroyed() && w.webContents.isAudioMuted() !== mute) w.webContents.setAudioMuted(mute); } catch {} }
  }, 150);
}
app.on('browser-window-focus', muteCheck);
app.on('browser-window-blur', muteCheck);
app.on('browser-window-created', (e, w) => w.once('ready-to-show', muteCheck));

app.on('second-instance', () => showWindow());
// Quitting: if the Discord bot only runs inside this app (24/7 mode is off), ask first. The control panel shows the question (closeAsk).
let closeOk = false, asking = false;
async function tryQuit() {
  if (closeOk) { quitting = true; return app.quit(); }
  if (asking) return showWindow(); asking = true;
  let info = {};
  try { const c = new AbortController(); setTimeout(() => c.abort(), 9000); info = await (await fetch(BASE + '/api/close-check', { signal: c.signal })).json(); } catch {}
  if (info.ask) {
    try { showWindow(); const shown = await win.webContents.executeJavaScript(`typeof closeAsk === "function" && closeAsk(${JSON.stringify(info)})`); if (shown === true) { asking = false; return; } } catch {}
  }
  asking = false; closeOk = true; quitting = true; app.quit();
}
let rewardsPaused = false;
app.on('before-quit', e => { // pause every Movie Royal channel point reward on Twitch while the app is closed
  if (!closeOk) { e.preventDefault(); tryQuit(); return; }
  quitting = true;
  if (rewardsPaused) return;
  e.preventDefault(); rewardsPaused = true;
  const done = () => app.quit();
  const t = setTimeout(done, 5000);
  fetch(BASE + '/api/rewards/pause-all', { method: 'POST' }).catch(() => {}).finally(() => { clearTimeout(t); done(); });
});
app.on('window-all-closed', () => { if (!prefs.runInBackground || quitting) app.quit(); });

// Esc leaves fullscreen (the battle screen) in every window, like it does in a browser
app.on('browser-window-created', (_e, w) => {
  w.webContents.on('before-input-event', (ev, input) => {
    if (input.type !== 'keyDown' || input.key !== 'Escape') return;
    w.webContents.executeJavaScript('document.fullscreenElement && document.exitFullscreen().catch(() => {})').catch(() => {});
    if (w.isFullScreen()) setTimeout(() => !w.isDestroyed() && w.isFullScreen() && w.setFullScreen(false), 150);
  });
});
app.whenReady().then(async () => {
  try { const ses = require('electron').session.defaultSession; ses.setSpellCheckerEnabled(true); if (process.platform !== 'darwin') { const have = ses.availableSpellCheckerLanguages || []; const want = [app.getLocale(), 'en-US'].filter(l => have.includes(l)); if (want.length) ses.setSpellCheckerLanguages([...new Set(want)]); } } catch {} // ✍️ spell check
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { label: 'Movie Royal', submenu: [{ role: 'reload' }, { role: 'toggleDevTools' }, { type: 'separator' }, { role: 'togglefullscreen' }, { type: 'separator' }, { label: 'Quit', accelerator: 'CmdOrCtrl+Q', click: () => app.quit() }] }
  ]));
  let started = false;
  globalThis.__desktop = {
    // Windows + Electron: after a confirm() pop-up, text boxes can stop taking typing until the window is re-focused
    refocus: () => { const w = BrowserWindow.getFocusedWindow() || win; if (w && !w.isDestroyed()) { w.blur(); setTimeout(() => !w.isDestroyed() && w.focus(), 30); } },
    quit: () => { closeOk = true; quitting = true; app.quit(); }, // no questions (updates, or after you answered)
    copy: t => { clipboard.writeText(String(t)); return true; }, // copying from the page can fail after a pop-up: Windows' own clipboard always works
    // read a web page like a real browser does (some sites, like Letterboxd's film pages, turn away plain requests)
    getPage: async (url, { render = false, wait = 'body', timeout = 25000 } = {}) => {
      const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
      if (!render) { const r = await net.fetch(url, { headers: { 'User-Agent': UA, Accept: 'text/html,*/*', 'Accept-Language': 'en-US,en;q=0.9' } }); return { status: r.status, text: await r.text() }; }
      const w = new BrowserWindow({ show: false, width: 1280, height: 900, webPreferences: { backgroundThrottling: false } });
      try {
        await w.loadURL(url, { userAgent: UA }).catch(() => {});
        const end = Date.now() + timeout;
        while (Date.now() < end) { // wait until the page has drawn what we need (scrolling makes lazy pictures load)
          const n = await w.webContents.executeJavaScript(`window.scrollTo(0, document.body.scrollHeight); document.querySelectorAll(${JSON.stringify(wait)}).length`).catch(() => 0);
          if (n > 0) { await new Promise(r => setTimeout(r, 800)); break; }
          await new Promise(r => setTimeout(r, 700));
        }
        return { status: 200, text: await w.webContents.executeJavaScript('document.documentElement.outerHTML') };
      } finally { w.destroy(); }
    },
    applySettings,
    openPath: p => shell.openPath(p),
    fatal: msg => { dialog.showErrorBox('Movie Royal', msg); app.quit(); },
    ready: url => { if (started) return; started = true; readyUrl = url; makeTray(); createWindow(); reopenBackup(); }
  };
  try {
    await import(pathToFileURL(path.join(__dirname, '..', 'src', 'server.js')).href);
  } catch (e) {
    dialog.showErrorBox('Movie Royal could not start', String(e && e.stack || e));
    app.quit();
  }
});

// Movie Royal desktop app: runs the local server and shows it in its own window.
const { app, BrowserWindow, shell, dialog, Menu, Tray, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');

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
    webPreferences: { backgroundThrottling: false } // keeps the game smooth even when the window isn't focused
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
}

app.on('second-instance', () => showWindow());
// Quitting: if the Discord bot only runs inside this app (24/7 mode is off), ask first. The control panel shows the question (closeAsk).
let closeOk = false, asking = false;
async function tryQuit() {
  if (closeOk) { quitting = true; return app.quit(); }
  if (asking) return showWindow(); asking = true;
  let ask = false;
  try { const c = new AbortController(); setTimeout(() => c.abort(), 2500); ask = !!(await (await fetch(BASE + '/api/close-check', { signal: c.signal })).json()).ask; } catch {}
  if (ask) {
    try { showWindow(); const shown = await win.webContents.executeJavaScript('typeof closeAsk === "function" && closeAsk()'); if (shown === true) { asking = false; return; } } catch {}
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
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { label: 'Movie Royal', submenu: [{ role: 'reload' }, { role: 'toggleDevTools' }, { type: 'separator' }, { role: 'togglefullscreen' }, { type: 'separator' }, { label: 'Quit', accelerator: 'CmdOrCtrl+Q', click: () => app.quit() }] }
  ]));
  let started = false;
  globalThis.__desktop = {
    // Windows + Electron: after a confirm() pop-up, text boxes can stop taking typing until the window is re-focused
    refocus: () => { const w = BrowserWindow.getFocusedWindow() || win; if (w && !w.isDestroyed()) { w.blur(); setTimeout(() => !w.isDestroyed() && w.focus(), 30); } },
    quit: () => { closeOk = true; quitting = true; app.quit(); }, // no questions (updates, or after you answered)
    applySettings,
    openPath: p => shell.openPath(p),
    fatal: msg => { dialog.showErrorBox('Movie Royal', msg); app.quit(); },
    ready: url => { if (started) return; started = true; readyUrl = url; makeTray(); createWindow(); }
  };
  try {
    await import(pathToFileURL(path.join(__dirname, '..', 'src', 'server.js')).href);
  } catch (e) {
    dialog.showErrorBox('Movie Royal could not start', String(e && e.stack || e));
    app.quit();
  }
});

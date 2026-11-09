// Movie Royal desktop app: runs the local server and shows it in its own window.
const { app, BrowserWindow, shell, dialog, Menu, Tray, nativeImage, net, clipboard } = require('electron');
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');

// 🛡️ "Movie Royal Backup Bots" is the same program started with --backup: its own window, tray icon and settings
// (its own installer copies the program as MovieRoyalBackup.exe, which always starts as the backup)
if (process.argv.includes('--backup') || /backup/i.test(require('path').basename(process.execPath))) { require('./backup.cjs'); return; }

app.setName('Movie Royal');
// 🏷️ the name people see (window title, tray): the edition's own (src/editions.json). The app's real name above stays: it's the data folder.
const SHOWN = (() => { try { const p = require('../package.json'), all = require('../src/editions.json'); return String((all[String(process.env.MOVIE_ROYAL_EDITION || p.edition || 'public').toLowerCase()] || all.public || {}).app || 'Movie Royal'); } catch { return 'Movie Royal'; } })();
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
let win = null, readyUrl = null, tray = null, quitting = false, coWin = null, coLost = 0; // (coWin: 🤝 the hidden co-stream sender)
const prefs = { runInBackground: false, startWithWindows: false };
const startHidden = process.argv.includes('--hidden');

function isOurs(url) { return url.startsWith(BASE + '/') || url === BASE; }

function hardenWindow(w) {
  // links to other sites (TMDB, Discord, Twitch sign-in…) open in your normal browser
  w.webContents.setWindowOpenHandler(({ url }) => {
    if (isOurs(url) && /\/game\.html/.test(url)) {
      return { action: 'allow', overrideBrowserWindowOptions: { width: 1280, height: 720, title: SHOWN + ' — Game', icon: ICON, autoHideMenuBar: true, backgroundColor: '#120a24', webPreferences: { backgroundThrottling: false } } };
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

// 🖥️ window mode (Settings → Graphics): 'window' (normal), 'borderless' (fills the whole screen, no frame, like a game's
// "fullscreen windowed"), 'fullscreen'. Borderless needs a window made without a frame, so switching to / from it makes a new window.
let swapping = false;
function createWindow(mode = prefs.windowMode || 'window') {
  const frameless = mode !== 'window', old = win; // (1.59.0: Fullscreen is frameless too, see placeWindow)
  const w = new BrowserWindow({
    width: 1560, height: 980, minWidth: 1000, minHeight: 700, frame: !frameless,
    title: SHOWN, icon: ICON, backgroundColor: '#120a24', autoHideMenuBar: true, show: false,
    webPreferences: { backgroundThrottling: false, spellcheck: true } // keeps the game smooth even when the window isn't focused (+ ✍️ spell check in text boxes)
  });
  w.__mode = mode; win = w;
  hardenWindow(w);
  w.once('ready-to-show', () => {
    if (!startHidden || old) { placeWindow(w, mode); w.show(); }
    if (old && !old.isDestroyed()) { swapping = true; old.destroy(); swapping = false; }
  });
  w.on('close', e => {
    if (swapping || quitting || closeOk) return;
    if (!prefs.runInBackground) { e.preventDefault(); tryQuit(); return; } // closing the window = quitting: check the 24/7 bot first
    e.preventDefault(); w.hide(); // keep the Discord bot + Twitch running in the tray
    if (!prefs.toldAboutTray && tray) { prefs.toldAboutTray = true; tray.displayBalloon?.({ title: SHOWN + ' is still running', content: 'The Discord bot keeps working. Right-click the icon by the clock to quit.', iconType: 'info' }); }
  });
  w.on('closed', () => { if (swapping) return; if (win === w) win = null; if (!prefs.runInBackground || quitting) app.quit(); });
  w.loadURL(readyUrl);
}
function placeWindow(w, mode) {
  const { screen } = require('electron'), d = screen.getDisplayMatching(w.getBounds());
  if (w.isFullScreen()) w.setFullScreen(false);
  if (mode === 'borderless' || mode === 'fullscreen') { w.setBounds(d.bounds); return; } // the whole screen, like a game's borderless fullscreen. 1.59.0 (Derek): Fullscreen no longer puts Windows itself in fullscreen mode, which changed how the Start menu / taskbar looked
  w.maximize();
}
function setWindowMode(mode) {
  mode = ['window', 'borderless', 'fullscreen'].includes(mode) ? mode : 'window'; prefs.windowMode = mode;
  if (!win || win.isDestroyed()) return;
  if ((mode !== 'window') !== (win.__mode !== 'window')) return createWindow(mode); // the frame can only change on a new window
  win.__mode = mode; setTimeout(() => !win.isDestroyed() && placeWindow(win, mode), 50);
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
  tray.setToolTip(SHOWN);
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Open ' + SHOWN, click: showWindow },
    { type: 'separator' },
    { label: 'Quit ' + SHOWN, click: () => app.quit() }
  ]));
  tray.on('click', showWindow); tray.on('double-click', showWindow);
}
function applySettings(p) {
  const was = prefs.windowMode; Object.assign(prefs, p);
  if (p.windowMode && was && p.windowMode !== was) setWindowMode(p.windowMode);
  try { app.setLoginItemSettings({ openAtLogin: !!prefs.startWithWindows, args: ['--hidden'] }); } catch {}
  muteCheck();
}
// 🔇 sounds only while you're in Movie Royal (Settings → App & background, on by default): clicking into another
// program mutes every Movie Royal window (the stream in OBS keeps its own sound); coming back turns it on again
let keepSound = false;
function muteCheck() {
  setTimeout(() => { // (wait a moment: going from one Movie Royal window to another isn't leaving the app)
    const mute = prefs.muteUnfocused !== false && !keepSound && !BrowserWindow.getFocusedWindow(); // (🎮 game capture playing: its sound stays on)
    for (const w of BrowserWindow.getAllWindows()) { try { if (!w.isDestroyed() && !w.__celebrate && w.webContents.isAudioMuted() !== mute) w.webContents.setAudioMuted(mute); } catch {} }
  }, 150);
}
app.on('browser-window-focus', muteCheck);
app.on('browser-window-blur', muteCheck);
app.on('browser-window-created', (e, w) => w.once('ready-to-show', muteCheck));

// 🔈 (1.83.0, Derek: "tts for all chat… only so I hear it, not chat") Windows' own voices make a sound file for each chat
// message (one PowerShell kept open, so it's quick), and a hidden player window plays it on the speaker you picked, so it can go
// to your headphones only and never to the stream. Separate from the StreamElements tip / channel point voice.
let cvPs = null, cvVoices = null, cvBuf = '', cvWait = new Map(), cvN = 0, cvWin = null;
const CV_PS = `$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Speech
$s = New-Object System.Speech.Synthesis.SpeechSynthesizer
$v = @($s.GetInstalledVoices() | Where-Object { $_.Enabled } | ForEach-Object { $_.VoiceInfo.Name })
[Console]::Out.WriteLine('VOICES ' + (ConvertTo-Json -InputObject $v -Compress))
while ($true) {
  $l = [Console]::In.ReadLine(); if ($l -eq $null) { break }
  $p = $l.Split(' ')
  try {
    $t = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($p[1]))
    $f = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($p[2]))
    $vn = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($p[3]))
    if ($vn) { try { $s.SelectVoice($vn) } catch {} }
    $s.Rate = [int]$p[4]; $s.Volume = 100
    $s.SetOutputToWaveFile($f); $s.Speak($t); $s.SetOutputToNull()
    [Console]::Out.WriteLine('DONE ' + $p[0])
  } catch { try { $s.SetOutputToNull() } catch {}; [Console]::Out.WriteLine('FAIL ' + $p[0] + ' ' + $_.Exception.Message) }
}`;
function cvStart() {
  if (process.platform !== 'win32') return null;
  if (cvPs && !cvPs.killed && cvPs.exitCode == null) return cvPs;
  const { spawn } = require('child_process');
  cvVoices = null; cvBuf = '';
  cvPs = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', Buffer.from(CV_PS, 'utf16le').toString('base64')], { windowsHide: true });
  cvPs.stdout.on('data', d => {
    cvBuf += d.toString('utf8'); let i;
    while ((i = cvBuf.indexOf('\n')) >= 0) {
      const line = cvBuf.slice(0, i).trim(); cvBuf = cvBuf.slice(i + 1);
      if (line.startsWith('VOICES ')) { try { const v = JSON.parse(line.slice(7)); cvVoices = Array.isArray(v) ? v : v ? [v] : []; } catch { cvVoices = []; } continue; }
      const m = line.match(/^(DONE|FAIL) (\d+) ?(.*)$/); if (!m) continue;
      const w = cvWait.get(m[2]); if (!w) continue; cvWait.delete(m[2]); clearTimeout(w.t);
      if (m[1] === 'DONE') { try { const b = fs.readFileSync(w.file); fs.unlink(w.file, () => {}); w.ok(b); } catch (e) { w.no(e); } } else w.no(new Error(m[3] || 'Windows could not make the voice'));
    }
  });
  cvPs.stderr.on('data', () => {});
  cvPs.on('exit', () => { for (const w of cvWait.values()) { clearTimeout(w.t); w.no(new Error('The Windows voice stopped')); } cvWait.clear(); cvPs = null; });
  return cvPs;
}
const b64 = t => Buffer.from(String(t || ''), 'utf8').toString('base64');
const chatVoice = {
  ok: () => process.platform === 'win32',
  voices: async () => { if (!cvStart()) return []; for (let i = 0; i < 60 && cvVoices == null; i++) await new Promise(r => setTimeout(r, 100)); return cvVoices || []; },
  wav: (text, { voice = '', rate = 0 } = {}) => new Promise((ok, no) => {
    const ps = cvStart(); if (!ps) return no(new Error('Only on Windows'));
    const id = String(++cvN), file = path.join(app.getPath('temp'), `movie-royal-voice-${process.pid}-${id}.wav`);
    const t = setTimeout(() => { cvWait.delete(id); no(new Error('The Windows voice took too long')); }, 20000);
    cvWait.set(id, { ok, no, t, file });
    ps.stdin.write(`${id} ${b64(String(text).slice(0, 600))} ${b64(file)} ${b64(voice)} ${Math.max(-10, Math.min(10, Math.round(Number(rate) || 0)))}\n`);
  }),
  // the hidden player window (url null = close it). It's never muted by 🔇 "sounds only while you're in Movie Royal".
  player: url => {
    if (cvWin && !cvWin.isDestroyed()) { if (url && cvWin.__url === url) return { ok: true, same: true }; cvWin.destroy(); }
    cvWin = null; if (!url) { if (cvPs) { try { cvPs.kill(); } catch {} cvPs = null; } return { ok: true, stopped: true }; }
    const w = new BrowserWindow({ show: false, width: 400, height: 300, webPreferences: { backgroundThrottling: false, autoplayPolicy: 'no-user-gesture-required' } });
    w.__url = url; w.__celebrate = true; w.webContents.setAudioMuted(false); w.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    w.webContents.on('render-process-gone', () => { if (cvWin === w) cvWin = null; });
    w.loadURL(url).catch(() => {}); cvWin = w; return { ok: true };
  },
  playing: () => !!(cvWin && !cvWin.isDestroyed())
};
app.on('will-quit', () => { try { cvPs && cvPs.kill(); } catch {} });

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
    if (w.isFullScreen() && w.__mode !== 'fullscreen') setTimeout(() => !w.isDestroyed() && w.isFullScreen() && w.setFullScreen(false), 150); // (not when you picked Fullscreen as the window mode)
  });
});
app.whenReady().then(async () => {
  try { const ses = require('electron').session.defaultSession; ses.setSpellCheckerEnabled(true); if (process.platform !== 'darwin') { const have = ses.availableSpellCheckerLanguages || []; const want = [app.getLocale(), 'en-US'].filter(l => have.includes(l)); if (want.length) ses.setSpellCheckerLanguages([...new Set(want)]); } } catch {} // ✍️ spell check
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { label: SHOWN, submenu: [{ role: 'reload' }, { role: 'toggleDevTools' }, { type: 'separator' }, { role: 'togglefullscreen' }, { type: 'separator' }, { label: 'Quit', accelerator: 'CmdOrCtrl+Q', click: () => app.quit() }] }
  ]));
  let started = false;
  const hiddenPages = new Set(); // hidden windows reading shop pages (card pack search)
  // (those pages get their own session that skips ad / tracker requests: they only slow it down and a tracker that doesn't load showed up as an error, 1.65.3)
  const ADS = ['doubleclick.net', 'googlesyndication.com', 'googleadservices.com', 'adnxs.com', 'amazon-adsystem.com', 'krushmedia.com', 'scorecardresearch.com', 'adsrvr.org', 'rubiconproject.com', 'pubmatic.com', 'openx.net', 'criteo.com', 'criteo.net', 'taboola.com', 'outbrain.com', 'moatads.com', 'casalemedia.com', 'quantserve.com', 'adsafeprotected.com', 'bidswitch.net', 'teads.tv', 'sharethrough.com', '3lift.com', 'smartadserver.com', 'yieldmo.com', 'indexww.com', 'media.net', 'adform.net', 'ads-twitter.com', 'facebook.net', 'hotjar.com'];
  let pageSes = null;
  const pagesSession = () => {
    if (pageSes) return pageSes;
    pageSes = require('electron').session.fromPartition('mr-pages');
    try { pageSes.webRequest.onBeforeRequest({ urls: ['<all_urls>'] }, (d, cb) => { let h = ''; try { h = new URL(d.url).hostname; } catch {} cb({ cancel: ADS.some(a => h === a || h.endsWith('.' + a)) }); }); } catch {}
    return pageSes;
  };
  globalThis.__desktop = {
    // 🎮 (1.87.0) the Game capture tab is playing: don't mute Movie Royal when another window is clicked
    keepSound: on => { keepSound = !!on; muteCheck(); return keepSound; },
    // Windows + Electron: after a confirm() pop-up, text boxes can stop taking typing until the window is re-focused
    refocus: () => { const w = BrowserWindow.getFocusedWindow() || win; if (w && !w.isDestroyed()) { w.blur(); setTimeout(() => !w.isDestroyed() && w.focus(), 30); } },
    // ⏱️ (1.77.0) a timed marathon thing won: bring Movie Royal to the front so a click of your (wireless) mouse starts the timer
    front: () => { try { if (!win || win.isDestroyed()) return false; if (win.isMinimized()) win.restore(); win.setAlwaysOnTop(true); win.show(); win.moveTop(); win.focus(); win.flashFrame(true); setTimeout(() => { if (!win.isDestroyed()) { win.setAlwaysOnTop(false); win.flashFrame(false); } }, 2500); return true; } catch { return false; } },
    quit: () => { closeOk = true; quitting = true; app.quit(); }, // no questions (updates, or after you answered)
    copy: t => { clipboard.writeText(String(t)); return true; }, // copying from the page can fail after a pop-up: Windows' own clipboard always works
    // read a web page like a real browser does (some sites, like Letterboxd's film pages, turn away plain requests)
    // (every step has a time limit, so a page that never finishes loading can't make it hang; stopPages() ends them all right away)
    getPage: async (url, { render = false, wait = 'body', timeout = 25000, more = null } = {}) => {
      const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
      const limit = (p, ms) => Promise.race([p, new Promise((_, no) => setTimeout(() => no(new Error('took too long')), ms))]);
      if (!render) { const r = await net.fetch(url, { headers: { 'User-Agent': UA, Accept: 'text/html,*/*', 'Accept-Language': 'en-US,en;q=0.9' }, signal: AbortSignal.timeout(15000) }); return { status: r.status, text: await limit(r.text(), 15000) }; }
      const w = new BrowserWindow({ show: false, width: 1280, height: 900, webPreferences: { backgroundThrottling: false, session: pagesSession() } });
      hiddenPages.add(w);
      w.webContents.setAudioMuted(true); w.webContents.setWindowOpenHandler(() => ({ action: 'deny' })); // (no sound, and no pop-up windows from the page)
      try {
        const end = Date.now() + timeout;
        await limit(w.loadURL(url, { userAgent: UA }), timeout).catch(() => {}); // (some shop pages never say they're done loading)
        while (Date.now() < end) { // wait until the page has drawn what we need (scrolling makes lazy pictures load)
          if (w.isDestroyed()) throw new Error('stopped');
          const n = await limit(w.webContents.executeJavaScript(`window.scrollTo(0, document.body.scrollHeight); document.querySelectorAll(${JSON.stringify(wait)}).length`), 3000).catch(() => 0);
          if (n > 0) { await new Promise(r => setTimeout(r, 800)); break; }
          await new Promise(r => setTimeout(r, 700));
        }
        if (more && !w.isDestroyed()) { // keep pressing a "50 more" / "Load more" button until there are enough (or it stops growing)
          let last = -1, same = 0;
          while (Date.now() < end && !w.isDestroyed()) {
            const n = await limit(w.webContents.executeJavaScript(`(() => { const n = document.querySelectorAll(${JSON.stringify(more.count)}).length; if (n >= ${Number(more.want) || 500}) return -n; const b = [...document.querySelectorAll(${JSON.stringify(more.click)})].find(x => x.offsetParent) || [...document.querySelectorAll('button')].find(x => x.offsetParent && /^\\s*(\\d+\\s+more|load more|show more)\\s*$/i.test(x.textContent)); if (!b) return -n; b.scrollIntoView(); b.click(); return n; })()`), 4000).catch(() => -1);
            if (n < 0) break;
            if (n === last) { if (++same >= 4) break; } else same = 0; last = n;
            await new Promise(r => setTimeout(r, 1500));
          }
        }
        if (w.isDestroyed()) throw new Error('stopped');
        return { status: 200, text: await limit(w.webContents.executeJavaScript('document.documentElement.outerHTML'), 5000) };
      } finally { hiddenPages.delete(w); if (!w.isDestroyed()) w.destroy(); }
    },
    // 🖼️ draw one of our own pages in a hidden window and hand back what it made (window.__png): the /character picture
    renderPicture: async (url, timeout = 15000) => {
      const w = new BrowserWindow({ show: false, width: 520, height: 600, webPreferences: { backgroundThrottling: false } });
      try {
        await Promise.race([w.loadURL(url), new Promise(r => setTimeout(r, timeout))]).catch(() => {});
        const end = Date.now() + timeout;
        while (Date.now() < end && !w.isDestroyed()) { const png = await w.webContents.executeJavaScript('window.__png || null').catch(() => null); if (png) return png; await new Promise(r => setTimeout(r, 150)); }
        return null;
      } finally { if (!w.isDestroyed()) w.destroy(); }
    },
    stopPages: () => { for (const w of hiddenPages) if (!w.isDestroyed()) w.destroy(); hiddenPages.clear(); }, // ⏹ Stop on the card pack search

    applySettings,
    windowAction: a => { const w = win; if (!w || w.isDestroyed()) return; if (a === 'min') w.minimize(); else if (a === 'close') w.close(); else if (['window', 'borderless', 'fullscreen'].includes(a)) setWindowMode(a); },
    openPath: p => shell.openPath(p),
    pickFile: async (title, exts) => { // 🎬 (1.86.0) pick a file on this PC (the dialog opens over Movie Royal)
      const r = await dialog.showOpenDialog(win && !win.isDestroyed() ? win : undefined, { title: title || 'Pick a file', properties: ['openFile'], defaultPath: app.getPath('videos'), filters: exts ? [{ name: 'Videos', extensions: exts }, { name: 'All files', extensions: ['*'] }] : undefined });
      return r.canceled ? null : (r.filePaths || [])[0] || null;
    },
    // 🎉 Viewer's choice: confetti + a big pop-up over whatever you're using, on the screen your mouse is on (clicks go through it; it doesn't take your keyboard)
    celebrate: url => {
      const { screen } = require('electron'), d = screen.getDisplayNearestPoint(screen.getCursorScreenPoint()), b = d.bounds;
      const w = new BrowserWindow({ x: b.x, y: b.y, width: b.width, height: b.height, transparent: true, frame: false, resizable: false, movable: false, focusable: false, skipTaskbar: true, alwaysOnTop: true, hasShadow: false, show: false, backgroundColor: '#00000000', webPreferences: { autoplayPolicy: 'no-user-gesture-required', backgroundThrottling: false } });
      w.__celebrate = true; w.setAlwaysOnTop(true, 'screen-saver'); w.setIgnoreMouseEvents(true); w.setVisibleOnAllWorkspaces?.(true);
      w.loadURL(url).then(() => { if (!w.isDestroyed()) { w.showInactive(); w.webContents.setAudioMuted(false); } }).catch(() => {});
      setTimeout(() => { if (!w.isDestroyed()) w.destroy(); }, 11500);
    },
    // 😱 (1.82.3) a jump scare over whatever you're using: see-through, clicks go through, doesn't take your keyboard.
    // where 'mouse' = the screen your mouse is on, 'all' = every screen. Sound only if the page is given a volume.
    scarePop: (url, where = 'mouse', ms = 12500) => {
      const { screen } = require('electron');
      const shows = where === 'all' ? screen.getAllDisplays() : [screen.getDisplayNearestPoint(screen.getCursorScreenPoint())];
      shows.forEach((d, i) => {
        const b = d.bounds;
        const w = new BrowserWindow({ x: b.x, y: b.y, width: b.width, height: b.height, transparent: true, frame: false, resizable: false, movable: false, focusable: false, skipTaskbar: true, alwaysOnTop: true, hasShadow: false, show: false, backgroundColor: '#00000000', webPreferences: { autoplayPolicy: 'no-user-gesture-required', backgroundThrottling: false } });
        w.__celebrate = true; w.setAlwaysOnTop(true, 'screen-saver'); w.setIgnoreMouseEvents(true); w.setVisibleOnAllWorkspaces?.(true);
        w.webContents.setAudioMuted(i > 0); // the sound plays once, not once per screen
        w.loadURL(url).then(() => { if (!w.isDestroyed()) w.showInactive(); }).catch(() => {});
        setTimeout(() => { if (!w.isDestroyed()) w.destroy(); }, ms);
      });
      return { ok: true, screens: shows.length };
    },
    // 🤝 co-stream (1.71.0): a hidden window sends OBS's Virtual Camera to your co-streamer with VDO.Ninja (camera only, no sound).
    // Its own session lets just that page use the camera, without asking. url null = stop.
    coSender: url => {
      if (coWin && !coWin.isDestroyed()) { if (url && coWin.__url === url) return { ok: true, same: true }; coWin.destroy(); }
      coWin = null; if (!url) return { ok: true, stopped: true };
      const ses = require('electron').session.fromPartition('mr-costream');
      if (!ses.__coOk) { ses.__coOk = true; ses.setPermissionRequestHandler((wc, perm, cb) => cb(['media', 'mediaKeySystem', 'fullscreen'].includes(perm))); ses.setPermissionCheckHandler((wc, perm) => ['media', 'mediaKeySystem'].includes(perm)); }
      const w = new BrowserWindow({ show: false, width: 1280, height: 720, webPreferences: { backgroundThrottling: false, session: ses, autoplayPolicy: 'no-user-gesture-required' } });
      w.__url = url; w.__celebrate = true; w.webContents.setAudioMuted(true); w.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
      w.webContents.on('render-process-gone', () => { if (coWin === w) { coWin = null; coLost = Date.now(); } });
      w.loadURL(url).catch(() => {}); coWin = w; return { ok: true };
    },
    chatVoice,
    coSending: () => !!(coWin && !coWin.isDestroyed()),
    coSenderLost: () => coLost,
    // 👀 what your partner sees (your own picture, back from VDO.Ninja) or their picture, in a normal window
    coPreview: (url, title) => { const w = new BrowserWindow({ width: 960, height: 560, title: title || 'Co-stream picture', icon: ICON, autoHideMenuBar: true, backgroundColor: '#000000', webPreferences: { backgroundThrottling: false, autoplayPolicy: 'no-user-gesture-required' } }); w.webContents.setAudioMuted(true); w.loadURL(url).catch(() => {}); return { ok: true }; },
    fatal: msg => { dialog.showErrorBox(SHOWN, msg); app.quit(); },
    ready: url => { if (started) return; started = true; readyUrl = url; makeTray(); createWindow(); reopenBackup(); }
  };
  try {
    await import(pathToFileURL(path.join(__dirname, '..', 'src', 'server.js')).href);
  } catch (e) {
    dialog.showErrorBox(SHOWN + ' could not start', String(e && e.stack || e));
    app.quit();
  }
});

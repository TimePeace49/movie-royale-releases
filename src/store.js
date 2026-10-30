// Simple JSON-file storage. Everything lives in ./data/db.json
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// desktop app keeps data in %APPDATA%\Movie Royal\data so updates/uninstalls never touch it
export const DATA = process.env.MOVIE_ROYAL_DATA || path.join(ROOT, 'data');
export const UPLOADS = path.join(DATA, 'uploads');
export const IMGCACHE = path.join(DATA, 'imgcache');
for (const d of [DATA, UPLOADS, IMGCACHE, path.join(DATA, 'letterboxd'), path.join(DATA, 'sounds')]) fs.mkdirSync(d, { recursive: true });

const FILE = path.join(DATA, 'db.json');

export const EVENTS = {
  comet:      { name: 'Comet',          icon: '☄️', desc: 'A comet streaks across and smacks anything in its path' },
  collapse:   { name: 'Edge Collapse',  icon: '🪨', desc: 'A random chunk of the cliff edge breaks off early' },
  earthquake: { name: 'Earthquake',     icon: '🌋', desc: 'Everything shakes and gets jostled' },
  meteors:    { name: 'Meteor Shower',  icon: '🌠', desc: 'Meteors rain on random spots' },
  wind:       { name: 'Gale',           icon: '🌬️', desc: 'A strong wind pushes everyone one way' },
  ice:        { name: 'Ice Age',        icon: '🧊', desc: 'The ground turns slippery for a few seconds' },
  tornado:    { name: 'Tornado',        icon: '🌪️', desc: 'A twister wanders across flinging pieces' },
  shockwave:  { name: 'Shockwave',      icon: '💥', desc: 'A blast from the middle pushes everyone outward' },
  lightning:  { name: 'Lightning',      icon: '⚡', desc: 'Lightning blasts random tiles away' },
  boulder:    { name: 'Boulder',        icon: '🪨', desc: 'A giant boulder rolls straight across' },
  swap:       { name: 'Teleport Swap',  icon: '🌀', desc: 'Everyone swaps places with someone random' },
  lowgrav:    { name: 'Low Gravity',    icon: '🪐', desc: 'Everyone gets bouncy and floaty' },
  mappower:   { name: 'Map Power',      icon: '🗺️', desc: "This map's special power (lava eruption, laser grid, black hole…)" },
  random:     { name: 'Mystery',        icon: '🎲', desc: 'A random event' }
};

const defaults = () => ({
  settings: {
    streamerName: '', // blank = use the Twitch name you sign in with
    discordToken: '', discordClientId: '', discordGuildId: '',
    tmdbKey: '',
    letterboxdUser: '',
    twitchClientId: '', twitchClientSecret: '', twitchChannel: '',
    maxPerUser: 3,
    maxFighters: 1000, f8Laps: 5, cliffSize: 130, announceWinner: true, wheelOfNamesKey: '', autoCamera: true, replayOn: true,
    lobbySeconds: 5,
    gameSeconds: 30,
    soundOn: true, sfxVolume: 70, musicVolume: 35,
    spotName: 'Kirb', spotTwitch: '', spotMax: 3, weekStart: 0, autoSpots: true,
    runInBackground: false, startWithWindows: false, chatGate: true, autoFullscreen: true,
    banCurrentYear: true, banRules: { english: true, religious: true, documentary: true }, banAsk: 'Kirb', featAsk: {}, charsDefault: false, toastSecs: 8, choiceScenes: null, idOn: true, idCommand: '!id', charGenders: true, looksOn: true, lookPost: true, spotLooks: [], discordFolder: true, discordCategory: 'Movie Royal', charChannel: true, charChannelName: 'character-creation', appStyle: 'auto', holTheme: {}, holFx: true, luckOn: true, luckPerBattle: 1, muteUnfocused: true, raidOn: true, raidTitle: '🚀 Pick who we raid!', raidCost: 1500, chatTag: '🤖 Movies Royal Bot:', pickLock: 'battle', trackLinkedOnly: true, useChatBot: true, discordServerLink: '', announceMins: 60, announceBattle: '', announceChat: '', announceGiveaway: '', announceWheel: '', gfxRes: '1080', gfxFps: 0, gfxQuality: 'high', gfxShowFps: false, gfxAppSaver: true, lockSwapsWhenLive: true, closePicksWhenLive: true, announcePicks: true, callsOn: true, callCommand: '!call', callLuck: 1, spotLuck: false, helpCommand: '!moviesroyal', seriesAuto: false, omdbKey: '',
    twitchMoviesCommand: '!mymovies', twitchCooldown: 30, discordChannelName: 'movies-royal',
    pointsOn: true, bitsOn: true, cloud: {}, map: 'random', voteSeconds: 120, colorsOn: true, colorMode: 'free', colorCommand: '!color', colorReward: 'Royal: Ball color',
    ideasDoc: 'https://docs.google.com/document/d/1bcgwJP3jX2ixkwlaRS19mUdGvotVIDAppZ6AkFOTRck/edit?usp=sharing', // 💡 linked in the pinned Discord message
    betaUpdates: false, lastSeenVersion: '', // also install pre-releases (test builds)
    seJwt: '', slToken: '', // 💵 StreamElements / Streamlabs donations
    obsUrl: 'ws://127.0.0.1:4455', obsPassword: '', obsMic: '', obsCam: '', // 🎥 OBS (the wheel's Doomsday)
    botRemind: true, // (unused since 1.60.1: the "Update your 24/7 Discord bot" step always shows until the bot is updated, Derek)
    updateRepo: '', setupSeen: false, rewardsCreated: false, streamSetup: false,
    fairOdds: true,
    discordDebug: true,      // 🐞 a mods-only #movie-royal-debug channel where the bot posts Discord problems
    claimApprove: true,      // the winner types in chat: the claim timer stops and YOU press ✅ Accept or ⏭️ Pass
    pinWinner: true,         // a claimed movie gets pinned in Twitch chat (title, year, who picked it)
    backupRelay: true, // 🛡️ the hidden #movie-royal-sync channel for a backup bot server
    keybinds: {}, // ⌨️ key binds you changed (id → key, '' = off); the rest use the defaults in control.html
    acceptCommand: '!accept', passCommand: '!pass', // ✋ the movie winner answers in chat: watch it now / not tonight
    sitOutCommand: '!sitout', backCommand: '!imback', // chat: take your movies out of tonight's battles / put them back
    joinCommand: '!join',
    // channel point reward title -> event
    rewards: {
      'Royal: Comet': 'comet',
      'Royal: Edge Collapse': 'collapse',
      'Royal: Earthquake': 'earthquake',
      'Royal: Meteor Shower': 'meteors',
      'Royal: Gale': 'wind',
      'Royal: Ice Age': 'ice',
      'Royal: Tornado': 'tornado',
      'Royal: Mystery': 'random'
    },
    // 🎉 chat battle power-ups: viewers power up their own ball (only while a chat battle with power-ups on is playing)
    powerRewards: { 'Royal: 🛡️ Shield my ball': 'shield', 'Royal: 💪 Mega ball': 'mega', 'Royal: ⚡ Turbo ball': 'turbo', 'Royal: 👻 Ghost ball': 'ghost', 'Royal: 🦔 Spiky ball': 'spiky', 'Royal: 🧲 Magnet ball': 'magnet' },
    powerCosts: { shield: 1000, mega: 1500, turbo: 750, ghost: 1000, spiky: 1000, magnet: 1200 },
    raceRewards: { 'Race: 💨 Boost': 'boost', 'Race: 🛡️ Shield': 'shield', 'Race: 🛢️ Drop oil': 'oil', 'Race: 🚀 Rocket': 'rocket', 'Race: ☢️ Nuke': 'nuke' }, // 🏁 race power-ups (chat battles on race maps, 1.60.0)
    raceCosts: { boost: 500, shield: 750, oil: 750, rocket: 1500, nuke: 20000 },
    // bits: cheer at least this many bits -> event (highest tier reached wins)
    bits: { '100': 'random', '300': 'comet', '500': 'tornado', '1000': 'meteors', '2500': 'shockwave' }
  },
  lists: [{ id: 'movies', name: 'Discord Movies', type: 'movies', entries: [] }],
  activeListId: 'movies',
  history: [],
  links: {},          // discordUserId -> twitch login
  pendingEffects: [], // events redeemed while no game is running
  twitchToken: null
});

function load() {
  const d = defaults();
  try {
    const saved = JSON.parse(fs.readFileSync(FILE, 'utf8'));
    return { ...d, ...saved, settings: { ...d.settings, ...(saved.settings || {}) } };
  } catch { return d; }
}

export const db = load();
if (!db.lists.find(l => l.id === 'movies')) db.lists.unshift(defaults().lists[0]);
if (!db.settings.v6) { db.settings.v6 = true; if (db.settings.streamerName === 'Derek') db.settings.streamerName = ''; } // use your Twitch name
if (!db.settings.v4) { db.settings.v4 = true; db.settings.weekStart = 0; } // weeks start on Sunday
if (!db.settings.v3) { db.settings.v3 = db.settings.v2 = true; db.settings.lobbySeconds = 0; } // Start now begins the fight right away
// v9: new defaults: luck on, picks close while live, closing the window quits (no tray)
// v12: best-of rounds wait for you; chat map votes last 2 minutes
if (!db.settings.v12) { db.settings.v12 = true; db.settings.seriesAuto = false; if (!db.settings.voteSeconds || db.settings.voteSeconds === 30) db.settings.voteSeconds = 120; }
if (!db.settings.v9) { db.settings.v9 = true; db.settings.luckOn = true; db.settings.closePicksWhenLive = true; db.settings.runInBackground = false; }
if (!db.settings.v8) { db.settings.v8 = true; if (db.settings.twitchMoviesCommand === '!movies') db.settings.twitchMoviesCommand = '!mymovies'; }
if (!db.settings.v7) { db.settings.v7 = true; if (Number(db.settings.maxFighters) === 40) db.settings.maxFighters = 1000; if (Number(db.settings.luckPerBattle) === 0.01) db.settings.luckPerBattle = 1; } // new defaults: 1000 pieces, 1% luck
if (!db.settings.v16) { db.settings.v16 = true; db.settings.raidOn = true; } // 🚀 the raid reward is on by default (Settings → Rewards & prices)
if (!db.settings.v17) { db.settings.v17 = true; const pr = db.settings.powerRewards ||= {}, have = new Set(Object.values(pr)); for (const [t, k] of [['Royal: 👻 Ghost ball', 'ghost'], ['Royal: 🦔 Spiky ball', 'spiky'], ['Royal: 🧲 Magnet ball', 'magnet']]) if (!have.has(k)) pr[t] = k; db.settings.powerCosts = { ghost: 1000, spiky: 1000, magnet: 1200, ...(db.settings.powerCosts || {}) }; } // 🎉 3 more chat battle power-ups (1.40.0)
if (!db.settings.v15) { db.settings.v15 = true; db.linkDates ||= {}; for (const id of Object.keys(db.links || {})) if (!db.linkDates[id]) db.linkDates[id] = -Date.now(); } // 🔗 links made before Movie Royal kept dates: "before" this day
if (!db.settings.v14) { db.settings.v14 = true; db.settings.pickLock = 'battle'; } // new default: adding + swapping movies only lock while a movie battle is going (Start → winner)
if (!db.settings.v13) { db.settings.v13 = true; delete db.settings.botSkipV; db.settings.botRemind = true; } // the 24/7 bot update pop-up is back on (it has its own on/off box now)
if (!db.settings.v18) { db.settings.v18 = true; const fa = db.settings.featAsk || {}; if (fa.ids === 'yes' || fa.looks === 'yes') db.settings.charsDefault = true; } // 🧍 said yes to men/women characters or character creation: battles use characters by default
if (!db.settings.v5) { db.settings.v5 = true; if (!db.settings.lobbySeconds) db.settings.lobbySeconds = 5; } // 5-second countdown when you press Start

let timer, tries = 0;
// 💾 Save db.json. Windows sometimes locks the file for a moment (antivirus, the backup bot reading it, the old app still
// closing after an update: Derek got "EPERM: operation not permitted, rename" on open) — never crash, just try again.
export function save() {
  clearTimeout(timer);
  timer = setTimeout(writeNow, tries ? Math.min(5000, 250 * tries) : 150);
}
function writeNow() {
  const text = JSON.stringify(db, null, 1);
  try {
    fs.writeFileSync(FILE + '.tmp', text);
    try { fs.renameSync(FILE + '.tmp', FILE); }
    catch (e) { if (tries < 8) throw e; fs.writeFileSync(FILE, text); try { fs.unlinkSync(FILE + '.tmp'); } catch {} } // still locked after a while: write it straight in
    tries = 0;
  } catch (e) {
    tries++;
    if (tries === 3) console.log('[store] the save file is busy (' + e.code + '), trying again…');
    if (tries > 30) { console.error('[store] couldn\'t save your data: ' + e.message); tries = 0; return; }
    save();
  }
}
/** Save right away (on quit). */
export function saveNow() { clearTimeout(timer); writeNow(); }

export const uid = () => crypto.randomBytes(6).toString('hex');
export const getList = id => db.lists.find(l => l.id === id);

// 🔢 a ready-made number battle (1 to 500) called Worse Movies. Made once: if you delete it, it stays deleted.
if (!db.settings.madeWorseMovies) {
  db.settings.madeWorseMovies = true;
  if (!db.lists.some(l => /^(🔢 )?worse movies$/i.test(l.name))) {
    const l = { id: uid(), name: '🔢 Worse Movies', type: 'text', entries: [], joinOpen: false, numbers: { from: 1, to: 500 } };
    for (let n = 1; n <= 500; n++) l.entries.push({ id: uid(), label: String(n), sub: '', weight: 1, status: 'active', addedAt: Date.now() });
    db.lists.push(l); save();
  }
}
export const norm = s => String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '');

/** Your name everywhere in the app: the name in Settings if you typed one, otherwise your Twitch name. */
export const streamerName = () => (db.settings.streamerName || '').trim() || db.owner?.name || 'the streamer';

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
    maxFighters: 1000, cliffSize: 130, announceWinner: true, wheelOfNamesKey: '', autoCamera: true, replayOn: true,
    lobbySeconds: 5,
    gameSeconds: 30,
    soundOn: true, sfxVolume: 70, musicVolume: 35,
    spotName: 'Kirb', spotTwitch: '', spotMax: 3, weekStart: 0, autoSpots: true,
    runInBackground: false, startWithWindows: false, chatGate: true, autoFullscreen: true,
    banCurrentYear: true, luckOn: true, luckPerBattle: 1, lockSwapsWhenLive: true, closePicksWhenLive: true, announcePicks: true, callsOn: true, callCommand: '!call', callLuck: 1, spotLuck: false, helpCommand: '!moviesroyal', seriesAuto: false, omdbKey: '',
    twitchMoviesCommand: '!mymovies', twitchCooldown: 30, discordChannelName: 'movies-royal',
    pointsOn: true, bitsOn: true, cloud: {}, map: 'random', voteSeconds: 120, colorsOn: true, colorMode: 'free', colorCommand: '!color', colorReward: 'Royal: Ball color',
    ideasDoc: 'https://docs.google.com/document/d/1bcgwJP3jX2ixkwlaRS19mUdGvotVIDAppZ6AkFOTRck/edit?usp=sharing', // 💡 linked in the pinned Discord message
    betaUpdates: false, lastSeenVersion: '', // also install pre-releases (test builds)
    seJwt: '', slToken: '', // 💵 StreamElements / Streamlabs donations
    obsUrl: 'ws://127.0.0.1:4455', obsPassword: '', obsMic: '', obsCam: '', // 🎥 OBS (the wheel's Doomsday)
    botUpdatePrompted: false, // the 24/7 bot update pop-up: off for good once you've updated (or said don't remind me)
    updateRepo: '', setupSeen: false, rewardsCreated: false, streamSetup: false,
    fairOdds: true,
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
if (!db.settings.botUpdatePrompted && db.settings.cloud?.at > Date.parse('2026-10-26T06:00:00Z')) db.settings.botUpdatePrompted = true; // already updated the bot with 1.13.4 / 1.13.5
if (!db.settings.v6) { db.settings.v6 = true; if (db.settings.streamerName === 'Derek') db.settings.streamerName = ''; } // use your Twitch name
if (!db.settings.v4) { db.settings.v4 = true; db.settings.weekStart = 0; } // weeks start on Sunday
if (!db.settings.v3) { db.settings.v3 = db.settings.v2 = true; db.settings.lobbySeconds = 0; } // Start now begins the fight right away
// v9: new defaults: luck on, picks close while live, closing the window quits (no tray)
// v12: best-of rounds wait for you; chat map votes last 2 minutes
if (!db.settings.v12) { db.settings.v12 = true; db.settings.seriesAuto = false; if (!db.settings.voteSeconds || db.settings.voteSeconds === 30) db.settings.voteSeconds = 120; }
if (!db.settings.v9) { db.settings.v9 = true; db.settings.luckOn = true; db.settings.closePicksWhenLive = true; db.settings.runInBackground = false; }
if (!db.settings.v8) { db.settings.v8 = true; if (db.settings.twitchMoviesCommand === '!movies') db.settings.twitchMoviesCommand = '!mymovies'; }
if (!db.settings.v7) { db.settings.v7 = true; if (Number(db.settings.maxFighters) === 40) db.settings.maxFighters = 1000; if (Number(db.settings.luckPerBattle) === 0.01) db.settings.luckPerBattle = 1; } // new defaults: 1000 pieces, 1% luck
if (!db.settings.v5) { db.settings.v5 = true; if (!db.settings.lobbySeconds) db.settings.lobbySeconds = 5; } // 5-second countdown when you press Start

let timer;
export function save() {
  clearTimeout(timer);
  timer = setTimeout(() => {
    fs.writeFileSync(FILE + '.tmp', JSON.stringify(db, null, 1));
    fs.renameSync(FILE + '.tmp', FILE);
  }, 150);
}

export const uid = () => crypto.randomBytes(6).toString('hex');
export const getList = id => db.lists.find(l => l.id === id);
export const norm = s => String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '');

/** Your name everywhere in the app: the name in Settings if you typed one, otherwise your Twitch name. */
export const streamerName = () => (db.settings.streamerName || '').trim() || db.owner?.name || 'the streamer';

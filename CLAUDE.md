# Movie Royal — notes for Claude

Derek's Windows app for his Twitch stream (he's the streamer, not a programmer — talk plainly, no jargon).
It runs a battle-royal "movie wheel" game, a full Wheel of Names replacement, Discord movie picks, Letterboxd checks,
Twitch chat / channel points / bits / subs, and donations (StreamElements / Streamlabs).

## How it's built
- **Electron app** (`desktop/main.cjs`) that starts an **Express + WebSocket server** (`src/server.js`, port 3737) and opens the control panel.
- **Data** lives in `%APPDATA%\Movie Royal\data\db.json` (env `MOVIE_ROYAL_DATA` overrides). Never in the repo. `src/store.js` = defaults + migrations.
- **Pages** (`public/`): `control.html` (control panel, all tabs), `game.html` (the stream overlay: battle canvas + wheel scene, 1920×1080, added in OBS), `setup.html` (setup guide), `help.html`.
- `public/wheel.js` draws the wheel (shared by control + overlay). `public/sfx.js` makes every sound with Web Audio (custom sound files override them; per-map and per-wheel scopes like `wheel-<id>`).
- Server modules: `wheel.js` (wheel engine: spots, spins, void, grows, saved spins, pop-ups, stats), `stats.js` (battle results + lifetime stats), `rename.js` (Twitch name changes), `donations.js`, `twitch.js` (OAuth, EventSub, IRC chat incl. sub USERNOTICEs, helix), `discord.js`, `movies.js`, `maps.js` (map list), `cloud.js` (24/7 Cloudflare bot).
- Battle maps live in the `MAPS` object in `game.html` (hooks: build/shape/afterBuild/update/beforeFall/isOut/drawWorld/power…) + `src/maps.js` MAP_LIST.
- The tab picks what's on stream: Battle tab = battle, Wheel tab = wheel.

## Every change
1. Bump `version` in `package.json` and add a plain-English entry at the top of `CHANGELOG.md` (and `public/help.html` if it's a feature).
2. Test: `PORT=3801 MOVIE_ROYAL_DATA=/tmp/somewhere node src/server.js`, then drive `game.html` / `control.html` with Playwright. Every battle map must end with the winner on land (`window.__royalCheck()`).
3. Build the installer: `node scripts/build-win.mjs` → `dist/MovieRoyal-Setup-<version>.exe`. Releases: GitHub Actions "Build & release" (the app's updater checks this repo's releases).
4. Give Derek the installer + a source zip.

## Rules Derek has set (keep them)
- **Wheel spot types:** normal, ⏱️ timer (start button + on-stream countdown), ⚡ auto (just shows the winner), 🔢 countdown (each landing knocks one off; 0 = leaves next spin). Any spot can block channel point respins and/or saved-spin respins.
- **Void spot** (per wheel, off by default): lands → auto respin → that spot is voided for the rest of the stream; on-stream "voided tonight" list; subs/gifts/bits/donations can undo it. Void symbol = the original golden gauntlet (`public/gauntlet.svg`), respin symbol = 🕳️.
- **Pop-ups** for subs / gift subs / bits / donations while the wheel is on stream: grow (type the spot), shrink (off by default), give respins, undo void (only once something is voided). Each choice can be turned off per wheel; off = not shown.
- **Grow/shrink with channel points:** chat never types the spot — a pop-up lets Derek pick (or he uses + / −). Grow = +1 size, like adding the spot again in Wheel of Names.
- **Saved respins** never expire; `!respin` uses one, `!myspins` shows the count (friendly reply if none). Both are in `!moviesroyal`.
- **Refunds: never.** The app must not refund, cancel or complete channel point redemptions or change reward queue settings. Derek does refunds himself.
- The "3 spins per stream" idea is for battles only, not the wheel.
- Copying a wheel always copies every spot's rule, type and settings.
- Each wheel has its own settings tab (spin time/speed, sounds, looks, pop-ups, channel point actions…). Shared stuff is in "🌐 All wheels".
- Name changes: Settings → ✏️ Name changes moves everything (movies, history, stats, spins) to the new name.

## Things we said no to
No look-alikes of real characters/brands (declined a Homer Simpson donut monster, Bomberman, and Marvel's Infinity Gauntlet — use original designs instead).

## Open question
Derek asked: "don't show chat on screen except during redemption on battles." Unclear whether he means the wheel posting in Twitch chat, or something he saw on the overlay. Ask him.

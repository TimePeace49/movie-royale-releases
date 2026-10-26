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
- When you change a map, bump its number in `REV` in `src/maps.js` so it shows 🔵 UPDATED (🔴 NEW = never played on stream).
- Battle maps live in the `MAPS` object in `game.html` (hooks: build/shape/afterBuild/update/beforeFall/isOut/drawWorld/power…) + `src/maps.js` MAP_LIST.
- The tab picks what's on stream: Battle tab = battle, Wheel tab = wheel.

## Every change
0. **Anything Derek can try in the app gets a way to test it in the 🧪 Test tab** (he asked for this for every future feature).
1. Bump `version` in `package.json` and add a plain-English entry at the top of `CHANGELOG.md` (and `public/help.html` if it's a feature).
2. Run `node scripts/check-pages.mjs` (catches syntax mistakes in the pages; the release workflow runs it too — a `//` comment in the middle of a one-line statement broke the whole control panel in 1.13.6). Then test: `PORT=3801 MOVIE_ROYAL_DATA=/tmp/somewhere node src/server.js`, then drive `game.html` / `control.html` with Playwright. Every battle map must end with the winner on land (`window.__royalCheck()`).
3. Commit, push to `main`, then publish a **pre-release** by pushing the tag `v<version>` (the "Build & release" workflow builds the installer and publishes it as a test build).
   If a tag push is refused, start the workflow instead: `gh api -X POST repos/TimePeace49/movie-royale-releases/actions/workflows/release.yml/dispatches -f ref=main -f 'inputs[version]=<version>' -F 'inputs[latest]=false'` (GraphQL / `gh workflow run` don't work from Claude sessions).
4. Only when Derek says to make a **latest release**: write **patch notes** covering everything since the previous latest release as a new `## v<x>: What's new` section at the top of `PATCHNOTES.md`, push, then run the workflow with `latest: true` (same version is fine; it rebuilds and turns the pre-release into the latest). The workflow puts that top section in the release description as `## What's new`. (`gh release edit` is blocked from Claude sessions.) The app's 📝 Patch notes tab shows them.
5. Building locally (`node scripts/build-win.mjs`) is only needed to hand Derek an installer directly.

## Rules Derek has set (keep them)
- **Round timer** (per wheel, default 2 min, minutes or seconds): starts when the first spin lands; respins/moves keep going until it runs out, then the current spot is the final winner (`final`). Auto + countdown landings pause it until Derek spins again; he can pause/start any time from the left-side pop-up. "Money" = subs, gift subs, bits, donations, or ones logged by hand.
- **Wheel spot types (dropdown):** ⏱️ timer (= normal spot, clock keeps going, respin button), ⚡ auto (pauses clock, wheel shows "(auto)"), 🔢 countdown (each landing knocks one off, pauses clock, wheel shows "(n)"; 0 = leaves next spin), ⏱️🔢 timercount (timer spot; each WIN knocks one off; 0 = invisible next spin), ⏱️🏆 timermax (timer spot; max wins per stream, then invisible until `newStream`). A "win" = the round timer ran out on it (`finalize`), or with no round timer the next fresh spin. Derek calls paused spots "invisible" (👁️/🙈). Any spot can block channel point respins and/or saved-spin respins. Each spot can have its own sound. "Rules off" = plain wheel.
- **+ / −** = ±10% of the whole wheel (setting `growPct`), others shrink evenly. The void's size is frozen when others change; only money or Derek himself (+ / −) can change it, never channel points.
- **Respin collisions:** respins within `collide.secs` of each other → first spins, the rest become saved respins.
- **Void spot** (per wheel, off by default): lands → auto respin → that spot is voided for the rest of the stream; on-stream "voided tonight" list; money can bring spots back. Void landing on void = it grows and respins; after `landings` hits it fills the wheel → optional "[name] will return for Doomsday" (fullscreen, OBS mic mute + camera hide, StopStream after 15 s via `src/obs.js`). Symbols: respin = 🔁, void / bring back = 🕳️. No gauntlet.
- **Monthly bring-back:** Derek can bring back 1 voided spot per month himself; overriding it fires the 🚨 "rule breaker" siren pop-up on stream. **SECRET:** never mention the siren pop-up in settings text, help, the changelog or patch notes.
- **Undo:** ⏪ Undo / Go back… restores the wheel, sizes, round timer, saved spins (snapshots in `wheel.js`).
- **Move a spot** reward: after redeeming, the viewer types up/down in chat (2 min). Redeems are logged in wheel history.
- Wheels can be put in **folders**.
- **Pop-ups** for subs / gift subs / bits / donations while the wheel is on stream: grow (type the spot), shrink (off by default), give respins, undo void (only once something is voided). Each choice can be turned off per wheel; off = not shown.
- **Grow/shrink with channel points:** chat never types the spot — a pop-up lets Derek pick (or he uses + / −).
- **Saved respins** never expire; `!respin` uses one, `!myspins` shows the count (friendly reply if none). Both are in `!moviesroyal`.
- **Refunds: never.** The app must not refund, cancel or complete channel point redemptions or change reward queue settings. Derek does refunds himself.
- **Streamer respins:** 🎟️ button under the wheel, `perStream` (default 3) per stream, refills when Derek goes live (`newStream`), gray when used up (`wheel.useMine`, source `mine`).
- Copying a wheel always copies every spot's rule, type and settings.
- Each wheel has its own settings tab (spin time/speed, sounds, looks, pop-ups, channel point actions…). Shared stuff is in "🌐 All wheels".
- Name changes: Settings → ✏️ Name changes moves everything (movies, history, stats, spins) to the new name.

- **24/7 bot (`src/cloud-worker.js`):** it only changes on Cloudflare when Derek updates it. Whenever you change that file, bump `WORKER_V` at its top: the app then pops up "Update your 24/7 Discord bot" once on open (only while the bot is older; "Don't remind me again" lasts until the next bump).

- **Channel point rewards:** `syncRewards()` in server.js pauses every reward the app made (manageable rewards) unless it's usable right now; the desktop app pauses them all on quit (`/api/rewards/pause-all`). Pausing only — never refunds.
- **Wild (Kirb) spots and a winner's other movies are hidden (`benched`), never deleted.** ▶ on the Battle tab sets `forceIn` (skips cooldown + chat check). "Reset wild spots" = `resetSpots()`.
- **Never use `prompt()`** in pages: the Windows app blocks it. Use `await ask(question, default)` from `public/ask.js`.

- **Closing the app** with the 24/7 bot off asks first (`tryQuit` in main.cjs → `closeAsk()` in control.html; setting `closeAskBot`).
- **Share files:** `/api/wheel/:id/export`, `/api/lists/:id/export` → JSON with `movieRoyal: 'wheel'|'battle'`, own uploads packed as data URLs; `/api/share/import` makes a NEW wheel/battle.

- **Claims:** `claimApprove` (default on): winner types in chat → timer stops (`claimWait`), Derek presses ✅ Accept (`/api/claim/accept`) or ⏭️ Pass (`/api/claim/pass` → `undoMovieWin`: back in pool, luck + week cooldown undone). `pinWinner`: claimed movie pinned in Twitch chat (`twitch.sayAndPin`). `!sitout` / `!imback` set a viewer's movies `away` for tonight.
- **Spot links:** `entry.link` (cleanLink), shown as 🔗 Open on the result / round timer pop-up.

- **24/7 link check:** `cloud.checkLink()` makes sure Discord's interactions URL points at the worker (re-links by itself); runs on open, every 10 min, on close (`/api/close-check`).
- **Cliff self-heal:** game screens send `{type:'cliff'}` every 4 s; if one doesn't match `lastPreview` twice, the server re-sends it with `heal:true`.
- **Hidden health:** `hurt(f, dmg)` in game.html (hard bumps + big `push` hits); 0 = `blastOrDodge(..., 'K.O.!')`; the fair-odds winner never dies from it.

- **Letterboxd battles (REMOVED from the app at Derek's request in 1.21.3, Letterboxd blocked it; server code left unused):** list `source: {kind:'letterboxd', url, max}`; `syncLetterboxdList` (server) uses `lb.fetchFilmList` (films pages via the `/films/ajax/` address, lists as-is) + TMDB search; entries keep `lbSlug`. Couldn't test real Letterboxd from the cloud session (blocked) — only a mock.
- **Error history:** `src/errlog.js` (data/errors.json). Every `console.error('[source] …')` on the server is logged automatically, plus game screen + control panel errors and status errors. Test tab → ⚠️ Errors shows plain words (`errlog.plain`) and `/api/debug-report` (tech, no secrets). Derek may paste that report: read it first.
- **Test tab** has three tabs: 🧪 Tests, ✅ Checklist and ⚠️ Errors (`drawChecklist`; ticks in localStorage `ckDone`). Add new testable features to both.
- **Test Discord battle:** `startRound({test:true})` = real pieces, `live.game.test` (no history, luck, cooldowns).

- **Discord debug channel:** `#movie-royal-debug` (discord.js `setupDebug`): @everyone can't see, mod roles (admin/manage server/manage messages/moderate/kick/ban) read-only, bot posts; pinned "don't type" note + topic. Errors with source discord / 24/7 (or all, `discordDebugAll`) → `discord.postDebug`. The worker posts its errors there too (`cfg.debugChannels`, `debugPost`). Never `console.error` inside the posting code (loop).

## Things we said no to
No look-alikes of real characters/brands (declined a Homer Simpson donut monster, Bomberman, and Marvel's Infinity Gauntlet — use original designs instead).

- Updates: the app installs only latest releases unless "Also install test builds" is on. Old versions can be installed from Settings.
- The pinned Discord message links Derek's ideas doc (setting `ideasDoc`).

## Open question
Derek asked: "don't show chat on screen except during redemption on battles." Unclear whether he means the wheel posting in Twitch chat, or something he saw on the overlay. Ask him.

# Movie Royal guide

Everything here is also in the app's **❓ Help** tab, which you can search.

- [Install, update, uninstall](#install-update-uninstall)
- [Connecting everything](#connecting-everything)
- [Running a battle](#running-a-battle)
- [Discord movies and the rules](#discord-movies-and-the-rules)
- [Twitch: channel points, bits, chat](#twitch-channel-points-bits-chat)
- [Custom battles and importing](#custom-battles-and-importing)
- [Camera and replay](#camera-and-replay)
- [Sounds and graphics](#sounds-and-graphics)
- [Your data](#your-data)

## Install, update, uninstall

1. Download `MovieRoyal-Setup-x.y.z.exe` from [Releases](../../../releases/latest) and run it. If Windows says **"Windows protected your PC"**, click **More info → Run anyway**. (The app isn't code-signed. Code-signing costs money every year.)
2. It installs for your user only (no admin needed) and adds Start menu and desktop shortcuts.
3. **Updates:** when a new version is out, Movie Royal asks **"Update available — Install now?"** when it opens. You can also check in **Settings → Account & updates**. Your stuff is kept.
4. **Uninstall:** Windows **Settings → Apps → Movie Royal → Uninstall**. It asks whether to delete your lists and history too; say **No** to keep them.

**Keep it running:** the Discord bot and Twitch only answer while Movie Royal is running. Closing the window keeps it in the **tray** (by the clock). Right-click the tray icon → **Quit** to really close it. Turn on **Start when Windows starts** in Settings → App.

## Connecting everything

Open **🧭 Setup guide** (Settings → Setup guide). Each step has copy buttons, links to the right page and a test:

1. **Sign in with Twitch.** You make a free Twitch app (about 2 minutes), paste the Client ID and Client Secret, and sign in. The app must be a **Confidential** client. The redirect URL is `http://localhost:3737/twitch/callback`.
2. **Channel points & bits.** One button creates the rewards on your channel (needs Affiliate or Partner).
3. **Movie search (TMDB).** Make a free account at themoviedb.org, then go to Settings → API and copy the **API Read Access Token**. For the URL field, `http://localhost` is fine.
4. **Ratings (OMDb).** Get a free key at omdbapi.com/apikey.aspx and click the activation link in their email.
5. **Letterboxd.** Type your username. The app reads your whole public profile by itself (about every 6 hours), so there's nothing to download. If your profile is private, drop your exported `watched.csv` in instead.
6. **Discord bot.** Create an application at discord.com/developers, then paste its Application ID and Bot token. Press **Add the bot to my server**. The bot creates **#movies-royal** and pins the commands there.
7. **On stream.** Press **🪟 Pop out**, then in OBS add a **Window Capture** of that window plus an **Application Audio Capture** for MovieRoyal.exe.

## Running a battle

1. **⚔️ Battle tab:** choose what's playing, and optionally type a **screen title**.
2. Pieces wait on the cliff. New entries drop in live.
3. Press **▶ START ROYAL**. It goes fullscreen with a short countdown, then the fight starts. **Esc** leaves fullscreen.
4. The last piece standing wins. A slow-motion replay plays, then the winner card shows. It stays fullscreen until you press **Esc**.
5. For Discord movies, if the winner types in chat they win instantly. Otherwise use **⏱️ Start 30s claim timer**.
6. Press **Next round →**.

Other things you can do:
- **Map:** pick one under the battle screen, or leave it on 🎲 Random. **🗳️ Chat vote** shows 4 maps and chat types 1–4.
- **⚡ Powers:** every chaos power (and the map's own power) is a free button. Press one any time. In fullscreen, move the mouse to bring up the power bar, or press 1–9 / 0.
- **👤 Who picked it:** press 👤 on a movie to tag it to someone. Their picks and `/mymovies` update, and the bot posts it in Discord.
- **🔀 Shuffle:** scatters every piece to a random spot before the fight.
- **The list below** (scroll down): every entry with luck, odds and chance, plus ✅ watched, ⏸ pause, ✕ delete. Use **➕ Add** to type in a person and their movie so the cliff matches your old wheel.
- **⏱️ 2-min chat timer** gives chat time to type before the battle starts on its own.
- **⭐ Points / 💎 Bits** buttons turn chaos on or off. Turning points off also pauses the rewards on Twitch.
- **📣 Roll call** (after 3 no-shows in a row): everyone has 2 minutes to type in chat, and only they stay on the cliff tonight.

## Discord movies and the rules

| Command | What it does |
|---|---|
| `/suggest movie:` | Pick a movie. Type to search. Blocked movies show 🚫 / ✅ / 🔒 and the reason. |
| `/swap yours: new:` | Trade one of your movies for another, 1 for 1. Locked once the stream goes live. |
| `/mymovies` (or `/mine`) | Your movies and picks left. Add `person:` to see someone else's (30s cooldown). |
| `/list` | Everything in the pool. |
| `/linktwitch username:` | Connect your Twitch name, so chatting puts your movies on the cliff. |
| `/help` | The rules. |

**☁️ 24/7 mode:** normally the bot only answers while Movie Royal is running. In **Settings → Discord & picks → 24/7 mode**, paste a free Cloudflare API token (Cloudflare → My Profile → API Tokens → *Edit Cloudflare Workers* template) and press **Turn on**. A tiny copy of the bot then runs free on Cloudflare: `/suggest`, `/swap`, `/mymovies`, `/list` and `/linktwitch` work any time with all your rules, and Movie Royal pulls the picks in when you open it.

**Rules (all automatic):**
- Everyone gets **3 picks** and no new ones until all of them have been watched.
- **One person per movie.** If someone already picked it, nobody else can.
- **Series rule:** if a movie from a series is in, no other movie from that series can be picked.
- **No current-year movies.** You can allow single ones on the 🚫 Bans tab.
- **Win a movie and your other movies sit out until the new week** (Sunday by default).
- **Kirb spots:** 3 wildcard spots each week. If one wins, they're all gone until next week, and there's no claim timer.
- **Only people chatting this stream get on the cliff.** This resets every day.
- **Luck** (optional): every battle a movie loses adds 1% to its chances. It only starts over when one of your movies gets watched (a win counts, and putting the winner back gives the luck back).

**👥 People tab:** add people by hand, give them movies, set picks used, link Twitch names, or import your old wheel by pasting `twitchname: Movie, Movie, Movie` one person per line.

## Twitch: channel points, bits, chat

- **Settings → Twitch & channel points:** edit each reward's name, price, cooldown, on/off and what it does, and set bits tiers.
- `!call Heat` before the fight calls the winner. Call it right and your own movies get +1% luck, and you're named in chat.
- `!mymovies` in chat replies with your movies. `!mymovies lucy` shows Lucy's. There's a 30-second cooldown.
- The winner is posted in chat after the replay. You can turn that off in Settings.
- Replies come from **your own account**, so you don't need a separate bot.
- **Ball colors:** viewers type `!color pink` or `!color #ff66aa`. It never replies, so it doesn't spam chat. It's free by default. Settings → Twitch → Ball colors can switch it to channel points (one reward, where viewers type any color, and it asks before adding it) or turn it off.

## Giveaways

The **🎁 Giveaway** tab runs a chat giveaway with rules:
- **Who can enter:** everyone, followers, subs, VIPs or mods, and how long they've followed or subbed.
- **Extra odds:** for each sub tier, plus loyalty per sub month.
- **Past winners:** allowed to win again, or not this stream, week, month, or ever.
- **Entries:** a maximum number, and they can close by themselves.
- **Reroll:** for when the winner doesn't show up.

Viewers type `!enter`. Giveaways, chat battles and custom battles can all be **best of 3, 5, 7 or 9**.

## Custom battles and importing

**+ New battle** gives you four kinds:
- **🎬 Movies:** your own movie list, with the full winner screen.
- **📝 Text:** anything you type.
- **🖼️ Pictures:** drag in images.
- **💬 Twitch chat:** viewers type `!join`. The 🎲 Chat battle tab is made for this.

You can paste big lists. Separate items with commas or new lines, and add `x3` for triple odds.

**📥 Import** (Pool tab or the New battle box) takes:
- a Wheel of Names share link or `.wheel` file
- Marbles on Stream or spreadsheet `.csv` files
- `.json` or `.txt` files

For Wheel of Names you can also click the entries box, press Ctrl+A then Ctrl+C, and paste.

## Camera and replay

- **Auto camera:** it zooms in as the cliff crumbles.
- **Follow a piece:** click it, or press **Tab** / ◀ ▶.
- **Move and zoom:** scroll to zoom, drag to move, or use **WASD** and **Q/E**. **O** shows the whole cliff and **R** goes back to auto.
- **Cliff size:** Settings → Game.
- **Instant replay:** the last few seconds in slow motion. Click, press **Space**, or press **⏭ Skip replay** to skip it. Turn it off in Settings → Game.

## Sounds and graphics

- Every sound is generated in code. The **🔊 Sounds** tab lets you upload your own mp3/wav for any of them, or reset one back. Volume controls are on the Battle tab.
- Your own sky: put a 1920×1080 `background.png` in your data folder.
- Free sounds: pixabay.com/sound-effects, freesound.org. Free art: kenney.nl, opengameart.org. Check each license.

## Your data

Everything is saved in `%APPDATA%\Movie Royal\data` (**Settings → App → Open data folder**). **Settings → Account & updates → Download backup** saves one file you can restore on any computer.

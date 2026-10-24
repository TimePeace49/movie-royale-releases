# Changelog

What changed in each version of Movie Royale. Newest first.

## 1.1.8
- Ready for GitHub: README with screenshots, guide, MIT license, one-click "Build & release" on GitHub, bug-report forms. Copies built on GitHub check that repo for updates automatically.
- Fixed: sudden death showed everyone as "#2" in the knock-out list.

## 1.1.7
- The "LEFT" pill is gone. Discord movie battles show **MOVIE #N TONIGHT** instead, which starts over when you go live (or on a new day).
- Fixed: text boxes in the desktop app could stop taking typing after a yes/no pop-up.

## 1.1.6
- Pieces start spread evenly over the whole cliff (even with 1000), keep a little distance in big rounds instead of piling in the middle, and bounce off each other a bit more.

## 1.1.5
- Fixed: the waiting screen showed "MOVIE ROYALE" on top of "GET READY". It now sits in one clean panel.

## 1.1.4
- **📥 Import** from Wheel of Names (share link, `.wheel` file or copy-paste) and Marbles on Stream / any CSV, JSON or text file — Pool tab and the New battle box.
- **One person per movie**: nobody can pick a movie someone else already picked (no more backing).
- Twitch command is now **`!mymovies`**; **`!mymovies name`** and **`/mymovies person:`** show someone else's movies (same cooldown).
- The **winner is posted in Twitch chat** (after the replay). Replies come from your own account — no bot needed.
- **Follow camera** like Marbles: click a piece to follow it, Tab / ◀ ▶ to switch, O for the whole cliff, R for auto, WASD/arrows to move, Q/E to zoom.

## 1.1.3
- **Bigger cliff** that fills the screen (Settings → Game → Cliff size), and a **camera**: it follows the action and zooms in as the cliff crumbles; scroll to zoom, drag to move, double-click (or 🎥 Auto) to reset.
- **🎬 Instant replay**: the final seconds play again in slow motion, sports-broadcast style, before the winner card. Click / Space / ⏭ Skip replay to skip; turn it off in Settings → Game.

## 1.1.2
- **Esc** leaves the fullscreen battle screen (also after practice rounds).
- Volume controls on the Battle tab.
- Up to **1000** pieces on the cliff by default (big chat battles stay smooth), and luck defaults to **1%** per battle.
- Fixed: the 🚫 Ban button did nothing in the desktop app.
- Lists accept **commas or new lines** (`Pizza, Tacos x3, Sushi`), and you can add items right in the New battle box.

## 1.1.1
- **🎲 Chat battle** tab: open joining, viewers type `!join`, press start. Great for giveaways.
- **⭐ Points / 💎 Bits on-off buttons** on the Battle, Pool and Chat battle tabs (and Settings). Turning points off also pauses the rewards on Twitch.
- History has a **search bar** and a **👑 Who won what** view listing every movie each person has ever won.
- The winner screen only shows a name when chat picked it (Discord movies and `!join` battles), not for lists you typed in yourself.

## 1.1.0
- Tabs everywhere — no more scrolling: ⚔️ Battle · 📋 Pool · 👥 People · 📜 History · 🚫 Bans · 🔊 Sounds · 🧪 Test · ❓ Help · ⚙️ Settings (with its own sub-tabs).
- Discord bot makes **#movies-royal**, pins a command guide there, and `/suggest` + `/swap` only work in that channel.
- Blocked movies still show in Discord's list with 🚫 and the reason (watched, banned, this year's release, series taken).
- **Series rule**, **Bans tab**, **auto-ban this year's movies** (allow single ones).
- `/swap` (1-for-1, locks automatically when you go live) and `/mymovies`; `!mymovies` in Twitch chat (30s cooldown per person).
- Optional **🍀 luck**: every battle a movie loses adds a little chance; resets when one of your movies wins.
- New **🎬 Movies** battle type for your own theme nights, with the full winner screen.
- New winner screen: WINNER → poster → title → year + genre → Rotten Tomatoes / IMDb / Letterboxd → who picked it. Kirb spot wins skip the claim timer.
- Screen title for any battle, custom sound uploads, channel point editor (name, price, cooldown, on/off), and update-on-open.

## 1.0.x
- First releases: Discord `/suggest` with Letterboxd blocking, custom lists (text, pictures, Twitch `!join`), odds, chaos events from channel points and bits, claim timer, weekly pick rules, Kirb spots, roll call, People tab, history, setup guide, Windows installer with updates.

# Patch notes

The big list of what's new in each **latest release** (the version everyone gets).
Test builds (pre-releases) are listed in CHANGELOG.md until they make it into a latest release.

## v1.28.9: What's new
Everything since 1.28.8.

**Fixes**
- 🔀 **Linked ⚡ auto spots:** with the round timer on, landing on an auto spot that links to another wheel or a battle now does the link right away (before, it just paused and waited for you). When the linked wheel or battle is done, it comes back with your timer still paused, so you press start (or respin) like normal.

## v1.28.8: What's new
Everything since 1.28.7.

**🛡️ Movie Royal Backup Bots**
- **Add your bot in one click, no copy and paste:** press **🍿 Add my bot from Movie Royal (this PC)** in the backup app, or **🛡️ Add my bot to the backup on this PC** in Movie Royal (Settings → Discord & picks).
- **It updates itself:** it looks for updates when it opens and every 6 hours. The bar at the top of its window has **🔍 Look for updates** and **⬇️ Update** (it closes, installs and opens again by itself, keeping your bots). Tick **Also test builds** to get those too. Install this version by hand once; after that it updates itself.

**Fixes**
- 📋 **Copy my bot token** works now (it uses Windows' own copy). If it ever fails, it shows the token in a box to copy by hand.

## v1.28.7: What's new
Everything since 1.28.6.

**🎬 Custom movie battles**
- A movie you click in the search now shows in the pool right away (before, you had to switch away and back).
- **📝 Plain text entries:** type anything in the Add box and pick **📝 Add "…" as plain text** at the top of the results, or **📝 Add all as plain text** under Paste a big list. They play like any other piece, without a poster, and you can rename them in the pool.

**🔢 Worse Movies**
- A ready-made number battle, 1 to 500, is now in your battle list. Delete it if you don't want it: it won't come back.

**Fixes**
- ☁️ One slow internet check no longer posts "Couldn't reach the internet" in #movie-royal-debug. It only says something if it fails 3 times in a row. The backup bot server only reacts to problems the 24/7 bot posts itself, so an internet hiccup on your PC can't make it take over.

## v1.28.6: What's new
Everything since 1.28.3.

**🛡️ Movie Royal Backup Bots has its own installer**
- Download **MovieRoyalBackupBots-Setup-1.28.6.exe** from this release page and run it on the PC that should run the backup. It goes in the Start menu and on your desktop, opens when it's done, and starts with Windows hidden in the tray. Uninstall it on its own in Windows Settings → Apps. (The checkbox in the Movie Royal installer is gone: it didn't work.)
- **▶ Start / ⏹ Stop the backup server** at the top of the backup app turns every bot on or off, and stays that way until you change it.
- **▶ Run this bot now** makes the backup answer that bot's Discord commands right away. **⏹ Hand it back** gives them back to the 24/7 cloud bot.
- Pasting a bot token is easier: extra spaces or quotes are fine, and it tells you if you pasted the Application ID or Public Key by mistake.
- Movie Royal updates no longer close the backup app.

**🔄 Restart the Discord bot**
- New button in Settings → Discord & picks (and on the 🧪 Test tab): turns the bot off and on again without closing Movie Royal, and fixes its slash commands, channels and pinned messages.

**Fixes**
- When your Discord bot token was reset on the Discord website, Movie Royal now says so plainly (on the Discord bot status and under Backup bot server) instead of "Expected token to be set for this request" every minute.

## v1.28.3: What's new
Everything since 1.26.0.

**🛡️ New (optional): Movie Royal Backup Bots**
- An optional small app, off by default: tick **Movie Royal Backup Bots (optional)** when you run the installer (run it again to add or remove it later). It runs Discord bots as a backup: yours, and any friend's who sends you their bot token. Once installed it starts with Windows, hidden in the tray, and keeps running when its window is closed.
- Every minute it checks each streamer's 24/7 cloud bot. If the cloud bot has errors, the backup answers /suggest, /swap, /mymovies, /list and /linktwitch with the same rules, until the streamer presses **☁️ Switch back to the cloud** in Movie Royal. If a streamer doesn't use the cloud bot, it answers whenever their Movie Royal is closed. Picks it takes come into Movie Royal when it opens.
- It also reads each streamer's Twitch chat (live or offline) while their Movie Royal is closed, and who's in the viewer list while they're live, so the viewer profiles keep counting chats and watch streaks.
- Fill in its 💜 Twitch box (Client ID + Client Secret) when you set it up. Add bots with **📋 Copy my bot token** (Movie Royal → Settings → Discord & picks). 🧪 Test: take over now tries it on purpose.
- Movie Royal → Settings → Discord & picks → **🛡️ Backup bot server** shows whether a backup is watching your bot. **Update the 24/7 bot once** when Movie Royal asks.

**🔥 Watch streaks**
- Someone watched a stream if they chatted or were in the viewer list while you were live. Their streak is how many of your streams in a row they watched; missing one starts it over. Every stream counts on its own.
- The viewer profile shows the streak and their last 10 streams (✅ watched / ❌ missed).

**🔀 Linked wheel spots**
- In a spot's ⚙: **When this spot wins** → another wheel or a battle. That wheel spins by itself (or that battle comes on stream and starts), then Movie Royal comes back to your wheel.

**✋ The winner decides in chat**
- When the movie winner types in chat, Movie Royal asks them: **!accept** to watch it now, or **!pass** to save it for another night (they keep their luck). It does whatever they answer. ✅ Accept / ⏭️ Pass on the winner card are for doing it yourself (the green bar at the top is gone).

**Fixes**
- 🎥 The OBS test mutes your mic now: an empty mic box mutes every mic OBS has (never desktop sound), names work in any upper/lower case, and it says exactly which mic and camera it switched.

## v1.26.0: What's new
Everything since 1.25.0.

- **⌨️ Key binds** (Settings → ⌨️ Key binds): keyboard shortcuts for every tab, sorted by tab. Space spins the wheel, R respins, ↑ / ↓ move it, Ctrl+Z undoes, G starts the battle, Y / P accept / pass the winner, N next round, 1–0 fire powers, Alt+1 to Alt+0 jump between tabs, and more. Click a key to change it.
  - Each key only works on its own tab, and never while you're typing in a box. Only the Ctrl / Alt ones work everywhere.
- **Ctrl+H** turns help mode on and off.
- **⚠️ on the 🧪 Test tab** shows how many new errors there are.
- **📺 Preview window:** it comes back when you open the 🧪 Test tab, has a Show / Hide button, and **⧉ Pop out** puts it in its own window for another monitor (no sound).
- **Tests show the right screen:** battle tests (the winner claiming, !sitout, !join…) put the battle on stream, wheel tests (up, down, !respin, redeems, money pop-ups) put the wheel on stream. No preview window on the 🎡 Wheel tab while the wheel is on stream.
- **✅ Checklist** is easier to read: each item is its own box with a colored edge, and its button right next to it.

## v1.25.0: What's new
Everything since 1.24.0.

- **❓ Help mode explains everything:** press ❓, then click any button, box, checkbox or menu on any tab. A window explains exactly what it does in plain words, with the matching part of the Help tab underneath. Nothing gets clicked for real, and help mode stays on so you can click the next thing (Esc or ❓ stops it).
- **💬 Pretend chat window** (🧪 Test tab): type as any viewer, on any tab. It shows Movie Royal's replies too.
  - **✋ Winner types in chat** always works now: with no movie winner up, Movie Royal makes a pretend one that changes nothing. Type anything as them and ✅ Accept / ⏭️ Pass shows up.
  - One-click **up** / **down** after a ↕️ Move redeem, !respin, !myspins, !sitout and more, plus wheel channel point redeems as that viewer.
- ✅ Checklist: try ↕️ Move a spot and 💬 Pretend chat.
- The Help tab's search finds the right topic more often.

## v1.24.0: What's new
Everything since 1.21.2.

**New**
- **❓ Help mode:** press ❓ at the top, then click any button or option, and the help opens at the part that explains it. Esc stops it.
- **🎡 Respin, ⬆️ Up and ⬇️ Down channel point rewards:** one button (Wheel → 🌐 All wheels → 💜 Channel point rewards) makes them. If you already had them, Movie Royal keeps the same price, deletes them and makes them again so it can control them. Ones made by hand on Twitch can only be deleted on Twitch: it lists them with their price and a link.
- **💜 A clean channel points menu:** rewards that can't be used right now are switched off, so viewers don't see them at all (before, they showed as paused).
- **🔢 Number battles:** a "🔢 Numbers" tab next to Text in ➕ New battle. Change the range later in the 🎬 Movie Pool tab, or click any number to edit it.
- **🔴 Pretend I'm live** (🧪 Test tab): Movie Royal acts like you just went live, without changing anything on Twitch or Discord.
- **🐞 Hidden Discord debug channel:** `#movie-royal-debug`, only mods and the owner can see it and only the bot can type in it. Discord problems get posted there in plain words plus the tech details.
- **🤖 Discord self-test:** checks the bot, the channels, the pins, the slash commands, the debug channel and the 24/7 bot in one go.
- **📌 Movie Royal's pinned messages stay on top** in Discord, even if someone pins something else.
- **⬇️ Update progress bar:** updating shows a download bar, then the installer's own progress bar, and Movie Royal opens again by itself.
- **✋ Accept / Pass** for a movie winner's claim shows up as a green bar on every tab.
- **↗ Go to the Battle / Wheel tab** button on the test pop-up window.

**🧪 Test tab**
- ✅ Checklist "Try it" buttons work offline for almost everything (chat joins, claims, `!sitout`, chaos events, number battles, the wheel, channel points, bits pop-ups, OBS) and keep you on the checklist.
- ⚠️ Errors: a **📋 Copy for Claude** button on each error.
- The Test tab remembers which tab you were on. The tabs and tool bars stay at the top when you scroll, in every tab.
- Tidied up: removed "Why is nobody on the cliff?" and the top 📌 Pinned messages box.

**Fixes**
- An error in the 🎬 Movie Pool tab when it refreshed while you typed in a number box.
- 📗 Letterboxd: your full watched list is read like a real browser does, so Letterboxd stops turning it away.
- The ⚠️ Errors list no longer fills up with a harmless Discord warning every time the app opens.
- Removed the Letterboxd worst-500 battle (Letterboxd wouldn't let Movie Royal read it).

## v1.21.2: What's new
Everything since 1.14.1.

**Fixes**
- **🎯 Balls come back on the cliff after a battle.** After the first battle, Twitch pictures crashed the game screen and left the cliff empty. Fixed.
- **☁️ 24/7 Discord bot:** Movie Royal checks that Discord is really connected to the 24/7 bot, and reconnects it by itself if not. Before, `/suggest` and `/linktwitch` could stop working once the app closed. There's a "🔍 Check it works when I'm closed" button in Settings → Discord.
- **Closing Movie Royal** while the 24/7 bot is off (or not connected) asks first, and can turn it on before closing.
- **📥 Import** and **📁➕ New folder** on the Wheel tab work again, and so do the timeout / ban boxes in chat.
- **💜 Channel point rewards** Movie Royal made stay paused unless you're live and they can be used right now (battle chaos while the battle is on stream, wheel rewards while the wheel is up, power-ups in fun chat battles). They're all paused when you close Movie Royal. You get a warning about any rewards made by hand on Twitch, since Movie Royal can't pause those.
- The main tabs always stay at the top of the screen.

**Battles**
- **🦸 New map: Hero City:** made-up villains knock balls off the roof.
- **❤️ Hidden health:** balls can only take so many hard hits before they're knocked out (K.O.!). Bigger balls are tougher, and they flash red when hurt.
- **🐀 Plague Town:** infected balls are much easier to spot.
- **🗺️ Chaos fits the map:** no ground-breaking events on maps where the ground can't break.
- **🎉 Fun mode for chat battles:** chat can buy power-ups for their own ball (Shield, Mega, Turbo), plus wacky effects (super bouncy, low gravity, random sizes, big heads, chaos rain, disco).
- **✋ You decide on claims:** when the winner types in chat, the timer stops and you press ✅ Accept or ⏭️ Pass. A pass puts the movie back, and they keep their luck.
- **📌 The claimed movie gets pinned in Twitch chat:** "2nd movie tonight: Title (Year) · picked by Name".
- **🛌 `!sitout` / `!imback`:** viewers who can't stay up take their movies out of tonight's battles, or put them back.
- **🎟️ Wild spots are hidden, not deleted,** when one wins. "Reset wild spots" is on the Battle tab, and ▶ puts any hidden movie straight back in.
- **💩 Letterboxd's worst 500:** a battle of the 500 lowest rated (English) movies on Letterboxd. It updates with one button.
- **🔢 Number battles:** every ball is a number (pick 1 to whatever).
- **✕ on the winner pop-up**, and a "Hide the pop-up on stream" button.
- Maps are in A to Z order, and ↺ Reset sits back on the same line as the other buttons.

**🎡 Wheel**
- **🎟️ Streamer respins:** 3 of your own respins each stream. The button turns gray when they're used up.
- **Drag spots to sort them,** and **👁️ / 🙈** to make a spot invisible without deleting it.
- **New spot rules:** ⏱️🔢 Timer + countdown, and ⏱️🏆 Timer + max wins a night.
- **🔗 Links on spots:** a button opens the spot's web page when it wins.
- **🪟 Pop out** the wheel into its own window. The round timer pop-up shows the winner. There are volume sliders, and you can grow or shrink the void yourself.
- **📤 Export / 📥 Import** wheels and battles as files to share with other streamers.

**🧪 Test tab**
- **Every test pops up a window** showing what's on stream. You can drag and resize it.
- **✅ Checklist:** what's set up, plus things to try once.
- **⚠️ Errors:** a history of every problem, in plain words. There's also a tech report you can paste to Claude.
- **Discord battle tests:** reset cooldowns, put everyone on the cliff, run a test battle that changes nothing, "Why is nobody on the cliff?", and pretend people chat.
- Tests for pinning, claims, the 24/7 bot, the command list and number battles.
- **📗 Letterboxd updates** every time Movie Royal opens.
- **`!moviesroyal`** lists all the chat commands.

## v1.14.1: What's new
Everything since 1.13.6.

- **🛠️ Fixed: Movie Royal not working after updating to 1.13.6.** The battle screen was blank and none of the tabs worked. Sorry about that!
- **🐀 New map: Plague Town:** a walled medieval town seen from above. Rats bite and infect balls, the sick pass it on to anyone they bump into, and infected balls die after a few seconds unless luck saves them. Houses block everyone and the ground never breaks.
- **⚔️ New map: Battlefield:** all the balls on one side, an unstoppable army on the other. Archers hit the back rows, knights crush the front, and the cavalry hits both sides.
- **🎡 ⏸ / ▶ on every wheel spot:** pause a spot (off the wheel, still in your list) and put it back any time. Spots the void takes stay in the list too.
- **🎡 Volume sliders** on the Wheel tab.
- **🕳️ You can grow or shrink the void yourself** with its + / −. Chat still needs money for that.
- **☁️ 24/7 bot:** Movie Royal only asks you to update it when it actually needs it.
- Fart Farm plays its moo, stampede, UFO and beam sounds, and has its right name in the map menus.

## v1.13.6: What's new
Everything since 1.13.4.

- **☁️ 24/7 Discord bot answers faster:** `/linktwitch` replies right away and every command does one less lookup before answering. If something still goes wrong, the bot says why instead of "The application did not respond". Update the bot once with the 🔄 Update button in Settings → Discord (paste your Cloudflare token).
- **No more 24/7 bot pop-up** when Movie Royal opens. The update button stays in Settings → Discord.

## v1.13.4: What's new
Everything since 1.13.0.

### ☁️ 24/7 Discord bot
- **Update it once:** Movie Royal asks when it opens. Paste your Cloudflare API token and press Update.
- After that, `/linktwitch` and the other commands always answer (no more "The application did not respond").
- It stays under Cloudflare's free daily limit.

### 🎬 Movies & luck
- **🎟️ Free replacement pick:** if a movie gets watched outside a battle (marked ✅ or on your Letterboxd), its person is told in Discord they can pick a new one. That one pick works any time, even with picks closed, all picks used, or other movies still in the pool.
- **🍀 Luck cooldown:** after someone's movie gets watched, they don't build luck until the new week.
- **🍀 LUCKY! is rare:** only balls that have luck can get lucky, and only once every several seconds on the whole map. The same goes for DODGED! and slipping out of a UFO beam. No more spam in big battles.

### ⚔️ Battles
- **Big balls hit harder:** they knock small ones further and barely bounce themselves.
- **💨 Fart Farm rebuilt:** big stampeding, farting cows that trample balls flat, and big UFOs that beam balls up into the saucer.
- **Fixed:** balls not showing up on the cliff after a finished battle (until a restart).
- **Fixed:** ⏸ / ▶ in the Battle tab list didn't update, so paused movies couldn't be put back.
- Someone listed twice gets all their movies on the cliff from their first chat.

### 🎡 Wheel
- The **Rule** column is a dropdown (Timer / Auto / Countdown), so you can see and change rules at a glance.
- Drag the line between the spot list and the wheel to resize them. The round timer pop-up can be resized too.

### 👥 People & testing
- **People tab:** shows everyone who linked their Twitch in Discord, plus a 🔄 Refresh button.
- **🧪 Test → 🎡 Wheel tests:** land on any spot, pretend redeems, chat, subs, bits and donations, the round timer, and a Doomsday preview that doesn't end your stream.

## v1.13.0: What's new
Everything since 1.11.4.

### 🎡 Wheel
- **⏱️ Round timer:** starts when the first spin lands (2 minutes by default, minutes or seconds per wheel). Keep spinning with respins and moves. When time runs out, the spot the wheel is on wins.
  - ⚡ Auto and 🔢 countdown spots pause it until you spin again.
  - A big timer pop-up on the left with Stop / Start, ±30 seconds and End now. Drag it wherever you like.
- **Spot types are a dropdown:** ⏱️ timer, ⚡ auto, 🔢 countdown. Old normal spots became timer spots. On the wheel, auto spots show (auto) and countdown spots show how many are left.
- **After a landing:** a 🔁 respin button, plus knock buttons on countdown spots.
- **🔁 Respins at the same time:** the first one spins, everyone else keeps theirs as a saved respin. You pick how many seconds counts.
- **↕️ Move a spot** channel point reward: the viewer types up or down in chat after redeeming.
- **📈 + / −** grows or shrinks a spot by 10% of the whole wheel (the others make room). The % is a setting.
- **🕳️ Void:**
  - Only money (subs, gift subs, bits, donations, or ones you log by hand) can grow or shrink it.
  - If it lands on itself it grows and spins again. After the number of landings you pick, it has swallowed the wheel.
  - Optional **☠️ [your name] will return for Doomsday**: full-screen message, mic and camera off, and the stream ends 15 seconds later.
  - You can bring back 1 voided spot per month yourself.
- **🎥 OBS connection** for Doomsday: Settings → 🎥 OBS, and a new step in the setup guide.
- **⏪ Undo / Go back…** under the wheel takes back the last step or several.
- **📜 Plain wheel:** turn rules off for a wheel that just spins.
- **📁 Folders** for your wheels.
- **🔊 A sound for each spot** that plays when the wheel lands there.
- **📜 Wheel history** shows channel point redeems, grows, voids, undos and the final winner, with filter buttons.
- **📥 Wheel of Names import** brings pictures, the middle picture, background, colors, title, spin time, confetti, sounds on/off and remove-winner along.
- The respin symbol is now 🔁, and 🕳️ is the void.
- The wheel/tab bar stays put when you scroll, the wheel shrinks to fit instead of scrolling, and pop-ups only show in the Wheel tab (with a 🎁 count on the Wheel button).

### 💬 Chat tab (new)
- Your Twitch chat with badges and emotes (Twitch, 7TV, BTTV, FFZ), an alerts list, and Find someone (by name or by what they said).
- Delete, time out, ban or open a profile right from a message, and send messages.
- ⧉ Pop out chat, alerts or Find someone on their own, or ⧉ All 3 together.
- **Sign in with Twitch again once** to turn on deleting, timeouts, bans and watch time. Movie Royal reminds you.

### 👤 Viewer profiles
- Double-click anyone's name: Twitch info, follow and sub months, watch streak and time, how much they chat, Discord movies, battle stats, respins (with give / take buttons) and their chat log.

### ⚔️ Battles
- **🔴 NEW / 🔵 UPDATED** tags on maps you haven't played on stream, or that changed since you last did. They clear after a live battle on that map.
- Best of 3/5/7/9 no longer starts the next round by itself (turn it on in Settings → Game). Chat map votes last 120 seconds.

### 🔄 Updates & settings
- Only latest releases install by default. Turn on 🧪 "Also install test builds" to get test builds too, or 🕰️ run any older version.
- 📝 Patch notes tab in Settings.
- Movie Royal reliably opens again after an update, and asks once if an update adds something to set up.
- 💡 Your ideas doc is linked in the pinned Discord message (Settings → Discord & picks).
- **Pool** is now **🎬 Movie Pool**. **Banned Movies** and **🔊 Sounds** moved into Settings. The People tab has a ✏️ Name changes button.
- Smaller boxes for small things (numbers, commands) all over.

## v1.11.4: the starting point
Everything up to 1.11.4: the battle royal with 18 maps, the 🎡 Wheel (Wheel of Names replacement), Discord movie picks, Letterboxd, luck, giveaways, chat battles, stats and full results.
Patch notes start here: every latest release from now on gets a list of everything that changed since the one before.

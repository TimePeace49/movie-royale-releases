# Changelog

What changed in each version of Movie Royal. Newest first.

## 1.28.0 (test build)
- **🔀 Linked wheel spots:** in a spot's ⚙, pick **When this spot wins** → another wheel or a battle.
  - **Another wheel:** that wheel comes on stream and spins by itself. Once it has its winner, Movie Royal comes back to the wheel you started on.
  - **A battle:** it comes on stream and starts by itself (or untick that and press START yourself). Once it has a winner (and a movie winner has claimed it), it comes back to the wheel.
  - With a round timer it happens when the timer runs out on that spot; with no round timer, as soon as the wheel lands there. Linked spots show 🔀 → in the spot list. Try it with 🧪 Test → 🎯 Land on a spot.
- **🛡️ Backup Bots: Twitch info:** the backup app has its own 💜 Twitch box (Client ID + Client Secret) to fill in when you set it up. It's used to ask Twitch whether each streamer is live, for watch streaks. One set works for every streamer.

## 1.27.1 (test build)
- **🔥 Movie Royal's own watch streaks:** someone watched a stream if they chatted or showed up in the viewer list at some point while you were live. Their streak is how many of your streams in a row they watched, and missing one starts it over. Every stream is kept on its own (ending and starting again later is a new stream).
  - The viewer profile shows the streak, how many streams they've watched in all, Twitch's own streak number, and their last 10 streams (✅ watched / ❌ missed).
- **🛡️ Movie Royal Backup Bots now keeps chat stats while Movie Royal is closed:** it reads each streamer's Twitch chat, live or offline (no Twitch sign-in needed), and hands it to their Movie Royal when it opens.
  - The viewer profiles get the chats (this month, this year, all time), the chat log, sub months and watch streaks, with the real times. Movie Royal skips anything it already counted.
  - While a streamer is live, it also notes who's in the viewer list, for watch streaks. It checks "is it live?" with Twitch itself, using the Twitch app keys from Movie Royal on the same PC.
  - It does this for each bot it runs (yours and your friends'), and each streamer's stats only go to their own Movie Royal.
  - Watch time still only counts while Movie Royal is open (that needs the Twitch sign-in).

## 1.27.0 (test build)
- **🛡️ Movie Royal Backup Bots:** a new small app that comes with Movie Royal (Start menu → Movie Royal Backup Bots). It runs Discord bots as a backup: yours, and any friend's who sends you their bot token.
  - It starts with Windows, hidden in the tray by the clock (you can turn that off in its window or the tray menu). Closing its window keeps it running.
  - Every minute it checks each streamer's 24/7 cloud bot. If the cloud bot has errors (3 failed checks in a row, or it posts a problem in #movie-royal-debug), the backup takes over and answers /suggest, /swap, /mymovies, /list and /linktwitch with the same rules. It keeps doing that until the streamer presses **☁️ Switch back to the cloud** in Movie Royal.
  - If a streamer doesn't use the cloud bot, it answers whenever their Movie Royal is closed. While their Movie Royal is open, Movie Royal answers itself.
  - Movie Royal and the backup talk through a hidden `#movie-royal-sync` channel only the bot can see, so no router setup is needed. Picks the backup takes come into Movie Royal the next time it opens.
  - 🧪 **Test: take over now** in the backup app tries it on purpose.
- Movie Royal → Settings → Discord & picks → **🛡️ Backup bot server**: whether a backup is watching your bot, **☁️ Switch back to the cloud**, and **📋 Copy my bot token** (to give a friend running your backup). A banner at the bottom shows when a backup is running your bot.
- No "Discord stops when you close" warning when a backup is watching your bot.
- 🧪 Test tab and ✅ Checklist: 🛡️ Check the backup link.
- The 24/7 cloud bot has a small update (a deeper health check for the backup). **Update the 24/7 bot once** (the app asks you).

## 1.26.1 (test build)
- **🎥 OBS test now mutes your mic:** if the mic box in Settings → 🎥 OBS was empty ("Mic/Aux" is only a grey hint, not a saved name), the test skipped the mic and only hid the camera. Now:
  - An empty mic box mutes **every mic** OBS has (never your desktop or game sound). An empty camera box hides every camera.
  - The name works in any upper/lower case. If OBS has no source with that name, it tells you, and lists the names OBS does have.
  - It only turns back on what it turned off (a mic that was already muted stays muted).
  - When it's done it says exactly which mic and camera it switched, so you know it worked.
- Doomsday finds your mic and camera the same way.

## 1.26.0 (latest release)
- **⚠️ on the 🧪 Test tab** when something goes wrong: a red number shows how many new errors there are. It goes away once you open ⚠️ Errors.
- **📺 Preview window:** it comes back by itself when you go back to the 🧪 Test tab. The Test tab has 📺 Show / Hide the preview window, and **⧉ Pop out to another monitor**, which opens it in its own window you can drag anywhere (no sound; Movie Royal already plays it). The preview's top bar has ⧉ Pop out too. Close the popped-out window to bring it back.
- **Ctrl+H** turns help mode on and off.
- **⌨️ Key binds** (Settings → ⌨️ Key binds): keyboard shortcuts for every tab, sorted by tab. A few: Space spins the wheel, R respins, ↑ / ↓ move it, Ctrl+Z undoes, G starts the battle, Y / P accept / pass the winner, N next round, 1–0 fire powers, Alt+1 to Alt+0 jump between tabs. Click any key to change it (Esc keeps it, Backspace turns it off). Changes save right away.
  - Each key only works on its own tab, and never while you're typing in a box (chat, names, titles…). Only the Ctrl / Alt ones work everywhere.
- ✅ Checklist: key binds and the pop-out preview.

## 1.25.2 (test build)
- **✅ Checklist is easier to read:** every item is its own box with a colored edge (red = needs fixing, yellow = optional, green = working, purple = still to try), and its button sits right next to it, so it's easy to tell which button goes with which line.

## 1.25.1 (test build)
- **Tests show the right screen:** every test now puts the right thing on stream, so the 📺 preview window shows it. Battle tests (the winner claiming with "I'm here", !sitout, !imback, !join, !mymovies, chat joining, chaos, practice battles) show the **battle**. Wheel tests (up, down, !respin, !myspins, wheel redeems, money pop-ups) show the **wheel**. Before, "I'm here" could show the wheel if the wheel was the last thing on stream.
- **No preview window on the 🎡 Wheel tab** while the wheel is on stream (you can already see it there). 💬 Pretend chat stays open. If you test a battle thing from the Wheel tab, the preview pops up to show the battle.

## 1.25.0 (latest release)
- **❓ Help mode explains everything:** press ❓, then click any button, box, checkbox or menu on any tab (or in a pop-up window). A window explains exactly what that one thing does, in plain words, with the matching part of the Help tab underneath. Nothing gets clicked for real. Help mode stays on so you can click the next thing; Esc or ❓ stops it.
- **💬 Pretend chat window** (🧪 Test tab): type as any viewer. It stays open on every tab (drag it anywhere) and shows Movie Royal's replies.
  - **✋ Winner types in chat** now always works: if no movie has won (or a wild spot won), Movie Royal makes a pretend winner from your Discord movies that changes nothing. The window opens as the winner; type anything and the green ✅ Accept / ⏭️ Pass bar shows.
  - Buttons for **up** / **down** after a ↕️ Move redeem, !respin, !myspins, !mymovies, !sitout, !imback, !join, plus 🎡 Respin / Move / Up / Down redeems as that viewer.
- Pretend wheel redeems work even before the reward exists on Twitch.
- ✅ Checklist: new Try-its for ↕️ Move a spot (redeem, then type up / down) and 💬 Pretend chat.
- Help tab: a few topics were stuck together (the Wheel, History and the testing topics). Each one is its own part now, so searching finds the right one.

## 1.24.0 (latest release)
- **❓ Help mode:** press ❓ at the top, then click any button or option. The ❓ Help tab opens at the part that explains it. Press Esc to stop.
- **🔢 Number battles:** "🔢 Numbers" is now a tab next to Text in the ➕ New battle window. In the 🎬 Movie Pool tab you can change the range later ("Update the numbers": numbers you keep keep their odds) or click a number to edit it.
- **💜 Channel points menu stays clean:** Movie Royal's rewards that can't be used right now (power-ups, chaos, wheel rewards) are switched OFF, so viewers don't see them at all. Before, they showed up as paused.
- **🎡 Respin, ⬆️ Up and ⬇️ Down rewards** (Wheel → 🌐 All wheels → 💜 Channel point rewards): one button makes them. If they already exist, Movie Royal remembers the price, deletes them and makes them again so it controls them, at the same price. Ones made by hand on Twitch can only be deleted on Twitch: it lists them with their price and a link to do it.
- **⚠️ Errors (plain words):** each error has a **📋 Copy for Claude** button.
- 🧪 Test tab: removed the "Why is nobody on the cliff?" button and its box from the Discord tests, and the 📌 Pinned messages box at the top (the pin test is still in the list below).
- ✅ Checklist: Try-its for help mode, changing a number battle's numbers, and the Respin / Up / Down rewards.

## 1.23.0 (test build)
- **🔴 Pretend I'm live** (🧪 Test tab): Movie Royal acts like you just went live (streamer respins refill, voided spots come back, movie count starts over, it shows LIVE (pretend)). It's only inside Movie Royal: Twitch, Discord and your channel point rewards don't change.
- **📌 Movie Royal's pinned messages stay on top** in Discord: if someone pins something else, the bot moves its message back to the top of the pins by itself (and cleans up the "pinned a message" notice).
- **↗ Go to the Battle / Wheel tab** button on the test pop-up window, depending on what's on stream.
- **⬇️ Update progress bar:** updating from inside Movie Royal shows a download bar (%, MB). Then the installer shows its own progress bar instead of working invisibly, and Movie Royal opens again by itself.
- **🤖 Discord self-test** (🧪 Test tab, and the checklist): checks the bot, the channels, the pinned messages (and that they're on top), the slash commands, that normal members can't see the debug channel and mods can't type in it, and the 24/7 bot. It also runs the /suggest and /mymovies code with a pretend user (nothing gets added). The results go to #movie-royal-debug too.

## 1.22.2 (test build)
- **✋ Accept / Pass shows up on every tab:** when a movie winner types in chat, a green bar pops up at the top of whatever tab you're on, with **✅ Accept winner** and **⏭️ Pass**. The claim counts once you press one. Before, the buttons were only on the Battle tab's winner card, so the checklist test looked like it did nothing.

## 1.22.1 (test build)
- **Fixed: an error in the 🎬 Movie Pool tab** when it refreshed while you were typing in a number box (like the odds). Found in your ⚠️ Errors report.

## 1.22.0 (test build)
- **🐞 Discord debug channel:** the bot makes a hidden `#movie-royal-debug` channel that only mods and the server owner can see. Whenever something goes wrong with Discord (a command failing, the bot losing its connection, the 24/7 bot having a problem), it posts there: what went wrong in plain words, plus the tech details for fixing it.
  - Nobody but the bot can type in it. A pinned message (and the channel description at the top) says not to type or edit anything.
  - Settings → Discord: switch it on or off, "Make / fix the debug channel", and an option to post every Movie Royal problem there.
  - 🧪 Test tab and ✅ Checklist: "Send a test problem".
  - The 24/7 bot posts its problems there too. **Update the 24/7 bot once** (the app asks you).

## 1.21.8 (test build)
- **✅ Checklist: "Try it" on everything you can test offline.** You don't need to be live or have anyone in chat:
  - someone typing in chat to join, a winner claiming (✅ Accept / ⏭️ Pass), `!sitout` / `!imback`
  - a chaos event hitting the battle, a number battle
  - the wheel spinning and the round timer ending, a channel point respin on the wheel, a bits pop-up, OBS
- **Claims work on test battles too,** and they change nothing: no pin in chat, no luck change, nothing in history.

## 1.21.7 (test build)
- **Tabs stay put when you scroll:** the main tabs never move. The sub tabs and tool bars stay at the top while the rest scrolls: 🧪 Tests / ✅ Checklist / ⚠️ Errors, the wheel's ✏️ Spots / ⚙️ Wheel settings…, 📜 History's tabs and search, and 👥 People's add and 🔄 Refresh bar.

## 1.21.6 (test build)
- **🧪 The Test tab remembers where you were:** Tests, Checklist or Errors, and "plain words" or "for Claude" on the Errors tab, even after you close Movie Royal.

## 1.21.5 (test build)
- **✅ Checklist "Try it" buttons stay on the checklist:** they no longer jump to the 🧪 Tests page. The pop-up window shows what happens on stream.

## 1.21.4 (test build)
- **📗 Letterboxd "HTTP 403":** Letterboxd turns away plain requests for your full watched list. Movie Royal now reads it like a real browser does, in the background. (Your newest watched movies always came in anyway, from your Letterboxd feed.)
- **⚠️ Errors** no longer fills up with a harmless "DeprecationWarning" from the Discord bot every time the app opens.

## 1.21.3 (test build)
- **Removed the 💩 Letterboxd's worst 500 battle** (Letterboxd wouldn't let Movie Royal read that page). A worst-500 battle you already made stays as a normal movie battle; delete it in the 🎬 Movie Pool tab if you don't want it.

## 1.21.2 (test build)
- **🎯 FIXED: balls not coming back on the cliff after a battle.** Found with the new error report. After the first battle, the Twitch pictures (yours and Kirb's) are already loaded. The game screen tried to draw a ball before it knew how big the ball was, crashed, and left the cliff empty. Battles with no Twitch pictures (like all my tests) never hit it. It's fixed, and balls with odd sizes can't crash it either.

## 1.21.1 (test build)
- **💩 Fixed: Letterboxd said 403** when making the worst 500 battle. Letterboxd turns away plain requests for its film pages, so Movie Royal now reads them like a real browser does (hidden in the background), page by page (`/page/2/`, `/page/3/`…).
- **🔢 Number battles:** + New battle → 🔢 Pick a number, from 1 to whatever you want (up to 1,000). Every ball is a number. There's a 🔢 button in the Test tab too.

## 1.21.0 (test build)
- **⚠️ Errors tab** (🧪 Test tab → ⚠️ Errors): a history of everything that went wrong in Movie Royal, kept even after you close it. Covers Twitch, Discord, the 24/7 bot, Letterboxd, OBS, the game screen and the control panel. A red number shows how many are new.
  - **🗣️ In plain words:** what went wrong and what to do about it.
  - **🛠️ For Claude (tech):** a full report with no passwords or tokens. Press 📋 Copy and paste it to Claude.

## 1.20.4 (test build)
- **🔍 "Why is nobody on the cliff?"** (Test tab → Discord battle tests) shows everything that decides who's on the cliff:
  - which battle is playing, and whether it's stuck waiting for "Next round"
  - how many game screens are open
  - what would be on the cliff right now, and what was last sent to the game screens
  - every person: chatting or not, how many movies are in, won this week, out tonight or paused
  - any errors
  - "📋 Copy this for Claude" copies it all to send over.
- **💬 Pretend people type in chat:** a button for each person with Discord movies. Press one and their movies join, just like when they really type in Twitch chat.
- "Put everyone on the cliff" and "Reset cooldowns" also finish a battle that was left waiting for "Next round", and switch to the Discord movies battle.
- **Errors on the game screen now show up in the app**, so problems that only happen on your computer can be found.

## 1.20.3 (test build)
- **🧪 "Put everyone on the cliff"** (Test tab → Discord battle tests) brings in all the wild spots too.

## 1.20.2 (test build)
- **✅ Checklist ticks itself once something is fixed:** it updates the moment anything changes, and checks the 24/7 bot again when you open it. Letterboxd counts as ✅ as soon as your watched movies are read, it shows when it last updated, and it has a 🔄 Update now button.
- **📗 Letterboxd updates every time Movie Royal opens** (your whole profile), and a message tells you when it's done.

## 1.20.1 (test build)
- **💩 Letterboxd's worst 500 is English movies only:** movies in other languages are skipped and the next ones on Letterboxd's list fill in, so you still get 500. You can switch it off with the "English-language movies only" box in the 🎬 Movie Pool tab.

## 1.20.0 (test build)
- **💩 New battle: Letterboxd’s worst 500.** The 500 lowest rated movies on Letterboxd as a battle pool (+ New battle → 💩 Make it). Press **🔄 Update from Letterboxd** in the 🎬 Movie Pool tab any time: new films come in, ones that dropped off leave, and your odds and pauses stay. You can point it at any other Letterboxd page or list too.
- **🧪 Test tab → ⚔️ Discord battle tests:** reset everyone's cooldowns, put everyone on the cliff, and run a test Discord battle with the real movies that changes nothing (no winner, no luck, no cooldowns). Then press Next round and see if the balls come back.
- **📌 Pinned messages** has its own card in the Test tab.
- **✅ Checklist:** a second tab in the Test tab. It shows what's set up (Twitch, chat, Discord, the 24/7 bot, TMDB, Letterboxd, the game screen) and a list of things to try once, with "Try it" buttons. Your ticks are remembered.
- **The main tabs always stay at the top:** the page can't scroll them away any more.

## 1.19.1 (test build)
- **📺 The test screen pop-up resizes properly:** grab any bottom corner (the gold triangles) or the left, right or bottom edge and drag. It remembers its size.

## 1.19.0 (test build)
- **☁️ 24/7 bot fix:** Movie Royal now checks that Discord is really sending `/suggest`, `/linktwitch` and the other commands to the 24/7 bot, and plugs it back in by itself if not. Before, if that connection never took (or came loose), the bot only answered while Movie Royal was open. It checks when the app opens, every 10 minutes, and when you close it. Closing asks first if it still can't fix it. New "🔍 Check it works when I'm closed" button in Settings → Discord, and "☁️ Check the 24/7 Discord bot" in the 🧪 Test tab.
- **Fixed: balls not coming back on the cliff after a battle:** every game screen (OBS and the app) now checks in with Movie Royal every few seconds. If one missed the new pieces or got stuck on the last battle, it gets them again by itself.
- **❤️ Hidden health:** every ball can only take so many hard hits (bumps from bigger balls, dash hits, comets, explosions…). Run out and it's K.O.! Bigger balls are tougher. Nobody sees a health bar; a ball just flashes red when it gets hurt. Luck can still dodge a K.O., and fair odds still decide the winner.
- **📌 The pinned movie says which one it is:** "1st movie tonight", "2nd movie tonight"… (a pass doesn't count).
- **📜 `!moviesroyal` lists the new commands** (`!sitout`, `!imback`, claiming your movie) and gets split into a few messages when it's too long for Twitch. The Discord help message mentions them too. Test tab: "📜 Post the command list in chat".

## 1.18.0 (test build)
- **🔗 Links on wheel spots:** give a spot a web page (a game, a site…) in its ⚙. When it wins, a "🔗 Open" button shows on the result and in the round timer pop-up. On stream, the card shows the site name.
- **✋ You decide on claims:** when the movie winner types in chat, the claim timer stops and you press **✅ Accept winner** or **⏭️ Pass (not tonight)**. A pass puts their movie back in the battle, and they keep their luck and aren't benched for the week. You can switch this off in Settings → Twitch.
- **📌 Claimed movies get pinned in Twitch chat:** title, year and who picked it. You can switch it off in Settings → Twitch.
- **🛌 `!sitout` / `!imback` in chat:** viewers who can't stay up take their movies out of tonight's battles, or put them back. Both are in `!moviesroyal`, and you can rename them in Settings → Twitch.
- **🧪 Test tab:** new "Movie winner" card: pretend the winner typed in chat, test pinning, and try !sitout / !imback.

## 1.17.0 (test build)
- **☁️ Closing Movie Royal while the 24/7 bot is off** now asks first, because the Discord bot stops too. Paste your Cloudflare token and press "Turn on 24/7, then close", or close anyway (there's a "don't ask again" box).
- **💜 Channel points:** Movie Royal's rewards stay paused unless you're live (or a battle is going) and they can be used right now. If a reward with one of Movie Royal's names was made by hand on Twitch, Movie Royal can't pause it, so a warning tells you which one to delete and make again from the app.
- **🐀 Plague Town:** infected balls are much easier to spot: they turn green with spots, get a bright pulsing ring, a red ring showing the time they have left, and a 🤢.
- **Fixed: balls not coming back on the battle screen** after a battle sometimes (it could stay stuck on the last battle).
- **Battle tab:** ↺ Reset sits right after 🪟 Pop out again (all on one line).
- **🎡 👁️ / 🙈 on every wheel spot** to make it invisible (off the wheel, still in your list) or show it again. "👁️ Show all" brings every one back.
- **📤 Export / 📥 Import wheels and battles:** send a wheel (spots, rules, looks, settings, your pictures and sounds) or a battle to another streamer as a file. They open it with 📥 Import and it shows up as a new wheel or battle.
- **🎡 2 new spot rules:**
  - **⏱️🔢 Timer + countdown:** a timer spot with a countdown. Every time it wins, one comes off; at 0 it goes invisible.
  - **⏱️🏆 Timer + max wins a night:** a timer spot that can only win so many times a stream, then it's invisible until next stream.
- **🪟 Pop out** on the Wheel tab opens the wheel in its own window.
- **⏱️ Round timer pop-up** shows the spot the wheel is on right now, and the 🏆 winner when time runs out.

## 1.16.0 (test build)
- **🎟️ Streamer respin** button under the wheel: you get 3 each stream (change it in 🌐 All wheels). It shows how many are left and turns gray when they're used up. They fill back up when you go live (right-click it to refill early).
- **↕️ Drag spots to sort them:** on the wheel's ✏️ Spots list, grab the ⠿ on the left of a spot and drop it where you want it, like sorting a YouTube playlist. The ▲ ▼ arrows are gone.
- **Fixed: 📥 Import and 📁➕ New folder on the Wheel tab didn't do anything** in the app. The timeout / ban boxes in chat had the same problem and work now too.
- **🎟️ Reset wild spots** button on the Battle tab: puts every wild spot back in, even if one already won this week.
- **Nothing gets deleted when a movie wins:** when a wild spot wins, the other wild spots are just hidden until the new week. A person's other movies are hidden the same way, as before.
- **▶ puts a hidden movie straight back in:** it skips the "won this week" cooldown and the chat check. It shows "▶ put back by you".
- **💜 Channel point rewards only turn on when they can be used:** everything Movie Royal made on Twitch is paused unless it works right now. Battle chaos only while the battle is on stream, wheel rewards only while the wheel is on stream, ball power-ups only in a fun chat battle. Everything gets paused when you close Movie Royal.

## 1.15.2 (test build)
- **🗺️ Maps are in A to Z order** in every map menu.

## 1.15.1 (test build)
- **📺 See your tests:** every test in the 🧪 Test tab (Doomsday preview, wheel landings, pop-ups, practice battles…) now pops up a little window showing what's on stream right now. Drag it by its top bar, resize it from the bottom-right corner, ⤢ makes it big, ✕ closes it. There's also a "📺 Show the stream screen" button at the top of the Test tab.

## 1.15.0 (test build)
- **🦸 New map: Hero City.** A rooftop fight above the city at night. Villains made up for Movie Royal attack:
  - 🤖 Mecha Brute's giant fist smashes down: everyone near it goes flying and the roof cracks.
  - 🛸 The Laser Drone locks on and zaps.
  - 🦇 Gloom swoops in, grabs a ball and throws it off the roof.
  - Map power: 🦹 Villain Team-Up.
- **🗺️ Chaos fits the map:** on maps where the ground never breaks (Royal Rumble, Blast Zone, Plague Town, Battlefield), Edge Collapse and Lightning never happen. Their channel point rewards get paused on Twitch while one of those maps is up, and unpaused when it's not.
- **🎉 Fun mode for chat battles** (🎲 Chat battle tab):
  - **Power-ups with channel points:** chat can buy their own ball a 🛡️ Shield (saves them once), 💪 Mega ball (big and heavy) or ⚡ Turbo (faster, harder hits).
  - The power-up rewards are only on in Twitch while a chat battle with power-ups is playing; the rest of the time they're paused. "✨ Add power-up rewards to Twitch" makes them.
  - **Wacky effects:** super bouncy, low gravity, random tiny/giant sizes, big balls, chaos rain (a random chaos event every few seconds), disco lights.
  - With fun mode on, the fight decides the winner (not the odds).
- **🧪 Test tab:** pretend a ball power-up.
- **✕ on the winner pop-up:** close the winning movie card on the game screen any time (or press "✕ Hide the pop-up on stream" on the Battle tab's winner card).

## 1.14.1
- **Fixed: nothing worked after updating to 1.13.6** (blank battle screen, tabs not responding).

## 1.14.0 (test build)
- **🐀 New map: Plague Town.**
  - A walled medieval town, seen straight down from above.
  - Rats run out of the sewer grates and bite. A bitten ball is infected, and infected balls pass it on to anyone they bump into.
  - Infected balls die after a few seconds unless luck pulls them through. Healthy balls run from the rats and the sick.
  - Houses block everyone, the ground never breaks, and the plague bell tolls.
  - Map power: 🐀 Rat Swarm.
- **⚔️ New map: Battlefield.**
  - Every ball starts on one side. An army that can't be hurt or stopped comes from the other.
  - Archers rain arrows on the back rows, while knights and cavalry march in together.
  - When the knights reach the front they crush it, and the cavalry rides down both sides and hits the flanks.
  - The ground never breaks, but you can be pushed off the edge.
  - Map power: 🐎 Royal Charge.
- **🔊 Volume sliders on the 🎡 Wheel tab** (sounds and music), next to a sound on/off button.
- **⏸ / ▶ Pause spots on the wheel:** every spot on the ✏️ Spots list has a ⏸ button that takes it off the wheel but keeps it in the list. ▶ puts it back on. "⏸ Pause this spot" after a landing does the same. Spots the void takes stay in the list too, with ▶ to bring them back. "Take the winner off the wheel" in Wheel settings pauses the winner the same way.
- **🕳️ You can grow or shrink the void yourself** with its + / −. Chat still can only change it with money (never with channel points).
- Fart Farm now has real moo, stampede, UFO and beam sounds, and shows its right name in the map menus.
- Fixed: Dune Sea did extra work while pieces were landing before the fight.

## 1.13.7 (test build)
- **24/7 bot pop-up only when it's needed:** when Movie Royal opens, it only asks you to update the Cloudflare bot if that bot is actually older than the one in this version. Once you've updated it, the pop-up stays away until a future version changes the bot again. "Don't remind me again" also only lasts until the next bot update.

## 1.13.6 (test build)
- **No more 24/7 bot pop-up** when Movie Royal opens. If the bot needs an update, the 🔄 Update button is in Settings → Discord.

## 1.13.5 (test build)
- **☁️ 24/7 bot answers faster:** `/linktwitch` replies right away and saves the link right after, and every command does one less lookup before answering. If something still goes wrong, the bot replies with the reason instead of "The application did not respond". (The app asks you to update the bot again.)

## 1.13.4
- **☁️ Update reminder:** if you use the 24/7 Discord bot and it's older than this version, Movie Royal asks you to update it every time it opens (paste your Cloudflare token, one click), until it's done.

## 1.13.3 (test build)
- **🎟️ Free replacement pick:** if someone's movie gets watched outside a battle (you mark it ✅, or it shows up on your Letterboxd), Movie Royal tells them in the Discord channel that they can pick a new movie. That one pick works any time, even with picks closed or all their picks used, and even if they still have other movies in the pool. It shows in the People tab and in `/mymovies`.
- **🍀 Luck cooldown:** people whose movie got watched this week don't build luck until the new week (from losing battles or from calling the winner).
- **🍀 LUCKY! is rare now:** only pieces that actually have luck can get lucky, and only once every 6–16 seconds on the whole map (longer in big battles). The same goes for "DODGED!" and slipping out of a UFO beam. No more LUCKY spam in 1000-ball battles.
- **⚖️ Big balls hit harder:** bigger pieces knock smaller ones much further and barely bounce themselves.
- **💨 Fart Farm rebuilt:**
  - Big cows stampede in from the edge of the island (with a dust warning first), trampling pieces flat and sending them flying.
  - They let rip big green farts that blast pieces behind them.
  - Cows only show on solid ground (no more cows running through the sky).
  - UFOs are bigger and stay on screen, with a wide beam that pulls pieces spinning up into the saucer.
- **☁️ 24/7 Discord bot fixes:**
  - The bot always answers now. Before, `/linktwitch` (and other commands) could show "The application did not respond".
  - It writes much less to Cloudflare, so it stays under the free plan's daily limit.
  - When the 24/7 bot needs an update, Settings → Discord shows an **Update** button (paste your Cloudflare token).
- Practice rounds hide the wheel so the battle shows on stream.

## 1.13.2 (test build)
- **🎡 Spots list:** the Rule column is now a dropdown (⏱️ Timer, ⚡ Auto, 🔢 Countdown), so you can see and change each spot's rule at a glance. Countdown spots show how many are left next to it. The words that show on stream when it lands moved into ⚙ on the spot.
- **🧪 Test tab → 🎡 Wheel tests:**
  - Land on any spot you pick.
  - Pretend channel point redeems: respin, move, up, down, grow, shrink.
  - Chat typing up / down / !respin / !myspins, giving saved respins, and two respins at once.
  - Sub, gift sub, bits and donation pop-ups.
  - Round timer buttons and undo.
  - Doomsday screen preview, and an OBS test that turns your mic and camera off for 5 seconds and back on.
  - Pretend you went live / offline, and a test alert.

## 1.13.1 (test build)
- **👥 People tab:**
  - Everyone who linked their Twitch in Discord shows up, even before they pick a movie.
  - New 🔄 Refresh button grabs new Discord picks and Twitch links right away.
- **🎡 Wheel tab:**
  - Drag the line between the spot list and the wheel to make either side bigger. Double-click the line to reset it.
  - The round timer pop-up can be resized: drag its bottom-right corner and the numbers grow with it. It remembers its size.
- **Fixes:**
  - ⏸ / ▶ in the Battle tab list now updates right away, so paused movies can be put back in.
  - Movies could stop showing up on the cliff after a battle had finished (for example after a practice round or a Kirb's Pick win, then picking another battle or reopening the game window). The cliff now resets and shows everyone who's chatting.
  - Someone listed twice (added by you and from Discord) now gets all their movies on the cliff from their first chat message.

## 1.13.0 (test build)
- **🎡 Wheel round timer:**
  - Starts when the first spin lands (2 minutes by default, set minutes or seconds per wheel).
  - Keep spinning with respins and moves. When time runs out, the spot the wheel is on wins ("The wheel has spoken").
  - ⚡ Auto and 🔢 countdown spots pause it until you spin again.
  - A big timer pop-up on the left with Stop / Start, ±30 seconds and End now. You can drag it around.
- **Spot types are now ⏱️ timer, ⚡ auto and 🔢 countdown** (a dropdown). Old normal spots became timer spots. Countdown spots show how many are left in ( ) on the wheel, auto spots show (auto).
- **After a landing:** a 🔁 respin button, plus knock buttons on countdown spots.
- **🔁 Respins at the same time:** the first one spins, everyone else keeps theirs as a saved respin. You pick how many seconds counts as "the same time".
- **📜 Plain wheel:** turn rules off for a wheel that just spins.
- **📁 Folders** for your wheels: pick a folder, then the wheel in it.
- **📈 + / −** now grows or shrinks a spot by 10% of the whole wheel (the other spots make room). You can change the %.
- **🕳️ Void changes:**
  - Only money (subs, gift subs, bits, donations, or ones you log by hand) can grow or shrink the void.
  - If the void lands on itself it grows and respins. After the number of landings you pick, it has swallowed the wheel.
  - New optional **☠️ [your name] will return for Doomsday**: a full-screen message, mic and camera off, and the stream ends 15 seconds later.
  - You can bring back 1 voided spot per month yourself.
- **🎥 OBS connection** (Settings → 🎥 OBS, and a new setup guide step) for Doomsday.
- **⏪ Undo / Go back…** under the wheel takes back the last step or several.
- **↕️ Move a spot** channel point reward: the viewer types up or down in chat after redeeming.
- **📜 Wheel history** now shows channel point redeems, grows, voids, undos and the final winner, with filter buttons.
- **🔊 A sound for each spot** (⚙ on a spot) that plays when the wheel lands there.
- **📥 Wheel of Names import** brings pictures, the middle picture, background, colors, title, spin time, confetti, sounds on/off and remove-winner along.
- The respin symbol is now 🔁. The gauntlet is gone; 🕳️ is the void and "bring back a voided spot".

## 1.12.1 (test build)
- **🔴 NEW / 🔵 UPDATED map tags** in the map menus (Battle tab, Test tab and Settings):
  - NEW means you've never played that map on stream.
  - UPDATED means the map changed since you last played it on stream.
  - Tags only go away after a battle on that map while you're live. Practice rounds and offline battles don't count.
- **💬 Chat: pop out any of the 3 parts.** Chat, Alerts and Find someone each have their own ⧉ Pop out, plus ⧉ All 3 for everything in one window, so you can spread them over your screens.
- **🔊 Sounds moved into Settings** (Settings → 🔊 Sounds).

## 1.12.0 (test build)
- **💬 New Chat tab:**
  - Your Twitch chat with badges and emotes: Twitch, 7TV, BTTV and FFZ.
  - An alerts list: subs, gift subs, bits, raids, follows, channel point redemptions, watch streaks and donations.
  - Find someone by name (click to copy) or search old chat. Chat is saved per day.
  - Point at a message to delete it, time out, ban or open the person's profile, and send messages from the box at the bottom.
  - ⧉ Pop out opens chat in its own window for another screen.
  - The battle claim pop-up shows emotes too.
- **👤 Viewer profiles: double-click anyone's name.** Shows:
  - Twitch picture and link, account date, follow date, sub months, watch streak, watch time.
  - Chats this stream, month, year and all time.
  - Discord name and movies, battle stats and wins.
  - Respins: had at the start of the stream, used this stream, have now, when they were used, with give / take buttons.
  - Their chat log, plus timeout and ban buttons.
- **Sign in with Twitch again once** to turn on deleting messages, timeouts, bans and watch time. Movie Royal reminds you after updating.
- **Updates:**
  - Only **latest releases** install by default.
  - New 🧪 "Also install test builds" option.
  - 🕰️ Run any older version that's still on GitHub.
  - 📝 Patch notes tab in Settings.
  - If an update adds something to set up, Movie Royal asks once.
  - Movie Royal now reliably opens again after an update.
- **💡 Ideas doc** linked in the pinned Discord message (Settings → Discord & picks). The pin updates by itself.
- **Wheel tab:**
  - The wheel/tab bar on the left stays put when you scroll.
  - The right side never scrolls: the wheel shrinks to fit.
  - Pop-ups only show in the Wheel tab, with a 🎁 count on the Wheel button.
- **Tabs:** **Pool** is now **🎬 Movie Pool**. **Bans** moved into **Settings → 🚫 Banned Movies**. The People tab has a ✏️ Name changes button.
- **Defaults:** best of 3/5/7/9 no longer starts the next round by itself (turn it on in Settings → Game). Chat map votes last 120 seconds.
- **Smaller boxes for small things** (numbers, commands) all over.

## 1.11.4
- The little battle preview window in the corner of the other tabs is gone. The battle shows only in the Battle tab.

## 1.11.3
- **The tab you're on picks what's on stream:**
  - Battle tab = the battle, Wheel tab = the wheel. Other tabs leave it as it is.
  - Starting a battle from anywhere also switches the stream back to the battle.
  - In the Wheel tab you can still hide the wheel with 🙈 Hide the wheel on stream.

## 1.11.2
- **Refunds are all yours now:** the app never refunds, cancels or completes channel point redemptions, and never changes your rewards' queue setting. Redemptions wait in your Twitch reward queue for you. The 💸 refund spot type is gone (old ones become normal spots).

## 1.11.1
- **Your 3 spins per stream are gone from the wheel**: they're a battle thing.
- **Grow / shrink with channel points:** viewers no longer type a spot. Each redemption pops up a box and you pick the spot (type it in, or press + / − on the spot). Older grow/shrink rewards on Twitch stop asking for text by themselves.
- **New symbols:** respins use 🕳️, and the VOID spot is now a forged golden gauntlet (an original design: plate armor, rivets, engraved panels).

## 1.11.0
- **🕳️ Void spot** (optional for each wheel, off by default):
  - If the wheel lands on VOID, it respins by itself, and whatever it lands on next is gone for the rest of the stream.
  - Voided spots come back on their own next stream. You can bring one back by hand, or someone can save it with a sub, gift sub, bits or a donation (♻️ Undo void in the pop-up).
- **Pop-ups for subs, gift subs, bits and donations:**
  - Type the spot's name to 📈 grow it or 📉 shrink it, give 🎟️ respins, or ♻️ undo a void.
  - Choices you've turned off for that wheel don't show. Undo void only shows once something has been voided.
  - Pop-ups are smaller, show 2 at a time, and can be tucked away.
- **📉 Shrink a spot:** from pop-ups or a "Wheel: Shrink a spot" channel point reward. Off by default. A spot can never shrink away to nothing. The + / − buttons on every spot stay.
- **Channel point grow fixed and made smarter:**
  - Reward names match even with different capital letters.
  - Viewers can type part of a spot's name or its number.
  - If nothing matches, you get a pop-up to pick the spot instead of the redemption failing.
  - New list of the last redemptions the app saw (Wheel → 🌐 All wheels) so you can see what happened.
- **⚙️ Wheel settings tab, per wheel:**
  - Spinning: spin time, spin speed, tick sound, confetti, remove winner.
  - On stream: recent spins, the % size, chat messages.
  - Void spot settings.
  - Which channel point actions work on that wheel, and whether saved respins work.
  - Which pop-ups show and which choices they offer.
  - Grow size, looks, and the wheel's own sounds.
- **🌐 All wheels tab:** your spins per stream, chat commands, reward names and costs, donation connection and a test donation.
- **💵 Donations:** connect StreamElements or Streamlabs (Setup guide → Donations, or Settings → Twitch) and tips pop up by themselves while the wheel is on stream.
- **Reward queue:** when your stream ends, wheel/chaos redemptions still waiting in your Twitch reward queue are marked done for you. 💸 refund spots can still refund automatically during the stream (tick "refund by itself").
- `!spins` is now **`!myspins`**, and the wheel commands are listed in `!moviesroyal`.

## 1.11.0
- **🕳️ Void spot** (optional for each wheel, off by default):
  - If the wheel lands on VOID, it respins by itself, and whatever it lands on next is gone for the rest of the stream.
  - A "🕳️ Voided tonight" box on stream shows chat every spot that's been voided.
  - Voided spots come back on their own next stream. You can bring one back by hand, or someone can save it with a sub, gift sub, bits or a donation (♻️ Undo void in the pop-up).
- **Pop-ups for subs, gift subs, bits and donations:**
  - Type the spot's name to 📈 grow it or 📉 shrink it, give 🎟️ respins, or ♻️ undo a void.
  - Choices you've turned off for that wheel don't show. Undo void only shows once something has been voided.
  - Pop-ups are smaller, show 2 at a time, and can be tucked away.
- **📉 Shrink a spot:** from pop-ups or a "Wheel: Shrink a spot" channel point reward. Off by default. A spot can never shrink away to nothing. The + / − buttons on every spot stay.
- **Channel point grow fixed and made smarter:**
  - Reward names match even with different capital letters.
  - Viewers can type part of a spot's name or its number.
  - If nothing matches, you get a pop-up to pick the spot instead of the redemption failing.
  - New list of the last redemptions the app saw (Wheel → 🌐 All wheels) so you can see what happened.
- **⚙️ Wheel settings tab, per wheel:**
  - Spinning: spin time, spin speed, tick sound, confetti, remove winner.
  - On stream: recent spins, the % size, chat messages.
  - Void spot settings.
  - Which channel point actions work on that wheel, and whether saved respins work.
  - Which pop-ups show and which choices they offer.
  - Grow size, looks, and the wheel's own sounds.
- **🌐 All wheels tab:** your spins per stream, chat commands, reward names and costs, donation connection and a test donation.
- **💵 Donations:** connect StreamElements or Streamlabs (Setup guide → Donations, or Settings → Twitch) and tips pop up by themselves while the wheel is on stream.
- **Reward queue:** when your stream ends, wheel/chaos redemptions still waiting in your Twitch reward queue are marked done for you. 💸 refund spots can still refund automatically during the stream (tick "refund by itself").
- `!spins` is now **`!myspins`**, and the wheel commands are listed in `!moviesroyal`.

## 1.10.1
- **⧉ Copying a wheel always copies every spot's rule**, plus its type (timer, countdown…), respin rules, color and picture. Just add and remove spots for the theme.

## 1.10.0
- **🎡 Spot types** (pick one when you add a spot, or change it with ⚙ on any spot):
  - ⏱️ **Timer:** you pick the minutes. When it lands you get a Start timer button, and the countdown shows on stream next to the wheel (pause, +1 min, stop).
  - ⚡ **Auto:** nothing to do. The winner just stays up until you spin again.
  - 🔢 **Countdown:** has to land more than once (you pick how many). Each landing knocks one off, by itself or with a button, and a respin away puts it back. At 0 it leaves the wheel on the next spin.
  - 💸 **Refund points:** refunds every channel point redemption under the number you pick (each one under it, not a total), by itself or with a button.
  - Any spot can block **channel point respins** and/or **saved-spin respins**. Blocked channel point redemptions get their points back automatically, and blocked `!respin`s keep their spin.
- **After it lands:** the whole wheel stays in view, and you get the buttons that fit: use your spin, start the timer, refund points, knock one off. There's also Grow this spot and Take it off the wheel.
- **🎟️ Your spins:** you get 3 each stream (you pick the number), named "<your name>'s spins". They refill every time you go live.
- **🎟️ Saved spins for viewers:** give anyone spins by hand, with a reason. They type `!respin` to use one, and `!spins` to see how many they have. If they don't have any, chat gets a friendly answer. Saved spins never expire, so they carry over to future streams until used. Everything given and used is tracked.
- **📈 Growing spots:** + / − on any spot. Each grow works like Wheel of Names: one grow = the spot added one more time. You can also grow a spot from the result, use the Grow form (with who paid and why), or let viewers do it with a "Wheel: Grow a spot" channel point reward where they type the spot. ↺ Reset all sizes (with undo).
- **💜 Subs, gift subs, bits and donations:** while the wheel is on stream, each one pops up a small box in the bottom-left of the control panel (never over the wheel), where you pick: grow a spot, grow several spots, or give them respins.
  - Gift bombs fold into one box.
  - Log donations with 💵.
  - You set what each one is worth.
  - When the wheel isn't on stream, saved spins can be handed out automatically instead.
- **🎨 Looks:** rim, pointer, line and text colors; light bulbs on or off; font; text size; an emoji or picture in the middle; a picture on any spot; and a stream background (color, picture or video).
- **🔊 Wheel sounds:** Sounds tab → 🎡 Wheel. Upload your own spin, tick, win, move, timer and grow sounds.
- **⧉ New wheel from a copy:** making a new wheel can start from any wheel you have, for themed nights. You can keep or drop the rules, looks, sizes and countdowns.
- **✏️ Name changes:** if someone changes their Twitch name, move everything over: Discord movie links, picks, ball color, history, stats, saved spins and wheel history. It's in the People tab and the Wheel → Spins tab.
- Wheel history and stats now also track grows, refunds, timers, saved spins and your own spins.

## 1.10.0
- **🎡 Spot types** (pick one when you add a spot, or change it with ⚙ on any spot):
  - ⏱️ **Timer:** you pick the minutes. When it lands you get a Start timer button, and the countdown shows on stream next to the wheel (pause, +1 min, stop).
  - ⚡ **Auto:** nothing to do. The winner just stays up until you spin again.
  - 🔢 **Countdown:** has to land more than once (you pick how many). Each landing knocks one off, by itself or with a button, and a respin away puts it back. At 0 it leaves the wheel on the next spin.
  - 💸 **Refund points:** refunds every channel point redemption under the number you pick (each one under it, not a total), by itself or with a button.
  - Any spot can block **channel point respins** and/or **saved-spin respins**. Blocked channel point redemptions get their points back automatically, and blocked `!respin`s keep their spin.
- **After it lands:** the whole wheel stays in view, and you get the buttons that fit: use your spin, start the timer, refund points, knock one off. There's also Grow this spot and Take it off the wheel.
- **🎟️ Your spins:** you get 3 each stream (you pick the number), named "<your name>'s spins". They refill every time you go live.
- **🎟️ Saved spins for viewers:** give anyone spins by hand, with a reason. They type `!respin` to use one, and `!spins` to see how many they have. If they don't have any, chat gets a friendly answer. Saved spins never expire, so they carry over to future streams until used. Everything given and used is tracked.
- **📈 Growing spots:** + / − on any spot. Each grow works like Wheel of Names: one grow = the spot added one more time. You can also grow a spot from the result, use the Grow form (with who paid and why), or let viewers do it with a "Wheel: Grow a spot" channel point reward where they type the spot. ↺ Reset all sizes (with undo).
- **💜 Subs, gift subs, bits and donations:** while the wheel is on stream, each one pops up a small box in the bottom-left of the control panel (never over the wheel), where you pick: grow a spot, grow several spots, or give them respins.
  - Gift bombs fold into one box.
  - Log donations with 💵.
  - You set what each one is worth.
  - When the wheel isn't on stream, saved spins can be handed out automatically instead.
- **🎨 Looks:** rim, pointer, line and text colors; light bulbs on or off; font; text size; an emoji or picture in the middle; a picture on any spot; and a stream background (color, picture or video).
- **🔊 Wheel sounds:** Sounds tab → 🎡 Wheel. Upload your own spin, tick, win, move, timer and grow sounds.
- **⧉ New wheel from a copy:** making a new wheel can start from any wheel you have, for themed nights. You can keep or drop the rules, looks, sizes and countdowns.
- **✏️ Name changes** (Settings → Name changes): if someone changes their Twitch name, type the old and new name and everything moves over: Discord movie links and picks, ball color, chat battle and giveaway entries, history, stats, saved wheel spins and wheel history. Past name changes are listed.
- Wheel history and stats now also track grows, refunds, timers, saved spins and your own spins.

## 1.9.0
- **🎡 New Wheel tab:** a full Wheel of Names replacement for wheel spin nights.
  - **Wheels:** keep as many as you want. Make, copy, rename and delete them, and switch between them.
  - **Spots:** each spot has its own size (2 = twice the chance), color and rule. You can also hide a spot, move it up or down the list, shuffle or sort A–Z, or edit everything as text (one per line, `x3` for size).
  - **Importing from Wheel of Names:** paste a share link or open a `.wheel` / `.json` / `.txt` file. Colors, sizes and hidden entries come along.
  - **On stream:** spins play on the battle screen as a full wheel scene: ticking, confetti, the result with its rule, how big the spot was, who spun it, and the last 5 spins. Click 📺 Show on stream / ⚔️ Back to the battle to switch.
  - **Spinning:** 🎡 Spin, 🔁 Respin, ⬆️ Move up a spot, ⬇️ Move down a spot. Type who's spinning (blank = you), or click the wheel itself to spin.
  - **Channel points:** respin, move up and move down rewards. One button adds them to Twitch, and you choose the names and costs. If several redemptions come in at once they wait their turn. The result can be posted in Twitch chat.
  - **History:** every spin, respin and move is saved with the time, who did it, whether they used channel points (and the cost), where it landed, the spot's size on the wheel at that moment, and what it moved from. It's grouped by stream night, searchable, and you can download it as a CSV.
  - **Stats:** for every spot: final landings, hits on spins and respins, respun away, moved onto, moved off, average size and last hit. For every person: spins, respins, moves up/down, channel point uses and points spent. Filter by all time, tonight, last 7 or 30 days, or one stream night, and by this wheel or all wheels. Search and sort any column.
  - **Settings:** spin time, "take the winner off the wheel" (like Wheel of Names remove) and color themes.

## 1.8.0
- **📋 Full match results:** every round now saves its full finishing order: place, name, who picked it, luck, odds, and the time each piece went out. That time is shown two ways, as time into the match and as the real clock time. It also saves when the match started, how long it lasted, the map, whether it went to sudden death, and every power used with its time.
  - Open results from the winner card (📋 Full results), from any round in History, or from History → 📋 Results, which lists every round including practice rounds and each round of a best-of series.
  - Search inside the results, or download them as a CSV.
- **📊 Stats tab** (History → 📊 Stats):
  - The top shows the total battles run since you first installed, a count for each battle type, and the wild card spot record.
  - For every person, or every movie or entry, it shows battles, wins, win %, 2nds, 3rds, 4ths, top 5s, top 10s, luck spent, and how many different movies they've had in battles.
  - Filter by Movie matches, Custom battles, Chat royals or Giveaways, and by map. Search by name, and click any column to sort.
  - Practice rounds never count. Winners and top 5s from your existing history are brought in.

## 1.7.2
- **🍀 Winner's luck on screen:** if the winner had luck, the winner card says how much (for example "🍀 Won with 35% luck", with a 🔥 at 50% or more). Custom and chat battles show extra odds instead ("🎲 Won with x3 odds"). The Twitch chat winner message says it too, and it's saved in the history.

## 1.7.1
- **💨 New map: Whoopee Swamp.** A goofy bean bog (cartoon toots only, Twitch safe).
  - Pink whoopee cushions hide in the grass: step on one and PFFFT, you go flying (luck can save you). They blow back up after a few seconds.
  - Green gas clouds drift over, and everyone inside says "P-U!" and runs from the smell.
  - Every piece toots now and then, giving it a little boost in a random direction.
  - Map power 🫘 **Bean Blast**: everyone toots at once and goes flying, the cushions refill and a giant gas cloud rolls in.
  - Its own sounds: toots, pffts, long brraps, squeaks, whoopee cushions and a bean chorus, plus oom-pah polka music with a tuba and kazoo. Add your own sounds for this map in the Sounds tab.
- **🧱 Tumble Tower is flipped:** the biggest floor is now on top and each floor below it is smaller. Pieces on the lower floors show through the floors above them, so you can always see them.

## 1.7.0
- **🧱 New map: Tumble Tower.** Four floors stacked up: the biggest on top, each floor below it smaller. Stand on a tile for 5 seconds (it turns red as time runs out) and it gives way, dropping you to the floor below. Fall through the bottom floor and you're out. Map power: 🫨 Tremor.
- **🧭 Skip any part of setup:** every step has a "Skip this step" button and a "Skip the rest" button, and the top bar has "Skip setup". You can come back from Settings → Setup guide any time.
- **Glow and flames in every battle and every map:** movies show their luck, and custom, chat and giveaway battles show their extra odds (x2 odds = 10% glow, x6 = flames).
- **Kill feed fix:** in huge battles (like 1000 pieces) the top-right list no longer repeats the same names. A piece can only be counted out once.
- **Updates reopen the app by themselves** when the installer finishes.

## 1.6.2
- **Luck glow and flames are much stronger:** a bright glow and aura ring from 5% luck, and from 50% big flames in the piece's own color, with embers. Practice rounds now give some pieces luck, so you can see what it looks like.

## 1.6.1
- **🗳️ Chat vote** shows a picture of each of the 4 maps on the battle screen.
- **⏹ Stop battle:** during a fight, the Start button becomes Stop. It stops the battle with no winner, and nothing is saved.
- **Saved odds for custom battles:** 💾 Save odds, ↺ Everyone to 1, 📂 Saved odds → Bring back (just like luck saves for Discord movies).
- **🧭 Setup guide** has a new step for the free 24/7 Discord bot.
- New defaults: **luck on**, **close movie picks when you go live on**, and **closing the window quits** (no tray). Your settings are switched over once; change them any time in Settings.
- 👻 Ghosts float over the land (often right at someone), not over empty space.
- 🐉 Bigger dragons with much bigger flames that burn the floor away.
- 🍿 Way more butter: it starts as a drizzle and turns into a downpour.
- 🍩 Much bigger bites, more often: almost the whole donut is gone by the end.

## 1.6.0
- **🐉 New map: Dragon Keep.** A castle courtyard where dragons swoop down, knocking pieces flying and burning holes in the floor.
- **💣 New map: Blast Zone.** Giant bombs drop in, trap you, and blow up in a big cross (chain reactions too).
- **🍿 Popcorn Panic reworked:** hot butter rains down. A drop on a piece butters it (luck can dodge it). Drops heat up the popcorn until it pops at random, shooting pieces off the map.
- **👻 Haunted Hill:** bigger ghosts, and more of them. Get close and you panic and run for the edge, until you bump into someone.
- **🍩 Sweet Donut:** a giant sugar monster takes huge bites. The middle of each bite goes in its mouth, and the edge falls off as crumbs.
- **🏓 Pong:** the flaming ball goes straight through pieces instead of bouncing off them.
- **🎵 Sounds for each map:** in the Sounds tab, pick a map and give it its own sounds (and music).

## 1.5.0
- **🎁 Giveaway tab.** Viewers type `!enter`, and a battle picks the winner on stream. You choose:
  - **Who can enter:** everyone, followers, subs, VIPs, mods, how long they've followed, how many months they've subbed.
  - **Extra odds:** per sub tier, loyalty per sub month, and for followers, VIPs and mods.
  - **Rules:** past winners (can win again / not this stream / week / month / only once), max entries, entries that close by themselves, bots and you can't enter, take the winner out after they win.
  - **Chat:** posts when entries open (and optionally confirms every entry). There's a 🔁 Reroll button and a past-winners list.
  - Follower checks need one more Twitch permission: sign in with Twitch again once.
- **🥊 Best of 3 / 5 / 7 / 9** for custom battles (on the Battle list), chat battles and giveaways. The screen shows the round and score, and the next round starts by itself (you can turn that off).
- **Better endings:** a piece saved by luck now hops back onto the nearest land where you can see it, instead of warping across gaps. Fast pieces can't skip over gaps anymore. The winner is always standing on land.
- **Power pop-ups** moved to the lower right corner of the battle screen.
- **Camera:** ⬅ ➡ ⬆ ⬇ buttons under the battle to move around, you can zoom out much further, and 🗺️ always shows the whole map.
- **🧪 Practice round:** pick the map.
- **`!moviesroyal`** in Twitch chat lists every chat command (30s cooldown).

## 1.4.5
- **🍀 Luck you can see:** at 5% luck a piece starts to glow in its own color, brighter every 5%. At 50% it catches fire with flames in its color, bigger every 5%. It's just for looks.
- **Bigger pieces hit harder:** they barely move when they bump a small piece, and the small one goes flying.
- **🎨 Ball colors:** when a viewer picks a color, every one of their movies or entries changes right away, even mid-fight.
- **🏓 Pong:** the ball is on fire, keeps getting faster, and blows up the pieces it hits (luck can dodge it).
- **🌆 Neon City:** lasers sweep in from any angle, slow at first and faster later, with no more than 2 at a time. Pieces jump them. Get hit and luck might dodge it, otherwise you blow up. Land a jump on another piece and you both bounce off like bouncy balls.

## 1.4.4
- **🌋 Lava Lake is real lava now:** the land doesn't fall apart, it floods. Low ground and valleys go first, so islands form, and hills last. Tiles glow just before the lava gets there, pieces run for high ground, and touching lava means you're toasted. **Eruption** floods a whole patch at once.

## 1.4.3
- **🧪 Practice round player count:** on the Test tab, type how many pieces you want (2–1000) or press 10 / 50 / 200 / 1000.

## 1.4.2
- **🎬 Movie picks OPEN / CLOSED** button on the Battle tab. While picks are closed, Discord `/suggest` (and the 24/7 bot) tells people picks are closed. Everyone's movies stay in, `/mymovies` and `/list` still work, and you can still add movies yourself.
- Optional: close picks automatically while you're live (Settings → Discord & picks). The bot posts in your movies channel when picks open or close (you can turn that off).
- **🔮 Chat calls the winner:** before the fight, viewers type `!call Heat` (part of the title is enough). If that movie wins, everyone who called it is named in chat, and their own movies get +1% luck. The command never replies, and the amount and command can be changed in Settings.

- **🍀 Luck saves:** 💾 Save luck, ↺ Reset luck and 📂 Luck saves (on the Battle list and in Settings → Luck). Reset it for a few battles, then bring it back. Resetting always saves first, and "Bring back" saves what you had too.
- **Automatic safety backups:** resetting or bringing back luck, and restoring a backup, first saves a dated copy of everything in your data folder's `backups` folder (the newest 30 are kept).
- **Monthly backup reminder:** once a month Movie Royal reminds you to download a backup, so a copy lives somewhere other than this PC. "Remind me in a week" snoozes it.
- **Wildcard spots can get luck too** (off by default): Settings → Luck. They go up at most 1% per stream, and don't need anyone chatting.
- **Luck only starts over when your movie gets watched** (a win counts). "Not watching it — put it back" now gives that person's luck back, and marking a movie ✅ watched resets its owner's luck like a win does.
- Restoring a backup now also brings back bans, people you added by hand, ball colors and luck saves.

## 1.4.1
- **Real sudden death:** when time runs out and more than one piece is left, the fight keeps going. Every power (and the map's own power) goes off at random, faster and faster, and the cliff shrinks from the outside in, until one piece is left standing. The timer shows how many are left.

## 1.4.0
- **The name is spelled right everywhere now: Movie Royal.** The program is now `MovieRoyal.exe` in `Programs\Movie Royal`, and your data moves by itself to `%APPDATA%\Movie Royal` the first time 1.4.0 opens. The old copy, its shortcuts and its Apps entry are cleaned up when you install. In OBS, re-pick the window/audio capture once (it's now **MovieRoyal.exe**).
- **Royal Rumble:** a smaller ring, and wrestlers come in two at a time, starting right away.
- **Dune Sea:** wherever a worm comes up, the ground caves in behind it, leaving a sinkhole you can fall into. Worms never come up through sand that's already gone.
- Fixed: a piece saved by luck could get thrown out of the ring again right after landing.

## 1.3.0
- **🗺️ 14 maps:** Crumbling Cliff, Deep Space (low gravity), Lava Lake (rising lava), Rainbow Road, Hollywood Sign (earthquake), Neon City (lasers to jump), Final Stage, Royal Rumble, Pong, Frozen Peak, Sweet Donut, Haunted Hill, Popcorn Panic and Dune Sea. Pick one or use 🎲 Random. Each map has its own power.
- **Final Stage** plays like Smash: everyone starts on the upper platforms and drops to the main stage when they break. Powers send pieces flying off screen (KO!), but luck can fly them back in to land on the stage.
- **🍀 Luck makes pieces bigger** again, slowly (about 6% bigger per 10% luck), and **bigger pieces hit harder**. The LUCKY! saves work the same as before.
- **Final Stage** has big chunky pieces.
- **Royal Rumble:** a tighter ring where masked wrestlers fly off the top rope (elbow drops, splashes, moonsaults, leg drops…), and everyone where they land goes flying out of the ring. The map power **Tag Team** sends in three.
- **Rainbow Road** breaks apart from a different random spot every round.
- **Dune Sea:** a smaller plateau where nobody falls off. Big sand worms burst out of the sand and swallow pieces whole.
- **🗳️ Chat map vote:** chat types 1–4 to pick the next map.
- **⚡ Every power is a button** under the battle screen, including the map power.
- **🔀 Shuffle** moves every piece to a random spot before the fight.
- **The cliff grows with the number of entries.**
- **📋 The full list is back on the Battle tab** (scroll down), with luck, odds, ✅ watched, ⏸ pause and ✕ delete, plus **➕ Add** to type in a person and their movie and match your old wheel exactly.
- **🎨 Ball colors:** free by default, so viewers just type `!color pink` (silent, no chat spam). Or switch to channel points, which adds just one reward where viewers type any color (it asks first). Can be turned off.
- **⚡ Free powers in fullscreen:** move the mouse to bring up a power bar down the left side (drag it anywhere, it remembers), or press 1–9 / 0. You don't pay anything.
- **Livelier battles:** pieces hunt each other and try to knock them off, circling to the inside first so the hit sends them toward the edge. Targets sometimes dodge, and a missed charge can carry the attacker right off the cliff (WHIFF!). Big crowds spread out instead of piling up in the middle.
- **Fullscreen stays on** through the replay and winner card. Press Esc when you want out.
- **👤 Change who picked a movie** (Battle list and Pool tab): tag it to anyone (people you know, new names, or anyone in your Discord). The pick moves to them, `/mymovies` updates, and the bot posts it in your movies channel.
- Fixed: with exact odds, the winner could be a piece floating off the cliff. The winner now always ends up standing on the cliff.
- Faster drawing in big rounds.
- Fixed: the old winner card showed during the next fight.

## 1.2.0
- **☁️ 24/7 mode:** a free Cloudflare copy of the Discord bot answers `/suggest`, `/swap`, `/mymovies`, `/list` and `/linktwitch` even when your PC is off, with all your rules. The app pulls new picks in when it opens (and every minute while it's open). It's a one-click setup in Settings → Discord & picks.

## 1.1.8
- Ready for GitHub: README with screenshots, guide, MIT license, one-click "Build & release" on GitHub, bug-report forms. Copies built on GitHub check that repo for updates automatically.
- Fixed: sudden death showed everyone as "#2" in the knock-out list.

## 1.1.7
- The "LEFT" pill is gone. Discord movie battles show **MOVIE #N TONIGHT** instead, which starts over when you go live (or on a new day).
- Fixed: text boxes in the desktop app could stop taking typing after a yes/no pop-up.

## 1.1.6
- Pieces start spread evenly over the whole cliff (even with 1000), keep a little distance in big rounds instead of piling in the middle, and bounce off each other a bit more.

## 1.1.5
- Fixed: the waiting screen showed "MOVIE ROYAL" on top of "GET READY". It now sits in one clean panel.

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

# Changelog

What changed in each version of Movie Royal. Newest first.

## 1.116.2
- 🍿 **Leaderboard:** the line at the bottom now tells chat they can add a comment to their vote: "TYPE !VOTE + MOVIE NUMBER + ANYTHING YOU WANT TO SAY", with the example "!VOTE 1 I LOVE THIS MOVIE" under it. (The vote counts, and the extra words show in the vote pop-up in the app, like before.)

## 1.116.1
- 💬 **Chat tab boxes resize from every corner and every side.** Each box now has a little handle on all four corners, and all four edges can be dragged (the top edge is the thin strip right at the top; just under it is still the bar that moves the box). The boxes next to it still adjust to fit, like before.

## 1.116.0
- 🍿 **Movie night leaderboard for OBS (new look).** The on-stream vote box is now an arcade high-score board: the top line shows how many votes the guesser got right out of all the votes ("BIRX GOT RIGHT 4 / 9 VOTES"), and under it each movie with its number, name, year and votes. The most votes are on top; ties (and everything on 0) are in ABC order. When a movie passes another one it turns sideways and hops up the list to its new spot. Compact, no sound.
- **See-through:** a Background slider on the Movie night tab (📺 On stream + options) goes from solid to fully see-through (only the glowing words show). You can also pick left / right and top / bottom.
- **➕ Add it to OBS for me:** pick the scenes and the app puts the source "Movie Royal movie night" on top of them (and 🔄 Keep OBS up to date puts it back if it goes missing). 👀 See it move shows it in the app with pretend votes.
- 🧪 Test tab → 🍿 Movie night voting → 🏁 Leaderboard with pretend votes.

## 1.115.0
- 🍿 **Movie night: suggestions while you type.** Start typing in the "Movie name" box on the Movie night tab and a list of movies shows under it (name + year; movies from your earlier nights come first). Click one, or use ↑ ↓ and Enter, and it fills the box in. Suggestions for every movie use the free movie-search (TMDB) key: if there isn't one yet, the list has a line to add it right there.
- 💬 **Chat tab:** the movie box's button is now a clear **🍿 Movie night tab** button that jumps straight there.
- 🧪 Test tab → 🍿 Movie night voting → 💡 Suggestions while typing (pretend suggestions, nothing added).

## 1.114.3
- 🟢 **Kick sign-in showing a broken page:** that happened when the Redirect URL (the web address) was pasted into the Client ID box. The app now refuses a web address in the Client ID / Client Secret boxes and says which one goes where, and if the wrong one was already saved it shows a red note and asks for the real Client ID instead of opening Kick's broken page. The Connections page wording is clearer: the Redirect URL goes INTO Kick, the Client ID and Client Secret come FROM Kick.

## 1.114.2
- **⭐ Name your ratings:** on Settings → Connections, the RateYourMusic line now has a **name box** (so it says your name instead of "Rating 1") and a **"A second person rates too"** tick box. Untick it and the second rating disappears everywhere (music box, history, song list, stats). The same tick box is in Chat bot → Songs → Settings.
- The line also says it plainly: ratings only come **in** from RateYourMusic. There is no way for an app to send ratings back to a RateYourMusic account.

## 1.114.1
- **🟢 Kick on the Connections page:** its button now opens **Kick's sign-in page** to connect your account, instead of sending you to the Twitch settings. The first time, the line shows the two key boxes and the steps right there.

## 1.114.0
**🔗 Settings → Connections (new page)**
- One list of **everything the app links to**: Twitch, the chat bot account, Kick, the Discord bot, the 24/7 bot, movie search, ratings, Letterboxd, OBS, donations, Stream Deck, co-stream, your Streamlabs Chatbot import and your RateYourMusic file. Each line shows **connected / not connected / optional** and has a button that takes you **straight to where it is set up**. It only lists the things your edition has.
- **💿 RateYourMusic:** pick whose ratings they are, press **📂 Pick my RateYourMusic file**, check what it found, press **Add them**. (On rateyourmusic.com: your profile → Export your data at the bottom. RateYourMusic has no sign-in for apps, so it's a file.)

**Smaller things**
- The last status circle at the top (the "game screen" one that was red unless a battle was open) is gone. In editions without movie picks, the Discord and Letterboxd circles are gone too.
- Editions without battles no longer get the "men and women characters?" question on start-up.
- 🧪 Try it: Test tab → 🔗 Connections page.

## 1.113.0
**🎭 Editions tab: 310 switches (was 33), names stay on top**
- The list in the Backup Bots app now has **every Settings section** (each heading on every Settings page), **every map**, **every chat command**, **every Setup guide step**, the **Chat bot / Songs sub-tabs**, each **Chat tab box**, the **History buttons**, the **wheel's spot kinds**, the **clip buttons** and the **Test tab cards**, on top of the tabs and pages from before.
- **The edition names stay at the top** while you scroll, so you always see whose column you are ticking.
- New **category menu** next to the search box, and a gold check box on each category line that turns **everything in that category** on or off for one edition at once.
- A chat command that is switched off is ignored by the app in that edition. A map that is switched off is left out of the menus and the random pick.

## 1.112.0
**🧱 Chat tab: boxes adjust to each other (like OBS)**
- Drag a box's **right or bottom edge** (or its corner) and the boxes next to it **grow or shrink to fit**, so there are no gaps or overlaps. Boxes lined up on the same edge move together.
- Edges still snap to the other boxes and to the sides.

**⏭ Song skip settings**
- The vote-to-skip command is now **!skip** by default, and it takes **3 votes** by default.
- **Leave any song command box empty to turn that command off** (for example, empty "Skip (mods)" = no mod skip command).
- In editions with movie battles, `!skip 3` (a movie number) is still the movie skip.

## 1.111.0
**🎭 Editions tab in the Backup Bots app (dev edition only)**
- The **Movie Royal Backup Bots** app has a new **🎭 Editions** tab: a list of every part of the app that can be switched, sorted by category, with a **search box** and a **check box for each edition** (Public, Derek, Kirb, True, Birx & Jess).
- Tick or untick, press **💾 Save**, and the list goes to your GitHub. **Each edition gets the change with the next build you send it.** 🧪 Check shows what would change without saving.
- New switches: every top tab (Chat bot, Giveaway, Wheel, Chat, History…) and every Settings page can now be turned off per edition.
- It needs a GitHub key once (the tab says how to make one). The key is kept scrambled on your PC and only sent to GitHub.

## 1.110.1
- **🎂 Birthday on the profile:** if a chatter has added their birthday (with !bday or by you), their profile shows it, and says so when it's today. No year, ever.

## 1.110.0
**💬 Chat tab: move and resize every box**
- Every box on the Chat tab (stream preview, songs, movie night, alerts, stream tools, chat) can be **dragged by the little ⠿ strip on top** and **resized by its bottom-right corner**. Edges stick to the other boxes so it stays tidy. It's remembered on your PC; **↺ Boxes** in Stream tools puts everything back.
- The "👀 Seeing the app as" box (dev) can be dragged anywhere too.

**📻 Playlists for the music box**
- New **📻** button next to Skip: add your **YouTube playlists** (name + link), then **▶ Play** one. That **pauses the song requests** (they still come in and wait) until you press **↩ Back to song requests**.
- Pick a **fill-in playlist**: it plays by itself whenever **no song requests are left**. When a request comes in, the playlist song that's on finishes, then the request plays.
- When a requested song ends, **the next one now starts by itself**.

**👤 Profiles (Birx & Jess's edition)**
- Gone from the profile: character, respins, movies, games and the Discord line.
- New **📊 Stats** tab: the songs they asked for, the movies they voted for, song skips, and every chat command they used with how often and when. Newest first. (Counting starts with this version.)

**⏭ !skip song**
- Chat can type **!skip song** (same as !skipsong). Mods and the streamer skip right away, and so can the person whose song it is. For anyone else it counts as a vote to skip when skip votes are on.
- 🧪 Try it: Test tab → 🧰 Chat tab: stream tools + my songs.

## 1.109.0
**For everyone**
- **🎵 Music box on the Chat tab:** it no longer shows the video (it just kept buffering). You get the song's picture instead; ▶ Play, the volume and the time slider still work.
- **🔐 The 2-step lock is gone.** If you had it on, it's switched off by itself. The app still only listens to your own PC.
- **🚀 The Raid tab is in every edition**, with a new **wait slider**: pick how long to wait after pressing 🚀 Raid (up to 10 minutes). Chat is told, the tab counts down, and you can cancel.

**💬 Chat tab (Birx & Jess's edition, and dev mode)**
- The alerts column is now half as tall. Under it is a new **🧰 Stream tools** box with a **🎬 Clip** button and **scene buttons**: press ⚙ Pick scenes, tick your OBS scenes, and each one becomes a button that switches OBS to it.
- **Click a name in chat** (one click) and that person's profile pops up. It now lists **their songs in the queue** and what number each one is.
- New chat command **!mysongs**: the bot says that person's songs and their place in the queue. (Rename it in Chat bot → Songs → Settings.)

**🎭 Birx & Jess's edition: simpler**
- Settings no longer has **Luck**, **Co-stream** or **Game**, and the battle-only parts of other Settings pages are hidden.
- No **void spot** on wheels.
- A fresh install starts with **no ready-made wheels or battles** (anything you made yourself is never touched).
- 🧪 Try it: Test tab → 🧰 Chat tab: stream tools + my songs, and 🚀 Raid tab.

## 1.108.0
**🤖 The Chat bot tab, for every edition**
- The **🤖 Chat bot** tab (commands, sound alerts, timers, quotes, and bringing everything over from Streamlabs Chatbot) is now in every edition, not just dev mode. Its Setup guide step is back for everyone too.
- **🎵 Song requests** and **🍿 Movie night** moved inside the Chat bot tab as two of its buttons (in the editions that have them). Their own top tabs are gone; the "Open" buttons on the Chat tab still take you there.

**🎭 Birx & Jess's edition: fewer tabs**
- No **Battle**, **Battle pool**, **Chat battle** or **People** tab. It opens on the 💬 Chat tab.

**🎵 Song requests: more rules (Chat bot → Song requests → Settings)**
- **🎼 Music only** (on to start): only YouTube videos in the Music category can be requested.
- **🛡️ DMCA-free music only** (off to start): only music from stream-safe channels. **📃 Stream-safe channels** is the list (you can change it). No list can promise a song is safe.
- **Longest song** (10 min to start), **at least … views**, **subs can have more songs**, **a wait between requests**, **votes to skip** (chat types `!voteskip`), mods can **`!skipsong`** and **`!volume 40`**, a starting **song volume**, and **say "Now playing" in chat**.
- **🔎 Type a song's name**: chat can type `!sr africa toto` and the bot looks it up on YouTube and adds the first result that fits your rules (it passes over ones that are too long, not music, or banned). Turn it off with "Look typed song names up on YouTube".

**⏩ A slider for the song (💬 Chat tab song box)**
- Under Play / Skip / volume there's a slider with where you are and how long the song is. Drag it to fast forward or rewind. It works while the song plays there.

## 1.107.0
**🚚 Installing a different edition moves everything over by itself**
- Run another edition's installer on a PC that already has one and it takes its place. Your lists, wheels, history, people and settings are all there when it opens: every edition keeps them in the same spot, so nothing is copied or lost.
- The old edition's shortcuts (desktop and Start menu) are swapped for the new edition's.
- What still pointed at the old edition is changed to fit the new one the first time it opens: where updates come from, the names used for wild spots and banned-movie messages, and the Test tab's starting setting.
- A message says "This is now the … edition" when you open it, and it's written into History → Everything.
- 🧪 Test tab → 🎭 Edition → **🚚 What moves over?** shows what would change coming from any other edition (pretend: nothing is changed).

## 1.106.2
**🧪 A switch for the Test tab**
- Settings → 👤 Account & updates → **Show the Test tab (tests and checklist)**. When it's off, that tab is just **⚠️ Errors**: what went wrong, in plain words.
- It starts **off** in Kirb's, True's, Birx & Jess's and the public edition, and **on** in Derek's. Anyone can turn it on.
- 👀 "See the app as another edition" shows it off, the way they get it.

## 1.106.1
**🎵 Song box: History + stars like Letterboxd** (Birx & Jess's edition; also in Derek's with dev mode on)
- The song box on the 💬 Chat tab has two tabs now: **Now** and **History**. History lists the songs that were played, newest first, each with Birx's and Jess's stars, so you can go back and rate them.
- If a song already has a rating, its stars are filled in. Click to change it: the stars light up under the mouse before you click, the left half of a star is a half star, and clicking the same star again clears it.
- **💿 RYM** next to a song opens RateYourMusic's search for it in your browser, so you can rate it on your own account there. The app can't change a RateYourMusic account by itself: that site gives apps no way to do it.

## 1.106.0
**💬 The Chat tab, laid out like Birx's drawing** (Birx & Jess's edition; also in Derek's with dev mode on)
- Three columns: on the left a **big stream preview** with the **song request** box and the **movie night** box side by side under it, in the middle the **activity feed** (subs, bits, raids, follows…), on the right **chat**.
- 🎵 Song box: the song's picture, its name, who asked for it, **▶ Play / ⏸ Pause**, **⏭ Skip**, a **volume slider**, and **five stars each** for Birx and Jess (click the left half of a star for a half star; click the same star again to clear it).
- 🍿 Movie box: a table with each movie, its votes, and how many of them Birx guessed right / wrong, plus the **⏳ 5 min** last call button.

**🗳️ Vote pop-ups, one at a time**
- Every vote and every vote change gets its own pop-up, **in the order chat voted**. The first one stays until you click it, then the next one shows ("+2 more" tells you how many are waiting).
- Each pop-up shows the chatter's picture, their name, how long they've followed, which movie they voted for (or changed to, and what it was before), anything else they typed with the vote, and **Birx: ✅ Right / ❌ Wrong** (or Skip).
- A vote can now have words after it: "!vote 3 this one has to win" counts as a vote for #3.
- 🧪 Test tab → Movie night: **🗳️🗳️🗳️ Three votes in a row**.

**👀 See the app as another edition** (Derek's edition, dev mode)
- Settings → 👤 Account & updates → **See the app as another edition**: pick Public, Kirb, True or Birx & Jess and the whole app switches to what they get: its name, its tabs and extras, the hidden names, and no dev things.
- A small bar at the bottom left says which edition you're looking at, lets you hop to another one, and **↩ Back to mine** brings everything back. Restarting the app also brings it back. Nothing is saved, removed or changed for real.
- While you look like Birx's or True's edition, chat lines the app sends hide the same names too, so don't leave it on during your own stream.

## 1.105.0
**💿 RateYourMusic ratings** (Birx & Jess's edition; also in Derek's with dev mode on)
- 🎵 Songs → Import now reads a **RateYourMusic export**. On rateyourmusic.com: your profile page → bottom → **Export your data**. Every album and single you rated comes in with its rating; things you only catalogued or wish-listed are left out.
- A new **"One rating column is …'s"** pick says whose ratings the file holds (Birx's or Jess's). It works for any file with a single rating column.
- Albums show with 💿 and their year in the song database.
- When a song by one of those artists plays, the **Now playing** card shows your album ratings for that artist.
- The app only reads the file. It never visits RateYourMusic.
- 🧪 Test tab → Songs: **💿 Pretend RateYourMusic file**.
- **Fixed:** banned songs were not being refused when chat asked for them. They are now.

## 1.104.0
**🟢 Kick channel points for the egg game** (True's edition; also in Derek's with dev mode on)
- Kick has channel points now, so the **🥚 Buy an egg** reward is made on **Kick** too (by itself once you're signed in with Kick, or with **🟢 Make it on Kick** on the Eggs tab). Kick viewers buy eggs with their Kick points.
- The app checks every few seconds who redeemed it on Kick and gives them their egg. It never accepts, rejects or refunds a redemption.
- Changing the egg price on the Eggs tab changes it on Kick as well.
- **Signed in with Kick before this version?** Sign in with Kick once more: channel points need two new permissions (read and manage channel rewards). On kick.com, tick those two on your app first.
- 🧪 Test tab → Egg game: **🟢 Pretend Kick redeem**.
- Not tried against the real Kick yet (it can't be reached from where the app is built): only against a pretend Kick.

## 1.103.0
**🥚 Egg game: one free egg, buy more with channel points** (True's edition; also in Derek's with dev mode on)
- **Everyone gets 1 free egg.** After it hatches, they buy more eggs with channel points: a new **🥚 Buy an egg** reward (made by itself after you sign in; 1,000 points to start, you set the price on the Eggs tab).
- **Several eggs, one incubator.** A viewer can own as many eggs as they like, but only one incubates at a time. The others wait in their nest and the next one starts by itself when an egg hatches.
- **Every egg is a surprise:** which creature is inside is only decided when it hatches.
- With no egg in the incubator, watching and chatting fill nothing. Subs, gifts, bits and tips are kept and go into their next egg.
- `!egg` now also says how many eggs are waiting, or that they have none and how to get one. The viewer website shows it too.
- Eggs tab: a **🛒 Getting eggs** box (price, make the reward) and a **🥚 Give an egg** button (handy for Kick viewers, who have no channel points).
- 🧪 Test tab → Egg game: **🛒 Pretend buys an egg**.

## 1.102.0
**🥚 Egg game: creatures in chat battles, skills and powers** (True's edition; also in Derek's with dev mode on)
- **Creatures fight in the Chat battle.** When someone joins the Chat battle, the creature they have out is their piece on the battlefield, with its level on it.
- **XP for battling.** Every creature that fights in a Chat battle earns XP, and the winner's earns a lot more. The bot says who levelled up or evolved. You set both numbers on the Eggs tab.
- **Stronger creature = slightly better odds** in the Chat battle (a switch on the Eggs tab; off = everyone even).
- **Skills.** Each element has three. A creature knows the first, learns the second when it evolves and the third when fully grown. They go off by themselves in `!battle` fights and hit harder the later they are. `!skills` shows them.
- **Powers.** 12 powers unlock as a creature levels up (harder hits, a faster egg, more XP, better odds and more). Viewers type `!powers` to see theirs and `!power 1` to put one on or off. A first form wears 1, a second form 2, a fully grown one 3.
- The viewer website shows each person's skills and powers, and lists every power.
- 🧪 Test tab → Egg game: **🏟️ Chat battle with creatures** and **💪 Pretend skills + powers**.

## 1.101.0
- 🔊 **Sound alerts tab** in 🤖 Chat bot (Derek: "where the other tab is make one for sound alerts"). ➕ New sound alert: type the command (like !airhorn), pick a sound file, set the volume, who can use it and the wait. ▶ plays it, ✏️ changes it, and the tab shows the address to add to OBS so the sounds go out on stream. Sound alerts no longer sit in the Commands list.
- 🧳 **Bring everything over from Streamlabs Chatbot, in one go.** On 📥 Import / export pick the files Streamlabs Chatbot makes (Data.xlsx, and Songlist.xlsx where the edition has songs; several at once). You see what was found first: commands, **sound alerts** (with how many of their sound files are on this PC), timers, quotes and extra quotes, songs. Then ✅ Bring it all over. Sound files are copied in; ones that aren't on the PC get a ⚠️ so you can pick them again. Pages there's no place for yet (points, ranks, counters…) are listed instead of silently dropped.
- 🧭 **Setup guide step "Bring everything over from Streamlabs Chatbot"** with the exact clicks.
- 🛠️ **The chat bot is dev mode only again** until Derek has tested it (it was opened to every edition in 1.94.0).
- 🧪 Test tab → 🤖 Chat bot: 🔊 Pretend viewer uses a sound alert, 🧳 Check the bring-everything-over import.

## 1.100.0
- 🥚 **The egg game** (True's edition; in Derek's with dev mode on). Every viewer has an egg that fills while they watch and chat, and much faster with subs, gift subs, bits and tips. A full egg hatches into one of **120 original creatures** (40 families that each grow twice, 8 elements, some rare). Creatures earn XP, level up and **evolve** at level 10 and 25.
  - ⚔️ **Chat battles:** `!battle name` challenges someone, they type `!battle` to fight; both get XP. Also `!egg`, `!pet`, `!pets`, `!equip 2`, `!eggtop`.
  - 🔗 **Twitch + Kick, one profile:** `!link` in one chat gives a code, `!link CODE` in the other joins them.
  - 🌐 **A viewer website** on your own 24/7 bot: look up your egg and creatures, the leaderboard, and all 120 creatures (the 24/7 bot needs its update for this).
  - 📺 **Creature chat box** for OBS: chat with each chatter's creature next to their name, and battles popping up. (Twitch and Kick don't let an app put a picture next to names in their own chat, so this box does it on stream.)
  - The 🥚 Eggs tab sets every number (points per sub, per bit, per message…), shows every player and their creatures, and can give points by hand.
- 🟢 **Kick is switched on in True's edition** (chat on Kick, the Twitch ↔ Kick switch). Kick's subs / gift / Kicks alerts are not connected yet: Kick only sends those to a public server, so that part comes next.
- 🧪 Test tab → 🥚 The egg game: pretend players, a pretend hatch, a pretend battle.

## 1.99.0
- 💬 **Chat tab dashboard** (Birx & Jess's edition; Derek: "preview of stream, chat, channel alerts, song request info and if movie voting night all that info"). Next to chat and the alerts, the 💬 Chat tab now has: 📺 a small muted preview of your own stream, 🎵 what's playing with both rating boxes, ⏭ Next and the next songs, and 🍿 movie night: votes so far, the last call clock, and the "did he guess it?" ✅ ❌ buttons.

## 1.98.0
- 🎵 **Song requests and song ratings** (Birx & Jess's edition; in Derek's with dev mode on). Chat types **!sr** and a YouTube link or a song name. The new **🎵 Songs** tab has the queue (⏭ Next song, play now, move, remove, ban, add your own), **two ratings per song** (Birx's and Jess's) that are kept in a searchable **song database** and show again when a song is replayed, **banned songs** (by name, link or "any song with these words") and blocked requesters, **stats** (who asks the most, most asked-for, best rated) and an on-stream now-playing box for OBS. Chat also has !song, !queue and !wrongsong.
- 📥 **Import everything from before** (Derek: "he has been doing song requests for a long time… import any info and all the banned songs easily"): old song lists, old ratings and banned songs from a spreadsheet (Excel or CSV), a text file or pasted lines, including Streamlabs Chatbot's Songlist.xlsx / Queue.xlsx. You see what was found before anything is added. ⬇️ Export gives it back as a spreadsheet.
- 🔊 **Sound alerts in the chat bot (every edition):** a command can play a sound (like !airhorn), with its own volume. On stream it plays through a soundboard page in OBS (or the battle screen in OBS, else the app). The Streamlabs Chatbot import now reads the **SFX** page too and copies the sound files it finds on the PC.
- Chatter stats were already there: 👥 People shows every chatter's profile and numbers.

## 1.97.0
- 🧽 **Birx's and True's editions don't show other streamers' names any more** (Derek). In those two editions the pirate ships are the *Red Kraken* and the *Blue Serpent* with skull figureheads, the monkeys are Red and Blue ("Take out Red" / "Take out Blue"), and the help, tips, patch notes, chat lines and pop-ups say "the streamer" instead of a name. Derek's and Kirb's editions are unchanged.
- The one place a name can still be seen there is the download link itself (the editions live on Derek's GitHub).

## 1.96.0
- 🔐 **Safety** (Derek: "can we add 2 factor for safety… nothing being sent that shouldn't be"):
  - **Only your PC can reach the app.** It now listens on this computer only (before, it listened on the home network too and turned other devices away at the door). Pages on other websites can't press its buttons or read from it any more either.
  - **The lock (2-step), optional:** Settings → 👤 Account & updates → 🔐 Set up the lock. Scan the picture with an authenticator app on your phone; from then on the control panel and Setup guide ask for a 6-digit code (every time the app opens, once a day, or every 30 days). 8 backup codes for a lost phone. Stream screens, OBS and the Stream Deck keep working while it's locked.
  - **📄 What is sent where:** a plain page listing what stays on your PC, what is never asked for (no email, no passwords, nothing to the makers of the app) and which services it talks to.
  - **The fonts on the stream screens are inside the app now**, so nothing is fetched from Google's font site.
  - 🧪 Test tab → 🔐 Safety & privacy: 🛡️ Run the safety check.
- 🎂 **Birthdays, in every edition** (Derek): viewers type **!bday 3/14** or **!bday March 14** (month and day only: a year is never asked for or kept; if someone types one it's thrown away). They can change it again after 30 days; you can add, change or remove one any time in Settings → 💜 Twitch → 🎂 Birthdays. **The first time someone chats on their birthday, the bot wishes them a happy birthday.**
- 🍿 Movie night (Birx & Jess): **late nights count as the day before**. Going live at 1:30 AM Tuesday counts as Monday (a new day starts at 6 AM; you can change the hour). The Wednesday / Sunday birthday votes and the birthday wishes both follow it. Movie night uses the same birthday list.

## 1.95.0
- 🚀 **Raid tab** (Derek: for Birx, Kirb and him). Every channel you follow that is live right now, **the ones you raided most recently first**, each with when you last raided them and how many times. Click one for a **live preview** on the right (muted until you turn the sound on), then **🚀 Raid**: you confirm, Twitch counts down about 90 seconds, chat is told where you're heading, and **✖ Cancel the raid** stops it. You can also sort by who you haven't raided for the longest, or by viewers.
- Raids you start by typing /raid, or with the 🚀 raid reward, are remembered too. The list of who you raided stays on your PC.
- The first time, Twitch asks you to sign in again once, so the app may see which channels you follow.
- 🧪 Test tab → 🚀 Raid tab: pretend channels (nothing is sent to Twitch) and a sorting check.

## 1.94.0
- 🤖 **The chat bot is in every edition now** (Derek: "add all the Streamlabs chatbot to every build"). The 🤖 Chat bot tab (your own commands, timers and quotes, with import and export) no longer needs dev mode.
- 📗 **Import straight from Streamlabs Chatbot's Excel file.** In Streamlabs Chatbot: Connections → Cloud → Pick Folder → Save Settings → Create Excel Files. Pick the **Data.xlsx** it makes in 🤖 Chat bot → 📥 Import: the Commands, Timers and Quotes pages are read in one go. You see what was found before anything is added.
- 🧭 **Setup guide: "Bring your old chat bot over"** (Derek: "add an export and import to the setup guide"): the steps above, an 📥 Import button and ⬇️ Export my chat bot (a file to keep or share).
- Not built yet from Streamlabs Chatbot's list: song requests, sound commands, points and ranks, betting, polls and the chat mini-games.

## 1.93.0
- 🍿 **Movie night voting** (made for Birx & Jess; in Derek's edition with dev mode on so it can be tried first). A new **🍿 Movie night** tab:
  - Type tonight's movies before the stream (with who asked for each, or paste a whole list). ▶ Open voting posts the numbered list in chat and pins it.
  - Chat votes with `!vote 3` or `!vote the name`. Birx's rules are built in: everyone gets **1 vote and 1 vote change**; **2 votes** if you raided tonight, were the first one to type in chat, or it's your birthday on a Wednesday or Sunday. You can also add a vote or an extra vote by hand.
  - 🔮 Every vote pops up in the app with **✅ Right / ❌ Wrong**, for whether the guess was right. The count shows on stream and is kept for tonight, all time and per chatter.
  - ⏳ **Last call**: a 5-minute countdown at the end (chat is told, the clock shows on stream, a one-minute warning), then voting closes by itself and the winner is posted.
  - 📺 A vote box for OBS (each movie's votes, the clock, the guess counter), and 📜 Past nights.
  - Test: 🧪 Test → 🍿 Movie night voting.

## 1.92.0
- 🏷️ **New name: TimePeace Chatbot** (Derek: "rename the whole project to TimePeace Chatbot"). The app, its window, the installer, the Help and Setup pages, pop-ups and the bot's chat lines now say **TimePeace Chatbot** instead of Movie Royal. True's edition is called **True’s Chatbot** and Birx's **Birx & Jess Chatbot**.
  - Only what you see changed. Your data folder, the program file and the installer file keep their old names, so nothing is lost and updates keep working. The desktop / Start menu shortcut is renamed on the next install.
  - Kept as they were, because other programs find them by name: the OBS sources ("Movie Royal celebration", "…capture window" and so on), the Stream Deck pages, the Backup Bots app and chat commands like `!moviesroyal`.
- 🎭 Channel names for the editions: Kirb = kirbgames, Birx & Jess = birxandjess, True = true_schu (Twitch and Kick).

## 1.91.3
- 🎭 The editions now point at their real GitHubs: Derek's (the dev version) = **TimePeaceChatbot**, Kirb's = **TimePeaceChatbotKirbEdtion**, True's = **TimePeaceChatbotTrueEdtion**, Birx & Jess's = **TimePeaceChatbotBirxandJessEdition**. Public stays where it is.

## 1.91.2
- 🎭 **Derek's edition = the dev version** (Derek: "TimePeace version will have everything along with tests for everything so I can test it before giving it to them"): it has every part and every feature made for the other editions, each with its 🧪 Test.
  - 👀 New: 🧪 Test → 🎭 Edition → **See the app the way another edition has it** (Public, Kirb, True, Birx). It hides what that edition leaves out so you can try it first. Nothing is removed; pick Mine or restart to get everything back.

## 1.91.1
- 🎭 **What each edition has** (Derek): **Kirb** = everything in the latest version. **True** = no movie battles and no Kirb wheels. **Birx** = no movie battles, no Kirb wheels and no card battles.
  - "No movie battles" hides the Discord movie battle, the 🤖 Discord & picks, 🎬 Movie info and 🚫 Banned Movies settings, the movie and Discord tests, and the movie steps of the Setup guide (movie search, ratings, Letterboxd, Discord bot, 24/7 bot, backup bots). The 🎬 Movie Pool tab is called 📋 Battle pool there, and the ready-made "Worse Movies" battle isn't added.
  - "No Kirb wheels" = the ready-made Wheel of Kirbportions isn't added. "No card battles" hides the 🃏 Card battles and 📦 Card pool tabs.
  - Void spots stay in True's and Birx's editions (off until you turn one on), but the Setup guide doesn't bring them up.

## 1.91.0
- 🎭 **Editions** (Derek: "make this app 5 things: one for Kirb, True, Birx, myself and public… customize them for each stream but still add things for everyone"): Movie Royal is still ONE app, but it now comes in 5 editions: **Public**, **Derek**, **Kirb**, **True** and **Birx**. A fix or feature for everyone is made once and goes to all of them; things made for one streamer are switched on only in that streamer's edition.
  - Each edition has its own GitHub for downloads and updates, so a copy only ever updates to its own edition. The current GitHub is the Public one: everyone already using the app keeps updating with nothing to do.
  - Installing an edition over the app you have keeps all your data (lists, wheels, history, settings).
  - 🛠️ **Dev mode** (marathon, game capture, chat bot, Kick…) now only exists in Derek's edition. In the other editions the same switch is just **🧪 Also install test builds**.
  - Settings → 👤 Account & updates says which edition a copy is. Test: 🧪 Test → 🎭 Edition → Which edition is this?

## 1.90.2
- 🎁 **Marathon battle: the rest of the snacks + prize descriptions** (🛠️ dev mode; Derek's photo of the haul): 7 things from the photo that weren't in the battle yet are added once (Dr Jolt, dark chocolate crickets, Bob Ross energy drink, Dirty Mountain Dew cream soda, Coca-Cola float, rose peach wafer sticks, Thai banana bread bites). Things you took out stay out.
  - 🎙️ Every thing now has a short game-show style **prize description**. When it wins, it shows on the 🏆 Last winner card of the Marathon tab so you can read it out. Change one with the 🎙️ button in the 🏃 Marathon pool (yours are never overwritten).
  - Test: 🧪 Test → 🏃 Test marathon battle → 🎙️ Prize descriptions (lists them all).

## 1.90.1
- 🎬🟢 **Clips work on Kick too** (🛠️ dev mode, Derek: "make sure the clip shortcut works on both Kick and Twitch"): the 🎬 Clip buttons, **Ctrl+Alt+C**, the fullscreen dot and `!clip` now follow the platform switch.
  - On **Twitch** nothing changes: a Twitch clip of the last minute, with its link.
  - On **Kick**: Kick doesn't let apps make clips yet (their developers have it on the wish list), so OBS saves the last minute as a video file on your PC instead (OBS's Replay Buffer). The pop-up says where it went, with 📂 Open the folder; chat gets "Clipped!" with no link.
  - One-time set-up in OBS: Settings → Output → Replay Buffer → tick Enable, 60 seconds. Movie Royal starts the buffer by itself when you go live on Kick (or on your first clip).
  - Test: 🧪 Test → 🎬 Clips → 🟢 Pretend Kick clip.

## 1.90.0
- 🟢 **Kick, part 1: chat** (🛠️ dev mode only; Derek: "make this work with Kick. Make it easy to switch it over"): Settings → 💜 Twitch → 🟢 Kick has one switch, **💜 Twitch / 🟢 Kick**. With Kick on, Movie Royal reads your Kick chat and answers there, so `!join`, the 🤖 chat bot commands, quotes, timers and the other chat commands work on Kick, and going live on Kick counts as your stream. Switching back is one click and nothing is deleted.
  - Reading chat only needs your Kick channel name. To let Movie Royal answer in chat you make an app on kick.com (Settings → Developer) and press 🟢 Sign in with Kick; the steps are in the app.
  - Kick mods, VIPs, subs and you are recognised (for mod-only commands and "who can use it").
  - Channel points, clips and raids are Twitch things: they rest while Kick is on. Kick subs / gifts / follows as alerts are not built yet.
  - Test: 🧪 Test → 🟢 Kick (a pretend Kick message).

## 1.89.0
- 🤖 **Chat bot, part 1** (🛠️ dev mode only; Derek: "make this app replace Streamlabs bot… adding commands, song request, sound alerts… allow imports for easy transfer"): a new **🤖 Chat bot** tab.
  - 💬 **Your own commands:** a name people type and what the bot answers, who can use it (everyone / followers / subs / VIPs / mods / only you), a wait between uses and per person, other names for it, on / off, and a count of how often it was used. Mods can add them from chat: `!addcom !name the answer`, `!editcom`, `!delcom` (or `!command add / edit / remove`).
  - 🔤 **Special words** in answers: `$user`, `$target`, `$arg1`…, `$msg`, `$count`, `$randnum(1,100)`, `$randusr`, `$uptime`, `$channel`, `$date`, `$time`. Streamlabs-style words (`$username`, `$targetname`, `{user}`, `{touser}`, `{1}`) work too, so imported commands keep working.
  - ⏰ **Timers:** messages every so many minutes, only while live (a switch) and only after chat has moved a few lines.
  - 📝 **Quotes:** `!quote`, `!quote 12`, `!quote word`; mods `!addquote` / `!delquote`.
  - 📥 **Import / export:** pick a file from your old bot (Streamlabs Chatbot style files, a spreadsheet saved as CSV, plain lines) or paste the text, look at what was found, then add it. ⬇️ Save mine as a file for a backup.
  - Still to come in the next parts: song requests, sound commands, points and chat games, and chat filters.
  - Test: 🧪 Test → 🤖 Chat bot.

## 1.88.3
- 🙋 **Pick who can !clip** (Derek: "add checkboxes for allowing who can clip: streamer, mods, VIPs, subs, following, none"): Settings → 💜 Twitch → 🎬 Clips now has boxes for who may type !clip: 🌍 Everyone (how it was), or any mix of 🎥 Streamer, 🗡️ Mods, 💎 VIPs, ⭐ Subs and 💜 Followers. 🚫 None switches chat clipping off. Someone who isn't allowed gets a short answer saying who it's for (at most once a minute). Your own 🎬 Clip button and Ctrl+Alt+C always work. Test: 🧪 Test → 🎬 Clips → 🙋 Who can !clip?

## 1.88.2
- 🙋 **!clip in chat** (Derek: "make it so !clip does the same thing and anyone in chat can do it"): anyone can type **!clip** to clip the last minute. The clip is named "Clipped by" and their name, the bot answers them with the link, and you get a pop-up in Movie Royal. At most one clip every 30 seconds. Switch it off in Settings → 💜 Twitch → 🎬 Clips. (Twitch still lists you as the maker of the clip, because your Movie Royal makes it: an app can't make a clip in a viewer's name.) Test: 🧪 Test → 🎬 Clips → 💬 Pretend viewer types !clip.
- 🎬 **Clip key is Ctrl+Alt+C** (Derek: "on any battle tab or fullscreen Ctrl+Alt+C does the clip command"): the clip key changed from Alt+C to **Ctrl+Alt+C**. It works on every tab, and in fullscreen too (the battle, card battle and game capture screens), also right after you clicked on the battle. Change it in Settings → ⌨️ Key binds if you like.

## 1.88.1
- 🎬 **Clips are 1 minute now** (Derek: "make clip 1 min"): the 🎬 Clip button, Alt+C and the fullscreen dot now clip the last 60 seconds instead of 30. That's the longest Twitch lets an app make; you can still trim it shorter with ✂️ Trim / name it.

## 1.88.0
- 🎬 **Clips** (Derek: "a clipping feature in all versions… a button on every battle and wheel tab, also the capture tab"): a **🎬 Clip** button on the ⚔️ Battle, 🃏 Card battles, 🎲 Chat battle, 🎁 Giveaway and 🎡 Wheel tabs (and 🏃 Marathon + 🎮 Game capture in dev mode) makes a Twitch clip of about the last 30 seconds of your stream. **Alt+C** does it from any tab. A pop-up gives you the link (▶ Watch it · ✂️ Trim / name it) and the link is posted in chat (Settings → 💜 Twitch → 🎬 Clips turns that off; your latest clips are listed there). Twitch only makes clips while you're live, and the first time you need to press Sign in with Twitch again (a new permission; Movie Royal doesn't nag about it, the button tells you). Test: 🧪 Test → 🎬 Clips (pretend).
- 🎮 **Game capture fullscreen: a faint clip dot** (🛠️ dev mode; Derek: "a small dot in the right corner… almost invisible"): in fullscreen there's a small, nearly see-through dot in the bottom right corner (the FPS number has the top right). Click it to clip: it turns yellow while Twitch works, green when the clip is made, red (with a few words why) when it couldn't be.

## 1.87.1
- 🎮 **Game capture: see-through FPS number** (🛠️ dev mode; Derek: "add transparency to the FPS"): the FPS number in the corner is now see-through (50% to start), with a 👻 FPS see-through slider next to 📈 Show FPS to make it more solid or fainter (0% to 90%).

## 1.87.0
- 🎮 **Game capture tab** (🛠️ dev mode only; Derek: "a tab that will show my Elgato capture card, so I play GTA 6 through the app… full screen, mute all battle sounds if on the tab, an FPS number in the upper right corner… FPS of gameplay"): a new **🎮 Game capture** tab shows your capture card's picture and plays its sound. Pick the card and its sound, press ▶ Start, then ⛶ Fullscreen (or **F**, or double-click the picture; Esc leaves, and the mouse pointer hides). **📈 FPS** in the upper right corner: the big number is the game's own speed (how many different pictures a second), the small one is what the card sends. While you're on the tab the battles inside Movie Royal make no sound (your stream still hears them from OBS), and the game's sound keeps playing even when another window is in front. It remembers your picks and starts by itself next time. Test: 🧪 Test → 🎮 Game capture (a pretend game at 30 or 60 FPS, no card needed).

## 1.86.3
- 🌙 **The movie count no longer starts over in the middle of a stream** (Derek: on his friend's last stream the final movie said it was the 1st movie): Movie Royal used to start a new "stream night" at midnight, and also every time Twitch said you went live again (like after an internet drop). Both set the count back to Movie #1 and emptied the list of who had chatted, and a re-go-live also refilled your streamer respins and brought voided wheel spots back. Now one stream night keeps going while you're live (past midnight too) and after short drops, and only starts over once you've been offline for **more than an hour**. Test: 🧪 Test → 🌙 One stream night.

## 1.86.2
- 🏆 **Race standings board** (Derek: "a position board on the right side that says what position the top 10 cars are for races"): on every race map with laps (Figure 8, Oval, Grand Prix, Night City… all the 🏁 races), the right side of the screen now shows the top 10 places while the race runs: place number, the car's paint colour, the name and which lap they're on. The leader is highlighted, wrecked cars show 💥 OUT, and when the race ends the winner shows 🏁 WIN at the top. Races without laps (💥 Last Bus Standing) and every other map have no board. The knock-out list on the right moves down under the board during races. Test: 🧪 Test → 🏁 Race with power-ups → 🏆 Standings board.

## 1.86.1
- 🌴 **The Vice videos go into OBS by themselves** (Derek: "videos are not installed on my OBS"; 1.86.0 only added videos you put on 🎬 My videos yourself, and the list was empty): when the Vice background, starting soon and thanks for watching videos are in your Videos folder, Keep OBS up to date adds them to 🎬 My videos and puts them in the matching scenes of each scene collection the first time it's open in OBS (never while you're live): the background in your Just Chatting scenes, starting soon in your starting scenes, thanks for watching in your ending scenes. The marathon scenes didn't have an ending scene, so they get a new **👋 Thanks for Watching** scene. 🗑 on one of them = it's never added again.
- 🙈 **Hide the scene's background** (a new box on each video): when a video goes into a scene, that scene's own full-screen background is switched off (Movie Royal's title card, or an overlay named after the scene like "Starting Overlay"), so the video is what you see instead of sitting hidden behind it. Turning the video off or removing it brings them back. On for the ready-made videos.

## 1.86.0
- 🔄 **Keep OBS up to date** (Derek: "give me an option to make sure new stuff is added to OBS"): Settings → 🎥 OBS → 🔄 Keep OBS up to date (on by default). When Movie Royal opens, and every 10 minutes, it checks the things it put in OBS for you (🎉 viewer's choice celebration, 📣 roll call, 🎬 your videos, and in 🛠️ dev mode the 🏃 marathon counter) and puts back anything missing. After an update it also tops up the 🧰 marathon scenes once with anything new the update brought (only while OBS has the marathon scenes open and you're not live). It never moves things you placed and never switches your scene. **🔄 Check OBS now** checks right away and lists what it found.
- 🎬 **My videos** (same place): add videos from your PC, like the Vice background and starting / ending screens, and tick which OBS scenes they go in. Movie Royal puts each one in OBS as a looping video source called "🎬 name", filling the screen and behind everything else, and takes it out of scenes you untick. Pick from your Videos folder, 📂 Browse anywhere, or paste the file's address. 📂 File swaps the video, 🔄 Restart plays it from the start (after you replaced the file), the switch takes it out of OBS without forgetting it, 🗑 removes it. Test: 🧪 Test → 🖥️ Screen → 🔄 OBS up to date + 🎬 My videos.

## 1.85.1
- 🎞️ **Scene keys for the Stream Deck** (Derek: "also going to want ones for my scenes for my stream"): the Stream Deck pages now have a **🎞️ Scenes** page with one key per OBS scene, each with its own picture (it uses the emoji at the start of the scene's name, or guesses one from the name: ⏳ starting, 💬 chatting, ☕ BRB, 😴 sleeping, 🍳 cooking, 🎮 gameplay…). Movie Royal reads your scenes from OBS when you press 🎛️ Add (or 🔄 Read my scenes from OBS), so have OBS open. Got a second set of scenes, like the marathon setup? Switch OBS to it and press Add again: you get a scenes page for each, with a 🔀 key to jump between them (more than 13 scenes = a ⏭️ More scenes key). The menu page's bottom-right key goes to the scenes. A scene key can go live right away (default) or go to the preview first when OBS Studio Mode is on. Test: 🧪 Test → 🧰 Test tools → 🎛️ Stream Deck buttons (the scene keys are in the list; they really switch OBS).

## 1.85.0
- 🎛️ **Stream Deck pages** (Derek: "I have a Stream Deck, let's make a page or pages and icons for that… I only have a 15 button one and need one left open for the home page"): Settings → 🖥️ App & background → 🎛️ Stream Deck → **🎛️ Add the pages to my Stream Deck**, and the Stream Deck app asks to import each page. Made like your own pages: one profile per section, linked with page keys, and the bottom-left key is 🏠 Home (it goes to your Stream Deck profile called "Home", or pick another one, or leave it empty). Pages: 🎬 Movie Royal (menu + the most-used buttons), 🎡 Wheel, ⚔️ Battle, 🃏 Cards & more, and in 🛠️ dev mode 🏃 Marathon + 🎬 Marathon stream (run next, start now, pause battles, ⏱️ timer, TTS, read chat, YouTube next/back/pause, 🍳 big camera 1/2/3, 🎙️ PC / cooking mic). Every key has its own picture and presses the same thing as the button in the app, in the background, so it works while you're in a game. ✓ on the key = it worked, ⚠ = it couldn't (Movie Royal pops up why). Each key's address has a secret key in it, so a web page can't press your buttons. Test: 🧪 Test → 🧰 Test tools → 🎛️ Stream Deck buttons.

## 1.84.3
- 🔇 **No more double sound** (Derek: "getting double audio with the app and OBS open with a scene with the app on it"): while OBS has a Movie Royal game screen open (the battle browser source, in any scene), the battle inside Movie Royal stays quiet, so every sound plays once (from OBS). As soon as OBS closes it, the app plays sounds again. Settings → 🔊 Sounds has the switch (**🔇 No double sound**, on by default) and shows how many game screens OBS has open. If you then hear nothing at all, the OBS source has "Control audio via OBS" ticked: turn on monitoring for it in OBS (Edit → Advanced Audio Properties → Monitor and Output) or untick it. Test: open OBS with a battle scene and look at the number in Settings → 🔊 Sounds.

## 1.84.2
- 🔋 **The battle screen inside Movie Royal only starts when it's needed** (Derek): it loads the first time you open the ⚔️ Battle, 🃏 Card battles or 🏃 Marathon tab, open the preview window, or a battle starts (even from another tab). If you only use the wheel, it never runs at all. Once it's loaded it stays loaded: switching tabs never resets the board, and a battle is never stopped (the battle itself runs in Movie Royal and OBS, the screen only shows it).

## 1.84.1
- 🔋 **Less power in the background** (Derek): when Movie Royal is minimized or covered by other windows, the battle inside it draws small and at 30 fps (like it already did on other tabs). The battle keeps going and sounds still play; it's back to full the moment you look at it. Part of 🔋 Power saver (Settings → 🎨 Graphics, on by default). Nothing on stream changes.

## 1.84.0
- 🛠️🎬 **New marathon scenes** (Derek): press 🧰 Marathon OBS setup again (Marathon tab) and it adds them. Nothing you moved yourself gets moved.
  - ⚔️ **Battle:** the battle full screen (bigger than it was in Just Chatting) with a small camera.
  - 💬 **Just Chatting:** your camera full screen. The old background + battle there are hidden, not deleted.
  - ☕ **Be Right Back:** its own scene now, with YouTube videos over a Be right back screen. "⏳ Starting Soon / BRB" is renamed ⏳ Starting Soon.
  - 😴 **Sleeping:** YouTube videos full screen, your camera small, the sleeping banner on top.
  - 🍳 Cooking is still there (3 cameras).
- 🛠️📺 **YouTube videos for BRB + Sleeping:** Marathon tab → 📺 YouTube videos → ✏️ Videos…: paste links (videos or whole playlists), one per line, 🔀 Shuffle for each. They loop forever, skip videos that can't be played outside YouTube, pick up where they left off when the scene comes back, and their sound goes on stream (OBS's Audio Mixer has a slider; there's a volume slider too). ⏮ ⏯ ⏭ buttons, key N = next video. Try it: 🧪 Test tab → 📺 YouTube videos.
- 🛠️🎞️ **OBS frame rate:** the Marathon tab's OBS card shows what OBS runs at, with a **Make it 60 fps** button (not while live or recording).
- 🎞️ **Less work for OBS:** Movie Royal's title screens stop animating while OBS isn't showing them (and never draw faster than 30 fps), and a battle source that's hidden in a scene draws small at 30 fps until it's shown. That's graphics card time OBS can use for what's on stream.

## 1.83.3
- 🛠️🎲 **No luck pick = a random thing gets it** (Derek): when you press ▶ Run for a paid battle and that person didn't pick a thing for their 🍀 luck, a random thing gets the +1% (no more saving it for later). The chat message says which one.
- 🛠️🔴 **Red +1% on the guess pop-up:** the thing that just got this battle's luck (their pick, or the 🎲 random one) shows a red **+1%** next to its luck on the "Guess the winner" pop-up and the side panel.
  - Try it: overlay preview `marathon.html?demo=1&guess=1&big=1`, or 🧪 Test tab → 🎟️ Paid battles: add a $5 tip, then ▶ Run it on the Marathon tab without a luck pick.

## 1.83.2
- 🛠️🍀 **Luck goes on when you press ▶ Run** (Derek): a 🍀 luck pick for a waiting paid battle doesn't count for any other battle. It goes on the moment you press ▶ Run for that person's battle (before chat guesses, so the guess pop-up shows it), and comes back off if you ✕ cancel the guess. Until you press ▶ Run, they can change their luck and map in chat or on the website as much as they like; after that they're locked in (chat tells them so).
  - Try it: 🧪 Test tab → 🎟️ Paid battles → 🍀 Luck goes on at ▶ Run?

## 1.83.1
- 🛠️😴 **MERCY can't win twice in a row** (Derek): when MERCY wins a marathon battle, it sits out the next battle, then it's back in the one after. Any thing can do this: tick 😴 next to it in the 🏃 Marathon pool (MERCY has it ticked already). While it's sitting out it shows 💤 resting (click it to put it back in early). Practice battles don't count.
  - Try it: 🧪 Test tab → 😴 Sits out after a win.

## 1.83.0
- 🛡️ **Spam bots get banned by themselves** (Derek): when someone's first message in your chat is selling viewers, followers, "promotion" or art (emotes / overlays) with a way to buy it (a site, "dot com", Telegram, Discord, "DM me"), Movie Royal deletes the message and bans them. Subs, VIPs, mods and you are never touched, and regulars aren't checked. Settings → 💜 Twitch → 🛡️ Spam bots: on / off, ban / time out for a day / only delete, and a list of everyone it caught with ↩️ Unban.
  - Try it: 🧪 Test tab → 🛡️ Spam bots (type a message, or ✅ Check the samples; nothing is banned). Pretend chat messages never ban anyone.
- 🛠️🔈 **Read chat to me, only you hear it** (Derek): 🏃 Marathon tab → 🔈 Read chat to me. A Windows voice reads every chat message on the speaker you pick (your headphones), never on stream. It's a different voice from your tip / channel point alerts and leaves cheers, channel point messages and highlighted messages out (the alerts read those). Commands, bots and your own messages are skipped, links are said as "a link", emotes are left out, and when chat is busy older messages are skipped so it keeps up. Pick the voice, speed and volume; ⏭️ Skip message, 🧹 Clear, 🔊 Test. Keys: V on / off, B skip.
  - Nothing is read until you pick the 🎧 speaker, and an unplugged speaker skips the message instead of playing it somewhere else.
  - Try it: 🧪 Test tab → 🔈 Read chat to me.

## 1.82.9
- 🛠️💪 **5 push-ups instead of 10** (Derek): the 🏃 Marathon Battle's “10 push-ups” is now “5 push-ups”. Your marathon battle gets changed once by itself; if you renamed it yourself it stays as it is.

## 1.82.8
- 🛠️⏱️ **Total live time on every marathon scene** (Derek): the marathon overlay shows how long you've been live (top right; in 🎮 gameplay right next to the small battles owed counter). Only live time counts: when you restart the stream (for the co-stream and after it) it pauses and carries on when you're back. 🏃 Marathon tab → ⏱️ Total live time: 🔁 Automatic (streams with less than 6 hours offline between them count as one marathon), 🏁 Start counting now, 📺 This stream only, ✏️ Fix the time…, which corner, and on / off.
- 🛠️▶ **VOD links after stream restarts:** each restart is its own Twitch VOD, so battles now always link into the VOD of the stream they were in. Right after a restart (before Twitch knows the new stream) the link fills in by itself a minute later instead of pointing at the old VOD. A VOD you delete (like the co-stream part) stops getting links on the website.
  - Try it: 🧪 Test tab → ⏱️ Total live time (Show the counter, 👀 Preview, 🎮 Small one, ▶ VOD links).

## 1.82.7
- 🛠️🎙️ **Mics switch with the scene** (Derek: GoXLR on the PC, wireless mics for cooking): 🧰 Marathon OBS setup now adds “🎙️ Cooking mics (wireless)” to the 🍳 Cooking scene and picks your wireless mics' USB receiver by itself (not the GoXLR or a camera mic). With 🔁 Auto switch on, going to 🍳 Cooking turns the wireless mics on and mutes your PC mic (GoXLR); going to any other marathon scene turns the wireless mics off and puts back exactly the mics it muted. Your normal OBS scenes are left alone.
  - 🏃 Marathon tab → 📺 On stream → 🎙️ Mics: 🔁 Auto switch ON / OFF, 🎙️ PC mic / 🍳 Cooking mics (switch right now), ⚙ Which mics… (pick which mics count as your PC mic). Press 🧰 Marathon OBS setup again to add the wireless mics.
  - Try it: 🧪 Test tab → 🎙️ Mic switching shows what it would mute and turn on (nothing changes). Tested against a pretend OBS only.

## 1.82.6
- 🛠️🔔 **Chat reminders for people waiting** (Derek): when someone whose marathon battle has been in the line 30+ minutes types in chat, the bot says in chat “@you … is here and has a battle waiting”, so you can run it while they're here (once per person every 30 minutes, plus a pop-up in the app). 🏃 Marathon tab → 🎟️ owed card: **🔔 Chat reminders: ON / OFF** (or the **R** key) and the minutes.
  - Try it: 🧪 Test tab → 🔔 Waiting reminders shows what it would say (nothing sent).

## 1.82.5
- 🛠️😱 Scares on my screen now pop up on **every screen** at once (Derek). 🏃 Marathon tab → 😱 Scares on my screen can still set it to only the screen your mouse is on. The sound (if you turn it on) plays once, not once per screen.

## 1.82.4
- 🛠️🎯 Marathon: chat now gets **90 seconds** to guess the winner (was 60), in case of stream lag. If yours was still on the old 60, it moves to 90 by itself; a time you picked yourself stays (Settings → 💰 Rewards & prices → 🎯 Guess countdown).
- 🛠️🍀 The **guess the winner** pop-up and the **"got a battle" pop-up** (where chat gives luck) now show every thing's 🍀 luck, 0% too (green when it has some).
  - Try it: 🏃 Marathon tab → 📺 On stream → 👀 Preview, or 🧪 Test tab → 🎟️ Paid battles → 🎯 guess test.

## 1.82.3
- 🛠️🗣️ **Text to speech buttons on the 🏃 Marathon tab** (dev mode, Derek): ⏭️ Skip voice (key K) stops the text to speech that's talking, 🔇 Mute TTS / 🔊 Unmute TTS (key M) stops or starts it reading messages. They type !skiptts / !ttsoff / !ttson in your chat as you, so the StreamElements jump-scare alerts hear them on stream and on your phone. ✏️ Commands… changes the words.
  - Try it: 🧪 Test tab → 🗣️ Text to speech buttons (nothing is sent to chat).
- 🛠️😱 **Scares on my screen** (dev mode, Derek): when a follow, sub, gift sub, bits, tip or raid comes in, the same Neon Nights jump scare as the StreamElements alerts pops up in a see-through window on top of whatever you're using (the screen your mouse is on, or every screen), so it scares you even mid-game. Clicks go through it. Small / medium / big by the money, like the alerts. Sound off by default here. On the 🏃 Marathon tab; works over windowed / borderless games.
  - Try it: 🧪 Test tab → 😱 Scares on my screen pops a real one up.

## 1.82.2
- 🔄 **Updating while you're live** (Derek): when Movie Royal closes (an update during stream) and opens again within 30 minutes, it picks up where you left off. Your wheels (spots on / off, voided spots, countdowns, sizes, the last landing), battles, pools, luck and Discord picks were already saved all the time; now these come back too: the map you picked, a best-of series, the winner card still waiting for !accept / !pass (with its countdown), the join timer and chat's votes. A message tells you what came back.
  - The wheel's round timer comes back paused (press ▶ to keep going). A battle that was playing right then can't carry on mid-fight: nothing of it counted, so press Start again.
  - Try it: 🧪 Test tab → 🔄 Pick up where you left off shows what would come back if it closed right now.

## 1.82.1
- 🛠️ The last few marathon OBS bits are dev mode only too: putting the marathon counter + pop-up in OBS, and changing the title screen words or the paused message. With dev mode off nothing marathon touches OBS.
- 🏴‍☠️ Checked: the Pirate Battle is on the 🃏 Card battles tab (it came in 1.73.0, which wasn't a latest release until now).

## 1.82.0
- 🎮 The marathon's GTA 6 Gameplay scene is more minimal: the game, a small camera in the bottom right and a tiny "battles owed" tag at the top middle (pop-ups and battles still show full size). Already made the setup? Press 🧰 Marathon OBS setup again: your camera moves to the new spot only if it's still where the old setup put it.
- 🍳 New 🍳 Cooking scene in the marathon OBS setup: 3 cooking cameras, 1 big + 2 small, plus the title background and the battle (hidden). Movie Royal picks the cameras your stream camera isn't using; 📷 1 / 2 / 3 on the 🏃 Marathon tab makes that camera the big one.
- 🤝 New 🤝 Co-stream (GTA 6) scene: the game + your camera on your side; your partner's camera (and their battle) go in this scene on their side. The 🤝 Co-stream share scene the co-stream sends is made too.

## 1.81.2
- 🌐 The viewer website is a 🛠️ dev mode thing for now: Settings → 🌐 Viewer site, the Test tab card, the Setup guide step and !site only show (and the site only runs) with Dev mode on. Turn Dev mode off and the website goes offline; turn it back on and it comes back with everything as it was.
- 🧪 Test marathon battle (🛠️ dev mode only): 🧪 Test tab → ⚔️ Battles → 🏃 Test marathon battle plays your real Marathon Battle (its things, pictures, odds and chat luck) as a practice round on a character map you pick (or your marathon map / random). Nothing counts: no battle from the line is used, the winner doesn't count, chat luck stays and nothing goes in the history. If a timed thing wins, its ⏱️ timer pops up so you can try it.

## 1.81.1
- 🎲 Every thing in the 🏃 Marathon Battle starts with even odds (1 each). Your marathon battle gets even odds too when you update (only because you hadn't changed any odds yourself; change them any time in the Marathon pool).
- 🏃 The built-in Marathon Battle is now your pool as you set it up: your small lines (Pickle Balls “1”, Jolt “1 can”…) and without Toxic Waste x3, CHAT'S CHOICE and DOUBLE. (➕ Add a fresh copy uses it too.)

## 1.81.0
- 🗺️ Marathon battles only use character maps now: no ball or car maps (the map list chat picks from, random picks and the battle on screen). Any battle in the line that had a ball map gets a character map instead.
- 🗺️ Pick the map yourself: the new 🗺️ Map box on the 🏃 Marathon tab sets the map for battles where nobody picked one (🎲 Random each battle, or always the one you pick). A map chat picked, or the menu on a battle in the line, still comes first.
- 🧪 Test tab → 🏃 Marathon: 🗺️ Marathon maps shows the maps and which ones the next battles would get.

## 1.80.3
- 👀 Preview the viewer page right inside Movie Royal: 🧪 Test tab → 🎬 Scenes → 🌐 Viewer website → 👀 Preview the viewer page (also 👀 Preview in Settings → 🌐 Viewer site). A pretend page (made-up battles, guesses, a poll; works without the 24/7 bot) or your real site, at 💻 computer or 📱 phone size.

## 1.80.2
- 🌐 Fixed: Settings → Viewer site was empty (only the top text showed) when you had never run a poll. Everything shows again, including the new 🔑 Let viewers sign in steps.

## 1.80.1
- 🔑 The viewer website's Twitch step is easier: Settings → 🌐 Viewer site → 🔑 Let viewers sign in is now 4 numbered steps: 📋 your website's address with a Copy button right there, 🟣 a button that opens dev.twitch.tv (and the end of your Client ID, so you know which app to press Manage on), exactly where to paste it, and ✅ Check it, which asks Twitch if it knows the address yet (✅ Done / ⚠️ Not done yet). 🔑 Try signing in on the site opens it like a viewer.
- The website always sends viewers back to the same address after signing in (a / at the end of the address used to make Twitch say no).
- 🧪 Test tab → 🌐 Viewer website: what ✅ Check it says for each answer Twitch can give.

## 1.80.0
- 🏃 Your Marathon Battle is built into the app now (🛠️ dev mode only): every eat, workout and wild card with its odds. It's added once, the first time the app opens in dev mode, and becomes the marathon battle if none is picked (if you already imported it, that one is used instead). Marathon pool → ➕ Add a fresh copy brings a new copy back.
- ✏️ Edit the pool in the 🏃 Marathon pool tab: 🎲 odds for each thing (with its ≈% chance to win right now), move things with ▲ ▼ or by typing a new number (the numbers chat types), and change the battle's name and its title on screen. (Name, small line, pictures, 🥫/🏋️, ⏱️ and 🙈 were already there.)

## 1.79.1
- 🛠️ **The marathon stuff is dev mode only now** (Derek: "none of this should show up unless in dev mode"). With dev mode off, nothing of it shows or runs: no 🏃 Marathon / Marathon pool tabs, no paid battles (tips, bits and subs don't add battles, no map/luck picks in chat, no guess countdown, no pop-ups, no exercise timer, no paused message, no marathon OBS setup), things don't fight as themselves, Neon Beach isn't in the test lab, the website's 🎟️ Battles owed tab is gone, and the key binds list, Settings search, Test tab and Help page leave those parts out. The Dev mode switch no longer names the marathon tabs. Your marathon settings are kept: turn dev mode back on and everything is where you left it.

## 1.79.0
- 🧰 **Marathon OBS setup** (Derek: "I want to make a new OBS profile for this stream"): Marathon tab → 📺 On stream → **🧰 Make my marathon OBS setup…** makes a separate OBS setup so your normal one stays exactly as it is:
  - **A new profile** (“GTA 6 Marathon”), copied from the one you're on: stream key, video size, frame rate, bitrate and recording settings.
  - **A new scene collection** with 🎮 **GTA 6 Gameplay** (game capture full screen, camera bottom left, the battle hidden until you want it), 💬 **Just Chatting** (synthwave background, big camera, the battle), 😴 **Sleeping / AFK** (camera full screen + a "Shh… sleeping stream" banner) and ⏳ **Starting Soon / BRB** (a big neon title screen with the battles owed). Every scene already has the battles owed counter and pick pop-ups (plus 🎉 Viewer's Choice and 📣 roll call if you use them).
  - OBS doesn't let apps copy a camera or game capture between scene collections, so it makes new ones: double-click them once and pick your camera / GTA.
  - Change the names and the title screen words in the same window, 🔎 see what it would do first, and **🏃 Use it** / **↩️ Back to normal** switch OBS between the two setups. Pressing it again only adds what's missing; anything you moved stays put. OBS won't switch profiles while you're live, so make it before you go live.
  - The title screen switches between ⏳ Starting soon and 👋 Be right back with one menu on the Marathon tab.
- 🔧 Fixed: the Test tab's 🔎 Check a name box didn't answer.

## 1.78.1
- ⏸ **The paused message pauses the battles** (Derek: "when I turn on the source it will pause the battles, and turning it off will resume them"): on the 🏃 Marathon tab, **⏸ Show it + pause battles** shows the scrolling message AND pauses the paid battles (▶ Run is off; new battles still go in the line). **▶ Hide it + resume battles** takes the message off and starts them again (key: **P**). The bot says it in chat, the battles owed counter on stream says ⏸ Paused, and the "got a battle" pop-up and chat line tell people theirs is safe in the line. Switched scenes while paused? **📌 Show it in [scene] too** adds the message there. If OBS isn't open, the battles still pause (it tells you it couldn't show the message).

## 1.78.0
- 📜 **Paused message** (Derek): on the 🏃 Marathon tab, **▶ Show it** puts a line of white text scrolling right to left across the stream, in the OBS scene you're in right now. It says battles are paused, every battle is safe in the line and will run when they're back on, people who can't stick around can come say hi any other time during the stream, any left at the end get run in the last part of the stream, and the VOD will be up to watch later. **⏸ Hide it** takes it off in every scene (key: **P** on the Marathon tab). ✏️ Words & look… changes the words, speed, size, top or bottom, and an optional dark strip behind it; changes show on stream right away. Test tab → 🏃 Marathon fighters → 👀 Paused message shows it in a window.

## 1.77.0
- 🥫 **Marathon things fight as themselves** (Derek: "if it's a can it will be that can… if it's a bag of chips then that bag of chips"): Movie Royal finds a picture of each thing in the marathon battle on the internet by itself, cuts the background away and gives it googly eyes, arms and legs. 🔄 in the Marathon pool tries the next picture; 🖼️ still uploads your own. Things with no picture yet fight as a coloured block with their name.
- 🏋️ **Workouts fight as characters in gym clothes holding a sign** with the exercise on it (push-ups, sit-ups, squats, plank, wall sit, burpees…). The new 🥫/🏋️ menu in the Marathon pool changes it if it guessed wrong.
- 🗺️ The maps chat can pick for a marathon battle are now **every character and card battle map** (they're numbered again on the pop-up, in chat and on the website).
- 🌴 **Neon Beach** (Derek: a map just for these battles): an 80s beach city at sunset, all our own design: a striped sun over the sea, pastel hotels with buzzing neon signs, palm trees, synthwave music, and pastel convertibles that come speeding down the beach drive (headlights and a ⚠️ first) and send anyone in the way flying. It has its own FINAL FIGHT finishers and celebrations. It's only in the marathon battle's map list.
- ⏱️ **Exercise timer** (Derek: "I have a wireless mouse to start the timer, but have an alarm go off for 5 seconds"): when a timed one wins (“45-second plank”, “1 minute wall sit”, “1:30”…, or the ⏱️ seconds you set in the Marathon pool), Movie Royal jumps to the front and the whole window becomes a "click anywhere to start" button: any mouse button or Space. The countdown shows on stream in the marathon overlay, and an alarm rings for 5 seconds at 0 (Settings → 💰 → 🥫 Fighters + ⏱️ timers).
- 🎯 **Guessing pop-ups**: when chat starts guessing, a big pop-up fills the middle of the stream (every thing numbered + the countdown), then slides to the side so the battle can be seen. Everyone who guesses right gets their own "got a battle" pop-up.
- 🧪 Test tab → 🏃 Marathon fighters, ⏱️ timer + 🌴 Neon Beach: pretend marathon battles (ball map, Neon Beach, a character map), pretend timers, the stream timer and big guess pop-up, and a name checker.

## 1.76.0
- 🛠️ **Dev mode** (Derek): the old "Also install test builds" checkbox is now **Dev mode** (Settings → 👤 Account & updates). It still installs test builds, and it shows features that are still being tried, like the new 🏃 tabs. Friends who leave it off don't see them.
- 🏃 **Marathon + Marathon pool tabs** (dev mode): every sub, gift sub (one battle each, so 5 gifts = 5 battles), $5 tip or 500 bits adds a battle with that person's name to a line **under the battle screen**. Run anyone's battle whenever they're around (👀 here = they chatted in the last 20 minutes); whatever's left at the end of the stream stays in the line for next time.
- 🗺️🍀 **Chat picks the map and the luck**: whoever gets a battle types **map 3** and **luck 12** in chat (or picks on the 🌐 viewer website, which has screenshots of every map), until you press ▶ Run. A pick made on the website can't be changed from chat. No map = a random one. The +1% luck goes on when their battle starts and stays on that thing until it wins, then starts over; no luck pick = they can still give it later.
- 📣 **On stream (OBS only, not in the app)**: a pop-up when someone gets a battle (who, every map numbered, every thing numbered, the website link) and a **battles owed** counter in a corner. 🎬 Put it in OBS and pick the scenes (sleeping, cooking…).
- 🎯 **Guess the winner** (Derek): ▶ Run gives chat a 1-minute countdown first. They type the number of the thing they think wins (one guess each). Everyone who's right wins a battle, added to the line in the order they guessed, so they pick in that order.
- 📺 **Ad warnings** (off by default, Settings → 💜 Twitch & channel points): the bot tells chat about a minute before an ad break and again when it's over, and Movie Royal pops up a note with a ding so you know too. Needs one extra Twitch permission: sign in with Twitch again once after turning it on.
- 🌐 The viewer website has a 🎟️ **Battles owed** tab (your 24/7 bot needs a quick update for it). 🧪 Test tab: 📺 Ad warnings card and 🏃 Marathon picks buttons on the 🎟️ Paid battles card.

## 1.75.0
- 🌐 **Viewer website** (Derek: "a bootleg extension"): viewers type **!site** in chat and get a website with your stream + chat, the battle that's on right now (who's in, their odds, who paid for it), **every battle in the history with who paid and a ▶ VOD link to that moment**, 🍽️ everything you've tried, 📊 stats (who paid for the most battles, totals), and their own page. Signed in with Twitch, viewers can **🔮 guess who wins** (longer odds = more points, with a 🏆 leaderboard) and **🗳️ vote in polls** you start from Movie Royal. It runs on your ☁️ 24/7 Discord bot (your PC stays private, the site stays up while it's off). Turn it on in Settings → 🌐 Viewer site (the 24/7 bot needs a quick update; one time on Twitch you add the site's address so viewers can sign in: the tab shows how).
- 🎟️ **Paid battles** (Derek: "$5 donation, 500 bits or 1 sub gets a battle"): every tip, bits or sub that reaches the amount adds a battle with that person's name to a line on the Battle tab. Press ▶ Start next when you're ready: it switches to the battle you picked (like your Marathon Battle), chat hears who it's for, and the history and the website show who paid. Leftovers carry over per person (two $3 tips = one battle), gift subs count one each, ➕ adds one by hand, nothing is ever refunded. Settings → 💰 Rewards & prices → 🎟️ Paid battles.
- 👀 **Watch your co-streamer's battles** (Derek + Kirb): when your partner's battle starts, a note pops up in Movie Royal with 👀 Watch: their battle in a small window you can drag around (it closes by itself after it ends). Card and character battles count now too, so their battle also pops up on your stream whatever kind it is.
- 🧪 Test tab: 🎟️ Paid battles (pretend tips, bits and subs), 🌐 Viewer website (a demo page with pretend battles, guesses and a poll, plus what the site would get right now), 👀 Watch your partner's battle. Setup guide: new 🌐 Viewer website step.

## 1.74.0
- 🧹 **Inactive people's movies** (Derek): when someone hasn't been in a battle for **3 months** (none of their movies was on the cliff in a real battle), their movies go back so anyone can pick them in Discord. With no movies left they get a fresh set of picks, so they can pick them again later. On by default.
  - Each battle with people's movies has its own switch and time limit in **Settings → ⚔️ Game → 🧹 Inactive people's movies**: a number box + days, weeks, months or years.
  - **👀 Who's next** shows everyone with movies in that battle, when they were last in a battle and the day their movies would go back. **🧹 Check now** checks right away (it also checks by itself every hour, never while that battle is playing).
  - It counts back through your saved battle results, so it works right away. Someone with no battle on record only counts from as far back as those results go, and someone who just picked their first movie gets the full time. Practice battles don't count.
  - Nothing is deleted: ▶ Bring back in the Movie Pool puts a movie back in. Every time it happens there's a line in History → 🧾 Everything.
- 🧪 Test tab → 🎬 Movie nights → **🧹 Inactive people's movies**: try any limit on a pretend battle of 6 people (nothing is saved).

## 1.73.2
- 🏃 The ready-made Marathon Battle is out of the app again (Derek: he'd rather import it). It's a battle file now: Movie Pool → 📥 Import → drop the file. If 1.73.1 already made one for you, it stays until you delete it.

## 1.73.1
- 🏃 **Marathon Battle** (Derek): a ready-made battle on the Battle tab for the GTA 6 marathon sub battles: 21 things to eat or do (Pickle Balls, Toxic Waste, salt licorice, durian candy, octopus, push-ups, squats, burpees, the shock lie detector, plus MERCY, CHAT'S CHOICE and DOUBLE). The nasty ones have lower odds, so they win less often. Change any odds or add more like any battle. Made once: delete it and it stays deleted.

## 1.73.0
- 🏴‍☠️ **Pirate Battle in card battles** (Derek): the Pirate Battle map is on the 🃏 Card battles tab now too (and 🎲 Random can pick it). Your packs are split into two even crews, a 🔴 red crew on the *TimePeace49* and a 🔵 blue crew on the *Kirbgames*, and each pack wears a pirate hat or a bandana in its crew's colour (some get an eye patch, some hats have a little skull and crossbones). Everything else works like it does with characters: packs only fight the other crew (across the gangplanks, swinging over on ropes, with the cannons firing across), off the side = into the sea, it always comes down to one pack from each crew, then the 🐙 kraken, the 360° camera and the 🥊 FINAL FIGHT with a pirate finisher and celebration. The crews are mixed again for every fight. Every pack still has the same chance, and the winner comes off your Card pool like any card battle.
- ⛈️🐒 Chat's storm powers (Big wave, Lightning bolt, Tentacle swipe) and Take out Time / Take out Kirb work during a card Pirate Battle too: the rewards come on by themselves when it starts and go away when it's over. They never change who wins.
- 🧪 Test tab: 🃏 Card battle tests → **🏴‍☠️ Pirate Battle** (10 pretend packs, your pool doesn't change). The 🏴‍☠️ Pirate Battle card has a new **Who fights** choice (🧍 characters or 📦 card packs) that all its buttons follow (practice battle, straight to the kraken, Test lab, finishers, storm and monkeys). 🧪 Quick test lab: **Who fights** on card maps (card packs or characters). 💀 Finishers & celebrations: watch them with packs or characters. 🤖 Test all checks the pirate finishers with packs too.
- 🔀 The wacky "Teleport switches" never swaps a pirate who's swinging on a rope or in the sea.

## 1.72.0
- ⏪ **Undo goes all the way back** (Derek): ⏪ Undo and ⏪ Go back… under the wheel now take back every step, all the way to the start of the wheel (right before its first spin since the last ↺ Reset), not just the last 60. **⏮️ All the way back to the start** does it in one go, and **Show older steps…** lists more. The steps are saved, so closing Movie Royal doesn't lose them. Going back puts back the wheel, its spot sizes and the round timer (it waits for you), and if another wheel changed since then (like one a 🔀 linked spot spun), that one too. Saved respins and streamer respins that the taken-back spins used come back; saved spins someone got another way (like from a sub) stay. 🧪 Test → 🎡 Wheel → ⏪ Undo all the way back checks it on a pretend wheel nobody sees.
- 🍀 **Luck in your own battles** (Derek: a battle of stuff for you to do): battles of words, pictures or movies that you fill yourself can have the Discord battle's luck (off by default). Every battle, everything that loses gets a little luckier (+1% by default, set it per battle in Settings → 🍀 Luck), so things that keep losing get more and more likely. A winner **stays in** (only you take things out) and only its luck starts over. Chat can't join these battles. Turn it on with **🍀 Luck** above the list on the Battle tab, in Settings → 🍀 Luck, or with the new 🍀 box when you make a battle. Luck shows (and can be changed) in the Battle list and the Pool. 🧪 Test → ⚔️ Battles → 🍀 Luck in your own battles plays 6 pretend battles.
- 🧾 **History → 🧾 Everything** (Derek: "a complete history"): a new History tab with a line for everything that happens, newest first, kept for good: every wheel spin and where it landed (who spun it and how), the round timer, grows, voids and undos; every battle that starts (with everyone's chance and luck) and who won it; claims and passes; luck earned, lost and started over, and chat calling the winner; card packs that won; free spins given and used; every channel point redeem; subs, gift subs, bits and tips; chat joins, raids and follows; Discord picks and swaps; going live and new weeks; and changes you make to a battle's entries and odds. Nothing is ever taken out of it (even an undo is added as its own line). Pick the kinds you want, search it, hide practice battles and tests, and ⬇️ download it as a spreadsheet file. New lines show up as they happen. It starts with what the older history lists already had (wheel spins, battle wins, card packs, free spins, alerts).
- 🎡 Fixed: growing, shrinking or doubling a spot on a wheel other than the one that was spun last, then pressing ⏪ Undo, now takes back the right wheel (and an undo after growing a hidden spot hides it again).

## 1.71.1
- ⏭️ Co-stream setup can be skipped (Derek): **⏭️ Skip cameras** in the Co-stream tab (co-stream with only chaos linked, nothing sent or added to OBS; turn cameras back on any time), **✅ I did it, hide this** on the one-time OBS reminder (📌 brings it back), and **⏭️ Skip co-streaming** on its Setup guide page (it won't pop up again). The start-up pop-up already had Don't show again / Later.

## 1.71.0
- 🤝 **Co-stream with a friend** (Settings → 🤝 Co-stream, Derek + Kirb): two Movie Royals linked for a shared stream. One of you presses **🎟️ Make an invite code** (your ☁️ 24/7 bot hosts a private room), the other pastes it and presses **🤝 Join**. After that it reconnects by itself whenever Movie Royal is open.
- 📷 Cameras: each side sends its camera + game screen (OBS's Virtual Camera shows a new **🤝 Co-stream share** scene, a hidden window sends it with VDO.Ninja, about 2.5 Mbps, no sound). Your friend's picture shows up in your OBS by itself as **two pieces**: their camera (on their side, move it anywhere) and their battle.
- ↔️ Camera sides (Derek: Kirb on the left, Derek on the right, on both streams): **↔️ My camera's side** in the Co-stream tab. Your friend's camera is put on their side in your OBS and yours on your side in theirs. The one who invites starts on the right, the one who joins on the left.
- ⚔️ Their battle pops up on your stream by itself while it runs and hides when it's over. It's the real game screen from their OBS, so both streams show the exact same fight (about a quarter second behind).
- ⚡ Chaos across chats: while your battle isn't running and your friend's is, your viewers' channel point / bits chaos goes into **their** battle ("@viewer sent Comet into Kirbgames' battle! 🤝"), and theirs into yours. While your own battle runs, chaos stays in yours. Either of you can switch it off.
- 🩺 **Lag check**: shows whether trouble is the internet (dropped frames → 📶 quality Low, about 1.2 Mbps) or the PC (skipped frames → OBS's hardware encoder). 📶 quality: Low / Normal / High.
- 📌 One thing you set by hand, once, in OBS: ⚙ next to Start Virtual Camera → Output type: Scene → 🤝 Co-stream share. **👀 What my partner sees** checks it.
- ☁️ 24/7 bot v17 hosts the co-stream room. Only the one who **invites** needs it (an update box shows right in the Co-stream tab); the "Update your 24/7 bot" start-up pop-up no longer asks just for this, so a friend who only joins isn't nagged.
- 🧭 Setup guide: new 🤝 Co-stream step. 🧪 Test tab → 🤝 Co-stream (pretend partner): try it alone, nothing is sent anywhere.

## 1.70.1
- 🎥 Calmer auto camera in battles (Derek: it bounced too much). It no longer zooms in on every knockout and back out, doesn't lean toward every hit, ignores small moves, and zooms in slowly (it still zooms out quickly enough that nobody leaves the picture). In a test Pirate Battle it moved about a tenth as much. Ball battles got the same calmer camera.
- 🐒 Both monkeys die in every Pirate Battle now: the loser goes overboard in the sword fight (its ghost floats up), and the winner always gets taken out right after it celebrates, one of the 20 ways. Chat can still take either one out first with Take out Time / Take out Kirb; if that happens during the sword fight, the other one wins it and still gets taken out a moment later. (In the 🙈 revenge kick, the loser's ghost does the kicking.)

## 1.70.0
- ⛈️ The 🏴‍☠️ Pirate Battle now happens in a big storm: black storm clouds, rain blowing across the screen, lightning flashing in the distance with thunder, and a rough sea.
- 🌊⚡🐙 Chat's storm powers (channel points, only on while a Pirate Battle plays): **Pirates: 🌊 Big wave** (500) crashes a huge wave over one of the ships and washes pirates toward the gap (some go overboard), **Pirates: ⚡ Lightning bolt** (750) strikes a pirate, **Pirates: 🐙 Tentacle swipe** (1,000) sends a kraken tentacle across a deck. They never change who wins: the winner picked before the battle is safe, and it still always ends one pirate from each crew. The camera pulls back to show them, and a line at the top of the game screen tells chat what they can send. Movie Royal makes the rewards on Twitch by itself after you sign in; change the prices in Settings → 💰 Rewards & prices.
- 🖼️ Each ship has a figurehead on its bow with that channel's Twitch picture: TimePeace49 on the red ship, Kirbgames on the blue one (a skull until Movie Royal has the pictures; it looks them up every few hours).
- 🖋️ The ships' names on their backs are in fancy gold pirate letters.
- 🐒 A secret in every Pirate Battle: two little monkeys in pirate hats (red with a T, blue with a K) have a sword fight in a rowboat between the ships' bows. Who wins is random, then the winner gets taken out one of 20 ways: a kraken tentacle, lightning, a shark, a giant wave, a cannonball, a seagull, a falling barrel, a banana peel, a crab, a whale, a waterspout, a fishing hook, a rotten plank, a swordfish, an anchor, a sea serpent, a firework, parrots, a pufferfish or the loser's revenge kick. Battles go through all 20 in a shuffled order before any of them comes again (the same on every screen).
- 🐒 Two new 10,000-point channel point rewards, **Take out Time** and **Take out Kirb**: chat takes out that monkey right away, the next way in the same shuffled order (during the sword fight, the other monkey wins it and stays). Each is only on while that monkey is still in the boat.
- 🧍 22 new body types for your characters (/character body:25 to 46). Men's builds: Muscular, Dad bod, Beer belly, Stocky, Big & tall, Lanky, Swimmer, Barrel chest, Chubby, Strongman and Wiry. Odd ones anyone can pick: Bobblehead, Pinhead, Noodle arms, Gorilla arms, Stubby legs, Stilt legs, Pear, Triangle, Egg, Long neck and Big hands & feet. Each has its own shape and matching arms and legs, in every battle with characters. The body type only changes the look: everyone still has the same chance to win.
- 🧍 The picture the bot posts in Discord, the parts website and profiles now show the whole character (arms and legs too), so you can see the body type. Random men sometimes get one of the new builds; the odd ones only show up in the rare chaos looks.
- 🧪 Test tab → 🏴‍☠️ Pirate Battle: a button for each storm power, 🔴 Take out Time / 🔵 Take out Kirb, 🐒 Watch the monkeys (pick any of the 20 endings), 🖼️ Figurehead pictures and ✨ Add storm rewards to Twitch. Test tab → 🎨 Custom characters: 🧍 All body types and 🧍 New body types battle.

## 1.69.2
- 🏴‍☠️ Pirate Battle: the ships have new names. The red ship is the *TimePeace49* and the blue ship is the *Kirbgames* (on the back of each ship, in the lobby line and in "It's dragging the … under!" when the kraken comes).
- 🛠️ Fixed: on a slow start (a busy PC, or OBS loading the page), the battle screen could stop moving for good until the page was reloaded. One bad picture can't stop it any more.

## 1.69.1
- 🏴‍☠️ Pirate Battle celebrations: the Jolly Roger, the parrot's "WINNER! WINNER!", the island (Land Ho!) and the cannon salute sit lower, so the 🏆 WINS! banner doesn't cover them.

## 1.69.0
- 🏴‍☠️ **New map: Pirate Battle** (characters only, Derek's idea). Pick it on the Battle tab when a battle has 🧍 characters on (it's in the 🃏 Character only part of the map menu, and never on the Card battles tab).
  - ⛵ Two pirate ships side by side with the sea between them, at sunset. Everyone is a pirate in one of two crews: 🔴 the red crew on *The Scarlet Shark* and 🔵 the blue crew on *The Blue Barracuda*. The crews are split evenly (the same on every screen).
  - 🏴‍☠️ Everyone wears pirate clothes in their crew's colour: pirate coats, striped shirts or tunics, with a tricorn hat, a bandana, or an eye patch and a rolled bandana. People's own /character keeps its face, hair and skin, just in pirate clothes. The ring under their feet and the frame of their health bar are their crew's colour too, so you can always tell the sides apart.
  - ⚔️ Pirates only fight the other crew. They cross over on the two gangplanks or swing across on ropes, with cutlasses, sabers, boarding axes, belaying pins and oars. Knocked off the side = into the sea (unless they grab a rope).
  - 💥 Each ship's cannons fire at the other crew on the other ship (a red crosshair shows where the cannonball will land). They never hurt their own crew.
  - 🔴🔵 The crews always stay even, so it always comes down to **one pirate from each crew**. The smaller crew makes a last stand (hits harder).
  - 🐙 Then **the kraken** comes up: its tentacles grab the ship the last two aren't on, crush it and drag it under (if the two are on different ships, one of them jumps across), and its head peeks out of the water. Then the 360° camera goes round the last two on the ship that's left, and they have their 🥊 **FINAL FIGHT**.
  - 💀 20 pirate finishers (Walk the Plank, Shark Bait, Kraken's Snack, Cannon Blast, Barrel Roll, Keelhauled…) and 🏆 10 pirate celebrations (Treasure Shower, Jolly Roger Raise, Hornpipe Jig, Victory Swing…).
  - 🎵 Its own sea shanty music, and cannon, kraken, cracking wood, parrot and coin sounds.
  - 🧪 Try it on the Test tab → 🏴‍☠️ Pirate Battle (practice battle, a big one, straight to the kraken, in the Test lab, or the pirate finishers). It shows 🔴 NEW in the map menus.

## 1.68.0
- 💨 **Fart Farm reworked** (Derek: 12 pieces sat on the last bit of ground for 15 seconds):
  - 🐄 The herds run across the ground that's left. They used to start where the field used to be, so near the end they often missed the last bit of ground.
  - 🛸🐄 **Cow drops:** a UFO grabs a cow and drops it on the crowd (a yellow ring = incoming). Everyone close by goes flying, and the one right under it can get squashed. Then the cow bounces off, dazed.
  - 🛸 **The mothership:** in the last quarter of the battle (or once the ground is nearly gone), a huge mothership parks over the field and takes them one at a time. A red ring locks on, then its beam pulls the piece up.
  - ⏳ Everything on the map follows the pace: when the battle is ahead of schedule, the cows just knock pieces over instead of trampling them off, the UFOs put pieces back down ("👽 WRONG ONE!"), and toots push back toward the middle. Much less hopping back onto the ground.
  - The UFOs fly lower when the camera is zoomed in, so they stay on screen under the title.
  - It shows 🔵 UPDATED in the map menus.
- ⏳ **No more long waits, on every map:** the elimination pacer never holds knockouts back for more than about 7 seconds. Before, when a battle got way ahead of schedule early, it could keep saving everyone for 15 seconds or more (that's what happened on Fart Farm).
- ↺ **Reset battlefield on the Card battles tab works on every map** (Derek: it didn't work with the holiday maps). On a ball or holiday map it used to leave the fight on screen, and the next card fight couldn't start. Now it clears it, during the fight or after it, and the packs line up again. The button was called ↺ Reset street; it's ↺ Reset battlefield now (it isn't always a street).
- ↺ After any reset, a map's own things from the last battle (cows, ghosts, UFOs, eggs…) are cleared instead of staying frozen on screen.
- A winner that was up in a UFO beam at the very end now lands instead of floating.
- 🧪 Test tab → **⏳ No long waits:** runs 6 quick hidden battles on a map (💨 Fart Farm first) with your battle timer and pacer, and shows the longest wait without a knockout. **🃏 Card battle tests → 🎃 On a holiday map** and **↺ Reset battlefield** to try the reset. Try the new Fart Farm in the 🧪 Quick test lab.

## 1.67.2
- ↺ **Reset wheel = back to how you set it up** (Derek): the reset button above the ✏️ Spots list now puts the wheel back to how it was right before its first spin: every spot's size, count, wins and on/off come back, voided spots return, and the round timer and last result are cleared. It asks first and lists what will change back; ↩️ Undo reset takes it back. Until you reset, the wheel stays exactly as it is.
  - Movie Royal remembers your setup right before the first spin (or grow, shrink, double…) since the last reset. What you change yourself in the ✏️ Spots list (sizes, adding spots…) becomes part of your setup.
  - From this version on: if your wheel isn't the way you want it right now, set it up how you want it before your next spin, and that's what ↺ Reset wheel will bring back.
- ⚖️ **All the same size** is its own button now (it used to be the reset button): every spot size 1, and that becomes your setup.
- 🧪 Test → ↺ Reset wheel shows what a reset would bring back for your wheel (nothing changes), and 🤖 Test all checks the reset on a pretend wheel.

## 1.67.1
- 🎁 **Hidden reveal (mystery) spots are ⚡ auto spots now** (Derek): when the wheel lands on one, the round timer pauses until you press 🎡 SPIN, and nobody can respin it (chat's respins are saved for later, like every auto spot). It shows (auto) on the wheel, and the spot menu calls it 🎁⚡ Hidden reveal (auto). Ticking 🎁 Hidden reveal on a timer or auto spot makes it a mystery spot; unticking it leaves a plain ⚡ auto spot.
- 🧪 Try it: Test → 🎁 Mystery spot → 🎡 Land on my mystery spot (then 🔁 Respin in 💬 Test chat).

## 1.67.0
- 🤖 **Test all** (🧪 Test → ✅ Checklist): one button that checks everything Movie Royal can check by itself, in the background. Nothing goes on stream, in chat or in Discord, nothing is changed, and you can keep using the app while it runs (about a minute). The list ticks each check off as it's done: ✅ fine, ❌ a problem (with what to do), 🟡 worth a look, ⚪ skipped (not set up).
  - ⚙️ Your connections: Twitch (sign-in, permissions, chat, your chat bot account, channel point rewards), the Discord bot (tried with a pretend person), the 24/7 bot, the backup bot server, TMDB, OMDb, Letterboxd, donations, OBS (with the game screen in it) and updates.
  - ⚔️ Battles in a hidden test screen: a practice battle, a number battle, characters, **every map** (the winner has to end up on land), every card battle map, character fights, every finisher and celebration.
  - 🎬 The ban rules (and that the 24/7 bot gives the same answers), series in order + locks, wild spot luck, !mymovies, the IMDb / Rotten Tomatoes readers, the nudity check, the ban export file.
  - 🖥️ Your data saves (and a backup in the last month), the pictures you added are there, no new errors, every button has a help note, no two key binds on the same key.
  - Checklist items a check really covers get ticked by themselves ("checked by 🤖 Test all").
- 🤖 **Test all not done:** only the checks that haven't passed yet (skips ones whose checklist item is already ticked).
- 🗂️ **Side tabs on the Test tab:** 🧪 Tests and ✅ Checklist both have a tab for each group down the left side, like Settings (📋 All tests / 📋 Everything shows it all on one page). Keys: [ and ] = the tab above / below, Shift+T = Test all.
- ❓ Help notes for the last few buttons and boxes that didn't have one (map powers, the 🧍 box, the fun power-up boxes, the checklist buttons…).

## 1.66.2
- 🔞 The winner pop-up on stream now just says **"This movie has nudity"** (no times). The Winner card in the app still lists every scene with about when it is.

## 1.66.1
- 🔞 The nudity heads-up now also shows on the **winner pop-up on stream**: a short red line with about when each scene is (like "~47 min in · at 1:12:30 · near the end"). The Winner card in the app still lists every scene. It's never typed in Twitch chat. Turn the stream part off with the 📺 switch in Settings → 🎬 Movie info.
- 🧪 Test tab → 🔞 Nudity heads-up → **⚔️ Practice battle**: a practice round whose winner gets a pretend nudity result, so you can see both.

## 1.66.0
- 🔞 **Nudity heads-up on the Winner card:** when a movie wins, Movie Royal checks its IMDb Parents Guide (the "Sex & Nudity" part) and TMDB's tags. If it has nudity, the Winner card on the Battle tab says so **in red** and lists every scene it found, each with about when it is in the movie ("~47 min in", "at 1:12:30", "near the end", or "time not listed" when nobody wrote a time). Orange = sex scenes but no nudity listed. Only you see it: never on stream or in chat. Turn it off in Settings → 🎬 Movie info.
- ⭐ **Ratings on the 500 worst list:** IMDb / Rotten Tomatoes battles show each movie's rating from the list (IMDb out of 10 or 🍅 %, or TMDB's rating when the list didn't show one) in the 🎬 Movie Pool and in the battle list under the battle. Your list picks them up the next time it updates (on open).
- ⏱️ **Movie length everywhere:** every movie in the 🎬 Movie Pool now shows how long it is (the battle list already did). Movies that were added without their length get it filled in by themselves in the background.
- 🧪 Test tab → 🔞 Nudity heads-up (a pretend movie, or type any real movie to check it). The 🌐 IMDb / Rotten Tomatoes battle test now shows ratings and lengths too.

## 1.65.3
- 🤫 Fixed a false "Something went wrong" error: when Movie Royal reads a web page in the background (like the IMDb pages for the 500 worst list), an ad or tracking picture on that page sometimes doesn't load. That's harmless and no longer shows as an error (it's still in the tech report).
- Those background pages now skip ads and trackers altogether, can't open pop-up windows, and stay muted, so they load faster too.

## 1.65.2
- 🔄 **Refresh the whole banned list** (top of Settings → 🚫 Banned Movies): one button that looks at everything: new movies that break the ban rules (looked up on TMDB), last year's "this year" bans coming off, "not in English" bans re-checked for English dubs, and every 🎞️ series (sequel bans + locks). The line next to it shows how far it is. It only adds or removes automatic bans: the ones you banned yourself are never touched. (It replaces the old 🔄 Update the ban list button further down.)
- 🧪 Test tab → 🔄 Pretend whole refresh (made-up movies, no internet).

## 1.65.1
- ⬇️ **Export my bans:** Settings → 🚫 Banned Movies → ⬇️ Export my bans downloads the movies you banned yourself (not the automatic ones) as a spreadsheet file (.csv). **⬆️ Import bans** adds them back from that file (here or on another PC); it skips ones already banned and never removes any.
- The banned list is never reset by updates: the 🎞️ series check only adds and removes its own 🎞️ sequel bans, never yours or the other automatic ones.
- 🧪 Test tab → ⬇️ Export my bans (makes the file and reads it back; nothing changes).

## 1.65.0
- 🔁 **Redo without the passed movie:** when a winner passes, a **🔁 Redo the battle without [movie]** button shows on the right of the Battle tab. It starts the battle again right away without that movie (it's back in after that).
- 🛌 **Sit out after a pass:** the bot asks the person in chat if they want to sit out the rest of tonight. Yes = all their movies take a break until the next stream, no = they stay in.
- 🙋 Anyone who sits out is told in chat how to come back (!imback).
- ⏭️ **!skip:** viewers can take one of their movies out of the next battle only (`!skip 2` or `!skip Heat`; the same again puts it back). It shows as "⏭️ skips the next battle" in the battle list. The command is in Settings → 💜 Twitch & channel points and in !moviesroyal.
- 🧪 Test tab → **⏭️ Pass, sit out and skip a battle**.

## 1.64.0
- 🔍 **Search all settings:** a search box at the top left of ⚙️ Settings. Type a few letters ("volume", "laps", "bits", "raid"…): every match shows with its tab and section; click one (or press Enter) and it jumps there and lights it up.
- ⚙️ **Settings cleaned up: every option is in one place** (the quick buttons on the other tabs stay):
  - ⭐ Channel point reward names, cooldowns and what they do, and the 💎 Bits → chaos tiers moved from 💜 Twitch to 💰 Rewards & prices (the price and "when it's on" are only in the list there now; the second bits table is gone).
  - 🎉 Putting the viewer's choice celebration in OBS (and the file for a friend) is only in 🎥 OBS now.
  - 📅 Banning this year's movies is only in 🚫 Banned Movies now (it was in 🤖 Discord & picks too).
  - 🎬 Movie picks open / closed moved to 🤖 Discord & picks (⭐ Points / 💎 Bits stay in 💜 Twitch).
  - 🔇 Mute while in another program moved to 🔊 Sounds; the chat command that lists the commands moved to 💜 Twitch with the other chat commands.
  - Added to Settings so everything can be done there: 📏 Map size (⚔️ Game → Maps), 🧍 characters for each battle (⚔️ Game → Each battle) and the 📣 hourly chat message on/off switch (💜 Twitch → Chat messages).
- 🧪 Test tab → 🔍 Settings search.

## 1.63.1
- 🏁 **No races with more than 50 pieces** (Derek): 🎲 Random and the chat map vote leave the race maps out, they're greyed out in the map menu ("no races over 50"), and a race you picked switches to another map when the battle starts (a pop-up says which). Change the number in Settings → ⚔️ Game.
- 📏 **Map size slider** on the right side of the Battle, Chat battle and Giveaway tabs: 50% to 200% for every ball map. Bigger cliffs and arenas, and longer race tracks (twice as long at 200%).
- 🧪 Test tab: **📏 Map size** (a practice battle at any size, your setting stays the same) and 🏁 Race with power-ups → **🏁 Too many for a race?**

## 1.63.0
- 🎞️ **Series go in order:** a movie in a series (like Harry Potter) can only be picked once you've watched every movie before it. The later ones go on the 🚫 Banned list as 🎞️ sequels and come off by themselves when you watch the one before. People are told which one has to be watched first.
- 🔒 **Series locks:** whoever picks the next movie of a series gets the series locked, so nobody else can pick its next movie. When their movie gets watched, the next one opens only for them. If their next set of picks doesn't include it (or they swap it away), the series opens up for everyone.
- 🚫 Banned Movies → **🎞️ Series:** every series Movie Royal knows, what's next, who has it locked (change it by hand with the menu), every movie marked ✅ watched / ▶️ next / 🎞️ banned, and **➕ Add a series**. The ban list has a 🎞️ Sequels filter.
- Movie Royal finds series by itself: from people's picks, the 500 list, the movies you watched on Letterboxd, and popular series.
- 🔚 **The last thing Movie Royal does when it opens:** check the series (sequel bans + locks), then update the 🌐 web lists (the 500 worst movies).
- 🌐 The 500 list never has a movie that belongs to someone: picked in Discord or the next movie of someone's locked series. Movies on the 500 list never show as taken when people suggest them.
- 🎡 **Wheel spin time** for every wheel is in Settings → ⚔️ Game now, next to the battle timers.
- ☁️ The 24/7 Discord bot needs its usual update for the series rules (Movie Royal pops up the reminder).
- 🧪 Test tab → **🎞️ Series in order + 🔒 series locks**: a pretend series, step by step.

## 1.62.3
- 🌐 **The 500 worst movies (IMDb / Rotten Tomatoes battles) and Discord picks:**
  - People can pick a movie in Discord even if it's on the 500 list. When they do, it leaves the 500 list within a few seconds and the next movie on the list takes its place (if that battle is fighting right now, it waits until it's over). The Movie Pool card lists the ones that left and what replaced them.
  - Movies someone has picked in Discord never go on the 500 list (this used to be a setting; now it's always on).
- 🎞️ **No sequels before their first movie:** a movie in a series only goes on the 500 list once you've watched every movie in that series that came out before it (from Letterboxd, or won and watched in a Discord battle). It's a check box on the battle's card (on by default). Your lists are read again once with the new rules after the update.
- 🧪 Test tab → 🌐 IMDb / Rotten Tomatoes battle: the pretend list now has a sequel that gets skipped, and **🎬 Pretend a Discord pick** shows a movie leaving and the next one taking its place.

## 1.62.2
- 🎟️ **Wild spot luck is on: once a night** (Derek). The first Discord movie battle a wild spot loses while you're live gives it +1%, and that's all for that stream: 1 battle or 3 battles, still +1% that night.
- Change it in Settings → 🍀 Luck → 🎟️ wild spot luck: 🌙 Once a night (default, and you can change the amount), ⚔️ Every battle (like everyone else's movies) or 🚫 No luck.
- 🧪 Test tab → **🎟️ Wild spot luck**: pretends a wild spot loses battles two nights in a row and shows the luck it gets each battle, live and not live (nothing real changes).

## 1.62.1
- 👀 **Watch luck on / off in Settings → 🍀 Luck:** every battle has its own 👀 Watch luck box (off by default), and right next to it how many hours watched give how much luck. It all saves right away. 👀 Who has watch luck shows everyone's hours and luck.

## 1.62.0
- ⏱️⏳ **Battle timer and elimination pacer sliders for every battle** (Settings → ⚔️ Game): one pair for 🌐 all battles, and under it a pair for each battle (Discord movies, chat battle, giveaway, your own battles and card battles). Slide a battle all the way left and it uses the ones for all battles. They save right away. The Battle tab's countdown and fight clock follow the battle's own timer.
- 🛠️ The elimination pacer slider for all battles didn't actually save before (it always stayed at Normal). Fixed.
- 🍀 **New Luck tab in Settings** with every luck setting: luck on/off and how much per battle, wildcard spot luck, 👀 watch luck for each battle (still off by default; when it's on it's just added into the luck), save / reset / bring back luck for each battle, and chat calling the winner. The swap settings moved to 🤖 Discord & picks.
- 🧪 Test tab → **⏱️ Battle timer & ⏳ pacer for each battle**: pick a battle, see what it uses, and run a pretend battle with them.

## 1.61.5
- 🍀 **!mymovies and /mymovies show each movie's luck:** Twitch chat answers like `Heat (1995) 🍀9.5%`, Discord shows `🍀 9.5% luck` and splits it into the movie's own luck and 👀 watch luck when watch luck is on. Same when someone looks up another person's movies.
- 👤 **Chatter profiles show luck too:** the 🎬 Movies part of a profile lists every movie with its 🍀 luck (hover it to see own luck + watch luck).
- 🧪 Test tab → **🍀 !mymovies and /mymovies with luck**: pick a person and see exactly what Twitch chat, Movie Royal's Discord bot and the 24/7 bot would answer (nothing is sent), plus **👤 Open their profile**.
- ☁️ The 24/7 Discord bot needs its usual update for this (Movie Royal pops up the reminder).

## 1.61.4
- 🥊 **FINAL FIGHT 360, like your drawing:** the last two are moved to the middle and stand still, and the camera walks a full circle around them. The map is copied all the way round, so you see it behind them the whole way. The scenery slides past behind them, the floor right under them stays put and the floor in front slides the other way. The drawn ring and lines on the floor are gone. On 🔔 Royal Rumble and 🧙 Wizard Battle the ring / floating platform stays with them while the crowd and sky go round.
- 🧱 **Broken ground is fixed for the FINAL FIGHT:** craters (🪖 WW2) are gone and fallen tiles (🧙 Wizard Battle) come back, but the blood stays where the ground didn't fall.
- 🎡 **Every spot rule is in the spot menu now:** 🎁 Hidden reveal (mystery) and ⏱️🔀 Timer + Link were added (next to ⚡🔀 Auto + Link and the rest). Picking 🎁 opens the spot's settings so you can type the hidden words.

## 1.61.3
- 🎁 **Mystery card pack closes right away:** pressing ✕ Close after opening it now closes it at once in Movie Royal (it could take 30–40 seconds), and the stream closes it too.
- 🎉 **Viewer's choice keeps their pick a secret** (Derek: they tell you later): the pop-up only shows who redeemed it. The reward's message on Twitch now says "Type anything to redeem, then tell the streamer your pick" (when Movie Royal made the reward; one you wrote yourself stays). Want it shown? Settings → 💰 Rewards & prices → 💬 Show what they typed on the pop-up.

## 1.61.2
- 🏁 **Finish lines fixed on the race maps** (Derek: the Grand Prix one):
  - 🏎️ **Grand Prix has a new layout:** the bottom-right hairpin ran right into the start straight, so the finish line and the grid sat where two parts of the road blended together. Now the road never touches itself.
  - The start / finish line now only goes where no other part of the road is close by (with the whole starting grid behind it), on every race map. On ✖️ Crossover Chaos it's no longer next to a crossing.
  - The 🏁 flag stand stands beside the road at the line (not on the road any more).

## 1.61.1
- 🎥 **Calmer auto camera** (card battles, character fights and ball battles): small movements are ignored and it eases into place, so it doesn't wobble. Shaking on hits, K.O.s and booms is about half as strong, the lean toward big hits and the "breathing" are much smaller.
- 🥊 **The FINAL FIGHT 360° goes around them:** the floor now turns under the last two while the camera circles them (with a ring on the ground), and the town slides past faster behind them, so it looks like the camera walking around them instead of them spinning.
- 🎬 **Test tab → 🎬 Scenes** (at the top): one button for each big moment on stream: ⚪ ball battle FINAL SHOWDOWN, 🃏 card battle FINAL FIGHT, 🧍 characters FINAL FIGHT (pick the map; it goes straight to the last two), 🎁 mystery spot reveal, ☠️ Doomsday (screen only, or the whole thing), 💧 Hydrate, 🙆 Stretch, 🎩 Pick a hat, 🎉 Viewer's choice and 🚀 Raid: pick a stream.

## 1.61.0
- 🎁 **Mystery spots on the wheel (hidden reveal):** in a spot's ⚙, tick 🎁 Hidden reveal and add hidden words and/or a hidden picture. On the wheel the spot shows its normal words and picture, so nobody knows what it does.
  - When the wheel lands on it, a **card pack** with that cover pops up in Movie Royal and on stream. Click the pack (or press Enter): the top tears off, a card slides out and shows the hidden words / picture, on stream too, and the bot says it in chat.
  - With a **holiday app style** on, the pack and card dress up for that holiday (Halloween, Christmas, Valentine's Day and the rest). There's a 🎁 box for it on the holiday pop-up and in Settings → App & background → 🎨 App style (on by default).
  - 👀 Preview it in the spot's ⚙ (only you see it), 🎁 Open the card pack on the wheel's result opens it again if you closed it. Try it: 🧪 Test → 🎁 Mystery spot.
- ⏱️ **Movie length** on the winner screen and in the list under the battle (like "2 h 7 min").
- 📋 **The list under the battle shows who's really in:** the pieces on the cliff (or in the battle that's running) come first. Movies sitting out, people who haven't chatted yet and entries that didn't fit are under 👀 Show the … not in, with a tag saying why. New 🔎 search box for a person (Discord or Twitch name) or a movie title.
- 🗣️ **Dubbed movies aren't banned any more:** the 🌍 Not in English rule now lets through movies that likely have an English dub (cartoons, anime and well-known movies). TMDB doesn't list dubs, so Movie Royal guesses by how many TMDB votes a movie has (1000 by default, change it in Settings → 🚫 Banned Movies). Movies the rule banned before get checked again once and the dubbed ones come off the list. Bans you made by hand stay. The 24/7 Discord bot needs one update for it (Movie Royal asks when it opens).
- 🎁 **Hydrate, Stretch, Pick a hat and Viewer's choice can each be switched off** (Settings → 💰 Rewards & prices → 🎁 Viewer rewards). Off = hidden from your channel points menu.
- 🎥 **Settings → OBS has everything OBS in one place**, each with its own switch and setup: ☠️ Doomsday (mic, camera, ending the stream), 📺 Capture window, 🎉 Viewer's choice celebration, 📣 Roll call and the game screen's address. 🎥 Let Movie Royal use OBS switches all of it off at once.
  - 📺 **Capture window during the 2-min join timer:** once a window is picked, it shows by itself (small, top-left) when you start the join timer and hides when the battle starts.
- 📣 **Roll call as its own OBS browser source:** so roll call shows in scenes without the game screen. Movie Royal can add it to the scenes you pick, or add `/rollcall.html` by hand (1920 × 1080). There's a new Setup guide step for it.
- 🛌 **Sitting out keeps people on the People list:** their movies just sit out of tonight's battle (🛌), so you still see the whole community.
- 🏁 **Laps box on the Battle tab:** when the next battle is on a race map, pick the laps on the right side before you start (also on the Chat battle tab).

## 1.60.4
- 🎀 **Hair accessories are their own part** (Derek: "they are their own thing"), so a character can wear one with a head accessory.
  - There are 30: headbands, bows, flowers, daisies, pearl clips, barrettes, butterfly / star / heart / cherry / leaf / snowflake / rainbow clips, a scrunchie, bobbles, hair ties, beads, a ribbon, bobby pins, hair sticks, a jeweled comb, hair gems and a braided headband.
  - It has its own 🎀 Hair accessory tab on the parts website, and Discord uses `/character hairaccessory:<number>` (1 = none). Profiles and the Test tab's character builder show it too.
  - Random characters sometimes wear one (never under a hat).
  - The 24/7 Discord bot needs one update for it (Movie Royal asks when it opens). After that, new character parts work without updating the bot.
- 🏁 **Race starts:**
  - The start line now sits on a long straight, so the whole starting grid sits on the straight instead of around the corner behind it.
  - Big races get up to 6 cars side by side, and the rows set off one after another at the green flag, so there's no 25-car pile-up in turn 1.

## 1.60.3
- 🚛 **Tow trucks on the race maps** (all except the Figure 8): when a car is wrecked on the road, a tow truck drives in, hooks it and drags it off the road. It takes 3 seconds, so piles of wrecks don't block the road any more. A car that's stuck for a few seconds gets pulled back to the middle of the road too. In tests, no car got stuck any more, and races end sooner.

## 1.60.2
- 🧭 **Every start-up pop-up step has "Don't show again"**: the new version step (turn it back on in Settings → 👤 Account & updates → 🔔 Pop up when a new version is out), the character questions (nothing changes), the holiday style (sets the app style to Normal) and new Setup guide steps.
- **Two steps keep asking until they're done** (Derek): ☁️ Update your 24/7 Discord bot (the "Don't remind me again" button and its Settings box are gone) and the 📦 monthly backup.
- 📦 **The monthly backup reminder is a step in the start-up pop-up now** (it was a bar at the top): ⬇️ Download backup, Remind me in a week, or Later.

## 1.60.1
- 🤖 **The chat bot pop-up now tells you how.** When Movie Royal opens and asks about a 🤖 chat bot account, the steps are right in the pop-up, with 🔑 Sign in as the bot and a 📋 copy-able sign-in link. Open that link in a private (incognito) browser window and log in as the bot, so you don't have to log out of your own Twitch account. The same link is in the Setup guide and in Settings → 💜 Twitch & channel points. The other new Setup guide steps in that pop-up show their steps too.

## 1.60.0
- 🏁 **10 new race maps** (ball battles), each its own style:
  - **Clean races** (they pass and draft, crashes hurt little, first across the line wins): 🏟️ Speedway Oval, 🏎️ Grand Prix (rain makes it slippery), 🌃 Night Street Race (roadwork cones), ❄️ Ice Ring (hardly any grip), 🏖️ Beach Rally (waves wash over the top of the track).
  - **Mixed:** 🏜️ Desert Rally (monster trucks, dust devils).
  - **Mayhem** (everyone rams everyone): ✖️ Crossover Chaos (school buses, the track crosses itself twice), 🌋 Volcano Run (monster trucks, lava bombs), 🚧 Junkyard Smash (buses, junk cars drop in), 🚀 Big Air Stadium (monster trucks fly off ramps; land on someone and you crush them).
  - New rides: low race cars with a rear wing, and monster trucks on big wheels, plus the school buses. Every map has its own map power for chaos.
  - The lap setting is now for every race (Settings → Game → 🏁 Races: how many laps).
- 🏁 **Race power-ups for chat battles:**
  - Chat battle tab → 🏁 Race power-ups. Chatters who typed !join spend channel points on 💨 Boost, 🛡️ Shield, 🛢️ Drop oil, 🚀 Rocket (fires straight ahead) and ☢️ **Nuke**.
  - They work on every race map (the Figure 8 too). Redeemed before the race = it goes off right after the green flag.
  - **With them on, the race isn't decided ahead of time:** the power-ups really can change who wins.
  - ✨ Add race power-up rewards to Twitch makes the rewards. They only show on Twitch while they can be used. Prices are in Settings → 💰 Rewards & prices, and the Setup guide's ✨ Make my rewards makes them too.
- ☢️ **The Nuke** (20,000 points, one per race): a 15-second cut scene.
  - An alarm sounds and a force field forms around the one who called it. The missile comes down, then a flash, the blast wave and a mushroom cloud, and every other car is blown away.
  - The smoke clears and only the winner is left, in their force-field bubble.
- 🧪 **Test tab:** 🏁 Race with power-ups (start a test race on any race map, then fire every power-up, the nuke too). The 🧪 Quick test lab has race power-up buttons. No checklist items.

## 1.59.7
- 🧭 **The Setup guide is up to date:**
  - New steps: 🤖 Chat bot account, 🛡️ Backup bots (download it and add your bot with one click) and 🧍 Characters (men / women with !id, /character, characters by default).
  - Channel points: ✨ Make my rewards now makes the chaos, wheel and chat battle power-up rewards in one go. It also explains the rewards Movie Royal makes by itself (Hydrate, Stretch, Pick a hat, Viewer's Choice, Raid), why rewards hide from the menu, where to change prices, and that refunds are up to you.
  - Twitch: says what the sign-in asks for, and tells you to sign in again when an update needs a new permission.
  - Discord: lists the Movie Royal folder and its channels. 24/7 bot: /character, and how its updates work. OBS: Doomsday, capture window and Viewer's Choice. Put it on stream: a tip about 🔇 Mute when unfocused (OBS hears it go quiet too). Movie search: the ban list.
  - Steps added by an update show 🆕 new in the guide.
- 🧭 **Every pop-up when Movie Royal opens is a step in the one start-up pop-up.** A new Setup guide step is now its own step (🧭 Set it up, Don't show again, Later), after the other questions.

## 1.59.6
- ✅ **The checklist is shorter: only the main features now** (76 instead of 175). Battles, claims, the wheel, Discord picks, Twitch chat and rewards, characters, card battles, OBS and the bots are all still there. The small extras are gone: camera spins, each map on its own, menu sorting, window tweaks and the like. All the maps are one line now: "Every map plays a battle to the end", tried in the 🧪 Quick test lab. Your ticks stay ticked.

## 1.59.5
- 🎥 **The camera buttons are on the battle screen now** (Battle and Card battles tabs, and in fullscreen): move the mouse over the battle and they show at the bottom; stop moving and they hide after a couple of seconds. The old camera rows under the battle are gone.

## 1.59.4
- 🎩 **Head accessories are their own part now:**
  - People pick one with `/character accessory:<number>`. There are 50 (number 1 = none): hats, caps, beanies, crowns, tiaras, halos, cat/bunny/bear/fox ears, horns, antennae, glasses, sunglasses, an eye patch, goggles and more.
  - Random characters sometimes get one that fits, like Santa hats on Santa's Workshop and witch hats on Halloween.
- 💇 **Hair still has 1,000 styles.** The accessory versions came out and 15 new hair styles took their place: tall, wide, slim, ombre, two-tone, frosted tips, dyed tips, skunk stripe, rainbow streaks, glitter, wet look, messy, wavy, curly and shaved side.
- **Old picks keep their look:** anyone who had picked a hair-with-accessory number gets the same hair plus that accessory.
- Update your 24/7 bot when Movie Royal asks, so /character knows the accessories.
- ✅ 🆕 Recently updated on the checklist starts empty with this update (ticks stay).

## 1.59.3
- 🧍 **24 body types:**
  - **Builds:** regular (1–6), thin (7–12), fat (13–18) and athletic (19–24).
  - **Chest:** each build comes flat or with a chest shape in 5 sizes.
  - **Easier to see:** the chest shape is bigger and clearer now (still PG, just shading through the outfit).
  - **Old picks:** body 1 and 2 are the same as before, so nobody's character changes.
  - **Random characters:** they get any build, but only the 3 smaller chest sizes.
  - **Where to see them:** the parts website → 🧍 Body shows all 24.
- ✅ **🆕 Recently updated starts empty with this update** (your ticks stay). The next updates show their new things there again.

## 1.59.2
- 💬 **The little pop-ups at the bottom stay longer:**
  - 8 seconds instead of 3½, and longer messages stay longer to match.
  - Hover the mouse on one to keep it up, and click it to close it.
  - Change how long in Settings → App & background → 💬 Little pop-ups stay for.

## 1.59.1
- 🆕 **Recently updated starts empty** the first time someone opens the checklist (a new install, or a friend updating). From their next update on, it shows what's new in that update.

## 1.59.0
- 🔢 **20 versions of every character part** (all but the body):
  - **The counts:** 1,000 hair styles, 1,500 outfits, 500 makeups, 500 facial hairs, 160 skin colors and 200 hair colors.
  - **The versions:**
    - Hair: flipped, big, highlights, headbands, bows, cat and bunny ears, devil horns, halos, crowns, tiaras, neon streaks and more.
    - Outfits: striped, plaid, camo, stars, hearts, flames, lightning, sashes, gold, midnight, pastel and neon.
    - Makeup: glitter, freckles, tear drops, war paint, nose rings and more.
    - Facial hair: dyed, bushy, trimmed, beaded or twirled beards.
    - Colors: whole families of skin and hair colors (natural ones, plus mint, zombie, alien, gold, silver…).
  - Numbers people already picked stay the same. Random characters get some of the versions too, and chaos characters can get anything.
- 🌐 **The parts website.** A page with every part and its number: people tap parts to try them on, then copy the /character command it makes.
  - It's put on your 24/7 bot, so it works any time, even while your PC is off.
  - #character-creation pins the link instead of the 9 pictures, and /character answers with it.
  - Update your 24/7 bot when Movie Royal asks (the website needs it). Until then, Discord keeps showing the pictures.
  - 🧪 Test → 🎨 Custom characters → 🌐 Parts website opens it.
- 🧍 **Battles use characters by default** once you said yes to men/women characters or character creation (Settings → Game turns it off). A battle where you ticked or unticked 🧍 yourself keeps your choice.
- 🖥️ **Fullscreen no longer puts Windows itself in fullscreen mode.** That changed how the Start menu and taskbar looked. Fullscreen now covers the screen without a border, like a game's borderless fullscreen.

## 1.58.3
- 🤫 **No error messages when OBS is just closed.** Movie Royal doesn't count OBS being closed as a problem any more: nothing in ⚠️ Errors, nothing in #movie-royal-debug, and hiding the capture window when a battle starts stays quiet. It's still noted in the tech report (🛠️ For Claude) in case something else goes wrong. Real OBS problems (like a wrong password) still show, and pressing 🎥 Test OBS yourself still tells you it can't reach OBS.

## 1.58.2
- 🧭 **One pop-up when Movie Royal opens.** Everything it wants to ask now comes as steps in the same window, one after another, instead of pop-up after pop-up:
  - a new version
  - new Setup guide steps
  - the 24/7 bot update
  - men and women characters
  - character creation
  - the holiday style
- The top says **Step 1 of 5** (and so on), with a dot for each step. Esc skips a step.
- Anything new Movie Royal needs to ask later just becomes another step.
- 🧪 Test tab → 🧭 Start-up pop-up → Show the whole start-up pop-up shows a pretend one (nothing is saved).

## 1.58.1
- 🎬 **Viewer's choice in OBS: you pick the scenes.** 📺 Put it on my stream (Settings → 💰 Rewards & prices, and the Setup guide) now lists your OBS scenes with tick boxes, and the celebration goes on top of only the scenes you tick (it's taken out of the others). The scene that's on stream is ticked to start with. 🎬 Pick the scenes changes them any time.
- ✅ **Checklist tidied up:** every item is in its own category now (no more big pile of "new" ones on top). From now on, each update puts just its own new things in 🆕 Recently updated at the top. Tick one once it works and it moves to its category when you leave the tab. ✓ Move them to their categories moves them all at once.

## 1.58.0
- 👫🎨 **Two questions when Movie Royal opens** (asked once, one after the other):
  1. **Men and women characters?** Chat picks theirs with !id man / woman / none.
  2. **Character creation?** People make their own character in Discord with /character.
  - Say **No** and it stays off. Turn either one on any time in Settings → Game → 🧍 Characters.
  - Try the questions on the 🧪 Test tab (nothing gets saved there).
- With character creation off, /character in Discord says it isn't on right now.

## 1.57.5
- 🛠️ **Fixed the "EPERM: operation not permitted, rename … db.json" error box after updating.** Windows sometimes locks the save file for a moment (antivirus checking it, the backup bot reading it, or the old app still closing). Movie Royal now waits and tries again instead of showing an error, and if the file stays locked it saves straight into it. Nothing was lost: it just couldn't save that one moment.

## 1.57.4
- ⬛ **The Discord part pictures are square now.** Discord shows the 9 pictures as a grid of squares and was cutting off whatever stuck out (the body and color pictures were cut in half, and the white borders got cut off). Now every picture shows whole in the pinned message in #character-creation, with a white border around each picture and around every hairstyle, outfit and so on inside it.

## 1.57.3
- 🛠️ **Fixed "couldn't post in #movies-royal … must be 2000 or fewer in length".** The pinned commands message had grown past Discord's 2,000-letter limit (the new /character line tipped it over). The wording is shorter now, and on nights with lots of movies the oldest ones in "Tonight's movies" are folded into "+ n earlier", so it always fits. The Discord self-test on the 🧪 Test tab now checks the length too.

## 1.57.2
- ⬜ **Every hairstyle, outfit, makeup, facial hair and body on the Discord part pictures now has its own white border**, so it's easy to see where one choice ends and the next begins. The pinned message in #character-creation updates itself with the new pictures, and the 24/7 bot gets them automatically.

## 1.57.1
- ⬜ **White borders on the character pictures in Discord.** Every part picture in #character-creation (and the little picture posted when someone makes their character) now has a white frame, so you can easily see where one picture ends and the next begins. The pinned message updates itself with the new pictures, and the 24/7 bot gets them automatically.

## 1.57.0 (test build)
- 📁 **Movie Royal channel folder in Discord:** the bot puts all its channels in one channel folder called "Movie Royal": the movie picks channel, the new #character-creation, and the hidden #movie-royal-debug (mods and owner only) and #movie-royal-sync (bot only). Those two stay hidden: moving them keeps their own settings. Settings → Discord can rename the folder or turn it off.
- 🎨 **#character-creation channel:**
  - A pinned message shows how to make a character, with every numbered picture right in it: hair, outfits, makeup, facial hair, body, skin and hair colors.
  - /character only works in there (anywhere else it points people to it).
  - New characters get shown off in there.
  - Works with the 24/7 bot too: update it when Movie Royal asks.
- 🎥 **FINAL FIGHT camera:** while it circles the last two, the floor, ring or platform now stays under them. Only the scenery behind (sky, buildings, crowd) slides past, so they never look like they're standing outside the ring.

## 1.56.1 (test build)
- 🎥 **FINAL FIGHT camera circles around them on the ground now** (a horizontal 360), instead of spinning the picture like a wheel. The two swap sides as the camera goes around, the one nearer the camera gets bigger and comes forward, they keep facing each other, and the map slides past behind them once. Then it settles back to the normal view for the fight.

## 1.56.0 (test build)
- 🃏 **Character-only maps in regular battles:** when a battle has 🧍 characters turned on, its map menu also lists the character-only maps: Kung Fu Town, Royal Rumble, Wizard Battle, Colosseum and WW2 Battlefield (in the "🃏 Character only" part). Turn characters off and they leave the menu, and the battle goes back to a ball map.
  - The characters fight there like the card packs do, with grapples, spells, rifles and weapons, and everyone is dressed for the map: ninjas, wrestlers, wizards, gladiators, soldiers.
  - The winner is still picked fairly by the odds and luck.
  - On maps with a 🥊 FINAL FIGHT, the last two get one, with a finisher and a celebration.
  - The winner gets claimed in chat like any battle (the claim pop-up shows on top), and it counts in history, luck and stats.
  - 🎲 Random still only picks ball maps.
- 🎨 Random character looks are now the same on every game screen (the app's preview and OBS show the same people).
- 🧪 Test tab → 🎨 Custom characters → 🗺️ Themed map battle lists the character-only maps too.

## 1.55.2 (test build)
- 🎨 **Profiles show the character:** a viewer who made a character with /character shows a preview of it on their profile (double-click their name), with their Twitch picture on the chest and the number of every part.
- 🎲 **Random looks are only for that battle.** Someone without their own character gets a new random look every battle, so a random look never becomes their character. Only what they pick with /character sticks. The look stays the same from the countdown to the win.
- 🤪 **Chaos characters:** about 1 in 20 random characters is pure chaos: every part picked from everything (wizard beards on ballerinas, clown noses on knights, neon hair). The rest make sense: no silly makeup or wizard beards on regular folks, and fewer odd hair colors and costumes. 🧪 Test tab → 🎨 Custom characters → 🤪 Chaos battle shows only chaos ones.

## 1.55.1 (test build)
- 🖼️ **Character pictures in Discord:** when someone saves their character with /character, your PC draws a small picture of it. They get it in their own answer, and it's posted in the movie channel ("🎨 Lucy made their Movie Royal character!"). The channel post is at most once every 5 minutes a person, and Settings → Game turns it off.
- Through the 24/7 bot, the picture comes once Movie Royal picks the change up (within a minute while it's open). If Movie Royal was closed for more than 15 minutes, only the channel post shows (Discord stops letting the bot change their answer).
- Update the 24/7 bot when Movie Royal asks.
- 🧪 Test tab → 🎨 Custom characters → 💬 Try /character now shows the picture too.

## 1.55.0 (test build)
- 🎨 **Make your own character in Discord: /character.** With nothing after it, the bot shows numbered pictures of every part. People type the numbers they want, for example `/character hair:7 outfit:3 makeup:1 facialhair:8` (also `body`, `skin` and `haircolor`; only the parts they want to change). That's their character in every battle with 🧍 characters, and their movie poster or Twitch picture becomes a badge on the chest. The parts:
  - 💇 50 hair styles (1–25 men's, 26–50 women's)
  - 👕 75 outfits (1–25 men's, 26–50 women's, 51–75 costumes)
  - 💄 25 makeups and 🧔 25 facial hairs
  - 🧍 2 bodies, 8 skin colors and 10 hair colors
- 🎲 **Everyone else gets a random look from the same parts:** men get men's hair (and often facial hair), women get women's hair and sometimes makeup, non-binary get any. A piece keeps the same look all battle.
- 🗺️ **Themed maps dress everyone up:**
  - Battlefield = soldiers, Rumble Royal = wrestlers, Deep Space = astronauts
  - Dragon Keep = knights and peasants, Pompeii = togas, Zombie Horde = survivors and hazmat suits
  - Hero City = superheroes, Frozen Peak = ski jackets, Santa's Workshop = elves and Santa suits, Halloween maps = costumes
  - Holiday maps get holiday colors, and more
- A person's own /character always wins over all of that (and over their !id).
- 👩 **Women characters** have a small chest shape in their outfit so they stand out (PG, just shading).
- 🎟️ **Wild spot characters:** Settings → wild spots has a character builder with a live preview. The 1st wild spot wears character 1, the 2nd wears character 2, and so on. The 🎨 button on a wild spot in the pool takes you there.
- 🤖 **The pictures come from your computer.** The app's own bot sends them straight from your PC. The 24/7 bot gets them uploaded once from your PC (again only if they change), so they still show while your PC is off. Update the 24/7 bot when Movie Royal asks.
- Settings → Game → **Use people's own characters** turns /character looks off.
- Try everything on the 🧪 Test tab → 🎨 Custom characters.

## 1.54.1 (test build)
- 🗺️ **Map menus sorted in a new order:** ⚪ Ball / car only (the bus maps for now) on top, then 🃏 Character only (all the card maps), then ⚪🃏 Both (every other map), each A–Z. 🎉 Holiday maps stay at the very bottom. The NEW / UPDATED tag list in Settings → Game uses the same parts.

## 1.54.0 (test build)
- ⚡ **Chat powers reminder:** while a battle is going and chat powers are on (channel points or bits), a slim line scrolls across the top of the battle: "⚡ Chat powers are on! Use channel points or bits to shake up this battle". The title and timer move down a little to make room. It goes away when the battle ends or the chat powers are turned off.

## 1.53.1 (test build)
- ⏱️ **!moviesroyal** can be used once a minute (it was every 30 seconds). Switching tabs resets the wait, so chat can see the new tab's commands right away.

## 1.53.0 (test build)
- 🧍 **Characters instead of balls:** tick 🧍 on the right side of the Battle, Chat battle or Giveaway tab (each battle has its own). Every piece becomes a little person that walks and fights.
  - The head is the movie poster, your picture, the text, or the chatter's Twitch picture.
  - Bodies are men, women or non-binary, with random hair, outfits and colors. A piece looks the same every battle.
  - It works on every ball map.
- 👫 **!id:** chat types `!id man`, `!id woman`, `!id none` (non-binary) or `!id remove` (non-binary, no tag).
  - That's their character in battles with characters, and it shows as a tag on their profile.
  - Anyone can change theirs any time. Nobody picked = non-binary.
  - **Turning it off:**
    - For one battle: the 👫 box under the 🧍 box (everyone non-binary).
    - Everywhere: Settings → Game can turn the !id command off, or turn men/women characters off. You can also change the command word there.
- 📋 **!moviesroyal lists the commands for the tab you're on:** Battle = the movie commands, Chat battle = !join, Wheel = !respin / !myspins, Giveaway, Card battles. !id is in the battle lists.
- 🧪 **Test tab:** a characters practice battle, characters in the test lab ("Pieces look like") and in ⚙ test battle settings, and !id in 💬 Test chat.

## 1.52.0 (test build)
- 💀 **Finishers!** On card maps with a 🥊 final fight, the hit that would knock the loser out staggers them instead: **💀 FINAL BLOW!** Then the winner does a finisher:
  - **20 per map:** Kung Fu Town, Royal Rumble, Wizard Battle, Colosseum and WW2 Battlefield, so 100 in all. Some are ☠️ brutal (Dragon's Breath, Table Breaker, Black Hole, Feed The Lions, Air Strike…) and some are 🤪 silly (Noodle Slurp, Rubber Chicken Beatdown, Ribbit Hex, Grape Feast, Bean Bomb…).
  - **The replay is the finisher,** played again in slow motion.
  - **Then the winner celebrates,** with 10 celebrations per map that fit it (Lantern Release, Belt Raise, Owl Messenger, Laurel Crown, Medal Ceremony…), then the winner screen.
  - **Shuffled, never repeated early:** every finisher and celebration comes up once before any repeats, then they're all shuffled again. Test fights don't use up the pile.
  - **Try them:** 🧪 Test tab → 💀 Finishers & celebrations shows any one in the test lab.
- 🥊 **Maps with a final fight have a 🥊 in the map lists.**

## 1.51.0 (test build)
- 🔄 **The ban list fills itself:** the first time Movie Royal opens after this update, it looks up TMDB and adds movies that break the ban rules to your banned list (not in English, really religious, documentaries, this year's movies). It takes a few minutes in the background.
  - Movies already on your list stay, and nothing gets added twice.
  - Pre-approved (unbanned) movies and movies someone already picked are skipped. 🔎 Check movies already picked shows those.
- 🔄 **Update the ban list** button (Settings → 🚫 Banned Movies) does the same any time and only adds new ones.
- 📅 **This year's movies are on the banned list** (filter: 📅 This year's movies). On January 1st they come off the list, unless another rule bans them, and the new year's movies go on.
- ⏱️ **Card battles last 1 minute by default.** Card battles that were set to "by how many packs" are now 1 minute. You can still change it in 📦 Card pool → ⏱️ Fight length.
- 🥊 **The FINAL FIGHT! scene lasts 8 seconds** (it was about 3), with a big 3, 2, 1 countdown before 🔔 FIGHT! During it, the camera does a dramatic 360° spin around the last two packs, then settles back on the view you had before.
- 🎬 **More exciting card battle camera:**
  - It leans toward wherever the latest big hit landed.
  - It zooms in quickly on every K.O.
  - The screen shakes on big hits, bombs and tank shells. The "Screen shake" graphics setting controls how much.
  - It's shot closer in the final fight and pushes in during the last 5 seconds.
  - It swoops in on the winner.
  - It never sits completely still.
- 🎥 **The camera goes back to auto by itself:** if you move it (camera keys, scroll, drag, or click a pack to follow it), it's yours. Leave it alone for 8 seconds and it goes back to the auto camera. This works in ball battles too.

## 1.50.0 (test build)
- 🚫 **New movie bans** (Settings → 🚫 Banned Movies, each one can be turned off):
  - 🌍 Movies that aren't in English at all. Movies that are mostly English with some other languages in them are fine.
  - ⛪ Really religious movies, like *The Passion of the Christ* or *The Ten Commandments*. Comedies, horror and action movies that only touch on religion are still allowed.
  - 🎥 Pure documentaries. A documentary that's also a comedy (like *Jackass*) is fine.
  - They go by TMDB's info (languages, genres, keywords), so they can guess wrong now and then: **Unban** a movie to pre-approve it (the rules skip it from then on), or ban one by hand. Searching a movie on that page shows if the rules ban it, with a **✅ Pre-approve** button.
  - A movie lands in the banned list the first time someone tries to pick it. **🔎 Check movies already picked** shows the movies already in the pool that break the rules. Nothing happens to them unless you ban them.
- 📌 **Discord says banned movies need your OK first:** the pinned message and every ban message tell people to ask Kirb to unban a movie they want to suggest. You can change who they ask on the Banned Movies page. The 24/7 Discord bot follows the same rules, so Movie Royal will ask you to update it once.
- 🔍 **Search box for banned movies:** search the banned list by title, year or reason, and filter it (banned by you / not in English / religious / documentary). It shows 100 at a time.
- 🎨 **Holiday app style:** when a holiday is close (New Year's, Valentine's Day, St. Patrick's Day, Easter, the 4th of July, Halloween, Thanksgiving, Christmas), Movie Royal asks when it opens if you want the app dressed up for it, with its own colors and little falling decorations.
  - **Yes** turns it on until the holiday is over.
  - **Not now** asks again next time.
  - **Not until next year** stops asking about that holiday until next year.
  - Only the app changes, not your stream. Change it any time in Settings → App & background → 🎨 App style (Automatic, Normal always, or any holiday's style all year).
- 💲 **Check a card's price:** a new button under 🥋 FIGHT! on the Card battles tab. Type a card you pulled from the pack and open TCGplayer, eBay sold listings or PriceCharting in your web browser.
- ❓ **Fixed:** help mode stopped working when you clicked some buttons on the 🧪 Test tab (like the map "Try it" buttons).

## 1.49.1 (test build)
- ✋ **The movie winner is always asked first.** When a Discord movie wins and the winner types in chat, Movie Royal now always asks them !accept or !pass before the movie is claimed. Before, a happy first message like "YES!" or "yeah" counted as the answer, so the movie got claimed without the question ever being asked. Now only typing !accept / !pass right away skips the question; yes / no words count once they've been asked. If the bot can't ask in chat (not signed in, or Twitch says no), you get a warning to use ✅ Accept / ⏭️ Pass on the winner card.
- 🎉 **Holiday maps have their own section.** Every map list (Battle tab, Settings, Card battles, the test lab) now puts the holiday maps together in a "🎉 Holiday maps" section at the bottom. They're still normal maps: use them any time, and they still come up on 🎲 Random.

## 1.49.0 (test build)
- 🔁 **Only the first respin counts, always.** If several people redeem a respin at the same time, the first one spins. Everyone else's goes into their account as a free saved respin instead, and the bot tells them. This counts for channel points and saved spins (!respin), and it applies while a respin is spinning, waiting to spin, or in the few seconds after it lands. It's always on now: the old on/off switch is gone, and you can still set the seconds in the wheel's settings.
- 🎟️ **History → 🎟️ Free spins:** a new tab listing every free (saved) wheel spin:
  - given, with why: subs, bits, respins at the same time, sneaky auto-spot respins, or ones you gave by hand
  - used, with when and on which wheel
  - given back, when a used one couldn't spin
  - totals, plus who has saved spins right now
  - There's a search and Given / Used filters, so you can double-check everything was done right.

## 1.48.3 (test build)
- 😏 **Sneaky respins on auto spots:** if someone redeems 🔁 Respin while the wheel is on an auto spot (before the reward hides), the wheel doesn't spin. They get a free saved respin in their account instead, and the bot says: "Nice try @name, sneaky sneaky! No respins on an ⚡ auto spot, so no spin for you right now… but one has been added to your account for the future 💜". Trying !respin there gets a "Nice try" too (their saved respin stays saved).

## 1.48.2 (test build)
- ⚡ **No respins on auto spots** (⚡ Auto, ⚡🔢 Auto + countdown and ⚡🔀 Auto + Link):
  - While the wheel sits on an auto spot, the 🔁 Respin channel point reward hides from the menu, and nobody can respin.
  - Someone who redeems it just before it hides gets a saved respin for later, and the bot tells them.
  - !respin keeps their saved spin, and the 🎟️ streamer respin button says no.
  - You carry on as usual with 🎡 SPIN.

## 1.48.1 (test build)
- 💬 **Wheel name boxes:** only known bots are left out now (Nightbot, StreamElements, Streamlabs, Moobot, Fossabot, Wizebot, Sound Alerts, your own chat bot, and the bot list in the giveaway settings). Someone with "bot" in their name still shows up.

## 1.48.0 (test build)
- 🎡 **New spot type: ⚡🔢 Auto + countdown.** It's an ⚡ auto spot (the round timer pauses when it lands, and chat can still respin) with a countdown:
  - Each landing takes one off its count, even if someone respins off it afterwards.
  - The wheel shows it as "Spot (auto 2)".
  - At 0 it leaves the wheel on the next spin.
  - ➖ / ➕ under the result fix the count by hand.
- 🔁 **Respins on auto spots:** checked that chat can respin with channel points or saved spins while an auto spot has the timer paused (spots only block respins if you tick 🚫 no respins on them).
- 💬 **Name boxes on the Wheel tab suggest chatters:**
  - The boxes are "Who's spinning?", "Give spins" and "Who paid for it?".
  - Click one (or start typing) and the people who chatted most recently show first.
  - Bots are left out: Nightbot, StreamElements, Streamlabs, your own chat bot, and any name ending in "bot".
  - Give spins also lists everyone who already has saved spins.

## 1.47.0 (test build)
- 🎬 **Discord battle: ⏱️ 2-min join timer + chat vote** (the timer button on the Battle tab when the Discord movie battle is picked):
  - **The board resets:** only people who type in Twitch chat during the 2 minutes get their movies on (plus anything you put in yourself with ▶).
  - **A numbered list of every movie** shows on the right of the battle screen, with who picked it and their luck. Movies whose person hasn't chatted yet are dimmed until they do.
  - **The bot tells chat to vote who'll win** by typing the number or the movie name. Votes show on the list (🗳️), and people can change their vote until the fight starts. If their pick wins, they get +1% luck on their own movies next time (same setting as "call the winner").
  - **It doesn't start the battle by itself** when the 2 minutes are up: you press START ROYAL. The bot gives chat a last-chance-to-vote message, and the list goes away when the fight starts.
  - Other battles (chat battles, giveaways, your own lists) still start by themselves after the 2 minutes, like before.
- 🧪 Checklist item to try it (vote with 💬 Test chat).

## 1.46.0 (latest release)
- 🌐 **IMDb / Rotten Tomatoes battles** ("the 500 worst movies"): **+ New battle → 🌐 IMDb / Rotten Tomatoes**.
  - Tick the ready-made lists (🍅 Rotten Tomatoes' 100 worst movies of all time, 🎬 IMDb's lowest rated movies with 10,000+ votes, 🎬 IMDb Bottom 100) and/or paste your own IMDb or Rotten Tomatoes links. They're read in order.
  - Pick how many movies (500 by default).
  - It skips movies that aren't in English, movies already on the Discord movie list, and movies you've watched or rated on Letterboxd. Skipped ones don't count: it keeps going down the lists until it has the full 500.
  - The Movie Pool shows how far along it is, what got skipped, and a 🔄 Update button to read the lists again later. Each skip can be turned off there.
  - The app reads IMDb and Rotten Tomatoes with a hidden browser window (and presses IMDb's "50 more" button for you). I couldn't reach either site from here to try it for real, so tell me if a list comes back empty.
- 🧪 Test tab: **🌐 IMDb / Rotten Tomatoes battle** makes a pretend list of 40 made-up movies (no internet) so you can see the skipping work, plus checklist items.

## 1.45.0 (test build)
- 🪖 **New card map: WW2 Battlefield** (card battles only). A muddy battlefield with bombed-out buildings and smoke. Every pack has a rifle and shoots it out (up close they use the rifle butt and kicks). Two tanks shell the field (a red crosshair shows where the shell lands), and bombers fly over dropping bombs (shadows show where). Shells and bombs leave craters. The last two get the FINAL FIGHT: a one-on-one shootout. Its own march music.
- 🧪 **Quick test lab** at the top of the Test tab, in place of a box for every map:
  - Pick ball or card battle and the map.
  - Set how many pieces, fight length, countdown, pacer, luck, what's on the pieces (movies, numbers, chat names), Figure 8 laps, power-ups and wacky settings.
  - Press ▶ Run test. The battle plays right there on that page, and it never goes on stream. Nothing is saved, and nothing goes to chat or Discord.
  - ⏩ +5 s and ⏭ To the end fast-forward it. Buttons under the screen set off chaos events or the map's power during the fight.
  - The checklist's "Try it" buttons for maps open the lab.

## 1.44.1 (test build)
- 🌋 **Pompeii, made the way you described:** a much bigger, long town running downhill from the volcano to the sea, and the screen **scrolls down** as the battle goes on. The lava pours in at the top and chases everyone down through the streets (a bit ahead down the main roads), just a little faster than anyone can run. **Buildings block everyone** (balls and cards), so they have to get round them through the streets. Nobody outruns it: the lava gets everyone, and the last one left wins.

## 1.44.0 (test build)
- 🎉 **Six new holiday maps** (ball and card battles, on Random any time of year):
  - 🎃 **Haunted Graveyard** (Halloween): ghosts drift after the pieces, and one touch SCARES a piece into running for the edge. Jack-o'-lanterns drop out of the sky (a circle shows where) and blow up.
  - 🎆 **New Year's Eve**: a rooftop party at midnight. Rockets shoot up and burst on the pieces, and THE GIANT BALL drops (its shadow grows first) and smashes a big hole in the roof.
  - 💘 **Heartbreak Island** (Valentine's Day): a heart-shaped island with two evil cupids shooting arrows (a dashed line shows each shot). Halfway through, the heart BREAKS down the middle.
  - ☘️ **Leprechaun Hills** (St. Patrick's Day): evil leprechauns hop after the pieces and kick them toward the edge, and the RAINBOW BEAM blasts across the island.
  - 🐰 **Bunny Rampage** (Easter): a giant evil bunny hops around and stomps (its shadow shows where it lands), and painted eggs wobble, crack and blow up.
  - 🎇 **Fourth of July**: bottle rockets skitter across the ground in straight lines, and strings of firecrackers go off pop-pop-pop and knock out the ground.
- 🧪 Test tab: a box for each (balls or cards), plus checklist items.

## 1.43.0 (test build)
- 🔮 **New map: Elemental Wizards** (ball and card battles). A floating island in a magical sky. Four wizards stand on giant pillars at the corners and take turns casting at the island: 🔥 fireballs blow pieces up, 🌊 a tidal wave washes pieces toward the edge, 🪨 boulders smash the ground away, and ❄️ ice freezes pieces solid (if they're still frozen when it wears off, they shatter). Every spell shows where it'll land first.
- 🌋 **New map: Pompeii** (ball and card battles). An old Roman town with the volcano erupting behind it. Lava pours in at the top of town and flows down the roads first, then spills into the houses, and everyone runs from it. Touching lava = burned. The volcano also throws burning rocks (a circle shows where) that blow pieces up and leave little lava pools. Town walls all round, so nobody gets knocked off the edge.
- 🎅🦃 Santa's Workshop and Turkey Trouble now come up on 🎲 Random any time of year (the month limit and the "Holiday maps all year" setting are gone).
- 🧪 Test tab: boxes for 🔮 Elemental Wizards and 🌋 Pompeii (balls or cards), plus checklist items.

## 1.42.0 (test build)
- 👀 **Watch luck** (per battle, off by default): the more someone watches your stream, the more luck their pieces get in that battle. Default: every **10 hours watched = +1% luck** (both numbers can be changed). Hours count from when you turn it on (↺ Start counting again resets it). Find it on the Battle tab under the luck buttons: 👀 Watch luck, which also shows who has how many hours and how much luck they've earned. Only works for people linked to their Twitch name.
- 🎅 **New map: Santa's Workshop** (ball and card battles). A snowy North Pole island under the northern lights. Herds of evil red-eyed reindeer stampede across the island (a red STAMPEDE stripe shows their path first) and trample anyone in the way, and a giant evil Santa looms behind the island, locks on and fires lasers out of his eyes. Its own spooky sleigh-bell music.
- 🦃 **New map: Turkey Trouble** (ball and card battles). A harvest farm at sunset. Evil turkeys strut out, chase everyone and peck and kick them toward the edge, and every so often a whole flock gobbles across in a TURKEY TROT (orange stripe first) that knocks everyone in its way off the island. Its own barn hoedown music.
- 🧪 Test tab: boxes for 🎅 Santa's Workshop and 🦃 Turkey Trouble (balls or cards), plus checklist items for both maps and watch luck.

## 1.41.0 (test build)
- 🧟 **New map: Zombie Horde** (ball and card battles). City streets at night, closed off with barricades. Zombies shamble out of the manholes and the street ends and chase everyone, and everyone runs. Buildings block the way. Balls that get bitten take damage (too many bites and they're eaten). A card that gets bitten is INFECTED: it's out, but it stays on the map as a zombie and chases the others. Nothing crumbles, nobody falls off, no weapons, no final fight. Map power: 🧟 Zombie Horde.
- 🦖 **New map: Monster Mash.** The fight is on the rooftops of a few tall buildings (walls all the way down to the street, long drops into the alleys). Two giant monsters made up for Movie Royal, MAGMAW (a lava-rock lizard) and BRUTOX (a four-armed horned beast), fight in the streets. Their punches, fire breath and tail swipes smash the rooftops, and the part they hit collapses into the building. Every so often they hit each other and one stumbles into a building and knocks a corner off. Map power: 🦖 Monster Stomp.
- 🦸 **Hero City: two new villains.** 🏗️ Wrecker swings a wrecking ball across a row of the roof and knocks everyone it hits off. 💣 Bombshell flies over in a jet and drops bombs that blow pieces up (luck can dodge it). Hero City shows 🔵 UPDATED.
- 🧪 Test tab: boxes for 🧟 Zombie Horde and 🦖 Monster Mash (balls or cards) and 🦸 Hero City, plus checklist items.

## 1.40.0 (test build)
- ↺ **Reset the 🔴 NEW / 🔵 UPDATED map tags** (works while you're live too): Settings → Game → 🔴 NEW / 🔵 UPDATED tags. ↺ Reset all map tags, or ↺ next to one map. Ball maps and card maps.
- 🎉 **Chat battle fun mode, easier to find:** the power-ups + wacky effects box is now right under the Chat battle box on the 💬 Chat battle tab.
- 💜 **Chat buys power-ups with channel points only (never bits), and each one has its own on/off box.** New power-ups: 👻 Ghost (nobody can bump them for the first 10 seconds), 🦔 Spiky (bumping them hurts), 🧲 Magnet (pulls everyone close). An unticked power-up stays paused on Twitch. Press ✨ Add power-up rewards to Twitch once to add the new ones.
- 🤪 **New wacky effects:** 🧊 Slippery (ice the whole battle), 🔀 Swap-o-rama (everyone swaps places every 10 seconds or so), 💨 Speedy (everyone has turbo), 👀 Googly eyes. Plus ✕ All wacky off, and 🧪 Try it (a pretend fun battle with what you ticked and half the balls powered up).

## 1.39.4 (test build)
- ☠️ **Doomsday turns your mic and camera back on once the stream is over.** Your mic and camera stay off until OBS says the stream has really ended, then Movie Royal turns them back on (only the ones Doomsday turned off). If Movie Royal gets closed in the middle, it does it the next time it opens.
- ☠️ **Test the whole Doomsday for real:** 🧪 Test → 🎡 Wheel tests → ☠️ The real thing → **Run the whole Doomsday**. The Doomsday screen, mic + camera off, and if you're live your stream really ends 15 seconds later. While you're live, a big red warning pops up first and its “Yes, end my stream” button only works after 5 seconds. (That warning is only for the test: the real Doomsday never asks.) Not live = a rehearsal: no stream to end, and your mic + camera come back on after 15 seconds.

## 1.39.3 (test build)
- 🧪 **Test tab:** the 📺 Preview and 💬 Test chat buttons are now at the top right of every part of the Test tab (🧪 Tests, ✅ Checklist and ⚠️ Errors).
- ➡️ **Tests take you to the right tab.** Running a test battle takes you to the ⚔️ Battle tab, a wheel spin to the 🎡 Wheel tab, and a card battle test to the 🃏 Card battles tab, so you're right where the action is.
- ⚙ **Test battle settings.** The ⚔️ Ball, 🔢 Number, 🚗 Derby and 🏁 Figure 8 test boxes have a ⚙ Settings button: how many pieces, which map, the countdown, the fight length, the pacer, the laps, and luck on or off. Only practice battles use them (blank = your normal settings). Saved on this computer; ↺ Start over puts them back.
- 🃏 **Card pool:** the game check boxes (Other, Pokemon, Pokemon Japan…) are gone. Every pack fights, whatever game it's from.

## 1.39.2 (test build)
- 🚌 **Figure 8 Race: buses steer around wrecks.** They look ahead for totaled buses, pick a line that clears all of them, and brake if there's no room, instead of plowing straight in. (In tests, hard hits on wrecks went from about 27 a race to under 2, and most of those are buses getting shoved by another bus.) There's still plenty of banging between buses that are running.
- 🛑 **Wrecks stay put.** A totaled bus slides to a stop and stays where it is, instead of getting shoved across the track.
- ⚡ **Faster bus maps.** Each bus keeps a ready-made picture of itself and only redraws it when it turns or takes more damage (a wreck is drawn once), and the Figure 8 track is drawn once instead of every frame. Wrecks also smoke hard at first, then settle to a lighter smoke, so the race doesn't slow down as more buses wreck.

## 1.39.1 (latest release)
- 🃏 **Card pack search can't get stuck any more.** The shop page it reads could keep loading forever (and the web picture search had no time limit), so the search never came back. Now every place it looks gets about 30 seconds at most.
- ⏹ **Stop** and 🔄 **Search again** buttons next to 🔍 Search in the 📦 Card pool, plus a seconds counter while it searches. A new search also ends an old one.
- 🧪 Checklist: “Try it” runs a pretend search that never finishes, so you can try ⏹ Stop.

## 1.39.0 (test build)
- 🚌 **New ball battle map: 🚗 Demolition Derby.** The pieces aren't balls, they're school buses (25 different paint jobs, then they repeat). Everyone rams everyone in a mud arena; side hits (T-bones) hurt the most. Every bus has hidden health and you can see it getting beat up: dents and scraped paint, cracked then smashed windows, a loose bumper, a popped hood, smoke. A wrecked bus stops right where it is and keeps smoking. Last bus running wins. Map power: 🚚 Monster Truck.
- 🏁 **New ball battle map: Figure 8 Race.** School buses race laps around a figure 8, with lots of banging (especially at the crossing in the middle). The flagman waves 🟩 green to go, 🏳️ white for the last lap and 🏁 checkered at the finish. Pick the number of laps in Settings → Game (5 to start). First across the line wins; the others are placed by how far along they were. About 1 race in 25 turns into last bus standing instead. Map power: 🛢️ Oil Slick.
- 🍀 **Luck on the bus maps:** more luck = more health and a faster bus (the more luck, the faster). 50 luck or more gets a 🐄 cow catcher on the front: head-on hits hurt it less and it hits harder. No glow or flames on buses.
- Both bus maps are for ball battles only (not card battles).
- 🎯 **Fair winner, always:** every battle's winner is drawn by the odds before it starts (like a wheel, with luck counted in), and the battle plays out around it. Chaos, power-ups and wacky settings change the show, never who wins. (The old on/off box is gone.)
- 🧪 Test tab: ▶ boxes for 🚗 Demolition Derby and 🏁 Figure 8 Race (with 1 lap and 💥 Last bus standing buttons), plus checklist items.

## 1.38.1 (latest release)
- 🆕 **New Setup guide steps pop up when Movie Royal starts.** When an update adds a step to the 🧭 Setup guide (like 🎉 Viewer's Choice in OBS), a pop-up shows it each time the app starts until you open the guide, set it up, or press Don't show again.

## 1.38.0 (test build)
- 📺 **Viewer's choice in OBS works with just OBS open.** “Put it on my stream” (Settings → 💰 Rewards & prices, or the new last step of the Setup guide) now adds a source that reads your Twitch chat by itself, so the celebration plays on stream even when Movie Royal is closed. The reward has to ask viewers to type something (Movie Royal's does).
- 🎁 **For a friend:** the same thing as one file anyone can download: https://github.com/TimePeace49/movie-royale-releases/releases/latest/download/viewers-choice.html. They open it in their browser, type their channel, redeem their Viewer's Choice once, and it gives them what to paste into OBS. No Movie Royal needed.
- 🔢 **New channel point rule: Countdown.** In Settings → 💰 Rewards & prices, “When it's on” → 🔢 Countdown: X uses per stream. On until it's been used that many times this stream, then off until the next stream. Shows how many are left; ↺ starts it over.
- 🏷️ **Renamed maps:** the card wrestling map is now **🔔 Royal Rumble**, and the ball wrestling map is now **🤼 Rumble Royal**.
- ✅ **Checklist:** 📺 Preview and 💬 Test chat buttons at the top right.
- ⧉ **The 💬 Pretend chat pops out** into its own window (like the preview window already does), so both can go on another screen.

## 1.37.0 (test build)
- 🎁 **Viewer rewards, always on in the channel points menu:** 💧 Hydrate, 🙆 Stretch, 🎩 Pick a hat and 🎉 Viewer's choice. Movie Royal makes them once you're signed in. A reward you already had keeps its name and price (Movie Royal deletes it and makes it again; one made by hand on Twitch can only be deleted on Twitch, and still works meanwhile).
  - 💧 Hydrate / 🙆 Stretch: a pop-up with a chugging / stretching sound for 5 seconds, only while Movie Royal is the window you're on.
  - 🎩 Pick a hat: the bot lists your hats in chat with numbers; the viewer types the number or name; the bot says which one and a pop-up shows it. Your hat list: Settings → 💰 Rewards & prices.
  - 🎉 Viewer's choice: the pop of confetti, a crowd going wild, confetti and balloons over the whole screen and a big pop-up in the middle for 10 seconds. It shows over whatever you're using on your screen, and on stream once you press **📺 Put it on my stream** (adds an OBS source “Movie Royal celebration” on top of every scene; off until you press it).
- 🧪 Test → 🎁 Viewer rewards: pretend redeems for all four, plus checklist items.

## 1.36.0 (latest release)
- ▶️ **Test tab: “Try each kind of battle” at the top.** Its own box for each kind, each with ▶ Run it: ⚔️ ball battle, 🎬 Discord movie battle, 🔢 number battle, 🎡 wheel, 🏯 Kung Fu Town, 🔔 Rumble Ring, 🧙 Wizard Battle, 🏛️ Colosseum, and ⚪🃏 a card battle on a ball map. The preview window pops up so you can watch.
- **Fixed: number balls 10 and up showed only their first digit** (10 showed as 1). The whole number shows now, smaller when it's long.

## 1.35.5 (test build)
- 📌 **Keep the winner in my pool** (right side of the 🃏 Card battles tab, off by default): when it's on, the winning pack stays in your Card pool instead of one coming off its count. It still shows in the latest winners, and the winner screen says “Stays in the pool”.

## 1.35.4 (test build)
- **Fixed: the card battle screen loaded too big** when you opened Movie Royal and went to the 🃏 Card battles tab: it hung over the Playing / Wacky rows below it. It now fits its box, and keeps fitting when the boxes around it change size.
- **Fixed: switching card maps while the packs were waiting** (for example Colosseum → Wizard Battle) kept the old map's spots and weapons: packs fell off the platform right away and weapons went flying. They now line up fresh for the new map. The banner at the top only lists wacky settings the map uses.
- **🔴 NEW / 🔵 UPDATED on card maps**, like the ball maps: a card map shows 🔴 NEW until it's been played on stream (while you're live), and 🔵 UPDATED after it changes.

## 1.35.3 (latest release)
- 🗺️ Card battles: picking another map (or another card battle with a different map) resets the screen by itself: the old winner screen goes away and the new map starts fresh. A fight that's already going isn't stopped.

## 1.35.2 (test build)
- 🧙 Wizard Battle: wizards now cast spells at anyone from anywhere on the platform (no walking up or lining up first). They stroll around between spells, and pick all kinds of targets, not just the closest.

## 1.35.1 (test build)
- 👥 Movie Royal now opens on the **People** tab instead of the Battle tab. (Like before, the battle is what's on stream when it opens, not the wheel.)

## 1.35.0 (test build)
- 🧙 **New card map: Wizard Battle** (card battles only). The packs are wizards with pointy hats and wands on a giant floating platform in the night sky. They cast magic bolts, fireballs and lightning, and meteors smash parts of the platform. Cracked stone falls away: a pack that falls through a hole or off the edge is out. No weapons. When 2 are left the platform rebuilds itself for a FINAL FIGHT.
- 🏛️ **New card map: Colosseum** (card battles only). A gladiator battle: every pack starts with its own weapon and keeps it (no stealing). 8 kinds: sword, spear, trident, axe, mace, flail, hammer, scimitar; spears reach further, axes and hammers hit harder but slower. FINAL FIGHT when 2 are left. Gladiator helmets, war drum music.
- 🦁 **Lions** (Colosseum): a new on/off switch in the 🤪 Wacky bar (only shows when the Colosseum is the map). On = lions come out of the tunnels and hunt the gladiators. Off, even mid-fight = they stop attacking and walk back into the tunnels.
- The 🗡️ Weapons wacky setting now only shows for Kung Fu Town (the other card maps have their own weapons, or none).
- 🧪 Test tab: 🧙 Wizard Battle, 🏛️ Colosseum and 🦁 Lions pretend fights + checklist items.

## 1.34.1 (test build)
- 🎥 **Card battles have camera controls now**, like the ball battles. The camera zooms in on the fight by itself (closer as fewer packs are left; whole view for the intro, replay and winner). Under the fight on the 🃏 Card battles tab: 🎯 Follow a pack (◀ ▶ to switch), 🗺️ whole map, 🎥 Auto, move and zoom. On the fight itself: scroll to zoom, drag to move, click a pack to follow it, double-click for auto. Works in Kung Fu Town, the Rumble Ring and the ball maps. Settings → Game → Auto camera turns the auto zoom off.
- 🧪 Test tab: 🎥 Card camera test + checklist item.

## 1.34.0 (test build)
- 🤼 **New card map: Rumble Ring** (card battles only). All the packs start in a wrestling ring and the only way out is over the top rope. They do wrestling moves: body slams, suplexes, Irish whips into the ropes (and a clothesline when they bounce back), elbow drops, dropkicks. At 0 health a pack goes down instead of being knocked out, and the more hurt a pack is, the easier it goes over the top rope. Steel chairs get thrown into the ring (2 per fight). The moves stay fairly realistic unless a 🤪 wacky setting is on. When 2 are left there's a 🥊 FINAL FIGHT with a chair each. It has its own rock music, a crowd that cheers, and a bell.
- 🤼 The middle of the ring shows **your Twitch picture**. To use your own logo: 📦 Card pool tab → set the map to Rumble Ring → 🖼️ Pick a ring logo (↺ Use my Twitch picture goes back).
- 🗺️ **Map menus:** maps only that battle can use are on top (A to Z), then a line, then the maps both battles can use.
- 🧪 Test tab: 🔔 Rumble Ring pretend fight, plus 3 new checklist items.

## 1.33.1 (test build)
- **🗡️ Card battles: packs go for the weapons.** A pack that isn't fighting anyone right now and has no weapon goes for whichever is closer: a weapon lying in the street, or the pack holding one. Packs already in a fight keep fighting.
- **✅ The checklist is a plain list again** (rows with the button on the right) instead of big boxes.

## 1.33.0 (test build)
- **⚪🃏 Card battles can use every ball map.** Pick any map on the Card battles tab (or 🎲 Random): the packs fight there as card fighters with arms, legs, faces, health bars and blood. No chat power-ups in card battles; ones redeemed meanwhile wait for the next ball battle. Kung Fu Town stays card-only (it's not in the ball map list).
- **Map menus show who a map is for:** ⚪ = ball battles, 🃏 = card battles, ⚪🃏 = both.
- **🥊 FINAL FIGHT in Kung Fu Town:** when 2 packs are left, they're moved across the street from each other and each gets a weapon. The fight clock stops while "FINAL FIGHT! (A vs B)" shows, a bell rings, then they fight on a 20-second clock. Other maps get a final fight when you say so.
- 🧪 Test → 🃏 Card battle tests: **⚪🃏 On a ball map** and **🥊 Final fight**.

## 1.32.0 (test build)
- **Fixed: Movie Royal locked up after leaving Card battles in the middle of a fight.** A card fight you leave now finishes quietly behind the other tab (it still counts), and coming back never makes the app catch up on a long fight all at once.
- **Fixed: 📦 Card pool − / + and typing how many packs you have didn't stick.** They save right away now, and the number boxes have no little arrows.
- **📦 Card pool looks like the 🎬 Movie Pool:** your card battles on the left (click one to change it), its settings at the top (every pack counts or 1 of each, map, games, ⏳ pacer, ⏱️ fight length), and your packs in a list with − / + and each one's chance.
- **🃏 Card battles tab:** 📦 Every pack counts / 1️⃣ 1 of each buttons right under FIGHT!.
- **🔍 Pack search looks in more places:** TCGplayer's search page (opened in a hidden window inside Movie Royal, like you'd see it), TCGplayer's search, and 🌐 pictures from the web for what you typed, so you can always pick a picture. If nothing is found, it says where it looked.
- **⏳ Elimination pacer slider:** Settings → Game for ball battles, and in each card battle's settings. It follows the fight length, so a longer fight is paced over more time. 0 = off.
- **🥊 Card battles get the pacer + FINAL SHOWDOWN**, and a **⏪ REPLAY** of the last moments before the winner screen.
- **🗡️ Weapons:** only 2 per fight, they hit much harder, everyone without one goes after whoever has one, a hit can knock it loose (STOLEN!), and it drops when its holder is knocked out.
- **↔️ Resize the boxes** on the Battle and Card battles tabs: drag the bar between the battle screen and the side boxes (double-click to reset).

## 1.31.1 (test build)
- **⏳ Battles are paced better:** pieces don't all go out in the first few seconds any more. Knockouts are spread over the whole battle, and if the battle is moving too slowly the arena throws in extra chaos (⚡ ARENA).
- **🥊 FINAL SHOWDOWN:** when only 2 are left with time still on the clock, they no longer hop around for 10+ seconds. The showdown starts: they charge at each other, powers go off faster and the ground breaks away until one is left. In tests the last two used to be left alone for about 16 seconds; now it's a few seconds of fighting.
- **📏 Capture window size on the Battle tab:** − / + and a slider under 📺 Capture window make it bigger or smaller on stream right away.

## 1.31.0 (test build)
- **🃏 Card battles (new tab) + 📦 Card pool (new tab):** your card packs fight each other on stream.
  - **📦 Card pool:** search for a pack, say how many you have, and press ➕ Add: its picture downloads by itself. Can't find one? ➕ Add my own pack with a picture. Each pack you own is one fighter (5 packs = 5 fighters). Packs are never deleted: 🙈 hides one.
  - **🃏 Card battles:** packs with stick arms and legs, a red headband and angry faces have a martial arts brawl in **🏯 Kung Fu Town**, an old Chinese town like an old kung fu movie (lanterns, tiled roofs, a pagoda, cherry blossoms, kung fu music and a gong). Punches, kicks, flying kicks, blocks, health bars on top, and they get bloody as they get hurt. No luck (every pack has the same chance) and no chat power-ups. When a pack wins, one comes off its count: you open it.
  - **⚙ Edit / + New card battle:** every pack or just 1 of each, and which games fight (for example only Pokémon).
  - **🤪 Wacky settings**, on or off before or during a fight: 🪶 low gravity, 🩸 extreme gore (more blood, packs lose arms and legs, faces get chopped off), 🔀 teleport switches, ⚡ turbo, 🐌 slow motion, 🦍 giant / 🐜 tiny packs, 🧊 slippery street, 💣 exploding K.O.s, ☠️ one-hit K.O., 😡 rage mode, 🗡️ weapons. In fullscreen they're in the panel on the left that fades when you're not using it (keys 1–9, 0).
  - 🧪 Test → 🃏 Card battle tests: pretend fights (8 or 30 packs, gore, wacky). Nothing in your pool changes.
- **⚡🔀 New wheel spot type: Auto + Link.** An auto spot that always links somewhere: it lands, the round timer pauses, and it goes straight to another wheel, a battle or a card battle (pick it in ⚙ spot settings → 🔀). Then it comes back. Any spot can link to a card battle now.
- **🖥️ Window mode** (Settings → Graphics): Window, Fullscreen window (no border, like a game's borderless mode) or Fullscreen. Without a title bar, 🗕 and ✕ are at the top right.
- **🔬 Advanced graphics** (Settings → Graphics): render scale, particles, screen shake, glows, screen flashes and smooth pictures.

## 1.30.7 (test build)
- **⚔️ Battlefield map: running into the army hurts.** Every time a piece bumps into a knight or a horse it takes damage, and a few bumps knock it out (bigger pieces last a little longer). The map shows 🔵 UPDATED.
- **✍️ Spell check** in the text boxes you type words in (spot names, messages, titles…): misspelled words get a red squiggle, right-click for fixes. Boxes for links, passwords, keys and Twitch names are left alone.
- **📺 Capture window** on the Battle tab (under the 2-min chat timer): shows a window from your PC, like your browser playing a YouTube video, small in the top-left corner of your live OBS scene. Press it again to hide it. ⚙ picks the window, the size, and whether it hides by itself when the battle starts. Needs OBS set up in Settings → 🎥 OBS. Try it in 🧪 Test → 📺 Capture window.
- **📣 Chat message follows your tab:** it's now one switch for every tab, and each time it posts, it posts the message for the tab you're on (Battle = how to add movies, Chat battle / Giveaway = how to join, Wheel = how respins work). Turning it on posts right away, so turn it off and on again to post now.

## 1.30.6 (test build)
- **🎟️ Wild spots pin nothing when they win.** Movie Royal waits for the wild spot battle: its winner is pinned as the movie. If that winner is a text entry (not a movie), nothing is pinned and it is left out of the movie lists, so you can pin it yourself (the movie numbers still count it). 🧪 Test → 📌 Movie winner pin has a new 📝 button to try that.
- **↔️ No more scrolling sideways on any tab.** Everything fits the window: the row under the battle screen wraps onto a second line, the wheel side gets narrower on small windows, and on a narrow window each wheel spot takes a couple of lines instead of a long row. Scrolling up and down still works.

## 1.30.5 (latest release)
- **📌 The movie pin in Twitch chat is clearer:** "Movie #2 of tonight's stream: Heat (1995) — Lucy's movie", then every movie watched earlier tonight and whose it was ("⏪ Earlier tonight: #1 Alien (1979) — Bob's movie"). The pinned Discord message lists them the same way.
- **🎟️ Wild spots:** when a wild (Kirb) spot wins the Discord battle, the pin says so and that the wild spot battle picks the movie. The next battle you run (any battle that isn't a chat battle or giveaway) is the wild spot battle: it shows "MOVIE #2 TONIGHT" on stream, and its winner becomes that movie, pinned as Kirb's pick. Pass on it and the next battle picks again.
- 🧪 Test tab → **📌 Movie winner pin** shows what gets pinned as a pretend night goes on (nothing is really pinned or counted).

## 1.30.4 (test build)
- **⏸ Paused entries stay in the pool list:** ↺ Reset entries, Clear and ✕ now pause entries instead of moving them to a separate list. They stay in the 🎬 Movie Pool list, darker but readable, with **▶ Bring back** on each and **▶ Bring them all back** at the top. Nothing is deleted.
- **💰 Settings → Rewards & prices:** every channel point reward, bits amount and donation amount in one place, sorted by tab. Change prices (saved on Twitch right away), and set when each reward is on: 📏 follow the rules, ✅ always on, ⏸ off (hidden on Twitch), or 1️⃣ on, then off after one use (these beat the rules). ⏸ Pause any bits amount, or subs / bits / donations on the wheel.
- **🚀 Raid reward** (on by default, Settings → 💰 Rewards & prices): a viewer redeems it and Movie Royal asks them in chat who to raid. They type a Twitch name, a pop-up with a celebration sound shows it, and a **🚀 Raid → name** box appears at the top of the app. Click it to start the raid. The reward hides for the rest of the stream once used. Movie Royal makes the reward: an old raid reward keeps its price (1500 if none). **Sign in with Twitch again once** so it can start raids.
- **🧭 The top tabs never scroll:** they shrink step by step to fit (down to just the icons on a small window) and stay on top.
- 💬 Pretend chat has a 🚀 Raid button to try the raid.

## 1.30.3 (test build)
- **🙈 Fixed: taken-out entries looked deleted.** ↺ Reset entries, Clear and ✕ only hide entries, but the 🎬 Movie Pool didn't show them anywhere. Now they're listed under **🙈 Invisible** in the pool (greyed out), with **👁️ Show** on each one and **👁️ Put them all back**. Nothing you reset before was deleted: open the battle in the Movie Pool and press Put them all back.
- **🎡 Two new wheel channel point rewards:** **✌️ Double trouble** (after redeeming, they type any spot in chat and it doubles in size; the void can't be picked) and **🛑 Force stop** (the round ends right away: the spot it's on has to be done). Add them with ✨ Add missing rewards (Wheel → 🌐 All wheels); each wheel can turn them off in ⚙️ Wheel settings. 💬 Pretend chat has ✌️ Double and 🛑 Stop buttons to try them.

## 1.30.2 (test build)
- **Removing entries never deletes them now, it only hides them:**
  - ↺ Reset entries, 🧹 Clear entries (chat battles, giveaways) and Clear in the 🎬 Movie Pool take entries out but keep them (🎬 Movie Pool → Taken out → put them all back). Someone who joins again comes straight back.
  - On the wheel, ✕ makes a spot invisible (🙈, it stays in the list with all its settings; 👁️ shows it again). To really delete a spot: ⚙ → 🗑 Delete for good.

## 1.30.1 (test build)
- **🔇 Movie Royal goes quiet when you're in another program** (on by default): click into a game, OBS or your browser and every Movie Royal window mutes; click back and the sound comes back. The stream isn't affected (the game screen in OBS plays its own sound). Turn it off in Settings → App & background → 🔇 Sound if you capture Movie Royal's window or desktop sound in OBS.

## 1.30.0 (test build)
- **📣 Hourly chat messages:** a **📣 Chat message** button on the Battle, Chat battle, Giveaway and Wheel tabs. It posts that tab's message in Twitch chat right away, then every hour, until you press it again or your stream ends.
  - Battle tab: how to add movies (your Discord link, the movie channel, /suggest) and the commands command.
  - Chat battle / Giveaway: how to join. Wheel: how respins work.
  - ✏️ shows the message. Change the words, how often, or your Discord link in Settings → Twitch → 📣 Chat messages. No link pasted? The Discord bot makes a never-expiring invite by itself.
- **🤖 Movies Royal Bot:** Movie Royal's chat messages start with "🤖 Movies Royal Bot:" (change or remove it in Settings → Twitch). You can also sign in a separate bot account there so messages come from it.
- **↺ Reset entries** next to Fullscreen on the Battle tab empties the battle (chat battles: everyone who joined; your own battles: every entry, which you can put back from the Movie Pool). The old button is now **↺ Reset battlefield** (clears the cliff). The Discord movie battle can't be emptied from there.
- **🧪 Test tab and checklist sorted into groups** (battles, movie nights, chat, wheel, Discord, screen…), with jump buttons. New things to try get a **🆕** and a green number on the Test tab, like errors do: they sit at the top of ✅ Checklist until you tick them or press ✓ Seen them all.
- **Fixed:** pop-ups (subs, bits, joins…) no longer show up late on the battle screen after the wheel was on stream.
- **💬 Pretend chat → 🎬 Add a movie:** the viewer you're typing as adds a movie, like /suggest in Discord. 🧹 takes the pretend movies out again.
- **🛡️ Backup Bots:** its own icon (blue-green with a shield), and new **🖥️ Console** (what it's doing right now, live) and **⚠️ Errors** tabs (plain words, plus a debug report to paste to Claude).
- **🔗 Only linked viewers get stats:** chats, watch streaks and watch time are only counted for people who linked their Twitch in Discord with /linktwitch (and you). Chat is still saved for everyone. Profiles show the day they linked. Turn it off in Settings → Twitch.

## 1.29.0 (test build)
- **🧪 Test tab:** the preview window no longer follows you around. It only pops up when you run a test that changes the stream screen, and it closes when you switch tabs.
- **🖱️ Right-click works:** cut, copy, paste, select all, spelling fixes, copy/open links and copy pictures, in Movie Royal and Backup Bots.
- **🔒 New default: Discord picks and swaps only lock during movie battles.** People can `/suggest` and `/swap` right up until you press Start on a Discord movie battle. They lock while it plays and open again once it has its winner. Other choices in Settings → Luck & swaps: lock the whole time you're live, or never. **Update your 24/7 bot when Movie Royal asks**, so it follows the new rule too.
- **📌 Pinned messages:** the claimed movie pinned in Twitch chat says "Movie #2 tonight: …" and lists the movies watched earlier tonight. The pinned Discord message lists tonight's movies too.
- **📥 Importing a wheel** opens its own window with **📂 Choose a file…** (Windows Explorer), drag and drop, or a Wheel of Names link.
- **⚙ Spot settings open in their own window** with ⬆ Previous / ⬇ Next, so nothing is squeezed or cut off. The spot list also fits without scrolling sideways.
- **🎨 Graphics settings** (Settings → Graphics): resolution (720p to 4K), frame rate (match monitor, or lock at 30 / 60, caps up to 240), quality (low / medium / high), an FPS counter, and a power saver.
- **⚡ Less lag when switching tabs:** the game inside Movie Royal used to keep drawing full size on every tab. Now it draws much lighter while it's hidden or small (power saver, on by default), and never sharper than the window it's in. The stream (OBS) isn't affected.

## 1.28.12 (latest release)
- **🎡 Wheel of Kirbportions comes with the app:** all 71 spots with their rules (auto, countdown, max wins), sizes, colors and settings. It's added to your wheel list once; delete it if you don't want it and it won't come back. If you already have a wheel with that name, yours is left alone.

## 1.28.11 (test build)
- **☁️ The "Update your 24/7 Discord bot" pop-up is back on.** It shows when Movie Royal opens, but only when the bot on Cloudflare really is older than this version. If the internet was slow when Movie Royal opened, it checks again a couple of minutes later.
  - New box in Settings → Discord & picks: **🔔 Pop up when the 24/7 bot needs an update**. "Don't remind me again" on the pop-up unticks it, so you can turn it back on there.
  - 🧪 Test tab: **☁️ Show the 24/7 bot update pop-up** shows it any time.

## 1.28.10 (latest release)
- **🧪 Test tab: the preview window doesn't pop up by itself any more.** It only shows when you run a test that changes the stream screen (an alert, a battle, a wheel landing, pretend chat…). Checks like the Discord self-test, the backup link or Restart the Discord bot leave it closed. **📺 Show the stream screen** still opens it any time.

## 1.28.9 (latest release)
- **🔀 Fixed: linked ⚡ auto spots.** With the round timer on, landing on an auto spot that links to another wheel or a battle now does the link right away (before, it just paused and waited for you). The timer pauses like on any auto spot. When the linked wheel or battle is done, it comes back with your timer still paused, so you press start (or respin) like normal.

## 1.28.8 (latest release)
- **🛡️ Add your bot to the backup in one click, no copy and paste:**
  - In Movie Royal Backup Bots: **🍿 Add my bot from Movie Royal (this PC)**. It takes the token straight from Movie Royal on the same PC.
  - Or in Movie Royal: **🛡️ Add my bot to the backup on this PC** (Settings → Discord & picks, and the 🧪 Test tab).
- **📋 Copy my bot token works now:** it uses Windows' own copy. If that ever fails, it shows the token in a box so you can copy it by hand.
- **🔄 Movie Royal Backup Bots updates itself:** it looks for updates when it opens and every 6 hours. The bar at the top of its window has **🔍 Look for updates** and **⬇️ Update** (it downloads, closes, installs and opens again by itself, keeping your bots). Tick **Also test builds** to get those too.

## 1.28.7 (latest release)
- **🎬 Fixed:** in a custom movie battle (🎬 Movie Pool tab), a movie you click in the search now shows in the pool right away (before, you had to switch away and back).
- **📝 Plain text in custom movie battles:** type anything in the Add box and pick **📝 Add "…" as plain text** at the top of the results (or **📝 Add all as plain text** under Paste a big list). It plays like any other piece, without a poster. You can rename it in the pool.
- **🔢 Worse Movies:** a ready-made number battle, 1 to 500, is now in your battle list. Delete it if you don't want it: it won't come back.
- **☁️ Fewer false alarms from the 24/7 bot:** one slow internet check no longer posts "Couldn't reach the internet" in #movie-royal-debug. It only says something if it fails 3 times in a row. The backup bot server also only reacts to problems the 24/7 bot posts itself, so an internet hiccup on your PC can't make it take over.

## 1.28.6 (latest release)
- **🛡️ Clearer message when your bot token was reset:** instead of "Expected token to be set for this request", Movie Royal now says plainly that Discord doesn't accept your bot token any more and to paste the new one in Settings → Discord & picks → Bot token. The Discord bot status says it too.
- **Backup Bots: pasting the bot token is easier.** Extra spaces or quotes around it are fine. If you paste the Application ID or Public Key by mistake, it tells you which one it was and where to get the token instead.

## 1.28.5 (test build)
- **🔄 Restart the Discord bot:** a new button in Settings → Discord & picks (and on the 🧪 Test tab). It turns the bot off and on again without closing Movie Royal: it reconnects and fixes its slash commands, channels and pinned messages.
- **🛡️ Backup Bots: ▶ Start / ⏹ Stop the backup server** button at the top. Stopped = every bot on the list stops, and it stays stopped (even after a restart) until you press Start.
  - **▶ Run this bot now** on each bot makes the backup answer that bot's Discord commands right away (it used to be a test button). **⏹ Hand it back** gives them back to the 24/7 cloud bot (or Movie Royal).

## 1.28.4 (test build)
- **🛡️ Movie Royal Backup Bots has its own installer now:** download **MovieRoyalBackupBots-Setup-1.28.4.exe** from the release page and run it. It goes in the Start menu and on your desktop, opens when it's done, and starts with Windows hidden in the tray. Uninstall it on its own in Windows Settings → Apps.
  - The checkbox in the Movie Royal installer is gone (it didn't work), so Movie Royal's installer only installs Movie Royal.
  - Movie Royal updates no longer close the backup app.

## 1.28.3 (latest release)
- **🛡️ Movie Royal Backup Bots is optional and off by default:** the installer has a **Movie Royal Backup Bots (optional)** box, unticked. Leave it off and there's no shortcut, it never starts with Windows, and nothing runs. Tick it to get it (updates keep whatever you picked). Run the installer again to change your mind.

## 1.28.2 (test build)
- **✋ The winner decides in chat:** when the movie winner types in chat, Movie Royal asks them: "Type **!accept** to watch it now, or **!pass** to save it for another night (you keep your luck)." It does whatever they answer (yes / no work too), replies in chat, and the stream pop-up shows the same choice. Only the winner's answer counts.
  - ✅ Accept / ⏭️ Pass on the winner card are for doing it yourself.
  - Change the commands in Settings → Twitch. 💬 Pretend chat has !accept and !pass buttons for testing.

## 1.28.1 (test build)
- **✋ Accept / Pass is back on the winner card only:** the green bar at the top of every tab is gone. When the winner types in chat, a glowing box with **✅ Accept winner** and **⏭️ Pass** shows on the winner card (⚔️ Battle tab), and a short note pops up telling you. Y / P still work on the Battle tab.

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

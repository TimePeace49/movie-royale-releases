# Patch notes

The big list of what's new in each **latest release** (the version everyone gets).
Test builds (pre-releases) are listed in CHANGELOG.md until they make it into a latest release.
<!-- A bullet can start with a tag like {songs}, {ed:kirb}, {has:movies} or {!ed:birx}: it is then only shown to the editions it fits (see src/notesfilter.js). No tag = everyone. -->

## v1.139.3: What's new
- {ed:derek} 🎭 Backup Bots app → Editions tab: the search / Reload / Check / Save bar stays on top while you scroll.

## v1.139.2: What's new
- {kick} 💜🟢 Twitch and Kick chat together: pick **Both at once** in Settings → Twitch → Kick. The Chat tab shows both chats with a purple T or green K next to each name, commands work from both, and the bot answers in both.
- {kick} 🔒 The Kick choices unlock once you're signed in with Kick.
- {movienight} 📐 The movie night leaderboard in OBS is now just the board: move it and drag it to any size and it keeps its shape.
- {movienight} 🗳️ Fixed the pretend vote tests not popping up after a few tries.

## v1.139.1: What's new
- {movienight} 🚲 The movie night timer now ends with a bicycle bell. You can switch back to the old alarm clock or use your own sound file (next to the bell's volume).

## v1.139.0: What's new
- 🎵 Your own birthday sound: in Chat bot → 🎂 Birthdays, **Use my own sound file** plays any sound you pick for the birthday pop-up (in the app and on stream) instead of the party whistle.

## v1.138.2: What's new
- {movienight} 🎬 Movies only: TV episodes and TV shows on your IMDb ratings page or watchlist no longer come in as movies, and the ones that already did are taken out by themselves.
- {ed:birx} 📋 Your IMDb watchlist and ratings links are filled in for you: the app reads both by itself when it opens. Nothing to paste.

## v1.138.1: What's new
- {movienight} ⭐ Reading your IMDb ratings from the link now waits for the whole page, so all of them come in (before, only the last short page did).

## v1.138.0: What's new
- {movienight} ⚙️ New Settings page 🍿 Movie night: every movie night setting in one place, plus a look at what's on the watchlist and what's rated, so you can check that everything from IMDb came in.
- {movienight} 🎬 Suggested movies are in the stats now (History → Chat stats) and on each person's profile, with the rating next to a movie once it has been watched and rated.

## v1.137.0: What's new
- {movienight} 🎲 Help me pick now tries to always give 20 movies: the ones that fit first, then close ones, then more of the same kind.

## v1.136.2: What's new
- {movienight} 📋 A long IMDb watchlist is now read all the way (before, only the first 250 movies came in), and the ratings page is read in more ways.

## v1.136.1: What's new
- {movienight} 📋 IMDb's newer watchlist and ratings links (the ones with p. in them) are accepted now.

## v1.136.0: What's new
- {movienight} 🧭 The Setup guide has new steps for movie night: the free movie look-up keys, your IMDb watchlist and ratings, and putting the vote board in OBS. Settings → Connections has the same things for adding or fixing them later.
- {movienight} 🍿 Movie night voting can be switched off on its own (top of the Movie night tab); chat can still suggest movies and ask for ratings.

## v1.135.0: What's new
- {movienight} 🔎 Help me pick looks actors, directors and subjects up online first and matches them against your watchlist, so those searches work right away (needs the free TMDB key).

## v1.134.0: What's new
- {movienight} 🎲 Movie night → Help me pick: type a genre, year, decade, actor, director, subject or who suggested it, and get up to 20 movies from your watchlist to add to tonight's list.

## v1.133.0: What's new
- {movienight} 🥇 Movie night: the bot now tells chat who was first to type after you went live, and that they get 2 votes tonight.
- {movienight} 📋 New movie watchlist in History → 📋 Watchlist. Bring in your IMDb watchlist and ratings files, and chat can suggest movies with !suggest (anything already on your watchlist or already rated is refused) and ask what you rated a movie with !rating. New suggestions wait there with a button that opens each one on IMDb, so you can add them to your IMDb watchlist after the stream. Paste your IMDb watchlist and ratings links and the app brings both up to date every time it opens.

## v1.132.10: What's new
- {movienight} 🙋 Movie night: the "who asked" boxes suggest names as you type (people chatting now, your regular chatters, and names from earlier nights).

## v1.132.9: What's new
- {ed:birx} 🎁 Giveaway tab: the Map menu only lists maps that work for the pieces you picked (balls or characters).

## v1.132.8: What's new
- {ed:birx} 🎁 Giveaway tab: picking a map shows it on the battle screen right away, and 🔄 Refresh map draws it again.

## v1.132.7: What's new
- {movienight} 🔎 History → 🍿 Movie nights: search for a movie to see every night it was on the list or won, or search a date to find that night.
- {songs} ⭐ History → 🎵 Music → Songs you rated: every song you gave a rating, with a search box and a sort menu. Click the stars to change a rating.

## v1.132.6: What's new
- {dash} 📝 New Stream details box for the Chat tab: see and change your Twitch title, category and tags without leaving the app. It starts off: right-click the Chat tab and tick 📝 Stream details. Sign in with Twitch again once so the app may change them.
- {songs} 🕰️ History → 🎵 Music: songs played, who asks the most, the most asked-for and best rated songs, and every song that was played.
- {movienight} ⏳⏰ Movie night last call: a big timer pops up on stream and in the app, and an old-school alarm clock bell rings when time is up. You can turn the pop-up and the bell off, and set the bell's volume, on the Movie night tab.
- {raids} 🚀 Raid tab: search for any live channel by name, even one you don't follow. The wait before a raid now starts at 3 minutes, and "Usual wait" under the slider sets what it starts at.
- 🎁 Giveaway: "Pieces" is now a menu (⚪ Balls / 🧍 Characters).
- {ed:birx} 🎁 The Giveaway tab has a Map menu and its own battle screen, so the giveaway battle plays right there.
- 🕰️ History → 💬 Chat stats: top chatters (all time, this year, this month), chat by month, most hours watched, newest faces and the most used commands.

## v1.132.5: What's new
- {songs} ⭐ Song ratings out of 10 now show 10 stars (out of 5 shows 5), and "out of 100" is gone. Switching between 5 and 10 moves your saved ratings over to the new scale.

## v1.132.4: What's new
- 💬 Chat commands typed in the app's own chat box now work (for example !sr with a song): anything that starts with ! is sent exactly as typed, as you.
- {dash} 🎵 The music box on the Chat tab lists every song waiting in the queue: scroll down in the box to see them all.
- {dash} ⭐ ➕ Playlist in the music box saves the song that's playing (or one from History) to "⭐ My saved songs", a playlist kept in the app that you can play from 📻 or use when no requests are left.
- 🖱 Right-click a name in chat for 👤 View profile, 📣 Shout out, ⏳ Time out and 🔨 Ban (it asks "are you sure?" first). Right-click anywhere in chat to pick how it scrolls: auto, pause on hover, or only when you scroll it.

## v1.132.3: What's new
- {songs} 🔉 Anyone in chat can change the song volume with !volume 40, and 🎵 Songs → Settings → Who can change the volume picks who may (everyone, followers, subs, VIPs, mods or only you).

## v1.132.2: What's new
- ↗ Popped-out tabs are normal windows: drag the title bar to move them, drag the edges to resize, minimize or maximize like any other window (Ctrl + mouse wheel zooms, Ctrl+0 back to normal).

## v1.132.0: What's new
- ↗ Pop any tab out to another screen: press ↗ at the top right, right-click a tab, or press Ctrl+Alt+P. The tab opens in its own window you can drag to your other monitor, and it opens in the same spot next time. ↩ Put back brings it home.

## v1.131.0: What's new
- {songs} 🧠 Smarter song search: when chat types a song's name, the app picks the best version on YouTube instead of the first one: lyric videos (or official audio / official videos, your pick) before live versions, and no covers, karaoke, sped up / nightcore versions, loops or reaction videos unless the request asks for one. Try any song name in 🎵 Songs → Settings → 🔎 Try it.
- {songs} 🔊 Even volume: quiet songs are turned up so every song plays at about the same loudness (Songs → Settings → 🔊 Even volume).

## v1.130.0: What's new
- {ed:derek} 🎥 **Demo for Birx & Jess:** a guided tour in 🧪 Test that shows their version the way they see it, with pretend data and a guide bar, for recording a demo video.

## v1.129.0: What's new
- 🧩 **Options for the app's own commands:** 🤖 Chat bot → Commands lists every command the app answers by itself (like !join, !clip, !bday). Each has an on/off tick and ⚙ with Streamlabs Chatbot's options: its name, who can use it, cooldowns, a "wait" message, a sound and a use count.
- {movienight} 🗳️ **!myvotes:** tells someone who they voted for tonight and how many votes and changes they have left.

## v1.128.0: What's new
- ⭐🍅 **IMDb + Rotten Tomatoes ratings work without setting up a key:** if you don't have your own OMDb key, the app uses a shared one.
- 📣 **!so for everyone:** anyone in chat can type `!so name` for a shout-out (plus Twitch's shout-out box while you're live). It's in 🤖 Chat bot → Commands under ⭐ Ready-made commands, with !watchtime and !followage: a tick to turn each on or off and their cooldowns.
- 🔎 **Sound files from Streamlabs Chatbot:** 🔎 Find them on this PC on the Sound alerts tab finds your sound files by name and remembers the folders they're in.

## v1.127.0: What's new
- 🎂 **Birthdays tab:** all the birthday settings are now in 🤖 Chat bot → 🎂 Birthdays, with a calendar of the next 7 days.
- 📅 **Birthday reminder** when the app opens, showing whose birthday is coming up this week. Mute it for 24 hours, a week or forever (turn it back on in the Birthdays tab).
- 🕐 **What counts as the birthday:** pick when a new day starts, so a late-night stream after midnight still counts as the night before.
- 📣 **Shout-outs:** a 📣 Shout out button on every profile pop-up: "Go check out …" in chat, plus Twitch's own shout-out box while you're live (sign in with Twitch again once).
- {dash} 📣 A 📣 SO button next to 🎬 Clip on the 💬 Chat tab.
- {dash,songs} 🎵 The Chat tab's song box has an SR on / off button, and a 🚫 Ban button on every song in its History.

## v1.126.1: What's new
New in this version.

- 🥳 The birthday party whistle also plays on stream now (its own volume, can be switched off in Settings → Twitch → 🎂 Birthdays).

## v1.126.0: What's new
New in this version.

- 🎉 **Birthday pop-up:** when someone whose birthday is today chats, a pop-up shows up in the app with their chats until you close it, with a quiet party-whistle sound. Turn it (and the sound) on or off in Settings → Twitch → 🎂 Birthdays.

## v1.125.1: What's new
New in this version.

- ⏱️ **!watchtime** and 💜 **!followage** are in the recommended commands (for whoever types them, or a name typed after). The special words `$watchtime` and `$followage` work in any command.
- Bringing Streamlabs Chatbot over also brings each viewer's watch hours, so !watchtime includes their old time.

## v1.125.0: What's new
New in this version.

- ⭐ **Recommended commands** on the 🤖 Chat bot → Commands tab: ready-made ones like !lurk, !discord, !uptime, !so, !hug and !dice, added with one press.
- ⌨️ **Typing finishes commands for you:** start typing a name in ➕ New command (like `!dis`) and press Tab to fill in the whole thing. In the answer, type `$` and press Tab to finish special words like `$user`.

## v1.124.1: What's new
New in this version.

- 🔊 **Sound alerts play on every scene:** one invisible "Movie Royal sound alerts" source goes into every OBS scene by itself (new scenes too), so a sound plays whatever scene you're on. Set its volume in OBS's audio mixer.
- {dash} 🎵 The RateYourMusic button is gone from the music box.

## v1.124.0: What's new
New in this version.

- 🧳 **Bringing your Streamlabs Chatbot stuff over works now:** its Excel files weren't being read at all. Commands, sound alerts, timers and quotes come over, including commands that only play a sound.
- 🔊 **📁 Pick my sounds folder** on the 🔊 Sound alerts tab: Streamlabs Chatbot only exports the names of your sounds, so pick the folder they're in and every matching file is added in one go.
- {songs} 🎵 **More song request options:** who can vote to skip, who can skip right away, more songs for VIPs and mods, only songs already in your song list, your own chat lines for help / can't vote / can't skip, and showing the video in the music box with a quality pick.

## v1.123.0: What's new
New in this version.

- {movienight} 📌 **The movie list pins itself in chat:** add, paste or change tonight's movies and the list is pinned in chat a moment later, with just each movie's number, name and year (`1. Jaws (1975) · 2. Alien (1979)`). Turn it off in 📺 On stream + options.

## v1.122.1: What's new
New in this version.

- {dash} 🧲 **Chat tab boxes dock like in OBS:** drag a box by its top bar and drop it near an edge of another box to move it in beside it (a dashed yellow shape shows where it will land), on the middle of a box to trade places, on an open area to fill it, or at the very edge of the tab to make it a strip along that side. The others fill the room it left.

## v1.121.0: What's new
New in this version.

- {dash} 📊 **Stream stats box on the Chat tab:** what OBS's own Stats window shows, live: whether you're streaming and for how long, bitrate, dropped / skipped / missed frames, FPS, CPU, memory and free disk space. It starts switched off: right-click the Chat tab (or press ▦ Boxes) and tick 📊 Stream stats.

## v1.120.0: What's new
Everything since 1.119.0.

- {ed:birx} 💎 **No more channel point things:** your channel doesn't have channel points, so everything about them is gone from the app: the Rewards & prices settings page, the channel point parts of the wheel's settings and the Channel points step of the Setup guide.

## v1.119.0: What's new
Everything since 1.116.5.

- {dash} 🎚️ **Audio levels on the Chat tab:** a new box shows OBS's own volume meters for every sound source (mic, desktop, music…), live, like the mixer in OBS: green is fine, yellow is loud, red is too loud. 🔊 / 🔇 next to each one mutes or unmutes it in OBS.
- {dash} 🖱️ **Right-click the Chat tab to turn boxes on and off:** a small menu lists every box with a tick. Turn one off and the others grow into the room. The ▦ Boxes button in the tools box opens the same menu.
- {songs} ⭐ **Song ratings can be turned off altogether:** Chat bot → Song requests → Settings → untick ⭐ Rate songs. Ratings you already gave are kept.
- {movienight} 🕰️ **History → 🍿 Movie nights:** every movie night with its winner, votes, who voted for what and how many were guessed right. **▶ Replay the vote** pops up that night's leaderboard and plays the whole vote back in one minute.
- {movienight} 🍿 **Posters and ratings on the movie night leaderboard:** each movie now shows a small poster, its **IMDb** rating and its **🍅 Rotten Tomatoes** score next to its votes.
  - The app looks them up by itself from the movie's name. It needs the free ratings key (OMDb): the Movie night tab has a 🔑 Add the key button when there isn't one yet.
  - The movie list has an IMDb and a 🍅 box per movie, to type your own number or fix one. 🔄 Look them up again does every movie.
  - Tick boxes in 📺 On stream + options turn the posters or the ratings off.
  - See it: Movie night tab → 👀 See it move.

## v1.116.5: What's new
Everything since 1.88.3. It's a big one.

- {ed:public,ed:derek,ed:kirb} 🏷️ **New name:** the app is now called **TimePeace Chatbot** (windows, shortcuts and texts). Your data, settings and install folder stay exactly where they were.
- 🤖 **Chat bot tab** (a replacement for a Streamlabs-style bot):
  - **Commands** with who may use them, cooldowns and special words like the person's name, a counter or a random number. Mods can add them from chat too.
  - **Timers** (messages every so many minutes, once chat has been busy enough) and **Quotes** (!quote, !addquote).
  - **🔊 Sound alerts:** commands that play a sound on stream.
  - **🧳 Bring everything over:** pick your Streamlabs Chatbot export files (Excel, .abcom, CSV) and it shows what it found before adding anything. The Setup guide has a step for it.
- {songs} 🎵 **Song requests** (inside the Chat bot tab): chat asks with **!sr** and a YouTube link or a song name. You get a queue, music-only and length rules, banned songs, per-person limits, vote to skip (**!skip**, 3 votes), **!mysongs**, and it plays the next song by itself.
  - **Ratings:** give every song stars (one or two people can rate, and you can name them), kept in a song database with stats, so the rating shows again when the song comes back.
  - **📻 Playlists:** add your own YouTube playlists, pause requests and play one, or have one play whenever the queue is empty.
  - **💿 RateYourMusic:** bring your own exported ratings file in.
- {dash} 💬 **Chat tab, rebuilt:** stream preview, the music box (sound only, with a volume and a seek slider, Now / History), the activity feed, your chat, and a tools box with 🎬 Clip and buttons for the OBS scenes you pick. **Every box can be moved and resized** from any corner or side, and the boxes next to it adjust to fit.
  - **Click a name in chat** to open that person's profile: their songs in the queue, a 📊 Stats tab (songs asked for, skips, commands used) and their birthday if they saved one.
  - **No box ever covers another:** resizing pushes the boxes in the way smaller, and dragging a box onto another makes the two trade places.
- {raids} 🚀 **Raid tab:** everyone you follow who is live, sorted by who you raided longest ago (or by viewers, A–Z…), with a preview of their stream. Raid from the tab, with an optional wait first, and cancel if you change your mind. **Press Sign in with Twitch once more** so it can read who you follow.
- 🎂 **Birthdays:** viewers save theirs with **!bday** (month and day only, never the year) and the bot wishes them a happy birthday on the day. Settings → 💜 Twitch → 🎂 Birthdays.
- 🔗 **Connections page** (Settings): everything the app links to in one place (Twitch, the chat bot account, Discord, the 24/7 bot, movie search, OBS, donations…), each with whether it's connected and a button to connect it.
- 🔐 **Safer:** the app only answers to this PC now (other devices and other websites are refused), and Settings has a 📄 "What is sent where" page.
- 🧪 **The Test tab is off by default** and just shows ⚠️ Errors. Turn the tests back on in Settings → Account & updates.
- 🚚 **Switching editions keeps everything:** installing a different edition of the app over this one keeps your data and settings and tidies up the old shortcuts.
- {movienight} 🍿 **Movie night voting:** type tonight's movies (with suggestions while you type), chat votes with **!vote** and a number (plus anything they want to say), and an arcade-style leaderboard for OBS shows the votes, with movies hopping up the list as they pass each other. It can be see-through, and the app can add it to your OBS scenes.
- {eggs} 🥚 **The egg game:** viewers hatch eggs by watching and chatting, collect and level up 120 creatures, and bring them into chat battles.
- {kick} 🟢 **Kick:** run the app on your Kick chat instead of Twitch, with the egg reward on Kick channel points.
- Removed: the Game screen dot in the header (it was almost always red and didn't mean anything was wrong).

## v1.88.3: What's new
Everything since 1.88.2.

- 🙋 **Pick who can !clip:** Settings → 💜 Twitch → 🎬 Clips has boxes for who may type !clip in chat: 🌍 Everyone, or any mix of 🎥 Streamer, 🗡️ Mods, 💎 VIPs, ⭐ Subs and 💜 Followers. 🚫 None switches chat clipping off.

## v1.88.2: What's new
Everything since 1.88.1.

- 🙋 **!clip in chat:** anyone in your chat can type **!clip** to clip the last minute. The clip is named "Clipped by" and their name, and the bot answers them with the link (at most one clip every 30 seconds). Switch it off in Settings → 💜 Twitch → 🎬 Clips.
- 🎬 **The clip key is Ctrl+Alt+C now** (it was Alt+C). It works on every tab and in fullscreen. Change it in Settings → ⌨️ Key binds.

## v1.88.1: What's new
Everything since 1.88.0.

- 🎬 **Clips are 1 minute long now** (they were 30 seconds). That's the longest Twitch lets an app make; trim one shorter with ✂️ Trim / name it.

## v1.88.0: What's new
Everything since 1.86.3.

- 🎬 **Clips:** a new **🎬 Clip** button on the ⚔️ Battle, 🃏 Card battles, 🎲 Chat battle, 🎁 Giveaway and 🎡 Wheel tabs makes a Twitch clip of about the last 30 seconds of your stream. **Alt+C** does it from any tab.
  - A pop-up gives you the link: ▶ Watch it, or ✂️ Trim / name it on Twitch. The link is also posted in your chat.
  - **Settings → 💜 Twitch → 🎬 Clips** lists your latest clips and has the switch for posting in chat.
  - Twitch only makes clips while you're live. **The first time, press Sign in with Twitch again** so Movie Royal is allowed to make clips (the button tells you if that's still needed).
  - Try it: 🧪 Test → 🎬 Clips (pretend, nothing is sent to Twitch).

## v1.86.3: What's new
Everything since 1.84.3.

- 🌙 **The movie count doesn't start over in the middle of a stream any more:** before, going past midnight or a short internet drop could make the next movie say "Movie #1" again (and empty the list of who had chatted). Now a stream night keeps going while you're live and only starts over once you've been offline for more than an hour. Try it: 🧪 Test → 🌙 One stream night.
- 🏆 **Race standings board:** on race maps with laps, the right side of the screen shows the top 10 places while the race runs (paint colour, name, which lap they're on; wrecked cars show 💥 OUT, the winner 🏁 WIN). Races without laps and every other map don't have it. Try it: 🧪 Test → 🏁 Race with power-ups → 🏆 Standings board.
- 🎛️ **Stream Deck pages:** Settings → 🖥️ App & background → 🎛️ Stream Deck → 🎛️ Add the pages to my Stream Deck. You get pages for 🎬 Movie Royal, 🎡 Wheel, ⚔️ Battle and 🃏 Cards & more, each key with its own picture, pressing the same thing as the button in the app (it works while you're in a game). The bottom-left key goes back to your own "Home" profile. There's also a **🎞️ Scenes** page with one key per OBS scene (have OBS open when you add the pages).
- 🔄 **Keep OBS up to date** (Settings → 🎥 OBS, on by default): when Movie Royal opens and every 10 minutes, it puts back anything it added to OBS for you that went missing (🎉 viewer's choice celebration, 📣 roll call, your videos). It never moves things you placed and never switches your scene. **🔄 Check OBS now** checks right away.
- 🎬 **My videos** (same place): add videos from your PC (like starting / ending screens or a background loop) and tick which OBS scenes they go in. Each one plays on a loop, filling the screen behind everything else. Tick 🙈 to switch off that scene's own background while the video is in it.

## v1.84.3: What's new
Everything since 1.84.2.

- 🔇 **No more double sound:** while OBS has a Movie Royal game screen open (the battle browser source, in any scene), the battle inside Movie Royal stays quiet, so every sound plays once, from OBS. When OBS closes it, the app plays sounds again. The switch is in Settings → 🔊 Sounds (**🔇 No double sound**, on by default), and it shows how many game screens OBS has open. If you then hear nothing at all, your OBS source has "Control audio via OBS" ticked: turn on monitoring for it in OBS (Edit → Advanced Audio Properties → Monitor and Output) or untick it.

## v1.84.2: What's new
Everything since 1.84.1.

- 🔋 **The battle screen inside Movie Royal only starts when it's needed**: it loads the first time you open the ⚔️ Battle, 🃏 Card battles or 🏃 Marathon tab, open the preview window, or a battle starts (even from another tab). If you only use the wheel, it never runs at all. Once it's loaded it stays loaded: switching tabs never resets the board, and a battle is never stopped (the battle itself runs in Movie Royal and OBS, the screen only shows it).

## v1.84.1: What's new
Everything since 1.84.0.

- 🔋 **Less power in the background:** when Movie Royal is minimized or covered by other windows, the battle inside it draws small and at 30 fps, like it already did on other tabs. The battle keeps going and sounds still play, and it's back to full the moment you look at it. It's part of 🔋 Power saver (Settings → 🎨 Graphics, on by default). Nothing on stream changes.

## v1.84.0: What's new
Everything since 1.82.2.

- 🛡️ **Spam bots get banned by themselves** (on by default): when someone's **first** message in your chat sells viewers, followers, "promotion" or art (emotes, overlays) and gives a way to buy it (a site, "dot com", Telegram, Discord, "DM me"), Movie Royal deletes the message and bans them. Subs, VIPs, mods and you are never touched, and people who've chatted before aren't checked. It catches the usual tricks too, like spaced-out letters ("s t r e a m b o o .com") and look-alike letters.
  - **Settings → 💜 Twitch → 🛡️ Spam bots:** on / off, ban / time out for a day / only delete the message, and a list of everyone it caught with **↩️ Unban** (in case it got a real person). They're in History → Everything too.
  - Try it: 🧪 Test tab → 🛡️ Spam bots (type a message, or ✅ Check the samples). Nothing is banned there, and pretend chat messages never ban anyone.
- 🎞️ **Less work for OBS:** when a battle browser source is in a scene that isn't on screen (or is hidden in one), it now draws small and slower until it's shown again. The battle itself keeps going. That leaves more of your graphics card for what's actually on stream, so OBS should miss fewer frames.

## v1.82.2: What's new
Everything since 1.82.1.

- 🔄 **Updating while you're live** (Derek): when Movie Royal closes (an update during stream) and opens again within 30 minutes, it picks up where you left off. Your wheels (spots on / off, voided spots, countdowns, sizes, the last landing), battles, pools, luck and Discord picks were already saved all the time; now these come back too: the map you picked, a best-of series, the winner card still waiting for !accept / !pass (with its countdown), the join timer and chat's votes. A message tells you what came back.
  - The wheel's round timer comes back paused (press ▶ to keep going). A battle that was playing right then can't carry on mid-fight: nothing of it counted, so press Start again.
  - Try it: 🧪 Test tab → 🔄 Pick up where you left off shows what would come back if it closed right now.

## v1.82.1: What's new
Everything since 1.72.0.

- 🏴‍☠️ **Pirate Battle in card battles:** the Pirate Battle map is on the 🃏 Card battles tab now (and 🎲 Random can pick it). Your packs split into two even crews, a 🔴 red crew on the *TimePeace49* and a 🔵 blue crew on the *Kirbgames*, wearing pirate hats or bandanas in their crew's colour (some get an eye patch). They only fight the other crew (gangplanks, rope swings, cannons), off the side = into the sea, and it always ends with one pack from each crew, the 🐙 kraken and a 🥊 FINAL FIGHT with a pirate finisher. Every pack still has the same chance.
  - Chat's ⛈️ storm powers and 🐒 Take out Time / Take out Kirb work in card Pirate Battles too (they never change who wins).
  - 🧪 Test tab: 🃏 Card battle tests → 🏴‍☠️ Pirate Battle, a **Who fights** choice (characters or card packs) on the Pirate Battle card, in the Test lab and for finishers.
- 🧹 **Inactive people's movies:** when someone hasn't been in a battle for **3 months** (none of their movies was on the cliff in a real battle), their movies go back so anyone can pick them in Discord, and they get a fresh set of picks to pick them again later. On by default. Each battle has its own switch and time limit (a number + days, weeks, months or years) in **Settings → ⚔️ Game → 🧹 Inactive people's movies**, with 👀 Who's next and 🧹 Check now. Nothing is deleted: ▶ Bring back in the Movie Pool puts a movie back. Try it on a pretend battle: 🧪 Test tab → 🎬 Movie nights → 🧹 Inactive people's movies.
- 👀 **Watch your co-streamer's battles:** when your partner's battle starts, a note pops up with 👀 Watch: their battle in a small window you can drag around (it closes by itself when it ends).
- 📺 **Ad warnings** (off by default, Settings → 💜 Twitch & channel points): the bot tells chat about a minute before an ad break and again when it's over, and Movie Royal pops up a note with a ding. Needs one extra Twitch permission (sign in with Twitch again). Try it in the 🧪 Test tab.
- 🛠️ **Dev mode:** the old "Also install test builds" box in Settings → 👤 Account & updates is now **Dev mode**. It still installs test builds, and it also shows features that are still being tried. Leave it off and you won't see them.

## v1.72.0: What's new
Everything since 1.71.1.

- ⏪ **Undo goes all the way back:** ⏪ Undo and ⏪ Go back… under the wheel now go back every step, all the way to the start of the wheel (right before its first spin since the last ↺ Reset). **⏮️ All the way back to the start** does it in one go. The steps are saved, so closing Movie Royal doesn't lose them.
  - Going back puts back the wheel, its spot sizes and the round timer (it waits for you to start it again), plus any other wheel that changed since then (like one a 🔀 linked spot spun).
  - Saved respins and streamer respins that the taken-back spins used come back. Saved spins someone got another way (like from a sub) stay.
- 🍀 **Luck in your own battles** (off by default): battles of words, pictures or movies that you fill yourself (like a battle of stuff for you to do) can have the Discord battle's luck.
  - Every battle, everything that loses gets a little luckier (+1% by default, change it per battle in Settings → 🍀 Luck), so things that keep losing get more and more likely to win.
  - A winner **stays in** (only you take things out) and only its luck starts over. Chat can't join these battles.
  - Turn it on with **🍀 Luck** above the list on the Battle tab, in Settings → 🍀 Luck, or with the 🍀 box when you make a new battle.
- 🧾 **History → 🧾 Everything:** a complete history with a line for everything that happens, newest first, kept for good: wheel spins and where they landed, the round timer, grows, voids and undos; every battle (with everyone's chance and luck) and who won it; claims and passes; luck earned, lost and started over; card packs that won; free spins given and used; channel point redeems; subs, gift subs, bits and tips; chat joins, raids and follows; Discord picks and swaps; going live; and changes you make to a battle.
  - Pick the kinds you want, search it, hide practice battles and tests, and ⬇️ download it as a spreadsheet file. New lines show up as they happen, and nothing is ever taken out of it (even an undo gets its own line).
  - It starts with what the older history lists already had (wheel spins, battle wins, card packs, free spins, alerts).
- 🛠️ **Fixed:** growing, shrinking or doubling a spot on a wheel other than the one spun last, then pressing ⏪ Undo, now takes back the right wheel.
- 🧪 Test tab: ⏪ **Undo all the way back** (tries it on a pretend wheel nobody sees), 🍀 **Luck in your own battles** (6 pretend battles) and 🧾 **Complete history**. 🤖 Test all checks all three too.

## v1.71.1: What's new
Everything since 1.70.1.

- 🤝 **Co-stream with a friend** (Settings → 🤝 Co-stream): stream together with someone else who has Movie Royal. Voices and watching videos stay on Discord; Movie Royal does the rest.
  - 🎟️ One of you presses **Make an invite code** (your ☁️ 24/7 Discord bot hosts a private room) and sends it in Discord; the other pastes it and presses **Join**. After that it reconnects by itself whenever Movie Royal is open.
  - 📷 **Cameras:** your friend's camera shows up in your OBS by itself, on their side (one of you left, the other right, on both streams). Move and resize it like any source.
  - ⚔️ **Their battle on your stream:** while their battle runs it pops up on your stream and hides when it's over. It's their real game screen, so both streams show the exact same fight.
  - ⚡ **Chaos across chats:** while your battle isn't running and theirs is, your viewers' channel point / bits chaos goes into their battle ("sent a Comet into …'s battle!"), and theirs into yours.
  - 🩺 **Lag check** shows whether it's the internet or the PC, and 📶 picture quality goes down to Low (about 1.2 Mbps).
  - ⏭️ **Every part can be skipped:** Skip cameras (just chaos), hide the one-time OBS reminder, or skip the Setup guide step.
  - 📌 One thing to set by hand, once, in OBS: ⚙ next to Start Virtual Camera → Output type: Scene → 🤝 Co-stream share.
  - ☁️ Only the one who invites needs to update their 24/7 Discord bot (there's a box for it right in the Co-stream tab). A friend who only joins isn't asked.
- 🧪 Test tab → 🤝 **Co-stream (pretend partner)**: try it alone, nothing is sent anywhere.

## v1.70.1: What's new
Everything since 1.68.0.

- 🏴‍☠️ **New map: Pirate Battle** (characters only). Pick it on the Battle tab when a battle has 🧍 characters on (🃏 Character only part of the map menu).
  - ⛵ Two pirate ships side by side in a ⛈️ big storm (rain, lightning, thunder, rough seas). The red ship is the *TimePeace49* and the blue ship is the *Kirbgames*, with their names in fancy gold pirate letters on the back, and each figurehead wears that channel's Twitch picture.
  - 🏴‍☠️ Everyone is a pirate in one of two crews, split evenly: pirate clothes, the ring under their feet and their health bar frame are in their crew's colour. People's own /character keeps its face, hair and skin.
  - ⚔️ Pirates only fight the other crew: across the gangplanks, swinging over on ropes, with the ships' cannons firing across the gap. Knocked off the side = into the sea (unless they grab a rope).
  - 🔴🔵 It always comes down to **one pirate from each crew**. Then 🐙 **the kraken** drags the other ship under, the camera goes all the way round the last two, and they have their 🥊 **FINAL FIGHT**, with 20 pirate finishers and 10 pirate celebrations.
  - 🌊⚡🐙 **Chat's storm powers** (channel points, only on while a Pirate Battle plays): **Big wave** (500) crashes over a ship and washes pirates overboard, **Lightning bolt** (750) strikes a pirate, **Tentacle swipe** (1,000) sends a kraken tentacle across a deck. They never change who wins. A line at the top of the game screen tells chat what they can send.
  - 🐒 **A secret:** two little monkeys in pirate hats (red T, blue K) sword fight in a rowboat between the ships. Both die every battle: the loser goes overboard (its ghost floats up), the winner gets taken out right after it celebrates, one of 20 ways (kraken tentacle, lightning, a shark, a giant wave, a cannonball, a seagull, a banana peel, a whale, a sea serpent, a firework, the loser's ghost kicking it overboard…). Battles go through all 20 in a shuffled order before any repeats.
  - 🐒 **Take out Time / Take out Kirb** (10,000 channel points each): chat takes out that monkey right away, the next way in the same order.
  - Movie Royal makes all the new rewards on Twitch by itself after you sign in; change their prices in Settings → 💰 Rewards & prices.
- 🧍 **22 new body types** for characters (/character body:25 to 46): men's builds (Muscular, Dad bod, Beer belly, Stocky, Big & tall, Lanky, Swimmer, Barrel chest, Chubby, Strongman, Wiry) and odd ones anyone can pick (Bobblehead, Pinhead, Noodle arms, Gorilla arms, Stubby legs, Stilt legs, Pear, Triangle, Egg, Long neck, Big hands & feet). The Discord picture, the parts website and profiles now show the whole character (arms and legs too). Body types only change the look, never the odds.
- 🎥 **Calmer auto camera** in every battle: no zoom in on every knockout, no leaning toward every hit, small moves ignored and a slow zoom in. It moves about a tenth as much as before.
- 🛠️ **Fixed:** on a slow start (a busy PC, or OBS loading the page) the battle screen could freeze until it was reloaded.
- 🧪 Test tab → 🏴‍☠️ **Pirate Battle**: practice battles, straight to the kraken, every storm power, 🔴 Take out Time / 🔵 Take out Kirb, 🐒 watch any of the 20 monkey endings, the pirate finishers and the figurehead pictures. Test tab → 🎨 Custom characters: 🧍 All body types and 🧍 New body types battle.

## v1.68.0: What's new
Everything since 1.67.2.

- 💨 **Fart Farm reworked:** the cow herds run across the ground that's left (near the end they used to miss it), and everything on the map follows the pace, so the end never sits still. New:
  - 🛸🐄 **Cow drops:** a UFO drops a cow on the crowd (yellow ring = incoming). Everyone close by goes flying, and the one right under it can get squashed.
  - 🛸 **The mothership:** in the last quarter it parks over the field and takes them one at a time (a red ring locks on, then its beam pulls the piece up).
  - When the battle is ahead of schedule, the cows just knock pieces over and the UFOs put pieces back down ("👽 WRONG ONE!").
- ⏳ **No more long waits, on every map:** the elimination pacer never holds knockouts back for more than about 7 seconds (it could hold them for 15 seconds or more when a battle got way ahead early).
- ↺ **Reset battlefield on the Card battles tab works on every map**, the ball and holiday maps too, during the fight or after it (it used to be called ↺ Reset street). After any reset, the last battle's cows, ghosts, UFOs and so on are cleared from the map.
- 🧪 Test tab → **⏳ No long waits** (6 quick hidden battles: the longest wait without a knockout) and **🎃 On a holiday map** + **↺ Reset battlefield** under 🃏 Card battle tests.

## v1.67.2: What's new
Everything since 1.67.0.

- ↺ **Reset wheel = back to how you set it up:** the reset button above the ✏️ Spots list puts the wheel back to how it was right before its first spin. Every spot's size, count, wins and on/off come back, voided spots return, and the round timer and last result are cleared. It asks first and shows what will change back; ↩️ Undo reset takes it back. Until you reset, the wheel stays exactly as it is.
  - Your setup = how the wheel was right before its first spin (or grow, shrink, double…) since the last reset. Changes you make yourself in the ✏️ Spots list (sizes, adding spots…) become part of your setup.
  - If your wheel isn't the way you want it right now, set it up how you want it before your next spin, and that's what ↺ Reset wheel will bring back.
- ⚖️ **All the same size** is its own button now (it used to be the reset button): every spot gets size 1, and that becomes your setup.
- 🎁 **Hidden reveal (mystery) spots are ⚡ auto spots:** when the wheel lands on one, the round timer pauses until you press 🎡 SPIN, and nobody can respin it (chat's respins are saved for later, like every auto spot). It shows (auto) on the wheel, and the spot menu calls it 🎁⚡ Hidden reveal (auto).
- 🧪 Try them: Test → ↺ Reset wheel shows what a reset would bring back (nothing changes), and Test → 🎁 Mystery spot → 🎡 Land on my mystery spot. 🤖 Test all also checks the reset on a pretend wheel.

## v1.67.0: What's new
Everything since 1.66.2.

- 🤖 **Test all** (🧪 Test → ✅ Checklist): one button that checks everything Movie Royal can check by itself, in the background. Nothing goes on stream, in chat or in Discord, nothing is changed, and you can keep using the app while it runs (about a minute). The list ticks each check off as it's done: ✅ fine, ❌ a problem (it says what to do), 🟡 worth a look, ⚪ skipped (not set up).
  - ⚙️ **Your connections:** Twitch, your chat bot account, channel point rewards, the Discord bot (tried with a pretend person), the 24/7 bot, the backup bot server, TMDB, OMDb, Letterboxd, donations, OBS (with the game screen in it) and updates.
  - ⚔️ **Battles in a hidden test screen:** a practice battle, a number battle, characters, a battle on every map (the winner has to end up on land), every card battle map, character fights, and every finisher and celebration.
  - 🎬 **Movie nights:** the ban rules (and that the 24/7 bot gives the same answers), series in order + locks, wild spot luck, !mymovies, the IMDb / Rotten Tomatoes readers, the nudity check and the ban export file.
  - 🖥️ **The app:** your data saves (and you have a backup from the last month), the pictures you added are there, no new errors, every button has a help note, and no two key binds share a key.
  - Checklist items a check really covers get ticked by themselves ("checked by 🤖 Test all").
- 🤖 **Test all not done:** only the checks that haven't passed yet.
- 🗂️ **Side tabs on the Test tab:** 🧪 Tests and ✅ Checklist both have a tab for each group down the left side, like Settings. 📋 All tests / 📋 Everything shows it all on one page. Keys: [ and ] go to the tab above / below, Shift+T starts Test all.
- ❓ Help mode now has a note for the last few buttons and boxes that didn't have one.

## v1.66.2: What's new
Everything since 1.60.4.

**🎬 Movie nights**
- 🔞 **Nudity heads-up:** when a movie wins, Movie Royal checks its IMDb Parents Guide and TMDB's tags. If it has nudity, the Winner card on the Battle tab says so in red and lists every scene with about when it is ("~47 min in", "at 1:12:30", "near the end", or "time not listed"). Orange = sex scenes but no nudity listed. The winner pop-up on stream just says "This movie has nudity" (no times). It's never typed in Twitch chat. The switches are in Settings → 🎬 Movie info.
- ⏱️ **Movie length** on the winner screen, in the 🎬 Movie Pool and in the list under the battle (like "2 h 7 min"). Movies that were added without it get it filled in by themselves.
- 🎞️ **Series go in order:** a movie in a series (like Harry Potter) can only be picked once you've watched every movie before it. The later ones are banned as 🎞️ sequels and come off by themselves when you watch the one before. People are told which one has to be watched first.
- 🔒 **Series locks:** whoever picks the next movie of a series gets the series locked, so nobody else can pick its next movie. If their next set of picks doesn't include it, the series opens up for everyone. 🚫 Banned Movies → 🎞️ Series shows every series, what's next and who has it locked; you can change a lock by hand or ➕ add a series.
- 🔁 **Redo without the passed movie:** when a winner passes, 🔁 Redo the battle without [movie] (right side of the Battle tab) starts the battle again right away without it.
- 🛌 **Sit out after a pass:** the bot asks the person in chat if they want to sit out the rest of tonight. Anyone who sits out is told how to come back (!imback), and stays on the People list.
- ⏭️ **!skip:** viewers can take one of their movies out of the next battle only (`!skip 2` or `!skip Heat`; the same again puts it back).
- 🍀 **!mymovies and /mymovies show each movie's luck**, and so do chatter profiles.
- 🗣️ **Dubbed movies aren't banned any more:** the 🌍 Not in English rule lets through movies that likely have an English dub (cartoons, anime and well-known movies).

**🌐 The 500 worst movies (IMDb / Rotten Tomatoes battles)**
- ⭐ Each movie shows its rating from the list (IMDb out of 10 or 🍅 %, or TMDB's when the list didn't show one) and its ⏱️ length, in the Movie Pool and the list under the battle.
- People can pick a movie that's on it in Discord: it leaves the 500 list within a few seconds and the next movie on the list takes its place.
- It never has a movie that belongs to someone (picked in Discord, or the next movie of their locked series), and movies on it never show as taken when people suggest them.
- No sequels until you've watched the movies before them.
- It updates as the last thing Movie Royal does when it opens.

**🚫 Banned movies**
- 🔄 **Refresh the whole banned list** (top of 🚫 Banned Movies): checks every ban rule, this year's bans, dubs and every series in one go. The movies you banned yourself are never touched.
- ⬇️ **Export my bans** / ⬆️ **Import bans:** a spreadsheet file of the movies you banned yourself, to keep or to move to another PC.

**🍀 Luck & timers**
- 🍀 **New Luck tab in Settings** with every luck setting. 👀 Watch luck can be turned on for each battle there (off by default), with how many hours watched give how much luck.
- 🎟️ **Wild spot luck: once a night** (the default): a wild spot gets +1% the first Discord movie battle it loses while you're live, and that's all for that stream. You can switch it to every battle, or no luck.
- ⏱️⏳ **Battle timer and elimination pacer for every battle** (Settings → ⚔️ Game), next to every wheel's spin time. (The pacer for all battles didn't save before: fixed.)

**⚔️ Battles & maps**
- 🥊 **FINAL FIGHT 360:** the last two stand still in the middle while the camera walks a full circle around them, with the map going round behind them.
- 🎥 **Calmer cameras:** much less wobble, and about half the shaking.
- 📏 **Map size slider** on the right side of the Battle, Chat battle and Giveaway tabs: 50% to 200%. Bigger maps and longer race tracks.
- 🏁 **No races with more than 50 pieces** (change the number in Settings → ⚔️ Game), and a 🏁 Laps box on the Battle tab when the next battle is a race.
- 🏁 **Finish lines fixed:** a new 🏎️ Grand Prix layout, the line never sits where the road touches itself, and the flag stand is beside the road.
- 📋 **The list under the battle shows who's really in**, with a 🔎 search box. Everyone else is under 👀 Show the … not in, with a tag saying why.

**🎡 Wheel**
- 🎁 **Mystery spots:** a spot with hidden words and/or a hidden picture. When the wheel lands on it, a card pack pops up in Movie Royal and on stream; open it to show what it really is. With a holiday app style on, the pack dresses up for the holiday.
- Every spot rule is in the spot menu now, including 🎁 Hidden reveal and ⏱️🔀 Timer + Link.

**🎥 OBS, rewards & the app**
- 🎥 **Settings → OBS has everything OBS in one place**, each with its own switch. 📺 The capture window shows by itself during the 2-min join timer.
- 📣 **Roll call as its own OBS browser source**, so it shows in scenes without the game screen.
- 🎁 Hydrate, Stretch, Pick a hat and Viewer's choice can each be switched off. 🎉 Viewer's choice keeps their pick a secret (you can show it in Settings → 💰 Rewards & prices).
- 🔍 **Search all settings** (top left of ⚙️ Settings), and **every option is in one place** now.
- 🤫 Fixed false "Something went wrong" errors caused by ads on web pages Movie Royal reads in the background.
- 🎬 **Test tab → Scenes:** one button for each big moment on stream. Most new things above can be tried in the 🧪 Test tab.
- ☁️ **Update your 24/7 Discord bot** when Movie Royal asks (series rules, luck in /mymovies, dubbed movies).

## v1.60.4: What's new
Everything since 1.60.3.

- 🎀 **Hair accessories, their own part:** 30 bows, clips, headbands, flowers and more, worn together with a head accessory. They have their own tab on the parts website, and Discord uses `/character hairaccessory:<number>`. Update your 24/7 Discord bot when Movie Royal asks.
- 🏁 **Cleaner race starts:** the grid lines up on a straight, and the rows set off one after another.

## v1.60.3: What's new
Everything since 1.60.2.

- 🚛 **Tow trucks on the race maps** (all except the Figure 8): wrecked cars get towed off the road in 3 seconds, and stuck cars get pulled free. No more cars stuck behind piles of wrecks.

## v1.60.2: What's new
Everything since 1.60.0.

- 🤖 **The chat bot pop-up tells you how:** the steps are in the pop-up, with 🔑 Sign in as the bot and a 📋 sign-in link. Open the link in a private (incognito) window and log in as the bot.
- 🧭 **"Don't show again" on every start-up pop-up step**, except the ☁️ 24/7 Discord bot update and the 📦 monthly backup reminder. Those two keep asking until they're done.
- 📦 **The monthly backup reminder is in the start-up pop-up now**, not a bar at the top.

## v1.60.0: What's new
Everything since 1.59.7.

- 🏁 **10 new race maps:**
  - Clean races: 🏟️ Speedway Oval, 🏎️ Grand Prix, 🌃 Night Street Race, ❄️ Ice Ring, 🏖️ Beach Rally.
  - Mixed: 🏜️ Desert Rally.
  - Mayhem: ✖️ Crossover Chaos, 🌋 Volcano Run, 🚧 Junkyard Smash, 🚀 Big Air Stadium.
  - Race cars, monster trucks and school buses.
- 🏁 **Race power-ups in chat battles:** 💨 Boost, 🛡️ Shield, 🛢️ Drop oil and 🚀 Rocket, bought with channel points. Turn them on with the check box on the Chat battle tab. With them on, the race isn't decided ahead of time: they can change who wins.
- ☢️ **The Nuke** (20,000 points): a 15-second cut scene. The one who calls it gets a force field and everyone else is blown away.
- 🧪 Try it all in the Test tab: 🏁 Race with power-ups.

## v1.59.7: What's new
Everything since 1.59.6.

- 🧭 **Setup guide brought up to date:** new steps for a 🤖 chat bot account, 🛡️ backup bots and 🧍 characters, one button that makes all your channel point rewards, and better notes on Twitch, Discord, the 24/7 bot, OBS and the stream sound. New steps show 🆕.
- 🧭 **One start-up pop-up for everything:** new Setup guide steps are steps in it too, one each.

## v1.59.6: What's new
Everything since 1.59.5.

- ✅ **Shorter checklist:** only the main features are on it now (76 checks instead of 175). All the maps are one check, tried in the 🧪 Quick test lab. Your ticks stay ticked.

## v1.59.5: What's new
Everything since 1.59.4.

- 🎥 **Camera buttons on the battle screen** (in the app and in fullscreen): they show when you move the mouse over the battle and hide when you stop.

## v1.59.4: What's new
Everything since 1.59.3.

- 🎩 **50 head accessories, their own part** (`/character accessory:<number>`): hats, caps, crowns, ears, horns, glasses, goggles and more. Random characters sometimes wear one that fits the map.
- 💇 **15 new hair styles** in place of the old hair accessories (tall, wide, ombre, two-tone, dyed tips, glitter, wavy, curly, shaved side…), still 1,000 in all. Old picks keep their look.
- Update your 24/7 bot when Movie Royal asks.

## v1.59.3: What's new
Everything since 1.59.2.

- 🧍 **24 body types:** regular, thin, fat and athletic, each flat or with a chest shape in 5 sizes. The chest shape is easier to see now (PG). Bodies 1 and 2 stay the same. Random characters get any build but only the smaller chest sizes. See them on the parts website → 🧍 Body.
- ✅ **A clean 🆕 Recently updated** on the checklist with this update (ticks stay).

## v1.59.2: What's new
Everything since 1.59.1.

- 💬 **The little pop-ups at the bottom stay longer:** 8 seconds instead of 3½ (longer messages longer). Hover the mouse on one to keep it up; click it to close it. Change it in Settings → App & background.

## v1.59.1: What's new
Everything since 1.59.0.

- 🆕 **Recently updated starts empty** the first time someone opens the checklist. From the next update on, it shows what's new.

## v1.59.0: What's new
Everything since 1.58.3.

- 🔢 **20 versions of every character part:** 1,000 hair styles, 1,500 outfits, 500 makeups, 500 facial hairs, 160 skin colors and 200 hair colors (the 2 bodies stay). Headbands, cat ears, crowns, patterned and neon outfits, glitter, dyed beards, color families and more. Numbers people already picked stay the same.
- 🌐 **The parts website:** every part with its number, on your 24/7 bot (works while your PC is off). People try parts on and copy the /character command. Discord links to it in #character-creation and in /character. Update the 24/7 bot when Movie Royal asks.
- 🧍 **Battles use characters by default** once you said yes to men/women characters or character creation (Settings → Game).
- 🖥️ **Fullscreen** covers the screen without putting Windows in fullscreen mode, so the Start menu and taskbar look normal.

## v1.58.3: What's new
Everything since 1.58.2.

- 🤫 **No error messages when OBS is just closed.** Movie Royal no longer counts a closed OBS as a problem. Real OBS problems (like a wrong password) still show.

## v1.58.2: What's new
Everything since 1.58.1.

- 🧭 **One pop-up when Movie Royal opens.** A new version, new Setup guide steps, the 24/7 bot update, the character questions and the holiday style now come as steps in one window ("Step 1 of 5", with a dot for each step), not pop-up after pop-up. Esc skips a step.

## v1.58.1: What's new
Everything since 1.58.0.

- 🎬 **Viewer's choice in OBS: you pick the scenes.** 📺 Put it on my stream lists your OBS scenes with tick boxes, and the confetti celebration goes on top of only the scenes you tick. 🎬 Pick the scenes changes them any time (Settings → 💰 Rewards & prices, or the Setup guide).
- ✅ **Tidier checklist** (🧪 Test → ✅ Checklist): everything sits in its own category. Each update puts just its new things in 🆕 Recently updated at the top, and once you tick one it moves to its category when you leave the tab.

## v1.58.0: What's new
Everything since 1.46.0.

**🧍 Characters instead of balls**
- Tick 🧍 on the right side of the Battle, Chat battle or Giveaway tab, and every piece becomes a little person that walks and fights. Their movie poster or Twitch picture is a badge on their chest.
- **👫 !id:** chat types `!id man`, `!id woman` or `!id none` (non-binary) to pick what their character is. It shows as a tag on their profile too.
- **🎨 Make your own character in Discord with /character:** 50 hair styles, 75 outfits (including costumes), 25 makeups, 25 facial hairs, 2 bodies, 8 skin colors and 10 hair colors. It's their character in every battle with characters, and their profile shows it. Your PC draws a little picture of each new character and posts it in Discord.
- **#character-creation channel:** the bot makes it, with a pinned how-to and numbered pictures of every part (each picture and each choice has a white border so they're easy to tell apart).
- **Everyone else gets a random look** each battle. About 1 in 20 is a 🤪 chaos character with parts from everything. Themed maps dress everyone up: soldiers, wrestlers, astronauts, knights, wizards, gladiators, elves, costumes on Halloween maps, and more.
- **🎟️ Wild spot characters:** build them in Settings → wild spots, with a live preview.
- **🃏 Character-only maps in battles:** with characters on, Kung Fu Town, Royal Rumble, Wizard Battle, Colosseum and WW2 Battlefield show up in the map menu too.
- **Asked once when Movie Royal opens:** do you want men and women characters, and do you want character creation? Say no and they stay off. Settings → Game → 🧍 Characters turns them on any time.

**💀 Card battle finishers and the FINAL FIGHT**
- On maps with a 🥊 final fight, the last hit staggers the loser and the winner does a **finisher**: 20 per map, 100 in all, some ☠️ brutal and some 🤪 silly. Then a slow-motion replay of it, and a celebration (10 per map).
- They're shuffled and never repeat until every one has been used.
- The FINAL FIGHT! scene lasts 8 seconds, with a 3, 2, 1 countdown. The camera circles around the last two on the ground while the scenery slides past behind them.
- **More exciting camera:** it leans toward big hits, zooms in on K.O.s, shakes on bombs, and swoops in on the winner. If you move the camera yourself, it goes back to auto after 8 seconds (ball battles too).
- Card battles last 1 minute by default.

**🚫 Movie bans**
- New ban rules (each can be turned off): 🌍 movies not in English, ⛪ really religious movies, 🎥 documentaries, and 📅 this year's movies (they come off on January 1st).
- The ban list fills itself from TMDB, and 🔄 Update the ban list does it again any time.
- Unban a movie to pre-approve it. Discord tells people to ask Kirb to unban a movie they want.
- The Banned Movies page has a search box and filters.

**🎡 Wheel**
- **⚡🔢 Auto + countdown** spot type.
- **No respins on auto spots.** The Respin reward hides while the wheel sits on one. Anyone who sneaks one in gets a free saved respin instead, and a "nice try, sneaky sneaky" from the bot.
- **Only the first respin counts:** respins redeemed at the same time become free saved respins for everyone after the first.
- **History → 🎟️ Free spins** lists every free spin given, used and given back.
- Name boxes on the Wheel tab suggest people who just chatted.

**🎬 Discord movie battle**
- **⏱️ 2-minute join timer + chat vote:** only people who chat during the 2 minutes get their movies in, and a numbered list shows on screen. Chat votes for the winner by number or name, and a right vote gives +1% luck. You press START ROYAL when ready.
- **The winner is always asked !accept / !pass first,** so a happy "YES!" doesn't claim it by accident.

**✨ More**
- 🗺️ **Map menus** are sorted: ⚪ Ball / car only, 🃏 Character only, ⚪🃏 Both, then 🎉 Holiday maps, each A–Z.
- ⚡ **Chat powers reminder:** a line scrolls across the top of a battle while chat powers are on.
- 📋 **!moviesroyal** lists the commands for the tab you're on (once a minute).
- 🎨 **Holiday app style:** close to a holiday, Movie Royal asks if you want the app dressed up for it.
- 💲 **Check a card's price** on TCGplayer, eBay sold listings or PriceCharting from the Card battles tab.
- 📁 **Discord channel folder:** all of Movie Royal's channels go in one "Movie Royal" folder (the hidden ones stay hidden).

**🛠️ Fixes**
- The pinned commands message in Discord always fits now (it was too long for Discord, which made the status light orange).
- No more "EPERM … db.json" error box: if Windows locks the save file for a moment, Movie Royal waits and tries again.
- Help mode works on every button on the 🧪 Test tab again.

## v1.46.0: What's new
Everything since 1.39.1.

**🗺️ New ball maps (they work for card battles too)**
- **🧟 Zombie Horde:** city streets at night. Zombies chase everyone; balls take bites, and bitten cards turn into zombies that keep chasing. Nobody falls off.
- **🦖 Monster Mash:** a rooftop fight while two giant monsters smash the buildings, and the parts they hit collapse.
- **🔮 Elemental Wizards:** four wizards on giant corner pillars cast 🔥 fireballs, 🌊 tidal waves, 🪨 boulders and ❄️ ice (frozen pieces shatter if they're still frozen when it wears off).
- **🌋 Pompeii:** a long town running downhill to the sea. The lava chases everyone down the streets, just a bit faster than they can run, and the screen scrolls down with the chase. Buildings block everyone. Last one left wins.
- **🦸 Hero City:** two new villains, a wrecking ball and a bomber jet.

**🎉 Holiday maps (they come up any time of year)**
- 🎃 **Haunted Graveyard:** ghosts scare pieces into running for the edge, and jack-o'-lanterns drop and explode.
- 🦃 **Turkey Trouble:** evil turkeys peck everyone toward the edge, plus turkey trot stampedes.
- 🎅 **Santa's Workshop:** evil reindeer stampedes, and a giant evil Santa with eye lasers.
- 🎆 **New Year's Eve:** rockets burst on the pieces, and the giant ball drops and smashes a hole in the roof.
- 💘 **Heartbreak Island:** evil cupids shoot arrows, and halfway through the heart breaks in two.
- ☘️ **Leprechaun Hills:** evil leprechauns kick pieces off, and a rainbow beam blasts across.
- 🐰 **Bunny Rampage:** a giant evil bunny stomps around, and painted eggs explode.
- 🎇 **Fourth of July:** bottle rockets skitter across the ground, and firecracker strings go pop-pop-pop.

**🃏 New card map: 🪖 WW2 Battlefield**
- Every pack has a rifle. Two tanks shell the field, and bombers drop bombs (crosshairs and shadows show where). The last two get a one-on-one shootout.

**🌐 IMDb / Rotten Tomatoes battles ("the 500 worst movies")**
- **+ New battle → 🌐 IMDb / Rotten Tomatoes.** Tick the ready-made worst-movie lists or paste your own links, and pick how many (500 by default).
- It skips movies that aren't in English, movies already on the Discord list, and movies you've watched or rated, then keeps going until it has the full amount. 🔄 Update reads the lists again later.

**👀 Watch luck (per battle, off by default)**
- The more someone watches your stream, the more luck they get in that battle. Every 10 hours watched = +1% luck, and both numbers can be changed. Turn it on in the battle's settings.

**💜 Chat battle fun mode**
- Chat buys power-ups with channel points only, and each power-up has its own on/off box. New power-ups: 👻 Ghost, 🦔 Spiky and 🧲 Magnet.
- New wacky effects: 🧊 Slippery, 🔀 Swap-o-rama, 💨 Speedy and 👀 Googly eyes.
- The fun mode box is right under the Chat battle box.

**🚌 Bus maps**
- Figure 8 Race buses steer around wrecks instead of plowing into them. Wrecks stay put, and both bus maps run faster.

**☠️ Doomsday**
- Your mic and camera stay off until the stream has really ended, then come back on by themselves.
- You can test the whole thing for real from the Test tab. While you're live, there's a big warning first that you can only confirm after 5 seconds.

**↺ Map tags**
- Reset the 🔴 NEW / 🔵 UPDATED tags, all of them or one map at a time: Settings → Game.

**🧪 Test tab**
- **Quick test lab** at the top:
  - Pick ball or card battle, the map, and lots of options.
  - It plays right there on that page, never on stream.
  - Fast-forward and chaos buttons included.
- Tests take you to the right tab, and the 📺 Preview and 💬 Test chat buttons are on every part of the Test tab.
- The card pool's game check boxes are gone: every pack fights.

## v1.39.1: What's new
Everything since 1.38.1.

**🚌 Two new ball battle maps: the pieces are school buses**
- **🚗 Demolition Derby:** everyone rams everyone in a mud arena; side hits (T-bones) hurt the most. 25 different paint jobs. Every bus has hidden health and you can see it getting beat up: dents and scraped paint, cracked then smashed windows, a loose bumper, a popped hood, smoke. A wrecked bus stops where it is and keeps smoking. Last bus running wins. Map power: 🚚 Monster Truck.
- **🏁 Figure 8 Race:** buses race laps around a figure 8 with lots of crashes at the crossing. The flagman waves green to go, white for the last lap and checkered at the finish. Pick the laps in Settings → Game (5 to start). First across the line wins; about 1 race in 25 turns into last bus standing. Map power: 🛢️ Oil Slick.
- **🍀 Luck on these maps:** more luck = more health and a faster bus. 50 luck or more gets a 🐄 cow catcher on the front (head-on hits hurt it less and it hits harder).
- Both are for ball battles only.

**🎯 Fair winner, always**
- Every battle's winner is picked by the odds (luck counted in) before it starts, and the battle plays out around it. Chaos, power-ups and wacky settings change the show, never who wins.

**🃏 Card pack search**
- It can't get stuck any more: every place it looks gets about 30 seconds at most, so it always comes back.
- New **⏹ Stop** and **🔄 Search again** buttons next to 🔍 Search, plus a seconds counter while it searches.

**🧪 Test tab**
- Boxes for 🚗 Demolition Derby and 🏁 Figure 8 Race (with 1 lap and 💥 Last bus standing), and checklist items for everything above (including a pretend stuck search to try ⏹ Stop).

## v1.38.1: What's new
Everything since 1.36.0.

**🎁 Viewer rewards (always on in your channel points menu)**
- **💧 Hydrate** and **🙆 Stretch**: a pop-up with a chugging or stretching sound for 5 seconds, only while Movie Royal is the window you're on.
- **🎩 Pick a hat**: the bot lists your hats in chat with numbers; the viewer types a number or name, and a pop-up shows the hat. Your hat list: Settings → 💰 Rewards & prices.
- **🎉 Viewer's choice**: the pop of confetti, a crowd going wild, confetti and balloons over the whole screen and a big pop-up for 10 seconds, on your screen and on stream.
- **📺 On stream with just OBS open:** press 📺 Put it on my stream (Settings → 💰 Rewards & prices, or the new last step of the Setup guide). It adds "Movie Royal celebration" on top of every OBS scene, and it works even with Movie Royal closed.
- **For a friend:** https://github.com/TimePeace49/movie-royale-releases/releases/latest/download/viewers-choice.html. They open it in their browser and it walks them through adding it to OBS (no Movie Royal needed).
- Rewards you already had keep their name and price (Movie Royal remakes them; ones made by hand on Twitch can only be deleted on Twitch).

**💰 Channel point rules**
- **🔢 Countdown:** a reward can be used X times per stream, then it's off until the next stream. Shows how many are left; ↺ starts it over.

**🗺️ Maps**
- Renamed: the card wrestling map is **🔔 Royal Rumble**; the ball wrestling map is **🤼 Rumble Royal**.

**🧪 Test tab & app**
- Checklist: 📺 Preview and 💬 Test chat buttons at the top right. The 💬 Pretend chat now pops out into its own window, like the preview.
- 🎁 Viewer reward tests: pretend Hydrate, Stretch, Pick a hat and Viewer's choice.
- New Setup guide steps pop up when Movie Royal starts, until you open the guide.

## v1.36.0: What's new
Everything since 1.35.3.

- ▶️ **Test tab: “Try each kind of battle”** at the top: one box for each kind of battle (ball, Discord movie, number, wheel, and every card map), each with ▶ Run it. The preview window pops up so you can watch.
- 📌 **Keep the winner in my pool** (right side of the 🃏 Card battles tab, off by default): the winning pack stays in your Card pool instead of one coming off its count.
- 🔴 **NEW / 🔵 UPDATED on card maps** too, like the ball maps.
- **Fixed:** the card battle screen loading too big when you open the app and go to Card battles.
- **Fixed:** switching card maps before a fight (e.g. Colosseum → Wizard Battle) made packs fall off and weapons fly. They now line up fresh on the new map.
- **Fixed:** number balls 10 and up showed only their first digit.

## v1.35.3: What's new
Everything since 1.30.5.

**🃏 Card battles (new!)**
- **Two new tabs:** 🃏 Card battles and 📦 Card pool. Your sealed card packs fight each other on stream: each pack gets stick arms and legs, an angry face and a health bar, and they bleed as they get hurt. Every pack has the same chance (no luck, no chat power-ups). When a pack wins, one comes off its count: time to open it.
- **📦 Card pool** works like the Movie Pool: your card battles on the left (+ New card battle, for example Pokémon only), their settings on top (every pack counts or 1 of each, which games, map, ⏳ pacer, ⏱️ fight length), and your packs below with − / +. Search for a pack (TCGplayer + pictures from the web) or ➕ Add my own pack. Packs are never deleted (🙈 hides one).
- **🤪 Wacky settings**, on or off any time: low gravity, extreme gore, teleport switches, turbo, slow motion, giant / tiny packs, slippery floor, exploding K.O.s, one-hit K.O., rage mode, weapons. In fullscreen they're in a side panel (keys 1–9, 0).
- **⏪ Replay** of the last moments before the winner screen. The **⏳ pacer** spreads the knockouts over the whole fight.
- **🎥 Camera:** it zooms in on the fight by itself. The 🎥 Camera buttons under the fight let you follow a pack, see the whole map, move and zoom. On the fight itself: scroll, drag, click a pack to follow it, double-click for auto.
- **Card-only maps** (each with a 🥊 FINAL FIGHT when 2 are left: the clock stops, a bell rings, then a 20-second fight):
  - 🏯 **Kung Fu Town:** a martial arts brawl in an old kung fu movie town. Weapons (with the wacky switch) are only 2 per fight and hit hard; packs that aren't fighting go after them.
  - 🔔 **Rumble Ring:** a wrestling rumble. Body slams, suplexes, Irish whips, clotheslines, elbow drops and steel chairs. The only way out is over the top rope, and the more hurt a pack is, the easier it goes over. Your Twitch picture is in the middle of the ring (or pick your own logo on the 📦 Card pool tab).
  - 🧙 **Wizard Battle:** wizards on a floating platform cast bolts, fireballs, lightning and meteors at anyone, from anywhere. Cracked stone falls away: fall through a hole or off the edge and you're out. No weapons.
  - 🏛️ **Colosseum:** gladiators, each with their own weapon (sword, spear, trident, axe, mace, flail, hammer, scimitar), no stealing. Turn on 🦁 **Lions** and lions come out of the tunnels and hunt; turn it off and they go back in.
- **Card battles can use every ball map too** (the packs fight there as card fighters). Map menus show ⚪ ball / 🃏 card / ⚪🃏 both, with the maps only that battle can use on top (A to Z), then a line, then the maps for both.
- Picking another map after a fight resets the screen by itself.
- **⚡🔀 New wheel spot type: Auto + Link.** It lands, the timer pauses, and it goes straight to another wheel, a battle or a card battle, then comes back.

**⚔️ Battles**
- **⏳ Better pacing:** pieces don't all go out in the first few seconds. Knockouts are spread over the whole battle (⏳ pacer slider in Settings → Game, 0 = off), and when 2 are left the 🥊 FINAL SHOWDOWN finishes it fast.
- **⚔️ Battlefield map:** running into the army hurts; a few bumps knock a piece out.
- **📺 Capture window** on the Battle tab: shows a window from your PC (like a YouTube video) small in the top-left of your OBS scene. − / + changes its size. Needs OBS set up.
- **↔️ Resize the boxes** on the Battle and Card battles tabs by dragging the bar between them.

**🎟️ Wild spots & pins**
- A wild (Kirb) spot win pins nothing. Its battle's winner is pinned as the movie; a text entry isn't pinned, so you can pin it yourself.

**💬 Chat & app**
- **📣 Chat message follows your tab:** one switch; each post is the message for the tab you're on. Turning it on posts right away.
- **👥 Movie Royal opens on the People tab.**
- **✍️ Spell check** in text boxes (right-click for fixes).
- **↔️ No sideways scrolling** on any tab.
- **🖥️ Window mode** (Settings → Graphics): window, fullscreen window or fullscreen, plus 🔬 advanced graphics settings.
- ✅ The Test tab checklist is a plain list again, with every new feature to try.

## v1.30.5: What's new
Everything since 1.28.12.

**📌 Movie pins**
- The claimed movie is pinned in Twitch chat as "Movie #2 of tonight's stream: Heat (1995) — Lucy's movie", followed by every movie watched earlier tonight and whose it was. The pinned Discord message lists tonight's movies the same way.
- **🎟️ Wild spots:** when a wild (Kirb) spot wins, the pin says the wild spot battle picks the movie. The next battle you run (not a chat battle or giveaway) is that battle: it shows "MOVIE #2 TONIGHT" on stream and its winner is pinned as the movie (Kirb's pick). Pass on it and the next battle picks again.

**💰 Rewards & prices** (new Settings tab)
- Every channel point reward, bits amount and donation amount in one place, sorted by tab. Change prices (saved on Twitch right away).
- Choose when each reward is on: 📏 follow the rules, ✅ always on, ⏸ off (hidden on Twitch), or 1️⃣ on, then off after one use. Pause any bits amount, or subs / bits / donations on the wheel.

**🚀 Raid reward** (on by default)
- A viewer redeems it and types who to raid in chat. A pop-up with a celebration sound shows the pick, and a **🚀 Raid → name** box appears at the top of the app: click it to start the raid. The reward hides for the rest of the stream once used. An old raid reward keeps its price (1500 if none).
- **Sign in with Twitch again once** so Movie Royal is allowed to start raids.

**🎡 Wheel**
- Two new channel point rewards: **✌️ Double trouble** (the viewer types any spot in chat and it doubles in size; never the void) and **🛑 Force stop** (the round ends right away: the spot it's on has to be done). Add them with ✨ Add missing rewards.
- **✕ makes a spot invisible** instead of deleting it (🙈, all its settings kept; 👁️ shows it again). To really delete one: ⚙ → 🗑 Delete for good.
- **⚙ Spot settings open in their own window** with ⬆ Previous / ⬇ Next, and the spot list fits without scrolling sideways.
- **📥 Importing a wheel** opens its own window with **📂 Choose a file…**, drag and drop, or a Wheel of Names link.

**⚔️ Battles**
- **Removing never deletes:** ↺ Reset entries, Clear and ✕ pause entries. They stay in the 🎬 Movie Pool list, darker but readable, with **▶ Bring back** (or **▶ Bring them all back**). Someone who joins again comes straight back.
- **↺ Reset entries** next to Fullscreen empties the battle (the Discord movie battle can't be emptied from there). The old button is now **↺ Reset battlefield** (clears the cliff).
- **🔒 Discord picks and swaps only lock during movie battles** (new default): people can /suggest and /swap right up until you press Start. Other choices in Settings → Luck & swaps. **Update your 24/7 bot when Movie Royal asks.**

**💬 Twitch chat**
- **📣 Hourly chat messages:** a 📣 Chat message button on the Battle, Chat battle, Giveaway and Wheel tabs posts that tab's message now and every hour, until you press it again or the stream ends. Change the words and your Discord link in Settings → Twitch.
- **🤖 Movies Royal Bot:** Movie Royal's chat messages start with "🤖 Movies Royal Bot:" (change or remove it in Settings → Twitch), or sign in a separate bot account.
- **🔗 Only linked viewers get stats** (chats, watch streaks, watch time). Chat is still saved for everyone. Profiles show the day they linked. Turn it off in Settings → Twitch.

**🖥️ The app**
- **🎨 Graphics settings:** resolution (720p to 4K), frame rate, quality, an FPS counter and a power saver.
- **⚡ Less lag when switching tabs:** the game inside the app draws much lighter while hidden or small. The stream (OBS) isn't affected.
- **🔇 Quiet when you're in another program** (on by default): every Movie Royal window mutes until you click back. The stream isn't affected.
- **🧭 The top tabs never scroll:** they shrink to fit (down to just icons) and stay on top.
- **🖱️ Right-click works:** cut, copy, paste, spelling fixes, links and pictures.

**🧪 Test tab**
- Sorted into groups with jump buttons. New things to try get a 🆕 and a green number until you tick them.
- The preview window only pops up for tests that change the stream screen.
- 💬 Pretend chat can 🎬 add a movie, 🚀 raid, ✌️ double and 🛑 stop. New 📌 Movie winner pin test.

**🛡️ Backup Bots**
- Its own icon, plus new **🖥️ Console** and **⚠️ Errors** tabs.

**Fixes**
- Pop-ups (subs, bits, joins…) no longer show up late on the battle screen after the wheel was on stream.

## v1.28.12: What's new
Everything since 1.28.10.

**🎡 Wheel of Kirbportions**
- Comes with the app now: all 71 spots with their rules (auto, countdown, max wins), sizes, colors and settings. It's added to your wheel list once. Delete it if you don't want it: it won't come back. If you already have a wheel with that name, yours is left alone.

**☁️ 24/7 bot update pop-up is back**
- "Update your 24/7 Discord bot" pops up again when Movie Royal opens, only when the bot on Cloudflare really needs it. If the internet is slow right then, it checks again a couple of minutes later.
- New box in Settings → Discord & picks: **🔔 Pop up when the 24/7 bot needs an update** ("Don't remind me again" unticks it). 🧪 Test tab: **☁️ Show the 24/7 bot update pop-up**.

## v1.28.10: What's new
Everything since 1.28.9.

- 🧪 **Test tab:** the preview window doesn't pop up by itself any more. It only shows when you run a test that changes the stream screen (an alert, a battle, a wheel landing, pretend chat…). Checks like the Discord self-test, the backup link or Restart the Discord bot leave it closed. **📺 Show the stream screen** still opens it any time.

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

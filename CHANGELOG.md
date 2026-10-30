# Changelog

What changed in each version of Movie Royal. Newest first.

## 1.59.1
- ✅ **Fresh checklist:** every tick on 🧪 Test → ✅ Checklist is cleared once with this update, so you can go through everything again from the start.
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

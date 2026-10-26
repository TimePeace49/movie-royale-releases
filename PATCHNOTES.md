# Patch notes

The big list of what's new in each **latest release** (the version everyone gets).
Test builds (pre-releases) are listed in CHANGELOG.md until they make it into a latest release.

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

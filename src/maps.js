// The battle maps (the game screen has the art + mechanics; this list is for menus, votes and chat).
export const MAP_LIST = [
  { id: 'classic', name: 'Crumbling Cliff', icon: '⛰️', desc: 'The original: a floating cliff that crumbles from the edges.' },
  { id: 'space', power: '🕳️ Black Hole', name: 'Deep Space', icon: '🪐', desc: 'Low gravity — everyone floats and slides. Asteroids fly by.' },
  { id: 'lava', power: '🌋 Eruption', name: 'Lava Lake', icon: '🌋', desc: 'The lava floods the land: low ground first, then the hills. Touch it and you are toast.' },
  { id: 'rainbow', power: '🐢 Blue Shell', name: 'Rainbow Road', icon: '🌈', desc: 'A slippery rainbow race track in space. Watch out for shells!' },
  { id: 'hollywood', power: '🫨 Aftershock', name: 'Hollywood Sign', icon: '🎬', desc: 'Fight on top of the letters while earthquakes knock them down one by one.' },
  { id: 'cyber', power: '🔴 Laser Grid', name: 'Neon City', icon: '🌆', desc: 'Lasers sweep the stage — jump or get zapped.' },
  { id: 'smash', power: '💥 Final Smash', name: 'Final Stage', icon: '🥊', desc: 'A floating battle stage with side platforms and SMASH attacks.' },
  { id: 'rumble', solid: true, power: '🤼 Tag Team', name: 'Rumble Royal', icon: '🤼', desc: 'Wrestlers fly off the top rope — wherever they land, everyone goes flying out of the ring. Plus: bounce off the ropes or get thrown over the top.' },
  { id: 'pong', power: '⚪ Multiball', name: 'Pong', icon: '🏓', desc: 'A flaming ball rips straight through pieces, faster and faster. The paddles knock pieces around.' },
  { id: 'frost', power: '🌨️ Blizzard', name: 'Frozen Peak', icon: '❄️', desc: 'Slippery ice under the northern lights. Icicles drop from the sky.' },
  { id: 'donut', power: '😋 Mega Bite', name: 'Sweet Donut', icon: '🍩', desc: 'A giant sugar monster takes huge bites out of the donut. Do not be in its mouth!' },
  { id: 'haunted', power: '👻 Poltergeist', name: 'Haunted Hill', icon: '👻', desc: 'Big ghosts drift through. Get close and you panic and run for the edge until you bump into someone.' },
  { id: 'popcorn', power: '🧈 Butter Blast', name: 'Popcorn Panic', icon: '🍿', desc: 'Hot butter rains down. Get hit and you are buttered; the popcorn it lands on POPS and shoots you off the map.' },
  { id: 'desert', power: '🪱 Worm Frenzy', name: 'Dune Sea', icon: '🏜️', desc: 'Nobody falls off: a giant sand worm bursts up and swallows pieces whole.' },
  { id: 'castle', power: '🐉 Dragon Raid', name: 'Dragon Keep', icon: '🐉', desc: 'A castle courtyard. Dragons swoop down, knocking pieces flying and burning holes in the floor.' },
  { id: 'tiers', power: '🫨 Tremor', name: 'Tumble Tower', icon: '🧱', desc: 'Four floors stacked up: the biggest on top, each one below it smaller. Stand on a tile for 5 seconds and it gives way: drop to the floor below. Fall through the bottom and you are out.' },
  { id: 'gas', power: '🐄 Stampede', name: 'Fart Farm', icon: '💨', desc: 'Big cows stampede across the field, trampling pieces flat and farting on whoever is behind them. UFOs beam pieces up into the saucer.' },
  { id: 'hero', power: '🦹 Villain Team-Up', name: 'Hero City', icon: '🦸', desc: 'A rooftop fight above the city at night. Villains attack: a giant robot fist smashes down, a laser drone zaps, a caped flyer grabs pieces and throws them off the roof, a wrecking ball swings across and knocks pieces off, and a bomber jet drops bombs that blow pieces up.' },
  { id: 'plague', solid: true, power: '🐀 Rat Swarm', name: 'Plague Town', icon: '🐀', desc: 'A walled medieval town seen from above. Rats bite and infect you, and the sick pass it on to anyone they bump. Run from the rats! Nothing crumbles.' },
  { id: 'warfield', solid: true, power: '🐎 Royal Charge', name: 'Battlefield', icon: '⚔️', desc: 'Every piece on one side, an unstoppable army on the other: archers hit the back rows, knights crush the front, and the cavalry hits both sides. Nothing crumbles.' },
  { id: 'kaiju', power: '🦖 Monster Stomp', name: 'Monster Mash', icon: '🦖', desc: 'A fight on the rooftops while two giant monsters battle in the streets. Their punches, fire breath and tail swipes smash the roofs, and that part of the building collapses. Alleys between the buildings are a long drop.' },
  { id: 'zombies', solid: true, power: '🧟 Zombie Horde', name: 'Zombie Horde', icon: '🧟', desc: 'City streets at night, closed off. Zombies shamble out of the manholes and go after everyone, and everyone runs. Balls get bitten and take damage. Cards that get bitten are INFECTED: out, but they stay and chase the others. Nothing crumbles, nobody falls.' },
  { id: 'derby', solid: true, power: '🚚 Monster Truck', name: 'Demolition Derby', icon: '🚗', desc: 'Not balls: school buses! Everyone rams everyone in a mud arena; side hits hurt the most. Buses get beat up as they take hits, and a wrecked one stops where it is and smokes. More luck = a tougher, faster bus (50+ luck gets a cow catcher). Last bus running wins.' },
  { id: 'figure8', solid: true, power: '🛢️ Oil Slick', name: 'Figure 8 Race', icon: '🏁', desc: 'School buses race laps around a figure 8 with a crossing in the middle (choose the laps in Settings). Lots of banging. More luck = a tougher, faster bus. First across the line wins; once in a while it turns into last bus standing.' },
  { id: 'bombs', solid: true, power: '💣 Mega Bomb', name: 'Blast Zone', icon: '💣', desc: 'Giant bombs drop in, trap you and blow up in a big cross. Get out of the lines!' },
];
// 🔵 When you change how a map plays or looks, bump its number here: the map then shows "UPDATED" in the
// map menus until it's been played on stream again. (Maps never played on stream show "NEW".)
const REV = { gas: 2, plague: 2, warfield: 2, hero: 2 };
for (const m of MAP_LIST) m.rev = REV[m.id] || 1;
// ⚪🃏 which battles a map is for: ball battles, card battles, or both (Derek says when a map is only for one).
// Ball maps are for both unless listed here as ball-only. Card-only maps live in cards.js (CARD_MAPS).
const BALL_ONLY = ['derby', 'figure8']; // 🚗 car maps: ball battles only
for (const m of MAP_LIST) m.modes = BALL_ONLY.includes(m.id) ? ['ball'] : ['ball', 'card'];
// chaos events that break the ground: never used on maps where nothing breaks (their channel point rewards get paused there)
export const GROUND_EVENTS = ['collapse', 'lightning'];
export const mapById = id => MAP_LIST.find(m => m.id === id);

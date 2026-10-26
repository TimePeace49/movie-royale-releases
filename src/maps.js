// The battle maps (the game screen has the art + mechanics; this list is for menus, votes and chat).
export const MAP_LIST = [
  { id: 'classic', name: 'Crumbling Cliff', icon: '⛰️', desc: 'The original: a floating cliff that crumbles from the edges.' },
  { id: 'space', power: '🕳️ Black Hole', name: 'Deep Space', icon: '🪐', desc: 'Low gravity — everyone floats and slides. Asteroids fly by.' },
  { id: 'lava', power: '🌋 Eruption', name: 'Lava Lake', icon: '🌋', desc: 'The lava floods the land: low ground first, then the hills. Touch it and you are toast.' },
  { id: 'rainbow', power: '🐢 Blue Shell', name: 'Rainbow Road', icon: '🌈', desc: 'A slippery rainbow race track in space. Watch out for shells!' },
  { id: 'hollywood', power: '🫨 Aftershock', name: 'Hollywood Sign', icon: '🎬', desc: 'Fight on top of the letters while earthquakes knock them down one by one.' },
  { id: 'cyber', power: '🔴 Laser Grid', name: 'Neon City', icon: '🌆', desc: 'Lasers sweep the stage — jump or get zapped.' },
  { id: 'smash', power: '💥 Final Smash', name: 'Final Stage', icon: '🥊', desc: 'A floating battle stage with side platforms and SMASH attacks.' },
  { id: 'rumble', power: '🤼 Tag Team', name: 'Royal Rumble', icon: '🤼', desc: 'Wrestlers fly off the top rope — wherever they land, everyone goes flying out of the ring. Plus: bounce off the ropes or get thrown over the top.' },
  { id: 'pong', power: '⚪ Multiball', name: 'Pong', icon: '🏓', desc: 'A flaming ball rips straight through pieces, faster and faster. The paddles knock pieces around.' },
  { id: 'frost', power: '🌨️ Blizzard', name: 'Frozen Peak', icon: '❄️', desc: 'Slippery ice under the northern lights. Icicles drop from the sky.' },
  { id: 'donut', power: '😋 Mega Bite', name: 'Sweet Donut', icon: '🍩', desc: 'A giant sugar monster takes huge bites out of the donut. Do not be in its mouth!' },
  { id: 'haunted', power: '👻 Poltergeist', name: 'Haunted Hill', icon: '👻', desc: 'Big ghosts drift through. Get close and you panic and run for the edge until you bump into someone.' },
  { id: 'popcorn', power: '🧈 Butter Blast', name: 'Popcorn Panic', icon: '🍿', desc: 'Hot butter rains down. Get hit and you are buttered; the popcorn it lands on POPS and shoots you off the map.' },
  { id: 'desert', power: '🪱 Worm Frenzy', name: 'Dune Sea', icon: '🏜️', desc: 'Nobody falls off: a giant sand worm bursts up and swallows pieces whole.' },
  { id: 'castle', power: '🐉 Dragon Raid', name: 'Dragon Keep', icon: '🐉', desc: 'A castle courtyard. Dragons swoop down, knocking pieces flying and burning holes in the floor.' },
  { id: 'tiers', power: '🫨 Tremor', name: 'Tumble Tower', icon: '🧱', desc: 'Four floors stacked up: the biggest on top, each one below it smaller. Stand on a tile for 5 seconds and it gives way: drop to the floor below. Fall through the bottom and you are out.' },
  { id: 'gas', power: '🐄 Stampede', name: 'Fart Farm', icon: '💨', desc: 'Big cows stampede across the field, trampling pieces flat and farting on whoever is behind them. UFOs beam pieces up into the saucer.' },
  { id: 'plague', power: '🐀 Rat Swarm', name: 'Plague Town', icon: '🐀', desc: 'A walled medieval town seen from above. Rats bite and infect you, and the sick pass it on to anyone they bump. Run from the rats! Nothing crumbles.' },
  { id: 'warfield', power: '🐎 Royal Charge', name: 'Battlefield', icon: '⚔️', desc: 'Every piece on one side, an unstoppable army on the other: archers hit the back rows, knights crush the front, and the cavalry hits both sides. Nothing crumbles.' },
  { id: 'bombs', power: '💣 Mega Bomb', name: 'Blast Zone', icon: '💣', desc: 'Giant bombs drop in, trap you and blow up in a big cross. Get out of the lines!' },
];
// 🔵 When you change how a map plays or looks, bump its number here: the map then shows "UPDATED" in the
// map menus until it's been played on stream again. (Maps never played on stream show "NEW".)
const REV = { gas: 2 };
for (const m of MAP_LIST) m.rev = REV[m.id] || 1;
export const mapById = id => MAP_LIST.find(m => m.id === id);

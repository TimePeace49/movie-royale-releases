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
  { id: 'figure8', solid: true, race: true, power: '🛢️ Oil Slick', name: 'Figure 8 Race', icon: '🏁', desc: 'School buses race laps around a figure 8 with a crossing in the middle (choose the laps in Settings). Lots of banging. More luck = a tougher, faster bus. First across the line wins; once in a while it turns into last bus standing.' },
  // 🏁 race maps (1.60.0, Derek: 10 more races, different styles). clean = they race and pass, mayhem = they ram, mixed = a bit of both
  { id: 'oval', solid: true, race: true, style: 'clean', power: '🚧 Big Wreck', name: 'Speedway Oval', icon: '🏟️', desc: 'Race cars on a fast oval. A clean race: they pass and draft, they don\'t ram. First across the line wins.' },
  { id: 'grandprix', solid: true, race: true, style: 'clean', power: '🌧️ Rain Shower', name: 'Grand Prix', icon: '🏎️', desc: 'Race cars on a twisty road course with red and white curbs. A clean race to the line. Rain makes it slippery.' },
  { id: 'nightcity', solid: true, race: true, style: 'clean', power: '🚧 Roadwork', name: 'Night Street Race', icon: '🌃', desc: 'Race cars through neon city streets at night, with sharp corners. A clean race; roadwork cones can spin them out.' },
  { id: 'icering', solid: true, race: true, style: 'clean', power: '🌨️ Blizzard', name: 'Ice Ring', icon: '❄️', desc: 'Race cars on an icy track with hardly any grip. They slide through every corner. A blizzard makes it worse.' },
  { id: 'beach', solid: true, race: true, style: 'clean', power: '🌊 Tidal Wave', name: 'Beach Rally', icon: '🏖️', desc: 'Race cars along the beach. Waves wash over the top of the track and slow everyone down. A clean race.' },
  { id: 'rally', solid: true, race: true, style: 'mixed', power: '🌪️ Dust Devil', name: 'Desert Rally', icon: '🏜️', desc: 'Monster trucks race through the desert. A bit of bumping, a lot of dust, and dust devils that spin them out.' },
  { id: 'crossover', solid: true, race: true, style: 'mayhem', power: '🛢️ Oil Spill', name: 'Crossover Chaos', icon: '✖️', desc: 'School buses on a track that crosses itself twice. Mayhem: everyone rams everyone, and the crossings are T-bone city.' },
  { id: 'volcano', solid: true, race: true, style: 'mayhem', power: '🌋 Eruption', name: 'Volcano Run', icon: '🌋', desc: 'Monster trucks race round a volcano while lava bombs come down on the track. Mayhem.' },
  { id: 'junkyard', solid: true, race: true, style: 'mayhem', power: '🧲 Junk Drop', name: 'Junkyard Smash', icon: '🚧', desc: 'School buses on a tight U-shaped track through a junkyard. Junk cars drop out of the sky. Mayhem.' },
  { id: 'bigair', solid: true, race: true, style: 'mayhem', power: '🚚 Crusher Truck', name: 'Big Air Stadium', icon: '🚀', desc: 'Monster trucks fly off two big ramps. Land on someone and you crush them. Mayhem.' },
  { id: 'xmas', power: '🦌 Reindeer Stampede', name: "Santa's Workshop", icon: '🎅', desc: 'A snowy North Pole island under the northern lights. Herds of evil red-eyed reindeer stampede across (a warning stripe shows where), and a GIANT EVIL SANTA looms behind the island, locking on and firing lasers out of his eyes. The edges crumble.' },
  { id: 'turkey', power: '🦃 Turkey Trot', name: 'Turkey Trouble', icon: '🦃', desc: 'A harvest farm at sunset. Evil turkeys strut out and chase everyone, pecking and kicking them toward the edge, and every so often a whole flock gobbles across in a TURKEY TROT that knocks everyone in its way off. The edges crumble.' },
  { id: 'elements', power: '🔮 Elemental Storm', name: 'Elemental Wizards', icon: '🔮', desc: 'A floating island in a magical sky. Four wizards on giant pillars at the corners take turns casting: 🔥 fireballs blow pieces up, 🪨 boulders smash the ground away, 🌊 a tidal wave washes pieces off, ❄️ ice freezes pieces solid (still frozen when it ends = shattered). Every spell shows where it lands first. The edges crumble.' },
  { id: 'pompeii', power: '🌋 Eruption', name: 'Pompeii', icon: '🌋', desc: 'A long Roman town running downhill from the erupting volcano to the sea. The lava pours in at the top and chases everyone down through the streets, a little faster than anyone can run, and the screen scrolls down with the chase. Buildings block everyone. Nobody outruns it: the last one left wins.' },
  { id: 'halloween', power: '👻 Ghost Storm', name: 'Haunted Graveyard', icon: '🎃', desc: '🎃 Halloween. A graveyard island under a full moon. Ghosts drift after the pieces: one touch and the piece is SCARED and bolts for the edge. Jack-o\'-lanterns drop out of the sky (a circle shows where) and blow up. The edges crumble.' },
  { id: 'newyear', power: '🎆 Midnight Finale', name: "New Year's Eve", icon: '🎆', desc: "🎆 New Year's. A rooftop party above the city at midnight. Rockets shoot up from the streets and burst on the pieces, and THE GIANT BALL drops (its shadow grows first) and smashes a big hole in the roof. The edges crumble." },
  { id: 'valentine', power: '💘 Cupid Volley', name: 'Heartbreak Island', icon: '💘', desc: "💘 Valentine's Day. A heart-shaped island. Two evil cupids fly around shooting arrows (a dashed line shows each shot). Halfway through, the heart BREAKS down the middle and splits in two. The edges crumble." },
  { id: 'stpat', power: '🌈 Pot of Gold', name: 'Leprechaun Hills', icon: '☘️', desc: "☘️ St. Patrick's Day. A clover island under a rainbow. Evil leprechauns hop after the pieces and kick them toward the edge, and the RAINBOW BEAM blasts across the island (a rainbow stripe shows where first). The edges crumble." },
  { id: 'easter', power: '🐰 Bunny Rampage', name: 'Bunny Rampage', icon: '🐰', desc: '🐰 Easter. A spring meadow. A GIANT EVIL BUNNY hops around: its shadow shows where it lands, and the landing stomps everyone nearby and breaks the ground. Painted eggs pop up, wobble, crack… and blow up. The edges crumble.' },
  { id: 'july4', power: '🎇 Grand Finale', name: 'Fourth of July', icon: '🎇', desc: '🎇 4th of July. A picnic park at dusk with fireworks overhead. Bottle rockets skitter across the ground in straight lines (a dashed line shows the path) and strings of firecrackers go off pop-pop-pop, knocking out the ground. The edges crumble.' },
  { id: 'bombs', solid: true, power: '💣 Mega Bomb', name: 'Blast Zone', icon: '💣', desc: 'Giant bombs drop in, trap you and blow up in a big cross. Get out of the lines!' },
];
// 🔵 When you change how a map plays or looks, bump its number here: the map then shows "UPDATED" in the
// map menus until it's been played on stream again. (Maps never played on stream show "NEW".)
const REV = { gas: 2, plague: 2, warfield: 2, hero: 2 };
for (const m of MAP_LIST) m.rev = REV[m.id] || 1;
// ⚪🃏 which battles a map is for: ball battles, card battles, or both (Derek says when a map is only for one).
// Ball maps are for both unless listed here as ball-only. Card-only maps live in cards.js (CARD_MAPS).
export const RACE_MAPS = ['figure8', 'oval', 'grandprix', 'nightcity', 'icering', 'beach', 'rally', 'crossover', 'volcano', 'junkyard', 'bigair']; // 🏁 races (chat battle race power-ups work on these)
const BALL_ONLY = ['derby', ...RACE_MAPS]; // 🚗 car maps: ball battles only
for (const m of MAP_LIST) m.modes = BALL_ONLY.includes(m.id) ? ['ball'] : ['ball', 'card'];
// 🎉 holiday maps: normal maps (any time of year, on Random too), just listed in their own section at the bottom of map menus (Derek)
export const HOLIDAY = ['xmas', 'turkey', 'halloween', 'newyear', 'valentine', 'stpat', 'easter', 'july4'];
for (const m of MAP_LIST) if (HOLIDAY.includes(m.id)) m.holiday = true;
// chaos events that break the ground: never used on maps where nothing breaks (their channel point rewards get paused there)
export const GROUND_EVENTS = ['collapse', 'lightning'];
export const mapById = id => MAP_LIST.find(m => m.id === id);

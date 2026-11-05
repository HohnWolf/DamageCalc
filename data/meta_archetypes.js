// Authentische Champions-Teams für den Headless Matchup-Tester.
// Format: [Gen 9 Champions] VGC 2026 Reg M-C (Level 50, Doppelkampf, Show 6 Bring 4)
// SPs (Stat Points): Maximal 32 je Wert, genau 66 Stat Points gesamt.
// Basiert direkt auf der realen Smogon/NCP Champions VGC 2026 Metagame-Nutzungsstatistik (data.pkmn.cc & setdex_ncp-g10).

(function () {
  'use strict';

  var ARCHETYPES = [
    {
      id: 'sand_rush',
      name: 'Sand Rush Offense (Mega Tyranitar + Excadrill)',
      category: 'Sand',
      badgeColor: '#795548',
      description: 'Sturmgewaltige Sand-Offensive mit Mega-Despotar, Stalobor Sand Rush und Rough-Skin-Garchomp.',
      paste: `Tyranitar @ Tyranitarite
Ability: Sand Stream
Level: 50
SPs: 2 HP / 32 Atk / 32 Spe
Adamant Nature
- Rock Slide
- Crunch
- Low Kick
- Protect

Excadrill @ Life Orb
Ability: Sand Rush
Level: 50
SPs: 2 HP / 32 Atk / 32 Spe
Adamant Nature
- Earthquake
- Iron Head
- Rock Slide
- Protect

Garchomp @ Clear Amulet
Ability: Rough Skin
Level: 50
SPs: 2 HP / 32 Atk / 32 Spe
Jolly Nature
- Earthquake
- Dragon Claw
- Swords Dance
- Protect

Incineroar @ Sitrus Berry
Ability: Intimidate
Level: 50
SPs: 32 HP / 14 Def / 20 SpD
Careful Nature
- Flare Blitz
- Darkest Lariat
- Fake Out
- Parting Shot

Corviknight @ Leftovers
Ability: Mirror Armor
Level: 50
SPs: 32 HP / 2 Atk / 32 SpD
Careful Nature
- Brave Bird
- Iron Head
- Bulk Up
- Roost

Sinistcha @ Rocky Helmet
Ability: Hospitality
Level: 50
SPs: 32 HP / 32 Def / 2 SpD
Bold Nature
- Matchagotcha
- Strength Sap
- Rage Powder
- Protect`
    },

    {
      id: 'sun_offense',
      name: 'Sun Offense (Mega Charizard Y + Venusaur)',
      category: 'Sun',
      badgeColor: '#e65100',
      description: 'Klassische Sonnen-Offensive mit Mega-Glurak Y, Chlorophyll-Bisaflor, conas Worlds-Garchomp und Farigiraf.',
      paste: `Charizard @ Charizardite Y
Ability: Blaze
Level: 50
SPs: 2 HP / 32 SpA / 32 Spe
Modest Nature
- Heat Wave
- Weather Ball
- Solar Beam
- Protect

Venusaur @ Life Orb
Ability: Chlorophyll
Level: 50
SPs: 2 HP / 32 SpA / 32 Spe
Modest Nature
- Leaf Storm
- Sludge Bomb
- Earth Power
- Sleep Powder

Garchomp @ Choice Scarf
Ability: Rough Skin
Level: 50
SPs: 2 HP / 32 Atk / 32 Spe
Jolly Nature
- Earthquake
- Dragon Claw
- Rock Slide
- Iron Head

Incineroar @ Sitrus Berry
Ability: Intimidate
Level: 50
SPs: 32 HP / 14 Def / 20 SpD
Careful Nature
- Flare Blitz
- Darkest Lariat
- Fake Out
- Parting Shot

Farigiraf @ Safety Goggles
Ability: Armor Tail
Level: 50
SPs: 32 HP / 16 Def / 16 SpA / 2 SpD
Modest Nature
- Psychic
- Dazzling Gleam
- Helping Hand
- Trick Room

Kingambit @ Chople Berry
Ability: Defiant
Level: 50
SPs: 32 HP / 32 Atk / 2 SpD
Adamant Nature
- Kowtow Cleave
- Iron Head
- Sucker Punch
- Low Kick`
    },

    {
      id: 'rain_offense',
      name: 'Swift Swim Rain (Mega Swampert + Pelipper)',
      category: 'Rain',
      badgeColor: '#0288d1',
      description: 'Wuchtiger VGC-Regen mit Mega-Sumpex (Swift Swim), Pelipper, Stamina-Archaludon und Basculegion.',
      paste: `Swampert @ Swampertite
Ability: Torrent
Level: 50
SPs: 2 HP / 32 Atk / 32 Spe
Adamant Nature
- Wave Crash
- High Horsepower
- Ice Punch
- Protect

Pelipper @ Focus Sash
Ability: Drizzle
Level: 50
SPs: 32 HP / 10 SpA / 13 SpD / 11 Spe
Modest Nature
- Weather Ball
- Hurricane
- Tailwind
- Wide Guard

Archaludon @ Leftovers
Ability: Stamina
Level: 50
SPs: 32 HP / 28 Def / 6 SpA
Bold Nature
- Electro Shot
- Flash Cannon
- Draco Meteor
- Protect

Basculegion @ Choice Band
Ability: Adaptability
Level: 50
SPs: 2 HP / 32 Atk / 32 Spe
Adamant Nature
- Wave Crash
- Last Respects
- Flip Turn
- Aqua Jet

Rillaboom @ Miracle Seed
Ability: Grassy Surge
Level: 50
SPs: 32 HP / 32 Atk / 2 SpD
Adamant Nature
- Grassy Glide
- Wood Hammer
- Fake Out
- U-turn

Incineroar @ Sitrus Berry
Ability: Intimidate
Level: 50
SPs: 32 HP / 14 Def / 20 SpD
Careful Nature
- Flare Blitz
- Darkest Lariat
- Fake Out
- Parting Shot`
    },

    {
      id: 'tailwind_salamence',
      name: 'Aerilate Tailwind (Mega Salamence + Sneasler)',
      category: 'Tailwind',
      badgeColor: '#00897b',
      description: 'Turnier-dominanter Tailwind-Druck mit Mega-Brutalanda (Aerilate Hyper Voice), Sneasler und Kingambit.',
      paste: `Salamence @ Salamencite
Ability: Intimidate
Level: 50
SPs: 2 HP / 32 SpA / 32 Spe
Timid Nature
- Hyper Voice
- Draco Meteor
- Tailwind
- Protect

Sneasler @ Focus Sash
Ability: Unburden
Level: 50
SPs: 2 HP / 32 Atk / 32 Spe
Jolly Nature
- Close Combat
- Dire Claw
- Fake Out
- Protect

Kingambit @ Black Glasses
Ability: Defiant
Level: 50
SPs: 32 HP / 32 Atk / 2 SpD
Adamant Nature
- Kowtow Cleave
- Iron Head
- Sucker Punch
- Low Kick

Rillaboom @ Assault Vest
Ability: Grassy Surge
Level: 50
SPs: 32 HP / 32 Atk / 2 SpD
Adamant Nature
- Grassy Glide
- Wood Hammer
- Fake Out
- U-turn

Basculegion @ Mystic Water
Ability: Adaptability
Level: 50
SPs: 2 HP / 32 Atk / 32 Spe
Adamant Nature
- Wave Crash
- Last Respects
- Aqua Jet
- Protect

Gholdengo @ Life Orb
Ability: Good as Gold
Level: 50
SPs: 2 HP / 32 SpA / 32 Spe
Timid Nature
- Make It Rain
- Shadow Ball
- Nasty Plot
- Protect`
    },

    {
      id: 'psyspam_gardevoir',
      name: 'Psyspam Offense (Mega Gardevoir + Indeedee-F)',
      category: 'Psyspam',
      badgeColor: '#c2185b',
      description: 'Metagame-Spitze für Psyspam: Mega-Gardevoir (Expanding Force & Feen-Schall) mit Indeedee-F und Sneasler.',
      paste: `Gardevoir @ Gardevoirite
Ability: Trace
Level: 50
SPs: 2 HP / 32 SpA / 32 Spe
Modest Nature
- Hyper Voice
- Expanding Force
- Psychic
- Protect

Indeedee-F @ Psychic Seed
Ability: Psychic Surge
Level: 50
SPs: 32 HP / 32 Def / 2 SpD
Bold Nature
- Follow Me
- Helping Hand
- Dazzling Gleam
- Protect

Sneasler @ White Herb
Ability: Unburden
Level: 50
SPs: 2 HP / 32 Atk / 32 Spe
Jolly Nature
- Close Combat
- Dire Claw
- Fake Out
- Protect

Armarouge @ Life Orb
Ability: Flash Fire
Level: 50
SPs: 32 HP / 32 SpA / 2 SpD
Modest Nature
- Expanding Force
- Armor Cannon
- Wide Guard
- Protect

Kingambit @ Chople Berry
Ability: Defiant
Level: 50
SPs: 32 HP / 32 Atk / 2 SpD
Adamant Nature
- Kowtow Cleave
- Iron Head
- Sucker Punch
- Low Kick

Basculegion @ Choice Scarf
Ability: Adaptability
Level: 50
SPs: 2 HP / 32 Atk / 32 Spe
Adamant Nature
- Wave Crash
- Last Respects
- Flip Turn
- Aqua Jet`
    },

    {
      id: 'hard_trick_room',
      name: 'Hard Trick Room (Farigiraf + Conkeldurr + Torkoal)',
      category: 'Trick Room',
      badgeColor: '#6a1b9a',
      description: 'Kompromissloser Bizarroraum mit Farigiraf Armor Tail, Guts-Meistagrif, Eruption-Qurtel und natsumewatos Kingambit.',
      paste: `Farigiraf @ Sitrus Berry
Ability: Armor Tail
Level: 50
SPs: 32 HP / 16 Def / 16 SpA / 2 SpD
Quiet Nature
IVs: 0 Spe
- Trick Room
- Psychic
- Dazzling Gleam
- Helping Hand

Conkeldurr @ Flame Orb
Ability: Guts
Level: 50
SPs: 32 HP / 32 Atk / 2 Def
Brave Nature
IVs: 0 Spe
- Drain Punch
- Mach Punch
- Facade
- Protect

Torkoal @ Charcoal
Ability: Drought
Level: 50
SPs: 32 HP / 32 SpA / 2 SpD
Quiet Nature
IVs: 0 Spe
- Eruption
- Heat Wave
- Earth Power
- Protect

Kingambit @ Chople Berry
Ability: Defiant
Level: 50
SPs: 32 HP / 32 Atk / 2 SpD
Brave Nature
IVs: 0 Spe
- Kowtow Cleave
- Iron Head
- Sucker Punch
- Low Kick

Sylveon @ Fairy Feather
Ability: Pixilate
Level: 50
SPs: 32 HP / 32 SpA / 2 SpD
Quiet Nature
IVs: 0 Spe
- Hyper Voice
- Quick Attack
- Shadow Ball
- Detect

Incineroar @ Safety Goggles
Ability: Intimidate
Level: 50
SPs: 32 HP / 14 Def / 20 SpD
Careful Nature
- Flare Blitz
- Darkest Lariat
- Fake Out
- Parting Shot`
    },

    {
      id: 'mega_garchomp_z',
      name: 'Special Dragon/Ground (Mega Garchomp Z + Volcarona)',
      category: 'Setup',
      badgeColor: '#303f9f',
      description: 'Neuzeitlicher Champions-Archetyp: Spezielles Mega-Knakrack Z (Power Gem / Erdkräfte) mit Falterreigen-Ramoth.',
      paste: `Garchomp @ Garchompite Z
Ability: Rough Skin
Level: 50
SPs: 2 HP / 32 SpA / 32 Spe
Modest Nature
- Power Gem
- Earth Power
- Dragon Pulse
- Protect

Volcarona @ Grassy Seed
Ability: Flame Body
Level: 50
SPs: 32 HP / 2 Def / 32 Spe
Modest Nature
- Quiver Dance
- Heat Wave
- Bug Buzz
- Protect

Rillaboom @ Miracle Seed
Ability: Grassy Surge
Level: 50
SPs: 32 HP / 32 Atk / 2 SpD
Adamant Nature
- Grassy Glide
- Wood Hammer
- Fake Out
- U-turn

Incineroar @ Sitrus Berry
Ability: Intimidate
Level: 50
SPs: 32 HP / 14 Def / 20 SpD
Careful Nature
- Flare Blitz
- Darkest Lariat
- Fake Out
- Parting Shot

Gholdengo @ Choice Specs
Ability: Good as Gold
Level: 50
SPs: 2 HP / 32 SpA / 32 Spe
Timid Nature
- Make It Rain
- Shadow Ball
- Thunderbolt
- Focus Blast

Farigiraf @ Colbur Berry
Ability: Armor Tail
Level: 50
SPs: 32 HP / 16 Def / 16 SpA / 2 SpD
Quiet Nature
- Trick Room
- Psychic
- Helping Hand
- Protect`
    },

    {
      id: 'mega_golisopod_rain',
      name: 'Rain & Pod Offense (Mega Golisopod + Pelipper)',
      category: 'Rain',
      badgeColor: '#0097a7',
      description: 'Beliebter Champions-Regen mit Mega-Tectass (Iron Head & Blutsauger), Archaludon und Grimmsnarl Screens.',
      paste: `Golisopod @ Golisopite
Ability: Emergency Exit
Level: 50
SPs: 32 HP / 32 Atk / 2 Spe
Adamant Nature
- Leech Life
- Iron Head
- Sucker Punch
- Protect

Pelipper @ Focus Sash
Ability: Drizzle
Level: 50
SPs: 32 HP / 10 SpA / 13 SpD / 11 Spe
Modest Nature
- Weather Ball
- Hurricane
- Tailwind
- Wide Guard

Archaludon @ Assault Vest
Ability: Stamina
Level: 50
SPs: 32 HP / 20 SpA / 14 SpD
Modest Nature
- Electro Shot
- Flash Cannon
- Draco Meteor
- Snarl

Sneasler @ White Herb
Ability: Unburden
Level: 50
SPs: 2 HP / 32 Atk / 32 Spe
Jolly Nature
- Close Combat
- Dire Claw
- Fake Out
- Protect

Basculegion @ Mystic Water
Ability: Adaptability
Level: 50
SPs: 2 HP / 32 Atk / 32 Spe
Adamant Nature
- Wave Crash
- Last Respects
- Aqua Jet
- Protect

Grimmsnarl @ Light Clay
Ability: Prankster
Level: 50
SPs: 32 HP / 18 Def / 16 SpD
Impish Nature
- Reflect
- Light Screen
- Spirit Break
- Parting Shot`
    },

    {
      id: 'contrary_staraptor',
      name: 'Contrary Tailwind (Mega Staraptor + Gholdengo)',
      category: 'Tailwind',
      badgeColor: '#5c6bc0',
      description: 'Ultraschnelle Hyper-Offense mit Mega-Staraptor (Umkehrung Nahkampf), Whimsicott, Arkani-Hisui und Milotic.',
      paste: `Staraptor @ Staraptite
Ability: Intimidate
Level: 50
SPs: 2 HP / 32 Atk / 32 Spe
Jolly Nature
- Close Combat
- Brave Bird
- Roost
- Protect

Gholdengo @ Choice Scarf
Ability: Good as Gold
Level: 50
SPs: 2 HP / 32 SpA / 32 Spe
Timid Nature
- Make It Rain
- Shadow Ball
- Trick
- Focus Blast

Whimsicott @ Focus Sash
Ability: Prankster
Level: 50
SPs: 2 HP / 32 SpA / 32 Spe
Timid Nature
- Tailwind
- Moonblast
- Encore
- Helping Hand

Arcanine-Hisui @ Choice Band
Ability: Rock Head
Level: 50
SPs: 2 HP / 32 Atk / 32 Spe
Jolly Nature
- Head Smash
- Flare Blitz
- Extreme Speed
- Close Combat

Milotic @ Leftovers
Ability: Competitive
Level: 50
SPs: 32 HP / 32 Def / 2 SpD
Bold Nature
- Scald
- Ice Beam
- Recover
- Protect

Rillaboom @ Miracle Seed
Ability: Grassy Surge
Level: 50
SPs: 32 HP / 32 Atk / 2 SpD
Adamant Nature
- Grassy Glide
- Wood Hammer
- Fake Out
- Protect`
    },

    {
      id: 'shadow_tag_gengar',
      name: 'Shadow Tag Trap (Mega Gengar + Kommo-o)',
      category: 'Setup',
      badgeColor: '#4a148c',
      description: 'Taktisches Auswechsel-Verbot mit Mega-Gengar Wegsperre, Clangorous-Soul-Grandiras und Regen-Support.',
      paste: `Gengar @ Gengarite
Ability: Cursed Body
Level: 50
SPs: 2 HP / 32 SpA / 32 Spe
Timid Nature
- Shadow Ball
- Sludge Bomb
- Will-O-Wisp
- Protect

Kommo-o @ Leftovers
Ability: Overcoat
Level: 50
SPs: 32 HP / 2 Def / 32 Spe
Modest Nature
- Clangorous Soul
- Clanging Scales
- Body Press
- Protect

Incineroar @ Sitrus Berry
Ability: Intimidate
Level: 50
SPs: 32 HP / 14 Def / 20 SpD
Careful Nature
- Flare Blitz
- Darkest Lariat
- Fake Out
- Parting Shot

Rillaboom @ Assault Vest
Ability: Grassy Surge
Level: 50
SPs: 32 HP / 32 Atk / 2 SpD
Adamant Nature
- Grassy Glide
- Wood Hammer
- Fake Out
- U-turn

Politoed @ Choice Scarf
Ability: Drizzle
Level: 50
SPs: 2 HP / 32 SpA / 32 Spe
Timid Nature
- Weather Ball
- Muddy Water
- Ice Beam
- Helping Hand

Clefable @ Rocky Helmet
Ability: Unaware
Level: 50
SPs: 32 HP / 32 Def / 2 SpD
Bold Nature
- Moonblast
- Follow Me
- Moonlight
- Protect`
    }
  ];

  if (typeof window !== 'undefined') {
    window.META_ARCHETYPES = ARCHETYPES;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = ARCHETYPES;
  }
})();

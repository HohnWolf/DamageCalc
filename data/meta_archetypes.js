// Archetypische Champions-Teams für den Headless Matchup-Tester.
// Format: [Gen 9 Champions] VGC 2026 Reg M-C (Level 50, Doppelkampf)
// SPs (Stat Points): Maximal 32 je Wert, genau 66 Stat Points gesamt.

(function () {
  'use strict';

  var ARCHETYPES = [
    {
      id: 'mega_charizard_sun',
      name: 'Sun Offense (Mega Charizard Y)',
      category: 'Sun',
      badgeColor: '#e65100',
      description: 'Schneller Sonnen-Druck mit Mega-Glurak Y, Torkoal und Chlorophyll-Speed-Control.',
      paste: `Charizard-Mega-Y @ Charizardite Y
Ability: Drought
Level: 50
SPs: 30 SpA / 4 SpD / 32 Spe
Timid Nature
- Heat Wave
- Solar Beam
- Weather Ball
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

Lilligant-Hisui @ Focus Sash
Ability: Chlorophyll
Level: 50
SPs: 32 Atk / 2 SpD / 32 Spe
Jolly Nature
- Close Combat
- Solar Blade
- After You
- Protect

Flutter Mane @ Booster Energy
Ability: Protosynthesis
Level: 50
SPs: 15 HP / 19 SpA / 32 Spe
Timid Nature
- Moonblast
- Shadow Ball
- Dazzling Gleam
- Protect

Roaring Moon @ Life Orb
Ability: Protosynthesis
Level: 50
SPs: 32 Atk / 2 SpD / 32 Spe
Jolly Nature
- Knock Off
- Acrobatics
- Tailwind
- Protect

Landorus-Therian @ Choice Scarf
Ability: Intimidate
Level: 50
SPs: 32 Atk / 2 SpD / 32 Spe
Adamant Nature
- Earthquake
- Rock Slide
- U-turn
- Stomping Tantrum`
    },

    {
      id: 'mega_feraligatr_rain',
      name: 'Rain Offense (Mega Feraligatr)',
      category: 'Rain',
      badgeColor: '#0288d1',
      description: 'Wuchtiger Regen mit Mega-Impergator (Dragonize), Pelipper und Archaludon.',
      paste: `Feraligatr-Mega @ Feraligite
Ability: Dragonize
Level: 50
SPs: 32 Atk / 2 Def / 32 Spe
Adamant Nature
- Liquidation
- Return
- Crunch
- Protect

Pelipper @ Focus Sash
Ability: Drizzle
Level: 50
SPs: 32 HP / 30 SpA / 4 SpD
Modest Nature
- Muddy Water
- Hurricane
- Tailwind
- Protect

Archaludon @ Assault Vest
Ability: Stamina
Level: 50
SPs: 32 HP / 20 SpA / 14 SpD
Modest Nature
- Electro Shot
- Draco Meteor
- Flash Cannon
- Body Press

Urshifu-Rapid-Strike @ Mystic Water
Ability: Unseen Fist
Level: 50
SPs: 32 Atk / 2 SpD / 32 Spe
Jolly Nature
- Surging Strikes
- Close Combat
- Aqua Jet
- Detect

Rillaboom @ Miracle Seed
Ability: Grassy Surge
Level: 50
SPs: 32 HP / 32 Atk / 2 SpD
Adamant Nature
- Grassy Glide
- Wood Hammer
- Fake Out
- U-turn

Raichu-Alola @ Life Orb
Ability: Surge Surfer
Level: 50
SPs: 32 SpA / 2 SpD / 32 Spe
Timid Nature
- Thunderbolt
- Psychic
- Volt Switch
- Protect`
    },

    {
      id: 'hard_trick_room',
      name: 'Hard Trick Room (Ursaluna + Farigiraf)',
      category: 'Trick Room',
      badgeColor: '#6a1b9a',
      description: 'Konsequenter Bizarroraum mit Farigiraf (Armor Tail) und extrem hohem Durchschlag.',
      paste: `Farigiraf @ Mental Herb
Ability: Armor Tail
Level: 50
SPs: 32 HP / 18 Def / 16 SpD
Quiet Nature
IVs: 0 Spe
- Trick Room
- Hyper Voice
- Psychic
- Helping Hand

Ursaluna-Bloodmoon @ Life Orb
Ability: Mind's Eye
Level: 50
SPs: 32 HP / 32 SpA / 2 SpD
Quiet Nature
IVs: 0 Spe
- Blood Moon
- Earth Power
- Hyper Voice
- Protect

Torkoal @ Charcoal
Ability: Drought
Level: 50
SPs: 32 HP / 32 SpA / 2 SpD
Quiet Nature
IVs: 0 Spe
- Eruption
- Heat Wave
- Solar Beam
- Protect

Kingambit @ Black Glasses
Ability: Defiant
Level: 50
SPs: 32 HP / 32 Atk / 2 SpD
Brave Nature
IVs: 0 Spe
- Kowtow Cleave
- Sucker Punch
- Iron Head
- Protect

Camerupt-Mega @ Cameruptite
Ability: Sheer Force
Level: 50
SPs: 32 HP / 32 SpA / 2 SpD
Quiet Nature
IVs: 0 Spe
- Heat Wave
- Earth Power
- Ancient Power
- Protect

Dusclops @ Eviolite
Ability: Frisk
Level: 50
SPs: 32 HP / 17 Def / 17 SpD
Relaxed Nature
IVs: 0 Spe
- Trick Room
- Night Shade
- Will-O-Wisp
- Pain Split`
    },

    {
      id: 'mega_dragonite_tailwind',
      name: 'Tailwind Balance (Mega Dragonite)',
      category: 'Tailwind',
      badgeColor: '#2e7d32',
      description: 'Aggressive Tailwind-Präsenz mit Mega-Dragoran, Elfun und Gholdengo.',
      paste: `Dragonite-Mega @ Dragoninite
Ability: Multiscale
Level: 50
SPs: 2 HP / 32 Atk / 32 Spe
Jolly Nature
- Extreme Speed
- Dragon Claw
- Aerial Ace
- Protect

Whimsicott @ Focus Sash
Ability: Prankster
Level: 50
SPs: 32 HP / 2 SpA / 32 Spe
Timid Nature
- Tailwind
- Moonblast
- Encore
- Protect

Incineroar @ Sitrus Berry
Ability: Intimidate
Level: 50
SPs: 32 HP / 20 Def / 14 SpD
Careful Nature
- Fake Out
- Knock Off
- Flare Blitz
- Parting Shot

Gholdengo @ Choice Specs
Ability: Good as Gold
Level: 50
SPs: 32 SpA / 2 SpD / 32 Spe
Timid Nature
- Make It Rain
- Shadow Ball
- Thunderbolt
- Trick

Urshifu-Rapid-Strike @ Mystic Water
Ability: Unseen Fist
Level: 50
SPs: 32 Atk / 2 SpD / 32 Spe
Jolly Nature
- Surging Strikes
- Close Combat
- Aqua Jet
- Detect

Rillaboom @ Assault Vest
Ability: Grassy Surge
Level: 50
SPs: 32 HP / 32 Atk / 2 SpD
Adamant Nature
- Grassy Glide
- Wood Hammer
- High Horsepower
- Fake Out`
    },

    {
      id: 'mega_clefable_balance',
      name: 'Fairy Balance (Mega Clefable)',
      category: 'Balance',
      badgeColor: '#ad1457',
      description: 'Flexibles Wechselspiel mit Mega-Pixi (Magic Bounce) und defensiven Säulen.',
      paste: `Clefable-Mega @ Clefablite
Ability: Magic Bounce
Level: 50
SPs: 32 HP / 14 Def / 20 SpA
Modest Nature
- Moonblast
- Air Slash
- Follow Me
- Protect

Incineroar @ Sitrus Berry
Ability: Intimidate
Level: 50
SPs: 32 HP / 20 Def / 14 SpD
Careful Nature
- Fake Out
- Knock Off
- Flare Blitz
- Parting Shot

Amoonguss @ Rocky Helmet
Ability: Regenerator
Level: 50
SPs: 32 HP / 20 Def / 14 SpD
Bold Nature
- Spore
- Pollen Puff
- Rage Powder
- Protect

Archaludon @ Assault Vest
Ability: Stamina
Level: 50
SPs: 32 HP / 20 SpA / 14 SpD
Modest Nature
- Flash Cannon
- Draco Meteor
- Body Press
- Thunderbolt

Urshifu @ Choice Band
Ability: Unseen Fist
Level: 50
SPs: 32 Atk / 2 SpD / 32 Spe
Jolly Nature
- Wicked Blow
- Close Combat
- Sucker Punch
- U-turn

Landorus-Therian @ Choice Scarf
Ability: Intimidate
Level: 50
SPs: 32 Atk / 2 SpD / 32 Spe
Adamant Nature
- Earthquake
- Rock Slide
- U-turn
- Stomping Tantrum`
    },

    {
      id: 'psyspam_ho',
      name: 'Psyspam Hyper Offense',
      category: 'Psyspam',
      badgeColor: '#c2185b',
      description: 'Psychic Surge Schutz vor Priorität gepaart mit Expanding Force und Mega-Alakazam.',
      paste: `Alakazam-Mega @ Alakazite
Ability: Trace
Level: 50
SPs: 32 SpA / 2 SpD / 32 Spe
Timid Nature
- Expanding Force
- Focus Blast
- Shadow Ball
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

Armarouge @ Life Orb
Ability: Flash Fire
Level: 50
SPs: 32 HP / 32 SpA / 2 SpD
Quiet Nature
IVs: 0 Spe
- Expanding Force
- Armor Cannon
- Trick Room
- Wide Guard

Gallade-Mega @ Galladite
Ability: Inner Focus
Level: 50
SPs: 32 Atk / 2 SpD / 32 Spe
Jolly Nature
- Sacred Sword
- Psycho Cut
- Wide Guard
- Protect

Sneasler @ Focus Sash
Ability: Unburden
Level: 50
SPs: 32 Atk / 2 SpD / 32 Spe
Jolly Nature
- Dire Claw
- Close Combat
- Fake Out
- Protect

Urshifu-Rapid-Strike @ Mystic Water
Ability: Unseen Fist
Level: 50
SPs: 32 Atk / 2 SpD / 32 Spe
Jolly Nature
- Surging Strikes
- Close Combat
- Aqua Jet
- Detect`
    },

    {
      id: 'mega_skarmory_defense',
      name: 'Hazard & Fortress (Mega Skarmory)',
      category: 'Defense',
      badgeColor: '#455a64',
      description: 'Extrem zähes Team mit Mega-Panzaeron, Ding-Lu und Dondozo-Wall.',
      paste: `Skarmory-Mega @ Skarmorite
Ability: Sturdy
Level: 50
SPs: 32 HP / 2 Def / 32 SpD
Careful Nature
- Iron Head
- Body Press
- Roost
- Protect

Ting-Lu @ Leftovers
Ability: Vessel of Ruin
Level: 50
SPs: 32 HP / 2 Atk / 32 SpD
Careful Nature
- Stomping Tantrum
- Ruination
- Heavy Slam
- Protect

Dondozo @ Sitrus Berry
Ability: Unaware
Level: 50
SPs: 32 HP / 20 Atk / 14 SpD
Adamant Nature
- Wave Crash
- Order Up
- Heavy Slam
- Protect

Tatsugiri @ Choice Scarf
Ability: Commander
Level: 50
SPs: 32 SpA / 2 SpD / 32 Spe
Timid Nature
- Draco Meteor
- Muddy Water
- Icy Wind
- Sleep Talk

Heatran @ Life Orb
Ability: Flash Fire
Level: 50
SPs: 32 HP / 32 SpA / 2 SpD
Modest Nature
- Heat Wave
- Earth Power
- Flash Cannon
- Protect

Amoonguss @ Rocky Helmet
Ability: Regenerator
Level: 50
SPs: 32 HP / 20 Def / 14 SpD
Bold Nature
- Spore
- Pollen Puff
- Rage Powder
- Protect`
    },

    {
      id: 'mega_baxcalibur_snow',
      name: 'Snow & Priority (Mega Baxcalibur)',
      category: 'Snow',
      badgeColor: '#0097a7',
      description: 'Schneesturm mit Mega-Espinodon, Alola-Vulnona und Chien-Pao.',
      paste: `Baxcalibur-Mega @ Baxcalibrite
Ability: Thermal Exchange
Level: 50
SPs: 32 Atk / 2 SpD / 32 Spe
Jolly Nature
- Glaive Rush
- Icicle Crash
- Ice Shard
- Protect

Ninetales-Alola @ Light Clay
Ability: Snow Warning
Level: 50
SPs: 32 HP / 2 SpD / 32 Spe
Timid Nature
- Aurora Veil
- Blizzard
- Moonblast
- Protect

Chien-Pao @ Focus Sash
Ability: Sword of Ruin
Level: 50
SPs: 32 Atk / 2 SpD / 32 Spe
Jolly Nature
- Icicle Crash
- Sucker Punch
- Sacred Sword
- Protect

Ogerpon-Hearthflame @ Hearthflame Mask
Ability: Mold Breaker
Level: 50
SPs: 32 Atk / 2 SpD / 32 Spe
Jolly Nature
- Ivy Cudgel
- Horn Leech
- Spiky Shield
- Follow Me

Urshifu-Rapid-Strike @ Mystic Water
Ability: Unseen Fist
Level: 50
SPs: 32 Atk / 2 SpD / 32 Spe
Jolly Nature
- Surging Strikes
- Close Combat
- Aqua Jet
- Detect

Gholdengo @ Choice Specs
Ability: Good as Gold
Level: 50
SPs: 32 SpA / 2 SpD / 32 Spe
Timid Nature
- Make It Rain
- Shadow Ball
- Thunderbolt
- Focus Blast`
    }
  ];

  if (typeof window !== 'undefined') {
    window.META_ARCHETYPES = ARCHETYPES;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = ARCHETYPES;
  }
})();

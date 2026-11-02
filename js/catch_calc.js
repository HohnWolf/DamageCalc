// Fangrechner (Catch Calculator) für alle Pokémon-Hauptspiele (Gen 1 bis Gen 9) nach Vorbild von Dragonfly Cave.
// Unterstützt exakte Generations-Formeln (RBY, GSC, Gen 3/4, Gen 5, Gen 6/7, Gen 8 SwSh/BDSP, Gen 9 SV),
// Berechnung über alle 32 KP-IVs (bzw. 16 KP-DVs in Gen 1/2), Kritische Fänge, Orden-Level-Caps,
// Fangkraft (Entralink / O-Kraft / Rotom-Fang / Sandwich) und einen Live-Vergleich aller Pokébälle des jeweiligen Spiels.
(function () {
  'use strict';
  var A = window.CC;
  if (!A) return;
  var el = A.el;
  var de = A.LANG === 'de';

  // Showdown itemicons-sheet.png (24x24, 16 pro Zeile) Zellen-Indizes für Pokébälle
  var BALL_SPRITE = {
    pokeball: 345, greatball: 174, ultraball: 521, masterball: 276, safariball: 425,
    fastball: 137, levelball: 246, lureball: 264, heavyball: 194, loveball: 258,
    friendball: 153, moonball: 294, sportball: 465, parkball: 325, netball: 304,
    diveball: 101, nestball: 303, repeatball: 401, timerball: 494, luxuryball: 266,
    premierball: 363, duskball: 115, healball: 188, quickball: 372, cherishball: 64,
    dreamball: 111, beastball: 661, strangeball: 308
  };

  function ballIconHtml(ballId) {
    var n = BALL_SPRITE[ballId];
    if (n == null) return '<span class="item-ic"></span>';
    var c = n % 16, r = Math.floor(n / 16);
    return '<span class="item-ic has" style="--c:' + c + ';--r:' + r + '"></span>';
  }

  // Hauptspiele von Generation 1 bis Generation 9
  var GAMES = [
    { id: 'rby',  gen: 1, maxDex: 151, nameDe: 'Rot / Blau / Gelb',                   nameEn: 'Red / Blue / Yellow',                groupDe: 'Gen 1 · Kanto',   groupEn: 'Gen 1 · Kanto' },
    { id: 'gsc',  gen: 2, maxDex: 251, nameDe: 'Gold / Silber / Kristall',            nameEn: 'Gold / Silver / Crystal',            groupDe: 'Gen 2 · Johto',   groupEn: 'Gen 2 · Johto' },
    { id: 'rse',  gen: 3, maxDex: 386, nameDe: 'Rubin / Saphir / Smaragd',            nameEn: 'Ruby / Sapphire / Emerald',          groupDe: 'Gen 3 · GBA',     groupEn: 'Gen 3 · GBA' },
    { id: 'frlg', gen: 3, maxDex: 386, nameDe: 'Feuerrot / Blattgrün',                nameEn: 'FireRed / LeafGreen',                groupDe: 'Gen 3 · GBA',     groupEn: 'Gen 3 · GBA' },
    { id: 'dp',   gen: 4, maxDex: 493, nameDe: 'Diamant / Perl',                      nameEn: 'Diamond / Pearl',                    groupDe: 'Gen 4 · DS',      groupEn: 'Gen 4 · DS' },
    { id: 'pt',   gen: 4, maxDex: 493, nameDe: 'Platin',                              nameEn: 'Platinum',                           groupDe: 'Gen 4 · DS',      groupEn: 'Gen 4 · DS' },
    { id: 'hgss', gen: 4, maxDex: 493, nameDe: 'HeartGold / SoulSilver',              nameEn: 'HeartGold / SoulSilver',             groupDe: 'Gen 4 · DS',      groupEn: 'Gen 4 · DS' },
    { id: 'bw',   gen: 5, maxDex: 649, nameDe: 'Schwarz / Weiß',                      nameEn: 'Black / White',                      groupDe: 'Gen 5 · Einall',  groupEn: 'Gen 5 · Unova' },
    { id: 'b2w2', gen: 5, maxDex: 649, nameDe: 'Schwarz 2 / Weiß 2',                  nameEn: 'Black 2 / White 2',                  groupDe: 'Gen 5 · Einall',  groupEn: 'Gen 5 · Unova' },
    { id: 'xy',   gen: 6, maxDex: 721, nameDe: 'X / Y',                               nameEn: 'X / Y',                              groupDe: 'Gen 6 · 3DS',     groupEn: 'Gen 6 · 3DS' },
    { id: 'oras', gen: 6, maxDex: 721, nameDe: 'Omega Rubin / Alpha Saphir',          nameEn: 'Omega Ruby / Alpha Sapphire',        groupDe: 'Gen 6 · 3DS',     groupEn: 'Gen 6 · 3DS' },
    { id: 'sm',   gen: 7, maxDex: 802, nameDe: 'Sonne / Mond',                        nameEn: 'Sun / Moon',                         groupDe: 'Gen 7 · Alola',   groupEn: 'Gen 7 · Alola' },
    { id: 'usum', gen: 7, maxDex: 807, nameDe: 'Ultrasonne / Ultramond',              nameEn: 'Ultra Sun / Ultra Moon',             groupDe: 'Gen 7 · Alola',   groupEn: 'Gen 7 · Alola' },
    { id: 'swsh', gen: 8, maxDex: 898, nameDe: 'Schwert / Schild',                    nameEn: 'Sword / Shield',                     groupDe: 'Gen 8 · Switch',  groupEn: 'Gen 8 · Switch' },
    { id: 'bdsp', gen: 8, maxDex: 493, nameDe: 'Strahlender Diamant / Leuchtende Perle', nameEn: 'Brilliant Diamond / Shining Pearl', groupDe: 'Gen 8 · Switch',  groupEn: 'Gen 8 · Switch' },
    { id: 'sv',   gen: 9, maxDex: 1025, nameDe: 'Karmesin / Purpur',                  nameEn: 'Scarlet / Violet',                   groupDe: 'Gen 9 · Paldea',  groupEn: 'Gen 9 · Paldea' }
  ];

  var GAME_MAP = {};
  GAMES.forEach(function (g) { GAME_MAP[g.id] = g; });

  // Spielspezifische Fangraten-Abweichungen gegenüber PokeAPI-Standard
  var GAME_CATCH_RATES = {
    382: { rse: 5, frlg: 5, dp: 5, pt: 5, hgss: 5, bw: 5, b2w2: 5, xy: 5, oras: 3, sm: 3, usum: 3, swsh: 3, bdsp: 3, sv: 3 }, // Kyogre
    383: { rse: 5, frlg: 5, dp: 5, pt: 5, hgss: 5, bw: 5, b2w2: 5, xy: 5, oras: 3, sm: 3, usum: 3, swsh: 3, bdsp: 3, sv: 3 }, // Groudon
    384: { oras: 45 }, // Rayquaza (ORAS Story: 45, sonst 3)
    441: { dp: 30, pt: 30, hgss: 30 }, // Plaudagei (Gen 4: 30, ab Gen 5: 45)
    483: { dp: 30, bdsp: 30, pt: 3, hgss: 3, bw: 3, b2w2: 3, xy: 3, oras: 3, sm: 3, usum: 3, swsh: 3, sv: 3 }, // Dialga
    484: { dp: 30, bdsp: 30, pt: 3, hgss: 3, bw: 3, b2w2: 3, xy: 3, oras: 3, sm: 3, usum: 3, swsh: 3, sv: 3 }, // Palkia
    643: { bw: 45, b2w2: 45, xy: 45, oras: 3, sm: 3, usum: 3, swsh: 3, sv: 3 }, // Reshiram
    644: { bw: 45, b2w2: 45, xy: 45, oras: 3, sm: 3, usum: 3, swsh: 3, sv: 3 }, // Zekrom
    716: { xy: 45, oras: 45, sm: 45, usum: 3, swsh: 3 }, // Xerneas
    717: { xy: 45, oras: 45, sm: 45, usum: 3, swsh: 3 }, // Yveltal
    791: { sm: 45, usum: 3, swsh: 3, sv: 3 }, // Solgaleo
    792: { sm: 45, usum: 3, swsh: 3, sv: 3 }, // Lunala
    800: { sm: 3, usum: 255, swsh: 3, sv: 3 }, // Necrozma
    888: { swsh: 10 }, // Zacian
    889: { swsh: 10 }, // Zamazenta
    890: { swsh: 255 } // Endynalos
  };

  // Mondstein-Entwicklungsfamilien (für Mondball)
  var MOON_STONE_FAM = {
    29: 1, 30: 1, 31: 1, 32: 1, 33: 1, 34: 1, // Nidoran♀/♂-Reihe
    35: 1, 36: 1, 173: 1,                     // Piepi-Reihe
    39: 1, 40: 1, 174: 1,                     // Pummeluff-Reihe
    300: 1, 301: 1,                           // Eneco-Reihe
    517: 1, 518: 1                            // Somniam-Reihe
  };

  // Ultrabestien (für Ultraball / Beast Ball)
  var ULTRA_BEASTS = {
    793: 1, 794: 1, 795: 1, 796: 1, 797: 1, 798: 1, 799: 1,
    803: 1, 804: 1, 805: 1, 806: 1
  };

  // GSC Turboball Bug: nur Magnetilo (81), Sleima (88) und Tangela (114) erhalten 4x
  var GSC_FAST_BUG_MONS = { 81: 1, 88: 1, 114: 1 };
  // GSC Turboball beabsichtigte Liste (alle 19 fliehenden Pokémon in GSC)
  var GSC_FAST_INTENDED = {
    63: 1, 81: 1, 88: 1, 114: 1, 122: 1, 137: 1, 147: 1, 148: 1, 175: 1,
    187: 1, 190: 1, 200: 1, 206: 1, 209: 1, 231: 1, 234: 1, 243: 1, 244: 1, 245: 1
  };

  // Pokébälle mit Namen, Beschreibung und Verfügbarkeit pro Spiel
  var BALLS = [
    { id: 'pokeball',    nameDe: 'Pokéball',      nameEn: 'Poké Ball',    games: 'all', descDe: 'Standard-Fangrate (×1)', descEn: 'Standard catch rate (×1)' },
    { id: 'greatball',   nameDe: 'Superball',     nameEn: 'Great Ball',   games: 'all', descDe: 'Erhöhte Fangrate (×1,5)', descEn: '1.5× catch rate' },
    { id: 'ultraball',   nameDe: 'Hyperball',     nameEn: 'Ultra Ball',   games: 'all', descDe: 'Hohe Fangrate (×2)', descEn: '2× catch rate' },
    { id: 'masterball',  nameDe: 'Meisterball',   nameEn: 'Master Ball',  games: 'all', descDe: 'Fängt jedes Pokémon garantiert (100 %)', descEn: 'Guaranteed capture (100%)' },
    { id: 'safariball',  nameDe: 'Safariball',    nameEn: 'Safari Ball',  games: ['rby', 'rse', 'frlg', 'dp', 'pt', 'hgss', 'swsh', 'bdsp', 'sv'], descDe: 'Safari-Ball (×1,5; in RBY wie Hyperball)', descEn: 'Safari Ball (1.5×; Ultra Ball in RBY)' },
    { id: 'fastball',    nameDe: 'Turboball',     nameEn: 'Fast Ball',    games: ['gsc', 'hgss', 'sm', 'usum', 'swsh', 'bdsp', 'sv'], descDe: '×4 wenn Basis-Initiative ≥ 100 (GSC: fliehende Pokémon)', descEn: '4× if base Speed ≥ 100 (GSC: fleeing Pokémon)' },
    { id: 'levelball',   nameDe: 'Levelball',     nameEn: 'Level Ball',   games: ['gsc', 'hgss', 'sm', 'usum', 'swsh', 'bdsp', 'sv'], descDe: '×2 / ×4 / ×8 je nach eigenem Level im Vergleich zum Ziel', descEn: '2× / 4× / 8× based on your level vs wild level' },
    { id: 'lureball',    nameDe: 'Köderball',     nameEn: 'Lure Ball',    games: ['gsc', 'hgss', 'sm', 'usum', 'swsh', 'bdsp', 'sv'], descDe: 'Beim Angeln ×3 (GSC/HGSS), ×5 (Gen 7) bzw. ×4 (Gen 8–9)', descEn: 'When fishing: 3× (GSC/HGSS), 5× (Gen 7), 4× (Gen 8–9)' },
    { id: 'heavyball',   nameDe: 'Schwerball',    nameEn: 'Heavy Ball',   games: ['gsc', 'hgss', 'sm', 'usum', 'swsh', 'bdsp', 'sv'], descDe: 'Addiert −20 bis +30/+40 zur Fangrate je nach Gewicht', descEn: 'Adds −20 to +30/+40 to catch rate based on weight' },
    { id: 'loveball',    nameDe: 'Sympaball',     nameEn: 'Love Ball',    games: ['gsc', 'hgss', 'sm', 'usum', 'swsh', 'bdsp', 'sv'], descDe: '×8 bei gleicher Art & anderem Geschlecht', descEn: '8× if same species and opposite gender' },
    { id: 'friendball',  nameDe: 'Freundesball',  nameEn: 'Friend Ball',  games: ['gsc', 'hgss', 'sm', 'usum', 'swsh', 'bdsp', 'sv'], descDe: 'Standard-Fangrate (×1), setzt Zutraulichkeit hoch', descEn: '1× catch rate, boosts base friendship' },
    { id: 'moonball',    nameDe: 'Mondball',      nameEn: 'Moon Ball',    games: ['gsc', 'hgss', 'sm', 'usum', 'swsh', 'bdsp', 'sv'], descDe: '×4 bei Mondstein-Entwicklungsreihen', descEn: '4× on Moon Stone evolution families' },
    { id: 'sportball',   nameDe: 'Turnierball',   nameEn: 'Sport Ball',   games: ['gsc', 'hgss', 'swsh', 'sv'], descDe: 'Käferturnier-Ball (×1,5)', descEn: 'Bug-Catching Contest ball (1.5×)' },
    { id: 'netball',     nameDe: 'Netzball',      nameEn: 'Net Ball',     games: ['rse', 'frlg', 'dp', 'pt', 'hgss', 'bw', 'b2w2', 'xy', 'oras', 'sm', 'usum', 'swsh', 'bdsp', 'sv'], descDe: 'Bei Käfer- oder Wasser-Typ: ×3 (Gen 3–6) bzw. ×3,5 (Gen 7–9)', descEn: 'Bug or Water type: 3× (Gen 3–6) or 3.5× (Gen 7–9)' },
    { id: 'diveball',    nameDe: 'Tauchball',     nameEn: 'Dive Ball',    games: ['rse', 'frlg', 'dp', 'pt', 'hgss', 'bw', 'b2w2', 'xy', 'oras', 'sm', 'usum', 'swsh', 'bdsp', 'sv'], descDe: '×3,5 unter Wasser (RSE/ORAS) bzw. beim Surfen/Angeln', descEn: '3.5× underwater (RSE/ORAS) or while surfing/fishing' },
    { id: 'nestball',    nameDe: 'Nestball',      nameEn: 'Nest Ball',    games: ['rse', 'frlg', 'dp', 'pt', 'hgss', 'bw', 'b2w2', 'xy', 'oras', 'sm', 'usum', 'swsh', 'bdsp', 'sv'], descDe: 'Bis zu ×4 bei niedrigem Level (unter Lv. 30)', descEn: 'Up to 4× on low-level Pokémon (under Lv. 30)' },
    { id: 'repeatball',  nameDe: 'Wiederball',    nameEn: 'Repeat Ball',  games: ['rse', 'frlg', 'dp', 'pt', 'hgss', 'bw', 'b2w2', 'xy', 'oras', 'sm', 'usum', 'swsh', 'bdsp', 'sv'], descDe: 'Bereits im Pokédex gefangen: ×3 (Gen 3–6) bzw. ×3,5 (Gen 7–9)', descEn: 'Already registered as caught: 3× (Gen 3–6) or 3.5× (Gen 7–9)' },
    { id: 'timerball',   nameDe: 'Timerball',     nameEn: 'Timer Ball',   games: ['rse', 'frlg', 'dp', 'pt', 'hgss', 'bw', 'b2w2', 'xy', 'oras', 'sm', 'usum', 'swsh', 'bdsp', 'sv'], descDe: 'Steigt mit jeder Runde bis max. ×4 (ab Runde 11 in Gen 5+, Runde 31 in Gen 3–4)', descEn: 'Increases each turn up to 4× (Turn 11+ in Gen 5+, Turn 31+ in Gen 3–4)' },
    { id: 'luxuryball',  nameDe: 'Luxusball',     nameEn: 'Luxury Ball',  games: ['rse', 'frlg', 'dp', 'pt', 'hgss', 'bw', 'b2w2', 'xy', 'oras', 'sm', 'usum', 'swsh', 'bdsp', 'sv'], descDe: 'Standard-Fangrate (×1)', descEn: '1× catch rate' },
    { id: 'premierball', nameDe: 'Premierball',   nameEn: 'Premier Ball', games: ['rse', 'frlg', 'dp', 'pt', 'hgss', 'bw', 'b2w2', 'xy', 'oras', 'sm', 'usum', 'swsh', 'bdsp', 'sv'], descDe: 'Standard-Fangrate (×1)', descEn: '1× catch rate' },
    { id: 'duskball',    nameDe: 'Finsterball',   nameEn: 'Dusk Ball',    games: ['dp', 'pt', 'hgss', 'bw', 'b2w2', 'xy', 'oras', 'sm', 'usum', 'swsh', 'bdsp', 'sv'], descDe: 'Nachts oder in Höhlen: ×3,5 (Gen 4–6) bzw. ×3 (Gen 7–9)', descEn: 'At night or in caves: 3.5× (Gen 4–6) or 3× (Gen 7–9)' },
    { id: 'quickball',   nameDe: 'Flottball',     nameEn: 'Quick Ball',   games: ['dp', 'pt', 'hgss', 'bw', 'b2w2', 'xy', 'oras', 'sm', 'usum', 'swsh', 'bdsp', 'sv'], descDe: 'In Runde 1: ×4 (Gen 4) bzw. ×5 (Gen 5–9)', descEn: 'On Turn 1: 4× (Gen 4) or 5× (Gen 5–9)' },
    { id: 'healball',    nameDe: 'Heilball',      nameEn: 'Heal Ball',    games: ['dp', 'pt', 'hgss', 'bw', 'b2w2', 'xy', 'oras', 'sm', 'usum', 'swsh', 'bdsp', 'sv'], descDe: 'Standard-Fangrate (×1)', descEn: '1× catch rate' },
    { id: 'dreamball',   nameDe: 'Traumball',     nameEn: 'Dream Ball',   games: ['bw', 'b2w2', 'swsh', 'sv'], descDe: 'Gen 8–9: ×4 wenn Ziel schläft (Gen 5 Kontaktebenenhain: 100 %)', descEn: 'Gen 8–9: 4× if target is asleep (Gen 5 Entree Forest: 100%)' },
    { id: 'beastball',   nameDe: 'Ultraball',     nameEn: 'Beast Ball',   games: ['sm', 'usum', 'swsh', 'sv'], descDe: '×5 bei Ultrabestien, ×0,1 bei allen anderen Pokémon', descEn: '5× on Ultra Beasts, 0.1× on all other Pokémon' }
  ];

  var BALL_MAP = {};
  BALLS.forEach(function (b) { BALL_MAP[b.id] = b; });

  function ballsForGame(gameId) {
    return BALLS.filter(function (b) {
      return b.games === 'all' || b.games.indexOf(gameId) !== -1;
    });
  }

  // Standard-Zustand laden/speichern
  var DEFAULTS = {
    game: 'swsh',
    dexId: 483,        // Dialga / Legendäres Beispiel oder beliebiges Pokémon
    customRate: '',    // Leer = automatische Spiel-Fangrate
    level: 60,
    hpMode: 'pct',     // 'pct' | 'exact'
    hpPct: 100,
    falseSwipe: false, // 1 KP (Trugschlag)
    curHP: 150,
    maxHP: 150,
    status: 'none',    // 'none' | 'sleep' | 'para'
    ball: 'ultraball',
    turn: 1,
    caughtBefore: false,
    darkCave: false,
    water: false,
    fishing: false,
    underwater: false,
    ourLevel: 60,
    sameSpeciesOppositeGender: false,
    gscFixBugs: false,
    // Gen 5+
    darkGrass: false,
    dexCaughtTier: 5,  // 0..5 (>600)
    catchingCharm: false,
    powerMod: 0,       // 0=Aus, 1=Stufe 1, 2=Stufe 2, 3=Stufe 3 / S / MAX / Rotom
    // Gen 8 / 9
    unaware: 'normal', // 'normal' | 'unaware' | 'wanderer'
    badges: 8          // 0..8
  };

  var st = A.load('cc_catch', null) || {};
  Object.keys(DEFAULTS).forEach(function (k) {
    if (st[k] === undefined) st[k] = DEFAULTS[k];
  });
  function saveState() { A.save('cc_catch', st); }

  // Pokémon-Daten aus NATDEX & CATCH_DATA lesen
  function getMonInfo(dexId, gameId) {
    var nd = (window.NATDEX && window.NATDEX[dexId]) || ['rattata', 'Rattata', 'Rattfratz', ['Normal'], 3.5];
    var cd = (window.CATCH_DATA && window.CATCH_DATA[dexId]) || [255, 30, 72, 4];
    var baseRate = cd[0];
    var over = GAME_CATCH_RATES[dexId] && GAME_CATCH_RATES[dexId][gameId];
    var effectiveRate = over != null ? over : baseRate;
    return {
      dexId: dexId,
      id: nd[0],
      nameEn: nd[1],
      nameDe: nd[2] || nd[1],
      types: nd[3] || ['Normal'],
      weightKg: nd[4] != null ? nd[4] : 10,
      defaultCatchRate: baseRate,
      catchRate: effectiveRate,
      hasGameOverride: over != null && over !== baseRate,
      baseHP: cd[1] || 50,
      baseSpe: cd[2] || 50,
      genderRate: cd[3] != null ? cd[3] : 4
    };
  }

  // KP-Berechnung für ein einzelnes KP-IV (0..31) bzw. KP-DV (0..15 in Gen 1/2)
  function calcMaxHPForIV(baseHP, level, iv, gen) {
    if (baseHP === 1) return 1; // Ninjatom (Shedinja)
    if (gen <= 2) {
      return Math.floor(((baseHP + iv) * 2 * level) / 100) + level + 10;
    }
    return Math.floor(((2 * baseHP + iv) * level) / 100) + level + 10;
  }

  // 4096-Festkomma-Helfer (wie in Gen 5–9 verwendet)
  function round4096(n) {
    // Kaufmännisches Runden bei .5 (bzw. Standard-Runden in Showdown/Dragonfly Cave)
    return Math.floor((n + 2048) / 4096);
  }

  // Ball-Modifikator für ein Spiel, einen Ball und die aktuellen Kampfbedingungen bestimmen
  function getBallModifier(gameId, ballId, mon, state) {
    var gen = (GAME_MAP[gameId] || { gen: 8 }).gen;
    var lv = Math.max(1, Math.min(100, Number(state.level) || 1));
    var ourLv = Math.max(1, Math.min(100, Number(state.ourLevel) || 1));
    var turn = Math.max(1, Number(state.turn) || 1);
    var isUB = !!ULTRA_BEASTS[mon.dexId];

    // Ultrabestien-Sonderregel in Sonne/Mond & USUM: Alle Bälle außer Ultraball (Beast Ball) & Meisterball haben ×0,1 (410/4096)
    if ((gameId === 'sm' || gameId === 'usum') && isUB && ballId !== 'beastball' && ballId !== 'masterball') {
      return { mult: 410 / 4096, add: 0, guaranteed: false, label: '×0,1 (UB)' };
    }

    if (ballId === 'masterball' || (ballId === 'dreamball' && gen === 5)) {
      return { mult: 255, add: 0, guaranteed: true, label: '100 %' };
    }

    if (ballId === 'pokeball' || ballId === 'premierball' || ballId === 'luxuryball' || ballId === 'healball' || ballId === 'friendball' || ballId === 'cherishball') {
      return { mult: 1, add: 0, guaranteed: false, label: '×1' };
    }
    if (ballId === 'greatball') {
      return { mult: 1.5, add: 0, guaranteed: false, label: '×1,5' };
    }
    if (ballId === 'ultraball') {
      return { mult: 2, add: 0, guaranteed: false, label: '×2' };
    }
    if (ballId === 'safariball') {
      return { mult: gen === 1 ? 2 : 1.5, add: 0, guaranteed: false, label: gen === 1 ? '×2' : '×1,5' };
    }
    if (ballId === 'sportball') {
      return { mult: 1.5, add: 0, guaranteed: false, label: '×1,5' };
    }

    if (ballId === 'netball') {
      var isBugOrWater = mon.types.indexOf('Bug') !== -1 || mon.types.indexOf('Water') !== -1;
      var mNet = isBugOrWater ? (gen >= 7 ? 3.5 : 3) : 1;
      return { mult: mNet, add: 0, guaranteed: false, label: '×' + String(mNet).replace('.', ',') };
    }

    if (ballId === 'diveball') {
      var diveActive = (gameId === 'rse' || gameId === 'oras') ? !!state.underwater : (!!state.water || !!state.fishing || !!state.underwater);
      var mDive = diveActive ? 3.5 : 1;
      return { mult: mDive, add: 0, guaranteed: false, label: '×' + String(mDive).replace('.', ',') };
    }

    if (ballId === 'nestball') {
      var mNest = 1;
      if (gen <= 4) {
        mNest = Math.max(1, (40 - lv) / 10);
      } else if (gen === 5) {
        mNest = Math.max(1, (41 - lv) / 10);
      } else {
        mNest = lv < 30 ? Math.floor((41 - lv) * 4096 / 10) / 4096 : 1;
      }
      var nestLbl = mNest === 1 ? '×1' : '×' + mNest.toFixed(2).replace(/\.?0+$/, '').replace('.', ',');
      return { mult: mNest, add: 0, guaranteed: false, label: nestLbl };
    }

    if (ballId === 'repeatball') {
      var mRep = state.caughtBefore ? (gen >= 7 ? 3.5 : 3) : 1;
      return { mult: mRep, add: 0, guaranteed: false, label: '×' + String(mRep).replace('.', ',') };
    }

    if (ballId === 'timerball') {
      var mTim = 1;
      if (gen <= 4) {
        mTim = Math.min(4, (turn + 9) / 10);
      } else {
        mTim = Math.min(4, 1 + ((turn - 1) * 1229) / 4096);
      }
      var timLbl = mTim === 1 ? '×1' : '×' + mTim.toFixed(2).replace(/\.?0+$/, '').replace('.', ',');
      return { mult: mTim, add: 0, guaranteed: false, label: timLbl };
    }

    if (ballId === 'duskball') {
      var mDusk = state.darkCave ? (gen >= 7 ? 3 : 3.5) : 1;
      return { mult: mDusk, add: 0, guaranteed: false, label: '×' + String(mDusk).replace('.', ',') };
    }

    if (ballId === 'quickball') {
      var mQuick = turn === 1 ? (gen >= 5 ? 5 : 4) : 1;
      return { mult: mQuick, add: 0, guaranteed: false, label: '×' + mQuick };
    }

    if (ballId === 'dreamball') {
      var mDream = state.status === 'sleep' ? 4 : 1;
      return { mult: mDream, add: 0, guaranteed: false, label: '×' + mDream };
    }

    if (ballId === 'beastball') {
      var mBeast = isUB ? 5 : 410 / 4096;
      return { mult: mBeast, add: 0, guaranteed: false, label: isUB ? '×5' : '×0,1' };
    }

    if (ballId === 'fastball') {
      var mFast = 1;
      if (gen === 2) {
        var fastSet = state.gscFixBugs ? GSC_FAST_INTENDED : GSC_FAST_BUG_MONS;
        mFast = fastSet[mon.dexId] ? 4 : 1;
      } else {
        mFast = mon.baseSpe >= 100 ? 4 : 1;
      }
      return { mult: mFast, add: 0, guaranteed: false, label: '×' + mFast };
    }

    if (ballId === 'levelball') {
      var mLvl = 1;
      if (ourLv >= lv * 4) mLvl = 8;
      else if (ourLv >= lv * 2) mLvl = 4;
      else if (ourLv > lv) mLvl = 2;
      return { mult: mLvl, add: 0, guaranteed: false, label: '×' + mLvl };
    }

    if (ballId === 'lureball') {
      var lureRate = gen >= 8 ? 4 : (gen === 7 ? 5 : 3);
      var mLure = state.fishing ? lureRate : 1;
      return { mult: mLure, add: 0, guaranteed: false, label: '×' + mLure };
    }

    if (ballId === 'loveball') {
      var mLove = state.sameSpeciesOppositeGender ? 8 : 1;
      return { mult: mLove, add: 0, guaranteed: false, label: '×' + mLove };
    }

    if (ballId === 'moonball') {
      var isMoon = !!MOON_STONE_FAM[mon.dexId];
      var mMoon = (gen === 2 && !state.gscFixBugs) ? 1 : (isMoon ? 4 : 1);
      return { mult: mMoon, add: 0, guaranteed: false, label: '×' + mMoon };
    }

    if (ballId === 'heavyball') {
      var w = mon.weightKg;
      var add = 0;
      if (gen === 2) {
        if (w < 102.4) add = -20;
        else if (w < 204.8) add = 0;
        else if (w < 307.2) add = 20;
        else add = 30;
      } else if (gen === 4) {
        if (w < 204.8) add = -20;
        else if (w < 307.2) add = 20;
        else if (w < 409.6) add = 30;
        else add = 40;
      } else {
        if (w < 100) add = -20;
        else if (w < 200) add = 0;
        else if (w < 300) add = 20;
        else add = 30;
      }
      return { mult: 1, add: add, guaranteed: false, label: (add >= 0 ? '+' : '−') + Math.abs(add) };
    }

    return { mult: 1, add: 0, guaranteed: false, label: '×1' };
  }

  // Exakte Fangwahrscheinlichkeit für ein einzelnes (maxHP, curHP)-Paar berechnen
  function calcSingleHP(gameId, ballId, mon, maxHP, curHP, state) {
    var gen = (GAME_MAP[gameId] || { gen: 8 }).gen;
    var baseRate = Number(state.customRate) > 0 ? Math.min(255, Math.max(1, Math.round(Number(state.customRate)))) : mon.catchRate;
    var bMod = getBallModifier(gameId, ballId, mon, state);

    if (bMod.guaranteed) {
      return {
        pTotal: 1,
        pNormal: 1,
        pCritChance: 0,
        pCritSuccess: 1,
        pShake: 1,
        modRateA: 255,
        ballLabel: bMod.label
      };
    }

    // ==================== GEN 1 (RBY) ====================
    if (gen === 1) {
      // RBY-Algorithmus:
      // Zufallszahl N aus 0..255 (Pokéball), 0..200 (Superball), 0..150 (Hyperball/Safariball)
      var nMax = ballId === 'pokeball' ? 255 : (ballId === 'greatball' ? 200 : 150);
      var sVal = state.status === 'sleep' ? 25 : (state.status === 'para' ? 12 : 0);
      var ballFactor = ballId === 'greatball' ? 8 : 12;
      var hDiv = Math.max(1, Math.floor(curHP / 4));
      var f = Math.min(255, Math.floor(Math.floor((maxHP * 255) / ballFactor) / hDiv));

      // Wenn N < S: direkter Fang. Wenn N - S > C: sofortiger Ausbruch. Sonst: f >= R (0..255) -> (f + 1) / 256.
      var pDirect = Math.min(nMax + 1, sVal) / (nMax + 1);
      var nPassCount = Math.max(0, Math.min(baseRate, nMax - sVal) + 1);
      var pSecond = (nPassCount / (nMax + 1)) * ((f + 1) / 256);
      var pRBY = Math.min(1, pDirect + pSecond);

      return {
        pTotal: pRBY,
        pNormal: pRBY,
        pCritChance: 0,
        pCritSuccess: 0,
        pShake: Math.pow(pRBY, 0.25),
        modRateA: Math.round(pRBY * 255),
        ballLabel: ballId === 'pokeball' ? 'RBY (255)' : (ballId === 'greatball' ? 'RBY (200)' : 'RBY (150)')
      };
    }

    // ==================== GEN 2 (GSC) ====================
    if (gen === 2) {
      var bRate = Math.max(1, Math.min(255, Math.floor(baseRate * bMod.mult + bMod.add)));
      var m3 = 3 * maxHP;
      var h2 = 2 * curHP;
      while (m3 > 255) {
        m3 = Math.floor(m3 / 2);
        h2 = Math.floor(h2 / 2);
      }
      var aGSC = Math.max(1, Math.floor(((m3 - h2) * bRate) / Math.max(1, m3)));
      // GSC-Bug:Levelball ignoriert KP und vergleicht nur mit unmodifizierter Rate, wenn Bug nicht gefixt
      if (ballId === 'levelball' && !state.gscFixBugs) {
        aGSC = bRate;
      }
      var sGSC = state.status === 'sleep' ? 10 : (state.status === 'para' && state.gscFixBugs ? 5 : 0);
      aGSC = Math.min(255, aGSC + sGSC);
      var pGSC = (aGSC + 1) / 256;
      // GSC Wackel-Tabelle (approximiert auf 4 Wackler für Anzeige)
      return {
        pTotal: Math.min(1, pGSC),
        pNormal: Math.min(1, pGSC),
        pCritChance: 0,
        pCritSuccess: 0,
        pShake: Math.pow(Math.min(1, pGSC), 0.25),
        modRateA: aGSC,
        ballLabel: bMod.label
      };
    }

    // ==================== GEN 3 & GEN 4 ====================
    if (gen === 3 || gen === 4) {
      var cRate34 = Math.max(1, Math.min(255, baseRate + bMod.add));
      var statusMult34 = state.status === 'sleep' ? 2 : (state.status === 'para' ? 1.5 : 1);
      var a34 = Math.floor(Math.floor(((3 * maxHP - 2 * curHP) * Math.floor(cRate34 * bMod.mult)) / (3 * maxHP)) * statusMult34);
      a34 = Math.max(1, a34);
      if (a34 >= 255) {
        return {
          pTotal: 1, pNormal: 1, pCritChance: 0, pCritSuccess: 0, pShake: 1, modRateA: a34, ballLabel: bMod.label
        };
      }
      var b34 = Math.floor(1048560 / Math.floor(Math.sqrt(Math.floor(Math.sqrt(Math.floor(16711680 / a34))))));
      var pShake34 = Math.min(1, b34 / 65536);
      var p34 = Math.pow(pShake34, 4);
      return {
        pTotal: p34,
        pNormal: p34,
        pCritChance: 0,
        pCritSuccess: 0,
        pShake: pShake34,
        modRateA: a34,
        ballLabel: bMod.label
      };
    }

    // ==================== GEN 5, 6, 7, 8, 9 (4096-Festkomma + Kritischer Fang) ====================
    var cRate = Math.max(1, Math.min(255, baseRate + bMod.add));

    // Dunkles Gras (Gen 5) / Pokédex-Fortschritt: [0: 0..30, 1: 31..150, 2: 151..300, 3: 301..450, 4: 451..600, 5: >600]
    var dexTier = Math.max(0, Math.min(5, Number(state.dexCaughtTier) || 0));
    var grassTable = [1229, 2048, 2867, 3277, 3686, 4096];
    var critDexTable = [0, 0.5, 1, 1.5, 2, 2.5];

    var hpFactor = Math.round(((3 * maxHP - 2 * curHP) * 4096) / (3 * maxHP));
    var aWork = hpFactor * cRate;

    // Gen 5 Dunkles Gras
    if (gen === 5 && state.darkGrass) {
      aWork = round4096(aWork * grassTable[dexTier]);
    }

    // Ball-Multiplikator (in 4096stel)
    var ball4096 = Math.round(bMod.mult * 4096);
    aWork = round4096(aWork * ball4096);

    // Gen 8 SwSh: Niedriglevel-Bonus (Level <= 20 -> (30 - Level) / 10)
    var lv = Math.max(1, Math.min(100, Number(state.level) || 1));
    if (gameId === 'swsh' && lv <= 20) {
      var lowLv4096 = Math.floor(((30 - lv) * 4096) / 10);
      aWork = round4096(aWork * lowLv4096);
    }

    // Status-Multiplikator (Gen 5+: Schlaf/Gefroren ×2,5 = 10240/4096, Para/Brand/Gift ×1,5 = 6144/4096)
    var status4096 = state.status === 'sleep' ? 10240 : (state.status === 'para' ? 6144 : 4096);
    aWork = round4096(aWork * status4096);

    // Gen 8 / 9: Überrascht / Backstrike (×2) bzw. SwSh starker Wanderer (×0,5)
    if (gen === 8 || gen === 9) {
      if (state.unaware === 'unaware') {
        aWork = round4096(aWork * 8192);
      } else if (gameId === 'swsh' && state.unaware === 'wanderer') {
        aWork = round4096(aWork * 2048);
      }
    }

    // Gen 8 / 9: Orden-Strafe (wenn wildes Level über dem Orden-Limit liegt)
    var badges = Math.max(0, Math.min(8, Number(state.badges) != null ? Number(state.badges) : 8));
    if (gameId === 'swsh' && badges < 8) {
      var swshCaps = [20, 25, 30, 35, 40, 45, 50, 55, 100];
      if (lv > swshCaps[badges]) {
        aWork = round4096(aWork * 410); // ×0,1
      }
    } else if (gameId === 'bdsp' && badges < 8) {
      var bdspCaps = [20, 25, 30, 35, 40, 45, 50, 55, 100];
      if (lv > bdspCaps[badges]) {
        var penBDSP = Math.round(Math.pow(0.8, 8 - badges) * 4096);
        aWork = round4096(aWork * penBDSP);
      }
    } else if (gameId === 'sv' && badges < 8 && lv > 14) {
      var svCaps = [20, 25, 30, 35, 40, 45, 50, 55, 100];
      if (lv > svCaps[badges]) {
        var penSV = Math.round(Math.pow(0.8, 8 - badges) * 4096);
        aWork = round4096(aWork * penSV);
      }
    }

    // Fangkraft: Gen 5 Entralink (×1.1, ×1.2, ×1.3), Gen 6/7 O-Kraft / Rotom-Fang (×1.5, ×2.0, ×2.5), Gen 9 Sandwich (×1.1, ×1.25, ×2.0)
    var pMod = Number(state.powerMod) || 0;
    if (pMod > 0) {
      var pMult = 1;
      if (gen === 5) pMult = [1, 1.1, 1.2, 1.3][pMod] || 1;
      else if (gen === 6 || gen === 7) pMult = [1, 1.5, 2.0, 2.5][pMod] || 1;
      else if (gen === 9) pMult = [1, 1.1, 1.25, 2.0][pMod] || 1;
      aWork = round4096(aWork * Math.round(pMult * 4096));
    }

    var aFinal = Math.max(1, Math.min(255, Math.floor(aWork / 4096)));

    // Kritischer Fang (c):
    var charmMult = (gen >= 5 && !(gen === 5 && gameId === 'bw') && state.catchingCharm) ? 2 : 1;
    var cCrit = Math.floor((Math.min(255, aFinal) * critDexTable[dexTier] * charmMult) / 6);
    var pCritChance = Math.min(1, Math.max(0, cCrit / 256));

    if (aFinal >= 255) {
      return {
        pTotal: 1,
        pNormal: 1 - pCritChance,
        pCritChance: pCritChance,
        pCritSuccess: 1,
        pShake: 1,
        modRateA: aFinal,
        ballLabel: bMod.label
      };
    }

    // Wackel-Wert b:
    // Gen 5: b = round(65536 / (255 / a)^0.25), 3 Wackler normal, 1 Wackler kritisch
    // Gen 6–9: b = floor(65536 / (255 / a)^(3/16)), 4 Wackler normal, 1 Wackler kritisch
    var bShake;
    var numShakes;
    if (gen === 5) {
      bShake = Math.round(65536 / Math.pow(255 / aFinal, 0.25));
      numShakes = 3;
    } else {
      bShake = Math.floor(65536 / Math.pow(255 / aFinal, 3 / 16));
      numShakes = 4;
    }

    var pShake = Math.min(1, bShake / 65536);
    var pCritSuccess = pShake;
    var pNormalSuccess = Math.pow(pShake, numShakes);
    var pTotal = pCritChance * pCritSuccess + (1 - pCritChance) * pNormalSuccess;

    return {
      pTotal: Math.min(1, pTotal),
      pNormal: (1 - pCritChance) * pNormalSuccess,
      pCritChance: pCritChance,
      pCritSuccess: pCritSuccess,
      pShake: pShake,
      modRateA: aFinal,
      ballLabel: bMod.label
    };
  }

  // Gesamtergebnis über alle möglichen KP-IVs (0..31) bzw. KP-DVs (0..15) oder exakte KP berechnen
  function computeCatchResult(gameId, ballId, mon, state) {
    var gen = (GAME_MAP[gameId] || { gen: 8 }).gen;
    var lv = Math.max(1, Math.min(100, Number(state.level) || 1));

    if (state.hpMode === 'exact') {
      var mHP = Math.max(1, Math.round(Number(state.maxHP) || 100));
      var cHP = Math.max(1, Math.min(mHP, Math.round(Number(state.curHP) || mHP)));
      var single = calcSingleHP(gameId, ballId, mon, mHP, cHP, state);
      return {
        pTotal: single.pTotal,
        pMin: single.pTotal,
        pMax: single.pTotal,
        pNormal: single.pNormal,
        pCritChance: single.pCritChance,
        pCritSuccess: single.pCritSuccess,
        pShake: single.pShake,
        modRateA: single.modRateA,
        ballLabel: single.ballLabel,
        ivRows: [{ ivMin: 0, ivMax: gen <= 2 ? 15 : 31, maxHP: mHP, curHP: cHP, pTotal: single.pTotal, modRateA: single.modRateA }],
        hasIVVariance: false
      };
    }

    // Prozent-Modus / 1 KP (Trugschlag): Über alle 16 DVs (Gen 1/2) bzw. 32 IVs (Gen 3+) iterieren
    var maxIV = gen <= 2 ? 15 : 31;
    var count = maxIV + 1;
    var pct = Math.max(1, Math.min(100, Number(state.hpPct) || 100));
    var sumTotal = 0, sumNormal = 0, sumCritChance = 0, sumCritSuccess = 0, sumShake = 0;
    var pMin = 1, pMax = 0;
    var groups = [];
    var ballLabel = '×1';

    for (var iv = 0; iv <= maxIV; iv++) {
      var mHP2 = calcMaxHPForIV(mon.baseHP, lv, iv, gen);
      var cHP2 = state.falseSwipe ? 1 : Math.max(1, Math.min(mHP2, Math.round((mHP2 * pct) / 100)));
      var r = calcSingleHP(gameId, ballId, mon, mHP2, cHP2, state);
      ballLabel = r.ballLabel;
      sumTotal += r.pTotal;
      sumNormal += r.pNormal;
      sumCritChance += r.pCritChance;
      sumCritSuccess += r.pCritSuccess;
      sumShake += r.pShake;
      if (r.pTotal < pMin) pMin = r.pTotal;
      if (r.pTotal > pMax) pMax = r.pTotal;

      var last = groups[groups.length - 1];
      if (last && Math.abs(last.pTotal - r.pTotal) < 1e-9 && last.maxHP === mHP2 && last.curHP === cHP2) {
        last.ivMax = iv;
      } else {
        groups.push({ ivMin: iv, ivMax: iv, maxHP: mHP2, curHP: cHP2, pTotal: r.pTotal, modRateA: r.modRateA });
      }
    }

    return {
      pTotal: sumTotal / count,
      pMin: pMin,
      pMax: pMax,
      pNormal: sumNormal / count,
      pCritChance: sumCritChance / count,
      pCritSuccess: sumCritSuccess / count,
      pShake: sumShake / count,
      modRateA: groups[groups.length - 1].modRateA,
      ballLabel: ballLabel,
      ivRows: groups,
      hasIVVariance: (pMax - pMin) > 0.0005
    };
  }

  // Wie viele Bälle für Ziel-Wahrscheinlichkeit q (z.B. 0.5, 0.75, 0.95, 0.99)?
  function ballsForConfidence(p, q) {
    if (p >= 1) return 1;
    if (p <= 0) return Infinity;
    return Math.max(1, Math.ceil(Math.log(1 - q) / Math.log(1 - p)));
  }

  function fmtPct(p) {
    var v = p * 100;
    if (v >= 99.995 && v < 100) return de ? '99,99 %' : '99.99%';
    var s = v >= 10 ? v.toFixed(2) : (v >= 1 ? v.toFixed(2) : v.toFixed(3));
    s = s.replace(/\.?0+$/, '');
    if (de) s = s.replace('.', ',');
    return s + (de ? ' %' : '%');
  }

  // ==================== UI RENDERING ====================
  var root = null;
  var searchOpen = false;

  function render() {
    root = document.getElementById('catchView');
    if (!root) return;

    var game = GAME_MAP[st.game] || GAMES[13];
    st.game = game.id;
    if (st.dexId > game.maxDex || st.dexId < 1) st.dexId = Math.min(game.maxDex, 25);

    var availBalls = ballsForGame(st.game);
    if (!availBalls.some(function (b) { return b.id === st.ball; })) {
      st.ball = 'ultraball';
    }

    var mon = getMonInfo(st.dexId, st.game);
    var gen = game.gen;

    // Spiel-Auswahl (gruppiert nach Generation)
    var gameOpts = '';
    var lastGroup = '';
    GAMES.forEach(function (g) {
      var grp = de ? g.groupDe : g.groupEn;
      if (grp !== lastGroup) {
        if (lastGroup) gameOpts += '</optgroup>';
        gameOpts += '<optgroup label="' + A.esc(grp) + '">';
        lastGroup = grp;
      }
      gameOpts += '<option value="' + g.id + '"' + (g.id === st.game ? ' selected' : '') + '>' + A.esc(de ? g.nameDe : g.nameEn) + '</option>';
    });
    if (lastGroup) gameOpts += '</optgroup>';

    // Visuelle Ball-Auswahl mit Ball-Bildern
    var ballTilesHtml = availBalls.map(function (b) {
      return (
        '<button type="button" class="catch-ball-tile' + (b.id === st.ball ? ' on' : '') + '" data-ball="' + b.id + '" title="' + A.esc(de ? b.descDe : b.descEn) + '">' +
          ballIconHtml(b.id) +
          '<span class="catch-ball-tile-name">' + A.esc(de ? b.nameDe : b.nameEn) + '</span>' +
        '</button>'
      );
    }).join('');

    var effRate = Number(st.customRate) > 0 ? Math.min(255, Math.max(1, Math.round(Number(st.customRate)))) : mon.catchRate;
    var minHP = calcMaxHPForIV(mon.baseHP, st.level, 0, gen);
    var maxHP31 = calcMaxHPForIV(mon.baseHP, st.level, gen <= 2 ? 15 : 31, gen);

    var hasTurnOrLevel = (gen >= 3) || (gen === 2 || st.game === 'hgss' || gen >= 7);
    var hasCondChecks = (gen >= 2);

    root.innerHTML =
      '<div class="catch-grid">' +
        // LINKE SPALTE: ZIEL-POKÉMON, KP/STATUS & GENERATIONS-BONI
        '<section class="panel catch-left">' +
          '<h2 class="field-head">' +
            '<span>' + (de ? 'Ziel-Pokémon & Zustand' : 'Target Pokémon & State') + '</span>' +
            '<span class="catch-gen-badge">Gen ' + gen + '</span>' +
          '</h2>' +
          '<div class="catch-body">' +

            // 1. Spiel & Pokémon
            '<div class="catch-section">' +
              '<div class="catch-row">' +
                '<label class="catch-lbl">' + (de ? 'Hauptspiel' : 'Game') + '</label>' +
                '<select id="ccGameSel" class="catch-sel">' + gameOpts + '</select>' +
              '</div>' +

              '<div class="catch-mon-card">' +
                '<div class="catch-mon-sprite" id="ccMonSprite"></div>' +
                '<div class="catch-mon-main">' +
                  '<div class="catch-poke-pick">' +
                    '<input type="text" id="ccMonInput" class="catch-mon-inp" value="#' + mon.dexId + ' ' + A.esc(de ? mon.nameDe : mon.nameEn) + '" placeholder="' + (de ? 'Pokémon suchen (Name oder #Nr.) …' : 'Search Pokémon (name or #) …') + '" autocomplete="off">' +
                    '<div class="catch-poke-dd hidden" id="ccMonDD"></div>' +
                  '</div>' +
                  '<div class="catch-mon-meta">' +
                    '<span class="catch-mon-types" id="ccMonTypes"></span>' +
                    '<span class="catch-meta-pill">' + (de ? 'Fangrate: ' : 'Catch rate: ') + '<b>' + mon.catchRate + '</b>' +
                      (mon.hasGameOverride ? ' <small>(' + (de ? 'Spielwert' : 'game override') + ')</small>' : '') +
                    '</span>' +
                    '<span class="catch-meta-pill">' + (de ? 'KP-Basis: ' : 'Base HP: ') + '<b>' + mon.baseHP + '</b></span>' +
                    '<span class="catch-meta-pill">' + (de ? 'Init: ' : 'Spe: ') + '<b>' + mon.baseSpe + '</b></span>' +
                    '<span class="catch-meta-pill">' + String(mon.weightKg).replace('.', de ? ',' : '.') + ' kg</span>' +
                  '</div>' +
                '</div>' +
              '</div>' +

              '<div class="catch-row catch-row-2col">' +
                '<div>' +
                  '<label class="catch-lbl">' + (de ? 'Level des wilden Pokémon' : 'Wild Pokémon Level') + '</label>' +
                  '<input type="number" id="ccLevel" min="1" max="100" value="' + st.level + '" class="catch-num">' +
                '</div>' +
                '<div>' +
                  '<label class="catch-lbl" title="' + (de ? 'Optional für ROM-Hacks oder Spezial-Events' : 'Optional for ROM hacks or special events') + '">' + (de ? 'Eigene Fangrate (optional)' : 'Custom Catch Rate') + '</label>' +
                  '<input type="number" id="ccCustomRate" min="1" max="255" value="' + A.esc(st.customRate) + '" placeholder="' + mon.catchRate + ' (' + (de ? 'Standard' : 'Default') + ')" class="catch-num">' +
                '</div>' +
              '</div>' +
            '</div>' +

            // 2. KP & Status
            '<div class="catch-section">' +
              '<div class="catch-sec-head">' +
                '<span class="catch-sec-title">' + (de ? 'KP & Statusproblem' : 'HP & Status Condition') + '</span>' +
                '<div class="btn-group catch-hp-tabs">' +
                  '<button type="button" id="ccHpModePct" class="' + (st.hpMode === 'pct' ? 'on' : '') + '">' + (de ? 'KP in % (alle IVs)' : 'HP % (all IVs)') + '</button>' +
                  '<button type="button" id="ccHpModeExact" class="' + (st.hpMode === 'exact' ? 'on' : '') + '">' + (de ? 'Exakte KP' : 'Exact HP') + '</button>' +
                '</div>' +
              '</div>' +

              (st.hpMode === 'pct' ? (
                '<div class="catch-hp-pct-box">' +
                  '<div class="catch-slider-row">' +
                    '<input type="range" id="ccHpSlider" min="1" max="100" value="' + (st.falseSwipe ? 1 : st.hpPct) + '"' + (st.falseSwipe ? ' disabled' : '') + '>' +
                    '<span class="catch-hp-readout" id="ccHpReadout">' + (st.falseSwipe ? '1 KP' : st.hpPct + ' %') + '</span>' +
                  '</div>' +
                  '<div class="catch-hp-presets">' +
                    '<button type="button" data-hppct="100" class="tbtn' + (!st.falseSwipe && st.hpPct === 100 ? ' on' : '') + '">100 %</button>' +
                    '<button type="button" data-hppct="75" class="tbtn' + (!st.falseSwipe && st.hpPct === 75 ? ' on' : '') + '">75 %</button>' +
                    '<button type="button" data-hppct="50" class="tbtn' + (!st.falseSwipe && st.hpPct === 50 ? ' on' : '') + '">50 %</button>' +
                    '<button type="button" data-hppct="25" class="tbtn' + (!st.falseSwipe && st.hpPct === 25 ? ' on' : '') + '">25 %</button>' +
                    '<button type="button" data-hppct="10" class="tbtn' + (!st.falseSwipe && st.hpPct === 10 ? ' on' : '') + '">10 %</button>' +
                    '<button type="button" id="ccFalseSwipe" class="tbtn catch-fs-btn' + (st.falseSwipe ? ' on' : '') + '">1 KP (' + (de ? 'Trugschlag' : 'False Swipe') + ')</button>' +
                  '</div>' +
                  '<div class="hint catch-hp-range-hint" id="ccHpRangeHint">' +
                    (de ? 'Mögliche Max.-KP auf Lv. ' + st.level + ': ' : 'Possible Max HP at Lv. ' + st.level + ': ') +
                    '<b>' + minHP + ' – ' + maxHP31 + ' KP</b> (' + (gen <= 2 ? '0–15 DVs' : '0–31 IVs') + ')' +
                  '</div>' +
                '</div>'
              ) : (
                '<div class="catch-hp-exact-box">' +
                  '<div class="catch-row catch-row-2col">' +
                    '<div>' +
                      '<label class="catch-lbl">' + (de ? 'Aktuelle KP' : 'Current HP') + '</label>' +
                      '<input type="number" id="ccCurHP" min="1" max="999" value="' + st.curHP + '" class="catch-num">' +
                    '</div>' +
                    '<div>' +
                      '<label class="catch-lbl">' + (de ? 'Maximale KP' : 'Max HP') + '</label>' +
                      '<input type="number" id="ccMaxHP" min="1" max="999" value="' + st.maxHP + '" class="catch-num">' +
                    '</div>' +
                  '</div>' +
                  '<div class="catch-hp-presets">' +
                    '<button type="button" id="ccEx1HP" class="tbtn">1 KP</button>' +
                    '<button type="button" id="ccExIV0" class="tbtn">Max KP (0 IV: ' + minHP + ')</button>' +
                    '<button type="button" id="ccExIV31" class="tbtn">Max KP (' + (gen <= 2 ? '15 DV: ' : '31 IV: ') + maxHP31 + ')</button>' +
                  '</div>' +
                '</div>'
              )) +

              '<div class="catch-status-row">' +
                '<label class="catch-lbl">' + (de ? 'Statusproblem' : 'Status Condition') + '</label>' +
                '<div class="btn-group catch-status-btns">' +
                  '<button type="button" data-status="none" class="' + (st.status === 'none' ? 'on' : '') + '">' + (de ? 'Kein Status' : 'None') + '</button>' +
                  '<button type="button" data-status="sleep" class="st-slp ' + (st.status === 'sleep' ? 'on' : '') + '">' + (de ? 'Schlaf / Gefroren' : 'Sleep / Freeze') + '</button>' +
                  '<button type="button" data-status="para" class="st-par ' + (st.status === 'para' ? 'on' : '') + '">' + (de ? 'Paralyse / Gift / Brand' : 'Para / Poison / Burn') + '</button>' +
                '</div>' +
              '</div>' +
            '</div>' +

            // 3. Generations-Extras (Gen 5–9: Kritischer Fang, Orden, Fangkraft, Backstrike)
            (gen >= 5 ? (
              '<div class="catch-section">' +
                '<div class="catch-sec-head">' +
                  '<span class="catch-sec-title">' + (de ? 'Gen ' + gen + ' · Kritischer Fang & Boni' : 'Gen ' + gen + ' · Critical Capture & Modifiers') + '</span>' +
                '</div>' +

                '<div class="catch-row catch-row-2col">' +
                  '<div>' +
                    '<label class="catch-lbl">' + (de ? 'Gefangene Arten im Pokédex' : 'Caught Species in Pokédex') + '</label>' +
                    '<select id="ccDexTier" class="catch-sel">' +
                      '<option value="0"' + (st.dexCaughtTier === 0 ? ' selected' : '') + '>0 – 30 (×0)</option>' +
                      '<option value="1"' + (st.dexCaughtTier === 1 ? ' selected' : '') + '>31 – 150 (×0,5)</option>' +
                      '<option value="2"' + (st.dexCaughtTier === 2 ? ' selected' : '') + '>151 – 300 (×1)</option>' +
                      '<option value="3"' + (st.dexCaughtTier === 3 ? ' selected' : '') + '>301 – 450 (×1,5)</option>' +
                      '<option value="4"' + (st.dexCaughtTier === 4 ? ' selected' : '') + '>451 – 600 (×2)</option>' +
                      '<option value="5"' + (st.dexCaughtTier === 5 ? ' selected' : '') + '>Über 600 (×2,5)</option>' +
                    '</select>' +
                  '</div>' +

                  (gen === 5 || gen === 6 || gen === 7 || gen === 9 ? (
                    '<div>' +
                      '<label class="catch-lbl">' +
                        (gen === 5 ? (de ? 'Fangkraft (Kontaktebene)' : 'Entralink Pass Power') :
                         gen <= 7 ? (de ? 'O-Kraft / Rotom-Fang' : 'O-Power / Rotom Catch') :
                         (de ? 'Fangkraft (Sandwich)' : 'Catching Power (Meal)')) +
                      '</label>' +
                      '<select id="ccPowerMod" class="catch-sel">' +
                        '<option value="0"' + (st.powerMod === 0 ? ' selected' : '') + '>' + (de ? 'Keine (×1)' : 'None (×1)') + '</option>' +
                        '<option value="1"' + (st.powerMod === 1 ? ' selected' : '') + '>' + (gen === 5 ? 'Stufe 1 (×1,1)' : (gen <= 7 ? 'Stufe 1 (×1,5)' : 'Fangkraft Lv. 1 (×1,1)')) + '</option>' +
                        '<option value="2"' + (st.powerMod === 2 ? ' selected' : '') + '>' + (gen === 5 ? 'Stufe 2 (×1,2)' : (gen <= 7 ? 'Stufe 2 (×2,0)' : 'Fangkraft Lv. 2 (×1,25)')) + '</option>' +
                        '<option value="3"' + (st.powerMod === 3 ? ' selected' : '') + '>' + (gen === 5 ? 'Stufe 3 / S / MAX (×1,3)' : (gen <= 7 ? 'Stufe 3 / S / Rotom-Fang (×2,5)' : 'Fangkraft Lv. 3 (×2,0)')) + '</option>' +
                      '</select>' +
                    '</div>'
                  ) : '') +
                '</div>' +

                (gen === 8 || gen === 9 ? (
                  '<div class="catch-row catch-row-2col">' +
                    '<div>' +
                      '<label class="catch-lbl">' + (de ? 'Begegnungs-Situation' : 'Encounter State') + '</label>' +
                      '<select id="ccUnaware" class="catch-sel">' +
                        '<option value="normal"' + (st.unaware === 'normal' ? ' selected' : '') + '>' + (de ? 'Normal (×1)' : 'Normal (×1)') + '</option>' +
                        '<option value="unaware"' + (st.unaware === 'unaware' ? ' selected' : '') + '>' + (de ? 'Überrascht / von hinten (×2)' : 'Unaware / Backstrike (×2)') + '</option>' +
                        (st.game === 'swsh' ? '<option value="wanderer"' + (st.unaware === 'wanderer' ? ' selected' : '') + '>' + (de ? 'Starker Wanderer Naturzone (×0,5)' : 'Strong Spawn / Wanderer (×0.5)') + '</option>' : '') +
                      '</select>' +
                    '</div>' +
                    '<div>' +
                      '<label class="catch-lbl">' + (de ? 'Arena-Orden (Level-Cap)' : 'Gym Badges (Level Cap)') + '</label>' +
                      '<select id="ccBadges" class="catch-sel">' +
                        [8, 7, 6, 5, 4, 3, 2, 1, 0].map(function (b) {
                          var cap = [20, 25, 30, 35, 40, 45, 50, 55, 100][b];
                          return '<option value="' + b + '"' + (st.badges === b ? ' selected' : '') + '>' + b + (de ? ' Orden (bis Lv. ' + cap + ')' : ' Badges (up to Lv. ' + cap + ')') + '</option>';
                        }).join('') +
                      '</select>' +
                    '</div>' +
                  '</div>'
                ) : '') +

                (st.game !== 'bw' ? (
                  '<div class="catch-checks">' +
                    '<label class="catch-chk"><input type="checkbox" id="ccCharm"' + (st.catchingCharm ? ' checked' : '') + '><span>' + (de ? 'Fangpin im Besitz (verdoppelt Kritische Fangchance)' : 'Catching Charm owned (2× Critical Capture rate)') + '</span></label>' +
                  '</div>'
                ) : '') +
              '</div>'
            ) : '') +

          '</div>' +
        '</section>' +

        // RECHTE SPALTE: POKÉBALL-AUSWAHL (MIT BILDERN), BALL-BEDINGUNGEN & ERGEBNIS FÜR DEN AUSGEWÄHLTEN BALL
        '<section class="catch-right">' +
          '<div class="panel catch-ball-panel">' +
            '<h2 class="field-head">' +
              '<span>' + (de ? 'Pokéball-Auswahl & Bedingungen' : 'Poké Ball Selection & Conditions') + '</span>' +
              '<span class="hint">' + availBalls.length + (de ? ' Bälle verfügbar' : ' Balls available') + '</span>' +
            '</h2>' +
            '<div class="catch-ball-panel-body">' +
              '<div class="catch-ball-grid" id="ccBallGrid">' + ballTilesHtml + '</div>' +
              '<div class="catch-ball-active-bar">' +
                '<span class="catch-ball-ic" id="ccBallIcon">' + ballIconHtml(st.ball) + '</span>' +
                '<div class="catch-ball-active-text">' +
                  '<b id="ccBallName">' + A.esc(de ? BALL_MAP[st.ball].nameDe : BALL_MAP[st.ball].nameEn) + '</b>' +
                  '<span class="hint" id="ccBallDesc">' + A.esc(de ? BALL_MAP[st.ball].descDe : BALL_MAP[st.ball].descEn) + '</span>' +
                '</div>' +
              '</div>' +

              (hasTurnOrLevel || hasCondChecks ? (
                '<div class="catch-cond-box">' +
                  (hasTurnOrLevel ? (
                    '<div class="catch-cond-grid">' +
                      (gen >= 3 ? (
                        '<div class="catch-cond-field">' +
                          '<label class="catch-lbl">' + (de ? 'Kampfrunde (Flott-/Timerball)' : 'Battle Turn (Quick/Timer)') + '</label>' +
                          '<div class="catch-turn-ctrl">' +
                            '<button type="button" id="ccTurn1" class="tbtn' + (st.turn === 1 ? ' on' : '') + '">' + (de ? 'Runde 1' : 'Turn 1') + '</button>' +
                            '<input type="number" id="ccTurn" min="1" max="99" value="' + st.turn + '" class="catch-num">' +
                            '<button type="button" id="ccTurnMax" class="tbtn' + (st.turn >= (gen >= 5 ? 11 : 31) ? ' on' : '') + '">' + (de ? 'Max Timer (' + (gen >= 5 ? '11+' : '31+') + ')' : 'Max Timer') + '</button>' +
                          '</div>' +
                        '</div>'
                      ) : '') +

                      (gen === 2 || st.game === 'hgss' || gen >= 7 ? (
                        '<div class="catch-cond-field">' +
                          '<label class="catch-lbl">' + (de ? 'Eigenes Level (Levelball)' : 'Your Pokémon Level (Level Ball)') + '</label>' +
                          '<input type="number" id="ccOurLevel" min="1" max="100" value="' + st.ourLevel + '" class="catch-num">' +
                        '</div>'
                      ) : '') +
                    '</div>'
                  ) : '') +

                  (hasCondChecks ? (
                    '<div class="catch-checks catch-checks-grid">' +
                      (gen >= 3 ? '<label class="catch-chk"><input type="checkbox" id="ccCaught"' + (st.caughtBefore ? ' checked' : '') + '><span>' + (de ? 'Bereits im Pokédex gefangen (Wiederball)' : 'Already caught in Pokédex (Repeat Ball)') + '</span></label>' : '') +
                      (gen >= 4 ? '<label class="catch-chk"><input type="checkbox" id="ccDarkCave"' + (st.darkCave ? ' checked' : '') + '><span>' + (de ? 'Nachts oder in einer Höhle (Finsterball)' : 'At night or in a cave (Dusk Ball)') + '</span></label>' : '') +
                      (gen >= 3 && st.game !== 'rse' && st.game !== 'oras' ? '<label class="catch-chk"><input type="checkbox" id="ccWater"' + (st.water ? ' checked' : '') + '><span>' + (de ? 'Beim Surfen / auf dem Wasser (Tauchball)' : 'Surfing / on water (Dive Ball)') + '</span></label>' : '') +
                      (st.game === 'rse' || st.game === 'oras' ? '<label class="catch-chk"><input type="checkbox" id="ccUnderwater"' + (st.underwater ? ' checked' : '') + '><span>' + (de ? 'Unterwasser mit Taucher (Tauchball)' : 'Underwater diving (Dive Ball)') + '</span></label>' : '') +
                      (gen === 2 || st.game === 'hgss' || gen >= 7 ? '<label class="catch-chk"><input type="checkbox" id="ccFishing"' + (st.fishing ? ' checked' : '') + '><span>' + (de ? 'Beim Angeln (Köderball / Tauchball)' : 'Fishing encounter (Lure / Dive Ball)') + '</span></label>' : '') +
                      (gen === 2 || st.game === 'hgss' || gen >= 7 ? '<label class="catch-chk"><input type="checkbox" id="ccLove"' + (st.sameSpeciesOppositeGender ? ' checked' : '') + '><span>' + (de ? 'Gleiche Art & anderes Geschlecht (Sympaball)' : 'Same species & opposite gender (Love Ball)') + '</span></label>' : '') +
                      (gen === 2 ? '<label class="catch-chk"><input type="checkbox" id="ccGscFix"' + (st.gscFixBugs ? ' checked' : '') + '><span>' + (de ? 'Gen-2-Bugs korrigieren (Paralyse/Brand/Gift +5, Mond-/Sympa-/Turboball)' : 'Fix Gen 2 bugs (BRN/PAR/PSN +5, Moon/Love/Fast Ball)') + '</span></label>' : '') +
                      (gen === 5 ? '<label class="catch-chk"><input type="checkbox" id="ccDarkGrass"' + (st.darkGrass ? ' checked' : '') + '><span>' + (de ? 'Im dunklen hohen Gras (Doppelkampf-Gras)' : 'In Dark Grass') + '</span></label>' : '') +
                    '</div>'
                  ) : '') +
                '</div>'
              ) : '') +
            '</div>' +
          '</div>' +

          '<div class="panel catch-res-panel" id="ccResultPanel"></div>' +
        '</section>' +
      '</div>';

    // Sprite & Typen einsetzen
    var spBox = document.getElementById('ccMonSprite');
    if (spBox) spBox.appendChild(A.spriteById(mon.id, '', false, de ? mon.nameDe : mon.nameEn));
    var tyBox = document.getElementById('ccMonTypes');
    if (tyBox) {
      mon.types.forEach(function (t) { tyBox.appendChild(A.typeBadge(t)); });
    }

    wireEvents(game);
    updateCalculations();
  }

  function updateCalculations() {
    var mon = getMonInfo(st.dexId, st.game);
    var res = computeCatchResult(st.game, st.ball, mon, st);
    var gen = (GAME_MAP[st.game] || { gen: 8 }).gen;
    var ballInfo = BALL_MAP[st.ball] || BALLS[0];

    var resPanel = document.getElementById('ccResultPanel');
    if (resPanel) {
      var p = res.pTotal;
      var pctNum = Math.min(100, Math.max(0, p * 100));
      var barColor = pctNum >= 75 ? 'var(--good)' : (pctNum >= 30 ? 'var(--accent-2)' : (pctNum >= 10 ? 'var(--warn)' : 'var(--bad)'));

      var avgBalls = p > 0 ? (1 / p) : Infinity;
      var avgStr = p >= 1 ? '1' : (avgBalls < 100 ? avgBalls.toFixed(1).replace('.', de ? ',' : '.') : Math.round(avgBalls));
      var b50 = ballsForConfidence(p, 0.5);
      var b75 = ballsForConfidence(p, 0.75);
      var b95 = ballsForConfidence(p, 0.95);
      var b99 = ballsForConfidence(p, 0.99);

      var varianceNote = '';
      if (res.hasIVVariance) {
        varianceNote =
          '<div class="catch-iv-notice">' +
            '<div class="catch-iv-head">' +
              '<span>' +
                (de ? 'KP-' + (gen <= 2 ? 'DV (0–15)' : 'IV (0–31)') + '-Spanne: Fangchance zwischen ' : 'HP ' + (gen <= 2 ? 'DV (0–15)' : 'IV (0–31)') + ' range: ') +
                '<b>' + fmtPct(res.pMin) + '</b> ' + (de ? 'und' : 'to') + ' <b>' + fmtPct(res.pMax) + '</b>' +
              '</span>' +
            '</div>' +
            '<table class="catch-iv-table">' +
              '<thead><tr><th>KP-' + (gen <= 2 ? 'DV' : 'IV') + '</th><th>' + (de ? 'Akt. / Max. KP' : 'Cur / Max HP') + '</th><th>' + (de ? 'Rate (a)' : 'Rate (a)') + '</th><th>' + (de ? 'Fangchance' : 'Chance') + '</th></tr></thead>' +
              '<tbody>' +
                res.ivRows.map(function (r) {
                  var ivLbl = r.ivMin === r.ivMax ? String(r.ivMin) : (r.ivMin + ' – ' + r.ivMax);
                  return '<tr><td>' + ivLbl + '</td><td>' + r.curHP + ' / ' + r.maxHP + '</td><td>' + r.modRateA + '</td><td><b>' + fmtPct(r.pTotal) + '</b></td></tr>';
                }).join('') +
              '</tbody>' +
            '</table>' +
          '</div>';
      }

      resPanel.innerHTML =
        '<h2 class="field-head">' +
          '<span>' + (de ? 'Fangwahrscheinlichkeit · Ausgewählter Ball' : 'Capture Probability · Selected Ball') + '</span>' +
          '<span class="catch-mult-tag">' + A.esc(de ? 'Ball-Faktor ' : 'Ball Mult ') + A.esc(res.ballLabel) + '</span>' +
        '</h2>' +
        '<div class="catch-hero">' +
          '<div class="catch-hero-top">' +
            '<div class="catch-hero-title">' +
              '<span class="catch-hero-ball-ic">' + ballIconHtml(st.ball) + '</span>' +
              '<div>' +
                '<div class="catch-hero-ball">' + A.esc(de ? ballInfo.nameDe : ballInfo.nameEn) + '</div>' +
                '<div class="catch-hero-sub">' + A.esc(de ? mon.nameDe : mon.nameEn) + ' · Lv. ' + st.level + ' · ' + (st.hpMode === 'pct' ? (st.falseSwipe ? '1 KP' : st.hpPct + ' % KP') : (st.curHP + '/' + st.maxHP + ' KP')) + '</div>' +
              '</div>' +
            '</div>' +
            '<div class="catch-hero-pct">' +
              '<span class="catch-big-num">' + fmtPct(p) + '</span>' +
              '<span class="catch-big-lbl">' + (de ? 'pro Wurf' : 'per throw') + '</span>' +
            '</div>' +
          '</div>' +
          '<div class="catch-prog-bar"><span style="width:' + pctNum.toFixed(2) + '%;background:' + barColor + '"></span></div>' +

          '<div class="catch-stat-cards">' +
            '<div class="catch-stat-card">' +
              '<span class="cs-val">' + avgStr + '</span>' +
              '<span class="cs-lbl">' + (de ? 'Ø Bälle (Erwartungswert)' : 'Avg. Balls (1/p)') + '</span>' +
            '</div>' +
            '<div class="catch-stat-card">' +
              '<span class="cs-val">' + b50 + '</span>' +
              '<span class="cs-lbl">' + (de ? 'für ≥ 50 % Chance' : 'for ≥ 50% chance') + '</span>' +
            '</div>' +
            '<div class="catch-stat-card">' +
              '<span class="cs-val">' + b75 + '</span>' +
              '<span class="cs-lbl">' + (de ? 'für ≥ 75 % Chance' : 'for ≥ 75% chance') + '</span>' +
            '</div>' +
            '<div class="catch-stat-card highlight">' +
              '<span class="cs-val">' + b95 + '</span>' +
              '<span class="cs-lbl">' + (de ? 'für ≥ 95 % Chance' : 'for ≥ 95% chance') + '</span>' +
            '</div>' +
            '<div class="catch-stat-card">' +
              '<span class="cs-val">' + b99 + '</span>' +
              '<span class="cs-lbl">' + (de ? 'für ≥ 99 % Chance' : 'for ≥ 99% chance') + '</span>' +
            '</div>' +
          '</div>' +

          '<div class="catch-detail-pills">' +
            '<span class="catch-dpill">' + (de ? 'Mod. Fangrate (a): ' : 'Mod. Rate (a): ') + '<b>' + res.modRateA + ' / 255</b></span>' +
            '<span class="catch-dpill">' + (de ? 'Wackel-Chance: ' : 'Shake Chance: ') + '<b>' + fmtPct(res.pShake) + '</b></span>' +
            (gen >= 5 ? (
              '<span class="catch-dpill">' + (de ? 'Kritischer Wurf: ' : 'Crit Throw: ') + '<b>' + fmtPct(res.pCritChance) + '</b> (' + (de ? 'Erfolg: ' : 'Success: ') + fmtPct(res.pCritSuccess) + ')</span>' +
              '<span class="catch-dpill">' + (de ? 'Normaler Fang: ' : 'Normal Capture: ') + '<b>' + fmtPct(res.pNormal) + '</b></span>'
            ) : '') +
          '</div>' +
          varianceNote +
        '</div>';
    }
  }

  function wireEvents(game) {
    var gameSel = document.getElementById('ccGameSel');
    if (gameSel) {
      gameSel.addEventListener('change', function () {
        st.game = gameSel.value;
        saveState();
        render();
      });
    }

    // Pokémon-Suche mit Autocomplete über alle verfügbaren National-Dex-Pokémon des Spiels
    var monInp = document.getElementById('ccMonInput');
    var monDD = document.getElementById('ccMonDD');
    if (monInp && monDD) {
      var renderDD = function (q) {
        q = String(q || '').trim().toLowerCase();
        var matches = [];
        var maxD = game.maxDex;
        for (var i = 1; i <= maxD; i++) {
          var nd = window.NATDEX && window.NATDEX[i];
          if (!nd) continue;
          var nEn = (nd[1] || '').toLowerCase();
          var nDe = (nd[2] || '').toLowerCase();
          var numStr = String(i);
          if (!q || nDe.indexOf(q) !== -1 || nEn.indexOf(q) !== -1 || numStr === q.replace(/^#/, '')) {
            matches.push({ id: i, slug: nd[0], nameDe: nd[2] || nd[1], nameEn: nd[1], types: nd[3] || [] });
            if (matches.length >= 40) break;
          }
        }
        if (!matches.length) {
          monDD.innerHTML = '<div class="catch-dd-empty">' + (de ? 'Kein Pokémon gefunden' : 'No Pokémon found') + '</div>';
        } else {
          monDD.innerHTML = matches.map(function (m) {
            var rate = getMonInfo(m.id, st.game).catchRate;
            return (
              '<div class="catch-dd-row' + (m.id === st.dexId ? ' on' : '') + '" data-dex="' + m.id + '">' +
                '<span class="catch-dd-num">#' + m.id + '</span>' +
                '<span class="catch-dd-name">' + A.esc(de ? m.nameDe : m.nameEn) + '</span>' +
                '<span class="catch-dd-rate">' + (de ? 'Rate ' : 'CR ') + rate + '</span>' +
              '</div>'
            );
          }).join('');
        }
        monDD.classList.remove('hidden');
        monDD.querySelectorAll('.catch-dd-row').forEach(function (row) {
          row.addEventListener('mousedown', function (ev) {
            ev.preventDefault();
            st.dexId = Number(row.getAttribute('data-dex')) || 1;
            st.customRate = '';
            saveState();
            render();
          });
        });
      };

      monInp.addEventListener('focus', function () {
        monInp.select();
        renderDD('');
      });
      monInp.addEventListener('input', function () {
        renderDD(monInp.value);
      });
      monInp.addEventListener('keydown', function (ev) {
        if (ev.key === 'Enter') {
          var first = monDD.querySelector('.catch-dd-row');
          if (first) {
            st.dexId = Number(first.getAttribute('data-dex')) || st.dexId;
            st.customRate = '';
            saveState();
            render();
          }
        } else if (ev.key === 'Escape') {
          monDD.classList.add('hidden');
          monInp.blur();
        }
      });
      monInp.addEventListener('blur', function () {
        setTimeout(function () {
          if (monDD) monDD.classList.add('hidden');
          var m = getMonInfo(st.dexId, st.game);
          if (monInp) monInp.value = '#' + m.dexId + ' ' + (de ? m.nameDe : m.nameEn);
        }, 150);
      });
    }

    var lvInp = document.getElementById('ccLevel');
    if (lvInp) {
      lvInp.addEventListener('input', function () {
        st.level = Math.max(1, Math.min(100, Number(lvInp.value) || 1));
        saveState();
        var mon = getMonInfo(st.dexId, st.game);
        var minH = calcMaxHPForIV(mon.baseHP, st.level, 0, game.gen);
        var maxH = calcMaxHPForIV(mon.baseHP, st.level, game.gen <= 2 ? 15 : 31, game.gen);
        var hint = document.getElementById('ccHpRangeHint');
        if (hint) {
          hint.innerHTML = (de ? 'Mögliche Max.-KP auf Lv. ' + st.level + ': ' : 'Possible Max HP at Lv. ' + st.level + ': ') +
            '<b>' + minH + ' – ' + maxH + ' KP</b> (' + (game.gen <= 2 ? '0–15 DVs' : '0–31 IVs') + ')';
        }
        updateCalculations();
      });
    }

    var crInp = document.getElementById('ccCustomRate');
    if (crInp) {
      crInp.addEventListener('input', function () {
        st.customRate = crInp.value.trim();
        saveState();
        updateCalculations();
      });
    }

    // KP-Modus umschalten
    var bPct = document.getElementById('ccHpModePct');
    var bEx = document.getElementById('ccHpModeExact');
    if (bPct) bPct.addEventListener('click', function () { st.hpMode = 'pct'; saveState(); render(); });
    if (bEx) bEx.addEventListener('click', function () {
      var mon = getMonInfo(st.dexId, st.game);
      var m31 = calcMaxHPForIV(mon.baseHP, st.level, game.gen <= 2 ? 15 : 31, game.gen);
      st.maxHP = m31;
      st.curHP = st.falseSwipe ? 1 : Math.max(1, Math.round((m31 * st.hpPct) / 100));
      st.hpMode = 'exact';
      saveState();
      render();
    });

    // KP-Slider & Presets
    var slider = document.getElementById('ccHpSlider');
    if (slider) {
      slider.addEventListener('input', function () {
        st.falseSwipe = false;
        st.hpPct = Math.max(1, Math.min(100, Number(slider.value) || 100));
        saveState();
        var ro = document.getElementById('ccHpReadout');
        if (ro) ro.textContent = st.hpPct + ' %';
        root.querySelectorAll('[data-hppct], #ccFalseSwipe').forEach(function (b) {
          b.classList.toggle('on', Number(b.getAttribute('data-hppct')) === st.hpPct);
        });
        updateCalculations();
      });
    }

    root.querySelectorAll('[data-hppct]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        st.falseSwipe = false;
        st.hpPct = Number(btn.getAttribute('data-hppct')) || 100;
        saveState();
        render();
      });
    });

    var fsBtn = document.getElementById('ccFalseSwipe');
    if (fsBtn) {
      fsBtn.addEventListener('click', function () {
        st.falseSwipe = !st.falseSwipe;
        saveState();
        render();
      });
    }

    // Exakte KP
    var curHpInp = document.getElementById('ccCurHP');
    var maxHpInp = document.getElementById('ccMaxHP');
    if (curHpInp && maxHpInp) {
      var onExHp = function () {
        st.maxHP = Math.max(1, Number(maxHpInp.value) || 1);
        st.curHP = Math.max(1, Math.min(st.maxHP, Number(curHpInp.value) || 1));
        saveState();
        updateCalculations();
      };
      curHpInp.addEventListener('input', onExHp);
      maxHpInp.addEventListener('input', onExHp);
    }
    var ex1 = document.getElementById('ccEx1HP');
    if (ex1) ex1.addEventListener('click', function () { st.curHP = 1; saveState(); render(); });
    var ex0 = document.getElementById('ccExIV0');
    if (ex0) ex0.addEventListener('click', function () {
      var mon = getMonInfo(st.dexId, st.game);
      st.maxHP = calcMaxHPForIV(mon.baseHP, st.level, 0, game.gen);
      st.curHP = Math.min(st.curHP, st.maxHP);
      saveState();
      render();
    });
    var ex31 = document.getElementById('ccExIV31');
    if (ex31) ex31.addEventListener('click', function () {
      var mon = getMonInfo(st.dexId, st.game);
      st.maxHP = calcMaxHPForIV(mon.baseHP, st.level, game.gen <= 2 ? 15 : 31, game.gen);
      st.curHP = Math.min(st.curHP, st.maxHP);
      saveState();
      render();
    });

    // Status-Buttons
    root.querySelectorAll('[data-status]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        st.status = btn.getAttribute('data-status') || 'none';
        saveState();
        root.querySelectorAll('[data-status]').forEach(function (b) {
          b.classList.toggle('on', b.getAttribute('data-status') === st.status);
        });
        updateCalculations();
      });
    });

    // Visuelle Ball-Auswahl (mit Ball-Sprites)
    root.querySelectorAll('.catch-ball-tile[data-ball]').forEach(function (tile) {
      tile.addEventListener('click', function () {
        st.ball = tile.getAttribute('data-ball') || 'ultraball';
        saveState();
        root.querySelectorAll('.catch-ball-tile[data-ball]').forEach(function (b) {
          b.classList.toggle('on', b.getAttribute('data-ball') === st.ball);
        });
        var ic = document.getElementById('ccBallIcon');
        if (ic) ic.innerHTML = ballIconHtml(st.ball);
        var nm = document.getElementById('ccBallName');
        if (nm && BALL_MAP[st.ball]) nm.textContent = de ? BALL_MAP[st.ball].nameDe : BALL_MAP[st.ball].nameEn;
        var desc = document.getElementById('ccBallDesc');
        if (desc && BALL_MAP[st.ball]) desc.textContent = de ? BALL_MAP[st.ball].descDe : BALL_MAP[st.ball].descEn;
        updateCalculations();
      });
    });

    // Runde & Eigenes Level
    var turnInp = document.getElementById('ccTurn');
    var t1Btn = document.getElementById('ccTurn1');
    var tMaxBtn = document.getElementById('ccTurnMax');
    if (turnInp) {
      turnInp.addEventListener('input', function () {
        st.turn = Math.max(1, Math.min(99, Number(turnInp.value) || 1));
        saveState();
        if (t1Btn) t1Btn.classList.toggle('on', st.turn === 1);
        if (tMaxBtn) tMaxBtn.classList.toggle('on', st.turn >= (game.gen >= 5 ? 11 : 31));
        updateCalculations();
      });
    }
    if (t1Btn) t1Btn.addEventListener('click', function () { st.turn = 1; saveState(); render(); });
    if (tMaxBtn) tMaxBtn.addEventListener('click', function () { st.turn = game.gen >= 5 ? 11 : 31; saveState(); render(); });

    var ourLvInp = document.getElementById('ccOurLevel');
    if (ourLvInp) {
      ourLvInp.addEventListener('input', function () {
        st.ourLevel = Math.max(1, Math.min(100, Number(ourLvInp.value) || 1));
        saveState();
        updateCalculations();
      });
    }

    // Checkboxen
    var bindChk = function (id, key) {
      var elChk = document.getElementById(id);
      if (elChk) {
        elChk.addEventListener('change', function () {
          st[key] = !!elChk.checked;
          saveState();
          updateCalculations();
        });
      }
    };
    bindChk('ccCaught', 'caughtBefore');
    bindChk('ccDarkCave', 'darkCave');
    bindChk('ccWater', 'water');
    bindChk('ccUnderwater', 'underwater');
    bindChk('ccFishing', 'fishing');
    bindChk('ccLove', 'sameSpeciesOppositeGender');
    bindChk('ccGscFix', 'gscFixBugs');
    bindChk('ccDarkGrass', 'darkGrass');
    bindChk('ccCharm', 'catchingCharm');

    // Dropdowns für Gen 5–9
    var dexSel = document.getElementById('ccDexTier');
    if (dexSel) {
      dexSel.addEventListener('change', function () {
        st.dexCaughtTier = Number(dexSel.value) || 0;
        saveState();
        updateCalculations();
      });
    }
    var pwrSel = document.getElementById('ccPowerMod');
    if (pwrSel) {
      pwrSel.addEventListener('change', function () {
        st.powerMod = Number(pwrSel.value) || 0;
        saveState();
        updateCalculations();
      });
    }
    var unwSel = document.getElementById('ccUnaware');
    if (unwSel) {
      unwSel.addEventListener('change', function () {
        st.unaware = unwSel.value;
        saveState();
        updateCalculations();
      });
    }
    var bdgSel = document.getElementById('ccBadges');
    if (bdgSel) {
      bdgSel.addEventListener('change', function () {
        st.badges = Number(bdgSel.value);
        saveState();
        updateCalculations();
      });
    }
  }

  // Selbsttest über alle Generationen (Gen 1 bis Gen 9)
  function selfTest() {
    var baseState = {
      customRate: '', level: 50, hpMode: 'pct', hpPct: 100, falseSwipe: true,
      curHP: 1, maxHP: 150, status: 'sleep', turn: 1, caughtBefore: true,
      darkCave: true, water: false, fishing: false, underwater: false,
      ourLevel: 80, sameSpeciesOppositeGender: false, gscFixBugs: false,
      darkGrass: false, dexCaughtTier: 5, catchingCharm: true, powerMod: 0,
      unaware: 'normal', badges: 8
    };
    var report = [];
    GAMES.forEach(function (g) {
      var dexId = Math.min(g.maxDex, 150); // Mewtu (#150, CR 3)
      var mon = getMonInfo(dexId, g.id);
      var rUltra = computeCatchResult(g.id, 'ultraball', mon, baseState);
      var rMaster = computeCatchResult(g.id, 'masterball', mon, baseState);
      if (!(rUltra.pTotal > 0 && rUltra.pTotal < 1) || rMaster.pTotal !== 1) {
        throw new Error('Catch selfTest failed for ' + g.id + ': ' + JSON.stringify(rUltra));
      }
      report.push(g.id + ':' + (rUltra.pTotal * 100).toFixed(2) + '%');
    });
    return report;
  }

  window.CCCatchCalc = {
    render: render,
    selfTest: selfTest,
    GAMES: GAMES,
    BALLS: BALLS
  };
})();

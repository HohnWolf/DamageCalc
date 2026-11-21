// Randomizer-Ansicht (#randomizerView): ROM wählen, Optionen einstellen, randomisierte Kopie speichern. Engine: js/rand_gen3.js
(function () {
  'use strict';
  var A = window.CC, R3 = window.CCRand3, RN = window.CCRandNds, N = window.NDS, G = window.GEN3, R5 = window.CCRandGen5, R67 = window.CCRand3DS, RGB = window.CCRandGB;
  if (!A || !R3 || !G) return;
  var R = R3, CR = window.CCRandCore;
  var el = A.el, esc = A.esc, de = A.LANG === 'de';
  var S = de ? {
    title: 'Randomizer', sub: 'Mischt wilde Pokémon, Trainer, Starter, Entwicklungen, Werte, Typen, Fähigkeiten und Attacken einer Spiel-ROM. Die Originaldatei bleibt unverändert, du bekommst eine neue Datei.',
    gens: 'Unterstützt: Generation 1 (Rot, Blau, Gelb), 2 (Gold, Silber, Kristall), 3 (Rubin, Saphir, Smaragd, Feuerrot, Blattgrün), 4 (Diamant, Perl, Platin, HeartGold, SoulSilver), 5 (Schwarz, Weiß, Schwarz 2, Weiß 2) und 6/7 (X, Y, Omega Rubin, Alpha Saphir, Sonne, Mond, Ultra Sonne, Ultra Mond; entschlüsselte .cxi).',
    pick: 'ROM wählen …', drop: 'oder eine ROM-Datei hierher ziehen', enc: 'Diese 3DS-Datei ist verschlüsselt. Gebraucht wird eine entschlüsselte .cxi (oder .3ds).', big: 'Große Datei, bitte kurz warten …', game: 'Erkannt:', scan: 'Gefunden: {0} Karten mit wilden Pokémon, {1} Trainer, Starter {2}, Entwicklungen {3}',
    yes: 'ja', no: 'nein', bad: 'Diese Datei wird nicht unterstützt. Gebraucht wird eine unveränderte ROM der Generation 1–7 (.gb/.gbc/.gba/.nds) oder eine entschlüsselte .cxi/.3ds.',
    wild: 'Wilde Pokémon', trainers: 'Trainer-Pokémon', starters: 'Starter', evo: 'Entwicklungen', stats: 'Basiswerte', types: 'Typen', abilities: 'Fähigkeiten', moves: 'Level-Attacken',
    keep: 'Unverändert', random: 'Zufällig', similar: 'Zufällig, ähnlich stark', custom: 'Eigene Auswahl', shuffle: 'Werte mischen', randomStats: 'Zufällig (gleiche Summe)',
    wildGlobal: 'Jede Art wird überall gleich ersetzt (1:1)', noLegend: 'Keine legendären Pokémon', trainerLevel: 'Trainer-Level ändern um', seed: 'Seed (leer = zufällig)',
    go: 'Randomisieren und speichern', running: 'Wird randomisiert …', log: 'Protokoll speichern', done: 'Fertig. Randomisierte ROM gespeichert', again: 'Gleiche ROM, Einstellungen und Seed ergeben immer dasselbe Ergebnis.',
    warn: 'Nutze die neue Datei nur mit einer Kopie deines Spielstands. Randomisierte Spiele können unfair oder unspielbar sein.',
    o_followEvoTypes: 'Typen: Weiterentwicklungen erben den Typ der Vorstufe', o_followEvoAbilities: 'Fähigkeiten: Weiterentwicklungen erben die Fähigkeiten der Vorstufe',
    o_allowWonderGuard: 'Wunderwache darf vorkommen', o_banTrapping: 'Keine Fallen-Fähigkeiten (Magnetfalle, Schattentag, Fallensteller)', o_banNegative: 'Keine schlechten Fähigkeiten (Bummler, Anlaufzeit, Defätist …)',
    o_moveTypePct: 'Level-Attacken: Anteil gleicher Typ (%)', o_evoSameType: 'Entwicklungen: neues Ziel teilt einen Typ mit der Vorstufe', o_evoForceChange: 'Entwicklungen: Ziel muss sich ändern',
    o_evoLimit3: 'Entwicklungen: höchstens drei Stufen', o_starterTwoEvo: 'Starter: nur Arten mit zwei Entwicklungen', o_starterSameType: 'Starter: alle drei vom gleichen Typ',
    o_wildAreaType: 'Wild: jedes Gebiet hat einen Typ (Typ-Thema)', o_wildArea1to1: 'Wild: pro Gebiet wird jede Art gleich ersetzt (1:1)', o_wildCatchAll: 'Wild: jede Art kommt mindestens einmal vor („Catch ’em all“)',
    o_rivalStarter: 'Rivale und Freunde behalten ihren Starter (entwickelt sich mit)', o_trainerTypeTheme: 'Trainer: jeder Trainer hat ein Typ-Thema', o_trainerNoDup: 'Trainer: keine doppelten Arten im Team',
    o_doubleBattleMode: 'Doppelkampf-Modus (alle Trainer mit ≥ 2 Pokémon kämpfen im Doppel)', o_shuffleTrainerNames: 'Trainer-Namen untereinander mischen',
    o_movePower: 'Attacken: Stärke zufällig', o_moveAcc: 'Attacken: Genauigkeit zufällig', o_movePP: 'Attacken: AP zufällig', o_moveType: 'Attacken: Typ zufällig', o_moveCat: 'Attacken: Art zufällig (physisch/speziell)',
    tmMoves: 'TM-Attacken', tmCompat: 'TM/HM-Kompatibilität', tmRandom: 'Zufällig', tmType: 'Zufällig, bevorzugt eigener Typ', tmFull: 'Alle können alles',
    o_tmGoodDamaging: 'TMs: Anteil guter Schadensattacken erzwingen', o_tmKeepField: 'TMs: Feldattacken-TMs behalten', o_tmFollowEvo: 'Kompatibilität: Weiterentwicklungen erben von der Vorstufe', o_tmSanity: 'Kompatibilität: Level-Attacken, die es als TM gibt, immer erlauben',
    tutorMoves: 'Attacken-Lehrer: Attacken', tutorCompat: 'Attacken-Lehrer: Kompatibilität', statics: 'Statische Pokémon & Geschenke', trades: 'Ingame-Tausche',
    totems: 'Herrscher-Pokémon (Totem)', o_totemLevelPct: 'Herrscher: Level ändern um (%)', o_totemAura: 'Herrscher: zufällige Totem-Aura',
    similarOpt: 'Zufällig, ähnlich stark', o_staticLegendSwap: 'Statische: Legendäre nur gegen Legendäre tauschen', o_staticLevelPct: 'Statische: Level ändern um (%)', o_tradeRequested: 'Tausche: auch die verlangte Art ändern',
    staticNote: 'In Gen 3 werden Mew/Deoxys-Gehorsam und das Kanto-Dex-Entwicklungslimit automatisch gepatcht.',
    o_evoImpossible: 'Unmögliche Entwicklungen ersetzen (Tausch → Level 37, Tausch mit Item, Schönheit …)', o_evoNoTime: 'Tageszeit-Entwicklungen beides erlauben (Tag und Nacht)', o_evoEasier: 'Entwicklungen erleichtern (Level höchstens 30/40)',
    expCurve: 'EP-Kurve vereinheitlichen', cMediumFast: 'Mittelschnell', cMediumSlow: 'Mittellangsam', cFast: 'Schnell', cSlow: 'Langsam', cErratic: 'Unregelmäßig', cFluctuating: 'Schwankend', o_expLegendsSlow: 'EP-Kurve: Legendäre bleiben langsam',
    fieldItems: 'Items auf dem Feld (inkl. versteckte)', shops: 'Shop-Inhalte', trainerItems: 'Trainer-Items', o_fieldTMShuffle: 'Feld-TMs untereinander mischen', o_shopBanRegular: 'Shops: normale Shop-Items ausschließen', o_shopBanOP: 'Shops: sehr starke Items ausschließen', o_itemsBanBad: 'Items: keine schlechten Items (Beeren, Briefe, Spezial-Items …)',
    itemsNote: 'Schwarz/Weiß (Teil 1) hat keine änderbaren Shops; Trainer-Items ändern nur Trainer, die schon ein Item tragen.',
    qolHead: 'Qualitäts-Patches (QoL)', o_fastestText: 'Schnellste Textgeschwindigkeit (Sofort-Text)', o_runIndoors: 'Turbotreter in Gebäuden erlauben', o_pcPotion: 'Trank im eigenen PC durch zufälliges Item ersetzen', o_updateTypeEff: 'Typ-Effektivität auf Gen 6+ aktualisieren (Geist/Unlicht neutral gegen Stahl)',
    logShow: 'Protokoll anzeigen', rivalHead: 'Rivale & Freunde', wildAssign: 'Zuordnung', itemsFilter: 'Filter', dropTitle: 'ROM hierher ziehen', changeRom: 'Andere ROM wählen …', chipAreas: 'Gebiete', chipTrainers: 'Trainer', chipStarters: 'Starter', chipEvos: 'Entwicklungen', chipYes: 'ja', chipNo: 'nein', randomHead: 'Zufall & Auswahl',
    genList: [['Gen 1', 'Rot · Blau · Gelb'], ['Gen 2', 'Gold · Silber · Kristall'], ['Gen 3', 'Rubin · Saphir · Smaragd · Feuerrot · Blattgrün'], ['Gen 4', 'Diamant · Perl · Platin · HeartGold · SoulSilver'], ['Gen 5', 'Schwarz · Weiß · Schwarz 2 · Weiß 2'], ['Gen 6', 'X · Y · Omega Rubin · Alpha Saphir'], ['Gen 7', 'Sonne · Mond · Ultra Sonne · Ultra Mond']], toNuz: 'Im Nuzlocke-Rechner öffnen', pickupItems: 'Pickup-Items', wildHeldItems: 'Gehaltene Items wilder Pokémon',
    o_updateStats: 'Basiswerte auf eine spätere Generation aktualisieren (Änderungen bis Gen …)', o_updateMoves: 'Attacken auf eine spätere Generation aktualisieren (Stärke, AP, Genauigkeit, Typ)',
    o_natDexStart: 'Nationaler Pokédex ab Spielbeginn (Entwicklungen und Fangen außerhalb von Kanto/Hoenn)', o_starterHeldItem: 'Starter trägt ein zufälliges Item', o_tradeIVs: 'Tausche: zufällige IVs', o_tradeItems: 'Tausche: zufälliges Item',
    tabGeneral: 'Allgemein', tabMon: 'Pokémon', tabStart: 'Starter & Statische', tabWild: 'Wilde Pokémon', tabTrainer: 'Trainer', tabMoves: 'Attacken', tabItems: 'Items',
    genWord: 'Gen', genNote: 'Die Generationen begrenzen, welche Arten beim Zufall vorkommen dürfen. Wenn alle (oder keine) aktiv sind, gibt es keine Begrenzung.', noStarters: 'Für diese ROM lassen sich die Starter nicht ändern.',
    moveData: 'Attacken-Daten',
    o_limitGens: 'Nur diese Generationen verwenden:', o_dualTypeOnly: 'Typen: jedes Pokémon bekommt zwei Typen', o_banBadAbilities: 'Keine nutzlosen Fähigkeiten (Plus, Minus, Vorahnung, Vorwarnung, Schnüffler, Honigsammler …)',
    o_ensureTwoAbilities: 'Fähigkeiten: jedes Pokémon bekommt zwei verschiedene Fähigkeiten', o_statsFollowEvo: 'Basiswerte: Weiterentwicklungen behalten den Abstand zur Vorstufe',
    o_movesGuaranteed: 'Level-Attacken: Anzahl Attacken schon auf Level 1', o_movesReorderDamaging: 'Level-Attacken: früh eine Schadensattacke', o_movesGoodDamagingPct: 'Level-Attacken: Anteil guter Schadensattacken (%)',
    o_movesBlockBroken: 'Level-Attacken: keine Festschaden-Attacken (Schallwelle, Drachenwut)', o_trainerFullyEvolved: 'Trainer: ab einem Level nur voll entwickelte Arten', o_trainerFullyEvolvedLevel: 'Trainer: voll entwickelt ab Level',
    o_starterMax600: 'Starter: Basiswert-Summe höchstens 600',
    catchRate: 'Mindest-Fangrate', cr1: 'Leicht (75, Legendäre 37)', cr2: 'Mittel (128, Legendäre 64)', cr3: 'Hoch (200, Legendäre 100)', cr4: 'Immer fangbar (255)',
    wildLevelPct: 'Wilde Pokémon: Level ändern um (%)',
    presets: 'Voreinstellungen', pStd: 'Standard', pStdDesc: 'Wilde Pokémon & Trainer zufällig', pChaos: 'Chaos', pChaosDesc: 'Typen, Werte, Attacken & mehr zufällig', pCasual: 'Fair & ähnlich stark', pCasualDesc: 'Ähnliche Stärke, ohne Legendäre', pNone: 'Alles unverändert', pNoneDesc: 'Alle Optionen auf Aus zurücksetzen',
    code: 'Einstellungscode (RL1:…)', codeCopy: 'Kopieren', codeLoad: 'Laden', codeBad: 'Der Einstellungscode ist ungültig.', copied: 'Kopiert!',
    activeNone: 'Keine Änderungen aktiv', activeOne: '1 Option aktiv', activeMany: '{0} Optionen aktiv', seedCopyHint: 'Seed kopieren'
  } : {
    title: 'Randomizer', sub: 'Shuffles wild Pokémon, trainers, starters, evolutions, stats, types, abilities and moves of a game ROM. The original file stays untouched, you get a new file.',
    gens: 'Supported: generation 1 (Red, Blue, Yellow), 2 (Gold, Silver, Crystal), 3 (Ruby, Sapphire, Emerald, FireRed, LeafGreen), 4 (Diamond, Pearl, Platinum, HeartGold, SoulSilver), 5 (Black, White, Black 2, White 2) and 6/7 (X, Y, Omega Ruby, Alpha Sapphire, Sun, Moon, Ultra Sun, Ultra Moon; decrypted .cxi).',
    pick: 'Choose ROM …', drop: 'or drag a ROM file here', enc: 'This 3DS file is encrypted. A decrypted .cxi (or .3ds) is required.', big: 'Large file, please wait …', game: 'Detected:', scan: 'Found: {0} maps with wild Pokémon, {1} trainers, starters {2}, evolutions {3}',
    yes: 'yes', no: 'no', bad: 'This file is not supported. An unmodified generation 1–7 ROM (.gb/.gbc/.gba/.nds) or a decrypted .cxi/.3ds is required.',
    wild: 'Wild Pokémon', trainers: 'Trainer Pokémon', starters: 'Starters', evo: 'Evolutions', stats: 'Base stats', types: 'Types', abilities: 'Abilities', moves: 'Level-up moves',
    keep: 'Unchanged', random: 'Random', similar: 'Random, similar strength', custom: 'Custom', shuffle: 'Shuffle stats', randomStats: 'Random (same total)',
    wildGlobal: 'Each species is replaced the same everywhere (1:1)', noLegend: 'No legendary Pokémon', trainerLevel: 'Change trainer levels by', seed: 'Seed (empty = random)',
    go: 'Randomize and save', running: 'Randomizing …', log: 'Save log', done: 'Done. Randomized ROM saved', again: 'Same ROM, settings and seed always produce the same result.',
    warn: 'Use the new file only with a copy of your save. Randomized games can be unfair or unplayable.',
    o_followEvoTypes: 'Types: evolutions inherit the type of the previous stage', o_followEvoAbilities: 'Abilities: evolutions inherit the abilities of the previous stage',
    o_allowWonderGuard: 'Allow Wonder Guard', o_banTrapping: 'No trapping abilities (Magnet Pull, Shadow Tag, Arena Trap)', o_banNegative: 'No bad abilities (Truant, Slow Start, Defeatist …)',
    o_moveTypePct: 'Level-up moves: share of same type (%)', o_evoSameType: 'Evolutions: new target shares a type with the previous stage', o_evoForceChange: 'Evolutions: target must change',
    o_evoLimit3: 'Evolutions: at most three stages', o_starterTwoEvo: 'Starters: only species with two evolutions', o_starterSameType: 'Starters: all three of the same type',
    o_wildAreaType: 'Wild: each area has a type theme', o_wildArea1to1: 'Wild: each species is replaced the same way within an area (1:1)', o_wildCatchAll: 'Wild: every species appears at least once (catch em all)',
    o_rivalStarter: 'Rival and friends keep their starter (evolves along)', o_trainerTypeTheme: 'Trainers: each trainer has a type theme', o_trainerNoDup: 'Trainers: no duplicate species in a team',
    o_doubleBattleMode: 'Double battle mode (all trainers with ≥ 2 Pokémon fight in doubles)', o_shuffleTrainerNames: 'Shuffle trainer names among trainers',
    o_movePower: 'Moves: random power', o_moveAcc: 'Moves: random accuracy', o_movePP: 'Moves: random PP', o_moveType: 'Moves: random type', o_moveCat: 'Moves: random category (physical/special)',
    tmMoves: 'TM moves', tmCompat: 'TM/HM compatibility', tmRandom: 'Random', tmType: 'Random, prefer own type', tmFull: 'Everything can learn everything',
    o_tmGoodDamaging: 'TMs: force a share of good damaging moves', o_tmKeepField: 'TMs: keep field-move TMs', o_tmFollowEvo: 'Compatibility: evolutions inherit from the previous stage', o_tmSanity: 'Compatibility: always allow level-up moves that exist as a TM',
    tutorMoves: 'Move tutors: moves', tutorCompat: 'Move tutors: compatibility', statics: 'Static Pokémon & gifts', trades: 'In-game trades',
    totems: 'Totem Pokémon', o_totemLevelPct: 'Totems: change level by (%)', o_totemAura: 'Totems: random Totem Aura',
    similarOpt: 'Random, similar strength', o_staticLegendSwap: 'Statics: swap legendaries only with legendaries', o_staticLevelPct: 'Statics: change level by (%)', o_tradeRequested: 'Trades: also change the requested species',
    staticNote: 'In Gen 3, Mew/Deoxys obedience and the Kanto Dex evolution limit are patched automatically.',
    o_evoImpossible: 'Replace impossible evolutions (trade → level 37, trade with item, beauty …)', o_evoNoTime: 'Allow time-based evolutions at day and night', o_evoEasier: 'Make evolutions easier (level at most 30/40)',
    expCurve: 'Standardize EXP curve', cMediumFast: 'Medium Fast', cMediumSlow: 'Medium Slow', cFast: 'Fast', cSlow: 'Slow', cErratic: 'Erratic', cFluctuating: 'Fluctuating', o_expLegendsSlow: 'EXP curve: legendaries stay slow',
    fieldItems: 'Field items (incl. hidden)', shops: 'Shop contents', trainerItems: 'Trainer items', o_fieldTMShuffle: 'Shuffle field TMs among themselves', o_shopBanRegular: 'Shops: exclude regular shop items', o_shopBanOP: 'Shops: exclude very strong items', o_itemsBanBad: 'Items: no bad items (berries, mail, special items …)',
    itemsNote: 'Black/White (part 1) has no editable shops; trainer items only change trainers that already hold an item.',
    qolHead: 'Quality-of-life patches', o_fastestText: 'Fastest text speed (instant text)', o_runIndoors: 'Allow Running Shoes indoors', o_pcPotion: 'Randomize PC Potion', o_updateTypeEff: 'Update type effectiveness to Gen 6+ (Ghost/Dark neutral vs Steel)',
    logShow: 'Show log', rivalHead: 'Rival & friends', wildAssign: 'Assignment', itemsFilter: 'Filter', dropTitle: 'Drop a ROM here', changeRom: 'Choose another ROM …', chipAreas: 'Areas', chipTrainers: 'Trainers', chipStarters: 'Starters', chipEvos: 'Evolutions', chipYes: 'yes', chipNo: 'no', randomHead: 'Randomness & selection',
    genList: [['Gen 1', 'Red · Blue · Yellow'], ['Gen 2', 'Gold · Silver · Crystal'], ['Gen 3', 'Ruby · Sapphire · Emerald · FireRed · LeafGreen'], ['Gen 4', 'Diamond · Pearl · Platinum · HeartGold · SoulSilver'], ['Gen 5', 'Black · White · Black 2 · White 2'], ['Gen 6', 'X · Y · Omega Ruby · Alpha Sapphire'], ['Gen 7', 'Sun · Moon · Ultra Sun · Ultra Moon']], toNuz: 'Open in Nuzlocke calculator', pickupItems: 'Pickup items', wildHeldItems: 'Held items of wild Pokémon',
    o_updateStats: 'Update base stats to a later generation (changes up to gen …)', o_updateMoves: 'Update moves to a later generation (power, PP, accuracy, type)',
    o_natDexStart: 'National Pokédex from the start (evolutions and catching beyond Kanto/Hoenn)', o_starterHeldItem: 'Starter holds a random item', o_tradeIVs: 'Trades: random IVs', o_tradeItems: 'Trades: random item',
    tabGeneral: 'General', tabMon: 'Pokémon', tabStart: 'Starters & statics', tabWild: 'Wild Pokémon', tabTrainer: 'Trainers', tabMoves: 'Moves', tabItems: 'Items',
    genWord: 'Gen', genNote: 'Generations limit which species can appear in random choices. With all (or none) active there is no limit.', noStarters: 'The starters of this ROM cannot be changed.',
    moveData: 'Move data',
    o_limitGens: 'Only use these generations:', o_dualTypeOnly: 'Types: every Pokémon gets two types', o_banBadAbilities: 'No useless abilities (Plus, Minus, Anticipation, Forewarn, Frisk, Honey Gather …)',
    o_ensureTwoAbilities: 'Abilities: every Pokémon gets two different abilities', o_statsFollowEvo: 'Base stats: evolutions keep their offset from the previous stage',
    o_movesGuaranteed: 'Level-up moves: number of moves already at level 1', o_movesReorderDamaging: 'Level-up moves: a damaging move early', o_movesGoodDamagingPct: 'Level-up moves: share of good damaging moves (%)',
    o_movesBlockBroken: 'Level-up moves: no fixed-damage moves (Sonic Boom, Dragon Rage)', o_trainerFullyEvolved: 'Trainers: only fully evolved species from a level on', o_trainerFullyEvolvedLevel: 'Trainers: fully evolved from level',
    o_starterMax600: 'Starters: base stat total at most 600',
    catchRate: 'Minimum catch rate', cr1: 'Easy (75, legendary 37)', cr2: 'Medium (128, legendary 64)', cr3: 'High (200, legendary 100)', cr4: 'Always catchable (255)',
    wildLevelPct: 'Wild Pokémon: change level by (%)',
    presets: 'Presets', pStd: 'Default', pStdDesc: 'Wild Pokémon & trainers random', pChaos: 'Chaos', pChaosDesc: 'Types, stats, moves & more random', pCasual: 'Fair & similar strength', pCasualDesc: 'Similar strength, no legendaries', pNone: 'Everything unchanged', pNoneDesc: 'Reset all options to off',
    code: 'Settings code (RL1:…)', codeCopy: 'Copy', codeLoad: 'Load', codeBad: 'The settings code is invalid.', copied: 'Copied!',
    activeNone: 'No active changes', activeOne: '1 active option', activeMany: '{0} active options', seedCopyHint: 'Copy seed'
  };

  var st = { eng: null, ext: 'gba', rom: null, buf: null, name: '', info: null, opts: JSON.parse(JSON.stringify(R.DEFAULTS)), msg: '', err: '', log: '', lastSeed: '', busy: false, preset: 'pStd' };
  var root;

  function download(name, bytes, mime) { A.saveFile(name, bytes, mime); }
  function setup(eng, rom, info, ext, name, extra) {
    st.eng = eng; st.ext = ext; st.opts = JSON.parse(JSON.stringify(eng.DEFAULTS)); st.preset = 'pStd';
    st.rom = rom; st.name = name; st.info = info; st.kind = extra && extra.kind || 'buf';
    st.ctx = extra && extra.ctx || null; st.buf = extra && extra.buf || null; st.lastSeed = '';
    if (ext === 'gba' && eng.makePool) {
      var pool = eng.makePool(rom, false), first = pool.filter(function (s) { return rom.species[s].nat === (rom.frlg ? 1 : 252); })[0] || pool[0];
      st.opts.starterPick = [first, first, first];
    } else {
      var g = curMaxGen(), dflt = { 1: [1, 4, 7], 2: [152, 155, 158], 4: [387, 390, 393], 5: [495, 498, 501], 6: [650, 653, 656], 7: [722, 725, 728] };
      st.opts.starterPick = (dflt[g] || [1, 4, 7]).slice();
    }
  }
  function load(file) {
    st.err = ''; st.msg = ''; st.log = ''; st.rom = null; st.lastSeed = '';
    var ext = (file.name.split('.').pop() || '').toLowerCase();
    if (ext === 'cxi' || ext === '3ds') {
      if (!R67) { st.err = S.bad; return render(); }
      st.busy = true; st.msg = S.big; render();
      R67.open(R67.fileSource(file)).then(function (ctx) {
        return R67.scan(ctx).then(function (info) {
          st.busy = false; st.msg = '';
          setup(R67, { game: ctx.g.name, gameEn: ctx.g.nameEn, code: ctx.code, title: ctx.g.nameEn }, info, ext, file.name, { kind: '3ds', ctx: ctx });
          render();
        });
      }).catch(function (e) { st.busy = false; st.msg = ''; st.rom = null; st.err = /encrypted/.test(String(e && e.message)) ? S.enc : S.bad; render(); });
      return;
    }
    var fr = new FileReader();
    fr.onload = function () {
      try {
        var u8 = new Uint8Array(fr.result), rom, eng;
        if (ext === 'nds') {
          if (!RN || !N) throw new Error('x');
          rom = N.parseRom(u8);
          eng = rom.gen === 4 ? RN : R5;
          if (!eng) throw new Error('x');
        } else if (ext === 'gb' || ext === 'gbc') {
          if (!RGB) throw new Error('x');
          rom = RGB.parseRom(u8); eng = RGB;
        } else { rom = G.parseRom(u8); eng = R3; }
        setup(eng, rom, eng.scan(rom, u8), ext, file.name, { buf: u8 });
      } catch (e) { st.rom = null; st.err = S.bad; }
      render();
    };
    fr.readAsArrayBuffer(file);
  }

  function isOn(v) { return v && v !== 'keep' && v !== '0' && v !== 0; }
  function tabCount(k) {
    var o = st.opts, n = 0;
    if (k === 'gen') {
      if (o.noLegend) n++;
      if (o.limitGens && o.limitGens.length) n++;
      if (o.fastestText) n++;
      if (o.runIndoors) n++;
      if (o.pcPotion) n++;
    } else if (k === 'mon') {
      ['stats', 'types', 'abilities', 'evo', 'expCurve'].forEach(function (x) { if (isOn(o[x])) n++; });
      if (Number(o.updateStats) > 0) n++;
      if (o.evoImpossible) n++;
      if (o.evoNoTime) n++;
      if (o.evoEasier) n++;
    } else if (k === 'start') {
      ['starters', 'statics', 'trades', 'totems'].forEach(function (x) { if (isOn(o[x])) n++; });
      if (o.natDexStart) n++;
      if (o.staticLevelPct) n++;
      if (o.totemLevelPct) n++;
      if (o.totemAura) n++;
    } else if (k === 'wild') {
      if (isOn(o.wild)) n++;
      if (o.wildLevelPct) n++;
      if (isOn(o.catchRate)) n++;
    } else if (k === 'trainer') {
      if (isOn(o.trainers)) n++;
      if (o.trainerLevel) n++;
      if (o.trainerFullyEvolved) n++;
      if (isOn(o.trainerItems)) n++;
      if (o.rivalStarter && isOn(o.trainers)) n++;
      if (o.doubleBattleMode) n++;
      if (o.shuffleTrainerNames) n++;
    } else if (k === 'moves') {
      ['moves', 'tmMoves', 'tmCompat', 'tutorMoves', 'tutorCompat'].forEach(function (x) { if (isOn(o[x])) n++; });
      if (Number(o.updateMoves) > 0) n++;
      if (o.movePower || o.moveAcc || o.movePP || o.moveType || o.moveCat) n++;
    } else if (k === 'items') {
      ['fieldItems', 'pickupItems', 'wildHeldItems', 'shops'].forEach(function (x) { if (isOn(o[x])) n++; });
    }
    return n;
  }
  function totalActive() {
    var caps = (st.eng && st.eng.CAPS) || {}, keys = ['gen', 'mon', 'start', 'wild', 'trainer', 'moves'];
    if (caps.items) keys.push('items');
    return keys.reduce(function (a, k) { return a + tabCount(k); }, 0);
  }
  function refreshBadges() {
    if (!root) return;
    var tabs = root.querySelectorAll('.rd-tabs .sv-tab[data-tab]');
    for (var i = 0; i < tabs.length; i++) {
      var k = tabs[i].getAttribute('data-tab'), c = tabCount(k), bd = tabs[i].querySelector('.rd-tbadge');
      if (c > 0) {
        if (!bd) { bd = el('span', { class: 'rd-tbadge' }); tabs[i].appendChild(bd); }
        bd.textContent = String(c);
      } else if (bd) bd.remove();
    }
    var sum = root.querySelector('.rd-summary');
    if (sum) {
      var tot = totalActive();
      sum.textContent = tot === 0 ? S.activeNone : (tot === 1 ? S.activeOne : S.activeMany.replace('{0}', tot));
      sum.classList.toggle('on', tot > 0);
    }
    var secs = root.querySelectorAll('.rd-sec');
    for (var j = 0; j < secs.length; j++) {
      secs[j].classList.toggle('has-active', !!secs[j].querySelector('.is-active, .rd-genpill.on'));
    }
    var segs = root.querySelectorAll('.rd-segbtn');
    for (var s = 0; s < segs.length; s++) segs[s].classList.toggle('on', segs[s].getAttribute('data-preset') === st.preset);
  }

  function sel(key, choices, labels) {
    var s = el('select', { class: 'rd-sel' }, choices.map(function (c) { return '<option value="' + c + '"' + (String(st.opts[key]) === c ? ' selected' : '') + '>' + esc(labels[c]) + '</option>'; }).join(''));
    s.onchange = function () {
      st.opts[key] = s.value; st.preset = '';
      var r = s.closest('.rd-row'); if (r) r.classList.toggle('is-active', isOn(s.value));
      if (key === 'starters' || key === 'trainers') render(); else refreshBadges();
    };
    return s;
  }
  function row(label, ctrl, active) {
    var r = el('label', { class: 'rd-row' + (active ? ' is-active' : '') });
    r.appendChild(el('span', { class: 'rd-lbl', text: label }));
    r.appendChild(ctrl);
    return r;
  }
  function check(key, label) {
    var c = el('input', { type: 'checkbox' }); c.checked = !!st.opts[key];
    var l = el('label', { class: 'rd-check' + (c.checked ? ' is-active' : '') });
    c.onchange = function () { st.opts[key] = c.checked; st.preset = ''; l.classList.toggle('is-active', c.checked); refreshBadges(); };
    l.appendChild(c); l.appendChild(el('span', { text: label })); return l;
  }
  function adv() { return st.eng && st.eng.DEFAULTS && 'followEvoTypes' in st.eng.DEFAULTS; }
  var PRESETS = {
    pStd: function (d) { return d; },
    pNone: function (d) { d.wild = d.trainers = d.starters = d.evo = d.stats = d.types = d.abilities = d.moves = 'keep'; return d; },
    pChaos: function (d) { d.wild = d.trainers = d.evo = d.types = d.abilities = d.moves = 'random'; d.stats = 'random'; if (adv()) d.wildCatchAll = true; return d; },
    pCasual: function (d) {
      d.wild = d.trainers = d.evo = 'similar'; d.noLegend = true; d.starters = 'random'; d.abilities = 'random'; d.moves = 'keep'; d.stats = 'keep'; d.types = 'keep';
      if (adv()) { d.banTrapping = d.banNegative = d.evoLimit3 = d.wildArea1to1 = d.trainerNoDup = d.starterTwoEvo = true; }
      return d;
    }
  };
  function applyPreset(name) {
    var keepSeed = st.opts.seed, pk = st.opts.starterPick, d = PRESETS[name](JSON.parse(JSON.stringify(st.eng.DEFAULTS)));
    d.seed = keepSeed; if (pk) d.starterPick = pk; st.opts = d; st.preset = name; st.msg = ''; st.err = ''; render();
  }
  function presetBar() {
    var w = el('div', { class: 'rd-presets' }), pr = el('div', { class: 'rd-seg' }), cr = el('div', { class: 'rd-coderow' });
    ['pStd', 'pCasual', 'pChaos', 'pNone'].forEach(function (k) {
      var b = el('button', { type: 'button', class: 'rd-segbtn' + (st.preset === k ? ' on' : '') });
      b.setAttribute('data-preset', k);
      b.appendChild(el('b', { text: S[k] }));
      b.appendChild(el('span', { text: S[k + 'Desc'] }));
      b.onclick = function () { applyPreset(k); };
      pr.appendChild(b);
    });
    w.appendChild(pr); w.appendChild(cr);
    var inp = el('input', { type: 'text', class: 'rd-seed rd-code', placeholder: S.code });
    var cp = el('button', { type: 'button', class: 'rd-logbtn', text: S.codeCopy });
    cp.onclick = function () {
      inp.value = encodeCode();
      try { navigator.clipboard.writeText(inp.value); } catch (e) { inp.select(); }
      cp.textContent = S.copied; setTimeout(function () { cp.textContent = S.codeCopy; }, 1400);
    };
    var ld = el('button', { type: 'button', class: 'rd-logbtn', text: S.codeLoad });
    ld.onclick = function () { if (decodeCode(inp.value)) { st.preset = ''; st.msg = ''; st.err = ''; render(); } else { st.err = S.codeBad; render(); } };
    cr.appendChild(inp); cr.appendChild(cp); cr.appendChild(ld);
    return w;
  }
  function encodeCode() {
    var o = JSON.parse(JSON.stringify(st.opts)); delete o.starterPick;
    var d = st.eng.DEFAULTS, diff = {};
    Object.keys(o).forEach(function (k) { if (JSON.stringify(o[k]) !== JSON.stringify(d[k])) diff[k] = o[k]; });
    return 'RL1:' + btoa(unescape(encodeURIComponent(JSON.stringify(diff))));
  }
  function decodeCode(c) {
    try {
      c = String(c || '').trim(); if (c.indexOf('RL1:') !== 0) return false;
      var o = JSON.parse(decodeURIComponent(escape(atob(c.slice(4))))), d = JSON.parse(JSON.stringify(st.eng.DEFAULTS));
      Object.keys(o).forEach(function (k) { if (k in d) d[k] = o[k]; });
      if (st.opts.starterPick) d.starterPick = st.opts.starterPick;
      st.opts = d; return true;
    } catch (e) { return false; }
  }
  // ---------------- Optionen in Unterkategorien (Tabs) ----------------
  function numRow(key, label, min, max, step) {
    var n = el('input', { type: 'number', min: min, max: max, step: step, class: 'rd-num' }); n.value = st.opts[key] || 0;
    var dflt = (st.eng && st.eng.DEFAULTS && st.eng.DEFAULTS[key]) || 0;
    var r = row(label, n, (st.opts[key] || 0) !== dflt);
    n.onchange = function () {
      st.opts[key] = Math.max(min, Math.min(max, +n.value || 0)); n.value = st.opts[key]; st.preset = '';
      r.classList.toggle('is-active', st.opts[key] !== dflt); refreshBadges();
    };
    return r;
  }
  function updateRow(key, label, firstGen) {
    var engGen = st.rom && st.ext ? curMaxGen() : 3, ch = ['0'], lb = { 0: S.keep };
    for (var gn = Math.max(engGen + 1, firstGen); gn <= 9; gn++) { ch.push(String(gn)); lb[gn] = S.genWord + ' ' + gn; }
    if (ch.length < 2) return el('span');
    return modeRow(key, label, ch, lb);
  }
  function starterPool() {
    if (st.ext === 'gba' || st.ext === 'nds') { if (st.eng.makePool) return st.eng.makePool(st.rom, false); }
    var mx = { 1: 151, 2: 251, 4: 493, 5: 649, 6: 721, 7: 807 }[curMaxGen()] || 151, a = [];
    for (var i = 1; i <= mx; i++) a.push(i);
    return a;
  }
  function curMaxGen() {
    var isGb = st.ext === 'gb' || st.ext === 'gbc';
    if (isGb) return st.rom && st.rom.gen === 1 ? 1 : 2;
    if (st.ext === 'gba') return 3;
    if (st.ext === 'nds') return st.rom && st.rom.gen === 4 ? 4 : 5;
    return st.ctx && st.ctx.g && st.ctx.g.gen === 7 ? 7 : 6;
  }
  function modeRow(key, label, choices, labels) { return row(label, sel(key, choices, labels), isOn(st.opts[key])); }
  function genBoxes(maxGen) {
    var w = el('div', { class: 'rd-gens' }), pills = el('div', { class: 'rd-genpills' });
    w.appendChild(el('span', { class: 'rd-lbl', text: S.o_limitGens }));
    w.appendChild(pills);
    function syncPills() {
      var btns = pills.querySelectorAll('.rd-genpill');
      for (var i = 0; i < btns.length; i++) {
        var g = +btns[i].getAttribute('data-gen');
        btns[i].classList.toggle('on', !st.opts.limitGens.length || st.opts.limitGens.indexOf(g) !== -1);
      }
      refreshBadges();
    }
    for (var gn = 1; gn <= maxGen; gn++) (function (gn) {
      var on = !st.opts.limitGens.length || st.opts.limitGens.indexOf(gn) !== -1;
      var b = el('button', { type: 'button', class: 'rd-genpill' + (on ? ' on' : ''), text: S.genWord + ' ' + gn });
      b.setAttribute('data-gen', gn);
      b.onclick = function () {
        var cur = st.opts.limitGens.length ? st.opts.limitGens.slice() : [];
        if (!cur.length) for (var q = 1; q <= maxGen; q++) cur.push(q);
        var ix = cur.indexOf(gn);
        if (ix === -1) cur.push(gn); else cur.splice(ix, 1);
        if (cur.length === maxGen || !cur.length) cur = [];
        st.opts.limitGens = cur; st.preset = ''; syncPills();
      };
      pills.appendChild(b);
    })(gn);
    return w;
  }
  function optionTabs(info) {
    var caps = st.eng.CAPS || {}, kinds = { keep: S.keep, random: S.random, similar: S.similarOpt }, mode = { keep: S.keep, random: S.random, similar: S.similar };
    var isGba = st.ext === 'gba', isGb = st.ext === 'gb' || st.ext === 'gbc';
    var maxGen = isGb ? (st.rom && st.rom.gen === 1 ? 1 : 2) : isGba ? 3 : st.ext === 'nds' ? (st.rom && st.rom.gen === 4 ? 4 : 5) : (st.ctx && st.ctx.g && st.ctx.g.gen === 7 ? 7 : 6);
    if (isGb && st.rom && st.rom.gen === 1) maxGen = 1;
    var P = {};
    function panel(k) { P[k] = el('div', { class: 'rd-panel' }); return P[k]; }
    function grid(p) { var g = el('div', { class: 'rd-grid' }); p.appendChild(g); return g; }
    function head(p, text) {
      var h = el('h4', { class: 'rd-sub' });
      h.appendChild(el('span', { class: 'rd-sec-dot' }));
      h.appendChild(el('span', { text: text }));
      p.appendChild(h);
    }
    function note(p, text) { p.appendChild(el('p', { class: 'hint', text: text })); }

    // Allgemein
    var pg = panel('gen');
    head(pg, S.presets);
    pg.appendChild(presetBar());
    head(pg, S.randomHead);
    var g0 = grid(pg);
    var seed = el('input', { type: 'text', class: 'rd-seed', placeholder: '…' }); seed.value = st.opts.seed || '';
    var seedRow = row(S.seed, seed, !!st.opts.seed);
    seed.oninput = function () { st.opts.seed = seed.value; seedRow.classList.toggle('is-active', !!seed.value); };
    g0.appendChild(seedRow);
    pg.appendChild(check('noLegend', S.noLegend));
    if (maxGen > 1) pg.appendChild(genBoxes(maxGen));
    note(pg, S.genNote);
    if (isGba || isGb) {
      head(pg, S.qolHead);
      pg.appendChild(check('fastestText', S.o_fastestText));
      if (isGba) pg.appendChild(check('runIndoors', S.o_runIndoors));
      if (isGba || (isGb && maxGen === 1)) pg.appendChild(check('pcPotion', S.o_pcPotion));
      if (isGba || (isGb && maxGen === 2)) pg.appendChild(check('updateTypeEff', S.o_updateTypeEff));
    }

    // Pokémon
    var pm = panel('mon');
    head(pm, S.stats);
    var g1 = grid(pm);
    g1.appendChild(modeRow('stats', S.stats, ['keep', 'shuffle', 'random'], { keep: S.keep, shuffle: S.shuffle, random: S.randomStats }));
    pm.appendChild(check('statsFollowEvo', S.o_statsFollowEvo));
    grid(pm).appendChild(updateRow('updateStats', S.o_updateStats, 6));
    head(pm, S.types);
    grid(pm).appendChild(modeRow('types', S.types, ['keep', 'random'], mode));
    pm.appendChild(check('followEvoTypes', S.o_followEvoTypes));
    pm.appendChild(check('dualTypeOnly', S.o_dualTypeOnly));
    head(pm, S.abilities);
    grid(pm).appendChild(modeRow('abilities', S.abilities, ['keep', 'random'], mode));
    ['followEvoAbilities', 'allowWonderGuard', 'banTrapping', 'banNegative', 'banBadAbilities', 'ensureTwoAbilities'].forEach(function (k) { pm.appendChild(check(k, S['o_' + k])); });
    head(pm, S.evo);
    grid(pm).appendChild(modeRow('evo', S.evo, ['keep', 'random', 'similar'], mode));
    ['evoSameType', 'evoForceChange', 'evoLimit3'].forEach(function (k) { pm.appendChild(check(k, S['o_' + k])); });
    if (caps.evoFix) {
      ['evoImpossible', 'evoNoTime', 'evoEasier'].forEach(function (k) { pm.appendChild(check(k, S['o_' + k])); });
      head(pm, S.expCurve);
      var expChoices = isGb ? ['keep', 'mediumFast', 'mediumSlow', 'fast', 'slow'] : ['keep', 'mediumFast', 'mediumSlow', 'fast', 'slow', 'erratic', 'fluctuating'];
      grid(pm).appendChild(modeRow('expCurve', S.expCurve, expChoices, { keep: S.keep, mediumFast: S.cMediumFast, mediumSlow: S.cMediumSlow, fast: S.cFast, slow: S.cSlow, erratic: S.cErratic, fluctuating: S.cFluctuating }));
      pm.appendChild(check('expLegendsSlow', S.o_expLegendsSlow));
    }

    // Starter & Statische
    var ps = panel('start');
    head(ps, S.starters);
    var g2 = grid(ps);
    var hasStarters = isGba || isGb || info.starters;
    if (hasStarters) {
      g2.appendChild(modeRow('starters', S.starters, ['keep', 'random', 'custom'], { keep: S.keep, random: S.random, custom: S.custom }));
      if (st.opts.starters === 'custom') {
        var sr = el('div', { class: 'rd-starters' }), pool = starterPool(), lbl = function (p) { return isGba ? '#' + st.rom.species[p].nat + ' ' + esc(st.rom.species[p].name) : '#' + p + ' ' + esc(CR.nameOf(p)); };
        for (var k = 0; k < 3; k++) (function (k) {
          var s = el('select', { class: 'rd-sel' }, pool.map(function (p) { return '<option value="' + p + '"' + (st.opts.starterPick[k] === p ? ' selected' : '') + '>' + lbl(p) + '</option>'; }).join(''));
          s.onchange = function () { st.opts.starterPick[k] = +s.value; }; sr.appendChild(s);
        })(k);
        g2.appendChild(sr);
      }
      ['starterTwoEvo', 'starterSameType', 'starterMax600'].forEach(function (k) { ps.appendChild(check(k, S['o_' + k])); });
      if (st.ext === 'nds' && st.rom && st.rom.gen === 4 && st.rom.type !== 'HGSS') ps.appendChild(check('starterHeldItem', S.o_starterHeldItem));
      if (isGba) ps.appendChild(check('natDexStart', S.o_natDexStart));
    } else note(ps, S.noStarters);
    if (caps.extra) {
      head(ps, S.statics);
      var g3 = grid(ps);
      g3.appendChild(modeRow('statics', S.statics, ['keep', 'random', 'similar'], kinds));
      g3.appendChild(numRow('staticLevelPct', S.o_staticLevelPct, -50, 100, 5));
      ps.appendChild(check('staticLegendSwap', S.o_staticLegendSwap));
      note(ps, S.staticNote);
      if (maxGen === 7) {
        head(ps, S.totems);
        var gt2 = grid(ps);
        gt2.appendChild(modeRow('totems', S.totems, ['keep', 'random', 'similar'], kinds));
        gt2.appendChild(numRow('totemLevelPct', S.o_totemLevelPct, -50, 100, 5));
        ps.appendChild(check('totemAura', S.o_totemAura));
      }
      if (!caps.noTrades) {
        head(ps, S.trades);
        grid(ps).appendChild(modeRow('trades', S.trades, ['keep', 'random', 'similar'], kinds));
        ps.appendChild(check('tradeRequested', S.o_tradeRequested));
        if (st.ext === 'nds' || maxGen === 7) ['tradeIVs', 'tradeItems'].forEach(function (k) { ps.appendChild(check(k, S['o_' + k])); });
      }
    }

    // Wilde Pokémon
    var pw = panel('wild');
    head(pw, S.tabWild);
    var g4 = grid(pw);
    g4.appendChild(modeRow('wild', S.wild, ['keep', 'random', 'similar'], mode));
    g4.appendChild(numRow('wildLevelPct', S.wildLevelPct, -50, 100, 5));
    g4.appendChild(modeRow('catchRate', S.catchRate, ['keep', '1', '2', '3', '4'], { keep: S.keep, 1: S.cr1, 2: S.cr2, 3: S.cr3, 4: S.cr4 }));
    head(pw, S.wildAssign);
    pw.appendChild(check('wildGlobal', S.wildGlobal));
    ['wildAreaType', 'wildArea1to1', 'wildCatchAll'].forEach(function (k) { pw.appendChild(check(k, S['o_' + k])); });

    // Trainer
    var pt = panel('trainer');
    head(pt, S.tabTrainer);
    var g5 = grid(pt);
    g5.appendChild(modeRow('trainers', S.trainers, ['keep', 'random', 'similar'], mode));
    g5.appendChild(numRow('trainerLevel', S.trainerLevel + ' (%)', -50, 100, 5));
    ['trainerTypeTheme', 'trainerNoDup'].forEach(function (k) { pt.appendChild(check(k, S['o_' + k])); });
    if (maxGen >= 3) pt.appendChild(check('doubleBattleMode', S.o_doubleBattleMode));
    if (isGba) pt.appendChild(check('shuffleTrainerNames', S.o_shuffleTrainerNames));
    pt.appendChild(check('trainerFullyEvolved', S.o_trainerFullyEvolved));
    grid(pt).appendChild(numRow('trainerFullyEvolvedLevel', S.o_trainerFullyEvolvedLevel, 1, 100, 1));
    if (caps.items && !caps.fieldOnly) { head(pt, S.trainerItems); grid(pt).appendChild(modeRow('trainerItems', S.trainerItems, ['keep', 'random'], { keep: S.keep, random: S.random })); }
    if (curMaxGen() >= 3 && curMaxGen() <= 5 && st.opts.trainers !== 'keep') { head(pt, S.rivalHead); pt.appendChild(check('rivalStarter', S.o_rivalStarter)); }

    // Attacken
    var pa = panel('moves');
    head(pa, S.moves);
    var g6 = grid(pa);
    g6.appendChild(modeRow('moves', S.moves, ['keep', 'random'], mode));
    g6.appendChild(numRow('moveTypePct', S.o_moveTypePct, 0, 100, 10));
    g6.appendChild(numRow('movesGuaranteed', S.o_movesGuaranteed, 0, 4, 1));
    g6.appendChild(numRow('movesGoodDamagingPct', S.o_movesGoodDamagingPct, 0, 100, 10));
    ['movesReorderDamaging', 'movesBlockBroken'].forEach(function (k) { pa.appendChild(check(k, S['o_' + k])); });
    if (caps.moves) {
      head(pa, S.moveData);
      grid(pa).appendChild(updateRow('updateMoves', S.o_updateMoves, 2));
      ['movePower', 'moveAcc', 'movePP', 'moveType', 'moveCat'].forEach(function (k) { pa.appendChild(check(k, S['o_' + k])); });
    }
    if (caps.tm) {
      head(pa, S.tmMoves);
      var g7 = grid(pa);
      g7.appendChild(modeRow('tmMoves', S.tmMoves, ['keep', 'random'], { keep: S.keep, random: S.tmRandom }));
      g7.appendChild(modeRow('tmCompat', S.tmCompat, ['keep', 'random', 'type', 'full'], { keep: S.keep, random: S.tmRandom, type: S.tmType, full: S.tmFull }));
      ['tmGoodDamaging', 'tmKeepField', 'tmFollowEvo', 'tmSanity'].forEach(function (k) { pa.appendChild(check(k, S['o_' + k])); });
    }
    if (caps.extra && (!caps.noTutor || (st.ctx && st.ctx.g && st.ctx.g.type === 'oras') || (st.rom && st.rom.crystal))) {
      head(pa, S.tutorMoves);
      var g8 = grid(pa);
      g8.appendChild(modeRow('tutorMoves', S.tutorMoves, ['keep', 'random'], { keep: S.keep, random: S.tmRandom }));
      g8.appendChild(modeRow('tutorCompat', S.tutorCompat, ['keep', 'random', 'type', 'full'], { keep: S.keep, random: S.tmRandom, type: S.tmType, full: S.tmFull }));
    }

    // Items
    var tabs = [['gen', S.tabGeneral, P.gen], ['mon', S.tabMon, P.mon], ['start', S.tabStart, P.start], ['wild', S.tabWild, P.wild], ['trainer', S.tabTrainer, P.trainer], ['moves', S.tabMoves, P.moves]];
    if (caps.items) {
      var pi = panel('items');
      head(pi, S.tabItems);
      var g9 = grid(pi);
      g9.appendChild(modeRow('fieldItems', S.fieldItems, ['keep', 'random'], { keep: S.keep, random: S.random }));
      if (!caps.fieldOnly) g9.appendChild(modeRow('pickupItems', S.pickupItems, ['keep', 'random'], { keep: S.keep, random: S.random }));
      if (st.ext === 'nds') g9.appendChild(modeRow('wildHeldItems', S.wildHeldItems, ['keep', 'random'], { keep: S.keep, random: S.random }));
      if (!caps.fieldOnly) g9.appendChild(modeRow('shops', S.shops, ['keep', 'random'], { keep: S.keep, random: S.random }));
      head(pi, S.itemsFilter);
      (caps.fieldOnly ? ['fieldTMShuffle', 'itemsBanBad'] : ['fieldTMShuffle', 'shopBanRegular', 'shopBanOP', 'itemsBanBad']).forEach(function (k) { pi.appendChild(check(k, S['o_' + k])); });
      note(pi, S.itemsNote);
      tabs.push(['items', S.tabItems, pi]);
    }
    if (!st.rtab || !tabs.some(function (t) { return t[0] === st.rtab; })) st.rtab = 'gen';
    var wrap = el('div', { class: 'rd-tabbox' }), bar = el('div', { class: 'sv-tabs rd-tabs' });
    tabs.forEach(function (t) {
      var cnt = tabCount(t[0]);
      var b = el('button', { type: 'button', class: 'sv-tab' + (st.rtab === t[0] ? ' on' : '') });
      b.setAttribute('data-tab', t[0]);
      b.appendChild(el('span', { text: t[1] }));
      if (cnt > 0) b.appendChild(el('span', { class: 'rd-tbadge', text: String(cnt) }));
      b.onclick = function () { st.rtab = t[0]; render(); };
      bar.appendChild(b);
    });
    wrap.appendChild(bar);
    var curPanel = tabs.filter(function (t) { return t[0] === st.rtab; })[0][2]; sectionize(curPanel);
    wrap.appendChild(curPanel);
    return wrap;
  }
  function run() {
    if (!st.rom || st.busy) return;
    st.busy = true; st.err = ''; st.msg = ''; render();
    setTimeout(function () {
      var p;
      try { p = Promise.resolve(st.kind === '3ds' ? st.eng.run(st.ctx, st.opts) : st.eng.run(st.buf, st.rom, st.opts)); } catch (e) { p = Promise.reject(e); }
      p.then(function (res) {
        st.log = res.log;
        var base = st.name.replace(/\.[^.]*$/, '');
        download(base + ' (Randomizer ' + res.seed + ').' + st.ext, res.data);
        st.last = (st.ext === 'gba' || st.ext === 'nds') ? res.data : null;
        st.lastSeed = res.seed;
        st.msg = S.done;
        st.opts.seed = res.seed;
      }).catch(function (e) { st.err = String((e && e.message) || e); }).then(function () { st.busy = false; render(); });
    }, 30);
  }

  function chip(label, val, ok) {
    var dot = ok === undefined ? '' : '<span class="rd-chip-dot"></span>';
    return el('span', { class: 'rd-chip' + (ok === false ? ' off' : ''), html: dot + '<b>' + esc(String(val)) + '</b> ' + esc(label) });
  }
  var UPLOAD_SVG = '<svg viewBox="0 0 48 48" width="34" height="34" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M24 33V9m0 0L14 19m10-10 10 10"/><path d="M8 31v6a3 3 0 0 0 3 3h26a3 3 0 0 0 3-3v-6"/></svg>';
  function render() {
    root = document.getElementById('randomizerView'); if (!root) return;
    root.innerHTML = '';
    var box = el('div', { class: 'panel rd-box' });
    box.appendChild(el('h2', { text: S.title }));
    var body = el('div', { class: 'rd-body' + (st.rom ? '' : ' empty') }), head = el('div', { class: 'rd-head' }), foot = el('div', { class: 'rd-foot' });
    body.appendChild(head);
    var inp = el('input', { type: 'file', accept: window.RL_ANDROID ? '*/*' : '.gba,.gb,.gbc,.nds,.3ds,.cxi', style: 'display:none' });
    inp.onchange = function () { if (inp.files[0]) load(inp.files[0]); };
    var pick = el('button', { class: 'primary-btn rd-pick', text: S.pick }); pick.onclick = function () { inp.click(); };
    var errEl = st.err ? el('div', { class: 'rd-err', text: st.err }) : null;
    var dz;
    if (!st.rom) {
      dz = el('div', { class: 'rd-drop rd-drop-big' });
      dz.appendChild(el('div', { class: 'rd-drop-ic', html: UPLOAD_SVG }));
      dz.appendChild(el('h3', { class: 'rd-drop-title', text: S.dropTitle }));
      dz.appendChild(el('p', { class: 'hint', text: S.drop }));
      var fmts = el('div', { class: 'rd-fmts' });
      ['.gb', '.gbc', '.gba', '.nds', '.cxi', '.3ds'].forEach(function (f) { fmts.appendChild(el('span', { class: 'rd-fmt', text: f })); });
      dz.appendChild(fmts);
      dz.appendChild(pick); dz.appendChild(inp);
      dz.appendChild(el('p', { class: 'hint rd-drop-sub', text: S.sub }));
      var gl = el('div', { class: 'rd-genlist' });
      S.genList.forEach(function (g) { var c = el('div', { class: 'rd-genchip' }); c.appendChild(el('b', { text: g[0] })); c.appendChild(el('span', { text: g[1] })); gl.appendChild(c); });
      dz.appendChild(gl);
      if (errEl) head.appendChild(errEl);
      head.appendChild(dz);
    } else {
      var i = st.info, hasSt = i.starterOff >= 0 || i.starters, hasEvo = st.ext === 'gba' ? i.evoOff >= 0 : i.evo;
      dz = el('div', { class: 'rd-gamecard' });
      dz.appendChild(el('span', { class: 'rd-genbadge', text: S.genWord + ' ' + curMaxGen() }));
      var gt = el('div', { class: 'rd-gametext' });
      gt.appendChild(el('div', { class: 'rd-game', html: '<b>' + esc((de ? st.rom.game : st.rom.gameEn) || st.rom.title) + '</b> <span class="rd-gamecode">' + esc(st.rom.code) + '</span>' }));
      gt.appendChild(el('div', { class: 'hint', text: st.name }));
      dz.appendChild(gt);
      var ch = el('div', { class: 'rd-chips' });
      ch.appendChild(chip(S.chipAreas, i.wildMaps || 0)); ch.appendChild(chip(S.chipTrainers, i.trainers || 0));
      ch.appendChild(chip(S.chipStarters, hasSt ? S.chipYes : S.chipNo, !!hasSt)); ch.appendChild(chip(S.chipEvos, hasEvo ? S.chipYes : S.chipNo, !!hasEvo));
      dz.appendChild(ch);
      pick.className = 'rd-logbtn rd-change'; pick.textContent = S.changeRom;
      dz.appendChild(pick); dz.appendChild(inp);
      if (errEl) head.appendChild(errEl);
      head.appendChild(dz);
    }
    root.ondragover = function (e) { e.preventDefault(); dz.classList.add('on'); };
    root.ondragleave = function () { dz.classList.remove('on'); };
    root.ondrop = function (e) { e.preventDefault(); dz.classList.remove('on'); if (e.dataTransfer.files[0]) load(e.dataTransfer.files[0]); };
    if (st.rom) {
      var main = el('div', { class: 'rd-main' }); main.appendChild(optionTabs(st.info)); body.appendChild(main);
      var goRow = el('div', { class: 'rd-gorow' });
      var go = el('button', { class: 'primary-btn rd-go', text: st.busy ? S.running : S.go }); go.disabled = st.busy; go.onclick = run;
      var tot = totalActive();
      var sum = el('span', { class: 'rd-summary' + (tot > 0 ? ' on' : ''), text: tot === 0 ? S.activeNone : (tot === 1 ? S.activeOne : S.activeMany.replace('{0}', tot)) });
      goRow.appendChild(go); goRow.appendChild(sum); goRow.appendChild(el('span', { class: 'hint rd-warn', text: S.warn })); foot.appendChild(goRow);
    }
    if (st.msg || st.log) {
      var okRow = el('div', { class: 'rd-okrow' }), acts = el('span', { class: 'rd-acts' });
      if (st.msg) {
        var okEl = el('span', { class: 'rd-ok' });
        okEl.appendChild(document.createTextNode(st.msg));
        if (st.lastSeed) {
          okEl.appendChild(document.createTextNode(' · Seed: '));
          var sb = el('button', { type: 'button', class: 'rd-seedtag', text: st.lastSeed, title: S.seedCopyHint });
          sb.onclick = function () {
            try { navigator.clipboard.writeText(st.lastSeed); } catch (e) {}
            sb.textContent = S.copied; setTimeout(function () { sb.textContent = st.lastSeed; }, 1400);
          };
          okEl.appendChild(sb);
        }
        okEl.appendChild(document.createTextNode(' – ' + S.again));
        okRow.appendChild(okEl);
      }
      if (st.msg && st.last && window.CCNuzCalc && A.showView) {
        var nb = el('button', { type: 'button', class: 'rd-logbtn', text: S.toNuz });
        nb.onclick = function () {
          var dd = st.last, go2 = function (u8) { window.CCNuzCalc.loadRom(u8); A.showView('nuz'); };
          if (dd && dd.arrayBuffer) dd.arrayBuffer().then(function (b) { go2(new Uint8Array(b)); }); else if (dd) go2(dd);
        };
        acts.appendChild(nb);
      }
      if (st.log) { var lb = el('button', { type: 'button', class: 'rd-logbtn', text: S.log }); lb.onclick = function () { download('randomizer-log.txt', st.log, 'text/plain'); }; acts.appendChild(lb); }
      okRow.appendChild(acts); foot.appendChild(okRow);
    }
    if (st.log) {
      var ld = el('details', { class: 'rd-logbox' }); ld.appendChild(el('summary', { text: S.logShow }));
      ld.appendChild(el('pre', { class: 'rd-log', text: st.log.split(String.fromCharCode(10)).slice(0, 400).join(String.fromCharCode(10)) }));
      foot.appendChild(ld);
    }
    body.appendChild(foot);
    box.appendChild(body); root.appendChild(box);
  }
  // Optionen eines Tabs in Karten gruppieren: jede Überschrift beginnt eine neue Karte
  function sectionize(p) {
    var kids = Array.prototype.slice.call(p.children), cur = null;
    kids.forEach(function (k) {
      if (!cur || k.classList.contains('rd-sub')) { cur = el('div', { class: 'rd-sec' }); p.insertBefore(cur, k); }
      cur.appendChild(k);
    });
    var secs = p.querySelectorAll('.rd-sec');
    for (var i = 0; i < secs.length; i++) {
      secs[i].classList.toggle('has-active', !!secs[i].querySelector('.is-active, .rd-genpill.on'));
    }
  }
  window.CCRandomizer = { render: render, _dev: function (eng, rom, info, ext, name) { setup(eng, rom, info, ext, name); render(); }, _tab: function (t) { st.rtab = t; render(); }, _set: function (o) { Object.keys(o).forEach(function (k) { st[k] = o[k]; }); render(); } }; // _dev/_tab: nur für Tests und Screenshots
})();

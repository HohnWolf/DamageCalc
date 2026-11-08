// Randomizer-Ansicht (#randomizerView): ROM wählen, Optionen einstellen, randomisierte Kopie speichern. Engine: js/rand_gen3.js
(function () {
  'use strict';
  var A = window.CC, R3 = window.CCRand3, RN = window.CCRandNds, N = window.NDS, G = window.GEN3, R5 = window.CCRandGen5, R67 = window.CCRand3DS, RGB = window.CCRandGB;
  if (!A || !R3 || !G) return;
  var R = R3;
  var el = A.el, esc = A.esc, de = A.LANG === 'de';
  var S = de ? {
    title: 'Randomizer', sub: 'Mischt wilde Pokémon, Trainer, Starter, Entwicklungen, Werte, Typen, Fähigkeiten und Attacken einer Spiel-ROM. Die Originaldatei bleibt unverändert, du bekommst eine neue Datei.',
    gens: 'Unterstützt: Generation 1 (Rot, Blau, Gelb), 2 (Gold, Silber, Kristall), 3 (Rubin, Saphir, Smaragd, Feuerrot, Blattgrün), 4 (Diamant, Perl, Platin, HeartGold, SoulSilver), 5 (Schwarz, Weiß, Schwarz 2, Weiß 2) und 6/7 (X, Y, Omega Rubin, Alpha Saphir, Sonne, Mond, Ultra Sonne, Ultra Mond; entschlüsselte .cxi). Starter lassen sich nur in Generation 1–3 ändern.',
    pick: 'ROM wählen …', drop: 'oder eine .gb- / .gbc- / .gba- / .nds- / .cxi-Datei hierher ziehen', enc: 'Diese 3DS-Datei ist verschlüsselt. Gebraucht wird eine entschlüsselte .cxi (oder .3ds).', big: 'Große Datei, bitte kurz warten …', game: 'Erkannt:', scan: 'Gefunden: {0} Karten mit wilden Pokémon, {1} Trainer, Starter {2}, Entwicklungen {3}',
    yes: 'ja', no: 'nein', bad: 'Diese Datei wird nicht unterstützt. Gebraucht wird eine unveränderte GBA-ROM der 3. Generation.',
    gen12: 'Game-Boy-ROMs (Generation 1 und 2) werden noch nicht unterstützt.', gen45: 'DS-ROMs der Generation 5 werden noch nicht unterstützt.', gen67: '3DS-ROMs (Generation 6 und 7) werden noch nicht unterstützt.',
    wild: 'Wilde Pokémon', trainers: 'Trainer-Pokémon', starters: 'Starter', evo: 'Entwicklungen', stats: 'Basiswerte', types: 'Typen', abilities: 'Fähigkeiten', moves: 'Level-Attacken',
    keep: 'Unverändert', random: 'Zufällig', similar: 'Zufällig, ähnlich stark', custom: 'Eigene Auswahl', shuffle: 'Werte mischen', randomStats: 'Zufällig (gleiche Summe)',
    wildGlobal: 'Jede Art wird überall gleich ersetzt (1:1)', noLegend: 'Keine legendären Pokémon', trainerLevel: 'Trainer-Level ändern um', seed: 'Seed (leer = zufällig)',
    go: 'Randomisieren und speichern', log: 'Protokoll speichern', done: 'Fertig. Die randomisierte ROM wurde gespeichert, Seed:', again: 'Gleiche ROM, gleiche Einstellungen und gleicher Seed ergeben immer dasselbe Ergebnis.',
    warn: 'Nutze die neue Datei nur mit einer Kopie deines Spielstands. Randomisierte Spiele können unfair oder unspielbar sein.',
    adv: 'Erweiterte Optionen (wie im Universal Pokémon Randomizer ZX)', advOnly: 'Diese Optionen gibt es für Generation 1, 2 und 5–7. Generation 3 und 4 kennen nur die Grundoptionen.',
    o_followEvoTypes: 'Typen: Weiterentwicklungen erben den Typ der Vorstufe', o_followEvoAbilities: 'Fähigkeiten: Weiterentwicklungen erben die Fähigkeiten der Vorstufe',
    o_allowWonderGuard: 'Wunderwache darf vorkommen', o_banTrapping: 'Keine Fallen-Fähigkeiten (Magnetfalle, Schattentag, Fallensteller)', o_banNegative: 'Keine schlechten Fähigkeiten (Bummler, Anlaufzeit, Defätist …)',
    o_moveTypePct: 'Level-Attacken: Anteil gleicher Typ (%)', o_evoSameType: 'Entwicklungen: neues Ziel teilt einen Typ mit der Vorstufe', o_evoForceChange: 'Entwicklungen: Ziel muss sich ändern',
    o_evoLimit3: 'Entwicklungen: höchstens drei Stufen', o_starterTwoEvo: 'Starter: nur Arten mit zwei Entwicklungen', o_starterSameType: 'Starter: alle drei vom gleichen Typ',
    o_wildAreaType: 'Wild: jedes Gebiet hat einen Typ (Typ-Thema)', o_wildArea1to1: 'Wild: pro Gebiet wird jede Art gleich ersetzt (1:1)', o_wildCatchAll: 'Wild: jede Art kommt mindestens einmal vor („Catch ’em all“)',
    o_trainerTypeTheme: 'Trainer: jeder Trainer hat ein Typ-Thema', o_trainerNoDup: 'Trainer: keine doppelten Arten im Team',
    o_movePower: 'Attacken: Stärke zufällig', o_moveAcc: 'Attacken: Genauigkeit zufällig', o_movePP: 'Attacken: AP zufällig', o_moveType: 'Attacken: Typ zufällig', o_moveCat: 'Attacken: Art zufällig (physisch/speziell)',
    tmMoves: 'TM-Attacken', tmCompat: 'TM/HM-Kompatibilität', tmRandom: 'Zufällig', tmType: 'Zufällig, bevorzugt eigener Typ', tmFull: 'Alle können alles',
    o_tmGoodDamaging: 'TMs: Anteil guter Schadensattacken erzwingen', o_tmKeepField: 'TMs: Feldattacken-TMs behalten', o_tmFollowEvo: 'Kompatibilität: Weiterentwicklungen erben von der Vorstufe', o_tmSanity: 'Kompatibilität: Level-Attacken, die es als TM gibt, immer erlauben',
    tutorMoves: 'Attacken-Lehrer: Attacken', tutorCompat: 'Attacken-Lehrer: Kompatibilität', statics: 'Statische Pokémon & Geschenke', trades: 'Ingame-Tausche',
    similarOpt: 'Zufällig, ähnlich stark', o_staticLegendSwap: 'Statische: Legendäre nur gegen Legendäre tauschen', o_staticLevelPct: 'Statische: Level ändern um (%)', o_tradeRequested: 'Tausche: auch die verlangte Art ändern',
    staticNote: 'Ohne die Patches des UPR (erster Rivalenkampf, Geister-Knogga, Zugvögel); Mew/Deoxys-Gehorsam wird nicht angepasst.',
    o_evoImpossible: 'Unmögliche Entwicklungen ersetzen (Tausch → Level 37, Tausch mit Item, Schönheit …)', o_evoNoTime: 'Tageszeit-Entwicklungen beides erlauben (Tag und Nacht)', o_evoEasier: 'Entwicklungen erleichtern (Level höchstens 30/40)',
    expCurve: 'EP-Kurve vereinheitlichen', cMediumFast: 'Mittelschnell', cMediumSlow: 'Mittellangsam', cFast: 'Schnell', cSlow: 'Langsam', cErratic: 'Unregelmäßig', cFluctuating: 'Schwankend', o_expLegendsSlow: 'EP-Kurve: Legendäre bleiben langsam',
    fieldItems: 'Items auf dem Feld (inkl. versteckte)', shops: 'Shop-Inhalte', trainerItems: 'Trainer-Items', o_fieldTMShuffle: 'Feld-TMs untereinander mischen', o_shopBanRegular: 'Shops: normale Shop-Items ausschließen', o_shopBanOP: 'Shops: sehr starke Items ausschließen', o_itemsBanBad: 'Items: keine schlechten Items (Beeren, Briefe, Spezial-Items …)',
    itemsNote: 'Schwarz/Weiß (Teil 1) hat keine änderbaren Shops; Trainer-Items ändern nur Trainer, die schon ein Item tragen.',
    pickupItems: 'Pickup-Items',
    catchRate: 'Mindest-Fangrate', cr1: 'Leicht (75, Legendäre 37)', cr2: 'Mittel (128, Legendäre 64)', cr3: 'Hoch (200, Legendäre 100)', cr4: 'Immer fangbar (255)',
    wildLevelPct: 'Wilde Pokémon: Level ändern um (%)',
    presets: 'Voreinstellungen', pStd: 'Standard', pChaos: 'Chaos', pCasual: 'Fair & ähnlich stark', pNone: 'Alles unverändert', code: 'Einstellungscode', codeCopy: 'Code kopieren', codeLoad: 'Code laden', codeBad: 'Der Einstellungscode ist ungültig.'
  } : {
    title: 'Randomizer', sub: 'Shuffles wild Pokémon, trainers, starters, evolutions, stats, types, abilities and moves of a game ROM. The original file stays untouched, you get a new file.',
    gens: 'Supported: generation 1 (Red, Blue, Yellow), 2 (Gold, Silver, Crystal), 3 (Ruby, Sapphire, Emerald, FireRed, LeafGreen), 4 (Diamond, Pearl, Platinum, HeartGold, SoulSilver), 5 (Black, White, Black 2, White 2) and 6/7 (X, Y, Omega Ruby, Alpha Sapphire, Sun, Moon, Ultra Sun, Ultra Moon; decrypted .cxi). Starters can only be changed in generations 1–3.',
    pick: 'Choose ROM …', drop: 'or drag a .gb / .gbc / .gba / .nds / .cxi file here', enc: 'This 3DS file is encrypted. A decrypted .cxi (or .3ds) is required.', big: 'Large file, please wait …', game: 'Detected:', scan: 'Found: {0} maps with wild Pokémon, {1} trainers, starters {2}, evolutions {3}',
    yes: 'yes', no: 'no', bad: 'This file is not supported. An unmodified generation 3 GBA ROM is required.',
    gen12: 'Game Boy ROMs (generation 1 and 2) are not supported yet.', gen45: 'DS ROMs of generation 5 are not supported yet.', gen67: '3DS ROMs (generation 6 and 7) are not supported yet.',
    wild: 'Wild Pokémon', trainers: 'Trainer Pokémon', starters: 'Starters', evo: 'Evolutions', stats: 'Base stats', types: 'Types', abilities: 'Abilities', moves: 'Level-up moves',
    keep: 'Unchanged', random: 'Random', similar: 'Random, similar strength', custom: 'Custom', shuffle: 'Shuffle stats', randomStats: 'Random (same total)',
    wildGlobal: 'Each species is replaced the same everywhere (1:1)', noLegend: 'No legendary Pokémon', trainerLevel: 'Change trainer levels by', seed: 'Seed (empty = random)',
    go: 'Randomize and save', log: 'Save log', done: 'Done. The randomized ROM was saved, seed:', again: 'Same ROM, same settings and same seed always give the same result.',
    warn: 'Use the new file only with a copy of your save. Randomized games can be unfair or unplayable.',
    adv: 'Advanced options (as in the Universal Pokémon Randomizer ZX)', advOnly: 'These options exist for generations 1, 2 and 5–7. Generations 3 and 4 only have the basic options.',
    o_followEvoTypes: 'Types: evolutions inherit the type of the previous stage', o_followEvoAbilities: 'Abilities: evolutions inherit the abilities of the previous stage',
    o_allowWonderGuard: 'Allow Wonder Guard', o_banTrapping: 'No trapping abilities (Magnet Pull, Shadow Tag, Arena Trap)', o_banNegative: 'No bad abilities (Truant, Slow Start, Defeatist …)',
    o_moveTypePct: 'Level-up moves: share of same type (%)', o_evoSameType: 'Evolutions: new target shares a type with the previous stage', o_evoForceChange: 'Evolutions: target must change',
    o_evoLimit3: 'Evolutions: at most three stages', o_starterTwoEvo: 'Starters: only species with two evolutions', o_starterSameType: 'Starters: all three of the same type',
    o_wildAreaType: 'Wild: each area has a type theme', o_wildArea1to1: 'Wild: each species is replaced the same way within an area (1:1)', o_wildCatchAll: 'Wild: every species appears at least once (catch em all)',
    o_trainerTypeTheme: 'Trainers: each trainer has a type theme', o_trainerNoDup: 'Trainers: no duplicate species in a team',
    o_movePower: 'Moves: random power', o_moveAcc: 'Moves: random accuracy', o_movePP: 'Moves: random PP', o_moveType: 'Moves: random type', o_moveCat: 'Moves: random category (physical/special)',
    tmMoves: 'TM moves', tmCompat: 'TM/HM compatibility', tmRandom: 'Random', tmType: 'Random, prefer own type', tmFull: 'Everything can learn everything',
    o_tmGoodDamaging: 'TMs: force a share of good damaging moves', o_tmKeepField: 'TMs: keep field-move TMs', o_tmFollowEvo: 'Compatibility: evolutions inherit from the previous stage', o_tmSanity: 'Compatibility: always allow level-up moves that exist as a TM',
    tutorMoves: 'Move tutors: moves', tutorCompat: 'Move tutors: compatibility', statics: 'Static Pokémon & gifts', trades: 'In-game trades',
    similarOpt: 'Random, similar strength', o_staticLegendSwap: 'Statics: swap legendaries only with legendaries', o_staticLevelPct: 'Statics: change level by (%)', o_tradeRequested: 'Trades: also change the requested species',
    staticNote: 'Without the UPR patches (first rival battle, Ghost Marowak, roamers); Mew/Deoxys obedience is not adjusted.',
    o_evoImpossible: 'Replace impossible evolutions (trade → level 37, trade with item, beauty …)', o_evoNoTime: 'Allow time-based evolutions at day and night', o_evoEasier: 'Make evolutions easier (level at most 30/40)',
    expCurve: 'Standardize EXP curve', cMediumFast: 'Medium Fast', cMediumSlow: 'Medium Slow', cFast: 'Fast', cSlow: 'Slow', cErratic: 'Erratic', cFluctuating: 'Fluctuating', o_expLegendsSlow: 'EXP curve: legendaries stay slow',
    fieldItems: 'Field items (incl. hidden)', shops: 'Shop contents', trainerItems: 'Trainer items', o_fieldTMShuffle: 'Shuffle field TMs among themselves', o_shopBanRegular: 'Shops: exclude regular shop items', o_shopBanOP: 'Shops: exclude very strong items', o_itemsBanBad: 'Items: no bad items (berries, mail, special items …)',
    itemsNote: 'Black/White (part 1) has no editable shops; trainer items only change trainers that already hold an item.',
    pickupItems: 'Pickup items',
    catchRate: 'Minimum catch rate', cr1: 'Easy (75, legendary 37)', cr2: 'Medium (128, legendary 64)', cr3: 'High (200, legendary 100)', cr4: 'Always catchable (255)',
    wildLevelPct: 'Wild Pokémon: change level by (%)',
    presets: 'Presets', pStd: 'Default', pChaos: 'Chaos', pCasual: 'Fair & similar strength', pNone: 'Everything unchanged', code: 'Settings code', codeCopy: 'Copy code', codeLoad: 'Load code', codeBad: 'The settings code is invalid.'
  };

  var st = { eng: null, ext: 'gba', rom: null, buf: null, name: '', info: null, opts: JSON.parse(JSON.stringify(R.DEFAULTS)), msg: '', err: '', log: '', busy: false };
  var root;

  function download(name, bytes, mime) { A.saveFile(name, bytes, mime); }
  function setup(eng, rom, info, ext, name, extra) {
    st.eng = eng; st.ext = ext; st.opts = JSON.parse(JSON.stringify(eng.DEFAULTS));
    st.rom = rom; st.name = name; st.info = info; st.kind = extra && extra.kind || 'buf';
    st.ctx = extra && extra.ctx || null; st.buf = extra && extra.buf || null;
    if (ext === 'gba' && eng.makePool) {
      var pool = eng.makePool(rom, false), first = pool.filter(function (s) { return rom.species[s].nat === (rom.frlg ? 1 : 252); })[0] || pool[0];
      st.opts.starterPick = [first, first, first];
    }
  }
  function load(file) {
    st.err = ''; st.msg = ''; st.log = ''; st.rom = null;
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

  function sel(key, choices, labels) {
    var s = el('select', { class: 'rd-sel' }, choices.map(function (c) { return '<option value="' + c + '"' + (String(st.opts[key]) === c ? ' selected' : '') + '>' + esc(labels[c]) + '</option>'; }).join(''));
    s.onchange = function () { st.opts[key] = s.value; if (key === 'starters') render(); };
    return s;
  }
  function row(label, ctrl) { var r = el('label', { class: 'rd-row' }); r.appendChild(el('span', { class: 'rd-lbl', text: label })); r.appendChild(ctrl); return r; }
  function check(key, label) {
    var c = el('input', { type: 'checkbox' }); c.checked = !!st.opts[key]; c.onchange = function () { st.opts[key] = c.checked; };
    var l = el('label', { class: 'rd-check' }); l.appendChild(c); l.appendChild(el('span', { text: label })); return l;
  }
  var BOOLS = ['followEvoTypes', 'followEvoAbilities', 'allowWonderGuard', 'banTrapping', 'banNegative', 'evoSameType', 'evoForceChange', 'evoLimit3', 'starterTwoEvo', 'starterSameType', 'wildAreaType', 'wildArea1to1', 'wildCatchAll', 'trainerTypeTheme', 'trainerNoDup'];
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
    d.seed = keepSeed; if (pk) d.starterPick = pk; st.opts = d; st.msg = ''; st.err = ''; render();
  }
  function presetBar() {
    var w = el('div', { class: 'rd-presets' });
    w.appendChild(el('span', { class: 'rd-lbl', text: S.presets + ':' }));
    ['pStd', 'pCasual', 'pChaos', 'pNone'].forEach(function (k) { var b = el('button', { class: 'rd-logbtn', text: S[k] }); b.onclick = function () { applyPreset(k); }; w.appendChild(b); });
    var inp = el('input', { type: 'text', class: 'rd-seed rd-code', placeholder: S.code });
    var cp = el('button', { class: 'rd-logbtn', text: S.codeCopy });
    cp.onclick = function () { inp.value = encodeCode(); try { navigator.clipboard.writeText(inp.value); } catch (e) { inp.select(); } };
    var ld = el('button', { class: 'rd-logbtn', text: S.codeLoad });
    ld.onclick = function () { if (decodeCode(inp.value)) { st.msg = ''; st.err = ''; render(); } else { st.err = S.codeBad; render(); } };
    w.appendChild(inp); w.appendChild(cp); w.appendChild(ld);
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
  function advanced() {
    var d = el('details', { class: 'rd-adv' }), sm = el('summary', { text: S.adv }), inner = el('div', { class: 'rd-advbody' });
    d.appendChild(sm); d.appendChild(inner);
    if (!adv()) { inner.appendChild(el('p', { class: 'hint', text: S.advOnly })); return d; }
    d.open = !!st.advOpen; d.ontoggle = function () { st.advOpen = d.open; };
    var n = el('input', { type: 'number', min: 0, max: 100, step: 10, class: 'rd-num' }); n.value = st.opts.moveTypePct;
    n.onchange = function () { st.opts.moveTypePct = Math.max(0, Math.min(100, +n.value || 0)); };
    inner.appendChild(row(S.o_moveTypePct, n));
    BOOLS.forEach(function (k) { inner.appendChild(check(k, S['o_' + k])); });
    var caps = st.eng.CAPS || {};
    if (caps.moves) ['movePower', 'moveAcc', 'movePP', 'moveType', 'moveCat'].forEach(function (k) { inner.appendChild(check(k, S['o_' + k])); });
    if (caps.tm) {
      var sl = function (key, choices, labels) { var r = sel(key, choices, labels); return r; };
      inner.appendChild(row(S.tmMoves, sl('tmMoves', ['keep', 'random'], { keep: S.keep, random: S.tmRandom })));
      inner.appendChild(row(S.tmCompat, sl('tmCompat', ['keep', 'random', 'type', 'full'], { keep: S.keep, random: S.tmRandom, type: S.tmType, full: S.tmFull })));
      ['tmGoodDamaging', 'tmKeepField', 'tmFollowEvo', 'tmSanity'].forEach(function (k) { inner.appendChild(check(k, S['o_' + k])); });
    }
    var wl = el('input', { type: 'number', min: -50, max: 100, step: 5, class: 'rd-num' }); wl.value = st.opts.wildLevelPct || 0;
    wl.onchange = function () { st.opts.wildLevelPct = Math.max(-50, Math.min(100, +wl.value || 0)); };
    inner.appendChild(row(S.wildLevelPct, wl));
    inner.appendChild(row(S.catchRate, sel('catchRate', ['keep', '1', '2', '3', '4'], { keep: S.keep, 1: S.cr1, 2: S.cr2, 3: S.cr3, 4: S.cr4 })));
    if (caps.evoFix) {
      ['evoImpossible', 'evoNoTime', 'evoEasier'].forEach(function (k) { inner.appendChild(check(k, S['o_' + k])); });
      inner.appendChild(row(S.expCurve, sel('expCurve', ['keep', 'mediumFast', 'mediumSlow', 'fast', 'slow', 'erratic', 'fluctuating'], { keep: S.keep, mediumFast: S.cMediumFast, mediumSlow: S.cMediumSlow, fast: S.cFast, slow: S.cSlow, erratic: S.cErratic, fluctuating: S.cFluctuating })));
      inner.appendChild(check('expLegendsSlow', S.o_expLegendsSlow));
    }
    if (caps.items) {
      inner.appendChild(row(S.fieldItems, sel('fieldItems', ['keep', 'random'], { keep: S.keep, random: S.random })));
      inner.appendChild(check('fieldTMShuffle', S.o_fieldTMShuffle));
      inner.appendChild(row(S.pickupItems, sel('pickupItems', ['keep', 'random'], { keep: S.keep, random: S.random })));
      inner.appendChild(row(S.shops, sel('shops', ['keep', 'random'], { keep: S.keep, random: S.random })));
      ['shopBanRegular', 'shopBanOP', 'itemsBanBad'].forEach(function (k) { inner.appendChild(check(k, S['o_' + k])); });
      inner.appendChild(row(S.trainerItems, sel('trainerItems', ['keep', 'random'], { keep: S.keep, random: S.random })));
      inner.appendChild(el('p', { class: 'hint', text: S.itemsNote }));
    }
    if (caps.extra) {
      var kinds = { keep: S.keep, random: S.random, similar: S.similarOpt };
      inner.appendChild(row(S.statics, sel('statics', ['keep', 'random', 'similar'], kinds)));
      inner.appendChild(check('staticLegendSwap', S.o_staticLegendSwap));
      var sl2 = el('input', { type: 'number', min: -50, max: 100, step: 5, class: 'rd-num' }); sl2.value = st.opts.staticLevelPct;
      sl2.onchange = function () { st.opts.staticLevelPct = Math.max(-50, Math.min(100, +sl2.value || 0)); };
      inner.appendChild(row(S.o_staticLevelPct, sl2));
      inner.appendChild(el('p', { class: 'hint', text: S.staticNote }));
      if (!caps.noTrades) {
        inner.appendChild(row(S.trades, sel('trades', ['keep', 'random', 'similar'], kinds)));
        inner.appendChild(check('tradeRequested', S.o_tradeRequested));
      }
      if (!caps.noTutor) inner.appendChild(row(S.tutorMoves, sel('tutorMoves', ['keep', 'random'], { keep: S.keep, random: S.tmRandom })));
      if (!caps.noTutor) inner.appendChild(row(S.tutorCompat, sel('tutorCompat', ['keep', 'random', 'type', 'full'], { keep: S.keep, random: S.tmRandom, type: S.tmType, full: S.tmFull })));
    }
    return d;
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
        st.msg = S.done + ' ' + res.seed;
        st.opts.seed = res.seed;
      }).catch(function (e) { st.err = String((e && e.message) || e); }).then(function () { st.busy = false; render(); });
    }, 30);
  }

  function render() {
    root = document.getElementById('randomizerView'); if (!root) return;
    root.innerHTML = '';
    var box = el('div', { class: 'panel rd-box' });
    box.appendChild(el('h2', { text: S.title }));
    var body = el('div', { class: 'rd-body' });
    body.appendChild(el('p', { class: 'hint', text: S.sub }));
    body.appendChild(el('p', { class: 'hint', text: S.gens }));
    var inp = el('input', { type: 'file', accept: window.RL_ANDROID ? '*/*' : '.gba,.gb,.gbc,.nds,.3ds,.cxi', style: 'display:none' });
    inp.onchange = function () { if (inp.files[0]) load(inp.files[0]); };
    var pick = el('button', { class: 'primary-btn rd-pick', text: S.pick }); pick.onclick = function () { inp.click(); };
    var dz = el('div', { class: 'rd-drop' }); dz.appendChild(pick); dz.appendChild(el('span', { class: 'hint', text: S.drop })); dz.appendChild(inp);
    root.ondragover = function (e) { e.preventDefault(); dz.classList.add('on'); };
    root.ondragleave = function () { dz.classList.remove('on'); };
    root.ondrop = function (e) { e.preventDefault(); dz.classList.remove('on'); if (e.dataTransfer.files[0]) load(e.dataTransfer.files[0]); };
    body.appendChild(dz);
    if (st.err) body.appendChild(el('div', { class: 'rd-err', text: st.err }));
    if (st.rom) {
      var i = st.info;
      body.appendChild(el('div', { class: 'rd-game', html: '<b>' + esc(S.game) + '</b> ' + esc((de ? st.rom.game : st.rom.gameEn) || st.rom.title) + ' (' + esc(st.rom.code) + ') – ' + esc(st.name) }));
      body.appendChild(el('div', { class: 'hint', text: S.scan.replace('{0}', i.wildMaps).replace('{1}', i.trainers).replace('{2}', st.ext !== 'gba' && st.ext !== 'gb' && st.ext !== 'gbc' ? '–' : (i.starterOff >= 0 || i.starters ? S.yes : S.no)).replace('{3}', (st.ext === 'gba' ? i.evoOff >= 0 : i.evo) ? S.yes : S.no) }));
      var g = el('div', { class: 'rd-grid' });
      var mode = { keep: S.keep, random: S.random, similar: S.similar };
      g.appendChild(row(S.wild, sel('wild', ['keep', 'random', 'similar'], mode)));
      g.appendChild(row(S.trainers, sel('trainers', ['keep', 'random', 'similar'], mode)));
      if (st.ext === 'gba' || st.ext === 'gb' || st.ext === 'gbc') g.appendChild(row(S.starters, sel('starters', ['keep', 'random', 'custom'], { keep: S.keep, random: S.random, custom: S.custom })));
      if (st.opts.starters === 'custom' && st.ext === 'gba') {
        var sr = el('div', { class: 'rd-starters' }), pool = st.eng.makePool(st.rom, false);
        for (var k = 0; k < 3; k++) (function (k) {
          var s = el('select', { class: 'rd-sel' }, pool.map(function (p) { return '<option value="' + p + '"' + (st.opts.starterPick[k] === p ? ' selected' : '') + '>#' + st.rom.species[p].nat + ' ' + esc(st.rom.species[p].name) + '</option>'; }).join(''));
          s.onchange = function () { st.opts.starterPick[k] = +s.value; }; sr.appendChild(s);
        })(k);
        g.appendChild(sr);
      }
      g.appendChild(row(S.evo, sel('evo', ['keep', 'random', 'similar'], mode)));
      g.appendChild(row(S.stats, sel('stats', ['keep', 'shuffle', 'random'], { keep: S.keep, shuffle: S.shuffle, random: S.randomStats })));
      g.appendChild(row(S.types, sel('types', ['keep', 'random'], mode)));
      g.appendChild(row(S.abilities, sel('abilities', ['keep', 'random'], mode)));
      g.appendChild(row(S.moves, sel('moves', ['keep', 'random'], mode)));
      var lv = el('input', { type: 'number', min: -50, max: 100, step: 5, class: 'rd-num' }); lv.value = st.opts.trainerLevel;
      lv.onchange = function () { st.opts.trainerLevel = Math.max(-50, Math.min(100, +lv.value || 0)); };
      var lvw = el('span', { class: 'rd-lvl' }); lvw.appendChild(lv); lvw.appendChild(el('span', { text: ' %' }));
      g.appendChild(row(S.trainerLevel, lvw));
      var seed = el('input', { type: 'text', class: 'rd-seed', placeholder: '…' }); seed.value = st.opts.seed || '';
      seed.oninput = function () { st.opts.seed = seed.value; };
      g.appendChild(row(S.seed, seed));
      body.appendChild(g);
      body.appendChild(check('wildGlobal', S.wildGlobal));
      body.appendChild(check('noLegend', S.noLegend));
      body.appendChild(presetBar());
      body.appendChild(advanced());
      var go = el('button', { class: 'primary-btn rd-go', text: S.go }); go.disabled = st.busy; go.onclick = run;
      body.appendChild(go);
      body.appendChild(el('p', { class: 'hint', text: S.warn }));
    }
    if (st.msg) body.appendChild(el('div', { class: 'rd-ok', text: st.msg + ' – ' + S.again }));
    if (st.log) {
      var lb = el('button', { class: 'rd-logbtn', text: S.log }); lb.onclick = function () { download('randomizer-log.txt', st.log, 'text/plain'); };
      body.appendChild(lb);
      body.appendChild(el('pre', { class: 'rd-log', text: st.log.split('\n').slice(0, 400).join('\n') }));
    }
    box.appendChild(body); root.appendChild(box);
  }
  window.CCRandomizer = { render: render };
})();

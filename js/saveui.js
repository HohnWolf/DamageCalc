// Save File Editor – Oberfläche (#saveView): Spielstand laden, Team und Boxen ansehen, Pokémon und Trainerdaten bearbeiten, speichern.
// Kern und Formate: js/savedit.js (nach PKHeX). Namenslisten: data/pk_text.js, Basiswerte: data/pk_personal.js
(function () {
  'use strict';
  var A = window.CC, S = window.CCSave, T0 = window.PKTEXT, P = window.PKPERSONAL;
  if (!A || !S || !T0 || !P) return;
  var el = A.el, esc = A.esc, de = A.LANG === 'de', T = de ? T0.de : T0.en;
  var L = de ? {
    title: 'Save File Editor', sub: 'Bearbeite Spielstände: Team, Boxen, Pokémon (Werte, Attacken, Item, Wesen, Shiny) und Trainerdaten. Die Originaldatei bleibt unverändert, du speicherst eine neue Datei. Unterstützt: Generation 1–9 (inkl. Switch).',
    pick: 'Spielstand wählen …', drop: 'oder eine .sav- / .dsv- / Switch-main-Datei hierher ziehen', bad: 'Diese Datei wird nicht erkannt. Unterstützt werden Spielstände der Generation 1–7 (.sav, .dsv, 3DS main) sowie Switch Generation 8–9 (Schwert/Schild, Legenden: Arceus, Karmesin/Purpur).',
    game: 'Erkannt:', save: 'Spielstand speichern', saved: 'Gespeichert. Mach vorher immer eine Sicherungskopie deines echten Spielstands.', trainer: 'Trainer', party: 'Team', box: 'Box',
    name: 'Name', money: 'Geld', gender: 'Geschlecht', male: 'Männlich', female: 'Weiblich', time: 'Spielzeit (Std : Min)', empty: 'Leer', apply: 'Übernehmen', remove: 'Entfernen', create: 'Neues Pokémon',
    formName: 'Form', hiddenAb: 'VF', allAb: 'Alle Fähigkeiten (Cheat)', species: 'Pokémon', nick: 'Spitzname', level: 'Level', exp: 'Erfahrung', item: 'Item', none: '–', nature: 'Wesen', shiny: 'Shiny', friendship: 'Freundschaft', egg: 'Ei', ability: 'Fähigkeit',
    slot2: 'Zweite Fähigkeit', moves: 'Attacken', pp: 'AP', ppups: 'AP-Ups', ev: 'EP', iv: 'IP', stats: 'Werte', ot: 'Ursprungstrainer', stat: ['KP', 'Angr', 'Vert', 'Init', 'SpA', 'SpV'],
    dv: 'DVs', statexp: 'Erfahrungswerte (EP)', gbstat: ['KP', 'Angr', 'Vert', 'Init', 'Spezial'], edit: 'Pokémon bearbeiten', ok: 'Pokémon übernommen (noch nicht gespeichert).', evsum: 'EP-Summe', delconfirm: 'Dieses Pokémon entfernen?', all: 'Maximal', self: 'Eigenes Team'
  } : {
    title: 'Save File Editor', sub: 'Edit save files: party, boxes, Pokémon (stats, moves, item, nature, shiny) and trainer data. The original file stays untouched, you save a new file. Supported: generations 1 to 9 (incl. Switch).',
    pick: 'Choose save file …', drop: 'or drag a .sav / .dsv / Switch main file here', bad: 'This file is not recognized. Generation 1–7 (.sav, .dsv, 3DS main) and Switch generation 8–9 (Sword/Shield, Legends: Arceus, Scarlet/Violet) saves are supported.',
    game: 'Detected:', save: 'Save file', saved: 'Saved. Always keep a backup of your real save first.', trainer: 'Trainer', party: 'Party', box: 'Box',
    name: 'Name', money: 'Money', gender: 'Gender', male: 'Male', female: 'Female', time: 'Play time (h : min)', empty: 'Empty', apply: 'Apply', remove: 'Remove', create: 'New Pokémon',
    formName: 'Form', hiddenAb: 'HA', allAb: 'All abilities (cheat)', species: 'Pokémon', nick: 'Nickname', level: 'Level', exp: 'Experience', item: 'Item', none: '–', nature: 'Nature', shiny: 'Shiny', friendship: 'Friendship', egg: 'Egg', ability: 'Ability',
    slot2: 'Second ability', moves: 'Moves', pp: 'PP', ppups: 'PP Ups', ev: 'EVs', iv: 'IVs', stats: 'Stats', ot: 'Original trainer', stat: ['HP', 'Atk', 'Def', 'Spe', 'SpA', 'SpD'],
    dv: 'DVs', statexp: 'Stat experience', gbstat: ['HP', 'Atk', 'Def', 'Spe', 'Special'], edit: 'Edit Pokémon', ok: 'Pokémon applied (not saved yet).', evsum: 'EV total', delconfirm: 'Remove this Pokémon?', all: 'Max', self: 'Own party'
  };

  var X = de ? {
    tabMon: 'Pokémon', tabTrainer: 'Trainer', tMain: 'Haupt', tStats: 'Werte', tMoves: 'Attacken', tOt: 'Herkunft', set: 'Setzen', del: 'Löschen', exp2: 'Exportieren (.pk)', sdBtn: 'Showdown-Text', sdCopy: 'Kopieren', sdApply: 'Übernehmen', sdClose: 'Schließen', sdBad: 'Pokémon im Text nicht erkannt', imp: 'Importieren (.pk)',
    boxPrev: 'Vorherige Box', boxNext: 'Nächste Box', sortSp: 'Nach Dex-Nr. sortieren', sortLv: 'Nach Level sortieren', clearBox: 'Box leeren', clearConfirm: 'Alle Pokémon dieser Box entfernen?',
    legalize: 'Legal machen', maxDv: 'Alle DVs 15', zeroSe: 'Alle Stat-EP 0', maxSe: 'Stat-EP max', maxIv: 'Alle IP 31', zeroEv: 'Alle EP 0', maxEv: 'EP 252/252/6', hint: window.RL_ANDROID ? 'Antippen zum Bearbeiten, „Verschieben / Tauschen“ zum Umsetzen zwischen Boxen und Team.' : 'Ziehen zum Verschieben oder Tauschen, Strg beim Ablegen kopiert. Entf löscht das markierte Pokémon.',
    moveBtn: 'Verschieben / Tauschen', moveCancel: 'Abbrechen', movePick: 'Verschieben: Tippe zuerst ein Pokémon an.', moveDst: 'Verschieben: Tippe Ziel-Slot an (Box oder Team) zum Verschieben oder Tauschen.', moveDone: 'Verschoben / getauscht (noch nicht gespeichert).',
    fShiny: 'Nur Shiny', fEgg: 'Nur Eier',
    boxName: 'Box-Name', batchRun: 'Anwenden', batchAsk: 'Diese Änderung auf alle gewählten Pokémon anwenden?', batchDone: '{0} Pokémon bearbeitet (noch nicht gespeichert).',
    scope_box: 'Aktuelle Box', scope_boxes: 'Alle Boxen', scope_party: 'Team',
    act_dv15: 'Alle DVs 15', act_se0: 'Alle Stat-EP 0', act_semax: 'Stat-EP max', act_lv100: 'Level 100', act_iv31: 'Alle IP 31', act_ev0: 'Alle EP 0', act_ev252: 'EP 252/252/6', act_noitem: 'Items entfernen', act_shiny: 'Shiny machen', act_unshiny: 'Shiny entfernen', act_heal: 'Heilen (Team)',
    metDate: 'Fangdatum', eggDate: 'Ei-Datum', otGender: 'Geschlecht des Trainers', form: 'Form (Nr.)',
    hours: 'Stunden', minutes: 'Minuten', seconds: 'Sekunden', coins: 'Münzen', bp: 'Kampfpunkte (BP)',
    badges: 'Orden', badge: 'Orden', badgeA: 'Region 1', badgeB: 'Region 2',
    tabHof: 'Ruhmeshalle', hofEmpty: 'Noch kein Eintrag in der Ruhmeshalle.', hofClear: 'Ruhmeshalle leeren', hofAsk: 'Alle Einträge der Ruhmeshalle löschen?', hofNo: 'Eintrag',
    tabWc: 'Geheimgeschehen', wcEmpty: 'Keine Wunderkarten im Spielstand.', wcUsed: 'Eingelöst', wcUnused: 'Offen (abholbar)', wcImp: 'Karte importieren', wcExp: 'Export', wcClearFlags: 'Erhalten-Flags leeren', wcBad: 'Ungültige Wunderkarten-Datei (erwartet {0}, {1} Bytes).', wcSlot: 'Platz',
    tabItems: 'Items', tabDex: 'Pokédex', tabEvents: 'Events', tRib: 'Bänder', ribNone: 'Für dieses Format gibt es keine Bänder.', ribAll: 'Alle', ribClear: 'Keine',
    pItems: 'Items', pKey: 'Basis-Items', pTm: 'TMs & VMs', pMail: 'Briefe', pMed: 'Medizin', pBerry: 'Beeren', pBall: 'Bälle', pBattle: 'Kampf-Items', pPc: 'PC-Items', pZ: 'Z-Kristalle',
    giveAll: 'Alles geben (Max)', clearPouch: 'Tasche leeren', sortPouch: 'Nach ID sortieren', addItem: '+ Item hinzufügen', slotsUsed: 'Plätze belegt', noBag: 'Für diesen Spielstand gibt es noch keinen Editor.', outOfList: 'nicht in der Standardliste',
    seenL: 'Gesehen', caughtL: 'Gefangen', seenAll: 'Alle gesehen', caughtAll: 'Alle gefangen', dexClear: 'Dex leeren', dexFilter: 'Pokémon suchen …',
    evFlags: 'Flags', evWork: 'Werte', evSearch: 'Nach Nr. oder Name suchen …', evNum: 'Nr.', evToggle: 'Umschalten', evNote: 'Event-Flags und Arbeitswerte steuern den Spielfortschritt. Ändere nur, was du kennst, und arbeite an einer Kopie.', evNone: 'Keine Treffer.', locUnknown: 'Unbekannt',
    tHex: 'Hex', pokerus: 'Pokérus', metLoc: 'Fundort (ID)', eggLoc: 'Ei-Ort (ID)', lang: 'Sprache (ID)', contest: ['Coolness', 'Schönheit', 'Anmut', 'Klugheit', 'Stärke', 'Fell'], contestT: 'Wettbewerbswerte',
    legal: 'Legal', illegal: 'Illegal', suspicious: 'Verdächtig',
    find: 'Suchen …', findNone: 'Nichts gefunden.', findIn: 'Box', heal: 'Team heilen', maxBox: 'Box: alle IP 31', chk: 'Prüfung', chkOk: 'Keine Auffälligkeiten.', hexCopy: 'Hex kopieren', hexNote: 'Entschlüsselte Rohdaten des Pokémon (nur Ansicht).',
    cEv: 'EP-Summe über 510', cMove: 'Doppelte Attacke', cNoMove: 'Keine Attacke', cNick: 'Spitzname zu lang', cLv: 'Level außerhalb 1–100', cIv: 'IP über 31', cEmpty: 'Leerer Name des Ursprungstrainers', cShinyLock: 'Shiny, Ei oder Zustand prüfen',
    dirty: 'Ungespeicherte Änderungen', impBad: 'Datei passt nicht zu diesem Spielstand.', nothing: 'Kein Pokémon ausgewählt.', ball: 'Ball', metLv: 'Level beim Fang',
    memeWarn: 'Achtung: Die Gen-7-Signatur (MemeCrypto) konnte nicht erneuert werden – das Spiel lehnt diesen Spielstand eventuell ab.'
  } : {
    tabMon: 'Pokémon', tabTrainer: 'Trainer', tMain: 'Main', tStats: 'Stats', tMoves: 'Moves', tOt: 'OT / Misc', set: 'Set', del: 'Delete', exp2: 'Export (.pk)', sdBtn: 'Showdown text', sdCopy: 'Copy', sdApply: 'Apply', sdClose: 'Close', sdBad: 'Pokémon in the text not recognized', imp: 'Import (.pk)',
    boxPrev: 'Previous box', boxNext: 'Next box', sortSp: 'Sort by Dex no.', sortLv: 'Sort by level', clearBox: 'Clear box', clearConfirm: 'Remove all Pokémon in this box?',
    legalize: 'Make legal', maxDv: 'All DVs 15', zeroSe: 'All stat exp 0', maxSe: 'Max stat exp', maxIv: 'All IVs 31', zeroEv: 'All EVs 0', maxEv: 'EVs 252/252/6', hint: window.RL_ANDROID ? 'Tap to edit, use “Move / Swap” to move Pokémon between boxes and party.' : 'Drag to move or swap, hold Ctrl when dropping to copy. Delete removes the selected Pokémon.',
    moveBtn: 'Move / Swap', moveCancel: 'Cancel', movePick: 'Move: Tap a Pokémon first.', moveDst: 'Move: Tap a target slot (Box or Party) to move or swap.', moveDone: 'Moved / swapped (not saved yet).',
    fShiny: 'Shiny only', fEgg: 'Eggs only',
    boxName: 'Box name', batchRun: 'Apply', batchAsk: 'Apply this change to all selected Pokémon?', batchDone: '{0} Pokémon edited (not saved yet).',
    scope_box: 'Current box', scope_boxes: 'All boxes', scope_party: 'Party',
    act_dv15: 'All DVs 15', act_se0: 'All stat exp 0', act_semax: 'Max stat exp', act_lv100: 'Level 100', act_iv31: 'All IVs 31', act_ev0: 'All EVs 0', act_ev252: 'EVs 252/252/6', act_noitem: 'Remove items', act_shiny: 'Make shiny', act_unshiny: 'Remove shiny', act_heal: 'Heal (party)',
    metDate: 'Met date', eggDate: 'Egg date', otGender: 'OT gender', form: 'Form (no.)',
    hours: 'Hours', minutes: 'Minutes', seconds: 'Seconds', coins: 'Coins', bp: 'Battle Points (BP)',
    badges: 'Badges', badge: 'Badge', badgeA: 'region 1', badgeB: 'region 2',
    tabHof: 'Hall of Fame', hofEmpty: 'No Hall of Fame entry yet.', hofClear: 'Clear Hall of Fame', hofAsk: 'Delete all Hall of Fame entries?', hofNo: 'Entry',
    tabWc: 'Mystery Gifts', wcEmpty: 'No Wonder Cards in this save.', wcUsed: 'Redeemed', wcUnused: 'Unused (claimable)', wcImp: 'Import card', wcExp: 'Export', wcClearFlags: 'Clear received flags', wcBad: 'Invalid Wonder Card file (expected {0}, {1} bytes).', wcSlot: 'Slot',
    tabItems: 'Items', tabDex: 'Pokédex', tabEvents: 'Events', tRib: 'Ribbons', ribNone: 'This format has no ribbons.', ribAll: 'All', ribClear: 'None',
    pItems: 'Items', pKey: 'Key Items', pTm: 'TMs & HMs', pMail: 'Mail', pMed: 'Medicine', pBerry: 'Berries', pBall: 'Balls', pBattle: 'Battle Items', pPc: 'PC Items', pZ: 'Z-Crystals',
    giveAll: 'Give all (max)', clearPouch: 'Clear pouch', sortPouch: 'Sort by ID', addItem: '+ Add item', slotsUsed: 'slots used', noBag: 'There is no editor for this save yet.', outOfList: 'not in the standard list',
    seenL: 'Seen', caughtL: 'Caught', seenAll: 'All seen', caughtAll: 'All caught', dexClear: 'Clear Pokédex', dexFilter: 'Search Pokémon …',
    evFlags: 'Flags', evWork: 'Work values', evSearch: 'Search by number or name …', evNum: 'No.', evToggle: 'Toggle', evNote: 'Event flags and work values control story progress. Only change what you know and work on a copy.', evNone: 'No matches.', locUnknown: 'Unknown',
    tHex: 'Hex', pokerus: 'Pokérus', metLoc: 'Met location (ID)', eggLoc: 'Egg location (ID)', lang: 'Language (ID)', contest: ['Cool', 'Beauty', 'Cute', 'Smart', 'Tough', 'Sheen'], contestT: 'Contest stats',
    legal: 'Legal', illegal: 'Illegal', suspicious: 'Suspicious',
    find: 'Search …', findNone: 'Nothing found.', findIn: 'Box', heal: 'Heal party', maxBox: 'Box: all IVs 31', chk: 'Check', chkOk: 'No issues found.', hexCopy: 'Copy hex', hexNote: 'Decrypted raw data of the Pokémon (view only).',
    cEv: 'EV total above 510', cMove: 'Duplicate move', cNoMove: 'No move', cNick: 'Nickname too long', cLv: 'Level outside 1–100', cIv: 'IV above 31', cEmpty: 'Empty OT name', cShinyLock: 'Check shiny, egg or status',
    dirty: 'Unsaved changes', impBad: 'File does not fit this save.', nothing: 'No Pokémon selected.', ball: 'Ball', metLv: 'Met level',
    memeWarn: 'Warning: the Gen 7 signature (MemeCrypto) could not be renewed – the game may reject this save.'
  };
  var st = { sv: null, name: '', orig: null, base: 0, err: '', msg: '', box: 0, sel: null, mon: null, dirty: false, tab: 'main', pane: 'mon', pi: 0, ev: 'flags', moveFrom: null };
  var root;

  function download(name, bytes) { A.saveFile(name, bytes); }
  function nm(list, i) { return (list && list[i]) || ''; }
  function speciesName(nat) { return nm(T.species, nat); }
  function itemList() { return T[st.sv.items]; }
  function maxMove() { return st.sv.maxMove; }
  function maxItem() { return st.sv.maxItem; }
  function maxAbility() { return st.sv.maxAbility; }
  // Basiswerte/Fähigkeiten/Geschlecht je Art und Form (Formen aus PKHeX-Personal-Daten fN; Gen 3: Deoxys je Spiel)
  function pers(species, form) {
    var sv = st.sv, nat = sv.natOf(species), tab = P['g' + sv.gen] || P.g7, e = tab && tab[nat], ft = form > 0 && P['f' + sv.gen] && P['f' + sv.gen][nat];
    if (sv.gen === 3 && nat === 386 && P.deoxys3) e = P.deoxys3[sv.game === 'FRLG' ? 'FR' : sv.game] || e; // FR/BG lassen sich im Spielstand nicht unterscheiden
    if (ft && ft[form - 1]) e = ft[form - 1];
    return e || [50, 50, 50, 50, 50, 50, 0, 127, 0, 0];
  }
  function formOf(d) { return st.sv.gen >= 4 && !st.sv.gb ? (st.sv.fmt.get(d, 'form') || 0) : 0; }
  function persD(d) { return pers(st.sv.fmt.get(d, 'species'), formOf(d)); }
  function isShiny(d) { var F = st.sv.fmt; if (F.gb) return F.shiny(d); var p = F.get(d, 'pid'); return ((F.get(d, 'tid') ^ F.get(d, 'sid') ^ (p >>> 16) ^ (p & 0xFFFF)) >>> 0) < (st.sv.gen >= 6 ? 16 : 8); }
  function unownLetter(p) { return ((((p >>> 24) & 3) << 6) | (((p >>> 16) & 3) << 4) | (((p >>> 8) & 3) << 2) | (p & 3)) % 28; }
  // neue PID mit gewünschtem Wesen / Shiny-Status. Erhalten bleiben: Low-Byte (Geschlecht, Gen 3/4 Fähigkeit = Bit 0), Gen 5 Fähigkeit (Bit 16),
  // wenn möglich auch Gen-3-Icognito-Buchstabe und Waumpel-Entwicklung (Gen 3–5). Die Suche ist deterministisch und endlich:
  // Shiny: Low-Word frei (Bits 8–15), High-Word = TID^SID^Low^x mit x < 8 (Gen 6+: 16); sonst High-Word über alle 65536 Werte.
  // gender (optional): 0 = männlich, 1 = weiblich -> Low-Byte der PID wird passend zum Geschlechterverhältnis gewählt
  function newPid(d, nature, shiny, gender) {
    var sv = st.sv, F = sv.fmt, gen = sv.gen, old = F.get(d, 'pid'), tsv = (F.get(d, 'tid') ^ F.get(d, 'sid')) & 0xFFFF, thr = gen >= 6 ? 16 : 8;
    var nat = sv.natOf(F.get(d, 'species')), ratio = persD(d)[7], bit = old & 1, c;
    var gNow = (old & 0xFF) < ratio ? 1 : 0, want = gender !== undefined && gen <= 5 ? gender : gNow;
    function lowOk(c) { return (ratio === 0 || ratio >= 254 || (c < ratio ? 1 : 0) === want) && ((gen !== 3 && gen !== 4) || (c & 1) === bit); }
    var lows = [];
    if (gender !== undefined && gen <= 5) { for (c = 0; c < 256; c++) if (lowOk(c)) lows.push(c); }
    else lows.push(old & 0xFF);
    var allLows = []; for (c = 0; c < 256; c++) if (lowOk(c)) allLows.push(c);
    var r = Math.floor(Math.random() * 65536);
    function shuffled(l) { l = l.slice(); for (var i = l.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = l[i]; l[i] = l[j]; l[j] = t; } return l; }
    function hard(p) {
      if (F.natureIsPid && p % 25 !== nature) return false;
      if ((((tsv ^ (p >>> 16) ^ (p & 0xFFFF)) >>> 0) < thr) !== shiny) return false;
      return gen !== 5 || ((p >>> 16) & 1) === ((old >>> 16) & 1);
    }
    function soft(p) {
      if (gen === 3 && nat === 201 && unownLetter(p) !== unownLetter(old)) return false;
      if (gen >= 3 && gen <= 5 && nat >= 265 && nat <= 269 && (((p >>> 16) % 10) < 5) !== (((old >>> 16) % 10) < 5)) return false;
      return true;
    }
    function search(lowList, useSoft) {
      for (var li = 0; li < lowList.length; li++) {
        var low = lowList[li], lo, hi, p, m, k;
        if (shiny) {
          for (m = 0; m < 256; m++) {
            lo = ((((m + r) & 0xFF) << 8) | low) >>> 0;
            for (k = 0; k < thr; k++) { hi = (tsv ^ lo ^ k) & 0xFFFF; p = ((hi << 16) | lo) >>> 0; if (hard(p) && (!useSoft || soft(p))) return p; }
          }
        } else {
          lo = ((old & 0xFF00) | low) >>> 0;
          for (k = 0; k < 65536; k++) { hi = (r + k) & 0xFFFF; p = ((hi << 16) | lo) >>> 0; if (hard(p) && (!useSoft || soft(p))) return p; }
        }
      }
      return -1;
    }
    var res = search(shuffled(lows), true);
    if (res < 0) res = search(shuffled(lows), false);
    if (res < 0) res = search(shuffled(allLows), false);
    return res < 0 ? old : res;
  }
  function recalc(d, partyMon) {
    var F = st.sv.fmt, sp = F.get(d, 'species'), base = persD(d).slice(0, 6), growth = persD(d)[6];
    var iv = [], ev = [], i;
    for (i = 0; i < 6; i++) { iv.push(F.get(d, 'iv', i)); ev.push(F.get(d, 'ev', i)); }
    var lv = S.levelFor(growth, F.get(d, 'exp'));
    return { level: lv, stats: S.calcStats(base, lv, iv, ev, F.nature(d), st.sv.natOf(sp) === 292) };
  }
  // Grenzen: EP je Wert 252 ab Gen 6 (vorher 255), Summe 510; Geld Gen 1–4 999.999, ab Gen 5 9.999.999
  function evMax() { return st.sv.gen >= 6 ? 252 : 255; }
  function clampEv(d, s, v) { var F = st.sv.fmt, other = 0; for (var i = 0; i < 6; i++) if (i !== s) other += F.get(d, 'ev', i); return Math.max(0, Math.min(v, evMax(), 510 - other)); }
  function maxMoney(gen) { return gen >= 5 ? 9999999 : 999999; }
  // AP-Maximum aus Basis-AP (PKHeX-Tabelle) und AP-Ups; Gen 1/2 höchstens +7 je AP-Up (6 Bit)
  function ppUps(d, m) { var F = st.sv.fmt; return st.sv.gen === 3 ? (F.get(d, 'ppups') >> (m * 2)) & 3 : F.get(d, 'ppups', m); }
  function ppMax(mv, ups) {
    var gb = !!st.sv.gb, cap = gb ? 63 : 99, t = window.PKHEX && window.PKHEX.pp && window.PKHEX.pp['gen' + st.sv.gen], b = t && mv ? t[mv] : 0;
    if (!mv) return 0;
    if (!b) return cap;
    var inc = Math.floor(b / 5); if (gb) inc = Math.min(7, inc);
    return Math.min(cap, b + inc * (ups || 0));
  }
  function refreshParty(d) {
    var F = st.sv.fmt, r = recalc(d);
    F.set(d, 'level', r.level);
    var hpFull = F.get(d, 'hp') >= (F.stats(d)[0] || 0);
    F.setStats(d, r.stats);
    if (hpFull) F.set(d, 'hp', r.stats[0]);
  }
  function blank(species, party) {
    if (st.sv.blank) {
      var nd = st.sv.blank(species, st.sv.getTrainer()); st.sv.fmt.set(nd, 'nick', speciesName(species));
      if (party) refreshParty(nd);
      return nd;
    }
    var sv = st.sv, F = sv.fmt, d = new Uint8Array(party ? F.partySize : F.size), t = sv.getTrainer(), lang = de ? 5 : 2;
    F.set(d, 'pid', ((Math.random() * 0x10000) << 16 | (Math.random() * 0x10000)) >>> 0);
    F.set(d, 'tid', t.tid); F.set(d, 'sid', t.sid);
    F.set(d, 'species', species); F.set(d, 'friendship', 70);
    if (sv.gen === 3) {
      d[18] = lang; d[19] = 2;
      F.set(d, 'ot', t.name); F.set(d, 'nick', speciesName(sv.natOf(species)).toUpperCase());
      var o = d[70] | (d[71] << 8); o = 5 | ((sv.game === 'E' ? 3 : sv.game === 'FRLG' ? 4 : 2) << 7) | (4 << 11) | ((t.gender ? 1 : 0) << 15);
      d[70] = o & 255; d[71] = o >> 8;
      for (var i = 0; i < 6; i++) F.set(d, 'iv', 15 + 0, i);
    } else {
      d[0x17] = lang;
      // Ursprungsspiel passend zum Spielstand (vor dem Ball: HGSS-Ball hängt davon ab), Fundort und Fangdatum heute
      if (sv.version) F.set(d, 'version', sv.version);
      // Gen 4: Artnamen ohne Spitznamen stehen in Großbuchstaben, ab Gen 5 normal geschrieben
      F.set(d, 'ot', t.name); F.set(d, 'nick', sv.gen === 4 ? speciesName(species).toUpperCase() : speciesName(species)); F.set(d, 'ball', 4); d[132] = 5 | ((t.gender ? 1 : 0) << 7);
      if (sv.defaultMetLoc) F.set(d, 'metLoc', sv.defaultMetLoc);
      var now = new Date(); F.set(d, 'metYear', now.getFullYear() - 2000); F.set(d, 'metMonth', now.getMonth() + 1); F.set(d, 'metDay', now.getDate());
      for (var j = 0; j < 6; j++) F.set(d, 'iv', 15, j);
    }
    F.set(d, 'exp', S.expFor(pers(species)[6], 5));
    var g = pers(species)[7], pid = F.get(d, 'pid'), abBit = sv.gen === 5 ? (pid >>> 16) & 1 : pid & 1; // Gen 5: Fähigkeits-Slot = PID-Bit 16
    if (sv.gen >= 4) { d[64] = (d[64] & ~6) | ((g === 255 ? 2 : g === 254 ? 1 : g === 0 ? 0 : ((pid & 0xFF) < g ? 1 : 0)) << 1); F.set(d, 'ability', pers(species)[8 + abBit] || pers(species)[8]); }
    var mv = defaultMoves(species);
    for (var k = 0; k < 4; k++) { F.set(d, 'move', mv[k] || 0, k); F.set(d, 'pp', mv[k] ? 10 : 0, k); }
    if (party) refreshParty(d);
    return d;
  }
  function defaultMoves() { return [1]; }

  function load(file) {
    st.err = ''; st.msg = ''; st.sel = null; st.mon = null; st.moveFrom = null;
    var fr = new FileReader();
    fr.onload = function () {
      var u8 = new Uint8Array(fr.result), sv = null;
      try { sv = S.open(u8); } catch (e) { sv = null; }
      if (!sv) { st.sv = null; st.err = L.bad; return render(); }
      if (window.CCSaveExt) { try { window.CCSaveExt(sv, P); } catch (e) { /* Erweiterung nicht verfügbar */ } }
      if (window.CCSaveHof) { try { window.CCSaveHof(sv); } catch (e) { /* keine Ruhmeshalle */ } }
      st.sv = sv; st.name = file.name; st.orig = u8; st.box = 0; st.dirty = false;
      st.base = u8.length === 0x80000 + 0xA4 ? 0xA4 : 0;
      render();
    };
    fr.readAsArrayBuffer(file);
  }

  function select(kind, box, slot) { st.sel = { kind: kind, box: box, slot: slot }; var d = kind === 'party' ? st.sv.getParty()[slot] : st.sv.getBoxMon(box, slot); st.mon = d ? new Uint8Array(d) : null; st.msg = ''; render(); }
  function partyList() { var p = st.sv.getParty(); while (p.length < 6) p.push(null); return p; }

  function slotBtn(d, on, onClick) {
    var b = el('button', { type: 'button', class: 'sv-slot' + (on ? ' on' : '') + (d ? '' : ' empty') });
    if (d) {
      var F = st.sv.fmt, sp = F.get(d, 'species'), nat = st.sv.natOf(sp), nd = window.NATDEX && window.NATDEX[nat];
      var img = nd ? A.spriteById(nd[0], '', isShiny(d), speciesName(nat)) : el('span');
      if (img.classList) img.classList.add('sv-sprite'); b.appendChild(img);
      var lv = F.get(d, 'level') || S.levelFor(pers(sp)[6], F.get(d, 'exp'));
      b.appendChild(el('span', { class: 'sv-slot-n', text: speciesName(nat) }));
      b.appendChild(el('span', { class: 'sv-slot-l', text: 'Lv' + lv }));
      if (F.get(d, 'egg')) b.classList.add('egg');
    } else b.appendChild(el('span', { class: 'sv-slot-n', text: '+' }));
    b.onclick = onClick; return b;
  }
  function field(label, ctrl, cls) { var r = el('label', { class: 'sv-f ' + (cls || '') }); r.appendChild(el('span', { class: 'sv-fl', text: label })); r.appendChild(ctrl); return r; }
  function num(v, min, max, on) { var i = el('input', { type: 'number', min: min, max: max, class: 'sv-num' }); i.value = v; i.onchange = function () { var x = Math.max(min, Math.min(max, +i.value || 0)); i.value = x; on(x); }; return i; }
  function opts(list, max, cur, first) {
    var h = first ? '<option value="0">' + esc(first) + '</option>' : '';
    for (var k = first ? 1 : 0; k <= max; k++) { var n = list[k]; if (!n && k) continue; h += '<option value="' + k + '"' + (k === cur ? ' selected' : '') + '>' + esc(k + ' ' + (n || '')) + '</option>'; }
    return h;
  }
  function select2(html, on) { var s = el('select', { class: 'sv-sel' }, html); s.onchange = function () { on(+s.value); }; return s; }

  // ---------- Generation 1/2 (DVs statt IP, Erfahrungswerte statt EP, kein Wesen / keine Fähigkeit) ----------
  function gbBlank(party) {
    var sv = st.sv, F = sv.fmt, t = sv.getTrainer(), d = F.blank(1, t.tid, t.name, 5);
    F.set(d, 'nick', speciesName(1).toUpperCase());
    gbRefresh(d, party); return d;
  }
  function gbRecalc(d) {
    var sv = st.sv, F = sv.fmt, sp = F.get(d, 'species'), g = sv.growthOf(sp), lv = S.levelFor(g, F.get(d, 'exp')), dv = [], se = [], i;
    for (i = 0; i < 4; i++) dv.push(F.get(d, 'dv', i));
    for (i = 0; i < 5; i++) se.push(F.get(d, 'ev', i));
    return { level: lv, stats: window.CCSaveGB.calc(sv.baseOf(sp), lv, dv, se) };
  }
  // party: false = Box-Pokémon. Gen 2 speichert KP und Werte nur im Team (Box-Struktur 32 Byte), dort wird nichts davon geschrieben.
  function gbRefresh(d, party) {
    var F = st.sv.fmt, r = gbRecalc(d);
    F.set(d, 'level', r.level);
    if (party === false && st.sv.gen === 2) return;
    var oldMax = F.stats(d)[0] || 0, full = !oldMax || F.get(d, 'hp') >= oldMax;
    F.setStats(d, r.stats);
    if (full || F.get(d, 'hp') > r.stats[0]) F.set(d, 'hp', r.stats[0]);
  }
  function gbEditor(box, d, party) {
    var sv = st.sv, F = sv.fmt;
    function changed() { render(); }
    var sp = F.get(d, 'species'), g = sv.growthOf(sp);
    var natOpts = ''; for (var n = 1; n <= sv.maxSpecies; n++) natOpts += '<option value="' + n + '"' + (n === sp ? ' selected' : '') + '>#' + n + ' ' + esc(speciesName(n)) + '</option>';
    box.appendChild(field(L.species, select2(natOpts, function (v) {
      if (F.get(d, 'nick') === speciesName(sp).toUpperCase()) F.set(d, 'nick', speciesName(v).toUpperCase());
      F.set(d, 'species', v); gbRefresh(d, party); changed();
    })));
    var nk = el('input', { type: 'text', class: 'sv-txt', maxlength: 10 }); nk.value = F.get(d, 'nick'); nk.onchange = function () { F.set(d, 'nick', nk.value.toUpperCase()); };
    box.appendChild(field(L.nick, nk));
    var row = el('div', { class: 'sv-row' }), lvl = S.levelFor(g, F.get(d, 'exp'));
    row.appendChild(field(L.level, num(lvl, 1, 100, function (v) { F.set(d, 'exp', S.expFor(g, v)); gbRefresh(d, party); changed(); }), 'sm'));
    row.appendChild(field(L.exp, num(F.get(d, 'exp'), 0, 1640000, function (v) { F.set(d, 'exp', v); gbRefresh(d, party); changed(); }), 'sm'));
    if (sv.gen === 2) row.appendChild(field(L.friendship, num(F.get(d, 'friendship'), 0, 255, function (v) { F.set(d, 'friendship', v); }), 'sm'));
    box.appendChild(row);
    if (sv.gen === 2) {
      box.appendChild(field(L.item, select2(opts(itemList(), maxItem(), F.get(d, 'item'), L.none), function (v) { F.set(d, 'item', v); })));
      var row2 = el('div', { class: 'sv-row' });
      var sh = el('input', { type: 'checkbox' }); sh.checked = F.shiny(d); sh.onchange = function () { F.setShiny(d, sh.checked); changed(); };
      var shl = el('label', { class: 'sv-check' }); shl.appendChild(sh); shl.appendChild(el('span', { text: L.shiny })); row2.appendChild(shl);
    var eg = el('input', { type: 'checkbox' }); eg.checked = !!F.get(d, 'egg'); eg.onchange = function () { F.set(d, 'egg', eg.checked ? 1 : 0); };
      var egl = el('label', { class: 'sv-check' }); egl.appendChild(eg); egl.appendChild(el('span', { text: L.egg })); row2.appendChild(egl);
      box.appendChild(row2);
    }
    var mt = el('div', { class: 'sv-moves' });
    for (var m = 0; m < 4; m++) (function (m) {
      var r = el('div', { class: 'sv-mrow' });
      r.appendChild(select2(opts(T.moves, maxMove(), F.get(d, 'move', m), L.none), function (v) { F.set(d, 'move', v, m); F.set(d, 'pp', v ? ppMax(v, F.get(d, 'ppups', m)) : 0, m); changed(); }));
      r.appendChild(num(F.get(d, 'pp', m), 0, ppMax(F.get(d, 'move', m), F.get(d, 'ppups', m)), function (v) { F.set(d, 'pp', v, m); }));
      r.appendChild(num(F.get(d, 'ppups', m), 0, 3, function (v) { F.set(d, 'ppups', v, m); F.set(d, 'pp', Math.min(F.get(d, 'pp', m), ppMax(F.get(d, 'move', m), v)), m); changed(); }));
      mt.appendChild(r);
    })(m);
    var mh = el('div', { class: 'sv-mrow sv-mhead' }); mh.appendChild(el('span', { text: L.moves })); mh.appendChild(el('span', { text: L.pp })); mh.appendChild(el('span', { text: L.ppups }));
    box.appendChild(mh); box.appendChild(mt);
    var r = gbRecalc(d);
    var tbl = el('table', { class: 'sv-stats' });
    tbl.innerHTML = '<tr><th></th>' + L.gbstat.map(function (x) { return '<th>' + esc(x) + '</th>'; }).join('') + '</tr>';
    var rEv = el('tr'), rDv = el('tr'), rSt = el('tr'); rEv.appendChild(el('th', { text: L.statexp })); rDv.appendChild(el('th', { text: L.dv })); rSt.appendChild(el('th', { text: L.stats }));
    for (var s = 0; s < 5; s++) (function (s) {
      var e = el('td'); e.appendChild(num(F.get(d, 'ev', s), 0, 65535, function (v) { F.set(d, 'ev', v, s); gbRefresh(d, party); changed(); })); rEv.appendChild(e);
      var dc = el('td');
      if (s === 0) dc.appendChild(el('span', { text: String(((F.get(d, 'dv', 0) & 1) << 3) | ((F.get(d, 'dv', 1) & 1) << 2) | ((F.get(d, 'dv', 2) & 1) << 1) | (F.get(d, 'dv', 3) & 1)) }));
      else dc.appendChild(num(F.get(d, 'dv', s - 1), 0, 15, function (v) { F.set(d, 'dv', v, s - 1); gbRefresh(d, party); changed(); }));
      rDv.appendChild(dc);
      rSt.appendChild(el('td', { text: s === 4 && r.stats.length > 5 ? r.stats[4] + ' / ' + r.stats[5] : String(r.stats[s]) })); // Gen 2: SpA / SpV
    })(s);
    tbl.appendChild(rEv); tbl.appendChild(rDv); tbl.appendChild(rSt); box.appendChild(tbl);
    var ot = el('input', { type: 'text', class: 'sv-txt', maxlength: 7 }); ot.value = F.get(d, 'ot'); ot.onchange = function () { F.set(d, 'ot', ot.value.toUpperCase()); };
    var row3 = el('div', { class: 'sv-row' });
    row3.appendChild(field(L.ot, ot));
    row3.appendChild(field('TID', num(F.get(d, 'tid'), 0, 65535, function (v) { F.set(d, 'tid', v); }), 'sm'));
    box.appendChild(row3);
    (function () {
      var lines = [], NL = String.fromCharCode(10);
      for (var o = 0; o < d.length; o += 16) {
        var hx = '', ac = '';
        for (var q = 0; q < 16 && o + q < d.length; q++) { var bv = d[o + q]; hx += (bv < 16 ? '0' : '') + bv.toString(16).toUpperCase() + ' '; ac += bv >= 32 && bv < 127 ? String.fromCharCode(bv) : '.'; }
        lines.push(('000' + o.toString(16).toUpperCase()).slice(-4) + '  ' + (hx + '                                                ').slice(0, 48) + ' ' + ac);
      }
      var det = el('details', { class: 'sv-hexbox' }); det.appendChild(el('summary', { text: X.tHex }));
      det.appendChild(el('div', { class: 'hint', text: X.hexNote })); det.appendChild(el('pre', { class: 'sv-hex', text: lines.join(NL) }));
      box.appendChild(det);
    })();
    var gqb = el('div', { class: 'sv-row sv-quick' });
    [[X.maxDv, function () { for (var q = 0; q < 4; q++) F.set(d, 'dv', 15, q); }], [X.zeroSe, function () { for (var q = 0; q < 5; q++) F.set(d, 'ev', 0, q); }], [X.maxSe, function () { for (var q = 0; q < 5; q++) F.set(d, 'ev', 65535, q); }]].forEach(function (c) {
      var b2 = el('button', { type: 'button', class: 'sv-mini', text: c[0] }); b2.onclick = function () { c[1](); gbRefresh(d, party); changed(); render(); }; gqb.appendChild(b2);
    });
    box.appendChild(gqb);
    var bar = el('div', { class: 'sv-bar' });
    var ap = el('button', { class: 'primary-btn', text: L.apply }); ap.onclick = apply; bar.appendChild(ap);
    var gmv = el('button', { type: 'button', class: 'sv-mini sv-move-btn' + (st.moveFrom && st.moveFrom !== 'pick' && sameLoc(st.moveFrom, st.sel) ? ' on' : ''), text: X.moveBtn }); gmv.onclick = function () { toggleMove(st.sel); }; bar.appendChild(gmv);
    var gex = el('button', { type: 'button', class: 'sv-mini', text: X.exp2 }); gex.onclick = exportMon; bar.appendChild(gex);
    var gim = el('button', { type: 'button', class: 'sv-mini', text: X.imp }); gim.onclick = function () { importMon(); }; bar.appendChild(gim);
    var rm = el('button', { class: 'sv-del', text: L.remove }); rm.onclick = remove; bar.appendChild(rm);
    box.appendChild(bar);
    return box;
  }

  // Artwechsel (Gen 3+): Spitzname, Form, Geschlecht und Fähigkeit an die neue Art anpassen
  function changeSpecies(d, v, party) {
    var sv = st.sv, F = sv.fmt, gen = sv.gen, oldNat = sv.natOf(F.get(d, 'species'));
    F.set(d, 'species', sv.speciesFromNat(v));
    if (gen >= 4 && !F.get(d, 'nicknamed') && !F.get(d, 'egg')) F.set(d, 'nick', gen === 4 ? speciesName(v).toUpperCase() : speciesName(v));
    if (gen === 3 && F.get(d, 'nick') === speciesName(oldNat).toUpperCase()) F.set(d, 'nick', speciesName(v).toUpperCase());
    if (gen >= 4) {
      // Form auf 0, wenn die neue Art diese Form nicht hat (Formnamen-Liste oder Formen in den Personal-Daten)
      var fl = formNames(v, gen), ft = P['f' + gen] && P['f' + gen][v], nForms = Math.max(fl ? fl.length : 1, ft ? ft.length + 1 : 1);
      if ((F.get(d, 'form') || 0) >= nForms) F.set(d, 'form', 0);
      // Geschlecht: geschlechtslos / nur männlich / nur weiblich erzwingen, sonst aus der PID (Gen 4/5) bzw. bisheriges Geschlecht (Gen 6+)
      var ratio = persD(d)[7], pid = F.get(d, 'pid'), cur = F.get(d, 'gender');
      F.set(d, 'gender', ratio === 255 ? 2 : ratio === 254 ? 1 : ratio === 0 ? 0 : (gen <= 5 || cur === 2) ? ((pid & 0xFF) < ratio ? 1 : 0) : cur);
      var g2 = persD(d);
      if (gen === 4) F.set(d, 'ability', g2[8 + (pid & 1)] || g2[8] || 0);
      else if (gen === 5) F.set(d, 'ability', (F.get(d, 'hiddenAbility') ? g2[10] : g2[8 + ((pid >>> 16) & 1)]) || g2[8] || 0); // Gen 5: Slot = PID-Bit 16
      else { var an = F.get(d, 'abilityNum'), idx = an === 4 ? 10 : an === 2 ? 9 : 8; F.set(d, 'ability', g2[idx] || g2[8] || 0); if (an !== 1 && an !== 2 && an !== 4) F.set(d, 'abilityNum', 1); }
    }
    if (party) refreshParty(d);
  }
  function setForm(d, v, party) {
    var sv = st.sv, F = sv.fmt, gen = sv.gen;
    F.set(d, 'form', v);
    if (gen >= 4) {
      var g2 = persD(d), pid = F.get(d, 'pid');
      if (gen === 4) F.set(d, 'ability', g2[8 + (pid & 1)] || g2[8] || 0);
      else if (gen === 5) F.set(d, 'ability', (F.get(d, 'hiddenAbility') ? g2[10] : g2[8 + ((pid >>> 16) & 1)]) || g2[8] || 0);
      else { var an = F.get(d, 'abilityNum'), idx = an === 4 ? 10 : an === 2 ? 9 : 8; F.set(d, 'ability', g2[idx] || g2[8] || 0); }
    }
    if (party) refreshParty(d);
  }
  // Ei-Status setzen; Gen 3: beim Entfernen Spitzname und Sprache wiederherstellen (das Format setzt "タマゴ" und Japanisch)
  function setEgg(d, on) {
    var sv = st.sv, F = sv.fmt;
    F.set(d, 'egg', on ? 1 : 0);
    if (!on && sv.gen === 3 && d[8] === 0x60 && d[9] === 0x6F && d[10] === 0x8B) {
      F.set(d, 'lang', de ? 5 : 2); F.set(d, 'nick', speciesName(sv.natOf(F.get(d, 'species'))).toUpperCase());
    }
  }
  function monEditor() {
    var sv = st.sv, F = sv.fmt, d = st.mon, box = el('div', { class: 'sv-ed' }), party = st.sel.kind === 'party';
    box.appendChild(el('h3', { text: L.edit }));
    if (d && sv.gb) return gbEditor(box, d, party);
    if (!d) {
      var c = el('button', { class: 'primary-btn', text: L.create }); c.onclick = function () { st.mon = sv.gb ? gbBlank(party) : blank(sv.speciesFromNat(1), party); render(); };
      box.appendChild(c); return box;
    }
    function changed() { render(); }
    var PN = { rib: null, hex: el('div', { class: 'sv-pane' }), main: el('div', { class: 'sv-pane' }), stats: el('div', { class: 'sv-pane' }), moves: el('div', { class: 'sv-pane' }), ot: el('div', { class: 'sv-pane' }) };
    var sp = F.get(d, 'species'), nat = sv.natOf(sp), g = persD(d);
    // Art
    var natOpts = ''; for (var n = 1; n <= sv.maxSpecies; n++) natOpts += '<option value="' + n + '"' + (n === nat ? ' selected' : '') + '>#' + n + ' ' + esc(speciesName(n)) + '</option>';
    var selSp = select2(natOpts, function (v) { changeSpecies(d, v, party); changed(); });
    PN.main.appendChild(field(L.species, selSp));
    var nk = el('input', { type: 'text', class: 'sv-txt', maxlength: sv.gen >= 6 ? 12 : 10 }); nk.value = F.get(d, 'nick');
    nk.onchange = function () { F.set(d, 'nick', nk.value); if (sv.gen >= 4) F.set(d, 'nicknamed', 1); };
    PN.main.appendChild(field(L.nick, nk));
    var lvl = S.levelFor(g[6], F.get(d, 'exp'));
    var row = el('div', { class: 'sv-row' });
    row.appendChild(field(L.level, num(lvl, 1, 100, function (v) { F.set(d, 'exp', S.expFor(g[6], v)); if (party) refreshParty(d); changed(); }), 'sm'));
    row.appendChild(field(L.exp, num(F.get(d, 'exp'), 0, 2000000, function (v) { F.set(d, 'exp', v); if (party) refreshParty(d); changed(); }), 'sm'));
    row.appendChild(field(L.friendship, num(F.get(d, 'friendship'), 0, 255, function (v) { F.set(d, 'friendship', v); }), 'sm'));
    PN.main.appendChild(row);
    PN.main.appendChild(field(L.item, select2(opts(itemList(), maxItem(), F.get(d, 'item'), L.none), function (v) { F.set(d, 'item', v); })));
    // Wesen, Shiny, Ei
    var natureOpts = ''; for (var k = 0; k < 25; k++) natureOpts += '<option value="' + k + '"' + (k === F.nature(d) ? ' selected' : '') + '>' + esc(T.natures[k]) + '</option>';
    var row2 = el('div', { class: 'sv-row' });
    row2.appendChild(field(L.nature, select2(natureOpts, function (v) { if (F.natureIsPid) F.set(d, 'pid', newPid(d, v, isShiny(d))); else F.set(d, 'nature', v); if (party) refreshParty(d); changed(); })));
    var sh = el('input', { type: 'checkbox' }); sh.checked = isShiny(d);
    sh.onchange = function () { F.set(d, 'pid', newPid(d, F.nature(d), sh.checked)); changed(); };
    var shl = el('label', { class: 'sv-check' }); shl.appendChild(sh); shl.appendChild(el('span', { text: L.shiny })); row2.appendChild(shl);
    var fn = sv.gen >= 4 ? formNames(sv.natOf(F.get(d, 'species')), sv.gen) : null;
    if (fn) {
      var fcur = F.get(d, 'form') || 0, fo = fn.map(function (n, i) { return '<option value="' + i + '"' + (i === fcur ? ' selected' : '') + '>' + esc(n || 'Normal') + '</option>'; }).join('');
      if (fcur >= fn.length) fo += '<option value="' + fcur + '" selected>' + fcur + '</option>';
      row2.appendChild(field(L.formName, select2(fo, function (v) { setForm(d, v, party); changed(); })));
    }
    var ratio0 = pers(F.get(d, 'species'))[7];
    if (ratio0 !== 255) {
      var curG = sv.gen >= 4 && F.get(d, 'gender') !== undefined ? F.get(d, 'gender') : (ratio0 === 254 ? 1 : ratio0 === 0 ? 0 : ((F.get(d, 'pid') & 0xFF) < ratio0 ? 1 : 0));
      var gsel = (ratio0 === 0 || ratio0 === 254) ? null : select2('<option value="0"' + (curG === 0 ? ' selected' : '') + '>♂</option><option value="1"' + (curG === 1 ? ' selected' : '') + '>♀</option>', function (v) {
        if (sv.gen <= 5) F.set(d, 'pid', newPid(d, F.nature(d), isShiny(d), v));
        if (sv.gen >= 4) F.set(d, 'gender', v);
        if (party) refreshParty(d); changed();
      });
      if (gsel) row2.appendChild(field(L.gender, gsel));
    }
    var eg = el('input', { type: 'checkbox' }); eg.checked = !!F.get(d, 'egg'); eg.onchange = function () { setEgg(d, eg.checked); changed(); };
    var egl = el('label', { class: 'sv-check' }); egl.appendChild(eg); egl.appendChild(el('span', { text: L.egg })); row2.appendChild(egl);
    PN.main.appendChild(row2);
    // Fähigkeit
    if (sv.gen === 3) {
      var a1 = nm(T.abilities, g[8]), a2 = nm(T.abilities, g[9]), slot = F.get(d, 'abilitySlot');
      var ab = select2('<option value="0"' + (!slot ? ' selected' : '') + '>' + esc(a1) + '</option>' + (g[9] && g[9] !== g[8] ? '<option value="1"' + (slot ? ' selected' : '') + '>' + esc(a2) + '</option>' : ''), function (v) { F.set(d, 'abilitySlot', v); });
      PN.main.appendChild(field(L.ability, ab));
    } else {
      var cur = F.get(d, 'ability'), a3 = g[10] || 0, sl = [];
      [[g[8], 1, 0], [g[9], 2, 0], [a3, 4, 1]].forEach(function (x) { if (x[0] && !sl.some(function (y) { return y[0] === x[0] && y[2] === x[2]; }) && (x[1] !== 4 || sv.gen >= 5) && (x[1] !== 2 || sv.gen >= 4)) sl.push(x); });
      var hidNow = sv.gen === 5 ? F.get(d, 'hiddenAbility') : (sv.gen >= 6 && F.get(d, 'abilityNum') === 4 ? 1 : 0);
      var setAb = function (v, num, hid) {
        F.set(d, 'ability', v);
        if (sv.gen === 5) {
          F.set(d, 'hiddenAbility', hid ? 1 : 0);
          if (!hid && (num === 1 || num === 2) && g[8] && g[9] && g[8] !== g[9]) {
            var pid5 = F.get(d, 'pid'), wantBit = num === 2 ? 1 : 0;
            if (((pid5 >>> 16) & 1) !== wantBit) {
              var wasSh = isShiny(d);
              F.set(d, 'pid', (pid5 ^ 0x10000) >>> 0);
              if (isShiny(d) !== wasSh) F.set(d, 'pid', newPid(d, F.nature(d), wasSh));
            }
          }
        }
        else if (sv.gen >= 6) F.set(d, 'abilityNum', num);
      };
      var cheat = el('input', { type: 'checkbox' }), abBox = el('span'), build = function () {
        abBox.innerHTML = '';
        if (!cheat.checked && sl.length) {
          var idx = -1; sl.forEach(function (x, i) { if (x[0] === cur && x[2] === hidNow) idx = i; });
          var o2 = (idx < 0 ? '<option value="-1" selected>' + esc(nm(T.abilities, cur)) + ' (?)</option>' : '') + sl.map(function (x, i) { return '<option value="' + i + '"' + (i === idx ? ' selected' : '') + '>' + esc(nm(T.abilities, x[0])) + (x[2] ? ' (' + L.hiddenAb + ')' : '') + '</option>'; }).join('');
          abBox.appendChild(select2(o2, function (v) { if (v < 0) return; var x = sl[v]; cur = x[0]; hidNow = x[2]; setAb(x[0], x[1], x[2]); changed(); }));
        } else {
          abBox.appendChild(select2(opts(T.abilities, maxAbility(), cur), function (v) { cur = v; var k2 = sl.filter(function (x) { return x[0] === v; })[0]; setAb(v, k2 ? k2[1] : 1, k2 ? k2[2] : 0); hidNow = k2 ? k2[2] : 0; }));
        }
      };
      cheat.onchange = build; build();
      var cl = el('label', { class: 'sv-check' }); cl.appendChild(cheat); cl.appendChild(el('span', { text: L.allAb }));
      var fw = field(L.ability, abBox); PN.main.appendChild(fw); PN.main.appendChild(cl);
    }
    // Attacken
    var mt = el('div', { class: 'sv-moves' });
    for (var m = 0; m < 4; m++) (function (m) {
      var r = el('div', { class: 'sv-mrow' });
      r.appendChild(select2(opts(T.moves, maxMove(), F.get(d, 'move', m), L.none), function (v) { F.set(d, 'move', v, m); F.set(d, 'pp', v ? ppMax(v, ppUps(d, m)) : 0, m); changed(); }));
      r.appendChild(num(F.get(d, 'pp', m), 0, ppMax(F.get(d, 'move', m), ppUps(d, m)), function (v) { F.set(d, 'pp', v, m); }));
      r.appendChild(num(ppUps(d, m), 0, 3, function (v) {
        if (sv.gen === 3) F.set(d, 'ppups', (F.get(d, 'ppups') & ~(3 << (m * 2))) | (v << (m * 2))); else F.set(d, 'ppups', v, m);
        F.set(d, 'pp', Math.min(F.get(d, 'pp', m), ppMax(F.get(d, 'move', m), v)), m); changed();
      }));
      mt.appendChild(r);
    })(m);
    var mh = el('div', { class: 'sv-mrow sv-mhead' }); mh.appendChild(el('span', { text: L.moves })); mh.appendChild(el('span', { text: L.pp })); mh.appendChild(el('span', { text: L.ppups }));
    PN.moves.appendChild(mh); PN.moves.appendChild(mt);
    // EP / IP / Werte
    var r = recalc(d), stt = party ? F.stats(d) : r.stats, evsum = 0;
    var tbl = el('table', { class: 'sv-stats' });
    var head = '<tr><th></th>' + L.stat.map(function (s) { return '<th>' + esc(s) + '</th>'; }).join('') + '</tr>';
    tbl.innerHTML = head;
    var rEv = el('tr'), rIv = el('tr'), rSt = el('tr'); rEv.appendChild(el('th', { text: L.ev })); rIv.appendChild(el('th', { text: L.iv })); rSt.appendChild(el('th', { text: L.stats }));
    for (var s = 0; s < 6; s++) (function (s) {
      evsum += F.get(d, 'ev', s);
      var e = el('td'); e.appendChild(num(F.get(d, 'ev', s), 0, evMax(), function (v) { F.set(d, 'ev', clampEv(d, s, v), s); if (party) refreshParty(d); changed(); })); rEv.appendChild(e);
      var iv = el('td'); iv.appendChild(num(F.get(d, 'iv', s), 0, 31, function (v) { F.set(d, 'iv', v, s); if (party) refreshParty(d); changed(); })); rIv.appendChild(iv);
      rSt.appendChild(el('td', { text: String(stt[s]) }));
    })(s);
    tbl.appendChild(rEv); tbl.appendChild(rIv); tbl.appendChild(rSt); PN.stats.appendChild(tbl);
    PN.stats.appendChild(el('div', { class: 'hint', text: L.evsum + ': ' + evsum + ' / 510' }));
    // Ursprungstrainer
    var ot = el('input', { type: 'text', class: 'sv-txt' }); ot.value = F.get(d, 'ot'); ot.onchange = function () { F.set(d, 'ot', ot.value); };
    var row3 = el('div', { class: 'sv-row' });
    row3.appendChild(field(L.ot, ot));
    row3.appendChild(field('TID', num(F.get(d, 'tid'), 0, 65535, function (v) { F.set(d, 'tid', v); changed(); }), 'sm'));
    row3.appendChild(field('SID', num(F.get(d, 'sid'), 0, 65535, function (v) { F.set(d, 'sid', v); changed(); }), 'sm'));
    PN.ot.appendChild(row3);
    var row4 = el('div', { class: 'sv-row' });
    var ballMax = sv.gen === 3 ? 12 : sv.gen === 4 ? 24 : sv.gen <= 6 ? 25 : 26;
    if (F.get(d, 'ball') !== undefined && F.get(d, 'ball') !== null) row4.appendChild(field(X.ball, num(F.get(d, 'ball'), 0, ballMax, function (v) { F.set(d, 'ball', v); }), 'sm'));
    var ml = F.get(d, 'metLevel'); if (ml !== undefined && ml !== null) row4.appendChild(field(X.metLv, num(ml, 0, 127, function (v) { F.set(d, 'metLevel', v); }), 'sm'));
    PN.ot.appendChild(row4);
    if (F.extras) {
      var row5 = el('div', { class: 'sv-row' });
      row5.appendChild(field(X.pokerus, num(F.get(d, 'pokerus'), 0, 255, function (v) { F.set(d, 'pokerus', v); }), 'sm'));
      row5.appendChild(field(X.metLoc, locField(F, d, 'metLoc'), 'sm'));
      if (sv.gen >= 4) row5.appendChild(field(X.eggLoc, locField(F, d, 'eggLoc'), 'sm'));
      row5.appendChild(field(X.lang, num(F.get(d, 'lang'), 0, 255, function (v) { F.set(d, 'lang', v); }), 'sm'));
      PN.ot.appendChild(row5);
      if (sv.gen >= 4) {
        var drow = el('div', { class: 'sv-row' });
        function dateField(label, kp) {
          var y = F.get(d, kp + 'Year'), m = F.get(d, kp + 'Month'), dd = F.get(d, kp + 'Day');
          var inp = el('input', { type: 'date', class: 'sv-txt' });
          inp.value = (y || m || dd) ? (2000 + y) + '-' + ('0' + m).slice(-2) + '-' + ('0' + dd).slice(-2) : '';
          inp.onchange = function () {
            var v = inp.value.split('-');
            if (v.length === 3) { F.set(d, kp + 'Year', Math.max(0, Math.min(99, +v[0] - 2000))); F.set(d, kp + 'Month', +v[1]); F.set(d, kp + 'Day', +v[2]); }
            else { F.set(d, kp + 'Year', 0); F.set(d, kp + 'Month', 0); F.set(d, kp + 'Day', 0); }
          };
          return field(label, inp);
        }
        drow.appendChild(dateField(X.metDate, 'met')); drow.appendChild(dateField(X.eggDate, 'egg'));
        PN.ot.appendChild(drow);
      }
      var grow = el('div', { class: 'sv-row' });
      grow.appendChild(field(X.otGender, select2('<option value="0"' + (!F.get(d, 'otGender') ? ' selected' : '') + '>' + esc(L.male) + '</option><option value="1"' + (F.get(d, 'otGender') ? ' selected' : '') + '>' + esc(L.female) + '</option>', function (v) { F.set(d, 'otGender', v); }), 'sm'));
      if (sv.gen >= 4) grow.appendChild(field(X.form, num(F.get(d, 'form'), 0, 31, function (v) { setForm(d, v, party); changed(); }), 'sm'));
      PN.ot.appendChild(grow);
      PN.ot.appendChild(el('h4', { class: 'sv-h4', text: X.contestT }));
      var row6 = el('div', { class: 'sv-row' });
      for (var cq = 0; cq < 6; cq++) (function (cq) { row6.appendChild(field(X.contest[cq], num(F.get(d, 'contest', cq), 0, 255, function (v) { F.set(d, 'contest', v, cq); }), 'sm')); })(cq);
      PN.ot.appendChild(row6);
    }
    // Bänder (Gen 3-7, Bit-Lage aus PKHeX)
    (function () {
      var rl = window.PKHEX && window.PKHEX.ribbons && window.PKHEX.ribbons['gen' + sv.gen];
      PN.rib = el('div', { class: 'sv-pane' });
      var names = (window.PKHEX && window.PKHEX.ribbons && window.PKHEX.ribbons.names[de ? 'de' : 'en']) || {};
      if (!rl || !rl.length) { PN.rib.appendChild(el('div', { class: 'hint', text: X.ribNone })); return; }
      var bar2 = el('div', { class: 'sv-row sv-quick' });
      [[X.ribAll, 1], [X.ribClear, 0]].forEach(function (c) { var bt = el('button', { type: 'button', class: 'sv-mini', text: c[0] }); bt.onclick = function () { rl.forEach(function (r) { d[r[1]] = c[1] ? (d[r[1]] | (1 << r[2])) : (d[r[1]] & ~(1 << r[2])); }); changed(); }; bar2.appendChild(bt); });
      PN.rib.appendChild(bar2);
      var grid = el('div', { class: 'sv-ribs' });
      rl.forEach(function (r) {
        var cb = el('input', { type: 'checkbox' }); cb.checked = !!(d[r[1]] & (1 << r[2]));
        cb.onchange = function () { d[r[1]] = cb.checked ? (d[r[1]] | (1 << r[2])) : (d[r[1]] & ~(1 << r[2])); };
        var lb = el('label', { class: 'sv-check' }); lb.appendChild(cb); lb.appendChild(el('span', { text: names[r[0]] || r[0].replace(/^Ribbon/, '') })); grid.appendChild(lb);
      });
      PN.rib.appendChild(grid);
    })();
    // Hex-Ansicht
    (function () {
      var lines = [];
      for (var o = 0; o < d.length; o += 16) {
        var hx = '', ac = '';
        for (var q = 0; q < 16 && o + q < d.length; q++) { var bv = d[o + q]; hx += (bv < 16 ? '0' : '') + bv.toString(16).toUpperCase() + ' '; ac += bv >= 32 && bv < 127 ? String.fromCharCode(bv) : '.'; }
        lines.push(('000' + o.toString(16).toUpperCase()).slice(-4) + '  ' + (hx + '                                                ').slice(0, 48) + ' ' + ac);
      }
      PN.hex.appendChild(el('div', { class: 'hint', text: X.hexNote }));
      var pre = el('pre', { class: 'sv-hex', text: lines.join('\n') }); PN.hex.appendChild(pre);
      var hb = el('button', { type: 'button', class: 'sv-mini', text: X.hexCopy }); hb.onclick = function () { try { navigator.clipboard.writeText(lines.join('\n')); } catch (e) { /* kein Zugriff auf die Zwischenablage */ } }; PN.hex.appendChild(hb);
    })();
    var qb = el('div', { class: 'sv-row sv-quick' });
    [[X.maxIv, function () { for (var q = 0; q < 6; q++) F.set(d, 'iv', 31, q); }], [X.zeroEv, function () { for (var q = 0; q < 6; q++) F.set(d, 'ev', 0, q); }], [X.maxEv, function () { var v = [252, 252, 6, 0, 0, 0]; for (var q = 0; q < 6; q++) F.set(d, 'ev', v[q], q); }]].forEach(function (c) {
      var bt = el('button', { type: 'button', class: 'sv-mini', text: c[0] }); bt.onclick = function () { c[1](); if (party) refreshParty(d); changed(); }; qb.appendChild(bt);
    });
    PN.stats.appendChild(qb);
    var tabs = el('div', { class: 'sv-tabs' });
    [['main', X.tMain], ['stats', X.tStats], ['moves', X.tMoves], ['ot', X.tOt]].concat(sv.gen >= 3 && !sv.gb ? [['rib', X.tRib]] : [], [['hex', X.tHex]]).forEach(function (t) {
      var tb = el('button', { type: 'button', class: 'sv-tab' + (st.tab === t[0] ? ' on' : ''), text: t[1] }); tb.onclick = function () { st.tab = t[0]; render(); }; tabs.appendChild(tb);
    });
    var hd = el('div', { class: 'sv-prev' });
    var pimg = window.NATDEX && window.NATDEX[nat] ? A.spriteById(window.NATDEX[nat][0], '', isShiny(d), speciesName(nat)) : el('span');
    if (pimg.classList) pimg.classList.add('sv-prev-img'); hd.appendChild(pimg);
    var pinfo = el('div', { class: 'sv-prev-i' }); pinfo.appendChild(el('b', { text: '#' + nat + ' ' + speciesName(nat) + (isShiny(d) ? ' ★' : '') })); pinfo.appendChild(el('span', { text: 'Lv ' + lvl + (F.get(d, 'egg') ? ' · ' + L.egg : '') })); hd.appendChild(pinfo);
    var issues = checkMon(d), nBad = issues.filter(function (x) { return x.sev === 'bad'; }).length;
    var cb = el('div', { class: 'sv-chk' + (nBad ? ' illegal' : issues.length ? ' bad' : '') });
    cb.appendChild(el('b', { text: X.chk + ': ' }));
    cb.appendChild(el('span', { text: !issues.length ? X.legal : nBad ? X.illegal + ' (' + nBad + ')' : X.suspicious + ' (' + issues.length + ')' }));
    if (issues.length) { var ul = el('ul', { class: 'sv-chk-list' }); issues.forEach(function (x) { ul.appendChild(el('li', { class: x.sev, text: x.msg })); }); cb.appendChild(ul); }
    box.appendChild(hd); box.appendChild(cb); box.appendChild(tabs); box.appendChild(PN[st.tab] || PN.main);
    var bar = el('div', { class: 'sv-bar' });
    var ap = el('button', { class: 'primary-btn', text: X.set }); ap.onclick = apply; bar.appendChild(ap);
    var mv = el('button', { type: 'button', class: 'sv-mini sv-move-btn' + (st.moveFrom && st.moveFrom !== 'pick' && sameLoc(st.moveFrom, st.sel) ? ' on' : ''), text: X.moveBtn }); mv.onclick = function () { toggleMove(st.sel); }; bar.appendChild(mv);
    var rm = el('button', { class: 'sv-del', text: X.del }); rm.onclick = remove; bar.appendChild(rm);
    var ex = el('button', { type: 'button', class: 'sv-mini', text: X.exp2 }); ex.onclick = exportMon; bar.appendChild(ex);
    var im = el('button', { type: 'button', class: 'sv-mini', text: X.imp }); im.onclick = function () { importMon(); }; bar.appendChild(im);
    if (!sv.gb) { var sdb = el('button', { type: 'button', class: 'sv-mini', text: X.sdBtn }); sdb.onclick = showdownDialog; bar.appendChild(sdb); }
    var lg = el('button', { type: 'button', class: 'sv-mini', text: X.legalize }); lg.onclick = function () { legalize(d, party); changed(); }; bar.appendChild(lg);
    box.appendChild(bar);
    return box;
  }
  function apply() {
    var sv = st.sv, s = st.sel;
    if (s.kind === 'party') {
      var list = sv.getParty(), target = s.slot < list.length ? s.slot : list.length;
      list[target] = st.mon; sv.setParty(list); s.slot = target;
    } else {
      if (sv.gb && st.mon) {
        var cnt = 0; for (var i = 0; i < sv.slotsPerBox; i++) if (sv.getBoxMon(s.box, i)) cnt++;
        sv.setBoxMon(s.box, s.slot, st.mon);
        if (s.slot >= cnt) s.slot = cnt;
      } else sv.setBoxMon(s.box, s.slot, st.mon);
    }
    st.dirty = true; st.msg = L.ok; render();
  }
  function remove() {
    var sv = st.sv, s = st.sel;
    if (s.kind === 'party' && sv.getParty().length <= 1) return;
    if (!window.confirm(L.delconfirm)) return;
    if (s.kind === 'party') { var list = sv.getParty(); list.splice(s.slot, 1); sv.setParty(list); }
    else sv.setBoxMon(s.box, s.slot, null);
    st.mon = null; st.sel = null; st.moveFrom = null; st.dirty = true; render();
  }

  // ---------- Slots: lesen, schreiben, ziehen ----------
  function getAt(loc) { return loc.kind === 'party' ? (st.sv.getParty()[loc.slot] || null) : st.sv.getBoxMon(loc.box, loc.slot); }
  // Box-Daten sind kürzer als Team-Daten (Gen 3: 80/100, Gen 4: 136/236, Gen 5: 136/220, Gen 6/7: 232/260, Gen 2: 32/48 Byte):
  // ins Team auf volle Länge erweitern und Level/Werte/KP neu berechnen, in die Box auf Box-Länge kürzen
  function toParty(d) {
    var sv = st.sv, F = sv.fmt, c = new Uint8Array(F.partySize);
    c.set(d.subarray(0, Math.min(d.length, F.partySize)));
    if (sv.gb) gbRefresh(c, true); else refreshParty(c);
    return c;
  }
  function toBox(d) {
    var sv = st.sv, F = sv.fmt;
    if (sv.gb) { var g = new Uint8Array(d); g.fill(0, sv.gen === 1 ? 34 : F.STORED, F.PARTY); return g; } // Gen 1: Byte 33 (Team-Level) bleibt als Kopie von Byte 3
    return new Uint8Array(d.subarray(0, F.size));
  }
  function putAt(loc, d) {
    var sv = st.sv;
    if (loc.kind === 'party') {
      var list = sv.getParty();
      if (d) { var c = toParty(d); if (loc.slot >= list.length) list.push(c); else list[loc.slot] = c; }
      else if (loc.slot < list.length) list.splice(loc.slot, 1);
      sv.setParty(list);
    } else sv.setBoxMon(loc.box, loc.slot, d ? toBox(d) : null);
  }
  function sameLoc(a, b) { return a && b && a.kind === b.kind && a.slot === b.slot && (a.kind === 'party' || a.box === b.box); }
  function moveOrSwap(src, loc, copy) {
    if (!src || !loc || sameLoc(src, loc)) return false;
    var a = getAt(src), b = getAt(loc);
    if (!a) return false;
    if (copy) putAt(loc, a);
    else if (src.kind === 'party' && !b && st.sv.getParty().length <= 1) return false;
    else { putAt(loc, a); putAt(src, b); }
    st.dirty = true; st.sel = loc; var m = getAt(loc); st.mon = m ? new Uint8Array(m) : null;
    return true;
  }
  function toggleMove(fromLoc) {
    if (st.moveFrom) { st.moveFrom = null; render(); return; }
    var src = fromLoc && getAt(fromLoc) ? fromLoc : (st.sel && getAt(st.sel) ? st.sel : null);
    st.moveFrom = src ? { kind: src.kind, box: src.box, slot: src.slot } : 'pick';
    render();
  }
  function handleSlotClick(loc) {
    if (!st.moveFrom) { select(loc.kind, loc.box, loc.slot); return; }
    if (st.moveFrom === 'pick') {
      var d = getAt(loc);
      if (d) { st.moveFrom = { kind: loc.kind, box: loc.box, slot: loc.slot }; st.sel = loc; st.mon = new Uint8Array(d); st.msg = ''; render(); }
      else select(loc.kind, loc.box, loc.slot);
      return;
    }
    if (sameLoc(st.moveFrom, loc)) { st.moveFrom = null; render(); return; }
    if (moveOrSwap(st.moveFrom, loc, false)) st.msg = X.moveDone;
    st.moveFrom = null;
    render();
  }
  function dnd(btn, loc) {
    if (st.moveFrom) {
      if (st.moveFrom !== 'pick' && sameLoc(st.moveFrom, loc)) btn.classList.add('sv-move-src');
      else if (st.moveFrom !== 'pick' || getAt(loc)) btn.classList.add('sv-move-target');
    }
    btn.draggable = true;
    Array.prototype.forEach.call(btn.querySelectorAll('img'), function (im) { im.draggable = false; });
    btn.ondragstart = function (e) { if (!getAt(loc)) { e.preventDefault(); return; } st.drag = loc; btn.classList.add('dragging'); try { e.dataTransfer.setData('text/plain', 'slot'); e.dataTransfer.effectAllowed = 'copyMove'; } catch (x) { /* ignore */ } };
    btn.ondragend = function () { st.drag = null; btn.classList.remove('dragging'); };
    btn.ondragover = function (e) { if (st.drag) { e.preventDefault(); try { e.dataTransfer.dropEffect = e.ctrlKey ? 'copy' : 'move'; } catch (x) { /* ignore */ } btn.classList.add('drop'); } };
    btn.ondragleave = function () { btn.classList.remove('drop'); };
    btn.ondrop = function (e) {
      btn.classList.remove('drop');
      if (!st.drag) return;
      e.preventDefault(); e.stopPropagation();
      var src = st.drag; st.drag = null;
      if (moveOrSwap(src, loc, e.ctrlKey)) { st.moveFrom = null; render(); }
    };
  }

  // ---- Showdown-Text (Einzel-Pokémon, Gen 3-7)
  var SDN = ['HP', 'Atk', 'Def', 'SpA', 'SpD', 'Spe'], SDK = { hp: 0, atk: 1, def: 2, spa: 4, spd: 5, spe: 3 };
  // Showdown-Reihenfolge (HP, Atk, Def, SpA, SpD, Spe) -> interne Stat-Indizes (KP, Angr, Vert, Init, SpAngr, SpVert)
  var SDORD = [0, 1, 2, 4, 5, 3];
  function enT() { return (T0 && T0.en) || T; }
  function sdNorm(x) { return String(x || '').toLowerCase().replace(/[^a-z0-9]/g, ''); }
  function sdFind(list, name) { var n = sdNorm(name); if (!n || !list) return 0; for (var i = 1; i < list.length; i++) if (sdNorm(list[i]) === n) return i; return 0; }
  function sdExport(d) {
    var sv = st.sv, F = sv.fmt, E = enT(), eItems = E[sv.items] || E.items, sp = F.get(d, 'species'), nat = sv.natOf(sp), lines = [], itm = F.get(d, 'item');
    var lv = S.levelFor(pers(sp)[6], F.get(d, 'exp'));
    lines.push(nm(E.species, nat) + (itm ? ' @ ' + nm(eItems, itm) : ''));
    var ab = F.get(d, 'ability'); if (sv.gen === 3) ab = persD(d)[8 + (F.get(d, 'abilitySlot') ? 1 : 0)] || persD(d)[8];
    if (ab) lines.push('Ability: ' + nm(E.abilities, ab));
    lines.push('Level: ' + lv);
    if (isShiny(d)) lines.push('Shiny: Yes');
    var ev = [], iv = [];
    SDORD.forEach(function (k, i) { var e = F.get(d, 'ev', k), v = F.get(d, 'iv', k); if (e) ev.push(e + ' ' + SDN[i]); if (v !== 31) iv.push(v + ' ' + SDN[i]); });
    if (ev.length) lines.push('EVs: ' + ev.join(' / '));
    lines.push(nm(E.natures, F.nature(d)) + ' Nature');
    if (iv.length) lines.push('IVs: ' + iv.join(' / '));
    for (var m = 0; m < 4; m++) { var mv = F.get(d, 'move', m); if (mv) lines.push('- ' + nm(E.moves, mv)); }
    return lines.join('\n');
  }
  function sdImport(text, party) {
    var sv = st.sv, F = sv.fmt, E = enT(), eItems = E[sv.items] || E.items, ls = text.replace(/\r/g, '').split('\n').map(function (x) { return x.trim(); }).filter(Boolean);
    if (!ls.length) return null;
    var head = ls[0].split('@'), nameRaw = head[0].replace(/\((M|F)\)\s*$/, '').trim(), pm = nameRaw.match(/\(([^)]+)\)\s*$/);
    if (pm && sdFind(E.species, pm[1])) nameRaw = pm[1];
    nameRaw = nameRaw.replace(/-(Mega|Alola|Galar|Hisui)(-[XY])?$/i, '');
    var nat = sdFind(E.species, nameRaw);
    if (!nat || nat > sv.maxSpecies) return null;
    var sp = sv.speciesFromNat(nat);
    if (!sp) return null;
    var d = blank(sp, party), lv = 50, nature = -1, shiny = false, mvi = 0, i;
    for (i = 0; i < 6; i++) F.set(d, 'iv', 31, i);
    if (head[1]) { var it = sdFind(eItems, head[1]); if (it && it <= sv.maxItem) F.set(d, 'item', it); }
    for (var k = 0; k < 4; k++) { F.set(d, 'move', 0, k); F.set(d, 'pp', 0, k); }
    ls.slice(1).forEach(function (l) {
      var m;
      if ((m = l.match(/^Ability:\s*(.+)$/i))) {
        var a = sdFind(E.abilities, m[1]);
        if (a && a <= sv.maxAbility) {
          var gp = persD(d);
          if (sv.gen === 3) F.set(d, 'abilitySlot', gp[9] && gp[9] === a ? 1 : 0);
          else {
            F.set(d, 'ability', a);
            if (sv.gen === 5) {
              var isHid = !!(gp[10] && a === gp[10] && a !== gp[8] && a !== gp[9]);
              F.set(d, 'hiddenAbility', isHid ? 1 : 0);
              if (!isHid && gp[8] && gp[9] && gp[8] !== gp[9] && (a === gp[8] || a === gp[9])) {
                var wantBit = a === gp[9] ? 1 : 0, pid5 = F.get(d, 'pid');
                if (((pid5 >>> 16) & 1) !== wantBit) F.set(d, 'pid', (pid5 ^ 0x10000) >>> 0);
              }
            } else if (sv.gen >= 6) {
              F.set(d, 'abilityNum', gp[8] === a ? 1 : gp[9] === a ? 2 : gp[10] === a ? 4 : 1);
            }
          }
        }
      } else if ((m = l.match(/^Level:\s*(\d+)/i))) lv = Math.max(1, Math.min(100, +m[1]));
      else if (/^Shiny:\s*Yes/i.test(l)) shiny = true;
      else if ((m = l.match(/^(EVs|IVs):\s*(.+)$/i))) {
        var isEv = /^EV/i.test(m[1]);
        if (isEv) for (i = 0; i < 6; i++) F.set(d, 'ev', 0, i);
        m[2].split('/').forEach(function (part) {
          var q = part.trim().match(/^(\d+)\s*(\w+)$/), idx = q ? SDK[q[2].toLowerCase()] : undefined;
          if (idx !== undefined) F.set(d, isEv ? 'ev' : 'iv', isEv ? clampEv(d, idx, +q[1]) : Math.min(+q[1], 31), idx);
        });
      } else if ((m = l.match(/^(\w+)\s+Nature$/i))) { for (i = 0; i < 25; i++) if (sdNorm(E.natures[i]) === sdNorm(m[1])) nature = i; }
      else if (l.charAt(0) === '-' && mvi < 4) {
        var mo = sdFind(E.moves, l.replace(/^-\s*/, '').replace(/\s*\[.*$/, ''));
        if (mo && mo <= sv.maxMove) { F.set(d, 'move', mo, mvi); F.set(d, 'pp', ppMax(mo, 0), mvi); mvi++; }
      }
    });
    F.set(d, 'exp', S.expFor(pers(sp)[6], lv));
    var prev = st.mon; st.mon = d;
    if (nature >= 0 || shiny) {
      var nat2 = nature >= 0 ? nature : F.nature(d);
      if (F.natureIsPid) F.set(d, 'pid', newPid(d, nat2, shiny));
      else { F.set(d, 'nature', nat2); if (shiny) F.set(d, 'pid', newPid(d, nat2, true)); }
    }
    st.mon = prev;
    if (party) refreshParty(d);
    return d;
  }
  function showdownDialog() {
    if (!st.mon || document.getElementById('svSdDlg')) return;
    var wrap = el('div', { class: 'modal cc-dlg-wrap', id: 'svSdDlg' }), box2 = el('div', { class: 'modal-box cc-dlg' });
    var ta = el('textarea', { style: 'width:100%;min-height:220px;font-family:monospace;box-sizing:border-box' }); ta.value = sdExport(st.mon);
    var msg = el('div', { class: 'hint', text: '' }), row3 = el('div', { class: 'sv-bar' });
    var close = function () { wrap.remove(); };
    var cp = el('button', { type: 'button', class: 'sv-mini', text: X.sdCopy });
    cp.onclick = function () { ta.select(); if (navigator.clipboard) navigator.clipboard.writeText(ta.value).catch(function () { document.execCommand('copy'); }); else document.execCommand('copy'); };
    var ap2 = el('button', { type: 'button', class: 'primary-btn', text: X.sdApply });
    ap2.onclick = function () {
      var party = st.sel && st.sel.kind === 'party', d = sdImport(ta.value, party);
      if (!d) { msg.textContent = X.sdBad; return; }
      st.mon = d; if (!st.sel) st.sel = { kind: 'box', box: st.box, slot: 0 }; close(); render();
    };
    var cl = el('button', { type: 'button', class: 'sv-mini', text: X.sdClose }); cl.onclick = close;
    [cp, ap2, cl].forEach(function (b) { row3.appendChild(b); });
    box2.appendChild(el('h3', { text: X.sdBtn })); box2.appendChild(ta); box2.appendChild(msg); box2.appendChild(row3);
    wrap.appendChild(box2); wrap.onclick = function (e) { if (e.target === wrap) close(); };
    document.body.appendChild(wrap); ta.focus();
  }
  // Form-Namen nach Nationaldex-Nr. (Index = Form-Nr. im Spielstand), nur Arten mit dauerhaft speicherbaren Formen
  var AL = ['', 'Alola'], FORMS = {
    201: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ!?'.split(''), 386: ['Normal', 'Angriff', 'Verteidigung', 'Initiative'], 412: ['Pflanzenumhang', 'Sandumhang', 'Lumpenumhang'], 413: ['Pflanzenumhang', 'Sandumhang', 'Lumpenumhang'],
    421: ['Wolkenform', 'Sonnenform'], 422: ['Westliches Meer', 'Östliches Meer'], 423: ['Westliches Meer', 'Östliches Meer'], 479: ['Normal', 'Hitze', 'Wasch', 'Frost', 'Wirbel', 'Schneid'],
    487: ['Wandelform', 'Urform'], 492: ['Landform', 'Zenitform'], 493: ['Normal', 'Kampf', 'Flug', 'Gift', 'Boden', 'Gestein', 'Käfer', 'Geist', 'Stahl', '???', 'Feuer', 'Wasser', 'Pflanze', 'Elektro', 'Psycho', 'Eis', 'Drache', 'Unlicht'],
    550: ['Rotstreifen', 'Blaustreifen'], 555: ['Standard', 'Trance'], 585: ['Frühling', 'Sommer', 'Herbst', 'Winter'], 586: ['Frühling', 'Sommer', 'Herbst', 'Winter'],
    641: ['Inkarnation', 'Tiergeist'], 642: ['Inkarnation', 'Tiergeist'], 645: ['Inkarnation', 'Tiergeist'], 646: ['Normal', 'Weiß', 'Schwarz'], 647: ['Standard', 'Resolut'], 648: ['Gesangsform', 'Tanzform'],
    649: ['Normal', 'Aqua-Modul', 'Blitz-Modul', 'Flammen-Modul', 'Frost-Modul'],
    666: ['Eis', 'Polar', 'Tundra', 'Kontinental', 'Garten', 'Elegant', 'Wiese', 'Modern', 'Marine', 'Archipel', 'Hochland', 'Sand', 'Fluss', 'Monsun', 'Savanne', 'Sonne', 'Ozean', 'Dschungel', 'Fantasie', 'Pokéball'],
    669: ['Rot', 'Gelb', 'Orange', 'Blau', 'Weiß'], 670: ['Rot', 'Gelb', 'Orange', 'Blau', 'Weiß'], 671: ['Rot', 'Gelb', 'Orange', 'Blau', 'Weiß'],
    676: ['Natürlich', 'Herz', 'Stern', 'Diamant', 'Fräulein', 'Matrone', 'Dandy', 'Madame', 'Kabuki', 'Pharao'], 678: ['Männchen', 'Weibchen'], 681: ['Schild', 'Klinge'],
    710: ['Klein', 'Normal', 'Groß', 'Super'], 711: ['Klein', 'Normal', 'Groß', 'Super'], 720: ['Gebannt', 'Entfesselt'],
    741: ['Flamenco', 'Cheerleading', 'Hula', 'Buyo'], 745: ['Tag', 'Nacht', 'Dämmerung'], 746: ['Solo', 'Schwarm'], 778: ['Getarnt', 'Entdeckt'], 800: ['Normal', 'Abendmähne', 'Morgenschwingen', 'Ultra']
  };
  [19, 20, 26, 27, 28, 37, 38, 50, 51, 52, 53, 74, 75, 76, 88, 89, 103, 105].forEach(function (n) { FORMS[n] = ['Normal', 'Alola']; });
  function formNames(nat, gen) {
    var l = FORMS[nat]; if (!l) return null;
    var max = { 4: 493, 5: 649, 6: 721, 7: 807 }[gen] || 0;
    if (nat > max || (nat < 150 && gen < 7) || (nat >= 741 && gen < 7)) return null;
    if (nat === 493 && gen >= 5) {
      var a5 = l.filter(function (x) { return x !== '???'; });
      return gen >= 6 ? a5.concat(['Fee']) : a5;
    }
    return l;
  }
  // "Legal machen": behebt erkennbar Unzulässiges (nicht erlernbare/doppelte Attacken, PP, EP, IP, Fähigkeit). Fundort/Herkunft bleiben unverändert.
  function legalize(d, party) {
    var sv = st.sv, F = sv.fmt, gen = sv.gen, sp = F.get(d, 'species'), nat = sv.natOf(sp), q, i;
    var tab = window.PKLEARN && window.PKLEARN[nat], lim = (1 << gen) - 1, pp = window.PKHEX && window.PKHEX.pp && window.PKHEX.pp['gen' + gen];
    var formed = !sv.gb && (F.get(d, 'form') || 0) > 0, ok = function (mv) { if (!mv || mv > sv.maxMove) return false; if (!tab || formed || mv === 165) return true; for (var k = 0; k < tab.length; k += 2) if (tab[k] === mv) return !!(tab[k + 1] & lim); return false; };
    var keep = [];
    for (q = 0; q < 4; q++) { var mv = F.get(d, 'move', q); if (ok(mv) && keep.indexOf(mv) < 0) keep.push(mv); }
    if (!keep.length && tab) for (i = 0; i < tab.length && keep.length < 4; i += 2) if ((tab[i + 1] & lim) && tab[i] <= sv.maxMove && tab[i] !== 165) keep.push(tab[i]);
    for (q = 0; q < 4; q++) {
      var m2 = keep[q] || 0; F.set(d, 'move', m2, q); F.set(d, 'pp', m2 ? ((pp && pp[m2]) || 10) : 0, q);
      if (gen !== 3) F.set(d, 'ppups', 0, q);
    }
    if (gen === 3) F.set(d, 'ppups', 0);
    var sum = 0;
    if (!sv.gb) {
      for (i = 0; i < 6; i++) { var e = Math.min(252, F.get(d, 'ev', i)); F.set(d, 'ev', e, i); sum += e; }
      for (i = 5; i >= 0 && sum > 510; i--) { var cut = Math.min(F.get(d, 'ev', i), sum - 510); F.set(d, 'ev', F.get(d, 'ev', i) - cut, i); sum -= cut; }
      for (i = 0; i < 6; i++) if (F.get(d, 'iv', i) > 31) F.set(d, 'iv', 31, i);
      var g = persD(d), a1 = g[8] || 0, a2 = g[9] || 0, a3 = g[10] || 0;
      if (gen === 3) { if (F.get(d, 'abilitySlot') && (!a2 || a2 === a1)) F.set(d, 'abilitySlot', 0); }
      else {
        var ab = F.get(d, 'ability'), hid = gen === 5 ? F.get(d, 'hiddenAbility') : (gen >= 6 && F.get(d, 'abilityNum') === 4 ? 1 : 0), valid = hid ? (a3 && ab === a3) : (ab === a1 || ab === a2);
        if (!valid && a1) { F.set(d, 'ability', a1); if (gen === 5) F.set(d, 'hiddenAbility', 0); else if (gen >= 6) F.set(d, 'abilityNum', 1); }
      }
    }
    // Fundort/Fundlevel nach den Begegnungstabellen (nur wenn die Prüfung sonst "keine passende Begegnung" meldet)
    var sg = window.CCLegal && window.CCLegal.suggest ? window.CCLegal.suggest(sv, d, { P: P, S: S, de: de }) : null;
    if (sg) { F.set(d, 'metLoc', sg.loc); F.set(d, 'metLevel', sg.level); }
    if (party) { if (sv.gb) gbRefresh(d, true); else refreshParty(d); }
  }
  // .pk-Datei wie PKHeX: Gen 1/2 als Liste mit einem Platz (69 / 73 Byte), ab Gen 3 entschlüsselt mit gültiger Prüfsumme
  function monToFile(d) {
    var sv = st.sv, F = sv.fmt;
    if (sv.gb) return F.toFile(toParty(d));
    var c = new Uint8Array(d); if (F.refreshChecksum) F.refreshChecksum(c);
    return c;
  }
  // liest eine .pk-Datei; null, wenn Generation/Größe/Art nicht passen. Ungültige Prüfsumme: verschlüsselte Datei versuchen, sonst neu berechnen.
  function monFromFile(src, fileName, party) {
    var sv = st.sv, F = sv.fmt, m = /\.pk(\d)$/i.exec(fileName || ''), d;
    if (m && +m[1] !== sv.gen) return null;
    if (sv.gb) d = F.fromFile(src);
    else {
      if (!F.fileSizes || F.fileSizes.indexOf(src.length) < 0) return null;
      d = new Uint8Array(src);
      if (F.checksumOk && !F.checksumOk(d)) {
        var dec = F.decode ? F.decode(src, 0, src.length === F.fileSizes[1]) : null;
        if (dec) d = dec; else if (F.refreshChecksum) F.refreshChecksum(d);
      }
    }
    if (!d) return null;
    var nat = sv.natOf(F.get(d, 'species'));
    if (!nat || nat > sv.maxSpecies) return null;
    return party ? toParty(d) : toBox(d);
  }
  function exportMon() {
    if (!st.mon) return;
    var F = st.sv.fmt, sp = st.sv.natOf(F.get(st.mon, 'species'));
    download(String(sp).padStart(3, '0') + ' ' + speciesName(sp) + '.pk' + st.sv.gen, monToFile(st.mon));
  }
  function importMon(file) {
    if (!file) {
      var inp = el('input', { type: 'file', accept: window.RL_ANDROID ? '*/*' : '.pk1,.pk2,.pk3,.pk4,.pk5,.pk6,.pk7,.pkm', style: 'display:none' });
      inp.onchange = function () { if (inp.files[0]) importMon(inp.files[0]); };
      document.body.appendChild(inp); inp.click(); setTimeout(function () { inp.remove(); }, 60000); return;
    }
    var fr = new FileReader();
    fr.onload = function () {
      var party = st.sel && st.sel.kind === 'party', d = null;
      try { d = monFromFile(new Uint8Array(fr.result), file.name, party); } catch (e) { d = null; }
      if (!d) { st.err = X.impBad; return render(); }
      st.mon = d; st.err = ''; if (!st.sel) st.sel = { kind: 'box', box: st.box, slot: 0 };
      render();
    };
    fr.readAsArrayBuffer(file);
  }
  function sortBox(by) {
    var sv = st.sv, F = sv.fmt, list = [];
    for (var i = 0; i < sv.slotsPerBox; i++) { var d = sv.getBoxMon(st.box, i); if (d) list.push(new Uint8Array(d)); }
    function key(d) { var sp = F.get(d, 'species'), nat = sv.natOf(sp); return by === 'lv' ? S.levelFor(pers(sp)[6], F.get(d, 'exp')) : nat; }
    list.sort(function (x, y) { return key(x) - key(y) || sv.natOf(F.get(x, 'species')) - sv.natOf(F.get(y, 'species')); });
    for (var j = 0; j < sv.slotsPerBox; j++) sv.setBoxMon(st.box, j, list[j] || null);
    st.dirty = true; st.sel = null; st.mon = null; st.moveFrom = null; render();
  }
  function clearBox() {
    if (!window.confirm(X.clearConfirm)) return;
    for (var i = st.sv.slotsPerBox - 1; i >= 0; i--) st.sv.setBoxMon(st.box, i, null);
    st.dirty = true; st.sel = null; st.mon = null; st.moveFrom = null; render();
  }
  function onKey(e) {
    if (!st.sv || !st.sel || !root || !root.offsetParent) return;
    var t = e.target; if (t && /^(INPUT|SELECT|TEXTAREA)$/.test(t.tagName)) return;
    if (e.key === 'Delete' && getAt(st.sel)) {
      if (st.sel.kind === 'party' && st.sv.getParty().length <= 1) return;
      putAt(st.sel, null); st.mon = null; st.dirty = true; render();
    }
  }
  document.addEventListener('keydown', onKey);

  // ---------- einfache Plausibilitätsprüfung (wie ein kleiner Legalitäts-Check) ----------
  function checkMon(d) {
    if (!window.CCLegal) return [];
    try { return window.CCLegal.check(st.sv, d, { P: P, S: S, de: de }); } catch (e) { return []; }
  }
  // ---------- Suche über alle Boxen und das Team ----------
  function findMons(q) {
    var sv = st.sv, F = sv.fmt, res = [], n = (q || '').toLowerCase().trim();
    var fS = !!st.fShiny, fE = !!st.fEgg;
    if (!n && !fS && !fE) return res;
    function test(d, loc) { if (!d) return; if (fS && !isShiny(d)) return; if (fE && !F.get(d, 'egg')) return; var nat = sv.natOf(F.get(d, 'species')), nm = speciesName(nat).toLowerCase(); if (!n || nm.indexOf(n) >= 0 || String(nat) === n || (F.get(d, 'nick') || '').toLowerCase().indexOf(n) >= 0) res.push({ d: d, loc: loc, nat: nat }); }
    sv.getParty().forEach(function (d, i) { test(d, { kind: 'party', box: 0, slot: i }); });
    for (var b = 0; b < sv.boxCount && res.length < 60; b++) for (var s2 = 0; s2 < sv.slotsPerBox; s2++) test(sv.getBoxMon(b, s2), { kind: 'box', box: b, slot: s2 });
    return res;
  }
  function healParty() {
    var sv = st.sv, F = sv.fmt, list = sv.getParty();
    list.forEach(function (d) { if (!d) return; F.set(d, 'hp', F.stats(d)[0] || F.get(d, 'hp')); F.set(d, 'status', 0); });
    sv.setParty(list); st.dirty = true; st.mon = st.sel ? (getAt(st.sel) ? new Uint8Array(getAt(st.sel)) : null) : null; render();
  }
  function maxBoxIvs() {
    var sv = st.sv, F = sv.fmt;
    if (sv.gb) return;
    for (var i = 0; i < sv.slotsPerBox; i++) { var d = sv.getBoxMon(st.box, i); if (d) { for (var q = 0; q < 6; q++) F.set(d, 'iv', 31, q); sv.setBoxMon(st.box, i, d); } }
    st.dirty = true; st.mon = st.sel && st.sel.kind === 'box' ? (getAt(st.sel) ? new Uint8Array(getAt(st.sel)) : null) : st.mon; render();
  }

  // ---------- Fundort-Auswahl (Namen aus PKHeX) ----------
  function locField(F, d, key) {
    var sv = st.sv, set = window.PKHEX && window.PKHEX.locations && window.PKHEX.locations['gen' + sv.gen];
    var cur = F.get(d, key);
    if (!set) return num(cur, 0, 65535, function (v) { F.set(d, key, v); });
    var names = set[de ? 'de' : 'en'] || set.en, ids = Object.keys(names).map(Number).sort(function (a, b) { return a - b; });
    var h = '';
    if (ids.indexOf(cur) < 0) h += '<option value="' + cur + '" selected>' + esc(X.locUnknown + ' [' + cur + ']') + '</option>';
    ids.forEach(function (id) { h += '<option value="' + id + '"' + (id === cur ? ' selected' : '') + '>' + esc(names[id] + ' [' + id + ']') + '</option>'; });
    return select2(h, function (v) { F.set(d, key, v); });
  }
  function itemName(id) { return nm(T[st.sv.items] || T.items, id) || ('#' + id); }
  // ---------- Item-Taschen ----------
  function bagPanel() {
    var sv = st.sv, bag = sv.bag, box = el('div', { class: 'sv-ed' });
    if (!bag) { box.appendChild(el('div', { class: 'hint', text: X.noBag })); return box; }
    if (st.pi >= bag.pouches.length) st.pi = 0;
    var PT = { Items: X.pItems, KeyItems: X.pKey, TMHMs: X.pTm, MailItems: X.pMail, Medicine: X.pMed, Berries: X.pBerry, Balls: X.pBall, BattleItems: X.pBattle, PCItems: X.pPc, ZCrystals: X.pZ };
    var tabs = el('div', { class: 'sv-tabs sv-wrap' });
    bag.pouches.forEach(function (p, i) { var tb = el('button', { type: 'button', class: 'sv-tab' + (st.pi === i ? ' on' : ''), text: PT[p.k] || p.k }); tb.onclick = function () { st.pi = i; render(); }; tabs.appendChild(tb); });
    box.appendChild(tabs);
    var p = bag.pouches[st.pi], items = bag.read(st.pi).filter(function (x) { return x.id; });
    function commit(list) { bag.write(st.pi, list); st.dirty = true; render(); }
    box.appendChild(el('div', { class: 'hint', text: items.length + ' / ' + p.size + ' ' + X.slotsUsed }));
    var tb2 = el('table', { class: 'sv-bag' });
    items.forEach(function (it, k) {
      var tr = el('tr'), td1 = el('td'), td2 = el('td'), td3 = el('td');
      var h = ''; var inList = p.ids.indexOf(it.id) >= 0;
      if (!inList) h += '<option value="' + it.id + '" selected>' + esc(itemName(it.id) + ' (' + X.outOfList + ')') + '</option>';
      p.ids.forEach(function (id) { h += '<option value="' + id + '"' + (id === it.id ? ' selected' : '') + '>' + esc(itemName(id)) + '</option>'; });
      td1.appendChild(select2(h, function (v) { items[k].id = v; items[k].count = Math.min(items[k].count, bag.maxFor(st.pi, v)); commit(items); }));
      td2.appendChild(num(it.count, 1, bag.maxFor(st.pi, it.id), function (v) { items[k].count = v; bag.write(st.pi, items); st.dirty = true; }));
      var rm = el('button', { type: 'button', class: 'sv-mini', text: '✕' }); rm.onclick = function () { items.splice(k, 1); commit(items); }; td3.appendChild(rm);
      tr.appendChild(td1); tr.appendChild(td2); tr.appendChild(td3); tb2.appendChild(tr);
    });
    box.appendChild(tb2);
    var bar = el('div', { class: 'sv-row sv-tools' });
    var add = el('button', { type: 'button', class: 'sv-mini', text: X.addItem }); add.onclick = function () {
      var used = {}; items.forEach(function (x) { used[x.id] = 1; });
      var free = p.ids.filter(function (id) { return !used[id]; })[0];
      if (!free || items.length >= p.size) return;
      items.push({ id: free, count: 1 }); commit(items);
    }; bar.appendChild(add);
    [[X.giveAll, function () { commit(p.ids.slice(0, p.size).map(function (id) { return { id: id, count: bag.maxFor(st.pi, id) }; })); }],
     [X.sortPouch, function () { commit(items.slice().sort(function (a, b) { return a.id - b.id; })); }],
     [X.clearPouch, function () { commit([]); }]].forEach(function (c) { var b = el('button', { type: 'button', class: 'sv-mini', text: c[0] }); b.onclick = c[1]; bar.appendChild(b); });
    box.appendChild(bar);
    return box;
  }
  // ---------- Pokédex ----------
  function dexPanel() {
    var sv = st.sv, dex = sv.dex, box = el('div', { class: 'sv-ed' });
    if (!dex) { box.appendChild(el('div', { class: 'hint', text: X.noBag })); return box; }
    var cnt = el('div', { class: 'hint' }), bar = el('div', { class: 'sv-row sv-tools' });
    function recount() { var a = 0, b = 0; for (var n = 1; n <= dex.max; n++) { var g = dex.get(n); a += g.seen ? 1 : 0; b += g.caught ? 1 : 0; } cnt.textContent = X.seenL + ': ' + a + ' / ' + dex.max + ' · ' + X.caughtL + ': ' + b + ' / ' + dex.max; }
    [[X.seenAll, function () { for (var n = 1; n <= dex.max; n++) dex.set(n, true, dex.get(n).caught); }], [X.caughtAll, function () { for (var n = 1; n <= dex.max; n++) dex.set(n, true, true); }], [X.dexClear, function () { for (var n = 1; n <= dex.max; n++) dex.set(n, false, false); }]]
      .forEach(function (c) { var b = el('button', { type: 'button', class: 'sv-mini', text: c[0] }); b.onclick = function () { c[1](); st.dirty = true; render(); }; bar.appendChild(b); });
    box.appendChild(bar); box.appendChild(cnt);
    var q = el('input', { type: 'search', class: 'sv-txt sv-find', placeholder: X.dexFilter, value: st.dq || '' }); box.appendChild(q);
    var list = el('div', { class: 'sv-dex' }); box.appendChild(list);
    function draw() {
      list.innerHTML = ''; var f = (st.dq || '').toLowerCase().trim();
      for (var n = 1; n <= dex.max; n++) (function (n) {
        var nmx = speciesName(n); if (f && nmx.toLowerCase().indexOf(f) < 0 && String(n) !== f) return;
        var g = dex.get(n), row = el('div', { class: 'sv-dexrow' });
        row.appendChild(el('span', { class: 'sv-dexn', text: '#' + n + ' ' + nmx }));
        var cs = el('input', { type: 'checkbox' }); cs.checked = g.seen;
        var cc = el('input', { type: 'checkbox' }); cc.checked = g.caught;
        cs.onchange = function () { dex.set(n, cs.checked, cc.checked && cs.checked); cc.checked = cc.checked && cs.checked; st.dirty = true; recount(); };
        cc.onchange = function () { dex.set(n, cc.checked || cs.checked, cc.checked); cs.checked = cc.checked || cs.checked; st.dirty = true; recount(); };
        var l1 = el('label', { class: 'sv-check' }); l1.appendChild(cs); l1.appendChild(el('span', { text: X.seenL }));
        var l2 = el('label', { class: 'sv-check' }); l2.appendChild(cc); l2.appendChild(el('span', { text: X.caughtL }));
        row.appendChild(l1); row.appendChild(l2); list.appendChild(row);
      })(n);
    }
    q.oninput = function () { st.dq = q.value; draw(); };
    recount(); draw();
    return box;
  }
  // ---------- Event-Flags und Arbeitswerte ----------
  function eventsPanel() {
    var sv = st.sv, ev = sv.events, box = el('div', { class: 'sv-ed' });
    if (!ev) { box.appendChild(el('div', { class: 'hint', text: X.noBag })); return box; }
    box.appendChild(el('div', { class: 'hint', text: X.evNote }));
    var tabs = el('div', { class: 'sv-tabs' });
    [['flags', X.evFlags], ['work', X.evWork]].forEach(function (t) { var tb = el('button', { type: 'button', class: 'sv-tab' + (st.ev === t[0] ? ' on' : ''), text: t[1] }); tb.onclick = function () { st.ev = t[0]; render(); }; tabs.appendChild(tb); });
    box.appendChild(tabs);
    var isFlags = st.ev === 'flags', named = isFlags ? ev.names.flags : ev.names.work, total = isFlags ? ev.flagCount : ev.workCount;
    var q = el('input', { type: 'search', class: 'sv-txt sv-find', placeholder: X.evSearch, value: st.eq || '' }); box.appendChild(q);
    var list = el('div', { class: 'sv-dex' }); box.appendChild(list);
    var namedMap = {}; named.forEach(function (n) { namedMap[n[0]] = n; });
    function row(n) {
      var info = namedMap[n], r = el('div', { class: 'sv-dexrow' });
      r.appendChild(el('span', { class: 'sv-dexn', text: '#' + n + (info ? ' ' + info[2] : '') }));
      if (isFlags) {
        var cb = el('input', { type: 'checkbox' }); cb.checked = ev.getFlag(n); cb.onchange = function () { ev.setFlag(n, cb.checked); st.dirty = true; };
        var l = el('label', { class: 'sv-check' }); l.appendChild(cb); l.appendChild(el('span', { text: X.evToggle })); r.appendChild(l);
      } else {
        var cur = ev.getWork(n), opts = info && info[3] ? info[3].split(',').map(function (x) { var i = x.indexOf(':'); return [+x.slice(0, i), x.slice(i + 1)]; }) : null;
        if (opts && opts.length) {
          var h = ''; var found = opts.some(function (o) { return o[0] === cur; });
          if (!found) h += '<option value="' + cur + '" selected>' + cur + '</option>';
          opts.forEach(function (o) { h += '<option value="' + o[0] + '"' + (o[0] === cur ? ' selected' : '') + '>' + esc(o[0] + ': ' + o[1]) + '</option>'; });
          r.appendChild(select2(h, function (v) { ev.setWork(n, v); st.dirty = true; }));
        } else r.appendChild(num(cur, 0, ev.workMax || 65535, function (v) { ev.setWork(n, v); st.dirty = true; }));
      }
      return r;
    }
    function draw() {
      list.innerHTML = ''; var f = (st.eq || '').toLowerCase().trim(), shown = 0, ids = [];
      if (f && /^\d+$/.test(f) && +f < total) ids.push(+f);
      named.forEach(function (n) { if (n[0] < total && (!f || n[2].toLowerCase().indexOf(f) >= 0 || String(n[0]) === f || ('' + n[0]).indexOf(f) === 0) && ids.indexOf(n[0]) < 0) ids.push(n[0]); });
      if (!f) ids.sort(function (a, b) { return a - b; });
      ids.slice(0, 300).forEach(function (n) { list.appendChild(row(n)); shown++; });
      if (!shown) list.appendChild(el('span', { class: 'hint', text: X.evNone }));
    }
    q.oninput = function () { st.eq = q.value; draw(); };
    draw();
    return box;
  }

  // ---------- Massenbearbeitung (einfacher Batch-Editor) ----------
  var BATCH = ['lv100', 'iv31', 'ev0', 'ev252', 'noitem', 'shiny', 'unshiny', 'heal'], BATCH_GB = ['lv100', 'dv15', 'se0', 'semax', 'noitem', 'shiny', 'unshiny'];
  function batchApply(scope, act) {
    var sv = st.sv, F = sv.fmt, n = 0;
    function gbEdit(d, party) {
      var q, sp = F.get(d, 'species');
      switch (act) {
        case 'lv100': F.set(d, 'exp', S.expFor(sv.growthOf(sp), 100)); break;
        case 'dv15': for (q = 0; q < 4; q++) F.set(d, 'dv', 15, q); break;
        case 'se0': for (q = 0; q < 5; q++) F.set(d, 'ev', 0, q); break;
        case 'semax': for (q = 0; q < 5; q++) F.set(d, 'ev', 65535, q); break;
        case 'noitem': if (sv.gen === 2) F.set(d, 'item', 0); break;
        case 'shiny': if (sv.gen === 2) F.setShiny(d, true); break;
        case 'unshiny': if (sv.gen === 2) F.setShiny(d, false); break;
      }
      gbRefresh(d, party); n++;
    }
    function edit(d, party) {
      if (sv.gb) return gbEdit(d, party);
      var sp = F.get(d, 'species'), g = pers(sp), q;
      switch (act) {
        case 'lv100': F.set(d, 'exp', S.expFor(g[6], 100)); break;
        case 'iv31': for (q = 0; q < 6; q++) F.set(d, 'iv', 31, q); break;
        case 'ev0': for (q = 0; q < 6; q++) F.set(d, 'ev', 0, q); break;
        case 'ev252': var ev = [252, 252, 6, 0, 0, 0]; for (q = 0; q < 6; q++) F.set(d, 'ev', ev[q], q); break;
        case 'noitem': F.set(d, 'item', 0); break;
        case 'shiny': if (!isShiny(d)) F.set(d, 'pid', newPid(d, F.nature(d), true)); break;
        case 'unshiny': if (isShiny(d)) F.set(d, 'pid', newPid(d, F.nature(d), false)); break;
        case 'heal': if (party) { F.set(d, 'hp', F.stats(d)[0] || F.get(d, 'hp')); F.set(d, 'status', 0); } break;
      }
      if (party && act !== 'heal' && act !== 'noitem') refreshParty(d);
      n++;
    }
    if (scope === 'party') {
      var list = sv.getParty(); list.forEach(function (d) { if (d) edit(d, true); }); sv.setParty(list);
    } else {
      var from = scope === 'box' ? st.box : 0, to = scope === 'box' ? st.box + 1 : sv.boxCount;
      for (var b = from; b < to; b++) for (var s2 = 0; s2 < sv.slotsPerBox; s2++) { var d2 = sv.getBoxMon(b, s2); if (d2) { edit(d2, false); sv.setBoxMon(b, s2, d2); } }
    }
    st.dirty = true; st.sel = null; st.mon = null; st.msg = X.batchDone.replace('{0}', n); render();
  }
  function hofPanel() {
    var sv = st.sv, box = el('div', { class: 'sv-tr' }), list = [];
    box.appendChild(el('h3', { text: X.tabHof }));
    try { list = sv.hof.entries(); } catch (e) { list = []; }
    list = list.filter(function (e) { return e.team.every(function (m) { return m.species >= 1 && m.species <= sv.maxSpecies; }); });
    if (!list.length) box.appendChild(el('div', { class: 'hint', text: X.hofEmpty }));
    list.forEach(function (en) {
      var card = el('div', { class: 'sv-sec' });
      card.appendChild(el('b', { text: X.hofNo + ' #' + en.n + (en.date ? ' · ' + (/^\d\d-/.test(en.date) ? '20' + en.date : en.date) : '') }));
      var row = el('div', { class: 'sv-row' });
      en.team.forEach(function (m) {
        var nat = sv.natOf(m.species), c = el('div', { class: 'sv-hof-m' });
        var img = window.NATDEX && window.NATDEX[nat] ? A.spriteById(window.NATDEX[nat][0], '', m.shiny, speciesName(nat)) : el('span');
        c.appendChild(img);
        c.appendChild(el('div', { text: (m.nick || speciesName(nat)) + (m.shiny ? ' ★' : '') }));
        c.appendChild(el('div', { class: 'hint', text: speciesName(nat) + ' · Lv ' + m.level }));
        if (m.moves) c.appendChild(el('div', { class: 'hint', text: m.moves.filter(Boolean).map(function (mv) { return nm(T.moves, mv); }).join(', ') }));
        row.appendChild(c);
      });
      card.appendChild(row); box.appendChild(card);
    });
    if (list.length) {
      var cl = el('button', { type: 'button', class: 'sv-mini', text: X.hofClear });
      cl.onclick = function () { if (confirm(X.hofAsk)) { sv.hof.clear(); st.dirty = true; render(); } };
      box.appendChild(cl);
    }
    return box;
  }
  function wcPanel() {
    var sv = st.sv, wc = sv.wc, box = el('div', { class: 'sv-ed' });
    box.appendChild(el('h3', { text: X.tabWc + ' (' + wc.ext + ')' }));
    var list = wc.list(), usedCount = list.filter(Boolean).length;
    var bar = el('div', { class: 'sv-bar sv-tools' });
    var impIn = el('input', { type: 'file', accept: window.RL_ANDROID ? '*/*' : wc.ext, style: 'display:none' });
    impIn.onchange = function () {
      var f = impIn.files[0]; if (!f) return;
      var fr = new FileReader();
      fr.onload = function () {
        var b = new Uint8Array(fr.result);
        var free = list.indexOf(null); if (free < 0) free = 0;
        if (b.length !== wc.cardSize || !wc.setRaw(free, b)) { st.err = X.wcBad.replace('{0}', wc.ext).replace('{1}', wc.cardSize); render(); return; }
        st.err = ''; st.dirty = true; render();
      };
      fr.readAsArrayBuffer(f);
    };
    var impB = el('button', { type: 'button', class: 'sv-mini', text: X.wcImp + ' (' + wc.ext + ')' }); impB.onclick = function () { impIn.click(); };
    var cfB = el('button', { type: 'button', class: 'sv-mini', text: X.wcClearFlags }); cfB.onclick = function () { wc.clearFlags(); st.dirty = true; render(); };
    bar.appendChild(impB); bar.appendChild(impIn); bar.appendChild(cfB);
    box.appendChild(bar);
    if (!usedCount) { box.appendChild(el('p', { class: 'hint', text: X.wcEmpty })); return box; }
    list.forEach(function (c) {
      if (!c) return;
      var card = el('div', { class: 'sv-sec' });
      var det = c.type === 'mon' && c.species ? (speciesName(c.species) + (c.level ? ' Lv ' + c.level : '')) : (c.type === 'item' && c.item ? (nm(itemList(), c.item) || ('Item #' + c.item)) : '');
      card.appendChild(el('div', { html: '<b>#' + c.id + '</b> ' + esc(c.title || (X.wcSlot + ' ' + (c.slot + 1))) + (det ? ' <span class="hint">· ' + esc(det) + '</span>' : '') }));
      var act = el('div', { class: 'sv-bar sv-tools' });
      var tog = el('button', { type: 'button', class: 'sv-mini', text: c.used ? X.wcUsed : X.wcUnused });
      tog.onclick = function () { wc.setUsed(c.slot, !c.used); st.dirty = true; render(); };
      var exB = el('button', { type: 'button', class: 'sv-mini', text: X.wcExp });
      exB.onclick = function () { download('wc_' + (c.id || c.slot) + wc.ext, wc.getRaw(c.slot)); };
      var dlB = el('button', { type: 'button', class: 'sv-mini', text: X.del });
      dlB.onclick = function () { wc.remove(c.slot); st.dirty = true; render(); };
      act.appendChild(tog); act.appendChild(exB); act.appendChild(dlB);
      card.appendChild(act); box.appendChild(card);
    });
    return box;
  }
  function trainerPanel() {
    var sv = st.sv, t = sv.getTrainer(), box = el('div', { class: 'sv-tr' });
    box.appendChild(el('h3', { text: L.trainer }));
    var name = el('input', { type: 'text', class: 'sv-txt', maxlength: sv.gen >= 6 ? 12 : 7 }); name.value = t.name;
    function save() { sv.setTrainer(t); st.dirty = true; }
    name.onchange = function () { t.name = name.value; save(); };
    box.appendChild(field(L.name, name));
    var row = el('div', { class: 'sv-row' });
    row.appendChild(field('TID', num(t.tid, 0, 65535, function (v) { t.tid = v; save(); }), 'sm'));
    if (!t.noSid) row.appendChild(field('SID', num(t.sid, 0, 65535, function (v) { t.sid = v; save(); }), 'sm'));
    row.appendChild(field(L.money, num(t.money, 0, maxMoney(sv.gen), function (v) { t.money = v; save(); }), 'sm'));
    box.appendChild(row);
    var gs = select2('<option value="0"' + (!t.gender ? ' selected' : '') + '>' + esc(L.male) + '</option><option value="1"' + (t.gender ? ' selected' : '') + '>' + esc(L.female) + '</option>', function (v) { t.gender = v; save(); });
    if (!t.noGender) box.appendChild(field(L.gender, gs));
    if (sv.playTime) {
      var pt = sv.playTime.get(), prow = el('div', { class: 'sv-row' });
      function savePt() { sv.playTime.set(pt); st.dirty = true; }
      prow.appendChild(field(X.hours, num(pt.h, 0, 65535, function (v) { pt.h = v; savePt(); }), 'sm'));
      prow.appendChild(field(X.minutes, num(pt.m, 0, 59, function (v) { pt.m = v; savePt(); }), 'sm'));
      prow.appendChild(field(X.seconds, num(pt.s, 0, 59, function (v) { pt.s = v; savePt(); }), 'sm'));
      box.appendChild(prow);
    }
    if (sv.counters && sv.counters.length) {
      var crow = el('div', { class: 'sv-row' });
      sv.counters.forEach(function (c) { crow.appendChild(field(c.k === 'coins' ? X.coins : X.bp, num(c.get(), 0, c.max, function (v) { c.set(v); st.dirty = true; }), 'sm')); });
      box.appendChild(crow);
    }
    if (sv.badges) {
      box.appendChild(el('h4', { class: 'sv-h4', text: X.badges }));
      var bg = el('div', { class: 'sv-ribs' });
      for (var bi = 0; bi < sv.badges.n; bi++) (function (bi) {
        var cb = el('input', { type: 'checkbox' }); cb.checked = !!sv.badges.get(bi);
        cb.onchange = function () { sv.badges.set(bi, cb.checked); st.dirty = true; };
        var lb = el('label', { class: 'sv-check' }); lb.appendChild(cb); lb.appendChild(el('span', { text: X.badge + ' ' + (bi % 8 + 1) + (sv.badges.n > 8 ? (bi < 8 ? ' (' + X.badgeA + ')' : ' (' + X.badgeB + ')') : '') })); bg.appendChild(lb);
      })(bi);
      box.appendChild(bg);
    }
    return box;
  }

  function render() {
    root = document.getElementById('saveView'); if (!root) return;
    root.innerHTML = '';
    var box = el('div', { class: 'panel sv-box' });
    var h2 = el('h2', { text: L.title + ' ' });
    h2.appendChild(el('span', { class: 'alpha-badge is-beta', text: 'BETA' }));
    box.appendChild(h2);
    var body = el('div', { class: 'rd-body' });
    body.appendChild(el('p', { class: 'hint', text: L.sub }));
    var inp = el('input', window.RL_ANDROID ? { type: 'file', accept: '*/*', style: 'display:none' } : { type: 'file', style: 'display:none' });
    inp.onchange = function () { if (inp.files[0]) load(inp.files[0]); };
    var pick = el('button', { class: 'primary-btn rd-pick', text: L.pick }); pick.onclick = function () { inp.click(); };
    var dz = el('div', { class: 'rd-drop' }); dz.appendChild(pick); dz.appendChild(el('span', { class: 'hint', text: L.drop })); dz.appendChild(inp);
    root.ondragover = function (e) { e.preventDefault(); dz.classList.add('on'); };
    root.ondragleave = function () { dz.classList.remove('on'); };
    root.ondrop = function (e) { e.preventDefault(); dz.classList.remove('on'); if (e.dataTransfer.files[0]) load(e.dataTransfer.files[0]); };
    body.appendChild(dz);
    if (st.err) body.appendChild(el('div', { class: 'rd-err', text: st.err }));
    var sv = st.sv;
    if (sv) {
      body.appendChild(el('div', { class: 'rd-game', html: '<b>' + esc(L.game) + '</b> ' + esc((de ? sv.gameName : sv.gameNameEn)) + ' (Gen ' + sv.gen + ') – ' + esc(st.name) + (st.dirty ? ' <span class="sv-dirty">● ' + esc(X.dirty) + '</span>' : '') }));
      var sb = el('button', { class: 'primary-btn rd-go', text: L.save }); sb.onclick = function () {
        var out = new Uint8Array(st.orig); out.set(sv.finish(), st.base);
        var hasExt = st.name.indexOf('.') > 0, base = st.name.replace(/\.[^.]*$/, ''), ext = (st.name.split('.').pop() || 'sav');
        download(hasExt ? base + ' (edited).' + ext : st.name + ' (edited)', out); st.msg = L.saved + (sv.signed === false ? ' ' + X.memeWarn : ''); st.dirty = false; render();
      };
      body.appendChild(sb);
      if (st.msg) body.appendChild(el('div', { class: 'rd-ok', text: st.msg }));
      body.appendChild(el('p', { class: 'hint', text: X.hint }));
      var cols = el('div', { class: 'sv-cols' });
      var left = el('div', { class: 'sv-left' });
      var seg = el('div', { class: 'sv-tabs sv-seg' });
      [['mon', X.tabMon], ['trainer', X.tabTrainer]].concat(sv.hof ? [['hof', X.tabHof]] : [], sv.wc ? [['wc', X.tabWc]] : [], sv.bag ? [['items', X.tabItems], ['dex', X.tabDex], ['events', X.tabEvents]] : []).forEach(function (t) { var tb = el('button', { type: 'button', class: 'sv-tab' + (st.pane === t[0] ? ' on' : ''), text: t[1] }); tb.onclick = function () { st.pane = t[0]; render(); }; seg.appendChild(tb); });
      if (!sv.bag && (st.pane === 'items' || st.pane === 'dex' || st.pane === 'events')) st.pane = 'mon';
      if (!sv.wc && st.pane === 'wc') st.pane = 'mon';
      var wide = st.pane === 'items' || st.pane === 'dex' || st.pane === 'events' || st.pane === 'hof' || st.pane === 'wc';
      left.appendChild(seg);
      if (st.pane === 'trainer') left.appendChild(trainerPanel());
      else if (st.pane === 'hof' && sv.hof) left.appendChild(hofPanel());
      else if (st.pane === 'wc' && sv.wc) left.appendChild(wcPanel());
      else if (st.pane === 'items') left.appendChild(bagPanel());
      else if (st.pane === 'dex') left.appendChild(dexPanel());
      else if (st.pane === 'events') left.appendChild(eventsPanel());
      else if (st.sel) left.appendChild(monEditor());
      else left.appendChild(el('div', { class: 'sv-ed hint', text: X.nothing }));
      cols.appendChild(left);
      if (wide) { cols.classList.add('sv-one'); body.appendChild(cols); } else {
      var right = el('div', { class: 'sv-right' });
      var bt = el('div', { class: 'sv-sec' });
      var nav = el('div', { class: 'sv-boxnav' });
      function go(dlt) { st.box = (st.box + dlt + sv.boxCount) % sv.boxCount; st.sel = null; st.mon = null; render(); }
      var pv = el('button', { type: 'button', class: 'sv-mini', title: X.boxPrev, text: '◀' }); pv.onclick = function () { go(-1); }; nav.appendChild(pv);
      var bsel = el('select', { class: 'sv-sel sv-boxsel' }); for (var b = 0; b < sv.boxCount; b++) { var o = el('option', { value: b, text: (b + 1) + ': ' + (sv.getBoxName(b) || ('Box ' + (b + 1))) }); if (b === st.box) o.selected = true; bsel.appendChild(o); }
      bsel.onchange = function () { st.box = +bsel.value; st.sel = null; st.mon = null; render(); };
      nav.appendChild(bsel);
      var nx = el('button', { type: 'button', class: 'sv-mini', title: X.boxNext, text: '▶' }); nx.onclick = function () { go(1); }; nav.appendChild(nx);
      bt.appendChild(nav);
      if (sv.setBoxName) {
        var bn = el('input', { type: 'text', class: 'sv-txt sv-boxname', maxlength: 14, placeholder: X.boxName, value: sv.getBoxName(st.box) || '' });
        bn.onchange = function () { sv.setBoxName(st.box, bn.value); st.dirty = true; render(); };
        bt.appendChild(bn);
      }
      var fq = el('input', { type: 'search', class: 'sv-txt sv-find', placeholder: X.find, value: st.q || '' });
      fq.oninput = function () { st.q = fq.value; renderFind(); };
      bt.appendChild(fq);
      var frow = el('div', { class: 'sv-row sv-filters' });
      [['fShiny', X.fShiny], ['fEgg', X.fEgg]].forEach(function (f) {
        var cb = el('input', { type: 'checkbox' }); cb.checked = !!st[f[0]];
        cb.onchange = function () { st[f[0]] = cb.checked; renderFind(); };
        var lb = el('label', { class: 'sv-check' }); lb.appendChild(cb); lb.appendChild(el('span', { text: f[1] })); frow.appendChild(lb);
      });
      bt.appendChild(frow);
      var fr = el('div', { class: 'sv-found' }); bt.appendChild(fr);
      function renderFind() {
        fr.innerHTML = ''; if (!(st.q || '').trim() && !st.fShiny && !st.fEgg) return;
        var rs = findMons(st.q);
        if (!rs.length) { fr.appendChild(el('span', { class: 'hint', text: X.findNone })); return; }
        rs.forEach(function (r) {
          var b2 = el('button', { type: 'button', class: 'sv-mini sv-hit', text: speciesName(r.nat) + ' · ' + (r.loc.kind === 'party' ? L.party + ' ' + (r.loc.slot + 1) : X.findIn + ' ' + (r.loc.box + 1) + '/' + (r.loc.slot + 1)) });
          b2.onclick = function () { if (r.loc.kind === 'box') st.box = r.loc.box; select(r.loc.kind, r.loc.box, r.loc.slot); };
          fr.appendChild(b2);
        });
      }
      renderFind();
      if (st.moveFrom) {
        var mb = el('div', { class: 'sv-move-banner' });
        mb.appendChild(el('span', { text: st.moveFrom === 'pick' ? X.movePick : X.moveDst }));
        var mc = el('button', { type: 'button', class: 'sv-mini', text: X.moveCancel });
        mc.onclick = function () { st.moveFrom = null; render(); };
        mb.appendChild(mc);
        bt.appendChild(mb);
      }
      var bg = el('div', { class: 'sv-grid sv-boxgrid' });
      for (var s = 0; s < sv.slotsPerBox; s++) (function (s) {
        var loc = { kind: 'box', box: st.box, slot: s };
        var sb2 = slotBtn(sv.getBoxMon(st.box, s), st.sel && st.sel.kind === 'box' && st.sel.box === st.box && st.sel.slot === s, function () { handleSlotClick(loc); });
        dnd(sb2, loc); bg.appendChild(sb2);
      })(s);
      bt.appendChild(bg);
      var tools = el('div', { class: 'sv-row sv-tools' });
      var mvTool = el('button', { type: 'button', class: 'sv-mini sv-move-btn' + (st.moveFrom ? ' on' : ''), text: st.moveFrom ? X.moveCancel : X.moveBtn });
      mvTool.onclick = function () { toggleMove(); };
      tools.appendChild(mvTool);
      [[X.sortSp, function () { sortBox('sp'); }], [X.sortLv, function () { sortBox('lv'); }], [X.maxBox, maxBoxIvs], [X.clearBox, clearBox]].forEach(function (c) { var tb = el('button', { type: 'button', class: 'sv-mini', text: c[0] }); tb.onclick = c[1]; tools.appendChild(tb); });
      bt.appendChild(tools);
      {
        var brow = el('div', { class: 'sv-row sv-tools sv-batch' });
        var bs = select2(['box', 'boxes', 'party'].map(function (k) { return '<option value="' + k + '">' + esc(X['scope_' + k]) + '</option>'; }).join(''), function () {});
        var ba = select2((sv.gb ? BATCH_GB : BATCH).map(function (k) { return '<option value="' + k + '">' + esc(X['act_' + k]) + '</option>'; }).join(''), function () {});
        var bgo = el('button', { type: 'button', class: 'sv-mini', text: X.batchRun }); bgo.onclick = function () { if (window.confirm(X.batchAsk)) batchApply(bs.value, ba.value); };
        brow.appendChild(bs); brow.appendChild(ba); brow.appendChild(bgo); bt.appendChild(brow);
      }
      right.appendChild(bt);
      var pt = el('div', { class: 'sv-sec' }); pt.appendChild(el('h3', { text: L.party }));
      var pg = el('div', { class: 'sv-grid sv-party' });
      partyList().forEach(function (d, i) {
        var loc = { kind: 'party', box: 0, slot: i };
        var pb = slotBtn(d, st.sel && st.sel.kind === 'party' && st.sel.slot === i, function () { handleSlotClick(loc); });
        dnd(pb, loc); pg.appendChild(pb);
      });
      pt.appendChild(pg);
      var ptools = el('div', { class: 'sv-row sv-tools' }); var hb2 = el('button', { type: 'button', class: 'sv-mini', text: X.heal }); hb2.onclick = healParty; ptools.appendChild(hb2); pt.appendChild(ptools);
      right.appendChild(pt);
      cols.appendChild(right);
      body.appendChild(cols);
      }
    }
    box.appendChild(body); root.appendChild(box);
  }
  window.CCSaveUI = { render: render };
  // für Tests (node test/test_save_fixes.js): interne Helfer mit gesetztem Spielstand aufrufen
  window.CCSaveUI._test = { setSv: function (sv) { st.sv = sv; }, setState: function (o) { Object.keys(o).forEach(function (k) { st[k] = o[k]; }); }, getState: function () { return st; },
    newPid: newPid, putAt: putAt, getAt: getAt, changeSpecies: changeSpecies, setForm: setForm, setEgg: setEgg, blank: blank, recalc: recalc,
    pers: pers, persD: persD, gbRefresh: gbRefresh, healParty: healParty, batchApply: batchApply, monToFile: monToFile, monFromFile: monFromFile,
    sdExport: sdExport, sdImport: sdImport, legalize: legalize, clearBox: clearBox, apply: apply, remove: remove, formNames: formNames,
    ppMax: ppMax, clampEv: clampEv, maxMoney: maxMoney, unownLetter: unownLetter, isShiny: isShiny };
})();

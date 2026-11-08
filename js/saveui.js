// Save File Editor – Oberfläche (#saveView): Spielstand laden, Team und Boxen ansehen, Pokémon und Trainerdaten bearbeiten, speichern.
// Kern und Formate: js/savedit.js (nach PKHeX). Namenslisten: data/pk_text.js, Basiswerte: data/pk_personal.js
(function () {
  'use strict';
  var A = window.CC, S = window.CCSave, T0 = window.PKTEXT, P = window.PKPERSONAL;
  if (!A || !S || !T0 || !P) return;
  var el = A.el, esc = A.esc, de = A.LANG === 'de', T = de ? T0.de : T0.en;
  var L = de ? {
    title: 'Save File Editor', sub: 'Bearbeite Spielstände: Team, Boxen, Pokémon (Werte, Attacken, Item, Wesen, Shiny) und Trainerdaten. Die Originaldatei bleibt unverändert, du speicherst eine neue Datei. Unterstützt: Generation 1–7.',
    pick: 'Spielstand wählen …', drop: 'oder eine .sav- / .dsv-Datei hierher ziehen', bad: 'Diese Datei wird nicht erkannt. Unterstützt werden Spielstände der Generation 1 und 2 (Game Boy), 3 (GBA), 4 und 5 (DS) sowie 6 und 7 (3DS, die "main"-Datei).',
    game: 'Erkannt:', save: 'Spielstand speichern', saved: 'Gespeichert. Mach vorher immer eine Sicherungskopie deines echten Spielstands.', trainer: 'Trainer', party: 'Team', box: 'Box',
    name: 'Name', money: 'Geld', gender: 'Geschlecht', male: 'Männlich', female: 'Weiblich', time: 'Spielzeit (Std : Min)', empty: 'Leer', apply: 'Übernehmen', remove: 'Entfernen', create: 'Neues Pokémon',
    species: 'Pokémon', nick: 'Spitzname', level: 'Level', exp: 'Erfahrung', item: 'Item', none: '–', nature: 'Wesen', shiny: 'Shiny', friendship: 'Freundschaft', egg: 'Ei', ability: 'Fähigkeit',
    slot2: 'Zweite Fähigkeit', moves: 'Attacken', pp: 'AP', ppups: 'AP-Ups', ev: 'EP', iv: 'IP', stats: 'Werte', ot: 'Ursprungstrainer', stat: ['KP', 'Angr', 'Vert', 'Init', 'SpA', 'SpV'],
    dv: 'DVs', statexp: 'Erfahrungswerte (EP)', gbstat: ['KP', 'Angr', 'Vert', 'Init', 'Spezial'], edit: 'Pokémon bearbeiten', ok: 'Pokémon übernommen (noch nicht gespeichert).', evsum: 'EP-Summe', delconfirm: 'Dieses Pokémon entfernen?', all: 'Maximal', self: 'Eigenes Team'
  } : {
    title: 'Save File Editor', sub: 'Edit save files: party, boxes, Pokémon (stats, moves, item, nature, shiny) and trainer data. The original file stays untouched, you save a new file. Supported: generation 3, 4 and 5 (.sav, .dsv).',
    pick: 'Choose save file …', drop: 'or drag a .sav / .dsv file here', bad: 'This file is not recognized. Generation 1 and 2 (Game Boy), 3 (GBA), 4 and 5 (DS) and 6 and 7 (3DS, the "main" file) saves are supported.',
    game: 'Detected:', save: 'Save file', saved: 'Saved. Always keep a backup of your real save first.', trainer: 'Trainer', party: 'Party', box: 'Box',
    name: 'Name', money: 'Money', gender: 'Gender', male: 'Male', female: 'Female', time: 'Play time (h : min)', empty: 'Empty', apply: 'Apply', remove: 'Remove', create: 'New Pokémon',
    species: 'Pokémon', nick: 'Nickname', level: 'Level', exp: 'Experience', item: 'Item', none: '–', nature: 'Nature', shiny: 'Shiny', friendship: 'Friendship', egg: 'Egg', ability: 'Ability',
    slot2: 'Second ability', moves: 'Moves', pp: 'PP', ppups: 'PP Ups', ev: 'EVs', iv: 'IVs', stats: 'Stats', ot: 'Original trainer', stat: ['HP', 'Atk', 'Def', 'Spe', 'SpA', 'SpD'],
    dv: 'DVs', statexp: 'Stat experience', gbstat: ['HP', 'Atk', 'Def', 'Spe', 'Special'], edit: 'Edit Pokémon', ok: 'Pokémon applied (not saved yet).', evsum: 'EV total', delconfirm: 'Remove this Pokémon?', all: 'Max', self: 'Own party'
  };

  var X = de ? {
    tabMon: 'Pokémon', tabTrainer: 'Trainer', tMain: 'Haupt', tStats: 'Werte', tMoves: 'Attacken', tOt: 'Herkunft', set: 'Setzen', del: 'Löschen', exp2: 'Exportieren (.pk)', imp: 'Importieren (.pk)',
    boxPrev: 'Vorherige Box', boxNext: 'Nächste Box', sortSp: 'Nach Dex-Nr. sortieren', sortLv: 'Nach Level sortieren', clearBox: 'Box leeren', clearConfirm: 'Alle Pokémon dieser Box entfernen?',
    maxIv: 'Alle IP 31', zeroEv: 'Alle EP 0', maxEv: 'EP 252/252/6', hint: 'Ziehen zum Verschieben oder Tauschen, Strg beim Ablegen kopiert. Entf löscht das markierte Pokémon.',
    fShiny: 'Nur Shiny', fEgg: 'Nur Eier',
    boxName: 'Box-Name', batchRun: 'Anwenden', batchAsk: 'Diese Änderung auf alle gewählten Pokémon anwenden?', batchDone: '{0} Pokémon bearbeitet (noch nicht gespeichert).',
    scope_box: 'Aktuelle Box', scope_boxes: 'Alle Boxen', scope_party: 'Team',
    act_lv100: 'Level 100', act_iv31: 'Alle IP 31', act_ev0: 'Alle EP 0', act_ev252: 'EP 252/252/6', act_noitem: 'Items entfernen', act_shiny: 'Shiny machen', act_unshiny: 'Shiny entfernen', act_heal: 'Heilen (Team)',
    metDate: 'Fangdatum', eggDate: 'Ei-Datum', otGender: 'Geschlecht des Trainers', form: 'Form (Nr.)',
    hours: 'Stunden', minutes: 'Minuten', seconds: 'Sekunden', coins: 'Münzen', bp: 'Kampfpunkte (BP)',
    badges: 'Orden', badge: 'Orden', badgeA: 'Region 1', badgeB: 'Region 2',
    tabHof: 'Ruhmeshalle', hofEmpty: 'Noch kein Eintrag in der Ruhmeshalle.', hofClear: 'Ruhmeshalle leeren', hofAsk: 'Alle Einträge der Ruhmeshalle löschen?', hofNo: 'Eintrag',
    tabHof: 'Hall of Fame', hofEmpty: 'No Hall of Fame entry yet.', hofClear: 'Clear Hall of Fame', hofAsk: 'Delete all Hall of Fame entries?', hofNo: 'Entry',
    tabItems: 'Items', tabDex: 'Pokédex', tabEvents: 'Events', tRib: 'Bänder', ribNone: 'Für dieses Format gibt es keine Bänder.', ribAll: 'Alle', ribClear: 'Keine',
    pItems: 'Items', pKey: 'Basis-Items', pTm: 'TMs & VMs', pMail: 'Briefe', pMed: 'Medizin', pBerry: 'Beeren', pBall: 'Bälle', pBattle: 'Kampf-Items', pPc: 'PC-Items', pZ: 'Z-Kristalle',
    giveAll: 'Alles geben (Max)', clearPouch: 'Tasche leeren', sortPouch: 'Nach ID sortieren', addItem: '+ Item hinzufügen', slotsUsed: 'Plätze belegt', noBag: 'Für diesen Spielstand gibt es noch keinen Editor.', outOfList: 'nicht in der Standardliste',
    seenL: 'Gesehen', caughtL: 'Gefangen', seenAll: 'Alle gesehen', caughtAll: 'Alle gefangen', dexClear: 'Dex leeren', dexFilter: 'Pokémon suchen …',
    evFlags: 'Flags', evWork: 'Werte', evSearch: 'Nach Nr. oder Name suchen …', evNum: 'Nr.', evToggle: 'Umschalten', evNote: 'Event-Flags und Arbeitswerte steuern den Spielfortschritt. Ändere nur, was du kennst, und arbeite an einer Kopie.', evNone: 'Keine Treffer.', locUnknown: 'Unbekannt',
    tHex: 'Hex', pokerus: 'Pokérus', metLoc: 'Fundort (ID)', eggLoc: 'Ei-Ort (ID)', lang: 'Sprache (ID)', contest: ['Coolness', 'Schönheit', 'Anmut', 'Klugheit', 'Stärke', 'Fell'], contestT: 'Wettbewerbswerte',
    legal: 'Legal', illegal: 'Illegal', suspicious: 'Verdächtig',
    find: 'Suchen …', findNone: 'Nichts gefunden.', findIn: 'Box', heal: 'Team heilen', maxBox: 'Box: alle IP 31', chk: 'Prüfung', chkOk: 'Keine Auffälligkeiten.', hexCopy: 'Hex kopieren', hexNote: 'Entschlüsselte Rohdaten des Pokémon (nur Ansicht).',
    cEv: 'EP-Summe über 510', cMove: 'Doppelte Attacke', cNoMove: 'Keine Attacke', cNick: 'Spitzname zu lang', cLv: 'Level außerhalb 1–100', cIv: 'IP über 31', cEmpty: 'Leerer Name des Ursprungstrainers', cShinyLock: 'Shiny, Ei oder Zustand prüfen',
    dirty: 'Ungespeicherte Änderungen', impBad: 'Datei passt nicht zu diesem Spielstand.', nothing: 'Kein Pokémon ausgewählt.', ball: 'Ball', metLv: 'Level beim Fang'
  } : {
    tabMon: 'Pokémon', tabTrainer: 'Trainer', tMain: 'Main', tStats: 'Stats', tMoves: 'Moves', tOt: 'OT / Misc', set: 'Set', del: 'Delete', exp2: 'Export (.pk)', imp: 'Import (.pk)',
    boxPrev: 'Previous box', boxNext: 'Next box', sortSp: 'Sort by Dex no.', sortLv: 'Sort by level', clearBox: 'Clear box', clearConfirm: 'Remove all Pokémon in this box?',
    maxIv: 'All IVs 31', zeroEv: 'All EVs 0', maxEv: 'EVs 252/252/6', hint: 'Drag to move or swap, hold Ctrl when dropping to copy. Delete removes the selected Pokémon.',
    fShiny: 'Shiny only', fEgg: 'Eggs only',
    boxName: 'Box name', batchRun: 'Apply', batchAsk: 'Apply this change to all selected Pokémon?', batchDone: '{0} Pokémon edited (not saved yet).',
    scope_box: 'Current box', scope_boxes: 'All boxes', scope_party: 'Party',
    act_lv100: 'Level 100', act_iv31: 'All IVs 31', act_ev0: 'All EVs 0', act_ev252: 'EVs 252/252/6', act_noitem: 'Remove items', act_shiny: 'Make shiny', act_unshiny: 'Remove shiny', act_heal: 'Heal (party)',
    metDate: 'Met date', eggDate: 'Egg date', otGender: 'OT gender', form: 'Form (no.)',
    hours: 'Hours', minutes: 'Minutes', seconds: 'Seconds', coins: 'Coins', bp: 'Battle Points (BP)',
    badges: 'Badges', badge: 'Badge', badgeA: 'region 1', badgeB: 'region 2',
    tabItems: 'Items', tabDex: 'Pokédex', tabEvents: 'Events', tRib: 'Ribbons', ribNone: 'This format has no ribbons.', ribAll: 'All', ribClear: 'None',
    pItems: 'Items', pKey: 'Key Items', pTm: 'TMs & HMs', pMail: 'Mail', pMed: 'Medicine', pBerry: 'Berries', pBall: 'Balls', pBattle: 'Battle Items', pPc: 'PC Items', pZ: 'Z-Crystals',
    giveAll: 'Give all (max)', clearPouch: 'Clear pouch', sortPouch: 'Sort by ID', addItem: '+ Add item', slotsUsed: 'slots used', noBag: 'There is no editor for this save yet.', outOfList: 'not in the standard list',
    seenL: 'Seen', caughtL: 'Caught', seenAll: 'All seen', caughtAll: 'All caught', dexClear: 'Clear Pokédex', dexFilter: 'Search Pokémon …',
    evFlags: 'Flags', evWork: 'Work values', evSearch: 'Search by number or name …', evNum: 'No.', evToggle: 'Toggle', evNote: 'Event flags and work values control story progress. Only change what you know and work on a copy.', evNone: 'No matches.', locUnknown: 'Unknown',
    tHex: 'Hex', pokerus: 'Pokérus', metLoc: 'Met location (ID)', eggLoc: 'Egg location (ID)', lang: 'Language (ID)', contest: ['Cool', 'Beauty', 'Cute', 'Smart', 'Tough', 'Sheen'], contestT: 'Contest stats',
    legal: 'Legal', illegal: 'Illegal', suspicious: 'Suspicious',
    find: 'Search …', findNone: 'Nothing found.', findIn: 'Box', heal: 'Heal party', maxBox: 'Box: all IVs 31', chk: 'Check', chkOk: 'No issues found.', hexCopy: 'Copy hex', hexNote: 'Decrypted raw data of the Pokémon (view only).',
    cEv: 'EV total above 510', cMove: 'Duplicate move', cNoMove: 'No move', cNick: 'Nickname too long', cLv: 'Level outside 1–100', cIv: 'IV above 31', cEmpty: 'Empty OT name', cShinyLock: 'Check shiny, egg or status',
    dirty: 'Unsaved changes', impBad: 'File does not fit this save.', nothing: 'No Pokémon selected.', ball: 'Ball', metLv: 'Met level'
  };
  var st = { sv: null, name: '', orig: null, base: 0, err: '', msg: '', box: 0, sel: null, mon: null, dirty: false, tab: 'main', pane: 'mon', pi: 0, ev: 'flags' };
  var root;

  function download(name, bytes) { A.saveFile(name, bytes); }
  function nm(list, i) { return (list && list[i]) || ''; }
  function speciesName(nat) { return nm(T.species, nat); }
  function itemList() { return T[st.sv.items]; }
  function maxMove() { return st.sv.maxMove; }
  function maxItem() { return st.sv.maxItem; }
  function maxAbility() { return st.sv.maxAbility; }
  function pers(species) { var e = P['g' + st.sv.gen][st.sv.natOf(species)]; return e || [50, 50, 50, 50, 50, 50, 0, 127, 0, 0]; }
  function isShiny(d) { var F = st.sv.fmt; if (F.gb) return F.shiny(d); var p = F.get(d, 'pid'); return ((F.get(d, 'tid') ^ F.get(d, 'sid') ^ (p >>> 16) ^ (p & 0xFFFF)) >>> 0) < (st.sv.gen >= 6 ? 16 : 8); }
  function genderOf(d, species) { var r = pers(species)[7], pid = st.sv.fmt.get(d, 'pid'); return r === 255 ? 2 : r === 254 ? 1 : r === 0 ? 0 : ((pid & 0xFF) < r ? 1 : 0); }
  // neue PID mit gewünschtem Wesen / Shiny-Status (Geschlecht und Fähigkeits-Slot bleiben erhalten)
  function newPid(d, nature, shiny) {
    var F = st.sv.fmt, old = F.get(d, 'pid'), tid = F.get(d, 'tid'), sid = F.get(d, 'sid'), low = old & 0xFF, bit = old & 1;
    for (var i = 0; i < 600000; i++) {
      var p = ((Math.random() * 0x10000) << 16 | (Math.random() * 0x10000)) >>> 0;
      p = ((p & 0xFFFFFF00) | low) >>> 0;
      if (F.natureIsPid && p % 25 !== nature) continue;
      var sh = ((tid ^ sid ^ (p >>> 16) ^ (p & 0xFFFF)) >>> 0) < (st.sv.gen >= 6 ? 16 : 8);
      if (sh !== shiny) continue;
      if (st.sv.gen === 3 && ((p & 1) !== bit) && false) continue;
      return p;
    }
    return old;
  }
  function recalc(d, partyMon) {
    var F = st.sv.fmt, sp = F.get(d, 'species'), base = pers(sp).slice(0, 6), growth = pers(sp)[6];
    var iv = [], ev = [], i;
    for (i = 0; i < 6; i++) { iv.push(F.get(d, 'iv', i)); ev.push(F.get(d, 'ev', i)); }
    var lv = S.levelFor(growth, F.get(d, 'exp'));
    return { level: lv, stats: S.calcStats(base, lv, iv, ev, F.nature(d), st.sv.natOf(sp) === 292) };
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
    var sv = st.sv, F = sv.fmt, d = new Uint8Array(party ? F.partySize : F.size), t = sv.getTrainer(), lang = de ? (sv.gen === 3 ? 5 : 5) : 2;
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
      F.set(d, 'ot', t.name); F.set(d, 'nick', speciesName(species)); F.set(d, 'ball', 4); d[132] = 5;
      for (var j = 0; j < 6; j++) F.set(d, 'iv', 15, j);
    }
    F.set(d, 'exp', S.expFor(pers(species)[6], 5));
    var g = pers(species)[7], pid = F.get(d, 'pid');
    if (sv.gen >= 4) { d[64] = (d[64] & ~6) | ((g === 255 ? 2 : g === 254 ? 1 : g === 0 ? 0 : ((pid & 0xFF) < g ? 1 : 0)) << 1); F.set(d, 'ability', pers(species)[8 + (pid & 1)] || pers(species)[8]); }
    var mv = defaultMoves(species);
    for (var k = 0; k < 4; k++) { F.set(d, 'move', mv[k] || 0, k); F.set(d, 'pp', mv[k] ? 10 : 0, k); }
    if (party) refreshParty(d);
    return d;
  }
  function defaultMoves() { return [1]; }

  function load(file) {
    st.err = ''; st.msg = ''; st.sel = null; st.mon = null;
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
  function gbRefresh(d) {
    var F = st.sv.fmt, r = gbRecalc(d);
    F.set(d, 'level', r.level);
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
      F.set(d, 'species', v); gbRefresh(d); changed();
    })));
    var nk = el('input', { type: 'text', class: 'sv-txt', maxlength: 10 }); nk.value = F.get(d, 'nick'); nk.onchange = function () { F.set(d, 'nick', nk.value.toUpperCase()); };
    box.appendChild(field(L.nick, nk));
    var row = el('div', { class: 'sv-row' }), lvl = S.levelFor(g, F.get(d, 'exp'));
    row.appendChild(field(L.level, num(lvl, 1, 100, function (v) { F.set(d, 'exp', S.expFor(g, v)); gbRefresh(d); changed(); }), 'sm'));
    row.appendChild(field(L.exp, num(F.get(d, 'exp'), 0, 1640000, function (v) { F.set(d, 'exp', v); gbRefresh(d); changed(); }), 'sm'));
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
      r.appendChild(select2(opts(T.moves, maxMove(), F.get(d, 'move', m), L.none), function (v) { F.set(d, 'move', v, m); if (v && !F.get(d, 'pp', m)) F.set(d, 'pp', 10, m); changed(); }));
      r.appendChild(num(F.get(d, 'pp', m), 0, 63, function (v) { F.set(d, 'pp', v, m); }));
      r.appendChild(num(F.get(d, 'ppups', m), 0, 3, function (v) { F.set(d, 'ppups', v, m); }));
      mt.appendChild(r);
    })(m);
    var mh = el('div', { class: 'sv-mrow sv-mhead' }); mh.appendChild(el('span', { text: L.moves })); mh.appendChild(el('span', { text: L.pp })); mh.appendChild(el('span', { text: L.ppups }));
    box.appendChild(mh); box.appendChild(mt);
    var r = gbRecalc(d);
    var tbl = el('table', { class: 'sv-stats' });
    tbl.innerHTML = '<tr><th></th>' + L.gbstat.map(function (x) { return '<th>' + esc(x) + '</th>'; }).join('') + '</tr>';
    var rEv = el('tr'), rDv = el('tr'), rSt = el('tr'); rEv.appendChild(el('th', { text: L.statexp })); rDv.appendChild(el('th', { text: L.dv })); rSt.appendChild(el('th', { text: L.stats }));
    for (var s = 0; s < 5; s++) (function (s) {
      var e = el('td'); e.appendChild(num(F.get(d, 'ev', s), 0, 65535, function (v) { F.set(d, 'ev', v, s); gbRefresh(d); changed(); })); rEv.appendChild(e);
      var dc = el('td');
      if (s === 0) dc.appendChild(el('span', { text: String(((F.get(d, 'dv', 0) & 1) << 3) | ((F.get(d, 'dv', 1) & 1) << 2) | ((F.get(d, 'dv', 2) & 1) << 1) | (F.get(d, 'dv', 3) & 1)) }));
      else dc.appendChild(num(F.get(d, 'dv', s - 1), 0, 15, function (v) { F.set(d, 'dv', v, s - 1); gbRefresh(d); changed(); }));
      rDv.appendChild(dc);
      rSt.appendChild(el('td', { text: String(r.stats[s]) }));
    })(s);
    tbl.appendChild(rEv); tbl.appendChild(rDv); tbl.appendChild(rSt); box.appendChild(tbl);
    var ot = el('input', { type: 'text', class: 'sv-txt', maxlength: 7 }); ot.value = F.get(d, 'ot'); ot.onchange = function () { F.set(d, 'ot', ot.value.toUpperCase()); };
    var row3 = el('div', { class: 'sv-row' });
    row3.appendChild(field(L.ot, ot));
    row3.appendChild(field('TID', num(F.get(d, 'tid'), 0, 65535, function (v) { F.set(d, 'tid', v); }), 'sm'));
    box.appendChild(row3);
    var bar = el('div', { class: 'sv-bar' });
    var ap = el('button', { class: 'primary-btn', text: L.apply }); ap.onclick = apply; bar.appendChild(ap);
    var rm = el('button', { class: 'sv-del', text: L.remove }); rm.onclick = remove; bar.appendChild(rm);
    box.appendChild(bar);
    return box;
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
    var sp = F.get(d, 'species'), nat = sv.natOf(sp), g = pers(sp);
    // Art
    var natOpts = ''; for (var n = 1; n <= sv.maxSpecies; n++) natOpts += '<option value="' + n + '"' + (n === nat ? ' selected' : '') + '>#' + n + ' ' + esc(speciesName(n)) + '</option>';
    var selSp = select2(natOpts, function (v) {
      var old = pers(sp); F.set(d, 'species', sv.speciesFromNat(v));
      if (!F.get(d, 'nicknamed') && sv.gen >= 4) F.set(d, 'nick', speciesName(v));
      if (sv.gen === 3 && F.get(d, 'nick') === speciesName(nat).toUpperCase()) F.set(d, 'nick', speciesName(v).toUpperCase());
      if (sv.gen === 4) F.set(d, 'ability', pers(F.get(d, 'species'))[8 + (F.get(d, 'pid') & 1)] || 0);
      if (sv.gen >= 6) { F.set(d, 'ability', pers(F.get(d, 'species'))[8] || 0); F.set(d, 'abilityNum', 1); }
      if (party) refreshParty(d); changed();
    });
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
    var eg = el('input', { type: 'checkbox' }); eg.checked = !!F.get(d, 'egg'); eg.onchange = function () { F.set(d, 'egg', eg.checked ? 1 : 0); };
    var egl = el('label', { class: 'sv-check' }); egl.appendChild(eg); egl.appendChild(el('span', { text: L.egg })); row2.appendChild(egl);
    PN.main.appendChild(row2);
    // Fähigkeit
    if (sv.gen === 3) {
      var a1 = nm(T.abilities, g[8]), a2 = nm(T.abilities, g[9]), slot = F.get(d, 'abilitySlot');
      var ab = select2('<option value="0"' + (!slot ? ' selected' : '') + '>' + esc(a1) + '</option>' + (g[9] && g[9] !== g[8] ? '<option value="1"' + (slot ? ' selected' : '') + '>' + esc(a2) + '</option>' : ''), function (v) { F.set(d, 'abilitySlot', v); });
      PN.main.appendChild(field(L.ability, ab));
    } else PN.main.appendChild(field(L.ability, select2(opts(T.abilities, maxAbility(), F.get(d, 'ability')), function (v) { F.set(d, 'ability', v); })));
    // Attacken
    var mt = el('div', { class: 'sv-moves' });
    for (var m = 0; m < 4; m++) (function (m) {
      var r = el('div', { class: 'sv-mrow' });
      r.appendChild(select2(opts(T.moves, maxMove(), F.get(d, 'move', m), L.none), function (v) { F.set(d, 'move', v, m); if (v && !F.get(d, 'pp', m)) F.set(d, 'pp', 10, m); changed(); }));
      r.appendChild(num(F.get(d, 'pp', m), 0, 99, function (v) { F.set(d, 'pp', v, m); }));
      r.appendChild(num(sv.gen === 3 ? (F.get(d, 'ppups') >> (m * 2)) & 3 : F.get(d, 'ppups', m), 0, 3, function (v) {
        if (sv.gen === 3) F.set(d, 'ppups', (F.get(d, 'ppups') & ~(3 << (m * 2))) | (v << (m * 2))); else F.set(d, 'ppups', v, m);
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
      var e = el('td'); e.appendChild(num(F.get(d, 'ev', s), 0, 255, function (v) { F.set(d, 'ev', v, s); if (party) refreshParty(d); changed(); })); rEv.appendChild(e);
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
    if (F.get(d, 'ball') !== undefined && F.get(d, 'ball') !== null) row4.appendChild(field(X.ball, num(F.get(d, 'ball'), 0, 255, function (v) { F.set(d, 'ball', v); }), 'sm'));
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
      if (sv.gen >= 4) grow.appendChild(field(X.form, num(F.get(d, 'form'), 0, 31, function (v) { F.set(d, 'form', v); }), 'sm'));
      PN.ot.appendChild(grow);
      PN.ot.appendChild(el('h4', { class: 'sv-h4', text: X.contestT }));
      var row6 = el('div', { class: 'sv-row' });
      for (var cq = 0; cq < 6; cq++) (function (cq) { row6.appendChild(field(X.contest[cq], num(F.get(d, 'contest', cq), 0, 255, function (v) { F.set(d, 'contest', v, cq); }), 'sm')); })(cq);
      PN.ot.appendChild(row6);
    }
    // Bänder (Gen 4/5, Bit-Lage aus PKHeX)
    (function () {
      var rl = window.PKHEX && window.PKHEX.ribbons && window.PKHEX.ribbons['gen' + sv.gen];
      PN.rib = el('div', { class: 'sv-pane' });
      if (!rl || !rl.length) { PN.rib.appendChild(el('div', { class: 'hint', text: X.ribNone })); return; }
      var names = window.PKHEX.ribbons.names[de ? 'de' : 'en'] || {};
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
    var rm = el('button', { class: 'sv-del', text: X.del }); rm.onclick = remove; bar.appendChild(rm);
    var ex = el('button', { type: 'button', class: 'sv-mini', text: X.exp2 }); ex.onclick = exportMon; bar.appendChild(ex);
    var im = el('button', { type: 'button', class: 'sv-mini', text: X.imp }); im.onclick = function () { importMon(); }; bar.appendChild(im);
    box.appendChild(bar);
    return box;
  }
  function apply() {
    var sv = st.sv, s = st.sel, F = sv.fmt;
    if (s.kind === 'party') {
      var list = sv.getParty(); while (list.length <= s.slot) list.push(null);
      if (st.mon && s.slot > list.length) return;
      list[s.slot] = st.mon; sv.setParty(list);
    } else sv.setBoxMon(s.box, s.slot, st.mon);
    st.dirty = true; st.msg = L.ok; render();
  }
  function remove() {
    var sv = st.sv, s = st.sel;
    if (!window.confirm(L.delconfirm)) return;
    if (s.kind === 'party') { var list = sv.getParty(); list.splice(s.slot, 1); sv.setParty(list); }
    else sv.setBoxMon(s.box, s.slot, null);
    st.mon = null; st.sel = null; st.dirty = true; render();
  }

  // ---------- Slots: lesen, schreiben, ziehen ----------
  function getAt(loc) { return loc.kind === 'party' ? (st.sv.getParty()[loc.slot] || null) : st.sv.getBoxMon(loc.box, loc.slot); }
  function putAt(loc, d) {
    var sv = st.sv;
    if (loc.kind === 'party') {
      var list = sv.getParty();
      if (d) { var c = new Uint8Array(d); if (!sv.gb) refreshParty(c); if (loc.slot >= list.length) list.push(c); else list[loc.slot] = c; }
      else if (loc.slot < list.length) list.splice(loc.slot, 1);
      sv.setParty(list);
    } else sv.setBoxMon(loc.box, loc.slot, d ? new Uint8Array(d) : null);
  }
  function sameLoc(a, b) { return a && b && a.kind === b.kind && a.slot === b.slot && (a.kind === 'party' || a.box === b.box); }
  function dnd(btn, loc) {
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
      if (sameLoc(src, loc)) return;
      var a = getAt(src), b = getAt(loc);
      if (!a) return;
      if (e.ctrlKey) putAt(loc, a);
      else if (src.kind === 'party' && !b && st.sv.getParty().length <= 1) return;
      else { putAt(loc, a); putAt(src, b); }
      st.dirty = true; st.sel = loc; var m = getAt(loc); st.mon = m ? new Uint8Array(m) : null; render();
    };
  }
  function exportMon() {
    if (!st.mon) return;
    var F = st.sv.fmt, sp = st.sv.natOf(F.get(st.mon, 'species'));
    download(String(sp).padStart(3, '0') + ' ' + speciesName(sp) + '.pk' + st.sv.gen, new Uint8Array(st.mon));
  }
  function importMon(file) {
    if (!file) {
      var inp = el('input', { type: 'file', accept: '.pk1,.pk2,.pk3,.pk4,.pk5,.pk6,.pk7,.pkm', style: 'display:none' });
      inp.onchange = function () { if (inp.files[0]) importMon(inp.files[0]); };
      document.body.appendChild(inp); inp.click(); setTimeout(function () { inp.remove(); }, 60000); return;
    }
    var fr = new FileReader();
    fr.onload = function () {
      var sv = st.sv, party = st.sel && st.sel.kind === 'party';
      var tpl = sv.gb ? gbBlank(party) : blank(sv.speciesFromNat(1), party), src = new Uint8Array(fr.result);
      if (src.length < 32) { st.err = X.impBad; return render(); }
      var d = new Uint8Array(tpl.length); d.set(src.subarray(0, Math.min(src.length, d.length)));
      if (party && !sv.gb) refreshParty(d);
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
    st.dirty = true; st.sel = null; st.mon = null; render();
  }
  function clearBox() {
    if (!window.confirm(X.clearConfirm)) return;
    for (var i = 0; i < st.sv.slotsPerBox; i++) st.sv.setBoxMon(st.box, i, null);
    st.dirty = true; st.sel = null; st.mon = null; render();
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
  var BATCH = ['lv100', 'iv31', 'ev0', 'ev252', 'noitem', 'shiny', 'unshiny', 'heal'];
  function batchApply(scope, act) {
    var sv = st.sv, F = sv.fmt, n = 0;
    function edit(d, party) {
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
    list = list.filter(function (e) { return e.team.every(function (m) { return m.species <= sv.maxSpecies; }); });
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
    row.appendChild(field(L.money, num(t.money, 0, sv.gen >= 6 ? 9999999 : 999999, function (v) { t.money = v; save(); }), 'sm'));
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
    var inp = el('input', { type: 'file', style: 'display:none' });
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
        download(hasExt ? base + ' (edited).' + ext : st.name + ' (edited)', out); st.msg = L.saved; st.dirty = false; render();
      };
      body.appendChild(sb);
      if (st.msg) body.appendChild(el('div', { class: 'rd-ok', text: st.msg }));
      body.appendChild(el('p', { class: 'hint', text: X.hint }));
      var cols = el('div', { class: 'sv-cols' });
      var left = el('div', { class: 'sv-left' });
      var seg = el('div', { class: 'sv-tabs sv-seg' });
      [['mon', X.tabMon], ['trainer', X.tabTrainer]].concat(sv.hof ? [['hof', X.tabHof]] : [], sv.bag ? [['items', X.tabItems], ['dex', X.tabDex], ['events', X.tabEvents]] : []).forEach(function (t) { var tb = el('button', { type: 'button', class: 'sv-tab' + (st.pane === t[0] ? ' on' : ''), text: t[1] }); tb.onclick = function () { st.pane = t[0]; render(); }; seg.appendChild(tb); });
      if (!sv.bag && (st.pane === 'items' || st.pane === 'dex' || st.pane === 'events')) st.pane = 'mon';
      var wide = st.pane === 'items' || st.pane === 'dex' || st.pane === 'events' || st.pane === 'hof';
      left.appendChild(seg);
      if (st.pane === 'trainer') left.appendChild(trainerPanel());
      else if (st.pane === 'hof' && sv.hof) left.appendChild(hofPanel());
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
      var bg = el('div', { class: 'sv-grid sv-boxgrid' });
      for (var s = 0; s < sv.slotsPerBox; s++) (function (s) {
        var sb2 = slotBtn(sv.getBoxMon(st.box, s), st.sel && st.sel.kind === 'box' && st.sel.box === st.box && st.sel.slot === s, function () { select('box', st.box, s); });
        dnd(sb2, { kind: 'box', box: st.box, slot: s }); bg.appendChild(sb2);
      })(s);
      bt.appendChild(bg);
      var tools = el('div', { class: 'sv-row sv-tools' });
      [[X.sortSp, function () { sortBox('sp'); }], [X.sortLv, function () { sortBox('lv'); }], [X.maxBox, maxBoxIvs], [X.clearBox, clearBox]].forEach(function (c) { var tb = el('button', { type: 'button', class: 'sv-mini', text: c[0] }); tb.onclick = c[1]; tools.appendChild(tb); });
      bt.appendChild(tools);
      if (!sv.gb) {
        var brow = el('div', { class: 'sv-row sv-tools sv-batch' });
        var bs = select2(['box', 'boxes', 'party'].map(function (k) { return '<option value="' + k + '">' + esc(X['scope_' + k]) + '</option>'; }).join(''), function () {});
        var ba = select2(BATCH.map(function (k) { return '<option value="' + k + '">' + esc(X['act_' + k]) + '</option>'; }).join(''), function () {});
        var bgo = el('button', { type: 'button', class: 'sv-mini', text: X.batchRun }); bgo.onclick = function () { if (window.confirm(X.batchAsk)) batchApply(bs.value, ba.value); };
        brow.appendChild(bs); brow.appendChild(ba); brow.appendChild(bgo); bt.appendChild(brow);
      }
      right.appendChild(bt);
      var pt = el('div', { class: 'sv-sec' }); pt.appendChild(el('h3', { text: L.party }));
      var pg = el('div', { class: 'sv-grid sv-party' });
      partyList().forEach(function (d, i) {
        var pb = slotBtn(d, st.sel && st.sel.kind === 'party' && st.sel.slot === i, function () { select('party', 0, i); });
        dnd(pb, { kind: 'party', box: 0, slot: i }); pg.appendChild(pb);
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
})();

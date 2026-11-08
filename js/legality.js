// Legalitätsprüfung (Stufe 1) nach dem Vorbild von PKHeX (GPLv3): regelbasierte Prüfungen ohne Begegnungs-Datenbank.
// Geprüft werden Werte, Level, Fähigkeit, PID/Wesen/Geschlecht, Attacken (inkl. AP), Items, Ball, Sprache, Daten, Orte, Pokérus.
// Noch nicht enthalten: Begegnungen (Encounter-Matching), Lernlisten, Herkunfts-Erinnerungen, RNG-Prüfungen.
(function () {
  'use strict';
  var TXT = {
    de: {
      speciesBad: 'Ungültige Art für diese Generation', levelRange: 'Level außerhalb von 1–100', expMax: 'Erfahrung über dem Maximum von Level 100', levelMismatch: 'Team-Level passt nicht zur Erfahrung',
      metLevel: 'Fang-Level höher als das aktuelle Level', eggLevel: 'Ei mit Level über 1 (Erfahrung)', ivRange: 'IP über dem Maximum', evRange: 'EP über 255', ev252: 'EP über 252 in einem Wert', evTotal: 'EP-Summe über 510',
      abilitySlot: 'Zweite Fähigkeit gibt es bei dieser Art nicht', abilityBad: 'Fähigkeit passt nicht zur Art', abilityHidden: 'Versteckte Fähigkeit passt nicht zur Art', abilityNum: 'Fähigkeits-Nummer passt nicht zur Fähigkeit',
      natureMismatch: 'Wesen passt nicht zur PID', genderMismatch: 'Geschlecht passt nicht zur PID', genderless: 'Geschlechtslose Art hat ein Geschlecht',
      moveLearn: 'Attacke ist für diese Art bis zu dieser Generation nicht erlernbar (Event oder Manipulation?)',
      rng: 'PID und IP passen zu keiner bekannten Zufallsmethode (Event, Ei, Tausch-Hack oder Manipulation?)',
      wurmple: 'Entwicklung passt nicht zur PID (Wurmple-Regel)', unown: 'Form von Icognito passt nicht zur PID', abilityPid: 'Fähigkeit passt nicht zum Fähigkeits-Bit der PID', formBad: 'Ungültige Form für diese Art und Generation',
      eggEV: 'Ei mit Erfahrungspunkten (EP) oder Orden-Bändern',
      noEnc: 'Keine passende Begegnung gefunden (Fundort, Fang-Level und Art passen zu keinem Wildgebiet oder Geschenk dieses Spiels; Event?)', hatchLevel: 'Geschlüpftes Ei: Fang-Level muss 1 sein',
      noMove: 'Keine Attacke', moveRange: 'Ungültige Attacke für diese Generation', moveDup: 'Doppelte Attacke', moveGap: 'Leerer Attacken-Platz vor einer Attacke', ppOver: 'AP über dem Maximum', ppUps: 'AP-Ups über 3', ppEmpty: 'AP ohne Attacke',
      itemRange: 'Ungültiges Item', itemHeld: 'Item kann nicht gehalten werden', ballRange: 'Ungültiger Ball', ballNone: 'Kein Ball gesetzt',
      langBad: 'Ungültige Sprache für diese Generation', otEmpty: 'Name des Trainers leer', nickEmpty: 'Spitzname leer', pkrsBad: 'Ungültiger Pokérus-Zustand',
      dateBad: 'Ungültiges Datum', dateOrder: 'Ei-Datum liegt nach dem Fangdatum', dateFuture: 'Datum liegt in der Zukunft', locUnknown: 'Unbekannter Fundort', eggLocUnknown: 'Unbekannter Ei-Ort', eggMet: 'Ei hat einen Fundort', friendEgg: 'Ei mit hoher Freundschaft',
      contest: 'Wettbewerbswerte ohne Fell-Wert', sinnohRibbon: 'Widersprüchliche Bänder', sheen: 'Fell-Wert über 255'
    },
    en: {
      speciesBad: 'Invalid species for this generation', levelRange: 'Level outside 1–100', expMax: 'Experience above the level 100 maximum', levelMismatch: 'Party level does not match experience',
      metLevel: 'Met level higher than current level', eggLevel: 'Egg above level 1 (experience)', ivRange: 'IV above maximum', evRange: 'EV above 255', ev252: 'EV above 252 in one stat', evTotal: 'EV total above 510',
      abilitySlot: 'This species has no second ability', abilityBad: 'Ability does not fit the species', abilityHidden: 'Hidden ability does not fit the species', abilityNum: 'Ability number does not match the ability',
      natureMismatch: 'Nature does not match the PID', genderMismatch: 'Gender does not match the PID', genderless: 'Genderless species has a gender',
      moveLearn: 'Move cannot be learned by this species up to this generation (event or tampering?)',
      rng: 'PID and IVs match no known RNG method (event, egg, trade hack or tampering?)',
      wurmple: 'Evolution does not match the PID (Wurmple rule)', unown: 'Unown form does not match the PID', abilityPid: 'Ability does not match the PID ability bit', formBad: 'Invalid form for this species and generation',
      eggEV: 'Egg with effort values (EVs)',
      noEnc: 'No matching encounter found (met location, met level and species fit no wild area or gift of this game; event?)', hatchLevel: 'Hatched egg: met level must be 1',
      noMove: 'No move', moveRange: 'Invalid move for this generation', moveDup: 'Duplicate move', moveGap: 'Empty move slot before a move', ppOver: 'PP above maximum', ppUps: 'PP Ups above 3', ppEmpty: 'PP without a move',
      itemRange: 'Invalid item', itemHeld: 'Item cannot be held', ballRange: 'Invalid ball', ballNone: 'No ball set',
      langBad: 'Invalid language for this generation', otEmpty: 'Trainer name is empty', nickEmpty: 'Nickname is empty', pkrsBad: 'Invalid Pokérus state',
      dateBad: 'Invalid date', dateOrder: 'Egg date is after the met date', dateFuture: 'Date is in the future', locUnknown: 'Unknown met location', eggLocUnknown: 'Unknown egg location', eggMet: 'Egg has a met location', friendEgg: 'Egg with high friendship',
      contest: 'Contest stats without sheen', sinnohRibbon: 'Contradicting ribbons', sheen: 'Sheen above 255'
    }
  };
  var BALL_MAX = { 3: 12, 4: 24, 5: 25, 6: 25, 7: 26 };
  var LANG_OK = { 3: [1, 2, 3, 4, 5, 7], 4: [1, 2, 3, 4, 5, 7, 8], 5: [1, 2, 3, 4, 5, 7, 8], 6: [1, 2, 3, 4, 5, 7, 8, 9, 10], 7: [1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 12] };
  var HELD_CACHE = {};

  function heldItems(game) {
    if (HELD_CACHE[game]) return HELD_CACHE[game];
    var X = window.PKHEX, out = {}, bag = X && X.bags && X.bags[game];
    if (bag) bag.pouches.forEach(function (p) { if (p.k === 'KeyItems') return; p.ids.forEach(function (id) { out[id] = 1; }); });
    return (HELD_CACHE[game] = out);
  }

  // Formen-Anzahl (Gen 4/5); nicht gelistete Arten haben nur Form 0
  var FORMS = { 201: 28, 351: 4, 386: 4, 412: 3, 413: 3, 421: 2, 422: 2, 423: 2, 172: 3, 479: 6, 487: 2, 492: 2, 493: 18,
    550: 2, 555: 2, 585: 4, 586: 4, 641: 2, 642: 2, 645: 2, 646: 3, 647: 2, 648: 2, 649: 5 };
  // PID/IP-Methoden 1, 2 und 4 (Gen 3; die Gen-4-Spielmethoden J/K folgen demselben Muster): Der Startwert ist rückwärts über die untere PID-Hälfte durchsuchbar.
  function nextRng(s) { return (Math.imul(s, 0x41C64E6D) + 0x6073) >>> 0; }
  function rngMatch(pid, w1, w2) {
    var lowPart = pid & 0xFFFF, high = pid >>> 16;
    for (var lo = 0; lo < 65536; lo++) {
      var r1 = (((lowPart << 16) | lo) >>> 0), r2 = nextRng(r1);
      if ((r2 >>> 16) !== high) continue;
      var r3 = nextRng(r2), r4 = nextRng(r3), r5 = nextRng(r4);
      if ((((r3 >>> 16) & 0x7FFF) === w1 && ((r4 >>> 16) & 0x7FFF) === w2) ||   // Methode 1
          (((r4 >>> 16) & 0x7FFF) === w1 && ((r5 >>> 16) & 0x7FFF) === w2) ||   // Methode 2
          (((r3 >>> 16) & 0x7FFF) === w1 && ((r5 >>> 16) & 0x7FFF) === w2)) return true; // Methode 4
    }
    return false;
  }
  function u16(d, o) { return d[o] | (d[o + 1] << 8); }
  function learnable(flat, mv, gen) {
    var lim = (1 << gen) - 1; // erlernbar in dieser oder einer früheren Generation
    for (var i = 0; i < flat.length; i += 2) if (flat[i] === mv) return !!(flat[i + 1] & lim);
    return false;
  }
  // env: { P: Personaldaten, S: CCSave (levelFor/expFor), de: Sprache }
  function check(sv, d, env) {
    var F = sv.fmt, P = env.P, S = env.S, T = TXT[env.de ? 'de' : 'en'], out = [], gen = sv.gen, i;
    function bad(c) { out.push({ sev: 'bad', msg: T[c] }); }
    function warn(c) { out.push({ sev: 'warn', msg: T[c] }); }
    if (!d) return out;
    var sp = F.get(d, 'species'), nat = sv.natOf(sp), pt = (P['g' + gen] || [])[nat] || null, egg = !!F.get(d, 'egg'), gb = !!sv.gb;
    if (!sp || nat < 1 || nat > sv.maxSpecies) { bad('speciesBad'); return out; }
    if (gb) return out.concat(moves());
    var growth = pt ? pt[6] : 0, exp = F.get(d, 'exp'), lv = S.levelFor(growth, exp);
    // ---- Level / Erfahrung
    if (lv < 1 || lv > 100) bad('levelRange');
    if (exp > S.expFor(growth, 100)) bad('expMax');
    var lvField = F.get(d, 'level');
    if (!gb && lvField && lvField !== lv) warn('levelMismatch');
    var ml = F.get(d, 'metLevel');
    if (!gb && gen >= 3 && ml && ml > lv) bad('metLevel');
    if (egg && lv > 1 && !gb) warn('eggLevel');
    // ---- IP / EP
    var ivMax = gb ? 15 : 31, evSum = 0;
    for (i = 0; i < (gb ? 4 : 6); i++) { if (F.get(d, 'iv', i) > ivMax) { bad('ivRange'); break; } }
    if (!gb) {
      var over = false, over252 = false;
      for (i = 0; i < 6; i++) { var e = F.get(d, 'ev', i); evSum += e; if (e > 255) over = true; else if (e > 252) over252 = true; }
      if (over) bad('evRange'); else if (over252) (gen >= 6 ? bad : warn)('ev252');
      if (evSum > 510) bad('evTotal');
      if (egg && evSum > 0) bad('eggEV');
    }
    // ---- Fähigkeit
    if (pt) {
      var a1 = pt[8] || 0, a2 = pt[9] || 0, a3 = pt[10] || 0, hasForm = (F.get(d, 'form') || 0) > 0;
      var ab = F.get(d, 'ability'), flag = hasForm ? warn : bad;
      if (gen === 3) { if (F.get(d, 'abilitySlot') && (!a2 || a2 === a1)) flag('abilitySlot'); }
      else if (gen === 4) { if (ab !== a1 && ab !== a2) flag('abilityBad'); }
      else {
        var hid = gen === 5 ? F.get(d, 'hiddenAbility') : (F.get(d, 'abilityNum') === 4 ? 1 : 0);
        if (hid) { if (!a3 || ab !== a3) flag('abilityHidden'); }
        else if (ab !== a1 && ab !== a2 && !(a3 && ab === a3)) flag('abilityBad');
        if (gen >= 6) { var an = F.get(d, 'abilityNum'); if ((an === 1 && ab !== a1) || (an === 2 && ab !== a2) || (an === 4 && ab !== a3)) { if (!hasForm) warn('abilityNum'); } }
      }
    }
    // ---- PID: Wesen und Geschlecht (Gen 3-5)
    if (gen <= 5 && pt) {
      var pid = F.get(d, 'pid');
      if (gen === 5 && F.get(d, 'nature') !== undefined && F.get(d, 'nature') !== pid % 25 && F.get(d, 'nature') < 25) bad('natureMismatch');
      var ratio = pt[7], gnd = F.get(d, 'gender');
      if (gen >= 4) {
        var want = ratio === 255 ? 2 : ratio === 254 ? 1 : ratio === 0 ? 0 : ((pid & 0xFF) < ratio ? 1 : 0);
        if (ratio === 255 && gnd !== 2) bad('genderless'); else if (ratio !== 255 && gnd !== want && gnd !== undefined) bad('genderMismatch');
      }
    }
    // ---- PID-abhängige Regeln
    if (gen <= 5) {
      var pidx = F.get(d, 'pid'), ecv = pidx, wv = (ecv >>> 16) % 10;
      if (nat === 266 || nat === 267) { if (wv >= 5) bad('wurmple'); }
      else if (nat === 268 || nat === 269) { if (wv < 5) bad('wurmple'); }
      if (nat === 201 && gen === 4) {
        var uf = (((pidx & 0x3000000) >>> 18) | ((pidx & 0x30000) >>> 12) | ((pidx & 0x300) >>> 6) | (pidx & 3)) % 28;
        if ((F.get(d, 'form') || 0) !== uf) bad('unown');
      }
      if (gen >= 4) {
        var fm = F.get(d, 'form') || 0;
        if (fm > 0 && (FORMS[nat] || 1) <= fm) bad('formBad');
      }
      if (gen === 5 && pt && !(d[64] & 1) && !F.get(d, 'hiddenAbility')) {
        var b1 = pt[8] || 0, b2 = pt[9] || 0, abx = F.get(d, 'ability');
        if (b1 && b2 && b1 !== b2 && (abx === b1 || abx === b2) && (((pidx >>> 16) & 1) !== (abx === b2 ? 1 : 0))) warn('abilityPid');
      }
    }
    // ---- Zufallsmethode (Gen 3/4)
    if ((gen === 3 || gen === 4) && !egg) {
      var skipRng = false, hatched = gen === 4 ? F.get(d, 'eggLoc') !== 0 : [253, 254, 255].indexOf(F.get(d, 'metLoc')) >= 0;
      if (hatched) skipRng = true;
      if (!skipRng) {
        var pidv = F.get(d, 'pid'), w1 = 0, w2 = 0;
        for (i = 0; i < 3; i++) { w1 |= F.get(d, 'iv', i) << (5 * i); w2 |= F.get(d, 'iv', 3 + i) << (5 * i); }
        if (!rngMatch(pidv, w1, w2)) warn('rng');
      }
    }
    // ---- Begegnung (Wildgebiete und feste Begegnungen des Ursprungsspiels)
    if (!gb && gen >= 3 && !egg && window.PKENC) encounterCheck();
    // ---- Ball, Sprache, Namen
    if (F.get(d, 'ball') === 0 && gen >= 4 && !egg) warn('ballNone');
    if (F.get(d, 'ball') > (BALL_MAX[gen] || 255)) bad('ballRange');
    if (F.extras && LANG_OK[gen] && LANG_OK[gen].indexOf(F.get(d, 'lang')) < 0 && F.get(d, 'lang') !== 0) warn('langBad');
    if (!F.get(d, 'ot')) bad('otEmpty');
    if (gen >= 4 && !egg && !F.get(d, 'nick')) warn('nickEmpty');
    // ---- Item
    var it = F.get(d, 'item');
    if (it > sv.maxItem) bad('itemRange');
    else if (it) { var gm = sv.game; if (gen >= 6) gm = String(gm).toUpperCase(); var held = heldItems(gm); if (Object.keys(held).length && !held[it]) warn('itemHeld'); }
    // ---- Pokérus
    if (F.extras) {
      var pk = F.get(d, 'pokerus'), strain = pk >> 4, days = pk & 15;
      if (pk && ((!strain && days) || (strain && days > (strain % 4) + 1))) bad('pkrsBad');
    }
    // ---- Orte / Daten
    if (F.extras && gen >= 4) {
      var X = window.PKHEX, loc = X && X.locations && X.locations['gen' + gen], ml2 = F.get(d, 'metLoc'), el2 = F.get(d, 'eggLoc');
      if (loc && ml2 && !loc.en[ml2]) warn('locUnknown');
      if (loc && el2 && !loc.en[el2]) warn('eggLocUnknown');
      if (egg && ml2 && gen === 4 && ml2 !== 0) warn('eggMet');
      var my = F.get(d, 'metYear'), mm = F.get(d, 'metMonth'), md = F.get(d, 'metDay'), ey = F.get(d, 'eggYear'), em = F.get(d, 'eggMonth'), ed = F.get(d, 'eggDay');
      function dateOk(y, m, dd) { if (!y && !m && !dd) return true; if (m < 1 || m > 12 || dd < 1) return false; return dd <= new Date(2000 + y, m, 0).getDate(); }
      if (!dateOk(my, mm, md) || !dateOk(ey, em, ed)) bad('dateBad');
      else if ((ey || em || ed) && (my || mm || md) && ((ey * 372 + em * 31 + ed) > (my * 372 + mm * 31 + md))) bad('dateOrder');
      var now = new Date(); if (my && (2000 + my) * 372 + mm * 31 + md > now.getFullYear() * 372 + (now.getMonth() + 1) * 31 + now.getDate()) warn('dateFuture');
    }
    // ---- Wettbewerbswerte
    if (F.extras && gen <= 4) {
      var cs = 0, sheen = F.get(d, 'contest', 5);
      for (i = 0; i < 5; i++) cs += F.get(d, 'contest', i);
      if (cs && !sheen) warn('contest');
    }
    return out.concat(moves());

    function encounterCheck() {
      var E = window.PKENC, ver, ml = F.get(d, 'metLevel'), loc = F.get(d, 'metLoc'), el = gen >= 4 ? F.get(d, 'eggLoc') : 0, fateful;
      if (gen === 3) { ver = (u16(d, 70) >> 7) & 15; fateful = d[79] >> 7; }
      else if (gen <= 5) { ver = d[0x5F]; fateful = d[0x40] & 1; }
      else { ver = d[0xDF]; fateful = d[0x1D] & 1; }
      var og = ver >= 1 && ver <= 5 ? 3 : (ver === 7 || ver === 8 || (ver >= 10 && ver <= 12)) ? 4 : (ver >= 20 && ver <= 23) ? 5 : (ver >= 24 && ver <= 27) ? 6 : (ver >= 30 && ver <= 33) ? 7 : 0;
      if (og !== gen || fateful) return; // Übertragene Pokémon, Colosseum/XD und Event-Pokémon lassen sich ohne Eventdatenbank nicht prüfen
      if (el) { if (ml !== 1) warn('hatchLevel'); return; }
      if (gen === 5 && loc === 30015) return; // Traumwelt
      var fam = [nat].concat(E.anc[nat] || []), w = E.wild[ver] && E.wild[ver][loc], i, j;
      if (w) for (i = 0; i < w.length; i += 3) if (fam.indexOf(w[i]) >= 0 && ml >= w[i + 1] && ml <= w[i + 2]) return;
      var st = E.stat[ver] || [];
      for (i = 0; i < st.length; i++) {
        var e = st[i];
        if (fam.indexOf(e[0]) < 0 || ml < e[2] || ml > e[3]) continue;
        if (e[1] === loc || (e[5] & 1)) return;
      }
      if (gen === 3 && ml === 5) return; // möglicherweise geschlüpftes Ei (Gen 3 speichert den Schlüpfort nicht)
      warn('noEnc');
    }

    function moves() {
      var o = [], learnTab = window.PKLEARN, formed = !gb && (F.get(d, 'form') || 0) > 0, X = window.PKHEX, ppTab = X && X.pp && X.pp['gen' + gen], seen = {}, n = 0, gap = false, emptySeen = false;
      function b(c) { o.push({ sev: 'bad', msg: T[c] }); }
      for (var m = 0; m < 4; m++) {
        var mv = F.get(d, 'move', m), pp = F.get(d, 'pp', m), ups = F.get(d, 'ppups', m);
        if (gen === 3) ups = (F.get(d, 'ppups') >> (m * 2)) & 3;
        if (!mv) { emptySeen = true; if (pp) o.push({ sev: 'warn', msg: T.ppEmpty }); continue; }
        if (emptySeen) gap = true;
        n++;
        if (mv > sv.maxMove) { b('moveRange'); continue; }
        if (seen[mv]) b('moveDup');
        if (learnTab && !formed && mv !== 165 && !(learnTab[nat] && learnable(learnTab[nat], mv, gen))) o.push({ sev: 'warn', msg: T.moveLearn });
        seen[mv] = 1;
        if (ups > 3) b('ppUps');
        if (ppTab && ppTab[mv] && pp > Math.floor(ppTab[mv] * (5 + Math.min(3, ups)) / 5)) b('ppOver');
      }
      if (!n && !egg) b('noMove');
      if (gap) b('moveGap');
      return o;
    }
  }

  window.CCLegal = { check: check, version: 2 };
})();

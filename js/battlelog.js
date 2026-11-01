// Kampfprotokoll: schreibt einen Kampf mit, während die Spielaufzeichnung läuft.
// Dieselbe Quelle wie der Shiny-Zähler (js/capture.js): Bildschirm/Fenster oder Kamera/Capture-Karte.
// Die Windows-Texterkennung liest das Kampftextfeld; KP-Leisten werden nur als Farbanteil geschätzt.
// Was ein festes Muster trifft (Attacke, Wechsel, K.O., „Runde N“, Sieg) gilt als zuverlässig,
// KP-Leiste, geratene Runde und unscharf gelesene Namen als Schätzung.
(function () {
  'use strict';
  var A = window.CC;
  if (!A) return;
  var Cap = window.CCCapture;
  var el = A.el, de = A.LANG === 'de';

  var S = de ? {
    title: 'Kampfprotokoll', sub: 'Schreibt den Kampf mit, während du spielst. Nutzt dieselbe Spielaufzeichnung wie der Shiny-Zähler.',
    alpha: 'Frühe Testversion. Attacken, Wechsel, K.O. und der Sieg stehen fest, sobald die Texterkennung die Zeile richtig liest. KP-Leisten und Runden ohne „Runde“ oder „Turn“ sind Schätzungen.',
    new: 'Neuer Kampf', demo: 'Beispielkampf', live: 'läuft', done: 'beendet', empty: 'Noch kein Kampf. Leg einen neuen an oder spiele das Beispiel ab.',
    you: 'Du', foe: 'Gegner', youName: 'Dein Name', foeName: 'Name des Gegners', namesHint: 'Hilft, „Ash schickt …“ der richtigen Seite zuzuordnen. Leer lassen geht auch.',
    format: 'Modus', singles: 'Einzel', doubles: 'Doppel',
    capture: 'Spielaufzeichnung', screen: 'Bildschirm / Fenster', camera: 'Kamera / Capture-Karte', cameraN: 'Kamera {0}',
    reconnect: 'Verbinden: {0}', disconnect: 'Quelle trennen', noSource: 'keine Quelle',
    regionText: 'Textfeld', regionYou: 'Deine KP-Leiste', regionFoe: 'Gegner-KP-Leiste',
    regionHint: 'Rahmen wählen und im Bild aufziehen. Zuerst das Kampftextfeld, die KP-Leisten nur wenn du sie komplett siehst, inklusive des leeren Teils.',
    start: 'Mitschneiden', stop: 'Mitschneiden stoppen', end: 'Kampf beenden', resume: 'Wieder aufnehmen',
    read: 'Gelesen: {0}', readNone: '(kein Text)', reading: 'Lese …', ocrErr: 'Texterkennung: {0}',
    noOcr: 'Texterkennung gibt es nur in der Windows-App. KP-Leisten gehen auch hier, Zeilen kannst du unten nachtragen.',
    manual: 'Zeile nachtragen', manualPh: 'z. B. Pikachu setzt Donnerblitz ein!', addLine: 'Übernehmen',
    save: 'Speichern', exportJson: 'JSON', exportText: 'Text', del: 'Löschen', delConfirm: 'Dieses Protokoll löschen?',
    saved: 'Protokoll gespeichert', calc: 'Im Rechner', calcTip: 'Diese Attacke im Damage Calculator öffnen (Arten und Werte sind die Standards, nicht das echte Set).',
    turnN: 'Runde {0}', turnGuess: 'Runde ~{0}', started: 'Kampf beginnt', ended: 'Kampf beendet',
    winnerYou: 'Du gewinnst', winnerFoe: 'Gegner gewinnt', winnerNone: 'Kein Sieger erkannt', inferred: 'geschätzt', unclear: 'unklar',
    hpEst: 'KP-Leiste {0} ≈ {1} %', party: 'Gesehen', noParty: 'noch niemand', fainted: 'besiegt',
    events: 'Verlauf', noEvents: 'Noch keine Zeile. Markiere das Textfeld und starte das Mitschneiden, trage eine Zeile ein oder spiele das Beispiel ab.',
    errSource: 'Die Quelle konnte nicht geöffnet werden: {0}', needRegion: 'Zieh zuerst einen Rahmen um das Textfeld oder eine KP-Leiste.',
    vs: '{0} gegen {1}', when: '{0} · {1} Zeilen', listYou: 'Du', listFoe: 'Gegner',
    kind_start: 'Beginn', kind_turn: 'Runde', kind_send: 'Eingewechselt', kind_switch: 'Wechsel', kind_move: 'Attacke',
    kind_effect: 'Wirkung', kind_crit: 'Volltreffer', kind_miss: 'Daneben', kind_status: 'Status', kind_damage: 'Schaden',
    kind_heal: 'Heilung', kind_hp: 'KP-Leiste', kind_faint: 'K.O.', kind_win: 'Sieg', kind_end: 'Ende', kind_note: 'Zeile', kind_field: 'Feld',
    limits: 'Zuverlässig, wenn die Zeile ein bekanntes Muster trifft und Name sowie Attacke exakt in den Daten stehen: Kampfbeginn, Runde (Zahl oder Befehl „Was soll … tun?“), Einwechseln, Wechsel nach „komm zurück“, Attacke, Wirksamkeit, Volltreffer, Daneben, K.O., Schaden in Prozent, Sieg. Schätzung: KP-Leiste (Farbanteil, nicht die echten KP), Runde ohne Ansage (nach je zwei Aktionen im Einzel), unscharf gelesene Namen, unklare Zeilen, Sieger nur daraus, dass eine Seite keine bekannten Pokémon mehr hat.',
    demoDone: 'Beispielkampf abgespielt', openCalc: 'Im Damage Calculator geöffnet', unknownCalc: 'Dafür müssen beide Pokémon und die Attacke erkannt sein.',
    super: 'sehr effektiv', weak: 'nicht sehr effektiv', immune: 'keine Wirkung',
    exportTitle: 'Kampfprotokoll', copy: 'Der Text liegt in der Datei und hier zum Kopieren.'
  } : {
    title: 'Battle log', sub: 'Records the battle while you play. Uses the same game recording as the shiny counter.',
    alpha: 'Early test version. Moves, switches, KOs and the win are fixed once text recognition reads the line. HP bars and turns without a "Turn" or "Runde" line are estimates.',
    new: 'New battle', demo: 'Sample battle', live: 'live', done: 'ended', empty: 'No battle yet. Start a new one or play the sample.',
    you: 'You', foe: 'Foe', youName: 'Your name', foeName: 'Opponent name', namesHint: 'Helps to put "Ash sent out …" on the right side. Leaving this empty is fine.',
    format: 'Format', singles: 'Singles', doubles: 'Doubles',
    capture: 'Game recording', screen: 'Screen / window', camera: 'Camera / capture card', cameraN: 'Camera {0}',
    reconnect: 'Connect: {0}', disconnect: 'Disconnect source', noSource: 'no source',
    regionText: 'Text box', regionYou: 'Your HP bar', regionFoe: 'Foe HP bar',
    regionHint: 'Pick a frame and drag it in the picture. The battle text first; HP bars only if the whole bar is visible, including the empty part.',
    start: 'Record', stop: 'Stop recording', end: 'End battle', resume: 'Record again',
    read: 'Read: {0}', readNone: '(no text)', reading: 'Reading …', ocrErr: 'Text recognition: {0}',
    noOcr: 'Text recognition is only in the Windows app. HP bars work here too, and you can add a line below.',
    manual: 'Add a line', manualPh: 'e.g. Pikachu used Thunderbolt!', addLine: 'Add',
    save: 'Save', exportJson: 'JSON', exportText: 'Text', del: 'Delete', delConfirm: 'Delete this log?',
    saved: 'Log saved', calc: 'Open in calc', calcTip: 'Open this move in the damage calculator (species and stats are the defaults, not the real set).',
    turnN: 'Turn {0}', turnGuess: 'Turn ~{0}', started: 'Battle started', ended: 'Battle ended',
    winnerYou: 'You win', winnerFoe: 'Foe wins', winnerNone: 'No winner detected', inferred: 'estimated', unclear: 'unclear',
    hpEst: 'HP bar {0} ≈ {1}%', party: 'Seen', noParty: 'nobody yet', fainted: 'fainted',
    events: 'Log', noEvents: 'No line yet. Mark the text box and start recording, add a line, or play the sample.',
    errSource: 'The source could not be opened: {0}', needRegion: 'Drag a frame around the text box or an HP bar first.',
    vs: '{0} vs {1}', when: '{0} · {1} lines', listYou: 'You', listFoe: 'Foe',
    kind_start: 'Start', kind_turn: 'Turn', kind_send: 'Sent out', kind_switch: 'Switch', kind_move: 'Move',
    kind_effect: 'Effect', kind_crit: 'Critical hit', kind_miss: 'Miss', kind_status: 'Status', kind_damage: 'Damage',
    kind_heal: 'Heal', kind_hp: 'HP bar', kind_faint: 'KO', kind_win: 'Win', kind_end: 'End', kind_note: 'Line', kind_field: 'Field',
    limits: 'Reliable when the line matches a known pattern and the name and move are in the data exactly: battle start, turn (a number, or the "What will … do?" prompt), send-out, switch after "come back", move, effectiveness, critical hit, miss, KO, percent damage, win. Estimate: HP bar (share of colour, not the real HP), a turn with no announcement (after every two actions in singles), fuzzy names, unclear lines, a winner guessed only because one side has no known Pokémon left.',
    demoDone: 'Sample battle finished', openCalc: 'Opened in the damage calculator', unknownCalc: 'Both Pokémon and the move have to be recognized for that.',
    super: 'super effective', weak: 'not very effective', immune: 'no effect',
    exportTitle: 'Battle log', copy: 'The text is in the file and here to copy.'
  };
  function t(k) { var s = S[k] != null ? S[k] : k; for (var i = 1; i < arguments.length; i++) s = s.split('{' + (i - 1) + '}').join(arguments[i]); return s; }

  function nid(s) {
    return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ß/g, 'ss').replace(/[^a-z0-9]/g, '');
  }
  function lev(a, b) {
    if (Cap && Cap.lev) return Cap.lev(a, b);
    var m = a.length, n = b.length, prev = [], cur, i, j;
    for (j = 0; j <= n; j++) prev[j] = j;
    for (i = 1; i <= m; i++) {
      cur = [i];
      for (j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1));
      prev = cur;
    }
    return prev[n];
  }

  // ---------------- name tables (English data + German names) ----------------
  // Champions-Dex plus Nationaldex (data/natdex.js) and the full move list: a recorded battle is not limited to the calc's roster.
  function buildIndex() {
    var species = {}, moves = {}, bySp = {}, byMv = {};
    function addSp(en, deName) {
      if (!en) return;
      var k = nid(en);
      species[k] = en; bySp[k] = en;
      if (deName) species[nid(deName)] = en;
    }
    var nat = window.NATDEX;
    if (nat) { for (var i = 1; i < nat.length; i++) if (nat[i]) addSp(nat[i][1], nat[i][2]); }
    Object.keys(A.DEX || {}).forEach(function (name) { addSp(name, null); });
    var MV = window.MOVES_SV || window.MOVES_CHAMPIONS_NATDEX || A.MOVES || {};
    Object.keys(MV).forEach(function (name) {
      if (!name || name === '(No Move)') return;
      var k = nid(name); moves[k] = name; byMv[k] = name;
    });
    Object.keys(A.MOVES || {}).forEach(function (name) {
      if (!name || name === '(No Move)') return;
      var k = nid(name); if (!moves[k]) { moves[k] = name; byMv[k] = name; }
    });
    var nd = window.NAMES_DE || {};
    Object.keys(nd.species || {}).forEach(function (k) { if (bySp[k]) species[nid(nd.species[k])] = bySp[k]; });
    Object.keys(nd.moves || {}).forEach(function (k) { if (byMv[k]) moves[nid(nd.moves[k])] = byMv[k]; });
    return { species: species, moves: moves };
  }
  var index = null;
  function idx() { if (!index) index = buildIndex(); return index; }
  function lookup(table, raw) {
    var key = nid(raw);
    if (!key) return null;
    if (table[key]) return { name: table[key], score: 1 };
    if (key.length < 4) return null;
    var best = null, bestSc = 0;
    for (var k in table) {
      if (Math.abs(k.length - key.length) > 2) continue;
      var sc = 1 - lev(k, key) / Math.max(k.length, key.length);
      if (sc > bestSc) { bestSc = sc; best = table[k]; }
    }
    var need = key.length >= 8 ? 0.8 : 0.86;
    return best && bestSc >= need ? { name: best, score: Math.round(bestSc * 1000) / 1000 } : null;
  }

  // ---------------- battle state ----------------
  function createBattle(opts) {
    opts = opts || {};
    return {
      id: 'bl' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      title: '', created: Date.now(), updated: Date.now(),
      youName: opts.youName || '', foeName: opts.foeName || '',
      format: opts.format === 'doubles' ? 'doubles' : 'singles',
      detected: { you: '', foe: '' },
      status: 'live', turn: 0, turnHow: '', turnStyle: null, actionsThisTurn: 0, engaged: false,
      started: false, ended: false, winner: null, winnerHow: null,
      party: { you: [], foe: [] }, active: { you: [null, null], foe: [null, null] },
      recall: { you: null, foe: null }, pendingRecall: null, events: []
    };
  }
  function namesEqual(a, b) { var x = nid(a), y = nid(b); return !!x && x === y; }
  function isYouName(b, name) {
    if (!name) return false;
    if (/^(you|du|player|spieler)$/i.test(String(name).trim())) return true;
    if (b.youName && namesEqual(b.youName, name)) return true;
    if (b.detected.you && namesEqual(b.detected.you, name)) return true;
    return false;
  }
  function isFoeName(b, name) {
    if (!name) return false;
    if (b.foeName && namesEqual(b.foeName, name)) return true;
    if (b.detected.foe && namesEqual(b.detected.foe, name)) return true;
    return false;
  }
  function monById(b, id) {
    if (!id) return null;
    var found = null;
    ['you', 'foe'].forEach(function (sd) { (b.party[sd] || []).forEach(function (m) { if (m.id === id) found = m; }); });
    return found;
  }
  function findMon(b, rawName, speciesHit, sideHint) {
    var hits = [];
    ['you', 'foe'].forEach(function (sd) {
      if (sideHint && sd !== sideHint) return;
      b.party[sd].forEach(function (m) {
        var nameOk = namesEqual(m.name, rawName);
        var spOk = !!(speciesHit && m.species === speciesHit.name && speciesHit.score === 1);
        var spFuzzy = !!(speciesHit && m.species === speciesHit.name);
        if (!nameOk && !spOk && !spFuzzy) return;
        var active = b.active[sd].indexOf(m) >= 0 && !m.fainted;
        hits.push({ mon: m, side: sd, exact: nameOk || spOk, rank: (nameOk ? 4 : 0) + (spOk ? 2 : spFuzzy ? 1 : 0) + (active ? 2 : 0) });
      });
    });
    var best = 0;
    hits.forEach(function (h) { if (h.rank > best) best = h.rank; });
    var top = hits.filter(function (h) { return h.rank === best; });
    var sides = {};
    top.forEach(function (h) { sides[h.side] = h; });
    var keys = Object.keys(sides);
    return keys.length === 1 ? sides[keys[0]] : null;
  }
  function ensureMon(b, side, rawName, speciesHit) {
    var species = speciesHit ? speciesHit.name : null;
    var found = findMon(b, rawName, speciesHit, side);
    if (found && found.side === side) {
      if (species && (speciesHit.score === 1 || !found.mon.species)) found.mon.species = species;
      return found.mon;
    }
    var mon = { id: side[0] + (b.party[side].length + 1) + nid(rawName).slice(0, 10), name: rawName, species: species, side: side, hp: 100, fainted: false };
    b.party[side].push(mon);
    return mon;
  }
  function setActive(b, side, mon) {
    var arr = b.active[side], slots = b.format === 'doubles' ? 2 : 1, idx = -1;
    var rec = b.recall[side] ? monById(b, b.recall[side]) : null;
    if (rec) { for (var i = 0; i < slots; i++) if (arr[i] && arr[i].id === rec.id) idx = i; }
    if (idx < 0) { for (var j = 0; j < slots; j++) if (!arr[j] || arr[j].fainted) { idx = j; break; } }
    if (idx < 0) idx = 0;
    var prev = arr[idx] && arr[idx] !== mon ? arr[idx] : null;
    arr[idx] = mon;
    if (slots === 1) arr[1] = null;
    b.recall[side] = null;
    return prev;
  }
  function living(b, side) {
    return b.active[side].filter(function (m) { return m && !m.fainted; });
  }
  function allFainted(b, side) {
    return b.party[side].length > 0 && b.party[side].every(function (m) { return m.fainted; });
  }
  function ensureStarted(b, out, line) {
    if (b.started) return;
    b.started = true; b.status = 'live';
    if (b.turn < 1) { b.turn = 1; b.turnHow = 'start'; }
    out.push({ kind: 'start', reliable: true, text: line || t('started'), raw: '' });
  }
  function noteAction(b, out) {
    if (b.turn < 1) { b.turn = 1; b.turnHow = 'start'; }
    if (!b.engaged) { b.engaged = true; b.actionsThisTurn = 0; }
    var exp = b.format === 'doubles' ? 4 : 2;
    if (b.turnStyle !== 'number' && b.actionsThisTurn >= exp) {
      b.turn += 1; b.actionsThisTurn = 0; b.turnHow = 'guess';
      out.push({ kind: 'turn', reliable: false, guess: true, text: t('turnGuess', b.turn), raw: '' });
    }
    b.actionsThisTurn += 1;
  }
  function tagLastMove(b, patch) {
    for (var i = b.events.length - 1; i >= 0 && i >= b.events.length - 5; i--) {
      if (b.events[i].kind === 'move') {
        Object.keys(patch).forEach(function (k) { b.events[i][k] = patch[k]; });
        return b.events[i];
      }
    }
    return null;
  }
  function commit(b, ev) {
    ev.id = b.events.length + 1;
    ev.t = Date.now();
    ev.turn = ev.turn || b.turn || 1;
    ev.turnHow = b.turnHow || '';
    if (ev.reliable == null) ev.reliable = false;
    b.events.push(ev);
    if (b.events.length > 800) {
      var drop = b.events.findIndex(function (e) { return e.kind === 'hp' || e.kind === 'note'; });
      if (drop >= 0) b.events.splice(drop, 1);
      else b.events.splice(0, b.events.length - 800);
    }
    b.updated = Date.now();
    return ev;
  }

  // ---------------- text → events ----------------
  function normLine(s) {
    return String(s || '').replace(/[’‘]/g, "'").replace(/[“”„«»]/g, '').replace(/\s+/g, ' ').trim();
  }
  function splitMessages(text) {
    var src = String(text || '').replace(/(\d)\.(\d)/g, '$1§$2');
    var out = [], cur = '';
    for (var i = 0; i < src.length; i++) {
      var c = src.charAt(i);
      if (c === '\n' || c === '\r') {
        if (normLine(cur)) out.push(normLine(cur.replace(/§/g, '.')));
        cur = '';
        continue;
      }
      cur += c;
      var nxt = src.charAt(i + 1) || '', nxt2 = src.charAt(i + 2) || '';
      var end = /[!?…]/.test(c) || (c === '.' && /\s/.test(nxt) && /[A-ZÄÖÜ]/.test(nxt2 === ' ' ? src.charAt(i + 3) || '' : nxt2));
      if (end) {
        var j = i + 1;
        while (src.charAt(j) === ' ') j++;
        if (normLine(cur)) out.push(normLine(cur.replace(/§/g, '.')));
        cur = '';
        i = j - 1;
      }
    }
    if (normLine(cur)) out.push(normLine(cur.replace(/§/g, '.')));
    return out;
  }
  function linesClose(a, b) {
    a = normLine(a).toLowerCase(); b = normLine(b).toLowerCase();
    if (a === b) return true;
    if (!a || !b || Math.abs(a.length - b.length) > 4) return false;
    return 1 - lev(a, b) / Math.max(a.length, b.length) >= 0.9;
  }
  // new lines only: a repeated text box (or one misread letter) adds nothing; a scrolled box adds the tail
  function diffLines(prev, next) {
    prev = prev || []; next = next || [];
    if (!prev.length) return next.slice();
    if (prev.length === next.length && prev.every(function (l, i) { return linesClose(l, next[i]); })) return [];
    var best = 0, n = Math.min(prev.length, next.length);
    for (var k = n; k >= 1; k--) {
      var ok = true;
      for (var i = 0; i < k; i++) if (!linesClose(prev[prev.length - k + i], next[i])) { ok = false; break; }
      if (ok) { best = k; break; }
    }
    return next.slice(best);
  }

  var FOE_PRE = ['the opposing ', "the foe's ", "foe's ", 'the wild ', 'wild ', 'foe ',
    'das gegnerische ', 'gegnerisches ', 'das wilde ', 'ein wildes ', 'wildes ', 'gegner '];
  function foeSplit(line) {
    var low = line.toLowerCase();
    for (var i = 0; i < FOE_PRE.length; i++) {
      if (low.indexOf(FOE_PRE[i]) === 0) return { foe: true, rest: line.slice(FOE_PRE[i].length) };
    }
    return { foe: false, rest: line };
  }
  function cleanName(s) { return String(s || '').replace(/[!.…]+$/g, '').trim(); }

  var FIELD = [
    [/sunlight turned harsh|the sunlight turned|harsh sunlight|sonnenlicht wird stärker|sonne scheint stark/i, 'Sun'],
    [/started to rain|it.?s raining|fängt an zu regnen|regnet/i, 'Rain'],
    [/sandstorm|sandsturm/i, 'Sand'],
    [/started to hail|started to snow|hagel|schneit/i, 'Snow'],
    [/electricity|electric terrain|elektrofeld/i, 'Electric Terrain'],
    [/grass grew|grassy terrain|grasfeld/i, 'Grassy Terrain'],
    [/mist swirled|misty terrain|nebelfeld/i, 'Misty Terrain'],
    [/psychic terrain|psychofeld/i, 'Psychic Terrain'],
    [/trick room|bizarroraum/i, 'Trick Room']
  ];

  function interpret(b, line) {
    var out = [], m;
    m = /^(?:turn|runde)\s+(\d+)\b/i.exec(line);
    if (m) {
      ensureStarted(b, out);
      b.turnStyle = 'number'; b.turn = +m[1]; b.turnHow = 'number'; b.actionsThisTurn = 0; b.engaged = true;
      out.push({ kind: 'turn', reliable: true, turn: b.turn, text: t('turnN', b.turn) });
      return out;
    }
    m = /^(?:what will (.+?) do|was soll (.+?) tun)\??$/i.exec(line);
    if (m) {
      if (b.turnStyle !== 'number' && b.engaged && b.actionsThisTurn > 0) {
        b.turn += 1; b.actionsThisTurn = 0; b.turnHow = 'prompt';
        out.push({ kind: 'turn', reliable: true, turn: b.turn, text: t('turnN', b.turn), raw: '' });
      }
      return out;
    }
    m = /^(.+?) wants to battle[!.…]*$/i.exec(line) || /^(.+?) (?:möchte kämpfen|fordert dich(?: zum kampf)? heraus)[!.…]*$/i.exec(line);
    if (m) {
      b.detected.foe = b.detected.foe || cleanName(m[1]);
      ensureStarted(b, out, line);
      return out;
    }
    m = /^(?:wild|ein wildes)\s+(.+?)\s+(?:appeared|erscheint)[!.…]*$/i.exec(line);
    if (m) {
      ensureStarted(b, out);
      var spW = lookup(idx().species, cleanName(m[1]));
      var monW = ensureMon(b, 'foe', cleanName(m[1]), spW);
      setActive(b, 'foe', monW);
      out.push({ kind: 'send', side: 'foe', species: monW.species, name: monW.name, reliable: !!(spW && spW.score === 1), lead: true });
      return out;
    }
    m = /^(?:go|los)[,! ]+(.+?)[!.…]*$/i.exec(line);
    if (m) {
      ensureStarted(b, out);
      cleanName(m[1]).split(/\s+(?:and|und)\s+/i).forEach(function (part) {
        var sp = lookup(idx().species, part);
        var mon = ensureMon(b, 'you', part, sp);
        var occupied = living(b, 'you').length;
        var slots = b.format === 'doubles' ? 2 : 1;
        var voluntary = !!b.recall.you;
        var implied = !voluntary && occupied >= slots && b.engaged;
        if ((voluntary || implied) && b.engaged) noteAction(b, out);
        var prev = setActive(b, 'you', mon);
        var exact = !sp || sp.score === 1;
        if (voluntary || implied) out.push({ kind: 'switch', side: 'you', species: mon.species, name: mon.name, fromName: prev && prev.name, fromSpecies: prev && prev.species, reliable: voluntary && exact, implied: implied });
        else out.push({ kind: 'send', side: 'you', species: mon.species, name: mon.name, reliable: exact, lead: !b.engaged });
      });
      return out;
    }
    m = /^(.+?) sent out (.+?)[!.…]*$/i.exec(line) || /^(.+?) schickt (.+?) (?:in den kampf|heraus)[!.…]*$/i.exec(line);
    if (m) {
      ensureStarted(b, out);
      var trainer = cleanName(m[1]), who = cleanName(m[2]);
      var side = isYouName(b, trainer) ? 'you' : 'foe';
      if (side === 'foe') b.detected.foe = b.detected.foe || trainer;
      else b.detected.you = b.detected.you || trainer;
      who.split(/\s+(?:and|und)\s+/i).forEach(function (part) {
        var sp = lookup(idx().species, part);
        var mon = ensureMon(b, side, part, sp);
        var occupied = living(b, side).length;
        var slots = b.format === 'doubles' ? 2 : 1;
        var voluntary = !!b.recall[side];
        var implied = !voluntary && occupied >= slots && b.engaged;
        if ((voluntary || implied) && b.engaged) noteAction(b, out);
        var prev = setActive(b, side, mon);
        var exact = !sp || sp.score === 1;
        if (voluntary || implied) out.push({ kind: 'switch', side: side, species: mon.species, name: mon.name, fromName: prev && prev.name, fromSpecies: prev && prev.species, reliable: voluntary && exact, implied: implied });
        else out.push({ kind: 'send', side: side, species: mon.species, name: mon.name, reliable: exact, lead: !b.engaged });
      });
      return out;
    }
    m = /^(.+?), (?:that'?s enough! |das reicht! |genug! )?come back[!.…]*$/i.exec(line)
      || /^(.+?), (?:that'?s enough! |das reicht! |genug! )?komm zurück[!.…]*$/i.exec(line)
      || /^(.+?) withdrew (.+?)[!.…]*$/i.exec(line);
    if (m) {
      var whoR, sideR;
      if (/withdrew/i.test(line)) {
        sideR = isYouName(b, m[1]) ? 'you' : isFoeName(b, m[1]) ? 'foe' : null;
        whoR = cleanName(m[2]);
        if (!sideR) sideR = 'foe';
      } else {
        whoR = cleanName(m[1]);
        var hitR = findMon(b, whoR, lookup(idx().species, whoR), null);
        sideR = hitR ? hitR.side : 'you';
      }
      var monR = findMon(b, whoR, lookup(idx().species, whoR), sideR);
      b.recall[sideR] = monR ? monR.mon.id : null;
      // the following send-out becomes the switch line; the recall itself is only kept if nothing comes in
      b.pendingRecall = { side: sideR, name: whoR, species: monR && monR.mon.species, raw: line };
      return out;
    }
    var fs = foeSplit(line);
    m = /^(.+?) used (.+?)[!.…]*$/i.exec(fs.rest) || /^(.+?) setzt (.+?) ein[!.…]*$/i.exec(fs.rest) || /^(.+?) greift mit (.+?) an[!.…]*$/i.exec(fs.rest);
    if (m) {
      ensureStarted(b, out);
      var actor = cleanName(m[1]), moveRaw = cleanName(m[2]);
      var spA = lookup(idx().species, actor);
      var mv = lookup(idx().moves, moveRaw);
      var found = findMon(b, actor, spA, fs.foe ? 'foe' : null);
      var side = fs.foe ? 'foe' : (found ? found.side : null);
      if (!fs.foe && !found && spA && spA.score === 1) {
        var only = [];
        ['you', 'foe'].forEach(function (sd) { if (b.party[sd].some(function (x) { return x.species === spA.name && !x.fainted; })) only.push(sd); });
        if (only.length === 1) side = only[0];
      }
      var mon = found && found.side === side ? found.mon : (side ? (living(b, side).filter(function (x) { return namesEqual(x.name, actor) || (spA && x.species === spA.name); })[0] || null) : null);
      if (b.engaged || b.started) noteAction(b, out);
      var defs = side ? living(b, side === 'you' ? 'foe' : 'you') : [];
      var def = defs.length === 1 ? defs[0] : null;
      var exact = !!(mv && mv.score === 1) && !!(side && ((found && found.exact) || (spA && spA.score === 1) || (mon && namesEqual(mon.name, actor))));
      out.push({
        kind: 'move', side: side, species: (mon && mon.species) || (spA && spA.name) || null, name: (mon && mon.name) || actor,
        move: mv ? mv.name : null, moveRaw: moveRaw, moveScore: mv ? mv.score : 0,
        defender: def ? def.name : null, defSpecies: def ? def.species : null,
        atkHp: mon && mon.hp != null ? mon.hp : null, defHp: def && def.hp != null ? def.hp : null,
        reliable: exact
      });
      return out;
    }
    if (/^it'?s super effective|^das ist sehr effektiv/i.test(line)) { tagLastMove(b, { effect: 'super' }); out.push({ kind: 'effect', effect: 'super', reliable: true, text: line }); return out; }
    if (/^it'?s not very effective|^das ist nicht sehr effektiv/i.test(line)) { tagLastMove(b, { effect: 'weak' }); out.push({ kind: 'effect', effect: 'weak', reliable: true, text: line }); return out; }
    if (/^it doesn'?t affect|^es hat keine wirkung|^hat keine wirkung/i.test(line)) { tagLastMove(b, { effect: 'immune' }); out.push({ kind: 'effect', effect: 'immune', reliable: true, text: line }); return out; }
    if (/^a critical hit|^volltreffer|^ein volltreffer/i.test(line)) { tagLastMove(b, { crit: true }); out.push({ kind: 'crit', reliable: true, text: line }); return out; }
    if (/attack missed|avoided the attack|protected itself|ging daneben|weicht aus|schützt sich|hat sich geschützt/i.test(line)) {
      tagLastMove(b, { miss: true }); out.push({ kind: 'miss', reliable: true, text: line }); return out;
    }
    m = /^(?:was |ist )?(burned|badly poisoned|poisoned|paralyzed|frozen|asleep)|wurde (verbrannt|vergiftet|paralysiert|eingefroren)|schlief ein|ist eingeschlafen/i.exec(line);
    if (m && /(burn|poison|paraly|frozen|asleep|verbrannt|vergiftet|paralys|eingefroren|eingeschlafen|schlief)/i.test(line)) {
      out.push({ kind: 'status', reliable: true, text: line }); return out;
    }
    fs = foeSplit(line);
    m = /^(.+?) lost (\d+(?:[.,]\d+)?)\s*% of its (?:health|hp)[!.…]*$/i.exec(fs.rest)
      || /^(.+?) verlor (\d+(?:[.,]\d+)?)\s*% (?:seiner|ihrer) (?:kp|punkte)[!.…]*$/i.exec(fs.rest);
    if (m) {
      var pct = parseFloat(String(m[2]).replace(',', '.'));
      var nm = cleanName(m[1]);
      var spD = lookup(idx().species, nm);
      var hit = findMon(b, nm, spD, fs.foe ? 'foe' : null);
      var sd = fs.foe ? 'foe' : (hit ? hit.side : null);
      var monD = sd ? (hit && hit.side === sd ? hit.mon : ensureMon(b, sd, nm, spD)) : null;
      if (monD) {
        var before = monD.hp == null ? 100 : monD.hp;
        monD.hp = Math.max(0, Math.min(100, Math.round(before - pct)));
        monD.hpBar = monD.hp;
        out.push({ kind: 'damage', side: sd, species: monD.species, name: monD.name, hp: monD.hp, delta: -pct, reliable: !fs.foe ? !!(hit && hit.exact) : !!(spD && spD.score === 1) });
      } else out.push({ kind: 'damage', reliable: false, text: line, delta: -pct });
      return out;
    }
    m = /^(.+?) restored (\d+(?:[.,]\d+)?)\s*%/i.exec(line);
    if (m) {
      var heal = parseFloat(String(m[2]).replace(',', '.'));
      var hn = cleanName(m[1].replace(/^the opposing |^the wild /i, ''));
      var hs = lookup(idx().species, hn);
      var hh = findMon(b, hn, hs, null);
      if (hh) {
        hh.mon.hp = Math.max(0, Math.min(100, Math.round((hh.mon.hp == null ? 100 : hh.mon.hp) + heal)));
        hh.mon.hpBar = hh.mon.hp;
        out.push({ kind: 'heal', side: hh.side, species: hh.mon.species, name: hh.mon.name, hp: hh.mon.hp, delta: heal, reliable: hh.exact });
      } else out.push({ kind: 'heal', reliable: false, text: line });
      return out;
    }
    fs = foeSplit(line);
    m = /^(.+?) fainted[!.…]*$/i.exec(fs.rest) || /^(.+?) (?:wurde besiegt|ist besiegt|wurde kampfunfähig)[!.…]*$/i.exec(fs.rest);
    if (m) {
      var fn = cleanName(m[1]);
      var fsp = lookup(idx().species, fn);
      var fh = findMon(b, fn, fsp, fs.foe ? 'foe' : null);
      var fside = fs.foe ? 'foe' : (fh ? fh.side : null);
      var fmon = fside ? (fh && fh.side === fside ? fh.mon : ensureMon(b, fside, fn, fsp)) : null;
      if (fmon) { fmon.fainted = true; fmon.hp = 0; fmon.hpBar = 0; }
      out.push({ kind: 'faint', side: fside, species: fmon && fmon.species, name: (fmon && fmon.name) || fn, reliable: !!(fside && ((fh && fh.exact) || (fsp && fsp.score === 1))) });
      return out;
    }
    if (/^you win|^du hast (?:den kampf )?gewonnen|^du gewinnst/i.test(line)) {
      ensureStarted(b, out); b.ended = true; b.status = 'done'; b.winner = 'you'; b.winnerHow = 'text';
      out.push({ kind: 'win', side: 'you', reliable: true, text: line }); return out;
    }
    if (/^you (?:lose|lost|blacked out|whited out)|^du (?:verlierst|hast verloren|wurdest besiegt)/i.test(line)) {
      ensureStarted(b, out); b.ended = true; b.status = 'done'; b.winner = 'foe'; b.winnerHow = 'text';
      out.push({ kind: 'win', side: 'foe', reliable: true, text: line }); return out;
    }
    m = /^you defeated (.+?)[!.…]*$/i.exec(line) || /^du (?:besiegst|besiegtest|hast) (.+?) besiegt[!.…]*$/i.exec(line);
    if (m) {
      ensureStarted(b, out); b.ended = true; b.status = 'done'; b.winner = 'you'; b.winnerHow = 'text';
      out.push({ kind: 'win', side: 'you', reliable: true, text: line }); return out;
    }
    m = /^(.+?) (?:won the battle|wins|hat gewonnen|gewinnt)[!.…]*$/i.exec(line);
    if (m) {
      ensureStarted(b, out);
      var wn = cleanName(m[1]), wside = isYouName(b, wn) ? 'you' : isFoeName(b, wn) ? 'foe' : null;
      b.ended = true; b.status = 'done'; b.winner = wside; b.winnerHow = 'text';
      out.push({ kind: 'win', side: wside, reliable: !!wside, text: line }); return out;
    }
    m = /^(.+?) defeated (.+?)[!.…]*$/i.exec(line);
    if (m) {
      ensureStarted(b, out);
      var ws = isFoeName(b, m[2]) || isYouName(b, m[1]) ? 'you' : isYouName(b, m[2]) || isFoeName(b, m[1]) ? 'foe' : null;
      b.ended = true; b.status = 'done'; b.winner = ws; b.winnerHow = 'text';
      out.push({ kind: 'win', side: ws, reliable: !!ws, text: line }); return out;
    }
    m = /^(.+?) (?:blacked out|whited out|hat keine pokémon mehr|is out of usable)/i.exec(line);
    if (m) {
      ensureStarted(b, out);
      var ls = isYouName(b, m[1]) ? 'foe' : isFoeName(b, m[1]) ? 'you' : null;
      b.ended = true; b.status = 'done'; b.winner = ls; b.winnerHow = 'text';
      out.push({ kind: 'win', side: ls, reliable: !!ls, text: line }); return out;
    }
    for (var fi = 0; fi < FIELD.length; fi++) {
      if (FIELD[fi][0].test(line)) { out.push({ kind: 'field', field: FIELD[fi][1], reliable: true, text: line }); return out; }
    }
    return null;
  }

  function feedLine(b, raw) {
    var line = normLine(raw);
    if (!line || !b) return [];
    var last = b.events[b.events.length - 1];
    if (last && last.raw === line && last.kind !== 'turn') return [];
    var recallBefore = b.pendingRecall;
    var evs = interpret(b, line);
    if (!evs) {
      if (line.replace(/[^a-zA-ZäöüÄÖÜß]/g, '').length < 4) evs = [];
      else evs = [{ kind: 'note', reliable: false, text: line }];
    }
    var setRecall = b.pendingRecall && b.pendingRecall !== recallBefore;
    if (!setRecall && b.pendingRecall) {
      var used = evs.some(function (e) { return e && (e.kind === 'switch' || e.kind === 'send'); });
      if (!used) {
        var p = b.pendingRecall;
        evs.unshift({ kind: 'switch', side: p.side, name: p.name, species: p.species, recall: true, reliable: true, text: p.raw, raw: p.raw });
      }
      b.pendingRecall = null;
    }
    if (!evs.length) return [];
    var made = [];
    evs.forEach(function (ev) {
      if (!ev || ev.kind === 'ignore') return;
      if (ev.raw == null) ev.raw = line;
      if (!ev.text) ev.text = ev.raw || line;
      made.push(commit(b, ev));
    });
    return made;
  }

  // pct is 0–100. The bar is a guess: first reading only anchors, later jumps of ≥ 5 points are logged.
  function feedHp(b, side, pct) {
    if (!b || b.ended || (side !== 'you' && side !== 'foe')) return null;
    var mons = living(b, side);
    var mon = mons[0];
    if (!mon) return null;
    pct = Math.max(0, Math.min(100, Math.round(pct)));
    if (mon.hpBar == null) {
      mon.hpBar = pct;
      if (pct <= 97) mon.hp = pct;
      return null;
    }
    if (Math.abs(pct - mon.hpBar) < 5) return null;
    var recent = null;
    for (var i = b.events.length - 1; i >= 0 && i >= b.events.length - 6; i--) {
      var e = b.events[i];
      if ((e.kind === 'damage' || e.kind === 'heal' || e.kind === 'hp') && e.side === side && Date.now() - e.t < 2500) { recent = e; break; }
    }
    if (recent && recent.hp != null && Math.abs(recent.hp - pct) <= 8) { mon.hpBar = pct; mon.hp = pct; return null; }
    var prev = mon.hp;
    mon.hpBar = pct; mon.hp = pct;
    return commit(b, { kind: 'hp', side: side, species: mon.species, name: mon.name, hp: pct, delta: pct - (prev == null ? 100 : prev), reliable: false, text: t('hpEst', side === 'you' ? t('you') : t('foe'), pct), raw: '' });
  }

  function endBattle(b) {
    if (!b || b.ended) return b;
    if (b.pendingRecall) {
      var p = b.pendingRecall; b.pendingRecall = null;
      commit(b, { kind: 'switch', side: p.side, name: p.name, species: p.species, recall: true, reliable: true, text: p.raw, raw: p.raw || '' });
    }
    var winner = null;
    if (allFainted(b, 'you') && b.party.foe.some(function (m) { return !m.fainted; })) winner = 'foe';
    else if (allFainted(b, 'foe') && b.party.you.some(function (m) { return !m.fainted; })) winner = 'you';
    b.ended = true; b.status = 'done'; b.winner = winner; b.winnerHow = winner ? 'inferred' : null;
    commit(b, { kind: 'end', side: winner, reliable: false, inferred: !!winner, text: t('ended'), raw: '' });
    return b;
  }

  function sideWord(side) { return side === 'you' ? t('you') : side === 'foe' ? t('foe') : ''; }
  function exportText(b) {
    var you = b.youName || b.detected.you || t('you');
    var foe = b.foeName || b.detected.foe || t('foe');
    var lines = [t('exportTitle'), t('vs', you, foe), new Date(b.created).toLocaleString(de ? 'de-DE' : 'en-US'), ''];
    if (b.winner) lines.push((b.winner === 'you' ? t('winnerYou') : t('winnerFoe')) + (b.winnerHow === 'inferred' ? ' (' + t('inferred') + ')' : ''));
    lines.push('');
    b.events.forEach(function (e) {
      var tag = e.reliable ? '' : ' [' + (e.kind === 'note' ? t('unclear') : t('inferred')) + ']';
      var turn = e.kind === 'turn' ? '' : (e.turn ? (b.turnHow === 'guess' && e.turnHow === 'guess' ? '~' : '') : '');
      var prefix = (e.turn ? (e.turnHow === 'guess' ? 'R~' + e.turn : 'R' + e.turn) + ' ' : '');
      lines.push(prefix + (e.text || e.raw || e.kind) + tag);
    });
    lines.push('', t('limits'));
    return lines.join('\n');
  }
  function exportJSON(b) {
    return JSON.stringify({
      generator: 'Rattata Lab BattleLog', limits: t('limits'),
      id: b.id, created: b.created, updated: b.updated,
      youName: b.youName, foeName: b.foeName, detected: b.detected, format: b.format,
      status: b.status, turn: b.turn, winner: b.winner, winnerHow: b.winnerHow,
      party: b.party, events: b.events
    }, null, 2);
  }

  // ---------------- tests ----------------
  function selfTest() {
    var fails = [];
    function eq(a, b, msg) { if (a !== b) fails.push(msg + ': ' + JSON.stringify(a) + ' !== ' + JSON.stringify(b)); }
    var script = [
      'Youngster Joey wants to battle!',
      'Go! Pikachu!',
      'Youngster Joey sent out Rattata!',
      'Turn 1',
      'Pikachu used Thunderbolt!',
      "It's super effective!",
      'The opposing Rattata lost 86% of its health!',
      'The opposing Rattata fainted!',
      'Youngster Joey sent out Pidgey!',
      'Turn 2',
      'Pidgey used Gust!',
      'A critical hit!',
      'Pikachu lost 12% of its health!',
      'Pikachu, come back!',
      'Go! Charizard!',
      'You defeated Youngster Joey!'
    ];
    var b = createBattle({});
    script.forEach(function (l) { feedLine(b, l); });
    eq(b.started, true, 'started');
    eq(b.winner, 'you', 'winner');
    eq(b.winnerHow, 'text', 'winnerHow');
    eq(b.detected.foe, 'Youngster Joey', 'foe name');
    eq(b.turn, 2, 'turn');
    var moves = b.events.filter(function (e) { return e.kind === 'move'; });
    eq(moves.length, 2, 'two moves');
    eq(moves[0].move, 'Thunderbolt', 'mv0');
    eq(moves[0].side, 'you', 'mv0 side');
    eq(moves[0].species, 'Pikachu', 'mv0 sp');
    eq(moves[0].defSpecies, 'Rattata', 'mv0 def');
    eq(moves[0].effect, 'super', 'effect');
    eq(moves[0].reliable, true, 'mv0 reliable');
    eq(moves[0].atkHp, 100, 'atk hp before');
    eq(moves[1].move, 'Gust', 'mv1');
    eq(moves[1].side, 'foe', 'mv1 side');
    eq(moves[1].crit, true, 'crit');
    eq(moves[1].defSpecies, 'Pikachu', 'gust target');
    var dmg = b.events.filter(function (e) { return e.kind === 'damage'; });
    eq(dmg[0].hp, 14, 'hp after 86');
    eq(dmg[0].side, 'foe', 'dmg side');
    eq(dmg[0].reliable, true, 'dmg reliable');
    eq(dmg[1].hp, 88, 'pikachu hp');
    var sw = b.events.filter(function (e) { return e.kind === 'switch' && !e.recall; });
    eq(sw.length, 1, 'one switch in');
    eq(sw[0].species, 'Charizard', 'switch to');
    eq(sw[0].fromSpecies, 'Pikachu', 'switch from');
    eq(sw[0].reliable, true, 'switch reliable');
    eq(b.party.you.length, 2, 'you party');
    eq(b.party.foe.length, 2, 'foe party');
    eq(!!b.party.foe[0].fainted, true, 'rattata fainted');
    eq(b.party.foe[0].species, 'Rattata', 'rattata sp');

    var g = createBattle({});
    ['Ein wildes Rattfratz erscheint!', 'Los! Pikachu!', 'Runde 1', 'Pikachu setzt Donnerblitz ein!', 'Das ist sehr effektiv!',
      'Das wilde Rattfratz verlor 40 % seiner KP!', 'Pikachu, komm zurück!', 'Los! Glurak!', 'Glurak setzt Erdbeben ein!',
      'Das wilde Rattfratz wurde besiegt!', 'Du hast gewonnen!'].forEach(function (l) { feedLine(g, l); });
    eq(g.party.foe[0].species, 'Rattata', 'de foe');
    eq(g.party.you[0].species, 'Pikachu', 'de you');
    eq(g.party.you[1].species, 'Charizard', 'de char');
    var gm = g.events.filter(function (e) { return e.kind === 'move'; });
    eq(gm[0].move, 'Thunderbolt', 'de tb');
    eq(gm[0].reliable, true, 'de tb rel');
    eq(gm[0].effect, 'super', 'de effect');
    eq(gm[1].move, 'Earthquake', 'de eq');
    eq(gm[1].species, 'Charizard', 'de eq user');
    eq(g.winner, 'you', 'de win');
    eq(g.party.foe[0].hp, 0, 'de faint hp');
    eq(g.events.filter(function (e) { return e.kind === 'switch' && !e.recall; }).length, 1, 'de switch');
    eq(g.party.foe[0].hp === 0 || g.events.some(function (e) { return e.kind === 'damage' && e.hp === 60; }), true, 'de dmg');

    var fuzzy = createBattle({});
    feedLine(fuzzy, 'Go! Pikachu!');
    feedLine(fuzzy, 'Wild Rattata appeared!');
    feedLine(fuzzy, 'Pikachu used Thunderboit!');
    var fm = fuzzy.events.filter(function (e) { return e.kind === 'move'; })[0];
    eq(fm.move, 'Thunderbolt', 'fuzzy move');
    eq(fm.reliable, false, 'fuzzy not reliable');

    var guess = createBattle({});
    ['Wild Rattata appeared!', 'Go! Pikachu!', 'Pikachu used Thunderbolt!', 'Rattata used Tackle!', 'Pikachu used Thunderbolt!'].forEach(function (l) { feedLine(guess, l); });
    eq(guess.turn, 2, 'guessed turn');
    eq(guess.events.filter(function (e) { return e.kind === 'turn' && e.guess; }).length, 1, 'one guessed turn');
    eq(guess.events.filter(function (e) { return e.kind === 'turn' && e.guess; })[0].reliable, false, 'guess unreliable');

    var prompt = createBattle({});
    ['Go! Pikachu!', 'Wild Rattata appeared!', 'Pikachu used Tackle!', 'What will Pikachu do?', 'Pikachu used Tackle!'].forEach(function (l) { feedLine(prompt, l); });
    eq(prompt.turn, 2, 'prompt turn');
    eq(prompt.events.filter(function (e) { return e.kind === 'turn'; })[0].reliable, true, 'prompt reliable');
    eq(prompt.events.some(function (e) { return /what will/i.test(e.raw || ''); }), false, 'prompt not logged');

    eq(diffLines(['A', 'B'], ['B', 'C']).join('|'), 'C', 'diff scroll');
    eq(diffLines(['Pikachu used Thunderbolt!'], ['Pikachu used Thunderbolt!']).length, 0, 'diff same');
    eq(diffLines(['Pikachu used Thunderbolt!'], ['Pikachu used Thunderboit!']).length, 0, 'diff fuzzy');
    eq(splitMessages('Pikachu used Thunderbolt! It\'s super effective!').length, 2, 'split bang');
    eq(splitMessages('The opposing Rattata lost 12.5% of its health!').length, 1, 'split decimal');

    var ended = createBattle({});
    feedLine(ended, 'Go! Pikachu!');
    feedLine(ended, 'Wild Rattata appeared!');
    feedLine(ended, 'The wild Rattata fainted!');
    endBattle(ended);
    eq(ended.winner, 'you', 'inferred winner');
    eq(ended.winnerHow, 'inferred', 'inferred how');

    if (Cap && Cap.hpFromPixels) {
      var w = 10, h = 4, data = new Uint8ClampedArray(w * h * 4);
      for (var x = 0; x < w; x++) for (var y = 0; y < h; y++) {
        var p = (y * w + x) * 4;
        if (x < 4) { data[p] = 40; data[p + 1] = 200; data[p + 2] = 50; }
        else { data[p] = data[p + 1] = data[p + 2] = 10; }
        data[p + 3] = 255;
      }
      var ratio = Cap.hpFromPixels(data, w, h);
      if (ratio == null || Math.abs(ratio - 0.4) > 0.02) fails.push('hp bar: ' + ratio);
      var blue = new Uint8ClampedArray(w * h * 4);
      for (var q = 0; q < blue.length; q += 4) { blue[q] = 20; blue[q + 1] = 40; blue[q + 2] = 220; blue[q + 3] = 255; }
      if (Cap.hpFromPixels(blue, w, h) != null) fails.push('blue ui should not be a bar');
    }
    return { ok: fails.length === 0, fails: fails, n: 40 };
  }

  // ---------------- storage + UI ----------------
  var store = A.load('cc_battlelog', null) || { logs: [], cfg: {} };
  if (!store.cfg) store.cfg = {};
  if (!store.cfg.regions) store.cfg.regions = {};
  var current = null, saveTimer = null, demoTimer = null, root = null;
  var cap = null, sampler = null, drawKey = 'text', ocrNote = '';

  function revive(snap) {
    var b = snap;
    b.party = b.party || { you: [], foe: [] };
    b.detected = b.detected || { you: '', foe: '' };
    b.recall = { you: null, foe: null };
    b.events = b.events || [];
    function byId(id) { return monById(b, id); }
    var a = b.active || {};
    if (!a.you || typeof a.you[0] === 'string' || a.you[0] == null && a.you.length === 0) {
      var ids = {
        you: Array.isArray(a.you) ? a.you : [null, null],
        foe: Array.isArray(a.foe) ? a.foe : [null, null]
      };
      b.active = {
        you: [ids.you[0] && typeof ids.you[0] === 'string' ? byId(ids.you[0]) : (ids.you[0] && ids.you[0].id ? byId(ids.you[0].id) : null), ids.you[1] && typeof ids.you[1] === 'string' ? byId(ids.you[1]) : null],
        foe: [ids.foe[0] && typeof ids.foe[0] === 'string' ? byId(ids.foe[0]) : (ids.foe[0] && ids.foe[0].id ? byId(ids.foe[0].id) : null), ids.foe[1] && typeof ids.foe[1] === 'string' ? byId(ids.foe[1]) : null]
      };
    }
    return b;
  }
  function snapshot(b) {
    return {
      id: b.id, title: b.title, created: b.created, updated: b.updated,
      youName: b.youName, foeName: b.foeName, format: b.format, detected: b.detected,
      status: b.status, turn: b.turn, turnHow: b.turnHow, turnStyle: b.turnStyle,
      actionsThisTurn: b.actionsThisTurn, engaged: b.engaged, started: b.started, ended: b.ended,
      winner: b.winner, winnerHow: b.winnerHow,
      party: b.party,
      active: { you: b.active.you.map(function (m) { return m ? m.id : null; }), foe: b.active.foe.map(function (m) { return m ? m.id : null; }) },
      events: b.events
    };
  }
  function persist() {
    if (current) {
      var snap = snapshot(current);
      var at = -1;
      store.logs.forEach(function (l, i) { if (l.id === current.id) at = i; });
      if (at < 0) store.logs.unshift(snap); else store.logs[at] = snap;
    }
    store.logs = store.logs.slice(0, 30);
    A.save('cc_battlelog', store);
  }
  function persistSoon() { clearTimeout(saveTimer); saveTimer = setTimeout(function () { saveTimer = null; persist(); }, 150); }
  (store.logs || []).forEach(function (l, i) { if (l && l.active && l.active.you && typeof l.active.you[0] !== 'string' && l.active.you[0] && l.active.you[0].id) store.logs[i] = snapshot(revive(l)); });
  var liveSnap = (store.logs || []).filter(function (l) { return l.status === 'live'; })[0];
  if (liveSnap) current = revive(JSON.parse(JSON.stringify(liveSnap)));

  function onChange() {
    persistSoon();
    if (!root || document.body.dataset.view !== 'battlelog') return;
    if (!current || root.dataset.log !== current.id) { render(); return; }
    paint();
  }
  function feed(raw) {
    if (!current) { current = createBattle({}); }
    if (current.ended) return;
    feedLine(current, raw);
    onChange();
  }

  function stopCap() {
    if (!cap) return;
    clearInterval(cap.loop);
    try { cap.stream.getTracks().forEach(function (tr) { tr.stop(); }); } catch (e) { /* already stopped */ }
    cap = null;
  }
  function connect(src) {
    if (!Cap) return;
    stopCap();
    Cap.openStream(src).then(function (stream) {
      if (!sampler) sampler = Cap.createSampler();
      var video = document.createElement('video');
      video.muted = true; video.playsInline = true; video.srcObject = stream;
      video.play().catch(function () {});
      cap = { stream: stream, video: video, src: src, running: false, ocrBusy: false, stableLines: [], lastLines: [], blankHits: 0, hpHist: { you: [], foe: [] }, hpAt: { you: 0, foe: 0 } };
      stream.getVideoTracks().forEach(function (tr) { tr.addEventListener('ended', function () { stopCap(); persist(); render(); }); });
      store.cfg.source = { kind: src.kind, id: src.id || '', label: src.label || '' };
      persist();
      render();
    }, function (e) { A.toast(t('errSource', e && e.message ? e.message : e)); });
  }
  function medianPush(arr, v) {
    arr.push(v);
    if (arr.length > 3) arr.shift();
    var s = arr.slice().sort(function (a, c) { return a - c; });
    return s[Math.floor(s.length / 2)];
  }
  function capLoop() {
    if (!cap) return;
    clearInterval(cap.loop);
    cap.loop = setInterval(function () {
      if (!cap || !cap.video || cap.video.readyState < 2) return;
      var regs = store.cfg.regions || {};
      if (regs.text && Cap.ocr && !cap.ocrBusy && Date.now() - (cap.ocrAt || 0) >= 280) {
        var img;
        try { img = sampler.ocrImage(cap.video, regs.text); } catch (e) { img = null; }
        if (img) {
          cap.ocrBusy = true; cap.ocrAt = Date.now();
          Cap.ocr(img).then(function (r) {
            if (!cap) return;
            cap.ocrBusy = false;
            if (!r || r.error) { ocrNote = t('ocrErr', r ? r.error : '?'); paintOcr(); return; }
            var text = r.text || '';
            ocrNote = t('read', text ? '„' + text.replace(/\s+/g, ' ').slice(0, 110) + '“' : t('readNone'));
            var lines = splitMessages(text);
            if (!lines.length) {
              cap.blankHits++;
              if (cap.blankHits >= 3) { cap.stableLines = []; cap.lastLines = []; }
            } else {
              cap.blankHits = 0;
              cap.lastLines = lines;
              if (cap.running && current && !current.ended) {
                var fresh = diffLines(cap.stableLines, lines);
                cap.stableLines = lines;
                fresh.forEach(function (ln) { feedLine(current, ln); });
                if (fresh.length) onChange();
              } else cap.stableLines = lines;
            }
            paintOcr();
          }, function (e) { if (cap) cap.ocrBusy = false; ocrNote = t('ocrErr', e && e.message || e); paintOcr(); });
        }
      }
      if (cap.running && current && !current.ended) {
        ['you', 'foe'].forEach(function (sd) {
          var key = sd === 'you' ? 'youHp' : 'foeHp';
          if (!regs[key] || Date.now() - cap.hpAt[sd] < 350) return;
          var ratio = sampler.hpFill(cap.video, regs[key]);
          if (ratio == null) return;
          cap.hpAt[sd] = Date.now();
          var pct = medianPush(cap.hpHist[sd], ratio * 100);
          if (feedHp(current, sd, pct)) onChange();
        });
      }
    }, 200);
  }

  function displayName(b, side) {
    if (side === 'you') return b.youName || b.detected.you || t('you');
    return b.foeName || b.detected.foe || t('foe');
  }
  function monLabel(m) {
    if (!m) return '–';
    var sp = m.species ? A.nSpecies(m.species) : m.name;
    return m.species && m.name && nid(m.name) !== nid(m.species) && nid(m.name) !== nid(A.nSpecies(m.species)) ? m.name + ' (' + sp + ')' : sp;
  }
  function sprite(species) {
    if (species && A.spriteFit) {
      try {
        var node = A.spriteFit(species);
        if (node && node.classList) node.classList.add('bl-sprite');
        return node;
      } catch (e) { /* unknown forme */ }
    }
    return el('span', { class: 'bl-ph', text: species ? String(species).slice(0, 1) : '?' });
  }
  function inCalc(species) {
    if (!species || !A.DEX) return false;
    if (A.DEX[species]) return true;
    var base = String(species).replace(/-.*$/, '');
    return !!A.DEX[base];
  }
  function hpBar(node, pct, fainted) {
    var bar = el('span', { class: 'bl-hp' + (fainted ? ' faint' : pct <= 20 ? ' low' : pct <= 50 ? ' mid' : '') });
    var fill = el('i'); fill.style.width = Math.max(0, Math.min(100, pct == null ? 100 : pct)) + '%';
    bar.appendChild(fill);
    node.appendChild(bar);
    node.appendChild(el('span', { class: 'bl-hp-n', text: fainted ? t('fainted') : (pct == null ? '–' : Math.round(pct) + ' %') }));
  }
  function fillField(box, b) {
    box.innerHTML = '';
    ['you', 'foe'].forEach(function (sd) {
      var cell = el('div', { class: 'bl-side bl-' + sd });
      cell.appendChild(el('div', { class: 'bl-side-name', text: displayName(b, sd) }));
      var mons = b.active[sd].filter(function (m) { return m; });
      if (!mons.length) cell.appendChild(el('div', { class: 'hint', text: t('noParty') }));
      mons.forEach(function (m) {
        var row = el('div', { class: 'bl-mon' + (m.fainted ? ' faint' : '') });
        row.appendChild(sprite(m.species));
        var tx = el('div', { class: 'bl-mon-tx' });
        tx.appendChild(el('div', { class: 'bl-mon-name', text: monLabel(m) }));
        hpBar(tx, m.hp, m.fainted);
        row.appendChild(tx);
        cell.appendChild(row);
      });
      var seen = el('div', { class: 'bl-party' });
      seen.appendChild(el('span', { class: 'hint', text: t('party') + ': ' }));
      if (!b.party[sd].length) seen.appendChild(el('span', { class: 'hint', text: t('noParty') }));
      b.party[sd].forEach(function (m) {
        seen.appendChild(el('span', { class: 'bl-chip' + (m.fainted ? ' faint' : ''), text: monLabel(m) }));
      });
      cell.appendChild(seen);
      box.appendChild(cell);
    });
  }
  function eventText(e) {
    if (e.text && e.kind !== 'move' && e.kind !== 'send' && e.kind !== 'switch' && e.kind !== 'faint' && e.kind !== 'damage') return e.text;
    if (e.kind === 'move') {
      var who = e.species ? A.nSpecies(e.species) : (e.name || '?');
      var mv = e.move ? A.nMove(e.move) : (e.moveRaw || '?');
      var extra = '';
      if (e.effect === 'super') extra += ' · ' + t('super');
      if (e.effect === 'weak') extra += ' · ' + t('weak');
      if (e.effect === 'immune') extra += ' · ' + t('immune');
      if (e.crit) extra += ' · ' + t('kind_crit');
      if (e.miss) extra += ' · ' + t('kind_miss');
      // show the read spelling only when it is not just the other language of the same move
      if (e.move && e.moveRaw && nid(e.moveRaw) !== nid(e.move) && nid(e.moveRaw) !== nid(A.nMove(e.move))) extra += ' · ' + e.moveRaw;
      return who + ' → ' + mv + extra;
    }
    if (e.kind === 'send') return (e.species ? A.nSpecies(e.species) : e.name || '?');
    if (e.kind === 'switch') {
      if (e.recall) return (e.name || '?');
      var from = e.fromSpecies ? A.nSpecies(e.fromSpecies) : (e.fromName || '');
      var to = e.species ? A.nSpecies(e.species) : (e.name || '?');
      return from ? from + ' → ' + to : to;
    }
    if (e.kind === 'faint') return (e.species ? A.nSpecies(e.species) : e.name || '?');
    if (e.kind === 'damage' || e.kind === 'heal' || e.kind === 'hp') {
      var n = e.species ? A.nSpecies(e.species) : (e.name || sideWord(e.side));
      return n + (e.hp != null ? ' · ' + Math.round(e.hp) + ' %' : '') + (e.delta ? ' (' + (e.delta > 0 ? '+' : '') + Math.round(e.delta) + ')' : '');
    }
    return e.text || e.raw || e.kind;
  }
  function fillLog(box, b) {
    var stick = box.scrollHeight - box.scrollTop - box.clientHeight < 48;
    box.innerHTML = '';
    if (!b.events.length) { box.appendChild(el('div', { class: 'hint bl-empty', text: t('noEvents') })); return; }
    b.events.forEach(function (e) {
      var row = el('div', { class: 'bl-ev' + (e.side ? ' ' + e.side : '') + (e.reliable ? '' : ' est') });
      row.appendChild(el('span', { class: 'bl-tn', text: e.turn ? ((e.turnHow === 'guess' || e.guess) ? '~' : '') + e.turn : '' }));
      row.appendChild(el('span', { class: 'bl-k', text: t('kind_' + e.kind) }));
      var tx = el('span', { class: 'bl-tx', text: eventText(e) });
      if (e.raw && e.raw !== eventText(e)) tx.title = e.raw;
      row.appendChild(tx);
      if (!e.reliable) row.appendChild(el('span', { class: 'bl-est', text: e.kind === 'note' ? t('unclear') : t('inferred') }));
      if (e.kind === 'move' && e.move && inCalc(e.species) && inCalc(e.defSpecies) && A.prefillCalc) {
        var btn = el('button', { class: 'tbtn bl-calc', text: t('calc'), title: t('calcTip') });
        btn.addEventListener('click', function () {
          var ok = A.prefillCalc({ attacker: e.species, defender: e.defSpecies, move: e.move, atkHp: e.atkHp, defHp: e.defHp, crit: !!e.crit, format: b.format });
          A.toast(ok ? t('openCalc') : t('unknownCalc'));
        });
        row.appendChild(btn);
      }
      box.appendChild(row);
    });
    if (stick) box.scrollTop = box.scrollHeight;
  }
  function paintOcr() {
    var n = document.getElementById('blOcr');
    if (n) n.textContent = ocrNote || (Cap && Cap.hasOCR() ? t('reading') : t('noOcr'));
  }
  function paint() {
    if (!current) return;
    var field = document.getElementById('blField');
    var log = document.getElementById('blLog');
    if (field) fillField(field, current);
    if (log) fillLog(log, current);
    var st = document.getElementById('blState');
    if (st) {
      st.textContent = current.ended ? t('done') : t('live');
      st.className = 'bl-state ' + (current.ended ? 'done' : 'live');
    }
    var wn = document.getElementById('blWinner');
    if (wn) {
      wn.textContent = current.winner === 'you' ? t('winnerYou') : current.winner === 'foe' ? t('winnerFoe') : current.ended ? t('winnerNone') : '';
      if (current.winner && current.winnerHow === 'inferred') wn.textContent += ' (' + t('inferred') + ')';
    }
    var tn = document.getElementById('blTurn');
    if (tn) tn.textContent = current.turn ? ((current.turnHow === 'guess' ? t('turnGuess', current.turn) : t('turnN', current.turn))) : '';
    paintOcr();
    var rb = document.getElementById('blRec');
    if (rb && cap) { rb.textContent = cap.running ? t('stop') : t('start'); rb.className = cap.running ? 'tbtn danger' : 'primary-btn'; }
  }

  function download(name, text, mime) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: mime }));
    a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1500);
  }
  function stamp() {
    var d = new Date();
    function p(n) { return (n < 10 ? '0' : '') + n; }
    return d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + '-' + p(d.getHours()) + p(d.getMinutes());
  }

  // Sample uses species the damage calculator knows, so "Im Rechner" is available on the moves.
  var DEMO_EN = ['Gary wants to battle!', 'Go! Charizard!', 'Gary sent out Incineroar!', 'Turn 1',
    'Charizard used Flamethrower!', "It's super effective!", 'The opposing Incineroar lost 48% of its health!',
    'Incineroar used Fake Out!', 'Charizard lost 15% of its health!', 'Turn 2',
    'Charizard, come back!', 'Go! Garchomp!', 'Garchomp used Earthquake!',
    'The opposing Incineroar fainted!', 'You defeated Gary!'];
  var DEMO_DE = ['Gary möchte kämpfen!', 'Los! Glurak!', 'Gary schickt Fuegro in den Kampf!', 'Runde 1',
    'Glurak setzt Flammenwurf ein!', 'Das ist sehr effektiv!', 'Das gegnerische Fuegro verlor 48 % seiner KP!',
    'Fuegro setzt Mogelhieb ein!', 'Glurak verlor 15 % seiner KP!', 'Runde 2',
    'Glurak, komm zurück!', 'Los! Knakrack!', 'Knakrack setzt Erdbeben ein!', 'Volltreffer!',
    'Das gegnerische Fuegro wurde besiegt!', 'Du hast Gary besiegt!'];

  function playDemo() {
    clearTimeout(demoTimer);
    if (current && current.status === 'live' && current.events.length) endBattle(current);
    current = createBattle({});
    persist(); render();
    var lines = de ? DEMO_DE : DEMO_EN, i = 0;
    function step() {
      if (!current || i >= lines.length) { if (current && !current.ended) endBattle(current); onChange(); A.toast(t('demoDone')); return; }
      feedLine(current, lines[i++]);
      onChange();
      demoTimer = setTimeout(step, 380);
    }
    step();
  }

  var demoBooted = false, calcBooted = false;
  function bootHash() {
    if (demoBooted) return;
    if (location.hash !== '#battlelogdemo' && location.hash !== '#battlelogcalc') return;
    demoBooted = true;
    current = createBattle({});
    (de ? DEMO_DE : DEMO_EN).forEach(function (l) { feedLine(current, l); });
    if (!current.ended) endBattle(current);
    persist();
  }
  function render() {
    root = document.getElementById('battleView');
    if (!root) return;
    if (location.hash !== '#battlelogdemo' && location.hash !== '#battlelogcalc') clearTimeout(demoTimer);
    bootHash();
    root.innerHTML = '';
    root.dataset.log = current ? current.id : '';
    var head = el('div', { class: 'nz-head' });
    var h2 = el('h2', { text: t('title') });
    h2.appendChild(el('span', { class: 'alpha-badge', text: 'ALPHA' }));
    head.appendChild(h2);
    head.appendChild(el('span', { class: 'hint', text: t('sub') }));
    root.appendChild(head);
    root.appendChild(el('div', { class: 'bl-alpha', text: t('alpha') }));
    if (location.hash === '#battlelogtest') {
      var res = selfTest();
      root.appendChild(el('pre', { id: 'bltest', class: res.ok ? 'bl-test ok' : 'bl-test bad', text: res.ok ? 'battlelog self-test ok' : res.fails.join('\n') }));
    }
    var body = el('div', { class: 'bl-wrap' });
    root.appendChild(body);

    var side = el('aside', { class: 'bl-list panel' });
    var nb = el('button', { class: 'primary-btn bl-new', text: t('new') });
    nb.addEventListener('click', function () {
      clearTimeout(demoTimer);
      if (current && current.status === 'live') { if (current.events.length) endBattle(current); }
      current = createBattle({}); persist(); render();
    });
    side.appendChild(nb);
    var db = el('button', { class: 'tbtn bl-new', text: t('demo') });
    db.addEventListener('click', playDemo);
    side.appendChild(db);
    if (!store.logs.length && !current) side.appendChild(el('div', { class: 'hint', text: t('empty') }));
    store.logs.forEach(function (l) {
      var open = current && l.id === current.id;
      var b = el('button', { class: 'bl-item' + (open ? ' on' : '') });
      var you = l.youName || (l.detected && l.detected.you) || t('listYou');
      var foe = l.foeName || (l.detected && l.detected.foe) || t('listFoe');
      b.appendChild(el('span', { class: 'bl-item-name', text: you + ' · ' + foe }));
      var sub = (l.status === 'live' ? t('live') : t('done')) + ' · ' + (l.turn ? t('turnN', l.turn) : '');
      if (l.winner) sub += ' · ' + (l.winner === 'you' ? t('winnerYou') : t('winnerFoe'));
      b.appendChild(el('span', { class: 'bl-item-sub', text: sub }));
      b.addEventListener('click', function () {
        clearTimeout(demoTimer);
        if (current && current.id === l.id) return;
        if (current && current.status === 'live') persist();
        current = revive(JSON.parse(JSON.stringify(l)));
        render();
      });
      side.appendChild(b);
    });
    body.appendChild(side);

    var main = el('div', { class: 'bl-main' });
    body.appendChild(main);
    if (!current) { main.appendChild(el('div', { class: 'hint bl-empty', text: t('empty') })); return; }

    var bar = el('div', { class: 'bl-bar panel' });
    var youIn = el('input', { type: 'text', value: current.youName, placeholder: t('youName') });
    var foeIn = el('input', { type: 'text', value: current.foeName, placeholder: t('foeName') });
    youIn.addEventListener('input', function () { current.youName = youIn.value; persistSoon(); paint(); });
    foeIn.addEventListener('input', function () { current.foeName = foeIn.value; persistSoon(); paint(); });
    bar.appendChild(youIn); bar.appendChild(el('span', { class: 'bl-vs', text: 'vs' })); bar.appendChild(foeIn);
    var fg = el('div', { class: 'btn-group' });
    [['singles', t('singles')], ['doubles', t('doubles')]].forEach(function (o) {
      var b = el('button', { class: current.format === o[0] ? 'on' : '', text: o[1] });
      b.addEventListener('click', function () { current.format = o[0]; persistSoon(); render(); });
      fg.appendChild(b);
    });
    bar.appendChild(fg);
    bar.appendChild(el('span', { id: 'blTurn', class: 'bl-turn', text: '' }));
    bar.appendChild(el('span', { id: 'blState', class: 'bl-state', text: '' }));
    bar.appendChild(el('span', { id: 'blWinner', class: 'bl-winner', text: '' }));
    main.appendChild(bar);
    main.appendChild(el('div', { class: 'hint', text: t('namesHint') }));
    main.appendChild(el('div', { id: 'blField', class: 'bl-field panel' }));

    if (!current.ended) main.appendChild(capturePanel());

    var logHead = el('div', { class: 'bl-loghead' });
    logHead.appendChild(el('span', { class: 'sh-lbl', text: t('events') }));
    main.appendChild(logHead);
    main.appendChild(el('div', { id: 'blLog', class: 'bl-log panel' }));

    var tools = el('div', { class: 'bl-tools' });
    if (!current.ended) {
      var man = el('input', { type: 'text', id: 'blManual', placeholder: t('manualPh') });
      var add = el('button', { class: 'tbtn', text: t('addLine') });
      function addLine() { if (man.value.trim()) { feed(man.value); man.value = ''; } }
      add.addEventListener('click', addLine);
      man.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') addLine(); });
      tools.appendChild(man); tools.appendChild(add);
      var end = el('button', { class: 'tbtn', text: t('end') });
      end.addEventListener('click', function () { endBattle(current); onChange(); });
      tools.appendChild(end);
    } else {
      var again = el('button', { class: 'tbtn', text: t('resume') });
      again.addEventListener('click', function () {
        store.logs.forEach(function (l) { if (l.status === 'live' && l.id !== current.id) l.status = 'done'; });
        current.ended = false; current.status = 'live'; current.winnerHow = current.winner && current.winnerHow === 'text' ? current.winnerHow : null;
        if (current.winnerHow !== 'text') current.winner = null;
        persist(); render();
      });
      tools.appendChild(again);
    }
    var exT = el('button', { class: 'tbtn', text: t('exportText') });
    exT.addEventListener('click', function () {
      var text = exportText(current);
      download('battlelog-' + stamp() + '.txt', text, 'text/plain');
      A.showModal(t('exportTitle'), text);
    });
    var exJ = el('button', { class: 'tbtn', text: t('exportJson') });
    exJ.addEventListener('click', function () {
      var text = exportJSON(current);
      download('battlelog-' + stamp() + '.json', text, 'application/json');
      A.showModal(t('exportTitle'), text);
    });
    var sv = el('button', { class: 'tbtn', text: t('save') });
    sv.addEventListener('click', function () { persist(); A.toast(t('saved')); render(); });
    var dl = el('button', { class: 'tbtn danger', text: t('del') });
    dl.addEventListener('click', function () {
      if (!confirm(t('delConfirm'))) return;
      store.logs = store.logs.filter(function (l) { return l.id !== current.id; });
      current = store.logs[0] ? revive(JSON.parse(JSON.stringify(store.logs[0]))) : null;
      persist(); render();
    });
    tools.appendChild(exT); tools.appendChild(exJ); tools.appendChild(sv); tools.appendChild(dl);
    main.appendChild(tools);
    paint();
    if (cap) capLoop();
    if (location.hash === '#battlelogcalc' && !calcBooted && current && A.prefillCalc) {
      calcBooted = true;
      var mv = null;
      current.events.some(function (e) { if (e.kind === 'move' && e.move && inCalc(e.species) && inCalc(e.defSpecies)) { mv = e; return true; } return false; });
      if (mv) A.prefillCalc({ attacker: mv.species, defender: mv.defSpecies, move: mv.move, atkHp: mv.atkHp, defHp: mv.defHp, crit: !!mv.crit, format: current.format });
    }
  }

  function capturePanel() {
    var box = el('div', { class: 'bl-cap panel' });
    var hd = el('div', { class: 'det-head' });
    var ttl = el('span', { class: 'sl-title', text: t('capture') });
    ttl.appendChild(el('span', { class: 'alpha-badge', text: 'ALPHA' }));
    hd.appendChild(ttl);
    hd.appendChild(el('span', { class: 'det-state', text: cap ? (cap.src.label || '') : t('noSource') }));
    box.appendChild(hd);
    if (!Cap) { box.appendChild(el('div', { class: 'hint', text: t('noOcr') })); return box; }
    if (!cap) {
      var row = el('div', { class: 'det-row' });
      var sb = el('button', { class: 'tbtn', text: t('screen') });
      sb.addEventListener('click', function () { Cap.chooseScreen(function (src) { connect(src); }); });
      row.appendChild(sb);
      var camSel = el('select', { class: 'det-cam' });
      camSel.appendChild(el('option', { value: '', text: t('camera') + ' …' }));
      if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
        navigator.mediaDevices.enumerateDevices().then(function (devs) {
          var i = 0;
          devs.forEach(function (d) { if (d.kind === 'videoinput') { i++; camSel.appendChild(el('option', { value: d.deviceId, text: d.label || t('cameraN', i) })); } });
        }).catch(function () {});
      }
      camSel.addEventListener('change', function () {
        if (!camSel.value && camSel.selectedIndex === 0) return;
        connect({ kind: 'camera', id: camSel.value, label: camSel.options[camSel.selectedIndex].text });
      });
      row.appendChild(camSel);
      if (store.cfg.source && store.cfg.source.label) {
        var rc = el('button', { class: 'tbtn', text: t('reconnect', store.cfg.source.label) });
        rc.addEventListener('click', function () { connect(store.cfg.source); });
        row.appendChild(rc);
      }
      box.appendChild(row);
      if (!Cap.hasOCR()) box.appendChild(el('div', { class: 'hint', text: t('noOcr') }));
      return box;
    }
    if (!sampler) sampler = Cap.createSampler();
    var rg = el('div', { class: 'btn-group' });
    [['text', t('regionText')], ['youHp', t('regionYou')], ['foeHp', t('regionFoe')]].forEach(function (o) {
      var b = el('button', { class: drawKey === o[0] ? 'on' : '', text: o[1] });
      b.addEventListener('click', function () { drawKey = o[0]; render(); });
      rg.appendChild(b);
    });
    box.appendChild(rg);
    var cv = el('canvas', { class: 'det-preview', id: 'blPreview' });
    box.appendChild(cv);
    box.appendChild(el('div', { class: 'hint', text: t('regionHint') }));
    var ctx = cv.getContext('2d');
    var drag = null;
    function rel(ev) { var r = cv.getBoundingClientRect(); return { x: Math.min(1, Math.max(0, (ev.clientX - r.left) / r.width)), y: Math.min(1, Math.max(0, (ev.clientY - r.top) / r.height)) }; }
    cv.addEventListener('mousedown', function (ev) { drag = { a: rel(ev), b: rel(ev) }; });
    window.addEventListener('mousemove', function mm(ev) { if (!document.contains(cv)) { window.removeEventListener('mousemove', mm); return; } if (drag) drag.b = rel(ev); });
    window.addEventListener('mouseup', function mu() {
      if (!document.contains(cv)) { window.removeEventListener('mouseup', mu); return; }
      if (!drag) return;
      var x = Math.min(drag.a.x, drag.b.x), y = Math.min(drag.a.y, drag.b.y), w = Math.abs(drag.a.x - drag.b.x), h = Math.abs(drag.a.y - drag.b.y);
      drag = null;
      if (w < 0.01 || h < 0.01) return;
      store.cfg.regions[drawKey] = { x: x, y: y, w: w, h: h };
      persist();
    });
    var cols = { text: '#f2c94c', youHp: '#3a7bd5', foeHp: '#c8283c' };
    function draw() {
      if (!document.contains(cv) || !cap) return;
      var v = cap.video;
      if (v.videoWidth) {
        var W = cv.clientWidth || 520, H = Math.round(W * v.videoHeight / v.videoWidth);
        if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
        ctx.drawImage(v, 0, 0, W, H);
        var regs = store.cfg.regions || {};
        Object.keys(cols).forEach(function (k) {
          var r = (drag && k === drawKey) ? { x: Math.min(drag.a.x, drag.b.x), y: Math.min(drag.a.y, drag.b.y), w: Math.abs(drag.a.x - drag.b.x), h: Math.abs(drag.a.y - drag.b.y) } : regs[k];
          if (!r) return;
          ctx.lineWidth = k === drawKey ? 2.5 : 1.5;
          ctx.strokeStyle = cols[k];
          ctx.strokeRect(r.x * W, r.y * H, r.w * W, r.h * H);
        });
      }
      requestAnimationFrame(draw);
    }
    requestAnimationFrame(draw);
    var run = el('div', { class: 'det-row' });
    var rb = el('button', { id: 'blRec', class: cap.running ? 'tbtn danger' : 'primary-btn', text: cap.running ? t('stop') : t('start') });
    rb.addEventListener('click', function () {
      if (!cap.running) {
        var regs = store.cfg.regions || {};
        if (!regs.text && !regs.youHp && !regs.foeHp) { A.toast(t('needRegion')); return; }
        cap.running = true;
        cap.stableLines = (cap.lastLines || []).slice();
        if (!current) current = createBattle({});
      } else cap.running = false;
      paint();
    });
    run.appendChild(rb);
    var dc = el('button', { class: 'tbtn', text: t('disconnect') });
    dc.addEventListener('click', function () { cap.running = false; stopCap(); render(); });
    run.appendChild(dc);
    box.appendChild(run);
    box.appendChild(el('div', { id: 'blOcr', class: 'hint', text: Cap.hasOCR() ? t('reading') : t('noOcr') }));
    return box;
  }

  window.CCBattleLog = {
    render: render, selfTest: selfTest, _diffLines: diffLines, _split: splitMessages,
    _feed: feedLine, _create: createBattle, _hp: feedHp, _end: endBattle, _exportText: exportText
  };
})();

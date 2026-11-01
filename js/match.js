// Match-Analyse: Showdown-Replays und Kampfprotokolle auswerten.
// Team kommt aus dem Teambuilder (cc_builder), Einträge liegen unter localStorage "cc_match".
// Kampfprotokolle: Speicher "cc_battlelog" oder JSON des Kampfprotokolls, gelesen über js/match_parse.js.
(function () {
  'use strict';
  var A = window.CC;
  var P = window.CCMatchParse;
  if (!A || !P) return;
  var el = A.el, de = A.LANG === 'de';

  var S = de ? {
    title: 'Match-Analyse',
    sub: 'Showdown-Replays und Kampfprotokolle: Ergebnis, Teams, Leads, Mega und Tera, Nutzung und Matchups.',
    team: 'Team', teamNone: 'Kein Team im Teambuilder', teamPick: 'Team wählen …',
    names: 'Showdown-Namen', namesPh: 'Namen, mit Komma getrennt',
    namesHint: 'Daran erkennt das Tool deine Seite. Leer lassen geht, wenn das gewählte Team im Replay vorkommt.',
    gamesN: '{0} Spiele', record: '{0}–{1}', noGames: 'Noch keine Spiele',
    tabGames: 'Spiele', tabSeries: 'Serien', tabUsage: 'Nutzung', tabMatch: 'Matchups', tabMoves: 'Attacken', tabCheck: 'Prüfen',
    importTitle: 'Spiele hinzufügen',
    pastePh: 'Ein Replay-Link pro Zeile\nhttps://replay.pokemonshowdown.com/…\n\nOder ein Showdown-Log, ein Replay-JSON oder ein Kampfprotokoll-JSON hier einfügen.',
    load: 'Übernehmen', fromLog: 'Kampfprotokolle', demo: 'Beispiel laden', clearDemo: 'Beispiele entfernen',
    backup: 'Sichern', restore: 'Datei laden',
    cors: 'Replays lädt der Browser direkt von replay.pokemonshowdown.com. Die Seite erlaubt das von anderen Seiten aus. Klappt der Abruf nicht (privates Replay, kein Netz), das .json oder den Log-Text oben einfügen.',
    logHint: 'Kampfprotokolle liest fertige Kämpfe aus dem Kampfprotokoll dieser App (Speicher „cc_battlelog“) und übernimmt Ergebnis, gesehene Pokémon, Leads und Attacken. Elo, offen oder geschlossen und das Team von sechs stehen dort nicht. Ein exportiertes JSON kannst du oben einfügen.',
    loadingN: 'Lade {0} von {1} …', addedN: '{0} neu, {1} doppelt, {2} fehlgeschlagen',
    noLogs: 'Keine Kampfprotokolle gespeichert. Das Kampfprotokoll legt sie unter „cc_battlelog“ ab, oder du fügst ein exportiertes JSON ein.',
    logsIn: '{0} neu übernommen, {1} aktualisiert',
    demoIn: 'Beispiele geladen', demoOut: 'Beispiele entfernt',
    badJson: 'Das JSON konnte nicht gelesen werden.',
    restored: '{0} Einträge übernommen',
    filters: 'Filter', any: 'alle',
    fResult: 'Ergebnis', fWin: 'Sieg', fLoss: 'Niederlage',
    fOppTeam: 'Gegner im Team', fOppLead: 'Gegner-Lead', fOppBack: 'Gegner-Back',
    fMyLead: 'Eigenes Lead', fMyBack: 'Eigenes Back', fMyUsed: 'Selbst eingesetzt',
    fSheet: 'Team Sheet', fMega: 'Mega / Tera', fMegaMon: 'Mega- oder Tera-Pokémon',
    megaOnly: 'mit Mega', teraOnly: 'mit Tera',
    fElo: 'Mindest-Elo (Gegner)', reset: 'Filter zurück',
    shown: '{0} von {1} Spielen', shownRec: '{0}–{1}, {2}',
    empty: 'Noch nichts ausgewertet. Links einfügen, Kampfprotokolle übernehmen oder das Beispiel laden.',
    emptyFilter: 'Kein Spiel passt auf den Filter.',
    teamOf: 'Team', leads: 'Leads', you: 'Du', foe: 'Gegner', back: 'Back',
    sheetOts: 'Offen', sheetCts: 'Zu', sheetUnk: 'Sheet ?',
    srcShowdown: 'Replay', srcBattle: 'Protokoll', srcDemo: 'Beispiel',
    mega: 'Mega', tera: 'Tera', elo: 'Elo', openReplay: 'Replay öffnen',
    side: 'Deine Seite', sideAuto: 'Automatisch',
    split: 'Neue Serie davor', bo1: 'Eigenes Spiel (Bo1)',
    del: 'Löschen', delConfirm: 'Diesen Eintrag löschen?',
    warnSide: 'Seite unklar: kein Showdown-Name und kein Team-Treffer. Oben die Seite wählen.',
    partial: 'Team von sechs unbekannt (nur wer im Kampf zu sehen war).',
    noSheet: 'Offen oder geschlossen ist nicht bekannt.',
    noElo: 'Keine Elo.', noWin: 'Kein Sieger erkannt.',
    seriesHint: 'Aufeinanderfolgende Spiele gegen denselben Gegner werden eine Serie, bis eine Seite zwei Siege hat oder drei Spiele gespielt sind. Mehr als sechs Stunden Abstand, „Neue Serie“ oder „Bo1“ trennt.',
    seriesEmpty: 'Noch keine Serie. Serien entstehen aus Spielen mit erkannter Seite.',
    seriesVs: 'gegen {0}', gamesShort: '{0} Spiele',
    usageHint: 'Gezählt werden alle Spiele mit erkanntem Sieger, unabhängig vom Filter. „Dabei“ ist die Anzahl, in der das Pokémon zu den vier Eingesetzten gehörte. Der Anteil bezieht sich auf alle gewerteten Spiele.',
    usageTeam: 'Grundlage ist das Team „{0}“ aus dem Teambuilder.',
    usageSeen: 'Kein Team gewählt: gezeigt wird, was du in den Spielen eingesetzt hast.',
    otherMons: 'Eingesetzt, aber nicht im gewählten Team',
    colMon: 'Pokémon', colBrought: 'Dabei', colWins: 'Siege', colWr: 'Siegquote', colUse: 'Anteil',
    colLead: 'Lead', colLeadW: 'Lead-Siege', colLeadWr: 'Lead-Quote',
    colMega: 'Mega', colMegaWr: 'Mega-Quote', colTera: 'Tera', colTeraWr: 'Tera-Quote',
    leadsTitle: 'Lead-Paare', colPair: 'Paar', colLed: 'Mal Lead', 
    sheetTitle: 'Offen und geschlossen',
    otsLine: 'Offen: {0} Siege aus {1} ({2})', ctsLine: 'Geschlossen: {0} Siege aus {1} ({2})', sheetNone: 'Dafür gibt es noch keine Spiele.',
    matchHint: 'Ein gegnerisches Pokémon zählt als „im Team“, wenn das Replay die sechs zeigt, und als „eingesetzt“, wenn es zu den vier mitgebrachten gehörte. Die Quote ist dein Sieg, wenn es eingesetzt war. Besten- und schlechtesten Listen brauchen mindestens vier Einsätze.',
    colPresent: 'Im Team', colFaced: 'Eingesetzt', colBeat: 'Deine Siege', colAtt: 'Einsatzquote',
    best: 'Beste Matchups', worst: 'Schwächste Matchups', attHigh: 'Am häufigsten eingesetzt', attLow: 'Am seltensten eingesetzt',
    need4: 'Noch keine Liste: dafür braucht es mindestens vier Einsätze.',
    movesHint: 'Wie oft jede Attacke von deinen eingesetzten Pokémon benutzt wurde. Stehen im Teambuilder Attacken, erscheinen die auch mit null.',
    movesNone: 'Noch keine Attacke erkannt.',
    checkHint: 'Doppelte Links, ungültige Adressen, fehlgeschlagene Abrufe und Spiele ohne erkennbare Seite.',
    checkOk: 'Keine Probleme.',
    notices: 'Hinweise beim Übernehmen', dismiss: 'Ausblenden',
    errDup: 'Doppelter Link, nicht noch einmal übernommen: {0}',
    errBad: 'Kein Showdown-Replay: {0}',
    errFetch: 'Replay nicht geladen ({0}): {1}',
    errSide: 'Seite unklar bei {0}',
    errWin: 'Kein Sieger: {0}',
    limitsTitle: 'Grenzen der Kampfprotokolle',
    limits: 'Ein Kampfprotokoll sieht nur Pokémon, die im Bild waren, keine Elo und nicht, ob das Team offen lag. Mega und Tera stehen nur drin, wenn das Protokoll sie mitschreibt oder die Rohzeile eine Showdown-Zeile ist.',
    testRun: 'Parser prüfen', testOk: 'Parser: {0} Prüfungen in Ordnung.', testBad: 'Parser: {0} Prüfung(en) fehlgeschlagen.',
    vs: 'gegen', backYou: 'Dein Back', backFoe: 'Gegner-Back', picks: 'Eingesetzt'
  } : {
    title: 'Match-Analyse',
    sub: 'Showdown replays and battle logs: result, teams, leads, Mega and Tera, usage and matchups.',
    team: 'Team', teamNone: 'No team in the teambuilder', teamPick: 'Choose a team …',
    names: 'Showdown names', namesPh: 'Names, separated by commas',
    namesHint: 'This is how the tool finds your side. Leaving it empty is fine when the chosen team appears in the replay.',
    gamesN: '{0} games', record: '{0}–{1}', noGames: 'No games yet',
    tabGames: 'Games', tabSeries: 'Series', tabUsage: 'Usage', tabMatch: 'Matchups', tabMoves: 'Moves', tabCheck: 'Check',
    importTitle: 'Add games',
    pastePh: 'One replay link per line\nhttps://replay.pokemonshowdown.com/…\n\nOr paste a Showdown log, a replay JSON or a battle-log JSON here.',
    load: 'Add', fromLog: 'Battle logs', demo: 'Load sample', clearDemo: 'Remove samples',
    backup: 'Save', restore: 'Load file',
    cors: 'The browser loads replays directly from replay.pokemonshowdown.com. That site allows other pages to read them. If a fetch fails (private replay, no network), paste the .json or the log text above.',
    logHint: 'Battle logs reads finished battles from this app’s battle log (storage “cc_battlelog”) and keeps the result, the Pokémon that appeared, leads and moves. Elo, open or closed sheet and the team of six are not in there. You can paste an exported JSON above.',
    loadingN: 'Loading {0} of {1} …', addedN: '{0} new, {1} duplicate, {2} failed',
    noLogs: 'No battle logs saved. The battle log stores them under “cc_battlelog”, or paste an exported JSON.',
    logsIn: '{0} added, {1} updated',
    demoIn: 'Samples loaded', demoOut: 'Samples removed',
    badJson: 'Could not read that JSON.',
    restored: '{0} entries added',
    filters: 'Filters', any: 'any',
    fResult: 'Result', fWin: 'Win', fLoss: 'Loss',
    fOppTeam: 'Foe on team', fOppLead: 'Foe lead', fOppBack: 'Foe back',
    fMyLead: 'Your lead', fMyBack: 'Your back', fMyUsed: 'You brought',
    fSheet: 'Team sheet', fMega: 'Mega / Tera', fMegaMon: 'Mega or Tera Pokémon',
    megaOnly: 'with Mega', teraOnly: 'with Tera',
    fElo: 'Min Elo (foe)', reset: 'Reset filters',
    shown: '{0} of {1} games', shownRec: '{0}–{1}, {2}',
    empty: 'Nothing analysed yet. Paste links, import battle logs or load the sample.',
    emptyFilter: 'No game matches the filter.',
    teamOf: 'Team', leads: 'Leads', you: 'You', foe: 'Foe', back: 'Back',
    sheetOts: 'Open', sheetCts: 'Closed', sheetUnk: 'Sheet ?',
    srcShowdown: 'Replay', srcBattle: 'Log', srcDemo: 'Sample',
    mega: 'Mega', tera: 'Tera', elo: 'Elo', openReplay: 'Open replay',
    side: 'Your side', sideAuto: 'Automatic',
    split: 'New series before this', bo1: 'Standalone game (Bo1)',
    del: 'Delete', delConfirm: 'Delete this entry?',
    warnSide: 'Side unknown: no Showdown name and no team overlap. Pick the side above.',
    partial: 'Team of six unknown (only Pokémon that appeared in the battle).',
    noSheet: 'Open or closed is not known.',
    noElo: 'No Elo.', noWin: 'No winner detected.',
    seriesHint: 'Consecutive games against the same opponent become one series until a side has two wins or three games are played. A gap of more than six hours, “New series” or “Bo1” splits them.',
    seriesEmpty: 'No series yet. Series are built from games whose side was recognised.',
    seriesVs: 'vs {0}', gamesShort: '{0} games',
    usageHint: 'Every game with a known winner is counted, whether or not the filter is set. “Brought” is how often the Pokémon was one of the four you sent. Usage is the share of all counted games.',
    usageTeam: 'Based on the teambuilder team “{0}”.',
    usageSeen: 'No team selected: this is what you brought in the games.',
    otherMons: 'Brought, but not on the selected team',
    colMon: 'Pokémon', colBrought: 'Brought', colWins: 'Wins', colWr: 'Win rate', colUse: 'Usage',
    colLead: 'Lead', colLeadW: 'Lead wins', colLeadWr: 'Lead rate',
    colMega: 'Mega', colMegaWr: 'Mega rate', colTera: 'Tera', colTeraWr: 'Tera rate',
    leadsTitle: 'Lead pairs', colPair: 'Pair', colLed: 'Times led',
    sheetTitle: 'Open and closed',
    otsLine: 'Open: {0} wins out of {1} ({2})', ctsLine: 'Closed: {0} wins out of {1} ({2})', sheetNone: 'No games for that yet.',
    matchHint: 'A foe Pokémon counts as “on the team” when the replay shows the six, and as “brought” when it was one of the four sent. The rate is your win while it was brought. Best and worst lists need at least four games.',
    colPresent: 'On team', colFaced: 'Brought', colBeat: 'Your wins', colAtt: 'Bring rate',
    best: 'Best matchups', worst: 'Worst matchups', attHigh: 'Brought most often', attLow: 'Brought least often',
    need4: 'No list yet: that needs at least four games brought.',
    movesHint: 'How often each move was used by the Pokémon you brought. Moves saved on the teambuilder set are listed even at zero.',
    movesNone: 'No move recognised yet.',
    checkHint: 'Duplicate links, invalid addresses, failed fetches and games whose side could not be recognised.',
    checkOk: 'No problems.',
    notices: 'Notes from importing', dismiss: 'Dismiss',
    errDup: 'Duplicate link, not added again: {0}',
    errBad: 'Not a Showdown replay: {0}',
    errFetch: 'Replay not loaded ({0}): {1}',
    errSide: 'Side unknown for {0}',
    errWin: 'No winner: {0}',
    limitsTitle: 'Battle log limits',
    limits: 'A battle log only sees Pokémon that were on screen, no Elo and not whether the sheet was open. Mega and Tera are kept only when the log records them or the raw line is a Showdown protocol line.',
    testRun: 'Check parser', testOk: 'Parser: {0} checks passed.', testBad: 'Parser: {0} check(s) failed.',
    vs: 'vs', backYou: 'Your back', backFoe: 'Foe back', picks: 'Brought'
  };
  function t(k) {
    var s = S[k] != null ? S[k] : k;
    for (var i = 1; i < arguments.length; i++) s = String(s).split('{' + (i - 1) + '}').join(arguments[i]);
    return s;
  }

  function freshFilters() {
    return { result: '', oppTeam: '', oppLead: '', oppBack: '', myLead: '', myBack: '', myUsed: '', sheet: '', mega: '', megaMon: '', minElo: '' };
  }
  function fresh() {
    return { v: 1, names: '', teamId: '', tab: 'games', sel: '', filters: freshFilters(), entries: [], notices: [] };
  }
  var store = A.load('cc_match', null);
  if (!store || !Array.isArray(store.entries)) store = fresh();
  if (!store.filters) store.filters = freshFilters();
  if (!store.notices) store.notices = [];
  Object.keys(freshFilters()).forEach(function (k) { if (store.filters[k] == null) store.filters[k] = ''; });
  function persist() { A.save('cc_match', store); }
  function nid() { return 'ma' + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36); }

  function builder() { return A.load('cc_builder', null); }
  function teams() { var b = builder(); return (b && b.teams) || []; }
  function currentTeam() {
    var list = teams(), hit = null;
    list.forEach(function (tm) { if (tm.id === store.teamId) hit = tm; });
    return hit;
  }
  function ensureTeam() {
    var list = teams();
    if (!list.length) return;
    if (!list.some(function (tm) { return tm.id === store.teamId; })) {
      var b = builder();
      store.teamId = (b && b.cur) || list[0].id;
      persist();
    }
  }
  function teamMons() {
    var tm = currentTeam();
    if (!tm) return [];
    return (tm.mons || []).map(function (m) {
      var forme = m.set && m.set.forme;
      var sp = forme && A.DEX[forme] && forme.indexOf('Mega ') !== 0 ? forme : m.species;
      var moves = ((m.set && m.set.moves) || []).filter(function (mv) { return mv && mv !== '(No Move)'; });
      return { species: sp, moves: moves };
    }).filter(function (m) { return m.species && A.DEX[m.species]; });
  }

  function sameMon(a, b) {
    if (!a || !b) return false;
    if (P.idOf(a) === P.idOf(b)) return true;
    if (P.idOf(P.baseFor(a)) && P.idOf(P.baseFor(a)) === P.idOf(P.baseFor(b))) return true;
    if (a.indexOf('*') !== -1 || b.indexOf('*') !== -1) {
      var star = a.indexOf('*') !== -1 ? a : b;
      var other = star === a ? b : a;
      var prefix = P.idOf(String(star).replace(/-\*.*$/, '').replace(/\*/g, ''));
      return !!(prefix && P.idOf(other).indexOf(prefix) === 0);
    }
    return false;
  }
  function hasMon(list, sp) { return (list || []).some(function (x) { return sameMon(x, sp); }); }
  var TAIL = de ? {
    'Rapid-Strike': 'Fließender Stil', 'Single-Strike': 'Fokussierter Stil', Therian: 'Tiergeistform',
    Wellspring: 'Brunnenmaske', Hearthflame: 'Ofenmaske', Cornerstone: 'Fundamentmaske'
  } : {
    'Rapid-Strike': 'Rapid Strike', 'Single-Strike': 'Single Strike'
  };
  function lab(sp) {
    if (!sp) return '';
    if (sp.indexOf('*') !== -1) return sp;
    var direct = A.nSpecies(sp);
    var cut = sp.indexOf('-');
    if (cut < 0) return direct;
    var tail = sp.slice(cut + 1);
    if (direct !== sp && direct.indexOf('-' + tail) === -1 && direct.indexOf(tail) === -1) return direct;
    if (TAIL[tail]) return A.nSpecies(sp.slice(0, cut)) + (de ? ' (' + TAIL[tail] + ')' : ' ' + TAIL[tail]);
    return direct;
  }
  function nameList() {
    return String(store.names || '').split(/[,;\n]/).map(function (s) { return s.trim(); }).filter(Boolean);
  }
  function nameHit(name, list) {
    var id = P.idOf(name);
    return !!id && list.some(function (n) { return P.idOf(n) === id; });
  }
  function overlap(side, mons) {
    var pool = (side.team && side.team.length) ? side.team : (side.brought || []);
    var n = 0;
    mons.forEach(function (m) { if (pool.some(function (sp) { return sameMon(sp, m.species); })) n++; });
    return n;
  }
  function yourSide(entry) {
    if (!entry || !entry.game) return '';
    if (entry.side === 'p1' || entry.side === 'p2') return entry.side;
    var names = nameList(), g = entry.game;
    var h1 = nameHit(g.p1.name, names), h2 = nameHit(g.p2.name, names);
    if (h1 && !h2) return 'p1';
    if (h2 && !h1) return 'p2';
    var mons = teamMons();
    if (mons.length) {
      var s1 = overlap(g.p1, mons), s2 = overlap(g.p2, mons);
      if (s1 > s2) return 'p1';
      if (s2 > s1) return 'p2';
    }
    return '';
  }
  function viewed(entry) {
    var side = yourSide(entry);
    if (!side || !entry.game) return null;
    var g = entry.game, you = g[side], foe = g[side === 'p1' ? 'p2' : 'p1'];
    return {
      you: you, foe: foe,
      result: g.winner ? (g.winner === side ? 'win' : 'loss') : 'unknown',
      sheet: g.sheet, when: g.when || entry.added || 0,
      source: entry.source, url: g.url || entry.url || '',
      warnings: g.warnings || [], entry: entry
    };
  }
  function letter(result) { return result === 'win' ? (de ? 'S' : 'W') : result === 'loss' ? (de ? 'N' : 'L') : '?'; }
  function pct(w, n) {
    if (!n) return '–';
    var s = (100 * w / n).toFixed(1);
    return (de ? s.replace('.', ',') : s) + ' %';
  }
  function eloText(side) {
    if (!side || (side.eloStart == null && side.eloEnd == null)) return '';
    if (side.eloStart != null && side.eloEnd != null && side.eloStart !== side.eloEnd) return side.eloStart + ' → ' + side.eloEnd;
    return String(side.eloStart != null ? side.eloStart : side.eloEnd);
  }

  function counted() {
    var out = [];
    store.entries.forEach(function (e) {
      var v = viewed(e);
      if (v && (v.result === 'win' || v.result === 'loss')) out.push(v);
    });
    return out;
  }
  function recordOf(list) {
    var w = 0, l = 0;
    list.forEach(function (v) { if (v.result === 'win') w++; else if (v.result === 'loss') l++; });
    return { w: w, l: l, n: w + l };
  }

  function filtersOn() {
    var f = store.filters;
    return Object.keys(f).some(function (k) { return !!f[k]; });
  }
  function megaHit(side, sp) {
    if ((side.megas || []).some(function (m) { return sameMon(m.species, sp); })) return true;
    return !!(side.tera && sameMon(side.tera.species, sp));
  }
  function pass(v) {
    var f = store.filters;
    if (f.result && v.result !== f.result) return false;
    var oppPool = (v.foe.team && v.foe.team.length) ? v.foe.team : v.foe.brought;
    if (f.oppTeam && !hasMon(oppPool, f.oppTeam)) return false;
    if (f.oppLead && !hasMon(v.foe.leads, f.oppLead)) return false;
    if (f.oppBack && !hasMon(v.foe.back, f.oppBack)) return false;
    if (f.myLead && !hasMon(v.you.leads, f.myLead)) return false;
    if (f.myBack && !hasMon(v.you.back, f.myBack)) return false;
    if (f.myUsed && !hasMon(v.you.brought, f.myUsed)) return false;
    if (f.sheet && v.sheet !== f.sheet) return false;
    if (f.mega === 'mega' && !(v.you.megas && v.you.megas.length)) return false;
    if (f.mega === 'tera' && !(v.you.tera && v.you.tera.species)) return false;
    if (f.megaMon && !megaHit(v.you, f.megaMon)) return false;
    if (f.minElo !== '' && f.minElo != null) {
      var elo = v.foe.eloStart;
      if (elo == null || elo < +f.minElo) return false;
    }
    return true;
  }

  function speciesChoices() {
    var map = {};
    store.entries.forEach(function (e) {
      var v = viewed(e);
      if (!v) return;
      [v.you, v.foe].forEach(function (sd) {
        [sd.team, sd.brought, sd.leads, sd.back].forEach(function (arr) {
          (arr || []).forEach(function (sp) { if (sp && sp.indexOf('*') === -1) map[sp] = lab(sp); });
        });
        (sd.megas || []).forEach(function (m) { if (m.species) map[m.species] = lab(m.species); });
        if (sd.tera && sd.tera.species) map[sd.tera.species] = lab(sd.tera.species);
      });
    });
    return Object.keys(map).map(function (k) { return { value: k, label: map[k] }; })
      .sort(function (a, b) { return a.label.localeCompare(b.label, de ? 'de' : 'en'); });
  }

  function movesFor(side, species) {
    var out = {};
    Object.keys(side.moves || {}).forEach(function (k) {
      if (!sameMon(k, species)) return;
      var bag = side.moves[k];
      Object.keys(bag).forEach(function (mv) { out[mv] = (out[mv] || 0) + bag[mv]; });
    });
    return out;
  }

  function usageTable(rows, list) {
    var games = rows.length;
    return list.map(function (mon) {
      var brought = 0, wins = 0, lead = 0, leadW = 0, mega = 0, megaW = 0, tera = 0, teraW = 0;
      rows.forEach(function (v) {
        var on = hasMon(v.you.brought, mon.species);
        if (on) { brought++; if (v.result === 'win') wins++; }
        if (hasMon(v.you.leads, mon.species)) { lead++; if (v.result === 'win') leadW++; }
        if ((v.you.megas || []).some(function (m) { return sameMon(m.species, mon.species); })) { mega++; if (v.result === 'win') megaW++; }
        if (v.you.tera && sameMon(v.you.tera.species, mon.species)) { tera++; if (v.result === 'win') teraW++; }
      });
      return { mon: mon, brought: brought, wins: wins, lead: lead, leadW: leadW, mega: mega, megaW: megaW, tera: tera, teraW: teraW, games: games };
    });
  }
  function leadCombos(rows) {
    var map = {};
    rows.forEach(function (v) {
      if (!v.you.leads || v.you.leads.length < 2) return;
      var pair = v.you.leads.slice(0, 2).sort(function (a, b) { return lab(a).localeCompare(lab(b), de ? 'de' : 'en'); });
      var key = P.idOf(pair[0]) + '|' + P.idOf(pair[1]);
      if (!map[key]) map[key] = { a: pair[0], b: pair[1], n: 0, w: 0 };
      map[key].n++;
      if (v.result === 'win') map[key].w++;
    });
    return Object.keys(map).map(function (k) { return map[k]; })
      .sort(function (a, b) { return b.n - a.n || b.w / b.n - a.w / a.n; });
  }
  function matchups(rows) {
    var map = {};
    function rec(sp) {
      var k = P.idOf(P.baseFor(sp)) || sp;
      if (!map[k]) map[k] = { species: P.baseFor(sp) || sp, present: 0, brought: 0, wins: 0 };
      return map[k];
    }
    rows.forEach(function (v) {
      var seenP = {}, seenB = {};
      if (v.foe.teamComplete) {
        (v.foe.team || []).forEach(function (sp) {
          var k = P.idOf(P.baseFor(sp));
          if (seenP[k]) return;
          seenP[k] = 1;
          rec(sp).present++;
        });
      }
      (v.foe.brought || []).forEach(function (sp) {
        var k = P.idOf(P.baseFor(sp));
        if (seenB[k]) return;
        seenB[k] = 1;
        var r = rec(sp);
        r.brought++;
        if (v.result === 'win') r.wins++;
      });
    });
    return Object.keys(map).map(function (k) { return map[k]; })
      .filter(function (r) { return r.brought || r.present; })
      .sort(function (a, b) { return b.brought - a.brought || b.present - a.present; });
  }
  function sheetRates(rows) {
    var ots = { n: 0, w: 0 }, cts = { n: 0, w: 0 };
    rows.forEach(function (v) {
      var b = v.sheet === 'ots' ? ots : v.sheet === 'cts' ? cts : null;
      if (!b) return;
      b.n++;
      if (v.result === 'win') b.w++;
    });
    return { ots: ots, cts: cts };
  }

  function makeEntry(key, source, url, game, extra) {
    extra = extra || {};
    return {
      id: nid(), key: key, source: source, url: url || (game && game.url) || '',
      added: Date.now(), error: extra.error || null, side: extra.side || '',
      splitBefore: false, alone: false, game: game || null
    };
  }
  function notice(code, detail) {
    store.notices.unshift({ id: nid(), code: code, detail: detail || '', at: Date.now() });
    store.notices = store.notices.slice(0, 40);
  }
  function upsertBattle(game) {
    var key = 'bl:' + (game.battleLogId || P.hashText([game.when, game.p1.name, game.p2.name, (game.p1.brought || []).join(), (game.p2.brought || []).join()].join('|')));
    var existing = null;
    store.entries.forEach(function (e) { if (e.key === key) existing = e; });
    if (existing) { existing.game = game; existing.error = null; existing.source = existing.source === 'demo' ? 'demo' : 'battlelog'; return 'upd'; }
    store.entries.push(makeEntry(key, 'battlelog', '', game));
    return 'new';
  }
  function importBattleObjects(list) {
    var n = 0, u = 0;
    (list || []).forEach(function (item) {
      var g = P.adaptBattleLog(item);
      if (!g) return;
      var r = upsertBattle(g);
      if (r === 'new') n++; else u++;
    });
    return { n: n, u: u };
  }

  var busy = '';
  function setBusy(s) { busy = s || ''; var n = document.getElementById('maBusy'); if (n) n.textContent = busy; }

  function fetchReplay(id) {
    return fetch('https://replay.pokemonshowdown.com/' + id + '.json').then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    }).then(function (j) {
      if (!j || typeof j.log !== 'string') throw new Error('no-log');
      return P.parseReplayJson(j);
    });
  }
  function takeReplay(id, cb) {
    var key = 'sd:' + id;
    if (store.entries.some(function (e) { return e.key === key; })) { notice('dup', id); cb('dup'); return; }
    fetchReplay(id).then(function (game) {
      store.entries.push(makeEntry(key, 'showdown', game.url, game));
      cb('ok');
    }, function (err) {
      store.entries.push(makeEntry(key, 'showdown', 'https://replay.pokemonshowdown.com/' + id, null, { error: { code: 'fetch', detail: String(err && err.message || err) } }));
      cb('fail');
    });
  }
  function runIds(ids, done) {
    var i = 0, added = 0, dup = 0, failed = 0;
    function next() {
      if (i >= ids.length) { persist(); setBusy(''); done({ added: added, dup: dup, failed: failed }); return; }
      var id = ids[i++];
      setBusy(t('loadingN', i, ids.length));
      takeReplay(id, function (res) {
        if (res === 'ok') added++; else if (res === 'dup') dup++; else failed++;
        next();
      });
    }
    if (!ids.length) { done({ added: 0, dup: 0, failed: 0 }); return; }
    next();
  }
  function addLog(text) {
    var game = P.parseLog(text, { source: 'showdown', when: Date.now() });
    var key = 'log:' + P.hashText(text);
    if (store.entries.some(function (e) { return e.key === key; })) { notice('dup', key); return 'dup'; }
    store.entries.push(makeEntry(key, 'showdown', '', game));
    return 'ok';
  }
  function addBad(line) {
    var key = 'bad:' + P.hashText(line);
    if (store.entries.some(function (e) { return e.key === key; })) { notice('dup', line); return; }
    store.entries.push(makeEntry(key, 'showdown', '', null, { error: { code: 'bad', detail: line.slice(0, 180) } }));
  }
  function importJson(text) {
    var data;
    try { data = JSON.parse(text); } catch (e) { A.toast(t('badJson')); return; }
    var added = 0;
    function one(obj) {
      if (!obj || typeof obj !== 'object') return;
      if (obj.kind === 'rattata-match' && Array.isArray(obj.entries)) {
        if (obj.names && !store.names) store.names = obj.names;
        if (obj.teamId && !store.teamId) store.teamId = obj.teamId;
        obj.entries.forEach(function (e) {
          if (!e || !e.key) return;
          if (store.entries.some(function (x) { return x.key === e.key; })) { notice('dup', e.key); return; }
          if (!e.id) e.id = nid();
          store.entries.push(e);
          added++;
        });
        return;
      }
      if (obj.logs && Array.isArray(obj.logs) && !obj.log) {
        var r = importBattleObjects(obj.logs);
        added += r.n;
        return;
      }
      if (P.isBattleLog(obj)) { var b = importBattleObjects([obj]); added += b.n; return; }
      if (typeof obj.log === 'string') {
        var game = P.parseReplayJson(obj);
        var key = 'sd:' + (game.replayId || ('json:' + P.hashText(obj.log)));
        if (store.entries.some(function (e) { return e.key === key; })) { notice('dup', key); return; }
        store.entries.push(makeEntry(key, 'showdown', game.url, game));
        added++;
      }
    }
    if (Array.isArray(data)) data.forEach(one); else one(data);
    persist();
    A.toast(t('restored', added));
    render();
  }
  function importText(text) {
    var trimmed = String(text || '').trim();
    if (!trimmed) return;
    if (trimmed.charAt(0) === '{' || trimmed.charAt(0) === '[') { importJson(trimmed); return; }
    if (trimmed.indexOf('|player|') !== -1 || trimmed.indexOf('|poke|') !== -1 || trimmed.indexOf('|win|') !== -1) {
      addLog(trimmed);
      persist();
      render();
      return;
    }
    var ids = [], seen = {};
    trimmed.split(/\r?\n/).forEach(function (line) {
      var s = line.trim();
      if (!s) return;
      var id = P.replayIdFromInput(s);
      if (!id) { addBad(s); return; }
      if (seen[id]) { notice('dup', id); return; }
      seen[id] = 1;
      ids.push(id);
    });
    persist();
    runIds(ids, function (r) {
      A.toast(t('addedN', r.added, r.dup, r.failed));
      render();
    });
    render();
  }
  function importStoredLogs() {
    var st = A.load('cc_battlelog', null);
    var logs = st && st.logs;
    if (!logs || !logs.length) { A.toast(t('noLogs')); return; }
    var r = importBattleObjects(logs);
    persist();
    A.toast(t('logsIn', r.n, r.u));
    render();
  }

  function demoLog(p1, p2, body, win) {
    return [
      '|player|p1|' + p1.name + '|1|' + (p1.elo || ''),
      '|player|p2|' + p2.name + '|1|' + (p2.elo || ''),
      p1.team.map(function (m) { return '|poke|p1|' + m[0] + ', L50|' + (m[1] || ''); }).join('\n'),
      p2.team.map(function (m) { return '|poke|p2|' + m[0] + ', L50|' + (m[1] || ''); }).join('\n'),
      '|gametype|doubles',
      body,
      '|win|' + win
    ].join('\n');
  }
  function loadDemo() {
    var T0 = 1710000000000;
    var you = [['Charizard', 'Life Orb'], ['Incineroar', 'Safety Goggles'], ['Rillaboom', 'Assault Vest'], ['Garchomp', 'Clear Amulet'], ['Kingambit', 'Leftovers'], ['Pelipper', 'Focus Sash']];
    var aqua = [['Flutter Mane', 'Booster Energy'], ['Chi-Yu', 'Choice Specs'], ['Urshifu-Rapid-Strike', 'Mystic Water'], ['Amoonguss', 'Sitrus Berry'], ['Raging Bolt', 'Booster Energy'], ['Farigiraf', 'Mental Herb']];
    var youC = you.map(function (m) { return [m[0], '']; });
    var aquaC = aqua.map(function (m) { return [m[0], '']; });
    var specs = [
      { key: 'demo:1', when: T0, eloYou: [1500, 1516], eloFoe: [1480, 1464], log: demoLog(
        { name: 'Rattata', elo: 1500, team: you }, { name: 'Aqua', elo: 1480, team: aqua },
        ['|switch|p1a: Charizard|Charizard, L50|100/100', '|switch|p1b: Incineroar|Incineroar, L50|100/100',
          '|switch|p2a: Flutter Mane|Flutter Mane, L50|100/100', '|switch|p2b: Chi-Yu|Chi-Yu, L50|100/100', '|turn|1',
          '|-mega|p1a: Charizard|Charizard|Charizardite Y', '|-terastallize|p2a: Flutter Mane|Fairy',
          '|move|p1a: Charizard|Heat Wave|p2a: Flutter Mane', '|move|p1b: Incineroar|Fake Out|p2b: Chi-Yu',
          '|move|p2a: Flutter Mane|Moonblast|p1a: Charizard', '|move|p2b: Chi-Yu|Heat Wave|p1a: Charizard',
          '|switch|p1a: Rillaboom|Rillaboom, L50|100/100', '|switch|p2a: Urshifu|Urshifu-Rapid-Strike, L50|100/100',
          '|switch|p1b: Garchomp|Garchomp, L50|100/100', '|move|p1a: Rillaboom|Grassy Glide|p2b: Chi-Yu',
          '|move|p1b: Garchomp|Earthquake|p2a: Urshifu'].join('\n'), 'Rattata') },
      { key: 'demo:2', when: T0 + 20 * 60000, eloYou: [1516, 1502], eloFoe: [1464, 1478], log: demoLog(
        { name: 'Rattata', elo: 1516, team: youC }, { name: 'Aqua', elo: 1464, team: aquaC },
        ['|switch|p1a: Rillaboom|Rillaboom, L50|100/100', '|switch|p1b: Kingambit|Kingambit, L50|100/100',
          '|switch|p2a: Urshifu|Urshifu-Rapid-Strike, L50|100/100', '|switch|p2b: Raging Bolt|Raging Bolt, L50|100/100', '|turn|1',
          '|-terastallize|p1b: Kingambit|Dark',
          '|move|p1a: Rillaboom|Wood Hammer|p2a: Urshifu', '|move|p1b: Kingambit|Kowtow Cleave|p2b: Raging Bolt',
          '|move|p2a: Urshifu|Surging Strikes|p1a: Rillaboom', '|move|p2b: Raging Bolt|Thunderclap|p1b: Kingambit',
          '|switch|p1a: Charizard|Charizard, L50|100/100', '|switch|p2a: Amoonguss|Amoonguss, L50|100/100',
          '|switch|p1b: Pelipper|Pelipper, L50|100/100'].join('\n'), 'Aqua') },
      { key: 'demo:3', when: T0 + 40 * 60000, eloYou: [1502, 1518], eloFoe: [1478, 1462], log: demoLog(
        { name: 'Rattata', elo: 1502, team: you }, { name: 'Aqua', elo: 1478, team: aqua },
        ['|switch|p1a: Charizard|Charizard, L50|100/100', '|switch|p1b: Rillaboom|Rillaboom, L50|100/100',
          '|switch|p2a: Flutter Mane|Flutter Mane, L50|100/100', '|switch|p2b: Farigiraf|Farigiraf, L50|100/100', '|turn|1',
          '|-mega|p1a: Charizard|Charizard|Charizardite Y',
          '|move|p1a: Charizard|Heat Wave|p2a: Flutter Mane', '|move|p1b: Rillaboom|Fake Out|p2a: Flutter Mane',
          '|move|p2a: Flutter Mane|Dazzling Gleam|p1a: Charizard', '|switch|p1a: Garchomp|Garchomp, L50|100/100',
          '|switch|p2b: Chi-Yu|Chi-Yu, L50|100/100', '|move|p1a: Garchomp|Rock Slide|p2a: Flutter Mane'].join('\n'), 'Rattata') },
      { key: 'demo:4', when: T0 + 8 * 3600000, eloYou: [1518, 1505], eloFoe: [1600, 1612], log: demoLog(
        { name: 'Rattata', elo: 1518, team: youC }, { name: 'Bolt', elo: 1600, team: [['Incineroar', ''], ['Rillaboom', ''], ['Gholdengo', ''], ['Urshifu-Rapid-Strike', ''], ['Amoonguss', ''], ['Chi-Yu', '']] },
        ['|switch|p1a: Incineroar|Incineroar, L50|100/100', '|switch|p1b: Kingambit|Kingambit, L50|100/100',
          '|switch|p2a: Incineroar|Incineroar, L50|100/100', '|switch|p2b: Rillaboom|Rillaboom, L50|100/100', '|turn|1',
          '|move|p1a: Incineroar|Fake Out|p2b: Rillaboom', '|move|p1b: Kingambit|Sucker Punch|p2a: Incineroar',
          '|move|p2a: Incineroar|Flare Blitz|p1b: Kingambit', '|switch|p1a: Pelipper|Pelipper, L50|100/100',
          '|switch|p2a: Gholdengo|Gholdengo, L50|100/100', '|move|p2a: Gholdengo|Make It Rain|p1a: Pelipper'].join('\n'), 'Bolt') }
    ];
    specs.forEach(function (sp) {
      if (store.entries.some(function (e) { return e.key === sp.key; })) return;
      var game = P.parseLog(sp.log, { source: 'demo', when: sp.when, format: 'doubles' });
      game.p1.eloStart = sp.eloYou[0]; game.p1.eloEnd = sp.eloYou[1];
      game.p2.eloStart = sp.eloFoe[0]; game.p2.eloEnd = sp.eloFoe[1];
      var entry = makeEntry(sp.key, 'demo', '', game, { side: 'p1' });
      store.entries.push(entry);
    });
    if (!store.entries.some(function (e) { return e.key === 'demo:bl'; })) {
      var bl = P.adaptBattleLog({
        id: 'demo-bl', created: T0 + 24 * 3600000, youName: 'Rattata', foeName: 'Joey', format: 'doubles', winner: 'you',
        party: { you: [{ species: 'Pikachu' }, { species: 'Charizard' }, { species: 'Garchomp' }, { species: 'Pelipper' }], foe: [{ species: 'Rattata' }, { species: 'Pidgey' }] },
        events: [
          { kind: 'send', side: 'you', species: 'Charizard', lead: true },
          { kind: 'send', side: 'you', species: 'Pikachu', lead: true },
          { kind: 'send', side: 'foe', species: 'Rattata', lead: true },
          { kind: 'send', side: 'foe', species: 'Pidgey', lead: true },
          { kind: 'turn' },
          { kind: 'move', side: 'you', species: 'Pikachu', move: 'Thunderbolt' },
          { kind: 'move', side: 'you', species: 'Charizard', move: 'Heat Wave' },
          { kind: 'move', side: 'foe', species: 'Rattata', move: 'Quick Attack' },
          { kind: 'switch', side: 'you', species: 'Garchomp', lead: false },
          { kind: 'move', side: 'you', species: 'Garchomp', move: 'Earthquake' }
        ]
      });
      var be = makeEntry('demo:bl', 'demo', '', bl, { side: 'p1' });
      store.entries.push(be);
    }
    if (!store.names) store.names = 'Rattata';
    persist();
    A.toast(t('demoIn'));
    render();
  }
  function clearDemo() {
    store.entries = store.entries.filter(function (e) { return e.source !== 'demo' && e.key.indexOf('demo:') !== 0; });
    persist();
    A.toast(t('demoOut'));
    render();
  }

  function backup() {
    var dump = JSON.stringify({ kind: 'rattata-match', v: 1, names: store.names, teamId: store.teamId, entries: store.entries }, null, 2);
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([dump], { type: 'application/json' }));
    a.download = 'match-analyse.json';
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  }

  function problems() {
    var out = [];
    var seen = {};
    store.entries.forEach(function (e) {
      if (seen[e.key]) out.push({ entry: e, code: 'dup', text: t('errDup', e.key) });
      seen[e.key] = 1;
      if (e.error && e.error.code === 'bad') out.push({ entry: e, code: 'bad', text: t('errBad', e.error.detail || e.key) });
      if (e.error && e.error.code === 'fetch') out.push({ entry: e, code: 'fetch', text: t('errFetch', e.error.detail || '', e.url || e.key) });
      if (e.game && !yourSide(e)) out.push({ entry: e, code: 'side', text: t('errSide', (e.game.p1.name || '?') + ' / ' + (e.game.p2.name || '?')) });
      if (e.game && !e.game.winner && yourSide(e)) out.push({ entry: e, code: 'win', text: t('errWin', (viewed(e).foe.name || e.key)) });
    });
    return out;
  }

  var tests = null;
  function runTests() { tests = P.selfTest(); return tests; }

  // ---------------- render ----------------
  var root = null;
  function render() {
    root = document.getElementById('matchView');
    if (!root) return;
    ensureTeam();
    root.innerHTML = '';
    var head = el('div', { class: 'nz-head' });
    head.appendChild(el('h2', { text: t('title') }));
    head.appendChild(el('span', { class: 'hint', text: t('sub') }));
    root.appendChild(head);
    root.appendChild(renderBar());
    if (location.hash === '#matchtest') root.appendChild(renderTest(true));
    var tabs = el('div', { class: 'nz-tabs' });
    [['games', t('tabGames')], ['series', t('tabSeries')], ['usage', t('tabUsage')], ['match', t('tabMatch')], ['moves', t('tabMoves')], ['check', t('tabCheck')]].forEach(function (x) {
      var b = el('button', { class: store.tab === x[0] ? 'on' : '', text: x[1] });
      b.addEventListener('click', function () { store.tab = x[0]; persist(); render(); });
      tabs.appendChild(b);
    });
    root.appendChild(tabs);
    var body = el('div', { class: 'ma-body' });
    root.appendChild(body);
    if (store.tab === 'series') renderSeries(body);
    else if (store.tab === 'usage') renderUsage(body);
    else if (store.tab === 'match') renderMatchups(body);
    else if (store.tab === 'moves') renderMoves(body);
    else if (store.tab === 'check') renderCheck(body);
    else renderGames(body);
  }

  function fieldSelect(label, value, options, on) {
    var wrap = el('label', { class: 'ma-field' });
    wrap.appendChild(el('span', { text: label }));
    var sel = el('select');
    options.forEach(function (o) {
      var op = el('option', { value: o[0], text: o[1] });
      sel.appendChild(op);
    });
    sel.value = value || '';
    sel.addEventListener('change', function () { on(sel.value); });
    wrap.appendChild(sel);
    return wrap;
  }
  function renderBar() {
    var bar = el('div', { class: 'ma-bar' });
    var list = teams();
    var opts = list.map(function (tm) { return [tm.id, tm.name || tm.id]; });
    if (!opts.length) opts = [['', t('teamNone')]];
    bar.appendChild(fieldSelect(t('team'), store.teamId, opts, function (v) { store.teamId = v; persist(); render(); }));
    var names = el('label', { class: 'ma-field ma-names' });
    names.appendChild(el('span', { text: t('names') }));
    var inp = el('input', { type: 'text', value: store.names || '', placeholder: t('namesPh') });
    inp.addEventListener('change', function () { store.names = inp.value; persist(); render(); });
    names.appendChild(inp);
    names.title = t('namesHint');
    bar.appendChild(names);
    var rows = counted();
    var rec = recordOf(rows);
    var sum = el('div', { class: 'ma-sum' });
    if (!rec.n) sum.appendChild(el('span', { class: 'hint', text: t('noGames') }));
    else {
      var games = el('span');
      games.appendChild(el('b', { text: String(rec.n) }));
      games.appendChild(document.createTextNode(' ' + (de ? 'Spiele' : 'games')));
      sum.appendChild(games);
      var sc = el('span');
      sc.appendChild(el('span', { class: 'ma-win', text: String(rec.w) }));
      sc.appendChild(document.createTextNode('–'));
      sc.appendChild(el('span', { class: 'ma-loss', text: String(rec.l) }));
      sum.appendChild(sc);
      sum.appendChild(el('span', { text: pct(rec.w, rec.n) }));
    }
    bar.appendChild(sum);
    return bar;
  }

  function monRow(list, leadList) {
    var row = el('div', { class: 'ma-mons' });
    (list || []).forEach(function (sp) {
      var cell = el('span', { class: 'ma-mon' + (leadList && hasMon(leadList, sp) ? ' lead' : ''), title: lab(sp) });
      if (!sp || sp.indexOf('*') !== -1) cell.appendChild(el('span', { class: 'ma-q', text: '?' }));
      else cell.appendChild(A.spriteFit(sp));
      row.appendChild(cell);
    });
    if (!list || !list.length) row.appendChild(el('span', { class: 'ma-sub', text: '–' }));
    return row;
  }
  function block(label, node) {
    var b = el('div');
    b.appendChild(el('div', { class: 'ma-lab', text: label }));
    b.appendChild(node);
    return b;
  }
  function sheetTag(sheet) {
    var text = sheet === 'ots' ? t('sheetOts') : sheet === 'cts' ? t('sheetCts') : t('sheetUnk');
    return el('span', { class: 'ma-tag' + (sheet === 'ots' ? ' ots' : ''), text: text });
  }
  function srcTag(source) {
    var text = source === 'battlelog' ? t('srcBattle') : source === 'demo' ? t('srcDemo') : t('srcShowdown');
    return el('span', { class: 'ma-tag', text: text });
  }

  function renderGames(body) {
    var card = el('div', { class: 'panel ma-card' });
    card.appendChild(el('h3', { text: t('importTitle') }));
    var paste = el('textarea', { class: 'ma-paste', id: 'maPaste', placeholder: t('pastePh') });
    card.appendChild(paste);
    var acts = el('div', { class: 'ma-actions' });
    var load = el('button', { class: 'primary-btn', text: t('load') });
    load.addEventListener('click', function () { var v = paste.value; paste.value = ''; importText(v); });
    acts.appendChild(load);
    var logs = el('button', { class: 'tbtn', text: t('fromLog') });
    logs.addEventListener('click', importStoredLogs);
    acts.appendChild(logs);
    var demo = el('button', { class: 'tbtn', text: t('demo') });
    demo.addEventListener('click', loadDemo);
    acts.appendChild(demo);
    if (store.entries.some(function (e) { return e.source === 'demo'; })) {
      var clr = el('button', { class: 'tbtn', text: t('clearDemo') });
      clr.addEventListener('click', clearDemo);
      acts.appendChild(clr);
    }
    var save = el('button', { class: 'tbtn', text: t('backup') });
    save.addEventListener('click', backup);
    acts.appendChild(save);
    var file = el('input', { type: 'file', accept: 'application/json,.json' });
    file.hidden = true;
    file.addEventListener('change', function () {
      var f = file.files && file.files[0];
      if (!f) return;
      var rd = new FileReader();
      rd.onload = function () { importJson(String(rd.result || '')); };
      rd.readAsText(f);
    });
    var rest = el('button', { class: 'tbtn', text: t('restore') });
    rest.addEventListener('click', function () { file.click(); });
    acts.appendChild(rest);
    acts.appendChild(file);
    acts.appendChild(el('span', { class: 'ma-busy', id: 'maBusy', text: busy }));
    card.appendChild(acts);
    card.appendChild(el('p', { class: 'ma-note', text: t('cors') }));
    card.appendChild(el('p', { class: 'ma-note', text: t('logHint') }));
    body.appendChild(card);

    var choices = speciesChoices();
    var f = store.filters;
    function setF(k) { return function (v) { store.filters[k] = v; persist(); render(); }; }
    var spec = function (cur) { return [['', t('any')]].concat(choices.map(function (o) { return [o.value, o.label]; })); };
    var box = el('div', { class: 'panel ma-card' });
    var grid = el('div', { class: 'ma-filters' });
    grid.appendChild(fieldSelect(t('fResult'), f.result, [['', t('any')], ['win', t('fWin')], ['loss', t('fLoss')]], setF('result')));
    grid.appendChild(fieldSelect(t('fOppTeam'), f.oppTeam, spec(), setF('oppTeam')));
    grid.appendChild(fieldSelect(t('fOppLead'), f.oppLead, spec(), setF('oppLead')));
    grid.appendChild(fieldSelect(t('fOppBack'), f.oppBack, spec(), setF('oppBack')));
    grid.appendChild(fieldSelect(t('fMyLead'), f.myLead, spec(), setF('myLead')));
    grid.appendChild(fieldSelect(t('fMyBack'), f.myBack, spec(), setF('myBack')));
    grid.appendChild(fieldSelect(t('fMyUsed'), f.myUsed, spec(), setF('myUsed')));
    grid.appendChild(fieldSelect(t('fSheet'), f.sheet, [['', t('any')], ['ots', t('sheetOts')], ['cts', t('sheetCts')]], setF('sheet')));
    grid.appendChild(fieldSelect(t('fMega'), f.mega, [['', t('any')], ['mega', t('megaOnly')], ['tera', t('teraOnly')]], setF('mega')));
    grid.appendChild(fieldSelect(t('fMegaMon'), f.megaMon, spec(), setF('megaMon')));
    var elo = el('label', { class: 'ma-field' });
    elo.appendChild(el('span', { text: t('fElo') }));
    var eloIn = el('input', { type: 'number', min: '0', step: '1', value: f.minElo });
    eloIn.addEventListener('change', function () { store.filters.minElo = eloIn.value; persist(); render(); });
    elo.appendChild(eloIn);
    grid.appendChild(elo);
    var reset = el('button', { class: 'tbtn ma-go', text: t('reset') });
    reset.addEventListener('click', function () { store.filters = freshFilters(); persist(); render(); });
    grid.appendChild(reset);
    box.appendChild(grid);
    body.appendChild(box);

    var all = [];
    store.entries.forEach(function (e) { if (e.game) all.push({ entry: e, v: viewed(e) }); });
    all.sort(function (a, b) { return ((b.v && b.v.when) || 0) - ((a.v && a.v.when) || 0); });
    var shown = all.filter(function (r) { if (!r.v) return !filtersOn(); return pass(r.v); });
    var head = el('div', { class: 'ma-line' });
    var rec = recordOf(shown.map(function (r) { return r.v; }).filter(Boolean));
    head.appendChild(el('strong', { text: t('shown', shown.length, all.length) }));
    if (rec.n) head.appendChild(el('span', { text: t('shownRec', rec.w, rec.l, pct(rec.w, rec.n)) }));
    body.appendChild(head);

    if (!all.length) { body.appendChild(el('p', { class: 'ma-note', text: t('empty') })); return; }
    if (!shown.length) { body.appendChild(el('p', { class: 'ma-note', text: t('emptyFilter') })); return; }
    var list = el('div', { class: 'panel ma-list' });
    shown.forEach(function (r) { list.appendChild(renderGame(r)); });
    body.appendChild(list);
  }

  function renderGame(r) {
    var e = r.entry, v = r.v, open = store.sel === e.id;
    var wrap = el('div');
    var btn = el('button', { class: 'ma-game' + (open ? ' on' : '') });
    var res = el('div', { class: 'ma-res ' + (v ? v.result : 'unk'), text: v ? letter(v.result) : '!' });
    btn.appendChild(res);
    var who = el('div');
    who.appendChild(el('div', { class: 'ma-opp', text: v ? (v.foe.name || '–') : ((e.game && (e.game.p1.name + ' / ' + e.game.p2.name)) || (e.error && e.error.detail) || e.key) }));
    var sub = v ? eloText(v.foe) : t('warnSide');
    if (sub) who.appendChild(el('div', { class: 'ma-sub', text: sub }));
    btn.appendChild(who);
    if (v) {
      var team = (v.foe.team && v.foe.team.length) ? v.foe.team : v.foe.brought;
      btn.appendChild(block(t('teamOf'), monRow(team, v.foe.leads)));
      var leads = el('div', { class: 'ma-line' });
      leads.appendChild(monRow(v.you.leads));
      leads.appendChild(el('span', { class: 'ma-sub', text: t('vs') }));
      leads.appendChild(monRow(v.foe.leads));
      btn.appendChild(block(t('leads'), leads));
    } else {
      btn.appendChild(el('div'));
      btn.appendChild(el('div'));
    }
    var tags = el('div', { class: 'ma-tags' });
    if (v) tags.appendChild(sheetTag(v.sheet));
    tags.appendChild(srcTag(e.source));
    if (e.source === 'demo' && e.game && e.game.source === 'battlelog') tags.appendChild(srcTag('battlelog'));
    if (v && v.you.megas && v.you.megas.length) tags.appendChild(el('span', { class: 'ma-tag', text: t('mega') }));
    if (v && v.you.tera && v.you.tera.species) tags.appendChild(el('span', { class: 'ma-tag', text: t('tera') }));
    if (!v) tags.appendChild(el('span', { class: 'ma-tag bad', text: '!' }));
    btn.appendChild(tags);
    btn.addEventListener('click', function () { store.sel = open ? '' : e.id; persist(); render(); });
    wrap.appendChild(btn);
    if (open) wrap.appendChild(renderDetail(r));
    return wrap;
  }

  function typePill(type) {
    var s = el('span', { class: 'ma-type', text: A.nType(type) });
    var c = A.TYPE_COLORS[type];
    if (c) { s.style.background = c; s.style.color = A.DARK_TEXT_TYPES[type] ? '#1b1d21' : '#fff'; }
    return s;
  }
  function renderDetail(r) {
    var e = r.entry, v = r.v, g = e.game;
    var box = el('div', { class: 'ma-detail' });
    if (!v) {
      box.appendChild(el('p', { class: 'ma-note', text: t('warnSide') }));
    } else {
      var grid = el('div', { class: 'ma-detail-grid' });
      grid.appendChild(block(t('picks') + ' · ' + t('you'), monRow(v.you.brought, v.you.leads)));
      grid.appendChild(block(t('backYou'), monRow(v.you.back)));
      grid.appendChild(block(t('backFoe'), monRow(v.foe.back)));
      var extra = el('div');
      extra.appendChild(el('div', { class: 'ma-lab', text: t('mega') + ' / ' + t('tera') }));
      var line = el('div', { class: 'ma-line' });
      (v.you.megas || []).forEach(function (m) { line.appendChild(el('span', { text: lab(m.species) + (m.item ? ' (' + A.nItem(m.item) + ')' : '') })); });
      if (v.you.tera && v.you.tera.species) {
        line.appendChild(el('span', { text: lab(v.you.tera.species) }));
        if (v.you.tera.type) line.appendChild(typePill(v.you.tera.type));
      }
      (v.foe.megas || []).forEach(function (m) { line.appendChild(el('span', { class: 'ma-sub', text: t('foe') + ': ' + lab(m.species) })); });
      if (v.foe.tera && v.foe.tera.species) line.appendChild(el('span', { class: 'ma-sub', text: t('foe') + ': ' + lab(v.foe.tera.species) + (v.foe.tera.type ? ' ' + A.nType(v.foe.tera.type) : '') }));
      if (!line.childNodes.length) line.appendChild(el('span', { class: 'ma-sub', text: '–' }));
      extra.appendChild(line);
      if (eloText(v.you)) extra.appendChild(el('div', { class: 'ma-sub', text: t('you') + ' ' + t('elo') + ' ' + eloText(v.you) }));
      grid.appendChild(extra);
      box.appendChild(grid);
      var mv = el('div', { class: 'ma-moves' });
      Object.keys(v.you.moves || {}).forEach(function (sp) {
        var bag = v.you.moves[sp];
        Object.keys(bag).forEach(function (move) {
          mv.appendChild(el('span', { text: lab(sp) + ' · ' + A.nMove(move) + ' ×' + bag[move] }));
        });
      });
      if (mv.childNodes.length) box.appendChild(mv);
      (v.warnings || []).forEach(function (w) {
        var msg = w === 'partial-team' ? t('partial') : w === 'no-sheet' ? t('noSheet') : w === 'no-elo' ? t('noElo') : w === 'no-winner' ? t('noWin') : '';
        if (msg) box.appendChild(el('p', { class: 'ma-note', text: msg }));
      });
      if (v.url) {
        var a = el('a', { href: v.url, target: '_blank', rel: 'noopener', text: t('openReplay') });
        box.appendChild(a);
      }
    }
    var side = el('label', { class: 'ma-field' });
    side.appendChild(el('span', { text: t('side') }));
    var sel = el('select');
    var opts = [['', t('sideAuto')]];
    if (g) { opts.push(['p1', g.p1.name || 'P1']); opts.push(['p2', g.p2.name || 'P2']); }
    opts.forEach(function (o) { sel.appendChild(el('option', { value: o[0], text: o[1] })); });
    sel.value = e.side || '';
    sel.addEventListener('change', function () { e.side = sel.value; persist(); render(); });
    sel.addEventListener('click', function (ev) { ev.stopPropagation(); });
    side.appendChild(sel);
    var row = el('div', { class: 'ma-line' });
    row.appendChild(side);
    function chk(label, key) {
      var c = el('label', { class: 'ma-chk' });
      var i = el('input', { type: 'checkbox' });
      i.checked = !!e[key];
      i.addEventListener('change', function () { e[key] = i.checked; persist(); });
      c.appendChild(i);
      c.appendChild(el('span', { text: label }));
      return c;
    }
    row.appendChild(chk(t('split'), 'splitBefore'));
    row.appendChild(chk(t('bo1'), 'alone'));
    var del = el('button', { class: 'tbtn danger', text: t('del') });
    del.addEventListener('click', function () {
      if (!window.confirm(t('delConfirm'))) return;
      store.entries = store.entries.filter(function (x) { return x.id !== e.id; });
      if (store.sel === e.id) store.sel = '';
      persist();
      render();
    });
    row.appendChild(del);
    box.appendChild(row);
    return box;
  }

  function seriesRows() {
    var rows = [];
    store.entries.forEach(function (e) {
      var v = viewed(e);
      if (!v) return;
      rows.push({ key: e.key, foe: v.foe.name || '', result: v.result, when: v.when, splitBefore: !!e.splitBefore, alone: !!e.alone, entry: e, v: v });
    });
    return P.groupSeries(rows);
  }
  function renderSeries(body) {
    body.appendChild(el('p', { class: 'ma-note', text: t('seriesHint') }));
    var sets = seriesRows();
    if (!sets.length) { body.appendChild(el('p', { class: 'ma-note', text: t('seriesEmpty') })); return; }
    var grid = el('div', { class: 'ma-series' });
    sets.forEach(function (set) {
      var cls = set.wins > set.losses ? 'ma-set' : set.wins < set.losses ? 'ma-set loss' : 'ma-set tie';
      var card = el('article', { class: 'panel ' + cls });
      var top = el('div', { class: 'ma-set-top' });
      top.appendChild(el('div', { class: 'ma-opp', text: t('seriesVs', set.foe || '–') }));
      top.appendChild(el('div', { class: 'ma-set-score', text: set.wins + '–' + set.losses }));
      card.appendChild(top);
      var full = null;
      set.games.forEach(function (g) { if (!full && g.v.foe.team && g.v.foe.team.length >= 6) full = g.v.foe.team; });
      if (!full && set.games[0]) full = set.games[0].v.foe.team.length ? set.games[0].v.foe.team : set.games[0].v.foe.brought;
      card.appendChild(monRow(full || []));
      var pips = el('div', { class: 'ma-pips' });
      set.games.forEach(function (g) {
        var b = el('button', { class: 'tbtn ma-pip ' + g.result, text: letter(g.result), title: (g.v.you.leads || []).map(lab).join(' + ') });
        b.addEventListener('click', function () { store.tab = 'games'; store.sel = g.entry.id; persist(); render(); });
        pips.appendChild(b);
      });
      card.appendChild(pips);
      card.appendChild(el('div', { class: 'ma-sub', text: set.games.length === 1 ? (de ? '1 Spiel' : '1 game') : t('gamesShort', set.games.length) }));
      grid.appendChild(card);
    });
    body.appendChild(grid);
  }

  function statTable(cols, rows) {
    var wrap = el('div', { class: 'panel ma-table-wrap' });
    var table = el('table', { class: 'ma-table' });
    var thead = el('thead'), hr = el('tr');
    cols.forEach(function (c) { hr.appendChild(el('th', { text: c })); });
    thead.appendChild(hr);
    table.appendChild(thead);
    var tb = el('tbody');
    rows.forEach(function (cells) {
      var tr = el('tr');
      cells.forEach(function (c, i) {
        var td = el('td');
        if (i === 0 && c && c.species) {
          var cell = el('div', { class: 'ma-moncell' });
          cell.appendChild(A.spriteFit(c.species));
          cell.appendChild(el('span', { text: lab(c.species) }));
          td.appendChild(cell);
        } else td.textContent = c == null ? '–' : String(c);
        tr.appendChild(td);
      });
      tb.appendChild(tr);
    });
    table.appendChild(tb);
    wrap.appendChild(table);
    return wrap;
  }
  function renderUsage(body) {
    var rows = counted();
    var team = teamMons();
    var tm = currentTeam();
    body.appendChild(el('p', { class: 'ma-note', text: t('usageHint') }));
    body.appendChild(el('p', { class: 'ma-note', text: team.length && tm ? t('usageTeam', tm.name || '') : t('usageSeen') }));
    var rates = sheetRates(rows);
    var sheet = el('div', { class: 'panel ma-card' });
    sheet.appendChild(el('h3', { text: t('sheetTitle') }));
    if (!rates.ots.n && !rates.cts.n) sheet.appendChild(el('p', { class: 'ma-note', text: t('sheetNone') }));
    else {
      if (rates.ots.n) sheet.appendChild(el('div', { text: t('otsLine', rates.ots.w, rates.ots.n, pct(rates.ots.w, rates.ots.n)) }));
      if (rates.cts.n) sheet.appendChild(el('div', { text: t('ctsLine', rates.cts.w, rates.cts.n, pct(rates.cts.w, rates.cts.n)) }));
    }
    body.appendChild(sheet);
    var subjects = team.length ? team : (function () {
      var map = {};
      rows.forEach(function (v) { (v.you.brought || []).forEach(function (sp) { map[P.idOf(sp)] = { species: sp, moves: [] }; }); });
      return Object.keys(map).map(function (k) { return map[k]; });
    })();
    var table = usageTable(rows, subjects);
    body.appendChild(statTable(
      [t('colMon'), t('colBrought'), t('colWins'), t('colWr'), t('colUse'), t('colLead'), t('colLeadW'), t('colLeadWr'), t('colMega'), t('colMegaWr'), t('colTera'), t('colTeraWr')],
      table.map(function (r) {
        return [r.mon, r.brought, r.wins, pct(r.wins, r.brought), pct(r.brought, r.games), r.lead, r.leadW, pct(r.leadW, r.lead), r.mega, pct(r.megaW, r.mega), r.tera, pct(r.teraW, r.tera)];
      })
    ));
    if (team.length) {
      var extra = {};
      rows.forEach(function (v) {
        (v.you.brought || []).forEach(function (sp) {
          if (team.some(function (m) { return sameMon(m.species, sp); })) return;
          extra[P.idOf(sp)] = { species: P.baseFor(sp), moves: [] };
        });
      });
      var extras = Object.keys(extra).map(function (k) { return extra[k]; });
      if (extras.length) {
        body.appendChild(el('h3', { text: t('otherMons') }));
        var more = usageTable(rows, extras);
        body.appendChild(statTable(
          [t('colMon'), t('colBrought'), t('colWins'), t('colWr')],
          more.map(function (r) { return [r.mon, r.brought, r.wins, pct(r.wins, r.brought)]; })
        ));
      }
    }
    body.appendChild(el('h3', { text: t('leadsTitle') }));
    var combos = leadCombos(rows);
    if (!combos.length) body.appendChild(el('p', { class: 'ma-note', text: t('sheetNone') }));
    else body.appendChild(statTable(
      [t('colPair'), t('colLed'), t('colWins'), t('colWr')],
      combos.map(function (c) { return [lab(c.a) + ' + ' + lab(c.b), c.n, c.w, pct(c.w, c.n)]; })
    ));
  }

  function callout(title, lines) {
    var card = el('div', { class: 'panel' });
    card.appendChild(el('h3', { text: title }));
    if (!lines.length) card.appendChild(el('p', { class: 'ma-note', text: t('need4') }));
    lines.forEach(function (text) { card.appendChild(el('div', { text: text })); });
    return card;
  }
  function renderMatchups(body) {
    body.appendChild(el('p', { class: 'ma-note', text: t('matchHint') }));
    var rows = matchups(counted());
    var faced = rows.filter(function (r) { return r.brought >= 4; }).sort(function (a, b) {
      return (b.wins / b.brought) - (a.wins / a.brought) || b.brought - a.brought;
    });
    var best = faced.slice(0, 3);
    var worst = faced.slice().reverse().filter(function (r) { return best.indexOf(r) === -1; }).slice(0, 3);
    var att = rows.filter(function (r) { return r.present >= 4; }).sort(function (a, b) { return (b.brought / b.present) - (a.brought / a.present); });
    var line = function (r, kind) {
      if (kind === 'att') return lab(r.species) + ' · ' + r.brought + '/' + r.present + ' · ' + pct(r.brought, r.present);
      return lab(r.species) + ' · ' + r.wins + '/' + r.brought + ' · ' + pct(r.wins, r.brought);
    };
    var calls = el('div', { class: 'ma-call' });
    calls.appendChild(callout(t('best'), best.map(function (r) { return line(r); })));
    calls.appendChild(callout(t('worst'), worst.map(function (r) { return line(r); })));
    calls.appendChild(callout(t('attHigh'), att.slice(0, 3).map(function (r) { return line(r, 'att'); })));
    calls.appendChild(callout(t('attLow'), att.slice().reverse().slice(0, 3).map(function (r) { return line(r, 'att'); })));
    body.appendChild(calls);
    if (!rows.length) { body.appendChild(el('p', { class: 'ma-note', text: t('empty') })); return; }
    body.appendChild(statTable(
      [t('colMon'), t('colPresent'), t('colFaced'), t('colBeat'), t('colWr'), t('colAtt')],
      rows.map(function (r) { return [{ species: r.species }, r.present || '–', r.brought, r.wins, pct(r.wins, r.brought), r.present ? pct(r.brought, r.present) : '–']; })
    ));
  }

  function renderMoves(body) {
    body.appendChild(el('p', { class: 'ma-note', text: t('movesHint') }));
    var rows = counted();
    var team = teamMons();
    var subjects = team.slice();
    if (!subjects.length) {
      var map = {};
      rows.forEach(function (v) { Object.keys(v.you.moves || {}).forEach(function (sp) { map[P.idOf(sp)] = { species: sp, moves: [] }; }); });
      subjects = Object.keys(map).map(function (k) { return map[k]; });
    }
    if (!subjects.length) { body.appendChild(el('p', { class: 'ma-note', text: t('movesNone') })); return; }
    subjects.forEach(function (mon) {
      var counts = {};
      rows.forEach(function (v) {
        var bag = movesFor(v.you, mon.species);
        Object.keys(bag).forEach(function (mv) { counts[mv] = (counts[mv] || 0) + bag[mv]; });
      });
      var names = (mon.moves || []).slice();
      Object.keys(counts).forEach(function (mv) { if (names.indexOf(mv) === -1) names.push(mv); });
      names.sort(function (a, b) { return (counts[b] || 0) - (counts[a] || 0); });
      var card = el('div', { class: 'panel ma-card' });
      var title = el('div', { class: 'ma-line' });
      title.appendChild(A.spriteFit(mon.species));
      title.appendChild(el('h3', { text: lab(mon.species) }));
      card.appendChild(title);
      if (!names.length) card.appendChild(el('p', { class: 'ma-note', text: t('movesNone') }));
      else card.appendChild(statTable([de ? 'Attacke' : 'Move', de ? 'Mal' : 'Times'], names.map(function (mv) { return [A.nMove(mv), counts[mv] || 0]; })));
      body.appendChild(card);
    });
  }

  function renderTest(force) {
    var res = tests || (force ? runTests() : null);
    if (!res) return el('div');
    var box = el('div', { class: 'ma-test ' + (res.ok ? 'ok' : 'bad'), text: (res.ok ? t('testOk', res.n) : t('testBad', res.fails.length)) + (res.ok ? '' : '\n' + res.fails.join('\n')) });
    return box;
  }
  function renderCheck(body) {
    body.appendChild(el('p', { class: 'ma-note', text: t('checkHint') }));
    var list = problems();
    if (!list.length) body.appendChild(el('p', { class: 'ma-note', text: t('checkOk') }));
    var box = el('div', { class: 'ma-issues' });
    list.forEach(function (p) {
      var row = el('div', { class: 'ma-issue' });
      row.appendChild(el('span', { text: p.text }));
      var del = el('button', { class: 'tbtn', text: t('del') });
      del.addEventListener('click', function () {
        store.entries = store.entries.filter(function (e) { return e.id !== p.entry.id; });
        persist();
        render();
      });
      row.appendChild(del);
      box.appendChild(row);
    });
    body.appendChild(box);
    if (store.notices.length) {
      body.appendChild(el('h3', { text: t('notices') }));
      var notes = el('div', { class: 'ma-issues' });
      store.notices.forEach(function (n) {
        var row = el('div', { class: 'ma-issue' });
        var text = n.code === 'dup' ? t('errDup', n.detail) : n.detail;
        row.appendChild(el('span', { text: text }));
        var x = el('button', { class: 'tbtn', text: t('dismiss') });
        x.addEventListener('click', function () { store.notices = store.notices.filter(function (i) { return i.id !== n.id; }); persist(); render(); });
        row.appendChild(x);
        notes.appendChild(row);
      });
      body.appendChild(notes);
    }
    var limits = el('div', { class: 'panel ma-card' });
    limits.appendChild(el('h3', { text: t('limitsTitle') }));
    limits.appendChild(el('p', { class: 'ma-note', text: t('limits') }));
    var btn = el('button', { class: 'tbtn', text: t('testRun') });
    btn.addEventListener('click', function () { runTests(); render(); });
    limits.appendChild(btn);
    if (tests) limits.appendChild(renderTest(false));
    body.appendChild(limits);
  }

  window.CCMatch = {
    render: render,
    importBattleLog: function (obj) {
      var list = obj && Array.isArray(obj.logs) ? obj.logs : [obj];
      var r = importBattleObjects(list);
      if (r.n || r.u) persist();
      if (document.body.dataset.view === 'match') render();
      return r.n + r.u;
    },
    selfTest: function () { return runTests(); }
  };
})();

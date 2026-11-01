// Team-Analyse: alle Spiele eines Teambuilder-Teams als ein Bericht.
// Einträge liegen unter localStorage "cc_match", je Spiel mit teamId.
// Quelle sind Showdown-Replays, gelesen über js/match_parse.js.
(function () {
  'use strict';
  var A = window.CC;
  var P = window.CCMatchParse;
  if (!A || !P) return;
  var el = A.el, de = A.LANG === 'de';

  var S = de ? {
    title: 'Team-Analyse',
    sub: 'Ein Team aus dem Teambuilder, alle Spiele dazu: Showdown-Replays in einem Bericht.',
    team: 'Team', teamNone: 'Kein Team im Teambuilder', teamPick: 'Team wählen …',
    names: 'Showdown-Namen', namesPh: 'Namen, mit Komma getrennt',
    namesHint: 'Daran erkennt das Tool deine Seite. Leer lassen geht, wenn das gewählte Team im Replay vorkommt.',
    gamesN: '{0} Spiele', record: '{0}–{1}', noGames: 'Noch keine Spiele',
    tabGames: 'Spiele', tabSeries: 'Serien', tabUsage: 'Nutzung', tabMatch: 'Matchups', tabMoves: 'Attacken', tabCheck: 'Prüfen',
    secEntries: 'Replay-Einträge', secUsage: 'Nutzung', secLeads: 'Lead-Paare', secMatch: 'Matchups', secMoves: 'Attacken', secGbg: 'Spiel für Spiel', secSeries: 'Serie für Serie', secCheck: 'Prüfen',
    assigned: '{0} Spiele diesem Team zugeordnet', loose: '{0} Spiele ohne Team', claim: 'Diesem Team geben',
    noTeam: 'Leg im Teambuilder zuerst ein Team an. Die sechs Pokémon sind der Bericht.',
    importTitle: 'Spiele hinzufügen',
    pastePh: 'Ein Replay-Link pro Zeile\nhttps://replay.pokemonshowdown.com/…\n\nOder ein Showdown-Log oder ein Replay-JSON hier einfügen.',
    load: 'Übernehmen', demo: 'Beispiel laden', clearDemo: 'Beispiele entfernen',
    backup: 'Sichern', restore: 'Datei laden',
    cors: 'Replays lädt der Browser direkt von replay.pokemonshowdown.com. Die Seite erlaubt das von anderen Seiten aus. Klappt der Abruf nicht (privates Replay, kein Netz), das .json oder den Log-Text oben einfügen.',
    loadingN: 'Lade {0} von {1} …', addedN: '{0} neu, {1} doppelt, {2} fehlgeschlagen',
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
    empty: 'Noch nichts ausgewertet. Links einfügen oder das Beispiel laden.',
    emptyFilter: 'Kein Spiel passt auf den Filter.',
    teamOf: 'Team', leads: 'Leads', you: 'Du', foe: 'Gegner', back: 'Back',
    sheetOts: 'Offen', sheetCts: 'Zu', sheetUnk: 'Sheet ?',
    srcShowdown: 'Replay', srcDemo: 'Beispiel',
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
    testRun: 'Parser prüfen', testOk: 'Parser: {0} Prüfungen in Ordnung.', testBad: 'Parser: {0} Prüfung(en) fehlgeschlagen.',
    vs: 'gegen', backYou: 'Dein Back', backFoe: 'Gegner-Back', picks: 'Eingesetzt'
  } : {
    title: 'Team-Analyse',
    sub: 'One teambuilder team, every game with it: Showdown replays in a single report.',
    team: 'Team', teamNone: 'No team in the teambuilder', teamPick: 'Choose a team …',
    names: 'Showdown names', namesPh: 'Names, separated by commas',
    namesHint: 'This is how the tool finds your side. Leaving it empty is fine when the chosen team appears in the replay.',
    gamesN: '{0} games', record: '{0}–{1}', noGames: 'No games yet',
    tabGames: 'Games', tabSeries: 'Series', tabUsage: 'Usage', tabMatch: 'Matchups', tabMoves: 'Moves', tabCheck: 'Check',
    secEntries: 'Replay entries', secUsage: 'Usage', secLeads: 'Lead pairs', secMatch: 'Matchups', secMoves: 'Moves', secGbg: 'Game by game', secSeries: 'Match by match', secCheck: 'Check',
    assigned: '{0} games filed under this team', loose: '{0} games with no team', claim: 'Add to this team',
    noTeam: 'Build a team in the teambuilder first. Those six Pokémon are the report.',
    importTitle: 'Add games',
    pastePh: 'One replay link per line\nhttps://replay.pokemonshowdown.com/…\n\nOr paste a Showdown log or a replay JSON here.',
    load: 'Add', demo: 'Load sample', clearDemo: 'Remove samples',
    backup: 'Save', restore: 'Load file',
    cors: 'The browser loads replays directly from replay.pokemonshowdown.com. That site allows other pages to read them. If a fetch fails (private replay, no network), paste the .json or the log text above.',
    loadingN: 'Loading {0} of {1} …', addedN: '{0} new, {1} duplicate, {2} failed',
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
    empty: 'Nothing analysed yet. Paste links or load the sample.',
    emptyFilter: 'No game matches the filter.',
    teamOf: 'Team', leads: 'Leads', you: 'You', foe: 'Foe', back: 'Back',
    sheetOts: 'Open', sheetCts: 'Closed', sheetUnk: 'Sheet ?',
    srcShowdown: 'Replay', srcDemo: 'Sample',
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
    return { v: 2, names: '', teamId: '', tab: 'report', sel: '', filters: freshFilters(), entries: [], notices: [] };
  }
  var store = A.load('cc_match', null);
  if (!store || !Array.isArray(store.entries)) store = fresh();
  if (!store.filters) store.filters = freshFilters();
  if (!store.notices) store.notices = [];
  Object.keys(freshFilters()).forEach(function (k) { if (store.filters[k] == null) store.filters[k] = ''; });
  var legacyTeam = (!store.v || store.v < 2) ? (store.teamId || '') : '';
  store.v = 2;
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
  function monsOf(tm) {
    if (!tm) return [];
    return (tm.mons || []).map(function (m) {
      var forme = m.set && m.set.forme;
      var sp = forme && A.DEX[forme] && forme.indexOf('Mega ') !== 0 ? forme : m.species;
      var moves = ((m.set && m.set.moves) || []).filter(function (mv) { return mv && mv !== '(No Move)'; });
      return { species: sp, moves: moves };
    }).filter(function (m) { return m.species && A.DEX[m.species]; });
  }
  function teamMons() { return monsOf(currentTeam()); }
  function bestOverlap(side) {
    var best = 0;
    teams().forEach(function (tm) { var n = overlap(side, monsOf(tm)); if (n > best) best = n; });
    return best;
  }
  function guessSide(entry) {
    if (!entry || !entry.game) return '';
    if (entry.side === 'p1' || entry.side === 'p2') return entry.side;
    var names = nameList(), g = entry.game;
    var h1 = nameHit(g.p1.name, names), h2 = nameHit(g.p2.name, names);
    if (h1 && !h2) return 'p1';
    if (h2 && !h1) return 'p2';
    var a = bestOverlap(g.p1), b = bestOverlap(g.p2);
    if (a > b) return 'p1';
    if (b > a) return 'p2';
    var mine = teamMons();
    if (mine.length) {
      var s1 = overlap(g.p1, mine), s2 = overlap(g.p2, mine);
      if (s1 > s2) return 'p1';
      if (s2 > s1) return 'p2';
    }
    return '';
  }
  // File the game under the teambuilder team whose Pokémon match the player's side.
  // preferId wins a tie. A match needs at least two of that team's Pokémon.
  function assignEntry(entry, preferId) {
    if (!entry || entry.pinned) return;
    if (!entry.game) { entry.teamId = entry.teamId || preferId || store.teamId || ''; return; }
    var sideName = guessSide(entry);
    if (sideName) entry.side = sideName;
    var side = sideName === 'p2' ? entry.game.p2 : sideName === 'p1' ? entry.game.p1 : null;
    if (!side) { entry.teamId = preferId || store.teamId || entry.teamId || ''; return; }
    var best = null, bestN = 0;
    teams().forEach(function (tm) {
      var n = overlap(side, monsOf(tm));
      if (n > bestN) { bestN = n; best = tm; }
    });
    var min = 2;
    if (preferId) {
      var pref = null;
      teams().forEach(function (tm) { if (tm.id === preferId) pref = tm; });
      var pn = pref ? overlap(side, monsOf(pref)) : 0;
      if (pn >= min && pn === bestN) { entry.teamId = preferId; return; }
    }
    if (best && bestN >= min) { entry.teamId = best.id; return; }
    entry.teamId = preferId || store.teamId || entry.teamId || '';
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
  function yourSide(entry) { return guessSide(entry); }
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

  function teamEntries() {
    return store.entries.filter(function (e) { return e.teamId === store.teamId; });
  }
  function counted() {
    var out = [];
    teamEntries().forEach(function (e) {
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
    teamEntries().forEach(function (e) {
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
      teamId: extra.teamId || '', pinned: !!extra.pinned,
      splitBefore: false, alone: false, game: game || null
    };
  }
  function notice(code, detail) {
    store.notices.unshift({ id: nid(), code: code, detail: detail || '', at: Date.now() });
    store.notices = store.notices.slice(0, 40);
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
      var entry = makeEntry(key, 'showdown', game.url, game);
      assignEntry(entry, store.teamId);
      if (entry.teamId) batchTeams[entry.teamId] = 1;
      store.entries.push(entry);
      cb('ok');
    }, function (err) {
      store.entries.push(makeEntry(key, 'showdown', 'https://replay.pokemonshowdown.com/' + id, null, { error: { code: 'fetch', detail: String(err && err.message || err) } }));
      cb('fail');
    });
  }
  var batchTeams = {};
  function runIds(ids, done) {
    var i = 0, added = 0, dup = 0, failed = 0;
    batchTeams = {};
    function next() {
      if (i >= ids.length) {
      var idsPicked = Object.keys(batchTeams);
      if (idsPicked.length === 1) store.teamId = idsPicked[0];
      persist(); setBusy(''); done({ added: added, dup: dup, failed: failed }); return;
    }
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
    var entry = makeEntry(key, 'showdown', '', game);
    assignEntry(entry, store.teamId);
    if (entry.teamId) store.teamId = entry.teamId;
    store.entries.push(entry);
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
          if (!e.teamId && !e.pinned) assignEntry(e, store.teamId);
          if (e.teamId) store.teamId = e.teamId;
          store.entries.push(e);
          added++;
        });
        return;
      }
      if (typeof obj.log === 'string') {
        var game = P.parseReplayJson(obj);
        var key = 'sd:' + (game.replayId || ('json:' + P.hashText(obj.log)));
        if (store.entries.some(function (e) { return e.key === key; })) { notice('dup', key); return; }
        var entry = makeEntry(key, 'showdown', game.url, game);
        assignEntry(entry, store.teamId);
        if (entry.teamId) store.teamId = entry.teamId;
        store.entries.push(entry);
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
      var entry = makeEntry(sp.key, 'demo', '', game, { side: 'p1', teamId: store.teamId || '', pinned: true });
      store.entries.push(entry);
    });
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
    var dump = JSON.stringify({ kind: 'rattata-match', v: 2, names: store.names, teamId: store.teamId, entries: store.entries }, null, 2);
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([dump], { type: 'application/json' }));
    a.download = 'team-analyse.json';
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  }

  function problems() {
    var out = [];
    var seen = {};
    teamEntries().forEach(function (e) {
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
  function migrateTeams() {
    var dirty = false;
    store.entries.forEach(function (e) {
      if (!e || e.pinned || e.teamId) return;
      var before = e.teamId || '';
      assignEntry(e, legacyTeam || store.teamId);
      if ((e.teamId || '') !== before) dirty = true;
    });
    legacyTeam = '';
    if (dirty) persist();
  }
  function wrClass(w, n) {
    if (!n) return 'wr';
    var p = 100 * w / n;
    return 'wr ' + (p >= 60 ? 'hi' : p >= 45 ? 'mid' : 'lo');
  }
  function cell(text, cls) { return { text: text == null ? '' : String(text), cls: cls || '' }; }
  function wrCell(w, n) { return cell(pct(w, n), wrClass(w, n)); }
  function nodeCell(node, cls) { return { node: node, cls: cls || '' }; }

  function icons(list, slots) {
    var row = el('div', { class: 'ta-icons' });
    var arr = (list || []).slice();
    if (slots) while (arr.length < slots) arr.push('');
    arr.forEach(function (sp) {
      var c = el('span', { class: 'ta-ic' + (sp ? '' : ' empty'), title: sp ? lab(sp) : '' });
      if (sp && String(sp).indexOf('*') === -1) c.appendChild(A.spriteFit(sp));
      else if (sp) c.appendChild(el('span', { class: 'ta-q', text: '?' }));
      row.appendChild(c);
    });
    if (!arr.length) row.appendChild(el('span', { class: 'ma-sub', text: '–' }));
    return row;
  }
  function monLabel(sp) {
    var box = el('span', { class: 'ta-mon' });
    if (sp && String(sp).indexOf('*') === -1) box.appendChild(A.spriteFit(sp));
    box.appendChild(el('span', { text: lab(sp) }));
    return box;
  }
  function sheet(headers, rows) {
    var wrap = el('div', { class: 'ta-sheet' });
    var table = el('table');
    var hr = el('tr');
    headers.forEach(function (h, i) {
      var th = el('th', { text: h });
      if (i === 0) th.className = 'left';
      hr.appendChild(th);
    });
    var thead = el('thead'); thead.appendChild(hr); table.appendChild(thead);
    var tb = el('tbody');
    rows.forEach(function (cells) {
      var tr = el('tr');
      cells.forEach(function (c, i) {
        var td = el('td');
        if (i === 0 && (!c || !c.cls)) td.className = 'left';
        if (c && typeof c === 'object' && c.node) { td.appendChild(c.node); if (c.cls) td.className = ((td.className ? td.className + ' ' : '') + c.cls).trim(); }
        else if (c && typeof c === 'object' && Object.prototype.hasOwnProperty.call(c, 'text')) { td.className = c.cls || ''; td.textContent = c.text; }
        else td.textContent = c == null ? '' : String(c);
        tr.appendChild(td);
      });
      tb.appendChild(tr);
    });
    table.appendChild(tb);
    wrap.appendChild(table);
    return wrap;
  }
  function section(id, title, hint) {
    var s = el('section', { class: 'ta-sec', id: 'ta-' + id });
    s.appendChild(el('h3', { text: title }));
    if (hint) s.appendChild(el('p', { class: 'ma-note', text: hint }));
    return s;
  }
  function teamRows() {
    return teamEntries().filter(function (e) { return e.game; }).map(function (e) { return { entry: e, v: viewed(e) }; })
      .sort(function (a, b) { return ((a.v && a.v.when) || a.entry.added || 0) - ((b.v && b.v.when) || b.entry.added || 0); });
  }
  function fieldSelect(label, value, options, on) {
    var wrap = el('label', { class: 'ma-field' });
    wrap.appendChild(el('span', { text: label }));
    var sel = el('select');
    options.forEach(function (o) { sel.appendChild(el('option', { value: o[0], text: o[1] })); });
    sel.value = value || '';
    sel.addEventListener('change', function () { on(sel.value); });
    wrap.appendChild(sel);
    return wrap;
  }

  function render() {
    root = document.getElementById('matchView');
    if (!root) return;
    ensureTeam();
    migrateTeams();
    root.innerHTML = '';
    var head = el('div', { class: 'nz-head' });
    head.appendChild(el('h2', { text: t('title') }));
    head.appendChild(el('span', { class: 'hint', text: t('sub') }));
    root.appendChild(head);
    if (location.hash === '#matchtest') root.appendChild(renderTest(true));
    var body = el('div', { class: 'ma-body ta-report' });
    root.appendChild(body);
    body.appendChild(renderHero());
    body.appendChild(renderImport());
    var loose = store.entries.filter(function (e) { return e.game && !e.teamId; });
    if (loose.length && store.teamId) {
      var bar = el('div', { class: 'ta-loose' });
      bar.appendChild(el('span', { text: t('loose', loose.length) }));
      var claim = el('button', { class: 'tbtn', text: t('claim') });
      claim.addEventListener('click', function () {
        loose.forEach(function (e) { e.teamId = store.teamId; e.pinned = true; });
        persist(); render();
      });
      bar.appendChild(claim);
      body.appendChild(bar);
    }
    var jumps = el('nav', { class: 'ta-jumps' });
    [[t('secEntries'), 'entries'], [t('secUsage'), 'usage'], [t('secLeads'), 'leads'], [t('secMatch'), 'matchups'], [t('secMoves'), 'moves'], [t('secGbg'), 'gbg'], [t('secSeries'), 'series'], [t('secCheck'), 'check']].forEach(function (j) {
      var a = el('a', { href: '#ta-' + j[1], text: j[0] });
      jumps.appendChild(a);
    });
    body.appendChild(jumps);
    body.appendChild(renderEntries());
    body.appendChild(renderUsage());
    body.appendChild(renderLeads());
    body.appendChild(renderMatchups());
    body.appendChild(renderMoves());
    body.appendChild(renderGbg());
    body.appendChild(renderSeries());
    body.appendChild(renderCheck());
  }

  function renderHero() {
    var tm = currentTeam(), mons = teamMons(), rows = counted(), rec = recordOf(rows), rates = sheetRates(rows);
    var box = el('header', { class: 'ta-hero panel' });
    var top = el('div', { class: 'ta-hero-top' });
    var list = teams();
    var opts = list.map(function (x) { return [x.id, (x.name || x.id) + ' (' + store.entries.filter(function (e) { return e.teamId === x.id && e.game; }).length + ')']; });
    if (!opts.length) opts = [['', t('teamNone')]];
    top.appendChild(fieldSelect(t('team'), store.teamId, opts, function (v) { store.teamId = v; persist(); render(); }));
    var names = el('label', { class: 'ma-field ma-names' });
    names.appendChild(el('span', { text: t('names') }));
    var inp = el('input', { type: 'text', value: store.names || '', placeholder: t('namesPh'), title: t('namesHint') });
    inp.addEventListener('change', function () { store.names = inp.value; persist(); render(); });
    names.appendChild(inp);
    top.appendChild(names);
    var recBox = el('div', { class: 'ta-record' });
    recBox.appendChild(el('div', { class: 'ta-record-n', text: rec.n ? (rec.w + '–' + rec.l) : '–' }));
    recBox.appendChild(el('div', { class: 'ta-record-p ' + wrClass(rec.w, rec.n), text: rec.n ? pct(rec.w, rec.n) : t('noGames') }));
    recBox.appendChild(el('div', { class: 'ma-sub', text: rec.n ? t('gamesN', rec.n) : '' }));
    top.appendChild(recBox);
    box.appendChild(top);
    if (!list.length) box.appendChild(el('p', { class: 'ma-note', text: t('noTeam') }));
    else {
      var six = el('div', { class: 'ta-six' });
      var name = el('div', { class: 'ta-teamname', text: tm ? (tm.name || '') : '' });
      six.appendChild(name);
      six.appendChild(icons(mons.map(function (m) { return m.species; }), 6));
      box.appendChild(six);
    }
    var mini = el('div', { class: 'ta-sheet ta-mini' });
    mini.appendChild(sheet(
      [t('sheetTitle'), de ? 'Siege' : 'Wins', de ? 'Spiele' : 'Games', t('colWr')],
      [
        [t('sheetOts'), rates.ots.w || 0, rates.ots.n || 0, wrCell(rates.ots.w, rates.ots.n)],
        [t('sheetCts'), rates.cts.w || 0, rates.cts.n || 0, wrCell(rates.cts.w, rates.cts.n)]
      ]
    ));
    box.appendChild(mini);
    return box;
  }

  function renderImport() {
    var card = el('div', { class: 'panel ma-card' });
    card.appendChild(el('h3', { text: t('importTitle') }));
    var paste = el('textarea', { class: 'ma-paste', placeholder: t('pastePh') });
    card.appendChild(paste);
    var acts = el('div', { class: 'ma-actions' });
    function btn(cls, label, fn) { var b = el('button', { class: cls, text: label }); b.addEventListener('click', fn); return b; }
    acts.appendChild(btn('primary-btn', t('load'), function () { var v = paste.value; paste.value = ''; importText(v); }));
    acts.appendChild(btn('tbtn', t('demo'), loadDemo));
    if (teamEntries().some(function (e) { return e.source === 'demo'; })) acts.appendChild(btn('tbtn', t('clearDemo'), clearDemo));
    acts.appendChild(btn('tbtn', t('backup'), backup));
    var file = el('input', { type: 'file', accept: 'application/json,.json' });
    file.hidden = true;
    file.addEventListener('change', function () {
      var f = file.files && file.files[0];
      if (!f) return;
      var rd = new FileReader();
      rd.onload = function () { importJson(String(rd.result || '')); };
      rd.readAsText(f);
    });
    acts.appendChild(btn('tbtn', t('restore'), function () { file.click(); }));
    acts.appendChild(file);
    acts.appendChild(el('span', { class: 'ma-busy', id: 'maBusy', text: busy }));
    card.appendChild(acts);
    card.appendChild(el('p', { class: 'ma-note', text: t('cors') }));
    return card;
  }

  function resultCell(result) {
    var cls = result === 'win' ? 'ta-wl win' : result === 'loss' ? 'ta-wl loss' : 'ta-wl';
    return cell(result ? letter(result) : '?', cls);
  }
  function renderEntries() {
    var sec = section('entries', t('secEntries'), de
      ? 'Jedes Spiel dieses Teams. W oder L und die sechs des Gegners, wie in der Teamvorschau.'
      : 'Every game with this team. W or L and the opponent’s six, as in team preview.');
    var rows = teamRows();
    if (!rows.length) { sec.appendChild(el('p', { class: 'ma-note', text: t('empty') })); return sec; }
    sec.appendChild(sheet(
      ['#', de ? 'Erg.' : 'Res.', t('foe'), t('teamOf'), de ? 'Quelle' : 'Source', ''],
      rows.map(function (r, i) {
        var v = r.v, foeTeam = v ? ((v.foe.team && v.foe.team.length) ? v.foe.team : v.foe.brought) : [];
        var src = r.entry.source === 'demo' ? t('srcDemo') : t('srcShowdown');
        var del = el('button', { class: 'tbtn', text: '×', title: t('del') });
        del.addEventListener('click', function () {
          store.entries = store.entries.filter(function (e) { return e.id !== r.entry.id; });
          persist(); render();
        });
        return [
          String(i + 1),
          v ? resultCell(v.result) : cell('!', 'ta-wl loss'),
          v ? (v.foe.name || '–') : ((r.entry.game.p1.name || '?') + ' / ' + (r.entry.game.p2.name || '?')),
          nodeCell(icons(foeTeam)),
          src,
          nodeCell(del)
        ];
      })
    ));
    return sec;
  }

  function renderUsage() {
    var sec = section('usage', t('secUsage'), t('usageHint'));
    var rows = counted(), team = teamMons(), tm = currentTeam();
    sec.appendChild(el('p', { class: 'ma-note', text: team.length && tm ? t('usageTeam', tm.name || '') : t('usageSeen') }));
    var subjects = team.length ? team : (function () {
      var map = {};
      rows.forEach(function (v) { (v.you.brought || []).forEach(function (sp) { map[P.idOf(sp)] = { species: sp, moves: [] }; }); });
      return Object.keys(map).map(function (k) { return map[k]; });
    })();
    var table = usageTable(rows, subjects);
    sec.appendChild(sheet(
      [t('colMon'), t('colBrought'), t('colWins'), t('colWr'), t('colUse'), t('colLead'), t('colLeadW'), t('colLeadWr'), t('colMega'), t('colMegaWr'), t('colTera'), t('colTeraWr')],
      table.map(function (r) {
        return [
          nodeCell(monLabel(r.mon.species), 'left'),
          r.brought, r.wins, wrCell(r.wins, r.brought), wrCell(r.brought, r.games),
          r.lead, r.leadW, wrCell(r.leadW, r.lead),
          r.mega, wrCell(r.megaW, r.mega), r.tera, wrCell(r.teraW, r.tera)
        ];
      })
    ));
    return sec;
  }
  function renderLeads() {
    var sec = section('leads', t('secLeads'), de ? 'Wie oft dieses Lead-Paar eröffnet hat und wie oft das Spiel gewonnen wurde.' : 'How often this lead pair was brought and how often the game was won.');
    var combos = leadCombos(counted());
    if (!combos.length) { sec.appendChild(el('p', { class: 'ma-note', text: t('sheetNone') })); return sec; }
    sec.appendChild(sheet(
      [t('colPair'), t('colLed'), t('colWins'), t('colWr')],
      combos.map(function (c) {
        return [nodeCell(icons([c.a, c.b]), 'left'), c.n, c.w, wrCell(c.w, c.n)];
      })
    ));
    return sec;
  }
  function renderMatchups() {
    var sec = section('matchups', t('secMatch'), t('matchHint'));
    var rows = matchups(counted());
    if (!rows.length) { sec.appendChild(el('p', { class: 'ma-note', text: t('empty') })); return sec; }
    sec.appendChild(sheet(
      [t('colMon'), t('colPresent'), t('colFaced'), t('colBeat'), t('colWr'), t('colAtt')],
      rows.map(function (r) {
        return [
          nodeCell(monLabel(r.species), 'left'),
          r.present || '–', r.brought, r.wins,
          wrCell(r.wins, r.brought),
          r.present ? wrCell(r.brought, r.present) : cell('–')
        ];
      })
    ));
    return sec;
  }
  function renderMoves() {
    var sec = section('moves', t('secMoves'), t('movesHint'));
    var rows = counted(), team = teamMons();
    var subjects = team.slice();
    if (!subjects.length) {
      var map = {};
      rows.forEach(function (v) { Object.keys(v.you.moves || {}).forEach(function (sp) { map[P.idOf(sp)] = { species: sp, moves: [] }; }); });
      subjects = Object.keys(map).map(function (k) { return map[k]; });
    }
    if (!subjects.length) { sec.appendChild(el('p', { class: 'ma-note', text: t('movesNone') })); return sec; }
    var grid = el('div', { class: 'ta-movegrid' });
    subjects.forEach(function (mon) {
      var counts = {};
      rows.forEach(function (v) {
        var bag = movesFor(v.you, mon.species);
        Object.keys(bag).forEach(function (mv) { counts[mv] = (counts[mv] || 0) + bag[mv]; });
      });
      var names = (mon.moves || []).slice();
      Object.keys(counts).forEach(function (mv) { if (names.indexOf(mv) === -1) names.push(mv); });
      names.sort(function (a, b) { return (counts[b] || 0) - (counts[a] || 0); });
      var card = el('div', { class: 'ta-movecard' });
      card.appendChild(monLabel(mon.species));
      if (!names.length) card.appendChild(el('p', { class: 'ma-note', text: t('movesNone') }));
      else card.appendChild(sheet([de ? 'Attacke' : 'Move', de ? 'Mal' : 'Times'], names.map(function (mv) { return [A.nMove(mv), counts[mv] || 0]; })));
      grid.appendChild(card);
    });
    sec.appendChild(grid);
    return sec;
  }
  function renderGbg() {
    var sec = section('gbg', t('secGbg'), de
      ? 'Filter gelten nur für diese Tabelle. Nutzung, Leads und Matchups zählen alle Spiele des Teams.'
      : 'Filters apply only to this table. Usage, leads and matchups count every game with the team.');
    var choices = speciesChoices();
    var spec = [['', t('any')]].concat(choices.map(function (o) { return [o.value, o.label]; }));
    var f = store.filters;
    function setF(k) { return function (v) { store.filters[k] = v; persist(); render(); }; }
    var grid = el('div', { class: 'ma-filters' });
    grid.appendChild(fieldSelect(t('fResult'), f.result, [['', t('any')], ['win', t('fWin')], ['loss', t('fLoss')]], setF('result')));
    grid.appendChild(fieldSelect(t('fOppTeam'), f.oppTeam, spec, setF('oppTeam')));
    grid.appendChild(fieldSelect(t('fOppLead'), f.oppLead, spec, setF('oppLead')));
    grid.appendChild(fieldSelect(t('fOppBack'), f.oppBack, spec, setF('oppBack')));
    grid.appendChild(fieldSelect(t('fMyLead'), f.myLead, spec, setF('myLead')));
    grid.appendChild(fieldSelect(t('fMyBack'), f.myBack, spec, setF('myBack')));
    grid.appendChild(fieldSelect(t('fMyUsed'), f.myUsed, spec, setF('myUsed')));
    grid.appendChild(fieldSelect(t('fSheet'), f.sheet, [['', t('any')], ['ots', t('sheetOts')], ['cts', t('sheetCts')]], setF('sheet')));
    grid.appendChild(fieldSelect(t('fMega'), f.mega, [['', t('any')], ['mega', t('megaOnly')], ['tera', t('teraOnly')]], setF('mega')));
    grid.appendChild(fieldSelect(t('fMegaMon'), f.megaMon, spec, setF('megaMon')));
    var elo = el('label', { class: 'ma-field' });
    elo.appendChild(el('span', { text: t('fElo') }));
    var eloIn = el('input', { type: 'number', min: '0', step: '1', value: f.minElo });
    eloIn.addEventListener('change', function () { store.filters.minElo = eloIn.value; persist(); render(); });
    elo.appendChild(eloIn);
    grid.appendChild(elo);
    var reset = el('button', { class: 'tbtn', text: t('reset') });
    reset.addEventListener('click', function () { store.filters = freshFilters(); persist(); render(); });
    grid.appendChild(reset);
    sec.appendChild(grid);
    var all = teamRows();
    var shown = all.filter(function (r) { if (!r.v) return !filtersOn(); return pass(r.v); });
    var rec = recordOf(shown.map(function (r) { return r.v; }).filter(Boolean));
    sec.appendChild(el('p', { class: 'ma-note', text: t('shown', shown.length, all.length) + (rec.n ? ' · ' + t('shownRec', rec.w, rec.l, pct(rec.w, rec.n)) : '') }));
    if (!shown.length) { sec.appendChild(el('p', { class: 'ma-note', text: all.length ? t('emptyFilter') : t('empty') })); return sec; }
    sec.appendChild(sheet(
      ['#', de ? 'Erg.' : 'Res.', t('foe'), t('elo'), t('teamOf'), t('leads') + ' · ' + t('you'), t('backYou'), t('leads') + ' · ' + t('foe'), t('backFoe'), t('mega') + '/' + t('tera'), t('fSheet')],
      shown.map(function (r, i) {
        var v = r.v;
        if (!v) return [String(i + 1), cell('!', 'ta-wl loss'), r.entry.key, '', '', '', '', '', '', '', ''];
        var mega = (v.you.megas || []).map(function (m) { return lab(m.species); }).join(', ');
        var tera = v.you.tera && v.you.tera.species ? (lab(v.you.tera.species) + (v.you.tera.type ? ' ' + A.nType(v.you.tera.type) : '')) : '';
        var tag = [mega, tera].filter(Boolean).join(' · ') || '–';
        var sheetName = v.sheet === 'ots' ? t('sheetOts') : v.sheet === 'cts' ? t('sheetCts') : '–';
        return [
          String(i + 1), resultCell(v.result), v.foe.name || '–', eloText(v.foe) || '–',
          nodeCell(icons((v.foe.team && v.foe.team.length) ? v.foe.team : v.foe.brought)),
          nodeCell(icons(v.you.leads)), nodeCell(icons(v.you.back)),
          nodeCell(icons(v.foe.leads)), nodeCell(icons(v.foe.back)),
          tag, sheetName
        ];
      })
    ));
    return sec;
  }
  function renderSeries() {
    var sec = section('series', t('secSeries'), t('seriesHint'));
    var rows = [];
    teamEntries().forEach(function (e) {
      var v = viewed(e);
      if (!v) return;
      rows.push({ key: e.key, foe: v.foe.name || '', result: v.result, when: v.when, splitBefore: !!e.splitBefore, alone: !!e.alone, entry: e, v: v });
    });
    var sets = P.groupSeries(rows);
    if (!sets.length) { sec.appendChild(el('p', { class: 'ma-note', text: t('seriesEmpty') })); return sec; }
    sec.appendChild(sheet(
      ['#', de ? 'Serie' : 'Series', t('foe'), t('teamOf'), 'G1', 'G2', 'G3'],
      sets.map(function (set, i) {
        var full = null;
        set.games.forEach(function (g) { if (!full && g.v.foe.team && g.v.foe.team.length >= 6) full = g.v.foe.team; });
        if (!full) full = set.games[0].v.foe.team.length ? set.games[0].v.foe.team : set.games[0].v.foe.brought;
        var gcell = function (n) {
          var g = set.games[n];
          return g ? resultCell(g.result) : cell('');
        };
        var score = set.wins + '–' + set.losses;
        var cls = set.wins > set.losses ? 'ta-wl win' : set.wins < set.losses ? 'ta-wl loss' : 'ta-wl';
        return [String(i + 1), cell(score, cls), set.foe || '–', nodeCell(icons(full || [])), gcell(0), gcell(1), gcell(2)];
      })
    ));
    return sec;
  }
  function renderTest(force) {
    var res = tests || (force ? runTests() : null);
    if (!res) return el('div');
    return el('div', { class: 'ma-test ' + (res.ok ? 'ok' : 'bad'), text: (res.ok ? t('testOk', res.n) : t('testBad', res.fails.length)) + (res.ok ? '' : '\n' + res.fails.join('\n')) });
  }
  function renderCheck() {
    var sec = section('check', t('secCheck'), t('checkHint'));
    var list = problems();
    if (!list.length) sec.appendChild(el('p', { class: 'ma-note', text: t('checkOk') }));
    list.forEach(function (p) {
      var row = el('div', { class: 'ma-issue' });
      row.appendChild(el('span', { text: p.text }));
      var del = el('button', { class: 'tbtn', text: t('del') });
      del.addEventListener('click', function () {
        store.entries = store.entries.filter(function (e) { return e.id !== p.entry.id; });
        persist(); render();
      });
      row.appendChild(del);
      sec.appendChild(row);
    });
    if (store.notices.length) {
      sec.appendChild(el('h3', { text: t('notices') }));
      store.notices.forEach(function (n) {
        var row = el('div', { class: 'ma-issue' });
        row.appendChild(el('span', { text: n.code === 'dup' ? t('errDup', n.detail) : n.detail }));
        var x = el('button', { class: 'tbtn', text: t('dismiss') });
        x.addEventListener('click', function () { store.notices = store.notices.filter(function (i) { return i.id !== n.id; }); persist(); render(); });
        row.appendChild(x);
        sec.appendChild(row);
      });
    }
    var btn = el('button', { class: 'tbtn', text: t('testRun') });
    btn.addEventListener('click', function () { runTests(); render(); });
    sec.appendChild(btn);
    if (tests) sec.appendChild(renderTest(false));
    return sec;
  }

  window.CCMatch = {
    render: render,
    selfTest: function () { return runTests(); }
  };
})();

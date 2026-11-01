(function () {
  'use strict';
  var C = window.Calc;

  // ======================= data =======================
  var DEX = {};
  Object.keys(POKEDEX_CHAMPIONS).forEach(function (k) { if (POKEDEX_CHAMPIONS[k] && POKEDEX_CHAMPIONS[k].bs) DEX[k] = POKEDEX_CHAMPIONS[k]; });
  var MOVES = {};
  Object.keys(MOVES_CHAMPIONS).forEach(function (k) { if (MOVES_CHAMPIONS[k]) MOVES[k] = MOVES_CHAMPIONS[k]; });
  MOVES['(No Move)'] = { bp: 0, type: 'Normal', category: 'Status' };
  var MOVE_NAMES = Object.keys(MOVES).filter(function (m) { return m !== '(No Move)'; }).sort();
  MOVE_NAMES.unshift('(No Move)');
  var ITEMS = ITEMS_CHAMPIONS.slice().sort(); ITEMS.unshift('(none)');
  var ABILITIES = ABILITIES_CHAMPIONS.slice().sort();
  var ONLINE = window.Online || null;
  var ONLINE_SETS = (ONLINE && ONLINE.sets) || {};
  // a downloaded NCP setdex replaces the bundled one (it is the newer version of the same file)
  var SETDEX = ONLINE_SETS.ncp || window.SETDEX_GEN10 || {};
  var REG_NAME = (ONLINE && ONLINE.reg && ONLINE.reg.name) ? ONLINE.reg.name.replace(/^VGC \d+ /, '') : 'Reg M-C';

  var formeToBase = {};
  Object.keys(DEX).forEach(function (k) {
    (DEX[k].formes || []).forEach(function (f) { if (f !== k || !formeToBase[f]) formeToBase[f] = k; });
  });
  function baseOf(name) { return formeToBase[name] && formeToBase[name] !== name ? formeToBase[name] : name; }
  function formesOf(base) {
    var f = DEX[base] && DEX[base].formes;
    return (f && f.length) ? f.filter(function (x) { return DEX[x]; }) : [base];
  }
  var SPECIES = Object.keys(DEX).filter(function (k) { return baseOf(k) === k; }).sort();

  function idOf(s) { return (s || '').toLowerCase().replace(/[^a-z0-9]/g, ''); }
  var DEX_BY_ID = {}; Object.keys(DEX).forEach(function (k) { DEX_BY_ID[idOf(k)] = k; });
  var MOVE_BY_ID = {}; Object.keys(MOVES).forEach(function (k) { MOVE_BY_ID[idOf(k)] = k; });
  var ITEM_BY_ID = {}; ITEMS.forEach(function (k) { ITEM_BY_ID[idOf(k)] = k; });
  var ABIL_BY_ID = {}; ABILITIES.forEach(function (k) { ABIL_BY_ID[idOf(k)] = k; });

  // ---------- legal moves / abilities (Champions learnsets from data/learnsets_champ.js) ----------
  var HAS_LEARN = typeof CHAMP_LEARN !== 'undefined';
  // NCP names megas "Mega Charizard X", Showdown uses "charizardmegax"
  function shId(name) {
    var m = /^Mega (.+?)(?: ([XYZ]))?$/.exec(name || '');
    return m ? idOf(m[1]) + 'mega' + (m[2] ? m[2].toLowerCase() : '') : idOf(name);
  }
  function learnKey(name) {
    var c = [shId(name), idOf(name), shId(baseOf(name)), idOf(baseOf(name)), idOf(baseOf(name).replace(/-.*$/, ''))];
    for (var i = 0; i < c.length; i++) {
      if (CHAMP_LEARN[c[i]]) return c[i];
      var p = CHAMP_PARENT[c[i]];
      if (p && CHAMP_LEARN[p]) return p;
    }
    return null;
  }
  var legalCache = {};
  // moves this forme can learn in Champions, or null when there is no data (then all moves are offered)
  function legalMoves(forme) {
    if (!HAS_LEARN || !forme) return null;
    var key = learnKey(forme);
    if (!key) return null;
    if (!legalCache[key]) {
      var seen = {};
      legalCache[key] = CHAMP_LEARN[key].split(' ').map(function (id) { return MOVE_BY_ID[id]; })
        .filter(function (m) { if (!m || seen[m]) return false; seen[m] = 1; return true; });
    }
    return legalCache[key];
  }
  // Showdown names default formes without suffix ("Lycanroc-Midday" -> lycanroc) and Meowstic megas by gender
  function abilList(forme) {
    var m = /^Mega (\S+)$/.exec(forme);
    return CHAMP_ABIL[shId(forme)] || CHAMP_ABIL[idOf(forme)] ||
      (m ? CHAMP_ABIL[idOf(m[1]) + 'mmega'] : CHAMP_ABIL[idOf(forme.replace(/-[^-]+$/, ''))]);
  }
  function legalAbilities(forme) {
    if (!HAS_LEARN || !forme) return null;
    var out = [];
    var add = function (a) { a = ABIL_BY_ID[idOf(a)] || a; if (a && out.indexOf(a) === -1) out.push(a); };
    var list = abilList(forme);
    if (!list && forme.indexOf('Mega ') !== 0) list = CHAMP_ABIL[shId(baseOf(forme))] || CHAMP_ABIL[idOf(baseOf(forme))];
    (list || []).forEach(add);
    if (DEX[forme] && DEX[forme].ab) add(DEX[forme].ab);
    return out.length ? out : null;
  }

  var NATURE_NAMES = Object.keys(C.NATURES).sort();
  var STATUSES = ['Healthy', 'Poisoned', 'Badly Poisoned', 'Burned', 'Paralyzed', 'Asleep', 'Frozen'];
  var STATUS_DE = { Healthy: 'Gesund', Poisoned: 'Vergiftet', 'Badly Poisoned': 'Schwer vergiftet', Burned: 'Verbrannt', Paralyzed: 'Paralysiert', Asleep: 'Schlafend', Frozen: 'Eingefroren' };

  // ======================= storage =======================
  function load(key, def) { try { var v = JSON.parse(localStorage.getItem(key)); return v == null ? def : v; } catch (e) { return def; } }
  function save(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { /* ignore */ } }

  // ======================= i18n (Deutsch / English) =======================
  var LANG = load('cc_lang', 'de');
  var langParam = location.search.match(/[?&]lang=(de|en)\b/);   // index.html?lang=en
  if (langParam) { LANG = langParam[1]; save('cc_lang', LANG); }
  if (LANG !== 'de' && LANG !== 'en') LANG = 'de';
  var NDE = window.NAMES_DE || { species: {}, moves: {}, items: {}, abilities: {}, types: {}, natures: {} };
  var UI = {
    de: {
      sub: 'VGC 2026 · Level 50 · Stat Points (max. 32 je Wert, 66 gesamt) · Reg M-C',
      importBtn: 'Team importieren', swapBtn: 'Seiten tauschen', swapTitle: 'Beide Seiten komplett tauschen',
      light: 'Helles Design', dark: 'Dunkles Design', langTitle: 'Switch to English',
      copyTitle: 'Klicken zum Kopieren', ownSide: 'Eigene Seite', foe: 'Gegner', sideYou: 'Du', sideFoe: 'Gegner',
      reset: 'Zurücksetzen', resetTitle: 'Gegnerseite leeren und alle Feldeffekte ausschalten (Einzel/Doppel bleibt)',
      resetDone: 'Gegner und Feld zurückgesetzt', choosePokemon: '+ Pokémon wählen',
      emptyHint: 'Kein Pokémon gewählt. Oben suchen oder eins aus dem Team anklicken.',
      setsBtn: 'Sets laden', setsTitle: 'Aktuell beliebte Sets online laden: NCP-Setdex, Usage-Statistik (Smogon/Showdown) und Smogon-Sets',
      regBtn: 'Regulation laden', regTitle: 'Aktuelle Champions-Regulation von Pokémon Showdown laden und neu erlaubte Pokémon, Attacken und Lernsets hinzufügen',
      loading: 'Lädt …', setsDone: 'Sets aktualisiert', regDone: 'Regulation aktualisiert', onlineFail: 'Fehler beim Laden: {0}',
      setsReport: 'Sets aktualisiert ({0})', regReport: 'Regulation: {0}',
      resetOnline: 'Online-Daten zurücksetzen', resetConfirm: 'Heruntergeladene Sets und Regulationsdaten löschen und den Auslieferungszustand wiederherstellen?',
      reloadHint: 'Die Seite lädt neu, damit alles übernommen wird.',
      saveSet: 'Set speichern (eigene Sets)', exportSet: 'Set exportieren (Showdown-Format)', addTeam: 'Zum Team hinzufügen', saveShort: 'Speichern', exportSetShort: 'Export', addTeamShort: 'Zum Team',
      search: 'Pokémon / Set suchen…', type: 'Typ', forme: 'Form', base: 'Base', sp: 'SP', value: 'Wert', stage: 'Stufe',
      nature: 'Wesen', ability: 'Fähigkeit', item: 'Item', status: 'Status', hp: 'KP', crit: 'Volltreffer (Krit)',
      details: 'Details anzeigen', spTotal: 'SP: {0} / {1} (frei: {2})', speedFinal: 'Effektive Initiative: {0}', speedBase: ' (Basis {0})',
      slotEdit: 'Slot {0} bearbeiten', slotActive: 'Aktives Pokémon', slotBench: 'Einwechseln (Singles: nur ein Pokémon aktiv)',
      addPartner: '+ Partner hinzufügen', addPartnerTitle: 'Partner hinzufügen', removePartner: 'Partner entfernen (nur noch ein Pokémon auf dieser Seite)',
      init: 'Init', hpShort: 'KP', vs: 'vs', noFoe: '– kein Gegner –', noFoeSlot: 'Kein Gegner in diesem Slot', clickDetails: 'klicken für Details',
      statusMove: 'Status', turnOrder: 'Zugreihenfolge:', turnOrderTR: 'Zugreihenfolge (Trick Room):', tie: 'Gleich schnell (Zufall)',
      speedTitle: '{0} – Initiative {1}',
      teamLoad: '{0} – klicken zum Laden', toOther: 'Auf die andere Seite laden', removeTeam: 'Aus dem Team entfernen',
      emptySlot: 'Leerer Platz: Team importieren oder „Zum Team“', teamExport: 'Team exportieren', teamClear: 'Team leeren', exportShort: 'Export', clearShort: 'Leeren',
      teamFull: 'Team ist voll (6)', teamAdded: 'Zum Team hinzugefügt', clearConfirm: 'Team {0} leeren?',
      setPrompt: 'Name für das eigene Set von {0}:', setSaved: 'Set „{0}“ gespeichert', mySet: 'Mein Set',
      field: 'Feld', terrain: 'Terrain', weather: 'Wetter', aurasRuin: 'Auren & Ruin', none: 'Keins', side1: 'Seite 1', side2: 'Seite 2',
      spikes: 'Spikes', trickRoom: 'Trick Room', gravity: 'Gravity',
      noHits: 'Keine Treffer', own: 'Eigenes', hits: '{0}× Treffer', hitsAuto: 'auto Treffer', hitsTitle: 'Anzahl Treffer', x2: '×2',
      dmgTaken: 'Schaden', doubleTitle: '{0} → doppelte Stärke',
      importTitle: 'Team-Import (Showdown-Format)', importHint: 'Paste aus Showdown, PokéPaste oder VGCPastes einfügen. EVs: werden automatisch in Stat Points umgerechnet, SPs: werden direkt übernommen.',
      importLeft: 'In linkes Team (eigene Seite)', importRight: 'In rechtes Team (Gegner)', importCustom: 'Als eigene Sets speichern',
      deleteCustom: 'Alle eigenen Sets löschen', deleteConfirm: 'Alle eigenen Sets löschen?', deleted: 'Eigene Sets gelöscht',
      credits: 'Daten: NCP VGC Damage Calculator (Alex Collins / Jake White) · Sprites: Pokémon Showdown · Deutsche Namen: PokeAPI',
      close: 'Schließen', copy: 'Kopieren', copied: 'Kopiert', copyFail: 'Kopieren fehlgeschlagen', exportTitle: 'Set exportieren',
      importNothing: 'Nichts erkannt', unknown: 'unbekannt: {0}', importedCustom: '{0} Set(s) als eigene Sets gespeichert.',
      importedTeam: '{0} Pokémon ins {1} Team importiert.', left: 'linke', right: 'rechte', notAvailable: ' Nicht in Champions verfügbar/unbekannt: {0}',
      switchError: 'Fehler beim Wechseln: {0}',
      charged: 'Geladen (Charge)', chargedT: 'Elektro-Attacken ×2', glaive: 'Glaive Rush genutzt', glaiveT: 'nimmt doppelten Schaden',
      flashFire: 'Flash Fire aktiv', flashFireT: 'Feuer-Attacken ×1.5', analytic: 'Zieht zuletzt (Analytic)', stakeout: 'Ziel eingewechselt (Stakeout)',
      koOwn: 'Eigene Pokémon K.O.', koShort: 'K.O.', hitTimes: 'Wie oft getroffen', hitShort: '× getr.', stockpile: 'Stockpile', stockShort: 'Stock',
      notesNoEffect: 'Keine Wirkung', notesSpread: 'Spread-Attacke (×0.75 im Doppel)',
      importHintH: 'Paste aus Showdown, PokéPaste oder VGCPastes einfügen. <code>EVs:</code> werden automatisch in Stat Points umgerechnet, <code>SPs:</code> werden direkt übernommen. Pastes immer mit englischen Namen.',
      creditsH: 'Daten: <a href="https://github.com/nerd-of-now/NCP-VGC-Damage-Calculator" target="_blank" rel="noopener">NCP VGC Damage Calculator</a> (Alex Collins / Jake White) · Sprites: Pokémon Showdown · Deutsche Namen: PokeAPI',
      notLegal: 'Kann dieses Pokémon in Champions nicht lernen/haben', langBtn: 'EN', singles: 'Einzel', doubles: 'Doppel', blankSet: 'Leeres Set', analyticT: '×1.3', stakeoutT: 'Angriff ×2',
      xPayback: 'Ziel war zuerst dran', xAvalanche: 'Vorher vom Ziel getroffen', xAssurance: 'Ziel diese Runde schon getroffen',
      xFailed: 'Letzte Attacke schlug fehl', xRound: 'Partner nutzte Runde vorher', xLashOut: 'Werte diese Runde gesenkt',
      xFickle: 'Volle Kraft (30 %)', xPhys: 'Erlittener phys. Schaden', xSpec: 'Erlittener spez. Schaden', xTaken: 'Erlittener Schaden',
      sideTitle: '{0} – {1}', ruinTablets: 'Tafeln', ruinVessel: 'Gefäß', ruinSword: 'Schwert', ruinBeads: 'Juwelen',
      statusDesc: '(Status-Attacke)', burned: 'verbrannt', chargedD: 'geladen', boostedBy: 'verstärkt durch {0}', hitsD: '({0} Treffer)',
      inWeather: 'bei {0}', inTerrain: 'auf {0}-Feld', withX: 'mit {0}', throughX: 'durch {0}', afterX: 'nach {0}', onCrit: 'bei Volltreffer',
      and: ' und ', after: ' nach ', recovery: 'Heilung durch {0}', sandDmg: 'Sandsturm-Schaden', burnDmg: 'Verbrennungs-Schaden',
      poisonDmg: 'Gift-Schaden', leechDmg: '{0}-Schaden', spikesN: '{0}× {1}',
      koGuaranteed: 'garantierter {0}', koChance: '{0}% Chance auf {1}', koPossible: 'mögl. 5+HKO', koHazards: 'durch Hazards K.O.',
      stanceNote: '{0} greift in Klingenform an ({1})', fixedTaken: '{0} erlittener Schaden ×{1}',
      navCalc: 'Damage Calculator', navBuilder: 'Teambuilder', navNuz: 'Nuzlocke', navSL: 'Soul Link', navShiny: 'Shiny-Zähler', navMatch: 'Match-Analyse', homeTitle: 'Zum Startbildschirm',
      startShinyText: 'Shiny-Hunts zählen: Quoten für alle Spiele und Methoden, Phasen, Timer, Sammlung, globale Hotkeys, OBS-Overlay und automatische Erkennung (Alpha).',
      startMatchText: 'Showdown-Replays und Kampfprotokolle auswerten: Siege, Leads, Mega und Tera, Nutzungs- und Matchup-Statistik.',
      startSLText: 'Planer für Soul-Link-Runs mit 2–6 Spielern: welche Pokémon verbunden sind, wer im Team ist und wer gestorben ist.',
      startNuzText: 'Rechner für Nuzlockes der 3. bis 5. Generation (GBA und DS) mit Trainern aus der ROM und deiner Box aus dem Spielstand. Frühe Testversion.', startNuzKo: 'Gen 3–5 · Trainer, Box, Schaden',
      winMin: 'Minimieren', winMax: 'Maximieren', winRestore: 'Verkleinern', winClose: 'Schließen',
      startCalcKo: '43,8 % Chance auf OHKO',
      startCalcText: 'Schaden, K.O.-Chancen und Zugreihenfolge im Einzel- und Doppelkampf, mit Wetter, Terrain und allen Feldeffekten.',
      startBuilderText: 'Teams aus bis zu sechs Pokémon zusammenstellen, Sets und Stat Points einstellen, Schwächen prüfen und ins Damage Calc übernehmen.',
      startSub: 'Damage Calculator & Teambuilder für Pokémon Champions',
      startFoot: 'Tasten 1–6 zum Öffnen · Zurück zum Start über das Logo oben links',
      tbTeams: 'Teams', tbNew: '+ Neues Team', tbImport: 'Importieren', tbImportTitle: 'Team importieren (Showdown-Format)',
      tbImportNew: 'Als neues Team', tbImportInto: 'Dieses Team ersetzen', tbExport: 'Exportieren', tbExportTitle: 'Team exportieren',
      tbToCalcYou: 'Ins Damage Calc: Du', tbToCalcFoe: 'Ins Damage Calc: Gegner', tbDuplicate: 'Kopieren', tbDelete: 'Löschen',
      tbDeleteConfirm: 'Team „{0}“ löschen?', tbName: 'Teamname', tbDefaultName: 'Team {0}', tbCopyName: '{0} (Kopie)',
      tbAddMon: '+ Pokémon', tbChoose: 'Pokémon suchen …', tbPreset: 'Set übernehmen …', tbNick: 'Set-Name', tbRemove: 'Entfernen',
      tbMoves: 'Attacken', tbStats: 'Werte auf Level 50', tbMega: 'Mega', tbSpReset: 'SP leeren', tbTotal: 'Summe',
      tbWeak: 'Typ-Abdeckung', tbWeakHint: 'Wie stark jede Angriffstyp-Attacke dein Team trifft (inkl. Fähigkeiten wie Schwebe). Rot = schwach, grün = resistent.',
      tbWeakCol: 'schw.', tbResCol: 'res.', tbEmptyEdit: 'Wähle oben einen Platz oder füge ein Pokémon hinzu.',
      tbSentYou: 'Team ins Damage Calc übernommen (deine Seite)', tbSentFoe: 'Team ins Damage Calc übernommen (Gegnerseite)',
      tbImportDone: '{0} Pokémon importiert', tbLeft: 'Nach links', tbRight: 'Nach rechts', tbNoTeam: 'Noch kein Team',
      tbSpeedTiers: 'Initiative', tbEmptyTeam: 'Das Team ist leer.', tbMonCount: '{0}/6', tbTabMon: 'Pokémon', tbMoveN: 'Attacke {0}', tbPower: 'Stärke {0}', tbAcc: 'Genauigkeit {0} %', tbAccAlways: 'trifft immer', tbNatTitle: 'Wesen wählen', tbNatRevert: 'Zurück zu:', tbNatNeutral: 'neutral, kein Wert verändert', tbFormChange: 'Formwechsel', tbFormChangeT: 'Form im Kampf: Werte und Fähigkeit passen sich an', tbStoneSet: 'Item auf {0} gesetzt', tbLook: 'Aussehen & Form', tbMale: 'Männlich', tbFemale: 'Weiblich', tbAbInForm: 'Fähigkeit als {0}', tbAbNormal: 'normale Form: {0}', tbNormalVal: 'normal {0}', tbLookTitle: 'Aussehen & Form', tbDone: 'Fertig', tbFormsOwn: 'Form', tbFormsOwnHint: 'Regionalformen und andere Formen mit eigenen Werten, Typen oder Fähigkeiten', tbVariant: 'Variante', tbVariantHint: 'Nur das Aussehen ändert sich, Werte und Typen bleiben gleich', tbGender: 'Geschlecht', tbGenderless: 'Dieses Pokémon hat kein Geschlecht.', tbOnlyMale: 'Dieses Pokémon kann nur männlich sein.', tbOnlyFemale: 'Dieses Pokémon kann nur weiblich sein.', tbRatio: 'Verteilung: {0} % männlich, {1} % weiblich', tbNoGender: 'Geschlechtslos', tbRandom: 'Egal', tbNormalColor: 'Normal',
      setTitle: 'Einstellungen', setBtn: 'Einstellungen', setModel: 'Pokémon im Teambuilder', set3d: '3D-Modell (animiert)', setSprite: 'Pixel-Sprite',
      setModelHint: 'Wie das große Bild im Pokémon-Editor angezeigt wird', setTheme: 'Design', setDark: 'Dunkel', setLight: 'Hell',
      setLang: 'Sprache', setLangHint: 'Beim Wechsel der Sprache lädt die App neu, dabei geht nichts verloren.',
      setNav: 'Leiste oben', setNavHint: 'Tabs: nur geöffnete Modi, mit × schließbar. Alle: immer alle Modi. Keine: Wechsel nur über den Startbildschirm (Logo).', setNavTabs: 'Tabs', setNavAll: 'Alle Modi', setNavOff: 'Keine', closeTab: 'Tab schließen (auch mit mittlerer Maustaste)', newTab: 'Weiteren Modus öffnen',
      setStart: 'Beim Öffnen der App', setStartHint: 'Welcher Bildschirm nach dem Start erscheint', setStartScreen: 'Startbildschirm',
      setUpd: 'Updates', setUpdHint: 'Version {0}. Die App sucht bei jedem Start nach einer neuen Version und lädt sie im Hintergrund.',
      setUpdHintP: 'Version {0} (portabel). Die App sucht bei jedem Start nach einer neuen Version und zeigt dann einen Hinweis.',
      updCheck: 'Jetzt suchen', updChecking: 'Suche …', updNone: 'Du hast die neueste Version.', updLoading: 'Version {0} wird geladen …',
      updProgress: 'Version {0} wird geladen … {1} %', updErr: 'Suche fehlgeschlagen: {0}', updOff: 'Updates gibt es nur in der Windows-App.',
      updReady: 'Update {0}: neu starten', updReadyT: 'Rattata Lab {0} ist geladen. Klicken zum Neustarten und Installieren, sonst wird es beim nächsten Beenden installiert.',
      updReadyMsg: 'Version {0} ist geladen und wird beim nächsten Beenden installiert.', updRestart: 'Jetzt neu starten',
      updPortable: 'Update {0} verfügbar', updPortableT: 'Version {0} ist auf GitHub. Die portable Version aktualisiert sich nicht selbst: Klicken öffnet die Download-Seite.',
      updPortableMsg: 'Version {0} ist verfügbar. Die portable Version bitte neu herunterladen.', updDownload: 'Download-Seite'
    },
    en: {
      sub: 'VGC 2026 · Level 50 · Stat Points (max 32 each, 66 total) · Reg M-C',
      importBtn: 'Import team', swapBtn: 'Swap sides', swapTitle: 'Swap both sides completely',
      light: 'Light theme', dark: 'Dark theme', langTitle: 'Auf Deutsch umschalten',
      copyTitle: 'Click to copy', ownSide: 'Your side', foe: 'Opponent', sideYou: 'You', sideFoe: 'Foe',
      reset: 'Reset', resetTitle: 'Clear the opponent side and turn off all field effects (Singles/Doubles stays)',
      resetDone: 'Opponent and field reset', choosePokemon: '+ Choose Pokémon',
      emptyHint: 'No Pokémon selected. Search above or click one in the team.',
      setsBtn: 'Load sets', setsTitle: 'Load currently popular sets online: NCP setdex, usage stats (Smogon/Showdown) and Smogon sets',
      regBtn: 'Load regulation', regTitle: 'Load the current Champions regulation from Pokémon Showdown and add newly allowed Pokémon, moves and learnsets',
      loading: 'Loading …', setsDone: 'Sets updated', regDone: 'Regulation updated', onlineFail: 'Loading failed: {0}',
      setsReport: 'Sets updated ({0})', regReport: 'Regulation: {0}',
      resetOnline: 'Reset online data', resetConfirm: 'Delete downloaded sets and regulation data and restore the bundled state?',
      reloadHint: 'The page reloads so everything takes effect.',
      saveSet: 'Save set (custom sets)', exportSet: 'Export set (Showdown format)', addTeam: 'Add to team', saveShort: 'Save', exportSetShort: 'Export', addTeamShort: 'Add to team',
      search: 'Search Pokémon / set…', type: 'Type', forme: 'Forme', base: 'Base', sp: 'SP', value: 'Stat', stage: 'Stage',
      nature: 'Nature', ability: 'Ability', item: 'Item', status: 'Status', hp: 'HP', crit: 'Critical hit',
      details: 'Show details', spTotal: 'SP: {0} / {1} (left: {2})', speedFinal: 'Effective speed: {0}', speedBase: ' (base {0})',
      slotEdit: 'Edit slot {0}', slotActive: 'Active Pokémon', slotBench: 'Switch in (Singles: only one Pokémon active)',
      addPartner: '+ Add partner', addPartnerTitle: 'Add partner', removePartner: 'Remove partner (only one Pokémon on this side)',
      init: 'Spe', hpShort: 'HP', vs: 'vs', noFoe: '– no opponent –', noFoeSlot: 'No opponent in this slot', clickDetails: 'click for details',
      statusMove: 'Status', turnOrder: 'Turn order:', turnOrderTR: 'Turn order (Trick Room):', tie: 'Speed tie (random)',
      speedTitle: '{0} – speed {1}',
      teamLoad: '{0} – click to load', toOther: 'Load on the other side', removeTeam: 'Remove from team',
      emptySlot: 'Empty slot: import a team or use “Add to team”', teamExport: 'Export team', teamClear: 'Clear team', exportShort: 'Export', clearShort: 'Clear',
      teamFull: 'Team is full (6)', teamAdded: 'Added to team', clearConfirm: 'Clear team {0}?',
      setPrompt: 'Name for the custom set of {0}:', setSaved: 'Set “{0}” saved', mySet: 'My set',
      field: 'Field', terrain: 'Terrain', weather: 'Weather', aurasRuin: 'Auras & Ruin', none: 'None', side1: 'Side 1', side2: 'Side 2',
      spikes: 'Spikes', trickRoom: 'Trick Room', gravity: 'Gravity',
      noHits: 'No results', own: 'Custom', hits: '{0} hits', hitsAuto: 'auto hits', hitsTitle: 'Number of hits', x2: '×2',
      dmgTaken: 'Damage', doubleTitle: '{0} → double power',
      importTitle: 'Team import (Showdown format)', importHint: 'Paste from Showdown, PokéPaste or VGCPastes. EVs: are converted to Stat Points automatically, SPs: are used as they are.',
      importLeft: 'Into left team (your side)', importRight: 'Into right team (opponent)', importCustom: 'Save as custom sets',
      deleteCustom: 'Delete all custom sets', deleteConfirm: 'Delete all custom sets?', deleted: 'Custom sets deleted',
      credits: 'Data: NCP VGC Damage Calculator (Alex Collins / Jake White) · Sprites: Pokémon Showdown · German names: PokeAPI',
      close: 'Close', copy: 'Copy', copied: 'Copied', copyFail: 'Copy failed', exportTitle: 'Export set',
      importNothing: 'Nothing recognized', unknown: 'unknown: {0}', importedCustom: '{0} set(s) saved as custom sets.',
      importedTeam: '{0} Pokémon imported into the {1} team.', left: 'left', right: 'right', notAvailable: ' Not available in Champions/unknown: {0}',
      switchError: 'Error while switching: {0}',
      charged: 'Charged (Charge)', chargedT: 'Electric moves ×2', glaive: 'Used Glaive Rush', glaiveT: 'takes double damage',
      flashFire: 'Flash Fire active', flashFireT: 'Fire moves ×1.5', analytic: 'Moves last (Analytic)', stakeout: 'Target switched in (Stakeout)',
      koOwn: 'Own Pokémon fainted', koShort: 'fainted', hitTimes: 'Times hit', hitShort: '× hit', stockpile: 'Stockpile', stockShort: 'Stock',
      notesNoEffect: 'No effect', notesSpread: 'Spread move (×0.75 in doubles)',
      importHintH: 'Paste from Showdown, PokéPaste or VGCPastes. <code>EVs:</code> are converted to Stat Points automatically, <code>SPs:</code> are used as they are.',
      creditsH: 'Data: <a href="https://github.com/nerd-of-now/NCP-VGC-Damage-Calculator" target="_blank" rel="noopener">NCP VGC Damage Calculator</a> (Alex Collins / Jake White) · Sprites: Pokémon Showdown · German names: PokeAPI',
      notLegal: 'Not available to this Pokémon in Champions', langBtn: 'DE', singles: 'Singles', doubles: 'Doubles', blankSet: 'Blank Set', analyticT: '×1.3', stakeoutT: 'Attack ×2',
      xPayback: 'Target moved first', xAvalanche: 'Hit by the target first', xAssurance: 'Target already hit this turn',
      xFailed: 'Last move failed', xRound: 'Partner used Round first', xLashOut: 'Stats lowered this turn',
      xFickle: 'Full power (30%)', xPhys: 'Physical damage taken', xSpec: 'Special damage taken', xTaken: 'Damage taken',
      sideTitle: '{0} – {1}', ruinTablets: 'Tablets', ruinVessel: 'Vessel', ruinSword: 'Sword', ruinBeads: 'Beads',
      statusDesc: '(status move)', burned: 'burned', chargedD: 'Charged', boostedBy: '{0} boosted', hitsD: '({0} hits)',
      inWeather: 'in {0}', inTerrain: 'in {0} Terrain', withX: 'with {0}', throughX: 'through {0}', afterX: 'after {0}', onCrit: 'on a critical hit',
      and: ' and ', after: ' after ', recovery: '{0} recovery', sandDmg: 'sandstorm damage', burnDmg: 'burn damage',
      poisonDmg: 'poison damage', leechDmg: '{0} damage', spikesN: '{0} {1}',
      koGuaranteed: 'guaranteed {0}', koChance: '{0}% chance to {1}', koPossible: 'possible 5+HKO', koHazards: 'KO from hazards',
      stanceNote: '{0} attacks in Blade Forme ({1})', fixedTaken: '{0} damage taken ×{1}',
      navCalc: 'Damage Calculator', navBuilder: 'Teambuilder', navNuz: 'Nuzlocke', navSL: 'Soul Link', navShiny: 'Shiny counter', navMatch: 'Match-Analyse', homeTitle: 'Back to the start screen',
      startShinyText: 'Count shiny hunts: odds for every game and method, phases, timer, collection, global hotkeys, OBS overlay and auto detection (alpha).',
      startMatchText: 'Read Showdown replays and battle logs: wins, leads, Mega and Tera, usage and matchup stats.',
      startSLText: 'Planner for Soul Link runs with 2–6 players: which Pokémon are linked, who is in the team and who died.',
      startNuzText: 'Calculator for Gen 3 to 5 Nuzlockes (GBA and DS) with trainers from the ROM and your box from the save file. Early test version.', startNuzKo: 'Gen 3–5 · trainers, box, damage',
      winMin: 'Minimize', winMax: 'Maximize', winRestore: 'Restore', winClose: 'Close',
      startCalcKo: '43.8% chance to OHKO',
      startCalcText: 'Damage, KO chances and turn order in singles and doubles, with weather, terrain and all field effects.',
      startBuilderText: 'Build teams of up to six Pokémon, set items, moves and Stat Points, check weaknesses and send the team to the damage calc.',
      startSub: 'Damage Calculator & Teambuilder for Pokémon Champions',
      startFoot: 'Press 1–6 to open · Back to the start via the logo in the top left',
      tbTeams: 'Teams', tbNew: '+ New team', tbImport: 'Import', tbImportTitle: 'Import team (Showdown format)',
      tbImportNew: 'As new team', tbImportInto: 'Replace this team', tbExport: 'Export', tbExportTitle: 'Export team',
      tbToCalcYou: 'To damage calc: You', tbToCalcFoe: 'To damage calc: Foe', tbDuplicate: 'Duplicate', tbDelete: 'Delete',
      tbDeleteConfirm: 'Delete team “{0}”?', tbName: 'Team name', tbDefaultName: 'Team {0}', tbCopyName: '{0} (copy)',
      tbAddMon: '+ Pokémon', tbChoose: 'Search Pokémon …', tbPreset: 'Use set …', tbNick: 'Set name', tbRemove: 'Remove',
      tbMoves: 'Moves', tbStats: 'Stats at level 50', tbMega: 'Mega', tbSpReset: 'Clear SP', tbTotal: 'Total',
      tbWeak: 'Type coverage', tbWeakHint: 'How hard each attacking type hits your team (incl. abilities like Levitate). Red = weak, green = resists.',
      tbWeakCol: 'weak', tbResCol: 'res.', tbEmptyEdit: 'Pick a slot above or add a Pokémon.',
      tbSentYou: 'Team sent to the damage calc (your side)', tbSentFoe: 'Team sent to the damage calc (opponent side)',
      tbImportDone: '{0} Pokémon imported', tbLeft: 'Move left', tbRight: 'Move right', tbNoTeam: 'No team yet',
      tbSpeedTiers: 'Speed', tbEmptyTeam: 'The team is empty.', tbMonCount: '{0}/6', tbTabMon: 'Pokémon', tbMoveN: 'Move {0}', tbPower: 'Power {0}', tbAcc: 'Accuracy {0}%', tbAccAlways: 'never misses', tbNatTitle: 'Select a nature', tbNatRevert: 'Revert to:', tbNatNeutral: 'neutral, no stat changed', tbFormChange: 'Form change', tbFormChangeT: 'Form in battle: stats and ability follow', tbStoneSet: 'Item set to {0}', tbLook: 'Look & form', tbMale: 'Male', tbFemale: 'Female', tbAbInForm: 'Ability as {0}', tbAbNormal: 'normal form: {0}', tbNormalVal: 'normal {0}', tbLookTitle: 'Look & form', tbDone: 'Done', tbFormsOwn: 'Form', tbFormsOwnHint: 'Regional forms and other forms with their own stats, types or abilities', tbVariant: 'Variant', tbVariantHint: 'Only the look changes, stats and types stay the same', tbGender: 'Gender', tbGenderless: 'This Pokémon has no gender.', tbOnlyMale: 'This Pokémon can only be male.', tbOnlyFemale: 'This Pokémon can only be female.', tbRatio: 'Ratio: {0}% male, {1}% female', tbNoGender: 'Genderless', tbRandom: 'Any', tbNormalColor: 'Normal',
      setTitle: 'Settings', setBtn: 'Settings', setModel: 'Pokémon in the teambuilder', set3d: '3D model (animated)', setSprite: 'Pixel sprite',
      setModelHint: 'How the big picture in the Pokémon editor is shown', setTheme: 'Theme', setDark: 'Dark', setLight: 'Light',
      setLang: 'Language', setLangHint: 'The app reloads when the language changes, nothing is lost.',
      setNav: 'Top bar', setNavHint: 'Tabs: only opened modes, closable with ×. All: always every mode. None: switch only via the start screen (logo).', setNavTabs: 'Tabs', setNavAll: 'All modes', setNavOff: 'None', closeTab: 'Close tab (also with the middle mouse button)', newTab: 'Open another mode',
      setStart: 'When the app opens', setStartHint: 'Which screen appears after starting', setStartScreen: 'Start screen',
      setUpd: 'Updates', setUpdHint: 'Version {0}. The app looks for a new version on every start and downloads it in the background.',
      setUpdHintP: 'Version {0} (portable). The app looks for a new version on every start and shows a notice.',
      updCheck: 'Check now', updChecking: 'Checking …', updNone: 'You have the latest version.', updLoading: 'Downloading version {0} …',
      updProgress: 'Downloading version {0} … {1}%', updErr: 'Check failed: {0}', updOff: 'Updates are only available in the Windows app.',
      updReady: 'Update {0}: restart', updReadyT: 'Rattata Lab {0} is downloaded. Click to restart and install, otherwise it is installed the next time you quit.',
      updReadyMsg: 'Version {0} is downloaded and will be installed the next time you quit.', updRestart: 'Restart now',
      updPortable: 'Update {0} available', updPortableT: 'Version {0} is on GitHub. The portable version does not update itself: click to open the download page.',
      updPortableMsg: 'Version {0} is available. Please download the portable version again.', updDownload: 'Download page'
    }
  };
  function T(key) {
    var s = (UI[LANG] && UI[LANG][key] != null) ? UI[LANG][key] : (UI.de[key] != null ? UI.de[key] : key);
    for (var i = 1; i < arguments.length; i++) s = s.split('{' + (i - 1) + '}').join(arguments[i]);
    if (key === 'sub') s = s.replace('Reg M-C', REG_NAME);
    return s;
  }
  function nid(s) { return (s || '').toLowerCase().replace(/[^a-z0-9]/g, ''); }
  var FORM_DE = { Shield: 'Schild', Blade: 'Klinge', Wash: 'Wasch', Heat: 'Hitze', Frost: 'Frost', Fan: 'Wirbel', Mow: 'Schneid',
    Midday: 'Tag', Midnight: 'Nacht', Dusk: 'Zwielicht', Hero: 'Held', Hangry: 'Kohldampf', Average: 'Normal', Small: 'Klein', Large: 'Groß', Super: 'Riesig',
    Eternal: 'Ewig', Four: 'Vier', Combat: 'Kampf', Blaze: 'Feuer', Aqua: 'Wasser' };
  function nSpecies(name) {
    if (LANG !== 'de' || !name) return name;
    var m = name.match(/^Mega (.+?)( [XYZ])?$/);
    if (m) return 'Mega-' + (NDE.species[nid(m[1])] || m[1]) + (m[2] || '');
    if (NDE.species[nid(name)]) return NDE.species[nid(name)];
    var i = name.indexOf('-');
    if (i > 0) {
      var base = name.slice(0, i), parts = name.slice(i + 1).split('-');
      return (NDE.species[nid(base)] || base) + '-' + parts.map(function (p) { return FORM_DE[p] || p; }).join('-');
    }
    return name;
  }
  function nMap(map) { return function (name) { return (LANG === 'de' && name && map[nid(name)]) || name; }; }
  var nMove = nMap(NDE.moves), nItem = nMap(NDE.items), nAbility = nMap(NDE.abilities), nNature = nMap(NDE.natures);
  function nType(t) { if (LANG !== 'de') return t; if (t === 'Typeless') return 'Typlos'; return NDE.types[nid(t)] || t; }
  var STATUS_EN = { Healthy: 'Healthy', Poisoned: 'Poisoned', 'Badly Poisoned': 'Badly poisoned', Burned: 'Burned', Paralyzed: 'Paralyzed', Asleep: 'Asleep', Frozen: 'Frozen' };
  function nStatus(s) { return LANG === 'de' ? (STATUS_DE[s] || s) : (STATUS_EN[s] || s); }
  var STAT_DE = { hp: 'KP', at: 'Angr', df: 'Vert', sa: 'SpAng', sd: 'SpVert', sp: 'Init' };
  var STAT_LONG_DE = { hp: 'KP', at: 'Angriff', df: 'Verteidigung', sa: 'Sp.-Angriff', sd: 'Sp.-Vert.', sp: 'Initiative' };
  function nStat(k) { return LANG === 'de' ? STAT_DE[k] : C.STAT_LABEL[k]; }
  function nStatLong(k) { return LANG === 'de' ? STAT_LONG_DE[k] : C.STAT_LONG[k]; }
  function natureLabel(n) {
    var m = C.NATURES[n];
    return m && m.length ? nNature(n) + ' (+' + nStat(m[0]) + ', -' + nStat(m[1]) + ')' : nNature(n);
  }
  var TERRAIN_DE = { None: 'Keins', Electric: 'Elektro', Grassy: 'Gras', Misty: 'Nebel', Psychic: 'Psycho' };
  var WEATHER_DE = { None: 'Keins', Sun: 'Sonne', Rain: 'Regen', Sand: 'Sandsturm', Snow: 'Schnee', 'Harsh Sun': 'Dürre', 'Heavy Rain': 'Starkregen', 'Strong Winds': 'Delta-Wind' };
  function nTerrain(t) { return LANG === 'de' ? (TERRAIN_DE[t] || t) : (t === 'None' ? 'None' : t); }
  // internal weather "Strong Winds" is shown under its ability name Delta Stream
  function nWeather(w) { return LANG === 'de' ? (WEATHER_DE[w] || w) : (w === 'Strong Winds' ? 'Delta Stream' : w); }
  // option labels for <select data-kind="...">
  function kindLabel(kind, v) {
    switch (kind) {
      case 'move': return v === '(No Move)' ? (LANG === 'de' ? '(keine Attacke)' : v) : nMove(v);
      case 'item': return v === '(none)' ? (LANG === 'de' ? '(kein Item)' : '(none)') : nItem(v);
      case 'ability': return nAbility(v);
      case 'type': return v === '' ? (LANG === 'de' ? '(keiner)' : '(none)') : nType(v);
      case 'nature': return natureLabel(v);
      case 'status': return nStatus(v);
      case 'forme': return nSpecies(v);
      default: return v;
    }
  }
  // lists sorted by the displayed (possibly German) name
  function sortedBy(list, fn) {
    return list.slice().sort(function (a, b) { return fn(a).localeCompare(fn(b), LANG); });
  }
  function nAura(s) { return String(s).replace(/(Fairy|Dark) Aura/, function (x) { return nAbility(x); }).replace('Aura Break', nAbility('Aura Break')); }
  function nSetName(n) { return n === 'Blank Set' ? T('blankSet') : n; }
  // shown in the set search field: "Species (Set)"
  function displayLabel(side) { return side.baseSpecies ? nSpecies(side.baseSpecies) + ' (' + nSetName(side.setName || 'Set') + ')' : ''; }
  // notes produced by calc.js are German; translate them for the English UI
  var CALC_NOTES_EN = {
    'Poltergeist schlägt ohne Item fehl': 'Poltergeist fails without an item', 'OHKO-Attacke': 'OHKO move',
    'Erlittenen Schaden bei der Attacke eintragen': 'Enter the damage taken at the move',
    'Spit Up schlägt ohne Stockpile fehl': 'Spit Up fails without Stockpile', 'Steel Roller schlägt ohne Terrain fehl': 'Steel Roller fails without terrain'
  };
  function nNote(s) {
    if (LANG === 'de') {
      return s.replace(/^(Poltergeist|Spit Up|Steel Roller)/, function (x) { return nMove(x); }).replace('ohne Stockpile', 'ohne ' + nMove('Stockpile'));
    }
    return CALC_NOTES_EN[s] || s;
  }
  function nFixed(s) {
    var m = String(s).match(/^(\d+) erlittener Schaden ×(.+)$/);
    return m ? T('fixedTaken', m[1], m[2]) : s;
  }
  function relabelSelects(root) {
    (root || document).querySelectorAll('select[data-kind]').forEach(relabelOne);
  }
  function relabelOne(s) {
    var kind = s.dataset.kind;
    Array.prototype.forEach.call(s.options, function (o) { o.textContent = kindLabel(kind, o.value) + (o.title ? ' ⚠' : ''); });
  }
  function applyStatic(root) {
    (root || document).querySelectorAll('[data-t]').forEach(function (e) { e.textContent = T(e.dataset.t); });
    (root || document).querySelectorAll('[data-tt]').forEach(function (e) { e.title = T(e.dataset.tt); });
    (root || document).querySelectorAll('[data-tp]').forEach(function (e) { e.placeholder = T(e.dataset.tp); });
  }
  var customSets = load('cc_customSets', {});        // {species: {setName: set}}
  var teams = load('cc_teams', [[], []]);             // [[{species,setName,set}], [...]]

  // ======================= helpers =======================
  function el(tag, attrs, html) {
    var e = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === 'class') e.className = attrs[k]; else if (k === 'text') e.textContent = attrs[k]; else e.setAttribute(k, attrs[k]);
    });
    if (html != null) e.innerHTML = html;
    return e;
  }
  function opt(list, labels) {
    return list.map(function (v) { return '<option value="' + esc(v) + '">' + esc(labels ? (labels[v] || v) : v) + '</option>'; }).join('');
  }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function toast(msg) {
    var t = el('div', { class: 'toast', text: msg }); document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 1800);
  }
  function megaFormeFor(base, item) {
    if (!item || typeof MEGA_STONE_USER_LOOKUP === 'undefined' || !MEGA_STONE_USER_LOOKUP[item]) return null;
    var user = MEGA_STONE_USER_LOOKUP[item];
    var b = base.replace(/-.*$/, '');
    if (user.replace(/-.*$/, '') !== b && user !== base) return null;
    var megas = formesOf(base).filter(function (f) { return f.indexOf('Mega ') === 0; });
    var m = item.match(/ ([XYZ])$/);
    var pick = megas.filter(function (f) { return m ? / [XYZ]$/.test(f) && f.slice(-1) === m[1] : !/ [XYZ]$/.test(f); });
    return pick[0] || null;
  }

  function spriteUrl(species) {
    var s = species, id;
    var mega = s.match(/^Mega (.+?)(?: ([XYZ]))?$/);
    if (mega) id = idOf(mega[1]) + '-mega' + (mega[2] ? mega[2].toLowerCase() : '');
    else {
      var i = s.indexOf('-');
      id = i > 0 ? idOf(s.slice(0, i)) + '-' + idOf(s.slice(i + 1)) : idOf(s);
    }
    return 'https://play.pokemonshowdown.com/sprites/gen5/' + id + '.png';
  }
  var TYPE_COLORS = {
    Normal: '#9099a1', Fire: '#ff9c54', Water: '#4d90d5', Electric: '#f3d23b', Grass: '#63bb5b', Ice: '#74cec0',
    Fighting: '#ce4069', Poison: '#ab6ac8', Ground: '#d97746', Flying: '#8fa8dd', Psychic: '#f97176', Bug: '#90c12c',
    Rock: '#c7b78b', Ghost: '#5269ac', Dragon: '#0a6dc4', Dark: '#5a5366', Steel: '#5a8ea1', Fairy: '#ec8fe6', Typeless: '#68a090'
  };
  var DARK_TEXT_TYPES = { Electric: 1, Ice: 1, Rock: 1, Bug: 1, Grass: 1, Fire: 1, Fairy: 1, Flying: 1, Psychic: 1, Normal: 1, Ground: 1 };
  function paintType(sel) {
    var t = sel.value, c = TYPE_COLORS[t];
    sel.classList.toggle('typed', !!c);
    sel.style.background = c || '';
    sel.style.color = c ? (DARK_TEXT_TYPES[t] ? '#16181a' : '#fff') : '';
  }
  function typeBadge(t) {
    var b = el('span', { class: 'type-badge', text: nType(t) });
    b.style.background = TYPE_COLORS[t] || '#666';
    b.style.color = DARK_TEXT_TYPES[t] ? '#16181a' : '#fff';
    return b;
  }
  function paintTypes(side) {
    var $ = side.$;
    ['t1', 't2'].forEach(function (k) { paintType($(k)); });
    for (var i = 0; i < 4; i++) paintType($('mtype' + i));
  }
  // Slot tabs in the panel header: one per active Pokémon (A, B in doubles)
  function renderTabs(side, mons, speeds, doubles) {
    var box = side.$('tabs');
    var key = JSON.stringify([side.active, doubles, !!side.empty, mons.map(function (m) { return m ? [m.species, m.types, m.curHP, m.maxHP] : null; }), speeds]);
    if (box._key === key) return;
    box._key = key;
    box.innerHTML = '';
    [0, 1].forEach(function (k) {
      var m = mons[k];
      // singles: only the active slot fights, the other tab is just a quick switch
      var tab = el('button', { class: 'slot-tab' + (k === side.active ? ' active' : '') + (m ? '' : ' empty') + (!doubles && k !== side.active ? ' bench' : ''), 'data-slot': k,
        title: m ? (doubles ? T('slotEdit', k ? 'B' : 'A') : (k === side.active ? T('slotActive') : T('slotBench'))) : T('addPartnerTitle') });
      tab.appendChild(el('span', { class: 'slot-letter', text: k ? 'B' : 'A' }));
      if (m) {
        var sp = el('span', { class: 'slot-sprite' }); sp.appendChild(spriteImg(m.species)); tab.appendChild(sp);
        var tx = el('span', { class: 'slot-text' });
        tx.appendChild(el('span', { class: 'slot-name', text: nSpecies(m.species) }));
        var sub = el('span', { class: 'slot-sub' });
        m.types.forEach(function (t) { sub.appendChild(typeBadge(t)); });
        var hpPct = Math.round(m.curHP / m.maxHP * 100);
        sub.appendChild(el('span', { class: 'slot-meta', text: T('init') + ' ' + speeds[k] + (hpPct < 100 ? ' · ' + hpPct + '% ' + T('hpShort') : '') }));
        tx.appendChild(sub); tab.appendChild(tx);
        if (k === 1) tab.appendChild(el('span', { class: 'slot-rm', 'data-rm': '1', title: T('removePartner'), text: '✕' }));
      } else {
        tab.appendChild(el('span', { class: 'slot-add', text: k === 0 && side.empty && side.active === 0 ? T('choosePokemon') : T('addPartner') }));
      }
      box.appendChild(tab);
    });
  }

  function shinyUrl(url, shiny) { return shiny ? url.replace('/gen5/', '/gen5-shiny/') : url; }
  function spriteImg(species, shiny) {
    var img = el('img', { alt: nSpecies(species), title: nSpecies(species), src: shinyUrl(spriteUrl(species), shiny), loading: 'lazy' });
    img.onerror = function () {
      var b = baseOf(species).replace(/-.*$/, '');
      var fb = shinyUrl('https://play.pokemonshowdown.com/sprites/gen5/' + idOf(b) + '.png', shiny);
      if (img.src !== fb) { img.src = fb; } else { img.replaceWith(el('span', { class: 'fallback', text: nSpecies(species) })); }
    };
    return img;
  }
  // Sprite cropped to its visible area (data/sprite_boxes.js), so it fills small boxes without being cut off.
  // Falls back to the plain image when the sprite was not measured.
  var pendingReload = false;
  // name from an online source (Showdown style) -> base species + forme in this calculator, or null
  function mapSpecies(name) {
    var k = DEX[name] ? name : (DEX_BY_ID[idOf(ONLINE ? ONLINE.ncpName(name) : name)] || DEX_BY_ID[idOf(name)]);
    if (!k) Object.keys(DEX).some(function (x) { if (baseOf(x) === x && idOf(x.replace(/-[^-]+$/, '')) === idOf(name)) { k = x; return true; } return false; });
    if (!k) return null;
    var sp = baseOf(k);
    return { sp: sp, forme: (k !== sp && k.indexOf('Mega ') !== 0) ? k : undefined };
  }
  var SVGNS = 'http://www.w3.org/2000/svg';
  // shiny: same crop box, the shiny sprite only differs in colour
  function spriteFit(species, shiny) {
    var boxes = window.SPRITE_BOXES || {};
    var url = spriteUrl(species), id = url.replace(/^.*\/|\.png$/g, '');
    var b = boxes[id];
    if (!b && species.indexOf('-') > 0 && window.FORM_DATA) return spriteImg(species, shiny); // cosmetic variant: not measured
    if (!b) { id = idOf(baseOf(species).replace(/-.*$/, '')); b = boxes[id]; url = 'https://play.pokemonshowdown.com/sprites/gen5/' + id + '.png'; }
    if (!b) return spriteImg(species, shiny);
    url = shinyUrl(url, shiny);
    var pad = 2, svg = document.createElementNS(SVGNS, 'svg');
    svg.setAttribute('class', 'sprite-fit');
    svg.setAttribute('viewBox', (b[0] - pad) + ' ' + (b[1] - pad) + ' ' + (b[2] + 2 * pad) + ' ' + (b[3] + 2 * pad));
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    var t = document.createElementNS(SVGNS, 'title'); t.textContent = nSpecies(species); svg.appendChild(t);
    var im = document.createElementNS(SVGNS, 'image');
    im.setAttribute('href', url); im.setAttribute('width', b[4]); im.setAttribute('height', b[4]);
    svg.appendChild(im);
    return svg;
  }

  // ======================= Pokémon panels =======================
  var sides = [null, null];

  function buildPanel(idx) {
    var p = 'p' + (idx + 1) + '_';
    var root = document.getElementById('panel' + (idx + 1));
    var typeOpts = opt(C.TYPES.concat(['Typeless']));
    var moveList = ['(No Move)'].concat(sortedBy(MOVE_NAMES.slice(1), nMove));
    var abilityList = sortedBy(ABILITIES, nAbility), natureList = sortedBy(NATURE_NAMES, nNature);
    var itemList = ['(none)'].concat(sortedBy(ITEMS.slice(1), nItem));
    var boostOpts = [6, 5, 4, 3, 2, 1, 0, -1, -2, -3, -4, -5, -6].map(function (b) {
      return '<option value="' + b + '"' + (b === 0 ? ' selected' : '') + '>' + (b > 0 ? '+' + b : b === 0 ? '--' : b) + '</option>';
    }).join('');
    var statRows = C.STAT_KEYS.map(function (s) {
      return '<tr data-stat="' + s + '"><td class="stat-name" data-stat-name="' + s + '">' + nStatLong(s) + '</td>' +
        '<td><input class="base" type="number" id="' + p + 'base_' + s + '" min="1" max="255"></td>' +
        '<td><input class="sp" type="number" id="' + p + 'sp_' + s + '" min="0" max="32" value="0"></td>' +
        '<td class="stat" id="' + p + 'stat_' + s + '"></td>' +
        '<td>' + (s === 'hp' ? '' : '<select id="' + p + 'boost_' + s + '">' + boostOpts + '</select>') + '</td></tr>';
    }).join('');
    var moves = [0, 1, 2, 3].map(function (i) {
      return '<div class="move-wrap"><div class="move" data-i="' + i + '">' +
        '<select class="mname" data-kind="move" id="' + p + 'mv' + i + '">' + opt(moveList) + '</select>' +
        '<input class="mbp" type="number" min="0" id="' + p + 'mbp' + i + '">' +
        '<select class="mtype" data-kind="type" id="' + p + 'mtype' + i + '">' + opt(C.TYPES) + '</select>' +
        '<select class="mcat" id="' + p + 'mcat' + i + '" hidden>' + opt(['Physical', 'Special', 'Status']) + '</select>' +
        '<div class="mbonus" id="' + p + 'mextra' + i + '"></div>' +
        '<label class="crit" data-tt="crit"><input type="checkbox" id="' + p + 'mcrit' + i + '"></label>' +
        [0, 1].map(function (t) {
          return '<button class="mres t' + t + '" id="' + p + 'mres' + i + '_' + t + '" data-tt="details"><span class="mres-pct"></span><span class="mres-bar"><span class="f"></span><span class="r"></span></span></button>';
        }).join('') +
        '</div></div>';
    }).join('');
    // column header: which opponent each damage column is against
    var movesHead = '<div class="moves-head"><span class="mh-sp"></span>' +
      '<span class="mh-t t0" id="' + p + 'mh0"></span><span class="mh-t t1" id="' + p + 'mh1"></span></div>';

    root.innerHTML =
      '<h2 class="poke-head side' + (idx + 1) + '"><span class="ph-side" data-t="' + (idx ? 'sideFoe' : 'sideYou') + '" data-tt="' + (idx ? 'foe' : 'ownSide') + '"></span>' +
      '<div class="slot-tabs" id="' + p + 'tabs"></div>' +
      '</h2><div class="body">' +
      '<div class="picker-row">' +
      '<div class="picker"><input id="' + p + 'pick" data-tp="search" autocomplete="off"><div class="picker-list" id="' + p + 'pickList"></div></div>' +
      '<button class="tbtn" id="' + p + 'saveSet" data-t="saveShort" data-tt="saveSet"></button>' +
      '<button class="tbtn" id="' + p + 'exportSet" data-t="exportSetShort" data-tt="exportSet"></button>' +
      '<button class="tbtn add" id="' + p + 'addTeam" data-t="addTeamShort" data-tt="addTeam"></button>' +
      '</div>' +
      '<div class="team-bar" id="' + p + 'team"></div>' +
      '<div class="empty-hint" data-t="emptyHint"></div>' +
      '<div class="grid2">' +
      '<label class="cell"><span class="l" data-t="type"></span><span class="pair"><select data-kind="type" id="' + p + 't1">' + typeOpts + '</select><select data-kind="type" id="' + p + 't2"><option value="">(none)</option>' + typeOpts + '</select></span></label>' +
      '<label class="cell"><span class="l" data-t="forme"></span><select data-kind="forme" id="' + p + 'forme"></select></label>' +
      '</div>' +
      '<div class="stats-wrap">' +
      '<table class="stats"><tr><th></th><th data-t="base"></th><th data-t="sp"></th><th data-t="value"></th><th data-t="stage"></th></tr>' + statRows + '</table>' +
      '<div class="stats-foot"><span class="sp-total" id="' + p + 'spTotal"></span><span class="speed-final" id="' + p + 'speedFinal"></span></div>' +
      '</div>' +
      '<div class="grid2">' +
      '<label class="cell"><span class="l" data-t="nature"></span><select data-kind="nature" id="' + p + 'nature">' + opt(natureList) + '</select></label>' +
      '<label class="cell"><span class="l" data-t="ability"></span><select data-kind="ability" id="' + p + 'ability">' + opt(abilityList) + '</select></label>' +
      '<label class="cell"><span class="l" data-t="item"></span><select data-kind="item" id="' + p + 'item">' + opt(itemList) + '</select></label>' +
      '<label class="cell"><span class="l" data-t="status"></span><select data-kind="status" id="' + p + 'status">' + opt(STATUSES) + '</select></label>' +
      '</div>' +
      '<div class="hp-row"><span class="l" data-t="hp"></span><input class="hp" type="number" id="' + p + 'curHP" min="0"><span class="slash">/ <span id="' + p + 'maxHP"></span></span>' +
      '<input type="number" class="pct" id="' + p + 'pct" min="0" max="100"><span>%</span>' +
      '<input type="range" class="hp-range" id="' + p + 'hpRange" min="0" max="100" value="100"></div>' +
      '<div class="cond" id="' + p + 'cond"></div>' +
      '<div class="moves">' + movesHead + moves + '</div>' +
      '</div>';

    var $ = function (id) { return document.getElementById(p + id); };
    var side = { idx: idx, $: $, baseSpecies: null, setLabel: '', slots: [null, null], active: 0 };
    sides[idx] = side;

    // picker
    setupPicker(side);
    // slot tabs (A / B in doubles)
    $('tabs').addEventListener('click', function (ev) {
      if (ev.target.closest('[data-rm]')) { ev.stopPropagation(); removeSlotB(side); return; }
      var t = ev.target.closest('[data-slot]');
      if (t) switchSlot(side, +t.dataset.slot);
    });

    $('forme').addEventListener('change', function () { applyForme(side, $('forme').value, true); recalc(); });
    $('item').addEventListener('change', function () { syncMegaForItem(side); recalc(); });
    ['t1', 't2', 'nature', 'status'].forEach(function (k) { $(k).addEventListener('change', recalc); });
    $('ability').addEventListener('change', function () { renderConditions(side); recalc(); });
    // dynamic extra inputs (move extras, conditions)
    root.addEventListener('change', function (ev) {
      var t = ev.target;
      if (!t.classList.contains('xin')) return;
      if (t.dataset.x === 'fainted' || t.dataset.c === 'fainted') {
        // Last Respects and Supreme Overlord share one "fainted allies" value
        side.fainted = +t.value || 0;
        root.querySelectorAll('[data-x="fainted"], [data-c="fainted"]').forEach(function (s) { s.value = side.fainted; });
      }
      recalc();
    });
    root.addEventListener('input', function (ev) { if (ev.target.classList.contains('xin') && ev.target.type === 'number') recalc(); });
    C.STAT_KEYS.forEach(function (s) {
      $('base_' + s).addEventListener('input', function () { updateStats(side, true); recalc(); });
      $('sp_' + s).addEventListener('input', function () { updateStats(side, s === 'hp'); recalc(); });
      if (s !== 'hp') $('boost_' + s).addEventListener('change', recalc);
    });
    $('curHP').addEventListener('input', function () { setHP(side, +$('curHP').value, 'hp'); recalc(); });
    $('pct').addEventListener('input', function () { setHP(side, +$('pct').value, 'pct'); recalc(); });
    $('hpRange').addEventListener('input', function () { setHP(side, +$('hpRange').value, 'pct'); recalc(); });
    for (var i = 0; i < 4; i++) (function (i) {
      $('mv' + i).addEventListener('change', function () { fillMove(side, i, $('mv' + i).value); recalc(); });
      ['mbp', 'mtype', 'mcat', 'mcrit'].forEach(function (k) {
        $(k + i).addEventListener(k === 'mbp' ? 'input' : 'change', recalc);
      });
    })(i);
    $('saveSet').addEventListener('click', function () { saveCustom(side); });
    $('exportSet').addEventListener('click', function () { showModal(T('exportTitle'), exportSet(readSet(side))); });
    $('addTeam').addEventListener('click', function () {
      if (teams[idx].length >= 6) { toast(T('teamFull')); return; }
      teams[idx].push({ species: side.baseSpecies, setName: side.setName || 'Set', set: readSet(side) });
      save('cc_teams', teams); renderTeam(idx); toast(T('teamAdded'));
    });
    applyStatic(root); relabelSelects(root);
    renderTeam(idx);
  }

  // ---------- set picker ----------
  // Grouped like the NCP calc: species header, then its sets, then "Blank Set"; species in alphabetical order.
  var speciesSorted = null;
  function speciesGroups() {
    speciesSorted = speciesSorted || sortedBy(SPECIES, nSpecies);
    return speciesSorted.map(function (sp) {
      var sets = [];
      var c = customSets[sp] || {};
      Object.keys(c).forEach(function (n) { sets.push({ species: sp, name: n, set: c[n], src: T('own') }); });
      var s = SETDEX[sp] || {};
      Object.keys(s).forEach(function (n) { sets.push({ species: sp, name: n, set: s[n], src: '' }); });
      [['usage', 'Usage'], ['smogon', 'Smogon']].forEach(function (src) {
        var o = (ONLINE_SETS[src[0]] || {})[sp] || {};
        Object.keys(o).forEach(function (n) { sets.push({ species: sp, name: n, set: o[n], src: src[1] }); });
      });
      sets.push({ species: sp, name: 'Blank Set', set: null, src: '' });
      return { species: sp, sets: sets };
    });
  }
  function setupPicker(side) {
    var input = side.$('pick'), list = side.$('pickList');
    var active = -1, shown = [], nodes = [];
    function render(scrollToCurrent) {
      var raw = input.value;
      var lbl = displayLabel(side);
      if (lbl && raw.indexOf(lbl) === 0) { raw = raw.slice(lbl.length); input.value = raw; }
      var q = raw.trim().toLowerCase(), words = q ? q.split(/\s+/) : [];
      var groups = speciesGroups();
      // search matches the English and the German name
      function spNames(sp) { return (sp + ' ' + nSpecies(sp)).toLowerCase(); }
      function startsWith(sp) { return sp.toLowerCase().indexOf(q) === 0 || nSpecies(sp).toLowerCase().indexOf(q) === 0 ? 0 : 1; }
      if (words.length) {
        groups = groups.map(function (g) {
          var spName = spNames(g.species);
          if (words.every(function (w) { return spName.indexOf(w) !== -1; })) return g; // species match: all its sets
          var sets = g.sets.filter(function (e) {
            var hay = spNames(e.species) + ' ' + (e.name + ' ' + nSetName(e.name)).toLowerCase();
            return words.every(function (w) { return hay.indexOf(w) !== -1; });
          });
          return { species: g.species, sets: sets };
        }).filter(function (g) { return g.sets.length; });
        // species whose name starts with the query come first, otherwise keep alphabetical order (stable sort)
        groups = groups.map(function (g, i) { return { g: g, i: i }; }).sort(function (a, b) {
          return startsWith(a.g.species) - startsWith(b.g.species) || a.i - b.i;
        }).map(function (x) { return x.g; });
      }
      shown = []; nodes = [];
      list.innerHTML = '';
      if (!groups.length) list.appendChild(el('div', { class: 'picker-empty', text: T('noHits') }));
      var currentNode = null;
      groups.forEach(function (g) {
        var head = el('div', { class: 'picker-head' });
        var ic = el('span', { class: 'pk-mini' }); ic.appendChild(spriteImg(g.species));
        head.appendChild(ic);
        head.appendChild(el('span', { text: nSpecies(g.species) }));
        var dd = DEX[g.species];
        if (dd) { var tw = el('span', { class: 'pk-types' }); [dd.t1, dd.t2].filter(Boolean).forEach(function (t) { tw.appendChild(typeBadge(t)); }); head.appendChild(tw); }
        list.appendChild(head);
        g.sets.forEach(function (e) {
          var i = shown.length;
          var isCurrent = side.setLabel === e.species + ' (' + e.name + ')';
          var it = el('div', { class: 'picker-item' + (i === active ? ' active' : '') + (isCurrent ? ' current' : '') });
          it.appendChild(el('span', { text: nSetName(e.name) }));
          if (e.src) it.appendChild(el('span', { class: 'tag', text: e.src }));
          it.addEventListener('mousedown', function (ev) { ev.preventDefault(); choose(e); });
          list.appendChild(it);
          shown.push(e); nodes.push(it);
          if (isCurrent) currentNode = it;
        });
      });
      list.classList.add('open');
      if (scrollToCurrent && currentNode) list.scrollTop = currentNode.offsetTop - list.clientHeight / 2;
    }
    function highlight() {
      nodes.forEach(function (n, i) { n.classList.toggle('active', i === active); });
      var n = nodes[active];
      if (n) {
        if (n.offsetTop < list.scrollTop + 24) list.scrollTop = n.offsetTop - 24;
        else if (n.offsetTop + n.offsetHeight > list.scrollTop + list.clientHeight) list.scrollTop = n.offsetTop + n.offsetHeight - list.clientHeight;
      }
    }
    function choose(e) {
      loadSet(side, e.species, e.set, e.name);
      list.classList.remove('open'); input.blur(); recalc();
    }
    input.addEventListener('focus', function () { input.placeholder = displayLabel(side) || T('search'); input.value = ''; active = -1; render(true); });
    input.addEventListener('input', function () { active = -1; render(false); list.scrollTop = 0; });
    input.addEventListener('blur', function () { list.classList.remove('open'); input.value = displayLabel(side); });
    input.addEventListener('keydown', function (ev) {
      if (ev.key === 'ArrowDown') { active = Math.min(shown.length - 1, active + 1); highlight(); ev.preventDefault(); }
      else if (ev.key === 'ArrowUp') { active = Math.max(0, active - 1); highlight(); ev.preventDefault(); }
      else if (ev.key === 'Enter') { var e = shown[active >= 0 ? active : 0]; if (e) choose(e); ev.preventDefault(); }
      else if (ev.key === 'Escape') { input.blur(); }
    });
  }

  // ---------- load / read sets ----------
  function defaultSet(species) {
    return { sps: { hp: 0, at: 0, df: 0, sa: 0, sd: 0, sp: 0 }, nature: 'Hardy', ability: DEX[species] ? DEX[species].ab : '', item: '(none)', moves: [] };
  }
  function loadSet(side, species, set, setName) {
    var $ = side.$;
    var base = baseOf(species);
    if (!DEX[base]) return;
    set = set ? JSON.parse(JSON.stringify(set)) : defaultSet(base);
    if (side.empty) setEmpty(side, false);
    side.baseSpecies = base;
    side.setLabel = base + ' (' + (setName || 'Set') + ')';
    side.setName = setName || 'Set';
    $('pick').value = displayLabel(side);

    var formes = formesOf(base);
    $('forme').innerHTML = formes.map(function (f) { return '<option value="' + esc(f) + '">' + esc(nSpecies(f)) + '</option>'; }).join('');
    $('forme').disabled = formes.length <= 1; // row stays visible so both panels line up

    $('item').value = ITEMS.indexOf(set.item) !== -1 ? set.item : '(none)';
    // new species: drop old move/ability selections so they are not carried over as extra options
    for (var j = 0; j < 4; j++) { $('mv' + j).value = '(No Move)'; delete $('mv' + j).dataset.for; }
    $('ability').value = ''; delete $('ability').dataset.for;
    var forme = megaFormeFor(base, set.item) ||
      ((set.forme && formes.indexOf(set.forme) !== -1 && set.forme.indexOf('Mega ') !== 0) ? set.forme : formes[0]);
    applyForme(side, forme, false);

    var sps = set.sps || {};
    C.STAT_KEYS.forEach(function (s) { $('sp_' + s).value = sps[s] || 0; if (s !== 'hp') $('boost_' + s).value = 0; });
    $('nature').value = C.NATURES[set.nature] ? set.nature : 'Hardy';
    var ab = DEX[forme].ab && forme.indexOf('Mega ') === 0 ? DEX[forme].ab : (set.ability || DEX[forme].ab || DEX[base].ab);
    setAbility(side, ab);
    $('status').value = 'Healthy';
    side.fainted = 0;
    $('cond').innerHTML = '';
    renderConditions(side);
    var mv = set.moves || [];
    for (var i = 0; i < 4; i++) {
      var name = MOVES[mv[i]] ? mv[i] : '(No Move)';
      setMove(side, i, name);
      $('mcrit' + i).checked = false;
    }
    updateStats(side, true);
    renderTeam(side.idx); // highlight the loaded team member
  }
  // makes sure a select offers value v (e.g. an imported move outside the learnset) before selecting it
  function ensureOpt(s, v, kind) {
    if (v && !Array.prototype.some.call(s.options, function (o) { return o.value === v; })) {
      s.appendChild(el('option', { value: v, text: kindLabel(kind, v) + ' ⚠', title: T('notLegal') }));
    }
  }
  function setAbility(side, ab) {
    var s = side.$('ability');
    ensureOpt(s, ab, 'ability');
    s.value = ab || s.options[0].value;
    if (side.$('cond')) renderConditions(side);
  }
  function setMove(side, i, name) {
    var s = side.$('mv' + i);
    ensureOpt(s, name, 'move');
    s.value = name; fillMove(side, i, name);
  }
  // restrict move and ability lists to what the current forme can actually have
  var allMoveOpts = null;
  function refreshLegal(side) {
    var $ = side.$, forme = side.forme || side.baseSpecies;
    var mv = legalMoves(forme);
    var html = mv ? opt(['(No Move)'].concat(sortedBy(mv, nMove))) : (allMoveOpts = allMoveOpts || opt(['(No Move)'].concat(sortedBy(MOVE_NAMES.slice(1), nMove))));
    for (var i = 0; i < 4; i++) {
      var s = $('mv' + i), cur = s.value;
      if (s.dataset.for !== forme) { s.innerHTML = html; s.dataset.for = forme; relabelOne(s); }
      ensureOpt(s, cur, 'move'); s.value = cur || '(No Move)';
    }
    var ab = legalAbilities(forme), sa = $('ability'), curA = sa.value;
    if (sa.dataset.for !== forme) {
      sa.innerHTML = opt(ab ? sortedBy(ab, nAbility) : sortedBy(ABILITIES, nAbility));
      sa.dataset.for = forme; relabelOne(sa);
    }
    ensureOpt(sa, curA, 'ability'); if (curA) sa.value = curA;
  }
  function applyForme(side, forme, changeAbility) {
    var $ = side.$, d = DEX[forme];
    if (!d) return;
    $('forme').value = forme;
    side.forme = forme;
    $('t1').value = d.t1; $('t2').value = d.t2 || '';
    C.STAT_KEYS.forEach(function (s) { $('base_' + s).value = d.bs[s]; });
    if (changeAbility && d.ab) {
      var isMega = forme.indexOf('Mega ') === 0;
      var wasAb = $('ability').value;
      if (isMega || side.lastFormeAb === wasAb) setAbility(side, d.ab);
    }
    side.lastFormeAb = d.ab;
    refreshLegal(side);
    updateStats(side, true);
  }
  function syncMegaForItem(side) {
    var $ = side.$, base = side.baseSpecies, item = $('item').value;
    var mega = megaFormeFor(base, item);
    var cur = $('forme').value;
    if (mega && mega !== cur) applyForme(side, mega, true);
    else if (!mega && cur.indexOf('Mega ') === 0) applyForme(side, formesOf(base)[0], true);
  }
  function fillMove(side, i, name) {
    var $ = side.$, m = MOVES[name] || MOVES['(No Move)'];
    $('mbp' + i).value = m.bp || 0;
    $('mtype' + i).value = m.type || 'Normal';
    $('mcat' + i).value = m.category || 'Status';
    var box = $('mextra' + i), html = '';
    var hr = m.hitRange;
    if (name === 'Population Bomb') hr = [1, 10];
    if (name === 'Triple Axel' || name === 'Triple Kick') hr = [1, 3];
    if (name === 'Beat Up') hr = [1, 6];
    // compact bonus control that lives inside the move row
    if (Array.isArray(hr)) {
      var opts = []; for (var h = hr[0]; h <= hr[hr.length - 1]; h++) opts.push(h);
      var defH = (name === 'Triple Axel' || name === 'Triple Kick') ? 3 : (name === 'Beat Up' ? 6 : '');
      html += '<select class="xin" data-x="hits" title="' + esc(T('hitsTitle')) + '"><option value="">' + (defH ? T('hits', defH) : T('hitsAuto')) + '</option>' +
        opts.map(function (o) { return '<option value="' + o + '">' + T('hits', o) + '</option>'; }).join('') + '</select>';
    }
    var ex = MOVE_EXTRAS[name];
    if (ex) {
      var exLabel = esc(T(ex.label));
      if (ex.kind === 'count') {
        var cur = ex.key === 'fainted' ? (side.fainted || 0) : ex.def;
        var o2 = ''; for (var c = ex.min; c <= ex.max; c++) o2 += '<option value="' + c + '"' + (c === cur ? ' selected' : '') + '>' + c + ' ' + esc(T(ex.short)) + '</option>';
        html += '<select class="xin" data-x="' + ex.key + '" title="' + exLabel + '">' + o2 + '</select>';
      } else if (ex.kind === 'toggle') {
        html += '<label class="btog" title="' + esc(T('doubleTitle', T(ex.label))) + '"><input type="checkbox" class="xin" data-x="boosted"><span>×2</span></label>';
      } else if (ex.kind === 'number') {
        html += '<input type="number" min="0" class="xin dmg" data-x="dmgTaken" value="0" title="' + exLabel + '" placeholder="' + esc(T('dmgTaken')) + '">';
      }
    }
    box.innerHTML = html;
    box.classList.toggle('empty', !html);
  }

  // per-Pokémon state toggles; ability-specific ones only appear when relevant
  function renderConditions(side) {
    var box = side.$('cond'), ab = side.$('ability').value;
    var prev = {};
    box.querySelectorAll('input').forEach(function (c) { prev[c.dataset.c] = c.checked; });
    var list = [['charged', 'charged', 'chargedT'], ['glaiveRush', 'glaive', 'glaiveT']];
    if (ab === 'Flash Fire') list.push(['flashFire', 'flashFire', 'flashFireT']);
    if (ab === 'Analytic') list.push(['movesLast', 'analytic', 'analyticT']);
    if (ab === 'Stakeout') list.push(['stakeout', 'stakeout', 'stakeoutT']);
    var html = list.map(function (c) {
      return '<label title="' + esc(T(c[2])) + '"><input type="checkbox" class="xin" data-c="' + c[0] + '"' + (prev[c[0]] ? ' checked' : '') + '> ' + esc(T(c[1])) + '</label>';
    }).join('');
    if (ab === 'Supreme Overlord') {
      var f = side.fainted || 0, o = '';
      for (var n = 0; n <= 5; n++) o += '<option value="' + n + '"' + (n === f ? ' selected' : '') + '>' + n + '</option>';
      html += '<label>' + esc(T('koOwn')) + ' <select class="xin" data-c="fainted">' + o + '</select></label>';
    }
    box.innerHTML = html;
  }
  function readConditions(side) {
    var out = {};
    side.$('cond').querySelectorAll('input').forEach(function (c) { out[c.dataset.c] = c.checked; });
    return out;
  }
  function readExtras(side, i) {
    var out = {};
    side.$('mextra' + i).querySelectorAll('.xin').forEach(function (x) {
      out[x.dataset.x] = x.type === 'checkbox' ? x.checked : (+x.value || 0);
    });
    return out;
  }

  var MOVE_EXTRAS = {
    // label / short are keys of the UI dictionary
    'Last Respects': { kind: 'count', key: 'fainted', label: 'koOwn', short: 'koShort', min: 0, max: 5, def: 0 },
    'Rage Fist': { kind: 'count', key: 'timesHit', label: 'hitTimes', short: 'hitShort', min: 0, max: 6, def: 0 },
    'Spit Up': { kind: 'count', key: 'stockpile', label: 'stockpile', short: 'stockShort', min: 0, max: 3, def: 1 },
    'Payback': { kind: 'toggle', label: 'xPayback' },
    'Avalanche': { kind: 'toggle', label: 'xAvalanche' },
    'Assurance': { kind: 'toggle', label: 'xAssurance' },
    'Stomping Tantrum': { kind: 'toggle', label: 'xFailed' },
    'Temper Flare': { kind: 'toggle', label: 'xFailed' },
    'Round': { kind: 'toggle', label: 'xRound' },
    'Lash Out': { kind: 'toggle', label: 'xLashOut' },
    'Fickle Beam': { kind: 'toggle', label: 'xFickle' },
    'Counter': { kind: 'number', label: 'xPhys' },
    'Mirror Coat': { kind: 'number', label: 'xSpec' },
    'Metal Burst': { kind: 'number', label: 'xTaken' },
    'Comeuppance': { kind: 'number', label: 'xTaken' }
  };

  function updateStats(side, resetHP) {
    var $ = side.$;
    var nature = $('nature').value, total = 0;
    C.STAT_KEYS.forEach(function (s) {
      var spv = Math.max(0, Math.min(C.SP_MAX, parseInt($('sp_' + s).value, 10) || 0));
      total += spv;
      $('stat_' + s).textContent = C.calcStat(s, +$('base_' + s).value || 1, spv, nature, side.forme);
    });
    var t = $('spTotal');
    t.textContent = T('spTotal', total, C.SP_TOTAL, C.SP_TOTAL - total);
    t.classList.toggle('over', total > C.SP_TOTAL);
    var maxHP = +$('stat_hp').textContent;
    var oldMax = side.maxHP;
    side.maxHP = maxHP;
    $('maxHP').textContent = maxHP;
    $('curHP').max = maxHP;
    if (resetHP || oldMax == null) {
      var pct = oldMax ? (+$('pct').value || 100) : 100;
      if (resetHP && side._pct != null) pct = side._pct;
      setHP(side, pct, 'pct');
    }
  }
  function setHP(side, v, mode) {
    var $ = side.$, max = side.maxHP || 1, hp;
    if (mode === 'pct') hp = Math.round(max * Math.max(0, Math.min(100, v)) / 100);
    else hp = Math.max(0, Math.min(max, Math.round(v)));
    var pct = Math.round(hp / max * 1000) / 10;
    side._pct = pct;
    if (mode !== 'hp') $('curHP').value = hp;
    if (mode !== 'pct' || document.activeElement !== $('pct')) $('pct').value = Math.round(pct);
    $('hpRange').value = pct;
  }

  function readSet(side) {
    var $ = side.$, sps = {};
    C.STAT_KEYS.forEach(function (s) { sps[s] = parseInt($('sp_' + s).value, 10) || 0; });
    var moves = [];
    for (var i = 0; i < 4; i++) { var m = $('mv' + i).value; if (m !== '(No Move)') moves.push(m); }
    return { sps: sps, nature: $('nature').value, ability: $('ability').value, item: $('item').value, moves: moves, forme: $('forme').value, species: side.baseSpecies };
  }

  // ---------- slot state: full snapshot of the editor so A and B can be swapped in and out ----------
  function captureState(side) {
    var $ = side.$, st = {
      baseSpecies: side.baseSpecies, setLabel: side.setLabel, setName: side.setName, fainted: side.fainted || 0,
      forme: $('forme').value || side.baseSpecies, t1: $('t1').value, t2: $('t2').value,
      base: {}, sps: {}, boosts: {}, nature: $('nature').value, ability: $('ability').value, item: $('item').value,
      status: $('status').value, curHP: parseInt($('curHP').value, 10), pct: side._pct, cond: readConditions(side), moves: []
    };
    C.STAT_KEYS.forEach(function (s) {
      st.base[s] = +$('base_' + s).value || 1;
      st.sps[s] = parseInt($('sp_' + s).value, 10) || 0;
      st.boosts[s] = s === 'hp' ? 0 : (+$('boost_' + s).value || 0);
    });
    for (var i = 0; i < 4; i++) {
      st.moves.push({ name: $('mv' + i).value, bp: +$('mbp' + i).value || 0, type: $('mtype' + i).value,
        cat: $('mcat' + i).value, crit: $('mcrit' + i).checked, extras: readExtras(side, i) });
    }
    return st;
  }
  function restoreState(side, st) {
    var $ = side.$;
    loadSet(side, st.baseSpecies, {
      sps: st.sps, nature: st.nature, ability: st.ability, item: st.item, forme: st.forme,
      moves: st.moves.map(function (m) { return m.name; })
    }, st.setName);
    side.setLabel = st.setLabel || side.setLabel; $('pick').value = displayLabel(side);
    if (st.forme && $('forme').value !== st.forme && formesOf(side.baseSpecies).indexOf(st.forme) !== -1) applyForme(side, st.forme, false);
    $('t1').value = st.t1; $('t2').value = st.t2 || '';
    C.STAT_KEYS.forEach(function (s) {
      $('base_' + s).value = st.base[s]; $('sp_' + s).value = st.sps[s];
      if (s !== 'hp') $('boost_' + s).value = st.boosts[s] || 0;
    });
    $('nature').value = st.nature; setAbility(side, st.ability); $('item').value = st.item; $('status').value = st.status;
    side.fainted = st.fainted || 0;
    renderConditions(side);
    $('cond').querySelectorAll('input').forEach(function (c) { c.checked = !!(st.cond || {})[c.dataset.c]; });
    $('cond').querySelectorAll('select[data-c="fainted"]').forEach(function (s) { s.value = side.fainted; });
    st.moves.forEach(function (m, i) {
      var name = MOVES[m.name] ? m.name : '(No Move)';
      setMove(side, i, name);
      $('mbp' + i).value = m.bp; $('mtype' + i).value = m.type; $('mcat' + i).value = m.cat; $('mcrit' + i).checked = !!m.crit;
      $('mextra' + i).querySelectorAll('.xin').forEach(function (x) {
        var v = (m.extras || {})[x.dataset.x];
        if (x.dataset.x === 'fainted') v = side.fainted;
        if (v == null) return;
        if (x.type === 'checkbox') x.checked = !!v; else x.value = v || (x.tagName === 'SELECT' ? x.value : 0);
      });
    });
    side._pct = st.pct != null ? st.pct : 100;
    updateStats(side, true);
    if (!isNaN(st.curHP)) { setHP(side, st.curHP, 'hp'); $('curHP').value = Math.min(st.curHP, side.maxHP); }
    renderTeam(side.idx);
  }
  function pokemonFromState(st) {
    var forme = st.forme || st.baseSpecies;
    var d = DEX[forme] || DEX[st.baseSpecies];
    var stats = {};
    C.STAT_KEYS.forEach(function (s) { stats[s] = C.calcStat(s, st.base[s] || 1, st.sps[s] || 0, st.nature, forme); });
    var types = [st.t1]; if (st.t2 && st.t2 !== st.t1) types.push(st.t2);
    var cur = Math.max(0, Math.min(stats.hp, st.curHP));
    if (isNaN(cur)) cur = stats.hp;
    var cond = st.cond || {};
    var moves = st.moves.map(function (m) {
      return Object.assign({}, MOVES[m.name] || {}, m.extras || {}, { name: m.name, bp: m.bp, type: m.type, category: m.cat, crit: m.crit });
    });
    return {
      fainted: st.fainted || 0, baseAtk: st.base.at || 50,
      charged: !!cond.charged, glaiveRush: !!cond.glaiveRush, flashFire: !!cond.flashFire,
      movesLast: !!cond.movesLast, stakeout: !!cond.stakeout,
      species: forme, baseSpecies: st.baseSpecies, types: types, stats: stats, sps: Object.assign({}, st.sps),
      boosts: Object.assign({}, st.boosts), nature: st.nature, ability: st.ability, item: st.item, status: st.status,
      curHP: cur, maxHP: stats.hp, weight: d ? d.w : 50, canEvolve: !!(d && d.canEvolve), moves: moves
    };
  }
  function readPokemon(side) { return pokemonFromState(captureState(side)); }
  // state of slot k of a side (the active slot lives in the editor)
  function slotState(side, k) { return k === side.active ? (side.empty ? null : captureState(side)) : side.slots[k]; }
  // empty side (after "Reset"): no Pokémon in the editor, only the search field and the team bar are shown
  function setEmpty(side, on) {
    side.empty = !!on;
    document.getElementById('panel' + (side.idx + 1)).classList.toggle('is-empty', side.empty);
    if (on) { side.baseSpecies = null; side.setLabel = ''; side.setName = ''; side.$('pick').value = ''; renderTeam(side.idx); }
  }
  // clear one side completely: both slots empty
  function clearSide(side) {
    side.slots = [null, null]; side.active = 0;
    setEmpty(side, true);
  }

  function defaultPartner(side) {
    var used = [side.baseSpecies];
    var tm = teams[side.idx].filter(function (m) { return used.indexOf(m.species) === -1; })[0];
    if (tm) return { species: tm.species, set: tm.set, name: tm.setName };
    var pref = ['Incineroar', 'Sinistcha', 'Whimsicott', 'Kingambit', 'Garchomp'].filter(function (s) { return used.indexOf(s) === -1 && SETDEX[s]; })[0];
    if (pref) { var n = Object.keys(SETDEX[pref])[0]; return { species: pref, set: SETDEX[pref][n], name: n }; }
    return { species: SPECIES[0], set: null, name: 'Blank Set' };
  }
  function switchSlot(side, k) {
    try { switchSlotInner(side, k); } catch (e) { toast(T('switchError', e.message)); }
  }
  function switchSlotInner(side, k) {
    if (k === side.active) { if (side.empty) side.$('pick').focus(); return; }
    side.slots[side.active] = side.empty ? null : captureState(side);
    side.active = k;
    if (side.slots[k]) restoreState(side, side.slots[k]);
    else { var d = defaultPartner(side); loadSet(side, d.species, d.set, d.name); }
    side.slots[k] = null; // active slot lives in the editor
    recalc();
  }
  function removeSlotB(side) {
    if (side.active === 1) {
      side.active = 0;
      if (side.slots[0]) restoreState(side, side.slots[0]); else setEmpty(side, true);
    }
    side.slots[1] = null; side.slots[0] = null;
    recalc();
  }

  // Stance Change: Aegislash attacks in Blade forme, defends in Shield forme.
  function stanceAdjust(poke, asAttacker, move) {
    if (poke.ability !== 'Stance Change' || poke.baseSpecies !== 'Aegislash') return poke;
    var target = asAttacker && move && move.category !== 'Status' ? 'Aegislash-Blade' : 'Aegislash-Shield';
    if (poke.species === target || !DEX[target]) return poke;
    var d = DEX[target], q = Object.assign({}, poke, { species: target, stats: {} });
    C.STAT_KEYS.forEach(function (s) { q.stats[s] = C.calcStat(s, d.bs[s], poke.sps[s], poke.nature, target); });
    q.stats.hp = poke.stats.hp;
    return q;
  }

  // ======================= field =======================
  var field = load('cc_field', null) || {
    format: 'Doubles', terrain: 'None', weather: 'None', gravity: false,
    ruin: { tablets: false, vessel: false, sword: false, beads: false }, fairyAura: false, darkAura: false, auraBreak: false,
    sides: [{}, {}]
  };
  // [key, English name, m = move / a = ability] – the name is translated via the move/ability names
  var SIDE_TOGGLES = [
    ['helpingHand', 'Helping Hand', 'm'], ['auroraVeil', 'Aurora Veil', 'm'], ['reflect', 'Reflect', 'm'],
    ['lightScreen', 'Light Screen', 'm'], ['tailwind', 'Tailwind', 'm'], ['leechSeed', 'Leech Seed', 'm'], ['saltCure', 'Salt Cure', 'm'],
    ['friendGuard', 'Friend Guard', 'a'], ['stealthRock', 'Stealth Rock', 'm'], ['flowerGift', 'Flower Gift', 'a'],
    ['steelySpirit', 'Steely Spirit', 'a'], ['powerSpot', 'Power Spot', 'a'], ['battery', 'Battery', 'a']
  ];
  function toggleName(t) { return t[2] === 'a' ? nAbility(t[1]) : nMove(t[1]); }
  function buildField() {
    var root = document.getElementById('fieldPanel');
    function group(key, values, labels) {
      return '<div class="btn-group" data-key="' + key + '">' + values.map(function (v) {
        return '<button data-v="' + v + '">' + (labels && labels[v] || v) + '</button>';
      }).join('') + '</div>';
    }
    function spikes(s) {
      return '<div class="btn-group mini" data-spikes="' + s + '">' + [0, 1, 2, 3].map(function (n) { return '<button data-v="' + n + '">' + n + '</button>'; }).join('') + '</div>';
    }
    function labels(values, fn) { var o = {}; values.forEach(function (v) { o[v] = esc(fn(v)); }); return o; }
    var sideRows = '<div class="side-row head"><span class="side-label s1">' + T('side1') + '</span><span></span><span class="side-label s2">' + T('side2') + '</span></div>' +
      SIDE_TOGGLES.map(function (t) {
        var nm = esc(toggleName(t));
        return '<div class="side-row"><button class="tog s1" data-side="0" data-tog="' + t[0] + '" title="' + esc(T('sideTitle', toggleName(t), T('side1'))) + '"></button>' +
          '<span class="side-name">' + nm + '</span>' +
          '<button class="tog s2" data-side="1" data-tog="' + t[0] + '" title="' + esc(T('sideTitle', toggleName(t), T('side2'))) + '"></button></div>';
      }).join('') +
      '<div class="side-row spikes">' + spikes(0) + '<span class="side-name">' + esc(nMove('Spikes')) + '</span>' + spikes(1) + '</div>';
    var terrains = ['None', 'Electric', 'Grassy', 'Misty', 'Psychic'];
    // normal weather in the first row, the three primal/legendary weathers in the second (same group key)
    var weathers = ['None', 'Sun', 'Rain', 'Sand', 'Snow'], weathers2 = ['Harsh Sun', 'Heavy Rain', 'Strong Winds'];
    function ruinBtn(k, key, ab) { return '<button class="rtog" data-r="' + k + '" title="' + esc(nAbility(ab)) + '">' + T(key) + '</button>'; }
    root.innerHTML = '<h2 class="field-head"><span>' + T('field') + '</span>' +
      '<button class="tbtn" id="btnReset" title="' + esc(T('resetTitle')) + '">' + esc(T('reset')) + '</button></h2><div class="body">' +
      '<div class="field-row">' + group('format', ['Singles', 'Doubles'], { Singles: T('singles'), Doubles: T('doubles') }) +
      '<div class="btn-group"><button class="ftog" data-f="trickRoom">' + esc(nMove('Trick Room')) + '</button><button class="ftog" data-f="gravity">' + esc(nMove('Gravity')) + '</button></div></div>' +
      '<div class="field-label">' + T('terrain') + '</div>' +
      group('terrain', terrains, labels(terrains, nTerrain)) +
      '<div class="field-label">' + T('weather') + '</div>' +
      group('weather', weathers, labels(weathers, nWeather)) +
      group('weather', weathers2, labels(weathers2, nWeather)) +
      '<div class="field-label">' + esc(T('aurasRuin')) + '</div>' +
      '<div class="btn-group"><button class="ftog" data-f="fairyAura">' + esc(nAbility('Fairy Aura')) + '</button><button class="ftog" data-f="darkAura">' + esc(nAbility('Dark Aura')) + '</button><button class="ftog" data-f="auraBreak">' + esc(nAbility('Aura Break')) + '</button></div>' +
      '<div class="btn-group">' + ruinBtn('tablets', 'ruinTablets', 'Tablets of Ruin') + ruinBtn('vessel', 'ruinVessel', 'Vessel of Ruin') +
      ruinBtn('sword', 'ruinSword', 'Sword of Ruin') + ruinBtn('beads', 'ruinBeads', 'Beads of Ruin') + '</div>' +
      '<div class="sides">' + sideRows + '</div></div>';

    root.addEventListener('click', function (ev) {
      var b = ev.target.closest('button'); if (!b) return;
      var g = b.parentElement;
      if (g.dataset.key) { field[g.dataset.key] = (field[g.dataset.key] === b.dataset.v && g.dataset.key !== 'format') ? 'None' : b.dataset.v; }
      else if (g.dataset.spikes != null) { field.sides[+g.dataset.spikes].spikes = +b.dataset.v; }
      else if (b.dataset.f) { field[b.dataset.f] = !field[b.dataset.f]; }
      else if (b.dataset.r) { field.ruin[b.dataset.r] = !field.ruin[b.dataset.r]; }
      else if (b.dataset.tog) { var sd = field.sides[+b.dataset.side]; sd[b.dataset.tog] = !sd[b.dataset.tog]; }
      else return;
      save('cc_field', field); renderField(); recalc();
    });
    document.getElementById('btnReset').addEventListener('click', function (ev) {
      ev.stopPropagation();
      resetAll();
    });
    renderField();
  }
  // "Reset": opponent side empty, all field effects off (Singles/Doubles stays)
  function resetAll() {
    clearSide(sides[1]);
    field = {
      format: field.format, terrain: 'None', weather: 'None', gravity: false, trickRoom: false,
      ruin: { tablets: false, vessel: false, sword: false, beads: false }, fairyAura: false, darkAura: false, auraBreak: false,
      sides: [{}, {}]
    };
    save('cc_field', field);
    selected.side = 0;
    renderField(); recalc();
    toast(T('resetDone'));
  }
  function renderField() {
    var root = document.getElementById('fieldPanel');
    root.querySelectorAll('.btn-group[data-key]').forEach(function (g) {
      g.querySelectorAll('button').forEach(function (b) { b.classList.toggle('on', field[g.dataset.key] === b.dataset.v); });
    });
    root.querySelectorAll('.btn-group[data-spikes]').forEach(function (g) {
      var n = field.sides[+g.dataset.spikes].spikes || 0;
      g.querySelectorAll('button').forEach(function (b) { b.classList.toggle('on', +b.dataset.v === n); });
    });
    root.querySelectorAll('button.ftog').forEach(function (b) { b.classList.toggle('on', !!field[b.dataset.f]); });
    root.querySelectorAll('button.rtog').forEach(function (b) { b.classList.toggle('on', !!field.ruin[b.dataset.r]); });
    root.querySelectorAll('button.tog').forEach(function (b) { b.classList.toggle('on', !!field.sides[+b.dataset.side][b.dataset.tog]); });
  }

  // ======================= results =======================
  var selected = { side: 0, slot: 0, move: 0, target: 0 };
  var lastResults = [[[], []], [[], []]];

  function residualInfo(def, defSide, atk) {
    var max = def.maxHP, parts = [], res = 0, hazards = 0;
    var magicGuard = def.ability === 'Magic Guard';
    var w = C.effectiveWeather(field, def, atk);
    if (!magicGuard) {
      if (defSide.stealthRock) {
        var e = C.typeEff('Rock', def.types, {});
        hazards += Math.floor(max * e / 8); parts.push(nMove('Stealth Rock'));
      }
      var sp = defSide.spikes || 0;
      if (sp && C.isGrounded(def, field)) { hazards += Math.floor(max * [0, 1 / 8, 1 / 6, 1 / 4][sp]); parts.push(T('spikesN', sp, nMove('Spikes'))); }
    }
    var after = [];
    if (def.item === 'Leftovers') { res += Math.floor(max / 16); after.push(T('recovery', nItem('Leftovers'))); }
    if (field.terrain === 'Grassy' && C.isGrounded(def, field)) { res += Math.floor(max / 16); after.push(T('recovery', nMove('Grassy Terrain'))); }
    if (!magicGuard) {
      if (w === 'Sand' && ['Rock', 'Ground', 'Steel'].every(function (t) { return def.types.indexOf(t) === -1; }) &&
          ['Overcoat', 'Sand Veil', 'Sand Rush', 'Sand Force'].indexOf(def.ability) === -1 && def.item !== 'Safety Goggles') {
        res -= Math.floor(max / 16); after.push(T('sandDmg'));
      }
      if (def.status === 'Burned') { res -= Math.floor(max / 16); after.push(T('burnDmg')); }
      if ((def.status === 'Poisoned' || def.status === 'Badly Poisoned') && def.ability !== 'Poison Heal') { res -= Math.floor(max / 8); after.push(T('poisonDmg')); }
      if (defSide.leechSeed) { res -= Math.floor(max / 8); after.push(T('leechDmg', nMove('Leech Seed'))); }
      if (defSide.saltCure) { var wf = def.types.indexOf('Water') !== -1 || def.types.indexOf('Steel') !== -1; res -= Math.floor(max / (wf ? 4 : 8)); after.push(nMove('Salt Cure')); }
    }
    return { hazards: hazards, hazardText: parts, residual: res, afterText: after, sitrus: def.item === 'Sitrus Berry' };
  }

  function sign(nature, stat) {
    var m = C.natureMod(nature, stat);
    return m > 1 ? '+' : m < 1 ? '-' : '';
  }
  function describe(r, ko, atkSide, defSide) {
    var a = r.attacker, d = r.defender, m = r.move, ds = r.desc;
    if (r.empty) return '';
    var aName = nSpecies(a.species), dName = nSpecies(d.species), mName = nMove(m.name);
    if (r.status) return aName + ' ' + mName + ' ' + T('statusDesc');
    if (ds.fixed) {
      var fd = r.damage[0], fp = Math.round(fd / d.maxHP * 1000) / 10;
      return aName + ' ' + mName + ' (' + nFixed(ds.fixed) + ') vs. ' + dName + ': ' + fd + ' (' + fp + '%)' + (ko && ko.text ? ' -- ' + ko.text : '');
    }
    var out = [];
    if (ds.atkBoost) out.push((ds.atkBoost > 0 ? '+' : '') + ds.atkBoost);
    var aStat = r.atkKey || 'at';
    var aSrc = m.name === 'Foul Play' ? d : a;
    out.push(aSrc.sps[aStat] + sign(aSrc.nature, aStat) + ' ' + nStat(aStat));
    if (ds.attackerAbility) out.push(nAbility(ds.attackerAbility));
    if (ds.attackerItem) out.push(nItem(ds.attackerItem));
    if (a.status === 'Burned' && ds.burned) out.push(T('burned'));
    out.push(aName);
    if (ds.charged) out.push(T('chargedD'));
    if (ds.helpingHand) out.push(nMove('Helping Hand'));
    if (ds.steelySpirit) out.push(T('boostedBy', nAbility('Steely Spirit')));
    if (ds.battery) out.push(T('boostedBy', nAbility('Battery')));
    if (ds.powerSpot) out.push(T('boostedBy', nAbility('Power Spot')));
    out.push(mName + (ds.moveBP ? ' (' + ds.moveBP + ' BP)' : '') + (ds.hits > 1 ? ' ' + T('hitsD', ds.hits) : ''));
    out.push('vs.');
    if (ds.defBoost) out.push((ds.defBoost > 0 ? '+' : '') + ds.defBoost);
    var dk = r.defKey || 'df';
    out.push(d.sps.hp + ' ' + nStat('hp') + ' / ' + d.sps[dk] + sign(d.nature, dk) + ' ' + nStat(dk));
    if (ds.defenderAbility) out.push(nAbility(ds.defenderAbility));
    if (ds.defenderItem) out.push(nItem(ds.defenderItem));
    out.push(dName);
    if (ds.weather) out.push(T('inWeather', nWeather(ds.weather)));
    if (ds.terrain) out.push(T('inTerrain', nTerrain(ds.terrain)));
    if (ds.aura) out.push(T('withX', nAura(ds.aura)));
    if (ds.ruinAtk) out.push(T('withX', nAbility(ds.ruinAtk)));
    if (ds.ruinDef) out.push(T('withX', nAbility(ds.ruinDef)));
    if (ds.screen) out.push(T('throughX', nMove(ds.screen)));
    if (ds.friendGuard) out.push(T('withX', nAbility('Friend Guard')));
    if (ds.glaiveRush) out.push(T('afterX', nMove('Glaive Rush')));
    if (ds.isCrit) out.push(T('onCrit'));
    var dmg = r.damage, min = dmg[0], max = dmg[dmg.length - 1];
    var pmin = Math.round(min / d.maxHP * 1000) / 10, pmax = Math.round(max / d.maxHP * 1000) / 10;
    var s = out.join(' ') + ': ' + min + '-' + max + ' (' + pmin + ' - ' + pmax + '%)';
    if (ko && ko.text) s += ' -- ' + ko.text;
    return s;
  }

  function koText(ko, info) {
    if (!ko || !ko.text) return '';
    var t = ko.text, extra = [];
    if (info.hazardText.length) extra.push(info.hazardText.join(T('and')));
    if (info.afterText.length && ko.n > 1) extra.push(info.afterText.join(T('and')));
    if (info.sitrus && ko.n > 1) extra.push(T('recovery', nItem('Sitrus Berry')));
    if (extra.length) t += T('after') + extra.join(T('and'));
    return t;
  }

  // KO text in the current language (calc.js returns German)
  function localKO(ko) {
    if (!ko || !ko.text) return ko;
    var label = ko.n === 1 ? 'OHKO' : ko.n + 'HKO';
    if (ko.n === 0) ko.text = T('koHazards');
    else if (ko.chance === 1) ko.text = T('koGuaranteed', label);
    else if (ko.n <= 4 && ko.chance > 0) ko.text = T('koChance', Math.round(ko.chance * 1000) / 10, label);
    else if (ko.n === 5) ko.text = T('koPossible');
    return ko;
  }

  // Partner effects that come from the ally's ability (doubles)
  function sideFieldFor(s, k, mons) {
    var f = Object.assign({}, field.sides[s]);
    var partner = mons[s][1 - k];
    if (partner) {
      if (partner.ability === 'Friend Guard') f.friendGuard = true;
      if (partner.ability === 'Battery') f.battery = true;
      if (partner.ability === 'Power Spot') f.powerSpot = true;
      if (partner.ability === 'Steely Spirit') f.steelySpirit = true;
      if (partner.ability === 'Flower Gift') f.flowerGift = true;
    }
    return f;
  }

  function recalc() {
    if (!sides[0] || !sides[1]) return;
    // a side without a Pokémon is only allowed when it was cleared on purpose (Reset)
    if ((!sides[0].baseSpecies && !sides[0].empty) || (!sides[1].baseSpecies && !sides[1].empty)) return;
    var doubles = field.format === 'Doubles';
    document.body.classList.toggle('singles', !doubles);
    paintTypes(sides[0]); paintTypes(sides[1]);
    // mons[side][slot]; in singles only the active slot fights
    var mons = [0, 1].map(function (s) {
      return [0, 1].map(function (k) {
        if (!doubles && k !== sides[s].active) return null;
        var st = slotState(sides[s], k);
        return st ? pokemonFromState(st) : null;
      });
    });
    var all = mons[0].concat(mons[1]).filter(Boolean);
    var fld = {
      format: field.format, weather: field.weather === 'None' ? '' : field.weather, terrain: field.terrain === 'None' ? '' : field.terrain,
      gravity: field.gravity, ruin: Object.assign({}, field.ruin), fairyAura: field.fairyAura, darkAura: field.darkAura, auraBreak: field.auraBreak
    };
    // ruin abilities, weather and terrain from all Pokémon on the field
    var autoWeather = { Drought: 'Sun', Drizzle: 'Rain', 'Sand Stream': 'Sand', 'Snow Warning': 'Snow',
      'Desolate Land': 'Harsh Sun', 'Primordial Sea': 'Heavy Rain', 'Delta Stream': 'Strong Winds' };
    var autoTerrain = { 'Electric Surge': 'Electric', 'Grassy Surge': 'Grassy', 'Psychic Surge': 'Psychic', 'Misty Surge': 'Misty' };
    all.forEach(function (x) {
      if (x.ability === 'Tablets of Ruin') fld.ruin.tablets = true;
      if (x.ability === 'Vessel of Ruin') fld.ruin.vessel = true;
      if (x.ability === 'Sword of Ruin') fld.ruin.sword = true;
      if (x.ability === 'Beads of Ruin') fld.ruin.beads = true;
      if (!fld.weather && autoWeather[x.ability]) fld.weather = autoWeather[x.ability];
      if (!fld.terrain && autoTerrain[x.ability]) fld.terrain = autoTerrain[x.ability];
    });

    // speeds (for tabs, the active editor and the turn order)
    var speeds = [0, 1].map(function (s) {
      return mons[s].map(function (m) { return m ? C.getSpeed(m, fld, field.sides[s]) : 0; });
    });
    [0, 1].forEach(function (s) {
      var tabMons = [0, 1].map(function (k) { var st = slotState(sides[s], k); return st ? pokemonFromState(st) : null; });
      var tabSpeeds = tabMons.map(function (m) { return m ? C.getSpeed(m, fld, field.sides[s]) : 0; });
      var a = sides[s].active, m = tabMons[a];
      if (m) {
        var base = Math.max(1, C.boosted(m.stats.sp, m.boosts.sp));
        sides[s].$('speedFinal').textContent = T('speedFinal', tabSpeeds[a]) + (tabSpeeds[a] !== base ? T('speedBase', base) : '');
      }
      renderTabs(sides[s], tabMons, tabSpeeds, doubles);
    });
    renderTurnOrder(mons, speeds);

    // results[side][slot][move][target]
    var results = [[[], []], [[], []]];
    [0, 1].forEach(function (s) {
      var o = 1 - s;
      [0, 1].forEach(function (k) {
        var attacker = mons[s][k];
        if (!attacker) return;
        var aSide = sideFieldFor(s, k, mons);
        for (var i = 0; i < 4; i++) {
          results[s][k][i] = [0, 1].map(function (t) {
            var target = mons[o][t];
            if (!target) return null;
            var mv = Object.assign({}, attacker.moves[i]);
            // spread moves only get the 0.75 penalty if both opponents are still there
            if (doubles && !(mons[o][0] && mons[o][1])) mv.singleTarget = true;
            var atk = stanceAdjust(attacker, true, mv), def = stanceAdjust(target, false, null);
            var dSide = sideFieldFor(o, t, mons);
            var r = C.calculate(atk, def, mv, fld, aSide, dSide);
            var info = residualInfo(def, field.sides[o], atk);
            var ko = null;
            if (!r.empty && !r.status && r.damage[r.damage.length - 1] > 0) {
              ko = localKO(C.koChance(r.damage, def, {
                hazards: info.hazards, residual: info.residual, sitrus: info.sitrus,
                sash: (def.item === 'Focus Sash' || def.ability === 'Sturdy') && def.curHP === def.maxHP && !info.hazards
              }));
              if (ko) ko.text = koText(ko, info);
            }
            r.notes = r.notes.map(nNote);
            if (atk.species !== attacker.species) r.notes.push(T('stanceNote', nSpecies(attacker.baseSpecies), nAbility('Stance Change')));
            return { r: r, ko: ko };
          });
        }
      });
    });
    lastResults = results;
    lastMons = mons;
    // keep the selection valid
    if (!results[selected.side][selected.slot] || !results[selected.side][selected.slot][selected.move] ||
        !results[selected.side][selected.slot][selected.move][selected.target]) {
      var a0 = sides[selected.side].active, tgt = mons[1 - selected.side][0] ? 0 : 1;
      if (!doubles) tgt = sides[1 - selected.side].active;
      selected = { side: selected.side, slot: a0, move: selected.move || 0, target: tgt };
    }
    [0, 1].forEach(function (s) { renderMoveResults(s); });
    renderMain();
  }
  var lastMons = [[null, null], [null, null]];

  // Zugreihenfolge of all Pokémon on the field (Trick Room reverses it)
  function renderTurnOrder(mons, speeds) {
    var box = document.getElementById('turnOrder');
    if (!box) return;
    var list = [];
    [0, 1].forEach(function (s) { [0, 1].forEach(function (k) { if (mons[s][k]) list.push({ s: s, k: k, m: mons[s][k], sp: speeds[s][k] }); }); });
    list.sort(function (a, b) { return field.trickRoom ? a.sp - b.sp : b.sp - a.sp; });
    box.innerHTML = '';
    box.appendChild(el('span', { class: 'to-label', text: field.trickRoom ? T('turnOrderTR').replace('Trick Room', nMove('Trick Room')) : T('turnOrder') }));
    list.forEach(function (x, i) {
      if (i) {
        var tie = list[i - 1].sp === x.sp;
        box.appendChild(el('span', { class: 'to-sep', text: tie ? '=' : '›', title: tie ? T('tie') : '' }));
      }
      var c = el('span', { class: 'to-chip s' + (x.s + 1), title: T('speedTitle', nSpecies(x.m.species), x.sp) });
      var ic = el('span', { class: 'to-ic' }); ic.appendChild(spriteImg(x.m.species)); c.appendChild(ic);
      c.appendChild(el('span', { text: String(x.sp) }));
      box.appendChild(c);
    });
  }

  // Results sit next to each move in the attacker's panel (one column per opponent); click → details on top.
  function renderMoveResults(s) {
    var side = sides[s], $ = side.$, k = side.active, o = 1 - s;
    var res = lastResults[s][k] || [];
    var doubles = field.format === 'Doubles';
    // column headers with the opponents
    [0, 1].forEach(function (t) {
      var h = $('mh' + t), m = lastMons[o][t];
      var visible = doubles ? true : t === 0;
      h.innerHTML = '';
      h.style.visibility = visible ? '' : 'hidden';
      var target = doubles ? m : lastMons[o][sides[o].active];
      if (visible && target) {
        var ic = el('span', { class: 'mh-ic' }); ic.appendChild(spriteImg(target.species)); h.appendChild(ic);
        h.appendChild(el('span', { class: 'mh-name', text: T('vs') + ' ' + nSpecies(target.species) }));
      } else if (visible) h.appendChild(el('span', { class: 'mh-name', text: T('noFoe') }));
    });
    for (var i = 0; i < 4; i++) {
      [0, 1].forEach(function (col) {
        var b = $('mres' + i + '_' + col);
        var t = doubles ? col : sides[o].active; // in singles the first column shows the active opponent
        var o2 = (doubles || col === 0) ? (res[i] || [])[t] : null;
        (function (i, t, b) {
          b.onclick = function () {
            selected = { side: s, slot: sides[s].active, move: i, target: t };
            renderMoveResults(0); renderMoveResults(1); renderMain();
          };
        })(i, t, b);
        var pctEl = b.querySelector('.mres-pct'), bar = b.querySelector('.mres-bar');
        b.classList.remove('ko', 'big', 'small', 'none', 'ohko', 'twohko', 'sel', 'nodata');
        b.classList.toggle('sel', !!o2 && selected.side === s && selected.slot === k && selected.move === i && selected.target === t);
        if (!o2) {
          pctEl.textContent = '–'; b.classList.add('nodata'); b.title = T('noFoeSlot');
          bar.querySelector('.f').style.width = '0'; bar.querySelector('.r').style.width = '0';
          return;
        }
        var r = o2.r;
        if (r.empty || r.status) {
          pctEl.textContent = r.empty ? '' : T('statusMove');
          b.classList.add('none'); b.title = '';
          bar.querySelector('.f').style.width = '0'; bar.querySelector('.r').style.width = '0';
          return;
        }
        var mx = r.defender.maxHP, d = r.damage;
        var lo = d[0] / mx * 100, hi = d[d.length - 1] / mx * 100;
        pctEl.textContent = doubles ? Math.round(lo) + '–' + Math.round(hi) + '%' : (Math.round(lo * 10) / 10) + '–' + (Math.round(hi * 10) / 10) + '%';
        bar.querySelector('.f').style.width = Math.min(100, lo) + '%';
        var rEl = bar.querySelector('.r'); rEl.style.left = Math.min(100, lo) + '%'; rEl.style.width = Math.max(0, Math.min(100, hi) - Math.min(100, lo)) + '%';
        b.classList.add(hi >= 100 ? 'ko' : hi >= 50 ? 'big' : 'small');
        if (o2.ko && o2.ko.n === 1) b.classList.add('ohko'); else if (o2.ko && o2.ko.n === 2) b.classList.add('twohko');
        b.title = T('vs') + ' ' + nSpecies(r.defender.species) + ': ' + (Math.round(lo * 10) / 10) + '–' + (Math.round(hi * 10) / 10) + '%' + (o2.ko && o2.ko.text ? ' · ' + o2.ko.text : '') + ' – ' + T('clickDetails');
      });
    }
  }

  function renderMain() {
    var sr = lastResults[selected.side] && lastResults[selected.side][selected.slot];
    var o = sr && sr[selected.move] && sr[selected.move][selected.target];
    var descEl = document.getElementById('mainDesc'), rollsEl = document.getElementById('mainRolls'), notesEl = document.getElementById('mainNotes');
    document.getElementById('mainResult').className = 'main-result from' + (selected.side + 1);
    if (!o || o.r.empty) { descEl.textContent = ''; rollsEl.textContent = ''; notesEl.textContent = ''; return; }
    descEl.textContent = describe(o.r, o.ko);
    rollsEl.textContent = o.r.status ? '' : '(' + o.r.damage.join(', ') + ')';
    var notes = o.r.notes.slice();
    if (o.r.effectiveness === 0) notes.push(T('notesNoEffect'));
    if (o.r.spread) notes.push(T('notesSpread'));
    notesEl.textContent = notes.join(' · ');
  }

  // ======================= custom sets / teams =======================
  function saveCustom(side) {
    var suggestion = side.setName && side.setName !== 'Blank Set' ? side.setName : T('mySet');
    var input = window.prompt(T('setPrompt', nSpecies(side.baseSpecies)), suggestion);
    if (input === null) return;
    var name = input.trim() || suggestion;
    side.setName = name;
    var sp = side.baseSpecies;
    customSets[sp] = customSets[sp] || {};
    customSets[sp][name] = readSet(side);
    save('cc_customSets', customSets);
    side.setLabel = sp + ' (' + name + ')'; side.$('pick').value = displayLabel(side);
    toast(T('setSaved', name));
  }
  function renderTeam(idx) {
    var box = sides[idx].$('team');
    box.innerHTML = '';
    var current = sides[idx].setLabel;
    teams[idx].forEach(function (m, i) {
      var slot = el('div', { class: 'team-slot' + (current === m.species + ' (' + m.setName + ')' ? ' current' : ''), title: T('teamLoad', nSpecies(m.species) + ' (' + nSetName(m.setName) + ')') });
      slot.appendChild(spriteFit(m.set.look || (m.set.forme && m.set.forme.indexOf('Mega ') !== 0 ? m.set.forme : m.species), m.set.shiny));
      slot.addEventListener('click', function () { loadSet(sides[idx], m.species, m.set, m.setName); recalc(); });
      var toOther = el('button', { class: 'slot-btn other', title: T('toOther'), text: '⇄' });
      toOther.addEventListener('click', function (ev) { ev.stopPropagation(); loadSet(sides[1 - idx], m.species, m.set, m.setName); recalc(); });
      var del = el('button', { class: 'slot-btn del', title: T('removeTeam'), text: '✕' });
      del.addEventListener('click', function (ev) { ev.stopPropagation(); teams[idx].splice(i, 1); save('cc_teams', teams); renderTeam(idx); });
      slot.appendChild(toOther); slot.appendChild(del);
      box.appendChild(slot);
    });
    for (var k = teams[idx].length; k < 6; k++) {
      box.appendChild(el('div', { class: 'team-slot empty', title: T('emptySlot') }));
    }
    var acts = el('div', { class: 'team-actions' });
    var ex = el('button', { text: T('exportShort'), title: T('teamExport') });
    var clr = el('button', { text: T('clearShort'), title: T('teamClear') });
    if (!teams[idx].length) { ex.disabled = true; clr.disabled = true; }
    ex.addEventListener('click', function () { showModal(T('teamExport'), teams[idx].map(function (m) { return exportSet(m.set, m.setName, m.species); }).join('\n\n')); });
    clr.addEventListener('click', function () { if (confirm(T('clearConfirm', idx + 1))) { teams[idx] = []; save('cc_teams', teams); renderTeam(idx); } });
    acts.appendChild(ex); acts.appendChild(clr);
    box.appendChild(acts);
  }

  // ======================= Showdown import / export =======================
  var STAT_FROM_SD = { hp: 'hp', atk: 'at', def: 'df', spa: 'sa', spd: 'sd', spe: 'sp' };
  var STAT_TO_SD = { hp: 'HP', at: 'Atk', df: 'Def', sa: 'SpA', sd: 'SpD', sp: 'Spe' };

  function resolveSpecies(raw) {
    var s = raw.trim();
    if (DEX[s]) return { base: baseOf(s), forme: s };
    var id = idOf(s);
    // Showdown mega names: Garchomp-Mega, Charizard-Mega-X
    var mm = s.match(/^(.+?)-Mega(?:-([XYZ]))?$/i);
    if (mm) {
      var megaName = 'Mega ' + mm[1] + (mm[2] ? ' ' + mm[2].toUpperCase() : '');
      if (DEX[megaName]) return { base: baseOf(megaName), forme: megaName };
      var b = DEX_BY_ID[idOf(mm[1])]; if (b) return { base: baseOf(b), forme: null };
    }
    if (DEX_BY_ID[id]) { var k = DEX_BY_ID[id]; return { base: baseOf(k), forme: k }; }
    var alias = { 'floette': 'Floette-Eternal', 'gourgeist': 'Gourgeist-Average', 'lycanroc': 'Lycanroc-Midday', 'aegislash': 'Aegislash', 'meowsticm': 'Meowstic', 'indeedeem': 'Indeedee', 'basculegionm': 'Basculegion', 'mausholdthree': 'Maushold' };
    if (alias[id] && DEX[alias[id]]) return { base: baseOf(alias[id]), forme: alias[id] };
    // cosmetic variant (Vivillon-Polar, Florges-Blue …): same Pokémon, other look
    var parts = s.split('-');
    while (parts.length > 1) {
      parts.pop();
      var r = resolveSpecies(parts.join('-'));
      if (r) {
        var fd = (window.FORM_DATA || {})[idOf(parts.join('-'))] || {};
        (fd.v || []).some(function (v) { if (idOf(v) === id) { r.look = v; return true; } return false; });
        return r;
      }
    }
    return null;
  }

  function parseShowdown(text) {
    var blocks = text.replace(/\r/g, '').split(/\n\s*\n/), out = [], errors = [];
    blocks.forEach(function (block) {
      var lines = block.split('\n').map(function (l) { return l.trim(); }).filter(Boolean);
      if (!lines.length) return;
      if (/^===/.test(lines[0])) lines.shift();
      if (!lines.length) return;
      var first = lines.shift();
      var item = '(none)';
      var at = first.lastIndexOf(' @ ');
      if (at !== -1) { item = first.slice(at + 3).trim(); first = first.slice(0, at).trim(); }
      var gm = first.match(/\s*\((M|F)\)\s*$/), gender = gm ? gm[1] : '';
      first = first.replace(/\s*\((M|F)\)\s*$/, '');
      var nick = null, speciesRaw = first;
      var pm = first.match(/^(.*)\(([^()]+)\)\s*$/);
      if (pm && resolveSpecies(pm[2])) { nick = pm[1].trim(); speciesRaw = pm[2]; }
      var sp = resolveSpecies(speciesRaw);
      if (!sp) { errors.push(speciesRaw); return; }
      var set = { sps: { hp: 0, at: 0, df: 0, sa: 0, sd: 0, sp: 0 }, nature: 'Hardy', ability: '', item: ITEM_BY_ID[idOf(item)] || '(none)', moves: [] };
      var evs = null, spsGiven = null;
      lines.forEach(function (l) {
        var m;
        if ((m = l.match(/^Ability:\s*(.+)$/i))) set.ability = ABIL_BY_ID[idOf(m[1])] || m[1].trim();
        else if (/^Shiny:\s*Yes/i.test(l)) set.shiny = true;
        else if ((m = l.match(/^(EVs|SPs?|Stat Points):\s*(.+)$/i))) {
          var vals = {};
          m[2].split('/').forEach(function (part) {
            var pm2 = part.trim().match(/^(\d+)\s+(\w+)/);
            if (pm2 && STAT_FROM_SD[pm2[2].toLowerCase()]) vals[STAT_FROM_SD[pm2[2].toLowerCase()]] = +pm2[1];
          });
          if (/^EVs$/i.test(m[1])) evs = vals; else spsGiven = vals;
        }
        else if ((m = l.match(/^(\w+)\s+Nature$/i))) { var n = m[1][0].toUpperCase() + m[1].slice(1).toLowerCase(); if (C.NATURES[n]) set.nature = n; }
        else if ((m = l.match(/^[-~]\s*(.+)$/))) {
          var mvn = m[1].replace(/\s*\[.*\]$/, '').trim();
          var hp = mvn.match(/^Hidden Power/i) ? 'Hidden Power' : mvn;
          var mk = MOVE_BY_ID[idOf(hp)];
          if (mk && set.moves.length < 4) set.moves.push(mk);
        }
      });
      if (spsGiven) Object.keys(spsGiven).forEach(function (k) { set.sps[k] = Math.min(C.SP_MAX, spsGiven[k]); });
      else if (evs) {
        var total = 0, maxv = 0; Object.keys(evs).forEach(function (k) { total += evs[k]; maxv = Math.max(maxv, evs[k]); });
        var looksLikeSP = total <= C.SP_TOTAL && maxv <= C.SP_MAX;
        Object.keys(evs).forEach(function (k) { set.sps[k] = looksLikeSP ? evs[k] : C.evToSp(evs[k]); });
      }
      var forme = sp.forme && formesOf(sp.base).indexOf(sp.forme) !== -1 ? sp.forme : null;
      if (forme && forme.indexOf('Mega ') === 0) forme = null; // megas come from the stone
      if (forme) set.forme = forme;
      if (sp.look) set.look = sp.look;
      if (gender) set.gender = gender;
      if (!set.ability) set.ability = DEX[forme || sp.base].ab;
      out.push({ species: sp.base, setName: nick || 'Import', set: set });
    });
    return { mons: out, errors: errors };
  }

  function exportSet(set, name, sp) {
    sp = set.species || sp || (set.forme ? baseOf(set.forme) : '');
    var species = set.look || (set.forme && set.forme.indexOf('Mega ') !== 0 && set.forme !== formesOf(sp)[0] ? set.forme : sp);
    var lines = [];
    lines.push((name && name !== 'Import' && name !== 'Mein Set' && name !== 'My set' && name !== 'Blank Set' && name !== 'Set' && name !== species ? name + ' (' + species + ')' : species) +
      (set.gender === 'M' || set.gender === 'F' ? ' (' + set.gender + ')' : '') + (set.item && set.item !== '(none)' ? ' @ ' + set.item : ''));
    if (set.ability) lines.push('Ability: ' + set.ability);
    lines.push('Level: 50');
    if (set.shiny) lines.push('Shiny: Yes');
    var sps = C.STAT_KEYS.filter(function (k) { return set.sps[k]; }).map(function (k) { return set.sps[k] + ' ' + STAT_TO_SD[k]; });
    if (sps.length) lines.push('SPs: ' + sps.join(' / '));
    lines.push(set.nature + ' Nature');
    set.moves.forEach(function (m) { lines.push('- ' + m); });
    return lines.join('\n');
  }

  function doImport(target) {
    var txt = document.getElementById('importText').value;
    var parsed = parseShowdown(txt), msg = document.getElementById('importMsg');
    if (!parsed.mons.length) { msg.textContent = T('importNothing') + (parsed.errors.length ? ' (' + T('unknown', parsed.errors.join(', ')) + ')' : ''); return; }
    if (target === 'custom') {
      parsed.mons.forEach(function (m) {
        var name = m.setName === 'Import' ? 'Import' : m.setName;
        customSets[m.species] = customSets[m.species] || {};
        customSets[m.species][name] = m.set;
      });
      save('cc_customSets', customSets);
      msg.textContent = T('importedCustom', parsed.mons.length);
    } else {
      teams[target] = parsed.mons.slice(0, 6);
      save('cc_teams', teams);
      // the first two team members become slot A and B
      var side = sides[target], mons = parsed.mons;
      side.slots = [null, null];
      if (mons[1]) {
        side.active = 1;
        loadSet(side, mons[1].species, mons[1].set, mons[1].setName);
        side.slots[1] = captureState(side);
      }
      side.active = 0;
      loadSet(side, mons[0].species, mons[0].set, mons[0].setName);
      renderTeam(target);
      recalc();
      msg.textContent = T('importedTeam', parsed.mons.length, T(target ? 'right' : 'left'));
    }
    if (parsed.errors.length) msg.textContent += T('notAvailable', parsed.errors.join(', '));
    else if (target !== 'custom') { document.getElementById('importModal').classList.add('hidden'); toast(msg.textContent); }
  }

  // ======================= modal / misc =======================
  function showModal(title, text) {
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalText').value = text;
    document.getElementById('modal').classList.remove('hidden');
  }
  function copy(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function () { toast(T('copied')); }, function () { toast(T('copyFail')); });
    else { var t = el('textarea'); t.value = text; document.body.appendChild(t); t.select(); document.execCommand('copy'); t.remove(); toast(T('copied')); }
  }

  // The layout is designed for about 1160 x 735 px. Larger windows scale the whole UI up evenly
  // (zoom), so the space below is used instead of staying empty. Smaller windows keep the scroll fallback.
  var BASE_W = 1180, BASE_H = 800;
  function fitToWindow() {
    var b = document.body;
    var z = Math.min(innerWidth / BASE_W, innerHeight / BASE_H, 1.9);
    if (z < 0.8) z = 1; // very small windows: keep 100 % and let the page scroll (CSS fallback)
    if (Math.abs(z - 1) > 0.02) {
      z = Math.floor(z * 100) / 100;
      b.style.zoom = z;
      b.style.height = (innerHeight / z) + 'px'; // specified lengths are zoomed too: this fills exactly the window
    } else {
      b.style.zoom = ''; b.style.height = '';
    }
  }
  function init() {
    fitToWindow();
    window.addEventListener('resize', fitToWindow);
    document.documentElement.lang = LANG;
    document.body.classList.add('lang-' + LANG);
    applyStatic(document);
    document.querySelectorAll('[data-th]').forEach(function (e) { e.innerHTML = T(e.dataset.th); });
    buildPanel(0); buildPanel(1); buildField();
    var first = SETDEX['Aegislash'] ? 'Aegislash' : SPECIES[0];
    var sets = SETDEX[first] || {};
    var sn = Object.keys(sets)[0];
    var saved = load('cc_state', null);
    [0, 1].forEach(function (s) {
      var side = sides[s], sv = saved && saved[s];
      if (sv && sv.empty && sv.slots) { // side was cleared with "Reset"; the other slot may hold a Pokémon
        side.slots = [sv.slots[0], sv.slots[1]]; side.active = sv.active || 0; side.slots[side.active] = null;
        setEmpty(side, true);
        return;
      }
      var ok = sv && sv.slots && sv.slots[sv.active] && DEX[sv.slots[sv.active].baseSpecies];
      if (ok) {
        side.slots = [sv.slots[0], sv.slots[1]];
        side.active = sv.active;
        var st = side.slots[side.active];
        side.slots[side.active] = null;
        try { restoreState(side, st); } catch (e) { ok = false; }
      }
      if (!ok) {
        // fresh start: slot A = default set, slot B = a sensible partner
        side.active = 1; side.slots = [null, null];
        var d = defaultPartner({ idx: s, baseSpecies: first });
        loadSet(side, d.species, d.set, d.name);
        side.slots[1] = captureState(side);
        side.active = 0;
        loadSet(side, first, sn ? sets[sn] : null, sn || 'Blank Set');
      }
    });
    var importModal = document.getElementById('importModal');
    document.getElementById('btnOpenImport').addEventListener('click', function () {
      importModal.classList.remove('hidden'); document.getElementById('importMsg').textContent = '';
      setTimeout(function () { document.getElementById('importText').focus(); }, 30);
    });
    document.getElementById('importClose').addEventListener('click', function () { importModal.classList.add('hidden'); });
    [importModal, document.getElementById('modal')].forEach(function (m) {
      m.addEventListener('mousedown', function (ev) { if (ev.target === m) m.classList.add('hidden'); });
    });
    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape') { importModal.classList.add('hidden'); document.getElementById('modal').classList.add('hidden'); }
    });
    document.getElementById('btnImportLeft').addEventListener('click', function () { doImport(0); });
    document.getElementById('btnImportRight').addEventListener('click', function () { doImport(1); });
    document.getElementById('btnImportCustom').addEventListener('click', function () { doImport('custom'); });
    document.getElementById('btnDeleteCustom').addEventListener('click', function () {
      if (confirm(T('deleteConfirm'))) { customSets = {}; save('cc_customSets', customSets); toast(T('deleted')); }
    });
    document.getElementById('modalClose').addEventListener('click', function () {
      document.getElementById('modal').classList.add('hidden');
      if (pendingReload) location.reload(); // after an online update: rebuild with the new data
    });
    document.getElementById('modalCopy').addEventListener('click', function () { copy(document.getElementById('modalText').value); });
    document.getElementById('mainDesc').addEventListener('click', function () { var t = this.textContent; if (t) copy(t); });
    document.getElementById('btnSwap').addEventListener('click', function () {
      // swap both sides completely (both slots)
      var snap = [0, 1].map(function (s) {
        var side = sides[s], slots = side.slots.slice();
        slots[side.active] = side.empty ? null : captureState(side);
        return { slots: slots, active: side.active };
      });
      [0, 1].forEach(function (s) {
        var side = sides[s], src = snap[1 - s];
        side.slots = src.slots.slice(); side.active = src.active;
        var st = side.slots[side.active]; side.slots[side.active] = null;
        if (st) restoreState(side, st); else setEmpty(side, true);
      });
      selected.side = 1 - selected.side;
      recalc();
    });
    setTheme = function (light) { document.body.classList.toggle('light', light); save('cc_light', light); };
    document.body.classList.toggle('light', !!load('cc_light', false));
    function saveState() {
      save('cc_state', [0, 1].map(function (s) {
        var side = sides[s], slots = side.slots.slice();
        slots[side.active] = side.empty ? null : captureState(side);
        return { slots: slots, active: side.active, empty: !!side.empty };
      }));
    }
    window.addEventListener('beforeunload', saveState);
    // language switch: save everything and rebuild the page in the other language
    setLang = function (lang) {
      if (lang === LANG) return;
      saveState();
      save('cc_lang', lang);
      location.reload();
    };
    // ---- online updates (js/online.js): popular sets and new regulation ----
    function onlineRun(btn, job, report) {
      if (!ONLINE || btn.disabled) return;
      var label = btn.textContent;
      btn.disabled = true; btn.textContent = T('loading');
      job(function (step) { btn.title = step; }).then(function (res) {
        saveState(); pendingReload = true;
        showModal(report.title(res), report.text(res) + '\n\n' + T('reloadHint'));
      }, function (err) {
        showModal(T('onlineFail', ''), T('onlineFail', err && err.message ? err.message : err) + (err && err.stack ? '\n\n' + err.stack : ''));
        if (window.console) console.error(err);
      }).then(function () { btn.disabled = false; btn.textContent = label; applyStatic(btn.parentNode); });
    }
    var de = LANG === 'de';
    document.getElementById('btnSets').addEventListener('click', function () {
      onlineRun(this, function (p) { return ONLINE.updateSets(mapSpecies, p); }, {
        title: function () { return T('setsDone'); },
        text: function (r) {
          var L = [];
          L.push('NCP-Setdex: ' + (r.ncp != null ? r.ncp + (de ? ' Sets' : ' sets') : (de ? 'Fehler – ' : 'error – ') + r.ncpError));
          L.push((de ? 'Usage-Statistik' : 'Usage stats') + ': ' + (r.usage != null ? r.usage + (de ? ' Pokémon (meistgespieltes Set, ' : ' Pokémon (most used set, ') + r.usageFile + ', ' + (r.battles || 0).toLocaleString() + (de ? ' Kämpfe)' : ' battles)') : (de ? 'Fehler – ' : 'error – ') + r.usageError));
          L.push('Smogon-Sets: ' + (r.smogon != null ? r.smogon + ' (' + r.smogonFile + ')' : (de ? 'Fehler – ' : 'error – ') + r.smogonError));
          if (r.unknown && r.unknown.length) L.push('', (de ? 'Nicht im Rechner (erst „Regulation laden“ ausführen): ' : 'Not in the calculator (run “Load regulation” first): ') + r.unknown.join(', '));
          L.push('', de ? 'Im Set-Suchfeld erscheinen sie mit den Markierungen „Usage“ und „Smogon“.' : 'They appear in the set search tagged “Usage” and “Smogon”.');
          return L.join('\n');
        }
      });
    });
    document.getElementById('btnReg').addEventListener('click', function () {
      onlineRun(this, ONLINE.updateRegulation, {
        title: function (r) { return T('regReport', r.name); },
        text: function (r) {
          var L = [];
          L.push((de ? 'Aktuelle Regulation: ' : 'Current regulation: ') + r.name + (de ? ' (Quelle: Pokémon Showdown)' : ' (source: Pokémon Showdown)'));
          L.push((de ? 'Erlaubte Pokémon und Formen: ' : 'Legal Pokémon and formes: ') + r.legal);
          L.push((de ? 'Neu hinzugefügt (' : 'Newly added (') + r.added.length + '): ' + (r.added.length ? r.added.map(nSpecies).join(', ') : (de ? 'keine, der Rechner ist aktuell' : 'none, the calculator is up to date')));
          L.push((de ? 'Neue Attacken (' : 'New moves (') + r.moves.length + '): ' + (r.moves.join(', ') || '–'));
          L.push((de ? 'Erlaubte Items laut Showdown: ' : 'Legal items according to Showdown: ') + r.itemsLegal + (de ? ', neu hinzugefügt (' : ', newly added (') + r.items.length + '): ' + (r.items.length ? r.items.map(nItem).join(', ') : (de ? 'keine, die Item-Liste ist aktuell' : 'none, the item list is up to date')));
          L.push((de ? 'Lernsets und Fähigkeiten: aktualisiert' : 'Learnsets and abilities: updated'));
          L.push('', (de ? 'Alle Champions-VGC-Regulationen bei Showdown: ' : 'All Champions VGC regulations on Showdown: ') + r.allRegs.join(', '));
          return L.join('\n');
        }
      });
    });
    document.getElementById('btnResetOnline').addEventListener('click', function () {
      if (!ONLINE || !confirm(T('resetConfirm'))) return;
      saveState(); ONLINE.reset(); location.reload();
    });
    recalc();
    initViews();
    if (location.hash === '#selftest') setTimeout(runSelfTest, 200);
    // #runreg / #runsets: start an online update right away (for testing without clicking)
    if (location.hash === '#runreg') document.getElementById('btnReg').click();
    if (location.hash === '#runsets') document.getElementById('btnSets').click();
    if (location.hash === '#runreset') document.getElementById('btnReset').click();
    // ?teamdemo: right team bar with differently sized sprites, for checking the layout (only shown, not saved)
    if (/[?&]teamdemo\b/.test(location.search)) {
      teams[1] = ['Archaludon', 'Basculegion', 'Gardevoir', 'Sneasler', 'Pikachu', 'Aegislash'].map(function (sp) { return { species: sp, setName: 'Demo', set: defaultSet(sp) }; });
      renderTeam(1);
    }
  }

  // ---- self test (open index.html#selftest) ----
  function runSelfTest() {
    var log = [], box = el('pre', { id: 'selftest', style: 'position:fixed;top:0;left:0;right:0;z-index:9999;background:#000;color:#0f0;font:11px monospace;margin:0;padding:6px;max-height:50vh;overflow:auto' });
    document.body.insertBefore(box, document.body.firstChild);
    function L(s) { log.push(s); box.textContent = log.join('\n'); }
    function clickEl(e) { e.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })); }
    function tab(s, k) { return sides[s].$('tabs').querySelector('[data-slot="' + k + '"]'); }
    // learnsets: every species/forme should have legal moves and abilities
    var noMv = [], noAb = [], setIllegal = [];
    Object.keys(DEX).forEach(function (k) {
      if (!legalMoves(k)) noMv.push(k);
      if (!abilList(k)) noAb.push(k);
    });
    Object.keys(SETDEX).forEach(function (sp) {
      Object.keys(SETDEX[sp]).forEach(function (n) {
        var s = SETDEX[sp][n], lm = legalMoves(sp) || [], la = legalAbilities(sp) || [];
        (s.moves || []).forEach(function (m) { if (MOVES[m] && lm.indexOf(m) === -1) setIllegal.push(sp + ': ' + m); });
        if (s.ability && la.indexOf(s.ability) === -1) setIllegal.push(sp + ': Ability ' + s.ability);
      });
    });
    L('Lernsets: ' + (Object.keys(DEX).length - noMv.length) + '/' + Object.keys(DEX).length + ' mit Attacken. Ohne: ' + noMv.join(', '));
    L('Ohne Fähigkeitsliste: ' + noAb.join(', '));
    // online data (Sets laden / Regulation laden)
    var cntSets = function (o) { return Object.keys(o || {}).reduce(function (n, k) { return n + Object.keys(o[k]).length; }, 0); };
    L('Online: Regulation=' + ((ONLINE && ONLINE.reg && ONLINE.reg.name) || '–') + ' (neu: ' + ((ONLINE && ONLINE.reg && ONLINE.reg.added) || []).join(', ') + ')' +
      ' | Formen Toxtricity=' + formesOf('Toxtricity').join('/') + ' Squawkabilly=' + formesOf('Squawkabilly').join('/') +
      ' | Sets NCP=' + cntSets(SETDEX) + ' Usage=' + cntSets(ONLINE_SETS.usage) + ' Smogon=' + cntSets(ONLINE_SETS.smogon));
    var rb = (ONLINE_SETS.usage || {}).Rillaboom;
    if (rb) { var rk = Object.keys(rb)[0]; L('Rillaboom ' + rk + ': ' + JSON.stringify(rb[rk])); }
    L('Set-Attacken/Fähigkeiten außerhalb Lernset: ' + setIllegal.length + ' ' + setIllegal.slice(0, 40).join(' | '));
    try {
      var fmt = document.querySelector('#fieldPanel .btn-group[data-key="format"] button[data-v="Doubles"]');
      clickEl(fmt); L('format=' + field.format);
      [0, 1].forEach(function (s) {
        var sd = sides[s];
        L('side' + s + ' start active=' + sd.active + ' editor=' + sd.baseSpecies + ' slots=' + sd.slots.map(function (x) { return x ? x.baseSpecies : '-'; }));
        var other = 1 - sd.active, before = sd.baseSpecies;
        var t = tab(s, other); L('  tab' + other + ' exists=' + !!t);
        if (t) clickEl(t);
        L('  after click tab' + other + ': active=' + sd.active + ' editor=' + sd.baseSpecies + ' (vorher ' + before + ')');
        t = tab(s, 1 - other); if (t) clickEl(t);
        L('  back: active=' + sd.active + ' editor=' + sd.baseSpecies);
      });
      var r = lastResults[0][sides[0].active][0];
      L('result P1 move0: vsA=' + (r && r[0] ? r[0].r.damage[0] + '-' + r[0].r.damage[15] : '-') + ' vsB=' + (r && r[1] ? r[1].r.damage[0] + '-' + r[1].r.damage[15] : '-'));
      function dmg(o) { return o ? o.r.damage[0] + '-' + o.r.damage[o.r.damage.length - 1] + (o.r.spread ? ' (spread x0.75)' : '') : 'leer'; }
      // spread move of the opponent's slot B (Garchomp Earthquake) against both of our Pokémon
      var eqIdx = -1, gk = -1;
      [0, 1].forEach(function (k) {
        var st = slotState(sides[1], k);
        if (st) st.moves.forEach(function (m, i) { if (m.name === 'Earthquake') { eqIdx = i; gk = k; } });
      });
      if (eqIdx >= 0) {
        var g = lastResults[1][gk][eqIdx];
        L('EQ vs A / B (beide da): ' + dmg(g[0]) + ' | ' + dmg(g[1]));
        // Friend Guard on our partner
        var savedB = sides[0].slots[1 - sides[0].active];
        var partnerIdx = 1 - sides[0].active;
        sides[0].slots[partnerIdx] = Object.assign({}, savedB, { ability: 'Friend Guard' });
        recalc();
        g = lastResults[1][gk][eqIdx];
        L('mit Friend Guard beim Partner: vs aktives ' + dmg(g[sides[0].active]));
        sides[0].slots[partnerIdx] = savedB; recalc();
        removeSlotB(sides[0]);
        g = lastResults[1][gk][eqIdx];
        L('nach Entfernen von B: vs A ' + dmg(g[0]) + ' | vs B ' + dmg(g[1]));
      } else L('kein Earthquake beim Gegner gefunden');
      // Delta Stream: Rock Slide vs Charizard (Fire/Flying, 4x weak) only 2x effective
      var oldW = field.weather;
      loadSet(sides[0], 'Garchomp', { sps: { hp: 0, at: 32, df: 0, sa: 0, sd: 0, sp: 32 }, nature: 'Adamant', ability: 'Rough Skin', item: '(none)', moves: ['Rock Slide'] }, 'Test');
      loadSet(sides[1], 'Charizard', null, 'Blank Set');
      field.weather = 'None'; recalc();
      var rsNone = lastResults[0][sides[0].active][0][sides[1].active];
      field.weather = 'Strong Winds'; recalc();
      var rsWind = lastResults[0][sides[0].active][0][sides[1].active];
      L('Delta Stream – Steinhagel vs Glurak: ohne ' + dmg(rsNone) + ' (Eff. ' + (rsNone && rsNone.r.effectiveness) + ') | mit ' + dmg(rsWind) + ' (Eff. ' + (rsWind && rsWind.r.effectiveness) + ')');
      field.weather = oldW; recalc();
      // species switch: lists follow the new Pokémon, Mega stone switches the ability list
      var s0 = sides[0], abs = function () { return Array.prototype.map.call(s0.$('ability').options, function (o) { return o.value; }).join('/'); };
      loadSet(s0, 'Charizard', null, 'Blank Set');
      L('Charizard: ' + s0.$('mv0').options.length + ' Attacken, Fähigkeiten ' + abs() + ', Flammenwurf da: ' + Array.prototype.some.call(s0.$('mv0').options, function (o) { return o.value === 'Flamethrower'; }) + ', Poltergeist da: ' + Array.prototype.some.call(s0.$('mv0').options, function (o) { return o.value === 'Poltergeist'; }));
      s0.$('item').value = 'Charizardite Y'; syncMegaForItem(s0);
      L('mit Glurakinit Y: Form ' + s0.$('forme').value + ', Fähigkeiten ' + abs() + ', gewählt ' + s0.$('ability').value);
      loadSet(s0, 'Incineroar', { ability: 'Intimidate', moves: ['Fake Out', 'Flare Blitz', 'Poltergeist'] }, 'Test');
      L('Incineroar mit illegaler Attacke: mv2=' + s0.$('mv2').value + ' Label="' + s0.$('mv2').selectedOptions[0].textContent + '", Fähigkeiten ' + abs());
      L('SELFTEST FERTIG');
    } catch (e) { L('FEHLER: ' + e.message + '\n' + e.stack); }
  }

  // ======================= settings =======================
  // cc_settings: { model: '3d' | 'sprite', start: 'start' | 'calc' | 'builder' }; theme and language keep their own keys
  var SETTING_DEFAULTS = { model: '3d', start: 'start', nav: 'tabs' };
  var setTheme = function () {}, setLang = function () {};
  function setting(k) { var s = load('cc_settings', {}) || {}; return s[k] != null ? s[k] : SETTING_DEFAULTS[k]; }
  function setSetting(k, v) { var s = load('cc_settings', {}) || {}; s[k] = v; save('cc_settings', s); }
  var settingsModal = null, settingsRedraw = null;
  // update state from the desktop app (electron/updater.js): idle | checking | none | available | progress | ready | portable | error | off
  var updStatus = { state: 'off' };
  function updMessage(s) {
    switch (s.state) {
      case 'checking': return T('updChecking');
      case 'none': return T('updNone');
      case 'available': return T('updLoading', s.version);
      case 'progress': return T('updProgress', s.version, s.percent);
      case 'ready': return T('updReadyMsg', s.version);
      case 'portable': return T('updPortableMsg', s.version);
      case 'error': return T('updErr', s.message || '?');
      case 'off': return T('updOff');
      default: return '';
    }
  }
  function updRow(box) {
    var D = window.desktop, s = updStatus;
    var r = el('div', { class: 'set-row' });
    var lab = el('div', { class: 'set-label' });
    lab.appendChild(el('div', { class: 'set-name', text: T('setUpd') }));
    lab.appendChild(el('div', { class: 'hint', text: T(s.portable ? 'setUpdHintP' : 'setUpdHint', s.current || '?') }));
    var msg = updMessage(s);
    if (msg) lab.appendChild(el('div', { class: 'hint upd-msg upd-' + s.state, text: msg }));
    r.appendChild(lab);
    var g = el('div', { class: 'btn-group set-opts' }), b;
    if (s.state === 'ready' || s.state === 'portable') {
      b = el('button', { class: 'on', text: T(s.state === 'ready' ? 'updRestart' : 'updDownload') });
      b.addEventListener('click', function () { D.update.install(); });
    } else {
      b = el('button', { text: T(s.state === 'checking' ? 'updChecking' : 'updCheck') });
      b.disabled = s.state === 'checking' || s.state === 'available' || s.state === 'progress' || s.state === 'off';
      b.addEventListener('click', function () { D.update.check(); });
    }
    g.appendChild(b);
    r.appendChild(g);
    box.appendChild(r);
  }
  function openSettings() {
    if (settingsModal) return;
    settingsModal = el('div', { class: 'modal set-modal' });
    var bx = el('div', { class: 'modal-box set-box' });
    settingsModal.appendChild(bx);
    document.body.appendChild(settingsModal);
    function close() {
      if (!settingsModal) return;
      settingsModal.remove(); settingsModal = null; settingsRedraw = null; document.removeEventListener('keydown', key, true);
    }
    function key(ev) { if (ev.key === 'Escape') { ev.stopPropagation(); close(); } }
    document.addEventListener('keydown', key, true);
    settingsModal.addEventListener('mousedown', function (ev) { if (ev.target === settingsModal) close(); });
    function draw() {
      bx.innerHTML = '';
      var head = el('div', { class: 'nat-head' });
      head.appendChild(el('h3', { text: T('setTitle') }));
      var done = el('button', { class: 'primary-btn', text: T('tbDone') });
      done.addEventListener('click', close);
      head.appendChild(done);
      bx.appendChild(head);
      function row(title, hint, opts, cur, pick) {
        var r = el('div', { class: 'set-row' });
        var lab = el('div', { class: 'set-label' });
        lab.appendChild(el('div', { class: 'set-name', text: title }));
        if (hint) lab.appendChild(el('div', { class: 'hint', text: hint }));
        r.appendChild(lab);
        var g = el('div', { class: 'btn-group set-opts' });
        opts.forEach(function (o) {
          var b = el('button', { class: o[0] === cur ? 'on' : '', text: o[1], 'data-v': o[0] });
          b.addEventListener('click', function () { if (o[0] !== cur) { pick(o[0]); draw(); } });
          g.appendChild(b);
        });
        r.appendChild(g);
        bx.appendChild(r);
      }
      row(T('setModel'), T('setModelHint'), [['3d', T('set3d')], ['sprite', T('setSprite')]], setting('model'), function (v) {
        setSetting('model', v);
        if (window.CCBuilder && document.body.dataset.view === 'builder') window.CCBuilder.render();
      });
      row(T('setTheme'), '', [['dark', T('setDark')], ['light', T('setLight')]], document.body.classList.contains('light') ? 'light' : 'dark', function (v) { setTheme(v === 'light'); });
      row(T('setNav'), T('setNavHint'), [['tabs', T('setNavTabs')], ['all', T('setNavAll')], ['off', T('setNavOff')]], setting('nav'), function (v) { setSetting('nav', v); renderNav(); });
      row(T('setStart'), T('setStartHint'), [['start', T('setStartScreen')], ['calc', T('navCalc')], ['builder', T('navBuilder')], ['soullink', T('navSL')], ['nuz', T('navNuz')], ['shiny', T('navShiny')], ['match', T('navMatch')]], setting('start'), function (v) { setSetting('start', v); });
      row(T('setLang'), T('setLangHint'), [['de', 'Deutsch'], ['en', 'English']], LANG, function (v) { close(); setLang(v); });
      if (window.desktop && window.desktop.update) updRow(bx);
    }
    settingsRedraw = draw;
    draw();
  }

  // ======================= views: start screen / calculator / teambuilder =======================
  var VIEWS = ['start', 'calc', 'builder', 'soullink', 'nuz', 'shiny', 'match'];
  function showView(v) {
    if (VIEWS.indexOf(v) === -1) v = 'start';
    document.body.dataset.view = v;
    try { sessionStorage.setItem('cc_view', v); } catch (e) { /* ignore */ }
    if (v !== 'start' && openTabs.indexOf(v) === -1) { openTabs.push(v); save('cc_tabs', openTabs); }
    renderNav();
    if (v === 'builder' && window.CCBuilder) window.CCBuilder.render();
    if (v === 'soullink' && window.CCSoulLink) window.CCSoulLink.render();
    if (v === 'nuz' && window.CCNuz) window.CCNuz.render();
    if (v === 'shiny' && window.CCShiny) window.CCShiny.render();
    if (v === 'match' && window.CCMatch) window.CCMatch.render();
    if (v === 'start' && window.CCShiny) window.CCShiny.renderStartArt();
    if (v === 'start') renderStartTeam();
    if (v === 'calc') { var r = document.getElementById('calcView'); if (r) r.scrollTop = 0; }
  }
  // ---- top navigation: tabs (only the opened modes, closable), all modes, or none (setting "nav") ----
  var MODES = [['calc', 'navCalc'], ['builder', 'navBuilder'], ['soullink', 'navSL'], ['nuz', 'navNuz', true], ['shiny', 'navShiny'], ['match', 'navMatch']];
  var openTabs = (load('cc_tabs', []) || []).filter(function (v) { return VIEWS.indexOf(v) > 0; });
  function closeTab(v) {
    var i = openTabs.indexOf(v);
    if (i === -1) return;
    openTabs.splice(i, 1); save('cc_tabs', openTabs);
    if (document.body.dataset.view === v) showView(openTabs[Math.min(i, openTabs.length - 1)] || 'start');
    else renderNav();
  }
  function renderNav() {
    var nav = document.getElementById('viewNav');
    if (!nav) return;
    var mode = setting('nav'), cur = document.body.dataset.view;
    nav.innerHTML = '';
    nav.className = 'view-nav nav-' + mode;
    if (mode === 'off' || (mode === 'all' && cur === 'start')) return;
    MODES.forEach(function (m) {
      if (mode === 'tabs' && openTabs.indexOf(m[0]) === -1) return;
      var b = el('button', { class: 'nav-tab' + (m[0] === cur ? ' on' : ''), 'data-go': m[0] });
      b.appendChild(el('span', { class: 'nav-label', text: T(m[1]) }));
      if (m[2]) b.appendChild(el('span', { class: 'alpha-badge', text: 'ALPHA' }));
      b.addEventListener('click', function () { showView(m[0]); });
      if (mode === 'tabs') {
        var x = el('span', { class: 'nav-close', text: '×', title: T('closeTab') });
        x.addEventListener('click', function (ev) { ev.stopPropagation(); closeTab(m[0]); });
        b.appendChild(x);
        b.addEventListener('mousedown', function (ev) { if (ev.button === 1) { ev.preventDefault(); closeTab(m[0]); } });
      }
      nav.appendChild(b);
    });
    if (mode === 'tabs' && openTabs.length && cur !== 'start') {
      var plus = el('button', { class: 'nav-new', text: '+', title: T('newTab') });
      plus.addEventListener('click', function () { showView('start'); });
      nav.appendChild(plus);
    }
  }
  // the builder card on the start screen shows the team that was edited last
  function renderStartTeam() {
    var box = document.getElementById('startTeam');
    if (!box) return;
    var st = load('cc_builder', null), team = null;
    if (st && st.teams) st.teams.some(function (t) { if (t.id === st.cur) { team = t; return true; } return false; });
    var mons = team && team.mons.length ? team.mons.map(function (m) { return m.set && m.set.forme && m.set.forme.indexOf('Mega ') !== 0 ? m.set.forme : m.species; })
      : ['Incineroar', 'Rillaboom', 'Garchomp', 'Sneasler', 'Kingambit', 'Sinistcha'].filter(function (s) { return DEX[s]; });
    box.innerHTML = '';
    for (var i = 0; i < 6; i++) {
      var c = el('span', { class: 'sc-mon' + (mons[i] ? '' : ' empty') });
      if (mons[i]) c.appendChild(spriteFit(mons[i]));
      box.appendChild(c);
    }
  }
  function initViews() {
    document.querySelectorAll('[data-go]').forEach(function (b) {
      b.addEventListener('click', function () { showView(b.dataset.go); });
    });
    document.getElementById('btnHome').addEventListener('click', function () { showView('start'); });
    document.getElementById('btnSettings').addEventListener('click', openSettings);
    document.addEventListener('keydown', function (ev) {
      if (document.body.dataset.view !== 'start' || ev.ctrlKey || ev.altKey || ev.metaKey) return;
      if (ev.key === '1') showView('calc');
      if (ev.key === '2') showView('builder');
      if (ev.key === '3') showView('soullink');
      if (ev.key === '4') showView('nuz');
      if (ev.key === '5') showView('shiny');
      if (ev.key === '6') showView('match');
    });
    var sub = document.getElementById('startSub');
    if (sub) sub.textContent = T('startSub') + ' · VGC 2026 · ' + REG_NAME;
    // desktop app (Electron): the top bar is the title bar, with own window buttons
    var D = window.desktop;
    if (D) {
      document.body.classList.add('is-desktop');
      var wc = document.getElementById('winControls');
      wc.hidden = false;
      document.getElementById('winMin').addEventListener('click', function () { D.minimize(); });
      document.getElementById('winMax').addEventListener('click', function () { D.toggleMaximize(); });
      document.getElementById('winClose').addEventListener('click', function () { D.close(); });
      D.onMaximized(function (m) {
        document.body.classList.toggle('is-maximized', m);
        document.getElementById('winMax').title = T(m ? 'winRestore' : 'winMax');
      });
      // updates: checked on every start; the button appears once an update is downloaded (or, portable, available)
      if (D.update) {
        var ub = document.getElementById('btnUpdate');
        var applyUpd = function (s) {
          if (!s) return;
          updStatus = s;
          var show = s.state === 'ready' || s.state === 'portable';
          ub.hidden = !show;
          if (show) {
            ub.textContent = T(s.state === 'ready' ? 'updReady' : 'updPortable', s.version);
            ub.title = T(s.state === 'ready' ? 'updReadyT' : 'updPortableT', s.version);
          }
          if (settingsRedraw) settingsRedraw();
        };
        ub.addEventListener('click', function () { D.update.install(); });
        D.update.onStatus(applyUpd);
        D.update.get().then(applyUpd);
      }
    }
    // test hooks and reloads (language switch) keep the current view; a fresh start shows the start screen
    var v = 'start';
    if (/^#(selftest|runreg|runsets|runreset|calc)$/.test(location.hash) || /[?&]teamdemo\b/.test(location.search)) v = 'calc';
    else if (location.hash === '#builder') v = 'builder';
    else if (location.hash === '#nuz') v = 'nuz';
    else if (location.hash === '#soullink') v = 'soullink';
    else if (location.hash === '#shiny') v = 'shiny';
    else if (location.hash === '#match' || location.hash === '#matchtest') v = 'match';
    else { try { v = sessionStorage.getItem('cc_view') || setting('start'); } catch (e) { v = setting('start'); } }
    showView(v);
  }

  // puts a team from the teambuilder into a team bar of the calculator; the first two become slot A and B
  function setCalcTeam(idx, mons) {
    mons = JSON.parse(JSON.stringify(mons.slice(0, 6)));
    teams[idx] = mons;
    save('cc_teams', teams);
    var side = sides[idx];
    if (mons.length) {
      side.slots = [null, null];
      if (mons[1]) { side.active = 1; loadSet(side, mons[1].species, mons[1].set, mons[1].setName); side.slots[1] = captureState(side); }
      side.active = 0;
      loadSet(side, mons[0].species, mons[0].set, mons[0].setName);
    }
    renderTeam(idx);
    recalc();
  }

  // shared helpers for js/builder.js (teambuilder)
  window.CC = {
    C: C, DEX: DEX, MOVES: MOVES, ITEMS: ITEMS, ABILITIES: ABILITIES, SPECIES: SPECIES, NATURE_NAMES: NATURE_NAMES, LANG: LANG,
    TYPE_COLORS: TYPE_COLORS, DARK_TEXT_TYPES: DARK_TEXT_TYPES,
    baseOf: baseOf, formesOf: formesOf, megaFormeFor: megaFormeFor, legalMoves: legalMoves, legalAbilities: legalAbilities,
    nSpecies: nSpecies, nMove: nMove, nItem: nItem, nAbility: nAbility, nNature: nNature, nType: nType, nStat: nStat, nStatLong: nStatLong,
    natureLabel: natureLabel, kindLabel: kindLabel, sortedBy: sortedBy, nSetName: nSetName,
    el: el, esc: esc, opt: opt, toast: toast, showModal: showModal, copy: copy, load: load, save: save, T: T,
    typeBadge: typeBadge, spriteImg: spriteImg, spriteUrl: spriteUrl, idOf: idOf, FORM_DE: FORM_DE, spriteFit: spriteFit, speciesGroups: speciesGroups, defaultSet: defaultSet,
    parseShowdown: parseShowdown, exportSet: exportSet, setCalcTeam: setCalcTeam, showView: showView,
    setting: setting, openSettings: openSettings
  };
  // expose for debugging
  window.CCApp = { parseShowdown: parseShowdown, exportSet: exportSet, readPokemon: function (i) { return readPokemon(sides[i]); }, DEX: DEX, MOVES: MOVES };
  document.addEventListener('DOMContentLoaded', init);
})();

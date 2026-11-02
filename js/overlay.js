// Match-Overlay: Steuerung der OBS-Overlays für Matches (Taste 7). Übernommen aus den eigenen Python-Overlays
// „Team Overlay“ (vgc_team_overlay.py) und „Teampreview“ (pokemon_team_overlay.py), jetzt ohne Python in der App.
// - Team-Overlay: mein Team und Gegner als Spalte (mitgebracht, KP, K.O.), Turnier- und Ladder-Modus
// - Teampreview: beide Teams als Bild, Bank, Closed Team Sheet; dazu Matchup-Banner und Startseite mit Teamlogos
// Jedes Overlay lässt sich einzeln ein- und ausschalten. Die Seiten liefert electron/match.js auf dem lokalen OBS-Server aus;
// diese Datei bereitet den Stand fertig auf (Namen in der Overlay-Sprache, Typen, Bilder) und schickt ihn hin.
// Gespeichert unter localStorage "cc_overlay".
(function () {
  'use strict';
  var A = window.CC;
  if (!A) return;
  var C = window.Calc, el = A.el, de = A.LANG === 'de';
  var D = window.desktop && window.desktop.match;
  var NDE = window.NAMES_DE || { species: {}, moves: {}, items: {}, abilities: {}, natures: {} };
  var NATDEX = window.NATDEX || [];
  var IDS = window.POKEAPI_IDS || {};
  var META = window.PICK_META || { icon: {} };
  var DEX = A.DEX, MOVES = A.MOVES;
  var SPR = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/';
  var JSD = 'https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/';
  var SD = 'https://play.pokemonshowdown.com/sprites/';

  var S = de ? {
    title: 'Match-Overlay', sub: 'OBS-Overlays fürs Match: Team-Overlay (beide Teams als Spalte) und Teampreview mit Matchup-Banner und Startseite. Jedes lässt sich einzeln ein- und ausschalten.',
    onOff: '{0}: An', offOn: '{0}: Aus', ovTeam: 'Team-Overlay', ovPreview: 'Teampreview', ovMatch: 'Matchup-Banner',
    lang: 'Sprache im Overlay', play: '▶ Start-Screen abspielen (15 s)', playHint: 'Läuft im Teampreview, danach erscheinen wieder die Teams.',
    tabTeam: 'Team-Overlay', tabPreview: 'Teampreview', tabMatch: 'Matchup & Start',
    desktop: 'Die OBS-Overlays laufen nur in der Desktop-App (lokaler Server). Im Browser lässt sich alles vorbereiten, OBS bekommt es aber erst in der App.',
    url: 'OBS-Browserquelle', copy: 'Kopieren', size: 'Breite {0} · Höhe {1}', open: 'Ansehen',
    me: 'Mein Team', opp: 'Gegner-Team', tournament: 'Turnier', ladder: 'Ladder', newOpp: 'Neuer Gegner',
    fromBuilder: 'Aus Teambuilder …', paste: 'Showdown einfügen', clear: 'Leeren', hide: 'Ausblenden', unhide: 'Einblenden', hideAll: 'Beide ausblenden',
    pasteTitle: 'Team im Showdown-Format einfügen', take: 'Übernehmen', cancel: 'Abbrechen',
    hidden: 'Ausgeblendet', live: 'Live: {0} Pokémon', empty: 'Leer',
    brought: 'Anklicken: mitgebracht. Gegner: bis 3 werden hervorgehoben, ab 4 nur noch diese gezeigt. Mein Team: nur die gewählten.',
    species: 'Pokémon', ability: 'Fähigkeit', item: '(kein Item)', nature: '(Wesen)', move: 'Attacke {0}', hp: 'Verbleibende KP in %', ko: 'Besiegt',
    teamHint: 'Der Gegner im Ladder-Modus zeigt kein Wesen. „Neuer Gegner“ leert die Gegnerseite und blendet sie wieder ein. Tab im Pokémon-Feld springt zum nächsten Pokémon.',
    imported: '{0} Pokémon übernommen', notFound: 'Nicht erkannt: {0}',
    p1: 'Team 1 (links): Spielername', p2: 'Team 2 (rechts): Spielername', text1: 'Showdown-Export Team 1', text2: 'Showdown-Export Team 2',
    bank1: 'Bank Team 1: nur Namen, einer pro Zeile (optional)', bank2: 'Bank Team 2: nur Namen, einer pro Zeile (optional)',
    teamPh: 'Team aus Pokémon Showdown einfügen', fromMe: 'Mein Team (Team-Overlay)', fromOpp: 'Gegner (Team-Overlay)',
    bgT: 'Transparent', bgS: 'Lila Hintergrund', bench: 'Bank anzeigen', closed: 'Closed Team Sheet', sample: 'Beispielteams', clearAll: 'Alles leeren',
    clearConfirm: 'Beide Teams und die Bank leeren?', unknown: 'Nicht erkannt: {0}', preview: 'Vorschau: so sieht OBS das Overlay. Transparent zeigt hier das Schachbrett-Muster.',
    nameL: 'Name links', nameR: 'Name rechts', recL: 'Standing links (z. B. 10/2/0)', recR: 'Standing rechts (z. B. 10/2/0)',
    scoreL: 'Spielstand links', scoreR: 'Spielstand rechts', logoL: 'Teamlogo links (PNG, JPG, WEBP, GIF, SVG, max. 5 MB)', logoR: 'Teamlogo rechts',
    logoDel: 'Entfernen', league: 'Liga-Name (oben auf der Startseite)', leaguePh: 'z. B. Pokémon Champions Liga', week: 'Mitte: Woche / Titel (Zeilenumbruch erlaubt)',
    swap: 'Seiten tauschen', reset: 'Stand 0:0', matchPrev: 'Vorschau Matchup-Banner (transparent, hier Schachbrett-Muster).',
    start: 'Startseite „Wer gegen wen“', logoErr: { type: 'Nur PNG, JPG, WEBP, GIF oder SVG', size: 'Datei größer als 5 MB', empty: 'Leere Datei' },
    teamMe: 'Team 1 links', teamOpp: 'Team 2 rechts', toT1: 'In Team 1', toT2: 'In Team 2'
  } : {
    title: 'Match overlay', sub: 'OBS overlays for matches: team overlay (both teams as a column) and team preview with matchup banner and start screen. Each one can be switched on and off.',
    onOff: '{0}: on', offOn: '{0}: off', ovTeam: 'Team overlay', ovPreview: 'Team preview', ovMatch: 'Matchup banner',
    lang: 'Overlay language', play: '▶ Play start screen (15 s)', playHint: 'Runs in the team preview, then the teams come back.',
    tabTeam: 'Team overlay', tabPreview: 'Team preview', tabMatch: 'Matchup & start',
    desktop: 'The OBS overlays only run in the desktop app (local server). In the browser you can prepare everything, OBS only gets it in the app.',
    url: 'OBS browser source', copy: 'Copy', size: 'Width {0} · Height {1}', open: 'View',
    me: 'My team', opp: 'Opponent', tournament: 'Tournament', ladder: 'Ladder', newOpp: 'New opponent',
    fromBuilder: 'From teambuilder …', paste: 'Paste Showdown', clear: 'Clear', hide: 'Hide', unhide: 'Show', hideAll: 'Hide both',
    pasteTitle: 'Paste a team in Showdown format', take: 'Apply', cancel: 'Cancel',
    hidden: 'Hidden', live: 'Live: {0} Pokémon', empty: 'Empty',
    brought: 'Click: brought. Opponent: up to 3 are highlighted, from 4 only these are shown. My team: only the picked ones.',
    species: 'Pokémon', ability: 'Ability', item: '(no item)', nature: '(nature)', move: 'Move {0}', hp: 'Remaining HP in %', ko: 'Fainted',
    teamHint: 'In ladder mode the opponent shows no nature. "New opponent" clears the opponent side and shows it again. Tab in a Pokémon field jumps to the next Pokémon.',
    imported: '{0} Pokémon applied', notFound: 'Not recognized: {0}',
    p1: 'Team 1 (left): player name', p2: 'Team 2 (right): player name', text1: 'Showdown export team 1', text2: 'Showdown export team 2',
    bank1: 'Bench team 1: names only, one per line (optional)', bank2: 'Bench team 2: names only, one per line (optional)',
    teamPh: 'Paste a team from Pokémon Showdown', fromMe: 'My team (team overlay)', fromOpp: 'Opponent (team overlay)',
    bgT: 'Transparent', bgS: 'Purple background', bench: 'Show bench', closed: 'Closed team sheet', sample: 'Sample teams', clearAll: 'Clear all',
    clearConfirm: 'Clear both teams and the bench?', unknown: 'Not recognized: {0}', preview: 'Preview: this is what OBS shows. Transparent shows the checkerboard here.',
    nameL: 'Name left', nameR: 'Name right', recL: 'Standing left (e.g. 10/2/0)', recR: 'Standing right (e.g. 10/2/0)',
    scoreL: 'Score left', scoreR: 'Score right', logoL: 'Team logo left (PNG, JPG, WEBP, GIF, SVG, max. 5 MB)', logoR: 'Team logo right',
    logoDel: 'Remove', league: 'League name (top of the start screen)', leaguePh: 'e.g. Pokémon Champions League', week: 'Center: week / title (line breaks allowed)',
    swap: 'Swap sides', reset: 'Score 0:0', matchPrev: 'Preview matchup banner (transparent, checkerboard here).',
    start: 'Start screen "who vs. who"', logoErr: { type: 'Only PNG, JPG, WEBP, GIF or SVG', size: 'File larger than 5 MB', empty: 'Empty file' },
    teamMe: 'Team 1 left', teamOpp: 'Team 2 right', toT1: 'To team 1', toT2: 'To team 2'
  };
  function t(k) {
    var s = S[k] != null ? S[k] : k;
    for (var i = 1; i < arguments.length; i++) s = String(s).split('{' + (i - 1) + '}').join(arguments[i]);
    return s;
  }

  // ======================= store =======================
  function blankSlot() { return { species: '', ability: '', item: '', nature: '', moves: ['', '', '', ''], hp: 100, ko: false, brought: false }; }
  function blankSide() { var s = []; for (var i = 0; i < 6; i++) s.push(blankSlot()); return { hidden: false, slots: s }; }
  function defaults() {
    return {
      lang: de ? 'de' : 'en', tab: 'team',
      team: { show: true, mode: 'tournament', me: blankSide(), opp: blankSide() },
      preview: { show: true, bg: 't', bench: false, closed: false, p1: '', p2: '', t1: '', t2: '', b1: '', b2: '' },
      match: { show: true, nameL: '', recL: '', scoreL: 0, nameR: '', recR: '', scoreR: 0, week: '', league: '' }
    };
  }
  function clean(s) {
    var d = defaults();
    if (!s || typeof s !== 'object') return d;
    var o = { lang: s.lang === 'en' ? 'en' : (s.lang === 'de' ? 'de' : d.lang), tab: ['team', 'preview', 'match'].indexOf(s.tab) >= 0 ? s.tab : 'team' };
    var tm = s.team || {};
    o.team = { show: tm.show !== false, mode: tm.mode === 'ladder' ? 'ladder' : 'tournament', me: d.team.me, opp: d.team.opp };
    ['me', 'opp'].forEach(function (k) {
      var sd = tm[k];
      if (!sd || !Array.isArray(sd.slots)) return;
      o.team[k] = { hidden: !!sd.hidden, slots: d.team[k].slots.map(function (b, i) {
        var x = sd.slots[i] || {};
        var mv = Array.isArray(x.moves) ? x.moves.slice(0, 4).map(String) : [];
        while (mv.length < 4) mv.push('');
        var hp = Math.max(0, Math.min(100, Math.round(+x.hp)));
        return { species: String(x.species || ''), ability: String(x.ability || ''), item: String(x.item || ''), nature: String(x.nature || ''),
          moves: mv, hp: isNaN(hp) ? 100 : hp, ko: !!x.ko, brought: !!x.brought };
      }) };
    });
    o.preview = Object.assign({}, d.preview, s.preview || {});
    o.match = Object.assign({}, d.match, s.match || {});
    ['scoreL', 'scoreR'].forEach(function (k) { o.match[k] = Math.max(0, Math.min(99, Math.round(+o.match[k]) || 0)); });
    return o;
  }
  var store = clean(A.load('cc_overlay', null));
  var pushTimer = null;
  function persist() { A.save('cc_overlay', store); schedulePush(); }
  function schedulePush() { clearTimeout(pushTimer); pushTimer = setTimeout(push, 150); }

  // ======================= names in the overlay language =======================
  function nid(s) { return String(s || '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, ''); }
  var NAT_BY_ID = {};
  NATDEX.forEach(function (e, i) { if (!e) return; NAT_BY_ID[e[0]] = i; if (NAT_BY_ID[nid(e[1])] == null) NAT_BY_ID[nid(e[1])] = i; if (NAT_BY_ID[nid(e[2])] == null) NAT_BY_ID[nid(e[2])] = i; });
  function natOf(name) { var i = NAT_BY_ID[nid(name)]; return i == null ? null : NATDEX[i]; }
  function speciesDe(base) { var n = natOf(base); return NDE.species[nid(base)] || (n && n[2]) || base; }
  function speciesEn(base) { var n = natOf(base); return (n && nid(n[1]) === nid(base)) ? n[1] : base; }
  function inLang(map, en, l) { return l === 'de' ? ((NDE[map] || {})[nid(en)] || en) : en; }
  var REG = { Alola: ['Alolan', 'Alola'], Galar: ['Galarian', 'Galar'], Hisui: ['Hisuian', 'Hisui'], Paldea: ['Paldean', 'Paldea'] };
  // German form names for common VGC forms the calculator itself does not translate
  var FORM_DE = Object.assign({ Therian: 'Tiergeistform', Incarnate: 'Inkarnationsform', 'Rapid Strike': 'Fließender Stil', 'Single Strike': 'Wuchtiger Stil',
    Origin: 'Urform', Bloodmoon: 'Blutmond', Wellspring: 'Brunnenmaske', Hearthflame: 'Ofenmaske', Cornerstone: 'Fundamentmaske' }, A.FORM_DE || {});
  // "Mega Raichu Y" -> Mega-Raichu Y, "Ninetales-Alola" -> Alola-Vulnona, "Rotom-Wash" -> Rotom (Wasch), "Meowstic-F" -> Psiaugon ♀
  function formName(name, l) {
    var m = /^Mega (.+?)(?: ([XYZ]))?$/.exec(name);
    if (m) return l === 'de' ? 'Mega-' + speciesDe(m[1]) + (m[2] ? ' ' + m[2] : '') : 'Mega ' + speciesEn(m[1]) + (m[2] ? ' ' + m[2] : '');
    var i = name.indexOf('-');
    if (i < 0 || natOf(name)) return l === 'de' ? speciesDe(name) : speciesEn(name);
    var base = name.slice(0, i), parts = name.slice(i + 1).split('-');
    var b = l === 'de' ? speciesDe(base) : speciesEn(base);
    var fd = function (p) { return l === 'de' ? (FORM_DE[p] || p) : p; };
    if (REG[parts[0]]) {
      var rest = parts.slice(1).map(fd).join(' ');
      return (l === 'de' ? REG[parts[0]][1] + '-' + b : REG[parts[0]][0] + ' ' + b) + (rest ? ' (' + rest + ')' : '');
    }
    if (parts.length === 1 && (parts[0] === 'F' || parts[0] === 'M')) return b + (parts[0] === 'F' ? ' ♀' : ' ♂');
    var whole = parts.join(' ');
    return b + ' (' + (l === 'de' && FORM_DE[whole] ? FORM_DE[whole] : parts.map(fd).join(' ')) + ')';
  }
  // without the forme, as in the old team overlay (Indeedee-F -> Indeedee); megas keep "Mega"
  function plainName(name, l) {
    var m = /^Mega (.+?)(?: ([XYZ]))?$/.exec(name);
    if (m) return formName(name, l);
    if (natOf(name)) return l === 'de' ? speciesDe(name) : speciesEn(name);
    var base = A.baseOf(name);
    if (DEX[base] && base !== name) name = base;
    var i = name.indexOf('-');
    return i > 0 && !natOf(name) ? (l === 'de' ? speciesDe(name.slice(0, i)) : speciesEn(name.slice(0, i))) : (l === 'de' ? speciesDe(name) : speciesEn(name));
  }

  // ---- lookups: English keys of this app, German or English input ----
  function idOf(s) { return nid(s); }
  function byId(list, label) {
    var o = {};
    list.forEach(function (k) { o[idOf(k)] = k; var d = label(k); if (d && o[idOf(d)] == null) o[idOf(d)] = k; });
    return o;
  }
  var DEX_KEYS = Object.keys(DEX).sort(function (a, b) { return A.nSpecies(a).localeCompare(A.nSpecies(b), A.LANG); });
  var MOVE_KEYS = Object.keys(MOVES).filter(function (m) { return m !== '(No Move)'; });
  var ITEM_KEYS = (A.ITEMS || []).filter(function (x) { return x && x !== '(none)'; });
  var SP_BY = byId(DEX_KEYS, A.nSpecies), MV_BY = byId(MOVE_KEYS, A.nMove), IT_BY = byId(ITEM_KEYS, A.nItem), AB_BY = byId(A.ABILITIES || [], A.nAbility);
  var NAT_KEYS = Object.keys(C.NATURES).sort(), NA_BY = byId(NAT_KEYS, A.nNature);
  var ITEM_LABELS = ITEM_KEYS.map(A.nItem).sort(function (a, b) { return a.localeCompare(b, A.LANG); });
  var SPECIES_LABELS = DEX_KEYS.map(A.nSpecies);

  // Showdown or typed name -> { key: DEX key or null, name: canonical English name, types }
  function findSpecies(raw, gender) {
    var s = String(raw || '').trim();
    if (!s) return null;
    var mm = /^(.+?)-Mega(?:-([XYZ]))?$/i.exec(s), k = null;
    if (mm) { var mk = 'Mega ' + (SP_BY[idOf(mm[1])] || mm[1]) + (mm[2] ? ' ' + mm[2].toUpperCase() : ''); if (DEX[mk]) k = mk; }
    if (!k && gender === 'F' && DEX[s + '-F']) k = s + '-F';
    if (!k) k = DEX[s] ? s : SP_BY[idOf(s)] || null;
    if (k) return { key: k, name: k, types: [DEX[k].t1, DEX[k].t2].filter(Boolean).map(function (x) { return x.toLowerCase(); }) };
    // not in Champions: national dex (all 1025), form names stay as written
    var parts = s.split('-');
    for (var n = parts.length; n >= 1; n--) {
      var e = natOf(parts.slice(0, n).join('-'));
      if (e) {
        var nm = n === parts.length ? e[1] : e[1] + '-' + parts.slice(n).join('-');
        return { key: null, name: nm, types: (e[3] || []).map(function (x) { return x.toLowerCase(); }) };
      }
    }
    return null;
  }

  // ---- pictures: Pokémon HOME (PokéAPI number), then Showdown ----
  function slugOf(name) {
    var m = /^Mega (.+?)(?: ([XYZ]))?$/.exec(name);
    if (m) return slugOf(m[1]) + '-mega' + (m[2] ? '-' + m[2].toLowerCase() : '');
    return String(name).normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[.'’:]/g, '').replace(/[\s_]+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '');
  }
  function pokeapiId(name) {
    var s = slugOf(name);
    while (s) {
      if (IDS[s]) return IDS[s];
      var i = s.lastIndexOf('-');
      if (i < 0) break;
      s = s.slice(0, i);
    }
    return null;
  }
  function sdId(name) {
    var m = /^Mega (.+?)(?: ([XYZ]))?$/.exec(name);
    if (m) return idOf(m[1]) + '-mega' + (m[2] ? m[2].toLowerCase() : '');
    var i = name.indexOf('-');
    return natOf(name) || i < 0 ? idOf(name) : idOf(name.slice(0, i)) + '-' + idOf(name.slice(i + 1));
  }
  function sprites(name) {
    var out = [], id = pokeapiId(name), sd = sdId(name);
    if (id) out.push(SPR + 'pokemon/other/home/' + id + '.png', JSD + 'pokemon/other/home/' + id + '.png', SPR + 'pokemon/other/official-artwork/' + id + '.png');
    out.push(SD + 'home-centered/' + sd + '.png', SD + 'gen5/' + sd + '.png');
    var base = idOf(name.replace(/^Mega /, '').replace(/ [XYZ]$/, '').replace(/-.*$/, ''));
    if (base !== sd) out.push(SD + 'gen5/' + base + '.png');
    return out;
  }
  function isMega(item) { return !!(item && ((window.MEGA_STONE_USER_LOOKUP && window.MEGA_STONE_USER_LOOKUP[item]) || (/ite( [XYZ])?$/i.test(item) && !/^eviolite$/i.test(item)))); }
  function itemOut(raw, l) {
    var en = IT_BY[idOf(raw)] || raw, deN = (NDE.items || {})[nid(en)] || en, n = (META.icon || {})[idOf(en)];
    return { n: l === 'de' ? deN : en, icon: '/match/item?en=' + encodeURIComponent(en) + '&de=' + encodeURIComponent(deN) + (n != null ? '&n=' + n : ''), mega: isMega(en) };
  }
  var TYPE_DE = { Normal: 'Normal', Fire: 'Feuer', Water: 'Wasser', Electric: 'Elektro', Grass: 'Pflanze', Ice: 'Eis', Fighting: 'Kampf', Poison: 'Gift', Ground: 'Boden', Flying: 'Flug', Psychic: 'Psycho', Bug: 'Käfer', Rock: 'Gestein', Ghost: 'Geist', Dragon: 'Drache', Dark: 'Unlicht', Steel: 'Stahl', Fairy: 'Fee' };
  function moveOut(raw, l) {
    var hp = /^Hidden Power\s*\[?(\w+)\]?$/i.exec(raw);
    if (hp) {
      var T = hp[1][0].toUpperCase() + hp[1].slice(1).toLowerCase();
      return { n: l === 'de' ? inLang('moves', 'Hidden Power', 'de') + ' [' + (TYPE_DE[T] || T) + ']' : 'Hidden Power [' + T + ']', t: TYPE_DE[T] ? T.toLowerCase() : 'normal' };
    }
    var k = MV_BY[idOf(raw)] || raw, mv = MOVES[k];
    return { n: inLang('moves', k, l), t: mv && TYPE_DE[mv.type] ? mv.type.toLowerCase() : 'normal' };
  }
  var STAT = { de: { at: 'Angr.', df: 'Vert.', sa: 'Sp.Ang.', sd: 'Sp.Vert.', sp: 'Init.' }, en: { at: 'Attack', df: 'Defense', sa: 'Sp. Atk', sd: 'Sp. Def', sp: 'Speed' } };
  // Showdown name for this app's key ("Mega Raichu Y" -> Raichu-Mega-Y)
  function sdName(key) {
    var m = /^Mega (.+?)(?: ([XYZ]))?$/.exec(key);
    return m ? m[1] + '-Mega' + (m[2] ? '-' + m[2] : '') : key;
  }
  function megaOf(key, item) { return key && DEX[key] && item ? A.megaFormeFor(A.baseOf(key), IT_BY[idOf(item)] || item) : null; }

  // ======================= Showdown text (as in the old team preview) =======================
  function parseTeam(text) {
    var res = { mons: [], unknown: [] };
    String(text || '').replace(/\r/g, '').split(/\n\s*\n/).forEach(function (b) {
      var lines = b.split('\n').map(function (x) { return x.trim(); }).filter(Boolean);
      while (lines.length && /^===.*===$/.test(lines[0])) lines.shift();
      if (!lines.length) return;
      var im = lines[0].match(/\s@\s+(.+)$/), item = im ? im[1].trim() : '';
      var first = lines[0].replace(/\s+@\s+.*$/, '').trim(), gender = '';
      var gm = first.match(/\s\((M|F)\)$/);
      if (gm) { gender = gm[1]; first = first.slice(0, gm.index).trim(); }
      var species = first, pm = first.match(/^.*\(([^()]+)\)$/);
      if (pm) species = pm[1].trim();
      var mon = { species: species, gender: gender, item: item, ability: '', nature: '', moves: [] };
      lines.slice(1).forEach(function (l) {
        var m;
        if ((m = l.match(/^Ability:\s*(.+)$/i))) mon.ability = m[1].trim();
        else if ((m = l.match(/^([A-Za-z]+)\s+Nature$/i))) mon.nature = m[1];
        else if ((m = l.match(/^[-–~]\s*(.+)$/))) mon.moves.push(m[1].replace(/\s*\/\s*.*$/, '').trim());
      });
      if (!species) return;
      mon.info = findSpecies(species, gender);
      if (!mon.info) res.unknown.push(species);
      res.mons.push(mon);
    });
    return res;
  }
  function parseBank(text) {
    var res = { mons: [], unknown: [] };
    String(text || '').replace(/\r/g, '').split(/[\n,]+/).forEach(function (n) {
      n = n.replace(/\s+@\s+.*$/, '').replace(/^[-–*•\s]+/, '').trim();
      var pm = n.match(/^.*\(([^()]+)\)$/);
      if (pm && !/^(M|F)$/.test(pm[1])) n = pm[1].trim();
      n = n.replace(/\s*\((M|F)\)$/, '');
      if (!n) return;
      var info = findSpecies(n, '');
      if (!info) res.unknown.push(n);
      res.mons.push({ species: n, info: info });
    });
    res.mons = res.mons.slice(0, 4);
    return res;
  }
  // team overlay slot / teambuilder member -> Showdown text (megas written out, so the preview shows them)
  function monText(species, item, ability, nature, moves) {
    if (!species) return '';
    var mega = megaOf(species, item), nm = sdName(mega || species);
    var lines = [nm + (item ? ' @ ' + (IT_BY[idOf(item)] || item) : '')];
    if (ability) lines.push('Ability: ' + (AB_BY[idOf(ability)] || ability));
    if (nature) lines.push((NA_BY[idOf(nature)] || nature) + ' Nature');
    (moves || []).forEach(function (m) { if (m) lines.push('- ' + (MV_BY[idOf(m)] || m)); });
    return lines.join('\n');
  }
  function sideText(side) {
    return store.team[side].slots.map(function (s) { return monText(s.species, s.item, s.ability, s.nature, s.moves); }).filter(Boolean).join('\n\n');
  }
  function builderTeams() { var b = A.load('cc_builder', null); return (b && Array.isArray(b.teams)) ? b.teams : []; }
  function builderText(team) {
    return (team.mons || []).map(function (m) {
      var s = m.set || {}, sp = s.forme && s.forme.indexOf('Mega ') !== 0 ? s.forme : m.species;
      return monText(sp, s.item && s.item !== '(none)' ? s.item : '', s.ability, s.nature, (s.moves || []).filter(function (x) { return x && x !== '(No Move)'; }));
    }).filter(Boolean).join('\n\n');
  }

  // ======================= state for OBS =======================
  function previewCard(m, l) {
    var info = m.info, name = info ? info.name : m.species;
    var na = m.nature ? (NA_BY[idOf(m.nature)] || m.nature) : '', nat = C.NATURES[na];
    var ab = m.ability ? (AB_BY[idOf(m.ability)] || m.ability) : '';
    return {
      name: info ? formName(name, l) : m.species, types: info ? info.types : [],
      ability: ab ? inLang('abilities', ab, l) : '', nature: na ? inLang('natures', na, l) : '',
      up: nat && nat.length ? STAT[l][nat[0]] : '', dn: nat && nat.length ? STAT[l][nat[1]] : '',
      moves: m.moves.slice(0, 4).map(function (x) { return moveOut(x, l); }),
      item: m.item ? itemOut(m.item, l) : null, sprites: info ? sprites(name) : []
    };
  }
  function benchCard(m, l) {
    var info = m.info;
    return { name: info ? formName(info.name, l) : m.species, types: info ? info.types : [], sprites: info ? sprites(info.name) : [] };
  }
  function liveMon(s, side, l) {
    var info = findSpecies(s.species, '');
    var name = info ? info.name : s.species, form = megaOf(info && info.key, s.item) || name;
    var na = s.nature ? (NA_BY[idOf(s.nature)] || s.nature) : '';
    var hideNat = side === 'opp' && store.team.mode === 'ladder';
    return {
      name: info ? plainName(name, l) : s.species, sprites: info ? sprites(form) : [],
      hp: s.ko ? 0 : s.hp, ko: !!s.ko || s.hp === 0, brought: !!s.brought, tera: '',
      item: s.item ? itemOut(s.item, l).n : '', ability: s.ability ? inLang('abilities', AB_BY[idOf(s.ability)] || s.ability, l) : '',
      nature: !hideNat && na ? inLang('natures', na, l) : '',
      moves: s.moves.filter(Boolean).map(function (x) { return moveOut(x, l).n; })
    };
  }
  var lastUnknown = [];
  function buildState() {
    var l = store.lang, p = store.preview;
    var r1 = parseTeam(p.t1), r2 = parseTeam(p.t2), k1 = parseBank(p.b1), k2 = parseBank(p.b2);
    lastUnknown = [].concat(r1.unknown.map(function (x) { return 'Team 1: ' + x; }), r2.unknown.map(function (x) { return 'Team 2: ' + x; }),
      p.bench ? k1.unknown.map(function (x) { return (de ? 'Bank 1: ' : 'Bench 1: ') + x; }) : [], p.bench ? k2.unknown.map(function (x) { return (de ? 'Bank 2: ' : 'Bench 2: ') + x; }) : []);
    var team = { show: store.team.show };
    ['me', 'opp'].forEach(function (side) {
      var sd = store.team[side];
      team[side] = sd.hidden ? [] : sd.slots.filter(function (s) { return s.species.trim(); }).map(function (s) { return liveMon(s, side, l); });
    });
    return {
      lang: l, team: team,
      preview: { show: p.show, bg: p.bg, bench: p.bench, closed: p.closed, lang: l, p1: p.p1, p2: p.p2,
        team1: r1.mons.slice(0, 6).map(function (m) { return previewCard(m, l); }), team2: r2.mons.slice(0, 6).map(function (m) { return previewCard(m, l); }),
        bench1: k1.mons.map(function (m) { return benchCard(m, l); }), bench2: k2.mons.map(function (m) { return benchCard(m, l); }) },
      match: Object.assign({}, store.match)
    };
  }
  function push() {
    clearTimeout(pushTimer);
    var s = buildState();
    if (D) D.push(s);
    var w = document.getElementById('moUnknown');
    if (w) w.textContent = lastUnknown.length ? t('unknown', lastUnknown.join(', ')) : '';
    ['me', 'opp'].forEach(function (side) {
      var m = document.getElementById('moMsg_' + side);
      if (m) m.textContent = store.team[side].hidden ? t('hidden') : (s.team[side].length ? t('live', s.team[side].length) : t('empty'));
    });
  }

  // ======================= view =======================
  var root = null, base = '', logoV = { L: '', R: '' };
  function btn(text, cls, fn, title) {
    var b = el('button', { class: 'tbtn' + (cls ? ' ' + cls : ''), text: text });
    if (title) b.title = title;
    if (fn) b.addEventListener('click', fn);
    return b;
  }
  // a <label> only around real inputs: a click on the text would otherwise press the first button inside
  function field(label, input, cls) {
    var w = el(/^(INPUT|SELECT|TEXTAREA)$/.test(input.tagName) ? 'label' : 'div', { class: 'mo-field' + (cls ? ' ' + cls : '') });
    w.appendChild(el('span', { text: label }));
    w.appendChild(input);
    return w;
  }
  function seg(list, cur, fn) {
    var w = el('div', { class: 'btn-group mo-seg' });
    list.forEach(function (x) {
      var b = el('button', { class: x[0] === cur ? 'on' : '', text: x[1] });
      b.addEventListener('click', function () { fn(x[0]); });
      w.appendChild(b);
    });
    return w;
  }
  function urlRow(path, w, h, extra) {
    var r = el('div', { class: 'mo-url' });
    r.appendChild(el('span', { class: 'mo-url-l', text: t('url') }));
    var inp = el('input', { type: 'text', readonly: 'readonly' });
    inp.value = base ? base + path : path;
    r.appendChild(inp);
    r.appendChild(btn(t('copy'), '', function () { A.copy(inp.value); }));
    r.appendChild(el('span', { class: 'hint', text: t('size', w, h) }));
    if (extra) r.appendChild(extra);
    return r;
  }
  function toggle(label, on, fn) {
    var b = el('button', { class: 'tbtn mo-toggle' + (on ? ' on' : ''), text: on ? t('onOff', label) : t('offOn', label) });
    b.addEventListener('click', fn);
    return b;
  }

  function render() {
    root = document.getElementById('overlayView');
    if (!root) return;
    root.innerHTML = '';
    var head = el('div', { class: 'nz-head' });
    head.appendChild(el('h2', { text: t('title') }));
    head.appendChild(el('span', { class: 'hint', text: t('sub') }));
    root.appendChild(head);
    var body = el('div', { class: 'mo-body' });
    root.appendChild(body);
    if (!D) body.appendChild(el('div', { class: 'mo-note', text: t('desktop') }));

    // switches: every overlay on its own
    var top = el('div', { class: 'panel mo-top' });
    top.appendChild(toggle(t('ovTeam'), store.team.show, function () { store.team.show = !store.team.show; persist(); render(); }));
    top.appendChild(toggle(t('ovPreview'), store.preview.show, function () { store.preview.show = !store.preview.show; persist(); render(); }));
    top.appendChild(toggle(t('ovMatch'), store.match.show, function () { store.match.show = !store.match.show; persist(); render(); }));
    var lw = el('span', { class: 'mo-inline' });
    lw.appendChild(el('span', { class: 'hint', text: t('lang') }));
    lw.appendChild(seg([['de', 'Deutsch'], ['en', 'English']], store.lang, function (v) { store.lang = v; persist(); render(); }));
    top.appendChild(lw);
    var pb = btn(t('play'), 'primary-btn', function () { if (D) D.play(); }, t('playHint'));
    pb.disabled = !D;
    top.appendChild(pb);
    body.appendChild(top);

    var tabs = el('nav', { class: 'mo-tabs' });
    [['team', t('tabTeam')], ['preview', t('tabPreview')], ['match', t('tabMatch')]].forEach(function (x) {
      var b = el('button', { class: x[0] === store.tab ? 'on' : '', text: x[1] });
      b.addEventListener('click', function () { store.tab = x[0]; A.save('cc_overlay', store); render(); });
      tabs.appendChild(b);
    });
    body.appendChild(tabs);
    if (store.tab === 'team') body.appendChild(renderTeam());
    else if (store.tab === 'preview') body.appendChild(renderPreview());
    else body.appendChild(renderMatch());
    push();
  }

  // ---------------- tab: team overlay (editor as in vgc_team_overlay.py) ----------------
  var acLists = {};
  function bestMatch(list, v) {
    var q = idOf(v);
    if (!q || !list || !list.length) return null;
    return list.find(function (n) { return idOf(n).indexOf(q) === 0; }) ||
      list.find(function (n) { return n.toLowerCase().split(/[\s-]+/).some(function (w) { return idOf(w).indexOf(q) === 0; }); }) ||
      list.find(function (n) { return idOf(n).indexOf(q) >= 0; }) || null;
  }
  // typing suggests the rest (selected); Tab or Enter takes the best match
  function autoFill(inp, list) {
    inp.addEventListener('input', function (ev) {
      if (!ev.inputType || ev.inputType.indexOf('delete') === 0 || ev.isComposing) return;
      var v = inp.value;
      if (!v || inp.selectionStart !== v.length) return;
      var m = bestMatch(list(), v);
      if (m && m.toLowerCase().indexOf(v.toLowerCase()) === 0 && m.length > v.length) { inp.value = v + m.slice(v.length); inp.setSelectionRange(v.length, m.length); }
    });
    inp.addEventListener('keydown', function (ev) {
      if (ev.key !== 'Tab' && ev.key !== 'Enter') return;
      var v = inp.value.trim();
      if (v && !list().some(function (n) { return idOf(n) === idOf(v); })) {
        var m = bestMatch(list(), v);
        if (m) { inp.value = m; inp.dispatchEvent(new Event('change')); }
      }
      if (ev.key === 'Tab' && inp.dataset.sp) {
        var all = Array.prototype.slice.call(root.querySelectorAll('input[data-sp]'));
        var j = all.indexOf(inp), nx = all[(j + (ev.shiftKey ? -1 : 1) + all.length) % all.length];
        ev.preventDefault();
        if (nx) { nx.focus(); nx.select(); }
      }
    });
  }
  function datalist(id, labels) {
    var dl = document.getElementById(id);
    if (!dl) { dl = el('datalist', { id: id }); document.body.appendChild(dl); }
    if (dl._n !== labels.length) { dl.innerHTML = labels.map(function (x) { return '<option value="' + A.esc(x) + '">'; }).join(''); dl._n = labels.length; }
    return id;
  }
  function slotMoves(s) {
    var key = SP_BY[idOf(s.species)];
    var form = megaOf(key, s.item) || key;
    return (form && A.legalMoves(form)) || MOVE_KEYS;
  }
  function renderSlot(side, i) {
    var s = store.team[side].slots[i], ladder = side === 'opp' && store.team.mode === 'ladder';
    var row = el('div', { class: 'mo-slot' + (s.brought ? ' br' : '') + (s.ko ? ' ko' : '') });
    var spr = el('button', { class: 'mo-spr', title: t('brought') });
    var key = SP_BY[idOf(s.species)];
    if (key) spr.appendChild(A.spriteFit(megaOf(key, s.item) || key));
    spr.addEventListener('click', function () {
      s.brought = !s.brought;
      row.classList.toggle('br', s.brought);
      refreshBrought(side);
      persist();
    });
    row.appendChild(spr);
    var bodyEl = el('div', { class: 'mo-sbody' });
    var r1 = el('div', { class: 'mo-r1' + (ladder ? ' ladder' : '') });
    var sp = el('input', { type: 'text', list: datalist('moDlSpecies', SPECIES_LABELS), placeholder: t('species'), autocomplete: 'off', 'data-sp': '1' });
    sp.value = key ? A.nSpecies(key) : s.species;
    autoFill(sp, function () { return SPECIES_LABELS; });
    var ab = el('select');
    function fillAbilities() {
      var k = SP_BY[idOf(s.species)], form = megaOf(k, s.item) || k;
      var list = (form && A.legalAbilities(form)) || [];
      if (s.ability && list.indexOf(AB_BY[idOf(s.ability)] || s.ability) === -1) list = list.concat([AB_BY[idOf(s.ability)] || s.ability]);
      ab.innerHTML = '<option value="">' + A.esc(t('ability')) + '</option>' + list.map(function (a) { return '<option value="' + A.esc(a) + '">' + A.esc(A.nAbility(a)) + '</option>'; }).join('');
      ab.value = AB_BY[idOf(s.ability)] || s.ability || '';
    }
    fillAbilities();
    ab.addEventListener('change', function () { s.ability = ab.value; persist(); });
    var it = el('input', { type: 'text', list: datalist('moDlItems', ITEM_LABELS), placeholder: t('item'), autocomplete: 'off' });
    it.value = s.item ? A.nItem(IT_BY[idOf(s.item)] || s.item) : '';
    autoFill(it, function () { return ITEM_LABELS; });
    var na = el('select', { class: 'mo-nat' });
    na.innerHTML = '<option value="">' + A.esc(t('nature')) + '</option>' + NAT_KEYS.map(function (n) { return '<option value="' + n + '">' + A.esc(A.natureLabel(n)) + '</option>'; }).join('');
    na.value = NA_BY[idOf(s.nature)] || '';
    na.addEventListener('change', function () { s.nature = na.value; persist(); });
    r1.appendChild(sp); r1.appendChild(ab); r1.appendChild(it); r1.appendChild(na);
    bodyEl.appendChild(r1);
    var mvRow = el('div', { class: 'mo-mv' });
    var dlId = 'moDlMv_' + side + i;
    function moveLabels() { return slotMoves(s).map(A.nMove); }
    function refreshMoves() { datalist(dlId, moveLabels()); checkMoves(); }
    var mvInputs = [];
    function checkMoves() {
      var legal = slotMoves(s);
      mvInputs.forEach(function (inp, k) {
        var v = s.moves[k], mk = MV_BY[idOf(v)];
        inp.classList.toggle('warn', !!v && (!mk || legal.indexOf(mk) === -1));
      });
    }
    for (var k = 0; k < 4; k++) (function (k) {
      var mi = el('input', { type: 'text', list: dlId, placeholder: t('move', k + 1), autocomplete: 'off' });
      mi.value = s.moves[k] ? A.nMove(MV_BY[idOf(s.moves[k])] || s.moves[k]) : '';
      autoFill(mi, moveLabels);
      mi.addEventListener('change', function () {
        var v = mi.value.trim(), mk = MV_BY[idOf(v)];
        s.moves[k] = mk || v;
        if (mk) mi.value = A.nMove(mk);
        checkMoves(); persist();
      });
      mvInputs.push(mi);
      mvRow.appendChild(mi);
    })(k);
    bodyEl.appendChild(mvRow);
    row.appendChild(bodyEl);
    function speciesChanged() {
      var v = sp.value.trim(), k = SP_BY[idOf(v)];
      s.species = k || v;
      if (k) sp.value = A.nSpecies(k);
      sp.classList.toggle('bad', !!v && !k);
      var list = (k && A.legalAbilities(megaOf(k, s.item) || k)) || [];
      if (k && list.indexOf(AB_BY[idOf(s.ability)] || s.ability) === -1) s.ability = list[0] || '';
      fillAbilities();
      spr.innerHTML = '';
      if (k) spr.appendChild(A.spriteFit(megaOf(k, s.item) || k));
      refreshMoves(); persist();
    }
    sp.addEventListener('change', speciesChanged);
    it.addEventListener('change', function () {
      var v = it.value.trim(), ik = IT_BY[idOf(v)];
      s.item = ik || v;
      if (ik) it.value = A.nItem(ik);
      it.classList.toggle('warn', !!v && !ik);
      var k = SP_BY[idOf(s.species)];
      spr.innerHTML = '';
      if (k) spr.appendChild(A.spriteFit(megaOf(k, s.item) || k));
      fillAbilities(); refreshMoves(); persist();
    });
    sp.classList.toggle('bad', !!s.species && !key);
    var hp = el('div', { class: 'mo-hp' });
    var hpw = el('span', { class: 'mo-hpi' });
    var hpi = el('input', { type: 'number', min: 0, max: 100, step: 1, title: t('hp') });
    hpi.value = s.ko ? 0 : s.hp;
    hpw.appendChild(hpi); hpw.appendChild(document.createTextNode('%'));
    var kob = btn('KO', 'mo-ko', null, t('ko'));
    function setHp(v, ko) {
      v = Math.max(0, Math.min(100, Math.round(+v)));
      if (isNaN(v)) v = 100;
      s.ko = !!ko || v === 0; s.hp = s.ko ? 0 : v;
      hpi.value = s.hp;
      row.classList.toggle('ko', s.ko);
    }
    hpi.addEventListener('change', function () { setHp(hpi.value === '' ? 100 : hpi.value, false); persist(); });
    kob.addEventListener('click', function () { var ko = !s.ko; setHp(ko ? 0 : 100, ko); persist(); });
    hp.appendChild(hpw); hp.appendChild(kob);
    row.appendChild(hp);
    setTimeout(refreshMoves, 0);
    return row;
  }
  function refreshBrought(side) {
    var box = document.getElementById('moSide_' + side);
    if (box) box.classList.toggle('hasbr', store.team[side].slots.some(function (s) { return s.brought; }));
  }
  function applyMons(side, mons) {
    var sd = store.team[side];
    sd.slots = sd.slots.map(function (x, i) {
      var m = mons[i];
      if (!m) return blankSlot();
      var mv = (m.moves || []).slice(0, 4); while (mv.length < 4) mv.push('');
      return { species: m.species || '', ability: m.ability || '', item: m.item || '', nature: m.nature || '', moves: mv, hp: 100, ko: false, brought: false };
    });
  }
  function importText(side, text, msg) {
    var p = A.parseShowdown(text || ''), hardy = /\bHardy\s+Nature/i.test(text || '');
    if (!p.mons.length) { msg.textContent = p.errors.length ? t('notFound', p.errors.join(', ')) : t('empty'); return; }
    applyMons(side, p.mons.map(function (m) {
      var s = m.set;
      return { species: s.forme || m.species, item: s.item && s.item !== '(none)' ? s.item : '', ability: s.ability || '',
        nature: s.nature === 'Hardy' && !hardy ? '' : s.nature, moves: s.moves || [] };
    }));
    persist(); render();
    var m2 = document.getElementById('moMsg_' + side);
    if (m2) m2.textContent = t('imported', p.mons.length) + (p.errors.length ? ' · ' + t('notFound', p.errors.join(', ')) : '');
  }
  function builderSelect(onPick) {
    var sel = el('select', { class: 'mo-bsel' });
    sel.appendChild(el('option', { value: '', text: t('fromBuilder') }));
    builderTeams().forEach(function (tm, i) { sel.appendChild(el('option', { value: String(i), text: tm.name || ('Team ' + (i + 1)) })); });
    sel.disabled = !builderTeams().length;
    sel.addEventListener('change', function () { var tm = builderTeams()[+sel.value]; sel.value = ''; if (tm) onPick(tm); });
    return sel;
  }
  function renderSide(side) {
    var sd = store.team[side];
    var box = el('div', { class: 'panel mo-side ' + side, id: 'moSide_' + side });
    var hd = el('div', { class: 'mo-shead' });
    hd.appendChild(el('b', { text: t(side) }));
    if (side === 'opp') hd.appendChild(seg([['tournament', t('tournament')], ['ladder', t('ladder')]], store.team.mode, function (v) { store.team.mode = v; persist(); render(); }));
    hd.appendChild(el('span', { class: 'hint mo-msg', id: 'moMsg_' + side }));
    box.appendChild(hd);
    var bar = el('div', { class: 'mo-bar' });
    if (side === 'opp' && store.team.mode === 'ladder') bar.appendChild(btn(t('newOpp'), 'primary-btn', function () { sd.hidden = false; applyMons('opp', []); persist(); render(); }));
    bar.appendChild(builderSelect(function (tm) {
      applyMons(side, (tm.mons || []).map(function (m) {
        var s = m.set || {};
        return { species: s.forme && s.forme.indexOf('Mega ') !== 0 ? s.forme : m.species, item: s.item && s.item !== '(none)' ? s.item : '',
          ability: s.ability || '', nature: s.nature || '', moves: (s.moves || []).filter(function (x) { return x && x !== '(No Move)'; }) };
      }));
      persist(); render();
    }));
    var pasteBox = el('div', { class: 'mo-paste', hidden: 'hidden' });
    bar.appendChild(btn(t('paste'), '', function () { pasteBox.hidden = !pasteBox.hidden; if (!pasteBox.hidden) ta.focus(); }));
    bar.appendChild(btn(t('clear'), '', function () { applyMons(side, []); persist(); render(); }));
    bar.appendChild(btn(sd.hidden ? t('unhide') : t('hide'), sd.hidden ? 'mo-off' : '', function () { sd.hidden = !sd.hidden; persist(); render(); }));
    if (side === 'opp') bar.appendChild(btn(t('hideAll'), '', function () { store.team.me.hidden = true; store.team.opp.hidden = true; persist(); render(); }));
    box.appendChild(bar);
    var ta = el('textarea', { class: 'mo-ta', spellcheck: 'false', placeholder: t('pasteTitle') });
    var pmsg = el('span', { class: 'hint' });
    pasteBox.appendChild(ta);
    var pa = el('div', { class: 'mo-bar' });
    pa.appendChild(btn(t('take'), 'primary-btn', function () { importText(side, ta.value, pmsg); }));
    pa.appendChild(btn(t('cancel'), '', function () { pasteBox.hidden = true; ta.value = ''; }));
    pa.appendChild(pmsg);
    pasteBox.appendChild(pa);
    box.appendChild(pasteBox);
    for (var i = 0; i < 6; i++) box.appendChild(renderSlot(side, i));
    box.classList.toggle('hasbr', sd.slots.some(function (s) { return s.brought; }));
    box.classList.toggle('is-hidden', sd.hidden);
    return box;
  }
  function renderTeam() {
    var w = el('div', { class: 'mo-tab' });
    var urls = el('div', { class: 'panel mo-card' });
    urls.appendChild(urlRow('/match/team?side=me', 320, 1080, el('b', { class: 'mo-tag me', text: t('me') })));
    urls.appendChild(urlRow('/match/team?side=opp', 320, 1080, el('b', { class: 'mo-tag opp', text: t('opp') })));
    urls.appendChild(el('div', { class: 'hint', text: t('teamHint') }));
    w.appendChild(urls);
    var g = el('div', { class: 'mo-two' });
    g.appendChild(renderSide('me'));
    g.appendChild(renderSide('opp'));
    w.appendChild(g);
    return w;
  }

  // ---------------- tab: team preview ----------------
  var SAMPLE1 = 'Flutter Mane @ Booster Energy\nAbility: Protosynthesis\nTimid Nature\n- Moonblast\n- Shadow Ball\n- Protect\n- Icy Wind\n\nUrshifu-Rapid-Strike @ Mystic Water\nAbility: Unseen Fist\nAdamant Nature\n- Surging Strikes\n- Close Combat\n- Aqua Jet\n- Detect\n\nLandorus-Therian @ Assault Vest\nAbility: Intimidate\nAdamant Nature\n- Stomping Tantrum\n- U-turn\n- Rock Slide\n- Tera Blast\n\nRillaboom @ Miracle Seed\nAbility: Grassy Surge\nAdamant Nature\n- Grassy Glide\n- Wood Hammer\n- Fake Out\n- High Horsepower\n\nNinetales-Alola @ Light Clay\nAbility: Snow Warning\nTimid Nature\n- Blizzard\n- Aurora Veil\n- Freeze-Dry\n- Protect\n\nIncineroar (M) @ Safety Goggles\nAbility: Intimidate\nCareful Nature\n- Flare Blitz\n- Knock Off\n- Fake Out\n- Parting Shot';
  var SAMPLE2 = 'Golisopod @ Sitrus Berry\nAbility: Emergency Exit\nAdamant Nature\n- Leech Life\n- Iron Head\n- Sucker Punch\n- Protect\n\nRaichu @ Focus Sash\nAbility: Lightning Rod\nTimid Nature\n- Zap Cannon\n- Focus Blast\n- Fake Out\n- Protect\n\nArchaludon @ Leftovers\nAbility: Stamina\nBold Nature\n- Electro Shot\n- Dragon Pulse\n- Flash Cannon\n- Protect\n\nBasculegion (F) @ Focus Sash\nAbility: Swift Swim\nModest Nature\n- Muddy Water\n- Shadow Ball\n- Ice Beam\n- Protect\n\nPelipper @ Damp Rock\nAbility: Drizzle\nBold Nature\n- Weather Ball\n- Hurricane\n- Helping Hand\n- Wide Guard\n\nSneasler @ White Herb\nAbility: Unburden\nAdamant Nature\n- Dire Claw\n- Close Combat\n- Rock Slide\n- Protect';
  function renderPreview() {
    var p = store.preview, w = el('div', { class: 'mo-tab' });
    var card = el('div', { class: 'panel mo-card' });
    card.appendChild(urlRow('/match/preview', 1920, 1080));
    var g = el('div', { class: 'mo-two' });
    [1, 2].forEach(function (n) {
      var col = el('div', { class: 'mo-col' });
      var pi = el('input', { type: 'text', placeholder: t('p' + n) });
      pi.value = p['p' + n];
      pi.addEventListener('input', function () { p['p' + n] = pi.value; persist(); });
      col.appendChild(field(t('p' + n), pi));
      var tb = el('div', { class: 'mo-bar' });
      var ta = el('textarea', { class: 'mo-ta tall', spellcheck: 'false', placeholder: t('teamPh') });
      ta.value = p['t' + n];
      ta.addEventListener('input', function () { p['t' + n] = ta.value; persist(); });
      tb.appendChild(builderSelect(function (tm) { ta.value = p['t' + n] = builderText(tm); persist(); }));
      tb.appendChild(btn(n === 1 ? t('fromMe') : t('fromOpp'), '', function () { ta.value = p['t' + n] = sideText(n === 1 ? 'me' : 'opp'); persist(); }));
      col.appendChild(tb);
      col.appendChild(field(t('text' + n), ta));
      var bk = el('textarea', { class: 'mo-ta bank', spellcheck: 'false', placeholder: n === 1 ? 'Amoonguss\nTornadus\nDragonite\nGholdengo' : 'Talonflame\nAmoonguss\nGarchomp\nKingambit' });
      bk.value = p['b' + n];
      bk.addEventListener('input', function () { p['b' + n] = bk.value; persist(); });
      col.appendChild(field(t('bank' + n), bk));
      g.appendChild(col);
    });
    card.appendChild(g);
    var row = el('div', { class: 'mo-bar' });
    row.appendChild(seg([['t', t('bgT')], ['s', t('bgS')]], p.bg, function (v) { p.bg = v; persist(); render(); }));
    row.appendChild(toggle(t('bench'), p.bench, function () { p.bench = !p.bench; persist(); render(); }));
    row.appendChild(toggle(t('closed'), p.closed, function () { p.closed = !p.closed; persist(); render(); }));
    row.appendChild(btn(t('sample'), '', function () {
      Object.assign(p, { p1: p.p1 || 'Spieler 1', p2: p.p2 || 'Spieler 2', t1: SAMPLE1, t2: SAMPLE2, b1: 'Amoonguss\nTornadus\nDragonite\nGholdengo', b2: 'Talonflame\nAmoonguss\nGarchomp\nKingambit', bench: true });
      persist(); render();
    }));
    row.appendChild(btn(t('clearAll'), 'danger', function () {
      if (!confirm(t('clearConfirm'))) return;
      p.t1 = p.t2 = p.b1 = p.b2 = '';
      persist(); render();
    }));
    card.appendChild(row);
    card.appendChild(el('div', { class: 'mo-warn', id: 'moUnknown' }));
    w.appendChild(card);
    if (D) {
      var pv = el('div', { class: 'panel mo-card' });
      var fr = el('div', { class: 'mo-frame wide' });
      fr.appendChild(el('iframe', { src: base + '/match/preview', title: t('tabPreview') }));
      pv.appendChild(fr);
      pv.appendChild(el('div', { class: 'hint', text: t('preview') }));
      w.appendChild(pv);
    }
    return w;
  }

  // ---------------- tab: matchup banner and start screen ----------------
  function logoImg(k) {
    var i = el('img', { class: 'mo-logo', alt: '' });
    if (logoV[k] && base) i.src = base + '/match/logo/' + k + '?v=' + logoV[k];
    return i;
  }
  function renderMatch() {
    var m = store.match, w = el('div', { class: 'mo-tab' });
    var card = el('div', { class: 'panel mo-card' });
    card.appendChild(urlRow('/match/matchup', 1920, 200, el('b', { class: 'mo-tag', text: t('ovMatch') })));
    var sopen = el('a', { href: '#', class: 'hint', text: t('open') });
    sopen.addEventListener('click', function (e) { e.preventDefault(); if (base) window.open(base + '/match/start', '_blank'); });
    card.appendChild(urlRow('/match/start', 1920, 1080, el('b', { class: 'mo-tag', text: t('start') })));
    var g = el('div', { class: 'mo-two' });
    ['L', 'R'].forEach(function (k) {
      var col = el('div', { class: 'mo-col' });
      var ni = el('input', { type: 'text' }); ni.value = m['name' + k];
      ni.addEventListener('input', function () { m['name' + k] = ni.value.slice(0, 60); persist(); });
      col.appendChild(field(t('name' + k), ni));
      var ri = el('input', { type: 'text' }); ri.value = m['rec' + k];
      ri.addEventListener('input', function () { m['rec' + k] = ri.value.slice(0, 60); persist(); });
      col.appendChild(field(t('rec' + k), ri));
      var sc = el('div', { class: 'mo-score' });
      var val = el('b', { text: String(m['score' + k]) });
      var step = function (d) { m['score' + k] = Math.max(0, Math.min(99, m['score' + k] + d)); val.textContent = m['score' + k]; persist(); };
      sc.appendChild(btn('−', '', function () { step(-1); }));
      sc.appendChild(val);
      sc.appendChild(btn('+', '', function () { step(1); }));
      col.appendChild(field(t('score' + k), sc));
      var lg = el('div', { class: 'mo-lg' });
      lg.appendChild(logoImg(k));
      var fi = el('input', { type: 'file', accept: 'image/*' });
      fi.disabled = !D;
      fi.addEventListener('change', function () {
        var f = fi.files[0];
        if (!f || !D) return;
        f.arrayBuffer().then(function (buf) { return D.setLogo(k, f.name, new Uint8Array(buf)); }).then(function (r) {
          fi.value = '';
          if (!r || r.error) { A.toast((S.logoErr[r && r.error]) || (r && r.error) || 'Upload'); return; }
          logoV[k] = r.v; render();
        });
      });
      lg.appendChild(fi);
      var dl = btn(t('logoDel'), '', function () { D.clearLogo(k).then(function () { logoV[k] = ''; render(); }); });
      dl.disabled = !D || !logoV[k];
      lg.appendChild(dl);
      col.appendChild(field(t('logo' + k), lg));
      g.appendChild(col);
    });
    card.appendChild(g);
    var li = el('input', { type: 'text', placeholder: t('leaguePh') }); li.value = m.league;
    li.addEventListener('input', function () { m.league = li.value.slice(0, 60); persist(); });
    card.appendChild(field(t('league'), li));
    var wk = el('textarea', { class: 'mo-ta week', spellcheck: 'false' }); wk.value = m.week;
    wk.addEventListener('input', function () { m.week = wk.value.slice(0, 60); persist(); });
    card.appendChild(field(t('week'), wk));
    var row = el('div', { class: 'mo-bar' });
    row.appendChild(btn(t('swap'), '', function () {
      ['name', 'rec', 'score'].forEach(function (x) { var a = m[x + 'L']; m[x + 'L'] = m[x + 'R']; m[x + 'R'] = a; });
      var after = function () { persist(); render(); };
      if (D) D.swapLogos().then(function (v) { if (v) logoV = { L: v.L || '', R: v.R || '' }; after(); }); else after();
    }));
    row.appendChild(btn(t('reset'), '', function () { m.scoreL = 0; m.scoreR = 0; persist(); render(); }));
    var pb = btn(t('play'), 'primary-btn', function () { if (D) D.play(); }, t('playHint'));
    pb.disabled = !D;
    row.appendChild(pb);
    row.appendChild(sopen);
    card.appendChild(row);
    w.appendChild(card);
    if (D) {
      var pv = el('div', { class: 'panel mo-card' });
      var fr = el('div', { class: 'mo-frame banner' });
      fr.appendChild(el('iframe', { src: base + '/match/matchup', title: t('ovMatch') }));
      pv.appendChild(fr);
      pv.appendChild(el('div', { class: 'hint', text: t('matchPrev') }));
      w.appendChild(pv);
    }
    return w;
  }

  // the state reaches OBS right after the app starts, not only when this view is opened
  function init() {
    if (!D) return;
    D.info().then(function (i) {
      base = (i && i.base) || '';
      logoV = { L: (i && i.logoL) || '', R: (i && i.logoR) || '' };
      push();
      if (document.body.dataset.view === 'overlay') render();
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();

  // checks for the parser and the name lookups (index.html#overlaytest, console: CCOverlay.selfTest())
  function selfTest() {
    var fails = [], ok = 0;
    function eq(a, b, what) { if (JSON.stringify(a) === JSON.stringify(b)) ok++; else fails.push(what + ': ' + JSON.stringify(a) + ' ≠ ' + JSON.stringify(b)); }
    var r = parseTeam(SAMPLE2);
    eq(r.mons.length, 6, 'six mons');
    eq(r.mons[3].info && r.mons[3].info.key, 'Basculegion-F', 'gender form');
    eq(r.mons[0].moves, ['Leech Life', 'Iron Head', 'Sucker Punch', 'Protect'], 'moves');
    eq(findSpecies('Sableye-Mega', '').key, 'Mega Sableye', 'showdown mega');
    eq(findSpecies('Flutter Mane', '').name, 'Flutter Mane', 'natdex');
    eq(formName('Mega Raichu Y', 'de'), 'Mega-Raichu Y', 'mega de');
    eq(formName('Ninetales-Alola', 'en'), 'Alolan Ninetales', 'regional en');
    eq(formName('Ninetales-Alola', 'de'), 'Alola-Vulnona', 'regional de');
    eq(pokeapiId('Mega Raichu Y'), 10305, 'pokeapi mega');
    eq(pokeapiId('Basculegion-F'), 10248, 'pokeapi female');
    eq(pokeapiId('Ho-Oh'), 250, 'pokeapi hyphen name');
    eq(plainName('Goodra-Hisui', 'en'), 'Goodra', 'plain name');
    eq(parseBank('Amoonguss\nTornadus, Dragonite').mons.length, 3, 'bench');
    eq(monText('Raichu', 'Raichunite Y', 'Static', 'Timid', ['Protect']).split('\n')[0], 'Raichu-Mega-Y @ Raichunite Y', 'mega text');
    eq(moveOut('Flamethrower', 'de'), { n: 'Flammenwurf', t: 'fire' }, 'move de');
    eq(formName('Urshifu-Rapid-Strike', 'de'), 'Wulaosu (Fließender Stil)', 'form de');
    eq(formName('Landorus-Therian', 'en'), 'Landorus (Therian)', 'form en');
    return { ok: ok, fails: fails };
  }
  window.CCOverlay = { render: render, push: push, selfTest: selfTest };
})();

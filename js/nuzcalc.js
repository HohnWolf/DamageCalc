// Nuzlocke-Rechner für die 3. bis 5. Generation: ROM (Trainer, Werte, Attacken) + Spielstand (eigenes Team und Box).
// GBA-Spiele (Gen 3) laufen über js/gen3.js, NDS-Spiele (Gen 4 und 5) über js/nds.js (Dateien) und js/nds_calc.js (Schaden).
// Gespeichert im Browser: "cc_nuz_rom" (aus der ROM gelesene Daten, nicht die ROM selbst), "cc_nuz_save" (Team und Box),
// "cc_nuz_calc" (Auswahl, Feld, tote Pokémon).
(function () {
  'use strict';
  var A = window.CC, G = window.GEN3;
  if (!A || !G) return;
  var el = A.el, de = A.LANG === 'de';
  var NAMES = window.GEN3_NAMES || { moves: { de: [], en: [] }, abilities: { de: [], en: [] } };
  var NDSN = window.NDS_NAMES || { moves: { de: [], en: [] }, abilities: { de: [], en: [] }, items: { de: [], en: [] } };
  var NDS = window.NDS, NC = window.NDS_CALC;
  // engine of the loaded game: GEN3 for GBA ROMs, NDS_CALC for DS ROMs (same functions and result format)
  function E() { return rom && rom.gen >= 4 && NC ? NC : G; }
  function isNds() { return !!(rom && rom.gen >= 4); }

  var S = de ? {
    loadRom: 'ROM laden', loadSave: 'Spielstand laden', noRom: 'Keine ROM geladen', noSave: 'Kein Spielstand geladen',
    romInfo: '{0} · {1} Trainer', saveInfo: '{0} · {1} im Team · {2} in der Box', reading: 'Wird gelesen …',
    romHelp: 'Die Spieldatei (.gba oder .nds), mit der du im Emulator spielst. Sie bleibt auf deinem Rechner.',
    saveHelp: 'Die Spielstand-Datei deines Emulators (.sav, .dsv oder .srm). Vorher im Spiel speichern.',
    errRom: 'Diese Datei konnte nicht gelesen werden ({0}).', errNotRom: 'Das ist keine ROM eines unterstützten Spiels. Unterstützt werden Pokémon-Spiele für Game Boy Advance (.gba) und Nintendo DS (.nds).', errNdsGame: 'Das ist eine DS-ROM, aber kein unterstütztes Pokémon-Spiel (Spielcode {0}). Unterstützt: Diamant, Perl, Platin, HeartGold, SoulSilver, Schwarz, Weiß, Schwarz 2, Weiß 2 und Hacks davon.', errNdsData: 'In dieser DS-ROM wurden die Spieldaten nicht gefunden (Spielcode {0}). Vielleicht ist der Hack zu stark umgebaut.', errSave: 'In dieser Datei wurden keine Pokémon gefunden.',
    romWarn: 'Hinweis: Nicht alles wurde gefunden ({0}). Vermutlich ein ROM-Hack mit geändertem Aufbau.',
    mine: 'Deine Pokémon', team: 'Team', box: 'Box', hideDead: 'Tote ausblenden', dead: 'Tot', markDead: 'Als tot markieren', unmarkDead: 'Lebt wieder',
    trainers: 'Kämpfe', search: 'Trainer suchen …', bosses: 'Nur wichtige', all: 'Alle', lv: 'Lv. {0}', lvRange: 'Lv. {0}–{1}', double: 'Doppel',
    pickMine: 'Wähle links eines deiner Pokémon.', pickFoe: 'Wähle rechts einen Kampf und dann ein Pokémon des Gegners.',
    needRom: 'Lade zuerst dein Spiel (die ROM). Daraus kommen alle Trainer mit ihren Teams.',
    needSave: 'Lade deinen Spielstand. Dann erscheinen hier dein Team und deine Boxen.',
    yourMoves: 'Deine Attacken', foeMoves: 'Attacken des Gegners', faster: 'Du bist schneller', slower: 'Der Gegner ist schneller', tie: 'Gleich schnell (Zufall)',
    speedLine: '{0}: Initiative {1} gegen {2}', crit: 'Volltreffer {0}', immune: 'Keine Wirkung', noDmg: 'Status-Attacke', guaranteed: 'garantierter {0}',
    chance: '{0} % {1}', approx: 'etwa {0}', hko: '{0}HKO', ohko: 'OHKO', field: 'Feld', weather: 'Wetter', badges: 'Orden', badgesT: 'Orden verstärken im Spiel deine Werte um 10 % (1: Angriff, 3: Initiative, 5: Verteidigung, 7: Sp.-Angr. und Sp.-Vert.)',
    w_none: 'Kein', w_rain: 'Regen', w_sun: 'Sonne', w_sand: 'Sandsturm', w_hail: 'Hagel', reflect: 'Reflektor', lightScreen: 'Lichtschild',
    onYou: 'bei dir', onFoe: 'beim Gegner', onYouShort: 'Bei dir:', onFoeShort: 'Beim Gegner:', hp: 'KP', status: 'Status', st_: 'OK', st_brn: 'Verbrannt', st_par: 'Paralysiert', st_psn: 'Vergiftet', st_slp: 'Schlaf', st_frz: 'Gefroren',
    stages: 'Statuswerte', nature: 'Wesen', ability: 'Fähigkeit', item: 'Item', noItem: 'kein Item', ivs: 'DVs', evs: 'EVs', defaultMoves: 'Attacken nach Level (Standard-Set)',
    note_multihit: '2–5 Treffer', note_triplekick: 'Summe aller 3 Treffer', note_explosion: 'halbiert die Verteidigung', note_solarbeam: 'halbe Stärke bei Regen, Sand, Hagel',
    note_magnitude: 'Stärke zufällig, mit 70 gerechnet', note_present: 'Stärke zufällig, mit 80 gerechnet', note_spitup: 'mit 1× Horter gerechnet', note_ohko: 'K.O. wenn sie trifft',
    note_counter: 'Schaden hängt vom erlittenen Schaden ab', note_levitate: 'Schwebe', note_voltabsorb: 'Voltabsorber', note_waterabsorb: 'H2O-Absorber', note_flashfire: 'Feuerfänger',
    note_soundproof: 'Lärmschutz', note_wonderguard: 'Wunderwache', note_sturdy: 'Robustheit', note_ohkolevel: 'Ziel hat höheres Level', note_type: '',
    note_sapsipper: 'Vegetarier', note_airballoon: 'Luftballon', note_itemdependent: 'hängt vom getragenen Item ab', note_trumpcard: 'mit 40 gerechnet (steigt mit sinkenden AP)',
    note_revenge: 'doppelt so stark, wenn der Gegner vorher trifft', note_dreameater: 'trifft nur schlafende Ziele', note_rivalry: 'Rivalität: ×1,25 bei gleichem, ×0,75 bei anderem Geschlecht', note_alwayscrit: 'immer Volltreffer', natureGuess: 'nicht bekannt, neutral gerechnet',
    errGen: 'Spielstand und ROM passen nicht zusammen: Der Spielstand ist aus der {0}. Generation, die geladene ROM aus der {1}. Generation. Lade die ROM des Spiels, zu dem der Spielstand gehört.',
    saveCleared: 'Der alte Spielstand passt nicht zu diesem Spiel und wurde entfernt.',
    hits2: '×2 Treffer', priority: 'Priorität {0}', removeRom: 'ROM-Daten entfernen', removeSave: 'Spielstand entfernen', class: 'Klasse {0}', box_n: 'Box {0}',
    foeTeam: 'Team des Gegners', vs: 'gegen', reset: 'Zurücksetzen', items: 'Items: {0}', perHit: 'pro Treffer', currentHp: 'aktuelle KP', drop: 'Datei hier ablegen',
    // step-by-step guides in the empty panels (the short help texts above are the tooltips of the buttons)
    romGuide: {
      title: 'So lädst du dein Spiel',
      steps: ['Klicke oben auf „ROM laden“.', 'Wähle die Spieldatei, mit der du im Emulator spielst: .gba (Game Boy Advance) oder .nds (Nintendo DS).', 'Fertig: Rechts erscheinen alle Trainer des Spiels.'],
      rows: [['Game Boy Advance', 'Rubin, Saphir, Smaragd, Feuerrot, Blattgrün'], ['Nintendo DS', 'Diamant, Perl, Platin, HeartGold, SoulSilver, Schwarz, Weiß, Schwarz 2, Weiß 2']],
      tips: ['ROM-Hacks mit gleichem Aufbau (z. B. Renegade Platinum, Blaze Black 2) gehen meist auch.', 'Du musst die ROM nur einmal laden. Sie bleibt auf deinem Rechner; die App merkt sich nur Trainer, Werte und Attacken daraus.']
    },
    saveGuide: {
      title: 'So lädst du deinen Spielstand',
      steps: ['Speichere im Spiel ganz normal über das Menü („Bericht“ bzw. „Speichern“).', 'Klicke oben auf „Spielstand laden“.', 'Wähle die Spielstand-Datei. Sie heißt fast immer wie deine ROM, nur mit anderer Endung:'],
      rows: [['mGBA, VisualBoyAdvance, melonDS', '.sav, meist im selben Ordner wie die ROM'], ['DeSmuME', '.dsv im Ordner „Battery“ von DeSmuME'], ['RetroArch', '.srm im Ordner „saves“']],
      tips: ['Nach jedem Kampf im Spiel speichern und die Datei neu laden, damit Level, KP und neue Pokémon stimmen.', 'Du kannst die Datei auch einfach in dieses Fenster ziehen.', 'Schnellspeicher-Dateien des Emulators (Savestates) gehen zum Teil auch, sind aber unzuverlässiger.']
    }
  } : {
    loadRom: 'Load ROM', loadSave: 'Load save', noRom: 'No ROM loaded', noSave: 'No save loaded',
    romInfo: '{0} · {1} trainers', saveInfo: '{0} · {1} in the party · {2} in the box', reading: 'Reading …',
    romHelp: 'The game file (.gba or .nds) you play in your emulator. It stays on your computer.',
    saveHelp: 'Your emulator’s save file (.sav, .dsv or .srm). Save in the game first.',
    errRom: 'This file could not be read ({0}).', errNotRom: 'This is not a ROM of a supported game. Supported are Pokémon games for Game Boy Advance (.gba) and Nintendo DS (.nds).', errNdsGame: 'This is a DS ROM, but not a supported Pokémon game (game code {0}). Supported: Diamond, Pearl, Platinum, HeartGold, SoulSilver, Black, White, Black 2, White 2 and hacks of them.', errNdsData: 'The game data was not found in this DS ROM (game code {0}). The hack may be changed too much.', errSave: 'No Pokémon were found in this file.',
    romWarn: 'Note: not everything was found ({0}). Probably a ROM hack with a changed layout.',
    mine: 'Your Pokémon', team: 'Party', box: 'Box', hideDead: 'Hide dead', dead: 'Dead', markDead: 'Mark as dead', unmarkDead: 'Alive again',
    trainers: 'Battles', search: 'Search trainers …', bosses: 'Important only', all: 'All', lv: 'Lv. {0}', lvRange: 'Lv. {0}–{1}', double: 'Double',
    pickMine: 'Pick one of your Pokémon on the left.', pickFoe: 'Pick a battle on the right and then one of the opponent’s Pokémon.',
    needRom: 'Load your game (the ROM) first. All trainers and their teams come from it.',
    needSave: 'Load your save. Then your party and your boxes appear here.',
    yourMoves: 'Your moves', foeMoves: 'Opponent’s moves', faster: 'You are faster', slower: 'The opponent is faster', tie: 'Speed tie (random)',
    speedLine: '{0}: speed {1} vs {2}', crit: 'Critical hit {0}', immune: 'No effect', noDmg: 'Status move', guaranteed: 'guaranteed {0}',
    chance: '{0}% {1}', approx: 'about {0}', hko: '{0}HKO', ohko: 'OHKO', field: 'Field', weather: 'Weather', badges: 'Badges', badgesT: 'In the game badges raise your stats by 10% (1: Attack, 3: Speed, 5: Defense, 7: Sp. Atk and Sp. Def)',
    w_none: 'None', w_rain: 'Rain', w_sun: 'Sun', w_sand: 'Sandstorm', w_hail: 'Hail', reflect: 'Reflect', lightScreen: 'Light Screen',
    onYou: 'on your side', onFoe: 'on the opponent’s side', onYouShort: 'Your side:', onFoeShort: 'Opponent:', hp: 'HP', status: 'Status', st_: 'OK', st_brn: 'Burned', st_par: 'Paralyzed', st_psn: 'Poisoned', st_slp: 'Asleep', st_frz: 'Frozen',
    stages: 'Stat stages', nature: 'Nature', ability: 'Ability', item: 'Item', noItem: 'no item', ivs: 'IVs', evs: 'EVs', defaultMoves: 'Moves by level (default set)',
    note_multihit: '2–5 hits', note_triplekick: 'total of all 3 hits', note_explosion: 'halves Defense', note_solarbeam: 'half power in rain, sand, hail',
    note_magnitude: 'random power, calculated with 70', note_present: 'random power, calculated with 80', note_spitup: 'calculated with 1× Stockpile', note_ohko: 'KO if it hits',
    note_counter: 'damage depends on the damage taken', note_levitate: 'Levitate', note_voltabsorb: 'Volt Absorb', note_waterabsorb: 'Water Absorb', note_flashfire: 'Flash Fire',
    note_soundproof: 'Soundproof', note_wonderguard: 'Wonder Guard', note_sturdy: 'Sturdy', note_ohkolevel: 'target has a higher level', note_type: '',
    note_sapsipper: 'Sap Sipper', note_airballoon: 'Air Balloon', note_itemdependent: 'depends on the held item', note_trumpcard: 'calculated with 40 (rises as PP drop)',
    note_revenge: 'twice as strong if the opponent hits first', note_dreameater: 'only hits sleeping targets', note_rivalry: 'Rivalry: ×1.25 same gender, ×0.75 opposite gender', note_alwayscrit: 'always a critical hit', natureGuess: 'unknown, calculated neutral',
    errGen: 'Save and ROM do not match: the save is from generation {0}, the loaded ROM from generation {1}. Load the ROM of the game the save belongs to.',
    saveCleared: 'The old save does not match this game and was removed.',
    hits2: '×2 hits', priority: 'Priority {0}', removeRom: 'Remove ROM data', removeSave: 'Remove save', class: 'Class {0}', box_n: 'Box {0}',
    foeTeam: 'Opponent’s team', vs: 'vs', reset: 'Reset', items: 'Items: {0}', perHit: 'per hit', currentHp: 'current HP', drop: 'Drop the file here',
    romGuide: {
      title: 'How to load your game',
      steps: ['Click “Load ROM” at the top.', 'Pick the game file you play in your emulator: .gba (Game Boy Advance) or .nds (Nintendo DS).', 'Done: all trainers of the game appear on the right.'],
      rows: [['Game Boy Advance', 'Ruby, Sapphire, Emerald, FireRed, LeafGreen'], ['Nintendo DS', 'Diamond, Pearl, Platinum, HeartGold, SoulSilver, Black, White, Black 2, White 2']],
      tips: ['ROM hacks with the same layout (e.g. Renegade Platinum, Blaze Black 2) usually work too.', 'You only need to load the ROM once. It stays on your computer; the app only keeps the trainers, stats and moves read from it.']
    },
    saveGuide: {
      title: 'How to load your save',
      steps: ['Save in the game as usual from the menu (“Save” or “Report”).', 'Click “Load save” at the top.', 'Pick the save file. It almost always has the same name as your ROM, just with another extension:'],
      rows: [['mGBA, VisualBoyAdvance, melonDS', '.sav, usually in the same folder as the ROM'], ['DeSmuME', '.dsv in DeSmuME’s “Battery” folder'], ['RetroArch', '.srm in the “saves” folder']],
      tips: ['Save in the game after every battle and load the file again, so levels, HP and new Pokémon are up to date.', 'You can also drag the file into this window.', 'Emulator quick saves (savestates) partly work too, but are less reliable.']
    }
  };
  var SKULL = '<svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor"><path d="M8 1C4.7 1 2.5 3.4 2.5 6.4c0 1.8.8 3.2 2 4V12c0 .6.4 1 1 1h.5v1.2c0 .4.3.8.8.8h.7v-1.5h1V15h1v-1.5h1V15h.7c.4 0 .8-.4.8-.8V13h.5c.6 0 1-.4 1-1v-1.6c1.2-.8 2-2.2 2-4C13.5 3.4 11.3 1 8 1zM5.6 9.6a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm4.8 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zM8 10.2l.9 1.5H7.1l.9-1.5z"/></svg>';
  function t(k) { var s = S[k] != null ? S[k] : k; for (var i = 1; i < arguments.length; i++) s = s.split('{' + (i - 1) + '}').join(arguments[i]); return s; }
  function pct(x) { var v = Math.round(x * 1000) / 10; return de ? String(v).replace('.', ',') : String(v); }

  // ---------------- state ----------------
  var rom = A.load('cc_nuz_rom', null), save = A.load('cc_nuz_save', null);
  if (rom && (!rom.species || !rom.moves || rom.v !== 1)) rom = null;
  var st = A.load('cc_nuz_calc', null) || {};
  st.field = st.field || { weather: 'none', double: false, badges: 0, myReflect: false, myLight: false, foeReflect: false, foeLight: false };
  st.dead = st.dead || {};
  st.mine = st.mine || null; // pid
  st.trainer = st.trainer == null ? null : st.trainer;
  st.foe = st.foe || 0;
  st.listTab = st.listTab || 'team';
  st.filter = st.filter || 'boss';
  st.my = st.my || { hp: null, status: '', stages: {} };
  st.op = st.op || { hp: 100, status: '', stages: {} };
  function persist() { A.save('cc_nuz_calc', st); }
  var query = '';

  // ---------------- names ----------------
  function nat(sp) { return rom && rom.species[sp] ? rom.species[sp].nat : isNds() ? sp : G.defaultNat(sp); }
  function spName(sp) { var n = nat(sp); return n && window.CCNuz ? window.CCNuz.monName(n) : (rom && rom.species[sp] ? titleCase(rom.species[sp].name) : '#' + sp); }
  // DS games: names in the app language by number; numbers the table does not know (ROM hacks) get the name from the ROM text
  function moveName(id) {
    if (isNds()) return NDSN.moves[A.LANG][id] || (rom.names && rom.names.moves[id]) || (de ? 'Attacke ' : 'Move ') + id;
    return NAMES.moves[A.LANG][id] || NAMES.moves.en[id] || (de ? 'Attacke ' : 'Move ') + id;
  }
  function abilityName(id) {
    if (isNds()) return NDSN.abilities[A.LANG][id] || (rom.names && rom.names.abilities[id]) || '—';
    return NAMES.abilities[A.LANG][id] || NAMES.abilities.en[id] || '—';
  }
  function itemName(id) {
    if (!id || !rom) return '';
    if (isNds()) return NDSN.items[A.LANG][id] || (rom.items[id] && rom.items[id].name) || '#' + id;
    return rom.items[id] ? titleCase(rom.items[id].name) : '';
  }
  function typeName(ti) { return A.nType(E().TYPES[ti] || '???'); }
  function typeBadge(ti) { var n = E().TYPES[ti]; return !n || n === '???' ? el('span', { class: 'type-badge', text: '???' }) : A.typeBadge(n); }
  function titleCase(s) {
    if (!s || s !== s.toUpperCase()) return s || '';
    return s.toLowerCase().replace(/(^|[\s\-.'’])(\S)/g, function (m, a, b) { return a + b.toUpperCase(); }).replace(/\bPkmn\b/g, 'PKMN');
  }
  function trainerName(tr) {
    var cls = rom.classNames && rom.classNames[tr.cls] ? titleCase(rom.classNames[tr.cls]) : t('class', tr.cls);
    return (cls + ' ' + titleCase(tr.name)).trim();
  }
  function sprite(sp, cls) { return window.CCNuz ? window.CCNuz.sprite(nat(sp), cls) : el('span'); }
  function natureName(n) { return A.nNature ? A.nNature(G.NATURES[n]) : G.NATURES[n]; }

  // ---------------- file loading ----------------
  function readFile(file, kind) {
    var fr = new FileReader();
    A.toast(t('reading'));
    fr.onload = function () {
      setTimeout(function () {
        if (kind === 'rom') loadRom(fr.result); else loadSave(fr.result);
      }, 30);
    };
    fr.readAsArrayBuffer(file);
  }
  // readable text for an error of the ROM readers (codes rom:notgba, rom:ndsgame:CODE, rom:ndsdata:CODE)
  function romError(e) {
    var msg = String(e && e.message ? e.message : e), p = msg.split(':');
    if (p[0] === 'rom' && p[1] === 'notgba') return t('errNotRom');
    if (p[0] === 'rom' && p[1] === 'ndsgame') return t('errNdsGame', p[2] || '?');
    if (p[0] === 'rom' && p[1] === 'ndsdata') return t('errNdsData', p[2] || '?');
    return t('errRom', msg);
  }
  function loadRom(buf) {
    var r;
    try { r = NDS && NDS.isNds(buf) ? NDS.parseRom(buf) : G.parseRom(buf); } catch (e) { A.showModal(t('loadRom'), romError(e)); return; }
    r.v = 1;
    rom = r;
    if (save && (save.gen || 3) !== (r.gen || 3)) { save = null; localStorage.removeItem('cc_nuz_save'); A.toast(t('saveCleared')); }
    try { A.save('cc_nuz_rom', r); } catch (e) { /* too big: only kept for this session */ }
    if (r.warnings.length) A.showModal(t('loadRom'), t('romWarn', r.warnings.join(', ')));
    else A.toast(t('romInfo', gameLabel(), r.trainers.length));
    st.trainer = null; persist(); rerender();
  }
  function loadSave(buf) {
    // a real DS save is recognized first (also with a GBA ROM loaded, to tell that they do not match); DS savestates need the DS ROM
    var ds = NDS ? NDS.parseSav(new Uint8Array(buf)) : null;
    var job = ds ? Promise.resolve(ds) : isNds() ? NDS.parseSave(buf, rom).then(function (s) { return s || G.parseSave(buf); }) : G.parseSave(buf);
    job.then(function (s) {
      if (!s || (!s.party.length && !s.boxes.length)) { A.showModal(t('loadSave'), t('errSave')); return; }
      var sg = s.gen || 3, rg = rom ? rom.gen || 3 : sg;
      if (sg !== rg) { A.showModal(t('loadSave'), t('errGen', sg, rg)); return; }
      save = s; A.save('cc_nuz_save', s);
      A.toast(t('saveInfo', s.trainer.name || '—', s.party.length, s.boxes.length));
      if (!findMine(st.mine)) st.mine = s.party[0] ? s.party[0].pid : s.boxes[0].pid;
      st.my = { hp: null, status: '', stages: {} };
      persist(); rerender();
    }, function (e) { A.showModal(t('loadSave'), t('errSave') + '\n' + (e && e.message || e)); });
  }
  function gameLabel() {
    if (!rom) return '';
    var g = de ? rom.game : rom.gameEn;
    return (g ? 'Pokémon ' + g : rom.title) + (rom.lang ? ' (' + rom.lang + ')' : '') + (g ? '' : ' · ' + rom.code);
  }
  // step-by-step guide for an empty panel: lead sentence, numbered steps, a small table, tips
  function guide(lead, g) {
    var box = el('div', { class: 'nc-guide' });
    if (lead) box.appendChild(el('p', { class: 'nc-guide-lead', text: lead }));
    box.appendChild(el('div', { class: 'nc-guide-title', text: g.title }));
    var ol = el('ol');
    g.steps.forEach(function (s) { ol.appendChild(el('li', { text: s })); });
    box.appendChild(ol);
    if (g.rows && g.rows.length) {
      var tb = el('div', { class: 'nc-guide-rows' });
      g.rows.forEach(function (r) { tb.appendChild(el('b', { text: r[0] })); tb.appendChild(el('span', { text: r[1] })); });
      box.appendChild(tb);
    }
    var ul = el('ul', { class: 'nc-guide-tips' });
    (g.tips || []).forEach(function (s) { ul.appendChild(el('li', { text: s })); });
    box.appendChild(ul);
    return box;
  }
  function filePicker(accept, kind) {
    var inp = el('input', { type: 'file', accept: accept });
    inp.style.display = 'none';
    inp.addEventListener('change', function () { if (inp.files[0]) readFile(inp.files[0], kind); inp.remove(); });
    document.body.appendChild(inp);
    inp.click();
  }

  // ---------------- battle Pokémon ----------------
  function allMine() { return save ? save.party.map(function (m, i) { m.where = 'party'; m.idx = i; return m; }).concat(save.boxes.map(function (m) { m.where = 'box'; return m; })) : []; }
  function findMine(pid) { var r = null; allMine().some(function (m) { if (m.pid === pid) { r = m; return true; } return false; }); return r; }
  function prep(base, side) {
    var m = JSON.parse(JSON.stringify(base));
    var o = side === 'my' ? st.my : st.op;
    if (side === 'my' && base.hp != null && o.hp == null) m.hp = base.hp;
    else m.hp = Math.max(1, Math.round(m.maxHP * (o.hp == null ? 100 : o.hp) / 100));
    m.status = o.status || '';
    m.stages = o.stages || {};
    m.player = side === 'my';
    return m;
  }
  function myMon() {
    var s = findMine(st.mine);
    if (!s || !rom) return null;
    return E().fromSave(rom, s);
  }
  function curTrainer() { if (!rom || st.trainer == null) return null; var r = null; rom.trainers.some(function (x) { if (x.id === st.trainer) { r = x; return true; } return false; }); return r; }
  var partyCache = { id: null, list: null };
  function foeParty() {
    var tr = curTrainer();
    if (!tr) return [];
    if (partyCache.id !== tr.id) partyCache = { id: tr.id, list: E().trainerParty(rom, tr) };
    return partyCache.list;
  }

  // ---------------- render ----------------
  var host = null;
  function rerender() { if (host) render(host); }
  function render(body) {
    host = body;
    body.innerHTML = '';
    var wrap = el('div', { class: 'nc' });
    body.appendChild(wrap);
    wrap.appendChild(setupBar());
    var grid = el('div', { class: 'nc-grid' });
    grid.appendChild(minePanel());
    grid.appendChild(fightPanel());
    grid.appendChild(trainerPanel());
    wrap.appendChild(grid);
    // drag & drop
    body.ondragover = function (ev) { ev.preventDefault(); body.classList.add('nc-drop'); };
    body.ondragleave = function () { body.classList.remove('nc-drop'); };
    body.ondrop = function (ev) {
      ev.preventDefault(); body.classList.remove('nc-drop');
      var f = ev.dataTransfer.files[0];
      if (f) readFile(f, /\.(gba|bin|agb|nds|srl)$/i.test(f.name) || f.size >= 0x200000 ? 'rom' : 'save');
    };
  }

  function setupBar() {
    var bar = el('div', { class: 'nc-setup panel' });
    function slot(label, info, ok, accept, kind, help, removeKey) {
      var s = el('div', { class: 'nc-file' + (ok ? ' ok' : '') });
      var b = el('button', { class: ok ? 'tbtn' : 'primary-btn', text: label, title: help });
      b.addEventListener('click', function () { filePicker(accept, kind); });
      s.appendChild(b);
      s.appendChild(el('span', { class: 'nc-file-info', text: info, title: help }));
      if (ok) {
        var x = el('button', { class: 'nc-x', text: '✕', title: t(removeKey) });
        x.addEventListener('click', function () {
          if (kind === 'rom') { rom = null; localStorage.removeItem('cc_nuz_rom'); } else { save = null; localStorage.removeItem('cc_nuz_save'); }
          rerender();
        });
        s.appendChild(x);
      }
      return s;
    }
    bar.appendChild(slot(t('loadRom'), rom ? t('romInfo', gameLabel(), rom.trainers.length) : t('noRom'), !!rom, '.gba,.bin,.agb,.nds,.srl', 'rom', t('romHelp'), 'removeRom'));
    bar.appendChild(slot(t('loadSave'), save ? t('saveInfo', save.trainer.name || '—', save.party.length, save.boxes.length) : t('noSave'), !!save, '*', 'save', t('saveHelp'), 'removeSave'));
    // field
    var f = st.field;
    var fl = el('div', { class: 'nc-field' });
    function sel(label, opts, cur, fn, title) {
      var w = el('label', { class: 'nc-sel', title: title || '' });
      w.appendChild(el('span', { text: label }));
      var s = el('select');
      opts.forEach(function (o) { var op = el('option', { value: o[0], text: o[1] }); if (String(o[0]) === String(cur)) op.selected = true; s.appendChild(op); });
      s.addEventListener('change', function () { fn(s.value); persist(); rerender(); });
      w.appendChild(s);
      return w;
    }
    // badges only raise stats in Gen 3
    if (!isNds()) fl.appendChild(sel(t('badges'), [0, 1, 2, 3, 4, 5, 6, 7, 8].map(function (n) { return [n, String(n)]; }), f.badges, function (v) { f.badges = +v; }, t('badgesT')));
    fl.appendChild(sel(t('weather'), ['none', 'rain', 'sun', 'sand', 'hail'].map(function (w) { return [w, t('w_' + w)]; }), f.weather, function (v) { f.weather = v; }));
    function tog(key, label, title) {
      var b = el('button', { class: 'nc-tog' + (f[key] ? ' on' : ''), text: label, title: title || '' });
      b.addEventListener('click', function () { f[key] = !f[key]; persist(); rerender(); });
      fl.appendChild(b);
    }
    tog('double', t('double'));
    fl.appendChild(el('span', { class: 'nc-flbl', text: t('onYouShort') }));
    tog('myReflect', t('reflect'), t('reflect') + ' ' + t('onYou'));
    tog('myLight', t('lightScreen'), t('lightScreen') + ' ' + t('onYou'));
    fl.appendChild(el('span', { class: 'nc-flbl', text: t('onFoeShort') }));
    tog('foeReflect', t('reflect'), t('reflect') + ' ' + t('onFoe'));
    tog('foeLight', t('lightScreen'), t('lightScreen') + ' ' + t('onFoe'));
    bar.appendChild(fl);
    return bar;
  }

  function minePanel() {
    var p = el('section', { class: 'nc-mine panel' });
    var h = el('div', { class: 'nc-ph' });
    h.appendChild(el('span', { class: 'sl-title', text: t('mine') }));
    var tabs = el('div', { class: 'btn-group nc-mini' });
    ['team', 'box'].forEach(function (k) {
      var b = el('button', { class: st.listTab === k ? 'on' : '', text: t(k) + (save ? ' ' + (k === 'team' ? save.party.length : save.boxes.length) : '') });
      b.addEventListener('click', function () { st.listTab = k; persist(); rerender(); });
      tabs.appendChild(b);
    });
    h.appendChild(tabs);
    p.appendChild(h);
    var hd = el('label', { class: 'nc-check' });
    var cb = el('input', { type: 'checkbox' }); cb.checked = !!st.hideDead;
    cb.addEventListener('change', function () { st.hideDead = cb.checked; persist(); rerender(); });
    hd.appendChild(cb); hd.appendChild(document.createTextNode(' ' + t('hideDead')));
    p.appendChild(hd);
    var list = el('div', { class: 'nc-list' });
    if (!save) list.appendChild(guide(t('needSave'), S.saveGuide));
    else {
      var mons = st.listTab === 'team' ? save.party : save.boxes;
      var lastBox = null;
      mons.forEach(function (m) {
        if (m.egg) return;
        var dead = !!st.dead[m.pid];
        if (dead && st.hideDead) return;
        if (st.listTab === 'box' && m.box !== lastBox) {
          lastBox = m.box;
          list.appendChild(el('div', { class: 'nc-boxhead', text: m.box >= 0 ? (save.boxNames[m.box] || t('box_n', m.box + 1)) : '?' }));
        }
        var sp = rom && rom.species[m.species] ? rom.species[m.species] : null;
        var lv = m.level || (sp ? E().levelFromExp(sp.growth, m.exp) : '?');
        var row = el('div', { class: 'nc-monrow' + (m.pid === st.mine ? ' on' : '') + (dead ? ' dead' : '') });
        row.appendChild(sprite(m.species, 'nc-mini-img'));
        var tx = el('div', { class: 'nc-mon-txt' });
        tx.appendChild(el('div', { class: 'nc-mon-name', text: titleCase(m.nick) || spName(m.species) }));
        tx.appendChild(el('div', { class: 'nc-mon-sub', text: spName(m.species) + ' · ' + t('lv', lv) + (m.where === 'party' && m.stats ? ' · ' + m.hp + '/' + m.stats.hp + ' ' + t('hp') : '') }));
        row.appendChild(tx);
        var d = el('button', { class: 'nc-skull' + (dead ? ' on' : ''), title: dead ? t('unmarkDead') : t('markDead') }, SKULL);
        d.addEventListener('click', function (ev) { ev.stopPropagation(); if (dead) delete st.dead[m.pid]; else st.dead[m.pid] = 1; persist(); rerender(); });
        row.appendChild(d);
        row.addEventListener('click', function () { st.mine = m.pid; st.my = { hp: null, status: '', stages: {} }; persist(); rerender(); });
        list.appendChild(row);
      });
    }
    p.appendChild(list);
    return p;
  }

  function trainerPanel() {
    var p = el('section', { class: 'nc-trainers panel' });
    var h = el('div', { class: 'nc-ph' });
    h.appendChild(el('span', { class: 'sl-title', text: t('trainers') }));
    var tabs = el('div', { class: 'btn-group nc-mini' });
    [['boss', t('bosses')], ['all', t('all')]].forEach(function (k) {
      var b = el('button', { class: st.filter === k[0] ? 'on' : '', text: k[1] });
      b.addEventListener('click', function () { st.filter = k[0]; persist(); rerender(); });
      tabs.appendChild(b);
    });
    h.appendChild(tabs);
    p.appendChild(h);
    var q = el('input', { type: 'text', placeholder: t('search'), class: 'nc-search' });
    q.value = query;
    p.appendChild(q);
    var list = el('div', { class: 'nc-list' });
    p.appendChild(list);
    function fill() {
      list.innerHTML = '';
      if (!rom) { list.appendChild(guide(t('needRom'), S.romGuide)); return; }
      var qq = query.toLowerCase();
      var trs = rom.trainers.filter(function (tr) {
        if (st.filter === 'boss' && !(tr.custom || tr.items.length)) return false;
        if (qq && trainerName(tr).toLowerCase().indexOf(qq) === -1 && !tr.party.some(function (pm) { return spName(pm.species).toLowerCase().indexOf(qq) !== -1; })) return false;
        return true;
      });
      trs.sort(function (a, b) { return maxLv(a) - maxLv(b) || a.id - b.id; });
      trs.slice(0, 400).forEach(function (tr) {
        var row = el('div', { class: 'nc-trow' + (tr.id === st.trainer ? ' on' : '') });
        var top = el('div', { class: 'nc-trow-top' });
        top.appendChild(el('span', { class: 'nc-tname', text: trainerName(tr) }));
        var lvs = tr.party.map(function (x) { return x.level; });
        var mn = Math.min.apply(null, lvs), mx = Math.max.apply(null, lvs);
        top.appendChild(el('span', { class: 'nc-tlv', text: (tr.double ? t('double') + ' · ' : '') + (mn === mx ? t('lv', mx) : t('lvRange', mn, mx)) }));
        row.appendChild(top);
        var sps = el('div', { class: 'nc-tmons' });
        tr.party.forEach(function (pm) { sps.appendChild(sprite(pm.species, 'nc-tiny-img')); });
        row.appendChild(sps);
        row.addEventListener('click', function () { st.trainer = tr.id; st.foe = 0; st.op = { hp: 100, status: '', stages: {} }; persist(); rerender(); });
        list.appendChild(row);
      });
    }
    q.addEventListener('input', function () { query = q.value; fill(); });
    fill();
    return p;
  }
  function maxLv(tr) { return Math.max.apply(null, tr.party.map(function (x) { return x.level; })); }

  function fightPanel() {
    var p = el('section', { class: 'nc-fight panel' });
    if (!rom) { p.appendChild(el('div', { class: 'hint nc-empty big', text: t('needRom') })); return p; }
    var tr = curTrainer(), party = foeParty();
    // opponent team strip
    if (tr) {
      var strip = el('div', { class: 'nc-foeteam' });
      strip.appendChild(el('div', { class: 'nc-foe-title', text: trainerName(tr) + (tr.items.length ? ' · ' + t('items', tr.items.map(itemName).join(', ')) : '') }));
      var row = el('div', { class: 'nc-foe-row' });
      party.forEach(function (m, i) {
        var b = el('button', { class: 'nc-foe-mon' + (i === st.foe ? ' on' : '') });
        b.appendChild(sprite(m.species, 'nc-mini-img'));
        var tx = el('span', { class: 'nc-foe-txt' });
        tx.appendChild(el('span', { class: 'nc-mon-name', text: spName(m.species) }));
        tx.appendChild(el('span', { class: 'nc-mon-sub', text: t('lv', m.level) + (m.item ? ' · ' + itemName(m.item) : '') }));
        b.appendChild(tx);
        b.addEventListener('click', function () { st.foe = i; st.op = { hp: 100, status: '', stages: {} }; persist(); rerender(); });
        row.appendChild(b);
      });
      strip.appendChild(row);
      p.appendChild(strip);
    }
    var mb = myMon(), fb = party[st.foe] || null;
    if (!mb || !fb) {
      p.appendChild(el('div', { class: 'hint nc-empty big', text: !save ? t('needSave') : !mb ? t('pickMine') : t('pickFoe') }));
      return p;
    }
    var me = prep(mb, 'my'), foe = prep(fb, 'op');
    var f = st.field;
    var cards = el('div', { class: 'nc-vs' });
    cards.appendChild(monCard(me, 'my', findMine(st.mine)));
    cards.appendChild(el('div', { class: 'nc-vs-mid', text: t('vs') }));
    cards.appendChild(monCard(foe, 'op', null));
    p.appendChild(cards);
    // speed
    var sm = E().speedOf(rom, me, f), sf = E().speedOf(rom, foe, f);
    var sp = el('div', { class: 'nc-speed ' + (sm > sf ? 'good' : sm < sf ? 'bad' : '') });
    sp.textContent = t('speedLine', sm > sf ? t('faster') : sm < sf ? t('slower') : t('tie'), sm, sf);
    p.appendChild(sp);
    // damage tables
    var fMe = { weather: f.weather, double: f.double, badges: f.badges, reflect: f.foeReflect, lightScreen: f.foeLight };
    var fFoe = { weather: f.weather, double: f.double, badges: f.badges, reflect: f.myReflect, lightScreen: f.myLight };
    p.appendChild(moveTable(t('yourMoves'), me, foe, fMe, 'my'));
    p.appendChild(moveTable(t('foeMoves') + (fb.defaultMoves ? ' · ' + t('defaultMoves') : ''), foe, me, fFoe, 'op'));
    return p;
  }

  function monCard(m, side, saveEntry) {
    var o = side === 'my' ? st.my : st.op;
    var c = el('div', { class: 'nc-card ' + side });
    var top = el('div', { class: 'nc-card-top' });
    top.appendChild(sprite(m.species, 'nc-big-img'));
    var tx = el('div', { class: 'nc-card-txt' });
    tx.appendChild(el('div', { class: 'nc-card-name', text: (saveEntry && titleCase(saveEntry.nick)) || spName(m.species) }));
    tx.appendChild(el('div', { class: 'nc-mon-sub', text: spName(m.species) + ' · ' + t('lv', m.level) }));
    var ty = el('div', { class: 'nc-types' });
    var seen = {};
    m.types.forEach(function (x) { if (!seen[x]) { seen[x] = 1; ty.appendChild(typeBadge(x)); } });
    tx.appendChild(ty);
    top.appendChild(tx);
    c.appendChild(top);
    var info = el('div', { class: 'nc-info' });
    info.appendChild(el('div', null, '<b>' + A.esc(t('ability')) + '</b> ' + A.esc(abilityName(m.ability))));
    info.appendChild(el('div', null, '<b>' + A.esc(t('item')) + '</b> ' + A.esc(itemName(m.item) || t('noItem'))));
    info.appendChild(el('div', null, '<b>' + A.esc(t('nature')) + '</b> ' + A.esc(m.natureKnown === false ? t('natureGuess') : natureName(m.nature))));
    c.appendChild(info);
    // stats line
    var stl = el('div', { class: 'nc-stats' });
    [['hp', 'KP'], ['atk', 'Angr'], ['def', 'Vert'], ['spa', 'SpA'], ['spd', 'SpV'], ['spe', 'Init']].forEach(function (k) {
      var lab = de ? k[1] : { hp: 'HP', atk: 'Atk', def: 'Def', spa: 'SpA', spd: 'SpD', spe: 'Spe' }[k[0]];
      var s = el('div', { class: 'nc-stat', title: t('ivs') + ' ' + m.ivs[k[0]] + (m.evs && m.evs[k[0]] ? ' · ' + t('evs') + ' ' + m.evs[k[0]] : '') });
      s.appendChild(el('span', { class: 'nc-stat-l', text: lab }));
      s.appendChild(el('span', { class: 'nc-stat-v', text: String(m.stats[k[0]]) }));
      if (k[0] !== 'hp') {
        var sel = el('select', { class: 'nc-stage' + ((o.stages[k[0]] || 0) ? ' set' : '') });
        for (var i = 6; i >= -6; i--) { var op = el('option', { value: i, text: (i > 0 ? '+' : '') + i }); if ((o.stages[k[0]] || 0) === i) op.selected = true; sel.appendChild(op); }
        sel.addEventListener('change', function () { o.stages[k[0]] = +sel.value; persist(); rerender(); });
        s.appendChild(sel);
      }
      stl.appendChild(s);
    });
    c.appendChild(stl);
    // HP + status
    var hpRow = el('div', { class: 'nc-hp' });
    var hpPct = m.hp / m.maxHP;
    var bar = el('div', { class: 'nc-hpbar' });
    var fill = el('span'); fill.style.width = Math.round(hpPct * 100) + '%';
    fill.className = hpPct > .5 ? 'g' : hpPct > .2 ? 'y' : 'r';
    bar.appendChild(fill);
    hpRow.appendChild(bar);
    var rng = el('input', { type: 'range', min: 1, max: 100, value: Math.max(1, Math.round(hpPct * 100)) });
    rng.addEventListener('change', function () { o.hp = +rng.value; persist(); rerender(); });
    hpRow.appendChild(rng);
    hpRow.appendChild(el('span', { class: 'nc-hp-txt', text: m.hp + '/' + m.maxHP }));
    var ss = el('select', { class: 'nc-status' });
    ['', 'brn', 'par', 'psn', 'slp', 'frz'].forEach(function (k) { var op = el('option', { value: k, text: t('st_' + k) }); if ((o.status || '') === k) op.selected = true; ss.appendChild(op); });
    ss.addEventListener('change', function () { o.status = ss.value; persist(); rerender(); });
    hpRow.appendChild(ss);
    c.appendChild(hpRow);
    return c;
  }

  function koText(ko) {
    if (!ko) return '';
    var what = ko.n === 1 ? t('ohko') : t('hko', ko.n);
    if (ko.approx) return t('approx', what);
    if (ko.chance >= 0.9999) return t('guaranteed', what);
    return t('chance', pct(ko.chance), what);
  }
  function moveTable(title, att, def, f, side) {
    var box = el('div', { class: 'nc-moves ' + side });
    box.appendChild(el('div', { class: 'nc-moves-title', text: title }));
    if (!att.moves.length) box.appendChild(el('div', { class: 'hint', text: '—' }));
    att.moves.forEach(function (id) {
      var mv = rom.moves[id];
      var r = E().calc(rom, att, def, id, f);
      var row = el('div', { class: 'nc-mrow' + (r.immune ? ' immune' : '') + (r.status ? ' status' : '') });
      var nm = el('div', { class: 'nc-mname' });
      nm.appendChild(typeBadge(r.type != null ? r.type : mv ? mv.type : 0));
      nm.appendChild(el('span', { text: moveName(id) }));
      if (mv && mv.power && !r.status) nm.appendChild(el('span', { class: 'nc-pow', text: String(r.power || mv.power) + (mv.priority ? ' · ' + t('priority', (mv.priority > 0 ? '+' : '') + mv.priority) : '') }));
      row.appendChild(nm);
      var dm = el('div', { class: 'nc-dmg' });
      if (r.status) dm.appendChild(el('span', { class: 'hint', text: r.notes.indexOf('counter') !== -1 ? t('note_counter') : t('noDmg') }));
      else if (r.immune) dm.appendChild(el('span', { class: 'nc-imm', text: t('immune') + (r.notes[0] && t('note_' + r.notes[0]) ? ' (' + t('note_' + r.notes[0]) + ')' : '') }));
      else {
        var lo = r.multiMin != null ? r.multiMin : r.min, hi = r.multiMax != null ? r.multiMax : r.max;
        var pLo = lo / def.maxHP, pHi = hi / def.maxHP;
        var main = el('div', { class: 'nc-range' });
        main.appendChild(el('b', { text: lo + '–' + hi }));
        main.appendChild(el('span', { text: ' (' + pct(pLo) + ' – ' + pct(pHi) + ' %)' }));
        if (r.hits === 2 || Array.isArray(r.hits)) main.appendChild(el('span', { class: 'hint', text: ' · ' + r.min + '–' + r.max + ' ' + t('perHit') }));
        dm.appendChild(main);
        var bar = el('div', { class: 'nc-dbar' });
        var wLo = Math.min(100, pLo * 100);
        var a = el('span', { class: 'lo' }); a.style.width = wLo + '%';
        var b = el('span', { class: 'hi' }); b.style.width = Math.min(100 - wLo, (pHi - pLo) * 100) + '%';
        bar.appendChild(a); bar.appendChild(b);
        dm.appendChild(bar);
        var ko = E().koChance(r, def.hp);
        var kt = el('div', { class: 'nc-ko' + (ko && ko.n === 1 && ko.chance > 0 ? ' ohko' : '') });
        kt.textContent = koText(ko) + (r.critChance ? ' · ' + t('crit', r.critMin + '–' + r.critMax + ' (' + pct(r.critMin / def.maxHP) + ' – ' + pct(r.critMax / def.maxHP) + ' %)') : '');
        r.notes.forEach(function (n) { if (S['note_' + n]) kt.textContent += ' · ' + t('note_' + n); });
        if (r.eff !== 1) kt.textContent = '×' + (de ? String(r.eff).replace('.', ',') : r.eff) + ' · ' + kt.textContent;
        dm.appendChild(kt);
      }
      row.appendChild(dm);
      box.appendChild(row);
    });
    return box;
  }

  window.CCNuzCalc = {
    render: render,
    // for tests
    _load: function (romBuf, saveBuf) { if (romBuf) loadRom(romBuf); if (saveBuf) loadSave(saveBuf); },
    _state: function () { return { rom: rom, save: save, st: st }; }
  };
})();

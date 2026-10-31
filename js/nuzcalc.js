// Nuzlocke-Rechner für die 3. Generation: ROM (Trainer, Werte, Attacken) + Spielstand (eigenes Team und Box).
// Gespeichert im Browser: "cc_nuz_rom" (aus der ROM gelesene Daten, nicht die ROM selbst), "cc_nuz_save" (Team und Box),
// "cc_nuz_calc" (Auswahl, Feld, tote Pokémon).
(function () {
  'use strict';
  var A = window.CC, G = window.GEN3;
  if (!A || !G) return;
  var el = A.el, de = A.LANG === 'de';
  var NAMES = window.GEN3_NAMES || { moves: { de: [], en: [] }, abilities: { de: [], en: [] } };

  var S = de ? {
    loadRom: 'ROM laden', loadSave: 'Spielstand laden', noRom: 'Keine ROM geladen', noSave: 'Kein Spielstand geladen',
    romInfo: '{0} · {1} Trainer', saveInfo: '{0} · {1} im Team · {2} in der Box', reading: 'Wird gelesen …',
    romHelp: 'Unterstützt: Rubin, Saphir, Smaragd, Feuerrot, Blattgrün (alle Sprachen) und ROM-Hacks mit gleichem Aufbau. Die ROM bleibt auf deinem Rechner; gespeichert werden nur die gelesenen Daten.',
    saveHelp: 'Am besten die .sav-Datei (Ingame-Spielstand) nehmen: Im Spiel speichern, dann liegt sie neben der ROM. Savestates (.ss1, .sgm …) gehen je nach Emulator auch.',
    errRom: 'Diese Datei konnte nicht als Gen-3-ROM gelesen werden ({0}).', errSave: 'In dieser Datei wurden keine Pokémon gefunden.',
    romWarn: 'Hinweis: Nicht alles wurde gefunden ({0}). Vermutlich ein ROM-Hack mit geändertem Aufbau.',
    mine: 'Deine Pokémon', team: 'Team', box: 'Box', hideDead: 'Tote ausblenden', dead: 'Tot', markDead: 'Als tot markieren', unmarkDead: 'Lebt wieder',
    trainers: 'Kämpfe', search: 'Trainer suchen …', bosses: 'Nur wichtige', all: 'Alle', lv: 'Lv. {0}', lvRange: 'Lv. {0}–{1}', double: 'Doppel',
    pickMine: 'Wähle links eines deiner Pokémon.', pickFoe: 'Wähle rechts einen Kampf und dann ein Pokémon des Gegners.',
    needRom: 'Lade zuerst die ROM deines Spiels: Daraus kommen Trainer, Werte und Attacken.',
    needSave: 'Lade deinen Spielstand, damit dein Team und deine Box erscheinen.',
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
    hits2: '×2 Treffer', priority: 'Priorität {0}', removeRom: 'ROM-Daten entfernen', removeSave: 'Spielstand entfernen', class: 'Klasse {0}', box_n: 'Box {0}',
    foeTeam: 'Team des Gegners', vs: 'gegen', reset: 'Zurücksetzen', items: 'Items: {0}', perHit: 'pro Treffer', currentHp: 'aktuelle KP', drop: 'Datei hier ablegen'
  } : {
    loadRom: 'Load ROM', loadSave: 'Load save', noRom: 'No ROM loaded', noSave: 'No save loaded',
    romInfo: '{0} · {1} trainers', saveInfo: '{0} · {1} in the party · {2} in the box', reading: 'Reading …',
    romHelp: 'Supported: Ruby, Sapphire, Emerald, FireRed, LeafGreen (all languages) and ROM hacks with the same layout. The ROM stays on your computer; only the data read from it is saved.',
    saveHelp: 'Best use the .sav file (in-game save): save in the game, then it is next to the ROM. Savestates (.ss1, .sgm …) work too, depending on the emulator.',
    errRom: 'This file could not be read as a Gen 3 ROM ({0}).', errSave: 'No Pokémon were found in this file.',
    romWarn: 'Note: not everything was found ({0}). Probably a ROM hack with a changed layout.',
    mine: 'Your Pokémon', team: 'Party', box: 'Box', hideDead: 'Hide dead', dead: 'Dead', markDead: 'Mark as dead', unmarkDead: 'Alive again',
    trainers: 'Battles', search: 'Search trainers …', bosses: 'Important only', all: 'All', lv: 'Lv. {0}', lvRange: 'Lv. {0}–{1}', double: 'Double',
    pickMine: 'Pick one of your Pokémon on the left.', pickFoe: 'Pick a battle on the right and then one of the opponent’s Pokémon.',
    needRom: 'Load the ROM of your game first: trainers, stats and moves come from it.',
    needSave: 'Load your save so your party and box appear.',
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
    hits2: '×2 hits', priority: 'Priority {0}', removeRom: 'Remove ROM data', removeSave: 'Remove save', class: 'Class {0}', box_n: 'Box {0}',
    foeTeam: 'Opponent’s team', vs: 'vs', reset: 'Reset', items: 'Items: {0}', perHit: 'per hit', currentHp: 'current HP', drop: 'Drop the file here'
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
  function nat(sp) { return rom && rom.species[sp] ? rom.species[sp].nat : G.defaultNat(sp); }
  function spName(sp) { var n = nat(sp); return n && window.CCNuz ? window.CCNuz.monName(n) : (rom && rom.species[sp] ? titleCase(rom.species[sp].name) : '#' + sp); }
  function moveName(id) { return NAMES.moves[A.LANG][id] || NAMES.moves.en[id] || (de ? 'Attacke ' : 'Move ') + id; }
  function abilityName(id) { return NAMES.abilities[A.LANG][id] || NAMES.abilities.en[id] || '—'; }
  function itemName(id) { return id && rom && rom.items[id] ? titleCase(rom.items[id].name) : ''; }
  function typeName(ti) { return A.nType(G.TYPES[ti] || '???'); }
  function typeBadge(ti) { return G.TYPES[ti] === '???' ? el('span', { class: 'type-badge', text: '???' }) : A.typeBadge(G.TYPES[ti]); }
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
  function loadRom(buf) {
    var r;
    try { r = G.parseRom(buf); } catch (e) { A.showModal(t('loadRom'), t('errRom', e && e.message ? e.message : e)); return; }
    r.v = 1;
    rom = r;
    try { A.save('cc_nuz_rom', r); } catch (e) { /* too big: only kept for this session */ }
    if (r.warnings.length) A.showModal(t('loadRom'), t('romWarn', r.warnings.join(', ')));
    else A.toast(t('romInfo', gameLabel(), r.trainers.length));
    st.trainer = null; persist(); rerender();
  }
  function loadSave(buf) {
    G.parseSave(buf).then(function (s) {
      if (!s || (!s.party.length && !s.boxes.length)) { A.showModal(t('loadSave'), t('errSave')); return; }
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
    return G.fromSave(rom, s);
  }
  function curTrainer() { if (!rom || st.trainer == null) return null; var r = null; rom.trainers.some(function (x) { if (x.id === st.trainer) { r = x; return true; } return false; }); return r; }
  var partyCache = { id: null, list: null };
  function foeParty() {
    var tr = curTrainer();
    if (!tr) return [];
    if (partyCache.id !== tr.id) partyCache = { id: tr.id, list: G.trainerParty(rom, tr) };
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
      if (f) readFile(f, /\.(gba|bin)$/i.test(f.name) || f.size >= 0x200000 ? 'rom' : 'save');
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
    bar.appendChild(slot(t('loadRom'), rom ? t('romInfo', gameLabel(), rom.trainers.length) : t('noRom'), !!rom, '.gba,.bin,.agb', 'rom', t('romHelp'), 'removeRom'));
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
    fl.appendChild(sel(t('badges'), [0, 1, 2, 3, 4, 5, 6, 7, 8].map(function (n) { return [n, String(n)]; }), f.badges, function (v) { f.badges = +v; }, t('badgesT')));
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
    if (!save) list.appendChild(el('div', { class: 'hint nc-empty', text: t('needSave') + '\n\n' + t('saveHelp') }));
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
        var lv = m.level || (sp ? G.levelFromExp(sp.growth, m.exp) : '?');
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
      if (!rom) { list.appendChild(el('div', { class: 'hint nc-empty', text: t('needRom') + '\n\n' + t('romHelp') })); return; }
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
    var sm = G.speedOf(rom, me, f), sf = G.speedOf(rom, foe, f);
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
    info.appendChild(el('div', null, '<b>' + A.esc(t('nature')) + '</b> ' + A.esc(natureName(m.nature))));
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
      var r = G.calc(rom, att, def, id, f);
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
        var ko = G.koChance(r, def.hp);
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

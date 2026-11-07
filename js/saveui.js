// Save File Editor – Oberfläche (#saveView): Spielstand laden, Team und Boxen ansehen, Pokémon und Trainerdaten bearbeiten, speichern.
// Kern und Formate: js/savedit.js (nach PKHeX). Namenslisten: data/pk_text.js, Basiswerte: data/pk_personal.js
(function () {
  'use strict';
  var A = window.CC, S = window.CCSave, T0 = window.PKTEXT, P = window.PKPERSONAL;
  if (!A || !S || !T0 || !P) return;
  var el = A.el, esc = A.esc, de = A.LANG === 'de', T = de ? T0.de : T0.en;
  var L = de ? {
    title: 'Save File Editor', sub: 'Bearbeite Spielstände: Team, Boxen, Pokémon (Werte, Attacken, Item, Wesen, Shiny) und Trainerdaten. Die Originaldatei bleibt unverändert, du speicherst eine neue Datei. Unterstützt: Generation 3 und 4 (.sav, .dsv).',
    pick: 'Spielstand wählen …', drop: 'oder eine .sav- / .dsv-Datei hierher ziehen', bad: 'Diese Datei wird nicht erkannt. Unterstützt werden Spielstände der Generation 3 (GBA) und 4 (DS).',
    game: 'Erkannt:', save: 'Spielstand speichern', saved: 'Gespeichert. Mach vorher immer eine Sicherungskopie deines echten Spielstands.', trainer: 'Trainer', party: 'Team', box: 'Box',
    name: 'Name', money: 'Geld', gender: 'Geschlecht', male: 'Männlich', female: 'Weiblich', time: 'Spielzeit (Std : Min)', empty: 'Leer', apply: 'Übernehmen', remove: 'Entfernen', create: 'Neues Pokémon',
    species: 'Pokémon', nick: 'Spitzname', level: 'Level', exp: 'Erfahrung', item: 'Item', none: '–', nature: 'Wesen', shiny: 'Shiny', friendship: 'Freundschaft', egg: 'Ei', ability: 'Fähigkeit',
    slot2: 'Zweite Fähigkeit', moves: 'Attacken', pp: 'AP', ppups: 'AP-Ups', ev: 'EP', iv: 'IP', stats: 'Werte', ot: 'Ursprungstrainer', stat: ['KP', 'Angr', 'Vert', 'Init', 'SpA', 'SpV'],
    edit: 'Pokémon bearbeiten', ok: 'Pokémon übernommen (noch nicht gespeichert).', evsum: 'EP-Summe', delconfirm: 'Dieses Pokémon entfernen?', all: 'Maximal', self: 'Eigenes Team'
  } : {
    title: 'Save File Editor', sub: 'Edit save files: party, boxes, Pokémon (stats, moves, item, nature, shiny) and trainer data. The original file stays untouched, you save a new file. Supported: generation 3 and 4 (.sav, .dsv).',
    pick: 'Choose save file …', drop: 'or drag a .sav / .dsv file here', bad: 'This file is not recognized. Generation 3 (GBA) and 4 (DS) saves are supported.',
    game: 'Detected:', save: 'Save file', saved: 'Saved. Always keep a backup of your real save first.', trainer: 'Trainer', party: 'Party', box: 'Box',
    name: 'Name', money: 'Money', gender: 'Gender', male: 'Male', female: 'Female', time: 'Play time (h : min)', empty: 'Empty', apply: 'Apply', remove: 'Remove', create: 'New Pokémon',
    species: 'Pokémon', nick: 'Nickname', level: 'Level', exp: 'Experience', item: 'Item', none: '–', nature: 'Nature', shiny: 'Shiny', friendship: 'Friendship', egg: 'Egg', ability: 'Ability',
    slot2: 'Second ability', moves: 'Moves', pp: 'PP', ppups: 'PP Ups', ev: 'EVs', iv: 'IVs', stats: 'Stats', ot: 'Original trainer', stat: ['HP', 'Atk', 'Def', 'Spe', 'SpA', 'SpD'],
    edit: 'Edit Pokémon', ok: 'Pokémon applied (not saved yet).', evsum: 'EV total', delconfirm: 'Remove this Pokémon?', all: 'Max', self: 'Own party'
  };

  var st = { sv: null, name: '', orig: null, base: 0, err: '', msg: '', box: 0, sel: null, mon: null, dirty: false };
  var root;

  function download(name, bytes) {
    var a = el('a', { href: URL.createObjectURL(new Blob([bytes], { type: 'application/octet-stream' })), download: name });
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 3000);
  }
  function nm(list, i) { return (list && list[i]) || ''; }
  function speciesName(nat) { return nm(T.species, nat); }
  function itemList() { return st.sv.gen === 3 ? T.items3 : T.items; }
  function maxMove() { return st.sv.gen === 3 ? 354 : 467; }
  function maxItem() { return st.sv.gen === 3 ? 376 : 536; }
  function maxAbility() { return st.sv.gen === 3 ? 76 : 123; }
  function pers(species) { var e = P['g' + st.sv.gen][st.sv.natOf(species)]; return e || [50, 50, 50, 50, 50, 50, 0, 127, 0, 0]; }
  function isShiny(d) { var F = st.sv.fmt, p = F.get(d, 'pid'); return ((F.get(d, 'tid') ^ F.get(d, 'sid') ^ (p >>> 16) ^ (p & 0xFFFF)) >>> 0) < 8; }
  function genderOf(d, species) { var r = pers(species)[7], pid = st.sv.fmt.get(d, 'pid'); return r === 255 ? 2 : r === 254 ? 1 : r === 0 ? 0 : ((pid & 0xFF) < r ? 1 : 0); }
  // neue PID mit gewünschtem Wesen / Shiny-Status (Geschlecht und Fähigkeits-Slot bleiben erhalten)
  function newPid(d, nature, shiny) {
    var F = st.sv.fmt, old = F.get(d, 'pid'), tid = F.get(d, 'tid'), sid = F.get(d, 'sid'), low = old & 0xFF, bit = old & 1;
    for (var i = 0; i < 600000; i++) {
      var p = ((Math.random() * 0x10000) << 16 | (Math.random() * 0x10000)) >>> 0;
      p = ((p & 0xFFFFFF00) | low) >>> 0;
      if (p % 25 !== nature) continue;
      var sh = ((tid ^ sid ^ (p >>> 16) ^ (p & 0xFFFF)) >>> 0) < 8;
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
    if (sv.gen === 4) { d[64] = (d[64] & ~6) | ((g === 255 ? 2 : g === 254 ? 1 : g === 0 ? 0 : ((pid & 0xFF) < g ? 1 : 0)) << 1); F.set(d, 'ability', pers(species)[8 + (pid & 1)] || pers(species)[8]); }
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

  function monEditor() {
    var sv = st.sv, F = sv.fmt, d = st.mon, box = el('div', { class: 'sv-ed' }), party = st.sel.kind === 'party';
    box.appendChild(el('h3', { text: L.edit }));
    if (!d) {
      var c = el('button', { class: 'primary-btn', text: L.create }); c.onclick = function () { st.mon = blank(sv.speciesFromNat(1), party); render(); };
      box.appendChild(c); return box;
    }
    function changed() { render(); }
    var sp = F.get(d, 'species'), nat = sv.natOf(sp), g = pers(sp);
    // Art
    var natOpts = ''; for (var n = 1; n <= sv.maxSpecies; n++) natOpts += '<option value="' + n + '"' + (n === nat ? ' selected' : '') + '>#' + n + ' ' + esc(speciesName(n)) + '</option>';
    var selSp = select2(natOpts, function (v) {
      var old = pers(sp); F.set(d, 'species', sv.speciesFromNat(v));
      if (!F.get(d, 'nicknamed') && sv.gen === 4) F.set(d, 'nick', speciesName(v));
      if (sv.gen === 3 && F.get(d, 'nick') === speciesName(nat).toUpperCase()) F.set(d, 'nick', speciesName(v).toUpperCase());
      if (sv.gen === 4) F.set(d, 'ability', pers(F.get(d, 'species'))[8 + (F.get(d, 'pid') & 1)] || 0);
      if (party) refreshParty(d); changed();
    });
    box.appendChild(field(L.species, selSp));
    var nk = el('input', { type: 'text', class: 'sv-txt', maxlength: sv.gen === 3 ? 10 : 10 }); nk.value = F.get(d, 'nick');
    nk.onchange = function () { F.set(d, 'nick', nk.value); if (sv.gen === 4) F.set(d, 'nicknamed', 1); };
    box.appendChild(field(L.nick, nk));
    var lvl = S.levelFor(g[6], F.get(d, 'exp'));
    var row = el('div', { class: 'sv-row' });
    row.appendChild(field(L.level, num(lvl, 1, 100, function (v) { F.set(d, 'exp', S.expFor(g[6], v)); if (party) refreshParty(d); changed(); }), 'sm'));
    row.appendChild(field(L.exp, num(F.get(d, 'exp'), 0, 2000000, function (v) { F.set(d, 'exp', v); if (party) refreshParty(d); changed(); }), 'sm'));
    row.appendChild(field(L.friendship, num(F.get(d, 'friendship'), 0, 255, function (v) { F.set(d, 'friendship', v); }), 'sm'));
    box.appendChild(row);
    box.appendChild(field(L.item, select2(opts(itemList(), maxItem(), F.get(d, 'item'), L.none), function (v) { F.set(d, 'item', v); })));
    // Wesen, Shiny, Ei
    var natureOpts = ''; for (var k = 0; k < 25; k++) natureOpts += '<option value="' + k + '"' + (k === F.nature(d) ? ' selected' : '') + '>' + esc(T.natures[k]) + '</option>';
    var row2 = el('div', { class: 'sv-row' });
    row2.appendChild(field(L.nature, select2(natureOpts, function (v) { F.set(d, 'pid', newPid(d, v, isShiny(d))); if (party) refreshParty(d); changed(); })));
    var sh = el('input', { type: 'checkbox' }); sh.checked = isShiny(d);
    sh.onchange = function () { F.set(d, 'pid', newPid(d, F.nature(d), sh.checked)); changed(); };
    var shl = el('label', { class: 'sv-check' }); shl.appendChild(sh); shl.appendChild(el('span', { text: L.shiny })); row2.appendChild(shl);
    var eg = el('input', { type: 'checkbox' }); eg.checked = !!F.get(d, 'egg'); eg.onchange = function () { F.set(d, 'egg', eg.checked ? 1 : 0); };
    var egl = el('label', { class: 'sv-check' }); egl.appendChild(eg); egl.appendChild(el('span', { text: L.egg })); row2.appendChild(egl);
    box.appendChild(row2);
    // Fähigkeit
    if (sv.gen === 3) {
      var a1 = nm(T.abilities, g[8]), a2 = nm(T.abilities, g[9]), slot = F.get(d, 'abilitySlot');
      var ab = select2('<option value="0"' + (!slot ? ' selected' : '') + '>' + esc(a1) + '</option>' + (g[9] && g[9] !== g[8] ? '<option value="1"' + (slot ? ' selected' : '') + '>' + esc(a2) + '</option>' : ''), function (v) { F.set(d, 'abilitySlot', v); });
      box.appendChild(field(L.ability, ab));
    } else box.appendChild(field(L.ability, select2(opts(T.abilities, maxAbility(), F.get(d, 'ability')), function (v) { F.set(d, 'ability', v); })));
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
    box.appendChild(mh); box.appendChild(mt);
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
    tbl.appendChild(rEv); tbl.appendChild(rIv); tbl.appendChild(rSt); box.appendChild(tbl);
    box.appendChild(el('div', { class: 'hint', text: L.evsum + ': ' + evsum + ' / 510' }));
    // Ursprungstrainer
    var ot = el('input', { type: 'text', class: 'sv-txt' }); ot.value = F.get(d, 'ot'); ot.onchange = function () { F.set(d, 'ot', ot.value); };
    var row3 = el('div', { class: 'sv-row' });
    row3.appendChild(field(L.ot, ot));
    row3.appendChild(field('TID', num(F.get(d, 'tid'), 0, 65535, function (v) { F.set(d, 'tid', v); changed(); }), 'sm'));
    row3.appendChild(field('SID', num(F.get(d, 'sid'), 0, 65535, function (v) { F.set(d, 'sid', v); changed(); }), 'sm'));
    box.appendChild(row3);
    var bar = el('div', { class: 'sv-bar' });
    var ap = el('button', { class: 'primary-btn', text: L.apply }); ap.onclick = apply; bar.appendChild(ap);
    var rm = el('button', { class: 'sv-del', text: L.remove }); rm.onclick = remove; bar.appendChild(rm);
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
  function trainerPanel() {
    var sv = st.sv, t = sv.getTrainer(), box = el('div', { class: 'sv-tr' });
    box.appendChild(el('h3', { text: L.trainer }));
    var name = el('input', { type: 'text', class: 'sv-txt', maxlength: 7 }); name.value = t.name;
    function save() { sv.setTrainer(t); st.dirty = true; }
    name.onchange = function () { t.name = name.value; save(); };
    box.appendChild(field(L.name, name));
    var row = el('div', { class: 'sv-row' });
    row.appendChild(field('TID', num(t.tid, 0, 65535, function (v) { t.tid = v; save(); }), 'sm'));
    row.appendChild(field('SID', num(t.sid, 0, 65535, function (v) { t.sid = v; save(); }), 'sm'));
    row.appendChild(field(L.money, num(t.money, 0, 999999, function (v) { t.money = v; save(); }), 'sm'));
    box.appendChild(row);
    var gs = select2('<option value="0"' + (!t.gender ? ' selected' : '') + '>' + esc(L.male) + '</option><option value="1"' + (t.gender ? ' selected' : '') + '>' + esc(L.female) + '</option>', function (v) { t.gender = v; save(); });
    box.appendChild(field(L.gender, gs));
    return box;
  }

  function render() {
    root = document.getElementById('saveView'); if (!root) return;
    root.innerHTML = '';
    var box = el('div', { class: 'panel sv-box' });
    box.appendChild(el('h2', { text: L.title }));
    var body = el('div', { class: 'rd-body' });
    body.appendChild(el('p', { class: 'hint', text: L.sub }));
    var inp = el('input', { type: 'file', accept: '.sav,.dsv,.srm,.bin', style: 'display:none' });
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
      body.appendChild(el('div', { class: 'rd-game', html: '<b>' + esc(L.game) + '</b> ' + esc((de ? sv.gameName : sv.gameNameEn)) + ' (Gen ' + sv.gen + ') – ' + esc(st.name) }));
      var sb = el('button', { class: 'primary-btn rd-go', text: L.save }); sb.onclick = function () {
        var out = new Uint8Array(st.orig); out.set(sv.finish(), st.base);
        var base = st.name.replace(/\.[^.]*$/, ''), ext = (st.name.split('.').pop() || 'sav');
        download(base + ' (edited).' + ext, out); st.msg = L.saved; st.dirty = false; render();
      };
      body.appendChild(sb);
      if (st.msg) body.appendChild(el('div', { class: 'rd-ok', text: st.msg }));
      var cols = el('div', { class: 'sv-cols' });
      var left = el('div', { class: 'sv-left' });
      left.appendChild(trainerPanel());
      var pt = el('div', { class: 'sv-sec' }); pt.appendChild(el('h3', { text: L.party }));
      var pg = el('div', { class: 'sv-grid sv-party' });
      partyList().forEach(function (d, i) { pg.appendChild(slotBtn(d, st.sel && st.sel.kind === 'party' && st.sel.slot === i, function () { select('party', 0, i); })); });
      pt.appendChild(pg); left.appendChild(pt);
      var bt = el('div', { class: 'sv-sec' }); var h = el('h3'); h.appendChild(el('span', { text: L.box + ' ' }));
      var bsel = el('select', { class: 'sv-sel sv-boxsel' }); for (var b = 0; b < sv.boxCount; b++) { var o = el('option', { value: b, text: (b + 1) + ': ' + (sv.getBoxName(b) || ('Box ' + (b + 1))) }); if (b === st.box) o.selected = true; bsel.appendChild(o); }
      bsel.onchange = function () { st.box = +bsel.value; st.sel = null; st.mon = null; render(); };
      h.appendChild(bsel); bt.appendChild(h);
      var bg = el('div', { class: 'sv-grid sv-boxgrid' });
      for (var s = 0; s < sv.slotsPerBox; s++) (function (s) { bg.appendChild(slotBtn(sv.getBoxMon(st.box, s), st.sel && st.sel.kind === 'box' && st.sel.box === st.box && st.sel.slot === s, function () { select('box', st.box, s); })); })(s);
      bt.appendChild(bg); left.appendChild(bt);
      cols.appendChild(left);
      var right = el('div', { class: 'sv-right' });
      if (st.sel) right.appendChild(monEditor());
      cols.appendChild(right);
      body.appendChild(cols);
    }
    box.appendChild(body); root.appendChild(box);
  }
  window.CCSaveUI = { render: render };
})();

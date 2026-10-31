// Teambuilder: Teams aus bis zu sechs Pokémon zusammenstellen, Sets bearbeiten, Typ-Abdeckung prüfen und
// das Team in eine Seite des Damage Calc übernehmen. Nutzt die Daten und Helfer aus js/app.js (window.CC).
// Gespeichert im Browser unter localStorage "cc_builder": { teams: [{ id, name, mons: [{ species, setName, set }] }], cur }.
(function () {
  'use strict';
  var A = window.CC;
  if (!A) return;
  var C = A.C, T = A.T, el = A.el, DEX = A.DEX, MOVES = A.MOVES;
  var de = A.LANG === 'de';

  // ---------------- storage ----------------
  var store = A.load('cc_builder', null);
  function newId() { return 't' + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36); }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  if (!store || !Array.isArray(store.teams)) {
    store = { teams: [], cur: null };
    // first start: take over the own team of the damage calc, if there is one
    var calcTeams = A.load('cc_teams', [[], []]);
    var mine = (calcTeams[0] || []).filter(function (m) { return m && DEX[m.species]; });
    var t0 = { id: newId(), name: mine.length ? (de ? 'Mein Team' : 'My team') : T('tbDefaultName', 1), mons: clone(mine) };
    store.teams.push(t0); store.cur = t0.id;
    A.save('cc_builder', store);
  }
  function persist() { A.save('cc_builder', store); }
  function team() {
    var t = null;
    store.teams.some(function (x) { if (x.id === store.cur) { t = x; return true; } return false; });
    if (!t) { t = store.teams[0]; if (!t) { t = { id: newId(), name: T('tbDefaultName', 1), mons: [] }; store.teams.push(t); } store.cur = t.id; }
    return t;
  }
  var sel = 0; // selected slot (0-5); equal to mons.length = "add a new Pokémon"
  var tab = 'edit'; // lower panel: 'edit' (Pokémon editor) or 'cover' (type coverage)

  // ---------------- helpers ----------------
  // ---------- forms: battle forms (Mega, Blade …), other formes/regional forms, cosmetic variants, gender ----------
  var FD = window.FORM_DATA || {};
  var BATTLE_RE = /-(Blade|Hero|Hangry|Busted|Zen|School|Complete|Noice|Pirouette|Sunshine|Crowned|Primal|Ultra)$/;
  function formData(name) {
    var parts = String(name || '').replace(/^Mega /, '').split('-');
    while (parts.length) { var d = FD[A.idOf(parts.join('-'))]; if (d) return d; parts.pop(); }
    return {};
  }
  function isBattleOnly(f) { return f.indexOf('Mega ') === 0 || !!(FD[A.idOf(f)] || {}).bo || BATTLE_RE.test(f); }
  // formes with own stats that are chosen before the battle (Lycanroc-Dusk, Toxtricity-Low-Key …)
  function outOfBattleFormes(species) { return A.formesOf(species).filter(function (f) { return !isBattleOnly(f); }); }
  function baseForme(m) {
    var ok = outOfBattleFormes(m.species);
    return m.set.forme && DEX[m.set.forme] && ok.indexOf(m.set.forme) !== -1 ? m.set.forme : (ok[0] || m.species);
  }
  // forms the Pokémon can change into during battle: Mega (with its stone) and battle-only formes
  function battleForms(m) {
    var list = [baseForme(m)];
    A.formesOf(m.species).forEach(function (f) { if (isBattleOnly(f) && list.indexOf(f) === -1) list.push(f); });
    return list;
  }
  function megaStoneFor(m, mega) {
    var lk = window.MEGA_STONE_USER_LOOKUP || {}, hit = null;
    Object.keys(lk).some(function (stone) { if (A.megaFormeFor(m.species, stone) === mega) { hit = stone; return true; } return false; });
    return hit;
  }
  // the form currently shown in the editor (form change button); default: Mega when the stone is held
  var viewMap = new WeakMap();
  function viewForm(m) {
    var list = battleForms(m), v = viewMap.get(m);
    if (v && list.indexOf(v) !== -1 && (v.indexOf('Mega ') !== 0 || A.megaFormeFor(m.species, m.set.item) === v)) return v;
    var mega = A.megaFormeFor(m.species, m.set.item);
    return mega || list[0];
  }
  function battleForme(m) { return A.megaFormeFor(m.species, m.set.item) || baseForme(m); }
  function typesOf(forme) { var d = DEX[forme] || {}; return [d.t1, d.t2].filter(function (t, i, a) { return t && a.indexOf(t) === i; }); }
  // sprite name: Mega/battle form, otherwise the chosen cosmetic look
  function spriteOf(m, form) {
    var f = form || battleForme(m);
    return f !== baseForme(m) ? f : (m.set.look || f);
  }
  // Pokémon of the same family that are separate entries: regional forms, Rotom appliances, Meowstic-F …
  function groupOf(name) { var d = formData(name); return d.b || String(name).replace(/-.*$/, ''); }
  var groupCache = null;
  function familyOf(species) {
    if (!groupCache) {
      groupCache = {};
      A.SPECIES.forEach(function (s) { var g = groupOf(s); (groupCache[g] = groupCache[g] || []).push(s); });
    }
    return groupCache[groupOf(species)] || [species];
  }
  function variantsOf(m) {
    var d = FD[A.idOf(groupOf(m.species))] || formData(m.species);
    if (!d.v) return null;
    var own = (d.v || []).filter(function (v) { return !DEX[v]; });
    return own.length ? { base: d.bf || '', list: own } : null;
  }
  // gender rules: fixed (M / F), genderless (N) or a ratio (share of males)
  function genderInfo(m) {
    var d = formData(baseForme(m));
    if (d.g) return { fixed: d.g };
    return { ratio: d.r != null ? d.r : 0.5 };
  }
  function fixGender(m) {
    var g = genderInfo(m);
    if (g.fixed) m.set.gender = g.fixed === 'N' ? '' : g.fixed;
    else if (g.ratio === 0 && m.set.gender === 'M') m.set.gender = 'F';
    else if (g.ratio === 1 && m.set.gender === 'F') m.set.gender = 'M';
  }
  var VAR_DE = {
    Meadow: 'Blumenmeer', Archipelago: 'Archipel', Continental: 'Kontinental', Elegant: 'Prunk', Garden: 'Ziergarten', 'High Plains': 'Hochland',
    'Icy Snow': 'Eisschnee', Jungle: 'Dschungel', Marine: 'Aquamarin', Modern: 'Innovation', Monsoon: 'Monsun', Ocean: 'Ozean', Polar: 'Polar',
    River: 'Flussdelta', Sandstorm: 'Sand', Savanna: 'Savanne', Sun: 'Sonnenschein', Tundra: 'Tundra', Fancy: 'Fantasie', Pokeball: 'Pokéball',
    Red: 'Rot', Blue: 'Blau', Orange: 'Orange', White: 'Weiß', Yellow: 'Gelb', Green: 'Grün', Violet: 'Violett', Indigo: 'Indigo',
    West: 'Westliches Meer', East: 'Östliches Meer', Curly: 'Gebogen', Droopy: 'Hängend', Stretchy: 'Gestreckt',
    Unremarkable: 'Imitationsform', Masterpiece: 'Kostbarkeitsform', Counterfeit: 'Imitationsform', Artisan: 'Kostbarkeitsform',
    'Two-Segment': 'Zweisegmentform', 'Three-Segment': 'Dreisegmentform', Family: 'Dreierfamilie', Four: 'Viererfamilie',
    Spring: 'Frühling', Summer: 'Sommer', Autumn: 'Herbst', Winter: 'Winter', Plant: 'Pflanzenumhang', Sandy: 'Sandumhang', Trash: 'Lumpenumhang',
    'Vanilla-Cream': 'Vanille-Creme', Cream: 'Creme', Swirl: 'Mix', Ruby: 'Rubin', Matcha: 'Matcha', Mint: 'Minz', Lemon: 'Zitronen',
    Salted: 'Salz', Caramel: 'Karamell', Rainbow: 'Regenbogen', Natural: 'Zottelform', Heart: 'Herzchenschnitt', Star: 'Sternchenschnitt',
    Diamond: 'Diamantenschnitt', Debutante: 'Fräuleinschnitt', Matron: 'Damenschnitt', Dandy: 'Kavaliersschnitt', 'La Reine': 'Königinnenschnitt',
    Kabuki: 'Kabuki-Schnitt', Pharaoh: 'Herrscherschnitt'
  };
  function nVariant(suffix) {
    if (!de || !suffix) return suffix;
    if (VAR_DE[suffix]) return VAR_DE[suffix];
    return suffix.split('-').map(function (p) { return VAR_DE[p] || A.FORM_DE[p] || p; }).join('-');
  }
  // short label of a forme for buttons: "Mega", "Mega X", "Klinge", "Alola" …
  function formLabel(f, m) {
    var mm = /^Mega (.+?)(?: ([XYZ]))?$/.exec(f);
    if (mm) return 'Mega' + (mm[2] ? ' ' + mm[2] : '');
    if (f === m.species || f === A.formesOf(m.species)[0] && f.indexOf('-') === -1) return de ? 'Normal' : 'Base';
    var i = f.indexOf('-');
    return i > 0 ? A.nSpecies(f).slice(A.nSpecies(f).indexOf('-') + 1) : (de ? 'Normal' : 'Base');
  }
  // animated 3D model (Showdown "ani"), falling back to the pixel sprite; female and shiny variants where they exist.
  // The setting "Pixel-Sprite" skips the 3D models.
  function bigSprite(name, set, img) {
    var still = A.spriteUrl(name), shiny = !!set.shiny;
    var ani = still.replace('/gen5/', shiny ? '/ani-shiny/' : '/ani/').replace(/\.png$/, '.gif');
    var px = shiny ? still.replace('/gen5/', '/gen5-shiny/') : still;
    var use3d = !A.setting || A.setting('model') !== 'sprite';
    var chain = [];
    if (use3d) {
      if (set.gender === 'F') chain.push(ani.replace(/\.gif$/, '-f.gif'));
      chain.push(ani);
    }
    if (set.gender === 'F') chain.push(px.replace(/\.png$/, '-f.png'));
    chain.push(px);
    if (shiny && px !== still) chain.push(still);
    var i = 0;
    img.onerror = function () { i++; if (i < chain.length) { img.classList.toggle('still', /\.png$/.test(chain[i])); img.src = chain[i]; } };
    img.classList.toggle('still', /\.png$/.test(chain[0]));
    img.src = chain[0];
  }
  function spTotal(set) { return C.STAT_KEYS.reduce(function (n, k) { return n + ((set.sps && set.sps[k]) || 0); }, 0); }
  var CAT_DE = { Physical: 'Phys.', Special: 'Spez.', Status: 'Status' }, CAT_EN = { Physical: 'Phys.', Special: 'Spec.', Status: 'Status' };
  function nCat(c) { return (de ? CAT_DE : CAT_EN)[c] || c || ''; }
  function optionsHtml(list, kind, cur) {
    var h = list.map(function (v) { return '<option value="' + A.esc(v) + '">' + A.esc(A.kindLabel(kind, v)) + '</option>'; }).join('');
    if (cur && list.indexOf(cur) === -1) h += '<option value="' + A.esc(cur) + '" title="' + A.esc(T('notLegal')) + '">' + A.esc(A.kindLabel(kind, cur)) + ' ⚠</option>';
    return h;
  }
  function presetsFor(species) {
    var g = null;
    A.speciesGroups().some(function (x) { if (x.species === species) { g = x; return true; } return false; });
    return g ? g.sets : [];
  }
  function memberFor(species) {
    var first = presetsFor(species).filter(function (e) { return e.set; })[0];
    var set = first ? clone(first.set) : A.defaultSet(species);
    set.species = species;
    set.sps = set.sps || { hp: 0, at: 0, df: 0, sa: 0, sd: 0, sp: 0 };
    set.moves = (set.moves || []).filter(function (mv) { return MOVES[mv] && mv !== '(No Move)'; }).slice(0, 4);
    return { species: species, setName: first ? first.name : 'Set', set: set };
  }

  // ---------------- view ----------------
  var root = null, R = {};
  function render() {
    root = document.getElementById('builderView');
    if (!root) return;
    var t = team();
    if (sel > t.mons.length || sel > 5) sel = Math.min(t.mons.length, 5);
    root.innerHTML =
      '<div class="tb">' +
      '<aside class="panel tb-side">' +
      '<h2 class="field-head"><span>' + T('tbTeams') + '</span><button class="tbtn" id="tbNew">' + T('tbNew') + '</button></h2>' +
      '<div class="tb-list" id="tbList"></div>' +
      '<div class="tb-side-foot"><button class="tbtn" id="tbImport">' + T('tbImport') + '</button></div>' +
      '</aside>' +
      '<section class="tb-main">' +
      '<div class="tb-head">' +
      '<input id="tbName" class="tb-name" spellcheck="false" placeholder="' + A.esc(T('tbName')) + '">' +
      '<span class="tb-count" id="tbCount"></span>' +
      '<span class="tb-acts">' +
      '<button class="tbtn" id="tbExport">' + T('tbExport') + '</button>' +
      '<button class="tbtn" id="tbDup">' + T('tbDuplicate') + '</button>' +
      '<button class="tbtn danger" id="tbDel">' + T('tbDelete') + '</button>' +
      '<span class="tb-sep"></span>' +
      '<button class="tbtn to-you" id="tbToYou">' + T('tbToCalcYou') + '</button>' +
      '<button class="tbtn to-foe" id="tbToFoe">' + T('tbToCalcFoe') + '</button>' +
      '</span></div>' +
      '<div class="tb-slots" id="tbSlots"></div>' +
      '<div class="panel tb-work tab-' + tab + '" id="tbWork">' +
      '<div class="tb-tabs"><button data-tab="edit">' + T('tbTabMon') + '</button><button data-tab="cover">' + T('tbWeak') + '</button></div>' +
      '<div class="tb-edit" id="tbEdit"></div>' +
      '<div class="tb-cover" id="tbCover"></div>' +
      '</div>' +
      '</section></div>';
    R = {
      list: root.querySelector('#tbList'), slots: root.querySelector('#tbSlots'), edit: root.querySelector('#tbEdit'),
      cover: root.querySelector('#tbCover'), name: root.querySelector('#tbName'), count: root.querySelector('#tbCount')
    };
    R.name.value = t.name;
    var work = root.querySelector('#tbWork');
    work.querySelectorAll('.tb-tabs button').forEach(function (b) {
      b.classList.toggle('on', b.dataset.tab === tab);
      b.addEventListener('click', function () {
        tab = b.dataset.tab;
        work.className = 'panel tb-work tab-' + tab;
        work.querySelectorAll('.tb-tabs button').forEach(function (x) { x.classList.toggle('on', x === b); });
      });
    });
    R.name.addEventListener('input', function () { team().name = R.name.value; persist(); renderList(); });
    R.name.addEventListener('blur', function () { if (!team().name.trim()) { team().name = T('tbDefaultName', store.teams.indexOf(team()) + 1); R.name.value = team().name; persist(); renderList(); } });
    root.querySelector('#tbNew').addEventListener('click', function () {
      var nt = { id: newId(), name: T('tbDefaultName', store.teams.length + 1), mons: [] };
      store.teams.push(nt); store.cur = nt.id; sel = 0; persist(); render();
      setTimeout(function () { var i = root.querySelector('.tb-pick input'); if (i) i.focus(); }, 30);
    });
    root.querySelector('#tbImport').addEventListener('click', openImport);
    root.querySelector('#tbExport').addEventListener('click', function () {
      var tm = team();
      A.showModal(T('tbExportTitle') + ': ' + tm.name, tm.mons.map(function (m) { return A.exportSet(m.set, m.setName, m.species); }).join('\n\n'));
    });
    root.querySelector('#tbDup').addEventListener('click', function () {
      var tm = team(), nt = { id: newId(), name: T('tbCopyName', tm.name), mons: clone(tm.mons) };
      store.teams.splice(store.teams.indexOf(tm) + 1, 0, nt); store.cur = nt.id; persist(); render();
    });
    root.querySelector('#tbDel').addEventListener('click', function () {
      var tm = team();
      if (!confirm(T('tbDeleteConfirm', tm.name))) return;
      var i = store.teams.indexOf(tm);
      store.teams.splice(i, 1);
      if (!store.teams.length) store.teams.push({ id: newId(), name: T('tbDefaultName', 1), mons: [] });
      store.cur = store.teams[Math.max(0, i - 1)].id; sel = 0; persist(); render();
    });
    [['#tbToYou', 0, 'tbSentYou'], ['#tbToFoe', 1, 'tbSentFoe']].forEach(function (b) {
      root.querySelector(b[0]).addEventListener('click', function () {
        var tm = team();
        if (!tm.mons.length) { A.toast(T('tbEmptyTeam')); return; }
        A.setCalcTeam(b[1], tm.mons);
        A.showView('calc');
        A.toast(T(b[2]));
      });
    });
    renderList(); renderSlots(); renderEditor(); renderCover();
  }

  function renderList() {
    R.list.innerHTML = '';
    store.teams.forEach(function (tm) {
      var row = el('div', { class: 'tb-team' + (tm.id === store.cur ? ' on' : '') });
      var top = el('div', { class: 'tb-team-top' });
      top.appendChild(el('span', { class: 'tb-team-name', text: tm.name || '–' }));
      top.appendChild(el('span', { class: 'tb-team-n', text: T('tbMonCount', tm.mons.length) }));
      row.appendChild(top);
      var mini = el('div', { class: 'tb-team-mons' });
      for (var i = 0; i < 6; i++) {
        var c = el('span', { class: 'tb-mini' + (tm.mons[i] ? '' : ' empty') });
        if (tm.mons[i]) c.appendChild(A.spriteFit(spriteOf(tm.mons[i]), tm.mons[i].set.shiny));
        mini.appendChild(c);
      }
      row.appendChild(mini);
      row.addEventListener('click', function () { if (store.cur !== tm.id) { store.cur = tm.id; sel = 0; persist(); render(); } });
      R.list.appendChild(row);
    });
    R.count.textContent = T('tbMonCount', team().mons.length);
  }

  function renderSlots() {
    var tm = team();
    R.slots.innerHTML = '';
    for (var i = 0; i < 6; i++) (function (i) {
      var m = tm.mons[i];
      if (!m) {
        var add = el('button', { class: 'tb-slot empty' + (i === sel ? ' on' : ''), text: i === tm.mons.length ? T('tbAddMon') : '' });
        if (i === tm.mons.length) add.addEventListener('click', function () { sel = i; renderSlots(); renderEditor(); focusPick(); });
        else add.disabled = true;
        R.slots.appendChild(add);
        return;
      }
      var card = el('div', { class: 'tb-slot' + (i === sel ? ' on' : '') });
      var sp = el('div', { class: 'tb-slot-sprite' }); sp.appendChild(A.spriteFit(spriteOf(m), m.set.shiny)); card.appendChild(sp);
      var info = el('div', { class: 'tb-slot-info' });
      info.appendChild(el('div', { class: 'tb-slot-name', text: A.nSpecies(battleForme(m).indexOf('Mega ') === 0 ? battleForme(m) : baseForme(m)) }));
      info.appendChild(el('div', { class: 'tb-slot-item', text: m.set.item && m.set.item !== '(none)' ? A.nItem(m.set.item) : (de ? 'kein Item' : 'no item') }));
      var ty = el('div', { class: 'tb-slot-types' }); typesOf(battleForme(m)).forEach(function (t) { ty.appendChild(A.typeBadge(t)); }); info.appendChild(ty);
      card.appendChild(info);
      var tools = el('div', { class: 'tb-slot-tools' });
      [['◀', 'tbLeft', -1], ['▶', 'tbRight', 1]].forEach(function (b) {
        var j = i + b[2];
        if (j < 0 || j >= tm.mons.length) return;
        var bt = el('button', { title: T(b[1]), text: b[0] });
        bt.addEventListener('click', function (ev) {
          ev.stopPropagation();
          var x = tm.mons[i]; tm.mons[i] = tm.mons[j]; tm.mons[j] = x; sel = j; persist(); renderSlots(); renderList(); renderCover();
        });
        tools.appendChild(bt);
      });
      var del = el('button', { class: 'del', title: T('tbRemove'), text: '✕' });
      del.addEventListener('click', function (ev) { ev.stopPropagation(); removeMember(i); });
      tools.appendChild(del);
      card.appendChild(tools);
      card.addEventListener('click', function () { if (sel !== i) { sel = i; renderSlots(); renderEditor(); } });
      R.slots.appendChild(card);
    })(i);
  }
  function removeMember(i) {
    var tm = team();
    tm.mons.splice(i, 1);
    if (sel > tm.mons.length) sel = tm.mons.length;
    if (sel === tm.mons.length && sel > 0 && i <= sel) sel = Math.max(0, Math.min(i, tm.mons.length - 1));
    persist(); renderSlots(); renderEditor(); renderCover(); renderList();
  }
  function changed() { persist(); renderSlots(); renderCover(); renderList(); }
  function focusPick() { setTimeout(function () { var i = R.edit.querySelector('.tb-pick input'); if (i) i.focus(); }, 20); }

  // ---------------- species search ----------------
  var speciesSorted = null;
  function buildPicker(m, onChoose) {
    var wrap = el('div', { class: 'picker tb-pick' });
    var input = el('input', { type: 'text', spellcheck: 'false', placeholder: m ? A.nSpecies(m.species) : T('tbChoose') });
    var list = el('div', { class: 'picker-list' });
    wrap.appendChild(input); wrap.appendChild(list);
    if (m) input.value = A.nSpecies(m.species);
    var shown = [], nodes = [], active = -1;
    function draw() {
      speciesSorted = speciesSorted || A.sortedBy(A.SPECIES, A.nSpecies);
      var q = input.value.trim().toLowerCase();
      var hits = speciesSorted.filter(function (s) { return !q || (s + ' ' + A.nSpecies(s)).toLowerCase().indexOf(q) !== -1; });
      if (q) hits.sort(function (a, b) {
        var sa = A.nSpecies(a).toLowerCase().indexOf(q) === 0 || a.toLowerCase().indexOf(q) === 0 ? 0 : 1;
        var sb = A.nSpecies(b).toLowerCase().indexOf(q) === 0 || b.toLowerCase().indexOf(q) === 0 ? 0 : 1;
        return sa - sb;
      });
      shown = hits.slice(0, 120); nodes = []; list.innerHTML = '';
      if (!shown.length) list.appendChild(el('div', { class: 'picker-empty', text: T('noHits') }));
      shown.forEach(function (s, i) {
        var it = el('div', { class: 'picker-item tb-pick-item' + (i === active ? ' active' : '') + (m && m.species === s ? ' current' : '') });
        var ic = el('span', { class: 'pk-mini' }); ic.appendChild(A.spriteImg(s)); it.appendChild(ic);
        it.appendChild(el('span', { text: A.nSpecies(s) }));
        var tw = el('span', { class: 'pk-types' }); typesOf(s).forEach(function (t) { tw.appendChild(A.typeBadge(t)); }); it.appendChild(tw);
        it.addEventListener('mousedown', function (ev) { ev.preventDefault(); pick(s); });
        list.appendChild(it); nodes.push(it);
      });
      list.classList.add('open');
    }
    function pick(s) { list.classList.remove('open'); input.blur(); onChoose(s); }
    function hl() {
      nodes.forEach(function (n, i) { n.classList.toggle('active', i === active); });
      var n = nodes[active];
      if (n) n.scrollIntoView({ block: 'nearest' });
    }
    input.addEventListener('focus', function () { input.select(); active = -1; draw(); });
    input.addEventListener('input', function () { active = -1; draw(); list.scrollTop = 0; });
    input.addEventListener('blur', function () { list.classList.remove('open'); if (m) input.value = A.nSpecies(m.species); });
    input.addEventListener('keydown', function (ev) {
      if (ev.key === 'ArrowDown') { active = Math.min(shown.length - 1, active + 1); hl(); ev.preventDefault(); }
      else if (ev.key === 'ArrowUp') { active = Math.max(0, active - 1); hl(); ev.preventDefault(); }
      else if (ev.key === 'Enter') { var s = shown[active >= 0 ? active : 0]; if (s) pick(s); ev.preventDefault(); }
      else if (ev.key === 'Escape') { input.blur(); }
    });
    return wrap;
  }

  // ---------------- editor for one team member ----------------
  function renderEditor() {
    var tm = team(), m = tm.mons[sel];
    R.edit.innerHTML = '';
    if (!m) {
      if (tm.mons.length >= 6) { R.edit.appendChild(el('div', { class: 'tb-empty', text: T('tbEmptyEdit') })); return; }
      var h = el('div', { class: 'tb-ed-head' });
      h.appendChild(buildPicker(null, function (s) { tm.mons.push(memberFor(s)); sel = tm.mons.length - 1; changed(); renderEditor(); }));
      R.edit.appendChild(h);
      R.edit.appendChild(el('div', { class: 'tb-empty', text: T('tbEmptyEdit') }));
      return;
    }
    var set = m.set;
    set.species = m.species;
    set.sps = set.sps || { hp: 0, at: 0, df: 0, sa: 0, sd: 0, sp: 0 };
    set.moves = set.moves || [];

    // head: sprite, search, preset, set name, remove
    var head = el('div', { class: 'tb-ed-head' });
    head.appendChild(buildPicker(m, function (s) {
      if (s === m.species) return;
      tm.mons[sel] = memberFor(s); changed(); renderEditor();
    }));
    var pre = el('select', { class: 'tb-preset', title: T('tbPreset') });
    pre.innerHTML = '<option value="">' + A.esc(T('tbPreset')) + '</option>' + presetsFor(m.species).map(function (e, i) {
      return '<option value="' + i + '">' + A.esc(A.nSetName(e.name) + (e.src ? ' · ' + e.src : '')) + '</option>';
    }).join('');
    pre.addEventListener('change', function () {
      var e = presetsFor(m.species)[+pre.value];
      if (!e) return;
      var ns = e.set ? clone(e.set) : A.defaultSet(m.species);
      ns.species = m.species; ns.sps = ns.sps || { hp: 0, at: 0, df: 0, sa: 0, sd: 0, sp: 0 };
      ns.moves = (ns.moves || []).filter(function (mv) { return MOVES[mv] && mv !== '(No Move)'; }).slice(0, 4);
      m.set = ns; m.setName = e.name; changed(); renderEditor();
    });
    head.appendChild(pre);
    var nick = el('input', { class: 'tb-nick', type: 'text', spellcheck: 'false', title: T('tbNick'), placeholder: T('tbNick') });
    nick.value = A.nSetName(m.setName || '');
    nick.addEventListener('input', function () { m.setName = nick.value || 'Set'; persist(); });
    head.appendChild(nick);
    var rm = el('button', { class: 'tbtn danger', text: '✕', title: T('tbRemove') });
    rm.addEventListener('click', function () { removeMember(sel); });
    head.appendChild(rm);
    R.edit.appendChild(head);

    // layout (sketch): SP bars + nature | big sprite + types / item | 4 moves / ability, stats across the bottom
    var grid = el('div', { class: 'tb-ed-grid' });
    function box(cls, title) {
      var b = el('div', { class: 'tb-box ' + cls });
      if (title) b.appendChild(el('div', { class: 'tb-box-title', text: title }));
      grid.appendChild(b);
      return b;
    }
    var mega = A.megaFormeFor(m.species, set.item);
    var view = viewForm(m);

    // --- Stat Points as bars, nature below ---
    var spBox = box('tb-area-sp', T('sp') + ' · Stat Points');
    var spRefs = {};
    C.STAT_KEYS.forEach(function (st) {
      var r = el('div', { class: 'tb-spbar' });
      var lab = el('span', { class: 'tb-spbar-name', text: A.nStatLong(st) });
      var rng = el('input', { type: 'range', min: '0', max: String(C.SP_MAX), step: '1' });
      rng.value = set.sps[st] || 0;
      var num = el('input', { type: 'number', min: '0', max: String(C.SP_MAX), step: '1' });
      num.value = set.sps[st] || 0;
      function apply(v) {
        v = Math.max(0, Math.min(C.SP_MAX, parseInt(v, 10) || 0));
        var other = spTotal(set) - (set.sps[st] || 0);
        v = Math.min(v, Math.max(0, C.SP_TOTAL - other));
        set.sps[st] = v; num.value = v; rng.value = v; persist(); updateStats();
      }
      rng.addEventListener('input', function () { apply(rng.value); });
      num.addEventListener('input', function () { apply(num.value); });
      num.addEventListener('blur', function () { num.value = set.sps[st] || 0; });
      r.appendChild(lab); r.appendChild(rng); r.appendChild(num);
      spBox.appendChild(r);
      spRefs[st] = { name: lab, rng: rng };
    });
    var spFoot = el('div', { class: 'tb-sp-foot' });
    var tot = el('span', { class: 'tb-st-total' });
    var clr = el('button', { class: 'tbtn', text: T('tbSpReset') });
    clr.addEventListener('click', function () { C.STAT_KEYS.forEach(function (st) { set.sps[st] = 0; }); persist(); renderEditor(); });
    spFoot.appendChild(tot); spFoot.appendChild(clr);
    spBox.appendChild(spFoot);
    // --- nature (own box below the SP bars, like item and ability) ---
    var natBox = box('tb-area-nature', T('nature'));
    var ns = el('button', { class: 'tb-nature-btn' });
    function natLabel() {
      var n = C.NATURES[set.nature] ? set.nature : 'Hardy', e = C.NATURES[n] || [];
      ns.innerHTML = '';
      ns.appendChild(el('span', { class: 'tb-nat-name', text: A.nNature(n) }));
      if (e.length) {
        ns.appendChild(el('span', { class: 'tb-nat-up', text: '▲ ' + A.nStatLong(e[0]) }));
        ns.appendChild(el('span', { class: 'tb-nat-down', text: '▼ ' + A.nStatLong(e[1]) }));
      } else ns.appendChild(el('span', { class: 'tb-nat-neutral', text: T('tbNatNeutral') }));
    }
    natLabel();
    ns.addEventListener('click', function () {
      openNaturePicker(m, function (n) { set.nature = n; persist(); natLabel(); updateStats(); });
    });
    natBox.appendChild(ns);

    // --- big sprite (animated 3D model) with form change and appearance window ---
    var spr = box('tb-area-sprite');
    var bar = el('div', { class: 'tb-stage-bar' });
    var forms = battleForms(m);
    if (forms.length > 1) {
      var seg = el('div', { class: 'tb-formseg', title: T('tbFormChangeT') });
      seg.appendChild(el('span', { class: 'tb-formseg-l', text: T('tbFormChange') }));
      forms.forEach(function (f) {
        var b = el('button', { class: f === view ? 'on' : '', text: formLabel(f, m), title: A.nSpecies(f) });
        b.addEventListener('click', function () {
          if (f.indexOf('Mega ') === 0 && A.megaFormeFor(m.species, set.item) !== f) {
            var stone = megaStoneFor(m, f);
            if (stone) { set.item = stone; A.toast(T('tbStoneSet', A.nItem(stone))); }
          }
          viewMap.set(m, f); changed(); renderEditor();
        });
        seg.appendChild(b);
      });
      bar.appendChild(seg);
    }
    var look = el('button', { class: 'tbtn tb-look-btn', text: T('tbLook') });
    look.addEventListener('click', function () { openLook(m); });
    bar.appendChild(look);
    spr.appendChild(bar);
    var stage = el('div', { class: 'tb-stage' });
    var img = el('img', { alt: A.nSpecies(view) });
    img.onload = function () {
      var max = stage.clientHeight - 8, w = img.naturalWidth, h = img.naturalHeight, k = img.classList.contains('still') ? 2 : 1.6;
      var s = Math.min(k, max / h, (stage.clientWidth - 8) / w);
      img.style.width = Math.round(w * s) + 'px'; img.style.height = Math.round(h * s) + 'px';
    };
    bigSprite(spriteOf(m, view), set, img);
    stage.appendChild(img);
    spr.appendChild(stage);
    var cap = el('div', { class: 'tb-stage-cap' });
    cap.appendChild(el('span', { class: 'tb-stage-name', text: A.nSpecies(view === baseForme(m) && set.look ? set.look : view) }));
    if (set.gender === 'M' || set.gender === 'F') cap.appendChild(el('span', { class: 'tb-gender ' + set.gender, text: set.gender === 'M' ? '♂' : '♀', title: T(set.gender === 'M' ? 'tbMale' : 'tbFemale') }));
    if (set.shiny) cap.appendChild(el('span', { class: 'tb-shiny', text: '★', title: 'Shiny' }));
    var types = el('span', { class: 'tb-ed-types' }); typesOf(view).forEach(function (t) { types.appendChild(A.typeBadge(t)); }); cap.appendChild(types);
    spr.appendChild(cap);

    // --- four moves ---
    var mvBox = box('tb-area-moves');
    var legal = A.legalMoves(baseForme(m)) || Object.keys(MOVES).filter(function (x) { return x !== '(No Move)'; });
    var moveOpts = A.sortedBy(legal, A.nMove);
    for (var k = 0; k < 4; k++) (function (k) {
      var card = el('div', { class: 'tb-movecard' });
      var s = el('select');
      s.innerHTML = '<option value="">' + (de ? '(keine Attacke)' : '(No Move)') + '</option>' + optionsHtml(moveOpts, 'move', set.moves[k]);
      s.value = set.moves[k] || '';
      var info = el('div', { class: 'tb-move-info' });
      function fill() {
        info.innerHTML = '';
        var d = MOVES[s.value];
        card.style.borderLeftColor = d ? (A.TYPE_COLORS[d.type] || '') : '';
        if (!d) { info.appendChild(el('span', { class: 'tb-cat', text: T('tbMoveN', k + 1) })); return; }
        info.appendChild(A.typeBadge(d.type));
        info.appendChild(el('span', { class: 'tb-cat', text: nCat(d.category) }));
        var nums = el('span', { class: 'tb-bp' });
        if (d.bp) nums.appendChild(el('span', { text: T('tbPower', d.bp) }));
        var acc = (window.MOVE_ACC || {})[s.value.toLowerCase().replace(/[^a-z0-9]/g, '')];
        if (acc === true) { if (d.category !== 'Status') nums.appendChild(el('span', { text: T('tbAccAlways') })); }
        else if (acc != null) nums.appendChild(el('span', { class: acc < 100 ? 'low' : '', text: T('tbAcc', acc) }));
        info.appendChild(nums);
      }
      s.addEventListener('change', function () {
        var mv = []; R.edit.querySelectorAll('.tb-movecard select').forEach(function (x) { if (x.value) mv.push(x.value); });
        set.moves = mv; fill(); changed();
      });
      fill();
      card.appendChild(s); card.appendChild(info); mvBox.appendChild(card);
    })(k);

    // --- item ---
    var itBox = box('tb-area-item', T('item'));
    var items = ['(none)'].concat(A.sortedBy(A.ITEMS.filter(function (x) { return x !== '(none)'; }), A.nItem));
    var is = el('select');
    is.innerHTML = optionsHtml(items, 'item', set.item || '(none)');
    is.value = set.item || '(none)';
    is.addEventListener('change', function () { set.item = is.value; changed(); renderEditor(); });
    itBox.appendChild(is);

    // --- ability: in a Mega / battle form with its own ability that one is shown ---
    var abBox = box('tb-area-ability', T('ability'));
    var abil = A.legalAbilities(baseForme(m)) || A.ABILITIES;
    if (!set.ability) set.ability = abil[0];
    var formAb = view !== baseForme(m) && DEX[view] && DEX[view].ab && view.indexOf('Mega ') === 0 ? DEX[view].ab : null;
    if (formAb) {
      var fixed = el('div', { class: 'tb-fixed-ab', text: A.nAbility(formAb) });
      abBox.appendChild(fixed);
      abBox.appendChild(el('div', { class: 'tb-note', text: T('tbAbInForm', A.nSpecies(view)) + ' · ' + T('tbAbNormal', A.nAbility(set.ability)) }));
    } else {
      var as = el('select');
      as.innerHTML = optionsHtml(A.sortedBy(abil, A.nAbility), 'ability', set.ability);
      as.value = set.ability;
      as.addEventListener('change', function () { set.ability = as.value; changed(); });
      abBox.appendChild(as);
      if (mega && DEX[mega].ab && view !== mega) abBox.appendChild(el('div', { class: 'tb-note', text: T('tbMega') + ': ' + A.nAbility(DEX[mega].ab) }));
    }

    // --- stats of the shown form across the bottom ---
    var stBox = box('tb-area-stats', T('tbStats') + ' · ' + A.nSpecies(view));
    var stRow = el('div', { class: 'tb-statrow' });
    var stRefs = {};
    C.STAT_KEYS.forEach(function (st) {
      var c = el('div', { class: 'tb-stat' });
      var name = el('span', { class: 'tb-stat-name', text: A.nStatLong(st) });
      var val = el('span', { class: 'tb-stat-val' });
      var bar = el('span', { class: 'tb-stat-bar' }); var fillEl = el('span'); bar.appendChild(fillEl);
      var sub = el('span', { class: 'tb-stat-sub' });
      c.appendChild(name); c.appendChild(val); c.appendChild(bar); c.appendChild(sub);
      stRow.appendChild(c);
      stRefs[st] = { name: name, val: val, fill: fillEl, sub: sub };
    });
    stBox.appendChild(stRow);
    R.edit.appendChild(grid);

    function updateStats() {
      var nat = C.NATURES[set.nature] || [];
      var f = baseForme(m), alt = view !== f;
      C.STAT_KEYS.forEach(function (st) {
        var v = C.calcStat(st, DEX[view].bs[st], set.sps[st] || 0, set.nature, view);
        var normal = C.calcStat(st, DEX[f].bs[st], set.sps[st] || 0, set.nature, f), r = stRefs[st];
        r.val.textContent = v;
        r.fill.style.width = Math.min(100, v / 250 * 100) + '%';
        r.fill.style.background = 'hsl(' + Math.round(Math.min(150, v * 0.6)) + ', 65%, 48%)';
        r.sub.textContent = T('base') + ' ' + DEX[view].bs[st] + (alt ? ' · ' + T('tbNormalVal', normal) : '');
        var up = nat[0] === st, down = nat[1] === st;
        [r.name, spRefs[st].name].forEach(function (e) { e.classList.toggle('up', up); e.classList.toggle('down', down); });
        spRefs[st].rng.style.setProperty('--p', ((set.sps[st] || 0) / C.SP_MAX * 100) + '%');
      });
      var n = spTotal(set);
      tot.textContent = T('spTotal', n, C.SP_TOTAL, C.SP_TOTAL - n);
      tot.classList.toggle('full', n >= C.SP_TOTAL);
    }
    updateStats();
  }

  // ---------------- appearance window: form / regional form, variant, gender, shiny ----------------
  var lookModal = null;
  function openLook(m) {
    if (lookModal) lookModal.remove();
    lookModal = el('div', { class: 'modal look-modal' });
    var bx = el('div', { class: 'modal-box look-box' });
    lookModal.appendChild(bx);
    document.body.appendChild(lookModal);
    function close() {
      if (!lookModal) return;
      lookModal.remove(); lookModal = null; document.removeEventListener('keydown', key, true);
      renderSlots(); renderEditor(); renderList(); renderCover();
    }
    function key(ev) { if (ev.key === 'Escape') { ev.stopPropagation(); close(); } }
    document.addEventListener('keydown', key, true);
    lookModal.addEventListener('mousedown', function (ev) { if (ev.target === lookModal) close(); });

    function draw() {
      var set = m.set;
      bx.innerHTML = '';
      var head = el('div', { class: 'nat-head' });
      head.appendChild(el('h3', { text: T('tbLookTitle') }));
      var done = el('button', { class: 'primary-btn', text: T('tbDone') });
      done.addEventListener('click', close);
      head.appendChild(done);
      bx.appendChild(head);
      var body = el('div', { class: 'look-body' });
      // preview
      var pv = el('div', { class: 'look-preview' });
      var stage = el('div', { class: 'tb-stage' });
      var img = el('img');
      img.onload = function () {
        var s = Math.min(img.classList.contains('still') ? 2 : 1.5, (stage.clientHeight - 8) / img.naturalHeight, (stage.clientWidth - 8) / img.naturalWidth);
        img.style.width = Math.round(img.naturalWidth * s) + 'px'; img.style.height = Math.round(img.naturalHeight * s) + 'px';
      };
      bigSprite(spriteOf(m, baseForme(m)), set, img);
      stage.appendChild(img); pv.appendChild(stage);
      var nm = el('div', { class: 'tb-stage-cap' });
      nm.appendChild(el('span', { class: 'tb-stage-name', text: A.nSpecies(set.look || baseForme(m)) }));
      var ty = el('span', { class: 'tb-ed-types' }); typesOf(baseForme(m)).forEach(function (t) { ty.appendChild(A.typeBadge(t)); }); nm.appendChild(ty);
      pv.appendChild(nm);
      body.appendChild(pv);

      var side = el('div', { class: 'look-side' });
      function section(title, hint) {
        var s = el('div', { class: 'look-sec' });
        s.appendChild(el('div', { class: 'tb-box-title', text: title }));
        if (hint) s.appendChild(el('div', { class: 'hint look-hint', text: hint }));
        side.appendChild(s);
        return s;
      }
      function choice(label, sprite, on, fn, disabled, title) {
        var b = el('button', { class: 'look-opt' + (on ? ' on' : ''), title: title || label });
        if (sprite) { var sp = el('span', { class: 'look-ic' }); sp.appendChild(A.spriteFit(sprite, set.shiny)); b.appendChild(sp); }
        var gs = /^([♂♀⚲]) (.*)$/.exec(label);
        if (gs) {
          b.appendChild(el('span', { class: 'gsym ' + (gs[1] === '♂' ? 'M' : gs[1] === '♀' ? 'F' : ''), text: gs[1] }));
          b.appendChild(el('span', { text: gs[2] }));
        } else b.appendChild(el('span', { text: label }));
        if (disabled) b.disabled = true; else b.addEventListener('click', fn);
        return b;
      }

      // 1) forms with own stats: regional forms, Rotom appliances, Lycanroc, Meowstic-F … (separate entries) and formes like Low Key
      var fam = familyOf(m.species), oob = outOfBattleFormes(m.species);
      if (fam.length > 1 || oob.length > 1) {
        var s1 = section(T('tbFormsOwn'), T('tbFormsOwnHint'));
        var g1 = el('div', { class: 'look-grid' });
        fam.forEach(function (sp) {
          var subs = outOfBattleFormes(sp);
          (sp === m.species ? subs : [subs[0] || sp]).forEach(function (f) {
            var on = sp === m.species && f === baseForme(m);
            g1.appendChild(choice(A.nSpecies(f), f, on, function () {
              if (sp !== m.species) {
                m.species = sp; set.species = sp; delete set.forme; delete set.look;
                var la = A.legalAbilities(sp) || [];
                if (la.length && la.indexOf(set.ability) === -1) set.ability = la[0];
              } else {
                if (f === subs[0]) delete set.forme; else set.forme = f;
                var la2 = A.legalAbilities(f) || [];
                if (la2.length && la2.indexOf(set.ability) === -1) set.ability = la2[0];
              }
              viewMap.delete(m); fixGender(m); persist(); draw();
            }));
          });
        });
        s1.appendChild(g1);
      }

      // 2) cosmetic variants (Vivillon patterns, Florges colours, Gastrodon East …)
      var vars = variantsOf(m);
      if (vars) {
        var s2 = section(T('tbVariant'), T('tbVariantHint'));
        var g2 = el('div', { class: 'look-grid' });
        var baseName = baseForme(m);
        g2.appendChild(choice(vars.base ? nVariant(vars.base) : (de ? 'Standard' : 'Default'), baseName, !set.look, function () { delete set.look; persist(); draw(); }));
        vars.list.forEach(function (v) {
          var suffix = v.slice(v.indexOf('-') + 1);
          g2.appendChild(choice(nVariant(suffix), v, set.look === v, function () { set.look = v; persist(); draw(); }));
        });
        s2.appendChild(g2);
      }

      // 3) gender: respects fixed, genderless and ratio
      var gi = genderInfo(m);
      var s3 = section(T('tbGender'), gi.fixed === 'N' ? T('tbGenderless') : gi.fixed ? T(gi.fixed === 'M' ? 'tbOnlyMale' : 'tbOnlyFemale')
        : T('tbRatio', String(Math.round(gi.ratio * 1000) / 10).replace('.', de ? ',' : '.'), String(Math.round((1 - gi.ratio) * 1000) / 10).replace('.', de ? ',' : '.')));
      var g3 = el('div', { class: 'look-grid look-row' });
      if (gi.fixed === 'N') g3.appendChild(choice('⚲ ' + T('tbNoGender'), null, true, null, true));
      else {
        var canM = gi.fixed ? gi.fixed === 'M' : gi.ratio > 0, canF = gi.fixed ? gi.fixed === 'F' : gi.ratio < 1;
        if (!gi.fixed) g3.appendChild(choice(T('tbRandom'), null, !set.gender, function () { delete set.gender; persist(); draw(); }));
        g3.appendChild(choice('♂ ' + T('tbMale'), null, set.gender === 'M', function () { set.gender = 'M'; persist(); draw(); }, !canM, canM ? '' : T('tbOnlyFemale')));
        g3.appendChild(choice('♀ ' + T('tbFemale'), null, set.gender === 'F', function () { set.gender = 'F'; persist(); draw(); }, !canF, canF ? '' : T('tbOnlyMale')));
      }
      s3.appendChild(g3);

      // 4) shiny
      var s4 = section('Shiny');
      var g4 = el('div', { class: 'look-grid look-row' });
      g4.appendChild(choice(T('tbNormalColor'), null, !set.shiny, function () { delete set.shiny; persist(); draw(); }));
      g4.appendChild(choice('★ Shiny', null, !!set.shiny, function () { set.shiny = true; persist(); draw(); }));
      s4.appendChild(g4);

      body.appendChild(side);
      bx.appendChild(body);
    }
    fixGender(m); persist();
    draw();
  }

  // ---------------- nature picker (grid like in Pokémon Champions) ----------------
  // rows = raised stat, columns = lowered stat; the diagonal is neutral (shown once, top left)
  var NAT_STATS = ['at', 'df', 'sa', 'sd', 'sp'];
  var natModal = null;
  function natureAt(up, down) {
    if (up === down) return null;
    var hit = null;
    A.NATURE_NAMES.some(function (n) { var e = C.NATURES[n]; if (e && e[0] === up && e[1] === down) { hit = n; return true; } return false; });
    return hit;
  }
  function openNaturePicker(m, onPick) {
    var set = m.set, start = C.NATURES[set.nature] ? set.nature : 'Hardy';
    var neutral = (C.NATURES[start] || []).length ? 'Serious' : start;
    if (natModal) natModal.remove();
    natModal = el('div', { class: 'modal nat-modal' });
    var bx = el('div', { class: 'modal-box nat-box' });
    var head = el('div', { class: 'nat-head' });
    head.appendChild(el('h3', { text: T('tbNatTitle') }));
    var revert = el('button', { class: 'nat-revert' });
    revert.appendChild(el('span', { class: 'l', text: T('tbNatRevert') }));
    revert.appendChild(el('b', { text: A.nNature(start) }));
    head.appendChild(revert);
    var x = el('button', { class: 'icon-btn', text: '✕', title: T('close') });
    head.appendChild(x);
    bx.appendChild(head);

    var grid = el('div', { class: 'nat-grid' });
    grid.appendChild(el('div', { class: 'nat-corner' }));
    NAT_STATS.forEach(function (s) { grid.appendChild(el('div', { class: 'nat-col', text: A.nStatLong(s) + ' ▼' })); });
    var cells = [];
    NAT_STATS.forEach(function (up, r) {
      grid.appendChild(el('div', { class: 'nat-row', text: A.nStatLong(up) + ' ▲' }));
      NAT_STATS.forEach(function (down, c) {
        var n = up === down ? (r === 0 ? neutral : null) : natureAt(up, down);
        if (!n) { grid.appendChild(el('div', { class: 'nat-cell blank' })); return; }
        var isCur = n === start || (up === down && !(C.NATURES[start] || []).length);
        var b = el('button', { class: 'nat-cell' + (isCur ? ' cur' : '') + (up === down ? ' neutral' : ''), text: A.nNature(n) });
        b.addEventListener('mouseenter', function () { preview(n); });
        b.addEventListener('focus', function () { preview(n); });
        b.addEventListener('click', function () { onPick(n); close(); });
        grid.appendChild(b); cells.push(b);
      });
    });
    bx.appendChild(grid);
    var foot = el('div', { class: 'nat-foot' });
    bx.appendChild(foot);
    natModal.appendChild(bx);
    document.body.appendChild(natModal);

    // footer: what the hovered nature does to this Pokémon's stats
    function preview(n) {
      foot.innerHTML = '';
      var e = C.NATURES[n] || [], f = battleForme(m);
      foot.appendChild(el('b', { text: A.nNature(n) }));
      if (!e.length) { foot.appendChild(el('span', { class: 'hint', text: T('tbNatNeutral') })); return; }
      [[e[0], 'up'], [e[1], 'down']].forEach(function (p) {
        var st = p[0];
        var now = C.calcStat(st, DEX[f].bs[st], set.sps[st] || 0, set.nature, f);
        var then = C.calcStat(st, DEX[f].bs[st], set.sps[st] || 0, n, f);
        foot.appendChild(el('span', { class: 'nat-eff ' + p[1], text: (p[1] === 'up' ? '▲ ' : '▼ ') + A.nStatLong(st) + ': ' + now + ' → ' + then }));
      });
    }
    preview(start);
    function close() { if (natModal) { natModal.remove(); natModal = null; document.removeEventListener('keydown', key, true); } }
    function key(ev) { if (ev.key === 'Escape') { ev.stopPropagation(); close(); } }
    document.addEventListener('keydown', key, true);
    x.addEventListener('click', close);
    revert.addEventListener('click', function () { onPick(start); close(); });
    natModal.addEventListener('mousedown', function (ev) { if (ev.target === natModal) close(); });
    var cur = bx.querySelector('.nat-cell.cur'); if (cur) cur.focus();
  }

  // ---------------- type coverage (defensive) ----------------
  var ABIL_DEF = {
    'Levitate': { Ground: 0 }, 'Earth Eater': { Ground: 0 }, 'Flash Fire': { Fire: 0 }, 'Well-Baked Body': { Fire: 0 },
    'Water Absorb': { Water: 0 }, 'Storm Drain': { Water: 0 }, 'Dry Skin': { Water: 0, Fire: 1.25 },
    'Volt Absorb': { Electric: 0 }, 'Lightning Rod': { Electric: 0 }, 'Motor Drive': { Electric: 0 }, 'Sap Sipper': { Grass: 0 },
    'Thick Fat': { Fire: 0.5, Ice: 0.5 }, 'Heatproof': { Fire: 0.5 }, 'Water Bubble': { Fire: 0.5 }, 'Purifying Salt': { Ghost: 0.5 },
    'Fluffy': { Fire: 2 }
  };
  function multLabel(x) {
    if (x === 1) return '';
    if (x === 0) return '0';
    if (x === 0.5) return '½';
    if (x === 0.25) return '¼';
    if (x === 0.125) return '⅛';
    return String(Math.round(x * 100) / 100).replace('.', de ? ',' : '.');
  }
  function renderCover() {
    var tm = team();
    R.cover.innerHTML = '';
    if (!tm.mons.length) { R.cover.appendChild(el('div', { class: 'tb-empty', text: T('tbEmptyTeam') })); return; }
    var tbl = el('table', { class: 'tb-cover-table' });
    var defs = tm.mons.map(function (m) {
      var f = battleForme(m), ab = f.indexOf('Mega ') === 0 && DEX[f].ab ? DEX[f].ab : m.set.ability;
      return { f: f, types: typesOf(f), ab: ab, m: m };
    });
    tbl.innerHTML = '';
    var trh = el('tr'); trh.appendChild(el('th'));
    defs.forEach(function (d) { var th = el('th'); var s = el('span', { class: 'tb-cv-mon' }); s.appendChild(A.spriteFit(spriteOf(d.m), d.m.set.shiny)); th.appendChild(s); trh.appendChild(th); });
    trh.appendChild(el('th', { class: 'tb-cv-sum', text: T('tbWeakCol') }));
    trh.appendChild(el('th', { class: 'tb-cv-sum', text: T('tbResCol') }));
    var th = el('thead'); th.appendChild(trh); tbl.appendChild(th);
    var tb = el('tbody');
    C.TYPES.forEach(function (type) {
      var tr = el('tr'), weak = 0, res = 0;
      var tdT = el('td'); tdT.appendChild(A.typeBadge(type)); tr.appendChild(tdT);
      defs.forEach(function (d) {
        var x = C.typeEff(type, d.types, {});
        var am = ABIL_DEF[d.ab]; if (am && am[type] != null) x = am[type] === 0 ? 0 : x * am[type];
        if (x > 1) weak++; else if (x < 1) res++;
        tr.appendChild(el('td', { class: 'tb-cv ' + (x === 0 ? 'imm' : x >= 4 ? 'w4' : x > 1 ? 'w2' : x <= 0.25 ? 'r4' : x < 1 ? 'r2' : ''), text: multLabel(x) }));
      });
      tr.appendChild(el('td', { class: 'tb-cv-sum' + (weak >= 3 ? ' bad' : ''), text: weak ? String(weak) : '' }));
      tr.appendChild(el('td', { class: 'tb-cv-sum good', text: res ? String(res) : '' }));
      tb.appendChild(tr);
    });
    tbl.appendChild(tb);
    R.cover.appendChild(tbl);
    R.cover.appendChild(el('div', { class: 'hint tb-cv-hint', text: T('tbWeakHint') }));
  }

  // ---------------- import ----------------
  var imp = null;
  function openImport() {
    if (!imp) {
      imp = el('div', { class: 'modal hidden', id: 'tbImportModal' });
      imp.innerHTML = '<div class="modal-box wide"><div class="modal-head"><h3>' + A.esc(T('tbImportTitle')) + '</h3><button class="icon-btn" data-x>✕</button></div>' +
        '<p class="hint">' + T('importHintH') + '</p><textarea spellcheck="false"></textarea>' +
        '<div class="import-actions"><button data-new class="primary-btn">' + A.esc(T('tbImportNew')) + '</button><button data-into>' + A.esc(T('tbImportInto')) + '</button><span class="hint" data-msg></span></div></div>';
      document.body.appendChild(imp);
      var close = function () { imp.classList.add('hidden'); };
      imp.querySelector('[data-x]').addEventListener('click', close);
      imp.addEventListener('mousedown', function (ev) { if (ev.target === imp) close(); });
      document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') close(); });
      function run(asNew) {
        var res = A.parseShowdown(imp.querySelector('textarea').value), msg = imp.querySelector('[data-msg]');
        if (!res.mons.length) { msg.textContent = T('importNothing') + (res.errors.length ? ' (' + T('unknown', res.errors.join(', ')) + ')' : ''); return; }
        var mons = res.mons.slice(0, 6).map(function (m) { m.set.species = m.species; fixGender(m); return m; });
        if (asNew) { var nt = { id: newId(), name: T('tbDefaultName', store.teams.length + 1), mons: mons }; store.teams.push(nt); store.cur = nt.id; }
        else team().mons = mons;
        sel = 0; persist(); render();
        A.toast(T('tbImportDone', mons.length) + (res.errors.length ? ' · ' + T('unknown', res.errors.join(', ')) : ''));
        close();
      }
      imp.querySelector('[data-new]').addEventListener('click', function () { run(true); });
      imp.querySelector('[data-into]').addEventListener('click', function () { run(false); });
    }
    imp.querySelector('[data-msg]').textContent = '';
    imp.classList.remove('hidden');
    setTimeout(function () { imp.querySelector('textarea').focus(); }, 30);
  }

  window.CCBuilder = { render: render };
})();

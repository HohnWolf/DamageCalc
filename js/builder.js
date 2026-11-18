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
  function ensureVersions(t) {
    if (!t) return null;
    if (!Array.isArray(t.versions) || !t.versions.length) {
      var v0 = { id: newId(), name: 'v1', mons: Array.isArray(t.mons) ? t.mons : [] };
      t.versions = [v0];
      t.curVer = v0.id;
    }
    var cur = null;
    t.versions.some(function (v) { if (v.id === t.curVer) { cur = v; return true; } return false; });
    if (!cur) { cur = t.versions[0]; t.curVer = cur.id; }
    if (!Array.isArray(cur.mons)) cur.mons = [];
    t.mons = cur.mons;
    return cur;
  }
  function nextVerName(t) {
    var n = (t.versions ? t.versions.length : 0) + 1;
    var used = {};
    (t.versions || []).forEach(function (v) { used[v.name] = 1; });
    while (used['v' + n]) n++;
    return 'v' + n;
  }
  function persist() {
    store.teams.forEach(ensureVersions);
    A.save('cc_builder', store);
  }
  // vor dem Löschen den ganzen Builder-Stand merken: Strg+Z oder der Knopf im Hinweis stellt ihn wieder her
  function snapUndo(label) {
    var snap = JSON.stringify(store);
    A.pushUndo(label, function () {
      var o = JSON.parse(snap);
      Object.keys(store).forEach(function (k) { delete store[k]; });
      Object.keys(o).forEach(function (k) { store[k] = o[k]; });
      sel = 0; persist(); render();
    });
  }
  function team() {
    var t = null;
    store.teams.some(function (x) { if (x.id === store.cur) { t = x; return true; } return false; });
    if (!t) { t = store.teams[0]; if (!t) { t = { id: newId(), name: T('tbDefaultName', 1), mons: [] }; store.teams.push(t); } store.cur = t.id; }
    ensureVersions(t);
    return t;
  }
  function curVersion(t) {
    return ensureVersions(t || team());
  }
  var dragFrom = -1; // slot being dragged
  var sel = 0; // selected slot (0-5); equal to mons.length = "add a new Pokémon"
  var tab = 'edit'; // lower panel: 'edit' (Pokémon editor), 'io' (import/export of one Pokémon); views: 'cover' (type coverage), 'diff' (compare versions), 'legal' (rule check)
  var VIEW_TABS = ['edit', 'io', 'cover', 'diff', 'legal'];
  var work = null; // the lower panel
  var diffSel = { a: null, b: null, same: false }; // compared versions (ids); same: also show unchanged fields

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
    var mdl = A.setting ? A.setting('model') : '3d', use3d = mdl !== 'sprite', useHome = mdl === 'home';
    var home = still.replace('/gen5/', shiny ? '/home-centered-shiny/' : '/home-centered/');
    var chain = useHome ? [home] : [];
    if (use3d) {
      if (set.gender === 'F') chain.push(ani.replace(/\.gif$/, '-f.gif'));
      chain.push(ani);
    }
    if (set.gender === 'F') chain.push(px.replace(/\.png$/, '-f.png'));
    chain.push(px);
    if (shiny && px !== still) chain.push(still);
    var i = 0;
    function syncCls(u) { img.classList.toggle('hd', u.indexOf('/home-centered') !== -1); img.classList.toggle('still', /\.png$/.test(u) && u.indexOf('/home-centered') === -1); }
    img.onerror = function () { i++; if (i < chain.length) { img.classList.remove('rdy'); syncCls(chain[i]); img.src = chain[i]; } };
    img.addEventListener('load', function () { img.classList.add('rdy'); }); // nach dem Einpassen im onload des Aufrufers
    syncCls(chain[0]);
    img.src = chain[0];
  }
  function spTotal(set) { return C.STAT_KEYS.reduce(function (n, k) { return n + ((set.sps && set.sps[k]) || 0); }, 0); }
  var CAT_DE = { Physical: 'Phys.', Special: 'Spez.', Status: 'Status' }, CAT_EN = { Physical: 'Phys.', Special: 'Spec.', Status: 'Status' };
  function nCat(c) { return (de ? CAT_DE : CAT_EN)[c] || c || ''; }

  // ---------- effects like on Showdown: short texts, PP, type symbols, item symbols ----------
  // texts: data/desc_de.js (PokeAPI + own translations) and data/desc_en.js (Showdown), keyed by the normalized name.
  // A German entry that has no translation falls back to the English text.
  var DESC = { de: window.DESC_DE || {}, en: window.DESC_EN || {} };
  var META = window.PICK_META || { pp: {}, icon: {} };
  function descOf(kind, name) { // kind: 'moves' | 'items' | 'abilities'
    var k = A.idOf(name);
    return ((de && (DESC.de[kind] || {})[k]) || (DESC.en[kind] || {})[k]) || '';
  }
  var TYPE_SYMBOL = {};
  C.TYPES.forEach(function (t) { TYPE_SYMBOL[t] = 1; }); // img/types/<type>.svg exists for every real type
  function typeIcon(t) {
    if (!TYPE_SYMBOL[t]) { var dot = el('span', { class: 'type-ic dot', title: A.nType(t) }); dot.style.background = A.TYPE_COLORS[t] || '#666'; return dot; }
    var i = el('img', { class: 'type-ic', src: 'img/types/' + t.toLowerCase() + '.svg', alt: A.nType(t), title: A.nType(t) });
    i.draggable = false;
    return i;
  }
  // item symbols come from the Showdown item sheet (24 px cells, 16 per row); PICK_META.icon holds the cell number
  function itemIcon(name) {
    var n = (META.icon || {})[A.idOf(name)], s = el('span', { class: 'item-ic' });
    if (n != null) { s.classList.add('has'); s.style.setProperty('--c', n % 16); s.style.setProperty('--r', Math.floor(n / 16)); }
    return s;
  }
  // accuracy for display: number, true = never misses, null = unknown
  function accOf(move) { var a = (window.MOVE_ACC || {})[A.idOf(move)]; return a == null ? null : a; }
  function ppOf(move) { var p = (META.pp || {})[A.idOf(move)]; return p == null ? null : p; }
  function presetsFor(species) {
    var g = null;
    A.speciesGroups().some(function (x) { if (x.species === species) { g = x; return true; } return false; });
    return g ? g.sets : [];
  }
  function memberFor(species) {
    // neues Pok?mon startet mit einem leeren Set (keine Attacken, kein Item); fertige Sets bleiben ?ber die Set-Auswahl erreichbar
    var first = null;
    var set = A.defaultSet(species);
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
    if (VIEW_TABS.indexOf(tab) === -1) tab = 'edit';
    var t = team();
    var cv = curVersion(t);
    if (sel > t.mons.length || sel > 5) sel = Math.min(t.mons.length, 5);
    root.innerHTML =
      '<div class="tb">' +
      '<aside class="panel tb-side">' +
      '<h2 class="field-head"><span>' + T('tbTeams') + '</span><button class="tbtn" id="tbNew">' + T('tbNew') + '</button></h2>' +
      '<div class="tb-list" id="tbList"></div>' +
      '<div class="tb-side-foot"><button class="tbtn" id="tbImport">' + T('tbImport') + '</button>' +
      '<button class="tbtn" id="tbQrImport" title="' + (de ? 'Team aus einem QR-Code-Bild importieren (mit Teamname)' : 'Import a team from a QR code image (with team name)') + '">' + (de ? 'QR importieren' : 'Import QR') + '</button></div>' +
      '</aside>' +
      '<section class="tb-main">' +
      '<div class="tb-head">' +
      '<input id="tbName" class="tb-name" spellcheck="false" placeholder="' + A.esc(T('tbName')) + '">' +
      '<span class="tb-count" id="tbCount"></span>' +
      '<button type="button" class="primary-btn tb-meta" id="tbMeta" title="' + (de ? 'Dieses Team lokal gegen Meta-Teams testen' : 'Test this team against meta teams, locally') + '">' + (de ? 'Meta-Test' : 'Meta test') + '</button>' +
      '<span class="tb-acts">' +
      '<button class="tbtn" id="tbExport">' + T('tbExport') + '</button>' +
      '<button class="tbtn" id="tbShare" title="' + (de ? 'QR-Code und PokéPaste-Link für dieses Team' : 'QR code and PokéPaste link for this team') + '">' + (de ? 'Teilen' : 'Share') + '</button>' +
      '<button class="tbtn" id="tbSheet" title="' + (de ? 'Teamsheet als Bild (Deutsch / Englisch)' : 'Team sheet as image (German / English)') + '">' + (de ? 'Teamsheet' : 'Team sheet') + '</button>' +
      '<button class="tbtn" id="tbDup">' + T('tbDuplicate') + '</button>' +
      '<button class="tbtn danger" id="tbDel">' + T('tbDelete') + '</button>' +
      '<span class="tb-sep"></span>' +
      '<button class="tbtn to-you" id="tbToYou">' + T('tbToCalcYou') + '</button>' +
      '<button class="tbtn to-foe" id="tbToFoe">' + T('tbToCalcFoe') + '</button>' +
      '</span></div>' +
      '<div class="tb-ver-bar" id="tbVerBar">' +
      '<label class="tb-ver-lbl" for="tbVerSel">' + (de ? 'Version' : 'Version') + '</label>' +
      '<select id="tbVerSel" class="tb-ver-sel" title="' + (de ? 'Aktive Version wählen' : 'Choose the active version') + '"></select>' +
      '<span class="tb-views" role="group" aria-label="' + (de ? 'Ansichten' : 'Views') + '">' +
      '<button type="button" class="tbtn tb-view-btn" data-view="cover" title="' + (de ? 'Typ-Abdeckung des Teams (Schwächen und Resistenzen)' : 'Type coverage of the team (weaknesses and resistances)') + '">' + T('tbWeak') + '</button>' +
      '<button type="button" class="tbtn tb-view-btn" data-view="diff" title="' + (de ? 'Zwei Versionen farbig vergleichen' : 'Compare two versions, colour-coded') + '">' + (de ? 'Versionen vergleichen' : 'Compare versions') + '</button>' +
      '<button type="button" class="tbtn tb-view-btn tb-legal-btn" data-view="legal" id="tbLegalBtn"></button>' +
      '</span>' +
      '<input id="tbVerName" class="tb-ver-name" spellcheck="false" placeholder="' + (de ? 'Versionsname (z. B. v1, Turnier …)' : 'Version name (e.g. v1, Tournament …)') + '" title="' + (de ? 'Name der aktiven Version bearbeiten' : 'Edit active version name') + '">' +
      '<button class="tbtn tb-ver-add" id="tbVerAdd" title="' + (de ? 'Aktuelle Version kopieren und als neue Version anlegen' : 'Clone current version as a new version') + '">' + (de ? '+ Neue Version' : '+ New version') + '</button>' +
      '<button class="tbtn tb-ver-delbtn" id="tbVerDel" title="' + (de ? 'Aktive Version löschen' : 'Delete the active version') + '" aria-label="' + (de ? 'Aktive Version löschen' : 'Delete the active version') + '">✕</button>' +
      '</div>' +
      '<div class="tb-slots" id="tbSlots"></div>' +
      '<div class="panel tb-work tab-' + tab + '" id="tbWork">' +
      '<div class="tb-tabs"><button data-tab="edit">' + T('tbTabMon') + '</button><button data-tab="io">' + (de ? 'Pokémon Import/Export' : 'Pokémon import/export') + '</button>' +
      '<span class="tb-tabs-view" id="tbViewTitle"></span></div>' +
      '<div class="tb-edit" id="tbEdit"></div>' +
      '<div class="tb-cover" id="tbCover"></div>' +
      '<div class="tb-io" id="tbIO"></div>' +
      '<div class="tb-diff" id="tbDiff"></div>' +
      '<div class="tb-legal" id="tbLegal"></div>' +
      '</div>' +
      '</section></div>';
    R = {
      list: root.querySelector('#tbList'), slots: root.querySelector('#tbSlots'), edit: root.querySelector('#tbEdit'),
      cover: root.querySelector('#tbCover'), io: root.querySelector('#tbIO'), name: root.querySelector('#tbName'), count: root.querySelector('#tbCount'),
      verSel: root.querySelector('#tbVerSel'), verName: root.querySelector('#tbVerName'), verDel: root.querySelector('#tbVerDel'),
      diff: root.querySelector('#tbDiff'), legal: root.querySelector('#tbLegal'), legalBtn: root.querySelector('#tbLegalBtn'), work: root.querySelector('#tbWork'),
      viewTitle: root.querySelector('#tbViewTitle')
    };
    R.name.value = t.name;
    R.verName.value = cv.name || 'v1';
    work = R.work;
    work.querySelectorAll('.tb-tabs button').forEach(function (b) {
      b.addEventListener('click', function () { setTab(b.dataset.tab); });
    });
    root.querySelectorAll('.tb-view-btn').forEach(function (b) {
      b.addEventListener('click', function () { setTab(tab === b.dataset.view ? 'edit' : b.dataset.view); });
    });
    syncTab();
    R.verSel.addEventListener('change', function () { switchVersion(R.verSel.value); });
    R.verDel.addEventListener('click', deleteVersion);
    root.querySelector('#tbShare').addEventListener('click', shareTeam);
    root.querySelector('#tbQrImport').addEventListener('click', scanTeam);
    R.name.addEventListener('input', function () { team().name = R.name.value; persist(); renderList(); });
    R.name.addEventListener('blur', function () { if (!team().name.trim()) { team().name = T('tbDefaultName', store.teams.indexOf(team()) + 1); R.name.value = team().name; persist(); renderList(); } });
    R.verName.addEventListener('input', function () {
      var v = curVersion();
      v.name = R.verName.value;
      persist(); renderVersions(); renderList();
    });
    R.verName.addEventListener('blur', function () {
      var v = curVersion();
      if (!v.name || !v.name.trim()) {
        v.name = 'v' + (team().versions.indexOf(v) + 1);
        R.verName.value = v.name;
        persist(); renderVersions(); renderList();
      }
    });
    root.querySelector('#tbVerAdd').addEventListener('click', function () {
      var tm = team();
      var nv = { id: newId(), name: nextVerName(tm), mons: clone(tm.mons) };
      tm.versions.push(nv);
      tm.curVer = nv.id;
      ensureVersions(tm);
      persist();
      render();
      A.toast(de ? 'Neue Version „' + nv.name + '“ erstellt' : 'Created version “' + nv.name + '”');
    });
    root.querySelector('#tbNew').addEventListener('click', function () {
      var v0 = { id: newId(), name: 'v1', mons: [] };
      var nt = { id: newId(), name: T('tbDefaultName', store.teams.length + 1), mons: v0.mons, versions: [v0], curVer: v0.id };
      store.teams.push(nt); store.cur = nt.id; sel = 0; persist(); render();
      setTimeout(function () { var i = root.querySelector('.tb-pick input'); if (i) i.focus(); }, 30);
    });
    root.querySelector('#tbImport').addEventListener('click', openImport);
    root.querySelector('#tbExport').addEventListener('click', function () {
      var tm = team(), v = curVersion(tm);
      var title = tm.name + (tm.versions.length > 1 ? ' (' + v.name + ')' : '');
      // the export dialog doubles as import: copy the text, or edit/replace it and import it back
      openImport({
        title: (de ? 'Team exportieren / importieren' : 'Export / import team') + ': ' + title,
        text: tm.mons.map(function (m) { return A.exportSet(m.set, m.setName, m.species); }).join('\n\n')
      });
    });
    root.querySelector('#tbSheet').addEventListener('click', function () {
      var tm = team();
      if (window.CCTeamsheet) window.CCTeamsheet.open({ name: tm.name, mons: curVersion(tm).mons });
    });
    root.querySelector('#tbMeta').addEventListener('click', function () {
      var tm = team();
      if (window.RLMeta) window.RLMeta.open({ name: tm.name, mons: curVersion(tm).mons.slice() });
    });
    root.querySelector('#tbDup').addEventListener('click', function () {
      var tm = team();
      var copiedVers = (tm.versions || []).map(function (v) { return { id: newId(), name: v.name, mons: clone(v.mons) }; });
      if (!copiedVers.length) copiedVers = [{ id: newId(), name: 'v1', mons: clone(tm.mons) }];
      var curIdx = Math.max(0, tm.versions.indexOf(curVersion(tm)));
      var nt = { id: newId(), name: T('tbCopyName', tm.name), versions: copiedVers, curVer: copiedVers[curIdx].id, mons: copiedVers[curIdx].mons };
      store.teams.splice(store.teams.indexOf(tm) + 1, 0, nt); store.cur = nt.id; persist(); render();
    });
    root.querySelector('#tbDel').addEventListener('click', function () {
      var tm = team();
      ccConfirm(T('tbDeleteConfirm', tm.name), function () {
        var i = store.teams.indexOf(tm);
        snapUndo(de ? 'Team „' + tm.name + '“ gelöscht' : 'Team “' + tm.name + '” deleted');
        store.teams.splice(i, 1);
        if (!store.teams.length) store.teams.push({ id: newId(), name: T('tbDefaultName', 1), mons: [] });
        store.cur = store.teams[Math.max(0, i - 1)].id; sel = 0; persist(); render();
      }, { danger: true });
    });
    [['#tbToYou', 0, 'tbSentYou'], ['#tbToFoe', 1, 'tbSentFoe']].forEach(function (b) {
      root.querySelector(b[0]).addEventListener('click', function () {
        var tm = team();
        if (!tm.mons.length) { A.toast(T('tbEmptyTeam')); return; }
        A.setCalcTeam(b[1], tm.mons, { team: tm.id, ver: tm.curVer });
        A.showView('calc');
        A.toast(T(b[2]));
      });
    });
    renderVersions(); renderList(); renderSlots(); renderEditor(); renderCover();
  }

  function versionLabel(v, idx) { return (v.name || ('v' + (idx + 1))) + ' · ' + T('tbMonCount', (v.mons || []).length); }
  function renderVersions() {
    if (!R.verSel) return;
    var tm = team();
    ensureVersions(tm);
    R.verSel.innerHTML = '';
    tm.versions.forEach(function (v, idx) {
      var o = el('option', { value: v.id, text: versionLabel(v, idx) });
      if (v.id === tm.curVer) o.selected = true;
      R.verSel.appendChild(o);
    });
    R.verDel.disabled = tm.versions.length < 2;
  }
  function switchVersion(id) {
    var tm = team();
    if (tm.curVer === id) return;
    tm.curVer = id;
    ensureVersions(tm);
    if (sel > tm.mons.length) sel = Math.min(tm.mons.length, 5);
    persist();
    render();
  }
  function deleteVersion() {
    var tm = team(), v = curVersion(tm);
    if (tm.versions.length < 2) return;
    var vName = v.name || ('v' + (tm.versions.indexOf(v) + 1));
    ccConfirm(de ? 'Version „' + vName + '“ wirklich löschen?' : 'Delete version “' + vName + '”?', function () {
      var vi = tm.versions.indexOf(v);
      snapUndo(de ? 'Version „' + vName + '“ gelöscht' : 'Version “' + vName + '” deleted');
      if (vi !== -1) tm.versions.splice(vi, 1);
      tm.curVer = tm.versions[Math.max(0, vi - 1)].id;
      if (diffSel.a === v.id) diffSel.a = null;
      if (diffSel.b === v.id) diffSel.b = null;
      ensureVersions(tm);
      if (sel > tm.mons.length) sel = tm.mons.length;
      persist();
      render();
    }, { danger: true, title: ['Version löschen', 'Delete version'] });
  }
  // lower panel: tabs (Pokémon, import/export) and the views from the version bar (coverage, compare, rules)
  var VIEW_TITLES = { cover: function () { return T('tbWeak'); }, diff: function () { return de ? 'Versionen vergleichen' : 'Compare versions'; }, legal: function () { return de ? 'Regel-Check' : 'Rule check'; } };
  function syncTab() {
    if (!work) return;
    work.className = 'panel tb-work tab-' + tab;
    work.querySelectorAll('.tb-tabs button').forEach(function (x) { x.classList.toggle('on', x.dataset.tab === tab); });
    root.querySelectorAll('.tb-view-btn').forEach(function (x) { var on = x.dataset.view === tab; x.classList.toggle('on', on); x.setAttribute('aria-pressed', on ? 'true' : 'false'); });
    if (R.viewTitle) R.viewTitle.textContent = VIEW_TITLES[tab] ? VIEW_TITLES[tab]() : '';
  }
  // opens one Pokémon in the editor, switching to its version first (comparison cards can come from another version)
  function openMon(verId, mon) {
    var tm = team();
    tab = 'edit';
    if (verId && tm.curVer !== verId && tm.versions.some(function (v) { return v.id === verId; })) { tm.curVer = verId; ensureVersions(tm); persist(); }
    var i = tm.mons.indexOf(mon);
    sel = i >= 0 ? i : Math.min(sel, tm.mons.length);
    render();
  }
  function setTab(t) {
    tab = VIEW_TABS.indexOf(t) === -1 ? 'edit' : t;
    syncTab();
    if (tab === 'io') renderIO(true);
    if (tab === 'diff') renderDiff();
    if (tab === 'legal') renderLegal();
  }

  function renderList() {
    R.list.innerHTML = '';
    store.teams.forEach(function (tm) {
      ensureVersions(tm);
      var row = el('div', { class: 'tb-team' + (tm.id === store.cur ? ' on' : '') });
      var top = el('div', { class: 'tb-team-top' });
      top.appendChild(el('span', { class: 'tb-team-name', text: tm.name || '–' }));
      if (tm.versions.length > 1) {
        var cv = curVersion(tm);
        top.appendChild(el('span', { class: 'tb-team-vbadge', text: (cv.name || 'v1') + ' · ' + tm.versions.length + 'v', title: de ? tm.versions.length + ' Versionen' : tm.versions.length + ' versions' }));
      }
      top.appendChild(el('span', { class: 'tb-team-n', text: T('tbMonCount', tm.mons.length) }));
      row.appendChild(top);
      var mini = el('div', { class: 'tb-team-mons' });
      for (var i = 0; i < 6; i++) {
        var c = el('span', { class: 'tb-mini' + (tm.mons[i] ? '' : ' empty') });
        if (tm.mons[i]) c.appendChild(A.spriteFit(spriteOf(tm.mons[i]), tm.mons[i].set.shiny));
        mini.appendChild(c);
      }
      row.appendChild(mini);
      if (tm.versions.length > 1) {
        var vbar = el('div', { class: 'tb-team-vers' });
        tm.versions.forEach(function (v, idx) {
          var vp = el('button', { type: 'button', class: 'tb-mini-ver' + (v.id === tm.curVer ? ' on' : ''), text: v.name || ('v' + (idx + 1)) });
          vp.addEventListener('click', function (ev) {
            ev.stopPropagation();
            store.cur = tm.id;
            tm.curVer = v.id;
            ensureVersions(tm);
            if (sel > tm.mons.length) sel = Math.min(tm.mons.length, 5);
            persist();
            render();
          });
          vbar.appendChild(vp);
        });
        row.appendChild(vbar);
      }
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
      card.addEventListener('click', function () {
        if (sel !== i) { sel = i; renderSlots(); renderEditor(); renderLegal(); }
        if (tab !== 'edit' && tab !== 'io') setTab('edit'); // aus Typ-Abdeckung, Vergleich oder Regel-Check in die Pokémon-Ansicht
      });
      card.draggable = true;
      card.addEventListener('dragstart', function (ev) {
        ev.dataTransfer.effectAllowed = 'move';
        try { ev.dataTransfer.setData('text/plain', String(i)); } catch (e) { /* ignore */ }
        dragFrom = i; card.classList.add('dragging');
      });
      card.addEventListener('dragend', function () { dragFrom = -1; card.classList.remove('dragging'); R.slots.querySelectorAll('.drop-over').forEach(function (n) { n.classList.remove('drop-over'); }); });
      card.addEventListener('dragover', function (ev) { if (dragFrom < 0) return; ev.preventDefault(); ev.dataTransfer.dropEffect = 'move'; card.classList.add('drop-over'); });
      card.addEventListener('dragleave', function () { card.classList.remove('drop-over'); });
      card.addEventListener('drop', function (ev) {
        ev.preventDefault();
        var from = dragFrom; dragFrom = -1;
        if (from < 0 || from === i) return;
        var mv = tm.mons.splice(from, 1)[0]; tm.mons.splice(i, 0, mv);
        sel = i; persist(); renderSlots(); renderList(); renderCover(); renderEditor();
      });
      R.slots.appendChild(card);
    })(i);
  }
  function removeMember(i) {
    var tm = team();
    snapUndo(de ? 'Pokémon entfernt' : 'Pokémon removed');
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
    function draw(showAll) {
      speciesSorted = speciesSorted || A.sortedBy(A.SPECIES, A.nSpecies);
      var q = showAll ? '' : input.value.trim().toLowerCase();
      var hits = speciesSorted.filter(function (s) { return !q || (s + ' ' + A.nSpecies(s)).toLowerCase().indexOf(q) !== -1; });
      if (q) hits.sort(function (a, b) {
        var sa = A.nSpecies(a).toLowerCase().indexOf(q) === 0 || a.toLowerCase().indexOf(q) === 0 ? 0 : 1;
        var sb = A.nSpecies(b).toLowerCase().indexOf(q) === 0 || b.toLowerCase().indexOf(q) === 0 ? 0 : 1;
        return sa - sb;
      });
      shown = hits; nodes = []; list.innerHTML = '';
      if (!shown.length) list.appendChild(el('div', { class: 'picker-empty', text: T('noHits') }));
      var currentNode = null;
      shown.forEach(function (s, i) {
        var isCurrent = m && m.species === s;
        var it = el('div', { class: 'picker-item tb-pick-item' + (i === active ? ' active' : '') + (isCurrent ? ' current' : '') });
        var ic = el('span', { class: 'pk-mini' }); ic.appendChild(A.spriteImg(s)); it.appendChild(ic);
        it.appendChild(el('span', { text: A.nSpecies(s) }));
        var tw = el('span', { class: 'pk-types' }); typesOf(s).forEach(function (t) { tw.appendChild(A.typeBadge(t)); }); it.appendChild(tw);
        it.addEventListener('mousedown', function (ev) { ev.preventDefault(); pick(s); });
        list.appendChild(it); nodes.push(it);
        if (isCurrent) currentNode = it;
      });
      list.classList.add('open');
      if (showAll && currentNode) {
        currentNode.scrollIntoView({ block: 'center' });
      } else {
        list.scrollTop = 0;
      }
    }
    function pick(s) { list.classList.remove('open'); input.blur(); onChoose(s); }
    function hl() {
      nodes.forEach(function (n, i) { n.classList.toggle('active', i === active); });
      var n = nodes[active];
      if (n) n.scrollIntoView({ block: 'nearest' });
    }
    function open() {
      active = -1;
      draw(true);
      input.select();
    }
    input.addEventListener('focus', function () {
      open();
      setTimeout(function () { input.select(); }, 0);
    });
    input.addEventListener('click', function () {
      open();
    });
    input.addEventListener('input', function () { active = -1; draw(false); list.scrollTop = 0; });
    input.addEventListener('blur', function () { list.classList.remove('open'); if (m) input.value = A.nSpecies(m.species); });
    input.addEventListener('keydown', function (ev) {
      if (ev.key === 'ArrowDown') { active = Math.min(shown.length - 1, active + 1); hl(); ev.preventDefault(); }
      else if (ev.key === 'ArrowUp') { active = Math.max(0, active - 1); hl(); ev.preventDefault(); }
      else if (ev.key === 'Enter') {
        var s = shown[active >= 0 ? active : 0];
        if (s) pick(s);
        ev.preventDefault();
      }
      else if (ev.key === 'Tab' && !ev.shiftKey && input.value.trim()) { var s2 = shown[active >= 0 ? active : 0]; if (s2) pick(s2); } // Tab übernimmt den Treffer und springt weiter
      else if (ev.key === 'Escape') { input.blur(); }
    });
    return wrap;
  }

  // ---------------- editor for one team member ----------------
  function renderEditor() {
    renderIO(true);
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
    var pList = presetsFor(m.species);
    var curIdx = -1;
    pList.forEach(function (e, i) {
      if (e.name === m.setName) curIdx = i;
    });
    pre.innerHTML = '<option value="">' + A.esc(T('tbPreset')) + '</option>' + pList.map(function (e, i) {
      return '<option value="' + i + '"' + (i === curIdx ? ' selected' : '') + '>' + A.esc(A.nSetName(e.name) + (e.src ? ' · ' + e.src : '')) + '</option>';
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

    var btnSave = el('button', { class: 'tbtn tb-btn-save', title: A.T('saveSet') });
    btnSave.innerHTML = '<span style="font-size:12px;margin-right:4px;">💾</span>' + A.esc(de ? 'Set speichern' : 'Save Set');
    btnSave.addEventListener('click', function () {
      var suggestion = (m.setName && m.setName !== 'Blank Set' && m.setName !== 'Set') ? m.setName : (nick.value.trim() || A.T('mySet'));
      var input = window.prompt(A.T('setPrompt', A.nSpecies(m.species)), suggestion);
      if (input === null) return;
      var name = input.trim() || suggestion;
      m.setName = name;
      nick.value = name;
      A.saveCustomSet(m.species, name, m.set);
      A.toast(A.T('setSaved', name));
      persist();
      renderEditor();
    });
    head.appendChild(btnSave);

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
    // a move outside the Champions learnset (imported) stays selectable and is marked with ⚠
    function moveList(cur) { return cur && moveOpts.indexOf(cur) === -1 ? [cur].concat(moveOpts) : moveOpts; }
    function drawMoves() {
      mvBox.innerHTML = '';
      for (var k = 0; k < 4; k++) mvBox.appendChild(moveCard(k));
    }
    function openMovePick(k) {
      var cur = set.moves[k] || '';
      openPicker({
        kind: 'move', title: T('pkMove') + ' ' + (k + 1) + '/4 · ' + A.nSpecies(baseForme(m)), list: moveList(cur), cur: cur,
        legal: moveOpts, used: set.moves.filter(function (x, i) { return i !== k; }), none: cur ? T('pkNoMove') : '',
        onPick: function (v, next) {
          var slots = [0, 1, 2, 3].map(function (i) { return set.moves[i] || ''; });
          slots[k] = v;
          set.moves = slots.filter(Boolean);
          changed(); drawMoves();
          // per Tab gewählt: gleich den nächsten freien Attacken-Slot öffnen
          if (next && v && set.moves.length < 4) setTimeout(function () { openMovePick(set.moves.length); }, 30);
        }
      });
    }
    function moveCard(k) {
      var card = el('div', { class: 'tb-movecard' });
      var cur = set.moves[k] || '', d = MOVES[cur];
      card.style.borderLeftColor = d ? (A.TYPE_COLORS[d.type] || '') : '';
      var btn = el('button', { class: 'tb-pickbtn' + (d ? '' : ' empty'), title: T('pkMove') });
      if (d) btn.appendChild(typeIcon(d.type));
      btn.appendChild(el('span', { class: 'nm', text: d ? A.nMove(cur) + (moveOpts.indexOf(cur) === -1 ? ' ⚠' : '') : T('pkAddMove') }));
      btn.appendChild(el('span', { class: 'caret', text: '▾' }));
      btn.addEventListener('click', function () { openMovePick(k); });
      card.appendChild(btn);
      var info = el('div', { class: 'tb-move-info' });
      if (!d) info.appendChild(el('span', { class: 'tb-cat', text: T('tbMoveN', k + 1) }));
      else {
        info.appendChild(A.typeBadge(d.type));
        info.appendChild(el('span', { class: 'tb-cat', text: nCat(d.category) }));
        var nums = el('span', { class: 'tb-bp' }), acc = accOf(cur), pp = ppOf(cur);
        if (d.bp) nums.appendChild(el('span', { text: T('tbPower', d.bp) }));
        if (acc === true) { if (d.category !== 'Status') nums.appendChild(el('span', { text: T('tbAccAlways') })); }
        else if (acc != null) nums.appendChild(el('span', { class: acc < 100 ? 'low' : '', text: T('tbAcc', acc) }));
        if (pp != null) nums.appendChild(el('span', { text: T('tbPP', pp) }));
        info.appendChild(nums);
      }
      card.appendChild(info);
      var md = d ? descOf('moves', cur) : '';
      if (md) card.appendChild(el('div', { class: 'tb-pick-desc one', text: md, title: md }));
      return card;
    }
    drawMoves();

    // --- item ---
    var itBox = box('tb-area-item', T('item'));
    var itBody = el('div'); itBox.appendChild(itBody);
    var items = A.sortedBy(A.ITEMS.filter(function (x) { return x !== '(none)'; }), A.nItem);
    function drawItem() {
      itBody.innerHTML = '';
      var cur = set.item || '(none)', has = cur !== '(none)';
      var btn = el('button', { class: 'tb-pickbtn' + (has ? '' : ' empty'), title: T('pkItem') });
      if (has) btn.appendChild(itemIcon(cur));
      btn.appendChild(el('span', { class: 'nm', text: has ? A.nItem(cur) + (items.indexOf(cur) === -1 ? ' ⚠' : '') : A.kindLabel('item', cur) }));
      btn.appendChild(el('span', { class: 'caret', text: '▾' }));
      btn.addEventListener('click', function () {
        openPicker({
          kind: 'item', title: T('pkItem') + ' · ' + A.nSpecies(baseForme(m)), list: has && items.indexOf(cur) === -1 ? [cur].concat(items) : items, cur: has ? cur : '',
          legal: items, fit: function (v) { return !!A.megaFormeFor(m.species, v); }, none: has ? T('pkNoItem') : '',
          onPick: function (v) { set.item = v || '(none)'; changed(); renderEditor(); }
        });
      });
      itBody.appendChild(btn);
      var idesc = has ? descOf('items', cur) : '';
      if (idesc) itBody.appendChild(el('div', { class: 'tb-pick-desc', text: idesc, title: idesc }));
    }
    drawItem();

    // --- ability: in a Mega / battle form with its own ability that one is shown ---
    var abBox = box('tb-area-ability', T('ability'));
    var abBody = el('div'); abBox.appendChild(abBody);
    var abil = A.legalAbilities(baseForme(m)) || A.ABILITIES;
    if (!set.ability) set.ability = abil[0];
    var abilSorted = A.sortedBy(abil, A.nAbility);
    var formAb = view !== baseForme(m) && DEX[view] && DEX[view].ab && view.indexOf('Mega ') === 0 ? DEX[view].ab : null;
    function drawAbility() {
      abBody.innerHTML = '';
      if (formAb) {
        abBody.appendChild(el('div', { class: 'tb-fixed-ab', text: A.nAbility(formAb) }));
        var fd = descOf('abilities', formAb);
        if (fd) abBody.appendChild(el('div', { class: 'tb-pick-desc', text: fd, title: fd }));
        abBody.appendChild(el('div', { class: 'tb-note', text: T('tbAbInForm', A.nSpecies(view)) + ' · ' + T('tbAbNormal', A.nAbility(set.ability)) }));
        return;
      }
      var cur = set.ability, btn = el('button', { class: 'tb-pickbtn', title: T('pkAbility') });
      btn.appendChild(el('span', { class: 'nm', text: A.nAbility(cur) + (abilSorted.indexOf(cur) === -1 ? ' ⚠' : '') }));
      btn.appendChild(el('span', { class: 'caret', text: '▾' }));
      btn.addEventListener('click', function () {
        openPicker({
          kind: 'ability', title: T('pkAbility') + ' · ' + A.nSpecies(baseForme(m)), list: abilSorted.indexOf(cur) === -1 ? [cur].concat(abilSorted) : abilSorted, cur: cur,
          legal: abilSorted, none: '', onPick: function (v) { set.ability = v; changed(); drawAbility(); }
        });
      });
      abBody.appendChild(btn);
      var ad = descOf('abilities', cur);
      if (ad) abBody.appendChild(el('div', { class: 'tb-pick-desc', text: ad, title: ad }));
      if (mega && DEX[mega].ab && view !== mega) abBody.appendChild(el('div', { class: 'tb-note', text: T('tbMega') + ': ' + A.nAbility(DEX[mega].ab) }));
    }
    drawAbility();

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

  // ---------------- picker windows: moves, items, abilities ----------------
  // Own window like the nature picker. Search field, filters (moves), one row per entry with a symbol (type symbol for moves,
  // item symbol for items, none for abilities) and its effect text, like the lists on Showdown.
  // cfg: { kind: 'move'|'item'|'ability', title, list: [names], cur, legal: [names that are legal], used: [names already taken],
  //        fit(name) (items: belongs to this Pokémon), none: label of the "remove" button or '', onPick(name | '') }
  var pickModal = null, pickKey = null;
  function closePicker() {
    if (!pickModal) return;
    pickModal.remove(); pickModal = null;
    document.removeEventListener('keydown', pickKey, true); pickKey = null;
  }
  var CAT_KEYS = ['Physical', 'Special', 'Status'];
  function openPicker(cfg) {
    closePicker();
    var kind = cfg.kind, isMove = kind === 'move', isItem = kind === 'item';
    var kk = isMove ? 'moves' : isItem ? 'items' : 'abilities';
    var stones = window.MEGA_STONE_USER_LOOKUP || {};
    var used = {}, legalSet = {};
    (cfg.used || []).forEach(function (v) { used[v] = 1; });
    (cfg.legal || []).forEach(function (v) { legalSet[v] = 1; });

    // one record per entry, built once
    var rows = cfg.list.map(function (v) {
      var r = { v: v, desc: descOf(kk, v), warn: !legalSet[v] };
      r.name = isMove ? A.nMove(v) : isItem ? A.nItem(v) : A.nAbility(v);
      r.hay = (r.name + ' ' + v).toLowerCase();
      if (isMove) {
        var d = MOVES[v] || {}, a = accOf(v);
        r.type = d.type; r.cat = d.category; r.bp = d.bp || 0; r.pp = ppOf(v);
        r.acc = a === true ? 1000 : a == null ? -1 : a; r.never = a === true;
        r.hay2 = (A.nType(d.type) + ' ' + d.type + ' ' + nCat(d.category) + ' ' + r.desc).toLowerCase();
      } else r.hay2 = r.desc.toLowerCase();
      if (isItem) r.group = cfg.fit && cfg.fit(v) ? 0 : stones[v] ? 3 : / Berry$/.test(v) ? 2 : 1;
      return r;
    });

    var q = '', typeSel = '', catSel = '', sortKey = 'name', sortDir = 1, shown = [], nodes = [], active = -1;

    // ---- window ----
    pickModal = el('div', { class: 'modal pick-modal' });
    var bx = el('div', { class: 'modal-box pick-box pick-w-' + kind });
    var head = el('div', { class: 'pick-head' });
    head.appendChild(el('h3', { text: cfg.title }));
    var input = el('input', { class: 'pick-search', type: 'text', spellcheck: 'false', autocomplete: 'off', placeholder: T(isMove ? 'pkSearchMove' : isItem ? 'pkSearchItem' : 'pkSearchAbility') });
    head.appendChild(input);
    var x = el('button', { class: 'icon-btn', text: '✕', title: T('close') });
    x.addEventListener('click', closePicker);
    head.appendChild(x);
    bx.appendChild(head);

    // ---- filters (moves): type symbols and category ----
    var typeBtns = {}, catBtns = {}, reset = null;
    function syncFilters() {
      Object.keys(typeBtns).forEach(function (t) { typeBtns[t].classList.toggle('on', typeSel === t); });
      Object.keys(catBtns).forEach(function (c) { catBtns[c].classList.toggle('on', catSel === c); });
      if (reset) reset.hidden = !typeSel && !catSel;
    }
    if (isMove) {
      var filt = el('div', { class: 'pick-filters' });
      var tw = el('div', { class: 'pick-types' });
      C.TYPES.forEach(function (t) {
        var b = el('button', { class: 'pick-type', title: A.nType(t) });
        b.appendChild(typeIcon(t));
        b.addEventListener('click', function () { typeSel = typeSel === t ? '' : t; syncFilters(); renderList(); input.focus(); });
        typeBtns[t] = b; tw.appendChild(b);
      });
      filt.appendChild(tw);
      var cw = el('div', { class: 'pick-cats' });
      CAT_KEYS.forEach(function (c) {
        var b = el('button', { class: 'pick-catbtn ' + c.toLowerCase(), text: nCat(c) });
        b.addEventListener('click', function () { catSel = catSel === c ? '' : c; syncFilters(); renderList(); input.focus(); });
        catBtns[c] = b; cw.appendChild(b);
      });
      reset = el('button', { class: 'pick-reset', text: '✕ ' + T('pkClearFilter') });
      reset.hidden = true;
      reset.addEventListener('click', function () { typeSel = ''; catSel = ''; syncFilters(); renderList(); input.focus(); });
      cw.appendChild(reset);
      filt.appendChild(cw);
      bx.appendChild(filt);
    }

    // ---- column heads (moves): click sorts ----
    var colEls = {};
    function drawCols() {
      Object.keys(colEls).forEach(function (k) {
        colEls[k].classList.toggle('on', sortKey === k);
        colEls[k].dataset.dir = sortKey === k ? (sortDir > 0 ? '▲' : '▼') : '';
      });
    }
    if (isMove) {
      var cols = el('div', { class: 'pick-row pick-move pick-cols' });
      [['type', 'pkColType', 'c'], ['name', 'pkColMove', ''], ['cat', 'pkColCat', ''], ['bp', 'pkColPower', 'n'], ['acc', 'pkColAcc', 'n'], ['pp', 'pkColPP', 'n'], [null, 'pkColEffect', '']].forEach(function (c) {
        var h = el('span', { class: 'pick-col ' + c[2] + (c[0] ? ' sortable' : ''), text: T(c[1]) });
        if (c[0]) {
          h.title = T('pkSortT', T(c[1]));
          h.addEventListener('click', function () {
            if (sortKey === c[0]) sortDir = -sortDir; else { sortKey = c[0]; sortDir = (c[0] === 'bp' || c[0] === 'acc' || c[0] === 'pp') ? -1 : 1; }
            drawCols(); renderList(); list.scrollTop = 0;
          });
          colEls[c[0]] = h;
        }
        cols.appendChild(h);
      });
      bx.appendChild(cols);
    }

    var list = el('div', { class: 'pick-list' });
    bx.appendChild(list);

    // ---- footer ----
    var foot = el('div', { class: 'pick-foot' });
    if (cfg.none) {
      var nb = el('button', { class: 'tbtn danger', text: cfg.none });
      nb.addEventListener('click', function () { closePicker(); cfg.onPick(''); });
      foot.appendChild(nb);
    }
    var count = el('span', { class: 'pick-count' });
    foot.appendChild(count);
    foot.appendChild(el('span', { class: 'pick-hint', text: T('pkHint') }));
    bx.appendChild(foot);
    pickModal.appendChild(bx);
    document.body.appendChild(pickModal);

    function choose(v, next) { closePicker(); cfg.onPick(v, next); }

    function buildRow(r) {
      var row = el('div', { class: 'pick-row pick-' + kind + (r.v === cfg.cur ? ' cur' : '') + (used[r.v] ? ' used' : '') });
      if (isMove) { var ic = el('span', { class: 'pick-ic' }); ic.appendChild(typeIcon(r.type)); row.appendChild(ic); }
      else if (isItem) { var ic2 = el('span', { class: 'pick-ic' }); ic2.appendChild(itemIcon(r.v)); row.appendChild(ic2); }
      var nm = el('span', { class: 'pick-name' });
      nm.appendChild(el('span', { class: 'pick-nm', text: r.name }));
      if (r.warn) nm.appendChild(el('span', { class: 'pick-warn', text: '⚠', title: T('notLegal') }));
      if (used[r.v]) nm.appendChild(el('span', { class: 'pick-tag', text: T('pkUsed') }));
      row.appendChild(nm);
      if (isMove) {
        row.appendChild(el('span', { class: 'pick-catc ' + (r.cat || '').toLowerCase(), text: nCat(r.cat) }));
        row.appendChild(el('span', { class: 'pick-num', text: r.bp ? String(r.bp) : '–' }));
        row.appendChild(el('span', { class: 'pick-num' + (r.acc >= 0 && r.acc < 100 ? ' low' : ''), title: r.never ? T('tbAccAlways') : T('pkAccT'), text: r.acc < 0 || r.never ? '–' : String(r.acc) }));
        row.appendChild(el('span', { class: 'pick-num', title: T('pkPPT'), text: r.pp != null ? String(r.pp) : '–' }));
      }
      row.appendChild(el('span', { class: 'pick-desc', text: r.desc }));
      if (!used[r.v]) row.addEventListener('click', function () { choose(r.v); });
      return row;
    }
    function hl(scroll) {
      nodes.forEach(function (n, i) { n.classList.toggle('active', i === active); });
      if (scroll && nodes[active]) nodes[active].scrollIntoView({ block: 'nearest' });
    }
    function step(d) {
      if (!shown.length) return;
      var i = active, n = Math.abs(d), dir = d < 0 ? -1 : 1;
      while (n > 0) {
        var j = i + dir;
        while (j >= 0 && j < shown.length && used[shown[j].v]) j += dir; // keyboard skips what is already taken
        if (j < 0 || j >= shown.length) break;
        i = j; n--;
      }
      if (i === -1) { i = 0; while (i < shown.length && used[shown[i].v]) i++; }
      active = Math.min(i, shown.length - 1); hl(true);
    }

    function renderList() {
      var toks = q.split(/\s+/).filter(Boolean);
      var out = rows.filter(function (r) {
        if (typeSel && r.type !== typeSel) return false;
        if (catSel && r.cat !== catSel) return false;
        r.rank = 0;
        if (!toks.length) return true;
        if (toks.every(function (t) { return r.hay.indexOf(t) !== -1; })) { r.rank = (' ' + r.hay).indexOf(' ' + toks[0]) !== -1 ? 0 : 1; return true; }
        r.rank = 2; // found only in the type or the effect text
        return toks.every(function (t) { return r.hay.indexOf(t) !== -1 || r.hay2.indexOf(t) !== -1; });
      });
      out.sort(function (a, b) {
        if (a.rank !== b.rank) return a.rank - b.rank;
        if (isItem && !toks.length && a.group !== b.group) return a.group - b.group;
        var byName = a.name.localeCompare(b.name, A.LANG), c = 0;
        if (!isMove || sortKey === 'name') return byName * (isMove ? sortDir : 1);
        if (sortKey === 'type') c = A.nType(a.type).localeCompare(A.nType(b.type), A.LANG);
        else if (sortKey === 'cat') c = CAT_KEYS.indexOf(a.cat) - CAT_KEYS.indexOf(b.cat);
        else if (sortKey === 'bp') c = a.bp - b.bp;
        else if (sortKey === 'acc') c = a.acc - b.acc;
        else if (sortKey === 'pp') c = (a.pp == null ? -1 : a.pp) - (b.pp == null ? -1 : b.pp);
        return c * sortDir || byName;
      });
      shown = out; nodes = []; list.innerHTML = '';
      if (!out.length) list.appendChild(el('div', { class: 'pick-empty', text: T('noHits') }));
      var frag = document.createDocumentFragment(), lastG = -1;
      var groupKeys = ['pkGroupFit', 'pkGroupItems', 'pkGroupBerries', 'pkGroupStones'];
      out.forEach(function (r) {
        if (isItem && !toks.length && r.group !== lastG) { lastG = r.group; frag.appendChild(el('div', { class: 'pick-group', text: T(groupKeys[r.group]) })); }
        var row = buildRow(r);
        nodes.push(row); frag.appendChild(row);
      });
      list.appendChild(frag);
      count.textContent = T('pkCount', out.length, rows.length);
      active = toks.length && out.length ? step0() : -1;
      hl(false);
    }
    function step0() { var i = 0; while (i < shown.length && used[shown[i].v]) i++; return i < shown.length ? i : -1; }

    input.addEventListener('input', function () { q = input.value.trim().toLowerCase(); renderList(); list.scrollTop = 0; });
    pickKey = function (ev) {
      if (ev.key === 'Escape') { ev.stopPropagation(); closePicker(); return; }
      if (ev.target && ev.target.tagName === 'BUTTON') return; // a focused button keeps its own Enter
      if (ev.key === 'ArrowDown') { step(1); ev.preventDefault(); }
      else if (ev.key === 'ArrowUp') { step(-1); ev.preventDefault(); }
      else if (ev.key === 'PageDown') { step(8); ev.preventDefault(); }
      else if (ev.key === 'PageUp') { step(-8); ev.preventDefault(); }
      else if (ev.key === 'Enter') {
        var r = shown[active >= 0 ? active : step0()];
        if (r && !used[r.v]) choose(r.v);
        ev.preventDefault();
      } else if (ev.key === 'Tab' && !ev.shiftKey && ev.target === input) {
        // Tab: Treffer übernehmen und bei Attacken gleich den nächsten freien Slot öffnen
        var rt = shown[active >= 0 ? active : step0()];
        if (rt && !used[rt.v]) choose(rt.v, true);
        ev.preventDefault();
      }
    };
    document.addEventListener('keydown', pickKey, true);
    pickModal.addEventListener('mousedown', function (ev) { if (ev.target === pickModal) closePicker(); });

    drawCols(); syncFilters(); renderList();
    // start on the current choice: scroll to it, arrow keys continue from there
    var curIdx = -1;
    shown.forEach(function (r, i) { if (r.v === cfg.cur) curIdx = i; });
    if (curIdx >= 0) { active = curIdx; hl(false); nodes[curIdx].scrollIntoView({ block: 'center' }); }
    input.focus();
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
    renderIO(false);
    var tm = team();
    R.cover.innerHTML = '';
    renderViews();
    if (!tm.mons.length) { R.cover.appendChild(el('div', { class: 'tb-empty', text: T('tbEmptyTeam') })); return; }
    var tbl = el('table', { class: 'tb-cover-table' });
    var defs = tm.mons.map(function (m) {
      var f = battleForme(m), ab = f.indexOf('Mega ') === 0 && DEX[f].ab ? DEX[f].ab : m.set.ability;
      return { f: f, types: typesOf(f), ab: ab, m: m };
    });
    tbl.innerHTML = '';
    var trh = el('tr'); trh.appendChild(el('th'));
    defs.forEach(function (d) {
      var th = el('th'); var s = el('button', { type: 'button', class: 'tb-cv-mon tb-jump', title: (de ? 'Öffnen: ' : 'Open: ') + A.nSpecies(d.f) });
      s.appendChild(A.spriteFit(spriteOf(d.m), d.m.set.shiny)); th.appendChild(s); trh.appendChild(th);
      s.addEventListener('click', function () { openMon(curVersion().id, d.m); });
    });
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
  // after every change of the team: rule check, version list and (when open) the comparison
  function renderViews() {
    renderVersions();
    renderLegal();
    if (tab === 'diff') renderDiff();
  }

  // ---------------- compare versions ----------------
  function exportText(mons) { return mons.map(function (m) { return A.exportSet(m.set, m.setName, m.species); }).join('\n\n'); }
  function noItem(x) { return !x || x === '(none)'; }
  function itemText(x) { return noItem(x) ? (de ? 'kein Item' : 'no item') : A.nItem(x); }
  function genderText(g) { return g === 'M' ? '♂' : g === 'F' ? '♀' : '–'; }
  function movesOf(m) { return ((m.set && m.set.moves) || []).filter(function (x) { return x && x !== '(No Move)'; }); }
  // pairs the Pokémon of two versions by species: [{ a, b }] (a or b missing = removed / added)
  function pairMons(A1, B1) {
    var used = {}, out = [];
    B1.forEach(function (mb) {
      var k = A.baseOf(mb.species), hit = -1;
      A1.some(function (ma, i) { if (!used[i] && A.baseOf(ma.species) === k) { hit = i; return true; } return false; });
      if (hit >= 0) used[hit] = 1;
      out.push({ a: hit >= 0 ? A1[hit] : null, b: mb });
    });
    A1.forEach(function (ma, i) { if (!used[i]) out.push({ a: ma, b: null }); });
    return out;
  }
  function diffFields(a, b) {
    var sa = a.set || {}, sb = b.set || {};
    var rows = [
      { k: 'forme', label: de ? 'Form' : 'Form', a: A.nSpecies(baseForme(a)), b: A.nSpecies(baseForme(b)) },
      { k: 'item', label: T('item'), a: itemText(sa.item), b: itemText(sb.item) },
      { k: 'ability', label: de ? 'Fähigkeit' : 'Ability', a: sa.ability ? A.nAbility(sa.ability) : '–', b: sb.ability ? A.nAbility(sb.ability) : '–' },
      { k: 'nature', label: de ? 'Wesen' : 'Nature', a: A.nNature(sa.nature || 'Hardy'), b: A.nNature(sb.nature || 'Hardy') },
      { k: 'gender', label: de ? 'Geschlecht' : 'Gender', a: genderText(sa.gender), b: genderText(sb.gender) },
      { k: 'shiny', label: 'Shiny', a: sa.shiny ? '★' : '–', b: sb.shiny ? '★' : '–' }
    ];
    rows.forEach(function (r) { r.chg = r.a !== r.b; });
    var sp = C.STAT_KEYS.map(function (k) {
      var x = (sa.sps && sa.sps[k]) || 0, y = (sb.sps && sb.sps[k]) || 0;
      return { k: k, a: x, b: y, chg: x !== y };
    });
    var ma = movesOf(a), mb = movesOf(b);
    var moves = [];
    mb.forEach(function (mv) { moves.push({ mv: mv, st: ma.indexOf(mv) !== -1 ? 'same' : 'add' }); });
    ma.forEach(function (mv) { if (mb.indexOf(mv) === -1) moves.push({ mv: mv, st: 'del' }); });
    var any = rows.some(function (r) { return r.chg; }) || sp.some(function (x) { return x.chg; }) || moves.some(function (x) { return x.st !== 'same'; });
    return { rows: rows, sp: sp, moves: moves, changed: any };
  }
  function renderDiff() {
    if (!R.diff) return;
    var tm = team(), vs = tm.versions;
    R.diff.innerHTML = '';
    if (vs.length < 2) {
      var empty = el('div', { class: 'tb-empty tb-diff-empty' });
      empty.appendChild(el('p', { text: de ? 'Zum Vergleichen braucht das Team mindestens zwei Versionen.' : 'Comparing needs at least two versions of the team.' }));
      var mk = el('button', { type: 'button', class: 'primary-btn', text: de ? '+ Neue Version aus der aktuellen' : '+ New version from the current one' });
      mk.addEventListener('click', function () { root.querySelector('#tbVerAdd').click(); setTab('diff'); });
      empty.appendChild(mk);
      R.diff.appendChild(empty);
      return;
    }
    function byId(id) { var r = null; vs.some(function (v) { if (v.id === id) { r = v; return true; } return false; }); return r; }
    var ci = Math.max(0, vs.indexOf(curVersion(tm)));
    if (!byId(diffSel.b)) diffSel.b = vs[ci].id;
    if (!byId(diffSel.a)) diffSel.a = vs[ci > 0 ? ci - 1 : 1].id;
    if (diffSel.a === diffSel.b) diffSel.a = vs[ci > 0 ? ci - 1 : 1].id === diffSel.b ? vs[ci].id : vs[ci > 0 ? ci - 1 : 1].id;
    var va = byId(diffSel.a), vb = byId(diffSel.b);
    // head: A → B, swap, show unchanged
    var head = el('div', { class: 'tb-diff-head' });
    function verSelect(cur, onPick, cls) {
      var s = el('select', { class: 'tb-diff-sel ' + cls });
      vs.forEach(function (v, i) { var o = el('option', { value: v.id, text: versionLabel(v, i) }); if (v.id === cur) o.selected = true; s.appendChild(o); });
      s.addEventListener('change', function () { onPick(s.value); renderDiff(); });
      return s;
    }
    head.appendChild(el('span', { class: 'tb-diff-tag del', text: 'A' }));
    head.appendChild(verSelect(diffSel.a, function (v) { diffSel.a = v; }, 'is-a'));
    var sw = el('button', { type: 'button', class: 'tbtn tb-diff-swap', text: '⇄', title: de ? 'Seiten tauschen' : 'Swap sides' });
    sw.addEventListener('click', function () { var x = diffSel.a; diffSel.a = diffSel.b; diffSel.b = x; renderDiff(); });
    head.appendChild(sw);
    head.appendChild(el('span', { class: 'tb-diff-tag add', text: 'B' }));
    head.appendChild(verSelect(diffSel.b, function (v) { diffSel.b = v; }, 'is-b'));
    var same = el('label', { class: 'nc-check tb-diff-same' });
    var cb = el('input', { type: 'checkbox' }); cb.checked = diffSel.same;
    cb.addEventListener('change', function () { diffSel.same = cb.checked; renderDiff(); });
    same.appendChild(cb); same.appendChild(document.createTextNode(' ' + (de ? 'Unverändertes zeigen' : 'Show unchanged')));
    head.appendChild(same);
    R.diff.appendChild(head);
    if (va === vb) { R.diff.appendChild(el('div', { class: 'tb-empty', text: de ? 'Wähle zwei verschiedene Versionen.' : 'Pick two different versions.' })); return; }

    var pairs = pairMons(va.mons || [], vb.mons || []);
    var n = { chg: 0, add: 0, del: 0, same: 0 };
    var list = el('div', { class: 'tb-diff-list' });
    var LBL = { add: de ? 'Neu in B' : 'New in B', del: de ? 'Nur in A' : 'Only in A', chg: de ? 'Geändert' : 'Changed', same: de ? 'Unverändert' : 'Unchanged' };
    pairs.forEach(function (p) {
      var kind, d = null;
      if (!p.a) kind = 'add'; else if (!p.b) kind = 'del';
      else { d = diffFields(p.a, p.b); kind = d.changed ? 'chg' : 'same'; }
      n[kind]++;
      if (kind === 'same' && !diffSel.same) return;
      var m = p.b || p.a;
      var card = el('div', { class: 'tb-diff-card tb-jump is-' + kind, title: (de ? 'Öffnen: ' : 'Open: ') + A.nSpecies(baseForme(m)) + ' (' + ((p.b ? vb : va).name || '') + ')' });
      card.addEventListener('click', function (ev) { if (ev.target.closest('select, input, label')) return; openMon((p.b ? vb : va).id, m); });
      var ch = el('div', { class: 'tb-diff-card-head' });
      var spr = el('span', { class: 'tb-cv-mon' }); spr.appendChild(A.spriteFit(spriteOf(m), m.set.shiny)); ch.appendChild(spr);
      ch.appendChild(el('strong', { text: A.nSpecies(baseForme(m)) }));
      ch.appendChild(el('span', { class: 'tb-diff-badge is-' + kind, text: LBL[kind] }));
      card.appendChild(ch);
      if (kind === 'add' || kind === 'del') {
        var one = el('div', { class: 'tb-diff-one' });
        one.appendChild(el('span', { text: itemText(m.set.item) + ' · ' + (m.set.ability ? A.nAbility(m.set.ability) : '–') + ' · ' + A.nNature(m.set.nature || 'Hardy') }));
        var mv1 = el('div', { class: 'tb-diff-moves' });
        movesOf(m).forEach(function (mv) { mv1.appendChild(el('span', { class: 'tb-diff-mv ' + kind, text: A.nMove(mv) })); });
        one.appendChild(mv1);
        card.appendChild(one);
      } else {
        var tbl = el('table', { class: 'tb-diff-table' });
        var thr = el('tr'); thr.appendChild(el('th')); thr.appendChild(el('th', { text: 'A · ' + (va.name || '') })); thr.appendChild(el('th', { text: 'B · ' + (vb.name || '') }));
        tbl.appendChild(thr);
        d.rows.forEach(function (r) {
          if (!r.chg && !diffSel.same) return;
          var tr = el('tr', { class: r.chg ? 'chg' : '' });
          tr.appendChild(el('td', { class: 'tb-diff-k', text: r.label }));
          tr.appendChild(el('td', { class: r.chg ? 'del' : '', text: r.a }));
          tr.appendChild(el('td', { class: r.chg ? 'add' : '', text: r.b }));
          tbl.appendChild(tr);
        });
        var spChg = d.sp.some(function (x) { return x.chg; });
        if (diffSel.same || spChg) {
          var trs = el('tr', { class: spChg ? 'chg' : '' });
          trs.appendChild(el('td', { class: 'tb-diff-k', text: 'SP' }));
          var td = el('td', { colspan: '2' });
          var spBox = el('div', { class: 'tb-diff-sp' });
          d.sp.forEach(function (x) {
            if (!x.chg && !diffSel.same) return;
            var c = el('span', { class: 'tb-diff-spc' + (x.chg ? (x.b > x.a ? ' up' : ' down') : '') });
            c.appendChild(el('b', { text: A.nStat(x.k) }));
            c.appendChild(document.createTextNode(' ' + (x.chg ? x.a + ' → ' + x.b + ' (' + (x.b > x.a ? '+' : '') + (x.b - x.a) + ')' : String(x.a))));
            spBox.appendChild(c);
          });
          td.appendChild(spBox); trs.appendChild(td); tbl.appendChild(trs);
        }
        var mvChg = d.moves.some(function (x) { return x.st !== 'same'; });
        if (diffSel.same || mvChg) {
          var trm = el('tr', { class: mvChg ? 'chg' : '' });
          trm.appendChild(el('td', { class: 'tb-diff-k', text: de ? 'Attacken' : 'Moves' }));
          var tdm = el('td', { colspan: '2' });
          var mvb = el('div', { class: 'tb-diff-moves' });
          d.moves.forEach(function (x) {
            mvb.appendChild(el('span', { class: 'tb-diff-mv ' + x.st, text: (x.st === 'add' ? '+ ' : x.st === 'del' ? '− ' : '') + A.nMove(x.mv), title: x.st === 'add' ? (de ? 'neu in B' : 'new in B') : x.st === 'del' ? (de ? 'nur in A' : 'only in A') : '' }));
          });
          tdm.appendChild(mvb); trm.appendChild(tdm); tbl.appendChild(trm);
        }
        card.appendChild(tbl);
      }
      list.appendChild(card);
    });
    var sum = el('div', { class: 'tb-diff-sum' });
    [['chg', de ? 'geändert' : 'changed'], ['add', de ? 'neu' : 'new'], ['del', de ? 'entfernt' : 'removed'], ['same', de ? 'gleich' : 'unchanged']].forEach(function (x) {
      sum.appendChild(el('span', { class: 'tb-diff-badge is-' + x[0] + (n[x[0]] ? '' : ' zero'), text: n[x[0]] + ' ' + x[1] }));
    });
    R.diff.appendChild(sum);
    if (!list.childNodes.length) list.appendChild(el('div', { class: 'tb-empty', text: de ? 'Beide Versionen sind gleich.' : 'Both versions are the same.' }));
    R.diff.appendChild(list);
  }

  // ---------------- rule check (regulation legality) ----------------
  // issues: [{ sev: 'err' | 'warn', i: slot or -1 for the team, text }]
  function legalIssues(mons) {
    var out = [], REG = A.REG_NAME || 'Reg';
    if (!mons.length) return out;
    var bySpecies = {}, byItem = {};
    mons.forEach(function (m, i) {
      var set = m.set || {}, f = baseForme(m), nm = A.nSpecies(f);
      function err(t) { out.push({ sev: 'err', i: i, text: t }); }
      function warn(t) { out.push({ sev: 'warn', i: i, text: t }); }
      var lm = A.legalMoves(f);
      if (A.hasLearn && !lm) err(de ? nm + ' ist in ' + REG + ' nicht zugelassen.' : nm + ' is not allowed in ' + REG + '.');
      var sk = A.baseOf(m.species);
      if (bySpecies[sk] != null) err(de ? 'Species-Klausel: ' + nm + ' steht doppelt im Team (auch Platz ' + (bySpecies[sk] + 1) + ').' : 'Species clause: ' + nm + ' is on the team twice (also slot ' + (bySpecies[sk] + 1) + ').');
      else bySpecies[sk] = i;
      if (!noItem(set.item)) {
        if (A.ITEMS.indexOf(set.item) === -1) err(de ? 'Item „' + A.nItem(set.item) + '“ ist in ' + REG + ' nicht erlaubt.' : 'Item “' + A.nItem(set.item) + '” is not allowed in ' + REG + '.');
        if (byItem[set.item] != null) err(de ? 'Item-Klausel: ' + A.nItem(set.item) + ' trägt schon Platz ' + (byItem[set.item] + 1) + '.' : 'Item clause: slot ' + (byItem[set.item] + 1) + ' already holds ' + A.nItem(set.item) + '.');
        else byItem[set.item] = i;
      }
      var la = A.legalAbilities(f);
      if (!set.ability) warn(de ? 'Keine Fähigkeit gesetzt.' : 'No ability set.');
      else if (la && la.indexOf(set.ability) === -1) err(de ? nm + ' kann die Fähigkeit „' + A.nAbility(set.ability) + '“ nicht haben.' : nm + ' cannot have the ability “' + A.nAbility(set.ability) + '”.');
      var mv = movesOf(m), seen = {};
      if (!mv.length) err(de ? 'Keine Attacke.' : 'No moves.');
      mv.forEach(function (x) {
        if (seen[x]) err(de ? 'Attacke „' + A.nMove(x) + '“ doppelt.' : 'Move “' + A.nMove(x) + '” twice.');
        seen[x] = 1;
        if (lm && lm.indexOf(x) === -1) err(de ? nm + ' kann „' + A.nMove(x) + '“ nicht lernen.' : nm + ' cannot learn “' + A.nMove(x) + '”.');
      });
      if (mv.length && mv.length < 4) warn(de ? 'Nur ' + mv.length + ' von 4 Attacken.' : 'Only ' + mv.length + ' of 4 moves.');
      var tot = 0;
      C.STAT_KEYS.forEach(function (k) {
        var v = (set.sps && set.sps[k]) || 0; tot += v;
        if (v > 32) err(de ? A.nStat(k) + ': ' + v + ' SP (höchstens 32).' : A.nStat(k) + ': ' + v + ' SP (32 at most).');
      });
      if (tot > 66) err(de ? tot + ' SP verteilt (höchstens 66).' : tot + ' SP spent (66 at most).');
      else if (tot < 66) warn(de ? 'Noch ' + (66 - tot) + ' SP frei.' : (66 - tot) + ' SP left to spend.');
    });
    if (mons.length < 4) out.unshift({ sev: 'warn', i: -1, text: de ? 'Nur ' + mons.length + ' Pokémon: Im Doppel werden 4 aus 6 gewählt.' : 'Only ' + mons.length + ' Pokémon: doubles brings 4 out of 6.' });
    else if (mons.length < 6) out.unshift({ sev: 'warn', i: -1, text: de ? 'Nur ' + mons.length + ' von 6 Pokémon.' : 'Only ' + mons.length + ' of 6 Pokémon.' });
    return out;
  }
  function renderLegal() {
    var tm = team(), issues = legalIssues(tm.mons);
    var errs = issues.filter(function (x) { return x.sev === 'err'; }).length, warns = issues.length - errs;
    var REG = A.REG_NAME || '';
    if (R.legalBtn) {
      R.legalBtn.classList.toggle('is-ok', !errs && !!tm.mons.length);
      R.legalBtn.classList.toggle('is-err', !!errs);
      R.legalBtn.textContent = !tm.mons.length ? (de ? 'Regel-Check' : 'Rule check')
        : errs ? '⛔ ' + errs + ' ' + (de ? 'Regelfehler' : (errs === 1 ? 'rule error' : 'rule errors'))
        : '✓ ' + (de ? 'Regelkonform' : 'Legal');
      R.legalBtn.title = (de ? 'Regel-Check für ' : 'Rule check for ') + REG + (warns ? ' · ' + warns + (de ? ' Hinweis(e)' : ' note(s)') : '') +
        (de ? '\nSpecies- und Item-Klausel, zugelassene Pokémon und Items, Fähigkeiten, Lernsets, SP' : '\nSpecies and item clause, allowed Pokémon and items, abilities, learnsets, SP');
    }
    // markers on the six slots
    if (R.slots) {
      var cards = R.slots.children;
      for (var i = 0; i < cards.length; i++) {
        var old = cards[i].querySelector('.tb-slot-legal'); if (old) old.remove();
        var mine = issues.filter(function (x) { return x.i === i && x.sev === 'err'; });
        if (mine.length && !cards[i].classList.contains('empty')) {
          cards[i].appendChild(el('span', { class: 'tb-slot-legal', text: '⛔', title: mine.map(function (x) { return x.text; }).join('\n') }));
        }
      }
    }
    if (!R.legal) return;
    R.legal.innerHTML = '';
    var head = el('div', { class: 'tb-legal-head ' + (errs ? 'is-err' : 'is-ok') });
    head.appendChild(el('strong', { text: !tm.mons.length ? T('tbEmptyTeam') : errs ? (de ? 'Nicht regelkonform für ' : 'Not legal for ') + REG : (de ? 'Regelkonform für ' : 'Legal for ') + REG }));
    head.appendChild(el('span', { class: 'hint', text: de ? 'Geprüft: zugelassene Pokémon, Species-Klausel, Item-Klausel, erlaubte Items, Fähigkeiten, Lernsets, doppelte Attacken, SP (je höchstens 32, zusammen 66). Das Level ist immer 50.' : 'Checked: allowed Pokémon, species clause, item clause, allowed items, abilities, learnsets, duplicate moves, SP (32 each, 66 total). The level is always 50.' }));
    R.legal.appendChild(head);
    var groups = [{ i: -1, list: issues.filter(function (x) { return x.i === -1; }) }];
    tm.mons.forEach(function (m, i) { groups.push({ i: i, m: m, list: issues.filter(function (x) { return x.i === i; }) }); });
    groups.forEach(function (g) {
      if (g.i === -1 && !g.list.length) return;
      var hasErr = g.list.some(function (x) { return x.sev === 'err'; });
      var box = el('div', { class: 'tb-legal-mon' + (hasErr ? ' is-err' : g.list.length ? ' is-warn' : ' is-ok') });
      var h = el('button', { type: 'button', class: 'tb-legal-mon-head' });
      if (g.m) {
        var sp = el('span', { class: 'tb-cv-mon' }); sp.appendChild(A.spriteFit(spriteOf(g.m), g.m.set.shiny)); h.appendChild(sp);
        h.appendChild(el('strong', { text: (g.i + 1) + '. ' + A.nSpecies(baseForme(g.m)) }));
        h.appendChild(el('span', { class: 'tb-legal-state', text: hasErr ? '⛔' : g.list.length ? '⚠' : '✓' }));
        h.title = de ? 'Im Editor öffnen' : 'Open in the editor';
        h.addEventListener('click', function () { sel = g.i; renderSlots(); renderEditor(); renderLegal(); setTab('edit'); });
      } else {
        h.appendChild(el('strong', { text: 'Team' }));
        h.disabled = true;
      }
      box.appendChild(h);
      if (g.list.length) {
        var ul = el('ul', { class: 'tb-legal-list' });
        g.list.forEach(function (x) { ul.appendChild(el('li', { class: 'is-' + x.sev, text: x.text })); });
        box.appendChild(ul);
      }
      R.legal.appendChild(box);
    });
  }

  // ---------------- share: QR code / PokéPaste, import from a QR code ----------------
  function shareTeam() {
    var tm = team(), v = curVersion(tm);
    if (!tm.mons.length) { A.toast(T('tbEmptyTeam')); return; }
    if (!window.RLTeamShare) return;
    // the dialog offers the active version, any other one or all of them
    window.RLTeamShare.openShare({ name: tm.name, cur: Math.max(0, tm.versions.indexOf(v)),
      versions: tm.versions.map(function (x, i) { return { name: x.name || ('v' + (i + 1)), text: exportText(x.mons || []) }; }) });
  }
  function scanTeam() {
    if (window.RLTeamShare) window.RLTeamShare.openScan(importShared);
  }
  // { name, ver, text } from a QR code or a PokéPaste -> new team with that name; returns true when it worked
  // with t.versions (QR code "all versions") or "=== Name (v1) ===" headers (PokéPaste) every version becomes one
  function importShared(t) {
    t = t || {};
    var list = t.versions && t.versions.length ? t.versions : null;
    var split = !list && window.RLTeamShare ? window.RLTeamShare.splitVersions(t.text || '') : null;
    if (split && split.length) { list = split; if (!t.name && split[0].title) t.name = split[0].title; }
    if (!list) list = [{ name: t.ver, text: t.text }];
    var errors = [], vers = [];
    list.forEach(function (x, i) {
      var res = A.parseShowdown(x.text || '');
      res.errors.forEach(function (e) { if (errors.indexOf(e) === -1) errors.push(e); });
      if (!res.mons.length) return;
      var mons = res.mons.slice(0, 6).map(function (m) { m.set.species = m.species; fixGender(m); return m; });
      vers.push({ id: newId(), name: String(x.name || '').trim() || ('v' + (i + 1)), mons: mons });
    });
    if (!vers.length) { A.toast(T('importNothing')); return false; }
    snapUndo(de ? 'Team aus QR-Code importiert' : 'Team imported from QR code');
    var curV = vers.filter(function (v) { return t.ver && v.name === String(t.ver).trim(); })[0] || vers[vers.length - 1];
    var name = String(t.name || '').trim() || T('tbDefaultName', store.teams.length + 1);
    var nt = { id: newId(), name: name, mons: curV.mons, versions: vers, curVer: curV.id };
    store.teams.push(nt); store.cur = nt.id; sel = 0; persist();
    if (document.body.dataset.view === 'builder') render();
    A.toast((de ? 'Team „' + name + '“ importiert' : 'Imported team “' + name + '”') + (vers.length > 1 ? ' · ' + vers.length + (de ? ' Versionen' : ' versions') : '') +
      (errors.length ? ' · ' + T('unknown', errors.join(', ')) : ''));
    return true;
  }

  // ---------------- import/export of a single Pokémon (tab next to type coverage) ----------------
  var ioFor = null; // the member whose text is shown; keeps the user's edits while nothing else changed
  function renderIO(force) {
    if (!R.io) return;
    var tm = team(), m = tm.mons[sel] || null;
    var ta = R.io.querySelector('textarea');
    if (ta && !force && ioFor === m && document.activeElement === ta) return;
    ioFor = m;
    R.io.innerHTML = '';
    var head = el('div', { class: 'tb-io-head' });
    if (m) { var sp = el('span', { class: 'tb-cv-mon tb-io-mon' }); sp.appendChild(A.spriteFit(spriteOf(m), m.set.shiny)); head.appendChild(sp); }
    head.appendChild(el('span', { class: 'hint', text: m
      ? (de ? 'Set von ' + A.nSpecies(m.species) + ' im Textformat (Showdown). Kopieren, oder Text einfügen und übernehmen.' : 'Set of ' + A.nSpecies(m.species) + ' in text format (Showdown). Copy it, or paste a set and apply it.')
      : (de ? 'Ein Pokémon im Textformat (Showdown) einfügen und zum Team hinzufügen.' : 'Paste one Pokémon in text format (Showdown) and add it to the team.') }));
    R.io.appendChild(head);
    ta = el('textarea', { spellcheck: 'false', class: 'tb-io-text' });
    ta.placeholder = 'Garchomp @ Garchompite\nAbility: Rough Skin\nLevel: 50\nSPs: 2 HP / 32 Atk / 32 Spe\nJolly Nature\n- Earthquake\n- Dragon Claw\n- Rock Slide\n- Protect';
    ta.value = m ? A.exportSet(m.set, m.setName, m.species) : '';
    R.io.appendChild(ta);
    var acts = el('div', { class: 'import-actions' }), msg = el('span', { class: 'hint' });
    function parseOne() {
      var res = A.parseShowdown(ta.value);
      if (!res.mons.length) { msg.textContent = T('importNothing') + (res.errors.length ? ' (' + T('unknown', res.errors.join(', ')) + ')' : ''); return null; }
      var n = res.mons[0]; n.set.species = n.species; fixGender(n);
      var note = res.errors.length ? ' · ' + T('unknown', res.errors.join(', ')) : '';
      if (res.mons.length > 1) note += ' · ' + (de ? 'nur das erste Pokémon übernommen' : 'only the first Pokémon was used');
      return { mon: n, note: note };
    }
    function done(text) { sel = Math.min(sel, tm.mons.length - 1); persist(); renderSlots(); renderList(); renderCover(); renderEditor(); A.toast(text); }
    if (m) {
      var bCopy = el('button', { class: 'primary-btn', text: de ? 'Kopieren' : 'Copy' });
      bCopy.addEventListener('click', function () { A.copy(ta.value); });
      acts.appendChild(bCopy);
      var bApply = el('button', { text: de ? 'Dieses Pokémon ersetzen' : 'Replace this Pokémon' });
      bApply.addEventListener('click', function () {
        var r = parseOne(); if (!r) return;
        var i = tm.mons.indexOf(m); if (i < 0) return;
        snapUndo(de ? 'Pokémon ersetzt' : 'Pokémon replaced');
        tm.mons[i] = r.mon; sel = i;
        done((de ? A.nSpecies(r.mon.species) + ' übernommen' : A.nSpecies(r.mon.species) + ' applied') + r.note);
      });
      acts.appendChild(bApply);
    }
    var bAdd = el('button', { text: de ? 'Als neues Pokémon hinzufügen' : 'Add as new Pokémon' });
    if (!m) bAdd.className = 'primary-btn';
    bAdd.disabled = tm.mons.length >= 6;
    if (bAdd.disabled) bAdd.title = de ? 'Das Team ist voll (6/6).' : 'The team is full (6/6).';
    bAdd.addEventListener('click', function () {
      if (tm.mons.length >= 6) return;
      var r = parseOne(); if (!r) return;
      tm.mons.push(r.mon); sel = tm.mons.length - 1;
      done((de ? A.nSpecies(r.mon.species) + ' hinzugefügt' : A.nSpecies(r.mon.species) + ' added') + r.note);
    });
    acts.appendChild(bAdd);
    acts.appendChild(msg);
    R.io.appendChild(acts);
  }

  // ---------------- import ----------------
  var imp = null;
  // opts (optional): { title, text } – used by the export button, which prefills the text
  function openImport(opts) {
    opts = opts && opts.title ? opts : {};
    if (!imp) {
      imp = el('div', { class: 'modal hidden', id: 'tbImportModal' });
      imp.innerHTML = '<div class="modal-box wide"><div class="modal-head"><h3>' + A.esc(T('tbImportTitle')) + '</h3><button class="icon-btn" data-x>✕</button></div>' +
        '<p class="hint">' + T('importHintH') + '</p><textarea spellcheck="false"></textarea>' +
        '<div class="import-actions"><button data-new class="primary-btn">' + A.esc(T('tbImportNew')) + '</button><button data-newver>' + (de ? 'Als neue Version' : 'As new version') + '</button><button data-into>' + A.esc(T('tbImportInto')) + '</button>' +
        '<button data-calcyou class="tbtn">' + A.esc(T('tbFromCalcYou')) + '</button><button data-calcfoe class="tbtn">' + A.esc(T('tbFromCalcFoe')) + '</button>' +
        '<button data-copy class="tbtn">' + (de ? 'Kopieren' : 'Copy') + '</button>' +
        '<span class="hint" data-msg></span></div></div>';
      document.body.appendChild(imp);
      var close = function () { imp.classList.add('hidden'); };
      imp.querySelector('[data-x]').addEventListener('click', close);
      imp.addEventListener('mousedown', function (ev) { if (ev.target === imp) close(); });
      document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') close(); });
      function run(mode) {
        var res = A.parseShowdown(imp.querySelector('textarea').value), msg = imp.querySelector('[data-msg]');
        if (!res.mons.length) { msg.textContent = T('importNothing') + (res.errors.length ? ' (' + T('unknown', res.errors.join(', ')) + ')' : ''); return; }
        var mons = res.mons.slice(0, 6).map(function (m) { m.set.species = m.species; fixGender(m); return m; });
        if (mode === 'new') {
          var v0 = { id: newId(), name: 'v1', mons: mons };
          var nt = { id: newId(), name: T('tbDefaultName', store.teams.length + 1), mons: mons, versions: [v0], curVer: v0.id };
          store.teams.push(nt); store.cur = nt.id;
        } else if (mode === 'ver') {
          var tm = team();
          var nv = { id: newId(), name: nextVerName(tm), mons: mons };
          tm.versions.push(nv); tm.curVer = nv.id; ensureVersions(tm);
        } else {
          var cv = curVersion();
          cv.mons = mons;
          team().mons = mons;
        }
        sel = 0; persist(); render();
        A.toast(T('tbImportDone', mons.length) + (res.errors.length ? ' · ' + T('unknown', res.errors.join(', ')) : ''));
        close();
      }
      imp.querySelector('[data-new]').addEventListener('click', function () { run('new'); });
      imp.querySelector('[data-newver]').addEventListener('click', function () { run('ver'); });
      imp.querySelector('[data-into]').addEventListener('click', function () { run('into'); });
      imp.querySelector('[data-copy]').addEventListener('click', function () { A.copy(imp.querySelector('textarea').value); });
      [['[data-calcyou]', 0], ['[data-calcfoe]', 1]].forEach(function (pair) {
        imp.querySelector(pair[0]).addEventListener('click', function () {
          var ct = A.getCalcTeams ? A.getCalcTeams() : [[], []];
          var list = (ct[pair[1]] || []).filter(function (m) { return m && m.species; });
          if (!list.length) { imp.querySelector('[data-msg]').textContent = T('tbEmptyTeam'); return; }
          imp.querySelector('textarea').value = list.map(function (m) { return A.exportSet(m.set, m.setName || 'Set', m.species); }).join('\n\n');
        });
      });
    }
    imp.querySelector('[data-msg]').textContent = '';
    imp.querySelector('h3').textContent = opts.title || T('tbImportTitle');
    var ta = imp.querySelector('textarea');
    if (opts.title) ta.value = opts.text || '';
    imp.classList.remove('hidden');
    setTimeout(function () { ta.focus(); if (opts.title) ta.select(); }, 30);
  }

  function takeFromCalc(mon) {
    if (!mon || !mon.species || !DEX[mon.species]) { A.toast(T('tbFromCalcEmpty')); return; }
    var Adopt = window.RLBuilderAdopt;
    if (!Adopt) return;
    var wrap = el('div', { class: 'modal' });
    var box = el('div', { class: 'modal-box tb-adopt' });
    box.appendChild(el('h3', { text: T('tbFromCalc') }));
    var item = mon.set && mon.set.item && mon.set.item !== '(none)' ? A.nItem(mon.set.item) : '';
    var bits = [A.nSpecies(mon.set && mon.set.forme && String(mon.set.forme).indexOf('Mega ') !== 0 ? mon.set.forme : mon.species), A.nNature((mon.set && mon.set.nature) || 'Hardy')];
    if (item) bits.push(item);
    if (mon.set && mon.set.ability) bits.push(A.nAbility(mon.set.ability));
    box.appendChild(el('p', { class: 'tb-adopt-note', text: bits.join(' · ') }));
    var pick = el('select', { class: 'tb-adopt-team', 'aria-label': T('tbFromCalcPick') });
    store.teams.forEach(function (t) {
      var o = el('option', { value: t.id, text: t.name || T('tbDefaultName', 1) });
      if (t.id === store.cur) o.selected = true;
      pick.appendChild(o);
    });
    pick.appendChild(el('option', { value: '__new__', text: T('tbFromCalcNew') }));
    var teamLbl = el('label', { class: 'l', text: T('tbFromCalcPick') });
    teamLbl.appendChild(pick);
    box.appendChild(teamLbl);
    var slots = el('div', { class: 'tb-adopt-slots' });
    box.appendChild(slots);
    function close() { wrap.remove(); }
    function commit(choice) {
      if (choice.mode === 'new') choice.name = T('tbDefaultName', store.teams.length + 1);
      var res = Adopt.apply(store, mon, choice, { id: newId, baseOf: A.baseOf });
      if (!res.ok) {
        A.toast(res.error === 'full' ? T('teamFull') : T('tbFromCalcEmpty'));
        return;
      }
      var tm = null;
      store.teams.some(function (t) { if (t.id === res.teamId) { tm = t; return true; } return false; });
      if (tm) ensureVersions(tm);
      if (tm && tm.mons[res.index]) fixGender(tm.mons[res.index]);
      store.cur = res.teamId;
      sel = res.index;
      persist();
      if (document.body.dataset.view === 'builder') render();
      close();
      A.toast(T('tbFromCalcDone', res.teamName));
    }
    function drawSlots() {
      slots.innerHTML = '';
      if (pick.value === '__new__') {
        var create = el('button', { type: 'button', class: 'primary-btn', text: T('tbFromCalcNew') });
        create.addEventListener('click', function () { commit({ mode: 'new' }); });
        slots.appendChild(create);
        return;
      }
      var tm = null;
      store.teams.some(function (t) { if (t.id === pick.value) { tm = t; return true; } return false; });
      if (!tm) return;
      ensureVersions(tm);
      var found = false;
      tm.mons.forEach(function (m, i) {
        var same = Adopt.sameSpecies(m, mon.species, A.baseOf);
        if (same) found = true;
        var label = (i + 1) + '  ' + A.nSpecies(m.species) + (m.setName ? ' · ' + m.setName : '') + ' — ' + T(same ? 'tbFromCalcUpdate' : 'tbFromCalcReplace');
        var b = el('button', { type: 'button', class: 'tbtn' + (same ? ' on' : ''), text: label });
        b.addEventListener('click', function () { commit({ mode: same ? 'update' : 'replace', teamId: tm.id, index: i }); });
        slots.appendChild(b);
      });
      if (tm.mons.length < 6) {
        var add = el('button', { type: 'button', class: 'primary-btn', text: T('tbFromCalcAdd', tm.mons.length + 1) });
        add.addEventListener('click', function () { commit({ mode: 'add', teamId: tm.id }); });
        slots.appendChild(add);
      } else if (!found) slots.appendChild(el('p', { class: 'tb-adopt-note', text: T('tbFromCalcFull') }));
    }
    pick.addEventListener('change', drawSlots);
    drawSlots();
    var foot = el('div', { class: 'meta-actions' });
    var cancel = el('button', { type: 'button', class: 'tbtn', text: de ? 'Abbrechen' : 'Cancel' });
    cancel.addEventListener('click', close);
    foot.appendChild(cancel);
    box.appendChild(foot);
    wrap.appendChild(box);
    wrap.addEventListener('mousedown', function (ev) { if (ev.target === wrap) close(); });
    document.body.appendChild(wrap);
  }

  // writes only the SPs of one Pokémon back into its teambuilder team; returns the team name or ''
  function updateSps(src, species, sps) {
    if (!src || !src.team) return '';
    var tm = null;
    store.teams.some(function (t) { if (t.id === src.team) { tm = t; return true; } return false; });
    if (!tm) return '';
    ensureVersions(tm);
    var ver = null;
    (tm.versions || []).some(function (v) { if (v.id === src.ver) { ver = v; return true; } return false; });
    var mons = (ver || curVersion(tm)).mons;
    var mon = mons[src.i];
    if (!mon || !A.baseOf(mon.species) || A.baseOf(mon.species) !== A.baseOf(species)) return '';
    mon.set = mon.set || {};
    var out = { hp: 0, at: 0, df: 0, sa: 0, sd: 0, sp: 0 };
    Object.keys(out).forEach(function (k) { out[k] = Math.max(0, Math.min(32, parseInt(sps && sps[k], 10) || 0)); });
    mon.set.sps = out;
    persist();
    if (document.body.dataset.view === 'builder') render();
    return tm.name || '';
  }

  window.CCBuilder = {
    render: render,
    legalIssues: legalIssues,
    pairMons: pairMons,
    diffFields: diffFields,
    importShared: importShared,
    // hotkeys (js/hotkeys.js); they only act while the teambuilder is open
    action: function (name) {
      if (document.body.dataset.view !== 'builder' || !root) return false;
      var b = { newTeam: '#tbNew', exportTeam: '#tbExport', share: '#tbShare', qr: '#tbQrImport', newVersion: '#tbVerAdd' }[name];
      if (b) { var n = root.querySelector(b); if (n) n.click(); return true; }
      if (name === 'cover' || name === 'diff' || name === 'legal') { setTab(tab === name ? 'edit' : name); return true; }
      return false;
    },
    updateSps: updateSps,
    takeFromCalc: takeFromCalc,
    // move a Pokémon of the current team (start screen drag & drop)
    move: function (from, to) {
      var t = team();
      if (!t || from === to || !t.mons[from] || to < 0 || to >= t.mons.length) return false;
      var mv = t.mons.splice(from, 1)[0]; t.mons.splice(to, 0, mv);
      persist(); return true;
    },
    current: function () {
      var t = team();
      return { name: t.name, mons: (curVersion(t).mons || []).slice() };
    }
  };
})();

// Pokédex (Alle Generationen 1–9: #0001 Bisasam bis #1025 Infamomo)
// Zeigt für jedes Pokémon Sprite / 3D-Modell / HOME-Render (inkl. Shiny), umschaltbare Formen (Mega, Proto, Alola, Galar, Hisui, Paldea, Spezialformen),
// Typen & Typ-Schwächen, Fähigkeiten mit Effekttext, Basiswerte mit Balken sowie die komplette Entwicklungsreihe inkl. Entwicklungsmethode.
(function () {
  'use strict';
  var A = window.CC;
  if (!A) return;
  var el = A.el, C = A.C;
  var de = A.LANG === 'de';

  var GEN_INFO = [
    { gen: 1, nameDe: 'Gen 1 · Kanto', nameEn: 'Gen 1 · Kanto', range: '001–151' },
    { gen: 2, nameDe: 'Gen 2 · Johto', nameEn: 'Gen 2 · Johto', range: '152–251' },
    { gen: 3, nameDe: 'Gen 3 · Hoenn', nameEn: 'Gen 3 · Hoenn', range: '252–386' },
    { gen: 4, nameDe: 'Gen 4 · Sinnoh', nameEn: 'Gen 4 · Sinnoh', range: '387–493' },
    { gen: 5, nameDe: 'Gen 5 · Einall', nameEn: 'Gen 5 · Unova', range: '494–649' },
    { gen: 6, nameDe: 'Gen 6 · Kalos', nameEn: 'Gen 6 · Kalos', range: '650–721' },
    { gen: 7, nameDe: 'Gen 7 · Alola', nameEn: 'Gen 7 · Alola', range: '722–809' },
    { gen: 8, nameDe: 'Gen 8 · Galar & Hisui', nameEn: 'Gen 8 · Galar & Hisui', range: '810–905' },
    { gen: 9, nameDe: 'Gen 9 · Paldea', nameEn: 'Gen 9 · Paldea', range: '906–1025' }
  ];

  function fmtNum(n) {
    return n >= 1000 ? String(n) : ('00' + n).slice(-3);
  }

  function genOfNum(n) {
    if (n <= 151) return 1;
    if (n <= 251) return 2;
    if (n <= 386) return 3;
    if (n <= 493) return 4;
    if (n <= 649) return 5;
    if (n <= 721) return 6;
    if (n <= 809) return 7;
    if (n <= 905) return 8;
    return 9;
  }

  var DESC = { de: window.DESC_DE || {}, en: window.DESC_EN || {} };
  function abilityDesc(name) {
    var k = A.idOf(name);
    if (k.indexOf('asone') === 0) k = 'asone';
    return ((de && (DESC.de.abilities || {})[k]) || (DESC.en.abilities || {})[k]) || '';
  }

  function abilityLocName(name) {
    if (name.indexOf('As One') === 0) {
      return de ? 'Reitgespann' : name;
    }
    return A.nAbility(name);
  }

  var STAT_LABELS_DE = ['KP', 'Angriff', 'Verteidigung', 'Sp.-Angriff', 'Sp.-Vert.', 'Initiative'];
  var STAT_LABELS_EN = ['HP', 'Attack', 'Defense', 'Sp. Atk', 'Sp. Def', 'Speed'];

  function statColor(v) {
    if (v < 50) return '#e5484d';
    if (v < 80) return '#e08b3a';
    if (v < 100) return '#e0b33a';
    if (v < 125) return '#3cb96a';
    if (v < 150) return '#2aa8a0';
    return '#3a7bd5';
  }

  // Berechnet Min- und Max-Wert auf Level 50 (0 IV/0 EV- vs. 31 IV/252 EV+)
  function statRangeLv50(base, isHP) {
    if (base === 1) return '1';
    if (isHP) {
      var minH = Math.floor((2 * base * 50) / 100) + 60;
      var maxH = Math.floor(((2 * base + 31 + 63) * 50) / 100) + 60;
      return minH + '–' + maxH;
    }
    var minS = Math.floor((Math.floor((2 * base * 50) / 100) + 5) * 0.9);
    var maxS = Math.floor((Math.floor(((2 * base + 31 + 63) * 50) / 100) + 5) * 1.1);
    return minS + '–' + maxS;
  }

  // Sprite-Kette für großes Bild (3D-GIF, HOME-Render oder Pixel-Sprite)
  function setBigDexSprite(img, spriteId, shiny, mode) {
    var base = 'https://play.pokemonshowdown.com/sprites/';
    var ani = base + (shiny ? 'ani-shiny/' : 'ani/') + spriteId + '.gif';
    var home = base + (shiny ? 'home-centered-shiny/' : 'home-centered/') + spriteId + '.png';
    var dex = base + (shiny ? 'dex-shiny/' : 'dex/') + spriteId + '.png';
    var px = base + (shiny ? 'gen5-shiny/' : 'gen5/') + spriteId + '.png';
    var pxNormal = base + 'gen5/' + spriteId + '.png';

    var chain = [];
    if (mode === 'home') chain.push(home, dex, ani, px);
    else if (mode === 'sprite') chain.push(px, dex, home, ani);
    else chain.push(ani, home, dex, px);
    if (shiny) chain.push(home.replace('-shiny/', '/'), pxNormal);

    var i = 0;
    function syncCls(u) {
      img.classList.toggle('is-pixel', u.indexOf('/gen5') !== -1);
      img.classList.toggle('is-home', u.indexOf('/home-centered') !== -1 || u.indexOf('/dex') !== -1);
    }
    img.onerror = function () {
      i++;
      if (i < chain.length) {
        syncCls(chain[i]);
        img.src = chain[i];
      }
    };
    syncCls(chain[0]);
    img.src = chain[0];
  }

  function getDexData() {
    return window.DEX_ALL || window.DEX_GEN1 || [];
  }

  function maxDexNum() {
    var d = getDexData();
    return d.length > 1 ? d.length - 1 : 1025;
  }

  // Zustand laden/speichern
  var st = A.load('cc_pokedex', null) || {};
  if (!st.num || st.num < 1) st.num = 6;
  if (st.formIdx == null) st.formIdx = 0;
  if (st.shiny == null) st.shiny = false;
  if (!st.artMode) st.artMode = A.setting ? (A.setting('model') || '3d') : '3d';
  if (!st.search) st.search = '';
  if (!st.typeFilter) st.typeFilter = '';
  if (!st.genFilter) st.genFilter = '';
  if (st.onlyForms == null) st.onlyForms = false;

  function saveState() {
    A.save('cc_pokedex', {
      num: st.num,
      formIdx: st.formIdx,
      shiny: st.shiny,
      artMode: st.artMode,
      typeFilter: st.typeFilter,
      genFilter: st.genFilter,
      onlyForms: st.onlyForms
    });
  }

  var root = null;

  function render() {
    root = document.getElementById('dexView');
    if (!root) return;
    var dex = getDexData();
    var totalMax = maxDexNum();
    if (st.num > totalMax) st.num = 1;
    if (!dex.length) {
      root.innerHTML = '<div class="panel" style="padding:20px">Pokédex-Daten nicht geladen.</div>';
      return;
    }

    var typeOpts = '<option value="">' + (de ? 'Alle Typen' : 'All Types') + '</option>' +
      C.TYPES.map(function (t) {
        return '<option value="' + t + '"' + (st.typeFilter === t ? ' selected' : '') + '>' + A.esc(A.nType(t)) + '</option>';
      }).join('');

    var genPillsHtml = '<button type="button" class="dex-gen-pill' + (!st.genFilter ? ' on' : '') + '" data-gen="">' + (de ? 'Alle' : 'All') + '</button>' +
      GEN_INFO.map(function (g) {
        return '<button type="button" class="dex-gen-pill' + (String(st.genFilter) === String(g.gen) ? ' on' : '') + '" data-gen="' + g.gen + '" title="' + A.esc(de ? g.nameDe : g.nameEn) + ' (#' + g.range + ')">G' + g.gen + '</button>';
      }).join('');

    root.innerHTML =
      '<div class="dex-layout">' +
        // LINKE SPALTE: POKÉDEX-LISTE (#001 - #1025)
        '<aside class="panel dex-sidebar">' +
          '<h2 class="field-head">' +
            '<span>' + (de ? 'Nationaler Pokédex' : 'National Pokédex') + '</span>' +
            '<span class="dex-count-badge" id="dexListCount">' + totalMax + '</span>' +
          '</h2>' +
          '<div class="dex-filters">' +
            '<input type="text" id="dexSearch" class="dex-search" value="' + A.esc(st.search) + '" placeholder="' + (de ? 'Suchen: Name oder #Nr. …' : 'Search: name or # …') + '" autocomplete="off">' +
            '<div class="dex-gen-bar" id="dexGenBar">' + genPillsHtml + '</div>' +
            '<div class="dex-filter-row">' +
              '<select id="dexTypeFilter" class="dex-type-sel">' + typeOpts + '</select>' +
              '<button type="button" id="dexFormsFilter" class="tbtn dex-forms-btn' + (st.onlyForms ? ' on' : '') + '" title="' + (de ? 'Nur vollentwickelte Pokémon zeigen' : 'Only show fully evolved Pokémon') + '">' +
                (de ? 'Nur vollentwickelt' : 'Fully Evolved') +
              '</button>' +
            '</div>' +
          '</div>' +
          '<div class="dex-list" id="dexList"></div>' +
        '</aside>' +

        // RECHTE SPALTE: POKÉMON-DETAILS
        '<section class="dex-main" id="dexMain"></section>' +
      '</div>';

    var sInp = document.getElementById('dexSearch');
    var tSel = document.getElementById('dexTypeFilter');
    var fBtn = document.getElementById('dexFormsFilter');
    var gBar = document.getElementById('dexGenBar');

    if (sInp) {
      sInp.addEventListener('input', function () {
        st.search = sInp.value;
        renderList();
      });
      sInp.addEventListener('keydown', function (ev) {
        if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') {
          ev.preventDefault();
          stepVisibleMon(ev.key === 'ArrowDown' ? 1 : -1);
        }
      });
    }
    if (gBar) {
      gBar.querySelectorAll('.dex-gen-pill').forEach(function (b) {
        b.addEventListener('click', function () {
          st.genFilter = b.getAttribute('data-gen') || '';
          gBar.querySelectorAll('.dex-gen-pill').forEach(function (x) {
            x.classList.toggle('on', x === b);
          });
          saveState();
          renderList();
        });
      });
    }
    if (tSel) {
      tSel.addEventListener('change', function () {
        st.typeFilter = tSel.value;
        saveState();
        renderList();
      });
    }
    if (fBtn) {
      fBtn.addEventListener('click', function () {
        st.onlyForms = !st.onlyForms;
        fBtn.classList.toggle('on', st.onlyForms);
        saveState();
        renderList();
      });
    }

    renderList();
    renderDetail();
  }

  function findEvoNode(node, num) {
    if (!node) return null;
    if (node.num === num) return node;
    var ch = node.children || [];
    for (var i = 0; i < ch.length; i++) {
      var found = findEvoNode(ch[i], num);
      if (found) return found;
    }
    return null;
  }

  function isMonFullyEvolved(m) {
    if (!m || !m.evoTree) return true;
    var node = findEvoNode(m.evoTree, m.num);
    if (!node) return true;
    return !node.children || node.children.length === 0;
  }

  function filteredMons() {
    var dex = getDexData();
    var totalMax = maxDexNum();
    var q = String(st.search || '').trim().toLowerCase();
    var tf = st.typeFilter;
    var gf = st.genFilter ? Number(st.genFilter) : 0;
    var out = [];
    for (var i = 1; i <= totalMax; i++) {
      var m = dex[i];
      if (!m) continue;
      var mGen = m.gen || genOfNum(m.num);
      if (gf && mGen !== gf) continue;
      if (st.onlyForms && !isMonFullyEvolved(m)) continue;
      if (tf) {
        var hasType = m.forms.some(function (f) { return f.types.indexOf(tf) !== -1; });
        if (!hasType) continue;
      }
      if (q) {
        var numStr = String(m.num);
        var padStr = fmtNum(m.num);
        var qClean = q.replace(/^#/, '');
        var matchName = m.nameDe.toLowerCase().indexOf(q) !== -1 ||
                        m.nameEn.toLowerCase().indexOf(q) !== -1 ||
                        numStr === qClean ||
                        padStr === qClean;
        if (!matchName) continue;
      }
      out.push(m);
    }
    return out;
  }

  function stepVisibleMon(dir) {
    var list = filteredMons();
    if (!list.length) return;
    var idx = -1;
    list.some(function (m, i) { if (m.num === st.num) { idx = i; return true; } return false; });
    var next = list[(idx + dir + list.length) % list.length];
    if (next) selectMon(next.num, 0);
  }

  function selectMon(num, formIdx) {
    var totalMax = maxDexNum();
    st.num = Math.max(1, Math.min(totalMax, Number(num) || 1));
    st.formIdx = formIdx || 0;
    saveState();
    updateListSelection(true);
    renderDetail();
  }

  function renderList() {
    var box = document.getElementById('dexList');
    var cnt = document.getElementById('dexListCount');
    if (!box) return;
    var totalMax = maxDexNum();
    var list = filteredMons();
    if (cnt) cnt.textContent = list.length + ' / ' + totalMax;

    if (!list.length) {
      box.innerHTML = '<div class="dex-empty">' + (de ? 'Kein Pokémon gefunden' : 'No Pokémon found') + '</div>';
      return;
    }

    var frag = document.createDocumentFragment();
    list.forEach(function (m) {
      var row = el('div', { class: 'dex-row' + (m.num === st.num ? ' on' : ''), 'data-num': m.num });
      row.appendChild(el('span', { class: 'dex-row-num', text: '#' + fmtNum(m.num) }));
      var sp = el('span', { class: 'dex-row-sp' });
      var img = A.spriteById(m.id, '', false, de ? m.nameDe : m.nameEn);
      img.loading = 'lazy';
      sp.appendChild(img);
      row.appendChild(sp);

      var info = el('div', { class: 'dex-row-info' });
      var top = el('div', { class: 'dex-row-top' });
      top.appendChild(el('span', { class: 'dex-row-name', text: de ? m.nameDe : m.nameEn }));
      if (m.forms && m.forms.length > 1) {
        top.appendChild(el('span', { class: 'dex-row-fbadge', text: m.forms.length + (de ? ' Formen' : ' forms') }));
      }
      info.appendChild(top);

      var tys = el('div', { class: 'dex-row-types' });
      m.types.forEach(function (t) { tys.appendChild(A.typeBadge(t)); });
      info.appendChild(tys);
      row.appendChild(info);

      row.addEventListener('click', function () {
        selectMon(m.num, 0);
      });
      frag.appendChild(row);
    });
    box.innerHTML = '';
    box.appendChild(frag);
    updateListSelection(true);
  }

  function updateListSelection(scrollIntoView) {
    var box = document.getElementById('dexList');
    if (!box) return;
    box.querySelectorAll('.dex-row').forEach(function (r) {
      var isCur = Number(r.getAttribute('data-num')) === st.num;
      r.classList.toggle('on', isCur);
      if (isCur && scrollIntoView) {
        r.scrollIntoView({ block: 'nearest' });
      }
    });
  }

  function renderDetail() {
    var main = document.getElementById('dexMain');
    if (!main) return;
    var dex = getDexData();
    var totalMax = maxDexNum();
    var mon = dex[st.num] || dex[1];
    var forms = mon.forms || [];
    if (st.formIdx >= forms.length || st.formIdx < 0) st.formIdx = 0;
    var form = forms[st.formIdx];
    var baseForm = forms[0];

    var cd = (window.CATCH_DATA && window.CATCH_DATA[mon.num]) || [45, 50, 50, 4];
    var catchRate = cd[0];
    var prevMon = st.num > 1 ? dex[st.num - 1] : dex[totalMax];
    var nextMon = st.num < totalMax ? dex[st.num + 1] : dex[1];
    var mGen = mon.gen || genOfNum(mon.num);
    var genObj = GEN_INFO[mGen - 1] || GEN_INFO[0];

    // Form-Wechsel-Leiste (wenn das Pokémon mehrere Formen besitzt)
    var formBarHtml = '';
    if (forms.length > 1) {
      formBarHtml =
        '<div class="dex-form-bar">' +
          '<span class="dex-form-lbl">' + (de ? 'Form wechseln:' : 'Switch Form:') + '</span>' +
          '<div class="dex-form-btns">' +
            forms.map(function (f, idx) {
              return '<button type="button" class="dex-form-btn' + (idx === st.formIdx ? ' on' : '') + '" data-fidx="' + idx + '">' +
                A.esc(de ? f.labelDe : f.labelEn) +
              '</button>';
            }).join('') +
          '</div>' +
        '</div>';
    }

    // Fähigkeiten aufbereiten
    var abilEntries = [];
    var abObj = form.abilities || {};
    if (abObj['0']) abilEntries.push({ key: '0', name: abObj['0'], hidden: false });
    if (abObj['1']) abilEntries.push({ key: '1', name: abObj['1'], hidden: false });
    if (abObj['H']) abilEntries.push({ key: 'H', name: abObj['H'], hidden: true });
    if (abObj['S']) abilEntries.push({ key: 'S', name: abObj['S'], hidden: false, special: true });

    var abilHtml = abilEntries.map(function (a) {
      var locName = abilityLocName(a.name);
      var desc = abilityDesc(a.name);
      return (
        '<div class="dex-abil-card' + (a.hidden ? ' is-hidden' : '') + '">' +
          '<div class="dex-abil-head">' +
            '<span class="dex-abil-name">' + A.esc(locName) + '</span>' +
            (locName !== a.name ? '<span class="dex-abil-en">' + A.esc(a.name) + '</span>' : '') +
            (a.hidden ? '<span class="dex-vf-badge" title="' + (de ? 'Versteckte Fähigkeit (Hidden Ability)' : 'Hidden Ability') + '">' + (de ? 'Versteckte Fähigkeit' : 'Hidden Ability') + '</span>' : '') +
          '</div>' +
          (desc ? '<div class="dex-abil-desc">' + A.esc(desc) + '</div>' : '') +
        '</div>'
      );
    }).join('');

    if (form.requiredItem) {
      abilHtml +=
        '<div class="dex-req-item">' +
          '<span>' + (de ? 'Benötigtes Item für Formwechsel: ' : 'Required item for form: ') + '</span>' +
          '<b>' + A.esc(A.nItem(form.requiredItem)) + '</b>' +
        '</div>';
    }

    // Basiswerte (Base Stats)
    var bs = form.bs || [50, 50, 50, 50, 50, 50];
    var baseBs = baseForm.bs || bs;
    var bst = bs.reduce(function (s, v) { return s + v; }, 0);
    var baseBst = baseBs.reduce(function (s, v) { return s + v; }, 0);
    var bstDiff = bst - baseBst;

    var statsHtml = bs.map(function (val, idx) {
      var lbl = (de ? STAT_LABELS_DE : STAT_LABELS_EN)[idx];
      var diff = val - baseBs[idx];
      var diffStr = diff !== 0 ? (' <small class="' + (diff > 0 ? 'pos' : 'neg') + '">(' + (diff > 0 ? '+' : '') + diff + ')</small>') : '';
      var pct = Math.min(100, Math.round((val / 200) * 100));
      var rng50 = statRangeLv50(val, idx === 0);
      return (
        '<div class="dex-stat-row">' +
          '<span class="dex-stat-name">' + lbl + '</span>' +
          '<span class="dex-stat-val">' + val + diffStr + '</span>' +
          '<div class="dex-stat-bar"><span style="width:' + pct + '%;background:' + statColor(val) + '"></span></div>' +
          '<span class="dex-stat-rng" title="Level 50 (Min–Max)">' + rng50 + '</span>' +
        '</div>'
      );
    }).join('');

    // Defensive Typ-Effektivität berechnen
    var weakList = [], resList = [], immList = [];
    C.TYPES.forEach(function (atkType) {
      var eff = C.typeEff(atkType, form.types, {});
      if (eff === 0) immList.push({ t: atkType, m: '0×' });
      else if (eff > 1) weakList.push({ t: atkType, m: eff + '×', hi: eff >= 4 });
      else if (eff < 1) resList.push({ t: atkType, m: eff === 0.25 ? '¼×' : '½×' });
    });

    function renderEffPills(arr) {
      if (!arr.length) return '<span class="hint">–</span>';
      return arr.map(function (x) {
        return '<span class="dex-eff-pill' + (x.hi ? ' hi' : '') + '">' +
          '<img class="type-ic" src="img/types/' + x.t.toLowerCase() + '.svg" alt="">' +
          '<span>' + A.esc(A.nType(x.t)) + '</span>' +
          '<b>' + x.m + '</b>' +
        '</span>';
      }).join('');
    }

    main.innerHTML =
      // KOPFBEREICH
      '<div class="panel dex-head-panel">' +
        '<div class="dex-head-top">' +
          '<div class="dex-nav-arrows">' +
            '<button type="button" class="tbtn" id="dexPrevBtn" title="#' + prevMon.num + ' ' + A.esc(de ? prevMon.nameDe : prevMon.nameEn) + '">◀ #' + fmtNum(prevMon.num) + '</button>' +
            '<button type="button" class="tbtn" id="dexNextBtn" title="#' + nextMon.num + ' ' + A.esc(de ? nextMon.nameDe : nextMon.nameEn) + '">#' + fmtNum(nextMon.num) + ' ▶</button>' +
          '</div>' +
          '<div class="dex-title-block">' +
            '<span class="dex-num-pill">#' + fmtNum(mon.num) + '</span>' +
            '<h1 class="dex-mon-title">' + A.esc(de ? form.nameDe : form.nameEn) + '</h1>' +
            '<span class="dex-mon-sub">' + A.esc(de ? form.nameEn : form.nameDe) + '</span>' +
            '<span class="dex-gen-tag">' + A.esc(de ? genObj.nameDe : genObj.nameEn) + '</span>' +
          '</div>' +
          '<div class="dex-art-controls">' +
            '<div class="btn-group">' +
              '<button type="button" data-art="3d" class="' + (st.artMode === '3d' ? 'on' : '') + '">3D</button>' +
              '<button type="button" data-art="home" class="' + (st.artMode === 'home' ? 'on' : '') + '">HOME</button>' +
              '<button type="button" data-art="sprite" class="' + (st.artMode === 'sprite' ? 'on' : '') + '">Pixel</button>' +
            '</div>' +
            '<button type="button" id="dexShinyBtn" class="tbtn dex-shiny-btn' + (st.shiny ? ' on' : '') + '" title="Shiny umschalten">★ Shiny</button>' +
          '</div>' +
        '</div>' +
        formBarHtml +
      '</div>' +

      // MITTLERER BEREICH: MODELL & TYPEN (LINKS) | FÄHIGKEITEN & BASISWERTE (RECHTS)
      '<div class="dex-mid-grid">' +
        '<div class="panel dex-stage-panel">' +
          '<div class="dex-stage-box">' +
            '<img id="dexBigImg" class="dex-big-img" alt="' + A.esc(de ? form.nameDe : form.nameEn) + '">' +
          '</div>' +
          '<div class="dex-stage-meta">' +
            '<div class="dex-stage-types" id="dexStageTypes"></div>' +
            '<div class="dex-phys-pills">' +
              '<span class="catch-meta-pill">' + (de ? 'Größe: ' : 'Height: ') + '<b>' + String(form.heightm).replace('.', de ? ',' : '.') + ' m</b></span>' +
              '<span class="catch-meta-pill">' + (de ? 'Gewicht: ' : 'Weight: ') + '<b>' + String(form.weightkg).replace('.', de ? ',' : '.') + ' kg</b></span>' +
              '<span class="catch-meta-pill">' + (de ? 'Fangrate: ' : 'Catch rate: ') + '<b>' + catchRate + '</b></span>' +
            '</div>' +
          '</div>' +
          '<div class="dex-type-eff-box">' +
            '<div class="dex-eff-row"><span class="dex-eff-lbl bad">' + (de ? 'Schwächen' : 'Weaknesses') + '</span><div class="dex-eff-list">' + renderEffPills(weakList) + '</div></div>' +
            '<div class="dex-eff-row"><span class="dex-eff-lbl good">' + (de ? 'Resistenzen' : 'Resistances') + '</span><div class="dex-eff-list">' + renderEffPills(resList) + '</div></div>' +
            (immList.length ? '<div class="dex-eff-row"><span class="dex-eff-lbl">' + (de ? 'Immunitäten' : 'Immunities') + '</span><div class="dex-eff-list">' + renderEffPills(immList) + '</div></div>' : '') +
          '</div>' +
        '</div>' +

        '<div class="dex-info-col">' +
          '<div class="panel dex-abil-panel">' +
            '<h2 class="field-head"><span>' + (de ? 'Fähigkeiten' : 'Abilities') + '</span></h2>' +
            '<div class="dex-abil-list">' + abilHtml + '</div>' +
          '</div>' +

          '<div class="panel dex-stats-panel">' +
            '<h2 class="field-head">' +
              '<span>' + (de ? 'Basiswerte (Base Stats)' : 'Base Stats') + '</span>' +
              '<span class="hint">Lv. 50 (Min–Max)</span>' +
            '</h2>' +
            '<div class="dex-stats-body">' +
              statsHtml +
              '<div class="dex-stat-row dex-bst-row">' +
                '<span class="dex-stat-name">' + (de ? 'Summe (BST)' : 'Total (BST)') + '</span>' +
                '<span class="dex-stat-val"><b>' + bst + '</b>' + (bstDiff !== 0 ? ' <small class="' + (bstDiff > 0 ? 'pos' : 'neg') + '">(' + (bstDiff > 0 ? '+' : '') + bstDiff + ')</small>' : '') + '</span>' +
                '<div></div>' +
                '<span class="dex-stat-rng"></span>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>' +

      // UNTERER BEREICH: ENTWICKLUNGSREIHE INKL. METHODE
      '<div class="panel dex-evo-panel">' +
        '<h2 class="field-head">' +
          '<span>' + (de ? 'Entwicklungsreihe & Entwicklungsmethode' : 'Evolution Chain & Method') + '</span>' +
          '<span class="hint">' + (de ? 'Klick auf ein Pokémon in der Reihe wechselt direkt dorthin' : 'Click any Pokémon in the chain to jump to it') + '</span>' +
        '</h2>' +
        '<div class="dex-evo-body" id="dexEvoBody"></div>' +
      '</div>';

    // Typ-Badges in der Bühne einsetzen
    var tyWrap = document.getElementById('dexStageTypes');
    if (tyWrap) {
      form.types.forEach(function (t) { tyWrap.appendChild(A.typeBadge(t)); });
    }

    // Großes Bild laden
    var bigImg = document.getElementById('dexBigImg');
    if (bigImg) {
      setBigDexSprite(bigImg, form.spriteId, st.shiny, st.artMode);
    }

    // Entwicklungsbaum rendern (form.evoTree für Regionalformen, sonst mon.evoTree)
    var evoBody = document.getElementById('dexEvoBody');
    var activeEvoTree = form.evoTree || mon.evoTree;
    if (evoBody && activeEvoTree) {
      evoBody.appendChild(buildEvoDom(activeEvoTree, mon.num, form.forme));
    }

    // Events verdrahten
    var prevBtn = document.getElementById('dexPrevBtn');
    var nextBtn = document.getElementById('dexNextBtn');
    if (prevBtn) prevBtn.addEventListener('click', function () { selectMon(prevMon.num, 0); });
    if (nextBtn) nextBtn.addEventListener('click', function () { selectMon(nextMon.num, 0); });

    main.querySelectorAll('.dex-form-btn').forEach(function (b) {
      b.addEventListener('click', function () {
        st.formIdx = Number(b.getAttribute('data-fidx')) || 0;
        saveState();
        renderDetail();
      });
    });

    main.querySelectorAll('[data-art]').forEach(function (b) {
      b.addEventListener('click', function () {
        st.artMode = b.getAttribute('data-art') || '3d';
        saveState();
        renderDetail();
      });
    });

    var shBtn = document.getElementById('dexShinyBtn');
    if (shBtn) {
      shBtn.addEventListener('click', function () {
        st.shiny = !st.shiny;
        saveState();
        renderDetail();
      });
    }
  }

  // Baut den DOM-Baum für die Entwicklungsreihe (inkl. Verzweigungen wie Evoli, Rabauz, Knapfel, Wuffels usw.)
  function buildEvoDom(node, activeNum, activeForme) {
    if (!node.children || !node.children.length) {
      var single = el('div', { class: 'dex-evo-single' });
      single.appendChild(makeEvoCard(node, activeNum, activeForme));
      single.appendChild(el('span', { class: 'dex-evo-none', text: de ? 'Keine weiteren Entwicklungen' : 'Does not evolve' }));
      return single;
    }
    return renderEvoSubtree(node, activeNum, activeForme);
  }

  function renderEvoSubtree(node, activeNum, activeForme) {
    var wrap = el('div', { class: 'dex-evo-group' });
    wrap.appendChild(makeEvoCard(node, activeNum, activeForme));

    if (node.children && node.children.length) {
      var branches = el('div', { class: 'dex-evo-branches' + (node.children.length > 3 ? ' many' : '') });
      node.children.forEach(function (child) {
        var branch = el('div', { class: 'dex-evo-branch' });
        var arrow = el('div', { class: 'dex-evo-arrow' });
        arrow.appendChild(el('span', { class: 'dex-evo-method', text: de ? child.methodDe : child.methodEn }));
        arrow.appendChild(el('span', { class: 'dex-evo-arr-ic', text: '⟶' }));
        branch.appendChild(arrow);
        branch.appendChild(renderEvoSubtree(child, activeNum, activeForme));
        branches.appendChild(branch);
      });
      wrap.appendChild(branches);
    }
    return wrap;
  }

  function makeEvoCard(node, activeNum, activeForme) {
    var totalMax = maxDexNum();
    var isAvailable = node.num >= 1 && node.num <= totalMax;
    var isCurrent = node.num === activeNum && (node.forme || '') === (activeForme || '');
    var nGen = genOfNum(node.num);
    var card = el('div', {
      class: 'dex-evo-card' + (isCurrent ? ' on' : '') + (isAvailable ? ' clickable' : ' ext'),
      title: isAvailable ? (de ? 'Zu ' + node.nameDe + ' (#' + fmtNum(node.num) + ') wechseln' : 'View ' + node.nameEn + ' (#' + fmtNum(node.num) + ')') : ''
    });

    var sp = el('div', { class: 'dex-evo-sp' });
    sp.appendChild(A.spriteById(node.spriteId, '', st.shiny, de ? node.nameDe : node.nameEn));
    card.appendChild(sp);

    var info = el('div', { class: 'dex-evo-info' });
    info.appendChild(el('span', { class: 'dex-evo-num', text: '#' + fmtNum(node.num) + ' · Gen ' + nGen }));
    info.appendChild(el('span', { class: 'dex-evo-name', text: de ? node.nameDe : node.nameEn }));
    var tys = el('div', { class: 'dex-evo-types' });
    (node.types || []).forEach(function (t) { tys.appendChild(A.typeBadge(t)); });
    info.appendChild(tys);
    card.appendChild(info);

    if (isAvailable) {
      card.addEventListener('click', function () {
        var dex = getDexData();
        var targetMon = dex[node.num];
        var fIdx = 0;
        if (targetMon && targetMon.forms && node.forme) {
          targetMon.forms.some(function (f, i) {
            if (f.forme === node.forme) { fIdx = i; return true; }
            return false;
          });
        }
        selectMon(node.num, fIdx);
      });
    }
    return card;
  }

  window.CCDex = {
    render: render,
    selectMon: selectMon
  };
})();

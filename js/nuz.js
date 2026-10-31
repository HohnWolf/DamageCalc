// Zwei eigene Modi: Soul-Link-Planer (#slView) und Nuzlocke-Rechner (#nuzView, Alpha, Inhalt in js/nuzcalc.js).
// Soul-Link-Planer: verbundene Pokémon mehrerer Spieler pro Begegnung (Route) planen und nachhalten.
// Gespeichert im Browser unter localStorage "cc_soullink":
//   { runs: [{ id, name, game, players: [Name, …], typeRule: 'off'|'primary'|'any',
//              links: [{ id, route, status: 'team'|'box'|'dead'|'missed', note, mons: [{ n: Dex-Nr., nick }] }] }], cur }
(function () {
  'use strict';
  var A = window.CC;
  if (!A) return;
  var el = A.el, de = A.LANG === 'de';
  var NAT = window.NATDEX || [];

  var S = de ? {
    slTitle: 'Soul-Link-Planer', slSub: 'Nur zum Planen und Nachhalten: welche Pokémon verbunden sind, wer im Team ist und wer gestorben ist. Rechnet nichts und ist unabhängig vom Nuzlocke-Rechner.',
    ncTitle: 'Nuzlocke-Rechner', alphaNote: 'Frühe Testversion: Das Auslesen von ROM und Spielstand ist noch nicht mit allen Spielen und Emulatoren erprobt. Ergebnisse bitte im Spiel gegenprüfen und Fehler melden.',
    runs: 'Runs', newRun: '+ Neuer Run', runName: 'Name des Runs', game: 'Spiel (optional)',
    players: 'Spieler', player: 'Spieler {0}', defRun: 'Soul Link {0}', export: 'Exportieren', import: 'Importieren', del: 'Löschen',
    delConfirm: 'Run „{0}“ löschen?', route: 'Route / Ort', addLink: '+ Begegnung', routePh: 'z. B. Route 101',
    st_team: 'Team', st_box: 'Box', st_dead: 'Tot', st_missed: 'Verpasst',
    grp_team: 'Im Team', grp_box: 'In der Box', grp_dead: 'Friedhof', grp_missed: 'Verpasst / kein Fang',
    note: 'Notiz', notePh: 'z. B. Todesursache', nick: 'Spitzname', pick: 'Pokémon …', remove: 'Begegnung entfernen',
    removeConfirm: 'Begegnung „{0}“ entfernen?', typeRule: 'Typ-Regel im Team', tr_off: 'Aus', tr_primary: 'Kein gleicher Primärtyp', tr_any: 'Kein gemeinsamer Typ',
    typeRuleT: 'Klassische Soul-Link-Regel: Im Team darf jeder Spieler keine zwei Pokémon mit gleichem (Primär-)Typ haben',
    conflict: 'Typ-Konflikt: {0} teilt den Typ {1} mit {2}', tooMany: 'Mehr als 6 Begegnungen im Team',
    teamTitle: 'Team-Übersicht', teamEmpty: 'Noch keine Begegnung im Team. Setze den Status einer Begegnung auf „Team“.',
    linkEmpty: 'Noch keine Begegnungen. Trage oben eine Route ein und klicke auf „+ Begegnung“.',
    exportTitle: 'Run exportieren (zum Teilen mit den anderen Spielern)', importTitle: 'Run importieren', importHint: 'Exportierten Text hier einfügen:',
    importBtn: 'Als neuen Run importieren', importFail: 'Das ist kein gültiger Soul-Link-Export.', imported: 'Run importiert', unknown: 'Unbekanntes Pokémon: {0}',
    alive: 'leben', deadN: 'tot', linked: 'verbunden mit', count: '{0} Begegnungen', cancel: 'Abbrechen', deadAll: 'Stirbt eines, ist die ganze Verbindung tot.',
    moveUp: 'Nach oben', moveDown: 'Nach unten'
  } : {
    slTitle: 'Soul Link planner', slSub: 'Only for planning and tracking: which Pokémon are linked, who is in the team and who died. Does not calculate anything and is separate from the Nuzlocke calculator.',
    ncTitle: 'Nuzlocke calculator', alphaNote: 'Early test version: reading ROMs and saves has not been tried with all games and emulators yet. Please double-check results in the game and report problems.',
    runs: 'Runs', newRun: '+ New run', runName: 'Run name', game: 'Game (optional)',
    players: 'Players', player: 'Player {0}', defRun: 'Soul Link {0}', export: 'Export', import: 'Import', del: 'Delete',
    delConfirm: 'Delete run "{0}"?', route: 'Route / place', addLink: '+ Encounter', routePh: 'e.g. Route 101',
    st_team: 'Team', st_box: 'Box', st_dead: 'Dead', st_missed: 'Missed',
    grp_team: 'In the team', grp_box: 'In the box', grp_dead: 'Graveyard', grp_missed: 'Missed / no catch',
    note: 'Note', notePh: 'e.g. cause of death', nick: 'Nickname', pick: 'Pokémon …', remove: 'Remove encounter',
    removeConfirm: 'Remove encounter "{0}"?', typeRule: 'Type rule in the team', tr_off: 'Off', tr_primary: 'No shared primary type', tr_any: 'No shared type',
    typeRuleT: 'Classic Soul Link rule: in the team each player may not have two Pokémon with the same (primary) type',
    conflict: 'Type conflict: {0} shares the type {1} with {2}', tooMany: 'More than 6 encounters in the team',
    teamTitle: 'Team overview', teamEmpty: 'No encounter in the team yet. Set the status of an encounter to "Team".',
    linkEmpty: 'No encounters yet. Enter a route above and click "+ Encounter".',
    exportTitle: 'Export run (to share with the other players)', importTitle: 'Import run', importHint: 'Paste the exported text here:',
    importBtn: 'Import as new run', importFail: 'This is not a valid Soul Link export.', imported: 'Run imported', unknown: 'Unknown Pokémon: {0}',
    alive: 'alive', deadN: 'dead', linked: 'linked with', count: '{0} encounters', cancel: 'Cancel', deadAll: 'If one dies, the whole link is dead.',
    moveUp: 'Move up', moveDown: 'Move down'
  };
  function t(k) { var s = S[k] || k; for (var i = 1; i < arguments.length; i++) s = s.split('{' + (i - 1) + '}').join(arguments[i]); return s; }
  var STATUSES = ['team', 'box', 'dead', 'missed'];
  var PCOL = ['#3f8ae0', '#e0503f', '#3fae6a', '#d9a13a', '#9b6bd6', '#3fb7c2'];

  // ---------------- Pokémon names (all generations) ----------------
  function monName(n) { var d = NAT[n]; return d ? (de ? d[2] : d[1]) : ''; }
  var byName = null;
  function lookup(name) {
    if (!byName) {
      byName = {};
      for (var i = 1; i < NAT.length; i++) if (NAT[i]) { byName[norm(NAT[i][1])] = i; byName[norm(NAT[i][2])] = i; }
    }
    return byName[norm(name)] || 0;
  }
  function norm(s) { return String(s || '').toLowerCase().replace(/[\s.'’:-]/g, '').replace(/♀/g, 'f').replace(/♂/g, 'm'); }
  function spriteUrl(n) { var d = NAT[n]; return d ? 'https://play.pokemonshowdown.com/sprites/gen5/' + d[0] + '.png' : ''; }
  function sprite(n, cls) {
    var img = el('img', { class: cls || 'sl-sprite', alt: '', loading: 'lazy' });
    if (!n || !NAT[n]) { img.classList.add('none'); return img; }
    img.src = spriteUrl(n);
    img.onerror = function () { img.onerror = null; img.src = 'https://play.pokemonshowdown.com/sprites/dex/' + NAT[n][0] + '.png'; };
    return img;
  }
  function typesOf(n) { return NAT[n] ? NAT[n][3] : []; }

  // ---------------- storage ----------------
  function newId() { return 's' + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36); }
  var store = A.load('cc_soullink', null);
  if (!store || !Array.isArray(store.runs)) store = { runs: [], cur: null };
  function persist() { A.save('cc_soullink', store); }
  function newRun(name) {
    var r = { id: newId(), name: name || t('defRun', store.runs.length + 1), game: '', players: [t('player', 1), t('player', 2)], typeRule: 'primary', links: [] };
    store.runs.push(r); store.cur = r.id; persist();
    return r;
  }
  function run() {
    var r = null;
    store.runs.some(function (x) { if (x.id === store.cur) { r = x; return true; } return false; });
    if (!r) { r = store.runs[0] || newRun(); store.cur = r.id; }
    return r;
  }
  function fixRun(r) {
    if (!Array.isArray(r.players) || r.players.length < 2) r.players = [t('player', 1), t('player', 2)];
    if (r.players.length > 6) r.players = r.players.slice(0, 6);
    if (!Array.isArray(r.links)) r.links = [];
    r.links.forEach(function (l) {
      if (!l.id) l.id = newId();
      if (STATUSES.indexOf(l.status) === -1) l.status = 'box';
      if (!Array.isArray(l.mons)) l.mons = [];
      while (l.mons.length < r.players.length) l.mons.push({ n: 0, nick: '' });
    });
    if (['off', 'primary', 'any'].indexOf(r.typeRule) === -1) r.typeRule = 'primary';
    return r;
  }

  // ---------------- rules: type conflicts in the team ----------------
  // returns { linkId: [message, …] } for team links that break the type rule for a player
  function conflicts(r) {
    var res = {};
    if (r.typeRule === 'off') return res;
    var team = r.links.filter(function (l) { return l.status === 'team'; });
    for (var p = 0; p < r.players.length; p++) {
      for (var i = 0; i < team.length; i++) {
        for (var j = i + 1; j < team.length; j++) {
          var a = team[i].mons[p], b = team[j].mons[p];
          if (!a || !b || !a.n || !b.n) continue;
          var ta = typesOf(a.n), tb = typesOf(b.n);
          if (r.typeRule === 'primary') { ta = ta.slice(0, 1); tb = tb.slice(0, 1); }
          var shared = ta.filter(function (x) { return tb.indexOf(x) !== -1; });
          if (!shared.length) continue;
          var ty = shared.map(A.nType).join('/');
          (res[team[i].id] = res[team[i].id] || []).push(r.players[p] + ': ' + t('conflict', monName(a.n), ty, monName(b.n)));
          (res[team[j].id] = res[team[j].id] || []).push(r.players[p] + ': ' + t('conflict', monName(b.n), ty, monName(a.n)));
        }
      }
    }
    return res;
  }

  // ---------------- views ----------------
  // Soul-Link-Planer: own mode (#slView). It only plans and tracks, it does not calculate anything.
  var root = null;
  function render() {
    root = document.getElementById('slView');
    if (!root) return;
    root.innerHTML = '';
    var head = el('div', { class: 'nz-head' });
    head.appendChild(el('h2', { text: t('slTitle') }));
    head.appendChild(el('span', { class: 'hint', text: t('slSub') }));
    root.appendChild(head);
    var body = el('div', { class: 'nz-body' });
    root.appendChild(body);
    renderLink(body);
    renderStartArt();
  }
  // Nuzlocke calculator (#nuzView, js/nuzcalc.js): marked as alpha
  function renderNuz() {
    var r = document.getElementById('nuzView');
    if (!r) return;
    r.innerHTML = '';
    var head = el('div', { class: 'nz-head' });
    var h = el('h2', { text: t('ncTitle') });
    h.appendChild(el('span', { class: 'alpha-badge', text: 'ALPHA' }));
    head.appendChild(h);
    head.appendChild(el('span', { class: 'nz-alpha-note', text: t('alphaNote') }));
    r.appendChild(head);
    var body = el('div', { class: 'nz-body' });
    r.appendChild(body);
    if (window.CCNuzCalc) window.CCNuzCalc.render(body);
  }
  // ---------------- Soul Link ----------------
  var datalist = null;
  function ensureDatalist() {
    if (datalist) return;
    datalist = el('datalist', { id: 'slDex' });
    var h = '';
    for (var i = 1; i < NAT.length; i++) if (NAT[i]) h += '<option value="' + A.esc(monName(i)) + '">' + '#' + i + '</option>';
    datalist.innerHTML = h;
    document.body.appendChild(datalist);
  }

  function renderLink(body) {
    ensureDatalist();
    var r = fixRun(run());
    var wrap = el('div', { class: 'sl-wrap' });
    body.appendChild(wrap);

    // runs list
    var side = el('aside', { class: 'sl-runs panel' });
    var sh = el('div', { class: 'sl-runs-head' });
    sh.appendChild(el('span', { class: 'sl-title', text: t('runs') }));
    var nb = el('button', { class: 'tbtn', text: t('newRun') });
    nb.addEventListener('click', function () { newRun(); render(); });
    sh.appendChild(nb);
    side.appendChild(sh);
    store.runs.forEach(function (x) {
      fixRun(x);
      var b = el('button', { class: 'sl-run' + (x.id === r.id ? ' on' : '') });
      b.appendChild(el('span', { class: 'sl-run-name', text: x.name || '—' }));
      var dead = x.links.filter(function (l) { return l.status === 'dead'; }).length;
      var alive = x.links.filter(function (l) { return l.status === 'team' || l.status === 'box'; }).length;
      b.appendChild(el('span', { class: 'sl-run-meta', text: x.players.length + ' ' + t('players') + ' · ' + alive + ' ' + t('alive') + ' · ' + dead + ' ' + t('deadN') }));
      b.addEventListener('click', function () { store.cur = x.id; persist(); render(); });
      side.appendChild(b);
    });
    var ib = el('button', { class: 'tbtn sl-import', text: t('import') });
    ib.addEventListener('click', openImport);
    side.appendChild(ib);
    wrap.appendChild(side);

    var main = el('section', { class: 'sl-main' });
    wrap.appendChild(main);

    // head: name, game, actions
    var head = el('div', { class: 'sl-head' });
    var nm = el('input', { class: 'sl-name', type: 'text', placeholder: t('runName') });
    nm.value = r.name;
    nm.addEventListener('input', function () { r.name = nm.value; persist(); });
    nm.addEventListener('change', render);
    head.appendChild(nm);
    var gm = el('input', { class: 'sl-game', type: 'text', placeholder: t('game') });
    gm.value = r.game || '';
    gm.addEventListener('input', function () { r.game = gm.value; persist(); });
    head.appendChild(gm);
    var ex = el('button', { class: 'tbtn', text: t('export') });
    ex.addEventListener('click', function () { A.showModal(t('exportTitle'), JSON.stringify({ soullink: 1, run: r })); });
    head.appendChild(ex);
    var dl = el('button', { class: 'tbtn danger', text: t('del') });
    dl.addEventListener('click', function () {
      if (!confirm(t('delConfirm', r.name))) return;
      store.runs = store.runs.filter(function (x) { return x.id !== r.id; });
      store.cur = store.runs[0] ? store.runs[0].id : null;
      persist(); render();
    });
    head.appendChild(dl);
    main.appendChild(head);

    // players
    var pl = el('div', { class: 'sl-players' });
    pl.appendChild(el('span', { class: 'sl-lbl', text: t('players') }));
    var cnt = el('div', { class: 'btn-group sl-count' });
    [2, 3, 4, 5, 6].forEach(function (n) {
      var b = el('button', { class: r.players.length === n ? 'on' : '', text: String(n) });
      b.addEventListener('click', function () {
        while (r.players.length < n) r.players.push(t('player', r.players.length + 1));
        if (r.players.length > n) r.players = r.players.slice(0, n);
        r.links.forEach(function (l) { while (l.mons.length < n) l.mons.push({ n: 0, nick: '' }); });
        persist(); render();
      });
      cnt.appendChild(b);
    });
    pl.appendChild(cnt);
    r.players.forEach(function (p, i) {
      var w = el('label', { class: 'sl-pname' });
      w.style.setProperty('--pc', PCOL[i]);
      var inp = el('input', { type: 'text' });
      inp.value = p;
      inp.addEventListener('input', function () { r.players[i] = inp.value; persist(); });
      inp.addEventListener('change', render);
      w.appendChild(inp);
      pl.appendChild(w);
    });
    var tr = el('label', { class: 'sl-rule', title: t('typeRuleT') });
    tr.appendChild(el('span', { class: 'sl-lbl', text: t('typeRule') }));
    var sel = el('select');
    ['primary', 'any', 'off'].forEach(function (k) { var o = el('option', { value: k, text: t('tr_' + k) }); if (r.typeRule === k) o.selected = true; sel.appendChild(o); });
    sel.addEventListener('change', function () { r.typeRule = sel.value; persist(); render(); });
    tr.appendChild(sel);
    pl.appendChild(tr);
    main.appendChild(pl);

    var conf = conflicts(r);
    var team = r.links.filter(function (l) { return l.status === 'team'; });

    // team overview: one card per link, the linked Pokémon of all players stacked
    var ov = el('div', { class: 'sl-overview panel' });
    var oh = el('div', { class: 'sl-ov-head' });
    oh.appendChild(el('span', { class: 'sl-title', text: t('teamTitle') + ' · ' + team.length + '/6' }));
    var chips = el('span', { class: 'sl-chips' });
    STATUSES.forEach(function (s) {
      var c = el('span', { class: 'sl-chip st-' + s, text: t('st_' + s) + ' ' + r.links.filter(function (l) { return l.status === s; }).length });
      chips.appendChild(c);
    });
    oh.appendChild(chips);
    ov.appendChild(oh);
    if (team.length > 6) ov.appendChild(el('div', { class: 'sl-warn', text: '⚠ ' + t('tooMany') }));
    var cards = el('div', { class: 'sl-cards' });
    if (!team.length) cards.appendChild(el('div', { class: 'hint', text: t('teamEmpty') }));
    team.forEach(function (l) {
      var c = el('div', { class: 'sl-card' + (conf[l.id] ? ' bad' : '') });
      if (conf[l.id]) c.title = conf[l.id].join('\n');
      c.appendChild(el('div', { class: 'sl-card-route', text: (conf[l.id] ? '⚠ ' : '') + (l.route || '—') }));
      r.players.forEach(function (p, i) {
        var m = l.mons[i] || {};
        var row = el('div', { class: 'sl-card-mon' });
        row.style.setProperty('--pc', PCOL[i]);
        row.appendChild(sprite(m.n, 'sl-card-img'));
        var txt = el('div', { class: 'sl-card-txt' });
        txt.appendChild(el('div', { class: 'sl-card-name', text: m.nick || monName(m.n) || '—' }));
        txt.appendChild(el('div', { class: 'sl-card-sub', text: p + (m.nick && m.n ? ' · ' + monName(m.n) : '') }));
        row.appendChild(txt);
        c.appendChild(row);
        if (i < r.players.length - 1) c.appendChild(el('div', { class: 'sl-chain', text: '⛓' }));
      });
      cards.appendChild(c);
    });
    ov.appendChild(cards);
    main.appendChild(ov);

    // add encounter
    var add = el('div', { class: 'sl-add' });
    var ri = el('input', { type: 'text', placeholder: t('routePh') });
    var ab = el('button', { class: 'primary-btn', text: t('addLink') });
    function addLink() {
      var mons = r.players.map(function () { return { n: 0, nick: '' }; });
      r.links.push({ id: newId(), route: ri.value.trim(), status: 'box', note: '', mons: mons });
      persist(); render();
      var last = root.querySelector('.sl-row:last-of-type .sl-mon input');
      var rows = root.querySelectorAll('.sl-grp-box .sl-row');
      var inp = rows.length ? rows[rows.length - 1].querySelector('.sl-mon input') : last;
      if (inp) inp.focus();
    }
    ab.addEventListener('click', addLink);
    ri.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') addLink(); });
    add.appendChild(ri); add.appendChild(ab);
    add.appendChild(el('span', { class: 'hint', text: t('deadAll') }));
    main.appendChild(add);

    // table of all encounters, grouped by status
    var tbl = el('div', { class: 'sl-table panel' });
    tbl.style.setProperty('--np', r.players.length);
    var hr = el('div', { class: 'sl-row sl-hrow' });
    hr.appendChild(el('span', { text: t('route') }));
    r.players.forEach(function (p, i) { var s = el('span', { class: 'sl-ph', text: p }); s.style.setProperty('--pc', PCOL[i]); hr.appendChild(s); });
    hr.appendChild(el('span', { text: 'Status' }));
    hr.appendChild(el('span', { text: t('note') }));
    hr.appendChild(el('span'));
    tbl.appendChild(hr);
    if (!r.links.length) tbl.appendChild(el('div', { class: 'hint sl-empty', text: t('linkEmpty') }));
    STATUSES.forEach(function (s) {
      var ls = r.links.filter(function (l) { return l.status === s; });
      if (!ls.length) return;
      var g = el('div', { class: 'sl-grp sl-grp-' + s });
      g.appendChild(el('div', { class: 'sl-grp-head st-' + s, text: t('grp_' + s) + ' (' + ls.length + ')' }));
      ls.forEach(function (l) { g.appendChild(linkRow(r, l, conf[l.id])); });
      tbl.appendChild(g);
    });
    main.appendChild(tbl);
  }

  function linkRow(r, l, conf) {
    var row = el('div', { class: 'sl-row st-' + l.status + (conf ? ' bad' : '') });
    if (conf) row.title = conf.join('\n');
    var rt = el('input', { class: 'sl-route', type: 'text', placeholder: t('route') });
    rt.value = l.route || '';
    rt.addEventListener('input', function () { l.route = rt.value; persist(); });
    rt.addEventListener('change', render);
    row.appendChild(rt);
    r.players.forEach(function (p, i) {
      var m = l.mons[i];
      var cell = el('div', { class: 'sl-mon' });
      cell.style.setProperty('--pc', PCOL[i]);
      cell.appendChild(sprite(m.n));
      var f = el('div', { class: 'sl-mon-f' });
      var inp = el('input', { type: 'text', list: 'slDex', placeholder: t('pick') });
      inp.value = monName(m.n);
      inp.addEventListener('change', function () {
        var v = inp.value.trim();
        var n = v ? lookup(v) : 0;
        if (v && !n) { A.toast(t('unknown', v)); inp.value = monName(m.n); return; }
        m.n = n; persist(); render();
      });
      f.appendChild(inp);
      var nk = el('input', { class: 'sl-nick', type: 'text', placeholder: t('nick') });
      nk.value = m.nick || '';
      nk.addEventListener('input', function () { m.nick = nk.value; persist(); });
      nk.addEventListener('change', render);
      f.appendChild(nk);
      var ty = el('div', { class: 'sl-types' });
      typesOf(m.n).forEach(function (x) { ty.appendChild(A.typeBadge(x)); });
      f.appendChild(ty);
      cell.appendChild(f);
      row.appendChild(cell);
    });
    var st = el('div', { class: 'btn-group sl-status' });
    STATUSES.forEach(function (s) {
      var b = el('button', { class: 'st-' + s + (l.status === s ? ' on' : ''), text: t('st_' + s), 'data-st': s });
      b.addEventListener('click', function () { l.status = s; persist(); render(); });
      st.appendChild(b);
    });
    row.appendChild(st);
    var nt = el('input', { class: 'sl-note', type: 'text', placeholder: t('notePh') });
    nt.value = l.note || '';
    nt.addEventListener('input', function () { l.note = nt.value; persist(); });
    row.appendChild(nt);
    var tools = el('div', { class: 'sl-tools' });
    function mv(d) {
      var i = r.links.indexOf(l), j = i + d;
      // move within the same status group
      while (j >= 0 && j < r.links.length && r.links[j].status !== l.status) j += d;
      if (j < 0 || j >= r.links.length) return;
      r.links[i] = r.links[j]; r.links[j] = l; persist(); render();
    }
    var up = el('button', { text: '▲', title: t('moveUp') }); up.addEventListener('click', function () { mv(-1); });
    var dn = el('button', { text: '▼', title: t('moveDown') }); dn.addEventListener('click', function () { mv(1); });
    var x = el('button', { class: 'del', text: '✕', title: t('remove') });
    x.addEventListener('click', function () {
      if (!confirm(t('removeConfirm', l.route || '—'))) return;
      r.links = r.links.filter(function (y) { return y !== l; }); persist(); render();
    });
    tools.appendChild(up); tools.appendChild(dn); tools.appendChild(x);
    row.appendChild(tools);
    return row;
  }

  function openImport() {
    var m = el('div', { class: 'modal' });
    var bx = el('div', { class: 'modal-box' });
    bx.appendChild(el('h3', { text: t('importTitle') }));
    bx.appendChild(el('div', { class: 'hint', text: t('importHint') }));
    var ta = el('textarea', { spellcheck: 'false' });
    bx.appendChild(ta);
    var act = el('div', { class: 'modal-actions' });
    var ok = el('button', { class: 'primary-btn', text: t('importBtn') });
    var cc = el('button', { text: t('cancel') });
    act.appendChild(ok); act.appendChild(cc);
    bx.appendChild(act);
    m.appendChild(bx);
    document.body.appendChild(m);
    ta.focus();
    function close() { m.remove(); }
    cc.addEventListener('click', close);
    m.addEventListener('mousedown', function (ev) { if (ev.target === m) close(); });
    ok.addEventListener('click', function () {
      var data = null;
      try { data = JSON.parse(ta.value); } catch (e) { data = null; }
      var r = data && data.run;
      if (!r || !Array.isArray(r.links) || !Array.isArray(r.players)) { A.toast(t('importFail')); return; }
      r = JSON.parse(JSON.stringify(r));
      r.id = newId();
      r.links.forEach(function (l) { l.id = newId(); (l.mons || []).forEach(function (x) { x.n = +x.n || 0; if (!NAT[x.n]) x.n = 0; x.nick = String(x.nick || ''); }); });
      store.runs.push(fixRun(r)); store.cur = r.id; persist();
      close(); A.toast(t('imported')); render();
    });
  }

  // start screen card: the first linked pairs of the current run (or an example)
  function renderStartArt() {
    var box = document.getElementById('startSL');
    if (!box) return;
    var r = store.runs.length ? fixRun(run()) : null;
    var pairs = [];
    if (r) r.links.forEach(function (l) { if (pairs.length < 3 && (l.status === 'team' || l.status === 'box') && l.mons[0] && l.mons[0].n && l.mons[1] && l.mons[1].n) pairs.push([l.mons[0].n, l.mons[1].n]); });
    if (!pairs.length) pairs = [[252, 258], [255, 261], [280, 263]];
    box.innerHTML = '';
    pairs.forEach(function (p) {
      var c = el('span', { class: 'sc-link' });
      c.appendChild(sprite(p[0], 'sc-link-img'));
      c.appendChild(el('span', { class: 'sc-chain', text: '⛓' }));
      c.appendChild(sprite(p[1], 'sc-link-img'));
      box.appendChild(c);
    });
  }

  window.CCSoulLink = { render: render };
  window.CCNuz = { render: renderNuz, renderStartArt: renderStartArt, monName: monName, sprite: sprite, lookup: lookup, store: function () { return store; } };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', renderStartArt); else renderStartArt();
})();

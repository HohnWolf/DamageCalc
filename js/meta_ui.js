// Meta-Test in the teambuilder. Desktop runs the local Showdown simulator.
// Android and the browser only get the instant panel plus an optional rough damage check.
(function () {
  'use strict';
  var A = window.CC;
  if (!A) return;
  var el = A.el, de = A.LANG === 'de';
  var KEY = 'cc_metateams';
  var modal = null;
  var current = null;
  var ipcBound = false;

  function T(deText, enText) { return de ? deText : enText; }
  function pct(x) { return Math.round(x * 1000) / 10; }
  function decode(s) {
    if (window.RLMetaText) return window.RLMetaText.decodeEntities(s);
    return s == null ? '' : String(s);
  }
  function normTeam(t) {
    if (t && window.RLMetaText) window.RLMetaText.normalizeTeam(t);
    return t;
  }
  function wrClass(p) { return p >= 0.6 ? 'wr hi' : p >= 0.45 ? 'wr mid' : 'wr lo'; }
  function idOf(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ''); }

  function cache() {
    var bundled = window.RL_META_TEAMS || { format: '', teams: [] };
    var saved = A.load(KEY, null);
    var user = (saved && saved.teams || []).filter(function (t) { return t && (t.source === 'paste' || t.source === 'pokepaste'); });
    user.forEach(normTeam);
    var teams = (bundled.teams || []).map(function (t) { return normTeam(Object.assign({}, t)); }).concat(user);
    var next = { format: bundled.format, date: bundled.date, source: 'bundle', teams: teams };
    A.save(KEY, next);
    return next;
  }
  function saveUser(team) {
    var saved = A.load(KEY, { teams: [] }) || { teams: [] };
    saved.teams = (saved.teams || []).filter(function (t) { return t.source === 'paste' || t.source === 'pokepaste'; });
    normTeam(team);
    saved.teams.push(team);
    A.save(KEY, saved);
  }

  function formeOf(species, set) {
    var dex = A.DEX || {};
    if (set.forme && dex[set.forme] && String(set.forme).indexOf('Mega ') !== 0) return set.forme;
    var item = set.item || '';
    if (!/ite/.test(item) || item === 'Eviolite') return species;
    var hits = Object.keys(dex).filter(function (k) { return k.indexOf('Mega ' + species) === 0; });
    var letter = /[XYZ]$/.test(item) ? item.slice(-1) : '';
    if (letter) {
      var prefer = hits.filter(function (k) { return k.slice(-1) === letter; })[0];
      if (prefer) return prefer;
    }
    return hits[0] || species;
  }
  function monFrom(species, set, usage) {
    var name = formeOf(species, set || {});
    var d = (A.DEX || {})[name] || (A.DEX || {})[species];
    if (!d || !d.bs) return null;
    var sps = (set && set.sps) || {};
    var nature = (set && set.nature) || 'Serious';
    var stats = {};
    window.Calc.STAT_KEYS.forEach(function (k) {
      stats[k] = window.Calc.calcStat(k, d.bs[k], sps[k] || 0, nature, name);
    });
    var moves = ((set && set.moves) || []).map(function (mv) {
      var data = (A.MOVES || {})[mv] || {};
      var acc = window.MOVE_ACC ? window.MOVE_ACC[idOf(mv)] : 100;
      return {
        name: mv, bp: data.bp || 0, type: data.type, category: data.category || 'Status',
        makesContact: !!data.makesContact, isSpread: !!data.isSpread, isSound: !!data.isSound,
        isPunch: !!data.isPunch, isBite: !!data.isBite, isSlice: !!data.isSlice, isPulse: !!data.isPulse,
        hasSecondaryEffect: !!data.hasSecondaryEffect, accuracy: acc === true ? 100 : (acc || 100)
      };
    });
    return {
      name: name, types: [d.t1, d.t2].filter(Boolean), stats: stats, ability: (set && set.ability) || d.ab || '',
      item: (set && set.item) || '', nature: nature, moves: moves, weight: d.w || 50, usage: usage || 0
    };
  }
  function usageOf(name) {
    var table = window.RL_META_SPREADS && window.RL_META_SPREADS.pokemon;
    if (!table) return 0;
    var row = table[name] || table[name.replace(/^Mega /, '')];
    return row && row.usage || 0;
  }
  function teamMons(entry) {
    if (entry.mons) {
      return entry.mons.map(function (m) { return monFrom(m.species, m.set, usageOf(m.species)); }).filter(Boolean);
    }
    var parsed = A.parseShowdown ? A.parseShowdown(entry.paste || '') : { mons: [] };
    return (parsed.mons || []).map(function (m) { return monFrom(m.species, m.set, usageOf(m.species)); }).filter(Boolean);
  }
  function pasteOf(entry) {
    if (entry.paste) return entry.paste;
    return (entry.mons || []).map(function (m) { return A.exportSet(m.set, m.setName, m.species); }).join('\n\n');
  }

  function open(entry) {
    if (modal) modal.remove();
    var store = cache();
    var state = current = {
      entry: entry, scope: 'top8', level: 2, games: 200, arch: '',
      selected: null, running: false, job: null, rows: [],
      sort: { key: 'wr', dir: -1 }
    };
    modal = el('div', { class: 'modal meta-modal' });
    var box = el('div', { class: 'modal-box' });
    modal.appendChild(box);
    document.body.appendChild(modal);
    function close() { if (state.running && window.desktop && window.desktop.meta) window.desktop.meta.cancel(); modal.remove(); modal = null; }
    modal.addEventListener('mousedown', function (ev) { if (ev.target === modal) close(); });
    document.addEventListener('keydown', function key(ev) {
      if (ev.key === 'Escape' && modal) { ev.stopPropagation(); close(); document.removeEventListener('keydown', key, true); }
    }, true);

    function filtered() {
      return store.teams.filter(function (t) { return !state.arch || t.archetype === state.arch; });
    }
    function picked() {
      var list = filtered();
      if (state.scope === 'all') return list;
      if (state.scope === 'arch') {
        var seen = {};
        return list.filter(function (t) { if (seen[t.cluster || t.archetype]) return false; seen[t.cluster || t.archetype] = 1; return true; });
      }
      var n = state.scope === 'top16' ? 16 : 8;
      return list.slice(0, n);
    }

    function draw() {
      var mine = teamMons(state.entry);
      var foeTeam = state.selected;
      var foe = foeTeam ? teamMons(foeTeam) : [];
      box.innerHTML = '';
      var head = el('div', { class: 'meta-head' });
      head.appendChild(el('h3', { text: T('Meta-Test', 'Meta test') + ' · ' + (state.entry.name || '') }));
      head.appendChild(el('span', { class: 'hint', text: T('Nur lokal, kein Pokémon-Showdown-Server.', 'Local only, no Pokémon Showdown server.') }));
      var x = el('button', { class: 'icon-btn', text: '✕', title: T('Schließen', 'Close') });
      x.addEventListener('click', close);
      head.appendChild(x);
      box.appendChild(head);
      var body = el('div', { class: 'meta-body' });
      body.appendChild(sidePanel());
      var main = el('div', { class: 'meta-main' });
      if (!window.desktop || !window.desktop.meta) {
        main.appendChild(el('p', { class: 'meta-warn', text: window.RL_ANDROID
          ? T('Android: volle Simulation nur in der Desktop-App. Unten eine grobe Schnellprüfung (Schadensrechner, 30 Spiele).', 'Android: the full simulation is desktop-only. Below is a rough 30-game damage check.')
          : T('Der volle Simulator läuft in der Desktop-App. Hier siehst du die sofortige Rechnung und optional eine grobe Schnellprüfung.', 'The full simulator runs in the desktop app. Here you get the instant calc and an optional rough check.') }));
      }
      main.appendChild(instant(mine, foe));
      main.appendChild(results());
      body.appendChild(main);
      box.appendChild(body);
    }

    function sidePanel() {
      var side = el('div', { class: 'meta-side' });
      side.appendChild(field(T('Spiele pro Team', 'Games per team'), seg([
        ['50', T('Schnell 50', 'Quick 50')], ['200', T('Normal 200', 'Normal 200')], ['1000', T('Genau 1000', 'Precise 1000')]
      ], String(state.games), function (v) { state.games = +v; })));
      side.appendChild(field(T('Bot-Stufe (beide Seiten)', 'Bot level (both sides)'), seg([
        ['0', T('Zufall', 'Random')], ['1', T('Schaden', 'Damage')], ['2', T('Doppel', 'Doubles')], ['3', T('Vorausschau', 'Lookahead')]
      ], String(state.level), function (v) { state.level = +v; })));
      side.appendChild(field(T('Meta-Teams', 'Meta teams'), seg([
        ['top8', 'Top 8'], ['top16', 'Top 16'], ['arch', T('Je Archetyp', 'Per archetype')], ['all', T('Alle', 'All')]
      ], state.scope, function (v) { state.scope = v; draw(); })));
      var arches = {};
      store.teams.forEach(function (t) { if (t.archetype) arches[t.archetype] = 1; });
      var archRow = el('div', { class: 'meta-arch' });
      [['', T('Alle Typen', 'All styles')]].concat(Object.keys(arches).sort().map(function (a) { return [a, a]; })).forEach(function (pair) {
        var b = el('button', { type: 'button', class: 'tbtn' + (state.arch === pair[0] ? ' on' : ''), text: pair[1] });
        b.addEventListener('click', function () { state.arch = pair[0]; draw(); });
        archRow.appendChild(b);
      });
      side.appendChild(archRow);
      var list = el('div', { class: 'meta-list' });
      picked().forEach(function (t) {
        var name = decode(t.name);
        var sub = (decode(t.archetype) || '') + (t.assumed ? (de ? ' · Annahme' : ' · assumed') : '');
        if (t.species && t.species.length) sub += (sub ? ' · ' : '') + t.species.slice(0, 4).join(', ');
        var b = el('button', {
          type: 'button',
          class: 'meta-team' + (state.selected && state.selected.id === t.id ? ' on' : ''),
          title: sub ? (name + '\n' + sub) : name
        });
        b.appendChild(el('span', { class: 'mt-title', text: name }));
        b.appendChild(el('span', { class: 'mt-sub', text: sub }));
        b.addEventListener('click', function () { state.selected = t; draw(); });
        list.appendChild(b);
      });
      side.appendChild(list);
      var acts = el('div', { class: 'meta-actions' });
      var go = el('button', { type: 'button', class: 'primary-btn', text: state.running ? T('Läuft …', 'Running …') : T('Test starten', 'Start test') });
      if (state.running) go.disabled = true;
      go.addEventListener('click', function () { begin(false); });
      acts.appendChild(go);
      if (!window.desktop || !window.desktop.meta) {
        var rough = el('button', { class: 'tbtn', text: T('Grobe 30', 'Rough 30') });
        rough.addEventListener('click', function () { begin(true); });
        acts.appendChild(rough);
      } else if (state.running) {
        var stop = el('button', { class: 'tbtn', text: T('Abbrechen', 'Cancel') });
        stop.addEventListener('click', function () { window.desktop.meta.cancel(); });
        acts.appendChild(stop);
      }
      var imp = el('button', { class: 'tbtn', text: T('Paste', 'Paste') });
      imp.addEventListener('click', importPaste);
      acts.appendChild(imp);
      side.appendChild(acts);
      var prog = el('div', { class: 'meta-progress', id: 'metaProg' });
      prog.appendChild(el('span', { id: 'metaProgFill' }));
      side.appendChild(prog);
      side.appendChild(el('div', { class: 'meta-note', id: 'metaMsg', text: T(picked().length + ' Teams in der Auswahl.', picked().length + ' teams selected.') }));
      return side;
    }
    function field(label, node) {
      var f = el('div', { class: 'meta-field' });
      f.appendChild(el('span', { text: label }));
      f.appendChild(node);
      return f;
    }
    function seg(options, cur, on) {
      var row = el('div', { class: 'meta-seg' });
      options.forEach(function (o) {
        var b = el('button', { type: 'button', class: 'tbtn' + (String(cur) === String(o[0]) ? ' on' : ''), text: o[1] });
        b.addEventListener('click', function () { on(o[0]); if (modal) draw(); });
        row.appendChild(b);
      });
      return row;
    }

    function instant(mine, foe) {
      var card = el('div', { class: 'meta-card' });
      card.appendChild(el('h4', { text: T('Sofort, ohne Simulation', 'Instant, no simulation') }));
      if (!mine.length) { card.appendChild(el('p', { class: 'meta-bad', text: T('Das Team ist leer.', 'The team is empty.') })); return card; }
      if (!foe.length) { card.appendChild(el('p', { class: 'meta-note', text: T('Links ein Meta-Team wählen, dann stehen Initiative, K.O.-Chancen und Bedrohungen hier.', 'Pick a meta team on the left for speed, KO chances and threats.') })); return card; }
      var report = window.RLMetaPreview.analyze(window.Calc, mine, foe);
      var table = el('table', { class: 'meta-speeds' });
      table.innerHTML = '<thead><tr><th></th><th>' + T('Init', 'Spe') + '</th><th>Scarf</th><th>Tailwind</th></tr></thead>';
      var tb = el('tbody');
      report.speeds.mine.forEach(function (r) { tb.appendChild(speedRow(r, T('Du', 'You'))); });
      report.speeds.foe.forEach(function (r) { tb.appendChild(speedRow(r, T('Meta', 'Meta'))); });
      table.appendChild(tb);
      card.appendChild(table);
      card.appendChild(el('p', { class: 'meta-note', text: T('Trick Room dreht die Reihenfolge um. Scarf und Tailwind sind gerechnet, nicht simuliert.', 'Trick Room reverses the order. Scarf and Tailwind are calculated, not simulated.') }));
      var mx = el('table', { class: 'meta-matrix' });
      var head = '<tr><th>' + T('Dein Angriff', 'Your attack') + '</th>' + foe.map(function (f) { return '<th>' + esc(f.name) + '</th>'; }).join('') + '</tr>';
      mx.innerHTML = '<thead>' + head + '</thead>';
      var mb = el('tbody');
      report.mineHits.forEach(function (row) {
        var tr = el('tr');
        tr.appendChild(el('td', { text: row.name }));
        row.vs.forEach(function (cell) { tr.appendChild(koCell(cell.hit)); });
        mb.appendChild(tr);
      });
      mx.appendChild(mb);
      card.appendChild(mx);
      if (report.threats.length) {
        var ul = el('ul', { class: 'meta-note' });
        report.threats.slice(0, 4).forEach(function (t) {
          var line = t.name + (t.ko && t.ko.text ? ' · ' + t.ko.text : '') + (t.counter ? (de ? ' · Antwort: ' : ' · answer: ') + t.counter.name : '');
          ul.appendChild(el('li', { text: line }));
        });
        card.appendChild(el('h4', { text: T('Bedrohungen (Nutzung × Gefahr)', 'Threats (usage × danger)') }));
        card.appendChild(ul);
      }
      return card;
    }
    function speedRow(r, side) {
      var tr = el('tr');
      tr.appendChild(el('td', { text: side + ' ' + r.name }));
      tr.appendChild(el('td', { text: String(r.base) }));
      tr.appendChild(el('td', { text: String(r.scarf) }));
      tr.appendChild(el('td', { text: String(r.tailwind) }));
      return tr;
    }
    function koCell(hit) {
      var td = el('td');
      if (!hit || !hit.ko || !hit.ko.n) { td.textContent = '–'; td.className = 'ko3'; return td; }
      td.textContent = hit.ko.n === 1 ? 'OHKO' : hit.ko.n === 2 ? '2HKO' : (hit.ko.n + 'HKO');
      if (hit.ko.chance && hit.ko.chance < 1) td.textContent = Math.round(hit.ko.chance * 100) + '% ' + td.textContent;
      td.className = hit.ko.n === 1 ? 'ko1' : hit.ko.n === 2 ? 'ko2' : 'ko3';
      return td;
    }
    function rateOf(row) {
      var d = (row.winsA || 0) + (row.winsB || 0);
      return d ? row.winsA / d : -1;
    }
    function sortedRows() {
      var key = state.sort.key, dir = state.sort.dir || 1;
      return state.rows.slice().sort(function (a, b) {
        if (key === 'name') {
          var av = decode(a.name || '').toLowerCase(), bv = decode(b.name || '').toLowerCase();
          if (av === bv) return 0;
          return (av < bv ? -1 : 1) * dir;
        }
        var av = key === 'turns' ? (a.avgTurns || 0) : key === 'rec' ? (a.winsA || 0) : rateOf(a);
        var bv = key === 'turns' ? (b.avgTurns || 0) : key === 'rec' ? (b.winsA || 0) : rateOf(b);
        return (av - bv) * dir;
      });
    }
    function sumCard(label, value, sub) {
      var d = el('div', { class: 'meta-sum' });
      d.appendChild(el('span', { text: label }));
      d.appendChild(el('b', { text: value, title: value }));
      if (sub) d.appendChild(el('small', { text: sub, title: sub }));
      return d;
    }
    function summary() {
      var box = el('div', { class: 'meta-summary' });
      var wins = 0, losses = 0, ties = 0, unfinished = 0, best = null, worst = null;
      state.rows.forEach(function (r) {
        wins += r.winsA || 0; losses += r.winsB || 0; ties += r.ties || 0; unfinished += r.unfinished || 0;
        var p = rateOf(r);
        if (p < 0) return;
        var item = { p: p, name: decode(r.name || '') };
        if (!best || p > best.p) best = item;
        if (!worst || p < worst.p) worst = item;
      });
      var decided = wins + losses;
      var record = decided ? (wins + '–' + ties + '–' + losses) : '';
      if (unfinished) record += (record ? ' · ' : '') + (de ? 'unfertig ' : 'unfinished ') + unfinished;
      box.appendChild(sumCard(T('Gesamt', 'Overall'), decided ? (pct(wins / decided) + '%') : '–', record || T('Keine entschiedenen Spiele', 'No decided games')));
      box.appendChild(sumCard(T('Bestes Matchup', 'Best matchup'), best ? (pct(best.p) + '%') : '–', best ? best.name : ''));
      box.appendChild(sumCard(T('Schwächstes Matchup', 'Worst matchup'), worst ? (pct(worst.p) + '%') : '–', worst ? worst.name : ''));
      return box;
    }
    function legend() {
      var d = el('div', { class: 'meta-legend' });
      function chip(kind, label) {
        var s = el('span');
        s.appendChild(el('i', { class: 'meta-swatch ' + kind }));
        s.appendChild(document.createTextNode(label));
        return s;
      }
      d.appendChild(chip('hi', T('hohe Siegquote', 'high win rate')));
      d.appendChild(chip('mid', T('ausgeglichen', 'even')));
      d.appendChild(chip('lo', T('niedrige Siegquote', 'low win rate')));
      var ci = el('span');
      ci.appendChild(el('i', { class: 'meta-ci' }));
      ci.appendChild(document.createTextNode(T('Konfidenz', 'Confidence')));
      d.appendChild(ci);
      d.appendChild(el('span', { text: T('S–U–N = Siege, Unentschieden, Niederlagen', 'W–D–L = wins, draws, losses') }));
      return d;
    }
    function sortHead(key, label, cls) {
      var mark = state.sort.key === key ? (state.sort.dir < 0 ? ' \u25BC' : ' \u25B2') : '';
      var cell = el('th', { class: cls, text: label + mark });
      cell.addEventListener('click', function () {
        if (state.sort.key === key) state.sort.dir = -state.sort.dir;
        else state.sort = { key: key, dir: key === 'name' ? 1 : -1 };
        draw();
      });
      return cell;
    }
    function results() {
      var card = el('div', { class: 'meta-card', id: 'metaResultsCard' });
      card.appendChild(el('h4', { text: T('Simulation', 'Simulation') }));
      if (!state.rows.length && !state.running) {
        card.appendChild(el('p', { class: 'meta-note', text: T('Noch keine Spiele. Unfertige Partien zählen nicht als Niederlage.', 'No games yet. Unfinished games are not losses.') }));
        return card;
      }
      card.appendChild(summary());
      card.appendChild(legend());
      var wrap = el('div', { class: 'meta-res-wrap' });
      var table = el('table', { class: 'meta-res' });
      var head = el('thead');
      var hr = el('tr');
      hr.appendChild(sortHead('name', T('Team', 'Team'), 'col-name'));
      hr.appendChild(sortHead('wr', T('Siegquote', 'Win rate'), 'col-wr'));
      hr.appendChild(sortHead('rec', T('S–U–N', 'W–D–L'), 'col-rec'));
      hr.appendChild(sortHead('turns', T('Werte', 'Stats'), 'col-stat'));
      hr.appendChild(el('th', { class: 'col-act', text: '' }));
      head.appendChild(hr);
      table.appendChild(head);
      var tb = el('tbody', { id: 'metaResults' });
      sortedRows().forEach(function (row) { tb.appendChild(resultRow(row)); });
      table.appendChild(tb);
      wrap.appendChild(table);
      card.appendChild(wrap);
      return card;
    }
    function statLine(host, k, v, extra) {
      host.appendChild(el('span', { text: k }));
      host.appendChild(el('b', { text: v || '–', title: v || '' }));
      host.appendChild(el('span', { text: extra || '' }));
    }
    function resultRow(row) {
      var tr = el('tr');
      var name = decode(row.name || '');
      var tdN = el('td', { class: 'col-name' });
      tdN.appendChild(el('span', { class: 'meta-nm', text: name, title: name }));
      if (row.rough) tdN.appendChild(el('div', { class: 'meta-warn', text: T('Grobe Prüfung, kein voller Simulator', 'Rough check, not the full simulator') }));
      if (row.error) tdN.appendChild(el('div', { class: 'meta-bad', text: row.error }));
      tr.appendChild(tdN);
      var decided = (row.winsA || 0) + (row.winsB || 0);
      var p = decided ? row.winsA / decided : 0;
      var ci = row.ci || { p: p, lo: p, hi: p };
      var tdW = el('td', { class: 'col-wr' });
      var cell = el('div', { class: 'meta-wr-cell' });
      var bar = el('div', { class: 'meta-bar ' + wrClass(ci.p || 0), title: T('Siegquote, Markierung = Konfidenz', 'Win rate, marks = confidence') });
      var fill = el('i'); fill.style.width = Math.round((ci.p || 0) * 100) + '%';
      var band = el('b');
      band.style.left = Math.round((ci.lo || 0) * 100) + '%';
      band.style.width = Math.max(2, Math.round(((ci.hi || 0) - (ci.lo || 0)) * 100)) + '%';
      bar.appendChild(fill); bar.appendChild(band);
      cell.appendChild(bar);
      cell.appendChild(el('span', { class: 'meta-wr-pct', text: decided ? (pct(p) + '%') : '–' }));
      tdW.appendChild(cell);
      tr.appendChild(tdW);
      tr.appendChild(el('td', { class: 'col-rec meta-rec', text: (row.winsA || 0) + '–' + (row.ties || 0) + '–' + (row.winsB || 0) }));
      var tdS = el('td', { class: 'col-stat' });
      var stats = el('div', { class: 'meta-stats' });
      statLine(stats, 'MVP', row.mvp ? row.mvp.name : '', row.mvp ? (row.mvp.kos + ' KO') : '');
      statLine(stats, T('Besiegt', 'Faints'), row.weakest ? row.weakest.name : '', '');
      var turns = row.avgTurns ? row.avgTurns.toFixed(1) : '';
      statLine(stats, 'Ø', turns, row.unfinished ? ((de ? 'unfertig ' : 'unfinished ') + row.unfinished) : '');
      if (row.leads && row.leads[0]) statLine(stats, 'Lead', row.leads[0].lead, String(row.leads[0].n));
      tdS.appendChild(stats);
      tr.appendChild(tdS);
      var tdA = el('td', { class: 'col-act' });
      var acts = el('div', { class: 'meta-row-acts' });
      if (row.games && row.games[0] && row.games[0].log && window.RLMetaReplay) {
        var b = el('button', { class: 'tbtn', text: 'Replay' });
        b.addEventListener('click', function () { showReplay(row); });
        acts.appendChild(b);
      }
      if (row.koMatrix) {
        var k = el('button', { class: 'tbtn', text: 'K.O.' });
        k.addEventListener('click', function () { showMatrix(row); });
        acts.appendChild(k);
      }
      tdA.appendChild(acts);
      tr.appendChild(tdA);
      return tr;
    }

    function setMsg(text) { var n = document.getElementById('metaMsg'); if (n) n.textContent = text; }
    function setProg(done, total) {
      var fill = document.getElementById('metaProgFill');
      if (fill) fill.style.width = (total ? Math.round(100 * done / total) : 0) + '%';
    }
    function begin(rough) {
      var minePaste = pasteOf(state.entry);
      var ops = picked();
      if (!ops.length) { setMsg(T('Keine Teams.', 'No teams.')); return; }
      if (rough || !window.desktop || !window.desktop.meta) { roughRun(ops); return; }
      state.running = true; state.rows = []; draw();
      window.desktop.meta.validate(minePaste).then(function (v) {
        if (!v.ok) { state.running = false; draw(); showErrors(v.errors); return; }
        return window.desktop.meta.start({
          paste: minePaste,
          opponents: ops.map(function (t) { return { id: t.id, name: decode(t.name), paste: t.paste, archetype: decode(t.archetype) }; }),
          games: state.games, level: state.level, seed: (Date.now() & 0xfffffff) || 1
        });
      }).then(function (res) {
        if (!res) return;
        if (!res.ok) { state.running = false; draw(); showErrors(res.errors || [res.error || '']); return; }
        state.job = res.jobId;
        setMsg(T('Startet ' + res.matches + ' Paarungen …', 'Starting ' + res.matches + ' matchups …'));
      });
    }
    function showErrors(list) {
      setMsg((list || []).join(' '));
      var box = document.getElementById('metaResultsCard');
      if (!box) return;
      (list || []).forEach(function (e) { box.appendChild(el('p', { class: 'meta-bad', text: e })); });
    }
    function showReplay(row) {
      var g = (row.games || []).filter(function (x) { return x.log; })[0];
      if (!g) return;
      var html = window.RLMetaReplay.html(g.log, row.name);
      var m = el('div', { class: 'modal meta-replay' });
      var b = el('div', { class: 'modal-box' });
      var h = el('div', { class: 'meta-head' });
      h.appendChild(el('h3', { text: 'Replay · ' + (row.name || '') }));
      var x = el('button', { class: 'icon-btn', text: '✕' });
      x.addEventListener('click', function () { m.remove(); });
      h.appendChild(x);
      b.appendChild(h);
      var frame = el('iframe', { title: 'Replay' });
      frame.srcdoc = html;
      b.appendChild(frame);
      m.appendChild(b);
      m.addEventListener('mousedown', function (ev) { if (ev.target === m) m.remove(); });
      document.body.appendChild(m);
    }
    function showMatrix(row) {
      var lines = [];
      Object.keys(row.koMatrix || {}).forEach(function (src) {
        Object.keys(row.koMatrix[src]).forEach(function (tgt) {
          lines.push(src + ' → ' + tgt + ': ' + row.koMatrix[src][tgt]);
        });
      });
      A.showModal(T('K.O.-Matrix ', 'KO matrix ') + (row.name || ''), lines.join('\n') || T('Keine K.O.s.', 'No KOs.'));
    }
    function roughRun(ops) {
      var foe = state.selected || ops[0];
      if (!foe) return;
      state.running = true;
      setMsg(T('Grobe Prüfung, 30 Spiele …', 'Rough check, 30 games …'));
      var worker = new Worker('js/meta/rough_worker.js');
      worker.onmessage = function (ev) {
        var msg = ev.data || {};
        if (msg.type === 'tick') setProg(msg.done, msg.total);
        if (msg.type === 'done') {
          worker.terminate();
          var ci = window.RLMetaStats.wilson(msg.wins, msg.wins + msg.losses);
          state.rows = [{ name: decode(foe.name), rough: true, winsA: msg.wins, winsB: msg.losses, ties: msg.ties, ci: ci, unfinished: 0, avgTurns: 0 }];
          state.running = false;
          draw();
        }
      };
      worker.postMessage({ games: 30, seed: 7, mine: teamMons(state.entry), foe: teamMons(foe) });
    }
    function importPaste() {
      var wrap = el('div', { class: 'modal' });
      var b = el('div', { class: 'modal-box' });
      b.appendChild(el('h3', { text: T('Meta-Team einfügen', 'Import a meta team') }));
      var area = el('textarea', { class: 'ma-paste', spellcheck: 'false' });
      b.appendChild(area);
      var url = el('input', { placeholder: 'https://pokepast.es/…', spellcheck: 'false' });
      b.appendChild(url);
      var msg = el('p', { class: 'meta-note', text: '' });
      var row = el('div', { class: 'meta-actions' });
      var ok = el('button', { class: 'primary-btn', text: T('Prüfen und merken', 'Check and keep') });
      var cancel = el('button', { class: 'tbtn', text: T('Abbrechen', 'Cancel') });
      cancel.addEventListener('click', function () { wrap.remove(); });
      ok.addEventListener('click', function () {
        var text = area.value.trim();
        function take(paste, source) {
          var parsed0 = A.parseShowdown(paste || '');
          if (!parsed0.mons || parsed0.mons.length < 6) {
            msg.textContent = T('Es braucht sechs Pokémon im Showdown-Text.', 'The paste needs six Pokémon.');
            msg.className = 'meta-bad';
            return;
          }
          var done = function (res) {
            if (!res.ok) { msg.textContent = (res.errors || []).join(' '); msg.className = 'meta-bad'; return; }
            var parsed = A.parseShowdown(paste);
            var team = {
              id: 'paste-' + Date.now().toString(36),
              name: decode(T('Eigene Paste', 'Imported paste')),
              source: source, date: new Date().toISOString().slice(0, 10),
              paste: paste, species: (parsed.mons || []).map(function (m) { return m.species; }),
              archetype: 'Import', assumed: false, notes: ''
            };
            saveUser(team);
            store = cache();
            state.selected = store.teams.filter(function (t) { return t.id === team.id; })[0] || team;
            wrap.remove();
            draw();
          };
          if (window.desktop && window.desktop.meta) window.desktop.meta.validate(paste).then(done);
          else done({ ok: true });
        }
        if (url.value.trim()) {
          if (!window.desktop || !window.desktop.meta || !window.desktop.meta.fetchPaste) {
            msg.textContent = T('Adressen lädt nur die Desktop-App. Den Text kannst du hier einfügen.', 'Only the desktop app can load a URL. Paste the text here.');
            return;
          }
          window.desktop.meta.fetchPaste(url.value.trim()).then(function (res) {
            if (!res.ok) { msg.textContent = (res.errors || []).join(' '); msg.className = 'meta-bad'; return; }
            take(res.paste, 'pokepaste');
          });
          return;
        }
        take(text, 'paste');
      });
      row.appendChild(ok); row.appendChild(cancel);
      b.appendChild(row); b.appendChild(msg);
      wrap.appendChild(b);
      wrap.addEventListener('mousedown', function (ev) { if (ev.target === wrap) wrap.remove(); });
      document.body.appendChild(wrap);
    }

    if (window.desktop && window.desktop.meta && !ipcBound) {
      ipcBound = true;
      window.desktop.meta.onProgress(function (p) {
        var st = current;
        if (!modal || !st || !st.running) return;
        setProg(p.done || 0, p.total || 1);
        if (p.name && st.setMsg) st.setMsg(p.name);
        if (p.row) {
          st.rows.push(p.row);
          var host = document.getElementById('metaResults');
          if (host && st.resultRow) host.appendChild(st.resultRow(p.row));
        }
      });
      window.desktop.meta.onDone(function (p) {
        var st = current;
        if (!modal || !st) return;
        st.running = false;
        if (p && p.rows) st.rows = p.rows;
        if (st.draw) st.draw();
        if (st.setMsg) st.setMsg(p && p.cancelled ? T('Abgebrochen. Unfertige Paarungen zählen nicht.', 'Cancelled. Unfinished matchups are not counted.') : T('Fertig.', 'Done.'));
      });
    }
    state.draw = draw;
    state.setMsg = setMsg;
    state.resultRow = resultRow;
    draw();
  }

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]; }); }
  window.RLMeta = {
    open: open,
    fill: function (rows) {
      if (!current) return;
      current.rows = rows || [];
      current.running = false;
      if (current.draw) current.draw();
    }
  };
})();

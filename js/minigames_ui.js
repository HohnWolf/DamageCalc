// Screens for the four minigames. Logic lives in js/minigames.js.
(function () {
  'use strict';
  var A = window.CC;
  var Kit = window.CCMinigames;
  if (!A || !Kit) return;
  var api = Kit.create({
    dex: A.DEX, moves: A.MOVES, learn: window.CHAMP_LEARN, learnParent: window.CHAMP_PARENT, setsFor: A.setsFor,
    megaStone: function (name) {
      var lk = window.MEGA_STONE_USER_LOOKUP || {}, base = name.replace(/^Mega (.+?)(?: [XYZ])?$/, '$1'), hit = null;
      Object.keys(lk).some(function (stone) { if (A.megaFormeFor(base, stone) === name) { hit = stone; return true; } return false; });
      return hit;
    },
    namesDe: window.NAMES_DE, formDe: A.FORM_DE, natdex: window.NATDEX, calc: window.Calc
  });
  var el = A.el, T = A.T;
  var STATS = [
    ['hp', 'mgStHp'], ['at', 'mgStAt'], ['df', 'mgStDf'], ['sa', 'mgStSa'], ['sd', 'mgStSd'], ['sp', 'mgStSp']
  ];
  var openGame = 'speed';

  function de() { return A.LANG === 'de'; }
  function label(name) { return de() ? api.germanName(name) : name; }
  function fmt(n) {
    var s = (Math.round(n * 10) / 10).toFixed(1);
    return de() ? s.replace('.', ',') : s;
  }
  // Home-Sprites; bei neuen Megas fehlt Home, dann das Dex-Sprite, zuletzt Gen 5.
  function spriteId(species) {
    var mega = species.match(/^Mega (.+?)(?: ([XYZ]))?$/);
    if (mega) return A.idOf(mega[1]) + '-mega' + (mega[2] ? mega[2].toLowerCase() : '');
    var i = species.indexOf('-');
    return i > 0 ? A.idOf(species.slice(0, i)) + '-' + A.idOf(species.slice(i + 1)) : A.idOf(species);
  }
  function sprite(name) {
    var id = spriteId(name), base = 'https://play.pokemonshowdown.com/sprites/';
    var chain = [base + 'home/' + id + '.png', base + 'dex/' + id + '.png', base + 'gen5/' + id + '.png'], i = 0;
    var img = el('img', { alt: '', src: chain[0], loading: 'lazy' });
    img.onerror = function () {
      i++;
      if (i < chain.length) img.src = chain[i];
      else img.replaceWith(el('span', { text: label(name) }));
    };
    return img;
  }
  function banner(parent, ok, text) {
    parent.appendChild(el('div', { class: 'mg-banner ' + (ok ? 'ok' : 'bad'), text: text }));
  }
  function meters(box, rows) {
    var wrap = el('div', { class: 'mg-meters' });
    rows.forEach(function (r) {
      var m = el('div', { class: 'mg-meter' });
      m.appendChild(el('span', { text: r[0] }));
      m.appendChild(el('b', { text: String(r[1]) }));
      wrap.appendChild(m);
    });
    box.appendChild(wrap);
  }
  function optsBar(onChange) {
    var st = api.load();
    var bar = el('div', { class: 'mg-opts' });
    var lab = el('label');
    lab.appendChild(document.createTextNode(T('mgGen') + ' '));
    var sel = el('select');
    sel.appendChild(el('option', { value: '0', text: T('mgGenAll') }));
    for (var g = 1; g <= 9; g++) sel.appendChild(el('option', { value: String(g), text: T('mgGenN', g) }));
    sel.value = String(st.opts.gen || 0);
    lab.appendChild(sel);
    bar.appendChild(lab);
    var ev = el('label');
    var cb = el('input', { type: 'checkbox' });
    cb.checked = !!st.opts.evolved;
    ev.appendChild(cb);
    ev.appendChild(document.createTextNode(T('mgEvolved')));
    bar.appendChild(ev);
    function emit() { api.saveOpts({ gen: +sel.value || 0, evolved: cb.checked }); onChange(); }
    sel.addEventListener('change', emit);
    cb.addEventListener('change', emit);
    return bar;
  }
  function pool() {
    var o = api.load().opts;
    return api.buildPool({ gen: o.gen, evolved: o.evolved });
  }
  function shell(id) {
    var root = document.getElementById(id);
    if (!root) return null;
    root.innerHTML = '';
    var box = el('div', { class: 'mg-shell' });
    root.appendChild(box);
    return box;
  }
  function types(card, list) {
    var row = el('div', { class: 'mg-types' });
    (list || []).forEach(function (t) { row.appendChild(A.typeBadge(t)); });
    card.appendChild(row);
  }

  // Gemeinsamer Abschluss einer Runde: richtig -> "Weiter", falsch -> verloren, "Neues Spiel".
  function endRound(box, result, correct, okText, lostText, again, rec) {
    banner(result, correct, correct ? okText : lostText);
    var next = el('button', { class: 'mg-btn primary', type: 'button', text: T(correct ? 'mgNext' : 'mgNewGame') });
    next.addEventListener('click', again);
    result.appendChild(next);
    paintMeters(box, rec);
    next.focus();
  }
  function paintMeters(box, rec) {
    var bs = box.querySelectorAll('.mg-meters b');
    if (bs[0]) bs[0].textContent = rec.score;
    if (bs[1]) bs[1].textContent = rec.streak;
    if (bs[2]) bs[2].textContent = rec.high;
  }
  function runMeters(top, st) { meters(top, [[T('mgScore'), st.score], [T('mgStreak'), st.streak], [T('mgHigh'), st.high]]); }
  function pickCard(mon, onPick) {
    var c = el('button', { class: 'mg-card mg-pick', type: 'button' });
    var sp = el('div', { class: 'mg-sprite' });
    sp.appendChild(sprite(mon.name, false));
    c.appendChild(sp);
    c.appendChild(el('h3', { text: label(mon.name) }));
    types(c, mon.types);
    c.addEventListener('click', onPick);
    return c;
  }

  function renderSpeed() {
    var box = shell('mgSpeedView');
    if (!box) return;
    box.classList.add('mg-center');
    var st = api.load().speed;
    var top = el('div', { class: 'mg-top' });
    runMeters(top, st);
    top.appendChild(optsBar(renderSpeed));
    box.appendChild(top);
    var mons = pool();
    var round = api.makeSpeedRound(mons);
    if (!round) { box.appendChild(el('p', { class: 'mg-empty', text: T('mgEmpty') })); return; }
    box.appendChild(el('h2', { class: 'mg-ask', text: T('mgSpeedAsk') }));
    var stage = el('div', { class: 'mg-stage' });
    var result = el('div');
    var locked = false;
    function card(mon, side) {
      var c = pickCard(mon, function () { choose(side); });
      var spd = el('div', { class: 'mg-speed' });
      spd.hidden = true;
      c.appendChild(spd);
      return { el: c, spd: spd };
    }
    var left = card(round.left, 'left'), right = card(round.right, 'right');
    function choose(choice) {
      if (locked) return;
      locked = true;
      var before = api.load().speed.streak;
      var j = api.judgeSpeed(round, choice);
      var rec = api.recordSpeed(j.correct);
      left.spd.hidden = false; right.spd.hidden = false;
      left.spd.textContent = T('mgSpeedStat', round.leftSpeed);
      right.spd.textContent = T('mgSpeedStat', round.rightSpeed);
      left.el.classList.add(j.truth === 'right' ? 'lose' : 'win');
      right.el.classList.add(j.truth === 'left' ? 'lose' : 'win');
      left.el.disabled = true; right.el.disabled = true;
      endRound(box, result, j.correct, T('mgSpeedOk'), T('mgLost', before), renderSpeed, rec);
    }
    stage.appendChild(left.el);
    stage.appendChild(el('div', { class: 'mg-vs', text: T('mgVs') }));
    stage.appendChild(right.el);
    box.appendChild(stage);
    box.appendChild(result);
  }

  function renderQuiz() {
    var box = shell('mgQuizView');
    if (!box) return;
    var st = api.load().quiz;
    var top = el('div', { class: 'mg-top' });
    runMeters(top, st);
    top.appendChild(optsBar(renderQuiz));
    box.appendChild(top);
    var mons = pool();
    if (!mons.length) { box.appendChild(el('p', { class: 'mg-empty', text: T('mgEmpty') })); return; }
    var answer = mons[Math.floor(Math.random() * mons.length)];
    var choices = api.makeQuizChoices(answer, mons);
    box.appendChild(el('h2', { class: 'mg-ask', text: T('mgQuizAsk') }));
    var stats = el('div', { class: 'mg-stats' });
    var max = 255;
    STATS.forEach(function (s) {
      var row = el('div', { class: 'mg-stat' });
      row.appendChild(el('span', { class: 'k', text: T(s[1]) }));
      row.appendChild(el('span', { class: 'v', text: String(answer.bs[s[0]]) }));
      var bar = el('div', { class: 'mg-bar' });
      bar.appendChild(el('span', { style: 'width:' + Math.max(4, Math.round(answer.bs[s[0]] / max * 100)) + '%' }));
      row.appendChild(bar);
      stats.appendChild(row);
    });
    var total = 0;
    STATS.forEach(function (s) { total += answer.bs[s[0]]; });
    var trow = el('div', { class: 'mg-stat mg-total' });
    trow.appendChild(el('span', { class: 'k', text: T('mgStTotal') }));
    trow.appendChild(el('span', { class: 'v', text: String(total) }));
    stats.appendChild(trow);
    box.appendChild(stats);
    var grid = el('div', { class: 'mg-choices' });
    var result = el('div');
    var locked = false, btns = [];
    choices.forEach(function (mon) {
      var c = pickCard(mon, function () {
        if (locked) return;
        locked = true;
        var before = api.load().quiz.streak;
        var j = api.judgeQuiz(mon.name, answer.name, mons);
        var rec = api.recordQuiz(j.correct);
        btns.forEach(function (b) {
          b.el.disabled = true;
          if (api.judgeQuiz(b.mon.name, answer.name, mons).correct) b.el.classList.add('win');
        });
        if (!j.correct) c.classList.add('lose');
        endRound(box, result, j.correct, T('mgQuizOk', label(answer.name)), T('mgQuizLost', label(answer.name), before), renderQuiz, rec);
      });
      btns.push({ el: c, mon: mon });
      grid.appendChild(c);
    });
    box.appendChild(grid);
    box.appendChild(result);
  }

  function renderType() {
    var box = shell('mgTypeView');
    if (!box) return;
    var st = api.load().type;
    var top = el('div', { class: 'mg-top' });
    runMeters(top, st);
    top.appendChild(optsBar(renderType));
    box.appendChild(top);
    var mons = pool();
    var round = api.makeTypeRound(mons);
    if (!round) { box.appendChild(el('p', { class: 'mg-empty', text: T('mgEmpty') })); return; }
    box.appendChild(el('h2', { class: 'mg-ask', text: T('mgTypeAsk') }));
    var groups = [[4, 'x4'], [2, 'x2'], [0.5, 'x05'], [0.25, 'x025'], [0, 'x0']];
    var tbl = el('div', { class: 'mg-eff' });
    groups.forEach(function (g) {
      var ts = Object.keys(round.effectiveness).filter(function (t) { return round.effectiveness[t] === g[0]; });
      if (!ts.length) return;
      var row = el('div', { class: 'mg-eff-row ' + g[1] });
      row.appendChild(el('span', { class: 'k', text: g[0] === 0.5 ? '½×' : g[0] === 0.25 ? '¼×' : g[0] + '×' }));
      var w = el('span', { class: 'mg-types' });
      ts.forEach(function (t) { w.appendChild(A.typeBadge(t)); });
      row.appendChild(w);
      tbl.appendChild(row);
    });
    box.appendChild(tbl);
    box.appendChild(el('p', { class: 'mg-meta', text: T('mgTypeNote') }));
    var grid = el('div', { class: 'mg-choices' });
    var result = el('div');
    var locked = false, btns = [];
    round.choices.forEach(function (mon) {
      var c = pickCard(mon, function () {
        if (locked) return;
        locked = true;
        var before = api.load().type.streak;
        var j = api.judgeType(mon.name, round.answer.name, mons);
        var rec = api.recordType(j.correct);
        btns.forEach(function (b) {
          b.el.disabled = true;
          if (api.judgeType(b.mon.name, round.answer.name, mons).correct) b.el.classList.add('win');
        });
        if (!j.correct) c.classList.add('lose');
        var tn = round.answer.types.map(function (t) { return A.nType ? A.nType(t) : t; }).join('/');
        endRound(box, result, j.correct, T('mgTypeOk', label(round.answer.name), tn), T('mgTypeLost', label(round.answer.name), tn, before), renderType, rec);
      });
      btns.push({ el: c, mon: mon });
      grid.appendChild(c);
    });
    box.appendChild(grid);
    box.appendChild(result);
  }

  function itemLabel(name) {
    if (!name || name === '(none)') return T('mgNoItem');
    return A.nItem ? A.nItem(name) : name;
  }
  function terrainText(t) {
    var m = { Electric: de() ? 'Elektro' : 'Electric', Grassy: de() ? 'Gras' : 'Grassy', Psychic: de() ? 'Psycho' : 'Psychic', Misty: de() ? 'Nebel' : 'Misty' };
    return t && t !== 'None' ? (m[t] || t) : T('mgNone');
  }
  function boostText(sc) {
    var names = { at: de() ? 'Angriff' : 'Attack', sa: de() ? 'Sp.-Angriff' : 'Sp. Atk', df: de() ? 'Verteidigung' : 'Defense', sd: de() ? 'Sp.-Vert.' : 'Sp. Def' };
    var out = [];
    [['atkBoost', de() ? 'Angreifer' : 'Attacker'], ['defBoost', de() ? 'Verteidiger' : 'Defender']].forEach(function (g) {
      Object.keys(sc[g[0]] || {}).forEach(function (k) {
        var v = sc[g[0]][k];
        if (v) out.push(g[1] + ' ' + names[k] + ' ' + (v > 0 ? '+' : '') + v);
      });
    });
    return out.join(' \u00b7 ');
  }
  function renderDamage() {
    var box = shell('mgDmgView');
    if (!box) return;
    var st = api.load().damage;
    var top = el('div', { class: 'mg-top' });
    runMeters(top, st);
    top.appendChild(optsBar(renderDamage));
    box.appendChild(top);
    var mons = pool();
    var sc = api.makeDamageScenario(mons, null, st.streak);
    if (!sc) { box.appendChild(el('p', { class: 'mg-empty', text: T('mgEmpty') })); return; }
    box.appendChild(el('h2', { class: 'mg-ask', text: T('mgDmgAsk') }));
    var stage = el('div', { class: 'mg-stage' });
    function side(name, mon, role) {
      var c = el('div', { class: 'mg-card' });
      c.appendChild(el('p', { class: 'mg-meta', text: role }));
      var sp = el('div', { class: 'mg-sprite' });
      sp.appendChild(sprite(name, false));
      c.appendChild(sp);
      c.appendChild(el('h3', { text: label(name) }));
      types(c, mon.types);
      var meta = el('p', { class: 'mg-meta' });
      meta.appendChild(el('b', { text: T('mgAbility') + ': ' }));
      meta.appendChild(document.createTextNode((A.nAbility ? A.nAbility(mon.ability) : mon.ability) || T('mgNone')));
      meta.appendChild(document.createElement('br'));
      meta.appendChild(el('b', { text: T('mgItem') + ': ' }));
      meta.appendChild(document.createTextNode(itemLabel(mon.item)));
      c.appendChild(meta);
      return c;
    }
    stage.appendChild(side(sc.attackerName, sc.attacker, T('mgAtk')));
    var mid = el('div', { class: 'mg-card' });
    mid.appendChild(el('div', { class: 'mg-move', text: A.nMove ? A.nMove(sc.moveName) : sc.moveName }));
    types(mid, [sc.move.type]);
    var cat = sc.move.category === 'Physical' ? T('mgPhysical') : T('mgSpecial');
    mid.appendChild(el('p', { class: 'mg-meta', text: cat + ' · ' + T('mgPower', sc.move.bp || 0) }));
    mid.appendChild(el('p', { class: 'mg-meta', text: T('mgLevel', sc.level) + ' · ' + T('mgSingles') }));
    mid.appendChild(el('p', { class: 'mg-meta', text: T('mgNature') + ': ' + (A.nNature ? A.nNature(sc.nature) : sc.nature) + ' · ' + T('mgSp') }));
    mid.appendChild(el('p', { class: 'mg-meta', text: T('mgNoCrit') }));
    var field = el('p', { class: 'mg-meta' });
    var weatherMap = { Sun: de() ? 'Sonne' : 'Sun', Rain: de() ? 'Regen' : 'Rain', Sand: de() ? 'Sandsturm' : 'Sandstorm', Snow: de() ? 'Schnee' : 'Snow' };
    var weather = sc.weather && sc.weather !== 'None' ? (weatherMap[sc.weather] || sc.weather) : T('mgNone');
    field.appendChild(el('b', { text: T('mgWeather') + ': ' }));
    field.appendChild(document.createTextNode(weather));
    field.appendChild(document.createElement('br'));
    field.appendChild(el('b', { text: T('mgTerrain') + ': ' }));
    field.appendChild(document.createTextNode(terrainText(sc.terrain)));
    mid.appendChild(field);
    var bs = boostText(sc);
    if (bs) mid.appendChild(el('p', { class: 'mg-meta', text: bs }));
    stage.appendChild(mid);
    stage.appendChild(side(sc.defenderName, sc.defender, T('mgDef')));
    box.appendChild(stage);
    var slider = el('div', { class: 'mg-slider' });
    var range = el('input', { type: 'range', min: '0', max: '100', step: '1', value: '50' });
    var num = el('input', { type: 'number', min: '0', max: '100', step: '1', value: '50' });
    function sync(from, to) { to.value = from.value; }
    range.addEventListener('input', function () { sync(range, num); });
    num.addEventListener('input', function () { sync(num, range); });
    slider.appendChild(el('span', { text: T('mgDmgGuess') }));
    slider.appendChild(range);
    slider.appendChild(num);
    slider.appendChild(el('span', { text: '%' }));
    box.appendChild(slider);
    var actions = el('div', { class: 'mg-actions' });
    var go = el('button', { class: 'mg-btn primary', type: 'button', text: T('mgDmgSubmit') });
    actions.appendChild(go);
    box.appendChild(actions);
    var result = el('div');
    box.appendChild(result);
    go.addEventListener('click', function () {
      if (go.disabled) return;
      go.disabled = true;
      range.disabled = true;
      num.disabled = true;
      var guess = Math.max(0, Math.min(100, +num.value || 0));
      var truth = api.evaluateDamage(sc);
      var j = api.judgeDamage(guess, truth.minPct, truth.maxPct);
      var before = st.streak;
      var rec = api.recordDamage(j.correct);
      var text = j.correct ? (j.distance === 0 ? T('mgDmgExact') : T('mgDmgOff', fmt(j.distance), j.tolerance)) : T('mgDmgLost', fmt(j.distance), j.tolerance, before);
      banner(result, j.correct, text);
      result.appendChild(el('p', { class: 'mg-meta', text: T('mgDmgRange', truth.min, truth.max, fmt(truth.minPct), fmt(truth.maxPct)) }));
      var scale = Math.max(100, truth.maxPct, guess, 1);
      var track = el('div', { class: 'mg-track' });
      var rng = el('span', { class: 'rng' });
      rng.style.left = Math.max(0, Math.min(100, truth.minPct / scale * 100)) + '%';
      rng.style.width = Math.max(1, Math.min(100, (truth.maxPct - truth.minPct) / scale * 100)) + '%';
      var pin = el('span', { class: 'pin' });
      pin.style.left = Math.max(0, Math.min(100, guess / scale * 100)) + '%';
      track.appendChild(rng);
      track.appendChild(pin);
      result.appendChild(track);
      var next = el('button', { class: 'mg-btn primary', type: 'button', text: T(j.correct ? 'mgNext' : 'mgNewGame') });
      next.addEventListener('click', renderDamage);
      result.appendChild(next);
      paintMeters(box, rec);
      next.focus();
    });
  }

  function open(view) {
    openGame = view === 'mgquiz' ? 'quiz' : view === 'mgdmg' ? 'damage' : view === 'mgtype' ? 'type' : 'speed';
    if (openGame === 'speed') renderSpeed();
    else if (openGame === 'quiz') renderQuiz();
    else if (openGame === 'type') renderType();
    else renderDamage();
  }
  window.CCMinigamesUI = { open: open, api: api };
})();

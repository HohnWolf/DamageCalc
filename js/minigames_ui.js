// Screens for the three minigames. Logic lives in js/minigames.js.
(function () {
  'use strict';
  var A = window.CC;
  var Kit = window.CCMinigames;
  if (!A || !Kit) return;
  var api = Kit.create({
    dex: A.DEX, moves: A.MOVES, learn: window.CHAMP_LEARN, learnParent: window.CHAMP_PARENT,
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
  function sprite(name, silent) {
    var node;
    try { node = A.spriteFit(name, false); } catch (e) { node = el('span', { text: label(name) }); }
    if (silent && node.querySelectorAll) node.querySelectorAll('title').forEach(function (t) { t.remove(); });
    if (silent && node.removeAttribute) node.removeAttribute('title');
    return node;
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

  function renderSpeed() {
    var box = shell('mgSpeedView');
    if (!box) return;
    var st = api.load().speed;
    var top = el('div', { class: 'mg-top' });
    meters(top, [[T('mgScore'), st.score], [T('mgStreak'), st.streak], [T('mgHigh'), st.high]]);
    top.appendChild(optsBar(renderSpeed));
    box.appendChild(top);
    var mons = pool();
    var round = api.makeSpeedRound(mons);
    if (!round) { box.appendChild(el('p', { class: 'mg-empty', text: T('mgEmpty') })); return; }
    box.appendChild(el('h2', { class: 'mg-ask', text: T('mgSpeedAsk') }));
    var stage = el('div', { class: 'mg-stage' });
    function card(mon) {
      var c = el('div', { class: 'mg-card' });
      var sp = el('div', { class: 'mg-sprite' });
      sp.appendChild(sprite(mon.name, false));
      c.appendChild(sp);
      c.appendChild(el('h3', { text: label(mon.name) }));
      types(c, mon.types);
      var spd = el('div', { class: 'mg-speed' });
      spd.hidden = true;
      c.appendChild(spd);
      return { el: c, spd: spd };
    }
    var left = card(round.left), right = card(round.right);
    stage.appendChild(left.el);
    stage.appendChild(el('div', { class: 'mg-vs', text: T('mgVs') }));
    stage.appendChild(right.el);
    box.appendChild(stage);
    var actions = el('div', { class: 'mg-actions' });
    var result = el('div');
    var locked = false;
    function choose(choice) {
      if (locked) return;
      locked = true;
      var j = api.judgeSpeed(round, choice);
      var rec = api.recordSpeed(j.correct);
      left.spd.hidden = false; right.spd.hidden = false;
      left.spd.textContent = T('mgSpeedStat', round.leftSpeed);
      right.spd.textContent = T('mgSpeedStat', round.rightSpeed);
      left.el.classList.add(j.truth === 'right' ? 'lose' : 'win');
      right.el.classList.add(j.truth === 'left' ? 'lose' : 'win');
      actions.querySelectorAll('button').forEach(function (b) { b.disabled = true; });
      banner(result, j.correct, j.correct ? T('mgSpeedOk') : T('mgSpeedBad'));
      var next = el('button', { class: 'mg-btn primary', type: 'button', text: T('mgNext') });
      next.addEventListener('click', renderSpeed);
      result.appendChild(next);
      var metersBox = box.querySelector('.mg-meters');
      if (metersBox) {
        metersBox.querySelectorAll('b')[0].textContent = rec.score;
        metersBox.querySelectorAll('b')[1].textContent = rec.streak;
        metersBox.querySelectorAll('b')[2].textContent = rec.high;
      }
    }
    [['left', 'mgSpeedLeft'], ['tie', 'mgSpeedTie'], ['right', 'mgSpeedRight']].forEach(function (x) {
      var b = el('button', { class: 'mg-btn' + (x[0] === 'tie' ? '' : ' primary'), type: 'button', text: T(x[1]) });
      b.addEventListener('click', function () { choose(x[0]); });
      actions.appendChild(b);
    });
    box.appendChild(actions);
    box.appendChild(result);
  }

  function renderQuiz() {
    var box = shell('mgQuizView');
    if (!box) return;
    var st = api.load().quiz;
    var top = el('div', { class: 'mg-top' });
    meters(top, [[T('mgScore'), st.score], [T('mgHigh'), st.high]]);
    top.appendChild(optsBar(renderQuiz));
    box.appendChild(top);
    var mons = pool();
    if (!mons.length) { box.appendChild(el('p', { class: 'mg-empty', text: T('mgEmpty') })); return; }
    var answer = mons[Math.floor(Math.random() * mons.length)];
    var hints = { type: false, gen: false, sprite: false };
    var misses = 0, locked = false;
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
    box.appendChild(stats);
    var extra = el('div');
    box.appendChild(extra);
    var worth = el('p', { class: 'mg-meta' });
    function paintWorth() { worth.textContent = T('mgQuizWorth', api.quizPoints(hints, misses)); }
    paintWorth();
    var hintRow = el('div', { class: 'mg-hints' });
    function hintBtn(key, labelKey) {
      var b = el('button', { class: 'mg-btn', type: 'button', text: T(labelKey) });
      b.appendChild(el('span', { class: 'mg-hintcost', text: ' ' + T('mgQuizHintCost', api.HINTS[key]) }));
      b.addEventListener('click', function () {
        if (locked || hints[key]) return;
        hints[key] = true;
        b.disabled = true;
        paintWorth();
        if (key === 'type') types(extra, answer.types);
        if (key === 'gen') extra.appendChild(el('p', { class: 'mg-meta', text: answer.gen ? T('mgGenN', answer.gen) : T('mgGenAll') }));
        if (key === 'sprite') {
          var plate = el('div', { class: 'mg-sil' });
          plate.appendChild(sprite(answer.name, true));
          extra.appendChild(plate);
        }
      });
      return b;
    }
    hintRow.appendChild(hintBtn('type', 'mgQuizType'));
    hintRow.appendChild(hintBtn('gen', 'mgQuizGen'));
    hintRow.appendChild(hintBtn('sprite', 'mgQuizSil'));
    box.appendChild(hintRow);
    box.appendChild(worth);
    var search = el('div', { class: 'mg-search' });
    var input = el('input', { type: 'text', autocomplete: 'off', spellcheck: 'false' });
    input.placeholder = T('mgQuizPh');
    var list = el('ul', { class: 'mg-suggest' });
    list.hidden = true;
    var hi = -1, shown = [];
    function paintList() {
      list.innerHTML = '';
      shown = api.suggest(input.value, mons, 8);
      shown.forEach(function (p, i) {
        var li = el('li');
        var b = el('button', { type: 'button', text: label(p.name) });
        if (i === hi) b.className = 'on';
        b.addEventListener('mousedown', function (ev) { ev.preventDefault(); input.value = label(p.name); list.hidden = true; submit(); });
        li.appendChild(b);
        list.appendChild(li);
      });
      list.hidden = !shown.length;
    }
    input.addEventListener('input', function () { hi = -1; paintList(); });
    input.addEventListener('keydown', function (ev) {
      if (ev.key === 'ArrowDown') { hi = Math.min(shown.length - 1, hi + 1); paintList(); ev.preventDefault(); }
      else if (ev.key === 'ArrowUp') { hi = Math.max(0, hi - 1); paintList(); ev.preventDefault(); }
      else if (ev.key === 'Enter') { if (hi >= 0 && shown[hi]) input.value = label(shown[hi].name); list.hidden = true; submit(); ev.preventDefault(); }
      else if (ev.key === 'Escape') list.hidden = true;
    });
    search.appendChild(input);
    search.appendChild(list);
    box.appendChild(search);
    var actions = el('div', { class: 'mg-actions' });
    var guess = el('button', { class: 'mg-btn primary', type: 'button', text: T('mgQuizGuess') });
    var give = el('button', { class: 'mg-btn', type: 'button', text: T('mgQuizGive') });
    actions.appendChild(guess);
    actions.appendChild(give);
    box.appendChild(actions);
    var result = el('div');
    box.appendChild(result);
    function finish(points, ok, text) {
      if (locked) return;
      locked = true;
      result.innerHTML = '';
      var rec = api.recordQuiz(points);
      list.hidden = true;
      input.disabled = true;
      guess.disabled = true;
      give.disabled = true;
      banner(result, ok, text);
      var reveal = el('div', { class: 'mg-card' });
      var sp = el('div', { class: 'mg-sprite' });
      sp.appendChild(sprite(answer.name, false));
      reveal.appendChild(sp);
      reveal.appendChild(el('h3', { text: label(answer.name) }));
      result.appendChild(reveal);
      var next = el('button', { class: 'mg-btn primary', type: 'button', text: T('mgNext') });
      next.addEventListener('click', renderQuiz);
      result.appendChild(next);
      var bs = box.querySelectorAll('.mg-meters b');
      if (bs[0]) bs[0].textContent = rec.score;
      if (bs[1]) bs[1].textContent = rec.high;
    }
    function submit() {
      if (locked) return;
      var hit = api.matchQuiz(input.value, answer.name, mons);
      if (hit.kind === 'empty' || hit.kind === 'unknown') { result.innerHTML = ''; banner(result, false, T('mgQuizUnknown')); return; }
      if (hit.kind === 'correct') finish(api.quizPoints(hints, misses), true, T('mgQuizOk', label(answer.name), api.quizPoints(hints, misses)));
      else {
        misses++;
        paintWorth();
        result.innerHTML = '';
        banner(result, false, T('mgQuizBad', label(hit.species)));
        input.select();
      }
    }
    guess.addEventListener('click', submit);
    give.addEventListener('click', function () { finish(0, false, T('mgQuizWas', label(answer.name))); });
    input.focus();
  }

  function itemLabel(name) {
    if (!name || name === '(none)') return T('mgNoItem');
    return A.nItem ? A.nItem(name) : name;
  }
  function renderDamage() {
    var box = shell('mgDmgView');
    if (!box) return;
    var st = api.load().damage;
    var top = el('div', { class: 'mg-top' });
    meters(top, [[T('mgScore'), st.score], [T('mgHigh'), st.high]]);
    top.appendChild(optsBar(renderDamage));
    box.appendChild(top);
    var mons = pool();
    var sc = api.makeDamageScenario(mons);
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
      meta.appendChild(document.createElement('br'));
      meta.appendChild(document.createTextNode(T('mgHp', mon.maxHP)));
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
    var weatherMap = { Sun: de() ? 'Sonne' : 'Sun', Rain: de() ? 'Regen' : 'Rain' };
    var weather = sc.weather && sc.weather !== 'None' ? (weatherMap[sc.weather] || sc.weather) : T('mgNone');
    field.appendChild(el('b', { text: T('mgWeather') + ': ' }));
    field.appendChild(document.createTextNode(weather));
    field.appendChild(document.createElement('br'));
    field.appendChild(el('b', { text: T('mgTerrain') + ': ' }));
    field.appendChild(document.createTextNode(T('mgNone')));
    mid.appendChild(field);
    stage.appendChild(mid);
    stage.appendChild(side(sc.defenderName, sc.defender, T('mgDef')));
    box.appendChild(stage);
    var slider = el('div', { class: 'mg-slider' });
    var range = el('input', { type: 'range', min: '0', max: '250', step: '1', value: '50' });
    var num = el('input', { type: 'number', min: '0', max: '250', step: '1', value: '50' });
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
      var guess = Math.max(0, Math.min(250, +num.value || 0));
      var truth = api.evaluateDamage(sc);
      var scored = api.scoreDamage(guess, truth.minPct, truth.maxPct);
      var rec = api.recordDamage(scored.points);
      var ok = scored.distance === 0;
      banner(result, ok, T('mgDmgRange', truth.min, truth.max, fmt(truth.minPct), fmt(truth.maxPct)));
      result.appendChild(el('p', { class: 'mg-meta', text: ok ? T('mgDmgExact', scored.points) : T('mgDmgOff', fmt(scored.distance), scored.points) }));
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
      var next = el('button', { class: 'mg-btn primary', type: 'button', text: T('mgNext') });
      next.addEventListener('click', renderDamage);
      result.appendChild(next);
      var bs = box.querySelectorAll('.mg-meters b');
      if (bs[0]) bs[0].textContent = rec.score;
      if (bs[1]) bs[1].textContent = rec.high;
    });
  }

  function open(view) {
    openGame = view === 'mgquiz' ? 'quiz' : view === 'mgdmg' ? 'damage' : 'speed';
    if (openGame === 'speed') renderSpeed();
    else if (openGame === 'quiz') renderQuiz();
    else renderDamage();
  }
  window.CCMinigamesUI = { open: open, api: api };
})();

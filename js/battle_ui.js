// Kampfansicht "Gegen die KI" (Random Battle und Choice Battle). Vorbereitung: zeigt das Spielfeld im Look des
// Stylus-Styles "Better Showdown" mit Platzhalter-Daten. Das HTML folgt Showdowns Klassen (battle, statbar, hpbar,
// battle-controls, movemenu, switchmenu, battle-log), damit css/battle.css greift. Kampflogik und KI kommen später.
(function () {
  'use strict';
  var A = window.CC;
  if (!A) return;
  var el = A.el, T = A.T;
  var MODES = {
    btlrandom: { root: 'btlRandomView', title: 'navBtlRandom', info: 'btlTeamRandom' },
    btlchoice: { root: 'btlChoiceView', title: 'navBtlChoice', info: 'btlTeamChoice' }
  };
  var DEMO = {
    me: { name: 'Incineroar', lvl: 50, hp: 100, moves: [['Flare Blitz', 'Fire', 24], ['Knock Off', 'Dark', 32], ['Parting Shot', 'Dark', 32], ['Fake Out', 'Normal', 16]] },
    foe: { name: 'Garchomp', lvl: 50, hp: 62 },
    team: ['Incineroar', 'Rillaboom', 'Flutter Mane', 'Urshifu', 'Amoonguss', 'Dragonite']
  };
  var state = null; // später: aktueller Kampf
  var resizeBound = false;

  function spriteUrl(name, back) {
    return 'https://play.pokemonshowdown.com/sprites/' + (back ? 'ani-back' : 'ani') + '/' + A.idOf(name) + '.gif';
  }
  function iconUrl(name) { return 'https://play.pokemonshowdown.com/sprites/gen5/' + A.idOf(name) + '.png'; }

  function statbar(cls, mon, pos) {
    var box = el('div', { class: 'statbar ' + cls, style: pos });
    var nm = el('strong');
    nm.appendChild(document.createTextNode(mon.name + ' '));
    nm.appendChild(el('small', { text: 'L' + mon.lvl }));
    box.appendChild(nm);
    var hp = el('div', { class: 'hpbar' });
    hp.appendChild(el('div', { class: 'hptext', text: mon.hp + '%' }));
    var prev = el('div', { class: 'prevhp' });
    prev.appendChild(el('div', { class: 'hp' + (mon.hp > 50 ? '' : mon.hp > 20 ? ' hp-yellow' : ' hp-red'), style: 'width:' + Math.round(148 * mon.hp / 100) + 'px' }));
    hp.appendChild(prev);
    box.appendChild(hp);
    box.appendChild(el('div', { class: 'status' }));
    return box;
  }
  function mon(name, back, x, y) {
    var m = el('div', { class: 'btl-mon', style: 'left:' + x + 'px;top:' + y + 'px' });
    m.appendChild(el('img', { alt: name, src: spriteUrl(name, back) }));
    return m;
  }
  function arena() {
    var b = el('div', { class: 'battle' });
    b.appendChild(mon(DEMO.foe.name, false, 440, 190));
    b.appendChild(mon(DEMO.me.name, true, 170, 345));
    b.appendChild(statbar('lstatbar', DEMO.foe, 'left:100px'));
    b.appendChild(statbar('rstatbar', DEMO.me, 'left:290px'));
    b.appendChild(el('div', { class: 'turn' }, '<strong>' + T('btlTurn', 1) + '</strong>'));
    b.appendChild(el('div', { class: 'message' }, '<small>' + T('btlSoon') + '</small>'));
    return b;
  }
  function controls() {
    var c = el('div', { class: 'battle-controls' });
    var ctl = el('div', { class: 'controls' });
    ctl.appendChild(el('div', { class: 'whatdo', text: T('btlWhatDo', DEMO.me.name) }));
    var mc = el('div', { class: 'movecontrols' });
    mc.appendChild(el('div', { class: 'moveselect', text: T('btlMoves') }));
    var mm = el('div', { class: 'movemenu' });
    DEMO.me.moves.forEach(function (m) {
      var b = el('button', { type: 'button', class: 'type-' + m[1], disabled: 'disabled' });
      b.appendChild(el('strong', { text: m[0] }));
      b.appendChild(el('br'));
      b.appendChild(el('small', { class: 'type', text: m[1] }));
      b.appendChild(document.createTextNode(' '));
      b.appendChild(el('small', { class: 'pp', text: m[2] + '/' + m[2] }));
      mm.appendChild(b);
    });
    mc.appendChild(mm);
    ctl.appendChild(mc);
    var sc = el('div', { class: 'switchcontrols' });
    sc.appendChild(el('div', { class: 'switchselect', text: T('btlSwitch') }));
    var sm = el('div', { class: 'switchmenu' });
    DEMO.team.forEach(function (n, i) {
      var b = el('button', { type: 'button', disabled: 'disabled', class: i === 0 ? 'disabled' : '' });
      b.appendChild(el('span', { class: 'picon', style: 'background-image:url(' + iconUrl(n) + ')' }));
      b.appendChild(document.createTextNode(n));
      sm.appendChild(b);
    });
    sc.appendChild(sm);
    ctl.appendChild(sc);
    c.appendChild(ctl);
    return c;
  }
  // Das Feld ist 640 x 360 und wird als Ganzes skaliert (wie im Style); der Rest der Breite gehört dem Log.
  // Die App skaliert die ganze Seite per body.style.zoom (fitToWindow); Rechtecke und innerHeight sind in echten Pixeln.
  function fit() {
    if (!state) return;
    var z = parseFloat(document.body.style.zoom) || 1;
    var r = state.view.getBoundingClientRect();
    var vw = (r.width || window.innerWidth) / z;
    var vh = (r.height || (window.innerHeight - r.top)) / z;
    var w = vw - 40 - Math.max(220, vw * 0.16), h = vh - 100;
    state.view.style.setProperty('--battle-scale', String(Math.max(0.3, Math.min(2, w / 640, h / 360)).toFixed(3)));
  }
  function open(view) {
    var mode = MODES[view];
    var root = mode && document.getElementById(mode.root);
    if (!root) return;
    root.innerHTML = '';
    var box = el('div', { class: 'btl-shell ps-room' });
    var top = el('div', { class: 'btl-top' });
    top.appendChild(el('h2', { text: T(mode.title) }));
    top.appendChild(el('p', { class: 'btl-note', text: T('btlSoon') + ' ' + T(mode.info) }));
    box.appendChild(top);
    var row = el('div', { class: 'btl-row' });
    var cont = el('div', { class: 'scrollable-battle-container' });
    cont.appendChild(arena());
    cont.appendChild(controls());
    row.appendChild(cont);
    var log = el('div', { class: 'battle-log' });
    var inner = el('div', { class: 'inner' });
    inner.appendChild(el('div', { class: 'battle-history', text: T('btlLogWait') }));
    log.appendChild(inner);
    row.appendChild(log);
    box.appendChild(row);
    var act = el('div', { class: 'btl-actions' });
    act.appendChild(el('button', { type: 'button', disabled: 'disabled', text: T('btlStart') }));
    box.appendChild(act);
    root.appendChild(box);
    state = { view: root, root: box, log: inner };
    if (!resizeBound) { resizeBound = true; window.addEventListener('resize', fit); }
    fit();
    requestAnimationFrame(fit);
    setTimeout(fit, 120);
  }
  window.CCBattleUI = { open: open, state: function () { return state; } };
})();

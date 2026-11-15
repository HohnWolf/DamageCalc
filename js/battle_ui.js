// Kämpfe: local doubles against the L0–L3 bots.
// Desktop runs the bundled simulator in an Electron worker. Android has no simulator in the web view.
// Sprites come from the app, never from a Pokémon Showdown server.
(function () {
  'use strict';
  var A = window.CC;
  if (!A) return;
  var el = A.el, de = A.LANG === 'de';
  function T(d) { return d; }
  function deOf(fn, arg) { return A.withLang ? A.withLang('de', function () { return fn(arg); }) : fn(arg); }
  var resizeBound = false;
  var ROOTS = { btlrandom: 'btlRandomView', btlchoice: 'btlChoiceView' };
  var cur = { view: null, mode: 'btlrandom', game: null, last: null, picks: [], targeting: null, busy: false, error: '', level: 2, foeSrc: 'builder', useBuilder: false, hp: {} };

  function api() { return window.desktop && window.desktop.battle; }
  function pct(hp, max) { if (!max) return 0; return Math.max(0, Math.min(100, Math.round(100 * hp / max))); }
  function statusName(s) {
    return { brn: 'Brand', par: 'Paralyse', psn: 'Gift', tox: 'Vergiftung', slp: 'Schlaf', frz: 'Frost' }[s] || '';
  }
  function decode(s) { return window.RLMetaText ? window.RLMetaText.decodeEntities(s) : (s || ''); }
  function builderTeams() {
    var saved = A.load('cc_builder', null);
    return ((saved && saved.teams) || []).map(function (t) {
      var ver = (t.versions || []).filter(function (v) { return v.id === t.curVer; })[0];
      var mons = (ver && ver.mons) || t.mons || [];
      var paste = mons.map(function (m) { return A.exportSet(m.set || {}, m.setName, m.species); }).join('\n\n');
      return { id: 'b:' + t.id, name: t.name || 'Team', paste: paste, species: mons.map(function (m) { return m.species; }) };
    }).filter(function (t) { return t.paste && t.species.length >= 4; });
  }
  function metaTeams() {
    var bundled = (window.RL_META_TEAMS && window.RL_META_TEAMS.teams) || [];
    var saved = A.load('cc_metateams', null);
    var user = ((saved && saved.teams) || []).filter(function (t) { return t && (t.source === 'paste' || t.source === 'pokepaste') && t.paste; });
    return bundled.concat(user).map(function (t) {
      return { id: 'm:' + t.id, name: decode(t.name), paste: t.paste, species: t.species || [] };
    }).filter(function (t) { return t.paste; });
  }

  function open(view) {
    var next = view === 'btlchoice' ? 'btlchoice' : 'btlrandom';
    if (cur.mode !== next) { cur.game = null; cur.error = ''; cur.picks = []; }
    cur.mode = next;
    cur.view = document.getElementById(ROOTS[cur.mode]);
    if (!cur.view) return;
    if (!cur.game) drawLobby();
    else drawBattle();
  }

  function drawLobby() {
    var root = cur.view;
    root.classList.remove('btl-live');
    root.innerHTML = '';
    var box = el('div', { class: 'btl-play' });
    box.appendChild(el('h2', { text: cur.mode === 'btlrandom' ? T('Zufallskampf', 'Random battle') : T('Eigener Kampf', 'Your battle') }));
    box.appendChild(el('p', { class: 'btl-note', text: T('Nur auf diesem Gerät. Kein Pokémon-Showdown-Server und keine Ladder. Doppelkampf, Reg M-C.', 'On this device only. No Pokémon Showdown server and no ladder. Doubles, Reg M-C.') }));
    if (!api()) box.appendChild(el('p', { class: 'btl-warn', text: T('Auf Android kannst du Teams und die Bot-Stufe wählen, aber nicht kämpfen. Der Simulator ist ein Node-Paket mit vielen Dateien und läuft nur im Desktop-Worker, nicht im WebView.', 'On Android you can pick teams and the bot level, but not battle. The simulator is a Node package of many files and runs only in the desktop worker, not in the WebView.') }));
    var lvl = el('div', { class: 'btl-seg' });
    [0, 1, 2, 3].forEach(function (n) {
      var names = [T('Zufall', 'Random'), T('Schaden', 'Damage'), T('Doppel', 'Doubles'), T('Vorausschau', 'Lookahead')];
      var b = el('button', { type: 'button', class: 'tbtn' + (cur.level === n ? ' on' : ''), text: 'L' + n + ' ' + names[n] });
      b.addEventListener('click', function () { cur.level = n; drawLobby(); });
      lvl.appendChild(b);
    });
    box.appendChild(el('div', { class: 'btl-label', text: T('Bot-Stufe', 'Bot level') }));
    box.appendChild(lvl);

    var mineSel, foeSel, useBox;
    if (cur.mode === 'btlrandom') {
      box.appendChild(el('p', { class: 'btl-note', text: T('Beide Seiten bekommen ein zufälliges legales Team aus dem Meta-Pool dieser Regulation. Der Random-Battle-Generator von Showdown ist nicht mit dabei, und der ROM-Randomizer baut keine Champions-Teams.', 'Both sides get a random legal team from this regulation’s meta pool. Showdown’s random-battle generator is not bundled, and the ROM randomizer does not build Champions teams.') }));
      useBox = el('label', { class: 'btl-check' });
      var cb = el('input', { type: 'checkbox' });
      cb.checked = !!cur.useBuilder;
      cb.addEventListener('change', function () { cur.useBuilder = cb.checked; });
      useBox.appendChild(cb);
      useBox.appendChild(document.createTextNode(T(' Teambuilder-Teams mitlosen', ' Include teambuilder teams')));
      box.appendChild(useBox);
    } else {
      var mine = builderTeams();
      var foes = cur.foeSrc === 'builder' ? builderTeams() : metaTeams();
      box.appendChild(el('p', { class: 'btl-note', text: T('Beide Teams kommen aus dem Teambuilder. Für die KI kannst du zusätzlich ein Meta-Team wählen.', 'Both teams come from the teambuilder. For the AI you can also pick a meta team.') }));
      box.appendChild(el('div', { class: 'btl-label', text: T('Dein Team (Teambuilder)', 'Your team (teambuilder)') }));
      mineSel = el('select', { class: 'btl-select' });
      if (!mine.length) mineSel.appendChild(el('option', { value: '', text: T('Kein Team im Teambuilder', 'No teambuilder team') }));
      mine.forEach(function (t) { mineSel.appendChild(el('option', { value: t.id, text: t.name })); });
      box.appendChild(mineSel);
      var src = el('div', { class: 'btl-seg' });
      [['builder', T('Teambuilder', 'Teambuilder')], ['meta', T('Meta-Teams', 'Meta teams')]].forEach(function (pair) {
        var b = el('button', { type: 'button', class: 'tbtn' + (cur.foeSrc === pair[0] ? ' on' : ''), text: pair[1] });
        b.addEventListener('click', function () { cur.foeSrc = pair[0]; drawLobby(); });
        src.appendChild(b);
      });
      box.appendChild(el('div', { class: 'btl-label', text: T('Team der KI', 'AI team') }));
      box.appendChild(src);
      foeSel = el('select', { class: 'btl-select' });
      foes.forEach(function (t) { foeSel.appendChild(el('option', { value: t.id, text: t.name })); });
      box.appendChild(foeSel);
    }
    var go = el('button', { type: 'button', class: 'primary-btn btl-go', text: T('Kampf starten', 'Start battle') });
    if (!api()) go.disabled = true;
    go.addEventListener('click', function () { begin(mineSel, foeSel); });
    box.appendChild(go);
    if (cur.error) box.appendChild(el('p', { class: 'btl-bad', text: cur.error }));
    root.appendChild(box);
  }

  function begin(mineSel, foeSel) {
    cur.error = '';
    var pasteA, pasteB, nameB = 'KI';
    if (cur.mode === 'btlrandom') {
      var pool = metaTeams();
      if (cur.useBuilder) pool = pool.concat(builderTeams());
      var pair = window.RLBattleRandom.pickPair(pool, String(Date.now()));
      if (!pair) { cur.error = T('Zu wenige Teams.', 'Not enough teams.'); drawLobby(); return; }
      pasteA = pair.a.paste; pasteB = pair.b.paste; nameB = pair.b.name || 'KI';
    } else {
      var mine = builderTeams().filter(function (t) { return t.id === (mineSel && mineSel.value); })[0];
      var foes = cur.foeSrc === 'builder' ? builderTeams() : metaTeams();
      var foe = foes.filter(function (t) { return t.id === (foeSel && foeSel.value); })[0];
      if (!mine || !foe) { cur.error = T('Bitte beide Teams wählen.', 'Pick both teams.'); drawLobby(); return; }
      pasteA = mine.paste; pasteB = foe.paste; nameB = foe.name || 'KI';
    }
    cur.last = { pasteA: pasteA, pasteB: pasteB, level: cur.level, nameA: 'Du', nameB: nameB, seed: window.RLMetaStats.seedFor(Date.now() >>> 0, 1) };
    cur.busy = true;
    api().start(cur.last).then(function (res) {
      cur.busy = false;
      if (!res || !res.ok) { cur.error = ((res && res.errors) || [res && res.error || '']).join(' '); drawLobby(); return; }
      cur.game = res.view; cur.picks = []; cur.targeting = null; drawBattle();
    }, function (err) { cur.busy = false; cur.error = String(err && err.message || err); drawLobby(); });
  }
  function send(choice) {
    if (cur.busy || !api()) return;
    cur.busy = true; cur.error = '';
    api().choose(choice).then(function (res) {
      cur.busy = false;
      if (!res) return;
      if (!res.ok) cur.error = res.error || '';
      if (res.view) cur.game = res.view;
      cur.picks = []; cur.targeting = null;
      drawBattle();
    });
  }

  var FOE_POS = [{ x: 408, y: 176 }, { x: 522, y: 146 }];
  var ALLY_POS = [{ x: 126, y: 308 }, { x: 250, y: 338 }];
  var FOE_BAR = ['78px', '228px'];
  var ALLY_BAR = ['8px', '156px'];
  var WEATHER_DE = { Rain: 'Regen', 'Heavy Rain': 'Starkregen', Sun: 'Sonne', 'Harsh Sun': 'Gleißende Sonne', Sand: 'Sandsturm', Snow: 'Schnee' };
  var TERRAIN_DE = { Electric: 'Elektrofeld', Grassy: 'Grasfeld', Grass: 'Grasfeld', Psychic: 'Psychofeld', Misty: 'Nebelfeld' };
  function deMon(name) { return name ? deOf(A.nSpecies, name) : ''; }
  function deMove(name) { return name ? deOf(A.nMove, name) : ''; }
  function deType(type) { return type ? deOf(A.nType, type) : ''; }
  function fieldSprite(species, back) {
    var img;
    try { img = A.spriteImg(species); } catch (e) { img = null; }
    if (!img) return el('span', { text: deMon(species) });
    if (back && img.src) {
      var front = img.src;
      img.onerror = function () { img.onerror = null; img.src = front; };
      img.src = front.replace('/gen5-shiny/', '/gen5-back-shiny/').replace('/gen5/', '/gen5-back/');
    }
    return img;
  }
  function placeMon(battle, poke, back, pos) {
    if (!poke || poke.fainted) return;
    var m = el('div', { class: 'btl-mon', style: 'left:' + pos.x + 'px;top:' + pos.y + 'px' });
    m.appendChild(fieldSprite(poke.species, back));
    battle.appendChild(m);
  }
  function statbar(poke, cls, left, key) {
    if (!poke || poke.fainted) return null;
    var n = pct(poke.hp, poke.maxhp);
    var from = cur.hp[key];
    if (from == null) from = n;
    cur.hp[key] = n;
    var box = el('div', { class: 'statbar ' + cls, style: 'left:' + left });
    var nm = el('strong');
    nm.appendChild(document.createTextNode(deMon(poke.species) + ' '));
    nm.appendChild(el('small', { text: 'L50' }));
    var boosts = poke.boosts || {};
    Object.keys(boosts).forEach(function (k) {
      var v = boosts[k];
      nm.appendChild(el('small', { text: ' ' + (v > 0 ? '+' : '') + v + (BOOST_DE[k] || '') }));
    });
    box.appendChild(nm);
    var hp = el('div', { class: 'hpbar' });
    hp.appendChild(el('div', { class: 'hptext', text: n + '%' }));
    var prev = el('div', { class: 'prevhp' });
    var tone = n > 50 ? '' : n > 20 ? ' hp-yellow' : ' hp-red';
    var bar = el('div', { class: 'hp' + tone, style: 'width:' + Math.round(148 * from / 100) + 'px' });
    prev.appendChild(bar);
    hp.appendChild(prev);
    box.appendChild(hp);
    if (from !== n) requestAnimationFrame(function () { bar.style.width = Math.round(148 * n / 100) + 'px'; });
    var st = el('div', { class: 'status' });
    if (poke.status) st.appendChild(el('span', { class: 'bad', text: statusName(poke.status) }));
    box.appendChild(st);
    return box;
  }
  function fit() {
    var root = cur.view;
    if (!root) return;
    var stage = root.querySelector('.btl-stage');
    var cont = root.querySelector('.scrollable-battle-container');
    if (!stage || !cont) return;
    var row = root.querySelector('.btl-row');
    var z = parseFloat(document.body.style.zoom) || 1;
    if (row) row.classList.toggle('btl-stack', (window.innerWidth / z) < 980 || (window.innerHeight / z) < 520);
    var w = stage.clientWidth;
    var h = stage.clientHeight;
    if (w < 8 || h < 8) return;
    var scale = Math.max(0.2, Math.min(w / 640, h / 360));
    cont.style.transform = 'scale(' + scale.toFixed(4) + ')';
    root.style.setProperty('--battle-scale', '1');
  }
  function drawBattle() {
    var root = cur.view, v = cur.game;
    root.classList.add('btl-live');
    root.innerHTML = '';
    var box = el('div', { class: 'btl-shell ps-room' });
    var top = el('div', { class: 'btl-top' });
    top.appendChild(el('h2', { text: (cur.mode === 'btlrandom' ? T('Zufallskampf', 'Random battle') : T('Eigener Kampf', 'Your battle')) + ' · L' + (v.level | 0) }));
    var chips = el('div', { class: 'btl-chips' });
    chips.appendChild(el('span', { text: 'Runde ' + v.turn }));
    fieldChips(v).forEach(function (t) { chips.appendChild(el('span', { text: t })); });
    top.appendChild(chips);
    var balls = el('div', { class: 'btl-ballrow' });
    balls.appendChild(ballLine(v.p2, 'KI'));
    balls.appendChild(ballLine(v.p1, 'Du'));
    top.appendChild(balls);
    var acts = el('div', { class: 'btl-top-acts' });
    var back = el('button', { type: 'button', class: 'tbtn', text: T('Zurück', 'Back') });
    back.addEventListener('click', function () { cur.game = null; cur.error = ''; drawLobby(); });
    acts.appendChild(back);
    if (!v.ended) {
      var ff = el('button', { type: 'button', class: 'tbtn', text: T('Aufgeben', 'Forfeit') });
      ff.addEventListener('click', function () {
        if (!window.confirm('Kampf aufgeben? Die KI gewinnt.')) return;
        api().forfeit().then(function (res) { if (res && res.view) { cur.game = res.view; cur.picks = []; cur.targeting = null; drawBattle(); } });
      });
      acts.appendChild(ff);
    }
    var re = el('button', { type: 'button', class: 'tbtn', text: T('Revanche', 'Rematch') });
    re.addEventListener('click', function () {
      if (!cur.last) return;
      cur.last = Object.assign({}, cur.last, { seed: window.RLMetaStats.seedFor(Date.now() >>> 0, 3) });
      api().start(cur.last).then(function (res) {
        if (res && res.ok) { cur.game = res.view; cur.picks = []; cur.targeting = null; cur.error = ''; }
        else cur.error = ((res && res.errors) || [res && res.error || '']).join(' ');
        drawBattle();
      });
    });
    acts.appendChild(re);
    top.appendChild(acts);
    box.appendChild(top);
    var row = el('div', { class: 'btl-row' });
    var stage = el('div', { class: 'btl-stage' });
    var cont = el('div', { class: 'scrollable-battle-container' });
    cont.appendChild(arena(v));
    cont.appendChild(fieldControls(v));
    stage.appendChild(cont);
    row.appendChild(stage);
    row.appendChild(logBox(v.log || []));
    box.appendChild(row);
    if (cur.error) box.appendChild(el('p', { class: 'btl-bad', text: cur.error }));
    if (v.ended) box.appendChild(el('p', { class: 'btl-end', text: v.winner ? ('Sieger: ' + v.winner) : 'Unentschieden' }));
    root.appendChild(box);
    if (!resizeBound) { resizeBound = true; window.addEventListener('resize', fit); }
    fit();
    requestAnimationFrame(fit);
  }
  function arena(v) {
    var b = el('div', { class: 'battle doubles' });
    [0, 1].forEach(function (i) { placeMon(b, v.p2.active[i], false, FOE_POS[i]); });
    [0, 1].forEach(function (i) { placeMon(b, v.p1.active[i], true, ALLY_POS[i]); });
    [0, 1].forEach(function (i) { var bar = statbar(v.p2.active[i], 'lstatbar', FOE_BAR[i], 'p2' + i); if (bar) b.appendChild(bar); });
    [0, 1].forEach(function (i) { var bar = statbar(v.p1.active[i], 'rstatbar', ALLY_BAR[i], 'p1' + i); if (bar) b.appendChild(bar); });
    return b;
  }
  var COND_DE = { tailwind: 'Rückenwind', reflect: 'Reflektor', lightscreen: 'Lichtschild', auroraveil: 'Auroraschleier', safeguard: 'Bodyguard' };
  var BOOST_DE = { atk: 'Ang', def: 'Vert', spa: 'SpA', spd: 'SpV', spe: 'Init', accuracy: 'Gen', evasion: 'Flucht' };
  function fieldChips(v) {
    var out = [];
    if (v.weather) out.push((WEATHER_DE[v.weather] || v.weather) + (v.weatherTurns ? ' ' + v.weatherTurns : ''));
    if (v.terrain) out.push((TERRAIN_DE[v.terrain] || v.terrain) + (v.terrainTurns ? ' ' + v.terrainTurns : ''));
    if (v.trickRoom) out.push('Trick Room' + (v.trickRoomTurns ? ' ' + v.trickRoomTurns : ''));
    [v.p1, v.p2].forEach(function (side, si) {
      (side.conditions || []).forEach(function (c) {
        out.push((si ? 'KI ' : '') + (COND_DE[c.id] || c.id) + (c.turns ? ' ' + c.turns : ''));
      });
    });
    return out;
  }
  function ballLine(side, label) {
    var row = el('span', { class: 'btl-balls', title: label });
    row.appendChild(el('b', { text: label }));
    (side.party || []).forEach(function (p) {
      row.appendChild(el('i', { class: 'ball' + (p.fainted ? ' faint' : p.active ? ' on' : ''), title: deMon(p.species) + (p.fainted ? ' K.O.' : '') }));
    });
    return row;
  }
  function fieldControls(v) {
    var c = el('div', { class: 'battle-controls' });
    var ctl = el('div', { class: 'controls' });
    var req = v.request || { kind: 'wait' };
    if (v.ended) {
      ctl.appendChild(el('div', { class: 'whatdo', text: v.winner ? ('Sieger: ' + v.winner) : 'Unentschieden' }));
      c.appendChild(ctl);
      return c;
    }
    if (req.kind === 'preview') return previewPanel(c, ctl, req);
    if (req.kind === 'switch') return switchPanel(c, ctl, req);
    return movePanel(c, ctl, req);
  }
  function partyButton(p, on, label) {
    var b = el('button', { type: 'button', class: (p.fainted ? 'disabled' : '') + (on ? ' chosen' : '') });
    if (p.fainted || p.active) b.disabled = true;
    var icon = el('span', { class: 'picon' });
    try {
      var img = A.spriteImg(p.species);
      if (img && img.src) icon.style.backgroundImage = 'url(' + img.src + ')';
    } catch (e) { /* kein Bild */ }
    b.appendChild(icon);
    b.appendChild(document.createTextNode(label || deMon(p.species)));
    return b;
  }
  function previewPanel(c, ctl, req) {
    cur.picks = cur.picks || [];
    ctl.appendChild(el('div', { class: 'whatdo', text: 'Wähle ' + req.max + '. Die ersten zwei führen.' }));
    var sm = el('div', { class: 'switchmenu' });
    (req.party || []).forEach(function (p) {
      var idx = cur.picks.indexOf(p.slot);
      var b = partyButton(p, idx >= 0, (idx >= 0 ? (idx + 1) + ' ' : '') + deMon(p.species));
      b.disabled = false;
      b.addEventListener('click', function () {
        var at = cur.picks.indexOf(p.slot);
        if (at >= 0) cur.picks.splice(at, 1);
        else if (cur.picks.length < req.max) cur.picks.push(p.slot);
        drawBattle();
      });
      sm.appendChild(b);
    });
    ctl.appendChild(sm);
    var ok = el('button', { type: 'button', class: 'big', text: 'Mitnehmen' });
    ok.disabled = cur.picks.length !== req.max;
    ok.addEventListener('click', function () { send('team ' + cur.picks.join('')); });
    ctl.appendChild(ok);
    c.appendChild(ctl);
    return c;
  }
  function switchPanel(c, ctl, req) {
    var need = (req.flags || []).filter(Boolean).length;
    cur.picks = cur.picks || [];
    ctl.appendChild(el('div', { class: 'whatdo', text: 'Einwechseln' }));
    var sm = el('div', { class: 'switchmenu' });
    (req.party || []).forEach(function (p) {
      if (p.active || p.fainted) return;
      var on = cur.picks.indexOf(p.slot) >= 0;
      var b = partyButton(p, on);
      b.disabled = false;
      b.addEventListener('click', function () {
        var at = cur.picks.indexOf(p.slot);
        if (at >= 0) cur.picks.splice(at, 1);
        else if (cur.picks.length < need) cur.picks.push(p.slot);
        drawBattle();
      });
      sm.appendChild(b);
    });
    ctl.appendChild(sm);
    var ok = el('button', { type: 'button', class: 'big', text: 'Wechseln' });
    ok.disabled = cur.picks.length !== need;
    ok.addEventListener('click', function () { send(cur.picks.map(function (s) { return 'switch ' + s; }).join(', ')); });
    ctl.appendChild(ok);
    c.appendChild(ctl);
    return c;
  }
  function locSuffix(loc) {
    loc = loc | 0;
    if (!loc) return '';
    return loc > 0 ? (' +' + loc) : (' ' + loc);
  }
  function commitSlot(i, mv, loc) {
    var s = 'move ' + mv.slot + locSuffix(loc);
    if (cur.picks.mega === i) s += ' mega';
    if (cur.picks.tera === i) s += ' terastallize';
    cur.picks[i] = s;
  }
  function maybeSend(slots) {
    var parts = [];
    for (var i = 0; i < slots.length; i++) {
      if (!slots[i]) continue;
      if (!cur.picks[i]) { drawBattle(); return; }
      parts.push(cur.picks[i]);
    }
    if (parts.length) send(parts.join(', '));
  }
  function undoLast(slots) {
    if (cur.targeting) { cur.targeting = null; drawBattle(); return; }
    for (var i = slots.length - 1; i >= 0; i--) {
      if (cur.picks[i]) {
        cur.picks[i] = undefined;
        if (cur.picks.mega === i) cur.picks.mega = null;
        drawBattle();
        return;
      }
    }
  }
  function movePanel(c, ctl, req) {
    cur.picks = cur.picks || [];
    var slots = req.active || [];
    if (cur.busy || req.kind === 'wait') {
      ctl.appendChild(el('div', { class: 'whatdo', text: 'Warten …' }));
      c.appendChild(ctl);
      return c;
    }
    var idx = 0;
    for (var i = 0; i < slots.length; i++) { if (slots[i] && !cur.picks[i]) { idx = i; break; } }
    var slot = slots[idx];
    var who = (cur.game.p1.active && cur.game.p1.active[idx]) || {};
    ctl.appendChild(el('div', { class: 'whatdo', text: slot ? ('Was soll ' + deMon(who.species) + ' tun?') : 'Warten …' }));
    if (cur.targeting) {
      var mmT = el('div', { class: 'movemenu' });
      (cur.targeting.targets || []).forEach(function (tg) {
        var b = el('button', { type: 'button', class: 'btl-target' });
        b.appendChild(el('strong', { text: (tg.ally ? 'Partner ' : 'Gegner ') + deMon(tg.species) }));
        b.addEventListener('click', function () {
          commitSlot(cur.targeting.slotIndex, cur.targeting.move, tg.loc);
          cur.targeting = null;
          maybeSend(slots);
        });
        mmT.appendChild(b);
      });
      var backT = el('button', { type: 'button', class: 'btl-target', text: 'Zurück' });
      backT.addEventListener('click', function () { undoLast(slots); });
      mmT.appendChild(backT);
      ctl.appendChild(mmT);
      c.appendChild(ctl);
      return c;
    }
    if (slot) {
      var mc = el('div', { class: 'movecontrols' });
      var mm = el('div', { class: 'movemenu' });
      var moves = slot.moves || [];
      if (!moves.length) moves = [{ slot: 1, name: 'Struggle', type: 'Normal', pp: 1, maxpp: 1, disabled: false, targets: [] }];
      moves.forEach(function (mv) {
        var b = el('button', { type: 'button', class: 'type-' + (mv.type || 'Normal') });
        if (mv.disabled) b.disabled = true;
        b.appendChild(el('strong', { text: deMove(mv.name) }));
        b.appendChild(el('br'));
        b.appendChild(el('small', { class: 'type', text: deType(mv.type) }));
        b.appendChild(document.createTextNode(' '));
        b.appendChild(el('small', { class: 'pp', text: (mv.pp == null ? '' : mv.pp + '/' + mv.maxpp) }));
        b.addEventListener('click', function () {
          if (mv.disabled) return;
          if (mv.targets && mv.targets.length) { cur.targeting = { slotIndex: idx, move: mv, targets: mv.targets }; drawBattle(); return; }
          commitSlot(idx, mv, 0);
          maybeSend(slots);
        });
        mm.appendChild(b);
      });
      mc.appendChild(mm);
      if (slot.canMega) {
        var lab = el('label', { class: 'megaevo' });
        var input = el('input', { type: 'checkbox' });
        input.checked = cur.picks.mega === idx;
        input.addEventListener('change', function () { cur.picks.mega = input.checked ? idx : null; });
        lab.appendChild(input);
        lab.appendChild(document.createTextNode(' Mega'));
        mc.appendChild(lab);
      }
      if (cur.picks.some(function (p) { return !!p; })) {
        var undo = el('button', { type: 'button', class: 'tbtn', text: 'Zurück' });
        undo.addEventListener('click', function () { undoLast(slots); });
        mc.appendChild(undo);
      }
      ctl.appendChild(mc);
    }
    var sc = el('div', { class: 'switchcontrols' });
    var sm = el('div', { class: 'switchmenu' });
    var trapped = !!(slot && slot.trapped);
    if (trapped) sc.appendChild(el('div', { class: 'whatdo', text: 'Gefangen' }));
    (req.party || []).forEach(function (p) {
      var b = partyButton(p, !!p.active);
      if (!p.fainted && !p.active && !trapped) {
        b.disabled = false;
        b.addEventListener('click', function () { cur.picks[idx] = 'switch ' + p.slot; maybeSend(slots); });
      } else if (trapped && !p.active) {
        b.disabled = true;
        b.title = 'Gefangen';
      }
      sm.appendChild(b);
    });
    sc.appendChild(sm);
    ctl.appendChild(sc);
    c.appendChild(ctl);
    return c;
  }
  function logBox(lines) {
    var box = el('div', { class: 'battle-log' });
    var inner = el('div', { class: 'inner' });
    inner.appendChild(el('h2', { class: 'battle-history', text: 'Protokoll' }));
    lines.forEach(function (line) {
      var text = logLine(line);
      if (text) inner.appendChild(el('div', { class: 'battle-history', text: text }));
    });
    box.appendChild(inner);
    return box;
  }
  function logLine(line) {
    var p = String(line || '').split('|');
    if (p[0] === '') p.shift();
    var tag = p[0];
    if (tag === 'turn') return '— Runde ' + p[1] + ' —';
    if (tag === 'move') return deIdent(p[1]) + ' setzt ' + deMove(p[2]) + ' ein' + (p[3] ? ' → ' + deIdent(p[3]) : '');
    if (tag === 'switch' || tag === 'drag') return deIdent(p[1]) + ' → ' + deMon(String(p[2] || '').split(',')[0]);
    if (tag === 'faint') return deIdent(p[1]) + ' wurde besiegt';
    if (tag === '-damage') return deIdent(p[1]) + ' Schaden ' + (p[2] || '');
    if (tag === '-heal') return deIdent(p[1]) + ' KP ' + (p[2] || '');
    if (tag === '-status') return deIdent(p[1]) + ': ' + (statusName(p[2] || '') || p[2] || '');
    if (tag === '-curestatus' || tag === '-cureteam') return deIdent(p[1]) + ' ist geheilt';
    if (tag === '-crit') return 'Volltreffer';
    if (tag === '-supereffective') return 'Sehr effektiv';
    if (tag === '-resisted') return 'Nicht sehr effektiv';
    if (tag === '-immune') return deIdent(p[1]) + ' ist immun';
    if (tag === 'miss' || tag === '-miss') return deIdent(p[1] || p[2]) + ' verfehlt';
    if (tag === '-fail') return (deIdent(p[1]) ? deIdent(p[1]) + ': ' : '') + 'Es schlägt fehl';
    if (tag === '-boost' || tag === '-unboost') return deIdent(p[1]) + ' ' + (BOOST_DE[p[2]] || p[2] || '') + ' ' + (p[3] || '');
    if (tag === '-ability') return deIdent(p[1]) + ': ' + deOf(A.nAbility, p[2] || '');
    if (tag === '-item' || tag === '-enditem') return deIdent(p[1]) + ': ' + deOf(A.nItem, p[2] || '');
    if (tag === '-activate') return deIdent(p[1]) + ' ' + (p[2] || '');
    if (tag === '-weather' || tag === '-fieldstart' || tag === '-fieldend') return deField(p[1]);
    if (tag === '-sidestart' || tag === '-sideend') return deField(p[2] || p[1]);
    if (tag === '-prepare') return deIdent(p[1]) + ' lädt ' + deMove(p[2]);
    if (tag === '-singleturn' || tag === '-singlemove') return deIdent(p[1]) + ' ' + deMove(String(p[2] || '').replace(/^move:\s*/, ''));
    if (tag === 'cant') return deIdent(p[1]) + ' kann ' + deMove(p[2]) + ' nicht einsetzen';
    if (tag === '-start') return deIdent(p[1]) + ' ' + (p[2] || '');
    if (tag === '-mega') return deIdent(p[1]) + ' entwickelt sich zu Mega';
    if (tag === 'win') return 'Sieger: ' + (p[1] || '');
    if (tag === 'tie') return 'Unentschieden';
    return '';
  }
  function deIdent(ident) {
    return deMon(nameOf(ident).split(',')[0]) || nameOf(ident);
  }
  function deField(s) {
    s = String(s || '').replace(/^move:\s*/, '');
    var map = {
      RainDance: 'Regen', Sandstorm: 'Sandsturm', SunnyDay: 'Sonne', Snow: 'Schnee', Snowscape: 'Schnee',
      'Grassy Terrain': 'Grasfeld', 'Electric Terrain': 'Elektrofeld', 'Psychic Terrain': 'Psychofeld', 'Misty Terrain': 'Nebelfeld',
      'Heavy Rain': 'Starkregen', 'Harsh Sunlight': 'Gleißende Sonne', 'Harsh Sunshine': 'Gleißende Sonne'
    };
    return map[s] || WEATHER_DE[s] || TERRAIN_DE[s] || s;
  }
  function nameOf(ident) {
    var i = String(ident || '').indexOf(':');
    return i >= 0 ? ident.slice(i + 1).trim() : String(ident || '');
  }

  window.CCBattleUI = { open: open };
})();

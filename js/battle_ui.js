// Kämpfe: local doubles against the L0–L3 bots.
// Desktop runs the bundled simulator in an Electron worker. Android has no simulator in the web view.
// Sprites come from the app, never from a Pokémon Showdown server.
(function () {
  'use strict';
  var A = window.CC;
  if (!A) return;
  var el = A.el, de = A.LANG === 'de';
  function T(d, e) { return de ? d : e; }
  var ROOTS = { btlrandom: 'btlRandomView', btlchoice: 'btlChoiceView' };
  var cur = { view: null, mode: 'btlrandom', game: null, last: null, picks: [], targeting: null, busy: false, error: '', level: 2, foeSrc: 'builder', useBuilder: false };

  function api() { return window.desktop && window.desktop.battle; }
  function pct(hp, max) { if (!max) return 0; return Math.max(0, Math.min(100, Math.round(100 * hp / max))); }
  function statusName(s) {
    return { brn: 'BRN', par: 'PAR', psn: 'PSN', tox: 'TOX', slp: 'SLP', frz: 'FRZ' }[s] || '';
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
    root.innerHTML = '';
    var box = el('div', { class: 'btl-play' });
    box.appendChild(el('h2', { text: cur.mode === 'btlrandom' ? T('Zufallskampf', 'Random battle') : T('Eigener Kampf', 'Your battle') }));
    box.appendChild(el('p', { class: 'btl-note', text: T('Nur auf diesem Gerät. Kein Pokémon-Showdown-Server und keine Ladder. Doppelkampf, Reg M-C.', 'On this device only. No Pokémon Showdown server and no ladder. Doubles, Reg M-C.') }));
    if (!api()) box.appendChild(el('p', { class: 'btl-warn', text: T('Der Kampfsimulator läuft in der Desktop-App. Auf Android siehst du die Auswahl; der Kampf selbst braucht den lokalen Simulator der Desktop-Version.', 'The battle simulator runs in the desktop app. On Android you can set up a battle; playing it needs the desktop simulator.') }));
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

  function drawBattle() {
    var root = cur.view, v = cur.game;
    root.innerHTML = '';
    var top = el('div', { class: 'btl-top' });
    top.appendChild(el('h2', { text: (cur.mode === 'btlrandom' ? T('Zufallskampf', 'Random battle') : T('Eigener Kampf', 'Your battle')) + ' · L' + (v.level | 0) }));
    var chips = el('div', { class: 'btl-chips' });
    chips.appendChild(el('span', { text: T('Runde ', 'Turn ') + v.turn }));
    if (v.weather) chips.appendChild(el('span', { text: v.weather }));
    if (v.terrain) chips.appendChild(el('span', { text: v.terrain }));
    if (v.trickRoom) chips.appendChild(el('span', { text: 'Trick Room' }));
    top.appendChild(chips);
    var acts = el('div', { class: 'btl-top-acts' });
    var back = el('button', { type: 'button', class: 'tbtn', text: T('Zurück', 'Back') });
    back.addEventListener('click', function () { cur.game = null; cur.error = ''; drawLobby(); });
    acts.appendChild(back);
    if (!v.ended) {
      var ff = el('button', { type: 'button', class: 'tbtn', text: T('Aufgeben', 'Forfeit') });
      ff.addEventListener('click', function () { api().forfeit().then(function (res) { if (res && res.view) { cur.game = res.view; drawBattle(); } }); });
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
    var field = el('div', { class: 'btl-field' });
    field.appendChild(sideRow(v.p2, true));
    field.appendChild(sideRow(v.p1, false));
    var play = el('div', { class: 'btl-play' });
    play.appendChild(top);
    play.appendChild(field);
    play.appendChild(controls(v));
    if (cur.error) play.appendChild(el('p', { class: 'btl-bad', text: cur.error }));
    if (v.ended) play.appendChild(el('p', { class: 'btl-end', text: v.winner ? (T('Sieger: ', 'Winner: ') + v.winner) : T('Unentschieden', 'Tie') }));
    play.appendChild(logBox(v.log || []));
    root.appendChild(play);
  }
  function sideRow(side, foe) {
    var row = el('div', { class: 'btl-side' + (foe ? ' foe' : ' you') });
    row.appendChild(el('div', { class: 'btl-side-name', text: side.name, title: side.name }));
    var act = el('div', { class: 'btl-actives' });
    (side.active || []).forEach(function (p) { act.appendChild(pokeCard(p)); });
    row.appendChild(act);
    var bench = el('div', { class: 'btl-bench' });
    (side.party || []).forEach(function (p) {
      var b = el('span', { class: 'btl-chip' + (p.fainted ? ' faint' : '') + (p.active ? ' on' : ''), title: p.species });
      b.appendChild(el('b', { text: A.nSpecies(p.species) }));
      b.appendChild(el('i', { text: p.fainted ? 'K.O.' : (pct(p.hp, p.maxhp) + '%') }));
      bench.appendChild(b);
    });
    row.appendChild(bench);
    return row;
  }
  function pokeCard(p) {
    var card = el('div', { class: 'btl-poke' + (!p || p.fainted ? ' faint' : '') });
    if (!p) return card;
    var spr = el('div', { class: 'btl-sprite' });
    try { spr.appendChild(A.spriteFit(p.species)); } catch (e) { spr.textContent = A.nSpecies(p.species); }
    card.appendChild(spr);
    var info = el('div', { class: 'btl-pinfo' });
    info.appendChild(el('div', { class: 'btl-pname', text: A.nSpecies(p.species), title: A.nSpecies(p.species) }));
    var bar = el('div', { class: 'btl-hp' });
    var fill = el('span');
    var n = pct(p.hp, p.maxhp);
    fill.style.width = n + '%';
    if (n <= 25) fill.className = 'low';
    else if (n <= 50) fill.className = 'mid';
    bar.appendChild(fill);
    info.appendChild(bar);
    info.appendChild(el('div', { class: 'btl-hptext', text: p.hp + '/' + p.maxhp + (p.status ? ' ' + statusName(p.status) : '') }));
    card.appendChild(info);
    return card;
  }
  function controls(v) {
    var box = el('div', { class: 'btl-controls' });
    if (v.ended) return box;
    var req = v.request || { kind: 'wait' };
    if (req.kind === 'wait') { box.appendChild(el('p', { class: 'btl-note', text: T('Warten …', 'Waiting …') })); return box; }
    if (req.kind === 'preview') return previewControls(box, req);
    if (req.kind === 'switch') return switchControls(box, req);
    return moveControls(box, req);
  }
  function previewControls(box, req) {
    cur.picks = cur.picks || [];
    box.appendChild(el('p', { class: 'btl-note', text: T('Wähle ' + req.max + ' Pokémon. Die ersten zwei führen.', 'Bring ' + req.max + '. The first two lead.') }));
    var grid = el('div', { class: 'btl-preview' });
    (req.party || []).forEach(function (p) {
      var idx = cur.picks.indexOf(p.slot);
      var b = el('button', { type: 'button', class: 'btl-prev' + (idx >= 0 ? ' on' : '') });
      b.appendChild(el('b', { text: idx >= 0 ? String(idx + 1) : '·' }));
      b.appendChild(el('span', { text: A.nSpecies(p.species) }));
      b.addEventListener('click', function () {
        var at = cur.picks.indexOf(p.slot);
        if (at >= 0) cur.picks.splice(at, 1);
        else if (cur.picks.length < req.max) cur.picks.push(p.slot);
        drawBattle();
      });
      grid.appendChild(b);
    });
    box.appendChild(grid);
    var ok = el('button', { type: 'button', class: 'primary-btn', text: T('Mitnehmen', 'Bring') });
    ok.disabled = cur.picks.length !== req.max;
    ok.addEventListener('click', function () { send('team ' + cur.picks.join('')); });
    box.appendChild(ok);
    return box;
  }
  function switchControls(box, req) {
    var need = (req.flags || []).filter(Boolean).length;
    cur.picks = cur.picks || [];
    box.appendChild(el('p', { class: 'btl-note', text: T('Einwechseln', 'Switch in') }));
    var grid = el('div', { class: 'btl-preview' });
    (req.party || []).forEach(function (p) {
      if (p.active || p.fainted) return;
      var on = cur.picks.indexOf(p.slot) >= 0;
      var b = el('button', { type: 'button', class: 'btl-prev' + (on ? ' on' : ''), text: A.nSpecies(p.species) });
      b.addEventListener('click', function () {
        var at = cur.picks.indexOf(p.slot);
        if (at >= 0) cur.picks.splice(at, 1);
        else if (cur.picks.length < need) cur.picks.push(p.slot);
        drawBattle();
      });
      grid.appendChild(b);
    });
    box.appendChild(grid);
    var ok = el('button', { type: 'button', class: 'primary-btn', text: T('Wechseln', 'Switch') });
    ok.disabled = cur.picks.length !== need;
    ok.addEventListener('click', function () { send(cur.picks.map(function (s) { return 'switch ' + s; }).join(', ')); });
    box.appendChild(ok);
    return box;
  }
  function moveControls(box, req) {
    cur.picks = cur.picks || [];
    var slots = req.active || [];
    if (cur.targeting) {
      box.appendChild(el('p', { class: 'btl-note', text: T('Ziel wählen', 'Choose a target') }));
      var row = el('div', { class: 'btl-targets' });
      (cur.targeting.targets || []).forEach(function (tg) {
        var b = el('button', { type: 'button', class: 'tbtn', text: (tg.ally ? T('Partner ', 'Ally ') : T('Gegner ', 'Foe ')) + A.nSpecies(tg.species) });
        b.addEventListener('click', function () {
          commitSlot(cur.targeting.slotIndex, cur.targeting.move, tg.loc);
          cur.targeting = null;
          maybeSend(slots);
        });
        row.appendChild(b);
      });
      var cancel = el('button', { type: 'button', class: 'tbtn', text: T('Zurück', 'Back') });
      cancel.addEventListener('click', function () { cur.targeting = null; drawBattle(); });
      row.appendChild(cancel);
      box.appendChild(row);
      return box;
    }
    slots.forEach(function (slot, i) {
      if (!slot) return;
      var card = el('div', { class: 'btl-moveslot' });
      var who = (cur.game.p1.active && cur.game.p1.active[i]) || {};
      card.appendChild(el('div', { class: 'btl-label', text: A.nSpecies(who.species || '') }));
      if (cur.picks[i]) card.appendChild(el('div', { class: 'btl-note', text: cur.picks[i] }));
      var grid = el('div', { class: 'btl-moves' });
      (slot.moves || []).forEach(function (mv) {
        var b = el('button', { type: 'button', class: 'btl-move type-' + (mv.type || 'Normal') });
        if (mv.disabled) b.disabled = true;
        b.appendChild(el('span', { class: 'mv-name', text: A.nMove(mv.name) }));
        b.appendChild(el('span', { class: 'mv-meta', text: (mv.type ? A.nType(mv.type) : '') + ' ' + mv.pp + '/' + mv.maxpp }));
        b.addEventListener('click', function () {
          if (mv.disabled) return;
          if (mv.targets && mv.targets.length) { cur.targeting = { slotIndex: i, move: mv, targets: mv.targets }; drawBattle(); return; }
          commitSlot(i, mv, 0);
          maybeSend(slots);
        });
        grid.appendChild(b);
      });
      card.appendChild(grid);
      var extras = el('div', { class: 'btl-extras' });
      if (slot.canMega) {
        var mega = el('button', { type: 'button', class: 'tbtn' + (cur.picks.mega === i ? ' on' : ''), text: 'Mega' });
        mega.addEventListener('click', function () { cur.picks.mega = cur.picks.mega === i ? null : i; drawBattle(); });
        extras.appendChild(mega);
      }
      if (slot.canTera) {
        var tera = el('button', { type: 'button', class: 'tbtn' + (cur.picks.tera === i ? ' on' : ''), text: 'Tera' });
        tera.addEventListener('click', function () { cur.picks.tera = cur.picks.tera === i ? null : i; drawBattle(); });
        extras.appendChild(tera);
      }
      var sw = el('button', { type: 'button', class: 'tbtn', text: T('Wechseln', 'Switch') });
      sw.addEventListener('click', function () { openSwitch(i, req.party || [], slots); });
      extras.appendChild(sw);
      card.appendChild(extras);
      box.appendChild(card);
    });
    return box;
  }
  function commitSlot(i, mv, loc) {
    var s = 'move ' + mv.slot;
    if (loc) s += ' ' + loc;
    if (cur.picks.mega === i) s += ' mega';
    if (cur.picks.tera === i) s += ' terastallize';
    cur.picks[i] = s;
  }
  function maybeSend(slots) {
    var parts = [];
    for (var i = 0; i < slots.length; i++) {
      if (!slots[i]) { parts.push('pass'); continue; }
      if (!cur.picks[i]) { drawBattle(); return; }
      parts.push(cur.picks[i]);
    }
    send(parts.join(', '));
  }
  function openSwitch(i, party, slots) {
    var bench = party.filter(function (p) { return !p.active && !p.fainted; });
    if (!bench.length) return;
    var box = cur.view.querySelector('.btl-controls');
    if (!box) return;
    var row = el('div', { class: 'btl-targets' });
    bench.forEach(function (p) {
      var b = el('button', { type: 'button', class: 'tbtn', text: A.nSpecies(p.species) });
      b.addEventListener('click', function () { cur.picks[i] = 'switch ' + p.slot; maybeSend(slots); });
      row.appendChild(b);
    });
    box.appendChild(row);
  }
  function logBox(lines) {
    var box = el('div', { class: 'btl-log' });
    box.appendChild(el('div', { class: 'btl-label', text: T('Protokoll', 'Log') }));
    var pre = el('div', { class: 'btl-log-body' });
    lines.forEach(function (line) {
      var text = logLine(line);
      if (text) pre.appendChild(el('div', { text: text }));
    });
    box.appendChild(pre);
    return box;
  }
  function logLine(line) {
    var p = String(line || '').split('|');
    if (p[0] === '') p.shift();
    var tag = p[0];
    if (tag === 'turn') return T('Runde ', 'Turn ') + p[1];
    if (tag === 'move') return nameOf(p[1]) + ' · ' + (p[2] || '') + (p[3] ? ' → ' + nameOf(p[3]) : '');
    if (tag === 'switch' || tag === 'drag') return nameOf(p[1]) + ' → ' + String(p[2] || '').split(',')[0];
    if (tag === 'faint') return nameOf(p[1]) + ' K.O.';
    if (tag === '-damage' || tag === '-heal') return nameOf(p[1]) + ' ' + (p[2] || '');
    if (tag === '-status') return nameOf(p[1]) + ' ' + statusName(p[2] || '');
    if (tag === '-weather' || tag === '-fieldstart' || tag === '-fieldend') return p[1] || '';
    if (tag === 'win') return T('Sieger: ', 'Winner: ') + (p[1] || '');
    if (tag === '-mega') return nameOf(p[1]) + ' Mega';
    return '';
  }
  function nameOf(ident) {
    var i = String(ident || '').indexOf(':');
    return i >= 0 ? ident.slice(i + 1).trim() : String(ident || '');
  }

  window.CCBattleUI = { open: open };
})();

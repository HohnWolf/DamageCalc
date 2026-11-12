// SP-Optimierer: sucht die kleinste Stat-Point-Verteilung (66 SP, max. 32 je Wert), die gewählte Ziele erfüllt:
// "überlebt Attacke X von Gegner Y", "schlägt Gegner Z mit Attacke W K.O." und "ist schneller als ...".
// Der Schaden kommt immer aus Calc.calculate (js/calc.js), die Werte aus Calc.calcStat. Pokémon lassen sich aus dem Teambuilder importieren
// und das Ergebnis lässt sich ins Teambuilder-Set zurückschreiben.
(function () {
  'use strict';
  var A = window.CC, C = window.Calc;
  if (!A || !C) return;
  var el = A.el, DEX = A.DEX, MOVES = A.MOVES;
  var de = A.LANG === 'de';
  var KEY = 'cc_spopt';
  var SP_MAX = 32, SP_TOTAL = 66;
  var STATS = ['hp', 'at', 'df', 'sa', 'sd', 'sp'];

  var TXT = de ? {
    me: 'Mein Pokémon', goals: 'Ziele', addSurvive: '+ Überlebt Treffer', addKo: '+ Schlägt K.O.', addSpeed: '+ Schneller als', fromTeam: 'Aus Teambuilder …', species: 'Pokémon', set: 'Set', setPick: 'Beliebtes Set …',
    nature: 'Wesen', ability: 'Fähigkeit', item: 'Item', autoNature: 'Wesen automatisch wählen (spart die meisten SP)', fixedNature: 'Wesen bleibt wie gewählt',
    survive: 'Überlebt', ko: 'K.O.', speed: 'Initiative', move: 'Attacke', chance: 'Anteil der Zufallswerte', all: '100 % (garantiert)', crit: 'Volltreffer', hh: 'Rechte Hand', screen: 'Schutzwall (Reflektor/Lichtschild)', stage: 'Stufe',
    vsMon: 'Gegen Pokémon', vsValue: 'Gegen Wert', value: 'Initiative-Wert', twThem: 'Gegner mit Rückenwind', twMe: 'Ich mit Rückenwind', remove: 'Ziel entfernen',
    field: 'Feld', format: 'Kampfart', doubles: 'Doppelkampf', singles: 'Einzelkampf', weather: 'Wetter', terrain: 'Terrain', none: 'Keins',
    result: 'Ergebnis', nothing: 'Füge links mindestens ein Ziel hinzu. Zum Beispiel „Überlebt Treffer“ mit einem Gegner und einer Attacke.',
    spent: 'Verteilt', free: 'frei', over: 'zu viel', impossible: 'Mit diesen Zielen ist keine Verteilung möglich (max. 32 SP je Wert, 66 insgesamt).',
    unreachable: 'Auch mit 32 SP nicht erreichbar', checks: 'Prüfung', alt: 'Andere Wesen', current: 'Aktuell', best: 'Optimiert', copy: 'Als Text kopieren', apply: 'Ins Teambuilder-Set übernehmen',
    copied: 'Kopiert', applied: 'Im Teambuilder gespeichert', noTeams: 'Keine Teams', dmg: 'Schaden', survives: 'überlebt', kos: 'K.O.', faster: 'schneller', slower: 'langsamer', tie: 'gleich',
    of: 'der Werte', rolls: 'Zufallswerte', hint: 'Einzelner Treffer, volle KP. Items wie Sitrus oder Sash zählen nicht.', reset: 'Zurücksetzen', theirSp: 'SP des Gegners', noMove: '(Attacke wählen)'
  } : {
    me: 'My Pokémon', goals: 'Goals', addSurvive: '+ Survives hit', addKo: '+ Knocks out', addSpeed: '+ Outspeeds', fromTeam: 'From Teambuilder …', species: 'Pokémon', set: 'Set', setPick: 'Popular set …',
    nature: 'Nature', ability: 'Ability', item: 'Item', autoNature: 'Pick nature automatically (saves the most SP)', fixedNature: 'Keep the chosen nature',
    survive: 'Survives', ko: 'KO', speed: 'Speed', move: 'Move', chance: 'Share of damage rolls', all: '100% (guaranteed)', crit: 'Crit', hh: 'Helping Hand', screen: 'Screen (Reflect/Light Screen)', stage: 'Stage',
    vsMon: 'Versus Pokémon', vsValue: 'Versus value', value: 'Speed value', twThem: 'Opponent in Tailwind', twMe: 'Me in Tailwind', remove: 'Remove goal',
    field: 'Field', format: 'Format', doubles: 'Doubles', singles: 'Singles', weather: 'Weather', terrain: 'Terrain', none: 'None',
    result: 'Result', nothing: 'Add at least one goal on the left, for example "Survives hit" with an opponent and a move.',
    spent: 'Spent', free: 'free', over: 'over', impossible: 'No spread meets these goals (max 32 SP per stat, 66 in total).',
    unreachable: 'Not reachable even with 32 SP', checks: 'Check', alt: 'Other natures', current: 'Current', best: 'Optimized', copy: 'Copy as text', apply: 'Save to Teambuilder set',
    copied: 'Copied', applied: 'Saved in the Teambuilder', noTeams: 'No teams', dmg: 'Damage', survives: 'survives', kos: 'KO', faster: 'faster', slower: 'slower', tie: 'tie',
    of: 'of rolls', rolls: 'rolls', hint: 'Single hit at full HP. Items like Sitrus or Sash are not counted.', reset: 'Reset', theirSp: 'Opponent SP', noMove: '(pick a move)'
  };

  var STAT_LBL = de ? { hp: 'KP', at: 'Angr.', df: 'Vert.', sa: 'Sp.-Angr.', sd: 'Sp.-Vert.', sp: 'Init.' } : { hp: 'HP', at: 'Atk', df: 'Def', sa: 'SpA', sd: 'SpD', sp: 'Spe' };
  var STAT_SD = { hp: 'HP', at: 'Atk', df: 'Def', sa: 'SpA', sd: 'SpD', sp: 'Spe' };
  var SPEC_AS_PHYS = { Psyshock: 1, Psystrike: 1, 'Secret Sword': 1 };
  var P_OPTS = [[1, TXT.all], [0.875, '87,5 %'], [0.75, '75 %'], [0.5, '50 %'], [0.25, '25 %']];

  // ======================= Zustand =======================
  function zeroSps() { return { hp: 0, at: 0, df: 0, sa: 0, sd: 0, sp: 0 }; }
  function newSpec(species) {
    species = DEX[species] ? species : (A.SPECIES[0] || 'Garchomp');
    var d = DEX[species];
    return { species: species, nature: 'Hardy', ability: d.ab || '', item: '(none)', sps: zeroSps(), moves: [] };
  }
  function defaults() { return { me: newSpec('Garchomp'), src: null, auto: true, goals: [], field: { format: 'Doubles', weather: 'None', terrain: 'None' } }; }
  var S = defaults();
  try {
    var raw = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (raw && raw.me && DEX[raw.me.species] && Array.isArray(raw.goals)) {
      S = Object.assign(defaults(), raw);
      S.goals = S.goals.filter(function (g) { return g && (g.type === 'speed' ? (g.mode === 'value' || (g.opp && DEX[g.opp.species])) : (g.opp && DEX[g.opp.species])); });
    }
  } catch (e) { S = defaults(); }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* ignore */ } }

  // ======================= Rechnen =======================
  function formeOf(spec) { return A.megaFormeFor(A.baseOf(spec.species), spec.item) || spec.species; }
  function mk(spec, sps, boosts) {
    var forme = formeOf(spec), d = DEX[forme] || DEX[spec.species];
    var stats = {};
    STATS.forEach(function (s) { stats[s] = C.calcStat(s, d.bs[s], sps[s] || 0, spec.nature, forme); });
    var types = [d.t1]; if (d.t2 && d.t2 !== d.t1) types.push(d.t2);
    var isMega = forme.indexOf('Mega ') === 0;
    return {
      species: forme, baseSpecies: A.baseOf(spec.species), types: types, stats: stats, sps: sps,
      boosts: Object.assign({ at: 0, df: 0, sa: 0, sd: 0, sp: 0 }, boosts || {}), nature: spec.nature,
      ability: isMega && d.ab ? d.ab : (spec.ability || d.ab), item: spec.item, status: 'Healthy',
      curHP: stats.hp, maxHP: stats.hp, weight: d.w || 50, canEvolve: !!d.canEvolve, moves: [], fainted: 0, baseAtk: d.bs.at
    };
  }
  function moveObj(name, crit) { return Object.assign({}, MOVES[name] || {}, { name: name, crit: !!crit }); }
  function fieldObj() {
    return {
      format: S.field.format, weather: S.field.weather, terrain: S.field.terrain, gravity: false,
      ruin: { tablets: false, vessel: false, sword: false, beads: false }, fairyAura: false, darkAura: false, auraBreak: false, sides: [{}, {}]
    };
  }
  function atkStatOf(name) {
    var m = MOVES[name];
    if (name === 'Body Press') return 'df';
    return m && m.category === 'Physical' ? 'at' : 'sa';
  }
  function defStatOf(name) {
    var m = MOVES[name];
    return (m && m.category === 'Physical') || SPEC_AS_PHYS[name] ? 'df' : 'sd';
  }
  function isDamaging(name) { var m = MOVES[name]; return !!m && m.category !== 'Status' && name !== '(No Move)'; }
  function rolls(att, def, g, attacksMe) {
    var mv = moveObj(g.move, g.crit);
    var dSide = {};
    if (g.screen) { dSide[mv.category === 'Physical' ? 'reflect' : 'lightScreen'] = true; }
    var r = C.calculate(att, def, mv, fieldObj(), { helpingHand: !!g.hh }, dSide);
    return (r && r.damage && r.damage.length) ? r.damage : [0];
  }
  function share(arr, pred) { var n = 0; arr.forEach(function (x) { if (pred(x)) n++; }); return n / arr.length; }
  function minSp(pred) {
    if (!pred(SP_MAX)) return null;
    var lo = 0, hi = SP_MAX;
    while (lo < hi) { var mid = (lo + hi) >> 1; if (pred(mid)) hi = mid; else lo = mid + 1; }
    return lo;
  }
  function stageBoost(g, move) { var b = {}; b[atkStatOf(move)] = g.stage | 0; return b; }
  function withSp(base, stat, v) { var o = Object.assign({}, base); o[stat] = v; return o; }

  function surviveFrac(g, nature, sps) {
    var me = mk(Object.assign({}, S.me, { nature: nature }), sps);
    var att = mk(g.opp, g.opp.sps, stageBoost(g, g.move));
    var r = rolls(att, me, g, false);
    return { r: r, frac: share(r, function (x) { return x < me.maxHP; }), hp: me.maxHP };
  }
  function koFrac(g, nature, sps) {
    var me = mk(Object.assign({}, S.me, { nature: nature }), sps, stageBoost(g, g.move));
    var def = mk(g.opp, g.opp.sps);
    var r = rolls(me, def, g, true);
    return { r: r, frac: share(r, function (x) { return x >= def.maxHP; }), hp: def.maxHP };
  }
  function speedInfo(g, nature, sps) {
    var me = mk(Object.assign({}, S.me, { nature: nature }), sps);
    var mine = me.stats.sp;
    if (me.item === 'Choice Scarf') mine = Math.floor(mine * 1.5);
    if (g.twMe) mine *= 2;
    var theirs;
    if (g.mode === 'value') theirs = Math.max(1, parseInt(g.value, 10) || 1);
    else {
      var t = mk(g.opp, g.opp.sps);
      theirs = t.stats.sp;
      if (t.item === 'Choice Scarf') theirs = Math.floor(theirs * 1.5);
    }
    if (g.twThem) theirs *= 2;
    return { mine: mine, theirs: theirs };
  }
  function goalOk(g, nature, sps) {
    if (g.type === 'survive') return surviveFrac(g, nature, sps).frac >= (g.p || 1) - 1e-9;
    if (g.type === 'ko') return koFrac(g, nature, sps).frac >= (g.p || 1) - 1e-9;
    var s = speedInfo(g, nature, sps); return s.mine > s.theirs;
  }
  function usable(g) { return g.type === 'speed' ? true : isDamaging(g.move); }

  // Kleinste Verteilung für ein Wesen. Rückgabe: { total, sps } oder { fail: [Ziele] }
  function solve(nature) {
    var req = zeroSps(), fail = [];
    var surv = S.goals.filter(function (g) { return g.type === 'survive' && usable(g); });
    S.goals.forEach(function (g) {
      if (!usable(g) || g.type === 'survive') return;
      var stat = g.type === 'speed' ? 'sp' : atkStatOf(g.move), v = minSp(function (x) { return goalOk(g, nature, withSp(zeroSps(), stat, x)); });
      if (v == null) fail.push(g); else req[stat] = Math.max(req[stat], v);
    });
    if (fail.length) return { fail: fail };
    var best = null, lastFail = [];
    for (var h = 0; h <= (surv.length ? SP_MAX : 0); h++) {
      var need = { df: req.df, sd: req.sd }, bad = [];
      for (var i = 0; i < surv.length; i++) {
        var g = surv[i], stat = defStatOf(g.move), base = { hp: h, at: 0, df: 0, sa: 0, sd: 0, sp: 0 };
        var v = minSp(function (x) { return goalOk(g, nature, withSp(base, stat, x)); });
        if (v == null) { bad.push(g); break; }
        need[stat] = Math.max(need[stat], v);
      }
      if (bad.length) { lastFail = bad; continue; }
      var sps = { hp: h, at: req.at, df: need.df, sa: req.sa, sd: need.sd, sp: req.sp };
      var total = STATS.reduce(function (a, s) { return a + sps[s]; }, 0);
      if (!best || total < best.total) best = { total: total, sps: sps };
    }
    return best || { fail: lastFail };
  }
  var NATURE_LIST = (function () {
    var seen = { '': 1 }, out = ['Hardy'];
    Object.keys(C.NATURES).sort().forEach(function (n) { var m = C.NATURES[n]; if (m.length) out.push(n); });
    return out;
  })();
  function run() {
    var goals = S.goals.filter(usable);
    if (!goals.length) return null;
    var cands = S.auto ? NATURE_LIST : [S.me.nature], res = [];
    cands.forEach(function (n) { var r = solve(n); r.nature = n; res.push(r); });
    var ok = res.filter(function (r) { return !r.fail; });
    ok.sort(function (a, b) { return a.total - b.total; });
    var fails = res.filter(function (r) { return r.fail; });
    var best = ok[0] || null;
    return { best: best, ok: ok, fail: best ? null : (fails.filter(function (r) { return r.nature === S.me.nature; })[0] || fails[0]) };
  }

  // ======================= Oberfläche =======================
  var teamCache = null;
  function teamsList() {
    if (window.CCBuilder && window.CCBuilder.teams) { try { return window.CCBuilder.teams(); } catch (e) { /* ignore */ } }
    return [];
  }
  function monFromBuilder(m) {
    var set = m.set || {};
    var sp = set.forme && set.forme.indexOf('Mega ') !== 0 && DEX[set.forme] ? set.forme : m.species;
    if (!DEX[sp]) sp = DEX[m.species] ? m.species : null;
    if (!sp) return null;
    var spec = newSpec(sp);
    spec.nature = C.NATURES[set.nature] ? set.nature : 'Hardy';
    spec.ability = set.ability || spec.ability;
    spec.item = set.item || '(none)';
    spec.sps = Object.assign(zeroSps(), set.sps || {});
    spec.moves = (set.moves || []).filter(function (x) { return MOVES[x]; });
    return spec;
  }
  var NAME_MAP = null;
  function speciesFromText(t) {
    if (!NAME_MAP) {
      NAME_MAP = {};
      Object.keys(DEX).forEach(function (k) { NAME_MAP[k.toLowerCase()] = k; });
      Object.keys(DEX).forEach(function (k) { NAME_MAP[A.nSpecies(k).toLowerCase()] = k; });
    }
    return NAME_MAP[String(t).trim().toLowerCase()] || null;
  }
  var dlId = 'so_species_list';
  function ensureDatalist() {
    if (document.getElementById(dlId)) return;
    var dl = el('datalist', { id: dlId });
    Object.keys(DEX).sort().forEach(function (k) { dl.appendChild(el('option', { value: A.nSpecies(k) })); });
    document.body.appendChild(dl);
  }
  function selectOf(values, labelFn, cur) {
    var s = el('select');
    values.forEach(function (v) { s.appendChild(el('option', { value: v, text: labelFn ? labelFn(v) : v })); });
    if (values.indexOf(cur) === -1 && cur != null) s.insertBefore(el('option', { value: cur, text: labelFn ? labelFn(cur) : cur }), s.firstChild);
    s.value = cur;
    return s;
  }
  function labeled(txt, node, cls) {
    var w = el('label', { class: 'so-f' + (cls ? ' ' + cls : '') });
    w.appendChild(el('span', { class: 'so-l', text: txt })); w.appendChild(node); return w;
  }
  function abilityList(spec) {
    var forme = formeOf(spec);
    var l = A.legalAbilities(forme);
    if (!l) l = DEX[forme] && DEX[forme].ab ? [DEX[forme].ab] : [];
    return l;
  }

  // Pokémon-Editor: Import aus dem Teambuilder, Suche, Set, Wesen, Item, Fähigkeit (und optional SP des Gegners)
  function monEditor(spec, o) {
    ensureDatalist();
    var box = el('div', { class: 'so-mon' });
    var row1 = el('div', { class: 'so-row' });
    var tl = teamsList();
    var imp = el('select', { class: 'so-import' });
    imp.appendChild(el('option', { value: '', text: TXT.fromTeam }));
    tl.forEach(function (t) {
      var og = el('optgroup', { label: t.name || 'Team' });
      (t.mons || []).forEach(function (m, i) { if (m && DEX[m.species]) og.appendChild(el('option', { value: t.id + '|' + i, text: A.nSpecies(m.species) })); });
      if (og.children.length) imp.appendChild(og);
    });
    imp.addEventListener('change', function () {
      if (!imp.value) return;
      var p = imp.value.split('|'), idx = +p[1], team = tl.filter(function (t) { return t.id === p[0]; })[0];
      var m = team && team.mons[idx], n = m && monFromBuilder(m);
      if (!n) return;
      o.onPick(n, { teamId: p[0], idx: idx });
    });
    var sp = el('input', { type: 'text', class: 'so-species', list: dlId, placeholder: TXT.species });
    sp.value = A.nSpecies(spec.species);
    sp.addEventListener('change', function () {
      var k = speciesFromText(sp.value);
      if (!k) { sp.value = A.nSpecies(spec.species); return; }
      var n = newSpec(k); n.nature = spec.nature; n.sps = spec.sps;
      o.onPick(n, null);
    });
    var sets = A.setsFor(A.baseOf(spec.species));
    var setSel = el('select', { class: 'so-set' });
    setSel.appendChild(el('option', { value: '', text: TXT.setPick }));
    sets.forEach(function (s, i) { setSel.appendChild(el('option', { value: i, text: (s.item && s.item !== '(none)' ? A.nItem(s.item) : '-') + ' · ' + A.nNature(s.nature || 'Hardy') })); });
    setSel.addEventListener('change', function () {
      if (setSel.value === '') return;
      var s = sets[+setSel.value], n = monFromBuilder({ species: spec.species, set: s });
      if (n) o.onPick(n, null);
    });
    row1.appendChild(imp); row1.appendChild(sp); if (sets.length) row1.appendChild(setSel);
    box.appendChild(row1);

    var row2 = el('div', { class: 'so-row' });
    var nat = selectOf(A.NATURE_NAMES, A.natureLabel, spec.nature);
    nat.addEventListener('change', function () { spec.nature = nat.value; o.onChange(); });
    var item = selectOf(A.ITEMS, function (v) { return v === '(none)' ? TXT.none : A.nItem(v); }, spec.item);
    item.addEventListener('change', function () { spec.item = item.value; o.onChange(true); });
    var abs = abilityList(spec);
    var ab = selectOf(abs.length ? abs : [spec.ability || ''], function (v) { return v ? A.nAbility(v) : '-'; }, spec.ability);
    ab.addEventListener('change', function () { spec.ability = ab.value; o.onChange(); });
    if (!o.hideNature) row2.appendChild(labeled(TXT.nature, nat));
    row2.appendChild(labeled(TXT.item, item));
    row2.appendChild(labeled(TXT.ability, ab));
    box.appendChild(row2);

    if (o.sps) {
      var row3 = el('div', { class: 'so-row so-sps' });
      STATS.forEach(function (s) {
        var inp = el('input', { type: 'number', min: 0, max: SP_MAX });
        inp.value = spec.sps[s] || 0;
        inp.addEventListener('input', function () { spec.sps[s] = Math.max(0, Math.min(SP_MAX, parseInt(inp.value, 10) || 0)); o.onChange(); });
        row3.appendChild(labeled(STAT_LBL[s], inp));
      });
      box.appendChild(el('div', { class: 'so-l so-sub', text: TXT.theirSp }));
      box.appendChild(row3);
    }
    return box;
  }
  function moveChoices(spec, extra) {
    var forme = formeOf(spec), legal = A.legalMoves(forme) || Object.keys(MOVES);
    var list = [];
    (spec.moves || []).forEach(function (m) { if (isDamaging(m) && list.indexOf(m) === -1) list.push(m); });
    A.sortedBy(legal.filter(isDamaging), A.nMove).forEach(function (m) { if (list.indexOf(m) === -1) list.push(m); });
    if (extra && list.indexOf(extra) === -1 && isDamaging(extra)) list.unshift(extra);
    return list;
  }

  function render() {
    var root = document.getElementById('spoptView');
    if (!root) return;
    root.innerHTML = '';
    var shell = el('div', { class: 'so-shell' });
    var left = el('div', { class: 'so-left' }), right = el('div', { class: 'so-right' });
    shell.appendChild(left); shell.appendChild(right); root.appendChild(shell);
    var out = el('div', { class: 'so-out' });
    right.appendChild(el('h3', { text: TXT.result }));
    right.appendChild(out);

    // --- mein Pokémon ---
    var meCard = el('section', { class: 'so-card' });
    var head = el('div', { class: 'so-head' });
    head.appendChild(el('h3', { text: TXT.me }));
    var rs = el('button', { type: 'button', class: 'so-mini', text: TXT.reset });
    rs.addEventListener('click', function () { S = defaults(); save(); render(); });
    head.appendChild(rs);
    meCard.appendChild(head);
    meCard.appendChild(monEditor(S.me, {
      hideNature: S.auto,
      onPick: function (n, src) { S.me = n; S.src = src; save(); render(); },
      onChange: function (redraw) { save(); if (redraw) render(); else update(); }
    }));
    var autoRow = el('label', { class: 'so-chk' });
    var autoCb = el('input', { type: 'checkbox' }); autoCb.checked = !!S.auto;
    autoCb.addEventListener('change', function () { S.auto = autoCb.checked; save(); render(); });
    autoRow.appendChild(autoCb); autoRow.appendChild(document.createTextNode(' ' + TXT.autoNature));
    meCard.appendChild(autoRow);
    left.appendChild(meCard);

    // --- Feld ---
    var fc = el('section', { class: 'so-card so-field' });
    fc.appendChild(el('h3', { text: TXT.field }));
    var fr = el('div', { class: 'so-row' });
    var fm = selectOf(['Doubles', 'Singles'], function (v) { return v === 'Doubles' ? TXT.doubles : TXT.singles; }, S.field.format);
    fm.addEventListener('change', function () { S.field.format = fm.value; save(); update(); });
    var fw = selectOf(['None', 'Sun', 'Rain', 'Sand', 'Snow'], function (v) { return v === 'None' ? TXT.none : (de ? { Sun: 'Sonne', Rain: 'Regen', Sand: 'Sandsturm', Snow: 'Schnee' }[v] : v); }, S.field.weather);
    fw.addEventListener('change', function () { S.field.weather = fw.value; save(); update(); });
    var ft = selectOf(['None', 'Electric', 'Grassy', 'Misty', 'Psychic'], function (v) { return v === 'None' ? TXT.none : (de ? { Electric: 'Elektro', Grassy: 'Gras', Misty: 'Nebel', Psychic: 'Psycho' }[v] : v); }, S.field.terrain);
    ft.addEventListener('change', function () { S.field.terrain = ft.value; save(); update(); });
    fr.appendChild(labeled(TXT.format, fm)); fr.appendChild(labeled(TXT.weather, fw)); fr.appendChild(labeled(TXT.terrain, ft));
    fc.appendChild(fr);
    left.appendChild(fc);

    // --- Ziele ---
    var gh = el('div', { class: 'so-head' });
    gh.appendChild(el('h3', { text: TXT.goals }));
    var adds = el('div', { class: 'so-adds' });
    [['survive', TXT.addSurvive], ['ko', TXT.addKo], ['speed', TXT.addSpeed]].forEach(function (a) {
      var b = el('button', { type: 'button', class: 'so-mini', text: a[1] });
      b.addEventListener('click', function () {
        var opp = newSpec(a[0] === 'ko' ? 'Incineroar' : 'Garchomp');
        var g = { type: a[0], opp: opp, move: '', p: 1, crit: false, hh: false, screen: false, stage: 0, mode: 'mon', value: 150, twMe: false, twThem: false };
        if (a[0] !== 'speed') g.move = a[0] === 'survive' ? (moveChoices(opp)[0] || '') : (moveChoices(S.me)[0] || '');
        S.goals.push(g); save(); render();
      });
      adds.appendChild(b);
    });
    gh.appendChild(adds);
    left.appendChild(gh);
    S.goals.forEach(function (g, gi) { left.appendChild(goalCard(g, gi)); });

    update();

    function update() { fillResult(out); }
  }

  function goalCard(g, gi) {
    var card = el('section', { class: 'so-card so-goal so-' + g.type });
    var head = el('div', { class: 'so-head' });
    head.appendChild(el('h3', { text: (g.type === 'survive' ? TXT.survive : (g.type === 'ko' ? TXT.ko : TXT.speed)) }));
    var rm = el('button', { type: 'button', class: 'so-mini', text: '✕', title: TXT.remove });
    rm.addEventListener('click', function () { S.goals.splice(gi, 1); save(); render(); });
    head.appendChild(rm);
    card.appendChild(head);
    function changed(redraw) { save(); if (redraw) render(); else refresh(); }
    function refresh() { var o = document.querySelector('#spoptView .so-out'); if (o) fillResult(o); }
    function chk(label, key) {
      var l = el('label', { class: 'so-chk' }), c = el('input', { type: 'checkbox' });
      c.checked = !!g[key]; c.addEventListener('change', function () { g[key] = c.checked; changed(); });
      l.appendChild(c); l.appendChild(document.createTextNode(' ' + label)); return l;
    }
    if (g.type === 'speed') {
      var seg = el('div', { class: 'so-seg' });
      [['mon', TXT.vsMon], ['value', TXT.vsValue]].forEach(function (m) {
        var b = el('button', { type: 'button', class: g.mode === m[0] ? 'on' : '', text: m[1] });
        b.addEventListener('click', function () { g.mode = m[0]; changed(true); });
        seg.appendChild(b);
      });
      card.appendChild(seg);
      if (g.mode === 'value') {
        var v = el('input', { type: 'number', min: 1, max: 999 }); v.value = g.value;
        v.addEventListener('input', function () { g.value = v.value; changed(); });
        card.appendChild(labeled(TXT.value, v));
      } else {
        card.appendChild(monEditor(g.opp, { sps: true, hideNature: false, onPick: function (n) { g.opp = n; changed(true); }, onChange: function (r) { changed(r); } }));
      }
      var r = el('div', { class: 'so-row' });
      r.appendChild(chk(TXT.twMe, 'twMe')); r.appendChild(chk(TXT.twThem, 'twThem'));
      card.appendChild(r);
      return card;
    }
    card.appendChild(monEditor(g.opp, {
      sps: true,
      onPick: function (n) { g.opp = n; if (g.type === 'survive') g.move = moveChoices(n)[0] || ''; changed(true); },
      onChange: function (r) { changed(r); }
    }));
    var attacker = g.type === 'survive' ? g.opp : S.me;
    var choices = moveChoices(attacker, g.move);
    var mv = selectOf(choices.length ? choices : [''], function (m) { return m ? A.nMove(m) : TXT.noMove; }, g.move || '');
    mv.addEventListener('change', function () { g.move = mv.value; changed(); });
    var pS = selectOf(P_OPTS.map(function (x) { return String(x[0]); }), function (v) { return P_OPTS.filter(function (x) { return String(x[0]) === v; })[0][1]; }, String(g.p || 1));
    pS.addEventListener('change', function () { g.p = parseFloat(pS.value); changed(); });
    var st = selectOf(['-2', '-1', '0', '1', '2', '3', '4', '6'], function (v) { return +v > 0 ? '+' + v : v; }, String(g.stage | 0));
    st.addEventListener('change', function () { g.stage = parseInt(st.value, 10); changed(); });
    var row = el('div', { class: 'so-row' });
    row.appendChild(labeled(TXT.move + (g.type === 'ko' ? ' (' + A.nSpecies(S.me.species) + ')' : ''), mv, 'so-grow'));
    row.appendChild(labeled(TXT.chance, pS)); row.appendChild(labeled(TXT.stage, st));
    card.appendChild(row);
    var opts = el('div', { class: 'so-row' });
    opts.appendChild(chk(TXT.crit, 'crit')); opts.appendChild(chk(TXT.hh, 'hh'));
    if (g.type === 'survive') opts.appendChild(chk(TXT.screen, 'screen'));
    card.appendChild(opts);
    return card;
  }

  function pct(n, d) { return (Math.round(n / d * 1000) / 10).toFixed(1).replace('.', de ? ',' : '.') + ' %'; }
  function fillResult(out) {
    out.innerHTML = '';
    var res = run();
    if (!res) { out.appendChild(el('p', { class: 'so-empty', text: TXT.nothing })); return; }
    if (!res.best) {
      out.appendChild(el('p', { class: 'so-bad', text: TXT.impossible }));
      (res.fail && res.fail.fail || []).forEach(function (g) { out.appendChild(el('p', { class: 'so-bad', text: TXT.unreachable + ': ' + goalName(g) })); });
      return;
    }
    var b = res.best, nature = b.nature, sps = b.sps;
    var total = b.total, left = SP_TOTAL - total;
    var me = mk(Object.assign({}, S.me, { nature: nature }), sps);
    var table = el('table', { class: 'so-sp' });
    STATS.forEach(function (s) {
      var tr = el('tr');
      tr.appendChild(el('th', { text: STAT_LBL[s] }));
      var bar = el('td', { class: 'so-barcell' }), fill = el('span', { class: 'so-bar' });
      fill.style.width = Math.round(sps[s] / SP_MAX * 100) + '%';
      bar.appendChild(fill); tr.appendChild(bar);
      tr.appendChild(el('td', { class: 'so-num', text: String(sps[s]) }));
      tr.appendChild(el('td', { class: 'so-stat', text: String(me.stats[s]) }));
      if (S.src && S.me.sps) tr.appendChild(el('td', { class: 'so-cur', text: String(S.me.sps[s] || 0) }));
      table.appendChild(tr);
    });
    var cap = el('div', { class: 'so-natline' });
    cap.appendChild(el('span', { class: 'so-nat', text: A.natureLabel(nature) }));
    cap.appendChild(el('span', { class: left >= 0 ? 'so-ok' : 'so-bad', text: TXT.spent + ' ' + total + ' / ' + SP_TOTAL + ' · ' + (left >= 0 ? left + ' ' + TXT.free : (-left) + ' ' + TXT.over) }));
    out.appendChild(cap);
    out.appendChild(table);
    if (S.src) out.appendChild(el('div', { class: 'so-l', text: TXT.current + ' = ' + (STATS.map(function (s) { return S.me.sps[s] || 0; }).join(' / ')) }));

    out.appendChild(el('h4', { text: TXT.checks }));
    var ul = el('ul', { class: 'so-checks' });
    S.goals.filter(usable).forEach(function (g) { ul.appendChild(checkLine(g, nature, sps)); });
    out.appendChild(ul);
    out.appendChild(el('p', { class: 'so-hint', text: TXT.hint }));

    if (S.auto && res.ok.length > 1) {
      out.appendChild(el('h4', { text: TXT.alt }));
      var al = el('div', { class: 'so-alts' });
      res.ok.slice(1, 6).forEach(function (r) {
        var chip = el('button', { type: 'button', class: 'so-chip', text: A.nNature(r.nature) + ' · ' + r.total + ' SP' });
        chip.title = STATS.map(function (s) { return STAT_LBL[s] + ' ' + r.sps[s]; }).join(' / ');
        chip.addEventListener('click', function () { S.auto = false; S.me.nature = r.nature; save(); render(); });
        al.appendChild(chip);
      });
      out.appendChild(al);
    }

    var btns = el('div', { class: 'so-btns' });
    var cp = el('button', { type: 'button', class: 'so-mini', text: TXT.copy });
    cp.addEventListener('click', function () {
      var line = STATS.filter(function (s) { return sps[s]; }).map(function (s) { return sps[s] + ' ' + STAT_SD[s]; }).join(' / ');
      A.copy('EVs: ' + line + '\n' + nature + ' Nature'); A.toast(TXT.copied);
    });
    btns.appendChild(cp);
    if (S.src && window.CCBuilder && window.CCBuilder.setSps) {
      var ap = el('button', { type: 'button', class: 'so-mini so-primary', text: TXT.apply });
      ap.addEventListener('click', function () {
        if (window.CCBuilder.setSps(S.src.teamId, S.src.idx, sps, nature)) {
          S.me.sps = Object.assign(zeroSps(), sps); S.me.nature = nature; save(); A.toast(TXT.applied); render();
        }
      });
      btns.appendChild(ap);
    }
    out.appendChild(btns);
  }
  function goalName(g) {
    if (g.type === 'speed') return TXT.speed + ' ' + (g.mode === 'value' ? g.value : A.nSpecies(g.opp.species));
    return A.nSpecies(g.opp.species) + ' · ' + (g.move ? A.nMove(g.move) : '?');
  }
  function checkLine(g, nature, sps) {
    var li = el('li'), ok, txt;
    if (g.type === 'speed') {
      var s = speedInfo(g, nature, sps);
      ok = s.mine > s.theirs;
      txt = TXT.speed + ': ' + s.mine + ' vs ' + s.theirs + ' ' + (g.mode === 'value' ? '' : '(' + A.nSpecies(g.opp.species) + ') ') + '→ ' + (s.mine > s.theirs ? TXT.faster : (s.mine === s.theirs ? TXT.tie : TXT.slower));
    } else {
      var r = g.type === 'survive' ? surviveFrac(g, nature, sps) : koFrac(g, nature, sps);
      var lo = r.r[0], hi = r.r[r.r.length - 1];
      ok = r.frac >= (g.p || 1) - 1e-9;
      txt = goalName(g) + ': ' + lo + '–' + hi + ' (' + pct(lo, r.hp) + ' – ' + pct(hi, r.hp) + ') · ' + Math.round(r.frac * 1000) / 10 + ' % ' + TXT.of + ' ' + (g.type === 'survive' ? TXT.survives : TXT.kos);
    }
    li.className = ok ? 'so-ok' : 'so-bad';
    li.textContent = (ok ? '✔ ' : '✘ ') + txt;
    return li;
  }

  window.CCSpOpt = { render: render, _solve: solve, _run: run, _goalOk: goalOk, _state: function () { return S; } };
})();

// Matchlog: Zug-Zustand. Ein neuer Zug beginnt am Befehlsmenü.
// Schaden hängt an der letzten offensiven Attacke, sobald eine KP-Anzeige sinkt.
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.CCMatchlogState = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  var Lex = typeof module === 'object' && module.exports ? require('./matchlog_lexicon') : window.CCMatchlogLex;
  var STATUS = {};
  ['protect', 'detect', 'followme', 'tailwind', 'calmmind', 'swordsdance', 'nastyplot', 'recover', 'roost',
    'substitute', 'helpinghand', 'trickroom', 'tailwind', 'spore', 'thunderwave', 'willowisp', 'taunt',
    'encore', 'quiverdance', 'shellsmash', 'dragondance', 'cottonguard', 'irondefense', 'amnesia',
    'agility', 'rockpolish', 'autotomize', 'geomancy', 'victorydance', 'coach', 'coaching', 'celebrate',
    'fakeout' // Fake Out ist offensiv; nicht hier
  ].forEach(function (k) { STATUS[k] = 1; });
  delete STATUS.fakeout;
  var SPREAD = {};
  ['earthquake', 'blizzard', 'heatwave', 'rockslide', 'dazzlinggleam', 'surf', 'muddywater', 'icywind',
    'snarl', 'hypervoice', 'makeitrain', 'bleakwindstorm', 'sandsearstorm', 'wildboltstorm', 'springtidestorm',
    'astralbarrage', 'glaciallance', 'precipiceblades', 'originpulse', 'eruption', 'waterspout', 'discharge',
    'lavaplume', 'sludgewave', 'bulldoze', 'breakingswipe', 'electroweb', 'strugglebug', 'aircutter',
    'petalblizzard', 'expandingforce', 'matchagotcha', 'clangingscales', 'paraboliccharge', 'boomburst',
    'explosion', 'selfdestruct', 'brutalswing', 'razorleaf', 'swift', 'incinerate', 'acid', 'powdersnow',
    'twister', 'diamondstorm', 'thousandarrows', 'thousandwaves', 'coreenforcer', 'overdrive', 'astralbarrage'
  ].forEach(function (k) { SPREAD[k] = 1; });
  function isSpreadMove(moveName) {
    if (!moveName) return false;
    var k = norm(moveName);
    if (SPREAD[k]) return true;
    var g = typeof window !== 'undefined' ? window : globalThis;
    var md = g && g.MOVES_CHAMPIONS && g.MOVES_CHAMPIONS[moveName];
    if (md && (md.isSpread || md.target === 'allAdjacentFoes' || md.target === 'allAdjacent')) return true;
    return false;
  }
  function pruneSingleTargetHits(mv, keepMon) {
    if (!mv || !keepMon || !mv.hits || mv.hits.length <= 1 || isSpreadMove(mv.move)) return;
    if (mv.hits.some(function (h) { return h.mon === keepMon; })) {
      mv.hits = mv.hits.filter(function (h) { return h.mon === keepMon; });
    }
  }
  var SEED_STAT = { electricseed: 'def', grassyseed: 'def', psychicseed: 'spd', mistyseed: 'spd' };

  function create() {
    return {
      scene: '', phase: 'pre', turnN: 0,
      players: { you: '', foe: '' },
      teams: { you: [], foe: [] },
      mons: {},
      leads: { you: [], foe: [] },
      slotMon: { ownA: null, ownB: null, oppA: null, oppB: null },
      base: {}, lastHp: {}, hpPending: {},
      turns: [],
      foeSeen: [],
      result: null,
      pendingChoice: null,
      choiceCount: 0,
      cmdPending: false,
      hasTimer: false,
      timerSec: null,
      turnPlayed: false,
      lastAbility: null,
      lastItem: null,
      ocr: [],
      debug: { scene: '', lastText: '' }
    };
  }
  function idOf(st, side, species, recordSeen) {
    if (!species) return '';
    if (String(species).indexOf(':') >= 0) return species;
    var id = side + ':' + species;
    if (!st.mons[id]) st.mons[id] = { id: id, species: species, side: side };
    if (recordSeen !== false && side === 'foe' && st.foeSeen.indexOf(species) < 0) st.foeSeen.push(species);
    return id;
  }
  function turn(st, n) {
    for (var i = 0; i < st.turns.length; i++) if (st.turns[i].n === n) return st.turns[i];
    var t = { n: n, choices: [], events: [] };
    st.turns.push(t);
    st.turns.sort(function (a, b) { return a.n - b.n; });
    return t;
  }
  function cur(st) { return turn(st, st.phase === 'pre' ? 0 : st.turnN); }
  function norm(s) { return Lex.normKey(s || ''); }

  function turnHasAction(t) {
    if (!t || !t.events || !t.events.length) return false;
    return t.events.some(function (e) {
      return e.kind === 'move' || e.kind === 'faint' || e.kind === 'switch' || e.kind === 'withdraw' || e.kind === 'mega';
    });
  }
  function enterCommand(st) {
    if (!st.hasTimer) {
      var prevTurn = st.turnN >= 1 ? turn(st, st.turnN) : null;
      if ((st.phase === 'play' || st.phase === 'locked') && prevTurn && turnHasAction(prevTurn)) st.turnN += 1;
      else if (st.turnN < 1) st.turnN = 1;
    } else if (st.turnN < 1) {
      st.turnN = 1;
    }
    st.phase = 'command';
    st.choiceCount = 0;
    st.pendingChoice = null;
    st.cmdPending = false;
    st.hpPending = {};
    turn(st, st.turnN);
  }
  function noteTimer(st, sec) {
    if (sec == null || isNaN(sec) || sec < 0 || sec > 900) return;
    if (!st.hasTimer) {
      st.hasTimer = true;
      st.timerSec = sec;
      if (st.turnN < 1) { st.turnN = 1; turn(st, 1); }
      if (st.phase === 'pre') st.phase = 'command';
      return;
    }
    if (sec >= st.timerSec) return;
    if (st.timerSec - sec > 120) return;
    // 7:00 (420s) ist immer Turn 1; erst wenn in diesem Turn gespielt wurde und der Timer danach weiter fällt, startet ein neuer Turn.
    if (st.turnPlayed && turnHasAction(turn(st, st.turnN)) && sec < 420) {
      st.turnN += 1;
      st.turnPlayed = false;
      st.choiceCount = 0;
      st.pendingChoice = null;
      st.hpPending = {};
      turn(st, st.turnN);
    }
    st.timerSec = sec;
  }
  function onScene(st, scene) {
    var prev = st.scene;
    if (scene === 'command' || scene === 'move_select' || scene === 'target_select') {
      if (st.phase === 'pre') {
        enterCommand(st);
      } else if (st.phase === 'play' || st.phase === 'locked') {
        if (st.cmdPending) enterCommand(st);
        else st.cmdPending = true;
      }
    } else {
      st.cmdPending = false;
      if (scene === 'communicating') {
        if (st.phase === 'command') snapshotBase(st);
        if (st.pendingChoice && st.pendingChoice.move) commitChoice(st);
        st.phase = 'locked';
      } else if (scene === 'battle' && (st.phase === 'locked' || st.phase === 'command')) {
        if (st.phase === 'command') snapshotBase(st);
        if (st.pendingChoice && st.pendingChoice.move) commitChoice(st);
        st.phase = 'play';
      }
    }
    // Zielwahl zu ist die eigene Eingabe. Zurück ins Attackenmenü ist schon das nächste Pokémon.
    if (prev === 'target_select' && scene !== 'target_select') {
      if (st.pendingChoice && st.pendingChoice.move) commitChoice(st);
    }
    st.scene = scene;
    st.debug.scene = scene;
  }
  function snapshotBase(st) {
    Object.keys(st.lastHp).forEach(function (id) { st.base[id] = Object.assign({}, st.lastHp[id]); });
  }
  function activeYou(st, index) {
    var a = st.slotMon.ownA, b = st.slotMon.ownB;
    if (index === 0) return a || (st.leads.you[0] || '');
    return b || (st.leads.you[1] || '');
  }
  function slotSpecies(st, slot) {
    var id = st.slotMon[slot];
    return id && st.mons[id] ? st.mons[id].species : '';
  }
  function commitChoice(st) {
    var p = st.pendingChoice;
    if (!p || !p.move) { st.pendingChoice = null; return; }
    var slotIdx = Math.min(1, st.choiceCount);
    var mon = activeYou(st, slotIdx);
    var target = '';
    if (p.targetSlot && st.slotMon[p.targetSlot]) target = st.slotMon[p.targetSlot];
    var c = { mon: mon, move: p.move, target: target, mega: !!p.mega, action: 'move' };
    var list = turn(st, st.turnN || 1).choices;
    var replaced = false;
    if (mon) {
      for (var i = 0; i < list.length; i++) {
        if (list[i].mon === mon) { list[i] = c; replaced = true; break; }
      }
    }
    if (!replaced) {
      if (list.length < 2) list.push(c);
      else list[slotIdx] = c;
    }
    st.choiceCount = Math.min(2, st.choiceCount + 1);
    st.pendingChoice = null;
  }
  function noteChoice(st, patch) {
    if (st.phase === 'pre') { st.turnN = 1; st.phase = 'command'; }
    if (!st.pendingChoice) st.pendingChoice = {};
    Object.keys(patch).forEach(function (k) { if (patch[k] != null && patch[k] !== '') st.pendingChoice[k] = patch[k]; });
  }

  function isDead(st, id) {
    var h = id ? st.lastHp[id] : null;
    return !!(h && (h.cur === 0 || h.pct === 0));
  }
  function replaceSlot(st, side, fromId, toId) {
    if (!toId) return;
    var a = side === 'you' ? 'ownA' : 'oppA';
    var b = side === 'you' ? 'ownB' : 'oppB';
    if (fromId && st.slotMon[a] === fromId) { st.slotMon[a] = toId; return; }
    if (fromId && st.slotMon[b] === fromId) { st.slotMon[b] = toId; return; }
    rememberSlots(st, side, [toId]);
  }
  function rememberSlots(st, side, mons) {
    if (!mons || !mons.length) return;
    if (side === 'you') {
      if (mons.length === 1 && mons[0]) {
        if (st.slotMon.ownA !== mons[0] && st.slotMon.ownB !== mons[0]) {
          if ((!st.slotMon.ownB || isDead(st, st.slotMon.ownB)) && st.slotMon.ownA && !isDead(st, st.slotMon.ownA)) st.slotMon.ownB = mons[0];
          else if ((!st.slotMon.ownA || isDead(st, st.slotMon.ownA)) && st.slotMon.ownB && !isDead(st, st.slotMon.ownB)) st.slotMon.ownA = mons[0];
          else if (!st.slotMon.ownA) st.slotMon.ownA = mons[0];
          else st.slotMon.ownB = mons[0];
        }
      } else {
        if (mons[0]) st.slotMon.ownA = mons[0];
        if (mons[1]) st.slotMon.ownB = mons[1];
      }
      if (st.leads.you.length < 2) {
        mons.forEach(function (id) { if (id && st.leads.you.length < 2 && st.leads.you.indexOf(id) < 0) st.leads.you.push(id); });
      }
    } else {
      if (mons.length === 1 && mons[0]) {
        if (st.slotMon.oppA !== mons[0] && st.slotMon.oppB !== mons[0]) {
          if ((!st.slotMon.oppA || isDead(st, st.slotMon.oppA)) && st.slotMon.oppB && !isDead(st, st.slotMon.oppB)) st.slotMon.oppA = mons[0];
          else if ((!st.slotMon.oppB || isDead(st, st.slotMon.oppB)) && st.slotMon.oppA && !isDead(st, st.slotMon.oppA)) st.slotMon.oppB = mons[0];
          else if (!st.slotMon.oppB) st.slotMon.oppB = mons[0];
          else st.slotMon.oppA = mons[0];
        }
      } else {
        if (mons[0]) st.slotMon.oppB = mons[0];
        if (mons[1]) st.slotMon.oppA = mons[1];
      }
      if (st.leads.foe.length < 2 && st.turnN <= 2) {
        mons.forEach(function (id) { if (id && st.leads.foe.length < 2 && st.leads.foe.indexOf(id) < 0) st.leads.foe.push(id); });
      }
    }
  }
  function sameEvent(a, b) {
    if (!a || !b || a.kind !== b.kind) return false;
    if (a.kind === 'effectiveness') return (a.value || '') === (b.value || '') && (!a.mon || !b.mon || a.mon === b.mon);
    if (a.kind === 'mega' && (a.side || '') === (b.side || '')) return true;
    if (a.kind === 'send_out') return (a.mons || []).slice().sort().join() === (b.mons || []).slice().sort().join();
    if ((a.field || '') !== (b.field || '')) return false;
    if ((a.kind === 'field' || a.kind === 'field_end') && (a.side || '') !== (b.side || '')) return false;
    if ((a.mon || '') !== (b.mon || '') && a.mon && b.mon) return false;
    if ((a.move || '') !== (b.move || '')) return false;
    if ((a.ability || '') !== (b.ability || '')) return false;
    if ((a.item || '') !== (b.item || '')) return false;
    if (a.kind === 'boost' && a.stat !== b.stat) return false;
    return true;
  }
  function teamItemOf(st, monIdOrSpecies) {
    var sp = st.mons[monIdOrSpecies] ? st.mons[monIdOrSpecies].species : String(monIdOrSpecies || '').replace(/^[^:]+:/, '');
    var k = norm(sp);
    for (var i = 0; i < st.teams.you.length; i++) {
      if (norm(st.teams.you[i].species) === k && st.teams.you[i].item) return st.teams.you[i].item;
    }
    return '';
  }
  function refine(st, ev) {
    var surge = {
      electricsurge: 'Electric Terrain', grassysurge: 'Grassy Terrain', mistysurge: 'Misty Terrain', psychicsurge: 'Psychic Terrain',
      snowwarning: 'Snow', drizzle: 'Rain', drought: 'Sun', sandstream: 'Sandstorm'
    };
    if (ev.kind === 'ability' && !ev.field && surge[norm(ev.ability || '')]) ev.field = surge[norm(ev.ability)];
    if (ev.kind === 'mega' && /^Mega (Raichu|Charizard|Mewtwo)(?: [XY])?$/i.test(ev.into || '') && !/ [xy]\b/i.test(ev.line || '')) {
      var stone = (ev.side === 'you' ? teamItemOf(st, ev.mon) : '') || st.lastItem || '';
      if (/ite x\b/i.test(stone)) ev.into = ev.into.replace(/ [XY]$/, '') + ' X';
      else if (/ite y\b/i.test(stone)) ev.into = ev.into.replace(/ [XY]$/, '') + ' Y';
    }
    if (ev.kind === 'boost' && !ev.stat) {
      if (st.lastAbility && norm(st.lastAbility) === 'speedboost') ev.stat = 'spe';
      if (st.lastItem && SEED_STAT[norm(st.lastItem)]) ev.stat = SEED_STAT[norm(st.lastItem)];
      if (!ev.stages) ev.stages = 1;
    }
    if (ev.kind === 'boost' && ev.stat === 'spe' && (!ev.stages || ev.stages < 0) && st.lastAbility && norm(st.lastAbility) === 'speedboost') ev.stages = 1;
    return ev;
  }
  function pushEvent(st, ev, t) {
    if (!ev) return;
    ev = refine(st, ev);
    ev.t = t;
    if (ev.kind === 'mega_react' && ev.item) st.lastItem = ev.item;
    if (ev.foeName) {
      if (!st.players) st.players = { you: '', foe: '' };
      if (!st.players.foe || ev.kind === 'result' || ev.foeName.length > st.players.foe.length) {
        st.players.foe = ev.foeName;
      }
    }
    var isLeadPhase = st.phase === 'pre' || st.turnN === 0 || (st.turnN === 1 && !turnHasAction(turn(st, 1)) && ev.kind === 'send_out' && st.leads[ev.side || 'you'].length < 2);
    var bucket = (isLeadPhase && ev.kind === 'send_out') ? turn(st, 0) : cur(st);
    var last = bucket.events[bucket.events.length - 1];
    if (ev.kind === 'result' && st.result) {
      if (ev.winner && !st.result.winner) st.result.winner = ev.winner;
      if (ev.reason && st.result.reason === 'ko') st.result.reason = ev.reason;
      if (last && last.kind === 'result') return;
    }
    if (sameEvent(last, ev)) {
      if (!last.mon && ev.mon) { last.mon = ev.mon; if (ev.side) last.side = ev.side; }
      if (last.kind === 'mega_react' && !last.item && ev.item) last.item = ev.item;
      return;
    }
    if (st.lastEvent && st.lastEvent !== last && st.lastEvent.t != null && t != null && Math.abs(t - st.lastEvent.t) <= 4 && sameEvent(st.lastEvent, ev)) {
      return;
    }
    if (ev.kind === 'move') {
      var prevMv = null;
      for (var mi = bucket.events.length - 1; mi >= 0; mi--) {
        if (bucket.events[mi].kind === 'move') { prevMv = bucket.events[mi]; break; }
      }
      if (prevMv && prevMv.t != null && t != null && Math.abs(t - prevMv.t) <= 3.0) {
        if (prevMv.mon === ev.mon && prevMv.move && ev.move && (ev.move.indexOf(prevMv.move) === 0 || prevMv.move.indexOf(ev.move) === 0)) {
          if (ev.move.length > prevMv.move.length) prevMv.move = ev.move;
          return;
        }
        if (prevMv.mon && prevMv.mon === ev.mon && prevMv.move === ev.move) return;
        if (prevMv.mon && prevMv.mon === ev.mon && Math.abs(t - prevMv.t) <= 2.5) return;
        var evOnField = ev.mon && (ev.mon === st.slotMon.ownA || ev.mon === st.slotMon.ownB || ev.mon === st.slotMon.oppA || ev.mon === st.slotMon.oppB);
        if (prevMv.move === ev.move && (prevMv.side === ev.side || !evOnField || (st.teams.you.length >= 4 && ev.side === 'you' && !inYouTeam(st, ev.mon)))) return;
      }
    }
    if (ev.kind === 'field' && last && last.kind === 'move' && norm(last.move) === norm(ev.field)) {
      return;
    }
    if (ev.kind === 'boost' && last && (last.kind === 'ability' || last.kind === 'item') && (last.mon === ev.mon || !ev.mon)) {
      last.boost = { stat: ev.stat, stages: ev.stages };
      return;
    }
    if (ev.kind === 'field' && last && last.kind === 'ability' && /surge|erzeuger|warning|drizzle|drought|sandstream/i.test(last.ability || '')) {
      last.field = ev.field;
      return;
    }
    if ((ev.kind === 'protect' || (ev.kind === 'effectiveness' && ev.value === 'immune')) && bucket.events.length) {
      var mv = latestMove(st);
      if (mv) {
        mv.outcomes = mv.outcomes || [];
        var kindOut = ev.kind === 'protect' ? 'protected' : 'immune';
        if (!mv.outcomes.some(function (o) { return o.mon === ev.mon && o.kind === kindOut; })) {
          mv.outcomes.push({ mon: ev.mon, kind: kindOut });
        }
        return;
      }
    }
    if (ev.kind === 'send_out' && ev.side === 'you' && st.leads.you.length && ev.mons && ev.mons.length) {
      var allOnField = ev.mons.every(function (id) { return id === st.slotMon.ownA || id === st.slotMon.ownB; });
      if (allOnField) return;
    }
    if (ev.kind === 'send_out' && ev.side === 'you' && ev.mons) {
      ev.mons.forEach(function (id) {
        var sp = st.mons[id] ? st.mons[id].species : '';
        for (var j = 0; j < st.teams.you.length; j++) {
          if (norm(st.teams.you[j].species) === norm(sp)) st.teams.you[j].brought = true;
        }
      });
    }
    if (ev.kind === 'send_out' && last && last.kind === 'switch' && last.side === ev.side && ev.mons && ev.mons.length === 1 && ev.mons[0] === last.mon) {
      return;
    }
    if (ev.kind === 'send_out' && last && last.kind === 'withdraw' && last.side === ev.side && ev.mons && ev.mons.length === 1) {
      replaceSlot(st, ev.side, last.mon, ev.mons[0]);
      var sw = { kind: 'switch', side: ev.side, from: last.mon, mon: ev.mons[0], t: t };
      bucket.events[bucket.events.length - 1] = sw;
      st.lastEvent = sw;
      return;
    }
    if (ev.kind === 'forfeit') {
      var fw = ev.side === 'you' ? 'foe' : (ev.side === 'foe' ? 'you' : '');
      st.result = { winner: fw || (st.result && st.result.winner) || '', reason: 'forfeit', t: t };
    }
    if (ev.kind === 'result') st.result = { winner: ev.winner || (st.result && st.result.winner) || '', reason: (st.result && st.result.reason) || 'ko', t: t };
    if (ev.kind === 'send_out' && ev.mons) {
      var mapped = ev.mons.map(function (sp) { return idOf(st, ev.side, sp); });
      rememberSlots(st, ev.side, mapped);
      mapped.forEach(function (id) {
        if (ev.side === 'foe' && (!st.lastHp[id] || isDead(st, id))) {
          st.lastHp[id] = { pct: 100 };
          st.base[id] = { pct: 100 };
        }
        delete st.hpPending[id];
      });
    }
    if (ev.mon && (ev.side === 'foe' || ev.side === 'you') && (ev.kind === 'mega' || ev.kind === 'move' || ev.kind === 'ability' || ev.kind === 'protect' || ev.kind === 'flinch' || ev.kind === 'faint')) {
      var aKey = ev.side === 'you' ? 'ownA' : 'oppA';
      var bKey = ev.side === 'you' ? 'ownB' : 'oppB';
      if (st.slotMon[aKey] !== ev.mon && st.slotMon[bKey] !== ev.mon) {
        if ((!st.slotMon[aKey] || isDead(st, st.slotMon[aKey])) && st.slotMon[bKey] && !isDead(st, st.slotMon[bKey])) st.slotMon[aKey] = ev.mon;
        else if ((!st.slotMon[bKey] || isDead(st, st.slotMon[bKey])) && st.slotMon[aKey] && !isDead(st, st.slotMon[aKey])) st.slotMon[bKey] = ev.mon;
      }
      if (ev.side === 'foe' && st.leads.foe.length < 2 && st.turnN <= 1 && st.leads.foe.indexOf(ev.mon) < 0) {
        st.leads.foe.push(ev.mon);
      }
    }
    if (ev.kind === 'item' && ev.mon && norm(ev.item) === 'focussash') {
      var sashPrev = st.base[ev.mon] || st.lastHp[ev.mon];
      if (sashPrev && sashPrev.max) {
        var oneHp = { cur: 1, max: sashPrev.max, pct: 1 };
        recordHit(st, ev.mon, Object.assign({}, sashPrev), oneHp, false);
        var sashMv = latestMove(st);
        if (sashMv && sashMv.hits) {
          sashMv.hits.forEach(function (h) { if (h.mon === ev.mon) { h.after = Object.assign({}, oneHp); h.sash = true; } });
        }
        st.lastHp[ev.mon] = Object.assign({}, oneHp);
        st.base[ev.mon] = Object.assign({}, oneHp);
      }
    }
    if (ev.kind === 'effectiveness' && ev.mon && ev.value !== 'immune') {
      pruneSingleTargetHits(latestMove(st), ev.mon);
    }
    if (ev.kind === 'faint' && ev.mon) {
      var id = idOf(st, ev.side || 'foe', ev.mon);
      var prevHp = st.base[id] || st.lastHp[id] || null;
      var zero = ev.side === 'you'
        ? (prevHp && prevHp.max ? { cur: 0, max: prevHp.max, pct: 0 } : { cur: 0, pct: 0 })
        : { pct: 0 };
      var beforeHp = prevHp ? Object.assign({}, prevHp) : (ev.side === 'you' ? null : { pct: 100 });
      if (beforeHp && (beforeHp.cur == null || beforeHp.cur > 0) && (beforeHp.pct == null || beforeHp.pct > 0)) {
        recordHit(st, id, beforeHp, zero, true);
      }
      pruneSingleTargetHits(latestMove(st), id);
      st.lastHp[id] = Object.assign({}, st.lastHp[id], zero);
      st.base[id] = Object.assign({}, st.lastHp[id]);
      delete st.hpPending[id];
      if (st.slotMon.ownA === id) st.slotMon.ownA = null;
      else if (st.slotMon.ownB === id) st.slotMon.ownB = null;
      else if (st.slotMon.oppA === id) st.slotMon.oppA = null;
      else if (st.slotMon.oppB === id) st.slotMon.oppB = null;
    }
    if (ev.kind === 'ability') st.lastAbility = ev.ability;
    if (ev.kind === 'item') st.lastItem = ev.item;
    if (ev.side === 'foe' && ev.mon && st.mons[ev.mon]) {
      var fsp = st.mons[ev.mon].species;
      if (fsp && st.foeSeen.indexOf(fsp) < 0) st.foeSeen.push(fsp);
    }
    if (bucket.n >= 1 && (ev.kind === 'move' || ev.kind === 'faint' || ev.kind === 'switch' || ev.kind === 'withdraw' || ev.kind === 'mega')) st.turnPlayed = true;
    bucket.events.push(ev);
    st.lastEvent = ev;
  }

  function matchYouTeam(st, species) {
    if (!species) return '';
    var k = norm(species);
    for (var i = 0; i < st.teams.you.length; i++) {
      if (norm(st.teams.you[i].species) === k) return st.teams.you[i].species;
    }
    var base = String(species).replace(/-(F|M|Hisui|Alola|Galar)$/i, '');
    if (base !== species) {
      var bk = norm(base);
      for (var j = 0; j < st.teams.you.length; j++) {
        if (norm(st.teams.you[j].species) === bk) return st.teams.you[j].species;
      }
    }
    return '';
  }
  function inYouTeam(st, species) {
    return !!matchYouTeam(st, species);
  }
  function noteText(st, kind, text, parsed, t) {
    st.debug.lastText = text || st.debug.lastText;
    st.ocr.push({ t: t, kind: kind, text: text });
    if (st.ocr.length > 80) st.ocr.shift();
    if (!parsed) return;
    if (parsed.kind === 'team_mon' || parsed.kind === 'team_item' || parsed.kind === 'choice_move') return;
    if (parsed.kind === 'withdraw' && !parsed.side) {
      parsed.side = inYouTeam(st, parsed.mon) ? 'you' : 'foe';
    } else if (parsed.mon && st.teams.you.length >= 4 && parsed.side === 'you' && !inYouTeam(st, parsed.mon) && (st.teams.you.length >= 6 || st.foeSeen.indexOf(parsed.mon) >= 0)) {
      parsed.side = 'foe';
    }
    if (parsed.side === 'you' && st.teams.you.length >= 4) {
      if (parsed.mon) {
        var ym = matchYouTeam(st, parsed.mon);
        if (ym) parsed.mon = ym;
      }
      if (parsed.kind === 'send_out' && parsed.mons && parsed.mons.length) {
        var filtered = parsed.mons.map(function (sp) { return matchYouTeam(st, sp); }).filter(Boolean);
        if (filtered.length) parsed.mons = filtered;
      }
    }
    if (parsed.mon) parsed.mon = idOf(st, parsed.side || 'you', parsed.mon, parsed.kind !== 'move');
    if (parsed.mons) parsed.mons = parsed.mons.map(function (sp) { return idOf(st, parsed.side || 'foe', sp); });
    pushEvent(st, parsed, t);
  }
  function noteTeamRow(st, index, species, item) {
    while (st.teams.you.length <= index) st.teams.you.push({ species: '', item: '', brought: false, order: 0 });
    var row = st.teams.you[index];
    if (species) row.species = species;
    if (item) row.item = item;
    if (species) idOf(st, 'you', species);
  }
  function noteBrought(st, index, order) {
    while (st.teams.you.length <= index) st.teams.you.push({ species: '', item: '', brought: false, order: 0 });
    if (order >= 1 && order <= 4) {
      st.teams.you[index].brought = true;
      st.teams.you[index].order = order;
    }
  }
  function noteFoeSpecies(st, species) {
    if (!species) return '';
    if (st.teams.you.length >= 4 && inYouTeam(st, species)) return '';
    return idOf(st, 'foe', species);
  }
  function notePlateMon(st, slot, species, t) {
    if (!species || !slot) return '';
    var isOwn = slot === 'ownA' || slot === 'ownB';
    var side = isOwn ? 'you' : 'foe';
    if (isOwn) {
      if (st.teams.you.length >= 4) {
        var ym = matchYouTeam(st, species);
        if (!ym) return '';
        species = ym;
      }
    } else {
      if (st.teams.you.length >= 4 && inYouTeam(st, species)) return '';
    }
    var id = idOf(st, side, species);
    var other = slot === 'ownA' ? 'ownB' : slot === 'ownB' ? 'ownA' : slot === 'oppA' ? 'oppB' : 'oppA';
    if (st.slotMon[slot] === id || st.slotMon[other] === id) return id;
    var oldId = st.slotMon[slot];
    st.slotMon[slot] = id;
    if (isOwn) {
      for (var j = 0; j < st.teams.you.length; j++) {
        if (norm(st.teams.you[j].species) === norm(species)) st.teams.you[j].brought = true;
      }
    }
    var leadList = st.leads[side];
    if (leadList.length < 2 && st.turnN <= 1 && !turnHasAction(turn(st, 1))) {
      if (leadList.indexOf(id) < 0) leadList.push(id);
      return id;
    }
    if (!oldId && st.turnN <= 1 && leadList.indexOf(id) >= 0) {
      var hadFaintOrSwitch = cur(st).events.some(function (e) { return e.kind === 'faint' || e.kind === 'switch' || e.kind === 'withdraw'; });
      if (!hadFaintOrSwitch) return id;
    }
    if (st.turnN >= 1 && (st.turnPlayed || !oldId || isDead(st, oldId))) {
      var evs = cur(st).events;
      var recent = evs.slice(-4).some(function (e) {
        if (e.kind === 'switch' && e.mon === id) return true;
        if (e.kind === 'send_out' && e.mons && e.mons.indexOf(id) >= 0) return true;
        return false;
      });
      if (!recent) {
        pushEvent(st, { kind: 'send_out', side: side, mons: [id], fromHud: true, line: 'HUD: ' + species }, t);
      }
    }
    return id;
  }

  function sameHp(a, b) {
    if (!a || !b) return false;
    if (a.cur != null || b.cur != null) return a.cur === b.cur && a.max === b.max;
    return a.pct === b.pct;
  }
  function hpLower(a, b) {
    if (!a || !b) return false;
    if (a.cur != null && b.cur != null) return b.cur < a.cur;
    if (a.pct != null && b.pct != null) return b.pct < a.pct;
    return false;
  }
  function isDamaged(v) {
    if (!v) return false;
    if (v.cur != null && v.max != null) return v.cur < v.max;
    if (v.pct != null) return v.pct < 100;
    return false;
  }
  function fullHpOf(v) {
    if (v && v.max != null) return { cur: v.max, max: v.max, pct: 100 };
    return { pct: 100 };
  }
  function damaging(ev) {
    if (!ev || ev.kind !== 'move' || !ev.move) return false;
    return !STATUS[norm(ev.move)];
  }
  function latestMove(st) {
    var evs = cur(st).events;
    for (var i = evs.length - 1; i >= 0; i--) {
      if (evs[i].kind === 'move') return damaging(evs[i]) ? evs[i] : null;
    }
    if (st.turnN > 1) {
      var prevEvs = turn(st, st.turnN - 1).events;
      for (var j = prevEvs.length - 1; j >= 0; j--) {
        if (prevEvs[j].kind === 'move') return damaging(prevEvs[j]) ? prevEvs[j] : null;
      }
    }
    return null;
  }
  function recordHit(st, id, before, after, isKo) {
    var evs = cur(st).events;
    var tail = evs.length ? evs[evs.length - 1] : null;
    if (tail && tail.kind === 'recoil' && tail.mon === id) {
      tail.hit = tail.hit || { mon: id, before: Object.assign({}, before), after: Object.assign({}, after), ko: !!(isKo || after.pct === 0 || after.cur === 0) };
      if (hpLower(tail.hit.after, after)) tail.hit.after = Object.assign({}, after);
      if (isKo || after.pct === 0 || after.cur === 0) tail.hit.ko = true;
      return;
    }
    var mv = latestMove(st);
    if (!mv) return;
    if (mv.mon && mv.mon === id) return;
    if (mv.outcomes && mv.outcomes.some(function (o) { return o.mon === id && (o.kind === 'protected' || o.kind === 'immune'); })) return;
    mv.hits = mv.hits || [];
    var hit = null;
    for (var i = 0; i < mv.hits.length; i++) if (mv.hits[i].mon === id) hit = mv.hits[i];
    if (!hit) {
      mv.hits.push({ mon: id, before: Object.assign({}, before), after: Object.assign({}, after), ko: !!(isKo || after.pct === 0 || after.cur === 0) });
    } else {
      if (isKo || after.pct === 0 || after.cur === 0) hit.ko = true;
      if (hpLower(hit.after, after)) hit.after = Object.assign({}, after);
    }
  }
  function reconcileHit(st, id, v) {
    var mv = latestMove(st);
    if (!mv || !mv.hits || !mv.hits.length) return;
    for (var i = mv.hits.length - 1; i >= 0; i--) {
      var h = mv.hits[i];
      if (h.mon !== id || h.ko || h.sash) continue;
      if (hpLower(v, h.after)) {
        if (hpLower(h.before, v)) {
          h.after = Object.assign({}, v);
        } else {
          mv.hits.splice(i, 1);
        }
      }
    }
  }
  function noteHp(st, read) {
    if (!read || !read.slots) return;
    var authoritative = st.scene === 'command' || st.scene === 'switch_menu' || st.scene === 'communicating';
    Object.keys(read.slots).forEach(function (slot) {
      var r = read.slots[slot];
      if (!r || !r.value) return;
      var id = st.slotMon[slot];
      if (!id) return;
      var v = r.value;
      var prev = st.lastHp[id];
      if (prev && isDead(st, id)) return;
      if (prev && prev.max && v.max && prev.max !== v.max) return;
      if (authoritative) {
        delete st.hpPending[id];
        reconcileHit(st, id, v);
        var ref = st.base[id] || prev;
        if (ref && hpLower(ref, v)) {
          recordHit(st, id, Object.assign({}, ref), Object.assign({}, v), false);
        } else if (!ref && isDamaged(v) && latestMove(st)) {
          recordHit(st, id, fullHpOf(v), Object.assign({}, v), false);
        }
        st.base[id] = Object.assign({}, v);
        st.lastHp[id] = Object.assign({}, v);
        return;
      }
      var pend = st.hpPending[id];
      if (pend && sameHp(pend.v, v)) pend.count += 1;
      else st.hpPending[id] = pend = { v: Object.assign({}, v), count: 1 };

      var need = (prev && hpLower(v, prev)) ? 3 : (!prev && !isDamaged(v) ? 1 : 2);
      if (pend.count < need) return;

      var baseRef = st.base[id] || prev;
      if (baseRef && hpLower(baseRef, v)) {
        recordHit(st, id, Object.assign({}, baseRef), Object.assign({}, v), false);
        st.base[id] = Object.assign({}, v);
      } else if (!baseRef && isDamaged(v) && latestMove(st)) {
        recordHit(st, id, fullHpOf(v), Object.assign({}, v), false);
        st.base[id] = Object.assign({}, v);
      }
      st.lastHp[id] = Object.assign({}, st.lastHp[id], v);
      if (!st.base[id]) st.base[id] = Object.assign({}, v);
    });
  }

  function exportSnap(st) {
    var mons = {};
    Object.keys(st.mons).forEach(function (k) { mons[k] = { id: k, species: st.mons[k].species, side: st.mons[k].side }; });
    return {
      kind: 'rattata-matchlog', v: 1, game: 'champions', format: 'doubles',
      players: Object.assign({}, st.players),
      teams: st.teams,
      mons: mons,
      leads: st.leads,
      foeSeen: st.foeSeen.slice(),
      turns: st.turns.map(function (t) {
        return { n: t.n, choices: t.choices.map(function (c) { return Object.assign({}, c); }), events: t.events.map(copyEv) };
      }),
      result: st.result ? Object.assign({}, st.result) : null,
      hp: JSON.parse(JSON.stringify(st.lastHp))
    };
  }
  function copyEv(ev) {
    var o = {};
    Object.keys(ev).forEach(function (k) { o[k] = ev[k]; });
    if (ev.hits) o.hits = ev.hits.map(function (h) { return JSON.parse(JSON.stringify(h)); });
    if (ev.outcomes) o.outcomes = ev.outcomes.map(function (x) { return Object.assign({}, x); });
    if (ev.boost) o.boost = Object.assign({}, ev.boost);
    return o;
  }
  return {
    create: create, onScene: onScene, noteText: noteText, noteHp: noteHp, noteTimer: noteTimer, noteChoice: noteChoice,
    noteTeamRow: noteTeamRow, noteBrought: noteBrought, noteFoeSpecies: noteFoeSpecies, notePlateMon: notePlateMon,
    exportSnap: exportSnap, idOf: idOf, slotSpecies: slotSpecies
  };
});

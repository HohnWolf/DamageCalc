// Matchlog: Kampftext (Englisch, und soweit bekannt Deutsch) -> Ereignisse.
// Die Muster sind absichtlich grob; Arten und Attacken kommen aus dem Lexikon.
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.CCMatchlogParse = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  function lexApi() {
    if (typeof window !== 'undefined' && window.CCMatchlogLex) return window.CCMatchlogLex;
    return require('./matchlog_lexicon');
  }
  function flat(s) {
    return String(s || '').replace(/\s+/g, ' ').trim();
  }
  function low(s) {
    return flat(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ß/g, 'ss');
  }
  function opposing(s) {
    return /oppos|\bopp[a-z .]{1,5}(?:ing|tng)\b|(?:\b|[^a-z])p?posing\b|gegn/.test(s);
  }
  function fieldEnded(s) {
    return /[a-z]etered|peter|wore\s*off|ended|subsided|faded|disappeared|stopped|\bout\b|returned to normal|normalisiert|nachgelass|vorbei|abgeklung|aufgehort|verflogen|endet/.test(s);
  }
  function oneMove(text, lex) {
    var L = lexApi();
    var hit = L.best(text, lex.moves);
    return hit ? hit.entry.en : '';
  }
  function speciesHits(text, lex) {
    return lexApi().allSpecies(text, lex);
  }
  function oneMon(text, lex) {
    var hits = speciesHits(text, lex);
    if (!hits.length) return '';
    // längster starker Treffer, Mega vor Basis
    hits.sort(function (a, b) { return b.score - a.score || a.entry.key.length - b.entry.key.length; });
    return hits[0].entry.en;
  }

  var STATS = [
    { id: 'spd', re: /sp\.?\s*def|spdef|spezial-?vert|\bspv\b|sp ef|spef/ },
    { id: 'spa', re: /sp\.?\s*atk|spatk|spezial-?ang|\bspa\b/ },
    { id: 'spe', re: /\bspeed\b|initia|\btempo\b/ },
    { id: 'def', re: /defen|defens|\bvert/ },
    { id: 'atk', re: /\battack|\bangrif|\batk\b/ },
    { id: 'acc', re: /accura|genau/ },
    { id: 'eva', re: /evas|fluchtwert/ }
  ];
  function boostOf(s) {
    var up = /rose|stieg|steigt|erhoeh/.test(s);
    var down = /fell|sink|sank|gesunk|fiel/.test(s);
    if (!up && !down && /harsh|ose\b|rose/.test(s) === false) {
      if (!/rose|fell|stieg|sink|sank|ose/.test(s)) return null;
    }
    up = /rose|stieg|steigt|erhoeh|ose/.test(s);
    down = /fell|sink|sank|gesunk|fiel/.test(s);
    if (!up && !down) return null;
    var stat = '';
    for (var i = 0; i < STATS.length; i++) if (STATS[i].re.test(s)) { stat = STATS[i].id; break; }
    var stages = 1;
    if (/harsh|drast|stark|sharply|sharp|sever|deutlich/.test(s)) stages = /drast|sever/.test(s) ? 3 : 2;
    if (down && !up) stages = -stages;
    else if (down && up) stages = /fell|sink|sank/.test(s) ? -stages : stages;
    return { stat: stat, stages: stages };
  }

  function cleanPlayerName(s) {
    var t = flat(s).replace(/^[^a-zA-Z0-9_]+|[^a-zA-Z0-9_]+$/g, '');
    if (t.length < 2 || t.length > 24) return '';
    if (/^(?:the|opposing|you|your|foe|enemy|go|gol|los)$/i.test(t)) return '';
    return t;
  }
  function parse(text, lex, hint) {
    var raw = flat(text);
    var s = low(raw);
    if (!s || s.length < 3) return null;
    hint = hint || '';
    var mon = oneMon(raw, lex);
    var mons = speciesHits(raw, lex).map(function (h) { return h.entry.en; });

    if (/forfeit|aufgabe|gibt auf|hat aufgegeben/.test(s)) {
      return { kind: 'forfeit', side: /\byou\b|\bdu\b|\bdein\b/.test(s) ? 'you' : opposing(s) ? 'foe' : '', line: raw };
    }
    if (/you defeated|du hast .*besiegt|you win|gewonnen/.test(s) && !/fainted|wurde besiegt/.test(s.slice(0, 24))) {
      var mw = raw.match(/(?:you defeated|du hast)\s+([^!.\n]+)/i);
      return { kind: 'result', winner: 'you', foeName: mw ? cleanPlayerName(mw[1].replace(/\s+besiegt$/i, '')) : '', line: raw };
    }
    if (/you lost|you were defeated|verloren|wurde besiegt von/.test(s)) {
      var ml = raw.match(/(?:lost to|defeated by|besiegt von)\s+([^!.\n]+)/i);
      return { kind: 'result', winner: 'foe', foeName: ml ? cleanPlayerName(ml[1]) : '', line: raw };
    }
    if (/flinch|zuruckgeschreck|zurueckgeschreck|konnte nicht angreifen|couldn.?t move/.test(s)) {
      return { kind: 'flinch', mon: mon, side: opposing(s) ? 'foe' : 'you', line: raw };
    }
    if (/fainted|finted|wurde besiegt|hat keine kraft mehr|is unable to battle/.test(s)) {
      return { kind: 'faint', mon: mon, side: opposing(s) ? 'foe' : 'you', line: raw };
    }
    if (/mega evolv|mega-entwick|megawandelt|hat sich zu mega/.test(s)) {
      var megas = mons.filter(function (n) { return /^mega /i.test(n); });
      var bases = mons.filter(function (n) { return !/^mega /i.test(n); });
      var into = '';
      if (megas.length) into = megas.slice().sort(function (a, b) { return b.length - a.length; })[0];
      if (into && !/\bx\b/.test(s) && !/\by\b/.test(s)) into = into.replace(/ [XY]$/, '');
      var actor = bases[0] || (into ? into.replace(/^Mega /, '').replace(/ [XY]$/, '') : mon);
      return { kind: 'mega', mon: actor, into: into || actor, side: opposing(s) ? 'foe' : 'you', line: raw };
    }
    if (/reacting|omni ring|reagiert/.test(s)) {
      var item = lexApi().best(raw, lex.items);
      return { kind: 'mega_react', mon: mon, item: item ? item.entry.en : '', side: opposing(s) ? 'foe' : 'you', line: raw };
    }
    if (/center of attention|im mittelpunkt|steht im fokus/.test(s)) {
      return { kind: 'center', mon: mon, side: opposing(s) ? 'foe' : 'you', line: raw };
    }
    if (/protected itself|hat sich selbst geschutzt|schutzt sich/.test(s)) {
      return { kind: 'protect', mon: mon, side: opposing(s) ? 'foe' : 'you', line: raw };
    }
    if (/knocked off|abgeschlagen|entrissen/.test(s)) {
      var kItem = lexApi().best(raw, lex.items);
      var kMon = mons.length > 1 ? mons[1] : mon;
      var afterOff = s.replace(/^.*?(?:knocked off|abgeschlagen|entrissen)/, '');
      var kSide = opposing(afterOff) ? 'foe' : (mons.length > 1 && opposing(s) ? 'you' : (opposing(s) ? 'foe' : 'you'));
      return { kind: 'knock_off', mon: kMon, item: kItem ? kItem.entry.en : '', side: kSide, line: raw };
    }
    if (/damaged by (?:the )?recoil|durch ruckstoss|ruckstossschaden/.test(s)) {
      return { kind: 'recoil', mon: mon, side: opposing(s) ? 'foe' : 'you', line: raw };
    }
    if (/hung on using its|hielt mithilfe seines/.test(s)) {
      var hItem = lexApi().best(raw, lex.items);
      return { kind: 'item', mon: mon, item: hItem ? hItem.entry.en : 'Focus Sash', side: opposing(s) ? 'foe' : 'you', line: raw };
    }
    if (/super effective|sehr effektiv|not very effective|nicht sehr effektiv|doesn.?t affect|hat keine wirkung|immune/.test(s)) {
      var value = /not very|nicht sehr/.test(s) ? 'resist' : /doesn|keine wirkung|immune/.test(s) ? 'immune' : 'super';
      return { kind: 'effectiveness', value: value, mon: mon, side: opposing(s) ? 'foe' : 'you', line: raw };
    }
    if ((/electr/.test(s) && /field|batl|terrain|strom|feld|current/.test(s)) || /elektrofeld/.test(s)) {
      return { kind: fieldEnded(s) ? 'field_end' : 'field', field: 'Electric Terrain', line: raw };
    }
    if (/tailwind|ruckenwind|rueckenwind/.test(s) && !/used|setzt/.test(s)) {
      var twSide = opposing(s) ? 'foe' : 'you';
      if (fieldEnded(s)) {
        return { kind: 'field_end', field: 'Tailwind', side: twSide, line: raw };
      }
      if (/blew|behind|weht|hinter/.test(s) || !/side.?s|team.?s|deines|gegnerischen/.test(s)) {
        return { kind: 'field', field: 'Tailwind', side: twSide, line: raw };
      }
      return null;
    }
    if (/psychic terrain|psychofeld/.test(s)) return { kind: fieldEnded(s) ? 'field_end' : 'field', field: 'Psychic Terrain', line: raw };
    if (/grassy terrain|grasfeld/.test(s)) return { kind: fieldEnded(s) ? 'field_end' : 'field', field: 'Grassy Terrain', line: raw };
    if (/misty terrain|nebelfeld/.test(s)) return { kind: fieldEnded(s) ? 'field_end' : 'field', field: 'Misty Terrain', line: raw };
    if (/started to snow|es schneit|schneesturm/.test(s)) return { kind: 'field', field: 'Snow', line: raw };
    if (/started to rain|es regnet|regenschauer/.test(s)) return { kind: 'field', field: 'Rain', line: raw };
    if (/sunlight turned harsh|sonnenlicht wurde grell/.test(s)) return { kind: 'field', field: 'Sun', line: raw };
    if (/sandstorm kicked up|sandsturm zieht auf/.test(s)) return { kind: 'field', field: 'Sandstorm', line: raw };
    if (/trick room|bizarroraum|twisted dimensions|dimensionen/.test(s) && !/used|setzt/.test(s)) {
      return { kind: fieldEnded(s) ? 'field_end' : 'field', field: 'Trick Room', line: raw };
    }

    var b = boostOf(s);
    if (b && (b.stat || /rose|fell|stieg|sink|sank/.test(s))) {
      return { kind: 'boost', mon: mon, stat: b.stat, stages: b.stages, side: opposing(s) ? 'foe' : 'you', line: raw };
    }

    if (/^go\b|^gol\b|los!|geh!|^go,/.test(s) || /\bgo! /.test(s) || /^los /.test(s)) {
      return mons.length ? { kind: 'send_out', side: 'you', mons: mons, line: raw } : null;
    }
    if (/sent out|schickt|setzt .* ein ins feld|in den kampf/.test(s) && !/used|setzt .+ ein!/.test(s)) {
      var ms = raw.match(/^(.+?)\s+(?:sent out|schickt)/i);
      return mons.length ? { kind: 'send_out', side: 'foe', mons: mons, foeName: ms ? cleanPlayerName(ms[1]) : '', line: raw } : null;
    }
    if (/withdrew|ruft .* zuruck|wechselt .* aus|wird zuruckgezogen/.test(s)) {
      var wSide = opposing(s) || hint === 'foe' ? 'foe' : (/\byou\b|\bdu\b/.test(s) ? 'you' : '');
      var mw2 = raw.match(/^(.+?)\s+withdrew/i);
      return mon ? { kind: 'withdraw', side: wSide, mon: mon, foeName: (wSide === 'foe' && mw2) ? cleanPlayerName(mw2[1]) : '', line: raw } : null;
    }
    if (/used | setzt .+ ein|greift mit/.test(s)) {
      var mv = oneMove(raw, lex);
      if (mv) {
        return { kind: 'move', mon: mon, move: mv, side: opposing(s) ? 'foe' : 'you', line: raw };
      }
    }
    if (hint === 'banner') {
      var ab = lexApi().best(raw, lex.abilities);
      var it = lexApi().best(raw, lex.items);
      if (ab && (!it || ab.score >= it.score)) return { kind: 'ability', mon: mon, ability: ab.entry.en, line: raw };
      if (it) return { kind: 'item', mon: mon, item: it.entry.en, line: raw };
    }
    if (hint === 'move_name' || hint === 'team_name') {
      if (hint === 'move_name') {
        var mv2 = oneMove(raw, lex);
        return mv2 ? { kind: 'choice_move', move: mv2, line: raw } : null;
      }
      return mon ? { kind: 'team_mon', mon: mon, line: raw } : null;
    }
    if (hint === 'team_item') {
      var it2 = lexApi().best(raw, lex.items);
      return it2 ? { kind: 'team_item', item: it2.entry.en, line: raw } : null;
    }
    return null;
  }

  // Zwei Bannerzeilen zusammen ("Raichu's" + "Electric Surge").
  function parseBanner(line1, line2, lex) {
    var joined = flat(line1) + ' ' + flat(line2);
    var ev = parse(joined, lex, 'banner');
    if (ev) return ev;
    return parse(flat(line2), lex, 'banner');
  }
  return { parse: parse, parseBanner: parseBanner, low: low, flat: flat };
});

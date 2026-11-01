// Match-Analyse: Showdown-Replays und Kampfprotokolle in ein gemeinsames Spielformat bringen.
// Kampfprotokoll (Zweig cursor/battlelog-c456, noch nicht auf main): localStorage "cc_battlelog"
// bzw. JSON mit generator "Rattata Lab BattleLog". Annahmen stehen bei adaptBattleLog.
(function (root) {
  'use strict';

  function idOf(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]/g, ''); }

  var dexCache = null;
  function dexIndex() {
    var A = root.CC;
    if (!A || !A.DEX) return null;
    if (dexCache && dexCache.dex === A.DEX) return dexCache;
    var byId = {}, bySh = {};
    Object.keys(A.DEX).forEach(function (k) {
      byId[idOf(k)] = k;
      var m = /^Mega (.+?)(?: ([XYZ]))?$/.exec(k);
      if (m) bySh[idOf(m[1]) + 'mega' + (m[2] ? m[2].toLowerCase() : '')] = k;
    });
    if (byId[idOf('Urshifu-Single Strike')]) bySh.urshifu = 'Urshifu-Single Strike';
    dexCache = { dex: A.DEX, byId: byId, bySh: bySh };
    return dexCache;
  }

  // Showdown-Name ("Charizard-Mega-Y", "Urshifu-Rapid-Strike") → Name im Pokédex dieser App.
  function canonSpecies(name) {
    var raw = String(name || '').split(',')[0].trim();
    if (!raw || raw === '???') return '';
    if (raw.indexOf('*') !== -1) return raw;
    var idx = dexIndex();
    var id = idOf(raw);
    if (idx && idx.bySh[id]) return idx.bySh[id];
    if (idx && idx.byId[id]) return idx.byId[id];
    var mega = /^(.*?)-Mega(?:-([XYZ]))?$/.exec(raw);
    if (mega) {
      var rewritten = 'Mega ' + mega[1] + (mega[2] ? ' ' + mega[2] : '');
      if (idx && idx.byId[idOf(rewritten)]) return idx.byId[idOf(rewritten)];
      return rewritten;
    }
    if (id === 'urshifu' && idx && idx.byId[idOf('Urshifu-Single Strike')]) return 'Urshifu-Single Strike';
    return raw;
  }

  function baseFor(name) {
    var c = canonSpecies(name);
    if (!c) return '';
    var megaDex = /^Mega (.+?)(?: [XYZ])?$/.exec(c);
    if (megaDex) return canonSpecies(megaDex[1]);
    var megaSd = /^(.*?)-Mega(?:-[XYZ])?$/.exec(c);
    if (megaSd) return canonSpecies(megaSd[1]);
    return c;
  }

  function canonMove(name) {
    var raw = String(name || '').trim();
    if (!raw) return '';
    var A = root.CC;
    if (!A || !A.MOVES) return raw;
    if (A.MOVES[raw]) return raw;
    var id = idOf(raw);
    var hit = '';
    Object.keys(A.MOVES).some(function (k) { if (idOf(k) === id) { hit = k; return true; } return false; });
    return hit || raw;
  }

  function canonItem(name) {
    var raw = String(name || '').replace(/^item:\s*/i, '').trim();
    if (!raw) return '';
    var A = root.CC;
    if (!A || !A.ITEMS) return raw;
    var id = idOf(raw), hit = '';
    A.ITEMS.some(function (k) { if (idOf(k) === id) { hit = k; return true; } return false; });
    return hit || raw;
  }

  function blankSide() {
    return {
      name: '', eloStart: null, eloEnd: null,
      team: [], teamComplete: false,
      brought: [], leads: [], back: [],
      tera: null, megas: [], moves: {}
    };
  }

  function pushUnique(arr, v) { if (v && arr.indexOf(v) === -1) arr.push(v); }

  function revealHidden(side, species) {
    var base = baseFor(species);
    for (var i = 0; i < side.team.length; i++) {
      if (side.team[i].indexOf('*') === -1) continue;
      var prefix = idOf(side.team[i].replace(/-\*.*$/, '').replace(/\*/g, ''));
      if (prefix && (idOf(base) === prefix || idOf(base).indexOf(prefix) === 0)) {
        side.team[i] = base;
        return;
      }
    }
  }

  function addMove(side, species, move) {
    var sp = baseFor(species), mv = canonMove(move);
    if (!sp || !mv || mv === '(No Move)') return;
    if (!side.moves[sp]) side.moves[sp] = {};
    side.moves[sp][mv] = (side.moves[sp][mv] || 0) + 1;
  }

  function addMega(side, species, item) {
    var base = baseFor(species);
    var forme = canonSpecies(species);
    if (/^Mega /.test(forme) === false && /-Mega/.test(species)) forme = canonSpecies(species);
    if (forme === base) {
      var letter = '';
      var m = /-Mega(?:-([XYZ]))?$/.exec(species) || / ([XYZ])$/.exec(item || '');
      if (m && m[1]) letter = m[1];
      forme = canonSpecies(base + '-Mega' + (letter ? '-' + letter : ''));
    }
    var known = null;
    side.megas.forEach(function (x) { if (x.species === base) known = x; });
    var held = canonItem(item || '');
    if (known) { if (!known.item && held) known.item = held; return; }
    side.megas.push({ species: base, forme: forme, item: held });
  }

  function finishSide(side, leads) {
    leads.forEach(function (s) { pushUnique(side.leads, s); });
    side.leads.forEach(function (s) { pushUnique(side.brought, s); });
    side.back = side.brought.filter(function (s) { return side.leads.indexOf(s) === -1; });
    if (side.team.length) side.teamComplete = true;
  }

  function parseRating(html) {
    var text = String(html || '').replace(/<[^>]+>/g, ' ').replace(/&rarr;|&#8594;/g, '→').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
    var m = /^(.*)'s rating:\s*(\d+)\s*→\s*(\d+)/.exec(text);
    if (!m) return null;
    return { name: m[1], from: +m[2], to: +m[3] };
  }

  function namesEqual(a, b) { return idOf(a) && idOf(a) === idOf(b); }

  function parseLog(log, meta) {
    meta = meta || {};
    var lines = String(log || '').split(/\r?\n/);
    var p1 = blankSide(), p2 = blankSide();
    var slot = {};
    var leadsLocked = false;
    var gametype = '';
    var winnerName = '';
    var tie = false;
    var maxLeads = 2;

    function sideOf(token) { return token && token.charAt(1) === '2' ? p2 : p1; }
    function lockLeads() {
      if (leadsLocked) return;
      leadsLocked = true;
      [['p1', p1], ['p2', p2]].forEach(function (pair) {
        var leads = [];
        ['a', 'b'].forEach(function (s) {
          var sl = slot[pair[0] + s];
          if (sl && leads.length < maxLeads) pushUnique(leads, sl);
        });
        leads.forEach(function (s) { pushUnique(pair[1].leads, s); pushUnique(pair[1].brought, s); });
      });
    }

    lines.forEach(function (line) {
      if (!line || line.charAt(0) !== '|') return;
      var parts = line.split('|');
      var cmd = parts[1];
      if (cmd === 'player') {
        var sd = parts[2] === 'p2' ? p2 : p1;
        sd.name = parts[3] || '';
        if (parts[5] && /^\d+$/.test(parts[5])) sd.eloStart = +parts[5];
      } else if (cmd === 'poke') {
        var who = parts[2] === 'p2' ? p2 : p1;
        var species = (parts[3] || '').split(',')[0].trim();
        var item = (parts[4] || '').trim();
        if (!species) return;
        if (species.indexOf('*') !== -1) who.team.push(species);
        else who.team.push(baseFor(species));
        if (item) who.sawItem = true;
      } else if (cmd === 'gametype') {
        gametype = parts[2] || '';
        maxLeads = gametype === 'singles' ? 1 : 2;
      } else if (cmd === 'switch' || cmd === 'drag' || cmd === 'replace') {
        var ident = /^(p[12][ab]): (.*)$/.exec(parts[2] || '');
        if (!ident) return;
        var details = (parts[3] || '').split(',')[0].trim();
        var base = baseFor(details);
        var sd = sideOf(ident[1]);
        revealHidden(sd, details);
        if (/-Mega(?:-[XYZ])?$/.test(details) || /^Mega /.test(canonSpecies(details))) addMega(sd, details, '');
        slot[ident[1]] = base;
        pushUnique(sd.brought, base);
        if (cmd === 'replace') return;
        if (!leadsLocked && sd.leads.length < maxLeads) {
          /* endgültige Leads setzt lockLeads über die belegten Slots */
        }
      } else if (cmd === 'turn') {
        lockLeads();
      } else if (cmd === 'move') {
        var idm = /^(p[12][ab])/.exec(parts[2] || '');
        if (!idm || !slot[idm[1]]) return;
        addMove(sideOf(idm[1]), slot[idm[1]], parts[3]);
      } else if (cmd === '-mega') {
        var idg = /^(p[12][ab])/.exec(parts[2] || '');
        if (!idg) return;
        var baseName = parts[3] || slot[idg[1]] || '';
        var megaItem = parts[4] || '';
        var megaSpecies = baseName;
        if (/-Mega(?:-[XYZ])?$/.test(baseName) === false && /^Mega /.test(baseName) === false) {
          var letter = / ([XYZ])$/.exec(megaItem);
          megaSpecies = baseName + '-Mega' + (letter ? '-' + letter[1] : '');
        }
        addMega(sideOf(idg[1]), megaSpecies, megaItem);
        if (slot[idg[1]]) slot[idg[1]] = baseFor(baseName);
      } else if (cmd === 'detailschange' || cmd === '-formechange') {
        var idd = /^(p[12][ab])/.exec(parts[2] || '');
        if (!idd) return;
        var det = (parts[3] || '').split(',')[0].trim();
        if (/-Mega(?:-[XYZ])?$/.test(det) || /^Mega /.test(det)) addMega(sideOf(idd[1]), det, '');
        if (slot[idd[1]]) slot[idd[1]] = baseFor(det);
      } else if (cmd === '-terastallize') {
        var idt = /^(p[12][ab])/.exec(parts[2] || '');
        if (!idt) return;
        var tSide = sideOf(idt[1]);
        tSide.tera = { species: slot[idt[1]] || '', type: parts[3] || '' };
      } else if (cmd === 'win') {
        winnerName = parts[2] || '';
      } else if (cmd === 'tie') {
        tie = true;
      } else if (cmd === 'raw') {
        var rating = parseRating(parts.slice(2).join('|'));
        if (!rating) return;
        [p1, p2].forEach(function (sd) {
          if (!namesEqual(sd.name, rating.name)) return;
          sd.eloStart = rating.from;
          sd.eloEnd = rating.to;
        });
      }
    });
    lockLeads();
    finishSide(p1, p1.leads);
    finishSide(p2, p2.leads);
    var sheet = 'unknown';
    if (p1.team.length || p2.team.length) sheet = (p1.sawItem || p2.sawItem) ? 'ots' : 'cts';
    delete p1.sawItem; delete p2.sawItem;
    var winner = null;
    if (!tie && winnerName) {
      if (namesEqual(winnerName, p1.name)) winner = 'p1';
      else if (namesEqual(winnerName, p2.name)) winner = 'p2';
    }
    var warnings = [];
    if (!winner && !tie) warnings.push('no-winner');
    if (!p1.team.length && !p2.team.length) warnings.push('no-preview');
    return {
      source: meta.source || 'showdown',
      replayId: meta.replayId || '',
      url: meta.url || '',
      when: meta.when || 0,
      format: meta.format || gametype || '',
      formatName: meta.formatName || '',
      sheet: sheet,
      p1: p1, p2: p2,
      winner: winner,
      warnings: warnings
    };
  }

  function parseReplayJson(obj) {
    if (!obj || typeof obj.log !== 'string') throw new Error('no-log');
    var id = String(obj.id || '');
    return parseLog(obj.log, {
      source: 'showdown',
      replayId: id,
      url: id ? 'https://replay.pokemonshowdown.com/' + id : '',
      when: obj.uploadtime ? obj.uploadtime * 1000 : 0,
      format: obj.formatid || '',
      formatName: obj.format || ''
    });
  }

  function replayIdFromInput(s) {
    var t = String(s || '').trim();
    if (!t) return null;
    var fromUrl = /pokemonshowdown\.com\/(?:replay\/)?([a-z0-9]+-\d{5,})(?:\.json|\.log)?/i.exec(t);
    if (fromUrl) return fromUrl[1].toLowerCase();
    if (/^[a-z0-9]+-\d{5,}$/i.test(t)) return t.toLowerCase();
    return null;
  }

  // Kampfprotokoll-Schnappschuss (js/battlelog.js, Export "Rattata Lab BattleLog").
  // Gelesen wird: id, created, youName, foeName, detected.{you,foe}, format, winner ("you"|"foe"|null),
  // party.{you,foe}[].{species,name,fainted}, events[].{kind, side, species, move, lead, recall, raw}.
  // kind "send"/"switch" mit lead:true sind die Leads (sonst alles vor der ersten "turn"-Zeile, max. 2).
  // Das Protokoll kennt das Team von sechs, Elo und offen/geschlossen nicht: teamComplete bleibt false,
  // sheet "unknown", Elo leer. Optionale Felder, falls das Protokoll sie später schreibt:
  // teamComplete, sheet ("ots"|"cts"), elo.{youStart,youEnd,foeStart,foeEnd},
  // youTera/foeTera {species,type}, youMegas/foeMegas, sowie mon.tera / mon.teraType / mon.mega / mon.megaItem.
  // Steht in events[].raw eine Showdown-Zeile (|-mega| / |-terastallize|), wird sie mitgelesen.
  function isBattleLog(o) {
    return !!(o && o.party && o.events && (o.party.you || o.party.foe) && !o.log);
  }

  function adaptBattleLog(b) {
    if (!isBattleLog(b)) return null;
    var you = blankSide(), foe = blankSide();
    you.name = b.youName || (b.detected && b.detected.you) || '';
    foe.name = b.foeName || (b.detected && b.detected.foe) || '';
    var maxLeads = b.format === 'singles' ? 1 : 2;
    function takeParty(side, list) {
      (list || []).forEach(function (m) {
        if (!m || !m.species) return;
        var sp = baseFor(m.species);
        pushUnique(side.brought, sp);
        if (m.mega) addMega(side, m.mega, m.megaItem || '');
        if (m.tera || m.teraType) side.tera = { species: baseFor(m.tera || m.species), type: m.teraType || '' };
      });
    }
    takeParty(you, b.party.you);
    takeParty(foe, b.party.foe);
    var leadFlag = { you: [], foe: [] }, leadEarly = { you: [], foe: [] }, seenTurn = false;
    (b.events || []).forEach(function (e) {
      if (!e) return;
      if (e.kind === 'turn') seenTurn = true;
      var sd = e.side === 'foe' ? foe : e.side === 'you' ? you : null;
      if (e.kind === 'move' && sd && e.species && e.move) addMove(sd, e.species, e.move);
      if ((e.kind === 'send' || e.kind === 'switch') && sd && e.species && !e.recall) {
        var sp = baseFor(e.species);
        pushUnique(sd.brought, sp);
        var bucket = e.lead ? leadFlag[e.side] : (!seenTurn ? leadEarly[e.side] : null);
        if (bucket && bucket.length < maxLeads) pushUnique(bucket, sp);
      }
      if (e.raw && e.raw.charAt(0) === '|') {
        var extra = parseLog(e.raw, { source: 'battlelog' });
        extra.p1.megas.forEach(function (m) { if (e.side === 'foe') addMega(foe, m.forme || m.species, m.item); else addMega(you, m.forme || m.species, m.item); });
        if (extra.p1.tera) (e.side === 'foe' ? foe : you).tera = extra.p1.tera;
      }
    });
    [['you', you], ['foe', foe]].forEach(function (pair) {
      var leads = leadFlag[pair[0]].length ? leadFlag[pair[0]] : leadEarly[pair[0]];
      finishSide(pair[1], leads);
      pair[1].team = pair[1].brought.slice();
      pair[1].teamComplete = b.teamComplete === true;
    });
    if (b.youTera) you.tera = { species: baseFor(b.youTera.species || ''), type: b.youTera.type || '' };
    if (b.foeTera) foe.tera = { species: baseFor(b.foeTera.species || ''), type: b.foeTera.type || '' };
    (b.youMegas || []).forEach(function (m) { addMega(you, m.forme || m.species || m, m.item || ''); });
    (b.foeMegas || []).forEach(function (m) { addMega(foe, m.forme || m.species || m, m.item || ''); });
    var elo = b.elo || {};
    if (elo.youStart != null) you.eloStart = elo.youStart;
    if (elo.youEnd != null) you.eloEnd = elo.youEnd;
    if (elo.foeStart != null) foe.eloStart = elo.foeStart;
    if (elo.foeEnd != null) foe.eloEnd = elo.foeEnd;
    var sheet = b.sheet === 'ots' || b.sheet === 'cts' ? b.sheet : 'unknown';
    var winner = b.winner === 'you' ? 'p1' : b.winner === 'foe' ? 'p2' : null;
    var warnings = [];
    if (!you.teamComplete || !foe.teamComplete) warnings.push('partial-team');
    if (sheet === 'unknown') warnings.push('no-sheet');
    if (you.eloStart == null && foe.eloStart == null) warnings.push('no-elo');
    if (!winner) warnings.push('no-winner');
    return {
      source: 'battlelog',
      replayId: '',
      url: '',
      battleLogId: b.id || '',
      when: b.created || b.updated || 0,
      format: b.format || '',
      formatName: '',
      sheet: sheet,
      p1: you, p2: foe,
      winner: winner,
      warnings: warnings
    };
  }

  var SERIES_GAP = 6 * 3600 * 1000;

  function normName(s) { return String(s || '').toLowerCase().replace(/\s+/g, ' ').trim(); }

  // rows: { key, foe, result, when, splitBefore, alone } in beliebiger Reihenfolge.
  // Aufeinanderfolgende Spiele gegen denselben Gegner werden eine Serie, bis eine Seite
  // zwei Siege hat oder drei Spiele gespielt sind. Mehr als sechs Stunden Abstand trennt.
  function groupSeries(rows) {
    var list = (rows || []).map(function (r, i) { return { r: r, i: i }; });
    list.sort(function (a, b) {
      var dw = (a.r.when || 0) - (b.r.when || 0);
      return dw || (a.i - b.i);
    });
    var out = [], cur = null;
    list.forEach(function (item) {
      var r = item.r;
      var foeKey = normName(r.foe) || ('\0' + (r.key || item.i));
      var gap = !!(cur && r.when && cur.lastWhen && r.when - cur.lastWhen > SERIES_GAP);
      var closed = !!(cur && (cur.wins >= 2 || cur.losses >= 2 || cur.games.length >= 3));
      var prevAlone = !!(cur && cur.games.length && cur.games[cur.games.length - 1].alone);
      var fresh = !cur || r.splitBefore || r.alone || prevAlone || foeKey !== cur.foeKey || gap || closed;
      if (fresh) {
        cur = { foe: r.foe || '', foeKey: foeKey, games: [], wins: 0, losses: 0, lastWhen: 0 };
        out.push(cur);
      }
      cur.games.push(r);
      if (r.result === 'win') cur.wins++;
      else if (r.result === 'loss') cur.losses++;
      if (r.when) cur.lastWhen = r.when;
    });
    return out;
  }

  function hashText(s) {
    var h = 5381;
    for (var i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
    return h.toString(36);
  }

  function selfTest() {
    var fails = [], n = 0;
    function eq(a, b, msg) {
      n++;
      var as = JSON.stringify(a), bs = JSON.stringify(b);
      if (as !== bs) fails.push(msg + ': ' + as + ' !== ' + bs);
    }
    eq(replayIdFromInput('https://replay.pokemonshowdown.com/gen9championsvgc2026regmc-2707675711'), 'gen9championsvgc2026regmc-2707675711', 'url');
    eq(replayIdFromInput('https://replay.pokemonshowdown.com/gen9championsvgc2026regmc-2707675711.json'), 'gen9championsvgc2026regmc-2707675711', 'json url');
    eq(replayIdFromInput('https://play.pokemonshowdown.com/replay/gen9ou-1234567.log'), 'gen9ou-1234567', 'play url');
    eq(replayIdFromInput('gen9ou-1234567'), 'gen9ou-1234567', 'bare id');
    eq(replayIdFromInput('https://example.com/gen9ou-1234567'), null, 'foreign url');
    eq(replayIdFromInput('hello'), null, 'text');

    var log = [
      '|player|p1|FreePalestinaMX|265|1405',
      '|player|p2|stupid春boss|266|1494',
      '|poke|p1|Charizard, L50, M|',
      '|poke|p1|Garchomp, L50, F|',
      '|poke|p1|Venusaur, L50, M|',
      '|poke|p1|Archaludon, L50, F|',
      '|poke|p1|Pelipper, L50, F|',
      '|poke|p1|Grimmsnarl, L50, M|',
      '|poke|p2|Charizard, L50, M|',
      '|poke|p2|Garchomp, L50, F|',
      '|poke|p2|Politoed, L50, F|',
      '|poke|p2|Archaludon, L50, F|',
      '|poke|p2|Raichu, L50, F|',
      '|poke|p2|Espathra, L50, M|',
      '|teampreview|4',
      '|gametype|doubles',
      '|switch|p1a: Archaludon|Archaludon, L50, F|100/100',
      '|switch|p1b: Grimmsnarl|Grimmsnarl, L50, M|100/100',
      '|switch|p2a: Raichu|Raichu, L50, F|100/100',
      '|switch|p2b: Espathra|Espathra, L50, M|100/100',
      '|turn|1',
      '|move|p2a: Raichu|Fake Out|p1b: Grimmsnarl',
      '|switch|p1a: Charizard|Charizard, L50, M|100/100',
      '|move|p1a: Charizard|Heat Wave|p2a: Raichu',
      '|detailschange|p1a: Charizard|Charizard-Mega-Y, L50, M',
      '|-mega|p1a: Charizard|Charizard|Charizardite Y',
      '|move|p1a: Charizard|Heat Wave|p2a: Raichu',
      '|-terastallize|p2b: Espathra|Fairy',
      '|switch|p2a: Politoed|Politoed, L50, F|100/100',
      '|win|stupid春boss',
      "|raw|FreePalestinaMX's rating: 1405 &rarr; <strong>1390</strong><br />(-15 for losing)",
      "|raw|stupid春boss's rating: 1494 &rarr; <strong>1509</strong><br />(+15 for winning)"
    ].join('\n');
    var g = parseLog(log, { when: 5000, replayId: 'gen9x-1' });
    eq(g.sheet, 'cts', 'sheet');
    eq(g.winner, 'p2', 'winner');
    eq(g.p1.team.length, 6, 'p1 six');
    eq(g.p2.team[4], baseFor('Raichu'), 'p2 mon');
    eq(g.p1.leads, [baseFor('Archaludon'), baseFor('Grimmsnarl')], 'p1 leads');
    eq(g.p2.leads, [baseFor('Raichu'), baseFor('Espathra')], 'p2 leads');
    eq(g.p1.brought.indexOf(baseFor('Charizard')) !== -1, true, 'char brought');
    eq(g.p1.back.indexOf(baseFor('Charizard')) !== -1, true, 'char back');
    eq(g.p1.leads.indexOf(baseFor('Charizard')) === -1, true, 'char not lead');
    eq(g.p2.back, [baseFor('Politoed')], 'p2 back');
    eq(g.p1.megas.length, 1, 'one mega');
    eq(g.p1.megas[0].species, baseFor('Charizard'), 'mega species');
    eq(g.p1.megas[0].item, 'Charizardite Y', 'mega item');
    eq(g.p2.tera.species, baseFor('Espathra'), 'tera mon');
    eq(g.p2.tera.type, 'Fairy', 'tera type');
    eq(g.p1.eloStart, 1405, 'p1 elo start');
    eq(g.p1.eloEnd, 1390, 'p1 elo end');
    eq(g.p2.eloEnd, 1509, 'p2 elo end');
    eq(g.p1.moves[baseFor('Charizard')][canonMove('Heat Wave')], 2, 'heat wave');
    eq(g.p2.moves[baseFor('Raichu')][canonMove('Fake Out')], 1, 'fake out');
    eq(g.warnings.length, 0, 'no warnings');

    var ots = parseLog([
      '|player|p1|A|1|1500',
      '|player|p2|B|1|',
      '|poke|p1|Incineroar, L50, M|Safety Goggles',
      '|poke|p1|Urshifu-*, L50, M|',
      '|poke|p2|Incineroar, L50, F|Sitrus Berry',
      '|gametype|doubles',
      '|switch|p1a: Incineroar|Incineroar, L50, M|100/100',
      '|switch|p1b: Urshifu|Urshifu-Rapid-Strike, L50, M|100/100',
      '|switch|p2a: Incineroar|Incineroar, L50, F|100/100',
      '|turn|1',
      '|-terastallize|p1a: YES|Ghost',
      '|move|p1b: Urshifu|Surging Strikes|p2a: Incineroar',
      '|win|A'
    ].join('\n'));
    eq(ots.sheet, 'ots', 'ots');
    eq(ots.p1.team[1], baseFor('Urshifu-Rapid-Strike'), 'urshifu revealed');
    eq(ots.p1.leads[1], baseFor('Urshifu-Rapid-Strike'), 'urshifu lead');
    eq(ots.p1.tera.type, 'Ghost', 'tera nick');
    eq(ots.p1.tera.species, baseFor('Incineroar'), 'tera from slot');
    eq(ots.winner, 'p1', 'ots win');
    eq(ots.p2.eloStart, null, 'unrated');

    var bl = adaptBattleLog({
      id: 'bltest', created: 1700000000000, youName: 'Rattata', foeName: 'Joey', format: 'doubles',
      winner: 'you', winnerHow: 'text',
      party: {
        you: [{ species: 'Pikachu' }, { species: 'Charizard' }],
        foe: [{ species: 'Rattata' }]
      },
      events: [
        { kind: 'send', side: 'you', species: 'Pikachu', lead: true },
        { kind: 'send', side: 'foe', species: 'Rattata', lead: true },
        { kind: 'send', side: 'you', species: 'Charizard', lead: true },
        { kind: 'turn' },
        { kind: 'move', side: 'you', species: 'Pikachu', move: 'Thunderbolt' },
        { kind: 'raw', side: 'you', raw: '|-mega|p1a: Charizard|Charizard|Charizardite Y' }
      ]
    });
    eq(bl.p1.name, 'Rattata', 'bl you');
    eq(bl.p2.name, 'Joey', 'bl foe');
    eq(bl.winner, 'p1', 'bl win');
    eq(bl.p1.leads, [baseFor('Pikachu'), baseFor('Charizard')], 'bl leads');
    eq(bl.p1.teamComplete, false, 'bl partial');
    eq(bl.sheet, 'unknown', 'bl sheet');
    eq(bl.warnings.indexOf('partial-team') !== -1, true, 'bl warn team');
    eq(bl.warnings.indexOf('no-elo') !== -1, true, 'bl warn elo');
    eq(bl.p1.moves[baseFor('Pikachu')][canonMove('Thunderbolt')], 1, 'bl move');
    eq(bl.p1.megas[0].species, baseFor('Charizard'), 'bl mega from raw');
    eq(isBattleLog({ log: '|win|a', party: {}, events: [] }), false, 'replay is not battlelog');

    var series = groupSeries([
      { key: 'a', foe: 'Aqua', result: 'win', when: 1 },
      { key: 'b', foe: 'Aqua', result: 'loss', when: 2 },
      { key: 'c', foe: 'Aqua', result: 'win', when: 3 },
      { key: 'd', foe: 'Aqua', result: 'loss', when: 4 },
      { key: 'e', foe: 'Bolt', result: 'win', when: 5 },
      { key: 'f', foe: 'Bolt', result: 'loss', when: 5 + SERIES_GAP + 1 },
      { key: 'g', foe: 'Bolt', result: 'win', when: 5 + SERIES_GAP + 2, alone: true },
      { key: 'h', foe: 'Bolt', result: 'win', when: 5 + SERIES_GAP + 3, splitBefore: true }
    ]);
    eq(series.length, 6, 'series count');
    eq(series[0].wins + '-' + series[0].losses, '2-1', 'bo3');
    eq(series[0].games.length, 3, 'bo3 games');
    eq(series[1].games[0].key, 'd', 'next set');
    eq(series[2].games[0].key, 'e', 'other foe');
    eq(series[3].games[0].key, 'f', 'gap');
    eq(series[4].games[0].key, 'g', 'bo1');
    eq(series[5].games[0].key, 'h', 'after bo1');

    if (root.CC && root.CC.DEX) {
      eq(canonSpecies('Charizard-Mega-Y'), 'Mega Charizard Y', 'dex mega');
      eq(baseFor('Charizard-Mega-Y'), 'Charizard', 'dex base');
      eq(canonSpecies('Indeedee-F'), 'Indeedee-F', 'dex indeedee');
      eq(canonMove('Fake Out'), 'Fake Out', 'dex move');
      // Urshifu-Formen stehen nicht im Champions-Dex dieser Version: der Showdown-Name bleibt,
      // und nur wenn der Dex sie kennt, wird auf den internen Namen abgebildet.
      eq(canonSpecies('Urshifu-Rapid-Strike'), root.CC.DEX['Urshifu-Rapid Strike'] ? 'Urshifu-Rapid Strike' : 'Urshifu-Rapid-Strike', 'urshifu rs');
      eq(canonSpecies('Urshifu'), root.CC.DEX['Urshifu-Single Strike'] ? 'Urshifu-Single Strike' : 'Urshifu', 'urshifu base');
    }
    return { ok: fails.length === 0, fails: fails, n: n };
  }

  root.CCMatchParse = {
    idOf: idOf, canonSpecies: canonSpecies, baseFor: baseFor, canonMove: canonMove, canonItem: canonItem,
    parseLog: parseLog, parseReplayJson: parseReplayJson, replayIdFromInput: replayIdFromInput,
    isBattleLog: isBattleLog, adaptBattleLog: adaptBattleLog, groupSeries: groupSeries,
    hashText: hashText, SERIES_GAP: SERIES_GAP, selfTest: selfTest
  };
})(typeof window !== 'undefined' ? window : globalThis);

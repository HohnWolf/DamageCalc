// Online updates: popular sets and new regulations.
// Loaded after the data files and before app.js. A saved regulation update (localStorage "cc_reg") is applied
// to the data right away, so newly added Pokémon behave exactly like the built-in ones.
//
// Sources (all allow direct browser access via CORS):
//   Regulation: Pokémon Showdown on GitHub (config/formats.ts, data/mods/<mod>/formats-data.ts + learnsets.ts)
//               and play.pokemonshowdown.com/data (pokedex.json, moves.json)
//   Sets:       NCP VGC Damage Calculator (setdex_ncp-g10.js), data.pkmn.cc (Smogon usage stats and Smogon sets)
(function () {
  'use strict';
  var KEY_REG = 'cc_reg', KEY_SETS = 'cc_online';
  var GH = 'https://raw.githubusercontent.com/smogon/pokemon-showdown/master/';
  var PS = 'https://play.pokemonshowdown.com/data/';
  var NCP = 'https://nerd-of-now.github.io/NCP-VGC-Damage-Calculator/script_res/setdex_ncp-g10.js';
  var PKMN = 'https://data.pkmn.cc/';

  function load(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }
  function store(k, v) {
    try { localStorage.setItem(k, JSON.stringify(v)); }
    catch (e) { throw new Error('Browser-Speicher voll / storage full (' + k + ')'); }
  }
  function id(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]/g, ''); }
  function shId(n) {
    var m = /^Mega (.+?)(?: ([XYZ]))?$/.exec(n || '');
    return m ? id(m[1]) + 'mega' + (m[2] ? m[2].toLowerCase() : '') : id(n);
  }
  // Showdown name -> NCP name ("Charizard-Mega-X" -> "Mega Charizard X", "Meowstic-M-Mega" -> "Mega Meowstic")
  function ncpName(n) {
    var m = /^(.+?)(?:-[MF])?-Mega(?:-([XYZ]))?$/.exec(n || '');
    return m ? 'Mega ' + m[1] + (m[2] ? ' ' + m[2] : '') : n;
  }
  function copy(o) { return o == null ? o : JSON.parse(JSON.stringify(o)); }
  function get(url, asJson) {
    return fetch(url, { cache: 'no-store' }).then(function (r) {
      if (!r.ok) throw new Error(url + ' → HTTP ' + r.status);
      return asJson ? r.json() : r.text();
    });
  }

  // ======================= apply a saved regulation update =======================
  function applyReg(r) {
    if (!r) return;
    var D = window.POKEDEX_CHAMPIONS;
    Object.keys(r.species || {}).forEach(function (k) { if (!D[k]) D[k] = copy(r.species[k]); });
    Object.keys(r.formes || {}).forEach(function (b) {
      if (!D[b]) return;
      var f = D[b].formes && D[b].formes.length ? D[b].formes.slice() : [b];
      r.formes[b].forEach(function (x) { if (D[x] && f.indexOf(x) === -1) f.push(x); });
      D[b].formes = f;
    });
    Object.keys(r.megas || {}).forEach(function (it) {
      window.MEGA_STONE_USER_LOOKUP[it] = r.megas[it];
      if (window.ITEMS_CHAMPIONS.indexOf(it) === -1) window.ITEMS_CHAMPIONS.push(it);
    });
    (r.items || []).forEach(function (it) { if (window.ITEMS_CHAMPIONS.indexOf(it) === -1) window.ITEMS_CHAMPIONS.push(it); });
    Object.keys(r.moves || {}).forEach(function (m) { if (!window.MOVES_CHAMPIONS[m]) window.MOVES_CHAMPIONS[m] = copy(r.moves[m]); });
    (r.abilities || []).forEach(function (a) { if (window.ABILITIES_CHAMPIONS.indexOf(a) === -1) window.ABILITIES_CHAMPIONS.push(a); });
    if (r.learn) { window.CHAMP_LEARN = r.learn; window.CHAMP_PARENT = r.parent || {}; window.CHAMP_ABIL = r.abil || {}; }
  }
  var reg = load(KEY_REG);
  try { applyReg(reg); } catch (e) { console.warn('cc_reg could not be applied', e); }

  // ======================= regulation update =======================
  function parseTable(ts) { // "\tid: {...}\n\t}," blocks of a Showdown .ts data table
    var out = {}, re = /\t([a-z0-9]+): \{([\s\S]*?)\n\t\},?/g, m;
    while ((m = re.exec(ts))) out[m[1]] = m[2];
    return out;
  }
  function parseLearnsets(ts) {
    var out = {}, cur = null;
    ts.split('\n').forEach(function (l) {
      var m = /^\t([a-z0-9]+): \{/.exec(l);
      if (m) { cur = m[1]; out[cur] = out[cur] || []; return; }
      m = /^\t\t\t([a-z0-9]+): \[/.exec(l);
      if (m && cur && out[cur].indexOf(m[1]) === -1) out[cur].push(m[1]);
    });
    Object.keys(out).forEach(function (k) { if (!out[k].length) delete out[k]; });
    return out;
  }
  // all Champions VGC regulations from formats.ts, current one first
  function parseRegs(formats) {
    var list = [];
    formats.split(/\n\t\{\s*\n/).forEach(function (p) {
      var n = /name:\s*"\[Gen 9 Champions\] (VGC[^"]*)"/.exec(p), m = /mod:\s*'([a-z0-9]+)'/.exec(p);
      if (n && m && !/Bo3/.test(n[1])) list.push({ name: n[1].trim(), mod: m[1], hidden: /searchShow:\s*false/.test(p) });
    });
    list.sort(function (a, b) { return (a.mod === 'champions' && !a.hidden ? 0 : 1) - (b.mod === 'champions' && !b.hidden ? 0 : 1); });
    return list;
  }
  // play.pokemonshowdown.com/data/items.js -> {id: {name, nonstd, num}}; read with patterns, nothing is executed
  function parseItemsJs(text) {
    // walk the top-level "id:{...}" entries by counting braces (strings are skipped), field order does not matter
    var out = {}, n = text.length, i = text.indexOf('{') + 1, keyRe = /\s*,?\s*([a-z0-9]+):\{/y;
    while (i > 0 && i < n) {
      keyRe.lastIndex = i;
      var m = keyRe.exec(text);
      if (!m) break;
      var start = keyRe.lastIndex, j = start, depth = 1, inStr = false;
      while (j < n && depth > 0) {
        var c = text[j];
        if (inStr) { if (c === '\\') j++; else if (c === '"') inStr = false; }
        else if (c === '"') inStr = true;
        else if (c === '{') depth++;
        else if (c === '}') depth--;
        j++;
      }
      var body = text.slice(start, j - 1), flat = body, prev;
      do { prev = flat; flat = flat.replace(/\{[^{}]*\}/g, ''); } while (flat !== prev); // drop nested objects
      var name = /(?:^|,)name:"([^"]+)"/.exec(flat), ns = /(?:^|,)isNonstandard:"([^"]+)"/.exec(flat), num = /(?:^|,)num:(-?\d+)/.exec(flat);
      if (name) out[m[1]] = { name: name[1], nonstd: ns ? ns[1] : null, num: num ? +num[1] : 0 };
      i = j;
    }
    return out;
  }
  // items allowed in the regulation: mod override (isNonstandard: null = allowed), otherwise the main dex status
  function legalItems(itemsJs, modItemsTs) {
    var ov = parseTable(modItemsTs), out = [];
    Object.keys(itemsJs).forEach(function (k) {
      var e = itemsJs[k];
      if (e.num <= 0) return;
      var ok = ov[k] != null ? /isNonstandard:\s*null/.test(ov[k]) : !e.nonstd;
      if (ok) out.push(e.name);
    });
    return out;
  }
  var DEFAULT_FORME =/-(Midday|Average|Shield|Altered|Incarnate|Ordinary|Aria|Baile|Male|Disguised|Full Belly|Amped|Hero|Family of Four|Curly|Plant|Phony|Counterfeit|Standard)$/;
  function convertMon(e) { // Showdown pokedex entry -> NCP entry
    var o = { t1: e.types[0], bs: { hp: e.baseStats.hp, at: e.baseStats.atk, df: e.baseStats.def, sa: e.baseStats.spa, sd: e.baseStats.spd, sp: e.baseStats.spe }, w: e.weightkg, ab: e.abilities['0'] };
    if (e.types[1]) o.t2 = e.types[1];
    if (e.baseSpecies && e.baseSpecies !== e.name) o.isAlternateForme = true;
    return o;
  }
  function convertMove(m) { // Showdown move -> NCP move
    var f = m.flags || {}, o = { bp: m.basePower || 0, type: m.type, category: m.category };
    if (f.contact) o.makesContact = true;
    if (m.target === 'allAdjacentFoes' || m.target === 'allAdjacent') o.isSpread = true;
    if (m.secondary || m.secondaries) o.hasSecondaryEffect = true;
    if (m.priority > 0) o.isPriority = true;
    if (Array.isArray(m.multihit)) o.hitRange = m.multihit;
    ['punch', 'bite', 'sound', 'bullet', 'pulse', 'wind'].forEach(function (k) { if (f[k]) o['is' + k[0].toUpperCase() + k.slice(1)] = true; });
    if (f.slicing) o.isSlice = true;
    if (m.drain) o.drainHP = Math.round(100 * m.drain[0] / m.drain[1]);
    if (m.recoil) o.recoilHP = Math.round(100 * m.recoil[0] / m.recoil[1]);
    return o;
  }

  function updateRegulation(progress) {
    progress = progress || function () {};
    var info = {};
    progress('formats.ts');
    return get(GH + 'config/formats.ts').then(function (formats) {
      var regs = parseRegs(formats);
      if (!regs.length) throw new Error('Keine Champions-VGC-Regulation in formats.ts gefunden');
      info.reg = regs[0]; info.allRegs = regs.map(function (r) { return r.name; });
      progress(info.reg.name + ': formats-data, learnsets, items, pokedex, moves');
      var mod = GH + 'data/mods/' + info.reg.mod + '/';
      var fallback = GH + 'data/mods/champions/';
      return Promise.all([
        get(mod + 'formats-data.ts'),
        get(mod + 'learnsets.ts').catch(function () { return get(fallback + 'learnsets.ts'); }),
        get(PS + 'pokedex.json', true),
        get(PS + 'moves.json', true),
        get(mod + 'items.ts').catch(function () { return get(fallback + 'items.ts'); }),
        get(PS + 'items.js')
      ]);
    }).then(function (res) {
      var fd = parseTable(res[0]), learnIds = parseLearnsets(res[1]), sdex = res[2], smoves = res[3];
      var itemsLegal = legalItems(parseItemsJs(res[5]), res[4]);
      var D = window.POKEDEX_CHAMPIONS, ZA = window.POKEDEX_ZA_NATDEX || {}, MV_ALL = window.MOVES_CHAMPIONS_NATDEX || {};
      // legal species: no isNonstandard, not "Illegal"; battle-only formes only if they are megas
      var legal = Object.keys(fd).filter(function (k) {
        var e = sdex[k];
        return e && !/isNonstandard|"Illegal"/.test(fd[k]) && (!e.battleOnly || /Mega/.test(e.forme || ''));
      });
      var present = {};
      Object.keys(D).forEach(function (k) { if (D[k] && D[k].bs) { present[shId(k)] = 1; present[id(k)] = 1; present[id(k.replace(DEFAULT_FORME, ''))] = 1; } });
      var missing = legal.filter(function (k) { return !present[k] && !present[k.replace(/[mf]mega$/, 'mega')]; });

      var old = reg || {};
      var out = {
        name: info.reg.name, mod: info.reg.mod, date: new Date().toISOString(), allRegs: info.allRegs,
        species: copy(old.species) || {}, formes: copy(old.formes) || {}, megas: copy(old.megas) || {},
        moves: copy(old.moves) || {}, abilities: (old.abilities || []).slice(), legal: legal, added: []
      };
      var addedNames = {};
      missing.forEach(function (k) {
        var e = sdex[k], name = ncpName(e.name);
        var entry = ZA[name] ? copy(ZA[name]) : convertMon(e);
        entry.formes = null; // formes are linked below, only legal ones
        if (/Mega/.test(e.forme || '')) entry.isAlternateForme = true;
        out.species[name] = entry; addedNames[name] = e; out.added.push(name);
      });
      // link formes and megas to their base species
      Object.keys(addedNames).forEach(function (name) {
        var e = addedNames[name];
        if (!e.baseSpecies || e.baseSpecies === e.name) return;
        var b = e.baseSpecies, baseKey = (D[b] || out.species[b]) ? b : null;
        if (!baseKey) Object.keys(D).some(function (k) { if (id(k.replace(DEFAULT_FORME, '')) === id(b) && !D[k].isAlternateForme) { baseKey = k; return true; } return false; });
        if (!baseKey) { delete out.species[name].isAlternateForme; return; } // base not available: stands alone
        (out.formes[baseKey] = out.formes[baseKey] || []).indexOf(name) === -1 && out.formes[baseKey].push(name);
        if (e.requiredItem && /Mega/.test(e.forme || '')) out.megas[e.requiredItem] = baseKey;
      });

      // learnsets for every legal species (same logic as tools/build_learnsets.py)
      var learn = {}, parent = {}, abil = {};
      Object.keys(learnIds).forEach(function (k) { learn[k] = learnIds[k].join(' '); });
      Object.keys(sdex).forEach(function (key) {
        var e = sdex[key];
        if (!e || e.num <= 0) return;
        var chain = [key];
        ['changesFrom', 'battleOnly', 'baseSpecies'].forEach(function (f) { var v = e[f]; if (Array.isArray(v)) v = v[0]; if (v) chain.push(id(v)); });
        var owner = chain.filter(function (c) { return learn[c]; })[0];
        if (!owner) return;
        if (owner !== key) parent[key] = owner;
        var a = Object.keys(e.abilities || {}).map(function (s) { return e.abilities[s]; }).filter(Boolean);
        if (a.length) abil[key] = a;
      });
      out.learn = learn; out.parent = parent; out.abil = abil;

      // moves the new learnsets use that the calculator does not know yet
      var known = {}; Object.keys(window.MOVES_CHAMPIONS).forEach(function (m) { known[id(m)] = 1; });
      var newMoves = [];
      Object.keys(learnIds).forEach(function (k) {
        learnIds[k].forEach(function (mid) {
          if (known[mid] || !smoves[mid]) return;
          var nm = smoves[mid].name;
          out.moves[nm] = MV_ALL[nm] ? copy(MV_ALL[nm]) : convertMove(smoves[mid]);
          known[mid] = 1; newMoves.push(nm);
        });
      });
      // abilities of the new species
      Object.keys(addedNames).forEach(function (n) {
        var e = addedNames[n];
        Object.keys(e.abilities || {}).forEach(function (s) {
          var a = e.abilities[s];
          if (a && window.ABILITIES_CHAMPIONS.indexOf(a) === -1 && out.abilities.indexOf(a) === -1) out.abilities.push(a);
        });
      });
      // items allowed in the regulation that the calculator does not offer yet
      var haveItems = {};
      window.ITEMS_CHAMPIONS.concat(Object.keys(out.megas)).forEach(function (it) { haveItems[id(it)] = 1; });
      out.items = (old.items || []).slice();
      var newItems = [];
      itemsLegal.forEach(function (it) {
        if (haveItems[id(it)]) return;
        haveItems[id(it)] = 1; out.items.push(it); newItems.push(it);
      });
      store(KEY_REG, out);
      return { name: out.name, allRegs: out.allRegs, legal: legal.length, added: out.added, moves: newMoves, items: newItems, itemsLegal: itemsLegal.length, skipped: Object.keys(fd).length };
    });
  }

  // ======================= popular sets =======================
  function parseSetdexJs(text) { // NCP setdex file -> object, read as data (no code is executed)
    var body = text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1);
    body = body.replace(/^\s*\/\/.*$/gm, '').replace(/,(\s*[}\]])/g, '$1');
    return JSON.parse(body);
  }
  var STAT_MAP = { hp: 'hp', atk: 'at', def: 'df', spa: 'sa', spd: 'sd', spe: 'sp' };
  function first(v) { return Array.isArray(v) ? v[0] : v; }
  function top(obj) { return Object.keys(obj || {}).sort(function (a, b) { return obj[b] - obj[a]; }); }
  function clampSps(s) { Object.keys(s).forEach(function (k) { s[k] = Math.max(0, Math.min(32, +s[k] || 0)); }); return s; }
  function latest(indexJson, re) {
    var best = null, bestN = -1;
    Object.keys(indexJson || {}).forEach(function (k) { var m = re.exec(k); if (m && +m[1] > bestN) { bestN = +m[1]; best = k; } });
    return best;
  }

  // mapSpecies(name) -> {sp: base species in the calculator, forme} or null (provided by app.js)
  function updateSets(mapSpecies, progress) {
    progress = progress || function () {};
    progress('NCP, data.pkmn.cc');
    var jobs = [
      get(NCP + '?t=' + Date.now()).then(parseSetdexJs),
      get(PKMN + 'stats/index.json', true).then(function (ix) {
        var f = latest(ix, /^gen9championsvgc(\d+)\.json$/);
        if (!f) throw new Error('keine Champions-VGC-Statistik');
        return get(PKMN + 'stats/' + f, true).then(function (d) { d._file = f; return d; });
      }),
      get(PKMN + 'sets/index.json', true).then(function (ix) {
        var f = latest(ix, /^championsvgc(\d+)\.json$/);
        if (!f) throw new Error('keine Champions-VGC-Sets');
        return get(PKMN + 'sets/' + f, true).then(function (d) { return { file: f, data: d }; });
      })
    ];
    return Promise.all(jobs.map(function (p) { return p.then(function (v) { return { ok: true, v: v }; }, function (e) { return { ok: false, e: e }; }); }))
      .then(function (r) {
        var out = { date: new Date().toISOString(), ncp: null, usage: {}, smogon: {}, report: {} };
        var unknown = {};
        function put(target, name, setName, set) {
          var m = mapSpecies(name);
          if (!m) { unknown[name] = 1; return false; }
          if (m.forme) set.forme = m.forme;
          (target[m.sp] = target[m.sp] || {})[setName] = set;
          return true;
        }
        // 1) NCP setdex (complete replacement of the built-in file)
        if (r[0].ok) {
          out.ncp = r[0].v;
          out.report.ncp = Object.keys(out.ncp).reduce(function (n, k) { return n + Object.keys(out.ncp[k]).length; }, 0);
        } else out.report.ncpError = String(r[0].e.message || r[0].e);
        // 2) usage stats: the most used set per Pokémon
        if (r[1].ok) {
          var st = r[1].v, mons = Object.keys(st.pokemon).map(function (n) { return { n: n, d: st.pokemon[n], u: st.pokemon[n].usage.weighted }; })
            .sort(function (a, b) { return b.u - a.u; }).filter(function (x) { return x.u >= 0.005; });
          var cnt = 0;
          mons.forEach(function (x, i) {
            var d = x.d, sp = (top(d.spreads)[0] || 'Hardy:0/0/0/0/0/0').split(':'), v = sp[1].split('/');
            var set = {
              sps: clampSps({ hp: v[0], at: v[1], df: v[2], sa: v[3], sd: v[4], sp: v[5] }), nature: sp[0],
              ability: top(d.abilities)[0], item: top(d.items).filter(function (it) { return it && it !== 'Nothing'; })[0] || '',
              moves: top(d.moves).filter(function (m) { return m && m !== 'Nothing'; }).slice(0, 4)
            };
            if (put(out.usage, x.n, 'Usage #' + (i + 1) + ' (' + (x.u * 100).toFixed(1) + '%)', set)) cnt++;
          });
          out.report.usage = cnt; out.report.usageFile = r[1].v._file; out.report.battles = st.battles;
        } else out.report.usageError = String(r[1].e.message || r[1].e);
        // 3) Smogon sets
        if (r[2].ok) {
          var sd = r[2].v.data, cnt2 = 0;
          Object.keys(sd).forEach(function (mon) {
            Object.keys(sd[mon]).forEach(function (sn) {
              var s = sd[mon][sn], ev = first(s.evs) || {}, sps = { hp: 0, at: 0, df: 0, sa: 0, sd: 0, sp: 0 };
              Object.keys(ev).forEach(function (k) { if (STAT_MAP[k]) sps[STAT_MAP[k]] = ev[k]; });
              var set = { sps: clampSps(sps), nature: first(s.nature) || 'Hardy', item: first(s.item) || '', moves: (s.moves || []).map(first).slice(0, 4) };
              if (s.ability) set.ability = first(s.ability);
              if (put(out.smogon, mon, 'Smogon: ' + sn, set)) cnt2++;
            });
          });
          out.report.smogon = cnt2; out.report.smogonFile = r[2].v.file;
        } else out.report.smogonError = String(r[2].e.message || r[2].e);
        out.report.unknown = Object.keys(unknown);
        if (!out.ncp && !r[1].ok && !r[2].ok) throw new Error([out.report.ncpError, out.report.usageError, out.report.smogonError].join(' | '));
        store(KEY_SETS, out);
        return out.report;
      });
  }

  window.Online = {
    reg: reg,
    sets: load(KEY_SETS),
    updateRegulation: updateRegulation,
    updateSets: updateSets,
    ncpName: ncpName,
    reset: function () { localStorage.removeItem(KEY_REG); localStorage.removeItem(KEY_SETS); }
  };
})();

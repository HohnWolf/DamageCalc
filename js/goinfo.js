// GO-Infografik: Raid- und Feldforschungs-Infografiken für Pokémon GO als PNG (Canvas), Teilen/Kopieren/Speichern.
// Raid: Boss, Stufe, Typen, Schwächen (x1,6 / x2,56), CP-Bereiche, Konter. Feldforschung: Aufgabe -> Belohnungs-Pokémon (optional Shiny).
(function () {
  'use strict';
  var A = window.CC, G = window.GODEX;
  if (!A || !G) return;
  var el = A.el, esc = A.esc;
  var de = A.LANG === 'de';
  var FF = '"Segoe UI",system-ui,Arial,sans-serif';
  var KEY = 'cc_goinfo';

  // ======================= Daten =======================
  var TYPE_COL = { Normal: '#a8a77a', Fire: '#ee8130', Water: '#6390f0', Grass: '#7ac74c', Electric: '#f7d02c', Ice: '#96d9d6', Fighting: '#c22e28', Poison: '#a33ea1', Ground: '#e2bf65', Flying: '#a98ff3', Psychic: '#f95587', Bug: '#a6b91a', Rock: '#b6a136', Ghost: '#735797', Dragon: '#6f35fc', Dark: '#705746', Steel: '#b7b7ce', Fairy: '#d685ad' };
  var TYPE_DE = { Normal: 'Normal', Fire: 'Feuer', Water: 'Wasser', Grass: 'Pflanze', Electric: 'Elektro', Ice: 'Eis', Fighting: 'Kampf', Poison: 'Gift', Ground: 'Boden', Flying: 'Flug', Psychic: 'Psycho', Bug: 'Käfer', Rock: 'Gestein', Ghost: 'Geist', Dragon: 'Drache', Dark: 'Unlicht', Steel: 'Stahl', Fairy: 'Fee' };
  // Angreifer-Typ: [wirkungslos-ähnlich (x0,39), resistent (x0,625), sehr effektiv (x1,6)]
  var EFF = {
    Normal: [['Ghost'], ['Rock', 'Steel'], []], Fire: [[], ['Dragon', 'Fire', 'Rock', 'Water'], ['Bug', 'Grass', 'Ice', 'Steel']],
    Water: [[], ['Dragon', 'Grass', 'Water'], ['Fire', 'Ground', 'Rock']], Grass: [[], ['Bug', 'Dragon', 'Fire', 'Flying', 'Grass', 'Poison', 'Steel'], ['Ground', 'Rock', 'Water']],
    Electric: [['Ground'], ['Dragon', 'Electric', 'Grass'], ['Flying', 'Water']], Ice: [[], ['Fire', 'Ice', 'Steel', 'Water'], ['Dragon', 'Flying', 'Grass', 'Ground']],
    Fighting: [['Ghost'], ['Bug', 'Fairy', 'Flying', 'Poison', 'Psychic'], ['Dark', 'Ice', 'Normal', 'Rock', 'Steel']], Poison: [['Steel'], ['Ghost', 'Ground', 'Poison', 'Rock'], ['Fairy', 'Grass']],
    Ground: [['Flying'], ['Bug', 'Grass'], ['Electric', 'Fire', 'Poison', 'Rock', 'Steel']], Flying: [[], ['Electric', 'Rock', 'Steel'], ['Bug', 'Fighting', 'Grass']],
    Psychic: [['Dark'], ['Psychic', 'Steel'], ['Fighting', 'Poison']], Bug: [[], ['Fairy', 'Fighting', 'Fire', 'Flying', 'Ghost', 'Poison', 'Steel'], ['Dark', 'Grass', 'Psychic']],
    Rock: [[], ['Fighting', 'Ground', 'Steel'], ['Bug', 'Fire', 'Flying', 'Ice']], Ghost: [['Normal'], ['Dark'], ['Ghost', 'Psychic']],
    Dragon: [['Fairy'], ['Steel'], ['Dragon']], Dark: [[], ['Dark', 'Fairy', 'Fighting'], ['Ghost', 'Psychic']],
    Steel: [[], ['Electric', 'Fire', 'Steel', 'Water'], ['Fairy', 'Ice', 'Rock']], Fairy: [[], ['Fire', 'Poison', 'Steel'], ['Dark', 'Dragon', 'Fighting']]
  };
  var TYPES = Object.keys(EFF);
  var TIERS = [['1', '★'], ['3', '★★★'], ['5', '★★★★★'], ['mega', 'Mega'], ['megaleg', 'Mega ★★★★★'], ['shadow1', de ? 'Crypto ★' : 'Shadow ★'], ['shadow3', de ? 'Crypto ★★★' : 'Shadow ★★★'], ['shadow5', de ? 'Crypto ★★★★★' : 'Shadow ★★★★★']];
  var THEMES = {
    night:  { n: de ? 'Nacht' : 'Night', bg1: '#0f172a', bg2: '#1e293b', fg: '#f8fafc', mut: '#94a3b8', card: 'rgba(255,255,255,0.07)', line: 'rgba(255,255,255,0.14)', acc: '#38bdf8' },
    day:    { n: de ? 'Tag' : 'Day', bg1: '#f8fafc', bg2: '#e2e8f0', fg: '#0f172a', mut: '#475569', card: 'rgba(15,23,42,0.06)', line: 'rgba(15,23,42,0.16)', acc: '#0284c7' },
    mystic: { n: 'Weisheit', bg1: '#0b1d4d', bg2: '#1d4ed8', fg: '#ffffff', mut: '#bfdbfe', card: 'rgba(255,255,255,0.10)', line: 'rgba(255,255,255,0.22)', acc: '#93c5fd' },
    valor:  { n: 'Wagemut', bg1: '#4c0b0b', bg2: '#dc2626', fg: '#ffffff', mut: '#fecaca', card: 'rgba(255,255,255,0.10)', line: 'rgba(255,255,255,0.22)', acc: '#fca5a5' },
    inst:   { n: 'Intuition', bg1: '#4a3500', bg2: '#eab308', fg: '#1a1300', mut: '#422f00', card: 'rgba(0,0,0,0.08)', line: 'rgba(0,0,0,0.18)', acc: '#7c5a00' }
  };
  var SIZES = { post: [1080, 1350, de ? 'Beitrag 4:5' : 'Post 4:5'], story: [1080, 1920, 'Story 9:16'], wide: [1600, 900, de ? 'Breit 16:9' : 'Wide 16:9'], square: [1080, 1080, de ? 'Quadrat 1:1' : 'Square 1:1'] };
  var TASKS = de
    ? ['Fange 5 Pokémon', 'Fange 10 Pokémon', 'Wirf 3 Curvebälle in Folge', 'Wirf 5 Prächtige Würfe', 'Erledige 3 Raids', 'Gewinne einen Raid', 'Fange ein Pokémon mit Wetterbonus', 'Tausche ein Pokémon', 'Entwickle ein Pokémon', 'Brüte ein Ei aus', 'Fange 3 Pokémon eines Typs', 'Drehe 5 PokéStops', 'Verschicke ein Geschenk', 'Gewinne 3 Trainerkämpfe']
    : ['Catch 5 Pokémon', 'Catch 10 Pokémon', 'Make 3 Curveball Throws in a row', 'Make 5 Excellent Throws', 'Win 3 Raids', 'Win a Raid', 'Catch a weather-boosted Pokémon', 'Trade a Pokémon', 'Evolve a Pokémon', 'Hatch an Egg', 'Catch 3 Pokémon of a type', 'Spin 5 PokéStops', 'Send a Gift', 'Win 3 Trainer Battles'];

  // ======================= Pokémon-Suche =======================
  var byKey = null, speciesNames = null;
  function norm(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9äöüß]/g, ''); }
  function buildIndex() {
    if (byKey) return;
    byKey = {}; speciesNames = [];
    var seen = {};
    G.mons.forEach(function (m) {
      var k = norm(m[1]) + '|' + norm(m[2]);
      var en = m[1], loc = A.nSpecies(m[1]);
      var label = (loc || en) + (m[2] ? ' (' + m[2] + ')' : '');
      byKey[norm(en) + norm(m[2])] = m; byKey[norm(loc) + norm(m[2])] = m;
      if (!m[2]) { if (!byKey[norm(en)]) byKey[norm(en)] = m; if (!byKey[norm(loc)]) byKey[norm(loc)] = m; }
      if (!seen[k]) { seen[k] = 1; speciesNames.push(label); }
    });
  }
  // Eingabe wie "Glurak", "Charizard Mega-X", "Mewtu (Mega-Y)" -> Eintrag
  function findMon(txt) {
    buildIndex();
    var t = String(txt || '').trim(); if (!t) return null;
    var m = /^(.+?)\s*[(\-]\s*(.+?)\)?$/.exec(t);
    var direct = byKey[norm(t)]; if (direct) return direct;
    if (m) { var f = byKey[norm(m[1]) + norm(m[2])]; if (f) return f; }
    var sp = t.split(/\s+/);
    if (sp.length > 1) { var g = byKey[norm(sp[0]) + norm(sp.slice(1).join(''))] || byKey[norm(sp.slice(0, -1).join('')) + norm(sp[sp.length - 1])]; if (g) return g; }
    return null;
  }
  function monName(m) { var n = A.nSpecies(m[1]) || m[1]; return m[2] ? n + ' (' + m[2] + ')' : n; }

  function cpOf(m, lvl, iv) {
    var cpm = G.cpm[String(lvl)]; if (!cpm) return 0;
    return Math.max(10, Math.floor((m[4] + iv) * Math.sqrt(m[5] + iv) * Math.sqrt(m[6] + iv) * cpm * cpm / 10));
  }
  // Bei Mega-/Primal-Raids und Sonderformen (Zacian/Zamazenta gekrönt, Fusionen, Calyrex-Reiter, Eternamax) fängt man die Normalform
  function catchMon(m) {
    if (!m || !m[2]) return m;
    var f = m[2], n = m[0];
    var base = /^(Mega|Primal|Terastal|Eternamax)/.test(f) ||
      ((n === 888 || n === 889) && f === 'Crowned') ||
      (n === 646 && /^(Black|White)$/.test(f)) ||
      (n === 800 && /^(Dusk-Mane|Dawn-Wings|Ultra)$/.test(f)) ||
      (n === 898 && /^(Ice|Shadow)$/.test(f));
    if (!base) return m;
    for (var i = 0; i < G.mons.length; i++) if (G.mons[i][0] === n && !G.mons[i][2]) return G.mons[i];
    return m;
  }
  // Boss-Stufe der Infografik -> Raid-Stufe des Top Counters (0 = automatisch)
  var GO_TIER = { '1': 1, '3': 3, '5': 5, mega: 4, megaleg: 6, shadow1: 1, shadow3: 3, shadow5: 5 };
  function shadowTxt() { return de ? 'Crypto' : 'Shadow'; }
  function labelOf(r) { return r.label === 'Normal' ? '' : r.label; }
  function monByNumLabel(num, lab) {
    var i;
    for (i = 0; i < G.mons.length; i++) if (G.mons[i][0] === num && (G.mons[i][2] || '') === lab) return G.mons[i];
    for (i = 0; i < G.mons.length; i++) if (G.mons[i][0] === num) return G.mons[i];
    return null;
  }
  function topCounters(boss, n) {
    if (!boss || !window.CCGoCounter || !window.CCGoCounter.bossCounters) return [];
    try { return window.CCGoCounter.bossCounters(boss[0], boss[2], GO_TIER[st.tier] || 0, n); } catch (e) { return []; }
  }
  function withMoves(r, mm) { return { m: mm, shadow: !!r.shadow, fm: r.fm, fmT: r.fmT, fmE: r.fmE, cm: r.cm, cmT: r.cmT, cmE: r.cmE }; }
  function counterList(boss, max) {
    if (st.cmode === 'auto') {
      return topCounters(boss, max).map(function (r) { var mm = monByNumLabel(r.num, labelOf(r)); return mm ? withMoves(r, mm) : null; }).filter(Boolean);
    }
    var all = null;
    return st.counters.split(/[,;\n]+/).map(function (x) { return findMon(x); }).filter(Boolean).slice(0, max).map(function (mm) {
      all = all || topCounters(boss, 60); // Attacken aus der Top-Counter-Rangliste, falls das Pokémon dort vorkommt
      var hit = all.filter(function (r) { return r.num === mm[0] && labelOf(r) === (mm[2] || ''); })[0];
      return hit ? withMoves(hit, mm) : { m: mm, shadow: false };
    });
  }
  function weaknesses(types) {
    var out = [];
    TYPES.forEach(function (at) {
      var mult = 1;
      types.forEach(function (dt) {
        var e = EFF[at];
        if (e[0].indexOf(dt) !== -1) mult *= 0.390625; else if (e[1].indexOf(dt) !== -1) mult *= 0.625; else if (e[2].indexOf(dt) !== -1) mult *= 1.6;
      });
      if (mult > 1.01) out.push([at, mult]);
    });
    return out.sort(function (a, b) { return b[1] - a[1]; });
  }

  // ======================= Zustand =======================
  var DEF = {
    kind: 'raid', theme: 'night', size: 'post', title: '', sub: '', date: '', note: '', shinyOk: true, brand: true,
    boss: 'Mewtwo', tier: '5', counters: '', cmode: 'auto', ccount: 6, rday: false,
    rows: [{ task: '', rewards: [] }]
  };
  var st = (function () {
    var s = {};
    try { s = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { s = {}; }
    var o = {}; Object.keys(DEF).forEach(function (k) { o[k] = s[k] != null ? s[k] : DEF[k]; });
    o.rows = (Array.isArray(o.rows) ? o.rows : []).map(function (r) {
      var rw = r.rewards;
      if (typeof rw === 'string') { // alte Freitext-Version -> Auswahlliste
        rw = rw.split(/[,;\n]+/).map(function (x) { return x.trim(); }).filter(Boolean).map(function (x) {
          return { name: x.replace(/(\*|✨|\bshiny\b)/ig, '').trim(), shiny: !!r.shiny || /(\*|✨|\bshiny\b)/i.test(x) };
        });
      }
      return { task: r.task || '', rewards: Array.isArray(rw) ? rw : [] };
    });
    if (!o.rows.length) o.rows = [{ task: '', rewards: [] }];
    return o;
  })();
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* voll: egal */ } }

  // ======================= Bilder =======================
  var SPR = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/', JSD = 'https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/';
  var imgCache = {};
  function loadImg(url) {
    if (imgCache[url]) return imgCache[url];
    return (imgCache[url] = new Promise(function (res) {
      var i = new Image(); i.crossOrigin = 'anonymous';
      i.onload = function () { res(i); }; i.onerror = function () { res(null); }; i.src = url;
    }));
  }
  function apiId(m) {
    var IDS = window.POKEAPI_IDS || {}, base = norm(m[1]).replace(/[äöü]/g, ''), f = (m[2] || '').toLowerCase();
    if (f) {
      var suffix = f.replace(/^mega[- ]?/, 'mega-').replace(/^megax$/, 'mega-x').replace(/^megay$/, 'mega-y').replace(/^(alola|alolan)$/, 'alola').replace(/^(galar|galarian)$/, 'galar').replace(/^(hisui|hisuian)$/, 'hisui').replace(/^paldea.*$/, 'paldea').replace(/-$/, '');
      var slug = String(m[1]).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + suffix;
      if (IDS[slug]) return IDS[slug];
    }
    return m[0] || IDS[base] || 0;
  }
  function loadMon(m, shiny) {
    var id = apiId(m); if (!id) return Promise.resolve(null);
    var sh = shiny ? 'shiny/' : '';
    var urls = [SPR + 'pokemon/other/home/' + sh + id + '.png', JSD + 'pokemon/other/home/' + sh + id + '.png', SPR + 'pokemon/other/official-artwork/' + sh + id + '.png'];
    return urls.reduce(function (p, u) { return p.then(function (im) { return im || loadImg(u); }); }, Promise.resolve(null));
  }

  // ======================= Canvas-Helfer =======================
  function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  function fit(c, txt, maxW, size, wt, min) { var s = size; for (;;) { c.font = wt + ' ' + s + 'px ' + FF; if (c.measureText(txt).width <= maxW || s <= (min || 12)) break; s -= 1; } return s; }
  function wrap(c, txt, maxW) {
    var words = String(txt).split(/\s+/), lines = [], cur = '';
    words.forEach(function (w) { var t = cur ? cur + ' ' + w : w; if (c.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; });
    if (cur) lines.push(cur);
    return lines;
  }
  function drawImg(c, im, x, y, w, h, fallback) {
    if (!im) { c.fillStyle = 'rgba(128,128,128,0.5)'; c.font = 'bold ' + Math.round(h * 0.5) + 'px ' + FF; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(fallback || '?', x + w / 2, y + h / 2); c.textBaseline = 'alphabetic'; c.textAlign = 'left'; return; }
    var k = Math.min(w / im.width, h / im.height); var iw = im.width * k, ih = im.height * k;
    c.drawImage(im, x + (w - iw) / 2, y + (h - ih) / 2, iw, ih);
  }
  function chip(c, txt, x, y, h, bg, fg, size) {
    c.font = 'bold ' + size + 'px ' + FF; var w = c.measureText(txt).width + h * 0.9;
    rr(c, x, y, w, h, h / 2); c.fillStyle = bg; c.fill();
    c.fillStyle = fg; c.textBaseline = 'middle'; c.textAlign = 'left'; c.fillText(txt, x + h * 0.45, y + h / 2 + 1); c.textBaseline = 'alphabetic';
    return w;
  }
  function textOn(hex) { var n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255; return (r * 299 + g * 587 + b * 114) / 1000 > 150 ? '#111827' : '#ffffff'; }
  function sparkle(c, cx, cy, r, col) {
    c.save(); c.fillStyle = col; c.beginPath();
    for (var i = 0; i < 8; i++) { var a = i * Math.PI / 4, rad = i % 2 ? r * 0.28 : r; c.lineTo(cx + Math.cos(a - Math.PI / 2) * rad, cy + Math.sin(a - Math.PI / 2) * rad); }
    c.closePath(); c.fill(); c.restore();
  }
  function fmtN(x) { return x.toFixed(2).replace(/\.?0+$/, '').replace('.', de ? ',' : '.'); }

  function background(c, W, H, T, tint) {
    var g = c.createLinearGradient(0, 0, W * 0.4, H); g.addColorStop(0, T.bg1); g.addColorStop(1, T.bg2);
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    if (tint) {
      var r = c.createRadialGradient(W * 0.5, H * 0.3, 0, W * 0.5, H * 0.3, W * 0.8);
      r.addColorStop(0, tint + '55'); r.addColorStop(1, tint + '00'); c.fillStyle = r; c.fillRect(0, 0, W, H);
    }
    c.save(); c.globalAlpha = 0.05; c.strokeStyle = T.fg; c.lineWidth = 3;
    var R = W * 0.9; c.beginPath(); c.arc(W * 1.05, H * 1.0, R, 0, Math.PI * 2); c.stroke(); c.beginPath(); c.arc(W * 1.05, H * 1.0, R * 0.55, 0, Math.PI * 2); c.stroke(); c.restore();
  }

  function header(c, W, P, y, T, kicker, kcol) {
    var kh = 52 * P.s;
    var w = chip(c, kicker, P.m, y, kh, kcol, textOn(kcol), 26 * P.s);
    var ty = y + kh + 18 * P.s;
    var title = st.title.trim(), sub = st.sub.trim(), date = st.date.trim();
    if (title) { c.fillStyle = T.fg; var sz = fit(c, title, W - 2 * P.m, 64 * P.s, '800', 28); c.fillText(title, P.m, ty + sz * 0.85); ty += sz * 1.15; }
    if (sub) { c.fillStyle = T.mut; var sz2 = fit(c, sub, W - 2 * P.m, 32 * P.s, '600', 16); c.fillText(sub, P.m, ty + sz2 * 0.9 + 6 * P.s); ty += sz2 * 1.3 + 6 * P.s; }
    if (date) { c.fillStyle = T.acc; var sz3 = fit(c, date, W - 2 * P.m, 30 * P.s, '700', 16); c.fillText('📅 ' + date, P.m, ty + sz3 * 0.9 + 8 * P.s); ty += sz3 * 1.3 + 8 * P.s; }
    return ty + 8 * P.s;
  }
  function footer(c, W, H, P, T) {
    var y = H - P.m * 0.55;
    if (st.note.trim()) { c.fillStyle = T.mut; c.textAlign = 'left'; fit(c, st.note.trim(), W - 2 * P.m - (st.brand ? 260 * P.s : 0), 24 * P.s, '500', 13); c.fillText(st.note.trim(), P.m, y); }
    if (st.brand) { c.fillStyle = T.mut; c.globalAlpha = 0.8; c.font = '600 ' + 22 * P.s + 'px ' + FF; c.textAlign = 'right'; c.fillText('Rattata Lab · Pokémon GO', W - P.m, y); c.textAlign = 'left'; c.globalAlpha = 1; }
  }
  function sectionLabel(c, txt, x, y, T, s) { rr(c, x, y - 21 * s, 6 * s, 26 * s, 3 * s); c.fillStyle = T.acc; c.fill(); c.fillStyle = T.mut; c.font = '700 ' + 24 * s + 'px ' + FF; c.textAlign = 'left'; c.fillText(txt.toUpperCase(), x + 18 * s, y); }

  // ======================= Raid =======================
  async function drawRaid(c, W, H, P, T) {
    var m = findMon(st.boss);
    var tierLbl = (TIERS.filter(function (t) { return t[0] === st.tier; })[0] || TIERS[2])[1];
    var types = m ? m[3] : [];
    var tint = types[0] ? TYPE_COL[types[0]] : T.acc;
    background(c, W, H, T, tint);
    var wide = W > H * 1.2, s = P.s;
    var shadow = /^shadow/.test(st.tier);
    var kicker = (de ? 'RAID · ' : 'RAID · ') + tierLbl;
    var top = header(c, wide ? W * 0.5 : W, P, P.m, T, kicker, shadow ? '#7c3aed' : (st.tier.indexOf('mega') === 0 ? '#f97316' : '#fbbf24'));
    var bossIm = m ? await loadMon(m, false) : null;
    var cm0 = catchMon(m), shIm = (st.shinyOk && cm0) ? await loadMon(cm0, true) : null;
    var weak = m ? weaknesses(types) : [];
    var cnt = counterList(m, Math.min(st.ccount || 6, wide ? 8 : 6));
    var cntIm = await Promise.all(cnt.map(function (x) { return loadMon(x.m, false); }));

    // ---------- Bausteine ----------
    function infoCard(x, y, w, h, label, val, hi, sprite, inside) {
      rr(c, x, y, w, h, 20 * s); c.fillStyle = T.card; c.fill(); c.strokeStyle = T.line; c.lineWidth = 2; c.stroke();
      if (hi) { rr(c, x, y, 8 * s, h, 4 * s); c.fillStyle = hi; c.fill(); }
      var pad = 24 * s, sw = sprite ? (inside ? Math.min(h * 0.92, 120 * s) : 100 * s) : 0;
      var tw = w - pad - 16 * s - (inside ? sw : 0);
      c.textAlign = 'left'; c.fillStyle = T.mut; var ll = label.split('\n').slice(0, 2);
      ll.forEach(function (t, k) { fit(c, t, tw, k ? 17 * s : 20 * s, '600', 10); c.fillText(t, x + pad, y + h * 0.30 + k * 22 * s - (ll.length - 1) * 8 * s); });
      c.fillStyle = hi || T.fg; fit(c, val, tw, Math.min(46 * s, h * 0.42), '800', 16); c.fillText(val, x + pad, y + h * 0.78);
      if (sprite) { if (inside) drawImg(c, sprite, x + w - sw - 8 * s, y + (h - sw) / 2, sw, sw); else drawImg(c, sprite, x + w - sw * 0.8, y - sw * 0.35, sw, sw); }
    }
    function drawWeak(x, y, w) {
      var chH = 54 * s, gap = 12 * s, cx = x, rowY = y, n = 1;
      weak.forEach(function (wk) {
        var label = (de ? TYPE_DE[wk[0]] : wk[0]) + '  ×' + fmtN(wk[1]);
        c.font = 'bold ' + 25 * s + 'px ' + FF; var cwid = c.measureText(label).width + chH * 0.9;
        if (cx + cwid > x + w) { cx = x; rowY += chH + gap; n++; }
        chip(c, label, cx, rowY, chH, TYPE_COL[wk[0]], textOn(TYPE_COL[wk[0]]), 25 * s);
        if (wk[1] > 2) { c.strokeStyle = '#fff'; c.lineWidth = 3; rr(c, cx, rowY, cwid, chH, chH / 2); c.stroke(); }
        cx += cwid + gap;
      });
      if (!weak.length) { c.fillStyle = T.mut; c.font = '500 ' + 26 * s + 'px ' + FF; c.fillText('–', x, rowY + 36 * s); }
      return n * (chH + gap) - gap;
    }
    function weakRows(w) {
      var chH = 54 * s, gap = 12 * s, cx = 0, n = 1; c.font = 'bold ' + 25 * s + 'px ' + FF;
      weak.forEach(function (wk) { var cwid = c.measureText((de ? TYPE_DE[wk[0]] : wk[0]) + '  ×' + fmtN(wk[1])).width + chH * 0.9; if (cx + cwid > w) { cx = 0; n++; } cx += cwid + gap; });
      return n * (chH + gap) - gap;
    }
    function drawCounters(x, y, w, availH, per, cellH0) {
      var hasEl = cnt.some(function (q) { return q.fmE || q.cmE; });
      sectionLabel(c, (de ? 'Empfohlene Konter' : 'Recommended counters') + (hasEl ? (de ? '   (* = Elite-Attacke)' : '   (* = Elite move)') : ''), x, y, T, s); y += 22 * s;
      var gap = 12 * s, rowsN = Math.ceil(cnt.length / per), colW = (w - (per - 1) * gap) / per;
      var cellH = Math.max(86 * s, Math.min(cellH0, (availH - 22 * s - (rowsN - 1) * gap) / rowsN));
      cnt.forEach(function (q, i) {
        var col = i % per, rw = Math.floor(i / per), x0 = x + col * (colW + gap), y0 = y + rw * (cellH + gap);
        rr(c, x0, y0, colW, cellH, 18 * s); c.fillStyle = T.card; c.fill(); c.strokeStyle = T.line; c.lineWidth = 2; c.stroke();
        var im = Math.min(cellH - 12 * s, colW * 0.4); drawImg(c, cntIm[i], x0 + 8 * s, y0 + (cellH - im) / 2, im, im, '?');        // Rang-Plakette
        c.fillStyle = i === 0 ? '#fbbf24' : T.line; c.beginPath(); c.arc(x0 + 20 * s, y0 + 20 * s, 14 * s, 0, Math.PI * 2); c.fill();
        c.fillStyle = i === 0 ? '#1a1300' : T.fg; c.font = '800 ' + 17 * s + 'px ' + FF; c.textAlign = 'center'; c.fillText(String(i + 1), x0 + 20 * s, y0 + 26 * s);
        var tx = x0 + im + 18 * s, tw = colW - im - 28 * s, mv = [[q.fm, q.fmT, q.fmE], [q.cm, q.cmT, q.cmE]].filter(function (a) { return a[0]; });
        c.textAlign = 'left'; var nm = monName(q.m);
        var ny = mv.length ? y0 + cellH * 0.36 : y0 + cellH / 2 + 8 * s;
        c.fillStyle = T.fg; fit(c, nm, tw, 26 * s, '800', 12); c.fillText(nm, tx, ny);
        if (q.shadow) { var sh = shadowTxt().toUpperCase(); c.font = '800 ' + 14 * s + 'px ' + FF; var shw = c.measureText(sh).width + 14 * s; rr(c, x0 + colW - shw - 8 * s, y0 + 6 * s, shw, 22 * s, 11 * s); c.fillStyle = '#7c3aed'; c.fill(); c.fillStyle = '#fff'; c.fillText(sh, x0 + colW - shw - 1 * s, y0 + 22 * s); }
        mv.forEach(function (a, k) {
          var my = ny + 30 * s + k * 28 * s, txt = a[0] + (a[2] ? ' *' : ''), f2 = fit(c, txt, tw - 20 * s, 20 * s, '600', 10);
          c.fillStyle = TYPE_COL[a[1]] || T.mut; c.beginPath(); c.arc(tx + 6 * s, my - f2 * 0.32, 6 * s, 0, Math.PI * 2); c.fill();
          c.fillStyle = T.fg; c.globalAlpha = 0.92; c.fillText(txt, tx + 20 * s, my); c.globalAlpha = 1;
        });
      });
    }
    function bossBlock(cx, cy, rad, stageW) {
      var halo = c.createRadialGradient(cx, cy, 0, cx, cy, rad * 1.1); halo.addColorStop(0, tint + 'bb'); halo.addColorStop(0.7, tint + '33'); halo.addColorStop(1, tint + '00');
      c.fillStyle = halo; c.beginPath(); c.arc(cx, cy, rad * 1.1, 0, Math.PI * 2); c.fill();
      c.save(); c.strokeStyle = tint; c.globalAlpha = 0.35; c.lineWidth = 3 * s; c.beginPath(); c.arc(cx, cy, rad * 0.98, 0, Math.PI * 2); c.stroke(); c.restore();
      c.save(); c.fillStyle = 'rgba(0,0,0,0.28)'; c.beginPath(); c.ellipse(cx, cy + rad * 0.92, rad * 0.62, rad * 0.10, 0, 0, Math.PI * 2); c.fill(); c.restore();
      drawImg(c, bossIm, cx - rad, cy - rad, rad * 2, rad * 2, '?');
      var ny = cy + rad + 62 * s;
      if (!m) { c.fillStyle = T.mut; c.textAlign = 'center'; c.font = '600 ' + 30 * s + 'px ' + FF; c.fillText(de ? 'Boss wählen' : 'Pick a boss', cx, ny); c.textAlign = 'left'; return ny; }
      var nm = monName(m); c.fillStyle = T.fg; c.textAlign = 'center'; fit(c, nm, stageW, 62 * s, '800', 24); c.fillText(nm, cx, ny);
      var tw = 0, th = 44 * s; c.font = 'bold ' + 24 * s + 'px ' + FF;
      var widths = types.map(function (t) { return c.measureText(de ? TYPE_DE[t] : t).width + th * 0.9 + 8 * s; });
      var sum = widths.reduce(function (a, b) { return a + b; }, 0), tx = cx - sum / 2 + 4 * s;
      types.forEach(function (t, i) { chip(c, de ? TYPE_DE[t] : t, tx + tw, ny + 16 * s, th, TYPE_COL[t], textOn(TYPE_COL[t]), 24 * s); tw += widths[i]; });
      c.textAlign = 'left';
      return ny + 16 * s + th;
    }
    var cpLabel = (de ? 'Fang-CP Lv 20' : 'Catch CP Lv 20') + (cm0 !== m ? '\n' + (de ? 'Normalform' : 'base form') : '');
    var cps = m ? [
      [cpLabel, cpOf(cm0, 20, 10) + ' – ' + cpOf(cm0, 20, 15), null, null],
      [de ? 'Wetter-CP Lv 25' : 'Boosted CP Lv 25', cpOf(cm0, 25, 10) + ' – ' + cpOf(cm0, 25, 15), null, null],
      ['Shiny', st.shinyOk ? (de ? 'möglich ✨' : 'possible ✨') : (de ? 'nein' : 'no'), st.shinyOk ? '#fbbf24' : null, st.shinyOk ? shIm : null]
    ] : [];

    if (wide) {
      var stageX = P.m, stageW = W * 0.4, stageY = top, infoX = W * 0.5, infoW = W - infoX - P.m, y = P.m + 70 * s;
      var rad = Math.max(60 * s, Math.min(stageW * 0.48, (H - top - P.m * 1.2 - 140 * s) / 2));
      bossBlock(stageX + stageW / 2, stageY + rad * 1.02, rad, stageW);
      if (m) {
        var cw = (infoW - 2 * 16 * s) / 3, chh = 120 * s;
        cps.forEach(function (cd, i) { infoCard(infoX + i * (cw + 16 * s), y, cw, chh, cd[0], cd[1], cd[2], cd[3], false); });
        y += chh + 30 * s;
        sectionLabel(c, de ? 'Schwächen' : 'Weaknesses', infoX, y, T, s); y += 22 * s;
        y += drawWeak(infoX, y, infoW) + 34 * s;
      }
      if (cnt.length) drawCounters(infoX, y, infoW, H - y - P.m * 1.3, 2, 130 * s);
    } else {
      var fr = P.m * 1.3, R = H - top - fr, gp = 32 * s, x0 = P.m, W0 = W - 2 * P.m;
      var per = cnt.length > 4 ? 3 : (cnt.length > 2 ? 2 : Math.max(1, cnt.length)), cellH0 = 136 * s, heroMax = H > W * 1.5 ? 760 * s : 620 * s;
      var rowsN = Math.ceil(cnt.length / per);
      var cntH = cnt.length ? 22 * s + rowsN * (cellH0 + 12 * s) - 12 * s : 0;
      var wkH = m ? 22 * s + weakRows(W0) : 0;
      var heroH = R - cntH - wkH - gp * (m ? 2 : 1) - (cnt.length ? 0 : 0);
      heroH = Math.max(250 * s, Math.min(heroH, heroMax));
      if (cnt.length) { var left = R - heroH - cntH - wkH - gp * 2; if (left > 0) cellH0 = Math.min(210 * s, cellH0 + left / rowsN); }
      var avCnt = H - fr - top - heroH - wkH - gp * 2;
      var sw = W0 * 0.5, rad2 = Math.min(sw * 0.5, (heroH - 130 * s) / 2);
      bossBlock(x0 + sw / 2, top + rad2 + 6 * s, rad2, sw - 10 * s);
      if (m) {
        var cx0 = x0 + sw + 20 * s, cw2 = W0 - sw - 20 * s, ch2 = (heroH - 2 * 14 * s) / 3;
        cps.forEach(function (cd, i) { infoCard(cx0, top + i * (ch2 + 14 * s), cw2, ch2, cd[0], cd[1], cd[2], cd[3], true); });
      }
      var y2 = top + heroH + gp;
      if (m) { sectionLabel(c, de ? 'Schwächen' : 'Weaknesses', x0, y2, T, s); y2 += 22 * s; y2 += drawWeak(x0, y2, W0) + gp + 10 * s; }
      if (cnt.length) drawCounters(x0, y2, W0, H - fr - y2, per, cellH0);
    }
  }

  // ======================= Feldforschung =======================
  function parseRewards(list) {
    return (list || []).map(function (x) { return { mon: findMon(x.name), raw: x.name, shiny: !!x.shiny }; }).slice(0, 6);
  }
  async function drawResearch(c, W, H0, P, T, cv) {
    var s = P.s, wide = W > H0 * 1.2;
    var rows = st.rows.filter(function (r) { return r.task.trim() || r.rewards.length; });
    var parsed = rows.map(function (r) { return { task: r.task.trim(), rw: parseRewards(r.rewards), shiny: false }; });
    var cols = wide ? 2 : 1, n = Math.max(1, parsed.length);
    var rday = !!st.rday, rowH = (rday ? 200 : 150) * s, gap = 14 * s, hd = 190 * s + (st.sub.trim() ? 40 * s : 0) + (st.date.trim() ? 40 * s : 0) + (st.title.trim() ? 50 * s : 0);
    var need = hd + Math.ceil(n / cols) * (rowH + gap) + P.m * 1.6;
    var H = Math.max(H0, Math.round(need));
    if (wide) H = Math.max(H0, Math.round(need));
    cv.height = H; // Höhe wächst mit der Zeilenzahl
    c = cv.getContext('2d'); c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
    background(c, W, H, T, T.acc);
    var top = header(c, W, P, P.m, T, rday ? (de ? 'FORSCHUNGSTAG' : 'RESEARCH DAY') : (de ? 'FELDFORSCHUNG' : 'FIELD RESEARCH'), '#22c55e');
    if (rday) { c.fillStyle = T.mut; c.font = '500 ' + 22 * s + 'px ' + FF; c.fillText(de ? 'CP bei Fang aus der Forschung: Lv 15 · IV 10–15 (☁ = Wetterbonus, Lv 20)' : 'Catch CP from research: Lv 15 · IV 10–15 (☁ = weather boost, Lv 20)', P.m, top + 22 * s); top += 44 * s; }
    var avail = H - top - P.m * 1.4, perCol = Math.ceil(n / cols);
    rowH = Math.min((rday ? 240 : 190) * s, (avail - (perCol - 1) * gap) / perCol); rowH = Math.max(rowH, (rday ? 150 : 100) * s);
    var cw = (W - 2 * P.m - (cols - 1) * 20 * s) / cols;
    var imgs = await Promise.all(parsed.map(function (r) { return Promise.all(r.rw.map(function (x) { return x.mon ? loadMon(x.mon, x.shiny || r.shiny) : Promise.resolve(null); })); }));
    parsed.forEach(function (r, i) {
      var col = Math.floor(i / perCol), rw = i % perCol, x = P.m + col * (cw + 20 * s), y = top + rw * (rowH + gap);
      if (cols === 1) { col = 0; rw = i; x = P.m; y = top + i * (rowH + gap); }
      rr(c, x, y, cw, rowH, 22 * s); c.fillStyle = T.card; c.fill(); c.strokeStyle = T.line; c.lineWidth = 2; c.stroke();
      var tw = cw * 0.40 - 24 * s; c.fillStyle = T.fg;
      var sz = 30 * s; c.font = '700 ' + sz + 'px ' + FF;
      var lines = wrap(c, r.task || '–', tw);
      while (lines.length * sz * 1.2 > rowH - 20 * s && sz > 14 * s) { sz -= 1; c.font = '700 ' + sz + 'px ' + FF; lines = wrap(c, r.task || '–', tw); }
      var ty = y + rowH / 2 - (lines.length - 1) * sz * 0.6;
      lines.forEach(function (ln, j) { c.fillText(ln, x + 22 * s, ty + j * sz * 1.2 + sz * 0.35); });
      // Pfeil
      var ax = x + cw * 0.40; c.strokeStyle = T.acc; c.lineWidth = 5 * s; c.lineCap = 'round'; c.beginPath(); c.moveTo(ax, y + rowH / 2); c.lineTo(ax + 28 * s, y + rowH / 2); c.moveTo(ax + 18 * s, y + rowH / 2 - 10 * s); c.lineTo(ax + 28 * s, y + rowH / 2); c.lineTo(ax + 18 * s, y + rowH / 2 + 10 * s); c.stroke();
      var rx = ax + 44 * s, rwid = x + cw - rx - 12 * s, k = Math.max(1, r.rw.length), slot = Math.min(rowH - 14 * s, rwid / k);
      r.rw.forEach(function (rewd, j) {
        var sx = rx + j * slot, isSh = rewd.shiny || r.shiny;
        var lblH = rday && rewd.mon ? 70 * s : 24 * s;
        drawImg(c, imgs[i][j], sx, y + 4 * s, slot, rowH - 8 * s - lblH, rewd.raw);
        if (isSh) sparkle(c, sx + slot - 12 * s, y + 18 * s, 14 * s, '#fbbf24');
        c.fillStyle = T.mut; c.textAlign = 'center'; var nmx = rewd.mon ? monName(rewd.mon) : rewd.raw; var nmY = rday && rewd.mon ? y + rowH - 50 * s : y + rowH - 10 * s;
        fit(c, nmx, slot - 4 * s, 18 * s, '600', 10); c.fillText(nmx, sx + slot / 2, nmY);
        if (rday && rewd.mon) {
          var cmn = catchMon(rewd.mon), c1 = cpOf(cmn, 15, 10) + ' – ' + cpOf(cmn, 15, 15), c2 = '☁ ' + cpOf(cmn, 20, 10) + ' – ' + cpOf(cmn, 20, 15);
          c.fillStyle = T.fg; fit(c, 'CP ' + c1, slot - 4 * s, 22 * s, '800', 10); c.fillText('CP ' + c1, sx + slot / 2, nmY + 24 * s);
          c.fillStyle = T.mut; fit(c, c2, slot - 4 * s, 18 * s, '600', 9); c.fillText(c2, sx + slot / 2, nmY + 46 * s);
        }
        c.textAlign = 'left';
      });
    });
    footer(c, W, H, P, T);
    return H;
  }

  async function renderCanvas() {
    var sz = SIZES[st.size] || SIZES.post, T = THEMES[st.theme] || THEMES.night, SC = 1;
    var W = sz[0], H = sz[1], P = { s: W > H * 1.2 ? H / 1080 * 1.05 : W / 1080, m: Math.round(W * (W > H * 1.2 ? 0.04 : 0.055)) };
    var cv = document.createElement('canvas'); cv.width = W * SC; cv.height = H * SC;
    var c = cv.getContext('2d'); c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high'; c.textBaseline = 'alphabetic';
    if (st.kind === 'raid') { await drawRaid(c, W, H, P, T); footer(c, W, H, P, T); }
    else { await drawResearch(c, W, H, P, T, cv); }
    return cv;
  }

  // ======================= UI =======================
  var root = null, token = 0, timer = 0, lastCv = null;
  function field(label, node) { var w = el('label', { class: 'gi-f' }); w.appendChild(el('span', { class: 'gi-l', text: label })); w.appendChild(node); return w; }
  function input(key, ph, list) {
    var i = el('input', { type: 'text', spellcheck: 'false', placeholder: ph || '' }); i.value = st[key] || '';
    if (list) i.setAttribute('list', list);
    i.addEventListener('input', function () { st[key] = i.value; save(); refresh(); });
    return i;
  }
  function seg(items, cur, fn) {
    var w = el('div', { class: 'gi-seg' });
    items.forEach(function (it) {
      var b = el('button', { type: 'button', class: cur === it[0] ? 'on' : '', text: it[1] });
      b.addEventListener('click', function () { fn(it[0]); }); w.appendChild(b);
    });
    return w;
  }
  function select(items, cur, fn) {
    var s = el('select'); items.forEach(function (it) { var o = el('option', { value: it[0], text: it[1] }); if (it[0] === cur) o.selected = true; s.appendChild(o); });
    s.addEventListener('change', function () { fn(s.value); }); return s;
  }
  function check(label, key) {
    var w = el('label', { class: 'gi-chk' }); var i = el('input', { type: 'checkbox' }); i.checked = !!st[key];
    i.addEventListener('change', function () { st[key] = i.checked; save(); refresh(); });
    w.appendChild(i); w.appendChild(el('span', { text: label })); return w;
  }

  function render() {
    root = document.getElementById('goinfoView'); if (!root) return;
    buildIndex();
    root.innerHTML = '';
    var lay = el('div', { class: 'gi-layout' });
    var side = el('aside', { class: 'panel gi-side' });
    var dl = el('datalist', { id: 'giMons' }); dl.innerHTML = speciesNames.map(function (n) { return '<option value="' + esc(n) + '">'; }).join(''); side.appendChild(dl);
    var dt = el('datalist', { id: 'giTasks' }); dt.innerHTML = TASKS.map(function (n) { return '<option value="' + esc(n) + '">'; }).join(''); side.appendChild(dt);

    side.appendChild(seg([['raid', de ? 'Raid' : 'Raid'], ['research', de ? 'Feldforschung' : 'Field Research']], st.kind, function (v) { st.kind = v; save(); render(); }));
    side.appendChild(field(de ? 'Titel' : 'Title', input('title', st.kind === 'raid' ? (de ? 'z. B. Raid-Stunde' : 'e.g. Raid Hour') : (de ? 'z. B. Community Day Forschung' : 'e.g. Community Day research'))));
    side.appendChild(field(de ? 'Untertitel' : 'Subtitle', input('sub', '')));
    side.appendChild(field(de ? 'Datum / Zeit' : 'Date / time', input('date', de ? 'z. B. Mi, 18–19 Uhr' : 'e.g. Wed, 6–7 PM')));

    if (st.kind === 'raid') {
      side.appendChild(field(de ? 'Raid-Boss' : 'Raid boss', input('boss', de ? 'Pokémon (Form: Name (Mega-X))' : 'Pokémon (form: Name (Mega-X))', 'giMons')));
      side.appendChild(field(de ? 'Stufe' : 'Tier', select(TIERS, st.tier, function (v) { st.tier = v; save(); refresh(); })));
      side.appendChild(el('div', { class: 'gi-l', text: de ? 'Konter' : 'Counters' }));
      side.appendChild(seg([['auto', de ? 'Automatisch (Top Counter)' : 'Automatic (Top Counter)'], ['manual', de ? 'Manuell' : 'Manual']], st.cmode, function (v) { st.cmode = v; save(); render(); }));
      side.appendChild(field(de ? 'Anzahl Konter' : 'Number of counters', select([['3', '3'], ['4', '4'], ['5', '5'], ['6', '6']], String(st.ccount || 6), function (v) { st.ccount = Number(v); save(); refresh(); })));
      if (st.cmode === 'auto') {
        side.appendChild(el('div', { class: 'hint', text: de ? 'Die besten Angreifer gegen diesen Boss aus dem Top Counter – mit deinen dortigen Filtern (Mega, Crypto, Level, Wertung …).' : 'Best attackers against this boss from Top Counter, using your filters there (Mega, Shadow, level, metric …).' }));
      } else {
        var ta = el('textarea', { rows: 3, spellcheck: 'false', placeholder: de ? 'Konter, mit Komma getrennt (max. 6)' : 'Counters, comma separated (max. 6)' }); ta.value = st.counters;
        ta.addEventListener('input', function () { st.counters = ta.value; save(); refresh(); });
        side.appendChild(ta);
      }
      side.appendChild(check(de ? 'Shiny möglich' : 'Shiny possible', 'shinyOk'));
    } else {
      var list = el('div', { class: 'gi-rows' });
      st.rows.forEach(function (r, i) {
        var box = el('div', { class: 'gi-row' });
        var t = el('input', { type: 'text', placeholder: de ? 'Aufgabe' : 'Task', spellcheck: 'false' }); t.value = r.task; t.setAttribute('list', 'giTasks');
        t.addEventListener('input', function () { r.task = t.value; save(); refresh(); });
        var del = el('button', { type: 'button', class: 'tbtn', text: '✕', title: de ? 'Zeile löschen' : 'Delete row' });
        del.addEventListener('click', function () { st.rows.splice(i, 1); if (!st.rows.length) st.rows.push({ task: '', rewards: [] }); save(); render(); });
        var top = el('div', { class: 'gi-row-top' }); top.appendChild(t); top.appendChild(del); box.appendChild(top);
        // gewählte Belohnungs-Pokémon als Chips (✨ = Shiny, ✕ = entfernen)
        var chips = el('div', { class: 'gi-chips' });
        r.rewards.forEach(function (x, k) {
          var mon = findMon(x.name), chp = el('span', { class: 'gi-pk' + (x.shiny ? ' sh' : '') });
          chp.appendChild(el('span', { text: mon ? monName(mon) : x.name }));
          var sb = el('button', { type: 'button', class: 'gi-pk-b', text: '✨', title: 'Shiny' });
          sb.addEventListener('click', function () { x.shiny = !x.shiny; save(); render(); });
          var xb = el('button', { type: 'button', class: 'gi-pk-b', text: '✕', title: de ? 'Entfernen' : 'Remove' });
          xb.addEventListener('click', function () { r.rewards.splice(k, 1); save(); render(); });
          chp.appendChild(sb); chp.appendChild(xb); chips.appendChild(chp);
        });
        box.appendChild(chips);
        if (r.rewards.length < 6) {
          var pick = el('input', { type: 'text', placeholder: de ? '+ Pokémon wählen …' : '+ Pick a Pokémon …', spellcheck: 'false' }); pick.setAttribute('list', 'giMons');
          var addPk = function () {
            var mon = findMon(pick.value); if (!mon) { pick.classList.add('bad'); return; }
            r.rewards.push({ name: monName(mon), shiny: false }); save(); render();
          };
          pick.addEventListener('change', addPk);
          pick.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') { ev.preventDefault(); addPk(); } });
          pick.addEventListener('input', function () { pick.classList.remove('bad'); });
          box.appendChild(pick);
        }
        list.appendChild(box);
      });
      side.appendChild(list);
      var add = el('button', { type: 'button', class: 'tbtn', text: de ? '+ Aufgabe hinzufügen' : '+ Add task' });
      add.addEventListener('click', function () { st.rows.push({ task: '', rewards: [] }); save(); render(); });
      side.appendChild(add);
      side.appendChild(check(de ? 'Forschungstag: CP-Bereiche anzeigen' : 'Research Day: show CP ranges', 'rday'));
    }
    side.appendChild(field(de ? 'Fußnote' : 'Footnote', input('note', '')));
    side.appendChild(el('div', { class: 'gi-l', text: de ? 'Design' : 'Style' }));
    side.appendChild(seg(Object.keys(THEMES).map(function (k) { return [k, THEMES[k].n]; }), st.theme, function (v) { st.theme = v; save(); render(); }));
    side.appendChild(el('div', { class: 'gi-l', text: de ? 'Format' : 'Format' }));
    side.appendChild(seg(Object.keys(SIZES).map(function (k) { return [k, SIZES[k][2]]; }), st.size, function (v) { st.size = v; save(); render(); }));
    side.appendChild(check(de ? 'Rattata-Lab-Signatur' : 'Rattata Lab signature', 'brand'));

    var main = el('section', { class: 'panel gi-main' });
    var bar = el('div', { class: 'gi-bar' });
    var cp = el('button', { type: 'button', class: 'tbtn', text: de ? 'Bild kopieren' : 'Copy image' });
    var sv = el('button', { type: 'button', class: 'tbtn primary', text: de ? 'Als PNG speichern' : 'Save as PNG' });
    var msg = el('span', { class: 'hint', 'data-msg': '' });
    cp.addEventListener('click', function () {
      if (!lastCv) return;
      lastCv.toBlob(function (bl) {
        navigator.clipboard.write([new ClipboardItem({ 'image/png': bl })]).then(function () { msg.textContent = de ? 'Kopiert' : 'Copied'; }, function () { msg.textContent = de ? 'Kopieren nicht möglich – bitte speichern.' : 'Copy not possible – please save.'; });
      }, 'image/png');
    });
    sv.addEventListener('click', function () {
      if (!lastCv) return;
      var a = document.createElement('a'); a.href = lastCv.toDataURL('image/png');
      a.download = 'go-' + (st.kind === 'raid' ? 'raid-' + norm(st.boss) : 'forschung') + '.png'; document.body.appendChild(a); a.click(); a.remove();
    });
    bar.appendChild(cp); bar.appendChild(sv); bar.appendChild(msg); main.appendChild(bar);
    main.appendChild(el('div', { class: 'gi-out', 'data-out': '' }));
    lay.appendChild(side); lay.appendChild(main); root.appendChild(lay);
    run();
  }

  function refresh() { clearTimeout(timer); timer = setTimeout(run, 200); }
  async function run() {
    if (!root) return;
    var out = root.querySelector('[data-out]'); if (!out) return;
    var my = ++token;
    var cv;
    try { cv = await renderCanvas(); } catch (e) { out.textContent = (de ? 'Fehler beim Zeichnen: ' : 'Render error: ') + e.message; return; }
    if (my !== token) return;
    lastCv = cv; cv.className = 'gi-canvas'; out.innerHTML = ''; out.appendChild(cv);
  }

  window.CCGoInfo = { render: render, _findMon: findMon, _weak: weaknesses, _cp: cpOf };
})();

// Randomizer-Ansicht (#randomizerView): ROM wählen, Optionen einstellen, randomisierte Kopie speichern. Engine: js/rand_gen3.js
(function () {
  'use strict';
  var A = window.CC, R3 = window.CCRand3, RN = window.CCRandNds, N = window.NDS, G = window.GEN3;
  if (!A || !R3 || !G) return;
  var R = R3;
  var el = A.el, esc = A.esc, de = A.LANG === 'de';
  var S = de ? {
    title: 'Randomizer', sub: 'Mischt wilde Pokémon, Trainer, Starter, Entwicklungen, Werte, Typen, Fähigkeiten und Attacken einer Spiel-ROM. Die Originaldatei bleibt unverändert, du bekommst eine neue Datei.',
    gens: 'Unterstützt: Generation 3 (Rubin, Saphir, Smaragd, Feuerrot, Blattgrün) und Generation 4 (Diamant, Perl, Platin, HeartGold, SoulSilver; ohne Starter). Die anderen Generationen (1, 2, 5–7) folgen.',
    pick: 'ROM wählen …', drop: 'oder eine .gba- / .nds-Datei hierher ziehen', game: 'Erkannt:', scan: 'Gefunden: {0} Karten mit wilden Pokémon, {1} Trainer, Starter {2}, Entwicklungen {3}',
    yes: 'ja', no: 'nein', bad: 'Diese Datei wird nicht unterstützt. Gebraucht wird eine unveränderte GBA-ROM der 3. Generation.',
    gen12: 'Game-Boy-ROMs (Generation 1 und 2) werden noch nicht unterstützt.', gen45: 'DS-ROMs der Generation 5 werden noch nicht unterstützt.', gen67: '3DS-ROMs (Generation 6 und 7) werden noch nicht unterstützt.',
    wild: 'Wilde Pokémon', trainers: 'Trainer-Pokémon', starters: 'Starter', evo: 'Entwicklungen', stats: 'Basiswerte', types: 'Typen', abilities: 'Fähigkeiten', moves: 'Level-Attacken',
    keep: 'Unverändert', random: 'Zufällig', similar: 'Zufällig, ähnlich stark', custom: 'Eigene Auswahl', shuffle: 'Werte mischen', randomStats: 'Zufällig (gleiche Summe)',
    wildGlobal: 'Jede Art wird überall gleich ersetzt (1:1)', noLegend: 'Keine legendären Pokémon', trainerLevel: 'Trainer-Level ändern um', seed: 'Seed (leer = zufällig)',
    go: 'Randomisieren und speichern', log: 'Protokoll speichern', done: 'Fertig. Die randomisierte ROM wurde gespeichert, Seed:', again: 'Gleiche ROM, gleiche Einstellungen und gleicher Seed ergeben immer dasselbe Ergebnis.',
    warn: 'Nutze die neue Datei nur mit einer Kopie deines Spielstands. Randomisierte Spiele können unfair oder unspielbar sein.'
  } : {
    title: 'Randomizer', sub: 'Shuffles wild Pokémon, trainers, starters, evolutions, stats, types, abilities and moves of a game ROM. The original file stays untouched, you get a new file.',
    gens: 'Supported: generation 3 (Ruby, Sapphire, Emerald, FireRed, LeafGreen) and generation 4 (Diamond, Pearl, Platinum, HeartGold, SoulSilver; no starters). The other generations (1, 2, 5–7) are coming.',
    pick: 'Choose ROM …', drop: 'or drag a .gba / .nds file here', game: 'Detected:', scan: 'Found: {0} maps with wild Pokémon, {1} trainers, starters {2}, evolutions {3}',
    yes: 'yes', no: 'no', bad: 'This file is not supported. An unmodified generation 3 GBA ROM is required.',
    gen12: 'Game Boy ROMs (generation 1 and 2) are not supported yet.', gen45: 'DS ROMs of generation 5 are not supported yet.', gen67: '3DS ROMs (generation 6 and 7) are not supported yet.',
    wild: 'Wild Pokémon', trainers: 'Trainer Pokémon', starters: 'Starters', evo: 'Evolutions', stats: 'Base stats', types: 'Types', abilities: 'Abilities', moves: 'Level-up moves',
    keep: 'Unchanged', random: 'Random', similar: 'Random, similar strength', custom: 'Custom', shuffle: 'Shuffle stats', randomStats: 'Random (same total)',
    wildGlobal: 'Each species is replaced the same everywhere (1:1)', noLegend: 'No legendary Pokémon', trainerLevel: 'Change trainer levels by', seed: 'Seed (empty = random)',
    go: 'Randomize and save', log: 'Save log', done: 'Done. The randomized ROM was saved, seed:', again: 'Same ROM, same settings and same seed always give the same result.',
    warn: 'Use the new file only with a copy of your save. Randomized games can be unfair or unplayable.'
  };

  var st = { eng: null, ext: 'gba', rom: null, buf: null, name: '', info: null, opts: JSON.parse(JSON.stringify(R.DEFAULTS)), msg: '', err: '', log: '', busy: false };
  var root;

  function download(name, bytes, mime) {
    var blob = new Blob([bytes], { type: mime || 'application/octet-stream' });
    var a = el('a', { href: URL.createObjectURL(blob), download: name });
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 3000);
  }
  function load(file) {
    st.err = ''; st.msg = ''; st.log = '';
    var ext = (file.name.split('.').pop() || '').toLowerCase();
    if (ext === 'gb' || ext === 'gbc') { st.err = S.gen12; return render(); }
    if (ext === '3ds' || ext === 'cia' || ext === 'cxi') { st.err = S.gen67; return render(); }
    var fr = new FileReader();
    fr.onload = function () {
      try {
        var u8 = new Uint8Array(fr.result), rom, eng;
        if (ext === 'nds') {
          if (!RN || !N) throw new Error('x');
          rom = N.parseRom(u8);
          if (rom.gen !== 4) { st.rom = null; st.err = S.gen45; return render(); }
          eng = RN;
        } else { rom = G.parseRom(u8); eng = R3; }
        st.eng = eng; st.ext = ext === 'nds' ? 'nds' : 'gba'; st.opts = JSON.parse(JSON.stringify(eng.DEFAULTS));
        st.rom = rom; st.buf = u8; st.name = file.name; st.info = eng.scan(rom, u8);
        var pool = eng.makePool(rom, false), first = pool.filter(function (s) { return rom.species[s].nat === (rom.frlg ? 1 : 252); })[0] || pool[0];
        st.opts.starterPick = [first, first, first];
      } catch (e) { st.rom = null; st.err = S.bad; }
      render();
    };
    fr.readAsArrayBuffer(file);
  }

  function sel(key, choices, labels) {
    var s = el('select', { class: 'rd-sel' }, choices.map(function (c) { return '<option value="' + c + '"' + (String(st.opts[key]) === c ? ' selected' : '') + '>' + esc(labels[c]) + '</option>'; }).join(''));
    s.onchange = function () { st.opts[key] = s.value; if (key === 'starters') render(); };
    return s;
  }
  function row(label, ctrl) { var r = el('label', { class: 'rd-row' }); r.appendChild(el('span', { class: 'rd-lbl', text: label })); r.appendChild(ctrl); return r; }
  function check(key, label) {
    var c = el('input', { type: 'checkbox' }); c.checked = !!st.opts[key]; c.onchange = function () { st.opts[key] = c.checked; };
    var l = el('label', { class: 'rd-check' }); l.appendChild(c); l.appendChild(el('span', { text: label })); return l;
  }
  function run() {
    if (!st.rom || st.busy) return;
    st.busy = true; st.err = '';
    setTimeout(function () {
      try {
        var res = st.eng.run(st.buf, st.rom, st.opts);
        st.log = res.log;
        var base = st.name.replace(/\.[^.]*$/, '');
        download(base + ' (Randomizer ' + res.seed + ').' + st.ext, res.data);
        st.msg = S.done + ' ' + res.seed;
        st.opts.seed = res.seed;
      } catch (e) { st.err = String((e && e.message) || e); }
      st.busy = false; render();
    }, 30);
  }

  function render() {
    root = document.getElementById('randomizerView'); if (!root) return;
    root.innerHTML = '';
    var box = el('div', { class: 'panel rd-box' });
    box.appendChild(el('h2', { text: S.title }));
    var body = el('div', { class: 'rd-body' });
    body.appendChild(el('p', { class: 'hint', text: S.sub }));
    body.appendChild(el('p', { class: 'hint', text: S.gens }));
    var inp = el('input', { type: 'file', accept: '.gba,.gb,.gbc,.nds,.3ds,.cia,.cxi', style: 'display:none' });
    inp.onchange = function () { if (inp.files[0]) load(inp.files[0]); };
    var pick = el('button', { class: 'primary-btn rd-pick', text: S.pick }); pick.onclick = function () { inp.click(); };
    var dz = el('div', { class: 'rd-drop' }); dz.appendChild(pick); dz.appendChild(el('span', { class: 'hint', text: S.drop })); dz.appendChild(inp);
    root.ondragover = function (e) { e.preventDefault(); dz.classList.add('on'); };
    root.ondragleave = function () { dz.classList.remove('on'); };
    root.ondrop = function (e) { e.preventDefault(); dz.classList.remove('on'); if (e.dataTransfer.files[0]) load(e.dataTransfer.files[0]); };
    body.appendChild(dz);
    if (st.err) body.appendChild(el('div', { class: 'rd-err', text: st.err }));
    if (st.rom) {
      var i = st.info;
      body.appendChild(el('div', { class: 'rd-game', html: '<b>' + esc(S.game) + '</b> ' + esc((de ? st.rom.game : st.rom.gameEn) || st.rom.title) + ' (' + esc(st.rom.code) + ') – ' + esc(st.name) }));
      body.appendChild(el('div', { class: 'hint', text: S.scan.replace('{0}', i.wildMaps).replace('{1}', i.trainers).replace('{2}', st.ext === 'nds' ? '–' : (i.starterOff >= 0 ? S.yes : S.no)).replace('{3}', (st.ext === 'nds' ? i.evo : i.evoOff >= 0) ? S.yes : S.no) }));
      var g = el('div', { class: 'rd-grid' });
      var mode = { keep: S.keep, random: S.random, similar: S.similar };
      g.appendChild(row(S.wild, sel('wild', ['keep', 'random', 'similar'], mode)));
      g.appendChild(row(S.trainers, sel('trainers', ['keep', 'random', 'similar'], mode)));
      if (st.ext !== 'nds') g.appendChild(row(S.starters, sel('starters', ['keep', 'random', 'custom'], { keep: S.keep, random: S.random, custom: S.custom })));
      if (st.opts.starters === 'custom' && st.ext !== 'nds') {
        var sr = el('div', { class: 'rd-starters' }), pool = st.eng.makePool(st.rom, false);
        for (var k = 0; k < 3; k++) (function (k) {
          var s = el('select', { class: 'rd-sel' }, pool.map(function (p) { return '<option value="' + p + '"' + (st.opts.starterPick[k] === p ? ' selected' : '') + '>#' + st.rom.species[p].nat + ' ' + esc(st.rom.species[p].name) + '</option>'; }).join(''));
          s.onchange = function () { st.opts.starterPick[k] = +s.value; }; sr.appendChild(s);
        })(k);
        g.appendChild(sr);
      }
      g.appendChild(row(S.evo, sel('evo', ['keep', 'random', 'similar'], mode)));
      g.appendChild(row(S.stats, sel('stats', ['keep', 'shuffle', 'random'], { keep: S.keep, shuffle: S.shuffle, random: S.randomStats })));
      g.appendChild(row(S.types, sel('types', ['keep', 'random'], mode)));
      g.appendChild(row(S.abilities, sel('abilities', ['keep', 'random'], mode)));
      g.appendChild(row(S.moves, sel('moves', ['keep', 'random'], mode)));
      var lv = el('input', { type: 'number', min: -50, max: 100, step: 5, class: 'rd-num' }); lv.value = st.opts.trainerLevel;
      lv.onchange = function () { st.opts.trainerLevel = Math.max(-50, Math.min(100, +lv.value || 0)); };
      var lvw = el('span', { class: 'rd-lvl' }); lvw.appendChild(lv); lvw.appendChild(el('span', { text: ' %' }));
      g.appendChild(row(S.trainerLevel, lvw));
      var seed = el('input', { type: 'text', class: 'rd-seed', placeholder: '…' }); seed.value = st.opts.seed || '';
      seed.oninput = function () { st.opts.seed = seed.value; };
      g.appendChild(row(S.seed, seed));
      body.appendChild(g);
      body.appendChild(check('wildGlobal', S.wildGlobal));
      body.appendChild(check('noLegend', S.noLegend));
      var go = el('button', { class: 'primary-btn rd-go', text: S.go }); go.disabled = st.busy; go.onclick = run;
      body.appendChild(go);
      body.appendChild(el('p', { class: 'hint', text: S.warn }));
    }
    if (st.msg) body.appendChild(el('div', { class: 'rd-ok', text: st.msg + ' – ' + S.again }));
    if (st.log) {
      var lb = el('button', { class: 'rd-logbtn', text: S.log }); lb.onclick = function () { download('randomizer-log.txt', st.log, 'text/plain'); };
      body.appendChild(lb);
      body.appendChild(el('pre', { class: 'rd-log', text: st.log.split('\n').slice(0, 400).join('\n') }));
    }
    box.appendChild(body); root.appendChild(box);
  }
  window.CCRandomizer = { render: render };
})();

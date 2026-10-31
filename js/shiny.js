// Shiny-Zähler (eigener Modus #shinyView): beliebig viele parallele Hunts mit Quote pro Spiel und Methode,
// Phasen, Timer, Statistik, Shiny-Sammlung mit Shiny-Dex, globale Hotkeys und OBS-Overlay (Desktop-App).
// Automatische Erkennung: js/shiny_detect.js (Alpha).
// Gespeichert im Browser unter localStorage "cc_shiny".
(function () {
  'use strict';
  var A = window.CC, O = window.SHINY_ODDS;
  if (!A || !O) return;
  var el = A.el, de = A.LANG === 'de';
  var NAT = window.NATDEX || [];
  var D = window.desktop && window.desktop.shiny ? window.desktop.shiny : null;

  var S = de ? {
    title: 'Shiny-Zähler', sub: 'Begegnungen zählen, Quoten und Chancen im Blick, Phasen, Timer, Sammlung, Hotkeys und OBS-Overlay.',
    tabHunts: 'Hunts', tabDex: 'Sammlung', tabSetup: 'Hotkeys & OBS', newHunt: '+ Neuer Hunt', huntsActive: 'Laufend', huntsDone: 'Gefunden',
    pick: 'Pokémon …', huntTitle: 'Titel (optional)', game: 'Spiel', method: 'Methode', charm: 'Schillerpin', charmNo: 'In diesem Spiel gibt es keinen Schillerpin',
    step: 'Schritt', stepT: 'Um wie viel ein Klick oder Hotkey zählt (z. B. 5 bei Horden)', del: 'Löschen', delConfirm: 'Hunt „{0}“ löschen?',
    encounters: 'Begegnungen', phaseN: 'Phase {0}', total: 'gesamt {0}', phaseBtn: 'Phase', phaseT: 'Ein anderes Shiny ist erschienen: Phase abschließen, Zähler neu starten',
    failedBtn: 'Entkommen', failedT: 'Das Shiny wurde gesehen, aber nicht gefangen (geflohen, besiegt …)', foundBtn: '★ Gefunden!', resetBtn: 'Zurücksetzen',
    resetConfirm: 'Zähler, Phasen und Zeit dieses Hunts auf 0 setzen?', timer: 'Zeit', start: 'Start', pause: 'Pause', perHour: '{0} pro Stunde',
    odds: 'Quote', approx: 'ca.', chanceNow: 'Wahrscheinlichkeit, bis jetzt ein Shiny gefunden zu haben', overOdds: '{0}× die Quote',
    milestones: 'Meilensteine', ms: '{0} %', need: '{0} Begegnungen', left: 'noch {0}', eta: 'ca. {0}', reached: 'erreicht', today: 'Heute',
    phases: 'Phasen', noPhases: 'Noch keine Phase.', undoPhase: 'Letzte Phase rückgängig', phaseRow: 'Phase {0}: {1} nach {2}', failedRow: 'entkommen',
    hotkey: 'Hotkeys zählen diesen Hunt', hotkeyT: 'Globale Hotkeys (siehe „Hotkeys & OBS“) zählen alle Hunts mit diesem Haken', overlayShows: 'Im Overlay',
    found: 'Gefunden', foundOn: 'gefunden am {0}', reopen: 'Weiter jagen', otherShiny: 'Welches Shiny ist erschienen?', savePhaseCatch: 'In die Sammlung eintragen',
    ok: 'Speichern', cancel: 'Abbrechen', nick: 'Spitzname', gender: 'Geschlecht', nature: 'Wesen', ball: 'Ball', location: 'Fundort', level: 'Level',
    notes: 'Notizen', date: 'Datum', catchTitle: 'Shiny gefangen', editCatch: 'Fang bearbeiten', addCatch: '+ Fang eintragen', delCatch: 'Fang löschen',
    delCatchConfirm: 'Diesen Fang löschen?', catches: 'Fänge', dex: 'Shiny-Dex', allGens: 'Alle', genN: 'Gen {0}', caught: 'gefangen', seen: 'gesehen',
    dexStats: '{0} Shinys · {1} Arten · Shiny-Dex {2}/{3}', noCatches: 'Noch keine Shinys. Beende einen Hunt mit „Gefunden!“ oder trage einen Fang ein.',
    viaHunt: '{0} Begegnungen · {1}', phasesN: '{0} Phasen', hkTitle: 'Globale Hotkeys', hkHint: 'Zählen auch, wenn das Spiel oder der Emulator im Vordergrund ist. Sie wirken auf alle Hunts mit Haken bei „Hotkeys zählen diesen Hunt“.',
    hkDesktop: 'Globale Hotkeys gibt es nur in der Desktop-App. Im Browser zählen + und − bei geöffnetem Shiny-Zähler.',
    act_inc: 'Zählen (+)', act_dec: 'Zurück (−)', act_phase: 'Phase abschließen', act_timer: 'Timer starten/pausieren',
    change: 'Ändern', remove: 'Entfernen', pressKeys: 'Tastenkombination drücken … (Esc bricht ab)', hkOk: 'aktiv', hkFail: 'belegt oder ungültig', none: '—',
    obsTitle: 'OBS-Overlay', obsHint: 'In OBS eine „Browser“-Quelle mit dieser Adresse anlegen (Breite z. B. 600, Höhe 250). Hintergrund ist durchsichtig.',
    obsDesktop: 'Das OBS-Overlay gibt es nur in der Desktop-App.', copy: 'Kopieren', layout: 'Layout', l_row: 'Nebeneinander', l_card: 'Karte', l_count: 'Nur Zahl',
    show: 'Anzeigen', sh_sprite: 'Sprite', sh_name: 'Name', sh_odds: 'Quote', sh_phase: 'Phase', sh_timer: 'Timer', color: 'Schrift', accent: 'Zahl', bg: 'Hintergrund',
    transparent: 'durchsichtig', size: 'Größe', which: 'Hunt', whichSel: 'immer der ausgewählte', preview: 'Vorschau', files: 'Textdateien für OBS',
    filesHint: 'Werden bei jeder Änderung aktualisiert (zaehler.txt, gesamt.txt, phase.txt, quote.txt, chance.txt, timer.txt, pokemon.txt, methode.txt, spiel.txt).',
    openDir: 'Ordner öffnen', keysLocal: 'Tasten im Fenster: + zählt, − zählt zurück', counted: '+{0} · {1}', huntFound: 'Glückwunsch zum Shiny {0}!', startHint: 'Wähle links einen Hunt oder lege einen neuen an.'
  } : {
    title: 'Shiny counter', sub: 'Count encounters, keep odds and chances in view, phases, timer, collection, hotkeys and OBS overlay.',
    tabHunts: 'Hunts', tabDex: 'Collection', tabSetup: 'Hotkeys & OBS', newHunt: '+ New hunt', huntsActive: 'Active', huntsDone: 'Found',
    pick: 'Pokémon …', huntTitle: 'Title (optional)', game: 'Game', method: 'Method', charm: 'Shiny Charm', charmNo: 'This game has no Shiny Charm',
    step: 'Step', stepT: 'How much one click or hotkey counts (e.g. 5 for hordes)', del: 'Delete', delConfirm: 'Delete hunt "{0}"?',
    encounters: 'Encounters', phaseN: 'Phase {0}', total: 'total {0}', phaseBtn: 'Phase', phaseT: 'Another shiny appeared: finish the phase and restart the counter',
    failedBtn: 'Got away', failedT: 'The shiny was seen but not caught (fled, fainted …)', foundBtn: '★ Found!', resetBtn: 'Reset',
    resetConfirm: 'Set counter, phases and time of this hunt to 0?', timer: 'Time', start: 'Start', pause: 'Pause', perHour: '{0} per hour',
    odds: 'Odds', approx: 'approx.', chanceNow: 'Chance to have found a shiny by now', overOdds: '{0}× the odds',
    milestones: 'Milestones', ms: '{0}%', need: '{0} encounters', left: '{0} to go', eta: 'about {0}', reached: 'reached', today: 'Today',
    phases: 'Phases', noPhases: 'No phase yet.', undoPhase: 'Undo last phase', phaseRow: 'Phase {0}: {1} after {2}', failedRow: 'got away',
    hotkey: 'Hotkeys count this hunt', hotkeyT: 'Global hotkeys (see "Hotkeys & OBS") count every hunt with this box ticked', overlayShows: 'In the overlay',
    found: 'Found', foundOn: 'found on {0}', reopen: 'Keep hunting', otherShiny: 'Which shiny appeared?', savePhaseCatch: 'Add to the collection',
    ok: 'Save', cancel: 'Cancel', nick: 'Nickname', gender: 'Gender', nature: 'Nature', ball: 'Ball', location: 'Location', level: 'Level',
    notes: 'Notes', date: 'Date', catchTitle: 'Shiny caught', editCatch: 'Edit catch', addCatch: '+ Add catch', delCatch: 'Delete catch',
    delCatchConfirm: 'Delete this catch?', catches: 'Catches', dex: 'Shiny Dex', allGens: 'All', genN: 'Gen {0}', caught: 'caught', seen: 'seen',
    dexStats: '{0} shinies · {1} species · Shiny Dex {2}/{3}', noCatches: 'No shinies yet. Finish a hunt with "Found!" or add a catch.',
    viaHunt: '{0} encounters · {1}', phasesN: '{0} phases', hkTitle: 'Global hotkeys', hkHint: 'They count even while the game or emulator is in front. They act on every hunt with "Hotkeys count this hunt" ticked.',
    hkDesktop: 'Global hotkeys are only available in the desktop app. In the browser + and − count while the shiny counter is open.',
    act_inc: 'Count (+)', act_dec: 'Back (−)', act_phase: 'Finish phase', act_timer: 'Start/pause timer',
    change: 'Change', remove: 'Remove', pressKeys: 'Press a key combination … (Esc cancels)', hkOk: 'active', hkFail: 'taken or invalid', none: '—',
    obsTitle: 'OBS overlay', obsHint: 'Add a "Browser" source in OBS with this address (e.g. width 600, height 250). The background is transparent.',
    obsDesktop: 'The OBS overlay is only available in the desktop app.', copy: 'Copy', layout: 'Layout', l_row: 'Side by side', l_card: 'Card', l_count: 'Number only',
    show: 'Show', sh_sprite: 'Sprite', sh_name: 'Name', sh_odds: 'Odds', sh_phase: 'Phase', sh_timer: 'Timer', color: 'Text', accent: 'Number', bg: 'Background',
    transparent: 'transparent', size: 'Size', which: 'Hunt', whichSel: 'always the selected one', preview: 'Preview', files: 'Text files for OBS',
    filesHint: 'Updated on every change (zaehler.txt = count, gesamt.txt = total, phase.txt, quote.txt = odds, chance.txt, timer.txt, pokemon.txt, methode.txt, spiel.txt).',
    openDir: 'Open folder', keysLocal: 'Keys in the window: + counts, − counts back', counted: '+{0} · {1}', huntFound: 'Congratulations on the shiny {0}!', startHint: 'Pick a hunt on the left or create a new one.'
  };
  function t(k) { var s = S[k] != null ? S[k] : k; for (var i = 1; i < arguments.length; i++) s = s.split('{' + (i - 1) + '}').join(arguments[i]); return s; }
  function fmt(n) { return Math.round(n).toLocaleString(de ? 'de-DE' : 'en-US'); }
  function pct(x) { var v = x * 100, d = v < 10 ? 2 : 1; return v.toLocaleString(de ? 'de-DE' : 'en-US', { minimumFractionDigits: d, maximumFractionDigits: d }); }
  function today() { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function dur(ms) {
    var s = Math.floor(ms / 1000), h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60;
    return h + ':' + ('0' + m).slice(-2) + ':' + ('0' + x).slice(-2);
  }
  function durShort(ms) {
    var h = ms / 3600000;
    if (h < 1) return Math.max(1, Math.round(h * 60)) + ' min';
    if (h < 48) return (Math.round(h * 10) / 10).toLocaleString(de ? 'de-DE' : 'en-US') + ' h';
    return Math.round(h / 24) + (de ? ' Tage' : ' days');
  }
  var NATURES = ['Hardy', 'Lonely', 'Brave', 'Adamant', 'Naughty', 'Bold', 'Docile', 'Relaxed', 'Impish', 'Lax', 'Timid', 'Hasty', 'Serious', 'Jolly', 'Naive',
    'Modest', 'Mild', 'Quiet', 'Bashful', 'Rash', 'Calm', 'Gentle', 'Sassy', 'Careful', 'Quirky'];
  var GEN_END = [0, 151, 251, 386, 493, 649, 721, 809, 905, 1025];

  // ---------------- Pokémon ----------------
  function monName(n) { var d = NAT[n]; return d ? (de ? d[2] : d[1]) : ''; }
  var byName = null;
  function lookup(name) {
    if (!byName) { byName = {}; for (var i = 1; i < NAT.length; i++) if (NAT[i]) { byName[norm(NAT[i][1])] = i; byName[norm(NAT[i][2])] = i; } }
    return byName[norm(name)] || 0;
  }
  function norm(s) { return String(s || '').toLowerCase().replace(/[\s.'’:-]/g, '').replace(/♀/g, 'f').replace(/♂/g, 'm'); }
  function sid(n) { return NAT[n] ? NAT[n][0] : ''; }
  function shinyImg(n, cls, big) {
    var img = el('img', { class: cls || '', alt: '', loading: 'lazy' });
    if (!n || !NAT[n]) { img.classList.add('none'); return img; }
    var chain = big ? ['https://play.pokemonshowdown.com/sprites/ani-shiny/' + sid(n) + '.gif'] : [];
    chain.push('https://play.pokemonshowdown.com/sprites/gen5-shiny/' + sid(n) + '.png', 'https://play.pokemonshowdown.com/sprites/home-shiny/' + sid(n) + '.png');
    var i = 0;
    img.onerror = function () { i++; if (i < chain.length) img.src = chain[i]; else img.onerror = null; };
    img.src = chain[0];
    if (big) img.classList.add('ani');
    return img;
  }
  function normalImg(n, cls) {
    var img = el('img', { class: cls || '', alt: '', loading: 'lazy' });
    if (NAT[n]) img.src = 'https://play.pokemonshowdown.com/sprites/gen5/' + sid(n) + '.png';
    return img;
  }
  var datalist = null;
  function ensureDatalist() {
    if (datalist) return;
    datalist = el('datalist', { id: 'shDex' });
    var h = '';
    for (var i = 1; i < NAT.length; i++) if (NAT[i]) h += '<option value="' + A.esc(monName(i)) + '">#' + i + '</option>';
    datalist.innerHTML = h;
    document.body.appendChild(datalist);
  }
  function speciesInput(cur, onPick, cls) {
    ensureDatalist();
    var inp = el('input', { type: 'text', list: 'shDex', placeholder: t('pick'), class: cls || '' });
    inp.value = monName(cur);
    inp.addEventListener('change', function () {
      var n = lookup(inp.value.trim());
      if (!n) { inp.value = monName(cur); return; }
      onPick(n);
    });
    return inp;
  }

  // ---------------- storage ----------------
  function newId(p) { return (p || 'h') + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36); }
  var store = A.load('cc_shiny', null);
  if (!store || !Array.isArray(store.hunts)) store = {};
  store.hunts = store.hunts || [];
  store.collection = store.collection || [];
  store.hotkeys = store.hotkeys || { inc: 'CommandOrControl+Alt+Up', dec: 'CommandOrControl+Alt+Down', phase: '', timer: 'CommandOrControl+Alt+T' };
  store.overlay = store.overlay || { layout: 'row', sprite: 1, name: 1, odds: 1, phase: 1, timer: 1, color: '#ffffff', accent: '#f2c94c', bg: '', size: 1, hunt: '' };
  store.tab = store.tab || 'hunts';
  store.dexGen = store.dexGen || 0;
  store.dexView = store.dexView || 'catches';
  var saveTimer = null;
  function persist() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () { saveTimer = null; A.save('cc_shiny', store); }, 120);
    pushState();
  }
  // closing, restarting or updating right after a change: write it now, not after the short delay
  window.addEventListener('pagehide', function () { if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; A.save('cc_shiny', store); } });
  // references of the auto detection saved by 1.3.0 carried a broken cache: repair them once and save
  if (window.CCShinyDetect && window.CCShinyDetect.cleanRefs) {
    var refsFixed = false;
    store.hunts.forEach(function (h) {
      if (!h.detect || !h.detect.refs) return;
      var r = window.CCShinyDetect.cleanRefs(h.detect.refs);
      if (r !== h.detect.refs) { h.detect.refs = r; refsFixed = true; }
    });
    if (refsFixed) A.save('cc_shiny', store);
  }
  function hunt(id) { var r = null; store.hunts.some(function (h) { if (h.id === id) { r = h; return true; } return false; }); return r; }
  function sel() { return hunt(store.sel) || store.hunts[0] || null; }
  function newHunt() {
    var last = sel();
    var h = { id: newId('h'), species: 0, title: '', game: last ? last.game : 'sv', method: 'full', params: { charm: last ? !!(last.params && last.params.charm) : false },
      step: 1, count: 0, total: 0, phases: [], timeMs: 0, runStart: 0, status: 'active', hotkey: true, created: Date.now(), days: {} };
    store.hunts.unshift(h); store.sel = h.id; persist();
    return h;
  }
  function fixHunt(h) {
    h.params = h.params || {}; h.phases = h.phases || []; h.days = h.days || {};
    if (!h.step || h.step < 1) h.step = 1;
    if (!O.GAMES.some(function (g) { return g.id === h.game; })) h.game = 'sv';
    if (!O.methodsFor(h.game).some(function (m) { return m.id === h.method; })) h.method = 'full';
    return h;
  }
  function timeOf(h) { return (h.timeMs || 0) + (h.runStart ? Date.now() - h.runStart : 0); }
  function setRunning(h, on) {
    if (on && !h.runStart) h.runStart = Date.now();
    if (!on && h.runStart) { h.timeMs = timeOf(h); h.runStart = 0; }
  }
  function huntName(h) { return h.title || monName(h.species) || (de ? 'Neuer Hunt' : 'New hunt'); }

  // ---------------- counting ----------------
  function count(h, k) {
    if (!h || h.status === 'found') return;
    var d = (h.step || 1) * k;
    if (h.count + d < 0) d = -h.count;
    if (!d) return;
    h.count += d; h.total = Math.max(0, (h.total || 0) + d);
    var day = today(); h.days[day] = Math.max(0, (h.days[day] || 0) + d);
    persist();
    refreshCounts(h);
  }
  function finishPhase(h, species, failed, addCatch) {
    h.phases.push({ n: h.count, species: species || h.species, at: Date.now(), result: failed ? 'failed' : 'phase' });
    if (addCatch && !failed) store.collection.unshift(catchFromHunt(h, species || h.species, h.count));
    h.count = 0;
    persist();
  }
  function undoPhase(h) {
    var p = h.phases.pop();
    if (!p) return;
    h.count += p.n;
    if (p.catchId) store.collection = store.collection.filter(function (c) { return c.id !== p.catchId; });
    persist();
  }
  function catchFromHunt(h, species, n) {
    return { id: newId('c'), species: species, nick: '', gender: '', nature: '', ball: '', location: '', level: '', game: h.game, method: h.method,
      encounters: n, phases: h.phases.length, date: today(), notes: '', hunt: h.id };
  }
  // global hotkeys and the window keys
  function hotkeyAction(action) {
    var list = store.hunts.filter(function (h) { return h.hotkey && h.status !== 'found'; });
    if (!list.length && sel()) list = [sel()];
    list.forEach(function (h) {
      if (action === 'inc') count(h, 1);
      else if (action === 'dec') count(h, -1);
      else if (action === 'phase') { finishPhase(h, h.species, false, false); }
      else if (action === 'timer') { setRunning(h, !h.runStart); persist(); }
    });
    if (action !== 'inc' && action !== 'dec') rerender();
  }
  if (D) D.onHotkey(hotkeyAction);
  function applyHotkeys() {
    if (!D) return Promise.resolve({});
    return D.setHotkeys(store.hotkeys).then(function (r) { hkResult = r || {}; return hkResult; }, function () { return {}; });
  }
  var hkResult = {};
  document.addEventListener('keydown', function (ev) {
    if (document.body.dataset.view !== 'shiny' || recording) return;
    var tg = ev.target;
    if (tg && (tg.tagName === 'INPUT' || tg.tagName === 'SELECT' || tg.tagName === 'TEXTAREA')) return;
    if (document.querySelector('.modal:not(.hidden)')) return;
    if (ev.key === '+' || ev.key === '=' || ev.code === 'NumpadAdd') { ev.preventDefault(); count(sel(), 1); }
    else if (ev.key === '-' || ev.code === 'NumpadSubtract') { ev.preventDefault(); count(sel(), -1); }
  });

  // ---------------- OBS state for the desktop app ----------------
  function oddsText(h) { var p = O.probability(h); return (O.isApprox(h) ? t('approx') + ' ' : '') + '1/' + fmt(1 / p); }
  function stateOf(h) {
    var p = O.probability(h), g = O.game(h.game), m = O.method(h.method);
    return { id: h.id, name: huntName(h), sprite: sid(h.species), count: h.count, total: h.total || 0, phase: h.phases.length + 1,
      phaseText: h.phases.length ? t('phaseN', h.phases.length + 1) + ' · ' + t('total', fmt(h.total || 0)) : '',
      oddsText: oddsText(h), chanceText: pct(O.cumulative(p, h.count)) + ' %', timeText: dur(timeOf(h)), methodText: de ? m.de : m.en,
      gameText: de ? g.de : g.en, found: h.status === 'found' };
  }
  var pushTimer = null;
  function pushState() {
    if (!D) return;
    clearTimeout(pushTimer);
    pushTimer = setTimeout(function () {
      var active = store.overlay.hunt && hunt(store.overlay.hunt) ? store.overlay.hunt : (sel() ? sel().id : null);
      D.pushState({ hunts: store.hunts.map(stateOf), active: active });
    }, 60);
  }
  // timers tick every second (screen and overlay)
  setInterval(function () {
    var any = store.hunts.some(function (h) { return h.runStart; });
    if (!any) return;
    document.querySelectorAll('[data-timer]').forEach(function (e) { var h = hunt(e.getAttribute('data-timer')); if (h) e.textContent = dur(timeOf(h)); });
    pushState();
  }, 1000);

  // ---------------- render ----------------
  var root = null;
  function rerender() { if (root && document.body.dataset.view === 'shiny') render(); }
  function render() {
    root = document.getElementById('shinyView');
    if (!root) return;
    store.hunts.forEach(fixHunt);
    root.innerHTML = '';
    var head = el('div', { class: 'nz-head' });
    head.appendChild(el('h2', { text: t('title') }));
    head.appendChild(el('span', { class: 'hint', text: t('sub') }));
    root.appendChild(head);
    var tabs = el('div', { class: 'nz-tabs' });
    [['hunts', t('tabHunts')], ['dex', t('tabDex')], ['setup', t('tabSetup')]].forEach(function (x) {
      var b = el('button', { class: store.tab === x[0] ? 'on' : '', text: x[1], 'data-tab': x[0] });
      b.addEventListener('click', function () { store.tab = x[0]; persist(); render(); });
      tabs.appendChild(b);
    });
    root.appendChild(tabs);
    var body = el('div', { class: 'nz-body sh-body' });
    root.appendChild(body);
    if (store.tab === 'dex') renderDex(body);
    else if (store.tab === 'setup') renderSetup(body);
    else renderHunts(body);
  }

  // ---------- hunts ----------
  function renderHunts(body) {
    var wrap = el('div', { class: 'sh-wrap' });
    body.appendChild(wrap);
    var side = el('aside', { class: 'sh-list panel' });
    var nb = el('button', { class: 'primary-btn sh-new', text: t('newHunt') });
    nb.addEventListener('click', function () { newHunt(); render(); });
    side.appendChild(nb);
    var cur = sel();
    [['active', t('huntsActive')], ['found', t('huntsDone')]].forEach(function (grp) {
      var hs = store.hunts.filter(function (h) { return (h.status === 'found') === (grp[0] === 'found'); });
      if (!hs.length) return;
      side.appendChild(el('div', { class: 'sh-grp', text: grp[1] + ' (' + hs.length + ')' }));
      hs.forEach(function (h) {
        var c = el('div', { class: 'sh-item' + (cur && h.id === cur.id ? ' on' : '') + (h.status === 'found' ? ' found' : '') });
        c.appendChild(shinyImg(h.species, 'sh-item-img'));
        var tx = el('div', { class: 'sh-item-txt' });
        tx.appendChild(el('div', { class: 'sh-item-name', text: (h.status === 'found' ? '★ ' : '') + huntName(h) }));
        tx.appendChild(el('div', { class: 'sh-item-sub', text: fmt(h.count) + ' · ' + oddsText(h) + (h.phases.length ? ' · ' + t('phaseN', h.phases.length + 1) : '') }));
        c.appendChild(tx);
        var icons = el('div', { class: 'sh-item-ic' });
        if (h.runStart) icons.appendChild(el('span', { class: 'sh-dot', title: t('timer') }));
        if (h.hotkey && h.status !== 'found') icons.appendChild(el('span', { class: 'sh-kb', text: '⌨', title: t('hotkey') }));
        if (window.CCShinyDetect && window.CCShinyDetect.isRunning(h.id)) icons.appendChild(el('span', { class: 'sh-eye', text: '◉', title: 'Auto' }));
        c.appendChild(icons);
        var plus = el('button', { class: 'sh-item-plus', text: '+', title: t('act_inc') });
        plus.addEventListener('click', function (ev) { ev.stopPropagation(); count(h, 1); });
        if (h.status !== 'found') c.appendChild(plus);
        c.addEventListener('click', function () { store.sel = h.id; persist(); render(); });
        side.appendChild(c);
      });
    });
    wrap.appendChild(side);
    var main = el('section', { class: 'sh-main' });
    wrap.appendChild(main);
    if (!cur) { main.appendChild(el('div', { class: 'hint nc-empty big', text: t('startHint') })); return; }
    renderDetail(main, cur);
  }

  function renderDetail(main, h) {
    var g = O.game(h.game), m = O.method(h.method);
    // config row
    var cfg = el('div', { class: 'sh-cfg panel' });
    var sp = speciesInput(h.species, function (n) { h.species = n; persist(); render(); }, 'sh-species');
    cfg.appendChild(sp);
    var ti = el('input', { type: 'text', class: 'sh-title', placeholder: t('huntTitle') });
    ti.value = h.title || '';
    ti.addEventListener('input', function () { h.title = ti.value; persist(); });
    ti.addEventListener('change', render);
    cfg.appendChild(ti);
    function sel2(label, opts, cur, fn, title) {
      var w = el('label', { class: 'nc-sel', title: title || '' });
      w.appendChild(el('span', { text: label }));
      var s = el('select');
      opts.forEach(function (o) { var op = el('option', { value: o[0], text: o[1] }); if (String(o[0]) === String(cur)) op.selected = true; s.appendChild(op); });
      s.addEventListener('change', function () { fn(s.value); persist(); render(); });
      w.appendChild(s);
      return w;
    }
    cfg.appendChild(sel2(t('game'), O.GAMES.map(function (x) { return [x.id, de ? x.de : x.en]; }), h.game, function (v) {
      h.game = v; if (!O.methodsFor(v).some(function (x) { return x.id === h.method; })) h.method = 'full';
    }));
    cfg.appendChild(sel2(t('method'), O.methodsFor(h.game).map(function (x) { return [x.id, de ? x.de : x.en]; }), h.method, function (v) {
      h.method = v; var mm = O.method(v); if (mm.step && h.step === 1) h.step = mm.step;
    }));
    (m.params || []).forEach(function (pk) {
      var P = O.PARAMS[pk];
      var lab = de ? P.de : P.en;
      if (P.type === 'number') {
        var w = el('label', { class: 'nc-sel' });
        w.appendChild(el('span', { text: lab }));
        var inp = el('input', { type: 'number', min: 0, max: P.max, value: h.params[P.key] != null ? h.params[P.key] : (P.key === 'custom' ? 4096 : 0) });
        inp.addEventListener('change', function () { h.params[P.key] = Math.max(0, Math.min(P.max, +inp.value || 0)); persist(); render(); });
        w.appendChild(inp);
        cfg.appendChild(w);
      } else if (P.type === 'check') {
        var c = el('label', { class: 'nc-check sh-chk' });
        var cb = el('input', { type: 'checkbox' }); cb.checked = !!h.params[P.key];
        cb.addEventListener('change', function () { h.params[P.key] = cb.checked; persist(); render(); });
        c.appendChild(cb); c.appendChild(document.createTextNode(' ' + lab));
        cfg.appendChild(c);
      } else {
        cfg.appendChild(sel2(lab, P.options.map(function (o) { return [o[0], typeof o[1] === 'string' ? o[1] : (de ? o[1].de : o[1].en)]; }), h.params[P.key] || 0, function (v) { h.params[P.key] = +v; }));
      }
    });
    var ch = el('label', { class: 'nc-check sh-chk', title: g.charm ? '' : t('charmNo') });
    var chb = el('input', { type: 'checkbox' }); chb.checked = !!h.params.charm; chb.disabled = !g.charm;
    chb.addEventListener('change', function () { h.params.charm = chb.checked; persist(); render(); });
    ch.appendChild(chb); ch.appendChild(document.createTextNode(' ' + t('charm')));
    if (!g.charm) ch.classList.add('off');
    cfg.appendChild(ch);
    var stw = el('label', { class: 'nc-sel', title: t('stepT') });
    stw.appendChild(el('span', { text: t('step') }));
    var st = el('input', { type: 'number', min: 1, max: 100, value: h.step || 1 });
    st.addEventListener('change', function () { h.step = Math.max(1, Math.min(100, +st.value || 1)); persist(); render(); });
    stw.appendChild(st);
    cfg.appendChild(stw);
    var hk = el('label', { class: 'nc-check sh-chk', title: t('hotkeyT') });
    var hkb = el('input', { type: 'checkbox' }); hkb.checked = !!h.hotkey;
    hkb.addEventListener('change', function () { h.hotkey = hkb.checked; persist(); render(); });
    hk.appendChild(hkb); hk.appendChild(document.createTextNode(' ' + t('hotkey')));
    cfg.appendChild(hk);
    var del = el('button', { class: 'tbtn danger sh-del', text: t('del') });
    del.addEventListener('click', function () {
      if (!confirm(t('delConfirm', huntName(h)))) return;
      if (window.CCShinyDetect) window.CCShinyDetect.stop(h.id);
      store.hunts = store.hunts.filter(function (x) { return x !== h; }); store.sel = store.hunts[0] ? store.hunts[0].id : null; persist(); render();
    });
    cfg.appendChild(del);
    main.appendChild(cfg);

    var grid = el('div', { class: 'sh-grid' });
    main.appendChild(grid);
    // counter card
    var cc = el('div', { class: 'sh-counter panel' + (h.status === 'found' ? ' found' : '') });
    var stage = el('div', { class: 'sh-stage' });
    stage.appendChild(shinyImg(h.species, 'sh-big', true));
    cc.appendChild(stage);
    cc.appendChild(el('div', { class: 'sh-name', text: huntName(h) + (h.title && h.species ? ' · ' + monName(h.species) : '') }));
    var num = el('div', { class: 'sh-count', 'data-count': h.id, text: fmt(h.count) });
    var row = el('div', { class: 'sh-countrow' });
    var minus = el('button', { class: 'sh-minus', text: '−', title: t('act_dec') });
    minus.addEventListener('click', function () { count(h, -1); });
    var plus = el('button', { class: 'sh-plus', text: '+' + (h.step > 1 ? h.step : ''), title: t('act_inc') });
    plus.addEventListener('click', function () { count(h, 1); });
    row.appendChild(minus); row.appendChild(num); row.appendChild(plus);
    cc.appendChild(row);
    cc.appendChild(el('div', { class: 'sh-phase', 'data-phase': h.id, text: t('encounters') + (h.phases.length ? ' · ' + t('phaseN', h.phases.length + 1) + ' · ' + t('total', fmt(h.total || 0)) : '') }));
    if (h.status === 'found') {
      cc.appendChild(el('div', { class: 'sh-foundline', text: '★ ' + t('foundOn', h.foundAt || '') }));
      var ro = el('button', { class: 'tbtn', text: t('reopen') });
      ro.addEventListener('click', function () { h.status = 'active'; persist(); render(); });
      cc.appendChild(ro);
    } else {
      var acts = el('div', { class: 'sh-acts' });
      var pb = el('button', { class: 'tbtn', text: t('phaseBtn'), title: t('phaseT') });
      pb.addEventListener('click', function () { openPhase(h); });
      var fb = el('button', { class: 'tbtn', text: t('failedBtn'), title: t('failedT') });
      fb.addEventListener('click', function () { finishPhase(h, h.species, true, false); render(); });
      var gb = el('button', { class: 'primary-btn sh-foundbtn', text: t('foundBtn') });
      gb.addEventListener('click', function () { openCatch(null, h); });
      var rb = el('button', { class: 'tbtn', text: t('resetBtn') });
      rb.addEventListener('click', function () {
        if (!confirm(t('resetConfirm'))) return;
        h.count = 0; h.total = 0; h.phases = []; h.timeMs = 0; h.runStart = h.runStart ? Date.now() : 0; h.days = {}; persist(); render();
      });
      acts.appendChild(pb); acts.appendChild(fb); acts.appendChild(gb); acts.appendChild(rb);
      cc.appendChild(acts);
    }
    // timer
    var tm = el('div', { class: 'sh-timer' });
    tm.appendChild(el('span', { class: 'sh-lbl', text: t('timer') }));
    tm.appendChild(el('span', { class: 'sh-time', 'data-timer': h.id, text: dur(timeOf(h)) }));
    var tb = el('button', { class: 'tbtn' + (h.runStart ? ' running' : ''), text: h.runStart ? '⏸ ' + t('pause') : '▶ ' + t('start') });
    tb.addEventListener('click', function () { setRunning(h, !h.runStart); persist(); render(); });
    tm.appendChild(tb);
    var hours = timeOf(h) / 3600000;
    if (hours > 0.01 && h.count) tm.appendChild(el('span', { class: 'hint', text: t('perHour', fmt(h.count / hours)) }));
    cc.appendChild(tm);
    cc.appendChild(el('div', { class: 'hint sh-keys', text: t('keysLocal') }));
    grid.appendChild(cc);

    // odds + statistics
    var od = el('div', { class: 'sh-odds panel' });
    od.setAttribute('data-odds', h.id);
    fillOdds(od, h);
    grid.appendChild(od);

    // phases
    var ph = el('div', { class: 'sh-phases panel' });
    var phh = el('div', { class: 'sh-ph-head' });
    phh.appendChild(el('span', { class: 'sl-title', text: t('phases') }));
    if (h.phases.length) {
      var ub = el('button', { class: 'tbtn', text: t('undoPhase') });
      ub.addEventListener('click', function () { undoPhase(h); render(); });
      phh.appendChild(ub);
    }
    ph.appendChild(phh);
    if (!h.phases.length) ph.appendChild(el('div', { class: 'hint', text: t('noPhases') }));
    h.phases.slice().reverse().forEach(function (p, i) {
      var r = el('div', { class: 'sh-ph-row' + (p.result === 'failed' ? ' failed' : '') });
      r.appendChild(shinyImg(p.species, 'sh-ph-img'));
      var idx = h.phases.length - i;
      r.appendChild(el('span', { text: t('phaseRow', idx, monName(p.species) + (p.result === 'failed' ? ' (' + t('failedRow') + ')' : ''), fmt(p.n)) }));
      r.appendChild(el('span', { class: 'hint', text: new Date(p.at).toLocaleDateString(de ? 'de-DE' : 'en-US') }));
      ph.appendChild(r);
    });
    grid.appendChild(ph);

    // auto detection (alpha)
    if (window.CCShinyDetect) {
      var dp = el('div', { class: 'sh-detect panel' });
      grid.appendChild(dp);
      window.CCShinyDetect.panel(dp, h, { count: function () { count(h, 1); A.toast(t('counted', h.step || 1, huntName(h))); refreshList(); }, persist: persist, de: de,
        name: function () { return h.species ? monName(h.species) : ''; } });
    }
  }

  function fillOdds(od, h) {
    od.innerHTML = '';
    var p = O.probability(h), cum = O.cumulative(p, h.count);
    var top = el('div', { class: 'sh-odds-top' });
    top.appendChild(el('div', { class: 'sh-lbl', text: t('odds') }));
    top.appendChild(el('div', { class: 'sh-odds-val', text: oddsText(h) }));
    od.appendChild(top);
    od.appendChild(el('div', { class: 'sh-lbl', text: t('chanceNow') }));
    var cv = el('div', { class: 'sh-chance' });
    cv.appendChild(el('b', { text: pct(cum) + ' %' }));
    cv.appendChild(el('span', { class: 'hint', text: ' · ' + t('overOdds', (Math.round(h.count * p * 100) / 100).toLocaleString(de ? 'de-DE' : 'en-US')) }));
    od.appendChild(cv);
    var bar = el('div', { class: 'sh-cbar' });
    var f = el('span'); f.style.width = Math.min(100, cum * 100) + '%'; bar.appendChild(f);
    od.appendChild(bar);
    od.appendChild(el('div', { class: 'sh-lbl sh-ms-head', text: t('milestones') }));
    var rate = h.count / Math.max(1e-9, timeOf(h) / 3600000);
    var tbl = el('div', { class: 'sh-ms' });
    [0.5, 0.75, 0.9, 0.99].forEach(function (c) {
      var need = O.encountersFor(p, c), left = need - h.count;
      var r = el('div', { class: 'sh-ms-row' + (left <= 0 ? ' done' : '') });
      r.appendChild(el('span', { class: 'sh-ms-p', text: t('ms', Math.round(c * 100)) }));
      r.appendChild(el('span', { text: t('need', fmt(need)) }));
      r.appendChild(el('span', { class: 'hint', text: left <= 0 ? t('reached') : t('left', fmt(left)) + (timeOf(h) > 60000 && h.count ? ' · ' + t('eta', durShort(left / rate * 3600000)) : '') }));
      tbl.appendChild(r);
    });
    od.appendChild(tbl);
    od.appendChild(el('div', { class: 'hint sh-today', text: t('today') + ': ' + fmt(h.days[today()] || 0) }));
  }
  // fast update after a count (no full re-render, keeps inputs and the detection preview)
  function refreshCounts(h) {
    document.querySelectorAll('[data-count="' + h.id + '"]').forEach(function (e) {
      e.textContent = fmt(h.count);
      e.classList.remove('bump'); void e.offsetWidth; e.classList.add('bump');
    });
    document.querySelectorAll('[data-phase="' + h.id + '"]').forEach(function (e) {
      e.textContent = t('encounters') + (h.phases.length ? ' · ' + t('phaseN', h.phases.length + 1) + ' · ' + t('total', fmt(h.total || 0)) : '');
    });
    document.querySelectorAll('[data-odds="' + h.id + '"]').forEach(function (e) { fillOdds(e, h); });
    refreshList();
  }
  function refreshList() {
    if (document.body.dataset.view !== 'shiny' || store.tab !== 'hunts') return;
    var side = root && root.querySelector('.sh-list');
    if (!side) return;
    var items = side.querySelectorAll('.sh-item');
    var hs = store.hunts.filter(function (h) { return h.status !== 'found'; }).concat(store.hunts.filter(function (h) { return h.status === 'found'; }));
    items.forEach(function (it, i) {
      var h = hs[i];
      if (!h) return;
      var sub = it.querySelector('.sh-item-sub');
      if (sub) sub.textContent = fmt(h.count) + ' · ' + oddsText(h) + (h.phases.length ? ' · ' + t('phaseN', h.phases.length + 1) : '');
    });
  }

  // ---------- dialogs ----------
  function modal(title, build, onOk) {
    var m = el('div', { class: 'modal sh-modal' });
    var bx = el('div', { class: 'modal-box' });
    bx.appendChild(el('h3', { text: title }));
    var body = el('div', { class: 'sh-form' });
    bx.appendChild(body);
    var act = el('div', { class: 'modal-actions' });
    var ok = el('button', { class: 'primary-btn', text: t('ok') });
    var cc = el('button', { text: t('cancel') });
    act.appendChild(cc); act.appendChild(ok);
    bx.appendChild(act);
    m.appendChild(bx);
    document.body.appendChild(m);
    var get = build(body);
    function close() { m.remove(); document.removeEventListener('keydown', key, true); }
    function key(ev) { if (ev.key === 'Escape') { ev.stopPropagation(); close(); } }
    document.addEventListener('keydown', key, true);
    cc.addEventListener('click', close);
    m.addEventListener('mousedown', function (ev) { if (ev.target === m) close(); });
    ok.addEventListener('click', function () { if (onOk(get()) !== false) close(); });
    var first = body.querySelector('input,select'); if (first) first.focus();
  }
  function field(body, label, input) {
    var w = el('label', { class: 'sh-field' });
    w.appendChild(el('span', { text: label }));
    w.appendChild(input);
    body.appendChild(w);
    return input;
  }
  function openPhase(h) {
    var picked = h.species;
    modal(t('phaseBtn'), function (body) {
      field(body, t('otherShiny'), speciesInput(picked, function (n) { picked = n; }));
      var c = el('input', { type: 'checkbox' });
      var w = el('label', { class: 'nc-check' }); w.appendChild(c); w.appendChild(document.createTextNode(' ' + t('savePhaseCatch')));
      body.appendChild(w);
      return function () { return { species: picked, add: c.checked }; };
    }, function (v) {
      var n = h.count;
      finishPhase(h, v.species, false, false);
      if (v.add) { var c = catchFromHunt(h, v.species, n); store.collection.unshift(c); h.phases[h.phases.length - 1].catchId = c.id; persist(); }
      render();
    });
  }
  // catch dialog: from a hunt (found) or to edit/add an entry
  function openCatch(entry, h, preset) {
    var isNew = !entry;
    var e = entry ? JSON.parse(JSON.stringify(entry)) : h ? catchFromHunt(h, h.species, h.count) : { id: newId('c'), species: preset || 0, nick: '', gender: '', nature: '', ball: '', location: '', level: '', game: 'sv', method: 'full', encounters: 0, phases: 0, date: today(), notes: '' };
    modal(h ? t('catchTitle') + ' ★' : isNew ? t('addCatch').replace('+ ', '') : t('editCatch'), function (body) {
      var grid = el('div', { class: 'sh-form-grid' });
      body.appendChild(grid);
      var spi = field(grid, 'Pokémon', speciesInput(e.species, function (n) { e.species = n; }));
      void spi;
      var nick = field(grid, t('nick'), el('input', { type: 'text', value: e.nick || '' }));
      var gen = el('select');
      [['', t('none')], ['M', '♂'], ['F', '♀']].forEach(function (o) { var op = el('option', { value: o[0], text: o[1] }); if (e.gender === o[0]) op.selected = true; gen.appendChild(op); });
      field(grid, t('gender'), gen);
      var nat = el('select');
      nat.appendChild(el('option', { value: '', text: t('none') }));
      NATURES.forEach(function (n) { var op = el('option', { value: n, text: A.nNature ? A.nNature(n) : n }); if (e.nature === n) op.selected = true; nat.appendChild(op); });
      field(grid, t('nature'), nat);
      var lv = field(grid, t('level'), el('input', { type: 'number', min: 1, max: 100, value: e.level || '' }));
      var ball = field(grid, t('ball'), el('input', { type: 'text', value: e.ball || '' }));
      var loc = field(grid, t('location'), el('input', { type: 'text', value: e.location || '' }));
      var gm = el('select');
      O.GAMES.forEach(function (x) { var op = el('option', { value: x.id, text: de ? x.de : x.en }); if (e.game === x.id) op.selected = true; gm.appendChild(op); });
      field(grid, t('game'), gm);
      var enc = field(grid, t('encounters'), el('input', { type: 'number', min: 0, value: e.encounters || 0 }));
      var dt = field(grid, t('date'), el('input', { type: 'date', value: e.date || today() }));
      var nt = field(body, t('notes'), el('input', { type: 'text', value: e.notes || '' }));
      return function () {
        return Object.assign(e, { nick: nick.value.trim(), gender: gen.value, nature: nat.value, level: lv.value ? +lv.value : '', ball: ball.value.trim(),
          location: loc.value.trim(), game: gm.value, encounters: +enc.value || 0, date: dt.value, notes: nt.value.trim() });
      };
    }, function (v) {
      if (!v.species) { A.toast(t('pick')); return false; }
      if (h) {
        h.status = 'found'; h.foundAt = v.date; setRunning(h, false);
        v.phases = h.phases.length;
        store.collection.unshift(v);
        A.toast(t('huntFound', monName(v.species)));
      } else if (isNew) store.collection.unshift(v);
      else store.collection = store.collection.map(function (c) { return c.id === v.id ? v : c; });
      persist(); render();
    });
  }

  // ---------- collection / shiny dex ----------
  function renderDex(body) {
    var wrap = el('div', { class: 'sh-dexwrap' });
    body.appendChild(wrap);
    var caught = {}, seen = {};
    store.collection.forEach(function (c) { if (c.species) caught[c.species] = (caught[c.species] || 0) + 1; });
    store.hunts.forEach(function (h) { h.phases.forEach(function (p) { if (p.result === 'failed') seen[p.species] = 1; }); });
    var species = Object.keys(caught).length;
    var bar = el('div', { class: 'sh-dexbar panel' });
    bar.appendChild(el('span', { class: 'sh-dexstats', text: t('dexStats', store.collection.length, species, species, NAT.length - 1) }));
    var views = el('div', { class: 'btn-group nc-mini' });
    [['catches', t('catches')], ['dex', t('dex')]].forEach(function (x) {
      var b = el('button', { class: store.dexView === x[0] ? 'on' : '', text: x[1] });
      b.addEventListener('click', function () { store.dexView = x[0]; persist(); render(); });
      views.appendChild(b);
    });
    bar.appendChild(views);
    var gens = el('div', { class: 'btn-group nc-mini' });
    for (var gi = 0; gi <= 9; gi++) (function (gn) {
      var b = el('button', { class: store.dexGen === gn ? 'on' : '', text: gn ? String(gn) : t('allGens'), title: gn ? t('genN', gn) : '' });
      b.addEventListener('click', function () { store.dexGen = gn; persist(); render(); });
      gens.appendChild(b);
    })(gi);
    bar.appendChild(gens);
    var add = el('button', { class: 'primary-btn', text: t('addCatch') });
    add.addEventListener('click', function () { openCatch(null, null); });
    bar.appendChild(add);
    wrap.appendChild(bar);
    var lo = store.dexGen ? GEN_END[store.dexGen - 1] + 1 : 1, hi = store.dexGen ? GEN_END[store.dexGen] : NAT.length - 1;
    var box = el('div', { class: 'sh-dexbody panel' });
    wrap.appendChild(box);
    if (store.dexView === 'dex') {
      // progress for the range
      var got = 0; for (var n = lo; n <= hi; n++) if (caught[n]) got++;
      var pr = el('div', { class: 'sh-dexprog' });
      pr.appendChild(el('span', { text: got + ' / ' + (hi - lo + 1) + ' ' + t('caught') }));
      var pb = el('div', { class: 'sh-cbar' }); var pf = el('span'); pf.style.width = (got / (hi - lo + 1) * 100) + '%'; pb.appendChild(pf); pr.appendChild(pb);
      box.appendChild(pr);
      var grid = el('div', { class: 'sh-dexgrid' });
      for (var k = lo; k <= hi; k++) (function (n) {
        var c = el('div', { class: 'sh-dexcell' + (caught[n] ? ' caught' : seen[n] ? ' seen' : ''), title: '#' + n + ' ' + monName(n) + (caught[n] ? ' · ' + caught[n] + '× ' + t('caught') : seen[n] ? ' · ' + t('seen') : '') });
        c.appendChild(caught[n] ? shinyImg(n, 'sh-dex-img') : normalImg(n, 'sh-dex-img'));
        c.appendChild(el('span', { class: 'sh-dexno', text: '#' + n }));
        if (caught[n] > 1) c.appendChild(el('span', { class: 'sh-dexn', text: '×' + caught[n] }));
        c.addEventListener('click', function () { openCatch(null, null, n); });
        grid.appendChild(c);
      })(k);
      box.appendChild(grid);
      return;
    }
    var list = store.collection.filter(function (c) { return !store.dexGen || (c.species >= lo && c.species <= hi); });
    if (!list.length) { box.appendChild(el('div', { class: 'hint nc-empty big', text: t('noCatches') })); return; }
    var cards = el('div', { class: 'sh-catches' });
    list.forEach(function (c) {
      var card = el('div', { class: 'sh-catch' });
      card.appendChild(shinyImg(c.species, 'sh-catch-img'));
      var tx = el('div', { class: 'sh-catch-txt' });
      tx.appendChild(el('div', { class: 'sh-item-name', text: (c.nick ? c.nick + ' · ' : '') + monName(c.species) + (c.gender === 'M' ? ' ♂' : c.gender === 'F' ? ' ♀' : '') }));
      var g = O.game(c.game), m = O.method(c.method);
      tx.appendChild(el('div', { class: 'sh-item-sub', text: (de ? g.de : g.en) + ' · ' + (de ? m.de : m.en) }));
      tx.appendChild(el('div', { class: 'sh-item-sub', text: [c.encounters ? fmt(c.encounters) + ' ' + t('encounters') : '', c.phases ? t('phasesN', c.phases) : '', c.nature ? (A.nNature ? A.nNature(c.nature) : c.nature) : '',
        c.level ? 'Lv. ' + c.level : '', c.ball, c.location, c.date ? new Date(c.date).toLocaleDateString(de ? 'de-DE' : 'en-US') : ''].filter(Boolean).join(' · ') }));
      if (c.notes) tx.appendChild(el('div', { class: 'hint', text: c.notes }));
      card.appendChild(tx);
      var tools = el('div', { class: 'sh-catch-tools' });
      var ed = el('button', { class: 'tbtn', text: '✎', title: t('editCatch') });
      ed.addEventListener('click', function () { openCatch(c, null); });
      var dl = el('button', { class: 'tbtn danger', text: '✕', title: t('delCatch') });
      dl.addEventListener('click', function () { if (!confirm(t('delCatchConfirm'))) return; store.collection = store.collection.filter(function (x) { return x !== c; }); persist(); render(); });
      tools.appendChild(ed); tools.appendChild(dl);
      card.appendChild(tools);
      cards.appendChild(card);
    });
    box.appendChild(cards);
  }

  // ---------- hotkeys & OBS ----------
  var recording = false;
  function accelFromEvent(ev) {
    var k = ev.key;
    if (['Control', 'Alt', 'Shift', 'Meta'].indexOf(k) !== -1) return null;
    var map = { ' ': 'Space', '+': 'Plus', ArrowUp: 'Up', ArrowDown: 'Down', ArrowLeft: 'Left', ArrowRight: 'Right', Escape: 'Esc' };
    if (/^Numpad(\d)$/.test(ev.code)) k = 'num' + ev.code.slice(6);
    else if (ev.code === 'NumpadAdd') k = 'numadd';
    else if (ev.code === 'NumpadSubtract') k = 'numsub';
    else if (map[k]) k = map[k];
    else if (/^F\d+$/.test(k)) k = k;
    else if (k.length === 1) k = k.toUpperCase();
    var parts = [];
    if (ev.ctrlKey) parts.push('CommandOrControl');
    if (ev.altKey) parts.push('Alt');
    if (ev.shiftKey) parts.push('Shift');
    parts.push(k);
    return parts.join('+');
  }
  function accelLabel(a) { return a ? a.replace('CommandOrControl', de ? 'Strg' : 'Ctrl').replace(/\+/g, ' + ').replace('Plus', '+') : t('none'); }
  function renderSetup(body) {
    var wrap = el('div', { class: 'sh-setup' });
    body.appendChild(wrap);
    // hotkeys
    var hp = el('div', { class: 'panel sh-card' });
    hp.appendChild(el('h3', { text: t('hkTitle') }));
    hp.appendChild(el('div', { class: 'hint', text: D ? t('hkHint') : t('hkDesktop') }));
    ['inc', 'dec', 'phase', 'timer'].forEach(function (a) {
      var r = el('div', { class: 'sh-hk-row' });
      r.appendChild(el('span', { class: 'sh-hk-name', text: t('act_' + a) }));
      var key = el('span', { class: 'sh-hk-key', text: accelLabel(store.hotkeys[a]) });
      r.appendChild(key);
      var stx = el('span', { class: 'sh-hk-st' });
      if (D && store.hotkeys[a]) { stx.textContent = hkResult[a] ? '✓ ' + t('hkOk') : '✕ ' + t('hkFail'); stx.classList.add(hkResult[a] ? 'ok' : 'bad'); }
      var cb = el('button', { class: 'tbtn', text: t('change') });
      cb.disabled = !D;
      cb.addEventListener('click', function () {
        recording = true; key.textContent = t('pressKeys'); key.classList.add('rec');
        function onKey(ev) {
          ev.preventDefault(); ev.stopPropagation();
          if (ev.key === 'Escape') { done(); render(); return; }
          var acc = accelFromEvent(ev);
          if (!acc) return;
          store.hotkeys[a] = acc; done();
          applyHotkeys().then(function () { persist(); render(); });
        }
        function done() { recording = false; document.removeEventListener('keydown', onKey, true); }
        document.addEventListener('keydown', onKey, true);
      });
      var rb = el('button', { class: 'tbtn', text: t('remove') });
      rb.disabled = !D || !store.hotkeys[a];
      rb.addEventListener('click', function () { store.hotkeys[a] = ''; applyHotkeys().then(function () { persist(); render(); }); });
      r.appendChild(cb); r.appendChild(rb); r.appendChild(stx);
      hp.appendChild(r);
    });
    wrap.appendChild(hp);

    // OBS overlay
    var op = el('div', { class: 'panel sh-card' });
    op.appendChild(el('h3', { text: t('obsTitle') }));
    if (!D) { op.appendChild(el('div', { class: 'hint', text: t('obsDesktop') })); wrap.appendChild(op); return; }
    op.appendChild(el('div', { class: 'hint', text: t('obsHint') }));
    var o = store.overlay;
    var urlRow = el('div', { class: 'sh-url' });
    var urlIn = el('input', { type: 'text', readonly: 'readonly' });
    var cp = el('button', { class: 'tbtn', text: t('copy') });
    cp.addEventListener('click', function () { A.copy(urlIn.value); });
    urlRow.appendChild(urlIn); urlRow.appendChild(cp);
    op.appendChild(urlRow);
    var opts = el('div', { class: 'sh-obs-opts' });
    function sel3(label, list, cur, fn) {
      var w = el('label', { class: 'nc-sel' }); w.appendChild(el('span', { text: label }));
      var s = el('select'); list.forEach(function (x) { var q = el('option', { value: x[0], text: x[1] }); if (String(x[0]) === String(cur)) q.selected = true; s.appendChild(q); });
      s.addEventListener('change', function () { fn(s.value); persist(); update(); }); w.appendChild(s); opts.appendChild(w);
    }
    sel3(t('which'), [['', t('whichSel')]].concat(store.hunts.map(function (h) { return [h.id, huntName(h)]; })), o.hunt || '', function (v) { o.hunt = v; });
    sel3(t('layout'), [['row', t('l_row')], ['card', t('l_card')], ['count', t('l_count')]], o.layout, function (v) { o.layout = v; });
    sel3(t('size'), [[0.6, '60 %'], [0.8, '80 %'], [1, '100 %'], [1.25, '125 %'], [1.5, '150 %'], [2, '200 %']], o.size, function (v) { o.size = +v; });
    ['sprite', 'name', 'odds', 'phase', 'timer'].forEach(function (k) {
      var c = el('label', { class: 'nc-check sh-chk' }); var cb = el('input', { type: 'checkbox' }); cb.checked = !!o[k];
      cb.addEventListener('change', function () { o[k] = cb.checked ? 1 : 0; persist(); update(); });
      c.appendChild(cb); c.appendChild(document.createTextNode(' ' + t('sh_' + k))); opts.appendChild(c);
    });
    [['color', t('color')], ['accent', t('accent')]].forEach(function (x) {
      var w = el('label', { class: 'nc-sel' }); w.appendChild(el('span', { text: x[1] }));
      var ci = el('input', { type: 'color', value: o[x[0]] }); ci.addEventListener('change', function () { o[x[0]] = ci.value; persist(); update(); });
      w.appendChild(ci); opts.appendChild(w);
    });
    var bw = el('label', { class: 'nc-sel' }); bw.appendChild(el('span', { text: t('bg') }));
    var bgc = el('input', { type: 'checkbox' }); bgc.checked = !o.bg; bgc.title = t('transparent');
    var bgi = el('input', { type: 'color', value: o.bg || '#1b1d21' });
    bgc.addEventListener('change', function () { o.bg = bgc.checked ? '' : bgi.value; persist(); update(); });
    bgi.addEventListener('change', function () { if (!bgc.checked) { o.bg = bgi.value; persist(); update(); } });
    bw.appendChild(bgc); bw.appendChild(document.createTextNode(t('transparent') + ' ')); bw.appendChild(bgi);
    opts.appendChild(bw);
    op.appendChild(opts);
    op.appendChild(el('div', { class: 'sh-lbl', text: t('preview') }));
    var frame = el('iframe', { class: 'sh-preview', title: t('preview') });
    op.appendChild(frame);
    var baseUrl = '';
    function url() {
      var q = [];
      if (o.hunt) q.push('hunt=' + encodeURIComponent(o.hunt));
      if (o.layout !== 'row') q.push('layout=' + o.layout);
      ['sprite', 'name', 'odds', 'phase', 'timer'].forEach(function (k) { if (!o[k]) q.push(k + '=0'); });
      if (o.color && o.color !== '#ffffff') q.push('color=' + o.color.slice(1));
      if (o.accent && o.accent !== '#f2c94c') q.push('accent=' + o.accent.slice(1));
      if (o.bg) q.push('bg=' + o.bg.slice(1));
      if (+o.size !== 1) q.push('size=' + o.size);
      return baseUrl + (q.length ? '?' + q.join('&') : '');
    }
    function update() { if (!baseUrl) return; urlIn.value = url(); frame.src = url(); }
    wrap.appendChild(op);
    // text files
    var fp = el('div', { class: 'panel sh-card' });
    fp.appendChild(el('h3', { text: t('files') }));
    fp.appendChild(el('div', { class: 'hint', text: t('filesHint') }));
    var dirRow = el('div', { class: 'sh-url' });
    var dirIn = el('input', { type: 'text', readonly: 'readonly' });
    var od = el('button', { class: 'tbtn', text: t('openDir') });
    od.addEventListener('click', function () { D.openObsDir(); });
    dirRow.appendChild(dirIn); dirRow.appendChild(od);
    fp.appendChild(dirRow);
    wrap.appendChild(fp);
    D.overlayInfo().then(function (info) { baseUrl = info.url; dirIn.value = info.dir; update(); });
  }

  // start screen card art: shiny sprites of the last catches or hunts
  function renderStartArt() {
    var box = document.getElementById('startShiny');
    if (!box) return;
    var ns = store.collection.slice(0, 3).map(function (c) { return c.species; });
    store.hunts.forEach(function (h) { if (ns.length < 3 && h.species && ns.indexOf(h.species) === -1) ns.push(h.species); });
    if (!ns.length) ns = [130, 25, 282];
    box.innerHTML = '';
    ns.slice(0, 3).forEach(function (n) { box.appendChild(shinyImg(n, 'sc-shiny-img')); });
    var h = sel();
    box.appendChild(el('span', { class: 'sc-shiny-count', text: h ? fmt(h.count) + ' · ' + oddsText(h) : '1/4096' }));
  }

  window.CCShiny = { render: render, renderStartArt: renderStartArt, _store: function () { return store; }, _count: count, _hotkey: hotkeyAction };
  function boot() { renderStartArt(); applyHotkeys(); pushState(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();

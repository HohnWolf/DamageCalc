// Shiny-Zähler (eigener Modus #shinyView): beliebig viele parallele Hunts mit Quote pro Spiel und Methode,
// Phasen, Timer (Zähler und Zeit auch von Hand), Statistik, Shiny-Sammlung mit Shiny-Dex, globale Hotkeys und OBS-Overlay (Desktop-App).
// Automatische Erkennung: js/shiny_detect.js (Alpha). Clips (Replay-Puffer): js/shiny_clip.js.
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
    obsDesktop: 'Das OBS-Overlay gibt es nur in der Desktop-App.', copy: 'Kopieren', layout: 'Layout', l_row: 'Nebeneinander', l_card: 'Karte', l_count: 'Nur Zahl', l_free: 'Frei anordnen',
    freeHint: 'Teile in der Vorschau mit der Maus verschieben. Mausrad über einem Teil = Größe, Pfeiltasten = genau verschieben (mit Umschalt 10 px). Änderungen erscheinen sofort in OBS.',
    freeObs: 'In OBS die Browser-Quelle auf {0} × {1} stellen.', stageW: 'Breite', stageH: 'Höhe', freeReset: 'Anordnung zurücksetzen',
    show: 'Anzeigen', sh_sprite: 'Sprite', sh_name: 'Name', sh_odds: 'Quote', sh_phase: 'Phase', sh_timer: 'Timer', color: 'Schrift', accent: 'Zahl', bg: 'Hintergrund',
    transparent: 'durchsichtig', size: 'Größe', which: 'Hunt', whichSel: 'immer der ausgewählte', preview: 'Vorschau', files: 'Textdateien für OBS',
    filesHint: 'Werden bei jeder Änderung aktualisiert (zaehler.txt, gesamt.txt, phase.txt, quote.txt, chance.txt, timer.txt, pokemon.txt, methode.txt, spiel.txt).',
    setBtn: '✎ Festlegen', setT: 'Begegnungen und Zeit von Hand festlegen (auch per Doppelklick auf Zahl oder Zeit)', setTitle: 'Zähler und Zeit festlegen',
    setCount: 'Begegnungen (diese Phase)', setTotal: 'Gesamt (alle Phasen)', setTotalT: 'Leer lassen: ändert sich um denselben Betrag wie die Begegnungen', setTime: 'Zeit (Stunden : Minuten : Sekunden)',
    setHint: 'Zum Übernehmen eines Hunts aus einem anderen Zähler oder zum Korrigieren. „Heute“ bleibt unverändert.', act_clip: 'Clip speichern', clipPlay: 'Clip abspielen',
    openDir: 'Ordner öffnen', keysLocal: 'Tasten im Fenster: + zählt, − zählt zurück', counted: '+{0} · {1}', huntFound: 'Glückwunsch zum Shiny {0}!', startHint: 'Wähle links einen Hunt oder lege einen neuen an.',
    act_projector: 'Projektor', projector: 'Projektor', projectorT: 'Öffnet die Aufnahme in einem eigenen Fenster, mit Zähler, Quote und Timer darüber. Der gelbe Erkennungsrahmen bleibt nur in diesem Fenster.',
    projectorDesktop: 'Den Projektor gibt es nur in der Desktop-App.', projectorNoVideo: 'Erst eine Aufnahme verbinden (Bildschirm oder Capture-Karte).',
    projectorOpenFail: 'Das Projektor-Fenster konnte nicht geöffnet werden.',
    projectorNoAudio: 'Diese Quelle liefert keinen Ton. Das Bild wird trotzdem gezeigt.',
    projectorFps: 'Bilder/s', projectorFpsN: 'Bilder pro Sekunde (10 bis 60)', projectorFpsHint: 'Ziel für den Projektor. Höher als die Quelle wird nicht gezeichnet.'
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
    obsDesktop: 'The OBS overlay is only available in the desktop app.', copy: 'Copy', layout: 'Layout', l_row: 'Side by side', l_card: 'Card', l_count: 'Number only', l_free: 'Free arrangement',
    freeHint: 'Drag the parts in the preview with the mouse. Mouse wheel over a part = size, arrow keys = move precisely (with Shift 10 px). Changes show up in OBS right away.',
    freeObs: 'Set the browser source in OBS to {0} × {1}.', stageW: 'Width', stageH: 'Height', freeReset: 'Reset arrangement',
    show: 'Show', sh_sprite: 'Sprite', sh_name: 'Name', sh_odds: 'Odds', sh_phase: 'Phase', sh_timer: 'Timer', color: 'Text', accent: 'Number', bg: 'Background',
    transparent: 'transparent', size: 'Size', which: 'Hunt', whichSel: 'always the selected one', preview: 'Preview', files: 'Text files for OBS',
    filesHint: 'Updated on every change (zaehler.txt = count, gesamt.txt = total, phase.txt, quote.txt = odds, chance.txt, timer.txt, pokemon.txt, methode.txt, spiel.txt).',
    setBtn: '✎ Set', setT: 'Set encounters and time by hand (also by double-clicking the number or the time)', setTitle: 'Set counter and time',
    setCount: 'Encounters (this phase)', setTotal: 'Total (all phases)', setTotalT: 'Leave empty: changes by the same amount as the encounters', setTime: 'Time (hours : minutes : seconds)',
    setHint: 'To take over a hunt from another counter or to correct it. "Today" stays as it is.', act_clip: 'Save clip', clipPlay: 'Play clip',
    openDir: 'Open folder', keysLocal: 'Keys in the window: + counts, − counts back', counted: '+{0} · {1}', huntFound: 'Congratulations on the shiny {0}!', startHint: 'Pick a hunt on the left or create a new one.',
    act_projector: 'Projector', projector: 'Projector', projectorT: 'Opens the capture in its own window, with counter, odds and timer on top. The yellow detection box stays in this window only.',
    projectorDesktop: 'The projector is only available in the desktop app.', projectorNoVideo: 'Connect a capture first (screen or capture card).',
    projectorOpenFail: 'The projector window could not be opened.',
    projectorNoAudio: 'This source has no audio. The picture is still shown.',
    projectorFps: 'Frames/s', projectorFpsN: 'Frames per second (10 to 60)', projectorFpsHint: 'Target for the projector. It will not draw faster than the source.'
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
    if (!big && n && NAT[n] && A.spriteById) return A.spriteById(sid(n), cls || '', true, monName(n));
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
    if (n && NAT[n] && A.spriteById) return A.spriteById(sid(n), cls || '', false, monName(n));
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
  // free overlay layout: stage size and, per part, position (px from the top left) and size factor
  var OV_PARTS = ['sprite', 'name', 'count', 'odds', 'phase', 'timer'];
  function freeDefaults() {
    return { w: 600, h: 250, items: { sprite: { x: 12, y: 65, s: 1 }, name: { x: 150, y: 58, s: 1 }, count: { x: 150, y: 88, s: 1 },
      odds: { x: 150, y: 146, s: 1 }, phase: { x: 150, y: 168, s: 1 }, timer: { x: 150, y: 190, s: 1 } } };
  }
  function cleanFree(f) {
    var d = freeDefaults(), num = function (v, lo, hi, def) { v = +v; return isFinite(v) ? Math.max(lo, Math.min(hi, v)) : def; };
    f = f && typeof f === 'object' ? f : {};
    var out = { w: Math.round(num(f.w, 100, 3840, d.w)), h: Math.round(num(f.h, 50, 2160, d.h)), items: {} };
    OV_PARTS.forEach(function (k) {
      var it = (f.items && f.items[k]) || {}, di = d.items[k];
      out.items[k] = { x: Math.round(num(it.x, -4000, 4000, di.x)), y: Math.round(num(it.y, -4000, 4000, di.y)), s: Math.round(num(it.s, 0.3, 5, di.s) * 100) / 100 };
    });
    return out;
  }
  store.overlay.free = cleanFree(store.overlay.free);
  // the preview (electron/overlay.html?edit=1 on the local OBS server) reports every move or resize
  window.addEventListener('message', function (ev) {
    var d = ev.data;
    if (!d || d.type !== 'rl-ov-free' || !/^http:\/\/127\.0\.0\.1:\d+$/.test(ev.origin)) return;
    store.overlay.free = cleanFree({ w: store.overlay.free.w, h: store.overlay.free.h, items: d.items });
    persist();
  });
  store.tab = store.tab || 'hunts';
  if (store.hotkeys.clip == null) store.hotkeys.clip = '';
  if (store.hotkeys.projector == null) store.hotkeys.projector = 'CommandOrControl+Alt+P';
  function cleanProjector(p) {
    p = p && typeof p === 'object' ? p : {};
    var b = p.bounds && typeof p.bounds === 'object' ? p.bounds : null;
    var id = p.displayId == null || p.displayId === '' ? null : p.displayId;
    return {
      onTop: !!p.onTop, hideCursor: !!p.hideCursor, overlay: p.overlay !== false,
      fullscreen: !!p.fullscreen, displayId: id,
      fps: window.CCProjectorMirror ? window.CCProjectorMirror.clampFps(p.fps) : 20,
      sound: p.sound !== false,
      volume: window.CCProjectorMirror ? window.CCProjectorMirror.clampVolume(p.volume) : 80,
      bounds: b ? { x: Math.round(+b.x) || 0, y: Math.round(+b.y) || 0, width: Math.max(480, Math.round(+b.width) || 960), height: Math.max(270, Math.round(+b.height) || 540) } : null
    };
  }
  store.projector = cleanProjector(store.projector);
  function overlayHref(base, edit) {
    if (!base) return '';
    var o = store.overlay, q = [];
    if (o.hunt) q.push('hunt=' + encodeURIComponent(o.hunt));
    if (o.layout !== 'row') q.push('layout=' + o.layout);
    ['sprite', 'name', 'odds', 'phase', 'timer'].forEach(function (k) { if (!o[k]) q.push(k + '=0'); });
    if (o.color && o.color !== '#ffffff') q.push('color=' + o.color.slice(1));
    if (o.accent && o.accent !== '#f2c94c') q.push('accent=' + o.accent.slice(1));
    if (o.bg) q.push('bg=' + o.bg.slice(1));
    if (+o.size !== 1 && o.layout !== 'free') q.push('size=' + o.size);
    var u = base + (q.length ? '?' + q.join('&') : '');
    if (edit) u += (u.indexOf('?') >= 0 ? '&' : '?') + 'edit=1';
    return u;
  }
  var Clip = window.CCShinyClip || null;
  if (Clip) store.clip = Clip.init(store.clip, function () { persist(); });
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
  // clips (js/shiny_clip.js): automatically on "Found!" and on a phase, when switched on
  function autoClip(h, reason) {
    if (!Clip || !Clip.active() || !h) return;
    if (reason === 'found' ? !store.clip.autoFound : !store.clip.autoPhase) return;
    var at = Date.now();
    Clip.trigger(reason, huntName(h), h.id).then(function (c) {
      if (!c || reason !== 'found' || !c.path) return;
      h.lastClip = c.path; h.lastClipAt = at;
      // the catch may already be saved: link the clip there
      var e = store.collection.filter(function (x) { return x.hunt === h.id && !x.clip && (x.savedAt || 0) >= at - 1000; })[0];
      if (e) e.clip = c.path;
      persist(); rerender();
    });
  }
  // set encounters, total and time by hand (taking over a hunt, corrections)
  function openSetCount(h) {
    modal(t('setTitle'), function (body) {
      body.appendChild(el('div', { class: 'hint', text: t('setHint') }));
      var c = field(body, t('setCount'), el('input', { type: 'number', min: 0, step: 1, value: h.count }));
      var tot = field(body, t('setTotal'), el('input', { type: 'number', min: 0, step: 1, placeholder: fmt(h.total || 0), title: t('setTotalT') }));
      var ms = timeOf(h), tw = el('div', { class: 'sh-settime' });
      var hh = el('input', { type: 'number', min: 0, max: 99999, value: Math.floor(ms / 3600000) });
      var mm = el('input', { type: 'number', min: 0, max: 59, value: Math.floor(ms % 3600000 / 60000) });
      var ss = el('input', { type: 'number', min: 0, max: 59, value: Math.floor(ms % 60000 / 1000) });
      tw.appendChild(hh); tw.appendChild(document.createTextNode(':')); tw.appendChild(mm); tw.appendChild(document.createTextNode(':')); tw.appendChild(ss);
      field(body, t('setTime'), tw);
      setTimeout(function () { c.select(); }, 0);
      return function () {
        var n = function (x, hi) { var v = Math.floor(+x.value); return isNaN(v) || v < 0 ? 0 : Math.min(hi, v); };
        return { count: n(c, 1e9), total: tot.value === '' ? null : n(tot, 1e9), ms: ((n(hh, 99999) * 60 + n(mm, 59)) * 60 + n(ss, 59)) * 1000 };
      };
    }, function (v) {
      var d = v.count - h.count;
      h.count = v.count;
      h.total = v.total != null ? Math.max(v.total, v.count) : Math.max(v.count, (h.total || 0) + d);
      h.timeMs = v.ms;
      if (h.runStart) h.runStart = Date.now();
      persist(); render();
    });
  }
  // global hotkeys and the window keys
  function hotkeyAction(action) {
    if (action === 'clip') { if (Clip) Clip.trigger('manual', sel() ? huntName(sel()) : '', sel() ? sel().id : ''); return; }
    if (action === 'projector') { if (window.CCProjector) window.CCProjector.toggle(sel() ? sel().id : null); return; }
    if (action === 'phase') autoClip(sel(), 'phase');
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
      D.pushState({ hunts: store.hunts.map(stateOf), active: active, overlay: { free: store.overlay.free } });
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
      ccConfirm(t('delConfirm', huntName(h)), function () {
        if (window.CCShinyDetect) window.CCShinyDetect.stop(h.id);
        store.hunts = store.hunts.filter(function (x) { return x !== h; }); store.sel = store.hunts[0] ? store.hunts[0].id : null; persist(); render();
      }, { danger: true });
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
    var num = el('div', { class: 'sh-count', 'data-count': h.id, text: fmt(h.count), title: t('setT') });
    num.addEventListener('dblclick', function () { openSetCount(h); });
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
      fb.addEventListener('click', function () { autoClip(h, 'phase'); finishPhase(h, h.species, true, false); render(); });
      var gb = el('button', { class: 'primary-btn sh-foundbtn', text: t('foundBtn') });
      gb.addEventListener('click', function () { autoClip(h, 'found'); openCatch(null, h); });
      var rb = el('button', { class: 'tbtn', text: t('resetBtn') });
      rb.addEventListener('click', function () {
        ccConfirm(t('resetConfirm'), function () {
          h.count = 0; h.total = 0; h.phases = []; h.timeMs = 0; h.runStart = h.runStart ? Date.now() : 0; h.days = {}; persist(); render();
        }, { danger: true, ok: ['Zurücksetzen', 'Reset'] });
      });
      var setb = el('button', { class: 'tbtn', text: t('setBtn'), title: t('setT') });
      setb.addEventListener('click', function () { openSetCount(h); });
      acts.appendChild(pb); acts.appendChild(fb); acts.appendChild(gb); acts.appendChild(setb); acts.appendChild(rb);
      cc.appendChild(acts);
    }
    // timer
    var tm = el('div', { class: 'sh-timer' });
    tm.appendChild(el('span', { class: 'sh-lbl', text: t('timer') }));
    var tme = el('span', { class: 'sh-time', 'data-timer': h.id, text: dur(timeOf(h)), title: t('setT') });
    tme.addEventListener('dblclick', function () { openSetCount(h); });
    tm.appendChild(tme);
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
        name: function () { return h.species ? monName(h.species) : ''; },
        projector: D && window.CCProjector ? function () { window.CCProjector.toggle(h.id); } : null,
        projectorOn: function () { return !!(window.CCProjector && window.CCProjector.isOpen()); },
        projectorLabel: function () { return t('projector'); },
        projectorTitle: t('projectorT'),
        getFps: function () { return store.projector.fps; },
        setFps: function (n) { store.projector.fps = window.CCProjectorMirror.clampFps(n); persist(); },
        fpsLabel: t('projectorFps'), fpsNumber: t('projectorFpsN'), fpsHint: t('projectorFpsHint') });
    }
    if (Clip) {
      var cp = el('div', { class: 'sh-detect sh-clip panel' });
      grid.appendChild(cp);
      Clip.panel(cp, { name: function () { return huntName(h); }, hunt: function () { return h.id; },
        stream: function () { return window.CCShinyDetect && window.CCShinyDetect.stream ? window.CCShinyDetect.stream(h.id) : null; } });
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
      autoClip(h, 'phase');
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
        v.phases = h.phases.length; v.savedAt = Date.now();
        if (h.lastClip && Date.now() - (h.lastClipAt || 0) < 15 * 60000) v.clip = h.lastClip;
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
    var qIn = el('input', { type: 'search', placeholder: de ? 'Sammlung durchsuchen …' : 'Search collection …', value: store.dexQ || '' });
    qIn.style.cssText = 'height:28px;padding:0 8px;width:165px;font-size:12.5px;';
    qIn.addEventListener('input', function () { store.dexQ = qIn.value; render(); var f = root.querySelector('.sh-dexbar input[type=search]'); if (f) { f.focus(); f.setSelectionRange(f.value.length, f.value.length); } });
    bar.appendChild(qIn);
    if (store.dexView !== 'dex') {
      var srt = el('select', { title: de ? 'Sortierung' : 'Sort' });
      srt.style.cssText = 'height:28px;font-size:12.5px;padding:0 6px;';
      [['date', de ? 'Neueste zuerst' : 'Newest first'], ['enc_desc', de ? 'Meiste Begegnungen' : 'Most encounters'],
       ['enc_asc', de ? 'Wenigste Begegnungen' : 'Fewest encounters'], ['dex', de ? 'Pokédex-Nr.' : 'Pokédex #'], ['name', 'A–Z']].forEach(function (o) {
        var op = el('option', { value: o[0], text: o[1] });
        if ((store.dexSort || 'date') === o[0]) op.selected = true;
        srt.appendChild(op);
      });
      srt.addEventListener('change', function () { store.dexSort = srt.value; persist(); render(); });
      bar.appendChild(srt);
    }
    var add = el('button', { class: 'primary-btn', text: t('addCatch') });
    add.addEventListener('click', function () { openCatch(null, null); });
    bar.appendChild(add);
    wrap.appendChild(bar);
    var lo = store.dexGen ? GEN_END[store.dexGen - 1] + 1 : 1, hi = store.dexGen ? GEN_END[store.dexGen] : NAT.length - 1;
    var box = el('div', { class: 'sh-dexbody panel' });
    wrap.appendChild(box);
    var q = norm(store.dexQ || '');
    if (store.dexView === 'dex') {
      // progress for the range
      var got = 0; for (var n = lo; n <= hi; n++) if (caught[n]) got++;
      var pr = el('div', { class: 'sh-dexprog' });
      pr.appendChild(el('span', { text: got + ' / ' + (hi - lo + 1) + ' ' + t('caught') }));
      var pb = el('div', { class: 'sh-cbar' }); var pf = el('span'); pf.style.width = (got / (hi - lo + 1) * 100) + '%'; pb.appendChild(pf); pr.appendChild(pb);
      box.appendChild(pr);
      var grid = el('div', { class: 'sh-dexgrid' });
      for (var k = lo; k <= hi; k++) (function (n) {
        if (q && norm(monName(n)).indexOf(q) === -1 && String(n).indexOf(q) === -1) return;
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
    var list = store.collection.filter(function (c) {
      if (store.dexGen && (c.species < lo || c.species > hi)) return false;
      if (!q) return true;
      return norm(monName(c.species)).indexOf(q) !== -1 || norm(c.nick).indexOf(q) !== -1 || norm(c.location).indexOf(q) !== -1 || String(c.species).indexOf(q) !== -1;
    }).slice();
    var srtKey = store.dexSort || 'date';
    if (srtKey === 'enc_desc') list.sort(function (a, b) { return (b.encounters || 0) - (a.encounters || 0); });
    else if (srtKey === 'enc_asc') list.sort(function (a, b) { return (a.encounters || 0) - (b.encounters || 0); });
    else if (srtKey === 'dex') list.sort(function (a, b) { return (a.species || 0) - (b.species || 0); });
    else if (srtKey === 'name') list.sort(function (a, b) { return monName(a.species).localeCompare(monName(b.species), de ? 'de' : 'en'); });
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
      dl.addEventListener('click', function () { ccConfirm(t('delCatchConfirm'), function () { store.collection = store.collection.filter(function (x) { return x !== c; }); persist(); render(); }, { danger: true }); });
      if (c.clip && Clip && D) { var pl = el('button', { class: 'tbtn', text: '▶', title: t('clipPlay') }); pl.addEventListener('click', function () { Clip.open(c.clip); }); tools.appendChild(pl); }
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
    ['inc', 'dec', 'phase', 'timer', 'clip', 'projector'].forEach(function (a) {
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
    var isFree = o.layout === 'free';
    sel3(t('layout'), [['row', t('l_row')], ['card', t('l_card')], ['count', t('l_count')], ['free', t('l_free')]], o.layout, function (v) { o.layout = v; render(); });
    // free arrangement: every part has its own size, so the overall size is not needed
    if (!isFree) sel3(t('size'), [[0.6, '60 %'], [0.8, '80 %'], [1, '100 %'], [1.25, '125 %'], [1.5, '150 %'], [2, '200 %']], o.size, function (v) { o.size = +v; });
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
    var obsSize = null;
    if (isFree) {
      var fr = el('div', { class: 'sh-obs-opts sh-free-opts' });
      [['w', t('stageW'), 100, 3840], ['h', t('stageH'), 50, 2160]].forEach(function (x) {
        var w = el('label', { class: 'nc-sel' }); w.appendChild(el('span', { text: x[1] }));
        var ni = el('input', { type: 'number', min: x[2], max: x[3], step: 10, value: o.free[x[0]] });
        ni.addEventListener('change', function () { o.free[x[0]] = +ni.value; o.free = cleanFree(o.free); ni.value = o.free[x[0]]; persist(); update(); });
        w.appendChild(ni); w.appendChild(document.createTextNode(' px')); fr.appendChild(w);
      });
      var rs = el('button', { class: 'tbtn', text: t('freeReset') });
      rs.addEventListener('click', function () { var w = o.free.w, h = o.free.h; o.free = freeDefaults(); o.free.w = w; o.free.h = h; persist(); update(); });
      fr.appendChild(rs);
      op.appendChild(fr);
      op.appendChild(el('div', { class: 'hint', text: t('freeHint') }));
      obsSize = el('div', { class: 'hint sh-free-obs' });
      op.appendChild(obsSize);
    }
    op.appendChild(el('div', { class: 'sh-lbl', text: t('preview') }));
    // free arrangement: the preview is the real overlay in edit mode at the stage size, scaled down to fit
    var frameWrap = el('div', { class: 'sh-preview-wrap' + (isFree ? ' free' : '') });
    var frame = el('iframe', { class: 'sh-preview', title: t('preview') });
    frameWrap.appendChild(frame);
    op.appendChild(frameWrap);
    frame.addEventListener('load', function () {
      if (isFree && frame.contentWindow) frame.contentWindow.postMessage({ type: 'rl-ov-free-set', free: o.free }, '*');
    });
    var baseUrl = '';
    function fitFrame() {
      if (!isFree) return;
      var k = Math.min(1, (frameWrap.clientWidth || 900) / o.free.w);
      frame.style.width = o.free.w + 'px'; frame.style.height = o.free.h + 'px';
      frame.style.transform = 'scale(' + k + ')';
      frameWrap.style.height = Math.ceil(o.free.h * k) + 2 + 'px';
      if (obsSize) obsSize.textContent = t('freeObs', o.free.w, o.free.h);
    }
    function url() { return overlayHref(baseUrl, false); }
    function update() {
      if (!baseUrl) return;
      var u = url();
      urlIn.value = u;
      frame.src = overlayHref(baseUrl, isFree);
      if (window.CCProjector) window.CCProjector.syncOverlay(u);
      fitFrame();
    }
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

  if (window.CCProjector) window.CCProjector.bind({
    video: function (id) { return window.CCShinyDetect && window.CCShinyDetect.video ? window.CCShinyDetect.video(id) : null; },
    overlayUrl: function () { return baseOverlay ? overlayHref(baseOverlay, false) : ''; },
    opts: function () { return store.projector; },
    save: function (patch) { store.projector = cleanProjector(Object.assign({}, store.projector, patch || {})); persist(); },
    theme: function () { return document.documentElement.getAttribute('data-theme') || 'oled'; },
    lang: de ? 'de' : 'en',
    toast: function (m) { A.toast(m); },
    noDesktop: t('projectorDesktop'), noVideo: t('projectorNoVideo'),
    openFail: t('projectorOpenFail'), noAudio: t('projectorNoAudio')
  });
  var baseOverlay = '';
  if (D) D.overlayInfo().then(function (info) {
    baseOverlay = (info && info.url) || '';
    if (window.CCProjector && window.CCProjector.isOpen()) window.CCProjector.syncOverlay(overlayHref(baseOverlay, false));
  });
  window.CCShiny = { render: render, renderStartArt: renderStartArt, _store: function () { return store; }, _count: count, _hotkey: hotkeyAction, _overlayHref: overlayHref };
  function boot() {
    renderStartArt(); applyHotkeys(); pushState();
    // Ungültige Bildrate aus dem Speicher sofort auf 10–60 zurückschreiben.
    try {
      var raw = JSON.parse(localStorage.getItem('cc_shiny') || '{}');
      if (!raw.projector || raw.projector.fps !== store.projector.fps) A.save('cc_shiny', store);
    } catch (e) { /* Speicher gesperrt */ }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();

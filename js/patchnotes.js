// Patchnotes: nach einem Update zeigt die App beim ersten Start einmal ein Popup mit den Neuerungen seit der zuletzt gesehenen Version.
// Die zuletzt gesehene Version steht in localStorage "cc_lastver". Ohne gemerkte Version (erstes Update auf eine Version mit Patchnotes) zeigt es nur den aktuellen Eintrag.
// Neue Version: oben in NOTES eintragen (Version, de, en). Aufruf von Hand: window.RLPatchnotes.show().
(function () {
  'use strict';
  var A = window.CC;
  if (!A) return;
  var el = A.el, de = A.LANG === 'de';
  var KEY = 'cc_lastver', MAX = 5;
  var NOTES = [
    { v: '1.21.6',
      de: ['Minigames: Alle Spiele zeigen jetzt Home-Sprites, auch Mega-Pokémon haben wieder ein Bild.', 'Schadens-Schätzung: Mega-Pokémon tragen immer ihren Mega-Stein.', 'Wer ist schneller?: Die Pokémon stehen nicht mehr viel zu weit unten.'],
      en: ['Minigames: all games now show Home sprites, Mega Pokémon have a picture again.', 'Damage estimate: Mega Pokémon always hold their Mega Stone.', 'Who is faster?: the Pokémon are no longer far too low on the screen.'] },
    { v: '1.21.5',
      de: ['Schadens-Schätzung: Die Attacken stammen aus den beliebten Sets, ohne Sets meist STAB-Attacken. Die KP werden nicht mehr angezeigt.', 'Schadens-Schätzung: Ab Serie 10 kommen teils Wetter und Terrain dazu, ab Serie 20 teils Statuswert-Änderungen (+1, −2 usw.).', 'Basiswerte-Quiz und „Wer ist schneller?“: Die Auswahlkarten überlagern sich nicht mehr, bei „Wer ist schneller?“ stehen sie in der Höhe mittig.'],
      en: ['Damage estimate: moves come from the popular sets, without sets mostly STAB moves. HP is no longer shown.', 'Damage estimate: from a streak of 10 weather and terrain sometimes appear, from 20 stat changes (+1, -2 etc.).', 'Base stat quiz and "Who is faster?": the choice cards no longer overlap, and in "Who is faster?" they are vertically centered.'] },
    { v: '1.21.4',
      de: ['Minigames: Alle drei Spiele enden jetzt beim ersten Fehler, gezählt wird die Serie.', 'Wer ist schneller?: Du klickst das schnellere Pokémon direkt an.', 'Basiswerte-Quiz: Keine Tipps mehr, dafür 6 Pokémon zur Auswahl.', 'Schadens-Schätzung: Regler von 0 bis 100 %, mehr als 10 Prozentpunkte daneben beendet das Spiel.'],
      en: ['Minigames: all three games now end on the first mistake, your streak is what counts.', 'Who is faster?: click the faster Pokémon directly.', 'Base stat quiz: no more hints, instead 6 Pokémon to choose from.', 'Damage guess: slider from 0 to 100%, more than 10 percentage points off ends the game.'] },
    { v: '1.21.3',
      de: ['Patchnotes: Das Popup erscheint jetzt zuverlässig nach jedem Update.'],
      en: ['Patch notes: the popup now reliably appears after every update.'] },
    { v: '1.21.2',
      de: ['Neu: Patchnotes erscheinen nach jedem Update als Popup (auch in den Einstellungen unter „App & Updates“ abrufbar).', 'Teambuilder: Beim Wechsel zwischen Pokémon ist das Bild nicht mehr kurz riesig, und Attacken und Werte springen nicht mehr.'],
      en: ['New: patch notes appear as a popup after every update (also available in settings under "App & updates").', 'Team builder: when switching between Pokémon the picture is no longer huge for a moment, and moves and stats no longer jump.'] },
    { v: '1.21.1',
      de: ['Teampreview: Das Teamlogo erscheint mittig hinter beiden Teams.', 'Shiny-Zähler: Die Aufnahme (Capture Card / Fenster) verbindet sich auf Wunsch automatisch neu.', 'Shiny-Zähler: Die Erkennung startet und stoppt mit dem Timer (Einstellung „Automatik“ im Setup).', 'Neu: Patchnotes nach jedem Update.'],
      en: ['Team preview: the team logo is shown centered behind both teams.', 'Shiny counter: the capture (card / window) can reconnect automatically.', 'Shiny counter: detection starts and stops with the timer ("Automation" in the setup tab).', 'New: patch notes after every update.'] },
    { v: '1.21.0',
      de: ['Minigames: „Wer ist schneller?“, Basiswerte-Quiz und Schadens-Schätzung.', 'Update-Kanal: Vollversionen oder Zwischenversionen wählbar.'],
      en: ['Minigames: "Who is faster?", base stat quiz and damage guess.', 'Update channel: choose full releases or interim versions.'] },
    { v: '1.20.1',
      de: ['Handy-Layout für Soul Link, Nuzlocke-Rechner und Teambuilder (untereinander statt abgeschnitten).'],
      en: ['Phone layout for Soul Link, Nuzlocke calculator and team builder (stacked instead of cut off).'] },
    { v: '1.20.0',
      de: ['Die Android-App aktualisiert sich selbst (APK aus dem GitHub-Release).', 'Handy-Layout der GO-Infografik.'],
      en: ['The Android app updates itself (APK from the GitHub release).', 'Phone layout of the GO infographic.'] },
    { v: '1.19.0',
      de: ['GO-Infografik (Raid & Feldforschung/Forschungstag) als PNG.', 'Top-Konter mit Attacken, Fang-CP der Normalform.', 'Necrozma-Fusionen mit richtigem Sprite.'],
      en: ['GO infographic (raid & field research/research day) as PNG.', 'Top counters with moves, catch CP of the normal form.', 'Necrozma fusions with the right sprite.'] },
    { v: '1.18.1',
      de: ['Clips mit Ton (Systemton als Standard, die Erkennungsquelle übernimmt die Tonspur).'],
      en: ['Clips with sound (system audio by default, the detection source supplies the audio track).'] },
    { v: '1.18.0',
      de: ['Randomizer in Unterkategorien, Starter für Gen 4–7, weitere UPR-Optionen.', 'Teamsheet im Teambuilder.'],
      en: ['Randomizer in subcategories, starters for gen 4–7, more UPR options.', 'Team sheet in the team builder.'] }
  ];
  var S = de ? { title: 'Neu in Rattata Labs', ver: 'Version {0}', ok: 'Los geht’s', older: 'Frühere Versionen' }
             : { title: 'What’s new in Rattata Labs', ver: 'Version {0}', ok: 'Got it', older: 'Earlier versions' };
  function cmp(a, b) {
    if (window.RLUpdateChannel && window.RLUpdateChannel.compare) return window.RLUpdateChannel.compare(a, b);
    var x = String(a).split('.').map(Number), y = String(b).split('.').map(Number);
    for (var i = 0; i < 3; i++) { if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0) ? 1 : -1; }
    return 0;
  }
  function get() { try { return localStorage.getItem(KEY) || ''; } catch (e) { return ''; } }
  function set(v) { try { localStorage.setItem(KEY, v); } catch (e) { /* kein Speicher */ } }
  // Einträge, die neuer sind als `since` und nicht neuer als `cur` (since leer: nur der aktuelle)
  function entries(since, cur) {
    var l = NOTES.filter(function (n) { return cmp(n.v, cur) <= 0 && (since ? cmp(n.v, since) > 0 : true); });
    return since ? l.slice(0, MAX) : l.slice(0, 1);
  }
  function show(list) {
    if (document.getElementById('patchModal')) return;
    list = list && list.length ? list : NOTES.slice(0, 1);
    var m = el('div', { class: 'modal', id: 'patchModal' });
    var bx = el('div', { class: 'modal-box patch-box', role: 'dialog', 'aria-modal': 'true', 'aria-label': S.title });
    bx.appendChild(el('h3', { text: S.title }));
    var body = el('div', { class: 'patch-body' });
    list.forEach(function (n) {
      var sec = el('div', { class: 'patch-ver' });
      sec.appendChild(el('strong', { text: S.ver.replace('{0}', n.v) }));
      var ul = el('ul');
      (de ? n.de : n.en).forEach(function (t) { ul.appendChild(el('li', { text: t })); });
      sec.appendChild(ul);
      body.appendChild(sec);
    });
    bx.appendChild(body);
    var act = el('div', { class: 'modal-actions' });
    var ok = el('button', { class: 'primary-btn', text: S.ok });
    function close() { m.remove(); document.removeEventListener('keydown', key, true); }
    function key(ev) { if (ev.key === 'Escape') { ev.stopPropagation(); close(); } }
    ok.addEventListener('click', close);
    document.addEventListener('keydown', key, true);
    m.addEventListener('mousedown', function (ev) { if (ev.target === m) close(); });
    act.appendChild(ok); bx.appendChild(act); m.appendChild(bx);
    document.body.appendChild(m);
    ok.focus();
  }
  function check(cur) {
    if (!cur) return;
    var last = get();
    if (last === cur) return;
    set(cur);
    // ohne gemerkte Version (Update von einer Version vor den Patchnotes, oder Neuinstallation): nur den aktuellen Eintrag zeigen
    if (last && cmp(cur, last) <= 0) return; // Rückstufung
    var l = entries(last, cur);
    if (l.length) show(l);
  }
  function currentVersion() {
    var U = (window.desktop && window.desktop.update) || window.RL_APP_UPDATE;
    if (!U || !U.get) return Promise.resolve('');
    return Promise.resolve(U.get()).then(function (s) { return s && s.current ? String(s.current) : ''; }, function () { return ''; });
  }
  window.RLPatchnotes = { show: function () { show(NOTES.slice(0, 1)); }, _notes: NOTES, _entries: entries, _check: check };
  currentVersion().then(function (v) { setTimeout(function () { check(v); }, 800); });
})();

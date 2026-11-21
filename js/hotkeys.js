// Frei belegbare Tastenkürzel der App (Einstellungen → Tastenkürzel). Jede Aktion meldet sich mit
// RLHotkeys.register(id, { label: [de, en], group, def, run, when, inFields, inModal }) an; die Belegung liegt in cc_settings.hotkeys
// ({ id: 'Ctrl+Alt+K' } oder '' für "keine"). Die globalen Hotkeys des Shiny-Zählers bleiben dort (electron/shiny.js).
(function () {
  'use strict';
  var actions = [], byId = {};
  var recording = false;

  function settings() { try { return JSON.parse(localStorage.getItem('cc_settings') || '{}') || {}; } catch (e) { return {}; } }
  function saveMap(map) {
    var s = settings(); s.hotkeys = map;
    try { localStorage.setItem('cc_settings', JSON.stringify(s)); } catch (e) { /* Speicher voll oder gesperrt */ }
  }
  function userMap() { var m = settings().hotkeys; return m && typeof m === 'object' ? m : {}; }

  // ---------- combos: "Ctrl+Shift+K", "Alt+1", "F2", "+" ----------
  var NAMED = { ' ': 'Space', '+': 'Plus', '-': 'Minus', ArrowUp: 'Up', ArrowDown: 'Down', ArrowLeft: 'Left', ArrowRight: 'Right', Escape: 'Esc' };
  function keyName(ev) {
    var k = ev.key;
    if (!k || k === 'Dead' || k === 'Unidentified') return '';
    if (/^(Control|Shift|Alt|Meta|AltGraph|CapsLock|NumLock|OS)$/.test(k)) return '';
    // mit Alt oder Strg liefert ev.key auf manchen Layouts Sonderzeichen: dann die physische Taste
    if ((ev.altKey || ev.ctrlKey) && /^(Key[A-Z]|Digit\d)$/.test(ev.code || '')) return ev.code.slice(-1);
    if (NAMED[k]) return NAMED[k];
    if (k.length === 1) return k.toUpperCase();
    return k;
  }
  function fromEvent(ev) {
    var k = keyName(ev);
    if (!k) return '';
    var parts = [];
    if (ev.ctrlKey || ev.metaKey) parts.push('Ctrl');
    if (ev.altKey) parts.push('Alt');
    // Shift zählt nur bei Buchstaben, Ziffern und benannten Tasten; bei "+" oder "#" steckt es schon im Zeichen
    if (ev.shiftKey && k !== 'Plus' && k !== 'Minus' && (k.length > 1 || /[A-Z0-9]/.test(k))) parts.push('Shift');
    parts.push(k);
    return parts.join('+');
  }
  function normalize(c) {
    if (!c) return '';
    var raw = String(c).trim(), p, key;
    if (raw === '+') { p = []; key = 'Plus'; }
    else if (/\+\+$/.test(raw)) { p = raw.slice(0, -2).split('+'); key = 'Plus'; }
    else { p = raw.split('+'); key = (p.pop() || '').trim(); }
    if (key === '-') key = 'Minus';
    if (!key) return '';
    var mods = { Ctrl: 0, Alt: 0, Shift: 0 };
    p.forEach(function (x) { x = x.trim(); if (/^(ctrl|control|cmd|commandorcontrol)$/i.test(x)) mods.Ctrl = 1; else if (/^alt$/i.test(x)) mods.Alt = 1; else if (/^shift$/i.test(x)) mods.Shift = 1; });
    var out = [];
    if (mods.Ctrl) out.push('Ctrl'); if (mods.Alt) out.push('Alt'); if (mods.Shift) out.push('Shift');
    out.push(key.length === 1 ? key.toUpperCase() : key);
    return out.join('+');
  }
  function de() { return (document.documentElement.lang || 'de').slice(0, 2) === 'de'; }
  var isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/i.test((navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || '');
  function label(c) {
    if (!c) return '–';
    var KEY = { Plus: '+', Minus: '−', Up: '↑', Down: '↓', Left: '←', Right: '→', Space: de() ? 'Leertaste' : 'Space' };
    return normalize(c).split('+').map(function (x) { return x === 'Ctrl' ? (isMac ? '⌘' : (de() ? 'Strg' : 'Ctrl')) : KEY[x] || x; }).join(' + ');
  }

  // ---------- registry ----------
  function register(id, o) {
    o = o || {};
    var a = { id: id, label: o.label || [id, id], group: o.group || 'app', def: normalize(o.def || ''), run: o.run || function () {}, when: o.when || null, inFields: !!o.inFields, inModal: !!o.inModal, order: actions.length };
    if (byId[id]) actions = actions.filter(function (x) { return x.id !== id; });
    byId[id] = a; actions.push(a);
    return a;
  }
  function get(id) { var m = userMap(); return Object.prototype.hasOwnProperty.call(m, id) ? normalize(m[id]) : (byId[id] ? byId[id].def : ''); }
  function set(id, combo) {
    var m = userMap(), c = normalize(combo), clash = null;
    // die gleiche Kombination darf nur eine Aktion haben: die andere wird frei
    if (c) actions.forEach(function (a) { if (a.id !== id && get(a.id) === c) { clash = a; m[a.id] = ''; } });
    if (byId[id] && c === byId[id].def) delete m[id]; else m[id] = c;
    saveMap(m);
    return clash;
  }
  function reset(id) {
    var m = userMap();
    if (id) { delete m[id]; var d = byId[id] && byId[id].def; if (d) actions.forEach(function (a) { if (a.id !== id && get(a.id) === d) m[a.id] = ''; }); }
    else m = {};
    saveMap(m);
  }
  function list() { return actions.slice().sort(function (a, b) { return a.order - b.order; }); }
  function isCustom(id) { return Object.prototype.hasOwnProperty.call(userMap(), id); }

  function inField(t) { return !!(t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable)); }
  document.addEventListener('keydown', function (ev) {
    if (recording || ev.defaultPrevented || (ev.repeat && !/^[+-]$/.test(ev.key))) return;
    var c = fromEvent(ev);
    if (!c) return;
    var field = inField(ev.target), modal = !!document.querySelector('.modal:not(.hidden)');
    var hit = null;
    list().some(function (a) {
      if (get(a.id) !== c) return false;
      // in Textfeldern nur Kombinationen mit Strg/Alt (und nicht die, die das Feld selbst braucht)
      if (field && (!a.inFields || !/^(Ctrl|Alt)\+/.test(c))) return false;
      if (modal && !a.inModal) return false;
      if (a.when && !a.when()) return false;
      hit = a; return true;
    });
    if (!hit) return;
    if (hit.run(ev) !== false) { ev.preventDefault(); ev.stopPropagation(); }
  });

  window.RLHotkeys = {
    register: register, get: get, set: set, reset: reset, list: list, isCustom: isCustom,
    fromEvent: fromEvent, normalize: normalize, label: label,
    setRecording: function (on) { recording = !!on; }
  };
})();

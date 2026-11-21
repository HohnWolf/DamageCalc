// Teams teilen: QR-Code (Team-Daten samt Name, ohne Internet), QR-Code aus einem Bild lesen (Datei, Einfügen, Ziehen,
// Android-Kamera) und PokéPaste mit einem Klick. QR erzeugen: js/lib/qrcode.js (Kazuhiko Arase, MIT),
// QR lesen: js/lib/jsqr.min.js (jsQR, Apache 2.0); BarcodeDetector des Browsers, wo es ihn gibt.
//
// Inhalt des QR-Codes: "RLT1." + base64url(deflate-raw(JSON)) mit { n: Teamname, v: Versionsname, p: Showdown-Text }.
// Ohne CompressionStream: "RLT0." + base64url(JSON). Gelesen werden außerdem PokéPaste-Links und reiner Showdown-Text.
(function () {
  'use strict';
  var PFX1 = 'RLT1.', PFX0 = 'RLT0.';
  var PASTE_RE = /^https?:\/\/(?:www\.)?pokepast\.es\/([0-9a-f]{8,32})(?:\/(?:raw|json))?\/?$/i;

  // ---------------- encoding ----------------
  function b64u(bytes) {
    var s = '', CH = 0x8000;
    for (var i = 0; i < bytes.length; i += CH) s += String.fromCharCode.apply(null, bytes.subarray(i, i + CH));
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function unb64u(str) {
    var s = String(str).replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4) s += '=';
    var bin = atob(s), out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  function utf8(s) { return new TextEncoder().encode(s); }
  function fromUtf8(b) { return new TextDecoder('utf-8').decode(b); }
  function pipe(bytes, stream) {
    return new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer().then(function (b) { return new Uint8Array(b); });
  }
  var canZip = typeof CompressionStream !== 'undefined' && typeof DecompressionStream !== 'undefined';

  // team = { name, ver, text, versions?: [{ name, text }] } -> Promise<string>
  // with versions, "vs" carries all of them; "p" stays the active one, so older app versions still import something
  function encode(team) {
    var o = { n: String(team.name || ''), v: String(team.ver || ''), p: String(team.text || '') };
    if (team.versions && team.versions.length > 1) o.vs = team.versions.map(function (x) { return { v: String(x.name || ''), p: String(x.text || '') }; });
    var json = JSON.stringify(o);
    if (!canZip) return Promise.resolve(PFX0 + b64u(utf8(json)));
    return pipe(utf8(json), new CompressionStream('deflate-raw')).then(function (z) { return PFX1 + b64u(z); },
      function () { return PFX0 + b64u(utf8(json)); });
  }
  function fromJson(json) {
    var o = JSON.parse(json);
    if (!o || typeof o.p !== 'string') return null;
    var r = { name: String(o.n || ''), ver: String(o.v || ''), text: o.p };
    if (Array.isArray(o.vs) && o.vs.length) r.versions = o.vs.filter(function (x) { return x && typeof x.p === 'string'; }).map(function (x) { return { name: String(x.v || ''), text: x.p }; });
    return r;
  }
  // any scanned text -> Promise<{ name, ver, text } | { url } | null>
  function decode(raw) {
    var s = String(raw || '').trim();
    try {
      if (s.indexOf(PFX0) === 0) return Promise.resolve(fromJson(fromUtf8(unb64u(s.slice(PFX0.length)))));
      if (s.indexOf(PFX1) === 0) {
        if (!canZip) return Promise.reject(new Error('zip'));
        return pipe(unb64u(s.slice(PFX1.length)), new DecompressionStream('deflate-raw')).then(function (b) { return fromJson(fromUtf8(b)); });
      }
    } catch (e) { return Promise.resolve(null); }
    if (PASTE_RE.test(s)) return Promise.resolve({ url: s });
    if (/\n/.test(s) && /^\s*-\s+\S/m.test(s)) return Promise.resolve({ name: '', ver: '', text: s }); // reiner Showdown-Text
    return Promise.resolve(null);
  }

  // ---------------- QR: draw ----------------
  // returns { size, dark(r, c) } or throws when the text does not fit
  function matrix(text) {
    var Q = window.qrcode;
    if (!Q) throw new Error('qr-lib');
    var levels = ['M', 'L'], last = null;
    for (var i = 0; i < levels.length; i++) {
      try {
        var q = Q(0, levels[i]);
        q.addData(text, 'Byte');
        q.make();
        return { size: q.getModuleCount(), dark: function (r, c) { return q.isDark(r, c); } };
      } catch (e) { last = e; }
    }
    throw last || new Error('qr-size');
  }
  // draws black on white with a quiet zone of 4 modules; px = target width in pixels
  function draw(canvas, text, px) {
    var m = matrix(text), quiet = 4, n = m.size + quiet * 2;
    var scale = Math.max(2, Math.floor((px || 480) / n));
    canvas.width = canvas.height = n * scale;
    var g = canvas.getContext('2d');
    g.fillStyle = '#fff'; g.fillRect(0, 0, canvas.width, canvas.height);
    g.fillStyle = '#000';
    for (var r = 0; r < m.size; r++) for (var c = 0; c < m.size; c++) if (m.dark(r, c)) g.fillRect((c + quiet) * scale, (r + quiet) * scale, scale, scale);
    return m.size;
  }

  // ---------------- QR: read ----------------
  function loadImage(blob) {
    if (window.createImageBitmap) return createImageBitmap(blob);
    return new Promise(function (res, rej) {
      var u = URL.createObjectURL(blob), im = new Image();
      im.onload = function () { URL.revokeObjectURL(u); res(im); };
      im.onerror = function () { URL.revokeObjectURL(u); rej(new Error('img')); };
      im.src = u;
    });
  }
  function scanCanvas(img, maxSide) {
    var w = img.width, h = img.height, k = Math.min(1, maxSide / Math.max(w, h));
    var cv = document.createElement('canvas');
    cv.width = Math.max(1, Math.round(w * k)); cv.height = Math.max(1, Math.round(h * k));
    var g = cv.getContext('2d', { willReadFrequently: true });
    g.fillStyle = '#fff'; g.fillRect(0, 0, cv.width, cv.height); // durchsichtige PNGs: weißer Grund
    g.drawImage(img, 0, 0, cv.width, cv.height);
    var d = g.getImageData(0, 0, cv.width, cv.height);
    var hit = window.jsQR ? window.jsQR(d.data, d.width, d.height, { inversionAttempts: 'attemptBoth' }) : null;
    return hit && hit.data ? hit.data : null;
  }
  // blob/file of an image -> Promise<string | null>
  function readImage(blob) {
    return loadImage(blob).then(function (img) {
      var viaDetector = Promise.resolve(null);
      if (window.BarcodeDetector) {
        viaDetector = Promise.resolve().then(function () {
          return new window.BarcodeDetector({ formats: ['qr_code'] }).detect(img);
        }).then(function (list) { return list && list[0] && list[0].rawValue || null; }, function () { return null; });
      }
      return viaDetector.then(function (txt) {
        if (txt) return txt;
        // Fotos und Bildschirmfotos: mehrere Größen probieren (kleine Codes in großen Bildern, verwackelte Fotos)
        var sizes = [1600, 1000, 2400, 700], i, got;
        for (i = 0; i < sizes.length; i++) { got = scanCanvas(img, sizes[i]); if (got) return got; }
        return null;
      });
    });
  }

  // ---------------- PokéPaste ----------------
  function form(o) {
    return Object.keys(o).map(function (k) { return encodeURIComponent(k) + '=' + encodeURIComponent(o[k] == null ? '' : String(o[k])); }).join('&');
  }
  // { title, author, notes, paste } -> Promise<{ ok, url } | { ok: false, opened: true } | { ok: false, error }>
  function uploadPaste(o) {
    var D = window.desktop && window.desktop.share;
    if (D && D.uploadPaste) return D.uploadPaste(o);
    var cap = window.Capacitor, H = cap && cap.Plugins && cap.Plugins.CapacitorHttp;
    if (window.RL_ANDROID && H && H.request) {
      return H.request({ method: 'POST', url: 'https://pokepast.es/create', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, data: form(o) })
        .then(function (r) {
          var u = r && r.url ? String(r.url) : '';
          return PASTE_RE.test(u) ? { ok: true, url: u.replace(/\/$/, '') } : { ok: false, error: 'PokéPaste: ' + (r && r.status) };
        }, function (e) { return { ok: false, error: String(e && e.message || e) }; });
    }
    // Browser: PokéPaste schickt keine CORS-Kopfzeilen. Das Formular öffnet die fertige Paste in einem neuen Tab.
    var f = document.createElement('form');
    f.method = 'POST'; f.action = 'https://pokepast.es/create'; f.target = '_blank'; f.style.display = 'none';
    Object.keys(o).forEach(function (k) {
      var t = document.createElement('textarea'); t.name = k; t.value = o[k] == null ? '' : String(o[k]); f.appendChild(t);
    });
    document.body.appendChild(f); f.submit(); f.remove();
    return Promise.resolve({ ok: false, opened: true });
  }
  // pokepast.es link -> Promise<{ title, author, paste }>
  function fetchPaste(url) {
    var m = PASTE_RE.exec(String(url || '').trim());
    if (!m) return Promise.reject(new Error('url'));
    var D = window.desktop && window.desktop.share;
    if (D && D.fetchPaste) return D.fetchPaste(m[1]).then(function (r) { if (!r || !r.ok) throw new Error(r && r.error || 'paste'); return r; });
    var cap = window.Capacitor, H = cap && cap.Plugins && cap.Plugins.CapacitorHttp;
    if (window.RL_ANDROID && H && H.request) {
      return H.request({ method: 'GET', url: 'https://pokepast.es/' + m[1] + '/json', headers: { Accept: 'application/json' } })
        .then(function (r) {
          if (!r || r.status < 200 || r.status >= 300) throw new Error('HTTP ' + (r && r.status));
          var j = typeof r.data === 'string' ? JSON.parse(r.data) : (r.data || {});
          return { title: j.title || '', author: j.author || '', paste: String(j.paste || '').replace(/\r\n/g, '\n') };
        });
    }
    return fetch('https://pokepast.es/' + m[1] + '/json').then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (j) { return { title: j.title || '', author: j.author || '', paste: String(j.paste || '').replace(/\r\n/g, '\n') }; });
  }

  // ---------------- dialogs ----------------
  function de() { return (document.documentElement.lang || 'de').slice(0, 2) === 'de'; }
  function L(d, e) { return de() ? d : e; }
  function mk(tag, attrs, kids) {
    var n = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === 'text') n.textContent = attrs[k];
      else if (k === 'class') n.className = attrs[k];
      else n.setAttribute(k, attrs[k]);
    });
    (kids || []).forEach(function (c) { if (c) n.appendChild(c); });
    return n;
  }
  function toast(t) { if (window.CC && window.CC.toast) window.CC.toast(t); }
  function modal(cls, title) {
    var wrap = mk('div', { class: 'modal rl-share-wrap' });
    var box = mk('div', { class: 'modal-box rl-share ' + (cls || ''), role: 'dialog', 'aria-modal': 'true' });
    var head = mk('div', { class: 'modal-head' });
    head.appendChild(mk('h3', { text: title }));
    var x = mk('button', { class: 'icon-btn', type: 'button', text: '✕', 'aria-label': L('Schließen', 'Close') });
    head.appendChild(x);
    box.appendChild(head);
    wrap.appendChild(box);
    document.body.appendChild(wrap);
    function close() { wrap.remove(); document.removeEventListener('keydown', key, true); if (api.onClose) api.onClose(); }
    function key(ev) { if (ev.key === 'Escape') { ev.stopPropagation(); close(); } }
    document.addEventListener('keydown', key, true);
    x.addEventListener('click', close);
    wrap.addEventListener('mousedown', function (ev) { if (ev.target === wrap) close(); });
    var api = { wrap: wrap, box: box, close: close, onClose: null };
    return api;
  }
  function safeName(s) { return String(s || 'Team').replace(/[\\/:*?"<>|]+/g, '').trim().slice(0, 60) || 'Team'; }
  function canvasBlob(cv) { return new Promise(function (res) { cv.toBlob(function (b) { res(b); }, 'image/png'); }); }

  // several versions as one text (PokéPaste): Showdown team headers "=== Name (v1) ===", read back by splitVersions
  function joinVersions(name, versions) {
    return versions.map(function (v) { return '=== ' + name + ' (' + v.name + ') ===\n\n' + v.text; }).join('\n\n');
  }
  // text with "=== … (name) ===" headers -> [{ name, text }] or null
  function splitVersions(text) {
    var re = /^===\s*(?:\[[^\]]*\]\s*)?(.*?)\s*===\s*$/gm, heads = [], m;
    while ((m = re.exec(text))) heads.push({ at: m.index, end: m.index + m[0].length, title: m[1] });
    if (heads.length < 1) return null;
    return heads.map(function (h, i) {
      var vm = /\(([^()]*)\)\s*$/.exec(h.title);
      return { name: vm ? vm[1] : h.title, title: h.title.replace(/\s*\([^()]*\)\s*$/, ''), text: text.slice(h.end, i + 1 < heads.length ? heads[i + 1].at : text.length).trim() };
    }).filter(function (v) { return v.text; });
  }

  // team = { name, versions: [{ name, text }], cur: index of the active version }
  // (older form { name, ver, text } still works: one version)
  function openShare(team) {
    var vers = team.versions && team.versions.length ? team.versions : [{ name: team.ver || '', text: team.text }];
    var cur = Math.max(0, Math.min(vers.length - 1, team.cur || 0));
    var pick = String(cur); // index of one version, or 'all'
    function shared() {
      if (pick === 'all') return { name: team.name, ver: vers[cur].name, text: vers[cur].text, versions: vers };
      var v = vers[+pick];
      return { name: team.name, ver: vers.length > 1 ? v.name : '', text: v.text };
    }
    function title() { var s = shared(); return team.name + (pick === 'all' ? ' (' + L('alle Versionen', 'all versions') + ')' : s.ver ? ' (' + s.ver + ')' : ''); }
    var m = modal('rl-share-out', L('Team teilen', 'Share team') + ': ' + team.name);
    if (vers.length > 1) {
      var vrow = mk('div', { class: 'rl-share-ver' });
      vrow.appendChild(mk('span', { class: 'set-name', text: L('Teilen:', 'Share:') }));
      var vsel = mk('select', { class: 'rl-share-versel' });
      vers.forEach(function (v, i) {
        var o = mk('option', { value: String(i), text: L('Version ', 'Version ') + (v.name || i + 1) + (i === cur ? L(' (aktiv)', ' (active)') : '') });
        if (i === cur) o.selected = true;
        vsel.appendChild(o);
      });
      vsel.appendChild(mk('option', { value: 'all', text: L('Alle Versionen', 'All versions') + ' (' + vers.length + ')' }));
      vsel.addEventListener('change', function () { pick = vsel.value; refresh(); });
      vrow.appendChild(vsel);
      m.box.appendChild(vrow);
    }
    var grid = mk('div', { class: 'rl-share-grid' });
    m.box.appendChild(grid);

    // --- QR ---
    var qrCol = mk('div', { class: 'rl-share-qr' });
    var cv = mk('canvas', { class: 'rl-share-canvas', width: '10', height: '10', 'aria-label': 'QR-Code' });
    var qrMsg = mk('p', { class: 'hint', text: L('QR-Code wird erstellt …', 'Creating QR code …') });
    qrCol.appendChild(cv); qrCol.appendChild(qrMsg);
    var qrActs = mk('div', { class: 'import-actions' });
    var bSave = mk('button', { type: 'button', class: 'primary-btn', text: L('Als Bild speichern', 'Save as image') });
    var bCopy = mk('button', { type: 'button', text: L('Bild kopieren', 'Copy image') });
    bSave.disabled = bCopy.disabled = true;
    qrActs.appendChild(bSave); qrActs.appendChild(bCopy);
    qrCol.appendChild(qrActs);
    grid.appendChild(qrCol);
    var qrRun = 0;
    function drawQR() {
      var run = ++qrRun, all = pick === 'all';
      bSave.disabled = bCopy.disabled = true;
      qrMsg.textContent = L('QR-Code wird erstellt …', 'Creating QR code …');
      encode(shared()).then(function (txt) {
        if (run !== qrRun) return;
        try {
          var n = draw(cv, txt, 520);
          cv.hidden = false;
          qrMsg.textContent = (all
            ? L('Enthält alle ' + vers.length + ' Versionen samt Teamnamen', 'Holds all ' + vers.length + ' versions and the team name')
            : L('Enthält das Team samt Namen', 'Holds the team and its name')) +
            L(' (' + txt.length + ' Zeichen, ' + n + '×' + n + '). Scannen mit Rattata Labs: Teambuilder → „QR importieren“. Funktioniert ohne Internet.',
              ' (' + txt.length + ' characters, ' + n + '×' + n + '). Scan with Rattata Labs: Teambuilder → “Import QR”. Works offline.');
          bSave.disabled = bCopy.disabled = false;
        } catch (e) {
          cv.hidden = true;
          qrMsg.textContent = all
            ? L('Alle Versionen zusammen sind zu groß für einen QR-Code. Teile eine einzelne Version oder nutze PokéPaste.', 'All versions together are too large for a QR code. Share a single version or use PokéPaste.')
            : L('Das Team ist zu groß für einen QR-Code. Teile es über PokéPaste.', 'The team is too large for a QR code. Share it via PokéPaste.');
        }
      }, function () { if (run === qrRun) qrMsg.textContent = L('QR-Code konnte nicht erstellt werden.', 'Could not create the QR code.'); });
    }
    bSave.addEventListener('click', function () {
      canvasBlob(cv).then(function (b) {
        if (window.CC && window.CC.saveFile) window.CC.saveFile(safeName(title()) + ' QR.png', b, 'image/png');
      });
    });
    bCopy.addEventListener('click', function () {
      if (!navigator.clipboard || !window.ClipboardItem) { toast(L('Kopieren von Bildern geht hier nicht.', 'Copying images is not supported here.')); return; }
      canvasBlob(cv).then(function (b) { return navigator.clipboard.write([new window.ClipboardItem({ 'image/png': b })]); })
        .then(function () { toast(L('QR-Code kopiert', 'QR code copied')); }, function () { toast(L('Kopieren fehlgeschlagen', 'Copy failed')); });
    });

    // --- PokéPaste ---
    var pp = mk('div', { class: 'rl-share-paste' });
    pp.appendChild(mk('div', { class: 'set-group-title', text: 'PokéPaste' }));
    pp.appendChild(mk('p', { class: 'hint', text: L('Lädt das Team als Text auf pokepast.es hoch. Jeder mit dem Link kann es sehen.', 'Uploads the team as text to pokepast.es. Anyone with the link can see it.') }));
    var author = mk('input', { type: 'text', class: 'rl-share-author', spellcheck: 'false', placeholder: L('Autor (optional)', 'Author (optional)') });
    var set = window.CC && window.CC.setting ? window.CC.setting('pasteAuthor') : '';
    author.value = set || '';
    pp.appendChild(author);
    var bUp = mk('button', { type: 'button', class: 'primary-btn', text: L('Auf PokéPaste hochladen', 'Upload to PokéPaste') });
    pp.appendChild(bUp);
    var res = mk('div', { class: 'rl-share-result' });
    pp.appendChild(res);
    grid.appendChild(pp);
    bUp.addEventListener('click', function () {
      if (window.CC && window.CC.setSetting) window.CC.setSetting('pasteAuthor', author.value.trim());
      bUp.disabled = true; bUp.textContent = L('Wird hochgeladen …', 'Uploading …');
      res.innerHTML = '';
      uploadPaste({ title: title(), author: author.value.trim(), notes: L('Erstellt mit Rattata Labs', 'Made with Rattata Labs'), paste: pick === 'all' ? joinVersions(team.name, vers) : shared().text })
        .then(function (r) {
          if (r && r.ok && r.url) {
            var link = mk('input', { type: 'text', readonly: 'readonly', class: 'rl-share-link' });
            link.value = r.url;
            res.appendChild(link);
            var acts = mk('div', { class: 'import-actions' });
            var c = mk('button', { type: 'button', class: 'primary-btn', text: L('Link kopieren', 'Copy link') });
            c.addEventListener('click', function () { if (window.CC) window.CC.copy(r.url); });
            var o = mk('a', { class: 'tbtn', href: r.url, target: '_blank', rel: 'noopener', text: L('Öffnen', 'Open') });
            acts.appendChild(c); acts.appendChild(o);
            res.appendChild(acts);
            if (window.CC) window.CC.copy(r.url);
          } else if (r && r.opened) {
            res.appendChild(mk('p', { class: 'hint', text: L('Die Paste wurde in einem neuen Tab geöffnet. Den Link findest du dort in der Adresszeile.', 'The paste opened in a new tab. Its link is in the address bar there.') }));
          } else {
            res.appendChild(mk('p', { class: 'hint bad', text: L('Hochladen fehlgeschlagen', 'Upload failed') + (r && r.error ? ': ' + r.error : '') }));
          }
        }, function (e) {
          res.appendChild(mk('p', { class: 'hint bad', text: L('Hochladen fehlgeschlagen', 'Upload failed') + ': ' + (e && e.message || e) }));
        })
        .then(function () { bUp.disabled = false; bUp.textContent = L('Erneut hochladen', 'Upload again'); });
    });
    // another choice in "Teilen:": new QR code, the old PokéPaste link no longer fits
    function refresh() {
      drawQR();
      res.innerHTML = '';
      bUp.textContent = L('Auf PokéPaste hochladen', 'Upload to PokéPaste');
      m.box.querySelector('h3').textContent = L('Team teilen', 'Share team') + ': ' + title();
    }
    refresh();
    return m;
  }

  // onTeam({ name, ver, text, source }) is called with a found team; it returns true when it took the team
  function openScan(onTeam) {
    var m = modal('rl-share-in', L('Team aus QR-Code importieren', 'Import team from QR code'));
    var drop = mk('div', { class: 'rl-scan-drop', tabindex: '0' });
    drop.appendChild(mk('div', { class: 'rl-scan-ic', text: '▦', 'aria-hidden': 'true' }));
    drop.appendChild(mk('p', { text: window.RL_ANDROID
      ? L('QR-Code mit der Kamera aufnehmen oder ein Bild wählen.', 'Take a photo of the QR code or choose an image.')
      : L('Bild mit QR-Code hierher ziehen, mit Strg+V einfügen oder eine Datei wählen.', 'Drop an image with a QR code here, paste it with Ctrl+V or choose a file.') }));
    var acts = mk('div', { class: 'import-actions' });
    var pick = mk('input', { type: 'file', accept: 'image/*', hidden: 'hidden' });
    var bPick = mk('button', { type: 'button', class: window.RL_ANDROID ? '' : 'primary-btn', text: L('Bild wählen …', 'Choose image …') });
    bPick.addEventListener('click', function () { pick.removeAttribute('capture'); pick.click(); });
    if (window.RL_ANDROID) {
      var bCam = mk('button', { type: 'button', class: 'primary-btn', text: L('Kamera', 'Camera') });
      bCam.addEventListener('click', function () { pick.setAttribute('capture', 'environment'); pick.click(); });
      acts.appendChild(bCam);
    }
    acts.appendChild(bPick); acts.appendChild(pick);
    drop.appendChild(acts);
    var msg = mk('p', { class: 'hint rl-scan-msg' });
    drop.appendChild(msg);
    m.box.appendChild(drop);

    function fail(t) { msg.className = 'hint rl-scan-msg bad'; msg.textContent = t; }
    function handle(blob) {
      if (!blob) return;
      msg.className = 'hint rl-scan-msg'; msg.textContent = L('Lese QR-Code …', 'Reading QR code …');
      readImage(blob).then(function (txt) {
        if (!txt) { fail(L('Kein QR-Code gefunden. Tipp: Bild zuschneiden oder schärfer aufnehmen.', 'No QR code found. Tip: crop the image or take a sharper photo.')); return null; }
        return decode(txt).then(function (r) {
          if (!r) { fail(L('Der QR-Code enthält kein Team.', 'The QR code holds no team.')); return null; }
          if (r.url) {
            msg.textContent = L('Lade PokéPaste …', 'Loading PokéPaste …');
            return fetchPaste(r.url).then(function (p) { return { name: p.title || '', ver: '', text: p.paste, source: 'pokepaste' }; },
              function () { fail(L('Die PokéPaste konnte nicht geladen werden: ', 'Could not load the PokéPaste: ') + r.url); return null; });
          }
          r.source = 'qr';
          return r;
        });
      }, function () { fail(L('Das Bild konnte nicht gelesen werden.', 'Could not read the image.')); return null; })
        .then(function (t) { if (t && onTeam(t)) m.close(); });
    }
    pick.addEventListener('change', function () { handle(pick.files && pick.files[0]); pick.value = ''; });
    function onPaste(ev) {
      var items = ev.clipboardData && ev.clipboardData.items || [];
      for (var i = 0; i < items.length; i++) if (items[i].type.indexOf('image/') === 0) { ev.preventDefault(); handle(items[i].getAsFile()); return; }
      var t = ev.clipboardData && ev.clipboardData.getData('text');
      if (t) {
        ev.preventDefault();
        decode(t).then(function (r) {
          if (!r) { fail(L('Kein Bild und kein Team in der Zwischenablage.', 'No image and no team on the clipboard.')); return null; }
          if (r.url) return fetchPaste(r.url).then(function (p) { return { name: p.title || '', ver: '', text: p.paste, source: 'pokepaste' }; }, function () { fail(L('PokéPaste nicht erreichbar.', 'PokéPaste unreachable.')); return null; });
          r.source = 'text'; return r;
        }).then(function (tm) { if (tm && onTeam(tm)) m.close(); });
      }
    }
    document.addEventListener('paste', onPaste);
    m.onClose = function () { document.removeEventListener('paste', onPaste); };
    ['dragenter', 'dragover'].forEach(function (n) { drop.addEventListener(n, function (ev) { ev.preventDefault(); drop.classList.add('over'); }); });
    ['dragleave', 'drop'].forEach(function (n) { drop.addEventListener(n, function () { drop.classList.remove('over'); }); });
    drop.addEventListener('drop', function (ev) {
      ev.preventDefault();
      var f = ev.dataTransfer && ev.dataTransfer.files && ev.dataTransfer.files[0];
      if (f && /^image\//.test(f.type)) handle(f); else fail(L('Bitte ein Bild ablegen.', 'Please drop an image.'));
    });
    setTimeout(function () { drop.focus(); }, 30);
    return m;
  }

  window.RLTeamShare = { encode: encode, decode: decode, joinVersions: joinVersions, splitVersions: splitVersions, draw: draw, matrix: matrix, readImage: readImage, uploadPaste: uploadPaste, fetchPaste: fetchPaste, openShare: openShare, openScan: openScan, PASTE_RE: PASTE_RE };
})();

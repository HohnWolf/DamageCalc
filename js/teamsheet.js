// Teamsheet generator (teambuilder): current team -> image in German / English / both, copy or save as PNG.
(function () {
  'use strict';
  var A = window.CC;
  if (!A) return;
  var de = A.LANG === 'de';
  var L = {
    de: { team: 'Teamsheet', player: 'Spieler', nature: 'Wesen', ability: 'Fähigkeit', item: 'Item' },
    en: { team: 'Team Sheet', player: 'Player', nature: 'Nature', ability: 'Ability', item: 'Item' }
  };
  var FF = '"Segoe UI",system-ui,Arial,sans-serif';
  var modal = null, ctx = null, lang = 'de', token = 0, timer = 0;

  // names in a fixed language, independent of the app language
  function inLang(l, fn) { return A.withLang ? A.withLang(l, fn) : fn(); }
  function monData(m, l) {
    var s = m.set || {};
    var sp = s.species || m.species || (s.forme ? A.baseOf(s.forme) : '');
    var shown = s.look || (s.forme && s.forme.indexOf('Mega ') !== 0 && s.forme !== A.formesOf(sp)[0] ? s.forme : sp);
    return inLang(l, function () {
      return {
        shown: shown,
        nm: A.nSpecies(shown),
        nat: s.nature ? A.nNature(s.nature) : '–',
        ab: s.ability ? A.nAbility(s.ability) : '–',
        it: s.item && s.item !== '(none)' ? A.nItem(s.item) : '–',
        mv: (s.moves || []).filter(function (x) { return x && x !== '(No Move)'; }).slice(0, 4).map(function (x) { return A.nMove(x); })
      };
    });
  }

  function loadImg(url) {
    return new Promise(function (res) {
      var i = new Image();
      i.crossOrigin = 'anonymous';
      i.onload = function () { res(i); };
      i.onerror = function () { res(null); };
      i.src = url;
    });
  }
  // Bilder: Pokémon HOME über PokéAPI (erlaubt den Abruf aus dem Canvas); Showdown sendet keine CORS-Header und würde das PNG sperren
  var SPR = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/', JSD = 'https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/';
  function slugOf(name) {
    var m = /^Mega (.+?)(?: ([XYZ]))?$/.exec(name);
    if (m) return slugOf(m[1]) + '-mega' + (m[2] ? '-' + m[2].toLowerCase() : '');
    return String(name).normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[.'’:]/g, '').replace(/[\s_]+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '');
  }
  function pokeapiId(name) {
    var s = slugOf(name), IDS = window.POKEAPI_IDS || {}; // erst beim Aufruf lesen: die Daten werden nach diesem Skript geladen
    while (s) { if (IDS[s]) return IDS[s]; var i = s.lastIndexOf('-'); if (i < 0) break; s = s.slice(0, i); }
    return null;
  }
  function loadSprite(species) {
    var id = pokeapiId(species);
    if (!id) return Promise.resolve(null);
    var urls = [SPR + 'pokemon/other/home/' + id + '.png', JSD + 'pokemon/other/home/' + id + '.png', SPR + 'pokemon/other/official-artwork/' + id + '.png'];
    return urls.reduce(function (p, u) { return p.then(function (im) { return im || loadImg(u); }); }, Promise.resolve(null));
  }
  function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  function fit(c, txt, maxW, size, wt) { var s = size; for (;;) { c.font = wt + ' ' + s + 'px ' + FF; if (c.measureText(txt).width <= maxW || s <= 10) break; s--; } }

  async function drawSheet(mons, l, team, pl) {
    var t = L[l], SC = 2, W = 1200, P = 30, CW = 560, CH = 200, G = 20, HH = 80;
    var n = mons.length, rows = Math.max(1, Math.ceil(n / 2)), H = P + HH + rows * CH + (rows - 1) * G + P;
    var data = mons.map(function (m) { return monData(m, l); });
    var imgs = await Promise.all(data.map(function (d) { return loadSprite(d.shown); }));
    var cv = document.createElement('canvas'); cv.width = W * SC; cv.height = H * SC;
    var c = cv.getContext('2d'); c.scale(SC, SC); c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
    c.fillStyle = '#ffffff'; c.fillRect(0, 0, W, H);
    c.textBaseline = 'alphabetic'; c.fillStyle = '#1d1d1b'; c.textAlign = 'left';
    var title = t.team + (team ? ' – ' + team : '');
    fit(c, title, pl ? 760 : W - 2 * P, 36, 'bold'); c.fillText(title, P, P + 36);
    if (pl) { c.fillStyle = '#6b6b66'; c.textAlign = 'right'; c.font = '20px ' + FF; c.fillText(t.player + ': ' + pl, W - P, P + 36); c.textAlign = 'left'; }
    c.fillStyle = '#c8372d'; c.fillRect(P, P + 50, W - 2 * P, 3);
    data.forEach(function (tx, i) {
      var x = P + (i % 2) * (CW + G), y = P + HH + Math.floor(i / 2) * (CH + G);
      rr(c, x, y, CW, CH, 14); c.fillStyle = '#f5f5f2'; c.fill(); c.strokeStyle = '#d9d9d2'; c.lineWidth = 1.5; c.stroke();
      rr(c, x + 15, y + 20, 160, 160, 12); c.fillStyle = '#e8e8e2'; c.fill();
      var im = imgs[i];
      if (im) { var k = Math.min(150 / im.width, 150 / im.height, 1.6); var w = im.width * k, h = im.height * k; c.drawImage(im, x + 15 + (160 - w) / 2, y + 20 + (160 - h) / 2, w, h); }
      else { c.fillStyle = '#999'; c.font = 'bold 48px ' + FF; c.textAlign = 'center'; c.fillText('?', x + 95, y + 112); c.textAlign = 'left'; }
      var X = x + 195;
      c.fillStyle = '#1d1d1b'; fit(c, tx.nm, 350, 26, 'bold'); c.fillText(tx.nm, X, y + 36);
      c.fillStyle = '#6b6b66'; c.font = 'bold 16px ' + FF; c.fillText(t.nature, X, y + 64); c.fillText(t.ability, X, y + 88); c.fillText(t.item, X, y + 112);
      c.fillStyle = '#1d1d1b';
      fit(c, tx.nat, 255, 17, 'normal'); c.fillText(tx.nat, X + 96, y + 64);
      fit(c, tx.ab, 255, 17, 'normal'); c.fillText(tx.ab, X + 96, y + 88);
      fit(c, tx.it, 255, 17, 'normal'); c.fillText(tx.it, X + 96, y + 112);
      tx.mv.forEach(function (v, j) {
        var cx = X + (j % 2) * 180, cy = y + 130 + Math.floor(j / 2) * 34;
        rr(c, cx, cy, 170, 28, 7); c.fillStyle = '#e8e6de'; c.fill();
        c.fillStyle = '#1d1d1b'; fit(c, v, 154, 15, 'normal'); c.fillText(v, cx + 8, cy + 19);
      });
    });
    return cv;
  }

  function build() {
    modal = A.el('div', { class: 'modal hidden', id: 'tbSheetModal' });
    modal.innerHTML =
      '<div class="modal-box wide ts-box"><div class="modal-head"><h3>' + A.esc(de ? 'Teamsheet' : 'Team sheet') + '</h3><button class="icon-btn" data-x>✕</button></div>' +
      '<div class="ts-opts">' +
      '<input type="text" data-team spellcheck="false" placeholder="' + A.esc(de ? 'Teamname (optional)' : 'Team name (optional)') + '">' +
      '<input type="text" data-player spellcheck="false" placeholder="' + A.esc(de ? 'Spielername (optional)' : 'Player name (optional)') + '">' +
      '<span class="ts-seg"><button data-l="de" class="on">Deutsch</button><button data-l="en">English</button><button data-l="both">' + A.esc(de ? 'Beide' : 'Both') + '</button></span>' +
      '</div><div class="ts-out" data-out></div></div>';
    document.body.appendChild(modal);
    var close = function () { modal.classList.add('hidden'); };
    modal.querySelector('[data-x]').addEventListener('click', close);
    modal.addEventListener('mousedown', function (ev) { if (ev.target === modal) close(); });
    document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') close(); });
    modal.querySelector('[data-team]').addEventListener('input', refresh);
    modal.querySelector('[data-player]').addEventListener('input', refresh);
    modal.querySelector('.ts-seg').addEventListener('click', function (ev) {
      var b = ev.target.closest('button'); if (!b) return;
      lang = b.dataset.l;
      modal.querySelectorAll('.ts-seg button').forEach(function (x) { x.classList.toggle('on', x === b); });
      refresh();
    });
  }

  function refresh() { clearTimeout(timer); timer = setTimeout(run, 150); }
  async function run() {
    var out = modal.querySelector('[data-out]'), my = ++token;
    var mons = (ctx.mons || []).filter(function (m) { return m && m.set; });
    if (!mons.length) { out.textContent = de ? 'Das Team ist leer.' : 'The team is empty.'; return; }
    var team = modal.querySelector('[data-team]').value.trim(), pl = modal.querySelector('[data-player]').value.trim();
    var langs = lang === 'both' ? ['de', 'en'] : [lang];
    var cvs = [];
    for (var i = 0; i < langs.length; i++) cvs.push(await drawSheet(mons, langs[i], team, pl));
    if (my !== token) return;
    out.innerHTML = '';
    langs.forEach(function (l, i) {
      var cv = cvs[i], box = A.el('div', { class: 'ts-item' });
      var img = A.el('img', { alt: 'Teamsheet ' + l }); img.src = cv.toDataURL('image/png');
      var st = A.el('span', { class: 'hint' });
      var cp = A.el('button', { class: 'tbtn', text: de ? 'Bild kopieren' : 'Copy image' });
      cp.addEventListener('click', function () {
        cv.toBlob(function (bl) {
          navigator.clipboard.write([new ClipboardItem({ 'image/png': bl })]).then(function () { st.textContent = de ? 'Kopiert' : 'Copied'; }, function () { st.textContent = de ? 'Kopieren nicht möglich – Bild rechtsklicken oder speichern.' : 'Copy not possible – right-click the image or save it.'; });
        }, 'image/png');
      });
      var a = A.el('a', { class: 'tbtn ts-save', text: de ? 'Als PNG speichern' : 'Save as PNG' }); a.href = img.src; a.download = 'teamsheet-' + l + '.png';
      box.appendChild(img);
      var row = A.el('div', { class: 'ts-row' }); row.appendChild(cp); row.appendChild(a); row.appendChild(st);
      box.appendChild(row);
      out.appendChild(box);
    });
  }

  window.CCTeamsheet = {
    open: function (opts) {
      ctx = opts;
      if (!modal) build();
      modal.querySelector('[data-team]').value = opts.name || '';
      modal.classList.remove('hidden');
      run();
    }
  };
})();

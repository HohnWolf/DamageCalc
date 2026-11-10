// App-Update der Android-Huelle (mobile/), ohne Play Store: sucht das neueste GitHub-Release (HohnWolf/DamageCalc),
// laedt dessen RattataLab-android.apk ueber das native Plugin AppUpdate und startet den Android-Installer.
// Stellt dieselbe Schnittstelle wie window.desktop.update (Electron) bereit: get, onStatus, check, install.
// Zustand: idle | checking | none | ready (neue Version gefunden) | progress | perm (Erlaubnis fehlt) | error
(function () {
  'use strict';
  var cap = window.Capacitor, P = cap && cap.Plugins, N = P && P.AppUpdate;
  if (!window.RL_ANDROID || !N) return;
  var API = 'https://api.github.com/repos/HohnWolf/DamageCalc/releases/latest';
  var ASSET = 'RattataLab-android.apk';
  var status = { state: 'idle', current: '?', android: true };
  var listeners = [], found = null, busy = false;

  function emit(s) {
    status = Object.assign({ current: status.current, android: true }, s);
    listeners.forEach(function (cb) { try { cb(status); } catch (e) { /* Anzeige darf das Update nicht stoeren */ } });
  }
  function newer(a, b) { // ist Version a neuer als b ("1.20.0")?
    var x = String(a).replace(/^v/, '').split('.'), y = String(b).replace(/^v/, '').split('.');
    for (var i = 0; i < 3; i++) {
      var d = (parseInt(x[i], 10) || 0) - (parseInt(y[i], 10) || 0);
      if (d) return d > 0;
    }
    return false;
  }
  function msg(e) { return (e && (e.message || e.errorMessage)) || String(e || '?'); }

  function check() {
    if (busy) return Promise.resolve();
    busy = true;
    emit({ state: 'checking' });
    return N.getInfo().then(function (info) {
      status.current = info.version;
      return fetch(API, { headers: { Accept: 'application/vnd.github+json' } }).then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      }).then(function (rel) {
        var ver = String(rel.tag_name || '').replace(/^v/, '');
        var asset = (rel.assets || []).filter(function (a) { return a.name === ASSET; })[0];
        // die APK wird erst kurz nach dem Release angehaengt: bis dahin gibt es noch nichts zu installieren
        if (!ver || !asset || !newer(ver, info.version)) { found = null; emit({ state: 'none' }); return; }
        found = { version: ver, url: asset.browser_download_url, sha256: /^sha256:/.test(asset.digest || '') ? asset.digest.slice(7) : '' };
        emit({ state: 'ready', version: ver });
      });
    }).catch(function (e) { emit({ state: 'error', message: msg(e) }); })
      .then(function () { busy = false; });
  }

  function install() {
    if (busy || !found) return;
    var f = found;
    busy = true;
    emit({ state: 'progress', version: f.version, percent: 0 });
    var h = N.addListener('progress', function (p) { emit({ state: 'progress', version: f.version, percent: p.percent || 0 }); });
    Promise.resolve(h).then(function (hd) {
      return N.download({ url: f.url, sha256: f.sha256 }).then(function () { if (hd && hd.remove) hd.remove(); }, function (e) {
        if (hd && hd.remove) hd.remove();
        throw e;
      });
    }).then(function () { return N.install(); }).then(function () {
      emit({ state: 'ready', version: f.version }); // Installer ist offen; bricht der Nutzer ab, bleibt der Knopf
    }).catch(function (e) {
      if (e && e.code === 'permission') emit({ state: 'perm', version: f.version });
      else emit({ state: 'error', message: msg(e) });
    }).then(function () { busy = false; });
  }

  window.RL_APP_UPDATE = {
    get: function () { return Promise.resolve(status); },
    onStatus: function (cb) { listeners.push(cb); },
    check: check,
    install: install, // nach der Erlaubnis ('perm') einfach erneut tippen: die APK ist schon geladen oder wird neu geladen
  };
  N.getInfo().then(function (i) { status.current = i.version; }).catch(function () {});
  setTimeout(check, 4000); // beim Start, wenn die App in Ruhe geladen ist
})();

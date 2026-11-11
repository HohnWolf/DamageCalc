// App-Update der Android-Huelle (mobile/), ohne Play Store.
// Dieselbe Kanal-Regel wie auf dem Desktop (js/update_channel.js): Vollversionen nur bei neuer
// Haupt- oder Nebennummer, Zwischenversionen bei jeder neueren Fassung inklusive Vorabversionen.
// Die APK heisst RattataLab-android.apk. Pruefung und Installer macht das Plugin AppUpdate.
// Schnittstelle wie window.desktop.update: get, onStatus, check, install, setChannel, rollback.
// Zustand: idle | checking | none | ready | progress | perm | error
(function () {
  'use strict';
  var cap = window.Capacitor, P = cap && cap.Plugins, N = P && P.AppUpdate;
  if (!window.RL_ANDROID || !N || !window.RLUpdateChannel) return;
  var CH = window.RLUpdateChannel;
  var API = 'https://api.github.com/repos/HohnWolf/DamageCalc/releases?per_page=100';
  var ASSET = 'RattataLab-android.apk';
  var status = { state: 'idle', current: '?', android: true, channel: 'full' };
  var listeners = [], found = null, busy = false, decision = null;

  function readChannel() {
    try {
      var s = JSON.parse(localStorage.getItem('cc_settings') || '{}');
      return CH.normalizeChannel(s && s.updateChannel);
    } catch (e) { return CH.DEFAULT_CHANNEL; }
  }
  function emit(s) {
    var extra = decision ? CH.statusOf(decision) : { channel: readChannel() };
    // Aeltere Vollversion: Android laesst das nicht ueber die installierte Fassung legen.
    if (extra.rollback && CH.compare(extra.rollback, status.current) <= 0) extra = Object.assign({}, extra, { rollback: '' });
    status = Object.assign({ current: status.current, android: true, prerelease: CH.isPrerelease(status.current) }, extra, s);
    listeners.forEach(function (cb) { try { cb(status); } catch (e) { /* Anzeige darf das Update nicht stoeren */ } });
  }
  function msg(e) { return (e && (e.message || e.errorMessage)) || String(e || '?'); }
  function assetOf(rel) {
    var list = (rel && rel.assets) || [], i;
    for (i = 0; i < list.length; i++) if (list[i] && list[i].name === ASSET) return list[i];
    return null;
  }
  function toFound(rel) {
    var asset = assetOf(rel);
    if (!rel || !asset || !asset.browser_download_url) return null;
    return {
      version: rel.version,
      url: asset.browser_download_url,
      sha256: /^sha256:/.test(asset.digest || '') ? asset.digest.slice(7) : ''
    };
  }

  function check() {
    if (busy) return Promise.resolve();
    busy = true;
    emit({ state: 'checking' });
    return N.getInfo().then(function (info) {
      status.current = info.version;
      return fetch(API, { headers: { Accept: 'application/vnd.github+json' } }).then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      }).then(function (list) {
        if (!Array.isArray(list)) throw new Error('GitHub');
        decision = CH.decide(readChannel(), info.version, list, { asset: ASSET });
        var pick = decision.update;
        found = toFound(pick);
        if (!found) { emit({ state: 'none' }); return; }
        emit({ state: 'ready', version: found.version });
      });
    }).catch(function (e) { emit({ state: 'error', message: msg(e) }); })
      .then(function () { busy = false; });
  }

  function rollback() {
    if (busy || !decision || !decision.rollback) return;
    var target = decision.rollback;
    if (CH.compare(target.version, status.current) <= 0) {
      emit({ state: 'none', ahead: true });
      return;
    }
    var next = toFound(target);
    if (!next) { emit({ state: 'none' }); return; }
    found = next;
    emit({ state: 'ready', version: found.version });
    install();
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
      emit({ state: 'ready', version: f.version });
    }).catch(function (e) {
      if (e && e.code === 'permission') emit({ state: 'perm', version: f.version });
      else emit({ state: 'error', message: msg(e) });
    }).then(function () { busy = false; });
  }

  window.RL_APP_UPDATE = {
    get: function () { return Promise.resolve(status); },
    onStatus: function (cb) { listeners.push(cb); },
    check: check,
    install: install,
    setChannel: function () { check(); },
    rollback: rollback
  };
  N.getInfo().then(function (i) { status.current = i.version; status.prerelease = CH.isPrerelease(i.version); }).catch(function () {});
  setTimeout(check, 4000);
})();

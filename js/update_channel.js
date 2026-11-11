// Update-Kanaele. Die Wahl steht in cc_settings.updateChannel.
// 'full' (Vollversionen, Standard): nur eine neue Haupt- oder Nebennummer, danach die neueste Fassung dieser Linie.
// 'interim' (Zwischenversionen): jede neuere Fassung, auch Patches und Vorabversionen.
// Releases muessen dafuer nicht markiert werden; es zaehlt die Versionsnummer.
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.RLUpdateChannel = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  var DEFAULT_CHANNEL = 'full';

  function normalizeChannel(v) {
    v = String(v || '').toLowerCase();
    // aeltere interne Namen, falls jemand sie schon gespeichert hat
    if (v === 'interim' || v === 'testing') return 'interim';
    return DEFAULT_CHANNEL;
  }

  function parseVersion(v) {
    var s = String(v == null ? '' : v).trim().replace(/^v/i, '');
    var m = /^(\d+)\.(\d+)(?:\.(\d+))?(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/.exec(s);
    if (!m) return null;
    var patch = m[3] != null ? m[3] : '0';
    return {
      major: +m[1],
      minor: +m[2],
      patch: +patch,
      pre: m[4] ? m[4].split('.') : null,
      raw: m[1] + '.' + m[2] + '.' + patch + (m[4] ? '-' + m[4] : '')
    };
  }

  function cmpIdent(a, b) {
    var na = /^\d+$/.test(a), nb = /^\d+$/.test(b);
    if (na && nb) return (+a) < (+b) ? -1 : (+a) > (+b) ? 1 : 0;
    if (na !== nb) return na ? -1 : 1;
    return a < b ? -1 : a > b ? 1 : 0;
  }

  function cmpPre(a, b) {
    if (!a && !b) return 0;
    if (!a) return 1;
    if (!b) return -1;
    var n = a.length > b.length ? a.length : b.length, i, c;
    for (i = 0; i < n; i++) {
      if (i >= a.length) return -1;
      if (i >= b.length) return 1;
      c = cmpIdent(a[i], b[i]);
      if (c) return c;
    }
    return 0;
  }

  function parsed(v) {
    if (v && typeof v === 'object' && v.major != null && v.raw != null) return v;
    return parseVersion(v);
  }

  function compare(a, b) {
    var pa = parsed(a), pb = parsed(b);
    if (!pa && !pb) return 0;
    if (!pa) return -1;
    if (!pb) return 1;
    if (pa.major !== pb.major) return pa.major > pb.major ? 1 : -1;
    if (pa.minor !== pb.minor) return pa.minor > pb.minor ? 1 : -1;
    if (pa.patch !== pb.patch) return pa.patch > pb.patch ? 1 : -1;
    return cmpPre(pa.pre, pb.pre);
  }

  function isPrerelease(v) {
    var p = parsed(v);
    return !!(p && p.pre);
  }

  function releaseOf(x) {
    if (x && typeof x === 'object') {
      var version = x.version != null ? x.version : (x.tag_name || '');
      version = String(version).replace(/^v/i, '');
      return {
        version: version,
        prerelease: !!x.prerelease || isPrerelease(version),
        url: x.url || x.html_url || '',
        assets: x.assets || []
      };
    }
    var version = String(x || '').replace(/^v/i, '');
    return { version: version, prerelease: isPrerelease(version), url: '', assets: [] };
  }

  function isPre(rel) {
    return !!(rel && (rel.prerelease || isPrerelease(rel.version)));
  }

  // Vollversionen: neue Haupt- oder Nebennummer, und keine Vorabversion.
  function fullJump(current, candidate) {
    var c = parsed(current), n = parsed(candidate);
    if (!c || !n || n.pre) return false;
    return n.major > c.major || (n.major === c.major && n.minor > c.minor);
  }

  function allows(channel, current, candidate) {
    var rel = releaseOf(candidate);
    if (!parsed(rel.version) || compare(rel.version, current) <= 0) return false;
    if (normalizeChannel(channel) === 'interim') return true;
    return !isPre(rel) && fullJump(current, rel.version);
  }

  function hasAsset(rel, name) {
    if (!name) return true;
    return (rel.assets || []).some(function (a) { return a && a.name === name; });
  }

  function decide(channel, current, releases, opts) {
    opts = opts || {};
    channel = normalizeChannel(channel);
    var asset = opts.asset || '';
    var list = [];
    (releases || []).forEach(function (r) {
      if (!r || r.draft) return;
      var rel = releaseOf(r);
      rel.parsed = parsed(rel.version);
      if (!rel.parsed) return;
      if (r.prerelease) rel.prerelease = true;
      list.push(rel);
    });
    var latestFull = null;
    list.forEach(function (r) {
      if (isPre(r)) return;
      if (!latestFull || compare(r.parsed, latestFull.parsed) > 0) latestFull = r;
    });
    var best = null;
    list.forEach(function (r) {
      if (!hasAsset(r, asset) || !allows(channel, current, r)) return;
      if (!best || compare(r.parsed, best.parsed) > 0) best = r;
    });
    var cur = parsed(current);
    var ahead = !!(latestFull && cur && compare(cur, latestFull.parsed) > 0);
    var rollback = null;
    // Zurueck auf die letzte Vollversion nur auf Wunsch: nie als automatisches Downgrade.
    if (channel === 'full' && latestFull && cur && compare(cur, latestFull.parsed) !== 0 && (cur.pre || ahead)) {
      if (hasAsset(latestFull, asset)) rollback = latestFull;
    }
    var patchHeld = !!(channel === 'full' && !best && latestFull && cur && compare(latestFull.parsed, cur) > 0 && !fullJump(cur, latestFull.version));
    return {
      channel: channel,
      current: cur ? cur.raw : String(current || ''),
      update: best,
      latestFull: latestFull,
      ahead: ahead,
      patchHeld: patchHeld,
      rollback: rollback
    };
  }

  function statusOf(decision) {
    decision = decision || {};
    var lf = decision.latestFull || null, rb = decision.rollback || null;
    return {
      channel: normalizeChannel(decision.channel),
      ahead: !!decision.ahead,
      patchHeld: !!decision.patchHeld,
      patchVersion: decision.patchHeld && lf ? lf.version : '',
      latestFull: lf ? lf.version : '',
      rollback: rb ? rb.version : '',
      rollbackUrl: rb && rb.url ? rb.url : '',
      prerelease: isPrerelease(decision.current)
    };
  }

  return {
    DEFAULT_CHANNEL: DEFAULT_CHANNEL,
    normalizeChannel: normalizeChannel,
    parseVersion: parseVersion,
    compare: compare,
    isPrerelease: isPrerelease,
    allows: allows,
    fullJump: fullJump,
    decide: decide,
    statusOf: statusOf
  };
});

// Kanal-Regel: Vollversionen nur bei neuer Haupt- oder Nebennummer, Zwischenversionen bei jeder neueren Fassung.
const fs = require('fs'), path = require('path');
const CH = require('../js/update_channel.js');
let bad = 0;
function fail(m) { console.log('FAIL ' + m); bad++; }
function ok(m) { console.log('ok   ' + m); }
function eq(actual, expected, m) {
  if (actual !== expected) fail(m + ' (ist ' + JSON.stringify(actual) + ', soll ' + JSON.stringify(expected) + ')');
  else ok(m);
}

function rel(version, extra) {
  extra = extra || {};
  return {
    tag_name: 'v' + version,
    prerelease: !!extra.prerelease,
    draft: !!extra.draft,
    html_url: 'https://example.test/' + version,
    assets: extra.assets || [{ name: 'RattataLab-android.apk', browser_download_url: 'https://example.test/' + version + '.apk', digest: 'sha256:abc' }]
  };
}
function offered(channel, current, versions) {
  var list = versions.map(function (v) { return typeof v === 'string' ? rel(v) : v; });
  return CH.decide(channel, current, list);
}

eq(CH.DEFAULT_CHANNEL, 'full', 'Standardkanal ist full');
eq(CH.normalizeChannel(undefined), 'full', 'fehlender Kanal wird full');
eq(CH.normalizeChannel(''), 'full', 'leerer Kanal wird full');
eq(CH.normalizeChannel('nope'), 'full', 'unbekannter Kanal wird full');
eq(CH.normalizeChannel('full'), 'full', 'full bleibt full');
eq(CH.normalizeChannel('interim'), 'interim', 'interim bleibt interim');
eq(CH.normalizeChannel('stable'), 'full', 'alter Name stable wird full');
eq(CH.normalizeChannel('testing'), 'interim', 'alter Name testing wird interim');

eq(CH.compare('1.20.5', '1.20.6') < 0, true, '1.20.5 < 1.20.6');
eq(CH.compare('1.20.6', '1.21.0') < 0, true, '1.20.6 < 1.21.0');
eq(CH.compare('1.21.0', '1.21.2') < 0, true, '1.21.0 < 1.21.2');
eq(CH.compare('1.21.0', '2.0.0') < 0, true, '1.21.0 < 2.0.0');
eq(CH.compare('1.21.0', '1.21.0'), 0, 'gleiche Version');
eq(CH.compare('v1.21.0', '1.21.0'), 0, 'v-Praefix stoert nicht');
eq(CH.compare('1.22.0-beta.1', '1.22.0-beta.2') < 0, true, 'beta.1 < beta.2');
eq(CH.compare('1.22.0-beta.2', '1.22.0-beta.10') < 0, true, 'beta.2 < beta.10');
eq(CH.compare('1.22.0-beta.10', '1.22.0') < 0, true, 'beta.10 < Release');
eq(CH.compare('1.22.0-beta.1', '1.21.3') > 0, true, 'neuere Vorabversion bleibt neuer als die vorige Vollversion');
eq(CH.isPrerelease('1.22.0-beta.1'), true, 'beta ist eine Vorabversion');
eq(CH.isPrerelease('1.22.0'), false, 'Release ohne Suffix ist keine Vorabversion');

var patch = offered('full', '1.20.5', ['1.20.6']);
eq(patch.update, null, '1.20.5 -> 1.20.6 wird auf Vollversionen nicht angeboten');
eq(patch.patchHeld, true, 'der zurueckgehaltene Patch ist markiert');
eq(patch.patchVersion || (patch.latestFull && patch.latestFull.version), '1.20.6', 'Patch-Version steht am Ergebnis');
var patchI = offered('interim', '1.20.5', ['1.20.6']);
eq(patchI.update && patchI.update.version, '1.20.6', '1.20.5 -> 1.20.6 wird auf Zwischenversionen angeboten');

var minor = offered('full', '1.20.6', ['1.21.0']);
eq(minor.update && minor.update.version, '1.21.0', '1.20.6 -> 1.21.0 auf Vollversionen');
eq(offered('interim', '1.20.6', ['1.21.0']).update.version, '1.21.0', '1.20.6 -> 1.21.0 auf Zwischenversionen');

eq(offered('full', '1.21.0', ['1.21.2']).update, null, '1.21.0 -> 1.21.2 nur nicht auf Vollversionen');
eq(offered('interim', '1.21.0', ['1.21.2']).update.version, '1.21.2', '1.21.0 -> 1.21.2 auf Zwischenversionen');

var line = offered('full', '1.20.5', ['1.21.0', '1.20.8', '1.21.3']);
eq(line.update && line.update.version, '1.21.0', 'Vollversionen nimmt genau die x.y.0 der neuen Linie');
eq(offered('interim', '1.20.5', ['1.21.0', '1.21.3', '1.21.2']).update.version, '1.21.3', 'Zwischenversionen nimmt ebenfalls die neueste');

eq(offered('full', '1.21.4', ['2.0.0']).update.version, '2.0.0', 'Hauptnummer-Sprung auf Vollversionen');
eq(offered('interim', '1.21.4', ['2.0.0']).update.version, '2.0.0', 'Hauptnummer-Sprung auf Zwischenversionen');
eq(offered('full', '1.21.0', ['1.21.0']).update, null, 'dieselbe Version ist kein Update');

var pre = offered('interim', '1.21.0', ['1.21.2', '1.22.0-beta.1']);
eq(pre.update && pre.update.version, '1.22.0-beta.1', 'Zwischenversionen nimmt die neuere Vorabversion');
eq(offered('full', '1.21.0', ['1.21.2', '1.22.0-beta.1']).update, null, 'Vollversionen ignoriert Patch und Vorabversion');

var flagged = offered('full', '1.20.0', [rel('1.21.0', { prerelease: true })]);
eq(flagged.update, null, 'als Vorabversion markiert, auch ohne Suffix, nicht auf Vollversionen');
eq(offered('interim', '1.20.0', [rel('1.21.0', { prerelease: true })]).update.version, '1.21.0', 'markierte Vorabversion auf Zwischenversionen');

var ahead = offered('full', '1.22.0-beta.1', ['1.21.3', '1.21.4']);
eq(ahead.update, null, 'zurueck auf Vollversionen bietet kein Downgrade an');
eq(ahead.ahead, true, 'die installierte Fassung ist neuer als die letzte Vollversion');
eq(ahead.rollback && ahead.rollback.version, '1.21.4', 'die letzte Vollversion steht fuer den ausdruecklichen Wechsel bereit');
eq(CH.statusOf(ahead).rollback, '1.21.4', 'Status meldet die Vollversion fuer den Knopf');

var sameLine = offered('full', '1.21.0-beta.1', ['1.21.0']);
eq(sameLine.update, null, 'dieselbe Linie wird aus einer Vorabversion nicht automatisch zur Vollversion');
eq(sameLine.rollback && sameLine.rollback.version, '1.21.0', 'der Knopf kann die Vollversion derselben Linie trotzdem holen');
eq(CH.compare(sameLine.rollback.version, '1.21.0-beta.1') > 0, true, 'diese Vollversion ist neuer als die Vorabversion');

var apk = CH.decide('interim', '1.20.0', [
  rel('1.22.0', { assets: [] }),
  rel('1.21.0')
], { asset: 'RattataLab-android.apk' });
eq(apk.update && apk.update.version, '1.21.0', 'ohne APK wird die naechste passende Fassung genommen');

var root = path.join(__dirname, '..');
var app = fs.readFileSync(path.join(root, 'js/app.js'), 'utf8');
var readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
var html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
var pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
eq(app.includes("updFull: 'Vollversionen'"), true, 'deutsche Bezeichnung Vollversionen');
eq(app.includes("updInterim: 'Zwischenversionen'"), true, 'deutsche Bezeichnung Zwischenversionen');
eq(app.includes("updFull: 'Full releases'"), true, 'englische Bezeichnung Full releases');
eq(app.includes("updInterim: 'Interim releases'"), true, 'englische Bezeichnung Interim releases');
eq(/\bStabil\b|\bTesting\b/.test(app), false, 'app.js nennt die Kanaele nicht Stabil oder Testing');
eq(/\bStabil\b|\bTesting\b/.test(readme), false, 'README nennt die Kanaele nicht Stabil oder Testing');
eq(readme.includes('Vollversionen') && readme.includes('Zwischenversionen'), true, 'README erklaert beide Kanaele');
eq(readme.includes('beta.yml'), true, 'README erklaert die Vorab-Datei beta.yml');
eq(html.includes('js/update_channel.js'), true, 'die Kanal-Logik wird von der Seite geladen');
eq(pkg.version, '1.26.0', 'Version ist 1.26.0');
eq(app.includes("updateChannel: 'full'"), true, 'bestehende Installationen fallen auf full zurueck');

if (bad) { console.log(bad + ' Problem(e)'); process.exit(1); }
console.log('Update-Kanaele OK');

// Update-Dateien werden nach der Installation entfernt, ein noch nicht installiertes Update bleibt liegen.
const fs = require('fs'), os = require('os'), path = require('path'), Module = require('module');
const origLoad = Module._load;
Module._load = function (req, ...a) {
  if (req === 'electron') return { app: { getPath: () => os.tmpdir(), getVersion: () => '1.24.2', isPackaged: false, getAppPath: () => '.' }, ipcMain: {}, shell: {}, net: {} };
  return origLoad.call(this, req, ...a);
};
const { cleanStale } = require('../electron/updater.js');
let bad = 0;
function eq(a, b, m) { if (a !== b) { bad++; console.log('FAIL ' + m + ': ' + a + ' != ' + b); } else console.log('ok ' + m); }
function make(ver) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'rlupd-'));
  fs.mkdirSync(path.join(d, 'pending'));
  fs.writeFileSync(path.join(d, 'installer.exe'), 'x');
  fs.writeFileSync(path.join(d, 'current.blockmap'), 'x');
  fs.writeFileSync(path.join(d, 'pending', 'RattataLab-Setup-' + ver + '.exe'), 'x');
  fs.writeFileSync(path.join(d, 'pending', 'update-info.json'), JSON.stringify({ fileName: 'RattataLab-Setup-' + ver + '.exe' }));
  return d;
}
let d = make('1.24.0');
eq(cleanStale(d, '1.24.2'), true, 'installierte Version: aufgeraeumt');
eq(fs.existsSync(path.join(d, 'pending')) || fs.existsSync(path.join(d, 'installer.exe')) || fs.existsSync(path.join(d, 'current.blockmap')), false, 'nichts mehr da');
d = make('1.24.2');
eq(cleanStale(d, '1.24.2'), true, 'gleiche Version: aufgeraeumt');
d = make('1.25.0');
eq(cleanStale(d, '1.24.2'), false, 'neueres Update bleibt');
eq(fs.existsSync(path.join(d, 'installer.exe')), true, 'Installer des neueren Updates bleibt');
eq(cleanStale(path.join(os.tmpdir(), 'rlupd-gibt-es-nicht'), '1.24.2'), false, 'fehlender Ordner');
process.exit(bad ? 1 : 0);

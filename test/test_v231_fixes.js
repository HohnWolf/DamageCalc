// Regressionstests für v2.3.1-Fixes:
// - electron/matchlog_ocr.js: safeSheetName (Path-Traversal-Schutz) & findAgyBin (macOS/Linux/Windows)
// - js/hotkeys.js: normalize('+') und normalize('Ctrl++')
// - js/teamshare.js: fetchPaste nutzt unter Android CapacitorHttp statt fetch
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const Module = require('module');

const root = path.join(__dirname, '..');

// 1. electron/matchlog_ocr.js (mit gemocktem electron)
const fakeElectron = { app: { getPath: () => '', on() {} }, ipcMain: { handle() {} }, dialog: {}, BrowserWindow: {} };
const origLoad = Module._load;
Module._load = function (req, ...rest) {
  if (req === 'electron') return fakeElectron;
  if (req === '../js/matchlog_ocr_node') return { create: () => ({ recognize: async () => ({ text: '' }), stop() {} }) };
  return origLoad.call(this, req, ...rest);
};
const matchlogOcr = require(path.join(root, 'electron', 'matchlog_ocr.js'));
Module._load = origLoad;

assert.strictEqual(matchlogOcr.safeSheetName('../../evil/sheet1.jpg', 0), 'sheet1.jpg');
assert.strictEqual(matchlogOcr.safeSheetName('..\\..\\windows\\win.ini', 0), 'win.ini');
assert.strictEqual(matchlogOcr.safeSheetName('..', 2), 'sheet-3.jpg');
assert.strictEqual(matchlogOcr.safeSheetName('', 0), 'sheet-1.jpg');
assert.strictEqual(matchlogOcr.safeSheetName('a*b?c.jpg', 0), 'abc.jpg');
assert.strictEqual(matchlogOcr.safeSheetName('C:\\evil\\x.jpg', 0), 'x.jpg');

const macHome = '/Users/tester';
assert.strictEqual(
  matchlogOcr.findAgyBin('darwin', {}, macHome, (p) => p === '/opt/homebrew/bin/agy'),
  '/opt/homebrew/bin/agy'
);
assert.strictEqual(
  matchlogOcr.findAgyBin('darwin', {}, macHome, (p) => p === path.join(macHome, '.local', 'bin', 'agy')),
  path.join(macHome, '.local', 'bin', 'agy')
);
assert.strictEqual(
  matchlogOcr.findAgyBin('win32', { LOCALAPPDATA: 'C:\\Users\\t\\AppData\\Local' }, '', (p) => /agy\.exe$/i.test(p)),
  path.join('C:\\Users\\t\\AppData\\Local', 'agy', 'bin', 'agy.exe')
);
assert.strictEqual(matchlogOcr.findAgyBin('darwin', {}, macHome, () => false), 'agy');
console.log('ok   matchlog_ocr safeSheetName & findAgyBin');

// 2. js/hotkeys.js
{
  const ctx = {
    window: {},
    document: { documentElement: { lang: 'de' }, addEventListener() {}, querySelector: () => null },
    localStorage: { getItem: () => null, setItem() {} },
    navigator: { platform: 'Win32' }
  };
  ctx.window = ctx;
  vm.runInNewContext(fs.readFileSync(path.join(root, 'js', 'hotkeys.js'), 'utf8'), ctx);
  const H = ctx.window.RLHotkeys;
  assert.strictEqual(H.normalize('+'), 'Plus');
  assert.strictEqual(H.normalize('Ctrl++'), 'Ctrl+Plus');
  assert.strictEqual(H.normalize('Alt+Shift++'), 'Alt+Shift+Plus');
  assert.strictEqual(H.normalize('-'), 'Minus');
  assert.strictEqual(H.normalize('Ctrl+-'), 'Ctrl+Minus');
  assert.strictEqual(H.label('+'), '+');
  assert.strictEqual(H.label('Ctrl++'), 'Strg + +');
  console.log('ok   hotkeys normalize(+) & Ctrl++');
}

// 3. js/teamshare.js (fetchPaste unter Android)
(async function () {
  const calls = [];
  const ctx = {
    window: {},
    document: { documentElement: { lang: 'de' } },
    RL_ANDROID: true,
    Capacitor: {
      Plugins: {
        CapacitorHttp: {
          request: async (opts) => {
            calls.push(opts);
            return { status: 200, data: JSON.stringify({ title: 'Test Team', author: 'Ash', paste: 'Pikachu\r\n- Thunderbolt' }) };
          }
        }
      }
    },
    fetch: () => { throw new Error('fetch darf unter Android mit CapacitorHttp nicht gerufen werden'); }
  };
  ctx.window = ctx;
  vm.runInNewContext(fs.readFileSync(path.join(root, 'js', 'teamshare.js'), 'utf8'), ctx);
  const res = await ctx.window.RLTeamShare.fetchPaste('https://pokepast.es/0123456789abcdef');
  assert.strictEqual(calls.length, 1);
  assert.strictEqual(calls[0].method, 'GET');
  assert.strictEqual(calls[0].url, 'https://pokepast.es/0123456789abcdef/json');
  assert.strictEqual(res.title, 'Test Team');
  assert.strictEqual(res.author, 'Ash');
  assert.strictEqual(res.paste, 'Pikachu\n- Thunderbolt');
  console.log('ok   teamshare fetchPaste Android CapacitorHttp');
  console.log('v2.3.1 Fixes OK');
})().catch((err) => {
  console.error(err);
  process.exit(1);
});

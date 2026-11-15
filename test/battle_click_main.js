const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
app.setPath('userData', '/tmp/rl-click-' + process.pid);
function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
const shots = process.argv.indexOf('--shots') >= 0;

app.whenReady().then(async function () {
  require(path.join(ROOT, 'electron/battle_host')).init();
  const win = new BrowserWindow({
    width: 1280, height: 720, show: true, backgroundColor: '#111',
    webPreferences: { preload: path.join(ROOT, 'electron/preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true }
  });
  const report = { games: [], errors: [] };
  win.webContents.on('console-message', function (_e, level, message) {
    if (String(message).indexOf('CLICK') === 0) report.errors.push(String(message));
  });
  await win.loadFile(path.join(ROOT, 'index.html'));
  await sleep(400);
  async function boot(w, h, zoom) {
    win.setSize(w, h);
    await win.webContents.executeJavaScript(
      "localStorage.setItem('cc_lang','de'); window.CC.setSetting('zoom','" + zoom + "'); window.dispatchEvent(new Event('resize'));",
      true);
    await sleep(200);
    await win.webContents.executeJavaScript("window.dispatchEvent(new Event('resize'));", true);
    await sleep(200);
  }
  async function playOne(label, w, h, zoom) {
    await boot(w, h, zoom);
    await win.webContents.executeJavaScript("window.CC.showView('btlrandom')", true);
    await sleep(200);
    await win.webContents.executeJavaScript(`(function () {
      var teams = (window.RL_META_TEAMS && window.RL_META_TEAMS.teams) || [];
      var a = null, b = null, i;
      for (i = 0; i < teams.length; i++) if (teams[i].paste && teams[i].paste.indexOf('U-turn') >= 0) { a = teams[i]; break; }
      for (i = 0; i < teams.length; i++) if (teams[i].paste && teams[i].paste.indexOf('Parting Shot') >= 0 && (!a || teams[i].id !== a.id)) { b = teams[i]; break; }
      if (!a || !b) return;
      window.RLBattleRandom.pickPair = function () {
        return { a: { id: a.id, name: a.name, paste: a.paste }, b: { id: b.id, name: b.name, paste: b.paste } };
      };
    })()`, true);
    await win.webContents.executeJavaScript("var g=document.querySelector('.btl-go'); if(g) g.click();", true);
    const seen = { preview: false, target: false, move: false, switch: false, end: false, pivot: false, fit: [] };
    let turn = 0;
    for (let step = 0; step < 220; step++) {
      await sleep(40);
      const state = await win.webContents.executeJavaScript(`(function () {
        function txt(sel) { var n = document.querySelector(sel); return n ? n.textContent : ''; }
        var buttons = Array.prototype.slice.call(document.querySelectorAll('.movemenu button, .switchmenu button, button.big'));
        var ih = window.innerHeight, iw = window.innerWidth;
        var cut = buttons.filter(function (b) {
          var r = b.getBoundingClientRect();
          return r.width > 2 && (r.bottom > ih + 2 || r.top < -2 || r.right > iw + 2 || r.left < -2);
        }).map(function (b) { return b.textContent.trim().slice(0, 24); });
        var view = document.querySelector('.btl-view');
        var log = document.querySelector('.battle-log');
        return {
          what: txt('.whatdo'),
          ended: /Sieger:|Unentschieden/.test(document.body.innerText),
          bad: txt('.btl-bad'),
          moves: Array.prototype.map.call(document.querySelectorAll('.movemenu button:not(:disabled)'), function (b) { return b.textContent.trim(); }),
          switches: document.querySelectorAll('.switchmenu button:not(:disabled)').length,
          mit: !!Array.prototype.find.call(document.querySelectorAll('button'), function (b) { return b.textContent === 'Mitnehmen' && !b.disabled; }),
          wechsel: !!Array.prototype.find.call(document.querySelectorAll('button'), function (b) { return b.textContent === 'Wechseln' && !b.disabled; }),
          cut: cut,
          scroll: view ? view.scrollHeight - view.clientHeight : -1,
          logScroll: log ? log.scrollHeight > log.clientHeight + 2 : false,
          turn: (txt('.btl-chips') || '').replace(/\\D+/g, ' ').trim().split(' ')[0]
        };
      })()`, true);
      if (state.bad) { seen.bad = state.bad; break; }
      if (state.cut.length || state.scroll > 2) seen.fit.push({ step: step, cut: state.cut, scroll: state.scroll, what: state.what });
      if (state.what.indexOf('Wähle') === 0) {
        seen.preview = true;
        if (shots && !seen.shotPreview) {
          seen.shotPreview = true;
          fs.writeFileSync('/opt/cursor/artifacts/battle-preview-' + w + 'x' + h + '.png', (await win.webContents.capturePage()).toPNG());
        }
        await win.webContents.executeJavaScript(`(function () {
          var p = document.querySelectorAll('.switchmenu button');
          for (var i = 0; i < 4 && i < p.length; i++) p[i].click();
          var buttons = document.querySelectorAll('button');
          for (var j = 0; j < buttons.length; j++) if (buttons[j].textContent === 'Mitnehmen' && !buttons[j].disabled) buttons[j].click();
        })()`, true);
        continue;
      }
      if (state.ended) { seen.end = true; break; }
      if (state.what.indexOf('Einwechseln') === 0 || state.wechsel) {
        seen.switch = true;
        if (shots && !seen.shotSwitch) {
          seen.shotSwitch = true;
          fs.writeFileSync('/opt/cursor/artifacts/battle-switch.png', (await win.webContents.capturePage()).toPNG());
        }
        await win.webContents.executeJavaScript(`(function () {
          var p = document.querySelectorAll('.switchmenu button:not(:disabled)');
          if (p[0]) p[0].click();
          var buttons = document.querySelectorAll('button');
          for (var j = 0; j < buttons.length; j++) if (buttons[j].textContent === 'Wechseln' && !buttons[j].disabled) buttons[j].click();
        })()`, true);
        continue;
      }
      var pivots = ['Kehrtwende', 'Voltwechsel', 'Abgangstirade', 'Staffette'];
      var target = state.moves.filter(function (t) { return t.indexOf('Gegner') === 0 || t.indexOf('Partner') === 0; });
      if (target.length) {
        seen.target = true;
        if (shots && !seen.shotTarget) {
          seen.shotTarget = true;
          fs.writeFileSync('/opt/cursor/artifacts/battle-target.png', (await win.webContents.capturePage()).toPNG());
        }
        await win.webContents.executeJavaScript(`(function () {
          var b = document.querySelector('.movemenu button.btl-target, .movemenu button');
          if (b) b.click();
        })()`, true);
        continue;
      }
      if (state.moves.length) {
        seen.move = true;
        if (shots && !seen.shotMove) {
          seen.shotMove = true;
          fs.writeFileSync('/opt/cursor/artifacts/battle-move-' + w + 'x' + h + '-z' + zoom + '.png', (await win.webContents.capturePage()).toPNG());
        }
        var want = state.moves.filter(function (t) { return pivots.some(function (p) { return t.indexOf(p) === 0; }); })[0];
        if (want) seen.pivot = true;
        await win.webContents.executeJavaScript(`(function () {
          var pivots = ${JSON.stringify(pivots)};
          var buttons = document.querySelectorAll('.movemenu button:not(:disabled)');
          var pick = null;
          for (var i = 0; i < buttons.length; i++) {
            var t = buttons[i].textContent;
            if (pivots.some(function (p) { return t.indexOf(p) === 0; })) { pick = buttons[i]; break; }
          }
          (pick || buttons[0]).click();
        })()`, true);
        var now = parseInt(state.turn, 10);
        if (now > turn) turn = now;
        continue;
      }
      if (step > 8 && !state.what) break;
    }
    if (!seen.end) {
      await win.webContents.executeJavaScript("window.confirm=function(){return true;}; var b=Array.prototype.find.call(document.querySelectorAll('button'), function(x){return x.textContent==='Aufgeben';}); if(b) b.click();", true);
      await sleep(300);
      seen.end = await win.webContents.executeJavaScript("/Sieger:|Unentschieden/.test(document.body.innerText)", true);
    }
    if (shots && seen.end) fs.writeFileSync('/opt/cursor/artifacts/battle-end.png', (await win.webContents.capturePage()).toPNG());
    seen.turn = turn;
    seen.label = label + ' ' + w + 'x' + h + ' @' + zoom;
    report.games.push(seen);
    await win.webContents.executeJavaScript("var b=Array.prototype.find.call(document.querySelectorAll('button'), function(x){return x.textContent==='Zurück';}); if(b) b.click();", true);
    await sleep(150);
  }
  try {
    await playOne('klein', 1024, 400, '100');
    await playOne('mittel', 1280, 720, '100');
    await playOne('gross', 1920, 1080, '100');
    if (shots) {
      await boot(1280, 720, '130');
      await win.webContents.executeJavaScript("window.CC.showView('btlrandom'); document.querySelector('.btl-go').click();", true);
      await sleep(500);
      fs.writeFileSync('/opt/cursor/artifacts/battle-zoom130.png', (await win.webContents.capturePage()).toPNG());
      await boot(1280, 720, '150');
      await sleep(300);
      fs.writeFileSync('/opt/cursor/artifacts/battle-zoom150.png', (await win.webContents.capturePage()).toPNG());
    }
  } catch (e) {
    report.errors.push(String(e && e.stack || e));
  }
  fs.writeFileSync('/tmp/battle-click-report.json', JSON.stringify(report, null, 2));
  console.log('REPORT ' + JSON.stringify(report));
  app.exit(report.errors.length ? 1 : 0);
});
app.on('window-all-closed', function () {});

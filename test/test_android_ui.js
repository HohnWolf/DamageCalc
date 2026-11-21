// Android-UI- & Simulator-E2E-Test:
// Serviert mobile/www/ über einen lokalen HTTP-Server, öffnet mobile/www/index.html in Headless-Edge/Chrome
// in 3 Viewports (390×844 Portrait, 844×390 Landscape, 1024×600 Tablet) und prüft:
// - Startseite + alle 20 Android-Tools (keine JS-Fehler, sichtbare Höhe > 0, kein horizontaler Seiten-Overflow)
// - Desktop-only Tools (overlay, projector, matchlog) sind auf Android nicht sichtbar/aufrufbar
// - Shiny-Zähler: Tab "Hotkeys & OBS" ausgeblendet, Hunts/Counter/Sammlung/Shiny-Dex vorhanden
// - window.RL_SIM vorhanden + echter Web-Worker-Aufruf (RL_SIM.meta.validate & RL_SIM.battle.start/forfeit)
// Optional: RL_ANDROID_SCREENSHOT_DIR=<ordner> speichert Screenshots ausgewählter Views.
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const os = require('os');
const net = require('net');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');
const WWW = path.join(ROOT, 'mobile', 'www');

const VIEWS = [
  'start',
  'calc', 'builder', 'match', 'speedtier', 'soullink', 'nuz', 'randomizer', 'savedit',
  'godex', 'gocounter', 'goinfo', 'dex', 'catch',
  'mgspeed', 'mgquiz', 'mgdmg', 'mgtype',
  'btlrandom', 'btlchoice', 'shiny'
];

const DESKTOP_ONLY = ['overlay', 'projector', 'matchlog'];

const VIEWPORTS = [
  { name: 'portrait-phone', width: 390, height: 844, mobile: true },
  { name: 'landscape-phone', width: 844, height: 390, mobile: true },
  { name: 'tablet-landscape', width: 1024, height: 600, mobile: true }
];

const SCREENSHOT_TARGETS = {
  'portrait-phone': ['start', 'shiny', 'btlrandom', 'calc', 'savedit', 'builder'],
  'landscape-phone': ['start', 'shiny', 'btlrandom', 'calc', 'savedit', 'builder'],
  'tablet-landscape': ['start', 'calc']
};

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.bin': 'application/octet-stream'
};

function findBrowser() {
  const candidates = [
    process.env.CHROME_PATH,
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  ];
  return candidates.find(p => p && fs.existsSync(p));
}

function startServer() {
  return new Promise((resolve, reject) => {
    const srv = http.createServer((req, rsp) => {
      let reqPath = '/';
      try { reqPath = decodeURIComponent((req.url || '/').split('?')[0]); } catch (e) { reqPath = '/'; }
      if (reqPath === '/') reqPath = '/index.html';
      const filePath = path.resolve(WWW, '.' + reqPath);
      if (!filePath.startsWith(WWW) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        rsp.writeHead(404);
        return rsp.end('Not found');
      }
      rsp.writeHead(200, { 'Content-Type': MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream' });
      fs.createReadStream(filePath).pipe(rsp);
    });
    srv.on('error', reject);
    srv.listen(0, '127.0.0.1', () => resolve(srv));
  });
}

// Minimaler RFC-6455 WebSocket-Client (keine externen Abhängigkeiten, funktioniert ab Node 14+)
function connectWs(wsUrl) {
  return new Promise((resolve, reject) => {
    const u = new URL(wsUrl);
    const key = crypto.randomBytes(16).toString('base64');
    const sock = net.connect(Number(u.port), u.hostname, () => {
      sock.write(
        'GET ' + u.pathname + (u.search || '') + ' HTTP/1.1\r\n' +
        'Host: ' + u.host + '\r\n' +
        'Upgrade: websocket\r\n' +
        'Connection: Upgrade\r\n' +
        'Sec-WebSocket-Key: ' + key + '\r\n' +
        'Sec-WebSocket-Version: 13\r\n\r\n'
      );
    });

    let upgraded = false;
    let buf = Buffer.alloc(0);
    let fragBufs = [];
    const handlers = { message: [], close: [] };

    function emit(ev, arg) {
      handlers[ev].forEach(fn => { try { fn(arg); } catch (e) { /* ignore */ } });
    }

    function sendFrame(opcode, payloadBuf) {
      const len = payloadBuf.length;
      const mask = crypto.randomBytes(4);
      let header;
      if (len < 126) {
        header = Buffer.alloc(2);
        header[0] = 0x80 | opcode;
        header[1] = 0x80 | len;
      } else if (len < 65536) {
        header = Buffer.alloc(4);
        header[0] = 0x80 | opcode;
        header[1] = 0x80 | 126;
        header.writeUInt16BE(len, 2);
      } else {
        header = Buffer.alloc(10);
        header[0] = 0x80 | opcode;
        header[1] = 0x80 | 127;
        header.writeBigUInt64BE(BigInt(len), 2);
      }
      const masked = Buffer.alloc(len);
      for (let i = 0; i < len; i++) masked[i] = payloadBuf[i] ^ mask[i & 3];
      sock.write(Buffer.concat([header, mask, masked]));
    }

    function parseFrames() {
      while (buf.length >= 2) {
        const b0 = buf[0];
        const b1 = buf[1];
        const fin = (b0 & 0x80) !== 0;
        const opcode = b0 & 0x0f;
        const masked = (b1 & 0x80) !== 0;
        let len = b1 & 0x7f;
        let offset = 2;
        if (len === 126) {
          if (buf.length < 4) return;
          len = buf.readUInt16BE(2);
          offset = 4;
        } else if (len === 127) {
          if (buf.length < 10) return;
          len = Number(buf.readBigUInt64BE(2));
          offset = 10;
        }
        const maskLen = masked ? 4 : 0;
        if (buf.length < offset + maskLen + len) return;
        let payload = buf.subarray(offset + maskLen, offset + maskLen + len);
        if (masked) {
          const m = buf.subarray(offset, offset + 4);
          payload = Buffer.from(payload);
          for (let i = 0; i < payload.length; i++) payload[i] ^= m[i & 3];
        }
        buf = buf.subarray(offset + maskLen + len);

        if (opcode === 0x8) { // close
          sock.end();
          return;
        }
        if (opcode === 0x9) { // ping -> pong
          sendFrame(0xA, payload);
          continue;
        }
        if (opcode === 0xA) continue; // pong

        if (opcode === 0x1 || opcode === 0x2) {
          fragBufs = [payload];
        } else if (opcode === 0x0) {
          fragBufs.push(payload);
        }
        if (fin && fragBufs.length) {
          const full = Buffer.concat(fragBufs);
          fragBufs = [];
          emit('message', full.toString('utf8'));
        }
      }
    }

    sock.on('data', chunk => {
      buf = Buffer.concat([buf, chunk]);
      if (!upgraded) {
        const idx = buf.indexOf('\r\n\r\n');
        if (idx === -1) return;
        const head = buf.subarray(0, idx).toString('utf8');
        if (!/^HTTP\/1\.1 101 /i.test(head)) {
          sock.destroy();
          return reject(new Error('WebSocket handshake failed: ' + head.split('\r\n')[0]));
        }
        buf = buf.subarray(idx + 4);
        upgraded = true;
        resolve({
          send(str) { sendFrame(0x1, Buffer.from(str, 'utf8')); },
          on(ev, fn) { handlers[ev].push(fn); },
          close() { try { sock.destroy(); } catch (e) { /* ignore */ } }
        });
      }
      parseFrames();
    });

    sock.on('error', err => { if (!upgraded) reject(err); });
    sock.on('close', () => emit('close'));
  });
}

function httpGetJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, res => {
      let data = '';
      res.on('data', c => { data += c; });
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

function launchBrowser(exe) {
  return new Promise((resolve, reject) => {
    const prof = fs.mkdtempSync(path.join(os.tmpdir(), 'rl-android-ui-'));
    const proc = cp.spawn(exe, [
      '--headless=new',
      '--disable-gpu',
      '--no-sandbox',
      '--mute-audio',
      '--disable-dev-shm-usage',
      '--remote-debugging-port=0',
      '--user-data-dir=' + prof,
      '--window-size=390,844',
      'about:blank'
    ], { stdio: ['ignore', 'pipe', 'pipe'] });

    let stderr = '';
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        try { proc.kill(); } catch (e) { /* ignore */ }
        reject(new Error('Timeout beim Start von Headless-Edge. stderr: ' + stderr.slice(0, 300)));
      }
    }, 20000);

    proc.stderr.on('data', chunk => {
      stderr += chunk.toString('utf8');
      const m = /DevTools listening on (ws:\/\/[^\s]+)/.exec(stderr);
      if (m && !settled) {
        settled = true;
        clearTimeout(timer);
        const u = new URL(m[1]);
        resolve({ proc, prof, debugPort: Number(u.port), browserWs: m[1] });
      }
    });

    proc.on('exit', code => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        reject(new Error('Browser beendet vor DevTools-Start (Code ' + code + '): ' + stderr.slice(0, 300)));
      }
    });
  });
}

function createCdpClient(ws) {
  let seq = 0;
  const pending = new Map();
  const listeners = new Map();

  ws.on('message', raw => {
    let msg;
    try { msg = JSON.parse(raw); } catch (e) { return; }
    if (msg.id != null) {
      const p = pending.get(msg.id);
      if (p) {
        pending.delete(msg.id);
        if (msg.error) p.reject(new Error(msg.error.message || JSON.stringify(msg.error)));
        else p.resolve(msg.result);
      }
    } else if (msg.method) {
      const list = listeners.get(msg.method);
      if (list) list.forEach(fn => fn(msg.params));
    }
  });

  return {
    send(method, params) {
      return new Promise((resolve, reject) => {
        const id = ++seq;
        pending.set(id, { resolve, reject });
        ws.send(JSON.stringify({ id, method, params: params || {} }));
      });
    },
    on(method, fn) {
      if (!listeners.has(method)) listeners.set(method, []);
      listeners.get(method).push(fn);
    },
    async eval(expression, awaitPromise) {
      const r = await this.send('Runtime.evaluate', {
        expression,
        returnByValue: true,
        awaitPromise: !!awaitPromise
      });
      if (r && r.exceptionDetails) {
        const text = (r.exceptionDetails.exception && r.exceptionDetails.exception.description) ||
          r.exceptionDetails.text || 'JS-Ausnahme';
        throw new Error(text);
      }
      return r && r.result ? r.result.value : undefined;
    }
  };
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const exe = findBrowser();
  if (!exe) {
    console.log('SKIP: kein Chrome/Edge gefunden (CHROME_PATH setzen)');
    return;
  }
  if (!fs.existsSync(path.join(WWW, 'index.html'))) {
    console.error('FAIL: mobile/www/index.html fehlt — bitte zuerst "node mobile/build-web.js" ausführen.');
    process.exit(1);
  }

  const shotDir = process.env.RL_ANDROID_SCREENSHOT_DIR || '';
  if (shotDir) fs.mkdirSync(shotDir, { recursive: true });

  const srv = await startServer();
  const port = srv.address().port;
  const baseUrl = 'http://127.0.0.1:' + port + '/index.html';

  let browser = null;
  let ws = null;
  const failures = [];

  try {
    browser = await launchBrowser(exe);
    const targets = await httpGetJson('http://127.0.0.1:' + browser.debugPort + '/json/list');
    const pageTarget = targets.find(t => t.type === 'page' && t.webSocketDebuggerUrl);
    if (!pageTarget) throw new Error('Kein Page-Target in DevTools gefunden');

    ws = await connectWs(pageTarget.webSocketDebuggerUrl);
    const cdp = createCdpClient(ws);

    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');

    const runtimeErrors = [];
    cdp.on('Runtime.exceptionThrown', params => {
      const d = params && params.exceptionDetails;
      const msg = (d && d.exception && d.exception.description) || (d && d.text) || 'Unbekannte JS-Ausnahme';
      runtimeErrors.push(msg.split('\n')[0]);
    });

    // Fehler-Listener vor Seitenladung injizieren
    await cdp.send('Page.addScriptToEvaluateOnNewDocument', {
      source: `
        window.__RL_TEST_ERRORS = [];
        window.addEventListener('error', function (e) {
          window.__RL_TEST_ERRORS.push('error: ' + (e.message || e.error || 'unknown'));
        });
        window.addEventListener('unhandledrejection', function (e) {
          var r = e.reason;
          window.__RL_TEST_ERRORS.push('rejection: ' + (r && r.message ? r.message : String(r)));
        });
      `
    });

    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: VIEWPORTS[0].width,
      height: VIEWPORTS[0].height,
      deviceScaleFactor: 1,
      mobile: true
    });

    await cdp.send('Page.navigate', { url: baseUrl });

    // Warten bis App geladen & initialisiert ist
    let ready = false;
    for (let i = 0; i < 60; i++) {
      ready = await cdp.eval('Boolean(window.CC && typeof window.CC.showView === "function" && document.body && document.body.dataset.view)');
      if (ready) break;
      await sleep(150);
    }
    if (!ready) throw new Error('App wurde nicht rechtzeitig initialisiert');
    await sleep(300);

    // 1. Android-Flags & Desktop-only-Sperren prüfen
    const initCheck = await cdp.eval(`(function () {
      var res = {
        rlAndroid: !!window.RL_ANDROID,
        htmlClass: document.documentElement.classList.contains('rl-android'),
        hasSim: !!(window.RL_SIM && window.RL_SIM.battle && window.RL_SIM.meta),
        desktopVisible: [],
        desktopFallbackOk: true
      };
      var forbidden = ${JSON.stringify(DESKTOP_ONLY)};
      // Prüfen ob Desktop-only Karten oder Nav-Einträge sichtbar sind
      forbidden.forEach(function (id) {
        var sels = ['.card-' + id, '[data-view="' + id + '"]', '[data-tool="' + id + '"]'];
        sels.forEach(function (sel) {
          document.querySelectorAll(sel).forEach(function (el) {
            var cs = getComputedStyle(el);
            var r = el.getBoundingClientRect();
            if (cs.display !== 'none' && cs.visibility !== 'hidden' && r.width > 0 && r.height > 0) {
              res.desktopVisible.push(id + ':' + sel);
            }
          });
        });
        // Auch showView(id) muss auf start zurückfallen
        window.CC.showView(id);
        if (document.body.dataset.view === id) res.desktopFallbackOk = false;
      });
      window.CC.showView('start');
      return res;
    })()`);

    if (!initCheck.rlAndroid || !initCheck.htmlClass) {
      failures.push('Android-Flags fehlen (RL_ANDROID=' + initCheck.rlAndroid + ', .rl-android=' + initCheck.htmlClass + ')');
    }
    if (!initCheck.hasSim) {
      failures.push('window.RL_SIM (battle/meta) nicht vorhanden');
    }
    if (initCheck.desktopVisible.length) {
      failures.push('Desktop-only Tools sichtbar auf Android: ' + initCheck.desktopVisible.join(', '));
    }
    if (!initCheck.desktopFallbackOk) {
      failures.push('Desktop-only Tool konnte via CC.showView() geöffnet werden');
    }

    // 2. Echter Web-Worker-Aufruf im Browser (RL_SIM.meta.validate + RL_SIM.battle.start/forfeit)
    if (initCheck.hasSim) {
      const simRes = await cdp.eval(`(async function () {
        var pool = (window.RL_META_TEAMS && window.RL_META_TEAMS.teams) ? window.RL_META_TEAMS.teams.filter(function (t) { return t && t.paste; }) : [];
        if (pool.length < 2) return { validateOk: false, battleOk: false, error: 'RL_META_TEAMS fehlt' };
        var valA = await window.RL_SIM.meta.validate(pool[0].paste);
        var valB = await window.RL_SIM.meta.validate(pool[1].paste);
        var btl = null, forfeit = null;
        if (valA && valA.ok && valB && valB.ok) {
          btl = await window.RL_SIM.battle.start({
            pasteA: pool[0].paste,
            pasteB: pool[1].paste,
            level: 0,
            seed: '1,2,3,4',
            nameA: 'Du',
            nameB: 'KI'
          });
          if (btl && btl.ok) forfeit = await window.RL_SIM.battle.forfeit();
        }
        return {
          validateOk: !!(valA && valA.ok && valB && valB.ok),
          validateErr: (valA && valA.errors) || (valB && valB.errors) || null,
          battleOk: !!(btl && btl.ok),
          battleHasState: !!(btl && btl.view && (btl.view.request || (btl.view.log && btl.view.log.length))),
          battleErr: btl && (btl.error || btl.errors) ? (btl.error || btl.errors) : null,
          forfeitOk: !!(forfeit && forfeit.ok && forfeit.view && forfeit.view.ended)
        };
      })()`, true);

      if (!simRes || !simRes.validateOk) {
        failures.push('RL_SIM.meta.validate fehlgeschlagen: ' + JSON.stringify(simRes));
      }
      if (!simRes || !simRes.battleOk || !simRes.battleHasState || !simRes.forfeitOk) {
        failures.push('RL_SIM.battle.start/forfeit fehlgeschlagen: ' + JSON.stringify(simRes));
      } else {
        console.log('ok   Web-Worker RL_SIM (meta.validate + battle.start/forfeit)');
      }
    }

    // 3. Alle 3 Viewports × 21 Views (Startseite + 20 Android-Tools) prüfen
    for (const vp of VIEWPORTS) {
      await cdp.send('Emulation.setDeviceMetricsOverride', {
        width: vp.width,
        height: vp.height,
        deviceScaleFactor: 1,
        mobile: vp.mobile
      });
      await cdp.eval('window.dispatchEvent(new Event("resize")); window.dispatchEvent(new Event("orientationchange"));');
      await sleep(150);

      let vpBad = 0;

      for (const v of VIEWS) {
        const errBefore = runtimeErrors.length;
        const pageErrBefore = await cdp.eval('window.__RL_TEST_ERRORS.length');

        await cdp.eval('window.CC.showView(' + JSON.stringify(v) + ')');
        await sleep(220);

        const check = await cdp.eval(`(function (v) {
          var docEl = document.documentElement;
          var cur = document.body.dataset.view;
          var vw = window.innerWidth;
          var sw = docEl.scrollWidth;

          // Aktiven View-Container finden
          var map = {
            start: '#startView',
            calc: '#calcView',
            builder: '#builderView',
            match: '#matchView',
            speedtier: '#speedtierView',
            soullink: '#slView',
            nuz: '#nuzView',
            randomizer: '#randomizerView',
            savedit: '#saveView',
            godex: '#godexView',
            gocounter: '#gocounterView',
            goinfo: '#goinfoView',
            dex: '#dexView',
            catch: '#catchView',
            mgspeed: '#mgSpeedView',
            mgquiz: '#mgQuizView',
            mgdmg: '#mgDmgView',
            mgtype: '#mgTypeView',
            btlrandom: '#btlRandomView',
            btlchoice: '#btlChoiceView',
            shiny: '#shinyView'
          };
          var node = document.querySelector(map[v] || ('#' + v + 'View'));
          var visible = false, height = 0, width = 0, textLen = 0;
          if (node) {
            var cs = getComputedStyle(node);
            var r = node.getBoundingClientRect();
            visible = cs.display !== 'none' && cs.visibility !== 'hidden' && parseFloat(cs.opacity) > 0;
            height = Math.round(r.height);
            width = Math.round(r.width);
            textLen = (node.innerText || '').trim().length;
          }

          // Extra-Check für Battle-Stage (kein Höhen-Kollaps)
          var stageHeight = null;
          if ((v === 'btlrandom' || v === 'btlchoice') && node) {
            var st = node.querySelector('.btl-stage, .btl-arena, .btl-setup');
            if (st) stageHeight = Math.round(st.getBoundingClientRect().height);
          }

          // Extra-Check für Shiny-Zähler (kein Hotkeys & OBS Tab, Hunts/Sammlung vorhanden)
          var shinyInfo = null;
          if (v === 'shiny' && node) {
            var btns = Array.from(node.querySelectorAll('button, [role="tab"]'));
            var texts = btns.map(function (b) { return (b.textContent || '').trim(); });
            var hasHotkeysTab = btns.some(function (b) {
              var cs = getComputedStyle(b);
              var r = b.getBoundingClientRect();
              return /hotkeys\s*&\s*obs/i.test(b.textContent || '') && cs.display !== 'none' && r.width > 0 && r.height > 0;
            });
            var hasHunts = texts.some(function (t) { return /^hunts$/i.test(t); });
            var hasCollection = texts.some(function (t) { return /^(sammlung|collection)$/i.test(t); });
            shinyInfo = { hasHotkeysTab: hasHotkeysTab, hasHunts: hasHunts, hasCollection: hasCollection };
          }

          return {
            cur: cur,
            vw: vw,
            sw: sw,
            overflowPx: sw - vw,
            foundNode: !!node,
            visible: visible,
            height: height,
            width: width,
            textLen: textLen,
            stageHeight: stageHeight,
            shinyInfo: shinyInfo
          };
        })(${JSON.stringify(v)})`);

        const pageErrAfter = await cdp.eval('window.__RL_TEST_ERRORS.slice(' + pageErrBefore + ')');
        const newRuntime = runtimeErrors.slice(errBefore);

        if (newRuntime.length) {
          failures.push(vp.name + ' [' + v + ']: Runtime-Fehler: ' + newRuntime.join(' | '));
          vpBad++;
        }
        if (pageErrAfter && pageErrAfter.length) {
          failures.push(vp.name + ' [' + v + ']: Page-Fehler: ' + pageErrAfter.join(' | '));
          vpBad++;
        }
        if (check.cur !== v) {
          failures.push(vp.name + ' [' + v + ']: View nicht gewechselt (ist: ' + check.cur + ')');
          vpBad++;
        }
        if (!check.foundNode || !check.visible || check.height <= 0) {
          failures.push(vp.name + ' [' + v + ']: View nicht sichtbar oder Höhe 0 (found=' + check.foundNode + ', vis=' + check.visible + ', h=' + check.height + ')');
          vpBad++;
        }
        if (check.overflowPx > 2) {
          failures.push(vp.name + ' [' + v + ']: horizontaler Overflow (+' + check.overflowPx + 'px; scrollWidth=' + check.sw + ', innerWidth=' + check.vw + ')');
          vpBad++;
        }
        if (v === 'shiny' && check.shinyInfo) {
          if (check.shinyInfo.hasHotkeysTab) {
            failures.push(vp.name + ' [shiny]: Tab "Hotkeys & OBS" ist auf Android noch sichtbar');
            vpBad++;
          }
          if (!check.shinyInfo.hasHunts || !check.shinyInfo.hasCollection) {
            failures.push(vp.name + ' [shiny]: Hunts/Sammlung-Tabs fehlen (' + JSON.stringify(check.shinyInfo) + ')');
            vpBad++;
          }
        }

        // Shiny: Sammlung/Shiny-Dex & Counter einmalig im Portrait-Durchlauf funktional prüfen
        if (v === 'shiny' && vp.name === 'portrait-phone') {
          const shinyDeep = await cdp.eval(`(function () {
            var root = document.querySelector('#shinyView');
            if (!root) return { ok: false, reason: 'no #shinyView' };
            // 1. Sammlung-Tab anklicken und Shiny-Dex prüfen
            var tabs = Array.from(root.querySelectorAll('button'));
            var colBtn = tabs.find(function (b) { return /^(sammlung|collection)$/i.test((b.textContent || '').trim()); });
            var huntsBtn = tabs.find(function (b) { return /^hunts$/i.test((b.textContent || '').trim()); });
            var hasDexText = false;
            if (colBtn) {
              colBtn.click();
              hasDexText = /shiny-dex/i.test(root.innerText || '');
            }
            if (huntsBtn) huntsBtn.click();
            // 2. Falls noch kein Hunt existiert, neuen Hunt anlegen damit Counter sichtbar ist
            var plusBtn = root.querySelector('.sh-plus, button.sh-big');
            if (!plusBtn) {
              var newBtn = Array.from(root.querySelectorAll('button')).find(function (b) { return /neuer hunt|new hunt/i.test(b.textContent || ''); });
              if (newBtn) newBtn.click();
              plusBtn = root.querySelector('.sh-plus, button.sh-big');
            }
            var hasCounter = !!plusBtn && plusBtn.getBoundingClientRect().height > 0;
            return { ok: hasDexText && hasCounter, hasDexText: hasDexText, hasCounter: hasCounter };
          })()`);
          if (!shinyDeep || !shinyDeep.ok) {
            failures.push('portrait-phone [shiny]: Deep-Check fehlgeschlagen: ' + JSON.stringify(shinyDeep));
            vpBad++;
          }
        }

        // Optional: Screenshot speichern
        if (shotDir && SCREENSHOT_TARGETS[vp.name] && SCREENSHOT_TARGETS[vp.name].includes(v)) {
          await sleep(120);
          const shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
          const outFile = path.join(shotDir, vp.name + '_' + v + '.png');
          fs.writeFileSync(outFile, Buffer.from(shot.data, 'base64'));
        }
      }

      if (vpBad === 0) {
        console.log('ok   ' + vp.name + ' (' + vp.width + '×' + vp.height + '): ' + VIEWS.length + ' Ansichten geprüft');
      }
    }
  } finally {
    if (ws) ws.close();
    if (browser) {
      try { browser.proc.kill(); } catch (e) { /* ignore */ }
      try { fs.rmSync(browser.prof, { recursive: true, force: true }); } catch (e) { /* ignore */ }
    }
    srv.close();
  }

  if (failures.length) {
    console.error('\nFAIL (' + failures.length + ' Problem(e)):');
    failures.forEach(f => console.error('  - ' + f));
    process.exit(1);
  }
  console.log('Android-UI-Test OK');
})();

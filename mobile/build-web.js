// Baut mobile/www aus der Desktop-Web-App: gleiche Dateien wie im Electron-Paket (ohne Electron-Teil),
// plus den gebündelten Simulator-Web-Worker (sim_worker.js + sim_bridge.js) für Kämpfe und vollen Meta-Test,
// und css/mobile.css für Touch-Bedienung sowie Portrait- & Landscape-Layouts.
'use strict';

const fs = require('fs'), path = require('path');
const { buildSimWorker } = require('../tools/bundle-sim-web');

const root = path.join(__dirname, '..'), out = path.join(__dirname, 'www');

function copy(rel) {
  const src = path.join(root, rel), st = fs.statSync(src);
  if (st.isDirectory()) { fs.readdirSync(src).forEach((f) => copy(rel + '/' + f)); return; }
  const dst = path.join(out, rel);
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(src, dst);
}

async function main() {
  fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(out, { recursive: true });
  ['css', 'js', 'data', 'img'].forEach(copy);

  const workerRes = await buildSimWorker({ outfile: path.join(out, 'js', 'sim_worker.js') });

  let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const flag = '<script>window.RL_ANDROID = true; document.documentElement.classList.add("rl-android");' +
    ' try { if (!localStorage.getItem("cc_settings")) localStorage.setItem("cc_settings", JSON.stringify({ uiStyle: "studio" })); } catch (e) {}</script>';
  html = html.replace('<head>', '<head>\n  ' + flag +
    '\n  <script src="js/update_channel.js"></script>' +
    '\n  <script src="js/android_update.js"></script>' +
    '\n  <script src="js/sim_bridge.js"></script>');
  html = html.replace('<meta name="viewport" content="width=device-width, initial-scale=1">',
    '<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover">');
  html = html.replace('</head>', '  <link rel="stylesheet" href="css/mobile.css">\n  </head>');
  fs.writeFileSync(path.join(out, 'index.html'), html);
  console.log('mobile/www fertig (sim_worker.js: ' + (workerRes.size / 1048576).toFixed(2) + ' MiB)');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

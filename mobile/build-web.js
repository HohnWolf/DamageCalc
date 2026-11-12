// Baut mobile/www aus der Desktop-Web-App: gleiche Dateien wie im Electron-Paket (ohne Electron-Teil),
// plus ein Schalter, der die Werkzeuge aus 'Sonstiges' (Shiny-Zähler, Match-Overlay, Fangrechner) ausblendet,
// und css/mobile.css für Touch-Bedienung und schmale Bildschirme.
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), out = path.join(__dirname, 'www');
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
function copy(rel) {
  const src = path.join(root, rel), st = fs.statSync(src);
  if (st.isDirectory()) { fs.readdirSync(src).forEach((f) => copy(rel + '/' + f)); return; }
  const dst = path.join(out, rel);
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(src, dst);
}
['css', 'js', 'data', 'img'].forEach(copy);
let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const flag = '<script>window.RL_ANDROID = true; document.documentElement.classList.add("rl-android");' +
  ' try { if (!localStorage.getItem("cc_settings")) localStorage.setItem("cc_settings", JSON.stringify({ uiStyle: "studio" })); } catch (e) {}</script>';
html = html.replace('<head>', '<head>\n  ' + flag + '\n  <script src="js/update_channel.js"></script>\n  <script src="js/android_update.js"></script>'); // App-Update über GitHub-Releases (nur Android)
html = html.replace('<meta name="viewport" content="width=device-width, initial-scale=1">',
  '<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover">');
html = html.replace('</head>', '  <link rel="stylesheet" href="css/mobile.css">\n  </head>');
fs.writeFileSync(path.join(out, 'index.html'), html);
console.log('mobile/www fertig');

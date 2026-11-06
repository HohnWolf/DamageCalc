// Baut mobile/www aus der Desktop-Web-App: gleiche Dateien wie im Electron-Paket (ohne Simulator und Electron-Teil),
// plus ein Schalter, der die Werkzeuge aus 'Sonstiges' (Shiny-Zähler, Match-Overlay, Fangrechner) ausblendet.
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), out = path.join(__dirname, 'www');
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
function copy(rel) {
  const src = path.join(root, rel), st = fs.statSync(src);
  if (st.isDirectory()) { fs.readdirSync(src).forEach((f) => copy(rel + '/' + f)); return; }
  if (/^js\/sim_|^css\/sim\.css$|^data\/(meta_archetypes\.js|ai_weights\.json)$/.test(rel)) return;
  const dst = path.join(out, rel);
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(src, dst);
}
['css', 'js', 'data', 'img'].forEach(copy);
let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
html = html.replace('<head>', '<head>\n  <script>window.RL_ANDROID = true; document.documentElement.classList.add("rl-android");</script>');
fs.writeFileSync(path.join(out, 'index.html'), html);
console.log('mobile/www fertig');

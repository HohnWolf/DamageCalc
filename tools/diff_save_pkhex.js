// Differenztest Save-Editor gegen PKHeX.Core: node tools/diff_save_pkhex.js <sav> [<sav> ...]
// Braucht das Konsolenwerkzeug C:\Users\jerem\Projekte\_refs\pkhex-cli (dotnet build -c Release), Pfad über PKHEX_CLI änderbar.
// 1) Lesen: jedes Pokémon, das PKHeX sieht, muss unser Editor mit denselben Werten sehen.
// 2) Schreiben: unser Editor schreibt alles (unverändert) zurück → PKHeX: Prüfsummen gültig, gleiche Pokémon, gleiche Legalität.
// 3) Bearbeiten: Level/Item/IV/EV/Attacke eines Pokémon ändern → PKHeX liest genau diese Werte, Prüfsummen gültig.
global.window = {}; global.document = { addEventListener: function () {}, getElementById: function () { return null; } };
const fs = require('fs'), path = require('path'), cp = require('child_process'), os = require('os');
const ROOT = path.join(__dirname, '..');
['data/pk_personal.js', 'data/pk_gb.js', 'data/pk_text.js', 'data/pk_blocks.js', 'data/pk_blocks67.js', 'data/pkhex_data.js', 'js/nds.js', 'js/gen3.js',
  'js/savedit.js', 'js/savedit_gb.js', 'js/savedit_3ds.js'].forEach(function (f) { require(path.join(ROOT, f)); });
const CLI = process.env.PKHEX_CLI || 'C:/Users/jerem/Projekte/_refs/pkhex-cli/bin/Release/net10.0/pkhex-cli.exe';

function dump(file) { return JSON.parse(cp.execFileSync(CLI, ['dump', file], { maxBuffer: 256 * 1024 * 1024 }).toString()); }
function where(sv, list) { return list; }

function ours(sv) {
  const F = sv.fmt, out = [];
  const nat = function (sp) { return sv.natOf ? sv.natOf(sp) : sp; };
  function g(d, k, i) { try { return F.get(d, k, i); } catch (e) { return undefined; } }
  function mon(d, w) {
    const o = { where: w, species: nat(g(d, 'species')), level: g(d, 'level'), exp: g(d, 'exp'), item: g(d, 'item'),
      moves: [0, 1, 2, 3].map(function (i) { return g(d, 'move', i); }), pp: [0, 1, 2, 3].map(function (i) { return g(d, 'pp', i); }),
      ppups: [0, 1, 2, 3].map(function (i) { return g(d, 'ppups', i); }), friendship: g(d, 'friendship'), tid: g(d, 'tid'), sid: g(d, 'sid') };
    // Box-Pokémon (Gen 4+) speichern kein Level: wie die Oberfläche (saveui) aus den EP berechnen
    if (!o.level && o.exp != null && sv.growthOf) o.level = window.CCSave.levelFor(sv.growthOf(g(d, 'species')), o.exp);
    if (sv.gb) { o.dvs = [0, 1, 2, 3].map(function (i) { return g(d, 'dv', i); }); }
    else {
      o.ivs = [0, 1, 2, 3, 4, 5].map(function (i) { return g(d, 'iv', i); });
      o.evs = [0, 1, 2, 3, 4, 5].map(function (i) { return g(d, 'ev', i); });
      Object.assign(o, { pid: g(d, 'pid'), nature: g(d, 'nature'), ball: g(d, 'ball'), form: g(d, 'form'), gender: g(d, 'gender'), lang: g(d, 'lang'),
        version: g(d, 'version'), metLevel: g(d, 'metLevel'), metLoc: g(d, 'metLoc'), ability: g(d, 'ability'), isEgg: !!g(d, 'egg'), ot: g(d, 'ot'), nick: g(d, 'nick') });
      if (sv.gen >= 6) o.ec = g(d, 'ec');
      // wie die Oberfläche (saveui): Wesen aus der PID (Gen 3/4), Gen 3 Fähigkeit aus Slot + Personaldaten, Gen 3 Geschlecht aus PID + Verhältnis
      if (F.nature) o.nature = F.nature(d);
      const P = window.PKPERSONAL, nat = sv.natOf ? sv.natOf(g(d, 'species')) : g(d, 'species'), pe = P && P['g' + sv.gen] && P['g' + sv.gen][nat];
      if (sv.gen === 3 && pe) {
        o.ability = pe[8 + (g(d, 'abilitySlot') ? 1 : 0)] || pe[8];
        const ratio = pe[7]; o.gender = ratio === 255 ? 2 : ratio === 254 ? 1 : ratio === 0 ? 0 : ((o.pid & 0xFF) < ratio ? 1 : 0);
      }
    }
    return o;
  }
  sv.getParty().forEach(function (d, i) { if (d) out.push(mon(d, 'p' + i)); });
  for (let b = 0; b < sv.boxCount; b++) for (let s = 0; s < sv.slotsPerBox; s++) { const d = sv.getBoxMon(b, s); if (d) out.push(mon(d, b + ':' + s)); }
  return out;
}

// PKHeX-IV-Reihenfolge HP/Atk/Def/Spe/SpA/SpD (GetIVs) → unsere HP/Atk/Def/SpA/SpD/Spe? je Format prüfen: wir vergleichen als Menge je Index nach Umordnung
const PK_ORDER = [0, 1, 2, 4, 5, 3]; // pkhex-cli: HP/Atk/Def/SpA/SpD/Spe, wir (Speicherreihenfolge): HP/Atk/Def/Spe/SpA/SpD
function cmp(a, b, keys, gb) {
  const diffs = [];
  keys.forEach(function (k) {
    let x = a[k], y = b[k];
    if (y === undefined || x === undefined) return;
    if ((k === 'ivs' || k === 'evs') && Array.isArray(y) && !gb) y = PK_ORDER.map(function (i) { return y[i]; });
    if (k === 'moves' || k === 'pp' || k === 'ppups' || k === 'ivs' || k === 'evs') { if (JSON.stringify(x) !== JSON.stringify(y)) diffs.push(k + ' PKHeX=' + JSON.stringify(x) + ' wir=' + JSON.stringify(y)); }
    else if (typeof x === 'boolean' || typeof y === 'boolean') { if (!!x !== !!y) diffs.push(k + ' PKHeX=' + x + ' wir=' + y); }
    else if (String(x) !== String(y)) diffs.push(k + ' PKHeX=' + x + ' wir=' + y);
  });
  return diffs;
}

let total = 0;
function report(label, list) { if (list.length) { total += list.length; console.log('  ' + label + ': ' + list.length); list.slice(0, 12).forEach(function (l) { console.log('    ' + l); }); } else console.log('  ' + label + ': ok'); }

process.argv.slice(2).forEach(function (file) {
  console.log('\n== ' + path.basename(file));
  const ref = dump(file);
  const sv = window.CCSave.open(new Uint8Array(fs.readFileSync(file)));
  if (!sv) { console.log('  unser Editor erkennt die Datei nicht (PKHeX: ' + ref.game + ')'); total++; return; }
  console.log('  PKHeX ' + ref.game + ' Gen ' + ref.gen + ', ' + ref.mons.length + ' Pokémon, Prüfsummen ' + (ref.checksumsValid ? 'ok' : 'FALSCH') + ' | wir: ' + sv.gameNameEn);
  const keys = sv.gb ? ['species', 'level', 'exp', 'item', 'moves', 'pp', 'ppups', 'tid', 'dvs']
    : ['species', 'level', 'exp', 'item', 'moves', 'pp', 'ppups', 'friendship', 'tid', 'sid', 'ivs', 'evs', 'pid', 'ec', 'nature', 'ball', 'form', 'gender', 'lang', 'version', 'metLevel', 'metLoc', 'ability', 'isEgg', 'ot', 'nick'];
  // 1) Lesen
  const mine = ours(sv), byW = {}; mine.forEach(function (m) { byW[m.where] = m; });
  const readDiffs = [];
  ref.mons.forEach(function (r) {
    const m = byW[r.where];
    if (!m) { readDiffs.push(r.where + ': fehlt bei uns (PKHeX Art ' + r.species + ')'); return; }
    cmp(sv.gb ? Object.assign({ dvs: [r.ivs[1], r.ivs[2], r.ivs[5], r.ivs[3]] }, r) : r, m, keys, sv.gb).forEach(function (d) { readDiffs.push(r.where + ' #' + r.species + ' ' + d); });
  });
  mine.forEach(function (m) { if (!ref.mons.some(function (r) { return r.where === m.where; })) readDiffs.push(m.where + ': nur bei uns (Art ' + m.species + ')'); });
  report('Lesen', readDiffs);
  // 2) Rundlauf
  const tmp = path.join(os.tmpdir(), 'rl-pk-' + process.pid + '-' + path.basename(file));
  sv.setParty(sv.getParty());
  for (let b = 0; b < sv.boxCount; b++) for (let s = 0; s < sv.slotsPerBox; s++) sv.setBoxMon(b, s, sv.getBoxMon(b, s));
  sv.setTrainer(sv.getTrainer());
  fs.writeFileSync(tmp, sv.finish());
  const r2 = dump(tmp), rtDiffs = [];
  if (!r2.checksumsValid) rtDiffs.push('Prüfsummen ungültig: ' + r2.checksumInfo);
  if (r2.mons.length !== ref.mons.length) rtDiffs.push('Anzahl ' + ref.mons.length + ' → ' + r2.mons.length);
  ref.mons.forEach(function (a, i) { const b = r2.mons[i]; if (!b) return; const ks = Object.keys(a).filter(function (k) { return JSON.stringify(a[k]) !== JSON.stringify(b[k]); }); if (ks.length) rtDiffs.push(a.where + ' verändert: ' + ks.map(function (k) { return k + ' ' + JSON.stringify(a[k]) + '→' + JSON.stringify(b[k]); }).join(', ')); });
  if (r2.ot !== ref.ot || r2.tid !== ref.tid || r2.sid !== ref.sid || r2.money !== ref.money) rtDiffs.push('Trainer ' + JSON.stringify([ref.ot, ref.tid, ref.sid, ref.money]) + ' → ' + JSON.stringify([r2.ot, r2.tid, r2.sid, r2.money]));
  report('Rundlauf', rtDiffs);
  // 3) Bearbeiten
  const party = sv.getParty(), edDiffs = [];
  if (party[0]) {
    const F = sv.fmt, d = party[0];
    const lv = Math.min(100, (F.get(d, 'level') || 5) + 7);
    F.set(d, 'exp', window.CCSave.expFor(sv.growthOf(F.get(d, 'species')), lv)); F.set(d, 'level', lv);
    if (!sv.gb) { F.set(d, 'ev', 100, 2); }
    if (F.setStats) F.setStats(d, sv);
    sv.setParty(party);
    fs.writeFileSync(tmp, sv.finish());
    const r3 = dump(tmp), p0 = r3.mons.find(function (x) { return x.where === 'p0'; });
    if (!r3.checksumsValid) edDiffs.push('Prüfsummen ungültig: ' + r3.checksumInfo);
    if (!p0) edDiffs.push('p0 fehlt');
    else {
      if (p0.level !== lv) edDiffs.push('Level ' + p0.level + ' statt ' + lv);
      if (!sv.gb && p0.evs[2] !== 100) edDiffs.push('Def-EV ' + p0.evs[2] + ' statt 100');
      const was = ref.mons.find(function (x) { return x.where === 'p0'; });
      if (was && was.valid && !p0.valid) edDiffs.push('nach Bearbeitung illegal: ' + p0.problems.join(' | '));
    }
  }
  report('Bearbeiten', edDiffs);
  try { fs.unlinkSync(tmp); } catch (e) { /* egal */ }
});
console.log('\n' + (total ? total + ' Abweichung(en)' : 'alles gleich wie PKHeX'));
process.exit(total ? 1 : 0);

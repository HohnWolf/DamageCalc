// Erzeugt data/rival_tags.js aus den Konstanten des Universal Pokémon Randomizer ZX (GPL-3.0):
//   node tools/make_rival_tags.js <Pfad zu src/com/dabomstew/pkrandom/constants> data/rival_tags.js
// Je Spiel: Trainer-Nr. (Tabellenindex des Spiels) -> Tag "RIVALn-i" / "FRIENDn-i" (n = Kampf, i = Starter des Spielers, bei dem dieser Kampf vorkommt).
const fs = require('fs'), path = require('path');
const [dir, dst] = process.argv.slice(2);
const num = v => { v = v.trim(); return v.startsWith('0x') || v.startsWith('0X') ? parseInt(v, 16) : parseInt(v, 10); };
function body(file, method) {
  const src = fs.readFileSync(path.join(dir, file), 'utf8');
  const i = src.indexOf('public static void ' + method + '(');
  if (i < 0) throw new Error(method);
  const j = src.indexOf('\n    }\n', i);
  return src.slice(i, j);
}
// Nummer = Trainer-Nr. (UPR zieht 1 ab, weil seine Liste ab Trainer 1 beginnt; die Nummer ist der Tabellenindex im Spiel)
function parse(text) {
  const out = {}, put = (n, t) => { if (/^(RIVAL|FRIEND)\d+-[012]$/.test(t)) out[n] = t; };
  text.split('\n').forEach(line => {
    line = line.replace(/\/\/.*$/, '').trim();
    let m;
    if ((m = line.match(/^tag\(trs,\s*(0x[0-9a-fA-F]+|\d+),\s*"([^"]+)"\)/))) put(num(m[1]), m[2]);
    else if ((m = line.match(/^tag\(trs,\s*"([^"]+)",\s*([^)]*)\)/))) m[2].split(',').forEach(x => put(num(x), m[1]));
    else if ((m = line.match(/^tagRivalConsecutive\(trs,\s*"([^"]+)",\s*(0x[0-9a-fA-F]+|\d+)\)/))) { const o = num(m[2]); put(o, m[1] + '-0'); put(o + 1, m[1] + '-1'); put(o - 1, m[1] + '-2'); }
    else if ((m = line.match(/^tagFriendConsecutive\(trs,\s*"([^"]+)",\s*(0x[0-9a-fA-F]+|\d+)\)/))) { const o = num(m[2]); put(o, m[1] + '-1'); put(o + 1, m[1] + '-2'); put(o + 2, m[1] + '-0'); }
    else if ((m = line.match(/^tagFriendConsecutive2\(trs,\s*"([^"]+)",\s*(0x[0-9a-fA-F]+|\d+)\)/))) { const o = num(m[2]); put(o, m[1] + '-0'); put(o + 1, m[1] + '-1'); put(o + 2, m[1] + '-2'); }
    else if ((m = line.match(/^tagRivalBW\(trs,\s*"([^"]+)",\s*(0x[0-9a-fA-F]+|\d+)\)/))) { const o = num(m[2]); put(o, m[1] + '-0'); put(o + 1, m[1] + '-1'); put(o + 2, m[1] + '-2'); }
  });
  return out;
}
const tags = {
  RS: parse(body('Gen3Constants.java', 'trainerTagsRS')), E: parse(body('Gen3Constants.java', 'trainerTagsE')), FRLG: parse(body('Gen3Constants.java', 'trainerTagsFRLG')),
  DP: parse(body('Gen4Constants.java', 'tagTrainersDP')), Pt: parse(body('Gen4Constants.java', 'tagTrainersPt')), HGSS: parse(body('Gen4Constants.java', 'tagTrainersHGSS')),
  BW: parse(body('Gen5Constants.java', 'tagTrainersBW')), B2W2: parse(body('Gen5Constants.java', 'tagTrainersBW2'))
};
fs.writeFileSync(dst, '// Rivalen-/Freunde-Kämpfe je Spiel (Trainer-Nr. -> Tag) aus dem Universal Pokémon Randomizer ZX (GPL-3.0, Ajarmar). Erzeugt mit tools/make_rival_tags.js.\nwindow.RIVAL_TAGS = ' + JSON.stringify(tags) + ';\nif (typeof module !== \'undefined\') module.exports = window.RIVAL_TAGS;\n');
console.log(Object.keys(tags).map(k => k + ':' + Object.keys(tags[k]).length).join(' '));

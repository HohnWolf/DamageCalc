// Erzeugt data/godex.js (Pokémon-GO-Pokédex & Top-Counter-Daten) aus mgrann03/pokemon-resources (DialgaDex)
// ergänzt um alle Formen und Mega-Entwicklungen aus data/dex_gen1.js (window.DEX_ALL).
// Aufruf: node tools/build_godex.mjs [Ordner mit den heruntergeladenen JSON-Dateien]
import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = process.argv[2];
const JB_API = 'https://raw.githubusercontent.com/mgrann03/pokemon-resources/main/';

async function getJB(name) {
  if (dir && fs.existsSync(path.join(dir, name))) return JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));
  const r = await fetch(JB_API + name);
  if (!r.ok) throw new Error(name + ' ' + r.status);
  return r.json();
}

const w = {};
vm.runInNewContext(fs.readFileSync(path.join(root, 'data', 'dex_gen1.js'), 'utf8'), { window: w });
const DEX_ALL = w.DEX_ALL;

const [jbPkm, jbFm, jbCm, jbSpec] = await Promise.all([
  getJB('pogo_pkm.min.json'),
  getJB('pogo_fm.json'),
  getJB('pogo_cm.json'),
  getJB('pogo_pkm_manual_announced.json')
]);

// DialgaDex PatchSpeculative(true): angekündigte / kommende Pokémon-Updates anwenden
for (const patch of jbSpec) {
  const obj = jbPkm.find((e) => e.id === patch.id && e.form === patch.form);
  if (!obj) {
    jbPkm.push(patch);
    continue;
  }
  for (const k of Object.keys(patch)) {
    if (!['id', 'name', 'form'].includes(k)) obj[k] = patch[k];
  }
}

// Attacken-Tabellen (Index 0..4 kompatibel mit godex.js, Index 5+ für DialgaDex Top-Counter-Berechnung)
const fastList = [], chargedList = [], fastIx = {}, chargedIx = {};
function mvFast(o) {
  if (fastIx[o.name] != null) return fastIx[o.name];
  const t = o.name === 'Hidden Power' ? 'Normal' : o.type;
  fastList.push([o.name, t, o.power || 0, Math.abs(o.energy_delta || 0), o.duration || 500, o.damage_window_start || 0, o.id || 0]);
  return (fastIx[o.name] = fastList.length - 1);
}
function mvCharged(o) {
  if (chargedIx[o.name] != null) return chargedIx[o.name];
  chargedList.push([o.name, o.type, o.power || 0, Math.abs(o.energy_delta || 0), o.duration || 1000, o.damage_window_start || 0, o.mega_temp ? 1 : 0, o.id || 0]);
  return (chargedIx[o.name] = chargedList.length - 1);
}
const fastBy = {}; jbFm.forEach((m) => { fastBy[m.name] = m; });
const chargedBy = {}; jbCm.forEach((m) => { chargedBy[m.name] = m; });
const fi = (n) => (fastBy[n] ? mvFast(fastBy[n]) : -1);
const ci = (n) => (chargedBy[n] ? mvCharged(chargedBy[n]) : -1);
const ids = (arr, f) => [...new Set((arr || []).map(f).filter((i) => i >= 0))];

// Sicherstellen, dass Return, Aeroblast Plus/Plus Plus, Sacred Fire Plus/Plus Plus und alle Hidden-Power-Typen in den Tabellen sind
['Return', 'Aeroblast Plus', 'Aeroblast Plus Plus', 'Sacred Fire Plus', 'Sacred Fire Plus Plus'].forEach(ci);
jbFm.filter((m) => m.name.startsWith('Hidden Power')).forEach(mvFast);

const key = (id, form) => id + '|' + form;
const pkmBy = {};
jbPkm.forEach((p) => { pkmBy[key(p.id, p.form)] = p; });

// Offizielle Pokémon-GO-Umrechnungsformel aus den Hauptreihen-Basiswerten [kp, ang, vert, spAng, spVert, init]
function calcGoStats(bs, isMega) {
  const [hp, atk, def, spa, spd, spe] = bs;
  const speedMod = 1 + (spe - 75) / 500;
  const sAtk = Math.round(2 * (7 / 8 * Math.max(atk, spa) + 1 / 8 * Math.min(atk, spa)));
  const sDef = Math.round(2 * (5 / 8 * Math.max(def, spd) + 3 / 8 * Math.min(def, spd)));
  let bAtk = Math.round(sAtk * speedMod);
  let bDef = Math.round(sDef * speedMod);
  let bSta = Math.floor(hp * 1.75 + 50);
  if (!isMega) {
    const cpm40 = 0.7903;
    const maxCp40 = Math.floor((bAtk + 15) * Math.sqrt(bDef + 15) * Math.sqrt(bSta + 15) * cpm40 * cpm40 / 10);
    if (maxCp40 > 4000) {
      bAtk = Math.round(bAtk * 0.91);
      bDef = Math.round(bDef * 0.91);
      bSta = Math.round(bSta * 0.91);
    }
  }
  return [bAtk, bDef, bSta];
}

// Zuordnung von DEX_ALL-Formschlüsseln zu DialgaDex / pogo_pkm-Formnamen
const POGO_FORM_MAP = {
  '': ['Plant', 'Overcast', 'West_sea', 'Altered', 'Land', 'Red_striped', 'Standard', 'Spring', 'Incarnate', 'Ordinary', 'Aria', 'Meadow', 'Red', 'Natural', 'Average', 'Fifty_percent', 'Confined', 'Baile', 'Midday', 'Solo', 'Disguised', 'Amped', 'Phony', 'Ice', 'Male', 'Full_belly', 'Hero', 'Single_strike', 'Family_of_three', 'Green', 'Zero', 'Curly', 'Two', 'Counterfeit', 'Unremarkable', 'Normal', 'Shield'],
  'Alola': ['Alola'],
  'Galar': ['Galarian', 'Galarian_standard'],
  'Galar-Zen': ['Galarian_zen'],
  'Hisui': ['Hisuian'],
  'Paldea': ['Paldea'],
  'Paldea-Combat': ['Paldea_combat'],
  'Paldea-Blaze': ['Paldea_blaze'],
  'Paldea-Aqua': ['Paldea_aqua'],
  'Sunny': ['Sunny'],
  'Rainy': ['Rainy'],
  'Snowy': ['Snowy'],
  'Attack': ['Attack'],
  'Defense': ['Defense'],
  'Speed': ['Speed'],
  'Sandy': ['Sandy'],
  'Trash': ['Trash'],
  'Sunshine': ['Sunny'],
  'Heat': ['Heat'],
  'Wash': ['Wash'],
  'Frost': ['Frost'],
  'Fan': ['Fan'],
  'Mow': ['Mow'],
  'Origin': ['Origin'],
  'Sky': ['Sky'],
  'Blue-Striped': ['Blue_striped'],
  'White-Striped': ['White_striped'],
  'Zen': ['Zen'],
  'Therian': ['Therian'],
  'Black': ['Black'],
  'White': ['White'],
  'Resolute': ['Resolute'],
  'Pirouette': ['Pirouette'],
  'Douse': ['Douse'],
  'Shock': ['Shock'],
  'Burn': ['Burn'],
  'Chill': ['Chill'],
  'F': ['Female'],
  'Blade': ['Blade'],
  'Small': ['Small'],
  'Large': ['Large'],
  'Super': ['Super'],
  '10%': ['Ten_percent', 'Complete_ten_percent'],
  'Complete': ['Complete'],
  'Unbound': ['Unbound'],
  'Pom-Pom': ['Pompom'],
  "Pa'u": ['Pau'],
  'Sensu': ['Sensu'],
  'Dusk': ['Dusk'],
  'Midnight': ['Midnight'],
  'School': ['School'],
  'Meteor': ['Meteor'],
  'Busted': ['Busted'],
  'Dusk-Mane': ['Dusk_mane'],
  'Dawn-Wings': ['Dawn_wings'],
  'Ultra': ['Ultra'],
  'Low-Key': ['Low_key'],
  'Noice': ['Noice'],
  'Hangry': ['Hangry'],
  'Crowned': ['Crowned_sword', 'Crowned_shield'],
  'Eternamax': ['Eternamax'],
  'Rapid-Strike': ['Rapid_strike'],
  'Ice': ['Ice_rider'],
  'Shadow': ['Shadow_rider'],
  'Four': ['Family_of_four'],
  'Blue': ['Blue'],
  'Yellow': ['Yellow'],
  'Hero': ['Hero'],
  'Droopy': ['Droopy'],
  'Stretchy': ['Stretchy'],
  'Three-Segment': ['Three'],
  'Roaming': ['Coin_a1'],
  'Mega': ['Mega'],
  'Mega-X': ['Mega'],
  'Mega-Y': ['MegaY'],
  'Mega-Z': ['MegaZ'],
  'Primal': ['Mega']
};

function findPogoEntry(num, forme) {
  const cands = POGO_FORM_MAP[forme] || [forme];
  for (const c of cands) {
    if (num === 964 && forme === '' && c === 'Hero') continue;
    if (pkmBy[key(num, c)]) return pkmBy[key(num, c)];
  }
  return null;
}

function findBaseEntry(num) {
  const e = findPogoEntry(num, '');
  if (e) return e;
  return jbPkm.find((x) => x.id === num) || null;
}

const out = [];
for (let num = 1; num < DEX_ALL.length; num++) {
  const d = DEX_ALL[num];
  if (!d) continue;
  const baseEntry = findBaseEntry(num);

  // Sortiere Formen so, dass Normal ('') zuerst kommt, dann Regional-/Spezialformen, dann Mega/Proto am Ende
  const formsOrdered = [...d.forms].sort((a, b) => {
    const rank = (f) => f.forme === '' ? 0 : (f.forme.startsWith('Mega') || f.forme === 'Primal') ? 2 : 1;
    return rank(a) - rank(b);
  });

  for (const f of formsOrdered) {
    const isMega = f.forme.startsWith('Mega') || f.forme === 'Primal';
    const pe = findPogoEntry(num, f.forme);

    let bAtk, bDef, bSta, fTypes, fmArr, cmArr, efmArr, ecmArr, tempCmArr, flags, raidTier, pogoForm;
    if (pe && pe.stats && pe.stats.baseAttack) {
      bAtk = pe.stats.baseAttack;
      bDef = pe.stats.baseDefense;
      bSta = pe.stats.baseStamina;
      fTypes = pe.types || f.types;
      fmArr = pe.fm || (baseEntry && baseEntry.fm) || [];
      cmArr = pe.cm || (baseEntry && baseEntry.cm) || [];
      efmArr = pe.elite_fm || [];
      ecmArr = pe.elite_cm || [];
      tempCmArr = pe.temp_cm || [];
      flags = (pe.shadow ? 1 : 0) | (pe.released ? 2 : 0) | (pe.class ? 4 : 0) | 8;
      raidTier = pe.raid_tier || 0;
      pogoForm = pe.form;
    } else {
      [bAtk, bDef, bSta] = calcGoStats(f.bs, isMega);
      fTypes = f.types;
      fmArr = (baseEntry && baseEntry.fm) || [];
      cmArr = (baseEntry && baseEntry.cm) || [];
      efmArr = (baseEntry && baseEntry.elite_fm) || [];
      ecmArr = (baseEntry && baseEntry.elite_cm) || [];
      tempCmArr = [];
      flags = ((baseEntry && baseEntry.class) ? 4 : 0);
      raidTier = isMega ? 4 : ((baseEntry && baseEntry.raid_tier) || 0);
      pogoForm = f.forme || 'Normal';
    }

    out.push([
      num,
      d.nameEn,
      f.forme,
      fTypes,
      bAtk,
      bDef,
      bSta,
      ids(fmArr, fi),
      ids(cmArr, ci),
      ids(efmArr, fi),
      ids(ecmArr, ci),
      flags,
      raidTier,
      ids(tempCmArr, ci),
      pogoForm
    ]);

    // Spezialfälle aus GO / DialgaDex direkt nach der Normalform ergänzen:
    // #150 Rüstungs-Mewtu ('A'), #249 Apex-Lugia ('S'), #250 Apex-Ho-Oh ('S')
    if (f.forme === '') {
      for (const extraForm of ['A', 'S']) {
        if ((num === 150 && extraForm === 'A') || ((num === 249 || num === 250) && extraForm === 'S')) {
          const ex = pkmBy[key(num, extraForm)];
          if (ex && ex.stats) {
            out.push([
              num,
              d.nameEn,
              extraForm,
              ex.types || f.types,
              ex.stats.baseAttack,
              ex.stats.baseDefense,
              ex.stats.baseStamina,
              ids(ex.fm, fi),
              ids(ex.cm, ci),
              ids(ex.elite_fm, fi),
              ids(ex.elite_cm, ci),
              (ex.shadow ? 1 : 0) | (ex.released ? 2 : 0) | (ex.class ? 4 : 0) | 8,
              ex.raid_tier || 5,
              ids(ex.temp_cm, ci),
              extraForm
            ]);
          }
        }
      }
    }
  }
  // Mega-Formen aus DialgaDex, die in DEX_ALL (noch) nicht als eigene Form stehen (#678 Mega-Psiaugon, #978 Mega-Nigiragi)
  if (!d.forms.some((x) => x.forme.startsWith('Mega') || x.forme === 'Primal') && pkmBy[key(num, 'Mega')]) {
    const ex = pkmBy[key(num, 'Mega')];
    if (ex && ex.stats) {
      out.push([
        num,
        d.nameEn,
        'Mega',
        ex.types || d.forms[0].types,
        ex.stats.baseAttack,
        ex.stats.baseDefense,
        ex.stats.baseStamina,
        ids(ex.fm, fi),
        ids(ex.cm, ci),
        ids(ex.elite_fm, fi),
        ids(ex.elite_cm, ci),
        (ex.shadow ? 1 : 0) | (ex.released ? 2 : 0) | (ex.class ? 4 : 0) | 8,
        ex.raid_tier || 4,
        ids(ex.temp_cm, ci),
        'Mega'
      ]);
    }
  }
}

const js = '// Pokémon-GO-Pokédex- & Top-Counter-Daten. Erzeugt von tools/build_godex.mjs aus mgrann03/pokemon-resources (DialgaDex) & DEX_ALL\n' +
  'window.GODEX = ' + JSON.stringify({
    cpm: { 15: 0.51739395, 20: 0.5974, 25: 0.667934, 30: 0.7317, 35: 0.76156384, 40: 0.7903, 50: 0.84029999 },
    fast: fastList, charged: chargedList, mons: out
  }) + ';\n';
fs.writeFileSync(path.join(root, 'data', 'godex.js'), js);
console.log('mons', out.length, 'fast', fastList.length, 'charged', chargedList.length, 'bytes', js.length);

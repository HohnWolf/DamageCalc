// Damage Calc → Teambuilder: das bearbeitete Pokémon landet im cc_builder-Format.
const fs = require('fs'), path = require('path');
const adopt = require('../js/builder_adopt');
const pkg = require('../package.json');
let bad = 0;
const ok = (m) => console.log('ok   ' + m);
const fail = (m) => { bad++; console.log('FAIL ' + m); };
const eq = (a, b, m) => (a === b ? ok(m) : fail(m + ' (ist ' + JSON.stringify(a) + ', soll ' + JSON.stringify(b) + ')'));

function mon(extra) {
  return {
    species: 'Incineroar',
    setName: 'Offensiv',
    set: Object.assign({
      sps: { hp: 30, at: 5, df: 30, sa: 0, sd: 0, sp: 1 },
      nature: 'Adamant', ability: 'Intimidate', item: 'Sitrus Berry',
      moves: ['Fake Out', 'Flare Blitz', 'Parting Shot', '(No Move)'],
      forme: 'Incineroar'
    }, extra || {})
  };
}
function store() {
  const old = {
    species: 'Incineroar', setName: 'Alt',
    set: { species: 'Incineroar', nature: 'Hardy', ability: 'Intimidate', item: '(none)', gender: 'M', shiny: true, look: 'Incineroar', sps: { hp: 0, at: 0, df: 0, sa: 0, sd: 0, sp: 0 }, moves: ['Protect'] }
  };
  const other = {
    species: 'Rillaboom', setName: 'Support',
    set: { species: 'Rillaboom', nature: 'Adamant', ability: 'Grassy Surge', item: 'Assault Vest', sps: { hp: 0, at: 32, df: 0, sa: 0, sd: 0, sp: 0 }, moves: ['Grassy Glide'] }
  };
  const v2mons = [JSON.parse(JSON.stringify(old))];
  return {
    cur: 't1',
    teams: [{
      id: 't1', name: 'Mein Team', mons: [old, other],
      curVer: 'v1',
      versions: [
        { id: 'v1', name: 'v1', mons: null },
        { id: 'v2', name: 'Turnier', mons: v2mons }
      ]
    }]
  };
}
let n = 0;
const ids = function () { n += 1; return 'id' + n; };
const s0 = store();
s0.teams[0].versions[0].mons = s0.teams[0].mons;
const updated = adopt.apply(s0, mon(), { mode: 'update', teamId: 't1', index: 0 }, { id: ids });
eq(updated.ok, true, 'gleiches Pokémon wird aktualisiert');
eq(s0.teams[0].mons[0].set.nature, 'Adamant', 'Wesen kommt aus dem Damage Calc');
eq(s0.teams[0].mons[0].set.sps.hp, 30, 'Stat Points kommen aus dem Damage Calc');
eq(s0.teams[0].mons[0].set.item, 'Sitrus Berry', 'Item kommt aus dem Damage Calc');
eq(s0.teams[0].mons[0].set.moves.join(','), 'Fake Out,Flare Blitz,Parting Shot', 'leere Attacke fällt weg');
eq(s0.teams[0].mons[0].setName, 'Alt', 'Set-Name des Teams bleibt');
eq(s0.teams[0].mons[0].set.gender, 'M', 'Geschlecht bleibt beim Aktualisieren');
eq(s0.teams[0].mons[0].set.shiny, true, 'Shiny bleibt beim Aktualisieren');
eq(s0.teams[0].versions[1].mons[0].set.nature, 'Hardy', 'andere Version bleibt unverändert');
eq(s0.teams[0].mons[1].species, 'Rillaboom', 'anderes Pokémon bleibt');

const added = adopt.apply(s0, mon({ species: 'Gholdengo' }) && Object.assign(mon(), { species: 'Gholdengo', setName: 'Special' }), { mode: 'add', teamId: 't1' }, { id: ids });
eq(added.ok && s0.teams[0].mons.length, 3, 'freier Slot nimmt das Pokémon auf');
eq(s0.teams[0].mons[2].species, 'Gholdengo', 'neues Pokémon hat die Art');
eq(s0.teams[0].mons[2].setName, 'Special', 'neues Pokémon behält den Set-Namen');

s0.teams[0].mons.push({ species: 'A', setName: 'Set', set: {} }, { species: 'B', setName: 'Set', set: {} }, { species: 'C', setName: 'Set', set: {} });
eq(s0.teams[0].mons.length, 6, 'Team hat sechs Plätze');
const full = adopt.apply(s0, mon(), { mode: 'add', teamId: 't1' }, { id: ids });
eq(full.ok, false, 'volles Team nimmt kein siebtes Pokémon');
eq(full.error, 'full', 'voller Slot meldet full');
const replaced = adopt.apply(s0, Object.assign(mon(), { species: 'Talonflame', setName: 'Gale' }), { mode: 'replace', teamId: 't1', index: 1 }, { id: ids });
eq(replaced.ok, true, 'ein belegter Slot kann ersetzt werden');
eq(s0.teams[0].mons[1].species, 'Talonflame', 'ersetzter Slot hat die neue Art');
eq(s0.cur, 't1', 'das gewählte Team bleibt aktuell');

const fresh = { teams: [], cur: null };
const created = adopt.apply(fresh, mon(), { mode: 'new', name: 'Team 2' }, { id: ids });
eq(created.ok, true, 'neues Team wird angelegt');
eq(fresh.teams[0].name, 'Team 2', 'neues Team hat den Namen');
eq(fresh.teams[0].mons[0].set.ability, 'Intimidate', 'neues Team enthält Fähigkeit und Werte');
eq(fresh.teams[0].versions[0].mons, fresh.teams[0].mons, 'aktuelle Version teilt sich die Pokémon-Liste');
eq(fresh.cur, fresh.teams[0].id, 'das neue Team ist ausgewählt');

const mega = mon();
mega.set.item = 'Incineroarite';
mega.set.forme = 'Mega Incineroar';
eq(adopt.cleanSet(mega).forme, undefined, 'Mega-Form kommt über den Stein, nicht als feste Form');
eq(adopt.sameSpecies({ species: 'Rotom-Heat' }, 'Rotom', function (s) { return s.replace(/-.*/, ''); }), true, 'gleiche Basisart zählt als Treffer');

const app = fs.readFileSync(path.join(__dirname, '..', 'js/app.js'), 'utf8');
const builder = fs.readFileSync(path.join(__dirname, '..', 'js/builder.js'), 'utf8');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
if (!app.includes('toBuilder') || !app.includes("tbFromCalc: 'In Teambuilder übernehmen'")) fail('Knopf oder deutscher Text fehlt im Damage Calc');
else ok('Knopf „In Teambuilder übernehmen“ ist verdrahtet');
if (!builder.includes('takeFromCalc') || !builder.includes('RLBuilderAdopt')) fail('Teambuilder übernimmt das Pokémon nicht');
else ok('Teambuilder schreibt ins bestehende Team');
if (!html.includes('js/builder_adopt.js')) fail('Übernahme-Skript fehlt in der Seite');
else ok('Übernahme-Skript wird geladen');

const vp = pkg.version.split('-')[0].split('.').map(function (x) { return parseInt(x, 10) || 0; });
const code = vp[0] * 10000 + vp[1] * 100 + vp[2];
eq(pkg.version, '1.25.1', 'App-Version 1.25.1');
eq(code, 12501, 'Android versionCode 12500');
const gradle = fs.readFileSync(path.join(__dirname, '..', 'mobile/android/app/build.gradle'), 'utf8');
if (!gradle.includes('versionName appVersion') || !gradle.includes('versionCode appVersionCode') || !gradle.includes("parse(file('../../../package.json'))")) fail('Android-Version kommt nicht aus der package.json');
else ok('Android versionName folgt der package.json');

if (bad) { console.log(bad + ' Problem(e)'); process.exit(1); }
console.log('Teambuilder-Übernahme OK');

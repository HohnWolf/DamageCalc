// Parser-Fälle aus den echten OCR-Zeilen, plus der Frame-Harness (Szenen, OCR, Ground Truth).
const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const Lex = require('../js/matchlog_lexicon');
const Parse = require('../js/matchlog_parse');
const lists = require('./matchlog_lists');

let failed = 0;
function eq(name, got, want) {
  const g = JSON.stringify(got), w = JSON.stringify(want);
  if (g !== w) { failed++; console.error('FAIL', name, '\n  got ', g, '\n  want', w); }
  else console.log('ok  ', name);
}

const lex = Lex.build(lists.load(path.join(__dirname, '..')));
function ev(line, hint) { return Parse.parse(line, lex, hint || ''); }

eq('fake out', ev('Raichu used Fake Out!').move, 'Fake Out');
eq('follow me noisy', ev('The opposing Clefable used Fllow Me!').move, 'Follow Me');
eq('rising', ev('Raichu used Rising Voltage!').move, 'Rising Voltage');
eq('sing not a move', ev('The opposing Clefable used Follow Me!').move, 'Follow Me');
eq('mega', ev('Raichu as Mega evolved into Mega Raichu!').mon, 'Raichu');
eq('flinch', ev("The opposing Blastoisefinched and couldn't move").kind, 'flinch');
eq('faint noisy', ev('The opposing Clefablefinted!').kind, 'faint');
eq('send foe', ev('The Tainersent out Blastoiseand Clefable!').mons.join(','), 'Blastoise,Clefable');
eq('send you', ev('Gol Raichu and Espathral').side, 'you');
eq('terrain', ev('Anelectricrent ranacros the batlfield').field, 'Electric Terrain');
eq('defense', ev('Espathras Defens rose!').stat, 'def');
eq('floette', ev('Eloette', 'team_name').mon, 'Floette');
eq('raichu dotless', ev('Raıchu', 'team_name').mon, 'Raichu');
eq('de move', ev('Raichu setzt Mogelhieb ein!').move, 'Fake Out');
eq('de forfeit', ev('Gegner gibt auf.').kind, 'forfeit');
eq('de faint', ev('Turtok wurde besiegt!').kind, 'faint');
eq('de send', ev('Los! Raichu und Floette!').mons[0], 'Raichu');

if (failed) { console.error(failed + ' parser checks failed'); process.exit(1); }

if (process.argv.indexOf('--no-harness') >= 0) {
  console.log('parser ok');
  process.exit(0);
}

const r = cp.spawnSync(process.execPath, [path.join(__dirname, 'matchlog_harness.js')], {
  encoding: 'utf8', timeout: 120000, maxBuffer: 16 * 1024 * 1024
});
process.stdout.write(r.stdout || '');
process.stderr.write(r.stderr || '');
if (r.status !== 0) { console.error('harness exit', r.status); process.exit(r.status || 1); }
const m = (r.stdout || '').match(/(\d+)\/18 Ereignisse/);
if (!m || +m[1] < 12) { console.error('harness erkannte zu wenig:', m && m[0]); process.exit(1); }
console.log('Matchlog-Test ok (' + m[0] + ')');

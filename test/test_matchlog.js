// Parser-Fälle aus den echten OCR-Zeilen, plus der Frame-Harness (Szenen, OCR, Ground Truth).
const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const Lex = require('../js/matchlog_lexicon');
const Parse = require('../js/matchlog_parse');
const State = require('../js/matchlog_state');
const Format = require('../js/matchlog_format');
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

// Echte Live-Capture-Fehlerfälle aus matchlog.json:
eq('empty send ignored', ev('LOS PM = 1 Ae'), null);
eq('posing typo is foe', ev('It’s not very effective on the “posing Pelip, 7').side, 'foe');
eq('mega swampert no starmie', ev('Tne opposing Swampert has Mega Evolved int Mega Swampert!').mon, 'Swampert');
eq('withdraw without you is neutral', ev('< GS withdrew Pelipper!').side, '');

// State-Checks: Leads bleiben, keine leeren Turns, max 2 Choices, side über eigenes Team:
(function () {
  const st = State.create();
  ['Rillaboom', 'Goodra', 'Raichu', 'Floette', 'Arcanine', 'Basculegion'].forEach((sp, i) => State.noteTeamRow(st, i, sp, ''));
  State.noteText(st, 'battle', 'Go Arcanine and Rillaboom!', ev('Go Arcanine and Rillaboom!'), 1);
  State.noteText(st, 'battle', 'Go! Arcenine ard Rillahoom!', ev('Go! Arcenine ard Rillahoom!'), 1.5);
  eq('dedup reordered send_out', st.turns[0].events.length, 1);
  eq('leads set once', st.leads.you, ['you:Arcanine', 'you:Rillaboom']);
  State.onScene(st, 'command');
  State.onScene(st, 'battle');
  State.onScene(st, 'command'); // leerer Turn dazwischen darf turnN nicht erhöhen
  eq('no empty turn bump', st.turnN, 1);
  State.noteText(st, 'battle', '< GS withdrew Pelipper!', ev('< GS withdrew Pelipper!'), 2);
  eq('withdraw foe resolved via team', st.turns[1].events[0].side, 'foe');
  State.noteText(st, 'battle', 'Go! Basculegion!', ev('Go! Basculegion!'), 3);
  eq('leads preserved after switch', st.leads.you, ['you:Arcanine', 'you:Rillaboom']);

  // Neue Events + kompaktes Format:
  eq('protect event', ev('Espathra protected itself!').kind, 'protect');
  eq('knock off event', ev("The opposing Krookodile knocked off Espathra's Electric Seed!").item, 'Electric Seed');
  eq('recoil event', ev('Basculegion was damaged by the recoil!').kind, 'recoil');
  eq('snow event', ev('It started to snow!').field, 'Snow');

  const st2 = State.create();
  State.onScene(st2, 'command');
  State.onScene(st2, 'battle');
  State.noteText(st2, 'battle', 'Krookodile used Earthquake!', ev('The opposing Krookodile used Earthquake!'), 10);
  State.noteText(st2, 'battle', 'Espathra protected itself!', ev('Espathra protected itself!'), 10.5);
  State.noteText(st2, 'battle', "It doesn't affect the opposing Noivern", ev("It doesn't affect the opposing Noivern"), 11);
  State.noteText(st2, 'battle', 'The opposing Noivern withdrew!', ev('The opposing Noivern withdrew!'), 12);
  State.noteText(st2, 'battle', 'Opponent sent out Gholdengo!', ev('Opponent sent out Gholdengo!'), 12.5);
  const rendered = Format.render(State.exportSnap(st2));
  eq('compact move outcomes', rendered.includes('Krookodile Earthquake -> Espathra protected, Noivern isnt affected'), true);
  eq('compact switch into', rendered.includes('Enemy Noivern switch into Gholdengo'), true);

  // Flackern von command in play-Phase, Trick->Trick Room Präfix, redundantes field:
  const st3 = State.create();
  State.onScene(st3, 'command');
  State.onScene(st3, 'battle');
  State.noteText(st3, 'battle', 'Banette used Trick!', ev('Banette used Trick!'), 1);
  State.noteText(st3, 'battle', 'Banette used Trick Room!', ev('Banette used Trick Room!'), 1.3);
  State.noteText(st3, 'battle', 'Banette twisted the dimensions!', ev('Trick Room'), 1.6);
  State.onScene(st3, 'command'); // 1-Frame-Flackern mitten in der Animation
  State.onScene(st3, 'battle');
  eq('1-frame command flicker keeps turnN', st3.turnN, 1);
  eq('trick upgraded to trick room without dup', st3.turns[0].events.map(e => e.move || e.field), ['Trick Room']);

  // Mega Raichu Y über Team-Item, oppcsing, battle->move_select->Turn 2, kein Teil-send_out-Duplikat:
  const st4 = State.create();
  ['Rillaboom', 'Goodra', 'Raichu', 'Floette', 'Arcanine', 'Basculegion'].forEach((sp, i) => {
    State.noteTeamRow(st4, i, sp, sp === 'Raichu' ? 'Raichunite Y' : '');
  });
  State.noteText(st4, 'battle', 'Go Arcanine and Raichu!', ev('Go Arcanine and Raichu!'), 1);
  State.onScene(st4, 'command');
  State.onScene(st4, 'battle');
  State.noteText(st4, 'battle', 'Gol - canine and Raichu!', ev('Gol - canine and Raichu!'), 1.5);
  State.noteText(st4, 'battle', 'Raichu has Mega Evolved into Mega Raichu!', ev('Raichu has Mega Evolved into Mega Raichu!'), 2);
  State.noteText(st4, 'battle', 'The oppcsing Azumarill used Aqua Jet!', ev('The oppcsing Azumarill used Aqua Jet!'), 3);
  State.onScene(st4, 'move_select'); // 1. Flacker-Frame darf noch nicht hochzählen
  eq('1-frame move_select flicker keeps turnN', st4.turnN, 1);
  State.onScene(st4, 'move_select'); // 2. stabiler Menü-Frame startet Turn 2
  eq('move_select stable bumps turnN', st4.turnN, 2);
  eq('mega raichu y from stone', st4.turns[1].events[0].into, 'Mega Raichu Y');
  eq('oppcsing is foe', st4.turns[1].events[1].side, 'foe');
})();

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

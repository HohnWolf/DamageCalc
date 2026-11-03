// Self-Play Match Generator and Dataset Collector for VGC 2026 Reg M-C
const fs = require('fs');
const path = require('path');
const { BattleStreams, Teams, Dex } = require('@pkmn/sim');
const { extractStateFeatures, extractActionFeatures, extractJointFeatures, getTypeEff } = require('./features.js');

// Register champions mod
Dex.mod('champions', {
  Scripts: {
    statModify(baseStats, set, statName) {
      const tr = this.trunc;
      let stat = baseStats[statName];
      const sp = set.evs ? (set.evs[statName] || 0) : 0;
      if (statName === 'hp') return stat + sp + 75;
      stat = stat + sp + 20;
      const nature = this.dex.natures.get(set.nature);
      if (nature.plus === statName) stat = tr(tr(stat * 110, 16) / 100);
      else if (nature.minus === statName) stat = tr(tr(stat * 90, 16) / 100);
      return stat;
    },
    actions: {
      canTerastallize() { return null; },
      canMegaEvo(pokemon) {
        const species = pokemon.baseSpecies;
        const item = pokemon.getItem();
        return item.megaStone?.[species.name] || null;
      }
    }
  }
});

Dex.formats.extend([{
  name: '[Gen 9 Champions] VGC 2026 Reg M-C',
  mod: 'champions',
  gameType: 'doubles',
  ruleset: ['Flat Rules', 'NatDex Mod'],
}]);

// Teams to train on
const team1Paste = `Espathra @ Colbur Berry
Ability: Speed Boost
EVs: 9 Def / 32 SpA / 9 SpD / 16 Spe
Modest Nature
- Lumina Crash
- Calm Mind
- Baton Pass
- Protect

Goodra-Hisui @ Leftovers
Ability: Shell Armor
EVs: 21 HP / 5 Def / 30 SpA / 10 Spe
Modest Nature
- Flash Cannon
- Flamethrower
- Dragon Pulse
- Protect

Raichu @ Raichunite Y
Ability: Lightning Rod
EVs: 32 HP / 10 Def / 24 Spe
Timid Nature
- Fake Out
- Zap Cannon
- Focus Blast
- Protect

Floette-Eternal @ Floettite
Ability: Flower Veil
EVs: 6 HP / 18 Def / 15 SpA / 27 Spe
Modest Nature
- Dazzling Gleam
- Draining Kiss
- Psychic
- Protect

Arcanine-Hisui @ Focus Sash
Ability: Rock Head
EVs: 1 HP / 32 Atk / 1 SpD / 32 Spe
Jolly Nature
- Head Smash
- Flare Blitz
- Extreme Speed
- Protect

Basculegion @ Choice Scarf
Ability: Adaptability
EVs: 2 HP / 32 Atk / 32 Spe
Jolly Nature
- Wave Crash
- Flip Turn
- Psychic Fangs
- Last Respects`;

const team2Paste = `Indeedee @ Colbur Berry
Ability: Psychic Surge
EVs: 2 Def / 32 SpA / 32 Spe
Modest Nature
Level: 50
- Expanding Force
- Hyper Voice
- Trick Room
- Imprison

Whimsicott @ Focus Sash
Ability: Prankster
EVs: 17 HP / 32 SpA / 17 Spe
Timid Nature
Level: 50
- Moonblast
- Tailwind
- Sunny Day
- Protect

Garchomp @ Garchompite Z
Ability: Rough Skin
EVs: 32 SpA / 15 SpD / 19 Spe
Modest Nature
Level: 50
- Flamethrower
- Draco Meteor
- Earth Power
- Protect

Gholdengo @ Life Orb
Ability: Good as Gold
EVs: 7 HP / 27 SpA / 32 Spe
Modest Nature
Level: 50
- Make It Rain
- Shadow Ball
- Nasty Plot
- Protect

Sneasler @ Psychic Seed
Ability: Unburden
EVs: 2 HP / 32 Atk / 32 Spe
Jolly Nature
Level: 50
- Dire Claw
- Rock Slide
- Close Combat
- Protect

Typhlosion-Hisui @ Choice Scarf
Ability: Blaze
EVs: 2 HP / 32 SpA / 32 Spe
Modest Nature
Level: 50
- Eruption
- Shadow Ball
- Heat Wave
- Extrasensory`;

const sandTeamPaste = `Tyranitar-Mega @ Tyranitarite
Ability: Sand Stream
Level: 50
EVs: 2 HP / 32 Atk / 32 Spe
Adamant Nature
- Rock Slide
- Crunch
- Low Kick
- Protect

Excadrill @ Life Orb
Ability: Sand Rush
Level: 50
EVs: 2 HP / 32 Atk / 32 Spe
Adamant Nature
- Earthquake
- Iron Head
- Rock Slide
- Protect

Garchomp @ Clear Amulet
Ability: Rough Skin
Level: 50
EVs: 2 HP / 32 Atk / 32 Spe
Jolly Nature
- Earthquake
- Dragon Claw
- Swords Dance
- Protect

Incineroar @ Sitrus Berry
Ability: Intimidate
Level: 50
EVs: 32 HP / 14 Def / 20 SpD
Careful Nature
- Flare Blitz
- Darkest Lariat
- Fake Out
- Parting Shot`;

const rainTeamPaste = `Pelipper @ Damp Rock
Ability: Drizzle
Level: 50
EVs: 32 HP / 2 Def / 32 SpA
Modest Nature
- Hurricane
- Weather Ball
- Tailwind
- Protect

Archaludon @ Assault Vest
Ability: Stamina
Level: 50
EVs: 32 HP / 32 SpA / 2 Spe
Modest Nature
- Electro Shot
- Flash Cannon
- Draco Meteor
- Body Press

Palafin @ Mystic Water
Ability: Zero to Hero
Level: 50
EVs: 2 HP / 32 Atk / 32 Spe
Adamant Nature
- Jet Punch
- Wave Crash
- Close Combat
- Protect

Amoonguss @ Rocky Helmet
Ability: Regenerator
Level: 50
EVs: 32 HP / 16 Def / 18 SpD
Bold Nature
- Spore
- Pollen Puff
- Rage Powder
- Protect`;

const ALL_TEAMS = [
  Teams.import(team1Paste),
  Teams.import(team2Paste),
  Teams.import(sandTeamPaste),
  Teams.import(rainTeamPaste)
];

// Optional pre-existing weights for iterative self-play
let existingWeights = null;
const weightsPath = path.join(__dirname, '../data/ai_weights.json');
if (fs.existsSync(weightsPath)) {
  try {
    existingWeights = JSON.parse(fs.readFileSync(weightsPath, 'utf8'));
  } catch (e) {}
}

function evaluateNeuralForward(vec, w) {
  if (!w || !w.W1) return 0;
  // Layer 1: 64 -> 128
  const h1 = new Float32Array(128);
  for (let i = 0; i < 128; i++) {
    let sum = w.b1[i];
    const off = i * 64;
    for (let j = 0; j < 64; j++) sum += vec[j] * w.W1[off + j];
    h1[i] = sum > 0 ? sum : 0;
  }
  // Layer 2: 128 -> 64
  const h2 = new Float32Array(64);
  for (let i = 0; i < 64; i++) {
    let sum = w.b2[i];
    const off = i * 128;
    for (let j = 0; j < 128; j++) sum += h1[j] * w.W2[off + j];
    h2[i] = sum > 0 ? sum : 0;
  }
  // Layer 3: 64 -> 1
  let out = w.b3[0];
  for (let j = 0; j < 64; j++) out += h2[j] * w.W3[j];
  return out;
}

// Bot Class that records trajectory data during matches
class DataCollectorBot extends BattleStreams.BattlePlayer {
  constructor(playerStream, options = {}) {
    super(playerStream, false);
    this.player = options.player || 'p1';
    this.leadOrder = options.leadOrder || [1, 2, 3, 4];
    this.turnCount = 0;
    this.trajectories = []; // recorded turns: { candidates: Float32Array[], chosenIndex: number, turn: number }
    this.foes = {
      '1': { types: ['Normal'], hpRatio: 1.0, active: false, speed: 100, maxHp: 180 },
      '2': { types: ['Normal'], hpRatio: 1.0, active: false, speed: 100, maxHp: 180 }
    };
    this.field = {
      weather: 'none',
      terrain: 'none',
      trickRoom: false,
      myTailwind: false,
      foeTailwind: false,
      myReflect: false,
      myLightScreen: false,
      imprisonActive: false
    };
    this.lastAction = [null, null];
    this.myPrefix = this.player;
  }

  receiveError(err) {
    try {
      this.choose('default');
    } catch (e) {}
  }

  receiveLine(line) {
    super.receiveLine(line);
    if (!line.startsWith('|')) return;
    const parts = line.split('|');
    const cmd = parts[1];
    const foePrefix = this.player === 'p1' ? 'p2' : 'p1';

    if (cmd === 'turn') {
      this.turnCount = parseInt(parts[2], 10) || (this.turnCount + 1);
    } else if (cmd === 'switch') {
      const ident = parts[2];
      const monName = parts[3].split(',')[0];
      const dexEntry = Dex.species.get(monName);
      const types = (dexEntry && dexEntry.types) ? dexEntry.types : ['Normal'];
      const baseSpe = dexEntry && dexEntry.baseStats ? dexEntry.baseStats.spe : 100;
      const [hp, maxHp] = (parts[4] || '100/100').split(' ')[0].split('/').map(Number);
      const ratio = (maxHp && !isNaN(hp)) ? hp / maxHp : 1.0;

      if (ident.startsWith(foePrefix)) {
        const slot = ident.endsWith('b') ? '2' : '1';
        this.foes[slot] = { types, hpRatio: ratio, active: true, speed: baseSpe, maxHp: maxHp || 180 };
      }
    } else if (cmd === '-damage') {
      const ident = parts[2];
      if (ident.startsWith(foePrefix)) {
        const slot = ident.endsWith('b') ? '2' : '1';
        if (parts[3] === '0 fnt') {
          this.foes[slot].hpRatio = 0;
          this.foes[slot].active = false;
        } else {
          const [hp, maxHp] = parts[3].split(' ')[0].split('/').map(Number);
          if (maxHp && !isNaN(hp)) this.foes[slot].hpRatio = hp / maxHp;
        }
      }
    } else if (cmd === 'faint') {
      const ident = parts[2];
      if (ident.startsWith(foePrefix)) {
        const slot = ident.endsWith('b') ? '2' : '1';
        this.foes[slot].hpRatio = 0;
        this.foes[slot].active = false;
      }
      if (ident === this.imprisonIdent) {
        this.field.imprisonActive = false;
        this.imprisonIdent = null;
      }
    } else if (cmd === '-weather') {
      const w = parts[2] || '';
      if (w === 'none') this.field.weather = 'none';
      else if (w.includes('Sun')) this.field.weather = 'sun';
      else if (w.includes('Rain')) this.field.weather = 'rain';
      else if (w.includes('Sand')) this.field.weather = 'sand';
      else if (w.includes('Snow')) this.field.weather = 'snow';
    } else if (cmd === '-fieldstart') {
      const t = parts[2] || '';
      if (t.includes('Psychic')) this.field.terrain = 'psychic';
      else if (t.includes('Electric')) this.field.terrain = 'electric';
      else if (t.includes('Grassy')) this.field.terrain = 'grassy';
      else if (t.includes('Misty')) this.field.terrain = 'misty';
      else if (t.includes('Trick Room')) this.field.trickRoom = true;
    } else if (cmd === '-fieldend') {
      const t = parts[2] || '';
      if (t.includes('Terrain')) this.field.terrain = 'none';
      if (t.includes('Trick Room')) this.field.trickRoom = false;
    } else if (cmd === '-sidestart') {
      const side = parts[2] || '';
      const effect = parts[3] || '';
      const isMine = side.startsWith(this.player);
      if (effect.includes('Tailwind')) {
        if (isMine) this.field.myTailwind = true;
        else this.field.foeTailwind = true;
      }
    } else if (cmd === '-sideend') {
      const side = parts[2] || '';
      const effect = parts[3] || '';
      const isMine = side.startsWith(this.player);
      if (effect.includes('Tailwind')) {
        if (isMine) this.field.myTailwind = false;
        else this.field.foeTailwind = false;
      }
    } else if (cmd === '-start') {
      const ident = parts[2] || '';
      const effect = parts[3] || '';
      if (effect.includes('Imprison') && ident.startsWith(this.player)) {
        this.field.imprisonActive = true;
        this.imprisonIdent = ident;
      }
    }
  }

  receiveRequest(request) {
    if (request.side && request.side.id) this.player = request.side.id;
    if (request.wait) return;

    if (request.teamPreview) {
      this.choose(`team ${this.leadOrder.join('')}`);
      return;
    }

    if (request.forceSwitch) {
      const pokemon = request.side.pokemon;
      const chosen = [];
      const choices = request.forceSwitch.map(mustSwitch => {
        if (!mustSwitch) return 'pass';
        const avail = [];
        for (let s = 1; s <= pokemon.length; s++) {
          const p = pokemon[s - 1];
          if (p && !p.active && !p.condition.endsWith('fnt') && !chosen.includes(s)) avail.push(s);
        }
        if (!avail.length) return 'default';
        const target = avail[0];
        chosen.push(target);
        return `switch ${target}`;
      });
      this.choose(choices.join(', '));
      return;
    }

    if (request.active) {
      this.makeTurnChoice(request);
    }
  }

  makeTurnChoice(request) {
    const activeList = request.active;
    const myPokemon = request.side.pokemon.filter(p => p.active);

    // Build State Vector
    const battleState = {
      myTeam: myPokemon.map(p => {
        const [hp, maxHp] = (p.condition || '100/100').split(' ')[0].split('/').map(Number);
        return { hpRatio: maxHp ? hp / maxHp : 1.0, fainted: p.condition.endsWith('fnt') };
      }),
      foes: this.foes,
      field: this.field,
      turnCount: this.turnCount,
      isFaster: true
    };
    const stateVec = extractStateFeatures(battleState);

    // Slot 0 & Slot 1 candidates
    const slot0Candidates = this.generateCandidates(activeList[0], 0, request.side.pokemon);
    const slot1Candidates = activeList.length > 1
      ? this.generateCandidates(activeList[1], 1, request.side.pokemon)
      : [{ str: 'pass', type: 'pass' }];

    const candidatePairs = [];
    const featureVectors = [];

    for (let i = 0; i < slot0Candidates.length; i++) {
      const c0 = slot0Candidates[i];
      const act0Vec = extractActionFeatures(c0, myPokemon[0], this.foes, this.field);

      for (let j = 0; j < slot1Candidates.length; j++) {
        const c1 = slot1Candidates[j];
        const act1Vec = extractActionFeatures(c1, myPokemon[1], this.foes, this.field);

        // Combined 64-dim float feature vector
        const jointVec = extractJointFeatures(stateVec, act0Vec, act1Vec, c0, c1, this.field, this.foes);

        candidatePairs.push({ c0, c1, str: `${c0.str}, ${c1.str}` });
        featureVectors.push(jointVec);
      }
    }

    if (!candidatePairs.length) {
      this.choose('default');
      return;
    }

    // Evaluate candidates
    const scores = new Float64Array(candidatePairs.length);
    for (let k = 0; k < candidatePairs.length; k++) {
      if (existingWeights) {
        scores[k] = evaluateNeuralForward(featureVectors[k], existingWeights);
      } else {
        // Initial heuristic baseline for exploration
        scores[k] = this.heuristicScore(candidatePairs[k].c0, candidatePairs[k].c1);
      }
    }

    // Softmax selection with exploration temperature
    const tau = 1.0;
    let maxScore = -Infinity;
    for (let k = 0; k < scores.length; k++) if (scores[k] > maxScore) maxScore = scores[k];

    const expScores = new Float64Array(scores.length);
    let sumExp = 0;
    for (let k = 0; k < scores.length; k++) {
      expScores[k] = Math.exp((scores[k] - maxScore) / tau);
      sumExp += expScores[k];
    }

    let r = Math.random() * sumExp;
    let chosenIndex = 0;
    for (let k = 0; k < scores.length; k++) {
      r -= expScores[k];
      if (r <= 0) {
        chosenIndex = k;
        break;
      }
    }

    const chosenPair = candidatePairs[chosenIndex];

    // Record turn trajectory
    this.trajectories.push({
      features: featureVectors.map(vec => Array.from(vec)),
      chosenIndex: chosenIndex,
      turn: this.turnCount
    });

    this.lastAction = [chosenPair.c0.type, chosenPair.c1.type];
    this.choose(chosenPair.str);
  }

  heuristicScore(c0, c1) {
    let s = 0;
    // Damage bonus
    if (c0.estDamageRatio) s += c0.estDamageRatio * 5.0;
    if (c1.estDamageRatio) s += c1.estDamageRatio * 5.0;

    // Disallow simultaneous TR + Tailwind
    if ((c0.type === 'tailwind' && c1.type === 'trickroom') || (c0.type === 'trickroom' && c1.type === 'tailwind')) s -= 20.0;
    // Disallow double protect
    if (c0.type === 'protect' && c1.type === 'protect') s -= 10.0;
    // Disallow double switch
    if (c0.type === 'switch' && c1.type === 'switch') s -= 15.0;

    // Tactical switches: escape threats / resist incoming attacks
    const evalSwitchBonus = (c) => {
      if (c.type !== 'switch' || !c.benchMon) return -1.5;
      let sw = -1.5;
      if (c.isThreatEscape) sw += 4.5;
      if (c.hasImmunity) sw += 5.0;
      else if (c.resistsFoe) sw += 3.0;
      if (c.benchHpRatio < 0.35) sw -= 3.0;
      return sw;
    };
    if (c0.type === 'switch') s += evalSwitchBonus(c0);
    if (c1.type === 'switch') s += evalSwitchBonus(c1);

    // Speed control: don't blind spam tailwind
    if (c0.type === 'tailwind' || c1.type === 'tailwind') {
      if (this.field.myTailwind) s -= 10.0;
      else if (this.field.foeTailwind) s += 4.0;
      else s += 2.0;
    }

    // Reward expanding force on terrain
    if (this.field.terrain === 'psychic' && ((c0.move && c0.move.id === 'expandingforce') || (c1.move && c1.move.id === 'expandingforce'))) s += 6.0;
    // Penalize redundant imprison
    if (this.field.imprisonActive && (c0.type === 'imprison' || c1.type === 'imprison')) s -= 15.0;
    return s;
  }

  generateCandidates(activeData, slotIndex, sidePokemon) {
    const candidates = [];
    if (!activeData || activeData.trapped) {
      if (!activeData) return [{ str: 'pass', type: 'pass', slotIndex }];
    }

    const moves = activeData.moves || [];
    for (let m = 0; m < moves.length; m++) {
      const move = moves[m];
      if (move.disabled) continue;

      const moveId = move.id;
      const targetType = move.target || 'normal';
      const moveData = Dex.moves.get(moveId) || {};
      const isSpread = ['allAdjacentFoes', 'allAdjacent'].includes(targetType) ||
        (moveId === 'expandingforce' && this.field.terrain === 'psychic');

      let type = 'attack';
      if (moveId === 'protect' || moveId === 'detect') type = 'protect';
      else if (moveId === 'tailwind') type = 'tailwind';
      else if (moveId === 'trickroom') type = 'trickroom';
      else if (moveId === 'imprison') type = 'imprison';
      else if (['calmmind', 'nastyplot', 'swordsdance'].includes(moveId)) type = 'setup';

      const estDamageRatio = (moveData.basePower || 60) / 120.0;

      if (targetType === 'self' || targetType === 'all' || targetType === 'allAdjacentFoes' || targetType === 'allAdjacent') {
        candidates.push({
          str: `move ${m + 1}`,
          type,
          move,
          moveData,
          isSpread,
          estDamageRatio,
          slotIndex
        });
      } else {
        // Targeted move (including Expanding Force, which requires target in command even when spread)
        if (this.foes['1'].active) {
          candidates.push({
            str: `move ${m + 1} 1`,
            type,
            move,
            moveData,
            targetFoe: '1',
            isSpread,
            estDamageRatio,
            slotIndex
          });
        }
        if (this.foes['2'].active) {
          candidates.push({
            str: `move ${m + 1} 2`,
            type,
            move,
            moveData,
            targetFoe: '2',
            isSpread,
            estDamageRatio,
            slotIndex
          });
        }
      }
    }

    // Switches
    const curMon = sidePokemon[slotIndex];
    const curSpecies = curMon ? Dex.species.get(curMon.details.split(',')[0]) : null;
    const curTypes = curSpecies?.types || ['Normal'];
    let curTakesSuper = false;
    for (const fSlot of ['1', '2']) {
      const foe = this.foes[fSlot];
      if (foe && foe.active) {
        for (const ft of (foe.types || ['Normal'])) {
          if (getTypeEff(ft, curTypes) >= 2.0) curTakesSuper = true;
        }
      }
    }

    for (let s = 1; s <= sidePokemon.length; s++) {
      const p = sidePokemon[s - 1];
      if (p && !p.active && !p.condition.endsWith('fnt')) {
        const bSpecies = Dex.species.get(p.details.split(',')[0]);
        const bTypes = bSpecies?.types || ['Normal'];
        let hasImmunity = false;
        let resistsFoe = true;
        for (const fSlot of ['1', '2']) {
          const foe = this.foes[fSlot];
          if (foe && foe.active) {
            for (const ft of (foe.types || ['Normal'])) {
              const eff = getTypeEff(ft, bTypes);
              if (eff === 0) hasImmunity = true;
              if (eff > 1.0) resistsFoe = false;
            }
          }
        }
        const [bHp, bMaxHp] = (p.condition || '100/100').split(' ')[0].split('/').map(Number);
        candidates.push({
          str: `switch ${s}`,
          type: 'switch',
          switchTarget: s,
          benchMon: { details: p.details, types: bTypes, condition: p.condition },
          isThreatEscape: curTakesSuper,
          hasImmunity,
          resistsFoe,
          benchHpRatio: bMaxHp ? bHp / bMaxHp : 1.0,
          slotIndex
        });
      }
    }

    if (!candidates.length) candidates.push({ str: 'default', type: 'pass', slotIndex });
    return candidates;
  }
}

async function runMatch(p1Paste, p2Paste, seed) {
  const p1Team = Teams.pack(p1Paste.slice(0, 4));
  const p2Team = Teams.pack(p2Paste.slice(0, 4));

  const streams = BattleStreams.getPlayerStreams(new BattleStreams.BattleStream());
  const spec = { formatid: '[Gen 9 Champions] VGC 2026 Reg M-C', seed };

  const p1Bot = new DataCollectorBot(streams.p1, { player: 'p1' });
  const p2Bot = new DataCollectorBot(streams.p2, { player: 'p2' });

  p1Bot.start();
  p2Bot.start();

  streams.omniscient.write(`>start ${JSON.stringify(spec)}\n` +
    `>player p1 {"name":"P1","team":"${p1Team}"}\n` +
    `>player p2 {"name":"P2","team":"${p2Team}"}`);

  let winner = null;
  for await (const chunk of streams.omniscient) {
    for (const line of chunk.split('\n')) {
      if (line.startsWith('|win|')) {
        winner = line.split('|')[2];
        break;
      }
    }
    if (winner) break;
  }

  const p1Won = (winner === 'P1');
  return {
    p1Trajectories: p1Bot.trajectories,
    p2Trajectories: p2Bot.trajectories,
    p1Won: p1Won ? 1.0 : -1.0,
    p2Won: p1Won ? -1.0 : 1.0
  };
}

async function generateDataset(numMatches = 150) {
  console.log(`Generating self-play dataset over ${numMatches} matches...`);
  const dataset = [];

  for (let m = 0; m < numMatches; m++) {
    const tA = ALL_TEAMS[m % ALL_TEAMS.length];
    const tB = ALL_TEAMS[(m + 1) % ALL_TEAMS.length];
    const seed = [m * 17 + 1, m * 31 + 3, m * 47 + 5, m * 61 + 7];

    try {
      const res = await runMatch(tA, tB, seed);

      // Label p1 turns with discounted game reward
      for (const traj of res.p1Trajectories) {
        dataset.push({
          features: traj.features,
          chosenIndex: traj.chosenIndex,
          reward: res.p1Won
        });
      }

      // Label p2 turns
      for (const traj of res.p2Trajectories) {
        dataset.push({
          features: traj.features,
          chosenIndex: traj.chosenIndex,
          reward: res.p2Won
        });
      }
    } catch (e) {
      // pass
    }

    if ((m + 1) % 25 === 0) {
      console.log(`Progress: ${m + 1} / ${numMatches} matches completed. Samples collected: ${dataset.length}`);
    }
  }

  const outPath = path.join(__dirname, 'dataset.json');
  fs.writeFileSync(outPath, JSON.stringify(dataset));
  console.log(`Saved ${dataset.length} training samples to ${outPath}`);
}

const matchCount = parseInt(process.argv[2], 10) || 120;
generateDataset(matchCount).catch(console.error);

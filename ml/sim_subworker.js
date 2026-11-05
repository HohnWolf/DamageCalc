// Subworker process for parallel self-play simulation across CPU cores
// Trains across all 12 Meta & User Teams, all 144 matchup pairings, and all 15 4-out-of-6 lead/back combinations.
const fs = require('fs');
const path = require('path');
const { Battle, BattleStreams, Teams, Dex } = require('@pkmn/sim');
const {
  getTypeEff,
  getEffectiveMoveType,
  isGrounded,
  isMoveImmuneOrBlocked,
  estimateDamageRatio,
  extractStateFeatures,
  extractActionFeatures,
  extractJointFeatures,
  evaluateNeuralForward
} = require(path.join(__dirname, 'features.js'));
const ARCHETYPES = require(path.join(__dirname, '../data/meta_archetypes.js'));

// Authentische Pokémon Champions Engine: Stat Points patchen
if (Battle && Battle.prototype) {
  Battle.prototype.statModify = function(baseStats, set, statName) {
    const tr = this.trunc;
    let stat = baseStats[statName];
    const evVal = set.evs ? (set.evs[statName] || 0) : 0;
    const sp = evVal > 32 ? Math.min(32, Math.floor((evVal + 4) / 8)) : evVal;
    if (statName === 'hp') {
      return stat + sp + 75;
    }
    stat = stat + sp + 20;
    const nature = this.dex.natures.get(set.nature);
    if (nature.plus === statName) {
      stat = tr(tr(stat * 110, 16) / 100);
    } else if (nature.minus === statName) {
      stat = tr(tr(stat * 90, 16) / 100);
    }
    return stat;
  };

  const origGetTeam = Battle.prototype.getTeam;
  Battle.prototype.getTeam = function(options) {
    const team = origGetTeam.call(this, options);
    if (team && Array.isArray(team)) {
      for (const set of team) {
        if (!set.level) set.level = 50;
      }
    }
    return team;
  };
}

Dex.mod('champions', {
  Scripts: {
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

const userTeam1Paste = `Espathra @ Colbur Berry
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

const userTeam2Paste = `Indeedee @ Colbur Berry
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

function normalizePaste(p) {
  return p.replace(/^(SPs?|EVs?):\s*(.+)$/gim, (m, pref, b) => {
    return 'EVs: ' + b.split('/').map(part => {
      const match = /^(\d+)\s+([A-Za-z]+)$/.exec(part.trim());
      if (!match) return part.trim();
      let v = parseInt(match[1], 10);
      if (/^EV/i.test(pref) && v > 32) v = Math.min(32, Math.floor((v + 4) / 8));
      return `${Math.min(32, v)} ${match[2]}`;
    }).join(' / ');
  });
}

// All 210+ diverse competitive teams (crob.at tournament/ladder + meta archetypes + user teams)
const teams200Path = path.join(__dirname, '../data/champions_teams_200.json');
let ALL_TEAMS = [];

if (fs.existsSync(teams200Path)) {
  try {
    const raw200 = JSON.parse(fs.readFileSync(teams200Path, 'utf8'));
    ALL_TEAMS = raw200.map(t => Teams.import(normalizePaste(t.paste))).filter(Boolean);
  } catch (e) {
    ALL_TEAMS = [];
  }
}

if (!ALL_TEAMS.length) {
  ALL_TEAMS = [
    Teams.import(normalizePaste(userTeam1Paste)),
    Teams.import(normalizePaste(userTeam2Paste)),
    ...ARCHETYPES.map(a => Teams.import(normalizePaste(a.paste)))
  ];
}

ALL_TEAMS.forEach(team => {
  if (team) team.forEach(mon => { if (!mon.level) mon.level = 50; });
});

// Generate all 15 2-Lead + 2-Back combinations across all 6 team members so slots 5 & 6 are thoroughly trained
function generateLeadOrders(teamLen, seedVal) {
  const max = Math.min(6, teamLen || 6);
  if (max <= 4) return [1, 2, 3, 4];
  const combos = [];
  for (let i = 1; i <= max; i++) {
    for (let j = i + 1; j <= max; j++) {
      const rest = [];
      for (let k = 1; k <= max; k++) {
        if (k !== i && k !== j) rest.push(k);
      }
      // Rotate backline pair based on seed so every bench member is used
      const offset = (seedVal + i + j) % (rest.length - 1);
      combos.push([i, j, rest[offset], rest[(offset + 1) % rest.length]]);
    }
  }
  return combos[seedVal % combos.length];
}

class FastSimBot extends BattleStreams.BattlePlayer {
  constructor(playerStream, options = {}, weights = null) {
    super(playerStream, false);
    this.player = options.player || 'p1';
    this.weights = weights;
    this.leadOrder = options.leadOrder || [1, 2, 3, 4];
    this.turnCount = 0;
    this.trajectories = [];
    this.lastAction = [null, null];
    this.slotActiveTurns = [0, 0];
    this.megaUsed = false;

    this.foes = {
      '1': { name: '', types: ['Normal'], ability: '', hpRatio: 1.0, active: false, protectedLastTurn: false, speed: 120, atk: 130, spa: 130, def: 110, spd: 110, maxHp: 175, boosts: { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }, status: '' },
      '2': { name: '', types: ['Normal'], ability: '', hpRatio: 1.0, active: false, protectedLastTurn: false, speed: 120, atk: 130, spa: 130, def: 110, spd: 110, maxHp: 175, boosts: { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }, status: '' }
    };
    this.myBoosts = [
      { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
      { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }
    ];
    this.myStatus = ['', ''];

    this.field = {
      weather: 'none',
      terrain: 'none',
      trickRoom: false,
      myTailwind: false,
      foeTailwind: false,
      myReflect: false,
      myLightScreen: false,
      foeReflect: false,
      foeLightScreen: false,
      foeAuroraVeil: false,
      imprisonActive: false
    };

    this.blunders = {
      immuneAttacks: 0,
      doubleProtectFails: 0,
      friendlyFireHits: 0,
      speedConflicts: 0
    };
    this.turnBlunderFlags = {};
  }

  receiveError(err) {
    try { this.choose('default'); } catch (e) {}
  }

  receiveLine(line) {
    super.receiveLine(line);
    if (!line.startsWith('|')) return;
    const parts = line.split('|');
    const cmd = parts[1];
    const foePrefix = this.player === 'p1' ? 'p2' : 'p1';
    const myPrefix = this.player === 'p1' ? 'p1' : 'p2';

    if (cmd === 'turn') {
      this.turnCount = parseInt(parts[2], 10) || (this.turnCount + 1);
      this.slotActiveTurns[0]++;
      this.slotActiveTurns[1]++;
      this.foes['1'].protectedLastTurn = false;
      this.foes['2'].protectedLastTurn = false;
    } else if (cmd === 'switch' || cmd === 'drag') {
      const ident = parts[2] || '';
      const monName = (parts[3] || '').split(',')[0].trim();
      const dexEntry = Dex.species.get(monName);
      const types = (dexEntry && dexEntry.types) ? dexEntry.types : ['Normal'];
      const bs = (dexEntry && dexEntry.baseStats) ? dexEntry.baseStats : { hp: 90, atk: 100, def: 90, spa: 100, spd: 90, spe: 100 };
      const defAbil = (dexEntry && dexEntry.abilities && dexEntry.abilities['0']) ? dexEntry.abilities['0'] : '';
      const [hp, maxHp] = (parts[4] || '100/100').split(' ')[0].split('/').map(Number);
      const ratio = (maxHp && !isNaN(hp)) ? hp / maxHp : 1.0;

      if (ident.startsWith(foePrefix)) {
        const slot = ident.includes('b:') || ident.endsWith('b') ? '2' : '1';
        this.foes[slot] = {
          name: monName,
          types,
          ability: defAbil,
          hpRatio: ratio,
          active: true,
          protectedLastTurn: false,
          speed: bs.spe + 52,
          atk: bs.atk + 52,
          spa: bs.spa + 52,
          def: bs.def + 52,
          spd: bs.spd + 52,
          maxHp: bs.hp + 107,
          boosts: { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
          status: ''
        };
      } else if (ident.startsWith(myPrefix)) {
        const mySlotIdx = (ident.includes('b:') || ident.endsWith('b')) ? 1 : 0;
        this.slotActiveTurns[mySlotIdx] = 0; // Increments to 1 on '|turn|'
        this.myBoosts[mySlotIdx] = { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
        this.myStatus[mySlotIdx] = '';
      }
    } else if (cmd === '-damage') {
      const ident = parts[2] || '';
      if (ident.startsWith(foePrefix)) {
        const slot = (ident.includes('b:') || ident.endsWith('b')) ? '2' : '1';
        const [hp, maxHp] = (parts[3] || '').split(' ')[0].split('/').map(Number);
        if (maxHp && !isNaN(hp)) this.foes[slot].hpRatio = hp / maxHp;
      }
      if (parts[4] && parts[4].includes('[from]') && ident.startsWith(myPrefix)) {
        const fromMove = parts[4].replace('[from] move: ', '').trim();
        if (['Earthquake', 'Surf', 'Discharge', 'Sludge Wave'].includes(fromMove)) {
          this.blunders.friendlyFireHits++;
          this.turnBlunderFlags[this.turnCount] = true;
        }
      }
    } else if (cmd === 'faint') {
      const ident = parts[2] || '';
      if (ident.startsWith(foePrefix)) {
        const slot = (ident.includes('b:') || ident.endsWith('b')) ? '2' : '1';
        this.foes[slot].hpRatio = 0;
        this.foes[slot].active = false;
      }
    } else if (cmd === '-singleturn' && ['Protect', 'Detect', 'Spiky Shield', 'Baneful Bunker'].includes(parts[3])) {
      const ident = parts[2] || '';
      if (ident.startsWith(foePrefix)) {
        const slot = (ident.includes('b:') || ident.endsWith('b')) ? '2' : '1';
        this.foes[slot].protectedLastTurn = true;
      }
    } else if (cmd === '-boost' || cmd === '-unboost') {
      const ident = parts[2] || '';
      const stat = parts[3] || '';
      const amt = parseInt(parts[4] || '1', 10) * (cmd === '-boost' ? 1 : -1);
      if (ident.startsWith(foePrefix)) {
        const slot = (ident.includes('b:') || ident.endsWith('b')) ? '2' : '1';
        if (this.foes[slot] && this.foes[slot].boosts) {
          this.foes[slot].boosts[stat] = Math.max(-6, Math.min(6, (this.foes[slot].boosts[stat] || 0) + amt));
        }
      } else if (ident.startsWith(myPrefix)) {
        const mySlotIdx = (ident.includes('b:') || ident.endsWith('b')) ? 1 : 0;
        if (this.myBoosts[mySlotIdx]) {
          this.myBoosts[mySlotIdx][stat] = Math.max(-6, Math.min(6, (this.myBoosts[mySlotIdx][stat] || 0) + amt));
        }
      }
    } else if (cmd === '-setboost') {
      const ident = parts[2] || '';
      const stat = parts[3] || '';
      const amt = parseInt(parts[4] || '0', 10);
      if (ident.startsWith(foePrefix)) {
        const slot = (ident.includes('b:') || ident.endsWith('b')) ? '2' : '1';
        if (this.foes[slot] && this.foes[slot].boosts) {
          this.foes[slot].boosts[stat] = Math.max(-6, Math.min(6, amt));
        }
      } else if (ident.startsWith(myPrefix)) {
        const mySlotIdx = (ident.includes('b:') || ident.endsWith('b')) ? 1 : 0;
        if (this.myBoosts[mySlotIdx]) {
          this.myBoosts[mySlotIdx][stat] = Math.max(-6, Math.min(6, amt));
        }
      }
    } else if (cmd === '-clearallboost') {
      this.foes['1'].boosts = { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
      this.foes['2'].boosts = { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
      this.myBoosts[0] = { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
      this.myBoosts[1] = { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
    } else if (cmd === '-clearboost') {
      const ident = parts[2] || '';
      if (ident.startsWith(foePrefix)) {
        const slot = (ident.includes('b:') || ident.endsWith('b')) ? '2' : '1';
        if (this.foes[slot]) this.foes[slot].boosts = { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
      } else if (ident.startsWith(myPrefix)) {
        const mySlotIdx = (ident.includes('b:') || ident.endsWith('b')) ? 1 : 0;
        this.myBoosts[mySlotIdx] = { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
      }
    } else if (cmd === '-status') {
      const ident = parts[2] || '';
      const st = parts[3] || '';
      if (ident.startsWith(foePrefix)) {
        const slot = (ident.includes('b:') || ident.endsWith('b')) ? '2' : '1';
        if (this.foes[slot]) this.foes[slot].status = st;
      } else if (ident.startsWith(myPrefix)) {
        const mySlotIdx = (ident.includes('b:') || ident.endsWith('b')) ? 1 : 0;
        this.myStatus[mySlotIdx] = st;
      }
    } else if (cmd === '-curestatus') {
      const ident = parts[2] || '';
      if (ident.startsWith(foePrefix)) {
        const slot = (ident.includes('b:') || ident.endsWith('b')) ? '2' : '1';
        if (this.foes[slot]) this.foes[slot].status = '';
      } else if (ident.startsWith(myPrefix)) {
        const mySlotIdx = (ident.includes('b:') || ident.endsWith('b')) ? 1 : 0;
        this.myStatus[mySlotIdx] = '';
      }
    } else if (cmd === '-immune') {
      const ident = parts[2] || '';
      if (ident.startsWith(foePrefix)) {
        this.blunders.immuneAttacks++;
        this.turnBlunderFlags[this.turnCount] = true;
      }
    } else if (cmd === '-fail') {
      if (parts[2]?.startsWith(myPrefix) && parts[3] === 'Protect') {
        this.blunders.doubleProtectFails++;
        this.turnBlunderFlags[this.turnCount] = true;
      }
    } else if (cmd === '-mega') {
      if ((parts[2] || '').startsWith(myPrefix)) {
        this.megaUsed = true;
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
      const isMine = side.startsWith(myPrefix);
      if (effect.includes('Tailwind')) {
        if (isMine) this.field.myTailwind = true;
        else this.field.foeTailwind = true;
      } else if (effect.includes('Reflect')) {
        if (isMine) this.field.myReflect = true;
        else this.field.foeReflect = true;
      } else if (effect.includes('Light Screen')) {
        if (isMine) this.field.myLightScreen = true;
        else this.field.foeLightScreen = true;
      } else if (effect.includes('Aurora Veil')) {
        if (isMine) this.field.myAuroraVeil = true;
        else this.field.foeAuroraVeil = true;
      }
    } else if (cmd === '-sideend') {
      const side = parts[2] || '';
      const effect = parts[3] || '';
      const isMine = side.startsWith(myPrefix);
      if (effect.includes('Tailwind')) {
        if (isMine) this.field.myTailwind = false;
        else this.field.foeTailwind = false;
      } else if (effect.includes('Reflect')) {
        if (isMine) this.field.myReflect = false;
        else this.field.foeReflect = false;
      } else if (effect.includes('Light Screen')) {
        if (isMine) this.field.myLightScreen = false;
        else this.field.foeLightScreen = false;
      } else if (effect.includes('Aurora Veil')) {
        if (isMine) this.field.myAuroraVeil = false;
        else this.field.foeAuroraVeil = false;
      }
    }
  }

  receiveRequest(request) {
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
        // Choose bench mon with best matchup against active foes
        avail.sort((a, b) => {
          const pA = pokemon[a - 1];
          const pB = pokemon[b - 1];
          return this.scoreBenchSwitchIn(pB) - this.scoreBenchSwitchIn(pA);
        });
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

  scoreBenchSwitchIn(p) {
    if (!p) return -999;
    const sp = Dex.species.get(p.details.split(',')[0]);
    const bTypes = sp?.types || ['Normal'];
    let score = 0;
    for (const fSlot of ['1', '2']) {
      const foe = this.foes[fSlot];
      if (foe && foe.active) {
        for (const ft of (foe.types || ['Normal'])) {
          const eff = getTypeEff(ft, bTypes);
          if (eff === 0) score += 3.0;
          else if (eff <= 0.5) score += 1.5;
          else if (eff >= 2.0) score -= 2.0;
        }
      }
    }
    return score;
  }

  buildMonContext(mon, slotIndex, allSideMons) {
    if (!mon) return { name: '', types: ['Normal'], ability: '', hpRatio: 0, activeTurns: 1, atk: 120, def: 110, spa: 120, spd: 110, spe: 100, faintedAllies: 0, boosts: { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }, status: '', item: '' };
    const name = mon.details.split(',')[0].trim();
    const spec = Dex.species.get(name);
    const [hp, maxHp] = (mon.condition || '100/100').split(' ')[0].split('/').map(Number);
    const faintedAllies = (allSideMons || []).filter(m => m && m.condition && m.condition.endsWith('fnt')).length;
    return {
      name,
      types: spec?.types || ['Normal'],
      ability: mon.ability || mon.baseAbility || spec?.abilities?.['0'] || '',
      item: mon.item || '',
      hpRatio: maxHp ? hp / maxHp : 1.0,
      activeTurns: Math.max(1, this.slotActiveTurns[slotIndex] || 1),
      atk: mon.stats?.atk || 130,
      def: mon.stats?.def || 110,
      spa: mon.stats?.spa || 130,
      spd: mon.stats?.spd || 110,
      spe: mon.stats?.spe || 120,
      boosts: this.myBoosts ? this.myBoosts[slotIndex] : { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
      status: this.myStatus ? this.myStatus[slotIndex] : '',
      faintedAllies
    };
  }

  makeTurnChoice(request) {
    const activeList = request.active;
    const sideMons = request.side.pokemon;
    const myActiveMons = [sideMons[0], sideMons[1]];
    const monCtx0 = this.buildMonContext(myActiveMons[0], 0, sideMons);
    const monCtx1 = this.buildMonContext(myActiveMons[1], 1, sideMons);

    // Compute real speed advantage with stages and Tailwind
    const getBoostMod = (stage) => {
      stage = Math.max(-6, Math.min(6, stage || 0));
      return stage >= 0 ? (2 + stage) / 2 : 2 / (2 - stage);
    };
    const myMult = this.field.myTailwind ? 2.0 : 1.0;
    const foeMult = this.field.foeTailwind ? 2.0 : 1.0;
    const mySpe0 = (monCtx0?.spe || 120) * getBoostMod(monCtx0?.boosts?.spe) * (monCtx0?.status === 'par' ? 0.5 : 1.0);
    const mySpe1 = (monCtx1?.spe || 120) * getBoostMod(monCtx1?.boosts?.spe) * (monCtx1?.status === 'par' ? 0.5 : 1.0);
    const foeSpe1 = (this.foes['1'].speed || 120) * getBoostMod(this.foes['1'].boosts?.spe) * (this.foes['1'].status === 'par' ? 0.5 : 1.0);
    const foeSpe2 = (this.foes['2'].speed || 120) * getBoostMod(this.foes['2'].boosts?.spe) * (this.foes['2'].status === 'par' ? 0.5 : 1.0);
    const myAvgSpe = ((mySpe0 + mySpe1) * 0.5) * myMult;
    const foeAvgSpe = ((foeSpe1 + foeSpe2) * 0.5) * foeMult;
    const isFaster = this.field.trickRoom ? (myAvgSpe < foeAvgSpe) : (myAvgSpe >= foeAvgSpe);

    const battleState = {
      myTeam: sideMons.map(p => {
        const [hp, maxHp] = (p.condition || '100/100').split(' ')[0].split('/').map(Number);
        return { hpRatio: maxHp ? hp / maxHp : 1.0, fainted: p.condition.endsWith('fnt') };
      }),
      foeRemaining: (this.foes['1'].active ? 1 : 0) + (this.foes['2'].active ? 1 : 0) + 1,
      foes: this.foes,
      field: this.field,
      turnCount: this.turnCount,
      isFaster
    };
    const stateVec = extractStateFeatures(battleState);

    const slot0Candidates = this.generateCandidates(activeList[0], 0, monCtx0, monCtx1, sideMons);
    const slot1Candidates = activeList.length > 1
      ? this.generateCandidates(activeList[1], 1, monCtx1, monCtx0, sideMons)
      : [{ str: 'pass', type: 'pass' }];

    const candidatePairs = [];
    const featureVectors = [];

    for (let i = 0; i < slot0Candidates.length; i++) {
      const c0 = slot0Candidates[i];
      const act0Vec = extractActionFeatures(c0, monCtx0, this.foes, this.field);

      for (let j = 0; j < slot1Candidates.length; j++) {
        const c1 = slot1Candidates[j];
        if (c0.isSwitch && c1.isSwitch && c0.switchTarget === c1.switchTarget) continue;
        if (c0.isMega && c1.isMega) continue;

        const act1Vec = extractActionFeatures(c1, monCtx1, this.foes, this.field);
        const jointVec = extractJointFeatures(stateVec, act0Vec, act1Vec, c0, c1, this.field, this.foes);

        candidatePairs.push({ c0, c1, str: `${c0.str}, ${c1.str}` });
        featureVectors.push(Array.from(jointVec));
      }
    }

    if (!candidatePairs.length) {
      this.choose('default');
      return;
    }

    const scores = new Float64Array(candidatePairs.length);
    for (let k = 0; k < candidatePairs.length; k++) {
      const pair = candidatePairs[k];
      let neuralBonus = 0;
      if (this.weights) {
        // Balanced scaling (20.0) so neural network refines tactical choices without overriding hard immunity/conflict rules
        neuralBonus = evaluateNeuralForward(featureVectors[k], this.weights) * 20.0;
      }
      scores[k] = this.heuristicScore(pair.c0, pair.c1, monCtx0, monCtx1) + neuralBonus;
    }

    const tau = 0.25;
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
      if (r <= 0) { chosenIndex = k; break; }
    }

    const chosenPair = candidatePairs[chosenIndex];
    const hasTurnBlunder = Boolean(
      chosenPair.c0.isImmune || chosenPair.c1.isImmune ||
      ((chosenPair.c0.type === 'tailwind' && chosenPair.c1.type === 'trickroom') ||
       (chosenPair.c0.type === 'trickroom' && chosenPair.c1.type === 'tailwind'))
    );

    if ((chosenPair.c0.type === 'tailwind' && chosenPair.c1.type === 'trickroom') ||
        (chosenPair.c0.type === 'trickroom' && chosenPair.c1.type === 'tailwind')) {
      this.blunders.speedConflicts++;
    }

    this.trajectories.push({
      features: featureVectors,
      chosenIndex,
      turn: this.turnCount,
      hadBlunder: hasTurnBlunder
    });

    this.lastAction[0] = chosenPair.c0.type;
    this.lastAction[1] = chosenPair.c1.type;

    if (activeList.length === 1 || !myActiveMons[1] || myActiveMons[1].condition?.endsWith('fnt')) {
      this.choose(chosenPair.c0.str);
    } else {
      this.choose(chosenPair.str);
    }
  }

  heuristicScore(c0, c1, monCtx0, monCtx1) {
    let s = 0;

    // 1. Hard penalties for immune / blocked moves
    if (c0.isImmune) s -= 150.0;
    if (c1.isImmune) s -= 150.0;

    // 2. Damage and KO evaluation
    const dmgFoe1 = (c0.d1 || 0) + (c1.d1 || 0);
    const dmgFoe2 = (c0.d2 || 0) + (c1.d2 || 0);
    if (c0.type === 'attack' && !c0.isImmune && c0.estDamageRatio) {
      s += c0.estDamageRatio * 10.0;
    }
    if (c1.type === 'attack' && !c1.isImmune && c1.estDamageRatio) {
      s += c1.estDamageRatio * 10.0;
    }

    // K.O. Confirmation Bonus
    if (this.foes['1'].active && dmgFoe1 >= this.foes['1'].hpRatio) s += 14.0;
    if (this.foes['2'].active && dmgFoe2 >= this.foes['2'].hpRatio) s += 14.0;

    // Protect-read bonus (foe protected last turn -> likely vulnerable this turn)
    if (c0.targetFoe && this.foes[c0.targetFoe]?.protectedLastTurn && !c0.isImmune) s += 4.0;
    if (c1.targetFoe && this.foes[c1.targetFoe]?.protectedLastTurn && !c1.isImmune) s += 4.0;

    // 3. Speed conflict & redundant status prevention
    if ((c0.type === 'tailwind' && c1.type === 'trickroom') || (c0.type === 'trickroom' && c1.type === 'tailwind')) {
      s -= 180.0;
    }
    if (c0.type === 'tailwind' && c1.type === 'tailwind') s -= 120.0;
    if (c0.type === 'trickroom' && c1.type === 'trickroom') s -= 120.0;
    if (this.field.trickRoom && (c0.type === 'tailwind' || c1.type === 'tailwind')) s -= 80.0;
    if (this.field.myTailwind && (c0.type === 'trickroom' || c1.type === 'trickroom')) s -= 80.0;

    // Only use Trick Room if our team is actually slower than the opponent (or to reverse enemy TR when fast)
    const ourRawSpe = ((monCtx0?.spe || 120) + (monCtx1?.spe || 120)) * 0.5;
    const foeRawSpe = ((this.foes['1'].speed || 120) + (this.foes['2'].speed || 120)) * 0.5;
    if (c0.type === 'trickroom' || c1.type === 'trickroom') {
      if (!this.field.trickRoom && ourRawSpe > foeRawSpe + 10) {
        s -= 90.0; // Never set Trick Room for a fast team!
      } else if (!this.field.trickRoom && ourRawSpe < foeRawSpe - 10) {
        s += 8.0;  // Good Trick Room setup for slow team
      } else if (this.field.trickRoom && ourRawSpe > foeRawSpe + 10) {
        s += 9.0;  // Good Trick Room reversal for fast team
      } else {
        s -= 60.0;
      }
    }

    // 4. Protect rules
    if (c0.type === 'protect' && c1.type === 'protect') s -= 60.0;
    if (c0.type === 'protect' && this.lastAction[0] === 'protect') s -= 160.0;
    if (c1.type === 'protect' && this.lastAction[1] === 'protect') s -= 160.0;

    // 5. Friendly fire prevention (Earthquake / Surf / Discharge)
    if (c0.moveData?.target === 'allAdjacent' && c1.type !== 'protect' && !c0.allyImmune) s -= 140.0;
    if (c1.moveData?.target === 'allAdjacent' && c0.type !== 'protect' && !c1.allyImmune) s -= 140.0;

    // 6. Focus fire & Support synergies
    if (c0.type === 'attack' && c1.type === 'attack' && !c0.isImmune && !c1.isImmune && c0.targetFoe && c0.targetFoe === c1.targetFoe) {
      s += 4.5;
    }
    if ((c0.type === 'redirect' && (c1.type === 'setup' || c1.type === 'trickroom' || c1.type === 'attack')) ||
        (c1.type === 'redirect' && (c0.type === 'setup' || c0.type === 'trickroom' || c0.type === 'attack'))) {
      s += 6.5;
    }
    if ((c0.type === 'helpinghand' && c1.type === 'attack' && !c1.isImmune) ||
        (c1.type === 'helpinghand' && c0.type === 'attack' && !c0.isImmune)) {
      s += 5.5;
    }

    // Fake Out on turn 1 of being active
    if (c0.move?.id === 'fakeout' && !c0.isImmune && monCtx0?.activeTurns === 1) s += 9.0;
    if (c1.move?.id === 'fakeout' && !c1.isImmune && monCtx1?.activeTurns === 1) s += 9.0;

    // 7. Tactical switches
    if (c0.type === 'switch' && c1.type === 'switch') s -= 35.0;
    const evalSwitchBonus = (c) => {
      if (c.type !== 'switch' || !c.benchMon) return -2.5;
      let sw = -2.5;
      if (c.isThreatEscape) sw += 6.0;
      if (c.hasImmunity) sw += 7.0;
      else if (c.resistsFoe) sw += 3.5;
      if (c.benchHpRatio < 0.35) sw -= 6.0;
      return sw;
    };
    if (c0.type === 'switch') s += evalSwitchBonus(c0);
    if (c1.type === 'switch') s += evalSwitchBonus(c1);

    // 8. Speed control: Tailwind
    if (c0.type === 'tailwind' || c1.type === 'tailwind') {
      if (this.field.myTailwind || this.field.trickRoom) s -= 90.0;
      else if (this.field.foeTailwind) s += 7.0;
      else if (ourRawSpe <= foeRawSpe + 15) s += 5.5;
      else s -= 5.0;
    }

    // 9. Terrain synergy
    if (this.field.terrain === 'psychic') {
      if (c0.move?.id === 'expandingforce' && !c0.isImmune) s += 7.5;
      if (c1.move?.id === 'expandingforce' && !c1.isImmune) s += 7.5;
    }

    return s;
  }

  generateCandidates(activeData, slotIndex, monCtx, allyCtx, sidePokemon) {
    const candidates = [];
    if (!activeData) return [{ str: 'pass', type: 'pass', slotIndex }];

    const canMega = !this.megaUsed && !!activeData.canMegaEvo;
    const moves = activeData.moves || [];

    for (let m = 0; m < moves.length; m++) {
      const move = moves[m];
      if (move.disabled || move.pp === 0) continue;

      const moveId = move.id;
      const targetType = move.target || 'normal';
      const moveData = Dex.moves.get(moveId) || { id: moveId, basePower: 60, type: 'Normal', category: 'Physical' };

      // Skip Fake Out / First Impression entirely if Pokémon has been active > 1 turn
      if ((moveId === 'fakeout' || moveId === 'firstimpression') && monCtx.activeTurns > 1) {
        continue;
      }

      const isSpread = ['allAdjacentFoes', 'allAdjacent'].includes(targetType) ||
        (moveId === 'expandingforce' && this.field.terrain === 'psychic' && isGrounded(monCtx, this.field));

      let type = 'attack';
      if (moveId === 'protect' || moveId === 'detect' || moveId === 'spikyshield' || moveId === 'banefulbunker') {
        if (this.lastAction[slotIndex] === 'protect') continue; // Never allow consecutive Protect
        type = 'protect';
      } else if (moveId === 'tailwind') {
        if (this.field.myTailwind) continue;
        type = 'tailwind';
      } else if (moveId === 'trickroom') {
        type = 'trickroom';
      } else if (moveId === 'imprison') {
        if (this.field.imprisonActive) continue;
        type = 'imprison';
      } else if (['calmmind', 'nastyplot', 'swordsdance', 'quiverdance', 'bulkup', 'clangoroussoul'].includes(moveId)) {
        type = 'setup';
      } else if (moveId === 'followme' || moveId === 'ragepowder') {
        type = 'redirect';
      } else if (moveId === 'helpinghand') {
        type = 'helpinghand';
      } else if (moveId === 'wideguard') {
        type = 'wideguard';
      } else if (['reflect', 'lightscreen', 'auroraveil'].includes(moveId)) {
        type = 'screens';
      } else if (moveData.category === 'Status') {
        type = 'status';
      }

      // Check if ally is immune to 'allAdjacent' spread move (e.g. Flying/Levitate ally next to Earthquake)
      let allyImmune = false;
      if (targetType === 'allAdjacent' && allyCtx) {
        const effMoveType = getEffectiveMoveType(moveData, monCtx, this.field);
        if (effMoveType === 'Ground' && !isGrounded(allyCtx, this.field)) allyImmune = true;
        else if (getTypeEff(effMoveType, allyCtx.types || ['Normal']) === 0) allyImmune = true;
      }

      const isUntargeted = ['self', 'all', 'allAdjacentFoes', 'allAdjacent', 'allySide', 'allyTeam', 'allies', 'adjacentAllyOrSelf'].includes(targetType);
      const isAllyTargeted = (targetType === 'adjacentAlly');

      if (isAllyTargeted) {
        const allySlotTarget = slotIndex === 0 ? -2 : -1;
        candidates.push({
          str: `move ${m + 1} ${allySlotTarget}`,
          type,
          move,
          moveData,
          isSpread: false,
          estDamageRatio: 0,
          isImmune: false,
          slotIndex
        });
      } else if (isUntargeted) {
        let estDamageRatio = 0;
        let isImmune = false;
        let d1 = 0;
        let d2 = 0;
        if (type === 'attack') {
          d1 = this.foes['1'].active ? estimateDamageRatio(moveData, monCtx, this.foes['1'], this.foes, this.field, true) : 0;
          d2 = this.foes['2'].active ? estimateDamageRatio(moveData, monCtx, this.foes['2'], this.foes, this.field, true) : 0;
          estDamageRatio = d1 + d2;
          const imm1 = !this.foes['1'].active || isMoveImmuneOrBlocked(moveData, monCtx, this.foes['1'], this.foes, this.field);
          const imm2 = !this.foes['2'].active || isMoveImmuneOrBlocked(moveData, monCtx, this.foes['2'], this.foes, this.field);
          isImmune = (imm1 && imm2);
        }
        candidates.push({
          str: `move ${m + 1}`,
          type,
          move,
          moveData,
          isSpread,
          allyImmune,
          d1,
          d2,
          estDamageRatio,
          isImmune,
          isMega: canMega,
          slotIndex
        });
      } else {
        for (const fSlot of ['1', '2']) {
          if (!this.foes[fSlot].active) continue;
          const isImmune = isMoveImmuneOrBlocked(moveData, monCtx, this.foes[fSlot], this.foes, this.field);
          const estDamageRatio = (type === 'attack' && !isImmune)
            ? estimateDamageRatio(moveData, monCtx, this.foes[fSlot], this.foes, this.field, isSpread)
            : 0;
          const d1 = fSlot === '1' ? estDamageRatio : 0;
          const d2 = fSlot === '2' ? estDamageRatio : 0;
          candidates.push({
            str: `move ${m + 1} ${fSlot}`,
            type,
            move,
            moveData,
            targetFoe: fSlot,
            isSpread,
            allyImmune,
            d1,
            d2,
            estDamageRatio,
            isImmune,
            isMega: canMega,
            slotIndex
          });
        }
      }
    }

    // Tactical Switches (only if not trapped)
    if (!activeData.trapped) {
      const curTypes = monCtx.types || ['Normal'];
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
            isSwitch: true,
            switchTarget: s,
            benchMon: { details: p.details, types: bTypes, condition: p.condition },
            isThreatEscape: curTakesSuper,
            hasImmunity,
            resistsFoe,
            benchHpRatio: bMaxHp ? bHp / bMaxHp : 1.0,
            isImmune: false,
            slotIndex
          });
        }
      }
    }

    // Filter out guaranteed immune attacks if any valid non-immune option exists
    const nonImmune = candidates.filter(c => !c.isImmune);
    const finalCands = nonImmune.length > 0 ? nonImmune : candidates;

    if (!finalCands.length) finalCands.push({ str: 'default', type: 'pass', slotIndex });
    return finalCands;
  }
}

async function runMatch(p1Team, p2Team, p1LeadOrder, p2LeadOrder, seed, currentWeights) {
  // Pack full 6-Pokémon teams so team preview leadOrder can pick any 4 of the 6 Pokémon!
  const p1Packed = Teams.pack(p1Team);
  const p2Packed = Teams.pack(p2Team);

  const streams = BattleStreams.getPlayerStreams(new BattleStreams.BattleStream());
  const spec = { formatid: '[Gen 9 Champions] VGC 2026 Reg M-C', seed };

  const p1Bot = new FastSimBot(streams.p1, { player: 'p1', leadOrder: p1LeadOrder }, currentWeights);
  const p2Bot = new FastSimBot(streams.p2, { player: 'p2', leadOrder: p2LeadOrder }, currentWeights);

  p1Bot.start();
  p2Bot.start();

  streams.omniscient.write(`>start ${JSON.stringify(spec)}\n` +
    `>player p1 {"name":"P1","team":"${p1Packed}"}\n` +
    `>player p2 {"name":"P2","team":"${p2Packed}"}`);

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
    p1TurnBlunders: p1Bot.turnBlunderFlags,
    p2TurnBlunders: p2Bot.turnBlunderFlags,
    p1Won: p1Won ? 1.0 : -1.0,
    p2Won: p1Won ? -1.0 : 1.0,
    p1Blunders: p1Bot.blunders,
    p2Blunders: p2Bot.blunders
  };
}

// IPC Message from parent
process.on('message', async (task) => {
  const { count, startSeed, weightsPath } = task;
  let weights = null;
  if (weightsPath && fs.existsSync(weightsPath)) {
    try { weights = JSON.parse(fs.readFileSync(weightsPath, 'utf8')); } catch (e) {}
  }

  const aggBlunders = {
    immuneAttacks: 0,
    doubleProtectFails: 0,
    friendlyFireHits: 0,
    speedConflicts: 0
  };
  const dataset = [];
  const numTeams = ALL_TEAMS.length;

  for (let m = 0; m < count; m++) {
    // Pair all 12x12 team matchups instead of only adjacent indices
    const pairIdx = startSeed + m;
    const idxA = pairIdx % numTeams;
    const offsetB = 1 + (Math.floor(pairIdx / numTeams) % (numTeams - 1));
    const idxB = (idxA + offsetB) % numTeams;

    const tA = ALL_TEAMS[idxA];
    const tB = ALL_TEAMS[idxB];

    // Diverse 4-out-of-6 picks & leads so slots 5 & 6 are trained just as much as slots 1..4
    const p1LeadOrder = generateLeadOrders(tA.length, pairIdx * 7 + 3);
    const p2LeadOrder = generateLeadOrders(tB.length, pairIdx * 13 + 5);

    const seed = [startSeed * 1000 + m * 7 + 1, m * 13 + 3, m * 29 + 5, m * 41 + 7];

    try {
      const res = await runMatch(tA, tB, p1LeadOrder, p2LeadOrder, seed, weights);
      aggBlunders.immuneAttacks += (res.p1Blunders.immuneAttacks + res.p2Blunders.immuneAttacks);
      aggBlunders.doubleProtectFails += (res.p1Blunders.doubleProtectFails + res.p2Blunders.doubleProtectFails);
      aggBlunders.friendlyFireHits += (res.p1Blunders.friendlyFireHits + res.p2Blunders.friendlyFireHits);
      aggBlunders.speedConflicts += (res.p1Blunders.speedConflicts + res.p2Blunders.speedConflicts);

      // Collect decisive turns with turn-level credit assignment (penalize turns that caused blunders)
      for (const traj of res.p1Trajectories) {
        const hadBlunder = traj.hadBlunder || res.p1TurnBlunders[traj.turn];
        const shapedReward = hadBlunder ? -1.0 : res.p1Won;
        dataset.push({ features: traj.features, chosenIndex: traj.chosenIndex, reward: shapedReward });
      }
      for (const traj of res.p2Trajectories) {
        const hadBlunder = traj.hadBlunder || res.p2TurnBlunders[traj.turn];
        const shapedReward = hadBlunder ? -1.0 : res.p2Won;
        dataset.push({ features: traj.features, chosenIndex: traj.chosenIndex, reward: shapedReward });
      }
    } catch (e) {}
  }

  // Subsample to target key samples per subworker
  const targetPerWorker = task.targetPerWorker || 1000;
  const sampled = [];
  const step = Math.max(1, Math.floor(dataset.length / targetPerWorker));
  for (let i = 0; i < dataset.length && sampled.length < targetPerWorker; i += step) {
    sampled.push(dataset[i]);
  }

  process.send({ blunders: aggBlunders, samples: sampled });
});

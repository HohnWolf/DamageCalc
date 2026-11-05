// Hybride Doppelkampf-KI (Heuristik + Neuronales Netz) für Pokémon Champions ([Gen 9 Champions] VGC 2026 Reg M-C)
// Kombiniert simultane 2v2-Heuristiken (Fokusfeuer, Immunitäts-Filter, Speed-Control, Taktische Switches)
// mit den trainierten PyTorch-Gewichten (data/ai_weights.json) über die 64-dim Feature-Extraktion.

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
} = require('../ml/features.js');

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    const Sim = require('@pkmn/sim');
    module.exports = factory(Sim);
  } else if (typeof root !== 'undefined') {
    root.ChampionsBot = factory(root.PkmnSim || root);
  }
})(typeof self !== 'undefined' ? self : this, function (Sim) {
  'use strict';

  const BattlePlayer = (Sim && Sim.BattleStreams) ? Sim.BattleStreams.BattlePlayer : (Sim && Sim.BattlePlayer);
  const Dex = Sim ? Sim.Dex : null;

  class ChampionsBot extends BattlePlayer {
    constructor(playerStream, options = {}) {
      super(playerStream, options.debug || false);
      this.options = options;
      this.weights = options.weights || null;
      this.leadOrder = options.leadOrder || [1, 2, 3, 4];
      this.dex = options.dex || Dex || null;
      this.megaUsed = false;
      this.turnCount = 0;
      this.slotActiveTurns = [0, 0];

      this.foes = {
        '1': { name: '', types: ['Normal'], ability: '', hpRatio: 1.0, active: false, protectedLastTurn: false, speed: 120, atk: 130, spa: 130, def: 110, spd: 110, maxHp: 180, boosts: { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }, status: '' },
        '2': { name: '', types: ['Normal'], ability: '', hpRatio: 1.0, active: false, protectedLastTurn: false, speed: 120, atk: 130, spa: 130, def: 110, spd: 110, maxHp: 180, boosts: { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }, status: '' }
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

      this.lastAction = [null, null];
    }

    receiveError(error) {
      try {
        this.choose('default');
      } catch (e) {}
    }

    receiveLine(line) {
      super.receiveLine(line);
      this.trackBattleState(line);
    }

    trackBattleState(line) {
      if (!line.startsWith('|')) return;
      const parts = line.split('|');
      const cmd = parts[1];
      const myPrefix = (this.options && this.options.player) ? this.options.player : (this.stream && this.stream.name === 'p1' ? 'p1' : 'p2');
      const foePrefix = myPrefix === 'p1' ? 'p2' : 'p1';

      if (cmd === 'poke') {
        const side = parts[2];
        const details = parts[3] || '';
        const speciesName = details.split(',')[0].trim();
        if (side === foePrefix) {
          if (!this.foeTeamPreview) this.foeTeamPreview = [];
          this.foeTeamPreview.push(speciesName);
        }
      } else if (cmd === 'turn') {
        this.turnCount = parseInt(parts[2], 10) || (this.turnCount + 1);
        this.slotActiveTurns[0]++;
        this.slotActiveTurns[1]++;
        this.foes['1'].protectedLastTurn = false;
        this.foes['2'].protectedLastTurn = false;
      } else if (cmd === 'switch' || cmd === 'drag') {
        const ident = parts[2] || '';
        if (ident.startsWith(foePrefix)) {
          const slot = (ident.includes('b:') || ident.endsWith('b')) ? '2' : '1';
          const details = parts[3] || '';
          const speciesName = details.split(',')[0].trim();
          const condition = parts[4] || '100/100';
          const [hp, maxHp] = condition.split(' ')[0].split('/').map(Number);

          let types = ['Normal'];
          let baseStats = { hp: 100, atk: 100, def: 90, spa: 100, spd: 90, spe: 100 };
          let defAbil = '';
          if (this.dex) {
            const spec = this.dex.species.get(speciesName);
            if (spec) {
              if (spec.types) types = spec.types;
              if (spec.baseStats) baseStats = spec.baseStats;
              if (spec.abilities && spec.abilities['0']) defAbil = spec.abilities['0'];
            }
          }

          const calcDef = baseStats.def + 20 + 32;
          const calcSpD = baseStats.spd + 20 + 32;
          const calcAtk = baseStats.atk + 20 + 32;
          const calcSpA = baseStats.spa + 20 + 32;
          const calcSpe = baseStats.spe + 20 + 32;
          const calcMaxHp = baseStats.hp + 75 + 32;

          this.foes[slot] = {
            name: speciesName,
            types,
            ability: defAbil,
            hpRatio: maxHp ? Math.max(0, hp / maxHp) : 1.0,
            active: !condition.includes('fnt'),
            protectedLastTurn: false,
            speed: calcSpe,
            atk: calcAtk,
            spa: calcSpA,
            def: calcDef,
            spd: calcSpD,
            maxHp: calcMaxHp,
            boosts: { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
            status: ''
          };
        } else if (ident.startsWith(myPrefix)) {
          const mySlotIdx = (ident.includes('b:') || ident.endsWith('b')) ? 1 : 0;
          this.slotActiveTurns[mySlotIdx] = 0;
          if (this.myBoosts && this.myBoosts[mySlotIdx]) {
            this.myBoosts[mySlotIdx] = { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
          }
          if (this.myStatus) this.myStatus[mySlotIdx] = '';
        }
      } else if (cmd === '-damage' || cmd === '-heal') {
        const ident = parts[2] || '';
        if (ident.startsWith(foePrefix)) {
          const slot = (ident.includes('b:') || ident.endsWith('b')) ? '2' : '1';
          const condition = parts[3] || '';
          if (condition.includes('fnt')) {
            this.foes[slot].active = false;
            this.foes[slot].hpRatio = 0;
          } else {
            const [hp, maxHp] = condition.split(' ')[0].split('/').map(Number);
            this.foes[slot].hpRatio = maxHp ? Math.max(0, hp / maxHp) : 0.5;
          }
        }
      } else if (cmd === 'faint') {
        const ident = parts[2] || '';
        if (ident.startsWith(foePrefix)) {
          const slot = (ident.includes('b:') || ident.endsWith('b')) ? '2' : '1';
          this.foes[slot].active = false;
          this.foes[slot].hpRatio = 0;
        }
      } else if (cmd === '-singleturn' && (parts[3] === 'Protect' || parts[3] === 'Detect' || parts[3] === 'Spiky Shield' || parts[3] === 'Baneful Bunker')) {
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
          const slotIdx = (ident.includes('b:') || ident.endsWith('b')) ? 1 : 0;
          if (this.myBoosts && this.myBoosts[slotIdx]) {
            this.myBoosts[slotIdx][stat] = Math.max(-6, Math.min(6, (this.myBoosts[slotIdx][stat] || 0) + amt));
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
          const slotIdx = (ident.includes('b:') || ident.endsWith('b')) ? 1 : 0;
          if (this.myBoosts && this.myBoosts[slotIdx]) {
            this.myBoosts[slotIdx][stat] = Math.max(-6, Math.min(6, amt));
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
          const slotIdx = (ident.includes('b:') || ident.endsWith('b')) ? 1 : 0;
          if (this.myBoosts && this.myBoosts[slotIdx]) {
            this.myBoosts[slotIdx] = { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
          }
        }
      } else if (cmd === '-status') {
        const ident = parts[2] || '';
        const st = parts[3] || '';
        if (ident.startsWith(foePrefix)) {
          const slot = (ident.includes('b:') || ident.endsWith('b')) ? '2' : '1';
          if (this.foes[slot]) this.foes[slot].status = st;
        } else if (ident.startsWith(myPrefix)) {
          const slotIdx = (ident.includes('b:') || ident.endsWith('b')) ? 1 : 0;
          if (this.myStatus) this.myStatus[slotIdx] = st;
        }
      } else if (cmd === '-curestatus') {
        const ident = parts[2] || '';
        if (ident.startsWith(foePrefix)) {
          const slot = (ident.includes('b:') || ident.endsWith('b')) ? '2' : '1';
          if (this.foes[slot]) this.foes[slot].status = '';
        } else if (ident.startsWith(myPrefix)) {
          const slotIdx = (ident.includes('b:') || ident.endsWith('b')) ? 1 : 0;
          if (this.myStatus) this.myStatus[slotIdx] = '';
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
      } else if (cmd === '-mega') {
        const ident = parts[2] || '';
        if (ident.startsWith(myPrefix)) {
          this.megaUsed = true;
        }
      }
    }

    receiveRequest(request) {
      if (request.wait) return;

      if (request.teamPreview) {
        if (!this.options.fixedLeadOrder) {
          this.leadOrder = this.evaluateTeamPreview(request);
        }
        const orderStr = this.leadOrder.join('');
        this.choose(`team ${orderStr}`);
        return;
      }

      if (request.forceSwitch) {
        try {
          const pokemon = request.side.pokemon;
          const chosen = [];
          const choices = request.forceSwitch.map((mustSwitch) => {
            if (!mustSwitch) return 'pass';
            const available = [];
            for (let s = 1; s <= pokemon.length; s++) {
              const p = pokemon[s - 1];
              if (p && !p.active && !p.condition.endsWith('fnt') && !chosen.includes(s)) {
                available.push(s);
              }
            }
            if (!available.length) return 'default';
            available.sort((a, b) => this.scoreBenchSwitchIn(pokemon[b - 1]) - this.scoreBenchSwitchIn(pokemon[a - 1]));
            const target = available[0];
            chosen.push(target);
            return `switch ${target}`;
          });
          this.choose(choices.join(', '));
        } catch (err) {
          try { this.choose('default'); } catch (e) {}
        }
        return;
      }

      if (request.active) {
        this.decideJointTurn(request);
      }
    }

    evaluateTeamPreview(request) {
      const pokemonList = (request.side && request.side.pokemon) ? request.side.pokemon : [];
      const totalMons = pokemonList.length;
      if (totalMons <= 4) {
        return [1, 2, 3, 4].slice(0, totalMons);
      }

      const getMeta = (mon) => {
        const name = (mon.name || mon.species || mon.details || '').split(',')[0].trim();
        const id = name.toLowerCase().replace(/[^a-z0-9]/g, '');
        const moves = (mon.moves || []).map(m => (typeof m === 'string' ? m : m.move || m.name || '').toLowerCase().replace(/[^a-z0-9]/g, ''));
        const ability = (mon.ability || mon.baseAbility || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        const item = (mon.item || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        const isMega = item.endsWith('ite') || item.endsWith('itez') || id.includes('mega');
        return { name, id, moves, ability, item, isMega };
      };

      const metas = pokemonList.map(getMeta);
      const leadPairMap = new Map();

      // Check foe preview context if available
      const foes = (this.foeTeamPreview || []).map(f => f.toLowerCase().replace(/[^a-z0-9]/g, ''));
      const foeHasRain = foes.some(f => f.includes('pelipper') || f.includes('politoed') || f.includes('kyogre'));
      const foeHasTrickRoom = foes.some(f => f.includes('farigiraf') || f.includes('indeedee') || f.includes('dusclops') || f.includes('porygon2') || f.includes('cresselia'));
      const foeHasFakeOut = foes.some(f => f.includes('incineroar') || f.includes('rillaboom') || f.includes('sneasler') || f.includes('raichu') || f.includes('ironhands'));

      for (let i = 1; i <= totalMons; i++) {
        for (let j = i + 1; j <= totalMons; j++) {
          const remaining = [];
          for (let k = 1; k <= totalMons; k++) {
            if (k !== i && k !== j) remaining.push(k);
          }

          let bestSquad = null;
          let maxSquadScore = -999;

          for (let b1Idx = 0; b1Idx < remaining.length; b1Idx++) {
            for (let b2Idx = b1Idx + 1; b2Idx < remaining.length; b2Idx++) {
              const k = remaining[b1Idx];
              const l = remaining[b2Idx];

              const L1 = metas[i - 1];
              const L2 = metas[j - 1];
              const B1 = metas[k - 1];
              const B2 = metas[l - 1];
              const squad = [L1, L2, B1, B2];

              let score = 50;

              // 1. Weather Synergies
              const lSandSetter = L1.ability.includes('sandstream') || L2.ability.includes('sandstream');
              const lSandAbuser = L1.ability.includes('sandrush') || L2.ability.includes('sandrush') || L1.ability.includes('sandforce') || L2.ability.includes('sandforce');
              const bSandSetter = B1.ability.includes('sandstream') || B2.ability.includes('sandstream');
              if (lSandSetter && lSandAbuser) score += 38;
              else if (lSandAbuser && bSandSetter) score += 26;
              else if (lSandSetter) score += 15;

              const lRainSetter = L1.ability.includes('drizzle') || L2.ability.includes('drizzle');
              const lRainAbuser = L1.ability.includes('swiftswim') || L2.ability.includes('swiftswim');
              const bRainSetter = B1.ability.includes('drizzle') || B2.ability.includes('drizzle');
              if (lRainSetter && lRainAbuser) score += 38;
              else if (lRainAbuser && bRainSetter) score += 26;
              else if (lRainSetter) score += 15;

              const lSunSetter = L1.ability.includes('drought') || L2.ability.includes('drought');
              const lSunAbuser = L1.ability.includes('chlorophyll') || L2.ability.includes('chlorophyll') || L1.ability.includes('solarpower') || L2.ability.includes('solarpower') || L1.ability.includes('protosynthesis') || L2.ability.includes('protosynthesis');
              const bSunSetter = B1.ability.includes('drought') || B2.ability.includes('drought');
              if (lSunSetter && lSunAbuser) score += 38;
              else if (lSunAbuser && bSunSetter) score += 26;
              else if (lSunSetter) score += 15;

              const lSnowSetter = L1.ability.includes('snowwarning') || L2.ability.includes('snowwarning');
              const lSnowAbuser = L1.ability.includes('slushrush') || L2.ability.includes('slushrush');
              const bSnowSetter = B1.ability.includes('snowwarning') || B2.ability.includes('snowwarning');
              if (lSnowSetter && lSnowAbuser) score += 30;
              else if (lSnowAbuser && bSnowSetter) score += 20;

              if ((lRainSetter && lSunSetter) || (lSandSetter && lRainSetter) || (lSunSetter && lSandSetter)) {
                score -= 80;
              }

              // 2. Terrain Synergies
              const lPsychicSetter = L1.ability.includes('psychicsurge') || L2.ability.includes('psychicsurge');
              const lPsychicAbuser = L1.moves.includes('expandingforce') || L2.moves.includes('expandingforce') ||
                                      (L1.item.includes('psychicseed') && L1.ability.includes('unburden')) ||
                                      (L2.item.includes('psychicseed') && L2.ability.includes('unburden'));
              const bPsychicSetter = B1.ability.includes('psychicsurge') || B2.ability.includes('psychicsurge');
              if (lPsychicSetter && lPsychicAbuser) score += 36;
              else if (lPsychicAbuser && bPsychicSetter) score += 24;
              else if (lPsychicSetter) score += 14;

              // 3. Disruption / Redirection
              const hasFO1 = L1.moves.includes('fakeout');
              const hasFO2 = L2.moves.includes('fakeout');
              if (hasFO1 && hasFO2) score -= 25;
              else if (hasFO1 || hasFO2) score += 22;

              const hasRedir1 = L1.moves.includes('followme') || L1.moves.includes('ragepowder');
              const hasRedir2 = L2.moves.includes('followme') || L2.moves.includes('ragepowder');
              if (hasRedir1 && hasRedir2) score -= 25;
              else if (hasRedir1 || hasRedir2) score += 22;

              // 4. Speed Control (Tailwind / Trick Room)
              const hasTW1 = L1.moves.includes('tailwind');
              const hasTW2 = L2.moves.includes('tailwind');
              if (hasTW1 && hasTW2) score -= 25;
              else if (hasTW1 || hasTW2) score += 24;

              const hasTR1 = L1.moves.includes('trickroom');
              const hasTR2 = L2.moves.includes('trickroom');
              if (hasTR1 && hasTR2) score -= 25;
              else if (hasTR1 || hasTR2) score += 28;

              if ((hasTR1 || hasTR2) && (L1.moves.includes('eruption') || L2.moves.includes('eruption') || L1.id.includes('conkeldurr') || L2.id.includes('conkeldurr') || L1.id.includes('torkoal') || L2.id.includes('torkoal') || L1.id.includes('ursaluna') || L2.id.includes('ursaluna'))) {
                score += 20;
              }

              // 5. Utility & Defense (Intimidate, Armor Tail, Prankster)
              const hasIntimidate = L1.ability.includes('intimidate') || L2.ability.includes('intimidate');
              if (hasIntimidate) score += 16;

              const hasAntiPriority = L1.ability.includes('armortail') || L2.ability.includes('armortail') || L1.ability.includes('dazzling') || L2.ability.includes('dazzling') || lPsychicSetter;
              if (foeHasFakeOut && hasAntiPriority) score += 18;

              if (foeHasTrickRoom && (L1.moves.includes('imprison') || L2.moves.includes('imprison') || L1.moves.includes('taunt') || L2.moves.includes('taunt'))) {
                score += 20;
              }

              // 6. Mega Evolution Constraint (1 Mega in squad)
              const megasInSquad = squad.filter(m => m.isMega).length;
              const totalMegasInTeam = metas.filter(m => m.isMega).length;
              if (megasInSquad === 1) score += 25;
              else if (megasInSquad > 1) score -= 50;
              else if (megasInSquad === 0 && totalMegasInTeam > 0) score -= 20;

              // 7. Bench Cleaners & Coverage
              const hasPriorityBench = B1.moves.some(m => ['extremespeed', 'suckerpunch', 'lastrespects', 'machpunch', 'shadowsneak'].includes(m)) ||
                                       B2.moves.some(m => ['extremespeed', 'suckerpunch', 'lastrespects', 'machpunch', 'shadowsneak'].includes(m));
              if (hasPriorityBench) score += 14;

              const hasScarfBench = B1.item.includes('choicescarf') || B2.item.includes('choicescarf');
              if (hasScarfBench) score += 12;

              if (score > maxSquadScore) {
                maxSquadScore = score;
                bestSquad = [i, j, k, l];
              }
            }
          }

          leadPairMap.set(`${i}-${j}`, { order: bestSquad, score: maxSquadScore });
        }
      }

      const allPairs = Array.from(leadPairMap.values()).filter(p => p.order);
      if (!allPairs.length) return [1, 2, 3, 4];

      allPairs.sort((a, b) => b.score - a.score);
      const topScore = allPairs[0].score;

      // Filter viable lead combinations (within 24 points of top score)
      const viable = allPairs.filter(p => p.score >= topScore - 24);

      // Boltzmann / Softmax probability distribution with temperature 13
      const temp = 13;
      const weights = viable.map(p => Math.exp((p.score - topScore) / temp));
      const totalWeight = weights.reduce((sum, w) => sum + w, 0);
      let rand = Math.random() * totalWeight;

      let chosenOrder = viable[0].order;
      for (let idx = 0; idx < viable.length; idx++) {
        rand -= weights[idx];
        if (rand <= 0 || idx === viable.length - 1) {
          chosenOrder = viable[idx].order;
          break;
        }
      }

      // Randomize whether Lead 1 is in slot A or slot B (50/50 order)
      if (Math.random() < 0.5) {
        return [chosenOrder[1], chosenOrder[0], chosenOrder[2], chosenOrder[3]];
      }
      return chosenOrder;
    }

    scoreBenchSwitchIn(p) {
      if (!p) return -999;
      const spec = this.dex ? this.dex.species.get(p.details.split(',')[0]) : null;
      const bTypes = spec?.types || ['Normal'];
      const [hp, maxHp] = (p.condition || '100/100').split(' ')[0].split('/').map(Number);
      let score = maxHp ? (hp / maxHp) * 2.0 : 1.0;
      for (const fSlot of ['1', '2']) {
        const foe = this.foes[fSlot];
        if (foe && foe.active) {
          for (const ft of (foe.types || ['Normal'])) {
            const eff = getTypeEff(ft, bTypes);
            if (eff === 0) score += 4.0;
            else if (eff <= 0.5) score += 2.0;
            else if (eff >= 2.0) score -= 2.5;
          }
        }
      }
      return score;
    }

    buildMonContext(mon, slotIndex, allSideMons) {
      if (!mon) return { name: '', types: ['Normal'], ability: '', hpRatio: 0, activeTurns: 1, atk: 120, def: 110, spa: 120, spd: 110, spe: 100, faintedAllies: 0, boosts: { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }, status: '', item: '' };
      const name = mon.details.split(',')[0].trim();
      const spec = this.dex ? this.dex.species.get(name) : null;
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

    // Hybride Entscheidung (Heuristik + Neuronales Netz) für beide aktive Slots gemeinsam
    decideJointTurn(request) {
      const activeList = request.active;
      const sideMons = request.side.pokemon;
      const monCtx0 = this.buildMonContext(sideMons[0], 0, sideMons);
      const monCtx1 = this.buildMonContext(sideMons[1], 1, sideMons);

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

      const slot0Candidates = this.generateSlotCandidates(0, activeList[0], sideMons[0], monCtx0, monCtx1, sideMons);
      const slot1Candidates = activeList.length > 1
        ? this.generateSlotCandidates(1, activeList[1], sideMons[1], monCtx1, monCtx0, sideMons)
        : [{ str: 'pass', type: 'pass' }];

      let bestPair = null;
      let highestScore = -Infinity;

      for (const c0 of slot0Candidates) {
        const act0Vec = extractActionFeatures(c0, monCtx0, this.foes, this.field);
        for (const c1 of slot1Candidates) {
          if (c0.isMega && c1.isMega) continue;
          if (c0.isSwitch && c1.isSwitch && c0.switchSlot === c1.switchSlot) continue;

          const heurScore = this.evaluateJointAction(c0, c1, monCtx0, monCtx1);
          let neuralScore = 0;
          if (this.weights) {
            const act1Vec = extractActionFeatures(c1, monCtx1, this.foes, this.field);
            const jointVec = extractJointFeatures(stateVec, act0Vec, act1Vec, c0, c1, this.field, this.foes);
            neuralScore = evaluateNeuralForward(jointVec, this.weights) * 140.0;
          }

          const totalScore = heurScore + neuralScore;
          if (totalScore > highestScore) {
            highestScore = totalScore;
            bestPair = [c0, c1];
          }
        }
      }

      if (!bestPair) {
        bestPair = [slot0Candidates[0] || { str: 'pass' }, slot1Candidates[0] || { str: 'pass' }];
      }

      if (bestPair[0].isMega || bestPair[1].isMega) {
        this.megaUsed = true;
      }

      this.lastAction[0] = bestPair[0].type;
      this.lastAction[1] = bestPair[1].type;

      if (activeList.length === 1 || !sideMons[1] || sideMons[1].condition?.endsWith('fnt')) {
        this.choose(bestPair[0].str);
      } else {
        this.choose(`${bestPair[0].str}, ${bestPair[1].str}`);
      }
    }

    generateSlotCandidates(slotIndex, active, mon, monCtx, allyCtx, myPokemon) {
      if (!active || !mon || mon.condition.endsWith('fnt') || mon.commanding) {
        return [{ str: 'pass', type: 'pass' }];
      }

      const candidates = [];
      const moves = active.moves || [];
      const canMega = !this.megaUsed && !!active.canMegaEvo;

      const foe1Active = this.foes['1'].active;
      const foe2Active = this.foes['2'].active;

      for (let j = 0; j < moves.length; j++) {
        const m = moves[j];
        if (m.disabled || m.pp <= 0) continue;

        const slot = j + 1;
        const moveData = this.dex ? this.dex.moves.get(m.id) : { id: m.id, basePower: 60, type: 'Normal', category: 'Physical' };
        const isSpread = m.target === 'allAdjacentFoes' || m.target === 'allAdjacent' ||
          (m.id === 'expandingforce' && this.field.terrain === 'psychic' && isGrounded(monCtx, this.field));
        const isStatus = moveData ? moveData.category === 'Status' : false;

        // Fake Out / First Impression sind nur in Aktiv-Runde 1 erlaubt
        if ((m.id === 'fakeout' || m.id === 'firstimpression') && monCtx.activeTurns > 1) {
          continue;
        }

        if (isStatus) {
          if (m.id === 'protect' || m.id === 'detect' || m.id === 'spikyshield' || m.id === 'banefulbunker') {
            if (this.lastAction[slotIndex] !== 'protect') {
              candidates.push({ str: `move ${slot}`, type: 'protect', move: m, moveData, isImmune: false, slotIndex });
            }
          } else if (m.id === 'tailwind' && !this.field.myTailwind) {
            candidates.push({ str: `move ${slot}`, type: 'tailwind', move: m, moveData, isImmune: false, slotIndex });
          } else if (m.id === 'trickroom') {
            candidates.push({ str: `move ${slot}`, type: 'trickroom', move: m, moveData, isImmune: false, slotIndex });
          } else if (m.id === 'imprison' && !this.field.imprisonActive) {
            candidates.push({ str: `move ${slot}`, type: 'imprison', move: m, moveData, isImmune: false, slotIndex });
          } else if (['calmmind', 'nastyplot', 'swordsdance', 'quiverdance', 'bulkup', 'clangoroussoul'].includes(m.id)) {
            candidates.push({ str: `move ${slot}`, type: 'setup', move: m, moveData, isImmune: false, slotIndex });
          } else if (m.id === 'wideguard') {
            candidates.push({ str: `move ${slot}`, type: 'wideguard', move: m, moveData, isImmune: false, slotIndex });
          } else if (m.id === 'reflect' || m.id === 'lightscreen' || m.id === 'auroraveil') {
            candidates.push({ str: `move ${slot}`, type: 'screens', move: m, moveData, isImmune: false, slotIndex });
          } else if (m.id === 'followme' || m.id === 'ragepowder') {
            candidates.push({ str: `move ${slot}`, type: 'redirect', move: m, moveData, isImmune: false, slotIndex });
          } else if (m.id === 'helpinghand') {
            candidates.push({ str: `move ${slot} -${slotIndex === 0 ? 2 : 1}`, type: 'helpinghand', move: m, moveData, isImmune: false, slotIndex });
          } else if (m.target === 'self' || m.target === 'allySide' || m.target === 'all') {
            candidates.push({ str: `move ${slot}`, type: 'status_self', move: m, moveData, isImmune: false, slotIndex });
          } else if (m.target === 'adjacentAlly') {
            candidates.push({ str: `move ${slot} -${slotIndex === 0 ? 2 : 1}`, type: 'status_ally', move: m, moveData, isImmune: false, slotIndex });
          } else {
            if (foe1Active) {
              const imm1 = isMoveImmuneOrBlocked(moveData, monCtx, this.foes['1'], this.foes, this.field);
              if (!imm1) candidates.push({ str: `move ${slot} 1`, type: 'status', targetFoe: '1', move: m, moveData, isImmune: false, slotIndex });
            }
            if (foe2Active) {
              const imm2 = isMoveImmuneOrBlocked(moveData, monCtx, this.foes['2'], this.foes, this.field);
              if (!imm2) candidates.push({ str: `move ${slot} 2`, type: 'status', targetFoe: '2', move: m, moveData, isImmune: false, slotIndex });
            }
          }
          continue;
        }

        // Check ally immunity for 'allAdjacent' moves (Earthquake, Surf, Discharge)
        let allyImmune = false;
        if (m.target === 'allAdjacent' && allyCtx) {
          const effMoveType = getEffectiveMoveType(moveData, monCtx, this.field);
          if (effMoveType === 'Ground' && !isGrounded(allyCtx, this.field)) allyImmune = true;
          else if (getTypeEff(effMoveType, allyCtx.types || ['Normal']) === 0) allyImmune = true;
        }

        const isUntargetedSpread = (m.target === 'allAdjacentFoes' || m.target === 'allAdjacent');
        if (isUntargetedSpread) {
          const d1 = foe1Active ? estimateDamageRatio(moveData, monCtx, this.foes['1'], this.foes, this.field, true) : 0;
          const d2 = foe2Active ? estimateDamageRatio(moveData, monCtx, this.foes['2'], this.foes, this.field, true) : 0;
          const imm1 = !foe1Active || isMoveImmuneOrBlocked(moveData, monCtx, this.foes['1'], this.foes, this.field);
          const imm2 = !foe2Active || isMoveImmuneOrBlocked(moveData, monCtx, this.foes['2'], this.foes, this.field);
          const isImmune = (imm1 && imm2);
          const estDamageRatio = d1 + d2;

          candidates.push({ str: `move ${slot}`, type: 'attack', isSpread: true, allyImmune, d1, d2, estDamageRatio, isImmune, move: m, moveData, slotIndex });
          if (canMega) {
            candidates.push({ str: `move ${slot} mega`, type: 'attack', isSpread: true, isMega: true, allyImmune, d1, d2, estDamageRatio, isImmune, move: m, moveData, slotIndex });
          }
        } else {
          for (const fSlot of ['1', '2']) {
            if (!this.foes[fSlot].active && (foe1Active || foe2Active)) continue;
            const isImmune = isMoveImmuneOrBlocked(moveData, monCtx, this.foes[fSlot], this.foes, this.field);
            const estDamageRatio = isImmune ? 0 : estimateDamageRatio(moveData, monCtx, this.foes[fSlot], this.foes, this.field, isSpread);
            const d1 = fSlot === '1' ? estDamageRatio : 0;
            const d2 = fSlot === '2' ? estDamageRatio : 0;
            candidates.push({ str: `move ${slot} ${fSlot}`, type: 'attack', targetFoe: fSlot, isSpread, allyImmune, d1, d2, estDamageRatio, isImmune, move: m, moveData, slotIndex });
            if (canMega) {
              candidates.push({ str: `move ${slot} ${fSlot} mega`, type: 'attack', targetFoe: fSlot, isSpread, isMega: true, allyImmune, d1, d2, estDamageRatio, isImmune, move: m, moveData, slotIndex });
            }
          }
        }
      }

      // Taktische Auswechslungen (Switches), sofern nicht gefangen (trapped)
      if (!active.trapped) {
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

        for (let s = 1; s <= myPokemon.length; s++) {
          const p = myPokemon[s - 1];
          if (p && !p.active && !p.condition.endsWith('fnt')) {
            const bSpec = this.dex ? this.dex.species.get(p.details.split(',')[0]) : null;
            const bTypes = bSpec?.types || ['Normal'];
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
              switchSlot: s,
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

      const validNonImmune = candidates.filter(c => !c.isImmune);
      const finalCands = validNonImmune.length > 0 ? validNonImmune : candidates;

      if (!finalCands.length) {
        finalCands.push({ str: `move 1 1`, type: 'attack', targetFoe: '1', slotIndex });
      }

      return finalCands;
    }

    evaluateJointAction(c0, c1, monCtx0, monCtx1) {
      let score = 0;
      const f1Hp = this.foes['1'].active ? this.foes['1'].hpRatio : 0;
      const f2Hp = this.foes['2'].active ? this.foes['2'].hpRatio : 0;

      // 1. Strenge Bestrafung für immune/blockierte Angriffe
      if (c0.isImmune) score -= 1200;
      if (c1.isImmune) score -= 1200;

      // 2. Doppel-Protect & Folge-Protect Bestrafung
      if (c0.type === 'protect' && this.lastAction[0] === 'protect') score -= 900;
      if (c1.type === 'protect' && this.lastAction[1] === 'protect') score -= 900;
      if (c0.type === 'protect' && c1.type === 'protect') score -= 350;

      // 3. Taktischer Schutz bei niedrigen KP
      if (c0.type === 'protect' && monCtx0.hpRatio < 0.35 && this.lastAction[0] !== 'protect') score += 110;
      if (c1.type === 'protect' && monCtx1.hpRatio < 0.35 && this.lastAction[1] !== 'protect') score += 110;

      // 4. Mogelhieb (Fake Out) nur in Aktiv-Runde 1
      if (c0.move && c0.move.id === 'fakeout' && !c0.isImmune && monCtx0.activeTurns === 1) {
        score += 190;
        if (c0.targetFoe && this.foes[c0.targetFoe]?.protectedLastTurn) score += 40;
      }
      if (c1.move && c1.move.id === 'fakeout' && !c1.isImmune && monCtx1.activeTurns === 1) {
        score += 190;
        if (c1.targetFoe && this.foes[c1.targetFoe]?.protectedLastTurn) score += 40;
      }

      // 5. Speed-Control (Tailwind / Trick Room)
      if ((c0.type === 'tailwind' && c1.type === 'trickroom') || (c0.type === 'trickroom' && c1.type === 'tailwind')) {
        score -= 1000;
      }
      const ourRawSpe = ((monCtx0.spe || 120) + (monCtx1.spe || 120)) * 0.5;
      const foeRawSpe = ((this.foes['1'].speed || 120) + (this.foes['2'].speed || 120)) * 0.5;

      if (c0.type === 'tailwind' || c1.type === 'tailwind') {
        if (this.field.myTailwind || this.field.trickRoom) score -= 500;
        else if (this.field.foeTailwind || ourRawSpe <= foeRawSpe + 15) score += 130;
      }
      if (c0.type === 'trickroom' || c1.type === 'trickroom') {
        if (!this.field.trickRoom && ourRawSpe < foeRawSpe - 10) score += 150;
        else if (this.field.trickRoom && ourRawSpe > foeRawSpe + 10) score += 150;
        else score -= 600;
      }

      // 6. Friendly-Fire Schutz bei 'allAdjacent' (Erdbeben / Surfer / Ladungsstoß)
      if (c0.moveData?.target === 'allAdjacent' && c1.type !== 'protect' && !c0.allyImmune) score -= 800;
      if (c1.moveData?.target === 'allAdjacent' && c0.type !== 'protect' && !c1.allyImmune) score -= 800;

      // 7. Kombinierter Schaden & Fokusfeuer-K.O.
      const dmgToFoe1 = (c0.d1 || 0) + (c1.d1 || 0);
      const dmgToFoe2 = (c0.d2 || 0) + (c1.d2 || 0);

      if (this.foes['1'].active) {
        score += dmgToFoe1 * (this.foes['1'].protectedLastTurn ? 135 : 110);
        if (dmgToFoe1 >= f1Hp) score += 480;
      }
      if (this.foes['2'].active) {
        score += dmgToFoe2 * (this.foes['2'].protectedLastTurn ? 135 : 110);
        if (dmgToFoe2 >= f2Hp) score += 480;
      }

      // 8. Taktische Switches bewerten
      if (c0.type === 'switch' && c1.type === 'switch') score -= 250;
      const evalSwitch = (c) => {
        let sw = -35;
        if (c.isThreatEscape) sw += 95;
        if (c.hasImmunity) sw += 110;
        else if (c.resistsFoe) sw += 55;
        if (c.benchHpRatio < 0.35) sw -= 90;
        return sw;
      };
      if (c0.type === 'switch') score += evalSwitch(c0);
      if (c1.type === 'switch') score += evalSwitch(c1);

      // 9. Support-Synergien (Redirect, Helping Hand, Setup)
      if ((c0.type === 'redirect' && (c1.type === 'setup' || c1.type === 'trickroom' || c1.type === 'attack')) ||
          (c1.type === 'redirect' && (c0.type === 'setup' || c0.type === 'trickroom' || c0.type === 'attack'))) {
        score += 110;
      }
      if ((c0.type === 'helpinghand' && c1.type === 'attack' && !c1.isImmune) ||
          (c1.type === 'helpinghand' && c0.type === 'attack' && !c0.isImmune)) {
        score += 95;
      }

      if (c0.isMega || c1.isMega) {
        score += 65;
      }

      return score;
    }
  }

  return ChampionsBot;
});

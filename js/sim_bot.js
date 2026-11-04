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
        '1': { name: '', types: ['Normal'], ability: '', hpRatio: 1.0, active: false, protectedLastTurn: false, speed: 120, atk: 130, spa: 130, def: 110, spd: 110, maxHp: 180 },
        '2': { name: '', types: ['Normal'], ability: '', hpRatio: 1.0, active: false, protectedLastTurn: false, speed: 120, atk: 130, spa: 130, def: 110, spd: 110, maxHp: 180 }
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

      if (cmd === 'turn') {
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
            maxHp: calcMaxHp
          };
        } else if (ident.startsWith(myPrefix)) {
          const mySlotIdx = (ident.includes('b:') || ident.endsWith('b')) ? 1 : 0;
          this.slotActiveTurns[mySlotIdx] = 0;
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
        } else if (effect.includes('Reflect') && isMine) {
          this.field.myReflect = true;
        } else if (effect.includes('Light Screen') && isMine) {
          this.field.myLightScreen = true;
        }
      } else if (cmd === '-sideend') {
        const side = parts[2] || '';
        const effect = parts[3] || '';
        const isMine = side.startsWith(myPrefix);
        if (effect.includes('Tailwind')) {
          if (isMine) this.field.myTailwind = false;
          else this.field.foeTailwind = false;
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
      if (!mon) return { name: '', types: ['Normal'], ability: '', hpRatio: 0, activeTurns: 1, atk: 120, spa: 120, spe: 100, faintedAllies: 0 };
      const name = mon.details.split(',')[0].trim();
      const spec = this.dex ? this.dex.species.get(name) : null;
      const [hp, maxHp] = (mon.condition || '100/100').split(' ')[0].split('/').map(Number);
      const faintedAllies = (allSideMons || []).filter(m => m && m.condition && m.condition.endsWith('fnt')).length;
      return {
        name,
        types: spec?.types || ['Normal'],
        ability: mon.ability || mon.baseAbility || spec?.abilities?.['0'] || '',
        hpRatio: maxHp ? hp / maxHp : 1.0,
        activeTurns: Math.max(1, this.slotActiveTurns[slotIndex] || 1),
        atk: mon.stats?.atk || 130,
        spa: mon.stats?.spa || 130,
        spe: mon.stats?.spe || 120,
        faintedAllies
      };
    }

    // Hybride Entscheidung (Heuristik + Neuronales Netz) für beide aktive Slots gemeinsam
    decideJointTurn(request) {
      const activeList = request.active;
      const sideMons = request.side.pokemon;
      const monCtx0 = this.buildMonContext(sideMons[0], 0, sideMons);
      const monCtx1 = this.buildMonContext(sideMons[1], 1, sideMons);

      const myMult = this.field.myTailwind ? 2.0 : 1.0;
      const foeMult = this.field.foeTailwind ? 2.0 : 1.0;
      const myAvgSpe = ((monCtx0.spe + monCtx1.spe) * 0.5) * myMult;
      const foeAvgSpe = (((this.foes['1'].speed || 120) + (this.foes['2'].speed || 120)) * 0.5) * foeMult;
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

          candidates.push({ str: `move ${slot}`, type: 'attack', isSpread: true, allyImmune, estDamageRatio, isImmune, move: m, moveData, slotIndex });
          if (canMega) {
            candidates.push({ str: `move ${slot} mega`, type: 'attack', isSpread: true, isMega: true, allyImmune, estDamageRatio, isImmune, move: m, moveData, slotIndex });
          }
        } else {
          for (const fSlot of ['1', '2']) {
            if (!this.foes[fSlot].active && (foe1Active || foe2Active)) continue;
            const isImmune = isMoveImmuneOrBlocked(moveData, monCtx, this.foes[fSlot], this.foes, this.field);
            const estDamageRatio = isImmune ? 0 : estimateDamageRatio(moveData, monCtx, this.foes[fSlot], this.foes, this.field, isSpread);
            candidates.push({ str: `move ${slot} ${fSlot}`, type: 'attack', targetFoe: fSlot, isSpread, allyImmune, estDamageRatio, isImmune, move: m, moveData, slotIndex });
            if (canMega) {
              candidates.push({ str: `move ${slot} ${fSlot} mega`, type: 'attack', targetFoe: fSlot, isSpread, isMega: true, allyImmune, estDamageRatio, isImmune, move: m, moveData, slotIndex });
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
      let dmgToFoe1 = 0;
      let dmgToFoe2 = 0;

      if (c0.type === 'attack' && !c0.isImmune) {
        const d0 = c0.estDamageRatio || 0;
        if (c0.isSpread) { dmgToFoe1 += d0; dmgToFoe2 += d0; }
        else if (c0.targetFoe === '1') dmgToFoe1 += d0;
        else if (c0.targetFoe === '2') dmgToFoe2 += d0;
      }
      if (c1.type === 'attack' && !c1.isImmune) {
        const d1 = c1.estDamageRatio || 0;
        if (c1.isSpread) { dmgToFoe1 += d1; dmgToFoe2 += d1; }
        else if (c1.targetFoe === '1') dmgToFoe1 += d1;
        else if (c1.targetFoe === '2') dmgToFoe2 += d1;
      }

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

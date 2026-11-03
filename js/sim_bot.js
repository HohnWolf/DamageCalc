// Heuristische Doppelkampf-Minimax-Lookahead-Engine für Pokémon Champions ([Gen 9 Champions] VGC 2026 Reg M-C)
// Simuliert simultane 2v2-Züge, Fokusfeuer (K.O.-Kombinationen), Protect-Reads, Speed-Tiers und Feld-Kontrolle.
// Funktioniert sowohl in Node.js als auch im Browser / Web Worker.

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

  // Typen-Tabelle für schnelle Schadensabschätzung (Gen 6-9)
  const TYPE_CHART = {
    Normal:   { Rock: 0.5, Ghost: 0, Steel: 0.5 },
    Fire:     { Fire: 0.5, Water: 0.5, Grass: 2, Ice: 2, Bug: 2, Rock: 0.5, Dragon: 0.5, Steel: 2 },
    Water:    { Fire: 2, Water: 0.5, Grass: 0.5, Ground: 2, Rock: 2, Dragon: 0.5 },
    Electric: { Water: 2, Electric: 0.5, Grass: 0.5, Ground: 0, Flying: 2, Dragon: 0.5 },
    Grass:    { Fire: 0.5, Water: 2, Grass: 0.5, Poison: 0.5, Ground: 2, Flying: 0.5, Bug: 0.5, Rock: 2, Dragon: 0.5, Steel: 0.5 },
    Ice:      { Fire: 0.5, Water: 0.5, Grass: 2, Ice: 0.5, Ground: 2, Flying: 2, Dragon: 2, Steel: 0.5 },
    Fighting: { Normal: 2, Ice: 2, Poison: 0.5, Flying: 0.5, Psychic: 0.5, Bug: 0.5, Rock: 2, Ghost: 0, Dark: 2, Steel: 2, Fairy: 0.5 },
    Poison:   { Grass: 2, Poison: 0.5, Ground: 0.5, Rock: 0.5, Ghost: 0.5, Steel: 0, Fairy: 2 },
    Ground:   { Fire: 2, Electric: 2, Grass: 0.5, Poison: 2, Flying: 0, Bug: 0.5, Rock: 2, Steel: 2 },
    Flying:   { Electric: 0.5, Grass: 2, Fighting: 2, Bug: 2, Rock: 0.5, Steel: 0.5 },
    Psychic:  { Fighting: 2, Poison: 2, Psychic: 0.5, Dark: 0, Steel: 0.5 },
    Bug:      { Fire: 0.5, Grass: 2, Fighting: 0.5, Poison: 0.5, Flying: 0.5, Psychic: 2, Ghost: 0.5, Steel: 0.5, Fairy: 0.5 },
    Rock:     { Fire: 2, Ice: 2, Fighting: 0.5, Ground: 0.5, Flying: 2, Bug: 2, Steel: 0.5 },
    Ghost:    { Normal: 0, Psychic: 2, Ghost: 2, Dark: 0.5 },
    Dragon:   { Dragon: 2, Steel: 0.5, Fairy: 0 },
    Dark:     { Fighting: 0.5, Psychic: 2, Ghost: 2, Dark: 0.5, Fairy: 0.5 },
    Steel:    { Fire: 0.5, Water: 0.5, Electric: 0.5, Ice: 2, Rock: 2, Steel: 0.5, Fairy: 2 },
    Fairy:    { Fire: 0.5, Fighting: 2, Poison: 0.5, Dragon: 2, Dark: 2, Steel: 0.5 }
  };

  function getTypeEff(attackType, defenderTypes) {
    if (!attackType || !defenderTypes || !defenderTypes.length) return 1.0;
    const row = TYPE_CHART[attackType] || {};
    let eff = 1.0;
    for (const dt of defenderTypes) {
      if (dt in row) eff *= row[dt];
    }
    return eff;
  }

  class ChampionsBot extends BattlePlayer {
    constructor(playerStream, options = {}) {
      super(playerStream, options.debug || false);
      this.options = options;
      this.leadOrder = options.leadOrder || [1, 2, 3, 4];
      this.dex = options.dex || Dex || null;
      this.megaUsed = false;
      this.turnCount = 0;

      this.foes = {
        '1': { name: '', types: ['Normal'], hpRatio: 1.0, active: false, protectedLastTurn: false, speed: 100, atk: 120, spa: 120, def: 90, spd: 90, maxHp: 180 },
        '2': { name: '', types: ['Normal'], hpRatio: 1.0, active: false, protectedLastTurn: false, speed: 100, atk: 120, spa: 120, def: 90, spd: 90, maxHp: 180 }
      };

      this.field = {
        weather: 'none',
        terrain: 'none',
        trickRoom: false,
        myTailwind: false,
        foeTailwind: false,
        myReflect: false,
        myLightScreen: false
      };

      this.lastAction = [null, null];
    }

    receiveError(error) {
      // Fehler sicher abfangen, damit die Simulation NIEMALS blockiert
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
      const myPrefix = this.stream && this.stream.name === 'p1' ? 'p1' : 'p2';
      const foePrefix = myPrefix === 'p1' ? 'p2' : 'p1';

      if (cmd === 'turn') {
        this.turnCount = parseInt(parts[2], 10) || (this.turnCount + 1);
        this.foes['1'].protectedLastTurn = false;
        this.foes['2'].protectedLastTurn = false;
      } else if (cmd === 'switch' || cmd === 'drag') {
        const ident = parts[2];
        if (ident.startsWith(foePrefix)) {
          const slot = ident.includes('b:') ? '2' : '1';
          const details = parts[3] || '';
          const speciesName = details.split(',')[0].trim();
          const condition = parts[4] || '100/100';
          const [hp, maxHp] = condition.split(' ')[0].split('/').map(Number);

          let types = ['Normal'];
          let baseStats = { hp: 100, atk: 100, def: 90, spa: 100, spd: 90, spe: 100 };
          if (this.dex) {
            const spec = this.dex.species.get(speciesName);
            if (spec) {
              if (spec.types) types = spec.types;
              if (spec.baseStats) baseStats = spec.baseStats;
            }
          }

          // Champions SP-Formel für Standard-Gegner-Statuswerte (32 SPs)
          const calcDef = baseStats.def + 20 + 32;
          const calcSpD = baseStats.spd + 20 + 32;
          const calcAtk = baseStats.atk + 20 + 32;
          const calcSpA = baseStats.spa + 20 + 32;
          const calcSpe = baseStats.spe + 20 + 32;
          const calcMaxHp = baseStats.hp + 75 + 32;

          this.foes[slot] = {
            name: speciesName,
            types: types,
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
        }
      } else if (cmd === '-damage') {
        const ident = parts[2];
        if (ident.startsWith(foePrefix)) {
          const slot = ident.includes('b:') ? '2' : '1';
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
        const ident = parts[2];
        if (ident.startsWith(foePrefix)) {
          const slot = ident.includes('b:') ? '2' : '1';
          this.foes[slot].active = false;
          this.foes[slot].hpRatio = 0;
        }
      } else if (cmd === '-singleturn' && (parts[3] === 'Protect' || parts[3] === 'Detect' || parts[3] === 'Spiky Shield' || parts[3] === 'Baneful Bunker')) {
        const ident = parts[2];
        if (ident.startsWith(foePrefix)) {
          const slot = ident.includes('b:') ? '2' : '1';
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
            available.sort((a, b) => {
              const hpA = parseInt((pokemon[a - 1].condition.split('/')[0]) || '0', 10);
              const hpB = parseInt((pokemon[b - 1].condition.split('/')[0]) || '0', 10);
              return hpB - hpA;
            });
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

    // Minimax-Lookahead-Entscheidung für beide aktive Slots gemeinsam
    decideJointTurn(request) {
      const activeList = request.active;
      const myPokemon = request.side.pokemon;

      const slot0Candidates = this.generateSlotCandidates(0, activeList[0], myPokemon[0], myPokemon);
      const slot1Candidates = this.generateSlotCandidates(1, activeList[1], myPokemon[1], myPokemon);

      let bestPair = null;
      let highestScore = -Infinity;

      for (const c0 of slot0Candidates) {
        for (const c1 of slot1Candidates) {
          if (c0.isMega && c1.isMega) continue;
          if (c0.isSwitch && c1.isSwitch && c0.switchSlot === c1.switchSlot) continue;

          const score = this.evaluateJointAction(c0, c1, activeList, myPokemon);
          if (score > highestScore) {
            highestScore = score;
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

      const choiceStr = `${bestPair[0].str}, ${bestPair[1].str}`;
      this.choose(choiceStr);
    }

    generateSlotCandidates(slotIndex, active, mon, myPokemon) {
      if (!active || !mon || mon.condition.endsWith('fnt') || mon.commanding) {
        return [{ str: 'pass', type: 'pass' }];
      }

      const candidates = [];
      const moves = active.moves || [];
      const canMega = !this.megaUsed && !!active.canMegaEvo;
      const [curHp, maxHp] = (mon.condition || '100/100').split(' ')[0].split('/').map(Number);
      const hpRatio = maxHp ? (curHp / maxHp) : 1.0;

      const foe1Active = this.foes['1'].active;
      const foe2Active = this.foes['2'].active;

      for (let j = 0; j < moves.length; j++) {
        const m = moves[j];
        if (m.disabled || m.pp <= 0) continue;

        const slot = j + 1;
        const moveData = this.dex ? this.dex.moves.get(m.id) : null;
        const isSpread = m.target === 'allAdjacentFoes' || m.target === 'allAdjacent';
        const isStatus = moveData ? moveData.category === 'Status' : false;

        if (isStatus) {
          if (m.id === 'protect' || m.id === 'detect' || m.id === 'spikyshield') {
            if (this.lastAction[slotIndex] !== 'protect') {
              candidates.push({ str: `move ${slot}`, type: 'protect', move: m, moveData, slotIndex });
            }
          } else if (m.id === 'tailwind' && !this.field.myTailwind) {
            candidates.push({ str: `move ${slot}`, type: 'tailwind', move: m, moveData, slotIndex });
          } else if (m.id === 'trickroom') {
            candidates.push({ str: `move ${slot}`, type: 'trickroom', move: m, moveData, slotIndex });
          } else if (m.id === 'wideguard') {
            candidates.push({ str: `move ${slot}`, type: 'wideguard', move: m, moveData, slotIndex });
          } else if (m.id === 'reflect' || m.id === 'lightscreen' || m.id === 'auroraveil') {
            candidates.push({ str: `move ${slot}`, type: 'screens', move: m, moveData, slotIndex });
          } else if (m.id === 'followme' || m.id === 'ragepowder') {
            candidates.push({ str: `move ${slot}`, type: 'redirect', move: m, moveData, slotIndex });
          } else {
            if (m.target === 'adjacentAlly' || m.target === 'allySide') {
              candidates.push({ str: `move ${slot} -${slotIndex === 0 ? 2 : 1}`, type: 'status_ally', move: m, moveData, slotIndex });
            } else {
              if (foe1Active) candidates.push({ str: `move ${slot} 1`, type: 'status', targetFoe: '1', move: m, moveData, slotIndex });
              if (foe2Active) candidates.push({ str: `move ${slot} 2`, type: 'status', targetFoe: '2', move: m, moveData, slotIndex });
            }
          }
          continue;
        }

        // Angriffs-Optionen
        if (isSpread) {
          candidates.push({ str: `move ${slot}`, type: 'attack', isSpread: true, move: m, moveData, slotIndex });
          if (canMega) {
            candidates.push({ str: `move ${slot} mega`, type: 'attack', isSpread: true, isMega: true, move: m, moveData, slotIndex });
          }
        } else {
          if (foe1Active) {
            candidates.push({ str: `move ${slot} 1`, type: 'attack', targetFoe: '1', move: m, moveData, slotIndex });
            if (canMega) {
              candidates.push({ str: `move ${slot} 1 mega`, type: 'attack', targetFoe: '1', isMega: true, move: m, moveData, slotIndex });
            }
          }
          if (foe2Active) {
            candidates.push({ str: `move ${slot} 2`, type: 'attack', targetFoe: '2', move: m, moveData, slotIndex });
            if (canMega) {
              candidates.push({ str: `move ${slot} 2 mega`, type: 'attack', targetFoe: '2', isMega: true, move: m, moveData, slotIndex });
            }
          }
          if (!foe1Active && !foe2Active) {
            candidates.push({ str: `move ${slot} 1`, type: 'attack', targetFoe: '1', move: m, moveData, slotIndex });
          }
        }
      }

      if (!candidates.length) {
        candidates.push({ str: `move 1 1`, type: 'attack', targetFoe: '1', slotIndex });
      }

      return candidates;
    }

    // Minimax Lookahead & Fokusfeuer-Bewertung
    evaluateJointAction(c0, c1, activeList, myPokemon) {
      let score = 0;
      let f1Hp = this.foes['1'].active ? this.foes['1'].hpRatio : 0;
      let f2Hp = this.foes['2'].active ? this.foes['2'].hpRatio : 0;

      const myMon0 = myPokemon[0];
      const myMon1 = myPokemon[1];

      const [hp0, maxHp0] = (myMon0 && myMon0.condition ? myMon0.condition.split(' ')[0].split('/').map(Number) : [100, 100]);
      const [hp1, maxHp1] = (myMon1 && myMon1.condition ? myMon1.condition.split(' ')[0].split('/').map(Number) : [100, 100]);
      let myHpRatio0 = maxHp0 ? hp0 / maxHp0 : 0;
      let myHpRatio1 = maxHp1 ? hp1 / maxHp1 : 0;

      // 1. Doppel-Protect Bestrafung (wenn letzte Runde geschützt)
      if (c0.type === 'protect' && this.lastAction[0] === 'protect') score -= 300;
      if (c1.type === 'protect' && this.lastAction[1] === 'protect') score -= 300;

      // 2. Taktischer Schutz bei niedrigen KP unter Bedrohung
      if (c0.type === 'protect' && myHpRatio0 < 0.35 && this.lastAction[0] !== 'protect') score += 120;
      if (c1.type === 'protect' && myHpRatio1 < 0.35 && this.lastAction[1] !== 'protect') score += 120;

      // 3. Mogelhieb (Fake Out) Priorität auf gefährliche Ziele
      if (c0.move && c0.move.id === 'fakeout' && this.turnCount <= 2) {
        score += 180;
        if (c0.targetFoe === '1' && this.foes['1'].protectedLastTurn) score -= 100;
        if (c0.targetFoe === '2' && this.foes['2'].protectedLastTurn) score -= 100;
      }
      if (c1.move && c1.move.id === 'fakeout' && this.turnCount <= 2) {
        score += 180;
        if (c1.targetFoe === '1' && this.foes['1'].protectedLastTurn) score -= 100;
        if (c1.targetFoe === '2' && this.foes['2'].protectedLastTurn) score -= 100;
      }

      // 4. Board-Control: Rückenwind / Bizarroraum
      if (c0.type === 'tailwind' || c1.type === 'tailwind') score += (this.turnCount <= 2 ? 140 : 80);
      if (c0.type === 'trickroom' || c1.type === 'trickroom') score += 120;

      // 5. Kombinierter Schaden beider Pokémon berechnen (Fokusfeuer)
      let dmgToFoe1 = 0;
      let dmgToFoe2 = 0;

      const calcAttackDmg = (c, mon) => {
        if (c.type !== 'attack' || !c.moveData) return;
        const monTypes = (this.dex && this.dex.species.get(mon.details.split(',')[0]))?.types || ['Normal'];
        const atkObj = {
          atk: mon.stats ? mon.stats.atk : 130,
          spa: mon.stats ? mon.stats.spa : 130,
          types: monTypes,
          ability: mon.baseAbility || ''
        };

        // Friendly-Fire Prüfung bei 'allAdjacent' (z. B. Erdbeben / Surfer)
        if (c.moveData.target === 'allAdjacent') {
          const allyMon = (mon === myMon0) ? myMon1 : myMon0;
          const allyChoice = (mon === myMon0) ? c1 : c0;
          if (allyMon && allyMon.active && allyChoice.type !== 'protect') {
            const allyTypes = (this.dex && this.dex.species.get(allyMon.details.split(',')[0]))?.types || ['Normal'];
            const effAlly = getTypeEff(c.moveData.type, allyTypes);
            if (effAlly > 0 && !allyTypes.includes('Flying')) {
              score -= 300 * effAlly; // Strenge Bestrafung für Team-Beschuss (Friendly Fire)!
            }
          }
        }

        if (c.isSpread) {
          if (this.foes['1'].active) dmgToFoe1 += this.calcDmgRatio(atkObj, this.foes['1'], c.moveData, true);
          if (this.foes['2'].active) dmgToFoe2 += this.calcDmgRatio(atkObj, this.foes['2'], c.moveData, true);
        } else if (c.targetFoe === '1' && this.foes['1'].active) {
          dmgToFoe1 += this.calcDmgRatio(atkObj, this.foes['1'], c.moveData, false);
        } else if (c.targetFoe === '2' && this.foes['2'].active) {
          dmgToFoe2 += this.calcDmgRatio(atkObj, this.foes['2'], c.moveData, false);
        }
      };

      if (myMon0 && myMon0.active) calcAttackDmg(c0, myMon0);
      if (myMon1 && myMon1.active) calcAttackDmg(c1, myMon1);

      // Foe 1 Auswertung
      if (this.foes['1'].active) {
        if (this.foes['1'].protectedLastTurn) {
          score += dmgToFoe1 * 120; // Protect-Read: Foe 1 kann schwer erneut schützen
        } else {
          score += dmgToFoe1 * 100;
        }
        if (dmgToFoe1 >= f1Hp) {
          // K.O. ERREICHT! Massiver Fokusfeuer-Bonus
          score += 450;
          score += 150; // Bedrohung neutralisiert
        }
      }

      // Foe 2 Auswertung
      if (this.foes['2'].active) {
        if (this.foes['2'].protectedLastTurn) {
          score += dmgToFoe2 * 120;
        } else {
          score += dmgToFoe2 * 100;
        }
        if (dmgToFoe2 >= f2Hp) {
          score += 450;
          score += 150;
        }
      }

      // Mega-Evolution Belohnung
      if (c0.isMega || c1.isMega) {
        score += 60;
      }

      return score;
    }

    calcDmgRatio(attacker, defender, move, isSpread) {
      if (!move || move.category === 'Status' || !move.basePower) return 0;
      const isSpecial = move.category === 'Special';
      const aStat = isSpecial ? attacker.spa : attacker.atk;
      const dStat = isSpecial ? defender.spd : defender.def;

      let raw = (((22 * move.basePower * (aStat / Math.max(1, dStat))) / 50) + 2);

      // STAB
      if (attacker.types && attacker.types.includes(move.type)) {
        raw *= (attacker.ability === 'adaptability' ? 2.0 : 1.5);
      }

      // Typeneffektivität
      const eff = getTypeEff(move.type, defender.types);
      if (eff === 0) return 0;
      raw *= eff;

      // Spread-Malus (0.75 im Doppelkampf)
      if (isSpread) raw *= 0.75;

      // Wetter-Modifikatoren
      if (this.field.weather === 'sun') {
        if (move.type === 'Fire') raw *= 1.5;
        if (move.type === 'Water') raw *= 0.5;
      } else if (this.field.weather === 'rain') {
        if (move.type === 'Water') raw *= 1.5;
        if (move.type === 'Fire') raw *= 0.5;
      }

      // Terrains
      if (this.field.terrain === 'psychic' && move.type === 'Psychic') raw *= 1.3;
      if (this.field.terrain === 'electric' && move.type === 'Electric') raw *= 1.3;
      if (this.field.terrain === 'grassy' && move.type === 'Grass') raw *= 1.3;

      return Math.min(1.5, raw / Math.max(100, defender.maxHp));
    }
  }

  return ChampionsBot;
});

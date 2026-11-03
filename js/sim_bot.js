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
      this.player = options.player || null;
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
      this.imprisonActive = false;
      this.imprisonIdent = null;

      this.weights = options.weights || null;
      if (!this.weights && typeof require !== 'undefined') {
        try {
          this.weights = require('../data/ai_weights.json');
        } catch (e) {
          try {
            this.weights = require('./data/ai_weights.json');
          } catch (e2) {}
        }
      }
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
      const myPrefix = this.player || (this.options && this.options.player) || 'p1';
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
      } else if (cmd === '-start') {
        const ident = parts[2] || '';
        const effect = parts[3] || '';
        if (effect.includes('Imprison') && ident.startsWith(myPrefix)) {
          this.imprisonActive = true;
          this.imprisonIdent = ident;
        }
      } else if (cmd === '-end') {
        const ident = parts[2] || '';
        const effect = parts[3] || '';
        if (effect.includes('Imprison') && ident.startsWith(myPrefix)) {
          this.imprisonActive = false;
          this.imprisonIdent = null;
        }
      } else if (cmd === 'faint') {
        const ident = parts[2] || '';
        if (ident === this.imprisonIdent) {
          this.imprisonActive = false;
          this.imprisonIdent = null;
        }
      } else if (cmd === '-mega') {
        const ident = parts[2] || '';
        if (ident.startsWith(myPrefix)) {
          this.megaUsed = true;
        }
      }
    }

    receiveRequest(request) {
      if (request.side && request.side.id) {
        this.player = request.side.id;
      }
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

      if (activeList.length === 1 || !myPokemon[1] || myPokemon[1].condition?.endsWith('fnt')) {
        this.choose(bestPair[0].str);
      } else {
        const choiceStr = `${bestPair[0].str}, ${bestPair[1].str}`;
        this.choose(choiceStr);
      }
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
          } else if (m.id === 'imprison') {
            candidates.push({ str: `move ${slot}`, type: 'imprison', move: m, moveData, slotIndex });
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
        let moveIsSpread = isSpread;
        // Expanding Force im Psychofeld trifft beide Gegner als Flächenschaden
        if (m.id === 'expandingforce' && this.field.terrain === 'psychic') {
          moveIsSpread = true;
        }

        if (moveIsSpread) {
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

      // Taktische Auswechslungen (Switches)
      if (!active.trapped && myPokemon) {
        for (let k = 0; k < myPokemon.length; k++) {
          const benchMon = myPokemon[k];
          if (benchMon && !benchMon.active && !benchMon.condition.endsWith('fnt')) {
            const benchIdx = k + 1;
            candidates.push({
              str: `switch ${benchIdx}`,
              type: 'switch',
              isSwitch: true,
              switchSlot: benchIdx,
              benchMon,
              slotIndex
            });
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

      // 4. Board-Control: Intelligente Geschwindigkeits-Steuerung (Tailwind vs. Trick Room)
      const hasTailwindChoice = (c0.type === 'tailwind' || c1.type === 'tailwind');
      const hasTrickRoomChoice = (c0.type === 'trickroom' || c1.type === 'trickroom');

      // Taktischer Kardinalfehler: Niemals Rückenwind und Bizarroraum gleichzeitig wählen!
      if (hasTailwindChoice && hasTrickRoomChoice) {
        score -= 900;
      }

      // Rückenwind-Bewertung
      if (hasTailwindChoice) {
        if (this.field.trickRoom) {
          score -= 500; // Im Bizarroraum macht Rückenwind das eigene Team langsamer
        } else if (this.field.myTailwind) {
          score -= 300; // Rückenwind ist bereits aktiv
        } else {
          const alreadyFaster = this.isMyTeamFaster(myPokemon);
          if (this.field.foeTailwind) {
            score += 150; // Gegner hat Rückenwind -> dringend nachziehen!
          } else if (alreadyFaster) {
            score += 25; // Bereits schneller -> Angriff oder Support ist meist besser als blinder Tailwind!
          } else {
            score += (this.turnCount <= 2 ? 110 : 60);
          }
        }
      }

      // Bizarroraum-Bewertung
      if (hasTrickRoomChoice) {
        if (this.field.myTailwind || hasTailwindChoice) {
          score -= 700; // Steht im Widerspruch zu Rückenwind
        } else if (this.field.trickRoom) {
          // Bizarroraum ist bereits aktiv -> erneutes Einsetzen BEENDET den Bizarroraum!
          // Wenn unser Team schnell ist, ist das Aufheben des gegnerischen Bizarroraums genial!
          if (this.isMyTeamFaster(myPokemon)) {
            score += 260;
          } else {
            score -= 400; // Unser Team ist langsam, Bizarroraum soll aktiv bleiben
          }
        } else {
          // Bizarroraum ist NICHT aktiv:
          // Nur setzen, wenn unser Team im Schnitt langsamer ist als die aktiven Gegner!
          if (this.isMyTeamFaster(myPokemon)) {
            score -= 600; // Unser schnelles Team würde sich selbst massiv schaden!
          } else {
            score += 180; // Slow-Sweeper Team (z. B. Qurtel/Farigiraf) profitiert
          }
        }
      }

      // Begrenzer (Imprison)
      if (c0.type === 'imprison' || c1.type === 'imprison') {
        if (this.imprisonActive) {
          score -= 600; // Bereits aktiv
        } else if (c0.type === 'imprison' && c1.type === 'imprison') {
          score -= 900; // Niemals doppelt Imprison
        }
      }

      // 5. Taktische Auswechslungs-Bewertung (Switches & Pivots)
      const evaluateSwitch = (c, mon, otherChoice) => {
        if (!c || c.type !== 'switch' || !c.benchMon) return 0;
        let sScore = 0;
        const benchMon = c.benchMon;
        const benchSpecies = this.dex ? this.dex.species.get(benchMon.details.split(',')[0]) : null;
        const benchTypes = benchSpecies?.types || ['Normal'];
        const curSpecies = (this.dex && mon) ? this.dex.species.get(mon.details.split(',')[0]) : null;
        const curTypes = curSpecies?.types || ['Normal'];

        const [bHp, bMaxHp] = (benchMon.condition || '100/100').split(' ')[0].split('/').map(Number);
        const benchHpRatio = bMaxHp ? bHp / bMaxHp : 1.0;
        const [cHp, cMaxHp] = (mon && mon.condition ? mon.condition.split(' ')[0].split('/').map(Number) : [100, 100]);
        const curHpRatio = cMaxHp ? cHp / cMaxHp : 1.0;

        // Tempo-Kosten: Ein Wechsel kostet eine aktive Runde
        sScore -= 80;

        // 1. Bedrohung des aktuellen Pokémon (Flucht vor 2x/4x Schwäche oder fatalem Schaden)
        let curTakesSuperEffective = false;
        const checkThreat = (foe) => {
          if (!foe || !foe.active) return;
          for (const fType of (foe.types || ['Normal'])) {
            if (getTypeEff(fType, curTypes) >= 2.0) curTakesSuperEffective = true;
          }
        };
        checkThreat(this.foes['1']);
        checkThreat(this.foes['2']);

        if (curTakesSuperEffective) {
          sScore += (curHpRatio < 0.6 ? 160 : 100);
          c.isThreatEscape = true;
        }

        // 2. Defensiver Vorteil des Bank-Pokémon (Resistenz / Immunität)
        let benchHasImmunity = false;
        let benchResistsFoes = true;
        const checkBenchDefense = (foe) => {
          if (!foe || !foe.active) return;
          for (const fType of (foe.types || ['Normal'])) {
            const eff = getTypeEff(fType, benchTypes);
            if (eff === 0) benchHasImmunity = true;
            if (eff > 1.0) benchResistsFoes = false;
          }
        };
        checkBenchDefense(this.foes['1']);
        checkBenchDefense(this.foes['2']);

        if (benchHasImmunity) {
          sScore += 180; // Genialer Immunity-Pivot (z.B. Levitate / Typen-Immunität)
        } else if (benchResistsFoes) {
          sScore += 110; // Fängt Angriffe resistent ab
        } else {
          sScore -= 50; // Nimmt selbst viel Schaden
        }

        // 3. Offensiver Gegendruck des Bank-Pokémon
        let benchHitsFoesSuper = false;
        const checkBenchOffense = (foe) => {
          if (!foe || !foe.active) return;
          for (const bType of benchTypes) {
            if (getTypeEff(bType, foe.types || ['Normal']) >= 2.0) benchHitsFoesSuper = true;
          }
        };
        checkBenchOffense(this.foes['1']);
        checkBenchOffense(this.foes['2']);

        if (benchHitsFoesSuper) {
          sScore += 90;
        }

        // 4. KP-Zustand des Bank-Pokémon
        if (benchHpRatio < 0.35) {
          sScore -= 120;
        } else if (benchHpRatio > 0.85) {
          sScore += 30;
        }

        // 5. Niemals beide Slots gleichzeitig blind auswechseln
        if (otherChoice && (otherChoice.type === 'switch' || otherChoice.isSwitch)) {
          sScore -= 220;
        }

        return sScore;
      };

      if (c0.type === 'switch') score += evaluateSwitch(c0, myMon0, c1);
      if (c1.type === 'switch') score += evaluateSwitch(c1, myMon1, c0);

      // 6. Kombinierter Schaden beider Pokémon berechnen (Fokusfeuer)
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

      let neuralScore = 0;
      if (this.weights) {
        neuralScore = this.evaluateNeural(c0, c1, activeList, myPokemon) * 350.0;
      }

      return score + neuralScore;
    }

    evaluateNeural(c0, c1, activeList, myPokemon) {
      if (!this.weights || !this.weights.W1) return 0;
      const vec = this.extractJointFeatureVector(c0, c1, activeList, myPokemon);
      const w = this.weights;
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

    extractJointFeatureVector(c0, c1, activeList, myPokemon) {
      const out = new Float32Array(64);
      const myMon0 = myPokemon[0];
      const myMon1 = myPokemon[1];

      // 0..19: State Features
      const [hp0, maxHp0] = (myMon0 && myMon0.condition ? myMon0.condition.split(' ')[0].split('/').map(Number) : [100, 100]);
      const [hp1, maxHp1] = (myMon1 && myMon1.condition ? myMon1.condition.split(' ')[0].split('/').map(Number) : [100, 100]);
      out[0] = maxHp0 ? hp0 / maxHp0 : 0;
      out[1] = maxHp1 ? hp1 / maxHp1 : 0;
      out[2] = this.foes['1'].active ? this.foes['1'].hpRatio : 0;
      out[3] = this.foes['2'].active ? this.foes['2'].hpRatio : 0;

      let myAlive = 0;
      for (const p of myPokemon) if (p && !p.condition?.endsWith('fnt')) myAlive++;
      out[4] = myAlive / 4.0;
      out[5] = 0.75; // foe alive approx

      const w = this.field.weather || 'none';
      out[6] = (w === 'sun') ? 1.0 : 0.0;
      out[7] = (w === 'rain') ? 1.0 : 0.0;
      out[8] = (w === 'sand') ? 1.0 : 0.0;
      out[9] = (w === 'snow') ? 1.0 : 0.0;

      const t = this.field.terrain || 'none';
      out[10] = (t === 'psychic') ? 1.0 : 0.0;
      out[11] = (t === 'electric') ? 1.0 : 0.0;
      out[12] = (t === 'grassy') ? 1.0 : 0.0;
      out[13] = (t === 'misty') ? 1.0 : 0.0;

      out[14] = this.field.trickRoom ? 1.0 : 0.0;
      out[15] = this.field.myTailwind ? 1.0 : 0.0;
      out[16] = this.field.foeTailwind ? 1.0 : 0.0;
      out[17] = Math.min((this.turnCount || 1) / 10.0, 1.0);
      out[18] = this.isMyTeamFaster(myPokemon) ? 1.0 : 0.0;
      out[19] = (this.field.myReflect || this.field.myLightScreen) ? 1.0 : 0.0;

      // 20..37: Slot 0 action features
      this.fillActionFeatures(out, 20, c0, myMon0);
      // 38..55: Slot 1 action features
      this.fillActionFeatures(out, 38, c1, myMon1);

      // 56..63: Synergy features
      const sameFoe = (c0.type === 'attack' && c1.type === 'attack' && c0.targetFoe && c0.targetFoe === c1.targetFoe);
      out[56] = sameFoe ? 1.0 : 0.0;
      out[57] = (c0.type === 'protect' && c1.type === 'protect') ? 1.0 : 0.0;
      const speedConflict = (c0.type === 'tailwind' && c1.type === 'trickroom') || (c0.type === 'trickroom' && c1.type === 'tailwind');
      out[58] = speedConflict ? 1.0 : 0.0;
      out[59] = (c0.moveData?.target === 'allAdjacent' && c1.type !== 'protect') || (c1.moveData?.target === 'allAdjacent' && c0.type !== 'protect') ? 1.0 : 0.0;
      out[60] = (this.field.myTailwind && (c0.type === 'tailwind' || c1.type === 'tailwind')) ? 1.0 : 0.0;
      out[61] = (this.field.terrain === 'psychic' && ((c0.move?.id === 'expandingforce') || (c1.move?.id === 'expandingforce'))) ? 1.0 : 0.0;
      out[62] = (this.imprisonActive && (c0.type === 'imprison' || c1.type === 'imprison')) ? 1.0 : 0.0;
      out[63] = 0.0;

      return out;
    }

    fillActionFeatures(out, offset, c, mon) {
      if (!c) {
        out[offset] = 1.0; // pass
        return;
      }
      out[offset + 0] = (c.type === 'pass') ? 1.0 : 0.0;
      out[offset + 1] = (c.type === 'protect') ? 1.0 : 0.0;
      out[offset + 2] = (c.type === 'switch' || c.isSwitch) ? 1.0 : 0.0;
      out[offset + 3] = (c.type === 'attack') ? 1.0 : 0.0;

      if (c.type === 'attack' && c.moveData) {
        out[offset + 4] = Math.min((c.moveData.basePower || 60) / 150.0, 1.0);
        const targetFoe = c.targetFoe === '2' ? this.foes['2'] : this.foes['1'];
        const eff = getTypeEff(c.moveData.type || 'Normal', targetFoe.types || ['Normal']);
        out[offset + 5] = Math.min(eff / 4.0, 1.0);
        const monTypes = (mon && mon.details ? (this.dex && this.dex.species.get(mon.details.split(',')[0]))?.types : null) || ['Normal'];
        out[offset + 6] = monTypes.includes(c.moveData.type) ? 1.0 : 0.0;
        out[offset + 7] = c.isSpread ? 1.0 : 0.0;
        out[offset + 8] = (c.targetFoe === '1') ? 1.0 : 0.0;
        out[offset + 9] = (c.targetFoe === '2') ? 1.0 : 0.0;
        out[offset + 10] = 0.5;
      } else if (c.type === 'switch' && c.benchMon) {
        const bMon = c.benchMon;
        const bTypes = (bMon && this.dex) ? this.dex.species.get(bMon.details.split(',')[0])?.types || ['Normal'] : ['Normal'];
        const f1Types = this.foes['1'].types || ['Normal'];
        const eff1 = getTypeEff(f1Types[0] || 'Normal', bTypes);
        out[offset + 5] = (eff1 === 0) ? 1.0 : (eff1 <= 0.5 ? 0.75 : (eff1 > 1.0 ? 0.2 : 0.5));
        out[offset + 6] = c.isThreatEscape ? 1.0 : 0.0;
        const [bHp, bMaxHp] = (bMon.condition || '100/100').split(' ')[0].split('/').map(Number);
        out[offset + 10] = bMaxHp ? bHp / bMaxHp : 1.0;
      }

      out[offset + 11] = (c.type === 'tailwind') ? 1.0 : 0.0;
      out[offset + 12] = (c.type === 'trickroom') ? 1.0 : 0.0;
      out[offset + 13] = (c.type === 'imprison') ? 1.0 : 0.0;
      out[offset + 14] = (c.move && c.move.id === 'fakeout') ? 1.0 : 0.0;
      out[offset + 15] = (c.type === 'screens') ? 1.0 : 0.0;
      out[offset + 16] = (c.isMega) ? 1.0 : 0.0;
      out[offset + 17] = (c.moveData && c.moveData.priority > 0) ? 1.0 : 0.0;
    }

    isMyTeamFaster(myPokemon) {
      let mySpeedSum = 0;
      let myCount = 0;
      for (let i = 0; i < myPokemon.length; i++) {
        const p = myPokemon[i];
        if (!p || (p.condition && p.condition.endsWith('fnt'))) continue;
        const spe = p.stats ? p.stats.spe : (this.dex && this.dex.species.get(p.details.split(',')[0]))?.baseStats.spe || 85;
        mySpeedSum += spe;
        myCount++;
      }
      const myAvgSpe = myCount ? (mySpeedSum / myCount) : 90;

      let foeSpeedSum = 0;
      let foeCount = 0;
      if (this.foes['1'].active) { foeSpeedSum += this.foes['1'].speed; foeCount++; }
      if (this.foes['2'].active) { foeSpeedSum += this.foes['2'].speed; foeCount++; }
      const foeAvgSpe = foeCount ? (foeSpeedSum / foeCount) : 85;

      return myAvgSpe >= foeAvgSpe;
    }

    calcDmgRatio(attacker, defender, move, isSpread) {
      if (!move || move.category === 'Status' || !move.basePower) return 0;
      const isSpecial = move.category === 'Special';
      const aStat = isSpecial ? attacker.spa : attacker.atk;
      const dStat = isSpecial ? defender.spd : defender.def;

      let bp = move.basePower;
      // Weite Kraft (Expanding Force) erhält im Psychofeld 120 Basisschaden
      if (move.id === 'expandingforce' && this.field.terrain === 'psychic') {
        bp = 120;
      }

      let raw = (((22 * bp * (aStat / Math.max(1, dStat))) / 50) + 2);

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

// Heuristische Doppelkampf-Bot-KI für Pokémon Champions ([Gen 9 Champions] VGC 2026 Reg M-C)
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
      this.leadOrder = options.leadOrder || [1, 2, 3, 4]; // VGC Pick 4 (1-basierte Slots)
      this.foes = {
        '1': { name: '', types: [], hpRatio: 1.0, active: false, protectedLastTurn: false },
        '2': { name: '', types: [], hpRatio: 1.0, active: false, protectedLastTurn: false }
      };
      this.lastAction = [null, null];
      this.turnCount = 0;
      this.dex = options.dex || Dex || null;
    }

    receiveLine(line) {
      super.receiveLine(line);
      this.trackBattleState(line);
    }

    trackBattleState(line) {
      if (!line.startsWith('|')) return;
      const parts = line.split('|');
      const cmd = parts[1];

      // Gegnerische Wechsel tracken (p1/p2 je nach Spieler-ID)
      const foePrefix = this.stream && this.stream.name === 'p1' ? 'p2' : 'p1';

      if (cmd === 'turn') {
        this.turnCount = parseInt(parts[2], 10) || (this.turnCount + 1);
        this.foes['1'].protectedLastTurn = false;
        this.foes['2'].protectedLastTurn = false;
      } else if (cmd === 'switch' || cmd === 'drag') {
        const ident = parts[2]; // z. B. "p2a: Charizard"
        if (ident.startsWith(foePrefix)) {
          const slot = ident.includes('b:') ? '2' : '1';
          const details = parts[3] || '';
          const speciesName = details.split(',')[0].trim();
          const condition = parts[4] || '100/100';
          const [hp, maxHp] = condition.split(' ')[0].split('/').map(Number);

          let types = ['Normal'];
          if (this.dex) {
            const spec = this.dex.species.get(speciesName);
            if (spec && spec.types) types = spec.types;
          }

          this.foes[slot] = {
            name: speciesName,
            types: types,
            hpRatio: maxHp ? Math.max(0, hp / maxHp) : 1.0,
            active: !condition.includes('fnt'),
            protectedLastTurn: false
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
      } else if (cmd === '-singleturn' && (parts[3] === 'Protect' || parts[3] === 'Detect' || parts[3] === 'Spiky Shield')) {
        const ident = parts[2];
        if (ident.startsWith(foePrefix)) {
          const slot = ident.includes('b:') ? '2' : '1';
          this.foes[slot].protectedLastTurn = true;
        }
      }
    }

    receiveRequest(request) {
      if (request.wait) {
        // Warten auf gegnerischen Input
        return;
      }

      if (request.teamPreview) {
        // VGC Bring-6-Pick-4
        const orderStr = this.leadOrder.join('');
        this.choose(`team ${orderStr}`);
        return;
      }

      if (request.forceSwitch) {
        // Erzwungener Wechsel nach K.O.
        const pokemon = request.side.pokemon;
        const chosen = [];
        const choices = request.forceSwitch.map((mustSwitch, i) => {
          if (!mustSwitch) return 'pass';
          const available = [];
          for (let s = 1; s <= pokemon.length; s++) {
            const p = pokemon[s - 1];
            if (p && !p.active && !p.condition.endsWith('fnt') && !chosen.includes(s)) {
              available.push(s);
            }
          }
          if (!available.length) return 'pass';
          // Bestes Pokémon nach verbleibenden KP einwechseln
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
        return;
      }

      if (request.active) {
        // Rundenentscheidung für beide aktiven Slots
        const choices = [];
        const activeList = request.active;
        const myPokemon = request.side.pokemon;

        for (let i = 0; i < activeList.length; i++) {
          const active = activeList[i];
          const mon = myPokemon[i];

          // Slot kampfunfähig oder kommandiert
          if (!active || !mon || mon.condition.endsWith('fnt') || mon.commanding) {
            choices.push('pass');
            continue;
          }

          choices.push(this.decideSlotAction(i, active, mon, myPokemon));
        }

        this.choose(choices.join(', '));
      }
    }

    decideSlotAction(slotIndex, active, mon, myPokemon) {
      const moves = active.moves || [];
      const canMega = !!active.canMegaEvo;
      const canTera = !!active.canTerastallize;

      // Eigene aktuelle KP-Quote ermitteln
      const [curHp, maxHp] = (mon.condition || '100/100').split(' ')[0].split('/').map(Number);
      const hpRatio = maxHp ? (curHp / maxHp) : 1.0;

      // Verfügbare legale Attacken filtern
      const legalMoves = [];
      for (let j = 0; j < moves.length; j++) {
        const m = moves[j];
        if (!m.disabled && m.pp > 0) {
          legalMoves.push({ slot: j + 1, ...m });
        }
      }

      // Falls keine legale Attacke existiert (z. B. Verzweifler / Struggle)
      if (!legalMoves.length) {
        return 'move 1';
      }

      // Aktive gegnerische Ziele prüfen
      const foe1Active = this.foes['1'].active;
      const foe2Active = this.foes['2'].active;
      const foe1Protect = this.foes['1'].protectedLastTurn;
      const foe2Protect = this.foes['2'].protectedLastTurn;

      // --- Heuristik 1: Fake Out (Mogelhieb) in Runde 1 ---
      const fakeOutMove = legalMoves.find(m => m.id === 'fakeout');
      if (fakeOutMove && this.turnCount <= 2) {
        // Ziel wählen, das voraussichtlich nicht schützt
        let targetSlot = '1';
        if (foe2Active && (!foe1Active || foe1Protect)) targetSlot = '2';
        else if (foe1Active && !foe1Protect) targetSlot = '1';
        return `move ${fakeOutMove.slot} ${targetSlot}`;
      }

      // --- Heuristik 2: Schutzschild bei niedrigen KP (< 30 %) & nicht vorletzte Runde geschützt ---
      const protectMove = legalMoves.find(m => m.id === 'protect' || m.id === 'detect' || m.id === 'spikyshield');
      if (protectMove && hpRatio < 0.35 && this.lastAction[slotIndex] !== 'protect') {
        this.lastAction[slotIndex] = 'protect';
        return `move ${protectMove.slot}`;
      }

      // --- Heuristik 3: Schadens- & K.O.-Bewertung aller Attacken gegen alle Ziele ---
      let bestMoveChoice = null;
      let highestScore = -Infinity;

      for (const m of legalMoves) {
        let moveData = null;
        if (this.dex) {
          moveData = this.dex.moves.get(m.id);
        }

        const basePower = moveData ? moveData.basePower : 60;
        const moveType = moveData ? moveData.type : 'Normal';
        const isStatus = moveData ? moveData.category === 'Status' : false;

        // Status-Attacken bewerten
        if (isStatus) {
          let statusScore = 15;
          if (m.id === 'tailwind' && this.turnCount <= 3) statusScore = 65;
          if (m.id === 'trickroom') statusScore = 60;
          if (m.id === 'spore' || m.id === 'sleeppowder') statusScore = 70;
          if (m.id === 'willowisp') statusScore = 50;

          if (statusScore > highestScore) {
            highestScore = statusScore;
            // Target bestimmen
            let tgt = '';
            if (m.target === 'normal' || m.target === 'adjacentFoe') {
              tgt = foe1Active ? ' 1' : ' 2';
            }
            bestMoveChoice = `move ${m.slot}${tgt}`;
          }
          continue;
        }

        // Angriffs-Attacken bewerten
        // STAB-Prüfung
        const monTypes = (this.dex && this.dex.species.get(mon.details.split(',')[0]))?.types || ['Normal'];
        const stab = monTypes.includes(moveType) ? 1.5 : 1.0;

        // Flächenschaden
        if (m.target === 'allAdjacentFoes' || m.target === 'allAdjacent') {
          const eff1 = foe1Active ? getTypeEff(moveType, this.foes['1'].types) : 0;
          const eff2 = foe2Active ? getTypeEff(moveType, this.foes['2'].types) : 0;
          const score = basePower * 0.75 * stab * (eff1 + eff2);

          if (score > highestScore) {
            highestScore = score;
            bestMoveChoice = `move ${m.slot}`;
          }
          continue;
        }

        // Einzelschaden gegen Ziel 1 & Ziel 2 prüfen
        const possibleTargets = [];
        if (foe1Active) possibleTargets.push({ slot: '1', foe: this.foes['1'] });
        if (foe2Active) possibleTargets.push({ slot: '2', foe: this.foes['2'] });
        if (!possibleTargets.length) possibleTargets.push({ slot: '1', foe: this.foes['1'] });

        for (const pt of possibleTargets) {
          const eff = getTypeEff(moveType, pt.foe.types);
          let score = basePower * stab * eff;

          // Schutzschild-Malus
          if (pt.foe.protectedLastTurn) {
            score *= 1.2; // Gegner kann meist nicht zweimal hintereinander schützen
          }

          // K.O.-Bonus: Wenn Ziel bereits niedrige KP hat und die Attacke trifft
          if (pt.foe.hpRatio <= 0.4 && eff >= 1.0) {
            score += 150; // Massiver K.O.-Fokus
          } else if (pt.foe.hpRatio <= 0.7 && eff >= 1.5) {
            score += 80;
          }

          if (score > highestScore) {
            highestScore = score;
            const targetSuffix = (m.target === 'normal' || m.target === 'adjacentFoe' || m.target === 'any') ? ` ${pt.slot}` : '';
            bestMoveChoice = `move ${m.slot}${targetSuffix}`;
          }
        }
      }

      this.lastAction[slotIndex] = 'attack';

      // Standard-Fallback falls keine Attacke ausgewählt wurde
      if (!bestMoveChoice) {
        bestMoveChoice = `move 1${foe1Active ? ' 1' : ' 2'}`;
      }

      // Champions-Regel: Mega-Evolution immer aktivieren, wenn möglich
      if (canMega) {
        bestMoveChoice += ' mega';
      }

      return bestMoveChoice;
    }
  }

  return ChampionsBot;
});

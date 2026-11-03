const { Battle, Dex, Teams } = require('@pkmn/sim');

const cDex = Dex.mod('champions', {
  Scripts: {
    statModify(baseStats, set, statName) {
      const tr = this.trunc;
      let stat = baseStats[statName];
      const evs = set.evs[statName] || 0;
      if (statName === 'hp') {
        return stat + evs + 75;
      }
      stat = stat + evs + 20;
      const nature = this.dex.natures.get(set.nature);
      if (nature.plus === statName) {
        stat = tr(tr(stat * 110, 16) / 100);
      } else if (nature.minus === statName) {
        stat = tr(tr(stat * 90, 16) / 100);
      }
      return stat;
    }
  },
  Formats: [
    {
      name: '[Gen 9 Champions] VGC 2026 Reg M-C',
      mod: 'champions',
      gameType: 'doubles',
      ruleset: ['Flat Rules', 'NatDex Mod'],
    }
  ]
});

const team = Teams.import(`
Charizard @ Charizardite Y
Ability: Blaze
Level: 50
EVs: 30 SpA / 4 SpD / 32 Spe
Timid Nature
- Heat Wave
- Solar Beam
- Weather Ball
- Protect
`);

console.log('Parsed EVs in team[0]:', team[0].evs);

const battle = new Battle({
  formatid: 'gen9championsvgc2026regmc',
  dex: cDex
});

battle.setPlayer('p1', { name: 'P1', team });
battle.setPlayer('p2', { name: 'P2', team });

const mon = battle.p1.pokemon[0];
console.log('Battle Pokemon Stats BEFORE Mega:');
console.log('HP:', mon.maxhp, 'Stored Stats:', mon.storedStats);

mon.formeChange('charizardmegay', battle.dex.items.get('charizarditey'), true);
console.log('Battle Pokemon Stats AFTER Mega:');
console.log('HP:', mon.maxhp, 'Stored Stats:', mon.storedStats);

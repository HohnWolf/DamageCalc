global.self = global;
global.window = global;
require('../js/sim_worker.bundle.js');
const engine = global.ChampionsEngine;

engine.onmessage = (e) => {
  if (e.data.type === 'INTERACTIVE_REQUEST') {
    const req = e.data.request;
    if (req.teamPreview) {
      engine.postMessage({ type: 'INTERACTIVE_CHOICE', choice: 'team 1234' });
    } else if (req.active) {
      console.log('ACTIVE COUNT:', req.active.length);
      console.log('req.active[0] moves:', req.active[0] ? req.active[0].moves.map(m=>m.move) : 'none');
      console.log('req.active[1] moves:', req.active[1] ? req.active[1].moves.map(m=>m.move) : 'none');
      console.log('side.pokemon:', req.side.pokemon.map((p, i) => ({ i, ident: p.ident, details: p.details, active: p.active })));
      process.exit(0);
    }
  }
};

const DEFAULT_P1 = `Espathra @ Colbur Berry
Ability: Speed Boost
- Lumina Crash
- Protect

Goodra-Hisui @ Leftovers
- Flash Cannon
- Protect

Raichu @ Focus Sash
- Thunderbolt
- Protect

Floette @ Eviolite
- Moonblast
- Protect`;

const DEFAULT_P2 = `Indeedee @ Colbur Berry
- Hyper Voice
- Protect

Whimsicott @ Focus Sash
- Moonblast
- Protect

Garchomp @ Life Orb
- Earthquake
- Protect

Gholdengo @ Leftovers
- Make It Rain
- Protect`;

engine.postMessage({
  type: 'INTERACTIVE_START',
  p1Paste: DEFAULT_P1,
  p2Paste: DEFAULT_P2
});

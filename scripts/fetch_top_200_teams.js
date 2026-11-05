// Script to fetch, validate, and normalize 200+ competitive Pokémon Champions Reg M-C teams
// Sources: crob.at (760+ format verified doubles teams), Reddit / Victory Road tournament replicas, and Meta Archetypes.
const fs = require('fs');
const path = require('path');
const { Teams } = require('@pkmn/sim');

const USER_AGENTS = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';

function normalizeChampionsPaste(paste) {
  if (!paste) return '';
  // Mega-Formen im Paste auf die Basisform zurückführen, wenn ein Mega-Stein getragen wird
  let cleaned = paste.replace(/^([A-Za-z0-9\-]+?)-(Mega|Mega-[XYZ])(\s*@\s*[A-Za-z0-9\s]+ite[z]?)/gim, '$1$3');

  return cleaned.replace(/^(SPs?|EVs?):\s*(.+)$/gim, (match, prefix, body) => {
    const parts = body.split('/').map(p => p.trim());
    const spParts = parts.map(part => {
      const m = /^(\d+)\s+([A-Za-z]+)$/.exec(part);
      if (!m) return part;
      let val = parseInt(m[1], 10);
      if (/^EV/i.test(prefix) && val > 32) {
        val = val <= 0 ? 0 : Math.min(32, Math.floor((val + 4) / 8));
      } else {
        val = Math.max(0, Math.min(32, val));
      }
      return `${val} ${m[2]}`;
    });
    return 'EVs: ' + spParts.join(' / ');
  });
}

const FEATURED_COMMUNITY_PASTES = [
  // 1. Golisopod & Garchomp Z Rain
  `Archaludon @ Leftovers
Ability: Stamina
Level: 50
EVs: 32 HP / 1 Def / 1 SpA / 23 SpD / 9 Spe
Bold Nature
- Electro Shot
- Dragon Pulse
- Snarl
- Protect

Politoed @ Mystic Water
Ability: Drizzle
Level: 50
EVs: 32 HP / 30 SpA / 4 Spe
Modest Nature
- Weather Ball
- Ice Beam
- Helping Hand
- Protect

Golisopod @ Golisopite
Ability: Emergency Exit
Level: 50
EVs: 32 HP / 32 Atk / 2 Spe
Adamant Nature
- First Impression
- Liquidation
- Leech Life
- Protect

Garchomp @ Garchompite Z
Ability: Rough Skin
Level: 50
EVs: 2 HP / 32 SpA / 32 Spe
Timid Nature
- Earth Power
- Draco Meteor
- Muddy Water
- Protect

Rillaboom @ Assault Vest
Ability: Grassy Surge
Level: 50
EVs: 28 HP / 32 Atk / 2 Def / 2 SpD / 2 Spe
Adamant Nature
- Grassy Glide
- Wood Hammer
- High Horsepower
- U-turn

Incineroar @ Sitrus Berry
Ability: Intimidate
Level: 50
EVs: 32 HP / 4 Atk / 14 Def / 16 SpD
Careful Nature
- Fake Out
- Knock Off
- Flare Blitz
- Parting Shot`,

  // 2. Gardevoir & Staraptor Psyspam
  `Gardevoir @ Gardevoirite
Ability: Trace
Level: 50
EVs: 2 HP / 32 SpA / 32 Spe
Modest Nature
- Hyper Voice
- Expanding Force
- Psychic
- Protect

Indeedee-F @ Psychic Seed
Ability: Psychic Surge
Level: 50
EVs: 32 HP / 28 Def / 6 SpD
Bold Nature
- Follow Me
- Helping Hand
- Dazzling Gleam
- Protect

Staraptor @ Staraptite
Ability: Intimidate
Level: 50
EVs: 2 HP / 32 Atk / 32 Spe
Jolly Nature
- Brave Bird
- Close Combat
- Double-Edge
- Protect

Gholdengo @ Choice Specs
Ability: Good as Gold
Level: 50
EVs: 2 HP / 32 SpA / 32 Spe
Timid Nature
- Make It Rain
- Shadow Ball
- Thunderbolt
- Focus Blast

Urshifu-Rapid-Strike @ Mystic Water
Ability: Unseen Fist
Level: 50
EVs: 2 HP / 32 Atk / 32 Spe
Jolly Nature
- Surging Strikes
- Close Combat
- Aqua Jet
- Detect

Whimsicott @ Focus Sash
Ability: Prankster
Level: 50
EVs: 32 HP / 2 Def / 32 Spe
Timid Nature
- Tailwind
- Moonblast
- Encore
- Protect`,

  // 3. Mega Dragonite Balance
  `Dragonite @ Dragonitite
Ability: Multiscale
Level: 50
EVs: 32 HP / 32 Atk / 2 Spe
Adamant Nature
- Extreme Speed
- Outrage
- Fire Punch
- Protect

Chien-Pao @ Focus Sash
Ability: Sword of Ruin
Level: 50
EVs: 2 HP / 32 Atk / 32 Spe
Jolly Nature
- Ice Spinner
- Sucker Punch
- Sacred Sword
- Protect

Rillaboom @ Miracle Seed
Ability: Grassy Surge
Level: 50
EVs: 30 HP / 32 Atk / 4 Spe
Adamant Nature
- Grassy Glide
- Wood Hammer
- Fake Out
- U-turn

Heatran @ Leftovers
Ability: Flash Fire
Level: 50
EVs: 32 HP / 32 SpA / 2 Spe
Modest Nature
- Heat Wave
- Earth Power
- Flash Cannon
- Protect

Ogerpon-Wellspring @ Wellspring Mask
Ability: Water Absorb
Level: 50
EVs: 20 HP / 32 Atk / 14 Spe
Jolly Nature
- Ivy Cudgel
- Horn Leech
- Follow Me
- Spiky Shield

Landorus-Therian @ Choice Scarf
Ability: Intimidate
Level: 50
EVs: 2 HP / 32 Atk / 32 Spe
Jolly Nature
- Earthquake
- Rock Slide
- U-turn
- Stomping Tantrum`
];

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchTeamPage(teamId) {
  try {
    const res = await fetch(`https://crob.at/${teamId}`, {
      headers: { 'User-Agent': USER_AGENTS }
    });
    if (!res.ok) return null;
    const html = await res.text();
    const titleMatch = /<title>([^<]+)<\/title>/.exec(html);
    const title = titleMatch ? titleMatch[1].replace(/\|.*$/, '').trim() : `Team ${teamId}`;
    const pasteMatch = /<textarea[^>]*>([\s\S]*?)<\/textarea>/.exec(html);
    if (!pasteMatch) return null;
    return { id: teamId, title, rawPaste: pasteMatch[1].trim() };
  } catch (e) {
    return null;
  }
}

async function scrapeTeams(targetCount = 210) {
  console.log(`Starting scraper for Pokémon Champions Reg M-C (Target: ${targetCount} teams)...`);
  const collectedTeams = [];
  const teamIds = new Set();

  // 1. Add featured tournament community pastes
  FEATURED_COMMUNITY_PASTES.forEach((paste, idx) => {
    const norm = normalizeChampionsPaste(paste);
    const parsed = Teams.import(norm);
    if (parsed && parsed.length === 6) {
      collectedTeams.push({
        id: `featured-${idx + 1}`,
        title: `Community Replica Tournament Team #${idx + 1}`,
        paste: norm,
        mons: parsed.map(m => m.name || m.species)
      });
    }
  });
  console.log(`Added ${collectedTeams.length} featured tournament baseline teams.`);

  // 2. Scrape from crob.at pagination
  let page = 1;
  const maxPages = 20;

  while (collectedTeams.length < targetCount && page <= maxPages) {
    console.log(`Fetching page ${page} from https://crob.at/teams/champions?page=${page}...`);
    try {
      const pageRes = await fetch(`https://crob.at/teams/champions?page=${page}`, {
        headers: { 'User-Agent': USER_AGENTS }
      });
      if (!pageRes.ok) {
        console.warn(`Page ${page} failed with status ${pageRes.status}`);
        break;
      }
      const pageHtml = await pageRes.text();
      const re = /href="\/([a-zA-Z0-9_-]+)"[^>]*data-team-browser-open/g;
      let m;
      const pageIds = [];
      while ((m = re.exec(pageHtml)) !== null) {
        if (!teamIds.has(m[1])) {
          teamIds.add(m[1]);
          pageIds.push(m[1]);
        }
      }

      console.log(`Found ${pageIds.length} new teams on page ${page}. Fetching team data...`);

      // Fetch teams in concurrent chunks of 5
      for (let i = 0; i < pageIds.length; i += 5) {
        if (collectedTeams.length >= targetCount) break;
        const chunk = pageIds.slice(i, i + 5);
        const results = await Promise.all(chunk.map(id => fetchTeamPage(id)));

        for (const res of results) {
          if (!res || !res.rawPaste) continue;
          const norm = normalizeChampionsPaste(res.rawPaste);
          const parsed = Teams.import(norm);

          // Quality filters: Must be exactly 6 Pokémon and have valid moves
          if (parsed && parsed.length === 6) {
            const hasMoves = parsed.every(mon => Array.isArray(mon.moves) && mon.moves.length > 0);
            if (hasMoves) {
              collectedTeams.push({
                id: res.id,
                title: res.title,
                paste: norm,
                mons: parsed.map(m => m.name || m.species)
              });
              process.stdout.write(`\rTeams collected: ${collectedTeams.length}/${targetCount} `);
            }
          }
        }
        await delay(150); // Respectful rate limiting
      }
      page++;
      await delay(200);
    } catch (err) {
      console.error(`Error on page ${page}:`, err.message);
      break;
    }
  }

  console.log(`\nScraping complete! Total valid teams collected: ${collectedTeams.length}`);

  // Save to data/champions_teams_200.json
  const outPath = path.join(__dirname, '..', 'data', 'champions_teams_200.json');
  fs.writeFileSync(outPath, JSON.stringify(collectedTeams, null, 2), 'utf8');
  console.log(`Saved ${collectedTeams.length} teams to ${outPath}!`);

  return collectedTeams;
}

if (require.main === module) {
  scrapeTeams(210);
}

module.exports = { scrapeTeams, normalizeChampionsPaste };

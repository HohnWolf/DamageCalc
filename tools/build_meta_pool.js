#!/usr/bin/env node
// Build the bundled meta-team pool.
// Starts from the pre-removal team list (git d1b1446~1), keeps teams that pass
// the official Reg M-C validator, and fills missing ability / 0 SP from the
// most common data.pkmn.cc Champions VGC spread. Assumptions are marked.
// Limitless has no documented public API or terms that allow redistributing
// OTS lists, so those teams are not scraped. Players can import a paste.
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const Sim = require('../vendor/ps');
const { FORMAT_ID } = require('../js/meta/format');

const ROOT = path.join(__dirname, '..');
const CHAOS_URL = 'https://data.pkmn.cc/stats/gen9championsvgc2026.json';
const OUT_TEAMS = path.join(ROOT, 'data', 'meta_teams.js');
const OUT_SPREADS = path.join(ROOT, 'data', 'meta_spreads.js');

function loadOld() {
  const raw = execFileSync('git', ['show', 'd1b1446~1:data/champions_teams_200.json'], {
    cwd: ROOT, maxBuffer: 20 * 1024 * 1024
  });
  return JSON.parse(raw.toString('utf8'));
}

function topKey(obj) {
  let best = null, score = -1;
  for (const k of Object.keys(obj || {})) {
    const v = obj[k];
    const n = typeof v === 'number' ? v : (v && v.weight) || 0;
    if (n > score) { score = n; best = k; }
  }
  return best;
}

function parseSpread(s) {
  if (!s || s.indexOf(':') < 0) return null;
  const nature = s.slice(0, s.indexOf(':'));
  const nums = s.slice(nature.length + 1).split('/').map((x) => Math.max(0, Math.min(32, parseInt(x, 10) || 0)));
  if (nums.length < 6) return null;
  return { nature, evs: { hp: nums[0], atk: nums[1], def: nums[2], spa: nums[3], spd: nums[4], spe: nums[5] } };
}

function compactChaos(raw) {
  const out = {};
  for (const name of Object.keys(raw.pokemon || {})) {
    const p = raw.pokemon[name];
    const spread = topKey(p.spreads);
    const ability = topKey(p.abilities);
    const item = topKey(p.items);
    const moves = Object.entries(p.moves || {}).filter((e) => e[0] && e[0] !== 'Nothing').sort((a, b) => b[1] - a[1]).slice(0, 8).map((e) => e[0]);
    out[name] = {
      usage: +((p.usage && p.usage.weighted) || 0).toFixed(4),
      ability: ability && ability !== 'Nothing' ? ability : '',
      item: item && item !== 'Nothing' ? item : '',
      spread: spread || '',
      moves
    };
  }
  return { source: CHAOS_URL, date: new Date().toISOString().slice(0, 10), battles: raw.battles || 0, pokemon: out };
}

function speciesKey(set, dex) {
  const item = dex.items.get(set.item);
  const mega = item && item.megaStone && item.megaStone[set.species];
  return mega || set.species;
}

function fillSet(set, spreads, dex, notes) {
  const key = speciesKey(set, dex);
  const row = spreads.pokemon[key] || spreads.pokemon[set.species];
  if (!set.ability) {
    const ab = (row && row.ability) || (dex.species.get(set.species).abilities || {})['0'] || '';
    if (ab) { set.ability = ab; notes.push(set.species + ': Fähigkeit aus dem häufigsten Usage-Set'); }
  }
  const total = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'].reduce((s, k) => s + (set.evs[k] || 0), 0);
  if (total === 0 && row && row.spread) {
    const sp = parseSpread(row.spread);
    if (sp) {
      set.nature = sp.nature;
      set.evs = sp.evs;
      notes.push(set.species + ': SP aus dem häufigsten Spread (' + row.spread + ')');
    }
  }
}

function exportPaste(sets) {
  return sets.map((set) => {
    const lines = [];
    const name = set.name && set.name !== set.species ? set.name + ' (' + set.species + ')' : set.species;
    lines.push(name + (set.item ? ' @ ' + set.item : ''));
    if (set.ability) lines.push('Ability: ' + set.ability);
    lines.push('Level: ' + (set.level || 50));
    if (set.shiny) lines.push('Shiny: Yes');
    const statName = { hp: 'HP', atk: 'Atk', def: 'Def', spa: 'SpA', spd: 'SpD', spe: 'Spe' };
    const ev = Object.keys(statName).filter((k) => set.evs && set.evs[k]).map((k) => set.evs[k] + ' ' + statName[k]);
    if (ev.length) lines.push('EVs: ' + ev.join(' / '));
    if (set.nature) lines.push(set.nature + ' Nature');
    (set.moves || []).forEach((m) => lines.push('- ' + m));
    return lines.join('\n');
  }).join('\n\n');
}

function speciesList(sets) {
  return sets.map((s) => s.species);
}

function primaryArchetype(paste) {
  const t = '\n' + paste.toLowerCase();
  const tr = t.includes('\n- trick room');
  const tw = t.includes('\n- tailwind');
  const sun = /drought|chlorophyll|protosynthesis|orichalcum pulse|torkoal|charizardite y/.test(t);
  const rain = /drizzle|swift swim|pelipper|politoed/.test(t);
  const sand = /sand stream|sand rush|tyranitar|hippowdon/.test(t);
  const snow = /snow warning|slush rush|abomasnow/.test(t);
  if (tr && !tw) return 'Trick Room';
  if (sun && !rain && !sand) return 'Sun';
  if (rain && !sun && !sand) return 'Rain';
  if (sand) return 'Sand';
  if (snow) return 'Snow';
  if (tw) return 'Tailwind';
  if (tr) return 'Trick Room';
  return 'Balance';
}

function cluster(teams) {
  const groups = {};
  teams.forEach((t) => { (groups[t.archetype] = groups[t.archetype] || []).push(t); });
  let n = 0;
  for (const arch of Object.keys(groups)) {
    const clusters = [];
    for (const t of groups[arch]) {
      const set = new Set(t.species);
      let home = null;
      for (const c of clusters) {
        let inter = 0;
        for (const s of t.species) if (c.species.has(s)) inter++;
        if (inter >= 3) { home = c; break; }
      }
      if (!home) { home = { id: arch.toLowerCase().replace(/[^a-z]+/g, '') + '-' + (++n), species: new Set() }; clusters.push(home); }
      for (const s of set) home.species.add(s);
      t.cluster = home.id;
    }
  }
}

async function main() {
  const dex = Sim.Dex.forFormat(FORMAT_ID);
  const validator = new Sim.TeamValidator(FORMAT_ID);
  let chaosRaw = null;
  try {
    const res = await fetch(CHAOS_URL);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    chaosRaw = await res.json();
  } catch (e) {
    console.error('chaos fetch failed', e.message);
    process.exit(1);
  }
  const spreads = compactChaos(chaosRaw);
  const old = loadOld();
  const kept = [];
  let filled = 0, dropped = 0;
  for (const t of old) {
    const sets = Sim.Teams.import(t.paste);
    if (!sets || !sets.length) { dropped++; continue; }
    let problems = validator.validateTeam(sets);
    const notes = [];
    if (problems) {
      const onlySoft = problems.every((p) => /Stat Points|needs to have an ability|Ability is required/i.test(p));
      if (onlySoft) {
        sets.forEach((s) => fillSet(s, spreads, dex, notes));
        problems = validator.validateTeam(sets);
        if (!problems) filled++;
      }
    }
    if (problems) { dropped++; continue; }
    const paste = exportPaste(sets);
    kept.push({
      id: String(t.id),
      name: require('../js/meta/text').decodeEntities(t.title || t.id),
      source: notes.length ? 'pool+usage' : 'pool',
      date: '2026-11-12',
      paste,
      species: speciesList(sets),
      archetype: primaryArchetype(paste),
      assumed: notes.length > 0,
      notes: notes.join('; ')
    });
  }
  cluster(kept);
  const counts = {};
  kept.forEach((t) => { counts[t.archetype] = (counts[t.archetype] || 0) + 1; });
  const payload = {
    format: FORMAT_ID,
    showdown: fs.readFileSync(path.join(ROOT, 'vendor', 'ps', 'PIN'), 'utf8').trim(),
    date: '2026-11-12',
    note: 'Legal under the official TeamValidator. Missing ability or 0 SP filled from data.pkmn.cc usage and marked assumed. Limitless OTS was not bundled (no public terms).',
    teams: kept
  };
  fs.writeFileSync(OUT_TEAMS, 'window.RL_META_TEAMS = ' + JSON.stringify(payload) + ';\n');
  fs.writeFileSync(OUT_SPREADS, 'window.RL_META_SPREADS = ' + JSON.stringify(spreads) + ';\n');
  console.log('kept', kept.length, 'filled', filled, 'dropped', dropped, 'of', old.length);
  console.log('archetypes', counts);
  console.log('bytes teams', fs.statSync(OUT_TEAMS).size, 'spreads', fs.statSync(OUT_SPREADS).size);
}

main().catch((e) => { console.error(e); process.exit(1); });

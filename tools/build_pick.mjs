// Erzeugt die Daten für die Auswahlfenster im Teambuilder (Attacken, Items, Fähigkeiten):
//   data/desc_en.js   Effekttexte auf Englisch (Pokémon Showdown, mit Champions-Änderungen)
//   data/desc_de.js   Effekttexte auf Deutsch (PokeAPI, Spieltexte der jeweils neuesten Spielversion)
//   data/pick_meta.js PP der Attacken (Showdown + Champions) und Symbol-Nummern der Items (Item-Sheet von Showdown)
//
// Aufruf: node tools/build_pick.mjs <showdown-ordner> <pokeapi-ordner> data
//
// <showdown-ordner> enthält (Dateinamen genau so):
//   text_moves.ts, text_items.ts, text_abilities.ts   https://raw.githubusercontent.com/smogon/pokemon-showdown/master/data/text/{moves,items,abilities}.ts
//   champions_moves.ts                                https://raw.githubusercontent.com/smogon/pokemon-showdown/master/data/mods/champions/moves.ts
//   moves.json, items.js                              https://play.pokemonshowdown.com/data/{moves.json,items.js}
// <pokeapi-ordner> enthält aus PokeAPI/pokeapi (data/v2/csv/):
//   move_names.csv, ability_names.csv, item_names.csv, move_flavor_text.csv, ability_flavor_text.csv, item_flavor_text.csv
//
// Die heruntergeladenen Dateien werden nur als Text gelesen, nie ausgeführt. Die Namen der App (welche Attacken, Items und
// Fähigkeiten es gibt) kommen aus data/move_data.js, item_data.js und ability_data.js; sie laufen in einer leeren Sandbox.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const [, , SD, PA, OUT] = process.argv;
if (!SD || !PA || !OUT) {
  console.error('Aufruf: node tools/build_pick.mjs <showdown-ordner> <pokeapi-ordner> <ausgabe-ordner>');
  process.exit(1);
}
const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (dir, f) => fs.readFileSync(path.join(dir, f), 'utf8').replace(/^﻿/, '');
const idOf = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

// ---------------- Namen der App ----------------
const ctx = { console };
ctx.window = ctx;
vm.createContext(ctx);
for (const f of ['js/shim.js', 'data/move_data.js', 'data/item_data.js', 'data/ability_data.js']) {
  vm.runInContext(fs.readFileSync(path.join(REPO, f), 'utf8'), ctx, { filename: f });
}
const appNames = {
  moves: Object.keys(ctx.MOVES_CHAMPIONS_NATDEX).filter((n) => n !== '(No Move)'),
  items: [...new Set([].concat(ctx.ITEMS_CHAMPIONS, ctx.ITEMS_ZA_NATDEX, ctx.ITEMS_MEGA_STONES, ctx.ITEMS_MEGA_STONES_ZA))].filter((n) => n && n !== '(none)'),
  abilities: [...new Set([].concat(ctx.ABILITIES_CHAMPIONS_NATDEX, ctx.ABILITIES_CHAMPIONS))],
};

// App-Name -> Showdown-Name, wo die NCP-Namen von Showdown abweichen (sonst gilt die normalisierte Schreibweise).
const SD_ALIAS = { moves: {}, items: {}, abilities: {} };
// App-Name -> englischer PokeAPI-Name
const PA_ALIAS = { moves: {}, items: {}, abilities: {} };

// ---------------- Showdown: Texte ----------------
function jsString(lit) {
  try { return JSON.parse(lit); } catch (e) { return lit.slice(1, -1).replace(/\\'/g, "'").replace(/\\"/g, '"'); }
}
// "\tid: {" Blöcke einer Showdown-.ts-Textdatei; Felder desc/shortDesc, dazu Überschreibungen je Spielversion (gen8: {…}, champions: {…})
function parseText(ts) {
  const out = {};
  let id = null, sec = null, m;
  for (const line of ts.split(/\r?\n/)) {
    if ((m = /^\t(?:"([^"]+)"|([a-z0-9]+)): \{$/.exec(line))) { id = m[1] || m[2]; out[id] = { base: {}, over: {} }; sec = null; continue; }
    if (!id) continue;
    if ((m = /^\t\t([a-zA-Z0-9]+): \{$/.exec(line))) { sec = m[1]; out[id].over[sec] = {}; continue; }
    if (/^\t\t\},?$/.test(line)) { sec = null; continue; }
    if ((m = /^\t\t\t(desc|shortDesc): ("(?:[^"\\]|\\.)*"),$/.exec(line)) && sec) { out[id].over[sec][m[1]] = jsString(m[2]); continue; }
    if ((m = /^\t\t(desc|shortDesc): ("(?:[^"\\]|\\.)*"),$/.exec(line))) out[id].base[m[1]] = jsString(m[2]);
  }
  return out;
}
function firstSentence(s, max) {
  const t = s.replace(/\s+/g, ' ').trim();
  const i = t.search(/[.!?](\s|$)/);
  const one = i > 0 ? t.slice(0, i + 1) : t;
  return one.length > max ? one.slice(0, max - 1).trimEnd() + '…' : one;
}
function cleanEn(s) { return s.replace(/\bPokemon\b/g, 'Pokémon').replace(/\s+/g, ' ').trim(); }
// kurzer englischer Text: Champions-Überschreibung vor dem Standardtext; ohne shortDesc der erste Satz von desc
function shortEn(e) {
  if (!e) return '';
  const c = e.over.champions || {};
  const sd = c.shortDesc || (c.desc && !e.base.shortDesc ? firstSentence(c.desc, 140) : '') || e.base.shortDesc;
  return cleanEn(sd || (e.base.desc ? firstSentence(e.base.desc, 140) : ''));
}
const TXT = {
  moves: parseText(read(SD, 'text_moves.ts')),
  items: parseText(read(SD, 'text_items.ts')),
  abilities: parseText(read(SD, 'text_abilities.ts')),
};

// ---------------- Showdown: PP und Item-Symbole ----------------
const pp = {};
const movesJson = JSON.parse(read(SD, 'moves.json'));
for (const [mid, m] of Object.entries(movesJson)) if (Number.isFinite(m.pp) && !m.isZ && !m.isMax) pp[mid] = m.pp;
const champChanged = [];
{ // Champions: "\tmoveid: {" Blöcke mit einer "pp:"-Zeile
  let cur = null, m;
  for (const line of read(SD, 'champions_moves.ts').split(/\r?\n/)) {
    if ((m = /^\t([a-z0-9]+): \{/.exec(line))) { cur = m[1]; continue; }
    if ((m = /^\t\tpp: (\d+),/.exec(line)) && cur) { pp[cur] = +m[1]; champChanged.push(cur); }
  }
}
const icon = {};
{ // items.js: Einträge "id:{name:"…",fling:{…},spritenum:123,…}" (reiner Text, nicht ausgeführt). Die Reihenfolge der Felder
  // wechselt, deshalb gilt: die erste spritenum nach einem name:"…" gehört zu diesem Item, bis das nächste name:"…" beginnt.
  const chunks = read(SD, 'items.js').split('name:"').slice(1);
  for (const c of chunks) {
    const end = c.indexOf('"');
    const sp = /spritenum:(\d+)/.exec(c.slice(end));
    if (sp) icon[idOf(c.slice(0, end))] = +sp[1];
  }
}

// ---------------- PokeAPI: deutsche Texte ----------------
function parseCsv(text) {
  const rows = [];
  let row = [], f = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(f); f = ''; }
    else if (c === '\n') { row.push(f); rows.push(row); row = []; f = ''; }
    else if (c !== '\r') f += c;
  }
  if (f || row.length) { row.push(f); rows.push(row); }
  return rows;
}
const LANG_DE = '6', LANG_EN = '9';
function pokeapi(kind) {
  const names = parseCsv(read(PA, kind + '_names.csv'));
  const col = names[0], iId = col.indexOf(kind + '_id'), iLang = col.indexOf('local_language_id'), iName = col.indexOf('name');
  const byEn = {};
  for (const r of names.slice(1)) if (r[iLang] === LANG_EN) byEn[idOf(r[iName])] = r[iId];
  const fl = parseCsv(read(PA, kind + '_flavor_text.csv'));
  const h = fl[0], a = h.indexOf(kind + '_id'), vg = h.indexOf('version_group_id'), lg = h.indexOf('language_id'), tx = h.indexOf('flavor_text');
  const de = {};
  for (const r of fl.slice(1)) {
    if (r[lg] !== LANG_DE) continue;
    const v = +r[vg];
    if (!de[r[a]] || v >= de[r[a]].v) de[r[a]] = { v, text: r[tx] };
  }
  return { byEn, de };
}
function cleanDe(s) {
  return s.replace(/­\s*/g, '').replace(/[\n\f\r]+/g, ' ').replace(/\s+/g, ' ').replace(/POKéMON/g, 'Pokémon').trim();
}
const PAPI = { moves: pokeapi('move'), items: pokeapi('item'), abilities: pokeapi('ability') };

// ---------------- deutsche Zusatztexte (von Hand) ----------------
// tools/desc_de_extra.json: "override" = Änderungen von Champions (vor PokeAPI), "fill" = Lücken von PokeAPI (Gen-9-Inhalte)
const EXTRA = JSON.parse(read(path.dirname(fileURLToPath(import.meta.url)), 'desc_de_extra.json'));
for (const part of ['override', 'fill']) for (const kind of ['moves', 'items', 'abilities']) {
  for (const name of Object.keys(EXTRA[part][kind] || {})) {
    if (!appNames[kind].includes(name)) console.warn(`Warnung: ${part}/${kind}: „${name}“ gibt es in der App nicht`);
  }
}
// Mega-Steine ohne Text: nach dem Wortlaut der Spieltexte ("Einer der mysteriösen Mega-Steine. Wird er von einem Gengar getragen, …")
const NDE = (() => {
  const c = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(REPO, 'data/names_de.js'), 'utf8'), c);
  return c.window.NAMES_DE;
})();
function megaStoneDe(stone) {
  let user = ctx.MEGA_STONE_USER_LOOKUP[stone];
  if (Array.isArray(user)) user = user[0]; // z. B. Zygardite: Zygarde, Zygarde-10 %, Zygarde-Complete
  if (!user) return '';
  const [base, ...rest] = user.split('-');
  const sp = (NDE.species[idOf(base)] || base) + (rest.join('-') === 'Eternal' ? ' (Ewige Blume)' : '');
  const letter = /\s([XYZ])$/.exec(stone);
  const what = letter ? `die Mega-Entwicklung zu Mega-${sp} ${letter[1]} durchführen` : 'eine Mega-Entwicklung durchführen';
  return `Einer der mysteriösen Mega-Steine. Wird er von einem ${sp} getragen, kann es im Kampf ${what}.`;
}

// ---------------- zusammenführen ----------------
const en = { moves: {}, items: {}, abilities: {} }, de = { moves: {}, items: {}, abilities: {} };
const miss = { en: { moves: [], items: [], abilities: [] }, de: { moves: [], items: [], abilities: [] } };
let templated = 0;
for (const kind of ['moves', 'items', 'abilities']) {
  for (const name of appNames[kind]) {
    const key = idOf(name);
    const e = shortEn(TXT[kind][idOf(SD_ALIAS[kind][name] || name)]);
    if (e) en[kind][key] = e; else miss.en[kind].push(name);
    const pid = PAPI[kind].byEn[idOf(PA_ALIAS[kind][name] || name)];
    let g = (EXTRA.override[kind] || {})[name] || (pid && PAPI[kind].de[pid] ? cleanDe(PAPI[kind].de[pid].text) : '') || (EXTRA.fill[kind] || {})[name];
    if (!g && kind === 'items') { g = megaStoneDe(name); if (g) templated++; }
    if (g) de[kind][key] = g; else miss.de[kind].push(name);
  }
}
const metaPp = {};
for (const name of appNames.moves) { const k = idOf(name); if (pp[k] != null) metaPp[k] = pp[k]; }
const metaIcon = {};
for (const name of appNames.items) { const k = idOf(name); if (icon[k] != null) metaIcon[k] = icon[k]; }

const compact = (o) => JSON.stringify(o);
const w = (f, head, varName, obj) => fs.writeFileSync(path.join(OUT, f), head + '\nwindow.' + varName + ' = ' + compact(obj) + ';\n', { encoding: 'utf8' });
w('desc_en.js', '// Effekttexte (englisch): Pokémon Showdown (MIT), mit den Änderungen von Pokémon Champions. Erzeugt mit tools/build_pick.mjs\n// Schlüssel: Name in Kleinbuchstaben ohne Sonderzeichen.', 'DESC_EN', en);
w('desc_de.js', '// Effekttexte (deutsch): PokeAPI (Texte aus den Spielen), je Eintrag die neueste Spielversion. Erzeugt mit tools/build_pick.mjs\n// Schlüssel: Name in Kleinbuchstaben ohne Sonderzeichen (englischer App-Name).', 'DESC_DE', de);
w('pick_meta.js', '// PP der Attacken (Showdown, mit Champions) und Symbol-Nummern der Items im Showdown-Item-Sheet (24 px, 16 je Zeile). Erzeugt mit tools/build_pick.mjs', 'PICK_META', { pp: metaPp, icon: metaIcon });

const cnt = (o) => Object.keys(o).length;
console.log(`Attacken ${appNames.moves.length}, Items ${appNames.items.length}, Fähigkeiten ${appNames.abilities.length}`);
console.log(`EN: ${cnt(en.moves)} / ${cnt(en.items)} / ${cnt(en.abilities)}   DE: ${cnt(de.moves)} / ${cnt(de.items)} / ${cnt(de.abilities)} (davon ${templated} Mega-Steine aus der Vorlage)   PP: ${cnt(metaPp)} (Champions-Änderungen: ${champChanged.length})   Item-Symbole: ${cnt(metaIcon)}`);
// Lücken nur für das, was in Champions erlaubt ist (der Rest fällt in der App auf den englischen Text zurück)
for (const [kind, list] of [['moves', Object.keys(ctx.MOVES_CHAMPIONS).filter((n) => n !== '(No Move)')], ['items', ctx.ITEMS_CHAMPIONS], ['abilities', ctx.ABILITIES_CHAMPIONS]]) {
  const m = list.filter((n) => !de[kind][idOf(n)]);
  console.log(`Champions ${kind}: ${list.length}, ohne deutschen Text: ${m.length}${m.length ? ' → ' + m.join(', ') : ''}`);
}
// Alles andere (Z-/Dyna-Attacken, alte Items …) nur als Zahl; die App fällt dort auf den englischen Text bzw. ohne Text zurück
const n = (o) => ['moves', 'items', 'abilities'].map((k) => o[k].length).join(' / ');
console.log(`ohne EN-Text (Attacken / Items / Fähigkeiten): ${n(miss.en)}   ohne DE-Text: ${n(miss.de)}`);
const noPp = appNames.moves.filter((x) => metaPp[idOf(x)] == null);
console.log(`ohne PP: ${noPp.length}   ohne Item-Symbol: ${appNames.items.filter((x) => metaIcon[idOf(x)] == null).join(', ')}`);

# Baut die Daten für Soul Link und den Nuzlocke-Rechner:
#   data/natdex.js     – alle Pokémon (National-Dex 1–1025): Showdown-ID, englischer/deutscher Name, Typen, Gewicht
#   data/gen3_names.js – Attacken (1–354) und Fähigkeiten (1–77) der 3. Generation auf Deutsch/Englisch
#   data/nds_names.js  – Attacken (1–559), Fähigkeiten (1–164) und Items (Spielnummer der 4./5. Generation) für NDS-Spiele
# Quellen (vorher herunterladen und als Pfade übergeben):
#   pokedex.json        https://play.pokemonshowdown.com/data/pokedex.json
#   species_names.csv   https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/pokemon_species_names.csv
#   move_names.csv      https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/move_names.csv
#   ability_names.csv   https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/ability_names.csv
#   item_names.csv, item_game_indices.csv (gleicher Ordner bei PokeAPI)
# Aufruf: python -I tools/build_nuz.py <quellordner> <zielordner data>
import csv, json, os, sys

src, out = sys.argv[1], sys.argv[2]
DE, EN = '6', '9'


def names(fn):
    res = {}
    with open(os.path.join(src, fn), encoding='utf-8') as f:
        r = csv.reader(f)
        next(r)
        for row in r:
            if row[1] in (DE, EN):
                res.setdefault(int(row[0]), {})[row[1]] = row[2]
    return res


dex = json.load(open(os.path.join(src, 'pokedex.json'), encoding='utf-8'))
sp = names('species_names.csv')
nat = [None] * 1026
for key, d in dex.items():
    n = d.get('num', 0)
    if not (1 <= n <= 1025) or d.get('forme') or d.get('baseSpecies'):
        continue
    if nat[n]:
        continue
    de = sp.get(n, {}).get(DE, d['name'])
    nat[n] = [key, d['name'], de, d['types'], d.get('weightkg', 0)]
missing = [i for i in range(1, 1026) if not nat[i]]
if missing:
    sys.exit('fehlende Nummern: %s' % missing[:20])

mv = names('move_names.csv')
moves_en = [''] + [mv.get(i, {}).get(EN, '') for i in range(1, 355)]
moves_de = [''] + [mv.get(i, {}).get(DE, moves_en[i]) for i in range(1, 355)]
ab = names('ability_names.csv')
# Gen 3: 1–75 wie PokeAPI, 76 = Kakophonie (nur Gen 3), 77 = Air Lock (PokeAPI 76)
ab_src = list(range(0, 76)) + [None, 76]
ab_en, ab_de = [], []
for i, s in enumerate(ab_src):
    if i == 0:
        ab_en.append(''); ab_de.append(''); continue
    if s is None:
        ab_en.append('Cacophony'); ab_de.append('Kakophonie'); continue
    ab_en.append(ab.get(s, {}).get(EN, '')); ab_de.append(ab.get(s, {}).get(DE, ab_en[-1]))

with open(os.path.join(out, 'natdex.js'), 'w', encoding='utf-8', newline='\n') as f:
    f.write('// Alle Pokémon nach National-Dex-Nummer: [Showdown-ID, Englisch, Deutsch, Typen, Gewicht kg]. Erzeugt von tools/build_nuz.py\n')
    f.write('window.NATDEX = ' + json.dumps(nat, ensure_ascii=False, separators=(',', ':')) + ';\n')
with open(os.path.join(out, 'gen3_names.js'), 'w', encoding='utf-8', newline='\n') as f:
    f.write('// Namen der Attacken und Fähigkeiten der 3. Generation nach interner Nummer. Erzeugt von tools/build_nuz.py\n')
    f.write('window.GEN3_NAMES = ' + json.dumps({'moves': {'en': moves_en, 'de': moves_de}, 'abilities': {'en': ab_en, 'de': ab_de}},
                                             ensure_ascii=False, separators=(',', ':')) + ';\n')
print('natdex', len(nat) - 1, 'moves', len(moves_en) - 1, 'abilities', len(ab_en) - 1)
print(ascii([nat[1], nat[29], nat[122], nat[1025], moves_de[1], moves_de[354], ab_de[77], ab_de[76]]))

# ---- NDS (4. und 5. Generation): Nummern im Spiel = Nummern bei PokeAPI für Attacken und Fähigkeiten; Items über item_game_indices
nd_moves_en = [''] + [mv.get(i, {}).get(EN, '') for i in range(1, 560)]
nd_moves_de = [''] + [mv.get(i, {}).get(DE, nd_moves_en[i]) for i in range(1, 560)]
nd_ab_en = [''] + [ab.get(i, {}).get(EN, '') for i in range(1, 165)]
nd_ab_de = [''] + [ab.get(i, {}).get(DE, nd_ab_en[i]) for i in range(1, 165)]
it = names('item_names.csv')
game = {}
with open(os.path.join(src, 'item_game_indices.csv'), encoding='utf-8') as f:
    r = csv.reader(f)
    next(r)
    for row in r:
        if row[1] in ('4', '5'):
            game.setdefault(row[1], {})[int(row[2])] = int(row[0])
top = max(max(game['5']), max(game['4']))
nd_it_en, nd_it_de = [], []
for i in range(top + 1):
    iid = game['5'].get(i) or game['4'].get(i)
    n = it.get(iid, {}) if iid else {}
    nd_it_en.append(n.get(EN, '')); nd_it_de.append(n.get(DE, n.get(EN, '')))
# Pokémon bis Nr. 649, die sich noch entwickeln können (Evolith)
nfe = sorted({d['num'] for d in dex.values() if 1 <= d.get('num', 0) <= 649 and not d.get('forme') and
              any(1 <= dex.get(e.lower().replace(' ', '').replace('-', '').replace('.', '').replace("'", ''), {}).get('num', 0) <= 649 for e in d.get('evos', []))})
with open(os.path.join(out, 'nds_names.js'), 'w', encoding='utf-8', newline='\n') as f:
    f.write('// Namen der Attacken, Fähigkeiten und Items der 4. und 5. Generation nach Nummer im Spiel. Erzeugt von tools/build_nuz.py\n')
    f.write('window.NDS_NAMES = ' + json.dumps({'moves': {'en': nd_moves_en, 'de': nd_moves_de}, 'abilities': {'en': nd_ab_en, 'de': nd_ab_de},
                                            'items': {'en': nd_it_en, 'de': nd_it_de}, 'nfe': nfe}, ensure_ascii=False, separators=(',', ':')) + ';\n')
print('nds nfe', len(nfe), 'moves', len(nd_moves_en) - 1, 'abilities', len(nd_ab_en) - 1, 'items', len(nd_it_en) - 1)
print(ascii([nd_moves_de[559], nd_ab_de[164], nd_it_de[234], nd_it_en[220], nd_it_en[564]]))

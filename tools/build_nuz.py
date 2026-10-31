# Baut die Daten für Soul Link und den Nuzlocke-Rechner:
#   data/natdex.js     – alle Pokémon (National-Dex 1–1025): Showdown-ID, englischer/deutscher Name, Typen, Gewicht
#   data/gen3_names.js – Attacken (1–354) und Fähigkeiten (1–77) der 3. Generation auf Deutsch/Englisch
# Quellen (vorher herunterladen und als Pfade übergeben):
#   pokedex.json        https://play.pokemonshowdown.com/data/pokedex.json
#   species_names.csv   https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/pokemon_species_names.csv
#   move_names.csv      https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/move_names.csv
#   ability_names.csv   https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/ability_names.csv
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

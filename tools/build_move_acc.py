"""Erzeugt data/move_acc.js (Genauigkeit aller Attacken) aus den Showdown-Daten.

Quellen:
  https://play.pokemonshowdown.com/data/moves.json
  https://raw.githubusercontent.com/smogon/pokemon-showdown/master/data/mods/champions/moves.ts (Champions-Änderungen)

Aufruf: python tools/build_move_acc.py moves.json champ_moves.ts data/move_acc.js
Ausgabe: window.MOVE_ACC = { "<moveid>": 100 | ... | true }  (true = trifft immer)
"""
import json
import re
import sys

moves = json.load(open(sys.argv[1], encoding='utf-8'))
acc = {}
for mid, m in moves.items():
    if m.get('isNonstandard') in ('CAP', 'LGPE', 'Custom') or m.get('isZ') or m.get('isMax'):
        continue
    a = m.get('accuracy')
    if a is True or isinstance(a, (int, float)):
        acc[mid] = a

# Champions overrides: top-level "\tmoveid: {" blocks with an "accuracy:" line
cur = None
changed = []
for line in open(sys.argv[2], encoding='utf-8'):
    m = re.match(r'^\t([a-z0-9]+): \{', line)
    if m:
        cur = m.group(1)
        continue
    m = re.match(r'^\t\taccuracy: (true|\d+),', line)
    if m and cur:
        acc[cur] = True if m.group(1) == 'true' else int(m.group(1))
        changed.append(cur)

with open(sys.argv[3], 'w', encoding='utf-8', newline='\n') as f:
    f.write('// Genauigkeit der Attacken (Pokémon Showdown, mit Champions-Änderungen). Erzeugt mit tools/build_move_acc.py\n')
    f.write('window.MOVE_ACC = ' + json.dumps(acc, separators=(',', ':')) + ';\n')
print(len(acc), 'Attacken, Champions-Änderungen:', ', '.join(changed))

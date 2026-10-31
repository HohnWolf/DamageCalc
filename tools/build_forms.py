"""Erzeugt data/forms_champ.js: Geschlecht, Kampfformen und kosmetische Varianten aller Pokémon (Showdown-Pokédex).

Quelle: https://play.pokemonshowdown.com/data/pokedex.json
Aufruf: python tools/build_forms.py pokedex.json data/forms_champ.js

Ausgabe: window.FORM_DATA = { "<showdown-id>": { b, g | r, bo, v } }
  b  = Basisart (baseSpecies), nur wenn abweichend vom eigenen Namen
  g  = festes Geschlecht "M" / "F" / "N" (N = geschlechtslos)
  r  = Anteil männlich (nur wenn nicht 50 %), z. B. 0.875
  bo = 1, wenn die Form nur im Kampf existiert (Klingenform, Heldenform, ...)
  bf = Name der Grundform (z. B. Meadow bei Vivillon), nur bei Arten mit Varianten
  v  = kosmetische Varianten (gleiche Werte, Typen und Fähigkeiten, nur anderes Aussehen), z. B. Vivillon-Muster
"""
import json
import re
import sys

dex = json.load(open(sys.argv[1], encoding='utf-8'))


def sid(name):
    return re.sub(r'[^a-z0-9]', '', name.lower())


SKIP = re.compile(r'-(Mega|Gmax|Totem|Primal|Eternamax|Starter)\b|-Mega$')
out = {}
nvar = 0
for k, e in dex.items():
    if e.get('isNonstandard') in ('CAP', 'Custom') or (e.get('num') or 0) <= 0:
        continue
    o = {}
    base = e.get('baseSpecies')
    if base and base != e.get('name'):
        o['b'] = base
    if e.get('gender'):
        o['g'] = e['gender']
    elif e.get('genderRatio') and abs(e['genderRatio'].get('M', 0.5) - 0.5) > 1e-9:
        o['r'] = e['genderRatio']['M']
    if e.get('battleOnly'):
        o['bo'] = 1
    # cosmetic variants: listed cosmetic formes plus other formes that only look different
    if not base or base == e.get('name'):
        var = list(e.get('cosmeticFormes') or [])
        for f in e.get('otherFormes') or []:
            fe = dex.get(sid(f))
            if not fe or SKIP.search(f) or fe.get('battleOnly') or fe.get('requiredItem') or fe.get('changesFrom'):
                continue
            if fe.get('baseStats') == e.get('baseStats') and fe.get('types') == e.get('types') and fe.get('gender') == e.get('gender') and fe.get('abilities') == e.get('abilities'):
                var.append(f)
        if var:
            o['v'] = var
            if e.get('baseForme'):
                o['bf'] = e['baseForme']
            nvar += len(var)
    if o:
        out[k] = o

with open(sys.argv[2], 'w', encoding='utf-8', newline='\n') as f:
    f.write('// Geschlecht, Kampfformen und kosmetische Varianten (Pokémon Showdown). Erzeugt mit tools/build_forms.py\n')
    f.write('window.FORM_DATA = ' + json.dumps(out, separators=(',', ':'), ensure_ascii=False) + ';\n')
print(len(out), 'Einträge,', nvar, 'kosmetische Varianten')
for t in ('vivillon', 'tatsugiri', 'sinistcha', 'maushold', 'meowstic', 'meowsticf', 'incineroar', 'aegislashblade', 'florges', 'rotomwash', 'pikachu', 'dudunsparce'):
    print(' ', t, out.get(t))

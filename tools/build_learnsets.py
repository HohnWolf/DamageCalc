"""Erzeugt data/learnsets_champ.js aus den Pokemon-Showdown-Daten.

Quellen (vorher herunterladen, Pfade als Argumente):
  1. https://raw.githubusercontent.com/smogon/pokemon-showdown/master/data/mods/champions/learnsets.ts
  2. https://play.pokemonshowdown.com/data/pokedex.json

Aufruf: python build_learnsets.py learnsets.ts pokedex.json ../data/learnsets_champ.js
"""
import json
import re
import sys

ts_path, dex_path, out_path = sys.argv[1:4]

learn = {}
cur = None
for line in open(ts_path, encoding="utf-8"):
    m = re.match(r"^\t([a-z0-9]+): \{(\},?)?\s*$", line)
    if m:
        cur = m.group(1)
        learn[cur] = []
        continue
    m = re.match(r"^\t\t\t([a-z0-9]+): \[", line)
    if m and cur:
        if m.group(1) not in learn[cur]:
            learn[cur].append(m.group(1))

learn = {k: v for k, v in learn.items() if v}

dex = json.load(open(dex_path, encoding="utf-8"))


def sid(name):
    return re.sub(r"[^a-z0-9]", "", name.lower())


parent = {}
abil = {}
for key, e in dex.items():
    if not isinstance(e, dict) or e.get("num", 0) <= 0:
        continue
    chain = [key]
    for f in ("changesFrom", "battleOnly", "baseSpecies"):
        v = e.get(f)
        if isinstance(v, list):
            v = v[0]
        if v:
            chain.append(sid(v))
    owner = next((c for c in chain if c in learn), None)
    if owner is None:
        continue
    if owner != key:
        parent[key] = owner
    a = [x for x in (e.get("abilities") or {}).values() if x]
    if a:
        abil[key] = a

with open(out_path, "w", encoding="utf-8") as f:
    f.write("// Automatisch erzeugt von tools/build_learnsets.py aus den Pokemon-Showdown-Daten (Mod: champions).\n")
    f.write("var CHAMP_LEARN = " + json.dumps({k: " ".join(v) for k, v in learn.items()}, separators=(",", ":")) + ";\n")
    f.write("var CHAMP_PARENT = " + json.dumps(parent, separators=(",", ":")) + ";\n")
    f.write("var CHAMP_ABIL = " + json.dumps(abil, separators=(",", ":"), ensure_ascii=False) + ";\n")

print(len(learn), "Lernsets,", len(parent), "Formen,", len(abil), "Faehigkeitslisten")

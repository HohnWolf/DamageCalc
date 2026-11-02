"""Erzeugt data/sprite_boxes.js: den sichtbaren Bereich (ohne transparenten Rand) jedes Gen-5-Sprites.

Damit zeigt die App jedes Pokémon formatfüllend in kleinen Kästen (Startbildschirm, Team-Leiste, Tabs,
Soul Link, Shiny-Zähler), ohne es abzuschneiden.

Aufruf: python tools/build_sprite_boxes.py [pokedex.json] ../data/learnsets_champ.js ../data/sprite_boxes.js
Wenn nur data/sprite_boxes.js und data/natdex.js übergeben werden (oder ohne Argumente im Projektordner),
werden alle fehlenden National-Dex-Sprites ergänzt.
"""
import io
import json
import os
import re
import sys
import urllib.request
from concurrent.futures import ThreadPoolExecutor

from PIL import Image


def sid(s):
    return re.sub(r"[^a-z0-9]", "", s.lower())


root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
out_path = sys.argv[3] if len(sys.argv) > 3 else os.path.join(root, "data", "sprite_boxes.js")
nat_path = os.path.join(root, "data", "natdex.js")

existing = {}
if os.path.exists(out_path):
    txt = open(out_path, encoding="utf-8").read()
    m = re.search(r"var SPRITE_BOXES = (\{.*?\});", txt, re.S)
    if m:
        existing = json.loads(m.group(1))

ids = set(existing.keys())
if len(sys.argv) > 3 and os.path.exists(sys.argv[1]):
    dex = json.load(open(sys.argv[1], encoding="utf-8"))
    learn_js = open(sys.argv[2], encoding="utf-8").read()
    learn = json.loads(re.search(r"var CHAMP_LEARN = (\{.*?\});", learn_js).group(1))
    parent = json.loads(re.search(r"var CHAMP_PARENT = (\{.*?\});", learn_js).group(1))
    for key, e in dex.items():
        if key in learn or key in parent:
            base = sid(e.get("baseSpecies") or e["name"])
            ids.add(base + ("-" + sid(e["forme"]) if e.get("forme") else ""))
            ids.add(base)

if os.path.exists(nat_path):
    nat_js = open(nat_path, encoding="utf-8").read()
    m = re.search(r"window\.NATDEX = (\[.*\]);", nat_js, re.S)
    if m:
        for entry in json.loads(m.group(1)):
            if entry and entry[0]:
                ids.add(entry[0])

todo = sorted(i for i in ids if i not in existing)


def bbox(sprite_id):
    for folder in ("gen5", "dex"):
        url = f"https://play.pokemonshowdown.com/sprites/{folder}/{sprite_id}.png"
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "champions-calc"})
            data = urllib.request.urlopen(req, timeout=20).read()
            im = Image.open(io.BytesIO(data)).convert("RGBA")
            box = im.getchannel("A").point(lambda a: 255 if a > 8 else 0).getbbox()
            if box:
                x0, y0, x1, y1 = box
                return sprite_id, [x0, y0, x1 - x0, y1 - y0, im.width]
        except Exception:
            continue
    return sprite_id, None


if todo:
    with ThreadPoolExecutor(32) as pool:
        for k, v in pool.map(bbox, todo):
            if v:
                existing[k] = v

res = {k: existing[k] for k in sorted(existing.keys())}
with open(out_path, "w", encoding="utf-8") as f:
    f.write("// Automatisch erzeugt von tools/build_sprite_boxes.py: sichtbarer Bereich je Sprite [x, y, Breite, Höhe, Bildgröße].\n")
    f.write("var SPRITE_BOXES = " + json.dumps(res, separators=(",", ":")) + ";\n")

print(len(res), "von", len(ids), "Sprites vermessen (neu:", len(todo), ")")

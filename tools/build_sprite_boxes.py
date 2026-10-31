"""Erzeugt data/sprite_boxes.js: den sichtbaren Bereich (ohne transparenten Rand) jedes Gen-5-Sprites.

Damit zeigt die App jedes Pokémon formatfüllend in kleinen Kästen (Team-Leiste, Tabs), ohne es abzuschneiden.

Aufruf: python build_sprite_boxes.py pokedex.json ../data/learnsets_champ.js ../data/sprite_boxes.js
(pokedex.json von https://play.pokemonshowdown.com/data/pokedex.json)
"""
import io
import json
import re
import sys
import urllib.request
from concurrent.futures import ThreadPoolExecutor

from PIL import Image

dex_path, learn_path, out_path = sys.argv[1:4]
dex = json.load(open(dex_path, encoding="utf-8"))
learn_js = open(learn_path, encoding="utf-8").read()
learn = json.loads(re.search(r"var CHAMP_LEARN = (\{.*?\});", learn_js).group(1))
parent = json.loads(re.search(r"var CHAMP_PARENT = (\{.*?\});", learn_js).group(1))


def sid(s):
    return re.sub(r"[^a-z0-9]", "", s.lower())


ids = set()
for key, e in dex.items():
    if key in learn or key in parent:
        base = sid(e.get("baseSpecies") or e["name"])
        ids.add(base + ("-" + sid(e["forme"]) if e.get("forme") else ""))
        ids.add(base)


def bbox(sprite_id):
    url = "https://play.pokemonshowdown.com/sprites/gen5/" + sprite_id + ".png"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "champions-calc"})
        data = urllib.request.urlopen(req, timeout=30).read()
    except Exception:
        return sprite_id, None
    im = Image.open(io.BytesIO(data)).convert("RGBA")
    box = im.getchannel("A").point(lambda a: 255 if a > 8 else 0).getbbox()
    if not box:
        return sprite_id, None
    x0, y0, x1, y1 = box
    return sprite_id, [x0, y0, x1 - x0, y1 - y0, im.width]


with ThreadPoolExecutor(12) as pool:
    res = dict(r for r in pool.map(bbox, sorted(ids)) if r[1])

with open(out_path, "w", encoding="utf-8") as f:
    f.write("// Automatisch erzeugt von tools/build_sprite_boxes.py: sichtbarer Bereich je Sprite [x, y, Breite, Höhe, Bildgröße].\n")
    f.write("var SPRITE_BOXES = " + json.dumps(res, separators=(",", ":")) + ";\n")

print(len(res), "von", len(ids), "Sprites vermessen")

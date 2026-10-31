"""Erzeugt das App-Icon (icon.ico) und das Logo (img/logo.png) aus einem Showdown-Sprite.

Das Icon ist der Sprite auf dunklem, abgerundetem Hintergrund, das Logo nur der zugeschnittene,
pixelgenau vergrößerte Sprite mit transparentem Hintergrund.

Aufruf (im Projektordner): python tools/make_icon.py icon.ico img/logo.png [pokemon-id]
"""
import io
import sys
import urllib.request

from PIL import Image, ImageDraw

out_ico = sys.argv[1]
out_png = sys.argv[2]
mon = sys.argv[3] if len(sys.argv) > 3 else 'rattata'
url = 'https://play.pokemonshowdown.com/sprites/gen5/' + mon + '.png'
data = urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'champions-calc'}), timeout=30).read()
sprite = Image.open(io.BytesIO(data)).convert('RGBA')
sprite = sprite.crop(sprite.getchannel('A').point(lambda a: 255 if a > 8 else 0).getbbox())

# logo: whole-number upscale keeps the pixel look sharp
f = max(1, 192 // max(sprite.width, sprite.height))
sprite.resize((sprite.width * f, sprite.height * f), Image.NEAREST).save(out_png)

S = 256
icon = Image.new('RGBA', (S, S), (0, 0, 0, 0))
d = ImageDraw.Draw(icon)
d.rounded_rectangle((4, 4, S - 5, S - 5), radius=52, fill=(36, 39, 44, 255), outline=(58, 123, 213, 255), width=10)

box = S - 56
scale = min(box / sprite.width, box / sprite.height)
big = sprite.resize((max(1, int(sprite.width * scale)), max(1, int(sprite.height * scale))), Image.NEAREST)
icon.alpha_composite(big, ((S - big.width) // 2, (S - big.height) // 2 - 4))
icon.save(out_ico, sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
print('gespeichert:', out_ico, out_png, 'Sprite', sprite.size, 'Logo x' + str(f))

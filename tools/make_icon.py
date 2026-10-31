"""Erzeugt icon.ico (Desktop-Verknüpfung) aus einem Showdown-Sprite: zugeschnitten, auf dunklem runden Hintergrund.

Aufruf: python make_icon.py ../icon.ico [pokemon-id]
"""
import io
import sys
import urllib.request

from PIL import Image, ImageDraw

out = sys.argv[1]
mon = sys.argv[2] if len(sys.argv) > 2 else 'incineroar'
url = 'https://play.pokemonshowdown.com/sprites/gen5/' + mon + '.png'
data = urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'champions-calc'}), timeout=30).read()
sprite = Image.open(io.BytesIO(data)).convert('RGBA')
sprite = sprite.crop(sprite.getchannel('A').point(lambda a: 255 if a > 8 else 0).getbbox())

S = 256
icon = Image.new('RGBA', (S, S), (0, 0, 0, 0))
d = ImageDraw.Draw(icon)
d.rounded_rectangle((4, 4, S - 5, S - 5), radius=52, fill=(22, 30, 42, 255), outline=(59, 139, 234, 255), width=10)
d.rectangle((14, S // 2 + 46, S - 15, S // 2 + 54), fill=(224, 38, 63, 255))  # red accent line like the app header

box = S - 64
scale = min(box / sprite.width, box / sprite.height)
big = sprite.resize((max(1, int(sprite.width * scale)), max(1, int(sprite.height * scale))), Image.NEAREST)
icon.alpha_composite(big, ((S - big.width) // 2, (S - big.height) // 2))
icon.save(out, sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
print('gespeichert:', out)

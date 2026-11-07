# Erzeugt data/pk_blocks67.js (Block-Tabellen der Gen-6/7-Spielstände) aus PKHeX (kwsch/PKHeX, GPL-3.0).
# Aufruf: python tools/build_pkblocks67.py <PKHeX.Core/Saves/Access>
import re, sys, json, os
d = sys.argv[1]
out = {}
for key, f, var in [('xy', 'SaveBlockAccessor6XY.cs', 'BlocksXY'), ('ao', 'SaveBlockAccessor6AO.cs', 'BlocksAO'), ('sm', 'SaveBlockAccessor7SM.cs', 'BlockInfoSM'), ('usum', 'SaveBlockAccessor7USUM.cs', 'BlockInfoUU')]:
    s = open(os.path.join(d, f), encoding='utf-8').read()
    rows = re.findall(r'new\(bo\w+,\s*(\d+),\s*(0x[0-9A-Fa-f]+),\s*(0x[0-9A-Fa-f]+)\)', s)
    out[key] = [[int(a, 16), int(b, 16)] for _, a, b in rows]
    assert [int(r[0]) for r in rows] == list(range(len(rows))), key
open('data/pk_blocks67.js', 'w', encoding='utf-8').write('// Block-Tabellen der Gen-6/7-Spielstaende [Anfang, Laenge] (Quelle: PKHeX, GPL-3.0). Erzeugt von tools/build_pkblocks67.py\nwindow.PKBLOCKS67 = ' + json.dumps(out) + ';\n')
print({k: len(v) for k, v in out.items()})

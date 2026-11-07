# Erzeugt data/gb_roms.js (Offsets der Gen-1/2-ROMs) aus dem Universal Pokémon Randomizer ZX (gen1_offsets.ini, gen2_offsets.ini; GPL-3.0).
# Aufruf: python tools/build_gbroms.py <config-Ordner>
import re, sys, json, os
cfg = sys.argv[1]
KEYS = {
 1: ['Game','Version','NonJapanese','Type','CRCInHeader','InternalPokemonCount','PokedexOrder','PokemonStatsOffset','MewStatsOffset','WildPokemonTableOffset','OldRodOffset','GoodRodOffset','SuperRodTableOffset','MoveCount','MoveDataOffset','PokemonMovesetsTableOffset','StarterOffsets1','StarterOffsets2','StarterOffsets3','TrainerDataTableOffset','TrainerDataClassCounts','StarterTextOffsets'],
 2: ['Game','Version','NonJapanese','Type','CRCInHeader','PokemonStatsOffset','WildPokemonOffset','FishingWildsOffset','HeadbuttWildsOffset','HeadbuttTableSize','BCCWildsOffset','MoveDataOffset','PokemonMovesetsTableOffset','StarterOffsets1','StarterOffsets2','StarterOffsets3','TrainerClassAmount','TrainerDataTableOffset','TrainerDataClassCounts','StarterTextOffsets'],
}
def val(v):
    v = v.split('//')[0].strip()
    if v.startswith('['):
        return [int(x.strip(), 0) for x in v.strip('[]').split(',') if x.strip()]
    try: return int(v, 0)
    except ValueError: return v
out = {}
for gen, fn in [(1, 'gen1_offsets.ini'), (2, 'gen2_offsets.ini')]:
    secs, cur = {}, None
    for line in open(os.path.join(cfg, fn), encoding='utf-8'):
        line = line.rstrip('\n')
        m = re.match(r'^\[(.+)\]$', line)
        if m: cur = m.group(1); secs[cur] = {'__name': cur, '__copy': None}; continue
        if cur and '=' in line and not line.startswith('//') and not line.startswith('StaticPokemon') and not line.startswith('File<'):
            k, v = line.split('=', 1)
            if k == 'CopyFrom': secs[cur]['__copy'] = v.strip()
            elif k in KEYS[gen]: secs[cur][k] = val(v)
    def resolve(name, seen=()):
        s = secs[name]; base = resolve(s['__copy'], seen + (name,)) if s['__copy'] else {}
        r = dict(base); r.update({k: v for k, v in s.items() if not k.startswith('__')}); return r
    lst = []
    for name in secs:
        r = resolve(name); r['name'] = name; lst.append(r)
    out['g%d' % gen] = lst
open('data/gb_roms.js', 'w', encoding='utf-8').write('// Offsets der Gen-1/2-ROMs (Quelle: Universal Pokemon Randomizer ZX, GPL-3.0). Erzeugt von tools/build_gbroms.py\nwindow.GBROMS = ' + json.dumps(out, separators=(',', ':')) + ';\n')
print({k: len(v) for k, v in out.items()})

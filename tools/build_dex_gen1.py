# Baut data/dex_gen1.js (window.DEX_GEN1 / window.DEX_ALL) für den kompletten Pokédex
# über alle 9 Generationen (#0001 Bisasam bis #1025 Infamomo) inkl. aller Formen & Entwicklungsreihen.
import json
import re
import urllib.request

SHOWDOWN_DEX_URL = "https://play.pokemonshowdown.com/data/pokedex.json"
SHOWDOWN_ABIL_URL = "https://play.pokemonshowdown.com/data/abilities.json"

def fetch_json(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode("utf-8"))

def load_natdex_names():
    with open("data/natdex.js", "r", encoding="utf-8") as f:
        txt = f.read()
    arr = json.loads(txt.split("window.NATDEX = ", 1)[1].rstrip(";\n "))
    de_by_num = {}
    for i in range(1, len(arr)):
        if arr[i]:
            de_by_num[i] = arr[i][2]
    return de_by_num

def gen_of_num(num):
    if num <= 151: return 1
    if num <= 251: return 2
    if num <= 386: return 3
    if num <= 493: return 4
    if num <= 649: return 5
    if num <= 721: return 6
    if num <= 809: return 7
    if num <= 905: return 8
    return 9

ITEM_DE = {
    "Fire Stone": "Feuerstein",
    "Water Stone": "Wasserstein",
    "Thunder Stone": "Donnerstein",
    "Leaf Stone": "Blattstein",
    "Moon Stone": "Mondstein",
    "Sun Stone": "Sonnenstein",
    "Shiny Stone": "Leuchtstein",
    "Dusk Stone": "Finsterstein",
    "Dawn Stone": "Funkelstein",
    "Ice Stone": "Eisstein",
    "Oval Stone": "Ovaler Stein",
    "King's Rock": "King-Stein",
    "Metal Coat": "Metallmantel",
    "Dragon Scale": "Drachenhaut",
    "Up-Grade": "Up-Grade",
    "Dubious Disc": "Dubiosdisc",
    "Electirizer": "Stromisierer",
    "Magmarizer": "Magmaisierer",
    "Protector": "Schützer",
    "Reaper Cloth": "Düsterumhang",
    "Razor Claw": "Scharfklaue",
    "Razor Fang": "Scharfzahn",
    "Prism Scale": "Schönschuppe",
    "Deep Sea Tooth": "Abysszahn",
    "Deep Sea Scale": "Abyssplatte",
    "Sachet": "Duftbeutel",
    "Whipped Dream": "Sahnehäubchen",
    "Tart Apple": "Saurer Apfel",
    "Sweet Apple": "Süßer Apfel",
    "Syrupy Apple": "Sirup-Apfel",
    "Cracked Pot": "Rissige Kanne",
    "Chipped Pot": "Löchrige Kanne",
    "Unremarkable Teacup": "Unechte Teetasse",
    "Masterpiece Teacup": "Meisterwerk-Teetasse",
    "Galarica Cuff": "Galarnuss-Reif",
    "Galarica Wreath": "Galarnuss-Kranz",
    "Black Augurite": "Schwarzes Augurit",
    "Peat Block": "Torfblock",
    "Auspicious Armor": "Glorienrüstung",
    "Malicious Armor": "Fluchrüstung",
    "Metal Alloy": "Metalllegierung",
}

MOVE_DE = {
    "Ancient Power": "Antik-Kraft",
    "Rollout": "Walzer",
    "Mimic": "Mimikry",
    "Double Hit": "Doppelschlag",
    "Stomp": "Stampfer",
    "Dragon Pulse": "Drachenpuls",
    "Taunt": "Verhöhner",
    "Twin Beam": "Zwillingsstrahl",
    "Hyper Drill": "Hyperbohrer",
    "Dragon Cheer": "Drachenruf",
}

COND_DE = {
    "at night": "(nachts)",
    "during the day": "(tagsüber)",
    "during rain": "(bei Regen auf der Oberwelt)",
    "near a special magnetic field": "(Magnetfeld / Donnerstein)",
    "with a Remoraid in party": "(mit Remoraid im Team)",
    "with a Dark-type in the party": "(mit Unlicht-Pokémon im Team)",
    "with a Karrablast": "(gegen Laukaps)",
    "with a Shelmet": "(gegen Schnuthelm)",
    "with the console turned upside-down": "(Konsole kopfüber halten)",
    "with a Fairy-type move and two levels of Affection": "Feen-Attacke + hohe Zuneigung",
    "with an Atk stat > its Def stat": "(Angr > Vert)",
    "with an Atk stat < its Def stat": "(Angr < Vert)",
    "with an Atk stat equal to its Def stat": "(Angr = Vert)",
    "from a special Rockruff during the evening": "Spezial-Wuffels (Tempomacher) in der Abenddämmerung",
    "Land 3 critical hits in 1 battle": "3 Volltreffer in einem Kampf",
    "Have 49+ HP lost and walk under stone sculpture in Dusty Bowl": "49+ KP Schaden + Felsbogen im Sandkuhlen-Kessel",
    "spin while holding a Sweet": "Zucker-Item tragen + im Kreis drehen",
    "Use a Scroll of Darkness": "Rolle des Unlichts",
    "Use a Scroll of Waters": "Rolle des Wassers",
    "Use Agile style Psyshield Bash 20 times": "20× Barrikadenstoß (Tempostil) + Level-Up",
    "Use Strong style Barb Barrage 20 times": "20× Giftstachelregen (Kraftstil) + Level-Up",
    "Receive 294+ recoil without fainting": "294+ Rückstoßschaden ohne K.O. + Level-Up",
    "in Legends: Arceus when there's a full moon": "bei Vollmond",
    "in Legends: Arceus or Legends: Z-A": "(in Legenden)",
    "Walk 1000 steps in Let's Go": "1.000 Schritte im Let's-Go-Modus + Level-Up",
    "walk 1000 steps in Let's Go": "1.000 Schritte im Let's-Go-Modus + Level-Up",
    "Use Rage Fist 20 times and level-up": "20× Zornesfaust einsetzen + Level-Up",
    "Defeat 3 Bisharp leading Pawniard and level-up": "3 Caesurio mit Anführer-Wappe besiegen + Level-Up",
    "Level up with 999 Coins in the bag": "Level-Up mit 999 Gierspenst-Münzen",
}

FORME_LABELS = {
    "": ("Normal", "Normal"),
    "Mega": ("Mega", "Mega"),
    "Mega-X": ("Mega X", "Mega X"),
    "Mega-Y": ("Mega Y", "Mega Y"),
    "Mega-Z": ("Mega Z", "Mega Z"),
    "Primal": ("Protomorphose", "Primal"),
    "Ultra": ("Ultra-Form", "Ultra"),
    "Alola": ("Alola-Form", "Alola Form"),
    "Galar": ("Galar-Form", "Galar Form"),
    "Galar-Zen": ("Galar (Trance)", "Galar (Zen)"),
    "Hisui": ("Hisui-Form", "Hisui Form"),
    "Paldea": ("Paldea-Form", "Paldea Form"),
    "Paldea-Combat": ("Paldea (Gefecht)", "Paldea (Combat)"),
    "Paldea-Blaze": ("Paldea (Flammen)", "Paldea (Blaze)"),
    "Paldea-Aqua": ("Paldea (Fluten)", "Paldea (Aqua)"),
    "Gmax": ("Gigadynamax", "Gigantamax"),
    "Attack": ("Angriffsform", "Attack Forme"),
    "Defense": ("Verteidigungsform", "Defense Forme"),
    "Speed": ("Initiativeform", "Speed Forme"),
    "Sunny": ("Sonnenform", "Sunny Form"),
    "Rainy": ("Regenform", "Rainy Form"),
    "Snowy": ("Schneeform", "Snowy Form"),
    "Sandy": ("Sandummantelung", "Sandy Cloak"),
    "Trash": ("Lumpenummantelung", "Trash Cloak"),
    "Sunshine": ("Sonnenform", "Sunshine Form"),
    "Heat": ("Hitze-Rotom", "Rotom-Heat"),
    "Wash": ("Wasch-Rotom", "Rotom-Wash"),
    "Frost": ("Frost-Rotom", "Rotom-Frost"),
    "Fan": ("Wirbel-Rotom", "Rotom-Fan"),
    "Mow": ("Schneid-Rotom", "Rotom-Mow"),
    "Origin": ("Urform", "Origin Forme"),
    "Sky": ("Zenitform", "Sky Forme"),
    "Blue-Striped": ("Blaulinig", "Blue-Striped"),
    "White-Striped": ("Weißlinig", "White-Striped"),
    "Zen": ("Trance-Modus", "Zen Mode"),
    "Therian": ("Tiergeistform", "Therian Forme"),
    "White": ("Weißes Kyurem", "White Kyurem"),
    "Black": ("Schwarzes Kyurem", "Black Kyurem"),
    "Resolute": ("Resolutform", "Resolute Form"),
    "Pirouette": ("Tanzform", "Pirouette Forme"),
    "Burn": ("Brandmodul", "Burn Drive"),
    "Chill": ("Gefriermodul", "Chill Drive"),
    "Douse": ("Aquamodul", "Douse Drive"),
    "Shock": ("Blitzmodul", "Shock Drive"),
    "Ash": ("Ash-Quajutsu", "Ash-Greninja"),
    "Blade": ("Klingenform", "Blade Forme"),
    "Small": ("Größe S", "Small Size"),
    "Large": ("Größe L", "Large Size"),
    "Super": ("Größe XL", "Super Size"),
    "10%": ("10%-Form", "10% Forme"),
    "Complete": ("Optimumform", "Complete Forme"),
    "Unbound": ("Entfesselt", "Unbound"),
    "Pom-Pom": ("Cheerleader-Stil", "Pom-Pom Style"),
    "Pa'u": ("Hula-Stil", "Pa'u Style"),
    "Sensu": ("Buyo-Stil", "Sensu Style"),
    "Midnight": ("Nachtform", "Midnight Form"),
    "Dusk": ("Zwielichtform", "Dusk Form"),
    "School": ("Schwarmform", "School Form"),
    "Meteor": ("Meteoritform", "Meteor Form"),
    "Dusk-Mane": ("Abendmähne", "Dusk Mane"),
    "Dawn-Wings": ("Morgenschwingen", "Dawn Wings"),
    "Busted": ("Entlarvt", "Busted Form"),
    "Low-Key": ("Tief-Form", "Low Key Form"),
    "Noice": ("Schmelzgesicht", "Noice Face"),
    "F": ("Weiblich ♀", "Female ♀"),
    "Hangry": ("Kohldampf", "Hangry Mode"),
    "Crowned": ("König des Schwertes/Schildes", "Crowned"),
    "Eternamax": ("Unendynalos", "Eternamax"),
    "Rapid-Strike": ("Fließender Stil", "Rapid Strike"),
    "Ice": ("Schimmelreiter", "Ice Rider"),
    "Shadow": ("Rappenreiter", "Shadow Rider"),
    "Bloodmoon": ("Blutmond-Form", "Bloodmoon"),
    "Four": ("4er-Familie", "Family of Four"),
    "Blue": ("Blaugefieder", "Blue Plumage"),
    "Yellow": ("Gelbgefieder", "Yellow Plumage"),
    "White": ("Weißgefieder", "White Plumage"),
    "Hero": ("Heldenform", "Hero Form"),
    "Droopy": ("Hängeform", "Droopy Form"),
    "Stretchy": ("gestreckte Form", "Stretchy Form"),
    "Three-Segment": ("Dreisegmentform", "Three-Segment"),
    "Roaming": ("Wanderform", "Roaming Form"),
    "Wellspring": ("Brunnenmaske", "Wellspring Mask"),
    "Hearthflame": ("Ofenmaske", "Hearthflame Mask"),
    "Cornerstone": ("Fundamentmaske", "Cornerstone Mask"),
    "Terastal": ("Terakristall-Form", "Terastal Form"),
    "Stellar": ("Stellar-Form", "Stellar Form"),
}

# Formen, die im Pokédex ignoriert werden (reine Totem-Klone, Pikachu-Kappen, Silvally/Arceus 17 Typ-Platten, etc.)
EXCLUDED_FORMES = {
    "Totem", "Alola-Totem", "Busted-Totem",
    "Starter", "Cosplay", "Rock-Star", "Belle", "Pop-Star", "PhD", "Libre",
    "Original", "Hoenn", "Sinnoh", "Unova", "Kalos", "Partner", "World", "Spiky-eared",
    "Pokeball", "Fancy", "Eternal", "Bond", "Neutral", "Dada",
    "Antique", "Artisan", "Masterpiece",
    "Gulping", "Gorging",
    "Low-Key-Gmax", "Rapid-Strike-Gmax",
    "Teal-Tera", "Wellspring-Tera", "Hearthflame-Tera", "Cornerstone-Tera",
    "Curly-Mega", "Droopy-Mega", "Stretchy-Mega", "F-Mega", "M-Mega", "Original-Mega",
    "Bug", "Dark", "Dragon", "Electric", "Fairy", "Fighting", "Fire", "Flying",
    "Ghost", "Grass", "Ground", "Poison", "Psychic", "Rock", "Steel", "Water",
}

def sprite_slug_of(sd_key, entry):
    name = entry.get("name", "")
    if "-" not in name:
        return sd_key
    base, rest = name.split("-", 1)
    base_id = re.sub(r"[^a-z0-9]", "", base.lower())
    rest_id = re.sub(r"[^a-z0-9]", "", rest.lower())
    return f"{base_id}-{rest_id}"

def evo_method_text(entry, target_name=""):
    etype = entry.get("evoType", "")
    lvl = entry.get("evoLevel")
    item = entry.get("evoItem", "")
    move = entry.get("evoMove", "")
    cond = entry.get("evoCondition", "")

    de_parts = []
    en_parts = []

    if etype == "trade":
        if item:
            item_de = ITEM_DE.get(item, item)
            de_parts.append(f"Tausch mit {item_de}")
            en_parts.append(f"Trade holding {item}")
        elif cond in COND_DE:
            de_parts.append(f"Tausch {COND_DE[cond]}")
            en_parts.append(f"Trade {cond}")
        else:
            de_parts.append("Tausch")
            en_parts.append("Trade")
    elif etype == "useItem":
        item_de = ITEM_DE.get(item, item)
        de_parts.append(item_de)
        en_parts.append(item)
    elif etype == "levelFriendship":
        de_parts.append("Hohe Freundschaft")
        en_parts.append("High Friendship")
    elif etype == "levelMove":
        mv_de = MOVE_DE.get(move, move)
        de_parts.append(f"Level-Up mit {mv_de}")
        en_parts.append(f"Level up knowing {move}")
    elif etype == "levelHold":
        item_de = ITEM_DE.get(item, item)
        de_parts.append(f"Level-Up mit {item_de}")
        en_parts.append(f"Level up holding {item}")
    elif etype in ("levelExtra", "other"):
        if lvl:
            de_parts.append(f"Level {lvl}")
            en_parts.append(f"Level {lvl}")
        if cond:
            c_de = COND_DE.get(cond, cond)
            de_parts.append(c_de)
            en_parts.append(cond)
        elif not lvl:
            if entry.get("name") == "Shedinja":
                de_parts.append("Level 20 (freier Teamplatz + Pokéball)")
                en_parts.append("Level 20 (empty party slot + Poké Ball)")
            else:
                de_parts.append("Spezialentwicklung")
                en_parts.append("Special evolution")
    elif lvl:
        de_parts.append(f"Level {lvl}")
        en_parts.append(f"Level {lvl}")

    if cond and etype not in ("levelExtra", "other", "trade"):
        c_de = COND_DE.get(cond, f"({cond})")
        de_parts.append(c_de)
        en_parts.append(f"({cond})")

    if target_name in ("Exeggutor-Alola", "Raichu-Alola", "Marowak-Alola"):
        de_parts.append("(in Alola)")
        en_parts.append("(in Alola)")
    elif target_name in ("Weezing-Galar", "Mr. Mime-Galar"):
        de_parts.append("(in Galar)")
        en_parts.append("(in Galar)")

    return " ".join(de_parts) or "Level-Up", " ".join(en_parts) or "Level up"

def main():
    print("Lade Showdown pokedex.json ...")
    sd = fetch_json(SHOWDOWN_DEX_URL)
    de_by_num = load_natdex_names()

    by_name = {}
    base_by_num = {}
    for k, v in sd.items():
        if "name" in v:
            by_name[v["name"]] = (k, v)
        num = v.get("num", 0)
        if 1 <= num <= 1025 and not v.get("forme") and num not in base_by_num:
            base_by_num[num] = (k, v)

    def localized_name(entry):
        num = entry.get("num", 0)
        base_de = de_by_num.get(num, entry.get("baseSpecies") or entry.get("name"))
        base_en = entry.get("baseSpecies") or entry.get("name")
        forme = entry.get("forme", "")
        if not forme:
            return base_de, entry.get("name")
        if forme == "Alola":
            return f"Alola-{base_de}", f"Alolan {base_en}"
        if forme == "Galar":
            return f"Galar-{base_de}", f"Galarian {base_en}"
        if forme == "Galar-Zen":
            return f"Galar-{base_de} (Trance)", f"Galarian {base_en} (Zen)"
        if forme == "Hisui":
            return f"Hisui-{base_de}", f"Hisuian {base_en}"
        if forme == "Paldea":
            return f"Paldea-{base_de}", f"Paldean {base_en}"
        if forme == "Paldea-Combat":
            return f"Paldea-{base_de} (Gefecht)", f"Paldean {base_en} (Combat)"
        if forme == "Paldea-Blaze":
            return f"Paldea-{base_de} (Flammen)", f"Paldean {base_en} (Blaze)"
        if forme == "Paldea-Aqua":
            return f"Paldea-{base_de} (Fluten)", f"Paldean {base_en} (Aqua)"
        if forme == "Mega":
            return f"Mega-{base_de}", f"Mega {base_en}"
        if forme == "Mega-X":
            return f"Mega-{base_de} X", f"Mega {base_en} X"
        if forme == "Mega-Y":
            return f"Mega-{base_de} Y", f"Mega {base_en} Y"
        if forme == "Mega-Z":
            return f"Mega-{base_de} Z", f"Mega {base_en} Z"
        if forme == "Primal":
            return f"Proto-{base_de}", f"Primal {base_en}"
        if forme == "Gmax":
            return f"Gigadynamax-{base_de}", f"Gigantamax {base_en}"
        lbl_de, lbl_en = FORME_LABELS.get(forme, (forme, forme))
        return f"{base_de} ({lbl_de})", f"{base_en} ({lbl_en})"

    def build_evo_tree(start_entry):
        cur = start_entry
        visited = set()
        while cur.get("prevo") and cur["prevo"] in by_name and cur["prevo"] not in visited:
            visited.add(cur["name"])
            cur = by_name[cur["prevo"]][1]

        def make_node(e):
            k = by_name[e["name"]][0]
            n_de, n_en = localized_name(e)
            m_de, m_en = evo_method_text(e, e["name"]) if e.get("prevo") else ("Basis", "Base")
            children = []
            for evo_name in e.get("evos", []):
                if evo_name in by_name:
                    children.append(make_node(by_name[evo_name][1]))
            return {
                "num": e.get("num", 0),
                "id": k,
                "spriteId": sprite_slug_of(k, e),
                "forme": e.get("forme", ""),
                "nameDe": n_de,
                "nameEn": n_en,
                "types": e.get("types", ["Normal"]),
                "methodDe": m_de,
                "methodEn": m_en,
                "children": children,
            }

        return make_node(cur)

    def should_include_forme(base_name, f_entry):
        forme = f_entry.get("forme", "")
        if not forme:
            return False
        if base_name == "Pikachu" and forme not in ("Gmax",):
            return False
        if base_name in ("Arceus", "Silvally"):
            return False
        if base_name == "Alcremie" and forme != "Gmax":
            return False
        if forme in EXCLUDED_FORMES:
            return False
        # Ice-Typ von Arceus/Silvally ausgeschlossen, aber Calyrex-Ice ("Ice") behalten:
        if forme == "Ice" and base_name != "Calyrex":
            return False
        if forme == "White" and base_name not in ("Kyurem", "Squawkabilly"):
            return False
        return True

    dex_all = [None]
    total_forms = 0
    for num in range(1, 1026):
        base_key, base_entry = base_by_num[num]
        base_name = base_entry["name"]
        form_names = [base_name]
        for fn in base_entry.get("otherFormes", []):
            if fn in by_name:
                f_entry = by_name[fn][1]
                if should_include_forme(base_name, f_entry):
                    form_names.append(fn)

        base_evo_tree = build_evo_tree(base_entry)
        base_evo_json = json.dumps(base_evo_tree, sort_keys=True)

        forms_data = []
        for fn in form_names:
            fk, fe = by_name[fn]
            forme = fe.get("forme", "")
            if base_name == "Squawkabilly" and forme == "White":
                lbl_de, lbl_en = ("Weißgefieder", "White Plumage")
            elif base_name == "Kyurem" and forme == "White":
                lbl_de, lbl_en = ("Weißes Kyurem", "White Kyurem")
            else:
                lbl_de, lbl_en = FORME_LABELS.get(forme, (forme or "Normal", forme or "Normal"))
            n_de, n_en = localized_name(fe)
            bs = fe.get("baseStats", {})
            # Nur Regionalformen mit eigener Evolutionskette bekommen ein eigenes form.evoTree
            has_own_evo = forme in ("Alola", "Galar", "Hisui", "Paldea", "Paldea-Combat", "Paldea-Blaze", "Paldea-Aqua", "White-Striped")
            f_obj = {
                "id": fk,
                "spriteId": sprite_slug_of(fk, fe),
                "forme": forme,
                "labelDe": lbl_de,
                "labelEn": lbl_en,
                "nameDe": n_de,
                "nameEn": n_en,
                "types": fe.get("types", ["Normal"]),
                "bs": [bs.get("hp", 50), bs.get("atk", 50), bs.get("def", 50), bs.get("spa", 50), bs.get("spd", 50), bs.get("spe", 50)],
                "abilities": fe.get("abilities", {"0": "None"}),
                "heightm": fe.get("heightm", 1.0),
                "weightkg": fe.get("weightkg", 10.0),
            }
            if fe.get("requiredItem"):
                f_obj["requiredItem"] = fe["requiredItem"]
            if has_own_evo:
                fe_tree = build_evo_tree(fe)
                if json.dumps(fe_tree, sort_keys=True) != base_evo_json:
                    f_obj["evoTree"] = fe_tree
            forms_data.append(f_obj)
            total_forms += 1

        dex_all.append({
            "num": num,
            "gen": gen_of_num(num),
            "id": base_key,
            "nameDe": de_by_num.get(num, base_name),
            "nameEn": base_name,
            "types": base_entry.get("types", ["Normal"]),
            "evoTree": base_evo_tree,
            "forms": forms_data,
        })

    out_js = "// Komplette Pokédex-Daten für Generation 1–9 (#0001 Bisasam bis #1025 Infamomo) inkl. aller Formen & Entwicklungsreihen.\n"
    out_js += "window.DEX_GEN1 = window.DEX_ALL = " + json.dumps(dex_all, ensure_ascii=False, separators=(",", ":")) + ";\n"
    with open("data/dex_gen1.js", "w", encoding="utf-8") as f:
        f.write(out_js)
    print(f"Wrote data/dex_gen1.js with {len(dex_all)-1} Pokémon and {total_forms} total forms ({len(out_js)//1024} KB).")

if __name__ == "__main__":
    main()

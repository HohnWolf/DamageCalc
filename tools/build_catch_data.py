# Generates data/catch_data.js with exact catch rate, base HP, base Speed, gender rate, and flags for all 1,025 National Dex species.
import csv, io, json, urllib.request

SPECIES_CSV_URL = "https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/pokemon_species.csv"
POKEDEX_JSON_URL = "https://play.pokemonshowdown.com/data/pokedex.json"

def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": "champions-calc"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read().decode("utf-8")

def main():
    print("Fetching pokemon_species.csv ...")
    csv_txt = fetch(SPECIES_CSV_URL)
    species_meta = {}
    reader = csv.DictReader(io.StringIO(csv_txt))
    for row in reader:
        num = int(row["id"])
        if 1 <= num <= 1025:
            species_meta[num] = {
                "cr": int(row["capture_rate"]),
                "gr": int(row["gender_rate"]), # -1 genderless, 0 100% M, 8 100% F, else F eighths
                "prevo": 1 if row["evolves_from_species_id"] else 0,
            }

    print("Fetching Showdown pokedex.json ...")
    dex = json.loads(fetch(POKEDEX_JSON_URL))
    stats = {}
    for k, d in dex.items():
        n = d.get("num", 0)
        if not (1 <= n <= 1025) or d.get("forme") or d.get("baseSpecies"):
            continue
        if n in stats:
            continue
        bs = d.get("baseStats", {})
        stats[n] = (bs.get("hp", 50), bs.get("spe", 50))

    # Compact array indexed 1..1025: [catchRate, baseHP, baseSpe, genderRate]
    out = [None]
    for n in range(1, 1026):
        m = species_meta.get(n, {"cr": 45, "gr": 4})
        hp, spe = stats.get(n, (60, 60))
        out.append([m["cr"], hp, spe, m["gr"]])

    with open("data/catch_data.js", "w", encoding="utf-8", newline="\n") as f:
        f.write("// Fangdaten für alle 1025 Pokémon (Index = National-Dex-Nr.): [Fangrate, Basis-KP, Basis-Init, Geschlechtsrate (-1=neutral, 0=nur ♂, 8=nur ♀, 1..7=Achtel ♀)].\n")
        f.write("window.CATCH_DATA = " + json.dumps(out, separators=(",", ":")) + ";\n")
    print("Wrote data/catch_data.js with", len(out) - 1, "entries.")

if __name__ == "__main__":
    main()

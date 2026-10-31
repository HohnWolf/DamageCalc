# Rattata Lab

Damage Calculator und Teambuilder für **Pokémon Champions** (VGC, Level 50, Stat Points). Früher „Champions Damage Calc“.

Eigener VGC-Schadensrechner für **Pokémon Champions** (Level 50, Stat Points), nach Vorbild des
[NCP VGC Damage Calculator](https://nerd-of-now.github.io/NCP-VGC-Damage-Calculator/).

## Starten
- **Als Windows-App:** `RattataLab-Setup-x.y.z.exe` aus den [Releases](../../releases) installieren. Das legt eine Desktop- und Startmenü-Verknüpfung an. Ohne Installation geht es mit `RattataLab-x.y.z-portable.exe`.
- **Im Browser:** `index.html` per Doppelklick öffnen. Es braucht keinen Server und keine Installation.

Nur die Sprites (und die Knöpfe „Sets laden“ / „Regulation laden“) brauchen Internet.

## Entwicklung
Voraussetzung: [Node.js](https://nodejs.org) (LTS).

```powershell
npm install          # Electron + electron-builder
npm start            # App im Entwicklungsmodus starten
npm run dist         # Installer + portable .exe nach dist/ bauen
```

- Die App ist eine reine Web-App (`index.html`, `css/`, `js/`, `data/`). `electron/main.js` öffnet sie nur in einem eigenen Fenster: Fenstergröße wird gemerkt, Links öffnen im Browser, `F5` lädt neu, `F12` öffnet die Entwicklertools.
- Gespeicherte Teams und Sets liegen in der App unter `%APPDATA%\Rattata Lab` (nicht im Browser). Daten der alten Version (`%APPDATA%\Champions Damage Calc`) werden beim ersten Start übernommen. Teams aus der Browser-Version per Export/Import übernehmen.
- Neue Version: `version` in `package.json` erhöhen, `npm run dist`, dann z. B. `gh release create v1.1.0 dist/*.exe`.
- Hinweis: Electron lädt sein Programm beim `npm install` per Install-Skript nach. Falls `node_modules/electron/dist/electron.exe` fehlt: `node node_modules/electron/install.js` ausführen.

## Startbildschirm und Teambuilder
- Beim Start erscheint die Auswahl zwischen **Damage Calculator** und **Teambuilder** (Tasten `1` / `2`). Das Logo oben links führt zurück zum Start, die Reiter daneben wechseln direkt.
- **Teambuilder** (`js/builder.js`):
  - Links die Liste aller Teams (neu, kopieren, löschen), Import aus Showdown-Text als neues Team oder in das aktuelle.
  - Oben sechs Plätze mit Sprite, Item, Typen und Attacken; ◀ ▶ verschieben, ✕ entfernt.
  - Darunter der Editor: Pokémon-Suche (deutsch/englisch), „Set übernehmen …“ (beliebte, eigene und Online-Sets), Form, Item, Fähigkeit, Wesen, vier Attacken (nur legale, mit Typ, Kategorie, Stärke und Genauigkeit), Wesen und Stat Points als Balken; bei Mega-Steinen stehen die Mega-Werte daneben.
  - **Formwechsel** über dem großen Sprite: Normal / Mega (X, Y, Z) / Kampfformen wie Klingenform, Heldenform oder Kohldampf. Werte, Typen und Fähigkeit zeigen die gewählte Form; Mega setzt automatisch den passenden Mega-Stein.
  - **Aussehen & Form**: Form mit eigenen Werten (Regionalformen, Rotom-Formen, Wolwerock, Psiaugon-F …), kosmetische Variante (alle Vivillon-Muster, Florges-Farben, Alcremie, Coiffwaff …), Geschlecht (feste Geschlechter und geschlechtslose Pokémon werden beachtet) und Shiny. Wird im Showdown-Export mitgeschrieben (`(M)`/`(F)`, `Shiny: Yes`, Variantenname).
  - Rechts die Typ-Abdeckung: wie stark jeder Angriffstyp jedes Teammitglied trifft, inklusive Fähigkeiten wie Schwebe, Absorber oder Speckschicht.
  - „Ins Damage Calc: Du / Gegner“ legt das Team in die Team-Leiste der Seite; die ersten beiden werden Slot A und B.
  - Gespeichert in `localStorage` unter `cc_builder`. Beim ersten Öffnen wird das eigene Team aus dem Rechner übernommen.
- In der Desktop-App hat das Fenster keinen Windows-Rahmen: Die Kopfzeile ist die Titelleiste (ziehen, Doppelklick maximiert), rechts sitzen eigene Knöpfe für Minimieren, Maximieren und Schließen (`electron/preload.js`). `F11` schaltet Vollbild.
- Logo und Icon: Rattfratz (`img/logo.png`, `icon.ico`, erzeugt mit `python tools/make_icon.py icon.ico img/logo.png rattata`).

## Bedienung auf einen Blick
- Alles passt ohne Scrollen auf den Bildschirm, ab etwa 1050 × 650 Pixeln. Bei kleineren Fenstern scrollt die Seite.
- Die Oberfläche passt sich der Fenstergröße an (Basis 1180 × 800, Faktor 0,8 bis 1,9), damit kein Platz frei bleibt. Vorschau verschiedener Größen: `tools/preview.html?w=1920&h=1080` (braucht den lokalen Server).
- Attacken- und Fähigkeitslisten zeigen nur, was das Pokémon in Champions wirklich lernen bzw. haben kann. Mega-Formen bekommen ihre Mega-Fähigkeit. Importierte Werte außerhalb des Lernsets bleiben erhalten und sind mit ⚠ markiert.
- Der Schaden steht direkt neben jeder Attacke. Ein Klick darauf zeigt oben die komplette Rechnung.
- Neben der Set-Suche: „Speichern“ (eigenes Set), „Export“ (Showdown-Format), „Zum Team“.
- Oben rechts: „Team importieren“ öffnet den Import-Dialog.
- „Zurücksetzen“ im Feld-Kopf: leert die Gegnerseite (beide Slots) und schaltet alle Feldeffekte aus (Wetter, Terrain, Auren, Ruin, Trick Room, Gravity, Screens, Hazards usw.). Einzel/Doppel, deine Seite und das Gegner-Team in der Team-Leiste bleiben. Danach den nächsten Gegner über die Suche oder die Team-Leiste wählen.

## Sprache (Deutsch / English)
- Button **EN / DE** oben rechts. Die Seite lädt neu; Slots, Teams und Feld bleiben erhalten.
- Alternativ über die Adresse: `index.html?lang=en` oder `index.html?lang=de`.
- Auf Deutsch werden Pokémon, Attacken, Items, Fähigkeiten, Typen und Wesen übersetzt (`data/names_de.js`, Quelle PokeAPI). Die Suche findet deutsche und englische Namen.
- Showdown-Import und -Export bleiben immer englisch.

## Online aktualisieren („Sets laden“ / „Regulation laden“)
Beide Knöpfe oben rechts laden Daten direkt im Browser (Internet nötig, kein Server). Danach erscheint ein Bericht. Beim Schließen lädt die Seite neu, Slots und Teams bleiben erhalten.
- **Sets laden** holt aktuell beliebte Sets aus drei Quellen:
  - NCP-Setdex (`setdex_ncp-g10.js` vom NCP-Calc): ersetzt die mitgelieferte Version
  - Usage-Statistik von data.pkmn.cc (Smogon/Showdown-Ladder, neueste `gen9championsvgcXXXX`): pro Pokémon das meistgespielte Set (häufigste Wesen/SP-Verteilung, Fähigkeit, Item, Top-4-Attacken), in der Suche markiert mit **Usage** und dem Nutzungsanteil
  - Smogon-Sets von data.pkmn.cc (`championsvgcXXXX`), markiert mit **Smogon**
- **Regulation laden** liest bei Pokémon Showdown die aktuelle Champions-VGC-Regulation aus (`config/formats.ts`), dazu die dort legalen Pokémon (`formats-data.ts`), Items (`items.ts` der Regulation + `items.js`), Lernsets, Pokédex und Attacken. Fehlende Pokémon, Formen, Megas, Items, Attacken und Fähigkeiten werden ergänzt, die Lernsets ersetzt. Der Name der Regulation erscheint in der Kopfzeile.
- Gespeichert wird im Browser (`localStorage`: `cc_online`, `cc_reg`). „Online-Daten zurücksetzen“ im Import-Dialog stellt den Auslieferungszustand wieder her.
- Die NCP-Datei und `items.js` werden nur als Daten gelesen, es wird kein fremder Code ausgeführt.
- Neue Items sind sofort auswählbar. In die Rechnung fließen sie ein, soweit die Schadensformel sie kennt (z. B. Typ-Verstärker, Beeren, Choice-Items); ein völlig neuer Item-Effekt bräuchte eine Anpassung in `js/calc.js`.
- Test ohne Klicken: `index.html#runreg` bzw. `#runsets` startet die Aktualisierung sofort; `tools/regtest.html` führt den Regulation-Abgleich aus und zeigt das Ergebnis, ohne etwas zu speichern.

## Doppelkampf
- Jede Seite hat zwei aktive Pokémon: Tabs **A** und **B** im Panel-Kopf. Ein Klick auf einen Tab bearbeitet dieses Pokémon, gerechnet werden immer alle.
- Jede Attacke zeigt den Schaden gegen **beide Gegner** (Spalten „vs …“ mit Sprite). Beim Gegner stehen die Spalten links, damit alle Zahlen in der Mitte liegen.
- Spread-Attacken (Earthquake, Rock Slide …) bekommen ×0,75 nur, wenn noch beide Gegner auf dem Feld sind. Mit ✕ am Tab B nimmst du den Partner raus.
- Partner-Fähigkeiten wirken automatisch: Friend Guard, Battery, Power Spot, Steely Spirit, Flower Gift. Dazu kommen Ruin, Wetter und Terrain von allen vier Pokémon.
- **Zugreihenfolge** aller vier Pokémon oben rechts, mit **Trick Room**-Schalter im Feld.
- Der Team-Import setzt automatisch Pokémon 1 als A und Pokémon 2 als B.
- Bei **Singles** kämpft nur der aktive Tab, der andere dient als schnelle Einwechsel-Option.
- Selbsttest: `index.html#selftest` öffnen. Er prüft Tab-Wechsel, Spread, Friend Guard und das Entfernen von B.

## Funktionen
- **Pokémon 1 / Pokémon 2** mit Typen, Form, Basiswerten, SP (0–32, max. 66), Statuswert-Stufen, Wesen, Fähigkeit, Item, Status, aktuellen KP und 4 Attacken (BP, Typ, Kategorie, Krit, Trefferzahl)
- **Beliebte Sets**: Suchfeld oben im Panel (z. B. „incin“), Sets stammen aus der NCP-Champions-Setdex (Reg M-C)
- **Team-Import** für beide Seiten: Showdown-/PokéPaste-Text einfügen, dann „In linkes/rechtes Team importieren“
  - `EVs:` werden in SP umgerechnet (1 SP = 8 EVs, 4 EVs = 1 SP), `SPs:` werden direkt übernommen
  - Ein Klick auf das Team-Icon lädt das Pokémon, ◀/▶ lädt es auf die andere Seite
- **Eigene Sets** speichern und exportieren (im Browser-`localStorage`)
- **Feld**: Singles/Doubles, Wetter, Terrain, Ruin-Fähigkeiten, Auren, Gravity, pro Seite Helping Hand, Screens, Aurora Veil, Tailwind, Friend Guard, Battery, Power Spot, Steely Spirit, Flower Gift, Stealth Rock, Spikes, Leech Seed, Salt Cure
- **KO-Chancen** mit Hazards, Leftovers, Sitrus Berry, Gift/Verbrennung, Sandsturm, Focus Sash/Sturdy
- **Attacken mit situativer Stärke**: Unter der Attacke erscheint automatisch ein passendes Feld
  - Last Respects: „Eigene Pokémon K.O.“ (0–5) direkt unter der Attacke; bei Supreme Overlord erscheint dieselbe Auswahl beim Pokémon (beide synchron)
  - Rage Fist: wie oft getroffen (0–6), Spit Up: Stockpile (0–3)
  - Payback, Avalanche, Assurance, Stomping Tantrum, Temper Flare, Round, Lash Out, Fickle Beam: Haken für ×2
  - Counter, Mirror Coat, Metal Burst, Comeuppance: erlittenen Schaden eintragen
  - Triple Axel, Beat Up und Mehrfachtreffer: Trefferzahl wählbar
  - Automatisch aus den Werten: Eruption, Hard Press, Hex, Facade, Stored Power, Low Kick, Heavy Slam, Gyro/Electro Ball, Knock Off, Acrobatics, Weather Ball, Misty Explosion u. a.
  - Zustände pro Pokémon: Charge (Elektro ×2), Glaive Rush (doppelter Schaden), dazu Flash Fire, Analytic und Stakeout, wenn das Pokémon die Fähigkeit hat
- Mega-Steine setzen automatisch die Mega-Form, Aegislash greift per Stance Change automatisch in der Klingenform an

## Dateien
- `js/calc.js`: Schadensformel (Gen 9 mit Champions-Anpassungen)
- `js/app.js`: Oberfläche, Set-Auswahl, Import/Export
- `js/online.js`: Online-Aktualisierung von Sets und Regulation
- `data/`: Pokédex, Attacken, Items, Fähigkeiten und Sets aus dem NCP-Repo (Credits: Alex Collins / Jake White)

Neue Regulationen: aktuelle Dateien aus `https://nerd-of-now.github.io/NCP-VGC-Damage-Calculator/script_res/`
(`pokedex.js`, `move_data.js`, `item_data.js`, `ability_data.js`, `setdex_ncp-g10.js`) nach `data/` kopieren.

Lernsets aktualisieren (`data/learnsets_champ.js`): die beiden Showdown-Dateien herunterladen
(`data/mods/champions/learnsets.ts` aus dem Repo smogon/pokemon-showdown und `https://play.pokemonshowdown.com/data/pokedex.json`), dann
`python tools/build_learnsets.py learnsets.ts pokedex.json data/learnsets_champ.js`.

Sprite-Zuschnitt für die Team-Leiste (`data/sprite_boxes.js`, braucht Pillow), danach mit `index.html?teamdemo` prüfen:
`python tools/build_sprite_boxes.py pokedex.json data/learnsets_champ.js data/sprite_boxes.js`.

Genauigkeit der Attacken (`data/move_acc.js`, nur für die Anzeige im Teambuilder): `https://play.pokemonshowdown.com/data/moves.json` und `data/mods/champions/moves.ts` herunterladen, dann
`python tools/build_move_acc.py moves.json moves.ts data/move_acc.js`.

Formen, Geschlecht und Varianten (`data/forms_champ.js`): `https://play.pokemonshowdown.com/data/pokedex.json` herunterladen, dann `python tools/build_forms.py pokedex.json data/forms_champ.js`.

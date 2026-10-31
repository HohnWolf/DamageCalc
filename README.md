# Rattata Lab

Damage Calculator und Teambuilder für **Pokémon Champions** (VGC, Level 50, Stat Points). Früher „Champions Damage Calc“.

Eigener VGC-Schadensrechner für **Pokémon Champions** (Level 50, Stat Points), nach Vorbild des
[NCP VGC Damage Calculator](https://nerd-of-now.github.io/NCP-VGC-Damage-Calculator/).

## Starten
- **Als Windows-App:** `RattataLab-Setup-x.y.z.exe` aus den [Releases](../../releases) installieren. Das legt eine Desktop- und Startmenü-Verknüpfung an. Ohne Installation geht es mit `RattataLab-x.y.z-portable.exe`. Ab Version 1.3.0 aktualisiert sich die installierte App selbst.
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
- Neue Version: `version` in `package.json` erhöhen, `npm run dist`, dann `gh release create v1.3.0 dist/*1.3.0* dist/latest.yml` (Setup, portable und Blockmap dieser Version). Oder in einem Schritt: `GH_TOKEN` setzen und `npm run release` (baut und lädt alles hoch). **`latest.yml` und die `.blockmap` müssen mit ins Release**, sonst finden die installierten Apps das Update nicht.
- Updates (`electron/updater.js`, ab 1.3.0): Die App prüft bei jedem Start das neueste GitHub-Release. Die installierte Version lädt es im Hintergrund (`electron-updater`), zeigt oben „Update x.y.z: neu starten“ und installiert spätestens beim nächsten Beenden. Die portable Version kann sich nicht selbst ersetzen und zeigt nur einen Hinweis mit Link zur Release-Seite. Einstellungen → Updates zeigt Version und Stand und sucht auf Knopfdruck. Log: `%APPDATA%\Rattata Lab\update.log`. Testen mit `npm start`: eine `dev-app-update.yml` (steht in `.gitignore`) in den Projektordner legen, z. B. `provider: generic` und `url: http://127.0.0.1:8765`.
- Hinweis: Electron lädt sein Programm beim `npm install` per Install-Skript nach. Falls `node_modules/electron/dist/electron.exe` fehlt: `node node_modules/electron/install.js` ausführen.

## Startbildschirm und Teambuilder
- Beim Start erscheint die Auswahl zwischen **Damage Calculator**, **Teambuilder**, **Soul Link**, **Nuzlocke** und **Shiny-Zähler** (Tasten `1` bis `5`). Das Logo oben links führt zurück zum Start, die Reiter daneben wechseln direkt.
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

## Soul-Link-Planer und Nuzlocke-Rechner (Alpha)
Zwei eigene Modi, unabhängig voneinander.
- **Soul-Link-Planer** (`js/nuz.js`): nur zum Planen und Nachhalten, rechnet nichts. Mehrere Runs mit 2–6 Spielern. Jede Begegnung (Route/Ort) verbindet je ein Pokémon pro Spieler (alle 1025 Pokémon, deutsch/englisch suchbar, mit Spitzname). Status pro Verbindung: Team, Box, Tot, Verpasst – stirbt eines, ist die ganze Verbindung tot. Oben die Team-Übersicht mit den verbundenen Pokémon, Warnung bei mehr als 6 im Team und bei Typ-Konflikten (Regel wählbar: kein gleicher Primärtyp / kein gemeinsamer Typ / aus). Export/Import als Text, um den Stand mit den anderen Spielern zu teilen. Gespeichert unter `cc_soullink`.
- **Nuzlocke-Rechner – ALPHA** (`js/nuzcalc.js`, Engine `js/gen3.js`): frühe Testversion, in der App deutlich markiert. Das Auslesen ist mit einer nachgebauten Test-ROM und Test-Spielständen geprüft, noch nicht mit allen echten Spielen und Emulatoren. Für Rubin, Saphir, Smaragd, Feuerrot, Blattgrün (alle Sprachen) und ROM-Hacks mit gleichem Aufbau:
  - **ROM laden** (.gba): Basiswerte, Typen, Fähigkeiten, Attacken, Items, Typentabelle, Level-Attacken und alle Trainer mit ihren Teams werden direkt aus der ROM gelesen (die Tabellen werden über bekannte Muster gesucht, keine festen Adressen). Gespeichert werden nur diese Daten (`cc_nuz_rom`, ca. 400 KB), nicht die ROM.
  - **Spielstand laden**: `.sav` (Ingame-Speicherstand, neuester der beiden Blöcke) mit Team, Box, DVs, EVs, Wesen, Fähigkeit und aktuellen KP; Savestates von Emulatoren (roh, gzip, zlib oder PNG wie bei mGBA) so gut es geht durch Suche nach gültigen Pokémon-Daten.
  - **Kämpfe**: Trainer nach Spielfortschritt (höchstes Level) sortiert, „Nur wichtige“ zeigt Trainer mit eigenen Attacken oder Items (Arenaleiter, Top 4, Rivalen …). Wesen und Fähigkeit der gegnerischen Pokémon werden wie im Spiel aus Trainer- und Pokémon-Namen berechnet, Standard-Attacken aus den Level-Attacken.
  - Schaden in beide Richtungen mit allen 16 Zufallswerten, K.O.-Chancen (auch 2–5-Treffer-Attacken), Volltreffer, Initiative. Gen-3-Formel aus pokeemerald (`CalculateBaseDamage`, `Cmd_typecalc`): physisch/speziell nach Typ, Orden-Boni (Orden 1/3/5/7), Wetter, Reflektor/Lichtschild, Doppelkampf, Statuswerte, Brand, Fähigkeiten (Kraftkoloss, Speckschicht, Notdünger …), Typ-Items. Abgeglichen mit @smogon/calc (Gen 3): 2999 von 3000 Zufallsfällen identisch, die Abweichung ist die Typ-Reihenfolge, in der das Original rechnet.
  - Tote Pokémon lassen sich markieren und ausblenden. Auswahl und Feld unter `cc_nuz_calc`.
## Shiny-Zähler
Eigener Modus (`js/shiny.js`, Quoten `js/shiny_odds.js`, Erkennung `js/shiny_detect.js`, Desktop-Teil `electron/shiny.js` und `electron/overlay.html`), angelehnt an die Funktionen von Encounty, aber selbst geschrieben (kein Code übernommen).
- **Hunts**: beliebig viele parallel. Pro Hunt Pokémon (alle 1025), Spiel (Gen 2 bis Legenden: Z-A), Methode, Schillerpin und Schrittweite (z. B. 5 bei Horden). Zählen per Knopf, mit `+`/`−` im Fenster oder per globalem Hotkey.
- **Quoten** pro Spiel und Methode: Zufallsbegegnung/Soft Reset, Masuda, Zucht mit Shiny-Elternteil (Gen 2), Pokéradar, Angelkette, Kontaktsafari, Horden, SOS-Kette, Fangkombo mit Lockparfüm, Besiegt-Zähler (SwSh), Dyna-Raid-Abenteuer, Massenauftreten und Forschung (PLA), Massenauftreten und Sandwich (KP), eigene Quote. Näherungen sind mit „ca.“ markiert.
- **Statistik**: Wahrscheinlichkeit, bis jetzt ein Shiny gefunden zu haben, Vielfaches der Quote, Meilensteine (50/75/90/99 %) mit verbleibenden Begegnungen und geschätzter Zeit, Begegnungen heute und pro Stunde, Timer.
- **Phasen**: „Phase“ (anderes Shiny erschienen, optional in die Sammlung), „Entkommen“ (gesehen, nicht gefangen), letzte Phase rückgängig. „Gefunden!“ beendet den Hunt und trägt das Shiny mit Details in die Sammlung ein.
- **Sammlung**: alle Fänge mit Spitzname, Geschlecht, Wesen, Level, Ball, Fundort, Spiel, Methode, Begegnungen, Phasen, Datum, Notizen; manuell eintragen und bearbeiten. **Shiny-Dex** pro Generation mit Fortschritt (gefangen, gesehen, fehlt).
- **Globale Hotkeys** (Desktop-App, Standard `Strg+Alt+↑` zählen, `Strg+Alt+↓` zurück, `Strg+Alt+T` Timer, Phase frei belegbar): wirken auf alle Hunts mit Haken „Hotkeys zählen diesen Hunt“, auch wenn das Spiel im Vordergrund ist.
- **OBS** (Desktop-App): Browser-Quelle `http://127.0.0.1:39151/overlay` (Server nur lokal, fremde Hosts werden abgewiesen) mit Layout, Größe, Farben und Teilen zum Ein-/Ausblenden, Vorschau in der App. Layout **„Frei anordnen“**: Bühnengröße einstellbar, Sprite, Name, Zahl, Quote, Phase und Timer in der Vorschau mit der Maus verschieben, Mausrad = Größe je Teil, Pfeiltasten = genau verschieben. Die Vorschau ist das echte Overlay mit `edit=1` und meldet jede Änderung per `postMessage` an die App; die Anordnung (`overlay.free` in `cc_shiny`) geht über `/state` live an OBS, die Adresse bleibt `…/overlay?layout=free`. Dazu Textdateien im Ordner `OBS` der App-Daten (`zaehler.txt`, `gesamt.txt`, `phase.txt`, `quote.txt`, `chance.txt`, `timer.txt`, `pokemon.txt`, `methode.txt`, `spiel.txt`).
- **Automatische Erkennung – ALPHA**: Bildschirm/Fenster oder Kamera/Capture-Karte aufnehmen, im Bild einen Bereich markieren, eine oder mehrere Referenzen aufnehmen, während die Begegnung zu sehen ist. Vergleich in Graustufen (Korrelation + mittlere Abweichung), Zustandsmaschine mit Treffern in Folge, Sperre und Pause gegen Doppelzählungen, „Ruhewert messen“ für die Schwelle, „Nur testen“ ohne Zählen. Läuft lokal, auch im Hintergrund. Kameras und Capture-Karten werden in Full HD geöffnet.
  - **Text suchen** (nur Windows-App): statt eines Bildvergleichs liest die in Windows eingebaute Texterkennung (`Windows.Media.Ocr`, über `electron/ocr.js` + `electron/ocr.ps1`, bis zu 5 Bilder/s) den Text im Rahmen und zählt, sobald der gesuchte Name darin steht. Leer = Name des Hunts, mehrere Varianten mit Komma. Unscharfer Vergleich gegen 1–3 benachbarte Wörter: ein falsch gelesener Buchstabe stört nicht, „Abra“ zählt aber nicht bei „Kadabra“. Braucht eine installierte Windows-Sprache mit Texterkennung (bei deutschem oder englischem Windows vorhanden).
- Gespeichert unter `cc_shiny` (Hunts, Sammlung, Hotkeys, Overlay).
## Bedienung auf einen Blick
- Alles passt ohne Scrollen auf den Bildschirm, ab etwa 1050 × 650 Pixeln. Bei kleineren Fenstern scrollt die Seite.
- Die Oberfläche passt sich der Fenstergröße an (Basis 1180 × 800, Faktor 0,8 bis 1,9), damit kein Platz frei bleibt. Vorschau verschiedener Größen: `tools/preview.html?w=1920&h=1080` (braucht den lokalen Server).
- Attacken- und Fähigkeitslisten zeigen nur, was das Pokémon in Champions wirklich lernen bzw. haben kann. Mega-Formen bekommen ihre Mega-Fähigkeit. Importierte Werte außerhalb des Lernsets bleiben erhalten und sind mit ⚠ markiert.
- Der Schaden steht direkt neben jeder Attacke. Ein Klick darauf zeigt oben die komplette Rechnung.
- Neben der Set-Suche: „Speichern“ (eigenes Set), „Export“ (Showdown-Format), „Zum Team“.
- Oben rechts: „Team importieren“ öffnet den Import-Dialog.
- „Zurücksetzen“ im Feld-Kopf: leert die Gegnerseite (beide Slots) und schaltet alle Feldeffekte aus (Wetter, Terrain, Auren, Ruin, Trick Room, Gravity, Screens, Hazards usw.). Einzel/Doppel, deine Seite und das Gegner-Team in der Team-Leiste bleiben. Danach den nächsten Gegner über die Suche oder die Team-Leiste wählen.

## Einstellungen
Zahnrad oben rechts:
- **Leiste oben**: *Tabs* (Standard: nur die geöffneten Modi, mit × oder mittlerer Maustaste schließbar, + öffnet den Startbildschirm), *Alle Modi* oder *Keine* (Wechsel nur über das Logo)
- **Pokémon im Teambuilder**: animiertes 3D-Modell oder Pixel-Sprite
- **Design**: dunkel oder hell
- **Beim Öffnen der App**: Startbildschirm, Damage Calculator oder Teambuilder
- **Sprache**: Deutsch oder English

## Sprache (Deutsch / English)
- In den Einstellungen umschaltbar. Die Seite lädt neu; Slots, Teams und Feld bleiben erhalten.
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

Nuzlocke-Daten (`data/natdex.js` mit allen Pokémon, `data/gen3_names.js` mit Attacken und Fähigkeiten der 3. Generation): `pokedex.json` von Showdown sowie `pokemon_species_names.csv`, `move_names.csv` und `ability_names.csv` aus `PokeAPI/pokeapi` (`data/v2/csv/`) in einen Ordner laden, dann `python tools/build_nuz.py <ordner> data`.

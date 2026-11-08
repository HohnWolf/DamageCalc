# Rattata Lab

Damage Calculator, Teambuilder, Shiny-Zähler, Team-Analyse und Match-Overlays für OBS für **Pokémon Champions** (VGC 2026, Level 50, Stat Points, Reg M-C). Früher „Champions Damage Calc“.

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
- Beim Start erscheint die Auswahl zwischen **Damage Calculator**, **Teambuilder**, **Soul Link**, **Nuzlocke**, **Shiny-Zähler**, **Team-Analyse**, **Match-Overlay** und **Fangrechner** (Tasten `1` bis `8`). Das Logo oben links führt zurück zum Start, die Reiter daneben wechseln direkt.
- **Teambuilder** (`js/builder.js`):
  - Links die Liste aller Teams (neu, kopieren, löschen), Import aus Showdown-Text als neues Team, als neue Version oder in das aktuelle Team.
  - **Mehrere Versionen pro Team:** Über die Versionsleiste (`v1`, `v2`, `+ Neue Version`) lassen sich beliebig viele Varianten eines Teams anlegen, frei benennen (z. B. `v1`, `v2 · Turnier`) und direkt umschalten. Die aktive Version gilt automatisch für Export, Damage Calc, Team-Analyse und Match-Overlay.
  - Oben sechs Plätze mit Sprite, Item, Typen und Attacken; ◀ ▶ verschieben, ✕ entfernt.
  - Darunter der Editor: Pokémon-Suche (deutsch/englisch), „Set übernehmen …“ (beliebte, eigene und Online-Sets), Form, Item, Fähigkeit, Wesen, vier Attacken (nur legale, mit Typ, Kategorie, Stärke, Genauigkeit und AP), Wesen und Stat Points als Balken; bei Mega-Steinen stehen die Mega-Werte daneben. Unter Attacken, Item und Fähigkeit steht jeweils der Effekt.
  - **Auswahlfenster für Attacken, Item und Fähigkeit** (wie bei Wesen): Ein Klick auf das Feld öffnet ein eigenes Fenster mit Suchfeld und einer Zeile je Eintrag, dazu der Effekt wie bei Showdown. Es springt zur aktuellen Auswahl; ↑ ↓ wählen, `Enter` übernimmt, `Esc` schließt.
    - **Attacken**: Typ-Symbol (rund, wie im Spiel), Art, Stärke, Genauigkeit, AP und Effekt. Filter nach Typ (Symbole) und Art; ein Klick auf eine Spaltenüberschrift sortiert (Stärke und Genauigkeit zuerst absteigend). Die Suche findet Namen (deutsch/englisch), Typen und Wörter im Effekt (Namenstreffer stehen oben, z. B. „Regen“ oder „Unlicht“). Schon gewählte Attacken sind abgedunkelt; „Attacke entfernen“ leert den Platz.
    - **Items**: Item-Symbol und Effekt, gruppiert in „Passt zu diesem Pokémon“ (der eigene Mega-Stein), Items, Beeren und Mega-Steine; „Kein Item tragen“.
    - **Fähigkeiten**: Name und Effekt, ohne Symbol; das Fenster ist so hoch wie die Liste.
    - Importierte Werte außerhalb des Lernsets bleiben erhalten und sind mit ⚠ markiert.
  - **Formwechsel** über dem großen Sprite: Normal / Mega (X, Y, Z) / Kampfformen wie Klingenform, Heldenform oder Kohldampf. Werte, Typen und Fähigkeit zeigen die gewählte Form; Mega setzt automatisch den passenden Mega-Stein.
  - **Aussehen & Form**: Form mit eigenen Werten (Regionalformen, Rotom-Formen, Wolwerock, Psiaugon-F …), kosmetische Variante (alle Vivillon-Muster, Florges-Farben, Alcremie, Coiffwaff …), Geschlecht (feste Geschlechter und geschlechtslose Pokémon werden beachtet) und Shiny. Wird im Showdown-Export mitgeschrieben (`(M)`/`(F)`, `Shiny: Yes`, Variantenname).
  - Rechts die Typ-Abdeckung: wie stark jeder Angriffstyp jedes Teammitglied trifft, inklusive Fähigkeiten wie Schwebe, Absorber oder Speckschicht.
  - „Ins Damage Calc: Du / Gegner“ legt das Team in die Team-Leiste der Seite; die ersten beiden werden Slot A und B.
  - Gespeichert in `localStorage` unter `cc_builder`. Beim ersten Öffnen wird das eigene Team aus dem Rechner übernommen.
- In der Desktop-App hat das Fenster keinen Windows-Rahmen: Die Kopfzeile ist die Titelleiste (ziehen, Doppelklick maximiert), rechts sitzen eigene Knöpfe für Minimieren, Maximieren und Schließen (`electron/preload.js`). `F11` schaltet Vollbild.
- Logo und Icon: Rattfratz (`img/logo.png`, `icon.ico`, erzeugt mit `python tools/make_icon.py icon.ico img/logo.png rattata`). Easter Egg (seit 1.10.9, ab 1.17.8 auch in Pro, Studio und der Android-App): beim Start fällt mit der Quote 1:8192 ein Shiny-Rattfratz (`?shiny` in der Adresse oder `--shiny` in der Desktop-App erzwingen ihn). Dann sind das Startlogo, das Markenzeichen oben links, das Favicon und das Fenster-Icon shiny (`img/logo_shiny.png`, `img/home_shiny.png`, `icon_shiny.ico`). Der Klick auf das Markenzeichen führt weiter zum Start.

## Soul-Link-Planer und Nuzlocke-Rechner (Alpha)
Zwei eigene Modi, unabhängig voneinander.
- **Soul-Link-Planer** (`js/nuz.js`): nur zum Planen und Nachhalten, rechnet nichts. Mehrere Runs mit 2–6 Spielern. Jede Begegnung (Route/Ort) verbindet je ein Pokémon pro Spieler (alle 1025 Pokémon, deutsch/englisch suchbar, mit Spitzname). Status pro Verbindung: Team, Box, Tot, Verpasst – stirbt eines, ist die ganze Verbindung tot. Oben die Team-Übersicht mit den verbundenen Pokémon, Warnung bei mehr als 6 im Team und bei Typ-Konflikten (Regel wählbar: kein gleicher Primärtyp / kein gemeinsamer Typ / aus). Export/Import als Text, um den Stand mit den anderen Spielern zu teilen. Gespeichert unter `cc_soullink`.
- **Nuzlocke-Rechner – ALPHA** (`js/nuzcalc.js`, Engines `js/gen3.js` für GBA und `js/nds.js` + `js/nds_calc.js` für DS): frühe Testversion, in der App deutlich markiert. Das Auslesen ist mit nachgebauten Test-ROMs und Test-Spielständen geprüft, noch nicht mit allen echten Spielen und Emulatoren. Für Rubin, Saphir, Smaragd, Feuerrot, Blattgrün, Diamant, Perl, Platin, HeartGold, SoulSilver, Schwarz, Weiß, Schwarz 2, Weiß 2 (alle Sprachen) und ROM-Hacks mit gleichem Aufbau (z. B. Renegade Platinum, Blaze Black 2):
  - **ROM laden** (.gba): Basiswerte, Typen, Fähigkeiten, Attacken, Items, Typentabelle, Level-Attacken und alle Trainer mit ihren Teams werden direkt aus der ROM gelesen (die Tabellen werden über bekannte Muster gesucht, keine festen Adressen). Gespeichert werden nur diese Daten (`cc_nuz_rom`, ca. 400 KB), nicht die ROM.
  - **Spielstand laden**: `.sav` (Ingame-Speicherstand, neuester der beiden Blöcke) mit Team, Box, DVs, EVs, Wesen, Fähigkeit und aktuellen KP; Savestates von Emulatoren (roh, gzip, zlib oder PNG wie bei mGBA) so gut es geht durch Suche nach gültigen Pokémon-Daten.
  - **Kämpfe**: Trainer nach Spielfortschritt (höchstes Level) sortiert, „Nur wichtige“ zeigt Trainer mit eigenen Attacken oder Items (Arenaleiter, Top 4, Rivalen …). Wesen und Fähigkeit der gegnerischen Pokémon werden wie im Spiel aus Trainer- und Pokémon-Namen berechnet, Standard-Attacken aus den Level-Attacken.
  - Schaden in beide Richtungen mit allen 16 Zufallswerten, K.O.-Chancen (auch 2–5-Treffer-Attacken), Volltreffer, Initiative. Gen-3-Formel aus pokeemerald (`CalculateBaseDamage`, `Cmd_typecalc`): physisch/speziell nach Typ, Orden-Boni (Orden 1/3/5/7), Wetter, Reflektor/Lichtschild, Doppelkampf, Statuswerte, Brand, Fähigkeiten (Kraftkoloss, Speckschicht, Notdünger …), Typ-Items. Abgeglichen mit @smogon/calc (Gen 3): 2999 von 3000 Zufallsfällen identisch, die Abweichung ist die Typ-Reihenfolge, in der das Original rechnet.
  - **DS-Spiele (4. und 5. Generation)**, `js/nds.js`: ROM (.nds) über das NitroFS-Dateisystem und die NARC-Archive (auch LZ-komprimiert) – Basiswerte, Typen, Fähigkeiten, Formen (Deoxys, Rotom, Giratina …), Attacken, Level-Attacken, Trainer mit Teams, Trainer- und Klassennamen aus den verschlüsselten Textarchiven (Bank-Nummern je Spiel und Region, bei Hacks mit mehr Trainern wird die Namensbank gesucht). Spielstand (.sav, DeSmuME-.dsv, Action-Replay-Kopf) wie PKHeX: Gen 4 mit beiden Partitionen und neuestem Block, Gen 5 über die Prüfsumme; PK4/PK5 entschlüsselt (LCRNG, Blockreihenfolge, Prüfsumme). Savestates werden mit geladener DS-ROM nach gültigen Pokémon durchsucht.
  - Wesen und Fähigkeit der gegnerischen DS-Pokémon wie im Spiel: PID aus Schwierigkeit, Level, Art und Trainernummer (Gen 4 LCRNG, Gen 5 64-Bit-Generator aus pokebw2 `tr_tool.c`), Geschlechts-/Fähigkeits-Vorgabe von HGSS und Gen 5 inklusive des Spielfehlers, dass sie für die folgenden Pokémon bestehen bleibt. Gen 4: Wesen = PID % 25, Gen 5: (PID >> 8) % 25.
  - DS-Schaden nach dem Smogon-Rechner (Gen 4: Abrundungen und Reihenfolge von `gen4.ts`, Gen 5: 4096er-Modifikatoren von `gen56.ts`), mit Formwandel, Rohe Gewalt, Juwelen, Evolith, Luftballon, Mold Breaker, garantierten Volltreffern u. a. Abgeglichen mit @smogon/calc 0.12: 8000 von 8000 Zufallsfällen (Gen 4 und 5) identisch; nicht automatisch gerechnet werden Rivalität (Geschlecht), Download und Traumfresser ohne Schlaf (Hinweis an der Attacke).
  - Tote Pokémon lassen sich markieren und ausblenden. Auswahl und Feld unter `cc_nuz_calc`.
## Shiny-Zähler
Eigener Modus (`js/shiny.js`, Quoten `js/shiny_odds.js`, Erkennung `js/shiny_detect.js`, Desktop-Teil `electron/shiny.js` und `electron/overlay.html`), angelehnt an die Funktionen von Encounty, aber selbst geschrieben (kein Code übernommen).
- **Hunts**: beliebig viele parallel. Pro Hunt Pokémon (alle 1025), Spiel (Gen 2 bis Legenden: Z-A), Methode, Schillerpin und Schrittweite (z. B. 5 bei Horden). Zählen per Knopf, mit `+`/`−` im Fenster oder per globalem Hotkey.
- **Zähler und Zeit von Hand festlegen**: „✎ Festlegen“ in der Zähler-Karte (oder Doppelklick auf die Zahl oder die Zeit), etwa um einen Hunt aus einem anderen Zähler zu übernehmen.
  - Felder: Begegnungen der aktuellen Phase, Gesamt und Zeit (Stunden : Minuten : Sekunden).
  - Bleibt „Gesamt“ leer, ändert es sich um denselben Betrag wie die Begegnungen.
  - Ein laufender Timer läuft ab der neuen Zeit weiter. „Heute“ bleibt unverändert.
- **Quoten** pro Spiel und Methode: Zufallsbegegnung/Soft Reset, Masuda, Zucht mit Shiny-Elternteil (Gen 2), Pokéradar, Angelkette, Kontaktsafari, Horden, SOS-Kette, Fangkombo mit Lockparfüm, Besiegt-Zähler (SwSh), Dyna-Raid-Abenteuer, Massenauftreten und Forschung (PLA), Massenauftreten und Sandwich (KP), eigene Quote. Näherungen sind mit „ca.“ markiert.
- **Statistik**: Wahrscheinlichkeit, bis jetzt ein Shiny gefunden zu haben, Vielfaches der Quote, Meilensteine (50/75/90/99 %) mit verbleibenden Begegnungen und geschätzter Zeit, Begegnungen heute und pro Stunde, Timer.
- **Phasen**: „Phase“ (anderes Shiny erschienen, optional in die Sammlung), „Entkommen“ (gesehen, nicht gefangen), letzte Phase rückgängig. „Gefunden!“ beendet den Hunt und trägt das Shiny mit Details in die Sammlung ein.
- **Sammlung**: alle Fänge mit Spitzname, Geschlecht, Wesen, Level, Ball, Fundort, Spiel, Methode, Begegnungen, Phasen, Datum, Notizen; manuell eintragen und bearbeiten. **Shiny-Dex** pro Generation mit Fortschritt (gefangen, gesehen, fehlt).
- **Globale Hotkeys** (Desktop-App, Standard `Strg+Alt+↑` zählen, `Strg+Alt+↓` zurück, `Strg+Alt+T` Timer, Phase und Clip frei belegbar): wirken auf alle Hunts mit Haken „Hotkeys zählen diesen Hunt“, auch wenn das Spiel im Vordergrund ist.
- **Projektor** (Desktop-App, ab 1.17.9): Knopf „Projektor“ bei der Aufnahme (oder `Strg+Alt+P`) öffnet ein eigenes, skalierbares Fenster mit dem Bild der laufenden Quelle und dem OBS-Overlay darüber (Zähler, Quote, Timer). Der gelbe Erkennungsrahmen bleibt nur in der App. Bildschirm und Capture-Karte werden nicht ein zweites Mal geöffnet; das Fenster bekommt die Bilder aus dem schon laufenden Video. Rechtsklick: Vollbild auf einem Monitor, immer im Vordergrund, Mauszeiger ausblenden, Overlay an/aus, Schließen. `Esc` verlässt den Vollbildmodus. Lage und Optionen liegen in `cc_shiny` unter `projector`.
- **OBS** (Desktop-App): Browser-Quelle `http://127.0.0.1:39151/overlay` (Server nur lokal, fremde Hosts werden abgewiesen) mit Layout, Größe, Farben und Teilen zum Ein-/Ausblenden, Vorschau in der App. Layout **„Frei anordnen“**: Bühnengröße einstellbar, Sprite, Name, Zahl, Quote, Phase und Timer in der Vorschau mit der Maus verschieben, Mausrad = Größe je Teil, Pfeiltasten = genau verschieben. Die Vorschau ist das echte Overlay mit `edit=1` und meldet jede Änderung per `postMessage` an die App; die Anordnung (`overlay.free` in `cc_shiny`) geht über `/state` live an OBS, die Adresse bleibt `…/overlay?layout=free`. Dazu Textdateien im Ordner `OBS` der App-Daten (`zaehler.txt`, `gesamt.txt`, `phase.txt`, `quote.txt`, `chance.txt`, `timer.txt`, `pokemon.txt`, `methode.txt`, `spiel.txt`).
- **Clips** (`js/shiny_clip.js`), ein Replay-Puffer wie in OBS:
  - Die Spielquelle (Bildschirm/Fenster, Kamera/Capture-Karte oder die Quelle der automatischen Erkennung) wird im Hintergrund aufgenommen.
  - Ein Clip speichert die letzten *Sekunden davor* (5–120, Standard 30) und *Sekunden danach* (0–30, Standard 5).
  - Auslöser: „● Clip speichern“, globaler Hotkey „Clip speichern“ und automatisch bei „Gefunden!“ sowie bei Phase/Entkommen (beides abschaltbar).
  - Der Shiny-Clip hängt am Fang und lässt sich in der Sammlung mit ▶ abspielen.
  - Einstellungen: Qualität 720p oder 1080p, Ton: keiner, Systemton (Bildschirm, Windows-Loopback) oder ein Audio-Eingang, z. B. die Capture-Karte. Die letzte Quelle merkt sich die App („Verbinden: …“).
  - Format MP4 (H.264), wo der Rekorder es kann, sonst WebM. Gespeichert unter `VideosRattata Lab Clips` (Desktop-App), im Browser als Download.
  - Technik: MediaRecorder lassen sich vorn nicht kürzen. Deshalb startet alle *davor* Sekunden ein neuer Rekorder, alte werden verworfen. Beim Clip nimmt der älteste weiter auf, so ist der Clip *davor* bis 2 × *davor* Sekunden lang und immer eine vollständige Datei.
  - Einstellungen und die letzten Clips liegen in `cc_shiny` unter `clip`.
- **Automatische Erkennung – ALPHA**: Bildschirm/Fenster oder Kamera/Capture-Karte aufnehmen, im Bild einen Bereich markieren, eine oder mehrere Referenzen aufnehmen, während die Begegnung zu sehen ist. Vergleich in Graustufen (Korrelation + mittlere Abweichung), Zustandsmaschine mit Treffern in Folge, Sperre und Pause gegen Doppelzählungen, „Ruhewert messen“ für die Schwelle, „Nur testen“ ohne Zählen. Läuft lokal, auch im Hintergrund. Kameras und Capture-Karten werden in Full HD geöffnet.
  - **Text suchen** (nur Windows-App): statt eines Bildvergleichs liest die in Windows eingebaute Texterkennung (`Windows.Media.Ocr`, über `electron/ocr.js` + `electron/ocr.ps1`, bis zu 5 Bilder/s) den Text im Rahmen und zählt, sobald der gesuchte Name darin steht. Leer = Name des Hunts, mehrere Varianten mit Komma. Unscharfer Vergleich gegen 1–3 benachbarte Wörter: ein falsch gelesener Buchstabe stört nicht, „Abra“ zählt aber nicht bei „Kadabra“. Braucht eine installierte Windows-Sprache mit Texterkennung (bei deutschem oder englischem Windows vorhanden).
- Gespeichert unter `cc_shiny` (Hunts, Sammlung, Hotkeys, Overlay).
## Team-Analyse
Eigener Modus (`js/match.js`, Auswertung `js/match_parse.js`, Taste `6`). Ein Team aus dem **Teambuilder** ist ein Bericht: alle Spiele mit diesen Pokémon stehen zusammen (kein PokéPaste). Showdown-Namen oben helfen, die eigene Seite zu erkennen; ohne Namen reicht es, wenn die Pokémon des Teams im Replay vorkommen. Ein neues Spiel wird dem Team zugeordnet, auf das die eigenen Pokémon am besten passen (mindestens zwei).
- **Replays:** Links von `replay.pokemonshowdown.com` einfügen (ein Link pro Zeile, auch `.json` oder `.log`). Der Browser lädt `https://replay.pokemonshowdown.com/<id>.json` direkt. Showdown setzt `Access-Control-Allow-Origin: *`, deshalb klappt das in der normalen Seite und in der Desktop-App ohne Proxy. Private Replays oder ein blockierter Abruf: das JSON oder den Log-Text ins selbe Feld einfügen.
- Pro Spiel: Sieg oder Niederlage, die sechs des Gegners (Teamvorschau), Leads und Back beider Seiten (die vier Eingesetzten, Leads sind das, was vor Runde 1 auf dem Feld steht), Mega (`|-mega|`) und Tera (`|-terastallize|`), offen oder geschlossen (Item in der Vorschauzeile = offen), Elo aus der Spielerzeile und der Wertungszeile am Ende.
- **Serien:** aufeinanderfolgende Spiele gegen denselben Gegner, bis eine Seite zwei Siege hat oder drei Spiele gespielt sind. Mehr als sechs Stunden Abstand trennt. Am Spiel stehen „Neue Serie davor“ und „Eigenes Spiel (Bo1)“.
- **Nutzung** je Pokémon des Teams: dabei, Siege, Siegquote, Anteil an allen Spielen, Lead-Quote, Mega- und Tera-Quote, dazu Lead-Paare und die Siegquote bei offenem und geschlossenem Team Sheet.
- **Matchups** gegen gegnerische Pokémon (im Team, eingesetzt, eigene Siege, Einsatzquote). Beste und schwächste Listen ab vier Einsätzen.
- **Attacken:** wie oft jede Attacke der eigenen Pokémon vorkam. Attacken aus dem Teambuilder-Set stehen auch bei null.
- **Filter** in der Spieleliste: Ergebnis, Gegner im Team, Gegner-Lead, Gegner-Back, eigenes Lead, eigenes Back, selbst eingesetzt, Mega oder Tera, Team Sheet, Mindest-Elo des Gegners. Die Statistik darüber zählt alle Spiele mit Sieger, der Filter nur die Liste.
- **Prüfen:** doppelte Links (werden nicht zweimal übernommen), ungültige Adressen, fehlgeschlagene Abrufe, Spiele ohne erkennbare Seite oder ohne Sieger.
- Der Bericht ist eine Tabelle: sechs Pokémon und Bilanz oben, Replay-Einträge, Nutzung (dabei, Siege, Quote, Anteil, Mega/Tera), Lead-Paare, Matchups, Attacken, Spiel für Spiel mit Filter, Serie für Serie. Siegquoten sind grün, gelb oder rot. Gespeichert unter `cc_match`, jedes Spiel mit `teamId`. „Sichern“ / „Datei laden“ schreibt `{ kind: "rattata-match", v: 2 }`. „Beispiel laden“ legt vier Spiele an das gerade gewählte Team.
- Die Idee, aus Replay-Links diese Auswertungen zu bauen, stammt vom PALKIA Academy Showdown Reporting Spreadsheet v7.0 (PASRS, Bauerdad und v0Lt). Übernommen ist davon nichts außer der Fragestellung.

## Match-Overlay
Eigener Modus (`js/overlay.js`, Desktop-Teil `electron/match.js`, Seiten in `electron/match/`, Taste `7`). Er enthält die beiden früheren Python-Overlays „Team Overlay“ (`vgc_team_overlay.py`) und „Teampreview“ (`pokemon_team_overlay.py`). Aussehen und Verhalten sind übernommen, Python und Flask braucht es nicht mehr. Die Seiten laufen auf dem lokalen OBS-Server des Shiny-Zählers (nur `127.0.0.1`, gleicher Port). Deshalb gehen sie nur in der Desktop-App.
- **Auswahl beim Öffnen:** Beim Klick auf *Match-Overlay* wählt man zwischen **Eigenes Match** (*Team-Overlay*) und **Aufnahme Match** (*Teampreview + Matchup & Start* vereint auf einer kompakten Seite). Jedes Overlay lässt sich einzeln in OBS ein- und ausschalten; dazu kommen die Sprache der Overlays (Deutsch/English) und „▶ Start-Screen abspielen“.
- **Team-Overlay** (Browserquellen je 320 × 1080):
  - `http://127.0.0.1:39151/match/team?side=me` zeigt das eigene Team, `…?side=opp` den Gegner.
  - Pro Pokémon: Name, KP-Balken, Item, Fähigkeit · Wesen und Attacken. Das Bild kommt aus Pokémon HOME, bei passendem Mega-Stein die Mega-Form.
  - Editor mit sechs Plätzen je Seite: Pokémon, Fähigkeit (nur legale), Item, Wesen, vier Attacken (Vorschläge aus dem Lernset, ⚠ bei nicht legalen), KP in % und K.O.
  - Ein Klick aufs Bild markiert „mitgebracht“. Beim Gegner werden bis zu drei Gewählte hervorgehoben, ab vier stehen nur noch diese im Overlay. Beim eigenen Team stehen nur noch die Gewählten im Overlay, sobald eines markiert ist.
  - Füllen: aus dem **Teambuilder**, per Showdown-Text oder von Hand. Beim Tippen ergänzt das Feld den Namen, `Tab` übernimmt, und `Tab` im Pokémon-Feld springt zum nächsten Pokémon.
  - Modus *Turnier* oder *Ladder*: Im Ladder-Modus zeigt der Gegner kein Wesen, und „Neuer Gegner“ leert die Seite.
  - Jede Seite lässt sich einzeln aus- und einblenden.
- **Teampreview** (`/match/preview`, 1920 × 1080): beide Teams mit Typen, Fähigkeit, Wesen (↑/↓ Werte), Attacken mit Typ-Symbol und Item-Symbol.
  - Optional die Bank (bis zu vier Namen je Team) und *Closed Team Sheet* (nur Pokémon und Typen).
  - Hintergrund transparent oder lila animiert (`?bg=solid` erzwingt ihn).
  - Teams kommen als Showdown-Export, aus dem Teambuilder oder vom Team-Overlay; Megas werden dabei als `…-Mega` ausgeschrieben.
  - Pokémon außerhalb von Champions erkennt es über den Nationaldex.
  - Unbekannte Namen stehen als Hinweis darunter. Dazu gibt es eine Vorschau.
- **Matchup-Banner** (`/match/matchup`, 1920 × 200) und **Startseite „Wer gegen wen“** (`/match/start`, 1920 × 1080):
  - Name, Standing, Spielstand (±), Teamlogos (PNG/JPG/WEBP/GIF/SVG bis 5 MB, große Bilder werden auf 720 × 400 verkleinert), Liga und Woche.
  - Knöpfe für „Seiten tauschen“ (mit Logos) und „Stand 0:0“.
  - „Start-Screen abspielen“ blendet die Startseite für 15 s im Teampreview ein (`?intro=<Sekunden>`).
- Die App schickt den fertig aufbereiteten Stand an `/match/state` (Namen in der Overlay-Sprache, Typen, Bildadressen), und die Seiten fragen jede Sekunde nach. Nach einem Neustart der App laden sich offene Overlays in OBS selbst neu.
- **Bilder:**
  - Pokémon kommen aus Pokémon HOME über die PokéAPI-Nummer (`data/pokeapi_ids.js`), Ausweichquellen sind Showdown HOME und Gen 5. Im Teampreview wird der leere Rand abgeschnitten.
  - Items kommen zuerst als Champions-Symbole vom PokéWiki (`electron/match/pokewiki_items.json`), dann von PokéAPI, zuletzt aus dem Showdown-Sheet.
  - Alles läuft über `/match/img` (nur bekannte Hosts) und wird unter `%APPDATA%Rattata LabMatchOverlaycache` gespeichert. Danach geht es auch offline.
  - Die Typ-Symbole stammen aus dem alten Teampreview (`electron/match/types/`).
  - Logos liegen unter `MatchOverlaylogos`.
- Gespeichert unter `cc_overlay`. Selbsttest in der Konsole: `CCOverlay.selfTest()`.

## Fangrechner (Catch Calculator)
Eigener Modus (`js/catch_calc.js`, Daten `data/catch_data.js`, Styles `css/catch.css`, Taste `8`), nach Vorbild des Catch Rate Calculators von Dragonfly Cave – unterstützt alle Pokémon-Hauptspiele von **Generation 1 bis Generation 9**:
- **Wählbare Hauptspiele:** *Rot / Blau / Gelb* (Gen 1), *Gold / Silber / Kristall* (Gen 2), *Rubin / Saphir / Smaragd* & *Feuerrot / Blattgrün* (Gen 3), *Diamant / Perl*, *Platin* & *HeartGold / SoulSilver* (Gen 4), *Schwarz / Weiß* & *Schwarz 2 / Weiß 2* (Gen 5), *X / Y* & *Omega Rubin / Alpha Saphir* (Gen 6), *Sonne / Mond* & *Ultrasonne / Ultramond* (Gen 7), *Schwert / Schild* & *Strahlender Diamant / Leuchtende Perle* (Gen 8) sowie *Karmesin / Purpur* (Gen 9).
- **Spielspezifische Fangraten:** Automatische Berücksichtigung geänderter Fangraten je Edition (z. B. Dialga/Palkia `30` in DP/BDSP vs. `3` in Platin, Rayquaza `45` in ORAS, Reshiram/Zekrom `45` in BW/B2W2/XY, Necrozma `255` in USUM, Endynalos `255` in SwSh) sowie optionales Feld für eine eigene Fangrate (`1–255`).
- **KP-Berechnung über alle 32 KP-IVs (bzw. 16 KP-DVs in Gen 1–2):**
  - Wahlweise **KP in %** (Schieberegler `1–100 %` + Schnellwahl `100 %`, `75 %`, `50 %`, `25 %`, `10 %`, `1 KP (Trugschlag)`) oder **Exakte KP** (`Aktuelle KP` / `Maximale KP`).
  - Im Prozent-/Trugschlag-Modus wird über alle möglichen KP-DVs/IVs gerechnet und bei Abweichungen eine ausklappbare KP-IV-Aufschlüsselung angezeigt.
- **Exakte Generations-Mechaniken:**
  - *Gen 1 (RBY):* Authentischer RBY-Algorithmus mit ballabhängigem Zufallsbereich (`0..255` / `0..200` / `0..150`) und direktem Status-Offset.
  - *Gen 2 (GSC):* Aprikokobälle und originale GSC-Bugs (Status-Bug bei Paralyse/Brand/Gift, Mond-/Sympa-/Turboball), per Checkbox auf beabsichtigte Werte umschaltbar.
  - *Gen 3 & 4:* Klassische Wackel-Formel mit 4 Wackel-Checks.
  - *Gen 5:* 4096-Festkomma-Arithmetik, Dunkles Gras, Kontaktebenen-Fangkraft, Kritischer Fang und 3 Wackel-Checks.
  - *Gen 6 & 7:* O-Kraft / Rotom-Fang, Fangpin (Catching Charm), Ultrabestien-Malus (`×0,1`) bzw. Ultraball (`×5`).
  - *Gen 8 & 9:* Niedriglevel-Bonus (SwSh), Orden-Level-Cap-Strafen (SwSh `×0,1`, BDSP/SV `0,8^Differenz`), Überrascht / Backstrike (`×2`), Starker Wanderer (`×0,5`) und Sandwich-Fangkraft (SV).
- **Bebilderte Pokéball-Auswahl & Einzelball-Auswertung:** Visuelle Auswahl aller im gewählten Spiel verfügbaren Pokébälle inklusive Pokéball-Sprite und Effektbeschreibung; zeigt für den ausgewählten Ball den aktuellen Faktor, die Fangchance pro Wurf, die Krit-Erfolgschance, den Erwartungswert (`Ø Bälle`) und die benötigten Bälle für `≥ 50 % / 75 % / 95 % / 99 %` Fangwahrscheinlichkeit.
- Gespeichert unter `cc_catch`. Selbsttest in der Konsole: `CCCatchCalc.selfTest()`.

## Nationaler Pokédex (Gen 1–9)
Eigener Modus (`js/pokedex.js`, Daten `data/dex_gen1.js`, Styles `css/pokedex.css`, Taste `9`):
- **Alle 1025 Pokémon (`#001` Bisasam bis `#1025` Infamomo):** Filterbar nach Generation (`Alle`, `G1` bis `G9`), Typ, Name/Nummer sowie über den Schnellfilter **„Nur vollentwickelt“**.
- **3D-Modelle, HOME-Renders & Pixel-Sprites:** Direkt umschaltbar inklusive **★ Shiny**-Ansicht.
- **Form-Umschalter:** Eigene Knopfleiste für alle Pokémon mit mehreren Formen (Mega, Protomorphose, Alola, Galar, Hisui, Paldea, Gigadynamax sowie Spezialformen wie Rotom, Deoxys, Wolwerock, Ogerpon, Terapagos u. v. m.) – aktualisiert Modell, Typen, Typ-Schwächen, Fähigkeiten, Basiswerte und Entwicklungsreihe.
- **Fähigkeiten, Basiswerte & Entwicklungsreihen:** Alle Fähigkeiten (inkl. Versteckter Fähigkeit) mit Effektbeschreibung, Basiswerte mit Balken, Level-50-Min–Max-Spanne und `(+/-)`-Form-Differenz sowie interaktive Entwicklungsbäume inklusive Entwicklungsmethode.

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
- **Aktive Tools**: Jedes der 8 Tools (*Damage Calculator*, *Teambuilder*, *Soul Link*, *Nuzlocke*, *Shiny-Zähler*, *Team-Analyse*, *Match-Overlay*, *Fangrechner*) lässt sich einzeln ein- und ausschalten. Deaktivierte Tools verschwinden auf dem Startbildschirm (inkl. automatischer Spalten- und Tastenkürzel-Anpassung `1–N`), in der oberen Leiste und aus den Start-Optionen; gespeicherte Daten bleiben erhalten.
- **Leiste oben**: *Tabs* (Standard: nur die geöffneten Modi, mit × oder mittlerer Maustaste schließbar, + öffnet den Startbildschirm, bei vielen Tabs per Mausrad horizontal scrollbar), *Alle Modi* oder *Keine* (Wechsel nur über das Logo oder `Alt+1` bis `Alt+8` bzw. `Alt+0`)
- **Pokémon im Teambuilder**: animiertes 3D-Modell, HD-Render (HOME) oder Pixel-Sprite
- **Oberflächen-Stil**: *Klassisch (Flach)*, *Modern (Weich, mit feinen Tiefenschatten)*, *Glas (Transluzent)*, *Retro (Pixel-Kantig)* oder *Kompakt (Turnier)*
- **Oberflächengröße**: Automatisch (passt sich dem Fenster an) oder feste Skalierung (85 %, 100 %, 115 %, 130 %, 150 %)
- **Design**: 13 Farbschemata – *Dunkel*, *Hell*, *OLED*, *Poké-Rot*, *Rattata-Lila*, *Ozean*, *Smaragd*, *HeartGold*, *Cyber-Neon*, *Sakura (Hell)*, *Abendrot*, *Arktis-Eis* oder *System*
- **Daten-Backup**: Alle Teams, Sets, Runs, Shiny-Hunts, Fangrechner-Stände und Overlays als `.json`-Datei sichern und wiederherstellen
- **Beim Öffnen der App**: Startbildschirm, Damage Calculator, Teambuilder, Soul Link, Nuzlocke, Shiny-Zähler, Team-Analyse, Match-Overlay oder Fangrechner
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
- `js/builder.js`: Teambuilder, inklusive der Auswahlfenster (`openPicker`)
- `js/capture.js`, `js/shiny_detect.js`, `js/shiny_clip.js`: Spielaufzeichnung, automatische Erkennung und Clips des Shiny-Zählers
- `js/match_parse.js`, `js/match.js`: Team-Analyse (ein Teambuilder-Team, Showdown-Replays)
- `js/overlay.js`, `electron/match.js`, `electron/match/`: Match-Overlay (Team-Overlay, Teampreview, Matchup-Banner, Startseite für OBS)
- `data/pokeapi_ids.js`: PokéAPI-Nummern für die HOME-Bilder der Overlays. Erzeugt mit `node tools/build_pokeapi_ids.mjs pokemon.csv pokemon_species.csv data/pokeapi_ids.js` (beide CSV aus `PokeAPI/pokeapi`, `data/v2/csv/`)
- `data/`: Pokédex, Attacken, Items, Fähigkeiten und Sets aus dem NCP-Repo (Credits: Alex Collins / Jake White)
- `data/desc_en.js`, `data/desc_de.js`, `data/pick_meta.js`: Effekttexte (englisch aus Pokémon Showdown, mit den Änderungen von Champions; deutsch aus den Spieltexten von PokeAPI, dazu eigene Übersetzungen für Gen-9-Inhalte und Champions-Änderungen), PP der Attacken und Symbol-Nummern der Items. Erzeugt mit `tools/build_pick.mjs`. Gibt es für einen neu geladenen Eintrag keinen deutschen Text, steht der englische da, sonst keiner.
- `img/types/`: runde Typ-Symbole (18 SVG) von [partywhale/pokemon-type-icons](https://github.com/partywhale/pokemon-type-icons), MIT-Lizenz (`img/types/LICENSE.txt`). Die Item-Symbole kommen wie die Sprites online von Pokémon Showdown (`itemicons-sheet.png`) und brauchen Internet.

Neue Regulationen: aktuelle Dateien aus `https://nerd-of-now.github.io/NCP-VGC-Damage-Calculator/script_res/`
(`pokedex.js`, `move_data.js`, `item_data.js`, `ability_data.js`, `setdex_ncp-g10.js`) nach `data/` kopieren.

Lernsets aktualisieren (`data/learnsets_champ.js`): die beiden Showdown-Dateien herunterladen
(`data/mods/champions/learnsets.ts` aus dem Repo smogon/pokemon-showdown und `https://play.pokemonshowdown.com/data/pokedex.json`), dann
`python tools/build_learnsets.py learnsets.ts pokedex.json data/learnsets_champ.js`.

Sprite-Zuschnitt für die Team-Leiste (`data/sprite_boxes.js`, braucht Pillow), danach mit `index.html?teamdemo` prüfen:
`python tools/build_sprite_boxes.py pokedex.json data/learnsets_champ.js data/sprite_boxes.js`.

Effekttexte, PP und Item-Symbole der Auswahlfenster (`data/desc_en.js`, `data/desc_de.js`, `data/pick_meta.js`), braucht nur Node.js: in einen Ordner `text_moves.ts`, `text_items.ts`, `text_abilities.ts` (aus `data/text/{moves,items,abilities}.ts` im Repo smogon/pokemon-showdown), `champions_moves.ts` (`data/mods/champions/moves.ts`), `moves.json` und `items.js` (`https://play.pokemonshowdown.com/data/`) legen, in einen zweiten Ordner `move_names.csv`, `ability_names.csv`, `item_names.csv`, `move_flavor_text.csv`, `ability_flavor_text.csv` und `item_flavor_text.csv` aus `PokeAPI/pokeapi` (`data/v2/csv/`), dann
`node tools/build_pick.mjs <showdown-ordner> <pokeapi-ordner> data`. Das Skript liest die Dateien nur als Text. Eigene deutsche Texte stehen in `tools/desc_de_extra.json` („override“ für Änderungen von Champions, „fill“ für Lücken bei PokeAPI; fehlende Mega-Steine erzeugt das Skript aus einer Vorlage) und das Skript meldet, was für Champions noch keinen deutschen Text hat.

Genauigkeit der Attacken (`data/move_acc.js`, nur für die Anzeige im Teambuilder): `https://play.pokemonshowdown.com/data/moves.json` und `data/mods/champions/moves.ts` herunterladen, dann
`python tools/build_move_acc.py moves.json moves.ts data/move_acc.js`.

Formen, Geschlecht und Varianten (`data/forms_champ.js`): `https://play.pokemonshowdown.com/data/pokedex.json` herunterladen, dann `python tools/build_forms.py pokedex.json data/forms_champ.js`.

Nuzlocke-Daten (`data/natdex.js` mit allen Pokémon, `data/gen3_names.js` mit Attacken und Fähigkeiten der 3. Generation, `data/nds_names.js` mit Attacken, Fähigkeiten und Items der 4./5. Generation): `pokedex.json` von Showdown sowie `pokemon_species_names.csv`, `move_names.csv`, `ability_names.csv`, `item_names.csv` und `item_game_indices.csv` aus `PokeAPI/pokeapi` (`data/v2/csv/`) in einen Ordner laden, dann `python tools/build_nuz.py <ordner> data`.

## Randomizer – erweiterte Optionen
Orientiert am [Universal Pokémon Randomizer ZX](https://github.com/Ajarmar/universal-pokemon-randomizer-zx) (GPL-3.0). Gen 1–7 laufen über den gemeinsamen Kern `js/rand_core.js`, jede Generation liefert nur einen Adapter (Modell). Unter „Erweiterte Optionen“ in der Oberfläche:

| Option | Gen 1/2 | Gen 3 | Gen 4 | Gen 5 | Gen 6/7 |
|---|---|---|---|---|---|
| Typen/Fähigkeiten erben, Fähigkeiten sperren, Level-Attacken-Typanteil | ✓ | ✓ | ✓ | ✓ | ✓ |
| Entwicklungen (gleicher Typ, Ziel ändern, max. 3 Stufen) | ✓ | ✓ | ✓ | ✓ | ✓ |
| Starter (2 Entwicklungen, gleicher Typ) | ✓ | ✓ | – | – | – |
| Wild (Typ-Thema, 1:1 je Gebiet, Catch ’em all), Trainer (Typ-Thema, keine Doppelten) | ✓ | ✓ | ✓ | ✓ | ✓ |
| Attacken-Daten (Stärke, Genauigkeit, AP, Typ, Art) | ✓ (ohne Art) | ✓ (ohne Art) | ✓ | ✓ | ✓ |
| TM-Attacken, TM/HM-Kompatibilität | ✓ | ✓ | ✓ | ✓ | ✓ (Attacken in `code.bin`, neu BLZ-komprimiert; passt der Code nicht, bleibt er unverändert) |
| Attacken-Lehrer (Attacken, Kompatibilität) | – | ✓ (Sm., FR/BG) | ✓ (Pt, HG/SS; nur unkomprimierte Overlays) | ✓ (Schwarz 2/Weiß 2) | – |
| Unmögliche Entwicklungen ersetzen, Tag/Nacht-Entwicklungen, Entwicklungen erleichtern, EP-Kurve vereinheitlichen | eingeschränkt (Tausch → Level, Level senken, EP-Kurve) | ✓ | ✓ | ✓ | ✓ |
| Mindest-Fangrate, Level der wilden Pokémon ändern | ✓ | ✓ | ✓ (Level: ohne Gras/Schwärme in HG/SS) | ✓ | ✓ |
| Items auf dem Feld (inkl. versteckte), Shop-Inhalte, Pickup-Items, Trainer-Items | – | ✓ | ✓ | ✓ (Shops: alle außer, wenn das Overlay komprimiert ist) | – |
| Statische Pokémon/Geschenke, Ingame-Tausche | ✓ | ✓ | ✓ | ✓ | Statics nur Gen 7 (Sonne/Mond/Ultra); Ingame-Tausche nur Gen 6 (`code.bin`) |

Dazu Voreinstellungen und ein Einstellungscode (`RL1:…`) zum Teilen. Offsets je Spielversion stehen in `data/gen3_offsets.js`, `gen4_offsets.js`, `gen5_offsets.js` (erzeugt mit `tools/make_gen*_offsets.js` aus den ini-Dateien des UPR). Nicht enthalten: Start-Items der Starter, Freundschaftswert senken, zusätzliche Trainer-Pokémon, Starter in Gen 4/5, Roamer/Fossilien/Spezial-Statics, Anpassung von Texten (TM-Beschreibungen, Tausch-Spitznamen, Dialoge) und die UPR-Patches (z. B. Gehorsam von Mew/Deoxys).

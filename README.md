# Rattata Lab

Damage Calculator, Teambuilder, Shiny-Zähler und Kampfprotokoll für **Pokémon Champions** (VGC 2026, Level 50, Stat Points, Reg M-C). Früher „Champions Damage Calc“.

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
- Beim Start erscheint die Auswahl zwischen **Damage Calculator**, **Teambuilder**, **Soul Link**, **Nuzlocke**, **Shiny-Zähler**, **Kampfprotokoll** und **Team-Analyse** (Tasten `1` bis `7`). Das Logo oben links führt zurück zum Start, die Reiter daneben wechseln direkt.
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
- **Quoten** pro Spiel und Methode: Zufallsbegegnung/Soft Reset, Masuda, Zucht mit Shiny-Elternteil (Gen 2), Pokéradar, Angelkette, Kontaktsafari, Horden, SOS-Kette, Fangkombo mit Lockparfüm, Besiegt-Zähler (SwSh), Dyna-Raid-Abenteuer, Massenauftreten und Forschung (PLA), Massenauftreten und Sandwich (KP), eigene Quote. Näherungen sind mit „ca.“ markiert.
- **Statistik**: Wahrscheinlichkeit, bis jetzt ein Shiny gefunden zu haben, Vielfaches der Quote, Meilensteine (50/75/90/99 %) mit verbleibenden Begegnungen und geschätzter Zeit, Begegnungen heute und pro Stunde, Timer.
- **Phasen**: „Phase“ (anderes Shiny erschienen, optional in die Sammlung), „Entkommen“ (gesehen, nicht gefangen), letzte Phase rückgängig. „Gefunden!“ beendet den Hunt und trägt das Shiny mit Details in die Sammlung ein.
- **Sammlung**: alle Fänge mit Spitzname, Geschlecht, Wesen, Level, Ball, Fundort, Spiel, Methode, Begegnungen, Phasen, Datum, Notizen; manuell eintragen und bearbeiten. **Shiny-Dex** pro Generation mit Fortschritt (gefangen, gesehen, fehlt).
- **Globale Hotkeys** (Desktop-App, Standard `Strg+Alt+↑` zählen, `Strg+Alt+↓` zurück, `Strg+Alt+T` Timer, Phase frei belegbar): wirken auf alle Hunts mit Haken „Hotkeys zählen diesen Hunt“, auch wenn das Spiel im Vordergrund ist.
- **OBS** (Desktop-App): Browser-Quelle `http://127.0.0.1:39151/overlay` (Server nur lokal, fremde Hosts werden abgewiesen) mit Layout, Größe, Farben und Teilen zum Ein-/Ausblenden, Vorschau in der App. Layout **„Frei anordnen“**: Bühnengröße einstellbar, Sprite, Name, Zahl, Quote, Phase und Timer in der Vorschau mit der Maus verschieben, Mausrad = Größe je Teil, Pfeiltasten = genau verschieben. Die Vorschau ist das echte Overlay mit `edit=1` und meldet jede Änderung per `postMessage` an die App; die Anordnung (`overlay.free` in `cc_shiny`) geht über `/state` live an OBS, die Adresse bleibt `…/overlay?layout=free`. Dazu Textdateien im Ordner `OBS` der App-Daten (`zaehler.txt`, `gesamt.txt`, `phase.txt`, `quote.txt`, `chance.txt`, `timer.txt`, `pokemon.txt`, `methode.txt`, `spiel.txt`).
- **Automatische Erkennung – ALPHA**: Bildschirm/Fenster oder Kamera/Capture-Karte aufnehmen, im Bild einen Bereich markieren, eine oder mehrere Referenzen aufnehmen, während die Begegnung zu sehen ist. Vergleich in Graustufen (Korrelation + mittlere Abweichung), Zustandsmaschine mit Treffern in Folge, Sperre und Pause gegen Doppelzählungen, „Ruhewert messen“ für die Schwelle, „Nur testen“ ohne Zählen. Läuft lokal, auch im Hintergrund. Kameras und Capture-Karten werden in Full HD geöffnet.
  - **Text suchen** (nur Windows-App): statt eines Bildvergleichs liest die in Windows eingebaute Texterkennung (`Windows.Media.Ocr`, über `electron/ocr.js` + `electron/ocr.ps1`, bis zu 5 Bilder/s) den Text im Rahmen und zählt, sobald der gesuchte Name darin steht. Leer = Name des Hunts, mehrere Varianten mit Komma. Unscharfer Vergleich gegen 1–3 benachbarte Wörter: ein falsch gelesener Buchstabe stört nicht, „Abra“ zählt aber nicht bei „Kadabra“. Braucht eine installierte Windows-Sprache mit Texterkennung (bei deutschem oder englischem Windows vorhanden).
- Gespeichert unter `cc_shiny` (Hunts, Sammlung, Hotkeys, Overlay).
## Team-Analyse
Eigener Modus (`js/match.js`, Auswertung `js/match_parse.js`, Taste `7`). Ein Team aus dem **Teambuilder** ist ein Bericht: alle Spiele mit diesen Pokémon stehen zusammen (kein PokéPaste). Showdown-Namen oben helfen, die eigene Seite zu erkennen; ohne Namen reicht es, wenn die Pokémon des Teams im Replay vorkommen. Ein neues Spiel wird dem Team zugeordnet, auf das die eigenen Pokémon am besten passen (mindestens zwei).
- **Replays:** Links von `replay.pokemonshowdown.com` einfügen (ein Link pro Zeile, auch `.json` oder `.log`). Der Browser lädt `https://replay.pokemonshowdown.com/<id>.json` direkt. Showdown setzt `Access-Control-Allow-Origin: *`, deshalb klappt das in der normalen Seite und in der Desktop-App ohne Proxy. Private Replays oder ein blockierter Abruf: das JSON oder den Log-Text ins selbe Feld einfügen.
- Pro Spiel: Sieg oder Niederlage, die sechs des Gegners (Teamvorschau), Leads und Back beider Seiten (die vier Eingesetzten, Leads sind das, was vor Runde 1 auf dem Feld steht), Mega (`|-mega|`) und Tera (`|-terastallize|`), offen oder geschlossen (Item in der Vorschauzeile = offen), Elo aus der Spielerzeile und der Wertungszeile am Ende.
- **Serien:** aufeinanderfolgende Spiele gegen denselben Gegner, bis eine Seite zwei Siege hat oder drei Spiele gespielt sind. Mehr als sechs Stunden Abstand trennt. Am Spiel stehen „Neue Serie davor“ und „Eigenes Spiel (Bo1)“.
- **Nutzung** je Pokémon des Teams: dabei, Siege, Siegquote, Anteil an allen Spielen, Lead-Quote, Mega- und Tera-Quote, dazu Lead-Paare und die Siegquote bei offenem und geschlossenem Team Sheet.
- **Matchups** gegen gegnerische Pokémon (im Team, eingesetzt, eigene Siege, Einsatzquote). Beste und schwächste Listen ab vier Einsätzen.
- **Attacken:** wie oft jede Attacke der eigenen Pokémon vorkam. Attacken aus dem Teambuilder-Set stehen auch bei null.
- **Filter** in der Spieleliste: Ergebnis, Gegner im Team, Gegner-Lead, Gegner-Back, eigenes Lead, eigenes Back, selbst eingesetzt, Mega oder Tera, Team Sheet, Mindest-Elo des Gegners. Die Statistik darüber zählt alle Spiele mit Sieger, der Filter nur die Liste.
- **Prüfen:** doppelte Links (werden nicht zweimal übernommen), ungültige Adressen, fehlgeschlagene Abrufe, Spiele ohne erkennbare Seite oder ohne Sieger.
- **Kampfprotokolle:** „Kampfprotokolle“ liest `cc_battlelog.logs` (dasselbe Objekt wie der JSON-Export, `schema: 1`, `game: "champions"`). Im Kampfprotokoll legt „In Team-Analyse“ das offene Protokoll direkt ab und öffnet das passende Team. Übernommen werden Ergebnis (`winner` `you`/`foe`), Namen, gesehenes Team (`party`, englische Champions-Namen), Leads (`events` mit `kind` `send` oder `switch` und `lead: true`, sonst alles vor der ersten `turn`-Zeile, zwei im Doppel und eins im Einzel) und Attacken (`kind: "move"`). Das Protokoll kennt das Team von sechs, Elo und offen/geschlossen nicht. Mega und Tera nur, wenn am Pokémon `mega`/`tera` steht oder `events[].raw` eine Showdown-Zeile `|-mega|` / `|-terastallize|` ist. Ein schon übernommenes Protokoll wird beim nächsten Lesen aktualisiert, die Team-Zuordnung bleibt.
- Der Bericht ist eine Tabelle: sechs Pokémon und Bilanz oben, Replay-Einträge, Nutzung (dabei, Siege, Quote, Anteil, Mega/Tera), Lead-Paare, Matchups, Attacken, Spiel für Spiel mit Filter, Serie für Serie. Siegquoten sind grün, gelb oder rot. Gespeichert unter `cc_match`, jedes Spiel mit `teamId`. „Sichern“ / „Datei laden“ schreibt `{ kind: "rattata-match", v: 2 }`. „Beispiel laden“ legt fünf Spiele an das gerade gewählte Team.
- Die Idee, aus Replay-Links diese Auswertungen zu bauen, stammt vom PALKIA Academy Showdown Reporting Spreadsheet v7.0 (PASRS, Bauerdad und v0Lt). Übernommen ist davon nichts außer der Fragestellung.

## Kampfprotokoll (Alpha)
Eigener Modus für **Pokémon Champions** (`js/battlelog.js`), nicht für wilde Begegnungen oder den Nationaldex. Die Spielaufzeichnung (Bildschirm, Fenster oder Kamera/Capture-Karte) kommt aus `js/capture.js`, derselben Stelle wie die automatische Erkennung des Shiny-Zählers. Die Windows-Texterkennung (`electron/ocr.js`) liest die Kampfzeile. Neue Kämpfe starten als Doppel, Einzel lässt sich umschalten. Erkannt werden nur Arten und Attacken aus dem Champions-Dex des Rechners.

Die Zeile ist **weiße Schrift mit dunkler Kontur direkt auf dem animierten Hintergrund**, ohne Kasten, links unten. `js/textprep.js` hebt genau diese Pixel hervor (hell, fast grau, mit deutlich dunklerer Nachbarschaft), wirft Lichter über der Zeile weg und vergrößert sie. „Untere Zeile“ setzt den Rahmen auf diese Fläche. Gemessen an `test/fixtures/champions_sendout.png` (echtes Einwechsel-Bild, 2991×1439): die Glyphen liegen etwa bei x 0,18–0,47 und y 0,74–0,77, der Rahmen ist `x 0,02 / y 0,66 / w 0,58 / h 0,20`. Der Wortlaut dort ist `Jake716 sent out Rillaboom and Sneasler!`.

Geprüft an diesem Bild: die aufbereitete Schrift liest Tesseract als `Jake7 16 sent out Rillaboom and Sneasler!` (die Ziffern reißt es auseinander; der Parser zieht sie wieder zu `Jake716` zusammen) und legt Rillaboom und Sneasler als Einwechslung des Gegners ab. **Windows-OCR selbst lief hier nicht**, die gibt es nur in der Windows-App. Unter der Vorschau steht jedes gelesene Bild im Rohtext, mit der Einordnung der Zeile, und lässt sich kopieren.
- **Live**: „Mitschneiden“ legt den Rahmen auf die untere Zeile, wenn noch keiner da ist. Dazu die KP-Leisten (im Doppel je eine pro Pokémon, die ganze Leiste inklusive Zahl und leerem Teil). Der Verlauf wächst mit, sobald sich der Text ändert. Ist das Textfeld leer und danach steht dieselbe einzelne Zeile wieder da, zählt sie erneut. Ein kurzes Leeren spielt nicht den ganzen sichtbaren Text noch einmal ab. „Mitschneiden stoppen“ beendet den Kampf nicht. Ein anderes Protokoll öffnen pausiert das Mitschneiden. Löschen trennt die Quelle. „Neuer Kampf“ beendet das laufende Protokoll und schreibt im neuen weiter, die Quelle bleibt.
- **Was zuverlässig ist**, wenn die Zeile ein bekanntes Muster trifft und Art sowie Attacke exakt im Champions-Dex stehen: Kampfbeginn, Einwechseln, Wechsel nach „komm zurück“, Attacke, Wirksamkeit, Volltreffer, Daneben, K.O., Sieg, und die Prozentzahl, die Champions auf die KP-Leiste schreibt. „Was soll … tun?“ setzt die nächste Runde. Am echten Bild bestätigt ist der englische Einwechsel `<Trainer> sent out <A> and <B>!`. Deutsch und die übrigen englischen Sätze folgen dem Wortlaut der Trainerkämpfe, den Champions weiter anzeigt; sie standen nicht auf diesem Bild.
- **Was eine Schätzung ist**: die Farbe der KP-Leiste, wenn die Zahl nicht lesbar ist; eine Runde ohne Ansage (im Doppel nach vier Aktionen, im Einzel nach zwei); unscharf gelesene Namen; Zeilen ohne Muster; ein Sieger nur daraus, dass eine Seite keine bekannten Pokémon mehr hat. „Turn“/„Runde“ und „verlor N %“ werden mitgelesen, sind aber keine bestätigte Champions-Anzeige. Solche Zeilen sind mit „geschätzt“ markiert.
- Zeilen lassen sich von Hand nachtragen, wenn die Erkennung eine auslässt. „Beispielkampf“ spielt einen festen Champions-Doppelkampf ab, ohne Aufnahme.
- **Speichern** liegt in `cc_battlelog` (`localStorage`, in der Desktop-App die App-Daten). **Text** und **JSON** laden eine Datei herunter. Alte Protokolle stehen links. Das JSON ist dasselbe Objekt wie ein Eintrag in `cc_battlelog.logs` (`schema: 1`, `game: "champions"`), plus `generator` und `limits`. `format` ist `"doubles"` oder `"singles"`, `winner` ist `"you"`, `"foe"` oder `null`, `winnerHow` ist `"text"`, `"inferred"` oder `null`. `active` speichert nur die Ids, `party` die Pokémon (`species` ist der englische Champions-Name, `name` der gelesene Text). `events[].kind` ist `start`, `turn`, `send`, `switch`, `move`, `effect`, `crit`, `miss`, `status`, `damage`, `heal`, `hp`, `faint`, `win`, `end`, `note`, `field` oder `mega`. `move` ist der englische Attackenname, `reliable` sagt, ob das Muster exakt getroffen hat. Ein anderes Werkzeug kann diese Logs lesen, ohne `battlelog.js` zu laden.
- **Im Rechner** an einer Attacke öffnet den Damage Calculator mit Angreifer, Verteidiger, Attacke, KP-Stand, Volltreffer und Einzel/Doppel. Im Doppel nur, wenn genau ein Ziel übrig ist. Wesen, Werte und Item bleiben die Standardwerte, das echte Set kennt das Protokoll nicht. **In Team-Analyse** übernimmt das offene Protokoll dorthin.
- Texterkennung gibt es nur in der Windows-App. Im Browser gehen die Farbe der KP-Leiste, das Beispiel, Nachtragen und der Export.
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
- **Beim Öffnen der App**: Startbildschirm, Damage Calculator, Teambuilder, Soul Link, Nuzlocke, Shiny-Zähler, Kampfprotokoll oder Team-Analyse
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
- `js/battlelog.js`, `js/capture.js`, `js/textprep.js`: Kampfprotokoll (live aus der Spielaufzeichnung)
- `js/match_parse.js`, `js/match.js`: Team-Analyse (ein Teambuilder-Team, alle Replays und Kampfprotokolle)
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

Nuzlocke-Daten (`data/natdex.js` mit allen Pokémon, `data/gen3_names.js` mit Attacken und Fähigkeiten der 3. Generation, `data/nds_names.js` mit Attacken, Fähigkeiten und Items der 4./5. Generation): `pokedex.json` von Showdown sowie `pokemon_species_names.csv`, `move_names.csv`, `ability_names.csv`, `item_names.csv` und `item_game_indices.csv` aus `PokeAPI/pokeapi` (`data/v2/csv/`) in einen Ordner laden, dann `python tools/build_nuz.py <ordner> data`.

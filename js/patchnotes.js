// Patchnotes: nach einem Update zeigt die App beim ersten Start einmal ein Popup mit den Neuerungen seit der zuletzt gesehenen Version.
// Die zuletzt gesehene Version steht in localStorage "cc_lastver". Ohne gemerkte Version (erstes Update auf eine Version mit Patchnotes) zeigt es nur den aktuellen Eintrag.
// Neue Version: oben in NOTES eintragen (Version, de, en). Wer auf „Vollversionen“ steht, sieht nur die x.y.0-Einträge (kein Zwischenstand);
// ein x.y.0-Eintrag kann dafür ein eigenes `full: { de, en }` mit allen Änderungen seit der vorigen Vollversion tragen. Aufruf von Hand: window.RLPatchnotes.show().
(function () {
  'use strict';
  var A = window.CC;
  if (!A) return;
  var el = A.el, de = A.LANG === 'de';
  var KEY = 'cc_lastver', MAX = 40;
  var NOTES = [
    { v: '2.1.4',
      de: [
        'Matchlog & Team-Analyse (Team-Versionen): Im Matchlog wählst du neben dem Team jetzt auch die konkrete Teambuilder-Version (v1, v2, …). Gespeicherte Logs werden im Archiv sauber nach Team und Version gruppiert und direkt mit ihrer Versions-ID in die Team-Analyse übernommen.',
        'Team-Analyse: Bei Teams mit mehreren Versionen gibt es neben dem Team-Dropdown jetzt einen Versions-Filter („Alle Versionen“ oder einzelne Version), der Spiele, Team-Pokémon und Movesets exakt auf die gewählte Version abstimmt.',
        'Matchlog: Einklappbare Schritt-für-Schritt-Anleitung (DE/EN) direkt oben in der Ansicht, die genau erklärt, welche Knöpfe in welcher Reihenfolge genutzt werden.'
      ],
      en: [
        'Matchlog & Team Analysis (team versions): in Matchlog you can now pick the exact Teambuilder version (v1, v2, …) next to the team. Saved logs are grouped by team and version in the archive and imported into Team Analysis with their version ID.',
        'Team Analysis: for teams with multiple versions, a new version filter (“All versions” or a specific version) next to the team dropdown scopes matches, team Pokémon, and movesets to that exact version.',
        'Matchlog: collapsible step-by-step guide (DE/EN) at the top of the view explaining each button and workflow step.'
      ] },
    { v: '2.1.3',
      de: [
        'Matchlog (KI-Keyframes & Antigravity): Sammelt während des Spiels leichtgewichtig Keyframes ohne OCR-Last und erstellt nach „Aufnahme stoppen“ automatisch über die lokale Antigravity CLI (oder optional über die Gemini API / Google AI Pro Export) ein vollständiges Showdown-Replay-Log inkl. aller 6 Gegner-Icons aus der Team-Preview.',
        'Matchlog ↔ Teambuilder & Team-Analyse: Jedes Matchlog wird direkt über ein Dropdown mit deiner Teambuilder-Team-ID verknüpft, automatisch in die Team-Analyse übernommen und platzsparend (nur als Text-Log, ohne Videos/Frames) nach Team gruppiert im Matchlog-Archiv gespeichert. Das Video wird nur noch auf Klick über „Video behalten“ gesichert.',
        'Matchlog-Kern verbessert: Vollständige 0–9 Ziffernvorlagen für Gegner-KP-Prozente, saubere Erkennung von Tailwind-Ende und Spread-Move-Treffern, direkte Game-Projector-Verknüpfung sowie Showdown-Log-Export.'
      ],
      en: [
        'Matchlog (AI keyframes & Antigravity): collects lightweight keyframes during play without OCR lag and automatically builds a complete Showdown replay log via the local Antigravity CLI on “Stop recording” (or optionally via Gemini API / Google AI Pro export), including all 6 opponent Team Preview icons.',
        'Matchlog ↔ Teambuilder & Team Analysis: each matchlog links directly to your Teambuilder team ID via dropdown, imports straight into Team Analysis, and stores only compact text logs (no videos or frames) grouped by team in the Matchlog archive. Recorded video is only kept when clicking “Keep video”.',
        'Matchlog core improvements: complete 0–9 digit templates for opponent HP percentages, accurate Tailwind end and spread-move hit tracking, direct Game Projector shortcut, and Showdown replay log export.'
      ] },
    { v: '2.1.2',
      de: [
        'Damage Calculator: Gegen NCP-Quellcode, die Champions-Mechanik von @smogon/calc und den Showdown-Champions-Mod geprüft (30.000 Zufallsfälle). Neu: Forecast, Mimicry, Klutz und Feld-Samen wie bei NCP, Intimidate/Trace/Supersweet Syrup wirken automatisch (abschaltbar), Protect-Schalter mit ¼ Schaden für Piercing Drill/Unseen Fist. Korrigiert: Mega Sol (Wasser wie in der Sonne), Sharpness als Stärke-Bonus, Crush Claw mit Sheer Force, Dragon Darts 2 Treffer gegen ein Ziel, Fling mit Klutz, Meteor Beam/Electro Shot mit Simple. Hinweis: Wer Intimidate bisher als −1 eingetragen hat, bitte den Wert entfernen.',
        'Save-Editor: Gegen PKHeX.Core mit 600 legalen Pokémon aus allen Generationen geprüft (Lesen, Speichern, Bearbeiten). Korrigiert: leere Team-/Box-Plätze in Gen 4–7 werden wie im Spiel verschlüsselt geschrieben (kein „Bad Egg“ mehr nach dem Löschen), Leerzeichen und Apostrophe in Gen-3/4-Namen bleiben erhalten (FARFETCH’D), Gen-4-Fundort nutzt das Pt/HGSS-Feld wie PKHeX, Gen-1/2-Spielstände mit Emulator-Anhang (BGB, mGBA, Virtual Console) werden erkannt.',
        'Randomizer: In Gen 6/7 werden jetzt alle Gebiete mit wilden Pokémon randomisiert – Einträge dürfen wie beim UPR in den Füllplatz des Archivs wachsen (vorher blieben z. B. in Ultramond 22 Gebiete unverändert).'
      ],
      en: [
        'Damage calculator: checked against the NCP source, the Champions mechanics of @smogon/calc and the Showdown Champions mod (30,000 random cases). New: Forecast, Mimicry, Klutz and terrain seeds like NCP, Intimidate/Trace/Supersweet Syrup apply automatically (can be turned off), Protect toggle with ¼ damage for Piercing Drill/Unseen Fist. Fixed: Mega Sol (Water as in sun), Sharpness as a power boost, Crush Claw with Sheer Force, Dragon Darts hits twice against one target, Fling with Klutz, Meteor Beam/Electro Shot with Simple. Note: if you entered Intimidate as −1 manually, please remove it.',
        'Save editor: checked against PKHeX.Core with 600 legal Pokémon from every generation (read, save, edit). Fixed: empty party/box slots in Gen 4–7 are written encrypted like the game does (no more Bad Egg after deleting), spaces and apostrophes in Gen 3/4 names are kept (FARFETCH’D), Gen 4 met location uses the Pt/HGSS field like PKHeX, Gen 1/2 saves with emulator footers (BGB, mGBA, Virtual Console) are recognized.',
        'Randomizer: Gen 6/7 now randomizes every wild encounter area – entries may grow into the archive padding like UPR (previously e.g. 22 areas in Ultra Moon stayed unchanged).'
      ] },
    { v: '2.1.1',
      de: [
        'Damage Calculator (NCP-Parität): Dual-Typ-Boost-Items (Seelentau, Orbs) wirken jetzt korrekt, Technician prüft vor Aura/Power Spot/Steely Spirit/Battery, Hard Press/Crush Grip/Wring Out haben min. 1 BP, Meteor Beam/Electro Shot gegen Unaware, Parental Bond schließt Explosion/Fling im Einzel aus, Analytic beachtet Bizarroraum, Sturdy beachtet Ability Shield und Fähigkeiten-ignorierende Attacken, Heavy-Duty Boots und OHKO-Residual-Hinweise ergänzt, plus Gen-3/4/5-Fixes im Nuzlocke-Rechner (FRLG-Orden, Gen-5-Simple, Slow Start, Brick Break/Infiltrator).',
        'Save-Editor (PKHeX-Parität): Team lässt sich nicht mehr auf 0 Pokémon leeren, Showdown-Import prüft Generationsgrenzen und nutzt in Gen 3 die richtige Item-Tabelle sowie echte Basis-AP und IV 31, Gen 1/2 „Box leeren“ löscht alle Plätze, Gen-3-Ball überschreibt das OT-Geschlecht nicht mehr, Gen-5-Legalität erlaubt PID-unabhängige Wesen, Gen-6/7-Statusheilung und PK7-Fähigkeitsmaske korrigiert, Gen-3-Ruhmeshalle filtert leere Flash-Sektoren und Formwechsel/„Legal machen“ aktualisieren Werte und Fähigkeiten.',
        'Randomizer (UPR-Parität): Gen-6-Statics + Level-Skalierung stürzen nicht mehr ab, Rivalen-Trainer-IDs sind sauber nach Spielen getrennt, Gen-4-Rivale nutzt die neuen Starter, Gen-2-Insektenturnier skaliert auch Max-Level, Smaragd-Attackenlehrer funktionieren in allen Sprachen, TM/Lehrer-Kompatibilität nutzt zufällige Typen statt der alten, 3DS-ExeFS-Alignment (0x1000) korrigiert und wirkungslose Optionen ausgeblendet.'
      ],
      en: [
        'Damage calculator (NCP parity): dual-type boost items (Soul Dew, orbs) now work properly, Technician checks before Aura/Power Spot/Steely Spirit/Battery, Hard Press/Crush Grip/Wring Out have min 1 BP, Meteor Beam/Electro Shot vs. Unaware, Parental Bond excludes Explosion/Fling in singles, Analytic respects Trick Room, Sturdy respects Ability Shield and ability-ignoring moves, Heavy-Duty Boots and OHKO residual causes added, plus Gen 3/4/5 Nuzlocke calc fixes (FRLG badges, Gen 5 Simple, Slow Start, Brick Break/Infiltrator).',
        'Save editor (PKHeX parity): party can no longer be emptied to 0 Pokémon, Showdown import enforces generation ID limits and uses Gen 3 item table, real base PP and default 31 IVs, Gen 1/2 “Clear box” deletes all slots, Gen 3 Poké Ball no longer overwrites OT gender, Gen 5 legality allows PID-independent natures, Gen 6/7 status cure and PK7 abilityNum mask fixed, Gen 3 Hall of Fame ignores uninitialized flash sectors, and form changes / “Make legal” refresh stats and abilities.',
        'Randomizer (UPR parity): Gen 6 statics + level scaling no longer crash, rival trainer IDs are separated per game, Gen 4 rival uses the new starters, Gen 2 Bug-Catching Contest scales max level too, Emerald move tutors work for all languages, TM/tutor compatibility uses randomized types instead of old ones, 3DS ExeFS alignment (0x1000) fixed, and no-op UI options hidden.'
      ] },
    { v: '2.1.0',
      de: [
        'Save-Editor: Gen-2-KP an der richtigen Stelle (Item und Attacke 1 bleiben erhalten), aktuelle Box aus CurrentBox geladen und gespeichert, Sp.-Verteidigung getrennt berechnet und Box-zu-Team-Wechsel mit korrektem Level und vollen KP.',
        'Save-Editor: MemeCrypto-Signatur für Sonne/Mond und Ultrasonne/Ultramond beim Speichern neu berechnet, eigene Basiswerte für Formen (Deoxys, Giratina, Rotom, Alola-Formen usw.), deterministische Shiny+Wesen-Suche (Gen 3/4), PKHeX-kompatible .pk1/.pk2-Dateien, Gen-3-Ei-Flags, HGSS-Ball, Freundschaft bei getauschten Pokémon und korrekte Grenzen für EVs, Geld und AP.',
        'Damage Calculator: Fokusgurt und Robustheit werden von Mehrfachtreffern und Parental Bond gebrochen (Mold Breaker ignoriert Robustheit), Streuschaden-Abzug (×0,75) gilt bei Partner-treffenden Attacken wie Earthquake und Surf auch bei nur einem Gegner, Toxin steigt jede Runde (1/16, 2/16 …) und Poison Heal heilt, dazu Merciless, Unburden-Schalter, Metronome ×2,0, Weather Ball mit Utility Umbrella, Thousand Arrows gegen Levitate/Flug und Gen-3/4/5-Fixes im Nuzlocke-Rechner.',
        'Randomizer: Pokémon Gelb und 512-KB-ROMs werden geladen, Gen-3-Basiswert-Updates und Generationen-Filter nutzen die Nationaldex-Nummer, Attacken-Update auf Gen 4 greift in Gen 3, Trainer-Items und „ab Level voll entwickelt“ wirken auch ohne Trainer-Mischen, FRLG-Starter-Skript und komprimiertes HGSS-arm9 (TMs, Shops, versteckte Items) werden gepatcht, VM-Kompatibilität und Nincada→Shedinja bleiben erhalten und Z-Attacken sowie falsche Fähigkeiten-Pools (Gen 3, X/Y, Sonne/Mond) sind ausgeschlossen.'
      ],
      en: [
        'Save editor: Gen 2 HP at the right offset (held item and move 1 are preserved), active box read from and written to CurrentBox, Sp. Def calculated separately, and moving a Pokémon from a box to the party keeps its level and full HP.',
        'Save editor: MemeCrypto signature re-signed when saving Sun/Moon and Ultra Sun/Ultra Moon, form-specific base stats (Deoxys, Giratina, Rotom, Alolan forms, etc.), deterministic Shiny + Nature search (Gen 3/4), PKHeX-compatible .pk1/.pk2 files, Gen 3 Egg flags, HGSS Poké Ball byte, traded Pokémon friendship, and proper limits for EVs, money and PP.',
        'Damage calculator: Focus Sash and Sturdy are broken by multi-hit moves and Parental Bond (Mold Breaker ignores Sturdy), spread penalty (×0.75) applies to ally-hitting moves like Earthquake and Surf even with one foe left, Badly Poisoned damage scales each turn (1/16, 2/16 …) and Poison Heal heals, plus Merciless, Unburden toggle, Metronome ×2.0, Weather Ball with Utility Umbrella, Thousand Arrows against Levitate/Flying, and Gen 3/4/5 fixes in the Nuzlocke calculator.',
        'Randomizer: Pokémon Yellow and 512 KB ROMs load properly, Gen 3 base stat updates and generation filters use National Dex numbers, Gen 4 move updates apply to Gen 3, trainer items and “fully evolved at level” work even with unchanged trainers, FRLG starter script and compressed HGSS arm9 (TMs, shops, hidden items) are patched, HM compatibility and Nincada→Shedinja are preserved, and Z-Moves as well as invalid ability pools (Gen 3, X/Y, Sun/Moon) are excluded.'
      ] },
    { v: '2.0.0',
      de: ['Rattata Labs 2.0: Alle Neuerungen aus 1.36.1 und 1.36.2 sind jetzt eine Vollversion.'],
      en: ['Rattata Labs 2.0: everything from 1.36.1 and 1.36.2 is now a full release.'],
      full: {
        de: [
          'Damage Calculator: Der Rechenkern rechnet jetzt wie der NCP VGC Damage Calculator: Reihenfolge und Rundung der Modifikatoren, Wetter, viele Fähigkeiten und Immunitäten. Mehrfachtreffer werden Treffer für Treffer gerechnet, die KO-Chance zeigt 2 Nachkommastellen.',
          'Teambuilder: Versionen wählst du in einem Dropdown. Daneben liegen Typ-Abdeckung, „Versionen vergleichen“ (rot entfernt, grün neu, gelb geändert) und der Regel-Check (Species- und Item-Klausel, erlaubte Pokémon und Items, Fähigkeiten, Lernsets, SP). Ein Klick auf ein Pokémon dort öffnet es im Editor.',
          'Teambuilder: „Teilen“ erzeugt einen QR-Code mit Team und Teamname und lädt das Team auf PokéPaste hoch, wahlweise eine Version oder alle. „QR importieren“ liest den Code aus einem Bild (auf Android auch per Kamera).',
          'Shiny-Zähler: Bei „Gefunden!“ gehen Screenshot und Clip auf Wunsch in einen Discord-Kanal (Webhook, unter „Hotkeys & OBS“).',
          'Einstellungen: Animationen, Schriftart und Schriftgröße, Sprite-Stil je Werkzeug und ein neuer Bereich „Tastenkürzel“ zum freien Belegen. Die Standardwerte entsprechen dem bisherigen Verhalten.'
        ],
        en: [
          'Damage calculator: the calculation now matches the NCP VGC Damage Calculator: order and rounding of modifiers, weather, many abilities and immunities. Multi-hit moves are calculated hit by hit, the KO chance shows 2 decimals.',
          'Team builder: versions are picked from a dropdown. Next to it are type coverage, “Compare versions” (red removed, green new, yellow changed) and the rule check (species and item clause, allowed Pokémon and items, abilities, learnsets, SP). Clicking a Pokémon there opens it in the editor.',
          'Team builder: “Share” creates a QR code with the team and its name and uploads the team to PokéPaste, one version or all of them. “Import QR” reads the code from an image (on Android also with the camera).',
          'Shiny counter: on “Found!” the screenshot and clip can go to a Discord channel (webhook, under “Hotkeys & OBS”).',
          'Settings: animations, font and text size, sprite style per tool and a new “Shortcuts” section to assign keys freely. The defaults match the previous behaviour.'
        ]
      } },
    { v: '1.36.2',
      de: ['Damage Calculator: Der Rechenkern rechnet jetzt wie der NCP VGC Damage Calculator: Reihenfolge und Rundung der Modifikatoren, Wetter (Utility Umbrella, Harsh Sun, Heavy Rain, Strong Winds), viele Fähigkeiten (Sharpness, Huge Power bei Body Press, Mold Breaker, Flare/Toxic Boost, Heavy/Light Metal, Unburden, Steely Spirit, Analytic) und Immunitäten (Psycho-Feld gegen Vorrang, Queenly Majesty, Armor Tail, Damp, Sturdy gegen OHKO).',
        'Damage Calculator: Mehrfachtreffer werden Treffer für Treffer gerechnet (Parental Bond, Resist-Beere und Multiscale nur beim ersten Treffer, Stamina und Weak Armor pro Treffer). Die KO-Chance kombiniert die Treffer unabhängig und zeigt 2 Nachkommastellen. Knock Off wird gegen einen eigenen Mega-Stein nicht mehr verstärkt.',
        'Teambuilder: Ein Klick auf ein Pokémon in der Typ-Abdeckung oder im Versionsvergleich öffnet es im Editor. Ein Klick auf die Karten oben schließt die Ansicht.',
        'Teambuilder: Beim Teilen wählst du die aktive Version, eine andere oder alle Versionen. QR-Code und PokéPaste tragen dann alle Versionen, und der Import legt sie wieder als Versionen an.'],
      en: ['Damage calculator: the calculation now matches the NCP VGC Damage Calculator: order and rounding of modifiers, weather (Utility Umbrella, Harsh Sun, Heavy Rain, Strong Winds), many abilities (Sharpness, Huge Power with Body Press, Mold Breaker, Flare/Toxic Boost, Heavy/Light Metal, Unburden, Steely Spirit, Analytic) and immunities (Psychic Terrain against priority, Queenly Majesty, Armor Tail, Damp, Sturdy against OHKO).',
        'Damage calculator: multi-hit moves are calculated hit by hit (Parental Bond, resist berries and Multiscale only on the first hit, Stamina and Weak Armor per hit). The KO chance combines the hits independently and shows 2 decimals. Knock Off is no longer boosted against the target’s own Mega Stone.',
        'Team builder: clicking a Pokémon in type coverage or the version comparison opens it in the editor. Clicking the cards at the top closes the view.',
        'Team builder: when sharing you pick the active version, another one or all versions. The QR code and PokéPaste then carry every version, and importing creates them as versions again.'] },
    { v: '1.36.1',
      de: ['Teambuilder: Die Versionen wählst du jetzt in einem Dropdown. Daneben liegen Typ-Abdeckung, „Versionen vergleichen“ (Unterschiede zweier Versionen farbig: rot entfernt, grün neu, gelb geändert) und der Regel-Check (Species- und Item-Klausel, erlaubte Pokémon und Items, Fähigkeiten, Lernsets, SP).',
        'Teambuilder: „Teilen“ erzeugt einen QR-Code mit Team und Teamname und lädt das Team mit einem Klick auf PokéPaste hoch. „QR importieren“ liest einen QR-Code aus einem Bild (wählen, einfügen oder hineinziehen, auf Android auch per Kamera).',
        'Shiny-Zähler: Unter „Hotkeys & OBS“ lässt sich ein Discord-Kanal (Webhook) festlegen. Bei „Gefunden!“ gehen Screenshot und, falls aufgenommen, der Clip dorthin.',
        'Einstellungen: Animationen, Schriftart und Schriftgröße, Sprite-Stil getrennt für Teambuilder, Damage Calculator, Pokédex und Match-Overlay sowie ein neuer Bereich „Tastenkürzel“ zum freien Belegen. Die Standardwerte entsprechen dem bisherigen Verhalten.'],
      en: ['Team builder: versions are now picked from a dropdown. Next to it are type coverage, “Compare versions” (differences between two versions in colour: red removed, green new, yellow changed) and the rule check (species and item clause, allowed Pokémon and items, abilities, learnsets, SP).',
        'Team builder: “Share” creates a QR code with the team and its name and uploads the team to PokéPaste with one click. “Import QR” reads a QR code from an image (choose, paste or drop it, on Android also with the camera).',
        'Shiny counter: under “Hotkeys & OBS” you can set a Discord channel (webhook). On “Found!” the screenshot and, if recorded, the clip are sent there.',
        'Settings: animations, font and text size, sprite style per tool (team builder, damage calculator, Pokédex, match overlay) and a new “Shortcuts” section to assign keys freely. The defaults match the previous behaviour.'] },
    { v: '1.36.0',
      de: ['Weniger Speicher und CPU: Die Vorschau im Game Projector pausiert, solange die Ansicht nicht offen ist. Die Verbindung zur Capture-Karte bleibt bestehen, Projektor, Matchlog und Clips laufen unverändert weiter.', 'Die Texterkennung von Matchlog und Shiny-Zähler gibt ihren Speicher nach 3 Minuten ohne Bilder frei und startet beim nächsten Bild von selbst wieder.', 'Pokédex und GO-Pokédex geben beim Verlassen ihren Speicher frei. Filter, Suche und Auswahl bleiben erhalten.', 'Die Pegelanzeige der Shiny-Clips zeichnet im Hintergrund nicht mehr ständig neu.'],
      en: ['Less memory and CPU: the Game Projector preview pauses while its view is not open. The capture card stays connected, and projector, Matchlog and clips keep running as before.', 'Text recognition for Matchlog and the shiny counter frees its memory after 3 minutes without frames and restarts by itself on the next frame.', 'The Pokédex and GO Pokédex free their memory when you leave them. Filters, search and selection are kept.', 'The shiny clip level meter no longer redraws constantly in the background.'] },
    { v: '1.35.0',
      de: ['Shiny-Clips: Zähler, Quote und Timer sind jetzt im Clip zu sehen, an derselben Stelle wie im Projektor (abschaltbar mit „Zähler im Clip“).', 'Shiny-Zähler: Bei „★ Gefunden!“ wird sofort ein Screenshot gemacht. Er erscheint zusammen mit dem Clip direkt im Fang-Dialog und in der Sammlung.', 'Fang-Dialog: Begegnungen und Spiel kommen automatisch aus dem Zähler, auch beim Eintragen aus der Sammlung. Der Ball wird aus einer Liste aller Bälle gewählt oder getippt, neu ist die Auswahl „Geschlechtslos“.'],
      en: ['Shiny clips: counter, odds and timer now show in the clip, in the same place as in the projector (can be turned off with “Counter in clip”).', 'Shiny counter: “★ Found!” takes a screenshot right away. It shows up together with the clip in the catch dialog and in the collection.', 'Catch dialog: encounters and game come from the counter automatically, also when adding from the collection. The ball is picked from a list of all balls or typed, and there is a new “Genderless” option.'] },
    { v: '1.34.0',
      de: ['Teambuilder: Der Export-Dialog kann jetzt auch importieren. Text kopieren oder einen anderen einfügen und direkt als neues Team, neue Version oder Ersatz für das aktuelle Team übernehmen.', 'Teambuilder: Neuer Tab „Pokémon Import/Export“ neben der Typ-Abdeckung. Damit lässt sich ein einzelnes Pokémon im Textformat (Showdown) kopieren, ersetzen oder neu hinzufügen.'],
      en: ['Team builder: the export dialog can now import as well. Copy the text, or paste another one and apply it as a new team, a new version or a replacement for the current team.', 'Team builder: new “Pokémon import/export” tab next to type coverage, to copy, replace or add a single Pokémon in text format (Showdown).'] },
    { v: '1.33.0',
      de: ['Match-Overlays und Teamsheet: Die Sprites weiterer Formen werden jetzt richtig angezeigt (Paldea-Tauros, Galar-Darmanitan, Ogerpon-Masken, Squawkabilly-Farben, Rockruff-Dusk, Maushold-Vierer, Pikachu-Mützen). Vorher erschien die Basis-Form.'],
      en: ['Match overlays and team sheet: sprites of more forms now show correctly (Paldean Tauros, Galarian Darmanitan, Ogerpon masks, Squawkabilly colors, Dusk Rockruff, Family of Four Maushold, Pikachu caps). Previously the base form appeared.'] },
    { v: '1.32.0',
      de: ['Aufnahme-Match-Overlay: Neuer Knopf „Disconnect all Sources“, der alle aktiven und gespeicherten Quellen-Verknüpfungen bei Shiny-Zähler, Matchlog und Projektor auf einmal trennt.'],
      en: ['Recording Match overlay: new “Disconnect all Sources” button that disconnects all active and saved source connections across Shiny Counter, Matchlog and Projector at once.'] },
    { v: '1.31.0',
      de: ['Shiny-Clips: Live-Pegelanzeige (Audio-Meter wie in OBS) für jede Tonquelle, damit man direkt sieht, ob Ton ankommt und wie stark der Regler ausschlägt.'],
      en: ['Shiny clips: live audio level meter (OBS-style) on each sound source so you can immediately see incoming audio and slider levels.'] },
    { v: '1.30.0',
      de: ['Projektor: Option „Quelle (nativ)“ entfernt – die Bildrate (10–60 Bilder/s) gilt nun direkt als Obergrenze für die Aufnahme.'],
      en: ['Projector: removed the “Source (native)” option — the frame rate (10–60 fps) now applies directly as the capture cap.'],
      full: {
        de: [
          'Game Projector: Umbenannt und wieder ein reiner Projektor ohne Matchlog; Option „Quelle (nativ)“ entfernt (10–60 Bilder/s gilt direkt).',
          'Matchlog (Alpha): Eigenes Werkzeug unter VGC mit ALPHA-Kennzeichnung, eigener Quellen-Auswahl, Turn-Erkennung über den gegnerischen Timer (07:00 = Turn 1) sowie Live- und Aufnahme-Analyse.',
          'Shiny-Clips: Multi-Audio-Quellen mit Lautstärke-Mixer und automatische Projektor-Verbindung.'
        ],
        en: [
          'Game Projector: renamed and restored to a pure projector without Matchlog; removed “Source (native)” (10–60 fps applies directly).',
          'Matchlog (Alpha): dedicated tool under VGC with an ALPHA badge, its own source picker, opponent-timer turn tracking (07:00 = Turn 1), and live/recorded match analysis.',
          'Shiny clips: multi-audio sources with volume mixer and automatic projector connection.'
        ]
      } },
    { v: '1.29.9',
      de: ['Game Projector: Umbenannt und wieder ein reiner Projektor ohne Matchlog.', 'Matchlog (Alpha): Eigenes Werkzeug unter VGC mit ALPHA-Kennzeichnung, eigener Quellen-Auswahl und Übernahme vom Game Projector.', 'Shiny-Clips: Multi-Audio-Quellen mit Lautstärke-Mixer und automatische Projektor-Verbindung.'],
      en: ['Game Projector: renamed and restored to a pure projector without Matchlog.', 'Matchlog (Alpha): dedicated tool under VGC with an ALPHA badge, its own source picker, and Game Projector fallback.', 'Shiny clips: multi-audio sources with volume mixer and automatic projector connection.'] },
    { v: '1.29.8',
      de: ['Matchlog (Test): Turn-Erkennung über den gegnerischen Timer (07:00 = Turn 1, neuer Turn erst bei Timer-Veränderung nach Kampf-Events), kein falsches Tailwind bei „petered out“ und verbesserte opposing-Erkennung.'],
      en: ['Matchlog (test): turn tracking via the opponent timer (07:00 = Turn 1, new turn only when the timer drops after battle events), ignores “tailwind petered out”, and improved opposing OCR matching.'] },
    { v: '1.29.7',
      de: ['Matchlog (Test): Menü-Szenen komplett entprellt (keine Turn-Sprünge mitten in Animationen), doppelte Moves pro Zug gefiltert, Phantom-0% ohne Prozentzeichen behoben und Video-Bitrate auf 2,5 Mbit/s reduziert.'],
      en: ['Matchlog (test): debounced all menu scenes (no mid-animation turn splits), filtered duplicate moves per turn, fixed phantom 0% reads without a percent sign, and lowered video bitrate to 2.5 Mbps.'] },
    { v: '1.29.6',
      de: ['Matchlog (Test): Schnelle Video-Aufnahme im Hintergrund (8 Mbit/s) mit gleichzeitiger 10-fps-Live-Auswertung auf Rohframes (sofortiges Log beim Stoppen) und gedrosselter KP-OCR während Kampfanimationen.'],
      en: ['Matchlog (test): fast background video recording (8 Mbps) with simultaneous 10 fps live analysis on raw frames (instant log on stop) and throttled HP OCR during battle animations.'] },
    { v: '1.29.5',
      de: ['Matchlog (Test): Neuer Aufnahme-Modus („Match aufnehmen“ → „Aufnahme stoppen & Log erstellen“ mit 12 fps Video-Auswertung und „Video speichern“), plus Fix für Mega Raichu X/Y über Team-Item, oppcsing-Typos und direkte battle→move_select-Turn-Wechsel.'],
      en: ['Matchlog (test): new record-and-analyze mode (“Record match” → “Stop & build log” at 12 fps with “Save video”), plus fixes for Mega Raichu X/Y via team item, oppcsing typos and direct battle→move_select turn transitions.'] },
    { v: '1.29.4',
      de: ['Matchlog (Test): Entprellte Zugwechsel (keine Turn-Sprünge mehr mitten in Animationen), sauberes Upgrade bei Teil-OCR (z. B. Trick -> Trick Room) und ohne doppelte Tailwind-/Trick-Room-Zeilen.'],
      en: ['Matchlog (test): debounced turn transitions (no mid-animation turn splits), prefix move upgrade (e.g. Trick -> Trick Room), and no duplicate Tailwind/Trick Room field lines.'] },
    { v: '1.29.3',
      de: ['Matchlog (Test): Kompaktes Protokoll-Format mit inline KP-Verläufen, Schutz/Immunität, Knock Off, Recoil, Schnee/Wetter, Switch-into und verbesserter Ziffern-/Side-Erkennung.'],
      en: ['Matchlog (test): compact log format with inline HP changes, protect/immunity, Knock Off, recoil, Snow/weather, switch-into and improved digit/side recognition.'] },
    { v: '1.29.2',
      de: ['Matchlog (Test): Bildabgriff direkt vom aktiven Projektor-Stream (inkl. Shiny-Projektor als Fallback) und korrigierter Electron-OCR-Worker für lokale Sprachdaten.'],
      en: ['Matchlog (test): captures frames directly from the active projector stream (including the Shiny projector as fallback) and fixes the Electron OCR worker for local tessdata files.'] },
    { v: '1.29.1',
      de: ['Matchlog (früher Test): Im Capture-Projektor „Matchlog lesen“ einschalten. Das Protokoll entsteht aus dem Bild, ohne das Kampf-Log im Spiel.', 'Bekannte Lücken: Gegnerteam nur über später gelesene Namen, Schaden und Mega des Gegners noch unzuverlässig, Forfeit/Sieg oft noch nicht erkannt.'],
      en: ['Matchlog (early test): in the capture projector turn on “Read Matchlog”. The log is built from the picture, without opening the in-game battle log.', 'Known gaps: the opponent team is only filled from names read later, damage and the opponent’s Mega are still unreliable, and forfeit/win is often missed.'] },
    { v: '1.29.0',
      de: ['Kämpfe: Das Feld passt ins Fenster, ohne die Seite zu scrollen.', 'Ziele, Mega, Wechsel, erzwungener Wechsel und Aufgabe lassen sich im Doppelkampf wirklich spielen. Das Protokoll ist deutsch.'],
      en: ['Battles: the field fits the window, and the page does not scroll.', 'Targets, Mega, switches, forced switches and forfeit work in doubles. The log is in German.'] },
    { v: '1.28.1',
      de: ['Kämpfe: Das Spielfeld nutzt wieder die vorbereitete Ansicht (beide Seiten gegenüber, KP-Kästen, Attackenfeld, Protokoll).', 'Die Kampfansicht ist durchgehend deutsch.'],
      en: ['Battles: the field uses the prepared view again (both sides facing each other, HP boxes, move panel, log).', 'The battle screen is entirely in German.'] },
    { v: '1.28.0',
      de: ['Neue Kategorie Kämpfe: lokal gegen die KI, ohne Pokémon-Showdown-Server.', 'Zufallskampf mit zwei legalen Reg-M-C-Teams aus dem Meta-Pool. Eigener Kampf: beide Teams aus dem Teambuilder, die KI optional auch mit einem Meta-Team. Stufen L0 bis L3.', 'Kampfansicht mit Teamvorschau, Attacken, Zielen, Wechsel, Mega, Protokoll und Aufgabe. Auf Android läuft der Simulator in der Desktop-App.'],
      en: ['New category Battles: fight the AI locally, with no Pokémon Showdown server.', 'Random battle uses two legal Reg M-C teams from the meta pool. Your battle: both teams come from the teambuilder, and the AI can also use a meta team. Levels L0 to L3.', 'Battle screen with team preview, moves, targets, switching, Mega, a log and forfeit. On Android the simulator runs in the desktop app.'] },
    { v: '1.27.0',
      de: [
        'Randomizer: Neues Design – ROM-Karte, große Ablagefläche mit Spieleübersicht, Optionen in Karten und Spalten ohne Scrollen, feste Fußleiste und einklappbares Protokoll.'
      ],
      en: [
        'Randomizer: new design – ROM card, large drop area with a game overview, options in cards and columns without scrolling, fixed footer and collapsible log.'
      ],
      full: {
        de: [
          'Randomizer: Neues Design ohne Scrollen; Eigene Starter für alle Generationen, Rivale und Freunde behalten ihren Starter (Gen 3-5), Nationaldex-Option und korrigierte Entwicklungen in Feuerrot/Blattgrün, Held-Items wilder Pokémon (Gen 4/5), Statics/Geschenke für X/Y und ORAS, Attacken-Lehrer in ORAS und Kristall, Feld-Items für Gen 1/2, Button „Im Nuzlocke-Rechner öffnen“.',
          'Save-Editor: Showdown-Text-Import/-Export, Geschlecht und Form-Dropdown, Fähigkeiten-Auswahl, „Legal machen“, Game-Boy-Editor mit Schnell-Buttons/Hex/Batch/.pk1/.pk2, Ruhmeshalle Gen 1, Münzen und Kampfpunkte; Gen-5-Team-Pokémon (#494–#649) werden richtig geladen.',
          'GO-Infografik „Shiny & 100% CP“ (bis zu 8 Pokémon, Raid/Dynamax/G-Max); Capture-Projektor verbindet die Aufnahme automatisch wieder; Fangrechner auch auf Android.',
          'Damage Calc, Meta-Test, Shiny-Zähler und Performance: EV-Umrechnung in SPs, mehrere Attacken-Fixes, korrigierte K.O.-Zählung, schnelleres Laden.'
        ],
        en: [
          'Randomizer: new design without scrolling; custom starters for all generations, rival and friends keep their starter (gen 3-5), National Pokédex option and fixed evolutions in FireRed/LeafGreen, held items of wild Pokémon (gen 4/5), statics/gifts for X/Y and ORAS, move tutors in ORAS and Crystal, field items for gen 1/2, “Open in Nuzlocke calculator” button.',
          'Save editor: Showdown text import/export, gender and form dropdown, ability picker, “Make legal”, Game Boy editor with quick buttons/hex/batch/.pk1/.pk2, Hall of Fame gen 1, coins and battle points; gen 5 party Pokémon (#494–#649) load properly.',
          'GO infographic “Shiny & 100% CP” (up to 8 Pokémon, Raid/Dynamax/G-Max); the capture projector reconnects the capture automatically; catch calculator also on Android.',
          'Damage calc, meta test, shiny counter and performance: EV to SP conversion, several move fixes, fixed KO attribution, faster loading.'
        ]
      } },
    { v: '1.26.6',
      de: [
        'Randomizer: Neues Layout ohne Scrollen – ROM-Karte mit Spielinfo, große Ablagefläche mit Übersicht der unterstützten Spiele, Optionen in Karten und Spalten, feste Fußleiste mit „Randomisieren und speichern“, Voreinstellungen übersichtlich gruppiert und einklappbares Protokoll.'
      ],
      en: [
        'Randomizer: new layout without scrolling – ROM card with game info, large drop area listing the supported games, options in cards and columns, fixed footer with “Randomize and save”, neatly grouped presets and a collapsible log.'
      ] },
    { v: '1.26.5',
      de: [
        'Save-Editor: Showdown-Text-Import/-Export für einzelne Pokémon (Gen 3-7), Geschlecht (♂/♀) und Form-Dropdown mit Namen, Fähigkeiten-Auswahl (Fähigkeit 1/2/Versteckte) für Gen 4-7 und Button „Legal machen“ (Attacken, EP/IP, Fähigkeit, Fundort und Fundlevel).',
        'Save-Editor Game Boy (Gen 1/2): Schnell-Buttons (DVs 15, Stat-EP), .pk1/.pk2-Import/Export, Hex-Ansicht und Massenbearbeitung; Ruhmeshalle für Generation 1; Spielhallen-Münzen (Gold/Silber/Kristall), Kampfpunkte in Smaragd und der Kampf-Subway (Gen 5).',
        'Randomizer: Eigene Starter-Auswahl für alle Generationen, Option „Rivale und Freunde behalten ihren Starter“ (Gen 3-5), Option „Nationaler Pokédex ab Spielbeginn“ und korrigierte Entwicklungen in Feuerrot/Blattgrün (Gen 3), Held-Items wilder Pokémon (Gen 4/5), HGSS-Gras-/Radio-/Schwarm-Level, Button „Im Nuzlocke-Rechner öffnen“.',
        'Randomizer: Statische Begegnungen und Geschenke für X/Y und Omega Rubin/Alpha Saphir, Attacken-Lehrer in Omega Rubin/Alpha Saphir und Kristall, Feld-Items (Itembälle und versteckte Items) für Generation 1 und 2.',
        'Fangrechner jetzt auch in der Android-App.'
      ],
      en: [
        'Save editor: Showdown text import/export for single Pokémon (gen 3-7), gender (♂/♀) and form dropdown with names, ability picker (ability 1/2/hidden) for gen 4-7 and a “Make legal” button (moves, EVs/IVs, ability, met location and level).',
        'Save editor Game Boy (gen 1/2): quick buttons (DVs 15, stat exp), .pk1/.pk2 import/export, hex view and batch editing; Hall of Fame for generation 1; Game Corner coins (Gold/Silver/Crystal), Battle Frontier points in Emerald and Battle Subway points (gen 5).',
        'Randomizer: custom starter picks for all generations, option “Rival and friends keep their starter” (gen 3-5), option “National Pokédex from the start” and fixed evolutions in FireRed/LeafGreen (gen 3), held items of wild Pokémon (gen 4/5), HGSS grass/radio/swarm levels, “Open in Nuzlocke calculator” button.',
        'Randomizer: static encounters and gifts for X/Y and Omega Ruby/Alpha Sapphire, move tutors in Omega Ruby/Alpha Sapphire and Crystal, field items (item balls and hidden items) for generations 1 and 2.',
        'The catch calculator is now available in the Android app too.'
      ] },
    { v: '1.26.4',
      de: [
        'Capture-Projektor: Neue Option „Aufnahme automatisch wieder verbinden“ (direkt im Projektor und unter Einstellungen → Werkzeuge) sowie Schnell-Button „Verbinden: …“ für die zuletzt genutzte Quelle.'
      ],
      en: [
        'Capture projector: new “Reconnect the capture automatically” option (in the projector view and under Settings → Tools) plus a quick “Connect: …” button for the last used source.'
      ] },
    { v: '1.26.3',
      de: [
        'GO-Infografik („Shiny & 100% CP“): Zeigt bei jedem Pokémon die normale und die Shiny-Form nebeneinander, berechnet die 100%-IV-CP immer aus der Fangform (z. B. bei Kyurem, Zacian/Zamazenta, Necrozma, Calyrex, Mega- und Gigadynamax-Formen) und unterstützt alle 34 Gigadynamax-Formen als Auswahl bzw. eigenen „G-Max“-Modus.'
      ],
      en: [
        'GO infographic (“Shiny & 100% CP”): shows both the normal and Shiny form side by side for each Pokémon, always calculates 100% IV CP from the catchable base form (e.g. for Kyurem, Zacian/Zamazenta, Necrozma, Calyrex, Mega and Gigantamax forms), and supports all 34 Gigantamax forms via search or the dedicated “G-Max” mode.'
      ] },
    { v: '1.26.2',
      de: [
        'GO-Infografik: Neue Ansicht „Shiny & 100% CP“ für bis zu 8 auswählbare Pokémon mit Shiny-Artwork und adaptivem Kartenlayout; pro Pokémon kann zwischen Raid (Level 20 & 25 CP) und Dynamax (nur Level 20 CP) gewählt werden.'
      ],
      en: [
        'GO infographic: new “Shiny & 100% CP” view for up to 8 selectable Pokémon with Shiny artwork and adaptive card layout; each Pokémon can be switched between Raid (level 20 & 25 CP) and Dynamax (level 20 CP only).'
      ] },
    { v: '1.26.1',
      de: [
        'Save-Editor: Gen-5-Team-Pokémon (#494–#649) werden richtig geladen und überschreiben beim Speichern nicht mehr den nächsten Slot.',
        'Damage Calc & Online-Sets: EV-Spreads aus Online-Presets werden korrekt in SPs umgerechnet; Steel Roller, Triple Axel, Triple Kick und Beat Up sowie das Tauschen von Feldeffekten (⇄) behoben.',
        'Meta-Test, Shiny-Zähler & Performance: K.O.-Zählung (Wetter/Rückstoß/Eigen-K.O.) und Mega-Bewertung korrigiert, OCR-Prozess bricht nicht mehr nach 20 s ab, schnelleres Laden und Berechnen im gesamten Projekt.'
      ],
      en: [
        'Save editor: Gen 5 party Pokémon (#494–#649) load properly and no longer overwrite the next slot when saving.',
        'Damage calc & online sets: EV spreads from online presets are properly converted to SPs; fixed Steel Roller, Triple Axel, Triple Kick, Beat Up and swapping field effects (⇄).',
        'Meta test, shiny counter & performance: fixed KO attribution (weather/recoil/self-KO) and Mega evaluation, OCR no longer stops after 20 s, faster loading and calculations across the app.'
      ] },
    { v: '1.26.0',
      de: ['Sidebar-Ansicht: Das große Logo über der Übersicht ist weg, damit alle Tools ohne Scrollen sichtbar sind.'],
      en: ['Sidebar layout: the large logo above the overview is gone, so all tools are visible without scrolling.'],
      full: {
        de: ['Sidebar-Ansicht: Das große Logo über der Übersicht ist weg, damit alle Tools ohne Scrollen sichtbar sind.', 'Teamsheet: Der Knopf im Teambuilder öffnet das Teamsheet wieder.'],
        en: ['Sidebar layout: the large logo above the overview is gone, so all tools are visible without scrolling.', 'Team sheet: the teambuilder button opens the team sheet again.']
      } },
    { v: '1.25.1',
      de: ['Teamsheet: Der Knopf im Teambuilder öffnet das Teamsheet wieder (in 1.25.0 war er durch einen Fehler tot).'],
      en: ['Team sheet: the teambuilder button opens the team sheet again (it was dead in 1.25.0 because of a bug).'] },
    { v: '1.25.0',
      de: ['Damage Calc: Der Knopf „SP in Teambuilder übernehmen“ sitzt jetzt in der Zeile unter den Werten, zwischen SP-Summe und Initiative. Die Attacken passen wieder ins Fenster.', 'Teamsheet: Neues Häkchen „Dark Mode“ erstellt das Bild mit dunklem Hintergrund.'],
      en: ['Damage calc: the “Copy SPs to teambuilder” button now sits in the row under the stats, between the SP total and the speed. The moves fit the window again.', 'Team sheet: the new “Dark mode” checkbox draws the image on a dark background.'],
      full: {
        de: ['Neue Kategorie „Gegen die KI“ mit Random Battle und Choice Battle (Vorbereitung, der Kampf selbst folgt).', 'Meta-Test lesbarer: Teamnamen mit Apostroph, feste Teamliste, Siegquote mit Legende und sortierbare Spalten.', 'Bots nutzen unter Psychic Terrain keine Prioritätsattacke gegen Pokémon am Boden.', 'Damage Calc: „In Teambuilder übernehmen“ schreibt das bearbeitete Pokémon ins gewählte Team, und „SP in Teambuilder übernehmen“ ändert nur die SP.', 'Nach einem installierten Update werden die heruntergeladenen Update-Dateien gelöscht.', 'Teamsheet: Häkchen „Dark Mode“ für ein Bild mit dunklem Hintergrund.'],
        en: ['New category “Vs. AI” with Random Battle and Choice Battle (groundwork, the battle itself follows).', 'Meta test more readable: team names with apostrophes, a fixed team list, win rate with a legend and sortable columns.', 'Bots do not use priority moves against grounded Pokémon under Psychic Terrain.', 'Damage calc: “Copy to teambuilder” writes the edited Pokémon into the chosen team, and “Copy SPs to teambuilder” changes only the SPs.', 'After an update is installed, the downloaded update files are deleted.', 'Team sheet: “Dark mode” checkbox for an image with a dark background.']
      } },
    { v: '1.24.2',
      de: ['Damage Calc: Der Knopf „SP in Teambuilder übernehmen“ steht jetzt unter den SP und ist nur aktiv, wenn das Pokémon aus einem Teambuilder-Team kommt. Er ändert dort nur die SP.', 'Das Layout passt wieder ins Fenster (die zusätzliche Zeile für den Knopf ist weg).'],
      en: ['Damage calc: the “Copy SPs to teambuilder” button now sits under the SPs and is only active for a Pokémon from a teambuilder team. It only changes the SPs there.', 'The layout fits the window again (the extra row for the button is gone).'] },
    { v: '1.24.1',
      de: ['Neue Kategorie „Gegen die KI“ mit Random Battle und Choice Battle (Vorbereitung, der Kampf selbst folgt). Die Kampfansicht passt sich der Fenstergröße an.', 'Nach einem installierten Update werden die heruntergeladenen Update-Dateien wieder gelöscht.'],
      en: ['New category “Vs. AI” with Random Battle and Choice Battle (groundwork, the battle itself follows). The battle view fits the window size.', 'After an update is installed, the downloaded update files are deleted again.'] },
    { v: '1.24.0',
      de: ['Meta-Test: Teamnamen zeigen Apostrophe und andere HTML-Zeichen richtig an. Schon gespeicherte Listen werden dabei mit umgewandelt.', 'Meta-Test: Die Teamliste und die Ergebnisse überlappen nicht mehr. Siegquote mit Legende, S–U–N, Zusammenfassung und sortierbare Spalten.', 'Bots nutzen Fake Out und andere Prioritätsattacken nicht mehr gegen Pokémon am Boden, solange Psychic Terrain liegt. Armor Tail, Dazzling und Queenly Majesty gelten ebenfalls.', 'Damage Calc: „In Teambuilder übernehmen“ schreibt das bearbeitete Pokémon ins gewählte Team, auf das gleiche Pokémon oder in einen Slot.'],
      en: ['Meta test: team names show apostrophes and other HTML characters correctly. Lists already saved are converted too.', 'Meta test: the team list and the results no longer overlap. Win rate with a legend, W–D–L, a summary and sortable columns.', 'Bots no longer use Fake Out or other priority moves against grounded Pokémon while Psychic Terrain is up. Armor Tail, Dazzling and Queenly Majesty count as well.', 'Damage calc: “Copy to teambuilder” writes the edited Pokémon into the chosen team, onto the same species or into a slot.'],
      full: {
        de: ['Neu: Speed-Tiers in der Kategorie Kampf.', 'Neu: Meta-Test im Teambuilder. Das gewählte Team spielt lokal gegen Meta-Teams, ohne Verbindung zu Pokémon Showdown.', 'Der SP-Optimierer ist entfernt. Speed-Tiers bleiben.', 'Meta-Test: Der Knopf steht neben dem Teamnamen, unter Kampf und auf dem Startbildschirm.', 'Meta-Test: Teamnamen mit Apostroph, eine feste Teamliste ohne Überlappung und eine sortierbare Ergebnistabelle mit Siegquote.', 'Bots wählen unter Psychic Terrain keine Prioritätsattacke gegen Pokémon am Boden. Armor Tail, Dazzling und Queenly Majesty blocken Priorität ebenfalls.', 'Damage Calc: „In Teambuilder übernehmen“ schreibt das bearbeitete Pokémon ins gewählte Team.'],
        en: ['New: Speed Tiers in the Fight category.', 'New: Meta test in the teambuilder. The selected team plays locally against meta teams, with no connection to Pokémon Showdown.', 'The SP optimizer is removed. Speed tiers stay.', 'Meta test: the button sits next to the team name, under Fight and on the start screen.', 'Meta test: team names with apostrophes, a fixed team list without overlap and a sortable results table with win rate.', 'Bots do not pick a priority move against grounded Pokémon under Psychic Terrain. Armor Tail, Dazzling and Queenly Majesty block priority as well.', 'Damage calc: “Copy to teambuilder” writes the edited Pokémon into the chosen team.']
      } },
    { v: '1.23.4',
      de: ['Der SP-Optimierer ist entfernt. Speed-Tiers bleiben.', 'Meta-Test: Der Knopf steht direkt neben dem Teamnamen und bricht nicht mehr aus der Leiste. Er ist auch unter Kampf in der Seitenleiste und auf dem Startbildschirm.'],
      en: ['The SP optimizer is removed. Speed tiers stay.', 'Meta test: the button sits next to the team name and no longer runs off the toolbar. It is also under Fight in the sidebar and on the start screen.'] },
    { v: '1.23.3',
      de: ['Meta-Test im Teambuilder: das gewählte Team spielt lokal gegen Meta-Teams. Es gibt keine Verbindung zu Pokémon Showdown.', 'Stufen: Zufall, Maximalschaden, Doppel-Heuristik und eine Runde Vorausschau. Siegquote mit Konfidenz, Leads, K.O.s und ein lokales Replay.', 'Sofort ohne Simulation: Initiative (auch Tailwind und Choice Scarf), K.O.-Chancen und Bedrohungen. Auf Android nur diese Rechnung plus eine grob markierte Schnellprüfung.'],
      en: ['Meta test in the teambuilder: the selected team plays locally against meta teams. There is no connection to Pokémon Showdown.', 'Levels: random, max damage, doubles heuristics and one-turn lookahead. Win rate with a confidence interval, leads, KOs and a local replay.', 'Instant, without simulation: speed (including Tailwind and Choice Scarf), KO chances and threats. On Android, that panel plus a clearly marked rough check.'] },
    { v: '1.23.2',
      de: ['Neu: Speed-Tiers. Tabelle aller Champions-Pokémon mit Basis-Initiative, Max Speed, neutral mit 0 oder 32 SP, Wesen mit −Init und mit Choice Scarf. Sortierbar, mit Suche, Filter für Megas, Stufen, Rückenwind, Paralyse und einem Vergleichswert.', 'Speed-Tiers stehen in der Kategorie „Kampf“.'],
      en: ['New: Speed Tiers. A table of every Champions Pokémon with base speed, max speed, neutral with 0 or 32 SP, a -Spe nature and Choice Scarf. Sortable, with search, a Mega filter, stat stages, Tailwind, paralysis and a compare value.', 'Speed tiers are in the "Fight" category.'] },
    { v: '1.23.1',
      de: ['Capture-Projektor: Ist „Eigenes Match“ eingeschaltet und ein Team eingetragen, zeigt der Projektor 21:9: dein Team links, das Spiel in der Mitte, der Gegner rechts.', 'Eigenes Match: Die beiden Seiten haben eigene Namensfelder, unabhängig von den Namen im Aufnahme-Match.'],
      en: ['Capture projector: with "Own match" on and a team entered, the projector shows 21:9: your team on the left, the game in the middle, the opponent on the right.', 'Own match: both sides have their own name fields, independent of the names in the recording match.'] },
    { v: '1.23.0',
      de: ['Projektor: Es gibt nur noch den Modus „Neu (schnell)“. „Aktuell“, die Modus-Auswahl im Shiny-Zähler und die M-Taste im Projektor sind weg.', 'Reiner Capture-Projektor: Die Vorschau pausiert, solange der Projektor offen ist. Das sollte die verworfenen Bilder senken.'],
      en: ['Projector: only the "New (fast)" mode is left. The "Current" mode, the mode picker in the shiny counter and the M key in the projector are gone.', 'Pure capture projector: the preview pauses while the projector is open, which should reduce dropped frames.'],
      full: {
        de: ['Neu: Capture-Projektor. Er zeigt das Bild deiner Capture-Karte oder eines Bildschirms in einem eigenen Fenster, ohne Zähler. Der Projektor hat nur noch den schnellen Modus.', 'Neues Minigame „Typ-Rätsel“: Du siehst, wie effektiv jeder Typ gegen ein verstecktes Pokémon ist, und tippst das Pokémon selbst ein.', 'Minigames: Die Punkte starten nach einem Fehler wieder bei 0, nur der Highscore bleibt. Du wählst, ob nur Pokémon der aktuellen Regulation oder alle vorkommen, und fehlende Bilder sind behoben.', 'Basiswerte-Quiz: Zeigt jetzt auch die Summe aller Basiswerte (Gesamt).', 'Schadens-Schätzung: Die Pokémon haben sinnvolle Wesen und SP, beide stehen auf der Karte.', 'Teamsheet: Mit dem Häkchen „SP anzeigen“ stehen die verteilten SP jedes Pokémon im Bild.', 'Teambuilder: Die Typen in den Teamfeldern überlappen nicht mehr.', 'Shiny-Zähler: Der Timer pausiert automatisch, sobald die Anwendung geschlossen wird.'],
        en: ['New: capture projector. It shows the picture of your capture card or a screen in its own window, without a counter. The projector only has the fast mode now.', 'New minigame "Type Puzzle": you see how effective each type is against a hidden Pokémon and type the Pokémon yourself.', 'Minigames: points reset to 0 after a mistake, only the high score stays. You choose whether only Pokémon of the current regulation or all Pokémon appear, and missing images are fixed.', 'Base stat quiz: now also shows the base stat total.', 'Damage estimate: the Pokémon have sensible natures and SP, both shown on the card.', 'Team sheet: the "Show SP" checkbox adds each Pokémon’s SP spread to the image.', 'Team builder: the types in the team slots no longer overlap.', 'Shiny counter: the timer pauses automatically when the application is closed.']
      } },
    { v: '1.22.7',
      de: ['Teamsheet: Mit dem Häkchen „SP anzeigen“ stehen die verteilten SP jedes Pokémon im Bild.'],
      en: ['Team sheet: the "Show SP" checkbox adds each Pokémon’s SP spread to the image.'] },
    { v: '1.22.6',
      de: ['Teambuilder: Die Typen in den Teamfeldern überlappen nicht mehr, sie sind kleiner und brechen bei Platzmangel um.', 'Capture-Projektor: Die GPU-Aufnahme der Capture-Karte ist unter Windows aus, das sollte das kurze grüne Aufblitzen im Bild beheben.'],
      en: ['Team builder: the types in the team slots no longer overlap, they are smaller and wrap when space is tight.', 'Capture projector: GPU capture of the capture card is off on Windows, which should fix the brief green flashes in the picture.'] },
    { v: '1.22.5',
      de: ['Typ-Rätsel: Die Effektivitäten stehen gruppiert wie bei den Typ-Schwächen (auch ×1), und du tippst das Pokémon selbst ein. Jedes Pokémon mit denselben Typen zählt als richtig.'],
      en: ['Type puzzle: the effectiveness values are grouped like type weaknesses (including x1), and you type the Pokémon yourself. Any Pokémon with the same types counts as correct.'] },
    { v: '1.22.4',
      de: ['Minigames: Die Punkte starten nach einem Fehler wieder bei 0, nur der Highscore bleibt.', 'Minigames: Statt Generation und „nur voll entwickelte“ wählst du jetzt, ob nur Pokémon der aktuellen Regulation oder alle Pokémon vorkommen.', 'Schadens-Schätzung: Die Pokémon haben sinnvolle Wesen und SP, beide stehen auf der Karte.', 'Minigames: Fehlende Bilder behoben (Kommo-o, Porygon-Z, Ho-Oh u. a.); Megas ohne eigenes Bild zeigen die Basisart.'],
      en: ['Minigames: points reset to 0 after a mistake, only the high score stays.', 'Minigames: instead of generation and "fully evolved only" you now choose whether only Pokémon of the current regulation or all Pokémon appear.', 'Damage estimate: the Pokémon have sensible natures and SP, both shown on the card.', 'Minigames: missing images fixed (Kommo-o, Porygon-Z, Ho-Oh and others); Megas without their own image show the base species.'] },
    { v: '1.22.3',
      de: ['Neues Minigame „Typ-Rätsel“: Du siehst, wie effektiv jeder Typ gegen ein verstecktes Pokémon ist, und wählst es aus sechs aus.', 'Basiswerte-Quiz: Zeigt jetzt auch die Summe aller Basiswerte (Gesamt).'],
      en: ['New minigame "Type Puzzle": you see how effective each type is against a hidden Pokémon and pick it from six.', 'Base stat quiz: now also shows the base stat total.'] },
    { v: '1.22.2',
      de: ['Updates: Auf „Vollversionen“ wird nur noch genau die x.y.0 der neuen Linie angeboten, keine Patches. Geladen wird genau die gewählte Fassung.', 'Aufgeräumt: Der nicht mehr genutzte Simulator samt KI-Training ist entfernt.'],
      en: ['Updates: on "Full versions" only the exact x.y.0 of the new line is offered, no patches. Exactly the chosen version is downloaded.', 'Cleanup: the unused simulator and AI training code has been removed.'] },
    { v: '1.22.1',
      de: ['Shiny-Zähler: Der Timer pausiert automatisch, sobald die Anwendung geschlossen wird, und läuft nicht mehr im Hintergrund weiter.'],
      en: ['Shiny counter: the timer now pauses automatically when the application is closed and no longer keeps running while it is off.'] },
    { v: '1.22.0',
      de: ['Teampreview: Jedes Teamlogo steht mittig hinter seinem Team.', 'Shiny-Zähler: „Aufnahme automatisch wieder verbinden“ und „Erkennung mit dem Timer starten“ gibt es jetzt auch in den Einstellungen unter „Werkzeuge & Start“.'],
      en: ['Team preview: each team logo is centered behind its own team.', 'Shiny counter: "Reconnect the capture automatically" and "Start detection with the timer" are now also in settings under "Tools & start".'] },
    { v: '1.21.6',
      de: ['Minigames: Alle Spiele zeigen jetzt Home-Sprites, auch Mega-Pokémon haben wieder ein Bild.', 'Schadens-Schätzung: Mega-Pokémon tragen immer ihren Mega-Stein.', 'Wer ist schneller?: Die Pokémon stehen nicht mehr viel zu weit unten.'],
      en: ['Minigames: all games now show Home sprites, Mega Pokémon have a picture again.', 'Damage estimate: Mega Pokémon always hold their Mega Stone.', 'Who is faster?: the Pokémon are no longer far too low on the screen.'] },
    { v: '1.21.5',
      de: ['Schadens-Schätzung: Die Attacken stammen aus den beliebten Sets, ohne Sets meist STAB-Attacken. Die KP werden nicht mehr angezeigt.', 'Schadens-Schätzung: Ab Serie 10 kommen teils Wetter und Terrain dazu, ab Serie 20 teils Statuswert-Änderungen (+1, −2 usw.).', 'Basiswerte-Quiz und „Wer ist schneller?“: Die Auswahlkarten überlagern sich nicht mehr, bei „Wer ist schneller?“ stehen sie in der Höhe mittig.'],
      en: ['Damage estimate: moves come from the popular sets, without sets mostly STAB moves. HP is no longer shown.', 'Damage estimate: from a streak of 10 weather and terrain sometimes appear, from 20 stat changes (+1, -2 etc.).', 'Base stat quiz and "Who is faster?": the choice cards no longer overlap, and in "Who is faster?" they are vertically centered.'] },
    { v: '1.21.4',
      de: ['Minigames: Alle drei Spiele enden jetzt beim ersten Fehler, gezählt wird die Serie.', 'Wer ist schneller?: Du klickst das schnellere Pokémon direkt an.', 'Basiswerte-Quiz: Keine Tipps mehr, dafür 6 Pokémon zur Auswahl.', 'Schadens-Schätzung: Regler von 0 bis 100 %, mehr als 10 Prozentpunkte daneben beendet das Spiel.'],
      en: ['Minigames: all three games now end on the first mistake, your streak is what counts.', 'Who is faster?: click the faster Pokémon directly.', 'Base stat quiz: no more hints, instead 6 Pokémon to choose from.', 'Damage guess: slider from 0 to 100%, more than 10 percentage points off ends the game.'] },
    { v: '1.21.3',
      de: ['Patchnotes: Das Popup erscheint jetzt zuverlässig nach jedem Update.'],
      en: ['Patch notes: the popup now reliably appears after every update.'] },
    { v: '1.21.2',
      de: ['Neu: Patchnotes erscheinen nach jedem Update als Popup (auch in den Einstellungen unter „App & Updates“ abrufbar).', 'Teambuilder: Beim Wechsel zwischen Pokémon ist das Bild nicht mehr kurz riesig, und Attacken und Werte springen nicht mehr.'],
      en: ['New: patch notes appear as a popup after every update (also available in settings under "App & updates").', 'Team builder: when switching between Pokémon the picture is no longer huge for a moment, and moves and stats no longer jump.'] },
    { v: '1.21.1',
      de: ['Teampreview: Das Teamlogo erscheint mittig hinter beiden Teams.', 'Shiny-Zähler: Die Aufnahme (Capture Card / Fenster) verbindet sich auf Wunsch automatisch neu.', 'Shiny-Zähler: Die Erkennung startet und stoppt mit dem Timer (Einstellung „Automatik“ im Setup).', 'Neu: Patchnotes nach jedem Update.'],
      en: ['Team preview: the team logo is shown centered behind both teams.', 'Shiny counter: the capture (card / window) can reconnect automatically.', 'Shiny counter: detection starts and stops with the timer ("Automation" in the setup tab).', 'New: patch notes after every update.'] },
    { v: '1.21.0',
      de: ['Minigames: „Wer ist schneller?“, Basiswerte-Quiz und Schadens-Schätzung.', 'Update-Kanal: Vollversionen oder Zwischenversionen wählbar.'],
      en: ['Minigames: "Who is faster?", base stat quiz and damage guess.', 'Update channel: choose full releases or interim versions.'] },
    { v: '1.20.1',
      de: ['Handy-Layout für Soul Link, Nuzlocke-Rechner und Teambuilder (untereinander statt abgeschnitten).'],
      en: ['Phone layout for Soul Link, Nuzlocke calculator and team builder (stacked instead of cut off).'] },
    { v: '1.20.0',
      de: ['Die Android-App aktualisiert sich selbst (APK aus dem GitHub-Release).', 'Handy-Layout der GO-Infografik.'],
      en: ['The Android app updates itself (APK from the GitHub release).', 'Phone layout of the GO infographic.'] },
    { v: '1.19.0',
      de: ['GO-Infografik (Raid & Feldforschung/Forschungstag) als PNG.', 'Top-Konter mit Attacken, Fang-CP der Normalform.', 'Necrozma-Fusionen mit richtigem Sprite.'],
      en: ['GO infographic (raid & field research/research day) as PNG.', 'Top counters with moves, catch CP of the normal form.', 'Necrozma fusions with the right sprite.'] },
    { v: '1.18.1',
      de: ['Clips mit Ton (Systemton als Standard, die Erkennungsquelle übernimmt die Tonspur).'],
      en: ['Clips with sound (system audio by default, the detection source supplies the audio track).'] },
    { v: '1.18.0',
      de: ['Randomizer in Unterkategorien, Starter für Gen 4–7, weitere UPR-Optionen.', 'Teamsheet im Teambuilder.'],
      en: ['Randomizer in subcategories, starters for gen 4–7, more UPR options.', 'Team sheet in the team builder.'] }
  ];
  var S = de ? { title: 'Neu in Rattata Labs', ver: 'Version {0}', ok: 'Los geht’s', older: 'Frühere Versionen' }
             : { title: 'What’s new in Rattata Labs', ver: 'Version {0}', ok: 'Got it', older: 'Earlier versions' };
  function cmp(a, b) {
    if (window.RLUpdateChannel && window.RLUpdateChannel.compare) return window.RLUpdateChannel.compare(a, b);
    var x = String(a).split('.').map(Number), y = String(b).split('.').map(Number);
    for (var i = 0; i < 3; i++) { if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0) ? 1 : -1; }
    return 0;
  }
  function get() { try { return localStorage.getItem(KEY) || ''; } catch (e) { return ''; } }
  function set(v) { try { localStorage.setItem(KEY, v); } catch (e) { /* kein Speicher */ } }
  // Einträge, die neuer sind als `since` und nicht neuer als `cur` (since leer: nur der aktuelle)
  // channel 'full' (Vollversionen): nur x.y.0-Einträge, ersatzweise mit dem Sammeltext `full`; sonst alle dazwischen
  function entries(since, cur, channel) {
    var full = channel === 'full';
    var l = NOTES.filter(function (n) {
      if (full && !/^\d+\.\d+\.0$/.test(n.v)) return false;
      return cmp(n.v, cur) <= 0 && (since ? cmp(n.v, since) > 0 : true);
    }).map(function (n) { return full && n.full ? { v: n.v, de: n.full.de, en: n.full.en } : n; });
    return since ? l.slice(0, MAX) : l.slice(0, 1);
  }
  function channel() {
    var raw = A.setting ? A.setting('updateChannel') : '';
    return window.RLUpdateChannel ? window.RLUpdateChannel.normalizeChannel(raw) : (raw === 'interim' ? 'interim' : 'full');
  }
  function show(list) {
    if (document.getElementById('patchModal')) return;
    list = list && list.length ? list : NOTES.slice(0, 1);
    var m = el('div', { class: 'modal', id: 'patchModal' });
    var bx = el('div', { class: 'modal-box patch-box', role: 'dialog', 'aria-modal': 'true', 'aria-label': S.title });
    bx.appendChild(el('h3', { text: S.title }));
    var body = el('div', { class: 'patch-body' });
    list.forEach(function (n) {
      var sec = el('div', { class: 'patch-ver' });
      sec.appendChild(el('strong', { text: S.ver.replace('{0}', n.v) }));
      var ul = el('ul');
      (de ? n.de : n.en).forEach(function (t) { ul.appendChild(el('li', { text: t })); });
      sec.appendChild(ul);
      body.appendChild(sec);
    });
    bx.appendChild(body);
    var act = el('div', { class: 'modal-actions' });
    var ok = el('button', { class: 'primary-btn', text: S.ok });
    function close() { m.remove(); document.removeEventListener('keydown', key, true); }
    function key(ev) { if (ev.key === 'Escape') { ev.stopPropagation(); close(); } }
    ok.addEventListener('click', close);
    document.addEventListener('keydown', key, true);
    m.addEventListener('mousedown', function (ev) { if (ev.target === m) close(); });
    act.appendChild(ok); bx.appendChild(act); m.appendChild(bx);
    document.body.appendChild(m);
    ok.focus();
  }
  function check(cur) {
    if (!cur) return;
    var last = get();
    if (last === cur) return;
    set(cur);
    // ohne gemerkte Version (Update von einer Version vor den Patchnotes, oder Neuinstallation): nur den aktuellen Eintrag zeigen
    if (last && cmp(cur, last) <= 0) return; // Rückstufung
    var l = entries(last, cur, channel());
    if (l.length) show(l);
  }
  function currentVersion() {
    var U = (window.desktop && window.desktop.update) || window.RL_APP_UPDATE;
    if (!U || !U.get) return Promise.resolve('');
    return Promise.resolve(U.get()).then(function (s) { return s && s.current ? String(s.current) : ''; }, function () { return ''; });
  }
  window.RLPatchnotes = { show: function () { show(NOTES.slice(0, 1)); }, _notes: NOTES, _entries: entries, _check: check };
  currentVersion().then(function (v) { setTimeout(function () { check(v); }, 800); });
})();

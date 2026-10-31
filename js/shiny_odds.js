// Shiny-Quoten pro Spiel und Methode (Quellen: Bulbapedia „Shiny Pokémon“, Serebii). Eine Begegnung würfelt
// "rolls"-mal gegen die Grundquote (Gen 2–5: 1/8192, ab Gen 6: 1/4096). Methoden mit "approx" sind Näherungen.
(function () {
  'use strict';
  var GAMES = [
    { id: 'gs', de: 'Gold / Silber', en: 'Gold / Silver', gen: 2 },
    { id: 'c', de: 'Kristall', en: 'Crystal', gen: 2 },
    { id: 'rs', de: 'Rubin / Saphir', en: 'Ruby / Sapphire', gen: 3 },
    { id: 'e', de: 'Smaragd', en: 'Emerald', gen: 3 },
    { id: 'frlg', de: 'Feuerrot / Blattgrün', en: 'FireRed / LeafGreen', gen: 3 },
    { id: 'colo', de: 'Colosseum / XD', en: 'Colosseum / XD', gen: 3 },
    { id: 'dp', de: 'Diamant / Perl', en: 'Diamond / Pearl', gen: 4 },
    { id: 'pt', de: 'Platin', en: 'Platinum', gen: 4 },
    { id: 'hgss', de: 'HeartGold / SoulSilver', en: 'HeartGold / SoulSilver', gen: 4 },
    { id: 'bw', de: 'Schwarz / Weiß', en: 'Black / White', gen: 5 },
    { id: 'b2w2', de: 'Schwarz 2 / Weiß 2', en: 'Black 2 / White 2', gen: 5, charm: 2 },
    { id: 'xy', de: 'X / Y', en: 'X / Y', gen: 6, charm: 2 },
    { id: 'oras', de: 'Omega Rubin / Alpha Saphir', en: 'Omega Ruby / Alpha Sapphire', gen: 6, charm: 2 },
    { id: 'sm', de: 'Sonne / Mond', en: 'Sun / Moon', gen: 7, charm: 2 },
    { id: 'usum', de: 'Ultrasonne / Ultramond', en: 'Ultra Sun / Ultra Moon', gen: 7, charm: 2 },
    { id: 'lgpe', de: 'Let’s Go Pikachu / Evoli', en: 'Let’s Go Pikachu / Eevee', gen: 7, charm: 2 },
    { id: 'swsh', de: 'Schwert / Schild', en: 'Sword / Shield', gen: 8, charm: 2 },
    { id: 'bdsp', de: 'Strahlender Diamant / Leuchtende Perle', en: 'Brilliant Diamond / Shining Pearl', gen: 8, charm: 2 },
    { id: 'pla', de: 'Legenden: Arceus', en: 'Legends: Arceus', gen: 8, charm: 3 },
    { id: 'sv', de: 'Karmesin / Purpur', en: 'Scarlet / Violet', gen: 9, charm: 2 },
    { id: 'za', de: 'Legenden: Z-A', en: 'Legends: Z-A', gen: 9, charm: 3, approxCharm: true },
    { id: 'other', de: 'Anderes Spiel', en: 'Other game', gen: 9 }
  ];
  function game(id) { for (var i = 0; i < GAMES.length; i++) if (GAMES[i].id === id) return GAMES[i]; return GAMES[GAMES.length - 1]; }
  function base(g) { return g.gen <= 5 ? 8192 : 4096; }
  function rollsP(g, rolls) { return 1 - Math.pow(1 - 1 / base(g), rolls); }
  function charmRolls(g, p) { return p.charm && g.charm ? g.charm : 0; }
  function gen4Radar(chain) { var c = Math.min(40, Math.max(0, chain || 0)); return Math.ceil(65535 / (8200 - c * 200)) / 65536; }

  // params: { charm, chain, lure, ko, outbreak, research, sparkling, custom }
  var METHODS = [
    { id: 'full', de: 'Zufallsbegegnung / Soft Reset', en: 'Random encounter / soft reset', games: 'all',
      odds: function (g, p) { return rollsP(g, 1 + charmRolls(g, p)); } },
    { id: 'masuda', de: 'Masuda-Methode (Zucht)', en: 'Masuda method (breeding)', games: ['dp', 'pt', 'hgss', 'bw', 'b2w2', 'xy', 'oras', 'sm', 'usum', 'swsh', 'bdsp', 'sv'],
      odds: function (g, p) { return rollsP(g, (g.gen === 4 ? 5 : 6) + charmRolls(g, p)); } },
    { id: 'shinyparent', de: 'Zucht mit Shiny-Elternteil', en: 'Breeding with a shiny parent', games: ['gs', 'c'],
      odds: function () { return 1 / 64; } },
    { id: 'radar', de: 'Pokéradar (Kette)', en: 'Poké Radar (chain)', games: ['dp', 'pt', 'xy', 'bdsp'], params: ['chain40'], approxFor: ['xy', 'bdsp'],
      odds: function (g, p) {
        var r = gen4Radar(p.chain);
        if (g.id === 'bdsp') r = Math.min(1, r * 2);
        var extra = charmRolls(g, p);
        return 1 - (1 - r) * Math.pow(1 - 1 / base(g), extra);
      } },
    { id: 'fishing', de: 'Angelkette', en: 'Chain fishing', games: ['xy', 'oras'], params: ['chain20'],
      odds: function (g, p) { return rollsP(g, 1 + 2 * Math.min(20, p.chain || 0) + charmRolls(g, p)); } },
    { id: 'safari', de: 'Kontaktsafari', en: 'Friend Safari', games: ['xy'],
      odds: function (g, p) { return rollsP(g, 5 + charmRolls(g, p)); } },
    { id: 'horde', de: 'Horden (5 pro Begegnung)', en: 'Hordes (5 per encounter)', games: ['xy', 'oras'], step: 5,
      odds: function (g, p) { return rollsP(g, 1 + charmRolls(g, p)); } },
    { id: 'sos', de: 'SOS-Kette', en: 'SOS chain', games: ['sm', 'usum'], params: ['chainSos'],
      odds: function (g, p) {
        var c = p.chain || 0, extra = c >= 31 ? 12 : c >= 21 ? 8 : c >= 11 ? 4 : 0;
        return rollsP(g, 1 + extra + charmRolls(g, p));
      } },
    { id: 'combo', de: 'Fangkombo', en: 'Catch combo', games: ['lgpe'], params: ['chainCombo', 'lure'],
      odds: function (g, p) {
        var c = p.chain || 0, extra = c >= 31 ? 11 : c >= 21 ? 7 : c >= 11 ? 3 : 0;
        return rollsP(g, 1 + extra + (p.lure ? 1 : 0) + charmRolls(g, p));
      } },
    { id: 'ko', de: 'Besiegt-Zähler (Pokédex)', en: 'Number battled (Pokédex)', games: ['swsh'], params: ['ko'],
      odds: function (g, p) {
        var k = +p.ko || 0, extra = k >= 500 ? 5 : k >= 300 ? 4 : k >= 200 ? 3 : k >= 100 ? 2 : k >= 50 ? 1 : 0;
        return rollsP(g, 1 + extra + charmRolls(g, p));
      } },
    { id: 'maxlair', de: 'Dyna-Raid-Abenteuer', en: 'Dynamax Adventures', games: ['swsh'],
      odds: function (g, p) { return p.charm ? 1 / 100 : 1 / 300; } },
    { id: 'pla', de: 'Massenauftreten / Forschung', en: 'Outbreaks / research', games: ['pla'], params: ['plaOutbreak', 'plaResearch'],
      odds: function (g, p) { return rollsP(g, 1 + charmRolls(g, p) + (+p.outbreak || 0) + (+p.research || 0)); } },
    { id: 'sv', de: 'Massenauftreten / Sandwich', en: 'Outbreaks / sandwich', games: ['sv'], params: ['svOutbreak', 'sparkling'],
      odds: function (g, p) { return rollsP(g, 1 + charmRolls(g, p) + (+p.outbreak || 0) + (p.sparkling ? 3 : 0)); } },
    { id: 'custom', de: 'Eigene Quote', en: 'Custom odds', games: 'all', params: ['custom'],
      odds: function (g, p) { var x = +p.custom || 4096; return 1 / Math.max(1, x); } }
  ];
  // parameter definitions for the UI
  var PARAMS = {
    chain40: { key: 'chain', type: 'number', max: 999, de: 'Kette', en: 'Chain' },
    chain20: { key: 'chain', type: 'number', max: 999, de: 'Kette', en: 'Chain' },
    chainSos: { key: 'chain', type: 'number', max: 999, de: 'Kette', en: 'Chain' },
    chainCombo: { key: 'chain', type: 'number', max: 999, de: 'Kombo', en: 'Combo' },
    lure: { key: 'lure', type: 'check', de: 'Lockparfüm', en: 'Lure' },
    ko: { key: 'ko', type: 'select', de: 'Besiegt', en: 'Battled', options: [[0, '0–49'], [50, '50–99'], [100, '100–199'], [200, '200–299'], [300, '300–499'], [500, '500+']] },
    plaOutbreak: { key: 'outbreak', type: 'select', de: 'Auftreten', en: 'Outbreak', options: [[0, { de: 'Keins', en: 'None' }], [25, { de: 'Massenauftreten', en: 'Mass outbreak' }], [12, { de: 'Großes Massenauftreten', en: 'Massive mass outbreak' }]] },
    plaResearch: { key: 'research', type: 'select', de: 'Forschung', en: 'Research', options: [[0, { de: 'unter Stufe 10', en: 'below level 10' }], [1, { de: 'Stufe 10', en: 'level 10' }], [3, { de: 'Perfekt', en: 'perfect' }]] },
    svOutbreak: { key: 'outbreak', type: 'select', de: 'Auftreten besiegt', en: 'Outbreak cleared', options: [[0, { de: 'keins / unter 30', en: 'none / below 30' }], [1, '30–59'], [2, '60+']] },
    sparkling: { key: 'sparkling', type: 'check', de: 'Schillerkraft Lv. 3', en: 'Sparkling Power Lv. 3' },
    custom: { key: 'custom', type: 'number', max: 1000000, de: 'Quote 1 zu', en: 'Odds 1 in' }
  };
  function methodsFor(gameId) {
    return METHODS.filter(function (m) { return m.games === 'all' || m.games.indexOf(gameId) !== -1; });
  }
  function method(id) { for (var i = 0; i < METHODS.length; i++) if (METHODS[i].id === id) return METHODS[i]; return METHODS[0]; }
  // probability per encounter for a hunt { game, method, params }
  function probability(h) {
    var g = game(h.game), m = method(h.method), p = h.params || {};
    if (m.games !== 'all' && m.games.indexOf(g.id) === -1) m = METHODS[0];
    return Math.max(1e-9, Math.min(1, m.odds(g, p)));
  }
  function isApprox(h) {
    var g = game(h.game), m = method(h.method);
    return !!(m.approxFor && m.approxFor.indexOf(g.id) !== -1) || (!!g.approxCharm && h.params && h.params.charm);
  }
  // chance to have found at least one shiny after n encounters
  function cumulative(p, n) { return 1 - Math.pow(1 - p, Math.max(0, n)); }
  // encounters needed for a given cumulative chance
  function encountersFor(p, chance) { return p >= 1 ? 1 : Math.ceil(Math.log(1 - chance) / Math.log(1 - p)); }

  window.SHINY_ODDS = { GAMES: GAMES, METHODS: METHODS, PARAMS: PARAMS, game: game, method: method, methodsFor: methodsFor,
    probability: probability, isApprox: isApprox, cumulative: cumulative, encountersFor: encountersFor, base: base };
})();

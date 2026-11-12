// German messages for the official TeamValidator. Names of Pokémon, moves and items stay as Showdown wrote them.
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.RLMetaErrors = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  var RULES = [
    [/^(.*) has more than 32 Stat Points in (.*)\.$/, '$1 hat mehr als 32 Stat Points in $2.'],
    [/^(.*) has (\d+) total Stat Points, which is more than this format's limit of (\d+)\.$/, '$1 hat $2 Stat Points insgesamt, erlaubt sind höchstens $3.'],
    [/^(.*) has exactly 0 Stat Points.*$/, '$1 hat 0 Stat Points. Trag welche ein, oder setze ein neutrales Wesen außer Serious, wenn das Absicht ist.'],
    [/^(.*)'s IVs are not maxed out.*$/, '$1: In Champions müssen alle IVs 31 sein.'],
    [/^(.*) needs to have an ability\.$/, '$1 braucht eine Fähigkeit.'],
    [/^(.*) can't learn (.*)\.$/, '$1 kann $2 nicht lernen.'],
    [/^(.*) does not exist in Gen 9\.$/, '$1 ist in dieser Regulation (Champions) nicht erlaubt.'],
    [/^(.*) is banned\.$/, '$1 ist verboten.'],
    [/^(.*) is banned by (.*)\.$/, '$1 ist durch „$2“ verboten.'],
    [/^"([^"]+)" is an invalid move\.$/, '„$1“ ist keine gültige Attacke.'],
    [/^"([^"]+)" is an invalid item\.$/, '„$1“ ist kein gültiges Item.'],
    [/^(.*) 's item (.*) does not exist.*$/, '$1: das Item $2 gibt es in dieser Regulation nicht.'],
    [/^(.*)'s item (.*) does not exist.*$/, '$1: das Item $2 gibt es in dieser Regulation nicht.'],
    [/^(.*)'s ability (.*) is banned.*$/, 'Die Fähigkeit $2 von $1 ist verboten.'],
    [/^(.*)'s ability (.*) does not exist.*$/, '$1 hat die Fähigkeit $2 nicht.'],
    [/You are limited to one of each Pokemon by Species Clause\./, 'Species Clause: jedes Pokémon nur einmal.'],
    [/You have more than one (.*)\./, 'Doppelt im Team: $1.'],
    [/Item Clause.*/, 'Item Clause: jedes Item nur einmal.'],
    [/^(.*) has (\d+) EVs, which is more than the limit of (\d+)\.$/, '$1 hat $2 Punkte, erlaubt sind höchstens $3.'],
    [/Team must have exactly (\d+) Pokemon\./, 'Das Team braucht genau $1 Pokémon.'],
    [/You must bring exactly (\d+) Pokemon\./, 'Das Team braucht genau $1 Pokémon.']
  ];
  function one(msg) {
    var s = String(msg || '').replace(/\s+/g, ' ').trim();
    for (var i = 0; i < RULES.length; i++) {
      if (RULES[i][0].test(s)) return s.replace(RULES[i][0], RULES[i][1]);
    }
    return 'Nicht legal: ' + s;
  }
  function translate(list) {
    return (list || []).map(one);
  }
  return { one: one, translate: translate };
});

// Pokémon der 3. Generation (Rubin/Saphir/Smaragd/Feuerrot/Blattgrün und ROM-Hacks mit gleichem Aufbau):
// - ROM lesen: Basiswerte, Attacken, Items, Typentabelle, Level-Attacken, Trainer mit Teams
// - Spielstand lesen: .sav (Ingame-Speicherstand) und, so gut es geht, Savestates von Emulatoren
// - Schaden wie im Spiel berechnen (Formel aus pokeemerald, src/pokemon.c CalculateBaseDamage
//   und src/battle_script_commands.c Cmd_damagecalc/Cmd_typecalc/ApplyRandomDmgMultiplier)
// Nichts wird ausgeführt oder hochgeladen: ROM und Spielstand werden nur als Bytes gelesen.
(function () {
  'use strict';

  // ---------------- text (western Gen 3 charset, from pokeemerald charmap.txt) ----------------
  var CHARS = ' ÀÁÂÇÈÉÊËÌ\u0000ÎÏÒÓÔŒÙÚÛÑßàá\u0000çèéêëì\u0000îïòóôœùúûñºª\u0000&+';
  var CT = new Array(256);
  (function () {
    for (var i = 0; i < CHARS.length; i++) if (CHARS.charCodeAt(i)) CT[i] = CHARS.charAt(i);
    CT[0x34] = 'Lv'; CT[0x35] = '='; CT[0x36] = ';'; CT[0x51] = '¿'; CT[0x52] = '¡'; CT[0x53] = 'PK'; CT[0x54] = 'MN';
    CT[0x5A] = 'Í'; CT[0x5B] = '%'; CT[0x5C] = '('; CT[0x5D] = ')'; CT[0x68] = 'â'; CT[0x6F] = 'í'; CT[0x85] = '<'; CT[0x86] = '>';
    var s = '0123456789!?.-·…“”‘’♂♀¥,×/ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz▶:ÄÖÜäöü';
    for (var j = 0; j < s.length; j++) CT[0xA1 + j] = s.charAt(j);
  })();
  function isTextByte(b) { return CT[b] !== undefined && b !== 0xEF; }
  function decode(u8, off, max) {
    var s = '';
    for (var i = 0; i < max; i++) { var b = u8[off + i]; if (b === 0xFF) break; s += CT[b] || ''; }
    return s;
  }
  // a fixed-size string field: text, then 0xFF, then only 0x00 padding (how the C arrays are stored)
  function strictText(u8, off, size, minLen) {
    var i = 0;
    for (; i < size; i++) { var b = u8[off + i]; if (b === 0xFF) break; if (!isTextByte(b)) return false; }
    if (i >= size || i < minLen) return false;
    for (var k = i + 1; k < size; k++) if (u8[off + k] !== 0) return false;
    return true;
  }
  function textEnd(u8, off, max) { for (var i = 0; i < max; i++) if (u8[off + i] === 0xFF) return i; return -1; }

  function u16(u8, o) { return u8[o] | (u8[o + 1] << 8); }
  function u32(u8, o) { return (u8[o] | (u8[o + 1] << 8) | (u8[o + 2] << 16) | (u8[o + 3] << 24)) >>> 0; }
  function find(u8, pat, from, align) {
    var i = from || 0, first = pat[0];
    for (;;) {
      i = u8.indexOf(first, i);
      if (i === -1 || i + pat.length > u8.length) return -1;
      if (!align || i % align === 0) {
        var ok = true;
        for (var j = 1; j < pat.length; j++) if (pat[j] !== null && u8[i + j] !== pat[j]) { ok = false; break; }
        if (ok) return i;
      }
      i++;
    }
  }
  function findAll(u8, pat, align) { var r = [], i = 0; while ((i = find(u8, pat, i, align)) !== -1) { r.push(i); i++; } return r; }

  // ---------------- constants ----------------
  var TYPES = ['Normal', 'Fighting', 'Flying', 'Poison', 'Ground', 'Rock', 'Bug', 'Ghost', 'Steel', '???', 'Fire', 'Water', 'Grass', 'Electric', 'Psychic', 'Ice', 'Dragon', 'Dark'];
  var T = { NORMAL: 0, FIGHTING: 1, FLYING: 2, POISON: 3, GROUND: 4, ROCK: 5, BUG: 6, GHOST: 7, STEEL: 8, MYSTERY: 9, FIRE: 10, WATER: 11, GRASS: 12, ELECTRIC: 13, PSYCHIC: 14, ICE: 15, DRAGON: 16, DARK: 17 };
  function isPhysical(t) { return t < T.MYSTERY; }
  var NATURES = ['Hardy', 'Lonely', 'Brave', 'Adamant', 'Naughty', 'Bold', 'Docile', 'Relaxed', 'Impish', 'Lax', 'Timid', 'Hasty', 'Serious', 'Jolly', 'Naive',
    'Modest', 'Mild', 'Quiet', 'Bashful', 'Rash', 'Calm', 'Gentle', 'Sassy', 'Careful', 'Quirky'];
  var NAT_STATS = ['atk', 'def', 'spe', 'spa', 'spd'];
  var AB = { DRIZZLE: 2, STURDY: 5, VOLT_ABSORB: 10, WATER_ABSORB: 11, CLOUD_NINE: 13, FLASH_FIRE: 18, INTIMIDATE: 22, WONDER_GUARD: 25, LEVITATE: 26,
    SWIFT_SWIM: 33, CHLOROPHYLL: 34, HUGE_POWER: 37, SOUNDPROOF: 43, SAND_STREAM: 45, THICK_FAT: 47, HUSTLE: 55, PLUS: 57, MINUS: 58, GUTS: 62, MARVEL_SCALE: 63,
    OVERGROW: 65, BLAZE: 66, TORRENT: 67, SWARM: 68, DROUGHT: 70, PURE_POWER: 74, BATTLE_ARMOR: 4, SHELL_ARMOR: 75, AIR_LOCK: 77 };
  var HE = { MACHO_BRACE: 24, CHOICE_BAND: 29, SOUL_DEW: 34, DEEP_SEA_TOOTH: 35, DEEP_SEA_SCALE: 36, SCOPE_LENS: 41, LIGHT_BALL: 45, LUCKY_PUNCH: 63,
    METAL_POWDER: 64, THICK_CLUB: 65, STICK: 66 };
  // hold effect -> boosted type (sHoldEffectToType)
  var HE_TYPE = { 31: 6, 42: 8, 46: 4, 47: 5, 48: 12, 49: 17, 50: 1, 51: 13, 52: 11, 53: 2, 54: 3, 55: 15, 56: 7, 57: 14, 58: 10, 59: 16, 60: 0 };
  var EF = { EXPLOSION: 7, MULTI_HIT: 29, OHKO: 38, SUPER_FANG: 40, DRAGON_RAGE: 41, HIGH_CRITICAL: 43, DOUBLE_HIT: 44, SKY_ATTACK: 75, TWINEEDLE: 77,
    LEVEL_DAMAGE: 87, PSYWAVE: 88, COUNTER: 89, FLAIL: 99, TRIPLE_KICK: 104, RETURN: 121, PRESENT: 122, FRUSTRATION: 123, MAGNITUDE: 126,
    SONICBOOM: 130, HIDDEN_POWER: 135, MIRROR_COAT: 144, SOLAR_BEAM: 151, SPIT_UP: 161, FACADE: 169, SMELLINGSALT: 171, ENDEAVOR: 189, ERUPTION: 190,
    LOW_KICK: 196, BLAZE_KICK: 200, WEATHER_BALL: 203, POISON_TAIL: 209, BIDE: 26 };
  var MOVE_TARGET_BOTH = 8;
  var SOUND_MOVES = { 173: 1, 253: 1, 304: 1 }; // Snore, Uproar, Hyper Voice (damaging sound moves)
  var STAGE = [[10, 40], [10, 35], [10, 30], [10, 25], [10, 20], [10, 15], [10, 10], [15, 10], [20, 10], [25, 10], [30, 10], [35, 10], [40, 10]];
  var CRIT_CHANCE = [16, 8, 4, 3, 2];

  // internal species index -> National Dex (1–251 are equal, 252–276 are unused "?" entries, 277–411 Hoenn)
  var HOENN = [252, 253, 254, 255, 256, 257, 258, 259, 260, 261, 262, 263, 264, 265, 266, 267, 268, 269, 270, 271, 272, 273, 274, 275, 290, 291, 292, 276,
    277, 285, 286, 327, 278, 279, 283, 284, 320, 321, 300, 301, 352, 343, 344, 299, 324, 302, 339, 340, 370, 341, 342, 349, 350, 318, 319, 328, 329, 330,
    296, 297, 309, 310, 322, 323, 363, 364, 365, 331, 332, 361, 362, 337, 338, 298, 325, 326, 311, 312, 303, 307, 308, 333, 334, 360, 355, 356, 315, 287,
    288, 289, 316, 317, 357, 293, 294, 295, 366, 367, 368, 359, 353, 354, 336, 335, 369, 304, 305, 306, 351, 313, 314, 345, 346, 347, 348, 280, 281,
    282, 371, 372, 373, 374, 375, 376, 377, 378, 379, 382, 383, 384, 380, 381, 385, 386, 358];
  function defaultNat(sp) { return sp >= 1 && sp <= 251 ? sp : sp >= 277 && sp <= 411 ? HOENN[sp - 277] : 0; }

  var GAMES = { AXV: 'Rubin', AXP: 'Saphir', BPE: 'Smaragd', BPR: 'Feuerrot', BPG: 'Blattgrün' };
  var GAMES_EN = { AXV: 'Ruby', AXP: 'Sapphire', BPE: 'Emerald', BPR: 'FireRed', BPG: 'LeafGreen' };
  var LANGS = { D: 'DE', E: 'EN', F: 'FR', I: 'IT', S: 'ES', J: 'JP' };

  // ======================= ROM =======================
  function parseRom(buf) {
    var u8 = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
    if (u8.length < 0x200000 || u8[0xB2] !== 0x96) throw new Error('rom:notgba');
    var code = String.fromCharCode(u8[0xAC], u8[0xAD], u8[0xAE], u8[0xAF]);
    var title = String.fromCharCode.apply(null, Array.prototype.slice.call(u8, 0xA0, 0xAC)).replace(/\0+$/, '');
    var romEnd = 0x08000000 + u8.length;
    function ptr(o) { var p = u32(u8, o); return p >= 0x08000000 && p < romEnd ? p - 0x08000000 : -1; }
    var rom = { code: code, title: title, game: GAMES[code.slice(0, 3)] || '', gameEn: GAMES_EN[code.slice(0, 3)] || '', lang: LANGS[code.charAt(3)] || '',
      frlg: /^BP[RG]/.test(code), warnings: [] };

    // base stats: Bulbasaur 45/49/49/45/65/65 Grass/Poison, Ivysaur 60/62/63/60/80/80 one entry (28 bytes) later
    var bs = -1;
    findAll(u8, [45, 49, 49, 45, 65, 65, 12, 3]).some(function (p) {
      if (u8[p + 28] === 60 && u8[p + 29] === 62 && u8[p + 30] === 63) { bs = p - 28; return true; }
      return false;
    });
    if (bs < 0) throw new Error('rom:nostats');
    // national dex numbers: u16 1, 2, 3 … for species 1–251, Treecko (internal 277) = 252
    var natTab = -1, seq = [];
    for (var i = 1; i <= 24; i++) { seq.push(i & 0xFF, i >> 8); }
    findAll(u8, seq, 2).some(function (p) { if (u16(u8, p + 276 * 2) === 252 && u16(u8, p + 250 * 2) === 251) { natTab = p; return true; } return false; });
    // species names: entry 0 is "??????????" (11 bytes per name)
    var names = -1;
    findAll(u8, [0xAC, 0xAC, 0xAC, 0xAC, 0xAC, 0xAC, 0xAC, 0xAC, 0xAC, 0xAC, 0xFF]).some(function (p) {
      for (var k = 1; k <= 8; k++) if (!strictText(u8, p + 11 * k, 11, 3)) return false;
      names = p; return true;
    });
    if (names < 0) rom.warnings.push('names');

    var NSP = 412;
    rom.species = [];
    for (var s = 0; s < NSP; s++) {
      var o = bs + s * 28;
      var nat = natTab >= 0 ? (s === 0 ? 0 : u16(u8, natTab + (s - 1) * 2)) : defaultNat(s);
      if (nat > 386) nat = 0;
      var nameBytes = [];
      if (names >= 0) { var nb = names + s * 11; for (var q = 0; q < 11 && u8[nb + q] !== 0xFF; q++) nameBytes.push(u8[nb + q]); }
      rom.species.push({
        bs: [u8[o], u8[o + 1], u8[o + 2], u8[o + 3], u8[o + 4], u8[o + 5]], // hp atk def spe spa spd
        types: [u8[o + 6], u8[o + 7]], abilities: [u8[o + 22], u8[o + 23]], gender: u8[o + 16], friendship: u8[o + 18], growth: u8[o + 19],
        nat: nat, name: names >= 0 ? decode(u8, names + s * 11, 11) : '', hashBytes: nameBytes
      });
    }

    // moves: entry 0 empty, Pound = effect 0, power 40, Normal, 100 %, 35 PP (12 bytes per move)
    var mv = -1;
    findAll(u8, [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 40, 0, 100, 35, 0, 0, 0]).some(function (p) {
      if (u8[p + 25] === 50 && u8[p + 26] === 1) { mv = p; return true; } // Karate Chop 50 Fighting
      return false;
    });
    if (mv < 0) throw new Error('rom:nomoves');
    rom.moves = [];
    for (var m = 0; m < 355; m++) {
      var mo = mv + m * 12;
      rom.moves.push({ effect: u8[mo], power: u8[mo + 1], type: u8[mo + 2], acc: u8[mo + 3], pp: u8[mo + 4], chance: u8[mo + 5], target: u8[mo + 6],
        priority: u8[mo + 7] > 127 ? u8[mo + 7] - 256 : u8[mo + 7], flags: u8[mo + 8] });
    }

    // items: 44 bytes each, name (14) then itemId == index
    var it = -1;
    findAll(u8, [0xAC, 0xAC, 0xAC, 0xAC, 0xAC, 0xAC, 0xAC, 0xAC, 0xFF]).some(function (p) {
      for (var k = 0; k < 6; k++) if (u16(u8, p + 44 * k + 14) !== k) return false;
      it = p; return true;
    });
    rom.items = [];
    if (it >= 0) {
      for (var n = 0; n < 1000; n++) {
        var io = it + n * 44;
        if (io + 44 > u8.length || u16(u8, io + 14) !== n) break;
        rom.items.push({ name: decode(u8, io, 14), hold: u8[io + 18], param: u8[io + 19] });
      }
    } else rom.warnings.push('items');

    // type chart: triples (attack type, defending type, ×10), 0xFE = Foresight marker, 0xFF = end
    var tc = find(u8, [0, 5, 5, 0, 8, 5, 10, 10, 5, 10, 11, 5]);
    rom.chart = [];
    if (tc >= 0) {
      for (var c = tc; c < tc + 600 && u8[c] !== 0xFF; c += 3) rom.chart.push([u8[c], u8[c + 1], u8[c + 2]]);
    } else { rom.chart = DEFAULT_CHART.slice(); rom.warnings.push('chart'); }

    // level-up learnsets: pointer table, entry 1 (Bulbasaur) = Tackle Lv1, Growl Lv4, Leech Seed Lv7
    rom.learnsets = [];
    var lb = find(u8, [0x21, 0x02, 0x2D, 0x08, 0x49, 0x0E], 0, 2), lt = -1;
    if (lb >= 0) {
      var a = lb + 0x08000000, pat = [a & 0xFF, (a >> 8) & 0xFF, (a >> 16) & 0xFF, a >>> 24];
      // in the original games entry 0 (no species) and entry 1 (Bulbasaur) both point to Bulbasaur's list
      findAll(u8, pat, 4).some(function (p) {
        if (ptr(p + 4) < 0 || ptr(p + 8) < 0) return false;
        lt = u32(u8, p + 4) === a >>> 0 ? p : p - 4;
        return true;
      });
    }
    for (var l = 0; l < NSP; l++) {
      var list = [];
      var lp = lt >= 0 ? ptr(lt + l * 4) : -1;
      if (lp >= 0) for (var e = 0; e < 40; e++) { var v = u16(u8, lp + e * 2); if (v === 0xFFFF) break; list.push([v >> 9, v & 0x1FF]); }
      rom.learnsets.push(list);
    }
    if (lt < 0) rom.warnings.push('learnsets');

    // trainers: the longest run of plausible 40-byte trainer structs
    rom.trainers = readTrainers(u8, ptr, rom);
    if (!rom.trainers.length) rom.warnings.push('trainers');
    rom.classNames = readClassNames(u8, rom);
    return rom;
  }

  function trainerOk(u8, p, ptr, nItems) {
    var flags = u8[p], size = u8[p + 0x20];
    if (flags > 3 || size > 6 || u8[p + 0x18] > 1) return false;
    if (u8[p + 0x19] | u8[p + 0x1A] | u8[p + 0x1B] | u8[p + 0x21] | u8[p + 0x22] | u8[p + 0x23]) return false;
    if (textEnd(u8, p + 4, 12) < 0) return false;
    for (var k = 0; k < 12 && u8[p + 4 + k] !== 0xFF; k++) if (!isTextByte(u8[p + 4 + k])) return false;
    for (var i = 0; i < 4; i++) if (u16(u8, p + 0x10 + i * 2) >= nItems) return false;
    var raw = u32(u8, p + 0x24);
    if (size === 0) return raw === 0 || ptr(p + 0x24) >= 0;
    var pp = ptr(p + 0x24);
    if (pp < 0 || pp % 2) return false;
    var sz = flags & 1 ? 16 : 8;
    for (var j = 0; j < size; j++) {
      var o = pp + j * sz, lv = u8[o + 2], sp = u16(u8, o + 4);
      if (lv < 1 || lv > 100 || u8[o + 3] || sp < 1 || sp > 411 || u16(u8, o) > 255) return false;
      if (flags & 2 && u16(u8, o + 6) >= nItems) return false;
      if (flags & 1) for (var mm = 0; mm < 4; mm++) if (u16(u8, o + (flags & 2 ? 8 : 6) + mm * 2) > 354) return false;
    }
    return true;
  }
  function readTrainers(u8, ptr, rom) {
    var nItems = rom.items.length || 400, best = -1, bestLen = 0;
    for (var p = 0; p + 40 <= u8.length; p += 4) {
      if (u8[p] > 3 || u8[p + 0x20] > 6 || u8[p + 0x18] > 1 || (u8[p + 0x27] !== 0x08 && u8[p + 0x27] !== 0x09 && u32(u8, p + 0x24) !== 0)) continue;
      if (!trainerOk(u8, p, ptr, nItems)) continue;
      var n = 1;
      while (p + (n + 1) * 40 <= u8.length && trainerOk(u8, p + n * 40, ptr, nItems)) n++;
      if (n > bestLen) { bestLen = n; best = p; }
      p += n * 40 - 4;
    }
    if (bestLen < 50) return [];
    var list = [];
    for (var t = 0; t < bestLen; t++) {
      var o = best + t * 40, flags = u8[o], size = u8[o + 0x20];
      if (!size) continue;
      var pp = ptr(o + 0x24), sz = flags & 1 ? 16 : 8, party = [];
      var nameBytes = [];
      for (var k = 0; k < 12 && u8[o + 4 + k] !== 0xFF; k++) nameBytes.push(u8[o + 4 + k]);
      for (var j = 0; j < size; j++) {
        var mo = pp + j * sz;
        var mon = { iv: u16(u8, mo), level: u8[mo + 2], species: u16(u8, mo + 4), item: flags & 2 ? u16(u8, mo + 6) : 0, moves: null };
        if (flags & 1) { mon.moves = []; for (var mm = 0; mm < 4; mm++) mon.moves.push(u16(u8, mo + (flags & 2 ? 8 : 6) + mm * 2)); }
        party.push(mon);
      }
      var items = [];
      for (var i = 0; i < 4; i++) { var iv = u16(u8, o + 0x10 + i * 2); if (iv) items.push(iv); }
      list.push({ id: t, cls: u8[o + 1], female: !!(u8[o + 2] & 0x80), name: decode(u8, o + 4, 12), nameBytes: nameBytes,
        double: u8[o + 0x18] === 1, items: items, custom: !!(flags & 1), party: party });
    }
    return list;
  }
  // trainer class names: a table of 13-byte names; pick the run whose size fits the highest class number and that is not the move/ability table
  function readClassNames(u8, rom) {
    var maxCls = 0;
    rom.trainers.forEach(function (t) { if (t.cls > maxCls) maxCls = t.cls; });
    var need = maxCls + 1, runs = [];
    for (var p = 0; p + 13 * 20 <= u8.length; p++) {
      var b = u8[p];
      if (!((b >= 0xBB && b <= 0xD4) || b === 0x53)) continue;
      if (!strictText(u8, p, 13, 1) || !strictText(u8, p + 13, 13, 1) || !strictText(u8, p + 26, 13, 1)) continue;
      var n = 3;
      while (p + (n + 1) * 13 <= u8.length && strictText(u8, p + n * 13, 13, 1)) n++;
      if (n >= 20) runs.push([p, n]);
      p += n * 13 - 1;
    }
    var best = null;
    runs.forEach(function (r) {
      if (r[1] < need || r[1] > need + 40) return;
      if (!best || Math.abs(r[1] - need) < Math.abs(best[1] - need)) best = r;
    });
    if (!best) return [];
    var res = [];
    for (var i = 0; i < best[1]; i++) res.push(decode(u8, best[0] + i * 13, 13).replace(/PKMN/g, 'PKMN'));
    return res;
  }

  // vanilla type chart (used when the ROM table is not found)
  var DEFAULT_CHART = [[0,5,5],[0,8,5],[10,10,5],[10,11,5],[10,12,20],[10,15,20],[10,6,20],[10,5,5],[10,16,5],[10,8,20],[11,10,20],[11,11,5],[11,12,5],[11,4,20],
    [11,5,20],[11,16,5],[13,11,20],[13,13,5],[13,12,5],[13,4,0],[13,2,20],[13,16,5],[12,10,5],[12,11,20],[12,12,5],[12,3,5],[12,4,20],[12,2,5],[12,6,5],
    [12,5,20],[12,16,5],[12,8,5],[15,11,5],[15,12,20],[15,15,5],[15,4,20],[15,2,20],[15,16,20],[15,8,5],[15,10,5],[1,0,20],[1,15,20],[1,3,5],[1,2,5],
    [1,14,5],[1,6,5],[1,5,20],[1,17,20],[1,8,20],[3,12,20],[3,3,5],[3,4,5],[3,5,5],[3,7,5],[3,8,0],[4,10,20],[4,13,20],[4,12,5],[4,3,20],[4,2,0],[4,6,5],
    [4,5,20],[4,8,20],[2,13,5],[2,12,20],[2,1,20],[2,6,20],[2,5,5],[2,8,5],[14,1,20],[14,3,20],[14,14,5],[14,17,0],[14,8,5],[6,10,5],[6,12,20],[6,1,5],
    [6,3,5],[6,2,5],[6,14,20],[6,7,5],[6,17,20],[6,8,5],[5,10,20],[5,15,20],[5,1,5],[5,4,5],[5,2,20],[5,6,20],[5,8,5],[7,0,0],[7,14,20],[7,17,5],[7,8,5],
    [7,7,20],[16,16,20],[16,8,5],[17,1,5],[17,14,20],[17,7,20],[17,17,5],[17,8,5],[8,10,5],[8,11,5],[8,13,5],[8,15,20],[8,5,20],[8,8,5],[0xFE,0xFE,0],
    [0,7,0],[1,7,0]];

  // ======================= Pokémon structure (80 bytes in the box, 100 in the party) =======================
  var ORDERS = ['GAEM', 'GAME', 'GEAM', 'GEMA', 'GMAE', 'GMEA', 'AGEM', 'AGME', 'AEGM', 'AEMG', 'AMGE', 'AMEG',
    'EGAM', 'EGMA', 'EAGM', 'EAMG', 'EMGA', 'EMAG', 'MGAE', 'MGEA', 'MAGE', 'MAEG', 'MEGA', 'MEAG'];
  function decodeMon(u8, off, party, maxSpecies) {
    if (off + (party ? 100 : 80) > u8.length) return null;
    var pid = u32(u8, off), otid = u32(u8, off + 4);
    if (!pid && !otid) return null;
    var key = (pid ^ otid) >>> 0, d = new Uint8Array(48), sum = 0;
    for (var i = 0; i < 48; i += 4) {
      var w = (u32(u8, off + 32 + i) ^ key) >>> 0;
      d[i] = w & 0xFF; d[i + 1] = (w >>> 8) & 0xFF; d[i + 2] = (w >>> 16) & 0xFF; d[i + 3] = w >>> 24;
      sum = (sum + (w & 0xFFFF) + (w >>> 16)) & 0xFFFF;
    }
    if (sum !== u16(u8, off + 28)) return null;
    var ord = ORDERS[pid % 24], G = ord.indexOf('G') * 12, Aa = ord.indexOf('A') * 12, E = ord.indexOf('E') * 12, M = ord.indexOf('M') * 12;
    var species = u16(d, G);
    if (!species || species > (maxSpecies || 411)) return null;
    var iv = u32(d, M + 4);
    var mon = {
      pid: pid, otid: otid, nick: decode(u8, off + 8, 10), lang: u8[off + 18], species: species, item: u16(d, G + 2), exp: u32(d, G + 4), friendship: d[G + 9],
      moves: [u16(d, Aa), u16(d, Aa + 2), u16(d, Aa + 4), u16(d, Aa + 6)].filter(function (x) { return x > 0; }),
      evs: { hp: d[E], atk: d[E + 1], def: d[E + 2], spe: d[E + 3], spa: d[E + 4], spd: d[E + 5] },
      ivs: { hp: iv & 31, atk: (iv >>> 5) & 31, def: (iv >>> 10) & 31, spe: (iv >>> 15) & 31, spa: (iv >>> 20) & 31, spd: (iv >>> 25) & 31 },
      egg: !!((iv >>> 30) & 1), abilityBit: iv >>> 31, nature: pid % 25, metLevel: u16(d, M + 2) & 0x7F
    };
    if (party) {
      mon.status = u32(u8, off + 80); mon.level = u8[off + 84]; mon.hp = u16(u8, off + 86);
      mon.stats = { hp: u16(u8, off + 88), atk: u16(u8, off + 90), def: u16(u8, off + 92), spe: u16(u8, off + 94), spa: u16(u8, off + 96), spd: u16(u8, off + 98) };
      if (mon.level < 1 || mon.level > 100 || !mon.stats.hp || mon.hp > mon.stats.hp) return null;
    }
    return mon;
  }

  // ======================= save file (.sav) =======================
  function parseSav(u8) {
    if (u8.length < 0x1C000) return null;
    var best = null;
    [0, 0xE000].forEach(function (base) {
      var sec = {}, idx = -1, n = 0;
      for (var s = 0; s < 14; s++) {
        var o = base + s * 0x1000;
        if (u32(u8, o + 0xFF8) !== 0x08012025) return;
        var id = u16(u8, o + 0xFF4);
        if (id > 13) return;
        sec[id] = o; idx = u32(u8, o + 0xFFC); n++;
      }
      if (n === 14 && (!best || idx > best.idx)) best = { sec: sec, idx: idx };
    });
    if (!best) return null;
    var s0 = best.sec[0], s1 = best.sec[1];
    var res = { kind: 'sav', trainer: { name: decode(u8, s0, 7), tid: u16(u8, s0 + 0x0A), sid: u16(u8, s0 + 0x0C) }, party: [], boxes: [], boxNames: [] };
    var code = u32(u8, s0 + 0xAC);
    var offs = code === 1 ? [0x34, 0x234] : [0x234, 0x34];
    offs.some(function (po) {
      var cnt = u8[s1 + po];
      if (cnt < 1 || cnt > 6) return false;
      var list = [];
      for (var i = 0; i < cnt; i++) { var m = decodeMon(u8, s1 + po + 4 + i * 100, true); if (m) list.push(m); }
      if (!list.length) return false;
      res.party = list; res.frlg = po === 0x34; return true;
    });
    // PC: sections 5–13 joined (3968 bytes each, the last one 2000)
    var pc = new Uint8Array(3968 * 9), q = 0;
    for (var s = 5; s <= 13; s++) { var len = s === 13 ? 2000 : 3968; pc.set(u8.subarray(best.sec[s], best.sec[s] + len), q); q += len; }
    res.currentBox = pc[0];
    for (var b = 0; b < 420; b++) {
      var m = decodeMon(pc, 4 + b * 80, false);
      if (m) { m.box = Math.floor(b / 30); m.slot = b % 30; res.boxes.push(m); }
    }
    for (var bn = 0; bn < 14; bn++) res.boxNames.push(decode(pc, 0x8344 + bn * 9, 9));
    return res;
  }

  // ======================= emulator savestates (best effort) =======================
  // A savestate holds the RAM of the game. Party and boxes are found by scanning for valid (checksummed) Pokémon.
  function inflate(bytes, fmt) {
    if (typeof DecompressionStream === 'undefined') return Promise.resolve(null);
    try {
      var ds = new DecompressionStream(fmt);
      var stream = new Blob([bytes]).stream().pipeThrough(ds);
      return new Response(stream).arrayBuffer().then(function (b) { return new Uint8Array(b); }, function () { return null; });
    } catch (e) { return Promise.resolve(null); }
  }
  function blobsOf(u8) {
    var jobs = [Promise.resolve(u8)];
    if (u8[0] === 0x1F && u8[1] === 0x8B) jobs.push(inflate(u8, 'gzip'));
    if (u8[0] === 0x78) jobs.push(inflate(u8, 'deflate'));
    if (u8[0] === 0x89 && u8[1] === 0x50 && u8[2] === 0x4E && u8[3] === 0x47) {
      var p = 8;
      while (p + 12 <= u8.length) {
        var len = ((u8[p] << 24) | (u8[p + 1] << 16) | (u8[p + 2] << 8) | u8[p + 3]) >>> 0;
        var type = String.fromCharCode(u8[p + 4], u8[p + 5], u8[p + 6], u8[p + 7]);
        var data = u8.subarray(p + 8, p + 8 + len);
        if (!/^(IHDR|IDAT|IEND|PLTE|tEXt|iTXt|sRGB|gAMA|pHYs)$/.test(type)) {
          jobs.push(Promise.resolve(data));
          if (data[0] === 0x78) jobs.push(inflate(data, 'deflate'));
        }
        p += 12 + len;
      }
    }
    return Promise.all(jobs).then(function (l) { return l.filter(function (x) { return x && x.length; }); });
  }
  function scanState(u8) {
    var party = [], box = [];
    for (var p = 0; p + 80 <= u8.length; p += 4) {
      var bm = decodeMon(u8, p, false);
      if (!bm) continue;
      bm.at = p; box.push(bm);
      var pm = decodeMon(u8, p, true);
      if (pm) { pm.at = p; party.push(pm); }
    }
    if (!party.length && !box.length) return null;
    // player's OT ID = the most common one
    var cnt = {};
    party.concat(box).forEach(function (m) { cnt[m.otid] = (cnt[m.otid] || 0) + 1; });
    var ot = +Object.keys(cnt).sort(function (a, b) { return cnt[b] - cnt[a]; })[0];
    // party groups: consecutive at 100 bytes
    var groups = [], g = null;
    party.sort(function (a, b) { return a.at - b.at; }).forEach(function (m) {
      if (g && m.at === g[g.length - 1].at + 100 && g.length < 6) g.push(m); else { g = [m]; groups.push(g); }
    });
    groups = groups.filter(function (x) { return x.filter(function (m) { return m.otid === ot; }).length * 2 >= x.length; });
    groups.sort(function (a, b) {
      var ea = a.reduce(function (s, m) { return s + m.exp; }, 0), eb = b.reduce(function (s, m) { return s + m.exp; }, 0);
      return b.length - a.length || eb - ea;
    });
    var res = { kind: 'state', trainer: { name: '', tid: ot & 0xFFFF, sid: ot >>> 16 }, party: groups[0] || [], boxes: [], boxNames: [] };
    // Pokémon of party copies are no box Pokémon
    var inParty = {};
    groups.forEach(function (gr) { if (gr.length > 1 || gr === groups[0]) gr.forEach(function (m) { inParty[m.at] = 1; }); });
    box = box.filter(function (m) { return !inParty[m.at]; });
    // boxes: the 80-byte stride cluster with the most Pokémon; the box names (14 × 9 bytes) follow the 420 slots
    var byMod = {};
    box.forEach(function (m) { var k = m.at % 80; (byMod[k] = byMod[k] || []).push(m); });
    var bestK = null;
    Object.keys(byMod).forEach(function (k) { if (!bestK || byMod[k].length > byMod[bestK].length) bestK = k; });
    if (bestK !== null) {
      var list = byMod[bestK].sort(function (a, b) { return a.at - b.at; });
      // take the densest window of 420 slots
      var bi = 0, bc = 0;
      for (var i = 0, j = 0; i < list.length; i++) {
        while (list[i].at - list[j].at >= 420 * 80) j++;
        if (i - j + 1 > bc) { bc = i - j + 1; bi = j; }
      }
      var win = list.slice(bi, bi + bc), first = win[0].at, base = -1;
      for (var k = 0; k < 420 && base < 0; k++) {
        var cand = first - k * 80;
        if (cand < 4) break;
        var ok = true;
        for (var n = 0; n < 14 && ok; n++) if (!strictTextLoose(u8, cand + 420 * 80 + n * 9, 9)) ok = false;
        if (ok && win[win.length - 1].at < cand + 420 * 80) base = cand;
      }
      win.forEach(function (m) {
        if (base >= 0) { var idx = (m.at - base) / 80; m.box = Math.floor(idx / 30); m.slot = idx % 30; } else { m.box = -1; m.slot = 0; }
        res.boxes.push(m);
      });
      if (base >= 0) for (var bn = 0; bn < 14; bn++) res.boxNames.push(decode(u8, base + 420 * 80 + bn * 9, 9));
    }
    return res;
  }
  function strictTextLoose(u8, off, size) {
    var i = 0;
    for (; i < size; i++) { var b = u8[off + i]; if (b === 0xFF) break; if (!isTextByte(b)) return false; }
    return i > 0 && i < size;
  }
  // reads a .sav or a savestate; resolves to { kind, trainer, party, boxes, boxNames } or null
  function parseSave(buf) {
    var u8 = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
    var sav = parseSav(u8);
    if (sav) return Promise.resolve(sav);
    return blobsOf(u8).then(function (blobs) {
      var best = null;
      blobs.forEach(function (b) {
        var s = parseSav(b) || scanState(b);
        if (s && (!best || s.party.length + s.boxes.length > best.party.length + best.boxes.length)) best = s;
      });
      return best;
    });
  }

  // ======================= stats =======================
  var EXP_FN = [
    function (n) { return n * n * n; },
    function (n) { return n <= 50 ? Math.floor(n * n * n * (100 - n) / 50) : n <= 68 ? Math.floor(n * n * n * (150 - n) / 100) : n <= 98 ? Math.floor(n * n * n * Math.floor((1911 - 10 * n) / 3) / 500) : Math.floor(n * n * n * (160 - n) / 100); },
    function (n) { return n <= 15 ? Math.floor(n * n * n * (Math.floor((n + 1) / 3) + 24) / 50) : n <= 36 ? Math.floor(n * n * n * (n + 14) / 50) : Math.floor(n * n * n * (Math.floor(n / 2) + 32) / 50); },
    function (n) { return Math.floor(6 * n * n * n / 5) - 15 * n * n + 100 * n - 140; },
    function (n) { return Math.floor(4 * n * n * n / 5); },
    function (n) { return Math.floor(5 * n * n * n / 4); }
  ];
  function levelFromExp(growth, exp) {
    var f = EXP_FN[growth] || EXP_FN[0], lv = 1;
    while (lv < 100 && exp >= f(lv + 1)) lv++;
    return lv;
  }
  function natureMod(nature, stat, v) {
    var up = NAT_STATS[Math.floor(nature / 5)], down = NAT_STATS[nature % 5];
    if (up === down) return v;
    if (stat === up) return Math.floor(v * 110 / 100);
    if (stat === down) return Math.floor(v * 90 / 100);
    return v;
  }
  var STAT_IDX = { hp: 0, atk: 1, def: 2, spe: 3, spa: 4, spd: 5 };
  function calcStats(sp, level, ivs, evs, nature, isShedinja) {
    var r = {};
    Object.keys(STAT_IDX).forEach(function (k) {
      var b = sp.bs[STAT_IDX[k]], x = Math.floor((2 * b + (ivs[k] || 0) + Math.floor((evs[k] || 0) / 4)) * level / 100);
      r[k] = k === 'hp' ? (isShedinja ? 1 : x + level + 10) : natureMod(nature, k, x + 5);
    });
    return r;
  }
  function abilityOf(sp, bit) { return bit && sp.abilities[1] ? sp.abilities[1] : sp.abilities[0]; }
  function hiddenPower(ivs) {
    var o = ['hp', 'atk', 'def', 'spe', 'spa', 'spd'], tb = 0, pb = 0;
    o.forEach(function (k, i) { tb |= (ivs[k] & 1) << i; pb |= ((ivs[k] >> 1) & 1) << i; });
    var type = Math.floor(tb * 15 / 63) + 1;
    if (type >= T.MYSTERY) type++;
    return { type: type, power: Math.floor(pb * 40 / 63) + 30 };
  }

  // a battle-ready Pokémon from a save entry or a trainer party entry
  function fromSave(rom, m) {
    var sp = rom.species[m.species] || rom.species[0];
    var level = m.level || levelFromExp(sp.growth, m.exp);
    // party Pokémon carry the stats the game calculated; box Pokémon are calculated from base stats, IVs, EVs and nature
    var stats = m.stats && m.level ? { hp: m.stats.hp, atk: m.stats.atk, def: m.stats.def, spa: m.stats.spa, spd: m.stats.spd, spe: m.stats.spe }
      : calcStats(sp, level, m.ivs, m.evs, m.nature, sp.nat === 292);
    return { species: m.species, nat: sp.nat, level: level, stats: stats, types: sp.types.slice(), ability: abilityOf(sp, m.abilityBit), item: m.item,
      moves: m.moves.slice(), nature: m.nature, ivs: m.ivs, evs: m.evs, friendship: m.friendship, maxHP: stats.hp,
      hp: m.hp != null && m.stats ? Math.min(m.hp, stats.hp) : stats.hp, nick: m.nick, pid: m.pid };
  }
  function defaultMoves(rom, species, level) {
    var res = [];
    (rom.learnsets[species] || []).forEach(function (e) {
      if (e[0] > level) return;
      if (res.indexOf(e[1]) !== -1) return;
      if (res.length === 4) res.shift();
      res.push(e[1]);
    });
    return res;
  }
  // personality of trainer Pokémon (CreateNPCTrainerParty): decides nature and ability slot
  function trainerParty(rom, tr) {
    var hash = 0;
    var tsum = tr.nameBytes.reduce(function (s, b) { return s + b; }, 0);
    return tr.party.map(function (pm) {
      var sp = rom.species[pm.species] || rom.species[0];
      var pv = tr.double ? 0x80 : tr.female ? 0x78 : 0x88;
      hash += tsum;
      hash += sp.hashBytes.reduce(function (s, b) { return s + b; }, 0);
      pv = (pv + hash * 256) % 4294967296;
      var iv = Math.floor(pm.iv * 31 / 255), ivs = { hp: iv, atk: iv, def: iv, spe: iv, spa: iv, spd: iv }, evs = {};
      var nature = pv % 25, stats = calcStats(sp, pm.level, ivs, evs, nature, sp.nat === 292);
      return { species: pm.species, nat: sp.nat, level: pm.level, stats: stats, types: sp.types.slice(), ability: abilityOf(sp, pv & 1), item: pm.item,
        moves: pm.moves ? pm.moves.filter(function (x) { return x > 0; }) : defaultMoves(rom, pm.species, pm.level), nature: nature, ivs: ivs, evs: evs,
        friendship: sp.friendship, maxHP: stats.hp, hp: stats.hp, defaultMoves: !pm.moves };
    });
  }

  // ======================= damage =======================
  function stageMod(v, st) { var r = STAGE[st + 6]; return Math.floor(v * r[0] / r[1]); }
  function holdOf(rom, item) { var it = rom.items[item]; return it ? { hold: it.hold, param: it.param } : { hold: 0, param: 0 }; }
  function weatherOn(f, a, d) { return f.weather && f.weather !== 'none' && [a.ability, d.ability].indexOf(AB.CLOUD_NINE) === -1 && [a.ability, d.ability].indexOf(AB.AIR_LOCK) === -1; }
  function typeMultipliers(rom, type, def, foresight) {
    var list = [];
    for (var i = 0; i < rom.chart.length; i++) {
      var e = rom.chart[i];
      if (e[0] === 0xFE) { if (foresight) break; continue; }
      if (e[0] !== type) continue;
      if (e[1] === def.types[0]) list.push(e[2]);
      if (e[1] === def.types[1] && def.types[0] !== def.types[1]) list.push(e[2]);
    }
    return list;
  }
  function natOf(rom, sp) { return rom.species[sp] ? rom.species[sp].nat : 0; }
  // A = attacker, D = defender (from fromSave/trainerParty plus hp, status, stages, flashFire, player);
  // f = { weather, double, spread, reflect, lightScreen, helpingHand, charge, mudSport, waterSport, badges, foresight }
  function calc(rom, A, D, moveId, f) {
    f = f || {};
    var mv = rom.moves[moveId];
    var res = { move: moveId, rolls: [], crit: [], eff: 1, immune: false, notes: [], fixed: false, hits: 1, status: false };
    if (!mv) { res.status = true; return res; }
    var power = mv.power, type = mv.type, eff = mv.effect;
    var aSt = A.stages || {}, dSt = D.stages || {};
    var weather = weatherOn(f, A, D) ? f.weather : 'none';
    var aHold = holdOf(rom, A.item), dHold = holdOf(rom, D.item);
    var aNat = natOf(rom, A.species), dNat = natOf(rom, D.species);
    var dmgMult = 1;

    // dynamic power and type
    if (eff === EF.HIDDEN_POWER) { var hp = hiddenPower(A.ivs || {}); type = hp.type; power = hp.power; }
    if (eff === EF.WEATHER_BALL && weather !== 'none') {
      dmgMult = 2; type = weather === 'rain' ? T.WATER : weather === 'sun' ? T.FIRE : weather === 'sand' ? T.ROCK : T.ICE;
    }
    if (eff === EF.RETURN) power = Math.floor(10 * (A.friendship == null ? 255 : A.friendship) / 25);
    if (eff === EF.FRUSTRATION) power = Math.floor(10 * (255 - (A.friendship == null ? 0 : A.friendship)) / 25);
    if (eff === EF.FLAIL) {
      var x = Math.floor(48 * A.hp / A.maxHP);
      power = x <= 1 ? 200 : x <= 4 ? 150 : x <= 9 ? 100 : x <= 16 ? 80 : x <= 32 ? 40 : 20;
    }
    if (eff === EF.ERUPTION) power = Math.max(1, Math.floor(150 * A.hp / A.maxHP));
    if (eff === EF.LOW_KICK) {
      var w = (window.NATDEX && window.NATDEX[dNat] ? window.NATDEX[dNat][4] : 50) * 10;
      power = w < 100 ? 20 : w < 250 ? 40 : w < 500 ? 60 : w < 1000 ? 80 : w < 2000 ? 100 : 120;
    }
    if (eff === EF.MAGNITUDE) { power = 70; res.notes.push('magnitude'); }
    if (eff === EF.PRESENT) { power = 80; res.notes.push('present'); }
    if (eff === EF.FACADE && A.status) dmgMult = 2;
    if (eff === EF.SMELLINGSALT && D.status === 'par') dmgMult = 2;
    if (eff === EF.SPIT_UP) { power = 100; res.notes.push('spitup'); }
    res.type = type; res.power = power;
    if (!power && [EF.LEVEL_DAMAGE, EF.DRAGON_RAGE, EF.SONICBOOM, EF.SUPER_FANG, EF.PSYWAVE, EF.ENDEAVOR, EF.OHKO, EF.FLAIL, EF.ERUPTION, EF.LOW_KICK,
      EF.RETURN, EF.FRUSTRATION, EF.MAGNITUDE, EF.PRESENT, EF.HIDDEN_POWER, EF.COUNTER, EF.MIRROR_COAT, EF.BIDE, EF.SPIT_UP].indexOf(eff) === -1) { res.status = true; return res; }
    if ([EF.COUNTER, EF.MIRROR_COAT, EF.BIDE].indexOf(eff) !== -1) { res.status = true; res.notes.push('counter'); return res; }

    // immunities
    var muls = typeMultipliers(rom, type, D, f.foresight);
    var mulProduct = muls.reduce(function (s, m) { return s * m / 10; }, 1);
    res.eff = mulProduct;
    function immune(why) { res.immune = true; res.eff = 0; res.notes.push(why); return res; }
    if (mulProduct === 0) return immune('type');
    if (D.ability === AB.LEVITATE && type === T.GROUND) return immune('levitate');
    if (D.ability === AB.VOLT_ABSORB && type === T.ELECTRIC) return immune('voltabsorb');
    if (D.ability === AB.WATER_ABSORB && type === T.WATER) return immune('waterabsorb');
    if (D.ability === AB.FLASH_FIRE && type === T.FIRE) return immune('flashfire');
    if (D.ability === AB.SOUNDPROOF && SOUND_MOVES[moveId]) return immune('soundproof');
    if (D.ability === AB.WONDER_GUARD && mulProduct <= 1 && power) return immune('wonderguard');

    // fixed damage
    var fixed = null;
    if (eff === EF.LEVEL_DAMAGE) fixed = [A.level];
    else if (eff === EF.DRAGON_RAGE) fixed = [40];
    else if (eff === EF.SONICBOOM) fixed = [20];
    else if (eff === EF.SUPER_FANG) fixed = [Math.max(1, Math.floor(D.hp / 2))];
    else if (eff === EF.ENDEAVOR) fixed = [Math.max(0, D.hp - A.hp)];
    else if (eff === EF.PSYWAVE) { fixed = []; for (var r = 0; r <= 10; r++) fixed.push(Math.max(1, Math.floor(A.level * (r * 10 + 50) / 100))); }
    else if (eff === EF.OHKO) {
      if (A.level < D.level || D.ability === AB.STURDY) return immune(D.ability === AB.STURDY ? 'sturdy' : 'ohkolevel');
      fixed = [D.hp]; res.notes.push('ohko');
    }
    if (fixed) {
      res.fixed = true;
      for (var q = 0; q < 16; q++) res.rolls.push(fixed[Math.min(fixed.length - 1, Math.floor(q * fixed.length / 16))]);
      res.crit = res.rolls.slice();
      return finish(res, A, D, mv, eff);
    }

    // base damage (CalculateBaseDamage)
    function base(critMult, pw) {
      var atk = A.stats.atk, def = D.stats.def, spa = A.stats.spa, spd = D.stats.spd, movePower = pw;
      if (A.ability === AB.HUGE_POWER || A.ability === AB.PURE_POWER) atk *= 2;
      var badges = f.badges || 0;
      if (A.player && badges >= 1) atk = Math.floor(110 * atk / 100);
      if (D.player && badges >= 5) def = Math.floor(110 * def / 100);
      if (A.player && badges >= 7) spa = Math.floor(110 * spa / 100);
      if (D.player && badges >= 7) spd = Math.floor(110 * spd / 100);
      if (HE_TYPE[aHold.hold] === type) {
        if (isPhysical(type)) atk = Math.floor(atk * (aHold.param + 100) / 100); else spa = Math.floor(spa * (aHold.param + 100) / 100);
      }
      if (aHold.hold === HE.CHOICE_BAND) atk = Math.floor(150 * atk / 100);
      if (aHold.hold === HE.SOUL_DEW && (aNat === 380 || aNat === 381)) spa = Math.floor(150 * spa / 100);
      if (dHold.hold === HE.SOUL_DEW && (dNat === 380 || dNat === 381)) spd = Math.floor(150 * spd / 100);
      if (aHold.hold === HE.DEEP_SEA_TOOTH && aNat === 366) spa *= 2;
      if (dHold.hold === HE.DEEP_SEA_SCALE && dNat === 366) spd *= 2;
      if (aHold.hold === HE.LIGHT_BALL && aNat === 25) spa *= 2;
      if (dHold.hold === HE.METAL_POWDER && dNat === 132) def *= 2;
      if (aHold.hold === HE.THICK_CLUB && (aNat === 104 || aNat === 105)) atk *= 2;
      if (D.ability === AB.THICK_FAT && (type === T.FIRE || type === T.ICE)) spa = Math.floor(spa / 2);
      if (A.ability === AB.HUSTLE) atk = Math.floor(150 * atk / 100);
      if ((A.ability === AB.PLUS || A.ability === AB.MINUS) && f.plusMinus) spa = Math.floor(150 * spa / 100);
      if (A.ability === AB.GUTS && A.status) atk = Math.floor(150 * atk / 100);
      if (D.ability === AB.MARVEL_SCALE && D.status) def = Math.floor(150 * def / 100);
      if (type === T.ELECTRIC && f.mudSport) movePower = Math.floor(movePower / 2);
      if (type === T.FIRE && f.waterSport) movePower = Math.floor(movePower / 2);
      var pinch = A.hp <= Math.floor(A.maxHP / 3);
      if (pinch && ((type === T.GRASS && A.ability === AB.OVERGROW) || (type === T.FIRE && A.ability === AB.BLAZE) ||
        (type === T.WATER && A.ability === AB.TORRENT) || (type === T.BUG && A.ability === AB.SWARM))) movePower = Math.floor(150 * movePower / 100);
      if (eff === EF.EXPLOSION) def = Math.floor(def / 2);
      var dmg, helper;
      var doubleSpread = f.double && f.spread !== false && mv.target === MOVE_TARGET_BOTH;
      if (isPhysical(type)) {
        dmg = critMult === 2 ? ((aSt.atk || 0) > 0 ? stageMod(atk, aSt.atk) : atk) : stageMod(atk, aSt.atk || 0);
        dmg = dmg * movePower;
        dmg *= Math.floor(2 * A.level / 5) + 2;
        helper = critMult === 2 ? ((dSt.def || 0) < 0 ? stageMod(def, dSt.def) : def) : stageMod(def, dSt.def || 0);
        dmg = Math.floor(dmg / helper);
        dmg = Math.floor(dmg / 50);
        if (A.status === 'brn' && A.ability !== AB.GUTS) dmg = Math.floor(dmg / 2);
        if (f.reflect && critMult === 1) dmg = f.double && f.spread !== false ? 2 * Math.floor(dmg / 3) : Math.floor(dmg / 2);
        if (doubleSpread) dmg = Math.floor(dmg / 2);
        if (dmg === 0) dmg = 1;
      } else if (type === T.MYSTERY) {
        dmg = 0;
      } else {
        dmg = critMult === 2 ? ((aSt.spa || 0) > 0 ? stageMod(spa, aSt.spa) : spa) : stageMod(spa, aSt.spa || 0);
        dmg = dmg * movePower;
        dmg *= Math.floor(2 * A.level / 5) + 2;
        helper = critMult === 2 ? ((dSt.spd || 0) < 0 ? stageMod(spd, dSt.spd) : spd) : stageMod(spd, dSt.spd || 0);
        dmg = Math.floor(dmg / helper);
        dmg = Math.floor(dmg / 50);
        if (f.lightScreen && critMult === 1) dmg = f.double && f.spread !== false ? 2 * Math.floor(dmg / 3) : Math.floor(dmg / 2);
        if (doubleSpread) dmg = Math.floor(dmg / 2);
        if (weather === 'rain') { if (type === T.FIRE) dmg = Math.floor(dmg / 2); if (type === T.WATER) dmg = Math.floor(15 * dmg / 10); }
        if (moveId === 76 && (weather === 'rain' || weather === 'sand' || weather === 'hail')) dmg = Math.floor(dmg / 2);
        if (weather === 'sun') { if (type === T.FIRE) dmg = Math.floor(15 * dmg / 10); if (type === T.WATER) dmg = Math.floor(dmg / 2); }
        if (A.flashFire && type === T.FIRE) dmg = Math.floor(15 * dmg / 10);
      }
      dmg += 2;
      // Cmd_damagecalc
      dmg = dmg * critMult * dmgMult;
      if (f.charge && type === T.ELECTRIC) dmg *= 2;
      if (f.helpingHand) dmg = Math.floor(dmg * 15 / 10);
      // Cmd_typecalc
      if (A.types[0] === type || A.types[1] === type) dmg = Math.floor(dmg * 15 / 10);
      muls.forEach(function (m) { dmg = Math.floor(dmg * m / 10); if (dmg === 0) dmg = 1; });
      return dmg;
    }
    function rolls(b) {
      var out = [];
      for (var k = 15; k >= 0; k--) { var v = b ? Math.floor(b * (100 - k) / 100) : 0; if (b && v === 0) v = 1; out.push(v); }
      return out;
    }
    if (eff === EF.TRIPLE_KICK) {
      // three hits with 10, 20 and 30 power, each with its own random roll; shown as the total of all three
      var parts = [10, 20, 30].map(function (pw) { return [rolls(base(1, pw)), rolls(base(2, pw))]; });
      for (var z = 0; z < 16; z++) {
        res.rolls.push(parts[0][0][z] + parts[1][0][z] + parts[2][0][z]);
        res.crit.push(parts[0][1][z] + parts[1][1][z] + parts[2][1][z]);
      }
      res.dist = convolve(convolve(dist(parts[0][0]), dist(parts[1][0])), dist(parts[2][0]));
      res.notes.push('triplekick');
    } else {
      res.rolls = rolls(base(1, power));
      res.crit = rolls(base(2, power));
    }
    if (eff === EF.MULTI_HIT) { res.hits = [2, 5]; res.notes.push('multihit'); }
    if (eff === EF.DOUBLE_HIT || eff === EF.TWINEEDLE) { res.hits = 2; }
    if (eff === EF.EXPLOSION) res.notes.push('explosion');
    if (moveId === 76) res.notes.push('solarbeam');
    return finish(res, A, D, mv, eff);
  }
  function finish(res, A, D, mv, eff) {
    var hold = 0; // crit stage
    var crit = (eff === EF.HIGH_CRITICAL || eff === EF.SKY_ATTACK || eff === EF.BLAZE_KICK || eff === EF.POISON_TAIL) ? 1 : 0;
    res.critChance = (D.ability === AB.BATTLE_ARMOR || D.ability === AB.SHELL_ARMOR) ? 0 : 1 / CRIT_CHANCE[Math.min(4, crit + (A.critStage || 0) + hold)];
    res.min = res.rolls[0]; res.max = res.rolls[15];
    res.critMin = res.crit[0]; res.critMax = res.crit[15];
    // damage distribution of one use (multi-hit moves: all hits added up)
    var one = res.dist || dist(res.rolls);
    if (res.hits === 2) one = convolve(one, one);
    if (Array.isArray(res.hits)) {
      var d2 = convolve(one, one), d3 = convolve(d2, one), d4 = convolve(d3, one), d5 = convolve(d4, one);
      one = mix([[d2, 3 / 8], [d3, 3 / 8], [d4, 1 / 8], [d5, 1 / 8]]);
      res.multiMin = res.min * 2; res.multiMax = res.max * 5;
    } else if (res.hits === 2) { res.multiMin = res.min * 2; res.multiMax = res.max * 2; }
    res.useDist = one;
    return res;
  }
  // probability distributions as { damage: probability }
  function dist(rolls) { var d = {}; rolls.forEach(function (v) { d[v] = (d[v] || 0) + 1 / rolls.length; }); return d; }
  function convolve(a, b) {
    var r = {};
    Object.keys(a).forEach(function (x) { Object.keys(b).forEach(function (y) { var s = +x + +y; r[s] = (r[s] || 0) + a[x] * b[y]; }); });
    return r;
  }
  function mix(parts) { var r = {}; parts.forEach(function (p) { Object.keys(p[0]).forEach(function (k) { r[k] = (r[k] || 0) + p[0][k] * p[1]; }); }); return r; }
  // chance to KO a target with `hp` HP within n uses (no crits); returns { n, chance } for the first n (1–4) with chance > 0
  function koChance(res, hp) {
    if (!res.useDist || res.immune || res.status || res.max <= 0) return null;
    var d = res.useDist, acc = d;
    for (var n = 1; n <= 4; n++) {
      if (n > 1) acc = convolve(acc, d);
      var c = 0;
      Object.keys(acc).forEach(function (k) { if (+k >= hp) c += acc[k]; });
      if (c > 0.0001) return { n: n, chance: Math.min(1, c) };
      // keep the distribution small: merge into at most ~400 buckets
      if (Object.keys(acc).length > 2000) acc = squash(acc);
    }
    var avg = 0; Object.keys(d).forEach(function (k) { avg += k * d[k]; });
    return avg > 0 ? { n: Math.ceil(hp / avg), chance: 0, approx: true } : null;
  }
  function squash(d) {
    var keys = Object.keys(d).map(Number).sort(function (a, b) { return a - b; }), step = Math.ceil((keys[keys.length - 1] - keys[0]) / 400) || 1, r = {};
    keys.forEach(function (k) { var b = keys[0] + Math.floor((k - keys[0]) / step) * step; r[b] = (r[b] || 0) + d[k]; });
    return r;
  }
  // effective speed for the turn order
  function speedOf(rom, m, f) {
    var s = stageMod(m.stats.spe, (m.stages && m.stages.spe) || 0);
    if (m.player && (f.badges || 0) >= 3) s = Math.floor(110 * s / 100);
    var w = f.weather;
    if (m.ability === AB.SWIFT_SWIM && w === 'rain') s *= 2;
    if (m.ability === AB.CHLOROPHYLL && w === 'sun') s *= 2;
    if (holdOf(rom, m.item).hold === HE.MACHO_BRACE) s = Math.floor(s / 2);
    if (m.status === 'par') s = Math.floor(s / 4);
    return s;
  }

  window.GEN3 = {
    TYPES: TYPES, NATURES: NATURES, NAT_STATS: NAT_STATS, AB: AB, EF: EF,
    parseRom: parseRom, parseSave: parseSave, parseSav: parseSav, decodeMon: decodeMon, decode: decode,
    fromSave: fromSave, trainerParty: trainerParty, defaultMoves: defaultMoves, calcStats: calcStats, levelFromExp: levelFromExp,
    hiddenPower: hiddenPower, calc: calc, koChance: koChance, speedOf: speedOf, defaultNat: defaultNat, typeMultipliers: typeMultipliers,
    dist: dist, convolve: convolve, mix: mix, inflate: inflate, blobsOf: blobsOf
  };
})();

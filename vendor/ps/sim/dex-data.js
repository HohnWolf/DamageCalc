"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var dex_data_exports = {};
__export(dex_data_exports, {
  BasicEffect: () => BasicEffect,
  DexNatures: () => DexNatures,
  DexStats: () => DexStats,
  DexTypes: () => DexTypes,
  Nature: () => Nature,
  OTHER_NAME_TABLES: () => OTHER_NAME_TABLES,
  TypeInfo: () => TypeInfo,
  assignMissingFields: () => assignMissingFields,
  toID: () => toID
});
module.exports = __toCommonJS(dex_data_exports);
var import_utils = require("../lib/utils");
function toID(text) {
  if (typeof text !== "string") {
    if (text) text = text.id || text.userid || text.roomid || text;
    if (typeof text === "number") text = `${text}`;
    else if (typeof text !== "string") return "";
  }
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "");
}
function assignMissingFields(self, data) {
  for (const k in data) {
    if (k in self) continue;
    self[k] = data[k];
  }
}
const OTHER_NAME_TABLES = [
  "TypeNames",
  "NatureNames",
  "GenderNames",
  "EggGroupNames",
  "ColorNames",
  "StatusNames",
  "TargetNames",
  "StatNames",
  "StatMediumNames",
  "StatShortNames"
];
class BasicEffect {
  /**
   * ID. This will be a lowercase version of the name with all the
   * non-alphanumeric characters removed. So, for instance, "Mr. Mime"
   * becomes "mrmime", and "Basculin-Blue-Striped" becomes
   * "basculinbluestriped".
   */
  id;
  /**
   * Name. Currently does not support Unicode letters, so "Flabébé"
   * is "Flabebe" and "Nidoran♀" is "Nidoran-F".
   */
  name;
  /**
   * Full name. Prefixes the name with the effect type. For instance,
   * Leftovers would be "item: Leftovers", confusion the status
   * condition would be "confusion", etc.
   */
  fullname;
  /** Whether it's a move, item, ability, etc. */
  effectType;
  /**
   * Does it exist? For historical reasons, when you use an accessor
   * for an effect that doesn't exist, you get a dummy effect that
   * doesn't do anything, and this field set to false.
   */
  exists;
  /**
   * Dex number? For a Pokemon, this is the National Dex number. For
   * other effects, this is often an internal ID (e.g. a move
   * number). Not all effects have numbers, this will be 0 if it
   * doesn't. Nonstandard effects (e.g. CAP effects) will have
   * negative numbers.
   */
  num;
  /**
   * The generation of Pokemon game this was INTRODUCED (NOT
   * necessarily the current gen being simulated.) Not all effects
   * track generation; this will be 0 if not known.
   */
  gen;
  /**
   * Is this item/move/ability/pokemon nonstandard? Specified for effects
   * that have no use in standard formats: made-up pokemon (CAP),
   * glitches (MissingNo etc), Pokestar pokemon, etc.
   */
  isNonstandard;
  /** For Hidden Power and Gigantamax forms - see NONSTANDARD.md */
  placeholderFor;
  /** The duration of the condition - only for pure conditions. */
  duration;
  /** Whether or not the condition is ignored by Baton Pass - only for pure conditions. */
  noCopy;
  /** Whether or not the condition affects fainted Pokemon. */
  affectsFainted;
  tags;
  /** ??? */
  sourceEffect;
  constructor(data) {
    this.name = import_utils.Utils.getString(data.name).trim();
    this.id = toID(this.name);
    this.fullname = import_utils.Utils.getString(data.fullname) || this.name;
    this.effectType = import_utils.Utils.getString(data.effectType) || "Condition";
    this.exists = data.exists ?? !!this.id;
    this.num = data.num || 0;
    this.gen = data.gen || 0;
    this.isNonstandard = data.isNonstandard || null;
    this.duration = data.duration;
    this.noCopy = !!data.noCopy;
    this.affectsFainted = !!data.affectsFainted;
    this.sourceEffect = data.sourceEffect || "";
  }
  toString() {
    return this.name;
  }
}
class Nature extends BasicEffect {
  effectType;
  plus;
  minus;
  constructor(data) {
    super(data);
    this.fullname = `nature: ${this.name}`;
    this.effectType = "Nature";
    this.gen = 3;
    this.plus = data.plus || void 0;
    this.minus = data.minus || void 0;
    assignMissingFields(this, data);
  }
}
const EMPTY_NATURE = import_utils.Utils.deepFreeze(new Nature({ name: "", exists: false }));
class DexNatures {
  dex;
  natureCache = /* @__PURE__ */ new Map();
  allCache = null;
  constructor(dex) {
    this.dex = dex;
  }
  get(name) {
    if (name && typeof name !== "string") return name;
    return this.getByID(toID(name));
  }
  getByID(id) {
    if (id === "" || id === "constructor") return EMPTY_NATURE;
    let nature = this.natureCache.get(id);
    if (nature) return nature;
    const alias = this.dex.getAlias(id);
    if (alias) {
      nature = this.get(alias);
      if (nature.exists) {
        this.natureCache.set(id, nature);
      }
      return nature;
    }
    if (id && this.dex.data.Natures.hasOwnProperty(id)) {
      const natureData = this.dex.data.Natures[id];
      nature = new Nature(natureData);
      if (nature.gen > this.dex.gen) nature.isNonstandard = "Future";
    } else {
      nature = new Nature({ name: id, exists: false });
    }
    if (nature.exists) this.natureCache.set(id, this.dex.deepFreeze(nature));
    return nature;
  }
  all() {
    if (this.allCache) return this.allCache;
    const natures = [];
    for (const id in this.dex.data.Natures) {
      natures.push(this.getByID(id));
    }
    this.allCache = Object.freeze(natures);
    return this.allCache;
  }
}
class TypeInfo {
  /**
   * ID. This will be a lowercase version of the name with all the
   * non-alphanumeric characters removed. e.g. 'flying'
   */
  id;
  /** Name. e.g. 'Flying' */
  name;
  /** Effect type. */
  effectType;
  /**
   * Does it exist? For historical reasons, when you use an accessor
   * for an effect that doesn't exist, you get a dummy effect that
   * doesn't do anything, and this field set to false.
   */
  exists;
  /**
   * The generation of Pokemon game this was INTRODUCED (NOT
   * necessarily the current gen being simulated.) Not all effects
   * track generation; this will be 0 if not known.
   */
  gen;
  /**
   * Set to 'Future' for types before they're released (like Fairy
   * in Gen 5 or Dark in Gen 1).
   */
  isNonstandard;
  /**
   * Type chart, attackingTypeName:result, effectid:result
   * result is: 0 = normal, 1 = weakness, 2 = resistance, 3 = immunity
   */
  damageTaken;
  /** The IVs to get this Type Hidden Power (in gen 3 and later) */
  HPivs;
  /** The DVs to get this Type Hidden Power (in gen 2). */
  HPdvs;
  constructor(data) {
    this.name = data.name;
    this.id = data.id;
    this.effectType = import_utils.Utils.getString(data.effectType) || "Type";
    this.exists = data.exists ?? !!this.id;
    this.gen = data.gen || 0;
    this.isNonstandard = data.isNonstandard || null;
    this.damageTaken = data.damageTaken || {};
    this.HPivs = data.HPivs || {};
    this.HPdvs = data.HPdvs || {};
    assignMissingFields(this, data);
  }
  toString() {
    return this.name;
  }
}
const EMPTY_TYPE_INFO = import_utils.Utils.deepFreeze(new TypeInfo({ name: "", id: "", exists: false, effectType: "EffectType" }));
class DexTypes {
  dex;
  typeCache = /* @__PURE__ */ new Map();
  allCache = null;
  namesCache = null;
  constructor(dex) {
    this.dex = dex;
  }
  get(name) {
    if (name && typeof name !== "string") return name;
    return this.getByID(toID(name));
  }
  getByID(id) {
    if (id === "" || id === "constructor") return EMPTY_TYPE_INFO;
    let type = this.typeCache.get(id);
    if (type) return type;
    const typeName = id.charAt(0).toUpperCase() + id.substr(1);
    if (typeName && this.dex.data.TypeChart.hasOwnProperty(id)) {
      type = new TypeInfo({ name: typeName, id, ...this.dex.data.TypeChart[id] });
    } else {
      type = new TypeInfo({ name: typeName, id, exists: false, effectType: "EffectType" });
    }
    if (type.exists) this.typeCache.set(id, this.dex.deepFreeze(type));
    return type;
  }
  names() {
    if (this.namesCache) return this.namesCache;
    this.namesCache = this.all().filter((type) => !type.isNonstandard).map((type) => type.name);
    return this.namesCache;
  }
  isName(name) {
    if (!name) return false;
    const id = name.toLowerCase();
    const typeName = id.charAt(0).toUpperCase() + id.substr(1);
    return name === typeName && this.dex.data.TypeChart.hasOwnProperty(id);
  }
  all() {
    if (this.allCache) return this.allCache;
    const types = [];
    for (const id in this.dex.data.TypeChart) {
      types.push(this.getByID(id));
    }
    this.allCache = Object.freeze(types);
    return this.allCache;
  }
}
const idsCache = ["hp", "atk", "def", "spa", "spd", "spe"];
const reverseCache = {
  __proto: null,
  "hitpoints": "hp",
  "attack": "atk",
  "defense": "def",
  "specialattack": "spa",
  "spatk": "spa",
  "spattack": "spa",
  "specialatk": "spa",
  "special": "spa",
  "spc": "spa",
  "specialdefense": "spd",
  "spdef": "spd",
  "spdefense": "spd",
  "specialdef": "spd",
  "speed": "spe"
};
class DexStats {
  shortNames;
  mediumNames;
  names;
  constructor(dex) {
    if (dex.gen !== 1) {
      this.shortNames = {
        __proto__: null,
        hp: "HP",
        atk: "Atk",
        def: "Def",
        spa: "SpA",
        spd: "SpD",
        spe: "Spe"
      };
      this.mediumNames = {
        __proto__: null,
        hp: "HP",
        atk: "Attack",
        def: "Defense",
        spa: "Sp. Atk",
        spd: "Sp. Def",
        spe: "Speed"
      };
      this.names = {
        __proto__: null,
        hp: "HP",
        atk: "Attack",
        def: "Defense",
        spa: "Special Attack",
        spd: "Special Defense",
        spe: "Speed"
      };
    } else {
      this.shortNames = {
        __proto__: null,
        hp: "HP",
        atk: "Atk",
        def: "Def",
        spa: "Spc",
        spd: "[SpD]",
        spe: "Spe"
      };
      this.mediumNames = {
        __proto__: null,
        hp: "HP",
        atk: "Attack",
        def: "Defense",
        spa: "Special",
        spd: "[Sp. Def]",
        spe: "Speed"
      };
      this.names = {
        __proto__: null,
        hp: "HP",
        atk: "Attack",
        def: "Defense",
        spa: "Special",
        spd: "[Special Defense]",
        spe: "Speed"
      };
    }
  }
  getID(name) {
    if (name === "Spd") return "spe";
    const id = toID(name);
    if (reverseCache[id]) return reverseCache[id];
    if (idsCache.includes(id)) return id;
    return null;
  }
  ids() {
    return idsCache;
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  BasicEffect,
  DexNatures,
  DexStats,
  DexTypes,
  Nature,
  OTHER_NAME_TABLES,
  TypeInfo,
  assignMissingFields,
  toID
});

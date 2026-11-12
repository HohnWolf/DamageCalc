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
var dex_items_exports = {};
__export(dex_items_exports, {
  DexItems: () => DexItems,
  Item: () => Item
});
module.exports = __toCommonJS(dex_items_exports);
var import_dex_data = require("./dex-data");
var import_utils = require("../lib/utils");
class Item extends import_dex_data.BasicEffect {
  /**
   * A Move-like object depicting what happens when Fling is used on
   * this item.
   */
  fling;
  /**
   * If this is a Drive: The type it turns Techno Blast into.
   * undefined, if not a Drive.
   */
  onDrive;
  /**
   * If this is a Memory: The type it turns Multi-Attack into.
   * undefined, if not a Memory.
   */
  onMemory;
  /**
   * If this is a mega stone: A pair (e.g. Charizard: Charizard-Mega-X) of the
   * forme this allows transformation from and into.
   * undefined, if not a mega stone.
   */
  megaStone;
  /**
   * If this is a Z crystal: true if the Z Crystal is generic
   * (e.g. Firium Z). If species-specific, the name
   * (e.g. Inferno Overdrive) of the Z Move this crystal allows
   * the use of.
   * undefined, if not a Z crystal.
   */
  zMove;
  /**
   * If this is a generic Z crystal: The type (e.g. Fire) of the
   * Z Move this crystal allows the use of (e.g. Fire)
   * undefined, if not a generic Z crystal
   */
  zMoveType;
  /**
   * If this is a species-specific Z crystal: The name
   * (e.g. Play Rough) of the move this crystal requires its
   * holder to know to use its Z move.
   * undefined, if not a species-specific Z crystal
   */
  zMoveFrom;
  /**
   * If this is a species-specific Z crystal: An array of the
   * species of Pokemon that can use this crystal's Z move.
   * Note that these are the full names, e.g. 'Mimikyu-Busted'
   * undefined, if not a species-specific Z crystal
   */
  itemUser;
  /** Is this item a Berry? */
  isBerry;
  /** Whether or not this item ignores the Klutz ability. */
  ignoreKlutz;
  /** The type the holder will change into if it is an Arceus. */
  onPlate;
  /** Is this item a Gem? */
  isGem;
  /** Is this item a Pokeball? */
  isPokeball;
  /** Is this item a Red or Blue Orb? */
  isPrimalOrb;
  constructor(data) {
    super(data);
    this.fullname = `item: ${this.name}`;
    this.effectType = "Item";
    this.fling = data.fling || void 0;
    this.onDrive = data.onDrive || void 0;
    this.onMemory = data.onMemory || void 0;
    this.megaStone = data.megaStone || void 0;
    this.zMove = data.zMove || void 0;
    this.zMoveType = data.zMoveType || void 0;
    this.zMoveFrom = data.zMoveFrom || void 0;
    this.itemUser = data.itemUser || void 0;
    this.isBerry = !!data.isBerry;
    this.ignoreKlutz = !!data.ignoreKlutz;
    this.onPlate = data.onPlate || void 0;
    this.isGem = !!data.isGem;
    this.isPokeball = !!data.isPokeball;
    this.isPrimalOrb = !!data.isPrimalOrb;
    if (!this.gen) {
      if (this.num >= 1124) {
        this.gen = 9;
      } else if (this.num >= 927) {
        this.gen = 8;
      } else if (this.num >= 689) {
        this.gen = 7;
      } else if (this.num >= 577) {
        this.gen = 6;
      } else if (this.num >= 537) {
        this.gen = 5;
      } else if (this.num >= 377) {
        this.gen = 4;
      } else {
        this.gen = 3;
      }
    }
    if (this.isBerry) this.fling = { basePower: 10 };
    if (this.onPlate && this.id.endsWith("plate")) this.fling = { basePower: 90 };
    if (this.onDrive) this.fling = { basePower: 70 };
    if (this.megaStone) this.fling = { basePower: 80 };
    if (this.onMemory) this.fling = { basePower: 50 };
    (0, import_dex_data.assignMissingFields)(this, data);
  }
}
const EMPTY_ITEM = import_utils.Utils.deepFreeze(new Item({ name: "", exists: false }));
class DexItems {
  dex;
  itemCache = /* @__PURE__ */ new Map();
  allCache = null;
  constructor(dex) {
    this.dex = dex;
  }
  get(name) {
    if (name && typeof name !== "string") return name;
    const id = name ? (0, import_dex_data.toID)(name.trim()) : "";
    return this.getByID(id);
  }
  getByID(id) {
    if (id === "" || id === "constructor") return EMPTY_ITEM;
    let item = this.itemCache.get(id);
    if (item) return item;
    if (this.dex.getAlias(id)) {
      item = this.get(this.dex.getAlias(id));
      if (item.exists) {
        this.itemCache.set(id, item);
      }
      return item;
    }
    if (id && !this.dex.data.Items[id] && this.dex.data.Items[id + "berry"]) {
      item = this.getByID(id + "berry");
      this.itemCache.set(id, item);
      return item;
    }
    if (id && this.dex.data.Items.hasOwnProperty(id)) {
      const itemData = this.dex.data.Items[id];
      item = new Item({
        name: id,
        ...itemData
      });
      if (item.gen > this.dex.gen) {
        item.isNonstandard = "Future";
      }
      if (this.dex.parentMod) {
        const parent = this.dex.mod(this.dex.parentMod);
        if (itemData === parent.data.Items[id]) {
          const parentItem = parent.items.getByID(id);
          if (item.isNonstandard === parentItem.isNonstandard) {
            item = parentItem;
          }
        }
      }
    } else {
      item = new Item({ name: id, exists: false });
    }
    if (item.exists) this.itemCache.set(id, this.dex.deepFreeze(item));
    return item;
  }
  all() {
    if (this.allCache) return this.allCache;
    const items = [];
    for (const id in this.dex.data.Items) {
      items.push(this.getByID(id));
    }
    this.allCache = Object.freeze(items);
    return this.allCache;
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  DexItems,
  Item
});

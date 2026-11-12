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
var dex_moves_exports = {};
__export(dex_moves_exports, {
  DataMove: () => DataMove,
  DexMoves: () => DexMoves
});
module.exports = __toCommonJS(dex_moves_exports);
var import_utils = require("../lib/utils");
var import_dex_data = require("./dex-data");
class DataMove extends import_dex_data.BasicEffect {
  /** Move type. */
  type;
  /** Move target. */
  target;
  /** Move base power. */
  basePower;
  /** Move base accuracy. True denotes a move that always hits. */
  accuracy;
  /** Critical hit ratio. Defaults to 1. */
  critRatio;
  /**
   * Base move type. This is the move type as specified by the games,
   * tracked because it often differs from the real move type.
   */
  baseMoveType;
  /**
   * Secondary effect. You usually don't want to access this
   * directly; but through the secondaries array.
   */
  secondary;
  /**
   * Secondary effects. An array because there can be more than one
   * (for instance, Fire Fang has both a burn and a flinch
   * secondary).
   */
  secondaries;
  /**
   * Moves manually boosted by Sheer Force.
   * e.g. Electro Shot and Order Up.
   */
  hasSheerForceBoost;
  /**
   * Move priority. Higher priorities go before lower priorities,
   * trumping the Speed stat.
   */
  priority;
  /** Move category. */
  category;
  /**
   * Pokemon for the attack stat. Ability and Item damage modifiers still come from the real attacker.
   */
  overrideOffensivePokemon;
  /**
   * Physical moves use attack stat modifiers, special moves use special attack stat modifiers.
   */
  overrideOffensiveStat;
  /**
   * Pokemon for the defense stat. Ability and Item damage modifiers still come from the real defender.
   */
  overrideDefensivePokemon;
  /**
   * uses modifiers that match the new stat
   */
  overrideDefensiveStat;
  /** Whether or not this move ignores negative attack boosts. */
  ignoreNegativeOffensive;
  /** Whether or not this move ignores positive defense boosts. */
  ignorePositiveDefensive;
  /** Whether or not this move ignores attack boosts. */
  ignoreOffensive;
  /** Whether or not this move ignores defense boosts. */
  ignoreDefensive;
  /**
   * Whether or not this move ignores type immunities. Defaults to
   * true for Status moves and false for Physical/Special moves.
   *
   * If an Object, its keys represent the types whose immunities are
   * ignored, and its values should only be true.
   */
  ignoreImmunity;
  /** Base move PP. */
  pp;
  /** Whether or not this move can receive PP boosts. */
  noPPBoosts;
  /** What status does this move set? */
  status;
  /** What weather does this move set? */
  weather;
  /** Is this move a Z-Move? */
  isZ;
  /** Is this move a Max move? string = Gigantamax species name */
  isMax;
  flags;
  /** Whether or not the user must switch after using this move. */
  selfSwitch;
  /** Whether or not the move ignores abilities. */
  ignoreAbility;
  /**
   * Move damage against the current target
   * false = move will always fail with "But it failed!"
   * null = move will always silently fail
   * undefined = move does not deal fixed damage
   */
  damage;
  /** Whether or not this move hit multiple targets. */
  spreadHit;
  /** Forces the move to get STAB even if the type doesn't match. */
  forceSTAB;
  volatileStatus;
  constructor(data) {
    super(data);
    if (data.placeholderFor) this.id = (0, import_dex_data.toID)(data.placeholderFor);
    this.fullname = `move: ${this.name}`;
    this.effectType = "Move";
    this.type = import_utils.Utils.getString(data.type);
    this.target = data.target;
    this.basePower = Number(data.basePower);
    this.accuracy = data.accuracy;
    this.critRatio = Number(data.critRatio) || 1;
    this.baseMoveType = import_utils.Utils.getString(data.baseMoveType) || this.type;
    this.secondary = data.secondary || void 0;
    this.secondaries = data.secondaries || this.secondary && [this.secondary] || void 0;
    this.hasSheerForceBoost = data.hasSheerForceBoost || false;
    this.priority = Number(data.priority) || 0;
    this.category = data.category;
    this.overrideOffensiveStat = data.overrideOffensiveStat || void 0;
    this.overrideOffensivePokemon = data.overrideOffensivePokemon || void 0;
    this.overrideDefensiveStat = data.overrideDefensiveStat || void 0;
    this.overrideDefensivePokemon = data.overrideDefensivePokemon || void 0;
    this.ignoreNegativeOffensive = !!data.ignoreNegativeOffensive;
    this.ignorePositiveDefensive = !!data.ignorePositiveDefensive;
    this.ignoreOffensive = !!data.ignoreOffensive;
    this.ignoreDefensive = !!data.ignoreDefensive;
    this.ignoreImmunity = data.ignoreImmunity !== void 0 ? data.ignoreImmunity : this.category === "Status";
    this.pp = Number(data.pp);
    this.noPPBoosts = !!(data.noPPBoosts ?? data.isZ);
    this.status = data.status || void 0;
    this.weather = data.weather || void 0;
    this.isZ = data.isZ || false;
    this.isMax = data.isMax || false;
    this.flags = data.flags || {};
    this.selfSwitch = (typeof data.selfSwitch === "string" ? data.selfSwitch : data.selfSwitch) || void 0;
    this.ignoreAbility = data.ignoreAbility || false;
    this.damage = data.damage;
    this.spreadHit = data.spreadHit || false;
    this.forceSTAB = !!data.forceSTAB;
    this.volatileStatus = typeof data.volatileStatus === "string" ? data.volatileStatus : void 0;
    if (this.category !== "Status" && !data.maxMove && this.id !== "struggle") {
      this.maxMove = { basePower: 1 };
      if (this.isMax || this.isZ) {
      } else if (!this.basePower) {
        this.maxMove.basePower = 100;
      } else if (["Fighting", "Poison"].includes(this.type)) {
        if (this.basePower >= 150) {
          this.maxMove.basePower = 100;
        } else if (this.basePower >= 110) {
          this.maxMove.basePower = 95;
        } else if (this.basePower >= 75) {
          this.maxMove.basePower = 90;
        } else if (this.basePower >= 65) {
          this.maxMove.basePower = 85;
        } else if (this.basePower >= 55) {
          this.maxMove.basePower = 80;
        } else if (this.basePower >= 45) {
          this.maxMove.basePower = 75;
        } else {
          this.maxMove.basePower = 70;
        }
      } else {
        if (this.basePower >= 150) {
          this.maxMove.basePower = 150;
        } else if (this.basePower >= 110) {
          this.maxMove.basePower = 140;
        } else if (this.basePower >= 75) {
          this.maxMove.basePower = 130;
        } else if (this.basePower >= 65) {
          this.maxMove.basePower = 120;
        } else if (this.basePower >= 55) {
          this.maxMove.basePower = 110;
        } else if (this.basePower >= 45) {
          this.maxMove.basePower = 100;
        } else {
          this.maxMove.basePower = 90;
        }
      }
    }
    if (this.category !== "Status" && !data.zMove && !this.isZ && !this.isMax && this.id !== "struggle") {
      let basePower = this.basePower;
      this.zMove = {};
      if (Array.isArray(data.multihit)) basePower *= 3;
      if (!basePower) {
        this.zMove.basePower = 100;
      } else if (basePower >= 140) {
        this.zMove.basePower = 200;
      } else if (basePower >= 130) {
        this.zMove.basePower = 195;
      } else if (basePower >= 120) {
        this.zMove.basePower = 190;
      } else if (basePower >= 110) {
        this.zMove.basePower = 185;
      } else if (basePower >= 100) {
        this.zMove.basePower = 180;
      } else if (basePower >= 90) {
        this.zMove.basePower = 175;
      } else if (basePower >= 80) {
        this.zMove.basePower = 160;
      } else if (basePower >= 70) {
        this.zMove.basePower = 140;
      } else if (basePower >= 60) {
        this.zMove.basePower = 120;
      } else {
        this.zMove.basePower = 100;
      }
    }
    if (!this.gen) {
      if (this.num >= 827 && !this.isMax) {
        this.gen = 9;
      } else if (this.num >= 743) {
        this.gen = 8;
      } else if (this.num >= 622) {
        this.gen = 7;
      } else if (this.num >= 560) {
        this.gen = 6;
      } else if (this.num >= 468) {
        this.gen = 5;
      } else if (this.num >= 355) {
        this.gen = 4;
      } else if (this.num >= 252) {
        this.gen = 3;
      } else if (this.num >= 166) {
        this.gen = 2;
      } else if (this.num >= 1) {
        this.gen = 1;
      }
    }
    (0, import_dex_data.assignMissingFields)(this, data);
  }
}
const EMPTY_MOVE = import_utils.Utils.deepFreeze(new DataMove({ name: "", exists: false }));
class DexMoves {
  dex;
  moveCache = /* @__PURE__ */ new Map();
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
    if (id === "" || id === "constructor") return EMPTY_MOVE;
    let move = this.moveCache.get(id);
    if (move) return move;
    if (this.dex.getAlias(id)) {
      move = this.get(this.dex.getAlias(id));
      if (move.exists) {
        this.moveCache.set(id, move);
      }
      return move;
    }
    if (id.startsWith("hiddenpower")) {
      id = /([a-z]*)([0-9]*)/.exec(id)[1];
    }
    if (id && this.dex.data.Moves.hasOwnProperty(id)) {
      const moveData = this.dex.data.Moves[id];
      move = new DataMove({
        name: id,
        ...moveData
      });
      if (move.gen > this.dex.gen) {
        move.isNonstandard = "Future";
      }
      if (this.dex.parentMod) {
        const parentMod = this.dex.mod(this.dex.parentMod);
        if (moveData === parentMod.data.Moves[id]) {
          const parentMove = parentMod.moves.getByID(id);
          if (move.isNonstandard === parentMove.isNonstandard) {
            move = parentMove;
          }
        }
      }
    } else {
      move = new DataMove({
        name: id,
        exists: false
      });
    }
    if (move.exists) this.moveCache.set(id, this.dex.deepFreeze(move));
    return move;
  }
  all() {
    if (this.allCache) return this.allCache;
    const moves = [];
    for (const id in this.dex.data.Moves) {
      moves.push(this.getByID(id));
    }
    this.allCache = Object.freeze(moves);
    return this.allCache;
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  DataMove,
  DexMoves
});

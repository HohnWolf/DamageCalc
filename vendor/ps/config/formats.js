'use strict';
// Only the Champions VGC formats. Regulation switch: change FORMAT_ID in js/meta/format.js.
// Names match the official config/formats.ts entries so the ids stay
// gen9championsvgc2026regmc and gen9championsvgc2026regmb.
exports.Formats = [
  {
    name: "[Gen 9 Champions] VGC 2026 Reg M-C",
    mod: "champions",
    gameType: "doubles",
    bestOfDefault: true,
    ruleset: ["Flat Rules", "VGC Timer", "Open Team Sheets"],
  },
  {
    name: "[Gen 9 Champions] VGC 2026 Reg M-B",
    mod: "championsregmb",
    gameType: "doubles",
    searchShow: false,
    bestOfDefault: true,
    ruleset: ["Flat Rules", "VGC Timer", "Open Team Sheets"],
  },
];

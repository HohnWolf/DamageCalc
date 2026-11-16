// Matchlog: feste ROIs für Pokémon Champions Doppelkampf, gemessen an 1920×1080
// (layout_1080p_doubles). Kästen sind [x0,y0,x1,y1]. scale() rechnet sie auf die echte Framegröße um.
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.CCMatchlogLayout = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  var W = 1920, H = 1080;
  var L = {
    teamTitle: [700, 230, 1220, 340],
    modeHeader: [720, 16, 1200, 70],
    teamOwn: { x0: 85, x1: 620, y0: 155, pitch: 126, h: 108, n: 6,
      name: [50, 8, 360, 52], item: [70, 52, 400, 100] },
    standbyOwn: { x0: 280, x1: 640, y0: 170, pitch: 126, h: 115, n: 6 },
    battleText: [260, 770, 1680, 890],
    wait: [760, 270, 1180, 370],
    bannerOwn: [0, 370, 700, 510],
    bannerOwnStrip: [140, 382, 660, 402],
    bannerOwn1: [150, 392, 660, 448],
    bannerOwn2: [150, 440, 660, 505],
    bannerOppStrip: [1260, 382, 1780, 402],
    bannerOpp1: [1260, 392, 1780, 448],
    bannerOpp2: [1260, 440, 1780, 505],
    // KP-Ziffern liegen weiter links als die erste Messung; an match01 t75 nachgemessen.
    ownHp: [[190, 1004, 425, 1052], [580, 1004, 825, 1052]],
    ownName: [[140, 915, 430, 975], [520, 915, 830, 975]],
    oppName: [[1160, 30, 1460, 95], [1560, 30, 1860, 95]],
    oppPct: [[1310, 108, 1475, 172], [1705, 108, 1865, 172]],
    fight: [1580, 560, 1900, 830],
    moves: [
      [1360, 530, 1900, 670],
      [1360, 665, 1900, 805],
      [1360, 795, 1900, 935],
      [1360, 925, 1900, 1065]
    ],
    moveNames: [
      [1480, 555, 1800, 625],
      [1480, 685, 1800, 755],
      [1480, 815, 1800, 885],
      [1480, 945, 1800, 1015]
    ],
    mega: [1040, 830, 1320, 1045],
    targets: [
      { slot: 'oppA', box: [470, 220, 950, 510] },
      { slot: 'oppB', box: [970, 220, 1450, 510] },
      { slot: 'ownA', box: [470, 575, 950, 870] },
      { slot: 'ownB', box: [970, 575, 1450, 870] }
    ],
    targetMove: [500, 510, 920, 590],
    targetPanel: [400, 140, 1520, 960],
    result: [520, 300, 1400, 780],
    switchOwn: { x0: 50, x1: 600, y0: 220, pitch: 124, h: 116, n: 6, hp: [100, 48, 300, 105] },
    switchOpp: { x0: 1540, x1: 1880, y0: 215, pitch: 126, h: 116, n: 6 },
    exitBtn: [110, 40, 290, 110]
  };

  function scale(img, box) {
    var sx = img.width / W, sy = img.height / H;
    var x0 = Math.max(0, Math.round(box[0] * sx));
    var y0 = Math.max(0, Math.round(box[1] * sy));
    var x1 = Math.min(img.width, Math.round(box[2] * sx));
    var y1 = Math.min(img.height, Math.round(box[3] * sy));
    if (x1 < x0 + 2) x1 = Math.min(img.width, x0 + 2);
    if (y1 < y0 + 2) y1 = Math.min(img.height, y0 + 2);
    return [x0, y0, x1, y1];
  }
  function rows(img, spec) {
    var out = [];
    for (var i = 0; i < spec.n; i++) {
      var y = spec.y0 + i * spec.pitch;
      out.push(scale(img, [spec.x0, y, spec.x1, y + spec.h]));
    }
    return out;
  }
  function field(img, rowBox, rel, origin) {
    var sx = img.width / W, sy = img.height / H;
    var x = Math.round((origin[0] + rel[0]) * sx);
    var y = Math.round((origin[1] + rel[1]) * sy);
    var x2 = Math.round((origin[0] + rel[2]) * sx);
    var y2 = Math.round((origin[1] + rel[3]) * sy);
    return [x, y, Math.min(img.width, x2), Math.min(img.height, y2)];
  }
  return { W: W, H: H, L: L, scale: scale, rows: rows, field: field };
});

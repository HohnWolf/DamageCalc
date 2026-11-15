// Matchlog: Szenenerkennung über billige Pixelfarben, ohne OCR.
// Schwellen aus den 22 Musterframes (match01/match02, 1920×1080).
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.CCMatchlogScene = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  var Lay = typeof module === 'object' && module.exports ? require('./matchlog_layout') : window.CCMatchlogLayout;

  function px(img, x, y) {
    var i = (y * img.width + x) * 4;
    return [img.data[i], img.data[i + 1], img.data[i + 2]];
  }
  function tally(img, box, step) {
    step = step || 3;
    var x0 = box[0], y0 = box[1], x1 = box[2], y1 = box[3];
    var c = { n: 0, white: 0, lime: 0, purple: 0, pink: 0, green: 0, navy: 0, pale: 0 };
    for (var y = y0; y < y1; y += step) {
      for (var x = x0; x < x1; x += step) {
        var p = px(img, x, y);
        var r = p[0], g = p[1], b = p[2];
        var mx = r > g ? (r > b ? r : b) : (g > b ? g : b);
        var mn = r < g ? (r < b ? r : b) : (g < b ? g : b);
        var L = (r * 77 + g * 150 + b * 29) >> 8;
        c.n++;
        if (mn > 200 && mx - mn < 40) c.white++;
        if (g > 165 && g > r + 45 && b < 130) c.lime++;
        if (b > r + 25 && b > 100 && r > 40 && g < b) c.purple++;
        if (r > 165 && b > 100 && g < 140 && r > g) c.pink++;
        if (g > 85 && g > r + 28 && g > b + 18 && r < 140) c.green++;
        if (b > 55 && b > r + 12 && r < 100 && g < 110 && b > g) c.navy++;
        if (L > 150 && r > 120 && g > 130 && b > 90) c.pale++;
      }
    }
    return c;
  }
  function sumBoxes(img, boxes, step) {
    var t = { n: 0, white: 0, lime: 0, purple: 0, pink: 0, green: 0, navy: 0, pale: 0 };
    boxes.forEach(function (b) {
      var c = tally(img, b, step);
      Object.keys(t).forEach(function (k) { t[k] += c[k]; });
    });
    return t;
  }
  function bandNavy(img, box) {
    var c = tally(img, Lay.scale(img, box), 2);
    var r = 0, g = 0, b = 0, n = 0;
    var x0 = box[0], y0 = box[1], x1 = box[2], y1 = box[3];
    var sc = Lay.scale(img, [x0, y0, x1, y1]);
    for (var y = sc[1]; y < sc[3]; y += 2) for (var x = sc[0]; x < sc[2]; x += 2) {
      var p = px(img, x, y); r += p[0]; g += p[1]; b += p[2]; n++;
    }
    if (!n) return false;
    var R = r / n, B = b / n;
    // Dunkles Marineblau, nicht die gelbe Figur davor. An match01 t102 gemessen (B−R ≈ 29).
    return B > R + 22 && B > 28 && R < 45;
  }

  function detect(img) {
    var S = Lay.scale.bind(null, img);
    var L = Lay.L;
    var team = tally(img, S([80, 160, 620, 920]), 4);
    var mode = tally(img, S(L.modeHeader), 2);
    var title = tally(img, S(L.teamTitle), 3);
    var plates = sumBoxes(img, L.ownName.map(function (b) { return S(b); }).concat(L.ownHp.map(function (b) { return S(b); })), 3);
    var fight = tally(img, S(L.fight), 3);
    var wait = tally(img, S(L.wait), 2);
    var moves = sumBoxes(img, L.moves.map(function (b) { return S(b); }), 3);
    var targets = sumBoxes(img, L.targets.map(function (t) { return S(t.box); }), 4);
    var panel = tally(img, S(L.targetPanel), 6);
    var result = tally(img, S(L.result), 4);
    var swOwn = tally(img, S([50, 210, 600, 980]), 4);
    var swOpp = tally(img, S([1540, 210, 1880, 990]), 4);
    var center = tally(img, S([700, 360, 1220, 720]), 5);
    var spot = tally(img, S([0, 200, 520, 900]), 4);
    var mega = tally(img, S(L.mega), 3);
    var moveHits = L.moves.map(function (b) { return tally(img, S(b), 2).lime; });
    var targetHits = L.targets.map(function (t) { return tally(img, S(t.box), 3).lime; });
    var moveIndex = -1, moveBest = 12;
    moveHits.forEach(function (v, i) { if (v > moveBest) { moveBest = v; moveIndex = i; } });
    var targetIndex = -1, targetBest = 18;
    targetHits.forEach(function (v, i) { if (v > targetBest) { targetBest = v; targetIndex = i; } });

    function ratio(c, k) { return c.n ? c[k] / c.n : 0; }
    var f = {
      teamPurple: ratio(team, 'purple'),
      modeWhite: ratio(mode, 'white'),
      titleWhite: ratio(title, 'white'),
      plateGreen: ratio(plates, 'green'),
      plateNavy: ratio(plates, 'navy'),
      plateLime: ratio(plates, 'lime'),
      fightWhite: ratio(fight, 'white'),
      fightLime: ratio(fight, 'lime'),
      waitWhite: ratio(wait, 'white'),
      moveLime: ratio(moves, 'lime'),
      moveWhite: ratio(moves, 'white'),
      targetLime: ratio(targets, 'lime'),
      resultWhite: ratio(result, 'white'),
      swPale: ratio(swOwn, 'pale'),
      swPink: ratio(swOpp, 'pink'),
      swPurple: ratio(swOwn, 'purple'),
      centerWhite: ratio(center, 'white'),
      spotWhite: ratio(spot, 'white'),
      megaPink: ratio(mega, 'pink'),
      bannerOwn: bandNavy(img, L.bannerOwnStrip),
      bannerOpp: bandNavy(img, L.bannerOppStrip)
    };

    var scene = 'battle';
    if (f.teamPurple > 0.25 && f.modeWhite > 0.04) scene = 'team_select';
    else if (f.modeWhite > 0.08 && f.teamPurple < 0.2 && f.teamPurple > 0.04 && f.targetLime < 0.06) scene = 'standby';
    else if (f.swPale > 0.2 && f.spotWhite > 0.06 && f.plateGreen < 0.02 && f.modeWhite < 0.02) scene = 'result';
    else if (f.swPale > 0.05 && f.modeWhite < 0.02 && f.moveLime < 0.02 && f.targetLime < 0.05 && (f.plateGreen > 0.05 || f.teamPurple > 0.15)) scene = 'switch_menu';
    else if (f.waitWhite > 0.015 && f.plateGreen > 0.04 && f.moveLime < 0.02 && f.targetLime < 0.02) scene = 'communicating';
    else if (f.targetLime > 0.06 && f.moveLime < 0.02) scene = 'target_select';
    else if (f.moveLime > 0.02 && moveIndex >= 0 && f.plateGreen > 0.03) scene = 'move_select';
    else if (f.plateGreen > 0.045 && f.moveLime < 0.02 && f.targetLime < 0.03) scene = 'command';
    else scene = 'battle';

    return {
      scene: scene,
      features: f,
      moveIndex: scene === 'move_select' ? moveIndex : -1,
      targetSlot: scene === 'target_select' && targetIndex >= 0 ? L.targets[targetIndex].slot : '',
      megaOn: scene === 'move_select' && f.megaPink > 12,
      bannerOwn: !!f.bannerOwn,
      bannerOpp: !!f.bannerOpp
    };
  }
  return { detect: detect, tally: tally };
});

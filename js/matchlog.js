// Matchlog: bild → Szene, OCR-Aufträge, Zustand. Keine Oberfläche.
// OCR läuft außerhalb (Worker/IPC). step() sagt, welche Ausschnitte neu sind;
// apply() schreibt den erkannten Text ins Protokoll.
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.CCMatchlog = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  function need(name, browser) {
    if (typeof module === 'object' && module.exports) return require('./' + name);
    return window[browser];
  }
  var Lay = need('matchlog_layout', 'CCMatchlogLayout');
  var Scene = need('matchlog_scene', 'CCMatchlogScene');
  var Prep = need('matchlog_prep', 'CCMatchlogPrep');
  var Parse = need('matchlog_parse', 'CCMatchlogParse');
  var State = need('matchlog_state', 'CCMatchlogState');
  var Format = need('matchlog_format', 'CCMatchlogFormat');
  var Hp = need('matchlog_hp', 'CCMatchlogHp');
  var Lex = need('matchlog_lexicon', 'CCMatchlogLex');

  function create(opts) {
    opts = opts || {};
    var lex = opts.lex || Lex.fromGlobals();
    var st = State.create();
    var seed = opts.digits || (typeof window !== 'undefined' ? window.CCMatchlogDigits : null);
    var bank = opts.bank || Hp.createBank(seed);
    var seen = {};
    var lastHpOcr = {};
    var teamGot = {};
    var optsImage = null;
    var lastHpAt = -99;
    var lastPlateAt = -99;
    var lastTimerAt = -99;
    var resultStreak = 0;
    var bannerText = { own: ['', ''], foe: ['', ''] };
    function consider(list, id, box, mode, kind, extra) {
      var prep = Prep.prepare(optsImage, box, mode);
      var gate = mode === 'ui' ? 25 : (kind === 'hp' ? 35 : 60);
      if (prep.count < gate) return;
      if (extra && extra.maxInk && prep.count > extra.maxInk) return;
      if (seen[id] === prep.hash) return;
      seen[id] = prep.hash;
      if (!prep.image) return;
      var j = { id: id, kind: kind, mode: mode, image: prep.image, ink: prep.count };
      if (extra) Object.keys(extra).forEach(function (k) { j[k] = extra[k]; });
      list.push(j);
    }
    function step(image, meta) {
      meta = meta || {};
      optsImage = image;
      var det = Scene.detect(image);
      State.onScene(st, det.scene);
      var hp = null;
      try { hp = Hp.read(image, bank); } catch (e) { hp = null; }
      if (hp) State.noteHp(st, hp);
      if (det.scene === 'move_select') {
        State.noteChoice(st, { mega: det.megaOn, moveIndex: det.moveIndex });
      }
      if (det.scene === 'target_select' && det.targetSlot) State.noteChoice(st, { targetSlot: det.targetSlot });
      var jobs = [];
      if (det.scene === 'battle' || det.scene === 'result' || det.scene === 'command') {
        consider(jobs, 'bt', Lay.scale(image, Lay.L.battleText), 'outline', 'battle');
      }
      if (det.bannerOwn) {
        consider(jobs, 'ab1', Lay.scale(image, Lay.L.bannerOwn1), 'ui', 'banner', { part: 1 });
        consider(jobs, 'ab2', Lay.scale(image, Lay.L.bannerOwn2), 'ui', 'banner', { part: 2 });
      }
      if (det.bannerOpp) {
        consider(jobs, 'abO1', Lay.scale(image, Lay.L.bannerOpp1), 'ui', 'banner', { part: 1, side: 'foe' });
        consider(jobs, 'abO2', Lay.scale(image, Lay.L.bannerOpp2), 'ui', 'banner', { part: 2, side: 'foe' });
      }
      if (det.scene === 'communicating') consider(jobs, 'wait', Lay.scale(image, Lay.L.wait), 'ui', 'wait');
      if (det.scene === 'team_select') {
        for (var i = 0; i < 6; i++) {
          var y = Lay.L.teamOwn.y0 + i * Lay.L.teamOwn.pitch;
          var name = Lay.field(image, null, Lay.L.teamOwn.name, [Lay.L.teamOwn.x0, y]);
          var item = Lay.field(image, null, Lay.L.teamOwn.item, [Lay.L.teamOwn.x0, y]);
          consider(jobs, 'tn' + i, name, 'ui', 'team_name', { index: i });
          consider(jobs, 'ti' + i, item, 'ui', 'team_item', { index: i });
        }
      }
      if (det.scene === 'move_select' && det.moveIndex >= 0) {
        consider(jobs, 'mv' + det.moveIndex, Lay.scale(image, Lay.L.moveNames[det.moveIndex]), 'ui', 'move_name', { index: det.moveIndex, mega: det.megaOn });
      }
      if (det.scene === 'target_select') {
        consider(jobs, 'tmove', Lay.scale(image, Lay.L.targetMove), 'ui', 'move_name', { from: 'target' });
      }
      var nowT = meta.t != null ? meta.t : Date.now() / 1000;
      if ((det.scene === 'command' || det.scene === 'move_select' || det.scene === 'target_select' || det.scene === 'communicating') && nowT - lastTimerAt >= 1.0) {
        lastTimerAt = nowT;
        consider(jobs, 'opp_timer', Lay.scale(image, Lay.L.oppTimer), 'digit', 'timer', { whitelist: '0123456789:', maxInk: 900 });
      }
      var oppADead = !st.slotMon.oppA || (st.lastHp[st.slotMon.oppA] && st.lastHp[st.slotMon.oppA].pct === 0);
      var oppBDead = !st.slotMon.oppB || (st.lastHp[st.slotMon.oppB] && st.lastHp[st.slotMon.oppB].pct === 0);
      var ownADead = !st.slotMon.ownA || (st.lastHp[st.slotMon.ownA] && st.lastHp[st.slotMon.ownA].pct === 0);
      var ownBDead = !st.slotMon.ownB || (st.lastHp[st.slotMon.ownB] && st.lastHp[st.slotMon.ownB].pct === 0);
      var checkPlate = (nowT - lastPlateAt >= (det.scene === 'command' ? 1.2 : 1.0)) && !jobs.length;
      if (checkPlate && (det.scene === 'command' || (det.scene === 'battle' && (oppADead || oppBDead || ownADead || ownBDead)))) {
        lastPlateAt = nowT;
        if (det.scene === 'command' || oppADead) consider(jobs, 'nmA', Lay.scale(image, Lay.L.oppName[0]), 'ui', 'plate_name', { slot: 'oppA' });
        if (det.scene === 'command' || oppBDead) consider(jobs, 'nmB', Lay.scale(image, Lay.L.oppName[1]), 'ui', 'plate_name', { slot: 'oppB' });
        if (ownADead) consider(jobs, 'nmOA', Lay.scale(image, Lay.L.ownName[0]), 'ui', 'plate_name', { slot: 'ownA' });
        if (ownBDead) consider(jobs, 'nmOB', Lay.scale(image, Lay.L.ownName[1]), 'ui', 'plate_name', { slot: 'ownB' });
      }
      var checkHp = (det.scene === 'command' || det.scene === 'move_select' || (det.scene === 'battle' && nowT - lastHpAt >= 0.35));
      if (checkHp) {
        lastHpAt = nowT;
        var hpSlots = hp && hp.slots ? hp.slots : {};
        ['ownA', 'ownB'].forEach(function (sl, idx) {
          if (!hpSlots[sl] || !hpSlots[sl].value) {
            var box = Lay.scale(image, Lay.L.ownHp[idx]);
            var id = 'hp_' + sl;
            var prep = Prep.prepare(image, box, 'digit');
            if (prep.count >= 35 && prep.count <= 1600) {
              if (seen[id] === prep.hash) {
                if (lastHpOcr[sl] && lastHpOcr[sl].hash === prep.hash && lastHpOcr[sl].val) {
                  var pOwn = { slots: {} };
                  pOwn.slots[sl] = { value: lastHpOcr[sl].val };
                  State.noteHp(st, pOwn);
                }
              } else {
                seen[id] = prep.hash;
                if (prep.image) jobs.push({ id: id, kind: 'hp', mode: 'digit', image: prep.image, ink: prep.count, slot: sl, isOwn: true, hash: prep.hash, whitelist: '0123456789/', maxInk: 1600 });
              }
            }
          }
        });
        ['oppA', 'oppB'].forEach(function (sl, idx) {
          if (!hpSlots[sl] || !hpSlots[sl].value) {
            if (hpSlots[sl] && hpSlots[sl].count === 0) return;
            var box = Lay.scale(image, Lay.L.oppPct[idx]);
            var id = 'hp_' + sl;
            var prep = Prep.prepare(image, box, 'digit');
            if (prep.count >= 35 && prep.count <= 1450) {
              if (seen[id] === prep.hash) {
                if (lastHpOcr[sl] && lastHpOcr[sl].hash === prep.hash && lastHpOcr[sl].val) {
                  var pOpp = { slots: {} };
                  pOpp.slots[sl] = { value: lastHpOcr[sl].val };
                  State.noteHp(st, pOpp);
                }
              } else {
                seen[id] = prep.hash;
                if (prep.image) jobs.push({ id: id, kind: 'hp', mode: 'digit', image: prep.image, ink: prep.count, slot: sl, isOwn: false, hash: prep.hash, whitelist: '0123456789%', maxInk: 1450 });
              }
            }
          }
        });
      }
      if (det.scene === 'result' && st.phase !== 'pre' && (st.turnPlayed || st.turnN >= 2)) {
        resultStreak += 1;
        consider(jobs, 'result', Lay.scale(image, Lay.L.result), 'outline', 'result');
        if (!st.result && resultStreak >= 3) State.noteText(st, 'result-scene', '', { kind: 'result', winner: '', line: 'Ergebnisbild' }, meta.t);
      } else {
        resultStreak = 0;
      }
      return { scene: det.scene, features: det.features, detail: det, hp: hp, jobs: jobs, t: meta.t };
    }
    function apply(job, text, meta) {
      meta = meta || {};
      var t = meta.t;
      text = Parse.flat(text);
      if (job.kind === 'banner') {
        var side = job.side === 'foe' ? 'foe' : 'own';
        if ((job.part || 1) === 1) bannerText[side][1] = '';
        bannerText[side][(job.part || 1) - 1] = text;
        if (bannerText[side][0] && bannerText[side][1]) {
          var ev = Parse.parseBanner(bannerText[side][0], bannerText[side][1], lex);
          if (ev) ev.side = side === 'foe' ? 'foe' : 'you';
          State.noteText(st, 'banner', bannerText[side].join(' / '), ev, t);
        }
        return st;
      }
      if (job.kind === 'team_name' || job.kind === 'team_item') {
        var parsed = Parse.parse(text, lex, job.kind);
        if (parsed && parsed.mon && job.kind === 'team_name') {
          State.noteTeamRow(st, job.index, parsed.mon, '');
          teamGot[job.index] = parsed.mon;
        }
        if (parsed && parsed.item && job.kind === 'team_item') State.noteTeamRow(st, job.index, teamGot[job.index] || '', parsed.item);
        State.noteText(st, job.kind, text, null, t);
        return st;
      }
      if (job.kind === 'move_name') {
        var mv = Parse.parse(text, lex, 'move_name');
        if (mv && mv.move) State.noteChoice(st, { move: mv.move, mega: job.mega });
        State.noteText(st, job.kind, text, null, t);
        return st;
      }
      if (job.kind === 'plate_name') {
        var mon = Parse.parse(text, lex, 'team_name');
        if (mon && mon.mon) {
          State.notePlateMon(st, job.slot, mon.mon, t);
        }
        State.noteText(st, job.kind, text, null, t);
        return st;
      }
      if (job.kind === 'hp') {
        var val = job.isOwn ? Hp.parseFraction(text) : Hp.parsePct(text);
        if (val) {
          if (job.hash) lastHpOcr[job.slot] = { hash: job.hash, val: val };
          var patch = { slots: {} };
          patch.slots[job.slot] = { value: val };
          State.noteHp(st, patch);
        }
        return st;
      }
      if (job.kind === 'timer') {
        var m = String(text || '').match(/(\d{1,2})\D*(\d{2})/);
        if (m) {
          var mm = parseInt(m[1], 10), ss = parseInt(m[2], 10);
          if (mm <= 15 && ss <= 59) State.noteTimer(st, mm * 60 + ss);
        }
        return st;
      }
      var hint = job.kind === 'result' ? '' : '';
      var ev = Parse.parse(text, lex, hint);
      if (job.kind === 'wait') ev = null;
      State.noteText(st, job.kind, text, ev, t);
      return st;
    }
    function snapshot() { return State.exportSnap(st); }
    function text() { return Format.render(snapshot()); }
    function showdown() { return Format.renderShowdown ? Format.renderShowdown(snapshot()) : ''; }
    return { step: step, apply: apply, snapshot: snapshot, text: text, showdown: showdown, state: st, bank: bank, lex: lex };
  }
  return { create: create };
});

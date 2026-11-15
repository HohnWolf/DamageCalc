// Offline: Matchlog über die Musterframes (test/matchlog/frames) und Vergleich mit der Ground Truth.
//   node test/matchlog_harness.js            OCR + Protokoll
//   node test/matchlog_harness.js --scenes   nur Szenen, ohne OCR
const fs = require('fs');
const path = require('path');
const jpeg = require('jpeg-js');
const Lex = require('../js/matchlog_lexicon');
const Hp = require('../js/matchlog_hp');
const Lay = require('../js/matchlog_layout');
const Scene = require('../js/matchlog_scene');
const Engine = require('../js/matchlog');
const Format = require('../js/matchlog_format');
const lists = require('./matchlog_lists');

const ROOT = path.join(__dirname, '..');
const FRAME_DIR = path.join(__dirname, 'matchlog', 'frames');
const scenesOnly = process.argv.indexOf('--scenes') >= 0;

function loadJpeg(file) {
  const raw = jpeg.decode(fs.readFileSync(file), { useTArray: true, maxMemoryUsageInMB: 256 });
  return { width: raw.width, height: raw.height, data: raw.data };
}
function frameTime(name) {
  const m = name.match(/_t(\d+)/);
  return m ? +m[1] : 0;
}
function frames(prefix) {
  return fs.readdirSync(FRAME_DIR).filter(function (f) { return f.indexOf(prefix) === 0 && f.endsWith('.jpg'); })
    .sort(function (a, b) { return frameTime(a) - frameTime(b); });
}

function learnDigits(bank) {
  const file = frames('m01_').filter(function (f) { return /_t75/.test(f); })[0];
  if (!file) return [];
  const img = loadJpeg(path.join(FRAME_DIR, file));
  return Hp.learn(img, bank, [
    { box: Lay.L.ownHp[0], text: '167/167' },
    { box: Lay.L.ownHp[1], text: '170/170' },
    { box: Lay.L.oppPct[0], text: '100%' },
    { box: Lay.L.oppPct[1], text: '100%' }
  ]);
}

function flatten(gt) {
  const out = [];
  (gt.turns || []).forEach(function (t) {
    (t.events || []).forEach(function (ev) { out.push(ev); });
  });
  return out;
}
function speciesOf(gt, id) {
  if (!id) return '';
  const side = String(id).charAt(0) === 'y' ? gt.teams.you : gt.teams.foe;
  const hit = (side || []).filter(function (m) { return m.id === id; })[0];
  return hit ? hit.species.replace(/-Hisui.*/, '-Hisui').replace(/-.*/, function (s) { return s; }) : '';
}
function baseSpecies(name) {
  return String(name || '').replace(/^Mega /, '').replace(/ X$| Y$/, '');
}
function covered(gt, ev, snap) {
  const mons = snap.mons || {};
  function sp(id) { return mons[id] ? mons[id].species : ''; }
  if (ev.kind === 'move') {
    return snap.turns.some(function (t) {
      return t.events.some(function (e) {
        return e.kind === 'move' && e.move === ev.move && baseSpecies(sp(e.mon)) === baseSpecies(speciesOf(gt, ev.actor));
      });
    });
  }
  if (ev.kind === 'faint') {
    return snap.turns.some(function (t) {
      return t.events.some(function (e) { return e.kind === 'faint' && baseSpecies(sp(e.mon)) === baseSpecies(speciesOf(gt, ev.mon)); });
    });
  }
  if (ev.kind === 'mega') {
    return snap.turns.some(function (t) {
      return t.events.some(function (e) { return e.kind === 'mega' && baseSpecies(sp(e.mon)) === baseSpecies(speciesOf(gt, ev.actor)); });
    });
  }
  if (ev.kind === 'ability' || ev.kind === 'item') {
    const key = ev.kind === 'ability' ? 'ability' : 'item';
    return snap.turns.some(function (t) {
      return t.events.some(function (e) { return e.kind === ev.kind && e[key] === ev[key]; });
    });
  }
  if (ev.kind === 'field') {
    return snap.turns.some(function (t) { return t.events.some(function (e) { return (e.kind === 'field' && e.field === ev.field) || (e.field === ev.field); }); });
  }
  if (ev.kind === 'flinch' || ev.kind === 'cant_move') {
    return snap.turns.some(function (t) {
      return t.events.some(function (e) { return e.kind === 'flinch' && baseSpecies(sp(e.mon)) === baseSpecies(speciesOf(gt, ev.mon)); });
    });
  }
  if (ev.kind === 'send_out') {
    const want = (ev.mons || []).map(function (id) { return speciesOf(gt, id); });
    return snap.turns.some(function (t) {
      return t.events.some(function (e) {
        if (e.kind !== 'send_out' || e.side !== (ev.side === 'you' ? 'you' : 'foe')) return false;
        const got = (e.mons || []).map(sp);
        return want.every(function (w) { return got.some(function (g) { return baseSpecies(g) === baseSpecies(w); }); });
      });
    });
  }
  if (ev.kind === 'boost') return true;
  return false;
}

async function main() {
  const tAll = Date.now();
  const lex = Lex.build(lists.load(ROOT));
  console.log('Lexikon: ' + lex.species.length + ' Arten, ' + lex.moves.length + ' Attacken, ' + lex.abilities.length + ' Fähigkeiten, ' + lex.items.length + ' Items');
  const seedPath = path.join(ROOT, 'js', 'matchlog_digits.js');
  const seed = fs.existsSync(seedPath) ? require(seedPath) : null;
  const bank = Hp.createBank(seed);
  if (!seed) {
    const learned = learnDigits(bank);
    console.log('Ziffern gelernt: ' + JSON.stringify(learned));
  }
  console.log('Ziffernvorlagen: ' + bank.size());
  if (scenesOnly) {
    frames('m0').forEach(function (name) {
      const img = loadJpeg(path.join(FRAME_DIR, name));
      const det = Scene.detect(img);
      const hp = Hp.read(img, bank);
      const hpTxt = Object.keys(hp.slots).map(function (k) {
        const s = hp.slots[k];
        return k + '=' + (s.value ? JSON.stringify(s.value) : (s.text || '-'));
      }).join(' ');
      const f = det.features;
      const brief = ['pur', f.teamPurple.toFixed(2), 'mode', f.modeWhite.toFixed(2), 'green', f.plateGreen.toFixed(3), 'wait', f.waitWhite.toFixed(3), 'mv', f.moveLime.toFixed(3), 'tg', f.targetLime.toFixed(3), 'pale', f.swPale.toFixed(3), 'spot', f.spotWhite.toFixed(2), 'ban', f.bannerOwn ? 1 : 0].join(' ');
      console.log(name.replace(/_[0-9a-f]{4}\.jpg$/, ''), det.scene, det.moveIndex >= 0 ? 'move' + det.moveIndex : '', det.targetSlot || '', 'banner', det.bannerOwn ? 'own' : '-', det.bannerOpp ? 'opp' : '-', brief, '|', hpTxt);
    });
    console.log('Szenen in ' + (Date.now() - tAll) + ' ms');
    return;
  }
  const ocr = require('../js/matchlog_ocr_node').create({
    langPath: path.join(ROOT, 'vendor', 'tessdata'),
    cachePath: path.join(ROOT, '.tess-cache')
  });
  const eng = Engine.create({ lex: lex, bank: bank });
  const files = frames('m01_');
  let ocrMs = 0, ocrN = 0, prepMs = 0;
  for (let i = 0; i < files.length; i++) {
    const name = files[i];
    const t = frameTime(name);
    const img = loadJpeg(path.join(FRAME_DIR, name));
    const t0 = Date.now();
    const step = eng.step(img, { t: t });
    prepMs += Date.now() - t0;
    const bits = [];
    for (let j = 0; j < step.jobs.length; j++) {
      const job = step.jobs[j];
      const r = await ocr.recognize(job.image);
      ocrN++; ocrMs += r.ms || 0;
      eng.apply(job, r.text || '', { t: t });
      bits.push(job.kind + (job.index != null ? job.index : '') + '=' + JSON.stringify(r.text || r.error || ''));
    }
    const hp = step.hp;
    const hpTxt = hp ? Object.keys(hp.slots).map(function (k) {
      const s = hp.slots[k];
      return s && s.value ? k + JSON.stringify(s.value) : '';
    }).filter(Boolean).join(' ') : '';
    console.log('t' + t, step.scene, hpTxt, bits.join(' | ') || '(kein OCR)');
  }
  await ocr.stop();
  const snap = eng.snapshot();
  console.log('\n----- Protokoll -----\n');
  console.log(Format.render(snap));
  const gt = JSON.parse(fs.readFileSync(path.join(__dirname, 'matchlog', 'gt', 'match01_en.json'), 'utf8'));
  const evs = flatten(gt).filter(function (e) {
    return ['move', 'mega', 'faint', 'ability', 'item', 'field', 'flinch', 'cant_move', 'send_out'].indexOf(e.kind) >= 0;
  });
  let hit = 0;
  console.log('\n----- gegen Ground Truth (match01) -----');
  evs.forEach(function (ev) {
    const ok = covered(gt, ev, snap);
    if (ok) hit++;
    const label = ev.kind + ' ' + (ev.move || ev.ability || ev.item || ev.field || ev.reason || '') + ' ' + (ev.actor || ev.mon || (ev.mons || []).join('+'));
    console.log((ok ? '  ok  ' : '  --  ') + label.trim());
  });
  console.log(hit + '/' + evs.length + ' Ereignisse wiedergefunden');
  const resOk = snap.result && snap.result.winner === 'you' && snap.result.reason === 'forfeit';
  console.log(resOk ? '  ok   Forfeit, Spiel gewonnen' : '  --   Ergebnis: ' + JSON.stringify(snap.result));
  console.log('\nZeiten: Vorbereitung ' + prepMs + ' ms, OCR ' + ocrN + ' Ausschnitte in ' + ocrMs + ' ms' + (ocrN ? ' (Ø ' + Math.round(ocrMs / ocrN) + ' ms)' : '') + ', gesamt ' + (Date.now() - tAll) + ' ms');
  const out = path.join(__dirname, 'matchlog', 'last_m01.json');
  fs.writeFileSync(out, JSON.stringify(snap, null, 2));
  console.log('JSON: ' + out);
}

main().catch(function (e) { console.error(e); process.exit(1); });

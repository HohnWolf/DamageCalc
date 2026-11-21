// Matchlog: Leichtgewichtiger Keyframe-Sammler für KI-Auswertung (Gemini / Google AI Pro).
// Läuft ohne OCR in < 2 ms pro Frame und sammelt Team-Preview + alle neuen Kampftext-/Zug-Momente
// als kompakte Kontaktbögen (3x3 Kacheln à 640x360 = 1920x1080 JPEG).
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.CCMatchlogKeyframes = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  var Lay = typeof module === 'object' && module.exports ? require('./matchlog_layout') : window.CCMatchlogLayout;
  var Scene = typeof module === 'object' && module.exports ? require('./matchlog_scene') : window.CCMatchlogScene;
  var Prep = typeof module === 'object' && module.exports ? require('./matchlog_prep') : window.CCMatchlogPrep;

  var TILE_W = 640, TILE_H = 360;
  var GRID_COLS = 3, GRID_ROWS = 3;
  var MAX_FRAMES = 108; // bis zu 12 Kontaktbögen à 9 Kacheln; bei Überlauf wird ausgedünnt statt abgeschnitten

  function fmtTs(sec) {
    if (!isFinite(sec)) return '00:00';
    var m = Math.floor(sec / 60);
    var s = Math.floor(sec - m * 60);
    return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
  }

  function snapCanvas(srcCanvas, w, h, quality) {
    var c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    var ctx = c.getContext('2d');
    ctx.drawImage(srcCanvas, 0, 0, srcCanvas.width, srcCanvas.height, 0, 0, w, h);
    return c;
  }

  function create() {
    var teamPreview = null; // { t, canvas }
    var frames = [];        // [{ t, tag, canvas }]
    var lastTextHash = '';
    var lastTextInk = 0;
    var lastBanner = '';
    var lastFrameT = -99;
    var lastScene = '';
    var sawBattle = false;
    var cmdSavedSinceBattle = false;
    var resultSaved = false;
    var teamSeenAt = -99;

    function reset() {
      teamPreview = null;
      frames = [];
      lastTextHash = '';
      lastTextInk = 0;
      lastBanner = '';
      lastFrameT = -99;
      lastScene = '';
      sawBattle = false;
      cmdSavedSinceBattle = false;
      resultSaved = false;
      teamSeenAt = -99;
    }

    function pushFrame(srcCanvas, t, tag) {
      if (frames.length >= MAX_FRAMES) {
        // Ausdünnen statt abschneiden: jeden 2. älteren TXT-Frame entfernen, damit CMD/END/späte Turns immer bleiben
        for (var i = 1; i < frames.length - 10; i++) {
          if (frames[i].tag === 'TXT') { frames.splice(i, 1); break; }
        }
        if (frames.length >= MAX_FRAMES) frames.shift();
      }
      var tile = snapCanvas(srcCanvas, TILE_W, TILE_H);
      frames.push({ t: t, tag: tag || '', canvas: tile });
      lastFrameT = t;
      return true;
    }

    function step(image, srcCanvas, meta) {
      meta = meta || {};
      var t = meta.t != null ? meta.t : (Date.now() / 1000);
      var det = Scene.detect(image);
      var added = false;

      // 1. Team-Preview (volle 1280x720 Auflösung für alle 6 Gegner-Icons + eigene Items)
      if (det.scene === 'team_select') {
        if (teamSeenAt < 0) teamSeenAt = t;
        if (!teamPreview && (t - teamSeenAt >= 0.4 || t === teamSeenAt)) {
          teamPreview = { t: t, canvas: snapCanvas(srcCanvas, 1280, 720) };
          added = true;
        }
      } else {
        teamSeenAt = -99;
      }

      // 2. Command-Screen nach Kampfphase = sauberer Turn-Trenner + ruhige HUD-KP
      if (det.scene === 'command') {
        if (!cmdSavedSinceBattle && (sawBattle || frames.length === 0)) {
          if (t - lastFrameT >= 0.8) {
            added = pushFrame(srcCanvas, t, 'CMD') || added;
            cmdSavedSinceBattle = true;
          }
        }
      }

      // 3. Kampf-Text-Änderung (nur in battle / result, nicht in Menüs/Lobby; 0.7s Abstand damit kein Move-Text verloren geht)
      if (det.scene === 'battle' || det.scene === 'result') {
        if (det.scene === 'battle') {
          sawBattle = true;
          cmdSavedSinceBattle = false;
        }
        var btPrep = Prep.prepare(image, Lay.scale(image, Lay.L.battleText), 'outline');
        if (btPrep.count >= 80) {
          var inkDiff = Math.abs(btPrep.count - lastTextInk);
          var isNew = btPrep.hash !== lastTextHash && (inkDiff >= 35 || t - lastFrameT >= 1.5);
          if (isNew && t - lastFrameT >= 0.7) {
            lastTextHash = btPrep.hash;
            lastTextInk = btPrep.count;
            added = pushFrame(srcCanvas, t, 'TXT') || added;
          }
        }
      }

      // 4. Fähigkeiten- / Item-Banner (z.B. Electric Surge, Focus Sash)
      var bKey = (det.bannerOwn ? 'O' : '') + (det.bannerOpp ? 'F' : '');
      if (bKey && bKey !== lastBanner && t - lastFrameT >= 1.0) {
        added = pushFrame(srcCanvas, t, 'BAN') || added;
      }
      lastBanner = bKey;

      // 5. Ergebnisbild am Matchende
      if (det.scene === 'result' && sawBattle && !resultSaved && t - lastFrameT >= 0.8) {
        added = pushFrame(srcCanvas, t, 'END') || added;
        resultSaved = true;
      }

      lastScene = det.scene;
      return { scene: det.scene, added: added, stats: stats() };
    }

    function stats() {
      var sheets = Math.ceil(frames.length / (GRID_COLS * GRID_ROWS));
      return {
        hasTeamPreview: !!teamPreview,
        frameCount: frames.length,
        sheetCount: sheets + (teamPreview ? 1 : 0)
      };
    }

    function buildSheets() {
      var out = [];
      if (teamPreview) {
        var tpUrl = teamPreview.canvas.toDataURL('image/jpeg', 0.88);
        out.push({
          name: '01_team_preview.jpg',
          mimeType: 'image/jpeg',
          b64: tpUrl.replace(/^data:image\/jpeg;base64,/, '')
        });
      }
      var perSheet = GRID_COLS * GRID_ROWS;
      var sheetIdx = 0;
      for (var i = 0; i < frames.length; i += perSheet) {
        sheetIdx++;
        var slice = frames.slice(i, i + perSheet);
        var rows = Math.ceil(slice.length / GRID_COLS);
        var c = document.createElement('canvas');
        c.width = GRID_COLS * TILE_W;
        c.height = rows * TILE_H;
        var ctx = c.getContext('2d');
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, c.width, c.height);
        ctx.font = 'bold 20px Consolas, monospace';

        slice.forEach(function (f, idx) {
          var col = idx % GRID_COLS;
          var row = Math.floor(idx / GRID_COLS);
          var x = col * TILE_W;
          var y = row * TILE_H;
          ctx.drawImage(f.canvas, x, y, TILE_W, TILE_H);
          var label = '#' + (i + idx + 1) + ' ' + fmtTs(f.t) + (f.tag ? ' [' + f.tag + ']' : '');
          var tw = ctx.measureText(label).width + 12;
          ctx.fillStyle = 'rgba(0,0,0,0.78)';
          ctx.fillRect(x + 4, y + 4, tw, 26);
          ctx.fillStyle = '#facc15';
          ctx.fillText(label, x + 10, y + 23);
        });

        var url = c.toDataURL('image/jpeg', 0.84);
        out.push({
          name: (teamPreview ? (sheetIdx + 1) : sheetIdx).toString().padStart(2, '0') + '_match_sheet_' + sheetIdx + '.jpg',
          mimeType: 'image/jpeg',
          b64: url.replace(/^data:image\/jpeg;base64,/, '')
        });
      }
      return out;
    }

    function buildPrompt(ctx) {
      ctx = ctx || {};
      var lines = [
        'You are an expert Pokémon VGC / Pokémon Champions Doubles battle logger.',
        'Analyze ALL attached chronological screenshots (first image may be Team Preview, followed by numbered 3x3 contact sheets with timestamps and [CMD] turn-separator markers).',
        'Convert the ENTIRE match into a 100% valid Pokémon Showdown replay log so it can be imported directly into RattataLab Team Analysis / PASRS 7.0.',
        ''
      ];

      if (ctx.playerName || (ctx.teamMons && ctx.teamMons.length)) {
        lines.push('KNOWN PLAYER (p1) CONTEXT (ground truth from Teambuilder — ALWAYS use these exact species names, regional forms, items, abilities, and move names for p1):');
        if (ctx.playerName) lines.push('- Player p1 name: ' + ctx.playerName);
        if (ctx.teamName) lines.push('- Team: ' + ctx.teamName + (ctx.versionName ? ' (' + ctx.versionName + ')' : ''));
        (ctx.teamMons || []).forEach(function (m, i) {
          var parts = [(i + 1) + '. ' + m.species];
          if (m.item) parts.push('@ ' + m.item);
          if (m.ability) parts.push('| Ability: ' + m.ability);
          if (m.moves && m.moves.length) parts.push('| Moves: ' + m.moves.join(', '));
          lines.push('  ' + parts.join(' '));
        });
        lines.push('');
      }

      lines.push(
        'Rules:',
        '1. Output ONLY the raw Showdown protocol lines starting with |player|p1|... (no markdown code fences, no explanations, no extra text).',
        '2. p1 is ALWAYS the player (bottom-left HP plates / left side of Team Preview). p2 is ALWAYS the opponent (top-right % plates / right side of Team Preview).',
        '3. Extract player names if visible (e.g. from "X sent out Y", "You lost to X", "X\'s Omni Ring"). Use the known p1 name if provided; fallback: You / Opponent.',
        '4. In |poke|p1| and |poke|p2|, list ALL 6 Pokémon of each team in exact English Showdown species names (identify all 6 opponent Pokémon from the icons in Team Preview! Use regional forms like Arcanine-Hisui, Goodra-Hisui, Zoroark-Hisui, Floette-Eternal, Basculegion-F). Include p1 items.',
        '5. Put the 4 opening leads as |switch|p1a: ...|, |switch|p1b: ...|, |switch|p2a: ...|, |switch|p2b: ...| BEFORE |turn|1.',
        '6. Carefully read EVERY tile in chronological order and NEVER omit |move| lines! Whenever HP changes in a turn, look closely at the surrounding tiles for the "X used Y!" battle text and log the |move| line (using the known p1 move list to disambiguate blurry/partial text).',
        '7. Use exact Showdown syntax for every event:',
        '   - |turn|1, |turn|2, ... (each [CMD] command screen starts a new turn; do not skip Turn 1)',
        '   - |switch|p1a: Species|Species, L50|100/100 (for every switch-in and post-KO replacement! When a Mega-evolved Floette-Eternal switches back in, keep its species as Floette-Eternal or Floette-Eternal-Mega, NEVER plain Floette)',
        '   - |detailschange|p1a: Raichu|Raichu-Mega-X, L50 and |-mega|p1a: Raichu|Raichu|Raichunite X (for Mega Evolutions)',
        '   - |move|p1a: Arcanine|Head Smash|p2a: Noivern (use exact English move names)',
        '   - |-damage|p2a: Noivern|1/100 or |-damage|p1a: Arcanine|1/171 or |-damage|...|0 fnt (for ALL targets of spread moves like Earthquake / Blizzard / Heat Wave / Rock Slide! If Focus Sash triggers, HP is 1/max)',
        '   - |faint|p1b: Espathra',
        '   - |-sidestart|p2: Opponent|move: Tailwind (when Tailwind starts) and |-sideend|p2: Opponent|move: Tailwind (when Tailwind peters out! Never log Tailwind ending as sidestart)',
        '   - |-fieldstart|move: Grassy Terrain, |-weather|SunnyDay / Snow / RainDance / Sandstorm, |-boost|..., |-enditem|...',
        '   - |win|<WinnerName> at the end.',
        '8. Double-check slot consistency (p1a, p1b, p2a, p2b), never duplicate a move or switch from consecutive frames, and verify HP values against the HUD plates.'
      );
      return lines.join('\n');
    }

    return { reset: reset, step: step, stats: stats, buildSheets: buildSheets, buildPrompt: buildPrompt };
  }

  return { create: create };
});

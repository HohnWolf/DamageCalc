// Matchlog: kompakte Leseform aus dem JSON-Protokoll.
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.CCMatchlogFormat = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  var STAT_NAME = { atk: 'Attack', def: 'Defense', spa: 'Sp. Atk', spd: 'Sp. Def', spe: 'Speed', acc: 'Accuracy', eva: 'Evasion' };
  function nameOf(id, snap) {
    if (!id) return '?';
    var m = (snap.mons || {})[id];
    if (m && m.species) return m.species;
    return String(id);
  }
  function poss(name) {
    if (!name) return '?';
    if (/s$/i.test(name)) return name + "'";
    return name + "'s";
  }
  function hpRange(hit) {
    var b = (hit && hit.before) || {}, a = (hit && hit.after) || {};
    if (b.cur != null && a.cur != null) return b.cur + ' -> ' + a.cur;
    if (b.pct != null && a.pct != null) return b.pct + '% -> ' + a.pct + '%';
    if (a.cur != null) return String(a.cur);
    if (a.pct != null) return a.pct + '%';
    return '';
  }
  function dmgText(hit, snap) {
    var who = nameOf(hit.mon, snap);
    var r = hpRange(hit);
    return r ? who + ' ' + r : who;
  }
  function render(snap) {
    var lines = [];
    var foe = (snap.teams && snap.teams.foe) || [];
    var you = (snap.teams && snap.teams.you) || [];
    var youNames = you.map(function (m) { return m.species; }).filter(Boolean);
    var foeNames = foe.map(function (m) { return m.species; }).filter(Boolean);
    var brought = you.filter(function (m) { return m.brought && m.species; }).map(function (m) { return m.species; });
    if (youNames.length) lines.push('eigenes Team: ' + youNames.join(', '));
    lines.push('Gegner Team: ' + (foeNames.length ? foeNames.join(', ') : (snap.foeSeen && snap.foeSeen.length ? snap.foeSeen.join(', ') + ' (gesehen)' : '(Icons, noch nicht gelesen)')));
    if (brought.length) lines.push('Selber gebracht: ' + brought.join(', '));

    var leads = (snap.leads && snap.leads.foe) || [];
    var youLeads = (snap.leads && snap.leads.you) || [];
    if (leads.length || youLeads.length || (snap.turns && snap.turns.length)) {
      lines.push('');
      lines.push('Match start:');
      if (leads.length) lines.push('Gegner Lead: ' + leads.map(function (id) { return nameOf(id, snap); }).join(' + '));
      if (youLeads.length) lines.push('Eigenes Lead: ' + youLeads.map(function (id) { return nameOf(id, snap); }).join(' + '));
    }

    (snap.turns || []).forEach(function (turn) {
      var rows = [];
      (turn.events || []).forEach(function (ev) {
        var row = eventLine(ev, snap);
        if (row) rows.push(row);
      });
      if (!rows.length) return;
      if (turn.n === 0 && youLeads.length && rows.every(function (r) { return /switch in$/.test(r); })) return;
      lines.push('');
      if (turn.n > 0) lines.push('Turn ' + turn.n + ':');
      rows.forEach(function (r) { lines.push(r); });
    });

    if (snap.result) {
      lines.push('');
      if (snap.result.reason === 'forfeit') lines.push(snap.result.winner === 'you' ? 'Enemy forfeit' : snap.result.winner === 'foe' ? 'You forfeit' : 'Forfeit');
      lines.push(snap.result.winner === 'you' ? 'You win' : snap.result.winner === 'foe' ? 'Enemy win' : 'Match ended');
    }
    return lines.join('\n');
  }
  function eventLine(ev, snap) {
    if (!ev || ev.kind === 'center' || ev.kind === 'mega_react' || ev.kind === 'result') return '';
    if (ev.kind === 'effectiveness' && ev.value !== 'immune') return '';
    var mon = nameOf(ev.mon || ev.actor, snap);
    if (ev.kind === 'send_out') {
      var list = (ev.mons || []).map(function (id) { return nameOf(id, snap); });
      if (!list.length) return '';
      return (ev.side === 'foe' ? 'Enemy ' : '') + list.join(' + ') + ' switch in';
    }
    if (ev.kind === 'switch') {
      return (ev.side === 'foe' ? 'Enemy ' : '') + nameOf(ev.from, snap) + ' switch into ' + mon;
    }
    if (ev.kind === 'withdraw') return (ev.side === 'foe' ? 'Enemy ' : '') + mon + ' withdrew';
    if (ev.kind === 'mega') return mon + ' Mega evolve to ' + (ev.into || 'Mega');
    if (ev.kind === 'ability') {
      var extra = '';
      if (ev.field) extra = ' -> ' + ev.field;
      if (ev.boost) extra = ' -> ' + mon + ' ' + (STAT_NAME[ev.boost.stat] || ev.boost.stat || 'Stat') + ' ' + signed(ev.boost.stages);
      return poss(mon) + ' ' + (ev.ability || 'Ability') + extra;
    }
    if (ev.kind === 'item') {
      var extraI = '';
      if (ev.boost) extraI = ' -> ' + mon + ' ' + (STAT_NAME[ev.boost.stat] || 'Stat') + ' ' + signed(ev.boost.stages);
      return poss(mon) + ' ' + (ev.item || 'Item') + extraI;
    }
    if (ev.kind === 'knock_off') return poss(mon) + ' ' + (ev.item || 'Item') + ' knocked off';
    if (ev.kind === 'field') return (ev.field === 'Tailwind' && ev.side === 'foe' ? 'Enemy ' : '') + (ev.field || 'Field');
    if (ev.kind === 'field_end') return (ev.side === 'foe' ? 'Enemy ' : '') + (ev.field || 'Field') + ' ended';
    if (ev.kind === 'move') {
      var row = mon + ' ' + (ev.move || '?');
      var res = [];
      (ev.outcomes || []).forEach(function (o) {
        var who = nameOf(o.mon, snap);
        res.push(o.kind === 'protected' ? who + ' protected' : who + ' isnt affected');
      });
      (ev.hits || []).forEach(function (h) { res.push(dmgText(h, snap)); });
      if (res.length) row += ' -> ' + res.join(', ');
      if (ev.miss) row += ' (miss)';
      return row;
    }
    if (ev.kind === 'recoil') {
      var hr = ev.hit ? hpRange(ev.hit) : '';
      return mon + ' recoil' + (hr ? ' ' + hr : '');
    }
    if (ev.kind === 'boost') return mon + ' ' + (STAT_NAME[ev.stat] || ev.stat || 'Stat') + ' ' + signed(ev.stages);
    if (ev.kind === 'flinch') return mon + ' flinched';
    if (ev.kind === 'faint') return mon + ' fainted';
    if (ev.kind === 'effectiveness') return (mon !== '?' ? mon + ' ' : '') + 'isnt affected';
    if (ev.kind === 'forfeit') return ev.side === 'you' ? 'You forfeit' : ev.side === 'foe' ? 'Enemy forfeit' : '';
    return '';
  }
  function signed(n) {
    n = n || 0;
    return (n > 0 ? '+' : '') + n;
  }

  // Showdown-Replay-Protokoll (kompatibel mit RattataLab Team-Analyse & PASRS 7.0).
  function sdMegaForme(into, base) {
    var m = /^Mega (.+?)(?: ([XYZ]))?$/i.exec(into || '');
    if (m) return m[1] + '-Mega' + (m[2] ? '-' + m[2].toUpperCase() : '');
    return base + '-Mega';
  }
  function renderShowdown(snap) {
    var lines = [];
    var p1Name = (snap.players && snap.players.you) || 'You';
    var p2Name = (snap.players && snap.players.foe) || 'Opponent';
    lines.push('|player|p1|' + p1Name + '|');
    lines.push('|player|p2|' + p2Name + '|');
    lines.push('|teamsize|p1|' + ((snap.teams && snap.teams.you && snap.teams.you.length) || 6));
    lines.push('|teamsize|p2|' + Math.max(4, (snap.teams && snap.teams.foe && snap.teams.foe.length) || (snap.foeSeen && snap.foeSeen.length) || 6));
    lines.push('|gametype|doubles');
    lines.push('|gen|9');
    lines.push('|tier|[Gen 9] Champions VGC Doubles');

    var youTeam = (snap.teams && snap.teams.you) || [];
    var foeTeam = (snap.teams && snap.teams.foe && snap.teams.foe.length)
      ? snap.teams.foe.map(function (m) { return m.species; }).filter(Boolean)
      : (snap.foeSeen || []).slice();
    var youItemBySpecies = {};
    youTeam.forEach(function (m) {
      if (!m || !m.species) return;
      youItemBySpecies[m.species.toLowerCase()] = m.item || '';
      lines.push('|poke|p1|' + m.species + ', L50|' + (m.item || ''));
    });
    foeTeam.forEach(function (sp) {
      if (sp) lines.push('|poke|p2|' + sp + ', L50|');
    });
    lines.push('|teampreview|4');
    lines.push('|start');

    var active = { p1a: '', p1b: '', p2a: '', p2b: '' };
    var dead = {};
    var lastMegaItem = { you: '', foe: '' };

    function sideOf(id, fallback) {
      if (id && String(id).indexOf('you:') === 0) return 'you';
      if (id && String(id).indexOf('foe:') === 0) return 'foe';
      return fallback === 'foe' ? 'foe' : 'you';
    }
    function slotOf(id, sideHint) {
      var side = sideOf(id, sideHint);
      var a = side === 'you' ? 'p1a' : 'p2a';
      var b = side === 'you' ? 'p1b' : 'p2b';
      if (active[a] === id) return a;
      if (active[b] === id) return b;
      if (!active[a] || dead[active[a]]) { active[a] = id; return a; }
      if (!active[b] || dead[active[b]]) { active[b] = id; return b; }
      return a;
    }
    function ensureOnField(id, sideHint, hpHint) {
      if (!id) return '';
      var side = sideOf(id, sideHint);
      var a = side === 'you' ? 'p1a' : 'p2a';
      var b = side === 'you' ? 'p1b' : 'p2b';
      if (active[a] === id) return a;
      if (active[b] === id) return b;
      var sl = (!active[a] || dead[active[a]]) ? a : b;
      active[sl] = id;
      delete dead[id];
      lines.push('|switch|' + ident(sl, id) + '|' + nameOf(id, snap) + ', L50|' + hpStr(hpHint));
      return sl;
    }
    function ident(slot, id) {
      return slot + ': ' + nameOf(id, snap);
    }
    function hpStr(h) {
      if (!h) return '100/100';
      if (h.cur === 0 || h.pct === 0) return '0 fnt';
      if (h.cur != null && h.max != null) return h.cur + '/' + h.max;
      if (h.pct != null) return h.pct + '/100';
      return '100/100';
    }

    var youLeads = (snap.leads && snap.leads.you) || [];
    var foeLeads = (snap.leads && snap.leads.foe) || [];
    if (youLeads[0]) { active.p1a = youLeads[0]; lines.push('|switch|' + ident('p1a', youLeads[0]) + '|' + nameOf(youLeads[0], snap) + ', L50|100/100'); }
    if (youLeads[1]) { active.p1b = youLeads[1]; lines.push('|switch|' + ident('p1b', youLeads[1]) + '|' + nameOf(youLeads[1], snap) + ', L50|100/100'); }
    if (foeLeads[0]) { active.p2a = foeLeads[0]; lines.push('|switch|' + ident('p2a', foeLeads[0]) + '|' + nameOf(foeLeads[0], snap) + ', L50|100/100'); }
    if (foeLeads[1]) { active.p2b = foeLeads[1]; lines.push('|switch|' + ident('p2b', foeLeads[1]) + '|' + nameOf(foeLeads[1], snap) + ', L50|100/100'); }

    var turnIdx = 0;
    (snap.turns || []).forEach(function (turn) {
      if (!turn || turn.n === 0 || !turn.events || !turn.events.length) return;
      var hasReal = turn.events.some(function (e) {
        return e && e.kind !== 'result' && e.kind !== 'center' && e.kind !== 'mega_react';
      });
      if (!hasReal) return;
      turnIdx += 1;
      lines.push('|turn|' + turnIdx);
      turn.events.forEach(function (ev) {
        if (!ev) return;
        if (ev.kind === 'mega_react' && ev.item) {
          lastMegaItem[ev.side === 'foe' ? 'foe' : 'you'] = ev.item;
          return;
        }
        if (ev.kind === 'switch' && ev.mon) {
          var side = sideOf(ev.mon, ev.side);
          var a = side === 'you' ? 'p1a' : 'p2a';
          var b = side === 'you' ? 'p1b' : 'p2b';
          var sl = (ev.from && active[a] === ev.from) ? a : (ev.from && active[b] === ev.from) ? b : slotOf(ev.mon, side);
          active[sl] = ev.mon;
          delete dead[ev.mon];
          lines.push('|switch|' + ident(sl, ev.mon) + '|' + nameOf(ev.mon, snap) + ', L50|100/100');
          return;
        }
        if (ev.kind === 'send_out' && ev.mons && ev.mons.length) {
          ev.mons.forEach(function (id) {
            var side = sideOf(id, ev.side);
            var a = side === 'you' ? 'p1a' : 'p2a';
            var b = side === 'you' ? 'p1b' : 'p2b';
            if (active[a] === id || active[b] === id) return;
            var sl = (!active[a] || dead[active[a]]) ? a : b;
            active[sl] = id;
            delete dead[id];
            lines.push('|switch|' + ident(sl, id) + '|' + nameOf(id, snap) + ', L50|100/100');
          });
          return;
        }
        if (ev.kind === 'mega' && ev.mon) {
          var mSl = slotOf(ev.mon, ev.side);
          var base = nameOf(ev.mon, snap);
          var forme = sdMegaForme(ev.into, base);
          var sideM = sideOf(ev.mon, ev.side);
          var stone = (sideM === 'you' ? youItemBySpecies[base.toLowerCase()] : '') || lastMegaItem[sideM] || '';
          lines.push('|detailschange|' + ident(mSl, ev.mon) + '|' + forme + ', L50');
          lines.push('|-mega|' + ident(mSl, ev.mon) + '|' + base + '|' + stone);
          return;
        }
        if (ev.kind === 'move' && ev.mon && ev.move) {
          var actSl = ensureOnField(ev.mon, ev.side);
          var tgtId = (ev.hits && ev.hits[0] && ev.hits[0].mon) || (ev.outcomes && ev.outcomes[0] && ev.outcomes[0].mon) || '';
          var tgtHp = (ev.hits && ev.hits[0] && ev.hits[0].before) || null;
          var tgtStr = tgtId ? ident(ensureOnField(tgtId, '', tgtHp), tgtId) : ident(actSl, ev.mon);
          lines.push('|move|' + ident(actSl, ev.mon) + '|' + ev.move + '|' + tgtStr);
          (ev.hits || []).forEach(function (h) {
            var hSl = ensureOnField(h.mon, '', h.before);
            lines.push('|-damage|' + ident(hSl, h.mon) + '|' + hpStr(h.after));
          });
          return;
        }
        if (ev.kind === 'recoil' && ev.mon) {
          var rSl = slotOf(ev.mon, ev.side);
          if (ev.hit && ev.hit.after) lines.push('|-damage|' + ident(rSl, ev.mon) + '|' + hpStr(ev.hit.after) + '|[from] Recoil');
          return;
        }
        if (ev.kind === 'faint' && ev.mon) {
          var fSl = slotOf(ev.mon, ev.side);
          dead[ev.mon] = true;
          lines.push('|faint|' + ident(fSl, ev.mon));
          return;
        }
        if (ev.kind === 'field' && ev.field) {
          if (ev.field === 'Tailwind') {
            var pSide = ev.side === 'foe' ? ('p2: ' + p2Name) : ('p1: ' + p1Name);
            lines.push('|-sidestart|' + pSide + '|move: Tailwind');
          } else if (/Snow|Rain|Sun|Sandstorm/.test(ev.field)) {
            lines.push('|-weather|' + ev.field);
          } else {
            lines.push('|-fieldstart|move: ' + ev.field);
          }
          return;
        }
        if (ev.kind === 'field_end' && ev.field) {
          if (ev.field === 'Tailwind') {
            var peSide = ev.side === 'foe' ? ('p2: ' + p2Name) : ('p1: ' + p1Name);
            lines.push('|-sideend|' + peSide + '|move: Tailwind');
          } else {
            lines.push('|-fieldend|move: ' + ev.field);
          }
          return;
        }
        if (ev.kind === 'boost' && ev.mon && ev.stat) {
          var bSl = slotOf(ev.mon, ev.side);
          var stg = ev.stages || 1;
          lines.push((stg >= 0 ? '|-boost|' : '|-unboost|') + ident(bSl, ev.mon) + '|' + ev.stat + '|' + Math.abs(stg));
          return;
        }
        if (ev.kind === 'knock_off' && ev.mon && ev.item) {
          var kSl = slotOf(ev.mon, ev.side);
          lines.push('|-enditem|' + ident(kSl, ev.mon) + '|' + ev.item + '|[from] move: Knock Off');
        }
      });
    });

    if (snap.result && snap.result.winner) {
      lines.push('|win|' + (snap.result.winner === 'you' ? p1Name : p2Name));
    }
    return lines.join('\n');
  }
  return { render: render, renderShowdown: renderShowdown, eventLine: eventLine };
});

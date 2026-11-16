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
    if (ev.kind === 'field') return ev.field || 'Field';
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
  return { render: render, eventLine: eventLine };
});

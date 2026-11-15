// Matchlog: Jeremys Leseform aus dem JSON-Protokoll, auf Deutsch.
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.CCMatchlogFormat = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  var STAT_DE = { atk: 'Angriff', def: 'Verteidigung', spa: 'Sp.-Angriff', spd: 'Sp.-Verteidigung', spe: 'Initiative', acc: 'Genauigkeit', eva: 'Fluchtwert' };
  function nameOf(id, snap) {
    if (!id) return '?';
    var m = (snap.mons || {})[id];
    if (m && m.species) return m.species.replace(/^Mega /, 'Mega ');
    return String(id);
  }
  function poss(name) {
    if (!name) return '?';
    if (/[sßxz]$/i.test(name) || /Mega /.test(name)) return name + "'";
    return name + 's';
  }
  function joinUnd(list) {
    if (!list.length) return '–';
    if (list.length === 1) return list[0];
    return list.slice(0, -1).join(', ') + ' und ' + list[list.length - 1];
  }
  function dmgText(hit, snap) {
    var who = nameOf(hit.mon, snap);
    var b = hit.before || {}, a = hit.after || {};
    var parts = [who];
    if (b.cur != null && a.cur != null) {
      var pct = (b.max ? Math.round(100 * (b.cur - a.cur) / b.max) : (b.pct != null && a.pct != null ? b.pct - a.pct : null));
      parts.push(b.cur + '/' + (b.max || a.max || '?') + ' → ' + a.cur + '/' + (a.max || b.max || '?'));
      if (pct != null) parts[parts.length - 1] += ' (' + pct + '% Schaden)';
    } else if (b.pct != null && a.pct != null) {
      parts.push(b.pct + '% → ' + a.pct + '% (' + (b.pct - a.pct) + '% Schaden)');
    } else if (a.pct != null) parts.push(a.pct + '%');
    else if (a.cur != null) parts.push(a.cur + '/' + (a.max || '?'));
    if (hit.ko) parts.push('K.O.');
    return parts.join(' ');
  }
  function render(snap) {
    var lines = [];
    var foe = (snap.teams && snap.teams.foe) || [];
    var you = (snap.teams && snap.teams.you) || [];
    var foeNames = foe.map(function (m) { return m.species; }).filter(Boolean);
    var brought = you.filter(function (m) { return m.brought && m.species; }).map(function (m) { return m.species; });
    if (!brought.length) brought = you.map(function (m) { return m.species; }).filter(Boolean);
    lines.push('Gegner Team: ' + (foeNames.length ? foeNames.join(', ') : '(Icons, in diesem Test noch nicht gelesen)'));
    if (snap.foeSeen && snap.foeSeen.length) lines.push('Gegner gesehen: ' + snap.foeSeen.join(', '));
    lines.push('selber gebracht: ' + (brought.length ? brought.join(', ') : '–'));
    var leads = (snap.leads && snap.leads.foe) || [];
    if (leads.length) lines.push('Lead Gegner: ' + joinUnd(leads.map(function (id) { return nameOf(id, snap); })));
    var youLeads = (snap.leads && snap.leads.you) || [];
    if (youLeads.length) lines.push('Lead selbst: ' + joinUnd(youLeads.map(function (id) { return nameOf(id, snap); })));
    (snap.turns || []).forEach(function (turn) {
      lines.push('');
      lines.push('Turn ' + turn.n + ':');
      if (turn.choices && turn.choices.length) {
        lines.push('Gedrückt:');
        turn.choices.forEach(function (c) {
          var bit = nameOf(c.mon, snap) + ': ';
          if (c.mega) bit += 'Mega-Entwicklung + ';
          bit += c.move || c.action || '?';
          if (c.target) bit += ' → ' + nameOf(c.target, snap);
          lines.push(bit);
        });
      }
      if (turn.n > 0) lines.push('Turn playout:');
      (turn.events || []).forEach(function (ev) {
        var row = eventLine(ev, snap);
        if (row) lines.push(row);
      });
    });
    if (snap.result) {
      lines.push('');
      if (snap.result.reason === 'forfeit') lines.push(snap.result.winner === 'you' ? 'Gegner Forfeit' : 'Selbst Forfeit');
      lines.push(snap.result.winner === 'you' ? 'Spiel gewonnen' : snap.result.winner === 'foe' ? 'Spiel verloren' : 'Spiel beendet');
    }
    return lines.join('\n');
  }
  function eventLine(ev, snap) {
    if (!ev || ev.kind === 'center' || ev.kind === 'mega_react') return '';
    var mon = nameOf(ev.mon || ev.actor, snap);
    if (ev.kind === 'send_out') {
      var list = (ev.mons || []).map(function (id) { return nameOf(id, snap); });
      return (ev.side === 'you' ? 'Du schickst ' : 'Gegner schickt ') + joinUnd(list) + ' raus';
    }
    if (ev.kind === 'withdraw') return (ev.side === 'foe' ? 'Gegner ruft ' : 'Du rufst ') + mon + ' zurück';
    if (ev.kind === 'mega') return mon + ' Mega-Entwicklung zu ' + (ev.into || 'Mega');
    if (ev.kind === 'ability') {
      var extra = '';
      if (ev.field) extra = ' → ' + ev.field + ' gesetzt';
      if (ev.boost) extra = ' → ' + mon + ' ' + (STAT_DE[ev.boost.stat] || ev.boost.stat || 'Wert') + ' ' + signed(ev.boost.stages);
      return poss(mon) + ' ' + (ev.ability || 'Fähigkeit') + extra;
    }
    if (ev.kind === 'item') {
      var extraI = '';
      if (ev.boost) extraI = ' → ' + mon + ' ' + (STAT_DE[ev.boost.stat] || 'Wert') + ' ' + signed(ev.boost.stages);
      return poss(mon) + ' ' + (ev.item || 'Item') + extraI;
    }
    if (ev.kind === 'field') return (ev.field || 'Feld') + ' gesetzt';
    if (ev.kind === 'move') {
      var row = mon + ' ' + (ev.move || '?');
      (ev.hits || []).forEach(function (h) { row += ' → ' + dmgText(h, snap); });
      if (ev.miss) row += ' (daneben)';
      return row;
    }
    if (ev.kind === 'boost') {
      return mon + ' ' + (STAT_DE[ev.stat] || ev.stat || 'Wert') + ' ' + signed(ev.stages);
    }
    if (ev.kind === 'flinch') return mon + ' flinched';
    if (ev.kind === 'faint') return mon + ' K.O.';
    if (ev.kind === 'effectiveness') {
      var w = ev.value === 'super' ? 'sehr effektiv' : ev.value === 'resist' ? 'nicht sehr effektiv' : 'keine Wirkung';
      return w + (mon && mon !== '?' ? ' gegen ' + mon : '');
    }
    if (ev.kind === 'forfeit') return ev.side === 'you' ? 'Selbst Forfeit' : 'Gegner Forfeit';
    return '';
  }
  function signed(n) {
    n = n || 0;
    return (n > 0 ? '+' : '') + n;
  }
  return { render: render, eventLine: eventLine };
});

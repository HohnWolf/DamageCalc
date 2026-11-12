// Offline replay viewer. The log is the local simulator log. Nothing is loaded from the network.
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.RLMetaReplay = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function parse(log) {
    const lines = String(log || '').split('\n').filter(Boolean);
    const turns = [{ n: 0, rows: [] }];
    lines.forEach(function (line) {
      const p = line.split('|');
      const tag = p[0] === '' ? p[1] : p[0];
      const a = p[0] === '' ? p.slice(1) : p;
      if (tag === 'turn') {
        turns.push({ n: +a[1] || turns.length, rows: [] });
        return;
      }
      if (tag === 't:' || tag === 'gametype' || tag === '' || tag === 'split') return;
      const cur = turns[turns.length - 1];
      if (tag === 'move') cur.rows.push({ k: 'move', text: name(a[1]) + ' setzt ' + (a[2] || '') + (a[3] ? ' gegen ' + name(a[3]) : '') });
      else if (tag === 'switch' || tag === 'drag') cur.rows.push({ k: 'switch', text: name(a[1]) + ' kommt (' + (a[2] || '') + ', ' + (a[3] || '') + ')' });
      else if (tag === '-damage') cur.rows.push({ k: 'dmg', text: name(a[1]) + ' → ' + (a[2] || '') });
      else if (tag === 'faint') cur.rows.push({ k: 'faint', text: name(a[1]) + ' ist besiegt' });
      else if (tag === '-mega') cur.rows.push({ k: 'mega', text: name(a[1]) + ' entwickelt sich zu ' + (a[2] || 'Mega') });
      else if (tag === '-weather') cur.rows.push({ k: 'field', text: 'Wetter: ' + (a[1] || '') });
      else if (tag === '-fieldstart' || tag === '-sidestart') cur.rows.push({ k: 'field', text: (a[1] || '') + (a[2] ? ' (' + a[2] + ')' : '') });
      else if (tag === '-boost' || tag === '-unboost') cur.rows.push({ k: 'boost', text: name(a[1]) + ' ' + (tag === '-boost' ? '+' : '−') + (a[3] || '') + ' ' + (a[2] || '') });
      else if (tag === '-status') cur.rows.push({ k: 'status', text: name(a[1]) + ': ' + (a[2] || '') });
      else if (tag === 'win') cur.rows.push({ k: 'win', text: (a[1] || 'Unentschieden') + ' gewinnt' });
      else if (tag === 'cant' || tag === '-fail') cur.rows.push({ k: 'fail', text: name(a[1]) + ' scheitert' + (a[2] ? ' (' + a[2] + ')' : '') });
    });
    return turns.filter(function (t) { return t.rows.length || t.n === 0; });
  }
  function name(ident) {
    const s = String(ident || '');
    const i = s.indexOf(':');
    return i >= 0 ? s.slice(i + 1).trim() : s;
  }
  function html(log, title) {
    const turns = parse(log);
    const body = turns.map(function (t) {
      const rows = t.rows.map(function (r) {
        return '<li class="k-' + r.k + '">' + esc(r.text) + '</li>';
      }).join('');
      return '<section><h2>' + (t.n ? 'Runde ' + t.n : 'Teamvorschau') + '</h2><ul>' + rows + '</ul></section>';
    }).join('');
    return '<!DOCTYPE html><html lang="de"><head><meta charset="utf-8"><title>' + esc(title || 'Meta-Test') + '</title><style>' +
      'body{margin:0;background:#14161a;color:#eceff3;font:14px/1.45 Segoe UI,sans-serif}' +
      'header{padding:14px 18px;background:#1d2026;border-bottom:1px solid #333}' +
      'h1{margin:0;font-size:16px} p{margin:4px 0 0;color:#9aa3af;font-size:12px}' +
      'main{padding:12px 18px 28px;max-width:820px} section{margin:0 0 14px}' +
      'h2{margin:0 0 6px;font-size:13px;color:#8eb6ef} ul{margin:0;padding:0;list-style:none}' +
      'li{padding:3px 8px;border-left:3px solid #3a7bd5;margin:0 0 3px;background:#1c1f25}' +
      '.k-faint{border-color:#e5484d}.k-dmg{border-color:#e0b33a}.k-win{border-color:#3cb96a}' +
      '.k-mega{border-color:#c77dff}.k-fail{border-color:#666;color:#aaa}' +
      '</style></head><body><header><h1>' + esc(title || 'Lokales Replay') + '</h1>' +
      '<p>Nur dieses Gerät. Kein Pokémon-Showdown-Server, kein Ladder.</p></header><main>' +
      body + '</main></body></html>';
  }
  return { html: html, parse: parse };
});

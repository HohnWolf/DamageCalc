// Eigene Bestätigungsfenster statt des nativen Windows-Dialogs: ccConfirm(text, onYes, { danger, title, ok, cancel }).
// ok / cancel / title dürfen ein Text oder [Deutsch, Englisch] sein. Esc und Klick daneben brechen ab, Enter bestätigt.
(function () {
  'use strict';
  var openDialog = null;

  function pick(v, de) { return Array.isArray(v) ? (de ? v[0] : v[1]) : v; }

  function ccConfirm(message, onYes, opts) {
    opts = opts || {};
    var de = (document.documentElement.lang || 'de').slice(0, 2) === 'de';
    if (openDialog) return;
    var danger = !!opts.danger;
    var prevFocus = document.activeElement;

    var wrap = document.createElement('div');
    wrap.className = 'modal cc-dlg-wrap';
    var box = document.createElement('div');
    box.className = 'modal-box cc-dlg' + (danger ? ' danger' : '');
    box.setAttribute('role', 'alertdialog');
    box.setAttribute('aria-modal', 'true');

    var head = document.createElement('div');
    head.className = 'cc-dlg-head';
    var ic = document.createElement('span');
    ic.className = 'cc-dlg-ic';
    ic.setAttribute('aria-hidden', 'true');
    var title = document.createElement('h3');
    title.id = 'ccDlgTitle';
    title.textContent = pick(opts.title, de) || (danger ? (de ? 'Achtung' : 'Warning') : (de ? 'Bestätigen' : 'Confirm'));
    head.appendChild(ic); head.appendChild(title);

    var msg = document.createElement('p');
    msg.className = 'cc-dlg-msg';
    msg.id = 'ccDlgMsg';
    msg.textContent = String(message == null ? '' : message);
    box.setAttribute('aria-labelledby', 'ccDlgTitle');
    box.setAttribute('aria-describedby', 'ccDlgMsg');

    var actions = document.createElement('div');
    actions.className = 'cc-dlg-actions';
    var no = document.createElement('button');
    no.type = 'button';
    no.className = 'cc-no';
    no.textContent = pick(opts.cancel, de) || (de ? 'Abbrechen' : 'Cancel');
    var yes = document.createElement('button');
    yes.type = 'button';
    yes.className = 'cc-yes' + (danger ? ' danger-solid' : ' primary-btn');
    yes.textContent = pick(opts.ok, de) || (danger ? (de ? 'Löschen' : 'Delete') : 'OK');
    actions.appendChild(no); actions.appendChild(yes);

    box.appendChild(head); box.appendChild(msg); box.appendChild(actions);
    wrap.appendChild(box);
    document.body.appendChild(wrap);
    openDialog = wrap;

    function close(result) {
      if (!openDialog) return;
      document.removeEventListener('keydown', key, true);
      wrap.remove();
      openDialog = null;
      try { if (prevFocus && prevFocus.focus) prevFocus.focus(); } catch (e) { /* element gone */ }
      if (result && typeof onYes === 'function') onYes();
    }
    function key(ev) {
      if (ev.key === 'Escape') { ev.preventDefault(); ev.stopPropagation(); close(false); return; }
      if (ev.key === 'Tab') { // Fokus bleibt im Fenster
        ev.preventDefault();
        (document.activeElement === no ? yes : no).focus();
        return;
      }
      if (ev.key === 'Enter') {
        ev.preventDefault(); ev.stopPropagation();
        close(document.activeElement === no ? false : true);
        return;
      }
      ev.stopPropagation(); // Tastenkürzel der App ruhen, solange gefragt wird
    }
    document.addEventListener('keydown', key, true);
    no.addEventListener('click', function () { close(false); });
    yes.addEventListener('click', function () { close(true); });
    wrap.addEventListener('mousedown', function (ev) { if (ev.target === wrap) close(false); });
    // gefährliche Aktion: Fokus zuerst auf „Abbrechen“, damit Enter nichts Unwiderrufliches auslöst
    (danger ? no : yes).focus();
  }

  window.ccConfirm = ccConfirm;
})();

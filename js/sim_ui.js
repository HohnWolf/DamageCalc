// UI-Komponente für den Headless Matchup-Tester gegen Meta-Teams (Pokémon Champions).
// Ermöglicht das Testen des aktiven Teambuilder-Teams, von Beispiel-Archetypen oder eigenen Pastes.

(function () {
  'use strict';
  // HTML-Escape für Werte aus Pastes und Berechnungen (Species, Items, Namen)
  function h(v) { return String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

  var modalEl = null;
  var currentTeamPaste = '';
  var currentTeamName = 'Aktives Team';
  var selectedArchetypes = null; // null = alle 8
  var lastResultsData = null;

  function getTeambuilderTeam() {
    try {
      var raw = localStorage.getItem('cc_builder');
      if (!raw) return null;
      var st = JSON.parse(raw);
      if (!st || !st.teams || !st.teams.length) return null;
      var cur = st.teams.find(function (t) { return t.id === st.cur; }) || st.teams[0];
      if (!cur) return null;
      var v = (cur.versions && cur.versions.length)
        ? (cur.versions.find(function (x) { return x.id === cur.curVer; }) || cur.versions[0])
        : null;
      var mons = (v && v.mons && v.mons.length) ? v.mons : (cur.mons || []);
      if (!mons.length) return null;
      if (!window.CC || !window.CC.exportSet) return null;
      var paste = mons.map(function (m) {
        return window.CC.exportSet(m.set, m.setName, m.species);
      }).join('\n\n');
      var name = cur.name + (v && cur.versions.length > 1 ? ' (' + v.name + ')' : '');
      return { paste: paste, name: name, count: mons.length };
    } catch (e) {
      return null;
    }
  }

  function parseMonPreview(paste) {
    if (!paste) return [];
    var blocks = paste.split(/\n\s*\n+/);
    var mons = [];

    blocks.forEach(function (block) {
      var lines = block.split('\n').map(function (l) { return l.trim(); }).filter(Boolean);
      if (!lines.length) return;

      var header = lines[0];
      var atIdx = header.indexOf('@');
      var namePart = atIdx !== -1 ? header.slice(0, atIdx).trim() : header;
      var itemPart = atIdx !== -1 ? header.slice(atIdx + 1).trim() : '';

      var mName = namePart.replace(/\s*\([MF]\)\s*$/i, '').trim();
      var nickM = /\(([^)]+)\)$/.exec(mName);
      if (nickM) mName = nickM[1].trim();

      if (!mName || /^(Ability|Level|Shiny|SPs?|EVs?|Tera Type|IVs|Happiness):/i.test(mName) || / Nature$/i.test(mName) || mName.startsWith('-')) {
        return;
      }

      var ability = '';
      var sps = '';
      var nature = '';

      lines.slice(1).forEach(function (line) {
        if (/^Ability:/i.test(line)) {
          ability = line.replace(/^Ability:\s*/i, '').trim();
        } else if (/^(SPs?|EVs?):/i.test(line)) {
          sps = line.replace(/^(SPs?|EVs?):\s*/i, '').trim();
        } else if (/ Nature$/i.test(line)) {
          nature = line.replace(/\s*Nature$/i, '').trim();
        }
      });

      mons.push({
        species: mName,
        item: itemPart,
        ability: ability,
        sps: sps,
        nature: nature
      });
    });

    return mons.slice(0, 6);
  }

  function renderTeamPreview(paste) {
    var container = modalEl.querySelector('#simTeamPreview');
    if (!container) return;
    container.innerHTML = '';

    var mons = parseMonPreview(paste);
    if (!mons.length) {
      container.innerHTML = '<div class="sim-empty-hint">Kein Pokémon im Team erkannt. Wähle ein Preset oder füge eine Team-Paste ein.</div>';
      return;
    }

    mons.forEach(function (m) {
      var card = document.createElement('div');
      card.className = 'sim-mon-badge';

      var spriteWrap = document.createElement('div');
      spriteWrap.className = 'sim-mon-ic';
      if (window.CC && window.CC.spriteFit) {
        spriteWrap.appendChild(window.CC.spriteFit(m.species));
      } else {
        var img = document.createElement('img');
        img.src = `https://play.pokemonshowdown.com/sprites/gen5/${m.species.toLowerCase().replace(/[^a-z0-9]/g, '')}.png`;
        img.alt = m.species;
        spriteWrap.appendChild(img);
      }

      var info = document.createElement('div');
      info.className = 'sim-mon-info';
      info.innerHTML = `
        <span class="sim-mon-name">${h(m.species)}</span>
        <span class="sim-mon-sub">${h(m.item ? '@ ' + m.item : '')} ${h(m.ability ? '· ' + m.ability : '')}</span>
        <span class="sim-mon-sp">${h(m.sps ? 'SPs: ' + m.sps : '')}</span>
      `;

      card.appendChild(spriteWrap);
      card.appendChild(info);
      container.appendChild(card);
    });
  }

  function createModalDOM() {
    if (modalEl) return;

    modalEl = document.createElement('div');
    modalEl.id = 'simModal';
    modalEl.className = 'modal hidden';
    modalEl.innerHTML = `
      <div class="modal-box sim-modal-box">
        <div class="sim-header">
          <div>
            <h3 class="sim-title">⚔️ Meta Matchup-Tester</h3>
            <p class="sim-subtitle" id="simTeamSubtitle">Format: [Gen 9 Champions] VGC 2026 Reg M-C (Level 50 · Stat Points)</p>
          </div>
          <button class="tbtn sim-close-btn" id="simBtnClose" title="Schließen">✕</button>
        </div>

        <!-- Team-Auswahl & Vorschau -->
        <div class="sim-team-bar">
          <div class="sim-team-select-row">
            <label for="simTeamSelect"><strong>Test-Team:</strong></label>
            <select id="simTeamSelect" class="sim-team-dropdown"></select>
            <button class="tbtn" id="simBtnEditPaste" title="Team-Paste anzeigen oder manuell bearbeiten">📝 Paste bearbeiten</button>
          </div>

          <div class="sim-paste-drawer hidden" id="simPasteDrawer">
            <textarea id="simPasteInput" class="sim-paste-textarea" spellcheck="false" placeholder="Hier Team-Paste im Champions-Format einfügen (mit SPs oder EVs)..."></textarea>
            <div class="sim-paste-actions">
              <button class="tbtn primary" id="simBtnApplyPaste">Übernehmen</button>
              <button class="tbtn" id="simBtnClosePaste">Schließen</button>
            </div>
          </div>

          <div class="sim-team-preview" id="simTeamPreview"></div>
        </div>

        <!-- Steuerungsleiste -->
        <div class="sim-toolbar">
          <div class="sim-matches-select">
            <label for="simMatchesPerArch">Matches je Archetyp:</label>
            <select id="simMatchesPerArch">
              <option value="50" selected>50 (Empfohlen: ~500 Matches)</option>
              <option value="100">100 (~1.000 Matches)</option>
              <option value="200">200 (~2.000 Matches)</option>
            </select>
          </div>

          <div class="sim-actions">
            <button class="primary-btn sim-start-btn" id="simBtnStart">⚔️ Simulation starten</button>
            <button class="tbtn danger hidden" id="simBtnCancel">Abbrechen</button>
          </div>
        </div>

        <!-- Fortschrittsbalken -->
        <div class="sim-progress-box hidden" id="simProgressBox">
          <div class="sim-progress-info">
            <span id="simProgressStatus">Bereit...</span>
            <span id="simProgressPercent">0 %</span>
          </div>
          <div class="sim-progress-bar-bg">
            <div class="sim-progress-bar-fill" id="simProgressBarFill" style="width: 0%;"></div>
          </div>
        </div>

        <!-- Inhaltsbereich / Ergebnisse -->
        <div class="sim-content" id="simContent">
          <div class="sim-placeholder">
            <p>Wähle dein Team und starte die Simulation, um hunderte oder tausende Headless-Doppelkämpfe gegen alle 10 dominierenden Champions-Meta-Teams (Sonne, Regen, Bizarroraum, Tailwind, Feen-Balance, Psyspam, Sandsturm, Schnee, Setup & Defense) durchzurechnen.</p>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modalEl);

    // Event-Listener
    modalEl.querySelector('#simBtnClose').addEventListener('click', close);
    modalEl.addEventListener('click', function (e) {
      if (e.target === modalEl && !window.SimRunner.isRunning()) close();
    });

    modalEl.querySelector('#simBtnStart').addEventListener('click', function () {
      var matches = parseInt(modalEl.querySelector('#simMatchesPerArch').value, 10) || 50;
      run(matches);
    });

    modalEl.querySelector('#simBtnCancel').addEventListener('click', function () {
      window.SimRunner.stop();
      setRunningUI(false);
      var status = modalEl.querySelector('#simProgressStatus');
      if (status) status.textContent = 'Simulation abgebrochen.';
    });

    modalEl.querySelector('#simBtnEditPaste').addEventListener('click', function () {
      var drawer = modalEl.querySelector('#simPasteDrawer');
      drawer.classList.toggle('hidden');
      if (!drawer.classList.contains('hidden')) {
        modalEl.querySelector('#simPasteInput').value = currentTeamPaste;
        modalEl.querySelector('#simPasteInput').focus();
      }
    });

    modalEl.querySelector('#simBtnClosePaste').addEventListener('click', function () {
      modalEl.querySelector('#simPasteDrawer').classList.add('hidden');
    });

    modalEl.querySelector('#simBtnApplyPaste').addEventListener('click', function () {
      var paste = modalEl.querySelector('#simPasteInput').value.trim();
      if (!paste) {
        alert('Bitte gib eine gültige Team-Paste ein.');
        return;
      }
      currentTeamPaste = paste;
      currentTeamName = 'Benutzerdefiniertes Team';
      modalEl.querySelector('#simPasteDrawer').classList.add('hidden');
      renderTeamPreview(currentTeamPaste);
      updateSubtitle();
    });

    modalEl.querySelector('#simTeamSelect').addEventListener('change', function () {
      var val = this.value;
      if (val === 'custom') {
        modalEl.querySelector('#simPasteDrawer').classList.remove('hidden');
        modalEl.querySelector('#simPasteInput').value = currentTeamPaste;
        modalEl.querySelector('#simPasteInput').focus();
        return;
      }

      if (val === 'builder') {
        var tb = getTeambuilderTeam();
        if (tb) {
          currentTeamPaste = tb.paste;
          currentTeamName = tb.name;
        }
      } else {
        var arch = (window.META_ARCHETYPES || []).find(function (a) { return a.id === val; });
        if (arch) {
          currentTeamPaste = arch.paste;
          currentTeamName = arch.name;
        }
      }
      modalEl.querySelector('#simPasteInput').value = currentTeamPaste;
      modalEl.querySelector('#simPasteDrawer').classList.add('hidden');
      renderTeamPreview(currentTeamPaste);
      updateSubtitle();
    });
  }

  function updateSubtitle() {
    var sub = modalEl.querySelector('#simTeamSubtitle');
    if (sub) {
      sub.textContent = `Team: ${currentTeamName} · [Gen 9 Champions] VGC 2026 Reg M-C (Level 50 · SPs)`;
    }
  }

  function populateTeamDropdown() {
    var select = modalEl.querySelector('#simTeamSelect');
    if (!select) return;
    select.innerHTML = '';

    var tb = getTeambuilderTeam();
    if (tb) {
      var optTb = document.createElement('option');
      optTb.value = 'builder';
      optTb.textContent = `⭐ Mein Teambuilder-Team: ${tb.name} (${tb.count} Pokémon)`;
      select.appendChild(optTb);
    }

    var group = document.createElement('optgroup');
    group.label = 'Champions Meta-Vorgaben:';
    (window.META_ARCHETYPES || []).forEach(function (arch) {
      var opt = document.createElement('option');
      opt.value = arch.id;
      opt.textContent = `Archetyp: ${arch.name}`;
      group.appendChild(opt);
    });
    select.appendChild(group);

    var optCustom = document.createElement('option');
    optCustom.value = 'custom';
    optCustom.textContent = '✏️ Eigenes Paste eingeben ...';
    select.appendChild(optCustom);
  }

  function setRunningUI(running) {
    var btnStart = modalEl.querySelector('#simBtnStart');
    var btnCancel = modalEl.querySelector('#simBtnCancel');
    var selectMatches = modalEl.querySelector('#simMatchesPerArch');
    var selectTeam = modalEl.querySelector('#simTeamSelect');
    var btnEditPaste = modalEl.querySelector('#simBtnEditPaste');
    var pBox = modalEl.querySelector('#simProgressBox');

    if (running) {
      btnStart.classList.add('hidden');
      btnCancel.classList.remove('hidden');
      selectMatches.disabled = true;
      selectTeam.disabled = true;
      btnEditPaste.disabled = true;
      pBox.classList.remove('hidden');
    } else {
      btnStart.classList.remove('hidden');
      btnCancel.classList.add('hidden');
      selectMatches.disabled = false;
      selectTeam.disabled = false;
      btnEditPaste.disabled = false;
    }
  }

  function open(teamPaste, teamName) {
    createModalDOM();
    populateTeamDropdown();

    if (teamPaste && teamPaste.trim()) {
      currentTeamPaste = teamPaste.trim();
      currentTeamName = teamName || 'Aktives Teambuilder-Team';
      var select = modalEl.querySelector('#simTeamSelect');
      if (select && select.querySelector('option[value="builder"]')) {
        select.value = 'builder';
      }
    } else {
      // Kein Team übergeben -> aus Teambuilder laden oder auf erstes Meta-Team zurückgreifen
      var tb = getTeambuilderTeam();
      if (tb) {
        currentTeamPaste = tb.paste;
        currentTeamName = tb.name;
        modalEl.querySelector('#simTeamSelect').value = 'builder';
      } else {
        var firstArch = (window.META_ARCHETYPES && window.META_ARCHETYPES[0]);
        currentTeamPaste = firstArch ? firstArch.paste : '';
        currentTeamName = firstArch ? firstArch.name : 'Beispiel-Team';
        if (firstArch) modalEl.querySelector('#simTeamSelect').value = firstArch.id;
      }
    }

    renderTeamPreview(currentTeamPaste);
    updateSubtitle();

    modalEl.classList.remove('hidden');
    document.body.classList.add('modal-open');
  }

  function close() {
    if (window.SimRunner && window.SimRunner.isRunning()) {
      window.SimRunner.stop();
    }
    setRunningUI(false);
    if (modalEl) {
      modalEl.classList.add('hidden');
      document.body.classList.remove('modal-open');
    }
  }

  function run(matchesPerArchetype) {
    if (!currentTeamPaste) {
      alert('Kein Team ausgewählt oder Teampaste ist leer.');
      return;
    }

    setRunningUI(true);
    var pFill = modalEl.querySelector('#simProgressBarFill');
    var pPercent = modalEl.querySelector('#simProgressPercent');
    var pStatus = modalEl.querySelector('#simProgressStatus');
    var content = modalEl.querySelector('#simContent');

    pFill.style.width = '0%';
    pPercent.textContent = '0 %';
    pStatus.textContent = 'Initialisiere Champions Battle-Engine...';

    content.innerHTML = `
      <div class="sim-placeholder">
        <p class="ma-busy">Simulation läuft im Hintergrund mit Stat Points & Level 50... Bitte warten.</p>
      </div>
    `;

    window.SimRunner.start(currentTeamPaste, matchesPerArchetype, {
      onProgress: function (p) {
        var pct = Math.round((p.totalCompleted / p.totalMatches) * 100);
        pFill.style.width = pct + '%';
        pPercent.textContent = pct + ' %';
        pStatus.textContent = `[${p.archetypeName}] Match ${p.currentMatch}/${p.matchesPerArchetype} (Winrate: ${p.currentArchWinrate} %)`;
      },
      onComplete: function (data) {
        setRunningUI(false);
        pFill.style.width = '100%';
        pPercent.textContent = '100 %';
        pStatus.textContent = `Fertiggestellt in ${(data.durationMs / 1000).toFixed(1)}s (${data.totalMatches} Matches durchgerechnet)`;
        lastResultsData = data;
        renderResults(data);
      },
      onError: function (err) {
        setRunningUI(false);
        pStatus.textContent = 'Fehler aufgetreten.';
        alert('Fehler bei der Simulation: ' + err);
      }
    });
  }

  function getBadgeClass(winrate) {
    if (winrate >= 60) return 'hi';
    if (winrate >= 40) return 'mid';
    return 'lo';
  }

  function renderResults(data) {
    var content = modalEl.querySelector('#simContent');
    var overallBadgeClass = getBadgeClass(data.overallWinrate);

    var html = `
      <!-- Hero / Gesamt-Winrate -->
      <div class="sim-hero">
        <div class="sim-hero-stat">
          <span class="sim-stat-label">Gesamt-Winrate</span>
          <span class="sim-hero-wr wr ${overallBadgeClass}">${data.overallWinrate} %</span>
        </div>
        <div class="sim-hero-meta">
          <span><strong>Matches:</strong> ${data.totalMatches} (${data.totalWins} Siege)</span>
          <span><strong>Dauer:</strong> ${(data.durationMs / 1000).toFixed(1)} Sekunden</span>
          <span><strong>Format:</strong> [Gen 9 Champions] VGC 2026 Reg M-C (Level 50 · Stat Points: max. 32 je Wert, 66 gesamt)</span>
        </div>
      </div>

      <!-- Matchup Matrix -->
      <div class="sim-section">
        <h4 class="sim-section-title">Ergebnisse gegen Meta-Archetypen (Klick auf Karte für Lead-Details)</h4>
        <div class="sim-matrix-grid">
    `;

    data.results.forEach(function (r, rIdx) {
      var badgeCls = getBadgeClass(r.winrate);
      var topThreat = r.threats && r.threats.length ? r.threats[0].mon + ' (' + r.threats[0].kills + ' K.O.s)' : '–';

      var bestLead = '–';
      var bestLeadWr = -1;
      var leadRows = [];
      Object.entries(r.leadStats || {}).forEach(function ([lead, stats]) {
        var wr = stats.total ? Math.round((stats.wins / stats.total) * 100) : 0;
        leadRows.push({ lead: lead, wins: stats.wins, total: stats.total, wr: wr });
        if (wr > bestLeadWr) {
          bestLeadWr = wr;
          bestLead = `${lead} (${wr} %)`;
        }
      });
      leadRows.sort(function (a, b) { return b.wr - a.wr || b.total - a.total; });

      html += `
        <div class="sim-arch-card" data-arch-idx="${rIdx}">
          <div class="sim-arch-head">
            <span class="sim-arch-badge" style="background:${r.badgeColor || '#455a64'}">${h(r.category)}</span>
            <span class="sim-arch-name">${h(r.name)}</span>
            <span class="sim-arch-wr wr ${badgeCls}">${r.winrate} %</span>
          </div>
          <div class="sim-arch-desc">${h(r.description || '')}</div>
          <div class="sim-arch-stats">
            <div><span>Bilanz:</span> <strong>${r.wins}W – ${r.losses}L</strong> (${r.total} Spiele)</div>
            <div><span>Ø Runden:</span> <strong>${r.avgTurns}</strong></div>
            <div><span>Top Threat:</span> <strong>${h(topThreat)}</strong></div>
            <div><span>Bester Lead:</span> <strong>${h(bestLead)}</strong></div>
          </div>
          <div class="sim-arch-details hidden" id="simArchDetail_${rIdx}">
            <h5 class="sim-detail-head">Lead-Aufschlüsselung gegen diesen Archetyp:</h5>
            <div class="sim-lead-breakdown">
              ${leadRows.map(function (lr) {
                return `<div class="sim-lead-row"><span>${h(lr.lead)}</span><strong>${lr.wins}/${lr.total} (${lr.wr}%)</strong></div>`;
              }).join('')}
            </div>
          </div>
        </div>
      `;
    });

    html += `
        </div>
      </div>

      <!-- Threat List & Lead Performance Split -->
      <div class="sim-split-grid">
        <!-- Gefahrenanalyse -->
        <div class="sim-section">
          <h4 class="sim-section-title">Gefahrenanalyse (Top Kills gegen dein Team)</h4>
          <div class="sim-table-wrap">
            <table class="sim-table">
              <thead>
                <tr>
                  <th>Gegnerisches Pokémon</th>
                  <th>Archetyp</th>
                  <th>Erzeugte K.O.s</th>
                </tr>
              </thead>
              <tbody>
    `;

    data.threatList.forEach(function (t) {
      html += `
        <tr>
          <td class="left"><strong>${h(t.mon)}</strong></td>
          <td>${h(t.archetype || '–')}</td>
          <td><span class="sim-kill-badge">${t.kills} K.O.s</span></td>
        </tr>
      `;
    });

    html += `
              </tbody>
            </table>
          </div>
        </div>

        <!-- Lead-Performance -->
        <div class="sim-section">
          <h4 class="sim-section-title">Lead-Performance (Gesamt über alle Matches)</h4>
          <div class="sim-table-wrap">
            <table class="sim-table">
              <thead>
                <tr>
                  <th>Eigener Lead</th>
                  <th>Spiele</th>
                  <th>Winrate</th>
                </tr>
              </thead>
              <tbody>
    `;

    data.leadPerformance.forEach(function (l) {
      var lCls = getBadgeClass(l.winrate);
      html += `
        <tr>
          <td class="left"><strong>${h(l.lead)}</strong></td>
          <td>${l.wins} / ${l.total}</td>
          <td><span class="wr ${lCls}">${l.winrate} %</span></td>
        </tr>
      `;
    });

    html += `
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    content.innerHTML = html;

    // Klick auf Karten zum Aufklappen der Lead-Details
    content.querySelectorAll('.sim-arch-card').forEach(function (card) {
      card.addEventListener('click', function () {
        var idx = this.dataset.archIdx;
        var details = content.querySelector('#simArchDetail_' + idx);
        if (details) details.classList.toggle('hidden');
      });
    });
  }

  // Automatischer Button-Link in der Kopfzeile
  function initTopbarButton() {
    var topBtn = document.getElementById('btnMetaSimTop');
    if (topBtn) {
      topBtn.addEventListener('click', function () {
        open();
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTopbarButton);
  } else {
    initTopbarButton();
  }

  window.SimUI = {
    open: open,
    close: close
  };
})();

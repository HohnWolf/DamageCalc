// UI-Komponente für den Headless Matchup-Tester gegen Meta-Teams.
// Visualisiert Matchup-Matrix, Winrate-Badges, Threat-List und Lead-Performance.

(function () {
  'use strict';

  var modalEl = null;
  var currentTeamPaste = '';
  var currentTeamName = 'Aktives Team';

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
            <p class="sim-subtitle" id="simTeamSubtitle">Format: [Gen 9 Champions] VGC 2026 Reg M-C</p>
          </div>
          <button class="tbtn sim-close-btn" id="simBtnClose" title="Schließen">✕</button>
        </div>

        <div class="sim-toolbar">
          <div class="sim-matches-select">
            <label for="simMatchesPerArch">Matches je Archetyp:</label>
            <select id="simMatchesPerArch">
              <option value="10">10 (Schnelltest: ~80 Matches)</option>
              <option value="25" selected>25 (Empfohlen: ~200 Matches)</option>
              <option value="50">50 (Präzise: ~400 Matches)</option>
            </select>
          </div>
          <div class="sim-actions">
            <button class="primary-btn" id="simBtnStart">Simulation starten</button>
            <button class="tbtn danger hidden" id="simBtnCancel">Abbrechen</button>
          </div>
        </div>

        <div class="sim-progress-box hidden" id="simProgressBox">
          <div class="sim-progress-info">
            <span id="simProgressStatus">Bereit...</span>
            <span id="simProgressPercent">0 %</span>
          </div>
          <div class="sim-progress-bar-bg">
            <div class="sim-progress-bar-fill" id="simProgressBarFill" style="width: 0%;"></div>
          </div>
        </div>

        <div class="sim-content" id="simContent">
          <div class="sim-placeholder">
            <p>Starte die Simulation, um dein Team gegen 8 dominierende Champions-Archetypen (Sonne, Regen, Bizarroraum, Tailwind, Psyspam, Schnee & Defense) in hundertfachen Headless-Doppelkämpfen zu testen.</p>
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
      var matches = parseInt(modalEl.querySelector('#simMatchesPerArch').value, 10) || 25;
      run(matches);
    });

    modalEl.querySelector('#simBtnCancel').addEventListener('click', function () {
      window.SimRunner.stop();
      setRunningUI(false);
      var status = modalEl.querySelector('#simProgressStatus');
      if (status) status.textContent = 'Simulation abgebrochen.';
    });
  }

  function setRunningUI(running) {
    var btnStart = modalEl.querySelector('#simBtnStart');
    var btnCancel = modalEl.querySelector('#simBtnCancel');
    var select = modalEl.querySelector('#simMatchesPerArch');
    var pBox = modalEl.querySelector('#simProgressBox');

    if (running) {
      btnStart.classList.add('hidden');
      btnCancel.classList.remove('hidden');
      select.disabled = true;
      pBox.classList.remove('hidden');
    } else {
      btnStart.classList.remove('hidden');
      btnCancel.classList.add('hidden');
      select.disabled = false;
    }
  }

  function open(teamPaste, teamName) {
    createModalDOM();
    currentTeamPaste = teamPaste || '';
    currentTeamName = teamName || 'Aktives Team';

    modalEl.querySelector('#simTeamSubtitle').textContent =
      `Team: ${currentTeamName} · [Gen 9 Champions] VGC 2026 Reg M-C`;

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
    pStatus.textContent = 'Starte Engine...';

    content.innerHTML = `
      <div class="sim-placeholder">
        <p class="ma-busy">Simulation läuft im Hintergrund... Bitte warten.</p>
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
        pStatus.textContent = `Abgeschlossen in ${(data.durationMs / 1000).toFixed(1)}s!`;
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
          <span><strong>Format:</strong> Gen 9 Champions (Level 50 VGC)</span>
        </div>
      </div>

      <!-- Matchup Matrix -->
      <div class="sim-section">
        <h4 class="sim-section-title">Ergebnisse gegen Meta-Archetypen</h4>
        <div class="sim-matrix-grid">
    `;

    data.results.forEach(function (r) {
      var badgeCls = getBadgeClass(r.winrate);
      var topThreat = r.threats && r.threats.length ? r.threats[0].mon + ' (' + r.threats[0].kills + ' K.O.s)' : '–';

      // Bester Lead gegen diesen Archetyp
      var bestLead = '–';
      var bestLeadWr = -1;
      Object.entries(r.leadStats || {}).forEach(function ([lead, stats]) {
        var wr = stats.total ? Math.round((stats.wins / stats.total) * 100) : 0;
        if (wr > bestLeadWr) {
          bestLeadWr = wr;
          bestLead = `${lead} (${wr} %)`;
        }
      });

      html += `
        <div class="sim-arch-card">
          <div class="sim-arch-head">
            <span class="sim-arch-badge" style="background:${r.badgeColor || '#455a64'}">${r.category}</span>
            <span class="sim-arch-name">${r.name}</span>
            <span class="sim-arch-wr wr ${badgeCls}">${r.winrate} %</span>
          </div>
          <div class="sim-arch-desc">${r.description || ''}</div>
          <div class="sim-arch-stats">
            <div><span>Bilanz:</span> <strong>${r.wins}W – ${r.losses}L</strong> (${r.total} Spiele)</div>
            <div><span>Ø Runden:</span> <strong>${r.avgTurns}</strong></div>
            <div><span>Top Threat:</span> <strong>${topThreat}</strong></div>
            <div><span>Bester Lead:</span> <strong>${bestLead}</strong></div>
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
          <td class="left"><strong>${t.mon}</strong></td>
          <td>${t.archetype || '–'}</td>
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
          <h4 class="sim-section-title">Lead-Performance (Eigene 2er-Leads)</h4>
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
          <td class="left"><strong>${l.lead}</strong></td>
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
  }

  window.SimUI = {
    open: open,
    close: close
  };
})();

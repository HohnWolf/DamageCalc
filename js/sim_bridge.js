// Android Web Worker bridge for local battles (btlrandom, btlchoice) and the full Meta-Test.
// Exposes window.RL_SIM = { battle, meta } matching window.desktop.battle & window.desktop.meta
// without setting window.desktop (which signals Electron window chrome in js/app.js).
(function () {
  'use strict';
  if (!window.RL_ANDROID) return;
  if (window.desktop && window.desktop.battle && window.desktop.meta) return;
  if (typeof Worker === 'undefined') return;

  var WORKER_URL = 'js/sim_worker.js';
  var seq = 0;

  // ---------------- Battle worker ----------------
  var battleWorker = null;
  var battlePending = {};

  function resetBattleWorker(reason) {
    if (battleWorker) {
      try { battleWorker.terminate(); } catch (e) { /* already gone */ }
      battleWorker = null;
    }
    var map = battlePending;
    battlePending = {};
    var err = { ok: false, error: reason || 'Der Kampf-Worker wurde beendet.' };
    Object.keys(map).forEach(function (k) {
      try { map[k](err); } catch (e) { /* ignore */ }
    });
  }

  function ensureBattleWorker() {
    if (battleWorker) return battleWorker;
    var w = new Worker(WORKER_URL);
    w.onmessage = function (ev) {
      var msg = ev && ev.data;
      if (!msg || msg.id == null) return;
      var resolve = battlePending[msg.id];
      if (!resolve) return;
      delete battlePending[msg.id];
      resolve(msg);
    };
    w.onerror = function (ev) {
      var msg = (ev && ev.message) ? String(ev.message) : 'Fehler im Kampf-Worker.';
      resetBattleWorker(msg);
    };
    w.onmessageerror = function () {
      resetBattleWorker('Ungültige Antwort vom Kampf-Worker.');
    };
    battleWorker = w;
    return w;
  }

  function callBattle(payload) {
    return new Promise(function (resolve) {
      var w;
      try { w = ensureBattleWorker(); }
      catch (e) { resolve({ ok: false, error: String(e && e.message || e) }); return; }
      var id = ++seq;
      battlePending[id] = resolve;
      try {
        w.postMessage(Object.assign({ id: id }, payload));
      } catch (e) {
        delete battlePending[id];
        resetBattleWorker(String(e && e.message || e));
        resolve({ ok: false, error: String(e && e.message || e) });
      }
    });
  }

  var battleApi = {
    start: function (opts) {
      opts = opts || {};
      return callBattle({
        type: 'battle:start',
        pasteA: opts.pasteA,
        pasteB: opts.pasteB,
        packedA: opts.packedA,
        packedB: opts.packedB,
        level: opts.level,
        seed: opts.seed,
        nameA: opts.nameA || 'Du',
        nameB: opts.nameB || 'KI'
      });
    },
    choose: function (choice) {
      return callBattle({ type: 'battle:choose', choice: String(choice || '') });
    },
    forfeit: function () {
      return callBattle({ type: 'battle:forfeit' });
    }
  };

  // ---------------- Meta worker pool ----------------
  var progressListeners = [];
  var doneListeners = [];
  var metaJobSeq = 0;
  var activeJob = null;
  var utilWorker = null;
  var utilPending = {};

  function emitProgress(payload) {
    progressListeners.forEach(function (cb) {
      try { cb(payload || {}); } catch (e) { /* listener error */ }
    });
  }
  function emitDone(payload) {
    doneListeners.forEach(function (cb) {
      try { cb(payload || {}); } catch (e) { /* listener error */ }
    });
  }

  function resetUtilWorker(reason) {
    if (utilWorker) {
      try { utilWorker.terminate(); } catch (e) { /* already gone */ }
      utilWorker = null;
    }
    var map = utilPending;
    utilPending = {};
    var err = { ok: false, errors: [reason || 'Simulator-Worker wurde beendet.'] };
    Object.keys(map).forEach(function (k) {
      try { map[k](err); } catch (e) { /* ignore */ }
    });
  }

  function callUtil(payload) {
    return new Promise(function (resolve) {
      if (!utilWorker) {
        try {
          utilWorker = new Worker(WORKER_URL);
          utilWorker.onmessage = function (ev) {
            var msg = ev && ev.data;
            if (!msg || msg.id == null) return;
            var fn = utilPending[msg.id];
            if (!fn) return;
            delete utilPending[msg.id];
            fn(msg);
          };
          utilWorker.onerror = function (ev) {
            resetUtilWorker((ev && ev.message) ? String(ev.message) : 'Fehler im Simulator-Worker.');
          };
          utilWorker.onmessageerror = function () {
            resetUtilWorker('Ungültige Antwort vom Simulator-Worker.');
          };
        } catch (e) {
          resolve({ ok: false, errors: [String(e && e.message || e)] });
          return;
        }
      }
      var id = ++seq;
      utilPending[id] = resolve;
      try {
        utilWorker.postMessage(Object.assign({ id: id }, payload));
      } catch (e) {
        delete utilPending[id];
        resetUtilWorker(String(e && e.message || e));
        resolve({ ok: false, errors: [String(e && e.message || e)] });
      }
    });
  }

  function poolSize(opponentsCount) {
    var cores = (typeof navigator !== 'undefined' && navigator.hardwareConcurrency) || 2;
    // Cap at 2 workers on Android WebView to keep heap usage low while staying responsive.
    var maxW = Math.min(2, Math.max(1, cores - 1));
    return Math.max(1, Math.min(maxW, opponentsCount || 1));
  }

  function stopActiveJob(emit) {
    if (!activeJob) return;
    var job = activeJob;
    job.cancelled = true;
    activeJob = null;
    job.workers.forEach(function (w) {
      try { w.terminate(); } catch (e) { /* already gone */ }
    });
    job.workers = [];
    if (emit) emitDone({ jobId: job.id, cancelled: true, rows: job.rows });
  }

  function maybeFinishJob(job) {
    if (job.cancelled || activeJob !== job) return;
    if (job.rows.length < job.opponents.length) return;
    job.workers.forEach(function (w) {
      try { w.terminate(); } catch (e) { /* already gone */ }
    });
    job.workers = [];
    activeJob = null;
    emitDone({ jobId: job.id, cancelled: false, rows: job.rows, skipped: job.skipped });
  }

  function spawnMetaWorker(job) {
    if (job.cancelled || activeJob !== job) return;
    var worker;
    try { worker = new Worker(WORKER_URL); }
    catch (e) {
      var op = job.opponents[job.next++];
      if (op) {
        var row = { id: op.id, name: op.name, archetype: op.archetype, error: String(e && e.message || e) };
        job.rows.push(row);
        emitProgress({ jobId: job.id, done: Math.min(job.totalGames, job.doneGames), total: job.totalGames, row: row });
      }
      maybeFinishJob(job);
      return;
    }
    job.workers.push(worker);

    function give() {
      if (job.cancelled || activeJob !== job) return;
      if (job.next >= job.opponents.length) {
        try { worker.terminate(); } catch (e) { /* */ }
        maybeFinishJob(job);
        return;
      }
      var op = job.opponents[job.next++];
      worker._op = op;
      worker.postMessage({
        type: 'meta:match',
        jobId: job.id,
        opId: op.id,
        packedA: job.packedA,
        packedB: op.packed,
        levelA: job.level,
        levelB: job.level,
        games: job.games,
        baseSeed: (job.baseSeed + job.next * 17) >>> 0
      });
    }

    worker.onmessage = function (ev) {
      var msg = ev && ev.data;
      if (!msg || job.cancelled || activeJob !== job || msg.jobId !== job.id) return;
      if (msg.type === 'meta:tick') {
        job.doneGames++;
        var now = Date.now();
        if (now - (job.lastTick || 0) >= 40 || job.doneGames >= job.totalGames) {
          job.lastTick = now;
          emitProgress({
            jobId: job.id,
            done: Math.min(job.totalGames, job.doneGames),
            total: job.totalGames,
            name: worker._op && worker._op.name
          });
        }
      } else if (msg.type === 'meta:done') {
        var op = worker._op || {};
        var row = msg.error
          ? { id: op.id, name: op.name, archetype: op.archetype, error: msg.error }
          : Object.assign({ id: op.id, name: op.name, archetype: op.archetype }, msg.result);
        job.rows.push(row);
        emitProgress({
          jobId: job.id,
          done: Math.min(job.totalGames, job.doneGames),
          total: job.totalGames,
          row: row
        });
        give();
      }
    };

    worker.onerror = function (ev) {
      if (job.cancelled || activeJob !== job) return;
      var idx = job.workers.indexOf(worker);
      if (idx >= 0) job.workers.splice(idx, 1);
      try { worker.terminate(); } catch (e) { /* */ }
      var op = worker._op || {};
      var row = { id: op.id, name: op.name, archetype: op.archetype, error: String((ev && ev.message) || 'Worker-Fehler') };
      job.rows.push(row);
      emitProgress({
        jobId: job.id,
        done: Math.min(job.totalGames, job.doneGames),
        total: job.totalGames,
        row: row
      });
      if (job.next < job.opponents.length) spawnMetaWorker(job);
      else maybeFinishJob(job);
    };

    give();
  }

  function allowedPasteUrl(raw) {
    var url;
    try { url = new URL(String(raw || '').trim()); }
    catch (e) { return null; }
    if (url.protocol !== 'https:' || url.hostname !== 'pokepast.es') return null;
    if (!/^\/[A-Za-z0-9]+/.test(url.pathname)) return null;
    if (!url.pathname.endsWith('/raw')) url.pathname = url.pathname.replace(/\/$/, '') + '/raw';
    return url.toString();
  }

  function fetchText(url) {
    var cap = window.Capacitor;
    var http = cap && cap.Plugins && cap.Plugins.CapacitorHttp;
    if (http && typeof http.request === 'function') {
      return http.request({
        method: 'GET',
        url: url,
        headers: { Accept: 'text/plain' },
        responseType: 'text',
        connectTimeout: 8000,
        readTimeout: 8000
      }).then(function (r) {
        if (!r || r.status < 200 || r.status >= 300) {
          return { ok: false, status: r && r.status };
        }
        var text = typeof r.data === 'string' ? r.data : String(r.data || '');
        return { ok: true, text: text };
      });
    }
    var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, 8000) : null;
    return fetch(url, {
      signal: ctrl ? ctrl.signal : undefined,
      headers: { Accept: 'text/plain' }
    }).then(function (r) {
      if (timer) clearTimeout(timer);
      if (!r.ok) return { ok: false, status: r.status };
      return r.text().then(function (text) { return { ok: true, text: text }; });
    }, function (err) {
      if (timer) clearTimeout(timer);
      throw err;
    });
  }

  var metaApi = {
    validate: function (paste) {
      return callUtil({ type: 'meta:validate', paste: String(paste || '') }).then(function (r) {
        return { ok: !!(r && r.ok), errors: (r && r.errors) || [] };
      });
    },
    start: function (payload) {
      payload = payload || {};
      stopActiveJob(true);
      var games = Math.max(1, Math.min(1000, (payload.games | 0) || 200));
      var level = Math.max(0, Math.min(3, payload.level | 0));
      var baseSeed = (payload.seed >>> 0) || 1;
      var runToken = ++metaJobSeq;

      return callUtil({
        type: 'meta:prepare',
        paste: String(payload.paste || ''),
        opponents: Array.isArray(payload.opponents) ? payload.opponents : []
      }).then(function (prep) {
        if (!prep || !prep.ok) {
          return { ok: false, errors: (prep && prep.errors) || ['Ungültige Teams.'], skipped: (prep && prep.skipped) || [] };
        }
        var job = {
          id: runToken,
          cancelled: false,
          workers: [],
          rows: [],
          skipped: prep.skipped || [],
          doneGames: 0,
          totalGames: prep.opponents.length * games,
          next: 0,
          opponents: prep.opponents,
          packedA: prep.packedA,
          games: games,
          level: level,
          baseSeed: baseSeed,
          lastTick: 0
        };
        activeJob = job;
        var size = poolSize(prep.opponents.length);
        for (var i = 0; i < size; i++) spawnMetaWorker(job);
        return { ok: true, jobId: runToken, matches: prep.opponents.length, games: games, workers: size, skipped: job.skipped };
      });
    },
    cancel: function () {
      stopActiveJob(true);
    },
    fetchPaste: function (raw) {
      var url = allowedPasteUrl(raw);
      if (!url) {
        return Promise.resolve({ ok: false, errors: ['Nur https://pokepast.es/… ist erlaubt. Pokémon Showdown wird nicht kontaktiert.'] });
      }
      return fetchText(url).then(function (res) {
        if (!res || !res.ok) {
          return { ok: false, errors: ['PokéPaste antwortet mit ' + (res && res.status || 'Fehler') + '.'] };
        }
        var text = String(res.text || '').replace(/\r\n/g, '\n');
        if (text.length > 20000) return { ok: false, errors: ['Die Paste ist zu groß.'] };
        return metaApi.validate(text).then(function (v) {
          return { ok: !!v.ok, paste: text, errors: v.errors || [] };
        });
      }, function () {
        return { ok: false, errors: ['Paste konnte nicht geladen werden.'] };
      });
    },
    onProgress: function (cb) {
      if (typeof cb === 'function') progressListeners.push(cb);
    },
    onDone: function (cb) {
      if (typeof cb === 'function') doneListeners.push(cb);
    }
  };

  window.addEventListener('pagehide', function () {
    stopActiveJob(false);
    resetBattleWorker('Seite verlassen.');
    resetUtilWorker('Seite verlassen.');
  });

  window.RL_SIM = {
    battle: battleApi,
    meta: metaApi
  };
})();

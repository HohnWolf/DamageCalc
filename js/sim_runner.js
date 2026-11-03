// Runner-Steuerung für den Headless Matchup-Tester.
// Verwaltet die Kommunikation mit dem Web Worker (sim_worker.bundle.js).

(function () {
  'use strict';

  var worker = null;
  var isRunning = false;
  var onProgressCb = null;
  var onCompleteCb = null;
  var onErrorCb = null;

  function start(userTeamPaste, matchesPerArchetype, callbacks) {
    if (isRunning) stop();
    callbacks = callbacks || {};
    onProgressCb = callbacks.onProgress;
    onCompleteCb = callbacks.onComplete;
    onErrorCb = callbacks.onError;

    isRunning = true;
    try {
      worker = new Worker('js/sim_worker.bundle.js');
    } catch (e) {
      isRunning = false;
      if (onErrorCb) onErrorCb(e.message || 'Web Worker konnte nicht initialisiert werden.');
      return;
    }

    worker.onmessage = function (e) {
      var msg = e.data || {};
      if (msg.type === 'PROGRESS') {
        if (onProgressCb) onProgressCb(msg);
      } else if (msg.type === 'COMPLETE') {
        isRunning = false;
        if (onCompleteCb) onCompleteCb(msg);
      } else if (msg.type === 'ERROR') {
        isRunning = false;
        if (onErrorCb) onErrorCb(msg.error);
      } else if (msg.type === 'CANCELLED') {
        isRunning = false;
      }
    };

    worker.onerror = function (err) {
      isRunning = false;
      if (onErrorCb) onErrorCb(err.message || 'Unerwarteter Fehler im Simulations-Worker.');
    };

    worker.postMessage({
      type: 'START',
      userTeamPaste: userTeamPaste,
      matchesPerArchetype: matchesPerArchetype || 25
    });
  }

  function stop() {
    if (worker) {
      try { worker.postMessage({ type: 'CANCEL' }); } catch (e) {}
      setTimeout(function () {
        if (worker) {
          worker.terminate();
          worker = null;
        }
      }, 50);
    }
    isRunning = false;
  }

  window.SimRunner = {
    start: start,
    stop: stop,
    isRunning: function () { return isRunning; }
  };
})();

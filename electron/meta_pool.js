// Desktop pool for the Meta-Test. Worker threads only. Never opens a Showdown socket.
'use strict';
const { Worker } = require('worker_threads');
const os = require('os');
const path = require('path');
const { ipcMain } = require('electron');
const pasteUrl = require('../js/meta/paste_url');
let engine;
function sim() {
  if (!engine) engine = require('../js/meta/engine');
  return engine;
}

const WORKER = path.join(__dirname, 'meta_worker.js');
let seq = 0;
let active = null;

function poolSize() {
  const n = (os.cpus() || []).length || 2;
  return Math.max(1, n - 1);
}

function allowedPasteUrl(raw) { return pasteUrl.allowedPasteUrl(raw); }

function stopActive() {
  if (!active) return;
  active.cancelled = true;
  active.workers.forEach(function (w) { try { w.terminate(); } catch (e) { /* already gone */ } });
  active.workers = [];
  const job = active;
  active = null;
  if (job.sender && !job.sender.isDestroyed()) {
    job.sender.send('meta-done', { jobId: job.id, cancelled: true, rows: job.rows });
  }
}

function startJob(payload, sender) {
  stopActive();
  const mine = sim().validatePaste(payload && payload.paste);
  if (!mine.ok) return { ok: false, errors: mine.errors };
  const games = Math.max(1, Math.min(1000, payload.games | 0 || 200));
  const level = Math.max(0, Math.min(3, payload.level | 0));
  const baseSeed = (payload.seed >>> 0) || 1;
  const opponents = [];
  const skipped = [];
  (payload.opponents || []).forEach(function (op) {
    const v = sim().validatePaste(op && op.paste);
    if (!v.ok) skipped.push({ id: op && op.id, name: op && op.name, errors: v.errors });
    else opponents.push({ id: op.id, name: op.name || op.id, archetype: op.archetype || '', paste: op.paste, packed: v.packed });
  });
  if (!opponents.length) return { ok: false, errors: ['Kein legales Meta-Team ausgewählt.'], skipped: skipped };
  const id = ++seq;
  const job = {
    id: id, sender: sender, cancelled: false, workers: [],
    rows: [], skipped: skipped, doneGames: 0,
    totalGames: opponents.length * games, next: 0, opponents: opponents,
    packedA: mine.packed, games: games, level: level, baseSeed: baseSeed
  };
  active = job;
  const size = Math.min(poolSize(), opponents.length);
  for (let i = 0; i < size; i++) spawn(job);
  return { ok: true, jobId: id, matches: opponents.length, games: games, workers: size, skipped: skipped };
}

function spawn(job) {
  const worker = new Worker(WORKER);
  job.workers.push(worker);
  const give = function () {
    if (job.cancelled || active !== job) return;
    if (job.next >= job.opponents.length) {
      try { worker.terminate(); } catch (e) { /* */ }
      maybeFinish(job);
      return;
    }
    const op = job.opponents[job.next++];
    worker._op = op;
    worker.postMessage({
      type: 'match', id: op.id, packedA: job.packedA, packedB: op.packed,
      levelA: job.level, levelB: job.level, games: job.games,
      baseSeed: (job.baseSeed + job.next * 17) >>> 0
    });
  };
  worker.on('message', function (msg) {
    if (job.cancelled || active !== job) return;
    if (msg.type === 'tick') {
      job.doneGames++;
      send(job, 'meta-progress', {
        jobId: job.id, done: Math.min(job.totalGames, job.doneGames), total: job.totalGames,
        name: worker._op && worker._op.name
      });
    } else if (msg.type === 'done') {
      const op = worker._op || {};
      if (msg.error) job.rows.push({ id: op.id, name: op.name, archetype: op.archetype, error: msg.error });
      else job.rows.push(Object.assign({ id: op.id, name: op.name, archetype: op.archetype }, msg.result));
      send(job, 'meta-progress', { jobId: job.id, done: Math.min(job.totalGames, job.doneGames), total: job.totalGames, row: job.rows[job.rows.length - 1] });
      give();
    }
  });
  worker.on('error', function (err) {
    if (job.cancelled) return;
    const op = worker._op || {};
    job.rows.push({ id: op.id, name: op.name, error: String(err && err.message || err) });
    give();
  });
  give();
}

function maybeFinish(job) {
  if (job.cancelled || active !== job) return;
  if (job.rows.length < job.opponents.length) return;
  job.workers.forEach(function (w) { try { w.terminate(); } catch (e) { /* */ } });
  active = null;
  send(job, 'meta-done', { jobId: job.id, cancelled: false, rows: job.rows, skipped: job.skipped });
}

function send(job, channel, payload) {
  try { if (job.sender && !job.sender.isDestroyed()) job.sender.send(channel, payload); }
  catch (e) { /* window gone */ }
}

function init() {
  ipcMain.handle('meta-validate', function (e, paste) {
    const r = sim().validatePaste(paste);
    return { ok: !!r.ok, errors: r.errors || [] };
  });
  ipcMain.handle('meta-start', function (e, payload) {
    return startJob(payload || {}, e.sender);
  });
  ipcMain.on('meta-cancel', function () { stopActive(); });
  ipcMain.handle('meta-fetch-paste', async function (e, raw) {
    const url = allowedPasteUrl(raw);
    if (!url) return { ok: false, errors: ['Nur https://pokepast.es/… ist erlaubt. Pokémon Showdown wird nicht kontaktiert.'] };
    const ctrl = new AbortController();
    const timer = setTimeout(function () { ctrl.abort(); }, 8000);
    try {
      const res = await fetch(url, { signal: ctrl.signal, headers: { 'accept': 'text/plain' } });
      if (!res.ok) return { ok: false, errors: ['PokéPaste antwortet mit ' + res.status + '.'] };
      const text = await res.text();
      if (text.length > 20000) return { ok: false, errors: ['Die Paste ist zu groß.'] };
      const v = sim().validatePaste(text);
      return { ok: !!v.ok, paste: text, errors: v.errors || [] };
    } catch (err) {
      return { ok: false, errors: ['Paste konnte nicht geladen werden.'] };
    } finally { clearTimeout(timer); }
  });
}

module.exports = { init: init, poolSize: poolSize, allowedPasteUrl: allowedPasteUrl };

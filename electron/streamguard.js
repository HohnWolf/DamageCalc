// Schreibfehler auf eine schon geschlossene Kindprozess-Pipe (Node: "write EOF").
// Ohne 'error'-Hörer wird daraus eine unbehandelte Ausnahme, und Electron zeigt den Absturzdialog.
'use strict';

const PIPE_CODES = new Set([
  'EOF', 'EPIPE', 'ECONNRESET',
  'ERR_STREAM_DESTROYED', 'ERR_STREAM_WRITE_AFTER_END', 'ERR_STREAM_PREMATURE_CLOSE',
]);

function isStreamPipeError(err) {
  if (!err) return false;
  const code = err.code || '';
  const syscall = err.syscall || '';
  const msg = String(err.message || err);
  if (PIPE_CODES.has(code) && (!syscall || syscall === 'write' || syscall === 'read' || syscall === 'shutdown')) return true;
  if (/^(write|read|shutdown) EOF$/i.test(msg)) return true;
  return false;
}

function guardStream(stream) {
  if (!stream || typeof stream.on !== 'function' || stream.__ccStreamGuard) return stream;
  stream.__ccStreamGuard = true;
  stream.on('error', function () { /* Pipe zu, kein Absturz */ });
  return stream;
}

function guardChild(child) {
  if (!child || child.__ccChildGuard) return child;
  child.__ccChildGuard = true;
  child.on('error', function () { /* Start fehlgeschlagen oder Pipe zu */ });
  guardStream(child.stdin);
  guardStream(child.stdout);
  guardStream(child.stderr);
  return child;
}

// true, wenn die Zeile angenommen wurde. false, wenn die Pipe schon zu ist.
function safeWrite(stream, data) {
  return new Promise(function (resolve) {
    if (!stream || stream.destroyed || stream.writableEnded || !stream.writable) {
      resolve(false);
      return;
    }
    let done = false;
    const finish = function (ok) {
      if (done) return;
      done = true;
      clearTimeout(timer);
      stream.removeListener('error', onErr);
      resolve(ok);
    };
    const onErr = function () { finish(false); };
    const timer = setTimeout(function () { finish(false); }, 15000);
    stream.once('error', onErr);
    try {
      stream.write(data, function (err) { finish(!err); });
    } catch (e) {
      finish(false);
    }
  });
}

module.exports = { isStreamPipeError, guardStream, guardChild, safeWrite };

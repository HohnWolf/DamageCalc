// Ein geschriebener OCR-Helfer, dessen Pipe schon zu ist, darf keine unbehandelte "write EOF" werden.
import { createRequire } from 'module';
import { spawn } from 'child_process';
import assert from 'assert';
import { once } from 'events';

const require = createRequire(import.meta.url);
const { safeWrite, isStreamPipeError, guardChild } = require('../electron/streamguard.js');

assert.strictEqual(isStreamPipeError(Object.assign(new Error('write EOF'), { code: 'EOF', syscall: 'write' })), true);
assert.strictEqual(isStreamPipeError(Object.assign(new Error('nope'), { code: 'EPIPE', syscall: 'write' })), true);
assert.strictEqual(isStreamPipeError(new Error('Cannot read properties of undefined')), false);

let uncaught = null;
process.on('uncaughtException', function (err) {
  if (isStreamPipeError(err)) { uncaught = err; return; }
  console.error(err);
  process.exit(1);
});

const dead = guardChild(spawn(process.execPath, ['-e', 'process.exit(0)'], { stdio: ['pipe', 'pipe', 'pipe'] }));
await once(dead, 'exit');
const wrote = await safeWrite(dead.stdin, 'hello\n');
assert.strictEqual(wrote, false);
await new Promise(function (r) { setTimeout(r, 50); });
assert.strictEqual(uncaught, null);
console.log('ocr-pipe test ok');

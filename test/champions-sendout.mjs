// Reads test/fixtures/champions_sendout.png (the user's real send-out frame),
// runs the outlined-text prep, and checks Tesseract recovers the battle sentence.
// Windows OCR is not available on this machine; Tesseract is the stand-in for the glyph image.
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { spawnSync } from 'child_process';
import { createContext, runInContext } from 'vm';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const fixture = join(root, 'test/fixtures/champions_sendout.png');
const sandbox = { window: {}, Uint8Array, Uint8ClampedArray, Int32Array, Math };
runInContext(readFileSync(join(root, 'js/textprep.js'), 'utf8'), createContext(sandbox));
const prep = sandbox.window.CCTextPrep.prepOutlinedText;

function decode(path) {
  const probe = spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', path], { encoding: 'utf8' });
  if (probe.status !== 0) throw new Error(probe.stderr || 'ffprobe failed');
  const [w, h] = probe.stdout.trim().split(',').map(Number);
  const raw = spawnSync('ffmpeg', ['-v', 'error', '-i', path, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], { maxBuffer: 80 * 1024 * 1024 });
  if (raw.status !== 0) throw new Error(raw.stderr.toString() || 'ffmpeg failed');
  return { w, h, rgb: raw.stdout };
}

function toPpm(data, w, h) {
  const body = Buffer.alloc(w * h * 3);
  for (let p = 0, o = 0; p < w * h; p++, o += 3) {
    const i = p * 4;
    body[o] = data[i]; body[o + 1] = data[i + 1]; body[o + 2] = data[i + 2];
  }
  return Buffer.concat([Buffer.from('P6\n' + w + ' ' + h + '\n255\n'), body]);
}

const full = decode(fixture);
// The sentence sits in the lower-left third. Crop that the same way the live region will.
const rx = 0.02, ry = 0.66, rw = 0.58, rh = 0.20;
const x = Math.round(rx * full.w), y = Math.round(ry * full.h);
const w = Math.round(rw * full.w), h = Math.round(rh * full.h);
const crop = Buffer.alloc(w * h * 3);
for (let row = 0; row < h; row++) {
  full.rgb.copy(crop, row * w * 3, ((y + row) * full.w + x) * 3, ((y + row) * full.w + x + w) * 3);
}
const out = prep(crop, w, h, 3);
if (!out.ink) { console.error('no outlined text found'); process.exit(1); }
mkdirSync('/tmp/champ-ui', { recursive: true });
writeFileSync('/tmp/champ-ui/prep.ppm', toPpm(out.data, out.w, out.h));
spawnSync('ffmpeg', ['-v', 'error', '-y', '-i', '/tmp/champ-ui/prep.ppm', '/tmp/champ-ui/prep.png']);
const ocr = spawnSync('tesseract', ['/tmp/champ-ui/prep.png', 'stdout', '--psm', '6'], { encoding: 'utf8' });
const text = (ocr.stdout || '').replace(/\s+/g, ' ').trim();
console.log('prep', out.w + 'x' + out.h, 'ink', out.ink);
console.log('OCR:', JSON.stringify(text));
const ok = /sent out Rillaboom and Sneasler/i.test(text) && /jake/i.test(text);
if (!ok) { console.error('fixture sentence not recovered'); process.exit(1); }
console.log('ok');

// 3DS-Dateiformate: NCSD (.3ds) / NCCH (.cxi), RomFS mit IVFC-Hashbaum, GARC-Archive, Mini-Pakete.
// Aufbau nach 3dbrew und dem Universal Pokémon Randomizer ZX (ctr/NCCH.java, GARCArchive.java, Mini.java).
// Große Dateien werden nie komplett geladen: gelesen wird über source.read(offset, length); geschrieben wird als Blob aus Original-Abschnitten und Änderungen.
(function () {
  'use strict';
  function u16(b, o) { return b[o] | (b[o + 1] << 8); }
  function u32(b, o) { return (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0; }
  function u64(b, o) { return u32(b, o) + u32(b, o + 4) * 4294967296; }
  function w32(b, o, v) { b[o] = v & 255; b[o + 1] = (v >> 8) & 255; b[o + 2] = (v >> 16) & 255; b[o + 3] = (v >>> 24) & 255; }
  function ascii(b, o, n) { var s = ''; for (var i = 0; i < n && b[o + i]; i++) s += String.fromCharCode(b[o + i]); return s; }
  function align(v, a) { return Math.ceil(v / a) * a; }

  async function sha256(bytes) {
    if (typeof require === 'function' && typeof window !== 'undefined' && !window.crypto) return new Uint8Array(require('crypto').createHash('sha256').update(bytes).digest());
    if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) return new Uint8Array(await window.crypto.subtle.digest('SHA-256', bytes));
    return new Uint8Array(require('crypto').createHash('sha256').update(bytes).digest());
  }

  // ---------------- LZ11 (Entpacken; manche Archive sind komprimiert) ----------------
  function lz11(src) {
    var size = (src[1] | (src[2] << 8) | (src[3] << 16)) >>> 0, p = 4;
    if (!size) { size = u32(src, 4); p = 8; }
    var out = new Uint8Array(size), o = 0;
    while (o < size && p < src.length) {
      var flags = src[p++];
      for (var bit = 7; bit >= 0 && o < size; bit--) {
        if (!(flags & (1 << bit))) { out[o++] = src[p++]; continue; }
        var a = src[p++], ind = a >> 4, len, disp;
        if (ind === 0) { var x = src[p++], y = src[p++]; len = ((a << 4) | (x >> 4)) + 0x11; disp = (((x & 0xF) << 8) | y) + 1; }
        else if (ind === 1) { var x1 = src[p++], x2 = src[p++], x3 = src[p++]; len = (((a & 0xF) << 12) | (x1 << 4) | (x2 >> 4)) + 0x111; disp = (((x2 & 0xF) << 8) | x3) + 1; }
        else { var z = src[p++]; len = ind + 1; disp = (((a & 0xF) << 8) | z) + 1; }
        for (var k = 0; k < len && o < size; k++) { out[o] = out[o - disp]; o++; }
      }
    }
    return out;
  }

  // ---------------- GARC ----------------
  // Liefert { files: [[{start, end}], ...], data: Uint8Array } – start/end sind Offsets in data (GARC-Datei). Unkomprimierte Einträge lassen sich direkt beschreiben.
  function parseGarc(g) {
    if (ascii(g, 0, 4) !== 'CRAG') return null;
    var dataOffset = u32(g, 0x10), ver = u16(g, 0x0A), p = u32(g, 4);
    if (ver !== 0x400 && ver !== 0x600) return null;
    if (ascii(g, p, 4) !== 'OTAF') return null;
    var fatoSize = u32(g, p + 4), p2 = p + fatoSize;
    if (ascii(g, p2, 4) !== 'BTAF') return null;
    var count = u32(g, p2 + 8), q = p2 + 12, files = [];
    for (var i = 0; i < count; i++) {
      var bits = u32(g, q); q += 4;
      var subs = [];
      for (var b = 0; b < 32; b++) {
        if (!(bits & (1 << b))) continue;
        var s = u32(g, q), e = u32(g, q + 4), len = u32(g, q + 8); q += 12;
        subs.push({ start: dataOffset + s, end: dataOffset + s + len });
      }
      files.push(subs);
    }
    return { files: files, data: g };
  }
  function garcFile(garc, i, j) {
    var f = garc.files[i] && garc.files[i][j || 0];
    return f ? garc.data.subarray(f.start, f.end) : null;
  }


  // GARC nur teilweise lesen (große Archive): Kopf über source.read holen, Einträge bei Bedarf laden.
  async function openGarc(source, off) {
    var h = await source.read(off, 0x24);
    if (ascii(h, 0, 4) !== 'CRAG') return null;
    var dataOffset = u32(h, 0x10), head = await source.read(off, dataOffset), g = parseGarc(head);
    if (!g) return null;
    g.source = source; g.base = off; g.dataOffset = dataOffset;
    g.entryLoc = function (i, j) { var f = g.files[i] && g.files[i][j || 0]; return f ? { off: off + f.start, size: f.end - f.start } : null; };
    return g;
  }
  // LZ11-Kompressor (optimale Aufteilung); Ergebnis wird nur genommen, wenn es in den Platz des Originals passt
  function lz11Compress(src) {
    var n = src.length, W = 0x1000, MAXL = 0x10110, head = new Int32Array(65536).fill(-1), prev = new Int32Array(n).fill(-1);
    function hash(i) { return (src[i] | (src[i + 1] << 8)) ^ (src[i + 2] << 5); }
    var maxLen = new Int32Array(n), maxOff = new Int32Array(n), i, j;
    for (i = 0; i < n; i++) {
      var best = 0, bo = 0;
      if (i + 2 < n) {
        var hh = hash(i) & 0xFFFF, c = head[hh], tries = 0;
        while (c >= 0 && i - c <= W && tries++ < 64) {
          var l = 0, lim = Math.min(MAXL, n - i);
          while (l < lim && src[c + l] === src[i + l]) l++;
          if (l > best) { best = l; bo = i - c; if (l === lim) break; }
          c = prev[c];
        }
        prev[i] = head[hh]; head[hh] = i;
      }
      maxLen[i] = best >= 3 ? best : 0; maxOff[i] = bo;
    }
    // Kosten in Bit: Literal 9, Treffer 17 (3–16), 25 (17–272), 33 (273+)
    var INF = 1e15, cost = new Float64Array(n + 1).fill(INF), from = new Int32Array(n + 1), len = new Int32Array(n + 1);
    cost[0] = 0;
    function mcost(l) { return l <= 16 ? 17 : l <= 272 ? 25 : 33; }
    for (i = 0; i < n; i++) {
      if (cost[i] + 9 < cost[i + 1]) { cost[i + 1] = cost[i] + 9; from[i + 1] = i; len[i + 1] = 0; }
      var ml = maxLen[i];
      if (ml >= 3) {
        var cands = [];
        for (j = 3; j <= Math.min(ml, 40); j++) cands.push(j);
        [16, 17, 272, 273, ml].forEach(function (x) { if (x >= 3 && x <= ml && cands.indexOf(x) < 0) cands.push(x); });
        for (var k = 0; k < cands.length; k++) {
          var l2 = cands[k], t = cost[i] + mcost(l2);
          if (t < cost[i + l2]) { cost[i + l2] = t; from[i + l2] = i; len[i + l2] = l2; }
        }
      }
    }
    var ops = [], p = n;
    while (p > 0) { ops.push({ at: from[p], len: len[p] }); p = from[p]; }
    ops.reverse();
    var out = [0x11, n & 255, (n >> 8) & 255, (n >> 16) & 255], flagPos = -1, bit = 0;
    ops.forEach(function (op) {
      if (bit === 0) { flagPos = out.length; out.push(0); bit = 8; }
      bit--;
      if (!op.len) { out.push(src[op.at]); return; }
      out[flagPos] |= 1 << bit;
      var d = maxOffAt(op.at) - 1, l3 = op.len;
      if (l3 <= 16) { out.push(((l3 - 1) << 4) | (d >> 8), d & 255); }
      else if (l3 <= 272) { var v = l3 - 0x11; out.push(v >> 4, ((v & 15) << 4) | (d >> 8), d & 255); }
      else { var v2 = l3 - 0x111; out.push(0x10 | (v2 >> 12), (v2 >> 4) & 255, ((v2 & 15) << 4) | (d >> 8), d & 255); }
    });
    function maxOffAt(at) { return maxOff[at]; }
    return new Uint8Array(out);
  }

  // ---------------- Mini-Pakete ----------------
  function unpackMini(b, ident) {
    if (!b || b.length < 8 || String.fromCharCode(b[0], b[1]) !== ident) return null;
    var count = u16(b, 2), out = [], start = u32(b, 4);
    for (var i = 0; i < count; i++) { var end = u32(b, 8 + i * 4); out.push(b.subarray(start, end)); start = end; }
    return out;
  }

  // ---------------- NCCH / RomFS ----------------
  // source: { size, read(offset, length) -> Promise<Uint8Array> }
  async function openNcch(source) {
    var head = await source.read(0, 0x200), base = 0, type = 'cxi';
    if (ascii(head, 0x100, 4) === 'NCSD') { base = u32(head, 0x120) * 0x200; head = await source.read(base, 0x200); type = '3ds'; }
    if (ascii(head, 0x100, 4) !== 'NCCH') throw new Error('ctr:notncch');
    var flags = head.subarray(0x188, 0x190);
    if (!(flags[7] & 4)) throw new Error('ctr:encrypted');
    var info = {
      source: source, base: base, type: type, header: head, size: u32(head, 0x104) * 0x200,
      product: ascii(head, 0x150, 16), titleId: u64(head, 0x108),
      exefsOff: u32(head, 0x1A0) * 0x200, exefsSize: u32(head, 0x1A4) * 0x200,
      romfsOff: u32(head, 0x1B0) * 0x200, romfsSize: u32(head, 0x1B4) * 0x200, romfsHashSize: u32(head, 0x1B8) * 0x200
    };
    if (!info.romfsOff) throw new Error('ctr:noromfs');
    var rf = base + info.romfsOff, h = await source.read(rf, 0x60);
    if (ascii(h, 0, 4) !== 'IVFC') throw new Error('ctr:noivfc');
    var master = u32(h, 8);
    var lv = [];
    for (var i = 0; i < 3; i++) lv.push({ logical: u64(h, 0x0C + i * 0x18), size: u64(h, 0x14 + i * 0x18), block: 1 << u32(h, 0x1C + i * 0x18) });
    // Lage der Ebenen: erst Ebene 3 (Daten), danach Ebene 1 und Ebene 2 (je auf Blockgrenze); der Hashbaum wird weiter unten geprüft.
    var l3off = rf + align(0x60 + master, lv[2].block);
    info.ivfc = { master: master, levels: lv, l3: l3off, l1: l3off + align(lv[2].size, lv[0].block), rf: rf };
    info.ivfc.l2 = info.ivfc.l1 + align(lv[0].size, lv[1].block);
    // Ebene 3: RomFS-Kopf
    var rh = await source.read(l3off, 0x28);
    info.rh = { dirHash: u32(rh, 4), dirHashSize: u32(rh, 8), dirMeta: u32(rh, 0x0C), dirMetaSize: u32(rh, 0x10), fileHash: u32(rh, 0x14), fileHashSize: u32(rh, 0x18), fileMeta: u32(rh, 0x1C), fileMetaSize: u32(rh, 0x20), data: u32(rh, 0x24) };
    var dm = await source.read(l3off + info.rh.dirMeta, info.rh.dirMetaSize), fm = await source.read(l3off + info.rh.fileMeta, info.rh.fileMetaSize);
    info.dirs = dm; info.fileMeta = fm;
    return info;
  }
  function nameAt(b, o, len) { var s = ''; for (var i = 0; i < len; i += 2) s += String.fromCharCode(u16(b, o + i)); return s; }
  // Datei im RomFS suchen, z. B. "a/0/1/7"; Rückgabe { off (absolut), size } oder null
  function findFile(info, path) {
    var parts = path.split('/'), dir = 0, dm = info.dirs, fm = info.fileMeta;
    for (var i = 0; i < parts.length; i++) {
      var last = i === parts.length - 1, found = -1;
      if (!last) {
        for (var c = u32(dm, dir + 8); c !== 0xFFFFFFFF; c = u32(dm, c + 4)) if (nameAt(dm, c + 0x18, u32(dm, c + 0x14)) === parts[i]) { found = c; break; }
        if (found < 0) return null;
        dir = found;
      } else {
        for (var f = u32(dm, dir + 12); f !== 0xFFFFFFFF; f = u32(fm, f + 4)) {
          if (nameAt(fm, f + 0x20, u32(fm, f + 0x1C)) === parts[i]) return { off: info.ivfc.l3 + info.rh.data + u64(fm, f + 8), size: u64(fm, f + 0x10) };
        }
        return null;
      }
    }
    return null;
  }
  async function readFile(info, path) {
    var f = findFile(info, path); if (!f) return null;
    return { loc: f, data: await info.source.read(f.off, f.size) };
  }

  // ---------------- Schreiben ----------------
  // patches: [{ off (absolut in der Quelldatei), bytes }]. Aktualisiert den IVFC-Hashbaum und den Kopf-Hash und gibt einen Blob zurück.
  async function build(info, patches, source, BlobCtor) {
    var map = {}; // Blocknummer (Ebene 3) -> betroffen
    var iv = info.ivfc, B = 0x1000, extra = [];
    function applyTo(buf, start) { // Änderungen in einen gelesenen Abschnitt einarbeiten
      patches.concat(extra).forEach(function (p) {
        var s = Math.max(p.off, start), e = Math.min(p.off + p.bytes.length, start + buf.length);
        if (e > s) buf.set(p.bytes.subarray(s - p.off, e - p.off), s - start);
      });
      return buf;
    }
    async function patchedRead(off, len) { return applyTo(await source.read(off, len), off); }
    var blocks3 = {};
    patches.forEach(function (p) {
      if (p.off >= iv.l3 && p.off < iv.l3 + iv.levels[2].size) {
        var a = Math.floor((p.off - iv.l3) / B), z = Math.floor((p.off + p.bytes.length - 1 - iv.l3) / B);
        for (var b = a; b <= z; b++) blocks3[b] = 1;
      }
    });
    var l2set = {}, l1set = {}, masterSet = {};
    // Ebene 3 → Ebene 2
    var keys3 = Object.keys(blocks3).map(Number).sort(function (a, b) { return a - b; });
    for (var i = 0; i < keys3.length; i++) {
      var b3 = keys3[i], bs = iv.l3 + b3 * B, len = Math.min(B, iv.l3 + iv.levels[2].size - bs), blk = new Uint8Array(B);
      blk.set(await patchedRead(bs, len));
      extra.push({ off: iv.l2 + b3 * 32, bytes: await sha256(blk) });
      l2set[Math.floor(b3 * 32 / B)] = 1;
    }
    // Ebene 2 → Ebene 1
    var keys2 = Object.keys(l2set).map(Number).sort(function (a, b) { return a - b; });
    for (i = 0; i < keys2.length; i++) {
      var b2 = keys2[i], bs2 = iv.l2 + b2 * B, len2 = Math.min(B, iv.l2 + iv.levels[1].size - bs2), blk2 = new Uint8Array(B);
      blk2.set(await patchedRead(bs2, len2));
      extra.push({ off: iv.l1 + b2 * 32, bytes: await sha256(blk2) });
      l1set[Math.floor(b2 * 32 / B)] = 1;
    }
    // Ebene 1 → Hauptprüfsumme
    var keys1 = Object.keys(l1set).map(Number).sort(function (a, b) { return a - b; });
    for (i = 0; i < keys1.length; i++) {
      var b1 = keys1[i], bs1 = iv.l1 + b1 * B, len1 = Math.min(B, iv.l1 + iv.levels[0].size - bs1), blk1 = new Uint8Array(B);
      blk1.set(await patchedRead(bs1, len1));
      extra.push({ off: iv.rf + 0x60 + b1 * 32, bytes: await sha256(blk1) });
    }
    // Kopf-Hash (Superblock) im NCCH-Kopf
    var hsz = info.romfsHashSize || 0x200, head = await patchedRead(iv.rf, hsz);
    extra.push({ off: info.base + 0x1C0, bytes: await sha256(head) });
    var all = patches.concat(extra).sort(function (a, b) { return a.off - b.off; }), parts = [], pos = 0;
    all.forEach(function (p) {
      if (p.off > pos) parts.push(source.slice(pos, p.off));
      else if (p.off < pos) throw new Error('ctr:overlap');
      parts.push(p.bytes); pos = p.off + p.bytes.length;
    });
    if (pos < source.size) parts.push(source.slice(pos, source.size));
    return new (BlobCtor || Blob)(parts, { type: 'application/octet-stream' });
  }

  window.CTR = { openGarc: openGarc, lz11Compress: lz11Compress, openNcch: openNcch, findFile: findFile, readFile: readFile, parseGarc: parseGarc, garcFile: garcFile, unpackMini: unpackMini, lz11: lz11, build: build, sha256: sha256, u16: u16, u32: u32 };
  if (typeof module !== 'undefined') module.exports = window.CTR;
})();

// Save File Editor – Nintendo Switch (Generation 8 & 9: SwSh, BDSP, PLA, SV) nach PKHeX.Core (GPLv3).
// Implementiert SwishCrypto (SHA-256 + 127-Byte StaticXorpad + SCBlock), BDSP (MD5) sowie PK8 / PB8 / PA8 / PK9 (inkl. Gen-9-Species-Mapping).
(function () {
  'use strict';
  var P = window.PKPERSONAL;

  function u16(b, o) { return b[o] | (b[o + 1] << 8); }
  function w16(b, o, v) { b[o] = v & 255; b[o + 1] = (v >> 8) & 255; }
  function u32(b, o) { return (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0; }
  function w32(b, o, v) { b[o] = v & 255; b[o + 1] = (v >>> 8) & 255; b[o + 2] = (v >>> 16) & 255; b[o + 3] = (v >>> 24) & 255; }

  // ---------------- Synchrones SHA-256 (für SwishCrypto) ----------------
  var K256 = new Uint32Array([
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ]);
  function sha256Chunks(chunks) {
    var total = 0, i;
    for (i = 0; i < chunks.length; i++) total += chunks[i].length;
    var h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a;
    var h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19;
    var W = new Uint32Array(64), blk = new Uint8Array(64), blen = 0;
    function proc(buf, off) {
      var j;
      for (j = 0; j < 16; j++) W[j] = ((buf[off + j * 4] << 24) | (buf[off + j * 4 + 1] << 16) | (buf[off + j * 4 + 2] << 8) | buf[off + j * 4 + 3]) >>> 0;
      for (j = 16; j < 64; j++) {
        var s0 = ((W[j - 15] >>> 7) | (W[j - 15] << 25)) ^ ((W[j - 15] >>> 18) | (W[j - 15] << 14)) ^ (W[j - 15] >>> 3);
        var s1 = ((W[j - 2] >>> 17) | (W[j - 2] << 15)) ^ ((W[j - 2] >>> 19) | (W[j - 2] << 13)) ^ (W[j - 2] >>> 10);
        W[j] = (W[j - 16] + s0 + W[j - 7] + s1) >>> 0;
      }
      var a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;
      for (j = 0; j < 64; j++) {
        var S1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
        var ch = (e & f) ^ (~e & g);
        var t1 = (h + S1 + ch + K256[j] + W[j]) >>> 0;
        var S0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
        var maj = (a & b) ^ (a & c) ^ (b & c);
        var t2 = (S0 + maj) >>> 0;
        h = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0;
      }
      h0 = (h0 + a) >>> 0; h1 = (h1 + b) >>> 0; h2 = (h2 + c) >>> 0; h3 = (h3 + d) >>> 0;
      h4 = (h4 + e) >>> 0; h5 = (h5 + f) >>> 0; h6 = (h6 + g) >>> 0; h7 = (h7 + h) >>> 0;
    }
    function feed(arr) {
      var pos = 0, len = arr.length;
      if (blen > 0) {
        var take = Math.min(64 - blen, len);
        blk.set(arr.subarray(0, take), blen); blen += take; pos += take;
        if (blen === 64) { proc(blk, 0); blen = 0; }
      }
      while (pos + 64 <= len) { proc(arr, pos); pos += 64; }
      if (pos < len) { blk.set(arr.subarray(pos), 0); blen = len - pos; }
    }
    for (i = 0; i < chunks.length; i++) feed(chunks[i]);
    var padLen = ((56 - (total + 1) % 64) + 64) % 64;
    var tail = new Uint8Array(1 + padLen + 8);
    tail[0] = 0x80;
    var bitHi = Math.floor(total / 0x20000000), bitLo = (total * 8) >>> 0;
    tail[tail.length - 8] = (bitHi >>> 24) & 255; tail[tail.length - 7] = (bitHi >>> 16) & 255;
    tail[tail.length - 6] = (bitHi >>> 8) & 255; tail[tail.length - 5] = bitHi & 255;
    tail[tail.length - 4] = (bitLo >>> 24) & 255; tail[tail.length - 3] = (bitLo >>> 16) & 255;
    tail[tail.length - 2] = (bitLo >>> 8) & 255; tail[tail.length - 1] = bitLo & 255;
    feed(tail);
    var out = new Uint8Array(32), hs = [h0, h1, h2, h3, h4, h5, h6, h7];
    for (i = 0; i < 8; i++) { out[i * 4] = hs[i] >>> 24; out[i * 4 + 1] = (hs[i] >>> 16) & 255; out[i * 4 + 2] = (hs[i] >>> 8) & 255; out[i * 4 + 3] = hs[i] & 255; }
    return out;
  }

  // ---------------- Synchrones MD5 (für BDSP SAV8BS) ----------------
  var MD5_S = [7,12,17,22,7,12,17,22,7,12,17,22,7,12,17,22,5,9,14,20,5,9,14,20,5,9,14,20,5,9,14,20,4,11,16,23,4,11,16,23,4,11,16,23,4,11,16,23,6,10,15,21,6,10,15,21,6,10,15,21,6,10,15,21];
  var MD5_K = new Uint32Array(64);
  for (var mi = 0; mi < 64; mi++) MD5_K[mi] = Math.floor(Math.abs(Math.sin(mi + 1)) * 0x100000000) >>> 0;
  function md5(arr) {
    var len = arr.length, pad = ((56 - (len + 1) % 64) + 64) % 64;
    var buf = new Uint8Array(len + 1 + pad + 8);
    buf.set(arr); buf[len] = 0x80;
    w32(buf, buf.length - 8, (len * 8) >>> 0);
    w32(buf, buf.length - 4, Math.floor(len / 0x20000000) >>> 0);
    var a0 = 0x67452301, b0 = 0xefcdab89, c0 = 0x98badcfe, d0 = 0x10325476;
    var M = new Uint32Array(16);
    for (var o = 0; o < buf.length; o += 64) {
      for (var j = 0; j < 16; j++) M[j] = u32(buf, o + j * 4);
      var A = a0, B = b0, C = c0, D = d0;
      for (var i = 0; i < 64; i++) {
        var F, g;
        if (i < 16) { F = (B & C) | (~B & D); g = i; }
        else if (i < 32) { F = (D & B) | (~D & C); g = (5 * i + 1) & 15; }
        else if (i < 48) { F = B ^ C ^ D; g = (3 * i + 5) & 15; }
        else { F = C ^ (B | ~D); g = (7 * i) & 15; }
        F = (F + A + MD5_K[i] + M[g]) >>> 0;
        A = D; D = C; C = B;
        var s = MD5_S[i];
        B = (B + (((F << s) | (F >>> (32 - s))) >>> 0)) >>> 0;
      }
      a0 = (a0 + A) >>> 0; b0 = (b0 + B) >>> 0; c0 = (c0 + C) >>> 0; d0 = (d0 + D) >>> 0;
    }
    var out = new Uint8Array(16);
    w32(out, 0, a0); w32(out, 4, b0); w32(out, 8, c0); w32(out, 12, d0);
    return out;
  }

  // ---------------- Gen-9 Species Mapping (PKHeX SpeciesConverter.cs) ----------------
  var T9_N2I = [
    1,1,1,1,33,33,33,21,21,44,44,7,7,7,29,31,31,31,68,68,68,2,2,17,17,30,30,24,24,28,28,58,58,
    12,-13,-13,-31,-31,-29,-29,43,43,43,-31,-31,-3,-30,-30,-23,-23,-14,-24,-3,-3,-47,-47,-12,-27,-27,-44,-46,-26,31,
    29,-53,-65,25,-6,-3,-7,-4,-4,-8,-4,1,-3,-3,-6,-4,-47,-47,-47,-23,-23,-5,-7,-9,-7,-20,-13,-9,-9,-29,
    -23,1,12,12,0,0,0,-6,5,-6,-3,-3,-2,-4,-3,-3
  ];
  var T9_I2N = [
    65,-1,-1,-1,-1,31,31,47,47,29,29,53,31,31,46,44,30,30,-7,-7,-7,13,13,-2,-2,23,23,24,-21,-21,27,27,47,
    47,47,26,14,-33,-33,-33,-17,-17,3,-29,12,-12,-31,-31,-31,3,3,-24,-24,-44,-44,-30,-30,-28,-28,23,23,6,7,
    29,8,3,4,4,20,4,23,6,3,3,4,-1,13,9,7,5,7,9,9,-43,-43,-43,-68,-68,-68,-58,-58,-25,-29,
    -31,6,-1,6,0,0,0,3,3,4,2,3,3,-5,-12,-12
  ];
  function natToInt9(s) { var i = s - 917; return (i >= 0 && i < T9_N2I.length) ? s + T9_N2I[i] : s; }
  function intToNat9(r) { var i = r - 917; return (i >= 0 && i < T9_I2N.length) ? r + T9_I2N[i] : r; }

  // ---------------- SwishCrypto (PKHeX.Core) ----------------
  var INTRO = new Uint8Array([
    0x9E, 0xC9, 0x9C, 0xD7, 0x0E, 0xD3, 0x3C, 0x44, 0xFB, 0x93, 0x03, 0xDC, 0xEB, 0x39, 0xB4, 0x2A,
    0x19, 0x47, 0xE9, 0x63, 0x4B, 0xA2, 0x33, 0x44, 0x16, 0xBF, 0x82, 0xA2, 0xBA, 0x63, 0x55, 0xB6,
    0x3D, 0x9D, 0xF2, 0x4B, 0x5F, 0x7B, 0x6A, 0xB2, 0x62, 0x1D, 0xC2, 0x1B, 0x68, 0xE5, 0xC8, 0xB5,
    0x3A, 0x05, 0x90, 0x00, 0xE8, 0xA8, 0x10, 0x3D, 0xE2, 0xEC, 0xF0, 0x0C, 0xB2, 0xED, 0x4F, 0x6D
  ]);
  var OUTRO = new Uint8Array([
    0xD6, 0xC0, 0x1C, 0x59, 0x8B, 0xC8, 0xB8, 0xCB, 0x46, 0xE1, 0x53, 0xFC, 0x82, 0x8C, 0x75, 0x75,
    0x13, 0xE0, 0x45, 0xDF, 0x32, 0x69, 0x3C, 0x75, 0xF0, 0x59, 0xF8, 0xD9, 0xA2, 0x5F, 0xB2, 0x17,
    0xE0, 0x80, 0x52, 0xDB, 0xEA, 0x89, 0x73, 0x99, 0x75, 0x79, 0xAF, 0xCB, 0x2E, 0x80, 0x07, 0xE6,
    0xF1, 0x26, 0xE0, 0x03, 0x0A, 0xE6, 0x6F, 0xF6, 0x41, 0xBF, 0x7E, 0x59, 0xC2, 0xAE, 0x55, 0xFD
  ]);
  var XORPAD = new Uint8Array([
    0xA0, 0x92, 0xD1, 0x06, 0x07, 0xDB, 0x32, 0xA1, 0xAE, 0x01, 0xF5, 0xC5, 0x1E, 0x84, 0x4F, 0xE3,
    0x53, 0xCA, 0x37, 0xF4, 0xA7, 0xB0, 0x4D, 0xA0, 0x18, 0xB7, 0xC2, 0x97, 0xDA, 0x5F, 0x53, 0x2B,
    0x75, 0xFA, 0x48, 0x16, 0xF8, 0xD4, 0x8A, 0x6F, 0x61, 0x05, 0xF4, 0xE2, 0xFD, 0x04, 0xB5, 0xA3,
    0x0F, 0xFC, 0x44, 0x92, 0xCB, 0x32, 0xE6, 0x1B, 0xB9, 0xB1, 0x2E, 0x01, 0xB0, 0x56, 0x53, 0x36,
    0xD2, 0xD1, 0x50, 0x3D, 0xDE, 0x5B, 0x2E, 0x0E, 0x52, 0xFD, 0xDF, 0x2F, 0x7B, 0xCA, 0x63, 0x50,
    0xA4, 0x67, 0x5D, 0x23, 0x17, 0xC0, 0x52, 0xE1, 0xA6, 0x30, 0x7C, 0x2B, 0xB6, 0x70, 0x36, 0x5B,
    0x2A, 0x27, 0x69, 0x33, 0xF5, 0x63, 0x7B, 0x36, 0x3F, 0x26, 0x9B, 0xA3, 0xED, 0x7A, 0x53, 0x00,
    0xA4, 0x48, 0xB3, 0x50, 0x9E, 0x14, 0xA0, 0x52, 0xDE, 0x7E, 0x10, 0x2B, 0x1B, 0x77, 0x6E
  ]);

  function xorStatic(buf) { for (var i = 0; i < buf.length; i++) buf[i] ^= XORPAD[i % 127]; }
  function swishHashValid(u8) {
    if (u8.length < 0x100) return false;
    var h = sha256Chunks([INTRO, u8.subarray(0, u8.length - 32), OUTRO]);
    var off = u8.length - 32;
    for (var i = 0; i < 32; i++) if (h[i] !== u8[off + i]) return false;
    return true;
  }

  function makeXorShift(seed) {
    var st = seed >>> 0, pc = 0, x = st;
    while (x) { pc += x & 1; x >>>= 1; }
    for (var i = 0; i < pc; i++) { st ^= (st << 2) >>> 0; st ^= st >>> 15; st ^= (st << 13) >>> 0; }
    var c = 0;
    function next() {
      var r = (st >>> (c << 3)) & 255;
      if (c === 3) { st ^= (st << 2) >>> 0; st ^= st >>> 15; st ^= (st << 13) >>> 0; c = 0; } else c++;
      return r;
    }
    return { next: next, next32: function () { return (next() | (next() << 8) | (next() << 16) | (next() << 24)) >>> 0; } };
  }
  var TYPE_SZ = { 3: 1, 8: 1, 9: 2, 10: 4, 11: 8, 12: 1, 13: 2, 14: 4, 15: 8, 16: 4, 17: 8 };
  function readBlocks(payload) {
    var blocks = [], byKey = {}, off = 0, len = payload.length;
    while (off + 5 <= len) {
      var key = u32(payload, off); off += 4;
      var xk = makeXorShift(key), type = payload[off++] ^ xk.next();
      var sub = 0, data = new Uint8Array(0);
      if (type === 1 || type === 2 || type === 3) {
        // Bool
      } else if (type === 4) {
        var bl = (u32(payload, off) ^ xk.next32()) >>> 0; off += 4;
        if (off + bl > len) return null;
        data = new Uint8Array(bl);
        for (var i = 0; i < bl; i++) data[i] = payload[off + i] ^ xk.next();
        off += bl;
      } else if (type === 5) {
        var cnt = (u32(payload, off) ^ xk.next32()) >>> 0; off += 4;
        sub = payload[off++] ^ xk.next();
        var sz = TYPE_SZ[sub]; if (!sz) return null;
        var al = cnt * sz;
        if (off + al > len) return null;
        data = new Uint8Array(al);
        for (var j = 0; j < al; j++) data[j] = payload[off + j] ^ xk.next();
        off += al;
      } else {
        var ts = TYPE_SZ[type]; if (!ts || off + ts > len) return null;
        data = new Uint8Array(ts);
        for (var k = 0; k < ts; k++) data[k] = payload[off + k] ^ xk.next();
        off += ts;
      }
      var blk = { key: key, type: type, sub: sub, data: data };
      blocks.push(blk); byKey[key] = blk;
    }
    return { blocks: blocks, byKey: byKey };
  }
  function encryptBlocks(blocks) {
    var total = 32, i;
    for (i = 0; i < blocks.length; i++) {
      var b = blocks[i];
      total += 5 + (b.type === 4 ? 4 : b.type === 5 ? 5 : 0) + b.data.length;
    }
    var out = new Uint8Array(total), off = 0;
    for (i = 0; i < blocks.length; i++) {
      var bl = blocks[i], xk = makeXorShift(bl.key);
      w32(out, off, bl.key); off += 4;
      out[off++] = bl.type ^ xk.next();
      if (bl.type === 4) { w32(out, off, (bl.data.length ^ xk.next32()) >>> 0); off += 4; }
      else if (bl.type === 5) {
        var sz = TYPE_SZ[bl.sub] || 1;
        w32(out, off, (Math.floor(bl.data.length / sz) ^ xk.next32()) >>> 0); off += 4;
        out[off++] = bl.sub ^ xk.next();
      }
      for (var q = 0; q < bl.data.length; q++) out[off++] = bl.data[q] ^ xk.next();
    }
    var payload = out.subarray(0, total - 32);
    xorStatic(payload);
    out.set(sha256Chunks([INTRO, payload, OUTRO]), total - 32);
    return out;
  }

  // ---------------- PK8 / PB8 / PA8 / PK9 Crypto & Format ----------------
  var ORDERS = [
    [0,1,2,3],[0,1,3,2],[0,2,1,3],[0,3,1,2],[0,2,3,1],[0,3,2,1],
    [1,0,2,3],[1,0,3,2],[2,0,1,3],[3,0,1,2],[2,0,3,1],[3,0,2,1],
    [1,2,0,3],[1,3,0,2],[2,1,0,3],[3,1,0,2],[2,3,0,1],[3,2,0,1],
    [1,2,3,0],[1,3,2,0],[2,1,3,0],[3,1,2,0],[2,3,1,0],[3,2,1,0]
  ];
  function crypt8(b, off, len, seed) {
    var s = seed >>> 0;
    for (var i = 0; i < len; i += 2) {
      s = (Math.imul(s, 0x41C64E6D) + 0x6073) >>> 0;
      w16(b, off + i, u16(b, off + i) ^ (s >>> 16));
    }
  }
  function sum16(b, s, e) { var r = 0; for (var i = s; i < e; i += 2) r = (r + u16(b, i)) & 0xFFFF; return r; }
  function decStr16(b, o, max) {
    var s = '';
    for (var i = 0; i < max; i++) { var c = u16(b, o + i * 2); if (!c) break; s += String.fromCharCode(c); }
    return s;
  }
  function encStr16(str, max) {
    var out = new Uint8Array((max + 1) * 2);
    for (var i = 0; i < str.length && i < max; i++) w16(out, i * 2, str.charCodeAt(i));
    return out;
  }

  function makePK8(gen, storedSz, partySz, blkSz) {
    var isPA = blkSz === 0x58;
    var O_NICK = isPA ? 0x60 : 0x58, O_MOVE = isPA ? 0x7A : 0x72, O_PP = isPA ? 0x82 : 0x7A, O_PPU = isPA ? 0x86 : 0x7E;
    var O_IV = isPA ? 0x94 : 0x8C, O_OT = isPA ? 0x110 : 0xF8, O_FR = isPA ? 0x12A : 0x112, O_VER = isPA ? 0xF6 : 0xDE;
    var O_LANG = isPA ? 0xFA : 0xE2, O_MLOC = isPA ? 0x13A : 0x122, O_BALL = isPA ? 0x13C : 0x124, O_MLV = isPA ? 0x13D : 0x125;
    return {
      size: storedSz, partySize: partySz, gen: gen, extras: true,
      decode: function (u8, off, party) {
        var len = party ? partySz : storedSz;
        if (off + len > u8.length) return null;
        var ec = u32(u8, off), chk = u16(u8, off + 6);
        if (!ec && !chk) return null;
        var tmp = new Uint8Array(u8.subarray(off, off + len));
        crypt8(tmp, 8, storedSz - 8, ec);
        if (len > storedSz) crypt8(tmp, storedSz, len - storedSz, ec);
        var d = new Uint8Array(len); d.set(tmp.subarray(0, 8));
        var ord = ORDERS[((ec >>> 13) & 31) % 24];
        for (var i = 0; i < 4; i++) d.set(tmp.subarray(8 + ord[i] * blkSz, 8 + (ord[i] + 1) * blkSz), 8 + i * blkSz);
        if (len > storedSz) d.set(tmp.subarray(storedSz), storedSz);
        var sp = u16(d, 8);
        if (!sp || sum16(d, 8, storedSz) !== chk) return null;
        return d;
      },
      encode: function (d, u8, off, party) {
        var len = party ? partySz : storedSz;
        if (!d || !u16(d, 8)) { u8.fill(0, off, off + len); return; }
        var ec = u32(d, 0), chk = sum16(d, 8, storedSz);
        w16(d, 6, chk);
        var out = new Uint8Array(len); out.set(d.subarray(0, 8));
        var ord = ORDERS[((ec >>> 13) & 31) % 24];
        for (var i = 0; i < 4; i++) out.set(d.subarray(8 + i * blkSz, 8 + (i + 1) * blkSz), 8 + ord[i] * blkSz);
        if (len > storedSz && d.length >= len) out.set(d.subarray(storedSz, len), storedSz);
        crypt8(out, 8, storedSz - 8, ec);
        if (len > storedSz) crypt8(out, storedSz, len - storedSz, ec);
        u8.set(out, off);
      },
      get: function (d, k, i) {
        switch (k) {
          case 'ec': return u32(d, 0);
          case 'species': return u16(d, 8);
          case 'item': return u16(d, 0x0A);
          case 'tid': return u16(d, 0x0C);
          case 'sid': return u16(d, 0x0E);
          case 'exp': return u32(d, 0x10);
          case 'ability': return u16(d, 0x14);
          case 'abilityNum': return d[0x16] & 7;
          case 'gmax': return (d[0x16] >> 4) & 1;
          case 'alpha': return (d[0x16] >> 5) & 1;
          case 'dynamaxLevel': return d[isPA ? 0x98 : 0x90];
          case 'teraType': return gen === 9 ? (d[0x95] !== 0x13 && d[0x95] <= 18 ? d[0x95] : d[0x94]) : 0;
          case 'pid': return u32(d, 0x1C);
          case 'nature': return d[0x20];
          case 'gender': return (d[0x22] >> 2) & 3;
          case 'form': return d[0x24];
          case 'ev': return d[0x26 + i];
          case 'nick': return decStr16(d, O_NICK, 12);
          case 'move': return u16(d, O_MOVE + i * 2);
          case 'pp': return d[O_PP + i];
          case 'ppups': return d[O_PPU + i];
          case 'iv': return (u32(d, O_IV) >>> (i * 5)) & 31;
          case 'egg': return (u32(d, O_IV) >>> 30) & 1;
          case 'ot': return decStr16(d, O_OT, 12);
          case 'friendship': return d[O_FR];
          case 'version': return d[O_VER];
          case 'lang': return d[O_LANG];
          case 'metLoc': return u16(d, O_MLOC);
          case 'ball': return d[O_BALL];
          case 'metLevel': return d[O_MLV] & 0x7F;
          case 'otGender': return d[O_MLV] >> 7;
          case 'level': return d.length > storedSz ? d[storedSz] : 0;
          case 'hp': return d.length > storedSz ? u16(d, O_IV - 2) : 0;
          case 'pokerus': return d[0x2C] || 0;
          default: return 0;
        }
      },
      set: function (d, k, v, i) {
        var iv;
        switch (k) {
          case 'ec': w32(d, 0, v); break;
          case 'species': w16(d, 8, v); break;
          case 'item': w16(d, 0x0A, v); break;
          case 'tid': w16(d, 0x0C, v); break;
          case 'sid': w16(d, 0x0E, v); break;
          case 'exp': w32(d, 0x10, v); break;
          case 'ability': w16(d, 0x14, v); break;
          case 'abilityNum': d[0x16] = (d[0x16] & ~7) | (v & 7); break;
          case 'gmax': d[0x16] = v ? (d[0x16] | 16) : (d[0x16] & ~16); break;
          case 'alpha': d[0x16] = v ? (d[0x16] | 32) : (d[0x16] & ~32); break;
          case 'dynamaxLevel': d[isPA ? 0x98 : 0x90] = Math.max(0, Math.min(10, v)); break;
          case 'teraType': if (gen === 9) { d[0x95] = v; } break;
          case 'pid': w32(d, 0x1C, v); break;
          case 'nature': d[0x20] = v; d[0x21] = v; break;
          case 'gender': d[0x22] = (d[0x22] & ~0x0C) | ((v & 3) << 2); break;
          case 'form': d[0x24] = v; break;
          case 'ev': d[0x26 + i] = v; break;
          case 'nick': d.set(encStr16(v, 12), O_NICK); iv = u32(d, O_IV); w32(d, O_IV, v ? (iv | 0x80000000) >>> 0 : (iv & 0x7FFFFFFF) >>> 0); break;
          case 'move': w16(d, O_MOVE + i * 2, v); break;
          case 'pp': d[O_PP + i] = v; break;
          case 'ppups': d[O_PPU + i] = v; break;
          case 'iv': iv = u32(d, O_IV); w32(d, O_IV, ((iv & ~(31 << (i * 5))) | ((v & 31) << (i * 5))) >>> 0); break;
          case 'egg': iv = u32(d, O_IV); w32(d, O_IV, v ? (iv | (1 << 30)) >>> 0 : (iv & ~(1 << 30)) >>> 0); break;
          case 'ot': d.set(encStr16(v, 12), O_OT); break;
          case 'friendship': d[O_FR] = v; break;
          case 'lang': d[O_LANG] = v; break;
          case 'metLoc': w16(d, O_MLOC, v); break;
          case 'ball': d[O_BALL] = v; break;
          case 'metLevel': d[O_MLV] = (d[O_MLV] & 0x80) | (v & 0x7F); break;
          case 'otGender': d[O_MLV] = (d[O_MLV] & 0x7F) | (v ? 0x80 : 0); break;
          case 'level': if (d.length > storedSz) d[storedSz] = v; break;
          case 'hp': if (d.length > storedSz) w16(d, O_IV - 2, v); break;
        }
      },
      nature: function (d) { return d[0x20]; },
      stats: function (d) { if (d.length <= storedSz) return [0, 0, 0, 0, 0, 0]; return [u16(d, storedSz + 2), u16(d, storedSz + 4), u16(d, storedSz + 6), u16(d, storedSz + 10), u16(d, storedSz + 12), u16(d, storedSz + 8)]; },
      setStats: function (d, s) { if (d.length <= storedSz) return; w16(d, storedSz + 2, s[0]); w16(d, storedSz + 4, s[1]); w16(d, storedSz + 6, s[2]); w16(d, storedSz + 8, s[5]); w16(d, storedSz + 10, s[3]); w16(d, storedSz + 12, s[4]); }
    };
  }

  var PK8 = makePK8(8, 0x148, 0x158, 0x50);
  var PA8 = makePK8(8, 0x168, 0x178, 0x58);
  var PK9 = makePK8(9, 0x148, 0x158, 0x50);

  // ---------------- BDSP (SAV8BS, unverschlüsselt mit MD5 @ 0xE9818) ----------------
  var BDSP_SIZES = [0xE9828, 0xEDC20, 0xEED8C, 0xEF0A4];
  function bdspHashValid(u8) {
    if (BDSP_SIZES.indexOf(u8.length) < 0) return false;
    var tmp = new Uint8Array(u8);
    tmp.fill(0, 0xE9818, 0xE9828);
    var h = md5(tmp);
    for (var i = 0; i < 16; i++) if (h[i] !== u8[0xE9818 + i]) return false;
    return true;
  }
  function openBDSP(u8) {
    if (!bdspHashValid(u8)) return null;
    var data = new Uint8Array(u8);
    var PARTY = 0x14098, BOX = 0x14EF4, STAT = 0x79BB4;
    var sv = {
      gen: 8, game: 'BDSP', gameName: 'Strahlender Diamant/Leuchtende Perle', gameNameEn: 'Brilliant Diamond/Shining Pearl',
      fmt: PK8, data: data, boxCount: 40, slotsPerBox: 30, ext: 'bin', partyMax: 6, version: 48,
      maxSpecies: 493, maxMove: 826, maxItem: 1828, maxAbility: 267, items: 'items'
    };
    sv.getTrainer = function () {
      return { name: decStr16(data, STAT, 12), tid: u16(data, STAT + 0x1C), sid: u16(data, STAT + 0x1E), money: u32(data, STAT + 0x20), gender: data[STAT + 0x24] ? 0 : 1, hours: 0, minutes: 0, seconds: 0 };
    };
    sv.setTrainer = function (t) {
      data.set(encStr16(t.name, 12), STAT);
      w16(data, STAT + 0x1C, t.tid); w16(data, STAT + 0x1E, t.sid);
      w32(data, STAT + 0x20, Math.min(999999, t.money >>> 0));
      data[STAT + 0x24] = t.gender ? 0 : 1;
    };
    sv.getParty = function () {
      var out = [], n = Math.min(6, data[PARTY + 6 * 0x158]);
      for (var i = 0; i < n; i++) { var m = PK8.decode(data, PARTY + i * 0x158, true); if (m) out.push(m); }
      return out;
    };
    sv.setParty = function (list) {
      var packed = list.filter(Boolean);
      data[PARTY + 6 * 0x158] = packed.length;
      for (var i = 0; i < 6; i++) PK8.encode(packed[i] || null, data, PARTY + i * 0x158, true);
    };
    sv.getBoxMon = function (b, s) { return PK8.decode(data, BOX + (b * 30 + s) * 0x158, true); };
    sv.setBoxMon = function (b, s, d) { PK8.encode(d || null, data, BOX + (b * 30 + s) * 0x158, true); };
    sv.getBoxName = function (b) { return 'Box ' + (b + 1); };
    sv.natOf = function (n) { return n; }; sv.speciesFromNat = function (n) { return n; };
    sv.growthOf = function (sp) { var t = (P && P.g8) || (P && P.g7); var e = t && t[sp]; return e ? e[6] : 0; };
    sv.baseOf = function (sp) { var t = (P && P.g8) || (P && P.g7); var e = t && t[sp]; return e ? e.slice(0, 6) : [70, 70, 70, 70, 70, 70]; };
    sv.blank = function (species, tr) {
      var d = new Uint8Array(PK8.partySize);
      PK8.set(d, 'ec', (Math.random() * 0xFFFFFFFF) >>> 0); PK8.set(d, 'pid', (Math.random() * 0xFFFFFFFF) >>> 0);
      PK8.set(d, 'species', species); PK8.set(d, 'tid', tr.tid); PK8.set(d, 'sid', tr.sid);
      PK8.set(d, 'ot', tr.name || 'Trainer'); PK8.set(d, 'ball', 4); PK8.set(d, 'lang', 4);
      PK8.set(d, 'exp', window.CCSave ? window.CCSave.expFor(sv.growthOf(species), 5) : 125);
      PK8.set(d, 'level', 5); PK8.set(d, 'move', 33, 0); PK8.set(d, 'pp', 35, 0);
      return d;
    };
    sv.finish = function () {
      var out = new Uint8Array(data);
      out.fill(0, 0xE9818, 0xE9828);
      out.set(md5(out), 0xE9818);
      return out;
    };
    return sv;
  }

  // ---------------- SwishCrypto-Saves öffnen (SwSh, PLA, SV) ----------------
  function open(u8) {
    var bdsp = openBDSP(u8);
    if (bdsp) return bdsp;
    if (!swishHashValid(u8)) return null;
    var payload = new Uint8Array(u8.subarray(0, u8.length - 32));
    xorStatic(payload);
    var parsed = readBlocks(payload);
    if (!parsed) return null;
    var B = parsed.byKey;
    var kind = null;
    if (B[0xE3E89BD1] && B[0x3AA1A9AD] && B[0x0d66012c]) kind = 'SV';
    else if (B[0x47E1CEAB] && B[0x2985fe5d] && B[0x3279D927]) kind = 'PLA';
    else if (B[0x0d66012c] && B[0x2985fe5d] && B[0xf25c070e]) kind = 'SWSH';
    if (!kind) return null;

    var cfg = {
      SWSH: { gen: 8, fmt: PK8, kBox: 0x0d66012c, kParty: 0x2985fe5d, kStat: 0xf25c070e, kMisc: 0x1b882b09, tidO: 0xA0, sidO: 0xA2, gameO: 0xA4, genO: 0xA5, otO: 0xB0, boxSlot: 0x158, boxParty: true, maxSp: 898, maxMv: 826, maxIt: 1607, maxAb: 267 },
      PLA:  { gen: 8, fmt: PA8, kBox: 0x47E1CEAB, kParty: 0x2985fe5d, kStat: 0xf25c070e, kMoney: 0x3279D927, tidO: 0x10, sidO: 0x12, gameO: 0x14, genO: 0x15, otO: 0x20, boxSlot: 0x168, boxParty: false, maxSp: 905, maxMv: 850, maxIt: 1828, maxAb: 267 },
      SV:   { gen: 9, fmt: PK9, kBox: 0x0d66012c, kParty: 0x3AA1A9AD, kStat: 0xE3E89BD1, kMoney: 0x4F35D0DD, tidO: 0x00, sidO: 0x02, gameO: 0x04, genO: 0x05, otO: 0x10, boxSlot: 0x158, boxParty: true, maxSp: 1025, maxMv: 919, maxIt: 2549, maxAb: 310 }
    }[kind];

    var bBox = B[cfg.kBox].data, bParty = B[cfg.kParty].data, bStat = B[cfg.kStat].data, bLayout = B[0x19722c89] && B[0x19722c89].data;
    var ver = bStat[cfg.gameO];
    var NM = { 44: ['Schwert', 'Sword'], 45: ['Schild', 'Shield'], 47: ['Legenden: Arceus', 'Legends: Arceus'], 50: ['Karmesin', 'Scarlet'], 51: ['Purpur', 'Violet'] };
    var nm = NM[ver] || (kind === 'SV' ? ['Karmesin/Purpur', 'Scarlet/Violet'] : kind === 'PLA' ? ['Legenden: Arceus', 'Legends: Arceus'] : ['Schwert/Schild', 'Sword/Shield']);
    var boxCount = Math.min(32, Math.floor(bBox.length / (30 * cfg.boxSlot)));
    var sv = {
      gen: cfg.gen, game: kind, gameName: nm[0], gameNameEn: nm[1], fmt: cfg.fmt, data: payload,
      boxCount: boxCount || 32, slotsPerBox: 30, ext: 'main', partyMax: 6, version: ver,
      maxSpecies: cfg.maxSp, maxMove: cfg.maxMv, maxItem: cfg.maxIt, maxAbility: cfg.maxAb, items: 'items'
    };
    sv.getTrainer = function () {
      var money = cfg.kMoney && B[cfg.kMoney] ? u32(B[cfg.kMoney].data, 0) : (cfg.kMisc && B[cfg.kMisc] ? u32(B[cfg.kMisc].data, 4) : 0);
      return { name: decStr16(bStat, cfg.otO, 12), tid: u16(bStat, cfg.tidO), sid: u16(bStat, cfg.sidO), gender: bStat[cfg.genO] ? 1 : 0, money: money, hours: 0, minutes: 0, seconds: 0 };
    };
    sv.setTrainer = function (t) {
      bStat.set(encStr16(t.name, 12), cfg.otO);
      w16(bStat, cfg.tidO, t.tid); w16(bStat, cfg.sidO, t.sid); bStat[cfg.genO] = t.gender ? 1 : 0;
      var m = Math.min(9999999, t.money >>> 0);
      if (cfg.kMoney && B[cfg.kMoney]) w32(B[cfg.kMoney].data, 0, m);
      else if (cfg.kMisc && B[cfg.kMisc]) w32(B[cfg.kMisc].data, 4, m);
    };
    sv.getParty = function () {
      var out = [];
      for (var i = 0; i < 6; i++) {
        var o = i * cfg.fmt.partySize;
        if (o + cfg.fmt.partySize > bParty.length) break;
        var m = cfg.fmt.decode(bParty, o, true);
        if (m) out.push(m);
      }
      return out;
    };
    sv.setParty = function (list) {
      var packed = list.filter(Boolean);
      for (var i = 0; i < 6; i++) {
        var o = i * cfg.fmt.partySize;
        if (o + cfg.fmt.partySize > bParty.length) break;
        cfg.fmt.encode(packed[i] || null, bParty, o, true);
      }
    };
    sv.getBoxMon = function (b, s) {
      var o = (b * 30 + s) * cfg.boxSlot;
      if (o + cfg.boxSlot > bBox.length) return null;
      return cfg.fmt.decode(bBox, o, cfg.boxParty);
    };
    sv.setBoxMon = function (b, s, d) {
      var o = (b * 30 + s) * cfg.boxSlot;
      if (o + cfg.boxSlot > bBox.length) return;
      cfg.fmt.encode(d || null, bBox, o, cfg.boxParty);
    };
    sv.getBoxName = function (b) {
      if (bLayout && (b + 1) * 0x22 <= bLayout.length) { var n = decStr16(bLayout, b * 0x22, 16); if (n) return n; }
      return 'Box ' + (b + 1);
    };
    if (bLayout) sv.setBoxName = function (b, name) {
      if ((b + 1) * 0x22 <= bLayout.length) bLayout.set(encStr16(name, 16), b * 0x22);
    };
    sv.natOf = kind === 'SV' ? intToNat9 : function (n) { return n; };
    sv.speciesFromNat = kind === 'SV' ? natToInt9 : function (n) { return n; };
    var pTab = (P && P['g' + cfg.gen]) || (P && P.g7);
    sv.growthOf = function (sp) { var e = pTab && pTab[sv.natOf(sp)]; return e ? e[6] : 0; };
    sv.baseOf = function (sp) { var e = pTab && pTab[sv.natOf(sp)]; return e ? e.slice(0, 6) : [70, 70, 70, 70, 70, 70]; };
    sv.blank = function (species, tr) {
      var d = new Uint8Array(cfg.fmt.partySize);
      var ec = (Math.random() * 0xFFFFFFFF) >>> 0;
      cfg.fmt.set(d, 'ec', ec); cfg.fmt.set(d, 'pid', (Math.random() * 0xFFFFFFFF) >>> 0);
      cfg.fmt.set(d, 'species', species); cfg.fmt.set(d, 'tid', tr.tid); cfg.fmt.set(d, 'sid', tr.sid);
      cfg.fmt.set(d, 'ot', tr.name || 'Trainer'); cfg.fmt.set(d, 'ball', 4); cfg.fmt.set(d, 'lang', 4);
      cfg.fmt.set(d, 'exp', window.CCSave ? window.CCSave.expFor(sv.growthOf(species), 5) : 125);
      cfg.fmt.set(d, 'level', 5); cfg.fmt.set(d, 'move', 33, 0); cfg.fmt.set(d, 'pp', 35, 0);
      return d;
    };
    sv.finish = function () { return encryptBlocks(parsed.blocks); };
    return sv;
  }

  window.CCSaveSwitch = { open: open, PK8: PK8, PA8: PA8, PK9: PK9, encryptBlocks: encryptBlocks, swishHashValid: swishHashValid, md5: md5, natToInt9: natToInt9, intToNat9: intToNat9 };
})();

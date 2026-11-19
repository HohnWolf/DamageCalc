// Save File Editor – Generation 6 (X/Y, Omega Rubin/Alpha Saphir) und Generation 7 (Sonne/Mond, Ultra Sonne/Ultra Mond), "main"-Datei.
// Formate nach PKHeX (kwsch/PKHeX, GPL-3.0): SAV6, SAV7, PK6, PK7, PokeCrypto, BlockInfo3DS (CRC16-Prüfsummen je Block).
(function () {
  'use strict';
  var NDS = window.NDS, P = window.PKPERSONAL, BL = window.PKBLOCKS67;
  if (!NDS || !P || !BL) return;

  function u16(b, o) { return b[o] | (b[o + 1] << 8); }
  function w16(b, o, v) { b[o] = v & 255; b[o + 1] = (v >> 8) & 255; }
  function u32(b, o) { return (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0; }
  function w32(b, o, v) { b[o] = v & 255; b[o + 1] = (v >> 8) & 255; b[o + 2] = (v >> 16) & 255; b[o + 3] = (v >>> 24) & 255; }

  // ---------------- Prüfsummen ----------------
  // Gen 6: CRC16-CCITT (PKHeX), Gen 7: CRC16 (reflektiert, Startwert 0xFFFF) invertiert
  var T7 = null;
  function crc7(u8, start, end) {
    if (!T7) { T7 = []; for (var i = 0; i < 256; i++) { var c = i; for (var k = 0; k < 8; k++) c = (c & 1) ? (c >>> 1) ^ 0xA001 : c >>> 1; T7.push(c); } }
    var chk = 0xFFFF;
    for (var j = start; j < end; j++) chk = T7[(u8[j] ^ chk) & 255] ^ (chk >>> 8);
    return (~chk) & 0xFFFF;
  }

  // ---------------- MemeCrypto (Gen 7, Signatur der Prüfsummentabelle) ----------------
  // Nachbau von PKHeX MemeCrypto/MemeKey (GPL-3.0): SHA-256 über die Blocktabelle, darüber SHA-1 (8 Byte), AES-128 (Schlüssel = SHA-1(DER || Nutzdaten)),
  // danach RSA mit dem bekannten privaten Schlüssel "PokedexAndSaveFile" (Index 3). Prüfung mit dem öffentlichen Schlüssel (e = 65537).
  function hex2u8(h) { var o = new Uint8Array(h.length / 2); for (var i = 0; i < o.length; i++) o[i] = parseInt(h.substr(i * 2, 2), 16); return o; }
  var MEME_DER = hex2u8('307C300D06092A864886F70D0101010500036B003068026100B61E192091F90A8F76A6EAAA9A3CE58C863F39AE253F037816F5975854E07A9A456601E7C94C29759FE155C064EDDFA111443F81EF1A428CF6CD32F9DAC9D48E94CFB3F690120E8E6B9111ADDAF11E7C96208C37C0143FF2BF3D7E831141A9730203010001');
  var MEME_D = '00775455668FFF3CBA3026C2D0B26B8085895958341157AEB03B6B0495EE57803E2186EB6CB2EB62A71DF18A3C9C6579077670961B3A6102DABE5A194AB58C3250AED597FC78978A326DB1D7B28DCCCB2A3E014EDBD397AD33B8F28CD525054251';
  function rotl(x, n) { return (x << n) | (x >>> (32 - n)); }
  function rotr(x, n) { return (x >>> n) | (x << (32 - n)); }
  function shaPad(msg) {
    var n = msg.length, len = ((n + 9 + 63) >> 6) << 6, b = new Uint8Array(len), bits = n * 8;
    b.set(msg); b[n] = 0x80;
    b[len - 4] = (bits >>> 24) & 255; b[len - 3] = (bits >>> 16) & 255; b[len - 2] = (bits >>> 8) & 255; b[len - 1] = bits & 255;
    b[len - 5] = Math.floor(n / 0x20000000) & 255;
    return b;
  }
  function be32(b, o) { return ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0; }
  function outBE(h) { var o = new Uint8Array(h.length * 4); for (var i = 0; i < h.length; i++) { o[i * 4] = h[i] >>> 24; o[i * 4 + 1] = (h[i] >>> 16) & 255; o[i * 4 + 2] = (h[i] >>> 8) & 255; o[i * 4 + 3] = h[i] & 255; } return o; }
  function sha1(msg) {
    var b = shaPad(msg), h = [0x67452301, 0xEFCDAB89, 0x98BADCFE, 0x10325476, 0xC3D2E1F0], w = new Array(80);
    for (var o = 0; o < b.length; o += 64) {
      var i;
      for (i = 0; i < 16; i++) w[i] = be32(b, o + i * 4);
      for (i = 16; i < 80; i++) w[i] = rotl(w[i - 3] ^ w[i - 8] ^ w[i - 14] ^ w[i - 16], 1);
      var a = h[0], b1 = h[1], c = h[2], d = h[3], e = h[4];
      for (i = 0; i < 80; i++) {
        var f = i < 20 ? ((b1 & c) | (~b1 & d)) + 0x5A827999 : i < 40 ? (b1 ^ c ^ d) + 0x6ED9EBA1 : i < 60 ? ((b1 & c) | (b1 & d) | (c & d)) + 0x8F1BBCDC : (b1 ^ c ^ d) + 0xCA62C1D6;
        var t = (rotl(a, 5) + f + e + w[i]) | 0; e = d; d = c; c = rotl(b1, 30); b1 = a; a = t;
      }
      h[0] = (h[0] + a) >>> 0; h[1] = (h[1] + b1) >>> 0; h[2] = (h[2] + c) >>> 0; h[3] = (h[3] + d) >>> 0; h[4] = (h[4] + e) >>> 0;
    }
    return outBE(h);
  }
  var K256 = [0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2];
  function sha256(msg) {
    var b = shaPad(msg), h = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19], w = new Array(64);
    for (var o = 0; o < b.length; o += 64) {
      var i;
      for (i = 0; i < 16; i++) w[i] = be32(b, o + i * 4);
      for (i = 16; i < 64; i++) {
        var s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3), s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
        w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
      }
      var a = h[0], b1 = h[1], c = h[2], d = h[3], e = h[4], f = h[5], g = h[6], hh = h[7];
      for (i = 0; i < 64; i++) {
        var t1 = (hh + (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) + ((e & f) ^ (~e & g)) + K256[i] + w[i]) | 0;
        var t2 = ((rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) + ((a & b1) ^ (a & c) ^ (b1 & c))) | 0;
        hh = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b1; b1 = a; a = (t1 + t2) | 0;
      }
      h[0] = (h[0] + a) >>> 0; h[1] = (h[1] + b1) >>> 0; h[2] = (h[2] + c) >>> 0; h[3] = (h[3] + d) >>> 0; h[4] = (h[4] + e) >>> 0; h[5] = (h[5] + f) >>> 0; h[6] = (h[6] + g) >>> 0; h[7] = (h[7] + hh) >>> 0;
    }
    return outBE(h);
  }
  // AES-128 (ECB, je ein Block an Ort und Stelle)
  var SBOX = null, INV = null;
  function xt(a) { return ((a << 1) ^ (a & 0x80 ? 0x1B : 0)) & 255; }
  function gmul(a, b) { var r = 0; while (b) { if (b & 1) r ^= a; a = xt(a); b >>= 1; } return r; }
  function aesInit() {
    if (SBOX) return;
    SBOX = new Uint8Array(256); INV = new Uint8Array(256);
    for (var x = 0; x < 256; x++) {
      var inv = 0;
      if (x) for (var y = 1; y < 256; y++) if (gmul(x, y) === 1) { inv = y; break; }
      var s = inv ^ ((inv << 1) | (inv >> 7)) ^ ((inv << 2) | (inv >> 6)) ^ ((inv << 3) | (inv >> 5)) ^ ((inv << 4) | (inv >> 4));
      s = (s ^ 0x63) & 255; SBOX[x] = s; INV[s] = x;
    }
  }
  function aesKey(key) {
    aesInit();
    var w = new Uint8Array(176), rc = 1, j;
    w.set(key);
    for (var i = 16; i < 176; i += 4) {
      var t = [w[i - 4], w[i - 3], w[i - 2], w[i - 1]];
      if (i % 16 === 0) { t = [SBOX[t[1]] ^ rc, SBOX[t[2]], SBOX[t[3]], SBOX[t[0]]]; rc = xt(rc); }
      for (j = 0; j < 4; j++) w[i + j] = w[i - 16 + j] ^ t[j];
    }
    return w;
  }
  function aesEnc(w, s) {
    var r, i, c;
    for (i = 0; i < 16; i++) s[i] ^= w[i];
    for (r = 1; r <= 10; r++) {
      var t = new Uint8Array(16);
      for (i = 0; i < 16; i++) t[i] = SBOX[s[(i + 4 * (i % 4)) % 16]]; // SubBytes + ShiftRows
      if (r < 10) for (c = 0; c < 4; c++) {
        var a0 = t[c * 4], a1 = t[c * 4 + 1], a2 = t[c * 4 + 2], a3 = t[c * 4 + 3];
        t[c * 4] = xt(a0) ^ xt(a1) ^ a1 ^ a2 ^ a3; t[c * 4 + 1] = a0 ^ xt(a1) ^ xt(a2) ^ a2 ^ a3;
        t[c * 4 + 2] = a0 ^ a1 ^ xt(a2) ^ xt(a3) ^ a3; t[c * 4 + 3] = xt(a0) ^ a0 ^ a1 ^ a2 ^ xt(a3);
      }
      for (i = 0; i < 16; i++) s[i] = t[i] ^ w[r * 16 + i];
    }
  }
  function aesDec(w, s) {
    var r, i, c;
    for (i = 0; i < 16; i++) s[i] ^= w[160 + i];
    for (r = 9; r >= 0; r--) {
      var t = new Uint8Array(16);
      for (i = 0; i < 16; i++) t[(i + 4 * (i % 4)) % 16] = INV[s[i]]; // InvShiftRows + InvSubBytes
      for (i = 0; i < 16; i++) t[i] ^= w[r * 16 + i];
      if (r > 0) for (c = 0; c < 4; c++) {
        var a0 = t[c * 4], a1 = t[c * 4 + 1], a2 = t[c * 4 + 2], a3 = t[c * 4 + 3];
        t[c * 4] = gmul(a0, 14) ^ gmul(a1, 11) ^ gmul(a2, 13) ^ gmul(a3, 9); t[c * 4 + 1] = gmul(a0, 9) ^ gmul(a1, 14) ^ gmul(a2, 11) ^ gmul(a3, 13);
        t[c * 4 + 2] = gmul(a0, 13) ^ gmul(a1, 9) ^ gmul(a2, 14) ^ gmul(a3, 11); t[c * 4 + 3] = gmul(a0, 11) ^ gmul(a1, 13) ^ gmul(a2, 9) ^ gmul(a3, 14);
      }
      for (i = 0; i < 16; i++) s[i] = t[i];
    }
  }
  function xor16(a, b) { for (var i = 0; i < 16; i++) a[i] ^= b[i]; }
  function subKey(t) { // "unvollständiges ROL" wie MemeKey.GetSubKey
    var k = new Uint8Array(16);
    for (var i = 0; i < 16; i += 2) { k[i] = (2 * t[i] + (t[i + 1] >> 7)) & 255; k[i + 1] = (2 * t[i + 1] + (i + 2 < 16 ? t[i + 2] >> 7 : 0)) & 255; }
    if (t[0] & 0x80) k[15] ^= 0x87;
    return k;
  }
  function memeAesKey(payload) { var m = new Uint8Array(MEME_DER.length + payload.length); m.set(MEME_DER); m.set(payload, MEME_DER.length); return aesKey(sha1(m).subarray(0, 16)); }
  function memeAesEncrypt(data) { // verändert die letzten 0x60 Byte, wie MemeKey.AesEncrypt
    var n = data.length, w = memeAesKey(data.subarray(0, n - 0x60)), sig = data.subarray(n - 0x60), temp = new Uint8Array(16), i, sl, nx;
    for (i = 0; i < 0x60; i += 16) { sl = sig.subarray(i, i + 16); xor16(sl, temp); aesEnc(w, sl); temp.set(sl); }
    xor16(temp, sig.subarray(0, 16));
    nx = subKey(temp);
    for (i = 0; i < 0x60; i += 16) xor16(sig.subarray(i, i + 16), nx);
    temp.fill(0);
    for (i = 0x50; i >= 0; i -= 16) { sl = sig.subarray(i, i + 16); nx = new Uint8Array(sl); aesEnc(w, sl); xor16(sl, temp); temp.set(nx); }
  }
  function memeAesDecrypt(data) { // wie MemeKey.AesDecrypt
    var n = data.length, w = memeAesKey(data.subarray(0, n - 0x60)), sig = data.subarray(n - 0x60), temp = new Uint8Array(16), i, sl, nx;
    for (i = 0x50; i >= 0; i -= 16) { sl = sig.subarray(i, i + 16); xor16(temp, sl); aesDec(w, temp); sl.set(temp); }
    xor16(temp, sig.subarray(0x50, 0x60));
    nx = subKey(temp);
    for (i = 0; i < 0x60; i += 16) xor16(sig.subarray(i, i + 16), nx);
    nx = new Uint8Array(16);
    for (i = 0; i < 0x60; i += 16) { sl = sig.subarray(i, i + 16); temp.set(sl); aesDec(w, sl); xor16(sl, nx); nx.set(temp); }
  }
  var hasBig = typeof BigInt === 'function';
  function big(u8) { var h = ''; for (var i = 0; i < u8.length; i++) h += (u8[i] < 16 ? '0' : '') + u8[i].toString(16); return BigInt('0x' + (h || '0')); }
  function modPow(b, e, m) { var r = BigInt(1), z = BigInt(0), one = BigInt(1), two = BigInt(2); b %= m; while (e > z) { if (e % two === one) r = (r * b) % m; e /= two; b = (b * b) % m; } return r; }
  function rsa(u8, exp) { // Ergebnis rechtsbündig in 0x60 Byte
    var r = modPow(big(u8), exp, big(MEME_DER.subarray(0x18, 0x18 + 0x61))).toString(16), out = new Uint8Array(0x60);
    while (r.length < 0xC0) r = '0' + r;
    for (var i = 0; i < 0x60; i++) out[i] = parseInt(r.substr(i * 2, 2), 16);
    return out;
  }
  function memeSign(data) { // an Ort und Stelle wie SignMemeDataInPlace
    var n = data.length;
    data.set(sha1(data.subarray(0, n - 8)).subarray(0, 8), n - 8);
    memeAesEncrypt(data);
    var sig = data.subarray(n - 0x60); sig[0] &= 0x7F;
    sig.set(rsa(sig, big(hex2u8(MEME_D))));
  }
  function memeVerify(data) { // true, wenn die Signatur mit dem öffentlichen Schlüssel passt (VerifyMemeData)
    var n = data.length, pub = rsa(data.subarray(n - 0x60), BigInt(65537));
    for (var hi = 0; hi < 2; hi++) {
      var o = new Uint8Array(data), ok = true;
      o.set(pub, n - 0x60); if (hi) o[n - 0x60] |= 0x80;
      memeAesDecrypt(o);
      var h = sha1(o.subarray(0, n - 8));
      for (var i = 0; i < 8; i++) if (h[i] !== o[n - 8 + i]) ok = false;
      if (ok) return true;
    }
    return false;
  }
  // Signatur eines Gen-7-Spielstands (SM/USUM) erneuern, wie PKHeX MemeCrypto.SignInPlace
  function resign7(out, usum) {
    var tab = out.length - 0x200, sigOff = (usum ? 0x6C000 : 0x6BA00) + 0x100, sig = out.subarray(sigOff, sigOff + 0x80);
    sig.fill(0); sig.set(sha256(out.subarray(tab, tab + (usum ? 0x150 : 0x140))));
    memeSign(sig);
  }


  // ---------------- Text (UTF-16, 0-terminiert) ----------------
  var SPECIAL = { 0xE08E: '♂', 0xE08F: '♀', 0xE08A: '…' }, SPECIAL_REV = {};
  Object.keys(SPECIAL).forEach(function (k) { SPECIAL_REV[SPECIAL[k]] = +k; });
  function dec(u8, off, max) {
    var s = '';
    for (var i = 0; i < max; i++) { var c = u16(u8, off + i * 2); if (!c) break; s += SPECIAL[c] || String.fromCharCode(c); }
    return s;
  }
  function enc(str, max, bytes) {
    var out = new Uint8Array(bytes), n = 0;
    for (var i = 0; i < str.length && n < max; i++) { var ch = str.charAt(i); w16(out, n * 2, SPECIAL_REV[ch] || str.charCodeAt(i)); n++; }
    return out;
  }

  // ---------------- Verschlüsselung (PokeCrypto) ----------------
  function crypt(arr, start, end, seed) {
    seed = seed >>> 0;
    for (var i = start; i < end; i += 2) {
      seed = (Math.imul(0x41C64E6D, seed) + 0x6073) >>> 0;
      var x = seed >>> 16; arr[i] ^= x & 255; arr[i + 1] ^= x >> 8;
    }
  }
  var BP = window.NDS.BLOCK_POS;
  function decode(u8, off, party) {
    var len = party ? 260 : 232;
    if (off + len > u8.length) return null;
    var ec = u32(u8, off);
    if (!ec) return null;
    var e = u8.slice(off, off + len), sv = (ec >>> 13) & 31, i;
    crypt(e, 8, 232, ec);
    if (party) crypt(e, 232, 260, ec);
    var d = new Uint8Array(len);
    d.set(e.subarray(0, 8));
    for (var b = 0; b < 4; b++) { var src = BP[sv * 4 + b]; d.set(e.subarray(8 + src * 56, 64 + src * 56), 8 + b * 56); }
    if (party) d.set(e.subarray(232), 232);
    var sum = 0; for (i = 8; i < 232; i += 2) sum = (sum + u16(d, i)) & 0xFFFF;
    if (sum !== u16(d, 6)) return null;
    return d;
  }
  function encode(d, u8, off, party) {
    var len = party ? 260 : 232, ec = u32(d, 0), sv = (ec >>> 13) & 31, sum = 0, i;
    for (i = 8; i < 232; i += 2) sum = (sum + u16(d, i)) & 0xFFFF;
    w16(d, 6, sum);
    var e = new Uint8Array(len);
    e.set(d.subarray(0, 8));
    for (var b = 0; b < 4; b++) { var dst = BP[sv * 4 + b]; e.set(d.subarray(8 + b * 56, 64 + b * 56), 8 + dst * 56); }
    if (party) e.set(d.subarray(232, 260), 232);
    crypt(e, 8, 232, ec);
    if (party) crypt(e, 232, 260, ec);
    u8.set(e, off);
  }

  // ---------------- Pokémon (PK6 / PK7, gleiche Felder) ----------------
  function mk(gen) {
    var F = { gen: gen, size: 232, partySize: 260, natureIsPid: false, gen67: true, extras: true };
    F.decode = function (u8, off, party) {
      var d = decode(u8, off, party); if (!d) return null;
      var sp = u16(d, 8); if (!sp || sp > (gen === 6 ? 721 : 807)) return null;
      return d;
    };
    F.encode = encode;
    F.get = function (d, k, i) {
      switch (k) {
        case 'pokerus': return d[0x2B];
        case 'otGender': return d[0xDD] >> 7;
        case 'eggYear': return d[0xD1];
        case 'eggMonth': return d[0xD2];
        case 'eggDay': return d[0xD3];
        case 'metYear': return d[0xD4];
        case 'metMonth': return d[0xD5];
        case 'metDay': return d[0xD6];
        case 'contest': return d[0x24 + i];
        case 'metLoc': return u16(d, 0xDA);
        case 'eggLoc': return u16(d, 0xD8);
        case 'lang': return d[0xE3];
        case 'pid': return u32(d, 0x18);
        case 'ec': return u32(d, 0);
        case 'species': return u16(d, 8);
        case 'item': return u16(d, 0x0A);
        case 'tid': return u16(d, 0x0C);
        case 'sid': return u16(d, 0x0E);
        case 'exp': return u32(d, 0x10);
        case 'ability': return d[0x14];
        case 'abilityNum': return gen === 7 ? (d[0x15] & 7) : d[0x15];
        case 'hiddenAbility': return (gen === 7 ? (d[0x15] & 7) : d[0x15]) === 4 ? 1 : 0;
        case 'nature': return d[0x1C];
        case 'gender': return (d[0x1D] >> 1) & 3;
        case 'form': return d[0x1D] >> 3;
        case 'ev': return d[0x1E + i];
        case 'move': return u16(d, 0x5A + i * 2);
        case 'pp': return d[0x62 + i];
        case 'ppups': return d[0x66 + i];
        case 'iv': return (u32(d, 0x74) >>> (i * 5)) & 31;
        case 'egg': return (u32(d, 0x74) >>> 30) & 1;
        case 'nicknamed': return (u32(d, 0x74) >>> 31) & 1;
        case 'nick': return dec(d, 0x40, 12);
        case 'ot': return dec(d, 0xB0, 12);
        case 'friendship': return d[0x93] === 1 ? d[0xA2] : d[0xCA]; // aktueller Besitzer: 0 = OT (0xCA), 1 = Nicht-OT (0xA2)
        case 'ball': return d[0xDC];
        case 'version': return d[0xDF];
        case 'metLevel': return d[0xDD] & 127;
        case 'level': return d.length >= 260 ? d[0xEC] : 0;
        case 'hp': return d.length >= 260 ? u16(d, 0xF0) : 0;
        case 'status': return d.length >= 260 ? u32(d, 0xE8) : 0;
      }
      return 0;
    };
    F.set = function (d, k, v, i) {
      var t;
      switch (k) {
        case 'pokerus': d[0x2B] = v; break;
        case 'otGender': d[0xDD] = (d[0xDD] & 0x7F) | ((v & 1) << 7); break;
        case 'metLevel': d[0xDD] = (d[0xDD] & 0x80) | (v & 127); break;
        case 'eggYear': d[0xD1] = v; break;
        case 'eggMonth': d[0xD2] = v; break;
        case 'eggDay': d[0xD3] = v; break;
        case 'metYear': d[0xD4] = v; break;
        case 'metMonth': d[0xD5] = v; break;
        case 'metDay': d[0xD6] = v; break;
        case 'contest': d[0x24 + i] = v; break;
        case 'metLoc': w16(d, 0xDA, v); break;
        case 'eggLoc': w16(d, 0xD8, v); break;
        case 'lang': d[0xE3] = v; break;
        case 'pid': w32(d, 0x18, v); break;
        case 'ec': w32(d, 0, v); break;
        case 'species': w16(d, 8, v); break;
        case 'item': w16(d, 0x0A, v); break;
        case 'tid': w16(d, 0x0C, v); break;
        case 'sid': w16(d, 0x0E, v); break;
        case 'exp': w32(d, 0x10, v); break;
        case 'ability': d[0x14] = v; break;
        case 'abilityNum': d[0x15] = gen === 7 ? ((d[0x15] & ~7) | (v & 7)) : v; break;
        case 'hiddenAbility': d[0x15] = gen === 7 ? ((d[0x15] & ~7) | (v ? 4 : 1)) : (v ? 4 : 1); break;
        case 'nature': d[0x1C] = v; break;
        case 'gender': d[0x1D] = (d[0x1D] & ~6) | (v << 1); break;
        case 'form': d[0x1D] = (d[0x1D] & 7) | (v << 3); break;
        case 'ev': d[0x1E + i] = v; break;
        case 'move': w16(d, 0x5A + i * 2, v); break;
        case 'pp': d[0x62 + i] = v; break;
        case 'ppups': d[0x66 + i] = v; break;
        case 'iv': t = u32(d, 0x74); t = (t & ~(31 << (i * 5))) >>> 0; w32(d, 0x74, (t | (v << (i * 5))) >>> 0); break;
        case 'egg': t = u32(d, 0x74); w32(d, 0x74, v ? (t | 0x40000000) >>> 0 : (t & ~0x40000000) >>> 0); break;
        case 'nicknamed': t = u32(d, 0x74); w32(d, 0x74, v ? (t | 0x80000000) >>> 0 : (t & 0x7FFFFFFF) >>> 0); break;
        case 'nick': d.set(enc(v, 12, 0x1A), 0x40); break;
        case 'ot': d.set(enc(v, 12, 0x1A), 0xB0); break;
        case 'friendship': if (d[0x93] === 1) d[0xA2] = v; else d[0xCA] = v; break;
        case 'version': d[0xDF] = v; break;
        case 'ball': d[0xDC] = v; break;
        case 'level': d[0xEC] = v; break;
        case 'hp': w16(d, 0xF0, v); break;
        case 'status': if (d.length >= 260) w32(d, 0xE8, v); break;
      }
    };
    F.nature = function (d) { return d[0x1C]; };
    F.setStats = function (d, st) {
      w16(d, 0xF2, st[0]); w16(d, 0xF4, st[1]); w16(d, 0xF6, st[2]); w16(d, 0xF8, st[3]); w16(d, 0xFA, st[4]); w16(d, 0xFC, st[5]);
      if (u16(d, 0xF0) > st[0]) w16(d, 0xF0, st[0]);
    };
    F.calcChecksum = function (d) { var s = 0; for (var i = 8; i < 232; i += 2) s = (s + u16(d, i)) & 0xFFFF; return s; };
    F.checksumOk = function (d) { return F.calcChecksum(d) === u16(d, 6); };
    F.refreshChecksum = function (d) { w16(d, 6, F.calcChecksum(d)); };
    F.fileSizes = [232, 260];
    F.stats = function (d) { return [u16(d, 0xF2), u16(d, 0xF4), u16(d, 0xF6), u16(d, 0xF8), u16(d, 0xFA), u16(d, 0xFC)]; };
    return F;
  }
  var PK6 = mk(6), PK7 = mk(7);

  // ---------------- Spielstand ----------------
  var GAMES = {
    xy: { gen: 6, size: 0x65600, name: 'X/Y', nameEn: 'X/Y', trainer: 17, misc: 11, party: 18, boxLayout: 12, box: 53, boxes: 31, otOff: 0x48, moneyOff: 0x8, maxSpecies: 721, maxMove: 617, maxItem: 717, maxAbility: 191, version: 24 },
    ao: { gen: 6, size: 0x76000, name: 'Omega Rubin/Alpha Saphir', nameEn: 'Omega Ruby/Alpha Sapphire', trainer: 17, misc: 11, party: 18, boxLayout: 12, box: 56, boxes: 31, otOff: 0x48, moneyOff: 0x8, maxSpecies: 721, maxMove: 621, maxItem: 775, maxAbility: 191, version: 27 },
    sm: { gen: 7, size: 0x6BE00, name: 'Sonne/Mond', nameEn: 'Sun/Moon', trainer: 3, misc: 9, party: 4, boxLayout: 13, box: 14, boxes: 32, otOff: 0x38, moneyOff: 0x4, maxSpecies: 802, maxMove: 719, maxItem: 920, maxAbility: 233, version: 30 },
    usum: { gen: 7, size: 0x6CC00, name: 'Ultra Sonne/Ultra Mond', nameEn: 'Ultra Sun/Ultra Moon', trainer: 3, misc: 9, party: 4, boxLayout: 13, box: 14, boxes: 32, otOff: 0x38, moneyOff: 0x4, maxSpecies: 807, maxMove: 728, maxItem: 959, maxAbility: 233, version: 32 }
  };
  function open(u8raw) {
    var u8 = u8raw, key = null;
    Object.keys(GAMES).some(function (k) { if (u8.length === GAMES[k].size && u32(u8, u8.length - 0x1F0) === 0x42454546) { key = k; return true; } return false; });
    if (!key) return null;
    var g = GAMES[key], blocks = BL[key], meta = g.size - 0x200, data = new Uint8Array(u8), F = g.gen === 6 ? PK6 : PK7;
    var tr = blocks[g.trainer][0], misc = blocks[g.misc][0], party = blocks[g.party][0], box = blocks[g.box][0], bl = blocks[g.boxLayout][0];
    var sv = { gen: g.gen, game: key, gameName: g.name, gameNameEn: g.nameEn, fmt: F, data: data, boxCount: g.boxes, slotsPerBox: 30, ext: 'sav', partyMax: 6, gb: false };
    sv.blocks = blocks;
    sv.getTrainer = function () { return { name: dec(data, tr + g.otOff, 12), tid: u16(data, tr), sid: u16(data, tr + 2), gender: data[tr + 5], money: u32(data, misc + g.moneyOff), hours: 0, minutes: 0, seconds: 0 }; };
    sv.setTrainer = function (t) {
      data.set(enc(t.name, 12, 0x1A), tr + g.otOff); w16(data, tr, t.tid); w16(data, tr + 2, t.sid); data[tr + 5] = t.gender ? 1 : 0;
      w32(data, misc + g.moneyOff, Math.min(t.money, 9999999));
    };
    sv.partyCount = function () { return Math.min(6, data[party + 6 * 260]); };
    sv.getParty = function () { var out = [], n = sv.partyCount(); for (var i = 0; i < n; i++) out.push(F.decode(data, party + i * 260, true)); return out; };
    sv.setParty = function (list) {
      var packed = list.filter(Boolean), old = sv.partyCount();
      data[party + 6 * 260] = packed.length;
      for (var i = 0; i < Math.max(packed.length, old, 6); i++) {
        var o = party + i * 260;
        if (packed[i]) F.encode(packed[i], data, o, true); else data.fill(0, o, o + 260);
      }
    };
    function off(b, s) { return box + (b * 30 + s) * 232; }
    sv.getBoxMon = function (b, s) { return F.decode(data, off(b, s), false); };
    sv.setBoxMon = function (b, s, d) { var o = off(b, s); if (d) F.encode(d, data, o, false); else data.fill(0, o, o + 232); };
    sv.getBoxName = function (b) { return dec(data, bl + b * 0x22, 16); };
    sv.setBoxName = function (b, name) { data.fill(0, bl + b * 0x22, bl + b * 0x22 + 0x22); data.set(enc(name, 14, 0x20), bl + b * 0x22); };
    var tab = P['g' + g.gen];
    sv.growthOf = function (sp) { var e = tab[sp]; return e ? e[6] : 0; };
    sv.baseOf = function (sp) { var e = tab[sp]; return e ? e.slice(0, 6) : [50, 50, 50, 50, 50, 50]; };
    sv.natOf = function (n) { return n; }; sv.speciesFromNat = function (n) { return n; };
    sv.maxSpecies = g.maxSpecies; sv.maxMove = g.maxMove; sv.maxItem = g.maxItem; sv.maxAbility = g.maxAbility; sv.items = 'items';
    sv.finish = function () {
      var out = new Uint8Array(data), crc = g.gen === 6 ? function (a, s, e) { return NDS.crc16(a, s, e); } : crc7;
      // Gen 7: die Prüfsumme des MemeCrypto-Blocks gilt für den genullten Signaturbereich (PKHeX ClearMemeCrypto)
      var memeOk = true, mOff = (key === 'usum' ? 0x6C000 : 0x6BA00) + 0x100;
      if (g.gen === 7) out.fill(0, mOff, mOff + 0x80);
      for (var i = 0; i < blocks.length; i++) w16(out, meta + 0x14 + i * 8 + 6, crc(out, blocks[i][0], blocks[i][0] + blocks[i][1]));
      if (g.gen === 7) { if (hasBig) { try { resign7(out, key === 'usum'); } catch (e) { memeOk = false; } } else memeOk = false; }
      sv.signed = g.gen === 7 ? memeOk : null; // false: Signatur konnte nicht erneuert werden (die Oberfläche warnt)
      return out;
    };
    // Neues Pokémon (Gen 6/7)
    sv.blank = function (species, t) {
      var d = new Uint8Array(260), rnd = function () { return ((Math.random() * 0x10000) << 16 | (Math.random() * 0x10000)) >>> 0; };
      F.set(d, 'ec', rnd()); F.set(d, 'pid', rnd()); F.set(d, 'species', species); F.set(d, 'tid', t.tid); F.set(d, 'sid', t.sid);
      var pe = tab[species] || [], gr = pe[6] || 0;
      F.set(d, 'exp', window.CCSave.expFor(gr, 5)); F.set(d, 'ability', pe[8] || 1); F.set(d, 'abilityNum', 1);
      for (var i = 0; i < 6; i++) F.set(d, 'iv', 31, i);
      F.set(d, 'friendship', 70); F.set(d, 'ot', t.name); d[0xDD] = 5 | ((t.gender ? 1 : 0) << 7);
      F.set(d, 'ball', 4); d[0xDF] = g.version; d[0xE3] = 2; d[0x93] = 0; F.set(d, 'level', 5);
      var now = new Date(); d[0xD4] = now.getFullYear() - 2000; d[0xD5] = now.getMonth() + 1; d[0xD6] = now.getDate();
      F.set(d, 'move', 1, 0); F.set(d, 'pp', 35, 0);
      var gr2 = pe[7]; F.set(d, 'gender', gr2 === 255 ? 2 : gr2 === 254 ? 1 : gr2 === 0 ? 0 : ((F.get(d, 'pid') & 0xFF) < gr2 ? 1 : 0));
      return d;
    };
    return sv;
  }

  window.CCSave3DS = { open: open, PK6: PK6, PK7: PK7, crc7: crc7, sha1: sha1, sha256: sha256, aesKey: aesKey, aesEnc: aesEnc, aesDec: aesDec, memeSign: memeSign, memeVerify: memeVerify, resign7: resign7 };
})();

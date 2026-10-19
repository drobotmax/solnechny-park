// SPZ (Niantic Gaussian splat) reader shared by the viewer and the park game.
// Returns splat centres, RGB + opacity and a per-splat world size; rotations
// and spherical harmonics are skipped.
window.SPZ = (function () {
  'use strict';

  // SPZ (Niantic): gzip of a 16-byte header and attribute blocks laid out
  // column-wise: positions, alphas, colours, scales, rotations, SH. Only the
  // first four matter for points; rotations and SH are skipped.
  async function gunzip(buf) {
    var b = new Uint8Array(buf);
    if (b[0] !== 0x1f || b[1] !== 0x8b) return b;
    var stream = new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip'));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }

  function halfToFloat(h) {
    var s = h & 0x8000 ? -1 : 1, e = (h >> 10) & 31, f = h & 1023;
    if (e === 0) return s * Math.pow(2, -14) * (f / 1024);
    if (e === 31) return f ? NaN : s * Infinity;
    return s * Math.pow(2, e - 15) * (1 + f / 1024);
  }

  function parseSpz(b) {
    var dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
    if (dv.getUint32(0, true) !== 0x5053474e) throw new Error('не SPZ: нет сигнатуры NGSP');
    var ver = dv.getUint32(4, true), n = dv.getUint32(8, true), fb = b[13];
    if (ver < 1 || ver > 3) throw new Error('SPZ версии ' + ver + ' не поддерживается');
    var pos = new Float32Array(n * 3), col = new Uint8Array(n * 4), size = new Float32Array(n);
    var o = 16, i, k;
    if (ver === 1) {
      for (i = 0; i < n * 3; i++) pos[i] = halfToFloat(dv.getUint16(o + i * 2, true));
      o += n * 6;
    } else {
      var scale = 1 / (1 << fb);
      for (i = 0; i < n * 3; i++, o += 3) {
        var v = b[o] | (b[o + 1] << 8) | (b[o + 2] << 16);
        if (v & 0x800000) v -= 0x1000000;
        pos[i] = v * scale;
      }
    }
    for (i = 0; i < n; i++) col[i * 4 + 3] = b[o + i];
    o += n;
    // Colour is the SH DC term stored as dc * 0.15 + 0.5; to RGB: 0.5 + C0 * dc.
    var lut = new Uint8Array(256);
    for (k = 0; k < 256; k++) lut[k] = Math.max(0, Math.min(255, Math.round(255 * (0.5 + 0.28209479 * (k / 255 - 0.5) / 0.15))));
    for (i = 0; i < n; i++) {
      col[i * 4] = lut[b[o + i * 3]];
      col[i * 4 + 1] = lut[b[o + i * 3 + 1]];
      col[i * 4 + 2] = lut[b[o + i * 3 + 2]];
    }
    o += n * 3;
    for (i = 0; i < n; i++) {
      var m = Math.max(b[o + i * 3], b[o + i * 3 + 1], b[o + i * 3 + 2]);
      size[i] = Math.exp(m / 16 - 10);   // log-scale stored as (s + 10) * 16
    }
    return { n: n, ver: ver, pos: pos, col: col, size: size };
  }
  return { gunzip: gunzip, parse: parseSpz };
})();

// "Молоко для малыша": the scanned stroller from Карасунский.spz rolling
// through Солнечный остров (Krasnodar), collecting milk bottles.
//
// Same pipeline as the viewer: plain WebGL2 into a low-res buffer scaled up
// with image-rendering: pixelated, one colour stage (palettes, dithering)
// shared by everything. The ground is one quad sampling two maps built by
// tools/gen_park.py at 0.4 m per cell: surface categories from OpenStreetMap
// plus tree cover classified from satellite imagery (ground.png) and the
// satellite colour itself (albedo.jpg). Trees, buildings, rides and props are
// point clouds generated here from park/park.json, so they read the same as
// the scanned stroller.
(function () {
  'use strict';

  // Surface categories, as written by tools/gen_park.py (low 5 bits).
  var LAWN = 1, PATH = 2, ROAD = 3, WATER = 4, BUILDING = 5, SAND = 6, PITCH = 7, WOOD = 8, PARKING = 9,
    OUTSIDE = 10, PLAZA = 11, RIDE = 12, FENCE = 13;
  var UNREACHABLE = 32, IN_PARK = 64;
  var SOLID = {}; [WATER, BUILDING, RIDE, FENCE].forEach(function (c) { SOLID[c] = 1; });
  // per surface: top-speed factor, rolling resistance when coasting (m/s²)
  var SURF = {};
  SURF[PATH] = [1, 0.5]; SURF[ROAD] = [1, 0.45]; SURF[PLAZA] = [1, 0.6]; SURF[PARKING] = [1, 0.6];
  SURF[LAWN] = [0.62, 2.2]; SURF[WOOD] = [0.5, 2.8]; SURF[OUTSIDE] = [0.55, 2.4]; SURF[SAND] = [0.4, 3.5]; SURF[PITCH] = [0.8, 1.4];

  // Stroller physics, at speed ×1. Running pace with a parent behind it, a
  // short sprint on turbo; a stroller pivots on the spot, so steering works
  // at rest and tightens less than a car's.
  var RUN = 4.0, TURBO = 7.0, REVERSE = 1.8;          // m/s
  var PUSH = 3.5, BRAKE = 8;                          // m/s²
  var STAMINA = 4, REGEN = 0.5;                       // s of turbo, s regained per s
  var TURN_PIVOT = 1.9, TURN_MAX = 2.4;               // rad/s
  var STEP = 1 / 120;                                 // fixed physics step, s

  var MILK_START = 60, MILK_PER_BOTTLE = 60, MILK_CAP = 120, BOTTLES = 5;
  var FOV0 = 55 * Math.PI / 180;
  var MIN_ALPHA = 0.1;

  var PALETTES = {
    pico8: ['000000', '1d2b53', '7e2553', '008751', 'ab5236', '5f574f', 'c2c3c7', 'fff1e8',
            'ff004d', 'ffa300', 'ffec27', '00e436', '29adff', '83769c', 'ff77a8', 'ffccaa'],
    gameboy: ['0f380f', '306230', '8bac0f', '9bbc0f'],
    cga: ['000000', '55ffff', 'ff55ff', 'ffffff'],
    mono: ['000000', 'ffffff'],
  };
  var SPREAD = { pico8: 0.18, gameboy: 0.3, cga: 0.45, mono: 0.6 };
  var DEFAULTS = { pix: 2, speedMul: 1, palette: 'source', accent: '#e4342a', dither: false, night: false, grain: true, mini: true, sound: true };
  var state = Object.assign({}, DEFAULTS, readSaved(), readQuery());

  var stage = document.getElementById('stage');
  var canvas = document.getElementById('c');
  var statusEl = document.getElementById('status');
  var gl = canvas.getContext('webgl2', { antialias: false, alpha: false, preserveDrawingBuffer: true });
  if (!gl) { statusEl.textContent = 'WebGL2 недоступен'; return; }

  function readSaved() { try { return JSON.parse(localStorage.getItem('pixel-park') || '{}'); } catch (e) { return {}; } }
  function readQuery() {
    var q = new URLSearchParams(location.search), out = {};
    Object.keys(DEFAULTS).forEach(function (k) {
      if (!q.has(k)) return;
      var v = q.get(k), d = DEFAULTS[k];
      out[k] = typeof d === 'number' ? Number(v) : typeof d === 'boolean' ? v !== '0' && v !== 'false' : v;
    });
    return out;
  }
  function save() { try { localStorage.setItem('pixel-park', JSON.stringify(state)); } catch (e) { /* private mode */ } }

  // ------------------------------------------------------------- shaders ---

  // One colour stage for points and ground: fog, then accent / source /
  // nearest-palette with an optional 4x4 Bayer offset in buffer pixels.
  var COLOR = '' +
    'uniform int uMode, uPalN;\n' +
    'uniform vec3 uAccent, uBg;\n' +
    'uniform vec3 uPal[16];\n' +
    'uniform float uDither, uSpread;\n' +
    'const float B[16] = float[16](0.,8.,2.,10.,12.,4.,14.,6.,3.,11.,1.,9.,15.,7.,13.,5.);\n' +
    'float bayer() { ivec2 q = ivec2(gl_FragCoord.xy) & 3; return (B[q.x + 4 * q.y] + 0.5) / 16.0; }\n' +
    'vec3 colorize(vec3 c, float fog) {\n' +
    '  float t = uDither > 0.5 ? bayer() : 0.5;\n' +
    '  if (uMode == 0) {\n' +
    '    float k = (0.25 + 0.9 * dot(c, vec3(0.299, 0.587, 0.114))) * (1.0 - 0.85 * fog);\n' +
    '    if (uDither > 0.5) k = floor(k * 4.0 + t) / 4.0;\n' +
    '    return uAccent * k;\n' +
    '  }\n' +
    '  c = mix(c, uBg, fog);\n' +
    '  if (uMode == 1) return c;\n' +
    '  c += (t - 0.5) * uSpread;\n' +
    '  vec3 best = uPal[0]; float bd = 1e9;\n' +
    '  for (int i = 0; i < 16; i++) {\n' +
    '    if (i >= uPalN) break;\n' +
    '    vec3 e = c - uPal[i]; float dd = dot(e, e);\n' +
    '    if (dd < bd) { bd = dd; best = uPal[i]; }\n' +
    '  }\n' +
    '  return best;\n' +
    '}\n';

  // Points. Alpha below 0.75 marks emissive points (lamps, beacons) that
  // ignore the night dimming. uAnim 1 = fountain: aPos.xz is a jet's reach,
  // aPos.y its phase, the drop flies a parabola over time.
  var PTS_VS = '#version 300 es\n' +
    'layout(location = 0) in vec3 aPos;\n' +
    'layout(location = 1) in vec4 aCol;\n' +
    'layout(location = 2) in float aSize;\n' +
    'uniform mat4 uModel, uView, uProj;\n' +
    'uniform float uFocal, uFogNear, uFogFar, uMaxPt, uLight, uTime, uAnim;\n' +
    'out vec3 vCol;\n' +
    'out float vFog;\n' +
    'void main() {\n' +
    '  vec3 p = aPos;\n' +
    '  if (uAnim > 0.5) {\n' +
    '    float ph = fract(aPos.y + uTime * 0.55), reach = length(aPos.xz);\n' +
    '    p = vec3(aPos.x * ph, 0.6 + (5.5 - reach) * 4.0 * ph * (1.0 - ph), aPos.z * ph);\n' +
    '  }\n' +
    '  vec4 v = uView * uModel * vec4(p, 1.0);\n' +
    '  gl_Position = uProj * v;\n' +
    '  gl_PointSize = clamp(2.0 * aSize * uFocal / max(-v.z, 1e-3), 1.0, uMaxPt);\n' +
    '  float em = aCol.a < 0.75 ? 1.0 : 0.0;\n' +
    '  vCol = aCol.rgb * mix(uLight, 1.15, em);\n' +
    '  vFog = smoothstep(uFogNear, uFogFar, -v.z) * (1.0 - 0.6 * em);\n' +
    '}\n';
  var PTS_FS = '#version 300 es\n' +
    'precision mediump float;\n' +
    'in vec3 vCol;\n' +
    'in float vFog;\n' + COLOR +
    'out vec4 o;\n' +
    'void main() { o = vec4(colorize(vCol, vFog), 1.0); }\n';

  var GROUND_VS = '#version 300 es\n' +
    'layout(location = 0) in vec2 aXZ;\n' +
    'uniform mat4 uView, uProj;\n' +
    'out vec2 vXZ;\n' +
    'out float vDist;\n' +
    'void main() {\n' +
    '  vec4 v = uView * vec4(aXZ.x, 0.0, aXZ.y, 1.0);\n' +
    '  gl_Position = uProj * v;\n' +
    '  vXZ = aXZ; vDist = -v.z;\n' +
    '}\n';
  var GROUND_FS = '#version 300 es\n' +
    'precision highp float;\n' +
    'in vec2 vXZ;\n' +
    'in float vDist;\n' +
    'uniform sampler2D uGround, uAlbedo;\n' +
    'uniform vec4 uFrame;\n' +            // x0, z0, width m, height m
    'uniform float uTime, uFogNear, uFogFar, uLight;\n' + COLOR +
    'out vec4 o;\n' +
    'float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }\n' +
    'void main() {\n' +
    '  vec2 uv = (vXZ - uFrame.xy) / uFrame.zw;\n' +
    '  int cat = int(texture(uGround, uv).r * 255.0 + 0.5) & 31;\n' +
    '  vec3 sat = floor(pow(texture(uAlbedo, uv).rgb, vec3(0.8)) * 1.2 * 10.0 + 0.5) / 10.0;\n' +   // dark, hazy imagery: brighten, posterize
    '  float near = 1.0 - smoothstep(12.0, 45.0, vDist);\n' +
    '  float h = mix(0.5, hash(floor(vXZ / 0.1)), near);\n' +
    '  float h2 = hash(floor(vXZ / 0.1) + 17.0);\n' +
    '  vec3 c = sat * (0.88 + 0.24 * h);\n' +
    '  if (cat == 11) c = mix(vec3(0.62, 0.60, 0.56), sat, 0.45) * (0.88 + 0.24 * h);\n' +
    '  if (cat == 2) {\n' +               // paving, like the scanned path
    '    c = vec3(0.74, 0.71, 0.66) * (0.86 + 0.22 * h);\n' +
    '    if (h2 > 0.975 && near > 0.0) c = mix(c, vec3(0.72, 0.50, 0.25), near);\n' +
    '  } else if (cat == 3) {\n' +        // park alleys: asphalt
    '    c = vec3(0.42, 0.42, 0.43) * (0.85 + 0.25 * h);\n' +
    '    if (h2 > 0.985 && near > 0.0) c = mix(c, vec3(0.75, 0.55, 0.25), near);\n' +
    '  } else if (cat == 4) {\n' +
    '    float w = sin(vXZ.x * 0.45 + uTime * 0.9) * sin(vXZ.y * 0.6 - uTime * 1.2);\n' +
    '    c = mix(vec3(0.17, 0.32, 0.30), sat, 0.35) + (w > 0.82 ? vec3(0.18) : vec3(0.0));\n' +
    '  } else if (cat == 8) {\n' +        // forest floor under the canopy, leaf litter
    '    c = mix(vec3(0.26, 0.25, 0.15), sat, 0.25) * (0.75 + 0.5 * h);\n' +
    '    if (h2 > 0.88 && near > 0.0) c = mix(c, h2 > 0.96 ? vec3(0.78, 0.55, 0.22) : vec3(0.52, 0.40, 0.20), near);\n' +
    '  } else if (cat == 1) {\n' +        // open lawn, a few fallen leaves
    '    c = mix(vec3(0.33, 0.50, 0.22), sat, 0.6) * (0.85 + 0.3 * h);\n' +
    '    if (h2 > 0.96 && near > 0.0) c = mix(c, vec3(0.80, 0.62, 0.25), near);\n' +
    '  } else if (cat == 7) c = mix(sat, vec3(0.25, 0.58, 0.28), 0.3) * (mod(floor(vXZ.x / 4.0), 2.0) > 0.5 ? 1.0 : 0.9);\n' +
    '  o = vec4(colorize(c * uLight, smoothstep(uFogNear, uFogFar, vDist)), 1.0);\n' +
    '}\n';

  function program(vs, fs, names) {
    function sh(type, src) {
      var s = gl.createShader(type);
      gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      return s;
    }
    var p = gl.createProgram();
    gl.attachShader(p, sh(gl.VERTEX_SHADER, vs));
    gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    var u = { prog: p };
    names.concat(['uMode', 'uPalN', 'uAccent', 'uBg', 'uPal', 'uDither', 'uSpread', 'uView', 'uProj', 'uFogNear', 'uFogFar', 'uLight', 'uTime'])
      .forEach(function (k) { u[k] = gl.getUniformLocation(p, k); });
    return u;
  }
  var P = program(PTS_VS, PTS_FS, ['uModel', 'uFocal', 'uMaxPt', 'uAnim']);
  var G = program(GROUND_VS, GROUND_FS, ['uGround', 'uAlbedo', 'uFrame']);

  // Point cloud under construction: position, RGBA, world size.
  function Cloud() { this.pos = []; this.col = []; this.size = []; }
  // The static world, cut into 64 m squares so only those within sight are
  // drawn: 3+ million points in one call is too much for a phone.
  var CHUNK = 64;
  function ChunkedCloud() { this.chunks = new Map(); }
  ChunkedCloud.prototype.add = function (x, y, z, c, s, emissive) {
    var k = Math.floor(x / CHUNK) + ',' + Math.floor(z / CHUNK), ch = this.chunks.get(k);
    if (!ch) { ch = new Cloud(); ch.cx = (Math.floor(x / CHUNK) + 0.5) * CHUNK; ch.cz = (Math.floor(z / CHUNK) + 0.5) * CHUNK; this.chunks.set(k, ch); }
    ch.add(x, y, z, c, s, emissive);
  };
  ChunkedCloud.prototype.upload = function () {
    var out = [], n = 0;
    this.chunks.forEach(function (ch) { var g = ch.upload(); g.cx = ch.cx; g.cz = ch.cz; out.push(g); n += g.n; });
    return { chunks: out, n: n };
  };
  Cloud.prototype.add = function (x, y, z, c, s, emissive) {
    this.pos.push(x, y, z);
    this.col.push(clamp255(c[0]), clamp255(c[1]), clamp255(c[2]), emissive ? 128 : 255);
    this.size.push(s);
  };
  Cloud.prototype.upload = function () {
    return cloudVAO(new Float32Array(this.pos), new Uint8Array(this.col), new Float32Array(this.size));
  };
  function clamp255(v) { return v < 0 ? 0 : v > 255 ? 255 : v; }
  function cloudVAO(pos, col, size) {
    var vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    [[pos, 3, gl.FLOAT, false], [col, 4, gl.UNSIGNED_BYTE, true], [size, 1, gl.FLOAT, false]].forEach(function (a, i) {
      gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
      gl.bufferData(gl.ARRAY_BUFFER, a[0], gl.STATIC_DRAW);
      gl.enableVertexAttribArray(i);
      gl.vertexAttribPointer(i, a[1], a[2], a[3], 0, 0);
    });
    gl.bindVertexArray(null);
    return { vao: vao, n: size.length };
  }

  // ------------------------------------------------------------ stroller ---

  // Cut the stroller out of the scan: find its body above the paving, take
  // the principal axis as its length, keep everything a few cm above the
  // fitted ground inside that box. Local frame: ground at y = 0, forward = -z.
  // Which end is the front was checked by eye: the handle is at the back.
  function extractStroller(c) {
    var i, xs = [], zs = [], ys = [];
    var step = Math.max(1, Math.floor(c.n / 60000));
    for (i = 0; i < c.n; i += step) {
      if (c.col[i * 4 + 3] < MIN_ALPHA * 255) continue;
      xs.push(c.pos[i * 3]); ys.push(c.pos[i * 3 + 1]); zs.push(c.pos[i * 3 + 2]);
    }
    var cx = pct(xs, 0.5), cz = pct(zs, 0.5), near = [];
    for (i = 0; i < xs.length; i++) if (Math.hypot(xs[i] - cx, zs[i] - cz) < 3) near.push(ys[i]);
    var ground = pct(near, 0.03);

    var bx = [], bz = [];
    for (i = 0; i < c.n; i++) {
      var x = c.pos[i * 3], y = c.pos[i * 3 + 1], z = c.pos[i * 3 + 2];
      if (y > ground + 0.3 && y < ground + 1.5 && Math.hypot(x - cx, z - cz) < 1.2 && c.col[i * 4 + 3] >= MIN_ALPHA * 255) { bx.push(x); bz.push(z); }
    }
    var mx = pct(bx, 0.5), mz = pct(bz, 0.5), sxx = 0, szz = 0, sxz = 0;
    for (i = 0; i < bx.length; i++) { var dx = bx[i] - mx, dz = bz[i] - mz; sxx += dx * dx; szz += dz * dz; sxz += dx * dz; }
    var ang = 0.5 * Math.atan2(2 * sxz, sxx - szz);         // major axis
    var ax = Math.cos(ang), az = Math.sin(ang);
    var along = [], across = [];
    for (i = 0; i < bx.length; i++) {
      along.push((bx[i] - mx) * ax + (bz[i] - mz) * az);
      across.push(-(bx[i] - mx) * az + (bz[i] - mz) * ax);
    }
    var a0 = pct(along, 0.01) - 0.1, a1 = pct(along, 0.99) + 0.1;
    var c0 = pct(across, 0.01) - 0.08, c1 = pct(across, 0.99) + 0.08;
    var midA = (a0 + a1) / 2, midC = (c0 + c1) / 2, sign = -1;
    var plane = groundPlane(c, mx, mz, ax, az, a0, a1, c0, c1, ground);
    function above(j) { return c.pos[j * 3 + 1] - (plane[0] * c.pos[j * 3] + plane[1] * c.pos[j * 3 + 2] + plane[2]); }

    var keep = [];
    for (i = 0; i < c.n; i++) {
      var y2 = above(i);
      if (y2 < 0.05 || y2 > 1.6 || c.col[i * 4 + 3] < MIN_ALPHA * 255) continue;
      var dx2 = c.pos[i * 3] - mx, dz2 = c.pos[i * 3 + 2] - mz;
      var al = dx2 * ax + dz2 * az, ac = -dx2 * az + dz2 * ax;
      if (al < a0 || al > a1 || ac < c0 || ac > c1) continue;
      keep.push(i);
    }
    var pos = new Float32Array(keep.length * 3), col = new Uint8Array(keep.length * 4), size = new Float32Array(keep.length);
    keep.forEach(function (j, k) {
      var dx3 = c.pos[j * 3] - mx, dz3 = c.pos[j * 3 + 2] - mz;
      var al3 = dx3 * ax + dz3 * az - midA, ac3 = -dx3 * az + dz3 * ax - midC;
      pos[k * 3] = ac3 * sign;
      pos[k * 3 + 1] = above(j) - 0.03;
      pos[k * 3 + 2] = -al3 * sign;
      col.set(c.col.subarray(j * 4, j * 4 + 3), k * 4);
      col[k * 4 + 3] = 255;
      size[k] = Math.min(c.size[j], 0.05);
    });
    return { pos: pos, col: col, size: size, length: a1 - a0, width: c1 - c0 };
  }

  // The scanned paving is not level: fit y = a x + b z + c to the lowest
  // splats in 0.2 m cells of a ring around the stroller, dropping cells on
  // the curb or grass after the first pass.
  function groundPlane(c, mx, mz, ax, az, a0, a1, c0, c1, ground) {
    var cells = new Map();
    for (var i = 0; i < c.n; i++) {
      var y = c.pos[i * 3 + 1];
      if (y > ground + 0.25 || c.col[i * 4 + 3] < MIN_ALPHA * 255) continue;
      var dx = c.pos[i * 3] - mx, dz = c.pos[i * 3 + 2] - mz;
      var al = dx * ax + dz * az, ac = -dx * az + dz * ax;
      if (al < a0 - 0.6 || al > a1 + 0.6 || ac < c0 - 0.6 || ac > c1 + 0.6) continue;
      if (al > a0 && al < a1 && ac > c0 && ac < c1) continue;
      var k = Math.floor(c.pos[i * 3] / 0.2) + ',' + Math.floor(c.pos[i * 3 + 2] / 0.2);
      if (!cells.has(k)) cells.set(k, []);
      cells.get(k).push(i);
    }
    var pts = [];
    cells.forEach(function (list) {
      if (list.length < 4) return;
      var j0 = list[0];
      pts.push([c.pos[j0 * 3], c.pos[j0 * 3 + 2], pct(list.map(function (j) { return c.pos[j * 3 + 1]; }), 0.3)]);
    });
    var pl = [0, 0, ground];
    for (var pass = 0; pass < 3; pass++) {
      var use = pass === 0 ? pts : pts.filter(function (p) { return Math.abs(p[2] - (pl[0] * p[0] + pl[1] * p[1] + pl[2])) < 0.03; });
      if (use.length < 10) break;
      pl = fitPlane(use);
    }
    return pl;
  }
  function fitPlane(p) {   // least squares y = a x + b z + c
    var sx = 0, sz = 0, sy = 0, sxx = 0, szz = 0, sxz = 0, sxy = 0, szy = 0, n = p.length, i, j, k;
    p.forEach(function (q) { sx += q[0]; sz += q[1]; sy += q[2]; sxx += q[0] * q[0]; szz += q[1] * q[1]; sxz += q[0] * q[1]; sxy += q[0] * q[2]; szy += q[1] * q[2]; });
    var m = [[sxx, sxz, sx], [sxz, szz, sz], [sx, sz, n]], r = [sxy, szy, sy];
    for (i = 0; i < 3; i++) for (k = i + 1; k < 3; k++) { var f = m[k][i] / m[i][i]; for (j = i; j < 3; j++) m[k][j] -= f * m[i][j]; r[k] -= f * r[i]; }
    var x = [0, 0, 0];
    for (i = 2; i >= 0; i--) { var s = r[i]; for (j = i + 1; j < 3; j++) s -= m[i][j] * x[j]; x[i] = s / m[i][i]; }
    return x;
  }
  function pct(a, p) { var s = Float64Array.from(a).sort(); return s[Math.floor(p * (s.length - 1))]; }

  // --------------------------------------------------------------- world ---

  function rng(seed) {
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function hexRGB(h) { return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; }
  function mul(c, k) { return [c[0] * k, c[1] * k, c[2] * k]; }
  var BRIGHT = ['e4342a', 'f2c12e', '2f6bd8', '2f8f4e', 'd81b7a', 'f28c28', 'f4f1e8', '29adff'].map(hexRGB);

  // October in Krasnodar: mostly green, some yellowing, a few orange.
  var CROWNS = [[[58, 98, 40], 0.5], [[74, 112, 46], 0.22], [[140, 140, 56], 0.16], [[186, 116, 46], 0.12]];
  function tree(cl, r, x, z, h, cr, trunkR) {
    var trunkTop = h * 0.38, tr = trunkR || 0.13;
    for (var y = 0; y < trunkTop; y += 0.2) {
      for (var k = 0; k < (tr > 0.3 ? 4 : 1); k++) {
        var a = r() * 6.28;
        cl.add(x + Math.cos(a) * tr * 0.6, y, z + Math.sin(a) * tr * 0.6, [86, 64, 46], tr, false);
      }
    }
    var pick = r(), acc = 0, base = CROWNS[0][0];
    for (var i = 0; i < CROWNS.length; i++) { acc += CROWNS[i][1]; if (pick < acc) { base = CROWNS[i][0]; break; } }
    var cy = trunkTop + (h - trunkTop) * 0.5, ry = (h - trunkTop) * 0.55;
    var n = Math.round(50 + cr * 16);
    for (var j = 0; j < n; j++) {
      // uniform direction, radius biased to the surface
      var u = r() * 2 - 1, th = r() * 6.2832, s = Math.sqrt(1 - u * u), rad = 0.55 + 0.45 * Math.cbrt(r());
      var dx = s * Math.cos(th) * rad, dy = u * rad, dz = s * Math.sin(th) * rad;
      var shade = (0.68 + 0.45 * (dy * 0.5 + 0.5)) * (0.85 + 0.3 * r());   // lighter on top
      cl.add(x + dx * cr, cy + dy * ry, z + dz * cr, mul(base, shade), 0.45 + r() * 0.45, false);
    }
  }

  function buildWorld(park) {
    var r = rng(11), cl = new ChunkedCloud();
    park.trees.forEach(function (t) { tree(cl, r, t[0], t[1], t[2], t[3]); });

    // Buildings: walls with a plinth and windows, flat roof; the planetarium
    // gets its dome.
    var WALLS = [[214, 200, 176], [190, 176, 160], [222, 216, 204], [176, 150, 120], [200, 190, 200]], ROOFS = [[120, 70, 60], [90, 90, 96], [140, 100, 80]];
    park.buildings.forEach(function (b) {
      var p = b.pts, h = b.h, wall = WALLS[Math.floor(r() * WALLS.length)], roof = ROOFS[Math.floor(r() * ROOFS.length)];
      if (p.length < 3) return;
      for (var i = 0; i < p.length; i++) {
        var a = p[i], c = p[(i + 1) % p.length], L = Math.hypot(c[0] - a[0], c[1] - a[1]);
        for (var s = 0; s <= L; s += 0.5) {
          var f = s / Math.max(L, 1e-6), x = a[0] + (c[0] - a[0]) * f, z = a[1] + (c[1] - a[1]) * f;
          for (var y = 0.25; y < h; y += 0.5) {
            var band = y < 0.8 ? 0.7 : (Math.floor(y / 1.6) % 2 === 1 && (s % 2.4) < 1.0 && y > 1.2 ? 0.45 : 1);
            cl.add(x, y, z, mul(wall, band), 0.36, false);
          }
        }
      }
      var bb = bbox(p);
      if (b.dome) {
        var cx = (bb[0] + bb[2]) / 2, cz = (bb[1] + bb[3]) / 2, R = Math.min(bb[2] - bb[0], bb[3] - bb[1]) / 2;
        for (var k = 0; k < 2600; k++) {
          var u2 = r(), th2 = r() * 6.2832, sn = Math.sqrt(1 - u2 * u2);
          cl.add(cx + Math.cos(th2) * sn * R, h + u2 * R * 0.9, cz + Math.sin(th2) * sn * R, mul([150, 170, 200], 0.8 + 0.3 * u2), 0.5, false);
        }
      } else {
        for (var gx = bb[0]; gx <= bb[2]; gx += 0.7) for (var gz = bb[1]; gz <= bb[3]; gz += 0.7) if (inside(p, gx, gz)) cl.add(gx, h, gz, roof, 0.45, false);
      }
    });

    park.rides.forEach(function (ride) { if (ride.name !== 'Круговой обзор') buildRide(cl, r, ride); });
    park.fences.forEach(function (f) {
      polyline(f.pts, 0.3, function (x, z, s) {
        var post = (s % 2.5) < 0.3;
        for (var y = 0.15; y < f.h; y += post ? 0.15 : 0.45) cl.add(x, y, z, post ? [70, 70, 64] : [96, 112, 92], post ? 0.12 : 0.08, false);
      });
    });
    park.bridges.forEach(function (b) {
      var p = b.pts;
      for (var side = -1; side <= 1; side += 2) {
        var off = [];
        for (var i = 0; i < p.length; i++) {
          var a = p[Math.max(0, i - 1)], c = p[Math.min(p.length - 1, i + 1)], L = Math.hypot(c[0] - a[0], c[1] - a[1]) || 1;
          off.push([p[i][0] - (c[1] - a[1]) / L * b.w / 2 * side, p[i][1] + (c[0] - a[0]) / L * b.w / 2 * side]);
        }
        polyline(off, 0.15, function (x, z, s) {
          cl.add(x, 1.05, z, [200, 200, 205], 0.08, false); cl.add(x, 0.55, z, [160, 160, 165], 0.06, false);
          if (s % 2 < 0.15) for (var y = 0; y < 1.05; y += 0.12) cl.add(x, y, z, [120, 120, 125], 0.07, false);
        });
      }
    });
    park.props.forEach(function (p) {
      var kind = p[0], x = p[1], z = p[2], ang = p[3], ux = Math.sin(ang), uz = -Math.cos(ang), y;
      if (kind === 'lamp') {
        for (y = 0; y < 4; y += 0.12) cl.add(x, y, z, [52, 52, 56], 0.07, false);
        cl.add(x, 4.1, z, [255, 226, 160], 0.32, true);
        cl.add(x, 3.95, z, [255, 210, 130], 0.22, true);
      } else {
        for (var s = -0.8; s <= 0.8; s += 0.08) {
          cl.add(x + ux * s, 0.45, z + uz * s, [130, 88, 52], 0.07, false);
          cl.add(x + ux * s - uz * 0.18, 0.75, z + uz * s + ux * 0.18, [120, 80, 48], 0.07, false);
          if (Math.abs(Math.abs(s) - 0.7) < 0.05) for (y = 0; y < 0.45; y += 0.08) cl.add(x + ux * s, y, z + uz * s, [40, 40, 42], 0.05, false);
        }
      }
    });
    park.landmarks.forEach(function (lm) { buildLandmark(cl, r, lm); });
    return cl.upload();
  }

  function bbox(p) {
    var b = [1e9, 1e9, -1e9, -1e9];
    p.forEach(function (q) { b[0] = Math.min(b[0], q[0]); b[1] = Math.min(b[1], q[1]); b[2] = Math.max(b[2], q[0]); b[3] = Math.max(b[3], q[1]); });
    return b;
  }
  function inside(p, x, z) {
    var c = false;
    for (var i = 0, j = p.length - 1; i < p.length; j = i++) {
      if ((p[i][1] > z) !== (p[j][1] > z) && x < (p[j][0] - p[i][0]) * (z - p[i][1]) / (p[j][1] - p[i][1]) + p[i][0]) c = !c;
    }
    return c;
  }
  // Walk a polyline at a fixed spacing: fn(x, z, distance along).
  function polyline(p, step, fn) {
    var acc = 0;
    for (var i = 0; i + 1 < p.length; i++) {
      var a = p[i], c = p[i + 1], L = Math.hypot(c[0] - a[0], c[1] - a[1]);
      for (var s = 0; s < L; s += step) fn(a[0] + (c[0] - a[0]) * s / L, a[1] + (c[1] - a[1]) * s / L, acc + s);
      acc += L;
    }
  }

  // Rides from their OSM footprints: round ones become carousels, the roller
  // coaster a looping track on posts, the rest a striped canopy on a deck.
  function buildRide(cl, r, ride) {
    var p = ride.pts, n = p.length, i, s, y;
    var cx = 0, cz = 0, area = 0;
    for (i = 0; i < n; i++) { cx += p[i][0]; cz += p[i][1]; var q = p[(i + 1) % n]; area += p[i][0] * q[1] - q[0] * p[i][1]; }
    cx /= n; cz /= n; area = Math.abs(area) / 2;
    var rad = 0; for (i = 0; i < n; i++) rad += Math.hypot(p[i][0] - cx, p[i][1] - cz); rad /= n;
    var c1 = BRIGHT[Math.floor(r() * BRIGHT.length)], c2 = BRIGHT[Math.floor(r() * BRIGHT.length)];
    if (ride.kind === 'coaster') {
      var ring = p.concat([p[0]]).map(function (q) { var d = Math.hypot(q[0] - cx, q[1] - cz) || 1, k = Math.max(0, d - 2.5) / d; return [cx + (q[0] - cx) * k, cz + (q[1] - cz) * k]; });
      polyline(ring, 0.25, function (x, z, d) {
        var ht = 3 + 5 * (0.5 + 0.5 * Math.sin(d * 2 * Math.PI / 38)) + 2.5 * Math.pow(Math.sin(d * 2 * Math.PI / 13), 2);
        cl.add(x, ht, z, [228, 52, 42], 0.22, false);
        cl.add(x, ht + 0.25, z, [240, 240, 240], 0.1, false);
        if (d % 3 < 0.25) for (y = 0; y < ht; y += 0.3) cl.add(x, y, z, [235, 235, 230], 0.1, false);
      });
      return;
    }
    if (area / (Math.PI * rad * rad) > 0.7) {                     // carousel
      var R = Math.max(1.5, Math.min(rad, 14)), hs = Math.min(3, 1.5 + R * 0.2), hr = hs + R * 0.55;
      for (var a = 0; a < 6.283; a += 0.25 / R) {
        var stripe = Math.floor(a / 6.283 * 16) % 2 ? c1 : c2;
        for (y = 0.2; y < hs; y += 0.35) cl.add(cx + Math.cos(a) * R, y, cz + Math.sin(a) * R, y > hs - 0.5 ? [240, 236, 220] : mul(stripe, 0.8), 0.25, false);
        for (s = 0; s < 1; s += 0.3 / R) cl.add(cx + Math.cos(a) * R * (1 - s), hs + (hr - hs) * s, cz + Math.sin(a) * R * (1 - s), stripe, 0.3, false);
      }
      for (y = hr; y < hr + 1; y += 0.15) cl.add(cx, y, cz, [244, 241, 232], 0.15, false);
      return;
    }
    var bb = bbox(p), roofH = 3.5 + r() * 2;                      // deck + striped canopy
    for (var gx = bb[0]; gx <= bb[2]; gx += 0.7) for (var gz = bb[1]; gz <= bb[3]; gz += 0.7) {
      if (!inside(p, gx, gz)) continue;
      cl.add(gx, 0.25, gz, mul(c1, 0.55), 0.4, false);
      cl.add(gx, roofH, gz, Math.floor((gx - bb[0]) / 1.4) % 2 ? c2 : [244, 241, 232], 0.45, false);
      if (r() < 0.03) for (y = 0.3; y < 1.4; y += 0.3) cl.add(gx, y, gz, BRIGHT[Math.floor(r() * BRIGHT.length)], 0.5, false);
    }
    polyline(p.concat([p[0]]), 0.3, function (x, z, d) {
      cl.add(x, 0.9, z, [235, 235, 230], 0.08, false);
      if (d % 4 < 0.3) for (y = 0; y < roofH; y += 0.2) cl.add(x, y, z, [210, 210, 210], 0.1, false);
    });
  }

  function buildLandmark(cl, r, lm) {
    var x = lm.at[0], z = lm.at[1], y, a, k;
    if (lm.kind === 'fountain') {
      for (a = 0; a < 6.283; a += 0.04) for (y = 0; y < 0.6; y += 0.15) cl.add(x + Math.cos(a) * 4, y, z + Math.sin(a) * 4, [170, 165, 155], 0.15, false);
      for (k = 0; k < 900; k++) { var rr = Math.sqrt(r()) * 3.9, t = r() * 6.283; cl.add(x + Math.cos(t) * rr, 0.45, z + Math.sin(t) * rr, [90, 150, 170], 0.25, false); }
    } else if (lm.kind === 'monument') {
      for (var gx = -1.5; gx <= 1.5; gx += 0.2) for (var gz = -1.5; gz <= 1.5; gz += 0.2) for (y = 0; y < 1.2; y += 0.3) cl.add(x + gx, y, z + gz, [120, 110, 105], 0.2, false);
      for (y = 1.2; y < 7; y += 0.15) for (a = 0; a < 6.283; a += 0.6) cl.add(x + Math.cos(a) * 0.45 * (1 - (y - 1.2) / 8), y, z + Math.sin(a) * 0.45 * (1 - (y - 1.2) / 8), [140, 128, 110], 0.15, false);
    } else if (lm.kind === 'oak') {
      tree(cl, r, x, z, 24, 10, 0.8);
      tree(cl, r, x + 2, z - 1, 20, 8, 0.4);
    } else if (lm.kind === 'pier') {
      var best = 0, bestScore = -1;
      for (a = 0; a < 6.283; a += 0.2) {                 // face the open water
        var sc = 0; for (k = 2; k < 14; k += 2) if ((catRaw(x + Math.sin(a) * k, z - Math.cos(a) * k) & 31) === WATER) sc++;
        if (sc > bestScore) { bestScore = sc; best = a; }
      }
      var ux = Math.sin(best), uz = -Math.cos(best);
      for (var s = -1; s < 10; s += 0.3) for (var w = -1.5; w <= 1.5; w += 0.3) cl.add(x + ux * s - uz * w, 0.35, z + uz * s + ux * w, (Math.floor(s / 0.6) % 2) ? [150, 110, 70] : [130, 92, 58], 0.2, false);
    }
  }

  // The Ferris wheel turns, so it gets its own cloud and a model matrix.
  function buildWheel(lm, r) {
    var R = lm.d / 2, frame = new Cloud(), wheel = new Cloud(), a, y, k;
    for (var side = -1; side <= 1; side += 2) {
      for (y = 0; y < R + 2; y += 0.25) {                         // A-frame legs
        var spread = (R + 2 - y) * 0.35;
        frame.add(-spread, y, side * 2.2, [210, 210, 215], 0.2, false);
        frame.add(spread, y, side * 2.2, [210, 210, 215], 0.2, false);
      }
      for (a = 0; a < 6.283; a += 0.3 / R) wheel.add(Math.cos(a) * R, Math.sin(a) * R, side * 1.2, [235, 235, 240], 0.18, false);
      for (k = 0; k < 16; k++) { var t = k / 16 * 6.283; for (var s = 0; s < R; s += 0.4) wheel.add(Math.cos(t) * s, Math.sin(t) * s, side * 1.2, [200, 200, 205], 0.1, false); }
    }
    for (k = 0; k < 24; k++) {
      var tt = k / 24 * 6.283, cc = BRIGHT[k % BRIGHT.length];
      for (var j = 0; j < 40; j++) {
        var u = r() * 2 - 1, th = r() * 6.283, sn = Math.sqrt(1 - u * u);
        wheel.add(Math.cos(tt) * R + Math.cos(th) * sn * 1.1, Math.sin(tt) * R + u * 1.1, Math.sin(th) * sn * 1.1, cc, 0.35, false);
      }
      wheel.add(Math.cos(tt) * R, Math.sin(tt) * R, 0, [255, 230, 160], 0.25, true);
    }
    for (a = 0; a < 6.283; a += 0.5) wheel.add(Math.cos(a) * 0.8, Math.sin(a) * 0.8, 0, [240, 240, 240], 0.4, false);
    return { frame: frame.upload(), wheel: wheel.upload(), x: lm.at[0], z: lm.at[1], hub: R + 2, yaw: 0.55 };
  }
  function buildFountainJets(lm, r) {
    var cl = new Cloud();
    for (var k = 0; k < 1400; k++) {
      var reach = k < 300 ? r() * 0.4 : 1.2 + r() * 2.4, a = r() * 6.283;
      cl.add(Math.cos(a) * reach, r(), Math.sin(a) * reach, [200, 225, 240], 0.11, false);
    }
    return { cloud: cl.upload(), x: lm.at[0], z: lm.at[1] };
  }

  // A milk bottle, 0.5 m tall so it reads from a distance, with a light
  // beacon above it that shows through the trees.
  function buildBottle() {
    var cl = new Cloud(), y, a;
    for (y = 0; y < 0.5; y += 0.02) {
      var rad = y < 0.34 ? 0.11 : y < 0.4 ? 0.11 - (y - 0.34) * 1.1 : 0.045;
      var c = y < 0.4 ? [246, 244, 236] : y < 0.43 ? [230, 230, 235] : [64, 130, 220];
      if (y > 0.08 && y < 0.24) c = [80, 150, 230];              // label
      for (a = 0; a < 6.283; a += 0.02 / rad) cl.add(Math.cos(a) * rad, y, Math.sin(a) * rad, c, 0.025, false);
    }
    for (y = 0.8; y < 9; y += 0.22) cl.add(0, y, 0, [235, 245, 255], 0.09 + (9 - y) * 0.004, true);
    return cl.upload();
  }

  // Tree trunks for collisions, bucketed by 8 m cells.
  var trunkGrid = new Map();
  function indexTrunks(trees) {
    trees.forEach(function (t) {
      var k = Math.floor(t[0] / 8) + ',' + Math.floor(t[1] / 8);
      if (!trunkGrid.has(k)) trunkGrid.set(k, []);
      trunkGrid.get(k).push(t);
    });
  }
  function nearTrunk(x, z, rad) {
    var gx = Math.floor(x / 8), gz = Math.floor(z / 8);
    for (var a = -1; a <= 1; a++) for (var b = -1; b <= 1; b++) {
      var list = trunkGrid.get((gx + a) + ',' + (gz + b));
      if (list) for (var i = 0; i < list.length; i++) if (Math.hypot(list[i][0] - x, list[i][1] - z) < rad) return true;
    }
    return false;
  }

  var park = null, cats = null, groundTex = null, albedoTex = null, groundVAO = null, world = null, stroller = null;
  var ferris = null, jets = null, bottleGPU = null;
  var capturedScans = [];
  var pigeons = { groups: [], birds: [] }, pigeonGPU = null, wingGPU = null, nextCoo = 5;
  var mallards = { groups: [], ducks: [], coots: [], birds: [] }, duckGPU = [], duckTime = 0, nextQuack = 4, nextCoot = 10;

  function buildMallards() {
    mallards = Mallards.create(park, catAt, rng(83));
    duckGPU = [{male: false}, {male: true}, {kind: 'coot'}, {kind: 'shelduck', male: true}, {kind: 'shelduck', male: false}].map(function (bird) {
      var cl = new Cloud();
      Mallards.shape(bird.male, function (x, y, z, c, s, em) { cl.add(x, y, z, c, s, em); }, bird.kind);
      return cl.upload();
    });
    Mallards.update(mallards.birds, 0);
  }

  function buildPigeons() {
    pigeons = Pigeons.create(park, function (x, z) {
      return [PATH, PLAZA].indexOf(catAt(x, z)) >= 0 && !nearTrunk(x, z, 0.6) && !blockedAt(x, z, 0);
    }, rng(251));
    var body = new Cloud(), wing = new Cloud();
    Pigeons.shape(function (x, y, z, c, s, em) { body.add(x, y, z, c, s, em); }, false);
    Pigeons.shape(function (x, y, z, c, s, em) { wing.add(x, y, z, c, s, em); }, true);
    pigeonGPU = body.upload(); wingGPU = wing.upload();
  }

  function duckTick(dt) {
    duckTime += dt;
    Mallards.update(mallards.birds, dt);
    var playing = game.mode === 'play' || game.mode === 'free';
    if (duckGain) duckGain.gain.value = state.sound && playing ? 1 : 0;
    if (!playing || !state.sound || !actx || actx.state !== 'running') return;
    function callNearby(birds) {
      var nearby = birds.filter(function (d) { return Math.hypot(d.x - car.x, d.z - car.z) < 32; });
      if (!nearby.length) return false;
      quack(nearby[Math.floor(Math.random() * nearby.length)]);
      return true;
    }
    nextQuack -= dt; nextCoot -= dt;
    if (nextQuack <= 0) nextQuack = callNearby(mallards.ducks) ? 7 + Math.random() * 8 : 2;
    if (nextCoot <= 0) nextCoot = callNearby(mallards.coots) ? 18 + Math.random() * 16 : 3;
    nextCoo -= dt;
    if (nextCoo <= 0) {
      var grounded = pigeons.birds.filter(function (d) { return !d.flight && Math.hypot(d.x - car.x, d.z - car.z) < 28; });
      nextCoo = grounded.length ? 8 + Math.random() * 10 : 2;
      if (grounded.length) cooSound(grounded[Math.floor(Math.random() * grounded.length)]);
    }
  }
  function catRaw(x, z) {
    var j = Math.floor((x - park.x0) / park.mpp), i = Math.floor((z - park.z0) / park.mpp);
    if (i < 0 || j < 0 || i >= park.h || j >= park.w) return WATER;    // edge of the map
    return cats[i * park.w + j];
  }
  function catAt(x, z) { return catRaw(x, z) & 31; }

  function loadImage(url) {
    return new Promise(function (res, rej) { var im = new Image(); im.onload = function () { res(im); }; im.onerror = function () { rej(new Error(url)); }; im.src = url; });
  }

  // ---------------------------------------------------------------- math ---

  function perspective(fovy, aspect, near, far) {
    var f = 1 / Math.tan(fovy / 2), nf = 1 / (near - far);
    return [f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) * nf, -1, 0, 0, 2 * far * near * nf, 0];
  }
  function lookAt(e, t) {
    var z = norm([e[0] - t[0], e[1] - t[1], e[2] - t[2]]);
    var x = norm(cross([0, 1, 0], z)), y = cross(z, x);
    return [x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -dot(x, e), -dot(y, e), -dot(z, e), 1];
  }
  function norm(v) { var l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; }
  function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
  function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
  function hex(h) { h = h.replace('#', ''); return [0, 2, 4].map(function (i) { return parseInt(h.substr(i, 2), 16) / 255; }); }
  function mat4mul(a, b) {
    var o = new Array(16);
    for (var c = 0; c < 4; c++) for (var r = 0; r < 4; r++) {
      o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
    }
    return o;
  }
  function yawMat(th, x, y, z) { var c = Math.cos(th), s = Math.sin(th); return [c, 0, s, 0, 0, 1, 0, 0, -s, 0, c, 0, x, y, z, 1]; }
  function rollMat(th) { var c = Math.cos(th), s = Math.sin(th); return [c, s, 0, 0, -s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]; }
  var IDENT = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

  // ---------------------------------------------------------- simulation ---

  var car = { x: 0, z: 0, heading: 0, v: 0, odo: 0, steer: 0, stamina: STAMINA };
  var cam = { yaw: 0, orbit: 0, pitch: 0.28, dist: 4.4, top: false, shake: 0, fov: FOV0 };
  var keys = {};
  var game = { mode: 'menu', milk: MILK_START, found: 0, time: 0, bottles: [], starveT: 0, lastTick: 0 };

  function respawn() {
    car.x = park.start[0]; car.z = park.start[1]; car.heading = park.start[2]; car.v = 0; car.steer = 0; car.stamina = STAMINA; car.odo = 0;
    cam.yaw = car.heading; cam.orbit = 0;
  }

  // The stroller is two circles (front and back wheels); a position is free
  // when neither touches a solid cell or a trunk.
  var RAD = 0.3;
  function blockedAt(x, z, h) {
    var off = stroller.length / 2 - RAD, sx = Math.sin(h), sz = -Math.cos(h);
    for (var e = -1; e <= 1; e += 2) {
      var cx = x + sx * off * e, cz = z + sz * off * e;
      if (SOLID[catAt(cx, cz)] || SOLID[catAt(cx + RAD, cz)] || SOLID[catAt(cx - RAD, cz)] || SOLID[catAt(cx, cz + RAD)] || SOLID[catAt(cx, cz - RAD)]) return true;
      if (nearTrunk(cx, cz, RAD + 0.25)) return true;
    }
    return false;
  }

  function physics(dt) {
    var starving = game.mode === 'play' && game.milk <= 0;
    var fwd = keys.up && !starving, back = keys.down && !starving;
    var steerIn = starving ? 0 : (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
    car.steer += (steerIn - car.steer) * Math.min(1, dt * 10);        // a hand on the handle, not a switch

    var surf = SURF[catAt(car.x, car.z)] || [0.6, 2.4];
    var turbo = keys.turbo && fwd && car.stamina > 0;
    if (turbo) car.stamina = Math.max(0, car.stamina - dt);
    else car.stamina = Math.min(STAMINA, car.stamina + REGEN * dt);
    var top = (turbo ? TURBO : RUN) * state.speedMul * surf[0];

    if (fwd && !back) {
      if (car.v < 0) car.v = Math.min(0, car.v + BRAKE * dt);
      else if (car.v < top) car.v = Math.min(top, car.v + PUSH * state.speedMul * (turbo ? 1.6 : 1) * dt * (1 - 0.6 * car.v / Math.max(top, 0.1)));
      else car.v = Math.max(top, car.v - surf[1] * 2 * dt);           // rolled onto grass
    } else if (back && !fwd) {
      if (car.v > 0) car.v = Math.max(0, car.v - BRAKE * dt);
      else car.v = Math.max(-REVERSE * state.speedMul, car.v - PUSH * dt);
    } else {
      var drag = surf[1] + 0.04 * car.v * car.v;
      car.v = car.v > 0 ? Math.max(0, car.v - drag * dt) : Math.min(0, car.v + drag * dt);
    }

    var sp = Math.abs(car.v);
    var rate = sp < 0.5 ? TURN_PIVOT : TURN_MAX * (1 - 0.35 * Math.min(1, Math.max(0, (sp - 4) / 3)));
    var dh = car.steer * rate * dt * (car.v < -0.05 ? -1 : 1);
    if (!blockedAt(car.x, car.z, car.heading + dh)) car.heading += dh;

    var sx = Math.sin(car.heading), sz = -Math.cos(car.heading);
    var mx = sx * car.v * dt, mz = sz * car.v * dt;
    if (!mx && !mz) return;
    if (!blockedAt(car.x + mx, car.z + mz, car.heading)) { car.x += mx; car.z += mz; car.odo += sp * dt; return; }
    // Slide along whatever we hit, losing the speed that went into it.
    var canX = !blockedAt(car.x + mx, car.z, car.heading), canZ = !blockedAt(car.x, car.z + mz, car.heading);
    var impact = sp;
    if (canX && (!canZ || Math.abs(mx) >= Math.abs(mz))) { car.x += mx; car.v *= Math.abs(sx) * 0.9 + 0.05; impact = sp * Math.abs(sz); }
    else if (canZ) { car.z += mz; car.v *= Math.abs(sz) * 0.9 + 0.05; impact = sp * Math.abs(sx); }
    else { car.v = -car.v * 0.2; }
    if (impact > 1.5) { cam.shake = Math.min(0.25, impact * 0.04); sfx('bump'); }
  }

  // --------------------------------------------------------------- bottles ---

  function spawnBottle() {
    var dmin = 25, dmax = Math.min(240, 90 + game.found * 15);
    for (var tries = 0; tries < 900; tries++) {
      var a = Math.random() * 6.283, d = dmin + Math.random() * (dmax - dmin);
      var x = car.x + Math.sin(a) * d, z = car.z - Math.cos(a) * d;
      var raw = catRaw(x, z), c = raw & 31;
      if (raw & UNREACHABLE || !(raw & IN_PARK)) continue;
      var onWay = c === PATH || c === ROAD || c === PLAZA;
      if (tries < 600 ? !onWay : !(onWay || c === LAWN || c === WOOD || c === PITCH)) continue;
      if (nearTrunk(x, z, 1.2) || blockedAt(x, z, 0)) continue;
      if (game.bottles.some(function (b) { return Math.hypot(b.x - x, b.z - z) < 30; })) continue;
      game.bottles.push({ x: x, z: z, phase: Math.random() * 6.283 });
      return true;
    }
    return false;
  }

  function startGame(mode) {
    respawn();
    game.mode = mode; game.milk = MILK_START; game.found = 0; game.time = 0; game.bottles = []; game.starveT = 0;
    if (mode === 'play') for (var i = 0; i < BOTTLES; i++) spawnBottle();
    document.body.classList.toggle('free', mode === 'free');
    $('overlay').classList.add('off');
    audio();
  }

  function gameOver() {
    game.mode = 'over';
    var best = readBest(), mins = Math.floor(game.time / 60), secs = Math.floor(game.time % 60);
    var record = game.found > best.found || (game.found === best.found && game.time > best.time);
    if (record) { best = { found: game.found, time: game.time }; try { localStorage.setItem('pixel-park-best', JSON.stringify(best)); } catch (e) { /* ok */ } }
    $('title').textContent = 'Малыш проголодался';
    $('body').innerHTML = '<p>Молоко кончилось, коляска остановилась.</p>';
    $('stats').innerHTML = 'Бутылочек: ' + game.found + ' · время: ' + mins + ':' + String(secs).padStart(2, '0') +
      ' · проехали ' + Math.round(car.odo) + ' м' + (record ? '<br>Новый рекорд!' : '<br><span class="dim">Рекорд: ' + best.found + ' бут.</span>');
    $('play').textContent = 'Ещё раз';
    $('overlay').classList.remove('off');
    sfx('over');
  }
  function readBest() { try { return JSON.parse(localStorage.getItem('pixel-park-best')) || { found: 0, time: 0 }; } catch (e) { return { found: 0, time: 0 }; } }

  function gameTick(dt) {
    if (game.mode !== 'play') return;
    game.time += dt;
    game.milk = Math.max(0, game.milk - dt);
    if (game.milk > 0 && game.milk < 10 && Math.floor(game.milk) !== game.lastTick) { game.lastTick = Math.floor(game.milk); sfx('tick'); }
    for (var i = game.bottles.length - 1; i >= 0; i--) {
      var b = game.bottles[i];
      if (Math.hypot(b.x - car.x, b.z - car.z) < 1.4) {
        game.bottles.splice(i, 1);
        game.found++;
        game.milk = Math.min(MILK_CAP, game.milk + MILK_PER_BOTTLE);
        pop('+' + MILK_PER_BOTTLE + ' с');
        sfx('pick');
        spawnBottle();
      }
    }
    while (game.bottles.length < BOTTLES && spawnBottle()) { /* top up */ }
    if (game.milk <= 0) {
      game.starveT += dt;
      if (game.starveT > 0.6 && Math.abs(car.v) < 0.05) gameOver();
    }
  }

  var popT = 0;
  function pop(text) { var el = $('pop'); el.textContent = text; el.style.opacity = '1'; el.style.top = '34%'; popT = performance.now(); }

  // ---------------------------------------------------------------- sound ---

  var actx = null, duckGain = null;
  function audio() {
    if (actx) { if (state.sound && actx.state === 'suspended') actx.resume(); return; }
    if (!state.sound) return;
    try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { actx = null; }
  }
  // Synthesized calls: a brighter multi-note female quack and a softer,
  // breathier drake rasp; coots have short, higher pitched calls. No recordings.
  function quack(d) {
    if (!actx || !state.sound || document.hidden) return;
    if (!duckGain) { duckGain = actx.createGain(); duckGain.connect(actx.destination); }
    duckGain.gain.value = 1;
    var coot = d.species === 'coot';
    var distance = Math.hypot(d.x - car.x, d.z - car.z);
    var volume = Math.pow(Math.max(0, 1 - distance / 32), 2) * (coot ? 0.11 : d.male ? 0.075 : 0.13);
    var angle = Math.atan2(d.x - car.x, -(d.z - car.z)) - cam.yaw - cam.orbit;
    var pan = actx.createStereoPanner(); pan.pan.value = Math.sin(angle); pan.connect(duckGain);
    var count = coot ? 1 + Math.floor(Math.random() * 2) : d.male ? 1 : 2 + Math.floor(Math.random() * 2);
    for (var i = 0; i < count; i++) {
      var t = actx.currentTime + i * 0.26, duration = coot ? 0.12 : d.male ? 0.24 : 0.18;
      var voice = actx.createOscillator(), filter = actx.createBiquadFilter(), gain = actx.createGain();
      voice.type = coot ? 'triangle' : 'sawtooth';
      voice.frequency.setValueAtTime(coot ? 950 : d.male ? 110 : 290 - i * 20, t);
      if (coot) voice.frequency.exponentialRampToValueAtTime(1450, t + 0.025);
      voice.frequency.exponentialRampToValueAtTime(coot ? 650 : d.male ? 72 : 160, t + duration);
      filter.type = 'bandpass'; filter.frequency.value = coot ? 1700 : d.male ? 850 : 1250; filter.Q.value = 1.4;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume * Math.pow(0.78, i)), t + 0.018);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
      var buffer = actx.createBuffer(1, Math.ceil(actx.sampleRate * duration), actx.sampleRate);
      var samples = buffer.getChannelData(0);
      for (var j = 0; j < samples.length; j++) samples[j] = (Math.random() * 2 - 1) * (coot ? 0.3 : d.male ? 0.65 : 0.18);
      var noise = actx.createBufferSource(); noise.buffer = buffer;
      voice.connect(filter); noise.connect(filter); filter.connect(gain); gain.connect(pan);
      voice.start(t); voice.stop(t + duration); noise.start(t);
      voice.onended = (function (v, n, f, g, last) { return function () {
        v.disconnect(); n.disconnect(); f.disconnect(); g.disconnect(); if (last) pan.disconnect();
      }; })(voice, noise, filter, gain, i === count - 1);
    }
  }
  function cooSound(d) {
    if (!actx || !state.sound || document.hidden) return;
    if (!duckGain) { duckGain = actx.createGain(); duckGain.connect(actx.destination); }
    var pan = actx.createStereoPanner();
    pan.pan.value = Math.sin(Math.atan2(d.x - car.x, -(d.z - car.z)) - cam.yaw - cam.orbit); pan.connect(duckGain);
    var volume = Math.pow(Math.max(0, 1 - Math.hypot(d.x - car.x, d.z - car.z) / 28), 2) * 0.09;
    [0, 0.18, 0.62].forEach(function (offset, i) {
      var t = actx.currentTime + offset, duration = [0.13, 0.38, 0.22][i];
      var voice = actx.createOscillator(), gain = actx.createGain();
      voice.type = 'sine'; voice.frequency.setValueAtTime([190, 280, 210][i], t);
      voice.frequency.exponentialRampToValueAtTime([175, 230, 180][i], t + duration);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), t + duration * 0.3);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
      voice.connect(gain); gain.connect(pan); voice.start(t); voice.stop(t + duration);
      voice.onended = function () { voice.disconnect(); gain.disconnect(); if (i === 2) pan.disconnect(); };
    });
  }
  function flapSound(group) {
    if (!actx || actx.state !== 'running' || !state.sound || document.hidden) return;
    if (!duckGain) { duckGain = actx.createGain(); duckGain.connect(actx.destination); }
    var distance = Math.hypot(group.x - car.x, group.z - car.z);
    var duration = group.size === 'solo' ? 0.55 : 0.9;
    var buffer = actx.createBuffer(1, Math.ceil(actx.sampleRate * duration), actx.sampleRate);
    var samples = buffer.getChannelData(0);
    for (var i = 0; i < samples.length; i++) {
      var t = i / actx.sampleRate, beat = Math.pow(Math.max(0, Math.sin(t * 46)), 2);
      samples[i] = (Math.random() * 2 - 1) * (0.15 + 0.85 * beat) * Math.pow(1 - t / duration, 0.6);
    }
    var source = actx.createBufferSource(), filter = actx.createBiquadFilter(), gain = actx.createGain(), pan = actx.createStereoPanner();
    source.buffer = buffer; filter.type = 'bandpass'; filter.frequency.value = 900; filter.Q.value = 0.5;
    gain.gain.value = Math.max(0, 1 - distance / 24) * (group.size === 'solo' ? 0.09 : 0.18);
    pan.pan.value = Math.sin(Math.atan2(group.x - car.x, -(group.z - car.z)) - cam.yaw - cam.orbit);
    source.connect(filter); filter.connect(gain); gain.connect(pan); pan.connect(duckGain); source.start();
    source.onended = function () { source.disconnect(); filter.disconnect(); gain.disconnect(); pan.disconnect(); };
  }
  document.addEventListener('visibilitychange', function () { if (document.hidden && duckGain) duckGain.gain.value = 0; });
  function beep(freq, at, dur, type, vol) {
    if (!actx || !state.sound) return;
    var t = actx.currentTime + at, o = actx.createOscillator(), g = actx.createGain();
    o.type = type || 'square'; o.frequency.value = freq;
    g.gain.setValueAtTime(vol || 0.06, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(actx.destination); o.start(t); o.stop(t + dur + 0.02);
  }
  function sfx(kind) {
    if (kind === 'pick') { beep(660, 0, 0.09); beep(990, 0.09, 0.14); }
    else if (kind === 'tick') beep(440, 0, 0.05, 'square', 0.04);
    else if (kind === 'bump') beep(90, 0, 0.08, 'sine', 0.15);
    else if (kind === 'over') { beep(520, 0, 0.2, 'triangle', 0.08); beep(390, 0.22, 0.2, 'triangle', 0.08); beep(260, 0.44, 0.5, 'triangle', 0.08); }
  }

  // ---------------------------------------------------------------- draw ---

  function place() {
    var w = stage.clientWidth, h = stage.clientHeight;
    canvas.width = Math.max(1, Math.ceil(w / state.pix));
    canvas.height = Math.max(1, Math.ceil(h / state.pix));
    gl.viewport(0, 0, canvas.width, canvas.height);
  }
  function colorUniforms(u) {
    var mode = state.palette === 'accent' ? 0 : state.palette === 'source' ? 1 : 2;
    gl.uniform1i(u.uMode, mode);
    gl.uniform3fv(u.uAccent, hex(state.accent));
    gl.uniform3fv(u.uBg, bgColor());
    if (mode === 2) {
      var pal = PALETTES[state.palette], flat = new Float32Array(48);
      pal.forEach(function (c, i) { flat.set(hex(c), i * 3); });
      gl.uniform3fv(u.uPal, flat);
      gl.uniform1i(u.uPalN, pal.length);
      gl.uniform1f(u.uSpread, state.dither ? SPREAD[state.palette] : 0);
    }
    gl.uniform1f(u.uDither, state.dither ? 1 : 0);
    gl.uniform1f(u.uLight, state.night ? 0.5 : 1);
  }
  function bgColor() { return state.night || state.palette === 'accent' ? [0x0a / 255, 0x0a / 255, 0x0a / 255] : [0.70, 0.78, 0.84]; }
  function clearColor() {
    var c = bgColor();
    if (state.palette === 'source' || state.palette === 'accent') return c;
    var pal = PALETTES[state.palette], best = c, bd = 1e9;   // the sky snaps to the palette too
    pal.forEach(function (h) { var p = hex(h), d = Math.pow(p[0] - c[0], 2) + Math.pow(p[1] - c[1], 2) + Math.pow(p[2] - c[2], 2); if (d < bd) { bd = d; best = p; } });
    return best;
  }

  var t0 = performance.now();
  function draw(now) {
    var time = (now - t0) / 1000;
    var sp = Math.abs(car.v);
    var bob = sp > 0.1 ? 0.012 * Math.sin(car.odo * 9) : 0;
    var model = yawMat(car.heading, car.x, bob, car.z);   // local -z (the front) along the heading

    var yaw = cam.yaw + cam.orbit, pitch = cam.top ? 1.2 : cam.pitch;
    var dist = cam.top ? Math.max(cam.dist * 8, 45) : cam.dist + Math.min(sp, 8) * 0.18;
    var fx = Math.sin(car.heading), fz = -Math.cos(car.heading);
    var look = cam.top ? 0 : Math.min(sp, 8) * 0.25;
    var tgt = [car.x + fx * look, 0.6, car.z + fz * look];
    var cfx = Math.sin(yaw), cfz = -Math.cos(yaw), cp = Math.cos(pitch);
    var sh = cam.shake;
    var eye = [tgt[0] - cfx * dist * cp + (Math.random() - 0.5) * sh, Math.max(0.3, tgt[1] + dist * Math.sin(pitch)) + (Math.random() - 0.5) * sh, tgt[2] - cfz * dist * cp];
    var view = lookAt(eye, tgt);
    var fogFar = state.night ? 70 : 150, fogNear = state.night ? 10 : 30;
    if (cam.top) { fogFar *= 2; fogNear *= 2; }
    var fov = cam.fov;
    var proj = perspective(fov, canvas.width / canvas.height, 0.08, fogFar + 30);
    var focal = canvas.height / 2 / Math.tan(fov / 2);

    var cc = clearColor();
    gl.clearColor(cc[0], cc[1], cc[2], 1);
    gl.enable(gl.DEPTH_TEST);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.useProgram(G.prog);
    colorUniforms(G);
    gl.uniformMatrix4fv(G.uView, false, view);
    gl.uniformMatrix4fv(G.uProj, false, proj);
    gl.uniform4f(G.uFrame, park.x0, park.z0, park.w * park.mpp, park.h * park.mpp);
    gl.uniform1f(G.uTime, time);
    gl.uniform1f(G.uFogNear, fogNear); gl.uniform1f(G.uFogFar, fogFar);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, groundTex); gl.uniform1i(G.uGround, 0);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, albedoTex); gl.uniform1i(G.uAlbedo, 1);
    gl.bindVertexArray(groundVAO);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    gl.useProgram(P.prog);
    colorUniforms(P);
    gl.uniformMatrix4fv(P.uView, false, view);
    gl.uniformMatrix4fv(P.uProj, false, proj);
    gl.uniform1f(P.uFocal, focal);
    gl.uniform1f(P.uTime, time);
    gl.uniform1f(P.uAnim, 0);
    gl.uniform1f(P.uFogNear, fogNear); gl.uniform1f(P.uFogFar, fogFar);
    function drawCloud(c, m, maxPt) {
      gl.uniform1f(P.uMaxPt, maxPt);
      gl.uniformMatrix4fv(P.uModel, false, m);
      gl.bindVertexArray(c.vao);
      gl.drawArrays(gl.POINTS, 0, c.n);
    }
    var reach = fogFar + CHUNK * 0.75, drawn = 0;
    gl.uniform1f(P.uMaxPt, 48);
    gl.uniformMatrix4fv(P.uModel, false, IDENT);
    world.chunks.forEach(function (ch) {
      var dx = ch.cx - eye[0], dz = ch.cz - eye[2];
      if (dx * dx + dz * dz > reach * reach) return;
      if ((dx * cfx + dz * cfz) < -CHUNK && !cam.top) return;          // behind the camera
      gl.bindVertexArray(ch.vao); gl.drawArrays(gl.POINTS, 0, ch.n); drawn += ch.n;
    });
    capturedScans.forEach(function (scan) {
      var dx = scan.at[0] - eye[0], dz = scan.at[1] - eye[2];
      if (dx * dx + dz * dz < reach * reach) { drawCloud(scan.gpu, IDENT, 8); drawn += scan.gpu.n; }
    });
    window.__stats.drawnPoints = drawn;
    mallards.birds.forEach(function (d) {
      if (Math.hypot(d.x - eye[0], d.z - eye[2]) > fogFar) return;
      drawCloud(duckGPU[d.species === 'shelduck' ? (d.male ? 3 : 4) : d.species === 'coot' ? 2 : d.male ? 1 : 0], yawMat(d.heading, d.x, 0.012 * Math.sin(duckTime * 2 + d.phase), d.z), 12);
    });
    pigeons.birds.forEach(function (d) {
      if (Math.hypot(d.x - eye[0], d.z - eye[2]) > fogFar) return;
      var base = yawMat(d.heading, d.x, d.y + (!d.flight && d.walk ? 0.008 * Math.sin(duckTime * 14 + d.phase) : 0), d.z);
      drawCloud(pigeonGPU, base, 10);
      if (d.flight && d.flight.t > 0) {
        var angle = Math.sin(duckTime * 34 + d.phase) * 0.95, c = Math.cos(angle), s = Math.sin(angle);
        [-1, 1].forEach(function (side) {
          var wing = [side * c, s, 0, 0, -side * s, c, 0, 0, 0, 0, 1, 0, side * 0.08, 0.22, 0, 1];
          drawCloud(wingGPU, mat4mul(base, wing), 10);
        });
      }
    });
    if (ferris) {
      var base = yawMat(ferris.yaw, ferris.x, 0, ferris.z);
      drawCloud(ferris.frame, base, 48);
      drawCloud(ferris.wheel, mat4mul(mat4mul(base, [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, ferris.hub, 0, 1]), rollMat(time * 0.05)), 48);
    }
    if (jets) { gl.uniform1f(P.uAnim, 1); drawCloud(jets.cloud, [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, jets.x, 0, jets.z, 1], 8); gl.uniform1f(P.uAnim, 0); }
    game.bottles.forEach(function (b) {
      drawCloud(bottleGPU, yawMat(time * 1.5 + b.phase, b.x, 0.08 + 0.06 * Math.sin(time * 3 + b.phase), b.z), 10);
    });
    drawCloud(stroller.gpu, model, 6);
    gl.bindVertexArray(null);
  }

  // ---------------------------------------------------------------- loop ---

  var last = 0, acc = 0, fpsFrames = 0, fpsSince = 0;
  window.__stats = { fps: 0 };
  var debugEl = null, debugAt = 0;
  if (new URLSearchParams(location.search).get('debug') === '1') {
    debugEl = document.createElement('pre'); debugEl.style.cssText = 'position:fixed;top:70px;left:16px;background:#000c;color:white;padding:10px;font:12px monospace;pointer-events:none;z-index:20';
    document.body.appendChild(debugEl);
  }
  function frame(now) {
    requestAnimationFrame(frame);
    if (document.hidden) { last = 0; return; }
    var dt = last ? Math.min((now - last) / 1000, 0.1) : 0;
    last = now;
    if (game.mode === 'play' || game.mode === 'free') {
      acc += dt;
      while (acc >= STEP) { physics(STEP); acc -= STEP; }
      gameTick(dt);
    } else {
      cam.orbit += dt * 0.15;                     // menu: slow turn around the stroller
    }
    // chase camera: critically damped follow, a look-around drag eases back while driving
    var dy = car.heading - cam.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    cam.yaw += dy * Math.min(1, dt * 4);
    if (!drag && Math.abs(car.v) > 0.3 && game.mode !== 'menu') cam.orbit *= Math.exp(-dt * 1.5);
    cam.shake *= Math.exp(-dt * 10);
    var turboFov = keys.turbo && car.stamina > 0 && keys.up ? 1 : 0;
    cam.fov += (FOV0 + (8 * Math.min(1, Math.abs(car.v) / 7) + 4 * turboFov) * Math.PI / 180 - cam.fov) * Math.min(1, dt * 4);
    duckTick(dt);
    if (game.mode === 'play' || game.mode === 'free') Pigeons.update(pigeons, dt, car, flapSound);
    draw(now);
    hud(now);
    fpsFrames++;
    if (!fpsSince) fpsSince = now;
    if (now - fpsSince >= 1000) { window.__stats.fps = Math.round(fpsFrames * 1000 / (now - fpsSince)); fpsFrames = 0; fpsSince = now; }
    window.__stats.car = { x: +car.x.toFixed(2), z: +car.z.toFixed(2), heading: +car.heading.toFixed(3), v: +car.v.toFixed(2), cat: catAt(car.x, car.z) };
    window.__stats.game = { mode: game.mode, milk: +game.milk.toFixed(1), found: game.found, bottles: game.bottles.length };
    if (debugEl && now - debugAt > 1000) {
      debugAt = now;
      debugEl.textContent = 'FPS: ' + window.__stats.fps + '\nScans: ' + capturedScans.length + '\nPoints: ' + capturedScans.reduce(function (n, s) { return n + s.gpu.n; }, 0) +
        '\nCar: ' + JSON.stringify(window.__stats.car) + '\nMode: ' + game.mode;
    }
  }

  // ----------------------------------------------------------------- HUD ---

  function $(id) { return document.getElementById(id); }
  var shownPlace = '';
  function hud(now) {
    $('speed').textContent = Math.round(Math.abs(car.v) * 3.6);
    $('stamBar').firstElementChild.style.width = (car.stamina / STAMINA * 100) + '%';
    if (game.mode === 'play' || game.mode === 'over') {
      $('milkS').textContent = Math.ceil(game.milk);
      $('found').textContent = game.found;
      $('milkBar').firstElementChild.style.width = (game.milk / MILK_CAP * 100) + '%';
      $('milkBar').classList.toggle('low', game.milk < 10);
      var best = null, bd = 1e9;
      game.bottles.forEach(function (b) { var d = Math.hypot(b.x - car.x, b.z - car.z); if (d < bd) { bd = d; best = b; } });
      if (best) {
        var ang = Math.atan2(best.x - car.x, -(best.z - car.z)) - (cam.yaw + cam.orbit);
        $('arrow').style.transform = 'rotate(' + ang + 'rad)';
        $('bdist').textContent = Math.round(bd);
      }
    }
    var name = '';
    for (var i = 0; i < park.labels.length; i++) {
      var l = park.labels[i];
      if (Math.hypot(l[1][0] - car.x, l[1][1] - car.z) < l[2]) { name = l[0]; break; }
    }
    if (name !== shownPlace) { shownPlace = name; $('place').textContent = name; $('place').style.opacity = name ? '1' : '0'; }
    if (popT && now - popT > 900) { $('pop').style.opacity = '0'; $('pop').style.top = '38%'; popT = 0; }
    if (state.mini) drawMini();
  }

  var mini = $('mini'), miniCtx = mini.getContext('2d'), mapCanvas = null;
  var MAPCOL = [];
  MAPCOL[LAWN] = [96, 140, 70]; MAPCOL[PATH] = [225, 215, 195]; MAPCOL[ROAD] = [170, 170, 172]; MAPCOL[WATER] = [45, 90, 110];
  MAPCOL[BUILDING] = [160, 120, 100]; MAPCOL[SAND] = [220, 200, 140]; MAPCOL[PITCH] = [70, 165, 80]; MAPCOL[WOOD] = [36, 70, 34];
  MAPCOL[PARKING] = [130, 130, 130]; MAPCOL[OUTSIDE] = [70, 72, 60]; MAPCOL[PLAZA] = [150, 145, 135]; MAPCOL[RIDE] = [214, 70, 140]; MAPCOL[FENCE] = [230, 210, 80];
  function buildMap() {
    mapCanvas = document.createElement('canvas');
    mapCanvas.width = park.w; mapCanvas.height = park.h;
    var ctx = mapCanvas.getContext('2d'), out = ctx.createImageData(park.w, park.h);
    for (var i = 0; i < cats.length; i++) {
      var c = MAPCOL[cats[i] & 31] || [60, 60, 60];
      out.data[i * 4] = c[0]; out.data[i * 4 + 1] = c[1]; out.data[i * 4 + 2] = c[2]; out.data[i * 4 + 3] = 255;
    }
    ctx.putImageData(out, 0, 0);
    mini.width = 84; mini.height = 84;     // 2 CSS px per map pixel: pixel art
  }
  function drawMini() {
    var span = 300 / park.mpp, k = mini.width / span;
    var cx = (car.x - park.x0) / park.mpp, cz = (car.z - park.z0) / park.mpp;
    miniCtx.imageSmoothingEnabled = false;
    miniCtx.fillStyle = '#0a0a0a'; miniCtx.fillRect(0, 0, mini.width, mini.height);
    miniCtx.drawImage(mapCanvas, cx - span / 2, cz - span / 2, span, span, 0, 0, mini.width, mini.height);
    miniCtx.fillStyle = '#6edce4';
    capturedScans.forEach(function (scan) {
      var px = mini.width / 2 + (scan.at[0] - car.x) / park.mpp * k;
      var pz = mini.height / 2 + (scan.at[1] - car.z) / park.mpp * k;
      if (px > 1 && pz > 1 && px < mini.width - 2 && pz < mini.height - 2) miniCtx.fillRect(Math.round(px)-1, Math.round(pz)-1, 3, 3);
    });
    miniCtx.fillStyle = '#f4f1e8';
    game.bottles.forEach(function (b) {
      var bx = mini.width / 2 + (b.x - car.x) / park.mpp * k, bz = mini.height / 2 + (b.z - car.z) / park.mpp * k;
      bx = Math.max(1, Math.min(mini.width - 2, bx)); bz = Math.max(1, Math.min(mini.height - 2, bz));
      miniCtx.fillRect(Math.round(bx) - 1, Math.round(bz) - 1, 2, 2);
    });
    var mx = mini.width / 2, my = mini.height / 2, sx = Math.sin(car.heading), sz = -Math.cos(car.heading);
    miniCtx.fillStyle = '#e4342a';
    miniCtx.fillRect(Math.round(mx) - 1, Math.round(my) - 1, 3, 3);
    miniCtx.fillRect(Math.round(mx + sx * 4), Math.round(my + sz * 4), 1, 1);
    miniCtx.fillRect(Math.round(mx + sx * 3), Math.round(my + sz * 3), 1, 1);
  }

  // ------------------------------------------------------------- control ---

  var KEYMAP = { ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', ShiftLeft: 'turbo', ShiftRight: 'turbo' };
  document.addEventListener('keydown', function (e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
    var k = KEYMAP[e.code];
    if (k) { keys[k] = true; e.preventDefault(); }
    if (e.code === 'KeyV') cam.top = !cam.top;
    if (e.code === 'KeyH') togglePanel();
    if ((e.code === 'Enter' || e.code === 'Space') && (game.mode === 'menu' || game.mode === 'over')) { e.preventDefault(); startGame('play'); }
    if (e.code === 'Escape' && game.mode !== 'menu') showMenu();
  });
  document.addEventListener('keyup', function (e) { var k = KEYMAP[e.code]; if (k) keys[k] = false; });
  window.addEventListener('blur', function () { Object.keys(keys).forEach(function (k) { keys[k] = false; }); });

  document.querySelectorAll('#pad button').forEach(function (b) {
    var k = b.dataset.k;
    function on(e) { e.preventDefault(); if (k === 'view') { cam.top = !cam.top; return; } keys[k] = true; b.classList.add('on'); try { b.setPointerCapture(e.pointerId); } catch (err) { /* ok */ } }
    function off() { if (k !== 'view') { keys[k] = false; b.classList.remove('on'); } }
    b.addEventListener('pointerdown', on);
    b.addEventListener('pointerup', off);
    b.addEventListener('pointercancel', off);
    b.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  });

  // Drag to look around the stroller, wheel or pinch to zoom.
  var drag = null, pointers = new Map(), pinch0 = 0, dist0 = 0;
  stage.addEventListener('pointerdown', function (e) {
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    try { stage.setPointerCapture(e.pointerId); } catch (err) { /* ok */ }
    if (pointers.size === 2) { var p = Array.from(pointers.values()); pinch0 = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y); dist0 = cam.dist; drag = null; return; }
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY };
    stage.classList.add('drag');
  });
  stage.addEventListener('pointermove', function (e) {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2 && pinch0) {
      var p = Array.from(pointers.values());
      cam.dist = clampDist(dist0 * pinch0 / Math.max(1, Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y)));
      return;
    }
    if (!drag || drag.id !== e.pointerId) return;
    cam.orbit -= (e.clientX - drag.x) * 0.008;
    cam.pitch = Math.max(0.03, Math.min(1.4, cam.pitch + (e.clientY - drag.y) * 0.006));
    drag.x = e.clientX; drag.y = e.clientY;
  });
  function release(e) {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinch0 = 0;
    if (drag && drag.id === e.pointerId) { drag = null; stage.classList.remove('drag'); }
  }
  stage.addEventListener('pointerup', release);
  stage.addEventListener('pointercancel', release);
  stage.addEventListener('wheel', function (e) { e.preventDefault(); cam.dist = clampDist(cam.dist * Math.exp(e.deltaY * 0.0015)); }, { passive: false });
  function clampDist(d) { return Math.max(1.8, Math.min(60, d)); }
  new ResizeObserver(place).observe(stage);

  // ------------------------------------------------------------------ UI ---

  function syncUI() {
    $('pix').value = state.pix; $('pixV').textContent = state.pix;
    $('speedMul').value = state.speedMul; $('speedMulV').textContent = '×' + Number(state.speedMul).toFixed(1);
    $('palette').value = state.palette;
    $('dither').checked = state.dither;
    $('night').checked = state.night;
    $('grainOn').checked = state.grain;
    $('miniOn').checked = state.mini;
    $('sound').checked = state.sound;
    $('grain').classList.toggle('off', !state.grain);
    $('mini').classList.toggle('off', !state.mini);
  }
  function bind(id, key, read) {
    $(id).addEventListener('input', function (e) {
      state[key] = read(e.target);
      if (key === 'pix') place();
      if (key === 'sound' && state.sound) audio();
      if (key === 'sound' && !state.sound && duckGain) duckGain.gain.value = 0;
      syncUI(); save();
      e.target.blur();          // arrow keys drive the stroller, not the slider
    });
  }
  bind('pix', 'pix', function (t) { return Number(t.value); });
  bind('speedMul', 'speedMul', function (t) { return Number(t.value); });
  bind('palette', 'palette', function (t) { return t.value; });
  bind('dither', 'dither', function (t) { return t.checked; });
  bind('night', 'night', function (t) { return t.checked; });
  bind('grainOn', 'grain', function (t) { return t.checked; });
  bind('miniOn', 'mini', function (t) { return t.checked; });
  bind('sound', 'sound', function (t) { return t.checked; });
  $('toggle').addEventListener('click', togglePanel);
  $('menu').addEventListener('click', function (e) { e.target.blur(); showMenu(); });
  $('play').addEventListener('click', function (e) { e.target.blur(); startGame('play'); });
  $('free').addEventListener('click', function (e) { e.target.blur(); startGame('free'); });
  function togglePanel() { var p = $('panel'); p.classList.toggle('hidden'); $('toggle').textContent = p.classList.contains('hidden') ? '+' : '−'; }
  function showMenu() {
    game.mode = 'menu'; game.bottles = [];
    $('title').textContent = 'Молоко для малыша';
    $('body').innerHTML = '<p>В коляске малыш, и он всё время хочет есть.</p><p>Катай коляску по «Солнечному острову» и собирай бутылочки с молоком. Одной хватает на минуту.</p><p>Молоко кончилось - малыш плачет, игра окончена.</p><p class="dim">WASD / стрелки · Shift - турбо · на телефоне кнопки справа</p>';
    var best = readBest();
    $('stats').innerHTML = best.found ? '<span class="dim">Рекорд: ' + best.found + ' бут.</span>' : '';
    $('play').textContent = 'Играть';
    $('overlay').classList.remove('off');
  }
  syncUI();
  if (matchMedia('(max-width: 640px)').matches) togglePanel();

  // ---------------------------------------------------------------- load ---

  function texture(unit, internal, format, w, h, data, img) {
    var t = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    if (img) gl.texImage2D(gl.TEXTURE_2D, 0, internal, format, gl.UNSIGNED_BYTE, img);
    else gl.texImage2D(gl.TEXTURE_2D, 0, internal, w, h, 0, format, gl.UNSIGNED_BYTE, data);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  }

  async function boot() {
    statusEl.textContent = 'Загрузка парка…';
    var res = await Promise.all([
      fetch('park/park.json').then(function (r) { if (!r.ok) throw new Error('park.json ' + r.status); return r.json(); }),
      loadImage('park/ground.png'),
      loadImage('park/albedo.jpg'),
      fetch('park/scans.json').then(function (r) { if (!r.ok) throw new Error('scans.json ' + r.status); return r.json(); }),
    ]);
    park = res[0];
    park.scans = res[3].scans;
    // Replace the former guessed fountain and clear generated vegetation at
    // the supplied real scan locations before creating geometry or collisions.
    park.landmarks = park.landmarks.filter(function (lm) { return lm.kind !== 'fountain'; });
    park.labels = park.labels.filter(function (label) { return label[0] !== 'Фонтан'; });
    park.scans.forEach(function (scan) { park.labels.unshift([scan.name, scan.at, 16]); });
    park.trees = park.trees.filter(function (tree) {
      return !park.scans.some(function (scan) { return Math.hypot(tree[0] - scan.at[0], tree[1] - scan.at[1]) < 9; });
    });
    park.props = park.props.filter(function (prop) {
      return !park.scans.some(function (scan) { return inside(scan.footprint, prop[1], prop[2]); });
    });
    var cv = document.createElement('canvas'); cv.width = park.w; cv.height = park.h;
    var cx = cv.getContext('2d', { willReadFrequently: true }); cx.drawImage(res[1], 0, 0);
    var rgba = cx.getImageData(0, 0, park.w, park.h).data;
    cats = new Uint8Array(park.w * park.h);
    for (var i = 0; i < cats.length; i++) cats[i] = rgba[i * 4];
    park.scans.forEach(function (scan) {
      var box = bbox(scan.footprint);
      for (var z = box[1]; z <= box[3]; z += park.mpp) for (var x = box[0]; x <= box[2]; x += park.mpp) {
        if (!inside(scan.footprint, x, z)) continue;
        var ix = Math.floor((x - park.x0) / park.mpp), iz = Math.floor((z - park.z0) / park.mpp);
        if (ix >= 0 && iz >= 0 && ix < park.w && iz < park.h) cats[iz * park.w + ix] = FENCE | IN_PARK;
      }
    });
    groundTex = texture(0, gl.R8, gl.RED, park.w, park.h, cats);
    albedoTex = texture(1, gl.RGB8, gl.RGB, 0, 0, null, res[2]);

    var X0 = park.x0, Z0 = park.z0, X1 = park.x0 + park.w * park.mpp, Z1 = park.z0 + park.h * park.mpp;
    groundVAO = gl.createVertexArray();
    gl.bindVertexArray(groundVAO);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([X0, Z0, X1, Z0, X1, Z1, X0, Z0, X1, Z1, X0, Z1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);

    statusEl.textContent = 'Сажаем деревья…';
    await new Promise(function (r) { setTimeout(r, 0); });
    var r = rng(5);
    world = buildWorld(park);
    park.landmarks.forEach(function (lm) {
      if (lm.kind === 'wheel') ferris = buildWheel(lm, r);
      if (lm.kind === 'fountain') jets = buildFountainJets(lm, r);
    });
    bottleGPU = buildBottle();
    buildMallards();
    indexTrunks(park.trees);
    buildMap();
    window.__stats.worldPoints = world.n;

    statusEl.textContent = 'Загрузка снятых фонтанов…';
    capturedScans = await Promise.all(park.scans.map(async function (scan) {
      var response = await fetch(scan.src);
      if (!response.ok) throw new Error(scan.src + ' ' + response.status);
      var points = SPZ.parse(await SPZ.gunzip(await response.arrayBuffer()));
      var c = Math.cos(scan.yaw), s = Math.sin(scan.yaw);
      for (var j = 0; j < points.n; j++) {
        var x = points.pos[3*j] - scan.center[0], z = points.pos[3*j+2] - scan.center[1];
        points.pos[3*j] = scan.at[0] + c*x - s*z;
        points.pos[3*j+1] -= scan.ground;
        points.pos[3*j+2] = scan.at[1] + s*x + c*z;
        points.col[4*j+3] = 255;  // Source opacity must not mark scanned stones as emissive lamps.
      }
      return { id: scan.id, at: scan.at, gpu: cloudVAO(points.pos, points.col, points.size) };
    }));
    window.__stats.scans = capturedScans.map(function (s) { return { id: s.id, at: s.at, points: s.gpu.n }; });

    statusEl.textContent = 'Загрузка коляски…';
    var spz = await fetch(new URLSearchParams(location.search).get('src') || 'karasunsky.spz');
    if (!spz.ok) throw new Error('karasunsky.spz ' + spz.status);
    var cloud = SPZ.parse(await SPZ.gunzip(await spz.arrayBuffer()));
    var s = extractStroller(cloud);
    stroller = { gpu: cloudVAO(s.pos, s.col, s.size), length: s.length, width: s.width };
    window.__stats.stroller = { points: s.size.length, length: +s.length.toFixed(2), width: +s.width.toFixed(2) };

    buildPigeons();
    respawn();
    place();
    statusEl.style.display = 'none';
    canvas.style.opacity = '1';
    showMenu();
    if (new URLSearchParams(location.search).get('tour') === 'fountains') visitScans();
    requestAnimationFrame(frame);
  }
  boot().catch(function (err) { statusEl.textContent = 'Ошибка: ' + err.message; console.error(err); });

  function visitScans() {
    if (!stroller || !park.scans.length) return;
    var target = park.scans[1] || park.scans[0], found = false;
    for (var radius = 7; radius <= 22 && !found; radius += 2) for (var a = 0; a < Math.PI * 2; a += Math.PI / 18) {
      var x = target.at[0] + Math.cos(a) * radius, z = target.at[1] + Math.sin(a) * radius;
      var heading = Math.atan2(target.at[0] - x, -(target.at[1] - z));
      if ([PATH, PLAZA, ROAD].indexOf(catAt(x, z)) < 0 || blockedAt(x, z, heading)) continue;
      startGame('free'); car.x = x; car.z = z; car.heading = heading; car.v = 0;
      cam.yaw = heading; cam.orbit = 0; cam.dist = 8; cam.pitch = 0.28; cam.top = false; found = true; break;
    }
    if (!found) throw new Error('Нет свободного подхода к фонтанам');
  }
  $('visitScans').addEventListener('click', visitScans);

  // test hooks: drive and play without a keyboard
  window.__setKeys = function (k) { Object.keys(keys).forEach(function (x) { keys[x] = false; }); Object.assign(keys, k); };
  window.__cam = cam; window.__car = car; window.__game = game; window.__start = startGame;
  window.__visitScans = visitScans;
  window.__mallards = function () { return mallards; };
  window.__pigeons = function () { return pigeons; };
})();

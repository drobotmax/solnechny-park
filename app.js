// Pixel point-cloud viewer for .spz Gaussian splats, after shala.mov.
//
// Same recipe as the reference: plain WebGL2, every splat centre drawn as a
// GL_POINT into a buffer a fraction of the CSS size, scaled up with
// image-rendering: pixelated. On top of that: palettes with ordered dithering,
// optional point size taken from the splat's own scale, and a crop radius,
// because a scanned scene (unlike a scanned person) has floaters and a far
// background shell around it.
(function () {
  'use strict';

  var SPIN = 2 * Math.PI / 40000;   // idle turntable: a full turn in 40 s, rad/ms
  var DRAG = 2 * Math.PI / 600;     // rad per CSS px dragged horizontally
  var TILT_DRAG = 0.005;            // rad per CSS px dragged vertically
  var RESUME = 2500;                // ms after a drag before the idle spin returns
  var FOV = 35 * Math.PI / 180;
  var MIN_ALPHA = 0.1;
  var SRC = 'karasunsky.spz?v=20261021-no-face1';
  var SCENES = {
    stroller: { name: 'КОЛЯСКА', src: SRC, radius: 1.8 },
    fountainA: { name: 'ФОНТАН · 1', src: 'captures/2026-10-19/fountain-a-crop.spz', radius: 8.5,
      frame: { cx: 1.6, cz: 3.6, ground: -0.25, top: 2.4 } },
    fountainB: { name: 'ФОНТАН · 2', src: 'captures/2026-10-19/fountain-b-crop.spz', radius: 5,
      frame: { cx: -1.7, cz: -2, ground: 0.02, top: 2 } },
  };
  Object.assign(SCENES, window.CAPTURE_SCENES || {});
  var sceneKey = new URLSearchParams(location.search).get('scene') || 'stroller';
  var scenePreset = SCENES[sceneKey] || SCENES.stroller;

  var PALETTES = {
    pico8: ['000000', '1d2b53', '7e2553', '008751', 'ab5236', '5f574f', 'c2c3c7', 'fff1e8',
            'ff004d', 'ffa300', 'ffec27', '00e436', '29adff', '83769c', 'ff77a8', 'ffccaa'],
    gameboy: ['0f380f', '306230', '8bac0f', '9bbc0f'],
    cga: ['000000', '55ffff', 'ff55ff', 'ffffff'],
    mono: ['000000', 'ffffff'],
  };
  var SPREAD = { pico8: 0.18, gameboy: 0.3, cga: 0.45, mono: 0.6 };

  var DEFAULTS = {
    pix: 2, palette: 'accent', accent: '#e4342a', dither: false, point: 1, fill: false,
    radius: 1.8, spin: true, grain: true, flip: false, ground: false,
  };
  var state = Object.assign({}, DEFAULTS, readSaved(), readQuery());
  if (sceneKey !== 'stroller' && SCENES[sceneKey]) {
    state = Object.assign({}, DEFAULTS, { radius: scenePreset.radius, palette: 'source',
      fill: true, spin: false, grain: false }, scenePreset.settings || {}, readQuery());
  }

  var stage = document.getElementById('stage');
  var canvas = document.getElementById('c');
  var statusEl = document.getElementById('status');
  var fpsEl = document.getElementById('fps');
  var gl = canvas.getContext('webgl2', { antialias: false, alpha: false, preserveDrawingBuffer: true });
  if (!gl) { statusEl.textContent = 'WebGL2 недоступен'; return; }

  function readSaved() {
    try { return JSON.parse(localStorage.getItem('pixel-spz') || '{}'); } catch (e) { return {}; }
  }
  function readQuery() {
    var q = new URLSearchParams(location.search), out = {};
    Object.keys(DEFAULTS).forEach(function (k) {
      if (!q.has(k)) return;
      var v = q.get(k), d = DEFAULTS[k];
      out[k] = typeof d === 'number' ? Number(v) : typeof d === 'boolean' ? v !== '0' && v !== 'false' : v;
    });
    return out;
  }
  function save() { try { localStorage.setItem('pixel-spz', JSON.stringify(state)); } catch (e) { /* private mode */ } }

  // ------------------------------------------------------------- shaders ---

  var VS = '#version 300 es\n' +
    'layout(location = 0) in vec3 aPos;\n' +
    'layout(location = 1) in vec4 aCol;\n' +
    'layout(location = 2) in float aSize;\n' +
    'uniform mat4 uView, uProj;\n' +
    'uniform vec3 uCenter;\n' +
    'uniform float uRadius, uFlip, uPoint, uFill, uFocal, uNear, uDepth, uCut;\n' +
    'out vec3 vCol;\n' +
    'out float vFade;\n' +
    'void main() {\n' +
    '  vec3 p = aPos;\n' +
    '  if (uFlip > 0.5) p.yz = -p.yz;\n' +            // 180 deg about X
    '  vec3 d = p - uCenter;\n' +
    '  if (aCol.a < ' + MIN_ALPHA.toFixed(2) + ' || dot(d, d) > uRadius * uRadius || d.y < uCut) {\n' +
    '    gl_Position = vec4(2.0, 2.0, 2.0, 1.0); gl_PointSize = 0.0; return;\n' +
    '  }\n' +
    '  vec4 v = uView * vec4(p, 1.0);\n' +
    '  gl_Position = uProj * v;\n' +
    '  float px = 2.0 * aSize * uFocal / max(-v.z, 1e-3);\n' +
    '  gl_PointSize = uFill > 0.5 ? clamp(px, uPoint, 8.0) : uPoint;\n' +
    '  vCol = aCol.rgb;\n' +
    '  vFade = clamp(1.0 - 0.55 * (-v.z - uNear) / uDepth, 0.45, 1.0);\n' +
    '}\n';

  var FS = '#version 300 es\n' +
    'precision mediump float;\n' +
    'in vec3 vCol;\n' +
    'in float vFade;\n' +
    'uniform int uMode, uPalN;\n' +            // 0 accent, 1 source, 2 palette
    'uniform vec3 uAccent;\n' +
    'uniform vec3 uPal[16];\n' +
    'uniform float uDither, uSpread;\n' +
    'out vec4 o;\n' +
    'const float B[16] = float[16](0.,8.,2.,10.,12.,4.,14.,6.,3.,11.,1.,9.,15.,7.,13.,5.);\n' +
    'float bayer() { ivec2 q = ivec2(gl_FragCoord.xy) & 3; return (B[q.x + 4 * q.y] + 0.5) / 16.0; }\n' +
    'void main() {\n' +
    '  float t = uDither > 0.5 ? bayer() : 0.5;\n' +
    '  if (uMode == 0) {\n' +
    '    float lum = dot(vCol, vec3(0.299, 0.587, 0.114));\n' +
    '    float k = (0.25 + 0.9 * lum) * vFade;\n' +
    '    if (uDither > 0.5) k = floor(k * 4.0 + t) / 4.0;\n' +
    '    o = vec4(uAccent * k, 1.0); return;\n' +
    '  }\n' +
    '  vec3 c = vCol * mix(1.0, vFade, 0.6);\n' +
    '  if (uMode == 1) { o = vec4(c, 1.0); return; }\n' +
    '  c += (t - 0.5) * uSpread;\n' +
    '  vec3 best = uPal[0]; float bd = 1e9;\n' +
    '  for (int i = 0; i < 16; i++) {\n' +
    '    if (i >= uPalN) break;\n' +
    '    vec3 e = c - uPal[i]; float dd = dot(e, e);\n' +
    '    if (dd < bd) { bd = dd; best = uPal[i]; }\n' +
    '  }\n' +
    '  o = vec4(best, 1.0);\n' +
    '}\n';

  function compile(type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }
  var prog = gl.createProgram();
  gl.attachShader(prog, compile(gl.VERTEX_SHADER, VS));
  gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FS));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  gl.useProgram(prog);
  var U = {};
  ['uView', 'uProj', 'uCenter', 'uRadius', 'uCut', 'uFlip', 'uPoint', 'uFill', 'uFocal', 'uNear', 'uDepth',
   'uMode', 'uPalN', 'uAccent', 'uPal', 'uDither', 'uSpread'].forEach(function (k) { U[k] = gl.getUniformLocation(prog, k); });

  var vao = gl.createVertexArray();
  var buffers = [gl.createBuffer(), gl.createBuffer(), gl.createBuffer()];
  var cloud = null;

  function upload(c) {
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers[0]);
    gl.bufferData(gl.ARRAY_BUFFER, c.pos, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers[1]);
    gl.bufferData(gl.ARRAY_BUFFER, c.col, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 4, gl.UNSIGNED_BYTE, true, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers[2]);
    gl.bufferData(gl.ARRAY_BUFFER, c.size, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(2, 1, gl.FLOAT, false, 0, 0);
  }

  // Robust frame of the scene from a sample of points: horizontal centre is the
  // median, the ground is a low percentile of height near that centre. Means
  // and bounding boxes are useless here: a few percent of the splats are a
  // background shell hundreds of metres out.
  function frameOf(c, flip) {
    var step = Math.max(1, Math.floor(c.n / 60000)), xs = [], ys = [], zs = [];
    for (var i = 0; i < c.n; i += step) {
      if (c.col[i * 4 + 3] < MIN_ALPHA * 255) continue;
      xs.push(c.pos[i * 3]);
      ys.push(flip ? -c.pos[i * 3 + 1] : c.pos[i * 3 + 1]);
      zs.push(flip ? -c.pos[i * 3 + 2] : c.pos[i * 3 + 2]);
    }
    function pct(a, p) { var s = a.slice().sort(function (x, y) { return x - y; }); return s[Math.floor(p * (s.length - 1))]; }
    var cx = pct(xs, 0.5), cz = pct(zs, 0.5), near = [];
    for (var j = 0; j < xs.length; j++) if (Math.hypot(xs[j] - cx, zs[j] - cz) < 3) near.push(ys[j]);
    var ground = pct(near, 0.03);
    return { cx: cx, cz: cz, ground: ground, top: pct(near, 0.97) };
  }

  // -------------------------------------------------------------- camera ---

  var cam = { yaw: -35 * Math.PI / 180, pitch: 18 * Math.PI / 180, zoom: 1 };
  var frame0 = null;
  function sceneFrame() {
    return scenePreset.frame && !state.flip ? Object.assign({}, scenePreset.frame) : frameOf(cloud, state.flip);
  }

  function radiusM() { return state.radius; }
  function target() {
    var h = Math.min(frame0.top - frame0.ground, radiusM());
    return [frame0.cx, frame0.ground + 0.35 * h, frame0.cz];
  }
  // Fitted by height; on a portrait screen pulled back so the width mostly fits too.
  function camDist() {
    var narrow = Math.max(1, 0.75 * canvas.height / canvas.width);
    return 0.85 * radiusM() / Math.tan(FOV / 2) * narrow * cam.zoom;
  }

  function perspective(fovy, aspect, near, far) {
    var f = 1 / Math.tan(fovy / 2), nf = 1 / (near - far);
    return [f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) * nf, -1, 0, 0, 2 * far * near * nf, 0];
  }
  function lookAt(e, t) {
    var z = norm([e[0] - t[0], e[1] - t[1], e[2] - t[2]]);
    var x = norm(cross([0, 1, 0], z)), y = cross(z, x);
    return [x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0,
      -dot(x, e), -dot(y, e), -dot(z, e), 1];
  }
  function norm(v) { var l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; }
  function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
  function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
  function hex(h) { h = h.replace('#', ''); return [0, 2, 4].map(function (i) { return parseInt(h.substr(i, 2), 16) / 255; }); }

  // ---------------------------------------------------------------- draw ---

  function place() {
    var w = stage.clientWidth, h = stage.clientHeight;
    canvas.width = Math.max(1, Math.ceil(w / state.pix));
    canvas.height = Math.max(1, Math.ceil(h / state.pix));
    gl.viewport(0, 0, canvas.width, canvas.height);
  }

  function setStatic() {
    var mode = state.palette === 'accent' ? 0 : state.palette === 'source' ? 1 : 2;
    gl.uniform1i(U.uMode, mode);
    gl.uniform3fv(U.uAccent, hex(state.accent));
    if (mode === 2) {
      var pal = PALETTES[state.palette], flat = new Float32Array(48);
      pal.forEach(function (c, i) { flat.set(hex(c), i * 3); });
      gl.uniform3fv(U.uPal, flat);
      gl.uniform1i(U.uPalN, pal.length);
      gl.uniform1f(U.uSpread, state.dither ? SPREAD[state.palette] : 0);
    }
    gl.uniform1f(U.uDither, state.dither ? 1 : 0);
    gl.uniform1f(U.uPoint, state.point);
    gl.uniform1f(U.uFill, state.fill ? 1 : 0);
    gl.uniform1f(U.uFlip, state.flip ? 1 : 0);
    gl.uniform1f(U.uRadius, radiusM());
    gl.uniform1f(U.uCut, state.ground ? 0.05 : -1e9);   // metres above the ground level
    document.documentElement.style.setProperty('--accent', state.accent);
    document.getElementById('grain').classList.toggle('off', !state.grain);
  }

  function draw() {
    var t = target(), d = camDist(), cp = Math.cos(cam.pitch);
    var eye = [t[0] + d * Math.sin(cam.yaw) * cp, t[1] + d * Math.sin(cam.pitch), t[2] + d * Math.cos(cam.yaw) * cp];
    var R = radiusM(), near = Math.max(0.05, d - 1.5 * R) * 0.5, far = d + 1.5 * R;
    gl.uniformMatrix4fv(U.uView, false, lookAt(eye, t));
    gl.uniformMatrix4fv(U.uProj, false, perspective(FOV, canvas.width / canvas.height, near, far));
    gl.uniform3f(U.uCenter, t[0], frame0.ground, t[2]);
    gl.uniform1f(U.uFocal, canvas.height / 2 / Math.tan(FOV / 2));
    gl.uniform1f(U.uNear, Math.max(0, d - R));
    gl.uniform1f(U.uDepth, 2 * R);
    gl.clearColor(0x0a / 255, 0x0a / 255, 0x0a / 255, 1);
    gl.enable(gl.DEPTH_TEST);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.drawArrays(gl.POINTS, 0, cloud.n);
  }

  // ---------------------------------------------------------------- loop ---

  var bench = new URLSearchParams(location.search).has('bench');
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var vel = 0, drag = null, idleAt = 0, dirty = true, raf = 0, last = 0;
  var fpsFrames = 0, fpsSince = 0;
  window.__stats = { fps: 0, n: 0 };

  function frame(now) {
    raf = 0;
    if (document.hidden) { last = 0; return; }
    var dt = last ? Math.min(now - last, 50) : 0;
    last = now;
    var moving = false;
    if (!drag) {
      var goal = state.spin && !reduce && now >= idleAt ? SPIN : 0;
      vel = goal + (vel - goal) * Math.pow(0.95, dt / 16);
      if (Math.abs(vel - goal) < 1e-6) vel = goal;
      if (vel) { cam.yaw += vel * dt; moving = true; }
    }
    if (dirty || moving || bench) {
      draw();
      dirty = false;
      fpsFrames++;
      if (!fpsSince) fpsSince = now;
      if (now - fpsSince >= 1000) {
        window.__stats.fps = Math.round(fpsFrames * 1000 / (now - fpsSince));
        fpsEl.textContent = '· ' + window.__stats.fps + ' fps';
        fpsFrames = 0; fpsSince = now;
      }
    }
    if (moving || bench || drag) raf = requestAnimationFrame(frame);
    else { last = 0; fpsSince = 0; fpsFrames = 0; }
  }
  function kick() { dirty = true; if (!raf && cloud) raf = requestAnimationFrame(frame); }

  // Horizontal drag turns the scene like on shala.mov; vertical drag tilts,
  // wheel and pinch zoom, double click resets the view.
  var pointers = new Map(), pinch0 = 0, zoom0 = 1;
  stage.addEventListener('pointerdown', function (e) {
    if (e.button !== 0) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    try { stage.setPointerCapture(e.pointerId); } catch (err) { /* not capturable */ }
    if (pointers.size === 2) {
      var p = Array.from(pointers.values());
      pinch0 = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y); zoom0 = cam.zoom; drag = null;
      return;
    }
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY, t: e.timeStamp };
    vel = 0;
    stage.classList.add('drag');
    e.preventDefault();
  });
  stage.addEventListener('pointermove', function (e) {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2 && pinch0) {
      var p = Array.from(pointers.values());
      cam.zoom = clampZoom(zoom0 * pinch0 / Math.max(1, Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y)));
      kick(); return;
    }
    if (!drag || e.pointerId !== drag.id) return;
    var d = (e.clientX - drag.x) * DRAG, dt = Math.max(e.timeStamp - drag.t, 1);
    cam.yaw -= d;
    cam.pitch = Math.max(-0.1, Math.min(1.45, cam.pitch + (e.clientY - drag.y) * TILT_DRAG));
    vel = 0.7 * vel + 0.3 * (-d / dt);
    drag.x = e.clientX; drag.y = e.clientY; drag.t = e.timeStamp;
    kick();
  });
  function release(e) {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinch0 = 0;
    if (!drag || e.pointerId !== drag.id) return;
    if (e.timeStamp - drag.t > 80 || reduce) vel = 0;   // a pause before letting go: no flick
    drag = null;
    stage.classList.remove('drag');
    idleAt = performance.now() + RESUME;
    kick();
  }
  stage.addEventListener('pointerup', release);
  stage.addEventListener('pointercancel', release);
  stage.addEventListener('wheel', function (e) {
    e.preventDefault();
    cam.zoom = clampZoom(cam.zoom * Math.exp(e.deltaY * 0.0015));
    kick();
  }, { passive: false });
  stage.addEventListener('dblclick', resetView);
  function clampZoom(z) { return Math.max(0.08, Math.min(4, z)); }
  function resetView() { cam.yaw = -35 * Math.PI / 180; cam.pitch = 18 * Math.PI / 180; cam.zoom = 1; vel = 0; kick(); }

  new ResizeObserver(function () { place(); kick(); }).observe(stage);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) kick(); });

  // ------------------------------------------------------------------ UI ---

  var RMIN = 1, RMAX = 250;   // crop radius slider is logarithmic
  function toSlider(r) { return Math.round(100 * Math.log(r / RMIN) / Math.log(RMAX / RMIN)); }
  function fromSlider(s) { var r = RMIN * Math.pow(RMAX / RMIN, s / 100); return r < 10 ? Math.round(r * 10) / 10 : Math.round(r); }
  function $(id) { return document.getElementById(id); }

  function syncUI() {
    $('pix').value = state.pix; $('pixV').textContent = state.pix;
    $('palette').value = state.palette;
    $('accent').value = state.accent;
    $('accent').closest('label').style.display = state.palette === 'accent' ? '' : 'none';
    $('dither').checked = state.dither;
    $('point').value = state.point; $('pointV').textContent = state.point;
    $('fill').checked = state.fill;
    $('radius').value = toSlider(state.radius); $('radiusV').textContent = state.radius;
    $('spin').checked = state.spin;
    $('grainOn').checked = state.grain;
    $('flip').checked = state.flip;
    $('ground').checked = state.ground;
  }
  function bind(id, key, read) {
    $(id).addEventListener('input', function (e) {
      var prev = state[key];
      state[key] = read(e.target);
      if (key === 'pix') place();
      if (key === 'flip' && cloud) frame0 = sceneFrame();
      if (key === 'spin' && state.spin && prev !== state.spin) idleAt = 0;
      syncUI(); save();
      if (cloud) { setStatic(); kick(); }
    });
  }
  bind('pix', 'pix', function (t) { return Number(t.value); });
  bind('palette', 'palette', function (t) { return t.value; });
  bind('accent', 'accent', function (t) { return t.value; });
  bind('dither', 'dither', function (t) { return t.checked; });
  bind('point', 'point', function (t) { return Number(t.value); });
  bind('fill', 'fill', function (t) { return t.checked; });
  bind('radius', 'radius', function (t) { return fromSlider(Number(t.value)); });
  bind('spin', 'spin', function (t) { return t.checked; });
  bind('grainOn', 'grain', function (t) { return t.checked; });
  bind('flip', 'flip', function (t) { return t.checked; });
  bind('ground', 'ground', function (t) { return t.checked; });
  $('reset').addEventListener('click', function () {
    state = Object.assign({}, DEFAULTS, scenePreset.frame ?
      Object.assign({ radius: scenePreset.radius, palette: 'source', fill: true, spin: false, grain: false }, scenePreset.settings || {}) : {}); syncUI(); save();
    if (cloud) { frame0 = sceneFrame(); place(); setStatic(); }
    resetView();
  });
  $('open').addEventListener('click', function () { $('file').click(); });
  function openFile(file) {
    scenePreset = { name: file.name };
    $('scene').value = '';
    return file.arrayBuffer().then(show);
  }
  $('file').addEventListener('change', function (e) { if (e.target.files[0]) openFile(e.target.files[0]); });
  Object.keys(window.CAPTURE_SCENES || {}).forEach(function (key) {
    var option = document.createElement('option'); option.value = key; option.textContent = SCENES[key].name;
    $('scene').appendChild(option);
  });
  $('scene').value = SCENES[sceneKey] ? sceneKey : '';
  $('scene').addEventListener('change', function (e) {
    var url = new URL(location.href); url.search = ''; url.searchParams.set('scene', e.target.value);
    location.assign(url);
  });
  $('toggle').addEventListener('click', togglePanel);
  document.addEventListener('keydown', function (e) { if (e.key === 'h' || e.key === 'р') togglePanel(); });
  function togglePanel() {
    var p = $('panel'); p.classList.toggle('hidden');
    $('toggle').textContent = p.classList.contains('hidden') ? '+' : '−';
  }
  document.addEventListener('dragover', function (e) { e.preventDefault(); });
  document.addEventListener('drop', function (e) {
    e.preventDefault();
    var f = e.dataTransfer.files[0];
    if (f) openFile(f);
  });
  syncUI();
  if (matchMedia('(max-width: 640px)').matches) togglePanel();

  // ---------------------------------------------------------------- load ---

  async function fetchWithProgress(url) {
    var r = await fetch(url);
    if (!r.ok) throw new Error(url + ': ' + r.status);
    var total = Number(r.headers.get('content-length')) || 0, got = 0, parts = [];
    var reader = r.body.getReader();
    for (;;) {
      var x = await reader.read();
      if (x.done) break;
      parts.push(x.value); got += x.value.length;
      if (total) statusEl.textContent = 'Загрузка… ' + Math.round(100 * got / total) + '%';
    }
    return await new Blob(parts).arrayBuffer();
  }

  async function show(buf) {
    try {
      statusEl.style.display = '';
      statusEl.textContent = 'Распаковка…';
      var t0 = performance.now();
      cloud = SPZ.parse(await SPZ.gunzip(buf));
      window.__stats.n = cloud.n;
      window.__stats.parseMs = Math.round(performance.now() - t0);
      upload(cloud);
      frame0 = sceneFrame();
      $('sceneName').textContent = scenePreset.name;
      $('radiusLabel').textContent = 'Охват, ' + (scenePreset.units ? 'у.е.' : 'м');
      document.title = scenePreset.name + ' · pixel';
      place(); setStatic();
      statusEl.style.display = 'none';
      canvas.style.opacity = '1';
      kick();
    } catch (err) {
      statusEl.textContent = 'Ошибка: ' + err.message;
      throw err;
    }
  }

  var sourceURL = new URLSearchParams(location.search).get('src') || scenePreset.src;
  fetchWithProgress(sourceURL).then(show).catch(function (err) {
    statusEl.textContent = 'Не удалось открыть ' + sourceURL + ': ' + err.message + '. Выберите другой .spz.';
    console.warn(err);
  });
})();

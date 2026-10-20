// Forest ground birds; all foraging and low flight routes stay in mapped woodland.
(function (root) {
  'use strict';
  function shape(kind, add, wing) {
    var woodpecker = kind === 'woodpecker';
    function oval(cx, cy, cz, rx, ry, rz, color) {
      for (var j = 0; j <= 10; j++) for (var i = 0; i < 24; i++) {
        var v = Math.PI * j / 10, a = Math.PI * 2 * i / 24;
        add(cx + Math.sin(v) * Math.cos(a) * rx, cy + Math.cos(v) * ry,
          cz + Math.sin(v) * Math.sin(a) * rz, color, 0.021, false);
      }
    }
    if (wing) {
      for (var x = 0; x < (woodpecker ? 0.24 : 0.35); x += 0.015) {
        var width = 0.1 * (1 - x / (woodpecker ? 0.3 : 0.42));
        for (var z = -width; z < width; z += 0.015) {
          add(x, 0, z + x * 0.22, woodpecker ? [72, 104, 47] : [30, 32, 43], 0.022, false);
        }
      }
      return;
    }
    oval(0, 0.18, 0.02, 0.085, 0.12, woodpecker ? 0.16 : 0.21, woodpecker ? [104, 133, 49] : [29, 29, 38]);
    oval(0, 0.20, -0.05, 0.072, 0.10, 0.13, woodpecker ? [171, 181, 107] : [34, 33, 43]);
    oval(0, 0.34, -0.12, 0.057, 0.075, 0.065, woodpecker ? [155, 162, 94] : [28, 27, 34]);
    oval(0, 0.385, -0.12, 0.048, 0.027, 0.058, woodpecker ? [182, 43, 35] : [34, 32, 44]);
    oval(0, 0.315, -0.225, 0.018, 0.018, woodpecker ? 0.075 : 0.065, [79, 83, 73]);
    if (!woodpecker) oval(0, 0.32, -0.17, 0.04, 0.045, 0.033, [180, 177, 163]);
    oval(0, 0.10, 0.23, 0.05, 0.025, 0.11, woodpecker ? [70, 89, 41] : [26, 27, 37]);
    if (woodpecker) oval(0, 0.245, 0.125, 0.065, 0.04, 0.065, [200, 190, 52]);
    [-1, 1].forEach(function (side) {
      oval(side * 0.076, 0.20, 0.03, 0.022, 0.07, 0.15, woodpecker ? [79, 112, 44] : [36, 37, 51]);
      if (woodpecker) oval(side * 0.052, 0.335, -0.16, 0.013, 0.033, 0.041, [34, 39, 32]);
      oval(side * 0.053, 0.353, -0.16, 0.008, 0.008, 0.008, woodpecker ? [226, 226, 179] : [14, 14, 18]);
      oval(side * 0.04, 0.04, 0.02, 0.009, 0.04, 0.013, [62, 60, 55]);
    });
  }
  function route(canForage, x, z, tx, tz) {
    var steps = Math.max(1, Math.ceil(Math.hypot(tx - x, tz - z) / 0.4));
    for (var i = 0; i <= steps; i++) if (!canForage(x + (tx - x) * i / steps, z + (tz - z) * i / steps)) return false;
    return true;
  }
  function create(trees, canForage, random) {
    var groups = [], birds = [], woodpeckers = [];
    trees.forEach(function (tree, index) {
      if (index % 3 || (groups.length >= 10 && woodpeckers.length >= 8)) return;
      var x = tree[0] + 3, z = tree[1] + 2;
      if (!canForage(x, z)) return;
      function bird(kind, x, z, group) {
        return { species: kind, x: x, z: z, y: 0, anchorX: x, anchorZ: z, group: group,
          heading: random() * Math.PI * 2, phase: random() * Math.PI * 2, pitch: 0,
          flight: null, walk: null, wait: 4 + random() * 12, call: 0 };
      }
      if (groups.length < 10 && groups.every(function (g) { return Math.hypot(g.x - x, g.z - z) >= 65; })) {
        var list = [];
        for (var tries = 0; tries < 120 && list.length < 9; tries++) {
          var a = random() * Math.PI * 2, r = Math.sqrt(random()) * 4;
          var px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r;
          if (canForage(px, pz) && list.every(function (b) { return Math.hypot(b.x - px, b.z - pz) > 0.65; })) list.push(bird('rook', px, pz, groups.length));
        }
        if (list.length === 9) { groups.push({ x: x, z: z, birds: list }); birds.push.apply(birds, list); }
      }
      if (woodpeckers.length < 8 && woodpeckers.every(function (d) { return Math.hypot(d.x - x, d.z - z) >= 80; })) {
        var d = bird('woodpecker', x, z, -1); woodpeckers.push(d); birds.push(d);
      }
    });
    return { groups: groups, birds: birds, woodpeckers: woodpeckers, canForage: canForage, random: random };
  }
  function update(pop, dt, onCall) {
    pop.birds.forEach(function (d) {
      var wood = d.species === 'woodpecker';
      d.phase += dt * (d.flight ? 22 : 7);
      if (d.flight) {
        var f = d.flight, previous = d.y;
        f.t = Math.min(1, f.t + dt / f.duration);
        d.x = f.x + (f.tx - f.x) * f.t; d.z = f.z + (f.tz - f.z) * f.t;
        d.y = Math.sin(Math.PI * f.t) * (1.1 + 0.65 * Math.pow(Math.sin(Math.PI * 3 * f.t), 2));
        d.pitch = dt ? Math.atan2((d.y - previous) / dt, 5) : 0;
        d.call -= dt;
        if (d.call <= 0 && onCall) { onCall(d); d.call = 1.25; }
        if (f.t >= 1) { d.flight = null; d.y = 0; d.pitch = 0; d.wait = 10 + pop.random() * 16; }
        return;
      }
      if (d.walk) {
        var dx = d.walk.x - d.x, dz = d.walk.z - d.z, dist = Math.hypot(dx, dz), step = Math.min(dist, dt * 0.3);
        var nx = d.x + dx / Math.max(dist, 0.001) * step, nz = d.z + dz / Math.max(dist, 0.001) * step;
        if (!pop.canForage(nx, nz)) { d.walk = null; return; }
        d.heading = Math.atan2(dx, -dz); d.x = nx; d.z = nz;
        if (dist < 0.08) { d.walk = null; d.wait = 2 + pop.random() * 5; }
        return;
      }
      d.wait -= dt;
      if (d.wait > 0) return;
      var fly = wood && pop.random() < 0.7, found = false;
      for (var i = 0; i < 40; i++) {
        var a = pop.random() * Math.PI * 2, r = fly ? 8 + pop.random() * 12 : 0.8 + pop.random() * 2;
        var x = d.x + Math.cos(a) * r, z = d.z + Math.sin(a) * r;
        if (Math.hypot(x - d.anchorX, z - d.anchorZ) > (wood ? 25 : 5) || !route(pop.canForage, d.x, d.z, x, z)) continue;
        if (pop.birds.some(function (b) { return b !== d && !b.flight && Math.hypot(b.x - x, b.z - z) < 0.65; })) continue;
        d.heading = Math.atan2(x - d.x, -(z - d.z));
        if (fly) { d.flight = { x: d.x, z: d.z, tx: x, tz: z, t: 0, duration: r / 5 }; d.call = 0; }
        else d.walk = { x: x, z: z };
        found = true; break;
      }
      if (!found) d.wait = 2;
    });
  }
  var api = { shape: shape, create: create, update: update };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.ForestBirds = api;
})(typeof window !== 'undefined' ? window : globalThis);

// Forest ground birds; all foraging and low flight routes stay in mapped woodland.
(function (root) {
  'use strict';
  var habitats = typeof module !== 'undefined' && module.exports ? require('./habitat-sites.js') : root.HabitatSites;
  function shape(kind, add, wing) {
    var spotted = kind === 'spottedWoodpecker', woodpecker = kind === 'woodpecker' || spotted, crow = kind === 'crow', jay = kind === 'jay';
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
          var color = jay ? (x > 0.12 && x < 0.24 ? (Math.floor(x / 0.025) % 2 ? [51, 139, 208] : [28, 33, 37]) : [102, 98, 90]) : spotted ? (Math.floor(x / 0.035) % 2 ? [228, 225, 209] : [29, 31, 32]) : woodpecker ? [72, 104, 47] : [30, 32, 43];
          add(x, 0, z + x * 0.22, color, 0.022, false);
        }
      }
      return;
    }
    if (jay) {
      oval(0, 0.18, 0.02, 0.08, 0.11, 0.19, [173, 137, 110]);
      oval(0, 0.30, -0.10, 0.055, 0.08, 0.065, [198, 177, 148]);
      oval(0, 0.38, -0.13, 0.052, 0.055, 0.06, [207, 196, 174]);
      oval(0, 0.35, -0.23, 0.019, 0.016, 0.060, [35, 37, 34]);
      oval(0, 0.14, 0.20, 0.055, 0.045, 0.07, [232, 230, 214]);
      oval(0, 0.11, 0.29, 0.045, 0.02, 0.12, [34, 38, 38]);
      [-1, 1].forEach(function (side) {
        oval(side * 0.05, 0.335, -0.16, 0.012, 0.035, 0.028, [29, 33, 33]);
        oval(side * 0.049, 0.39, -0.155, 0.008, 0.008, 0.008, [25, 29, 31]);
        oval(side * 0.075, 0.20, 0.04, 0.022, 0.065, 0.13, [105, 96, 85]);
        oval(side * 0.09, 0.23, 0.02, 0.012, 0.033, 0.065, [51, 139, 208]);
        for (var z = -0.02; z < 0.08; z += 0.025) oval(side * 0.102, 0.23, z, 0.006, 0.034, 0.006, [27, 32, 34]);
        oval(side * 0.035, 0.035, 0.025, 0.009, 0.035, 0.013, [80, 72, 63]);
      });
      return;
    }
    oval(0, 0.18, 0.02, 0.085, 0.12, woodpecker ? 0.16 : 0.21, spotted ? [26, 29, 30] : woodpecker ? [104, 133, 49] : crow ? [128, 132, 134] : [29, 29, 38]);
    oval(0, 0.20, -0.05, 0.072, 0.10, 0.13, spotted ? [224, 218, 197] : woodpecker ? [171, 181, 107] : crow ? [139, 142, 140] : [34, 33, 43]);
    oval(0, 0.34, -0.12, 0.057, 0.075, 0.065, spotted ? [231, 228, 212] : woodpecker ? [155, 162, 94] : [28, 27, 34]);
    oval(0, 0.385, -0.12, 0.048, 0.027, 0.058, spotted ? [26, 29, 30] : woodpecker ? [182, 43, 35] : [34, 32, 44]);
    oval(0, 0.315, -0.225, 0.018, 0.018, woodpecker ? 0.075 : 0.065, [79, 83, 73]);
    if (!woodpecker && !crow) oval(0, 0.32, -0.17, 0.04, 0.045, 0.033, [180, 177, 163]);
    oval(0, 0.10, 0.23, 0.05, 0.025, 0.11, woodpecker ? [70, 89, 41] : [26, 27, 37]);
    if (woodpecker) oval(0, spotted ? 0.14 : 0.245, 0.125, 0.065, 0.04, 0.065, spotted ? [190, 39, 36] : [200, 190, 52]);
    if (spotted) {
      oval(0, 0.36, -0.065, 0.04, 0.025, 0.018, [182, 43, 35]);
      [-1, 1].forEach(function (side) { oval(side * 0.09, 0.23, -0.005, 0.012, 0.05, 0.065, [232, 229, 212]); });
    }
    [-1, 1].forEach(function (side) {
      oval(side * 0.076, 0.20, 0.03, 0.022, 0.07, 0.15, spotted ? [29, 32, 34] : woodpecker ? [79, 112, 44] : [36, 37, 51]);
      if (woodpecker) oval(side * 0.052, 0.335, -0.16, 0.013, 0.033, 0.041, [34, 39, 32]);
      oval(side * 0.053, 0.353, -0.16, 0.008, 0.008, 0.008, woodpecker ? [226, 226, 179] : [14, 14, 18]);
      oval(side * 0.04, 0.04, 0.02, 0.009, 0.04, 0.013, [62, 60, 55]);
    });
  }
  function route(canForage, x, z, tx, tz, curve) {
    var steps = Math.max(1, Math.ceil(Math.hypot(tx - x, tz - z) / 0.2));
    var length = Math.hypot(tx - x, tz - z) || 1;
    for (var i = 0; i <= steps; i++) {
      var bend = (curve || 0) * Math.sin(Math.PI * i / steps);
      var px = x + (tx - x) * i / steps - (tz - z) / length * bend, pz = z + (tz - z) * i / steps + (tx - x) / length * bend;
      if (!canForage(px, pz) || !canForage(px - 0.12, pz) || !canForage(px + 0.12, pz) || !canForage(px, pz - 0.12) || !canForage(px, pz + 0.12)) return false;
    }
    return true;
  }
  function create(trees, canForage, random, start, denseForest, canFly) {
    var groups = [], birds = [], woodpeckers = [], spottedWoodpeckers = [], jays = [], crows = [];
    canFly = canFly || canForage;
    var sites = trees.filter(function (t, i) { return i % 3 === 0 && canForage(t[0] + 3, t[1] + 2) && (!denseForest || denseForest(t[0] + 3, t[1] + 2)); })
      .map(function (t) { return { x: t[0] + 3, z: t[1] + 2 }; });
    sites = habitats.order(sites, start || [0, 0]);
    sites.forEach(function (tree) {
      if (groups.length >= 36) return;
      var x = tree.x, z = tree.z;
      if (!canForage(x, z)) return;
      function bird(kind, x, z, group) {
        return { species: kind, x: x, z: z, y: 0, anchorX: x, anchorZ: z, group: group,
          heading: random() * Math.PI * 2, phase: random() * Math.PI * 2, pitch: 0,
          flight: null, walk: null, wait: 4 + random() * 12, call: 0 };
      }
      if (groups.length < 36 && groups.every(function (g) { return Math.hypot(g.x - x, g.z - z) >= 45; })) {
        var list = [];
        for (var tries = 0; tries < 120 && list.length < 9; tries++) {
          var a = random() * Math.PI * 2, r = Math.sqrt(random()) * 4;
          var px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r;
          if (canForage(px, pz) && list.every(function (b) { return Math.hypot(b.x - px, b.z - pz) > 0.65; })) list.push(bird('rook', px, pz, groups.length));
        }
        if (list.length === 9) {
          var group = groups.length; groups.push({ x: x, z: z, birds: list }); birds.push.apply(birds, list);
          for (var ci = 0; ci < 120; ci++) {
            var ca = random() * Math.PI * 2, cr = 4 + random() * 5;
            var cx = x + Math.cos(ca) * cr, cz = z + Math.sin(ca) * cr;
            if (!canForage(cx, cz) || list.some(function (b) { return Math.hypot(b.x - cx, b.z - cz) < 1; })) continue;
            var crow = bird('crow', cx, cz, group); crows.push(crow); birds.push(crow); break;
          }
        }
      }
    });
    // Woodpeckers select independent territories after rook flocks are placed.
    // Offset candidates from rook seeds, so neither species is attached to a flock.
    var territories = [];
    sites.forEach(function (site) { [[0,0],[18,13],[-18,13],[18,-13],[-18,-13]].forEach(function (offset) { territories.push({ x: site.x + offset[0], z: site.z + offset[1] }); }); });
    territories = territories.filter(function (site) { return canForage(site.x, site.z) && (!denseForest || denseForest(site.x, site.z)) && groups.every(function (g) { return Math.hypot(g.x - site.x, g.z - site.z) >= 18; }); });
    territories = habitats.order(territories, start || [0, 0]);
    function placeSolitaryBirds(list, count, kind, spacing) {
      var available = territories.filter(function (site) { return woodpeckers.concat(spottedWoodpeckers, jays).every(function (d) { return Math.hypot(d.x - site.x, d.z - site.z) >= (d.species === kind ? spacing : 18); }); });
      habitats.order(available, start || [0, 0]).forEach(function (site) {
        if (list.length >= count || groups.some(function (g) { return Math.hypot(g.x - site.x, g.z - site.z) < 18; })) return;
        if (woodpeckers.concat(spottedWoodpeckers, jays).some(function (d) { return Math.hypot(d.x - site.x, d.z - site.z) < (d.species === kind ? spacing : 18); })) return;
        if (![0,1,2,3,4,5,6,7,8,9,10,11].some(function (i) { var a = i * Math.PI / 6; return canForage(site.x + Math.cos(a) * 8, site.z + Math.sin(a) * 8) && route(canFly, site.x, site.z, site.x + Math.cos(a) * 8, site.z + Math.sin(a) * 8); })) return;
        var d = { species: kind, x: site.x, z: site.z, y: 0, anchorX: site.x, anchorZ: site.z, group: -1,
          heading: random() * Math.PI * 2, phase: random() * Math.PI * 2, pitch: 0, flight: null, walk: null, wait: 4 + random() * 12, call: 0 };
        list.push(d); birds.push(d);
      });
    }
    placeSolitaryBirds(woodpeckers, 12, 'woodpecker', 80);
    placeSolitaryBirds(spottedWoodpeckers, woodpeckers.length * 5, 'spottedWoodpecker', 30);
    placeSolitaryBirds(jays, 30, 'jay', 35);
    return { groups: groups, birds: birds, woodpeckers: woodpeckers, spottedWoodpeckers: spottedWoodpeckers, jays: jays, crows: crows, canForage: canForage, canFly: canFly, random: random };
  }
  function update(pop, dt, onCall, car, dogs) {
    var threats = car ? [car].concat(dogs || []) : [];
    function flee(d, source) {
      var away = Math.atan2(d.z - source.z, d.x - source.x);
      for (var r = 14; r >= 3; r -= 2) for (var i = 0; i < 24; i++) {
        var angle = away + (i % 2 ? 1 : -1) * Math.ceil(i / 2) * Math.PI / 16;
        var x = d.x + Math.cos(angle) * r, z = d.z + Math.sin(angle) * r;
        var curve = (d.species === 'woodpecker' || d.species === 'spottedWoodpecker') ? 0 : (i % 2 ? 1.5 : -1.5);
        if (!pop.canForage(x, z) || !route(pop.canFly, d.x, d.z, x, z, curve) || Math.hypot(x - source.x, z - source.z) < 7) continue;
        d.walk = null; d.heading = Math.atan2(x - d.x, -(z - d.z));
        d.flight = { x: d.x, z: d.z, tx: x, tz: z, t: 0, duration: r / 5, scared: true, curve: curve };
        d.call = 0; return;
      }
    }
    pop.groups.forEach(function (g, index) {
      var source = threats.find(function (s) { return g.birds.some(function (d) { return !d.dead && !d.flight && Math.hypot(d.x - s.x, d.z - s.z) < 8; }); });
      if (source) g.birds.concat(pop.crows.filter(function (d) { return d.group === index; })).forEach(function (d) { if (!d.dead && !d.flight) flee(d, source); });
    });
    pop.woodpeckers.concat(pop.spottedWoodpeckers, pop.jays, pop.crows).forEach(function (d) {
      var source = threats.find(function (s) { return !d.dead && !d.flight && Math.hypot(d.x - s.x, d.z - s.z) < 8; });
      if (source) flee(d, source);
    });
    pop.birds.forEach(function (d) {
      if (d.dead) return;
      var wood = (d.species === 'woodpecker' || d.species === 'spottedWoodpecker');
      d.phase += dt * (d.flight ? 22 : 7);
      if (d.flight) {
        var f = d.flight, previous = d.y;
        f.t = Math.min(1, f.t + dt / f.duration);
        var length = Math.hypot(f.tx - f.x, f.tz - f.z) || 1, bend = (f.curve || 0) * Math.sin(Math.PI * f.t);
        d.x = f.x + (f.tx - f.x) * f.t - (f.tz - f.z) / length * bend;
        d.z = f.z + (f.tz - f.z) * f.t + (f.tx - f.x) / length * bend;
        if (wood) d.y = Math.sin(Math.PI * f.t) * (1.1 + 0.65 * Math.pow(Math.sin(Math.PI * 3 * f.t), 2));
        else { var lift = Math.min(1, f.t / 0.22, (1 - f.t) / 0.22); d.y = 2.4 * lift * lift * (3 - 2 * lift); }
        if (!wood) d.heading = Math.atan2((f.tx - f.x) - (f.tz - f.z) / length * (f.curve || 0) * Math.PI * Math.cos(Math.PI * f.t), -((f.tz - f.z) + (f.tx - f.x) / length * (f.curve || 0) * Math.PI * Math.cos(Math.PI * f.t)));
        d.pitch = dt ? Math.atan2((d.y - previous) / dt, 5) : 0;
        d.call -= dt;
        if (d.call <= 0 && onCall) { if (wood || d.species === 'crow' || d.species === 'jay' || pop.groups[d.group].birds.find(function (b) { return !b.dead; }) === d) onCall(d); d.call = wood ? 1.25 : 1.8; }
        if (f.t >= 1) { if (f.scared) { d.anchorX = d.x; d.anchorZ = d.z; } d.flight = null; d.y = 0; d.pitch = 0; d.wait = 10 + pop.random() * 16; }
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
        if (wood && pop.groups.some(function (g) { return Math.hypot(g.x - x, g.z - z) < 14; })) continue;
        if (wood && pop.woodpeckers.concat(pop.spottedWoodpeckers).some(function (other) { return other !== d && !other.dead && Math.hypot(other.x - x, other.z - z) < 8; })) continue;
        if (Math.hypot(x - d.anchorX, z - d.anchorZ) > (wood ? 25 : 5) || !pop.canForage(x, z) || !route(fly ? pop.canFly : pop.canForage, d.x, d.z, x, z)) continue;
        if (pop.birds.some(function (b) { return b !== d && !b.dead && !b.flight && Math.hypot(b.x - x, b.z - z) < 0.65; })) continue;
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

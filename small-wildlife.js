// Small park birds and red squirrels. Local forward is -Z.
(function (root) {
  'use strict';
  var habitats = typeof module !== 'undefined' && module.exports ? require('./habitat-sites.js') : root.HabitatSites;
  var pigeons = typeof module !== 'undefined' && module.exports ? require('./pigeons.js') : root.Pigeons;
  function shape(kind, part, add) {
    var squirrel = kind === 'squirrel', tit = kind === 'tit', wagtail = kind === 'wagtail';
    function oval(x, y, z, rx, ry, rz, color) {
      for (var j = 0; j <= 8; j++) for (var i = 0; i < 16; i++) {
        var v = j * Math.PI / 8, a = i * Math.PI / 8;
        add(x + Math.sin(v) * Math.cos(a) * rx, y + Math.cos(v) * ry,
          z + Math.sin(v) * Math.sin(a) * rz, color, squirrel ? 0.016 : 0.012, false);
      }
    }
    if (part === 'nut') { oval(0, 0, 0, 0.035, 0.042, 0.032, [132, 83, 39]); return; }
    if (part === 'tail') {
      if (squirrel) {
        oval(0, 0.26, 0.21, 0.09, 0.22, 0.095, [184, 79, 28]);
        oval(0, 0.43, 0.17, 0.075, 0.11, 0.09, [210, 110, 43]);
      } else oval(0, 0, 0.11, wagtail ? 0.025 : 0.035, 0.009, wagtail ? 0.14 : 0.055, wagtail ? [45, 48, 49] : tit ? [57, 65, 61] : [100, 71, 48]);
      return;
    }
    if (part === 'wing') {
      oval(0.10, 0, 0.025, 0.10, 0.009, 0.055, tit ? [104, 119, 123] : [123, 92, 62]); return;
    }
    if (squirrel) {
      oval(0, 0.15, 0.03, 0.075, 0.10, 0.15, [191, 83, 28]);
      oval(0, 0.14, -0.055, 0.052, 0.075, 0.08, [232, 197, 146]);
      oval(0, 0.24, -0.11, 0.055, 0.06, 0.065, [203, 98, 34]);
      oval(0, 0.22, -0.18, 0.025, 0.025, 0.04, [190, 87, 33]);
      [-1, 1].forEach(function (s) {
        oval(s * 0.035, 0.31, -0.095, 0.018, 0.05, 0.02, [151, 61, 23]);
        oval(s * 0.045, 0.25, -0.15, 0.009, 0.009, 0.009, [23, 22, 19]);
        [-0.09, 0.11].forEach(function (z) { oval(s * 0.065, 0.045, z, 0.025, 0.04, 0.045, [163, 67, 24]); });
      }); return;
    }
    oval(0, 0.10, 0.01, 0.052, 0.06, wagtail ? 0.10 : 0.085, tit ? [207, 189, 51] : wagtail ? [217, 218, 207] : [173, 142, 101]);
    oval(0, 0.14, 0.015, 0.048, 0.025, 0.075, tit ? [109, 130, 68] : wagtail ? [130, 137, 139] : [111, 78, 51]);
    oval(0, 0.18, -0.065, 0.038, 0.04, 0.042, tit || wagtail ? [30, 34, 35] : [130, 87, 49]);
    oval(0, 0.15, -0.115, 0.014, 0.012, 0.032, [48, 44, 37]);
    if (tit || wagtail) oval(0, 0.12, -0.05, 0.018, 0.04, 0.035, [29, 32, 32]);
    [-1, 1].forEach(function (s) {
      oval(s * 0.032, 0.17, -0.073, 0.01, 0.022, 0.025, tit || wagtail ? [237, 236, 215] : [201, 181, 147]);
      oval(s * 0.038, 0.19, -0.085, 0.006, 0.006, 0.006, [18, 21, 21]);
      oval(s * 0.05, 0.12, 0.025, 0.012, 0.035, 0.065, tit ? [88, 107, 110] : wagtail ? [46, 51, 52] : [99, 70, 47]);
      oval(s * 0.018, 0.025, 0, 0.005, 0.025, 0.007, [105, 83, 60]);
    });
  }
  function clear(canGo, a, b) {
    var n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 0.2));
    for (var i = 0; i <= n; i++) if (!canGo(a.x + (b.x - a.x) * i / n, a.z + (b.z - a.z) * i / n)) return false;
    return true;
  }
  function create(park, paved, forest, random) {
    var sparrows = { groups: [], birds: [], canLand: paved.canLand, random: random };
    var tits = [], titGroups = [], wagtails = [], squirrels = [];
    function bird(kind, x, z) {
      return { species: kind, x: x, z: z, y: 0, homeX: x, homeZ: z, anchorX: x, anchorZ: z,
        heading: random() * Math.PI * 2, phase: random() * 6.28, pause: 1 + random() * 3, flight: null, walk: null };
    }
    var paths = habitats.order(paved.groups.filter(function (g) { return g.size !== 'solo'; }), park.start);
    paths.forEach(function (g, index) {
      if (index % 4) return;
      var list = [], count = 2 + Math.floor(random() * Math.min(4, g.birds.length - 2)), center = null;
      for (var attempt = 0; attempt < 24; attempt++) {
        var angle = random() * 6.28, offset = 4 + random() * 3;
        var cx = g.x + Math.cos(angle) * offset, cz = g.z + Math.sin(angle) * offset;
        if (paved.canLand(cx, cz)) { center = { x: cx, z: cz }; break; }
      }
      if (!center) return;
      for (var i = 0; i < 100 && list.length < count; i++) {
        var a = random() * 6.28, r = Math.sqrt(random()) * 1.1, x = center.x + Math.cos(a) * r, z = center.z + Math.sin(a) * r;
        if (!paved.canLand(x, z) || list.some(function (d) { return Math.hypot(d.x - x, d.z - z) < 0.3; })) continue;
        var d = bird('sparrow', x, z); d.flock = sparrows.groups.length; list.push(d);
      }
      if (list.length < 2) return;
      sparrows.groups.push({ x: center.x, z: center.z, birds: list }); sparrows.birds.push.apply(sparrows.birds, list);
    });
    paths.forEach(function (g) {
      if (wagtails.length >= 5 || wagtails.some(function (d) { return Math.hypot(d.x - g.x, d.z - g.z) < 100; })) return;
      wagtails.push(bird('wagtail', g.x, g.z));
    });
    var trees = habitats.order(park.trees.filter(function (t, i) { return i % 3 === 0 && forest.canForage(t[0] + 3, t[1] + 2); })
      .map(function (t) { return { x: t[0] + 3, z: t[1] + 2, tree: t }; }), park.start);
    var perches = trees.map(function (s) { return { x: s.tree[0] + 1.1, z: s.tree[1] + 0.9, tree: s.tree }; })
      .filter(function (s) { return forest.canFly(s.x, s.z); });
    trees.forEach(function (site) {
      if (titGroups.length < 80 && titGroups.every(function (g) { return Math.hypot(g.x - site.x, g.z - site.z) > 32; })) {
        var list = [], count = 2 + Math.floor(random() * 4);
        for (var i = 0; i < count; i++) {
          var choices = perches.filter(function (p) { return Math.hypot(p.x - site.x, p.z - site.z) < 10; });
          if (!choices.length) continue;
          var perch = choices[(i + Math.floor(random() * choices.length)) % choices.length];
          var d = bird('tit', perch.x, perch.z);
          d.y = 2 + random() * 2; d.tree = perch.tree;
          list.push(d); tits.push(d);
        }
        if (list.length >= 2) titGroups.push({ x: site.x, z: site.z, birds: list });
      }
      if (squirrels.length < 40 && squirrels.every(function (d) { return Math.hypot(d.x - site.x, d.z - site.z) > 40; })) {
        var d = bird('squirrel', site.x, site.z); d.carrying = false; d.action = 'rest'; squirrels.push(d);
      }
    });
    return { sparrows: sparrows, tits: tits, titGroups: titGroups, wagtails: wagtails, squirrels: squirrels,
      forestTrees: perches, birds: sparrows.birds.concat(tits, wagtails), forest: forest, paved: paved, random: random,
      calls: { sparrow: 2, tit: 3, wagtail: 5 } };
  }
  function update(pop, dt, car, dogs, onCall, birdsActive) {
    var random = pop.random, threats = [car].concat(dogs || []);
    function target(d, canGo, radius, flee) {
      for (var i = 0; i < 24; i++) {
        var a = flee ? Math.atan2(d.z - flee.z, d.x - flee.x) + (random() - 0.5) * 1.8 : random() * 6.28;
        var r = flee ? 4 + random() * radius : 0.5 + random() * radius;
        var t = { x: d.x + Math.cos(a) * r, z: d.z + Math.sin(a) * r };
        if (!flee && Math.hypot(t.x - d.anchorX, t.z - d.anchorZ) > radius * 2) continue;
        if (clear(canGo, d, t)) return t;
      }
      return null;
    }
    if (birdsActive !== false) {
      pigeons.update(pop.sparrows, dt * 1.8, car, function () {}, dogs);
      pop.wagtails.forEach(function (d) {
        if (d.dead) return;
        d.phase += dt * 10; d.pause -= dt;
        var threat = threats.find(function (s) { return Math.hypot(d.x - s.x, d.z - s.z) < 7; });
        if (threat || (!d.walk && d.pause <= 0)) { d.walk = target(d, pop.paved.canLand, threat ? 5 : 2, threat); d.pause = 0.5 + random() * 2; }
        if (!d.walk) return;
        var dx = d.walk.x - d.x, dz = d.walk.z - d.z, length = Math.hypot(dx, dz), step = Math.min(length, dt * (threat ? 2.8 : 0.6));
        d.heading = Math.atan2(dx, -dz); d.x += dx / (length || 1) * step; d.z += dz / (length || 1) * step;
        if (length < 0.03) d.walk = null;
      });
      pop.tits.forEach(function (d) {
        if (d.dead) return;
        d.phase += dt * 35; d.pause -= dt;
        if (d.flight) {
          var f = d.flight; f.t = Math.min(1, f.t + dt / f.duration);
          var ease = f.t * f.t * (3 - 2 * f.t);
          d.x = f.x + (f.tx - f.x) * ease; d.z = f.z + (f.tz - f.z) * ease;
          d.y = f.y + (f.ty - f.y) * ease + Math.sin(f.t * Math.PI) * 0.7;
          if (f.t === 1) { d.flight = null; d.pause = 0.6 + random() * 2.4; }
          return;
        }
        var threat = threats.find(function (s) { return Math.hypot(d.x - s.x, d.z - s.z) < 7; });
        if (d.pause > 0 && !threat) return;
        // Choose another real tree in the same local flock's woodland.
        var choices = pop.forestTrees.filter(function (tree) { return Math.hypot(tree.x - d.anchorX, tree.z - d.anchorZ) < 20 && Math.hypot(tree.x - d.x, tree.z - d.z) > 2; });
        var t = null;
        for (var i = 0; i < 16 && choices.length; i++) {
          var tree = choices[Math.floor(random() * choices.length)];
          if ((!threat || Math.hypot(tree.x - threat.x, tree.z - threat.z) > 8) && clear(pop.forest.canFly, d, tree)) { t = tree; break; }
        }
        if (!t) { d.pause = 1; return; }
        d.heading = Math.atan2(t.x - d.x, -(t.z - d.z));
        d.flight = { x: d.x, z: d.z, y: d.y, tx: t.x, tz: t.z, ty: 2 + random() * 2, t: 0, duration: Math.max(0.5, Math.hypot(t.x - d.x, t.z - d.z) / 9) };
      });
      Object.keys(pop.calls).forEach(function (kind) {
        pop.calls[kind] -= dt;
        if (pop.calls[kind] > 0) return;
        var nearby = pop.birds.filter(function (d) { return !d.dead && d.species === kind && Math.hypot(d.x - car.x, d.z - car.z) < 30; });
        pop.calls[kind] = nearby.length ? 4 + random() * 6 : 1;
        if (nearby.length && onCall) onCall(nearby[Math.floor(random() * nearby.length)]);
      });
    }
    pop.squirrels.forEach(function (d) {
      d.phase += dt * 12;
      if (d.action === 'dig') {
        d.pause -= dt;
        if (d.pause <= 0) { d.action = 'rest'; d.carrying = false; d.pause = 1 + random() * 3; }
        return;
      }
      if (!d.walk) {
        d.pause -= dt;
        if (d.pause > 0) return;
        if (d.carrying && random() < 0.45) { d.action = 'dig'; d.pause = 2.5; return; }
        if (!d.carrying && random() < 0.4) d.carrying = true;
        d.walk = target(d, pop.forest.canForage, 7); d.action = 'hop'; d.hop = 0;
        if (!d.walk) { d.action = 'rest'; d.pause = 1; return; }
      }
      var dx = d.walk.x - d.x, dz = d.walk.z - d.z, length = Math.hypot(dx, dz), step = Math.min(length, dt * 2.6);
      d.heading = Math.atan2(dx, -dz); d.x += dx / (length || 1) * step; d.z += dz / (length || 1) * step;
      d.hop += step * 5; d.y = Math.abs(Math.sin(d.hop)) * 0.25;
      if (length < 0.03) { d.walk = null; d.y = 0; d.action = 'rest'; d.pause = 0.5 + random() * 2; }
    });
  }
  var api = { shape: shape, create: create, update: update };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.SmallWildlife = api;
})(typeof window !== 'undefined' ? window : globalThis);

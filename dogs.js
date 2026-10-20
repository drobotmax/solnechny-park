// Four solitary park dogs; geometry uses the same point-cloud renderer.
(function (root) {
  'use strict';
  var COATS = [[45, 43, 42], [178, 104, 48], [221, 202, 160], [226, 222, 210]];
  function shape(coat, add, leg) {
    function oval(cx, cy, cz, rx, ry, rz, color) {
      for (var j = 0; j <= 18; j++) for (var i = 0; i < 40; i++) {
        var v = Math.PI * j / 18, a = Math.PI * 2 * i / 40;
        var x = cx + Math.sin(v) * Math.cos(a) * rx, y = cy + Math.cos(v) * ry, z = cz + Math.sin(v) * Math.sin(a) * rz;
        var c = color;
        if (!color) {
          var patch = Math.pow((x + 0.15) / 0.17, 2) + Math.pow((z - 0.08) / 0.23, 2) < 1 || Math.pow((x - 0.10) / 0.15, 2) + Math.pow((z + 0.25) / 0.16, 2) < 1 || (z < -0.35 && x > 0.01);
          c = coat === 3 && patch ? [56, 49, 42] : COATS[coat];
        }
        add(x * 0.5, y * 0.5, z * 0.5, c, 0.017, false);
      }
    }
    if (leg) {
      oval(0, -0.17, 0, 0.047, 0.18, 0.05);
      oval(0, -0.34, -0.035, 0.06, 0.045, 0.09);
      return;
    }
    oval(0, 0.58, 0, 0.20, 0.22, 0.43);
    oval(0, 0.70, -0.32, 0.15, 0.23, 0.16);
    oval(0, 0.87, -0.43, 0.15, 0.15, 0.17);
    oval(0, 0.80, -0.61, 0.09, 0.07, 0.14);
    oval(0, 0.82, -0.73, 0.058, 0.035, 0.03, [24, 24, 23]);
    [-1, 1].forEach(function (side) {
      oval(side * 0.14, 0.83, -0.36, 0.052, 0.14, 0.075, coat === 2 ? [177, 151, 108] : [53, 43, 34]);
      oval(side * 0.127, 0.91, -0.51, 0.020, 0.018, 0.018, [14, 17, 17]);
    });
    for (var t = 0; t < 1; t += 0.06) oval(0, 0.66 + t * 0.28, 0.35 + t * 0.31, 0.04, 0.04, 0.05);
  }
  function clearSegment(canRun, x, z, tx, tz) {
    var steps = Math.max(1, Math.ceil(Math.hypot(tx - x, tz - z) / 0.5));
    for (var i = 0; i <= steps; i++) if (!canRun(x + (tx - x) * i / steps, z + (tz - z) * i / steps)) return false;
    return true;
  }
  function create(park, flocks, canRun, random) {
    var dogs = [];
    flocks.forEach(function (g) {
      if (dogs.length >= 4 || g.size === 'solo' || !canRun(g.x, g.z)) return;
      if (dogs.some(function (d) { return Math.hypot(d.anchorX - g.x, d.anchorZ - g.z) < 120; })) return;
      for (var a = 0; a < Math.PI * 2; a += Math.PI / 8) {
        var x = g.x + Math.cos(a) * 12, z = g.z + Math.sin(a) * 12;
        if (Math.hypot(x - park.start[0], z - park.start[1]) < 8 || !clearSegment(canRun, x, z, g.x, g.z)) continue;
        dogs.push({ x: x, z: z, anchorX: g.x, anchorZ: g.z, coat: dogs.length,
          heading: Math.atan2(g.x - x, -(g.z - z)), v: 0, speed: 1.8 + dogs.length * 0.2,
          phase: random() * Math.PI * 2, pause: 0, target: { x: g.x, z: g.z } });
        break;
      }
    });
    return { dogs: dogs, flocks: flocks, canRun: canRun, random: random };
  }
  function update(population, dt, car) {
    population.dogs.forEach(function (d) {
      d.v = 0; d.pause -= dt;
      if (d.pause > 0) return;
      if (!d.target) {
        for (var i = 0; i < 50; i++) {
          var near = population.flocks.filter(function (g) { return Math.hypot(g.x - d.anchorX, g.z - d.anchorZ) < 35; });
          var flock = near.length && population.random() < 0.5 ? near[Math.floor(population.random() * near.length)] : null;
          var x = flock ? flock.x : d.anchorX + (population.random() - 0.5) * 50;
          var z = flock ? flock.z : d.anchorZ + (population.random() - 0.5) * 50;
          if (Math.hypot(x - d.x, z - d.z) > 3 && clearSegment(population.canRun, d.x, d.z, x, z)) { d.target = { x: x, z: z }; break; }
        }
        if (!d.target) { d.pause = 1; return; }
      }
      var dx = d.target.x - d.x, dz = d.target.z - d.z, distance = Math.hypot(dx, dz);
      var step = Math.min(distance, d.speed * dt), x = d.x + dx / Math.max(distance, 0.001) * step, z = d.z + dz / Math.max(distance, 0.001) * step;
      if (!population.canRun(x, z) || Math.hypot(x - car.x, z - car.z) < 1.2) { d.target = null; d.pause = 0.4; return; }
      d.heading = Math.atan2(dx, -dz); d.x = x; d.z = z; d.v = d.speed; d.phase += step * 9;
      if (distance < 0.2) { d.target = null; d.pause = 0.4 + population.random() * 1.2; }
    });
  }
  var api = { shape: shape, create: create, update: update };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Dogs = api;
})(typeof window !== 'undefined' ? window : globalThis);

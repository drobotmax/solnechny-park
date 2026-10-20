// Alternate arcade behavior for every bird species. No gore or bird collisions.
(function (root) {
  'use strict';
  function create(sources, canStand, random, fallback) {
    var birds = [];
    sources.forEach(function (entry) {
      entry.birds.forEach(function (source) {
        if (source.dead) return;
        var position = null, offset = random() * Math.PI * 2;
        for (var r = 0; r <= 80 && !position; r += 2) for (var i = 0; i < 20 && !position; i++) {
          var a = offset + i * Math.PI / 10, x = source.x + Math.cos(a) * r, z = source.z + Math.sin(a) * r;
          if (canStand(x, z)) position = { x: x, z: z };
        }
        if (!position && fallback) {
          for (var fr = 12; fr <= 80 && !position; fr += 2) for (var fi = 0; fi < 20 && !position; fi++) {
            var fa = offset + fi * Math.PI / 10, fx = fallback.x + Math.cos(fa) * fr, fz = fallback.z + Math.sin(fa) * fr;
            if (canStand(fx, fz)) position = { x: fx, z: fz };
          }
        }
        if (position) birds.push({ source: source, kind: entry.kind, x: position.x, z: position.z,
          heading: source.heading, phase: random() * Math.PI * 2, speed: 2.5 + random() * 1.5, dead: false });
      });
    });
    return { birds: birds, canStand: canStand, lastCar: null };
  }
  function update(pop, dt, car, onHit) {
    var last = pop.lastCar || car;
    if (Math.hypot(car.x - last.x, car.z - last.z) > Math.max(3, Math.abs(car.v) * dt * 2)) last = car;
    var dx = car.x - last.x, dz = car.z - last.z, length = dx * dx + dz * dz;
    pop.birds.forEach(function (d) {
      if (d.dead) return;
      var t = length ? Math.max(0, Math.min(1, ((d.x - last.x) * dx + (d.z - last.z) * dz) / length)) : 1;
      if (Math.abs(car.v) > 0.4 && Math.hypot(d.x - last.x - dx * t, d.z - last.z - dz * t) < 0.8) {
        d.dead = d.source.dead = true;
        if (onHit) onHit(d);
        return;
      }
      var distance = Math.hypot(car.x - d.x, car.z - d.z);
      if (distance < 0.3) return;
      var angle = Math.atan2(car.z - d.z, car.x - d.x), step = Math.min(distance - 0.2, dt * d.speed);
      var offsets = [0, 0.4, -0.4, 0.85, -0.85, 1.35, -1.35];
      for (var i = 0; i < offsets.length; i++) {
        var a = angle + offsets[i], x = d.x + Math.cos(a) * step, z = d.z + Math.sin(a) * step;
        if (!pop.canStand(x, z)) continue;
        d.heading = Math.atan2(x - d.x, -(z - d.z)); d.x = x; d.z = z; d.phase += step * 12;
        break;
      }
    });
    pop.lastCar = { x: car.x, z: car.z };
  }
  var api = { create: create, update: update };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.DoomBirds = api;
})(typeof window !== 'undefined' ? window : globalThis);

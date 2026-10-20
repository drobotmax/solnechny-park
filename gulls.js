// Black-headed gulls in winter plumage, circling over verified water discs.
(function (root) {
  'use strict';
  function shape(add, wing) {
    function oval(cx, cy, cz, rx, ry, rz, color) {
      for (var j = 0; j <= 10; j++) for (var i = 0; i < 24; i++) {
        var v = Math.PI * j / 10, a = Math.PI * 2 * i / 24;
        add(cx + Math.sin(v) * Math.cos(a) * rx, cy + Math.cos(v) * ry,
          cz + Math.sin(v) * Math.sin(a) * rz, color, 0.022, false);
      }
    }
    if (wing) {
      for (var x = 0; x <= 0.49; x += 0.014) {
        var mid = x * 0.28, width = 0.12 * (1 - x / 0.52);
        for (var z = mid - width; z <= mid + width; z += 0.014) {
          add(x, 0, z, x > 0.38 ? [40, 44, 50] : z < mid ? [236, 239, 239] : [171, 182, 193], 0.021, false);
        }
      }
      return;
    }
    oval(0, 0, 0, 0.08, 0.075, 0.18, [239, 241, 238]);
    oval(0, 0.055, -0.17, 0.055, 0.061, 0.065, [244, 245, 240]);
    oval(0, 0.035, -0.255, 0.015, 0.012, 0.052, [158, 47, 37]);
    oval(0, 0.015, 0.19, 0.068, 0.018, 0.09, [240, 242, 238]);
    [-1, 1].forEach(function (s) {
      oval(s * 0.052, 0.065, -0.15, 0.009, 0.021, 0.015, [56, 58, 59]);
      oval(s * 0.045, 0.074, -0.20, 0.007, 0.007, 0.007, [23, 25, 28]);
      oval(s * 0.035, -0.06, 0.10, 0.009, 0.009, 0.055, [155, 52, 39]);
    });
  }
  function create(groups, random) {
    var birds = [];
    groups.forEach(function (g) {
      for (var i = 0; i < 3; i++) birds.push({ cx: g.x, cz: g.z,
        x: g.x, z: g.z, y: 9, height: 7 + random() * 6, radius: 3.5 + random() * 1.5,
        phase: random() * Math.PI * 2, speed: 0.45 + random() * 0.2,
        heading: 0, pitch: 0, wing: 0, dive: null, wait: 12 + random() * 45, plunge: random() < 0.5 });
    });
    var population = { birds: birds, random: random };
    update(population, 0);
    return population;
  }
  function update(pop, dt, onDive) {
    pop.birds.forEach(function (d) {
      d.wait -= dt;
      if (d.dive === null && d.wait <= 0) {
        d.dive = 0; d.plunge = !d.plunge;
        if (onDive) onDive(d);
      }
      d.phase += dt * d.speed; d.wing += dt * 9;
      d.x = d.cx + Math.cos(d.phase) * d.radius;
      d.z = d.cz + Math.sin(d.phase) * d.radius;
      d.heading = d.phase + Math.PI;
      var previousY = d.y;
      if (d.dive !== null) {
        d.dive += dt;
        var t = d.dive, low = d.plunge ? -0.12 : 0.65;
        if (t < 2) d.y = low + (d.height - low) * (1 + Math.cos(Math.PI * t / 2)) / 2;
        else if (t < 3) d.y = low;
        else d.y = low + (d.height - low) * (1 - Math.cos(Math.PI * Math.min(1, (t - 3) / 3))) / 2;
        if (t >= 6) { d.dive = null; d.wait = 35 + pop.random() * 35; }
      } else d.y = d.height + Math.sin(d.phase * 2) * 0.3;
      d.pitch = dt > 0 ? Math.atan2((d.y - previousY) / dt, d.radius * d.speed) : 0;
    });
  }
  var api = { shape: shape, create: create, update: update };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Gulls = api;
})(typeof window !== 'undefined' ? window : globalThis);

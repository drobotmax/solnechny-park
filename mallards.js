// Point-cloud waterbirds. Local forward is -Z, matching the stroller.
(function (root) {
  'use strict';
  function shape(male, add, coot) {
    function ellipsoid(cx, cy, cz, rx, ry, rz, color) {
      for (var j = 0; j <= 12; j++) {
        var v = Math.PI * j / 12;
        for (var i = 0; i < 28; i++) {
          var a = Math.PI * 2 * i / 28;
          var x = cx + Math.sin(v) * Math.cos(a) * rx;
          var y = cy + Math.cos(v) * ry;
          var z = cz + Math.sin(v) * Math.sin(a) * rz;
          var c = typeof color === 'function' ? color(x, y, z, i, j) : color;
          add(x, y, z, c, 0.024, false);
        }
      }
    }
    if (coot) {
      ellipsoid(0, 0.18, 0.03, 0.15, 0.16, 0.26, [49, 53, 56]);
      ellipsoid(0, 0.30, -0.14, 0.075, 0.13, 0.08, [31, 34, 36]);
      ellipsoid(0, 0.42, -0.20, 0.082, 0.087, 0.086, [25, 28, 30]);
      ellipsoid(0, 0.405, -0.30, 0.035, 0.028, 0.065, [230, 228, 213]);
      ellipsoid(0, 0.463, -0.269, 0.033, 0.058, 0.015, [245, 243, 229]);
      [-1, 1].forEach(function (side) {
        ellipsoid(side * 0.13, 0.23, 0.06, 0.026, 0.085, 0.17, [61, 65, 68]);
        ellipsoid(side * 0.077, 0.445, -0.232, 0.010, 0.011, 0.011, [154, 36, 28]);
      });
      ellipsoid(0, 0.23, 0.27, 0.06, 0.05, 0.07, [36, 39, 41]);
      return;
    }
    var brown = function (x, y, z, i, j) { return (i + j * 3) % 5 < 2 ? [89, 62, 36] : [161, 124, 76]; };
    ellipsoid(0, 0.17, 0.04, 0.17, 0.15, 0.30, male ? [174, 177, 164] : brown);
    ellipsoid(0, 0.20, -0.17, 0.135, 0.14, 0.12, male ? [106, 57, 43] : brown);
    ellipsoid(0, 0.34, -0.20, 0.065, 0.12, 0.065, male ? [25, 95, 57] : brown);
    if (male) ellipsoid(0, 0.29, -0.20, 0.069, 0.018, 0.069, [239, 235, 211]);
    ellipsoid(0, 0.43, -0.23, 0.087, 0.085, 0.095, male ? [22, 111, 66] : brown);
    ellipsoid(0, 0.405, -0.345, 0.047, 0.022, 0.075, male ? [217, 181, 49] : [190, 130, 56]);
    if (!male) ellipsoid(0, 0.426, -0.35, 0.020, 0.005, 0.05, [57, 45, 31]);
    [-1, 1].forEach(function (side) {
      ellipsoid(side * 0.155, 0.22, 0.07, 0.025, 0.075, 0.19, male ? [129, 133, 120] : brown);
      ellipsoid(side * 0.178, 0.24, 0.09, 0.008, 0.034, 0.078, [230, 228, 210]);
      ellipsoid(side * 0.184, 0.24, 0.09, 0.007, 0.020, 0.060, [57, 65, 160]);
      if (!male) ellipsoid(side * 0.080, 0.447, -0.24, 0.010, 0.012, 0.055, [77, 52, 30]);
      ellipsoid(side * 0.083, 0.45, -0.27, 0.012, 0.012, 0.012, [13, 17, 12]);
    });
    ellipsoid(0, 0.20, 0.33, 0.080, 0.05, 0.12, male ? [35, 42, 35] : brown);
  }

  function create(park, catAt, random) {
    var sites = [], groups = [], ducks = [], coots = [], spacing = 6, radius = 6.2;
    // Entire swimming disc must be real mapped water, including its interior.
    function waterDisc(x, z) {
      var step = park.mpp, half = step / 2;
      var x0 = Math.floor((x - radius - park.x0) / step), x1 = Math.floor((x + radius - park.x0) / step);
      var z0 = Math.floor((z - radius - park.z0) / step), z1 = Math.floor((z + radius - park.z0) / step);
      for (var iz = z0; iz <= z1; iz++) for (var ix = x0; ix <= x1; ix++) {
        var px = park.x0 + (ix + 0.5) * step, pz = park.z0 + (iz + 0.5) * step;
        var dx = Math.max(0, Math.abs(px - x) - half), dz = Math.max(0, Math.abs(pz - z) - half);
        if (dx * dx + dz * dz <= radius * radius && catAt(px, pz) !== 4) return false;
      }
      return true;
    }
    for (var z = park.z0 + radius; z < park.z0 + park.h * park.mpp - radius; z += spacing) {
      for (var x = park.x0 + radius; x < park.x0 + park.w * park.mpp - radius; x += spacing) {
        if (catAt(x, z) !== 4) continue;
        var shore = null;
        for (var a = 0; a < Math.PI * 2; a += Math.PI / 8) {
          var sx = x + Math.cos(a) * 15, sz = z + Math.sin(a) * 15;
          if ([2, 3, 11].indexOf(catAt(sx, sz)) >= 0) { shore = [sx, sz]; break; }
        }
        if (shore && waterDisc(x, z)) sites.push({ x: x, z: z, shore: shore });
      }
    }
    sites.sort(function (a, b) {
      return Math.hypot(a.x - park.start[0], a.z - park.start[1]) - Math.hypot(b.x - park.start[0], b.z - park.start[1]);
    });
    sites.forEach(function (site) {
      if (groups.length >= 12 || groups.some(function (g) { return Math.hypot(g.x - site.x, g.z - site.z) < 65; })) return;
      var neighbor = sites.find(function (s) {
        var distance = Math.hypot(s.x - site.x, s.z - site.z);
        return distance >= 14 && distance <= 26;
      });
      if (!neighbor) return;
      groups.push({ x: site.x, z: site.z, shore: site.shore, coots: neighbor });
      function flock(list, center, count, species) {
        for (var i = 0; i < count; i++) {
          list.push({ species: species, male: species === 'mallard' && i % 2 === 0,
            cx: center.x, cz: center.z, x: center.x, z: center.z,
            radius: 1.1 + Math.sqrt(i / count) * 4.5,
            phase: i / count * Math.PI * 2 + random() * 0.3,
            speed: 0.025 + random() * 0.02, direction: random() < 0.5 ? -1 : 1, heading: 0 });
        }
      }
      flock(ducks, site, 12, 'mallard');
      flock(coots, neighbor, 24, 'coot');
    });
    return { groups: groups, ducks: ducks, coots: coots, birds: ducks.concat(coots) };
  }
  function update(ducks, dt) {
    ducks.forEach(function (d) {
      d.phase += dt * d.speed * d.direction;
      d.x = d.cx + Math.cos(d.phase) * d.radius;
      d.z = d.cz + Math.sin(d.phase) * d.radius;
      d.heading = d.phase + (d.direction > 0 ? Math.PI : 0);
    });
  }
  var api = { shape: shape, create: create, update: update };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Mallards = api;
})(typeof window !== 'undefined' ? window : globalThis);

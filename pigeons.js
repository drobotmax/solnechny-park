// Pigeons on paved paths. They never enter the stroller's collision map.
(function (root) {
  'use strict';
  function shape(add, wing) {
    function oval(cx, cy, cz, rx, ry, rz, color) {
      for (var j = 0; j <= 9; j++) for (var i = 0; i < 20; i++) {
        var v = Math.PI * j / 9, a = Math.PI * 2 * i / 20;
        add(cx + Math.sin(v) * Math.cos(a) * rx, cy + Math.cos(v) * ry,
          cz + Math.sin(v) * Math.sin(a) * rz, color, 0.019, false);
      }
    }
    if (wing) {
      oval(0.18, 0, 0.025, 0.18, 0.018, 0.105, [128, 133, 142]);
      oval(0.23, -0.008, 0.09, 0.12, 0.012, 0.045, [53, 59, 68]);
      return;
    }
    oval(0, 0.16, 0.02, 0.105, 0.13, 0.18, [130, 136, 146]);
    oval(0, 0.28, -0.10, 0.063, 0.10, 0.068, [56, 96, 85]);
    oval(0, 0.36, -0.13, 0.062, 0.064, 0.066, [83, 89, 104]);
    oval(0, 0.345, -0.21, 0.022, 0.014, 0.040, [47, 46, 46]);
    oval(0, 0.347, -0.18, 0.026, 0.018, 0.018, [216, 210, 198]);
    [-1, 1].forEach(function (side) {
      oval(side * 0.09, 0.19, 0.04, 0.022, 0.075, 0.14, [146, 151, 157]);
      [-0.01, 0.055].forEach(function (z) { oval(side * 0.11, 0.21, z, 0.008, 0.045, 0.014, [48, 52, 62]); });
      oval(side * 0.057, 0.375, -0.15, 0.008, 0.008, 0.008, [202, 111, 40]);
      oval(side * 0.04, 0.035, 0.03, 0.009, 0.035, 0.01, [169, 85, 85]);
    });
    oval(0, 0.115, 0.22, 0.065, 0.025, 0.09, [64, 69, 79]);
  }

  function create(park, canLand, random) {
    var sites = [], groups = [], birds = [];
    function openArea(x, z) {
      var sum = 0;
      for (var a = 0; a < Math.PI * 2; a += Math.PI / 8) {
        var reach = 0;
        for (var d = 3; d <= 18; d += 3) {
          if (!canLand(x + Math.cos(a) * d, z + Math.sin(a) * d)) break;
          reach = d;
        }
        sum += reach * reach;
      }
      return sum * Math.PI / 16;
    }
    for (var z = park.z0 + 5; z < park.z0 + park.h * park.mpp - 5; z += 10) {
      for (var x = park.x0 + 5; x < park.x0 + park.w * park.mpp - 5; x += 10) {
        if (canLand(x, z) && Math.hypot(x - park.start[0], z - park.start[1]) > 12) sites.push({ x: x, z: z, area: openArea(x, z) });
      }
    }
    sites.sort(function (a, b) { return Math.hypot(a.x - park.start[0], a.z - park.start[1]) - Math.hypot(b.x - park.start[0], b.z - park.start[1]); });
    function addGroup(site, count, radius, size) {
      var list = [];
      for (var tries = 0; tries < 800 && list.length < count; tries++) {
        var a = random() * Math.PI * 2, r = Math.sqrt(random()) * radius;
        var x = site.x + Math.cos(a) * r, z = site.z + Math.sin(a) * r;
        if (!canLand(x, z) || list.some(function (d) { return Math.hypot(x - d.x, z - d.z) < 0.42; })) continue;
        list.push({ x: x, z: z, homeX: x, homeZ: z, anchorX: x, anchorZ: z, flock: groups.length, y: 0, heading: random() * Math.PI * 2, phase: random() * Math.PI * 2, flight: null, walk: null, pause: 1 + random() * 4 });
      }
      if (list.length !== count) return false;
      groups.push({ x: site.x, z: site.z, size: size, area: site.area || 0, spacing: site.area >= 450 ? 12 : site.area >= 150 ? 22 : 38, birds: list });
      birds.push.apply(birds, list);
      return true;
    }
    var flocks = 0;
    sites.forEach(function (site) {
      var spacing = site.area >= 450 ? 12 : site.area >= 150 ? 22 : 38;
      if (groups.some(function (g) { return g.size !== 'solo' && Math.hypot(site.x - g.x, site.z - g.z) < Math.max(spacing, g.spacing); })) return;
      var level = site.area >= 450 ? [2, 2, 1, 0][flocks % 4] : site.area >= 150 ? flocks % 2 : 0;
      if (!addGroup(site, [4, 10, 22][level], [1.4, 2.2, 3.5][level], ['small', 'medium', 'large'][level])) return;
      flocks++;
      if (flocks % 6 !== 0) return;
      for (var a = 0; a < Math.PI * 2; a += Math.PI / 8) {
        var solo = { x: site.x + Math.cos(a) * 8, z: site.z + Math.sin(a) * 8 };
        if (canLand(solo.x, solo.z) && addGroup(solo, 1, 0, 'solo')) break;
      }
    });
    return { groups: groups, birds: birds, canLand: canLand, random: random };
  }

  function update(population, dt, car, onTakeoff, dogs) {
    var threats = [car].concat(dogs || []);
    population.groups.forEach(function (group) {
      var threat = threats.find(function (source) {
        return group.birds.some(function (d) { return !d.flight && Math.hypot(d.x - source.x, d.z - source.z) < 4.5 + Math.abs(source.v) * 0.35; });
      });
      if (threat) {
        group.birds.forEach(function (d, i) {
          if (d.flight) return;
          d.walk = null; d.pause = 2;
          var dx = d.homeX - threat.x, dz = d.homeZ - threat.z, distance = Math.hypot(dx, dz);
          if (distance < 0.1) { dx = Math.sin(d.heading); dz = -Math.cos(d.heading); distance = 1; }
          d.flight = { t: -i * 0.018, dx: dx / distance * 8, dz: dz / distance * 8, mode: 'up', angle: 0, start: { x: d.x, y: d.y, z: d.z } };
          d.heading = Math.atan2(dx, -dz);
        });
        onTakeoff(group);
      }
    });
    population.birds.forEach(function (d) {
      var f = d.flight;
      if (!f) {
        d.pause -= dt;
        if (d.pause > 0) return;
        if (!d.walk) {
          for (var tries = 0; tries < 8; tries++) {
            var angle = population.random() * Math.PI * 2, radius = 0.3 + population.random();
            var tx = d.anchorX + Math.cos(angle) * radius, tz = d.anchorZ + Math.sin(angle) * radius;
            var clear = true;
            for (var t = 0; t <= 1; t += 0.2) if (!population.canLand(d.x + (tx - d.x) * t, d.z + (tz - d.z) * t)) { clear = false; break; }
            if (clear) { d.walk = { x: tx, z: tz }; break; }
          }
          if (!d.walk) { d.pause = 1; return; }
        }
        var wx = d.walk.x - d.x, wz = d.walk.z - d.z, distance = Math.hypot(wx, wz);
        var step = Math.min(distance, dt * 0.22), nx = d.x + wx / Math.max(distance, 0.001) * step, nz = d.z + wz / Math.max(distance, 0.001) * step;
        if (!population.canLand(nx, nz) || population.groups[d.flock].birds.some(function (other) { return other !== d && !other.flight && Math.hypot(other.x - nx, other.z - nz) < 0.35; })) {
          d.walk = null; d.pause = 0.5 + population.random(); return;
        }
        d.x = d.homeX = nx; d.z = d.homeZ = nz;
        if (distance > 0.01) d.heading = Math.atan2(wx, -wz);
        if (distance < 0.03) { d.walk = null; d.pause = 1 + population.random() * 4; }
        return;
      }
      f.t += dt;
      if (f.t < 0) return;
      var safe = threats.every(function (source) { return Math.hypot(d.homeX - source.x, d.homeZ - source.z) > 7; });
      var oldX = d.x, oldZ = d.z;
      if (f.mode === 'up') {
        var up = Math.min(1, f.t / 1.2), ease = up * up * (3 - 2 * up);
        d.x = f.start.x + (d.homeX + f.dx - f.start.x) * ease;
        d.z = f.start.z + (d.homeZ + f.dz - f.start.z) * ease;
        d.y = f.start.y + (2.6 - f.start.y) * Math.sin(up * Math.PI / 2);
        if (up >= 1) { f.mode = 'circle'; f.angle = 0; }
      } else if (f.mode === 'circle') {
        f.angle += dt * 0.9;
        var c = Math.cos(f.angle), s = Math.sin(f.angle);
        d.x = d.homeX + f.dx * c - f.dz * s;
        d.z = d.homeZ + f.dx * s + f.dz * c;
        d.y = 2.6 + 0.12 * Math.sin(f.t * 4 + d.phase);
        if (f.angle >= Math.PI * 2 && safe) {
          f.mode = 'land'; f.returnTime = 0; f.start = { x: d.x, y: d.y, z: d.z };
        }
      } else {
        if (!safe) {
          var source = threats.find(function (s) { return Math.hypot(d.homeX - s.x, d.homeZ - s.z) <= 7; });
          var ax = d.x - source.x, az = d.z - source.z, length = Math.hypot(ax, az);
          if (length < 0.1) { ax = Math.sin(d.heading); az = -Math.cos(d.heading); length = 1; }
          f.dx = ax / length * 8; f.dz = az / length * 8;
          f.mode = 'up'; f.t = 0; f.start = { x: d.x, y: d.y, z: d.z };
        } else {
          f.returnTime = Math.min(1, f.returnTime + dt / 1.6);
          var back = f.returnTime * f.returnTime * (3 - 2 * f.returnTime);
          d.x = f.start.x + (d.homeX - f.start.x) * back;
          d.z = f.start.z + (d.homeZ - f.start.z) * back;
          d.y = f.start.y * (1 - back);
          if (f.returnTime >= 1) { d.flight = null; d.x = d.homeX; d.z = d.homeZ; d.y = 0; }
        }
      }
      if (Math.hypot(d.x - oldX, d.z - oldZ) > 0.001) d.heading = Math.atan2(d.x - oldX, -(d.z - oldZ));
    });
  }
  var api = { shape: shape, create: create, update: update };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Pigeons = api;
})(typeof window !== 'undefined' ? window : globalThis);

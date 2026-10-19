const { test } = require('node:test');
const assert = require('node:assert/strict');
const Mallards = require('../mallards.js');
const park = { x0: 0, z0: 0, w: 250, h: 250, mpp: 1, start: [5, 5] };
const catAt = (x, z) => x >= 12 && x < 235 && z >= 0 && z < 250 ? 4 : 2;

test('mallard and larger neighbouring coot flocks stay on water for a full orbit', () => {
  const { ducks, coots, birds, groups } = Mallards.create(park, catAt, () => 0.4);
  assert.ok(groups.length > 0);
  assert.ok(groups.length <= 12);
  assert.equal(ducks.length, groups.length * 12);
  assert.equal(coots.length, groups.length * 24);
  for (const group of groups) {
    const distance = Math.hypot(group.x - group.coots.x, group.z - group.coots.z);
    assert.ok(distance >= 14 && distance <= 26);
  }
  assert.equal(ducks.filter(d => d.male).length, ducks.length / 2);
  for (let t = 0; t < 400; t++) {
    Mallards.update(birds, 1);
    for (const d of birds) {
      for (const dx of [-0.5, 0, 0.5]) for (const dz of [-0.5, 0, 0.5]) {
        assert.equal(catAt(d.x + dx, d.z + dz), 4);
      }
      // Local -Z points along the orbit's actual tangent.
      assert.ok(Math.sin(d.heading) * (-Math.sin(d.phase) * d.direction) +
        -Math.cos(d.heading) * (Math.cos(d.phase) * d.direction) > 0.999);
    }
  }
});

test('dry land and narrow water cannot spawn mallards', () => {
  assert.equal(Mallards.create(park, () => 2, () => 0.5).ducks.length, 0);
  assert.equal(Mallards.create(park, (x) => x > 12 && x < 14 ? 4 : 2, () => 0.5).ducks.length, 0);
});

test('male and female clouds have distinct plumage and finite geometry', () => {
  const clouds = [false, true].map(male => {
    const points = [];
    Mallards.shape(male, (x, y, z, c, size) => {
      assert.ok([x, y, z, ...c, size].every(Number.isFinite));
      points.push(c.join(','));
    });
    return new Set(points);
  });
  assert.ok(clouds[1].has('22,111,66'));
  assert.ok(!clouds[0].has('22,111,66'));
  assert.ok(clouds[0].has('161,124,76'));
  assert.ok(clouds.every(c => c.has('57,65,160')));
});

test('coots have dark plumage, white bill and shield, and no mallard markings', () => {
  const colors = new Set();
  Mallards.shape(false, (x, y, z, c, size) => {
    assert.ok([x, y, z, ...c, size].every(Number.isFinite));
    colors.add(c.join(','));
  }, true);
  assert.ok(colors.has('25,28,30'));
  assert.ok(colors.has('230,228,213'));
  assert.ok(colors.has('245,243,229'));
  assert.ok(!colors.has('22,111,66'));
  assert.ok(!colors.has('57,65,160'));
});

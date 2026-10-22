const {test} = require('node:test');
const assert = require('node:assert/strict');
const {shadowMap, foliageMask} = require('../park-atmosphere.js');
const {forestEntries, bridgeEntries, build, terrainHeight} = require('../park-meshes.js');
const park = require('../park/park.json');

test('canopy shade projects away from the sun, has soft edges and capped overlap', () => {
  const frame = {x0: -50, z0: -50, w: 100, h: 100, mpp: 1};
  const tree = [0, 0, 20, 5];
  const one = shadowMap(frame, [tree], 200);
  const two = shadowMap(frame, [tree, tree], 200);
  assert.deepEqual(one.data, two.data, 'overlapping crowns must not make black ground');
  const sample = (x, z) => one.data[Math.floor((z + 50) * 2) * 200 + Math.floor((x + 50) * 2)];
  const x = .45 / .82 * 20 * .65, z = .32 / .82 * 20 * .65;
  assert(sample(x, z) > 180);
  assert.equal(sample(-12, -12), 0, 'shade cannot fall toward the sun');
  assert(sample(x + 4.5, z) > 0 && sample(x + 4.5, z) < sample(x, z));
  assert.equal(sample(x + 9, z), 0);
  assert(one.data.every(v => v <= 190));
  assert(shadowMap(frame, [], 32).data.every(v => v === 0));
});

test('foliage texture contains separate leaves, soft coverage and stable lighting', () => {
  const mask = foliageMask();
  assert.deepEqual(mask, foliageMask());
  const alpha = mask.data.filter((v, i) => i % 2 === 0);
  const covered = alpha.filter(v => v > 128).length / alpha.length;
  assert(covered > .2 && covered < .7, 'leaves need both substance and visible gaps');
  assert(alpha.some(v => v > 0 && v < 255), 'edges need partial coverage');
  assert(alpha.slice(0, mask.width).every(v => v === 0));
  assert(mask.data.some((v, i) => i % 2 === 1 && v > 180));
});

test('streamed forest meshes retain every mapped trunk and have bounded finite geometry', () => {
  const entries = forestEntries(park.trees);
  assert.equal(entries.reduce((n, e) => n + e.trees.length, 0), park.trees.length);
  assert.equal(new Set(entries.map(e => e.id)).size, entries.length);
  const single = [8, -448, 18, 4];
  for (const e of [forestEntries([single])[0], ...entries.filter((_, i) => i % 40 === 0)]) {
    const g = build(e);
    assert(g.n > 0 && g.n % 3 === 0);
    for (let i = 0; i < g.data.length; i += 10) {
      const v = Array.from(g.data.subarray(i, i + 10));
      assert(v.every(Number.isFinite), e.id);
      assert(Math.abs(Math.hypot(...v.slice(3, 6)) - 1) < 1e-5);
      assert(Math.hypot(v[0] - e.cx, v[1] - 5, v[2] - e.cz) <= g.radius + .001);
    }
  }
  const trunk = build(forestEntries([single])[0]);
  const heights = Array.from(trunk.data).filter((_, i) => i % 10 === 1);
  assert(Math.abs(Math.min(...heights) - terrainHeight(single[0], single[1])) < .02);
  assert.deepEqual(build(entries[0]).data, build(entries[0]).data);
});

test('solid entrance rails follow the two mapped sidewalks and sloped terrain', () => {
  const entries = bridgeEntries(park);
  assert.equal(entries.length, 2);
  let total = 0;
  for (const e of entries) {
    const source = park.bridges.find(b => 'bridge:' + b.osm_id === e.id);
    assert.deepEqual(e.pts, source.pts);
    const mesh = build(e);
    total += mesh.data.byteLength;
    assert(mesh.n > 1000);
    for (let i = 0; i < mesh.data.length; i += 10) {
      const [x, y, z] = mesh.data.subarray(i, i + 3);
      assert(Number.isFinite(x + y + z));
      const height = y - terrainHeight(x, z);
      assert(height >= -.02 && height < 1.3, 'rails must follow the bridge rather than float');
    }
  }
  assert(total < 4 * 1024 * 1024);
});

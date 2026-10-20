const {test} = require('node:test');
const assert = require('node:assert/strict');
const {order} = require('../habitat-sites.js');

test('a small quota reaches distant habitat corners before filling nearby sites', () => {
  const sites = Array.from({length: 121}, (_, i) => ({x: i % 11 * 100, z: Math.floor(i / 11) * 100}));
  for (const start of [[0, 0], [1000, 1000]]) {
    const ranked = order(sites, start);
    assert.equal(new Set(ranked).size, sites.length);
    for (const [x, z] of [[0, 0], [0, 1000], [1000, 0], [1000, 1000]]) {
      assert.ok(ranked.slice(0, 4).some(s => s.x === x && s.z === z));
    }
  }
  assert.equal(order([], [0, 0]).length, 0);
});

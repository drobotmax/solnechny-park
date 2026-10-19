const { test } = require('node:test');
const assert = require('node:assert/strict');
const Pigeons = require('../pigeons.js');
const park = { x0: 0, z0: 0, w: 260, h: 260, mpp: 1, start: [5, 5] };
function random() {
  let seed = 251;
  return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
}
function population(isolate = true) {
  const p = Pigeons.create(park, (x, z) => x > 0 && x < 260 && z > 0 && z < 260, random());
  if (isolate) { p.groups = [p.groups[0]]; p.birds = p.groups[0].birds; }
  return p;
}

test('paved sites support small, medium and large flocks with sparse nearby singles', () => {
  const p = population(false);
  for (const [size, count] of [['small', 4], ['medium', 10], ['large', 22], ['solo', 1]]) {
    const groups = p.groups.filter(g => g.size === size);
    assert.ok(groups.length > 0);
    for (const g of groups) assert.equal(g.birds.length, count);
  }
  for (const g of p.groups.filter(g => g.size === 'solo')) {
    assert.ok(p.groups.some(f => f.size !== 'solo' && Math.abs(Math.hypot(f.x - g.x, f.z - g.z) - 8) < 0.001));
  }
  assert.ok(p.groups.filter(g => g.size === 'solo').length <= p.groups.filter(g => g.size !== 'solo').length / 6);
  assert.equal(Pigeons.create(park, () => false, random()).birds.length, 0);
});

test('a stroller flushes the whole flock once and birds wait for safe landing', () => {
  const p = population(), g = p.groups[0];
  const car = { x: -100, z: -100, v: 0 };
  let takeoffs = 0;
  const sound = () => takeoffs++;
  Pigeons.update(p, 0.1, car, sound);
  assert.equal(takeoffs, 0);
  car.x = g.x; car.z = g.z; car.v = 7;
  Pigeons.update(p, 0.1, car, sound);
  assert.equal(takeoffs, 1);
  assert.ok(g.birds.every(d => d.flight));
  for (let i = 0; i < 120; i++) Pigeons.update(p, 0.05, car, sound);
  assert.equal(takeoffs, 1);
  assert.ok(g.birds.every(d => d.y > 2 && d.flight));
  car.x = -100; car.z = -100;
  for (let i = 0; i < 60; i++) Pigeons.update(p, 0.05, car, sound);
  assert.ok(g.birds.every(d => !d.flight && d.y === 0 && d.x === d.homeX && d.z === d.homeZ));
});

test('an interrupted landing returns to flight smoothly without landing on the player', () => {
  const p = population(), g = p.groups[0], car = { x: g.x, z: g.z, v: 0 };
  const sound = () => {};
  for (let i = 0; i < 90; i++) Pigeons.update(p, 0.05, car, sound);
  car.x = -100; car.z = -100;
  for (let i = 0; i < 12; i++) Pigeons.update(p, 0.05, car, sound);
  const before = g.birds.map(d => [d.x, d.y, d.z]);
  car.x = g.x; car.z = g.z;
  Pigeons.update(p, 0.05, car, sound);
  g.birds.forEach((d, i) => {
    assert.ok(Math.hypot(d.x - before[i][0], d.y - before[i][1], d.z - before[i][2]) < 0.5);
    assert.ok(d.flight && d.y > 0);
  });
});

test('both folded pigeon and spread wing clouds have finite geometry', () => {
  for (const wing of [false, true]) {
    let points = 0;
    Pigeons.shape((x, y, z, c, size) => { assert.ok([x, y, z, ...c, size].every(Number.isFinite)); points++; }, wing);
    assert.ok(points > 200);
  }
});

test('a grounded pigeon can take off again while the rest of its flock is still airborne', () => {
  const p = population(), g = p.groups[0], car = { x: g.x, z: g.z, v: 0 };
  let takeoffs = 0;
  const sound = () => takeoffs++;
  Pigeons.update(p, 0.1, car, sound);
  const landed = g.birds[0], flying = g.birds[1], flight = flying.flight;
  landed.flight = null; landed.x = landed.homeX; landed.z = landed.homeZ; landed.y = 0;
  car.x = landed.x; car.z = landed.z;
  Pigeons.update(p, 0.1, car, sound);
  assert.ok(landed.flight);
  assert.equal(flying.flight, flight);
  assert.equal(takeoffs, 2);
});

test('open plazas carry more densely spaced flocks than narrow paths', () => {
  const plaza = population(false);
  const path = Pigeons.create(park, (x,z) => x > 0 && x < 260 && Math.abs(z-125) < 3, random());
  assert.ok(plaza.birds.length / (260 * 260) > path.birds.length / (260 * 6));
  assert.ok(plaza.groups.some(g => g.spacing === 12 && g.size === 'large'));
  assert.ok(path.groups.every(g => g.size !== 'large' && g.spacing >= 22));
});

test('grounded pigeons walk on paving and keep clear of neighbours', () => {
  const p = population(), before = p.birds.map(d => [d.x, d.z]);
  const car = {x: -100, z: -100, v: 0};
  p.birds.forEach(d => {d.pause=0;});
  for (let i=0;i<200;i++) Pigeons.update(p, 0.05, car, ()=>{});
  assert.ok(p.birds.some((d,i)=>Math.hypot(d.x-before[i][0], d.z-before[i][1]) > 0.2));
  for (const d of p.birds) {
    assert.ok(!d.flight && p.canLand(d.x,d.z));
    for (const other of p.birds) if (other!==d) assert.ok(Math.hypot(d.x-other.x,d.z-other.z) >= 0.349);
  }
});

test('solitary pigeons keep their own walking space beside dense flocks', () => {
  const p = population(false), radius = {small: 1.4, medium: 2.2, large: 3.5};
  for (const solo of p.groups.filter(g=>g.size==='solo')) {
    for (const flock of p.groups.filter(g=>g.size!=='solo')) {
      assert.ok(Math.hypot(solo.x-flock.x,solo.z-flock.z) >= radius[flock.size]+3);
    }
  }
});

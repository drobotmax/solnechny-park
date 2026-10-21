const { test } = require('node:test');
const assert = require('node:assert/strict');
const Mallards = require('../mallards.js');
const park = { x0: 0, z0: 0, w: 250, h: 250, mpp: 1, start: [5, 5] };
const catAt = (x, z) => x >= 12 && x < 235 && z >= 0 && z < 250 ? 4 : 2;

test('mallard and larger neighbouring coot flocks stay on water for a full orbit', () => {
  const { ducks, coots, birds, groups } = Mallards.create(park, catAt, () => 0.4);
  assert.ok(groups.length > 0);

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

test('shelducks are rare: one lone bird and a distant male/female pair swimming together', () => {
  const p = Mallards.create(park, catAt, () => 0.4);
  assert.equal(p.shelducks.length, 3);
  assert.deepEqual(p.rareGroups.map(g => g.count), [1, 2]);
  const [a, b] = p.rareGroups;
  assert.ok(Math.hypot(a.x - b.x, a.z - b.z) >= 140);
  assert.equal(p.shelducks[1].male, true);
  assert.equal(p.shelducks[2].male, false);
  for (let t = 0; t < 300; t++) {
    Mallards.update(p.shelducks, 1);
    assert.ok(Math.abs(Math.hypot(p.shelducks[1].x - p.shelducks[2].x, p.shelducks[1].z - p.shelducks[2].z) - 1) < 0.0001);
  }
});

test('shelducks have orange plumage, pale heads and dark bills', () => {
  for (const male of [false, true]) {
    const colors = new Set();
    Mallards.shape(male, (x, y, z, c, size) => {
      assert.ok([x, y, z, ...c, size].every(Number.isFinite));
      colors.add(c.join(','));
    }, 'shelduck');
    assert.ok(colors.has('203,103,35'));
    assert.ok(colors.has(male ? '235,202,145' : '246,225,184'));
    assert.ok(colors.has('34,34,32'));
    assert.ok(!colors.has('22,111,66'));
  }
});

test('distant separate waterbodies receive flocks regardless of the starting shore', () => {
  const p = {...park, w: 1000, h: 1000};
  const water = (x, z) => x > 12 && x < 988 && ((z > 20 && z < 200) || (z > 800 && z < 980)) ? 4 : 1;
  for (const start of [[10, 10], [990, 990]]) {
    const m = Mallards.create({...p, start}, water, () => 0.4);
    assert.ok(m.groups.length > 12);
    for (const x of [0, 1]) for (const z of [0, 1]) {
      assert.ok(m.groups.some(g => Math.floor(g.x / 500) === x && Math.floor(g.z / 500) === z));
    }
    assert.equal(m.shelducks.length, 3);
  }
});

test('twenty solitary grebes spread over water with separate territories and full swimming orbits',()=>{
 const p={...park,w:1200,h:1200};
 const water=(x,z)=>x>12&&x<1188&&((z>20&&z<250)||(z>900&&z<1180))?4:1;
 const pop=Mallards.create(p,water,()=>.4);
 assert.equal(pop.grebes.length,20);
 assert.ok(pop.grebes.some(d=>d.cz>900)&&pop.grebes.some(d=>d.cz<250));
 for(const d of pop.grebes)for(const other of pop.grebes)if(d!==other)assert.ok(Math.hypot(d.cx-other.cx,d.cz-other.cz)>=80);
 for(let i=0;i<400;i++){
  Mallards.update(pop.grebes,1);
  assert.ok(pop.grebes.every(d=>water(d.x,d.z)===4&&water(d.x-.2,d.z)===4&&water(d.x+.2,d.z)===4));
 }
 const colors=new Set();Mallards.shape(false,(x,y,z,c,size)=>{assert.ok([x,y,z,...c,size].every(Number.isFinite));colors.add(c.join(','));},'grebe');
 for(const c of ['237,233,216','29,31,30','158,79,43'])assert.ok(colors.has(c));
});

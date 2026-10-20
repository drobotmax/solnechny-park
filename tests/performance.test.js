const {test}=require('node:test');
const assert=require('node:assert/strict');
const P=require('../park-performance.js');
const view=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];
test('frustum culls behind, side and far clouds but keeps intersecting spheres',()=>{
 assert(P.visible(view,0,0,-10,1,Math.PI/2,1,100));
 assert(!P.visible(view,0,0,10,1,Math.PI/2,1,100));
 assert(!P.visible(view,30,0,-10,1,Math.PI/2,1,100));
 assert(P.visible(view,11,0,-10,2,Math.PI/2,1,100));
 assert(P.visible(view,0,0,-101,2,Math.PI/2,1,100));
 assert(!P.visible(view,0,0,-103,2,Math.PI/2,1,100));
});
test('LOD thresholds retain near geometry and use shared-buffer strides',()=>{
 assert.deepEqual([0,65,65.01,120,120.01].map(P.stride),[1,1,2,2,4]);
});

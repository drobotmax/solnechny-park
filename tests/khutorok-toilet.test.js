const {test}=require('node:test'),assert=require('node:assert/strict'),cp=require('node:child_process');
const T=require('../park-khutorok-toilet'),S=require('../park-khutorok-lane'),J=require('../park-avenue-junction'),K=require('../park-khutorok'),M=require('../park-meshes'),park=require('../park/park.json');
const index=(x,z)=>Math.floor((z-park.z0)/park.mpp)*park.w+Math.floor((x-park.x0)/park.mpp);
const blocked=(c,x,z)=>[4,5,12,13].includes(c[index(x,z)]&31);
let cached;
function ground(){if(cached)return cached.slice();const c=cp.execFileSync('python3',['-c',"from PIL import Image;import sys;sys.stdout.buffer.write(Image.open('park/ground.png').convert('RGB').getchannel('R').tobytes())"],{maxBuffer:32*1024*1024});
 for(const p of ['park-avenue-junction','park-khutorok','park-yesenin-garden','park-garden-junction','park-khutorok-lane'])require('../'+p).applyGround(c,park);cached=c;return c.slice();}
function corrected(){const c=ground();for(const p of ['park-khutorok','park-yesenin-garden','park-garden-junction','park-khutorok-lane'])require('../'+p).applyObstacles(c,park);return c;}
function envelope(c,path){for(let i=1;i<path.length;i++){const a=path[i-1],b=path[i],len=Math.hypot(b[0]-a[0],b[1]-a[1]),fx=(b[0]-a[0])/len,fz=(b[1]-a[1])/len,n=Math.ceil(len/.15);
 for(let j=0;j<=n;j++)for(const f of [-.52,0,.52])for(const side of [-.30,0,.30]){const x=a[0]+(b[0]-a[0])*j/n+fx*f-fz*side,z=a[1]+(b[1]-a[1])*j/n+fz*f+fx*side;
  assert(!blocked(c,x,z),`approach clips at ${x},${z}`);assert(M.centralClearsTree(x,z),'a generated trunk cannot remain on the photographed paths');}
}}
test('the toilet keeps its map pin and its entrance is on the left when approaching from the main street',()=>{
 assert.equal(S.hut,T.hut);assert.deepEqual(S.eastWalk.at(-1),T.station);
 assert(T.station[0]>S.station[0]+11&&T.station[0]<T.hut.at[0]-T.hut.depth/2);
 assert(Math.abs(T.station[1]-T.hut.at[1])<.2);assert(T.views.west<-1.5&&T.views.west>-1.8);assert(Math.abs(T.views.north)<.1);assert(T.views.east>1&&T.views.east<1.6);assert(T.views.south>2.8);
 assert(T.rearFence.every(p=>p[1]<T.station[1]-1),'the cafe yard is north of the pin');
 assert(T.flowerbed.every(p=>J.distance(S.eastWalk,...p)>.9),'the flower patch is left of the approach when facing west');
 const mesh=M.build(M.entries(park).find(e=>e.id==='khutorok-teal-hut')),sign=[];
 for(let i=0;i<mesh.data.length;i+=10)if(Math.abs(mesh.data[i+6]-.08)<1e-5&&Math.abs(mesh.data[i+7]-.19)<1e-5&&Math.abs(mesh.data[i+8]-.44)<1e-5)sign.push(Array.from(mesh.data.subarray(i,i+3)));
 assert(sign.length>0&&sign.every(p=>p[2]<T.hut.at[1]-1.6),'the actual sign mesh must face the north side');
 const door=T.hutPoint(T.door.u,T.hut.depth/2),dx=T.station[0]-S.station[0],dz=T.station[1]-S.station[1];
 assert((door[0]-T.hut.at[0])*dz-(door[1]-T.hut.at[1])*dx>0,'the door must be left, not right, of the approach from the street');
 const xs=T.footprint.map(p=>p[0]),zs=T.footprint.map(p=>p[1]);
 assert(Math.abs(Math.max(...xs)-Math.min(...xs)-3.7)<1e-6);assert(Math.abs(Math.max(...zs)-Math.min(...zs)-3.2)<1e-6,'the body footprint must rotate with the facade');
 assert.equal(M.entries(park).filter(e=>e.id==='khutorok-teal-hut').length,1,'the previous hut must be replaced rather than duplicated');
});
test('the road-to-toilet path, apron and southern footway fit the complete stroller envelope',()=>{
 const c=corrected();for(const path of [S.eastWalk,T.southLink,T.southWalk,T.entranceApproach,S.porchApproach])envelope(c,path);
 for(const p of S.eastWalk)assert.equal(c[index(...p)]&31,3,'the photographed east approach is asphalt all the way to the toilet');
 for(const p of [T.station,[150.85,-211.4],[153.4,-210.0]])assert.equal(c[index(...p)]&31,3);
 assert.equal(c[index(162,-214)]&31,1,'the field around the toilet remains open lawn');
 const originals=park.trees.filter(t=>!M.centralClearsTree(t[0],t[1]));
 for(const path of [S.eastWalk,T.southLink,T.southWalk])for(const p of path)assert(!originals.some(t=>Math.hypot(t[0]-p[0],t[1]-p[1])<.65),'an original trunk cannot obstruct the walk');
});
test('the cafe rear fence, open door leaf and toilet have matching collision silhouettes',()=>{
 const c=corrected();for(const p of [T.hut.at,[154,-222],...T.rearFence,...T.screen,T.bin])assert(blocked(c,...p),`missing fixture at ${p}`);
 const u=T.door.u-T.door.width/2+Math.cos(T.door.angle)*T.door.width*.5,v=T.hut.depth/2+.08+Math.sin(T.door.angle)*T.door.width*.5;
 assert(T.solid(...T.hutPoint(u,v)),'the open door leaf must block its rotated visible position');
 assert(!T.solid(152.17,-214.42),'the old west-facing door must not leave an invisible obstacle');
 assert(!T.solid(152.77,-210.85),'the rejected right-side door must not leave an invisible obstacle');
 assert(blocked(c,156.0,-213),'the newly rotated east edge must block');assert(!blocked(c,154,-214.72),'the retired north strip must be clear');
 assert(!T.solid(...T.station));assert(!blocked(c,...T.station));
 for(const t of K.trees.concat(S.trees)){assert(!J.inside(T.whiteBay,t[0],t[1]));assert(!T.inHut(t[0],t[1],.2));}
});
test('the close toilet view preserves the previous street, planted fork and mapped water',()=>{
 const c=ground(),before=c.slice();S.applyObstacles(c,park);
 for(let i=0;i<c.length;i++)if([4,5].includes(before[i]&31))assert.equal(c[i],before[i]);
 for(const p of [S.station,[104.4,-209.5],[98,-234],[118.2,-250.11]])assert.equal(c[index(...p)],before[index(...p)]);
 const e=M.entries(park).find(e=>e.id==='khutorok-teal-hut'),m=M.build(e);assert(m.data.byteLength<128*1024);
 assert(m.data.some((v,i)=>i%10===6&&Math.abs(v-.08)<1e-5),'the blue sign is part of the actual rendered mesh');
});

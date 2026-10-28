const {test}=require('node:test'),assert=require('node:assert/strict'),cp=require('node:child_process');
const N=require('../park-garden-junction'),G=require('../park-yesenin-garden'),K=require('../park-khutorok'),J=require('../park-avenue-junction'),L=require('../park-scanned-landmarks'),M=require('../park-meshes'),park=require('../park/park.json');
const index=(x,z)=>Math.floor((z-park.z0)/park.mpp)*park.w+Math.floor((x-park.x0)/park.mpp);
const blocked=(c,x,z)=>[4,5,12,13].includes(c[index(x,z)]&31);
function base(){const c=cp.execFileSync('python3',['-c',"from PIL import Image;import sys;sys.stdout.buffer.write(Image.open('park/ground.png').convert('RGB').getchannel('R').tobytes())"],{maxBuffer:32*1024*1024});
 require('../park-central-alley').applyGround(c,park,M.entries(park));J.applyGround(c,park);require('../park-safari-avenue').applyGround(c,park);require('../park-avenue-picnic').applyGround(c,park);K.applyGround(c,park);G.applyGround(c,park);L.applySiteGround(c,park);return c;
}
function corrected(){const c=base();N.applyGround(c,park);K.applyObstacles(c,park);G.applyObstacles(c,park);N.applyObstacles(c,park);L.applyGround(c,park);return c;}
function envelope(c,path){for(let i=1;i<path.length;i++){const a=path[i-1],b=path[i],len=Math.hypot(b[0]-a[0],b[1]-a[1]),fx=(b[0]-a[0])/len,fz=(b[1]-a[1])/len;
 for(let k=0;k<=Math.ceil(len/.15);k++){const f=k/Math.ceil(len/.15),x=a[0]+(b[0]-a[0])*f,z=a[1]+(b[1]-a[1])*f;
  for(const forward of [-.52,0,.52])for(const side of [-.30,0,.30]){const px=x+fx*forward-fz*side,pz=z+fz*forward+fx*side;assert(!blocked(c,px,pz),`stroller envelope clips at ${px},${pz}`);assert(M.centralClearsTree(px,pz),'an original trunk must not remain in the photographed paths');}
 }
}}
test('one camera station places the four photographed directions on their actual map sides',()=>{
 assert.deepEqual(N.station,G.southNodes[2]);
 const bearing=p=>Math.atan2(p[0]-N.station[0],N.station[1]-p[1]),delta=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
 for(const [view,target] of [['north',N.shortcut.at(-1)],['east',G.southNodes[3]],['south',N.stair.at],['west',[94.5,-208.5]]])assert(Math.abs(delta(bearing(target),N.views[view]))<.18,`${view} must use the same panorama pin`);
 assert(N.bushes.slice(0,3).every(p=>p[0]<N.stair.at[0]),'the spreading junipers appear right of the stairs when looking south');
 const models=M.entries(park);assert.equal(models.find(e=>e.id==='b76').kind,'gardenKiosk');assert.equal(models.find(e=>e.id==='b126').kind,'gardenPavilion');
 assert.deepEqual(models.find(e=>e.id==='b76').pts,park.buildings[76].pts);assert.deepEqual(models.find(e=>e.id==='b126').pts,park.buildings[126].pts);
});
test('the worn north shortcut, western forecourt and curved garden connections remain drivable',()=>{
 const c=corrected();for(const path of [N.shortcut,N.westAccess,...G.paths])envelope(c,path);
 envelope(c,[N.station,[104.7,-206.0]]);envelope(c,[[98,-209.0],[90,-208.2]]);
 assert.equal(c[index(103.9,-215)]&31,1,'grass shows between the individual worn paving blocks');
 assert.equal(c[index(95,-207)]&31,2,'the west-facing open square is paved');
 assert.equal(c[index(113,-214.5)]&31,1,'the east-side lawn remains between the branches');
});
test('the raised stair, parapets and pavilion have physical footprints without closing the fork',()=>{
 const c=corrected();assert.equal(N.stair.count,8);assert(Math.abs(N.stair.height-1.32)<1e-10);
 for(const p of [[N.stair.at[0],N.stair.at[1]+1],N.pavilion.at,N.pole,...N.bushes,...N.hedge])assert(blocked(c,p[0],p[1]),`missing physical fixture at ${p}`);
 assert(!blocked(c,...N.station));assert(!N.solid(...N.station));
 const main=M.entries(park).filter(e=>['gardenStairJunction','gardenKiosk','gardenPavilion'].includes(e.kind));assert.equal(main.length,3);assert(main.reduce((sum,e)=>sum+M.build(e).data.byteLength,0)<.40*1024*1024);
 for(const t of N.trees)assert(!N.shortcut.some(p=>Math.hypot(t[0]-p[0],t[1]-p[1])<1.4));
});
test('the new station preserves the memorial, Khutorok and the accepted single northern alley',()=>{
 const before=base(),after=before.slice();N.applyGround(after,park);N.applyObstacles(after,park);
 for(const p of [[62,-242.45],[94,-244.4],L.yesenin.at,...K.bypass,...J.pavilionFront,[115.7,-222.4]])assert.equal(after[index(...p)],before[index(...p)]);
 for(let i=0;i<after.length;i++)if([4,5].includes(before[i]&31))assert.equal(after[i],before[i],'original water and mapped buildings remain unchanged');
});

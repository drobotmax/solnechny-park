const {test}=require('node:test'),assert=require('node:assert/strict'),cp=require('node:child_process');
const S=require('../park-safari-avenue'),J=require('../park-avenue-junction'),A=require('../park-central-alley'),park=require('../park/park.json'),M=require('../park-meshes');
const index=(x,z)=>Math.floor((z-park.z0)/park.mpp)*park.w+Math.floor((x-park.x0)/park.mpp);
function raster(){const c=cp.execFileSync('python3',['-c',"from PIL import Image;import sys;sys.stdout.buffer.write(Image.open('park/ground.png').convert('RGB').getchannel('R').tobytes())"],{maxBuffer:32*1024*1024});A.applyGround(c,park,M.entries(park));J.applyGround(c,park);S.applyGround(c,park);return c;}
test('the forecourt replaces the provisional street-side coffee stall with an open passage',()=>{
 const c=raster(),blocked=(x,z)=>[4,5,12,13].includes(c[index(x,z)]&31);
 for(const [a,b] of [[[60,-189.6],[82,-189.6]],[[80,-188.8],[80,-181]],[[56.8,-182.2],[45,-172.8]],[[45,-172.8],[44,-164]]])for(let k=0;k<=40;k++){const x=a[0]+(b[0]-a[0])*k/40,z=a[1]+(b[1]-a[1])*k/40;assert(!blocked(x,z),`passage blocked at ${x},${z}`);assert(S.clearsTree(x,z),`a raw tree could block the walk at ${x},${z}`);}
 for(const s of [S.fresh,S.coffee,S.gurman])assert(blocked(s.x,s.z));
 assert(S.coffee.x>S.gurman.x+6);assert(S.meal.z<S.gurman.z&&S.gurman.z<S.picnic.z);
 assert(!blocked(67.5,-189.6),'the old placeholder coffee position must be open');
 for(let x=62;x<=75;x+=.2)for(const z of [-189.9,-189.6,-189.3])assert(!blocked(x,z),`the rasterized retired ride outline must not block a wheel at ${x},${z}`);
 for(const t of S.trees)assert(!J.inside(S.forecourt,...t),'the added trunks must clear the new forecourt');
});
test('the blue court boundary remains solid while the outside path is continuous',()=>{
 const c=raster();for(let i=1;i<S.courtFence.length;i++){const a=S.courtFence[i-1],b=S.courtFence[i];for(let k=0;k<=20;k++){const x=a[0]+(b[0]-a[0])*k/20,z=a[1]+(b[1]-a[1])*k/20;assert(S.replacesFence(x,z));assert(S.solid(x,z));}}
 for(const [x,z] of [[44,-164],[45.8,-152]])assert.equal(c[index(x,z)]&31,2);
 assert(!S.replacesFence(44,-164),'the outside walk must not become a mesh fence');
});

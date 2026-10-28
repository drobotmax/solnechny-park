const {test}=require('node:test'),assert=require('node:assert/strict'),cp=require('node:child_process');
const J=require('../park-avenue-junction'),L=require('../park-scanned-landmarks'),M=require('../park-meshes'),park=require('../park/park.json');
const index=(x,z)=>Math.floor((z-park.z0)/park.mpp)*park.w+Math.floor((x-park.x0)/park.mpp);
function corrected(){
 const c=cp.execFileSync('python3',['-c',"from PIL import Image;import sys;sys.stdout.buffer.write(Image.open('park/ground.png').convert('RGB').getchannel('R').tobytes())"],{maxBuffer:32*1024*1024});
 require('../park-central-alley').applyGround(c,park,M.entries(park));J.applyGround(c,park);
 require('../park-safari-avenue').applyGround(c,park);require('../park-avenue-picnic').applyGround(c,park);require('../park-khutorok').applyGround(c,park);
 require('../park-avenue-train').applyGround(c,park);L.applySiteGround(c,park);L.applyGround(c,park);return c;
}
const blocked=(c,x,z)=>[4,5,12,13].includes(c[index(x,z)]&31);
function walk(line,fn){for(let i=1;i<line.length;i++)for(let k=0;k<=40;k++){const a=line[i-1],b=line[i],f=k/40;fn(a[0]+(b[0]-a[0])*f,a[1]+(b[1]-a[1])*f);}}
test('the cactus mural uses the mapped 2B/4 gable and remains painted on its front',()=>{
 const e=M.entries(park).find(e=>e.id==='b68');assert.equal(e.kind,'terracePavilion');assert.deepEqual(e.mappedPts,park.buildings[68].pts);assert.deepEqual(e.pts,J.pavilionFootprint(e.mappedPts));
 const m=M.build(e),paint=[];for(let i=0;i<m.data.length;i+=10)if(Math.abs(m.data[i+6]-.12)<1e-5&&Math.abs(m.data[i+7]-.56)<1e-5&&Math.abs(m.data[i+8]-.61)<1e-5)paint.push(Array.from(m.data.subarray(i,i+3)));
 assert(paint.length>6,'the turquoise field is real opaque geometry');
 const yaw=Math.atan2(-1.27,9.39),c=Math.cos(yaw),s=Math.sin(yaw);
 for(const [x,y,z] of paint){const dx=x-J.pavilionFront[0][0],dz=z-J.pavilionFront[0][1],u=c*dx+s*dz,v=-s*dx+c*dz;assert(u>.1&&u<9.4&&y>=.04&&y<4.8);assert(v>.01&&v<.12,'paint lies just outside the photographed south wall');}
 assert(!J.umbrellas.some(p=>J.inside(e.pts,...p)),'no seating pole remains embedded inside the pavilion');
});
test('the cross path and memorial spur admit both wheels on the corrected ground',()=>{
 const c=corrected();for(const path of [J.eastPath,J.memorialApproach])walk(path,(x,z)=>{for(const [dx,dz] of [[0,0],[.4,0],[-.4,0],[0,.4],[0,-.4]])assert(!blocked(c,x+dx,z+dz),`side path blocked at ${x+dx},${z+dz}`);assert(M.centralClearsTree(x,z));});
 for(const uv of [[0,7.5],[0,7],[0,5],[1.9,2.5]])assert(!blocked(c,...L.world(...uv)),'the memorial remains reachable from the new connection');
 for(const p of J.facadePlanters)assert(blocked(c,p[0],p[1]),'visible raised trays have physical footprints');
 assert(blocked(c,84.7,-251.1),'the white pavilion body remains solid');
});
test('the photographed lawn inset and lamp preserve the memorial and its clear central approach',()=>{
 const c=corrected();assert.equal(c[index(...L.world(-2,4.5))]&31,1,'the square lawn is visible within the paving');
 assert.equal(c[index(...L.world(0,5))]&31,2,'the centre of the tiled approach stays open');
 assert(blocked(c,...L.yesenin.at));assert(blocked(c,...L.world(...L.yesenin.plaque)));assert(blocked(c,...L.world(...L.yesenin.lamp)));
 for(const t of J.extraTrees){assert(J.distance(J.eastPath,...t)>3);assert(J.distance(J.memorialApproach,...t)>1.8);assert(!L.inSite(t[0],t[1]));}
});

test('one asphalt walk replaces the two parallel routes and the mural stands by its edge',()=>{
 const c=corrected();
 for(const x of [62,74,86,98,106]){
  const i=J.eastPath.findIndex((p,i,a)=>i>0&&p[0]>=x),a=J.eastPath[i-1],b=J.eastPath[i],z=a[1]+(b[1]-a[1])*(x-a[0])/(b[0]-a[0]);
  let bands=0,onRoad=false;
  for(let d=-11;d<=8;d+=.2){const road=(c[index(x,z+d)]&31)===3;if(road&&!onRoad)bands++;onRoad=road;}
  assert.equal(bands,1,`there must be only one asphalt band at x=${x}`);
  if(x<88)for(let d=J.alleyHalfWidth+.7;d<6;d+=.4)assert(![2,3].includes(c[index(x,z+d)]&31),`the former parallel walkway is lawn on the memorial side at ${x},${z+d}`);
 }
 for(const p of J.pavilionFront){const gap=J.distance(J.eastPath,...p)-J.alleyHalfWidth;assert(gap>1.3&&gap<2.9,`the photographed wall-to-asphalt gap stays compact: ${gap}`);}
 for(const p of J.facadePlanters)assert(J.distance(J.eastPath,...p)>J.alleyHalfWidth+.3,'trays stay out of the single through walk');
 assert(!blocked(c,84.7,-267.1),'the retired mapped pavilion no longer leaves an invisible wall');
});

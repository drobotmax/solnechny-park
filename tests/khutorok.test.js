const {test}=require('node:test'),assert=require('node:assert/strict'),cp=require('node:child_process');
const K=require('../park-khutorok'),J=require('../park-avenue-junction'),L=require('../park-scanned-landmarks'),M=require('../park-meshes'),park=require('../park/park.json');
const index=(x,z)=>Math.floor((z-park.z0)/park.mpp)*park.w+Math.floor((x-park.x0)/park.mpp);
function base(){const c=cp.execFileSync('python3',['-c',"from PIL import Image;import sys;sys.stdout.buffer.write(Image.open('park/ground.png').convert('RGB').getchannel('R').tobytes())"],{maxBuffer:32*1024*1024});require('../park-central-alley').applyGround(c,park,M.entries(park));J.applyGround(c,park);require('../park-safari-avenue').applyGround(c,park);require('../park-avenue-picnic').applyGround(c,park);return c;}
function corrected(){const c=base();K.applyGround(c,park);L.applySiteGround(c,park);K.applyObstacles(c,park);L.applyGround(c,park);return c;}
const blocked=(c,x,z)=>[4,5,12,13].includes(c[index(x,z)]&31);
function walk(path,fn){for(let i=1;i<path.length;i++)for(let k=0;k<=60;k++){const a=path[i-1],b=path[i],f=k/60;fn(a[0]+(b[0]-a[0])*f,a[1]+(b[1]-a[1])*f);}}
test('Khutorok has one glazed main building and an open umbrella terrace on the mapped footprints',()=>{
 const e=M.entries(park),models=e.filter(e=>['khutorok','khutorokTerrace','khutorokJunction'].includes(e.kind));assert.equal(models.length,3);
 assert.deepEqual(e.find(e=>e.id==='b94').pts,park.buildings[94].pts);assert.deepEqual(e.find(e=>e.id==='b125').pts,park.buildings[125].pts);
 assert.equal(e.find(e=>e.id==='b94').kind,'khutorokTerrace');assert.equal(e.find(e=>e.id==='b125').kind,'khutorok');
 assert(models.reduce((n,e)=>n+M.build(e).data.byteLength,0)<1.4*1024*1024,'the entire new station has a bounded mesh payload');
 const c=corrected();assert(blocked(c,150,-240));assert(!blocked(c,135.2,-242.4),'the old solid terrace point model and collision are retired');
});
test('the red closed gate blocks the carriageway and preserves the photographed left bypass',()=>{
 const c=corrected();assert(blocked(c,...K.gate.center),'the wheeled gate is a real obstacle');
 for(const p of [K.hinge,K.tip])assert(K.solid(...p));
 walk(K.bypass,(x,z)=>{for(const [dx,dz] of [[0,0],[.29,0],[-.29,0],[0,.29],[0,-.29]])assert(!blocked(c,x+dx,z+dz),`wheel blocked in left bypass at ${x+dx},${z+dz}`);assert(M.centralClearsTree(x,z));});
});
test('the separate garden walk and cafe drive stay open beside the planted islands',()=>{
 const c=corrected();for(const path of [K.gardenWalk,K.cafeDrive,K.northWalk])walk(path,(x,z)=>{for(const dx of [-.29,0,.29])assert(!blocked(c,x+dx,z),`garden walk blocked at ${x+dx},${z}`);});
 for(const p of [[116,-241],[119,-239],[119,-235],[128,-236]])assert.equal(c[index(...p)]&31,1,'the photographed corner remains planted lawn');
 for(const p of [...K.hedge,...K.conifers,...K.pots,...K.trays,K.bin,...K.parking.map(p=>p.at)])assert(blocked(c,p[0],p[1]),`missing physical fixture at ${p}`);
 walk(K.northDrive,(x,z)=>assert(!blocked(c,x,z),'the parked cars leave the service road clear'));
 for(let x=130;x<=135.2;x+=.12)for(const dx of [-.55,0,.55])for(const dz of [-.30,0,.30])assert(!blocked(c,x+dx,-242.4+dz),`terrace entrance clips the stroller envelope at ${x+dx},${-242.4+dz}`);
});
test('the junction preserves water and the accepted single alley and memorial',()=>{
 const before=base(),after=before.slice();K.applyGround(after,park);K.applyObstacles(after,park);
 for(let i=0;i<after.length;i++)if((before[i]&31)===4)assert.equal(after[i],before[i]);
 for(const p of [[62,-242.45],[74,-243.3],[86,-243.96],[98,-244.7],L.yesenin.at,...J.pavilionFront])assert.equal(after[index(...p)],before[index(...p)]);
 for(const tree of K.trees){assert(J.distance(J.eastPath,...tree)>3);assert(J.distance(K.approach,...tree)>3.8);assert(J.distance(K.gardenWalk,...tree)>1.5);assert(!L.inSite(...tree));}
});

test('the reverse panorama separates three southern branches and keeps the northern footpath on its original axis',()=>{
 const c=corrected();
 for(const path of [K.gardenWalk,K.cafeDrive,K.northWalk])walk(path,(x,z)=>assert(M.centralClearsTree(x,z),'the visible paths cannot retain a generated trunk'));
 const z=-241.0,atZ=path=>{const i=path.findIndex((p,i,a)=>i>0&&a[i-1][1]<=z&&p[1]>=z),a=path[i-1],b=path[i];return a[0]+(b[0]-a[0])*(z-a[1])/(b[1]-a[1]);};
 const walkX=atZ(K.gardenWalk),driveX=atZ(K.cafeDrive);assert(driveX-walkX>6,'the footpath and cafe driveway are separate branches');
 assert.equal(c[index(walkX,z)]&31,3);assert.equal(c[index(driveX,z)]&31,3);assert.equal(c[index((walkX+driveX)/2,z)]&31,1,'a planted island separates the branches');
 const p=K.northWalk[1],q=K.northWalk[2],f=.35,x=p[0]+(q[0]-p[0])*f,nz=p[1]+(q[1]-p[1])*f;
 assert.equal(c[index(x,nz)]&31,3,'the mapped northern footway is asphalt');assert.equal(c[index(x+1.6,nz)]&31,1,'its former wide paving has no parallel strip');
 const end=K.northWalk.at(-1);assert.equal(c[index(end[0]-.2,end[1]-1)]&31,2,'the bounded reconstruction joins the existing path beyond the references');
 const car=K.parking[0],dx=car.at[0]-K.gate.center[0],dz=car.at[1]-K.gate.center[1];assert(dx*K.gate.right[0]+dz*K.gate.right[1]<-4.0,'the silver car occupies the bay beside the gate');assert(blocked(c,...car.at));
});

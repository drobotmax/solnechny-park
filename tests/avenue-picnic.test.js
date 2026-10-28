const {test}=require('node:test'),assert=require('node:assert/strict'),cp=require('node:child_process');
const P=require('../park-avenue-picnic'),S=require('../park-safari-avenue'),J=require('../park-avenue-junction'),A=require('../park-central-alley'),T=require('../park-avenue-train'),M=require('../park-meshes'),park=require('../park/park.json');
const index=(x,z)=>Math.floor((z-park.z0)/park.mpp)*park.w+Math.floor((x-park.x0)/park.mpp);
function raw(){return cp.execFileSync('python3',['-c',"from PIL import Image;import sys;sys.stdout.buffer.write(Image.open('park/ground.png').convert('RGB').getchannel('R').tobytes())"],{maxBuffer:32*1024*1024});}
function base(){const c=raw();A.applyGround(c,park,M.entries(park));J.applyGround(c,park);S.applyGround(c,park);T.applyGround(c,park);return c;}
function corrected(){const c=base();P.applyGround(c,park);P.applyObstacles(c,park);return c;}
const blocked=(c,x,z)=>[4,5,12,13].includes(c[index(x,z)]&31);
function walk(line,fn){for(let i=1;i<line.length;i++)for(let k=0;k<=50;k++){const a=line[i-1],b=line[i],u=k/50;fn(a[0]+(b[0]-a[0])*u,a[1]+(b[1]-a[1])*u);}}
test('the next panorama orders Coffee, the shutter, Picnic and ice cream down the east side',()=>{
 const row=[S.coffee,P.croissant,S.picnic,P.icecream];for(let i=1;i<row.length;i++)assert(row[i].z>row[i-1].z+3);
 assert(row.every(p=>p.x>74),'the frontage stays behind the east-side benches');
 assert(S.covered.every(p=>p[0]<60&&p[1]< -175),'the teal cover belongs on the north-west verge of this station');
 const models=M.entries(park).filter(e=>e.kind==='picnicKiosks'||e.kind==='picnicAvenue');assert.equal(models.length,2);
 assert(models.reduce((n,e)=>n+M.build(e).data.byteLength,0)<900000,'the new station uses bounded solid geometry');
 assert.deepEqual(M.centralTrees.slice(-P.trees.length),P.trees);
});
test('the real asphalt remains continuous through the complete new station',()=>{
 const c=corrected();walk(P.axis,(x,z)=>{for(const [dx,dz] of [[0,0],[.3,0],[-.3,0],[0,.3],[0,-.3],[3.8,0],[-3.8,0]]){
  assert(!blocked(c,x+dx,z+dz),`a wheel is obstructed at ${x+dx},${z+dz}`);
  assert(M.centralClearsTree(x+dx,z+dz),'the road cannot retain a generated trunk');
 }});
 for(const t of P.trees){assert(J.distance(P.axis,...t)>5.7);assert(J.distance(P.access,...t)>2.1);}
 for(let d=0;d<T.length;d+=1)for(const p of T.poses(d))assert(!P.solid(p.x,p.z),'the original train route remains clear');
 assert(S.pots.every(p=>J.distance(P.axis,...p)>4.9),'relocated terrace flowers cannot stand inside the new carriageway');
});
test('the photographed court approach opens the actual fence without opening its neighbouring panels',()=>{
 const c=corrected();walk(P.access,(x,z)=>{for(const dx of [-.28,0,.28])assert(!blocked(c,x+dx,z),`court approach blocked at ${x+dx},${z}`);assert(P.clearsTree(x,z));});
 assert(!blocked(c,S.courtGate.x,S.courtGate.z));
 for(const dz of [-2.8,2.8]){const z=S.courtGate.z+dz,x=39.05+(z+168.54)*4.25/23.34;assert(blocked(c,x,z),'the gate does not remove adjacent fence');}
 assert(blocked(c,...P.courtWorld(30,P.court.net)),'the visible tennis net is solid');
 assert(!blocked(c,...P.courtWorld(30,10)),'the painted court is open away from its net');
 const d=[S.courtGate.x-P.sign[0],S.courtGate.z-P.sign[1]],n=Math.hypot(...d);
 assert((Math.cos(P.signYaw)*d[0]+Math.sin(P.signYaw)*d[1])/n>.99,'the physical arrow points into the tennis approach');
});
test('stalls, benches, bins and covered shapes block while their frontages stay open',()=>{
 const c=corrected();for(const p of [S.coffee,P.croissant,S.picnic,P.icecream]){assert(blocked(c,p.x,p.z));assert(!blocked(c,p.x-p.d/2-1.2,p.z),'a player can reach the frontage');}
 for(const p of [[67.5,-174.5],[69,-174.5],[72.8,-169]])assert.equal(c[index(...p)]&31,3,'continuous asphalt joins the street and stall forecourt');
 for(const p of [...P.benches,...P.bins,P.sign,P.notice,P.iceCone,...P.lamps])assert(blocked(c,p[0],p[1]),`missing fixture collision at ${p}`);
 assert(blocked(c,56.95,-177.5),'the fabric-covered shape has a solid footprint');
 for(const p of [[77.2,-186.8],[71,-168.8],[58.7,-164.5]])assert(!blocked(c,...p),'the former guessed position is retired');
});
test('new paving and furniture preserve water and the completed northern crossroads',()=>{
 const before=base(),c=before.slice();P.applyGround(c,park);P.applyObstacles(c,park);
 for(let i=0;i<c.length;i++)if((before[i]&31)===4)assert.equal(c[i],before[i]);
 for(const p of [[60,-189.6],[47.2,-247.5],[98,-234],[-20,-300],[36.5,-192.2]])assert.equal(c[index(...p)],before[index(...p)]);
 for(const p of [[55,-186],[56.4,-180],[45,-172.8],[45.8,-152]])assert.equal(c[index(...p)]&31,1,'lawn outside the newly photographed access is preserved');
 assert.equal(c[index(58.5,-170)]&31,2,'the next panorama resolves the new paved approach here');
});

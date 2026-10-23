const {test}=require('node:test'),assert=require('node:assert/strict'),cp=require('node:child_process');
const S=require('../park-safari-avenue'),J=require('../park-avenue-junction'),A=require('../park-central-alley'),T=require('../park-avenue-train'),M=require('../park-meshes'),park=require('../park/park.json');
const entries=M.entries(park),idx=(x,z)=>Math.floor((z-park.z0)/park.mpp)*park.w+Math.floor((x-park.x0)/park.mpp);
function raster(){return cp.execFileSync('python3',['-c',"from PIL import Image;import sys;sys.stdout.buffer.write(Image.open('park/ground.png').convert('RGB').getchannel('R').tobytes())"],{cwd:require('node:path').resolve(__dirname,'..'),maxBuffer:32*1024*1024});}
function corrected(){const c=raster();A.applyGround(c,park,entries);J.applyGround(c,park);S.applyGround(c,park);T.applyGround(c,park);return c;}
test('Safari photos put hot dogs north of meals, stalls east and the gate and bench west',()=>{
 const right=[Math.cos(2.94),Math.sin(2.94)],side=p=>(p[0]-57.5)*right[0]+(p[1]+199)*right[1];
 assert(S.hotdog.z<S.meal.z&&S.meal.z<S.coffee.z&&S.coffee.z<S.picnic.z);assert(side([S.meal.x,S.meal.z])<0);assert(side([S.gate.x,S.gate.z])>0&&side(S.bench)>0);
 assert(S.gate.width>=4.8&&S.gate.clearance>2.7);assert.deepEqual(M.centralTrees.slice(0,14),A.trees.concat(J.trees));
 const models=entries.filter(e=>['foodStalls','safariGate','safariAvenue'].includes(e.kind));assert.equal(models.length,3);assert(models.reduce((n,e)=>n+M.build(e).data.byteLength,0)<2*1024*1024);
 const e=models.find(e=>e.kind==='foodStalls'),normal=M.build(e);S.signsEnabled=false;const blank=M.build(e);S.signsEnabled=true;assert(normal.n>blank.n+500,'the vector signs have actual geometry');
});
test('the real raster opens the gate and keeps water, fixtures and the older crossroads intact',()=>{
 const c=raster();A.applyGround(c,park,entries);J.applyGround(c,park);const before=c.slice();S.applyGround(c,park);
 const blocked=p=>[4,5,12,13].includes(c[idx(...p)]&31);
 for(const p of [[53.9,-197.5],[44,-194.5],[38.5,-192.2],[35.5,-192.2],[33,-192.2],[60.8,-203.2],[62.7,-197.9]])assert(!blocked(p),`approach blocked at ${p}`);
 for(const p of [[S.hotdog.x,S.hotdog.z],[S.meal.x,S.meal.z],[S.coffee.x,S.coffee.z],[S.picnic.x,S.picnic.z],[S.ticket.x,S.ticket.z],S.bench,S.bin,[35.5,-195.4],[34.8,-210]])assert(blocked(p),`missing obstacle at ${p}`);
 for(let i=0;i<c.length;i++)if((before[i]&31)===4)assert.equal(c[i],before[i],'the pond cannot become entry paving');
 for(const p of [[47.2,-247.5],[42,-243],[54.3,-262.8],[60.1,-231.5],[-20,-300]])assert.equal(c[idx(...p)],before[idx(...p)],'prior crossroads categories stay unchanged');
 assert(S.replacesFence(36.46,-193.21));assert(!S.replacesFence(39,-170));assert(!S.replacesFence(25,-230));
});
test('new roadside trunks and fixtures clear the avenue and the complete train route',()=>{
 const c=corrected();for(let i=1;i<S.avenue.length;i++)for(let k=0;k<=30;k++){const a=S.avenue[i-1],b=S.avenue[i],f=k/30,x=a[0]+(b[0]-a[0])*f,z=a[1]+(b[1]-a[1])*f;if(z<-152.2)assert.equal(c[idx(x,z)]&31,3,`asphalt interrupted at ${x},${z}`);}
 for(const t of S.trees){assert(J.distance(S.avenue,...t)>6.4);assert(J.distance(S.approach,...t)>4.5);}
 for(let d=0;d<T.length;d+=.7)for(const p of T.poses(d)){assert(!S.solid(p.x,p.z));for(const t of S.trees)assert(!T.blockedAt({units:[p]},t[0],t[1],.4));}
});

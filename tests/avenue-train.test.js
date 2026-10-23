const {test}=require('node:test'),assert=require('node:assert/strict'),cp=require('node:child_process');
const T=require('../park-avenue-train'),M=require('../park-meshes'),A=require('../park-central-alley'),park=require('../park/park.json');
const angle=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
test('the train has one locomotive, three open carriages and reusable finite wheels below one MiB',()=>{
 const parts=T.build(M.Geometry);let bytes=0;assert.deepEqual(Object.keys(parts),['engine','blue','yellow','red','wheel','coupler']);
 for(const [name,p] of Object.entries(parts)){bytes+=p.data.byteLength;assert(p.n>0&&p.n%3===0);for(let i=0;i<p.data.length;i+=10){const v=Array.from(p.data.slice(i,i+10));assert(v.every(Number.isFinite));assert(Math.abs(Math.hypot(...v.slice(3,6))-1)<1e-5,name);assert(Math.hypot(v[0],v[1]-1,v[2])<p.radius);}}
 assert(bytes<1024*1024);for(const name of ['blue','yellow','red']){
  const p=parts[name];for(let i=0;i<p.data.length;i+=30){const v=[0,10,20].map(k=>p.data.slice(i+k,i+k+3));if(v.every(q=>q[1]>1.16&&q[1]<1.85))assert(v.some(q=>Math.abs(q[0])>.59||Math.abs(q[2])>.89),'window openings cannot be covered by a pane');}
 }
 assert.deepEqual(T.build(M.Geometry).engine.data,parts.engine.data);
});
test('the closed route goes both ways along the same avenue and joins both turns smoothly',()=>{
 assert(T.length>240&&T.length<270);const phases=new Set();let last=T.sample(0);
 for(let d=.12;d<=T.length+.12;d+=.12){const p=T.sample(d);phases.add(p.phase);assert(Math.hypot(p.x-last.x,p.z-last.z)<.121);assert(Math.abs(angle(p.heading,last.heading))<.12);last=p;}
 assert.equal(phases.size,4);assert(Math.abs(angle(T.sample(-.001).heading,T.sample(.001).heading))<.03);
 for(let d=0;d<T.length;d+=.5){const units=T.poses(d);for(let i=1;i<4;i++){
  const a=units[i-1],b=units[i],dist=Math.hypot(a.x-b.x,a.z-b.z);assert(dist>2.1&&dist<3.36,'carriages retain their separation through U-turns');
  const front=[b.x+Math.sin(b.heading)*T.spec.lengths[i]/2,b.z-Math.cos(b.heading)*T.spec.lengths[i]/2],rear=[a.x-Math.sin(a.heading)*T.spec.lengths[i-1]/2,a.z+Math.cos(a.heading)*T.spec.lengths[i-1]/2];assert(Math.hypot(front[0]-rear[0],front[1]-rear[1])<1.2,'couplers cannot stretch across the turn');
 }}
});
test('the full convoy stays on the actual corrected asphalt, outside beds, cafes and trunks',()=>{
 const cats=cp.execFileSync('python3',['-c',"from PIL import Image; import sys;sys.stdout.buffer.write(Image.open('park/ground.png').convert('RGB').getchannel('R').tobytes())"],{cwd:require('node:path').resolve(__dirname,'..'),maxBuffer:32*1024*1024});
 A.applyGround(cats,park,M.entries(park));T.applyGround(cats,park);
 for(let d=0;d<T.length;d+=.35)for(const p of T.poses(d))for(const u of [-.86,0,.86])for(const v of [-T.spec.lengths[p.index]/2,0,T.spec.lengths[p.index]/2]){
  const x=p.x+Math.cos(p.heading)*u+Math.sin(p.heading)*v,z=p.z+Math.sin(p.heading)*u-Math.cos(p.heading)*v,index=Math.floor((z-park.z0)/park.mpp)*park.w+Math.floor((x-park.x0)/park.mpp);
  assert([2,3,6].includes(cats[index]&31),`train leaves pavement: ${x}, ${z}, ${cats[index]&31}`);
 }
 const trees=park.trees.filter(t=>!M.centralClearsTree(...t)&&!M.verandaClearsTree(...t)).concat(M.centralTrees);
 for(let d=0;d<T.length;d+=1){const s={units:T.poses(d)};for(const t of trees)assert(!T.blockedAt(s,t[0],t[1],.36),'the train cannot pass through an existing trunk');}
});
test('the actual update completes repeated returns at 30, 60 and 120 fps without teleports',()=>{
 const states=[];for(const fps of [30,60,120]){const s=T.make(0);let travelled=0;for(let i=0;i<fps*420;i++){const prior=s.distance;T.update(s,1/fps);const d=(s.distance-prior+T.length)%T.length;assert(d<=T.spec.speed/fps+1e-8);travelled+=d;}assert(travelled>T.length*2);states.push(s);}
 for(const s of states.slice(1))assert(Math.abs(s.travel-states[0].travel)<1e-6);
});
test('the train yields to the stroller, remains stopped, and resumes when the lane clears',()=>{
 const s=T.make(T.length*.63);for(let i=0;i<120;i++)T.update(s,1/60);
 const p=s.units[0],pram={x:p.x+Math.sin(p.heading)*3.25,z:p.z-Math.cos(p.heading)*3.25};
 for(let i=0;i<180;i++)T.update(s,1/60,pram);assert(s.waiting);assert.equal(s.speed,0);const distance=s.distance;
 for(let i=0;i<120;i++)T.update(s,1/60,pram);assert.equal(s.distance,distance);
 for(let i=0;i<120;i++)T.update(s,1/60,{x:-200,z:-500});assert(!s.waiting);assert(s.speed>1);assert.notEqual(s.distance,distance);
 const body=s.units[2];assert(T.blockedAt(s,body.x,body.z,.3));assert(!T.blockedAt(s,body.x+4,body.z,.3));
 const before=s.distance;T.update(s,0);T.update(s,NaN);assert.equal(s.distance,before);
});
test('wheel rotation follows distance and retains the wheel axle position',()=>{
 const a=T.wheelPose(.73,.66,0),b=T.wheelPose(.73,.66,.4);assert.deepEqual(a.slice(12),b.slice(12));assert.notDeepEqual(a.slice(0,12),b.slice(0,12));assert.deepEqual(a.slice(12),[.73,.24,.66,1]);
});

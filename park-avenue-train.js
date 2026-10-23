// A trackless children's train. Local forward is -z; distances are in metres.
(function(root){
'use strict';
const spec={speed:1.35,turnSpeed:.72,radius:2.45,wheelRadius:.24,width:1.44,roofWidth:1.72,lengths:[3.10,2.10,2.10,2.10],offsets:[0,3.35,5.95,8.55],axles:[[-.95,0,.96],[-.66,.66],[-.66,.66],[-.66,.66]]};
const centerLine=[[22.4,-354],[27.6,-327.78],[36.04,-295],[41,-274],[49.2,-239]];
const C={red:[.66,.16,.12],blue:[.16,.32,.62],yellow:[.88,.53,.13],wood:[.57,.31,.13],gold:[.80,.61,.25],roof:[.14,.18,.19],green:[.13,.26,.22],rubber:[.07,.09,.09],steel:[.57,.62,.58],white:[.86,.86,.75]};
const mix=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t),mod=(x,n)=>(x%n+n)%n;
function catmull(a,b,c,d,t){return b.map((v,i)=>.5*((2*v)+(-a[i]+c[i])*t+(2*a[i]-5*v+4*c[i]-d[i])*t*t+(-a[i]+3*v-3*c[i]+d[i])*t*t*t));}
const center=[];
for(let i=0;i<centerLine.length-1;i++)for(let j=0;j<80;j++)center.push(catmull(centerLine[Math.max(0,i-1)],centerLine[i],centerLine[i+1],centerLine[Math.min(centerLine.length-1,i+2)],j/80));
center.push(centerLine.at(-1));
function tangent(i){const a=center[Math.max(0,i-1)],b=center[Math.min(center.length-1,i+1)],l=Math.hypot(b[0]-a[0],b[1]-a[1]);return [(b[0]-a[0])/l,(b[1]-a[1])/l];}
const route=[],segments=[];
function add(p,phase){route.push(p);segments.push(phase);}
for(let i=0;i<center.length;i++){const t=tangent(i);add([center[i][0]-t[1]*spec.radius,center[i][1]+t[0]*spec.radius],'outbound');}
function turn(i,sign,phase){const p=center[i],t=tangent(i),n=[-t[1],t[0]];for(let j=1;j<=64;j++){const a=j*Math.PI/64;add([p[0]+sign*spec.radius*(n[0]*Math.cos(a)+t[0]*Math.sin(a)),p[1]+sign*spec.radius*(n[1]*Math.cos(a)+t[1]*Math.sin(a))],phase);}}
turn(center.length-1,1,'south-turn');
for(let i=center.length-2;i>=0;i--){const t=tangent(i);add([center[i][0]+t[1]*spec.radius,center[i][1]-t[0]*spec.radius],'inbound');}
turn(0,-1,'north-turn');
const distances=[0];for(let i=1;i<route.length;i++)distances.push(distances.at(-1)+Math.hypot(route[i][0]-route[i-1][0],route[i][1]-route[i-1][1]));
const length=distances.at(-1);
function sample(distance){const d=mod(distance,length);let lo=0,hi=distances.length-1;while(hi-lo>1){const m=(lo+hi)>>1;if(distances[m]<=d)lo=m;else hi=m;}const a=route[lo],b=route[hi],u=(d-distances[lo])/(distances[hi]-distances[lo]),p=mix(a,b,u);return {x:p[0],z:p[1],heading:Math.atan2(b[0]-a[0],a[1]-b[1]),phase:segments[hi]};}
function poses(distance){return spec.offsets.map((offset,i)=>{const p=sample(distance-offset),a=sample(distance-offset+.40),b=sample(distance-offset-.40);return {...p,heading:Math.atan2(a.x-b.x,b.z-a.z),index:i};});}
function make(distance=length*.63){return {distance,speed:0,travel:0,waiting:false,units:poses(distance)};}
function blockedAt(state,x,z,r=.3){return state.units.some((p,i)=>{const dx=x-p.x,dz=z-p.z,c=Math.cos(p.heading),s=Math.sin(p.heading),u=dx*c+dz*s,v=dx*s-dz*c;return Math.abs(u)<spec.width/2+r&&Math.abs(v)<spec.lengths[i]/2+r;});}
function update(state,dt,pram){if(!(dt>0)||!Number.isFinite(dt))return;let remain=Math.min(dt,.25);while(remain>1e-8){const step=Math.min(remain,1/120);remain-=step;
 const p=state.units[0],dx=pram?pram.x-p.x:1e5,dz=pram?pram.z-p.z:1e5,forward=dx*Math.sin(p.heading)-dz*Math.cos(p.heading),across=dx*Math.cos(p.heading)+dz*Math.sin(p.heading);
 const ahead=forward>0&&forward<3.65&&Math.abs(across)<1.13,target=ahead?0:p.phase.includes('turn')?spec.turnSpeed:spec.speed;
 state.waiting=ahead;if(state.speed<target)state.speed=Math.min(target,state.speed+step*.75);else state.speed=Math.max(target,state.speed-step*2.5);
 const advance=state.speed*step,next=poses(state.distance+advance);
 // Yield if any part would meet the stroller, including the tail during a turn.
 if(pram&&blockedAt({units:next},pram.x,pram.z,.66)){state.speed=0;state.waiting=true;continue;}
 state.distance=mod(state.distance+advance,length);state.travel+=advance;state.units=next;
 }}
function centerDistance(x,z){let best=1e6;for(let i=1;i<center.length;i++){const a=center[i-1],b=center[i],dx=b[0]-a[0],dz=b[1]-a[1],u=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz)));best=Math.min(best,Math.hypot(x-a[0]-u*dx,z-a[1]-u*dz));}return best;}
function clearsTree(x,z){return z> -360&&z< -233&&x>15&&x<56&&centerDistance(x,z)<4.35;}
function applyGround(cats,park){for(let iz=Math.max(0,Math.floor((-359-park.z0)/park.mpp));iz<=Math.min(park.h-1,Math.ceil((-233-park.z0)/park.mpp));iz++)for(let ix=Math.max(0,Math.floor((15-park.x0)/park.mpp));ix<=Math.min(park.w-1,Math.ceil((56-park.x0)/park.mpp));ix++){
 const x=park.x0+(ix+.5)*park.mpp,z=park.z0+(iz+.5)*park.mpp,index=iz*park.w+ix;
 if(![4,5,12,13].includes(cats[index]&31)&&centerDistance(x,z)<4.5)cats[index]=67;
 }}
function cylinder(g,a,b,r,col,mat=7,n=12){g.beam(a,b,r,col,mat,n);const d=b.map((x,i)=>x-a[i]),len=Math.hypot(...d),t=d.map(x=>x/len),axis=Math.abs(t[1])<.9?[0,1,0]:[1,0,0];let u=[t[1]*axis[2]-t[2]*axis[1],t[2]*axis[0]-t[0]*axis[2],t[0]*axis[1]-t[1]*axis[0]],l=Math.hypot(...u);u=u.map(v=>v/l);const v=[t[1]*u[2]-t[2]*u[1],t[2]*u[0]-t[0]*u[2],t[0]*u[1]-t[1]*u[0]],p=(c,i)=>c.map((x,j)=>x+r*(u[j]*Math.cos(i*Math.PI*2/n)+v[j]*Math.sin(i*Math.PI*2/n)));for(let i=0;i<n;i++){g.tri(a,p(a,i+1),p(a,i),col,mat);g.tri(b,p(b,i),p(b,i+1),col,mat);}}
function roof(g,width,z0,z1,y){const profile=[[-width/2,y],[-width*.36,y+.09],[0,y+.13],[width*.36,y+.09],[width/2,y]];for(let i=1;i<profile.length;i++){const a=profile[i-1],b=profile[i];g.quad([a[0],a[1],z0],[a[0],a[1],z1],[b[0],b[1],z1],[b[0],b[1],z0],C.roof,2);}for(const z of [z0,z1])for(let i=1;i<profile.length;i++)g.quad([profile[i-1][0],y-.09,z],[profile[i][0],y-.09,z],[profile[i][0],profile[i][1],z],[profile[i-1][0],profile[i-1][1],z],C.roof,2);g.box(0,y-.09,(z0+z1)/2,width,.04,z1-z0,C.roof,2);}
function badge(g,x,z,col){for(let i=0;i<12;i++){const a=i*Math.PI/6,b=(i+1)*Math.PI/6;g.tri([x,1.0,z],[x,1.0+Math.cos(a)*.17,z+Math.sin(a)*.17],[x,1.0+Math.cos(b)*.17,z+Math.sin(b)*.17],col,7);}g.box(x,1.0,z,.015,.10,.11,C.gold,2);}
function coach(g,col){g.box(0,.32,0,1.43,.16,2.10,C.roof,2);g.box(0,.48,0,1.36,.62,2.02,col,12);
 // No glazing or infill: the upper windows and both doorways are open.
 for(const side of [-1,1])for(const z of [-.92,0,.92])g.box(side*.65,1.08,z,.085,1.06,.10,C.wood,12);
 for(const side of [-1,1]){g.box(side*.69,1.07,0,.06,.06,2.10,C.gold,2);g.box(side*.69,.54,0,.06,.055,2.10,C.gold,2);for(const z of [-.52,.52])badge(g,side*.721,z,col===C.blue?C.gold:C.green);}
 for(const z of [-.83,.83]){g.box(0,.60,z,1.18,.09,.33,C.wood,12);g.box(0,.75,z,1.18,.40,.075,col,12);for(const x of [-.51,.51])g.box(x,.40,z,.06,.25,.09,C.roof,2);}
 for(const z of [-1.02,1.02]){g.box(-.46,1.1,z,.30,.60,.055,C.wood,12);g.box(.46,1.1,z,.30,.60,.055,C.wood,12);}
 roof(g,spec.roofWidth,-1.15,1.15,2.10);g.box(0,2.22,0,.75,.09,.76,col,12);
 for(const side of [-1,1])g.box(side*.58,.26,0,.31,.055,.72,C.roof,2);
}
function engine(g){g.box(0,.30,0,1.44,.17,3.10,C.roof,2);g.box(0,.46,.91,1.37,.60,1.12,C.red,12);g.box(0,1.03,.91,1.39,.07,1.15,C.gold,2);
 cylinder(g,[0,.99,-1.30],[0,.99,.07],.46,C.green,2,16);cylinder(g,[0,.99,-1.35],[0,.99,-1.29],.47,C.roof,2,16);cylinder(g,[0,.99,-1.38],[0,.99,-1.35],.34,C.red,2,16);
 cylinder(g,[0,1.24,-.93],[0,1.92,-.93],.125,C.roof,2,10);cylinder(g,[0,1.88,-.93],[0,2.04,-.93],.19,C.roof,2,10);cylinder(g,[0,1.39,-.12],[0,1.60,-.12],.16,C.gold,2,10);
 for(const side of [-1,1]){g.box(side*.69,.48,-.48,.18,.10,1.85,C.red,2);for(const z of [.28,1.40])g.box(side*.62,1.05,z,.075,1.10,.075,C.green,12);g.box(side*.70,.56,.91,.04,.045,1.13,C.gold,2);}
 roof(g,1.73,.12,1.54,2.14);g.box(0,.68,.42,.95,.12,.40,C.roof,2);g.box(0,.85,1.15,.95,.35,.10,C.roof,2);
 cylinder(g,[-.29,1.38,.48],[.29,1.38,.48],.025,C.roof,2,8);
 for(const x of [-.47,.47])cylinder(g,[x,.65,-1.55],[x,.65,-1.59],.12,C.white,7,10);
 // Small boiler bands, a central headlamp and a striped bumper.
 for(const z of [-1.11,-.26])cylinder(g,[0,.99,z-.018],[0,.99,z+.018],.473,C.gold,2,16);
 cylinder(g,[0,1.18,-1.39],[0,1.18,-1.47],.115,C.gold,2,12);cylinder(g,[0,1.18,-1.48],[0,1.18,-1.49],.08,C.white,7,10);
 g.box(0,.31,-1.59,1.52,.16,.12,C.red,2);for(let x=-.64;x<.7;x+=.21)g.box(x,.32,-1.657,.055,.14,.012,C.gold,2);
}
function wheel(g){cylinder(g,[-.075,0,0],[.075,0,0],spec.wheelRadius,C.rubber,18,16);cylinder(g,[-.082,0,0],[.082,0,0],.14,C.steel,2,12);for(const side of [-1,1])for(let i=0;i<4;i++){const a=i*Math.PI/2;g.beam([side*.086,0,0],[side*.086,Math.cos(a)*.18,Math.sin(a)*.18],.014,C.roof,2,4);}cylinder(g,[-.096,0,0],[.096,0,0],.055,C.white,2,8);}
function finish(g){const data=new Float32Array(g.data);return {data,n:data.length/10,center:[0,1,0],radius:2.8};}
function build(Geometry){const make=fn=>{const g=new Geometry();fn(g);return finish(g);};return {engine:make(engine),blue:make(g=>coach(g,C.blue)),yellow:make(g=>coach(g,C.yellow)),red:make(g=>coach(g,C.red)),wheel:make(wheel),coupler:make(g=>cylinder(g,[0,0,0],[0,0,1],.035,C.roof,2,6))};}
function wheelPose(x,z,travel){const a=-travel/spec.wheelRadius,c=Math.cos(a),s=Math.sin(a);return [1,0,0,0,0,c,s,0,0,-s,c,0,x,spec.wheelRadius,z,1];}
const api={spec,centerLine,route,distances,length,sample,poses,make,update,blockedAt,centerDistance,clearsTree,applyGround,build,wheelPose};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ParkAvenueTrain=api;
})(typeof window!=='undefined'?window:globalThis);

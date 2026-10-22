const {test}=require('node:test'),assert=require('node:assert/strict');
const Meshes=require('../park-meshes.js'),House=require('../park-upside-down-house.js'),Shore=require('../park-house-surroundings.js');
const park=require('../park/park.json'),all=Meshes.entries(park),house=all.find(e=>e.kind==='upsideDownHouse'),f=House.frame(house);

test('the large halls become a small police cabin and an open mooring; the kiosk moves beside the entrance',()=>{
 const police=all.find(e=>e.id==='b5'),shore=all.find(e=>e.id==='b6'),ticket=all.find(e=>e.id==='b122');
 assert.equal(police.kind,'policePost');assert.equal(shore.kind,'shoreMooring');assert.equal(ticket.kind,'shoreTicket');
 assert.equal(all.find(e=>e.id==='b3').kind,'building','the unrelated building across the street survives');
 const area=p=>Math.abs(p.reduce((s,a,i)=>{const b=p[(i+1)%p.length];return s+a[0]*b[1]-a[1]*b[0];},0))/2;
 assert(area(Shore.footprint(police))<area(park.buildings[5].pts)*.1);
 assert(area(Shore.footprint(ticket))<5);
 const entrance=f.at(0,0,0),old=park.buildings[122].pts.reduce((a,p)=>a.map((v,i)=>v+p[i]/4),[0,0]);
 assert(Math.hypot(ticket.cx-entrance[0],ticket.cz-entrance[2])<Math.hypot(old[0]-entrance[0],old[1]-entrance[2])-2);
 assert(Shore.sites.policePost.x< -f.width/2-2&&Shore.sites.shoreTicket.x>f.width/2+2);
 const mooring=Meshes.build(shore);let high=0;
 for(let i=1;i<mooring.data.length;i+=10)high=Math.max(high,mooring.data[i]);
 assert(high<1.8,'no tall concrete shell remains at the waterfront');
 assert.equal(Shore.boats.length,4);
});

test('both old halls and the former kiosk are walkable while the new cabins and stairs block the stroller',()=>{
 const grid={...park},cats=new Uint8Array(park.w*park.h).fill(75);
 const index=(x,z)=>Math.floor((z-grid.z0)/grid.mpp)*grid.w+Math.floor((x-grid.x0)/grid.mpp);
 for(const i of [5,6,122,123]){
  const p=park.buildings[i].pts;
  for(let z=Math.min(...p.map(q=>q[1]));z<=Math.max(...p.map(q=>q[1]));z+=.2)
   for(let x=Math.min(...p.map(q=>q[0]));x<=Math.max(...p.map(q=>q[0]));x+=.2)if(House.inside(p,x,z))cats[index(x,z)]=101;
 }
 const unrelated=index(-28,-362),water=index(-42,-408);cats[unrelated]=69;cats[water]=68;
 House.applyGround(cats,park,house);Shore.applyGround(cats,grid,all);
 for(const p of [[-63,-382],[-27,-402.5],[-42.9,-395.4]])assert.equal(cats[index(...p)],75,'removed structure becomes walkable: '+p);
 for(const e of all.filter(e=>['policePost','shoreTicket'].includes(e.kind)))assert.equal(cats[index(e.cx,e.cz)]&31,5);
 const stair=f.at(5.15,0,-2.8);assert.equal(cats[index(stair[0],stair[2])]&31,5);
 assert.equal(cats[unrelated],69);assert.equal(cats[water],68);
 for(const [x,z] of House.footprint(house)){
  const inner=[x*.9+house.cx*.1,z*.9+house.cz*.1];assert.equal(cats[index(...inner)]&31,5,'the house keeps its collision footprint');
 }
});

test('the actual delivered mesh has a full steel flight and elevated landing on the right',()=>{
 const g=Meshes.build(house),stairs=[];
 for(let i=0;i<g.data.length;i+=10){const x=g.data[i],y=g.data[i+1],z=g.data[i+2],dx=x-f.center[0],dz=z-f.center[1];if(dx*f.right[0]+dz*f.right[1]>4.45&&y<4.5)stairs.push(y);}
 assert(stairs.length>400);assert(Math.min(...stairs)<.16&&Math.max(...stairs)>4.3);
});

test('the police facade and collision footprint turn exactly 90 degrees toward the house',()=>{
 const e=all.find(e=>e.kind==='policePost'),s=Shore.sites.policePost,p=Shore.footprint(e);
 const original=[[-s.w/2,-s.depth/2],[s.w/2,-s.depth/2],[s.w/2,s.depth/2],[-s.w/2,s.depth/2]].map(([x,d])=>f.at(s.x+x,0,s.d+d));
 for(let i=0;i<4;i++){
  const a=[original[i][0]-e.cx,original[i][2]-e.cz],b=[p[i][0]-e.cx,p[i][1]-e.cz];
  assert(Math.abs(a[0]*b[0]+a[1]*b[1])<1e-8);
  assert(Math.abs(Math.hypot(...a)-Math.hypot(...b))<1e-8);
  assert(a[0]*b[1]-a[1]*b[0]<0,'the facade faces along the path toward the house');
 }
 const mesh=Meshes.build(e),normals=[];
 for(let i=0;i<mesh.data.length;i+=10)if(mesh.data[i+9]===13)normals.push([mesh.data[i+3],mesh.data[i+5]]);
 assert.equal(normals.length,6);
 assert(normals.every(([x,z])=>x*f.right[0]+z*f.right[1]>.99),'the sign faces along the house frontage toward the house');
});

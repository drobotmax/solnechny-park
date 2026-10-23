const {test}=require('node:test'),assert=require('node:assert/strict');
const Meshes=require('../park-meshes.js'),Ride=require('../park-transylvania.js');
const park=require('../park/park.json');

test('Transylvania replaces the mushroom ride east of the ticket office, facing the square',()=>{
 const all=Meshes.entries(park),rides=all.filter(e=>e.kind==='transylvania');
 assert.equal(rides.length,1);const e=rides[0],f=Ride.layout(e);
 assert.equal(e.id,'r3');assert.deepEqual(e.pts,park.rides[3].pts);
 const ticket=all.find(e=>e.kind==='ticketOffice');
 assert(e.cx>ticket.cx&&e.cz>ticket.cz);
 assert(f.radius>5&&f.radius<6);
 assert(f.front[0]<-.9,'entry faces west toward the ticket-office forecourt');
 assert(f.right[0]*f.front[1]-f.right[1]*f.front[0]>.99,'front artwork must read left to right from outside');
 assert(!all.some(e=>e.id==='r7'),'the still unidentified neighbouring platform retains its model');
 assert.equal(all.find(e=>e.id==='r8').kind,'kiddieCarousel','the new panorama identifies the small open carousel');
});

test('ride has four decorated tapered faces, tall swan ornaments and low wheeled carriages',()=>{
 const e=Meshes.entries(park).find(e=>e.kind==='transylvania'),f=Ride.layout(e),g=Meshes.build(e);
 const ornaments=[0,0,0,0],wheels=[0,0,0,0],faces=new Set();let art=0,top=0;
 for(let i=0;i<g.data.length;i+=10){
  const [x,y,z,nx,ny,nz,u,v,b,material]=g.data.subarray(i,i+10);
  const dx=(x-e.cx)/f.scale,dz=(z-e.cz)/f.scale,h=y/f.scale;
  const localX=dx*f.right[0]+dz*f.right[1],localZ=dx*f.front[0]+dz*f.front[1];
  const quadrant=(localX>=0?0:2)+(localZ>=0?0:1),r=Math.hypot(localX,localZ);
  top=Math.max(top,h);
  if(h>5.4&&r>2.8&&u>.9&&v>.9)ornaments[quadrant]++;
  if(h>.1&&h<1.2&&r>2.5&&r<4.9&&material===10)wheels[quadrant]++;
  if(material===9){
   art++;assert(u>=0&&u<=1&&v>=0&&v<=1);
   if(h>4.5){
    assert(nx*(x-e.cx)+nz*(z-e.cz)>.8,'painted tower faces must point outward');
    faces.add([Math.round(nx),Math.round(nz)].join(','));
   }
  }
 }
 assert(art>250&&faces.size===4,'all four upper faces and the carriage panels carry artwork');
 assert(ornaments.every(n=>n>100),'each diagonal arm has a high white swan');
 assert(wheels.every(n=>n>1000),'carriages and their wheels occupy all four quadrants');
 assert(top>7.19&&top<7.5,'finial stays above the swans without becoming a tower ride');
 assert(g.data.byteLength<1100000,'repeated fine rails must stay within the existing landmark budget');
});

test('tower atlas lettering advances to the viewer right on every exterior face',()=>{
 const e=Meshes.entries(park).find(e=>e.kind==='transylvania'),f=Ride.layout(e),g=Meshes.build(e);
 let samples=0;
 for(let i=0;i<g.data.length;i+=30){
  const a=g.data.subarray(i,i+10),b=g.data.subarray(i+10,i+20),c=g.data.subarray(i+20,i+30);
  if(a[9]!==9||Math.abs(a[1]/f.scale-2.47)>.001||Math.abs(b[1]/f.scale-2.47)>.001||c[1]/f.scale<5)continue;
  const screenDelta=(b[0]-a[0])*a[5]-(b[2]-a[2])*a[3];
  assert((b[6]-a[6])*screenDelta>0,'UV direction must agree with exterior camera right');
  samples++;
 }
 assert(samples>=32,'all strips on all four illustrated faces were checked');
});

const {test}=require('node:test'),assert=require('node:assert/strict');
const Meshes=require('../park-meshes.js'),Ticket=require('../park-ticket-office.js');
const park=require('../park/park.json');

test('ticket office replaces the mapped generic building and faces the fountain forecourt',()=>{
 const entries=Meshes.entries(park),ticket=entries.filter(e=>e.kind==='ticketOffice');
 assert.equal(ticket.length,1);assert.equal(ticket[0].id,'b4');
 assert.deepEqual(ticket[0].pts,park.buildings[4].pts,'retain the source collision footprint');
 const f=Ticket.frame(ticket[0]);
 assert(f.width>9&&f.width<11);assert(f.depth>20&&f.depth<23);
 const fountain=[-27.997,-315.54],toFountain=fountain.map((v,i)=>v-f.front[i]);
 assert(toFountain[0]*f.inward[0]+toFountain[1]*f.inward[1]<-8,'cash windows face the open square');
 assert.deepEqual(f.at(0,0,0),[ticket[0].pts[0][0],0,ticket[0].pts[0][1]]);
});

test('ticket-office mesh has valid atlas UVs, reflective canopy and a low white roof',()=>{
 const e=Meshes.entries(park).find(e=>e.kind==='ticketOffice'),g=Meshes.build(e),f=Ticket.frame(e);
 let atlasVertices=0,signVertices=0,canopyVertices=0,frontmost=0,highest=0;
 for(let i=0;i<g.data.length;i+=10){
  const [x,y,z,nx,ny,nz,r,green,b,material]=g.data.subarray(i,i+10);
  assert([x,y,z,nx,ny,nz,r,green,b,material].every(Number.isFinite));
  assert(Math.abs(Math.hypot(nx,ny,nz)-1)<1e-5);
  highest=Math.max(highest,y);
  assert.notEqual(material,4,'the generic red roof must be absent');
  if(material===6){
   atlasVertices++;assert(r>=0&&r<=1&&green>=0&&green<=1);
   if(y>3.2){signVertices++;assert(green<.44,'the sign must sample the lettering region');}
  }
  if(material===8){
   canopyVertices++;
   const d=(x-f.at(0,0,0)[0])*f.inward[0]+(z-f.at(0,0,0)[2])*f.inward[1];
   frontmost=Math.min(frontmost,d);assert(y>1.9&&y<2.9);
  }
 }
 assert.equal(atlasVertices,66,'map, seven service windows, two poster strips and roof sign');
 assert.equal(signVertices,6);
 assert(canopyVertices>5000&&frontmost< -1,'the curved awning must project over the service windows');
 assert(highest>4&&highest<4.1);
 assert(g.data.byteLength<400000,'one facade must not dominate the mesh budget');
 assert.deepEqual(g.data,Meshes.build(e).data,'stream eviction must not change the facade');
});

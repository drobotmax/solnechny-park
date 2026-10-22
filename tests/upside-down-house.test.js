const {test}=require('node:test'),assert=require('node:assert/strict');
const Meshes=require('../park-meshes.js'),House=require('../park-upside-down-house.js');
const park=require('../park/park.json');

test('upside-down house uses the mapped 2B footprint between the entrance pavilions',()=>{
 const all=Meshes.entries(park),houses=all.filter(e=>e.kind==='upsideDownHouse');
 assert.equal(houses.length,1);const e=houses[0],f=House.frame(e);
 assert.equal(e.id,'b123');assert.deepEqual(e.pts,park.buildings[123].pts);
 assert(f.width>8&&f.width<8.3&&f.depth>6.5&&f.depth<7.2);
 const west=all.find(e=>e.id==='b5'),east=all.find(e=>e.id==='b6');
 assert(west.cx<e.cx&&e.cx<east.cx);
 assert.equal(west.kind,'building');assert.equal(east.kind,'building');
 assert(f.front[0]>.39&&f.front[1]>.91,'the entrance faces southeast across the adjacent path');
 const rotated=House.footprint(e);
 for(let i=0;i<4;i++){
  const a=e.pts[i].map((v,k)=>v-[e.cx,e.cz][k]),b=rotated[i].map((v,k)=>v-[e.cx,e.cz][k]);
  assert(Math.abs(a[0]*b[0]+a[1]*b[1])<1e-8,'the house turns exactly 90 degrees about its centre');
  assert(a[0]*b[1]-a[1]*b[0]>0,'the entrance turns toward the path');
  assert(Math.abs(Math.hypot(...a)-Math.hypot(...b))<1e-8,'rotation keeps the original dimensions');
 }
 for(const [x,d,index] of [[-f.width/2,0,2],[f.width/2,0,3],[-f.width/2,-f.depth,1],[f.width/2,-f.depth,0]]){
  const p=f.at(x,0,d);assert(Math.hypot(p[0]-rotated[index][0],p[2]-rotated[index][1])<1e-8);
 }
});

test('collision raster follows the rotated house and frees its former corners',()=>{
 const e=Meshes.entries(park).find(e=>e.kind==='upsideDownHouse');
 const grid={x0:-56.1,z0:-396.1,w:80,h:80,mpp:.2},cats=new Uint8Array(6400).fill(75);
 const index=(x,z)=>Math.round((z+396)/.2)*grid.w+Math.round((x+56)/.2);
 const oldCorner=index(-52.8,-390.6),newCorner=index(-50.4,-384),neighbour=index(-44.4,-392.4);
 cats[oldCorner]=101;cats[neighbour]=69;
 House.applyGround(cats,grid,e);
 assert.equal(cats[oldCorner],75,'old solid/unreachable cell becomes a walkable forecourt');
 assert.equal(cats[newCorner],69,'newly covered corner blocks the stroller');
 assert.equal(cats[neighbour],69,'a nearby unrelated building is preserved');
});

test('red pitched surfaces stay below the wood walls and foundation cap',()=>{
 const e=Meshes.entries(park).find(e=>e.kind==='upsideDownHouse'),g=Meshes.build(e);
 let roof=0,wood=0,lowGlass=0,highGlass=0,cap=0,top=0;
 for(let i=0;i<g.data.length;i+=10){
  const [x,y,z,nx,ny,nz,r,green,b,material]=g.data.subarray(i,i+10);top=Math.max(top,y);
  if(material===11){roof++;assert(y>=.12&&y<=2.31,'roof belongs at ground level');assert(r>green*3);}
  if(material===12){wood++;assert(y>=2.27&&y<=6.56,'wood walls rise above the inverted roof');}
  if(material===3){if(y<2.4)lowGlass++;if(y>3.4)highGlass++;}
  if(material===2&&y>6.5)cap++;
 }
 assert(roof>=30&&wood>=48&&lowGlass>=24&&highGlass>=24&&cap>=30);
 assert(top>6.79&&top<6.9,'the flat foundation must sit above the walls');
 assert(g.data.byteLength<300000,'one small house must remain cheaper than a detailed ride');
});

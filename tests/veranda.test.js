const {test}=require('node:test'),assert=require('node:assert/strict');
const Meshes=require('../park-meshes.js'),Veranda=require('../park-veranda.js'),House=require('../park-upside-down-house.js');
const park=require('../park/park.json'),all=Meshes.entries(park),main=all.find(e=>e.kind==='veranda'),gazebo=all.find(e=>e.kind==='verandaGazebo');

test('Veranda replaces the two mapped 2A/5 pavilions beside Tut Coffee',()=>{
 assert.equal(main.id,'b81');assert.equal(gazebo.id,'b50');
 assert.deepEqual(main.pts,park.buildings[81].pts);assert.deepEqual(gazebo.pts,park.buildings[50].pts);
 assert(all.find(e=>e.kind==='tutCoffee').cx<main.cx&&main.cx<gazebo.cx);
 const f=Veranda.frame(main);assert(f.width>12&&f.width<14&&f.depth>15&&f.depth<17);
 assert(f.front[1]>.99,'the terrace faces the promenade south of the cafe');
 assert.equal(park.trees.filter(t=>Veranda.clearsTree(t[0],t[1])).length,1,'only the guessed tree obstructing the gravel frontage is retired');
});

test('Veranda has an open floral terrace, white fence, pink bicycle and a shingled gazebo with cupola',()=>{
 const mesh=Meshes.build(main),g=Meshes.build(gazebo);let pink=0,roof=0,sign=0,leaves=0,white=0,tent=0,high=0;
 for(let i=0;i<mesh.data.length;i+=10){
  const [,y,,,ny,,r,green,b,mat]=mesh.data.subarray(i,i+10);high=Math.max(high,y);
  if(mat===10&&r>.8&&green<.2&&b>.4)pink++;
  if(mat===14)roof++;
  if(mat===15){sign++;assert(r>=0&&r<=1&&green>=0&&green<=1);}
  if(green>r*1.5&&green>b*1.3)leaves++;
  if(mat===7&&r>.8&&green>.8&&y<1.4)white++;
  if(mat===7&&r>.85&&y>=2.8&&y<=5.16&&Math.abs(ny)>.1)tent++;
 }
 assert(pink>300&&roof>=18&&sign===6&&leaves>1000&&white>1500&&tent>=12);
 assert(high>7.4&&high<7.5,'the timber room has its pitched roof, without the old 8m parapet');
 assert(mesh.data.byteLength<650000&&g.data.byteLength<150000);
 assert(g.data.some((v,i)=>i%10===1&&v>5.3),'the gazebo has a raised roof lantern');
});

test('the entrance sign faces the bridge at 45 degrees to the promenade',()=>{
 const mesh=Meshes.build(main),f=Veranda.frame(main),sign=[];
 for(let i=0;i<mesh.data.length;i+=10)if(mesh.data[i+9]===15)sign.push(Array.from(mesh.data.subarray(i,i+3)));
 const dx=sign[1][0]-sign[0][0],dz=sign[1][2]-sign[0][2],length=Math.hypot(dx,dz);
 const along=(dx*f.right[0]+dz*f.right[1])/length,towardStreet=(dx*f.front[0]+dz*f.front[1])/length;
 assert(Math.abs(along-Math.SQRT1_2)<1e-5&&Math.abs(towardStreet-Math.SQRT1_2)<1e-5,'the delivered sign geometry must follow the diagonal southwest entrance');
});

test('the entrance stays passable, the terrace fence blocks, and the gazebo frees its old square corners',()=>{
 const cats=new Uint8Array(park.w*park.h).fill(75),index=(x,z)=>Math.floor((z-park.z0)/park.mpp)*park.w+Math.floor((x-park.x0)/park.mpp);
 for(const e of [main,gazebo]){
  const xs=e.pts.map(p=>p[0]),zs=e.pts.map(p=>p[1]);
  for(let z=Math.min(...zs);z<=Math.max(...zs);z+=.2)for(let x=Math.min(...xs);x<=Math.max(...xs);x+=.2)if(House.inside(e.pts,x,z))cats[index(x,z)]=69;
 }
 const f=Veranda.frame(main),at=(x,d)=>{const p=f.at(x,0,d);return index(p[0],p[2]);},gf=Veranda.frame(gazebo),corner=gf.at(.3,0,-.3),water=index(55,-430),coffee=index(33,-406);
 cats[water]=68;cats[coffee]=69;Veranda.applyGround(cats,park,all);
 const gate=Veranda.entrance();
 for(const d of [-.8,0,.8]){const p=gate.at(0,0,d);assert.equal(cats[at(p[0],p[2])],75,'the diagonal gate and its approach are open');}
 const end=gate.at(1.65,0,0);assert.equal(cats[at(end[0],end[2])]&31,13,'the diagonal fence meets the right arch post');
 assert.equal(cats[at(5,3.62)]&31,13,'the white picket fence blocks the stroller');
 assert.equal(cats[at(5,7.5)],75,'the public promenade remains open');
 assert.equal(cats[index(gazebo.cx,gazebo.cz)]&31,5);
 assert.equal(cats[index(corner[0],corner[2])],75,'the retired square shell has no ghost corner');
 assert.equal(cats[index(main.cx,main.cz)]&31,5);assert.equal(cats[water],68);assert.equal(cats[coffee],69);
});

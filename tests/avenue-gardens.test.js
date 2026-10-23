const {test}=require('node:test'),assert=require('node:assert/strict');
const G=require('../park-avenue-gardens'),M=require('../park-meshes'),A=require('../park-central-alley'),park=require('../park/park.json');
const entries=M.entries(park),at=(x,z)=>Math.floor((z-park.z0)/park.mpp)*park.w+Math.floor((x-park.x0)/park.mpp);
test('the next station keeps the cafe to the left and separate planted beds to the right',()=>{
 const heading=2.94,right=[Math.cos(heading),Math.sin(heading)],side=p=>(p[0]-34)*right[0]+(p[1]+305)*right[1];
 assert(side(G.world(16,3))<0);assert(G.bed.every(p=>side(p)>0));
 assert(G.bed.every(p=>p[1]>-296),'the new bed cannot close the bench and cross passage after the existing bed');
 assert(G.trees.every(p=>G.pathDistance(p[0],p[1])>5.3),'new trunks stay inside the planted verge, outside the avenue');
 assert.equal(entries.filter(e=>e.kind==='mainAvenue').length,1);
 const mesh=M.build(entries.find(e=>e.kind==='mainAvenue'));
 assert(mesh.data.byteLength<2*1024*1024,'the additional garden stays within two MiB');
 const cafe=M.build(entries.find(e=>e.id==='b47'));
 assert(cafe.data.some((v,i)=>i%10===9&&v===17),'tablecloths use the existing fabric material');
 assert(cafe.data.some((v,i)=>i%10===6&&Math.abs(v-.79)<1e-5),'the rose tablecloth detail is retained');
});
test('discrete terrace planters block while their photographed entry gaps are open',()=>{
 const cats=new Uint8Array(park.w*park.h).fill(75);A.applyGround(cats,park,entries);
 for(const u of G.cafe.planters){const p=G.world(u,0);assert.equal(cats[at(...p)]&31,13);}
 for(let i=0;i<G.cafe.planters.length-1;i++){const u=(G.cafe.planters[i]+G.cafe.planters[i+1])/2;for(const v of [-1.15,-.90,-.65,-.25,0,.30,.65]){const p=G.world(u,v);assert(![4,5,12,13].includes(cats[at(...p)]&31),'planters and lamps must leave a clear approach to every entry');}}
 for(const u of [9.3,23.8]){const p=G.world(u,7.4);assert(![4,5,12,13].includes(cats[at(...p)]&31),'frontage doors remain open');}
 const wall=G.world(15,7.4);assert.equal(cats[at(...wall)]&31,5);
});
test('the avenue and garden cross passage stay open without admitting prams into beds or fittings',()=>{
 const cats=new Uint8Array(park.w*park.h).fill(65);A.applyGround(cats,park,entries);
 for(const [x,z] of [[34,-305],[36,-295],[39,-282],[41,-274],[43,-261],[23,-298.8]])assert.equal(cats[at(x,z)]&31,3);
 assert.equal(cats[at(30,-285)]&31,13);
 for(const p of G.benches.concat([G.notice]))assert.equal(cats[at(...p)]&31,13);
 const old=G.world(20,-4);assert.equal(cats[at(...old)]&31,3);
 assert.equal(cats[at(-40,-360)],65,'the plaza and distant park are outside this correction');
 assert(M.centralClearsTree(26.6,-300.3),'the photographed lawn is open below the crowns');
 assert(!M.centralClearsTree(-30,-260),'distant tree choices are untouched');
});

test('the main Tropikanka entrance is wider than the table bays and open up to the recessed doorway',()=>{
 const cats=new Uint8Array(park.w*park.h).fill(69);A.applyGround(cats,park,entries);
 const {u,width}=G.cafe.entrance;
 assert(width>=4.5);
 for(let du=-1.25;du<=1.25;du+=.25)for(let v=-1;v<=7.75;v+=.25){
  const p=G.world(u+du,v);assert(![4,5,12,13].includes(cats[at(...p)]&31),`main entry blocked at ${du}, ${v}`);
 }
 for(const p of [-12,-7.4]){const q=G.world(p,0);assert.equal(cats[at(...q)]&31,13,'the continuation has real planter collisions');}
 for(const p of [G.notice,G.bin])assert.equal(cats[at(...p)]&31,13);
 const annex=G.world(-10,10);assert.equal(cats[at(...annex)]&31,5,'the annex cannot be crossed beyond the entrance');
 const tree=G.trees.at(-1),uv=G.local(...tree);assert(uv[0]<0&&uv[1]>5,'the mature tree belongs inside the extended terrace');
});

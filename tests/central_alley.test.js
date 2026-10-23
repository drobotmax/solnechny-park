const {test}=require('node:test'),assert=require('node:assert/strict');
const A=require('../park-central-alley'),M=require('../park-meshes'),park=require('../park/park.json');
const all=M.entries(park),get=k=>all.find(e=>e.kind===k);
test('the panorama turn reveals parasol, cars, wedding carousel and cafe in mapped order',()=>{
 const a=get('toyCarousel'),b=get('carCarousel'),c=get('weddingCarousel'),d=get('alleyCafe');
 assert.equal(a.id,'r29');assert.equal(b.id,'r28');assert.equal(c.id,'r36');assert.equal(d.id,'b47');
 assert(a.cz<b.cz&&b.cz<c.cz&&a.cx<b.cx&&b.cx<c.cx&&c.cx<d.cx);
 const headings=[a,b,c,d].map(e=>Math.atan2(e.cx-26,-(e.cz+334)));
 for(let i=1;i<headings.length;i++)assert(headings[i]>headings[i-1],'the rides must appear in the same rightward sweep as the supplied photos');
 assert(A.bed.every(p=>p[0]<25),'the planted bed stays on the left when facing the plaza');
});
test('the avenue models have distinct silhouettes and low kiosks behind the rides',()=>{
 const height=k=>{const d=M.build(get(k)).data;let y=0;for(let i=1;i<d.length;i+=10)y=Math.max(y,d[i]);return y;};
 assert(height('carCarousel')>4.3&&height('carCarousel')<4.7);
 assert(height('toyCarousel')>5.2&&height('weddingCarousel')>5.9);
 for(const e of all.filter(e=>e.kind==='rideBooth')){const d=M.build(e).data;for(let i=1;i<d.length;i+=10)assert(d[i]<2.2,'the former tall box cannot remain beside the rides');}
 const cafe=M.build(get('alleyCafe')).data;let parasols=0;for(let i=0;i<cafe.length;i+=10)if(cafe[i+1]>2.7&&cafe[i+6]>.8&&cafe[i+7]>.8)parasols++;
 assert(parasols>=48,'the cafe needs several pale outdoor parasols');
});
test('the public avenue and cross passage stay open while beds, rides and cafe block',()=>{
 const cats=new Uint8Array(park.w*park.h).fill(75),at=(x,z)=>Math.floor((z-park.z0)/park.mpp)*park.w+Math.floor((x-park.x0)/park.mpp);
 // Reproduce the old kiosk shell, then exercise its actual retirement logic.
 const old=get('rideBooth'),inside=require('../park-upside-down-house').inside;
 for(let z=-325;z< -318;z+=.2)for(let x=39;x<52;x+=.2)if(inside(old.pts,x,z))cats[at(x,z)]=69;
 A.applyGround(cats,park,all);
 for(const [x,z] of [[26,-334],[23,-350],[32,-313],[53,-334.2]])assert.equal(cats[at(x,z)]&31,3);
 assert.equal(cats[at(14,-350)]&31,13);
 for(const kind of ['carCarousel','toyCarousel','weddingCarousel']){const e=get(kind);assert.equal(cats[at(e.cx,e.cz)]&31,12);}
 const e=get('alleyCafe');assert.equal(cats[at(60,-300)]&31,5);
 assert.equal(cats[at(49,-322.5)]&31,11,'the old wide operator building no longer blocks its corner');
 assert.equal(cats[at(-10,-390)],75,'the existing plaza is outside this correction');
});

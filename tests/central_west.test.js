const {test}=require('node:test'),assert=require('node:assert/strict');
const A=require('../park-central-alley'),M=require('../park-meshes'),park=require('../park/park.json');
const inside=require('../park-upside-down-house').inside,entries=M.entries(park),get=kind=>entries.find(e=>e.kind===kind);
test('the westward panorama orders the elevated cage, small carousel and existing yellow ride',()=>{
 const models=[get('airTrack'),get('kiddieCarousel'),get('transylvania')];
 assert.deepEqual(models.map(e=>e.id),['r23','r8','r3']);
 const a=models.map(e=>Math.atan2(e.cx-26,-e.cz-334)+Math.PI*2);
 assert(a[0]<a[1]&&a[1]<a[2]);
 assert.deepEqual(models[1].pts,park.rides[8].pts,'the original mapped footprint is retained as provenance');
 assert(Math.hypot(models[1].cx-15,models[1].cz+330.5)<.01,'the photographed foreground position overrides the old footprint');
 assert(A.westBed.every(p=>p[1]>=-329)&&A.bed.every(p=>p[1]<=-336),'two distinct beds leave a cross passage at the panorama station');
});
test('the upper attraction has a roof above a raised deck, thin cage bars and open supports',()=>{
 const e=get('airTrack'),g=M.build(e).data;let roof=0,deck=0,bars=0,posts=0;
 for(let i=0;i<g.length;i+=10){const y=g[i+1],mat=g[i+9];if(y>5.6&&mat===14)roof++;if(y>3&&y<3.3&&mat===1)deck++;if(y>3.3&&y<5.6)bars++;if(y<2.9&&Math.abs(g[i+7]-.53)<1e-5)posts++;}
 assert(roof>30&&deck>12&&bars>600&&posts>80);
 const a=e.pts[0],b=e.pts[1],angle=Math.atan2(b[1]-a[1],b[0]-a[0]),lower=[],upper=[];
 for(let i=0;i<g.length;i+=10)if(g[i+9]===2&&Math.abs(g[i+6]-.40)<1e-5){const v=-(g[i]-a[0])*Math.sin(angle)+(g[i+2]-a[1])*Math.cos(angle);if(g[i+1]<.3)lower.push(v);if(g[i+1]>2.7)upper.push(v);}
 const mean=a=>a.reduce((s,v)=>s+v,0)/a.length;
 assert(mean(upper)-mean(lower)>2,'the access steps climb toward the elevated deck');
 const small=M.build(get('kiddieCarousel')).data;let highest=0;for(let i=1;i<small.length;i+=10)highest=Math.max(highest,small[i]);
 assert(highest<3.1&&highest>2.9,'the rabbit carousel has no full-size canopy');
 const pavilion=M.build(entries.find(e=>e.id==='b3')).data;assert(pavilion.some((v,i)=>i%10===1&&v>7.8),'the background pavilion has two storeys and a roof balustrade');
});
test('the ground opens below the cage and retires old silhouettes without opening beds or posts',()=>{
 const cats=new Uint8Array(park.w*park.h).fill(65),at=(x,z)=>Math.floor((z-park.z0)/park.mpp)*park.w+Math.floor((x-park.x0)/park.mpp);
 for(let z=-355;z<-317;z+=.2)for(let x=-11;x<23;x+=.2)for(const e of [get('kiddieCarousel'),get('airTrack'),get('serviceKiosk')])if(inside(e.pts,x,z))cats[at(x,z)]=e.kind==='serviceKiosk'?69:76;
 A.applyGround(cats,park,entries);
 for(const p of [[20,-335.3],[11,-336],[-3,-334.5]])assert.equal(cats[at(...p)]&31,3);
 assert(![4,5,12,13].includes(cats[at(13.5,-323)]&31),'the old solid aero footprint must not block the open ground level');
 assert.equal(cats[at(15,-330.5)]&31,12);assert.equal(cats[at(22,-318)]&31,13);
 for(const p of A.airPosts(get('airTrack')))assert.equal(cats[at(...p)]&31,13);
 assert.equal(cats[at(3.28,-348.91)]&31,5);assert.equal(cats[at(6,-351)]&31,11,'the old kiosk corners are released');
});

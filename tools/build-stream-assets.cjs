// Bake the existing procedural geometry and crop once, outside the browser.
// Requires Node.js and Python 3 with Pillow (also used by gen_park.py).
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const zlib=require('node:zlib'),crypto=require('node:crypto'),cp=require('node:child_process');
process.chdir(path.resolve(__dirname,'..'));
const source=fs.readFileSync('park.js','utf8');
const park=JSON.parse(fs.readFileSync('park/park.json'));
const scans=JSON.parse(fs.readFileSync('park/scans.json')).scans;
park.landmarks=park.landmarks.filter(l=>l.kind!=='fountain');
park.trees=park.trees.filter(t=>!scans.some(s=>Math.hypot(t[0]-s.at[0],t[1]-s.at[1])<9));
const raster=cp.execFileSync('python3',['-c',"from PIL import Image; import sys; sys.stdout.buffer.write(Image.open('park/ground.png').convert('RGB').getchannel('R').tobytes())"],{maxBuffer:32*1024*1024});
const ctx={ParkMeshes:require('../park-meshes.js'),console,Float32Array,Float64Array,Uint8Array,Map,Math,MIN_ALPHA:.1,WATER:4,window:{},
 catRaw(x,z){const ix=Math.floor((x-park.x0)/park.mpp),iz=Math.floor((z-park.z0)/park.mpp);return ix>=0&&iz>=0&&ix<park.w&&iz<park.h?raster[iz*park.w+ix]:0;}};
vm.createContext(ctx);
// Reuse the same geometry and crop functions rather than maintain a second model.
vm.runInContext(source.slice(source.indexOf('  function Cloud()'),source.indexOf('  var cloudId')),ctx);
vm.runInContext(source.slice(source.indexOf('  function extractStroller'),source.indexOf('  // The Ferris wheel turns')),ctx);
vm.runInContext(fs.readFileSync('spz.js','utf8'),ctx);
const out='park/stream';fs.mkdirSync(out,{recursive:true});
function writeCloud(c){
 const n=c.size.length,buf=Buffer.alloc(16+n*20);
 buf.writeUInt32LE(0x31504350,0);buf.writeUInt32LE(n,4);buf.writeFloatLE(c.length||0,8);buf.writeFloatLE(c.width||0,12);
 Buffer.from(c.pos.buffer,c.pos.byteOffset,c.pos.byteLength).copy(buf,16);
 Buffer.from(c.col.buffer,c.col.byteOffset,c.col.byteLength).copy(buf,16+n*12);
 Buffer.from(c.size.buffer,c.size.byteOffset,c.size.byteLength).copy(buf,16+n*16);
 const packed=zlib.gzipSync(buf),hash=crypto.createHash('sha256').update(packed).digest('hex').slice(0,16),file=hash+'.bin.gz';
 fs.writeFileSync(path.join(out,file),packed);return {src:'park/stream/'+file,n,bytes:buf.length,downloadBytes:packed.length};
}
ctx.cloudVAO=(pos,col,size)=>({pos,col,size,n:size.length});
const stageFootprint=ctx.ParkMeshes.entries(park).find(e=>e.kind==='plazaStage').pts;
park.props=park.props.filter(p=>!ctx.inside(stageFootprint,p[1],p[2])&&!scans.some(s=>ctx.inside(s.footprint,p[1],p[2])));
const world=ctx.buildWorld(park);
const chunks=world.chunks.map((c,i)=>Object.assign({id:String(i),cx:c.cx,cz:c.cz},writeCloud(c)));
const raw=ctx.window.SPZ.parse(new Uint8Array(zlib.gunzipSync(fs.readFileSync('karasunsky.spz'))));
const stroller=writeCloud(ctx.extractStroller(raw));
const inputHashes=Object.fromEntries(['park.js','park-meshes.js','park-ticket-office.js','park-transylvania.js','park/park.json','park/scans.json','park/ground.png','karasunsky.spz','tools/build-stream-assets.cjs'].map(f=>[f,crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex')]));
const manifest={inputHashes,version:1,chunkSize:64,worldPoints:world.n,chunks,stroller};
fs.writeFileSync('park/stream-manifest.json',JSON.stringify(manifest));
// Remove only obsolete generated assets, never source scans.
const keep=new Set([...chunks,stroller].map(c=>path.basename(c.src)));
for(const file of fs.readdirSync(out)) if(/^[a-f0-9]{16}\.bin\.gz$/.test(file)&&!keep.has(file)) fs.unlinkSync(path.join(out,file));
console.log(JSON.stringify({chunks:chunks.length,worldPoints:world.n,worldBytes:world.n*20,downloadBytes:chunks.reduce((s,c)=>s+c.downloadBytes,0),stroller},null,2));

const {test}=require('node:test');
const assert=require('node:assert/strict');
const {Stream,decode}=require('../park-streaming.js');
const fs=require('node:fs'),zlib=require('node:zlib');
const flush=()=>new Promise(r=>setImmediate(r));
test('stream limits concurrent requests, evicts old GPU resources and reloads on return',async()=>{
 const entries=Array.from({length:12},(_,i)=>({id:String(i),cx:i*100,cz:0}));
 let active=0,peak=0,released=0;
 const s=new Stream(entries,async e=>{active++;peak=Math.max(peak,active);await flush();active--;return {n:100,id:e.id};},()=>released++,2);
 for(const x of [0,500,1000,0]) {
  for(let i=0;i<10;i++){s.update(x,0,150);await flush();await flush();}
  assert(s.resident.size<=5);assert(s.pending.size<=2);
 }
 assert(peak<=2);assert(released>0);assert(s.resident.has('0'));assert(s.stats().bytes<=100*20*5);
});
test('late response from an aborted request is disposed, never retained',async()=>{
 let resolve,released=0;
 const s=new Stream([{id:'a',cx:0,cz:0}],()=>new Promise(r=>resolve=r),()=>released++);
 s.update(0,0,50);await flush();s.update(1000,0,50);
 resolve({n:10});await flush();assert.equal(s.resident.size,0);assert.equal(released,1);
});
test('network failure backs off rather than retrying every frame',async()=>{
 let calls=0;const s=new Stream([{id:'a',cx:0,cz:0}],async()=>{calls++;throw new Error('offline');},()=>{});
 s.update(0,0,50);await flush();s.update(0,0,50);await flush();
 assert.equal(calls,1);assert.equal(s.stats().failures,1);
});
test('all shipped sectors and stroller decode with finite attributes and matching counts',()=>{
 const manifest=JSON.parse(fs.readFileSync(require.resolve('../park/stream-manifest.json')));
 let count=0;
 for(const entry of [...manifest.chunks,manifest.stroller]) {
  const data=decode(new Uint8Array(zlib.gunzipSync(fs.readFileSync(require.resolve('../'+entry.src)))));
  assert.equal(data.size.length,entry.n);
  for(const value of data.pos) assert(Number.isFinite(value));
  for(const value of data.size) assert(Number.isFinite(value)&&value>0);
  if(entry.id!==undefined) count+=data.size.length;
 }
 assert.equal(count,manifest.worldPoints);
});
test('published stroller scan and packed model omit the baby face',()=>{
 const raw=zlib.gunzipSync(fs.readFileSync(require.resolve('../karasunsky.spz')));
 assert.equal(raw.readUInt32LE(8),631667);
 const manifest=JSON.parse(fs.readFileSync(require.resolve('../park/stream-manifest.json')));
 const stroller=decode(new Uint8Array(zlib.gunzipSync(fs.readFileSync(require.resolve('../'+manifest.stroller.src)))));
 let visibleFace=0;
 for(let i=0;i<stroller.size.length;i++) {
  const x=stroller.pos[i*3],y=stroller.pos[i*3+1],z=stroller.pos[i*3+2];
  if(((x+.02)/.12)**2+((y-.565)/.07)**2+((z+.17)/.16)**2<1) visibleFace++;
 }
 assert.equal(visibleFace,0);
});
test('malformed point files fail before GPU upload',()=>{
 assert.throws(()=>decode(new Uint8Array(16)),/header/);
 const buf=new ArrayBuffer(16);const v=new DataView(buf);v.setUint32(0,0x31504350,true);v.setUint32(4,2,true);
 assert.throws(()=>decode(new Uint8Array(buf)),/length/);
});
test('baked assets match their current source inputs',()=>{
 const crypto=require('node:crypto'),path=require('node:path');
 const root=path.resolve(__dirname,'..');
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'park/stream-manifest.json')));
 for(const [file,hash] of Object.entries(manifest.inputHashes)) {
  assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex'),hash,'Rebuild assets: '+file);
 }
});

const {test}=require('node:test');
const assert=require('node:assert/strict');
const JayVoice=require('../jay-voice.js');
function random(){let s=171;return()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;};}

test('jay syllables have measured call lengths, smooth boundaries and eight-bit headroom',()=>{
 const rng=random();
 for(let j=0;j<10;j++){
  const {samples,duration}=JayVoice.rattle(24000,rng);
  assert.ok(duration>=.283&&duration<=.48805);
  assert.equal(samples.length,Math.round(duration*24000));
  assert.ok(samples.every(x=>Number.isFinite(x)&&Math.abs(x)<=.86&&Math.abs(x*127-Math.round(x*127))<.00001));
  assert.ok(Math.abs(samples[0])<.01&&Math.abs(samples.at(-1))<.01);
 }
 assert.deepEqual(JayVoice.rattle(24000,random()),JayVoice.rattle(24000,random()));
});

test('jay voice has a 300-Hz pulse pattern and dominant energy around 2 kHz rather than stationary hiss',()=>{
 const {samples}=JayVoice.rattle(24000,()=>.5),x=samples.slice(3120,5520);
 const power=[];
 for(let frequency=400;frequency<=6500;frequency+=20){
  let re=0,im=0;
  for(let i=0;i<x.length;i++){
   const angle=2*Math.PI*frequency*i/24000,window=.5-.5*Math.cos(2*Math.PI*i/(x.length-1));
   re+=x[i]*window*Math.cos(angle);im-=x[i]*window*Math.sin(angle);
  }
  power.push({frequency,value:re*re+im*im});
 }
 const peak=power.reduce((a,b)=>a.value>b.value?a:b);
 assert.ok(peak.frequency>1700&&peak.frequency<2300,peak);
 const candidates=power.filter((p,i)=>i>0&&i<power.length-1&&p.frequency>1200&&p.frequency<2800&&p.value>peak.value*.01&&p.value>power[i-1].value&&p.value>power[i+1].value);
 const peaks=[];
 candidates.sort((a,b)=>b.value-a.value).forEach(p=>{if(peaks.every(other=>Math.abs(other.frequency-p.frequency)>180))peaks.push(p);});
 peaks.sort((a,b)=>a.frequency-b.frequency);
 assert.ok(peaks.length>=4,peaks);
 for(let i=1;i<peaks.length;i++)assert.ok(peaks[i].frequency-peaks[i-1].frequency>=260&&peaks[i].frequency-peaks[i-1].frequency<=360,peaks);
 let strongest={lag:0,value:0},energy=x.reduce((sum,v)=>sum+v*v,0);
 for(let lag=68;lag<94;lag++){
  let value=0;for(let i=lag;i<x.length;i++)value+=x[i]*x[i-lag];
  if(value>strongest.value)strongest={lag,value};
 }
 assert.ok(24000/strongest.lag>270&&24000/strongest.lag<340,strongest);
 assert.ok(strongest.value/energy>.5,strongest);
});

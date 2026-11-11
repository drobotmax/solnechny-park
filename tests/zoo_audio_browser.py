"""Measure the actual zoo audio graph, controls, movement and changed models in Chrome."""
import json
import math
import os
import tempfile
from pathlib import Path
from playwright.sync_api import sync_playwright

out = Path(os.environ.get('PARK_ZOO_AUDIO_OUT', tempfile.mkdtemp(prefix='park-zoo-audio-')))
out.mkdir(parents=True, exist_ok=True)
with sync_playwright() as p:
    browser = p.chromium.launch(channel='chrome', headless=True, timeout=20000)
    page = browser.new_page(viewport={'width':1440, 'height':900})
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.add_init_script('''
      window.zooCalls=[];window.zooPeak=0;
      const edges=new WeakMap(),connect=AudioNode.prototype.connect;
      AudioNode.prototype.connect=function(node,...rest){edges.set(this,node);return connect.call(this,node,...rest);};
      const native=AudioBufferSourceNode.prototype.start;
      AudioBufferSourceNode.prototype.start=function(...args){
        const samples=this.buffer?.getChannelData(0);
        const kind=window.ParkZoo && Object.keys(ParkZoo.voices).find(k=>{
          if(samples?.length!==Math.ceil(ParkZoo.voices[k].duration*24000))return false;
          const expected=ParkZoo.voice(k);
          return expected.slice(0,64).every((v,i)=>v===samples[i]);
        });
        if(kind){
          const gain=edges.get(this),pan=edges.get(gain),master=edges.get(pan);
          zooCalls.push({kind,volume:gain.gain.value,pan:pan.pan.value});
          if(!window.zooMeter){
            const meter=this.context.createAnalyser();meter.fftSize=2048;connect.call(master,meter);
            window.zooMeter=meter;window.zooMaster=master;
            setInterval(()=>{const data=new Float32Array(2048);meter.getFloatTimeDomainData(data);zooPeak=Math.max(zooPeak,...data.map(Math.abs));},10);
          }
        }
        return native.apply(this,args);
      };
    ''')
    page.goto(os.environ.get('PARK_URL','http://127.0.0.1:8791')+'/park.html')
    page.wait_for_function('window.__stats?.car && __stats.streaming.pending===0',timeout=90000)
    page.check('#sound')
    page.click('#visitZoo')
    report = {}
    for kind in ['giraffe','zebra','lion','elephant','monkey','flamingo']:
        page.evaluate('''kind=>{
          const d=__zoo().animals.find(d=>d.species===kind);
          __car.x=d.x+4;__car.z=d.z-5;__car.v=0;
          __car.heading=Math.atan2(d.x-__car.x,-(d.z-__car.z));
          __cam.yaw=__car.heading;__cam.orbit=0;__cam.dist=4;__cam.pitch=.09;
          __zoo().voiceWait.fill(1000);__zoo().voiceWait[d.pen]=.1;
          zooPeak=0;
        }''',kind)
        page.wait_for_function('k=>zooCalls.some(c=>c.kind===k)',arg=kind,timeout=6000)
        page.wait_for_timeout(2600)
        peak=page.evaluate('zooPeak')
        assert peak>.005,(kind,peak)
        report[kind]={'peak':peak,'call':page.evaluate('k=>zooCalls.find(c=>c.kind===k)',kind)}
        if kind in ['giraffe','zebra','elephant']:
            page.screenshot(path=str(out/(kind+'.png')))
    # Mute an ongoing roar, including its already connected audio nodes.
    page.evaluate("__car.x=-48;__car.z=-130;__zoo().voiceWait.fill(1000);__zoo().voiceWait[2]=0;zooCalls=[]")
    page.wait_for_function("zooCalls.some(c=>c.kind==='lion')",timeout=4000)
    page.uncheck('#sound')
    assert page.evaluate('zooMaster.gain.value')==0
    page.wait_for_timeout(200)
    page.evaluate('zooPeak=0;__zoo().voiceWait.fill(0);zooCalls=[]')
    page.wait_for_timeout(500)
    assert page.evaluate('zooPeak')<.00001
    assert page.evaluate('zooCalls.length')==0
    page.check('#sound')
    page.wait_for_function('zooCalls.length>0',timeout=4000)
    page.click('#menu')
    page.wait_for_timeout(200)
    assert page.evaluate('zooMaster.gain.value')==0
    page.evaluate('zooCalls=[];__zoo().voiceWait.fill(0)')
    page.wait_for_timeout(500)
    assert page.evaluate('zooCalls.length')==0
    page.click('#visitZoo')
    before=page.evaluate('[__car.x,__car.z]')
    page.keyboard.down('w');page.wait_for_timeout(800);page.keyboard.up('w')
    assert page.evaluate('[__car.x,__car.z]')!=before
    page.set_viewport_size({'width':390,'height':844})
    page.wait_for_timeout(700)
    assert page.locator('#pad [data-k="up"]').is_visible()
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
    page.screenshot(path=str(out/'mobile.png'))
    gl=page.evaluate("(()=>{const g=document.querySelector('#c').getContext('webgl2');return {lost:g.isContextLost(),error:g.getError(),failures:__stats.streaming.failures};})()")
    assert gl=={'lost':False,'error':0,'failures':0},gl
    assert not errors,errors
    (out/'audio.json').write_text(json.dumps(report,indent=2))
    print('PASS: six audible voices, mute, menu, movement, WebGL, mobile',report,flush=True)
    browser.close()

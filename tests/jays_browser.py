"""Solitary jays: native harmonic calls, 20-second meows and sound controls."""
import os
import tempfile
from pathlib import Path

from playwright.sync_api import sync_playwright

out = Path(tempfile.mkdtemp(prefix='park-jays-'))
print('Screenshots:', out, flush=True)
with sync_playwright() as p:
    browser = p.chromium.launch(channel='chrome', headless=True)
    page = browser.new_page(viewport={'width':1440,'height':900})
    errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.add_init_script("""
      window.__jayCalls={rattle:[],meow:[]};window.__jayPeaks={rattle:0,meow:0};
      const edges=new WeakMap(),connect=AudioNode.prototype.connect;
      AudioNode.prototype.connect=function(dest,...args){edges.set(this,dest);return connect.call(this,dest,...args);};
      function record(s,kind){__jayCalls[kind].push(s.context.currentTime);
        const gain=edges.get(edges.get(s)),meter=s.context.createAnalyser();meter.fftSize=512;connect.call(gain,meter);
        const timer=setInterval(()=>{const d=new Float32Array(512);meter.getFloatTimeDomainData(d);__jayPeaks[kind]=Math.max(__jayPeaks[kind],...d.map(Math.abs));},5);
        s.addEventListener('ended',()=>{clearInterval(timer);meter.disconnect();});}
      const Native=AudioContext;
      window.AudioContext=class extends Native {
        createBufferSource(){const s=super.createBufferSource(),start=s.start.bind(s);s.start=(...args)=>{if(s.buffer?.sampleRate===24000)record(s,'rattle');return start(...args);};return s;}
        createOscillator(){const s=super.createOscillator(),start=s.start.bind(s),set=s.frequency.setValueAtTime.bind(s.frequency);
          s.frequency.setValueAtTime=(v,...args)=>{s.firstFrequency??=v;return set(v,...args);};
          s.start=(...args)=>{if(s.type==='sawtooth'&&s.firstFrequency===660)record(s,'meow');return start(...args);};return s;}
      };
    """)
    page.goto(os.environ.get('PARK_URL','http://127.0.0.1:8791')+'/park.html')
    page.wait_for_function('window.__stats?.car',timeout=90000)
    assert page.evaluate('__forestBirds().jays.length')==30
    assert page.evaluate('__forestBirds().jays.every(d=>d.group===-1&&__forestBirds().canForage(d.x,d.z))')
    page.click('#free')
    page.evaluate("""()=>{
      const p=__forestBirds();p.birds.forEach(d=>d.wait=1000);__dogs().dogs.forEach(d=>d.pause=1000);
      for(const d of p.jays)for(let a=0;a<6.28;a+=.3){let ok=true;
        for(let r=.2;r<=13;r+=.2)if(!p.canFly(d.x+Math.cos(a)*r,d.z+Math.sin(a)*r)){ok=false;break;}
        if(!ok)continue;window.__testJay=d;__car.x=d.x+Math.cos(a)*10;__car.z=d.z+Math.sin(a)*10;__car.v=0;
        __car.heading=Math.atan2(d.x-__car.x,-(d.z-__car.z));__cam.yaw=__car.heading;__cam.orbit=.35;__cam.dist=2;__cam.pitch=.25;return;
      }throw Error('No jay viewpoint');
    }""")
    page.wait_for_function('__jayCalls.rattle.length>=10',timeout=10000)
    assert page.evaluate('__jayPeaks.rattle')>.001
    intervals=page.evaluate('__jayCalls.rattle.slice(-10).slice(1).map((t,i)=>t-__jayCalls.rattle.slice(-10)[i])')
    assert all(.39<t<1.05 for t in intervals),intervals
    page.screenshot(path=str(out/'jay.png'))
    page.wait_for_function('__jayCalls.meow.length>=2',timeout=45000)
    meows=page.evaluate('__jayCalls.meow')
    assert 19.8<meows[1]-meows[0]<21,meows
    assert page.evaluate('__jayPeaks.meow')>.001
    page.evaluate('__car.x=__testJay.x+2;__car.z=__testJay.z;__car.v=0')
    page.wait_for_function('__testJay.flight!==null&&__testJay.y>0',timeout=5000)
    assert page.evaluate('__testJay.y<2.5')
    page.uncheck('#sound');before=page.evaluate('JSON.stringify(__jayCalls)')
    page.wait_for_timeout(800)
    assert page.evaluate('JSON.stringify(__jayCalls)')==before
    page.check('#sound');page.click('#menu');before=page.evaluate('JSON.stringify(__jayCalls)')
    page.wait_for_timeout(800)
    assert page.evaluate('JSON.stringify(__jayCalls)')==before
    assert page.evaluate("document.querySelector('#c').getContext('webgl2').getError()") == 0
    assert not errors,errors
    print('PASS: 30 solitary jays, native harmonic syllables, 20-second native meows, flight, mute/menu/WebGL',meows,page.evaluate('__jayPeaks'),flush=True)
    browser.close()

"""Native Chrome audio and actual dog/gull motion; start the local server first."""

import os
import tempfile
from pathlib import Path

from playwright.sync_api import sync_playwright

out = Path(tempfile.mkdtemp(prefix="park-animals-"))
print("Screenshots:", out, flush=True)
with sync_playwright() as p:
    browser = p.chromium.launch(channel="chrome", headless=True)
    page = browser.new_page(viewport={"width": 1440, "height": 900})
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.add_init_script("""
      window.__animalCalls={bark:[],pant:[],gull:[]};window.__animalPeaks={bark:0,pant:0,gull:0};
      const edges=new WeakMap(),connect=AudioNode.prototype.connect;
      AudioNode.prototype.connect=function(dest,...args){edges.set(this,dest);return connect.call(this,dest,...args);};
      function record(source,kind) {
        __animalCalls[kind].push(source.context.currentTime);
        const filter=edges.get(source),gain=edges.get(filter),meter=source.context.createAnalyser();
        meter.fftSize=512;connect.call(gain,meter);
        const timer=setInterval(()=>{const data=new Float32Array(512);meter.getFloatTimeDomainData(data);
          __animalPeaks[kind]=Math.max(__animalPeaks[kind],...data.map(Math.abs));},10);
        source.addEventListener('ended',()=>{clearInterval(timer);meter.disconnect();});
      }
      const Native=AudioContext;
      window.AudioContext=class extends Native {
        createOscillator(){const s=super.createOscillator(),start=s.start.bind(s);
          const setFrequency=s.frequency.setValueAtTime.bind(s.frequency);
          s.frequency.setValueAtTime=(value,...args)=>{s.initialFrequency ??= value;return setFrequency(value,...args);};
          s.start=(...args)=>{if(s.type==='square')record(s,s.initialFrequency>500?'gull':'bark');return start(...args);};return s;}
        createBufferSource(){const s=super.createBufferSource(),start=s.start.bind(s);
          s.start=(...args)=>{if(s.buffer?.sampleRate===8000)record(s,'pant');return start(...args);};return s;}
      };
    """)
    page.goto(os.environ.get("PARK_URL", "http://127.0.0.1:8791") + "/park.html")
    page.wait_for_function("window.__stats?.car", timeout=90000)
    page.click("#free")
    assert page.evaluate("__gulls().birds.length") == 36
    assert page.evaluate(
        "async () => (await (await fetch('park/park.json')).json()).props.every(p=>p[0]!=='bench')"
    )
    page.evaluate("""() => {
      __dogs().dogs.forEach(d=>d.pause=1000);
      const d=__dogs().dogs[0];__car.x=d.x-7;__car.z=d.z;__car.v=0;
    }""")
    page.wait_for_timeout(400)
    pant_before = page.evaluate("__animalCalls.pant.length")
    page.wait_for_function("__animalCalls.bark.length>0", timeout=15000)
    page.wait_for_timeout(500)
    assert page.evaluate("__animalPeaks.bark") > 0.005
    before = page.evaluate("__animalCalls.bark.length")
    page.wait_for_timeout(4000)
    assert page.evaluate("__animalCalls.bark.length") == before
    assert page.evaluate("__animalCalls.pant.length") == pant_before
    page.evaluate("__dogs().dogs[0].pause=0")
    page.wait_for_function(
        "n=>__animalCalls.pant.length>=n+3", arg=pant_before, timeout=10000
    )
    page.wait_for_timeout(300)
    assert page.evaluate("__animalPeaks.pant") > 0.005
    page.evaluate("__dogs().dogs[0].pause=1000")
    page.wait_for_timeout(400)
    before = page.evaluate("__animalCalls.pant.length")
    page.wait_for_timeout(1800)
    assert page.evaluate("__animalCalls.pant.length") == before
    # Isolate the next dive after the shared call cooldown expires.
    page.evaluate("__gulls().birds.forEach(d=>{d.wait=1000;d.dive=null;})")
    page.wait_for_timeout(8500)
    # A real gull enters a full dive, cries, touches water, and climbs again.
    page.evaluate("""() => {
      __gulls().birds.forEach(d=>{d.wait=1000;d.dive=null;});
      const d=__gulls().birds[0],g=__mallards().groups[0];d.wait=0;d.plunge=false;
      __car.x=g.shore[0];__car.z=g.shore[1];__car.v=0;
      __car.heading=Math.atan2(g.x-__car.x,-(g.z-__car.z));
      __cam.yaw=__car.heading;__cam.orbit=0;__cam.dist=3;__cam.pitch=-.12;
    }""")
    page.wait_for_function("__animalCalls.gull.length>0", timeout=5000)
    page.wait_for_timeout(800)
    assert page.evaluate("__animalPeaks.gull") > 0.0001
    page.screenshot(path=str(out / "gulls-diving.png"))
    page.wait_for_function("__gulls().birds[0].y<0", timeout=5000)
    page.screenshot(path=str(out / "gull-water.png"))
    page.wait_for_function(
        "__gulls().birds[0].dive===null && __gulls().birds[0].y>6", timeout=10000
    )
    page.set_viewport_size({"width": 390, "height": 844})
    page.screenshot(path=str(out / "gulls-mobile.png"))
    # Mute must suppress new animal voices, even with a dive due now.
    page.uncheck("#sound")
    before = page.evaluate("JSON.stringify(__animalCalls)")
    page.evaluate("__gulls().birds[0].wait=0;__dogs().dogs[0].pause=0")
    page.wait_for_timeout(2000)
    assert page.evaluate("JSON.stringify(__animalCalls)") == before
    page.check("#sound")
    page.click("#menu")
    before = page.evaluate("JSON.stringify(__animalCalls)")
    page.wait_for_timeout(1500)
    assert page.evaluate("JSON.stringify(__animalCalls)") == before
    assert not errors, errors
    print(
        "PASS: rare bark, breathing only while running, gull diving/cry/climb, mute/menu, no benches",
        flush=True,
    )
    print(page.evaluate("__animalPeaks"), flush=True)
    browser.close()

"""Forest placement, native calls, ground feeding and low woodpecker flights."""

import os
import tempfile
from pathlib import Path

from playwright.sync_api import sync_playwright

out = Path(tempfile.mkdtemp(prefix="park-forest-"))
print("Screenshots:", out, flush=True)
with sync_playwright() as p:
    browser = p.chromium.launch(channel="chrome", headless=True)
    page = browser.new_page(viewport={"width": 1440, "height": 900})
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.add_init_script("""
      window.__forestCalls={rook:[],woodpecker:[]};window.__forestPeaks={rook:0,woodpecker:0};window.__flightTrace=[];
      const edges=new WeakMap(),connect=AudioNode.prototype.connect;
      AudioNode.prototype.connect=function(dest,...args){edges.set(this,dest);return connect.call(this,dest,...args);};
      const Native=AudioContext;
      window.AudioContext=class extends Native {
        createOscillator() {
          const s=super.createOscillator(),start=s.start.bind(s),set=s.frequency.setValueAtTime.bind(s.frequency);
          s.frequency.setValueAtTime=(value,...args)=>{s.initialFrequency ??= value;return set(value,...args);};
          s.start=(...args)=>{
            const kind=s.initialFrequency===165?'rook':s.initialFrequency===820?'woodpecker':null;
            if(kind) {
              __forestCalls[kind].push(s.context.currentTime);
              const gain=edges.get(edges.get(s)),meter=s.context.createAnalyser();meter.fftSize=512;connect.call(gain,meter);
              const timer=setInterval(()=>{const data=new Float32Array(512);meter.getFloatTimeDomainData(data);
                __forestPeaks[kind]=Math.max(__forestPeaks[kind],...data.map(Math.abs));},10);
              s.addEventListener('ended',()=>{clearInterval(timer);meter.disconnect();});
            }
            return start(...args);
          };return s;
        }
      };
    """)
    page.goto(os.environ.get("PARK_URL", "http://127.0.0.1:8791") + "/park.html")
    page.wait_for_function("window.__stats?.car", timeout=90000)
    counts = page.evaluate("""() => {
      const p=__forestBirds();
      return {groups:p.groups.length,rooks:p.birds.filter(d=>d.species==='rook').length,woodpeckers:p.woodpeckers.length,crows:p.crows.length,
        valid:p.birds.every(d=>p.canForage(d.x,d.z))};
    }""")
    assert counts == {"groups": 36, "rooks": 324, "woodpeckers": 12, "crows": 36, "valid": True}, (
        counts
    )
    page.click("#free")
    page.evaluate("""() => {
      __forestBirds().birds.forEach(d=>d.wait=1000);
      const g=__forestBirds().groups[0];__car.x=g.x-4;__car.z=g.z+5;__car.v=0;
      __car.heading=Math.atan2(g.x-__car.x,-(g.z-__car.z));
      __cam.yaw=__car.heading;__cam.orbit=0;__cam.dist=3;__cam.pitch=.3;
    }""")
    page.wait_for_function(
        "__forestBirds().groups[0].birds.every(d=>d.flight)", timeout=5000
    )
    page.wait_for_function("__forestCalls.rook.length>=3", timeout=20000)
    page.wait_for_timeout(800)
    assert page.evaluate("__forestPeaks.rook") > 0.005
    page.screenshot(path=str(out / "rook-flock.png"))
    # Select a real woodpecker with several clear routes, then let its own AI fly.
    index = page.evaluate("""() => {
      const p=__forestBirds();let best=0,most=-1;
      p.woodpeckers.forEach((d,index)=>{let n=0;
        for(let a=0;a<6.28;a+=.1) {let ok=true;for(let r=0;r<=12;r+=.4)if(!p.canForage(d.x+Math.cos(a)*r,d.z+Math.sin(a)*r)){ok=false;break;}if(ok)n++;}
        if(n>most){most=n;best=index;}
      });
      const d=p.woodpeckers[best];
      let position=null;
      for(let a=0;a<6.28;a+=.2){let ok=true;for(let r=0;r<=13;r+=.4)if(!p.canForage(d.x+Math.cos(a)*r,d.z+Math.sin(a)*r)){ok=false;break;}
        if(ok){position={x:d.x+Math.cos(a)*10,z:d.z+Math.sin(a)*10};break;}}
      if(!position)throw Error('No clear woodpecker viewpoint');
      __car.x=position.x;__car.z=position.z;__car.v=0;__car.heading=Math.atan2(d.x-__car.x,-(d.z-__car.z));
      __cam.yaw=__car.heading;__cam.orbit=0;__cam.dist=2.5;__cam.pitch=.3;
      p.woodpeckers.forEach(b=>{b.flight=null;b.y=0;b.walk=null;b.wait=1000;});
      __forestCalls.woodpecker=[];__forestPeaks.woodpecker=0;
      window.__trackedWoodpecker=d;
      setInterval(()=>__flightTrace.push({x:d.x,z:d.z,y:d.y,flying:!!d.flight,valid:d.flight?p.canFly(d.x,d.z):p.canForage(d.x,d.z)}),30);
      return best;
    }""")
    page.wait_for_timeout(1000)
    page.screenshot(path=str(out / "woodpecker-ground.png"))
    assert page.evaluate("__forestCalls.woodpecker.length") == 0
    page.evaluate(
        "__car.x=__trackedWoodpecker.x+2;__car.z=__trackedWoodpecker.z;__car.v=0"
    )
    page.wait_for_function(
        "__trackedWoodpecker.flight && __trackedWoodpecker.y>.2", timeout=45000
    )
    page.screenshot(path=str(out / "woodpecker-flight.png"))
    page.wait_for_function("__forestCalls.woodpecker.length>=14", timeout=10000)
    page.wait_for_function("!__trackedWoodpecker.flight", timeout=10000)
    page.evaluate("__trackedWoodpecker.wait=1000;__trackedWoodpecker.walk=null")
    page.wait_for_timeout(1300)
    assert page.evaluate("__forestPeaks.woodpecker") > 0.01
    trace = page.evaluate("__flightTrace")
    bad = [t for t in trace if not t["valid"] or not 0 <= t["y"] < 1.8]
    assert not bad, bad[:5]
    assert max(t["y"] for t in trace) > 0.5
    before = page.evaluate("__forestCalls.woodpecker.length")
    page.wait_for_timeout(1800)
    assert page.evaluate("__forestCalls.woodpecker.length") == before
    page.set_viewport_size({"width": 390, "height": 844})
    page.screenshot(path=str(out / "woodpecker-mobile.png"))
    page.uncheck("#sound")
    before = page.evaluate("JSON.stringify(__forestCalls)")
    page.evaluate("__trackedWoodpecker.wait=0")
    page.wait_for_timeout(3000)
    assert page.evaluate("JSON.stringify(__forestCalls)") == before
    page.check("#sound")
    page.click("#menu")
    before = page.evaluate("JSON.stringify(__forestCalls)")
    page.wait_for_timeout(1500)
    assert page.evaluate("JSON.stringify(__forestCalls)") == before
    assert not errors, errors
    print(
        "PASS: woodland placement, rook caws, foraging, low undulating woodpecker flight/cries, mute/menu",
        counts,
        index,
        flush=True,
    )
    print(page.evaluate("__forestPeaks"), flush=True)
    browser.close()

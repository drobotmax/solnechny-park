import os
import tempfile
from pathlib import Path

from playwright.sync_api import sync_playwright

# Run the local HTTP server first; Playwright and Google Chrome are required.
base = os.environ.get("PARK_URL", "http://127.0.0.1:8791").rstrip("/")
out = Path(tempfile.mkdtemp(prefix="mallards-browser-"))
print("Screenshots:", out, flush=True)
with sync_playwright() as p:
    b = p.chromium.launch(channel="chrome", headless=True)
    page = b.new_page(viewport={"width": 1440, "height": 900})
    errors = []
    failed = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.on(
        "response",
        lambda r: (
            failed.append([r.status, r.url])
            if r.status >= 400 and not r.url.endswith("/favicon.ico")
            else None
        ),
    )
    page.add_init_script("""
 window.__audioContexts=[]; window.__audioMeters=[]; window.__calls={mallard:0,coot:0};
 const NativeContext=window.AudioContext;
 window.AudioContext=class extends NativeContext { constructor(...args) {super(...args); window.__audioContexts.push(this);}
   createOscillator() {
     const o=super.createOscillator(), start=o.start.bind(o);
     o.start=(...args)=>{ __calls[o.type==='triangle'?'coot':'mallard']++; return start(...args); };
     return o;
   }
 };
 const nativeConnect=AudioNode.prototype.connect;
 AudioNode.prototype.connect=function(destination,...args) {
   const result=nativeConnect.call(this,destination,...args);
   if (destination === this.context.destination) {
     const meter=this.context.createAnalyser(); meter.fftSize=512;
     nativeConnect.call(this,meter); window.__audioMeters.push({meter,node:this});
   }
   return result;
 };
 window.__peak=0;
 setInterval(()=>{
   for (const {meter} of window.__audioMeters) {
     const data=new Float32Array(meter.fftSize); meter.getFloatTimeDomainData(data);
     window.__peak=Math.max(window.__peak,...data.map(Math.abs));
   }
 },10);
 """)
    page.goto(base + "/park.html")
    page.wait_for_function("window.__stats && window.__stats.car", timeout=90000)
    count = page.evaluate(
        """() => { const m=__mallards(); return {groups:m.groups.length, ducks:m.ducks.length, males:m.ducks.filter(d=>d.male).length, coots:m.coots.length}; }"""
    )
    assert count["ducks"] > 0 and count["males"] == count["ducks"] / 2, count
    assert count["ducks"] == count["groups"] * 12
    assert count["coots"] == count["groups"] * 24
    page.click("#free")
    assert page.locator("#visitDucks").count() == 0
    # Position the existing test camera at a mapped shore; no visitor shortcut.
    page.evaluate("""() => {
      const g=__mallards().groups[0], x=(g.x+g.coots.x)/2, z=(g.z+g.coots.z)/2;
      __car.x=g.shore[0]; __car.z=g.shore[1]; __car.v=0;
      __car.heading=Math.atan2(x-__car.x,-(z-__car.z));
      __cam.yaw=__car.heading; __cam.orbit=0; __cam.dist=3; __cam.pitch=0.3;
    }""")
    assert page.evaluate("__game.mode") == "free"
    pos0 = page.evaluate("__mallards().birds.map(d=>[d.x,d.z])")
    page.wait_for_timeout(1500)
    assert page.evaluate("__mallards().birds.map(d=>[d.x,d.z])") != pos0
    print("RENDER READY", count, flush=True)
    page.screenshot(path=str(out / "desktop.png"))
    print("COUNTS", count, "CAR", page.evaluate("__stats.car"), flush=True)
    page.wait_for_function(
        "__peak > 0.0001 && __calls.mallard > 0 && __calls.coot > 0", timeout=45000
    )
    print(
        "AUDIO",
        page.evaluate(
            "({peak:__peak,state:__audioContexts[0].state,outputs:__audioMeters.length,calls:__calls})"
        ),
        flush=True,
    )
    # Toggle the actual setting and verify the native final audio gain.
    page.uncheck("#sound")
    assert page.evaluate("__audioMeters.every(m=>m.node.gain.value===0)")
    page.wait_for_timeout(800)
    page.evaluate("__peak=0")
    page.wait_for_timeout(300)
    assert page.evaluate("__peak") == 0
    page.check("#sound")
    # Assert every duck and its body remain over actual map water for > one orbit.
    result = page.evaluate("""async () => {
   const park=await (await fetch('park/park.json')).json();
   const image=new Image(); image.src='park/ground.png'; await image.decode();
   const c=document.createElement('canvas'); c.width=park.w; c.height=park.h;
   const ctx=c.getContext('2d'); ctx.drawImage(image,0,0);
   const data=ctx.getImageData(0,0,c.width,c.height).data;
   function water(x,z) {const j=Math.floor((x-park.x0)/park.mpp), i=Math.floor((z-park.z0)/park.mpp);
     return j>=0&&i>=0&&j<park.w&&i<park.h&&(data[(i*park.w+j)*4]&31)===4;}
   const ducks=__mallards().birds;
   for (const d of ducks) for (let a=0;a<6.284;a+=0.03) for (const dx of [-0.5,0,0.5]) for (const dz of [-0.5,0,0.5]) {
     if(!water(d.cx+Math.cos(a)*d.radius+dx,d.cz+Math.sin(a)*d.radius+dz)) return {bad:d};
   }
   return {water:true};
 }""")
    assert result.get("water"), result
    # Neighbouring existing journeys: bottles, movement, fountain tour, viewer.
    page.click("#menu")
    page.wait_for_timeout(100)
    assert page.evaluate("__audioMeters.every(m=>m.node.gain.value===0)")
    page.click("#play")
    assert page.evaluate('__game.mode === "play" && __game.bottles.length===5')
    page.keyboard.down("w")
    page.wait_for_timeout(1200)
    page.keyboard.up("w")
    assert page.evaluate("__car.odo") > 0
    page.click("#visitScans")
    assert page.evaluate("__game.mode") == "free"
    page.screenshot(path=str(out / "fountains.png"))
    assert page.locator("#visitDucks").count() == 0
    # Position the existing test camera at a mapped shore; no visitor shortcut.
    page.evaluate("""() => {
      const g=__mallards().groups[0], x=(g.x+g.coots.x)/2, z=(g.z+g.coots.z)/2;
      __car.x=g.shore[0]; __car.z=g.shore[1]; __car.v=0;
      __car.heading=Math.atan2(x-__car.x,-(z-__car.z));
      __cam.yaw=__car.heading; __cam.orbit=0; __cam.dist=3; __cam.pitch=0.3;
    }""")
    page.set_viewport_size({"width": 390, "height": 844})
    page.screenshot(path=str(out / "mobile.png"))
    assert page.evaluate("document.documentElement.scrollWidth <= innerWidth")
    page.click("#toggle")
    page.screenshot(path=str(out / "mobile-panel.png"))
    print("ERRORS", errors, "FAILED", failed, flush=True)
    assert not errors and not failed
    page.goto(base + "/index.html")
    page.wait_for_function("window.__stats && window.__stats.n > 0", timeout=90000)
    assert not errors and not failed
    print(
        "PASS: water, movement, native audio output/mute, play, fountains, mobile, viewer",
        flush=True,
    )
    b.close()

"""IDDQD, actual music playback, red scene, all-species horde, crush counter and mode exit."""

import os
import tempfile
from pathlib import Path

from playwright.sync_api import sync_playwright

out = Path(tempfile.mkdtemp(prefix="park-doom-"))
print("Screenshots:", out, flush=True)
with sync_playwright() as p:
    browser = p.chromium.launch(channel="chrome", headless=True)
    page = browser.new_page(viewport={"width": 1440, "height": 900})
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
    page.goto(os.environ.get("PARK_URL", "http://127.0.0.1:8791") + "/park.html")
    page.wait_for_function("window.__stats?.car", timeout=90000)
    page.click("#free")
    assert page.locator("#panel input[id*=doom]").count() == 0
    page.evaluate("__car.v=0")
    page.evaluate("""() => {
      const gl=document.querySelector('#c').getContext('webgl2'),draw=gl.drawArrays.bind(gl);
      window.__doomFlameDraws=0;
      gl.drawArrays=(...args)=>{
        if(document.body.classList.contains('doom')) {
          const program=gl.getParameter(gl.CURRENT_PROGRAM),mode=gl.getUniformLocation(program,'uMode');
          if(mode && gl.getUniform(program,mode)===1)__doomFlameDraws++;
        }
        return draw(...args);
      };
    }""")
    page.keyboard.type("IDDQD", delay=70)
    page.wait_for_function(
        "__doom().active && __doom().horde?.birds.length>0", timeout=30000
    )
    data = page.evaluate("""() => {const d=__doom();return {count:d.horde.birds.length,
      expected:__mallards().birds.length+__pigeons().birds.length+__gulls().birds.length+__forestBirds().birds.length+__smallWildlife().birds.length,
      kinds:[...new Set(d.horde.birds.map(b=>b.kind))],valid:d.horde.birds.every(b=>d.horde.canStand(b.x,b.z))};}""")
    assert (
        data["count"] == data["expected"] and len(data["kinds"]) == 5 and data["valid"]
    ), data
    page.wait_for_function(
        "__doom().music.currentTime>.3 && !__doom().music.paused", timeout=20000
    )
    assert page.evaluate("__doom().music.duration") > 60
    assert page.evaluate("__doom().music.loop")
    # Meter the actual local soundtrack, after HTMLMediaElement decoding.
    page.evaluate("""async () => {
      const ctx=new AudioContext();await ctx.resume();
      const source=ctx.createMediaElementSource(__doom().music),meter=ctx.createAnalyser();meter.fftSize=512;
      source.connect(meter);meter.connect(ctx.destination);window.__musicPeak=0;
      setInterval(()=>{const data=new Float32Array(512);meter.getFloatTimeDomainData(data);__musicPeak=Math.max(__musicPeak,...data.map(Math.abs));},20);
    }""")
    page.wait_for_function("__musicPeak>.005", timeout=10000)
    page.evaluate("__doom().music.currentTime=__doom().music.duration-.12")
    page.wait_for_function(
        "__doom().music.currentTime<1 && !__doom().music.paused", timeout=10000
    )
    assert page.evaluate("__doomFlameDraws") > 0
    assert page.evaluate("document.querySelector('#c').getContext('webgl2').getError()") == 0
    page.screenshot(path=str(out / "doom-horde-guns.png"))
    before = page.evaluate("__doom().horde.birds.slice(0,20).map(d=>[d.x,d.z])")
    page.wait_for_timeout(500)
    assert page.evaluate("__doom().horde.birds.slice(0,20).map(d=>[d.x,d.z])") != before
    # Find a real clear paved run and drive through a bird running at the stroller.
    page.evaluate("""() => {
      const p=__doom().horde;
      let route=null;
      for(const g of __pigeons().groups) {
        for(let a=0;a<6.28;a+=.2){let clear=true;const dx=Math.cos(a),dz=Math.sin(a);
          for(let t=-7;t<=7;t+=.25)if(!p.canStand(g.x+dx*t,g.z+dz*t)){clear=false;break;}
          if(clear){route={x:g.x,z:g.z,dx,dz};break;}}
        if(route)break;
      }
      if(!route)throw Error('No clear DOOM route');
      const bird=p.birds.find(d=>d.kind==='pigeon');p.birds=[bird];bird.x=route.x;bird.z=route.z;
      __car.x=route.x-route.dx*3;__car.z=route.z-route.dz*3;__car.v=0;
      __car.heading=Math.atan2(route.dx,-route.dz);__cam.yaw=__car.heading;__cam.orbit=0;__cam.dist=3;__cam.pitch=.3;
      p.lastCar=null;window.__doomVictim=bird;
    }""")
    page.keyboard.down("w")
    page.wait_for_function("__doom().kills===1", timeout=15000)
    page.wait_for_timeout(800)
    page.keyboard.up("w")
    assert page.evaluate("__car.v") > 1
    assert page.locator("#doomKills").inner_text() == "1"
    assert page.evaluate(
        "__doomVictim.dead && __doomVictim.source.dead && __doom().corpses.length===1"
    )
    position = page.evaluate("[__doomVictim.x,__doomVictim.z]")
    page.evaluate("__car.v=0")
    page.wait_for_timeout(700)
    assert page.evaluate("[__doomVictim.x,__doomVictim.z]") == position
    assert page.evaluate("__doom().kills") == 1
    page.screenshot(path=str(out / "doom-counter-body.png"))
    page.uncheck("#sound")
    page.wait_for_function("__doom().music.paused")
    page.check("#sound")
    page.wait_for_function("!__doom().music.paused")
    page.click("#menu")
    assert page.evaluate("__doom().music.paused")
    page.click("#free")
    page.wait_for_function("!__doom().music.paused")
    page.keyboard.type("iddqd", delay=70)
    assert not page.evaluate("__doom().active")
    assert page.evaluate("__doom().music.paused")
    assert not page.locator("#doomScore").is_visible()
    assert not page.locator("body").evaluate('e=>e.classList.contains("doom")')
    assert page.evaluate("__doom().corpses.length") == 1
    page.keyboard.type("IDDQD", delay=70)
    assert page.evaluate("__doom().kills") == 1
    page.set_viewport_size({"width": 390, "height": 844})
    page.click("#toggle")
    page.screenshot(path=str(out / "doom-mobile.png"))
    assert page.locator("#doomScore").is_visible()
    assert not errors, errors
    assert not failed, failed
    print(
        "PASS: IDDQD, music signal/loop/mute/menu, all-species ground horde, crush counter, bodies, twin gun render, toggle, mobile",
        data,
        flush=True,
    )
    browser.close()

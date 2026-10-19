"""Regression: short chiptune coos stay quiet and leave long silent gaps."""

import os
from itertools import pairwise

from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(channel="chrome", headless=True)
    page = browser.new_page()
    page.add_init_script("""
      window.__cooPeak=0;window.__cooCount=0;window.__cooStarts=[];window.__cooDurations=[];window.__cooTypes=[];
      const edges=new WeakMap(),connect=AudioNode.prototype.connect;
      AudioNode.prototype.connect=function(destination,...args) {
        edges.set(this,destination);return connect.call(this,destination,...args);
      };
      function meter(source) {
        const gain=edges.get(source), analyser=source.context.createAnalyser();
        analyser.fftSize=512;connect.call(gain,analyser);window.__cooCount++;__cooStarts.push(source.context.currentTime);__cooTypes.push(source.type || "recording");
        const stop=source.stop.bind(source);source.stop=(at)=>{__cooDurations.push(at-source.context.currentTime);return stop(at);};
        const timer=setInterval(()=>{
          const data=new Float32Array(512);analyser.getFloatTimeDomainData(data);
          __cooPeak=Math.max(__cooPeak,...data.map(Math.abs));
        },10);
        setTimeout(()=>{clearInterval(timer);analyser.disconnect();},4500);
      }
      const Native=AudioContext;
      window.AudioContext=class extends Native {
        createOscillator() {
          const source=super.createOscillator(),start=source.start.bind(source);
          source.start=(...args)=>{if(source.type==='custom')meter(source);return start(...args);};return source;
        }
        createBufferSource() {
          const source=super.createBufferSource(),start=source.start.bind(source);
          source.start=(...args)=>{if(source.buffer?.duration>2)meter(source);return start(...args);};return source;
        }
      };
    """)
    page.goto(os.environ.get("PARK_URL", "http://127.0.0.1:8791") + "/park.html")
    page.wait_for_function("window.__stats?.car", timeout=90000)
    page.click("#free")
    page.evaluate("""() => {
      const pop=__pigeons(), dogs=window.__dogs?.().dogs || [];
      dogs.forEach(d=>d.pause=1000);
      const g=pop.groups.find(g=>g.size==='large' && dogs.every(d=>Math.hypot(d.x-g.x,d.z-g.z)>40));
      pop.groups=[g];pop.birds=g.birds;g.birds.forEach(d=>{d.flock=0;d.pause=1000;d.flight=null;});
      __car.x=g.x-18;__car.z=g.z;__car.v=0;
    }""")
    page.wait_for_function("__cooCount>0", timeout=15000)
    page.wait_for_timeout(16000)
    peak = page.evaluate("__cooPeak")
    print("Coo peak at 15–20 m:", peak, flush=True)
    assert 0.003 <= peak <= 0.025, f"Coo output outside quiet audible range: {peak:.5f}"
    starts = page.evaluate("__cooStarts")
    durations = page.evaluate("__cooDurations")
    assert len(starts) >= 2, starts
    assert all(7.5 <= b - a <= 14.5 for a, b in pairwise(starts)), starts
    assert len(durations) == len(starts) and all(0.6 <= d <= 0.7 for d in durations), (
        durations
    )
    assert all(t == "custom" for t in page.evaluate("__cooTypes"))
    page.uncheck("#sound")
    page.wait_for_timeout(4500)
    before = page.evaluate("__cooCount")
    page.wait_for_timeout(5500)
    assert page.evaluate("__cooCount") == before
    print("PASS: quiet short chiptune coos, 8–14 second intervals and mute", flush=True)
    browser.close()

"""Fourfold gulls, solitary woodpeckers and grebes on the actual map."""
import os
import tempfile
from pathlib import Path

from playwright.sync_api import sync_playwright

out = Path(tempfile.mkdtemp(prefix='park-additional-birds-'))
print('Screenshots:', out, flush=True)
with sync_playwright() as p:
    browser = p.chromium.launch(channel='chrome', headless=True)
    page = browser.new_page(viewport={'width': 1440, 'height': 900})
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.add_init_script("""
      window.__woodCries=0;
      const Native=AudioContext;
      window.AudioContext=class extends Native {
        createOscillator(){const s=super.createOscillator(),set=s.frequency.setValueAtTime.bind(s.frequency),start=s.start.bind(s);
          s.frequency.setValueAtTime=(value,...args)=>{s.firstFrequency??=value;return set(value,...args);};
          s.start=(...args)=>{if(s.type==='triangle'&&s.firstFrequency===820)__woodCries++;return start(...args);};return s;}
      };
    """)
    page.goto(os.environ.get('PARK_URL','http://127.0.0.1:8791')+'/park.html')
    page.wait_for_function('window.__stats?.car', timeout=90000)
    counts = page.evaluate("""()=>{const f=__forestBirds(),m=__mallards();return {gulls:__gulls().birds.length,groups:m.groups.length,
      green:f.woodpeckers.length,spotted:f.spottedWoodpeckers.length,grebes:m.grebes.length,
      solitary:f.woodpeckers.concat(f.spottedWoodpeckers).every(d=>d.group===-1&&f.groups.every(g=>Math.hypot(d.x-g.x,d.z-g.z)>=18)),
      separate:m.grebes.every(d=>m.grebes.every(other=>other===d||Math.hypot(d.cx-other.cx,d.cz-other.cz)>=80))};}""")
    assert counts['gulls'] == counts['groups'] * 6 * 4, counts
    assert counts['green'] == 12 and counts['spotted'] == counts['green'] * 5 and counts['grebes'] == 20, counts
    assert counts['solitary'] and counts['separate'], counts
    page.click('#free')
    # Pick a real forest bird with an unobstructed viewpoint.
    page.evaluate("""()=>{
      const p=__forestBirds();p.birds.forEach(d=>d.wait=1000);__dogs().dogs.forEach(d=>d.pause=1000);
      for(const d of p.spottedWoodpeckers)for(let a=0;a<6.28;a+=.3){
        let ok=true;for(let r=.2;r<=12;r+=.2)if(!p.canFly(d.x+Math.cos(a)*r,d.z+Math.sin(a)*r)){ok=false;break;}
        if(!ok)continue;
        window.__testSpotted=d;__car.x=d.x+Math.cos(a)*10;__car.z=d.z+Math.sin(a)*10;__car.v=0;
        __car.heading=Math.atan2(d.x-__car.x,-(d.z-__car.z));__cam.yaw=__car.heading;__cam.orbit=.35;__cam.dist=2;__cam.pitch=.25;return;
      }throw Error('No spotted woodpecker viewpoint');
    }""")
    page.wait_for_timeout(700)
    page.screenshot(path=str(out/'spotted-woodpecker.png'))
    page.evaluate("__car.x=__testSpotted.x+2;__car.z=__testSpotted.z;__car.v=0;__woodCries=0")
    page.wait_for_function('__testSpotted.flight!==null&&__testSpotted.y>0', timeout=5000)
    page.wait_for_function('__woodCries>=7', timeout=5000)
    assert page.evaluate('__testSpotted.y<1.8')
    page.screenshot(path=str(out/'spotted-flight.png'))
    # Real grebes swim alone; choose a recorded shore for the viewing angle.
    page.evaluate("""()=>{const d=__mallards().grebes[0];window.__testGrebe=d;
      __car.x=d.shore[0];__car.z=d.shore[1];__car.v=0;__car.heading=Math.atan2(d.x-__car.x,-(d.z-__car.z));
      __cam.yaw=__car.heading;__cam.orbit=.25;__cam.dist=2;__cam.pitch=.2;
    }""")
    before = page.evaluate('[__testGrebe.x,__testGrebe.z]')
    page.wait_for_timeout(1000)
    assert page.evaluate('[__testGrebe.x,__testGrebe.z]') != before
    page.screenshot(path=str(out/'grebe.png'))
    page.set_viewport_size({'width':390,'height':844})
    page.wait_for_timeout(300)
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
    assert page.evaluate("document.querySelector('#c').getContext('webgl2').getError()") == 0
    assert not errors, errors
    print('PASS: gull count, solitary woodpeckers/flee/cry/wavy flight, solitary swimming grebes, mobile/WebGL', counts, flush=True)
    browser.close()

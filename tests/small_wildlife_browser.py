"""Real-map populations, native chirps, ground escape, tree flights and nut burying."""
import os
import tempfile
from pathlib import Path

from playwright.sync_api import sync_playwright

out = Path(tempfile.mkdtemp(prefix='park-small-wildlife-'))
print('Screenshots:', out, flush=True)
with sync_playwright() as p:
    browser = p.chromium.launch(channel='chrome', headless=True)
    page = browser.new_page(viewport={'width': 1440, 'height': 900})
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.add_init_script("""
      window.__chirps={sparrow:0,tit:0,wagtail:0};window.__chirpPeaks={sparrow:0,tit:0,wagtail:0};
      const edges=new WeakMap(),connect=AudioNode.prototype.connect;
      AudioNode.prototype.connect=function(dest,...args){edges.set(this,dest);return connect.call(this,dest,...args);};
      const Native=AudioContext;
      window.AudioContext=class extends Native {
        createOscillator(){
          const osc=super.createOscillator(),start=osc.start.bind(osc),set=osc.frequency.setValueAtTime.bind(osc.frequency);
          osc.frequency.setValueAtTime=(value,...args)=>{osc.firstFrequency??=value;return set(value,...args);};
          osc.start=(...args)=>{
            const kind={2400:'sparrow',2600:'tit',3200:'wagtail'}[osc.firstFrequency];
            if(kind&&osc.type==='triangle'){
              __chirps[kind]++;const gain=edges.get(osc),meter=osc.context.createAnalyser();meter.fftSize=512;connect.call(gain,meter);
              const timer=setInterval(()=>{const d=new Float32Array(512);meter.getFloatTimeDomainData(d);__chirpPeaks[kind]=Math.max(__chirpPeaks[kind],...d.map(Math.abs));},5);
              osc.addEventListener('ended',()=>{clearInterval(timer);meter.disconnect();});
            }
            return start(...args);
          };return osc;
        }
      };
    """)
    page.goto(os.environ.get('PARK_URL', 'http://127.0.0.1:8791') + '/park.html')
    page.wait_for_function('window.__stats?.car', timeout=90000)
    counts = page.evaluate("""() => {
      const p=__smallWildlife();return {sparrowGroups:p.sparrows.groups.length,sparrows:p.sparrows.birds.length,
        titGroups:p.titGroups.length,tits:p.tits.length,wagtails:p.wagtails.length,squirrels:p.squirrels.length,
        habitat:p.sparrows.birds.concat(p.wagtails).every(d=>p.paved.canLand(d.x,d.z))&&p.tits.every(d=>p.forest.canFly(d.x,d.z)&&d.y>=2)&&p.squirrels.every(d=>p.forest.canForage(d.x,d.z)),
        sizes:p.sparrows.groups.every(g=>g.birds.length>=2&&g.birds.length<=5)&&p.titGroups.every(g=>g.birds.length>=2&&g.birds.length<=5),
        spread:[p.sparrows.birds,p.tits,p.wagtails,p.squirrels].every(list=>list.some(d=>Math.hypot(d.x-8.25,d.z+415.7)>650))};
    }""")
    assert counts['wagtails'] == 5 and counts['squirrels'] == 40, counts
    assert counts['sparrowGroups'] > 20 and counts['titGroups'] >= 60, counts
    assert counts['habitat'] and counts['sizes'] and counts['spread'], counts
    print('COUNTS', counts, flush=True)
    page.click('#free')
    page.evaluate("""()=>{window.__smallView=(list,distance,pitch)=>{
      const p=__smallWildlife();
      for(const d of list)for(let a=0;a<6.28;a+=.25){
        let clear=true;for(let r=.25;r<=distance+3;r+=.25)if(!p.forest.canFly(d.x+Math.cos(a)*r,d.z+Math.sin(a)*r)){clear=false;break;}
        if(!clear)continue;
        __car.x=d.x+Math.cos(a)*distance;__car.z=d.z+Math.sin(a)*distance;__car.v=0;
        __car.heading=Math.atan2(d.x-__car.x,-(d.z-__car.z));__cam.yaw=__car.heading;__cam.orbit=.35;__cam.dist=2;__cam.pitch=pitch;
        return d;
      }throw Error('No unobstructed viewpoint');
    };}""")
    # Native synthesis and screenshots for each bird species at a normal viewing distance.
    for kind, collection in [('sparrow', 'sparrows.birds'), ('tit', 'tits'), ('wagtail', 'wagtails')]:
        page.evaluate("""({kind,collection})=>{
          const p=__smallWildlife(),birds=collection==='sparrows.birds'?p.sparrows.birds:p[collection];
          p.birds.forEach(b=>b.pause=1000);__dogs().dogs.forEach(d=>d.pause=1000);
          __smallView(birds,8,kind==='tit'?-.2:.25);
          p.calls[kind]=.1;
        }""", {'kind': kind, 'collection': collection})
        page.wait_for_function('kind=>__chirps[kind]>0', arg=kind, timeout=5000)
        page.wait_for_timeout(500)
        assert page.evaluate('kind=>__chirpPeaks[kind]', kind) > .0001, kind
        page.screenshot(path=str(out / (kind + '.png')))
    # Wagtails never fly: a nearby stroller increases their distance by ground running.
    page.evaluate("""()=>{const d=__smallWildlife().wagtails[0];window.__testWagtail=d;d.walk=null;d.pause=1000;
      __car.x=d.x-2;__car.z=d.z;__car.v=0;window.__wagtailStart=[d.x,d.z];}""")
    page.wait_for_timeout(800)
    assert page.evaluate("Math.hypot(__testWagtail.x-__wagtailStart[0],__testWagtail.z-__wagtailStart[1])>.5 && __testWagtail.y===0 && !__testWagtail.flight")
    # The entire sparrow flock takes off and keeps circling while the stroller stays nearby.
    page.evaluate("""()=>{const g=__smallWildlife().sparrows.groups[0];window.__testSparrow=g.birds[0];
      g.birds.forEach(d=>{d.flight=null;d.x=d.homeX;d.z=d.homeZ;d.y=0;});
      __car.x=__testSparrow.x;__car.z=__testSparrow.z;__car.v=0;}""")
    page.wait_for_function("__testSparrow.flight?.mode==='circle'", timeout=5000)
    before = page.evaluate('__testSparrow.flight.angle')
    page.wait_for_timeout(800)
    assert page.evaluate('__testSparrow.flight.angle') - before > 1
    # Tits take short flights between actual tree perches, always above ground.
    page.evaluate("""()=>{const p=__smallWildlife();window.__testTit=p.tits.find(d=>p.forestTrees.some(t=>Math.hypot(t.x-d.x,t.z-d.z)>3&&Math.hypot(t.x-d.x,t.z-d.z)<12));
      __testTit.pause=0;__car.x=__testTit.x-10;__car.z=__testTit.z;__car.v=0;}""")
    page.wait_for_function('__testTit.flight!==null', timeout=5000)
    assert page.evaluate('__testTit.y>=2')
    page.screenshot(path=str(out / 'tit-flight.png'))
    page.wait_for_function('__testTit.flight===null', timeout=5000)
    assert page.evaluate('__smallWildlife().forestTrees.some(t=>Math.hypot(t.x-__testTit.x,t.z-__testTit.z)<.02)')
    # A squirrel carries its nut, then digs and leaves it buried.
    page.evaluate("""()=>{const p=__smallWildlife();window.__testSquirrel=__smallView(p.squirrels,5,.25);
      __testSquirrel.carrying=true;__testSquirrel.pause=0;__testSquirrel.walk=null;
      p.random=()=>.2;}""")
    page.wait_for_function("__testSquirrel.action==='dig'", timeout=30000)
    page.screenshot(path=str(out / 'squirrel-burying.png'))
    page.wait_for_function("__testSquirrel.action!=='dig' && !__testSquirrel.carrying", timeout=5000)
    page.uncheck('#sound')
    before = page.evaluate('JSON.stringify(__chirps)')
    page.evaluate("Object.keys(__smallWildlife().calls).forEach(k=>__smallWildlife().calls[k]=0)")
    page.wait_for_timeout(800)
    assert page.evaluate('JSON.stringify(__chirps)') == before
    page.set_viewport_size({'width': 390, 'height': 844})
    page.wait_for_timeout(300)
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
    assert page.evaluate("document.querySelector('#c').getContext('webgl2').getError()") == 0
    assert not errors, errors
    print('PASS: habitat, distribution, all three native chirps/mute, sparrow flight, wagtail escape, tree perches, nut burying, mobile/WebGL', page.evaluate('__chirpPeaks'), flush=True)
    browser.close()

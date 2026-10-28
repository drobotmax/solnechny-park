"""Exercise the next avenue station, actual GPU buffers and real stroller controls."""
import io
import json
import math
import os
import tempfile
from pathlib import Path

from PIL import Image, ImageChops, ImageStat
from playwright.sync_api import sync_playwright

BASE=os.environ.get('PARK_URL','http://127.0.0.1:8791')
OUT=Path(os.environ.get('PARK_PICNIC_OUT',tempfile.mkdtemp(prefix='park-picnic-')))
OUT.mkdir(parents=True,exist_ok=True)
errors=[];report={}
views={'north':(63.5,-173.2,-.20),'kiosks':(63.5,-173.2,1.60),'south':(63.5,-173.2,2.94),
       'courts':(63.5,-173.2,4.49),'north-west':(63.5,-173.2,5.45),
       'kiosks-close':(69.1,-173.2,1.60),'court-gate':(54,-158.5,4.50)}


def ready(page,query):
    print('preview:',query,flush=True)
    page.goto(BASE+'/park.html?'+query+'&grain=0&sound=0')
    try:
        page.wait_for_function('window.__stats?.car&&__stats.streaming.pending===0&&window.__picnicMeshes?.pending.size===0',timeout=90000)
    except Exception:
        print('load diagnostics:',page.evaluate('({stats:window.__stats,status:document.querySelector("#status")?.textContent})'),errors,flush=True)
        raise
    page.wait_for_timeout(1300)
    assert page.locator('#status').is_hidden()


def pose(page,name):
    x,z,h=views[name]
    page.evaluate('p=>__calibrationCamera=p',dict(x=x,z=z,y=1.72,heading=h,pitch=0))
    page.wait_for_timeout(220)


def frame(page):
    return Image.open(io.BytesIO(page.locator('#c').screenshot(timeout=120000))).convert('RGB')


def check(page):
    state=page.evaluate("()=>{const g=document.querySelector('#c').getContext('webgl2');return {gl:g.getError(),lost:g.isContextLost(),failed:__stats.streaming.failures}}")
    assert state==dict(gl=0,lost=False,failed=0),state


with sync_playwright() as p:
    browser=p.chromium.launch(channel='chrome',headless=True)
    init="""let streaming;Object.defineProperty(window,'ParkStreaming',{get(){return streaming},set(v){
      const Stream=v.Stream;v.Stream=function(...args){const s=new Stream(...args);
        if(args[0].some(e=>e.kind==='picnicKiosks'))window.__picnicMeshes=s;return s;};
      v.Stream.prototype=Stream.prototype;streaming=v;
    }});"""
    page=browser.new_page(viewport={'width':1440,'height':900})
    page.set_default_timeout(120000);page.add_init_script(init)
    page.on('pageerror',lambda e:errors.append(str(e)))
    ready(page,'calibrate=1&x=63.5&z=-173.2&heading=1.60')
    originals={}
    for name in views:
        pose(page,name);originals[name]=frame(page);originals[name].save(OUT/f'picnic-{name}.png')
    report['desktop']=page.evaluate('JSON.parse(JSON.stringify(__stats))');check(page)
    report['pixel_controls']={}
    # Hide actual resident GPU objects without rebuilding or changing placement.
    for object_id,view in [('picnic-kiosks','kiosks'),('b115','kiosks'),('picnic-avenue','courts'),('safari-avenue','north')]:
        print('pixel control:',object_id,flush=True);pose(page,view)
        page.evaluate('id=>{const m=__picnicMeshes.resident.get(id).value;window.__hiddenPicnic=[m,m.n];m.n=0}',object_id)
        page.wait_for_timeout(150)
        delta=sum(ImageStat.Stat(ImageChops.difference(originals[view].crop((0,170,1440,840)),frame(page).crop((0,170,1440,840)))).mean)/3
        page.evaluate('__hiddenPicnic[0].n=__hiddenPicnic[1]')
        report['pixel_controls'][object_id]=delta
        assert delta>(.18 if object_id=='safari-avenue' else .5),(object_id,delta)
        check(page)
    page.evaluate('__calibrationCamera=null')
    report['physics']={}

    def drive(name,x,z,h,until=None,blocked=False):
        print('drive:',name,flush=True)
        page.evaluate('p=>{__car.x=p.x;__car.z=p.z;__car.heading=p.h;__car.v=0;__car.steer=0}',dict(x=x,z=z,h=h))
        page.keyboard.down('w')
        try:
            if blocked:page.wait_for_timeout(550)
            else:page.wait_for_function(until or f'Math.hypot(__car.x-({x}),__car.z-({z}))>2.2',timeout=18000)
        finally:page.keyboard.up('w')
        page.evaluate('__car.v=0')
        end=page.evaluate('[__car.x,__car.z]');distance=math.dist([x,z],end)
        report['physics'][name]=dict(metres=distance,end=end)
        (OUT/'physics-progress.json').write_text(json.dumps(report['physics'],indent=2)+'\n')
        assert distance<.015 if blocked else distance>.3,(name,distance,end)
        return end

    drive('main_south',65.5,-159,2.94,until='__car.z>-146')
    drive('main_north',64,-169,-.20,until='__car.z<-180')
    drive('to_shutter_frontage',68,-174.5,math.pi/2,until='__car.x>73.4')
    drive('along_stall_frontage',72.8,-171.2,math.pi,until='__car.z>-164.2')
    a=page.evaluate('ParkAvenuePicnic.access')
    for i in range(len(a)-1):
        x,z=a[i];bx,bz=a[i+1];h=math.atan2(bx-x,z-bz)
        distance=math.dist(a[i],a[i+1])-.45
        drive('court_approach_'+str(i),x,z,h,until=f'Math.hypot(__car.x-({x}),__car.z-({z}))>{distance}')
    drive('north_forecourt_regression',63,-189.6,math.pi/2,until='__car.x>73')
    drive('safari_gate_regression',38.5,-192.2,math.pi*1.5,until='__car.x<34.2')
    fixtures=page.evaluate("""()=>{const p=ParkAvenuePicnic,s=ParkSafariAvenue;return [
      ['shutter',p.croissant.x,p.croissant.z],['icecream',p.icecream.x,p.icecream.z],
      ['coffee',s.coffee.x,s.coffee.z],['picnic',s.picnic.x,s.picnic.z],
      ['bench',...p.benches[3].slice(0,2)],['direction_sign',...p.sign],['ice_marker',...p.iceCone],
      ['cover',56.95,-177.5],['tennis_net',...p.courtWorld(30,p.court.net)],['fence',43.3,-145.2]];}""")
    for name,x,z in fixtures:drive(name,x,z,0,blocked=True)
    check(page);assert not errors,errors
    phone=browser.new_page(viewport={'width':390,'height':844},device_scale_factor=2,is_mobile=True,has_touch=True)
    phone.set_default_timeout(120000);phone.add_init_script(init);phone.on('pageerror',lambda e:errors.append(str(e)))
    ready(phone,'preview=picnic-avenue')
    assert phone.locator('#pad [data-k="up"]').is_visible()
    assert phone.evaluate('document.documentElement.scrollWidth<=innerWidth')
    phone.screenshot(path=str(OUT/'picnic-mobile.png'),timeout=120000);check(phone)
    report['mobile']=phone.evaluate('JSON.parse(JSON.stringify(__stats))')
    browser.close()
assert not errors,errors
report['page_errors']=errors
(OUT/'validation.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({'output':str(OUT),'pixel_controls':report['pixel_controls'],'physics':report['physics'],'page_errors':errors},indent=2))

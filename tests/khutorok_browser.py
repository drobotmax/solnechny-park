"""Exercise the Khutorok junction, real gate bypass and cafe entrance in Chrome."""
import io
import json
import math
import os
from pathlib import Path
from PIL import Image, ImageChops, ImageStat
from playwright.sync_api import sync_playwright

BASE=os.environ.get('PARK_URL','http://127.0.0.1:8791')
OUT=Path(os.environ.get('PARK_KHUTOROK_OUT','tasks/2026-10-28-khutorok-junction/validation'))
OUT.mkdir(parents=True,exist_ok=True)
errors=[];report={}
views={'gate':(111.33,-246.01,1.30),'cafe':(125.7,-250.4,1.99),'parking':(116.3,-249.3,-.37),
       'lawn':(119.9,-247.1,2.34),'back':(117,-248.7,-1.55),'layout':(130,-222,0),'reverse':(127.8,-258.9,-2.80),'north-walk':(126.5,-255.2,-.30),'terrace-close':(130,-248.5,1.76)}
init="""let streaming;Object.defineProperty(window,'ParkStreaming',{get(){return streaming},set(v){
 const Original=v.Stream;v.Stream=function(...args){const s=new Original(...args);if(args[0].some(e=>e.kind==='khutorokJunction'))window.__khutorokMeshes=s;return s;};v.Stream.prototype=Original.prototype;streaming=v;}});"""

def ready(page,query):
    page.goto(BASE+'/park.html?'+query+'&grain=0&sound=0')
    page.wait_for_function('window.__stats?.car&&__stats.streaming.pending===0&&window.__khutorokMeshes?.pending.size===0',timeout=90000)
    page.wait_for_timeout(1000)
    assert page.locator('#status').is_hidden()

def check(page):
    state=page.evaluate("()=>{const g=document.querySelector('#c').getContext('webgl2');return {gl:g.getError(),lost:g.isContextLost(),failed:__stats.streaming.failures}}")
    assert state==dict(gl=0,lost=False,failed=0),state

with sync_playwright() as p:
    browser=p.chromium.launch(channel='chrome',headless=True)
    page=browser.new_page(viewport={'width':1440,'height':900});page.add_init_script(init)
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.on('response',lambda r:errors.append(f'{r.status} {r.url}') if r.status>=400 else None)
    ready(page,'calibrate=1&x=112.2&z=-246.52&heading=1.03')
    frames={}
    for name,(x,z,h) in views.items():
        page.evaluate('p=>__calibrationCamera=p',dict(x=x,z=z,y=32 if name=='layout' else 1.72,heading=h,pitch=-.80 if name=='layout' else 0));page.wait_for_timeout(250)
        frames[name]=Image.open(io.BytesIO(page.locator('#c').screenshot())).convert('RGB');frames[name].save(OUT/f'khutorok-{name}.png')
        print('captured:',name,flush=True)
    report['pixel_controls']={}
    for object_id,view in [('b125','cafe'),('b94','cafe'),('khutorok-junction','gate')]:
        x,z,h=views[view];page.evaluate('p=>__calibrationCamera=p',dict(x=x,z=z,y=1.72,heading=h,pitch=0))
        page.evaluate("id=>{const m=__khutorokMeshes.resident.get(id).value;window.__savedKhutorokMesh=[m,m.n];m.n=0}",object_id)
        page.wait_for_timeout(200);hidden=Image.open(io.BytesIO(page.locator('#c').screenshot())).convert('RGB')
        delta=sum(ImageStat.Stat(ImageChops.difference(frames[view],hidden)).mean)/3
        report['pixel_controls'][object_id]=delta;assert delta>.4,(object_id,delta)
        page.evaluate('__savedKhutorokMesh[0].n=__savedKhutorokMesh[1]')
    page.evaluate('__calibrationCamera=null')
    report['desktop']=page.evaluate('JSON.parse(JSON.stringify(__stats))');check(page)
    report['drives']={}
    def drive(name,x,z,h,length=2,blocked=False):
        page.evaluate('p=>{__car.x=p.x;__car.z=p.z;__car.heading=p.h;__car.v=0;__car.steer=0}',dict(x=x,z=z,h=h))
        page.keyboard.down('w')
        try:
            if blocked:page.wait_for_timeout(650)
            else:page.wait_for_function(f'Math.hypot(__car.x-({x}),__car.z-({z}))>{length}',timeout=20000)
        except Exception:
            print('stalled:',name,page.evaluate('[__car.x,__car.z]'),flush=True)
            raise
        finally:page.keyboard.up('w')
        page.evaluate('__car.v=0');end=page.evaluate('[__car.x,__car.z]');distance=math.dist([x,z],end)
        report['drives'][name]=dict(metres=distance,end=end)
        print('drive:',name,round(distance,2),flush=True)
        assert distance<.02 if blocked else distance>=length,(name,end,distance)
    paths=page.evaluate('[ParkKhutorok.bypass,ParkKhutorok.gardenWalk,ParkKhutorok.cafeDrive,ParkKhutorok.northWalk]')
    for j,path in enumerate(paths):
        for i,(a,b) in enumerate(zip(path,path[1:])):
            drive(f'path_{j}_{i}',*a,math.atan2(b[0]-a[0],a[1]-b[1]),math.dist(a,b)-.35)
    drive('terrace_entrance',130,-242.4,math.pi/2,4.9)
    drive('accepted_single_alley',106,-245.3,-1.646,10.6)
    start=page.evaluate('ParkKhutorok.gateWorld(-2,0)');h=page.evaluate('Math.atan2(ParkKhutorok.gate.forward[0],-ParkKhutorok.gate.forward[1])')
    page.evaluate('p=>{__car.x=p.x;__car.z=p.z;__car.heading=p.h;__car.v=0;__car.steer=0}',dict(x=start[0],z=start[1],h=h))
    page.keyboard.down('w');page.wait_for_timeout(2000);page.keyboard.up('w');page.evaluate('__car.v=0')
    end=page.evaluate('[__car.x,__car.z]');stopped=math.dist(start,end);report['gate_stop_metres']=stopped
    assert 1.0<stopped<1.8,('gate did not stop the approaching stroller',start,end,stopped)
    fixtures=page.evaluate('[ParkKhutorok.parking[0].at,ParkKhutorok.hedge[2],ParkKhutorok.bin]')
    for i,pos in enumerate(fixtures):drive(f'fixture_{i}',*pos,0,blocked=True)
    check(page)
    phone=browser.new_page(viewport={'width':390,'height':844},device_scale_factor=2,is_mobile=True,has_touch=True)
    phone.add_init_script(init);phone.on('pageerror',lambda e:errors.append(str(e)))
    ready(phone,'preview=khutorok-crossroads')
    assert phone.locator('#pad [data-k="up"]').is_visible()
    assert phone.evaluate('document.documentElement.scrollWidth<=innerWidth')
    phone.screenshot(path=str(OUT/'khutorok-mobile.png'));check(phone)
    report['mobile']=phone.evaluate('JSON.parse(JSON.stringify(__stats))');browser.close()
assert not errors,errors
report['errors']=errors;(OUT/'validation.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({'output':str(OUT),'pixel_controls':report['pixel_controls'],'gate_stop_metres':report['gate_stop_metres'],'drives':report['drives'],'errors':errors},indent=2))

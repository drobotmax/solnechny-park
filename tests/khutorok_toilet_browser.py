"""Verify the toilet from its map pin and drive the photographed approach."""
import io
import json
import math
import os
from pathlib import Path
from PIL import Image, ImageChops, ImageStat
from playwright.sync_api import sync_playwright

BASE=os.environ.get('PARK_URL','http://127.0.0.1:8791')
OUT=Path(os.environ.get('PARK_KHUTOROK_TOILET_OUT','tasks/2026-10-28-khutorok-toilet/left-entrance-validation'))
OUT.mkdir(parents=True,exist_ok=True)
errors=[];report={}
init="""window.__junctionLoadErrors=[];let streaming;Object.defineProperty(window,'ParkStreaming',{get(){return streaming},set(v){
 const Original=v.Stream;v.Stream=function(...args){const load=args[1];args[1]=async(...q)=>{try{return await load(...q)}catch(e){if(e.name!=='AbortError')__junctionLoadErrors.push({id:q[0].id,src:q[0].src,message:e.message,aborted:q[1]?.aborted});throw e;}};const s=new Original(...args);if(args[0].some(e=>e.kind==='khutorokServiceLane'))window.__junctionMeshes=s;return s;};v.Stream.prototype=Original.prototype;streaming=v;}});"""

def ready(page,query):
    page.goto(BASE+'/park.html?'+query+'&grain=0&sound=0')
    page.wait_for_function('window.__stats?.car&&__stats.streaming.pending===0&&window.__junctionMeshes?.pending.size===0',timeout=90000)
    page.wait_for_timeout(700)
    assert page.locator('#status').is_hidden()
    assert page.evaluate('__game.mode')=='free'
    assert page.locator('#free').is_hidden()

def check(page):
    state=page.evaluate("()=>{const g=document.querySelector('#c').getContext('webgl2');return {gl:g.getError(),lost:g.isContextLost(),failed:__stats.streaming.failures}}")
    assert state==dict(gl=0,lost=False,failed=0),(state,page.evaluate('__junctionLoadErrors'))

with sync_playwright() as p:
    browser=p.chromium.launch(channel='chrome',headless=True)
    page=browser.new_page(viewport={'width':1440,'height':900});page.add_init_script(init)
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.on('response',lambda r:errors.append(f'{r.status} {r.url}') if r.status>=400 else None)
    ready(page,'calibrate=1&x=151&z=-213&heading=1.23')
    station=page.evaluate('ParkKhutorokToilet.station');views=page.evaluate('ParkKhutorokToilet.views');frames={}
    def camera(name):
        page.evaluate('p=>__calibrationCamera=p',dict(x=station[0],z=station[1],y=1.72,heading=views[name],pitch=0))
        page.wait_for_timeout(250)
    for name in views:
        camera(name);frames[name]=Image.open(io.BytesIO(page.locator('#c').screenshot())).convert('RGB')
        frames[name].save(OUT/f'khutorok-toilet-{name}.png');print('captured:',name,'at',station,'heading',round(views[name],3),flush=True)
    page.evaluate('p=>__calibrationCamera=p',dict(x=146,z=-185,y=30,heading=0,pitch=-.90))
    page.wait_for_timeout(250);page.locator('#c').screenshot(path=str(OUT/'khutorok-toilet-layout.png'))
    report['station']=station;report['views']=views;report['pixel_controls']={}
    for object_id,view in [('khutorok-teal-hut','east'),('khutorok-teal-hut','south'),('khutorok-annex','west'),('khutorok-service-lane','north')]:
        camera(view)
        page.evaluate("id=>{const m=__junctionMeshes.resident.get(id).value;window.__savedJunctionMesh=[m,m.n];m.n=0}",object_id)
        page.wait_for_timeout(150);hidden=Image.open(io.BytesIO(page.locator('#c').screenshot())).convert('RGB')
        delta=sum(ImageStat.Stat(ImageChops.difference(frames[view],hidden)).mean)/3
        report['pixel_controls'][object_id+':'+view]=delta;assert delta>.30,(object_id,view,delta)
        page.evaluate('__savedJunctionMesh[0].n=__savedJunctionMesh[1]')
    page.evaluate('__calibrationCamera=null');report['drives']={}
    def follow(name,path):
        page.evaluate("""path=>{
          __car.x=path[0][0];__car.z=path[0][1];__car.v=0;__car.steer=0;
          window.__junctionFollow={goal:1,done:false};
          window.__junctionTimer=setInterval(()=>{
            const s=__junctionFollow;
            while(s.goal<path.length&&Math.hypot(__car.x-path[s.goal][0],__car.z-path[s.goal][1])<.42)s.goal++;
            if(s.goal===path.length){document.dispatchEvent(new KeyboardEvent('keyup',{key:'w',code:'KeyW',bubbles:true}));__car.v=0;s.done=true;clearInterval(__junctionTimer);return;}
            const p=path[s.goal];__car.heading=Math.atan2(p[0]-__car.x,__car.z-p[1]);__car.steer=0;
          },30);
        }""",path)
        page.keyboard.down('w')
        try:
            page.wait_for_function('__junctionFollow.done',timeout=90000)
        except Exception:
            print('stalled:',name,page.evaluate('[__car.x,__car.z,__junctionFollow]'),flush=True)
            raise
        finally:
            page.keyboard.up('w');page.evaluate('clearInterval(__junctionTimer);__car.v=0')
        end=page.evaluate('[__car.x,__car.z]');report['drives'][name]=dict(end=end,waypoints=len(path))
        assert math.dist(end,path[-1])<.65,(name,end);print('drive:',name,len(path),'waypoints',flush=True)
    paths=page.evaluate('[ParkKhutorokLane.eastWalk,ParkKhutorokToilet.southLink,ParkKhutorokToilet.southWalk,ParkKhutorokToilet.entranceApproach,ParkKhutorokLane.porchApproach]')
    for name,path in zip(['toilet_approach','south_link','south_walk','side_entrance','porch_gap'],paths):follow(name,path)
    report['fixtures']=[]
    for pos in page.evaluate('[ParkKhutorokToilet.hut.at,[154,-222],ParkKhutorokToilet.bin,[156.9,-220]]'):
        x,z=pos[:2];page.evaluate('p=>{__car.x=p[0];__car.z=p[1];__car.heading=0;__car.v=0;__car.steer=0}',[x,z])
        page.keyboard.down('w');page.wait_for_timeout(500);page.keyboard.up('w');page.evaluate('__car.v=0')
        end=page.evaluate('[__car.x,__car.z]');assert math.dist(end,[x,z])<.02,(pos,end);report['fixtures'].append(end)
    ready(page,'preview=khutorok-toilet&view=west')
    eye=page.evaluate('()=>{const d=__cam.dist*Math.cos(__cam.pitch);return [__car.x-Math.sin(__cam.yaw)*d,__car.z+Math.cos(__cam.yaw)*d]}')
    assert math.dist(eye,station)<.02,('reverse preview camera must stay west of the building',eye)
    page.screenshot(path=str(OUT/'khutorok-toilet-west-game.png'))
    ready(page,'preview=khutorok-toilet&view=entrance')
    assert math.dist(page.evaluate('[__car.x,__car.z]'),page.evaluate('ParkKhutorokToilet.entranceStation'))<.02
    assert abs(page.evaluate('__car.heading-ParkKhutorokToilet.entranceHeading'))<.01
    page.screenshot(path=str(OUT/'khutorok-toilet-side-entrance.png'))
    check(page);report['desktop']=page.evaluate('JSON.parse(JSON.stringify(__stats))');page.close()
    phone=browser.new_page(viewport={'width':390,'height':844},device_scale_factor=2,is_mobile=True,has_touch=True)
    phone.add_init_script(init);phone.on('pageerror',lambda e:errors.append(str(e)))
    ready(phone,'preview=khutorok-toilet')
    assert phone.locator('#pad [data-k="up"]').is_visible()
    assert phone.evaluate('document.documentElement.scrollWidth<=innerWidth')
    phone.screenshot(path=str(OUT/'khutorok-toilet-mobile.png'));check(phone)
    ready(phone,'preview=khutorok-toilet&view=entrance')
    phone.screenshot(path=str(OUT/'khutorok-toilet-mobile-entrance.png'));check(phone)
    report['mobile']=phone.evaluate('JSON.parse(JSON.stringify(__stats))');browser.close()
assert not errors,errors
report['errors']=errors;(OUT/'validation.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({'output':str(OUT),'station':station,'views':views,'pixel_controls':report['pixel_controls'],'drives':report['drives'],'errors':errors},indent=2))

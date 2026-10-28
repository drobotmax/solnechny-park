"""Verify the rear memorial loop, seating pocket and streamed garden in Chrome."""
import io
import json
import os
from pathlib import Path
from PIL import Image, ImageChops, ImageStat
from playwright.sync_api import sync_playwright

BASE=os.environ.get('PARK_URL','http://127.0.0.1:8791')
OUT=Path(os.environ.get('PARK_GARDEN_OUT','tasks/2026-10-28-yesenin-garden/validation'))
OUT.mkdir(parents=True,exist_ok=True)
errors=[];report={}
views={'north':(115.7,-222.4,.37),'cafe':(115.7,-222.4,1.15),
       'south':(115.7,-222.4,2.86),'seats':(114.5,-223.2,-1.40),
       'memorial':(113,-218,-.78),'layout':(110,-191,0)}
init="""let streaming;Object.defineProperty(window,'ParkStreaming',{get(){return streaming},set(v){
 const Original=v.Stream;v.Stream=function(...args){const s=new Original(...args);if(args[0].some(e=>e.kind==='yeseninGarden'))window.__gardenMeshes=s;return s;};v.Stream.prototype=Original.prototype;streaming=v;}});"""

def ready(page,query):
    page.goto(BASE+'/park.html?'+query+'&grain=0&sound=0')
    page.wait_for_function('window.__stats?.car&&__stats.streaming.pending===0&&window.__gardenMeshes?.pending.size===0',timeout=90000)
    page.wait_for_timeout(700)
    assert page.locator('#status').is_hidden()

def check(page):
    state=page.evaluate("()=>{const g=document.querySelector('#c').getContext('webgl2');return {gl:g.getError(),lost:g.isContextLost(),failed:__stats.streaming.failures}}")
    assert state==dict(gl=0,lost=False,failed=0),state

with sync_playwright() as p:
    browser=p.chromium.launch(channel='chrome',headless=True)
    page=browser.new_page(viewport={'width':1440,'height':900});page.add_init_script(init)
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.on('response',lambda r:errors.append(f'{r.status} {r.url}') if r.status>=400 else None)
    ready(page,'calibrate=1&x=115.7&z=-222.4&heading=.37')
    frames={}
    for name,(x,z,h) in views.items():
        page.evaluate('p=>__calibrationCamera=p',dict(x=x,z=z,y=31 if name=='layout' else 1.72,heading=h,pitch=-.80 if name=='layout' else 0))
        page.wait_for_timeout(250)
        frames[name]=Image.open(io.BytesIO(page.locator('#c').screenshot())).convert('RGB')
        frames[name].save(OUT/f'yesenin-garden-{name}.png');print('captured:',name,flush=True)
    page.evaluate('p=>__calibrationCamera=p',dict(x=114.5,z=-223.2,y=1.72,heading=-1.40,pitch=0))
    page.evaluate("()=>{const m=__gardenMeshes.resident.get('yesenin-garden').value;window.__savedGardenMesh=[m,m.n];m.n=0}")
    page.wait_for_timeout(200);hidden=Image.open(io.BytesIO(page.locator('#c').screenshot())).convert('RGB')
    report['pixel_control']=sum(ImageStat.Stat(ImageChops.difference(frames['seats'],hidden)).mean)/3
    assert report['pixel_control']>1,report['pixel_control']
    page.evaluate('__savedGardenMesh[0].n=__savedGardenMesh[1];__calibrationCamera=null')
    report['drives']={}
    def follow(name,path):
        page.evaluate("""path=>{
          __car.x=path[0][0];__car.z=path[0][1];__car.v=0;__car.steer=0;
          window.__gardenFollow={goal:1,done:false,start:[__car.x,__car.z]};
          window.__gardenTimer=setInterval(()=>{
            const s=__gardenFollow;
            while(s.goal<path.length&&Math.hypot(__car.x-path[s.goal][0],__car.z-path[s.goal][1])<.42)s.goal++;
            if(s.goal===path.length){s.done=true;clearInterval(__gardenTimer);return;}
            const p=path[s.goal];__car.heading=Math.atan2(p[0]-__car.x,__car.z-p[1]);__car.steer=0;
          },30);
        }""",path)
        page.keyboard.down('w')
        try:
            page.wait_for_function('__gardenFollow.done',timeout=90000)
        except Exception:
            print('stalled:',name,page.evaluate('[__car.x,__car.z,__gardenFollow]'),flush=True)
            raise
        finally:
            page.keyboard.up('w');page.evaluate('clearInterval(__gardenTimer);__car.v=0')
        end=page.evaluate('[__car.x,__car.z]');report['drives'][name]=dict(end=end,waypoints=len(path))
        assert abs(end[0]-path[-1][0])<.6 and abs(end[1]-path[-1][1])<.6,(name,end)
        print('drive:',name,len(path),'waypoints',flush=True)
    for name,path in zip(['east_curve','memorial_rear','west_curve','south_join'],page.evaluate('ParkYeseninGarden.paths')):
        follow(name,path)
    follow('seat_access',[[106.2,-224.6],[106.2,-223.0]])
    follow('accepted_gate_bypass',page.evaluate('ParkKhutorok.bypass'))
    report['fixtures']=[]
    for pos in page.evaluate('[...ParkYeseninGarden.benches,ParkYeseninGarden.bicycle.at,ParkYeseninGarden.thickets[1],ParkYeseninGarden.groves[0],ParkYeseninGarden.bin]'):
        x,z=pos[:2];page.evaluate('p=>{__car.x=p[0];__car.z=p[1];__car.heading=0;__car.v=0;__car.steer=0}',[x,z])
        page.keyboard.down('w');page.wait_for_timeout(500);page.keyboard.up('w');page.evaluate('__car.v=0')
        end=page.evaluate('[__car.x,__car.z]');assert abs(end[0]-x)<.02 and abs(end[1]-z)<.02,(pos,end)
        report['fixtures'].append(end)
    check(page);report['desktop']=page.evaluate('JSON.parse(JSON.stringify(__stats))')
    phone=browser.new_page(viewport={'width':390,'height':844},device_scale_factor=2,is_mobile=True,has_touch=True)
    phone.add_init_script(init);phone.on('pageerror',lambda e:errors.append(str(e)))
    ready(phone,'preview=yesenin-garden')
    assert phone.evaluate('__game.mode')=='free'
    assert phone.locator('#free').is_hidden()
    assert phone.locator('#pad [data-k="up"]').is_visible()
    assert phone.evaluate('document.documentElement.scrollWidth<=innerWidth')
    phone.screenshot(path=str(OUT/'yesenin-garden-mobile.png'));check(phone)
    report['mobile']=phone.evaluate('JSON.parse(JSON.stringify(__stats))');browser.close()
assert not errors,errors
report['errors']=errors;(OUT/'validation.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({'output':str(OUT),'pixel_control':report['pixel_control'],'drives':report['drives'],'errors':errors},indent=2))

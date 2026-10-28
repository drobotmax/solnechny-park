"""Inspect the Yesenin cross path in Chrome and exercise its actual wheel collisions."""
import io
import json
import math
import os
from pathlib import Path
from PIL import Image, ImageChops, ImageStat
from playwright.sync_api import sync_playwright

BASE=os.environ.get('PARK_URL','http://127.0.0.1:8791')
OUT=Path(os.environ.get('PARK_YESENIN_ALLEY_OUT','tasks/2026-10-28-yesenin-side-alley/validation'))
OUT.mkdir(parents=True,exist_ok=True)
errors=[];report={}
views={'mural':(94,-242,-1.02),'terrace':(98,-244.5,-1.62),'east':(85,-243.8,1.60),
       'memorial':(99,-245,3.04),'return':(68,-242.9,1.65),'layout':(105,-225,-.75)}
init="""let streaming;Object.defineProperty(window,'ParkStreaming',{get(){return streaming},set(v){
 const Original=v.Stream;v.Stream=function(...args){const s=new Original(...args);if(args[0].some(e=>e.id==='b68'))window.__alleyMeshes=s;return s;};v.Stream.prototype=Original.prototype;streaming=v;}});"""

def ready(page,query):
    page.goto(BASE+'/park.html?'+query+'&grain=0&sound=0')
    page.wait_for_function('window.__stats?.car&&__stats.streaming.pending===0&&window.__alleyMeshes?.pending.size===0',timeout=90000)
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
    ready(page,'calibrate=1&x=94&z=-244.4&heading=-.95')
    frames={}
    for name,(x,z,h) in views.items():
        page.evaluate('p=>__calibrationCamera=p',dict(x=x,z=z,y=25 if name=='layout' else 1.72,heading=h,pitch=-.80 if name=='layout' else 0));page.wait_for_timeout(250)
        frames[name]=Image.open(io.BytesIO(page.locator('#c').screenshot())).convert('RGB');frames[name].save(OUT/f'yesenin-alley-{name}.png')
        print('captured:',name,flush=True)
    x,z,h=views['mural'];page.evaluate('p=>__calibrationCamera=p',dict(x=x,z=z,y=1.72,heading=h,pitch=0))
    page.evaluate("()=>{const m=__alleyMeshes.resident.get('b68').value;window.__savedAlleyMesh=[m,m.n];m.n=0}")
    page.wait_for_timeout(200)
    hidden=Image.open(io.BytesIO(page.locator('#c').screenshot())).convert('RGB')
    report['pavilion_pixel_delta']=sum(ImageStat.Stat(ImageChops.difference(frames['mural'],hidden)).mean)/3
    assert report['pavilion_pixel_delta']>3,report
    page.evaluate('__savedAlleyMesh[0].n=__savedAlleyMesh[1];__calibrationCamera=null')
    report['desktop']=page.evaluate('JSON.parse(JSON.stringify(__stats))');check(page)
    report['drives']={}
    def drive(name,x,z,h,length=2,blocked=False):
        page.evaluate('p=>{__car.x=p.x;__car.z=p.z;__car.heading=p.h;__car.v=0;__car.steer=0}',dict(x=x,z=z,h=h))
        page.keyboard.down('w')
        try:
            if blocked:page.wait_for_timeout(650)
            else:page.wait_for_function(f'Math.hypot(__car.x-({x}),__car.z-({z}))>{length}',timeout=20000)
        finally:page.keyboard.up('w')
        page.evaluate('__car.v=0');end=page.evaluate('[__car.x,__car.z]');distance=math.dist([x,z],end)
        report['drives'][name]=dict(metres=distance,end=end)
        print('drive:',name,round(distance,2),flush=True)
        assert distance<.02 if blocked else distance>=length,(name,end,distance)
    paths=page.evaluate('[ParkAvenueJunction.eastPath,ParkAvenueJunction.memorialApproach]')
    for j,path in enumerate(paths):
        for i,(a,b) in enumerate(zip(path,path[1:])):
            drive(f'path_{j}_{i}',*a,math.atan2(b[0]-a[0],a[1]-b[1]),math.dist(a,b)-.35)
    fixtures=page.evaluate("[ParkAvenueJunction.facadePlanters[2].slice(0,2),ParkScannedLandmarks.world(...ParkScannedLandmarks.yesenin.lamp)]")
    for i,pos in enumerate(fixtures):drive(f'fixture_{i}',*pos,0,blocked=True)
    check(page)
    phone=browser.new_page(viewport={'width':390,'height':844},device_scale_factor=2,is_mobile=True,has_touch=True)
    phone.add_init_script(init);phone.on('pageerror',lambda e:errors.append(str(e)))
    ready(phone,'preview=yesenin-alley')
    assert phone.locator('#pad [data-k="up"]').is_visible()
    assert phone.evaluate('document.documentElement.scrollWidth<=innerWidth')
    phone.screenshot(path=str(OUT/'yesenin-alley-mobile.png'));check(phone)
    report['mobile']=phone.evaluate('JSON.parse(JSON.stringify(__stats))');browser.close()
assert not errors,errors
report['errors']=errors;(OUT/'validation.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({'output':str(OUT),'pavilion_pixel_delta':report['pavilion_pixel_delta'],'drives':report['drives'],'errors':errors},indent=2))

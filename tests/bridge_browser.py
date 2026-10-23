"""Check the continuous bridge carriageway against the delivered WebGL scene."""
import io
import json
import math
import os
import tempfile
from pathlib import Path

from PIL import Image, ImageChops, ImageStat
from playwright.sync_api import sync_playwright

base=os.environ.get('PARK_URL','http://127.0.0.1:8791')
out=Path(os.environ.get('PARK_BRIDGE_OUT',tempfile.mkdtemp(prefix='park-bridge-')))
out.mkdir(parents=True,exist_ok=True)
errors=[];report={}

def ready(page,query='preview=bridge&grain=0&sound=0'):
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto(base+'/park.html?'+query)
    page.wait_for_function('window.__stats?.car && __stats.streaming.pending===0',timeout=90000)
    page.wait_for_timeout(1600)
    assert page.locator('#status').is_hidden()

def frame(page):
    return Image.open(io.BytesIO(page.locator('#c').screenshot())).convert('RGB')

def check_gl(page):
    state=page.evaluate("""() => {const gl=document.querySelector('#c').getContext('webgl2');
      return {error:gl.getError(),lost:gl.isContextLost(),failures:__stats.streaming.failures};}""")
    assert state=={'error':0,'lost':False,'failures':0},state

def pose(page,view):
    page.evaluate('p=>__calibrationCamera=p',view);page.wait_for_timeout(250)

with sync_playwright() as p:
    browser=p.chromium.launch(channel='chrome',headless=True)
    page=browser.new_page(viewport={'width':1440,'height':900})
    ready(page,'calibrate=1&x=8.5&z=-430&heading=-.205&grain=0&sound=0')
    data=page.evaluate("""async()=>{
      const park=await(await fetch('park/park.json')).json(),f=ParkMeshes.bridgeFrame();
      let closest=100;
      for(const e of ParkMeshes.bridgeEntries(park)){
        const g=ParkMeshes.build(e);
        for(let i=0;i<g.data.length;i+=10)closest=Math.min(closest,Math.abs(f.local(g.data[i],g.data[i+2]).l));
      }
      return {length:f.length,dx:f.dx,dz:f.dz,origin:f.a,closestFurniture:closest};
    }""")
    report['geometry']=data;assert data['closestFurniture']>=2.9999,data
    dx,dz=data['dx'],data['dz'];a=data['origin'];length=data['length']
    north=math.atan2(-dx,dz);south=math.atan2(dx,-dz)
    def point(s,l=0):return [a[0]+dx*s+dz*l,a[1]+dz*s-dx*l]
    x,z=point(length+3)
    poses={
        'entrance':{'x':x,'z':z,'y':3.7,'heading':north,'pitch':.015},
        'deck':dict(zip(['x','z'],point(length/2)))|{'y':3.65,'heading':north,'pitch':-.04},
        'overview':{'x':21,'z':-422,'y':24,'heading':north-.18,'pitch':-.65},
        'city':dict(zip(['x','z'],point(-3)))|{'y':1.7,'heading':south,'pitch':.04},
    }
    for name,view in poses.items():
        pose(page,view);page.screenshot(path=str(out/('bridge-'+name+'.png')))
    pose(page,poses['entrance']);actual=frame(page);check_gl(page)

    control=browser.new_page(viewport={'width':1440,'height':900})
    control.add_init_script("""let meshes;Object.defineProperty(window,'ParkMeshes',{
      get(){return meshes;},set(value){const build=value.build;value.build=e=>e.kind==='bridgeRails'?
      {data:new Float32Array(0),n:0,center:[e.cx,5,e.cz],radius:100}:build(e);meshes=value;}});""")
    ready(control,'calibrate=1&x=8.5&z=-430&heading=-.205&grain=0&sound=0');pose(control,poses['entrance'])
    roi=(190,360,1250,770)
    report['rails_control_rgb_delta']=sum(ImageStat.Stat(ImageChops.difference(actual.crop(roi),frame(control).crop(roi))).mean)/3
    assert report['rails_control_rgb_delta']>3,report
    control.close()

    ready(page);report['physics']={}
    assert page.evaluate('__stats.car.cat')==3,'the bridge preview starts on continuous asphalt'
    def drive(name,s,l,heading,blocked=False):
        x,z=point(s,l)
        page.evaluate('p=>{__car.x=p.x;__car.z=p.z;__car.heading=p.h;__car.v=0;__car.steer=0;}',{'x':x,'z':z,'h':heading})
        page.keyboard.down('w');page.wait_for_timeout(500);page.keyboard.up('w')
        state=page.evaluate('({x:__car.x,z:__car.z,y:__stats.car.y,cat:__stats.car.cat})')
        moved=math.dist([x,z],[state['x'],state['z']]);report['physics'][name]={'metres':moved,**state}
        assert moved<.01 if blocked else moved>.1,(name,moved)
        return state
    for s in [1,8,length/2,length-8,length-1,length+3,length+12,length+24]:
        for l in [-2.1,0,2.1]:
            for heading,direction in [(north,'city'),(south,'park')]:
                drive(f'road_{s:.1f}_{l}_{direction}',s,l,heading)
    for side in [-1,1]:
        state=drive(f'sidewalk_{side}',length/2,side*3.85,south)
        assert abs(state['y']-2.205)<.03,state
        drive(f'inner_guard_{side}',length/2,side*3.1,south,True)
        drive(f'outer_guard_{side}',length/2,side*4.6,south,True)
        drive(f'water_{side}',length/2,side*6,south,True)
    check_gl(page)

    ready(page);page.screenshot(path=str(out/'bridge-preview.png'))
    for palette in ['pico8','gameboy','cga','mono','accent','source']:
        page.select_option('#palette',palette);page.wait_for_timeout(70);check_gl(page)
    daylight=sum(ImageStat.Stat(frame(page)).mean)
    page.locator('#night').check();page.wait_for_timeout(120);check_gl(page)
    assert sum(ImageStat.Stat(frame(page)).mean)<daylight*.4
    page.locator('#night').uncheck()
    mobile=browser.new_context(viewport={'width':390,'height':844},device_scale_factor=3,is_mobile=True,has_touch=True)
    phone=mobile.new_page();ready(phone)
    assert phone.locator('#pad [data-k="up"]').is_visible()
    assert phone.evaluate('document.documentElement.scrollWidth<=innerWidth')
    phone.screenshot(path=str(out/'bridge-mobile.png'));check_gl(phone)
    report['mobile']=phone.evaluate('JSON.parse(JSON.stringify(__stats))')
    mobile.close();page.close();browser.close()
assert not errors,errors
report['page_errors']=errors
(out/'validation.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2))

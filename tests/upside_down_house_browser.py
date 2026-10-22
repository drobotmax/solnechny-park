"""Check the upside-down house in native Chrome through the actual WebGL scene."""
import io
import json
import math
import os
import tempfile
from pathlib import Path

from PIL import Image, ImageChops, ImageStat
from playwright.sync_api import sync_playwright

base=os.environ.get('PARK_URL','http://127.0.0.1:8791')
out=Path(os.environ.get('PARK_HOUSE_OUT',tempfile.mkdtemp(prefix='park-upside-down-')))
out.mkdir(parents=True,exist_ok=True)
report={};errors=[]
query='calibrate=1&x=-42&z=-372&heading=-.396&sound=0&grain=0'
pose='__calibrationCamera={x:-42,z:-372,y:1.7,heading:-.396,pitch:.12}'

def ready(page,url):
    page.goto(base+'/park.html?'+url)
    page.wait_for_function('window.__stats?.car && __stats.streaming.pending===0',timeout=90000)
    page.wait_for_timeout(2200)
    assert page.locator('#status').is_hidden()

def check_gl(page):
    state=page.evaluate("""() => {
      const gl=document.querySelector('#c').getContext('webgl2');
      return {error:gl.getError(),lost:gl.isContextLost()};
    }""")
    assert state=={'error':0,'lost':False},state

def frame(page):
    return Image.open(io.BytesIO(page.locator('#c').screenshot())).convert('RGB')

def roof_fraction(image):
    pixels=list(image.getdata())
    return sum(r>95 and r>g*1.8 and g>b*1.25 for r,g,b in pixels)/len(pixels)

def preview_roof(page):
    image=frame(page);w,h=image.size
    return roof_fraction(image.crop((int(w*.22),int(h*.2),int(w*.78),int(h*.7))))

with sync_playwright() as p:
    browser=p.chromium.launch(channel='chrome',headless=True)
    page=browser.new_page(viewport={'width':1440,'height':900})
    page.on('pageerror',lambda e:errors.append(str(e)))
    ready(page,query);page.evaluate(pose);page.wait_for_timeout(300)
    check_gl(page)
    assert page.evaluate('__stats.fps')>=24
    original=frame(page)
    page.screenshot(path=str(out/'upside-down-house-front.png'))
    report['front_stats']=page.evaluate('JSON.parse(JSON.stringify(__stats))')

    # Removing only this model must remove the photographed red roof from the frame.
    control=browser.new_page(viewport={'width':1440,'height':900})
    control.on('pageerror',lambda e:errors.append(str(e)))
    control.add_init_script("""
      let houseModule;
      Object.defineProperty(window,'ParkUpsideDownHouse',{
        get(){return houseModule;},set(value){
          value.build=(g,e)=>g.box(e.cx,0,e.cz,.1,.1,.1,[.2,.2,.2],0);
          houseModule=value;
        }
      });
    """)
    ready(control,query);control.evaluate(pose);control.wait_for_timeout(300)
    region=(500,470,970,675)
    roof=original.crop(region);empty=frame(control).crop(region)
    delta=sum(ImageStat.Stat(ImageChops.difference(roof,empty)).mean)/3
    report['render_control']={'rgb_delta':delta,'roof_fraction':roof_fraction(roof),'empty_fraction':roof_fraction(empty)}
    assert delta>15 and roof_fraction(roof)>.12 and roof_fraction(empty)<.01,report['render_control']
    control.close()

    page.evaluate('__calibrationCamera={x:-28,z:-376,y:1.8,heading:-.92,pitch:.08}')
    page.wait_for_timeout(450)
    page.screenshot(path=str(out/'upside-down-house-side.png'))
    page.evaluate('__calibrationCamera={x:-15,z:-362,y:18,heading:-.94,pitch:-.35}')
    page.wait_for_timeout(450)
    page.screenshot(path=str(out/'upside-down-house-overview.png'))
    page.evaluate("document.body.classList.remove('calibration')")
    for palette in ['pico8','accent','source']:
        page.select_option('#palette',palette);page.wait_for_timeout(80);check_gl(page)
    day=sum(ImageStat.Stat(frame(page)).mean)
    page.locator('#night').check();page.wait_for_timeout(160);check_gl(page)
    assert sum(ImageStat.Stat(frame(page)).mean)<day*.4
    page.locator('#night').uncheck()

    ready(page,'preview=upside-down-house&sound=0&grain=0')
    assert page.evaluate('__game.mode')=='free'
    report['desktop_preview_roof_fraction']=preview_roof(page)
    assert report['desktop_preview_roof_fraction']>.003,'preview camera must see the roof, not a neighbouring wall'
    start=page.evaluate('[__car.x,__car.z]')
    page.keyboard.down('w');page.wait_for_timeout(700);page.keyboard.up('w')
    end=page.evaluate('[__car.x,__car.z]')
    assert math.dist(start,end)>.1
    report['preview_moved_metres']=math.dist(start,end)
    check_gl(page)

    report['collision_rotation']={}
    for name,x,z,heading,blocked in [('freed_corner',-53.2,-390.6,-.95,False),('rotated_corner',-50.4,-384,-.95,True)]:
        page.evaluate('p=>{__car.x=p.x;__car.z=p.z;__car.heading=p.h;__car.v=0;__car.steer=0;}',{'x':x,'z':z,'h':heading})
        page.keyboard.down('w');page.wait_for_timeout(700);page.keyboard.up('w')
        travelled=math.dist([x,z],page.evaluate('[__car.x,__car.z]'))
        report['collision_rotation'][name]=travelled
        assert travelled<.01 if blocked else travelled>.1,(name,travelled)

    mobile=browser.new_context(viewport={'width':390,'height':844},device_scale_factor=3,is_mobile=True,has_touch=True)
    phone=mobile.new_page();phone.on('pageerror',lambda e:errors.append(str(e)))
    ready(phone,'preview=upside-down-house&sound=0&grain=0')
    assert phone.evaluate("document.querySelector('#c').width")==585
    assert phone.locator('#pad [data-k="up"]').is_visible()
    assert phone.evaluate('document.documentElement.scrollWidth<=innerWidth')
    report['mobile_preview_roof_fraction']=preview_roof(phone)
    assert report['mobile_preview_roof_fraction']>.003,'portrait preview must show the actual red roof'
    phone.screenshot(path=str(out/'upside-down-house-mobile.png'))
    report['mobile_stats']=phone.evaluate('JSON.parse(JSON.stringify(__stats))')
    check_gl(phone)
    assert not errors,errors
    report['page_errors']=errors
    (out/'validation.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
    browser.close()
print(json.dumps({'screenshots':str(out),**report},ensure_ascii=False,indent=2))

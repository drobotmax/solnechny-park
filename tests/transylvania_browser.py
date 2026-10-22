"""Validate the reconstructed carriage ride through the shipped WebGL renderer."""
import io
import json
import math
import os
import tempfile
from pathlib import Path

from PIL import Image, ImageChops, ImageStat
from playwright.sync_api import sync_playwright

base=os.environ.get('PARK_URL','http://127.0.0.1:8791')
out=Path(os.environ.get('PARK_RIDE_OUT',tempfile.mkdtemp(prefix='park-transylvania-')))
out.mkdir(parents=True,exist_ok=True)
report={};errors=[]

def ready(page,query):
    page.goto(base+'/park.html?'+query)
    page.wait_for_function('window.__stats?.car && __stats.streaming.pending===0',timeout=90000)
    page.wait_for_timeout(2200)
    assert page.locator('#status').is_hidden()

def check_gl(page):
    status=page.evaluate("""() => {
      const gl=document.querySelector('#c').getContext('webgl2');
      return {error:gl.getError(),lost:gl.isContextLost()};
    }""")
    assert status=={'error':0,'lost':False},status

def frame(page):
    return Image.open(io.BytesIO(page.locator('#c').screenshot())).convert('RGB')

def painted_fraction(page):
    image=frame(page);w,h=image.size
    pixels=list(image.crop((int(w*.22),int(h*.2),int(w*.78),int(h*.7))).getdata())
    return sum(r>130 and g>85 and b<90 and r>g*1.1 and g>b*1.5 for r,g,b in pixels)/len(pixels)

query='calibrate=1&x=-22.5&z=-326&heading=1.7&sound=0&grain=0'
pose='__calibrationCamera={x:-22.5,z:-326,heading:1.7,y:1.9,pitch:.08}'

with sync_playwright() as p:
    browser=p.chromium.launch(channel='chrome',headless=True)
    page=browser.new_page(viewport={'width':1440,'height':900})
    page.on('pageerror',lambda e:errors.append(str(e)))
    ready(page,query);page.evaluate(pose);page.wait_for_timeout(300)
    check_gl(page)
    assert page.evaluate('__stats.fps')>=24
    original=frame(page)
    page.screenshot(path=str(out/'transylvania-front.png'))
    report['front_stats']=page.evaluate('JSON.parse(JSON.stringify(__stats))')

    # A broken/blank atlas must visibly change the real tower, not just a test canvas.
    control=browser.new_page(viewport={'width':1440,'height':900})
    control.on('pageerror',lambda e:errors.append(str(e)))
    control.add_init_script("""
      let rideModule;
      Object.defineProperty(window,'ParkTransylvania',{
        get(){return rideModule;},set(value){
          const original=value.atlas;
          value.atlas=()=>{const cv=original(),c=cv.getContext('2d');
            c.fillStyle='#ff00ff';c.fillRect(0,0,512,768);return cv;};
          rideModule=value;
        }
      });
    """)
    ready(control,query);control.evaluate(pose);control.wait_for_timeout(300)
    region=(640,312,800,430)
    delta=sum(ImageStat.Stat(ImageChops.difference(original.crop(region),frame(control).crop(region))).mean)/3
    assert delta>20,('tower atlas was not actually sampled by the GPU',delta)
    report['atlas_control_mean_delta']=delta
    control.close()

    page.evaluate('__calibrationCamera={x:-4,z:-284,y:16,heading:-.51,pitch:-.26}')
    page.wait_for_timeout(700)
    page.screenshot(path=str(out/'transylvania-overview.png'))
    page.evaluate("document.body.classList.remove('calibration')")
    for palette in ['pico8','accent','source']:
        page.select_option('#palette',palette);page.wait_for_timeout(80);check_gl(page)
    day=sum(ImageStat.Stat(frame(page)).mean)
    page.locator('#night').check();page.wait_for_timeout(160);check_gl(page)
    assert sum(ImageStat.Stat(frame(page)).mean)<day*.4
    page.locator('#night').uncheck()

    ready(page,'preview=transylvania&sound=0&grain=0')
    assert page.evaluate('__game.mode')=='free'
    report['desktop_preview_painted_fraction']=painted_fraction(page)
    assert report['desktop_preview_painted_fraction']>.003,'desktop camera must show the painted ride, not a wall'
    start=page.evaluate('[__car.x,__car.z]')
    page.keyboard.down('w');page.wait_for_timeout(700);page.keyboard.up('w')
    end=page.evaluate('[__car.x,__car.z]')
    assert math.dist(start,end)>.1,'ride preview must start on navigable ground'
    report['preview_moved_metres']=math.dist(start,end)
    check_gl(page)

    mobile=browser.new_context(viewport={'width':390,'height':844},device_scale_factor=3,is_mobile=True,has_touch=True)
    phone=mobile.new_page();phone.on('pageerror',lambda e:errors.append(str(e)))
    ready(phone,'preview=transylvania&sound=0&grain=0')
    assert phone.evaluate("document.querySelector('#c').width")==585
    assert phone.locator('#pad [data-k="up"]').is_visible()
    assert phone.evaluate('document.documentElement.scrollWidth<=innerWidth')
    report['mobile_preview_painted_fraction']=painted_fraction(phone)
    assert report['mobile_preview_painted_fraction']>.003,'mobile camera must show the painted ride, not a wall'
    phone.screenshot(path=str(out/'transylvania-mobile.png'))
    check_gl(phone)
    report['mobile_stats']=phone.evaluate('JSON.parse(JSON.stringify(__stats))')
    phone.evaluate('__car.x=-22.7;__car.z=-326;__car.heading=1.7;__car.v=0;__cam.yaw=1.7;__cam.orbit=0;__cam.dist=11')
    phone.wait_for_timeout(300)
    report['blocked_camera_control_painted_fraction']=painted_fraction(phone)
    assert report['blocked_camera_control_painted_fraction']<.003,'the visibility probe must reject the former camera inside the ticket office'
    phone.screenshot(path=str(out/'transylvania-blocked-camera-control.png'))
    assert not errors,errors
    report['page_errors']=errors
    (out/'validation.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
    browser.close()
print(json.dumps({'screenshots':str(out),**report},ensure_ascii=False,indent=2))

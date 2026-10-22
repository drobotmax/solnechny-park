"""Verify the waterfront changes through the shipped WebGL scene and physics."""
import io
import json
import math
import os
import tempfile
from pathlib import Path

from PIL import Image, ImageChops, ImageStat
from playwright.sync_api import sync_playwright

base=os.environ.get('PARK_URL','http://127.0.0.1:8791')
out=Path(os.environ.get('PARK_SHORE_OUT',tempfile.mkdtemp(prefix='park-house-shore-')))
out.mkdir(parents=True,exist_ok=True)
report={};errors=[]
poses={
    'front':{'x':-42,'z':-372,'y':1.7,'heading':-.396,'pitch':.12},
    'right':{'x':-29,'z':-384,'y':1.7,'heading':-.99,'pitch':.09},
    'police':{'x':-54,'z':-372,'y':1.7,'heading':-.29,'pitch':.015},
    'overview':{'x':-17,'z':-365,'y':23,'heading':-.90,'pitch':-.50},
}

def ready(page,query='calibrate=1&x=-42&z=-372&heading=-.396&sound=0&grain=0'):
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto(base+'/park.html?'+query)
    page.wait_for_function('window.__stats?.car && __stats.streaming.pending===0',timeout=90000)
    page.wait_for_timeout(2200)
    assert page.locator('#status').is_hidden()

def pose(page,name):
    page.evaluate('p=>{__calibrationCamera=p;}',poses[name]);page.wait_for_timeout(350)

def frame(page):
    return Image.open(io.BytesIO(page.locator('#c').screenshot())).convert('RGB')

def check_gl(page):
    state=page.evaluate("""() => {const gl=document.querySelector('#c').getContext('webgl2');
      return {error:gl.getError(),lost:gl.isContextLost(),failures:__stats.streaming.failures};}""")
    assert state=={'error':0,'lost':False,'failures':0},state

with sync_playwright() as p:
    browser=p.chromium.launch(channel='chrome',headless=True)
    page=browser.new_page(viewport={'width':1440,'height':900});ready(page)
    originals={}
    for name in poses:
        pose(page,name);originals[name]=frame(page);page.screenshot(path=str(out/('shore-'+name+'.png')))
    check_gl(page)
    report['desktop']=page.evaluate('JSON.parse(JSON.stringify(__stats))')

    # Removing the new module's rendered geometry must change each object's pixels.
    # Keep its placement and ground corrections active to isolate the visible models.
    control=browser.new_page(viewport={'width':1440,'height':900})
    control.add_init_script("""
      let shoreModule;
      Object.defineProperty(window,'ParkHouseSurroundings',{
        get(){return shoreModule;},set(value){
          value.cabin=()=>{};value.stairs=()=>{};value.mooring=()=>{};shoreModule=value;
        }
      });
    """)
    ready(control);report['render_controls']={}
    regions={'police':('police',(560,374,928,621),20),
             'stairs':('front',(1000,440,1080,642),8),
             'ticket':('right',(440,455,655,645),20),
             'catamarans':('right',(955,526,1416,601),8)}
    for name,(view,roi,threshold) in regions.items():
        pose(control,view)
        delta=sum(ImageStat.Stat(ImageChops.difference(originals[view].crop(roi),frame(control).crop(roi))).mean)/3
        report['render_controls'][name]=delta
        assert delta>threshold,(name,delta,threshold)
    control.close()

    # Use the real stroller, not a duplicate of the raster collision function.
    ready(page,'preview=upside-down-house&sound=0&grain=0')
    report['physics']={}
    probes=[('old_left_hall',-63,-382,False),('old_right_hall',-27,-402.5,False),
            ('old_kiosk',-42.9,-395.4,False),('police',-56.7231,-382.0605,True),
            ('ticket',-40.2861,-388.7912,True),('stairs',-43.4802,-389.8475,True),
            ('unchanged_hall',-28,-362,True)]
    for name,x,z,blocked in probes:
        page.evaluate('p=>{__car.x=p.x;__car.z=p.z;__car.heading=0;__car.v=0;__car.steer=0;}',{'x':x,'z':z})
        page.keyboard.down('w');page.wait_for_timeout(700);page.keyboard.up('w')
        moved=math.dist([x,z],page.evaluate('[__car.x,__car.z]'))
        report['physics'][name]={'metres':moved,'category':page.evaluate('__stats.car.cat')}
        assert moved<.01 if blocked else moved>.1,(name,moved)
    check_gl(page)

    # The shared material program must still compile and render in every palette.
    ready(page);pose(page,'right');page.evaluate("document.body.classList.remove('calibration')")
    for palette in ['pico8','accent','source']:
        page.select_option('#palette',palette);page.wait_for_timeout(80);check_gl(page)
    day=sum(ImageStat.Stat(frame(page)).mean)
    page.locator('#night').check();page.wait_for_timeout(150);check_gl(page)
    assert sum(ImageStat.Stat(frame(page)).mean)<day*.4
    page.locator('#night').uncheck()

    mobile=browser.new_context(viewport={'width':390,'height':844},device_scale_factor=3,is_mobile=True,has_touch=True)
    phone=mobile.new_page();ready(phone,'preview=upside-down-house&sound=0&grain=0')
    assert phone.locator('#pad [data-k="up"]').is_visible()
    assert phone.evaluate('document.documentElement.scrollWidth<=innerWidth')
    assert phone.evaluate("document.querySelector('#c').width")==585
    phone.screenshot(path=str(out/'shore-mobile.png'));check_gl(phone)
    report['mobile']=phone.evaluate('JSON.parse(JSON.stringify(__stats))')
    assert not errors,errors
    report['page_errors']=errors
    (out/'validation.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
    browser.close()
print(json.dumps({'screenshots':str(out),**report},ensure_ascii=False,indent=2))

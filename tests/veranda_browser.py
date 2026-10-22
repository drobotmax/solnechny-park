"""Exercise Veranda's delivered WebGL models, preview and collision boundary."""
import io
import json
import math
import os
import tempfile
from pathlib import Path

from PIL import Image, ImageChops, ImageStat
from playwright.sync_api import sync_playwright

base=os.environ.get('PARK_URL','http://127.0.0.1:8791')
out=Path(os.environ.get('PARK_VERANDA_OUT',tempfile.mkdtemp(prefix='park-veranda-')))
out.mkdir(parents=True,exist_ok=True)
report={};errors=[]
poses={
    'front':{'x':49,'z':-391,'y':1.7,'heading':.15,'pitch':.12},
    'entrance':{'x':41,'z':-394,'y':1.7,'heading':.36,'pitch':.09},
    'gazebo':{'x':64,'z':-394,'y':1.7,'heading':.18,'pitch':.09},
    'overview':{'x':12,'z':-383,'y':22,'heading':1.0,'pitch':-.40},
}

def ready(page,query='calibrate=1&x=49&z=-391&heading=.15&grain=0&sound=0'):
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto(base+'/park.html?'+query)
    page.wait_for_function('window.__stats?.car && __stats.streaming.pending===0',timeout=90000)
    page.wait_for_timeout(2200)
    assert page.locator('#status').is_hidden()

def pose(page,name):
    page.evaluate('p=>__calibrationCamera=p',poses[name]);page.wait_for_timeout(350)

def frame(page):
    return Image.open(io.BytesIO(page.locator('#c').screenshot())).convert('RGB')

def check_gl(page):
    state=page.evaluate("""() => {const gl=document.querySelector('#c').getContext('webgl2');
      return {error:gl.getError(),lost:gl.isContextLost(),failures:__stats.streaming.failures};}""")
    assert state=={'error':0,'lost':False,'failures':0},state

def delta(a,b):
    return sum(ImageStat.Stat(ImageChops.difference(a,b)).mean)/3

def pink(image):
    pixels=list(image.getdata())
    return sum(r>90 and r>g*1.8 and b>g*1.2 for r,g,b in pixels)/len(pixels)

def suppress(page,kind):
    page.add_init_script("""
      let veranda;
      Object.defineProperty(window,'ParkVeranda',{
        get(){return veranda;},set(value){
          value.%s=(g,e)=>g.box(e.cx,0,e.cz,.1,.1,.1,[.2,.2,.2],0);veranda=value;
        }
      });
    """ % kind)

with sync_playwright() as p:
    browser=p.chromium.launch(channel='chrome',headless=True)
    page=browser.new_page(viewport={'width':1440,'height':900});ready(page)
    originals={}
    for name in poses:
        pose(page,name);originals[name]=frame(page);page.screenshot(path=str(out/('veranda-'+name+'.png')))
    check_gl(page);report['desktop']=page.evaluate('JSON.parse(JSON.stringify(__stats))')

    control=browser.new_page(viewport={'width':1440,'height':900});suppress(control,'main');ready(control);pose(control,'entrance')
    no_main=frame(control);entry_roi=(560,370,1060,740);bike_roi=(530,565,740,718)
    report['main_control_rgb_delta']=delta(originals['entrance'].crop(entry_roi),no_main.crop(entry_roi))
    report['bicycle_pink']={'actual':pink(originals['entrance'].crop(bike_roi)),'control':pink(no_main.crop(bike_roi))}
    assert report['main_control_rgb_delta']>20,report
    assert report['bicycle_pink']['actual']>.012 and report['bicycle_pink']['control']<.003,report['bicycle_pink']
    control.close()
    control=browser.new_page(viewport={'width':1440,'height':900});suppress(control,'gazebo');ready(control);pose(control,'gazebo')
    roi=(330,320,1250,730)
    report['gazebo_control_rgb_delta']=delta(originals['gazebo'].crop(roi),frame(control).crop(roi))
    assert report['gazebo_control_rgb_delta']>12,report['gazebo_control_rgb_delta']
    control.close()

    # Drive the real stroller across the gate plane and against the solid fence.
    ready(page,'preview=veranda&grain=0&sound=0')
    assert page.evaluate('__game.mode')=='free'
    page.screenshot(path=str(out/'veranda-preview.png'));report['physics']={}
    probes=page.evaluate("""async () => {
      const park=await (await fetch('park/park.json')).json(),entries=ParkMeshes.entries(park);
      const e=entries.find(e=>e.kind==='veranda'),g=entries.find(e=>e.kind==='verandaGazebo');
      const f=ParkVeranda.frame(e),gf=ParkVeranda.frame(g),p=(name,q,blocked,heading=0)=>({name,x:q[0],z:q[2],blocked,heading});
      const gate=ParkVeranda.entrance(),q=gate.at(0,0,0),end=gate.at(1.65,0,0);
      const heading=Math.atan2((f.right[0]-f.front[0])*Math.SQRT1_2,(-f.right[1]+f.front[1])*Math.SQRT1_2);
      return [p('floral_gate',f.at(...q),false,heading),p('diagonal_fence',f.at(...end),true,heading),p('picket_fence',f.at(5,0,3.62),true),
        p('gazebo_freed_corner',gf.at(.4,0,-.9),false),p('cafe_body',[e.cx,0,e.cz],true),
        p('gazebo_body',[g.cx,0,g.cz],true)];
    }""")
    for probe in probes:
        page.evaluate('p=>{__car.x=p.x;__car.z=p.z;__car.heading=p.heading;__car.v=0;__car.steer=0;}',probe)
        page.keyboard.down('w');page.wait_for_timeout(700);page.keyboard.up('w')
        moved=math.dist([probe['x'],probe['z']],page.evaluate('[__car.x,__car.z]'))
        report['physics'][probe['name']]={'metres':moved,'category':page.evaluate('__stats.car.cat')}
        assert moved<.01 if probe['blocked'] else moved>.1,(probe,moved)
    check_gl(page)

    ready(page);pose(page,'entrance');page.evaluate("document.body.classList.remove('calibration')")
    for palette in ['pico8','gameboy','cga','mono','accent','source']:
        page.select_option('#palette',palette);page.wait_for_timeout(80);check_gl(page)
    day=sum(ImageStat.Stat(frame(page)).mean)
    page.locator('#night').check();page.wait_for_timeout(150);check_gl(page)
    assert sum(ImageStat.Stat(frame(page)).mean)<day*.4
    page.locator('#night').uncheck()

    mobile=browser.new_context(viewport={'width':390,'height':844},device_scale_factor=3,is_mobile=True,has_touch=True)
    phone=mobile.new_page();ready(phone,'preview=veranda&grain=0&sound=0')
    assert phone.locator('#pad [data-k="up"]').is_visible()
    assert phone.evaluate('document.documentElement.scrollWidth<=innerWidth')
    assert phone.evaluate("document.querySelector('#c').width")==585
    actual=frame(phone);phone.screenshot(path=str(out/'veranda-mobile.png'));check_gl(phone)
    report['mobile']=phone.evaluate('JSON.parse(JSON.stringify(__stats))')
    blank=mobile.new_page();suppress(blank,'main');ready(blank,'preview=veranda&grain=0&sound=0')
    w,h=actual.size;roi=(int(w*.1),int(h*.26),int(w*.85),int(h*.56))
    report['mobile_model_control_delta']=delta(actual.crop(roi),frame(blank).crop(roi))
    assert report['mobile_model_control_delta']>12,'portrait camera must see the cafe, not a neighbouring wall'
    blank.close();mobile.close();page.close();browser.close()
    assert not errors,errors
    report['page_errors']=errors
    (out/'validation.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'screenshots':str(out),**report},ensure_ascii=False,indent=2))

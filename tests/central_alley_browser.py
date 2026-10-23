"""Compare the five panorama headings and exercise the actual avenue physics."""
import io
import json
import math
import os
import tempfile
from pathlib import Path
from PIL import Image,ImageChops,ImageStat
from playwright.sync_api import sync_playwright

base=os.environ.get('PARK_URL','http://127.0.0.1:8791')
out=Path(os.environ.get('PARK_ALLEY_OUT',tempfile.mkdtemp(prefix='central-alley-')));out.mkdir(parents=True,exist_ok=True)
errors=[];report={};headings=[-.20,.65,1.45,2.35,2.95]
def ready(page,query='calibrate=1&x=26&z=-334&heading=-.2&grain=0&sound=0'):
    page.on('pageerror',lambda e:errors.append(str(e)));page.goto(base+'/park.html?'+query)
    page.wait_for_function('window.__stats?.car&&__stats.streaming.pending===0',timeout=90000);page.wait_for_timeout(1800)
    assert page.locator('#status').is_hidden()
def pose(page,index):
    page.evaluate('h=>__calibrationCamera={x:26,z:-334,y:1.72,heading:h,pitch:0}',headings[index-1]);page.wait_for_timeout(220)
def frame(page):
    # Clip a real page capture to the canvas without Locator's RAF stability wait.
    rect=page.locator('#c').bounding_box();assert rect
    return Image.open(io.BytesIO(page.screenshot(clip=rect))).convert('RGB')
def check(page):
    v=page.evaluate("""()=>{const g=document.querySelector('#c').getContext('webgl2');return {error:g.getError(),lost:g.isContextLost(),failures:__stats.streaming.failures};}""")
    assert v=={'error':0,'lost':False,'failures':0},v
with sync_playwright() as p:
    browser=p.chromium.launch(channel='chrome',headless=True)
    page=browser.new_page(viewport={'width':1440,'height':900})
    # Reuse one visible canvas so controls do not retain background GPU contexts.
    page.add_init_script("""let alley;Object.defineProperty(window,'ParkCentralAlley',{get(){return alley;},set(value){const method=new URLSearchParams(location.search).get('omitAlley');if(method)value[method]=()=>{};alley=value;}});""")
    ready(page);originals={}
    for i in range(1,6):
        pose(page,i);originals[i]=frame(page);page.screenshot(path=str(out/f'avenue-{i}.png'))
    check(page);report['desktop']=page.evaluate('JSON.parse(JSON.stringify(__stats))')
    assert report['desktop']['fps']>=24,report['desktop']['fps']
    report['controls']={}
    for method,index in [('avenue',1),('toyCarousel',2),('carCarousel',3),('weddingCarousel',3),('arcade',3),('cafe',5)]:
        print('pixel control:',method,flush=True)
        ready(page,'calibrate=1&x=26&z=-334&heading=-.2&grain=0&sound=0&omitAlley='+method)
        pose(page,index);blank=frame(page);roi=(0,250,1440,820)
        diff=sum(ImageStat.Stat(ImageChops.difference(originals[index].crop(roi),blank.crop(roi))).mean)/3
        report['controls'][method]=diff;assert diff>.5,(method,diff)
        check(page)
    print('physics probes',flush=True)
    ready(page,'preview=central-alley&grain=0&sound=0');report['physics']={}
    for name,x,z,h,blocked in [
        ('avenue_north',26,-334,-.2,False),('avenue_south',32,-313,2.9,False),('cross_passage',53,-334.2,1.3,False),
        ('old_booth_corner',49,-322.5,0,False),('bed',14,-350,0,True),('cars',36.56,-338.83,0,True),
        ('parasol',32.01,-352.77,0,True),('wedding',44.43,-326.77,0,True),('cafe',60,-300,0,True),('flag',36.4,-315,0,True)]:
        page.evaluate('p=>{__car.x=p.x;__car.z=p.z;__car.heading=p.h;__car.v=0;__car.steer=0}',{'x':x,'z':z,'h':h})
        page.keyboard.down('w');page.wait_for_timeout(600);page.keyboard.up('w')
        moved=math.dist([x,z],page.evaluate('[__car.x,__car.z]'));report['physics'][name]={'metres':moved,'cat':page.evaluate('__stats.car.cat')}
        assert moved<.01 if blocked else moved>.1,(name,moved)
    check(page);ready(page,'preview=central-alley&grain=0&sound=0');page.screenshot(path=str(out/'avenue-preview.png'))
    for palette in ['pico8','gameboy','cga','mono','accent','source']:
        page.select_option('#palette',palette);page.wait_for_timeout(70);check(page)
    day=sum(ImageStat.Stat(frame(page)).mean);page.locator('#night').check();page.wait_for_timeout(120);check(page)
    assert sum(ImageStat.Stat(frame(page)).mean)<day*.4
    print('mobile preview',flush=True)
    mobile=browser.new_context(viewport={'width':390,'height':844},device_scale_factor=3,is_mobile=True,has_touch=True)
    phone=mobile.new_page();ready(phone,'preview=central-alley&grain=0&sound=0')
    assert phone.locator('#pad [data-k="up"]').is_visible();assert phone.evaluate('document.documentElement.scrollWidth<=innerWidth')
    phone.screenshot(path=str(out/'avenue-mobile.png'));check(phone);report['mobile']=phone.evaluate('JSON.parse(JSON.stringify(__stats))')
    mobile.close();page.close();browser.close()
assert not errors,errors
report['page_errors']=errors;(out/'validation.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))

"""Check the second panorama half, open ground level and full-turn continuity."""
import io,json,math,os,tempfile
from pathlib import Path
from PIL import Image,ImageChops,ImageStat
from playwright.sync_api import sync_playwright

base=os.environ.get('PARK_URL','http://127.0.0.1:8791')
out=Path(os.environ.get('PARK_WEST_OUT',tempfile.mkdtemp(prefix='central-west-')));out.mkdir(parents=True,exist_ok=True)
errors=[];report={};headings=[2.95,3.60,4.25,5.0,math.tau-.20]
def ready(page,extra=''):
    page.goto(base+'/park.html?calibrate=1&x=26&z=-334&heading=-.2&grain=0&sound=0'+extra)
    page.wait_for_function('window.__stats?.car&&__stats.streaming.pending===0',timeout=90000);page.wait_for_timeout(1600)
    assert page.locator('#status').is_hidden()
def pose(page,h):
    page.evaluate('h=>__calibrationCamera={x:26,z:-334,y:1.72,heading:h,pitch:0}',h);page.wait_for_timeout(200)
def kiosk_pose(page):
    page.evaluate('__calibrationCamera={x:8,z:-344,y:1.72,heading:5.45,pitch:0}');page.wait_for_timeout(200)
def frame(page):
    rect=page.locator('#c').bounding_box();assert rect
    return Image.open(io.BytesIO(page.screenshot(clip=rect))).convert('RGB')
def delta(a,b):return sum(ImageStat.Stat(ImageChops.difference(a,b)).mean)/3
def check(page):
    result=page.evaluate("""()=>{const g=document.querySelector('#c').getContext('webgl2');return {error:g.getError(),lost:g.isContextLost(),failures:__stats.streaming.failures};}""")
    assert result=={'error':0,'lost':False,'failures':0},result
with sync_playwright() as p:
    browser=p.chromium.launch(channel='chrome',headless=True)
    page=browser.new_page(viewport={'width':1440,'height':900});page.on('pageerror',lambda e:errors.append(str(e)))
    page.add_init_script("""let alley,mesh;Object.defineProperty(window,'ParkCentralAlley',{get(){return alley;},set(value){const method=new URLSearchParams(location.search).get('omitAlley');if(method)value[method]=()=>{};alley=value;}});Object.defineProperty(window,'ParkMeshes',{get(){return mesh;},set(value){const omit=new URLSearchParams(location.search).get('omitMesh'),build=value.build;value.build=e=>{const m=build(e);return e.id===omit?{...m,n:0,data:new Float32Array(0)}:m;};mesh=value;}});""")
    ready(page);originals={}
    for i,h in enumerate(headings,1):
        pose(page,h);originals[i]=frame(page);page.screenshot(path=str(out/f'west-{i}.png'))
    pose(page,-.20);report['full_turn_mean_delta']=delta(originals[5],frame(page));assert report['full_turn_mean_delta']<3
    report['desktop']=page.evaluate('JSON.parse(JSON.stringify(__stats))');assert report['desktop']['fps']>=24;check(page)
    kiosk_pose(page);kiosk_original=frame(page)
    report['controls']={}
    for method,index,param in [('westGarden',2,'omitAlley'),('airTrack',3,'omitAlley'),('kiddieCarousel',3,'omitAlley'),('serviceKiosk',4,'omitAlley'),('b3',4,'omitMesh')]:
        print('pixel control:',method,flush=True);ready(page,'&'+param+'='+method)
        if method=='serviceKiosk':kiosk_pose(page)
        else:pose(page,headings[index-1])
        original=kiosk_original if method=='serviceKiosk' else originals[index]
        d=delta(original.crop((0,250,1440,820)),frame(page).crop((0,250,1440,820)))
        report['controls'][method]=d;assert d>.5,(method,d);check(page)
    ready(page);page.evaluate('__calibrationCamera=null');report['physics']={};print('physics probes',flush=True)
    probes=[('west_junction',20,-335.3,4.7,False),('west_path',11,-336,4.7,False),('old_water_ride',-3,-334.5,4.7,False),('under_cage',13.5,-323,0,False),('kiddie',15,-330.5,0,True),('south_bed',22,-318,0,True),('west_sculpture',21.5,-328.4,0,True),('shutter',6,-340.2,0,True),('blue_kiosk',3.28,-348.91,0,True)]
    post=page.evaluate("async()=>{const park=await(await fetch('park/park.json')).json();return ParkCentralAlley.airPosts(ParkMeshes.entries(park).find(e=>e.kind==='airTrack'))[0];}")
    probes.append(('cage_post',post[0],post[1],0,True))
    for name,x,z,h,blocked in probes:
        page.evaluate('p=>{__car.x=p.x;__car.z=p.z;__car.heading=p.h;__car.v=0;__car.steer=0}',{'x':x,'z':z,'h':h});page.keyboard.down('w');page.wait_for_timeout(600);page.keyboard.up('w')
        moved=math.dist([x,z],page.evaluate('[__car.x,__car.z]'));report['physics'][name]={'metres':moved,'cat':page.evaluate('__stats.car.cat')}
        assert moved<.01 if blocked else moved>.1,(name,moved)
    check(page);(out/'progress.json').write_text(json.dumps(report,indent=2)+'\n')
    page.evaluate("document.body.classList.remove('calibration')");pose(page,headings[2])
    for palette in ['pico8','gameboy','cga','mono','accent','source']:page.select_option('#palette',palette);page.wait_for_timeout(70);check(page)
    roi=(300,250,1140,750);day=sum(ImageStat.Stat(frame(page).crop(roi)).mean)
    page.locator('#night').check();page.wait_for_timeout(150);check(page)
    night=sum(ImageStat.Stat(frame(page).crop(roi)).mean);report['night']={'day':day,'night':night};assert night<day*.4,report['night']
    print('mobile preview',flush=True)
    phone=browser.new_page(viewport={'width':390,'height':844},device_scale_factor=3,is_mobile=True,has_touch=True)
    phone.on('pageerror',lambda e:errors.append(str(e)));phone.goto(base+'/park.html?preview=central-west&grain=0&sound=0')
    phone.wait_for_function('window.__stats?.car&&__stats.streaming.pending===0',timeout=90000);phone.wait_for_timeout(1500)
    assert phone.locator('#pad [data-k="up"]').is_visible();assert phone.evaluate('document.documentElement.scrollWidth<=innerWidth')
    phone.screenshot(path=str(out/'west-mobile.png'));check(phone);report['mobile']=phone.evaluate('JSON.parse(JSON.stringify(__stats))')
    phone.close();page.close();browser.close()
assert not errors,errors
report['page_errors']=errors;(out/'validation.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))

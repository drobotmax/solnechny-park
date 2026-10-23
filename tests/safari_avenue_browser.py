"""Verify the local panorama station through the delivered WebGL and actual controls."""
import io,json,math,os,tempfile
from pathlib import Path
from PIL import Image,ImageChops,ImageStat
from playwright.sync_api import sync_playwright
base=os.environ.get('PARK_URL','http://127.0.0.1:8791')
out=Path(os.environ.get('PARK_SAFARI_OUT',tempfile.mkdtemp(prefix='safari-avenue-')));out.mkdir(parents=True,exist_ok=True)
views={'back':(57.5,-199,-.20),'food':(57.5,-199,1.45),'south':(57.5,-199,2.94),'gate':(57.5,-199,4.49),'corner':(57.5,-199,5.45),'verge':(57,-189,4.61)}
report={};errors=[]
def ready(page,extra='',preview=False):
 query='preview=safari-avenue' if preview else 'calibrate=1&x=57.5&z=-199&heading=1.45'
 page.goto(base+'/park.html?'+query+'&grain=0&sound=0'+extra)
 try:page.wait_for_function('window.__stats?.train&&__stats.streaming.pending===0',timeout=90000)
 except Exception:
  print('load diagnostics:',page.evaluate('({stats:window.__stats,status:document.querySelector("#status")?.textContent,lost:document.querySelector("#c").getContext("webgl2")?.isContextLost()})'),errors,flush=True);raise
 page.wait_for_timeout(1000);page.evaluate('Object.assign(__train,ParkAvenueTrain.make(0),{paused:true})');assert page.locator('#status').is_hidden()
def pose(page,name):
 x,z,h=views[name];page.evaluate('p=>__calibrationCamera=p',{'x':x,'z':z,'y':1.72,'heading':h,'pitch':0});page.wait_for_timeout(180)
def frame(page):return Image.open(io.BytesIO(page.screenshot(clip=page.locator('#c').bounding_box(),timeout=120000))).convert('RGB')
def difference(a,b,roi):return sum(ImageStat.Stat(ImageChops.difference(a.crop(roi),b.crop(roi))).mean)/3
def check(page):
 r=page.evaluate("()=>{const g=document.querySelector('#c').getContext('webgl2');return {error:g.getError(),lost:g.isContextLost(),failures:__stats.streaming.failures}}")
 assert r=={'error':0,'lost':False,'failures':0},r
with sync_playwright() as p:
 browser=p.chromium.launch(channel='chrome',headless=True)
 page=browser.new_page(viewport={'width':1440,'height':900});page.set_default_timeout(120000);page.on('pageerror',lambda e:errors.append(str(e)))
 page.add_init_script("""let safari;Object.defineProperty(window,'ParkSafariAvenue',{get(){return safari},set(v){const omit=new URLSearchParams(location.search).get('omitSafari');if(omit==='signs')v.signsEnabled=false;else if(omit)v[omit]=()=>{};safari=v}});""")
 ready(page);originals={}
 for name in views:
  pose(page,name);originals[name]=frame(page);originals[name].save(out/('safari-'+name+'.png'))
 report['desktop']=page.evaluate('JSON.parse(JSON.stringify(__stats))');check(page);report['controls']={}
 for method,view in [('foodStalls','food'),('safariGate','gate'),('avenueDetails','verge'),('signs','food')]:
  print('pixel control:',method,flush=True);ready(page,'&omitSafari='+method);pose(page,view)
  roi=(0,220,1440,790) if method!='signs' else (90,280,1350,420)
  d=difference(originals[view],frame(page),roi);report['controls'][method]=d;assert d>(.08 if method=='signs' else .7),(method,d);check(page)
 ready(page,preview=True);report['physics']={}
 def drive(name,x,z,h,ms=750,blocked=False):
  page.evaluate('p=>{__car.x=p.x;__car.z=p.z;__car.heading=p.h;__car.v=0;__car.steer=0}',{'x':x,'z':z,'h':h})
  page.keyboard.down('w');page.wait_for_timeout(ms);page.keyboard.up('w');page.evaluate('__car.v=0')
  end=page.evaluate('[__car.x,__car.z]');d=math.dist([x,z],end);report['physics'][name]={'metres':d,'end':end}
  assert d<.01 if blocked else d>.20,(name,d);return end
 drive('avenue_south',57.5,-199,2.94,ms=2500)
 drive('avenue_north',57.5,-199,-.20,ms=2500)
 drive('entry_approach',51.8,-196.9,4.43,ms=3600)
 end=drive('through_gate',38.5,-192.2,math.pi*1.5,ms=2500);assert end[0]<34,'the actual stroller must pass the old fence line and stone portal'
 drive('hotdog_counter',60.8,-203.2,math.pi/2,ms=1500)
 drive('meal_counter',62,-197.9,math.pi/2,ms=1000)
 drive('sidewalk',50.5,-210.0,2.94,ms=1400)
 for name,x,z in [('hotdog',65.7,-203.2),('meals',67.4,-197.9),('coffee',67.5,-189.6),('picnic',68.4,-178.8),('ticket',33,-199.6),('gate_pier',35.5,-195.4),('stone_wall',34.8,-210),('bench',52.2,-188.5),('bin',52.4,-186.7),('inner_greenery',26.5,-192)]:drive(name,x,z,0,blocked=True)
 check(page);(out/'progress.json').write_text(json.dumps(report,indent=2)+'\n');page.close()
 phone=browser.new_page(viewport={'width':390,'height':844},device_scale_factor=3,is_mobile=True,has_touch=True);phone.set_default_timeout(120000);phone.on('pageerror',lambda e:errors.append(str(e)))
 ready(phone,preview=True);assert phone.locator('#pad [data-k="up"]').is_visible();assert phone.evaluate('document.documentElement.scrollWidth<=innerWidth')
 phone.screenshot(path=str(out/'safari-mobile.png'),timeout=120000);check(phone);report['mobile']=phone.evaluate('JSON.parse(JSON.stringify(__stats))');phone.close();browser.close()
assert not errors,errors
report['page_errors']=errors;(out/'validation.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))

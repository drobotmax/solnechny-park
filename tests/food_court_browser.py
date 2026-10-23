"""Verify the local panorama station through the delivered WebGL and actual controls."""
import io,json,math,os,tempfile
from pathlib import Path
from PIL import Image,ImageChops,ImageStat
from playwright.sync_api import sync_playwright
base=os.environ.get('PARK_URL','http://127.0.0.1:8791')
out=Path(os.environ.get('PARK_COURT_OUT',tempfile.mkdtemp(prefix='food-court-')));out.mkdir(parents=True,exist_ok=True)
views={'north':(60,-189,-.20),'court':(60,-189,1.45),'south':(60,-189,2.94),'west':(60,-189,4.61),'corner':(60,-189,5.45),'inner':(71,-189.6,1.45),'sports':(48,-162,4.4)}
report={};errors=[]
def ready(page,extra='',preview=False):
 query='preview=food-court' if preview else 'calibrate=1&x=60&z=-189&heading=1.45'
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
  pose(page,name);originals[name]=frame(page);originals[name].save(out/('court-'+name+'.png'))
 report['desktop']=page.evaluate('JSON.parse(JSON.stringify(__stats))');check(page);report['controls']={}
 for method,view in [('courtStalls','court'),('sportsFence','sports'),('signs','inner')]:
  print('pixel control:',method,flush=True);ready(page,'&omitSafari='+method);pose(page,view)
  roi=(0,220,1440,790) if method!='signs' else (0,230,1440,610)
  d=difference(originals[view],frame(page),roi);report['controls'][method]=d;assert d>(.08 if method=='signs' else .7),(method,d);check(page)
 ready(page,preview=True);report['physics']={}
 def drive(name,x,z,h,ms=750,blocked=False,until=None):
  page.evaluate('p=>{__car.x=p.x;__car.z=p.z;__car.heading=p.h;__car.v=0;__car.steer=0}',{'x':x,'z':z,'h':h})
  page.keyboard.down('w')
  if until:page.wait_for_function(until,timeout=12000)
  else:page.wait_for_timeout(ms)
  page.keyboard.up('w');page.evaluate('__car.v=0')
  end=page.evaluate('[__car.x,__car.z]');d=math.dist([x,z],end);report['physics'][name]={'metres':d,'end':end};print('drive:',name,report['physics'][name],flush=True);(out/'physics-progress.json').write_text(json.dumps(report['physics'],indent=2)+'\n')
  assert d<.01 if blocked else d>.20,(name,d);return end
 drive('avenue_south',60,-189,2.94,ms=2500)
 drive('avenue_north',60,-189,-.20,ms=2500)
 end=drive('forecourt_entry',63,-189.6,math.pi/2,until='__car.x>73');assert end[0]>72,'the stroller must cross the former coffee footprint'
 end=drive('between_rear_stalls',74,-189.6,math.pi/2,until='__car.x>79.6');assert end[0]>79.6,'the rear passage must remain open between kiosks'
 drive('behind_stalls',80,-188.8,math.pi,ms=1700)
 drive('west_branch',56,-181.6,4.05,ms=2400)
 drive('court_outside_walk',44.2,-165,2.99,ms=1500)
 for name,x,z in [('fresh',77.1,-192.3),('coffee',77.2,-186.8),('gurman',68.5,-182.7),('picnic',71,-168.8),('bench',52.2,-188.5),('sports_fence',39.05,-168.54)]:drive(name,x,z,0,blocked=True)
 check(page);(out/'progress.json').write_text(json.dumps(report,indent=2)+'\n');page.close()
 phone=browser.new_page(viewport={'width':390,'height':844},device_scale_factor=3,is_mobile=True,has_touch=True);phone.set_default_timeout(120000);phone.on('pageerror',lambda e:errors.append(str(e)))
 ready(phone,preview=True);assert phone.locator('#pad [data-k="up"]').is_visible();assert phone.evaluate('document.documentElement.scrollWidth<=innerWidth')
 phone.screenshot(path=str(out/'court-mobile.png'),timeout=120000);check(phone);report['mobile']=phone.evaluate('JSON.parse(JSON.stringify(__stats))');phone.close();browser.close()
assert not errors,errors
report['page_errors']=errors;(out/'validation.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))

"""Exercise the delivered crossroads geometry, pixels and actual stroller controls."""
import io,json,math,os,tempfile
from pathlib import Path
from PIL import Image,ImageChops,ImageStat
from playwright.sync_api import sync_playwright
base=os.environ.get('PARK_URL','http://127.0.0.1:8791')
out=Path(os.environ.get('PARK_JUNCTION_OUT',tempfile.mkdtemp(prefix='avenue-junction-')));out.mkdir(parents=True,exist_ok=True)
views={'forward':2.94,'west':4.49,'back':-.20,'terrace':1.10,'play':2.2}
report={};errors=[]
def ready(page,extra='',preview=False):
 query='preview=avenue-junction' if preview else 'calibrate=1&x=47.2&z=-247.5&heading=2.94'
 page.goto(base+'/park.html?'+query+'&grain=0&sound=0'+extra)
 try:page.wait_for_function('window.__stats?.train&&__stats.streaming.pending===0',timeout=90000)
 except Exception:
  print('load diagnostics:',page.evaluate('({stats:window.__stats,status:document.querySelector("#status")?.textContent,lost:document.querySelector("#c").getContext("webgl2")?.isContextLost()})'),errors,flush=True)
  raise
 page.wait_for_timeout(1000)
 page.evaluate('Object.assign(__train,ParkAvenueTrain.make(0),{paused:true})');assert page.locator('#status').is_hidden()
def pose(page,name):
 page.evaluate('h=>__calibrationCamera={x:47.2,z:-247.5,y:1.72,heading:h,pitch:0}',views[name]);page.wait_for_timeout(180)
def frame(page):return Image.open(io.BytesIO(page.screenshot(clip=page.locator('#c').bounding_box(),timeout=120000))).convert('RGB')
def check(page):
 r=page.evaluate("()=>{const g=document.querySelector('#c').getContext('webgl2');return {error:g.getError(),lost:g.isContextLost(),failures:__stats.streaming.failures}}")
 assert r=={'error':0,'lost':False,'failures':0},r
with sync_playwright() as p:
 browser=p.chromium.launch(channel='chrome',headless=True)
 page=browser.new_page(viewport={'width':1440,'height':900});page.set_default_timeout(120000);page.on('pageerror',lambda e:errors.append(str(e)))
 page.add_init_script("""let junction;Object.defineProperty(window,'ParkAvenueJunction',{get(){return junction},set(v){const omit=new URLSearchParams(location.search).get('omitJunction');if(omit)v[omit]=()=>{};junction=v}});""")
 ready(page);originals={}
 for name in views:
  pose(page,name);originals[name]=frame(page);originals[name].save(out/('junction-'+name+'.png'))
 report['desktop']=page.evaluate('JSON.parse(JSON.stringify(__stats))');check(page);report['controls']={}
 for method,view in [('terrace','terrace'),('shootingGallery','back'),('playground','play'),('junction','west')]:
  print('pixel control:',method,flush=True);ready(page,'&omitJunction='+method);pose(page,view)
  roi=(0,250,1440,820);d=sum(ImageStat.Stat(ImageChops.difference(originals[view].crop(roi),frame(page).crop(roi))).mean)/3
  report['controls'][method]=d;assert d>.7,(method,d);check(page)
 ready(page,preview=True);report['physics']={}
 def drive(name,x,z,h,ms=700,blocked=False):
  page.evaluate('p=>{__car.x=p.x;__car.z=p.z;__car.heading=p.h;__car.v=0;__car.steer=0}',{'x':x,'z':z,'h':h})
  page.keyboard.down('w');page.wait_for_timeout(ms);page.keyboard.up('w');page.evaluate('__car.v=0')
  end=page.evaluate('[__car.x,__car.z]');d=math.dist([x,z],end);report['physics'][name]={'metres':d,'end':end}
  assert d<.01 if blocked else d>.15,(name,d);return end
 for name,x,z,h in [('avenue',47.2,-247.5,2.94),('west_walk',42,-243,4.613),('east_walk',52,-244.6,1.368),('terrace_entry',62.6,-250,0),('play_gate',55.5,-231.5,math.pi/2)]:
  end=drive(name,x,z,h,ms=2600);assert math.dist([x,z],end)>1.8,(name,end)
 for name,x,z in [('gallery',54.3,-262.8),('stone_wall',32,-233.3),('shed',26,-224),('pavilion',84.7,-267.1),('hedge',40,-246.8),('planter',60.2,-251.6),('sphere_pod',58.94,-234.3),('popcorn',58.6,-219.5)]:drive(name,x,z,0,blocked=True)
 annex=page.evaluate('ParkAvenueGardens.world(-13.8,8)');drive('prior_annex_wall',*annex,0,blocked=True)
 check(page);(out/'progress.json').write_text(json.dumps(report,indent=2)+'\n');page.close()
 phone=browser.new_page(viewport={'width':390,'height':844},device_scale_factor=3,is_mobile=True,has_touch=True);phone.set_default_timeout(120000);phone.on('pageerror',lambda e:errors.append(str(e)))
 ready(phone,preview=True);assert phone.locator('#pad [data-k="up"]').is_visible();assert phone.evaluate('document.documentElement.scrollWidth<=innerWidth')
 assert phone.evaluate('document.querySelector("#c").width')==585
 phone.screenshot(path=str(out/'junction-mobile.png'),timeout=120000);check(phone);report['mobile']=phone.evaluate('JSON.parse(JSON.stringify(__stats))');phone.close();browser.close()
assert not errors,errors
report['page_errors']=errors;(out/'validation.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))

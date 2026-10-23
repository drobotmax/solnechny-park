"""Verify the continued terrace, main doorway, junction and actual rendered geometry."""
import io,json,math,os,tempfile
from pathlib import Path
from PIL import Image,ImageChops,ImageStat
from playwright.sync_api import sync_playwright
base=os.environ.get('PARK_URL','http://127.0.0.1:8791')
out=Path(os.environ.get('PARK_TROPIKANKA_OUT',tempfile.mkdtemp(prefix='tropikanka-')));out.mkdir(parents=True,exist_ok=True)
report={};errors=[]
views={'entrance':(38.3,-281,1.355),'along':(38,-285,2.48),'junction':(40,-282,3.60),'back':(38,-285,-.20)}
def ready(page,extra='',preview=False):
 query='preview=tropikanka' if preview else 'calibrate=1&x=38.3&z=-281&heading=1.355'
 page.goto(base+'/park.html?'+query+'&grain=0&sound=0'+extra)
 page.wait_for_function('window.__stats?.car&&__stats.streaming.pending===0',timeout=90000);page.wait_for_timeout(1300)
 assert page.locator('#status').is_hidden()
def pose(page,name):
 x,z,h=views[name];page.evaluate('p=>__calibrationCamera=p',{'x':x,'z':z,'heading':h,'y':1.72,'pitch':0});page.wait_for_timeout(180)
def frame(page):
 box=page.locator('#c').bounding_box();assert box
 return Image.open(io.BytesIO(page.screenshot(clip=box,timeout=120000))).convert('RGB')
def check(page):
 r=page.evaluate("()=>{const g=document.querySelector('#c').getContext('webgl2');return {error:g.getError(),lost:g.isContextLost(),failures:__stats.streaming.failures}}")
 assert r=={'error':0,'lost':False,'failures':0},r
with sync_playwright() as p:
 browser=p.chromium.launch(channel='chrome',headless=True)
 page=browser.new_page(viewport={'width':1440,'height':900});page.set_default_timeout(120000);page.on('pageerror',lambda e:errors.append(str(e)))
 page.add_init_script("""let gardens;Object.defineProperty(window,'ParkAvenueGardens',{get(){return gardens;},set(v){const omit=new URLSearchParams(location.search).get('omitGardens');if(omit)v[omit]=()=>{};gardens=v;}});""")
 ready(page);originals={}
 for name in views:
  pose(page,name);originals[name]=frame(page);page.screenshot(path=str(out/('tropikanka-'+name+'.png')),timeout=120000)
 report['desktop']=page.evaluate('JSON.parse(JSON.stringify(__stats))');check(page)
 report['controls']={}
 for method,view in [('cafeDetails','entrance'),('garden','junction')]:
  print('pixel control:',method,flush=True);ready(page,'&omitGardens='+method);pose(page,view)
  roi=(0,250,1440,820);d=sum(ImageStat.Stat(ImageChops.difference(originals[view].crop(roi),frame(page).crop(roi))).mean)/3
  report['controls'][method]=d;assert d>.7,(method,d);check(page)
 ready(page,preview=True);report['physics']={}
 def drive(name,x,z,h,ms=650,blocked=False):
  page.evaluate('p=>{__car.x=p.x;__car.z=p.z;__car.heading=p.h;__car.v=0;__car.steer=0}',{'x':x,'z':z,'h':h})
  page.keyboard.down('w');page.wait_for_timeout(ms);page.keyboard.up('w');page.evaluate('__car.v=0')
  end=page.evaluate('[__car.x,__car.z]');distance=math.dist([x,z],end)
  report['physics'][name]={'metres':distance,'end':end,'cat':page.evaluate('__stats.car.cat')}
  assert distance<.01 if blocked else distance>.10,(name,distance)
  return end
 for du in [-.8,0,.8]:
  start=page.evaluate('u=>ParkAvenueGardens.world(u,-1.1)',-3+du)
  end=drive('main_entry_'+str(du),*start,1.355,ms=4700)
  uv=page.evaluate('p=>ParkAvenueGardens.local(...p)',end);report['physics']['main_entry_'+str(du)]['uv']=uv
  assert uv[1]>7.2,('the main entrance must reach the doorway',du,uv)
 for name,x,z,h,blocked in [('main_avenue',39,-282,2.94,False),('junction',38,-271,4.7,False),('cross_gap',31,-298.8,4.7,False),('kiosk',35.4,-267,0,True),('trash_bin',37.1,-270.4,0,True),('garden',30,-285,0,True),('bench',35.3,-271.4,0,True)]:
  drive(name,x,z,h,blocked=blocked)
 for u in [3.7,12.9,22.1]:
  start=page.evaluate('u=>ParkAvenueGardens.world(u,-1.15)',u);end=drive('prior_entry_'+str(u),*start,1.355,ms=1100)
  assert page.evaluate('p=>ParkAvenueGardens.local(...p)[1]',end)>.25
 for name,u,v in [('new_planter',-7.4,0),('annex_wall',-10,10),('old_planter',10.6,0)]:
  drive(name,*page.evaluate('p=>ParkAvenueGardens.world(...p)',[u,v]),1.355,blocked=True)
 check(page);(out/'progress.json').write_text(json.dumps(report,indent=2)+'\n');page.close()
 phone=browser.new_page(viewport={'width':390,'height':844},device_scale_factor=3,is_mobile=True,has_touch=True)
 phone.set_default_timeout(120000);phone.on('pageerror',lambda e:errors.append(str(e)));ready(phone,preview=True)
 assert phone.locator('#pad [data-k="up"]').is_visible();assert phone.evaluate('document.documentElement.scrollWidth<=innerWidth')
 assert phone.evaluate('document.querySelector("#c").width')==585
 phone.screenshot(path=str(out/'tropikanka-mobile.png'),timeout=120000);check(phone)
 report['mobile']=phone.evaluate('JSON.parse(JSON.stringify(__stats))');phone.close();browser.close()
assert not errors,errors
report['page_errors']=errors;(out/'validation.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))

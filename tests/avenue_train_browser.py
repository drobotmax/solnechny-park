"""Drive the shipped train runtime, GPU model, yielding and stroller collisions."""
import io,json,math,os,tempfile
from pathlib import Path
from PIL import Image,ImageChops,ImageStat
from playwright.sync_api import sync_playwright
base=os.environ.get('PARK_URL','http://127.0.0.1:8791')
out=Path(os.environ.get('PARK_TRAIN_OUT',tempfile.mkdtemp(prefix='avenue-train-')));out.mkdir(parents=True,exist_ok=True)
report={};errors=[]
def ready(page,extra='',preview=False):
 query='preview=avenue-train' if preview else 'calibrate=1&x=39&z=-278&heading=2.40'
 page.goto(base+'/park.html?'+query+'&grain=0&sound=0'+extra)
 page.wait_for_function('window.__stats?.train&&__stats.streaming.pending===0',timeout=90000);page.wait_for_timeout(1000)
 page.evaluate('Object.assign(__train,ParkAvenueTrain.make(),{paused:true})');page.wait_for_timeout(100)
 assert page.locator('#status').is_hidden()
def pose(page,side=False):
 page.evaluate('p=>__calibrationCamera=p',{'x':36.9 if side else 39,'z':-269.3 if side else -278,'y':1.75,'heading':1.80 if side else 2.40,'pitch':0});page.wait_for_timeout(150)
def frame(page):
 return Image.open(io.BytesIO(page.screenshot(clip=page.locator('#c').bounding_box(),timeout=120000))).convert('RGB')
def delta(a,b):return sum(ImageStat.Stat(ImageChops.difference(a,b)).mean)/3
def check(page):
 r=page.evaluate("()=>{const g=document.querySelector('#c').getContext('webgl2');return {error:g.getError(),lost:g.isContextLost(),failures:__stats.streaming.failures}}")
 assert r=={'error':0,'lost':False,'failures':0},r
with sync_playwright() as p:
 browser=p.chromium.launch(channel='chrome',headless=True)
 page=browser.new_page(viewport={'width':1440,'height':900});page.set_default_timeout(120000);page.on('pageerror',lambda e:errors.append(str(e)))
 page.add_init_script("""let train;Object.defineProperty(window,'ParkAvenueTrain',{get(){return train},set(v){const build=v.build;v.build=G=>{const parts=build(G);if(new URLSearchParams(location.search).get('omitTrain'))for(const p of Object.values(parts)){p.n=0;p.data=new Float32Array(0)}return parts};train=v}});
 const create=WebGL2RenderingContext.prototype.createProgram;window.__programs=[];WebGL2RenderingContext.prototype.createProgram=function(){const p=create.call(this);__programs.push(p);return p};""")
 ready(page);pose(page);front=frame(page);page.screenshot(path=str(out/'train-front.png'),timeout=120000)
 pose(page,True);side=frame(page);page.screenshot(path=str(out/'train-side.png'),timeout=120000)
 report['desktop']=page.evaluate('JSON.parse(JSON.stringify(__stats))');assert report['desktop']['train']['visible']==4
 assert report['desktop']['train']['bytes']<1024*1024;assert report['desktop']['train']['triangles']>5000
 page.evaluate('__train.travel=.28');page.wait_for_timeout(150)
 report['wheel_pixel_delta']=delta(side.crop((0,400,1440,820)),frame(page).crop((0,400,1440,820)));assert report['wheel_pixel_delta']>.03
 ready(page,'&omitTrain=1');pose(page,True)
 report['model_pixel_delta']=delta(side.crop((0,250,1440,820)),frame(page).crop((0,250,1440,820)));assert report['model_pixel_delta']>1
 assert page.evaluate('__stats.train.triangles')==0;check(page)
 ready(page);pose(page);page.evaluate('__car.x=-100;__car.z=-500;__train.paused=false')
 before=page.evaluate('[__train.units[0].x,__train.units[0].z]');image_a=frame(page);page.wait_for_timeout(1500)
 after=page.evaluate('[__train.units[0].x,__train.units[0].z]');image_b=frame(page)
 report['actual_motion']={'metres':math.dist(before,after),'pixel_delta':delta(image_a.crop((300,300,1250,820)),image_b.crop((300,300,1250,820)))}
 assert report['actual_motion']['metres']>.2 and report['actual_motion']['pixel_delta']>.1
 report['phases']={}
 for phase in ['outbound','south-turn','inbound','north-turn']:
  page.evaluate("phase=>{const T=ParkAvenueTrain,d=T.distances.find(d=>T.sample(d+.05).phase===phase)+1;Object.assign(__train,T.make(d),{paused:false});__car.x=-100;__car.z=-500}",phase)
  start=page.evaluate('JSON.parse(JSON.stringify(__train.units[0]))');page.wait_for_timeout(1600);end=page.evaluate('JSON.parse(JSON.stringify(__train.units[0]))')
  moved=math.hypot(end['x']-start['x'],end['z']-start['z']);assert moved>.2
  if phase=='outbound':assert end['z']>start['z']
  if phase=='inbound':assert end['z']<start['z']
  if 'turn' in phase:assert abs(math.atan2(math.sin(end['heading']-start['heading']),math.cos(end['heading']-start['heading'])))>.10
  report['phases'][phase]={'start':start,'end':end,'metres':moved}
  page.evaluate('__train.paused=true')
  if 'turn' in phase:
   page.evaluate("()=>{const p=__train.units[0],x=p.x-8,z=p.z-8;__calibrationCamera={x,z,y:4.0,heading:Math.atan2(p.x-x,z-p.z),pitch:-.14}}")
   page.wait_for_timeout(120);page.screenshot(path=str(out/('train-'+phase+'.png')),timeout=120000)
  check(page)
 ready(page,preview=True)
 page.evaluate("()=>{const p=__train.units[1];__car.x=p.x;__car.z=p.z;__car.heading=p.heading;__car.v=0}")
 start=page.evaluate('[__car.x,__car.z]');page.keyboard.down('w');page.wait_for_timeout(700);page.keyboard.up('w')
 report['stroller_blocked_metres']=math.dist(start,page.evaluate('[__car.x,__car.z]'));assert report['stroller_blocked_metres']<.01
 page.evaluate('__car.x=39;__car.z=-282;__car.heading=-.2;__car.v=0');start=page.evaluate('[__car.x,__car.z]')
 page.keyboard.down('w');page.wait_for_timeout(700);page.keyboard.up('w');page.evaluate('__car.v=0')
 report['stroller_free_metres']=math.dist(start,page.evaluate('[__car.x,__car.z]'));assert report['stroller_free_metres']>.15
 # Put the same live stroller ahead of the locomotive, then clear the lane.
 page.evaluate("()=>{Object.assign(__train,ParkAvenueTrain.make(),{paused:false,speed:1.35});const p=__train.units[0];__car.x=p.x+Math.sin(p.heading)*3.2;__car.z=p.z-Math.cos(p.heading)*3.2;__car.v=0}")
 page.wait_for_timeout(1900);stopped=page.evaluate('({distance:__train.distance,speed:__train.speed,waiting:__train.waiting})');assert stopped['waiting'] and stopped['speed']==0
 page.wait_for_timeout(650);assert page.evaluate('__train.distance')==stopped['distance']
 page.evaluate('__car.x=-100;__car.z=-500');page.wait_for_timeout(1600)
 resumed=page.evaluate('({distance:__train.distance,speed:__train.speed,waiting:__train.waiting})');assert not resumed['waiting'] and resumed['speed']>.7 and resumed['distance']!=stopped['distance']
 report['yield']={'stopped':stopped,'resumed':resumed};check(page)
 # The new moving collision must leave the previously accepted cafe doorway usable.
 page.evaluate("()=>{Object.assign(__train,ParkAvenueTrain.make(0),{paused:true});const p=ParkAvenueGardens.world(-3,-1.1);__car.x=p[0];__car.z=p[1];__car.heading=1.355;__car.v=0;__car.steer=0}")
 page.keyboard.down('w');page.wait_for_timeout(4700);page.keyboard.up('w');page.evaluate('__car.v=0')
 uv=page.evaluate('ParkAvenueGardens.local(__car.x,__car.z)');assert uv[1]>7.2;report['prior_cafe_entry_uv']=uv
 ready(page);pose(page,True);page.evaluate("document.body.classList.remove('calibration')")
 for palette in ['pico8','gameboy','cga','mono','accent','source']:
  page.select_option('#palette',palette);page.wait_for_timeout(60);check(page)
 day=sum(ImageStat.Stat(frame(page).crop((250,250,1200,780))).mean);page.locator('#night').check();page.wait_for_timeout(100)
 night=sum(ImageStat.Stat(frame(page).crop((250,250,1200,780))).mean)
 gpu=page.evaluate("()=>{const g=document.querySelector('#c').getContext('webgl2'),m=__programs.find(p=>g.getAttribLocation(p,'aNormal')===1),ground=__programs.find(p=>g.getUniformLocation(p,'uContactN'));return {day:g.getUniform(m,g.getUniformLocation(m,'uDay')),light:g.getUniform(m,g.getUniformLocation(m,'uLight')),contacts:g.getUniform(ground,g.getUniformLocation(ground,'uContactN'))}}")
 assert gpu['day']==0 and gpu['light']==.5 and gpu['contacts']<=32;assert night<day*.65;report['night']={'day':day,'night':night,'gpu':gpu};check(page)
 ready(page,preview=True);page.keyboard.type('iddqd');page.wait_for_function('__doom().active');check(page);page.keyboard.type('iddqd');page.wait_for_function('!__doom().active')
 report['doom_return']=True;(out/'progress.json').write_text(json.dumps(report,indent=2)+'\n');page.close()
 phone=browser.new_page(viewport={'width':390,'height':844},device_scale_factor=3,is_mobile=True,has_touch=True);phone.set_default_timeout(120000);phone.on('pageerror',lambda e:errors.append(str(e)))
 ready(phone,preview=True);assert phone.locator('#pad [data-k="up"]').is_visible();assert phone.evaluate('document.documentElement.scrollWidth<=innerWidth')
 assert phone.evaluate('__stats.train.visible')>=3
 phone.screenshot(path=str(out/'train-mobile.png'),timeout=120000);check(phone);report['mobile']=phone.evaluate('JSON.parse(JSON.stringify(__stats))');phone.close();browser.close()
assert not errors,errors
report['page_errors']=errors;(out/'validation.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))

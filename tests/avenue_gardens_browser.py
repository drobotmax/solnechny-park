"""Check the next reference station and actual access between terrace planters."""
import io,json,math,os,tempfile
from pathlib import Path
from PIL import Image,ImageChops,ImageStat
from playwright.sync_api import sync_playwright

base=os.environ.get('PARK_URL','http://127.0.0.1:8791')
out=Path(os.environ.get('PARK_GARDENS_OUT',tempfile.mkdtemp(prefix='avenue-gardens-')))
out.mkdir(parents=True,exist_ok=True)
errors=[];report={};headings={'forward':2.94,'garden':4.70,'cafe':1.35,'back':-.20}
def ready(page,extra='',preview=False):
    query='preview=main-avenue' if preview else 'calibrate=1&x=34&z=-305&heading=2.94'
    page.goto(base+'/park.html?'+query+'&grain=0&sound=0'+extra)
    page.wait_for_function('window.__stats?.car&&__stats.streaming.pending===0',timeout=90000)
    page.wait_for_timeout(1400);assert page.locator('#status').is_hidden()
def pose(page,name):
    page.evaluate('p=>__calibrationCamera=p',{'x':32 if name=='garden' else 34,'z':-315 if name=='garden' else -305,'y':1.72,'heading':headings[name],'pitch':0});page.wait_for_timeout(150)
def frame(page):
    box=page.locator('#c').bounding_box();assert box
    return Image.open(io.BytesIO(page.screenshot(clip=box,timeout=120000))).convert('RGB')
def delta(a,b):return sum(ImageStat.Stat(ImageChops.difference(a,b)).mean)/3
def check(page):
    r=page.evaluate("""()=>{const gl=document.querySelector('#c').getContext('webgl2');return {error:gl.getError(),lost:gl.isContextLost(),failures:__stats.streaming.failures};}""")
    assert r=={'error':0,'lost':False,'failures':0},r
with sync_playwright() as p:
    browser=p.chromium.launch(channel='chrome',headless=True)
    page=browser.new_page(viewport={'width':1440,'height':900})
    page.set_default_timeout(120000);page.on('pageerror',lambda e:errors.append(str(e)))
    page.add_init_script("""const create=WebGL2RenderingContext.prototype.createProgram;window.__meshPrograms=[];
      WebGL2RenderingContext.prototype.createProgram=function(){const p=create.call(this);__meshPrograms.push(p);return p;};
      let gardens;Object.defineProperty(window,'ParkAvenueGardens',{
      get(){return gardens;},set(value){const name=new URLSearchParams(location.search).get('omitGardens');if(name)value[name]=()=>{};gardens=value;}});""")
    ready(page);originals={}
    for name in headings:
        pose(page,name);originals[name]=frame(page);page.screenshot(path=str(out/('avenue-next-'+name+'.png')),timeout=120000)
    report['desktop']=page.evaluate('JSON.parse(JSON.stringify(__stats))');check(page)
    assert report['desktop']['stroller']['bytes']==707520
    report['controls']={}
    for method,view in [('garden','garden'),('cafeDetails','cafe')]:
        print('pixel control:',method,flush=True);ready(page,'&omitGardens='+method);pose(page,view)
        roi=(0,250,1440,820);d=delta(originals[view].crop(roi),frame(page).crop(roi))
        report['controls'][method]=d;assert d>.7,(method,d);check(page)
    ready(page,preview=True);report['physics']={}
    def drive(name,x,z,h,blocked=False,ms=600):
        page.evaluate('p=>{__car.x=p.x;__car.z=p.z;__car.heading=p.h;__car.v=0;__car.steer=0}',{'x':x,'z':z,'h':h})
        page.keyboard.down('w');page.wait_for_timeout(ms);page.keyboard.up('w');page.evaluate('__car.v=0')
        end=page.evaluate('[__car.x,__car.z]');distance=math.dist([x,z],end)
        report['physics'][name]={'metres':distance,'end':end,'cat':page.evaluate('__stats.car.cat')}
        assert distance<.01 if blocked else distance>.10,(name,distance)
        return end
    for name,x,z,h,blocked in [('avenue',34,-305,2.94,False),('next_bed_pass',36,-295,2.94,False),('further_avenue',41,-274,2.94,False),('cross_passage',31,-298.8,4.70,False),('prior_station',26,-334,0,False),('new_bed',30,-285,0,True),('bench',28.3,-301.6,0,True),('notice',35.4,-267,0,True),('blue_post',19,-306,0,True)]:
        drive(name,x,z,h,blocked)
    for u in [3.7,12.9,22.1]:
        start=page.evaluate('u=>ParkAvenueGardens.world(u,-1.15)',u)
        end=drive('terrace_entry_'+str(u),*start,1.355,ms=1050)
        uv=page.evaluate('p=>ParkAvenueGardens.local(...p)',end)
        assert uv[1]>.25,('the entry must cross the planter line',u,uv)
    planter=page.evaluate('ParkAvenueGardens.world(10.6,0)');drive('planter',*planter,1.355,True)
    wall=page.evaluate('ParkAvenueGardens.world(15,7.4)');drive('frontage_wall',*wall,1.355,True)
    (out/'progress.json').write_text(json.dumps(report,indent=2)+'\n');check(page)
    ready(page);pose(page,'forward');page.evaluate("document.body.classList.remove('calibration')")
    for palette in ['pico8','gameboy','cga','mono','accent','source']:
        page.select_option('#palette',palette);page.wait_for_timeout(70);check(page)
    roi=(300,250,1140,760);day=sum(ImageStat.Stat(frame(page).crop(roi)).mean);page.locator('#night').check();page.wait_for_timeout(120)
    night=sum(ImageStat.Stat(frame(page).crop(roi)).mean)
    lighting=page.evaluate("""()=>{const g=document.querySelector('#c').getContext('webgl2'),p=__meshPrograms.find(p=>g.getAttribLocation(p,'aNormal')===1);return {light:g.getUniform(p,g.getUniformLocation(p,'uLight')),day:g.getUniform(p,g.getUniformLocation(p,'uDay'))};}""")
    report['night']={'day':day,'night':night,'gpu':lighting};(out/'progress.json').write_text(json.dumps(report,indent=2)+'\n')
    assert lighting=={'light':.5,'day':0},lighting
    assert night<day*.65,report['night']
    check(page)
    # Exercise the normal boot, actual game collection and the alternate render mode.
    ready(page,preview=True);page.keyboard.type('iddqd');page.wait_for_function('__doom().active');check(page)
    page.keyboard.type('iddqd');page.wait_for_function('!__doom().active');page.evaluate("__start('play')")
    page.evaluate('()=>{const b=__game.bottles[0];__car.x=b.x;__car.z=b.z;__car.v=0}')
    page.wait_for_function('__game.found>=1');report['gameplay']={'collected':page.evaluate('__game.found'),'doom_return':True};check(page)
    page.close()
    phone=browser.new_page(viewport={'width':390,'height':844},device_scale_factor=3,is_mobile=True,has_touch=True)
    phone.set_default_timeout(120000);phone.on('pageerror',lambda e:errors.append(str(e)));ready(phone,preview=True)
    assert phone.locator('#pad [data-k="up"]').is_visible()
    assert phone.evaluate('document.documentElement.scrollWidth<=innerWidth')
    assert phone.evaluate('document.querySelector("#c").width')==585
    phone.screenshot(path=str(out/'avenue-next-mobile.png'),timeout=120000);check(phone)
    report['mobile']=phone.evaluate('JSON.parse(JSON.stringify(__stats))');phone.close();browser.close()
assert not errors,errors
report['page_errors']=errors;(out/'validation.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))

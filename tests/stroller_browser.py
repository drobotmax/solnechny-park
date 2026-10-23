"""Check the delivered solid pram, its real GPU transforms and legacy source path."""
import io,json,math,os,tempfile
from pathlib import Path
from PIL import Image,ImageChops,ImageStat
from playwright.sync_api import sync_playwright

base=os.environ.get('PARK_URL','http://127.0.0.1:8791')
out=Path(os.environ.get('PARK_STROLLER_OUT',tempfile.mkdtemp(prefix='park-stroller-')))
out.mkdir(parents=True,exist_ok=True)
errors=[];requests=[];report={}
def ready(page,extra=''):
    requests.clear();page.goto(base+'/park.html?preview=stroller&grain=0&sound=0'+extra)
    page.wait_for_function('window.__stats?.car && __stats.streaming.pending===0',timeout=90000)
    page.wait_for_timeout(1600);assert page.locator('#status').is_hidden()
def frame(page):return Image.open(io.BytesIO(page.locator('#c').screenshot())).convert('RGB')
def delta(a,b):return sum(ImageStat.Stat(ImageChops.difference(a,b)).mean)/3
def check(page):
    s=page.evaluate("""()=>{const g=document.querySelector('#c').getContext('webgl2');return {error:g.getError(),lost:g.isContextLost(),failures:__stats.streaming.failures};}""")
    assert s=={'error':0,'lost':False,'failures':0},s
def pose(page,yaw):
    page.evaluate('yaw=>{__car.v=0;__cam.yaw=__car.heading;__cam.orbit=yaw}',yaw);page.wait_for_timeout(200)
def capture_gpu(page):
    page.evaluate("""()=>{
      const gl=document.querySelector('#c').getContext('webgl2'),draw=gl.drawArrays.bind(gl),s=__stroller;
      window.__pramDraws=[];
      gl.drawArrays=function(mode,first,count){
        const vao=gl.getParameter(gl.VERTEX_ARRAY_BINDING),p=gl.getParameter(gl.CURRENT_PROGRAM);
        let name=vao===s.body.vao?'body':vao===s.frontFork.vao?'fork':vao===s.wheels[0].gpu.vao?'front':vao===s.wheels[1].gpu.vao?'rear':null;
        if(name){if(name==='body')__pramDraws=[];__pramDraws.push({name,mode,count,m:Array.from(gl.getUniform(p,gl.getUniformLocation(p,'uModel')))});}
        else if(mode===gl.TRIANGLES){const u=gl.getUniformLocation(p,'uModel');if(u)window.__staticModel=Array.from(gl.getUniform(p,u));}
        return draw(mode,first,count);
      };
    }""");page.wait_for_timeout(100)
def assert_gpu(page):
    result=page.evaluate("""()=>{
      const b=__pramDraws[0].m,locals=[null];
      for(const w of __stroller.wheels)for(const side of [-1,1]){
        if(w.front)locals.push(ParkStroller.wheelPose(w,side,__car.steer,__car.wheelTravel,false));
        locals.push(ParkStroller.wheelPose(w,side,__car.steer,__car.wheelTravel));
      }
      let error=0;
      for(let i=1;i<locals.length;i++)for(let c=0;c<4;c++)for(let r=0;r<4;r++){
        let v=0;for(let k=0;k<4;k++)v+=b[k*4+r]*locals[i][c*4+k];
        error=Math.max(error,Math.abs(v-__pramDraws[i].m[c*4+r]));
      }
      return {error,draws:__pramDraws,staticModel:__staticModel};
    }""")
    assert len(result['draws'])==7 and all(d['mode']==4 and d['count']>0 for d in result['draws']),result
    assert result['error']<3e-5,result
    assert result['staticModel']==[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],result
    return result

with sync_playwright() as p:
    browser=p.chromium.launch(channel='chrome',headless=True)
    page=browser.new_page(viewport={'width':1440,'height':900})
    page.on('pageerror',lambda e:errors.append(str(e)));page.on('request',lambda r:requests.append(r.url))
    ready(page);report['desktop']=page.evaluate('JSON.parse(JSON.stringify(__stats))')
    assert report['desktop']['stroller']['representation']=='mesh'
    assert report['desktop']['stroller']['length']==1.1 and report['desktop']['stroller']['width']==.58
    scan_src=page.request.get(base+'/park/stream-manifest.json').json()['stroller']['src']
    assert not any(u.endswith('/'+scan_src) or u.endswith('karasunsky.spz') for u in requests),requests
    report['default_scan_requests']=[];check(page);capture_gpu(page)
    for name,yaw in [('quarter',-.65),('rear',0),('side',-math.pi/2),('front',math.pi)]:
        pose(page,yaw);page.screenshot(path=str(out/f'stroller-solid-{name}.png'))
    pose(page,-.65);original=frame(page);roi=(380,180,1060,800);report['controls']={}
    # Disable the actual GPU body/wheels while preserving every other draw.
    for name,expression in [('body','[__stroller.body]'),('wheels','__stroller.wheels.map(w=>w.gpu)')]:
        page.evaluate('expr=>{window.__hiddenParts=eval(expr).map(p=>[p,p.n]);__hiddenParts.forEach(([p])=>p.n=0)}',expression)
        page.wait_for_timeout(100);d=delta(original.crop(roi),frame(page).crop(roi));report['controls'][name]=d
        assert d>.5,(name,d)
        page.evaluate('__hiddenParts.forEach(([p,n])=>p.n=n)');page.wait_for_timeout(100)
    page.evaluate('__car.wheelTravel=0;__car.steer=0');page.wait_for_timeout(100)
    parked=assert_gpu(page)
    page.wait_for_timeout(250);assert parked['draws']==assert_gpu(page)['draws'],'parked tyres must remain still'
    page.keyboard.down('w');page.wait_for_timeout(650);page.keyboard.up('w');page.evaluate('__car.v=0')
    page.wait_for_timeout(100);forward=page.evaluate('__car.wheelTravel');assert forward>.1
    rolling=assert_gpu(page);assert rolling['draws'][2]['m'][:12]!=parked['draws'][2]['m'][:12]
    page.evaluate('__car.wheelTravel=0;__car.v=0');page.keyboard.down('s');page.wait_for_timeout(650);page.keyboard.up('s');page.evaluate('__car.v=0')
    page.wait_for_timeout(100);reverse=page.evaluate('__car.wheelTravel');assert reverse<-.1;assert_gpu(page)
    page.evaluate('__car.steer=.8');page.wait_for_timeout(20);steering=assert_gpu(page)
    report['motion']={'forward_metres':forward,'reverse_metres':reverse,'gpu_error':steering['error']}
    page.evaluate('__car.x=22;__car.z=-318;__car.v=0;__car.heading=0;__car.steer=0;__car.wheelTravel=0')
    page.keyboard.down('w');page.wait_for_timeout(500);page.keyboard.up('w')
    assert page.evaluate('Math.abs(__car.wheelTravel)')<.001,'a blocked pram cannot spin its tyres'
    report['motion']['blocked_travel']=page.evaluate('__car.wheelTravel')
    # Put the actual model on the bridge approach and inspect its submitted tilt.
    page.evaluate("""()=>{const f=ParkMeshes.bridgeFrame(),s=f.length+9;__car.x=f.a[0]+f.dx*s;__car.z=f.a[1]+f.dz*s;__car.heading=Math.atan2(-f.dx,f.dz);__car.v=0;}""")
    page.wait_for_timeout(200);slope=assert_gpu(page)
    ground=page.evaluate('ParkMeshes.terrainHeight(__car.x,__car.z)')
    assert abs(slope['draws'][0]['m'][13]-ground)<1e-5
    assert abs(slope['draws'][0]['m'][6])>.01,slope
    report['bridge']={'ground_y':ground,'model':slope['draws'][0]['m']};check(page)
    ready(page);pose(page,-.65)
    day=frame(page).crop(roi)
    for palette in ['pico8','gameboy','cga','mono','accent','source']:
        page.select_option('#palette',palette);page.wait_for_timeout(90);check(page)
    page.locator('#night').check();page.wait_for_timeout(150);night=frame(page).crop(roi)
    brightness=lambda im:sum(ImageStat.Stat(im).mean)
    report['night']={'day':brightness(day),'night':brightness(night)}
    assert report['night']['night']<report['night']['day']*.4
    page.screenshot(path=str(out/'stroller-solid-night.png'));check(page)
    ready(page,'&stroller=scan');assert page.evaluate('__stats.stroller.representation')=='scan'
    report['legacy']=page.evaluate('JSON.parse(JSON.stringify(__stats.stroller))')
    assert any(u.endswith('/'+scan_src) for u in requests),requests
    pose(page,-math.pi/2);page.screenshot(path=str(out/'stroller-before-side.png'));check(page)
    ready(page,'&src=karasunsky.spz');assert page.evaluate('__stats.stroller.representation')=='scan'
    assert any(u.endswith('karasunsky.spz') for u in requests)
    report['custom_source']=page.evaluate('JSON.parse(JSON.stringify(__stats.stroller))');check(page)
    page.close()
    phone=browser.new_page(viewport={'width':390,'height':844},device_scale_factor=3,is_mobile=True,has_touch=True)
    phone.on('pageerror',lambda e:errors.append(str(e)));ready(phone)
    assert phone.locator('#pad [data-k="up"]').is_visible()
    assert phone.evaluate('document.documentElement.scrollWidth<=innerWidth')
    assert phone.evaluate('__stats.stroller.representation')=='mesh'
    phone.screenshot(path=str(out/'stroller-solid-mobile.png'));check(phone)
    report['mobile']=phone.evaluate('JSON.parse(JSON.stringify(__stats))');phone.close();browser.close()
assert not errors,errors
report['page_errors']=errors
(out/'validation.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))

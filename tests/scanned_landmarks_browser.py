"""Check GPU visibility, actual stroller collisions and mobile landmark rendering."""
import io
import json
import math
import os
import tempfile
from pathlib import Path

from PIL import Image, ImageChops, ImageStat
from playwright.sync_api import sync_playwright

BASE = os.environ.get('PARK_URL', 'http://127.0.0.1:8791')
OUT = Path(os.environ.get('PARK_LANDMARKS_OUT', tempfile.mkdtemp(prefix='park-landmarks-')))
OUT.mkdir(parents=True, exist_ok=True)
errors, requests, report = [], [], {}


def ready(page, query):
    print('preview:', query, flush=True)
    page.goto(BASE + '/park.html?' + query + '&grain=0&sound=0')
    try:
        page.wait_for_function('window.__stats?.car&&__stats.streaming.pending===0', timeout=90000)
    except Exception:
        print(json.dumps({'status':page.locator('#status').text_content(),'errors':errors,
                          'stats':page.evaluate('window.__stats||null')},ensure_ascii=False),flush=True)
        page.screenshot(path=str(OUT/'load-failure.png'))
        raise
    page.wait_for_timeout(1200)
    assert page.locator('#status').is_hidden()


def check(page):
    result = page.evaluate("""()=>{const g=document.querySelector('#c').getContext('webgl2');
      return {error:g.getError(),lost:g.isContextLost(),failures:__stats.streaming.failures};}""")
    assert result == dict(error=0, lost=False, failures=0), result


def image(page):
    return Image.open(io.BytesIO(page.locator('#c').screenshot())).convert('RGB')


def drive(page, x, z, heading, ms):
    page.evaluate('p=>{__car.x=p.x;__car.z=p.z;__car.heading=p.h;__car.v=0;__car.steer=0}', dict(x=x,z=z,h=heading))
    page.keyboard.down('w')
    page.wait_for_timeout(ms)
    page.keyboard.up('w')
    page.evaluate('__car.v=0')
    return page.evaluate('[__car.x,__car.z]')


with sync_playwright() as p:
    browser = p.chromium.launch(channel='chrome', headless=True)
    context = browser.new_context(viewport={'width':1440,'height':900})
    # Omit only a draw call for pixel controls; placement always uses shipped data.
    init="""let meshes;
      Object.defineProperty(window,'ParkMeshes',{get(){return meshes},set(v){
        const build=v.build,omit=new URLSearchParams(location.search).get('omitLandmark');
        v.build=e=>{const m=build(e);return e.kind===omit?{...m,n:0,data:new Float32Array(0)}:m;};meshes=v;
      }});"""
    context.add_init_script(init)
    page = context.new_page()
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.on('request', lambda r: requests.append(r.url))
    query='calibrate=1&x=33.4&z=-390&heading=0&pix=1'
    ready(page, query)
    original = image(page)
    page.screenshot(path=str(OUT/'plaza-barriers.png'))
    ready(page, query+'&omitLandmark=plazaBarriers')
    difference = sum(ImageStat.Stat(ImageChops.difference(original,image(page))).mean)/3
    report['barrier_pixel_delta'] = difference
    assert difference > .25, 'the real GPU barrier row must contribute visible pixels'
    ready(page, 'preview=plaza-barriers')
    site=page.evaluate('ParkScannedLandmarks.sites()[2]')
    end=drive(page,site[0],site[1]+2,0,1600)
    remaining=math.dist(site,end)
    assert .65<remaining<1.55, remaining
    stopped=drive(page,*end,0,900)
    assert math.dist(end,stopped)<.015, 'the actual stroller must stop at the new barrier'
    gap=page.evaluate('(()=>{const p=ParkScannedLandmarks.sites();return p[2].map((v,k)=>(v+p[3][k])/2)})()')
    free=drive(page,gap[0],gap[1]+2,0,1600)
    assert math.dist([gap[0],gap[1]+2],free)>2.1, 'the adjacent gap must remain driveable'
    report['motion']=dict(barrier_distance=remaining,blocked_motion=math.dist(end,stopped),gap_travel=math.dist([gap[0],gap[1]+2],free))
    spec=page.evaluate('JSON.parse(JSON.stringify(ParkScannedLandmarks.yesenin))')
    x,z=spec['at'];yaw=spec['yaw']
    assert 90<x<108 and -241<z< -228, 'the shipped model must use the confirmed site'
    report['placement']=spec
    entry=page.evaluate('ParkScannedLandmarks.world(0,10.5)')
    entered=drive(page,*entry,yaw,1800)
    assert math.dist(entry,entered)>3, 'the actual stroller must reach the tiled pocket from the cross path'
    approach=page.evaluate('ParkScannedLandmarks.world(0,2.2)')
    stopped=drive(page,*approach,yaw,1600)
    assert .65<math.dist([x,z],stopped)<1.55, 'the actual pedestal must stop the stroller'
    held=drive(page,*stopped,yaw,900)
    assert math.dist(stopped,held)<.015
    beside=page.evaluate('ParkScannedLandmarks.world(2.6,1.6)')
    passed=drive(page,*beside,yaw,1400)
    assert math.dist(beside,passed)>1.8, 'the paving beside the pedestal must remain open'
    report['site_motion']=dict(entry_travel=math.dist(entry,entered),pedestal_distance=math.dist([x,z],stopped),blocked_motion=math.dist(stopped,held),side_travel=math.dist(beside,passed))
    def camera(angle):
        dx=-math.sin(yaw)*4.5*math.cos(angle)+math.cos(yaw)*4.5*math.sin(angle)
        dz=math.cos(yaw)*4.5*math.cos(angle)+math.sin(yaw)*4.5*math.sin(angle)
        return dict(x=x+dx,z=z+dz,y=1.75,heading=math.atan2(-dx,dz),pitch=.02)
    ready(page, f'calibrate=1&x={x}&z={z+5}&heading=0&pix=1')
    for name,angle in [('front',0),('quarter',-.65),('back',math.pi)]:
        page.evaluate('c=>__calibrationCamera=c',camera(angle));page.wait_for_timeout(200)
        page.screenshot(path=str(OUT/f'yesenin-{name}.png'));check(page)
    page.evaluate('c=>__calibrationCamera=c',camera(0));page.wait_for_timeout(150)
    original=image(page)
    ready(page,f'calibrate=1&x={x}&z={z+5}&heading=0&pix=1&omitLandmark=yesenin')
    page.evaluate('c=>__calibrationCamera=c',camera(0));page.wait_for_timeout(150)
    difference=sum(ImageStat.Stat(ImageChops.difference(original,image(page))).mean)/3
    report['sculpture_pixel_delta']=difference
    assert difference>1, 'the delivered relief must be visible in its actual mesh pass'
    assert not any('yesenin.spz' in u.lower() or 'barrier.spz' in u.lower() for u in requests)
    check(page)
    mobile=browser.new_context(viewport={'width':390,'height':844},device_scale_factor=2,is_mobile=True,has_touch=True)
    mobile.add_init_script(init)
    phone=mobile.new_page()
    phone.on('pageerror',lambda e:errors.append(str(e)))
    ready(phone,'preview=plaza-barriers')
    assert phone.locator('#pad [data-k="up"]').is_visible()
    assert phone.evaluate('document.documentElement.scrollWidth<=innerWidth')
    phone.screenshot(path=str(OUT/'plaza-barriers-mobile.png'));check(phone)
    ready(phone,'preview=yesenin')
    assert phone.evaluate('__stats.car.cat')==2, 'the memorial preview must start on its real paving'
    phone.screenshot(path=str(OUT/'yesenin-mobile.png'));check(phone)
    report['mobile']=phone.evaluate('JSON.parse(JSON.stringify(__stats))')
    browser.close()
assert not errors,errors
report['page_errors']=errors
(OUT/'validation.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({'output':str(OUT),**report},indent=2))

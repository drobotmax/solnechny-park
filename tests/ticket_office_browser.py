"""Validate the ticket-office facade on the real WebGL path in native Chrome."""
import io
import json
import math
import os
import tempfile
from pathlib import Path

from PIL import Image
from playwright.sync_api import sync_playwright

base=os.environ.get('PARK_URL','http://127.0.0.1:8791')
out=Path(os.environ.get('PARK_TICKET_OUT',tempfile.mkdtemp(prefix='park-ticket-')))
out.mkdir(parents=True,exist_ok=True)
errors=[]
report={}

def ready(page,query):
    page.goto(base+'/park.html?'+query)
    page.wait_for_function('window.__stats?.car && __stats.streaming.pending===0',timeout=90000)
    page.wait_for_timeout(2000)
    assert page.locator('#status').is_hidden()

def check_gl(page):
    result=page.evaluate("""() => {
      const gl=document.querySelector('#c').getContext('webgl2');
      return {error:gl.getError(),lost:gl.isContextLost()};
    }""")
    assert result=={'error':0,'lost':False},result

def project(point):
    x,y,z=point;heading=-.164
    dx=x+29.8;dz=z+316.4
    depth=dx*math.sin(heading)-dz*math.cos(heading)
    right=dx*math.cos(heading)+dz*math.sin(heading)
    focal=450/math.tan(55*math.pi/360)
    return [720+right*focal/depth,450-(y-1.65)*focal/depth]

with sync_playwright() as p:
    browser=p.chromium.launch(channel='chrome',headless=True)
    page=browser.new_page(viewport={'width':1440,'height':900})
    page.on('pageerror',lambda e:errors.append(str(e)))
    ready(page,'calibrate=1&x=-29.8&z=-316.4&heading=-.164&sound=0&grain=0')
    check_gl(page)
    page.screenshot(path=str(out/'ticket-office-front.png'))
    points=page.evaluate("""async () => {
      const park=await(await fetch('park/park.json')).json();
      const e=ParkMeshes.entries(park).find(e=>e.kind==='ticketOffice'),f=ParkTicketOffice.frame(e);
      return [f.at(.38,.115,3.245),f.at(.65,.115,4.01)];
    }""")
    projected=[project(point) for point in points]
    box=(math.floor(min(v[0] for v in projected)),math.floor(min(v[1] for v in projected)),
         math.ceil(max(v[0] for v in projected)),math.ceil(max(v[1] for v in projected)))
    image=Image.open(io.BytesIO(page.locator('#c').screenshot())).convert('RGB')
    sign=list(image.crop(box).getdata())
    dark=sum(max(rgb)<85 for rgb in sign)/len(sign)
    bright=sum(min(rgb)>180 for rgb in sign)/len(sign)
    assert dark>.35 and bright>.08,('roof lettering did not render',dark,bright,box)
    report['sign_pixels']={'dark_fraction':dark,'bright_fraction':bright,'bounds':box}
    report['front_stats']=page.evaluate('JSON.parse(JSON.stringify(__stats))')

    page.evaluate('__calibrationCamera={x:-4,z:-284,y:13,heading:-.51,pitch:-.18}')
    page.wait_for_timeout(500)
    page.screenshot(path=str(out/'ticket-office-overview.png'))
    check_gl(page)
    page.evaluate("document.body.classList.remove('calibration')")
    for palette in ['pico8','accent','source']:
        page.select_option('#palette',palette);page.wait_for_timeout(80);check_gl(page)
    page.locator('#night').check();page.wait_for_timeout(120);check_gl(page)
    page.locator('#night').uncheck()

    ready(page,'preview=ticket-office&sound=0&grain=0')
    assert page.evaluate('__game.mode')=='free'
    start=page.evaluate('[__car.x,__car.z]')
    page.keyboard.down('d');page.wait_for_timeout(450);page.keyboard.up('d')
    page.keyboard.down('w');page.wait_for_timeout(700);page.keyboard.up('w')
    end=page.evaluate('[__car.x,__car.z]')
    assert math.dist(start,end)>.1,'preview must start on navigable ground'
    check_gl(page)
    report['preview_moved_metres']=math.dist(start,end)

    mobile=browser.new_context(viewport={'width':390,'height':844},device_scale_factor=3,is_mobile=True,has_touch=True)
    phone=mobile.new_page();phone.on('pageerror',lambda e:errors.append(str(e)))
    ready(phone,'preview=ticket-office&sound=0&grain=0')
    assert phone.evaluate("document.querySelector('#c').width")==585
    assert phone.locator('#pad [data-k="up"]').is_visible()
    phone.screenshot(path=str(out/'ticket-office-mobile.png'))
    check_gl(phone)
    report['mobile_stats']=phone.evaluate('JSON.parse(JSON.stringify(__stats))')
    report['page_errors']=errors
    assert not errors,errors
    (out/'validation.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
    browser.close()
print(json.dumps({'screenshots':str(out),**report},ensure_ascii=False,indent=2))

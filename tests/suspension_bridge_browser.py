"""Drive both shores and the staircase; inspect the delivered suspension bridge."""
import json
import math
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

out=Path(os.environ.get('PARK_BRIDGE_OUT','/tmp/park-suspension-evidence'))
out.mkdir(parents=True,exist_ok=True)
errors=[]
with sync_playwright() as p:
    browser=p.chromium.launch(channel='chrome',headless=True)
    page=browser.new_page(viewport={'width':1440,'height':900})
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto(os.environ.get('PARK_URL','http://127.0.0.1:8791').rstrip('/')+'/park.html?preview=suspension-bridge&sound=0&grain=0')
    page.wait_for_function('window.__stats?.car && __stats.streaming.pending===0',timeout=90000)
    page.wait_for_timeout(1500)
    assert page.locator('#status').is_hidden()
    page.click('#menu')
    page.click('#visitBridge')
    assert page.evaluate("__game.mode==='free' && document.querySelector('#overlay').classList.contains('off')")
    assert abs(page.evaluate('ParkSuspensionBridge.local(__car.x,__car.z).s')+6)<.05
    page.screenshot(path=str(out/'approach-desktop.png'))
    frame=page.evaluate('({dx:ParkSuspensionBridge.dx,dz:ParkSuspensionBridge.dz,length:ParkSuspensionBridge.length})')
    heading=math.atan2(frame['dx'],-frame['dz'])
    page.locator('#speedMul').fill('2')
    page.locator('#speedMul').dispatch_event('input')
    def place(s,l,h):
        page.evaluate('p=>{__setKeys({});const a=ParkSuspensionBridge.at(p.s,p.l,0);__car.x=a[0];__car.z=a[2];__car.heading=p.h;__car.v=0;__car.steer=0;__cam.yaw=p.h;__cam.orbit=0;}',dict(s=s,l=l,h=h))
    report={}
    for name,start,end,h in [('forward',-7,frame['length']+5,heading),('backward',frame['length']+5,-7,heading+math.pi)]:
        place(start,.5,h)
        page.evaluate('__setKeys({up:true})')
        page.wait_for_function('(p)=>{const q=ParkSuspensionBridge.local(__car.x,__car.z);return p.forward?q.s>p.end:q.s<p.end;}',arg=dict(forward=name=='forward',end=end),timeout=45000)
        page.evaluate('__setKeys({})')
        report[name]=page.evaluate('({...__stats.car,...ParkSuspensionBridge.local(__car.x,__car.z)})')
    # Climb and descend the complete side staircase, using real fixed-step physics.
    for name,start,end,h in [('stairs-up',5.9,1.0,heading+math.pi/2),('stairs-down',1.0,5.8,heading-math.pi/2)]:
        place(-.75,start,h)
        page.evaluate('__setKeys({up:true})')
        page.wait_for_function('(p)=>{const q=ParkSuspensionBridge.local(__car.x,__car.z);return p.up?q.l<p.end:q.l>p.end;}',arg=dict(up=name=='stairs-up',end=end),timeout=15000)
        page.evaluate('__setKeys({})')
        report[name]=page.evaluate('({...__stats.car,...ParkSuspensionBridge.local(__car.x,__car.z)})')
    place(frame['length']/2,0,heading)
    page.evaluate('__cam.dist=3;__cam.pitch=.15;')
    page.wait_for_timeout(1200)
    page.screenshot(path=str(out/'deck-desktop.png'))
    place(0,6,heading-math.pi/2)
    page.evaluate('__cam.dist=7;__cam.orbit=.7;__cam.pitch=.45;')
    page.wait_for_timeout(1200)
    page.screenshot(path=str(out/'stairs-desktop.png'))
    report['gl']=page.evaluate("(()=>{const gl=document.querySelector('#c').getContext('webgl2');return {error:gl.getError(),lost:gl.isContextLost(),failures:__stats.streaming.failures};})()")
    assert report['gl']=={'error':0,'lost':False,'failures':0},report
    for side in [-1,1]:
        place(frame['length']/2,0,heading-side*math.pi/2)
        page.evaluate('__setKeys({up:true})')
        page.wait_for_timeout(1800)
        page.evaluate('__setKeys({})')
        lateral=page.evaluate('ParkSuspensionBridge.local(__car.x,__car.z).l')
        assert abs(lateral)<1,(side,lateral)
    for palette in ['pico8','gameboy','cga','mono','accent','source']:
        page.select_option('#palette',palette)
        page.wait_for_timeout(80)
        assert page.evaluate("document.querySelector('#c').getContext('webgl2').getError()") == 0
    page.set_viewport_size({'width':390,'height':844})
    place(-4,0,heading)
    page.evaluate('__cam.dist=4;__cam.orbit=0;__cam.pitch=.14;')
    page.wait_for_timeout(1200)
    assert page.locator('#pad [data-k="up"]').is_visible()
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
    page.screenshot(path=str(out/'approach-mobile.png'))
    page.click('#menu');page.click('#visitBridge')
    assert abs(page.evaluate('ParkSuspensionBridge.local(__car.x,__car.z).s')+6)<.05
    page.set_viewport_size({'width':1440,'height':900})
    for name,cx,cz,nx,nz in [('road-gap',7,440,.83,.56),('footpath-gap',11.5,409.6,.64,-.77)]:
        h=math.atan2(-nx,nz)
        page.evaluate('p=>{__setKeys({});__car.x=p.x;__car.z=p.z;__car.heading=p.h;__car.steer=0;__car.v=0;__cam.yaw=p.h;__cam.orbit=0;__cam.dist=4;__cam.pitch=.14;}',dict(x=cx+nx*4,z=cz+nz*4,h=h))
        page.wait_for_timeout(1000)
        page.screenshot(path=str(out/(name+'.png')))
        page.evaluate('__setKeys({up:true})')
        page.wait_for_function('p=>(__car.x-p.x)*p.nx+(__car.z-p.z)*p.nz < -3',arg=dict(x=cx,z=cz,nx=nx,nz=nz),timeout=10000)
        page.evaluate('__setKeys({})')
        report[name]=page.evaluate('({...__stats.car})')
    assert page.evaluate("document.querySelector('#c').getContext('webgl2').getError()") == 0
    assert page.evaluate('__stats.streaming.failures') == 0
    assert not errors,errors
    (out/'validation.json').write_text(json.dumps(report,indent=2))
    print('PASS: both crossings, stairs in both directions, mobile, WebGL',report,flush=True)
    browser.close()

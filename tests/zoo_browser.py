"""Actual zoo rendering, menu travel, navigation, animals and pen collisions."""
import json
import math
import os
from pathlib import Path
from playwright.sync_api import sync_playwright
out=Path(os.environ.get('PARK_ZOO_OUT','/tmp/park-zoo-evidence'));out.mkdir(parents=True,exist_ok=True)
errors=[]
with sync_playwright() as p:
    browser=p.chromium.launch(channel='chrome',headless=True)
    page=browser.new_page(viewport={'width':1440,'height':900})
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto('http://127.0.0.1:8791/park.html?speedMul=2&grain=0&sound=0')
    page.wait_for_function('window.__stats?.car && __stats.streaming.pending===0',timeout=90000)
    page.click('#visitZoo')
    page.wait_for_timeout(1800)
    assert page.evaluate("__game.mode==='free' && __zoo().animals.length===25")
    page.screenshot(path=str(out/'zoo-desktop.png'))
    report={'counts':page.evaluate('Object.fromEntries(ParkZoo.pens.map(p=>[p.id,__zoo().animals.filter(d=>d.species===p.id).length]))')}
    initial=page.evaluate('__zoo().animals.map(d=>[d.x,d.z])')
    page.wait_for_timeout(2200)
    assert page.evaluate('(a)=>__zoo().animals.some((d,i)=>Math.hypot(d.x-a[i][0],d.z-a[i][1])>.3)',initial)
    def pose(x,z,heading):
        page.evaluate('p=>{__setKeys({});__car.x=p.x;__car.z=p.z;__car.heading=p.h;__car.steer=0;__car.v=0;__cam.yaw=p.h;__cam.orbit=0;__cam.dist=4;__cam.pitch=.09;}',dict(x=x,z=z,h=heading))
    # Enter through the existing Safari gate and drive the real shore path to the zoo.
    path=page.evaluate('ParkZoo.walks[0]')[:7]
    pose(*path[0],0)
    for x,z in path[1:]:
        page.evaluate('p=>{__car.heading=Math.atan2(p.x-__car.x,-(p.z-__car.z));__car.steer=0;__car.v=0;__setKeys({up:true});}',dict(x=x,z=z))
        page.wait_for_function('p=>Math.hypot(__car.x-p.x,__car.z-p.z)<.7',arg=dict(x=x,z=z),timeout=25000)
        page.evaluate('__setKeys({})')
    report['entrance_route']=page.evaluate('({...__stats.car})')
    for kind,x,z in [('giraffe',-120,-181),('zebra',-145,-132),('lion',-48,-136),('elephant',-125,-60),('monkey',-48,-53),('flamingo',-1,-213)]:
        target=page.evaluate('k=>ParkZoo.pens.find(p=>p.id===k)',kind)
        pose(x,z,math.atan2(target['x']-x,-(target['z']-z)))
        page.wait_for_timeout(1400)
        assert page.evaluate('__stats.zoo.visible')>0
        page.screenshot(path=str(out/(kind+'.png')))
        if not target.get('water'):
            # Approach a fence normally: stroller must stop outside the enclosure.
            page.evaluate('__setKeys({up:true})');page.wait_for_timeout(3000);page.evaluate('__setKeys({})')
            assert page.evaluate('k=>{const p=ParkZoo.pens.find(p=>p.id===k);return !ParkZoo.inPen(p,__car.x,__car.z,.2) && __car.z>p.z-p.d/2-2;}',kind)
    for palette in ['pico8','gameboy','cga','mono','accent','source']:
        page.select_option('#palette',palette);page.wait_for_timeout(60)
        assert page.evaluate("document.querySelector('#c').getContext('webgl2').getError()") == 0
    page.click('#menu');page.click('#visitZoo')
    page.set_viewport_size({'width':390,'height':844});page.wait_for_timeout(1600)
    assert page.locator('#pad [data-k="up"]').is_visible()
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
    page.screenshot(path=str(out/'zoo-mobile.png'))
    report['gl']=page.evaluate("(()=>{const gl=document.querySelector('#c').getContext('webgl2');return {error:gl.getError(),lost:gl.isContextLost(),failures:__stats.streaming.failures};})()")
    assert report['gl']=={'error':0,'lost':False,'failures':0},report
    assert not errors,errors
    (out/'validation.json').write_text(json.dumps(report,indent=2))
    print('PASS: zoo menu, 6 species, movement, gate route, solid pens, palettes and mobile',report,flush=True)
    browser.close()

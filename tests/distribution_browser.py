"""Actual map coverage and habitat validity, including areas far from the start."""

import os

from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(channel="chrome", headless=True)
    page = browser.new_page()
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.goto(os.environ.get("PARK_URL", "http://127.0.0.1:8791") + "/park.html")
    page.wait_for_function("window.__stats?.car", timeout=90000)
    result = page.evaluate("""async () => {
      const park=await(await fetch('park/park.json')).json();
      const image=new Image();image.src='park/ground.png';await image.decode();
      const canvas=document.createElement('canvas');canvas.width=park.w;canvas.height=park.h;
      const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);
      const pixels=ctx.getImageData(0,0,park.w,park.h).data;
      const cat=(x,z)=>{const j=Math.floor((x-park.x0)/park.mpp),i=Math.floor((z-park.z0)/park.mpp);
        return i<0||j<0||i>=park.h||j>=park.w?4:pixels[(i*park.w+j)*4]&31;};
      const m=__mallards(),f=__forestBirds();
      const populations={mallard:m.ducks,coot:m.coots,shelduck:m.shelducks,
        gull:__gulls().birds,pigeon:__pigeons().birds,rook:f.groups,crow:f.crows,woodpecker:f.woodpeckers};
      const result={};
      for(const [kind,birds] of Object.entries(populations)) {
        const xs=birds.map(d=>d.x),zs=birds.map(d=>d.z);
        const water=['mallard','coot','shelduck','gull'].includes(kind);
        const valid=birds.every(d=>water?cat(d.x,d.z)===4:kind==='pigeon'?[2,11].includes(cat(d.x,d.z)):f.canForage(d.x,d.z));
        result[kind]={count:birds.length,spanX:Math.max(...xs)-Math.min(...xs),spanZ:Math.max(...zs)-Math.min(...zs),valid,
          distant:birds.filter(d=>Math.hypot(d.x-park.start[0],d.z-park.start[1])>650).length};
      }
      return result;
    }""")
    for kind, data in result.items():
        assert data["valid"] and data["distant"] > 0, (kind, data)
        if kind != "shelduck":
            assert data["spanX"] > 600 and data["spanZ"] > 850, (kind, data)
    assert result["shelduck"]["count"] == 3
    assert not errors, errors
    print("PASS: all eight species occupy their habitats across the actual map", result)
    browser.close()

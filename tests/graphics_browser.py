"""Exercise shipped graphics in native Chrome; start the local HTTP server first."""

import io
import json
import os
import tempfile
from pathlib import Path

from PIL import Image, ImageChops, ImageStat
from playwright.sync_api import sync_playwright


base = os.environ.get("PARK_URL", "http://127.0.0.1:8791")
out = Path(os.environ.get("PARK_GRAPHICS_OUT", tempfile.mkdtemp(prefix="park-graphics-")))
out.mkdir(parents=True, exist_ok=True)
report = {}
errors = []


def ready(page, query):
    page.goto(base + "/park.html?" + query)
    page.wait_for_function("window.__stats?.car && __stats.streaming.pending === 0", timeout=90000)
    page.wait_for_timeout(2200)
    assert page.locator("#status").is_hidden()


def frame(page):
    return Image.open(io.BytesIO(page.locator("#c").screenshot())).convert("RGB")


def check_gl(page):
    result = page.evaluate("""() => {
      const gl=document.querySelector('#c').getContext('webgl2'),errors=[];
      for(let i=0;i<10;i++){const e=gl.getError();if(!e)break;errors.push(e);}
      return {errors,lost:gl.isContextLost(),antialias:gl.getContextAttributes().antialias};
    }""")
    assert not result["errors"] and not result["lost"], result
    return result


with sync_playwright() as p:
    browser = p.chromium.launch(channel="chrome", headless=True)
    page = browser.new_page(viewport={"width": 1440, "height": 900})
    page.on("pageerror", lambda e: errors.append(str(e)))
    ready(page, "preview=entrance&sound=0&grain=0")
    assert page.locator("#natural").is_checked()
    assert page.evaluate("__stats.mesh.triangles") > 30000, "solid trunks and bridge rails must render"
    assert page.evaluate("__stats.fps") >= 24
    page.screenshot(path=str(out / "entrance-natural.png"))
    report["desktop"] = page.evaluate("JSON.parse(JSON.stringify(__stats))")
    report["desktop"]["context"] = check_gl(page)

    # Use a real water-facing camera, away from overlays and moving wildlife.
    ready(page, "calibrate=1&x=7&z=-480&heading=1.57&sound=0&grain=0")
    page.evaluate("__calibrationCamera.y=3.4;__calibrationCamera.pitch=-.08")
    page.wait_for_timeout(150)
    first = frame(page).crop((280, 610, 1160, 850))
    page.wait_for_timeout(900)
    second = frame(page).crop((280, 610, 1160, 850))
    water_change = sum(ImageStat.Stat(ImageChops.difference(first, second)).mean) / 3
    assert water_change > .2, ("water animation is absent", water_change)
    report["water_animation_mean_delta"] = water_change
    page.screenshot(path=str(out / "river-natural.png"))

    # A sky-only view must contain an actual gradient/cloud pass, not a clear color.
    page.evaluate("__calibrationCamera.pitch=1.1;document.body.classList.remove('calibration')")
    page.wait_for_timeout(120)
    sky = frame(page).crop((450, 140, 1080, 500))
    natural_variation = max(ImageStat.Stat(sky).stddev)
    page.locator("#natural").uncheck()
    page.wait_for_timeout(120)
    flat_sky = frame(page).crop((450, 140, 1080, 500))
    flat_variation = max(ImageStat.Stat(flat_sky).stddev)
    assert natural_variation > 3 and flat_variation < 1, (natural_variation, flat_variation)
    report["sky_stddev"] = {"natural": natural_variation, "flat": flat_variation}
    page.locator("#natural").check()
    day_brightness = sum(ImageStat.Stat(frame(page)).mean)
    page.locator("#night").check()
    page.wait_for_timeout(120)
    night_brightness = sum(ImageStat.Stat(frame(page)).mean)
    assert night_brightness < day_brightness * .35
    page.locator("#night").uncheck()
    for palette in ["pico8", "gameboy", "cga", "mono", "accent", "source"]:
        page.select_option("#palette", palette)
        page.wait_for_timeout(80)
        check_gl(page)

    ready(page, "preview=entrance&sound=0&grain=0")
    page.keyboard.type("iddqd")
    page.wait_for_function("__doom().active")
    check_gl(page)
    page.screenshot(path=str(out / "doom-natural.png"))
    page.keyboard.type("iddqd")
    page.wait_for_function("!__doom().active")
    page.evaluate("__start('play')")
    start = page.evaluate("[__car.x,__car.z]")
    page.keyboard.down("w")
    page.wait_for_timeout(700)
    page.keyboard.up("w")
    end = page.evaluate("[__car.x,__car.z]")
    assert sum((a - b) ** 2 for a, b in zip(start, end)) > .05
    page.evaluate("""() => {
      __car.v=0;const b=__game.bottles[0];__car.x=b.x;__car.z=b.z;
    }""")
    page.wait_for_function("__game.found >= 1")
    report["gameplay"] = {"moved": True, "collected": page.evaluate("__game.found")}
    check_gl(page)

    mobile = browser.new_context(
        viewport={"width": 390, "height": 844},
        device_scale_factor=3, is_mobile=True, has_touch=True,
    )
    phone = mobile.new_page()
    phone.on("pageerror", lambda e: errors.append(str(e)))
    ready(phone, "preview=entrance&sound=0&grain=0")
    assert phone.evaluate("document.querySelector('#c').width") == 585, "high-DPI cost must be capped"
    assert phone.locator("#panel").evaluate("el=>el.classList.contains('hidden')")
    assert phone.evaluate("document.documentElement.scrollWidth <= innerWidth")
    assert phone.locator('#pad [data-k="up"]').is_visible()
    report["mobile"] = phone.evaluate("JSON.parse(JSON.stringify(__stats))")
    report["mobile"]["context"] = check_gl(phone)
    phone.screenshot(path=str(out / "mobile-natural.png"))
    phone.locator("#toggle").tap()
    phone.locator("#pix").evaluate("el=>{el.value=2;el.dispatchEvent(new Event('input',{bubbles:true}));}")
    assert phone.evaluate("document.querySelector('#c').width") == 195
    phone.locator("#pix").evaluate("el=>{el.value=1;el.dispatchEvent(new Event('input',{bubbles:true}));}")
    assert phone.evaluate("document.querySelector('#c').width") == 585
    phone.locator("#toggle").tap()
    before = phone.evaluate("__cam.top")
    phone.locator('#pad [data-k="view"]').tap()
    phone.wait_for_function("value=>__cam.top!==value", arg=before)
    check_gl(phone)
    assert not errors, errors
    report["page_errors"] = errors
    (out / "validation.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
    browser.close()

print(json.dumps({"screenshots": str(out), **report}, ensure_ascii=False, indent=2))

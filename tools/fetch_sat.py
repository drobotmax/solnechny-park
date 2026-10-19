# Download z18 satellite tiles (Esri World Imagery) for the park frame and
# stitch them into <dir>/mosaic.png + meta.txt for gen_park.py.
import math, os, sys, urllib.request
from PIL import Image
out = sys.argv[1]; os.makedirs(out, exist_ok=True)
S, W, N, E, z = 45.0005, 39.0475, 45.0128, 39.0605, 18
def tile(lat, lon):
    n = 2 ** z; la = math.radians(lat)
    return (lon + 180) / 360 * n, (1 - math.log(math.tan(la) + 1 / math.cos(la)) / math.pi) / 2 * n
(ax, ay), (bx, by) = tile(N, W), tile(S, E)
xs, ys = range(int(ax), int(bx) + 1), range(int(ay), int(by) + 1)
im = Image.new('RGB', (len(xs) * 256, len(ys) * 256))
for x in xs:
    for y in ys:
        p = f'{out}/t_{x}_{y}.jpg'
        if not os.path.exists(p):
            req = urllib.request.Request(f'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', headers={'User-Agent': 'pixel-park'})
            open(p, 'wb').write(urllib.request.urlopen(req, timeout=30).read())
        im.paste(Image.open(p), ((x - xs.start) * 256, (y - ys.start) * 256))
im.save(f'{out}/mosaic.png')
open(f'{out}/meta.txt', 'w').write(f'{z} {xs.start} {xs.stop} {ys.start} {ys.stop}')

# Build the pixel-park assets for park.html.
#
#   python3 tools/gen_park.py <osm.json> <poi_geom.json> <sat_dir> <out_dir>
#
# osm.json      - Overpass dump: roads, paths, water, landuse, buildings (out body + nodes)
# poi_geom.json - Overpass dump: rides, zoo, bridges, fences, monuments (out tags geom)
# sat_dir       - z18 satellite tiles stitched into mosaic.png + meta.txt
#                 ("z x0 x1 y0 y1"); used for tree cover and ground colours
#
# Writes:
#   ground.png - 0.4 m cells; low 5 bits = surface category, bit 5 = unreachable,
#                bit 6 = inside the park
#   albedo.jpg - satellite colour resampled onto the same cells
#   park.json  - frame, buildings, trees, rides, landmarks, props, start point
import json, sys, math, random
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

osm_path, poi_path, satdir, outdir = sys.argv[1:5]
d = json.load(open(osm_path))
poi = json.load(open(poi_path))
S, W, N, E = 45.0005, 39.0475, 45.0128, 39.0605
LAT0, LON0 = 45.0073079, 39.0543808          # the shared pin: local origin
KX = 111320 * math.cos(math.radians(LAT0)); KZ = 110540
MPP = 0.4
def loc(lat, lon): return ((lon - LON0) * KX, (LAT0 - lat) * KZ)   # x east, z south
x0, z0 = loc(N, W); x1, z1 = loc(S, E)
WPX, HPX = int((x1 - x0) / MPP), int((z1 - z0) / MPP)
nodes = {e['id']: (e['lat'], e['lon']) for e in d['elements'] if e['type'] == 'node'}
ways = {e['id']: e for e in d['elements'] if e['type'] == 'way'}
def tocell(x, z): return ((x - x0) / MPP, (z - z0) / MPP)
def px(n): return tocell(*loc(*nodes[n]))
def geom(e): return [loc(g['lat'], g['lon']) for g in e.get('geometry', []) if g]
r2 = lambda v: round(v, 2)

VOID, LAWN, PATH, ROAD, WATER, BUILDING, SAND, PITCH, WOOD, PARKING, OUTSIDE, PLAZA, RIDE, FENCE = range(14)
SOLID = (WATER, BUILDING, RIDE, FENCE)
img = Image.new('L', (WPX, HPX), OUTSIDE); dr = ImageDraw.Draw(img)

def rings(rel):
    """Join outer member ways of a multipolygon into closed rings."""
    segs = [list(ways[m['ref']]['nodes']) for m in rel['members']
            if m['type'] == 'way' and m['ref'] in ways and m.get('role', 'outer') in ('outer', '')]
    out = []
    while segs:
        ring = segs.pop(0); changed = True
        while ring[0] != ring[-1] and changed:
            changed = False
            for i, s in enumerate(segs):
                if s[0] == ring[-1]: ring += s[1:]
                elif s[-1] == ring[-1]: ring += s[::-1][1:]
                elif s[-1] == ring[0]: ring = s[:-1] + ring
                elif s[0] == ring[0]: ring = s[::-1][:-1] + ring
                else: continue
                segs.pop(i); changed = True; break
        out.append(ring)
    return out

def poly_cells(pts, cat):
    if len(pts) >= 3: dr.polygon(pts, fill=cat)
def poly(nids, cat): poly_cells([px(n) for n in nids if n in nodes], cat)
def line_cells(pts, cat, width_m):
    if len(pts) < 2: return
    w = max(1, int(round(width_m / MPP)))
    dr.line(pts, fill=cat, width=w, joint='curve')
    r = w / 2
    for x, y in pts: dr.ellipse([x - r, y - r, x + r, y + r], fill=cat)
def line(nids, cat, width_m): line_cells([px(n) for n in nids if n in nodes], cat, width_m)

T = lambda e: e.get('tags', {})
closed = lambda w: w['nodes'][0] == w['nodes'][-1]
park_ring = None
for w in ways.values():
    t = T(w)
    if t.get('leisure') == 'park' and closed(w):
        poly(w['nodes'], VOID); park_ring = [loc(*nodes[n]) for n in w['nodes'] if n in nodes]
for w in ways.values():
    t = T(w)
    if closed(w) and (t.get('natural') in ('wood', 'scrub') or t.get('landuse') == 'forest'): poly(w['nodes'], WOOD)
for w in ways.values():
    t = T(w)
    if not closed(w): continue
    if t.get('landuse') in ('grass', 'recreation_ground') or t.get('leisure') in ('common', 'garden'): poly(w['nodes'], LAWN)
    if t.get('leisure') == 'pitch': poly(w['nodes'], PITCH)
    if t.get('amenity') == 'parking': poly(w['nodes'], PARKING)
    if t.get('surface') == 'sand' and 'highway' not in t: poly(w['nodes'], SAND)

# Tree cover from the satellite: dark green, smoothed over ~1.6 m. Only on
# land OSM leaves unclassified (park interior, land outside the park).
sat_meta = list(map(int, open(satdir + '/meta.txt').read().split()))
mos = np.array(Image.open(satdir + '/mosaic.png').convert('RGB'))
jj, ii = np.meshgrid(np.arange(WPX), np.arange(HPX))
lon = LON0 + (x0 + (jj + 0.5) * MPP) / KX; lat = LAT0 - (z0 + (ii + 0.5) * MPP) / KZ
zt, tx0, _, ty0, _ = sat_meta; nn = 2 ** zt * 256; la = np.radians(lat)
SX = np.clip(((lon + 180) / 360 * nn - tx0 * 256).astype(int), 0, mos.shape[1] - 1)
SY = np.clip(((1 - np.log(np.tan(la) + 1 / np.cos(la)) / math.pi) / 2 * nn - ty0 * 256).astype(int), 0, mos.shape[0] - 1)
albedo = mos[SY, SX]
del jj, ii, lon, lat, la, SX, SY
f = albedo.astype(np.float32)
lum = f.mean(axis=2); gr = f[..., 1] - (f[..., 0] + f[..., 2]) / 2
def blur(a, r): return np.array(Image.fromarray(np.clip(a, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(r))).astype(np.float32)
Lb = blur(lum, 2); Gb = blur(gr + 64, 2) - 64
canopy = (Gb > 10) & (Lb < 62)
canopy = np.array(Image.fromarray((canopy * 255).astype(np.uint8)).filter(ImageFilter.MedianFilter(5))) > 127
green = (Gb > 10)

a = np.array(img)
park_mask = a == VOID
a[park_mask & canopy] = WOOD
a[park_mask & ~canopy & green] = LAWN
a[park_mask & ~canopy & ~green] = PLAZA
out_land = a == OUTSIDE
a[out_land & canopy] = WOOD
img = Image.fromarray(a).copy(); dr = ImageDraw.Draw(img)

for e in d['elements']:
    t = T(e)
    if t.get('natural') == 'water' or 'water' in t or t.get('waterway') in ('riverbank', 'dock'):
        if e['type'] == 'relation':
            for r in rings(e): poly(r, WATER)
        elif closed(e): poly(e['nodes'], WATER)
main_alleys = []
for w in ways.values():
    t = T(w); h = t.get('highway')
    if not h: continue
    if h in ('primary', 'secondary', 'tertiary', 'residential'): line(w['nodes'], ROAD, 9)
    elif h == 'service':
        line(w['nodes'], ROAD if t.get('service') != 'parking_aisle' else PARKING, 5)
        main_alleys.append(w)
    elif h == 'pedestrian':
        surface = ROAD if w['id'] == 176130542 or t.get('surface') == 'asphalt' else PATH
        if t.get('area') == 'yes' and closed(w): poly(w['nodes'], surface)
        else: line(w['nodes'], surface, 7)
        main_alleys.append(w)
    elif h in ('footway', 'path', 'track', 'cycleway', 'steps'):
        paved = t.get('surface') in ('asphalt', 'paving_stones', 'concrete', None)
        # Only the filmed portion of the western alley has a verified broad asphalt surface.
        if w['id'] == 176130555:
            line(w['nodes'][5:], PATH, 4)
            line(w['nodes'][:6], ROAD, 14)
        else:
            line(w['nodes'], ROAD if t.get('surface') == 'asphalt' else PATH, 4 if paved else 2.5)
        if paved and t.get('surface'): main_alleys.append(w)

# rides, fences, zoo
rides, fences, bridges = [], [], []
for e in poi['elements']:
    t = T(e); g = geom(e)
    if e['type'] != 'way' or len(g) < 2: continue
    cells = [tocell(*p) for p in g]
    if t.get('attraction') == 'amusement_ride' or t.get('tourism') == 'theme_park':
        if len(g) >= 4 and g[0] == g[-1]:
            poly_cells(cells, RIDE)
            rides.append({'pts': [[r2(x), r2(z)] for x, z in g[:-1]], 'name': t.get('name', ''),
                          'kind': 'coaster' if t.get('tourism') == 'theme_park' else 'ride'})
    if t.get('barrier') in ('fence', 'wall'):
        line_cells(cells, FENCE, 0.5)
        fences.append({'pts': [[r2(x), r2(z)] for x, z in g], 'h': 2.0 if t.get('barrier') == 'fence' else 1.6})
    if t.get('bridge') == 'yes' and t.get('highway'):
        width = float(t.get('width', 4 if t.get('highway') == 'footway' else 5))
        line_cells(cells, ROAD if t.get('surface') == 'asphalt' else PATH, width)
        bridges.append({'pts': [[r2(x), r2(z)] for x, z in g], 'w': width,
                        'osm_id': e['id'], 'kind': t['highway'], 'surface': t.get('surface', '')})

approach_way = ways[176130555]
approach = {'alley': [[r2(v) for v in loc(*nodes[n])] for n in approach_way['nodes'][:6]]}

buildings = []
for w in ways.values():
    t = T(w)
    if 'building' in t and closed(w):
        poly(w['nodes'], BUILDING)
        lv = t.get('building:levels')
        try: h = float(t.get('height') or (float(lv) * 3.2 if lv else 0)) or 0
        except ValueError: h = 0
        if not h: h = 4.5 if t.get('building') not in ('commercial', 'retail', 'public', 'apartments') else 9.0
        b = {'pts': [[r2(v) for v in loc(*nodes[n])] for n in w['nodes'][:-1] if n in nodes], 'h': round(h, 1)}
        if t.get('amenity') == 'planetarium': b['dome'] = True
        buildings.append(b)

a = np.array(img)

# start: on the main alley just inside the park from the north bridge
def nearest_cell(cat_mask, x, z, erode=7):
    core = np.array(Image.fromarray((cat_mask * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(erode))) > 0
    ii, jj = np.nonzero(core)
    cx, cz = jj * MPP + x0 + MPP / 2, ii * MPP + z0 + MPP / 2
    k = np.argmin((cx - x) ** 2 + (cz - z) ** 2)
    return float(cx[k]), float(cz[k])
walkable_road = (a == PATH) | (a == ROAD)
sx, sz = nearest_cell(walkable_road, *loc(45.01105, 39.05440))
heading = math.pi                                            # facing south, into the park

# reachability: flood from the start over non-solid land
walk = (~np.isin(a, SOLID)).astype(np.uint8) * 255
wimg = Image.fromarray(walk).copy()   # floodfill silently skips array-backed images
ImageDraw.floodfill(wimg, (int((sx - x0) / MPP), int((sz - z0) / MPP)), 128)
reach = np.array(wimg) == 128

# trees on the canopy, kept off paths/roads/buildings/water/rides
rng = random.Random(7)
block = np.isin(a, [PATH, ROAD, WATER, BUILDING, PITCH, PARKING, SAND, RIDE, FENCE, PLAZA]).astype(np.uint8)
blocked = np.array(Image.fromarray(block * 255).filter(ImageFilter.MaxFilter(5))) > 0   # ~0.8 m
in_park = np.zeros_like(blocked)
if park_ring:
    pm = Image.new('L', (WPX, HPX), 0); ImageDraw.Draw(pm).polygon([tocell(*p) for p in park_ring], fill=1); in_park = np.array(pm) > 0
trees = []
def try_tree(x, z, h, cr):
    i, j = int((z - z0) / MPP), int((x - x0) / MPP)
    if not (0 <= i < HPX and 0 <= j < WPX) or blocked[i, j]: return False
    trees.append([r2(x), r2(z), round(h, 1), round(cr, 1)]); return True
for step, inside in ((5.0, True), (7.5, False)):
    gx = x0
    while gx < x1:
        gz = z0
        while gz < z1:
            x, z = gx + rng.uniform(-2, 2), gz + rng.uniform(-2, 2)
            i, j = int((z - z0) / MPP), int((x - x0) / MPP)
            if 0 <= i < HPX and 0 <= j < WPX and bool(in_park[i, j]) == inside:
                c = a[i, j]
                if c == WOOD: try_tree(x, z, rng.uniform(12, 22) if inside else rng.uniform(10, 20), rng.uniform(3, 5.5) if inside else rng.uniform(3.5, 6))
                elif c in (LAWN, OUTSIDE) and rng.random() < 0.05: try_tree(x, z, rng.uniform(6, 12), rng.uniform(2, 3.5))
            gz += step
        gx += step
for w in ways.values():
    if T(w).get('natural') == 'tree_row':
        pts = [loc(*nodes[n]) for n in w['nodes'] if n in nodes]
        for (ax, az), (bx, bz) in zip(pts, pts[1:]):
            L = math.hypot(bx - ax, bz - az)
            for k in range(int(L // 6) + 1):
                fr = k * 6 / max(L, 1e-6); try_tree(ax + (bx - ax) * fr, az + (bz - az) * fr, rng.uniform(8, 12), 2.5)

# lamps along the main alleys
props = []
for w in main_alleys:
    pts = [loc(*nodes[n]) for n in w['nodes'] if n in nodes]
    carry, side = 0.0, 1
    width = 5 if T(w).get('highway') == 'service' else 4
    for (ax, az), (bx, bz) in zip(pts, pts[1:]):
        L = math.hypot(bx - ax, bz - az)
        if L < 1e-6: continue
        ux, uz = (bx - ax) / L, (bz - az) / L
        s = 14 - carry
        while s < L:
            side = -side
            off = width / 2 + 0.7
            x, z = ax + ux * s - uz * off * side, az + uz * s + ux * off * side
            i, j = int((z - z0) / MPP), int((x - x0) / MPP)
            if side > 0 and 0 <= i < HPX and 0 <= j < WPX and a[i, j] not in (WATER, BUILDING, RIDE, FENCE) and in_park[i, j]:
                props.append(['lamp', r2(x), r2(z), round(math.atan2(ux, -uz), 2)])
            s += 14
        carry = (carry + L) % 14

# landmarks from named POIs
def P(lat, lon): x, z = loc(lat, lon); return [r2(x), r2(z)]
landmarks, labels = [], []
for e in poi['elements']:
    t = T(e); nm = t.get('name', '')
    if e['type'] != 'node': continue
    p = P(e['lat'], e['lon'])
    if nm == 'Колесо обозрения': landmarks.append({'kind': 'wheel', 'at': p, 'd': 32}); labels.append([nm, p, 45])
    elif t.get('amenity') == 'fountain': landmarks.append({'kind': 'fountain', 'at': p}); labels.append(['Фонтан', p, 20])
    elif t.get('historic') == 'memorial': landmarks.append({'kind': 'monument', 'at': p}); labels.append([nm or 'Памятник', p, 25])
    elif 'Титан' in nm: landmarks.append({'kind': 'oak', 'at': p}); labels.append([nm, p, 30])
    elif t.get('amenity') == 'ferry_terminal': landmarks.append({'kind': 'pier', 'at': p}); labels.append([nm, p, 18])
for e in poi['elements']:
    t = T(e); g = geom(e)
    if e['type'] == 'way' and t.get('tourism') == 'zoo' and g:
        cx = sum(p[0] for p in g) / len(g); cz = sum(p[1] for p in g) / len(g); labels.append(['Сафари-парк', [r2(cx), r2(cz)], 90])
if rides:
    rx = [p[0] for r in rides for p in r['pts']]; rz = [p[1] for r in rides for p in r['pts']]
    labels.append(['Аттракционы', [r2(sum(rx) / len(rx)), r2(sum(rz) / len(rz))], 80])
for b in buildings:
    if b.get('dome'):
        cx = sum(p[0] for p in b['pts']) / len(b['pts']); cz = sum(p[1] for p in b['pts']) / len(b['pts'])
        labels.append(['Планетарий', [r2(cx), r2(cz)], 35])

out = a.copy()
land = ~np.isin(a, SOLID)
out[land & ~reach] |= 32
out[in_park] |= 64
Image.fromarray(out).save(outdir + '/ground.png', optimize=True)
Image.fromarray(albedo).save(outdir + '/albedo.jpg', quality=82)
json.dump({'mpp': MPP, 'x0': round(x0, 3), 'z0': round(z0, 3), 'w': WPX, 'h': HPX,
           'origin': [LAT0, LON0], 'start': [r2(sx), r2(sz), round(heading, 3)],
           'buildings': buildings, 'trees': trees, 'rides': rides, 'fences': fences, 'bridges': bridges,
           'approach': approach,
           'props': props, 'landmarks': landmarks, 'labels': labels},
          open(outdir + '/park.json', 'w'), separators=(',', ':'), ensure_ascii=False)
pal = [(30, 30, 30), (110, 170, 80), (225, 215, 195), (90, 90, 95), (40, 80, 170), (150, 120, 100),
       (220, 200, 140), (60, 160, 70), (25, 80, 30), (110, 110, 110), (70, 75, 55), (170, 165, 150), (220, 60, 160), (255, 255, 0)]
prev = np.array(pal, np.uint8)[a]
prev[land & ~reach] = (prev[land & ~reach] * 0.5).astype(np.uint8)
pv = Image.fromarray(prev); pd = ImageDraw.Draw(pv)
j, i = (sx - x0) / MPP, (sz - z0) / MPP; pd.ellipse([j - 10, i - 10, j + 10, i + 10], outline=(255, 0, 0), width=4)
pv.resize((WPX // 3, HPX // 3), Image.NEAREST).save(outdir + '/_preview.png')
print('raster', WPX, HPX, 'buildings', len(buildings), 'trees', len(trees), 'rides', len(rides), 'props', len(props),
      'landmarks', len(landmarks), 'labels', [l[0] for l in labels], 'start', r2(sx), r2(sz))

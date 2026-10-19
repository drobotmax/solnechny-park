"""Export registered sparse reconstructions as viewable SPZ v2 point clouds.

The normalized preview has arbitrary scale. It is not a trained Gaussian model.
"""
import gzip
import json
from pathlib import Path
import struct

import numpy as np
import pycolmap

root = Path(__file__).resolve().parents[1]
out = root / "captures/2026-10-19"
summary = json.loads((out / "reconstruction.json").read_text())
summary = [m for m in summary if m["registered"] >= 8 and m["points"] >= 100]
# Remove duplicate subsets from failed initialization fragments.
summary = [m for m in summary if not any(m is not other and set(m['images']) < set(other['images']) for other in summary)]
(out / "reconstruction.json").write_text(json.dumps(summary, indent=2))
scenes = {}
for entry in summary:
    model = pycolmap.Reconstruction(out / "sfm" / str(entry["model"]))
    points = [p for p in model.points3D.values() if p.error < 2 and p.track.length() >= 3]
    pos = np.array([p.xyz for p in points])
    rgb = np.array([p.color for p in points], np.uint8)
    images = [i for i in model.images.values() if i.has_pose]
    up = -np.mean([i.cam_from_world().rotation.matrix()[1] for i in images], axis=0)
    up /= np.linalg.norm(up)
    back = -images[0].cam_from_world().rotation.matrix()[2]
    back -= up * np.dot(up, back)
    back /= np.linalg.norm(back)
    right = np.cross(up, back)
    pos = pos @ np.stack([right, up, back], axis=1)
    pos -= [np.median(pos[:, 0]), np.percentile(pos[:, 1], 5), np.median(pos[:, 2])]
    scale = 18 / np.percentile(np.linalg.norm(pos[:, [0, 2]], axis=1), 90)
    pos *= scale
    keep = (np.linalg.norm(pos[:, [0, 2]], axis=1) < 32) & (abs(pos[:, 1]) < 25)
    pos, rgb = pos[keep], rgb[keep]
    n = len(pos)
    integer = np.rint(pos * 4096).astype(np.int32) & 0xffffff
    packed = np.stack([integer & 255, (integer >> 8) & 255, (integer >> 16) & 255], axis=-1).astype(np.uint8)
    colors = np.clip(np.rint(255 * (.5 + .15 * (rgb / 255 - .5) / .28209479)), 0, 255).astype(np.uint8)
    raw = struct.pack('<IIIBBBB', 0x5053474e, 2, n, 0, 12, 0, 0)
    raw += packed.tobytes() + bytes([255]) * n + colors.tobytes()
    raw += bytes([120]) * (3*n) + bytes([128]) * (3*n)
    assert len(raw) == 16 + 19*n
    coverage = set(name.split('/')[0] for name in entry['images'])
    key = 'videoEntrance' if coverage == {'6463'} else 'videoAlley' if coverage == {'6467'} else 'videoSquare'
    # Prefer the largest valid model for each preview selector.
    if key in scenes and scenes[key]['points'] >= n:
        continue
    title = {'videoEntrance': 'ВХОД · ИЗ ВИДЕО', 'videoAlley': 'АЛЛЕЯ · ИЗ ВИДЕО', 'videoSquare': 'ПЛОЩАДЬ И ВЫХОД · ИЗ ВИДЕО'}[key]
    if key == 'videoAlley':
        part = int(str(entry['model']).split('/')[-1])
        key += str(part)
        title = f'АЛЛЕЯ · ЧАСТЬ {part + 1}'
    file = out / (key + '.spz')
    file.write_bytes(gzip.compress(raw, mtime=0))
    scenes[key] = {'name': title, 'src': str(file.relative_to(root)), 'radius': 32,
                   'frame': {'cx': 0, 'cz': 0, 'ground': 0, 'top': float(min(15, np.percentile(pos[:,1], 90)))},
                   'units': 'условн. ед.', 'settings': {'fill': False, 'point': 2}, 'points': n}
(root / 'capture-scenes.js').write_text('// Local sparse SfM previews; normalized scale, not metric geometry.\nwindow.CAPTURE_SCENES = ' + json.dumps(scenes, ensure_ascii=False, indent=2) + ';\n')
print(json.dumps(scenes, ensure_ascii=False, indent=2))

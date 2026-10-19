"""Crop the two supplied SPZ v3 scans without changing their coordinate frame."""
import gzip
import json
import pathlib
import struct

import numpy as np
from PIL import Image, ImageDraw
from matplotlib.path import Path

ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / "captures/2026-10-19"


def prepare(source, key, center, polygon=None, radius=None):
    raw = gzip.decompress(source.read_bytes())
    magic, version, n = struct.unpack_from("<III", raw)
    assert magic == 0x5053474e and version == 3 and raw[12] == 3
    assert len(raw) == 16 + 65 * n, "Unexpected SPZ v3 layout"
    blocks, offset = [], 16
    for width in [9, 1, 3, 3, 4, 45]:
        blocks.append(np.frombuffer(raw, np.uint8, n * width, offset).reshape(n, width))
        offset += n * width
    a = blocks[0].reshape(n, 3, 3).astype(np.int32)
    p = a[:, :, 0] + (a[:, :, 1] << 8) + (a[:, :, 2] << 16)
    p = np.where(p >= 2**23, p - 2**24, p) / (2**raw[13])
    alpha = blocks[1][:, 0]
    size = np.exp(blocks[3].astype(np.float32).max(axis=1) / 16 - 10)
    mask = (alpha > 50) & (size < .25) & (p[:, 1] > -.35) & (p[:, 1] < 2.7)
    if polygon is not None:
        mask &= Path(polygon).contains_points(p[:, [0, 2]])
    else:
        mask &= np.linalg.norm(p[:, [0, 2]] - center, axis=1) < radius
    indices = np.flatnonzero(mask)
    # Keep the most opaque representative of each 3 cm voxel.
    indices = indices[np.argsort(alpha[indices])[::-1]]
    _, keep = np.unique(np.floor(p[indices] / .03).astype(np.int32), axis=0, return_index=True)
    indices = np.sort(indices[keep])
    header = bytearray(raw[:16])
    struct.pack_into("<I", header, 8, len(indices))
    cropped = bytes(header) + b"".join(b[indices].tobytes() for b in blocks)
    destination = OUT / f"fountain-{key}-crop.spz"
    destination.write_bytes(gzip.compress(cropped, compresslevel=6, mtime=0))
    rgb = np.clip(255 * (.5 + .28209479 * (blocks[2][indices] / 255 - .5) / .15), 0, 255).astype(np.uint8)
    points = p[indices] - [center[0], 0, center[1]]
    # A static orthographic preview of the real points, independent of browser UI.
    yaw, pitch = np.deg2rad([-35, 32])
    right = np.array([np.cos(yaw), 0, -np.sin(yaw)])
    up = np.array([np.sin(yaw)*np.sin(pitch), np.cos(pitch), np.cos(yaw)*np.sin(pitch)])
    depth = np.cross(right, up)
    q = points @ np.stack([right, up, depth], axis=1)
    lo, hi = np.percentile(q[:, :2], [0, 100], axis=0)
    scale = min(1080 / (hi[0]-lo[0]), 620 / (hi[1]-lo[1]))
    xy = (q[:, :2] - (lo+hi)/2) * scale + [640, 400]
    xy[:, 1] = 800 - xy[:, 1]
    im = Image.new("RGB", (1280, 800), (9, 12, 8))
    draw = ImageDraw.Draw(im)
    for i in np.argsort(q[:, 2]):
        x, y = xy[i]
        r = np.clip(size[indices[i]] * scale * .7, .8, 3.5)
        draw.rectangle((x-r, y-r, x+r, y+r), fill=tuple(rgb[i]))
    im.save(OUT / f"fountain-{key}-preview.jpg", quality=88)
    return {"source": str(source), "original_points": n, "cropped_points": len(indices),
            "crop": str(destination.relative_to(ROOT)), "center": center, "geolocation": None,
            "note": "Manual local crop; no world position or heading inferred."}


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    # Polygon picked from the orthographic inspection of the first flower bed.
    image_polygon = np.array([[334,632],[365,545],[396,488],[437,433],[477,390],
                              [528,385],[570,418],[558,474],[567,513],[552,554],
                              [509,593],[445,616],[382,637]], float)
    polygon = np.stack([3.9834+(image_polygon[:,0]-500)*.05,
                        4.2861+(500-image_polygon[:,1])*.05], axis=1)
    rows = [prepare(pathlib.Path.home()/"Downloads/Фонтан.spz", "a", [1.6, 3.6], polygon=polygon),
            prepare(pathlib.Path.home()/"Downloads/Untitled scan.spz", "b", [-1.7, -2.0], radius=3.7)]
    (OUT / "scans.json").write_text(json.dumps(rows, ensure_ascii=False, indent=2))
    print(json.dumps(rows, ensure_ascii=False, indent=2))

"""Reduce the supplied relief scan to a clean, faceted two-sided height field.

Usage: python3 tools/adapt-yesenin.py INPUT.spz [OUTPUT.js]
The SPZ remains local; only centimetre-scale sculpture surfaces are exported.
"""
import gzip
import json
from pathlib import Path
import struct
import sys

import numpy as np
from scipy import ndimage
from scipy.spatial import cKDTree


def adapt(source, destination):
    raw = gzip.decompress(Path(source).read_bytes())
    magic, version, n = struct.unpack_from('<III', raw)
    assert magic == 0x5053474e and version == 3, 'Expected SPZ v3'
    a = np.frombuffer(raw, np.uint8, n * 9, 16).reshape(n, 3, 3).astype(np.int32)
    p = a[:, :, 0] + (a[:, :, 1] << 8) + (a[:, :, 2] << 16)
    p = np.where(p >= 2**23, p - 2**24, p) / 2**raw[13]
    alpha = np.frombuffer(raw, np.uint8, n, 16 + n * 9)
    size = np.exp(np.frombuffer(raw, np.uint8, n * 3, 16 + n * 13).reshape(n, 3).max(axis=1).astype(float) / 16 - 10)
    # The measured relief sits above a rectangular pedestal, facing source +Z.
    keep = (alpha > 110) & (size < .045) & (abs(p[:, 0]) < .555) & (p[:, 1] > .205) & (p[:, 1] < 1.525) & (p[:, 2] > -.70) & (p[:, 2] < .19)
    p = p[keep]
    step, x0, y0, w, h = .025, -.575, .205, 47, 55
    yy, xx = np.mgrid[:h, :w]
    grid = np.c_[x0 + xx.ravel() * step, y0 + yy.ravel() * step]
    tree = cKDTree(p[:, :2])
    distances, _ = tree.query(grid)
    mask = (distances < .023).reshape(h, w)
    mask = ndimage.binary_fill_holes(ndimage.binary_closing(mask, structure=np.ones((3, 3)), border_value=0))
    front, back = np.full(w*h, np.nan), np.full(w*h, np.nan)
    for i, neighbours in enumerate(tree.query_ball_point(grid, .025)):
        if len(neighbours) >= 4:
            back[i], front[i] = np.percentile(p[neighbours, 2], [3, 97])
    for surface in [front, back]:
        surface.shape = (h, w)
        missing = ~np.isfinite(surface)
        nearest = ndimage.distance_transform_edt(missing, return_distances=False, return_indices=True)
        surface[missing] = surface[tuple(nearest[:, missing])]
        surface[:] = ndimage.gaussian_filter(surface, .50)
    # Both sheets meet around the silhouette, closing the volume without floaters.
    edge = mask & ~ndimage.binary_erosion(mask)
    middle = (front + back) / 2
    front[edge], back[edge] = middle[edge], middle[edge]
    def values(surface):
        return [round(round(float(v) / .005) * .005, 3) if inside else None for v, inside in zip(surface.ravel(), mask.ravel())]
    shape = {'step': step, 'x0': x0, 'y0': y0, 'width': w, 'height': h,
             'front': values(front), 'back': values(back)}
    payload = json.dumps(shape, separators=(',', ':'))
    Path(destination).write_text('// Faceted relief sampled from the supplied scan; no scan colours or background.\n'
        '(function(root){\n\'use strict\';\nconst shape=' + payload + ';\n'
        'if(typeof module!==\'undefined\'&&module.exports)module.exports=shape;else root.ParkYeseninShape=shape;\n'
        '})(typeof window!==\'undefined\'?window:globalThis);\n')
    print(json.dumps({'source_points': n, 'sculpture_points': len(p), 'surface_samples': int(mask.sum()) * 2,
                      'output_bytes': Path(destination).stat().st_size}))


if __name__ == '__main__':
    root = Path(__file__).resolve().parents[1]
    adapt(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else root / 'park-yesenin-shape.js')

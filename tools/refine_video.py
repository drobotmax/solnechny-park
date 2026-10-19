"""Retry forward-motion clips with a smaller initialization baseline."""
import collections
import json
from pathlib import Path

import pycolmap

root = Path(__file__).resolve().parents[1] / "captures/2026-10-19"
summary = [m for m in json.loads((root / "reconstruction.json").read_text()) if m["points"] > 100]
for clip in ["6463", "6467"]:
    options = pycolmap.IncrementalPipelineOptions()
    options.num_threads = 4
    options.image_names = sorted(str(p.relative_to(root / "images")) for p in (root / "images" / clip).glob("*.jpg"))
    options.min_model_size = 8
    options.max_num_models = 4
    options.mapper.init_min_tri_angle = 4
    options.mapper.init_max_forward_motion = .99
    options.max_runtime_seconds = 300
    options.random_seed = 0
    destination = root / "sfm" / ("refine-" + clip)
    destination.mkdir(exist_ok=True)
    models = pycolmap.incremental_mapping(root / "database.db", root / "images", destination, options=options)
    candidates = []
    for idx, model in models.items():
        if model.num_points3D() < 100:
            continue
        key = f"refine-{clip}/{idx}"
        model.export_PLY(root / f"model-{clip}-{idx}.ply")
        candidates.append({"model": key, "registered": model.num_reg_images(), "points": model.num_points3D(),
                           "error_px": model.compute_mean_reprojection_error(),
                           "images": sorted(i.name for i in model.images.values() if i.has_pose)})
    old = [m for m in summary if all(n.startswith(clip + "/") for n in m["images"])]
    coverage = lambda models: len(set(n for m in models for n in m["images"]))
    if coverage(candidates) > coverage(old):
        summary = [m for m in summary if m not in old] + candidates
    (root / "reconstruction.json").write_text(json.dumps(summary, indent=2))
    print(clip, [(m["registered"], m["points"]) for m in candidates], flush=True)
print("Coverage", dict(collections.Counter(n.split('/')[0] for n in set(n for m in summary for n in m['images']))))

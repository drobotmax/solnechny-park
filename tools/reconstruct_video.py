"""Build a local, sparse SfM pilot from the park videos (pycolmap 4.2.1)."""
import argparse
import json
import pathlib
import subprocess
import time

import numpy as np
from PIL import Image
import pycolmap

CLIPS = {"6463": "Вход и мост", "6465": "Площадь после моста",
         "6467": "Главная аллея", "6468": "Выход к мосту", "6469": "Выход из парка"}


def hlg_to_srgb(rgb):
    """Convert BT.2020 HLG to an SDR preview, with a luminance shoulder."""
    e = rgb.astype(np.float32) / 65535
    a, b, c = .17883277, .28466892, .55991073
    linear = np.where(e <= .5, e * e / 3, (np.exp((e - c) / a) + b) / 12)
    linear = np.power(linear, 1.2) * 10
    linear = linear @ np.array([[1.6605, -.1246, -.0182], [-.5876, 1.1329, -.1006],
                                [-.0728, -.0083, 1.1187]], np.float32)
    luminance = np.maximum(linear @ np.array([.2126, .7152, .0722]), 0)
    linear = np.clip(linear / (1 + luminance[..., None]), 0, 1)
    srgb = np.where(linear <= .0031308, 12.92 * linear, 1.055 * linear ** (1/2.4) - .055)
    return np.uint8(np.clip(srgb * 255 + .5, 0, 255))


def extract(downloads, output):
    images = output / "images"
    images.mkdir(exist_ok=True, parents=True)
    manifest = []
    for clip, title in CLIPS.items():
        src = downloads / f"IMG_{clip}.MOV"
        probe = json.loads(subprocess.check_output([
            "ffprobe", "-v", "quiet", "-show_format", "-show_streams", "-of", "json", str(src)]))
        stream = next(s for s in probe["streams"] if s["codec_type"] == "video")
        rate = 4 if clip == "6465" else 1.5
        row = {"id": clip, "title": title, "source": str(src),
               "duration": float(probe["format"]["duration"]),
               "tags": probe["format"]["tags"], "video": stream, "sample_fps": rate}
        folder = images / clip
        folder.mkdir(exist_ok=True)
        width, height = 1280, 720
        cmd = ["ffmpeg", "-v", "error", "-i", str(src), "-vf", f"fps={rate},scale={width}:{height}",
               "-f", "rawvideo", "-pix_fmt", "rgb48le", "-threads", "2", "pipe:1"]
        process = subprocess.Popen(cmd, stdout=subprocess.PIPE)
        frame_bytes = width * height * 6
        count = 0
        while True:
            raw = process.stdout.read(frame_bytes)
            if not raw:
                break
            if len(raw) != frame_bytes:
                raise RuntimeError("Truncated decoded video frame")
            rgb = np.frombuffer(raw, dtype="<u2").reshape(height, width, 3)
            converted = hlg_to_srgb(rgb) if stream.get("color_transfer") == "arib-std-b67" else (rgb / 257).astype(np.uint8)
            Image.fromarray(converted).save(folder / f"{count:05d}.jpg", quality=92)
            count += 1
        if process.wait() != 0:
            raise RuntimeError(f"ffmpeg failed for {src}")
        row["frames"] = count
        manifest.append(row)
        print(f"{clip}: {count} SDR frames", flush=True)
    (output / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2))


def reconstruct(output, clips):
    database = output / "database.db"
    images = output / "images"
    extraction = pycolmap.FeatureExtractionOptions()
    extraction.num_threads = 4
    extraction.max_image_size = 1280
    extraction.sift.max_num_features = 4096
    for clip in clips:
        names = sorted(str(p.relative_to(images)) for p in (images / clip).glob("*.jpg"))
        pycolmap.extract_features(database, images, image_names=names,
                                  camera_mode=pycolmap.CameraMode.PER_FOLDER,
                                  reader_options={"camera_model": "SIMPLE_RADIAL"},
                                  extraction_options=extraction, device=pycolmap.Device.cpu)
    matching = pycolmap.FeatureMatchingOptions()
    matching.num_threads = 4
    pairing = pycolmap.SequentialPairingOptions()
    pairing.overlap = 8
    pairing.quadratic_overlap = True
    pairing.loop_detection = False
    pycolmap.match_sequential(database, matching_options=matching, pairing_options=pairing,
                             device=pycolmap.Device.cpu)
    sfm = output / "sfm"
    sfm.mkdir(exist_ok=True)
    opts = pycolmap.IncrementalPipelineOptions()
    opts.num_threads = 4
    opts.min_model_size = 8
    opts.max_num_models = 8
    opts.max_runtime_seconds = 900
    opts.random_seed = 0
    models = pycolmap.incremental_mapping(database, images, sfm, options=opts)
    summary = []
    for idx, model in models.items():
        model.export_PLY(output / f"model-{idx}.ply")
        summary.append({"model": idx, "registered": model.num_reg_images(),
                        "points": model.num_points3D(), "error_px": model.compute_mean_reprojection_error(),
                        "images": sorted(i.name for i in model.images.values() if i.has_pose)})
    (output / "reconstruction.json").write_text(json.dumps(summary, indent=2))
    print(json.dumps(summary, indent=2), flush=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=pathlib.Path, required=True)
    parser.add_argument("--downloads", type=pathlib.Path, default=pathlib.Path.home() / "Downloads")
    parser.add_argument("--extract", action="store_true")
    parser.add_argument("--clips", nargs="+", default=list(CLIPS))
    args = parser.parse_args()
    start = time.time()
    if args.extract:
        extract(args.downloads, args.output)
    reconstruct(args.output, args.clips)
    print(f"Elapsed: {time.time() - start:.1f}s", flush=True)

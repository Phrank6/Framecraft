#!/usr/bin/env python3
"""
FrameCraft asset pipeline runner, v1 (task T3.1)

Run it from a normal terminal with plain Python 3. No Blender window and no bpy needed.
For each input file it:
  1. finds Blender and runs normalize_asset.py in the background
     (scale, pivot, facing, checks, GLB export)
  2. runs `gltf-transform optimize` to shrink the GLB
  3. records the file sizes before and after, and saves one JSON report per asset

Examples:
  python run_normalize.py --input raw/chair.glb --output out/prop_chair_wood_01.glb
  python run_normalize.py --input raw/t_centimeters.glb --output out/prop_test_centimeters_02.glb --scale 0.01
  python run_normalize.py --input raw/t_faces_plus_x.glb --output out/prop_faces_plus_x_01.glb --front=+X
  python run_normalize.py --input raw/ --output out/        (a whole folder, same settings for each file)

Notes:
  - Write --front with an equals sign when it starts with a minus: --front=-X
  - normalize_asset.py must sit in the same folder as this file (or pass --script)
  - Needs Node.js with:  npm install --global @gltf-transform/cli
  - Per asset you get three files in the output folder:
        out/<name>.glb                              the final, optimized file
        out/<name>.report.json                      combined report (sizes, checks)
        out/<name>.catalog.json                     asset catalog template
        out/_normalized/<name>.glb                  the normalized file BEFORE compression
        
    Keep the _normalized copy: it opens in any viewer, with no decoders needed,
    so you can compare "before" and "after" by eye.
"""
import argparse
import glob
import json
import os
import platform
import shlex
import shutil
import subprocess
import sys
from pathlib import Path

INPUT_EXTS = {".glb", ".gltf", ".fbx", ".obj"}
HERE = Path(__file__).resolve().parent

BLENDER_HELP = """ERROR: could not find Blender.
Tell this script where it is, any one of these ways:
  --blender "C:\\path\\to\\blender.exe"
  set the environment variable BLENDER_PATH to that path
  add Blender's folder to your PATH
To find the path: open Blender, go to the Scripting workspace, and type this in the
Python console:   import bpy; bpy.app.binary_path
On Steam: right-click Blender in your library > Manage > Browse local files."""

GLTF_HELP = """ERROR: could not find gltf-transform (or npx).
Install Node.js (LTS) from nodejs.org, then run:
  npm install --global @gltf-transform/cli
Or re-run with --no-optimize to skip compression."""


def parse_args():
    p = argparse.ArgumentParser(description="Normalize and compress FrameCraft assets.")
    p.add_argument("--input", required=True, help="a 3D file, or a folder of files")
    p.add_argument("--output", required=True, help="output .glb (one file) or output folder")
    p.add_argument("--category", choices=["prop", "human"], default="prop")
    p.add_argument("--front", choices=["-Y", "+Y", "+X", "-X"],
                   help="direction the model faces in Blender now; write it as --front=-X")
    size = p.add_mutually_exclusive_group()
    size.add_argument("--scale", type=float, help="uniform scale multiplier (e.g. 0.01)")
    size.add_argument("--target-height", type=float, help="final height in meters")
    p.add_argument("--compress", choices=["meshopt", "draco", "false"], default="meshopt",
                   help="mesh compression (default meshopt)")
    p.add_argument("--texture-compress", choices=["webp", "ktx2", "false"], default="webp",
                   help="texture compression (ktx2 needs KTX-Software installed)")
    p.add_argument("--texture-size", type=int, default=2048, help="max texture size in pixels")
    p.add_argument("--gltf-transform-args", default="",
                   help='extra flags passed to optimize, in quotes, e.g. "--simplify false"')
    p.add_argument("--no-optimize", action="store_true", help="skip gltf-transform")
    p.add_argument("--blender", help="path to the Blender executable")
    p.add_argument("--script", default=str(HERE / "normalize_asset.py"),
                   help="path to normalize_asset.py")
    return p.parse_args()


# ---------------------------------------------------------------- finding the tools
def find_blender(cli_value):
    candidates = []
    if cli_value:
        candidates.append(cli_value)
    if os.environ.get("BLENDER_PATH"):
        candidates.append(os.environ["BLENDER_PATH"])
    on_path = shutil.which("blender")
    if on_path:
        candidates.append(on_path)

    system = platform.system()
    if system == "Windows":
        roots = [os.environ.get("ProgramFiles", r"C:\Program Files"),
                 os.environ.get("ProgramFiles(x86)", r"C:\Program Files (x86)")]
        for root in roots:
            pattern = os.path.join(root, "Blender Foundation", "Blender*", "blender.exe")
            candidates += sorted(glob.glob(pattern), reverse=True)  # newest version first
            candidates.append(os.path.join(root, "Steam", "steamapps", "common", "Blender", "blender.exe"))
    elif system == "Darwin":
        candidates += [
            "/Applications/Blender.app/Contents/MacOS/Blender",
            os.path.expanduser("~/Library/Application Support/Steam/steamapps/common/Blender/"
                               "Blender.app/Contents/MacOS/Blender"),
        ]
    else:
        candidates += ["/usr/bin/blender", "/snap/bin/blender",
                       os.path.expanduser("~/.steam/steam/steamapps/common/Blender/blender")]

    for path in candidates:
        if path and os.path.isfile(path):
            return path
    return None


def find_gltf_transform():
    exe = shutil.which("gltf-transform")
    if exe:
        return [exe]
    npx = shutil.which("npx")
    if npx:
        return [npx, "--yes", "@gltf-transform/cli"]  # slower: downloads on first use
    return None


# ---------------------------------------------------------------- running things
def run(cmd):
    return subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace")


def tail(text, lines=25):
    return "\n".join(text.strip().splitlines()[-lines:])


def run_normalize(blender, script, src, dst, report_file, args):
    cmd = [blender, "--background", "--factory-startup", "--python", str(script), "--",
           "--input", str(src), "--output", str(dst), "--report", str(report_file),
           "--category", args.category]
    if args.front:
        cmd.append(f"--front={args.front}")  # equals form so "-X" is not read as a flag
    if args.scale is not None:
        cmd += ["--scale", str(args.scale)]
    if args.target_height is not None:
        cmd += ["--target-height", str(args.target_height)]
    return run(cmd)


def run_optimize(gt, src, dst, args):
    cmd = gt + ["optimize", str(src), str(dst),
                "--compress", args.compress,
                "--texture-compress", args.texture_compress,
                "--texture-size", str(args.texture_size)]
    cmd += shlex.split(args.gltf_transform_args)
    return run(cmd)


# ---------------------------------------------------------------- one asset
def process(src, final, blender, script, gt, args):
    result = {"name": final.name, "status": "FAILED", "tris": None, "raw": None,
              "opt": None, "pct": None}
    norm_dir = final.parent / "_normalized"
    norm_dir.mkdir(parents=True, exist_ok=True)
    norm = norm_dir / final.name
    norm_report = norm_dir / (final.stem + ".normalize_report.json")
    combined_report = final.parent / (final.stem + ".report.json")

    # Remove stale outputs so an old file can never look like a new success.
    for old in (norm, norm_report, final, combined_report):
        old.unlink(missing_ok=True)

    print(f"\n--- {src.name} -> {final.name}")

    # Step 1: normalize in Blender
    res = run_normalize(blender, script, src, norm, norm_report, args)
    for line in res.stdout.splitlines():
        if line.startswith(("WARNING:", "NOTE:", "FRAMECRAFT ERROR")):
            print("   ", line)
    if res.returncode != 0 or not norm.exists() or not norm_report.exists():
        print("    normalize step FAILED. Last lines of Blender output:")
        print(tail(res.stdout + "\n" + res.stderr))
        return result

    with open(norm_report) as f:
        report = json.load(f)
    raw_size = norm.stat().st_size

    # Step 2: compress
    if args.no_optimize:
        shutil.copyfile(norm, final)
    else:
        res = run_optimize(gt, norm, final, args)
        if res.returncode != 0 or not final.exists():
            print("    gltf-transform step FAILED. Last lines of its output:")
            print(tail(res.stdout + "\n" + res.stderr))
            result.update(tris=report.get("triangles"), raw=raw_size)
            return result
    opt_size = final.stat().st_size

    # Step 3: record sizes and save the combined report
    pct = (1 - opt_size / raw_size) * 100 if raw_size else 0.0
    report["file"] = final.name
    report["size_bytes_raw"] = raw_size
    report["size_bytes_optimized"] = opt_size
    report["size_reduction_pct"] = round(pct, 1)
    report["optimize_settings"] = None if args.no_optimize else {
        "compress": args.compress, "texture_compress": args.texture_compress,
        "texture_size": args.texture_size, "extra": args.gltf_transform_args}
    with open(combined_report, "w") as f:
        json.dump(report, f, indent=2)

    # Step 4: generate a catalog template for manual completion
    catalog_file = final.parent / (final.stem + ".catalog.json")

    catalog = {
        "id": final.stem,
        "name": "",

        "assetFile": final.name,

        "category": args.category,

        "tags": ["ADD_TAGS"],

        "dimensions_m": report.get("dimensions_m", {}),

        "triangles": report.get("triangles"),

        "fileSizeBytes": opt_size,

        "license": "ADD_LICENSE",

        "sourceUrl": "ADD_SOURCE_URL"
    }

    with open(catalog_file, "w") as f:
        json.dump(catalog, f, indent=2)

    result.update(
        status=report.get("status", "?"),
        tris=report.get("triangles"),
        raw=raw_size,
        opt=opt_size,
        pct=pct
    )

    return result



# ---------------------------------------------------------------- jobs and summary
def build_jobs(src, out):
    if src.is_dir():
        files = sorted(f for f in src.iterdir()
                       if f.suffix.lower() in INPUT_EXTS and not f.name.startswith("_"))
        if not files:
            sys.exit(f"ERROR: no .glb/.gltf/.fbx/.obj files found in {src}")
        return [(f, out / (f.stem + ".glb")) for f in files]
    if src.suffix.lower() not in INPUT_EXTS:
        sys.exit(f"ERROR: unsupported input format '{src.suffix}' (use .glb, .gltf, .fbx or .obj)")
    final = out if out.suffix.lower() == ".glb" else out / (src.stem + ".glb")
    return [(src, final)]


def kb(n):
    return "-" if n is None else f"{n / 1024:,.1f}"


def print_summary(results):
    print("\n=== Summary ===")
    header = f"{'file':<38}{'status':<8}{'tris':>8}{'raw KB':>10}{'opt KB':>10}{'smaller':>9}"
    print(header)
    print("-" * len(header))
    for r in results:
        pct = "-" if r["pct"] is None else f"{r['pct']:.0f}%"
        tris = "-" if r["tris"] is None else str(r["tris"])
        print(f"{r['name']:<38}{r['status']:<8}{tris:>8}{kb(r['raw']):>10}{kb(r['opt']):>10}{pct:>9}")
    print("\nPASS = no warnings. CHECK = read the warnings above. FAILED = a step stopped.")
    print("Very small files can grow slightly: compression adds fixed overhead.")


def main():
    args = parse_args()
    src = Path(args.input).expanduser().resolve()
    out = Path(args.output).expanduser().resolve()
    script = Path(args.script).expanduser().resolve()

    if not src.exists():
        sys.exit(f"ERROR: input not found: {src}")
    if not script.exists():
        sys.exit(f"ERROR: normalize_asset.py not found at {script} (use --script)")
    blender = find_blender(args.blender)
    if not blender:
        sys.exit(BLENDER_HELP)
    gt = None
    if not args.no_optimize:
        gt = find_gltf_transform()
        if not gt:
            sys.exit(GLTF_HELP)

    print(f"Blender:         {blender}")
    print(f"gltf-transform:  {'skipped (--no-optimize)' if gt is None else ' '.join(gt)}")

    results = []
    for in_file, final in build_jobs(src, out):
        if in_file == final:
            print(f"\n--- {in_file.name}: output path equals input path, skipping")
            results.append({"name": final.name, "status": "FAILED", "tris": None,
                            "raw": None, "opt": None, "pct": None})
            continue
        results.append(process(in_file, final, blender, script, gt, args))

    print_summary(results)
    if gt is not None and args.compress != "false":
        print("\nReminder: loading compressed GLBs in three.js needs MeshoptDecoder (or DRACOLoader),"
              "\nand KTX2Loader if you used ktx2 textures.")
    sys.exit(1 if any(r["status"] == "FAILED" for r in results) else 0)


if __name__ == "__main__":
    main()
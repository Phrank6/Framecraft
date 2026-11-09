"""
FrameCraft asset normalizer, v1 (task T3.1)

Takes one 3D file, makes it follow the FrameCraft asset standard, and exports a GLB:
  - real-world meters (1 unit = 1 m)
  - pivot (origin) at floor center: bottom of the bounding box, centered on the footprint
  - front of the object pointing the right way (+Z in the exported glTF)
  - a report with size, triangle count, and texture checks

Run it from a terminal, no Blender window needed:

  blender --background --python normalize_asset.py -- \
      --input raw/chair.glb --output out/prop_chair_wood_01.glb --category prop

Common options (everything after the lone "--" belongs to this script, not to Blender):
  --category prop|human    which triangle budget and height range to check against
  --front -Y|+Y|+X|-X      which way the model faces INSIDE BLENDER right now (default -Y)
  --scale 0.01             multiply the size (e.g. a model that came in as centimeters)
  --target-height 0.9      scale uniformly so the model is exactly this tall, in meters
  --report out/chair.json  also write the report as a JSON file

Axis cheat sheet (the classic confusion):
  Blender is Z-up and its models face -Y by default.
  The glTF exporter converts that to Y-up with the front on +Z. So in this script
  "floor" means lowest Z, and "front" means the -Y side. The standard's
  "+Y up, +Z forward" is true in the exported file.
  If a glTF you imported faces -Z in glTF terms, it faces +Y in Blender: use --front +Y.

Not handled in v1 (the script stops or warns instead of guessing):
  - rigged models (with a skeleton): needs a human to check, so the script stops
  - facing direction is NOT auto-detected; look at the result and use --front if wrong
  - joining parts, texture resizing, and compression (compression is the Tuesday step)
"""
import argparse
import json
import math
import os
import re
import sys

import bmesh
import bpy
import numpy as np
from mathutils import Matrix

# ---- Standard v1 numbers (adjustable, keep in sync with the written standard) ----
TRIANGLE_BUDGET = {"prop": 20000, "human": 60000}
HEIGHT_RANGE_M = {"prop": (0.02, 3.0), "human": (1.4, 2.1)}  # plausibility check only
MAX_TEXTURE_PX = 2048
NAME_PATTERN = re.compile(r"^[a-z][a-z0-9]*(_[a-z0-9]+)*_\d{2}\.glb$")  # prop_table_round_01.glb

# Rotation about Blender's Z axis that turns the model's current front into -Y.
FRONT_TO_ROTATION_DEG = {"-Y": 0, "+Y": 180, "+X": -90, "-X": 90}


def fail(message):
    print(f"FRAMECRAFT ERROR: {message}")
    sys.exit(2)


def parse_args():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    p = argparse.ArgumentParser(description="Normalize one 3D asset to the FrameCraft standard.")
    p.add_argument("--input", required=True, help="source file (.glb, .gltf, .fbx, .obj)")
    p.add_argument("--output", required=True, help="destination .glb")
    p.add_argument("--category", choices=sorted(TRIANGLE_BUDGET), default="prop")
    p.add_argument("--front", choices=sorted(FRONT_TO_ROTATION_DEG), default=None,
                   help="direction the model faces in Blender now (default -Y, unconfirmed)")
    size = p.add_mutually_exclusive_group()
    size.add_argument("--scale", type=float, default=1.0, help="uniform scale multiplier")
    size.add_argument("--target-height", type=float, default=None, help="final height in meters")
    p.add_argument("--report", default=None, help="optional path for a JSON report")
    return p.parse_args(argv)


# ---------------------------------------------------------------- import / export
def import_model(path):
    ext = os.path.splitext(path)[1].lower()
    if ext in (".glb", ".gltf"):
        bpy.ops.import_scene.gltf(filepath=path)
    elif ext == ".fbx":
        bpy.ops.import_scene.fbx(filepath=path)
    elif ext == ".obj":
        bpy.ops.wm.obj_import(filepath=path)
    else:
        fail(f"unsupported input format '{ext}' (use .glb, .gltf, .fbx or .obj)")


def export_glb(path):
    os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=path,
        export_format="GLB",
        export_yup=True,        # Blender Z-up -> glTF Y-up (front -Y -> +Z)
        export_apply=True,      # bake modifiers into the mesh
        export_animations=False,
    )


# ---------------------------------------------------------------- geometry helpers
def vertex_array(mesh):
    """All vertex positions of a mesh as an (n, 3) numpy array."""
    n = len(mesh.vertices)
    co = np.empty(n * 3, dtype=np.float32)
    mesh.vertices.foreach_get("co", co)
    return co.reshape(n, 3)


def bbox_of(objs, matrices):
    """Bounding box (min, max) of all objects after applying the given 4x4 matrices."""
    lo = np.full(3, np.inf)
    hi = np.full(3, -np.inf)
    for obj in objs:
        m = np.array(matrices[obj.name])
        pts = vertex_array(obj.data) @ m[:3, :3].T + m[:3, 3]
        lo = np.minimum(lo, pts.min(axis=0))
        hi = np.maximum(hi, pts.max(axis=0))
    return lo, hi


def flip_faces(mesh):
    """Mirroring (negative scale) turns faces inside out; flip them back."""
    bm = bmesh.new()
    bm.from_mesh(mesh)
    bmesh.ops.reverse_faces(bm, faces=bm.faces[:])
    bm.to_mesh(mesh)
    bm.free()


def bake_transform(obj, matrix):
    """Write the final world transform into the vertices and reset the object transform.

    After this the object sits at (0, 0, 0) with scale 1 and no parent, so the
    pivot is the world origin and the mesh coordinates ARE the real-world meters.
    """
    if obj.data.users > 1:
        obj.data = obj.data.copy()  # don't transform a mesh shared with another object
    obj.parent = None
    obj.data.transform(matrix)
    obj.matrix_world = Matrix.Identity(4)
    if matrix.determinant() < 0:
        flip_faces(obj.data)
    obj.data.update()


# ---------------------------------------------------------------- checks
def triangle_count(meshes):
    total = 0
    for obj in meshes:
        obj.data.calc_loop_triangles()
        total += len(obj.data.loop_triangles)
    return total


def texture_info():
    sizes = []
    for img in bpy.data.images:
        w, h = img.size
        if w > 0 and h > 0:
            sizes.append((img.name, w, h))
    return sizes


def is_power_of_two(n):
    return n > 0 and (n & (n - 1)) == 0


# ---------------------------------------------------------------- main
def main():
    args = parse_args()
    warnings, notes = [], []

    # Start from an empty scene so nothing from a previous session leaks in.
    bpy.ops.wm.read_factory_settings(use_empty=True)
    units = bpy.context.scene.unit_settings
    units.system = "METRIC"
    units.scale_length = 1.0  # 1 Blender unit = 1 meter

    import_model(args.input)
    bpy.context.view_layer.update()

    if any(o.type == "ARMATURE" for o in bpy.data.objects):
        fail("this model has a skeleton (rigged). v1 does not normalize rigged models; "
             "check scale, pivot and rest pose by hand (see the T3.3 character test).")

    meshes = [o for o in bpy.data.objects if o.type == "MESH" and len(o.data.vertices) > 0]
    if not meshes:
        fail("no mesh objects found in the input file")

    # 1) Remember where every mesh really is in the world (parents included).
    world = {o.name: o.matrix_world.copy() for o in meshes}

    # 2) Fix facing: rotate about Z so the front ends up on -Y (which exports as +Z).
    if args.front is None:
        notes.append("Facing not confirmed: check that the front faces +Z in the viewer, "
                     "then re-run with --front if it does not.")
    rotation = Matrix.Rotation(math.radians(FRONT_TO_ROTATION_DEG[args.front or "-Y"]), 4, "Z")
    rotated = {name: rotation @ m for name, m in world.items()}

    # 3) Fix size.
    lo, hi = bbox_of(meshes, rotated)
    height_before = float(hi[2] - lo[2])
    scale = args.scale
    if args.target_height:
        if height_before <= 0:
            fail("model has zero height, cannot scale to a target height")
        scale = args.target_height / height_before
    lo, hi = lo * scale, hi * scale

    # 4) Fix pivot: shift so the footprint center is at X=0, Y=0 and the bottom is at Z=0.
    offset = (-(lo[0] + hi[0]) / 2.0, -(lo[1] + hi[1]) / 2.0, -lo[2])
    final = Matrix.Translation(offset) @ Matrix.Scale(scale, 4) @ rotation
    for obj in meshes:
        bake_transform(obj, final @ world[obj.name])

    # Remove everything that is not a mesh (empties, lights, cameras...).
    dropped = [o for o in bpy.data.objects if o not in meshes]
    odd = sorted({o.type for o in dropped} - {"EMPTY", "LIGHT", "CAMERA"})
    if odd:
        warnings.append(f"dropped unsupported object types: {', '.join(odd)}")
    for obj in dropped:
        bpy.data.objects.remove(obj, do_unlink=True)

    # 5) Verify the result from the actual vertices, not from what we intended.
    identity = {o.name: Matrix.Identity(4) for o in meshes}
    lo, hi = bbox_of(meshes, identity)
    width, depth, height = float(hi[0] - lo[0]), float(hi[1] - lo[1]), float(hi[2] - lo[2])
    pivot_ok = bool(abs(lo[2]) < 1e-4 and abs(lo[0] + hi[0]) < 1e-4 and abs(lo[1] + hi[1]) < 1e-4)
    if not pivot_ok:
        warnings.append("pivot is not at floor center after normalizing (unexpected)")

    low, high = HEIGHT_RANGE_M[args.category]
    if not (low <= height <= high):
        warnings.append(f"height {height:.3f} m is outside the usual {low}-{high} m for "
                        f"'{args.category}'. Wrong units? Try --scale or --target-height.")

    tris = triangle_count(meshes)
    budget = TRIANGLE_BUDGET[args.category]
    if tris > budget:
        warnings.append(f"{tris} triangles exceeds the {args.category} budget of {budget}")

    textures = texture_info()
    largest = max((max(w, h) for _, w, h in textures), default=0)
    for name, w, h in textures:
        if max(w, h) > MAX_TEXTURE_PX:
            warnings.append(f"texture '{name}' is {w}x{h}, above the {MAX_TEXTURE_PX}px limit")
        if not (is_power_of_two(w) and is_power_of_two(h)):
            warnings.append(f"texture '{name}' is {w}x{h}, not a power of two")

    if not NAME_PATTERN.match(os.path.basename(args.output)):
        warnings.append("output name does not match category_name_variant_NN.glb "
                        "(lowercase snake_case, e.g. prop_table_round_01.glb)")

    export_glb(args.output)
    if not os.path.exists(args.output):
        fail("export finished but the output file was not written")

    report = {
        "file": os.path.basename(args.output),
        "source": os.path.basename(args.input),
        "category": args.category,
        "dimensions_m": {"width": round(width, 4), "height": round(height, 4),
                         "depth": round(depth, 4)},
        "scale_applied": round(scale, 6),
        "triangles": tris,
        "largest_texture_px": largest,
        "file_size_bytes": os.path.getsize(args.output),
        "pivot_at_floor_center": pivot_ok,
        "warnings": warnings,
        "notes": notes,
        "status": "PASS" if not warnings else "CHECK",
    }

    print("\n=== FrameCraft normalize report ===")
    print(json.dumps(report, indent=2))
    for text in warnings:
        print(f"WARNING: {text}")
    for text in notes:
        print(f"NOTE: {text}")
    if args.report:
        os.makedirs(os.path.dirname(os.path.abspath(args.report)), exist_ok=True)
        with open(args.report, "w") as f:
            json.dump(report, f, indent=2)


if __name__ == "__main__":
    main()
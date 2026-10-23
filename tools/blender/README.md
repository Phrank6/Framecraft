# FrameCraft Asset Normalization Pipeline

Normalize 3D assets to the FrameCraft standard and optionally compress them for faster loading.

This tool:

- Converts assets to `.glb`
- Uses real-world units (meters)
- Places the pivot at the floor center
- Fixes orientation
- Checks triangle counts and texture sizes
- Generates validation reports
- Optimizes assets using `gltf-transform`
- Creates catalog templates for asset metadata

Supported input formats:

- `.glb`
- `.gltf`
- `.fbx`
- `.obj`

---

# Folder Structure

```text
tools/
└── blender/
    ├── normalize_asset.py
    ├── run_normalize.py
    └── README.md
```

---

# Requirements

## 1. Install Blender

Download and install Blender:

https://www.blender.org/download/

Verify Blender is installed:

```bash
blender --version
```

If that command does not work, you can provide the Blender path manually when running the script.

---

## 2. Install Python

Python 3.9 or newer is recommended.

Verify installation:

```bash
python --version
```

---

## 3. Install Node.js

Compression uses the glTF Transform CLI.

Download Node.js LTS:

https://nodejs.org/

Verify installation:

```bash
node --version
npm --version
```

Install glTF Transform:

```bash
npm install --global @gltf-transform/cli
```

Verify installation:

```bash
gltf-transform --version
```

---

# Quick Start

Normalize and optimize a single asset:

```bash
python run_normalize.py \
  --input raw/chair.glb \
  --output out/prop_chair_wood_01.glb
```

Expected output:

```text
out/
├── prop_chair_wood_01.glb
├── prop_chair_wood_01.report.json
├── prop_chair_wood_01.catalog.json
└── _normalized/
    ├── prop_chair_wood_01.glb
    └── prop_chair_wood_01.normalize_report.json
```

---

# Running on an Entire Folder

Process all supported assets in a directory:

```bash
python run_normalize.py \
  --input raw/ \
  --output out/
```

Each asset will be processed using the same settings.

---

# Common Examples

## Model Imported in Centimeters

Many models are authored in centimeters instead of meters.

```bash
python run_normalize.py \
  --input chair.glb \
  --output prop_chair_wood_01.glb \
  --scale 0.01
```

---

## Force a Specific Height

Scale the model so that its final height is exactly 0.9 meters:

```bash
python run_normalize.py \
  --input chair.glb \
  --output prop_chair_wood_01.glb \
  --target-height 0.9
```

---

## Fix Facing Direction

If the model is facing the wrong direction:

```bash
python run_normalize.py \
  --input chair.glb \
  --output prop_chair_wood_01.glb \
  --front=+X
```

Possible values:

```text
-Y
+Y
+X
-X
```

When using `-X` or `-Y`, always include the equals sign:

```bash
--front=-X
```

---

## Skip Compression

```bash
python run_normalize.py \
  --input chair.glb \
  --output prop_chair_wood_01.glb \
  --no-optimize
```

---

# FrameCraft Asset Standard

The normalization script enforces the following conventions:

| Property | Standard |
|-----------|-----------|
| Units | Meters |
| Up Axis | +Y (exported glTF) |
| Forward Axis | +Z (exported glTF) |
| Pivot | Floor center |
| Output Format | GLB |
| Prop Triangle Budget | 20,000 |
| Character Triangle Budget | 60,000 |
| Maximum Texture Size | 2048 × 2048 |

---

# Output Files

## Optimized GLB

```text
asset.glb
```

Final production-ready asset.

---

## Validation Report

```text
asset.report.json
```

Contains:

- Dimensions
- Triangle count
- Texture information
- File sizes
- Warnings
- Pass/check status

Example:

```json
{
  "status": "PASS",
  "triangles": 12452,
  "size_reduction_pct": 58.7
}
```

---

## Catalog Template

```text
asset.catalog.json
```

Template for manually entering asset metadata.

Example:

```json
{
  "id": "prop_chair_wood_01",
  "name": "",
  "tags": ["ADD_TAGS"],
  "license": "ADD_LICENSE",
  "sourceUrl": "ADD_SOURCE_URL"
}
```

After generation, fill in:

- `name`
- `tags`
- `license`
- `sourceUrl`

before adding the asset to the catalog.

---

# Understanding Results

## PASS

The asset meets all validation checks.

```text
status: PASS
```

---

## CHECK

The asset was exported successfully, but warnings were found.

Examples:

- Unusual height
- Too many triangles
- Oversized textures
- Unexpected file naming

Review the warnings in the generated report.

---

## FAILED

Processing stopped because of an error.

Examples:

- Unsupported file type
- Missing Blender installation
- Missing glTF Transform installation
- Rigged model (not supported in v1)

---

# Known Limitations

Version 1 does not automatically handle:

- Rigged characters
- Skeletons / armatures
- Automatic front-direction detection
- Texture resizing
- Mesh merging
- Material cleanup

Rigged assets should be checked manually before use.

---

# Troubleshooting

## Blender Not Found

Specify Blender directly:

```bash
python run_normalize.py \
  --blender "C:\Program Files\Blender Foundation\Blender\blender.exe" \
  --input chair.glb \
  --output out/chair.glb
```

---

## glTF Transform Not Found

Install:

```bash
npm install --global @gltf-transform/cli
```

Or skip optimization:

```bash
python run_normalize.py \
  --input chair.glb \
  --output out/chair.glb \
  --no-optimize
```

---

# Typical Workflow

1. Place the source asset into a folder (for example `raw/`).
2. Run `run_normalize.py`.
3. Open the generated `.glb` and verify that:
   - the asset is standing on the floor,
   - the size is correct,
   - the front direction is correct.
4. Review the generated `.report.json`.
5. Fill out the generated `.catalog.json`.
6. Commit the files to GitHub.

---

# Example Workflow

Input:

```text
raw/chair.glb
```

Command:

```bash
python run_normalize.py \
  --input raw/chair.glb \
  --output out/prop_chair_wood_01.glb
```

Output:

```text
out/
├── prop_chair_wood_01.glb
├── prop_chair_wood_01.report.json
├── prop_chair_wood_01.catalog.json
└── _normalized/
    ├── prop_chair_wood_01.glb
    └── prop_chair_wood_01.normalize_report.json
```

The final `.glb` is the production-ready asset.

The `.report.json` contains validation results and compression statistics.

The `.catalog.json` is a metadata template that should be completed before publishing the asset.

---

# Notes

- Keep the `_normalized` copy. It is the asset before compression and is useful for visual comparisons.
- Compression may require additional runtime decoders (MeshOpt, Draco, or KTX2) depending on the settings used.
- Very small files may occasionally become slightly larger after optimization because compression has fixed overhead.
- If the model faces the wrong direction, rerun with a different `--front` value.
- If the model imports at the wrong size, rerun with either `--scale` or `--target-height`.

For questions or issues, review the generated report files first, as they contain detailed warnings and validation information.
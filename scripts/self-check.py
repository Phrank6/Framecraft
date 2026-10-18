"""Dependency-free integrity check for the shipped JSON fixture and HDR binary.
Not a substitute for npm test (the authoritative Zod suite)."""
import json,struct
from pathlib import Path
root=Path(__file__).resolve().parents[1]
p=json.loads((root/'src/data/cafe.scene.json').read_text())
assert p['version']=='1.0.0'
assert len(p['character_specs'])==len(p['bible']['characters'])
assert len(p['scene_layouts'][0]['instances'])>=10
charids={x['id'] for x in p['bible']['characters']}
assets={x['id'] for x in p['asset_manifest']['assets']}
shots={x['id'] for x in p['shots']}
assert all(x['id'] in charids and x['asset_id'] in assets for x in p['character_specs'])
assert all(i['asset_id'] in assets for layout in p['scene_layouts'] for i in layout['instances'])
assert all(clip['shot_id'] in shots for clip in p['timeline']['clips'])
assert sum(clip['duration_seconds'] for clip in p['timeline']['clips'])==p['timeline']['duration_seconds']
hdr=(root/'public/hdri/framecraft_studio.hdr').read_bytes()
assert hdr.startswith(b'#?RADIANCE')
assert b'FORMAT=32-bit_rle_rgbe' in hdr[:256]
assert b'-Y 512 +X 1024' in hdr[:256]
print(f'PASS: JSON / references / HDR binary structural smoke-check ({len(p["asset_manifest"]["assets"])} assets, {len(p["scene_layouts"][0]["instances"])} instances)')

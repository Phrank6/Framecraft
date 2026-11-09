# Storyboard scene file (`framecraft.storyboard`, version 1)

One JSON file per script scene. The editor opens and saves this file; Linda's lighting module and Yasin's export read it. Schema: `src/schema/storyboard.schema.js`. Example: `examples/cafe.storyboard.json`.

Units are meters; right-handed, **+Y up, −Z north, +X east**; rotations are degrees.

```js
{
  format: 'framecraft.storyboard', version: 1,
  project: { id, title },
  scene:   { id: 'scene_…', number, heading, location, int_ext: 'INT'|'EXT'|'INT/EXT'|null, time_of_day, source_line? },
  sensor:  { id: 'super35', width_mm: 24.89, height_mm: 18.66 },
  objects: [ … ],   // props, characters, set pieces
  lights:  [ … ],   // Linda's light spec
  shots:   [ … ],   // Yasin's storyboard fields + camera
}
```

## objects

| Field | Meaning |
| --- | --- |
| `id` | `obj_…`, unique in the file |
| `kind` | `prop`, `character` or `set` (floor/walls; usually `locked: true`) |
| `label` | Name shown in the editor and on grey blocks |
| `asset` | `{kind:'procedural', generator}` (Week 1 café pieces), `{kind:'block', size_m:[w,h,d], color}` (grey placeholder, pivot at floor centre), or `{kind:'gltf', uri, catalog_id?}` (a model made to Nayeli's asset standard) |
| `transform` | `position` [x,y,z] m, `rotation_deg` [x,y,z], `scale` [x,y,z] |
| `character` | Characters only: `name`, `height_m`, `pose` (`standing`/`seated`), optional `palette` |
| `locked` | Locked objects cannot be moved or deleted in the editor |
| `source` | Where it came from: `tag` `stated` (in the script, with `line`), `inferred` (a guess) or `user` (placed by hand), optional `note` |

## lights — Linda's spec (field names are fixed)

```js
{ id: 'light_key', type: 'fixture', position: [2, 2.5, 1], target: [0, 1, 0], intensity: 1.2, kelvin: 3200, softness: 0.6 }
{ id: 'light_sun', type: 'sun', lat: 34.0689, lon: -118.4452, date: '2026-10-15T17:30:00-07:00', intensity: 1, kelvin: 5600, softness: 0.3 }
```

`type`: `sun` (lat/lon/date instead of position), `lamp` (position), `fixture` and `window` (position + target). `softness` 0 = hard, 1 = very soft. `kelvin` 1000–12000.

## shots — Yasin's fields + the camera

| Field | Meaning |
| --- | --- |
| `id`, `number` | `shot_…`; numbers are unique and printed on the sheet |
| `lens_mm` | Focal length; with `sensor.width_mm` it fixes the horizontal field of view |
| `aspect` | `16:9` or `2.39:1` — the frame lines and the exported frame |
| `time` | `HH:MM`, 24-hour |
| `light_note`, `script_line`, `description` | Text printed under the panel |
| `camera` | `position` and `target` (what the camera looks at) |

`png` is not stored: Yasin's export renders it from `camera`, `lens_mm` and `aspect`.

## Relation to the Week 1 contracts

The six v1 contracts (`project.schema.js`) are unchanged. `src/data/fromLegacyProject.js` converts one v1 project scene into this format; the café file is made that way and then given lights and two extra shots.

## Changing the format

Additive optional fields are fine. Renaming or removing a field needs a version bump and a note here, because saved scene files and Linda's and Yasin's code depend on these names.

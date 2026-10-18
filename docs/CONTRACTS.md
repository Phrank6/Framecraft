# Scene Schema v1 — six contracts

## Ground rules

- Units: meters; right-handed 3D coordinates, +Y up, +Z toward the room's foreground.
- Rotations: Euler XYZ **degrees** in the data contract; converted to radians by renderer.
- Time: seconds, timeline frames-per-second supplied by `TimelineSchema`.
- Data objects are JSON serializable. All stable public IDs are lowercase, underscore-delimited, and typed by prefix: `script_`, `scene_`, `char_`, `prop_`, `action_`, `emotion_`, `beat_`, `asset_`, `manifest_`, `instance_`, `layout_`, `camera_`, `shot_`, `timeline_`, `clip_`, `event_`.
- William's three files are preserved **exactly**. Stricter ID naming and reference rules are checked in `FramecraftProjectSchema`; a standalone `BibleSchema.safeParse` intentionally performs less validation.
- `char_maya` is reused as character ID across Bible and Character Spec intentionally; those objects are different perspectives on the *same* entity.
- Prefix and referential constraints only apply to the **aggregate project**; individual contracts also work in isolation.

## 1. Script Bible — William

Holds screenplay facts and provenance (`line_number`, `tag`). Fields: `script_id`, source format and total lines, arrays of scenes, characters, props, actions, emotions and story beats. Script metadata stays separate from 3D rendering details.

## 2. Character Spec — Justin

`id` (references Bible character), `asset_id`, `height_m`, `display_name`, optional `description`, `palette`, `rig`. Does not duplicate story evidence or alter William's `CharacterSchema`.

## 3. Asset Manifest — Justin

`id`, list of assets with stable ID, human label, category, and one source variant: `procedural` generator, `primitive` shape, or `gltf` URI. The baseline scene renderer currently implements procedural and primitive sources; glTF **is allowed by the contract but not yet loaded by the Week 1 demo**. The future import track can implement async loading while keeping this shape stable.

## 4. Scene Layout — Justin

One layout per scene, with `scene_id`, required meters and right-handed-y-up frame, unique instance IDs, asset references, translation/rotation/scale, and camera poses keyed to shot IDs. Character instances must identify the Bible character. The renderer reads layout instances directly; `ShotSchema` itself does not need to be changed for cameras.

## 5. Shot — William

Defines `scene_id`, participants, props, description, focal length, duration, provenance. One `camera_pose` per shot is required by the aggregate project validator; `focal_length_mm` remains metadata rather than a duplicative camera projection setting. A later camera model may derive FOV from sensor size and focal length.

## 6. Timeline — Justin

`fps`, total duration, ordered clips with `shot_id` and start/duration, and action events with timestamps. Checks ensure no overlapping clip ranges, clips fit inside duration, clips agree with `Shot.duration_seconds`, and events refer to a real action and fit the timeline.

## Aggregate validation example

```js
const check = FramecraftProjectSchema.safeParse(cafeProject);
if (!check.success) console.log(check.error.issues.map(e=>({path:e.path.join('.'),message:e.message})));
```

Additional checks: duplicate IDs in each collection, missing refs (asset, shot, action, scene, prop, character), wrong prefixes, inconsistent scene/camera pair, missing camera pose, scene lines exceeding script length, invalid clip duration, overlapping clips, events outside timeline.

## Compatibility commitment

After actual team review and a remote `schema-v1` tag, do not rename or remove fields or change semantics without a PR and a note. Additive optional fields can be proposed but must keep old fixtures valid. Changes that invalidate old fixtures require an explicit major version transition.

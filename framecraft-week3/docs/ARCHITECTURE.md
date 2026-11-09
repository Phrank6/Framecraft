# Architecture

## Data flow

1. `src/data/cafe.scene.js` holds the authored project fixture.
2. `FramecraftProjectSchema` validates each contract and its references.
3. `src/renderer/prefabs.js` instantiates the validated Scene Layout into Three.js groups.
4. Each camera pose references a Shot ID; the inspector and timeline select poses by those IDs.
5. `createRenderer.js` manages the WebGL canvas, tone mapping, environment, shadows and image exports.

The Zod contracts do not import Three.js. A consumer can validate project data without instantiating a DOM or WebGL context.

## Contract boundaries

- **Script Bible and Shot** capture story and editorial intent. William's files remain unchanged.
- **Character Spec and Asset Manifest** describe renderable entities and their resources.
- **Scene Layout** stores instance transforms and shot-specific camera placement.
- **Timeline** stores shot intervals and action events.
- **Project validator** checks IDs, referential integrity, time ranges and camera/shot consistency.

Units are meters, the scene is right-handed with Y up, data rotations are in degrees, and timeline values are in seconds. Shot focal length remains metadata until the team establishes a common sensor-size policy.

## Renderer boundaries

The scene is a procedural sample with 17 public scene instances. Each instance can contain a hierarchy of meshes and materials; adding decorative geometry does not change the contract. Model/texture sourcing, animation rigs, user-authored scenes and general GLB imports will require further work. The `gltf` resource variant is described in the schema but is not implemented by the current renderer.

The UI is a development workspace with a shot list, live viewport, timeline, and renderer settings. Its layout is not a commitment to the final product interface. Control IDs are shared between `workspace.js` and `inspector.js`; do not rename them without updating the bindings and tests.

## Schema changes

Once the team accepts v1, changes to required fields or ID semantics should include a migration note and contract tests. Additive optional fields should preserve old fixtures where possible. Do not create a `schema-v1` tag until reviews and integration checks are complete.

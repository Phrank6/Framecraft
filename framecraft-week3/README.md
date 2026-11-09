# Framecraft

Framecraft is an AI-powered storyboard and pre-production tool for filmmakers. The long-term product goal is to turn script and character information into editable camera shots, 3D blocking, and storyboard frames.

This repository now contains the **Week 3 storyboard core**: a 3D storyboard editor (`index.html`) where you import a Fountain script, get a starter 3D layout per scene, edit objects with undo, frame shots with real lenses (Super 35) and 16:9 / 2.39:1 frame lines, and save each scene as a `.storyboard.json` file. The Week 1 rendering studies are still available at `studies.html`.

Not in this branch yet (by plan): Linda's lighting module (`src/renderer/lights.js`; the editor uses a stand-in until it lands), Yasin's storyboard PNG/PDF export, AI layout of every scene (Week 4), Tripo generation.

## Requirements

- Node.js 20.19 or later and npm
- A browser supporting WebGL 2

## Run locally

```bash
npm install
npm run check
npm run dev
```

Open the local URL printed by Vite (normally `http://localhost:5173`) for the storyboard editor, or `/studies.html` for the Week 1 rendering studies.

**Editor basics:** drag to orbit, right-drag to pan, scroll to dolly. Click an object to select it; the gizmo moves it on the floor (`W`) or turns it (`E`). `Delete` removes, `Ctrl/⌘+D` duplicates, `Ctrl/⌘+Z` undoes, `Ctrl/⌘+Shift+Z` redoes. Pick a lens (24/35/50/85 mm or any value) and an aspect, frame the view inside the frame lines and press **Save view as new shot**. **Save** downloads the scene file; **Open** loads one. **Import script** reads a Fountain screenplay.

**AI step (optional):** the script breakdown works offline with simple rules. To use Claude instead, run the small local server in a second terminal with your key in an environment variable (never in the code, the browser, Slack or a chat):

```bash
ANTHROPIC_API_KEY=sk-ant-... npm run ai-server   # listens on 127.0.0.1:8787; Vite proxies /api to it
```

If `node` or `npm` is missing after installing through nvm, load the appropriate Node version before running these commands.

## Project structure

| Path | Responsibility |
| --- | --- |
| `src/editor/` | Storyboard editor: viewport, selection/gizmo, undo store, catalog, UI |
| `src/script/` | Fountain parser, scene breakdown (offline rules + Claude request), starter layout |
| `src/camera/lens.js` | Lens model (JS port of Owen's `lensModel.ts`) and frame-line maths |
| `server/ai-server.mjs` | Local server that adds the Claude API key and calls the Messages API |
| `examples/` | Café test script (`cafe.fountain`) and its scene file (`cafe.storyboard.json`) |
| `tools/blender/` | Nayeli's asset normalisation scripts and catalog template |
| `src/schema/` | Six Zod contracts, project-level reference validation, and the storyboard scene file format |
| `src/data/` | Canonical café fixture in JavaScript and JSON |
| `src/renderer/` | Three.js scene, lighting, render settings and capture exports |
| `src/ui/`, `src/styles/` | Editor shell and renderer inspector |
| `src/consumers/` | Small examples of consuming schema data without a browser |
| `public/` | Bundled HDR environment and texture files |
| `tests/` | Unit and integration-level checks that do not require a browser |
| `docs/` | Contracts, architecture, renderer notes and acceptance criteria |

## Commands

```bash
npm test                 # automated Node tests
npm run validate:scene   # validate the café fixture and the storyboard scene files
npm run ai-server        # optional local Claude server for script breakdown
npm run build            # production build to dist/
npm run check            # tests + production build
npm run dev              # development server
npm run assets:hdri      # optional photographic HDR environment download
```

The bundled `public/hdri/framecraft_studio.hdr` is a **procedurally generated** Radiance HDR environment, not a photograph. `npm run assets:hdri` downloads the optional CC0 [Studio Small 09](https://polyhaven.com/a/studio_small_09) HDR from Poly Haven; the bundled environment works offline. The café furniture, set dressing, and character stand-ins are procedural and are not substitutes for final film assets.

## Scene contracts

The shared data model consists of **Script Bible, Character Spec, Asset Manifest, Scene Layout, Shot, and Timeline**. `src/schema/index.js` is the public import entry point. William's original `common.schema.js`, `bible.schema.js`, and `shot.schema.js` were kept unchanged. Camera transforms live in Scene Layout and reference Shot IDs; the aggregate validator checks cross-contract references and timeline consistency.

```js
import { validateProject } from './src/schema/index.js';
import { cafeProject } from './src/data/cafe.scene.js';

const result = validateProject(cafeProject);
if (!result.success) {
  console.error(result.errors);
}
```

See [contracts](docs/CONTRACTS.md) and [architecture decisions](docs/ARCHITECTURE.md) before changing the schema.

## Rendering and comparison exports

The editor uses an sRGB output transform, selectable None/ACES/AgX tone mapping, HDR-based environment light through PMREM, a directional key light, and adjustable shadow quality. Draft, Review, and Capture modify rendering cost without deliberately changing the scene lighting.

The comparison exporter renders three studies: tone mapping (three panels), environment lighting (two), and contact shadows (two). The combined report uses seven frames. Within each study, camera and non-tested settings are fixed. See [renderer documentation](docs/RENDERER.md) and [visual comparison guide](docs/COMPARISON_REPORT.md).

## Collaboration and status

This is an initial implementation for team review. Schema approval, the `schema-v1` tag, two **independent** track integrations, and final GPU-based visual acceptance must happen in the shared repository and on target hardware. The example consumer modules demonstrate the API but do not represent external-team sign-off.

Before merging, run `npm run check`, validate screenshots on a real GPU, and follow the [QA checklist](docs/QA.md). Pull requests should describe schema compatibility, test results and visual changes. Do not tag the schema as frozen until the relevant leads have reviewed it.

## Credits and dependencies

- Original Script Bible, Shot, and common validation files: William (provided for this project; retained without modification).
- Three.js, Zod, and Vite are external dependencies; see `package.json` for versions.
- The optional downloaded photographic environment is by Poly Haven, CC0. The bundled environment and material textures are locally generated project assets.

The repository currently declares `UNLICENSED` in `package.json`; redistribution rights for the project source should be decided by the repository owner before publication under a public license.

### Publishing a review branch

If you have write access and Git is authenticated on your machine, you can publish this checkout to a new review branch with:

```bash
bash scripts/publish-to-github.sh
```

The helper clones `Phrank6/Framecraft` into a temporary directory, creates a feature branch, copies the project files (excluding build and dependency folders), pushes the branch, and prints a pull-request URL. It does **not** merge into `main` or create a release tag.

## Storyboard scene file

See `docs/STORYBOARD_FORMAT.md`. One file per scene: `objects`, `lights` (Linda's light spec), `shots` (Yasin's storyboard fields + the camera). Validate any file with `node scripts/validate-scene.mjs path/to/scene.storyboard.json`.

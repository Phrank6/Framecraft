# Framecraft

Framecraft is an AI-powered storyboard and pre-production tool for filmmakers. The long-term product goal is to turn script and character information into editable camera shots, 3D blocking, and storyboard frames.

This repository currently contains the **scene-contract and rendering foundation**, not the full script-to-storyboard product. The working example is Café Lumière, a two-shot Three.js scene driven by validated scene data.

## Requirements

- Node.js 20.19 or later and npm
- A browser supporting WebGL 2

## Run locally

```bash
npm install
npm run check
npm run dev
```

Open the local URL printed by Vite (normally `http://localhost:5173`). The viewport supports orbiting and zooming; use the scene list or timeline to select a shot. The right panel controls tone mapping, exposure, lights, shadows, the optional film effect, and quality presets. Export buttons save rendered PNGs.

If `node` or `npm` is missing after installing through nvm, load the appropriate Node version before running these commands.

## Project structure

| Path | Responsibility |
| --- | --- |
| `src/schema/` | Six Zod contracts and project-level reference validation |
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
npm run validate:scene   # validate the café fixture and its references
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

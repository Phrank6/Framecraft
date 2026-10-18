# Renderer baseline (T4.2)

## Color and lighting

- `createRenderer.js` sets output to `THREE.SRGBColorSpace`; tone mapping is selectable between None, ACES Filmic and AgX, with an independent exposure parameter.
- `lighting.js` uses `RGBELoader` for equirectangular Radiance HDR files and `PMREMGenerator` for material environment lighting. It also sets up a directional key light.
- The bundled HDR file is synthetic. For a CC0 photographic environment run `npm run assets:hdri` and reload the page.
- `postprocessing.js` implements an optional fullscreen grain and vignette pass.

## Quality policy

| Option | Draft | Review | Capture |
| --- | ---: | ---: | ---: |
| Maximum device pixel ratio | 1.0 | 1.5 | 2.0 |
| Shadow map | PCFSoft | VSM | VSM |
| Shadow resolution | 512 | 1024 | 2048 |
| Environment intensity | 0.85 | 0.85 | 0.85 |

The three presets use the same scene lighting. This matters when comparing image quality. Anti-aliasing is configured when the renderer is created, so Draft does **not** disable MSAA independently.

## Shadow tuning

The default key light uses a shadow-camera extent of ±8 m with bias `-0.00008` and normal bias `0.024`. These are starting values, not universal GPU-safe settings. Check table legs, chair feet, characters and the cup/saucer contact from several angles. Check for both shadow acne and shadow separation before approval.

## Exports

- Current-frame PNG from the viewport.
- Three-panel tone mapping comparison.
- Two-panel environment lighting comparison.
- Two-panel shadow comparison.
- Seven-frame report combining the three studies.

Comparison code restores the original camera and inspector state after export. Verify both the exported image and live-state restoration on target hardware. For meaningful comparisons, use identical camera, exposure, material data and all non-tested renderer settings within each row.

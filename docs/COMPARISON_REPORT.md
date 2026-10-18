# Visual comparison report

Use the editor's **Render studies** section to export three separate studies or a single seven-panel PNG.

| Study | Frames | What to inspect |
| --- | --- | --- |
| Tone mapping | None, ACES, AgX | Highlight roll-off on ceramic, chrome and brass |
| Environment light | HDR off, HDR on | Fill light and rough/smooth material reflections |
| Contact shadows | Off, On | Furniture grounding, chair feet and cup/saucer contact |

For each study, keep the camera and every non-tested parameter fixed. Use the same capture resolution when comparing exported image files. Review the actual WebGL frames rather than relying on UI screenshots; a gray or empty viewport is a failed capture.

## Notion / review format

1. One final Capture frame showing the full scene.
2. The seven-panel comparison PNG (or the three separate study PNGs).
3. Brief annotations explaining the visible differences, without claiming photographic realism.
4. Rendering context: browser version, GPU, operating system, selected HDR source, resolution and any relevant limitations.

The downloadable default HDR is synthetic; explicitly identify whether the photographic HDRI was installed for the final captures.

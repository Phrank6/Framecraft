# Engineering handoff

The repository contains a minimal, inspectable implementation of the six scene contracts and a WebGL rendering workspace. Review the following before considering Schema v1 frozen.

**William**: Confirm that Script Bible, Shot and common evidence rules are preserved as intended, and that keeping camera transforms in Scene Layout is compatible with editorial requirements.

**Allen**: Review the aggregate `FramecraftProjectSchema`, package structure, and planned integration boundary.

**Nayeli, Linda and John**: Verify that expected editor/import/storyboard fields can be represented. Try consuming `src/schema/index.js` and the JSON fixture without importing the renderer.

Suggested PR title: `feat: add scene contracts and renderer workspace`.

The PR should report `npm run check` results from an actual machine, attach reviewed comparison PNGs, and list proposed interface changes. Merge and tag only after the relevant reviewers have approved. The existing consumer modules are examples and do not replace independent-track verification.

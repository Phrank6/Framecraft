# Verification checklist

## Automated

Run from the repository root:

```bash
npm install
npm run validate:scene
npm test
npm run build
```

Tests cover Zod contracts, negative cases, cross-contract references, sample consumer imports, rendering scene construction, shot controls, panel controls and comparison configuration. The consumer checks use two **example** modules, not independently authored tracks.

## Browser checks

- [ ] Café scene renders and all 17 schema instances are represented.
- [ ] Selecting a shot in either sidebar or timeline updates the camera and selected state.
- [ ] None / ACES / AgX and exposure change the displayed image.
- [ ] Environment, key light, shadows and film toggles respond.
- [ ] Draft / Review / Capture update rendering settings without changing intended lighting.
- [ ] Both sidebars collapse and reopen without breaking WebGL sizing.
- [ ] Exports download nonblank PNG files and restore prior camera/settings.
- [ ] Shadow acne and peter-panning were inspected at multiple angles.
- [ ] Draft performance was measured on a representative laptop.
- [ ] Narrow-window editor layout remains usable.

## Team acceptance (not automatic)

- [ ] William and Allen reviewed the schema PR.
- [ ] Other leads checked field coverage.
- [ ] Two independent tracks imported the agreed contracts.
- [ ] Schema v1 is merged and tagged `schema-v1`.
- [ ] Final before/after captures are reviewed and posted to Notion.

A successful unit test does not establish visual quality or team approval. Record the browser, OS and GPU used for final review.

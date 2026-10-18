import * as THREE from 'three';
/** Quality presets share scene lighting and differ in rendering cost. */
export const QUALITY_PRESETS = Object.freeze({
    Draft: { pixelRatioCap: 1, shadowResolution: 512, shadowType: THREE.PCFSoftShadowMap, shadowBlur: 1, shadowSamples: 4, envIntensity: 0.85 },
    Review: { pixelRatioCap: 1.5, shadowResolution: 1024, shadowType: THREE.VSMShadowMap, shadowBlur: 2, shadowSamples: 6, envIntensity: 0.85 },
    Capture: { pixelRatioCap: 2, shadowResolution: 2048, shadowType: THREE.VSMShadowMap, shadowBlur: 3, shadowSamples: 8, envIntensity: 0.85 },
});
export function applyQualityPreset({ renderer, scene, sun, quality, viewportWidth, viewportHeight }) {
    const p = QUALITY_PRESETS[quality];
    if (!p)
        throw new Error(`Unknown quality preset: ${quality}`);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, p.pixelRatioCap));
    renderer.setSize(viewportWidth, viewportHeight, false);
    // Do not override the separate shadow-toggle state when changing presets.
    renderer.shadowMap.type = p.shadowType;
    sun.shadow.mapSize.set(p.shadowResolution, p.shadowResolution);
    sun.shadow.radius = p.shadowBlur;
    sun.shadow.blurSamples = p.shadowSamples;
    // Changes to shadow-map size/type require deallocating old buffers.
    sun.shadow.map?.dispose();
    sun.shadow.map = null;
    sun.shadow.needsUpdate = true;
    // Keep environment intensity independent of the quality preset.
    scene.environmentIntensity = p.envIntensity;
    renderer.shadowMap.needsUpdate = true;
    return p;
}

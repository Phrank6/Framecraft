/**
 * Lens model (JavaScript port of Owen's src/camera/lensModel.ts, feature/camera-model).
 * Owen's TypeScript file imports ./sensorPresets, which was not in his branch,
 * and his test uses vitest; this port keeps his function names and numbers
 * and runs with `node --test`.
 */
export const SENSOR_PRESETS = Object.freeze({
    super35: Object.freeze({ id: 'super35', label: 'Super 35', widthMm: 24.89, heightMm: 18.66 }),
    fullFrame: Object.freeze({ id: 'fullFrame', label: 'Full frame', widthMm: 36, heightMm: 24 }),
    microFourThirds: Object.freeze({ id: 'microFourThirds', label: 'Micro Four Thirds', widthMm: 17.3, heightMm: 13 }),
});

export const LENS_SET_MM = Object.freeze([24, 35, 50, 85]);

const toDeg = r => r * 180 / Math.PI;
const toRad = d => d * Math.PI / 180;

/** Horizontal field of view in degrees for a lens on a sensor of this width. */
export function horizontalFOV(focalLengthMm, sensorWidthMm) {
    if (!(focalLengthMm > 0) || !(sensorWidthMm > 0))
        throw new Error('focal length and sensor width must be positive');
    return 2 * toDeg(Math.atan(sensorWidthMm / (2 * focalLengthMm)));
}

export function sensorAspect(sensor) {
    return sensor.widthMm / sensor.heightMm;
}

/** Vertical FOV (what three.js PerspectiveCamera.fov expects) for a given horizontal FOV and aspect. */
export function verticalFromHorizontal(hfovDeg, aspect) {
    return 2 * toDeg(Math.atan(Math.tan(toRad(hfovDeg) / 2) / aspect));
}

/**
 * Fit a shot frame (16:9 or 2.39:1) inside the viewport and work out the camera
 * FOV so that the frame — not the whole viewport — shows exactly the lens's
 * horizontal field of view. The area outside the frame lines is "look-around"
 * space, like a camera monitor's surround view.
 */
export function frameLayout({ lensMm, sensorWidthMm = SENSOR_PRESETS.super35.widthMm, viewportW, viewportH, frameAspect, margin = 0.06 }) {
    const availW = viewportW * (1 - 2 * margin), availH = viewportH * (1 - 2 * margin);
    let w = availW, h = availW / frameAspect;
    if (h > availH) {
        h = availH;
        w = availH * frameAspect;
    }
    const frame = { x: (viewportW - w) / 2, y: (viewportH - h) / 2, w, h };
    const hfovFrame = horizontalFOV(lensMm, sensorWidthMm);
    const tanViewport = Math.tan(toRad(hfovFrame) / 2) * (viewportW / w);
    const vfovDeg = verticalFromHorizontal(2 * toDeg(Math.atan(tanViewport)), viewportW / viewportH);
    return { frame, vfovDeg, hfovFrameDeg: hfovFrame };
}

/** Camera FOV for a capture rendered at exactly the frame aspect (no surround). */
export function captureFov(lensMm, frameAspect, sensorWidthMm = SENSOR_PRESETS.super35.widthMm) {
    return verticalFromHorizontal(horizontalFOV(lensMm, sensorWidthMm), frameAspect);
}

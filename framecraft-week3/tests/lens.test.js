import test from 'node:test';
import assert from 'node:assert/strict';
import { horizontalFOV, sensorAspect, SENSOR_PRESETS, frameLayout, captureFov, verticalFromHorizontal } from '../src/camera/lens.js';

const close = (a, b, tol = 0.05) => assert.ok(Math.abs(a - b) <= tol, `${a} is not within ${tol} of ${b}`);
const S35 = SENSOR_PRESETS.super35.widthMm;

// Owen's numbers (feature/camera-model, lensModel.test.ts)
test('24 mm on Super 35 is about 54.8° wide', () => close(horizontalFOV(24, S35), 54.8));
test('50 mm on Super 35 is about 28.0° wide', () => close(horizontalFOV(50, S35), 28.0));
test('full frame and Micro Four Thirds presets', () => {
    close(horizontalFOV(24, SENSOR_PRESETS.fullFrame.widthMm), 73.74);
    close(horizontalFOV(50, SENSOR_PRESETS.fullFrame.widthMm), 39.6);
    close(horizontalFOV(24, SENSOR_PRESETS.microFourThirds.widthMm), 39.64);
    close(horizontalFOV(50, SENSOR_PRESETS.microFourThirds.widthMm), 19.63);
});
test('sensor aspect is width / height', () => {
    close(sensorAspect(SENSOR_PRESETS.fullFrame), 1.5, 1e-9);
    close(sensorAspect(SENSOR_PRESETS.super35), 24.89 / 18.66, 1e-9);
});
test('longer lens = narrower view', () => {
    const fovs = [24, 35, 50, 85].map(f => horizontalFOV(f, S35));
    assert.deepEqual([...fovs].sort((a, b) => b - a), fovs);
});
test('frame lines: the frame shows exactly the lens field of view', () => {
    for (const [W, H, aspect] of [[1600, 900, 16 / 9], [1200, 900, 2.39], [900, 1200, 16 / 9]]) {
        const { frame, vfovDeg } = frameLayout({ lensMm: 35, viewportW: W, viewportH: H, frameAspect: aspect });
        close(frame.w / frame.h, aspect, 1e-6);
        assert.ok(frame.w <= W && frame.h <= H);
        // Horizontal FOV across the frame width, measured from the viewport camera:
        const tanHalfViewportH = Math.tan(vfovDeg * Math.PI / 360) * (W / H);
        const hfovFrame = 2 * Math.atan(tanHalfViewportH * frame.w / W) * 180 / Math.PI;
        close(hfovFrame, horizontalFOV(35, S35), 1e-6);
    }
});
test('capture FOV matches three.js filmGauge + setFocalLength', () => {
    // three.js: with filmGauge = sensor width and aspect ≥ 1, setFocalLength(f) gives
    // fov = 2·atan((filmGauge/aspect)/2/f). Our captureFov must agree.
    for (const f of [24, 35, 50, 85]) {
        const aspect = 16 / 9;
        const three = 2 * Math.atan((S35 / aspect) / 2 / f) * 180 / Math.PI;
        close(captureFov(f, aspect), three, 1e-9);
    }
    close(verticalFromHorizontal(90, 1), 90, 1e-9);
});
test('rejects nonsense input', () => assert.throws(() => horizontalFOV(0, S35)));

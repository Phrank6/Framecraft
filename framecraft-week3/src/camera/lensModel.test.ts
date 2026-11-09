import { describe, it, expect } from 'vitest';
import { horizontalFOV, sensorAspect } from './lensModel';
import { SENSOR_PRESETS } from './sensorPresets';

const SUPER35_SENSOR_WIDTH_MM = 24.89;

describe('horizontalFOV', () => {
  it('returns ~54.8 degrees for a 24mm lens on a Super35 sensor', () => {
    expect(horizontalFOV(24, SUPER35_SENSOR_WIDTH_MM)).toBeCloseTo(54.8, 1);
  });

  it('returns ~28.0 degrees for a 50mm lens on a Super35 sensor', () => {
    expect(horizontalFOV(50, SUPER35_SENSOR_WIDTH_MM)).toBeCloseTo(28.0, 1);
  });

  it.each([
    ['fullFrame', 24, 73.74],
    ['fullFrame', 50, 39.6],
    ['microFourThirds', 24, 39.64],
    ['microFourThirds', 50, 19.63],
  ] as const)('uses the %s preset width for a %dmm lens (~%d°)', (presetId, focalLengthMm, expectedDeg) => {
    expect(horizontalFOV(focalLengthMm, SENSOR_PRESETS[presetId].widthMm)).toBeCloseTo(expectedDeg, 1);
  });
});

describe('sensorAspect', () => {
  it('divides sensor width by height', () => {
    expect(sensorAspect(SENSOR_PRESETS.fullFrame)).toBeCloseTo(1.5, 10);
    expect(sensorAspect(SENSOR_PRESETS.super35)).toBeCloseTo(24.89 / 18.66, 10);
  });
});

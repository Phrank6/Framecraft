import { describe, it, expect } from 'vitest';
import { horizontalFOV } from './lensModel.js';

const SUPER35_SENSOR_WIDTH_MM = 24.89;

describe('horizontalFOV', () => {
  it('returns ~54.8 degrees for a 24mm lens on a Super35 sensor', () => {
    expect(horizontalFOV(24, SUPER35_SENSOR_WIDTH_MM)).toBeCloseTo(54.8, 1);
  });

  it('returns ~28.0 degrees for a 50mm lens on a Super35 sensor', () => {
    expect(horizontalFOV(50, SUPER35_SENSOR_WIDTH_MM)).toBeCloseTo(28.0, 1);
  });
});
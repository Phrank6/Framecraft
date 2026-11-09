import { z } from 'zod';
import type { SensorDimensions } from './sensorPresets';

export const FocalLengthMmSchema = z.number().positive();

export function horizontalFOV(focalLength: number, sensorWidth: number): number {
  return 2 * Math.atan(sensorWidth / (2 * focalLength)) * (180 / Math.PI);
}

export function sensorAspect(sensor: SensorDimensions): number {
  return sensor.widthMm / sensor.heightMm;
}

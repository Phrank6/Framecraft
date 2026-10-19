export function horizontalFOV(focalLength, sensorWidth) {
  return 2 * Math.atan(sensorWidth / (2 * focalLength)) * (180 / Math.PI);
}

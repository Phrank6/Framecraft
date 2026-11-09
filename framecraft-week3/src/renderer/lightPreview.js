import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';

/**
 * STAND-IN for Linda's src/renderer/lights.js (Week 3). It reads the same light
 * spec so the editor has light while her module is being built, but it is
 * deliberately simple: the sun uses a fixed rough direction (no real solar
 * position) and colour temperature is an approximation.
 * When Linda's PR lands, change the one import in src/renderer/lightsSeam.js.
 */
let rectInit = false;

export function kelvinToColor(kelvin) {
    // Tanner Helland approximation, 1000–40000 K.
    const t = Math.min(40000, Math.max(1000, kelvin)) / 100;
    const clamp = v => Math.min(255, Math.max(0, v)) / 255;
    const r = t <= 66 ? 255 : 329.698727446 * Math.pow(t - 60, -0.1332047592);
    const g = t <= 66 ? 99.4708025861 * Math.log(t) - 161.1195681661 : 288.1221695283 * Math.pow(t - 60, -0.0755148492);
    const b = t >= 66 ? 255 : t <= 19 ? 0 : 138.5177312231 * Math.log(t - 10) - 305.0447927307;
    return new THREE.Color(clamp(r), clamp(g), clamp(b));
}

function roughSunDirection(date) {
    // Very rough: hour angle only, fixed elevation curve. Linda's module replaces this with SunCalc/NOAA.
    const d = new Date(date);
    const hour = Number.isNaN(d.getTime()) ? 12 : (d.getUTCHours() - 7 + 24) % 24 + d.getUTCMinutes() / 60;
    const az = (hour - 12) / 12 * Math.PI;             // -π at midnight, 0 at noon (south)
    const el = Math.max(0.08, Math.sin((hour - 6) / 12 * Math.PI)) * 0.9;
    // +X east, -Z north: sun in the south at noon → +Z; morning in the east → +X.
    return new THREE.Vector3(-Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)).normalize();
}

export function createLight(spec) {
    let light;
    if (spec.type === 'sun') {
        light = new THREE.DirectionalLight();
        light.castShadow = true;
        light.shadow.mapSize.set(2048, 2048);
        Object.assign(light.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: 0.5, far: 30 });
        light.shadow.bias = -0.00008;
        light.shadow.normalBias = 0.014;
    }
    else if (spec.type === 'lamp') {
        light = new THREE.PointLight();
        light.distance = 6;
        light.decay = 2;
    }
    else if (spec.type === 'fixture') {
        light = new THREE.SpotLight();
        light.angle = Math.PI / 6;
        light.castShadow = true;
        light.shadow.mapSize.set(1024, 1024);
        light.decay = 2;
        light.distance = 12;
    }
    else if (spec.type === 'window') {
        if (!rectInit) {
            RectAreaLightUniformsLib.init();
            rectInit = true;
        }
        light = new THREE.RectAreaLight();
    }
    else
        throw new Error(`Unknown light type ${spec.type}`);
    light.name = spec.id;
    light.userData.lightId = spec.id;
    updateLight(light, spec);
    return light;
}

export function updateLight(light, spec) {
    light.color.copy(kelvinToColor(spec.kelvin));
    if (spec.type === 'sun') {
        light.intensity = spec.intensity;
        light.position.copy(roughSunDirection(spec.date).multiplyScalar(12));
        light.target.position.set(0, 0.5, 0);
        light.shadow.radius = 1 + spec.softness * 8;
    }
    else if (spec.type === 'lamp') {
        light.intensity = spec.intensity * 4;
        light.position.fromArray(spec.position);
    }
    else if (spec.type === 'fixture') {
        light.intensity = spec.intensity * 25;
        light.position.fromArray(spec.position);
        light.target.position.fromArray(spec.target);
        light.penumbra = spec.softness;
        light.shadow.radius = 1 + spec.softness * 8;
    }
    else if (spec.type === 'window') {
        const size = 1 + spec.softness * 1.5;
        light.width = size;
        light.height = size;
        light.intensity = spec.intensity;
        light.position.fromArray(spec.position);
        light.lookAt(new THREE.Vector3(...spec.target));
    }
    return light;
}

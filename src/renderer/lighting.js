import * as THREE from 'three';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
/** Build a compact shadow frustum; huge frustums waste precision and cause acne. */
export function createSun(scene) {
    const sun = new THREE.DirectionalLight(0xffead2, 2.8);
    sun.position.set(-3.9, 7.8, 5.7);
    sun.target.position.set(0, 0.5, -0.2);
    sun.castShadow = true;
    sun.shadow.camera.left = -8;
    sun.shadow.camera.right = 8;
    sun.shadow.camera.top = 8;
    sun.shadow.camera.bottom = -8;
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 24;
    sun.shadow.bias = -0.00008;
    sun.shadow.normalBias = 0.014;
    sun.shadow.radius = 2.4;
    scene.add(sun, sun.target);
    return sun;
}
/** A real equirectangular Radiance .hdr is shipped offline. A Poly Haven photo can be installed separately. */
export async function loadEnvironment(scene, renderer, onStatus = () => { }) {
    const pmrem = new THREE.PMREMGenerator(renderer);
    pmrem.compileEquirectangularShader();
    let target = null;
    let hdr = null;
    let source = 'Framecraft Café Lumière synthetic daylight HDR';
    try {
        // Use the CC0 photographed environment after `npm run assets:hdri` is executed.
        const photo = '/hdri/studio_small_09_1k.hdr';
        const check = await fetch(photo, { method: 'HEAD' });
        const isHdr = check.ok && !((check.headers.get('content-type') || '').includes('text/html'));
        const path = isHdr ? photo : '/hdri/framecraft_studio.hdr';
        source = isHdr ? 'Poly Haven · Studio Small 09 (CC0)' : source;
        hdr = await new RGBELoader().loadAsync(path);
        hdr.mapping = THREE.EquirectangularReflectionMapping;
        target = pmrem.fromEquirectangular(hdr);
        scene.environment = target.texture;
        onStatus(`HDRI · ${source}`);
    }
    catch (error) {
        console.warn('HDRI failed to load; using generated room environment.', error);
        const room = new RoomEnvironment();
        target = pmrem.fromScene(room);
        room.dispose();
        scene.environment = target.texture;
        source = 'RoomEnvironment fallback (HDRI unavailable)';
        onStatus(`Environment fallback · ${source}`);
    }
    finally {
        hdr?.dispose();
        pmrem.dispose();
    }
    return { source, dispose: () => { scene.environment = null; target?.dispose(); } };
}

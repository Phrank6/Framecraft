import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createPrefab } from './prefabs.js';

/**
 * Build the three.js object for one storyboard object.
 * - procedural: the Week 1 hand-modelled café pieces and characters
 * - block: a grey box at real size with its name written on top (pivot = floor centre)
 * - gltf: loaded asynchronously; a grey placeholder shows until it arrives.
 *   Files are expected to follow Nayeli's asset standard (meters, +Y up, pivot at floor centre).
 */
const gltfLoader = typeof document === 'undefined' ? null : new GLTFLoader();

function labelSprite(text) {
    if (typeof document === 'undefined')
        return null;
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgba(28,32,36,.82)';
    ctx.beginPath();
    ctx.roundRect(4, 20, 504, 88, 24);
    ctx.fill();
    ctx.fillStyle = '#f2f2ef';
    ctx.font = '600 44px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text.length > 22 ? text.slice(0, 21) + '…' : text, 256, 66);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, depthTest: false, transparent: true }));
    sprite.scale.set(0.8, 0.2, 1);
    sprite.renderOrder = 10;
    sprite.userData.isLabel = true;
    return sprite;
}

function block(obj) {
    const g = new THREE.Group();
    const [w, h, d] = obj.asset.size_m;
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color: obj.asset.color, roughness: 0.85 }));
    mesh.position.y = h / 2;
    mesh.castShadow = obj.kind !== 'set';
    mesh.receiveShadow = true;
    g.add(mesh);
    if (obj.kind !== 'set') {
        const edges = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry), new THREE.LineBasicMaterial({ color: '#4d5257' }));
        edges.position.copy(mesh.position);
        g.add(edges);
        const label = labelSprite(obj.label);
        if (label) {
            label.position.set(0, h + 0.18, 0);
            g.add(label);
        }
    }
    return g;
}

export function createObject3D(obj) {
    let group;
    if (obj.asset.kind === 'procedural') {
        const asset = { id: `asset_${obj.id}`, label: obj.label, category: obj.kind === 'character' ? 'character' : 'prop', source: { kind: 'procedural', generator: obj.asset.generator } };
        const spec = obj.character ? { pose: obj.character.pose, palette: obj.character.palette, apron: obj.character.name.toLowerCase() === 'leo' } : undefined;
        group = createPrefab(asset, spec);
        if (obj.character && group.userData.authoredHeight) {
            // Scale the mannequin to the character's height (standing height).
            group.userData.heightScale = obj.character.height_m / group.userData.authoredHeight;
        }
    }
    else if (obj.asset.kind === 'block')
        group = block(obj);
    else {
        group = block({ ...obj, asset: { kind: 'block', size_m: [0.5, 0.5, 0.5], color: '#c8c8c8' }, label: `${obj.label} (loading)` });
        gltfLoader?.load(obj.asset.uri, gltf => {
            group.clear();
            gltf.scene.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
            group.add(gltf.scene);
        }, undefined, error => console.warn(`Could not load ${obj.asset.uri}`, error));
    }
    const root = new THREE.Group();
    root.add(group);
    root.name = obj.id;
    root.userData.objectId = obj.id;
    root.userData.assetKey = assetKey(obj);
    if (group.userData.heightScale)
        group.scale.setScalar(group.userData.heightScale);
    applyTransform(root, obj.transform);
    return root;
}

export function assetKey(obj) {
    return JSON.stringify([obj.asset, obj.character ?? null, obj.label, obj.kind]);
}

export function applyTransform(root, t) {
    root.position.fromArray(t.position);
    root.rotation.set(...t.rotation_deg.map(THREE.MathUtils.degToRad), 'XYZ');
    root.scale.fromArray(t.scale);
}

export function readTransform(root) {
    const r = n => +n.toFixed(4);
    return {
        position: root.position.toArray().map(r),
        rotation_deg: [root.rotation.x, root.rotation.y, root.rotation.z].map(v => r(THREE.MathUtils.radToDeg(v))),
        scale: root.scale.toArray().map(r),
    };
}

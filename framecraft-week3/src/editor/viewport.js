import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { loadEnvironment } from '../renderer/lighting.js';
import { createObject3D, applyTransform, readTransform, assetKey } from '../renderer/objectFactory.js';
import { createLight, updateLight } from '../renderer/lightsSeam.js';
import { frameLayout, captureFov, horizontalFOV } from '../camera/lens.js';
import { ASPECTS } from '../schema/storyboard.schema.js';

/**
 * The 3D view of one storyboard scene.
 * - sync(doc) reconciles three.js objects with the scene file (add / remove / move)
 * - click selects; TransformControls moves (on the floor by default) or rotates
 * - the view camera *is* the shot camera: lens + aspect drive the FOV and the frame lines
 * Edits are reported through onTransformCommit when a drag ends (one undo step).
 */
export function createViewport({ host, overlay, onSelect = () => { }, onTransformCommit = () => { }, onStatus = () => { } }) {
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.AgXToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    host.append(renderer.domElement);
    renderer.domElement.setAttribute('aria-label', '3D storyboard viewport');

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#b9b2a8');
    scene.environmentIntensity = 0.55;
    const objectsRoot = new THREE.Group();
    objectsRoot.name = 'objects';
    const lightsRoot = new THREE.Group();
    lightsRoot.name = 'lights';
    const helpers = new THREE.Group();
    helpers.name = 'editor-helpers';
    scene.add(objectsRoot, lightsRoot, helpers);
    scene.add(new THREE.HemisphereLight('#e9eef2', '#6b5e52', 0.35));
    const grid = new THREE.GridHelper(20, 40, '#7d766d', '#a39b90');
    grid.position.y = 0.001;
    grid.material.transparent = true;
    grid.material.opacity = 0.35;
    helpers.add(grid);

    const camera = new THREE.PerspectiveCamera(40, 1, 0.05, 120);
    camera.position.set(6, 3.5, 8);
    const orbit = new OrbitControls(camera, renderer.domElement);
    orbit.enableDamping = true;
    orbit.dampingFactor = 0.08;
    orbit.maxPolarAngle = Math.PI * 0.495;
    orbit.screenSpacePanning = true;

    const gizmo = new TransformControls(camera, renderer.domElement);
    gizmo.setSize(0.85);
    const gizmoHelper = gizmo.getHelper();
    helpers.add(gizmoHelper);
    const selectionBox = new THREE.BoxHelper(undefined, '#f5b800');
    selectionBox.visible = false;
    helpers.add(selectionBox);

    const state = { lens: 35, aspect: '16:9', sensorWidth: 24.89, selectedId: null, mode: 'translate', allowVertical: false, doc: null };
    const byId = new Map();
    const lightById = new Map();
    let dragStart = null;

    loadEnvironment(scene, renderer).then(env => { scene.environmentIntensity = 0.55; onStatus(`Environment: ${env.source}`); }).catch(error => onStatus(`Environment unavailable: ${error.message}`));

    // ---- scene sync ----
    function sync(doc) {
        state.doc = doc;
        const seen = new Set();
        for (const obj of doc.objects) {
            seen.add(obj.id);
            let root = byId.get(obj.id);
            if (root && root.userData.assetKey !== assetKey(obj)) {
                disposeObject(root);
                root = null;
            }
            if (!root) {
                root = createObject3D(obj);
                root.userData.locked = obj.locked;
                byId.set(obj.id, root);
                objectsRoot.add(root);
            }
            root.userData.locked = obj.locked;
            if (!(gizmo.dragging && state.selectedId === obj.id))
                applyTransform(root, obj.transform);
        }
        for (const [id, root] of byId)
            if (!seen.has(id)) {
                disposeObject(root);
                byId.delete(id);
            }
        syncLights(doc.lights);
        if (state.selectedId && !byId.has(state.selectedId))
            select(null);
        else
            refreshSelection();
    }

    function syncLights(lights) {
        const seen = new Set();
        for (const spec of lights) {
            seen.add(spec.id);
            let entry = lightById.get(spec.id);
            if (entry && entry.type !== spec.type) {
                lightsRoot.remove(entry.light, entry.icon);
                if (entry.light.target)
                    lightsRoot.remove(entry.light.target);
                entry = null;
            }
            if (!entry) {
                const light = createLight(spec);
                const icon = lightIcon(spec);
                lightsRoot.add(light, icon);
                if (light.target)
                    lightsRoot.add(light.target);
                entry = { type: spec.type, light, icon };
                lightById.set(spec.id, entry);
            }
            updateLight(entry.light, spec);
            if (spec.type === 'sun')
                entry.icon.visible = false;
            else
                entry.icon.position.fromArray(spec.position);
        }
        for (const [id, entry] of lightById)
            if (!seen.has(id)) {
                lightsRoot.remove(entry.light, entry.icon);
                if (entry.light.target)
                    lightsRoot.remove(entry.light.target);
                entry.light.dispose?.();
                lightById.delete(id);
            }
    }

    function lightIcon(spec) {
        const g = new THREE.Group();
        g.userData.helper = true;
        const color = spec.type === 'window' ? '#9fd3ff' : '#ffd27a';
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 10), new THREE.MeshBasicMaterial({ color }));
        g.add(bulb);
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.008, 6, 32), new THREE.MeshBasicMaterial({ color }));
        g.add(ring);
        return g;
    }

    function disposeObject(root) {
        objectsRoot.remove(root);
        root.traverse(o => {
            if (o.isMesh || o.isLine || o.isSprite) {
                o.geometry?.dispose();
                (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { m.map?.dispose?.(); m.dispose(); });
            }
        });
    }

    // ---- selection & gizmo ----
    function select(id) {
        state.selectedId = id && byId.has(id) ? id : null;
        refreshSelection();
        onSelect(state.selectedId);
    }

    function refreshSelection() {
        const root = state.selectedId ? byId.get(state.selectedId) : null;
        if (root && !root.userData.locked)
            gizmo.attach(root);
        else
            gizmo.detach();
        selectionBox.visible = Boolean(root);
        if (root)
            selectionBox.setFromObject(root);
        applyGizmoMode();
    }

    function applyGizmoMode() {
        gizmo.setMode(state.mode);
        if (state.mode === 'rotate') {
            gizmo.showX = false;
            gizmo.showY = true;
            gizmo.showZ = false;
        }
        else {
            gizmo.showX = true;
            gizmo.showZ = true;
            gizmo.showY = state.allowVertical;
        }
    }

    gizmo.addEventListener('dragging-changed', event => {
        orbit.enabled = !event.value;
        const root = gizmo.object;
        if (!root)
            return;
        if (event.value)
            dragStart = JSON.stringify(readTransform(root));
        else {
            const t = readTransform(root);
            if (JSON.stringify(t) !== dragStart)
                onTransformCommit(root.userData.objectId, t, state.mode);
            dragStart = null;
        }
    });
    gizmo.addEventListener('objectChange', () => {
        if (gizmo.object && !state.allowVertical && state.mode === 'translate')
            gizmo.object.position.y = Math.max(gizmo.object.position.y, -0.05);
        selectionBox.update();
    });

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let down = null;
    renderer.domElement.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY }; });
    renderer.domElement.addEventListener('pointerup', e => {
        if (!down || gizmo.dragging || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5 || e.button !== 0)
            return;
        const rect = renderer.domElement.getBoundingClientRect();
        pointer.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
        raycaster.setFromCamera(pointer, camera);
        const hits = raycaster.intersectObjects(objectsRoot.children, true).filter(h => !h.object.isSprite && h.object.visible);
        let picked = null;
        for (const hit of hits) {
            let o = hit.object;
            while (o && !o.userData.objectId)
                o = o.parent;
            if (o) {
                // Clicking the floor or walls deselects unless nothing else is under the cursor.
                if (o.userData.locked && hits.some(h => { let p = h.object; while (p && !p.userData.objectId) p = p.parent; return p && !p.userData.locked; }))
                    continue;
                picked = o.userData.objectId;
                break;
            }
        }
        select(picked && byId.get(picked)?.userData.locked ? null : picked);
    });

    // ---- camera & frame lines ----
    let W = 1, H = 1;
    function layout() {
        return frameLayout({ lensMm: state.lens, sensorWidthMm: state.sensorWidth, viewportW: W, viewportH: H, frameAspect: ASPECTS[state.aspect] });
    }
    function applyLens() {
        const { frame, vfovDeg } = layout();
        camera.fov = vfovDeg;
        camera.aspect = W / H;
        camera.updateProjectionMatrix();
        if (overlay) {
            overlay.style.setProperty('--fx', `${frame.x}px`);
            overlay.style.setProperty('--fy', `${frame.y}px`);
            overlay.style.setProperty('--fw', `${frame.w}px`);
            overlay.style.setProperty('--fh', `${frame.h}px`);
            const label = overlay.querySelector('[data-frame-label]');
            if (label)
                label.textContent = `${state.lens} mm · ${state.aspect} · ${horizontalFOV(state.lens, state.sensorWidth).toFixed(1)}° wide`;
        }
    }
    function resize() {
        W = Math.max(1, host.clientWidth);
        H = Math.max(1, host.clientHeight);
        renderer.setSize(W, H, false);
        applyLens();
    }
    const ro = new ResizeObserver(resize);
    ro.observe(host);
    resize();

    function setLens(mm) { state.lens = mm; applyLens(); }
    function setAspect(aspect) { state.aspect = aspect; applyLens(); }
    function setSensor(widthMm) { state.sensorWidth = widthMm; applyLens(); }
    function getCamera() {
        const r = n => +n.toFixed(3);
        return { position: camera.position.toArray().map(r), target: orbit.target.toArray().map(r) };
    }
    let fly = null;
    function goTo(cam, { lens, aspect, instant = false } = {}) {
        if (lens)
            state.lens = lens;
        if (aspect)
            state.aspect = aspect;
        applyLens();
        const to = { position: new THREE.Vector3(...cam.position), target: new THREE.Vector3(...cam.target) };
        if (instant) {
            camera.position.copy(to.position);
            orbit.target.copy(to.target);
            orbit.update();
            fly = null;
        }
        else
            fly = to;
    }

    /** Render one shot to an image (PNG data URL) at exactly the shot's frame. Same idea as Yasin's captureShot. */
    function renderShot(shot, width = 480) {
        const height = Math.round(width / ASPECTS[shot.aspect]);
        const shotCam = new THREE.PerspectiveCamera(captureFov(shot.lens_mm, ASPECTS[shot.aspect], state.sensorWidth), ASPECTS[shot.aspect], 0.05, 120);
        shotCam.position.fromArray(shot.camera.position);
        shotCam.lookAt(new THREE.Vector3(...shot.camera.target));
        const prevSize = renderer.getSize(new THREE.Vector2());
        const prevRatio = renderer.getPixelRatio();
        helpers.visible = false;
        lightById.forEach(e => { e.icon.visible = false; });
        try {
            renderer.setPixelRatio(1);
            renderer.setSize(width, height, false);
            renderer.render(scene, shotCam);
            const out = document.createElement('canvas');
            out.width = width;
            out.height = height;
            out.getContext('2d').drawImage(renderer.domElement, 0, 0, width, height);
            return out.toDataURL('image/png');
        }
        finally {
            helpers.visible = true;
            lightById.forEach((e, id) => { e.icon.visible = state.doc?.lights.find(l => l.id === id)?.type !== 'sun'; });
            renderer.setPixelRatio(prevRatio);
            renderer.setSize(prevSize.x, prevSize.y, false);
            applyLens();
            renderer.render(scene, camera);
        }
    }

    let raf = 0;
    function loop() {
        if (fly) {
            camera.position.lerp(fly.position, 0.18);
            orbit.target.lerp(fly.target, 0.18);
            if (camera.position.distanceTo(fly.position) < 0.002 && orbit.target.distanceTo(fly.target) < 0.002) {
                camera.position.copy(fly.position);
                orbit.target.copy(fly.target);
                fly = null;
            }
        }
        orbit.update();
        if (selectionBox.visible && state.selectedId)
            selectionBox.setFromObject(byId.get(state.selectedId));
        renderer.render(scene, camera);
        raf = requestAnimationFrame(loop);
    }
    loop();

    return {
        renderer, scene, camera, orbit, gizmo, state,
        sync, select, setLens, setAspect, setSensor, getCamera, goTo, renderShot,
        setMode(mode) { state.mode = mode; applyGizmoMode(); },
        setAllowVertical(on) { state.allowVertical = on; applyGizmoMode(); },
        objectRoot: id => byId.get(id) ?? null,
        get objectCount() { return byId.size; },
        isCameraMoving: () => Boolean(fly),
        dispose() { cancelAnimationFrame(raf); ro.disconnect(); gizmo.dispose(); orbit.dispose(); renderer.dispose(); renderer.domElement.remove(); },
    };
}

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createSun, loadEnvironment } from './lighting.js';
import { applyQualityPreset, QUALITY_PRESETS } from './qualityPresets.js';
import { addSceneFromProject } from './prefabs.js';
import { createFilmPostFX } from './postprocessing.js';
import { VISUAL_STUDIES, STUDY_ORDER, getStudyFrames, assertControlledStudy } from './studyPlans.js';
const TONE_MODES = Object.freeze({ None: THREE.NoToneMapping, ACES: THREE.ACESFilmicToneMapping, AgX: THREE.AgXToneMapping });
export { TONE_MODES, QUALITY_PRESETS };
export async function createSceneRenderer({ host, project, onStatus = () => { } }) {
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, alpha: false, powerPreference: 'high-performance' });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = TONE_MODES.AgX;
    renderer.toneMappingExposure = 1.05;
    renderer.setClearColor('#bdafa0');
    renderer.shadowMap.enabled = true;
    host.append(renderer.domElement);
    renderer.domElement.setAttribute('aria-label', 'Framecraft interactive café 3D viewport');
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#b9ad9e');
    scene.fog = new THREE.Fog('#b9ad9e', 20, 45);
    const camera = new THREE.PerspectiveCamera(39, 1, .1, 80);
    const { layout } = addSceneFromProject(scene, project, 'scene_cafe');
    const sun = createSun(scene);
    const postFX = createFilmPostFX(renderer, scene, camera);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = .065;
    controls.maxPolarAngle = Math.PI * .49;
    controls.minDistance = 2.2;
    controls.maxDistance = 19;
    const cameraByShot = new Map(layout.camera_poses.map(p => [p.shot_id, p]));
    const state = { toneMapping: 'AgX', quality: 'Review', exposure: 1.05, shadows: true, sun: true, environment: true, film: false, shotId: project.shots[0].id };
    let environment = null;
    let raf = 0, disposed = false;
    let frameCount = 0, framesStart = performance.now();
    let desiredCamera = null;
    let viewportWidth = 1, viewportHeight = 1;
    let resizeObserver;
    let hdrReady = false;
    const setShot = (shotId, instant = false) => {
        const pose = cameraByShot.get(shotId);
        if (!pose)
            throw new Error(`Unknown camera for ${shotId}`);
        state.shotId = shotId;
        camera.fov = pose.fov_deg;
        camera.updateProjectionMatrix();
        desiredCamera = { position: new THREE.Vector3(...pose.position), target: new THREE.Vector3(...pose.target) };
        if (instant) {
            camera.position.copy(desiredCamera.position);
            controls.target.copy(desiredCamera.target);
            desiredCamera = null;
            controls.update();
        }
    };
    setShot(state.shotId, true);
    const resize = () => {
        viewportWidth = Math.max(1, host.clientWidth);
        viewportHeight = Math.max(1, host.clientHeight);
        camera.aspect = viewportWidth / viewportHeight;
        camera.updateProjectionMatrix();
        applyQualityPreset({ renderer, scene, sun, quality: state.quality, viewportWidth, viewportHeight });
        postFX.resize(viewportWidth, viewportHeight, renderer.getPixelRatio());
    };
    resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(host);
    resize();
    const setQuality = (quality) => {
        if (!QUALITY_PRESETS[quality])
            throw new Error('Unknown quality');
        state.quality = quality;
        const preset = applyQualityPreset({ renderer, scene, sun, quality, viewportWidth, viewportHeight });
        postFX.resize(viewportWidth, viewportHeight, renderer.getPixelRatio());
        onStatus(`${quality} · shadows ${preset.shadowResolution}px · DPR ≤ ${preset.pixelRatioCap}`);
        return preset;
    };
    const setTone = (tone) => {
        if (!(tone in TONE_MODES))
            throw new Error('Unknown tone mapping mode');
        state.toneMapping = tone;
        renderer.toneMapping = TONE_MODES[tone];
        // Three.js recompiles material programs when renderer.toneMapping changes.
        scene.traverse(obj => { if (obj.isMesh && obj.material)
            obj.material.needsUpdate = true; });
        onStatus(`${tone} tone mapping · linear HDR → sRGB display`);
    };
    const setExposure = (exposure) => { state.exposure = exposure; renderer.toneMappingExposure = exposure; };
    const setShadows = (enabled) => {
        state.shadows = enabled;
        renderer.shadowMap.enabled = enabled;
        renderer.shadowMap.needsUpdate = true;
        // Force shader recompilation on GPUs that cache shadowMap defines.
        scene.traverse(obj => {
            if (obj.isMesh && obj.material) {
                const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
                materials.forEach(material => { material.needsUpdate = true; });
            }
        });
    };
    const setSun = (enabled) => { state.sun = enabled; sun.visible = enabled; };
    const setEnvironment = (enabled) => { state.environment = enabled; scene.environment = enabled ? environment?.texture ?? null : null; };
    const setFilm = (enabled) => { state.film = enabled; };
    const draw = () => state.film ? postFX.render(performance.now() / 1000) : renderer.render(scene, camera);
    const render = () => {
        if (disposed)
            return;
        if (desiredCamera) {
            camera.position.lerp(desiredCamera.position, .075);
            controls.target.lerp(desiredCamera.target, .075);
            if (camera.position.distanceTo(desiredCamera.position) < .005 && controls.target.distanceTo(desiredCamera.target) < .005) {
                camera.position.copy(desiredCamera.position);
                controls.target.copy(desiredCamera.target);
                desiredCamera = null;
            }
        }
        controls.update();
        draw();
        frameCount++;
        const now = performance.now();
        if (now - framesStart >= 1000) {
            const fps = Math.round(frameCount * 1000 / (now - framesStart));
            document.getElementById('fps-value')?.replaceChildren(`${fps} FPS`);
            frameCount = 0;
            framesStart = now;
        }
        raf = requestAnimationFrame(render);
    };
    render();
    onStatus('Loading HDRI lighting…');
    // HDRI loads in the background. Never block the UI/event binding on this fetch.
    const ready = loadEnvironment(scene, renderer, (message) => onStatus(message)).then(env => {
        if (disposed) {
            env.dispose();
            return 'Disposed';
        }
        environment = { texture: scene.environment, dispose: env.dispose, source: env.source };
        hdrReady = true;
        if (!state.environment)
            scene.environment = null;
        return env.source;
    }).catch(error => {
        console.warn('Environment loading failed', error);
        onStatus(`Environment warning: ${error.message}`);
        return 'Environment unavailable';
    });
    /** Capture the current WebGL canvas at its configured resolution. */
    const screenshot = (name = 'framecraft-cafe.png') => {
        draw();
        const url = renderer.domElement.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = name;
        link.href = url;
        link.click();
        return url;
    };
    /** Export controlled comparisons from the current WebGL scene.
     * We save the entire live camera and renderer state and restore it in finally,
     * even if an export or WebGL draw fails.
     */
    const exportStudy = (studyName = 'tone') => {
        if (!hdrReady)
            throw new Error('HDR environment still loading; try the export again in a moment.');
        const names = studyName === 'all' ? STUDY_ORDER : [studyName];
        names.forEach(assertControlledStudy);
        const snapshot = { ...state, cameraPosition: camera.position.clone(), target: controls.target.clone(), fov: camera.fov,
            sunIntensity: sun.intensity, environmentIntensity: scene.environmentIntensity };
        const W = 1680, pad = 42, gap = 18;
        const aspect = Math.max(.4, Math.min(1.5, renderer.domElement.height / Math.max(1, renderer.domElement.width)));
        const rowHeights = names.map(name => {
            const count = VISUAL_STUDIES[name].panels.length;
            const width = (W - pad * 2 - gap * (count - 1)) / count;
            return Math.round(Math.min(480, width * aspect));
        });
        const pageH = 135 + rowHeights.reduce((sum, height) => sum + 86 + height + 100, 0) + 72;
        const output = document.createElement('canvas');
        output.width = W;
        output.height = pageH;
        const ctx = output.getContext('2d');
        if (!ctx)
            throw new Error('Cannot create 2D report canvas');
        ctx.fillStyle = '#10151b';
        ctx.fillRect(0, 0, W, pageH);
        ctx.fillStyle = '#f5e9d6';
        ctx.font = '700 34px system-ui';
        ctx.fillText('FRAMECRAFT   /   RENDERING STUDIES', pad, 67);
        ctx.fillStyle = '#9cabb3';
        ctx.font = '17px system-ui';
        ctx.fillText('Scene Café 01  ·  same shot and exposure within each study  ·  real Three.js output', pad, 101);
        let top = 135;
        try {
            // Capture mode changes sampling resolution but not actual scene lighting.
            setQuality('Capture');
            for (const name of names) {
                const study = VISUAL_STUDIES[name];
                const frames = getStudyFrames(name);
                const count = frames.length;
                const width = (W - pad * 2 - gap * (count - 1)) / count;
                const height = Math.round(Math.min(480, width * aspect));
                ctx.font = '700 24px system-ui';
                ctx.fillStyle = '#ecd0a6';
                ctx.fillText(study.title, pad, top + 31);
                ctx.font = '16px system-ui';
                ctx.fillStyle = '#a6b1b6';
                ctx.fillText(study.subtitle, pad, top + 60);
                const panelTop = top + 86;
                for (let i = 0; i < frames.length; i++) {
                    const frame = frames[i];
                    // All non-target variables are the same across this comparison row.
                    setShot(frame.shot, true);
                    setTone(frame.tone);
                    setExposure(frame.exposure);
                    setSun(frame.sun);
                    setEnvironment(frame.environment);
                    setShadows(frame.shadows);
                    setFilm(false);
                    sun.intensity = frame.sunIntensity;
                    scene.environmentIntensity = frame.environmentIntensity;
                    sun.shadow.needsUpdate = true;
                    draw();
                    const x = pad + i * (width + gap);
                    ctx.drawImage(renderer.domElement, x, panelTop, width, height);
                    ctx.fillStyle = '#202932';
                    ctx.fillRect(x, panelTop + height, width, 64);
                    ctx.fillStyle = '#f3e5cb';
                    ctx.font = '700 18px system-ui';
                    ctx.fillText(frame.label, x + 12, panelTop + height + 24);
                    ctx.fillStyle = '#b8c0be';
                    ctx.font = '13px system-ui';
                    // Fit diagnostic notes to one line without overlapping adjacent panels.
                    const max = width - 24;
                    let note = frame.caption;
                    while (note.length > 8 && ctx.measureText(note).width > max)
                        note = note.slice(0, -2) + '…';
                    ctx.fillText(note, x + 12, panelTop + height + 48);
                }
                top = panelTop + height + 100;
            }
            ctx.fillStyle = '#72828a';
            ctx.font = '14px system-ui';
            ctx.fillText('Controlled comparison · Within each study, framing and all non-target parameters are locked.', pad, pageH - 37);
            ctx.textAlign = 'right';
            ctx.fillText('T4.2 / WEEK 01 · 2026', W - pad, pageH - 37);
            ctx.textAlign = 'left';
            const link = document.createElement('a');
            link.href = output.toDataURL('image/png');
            link.download = `framecraft-${studyName === 'all' ? 'visual-evidence' : studyName + '-study'}.png`;
            link.click();
            onStatus(`${studyName === 'all' ? 'Three controlled studies' : VISUAL_STUDIES[studyName].title} exported · PNG`);
            return output;
        }
        finally {
            setTone(snapshot.toneMapping);
            setExposure(snapshot.exposure);
            setQuality(snapshot.quality);
            setSun(snapshot.sun);
            setEnvironment(snapshot.environment);
            setShadows(snapshot.shadows);
            setFilm(snapshot.film);
            sun.intensity = snapshot.sunIntensity;
            scene.environmentIntensity = snapshot.environmentIntensity;
            // setShot restores shot ID and the camera's original focal length;
            // a manual orbit is retained rather than jumping to a canned pose.
            setShot(snapshot.shotId, true);
            camera.position.copy(snapshot.cameraPosition);
            controls.target.copy(snapshot.target);
            camera.fov = snapshot.fov;
            camera.updateProjectionMatrix();
            desiredCamera = null;
            controls.update();
            draw();
        }
    };
    const compare = () => exportStudy('tone');
    return {
        renderer, scene, camera, controls, state, ready,
        get environmentSource() { return environment?.source ?? 'Loading environment…'; },
        setShot, setQuality, setTone, setExposure, setShadows, setSun, setEnvironment, setFilm, screenshot, compare, exportStudy,
        get isHdrReady() { return hdrReady; },
        dispose() { disposed = true; cancelAnimationFrame(raf); resizeObserver.disconnect(); controls.dispose(); postFX.dispose(); environment?.dispose(); scene.traverse(o => { if (o.isMesh) {
            o.geometry.dispose();
            const mats = Array.isArray(o.material) ? o.material : [o.material];
            mats.forEach(m => m.dispose());
        } }); renderer.dispose(); renderer.domElement.remove(); },
    };
}

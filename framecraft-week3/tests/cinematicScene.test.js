import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { cafeProject } from '../src/data/cafe.scene.js';
import { addSceneFromProject } from '../src/renderer/prefabs.js';
import { validateProject } from '../src/schema/project.schema.js';
test('Café Lumière v2 remains strictly schema-driven with all stable scene instances', () => {
    const result = validateProject(cafeProject);
    assert.equal(result.success, true, JSON.stringify(result.errors));
    const scene = new THREE.Scene();
    const { groups } = addSceneFromProject(scene, result.data, 'scene_cafe');
    assert.equal(groups.size, 17);
    assert.deepEqual([...groups.keys()], cafeProject.scene_layouts[0].instances.map(x => x.id));
});
test('cinematic set produces genuinely more mesh detail, without extra schema IDs', () => {
    const scene = new THREE.Scene();
    const { groups } = addSceneFromProject(scene, cafeProject, 'scene_cafe');
    let meshCount = 0, physicallyCoated = 0, lights = 0;
    scene.traverse(obj => {
        if (obj.isMesh) {
            meshCount++;
            if (obj.material?.isMeshPhysicalMaterial)
                physicallyCoated++;
        }
        if (obj.isLight)
            lights++;
    });
    assert.ok(meshCount > 300, `Only ${meshCount} meshes; cinematic set appears incomplete`);
    assert.ok(physicallyCoated >= 10, `Only ${physicallyCoated} clearcoat / physical surface meshes`);
    assert.ok(lights >= 2, 'Pendant lights must actually illuminate the café');
    for (const name of ['instance_mug', 'instance_counter', 'instance_arch', 'instance_table']) {
        assert.ok(groups.get(name)?.children.length >= 7, `${name} missing detailed geometry`);
    }
});
test('transparent glass never casts opaque window shadows', () => {
    const scene = new THREE.Scene();
    addSceneFromProject(scene, cafeProject, 'scene_cafe');
    let glassCount = 0;
    scene.traverse(o => {
        if (o.isMesh && o.material?.transparent && o.material.opacity < 0.5) {
            glassCount++;
            assert.equal(o.castShadow, false, `${o.name || 'glass'} casts an opaque shadow`);
        }
    });
    assert.ok(glassCount > 4, 'Transparent glazing was not built');
});

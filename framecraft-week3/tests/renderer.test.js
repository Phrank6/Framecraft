import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { cafeProject } from '../src/data/cafe.scene.js';
import { validateProject } from '../src/schema/project.schema.js';
import { addSceneFromProject } from '../src/renderer/prefabs.js';
test('café renderer places all 17 instances even when optional visible is omitted', () => {
    const scene = new THREE.Scene();
    const { groups } = addSceneFromProject(scene, cafeProject, 'scene_cafe');
    assert.equal(groups.size, 17);
    assert.equal(scene.children.length, 17);
    assert.ok(groups.has('instance_maya'));
    assert.ok(groups.has('instance_floor'));
});
test('explicitly hidden instances stay hidden', () => {
    const project = structuredClone(cafeProject);
    project.scene_layouts[0].instances[0].visible = false;
    const scene = new THREE.Scene();
    const { groups } = addSceneFromProject(scene, project, 'scene_cafe');
    assert.equal(groups.size, 16);
    assert.equal(groups.has('instance_floor'), false);
});
test('canonical Zod-parsed project renders the same instance count as source data', () => {
    const validation = validateProject(cafeProject);
    assert.equal(validation.success, true, JSON.stringify(validation.errors));
    const scene = new THREE.Scene();
    const { groups } = addSceneFromProject(scene, validation.data, 'scene_cafe');
    assert.equal(groups.size, 17);
});

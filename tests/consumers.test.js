import test from 'node:test';
import assert from 'node:assert/strict';
import { cafeProject } from '../src/data/cafe.scene.js';
import { listCharacterAssets } from '../src/consumers/assetTrack.js';
import { listStoryboardFrames } from '../src/consumers/storyboardTrack.js';
test('example asset-ingestion consumer imports contracts in Node without Three.js', () => {
    const entries = listCharacterAssets(cafeProject);
    assert.equal(entries.length, 2);
    assert.equal(entries[0].characterId, 'char_maya');
});
test('example storyboard consumer imports Shot and Timeline contracts', () => {
    const frames = listStoryboardFrames(cafeProject);
    assert.equal(frames.length, 2);
    assert.deepEqual(frames.map(f => f.startSeconds), [0, 4]);
    assert.equal(frames[0].camera.id, 'camera_wide');
});

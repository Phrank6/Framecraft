import test from 'node:test';
import assert from 'node:assert/strict';
import { createSceneStore, ops } from '../src/editor/sceneStore.js';
import { cafeStoryboard } from '../src/data/cafe.storyboard.js';
import { serializeStoryboard, parseStoryboardJSON } from '../src/schema/storyboard.schema.js';
import { catalogItem, objectFromCatalog } from '../src/editor/catalog.js';

const store = () => createSceneStore(structuredClone(cafeStoryboard));

test('undo reverses 10 edits in a row, redo brings them back', () => {
    const s = store();
    const start = serializeStoryboard(s.doc);
    const states = [start];
    for (let i = 0; i < 10; i++) {
        s.edit(`Move table ${i}`, d => ops.setTransform(d, 'obj_table', { position: [i * 0.1, 0, 0.7] }));
        states.push(serializeStoryboard(s.doc));
    }
    for (let i = 10; i > 0; i--) {
        assert.equal(serializeStoryboard(s.doc), states[i]);
        assert.equal(s.undo(), `Move table ${i - 1}`);
    }
    assert.equal(serializeStoryboard(s.doc), start);
    assert.equal(s.canUndo(), false);
    for (let i = 1; i <= 10; i++) {
        s.redo();
        assert.equal(serializeStoryboard(s.doc), states[i]);
    }
});

test('a new edit after undo clears redo', () => {
    const s = store();
    s.edit('a', d => ops.setTransform(d, 'obj_table', { position: [1, 0, 1] }));
    s.undo();
    assert.equal(s.canRedo(), true);
    s.edit('b', d => ops.setTransform(d, 'obj_table', { position: [2, 0, 1] }));
    assert.equal(s.canRedo(), false);
});

test('add, duplicate and delete are one undo step each', () => {
    const s = store();
    const n = s.doc.objects.length;
    const id = s.edit('Add bench', d => ops.addObject(d, objectFromCatalog(catalogItem('bench'), { position: [1, 0, 2] })));
    assert.equal(s.doc.objects.length, n + 1);
    const copyId = s.edit('Duplicate', d => ops.duplicateObject(d, id));
    assert.notEqual(copyId, id);
    assert.deepEqual(s.doc.objects.find(o => o.id === copyId).transform.position, [1.5, 0, 2.5]);
    s.edit('Delete', d => ops.deleteObject(d, id));
    assert.equal(s.doc.objects.length, n + 1);
    s.undo(); s.undo(); s.undo();
    assert.equal(s.doc.objects.length, n);
});

test('locked set pieces cannot be moved or deleted', () => {
    const s = store();
    assert.throws(() => s.edit('Move floor', d => ops.setTransform(d, 'obj_floor', { position: [1, 0, 0] })), /locked/);
    assert.throws(() => s.edit('Delete walls', d => ops.deleteObject(d, 'obj_arch')), /locked/);
    assert.equal(s.canUndo(), false, 'a failed edit must not leave an undo step');
});

test('an invalid edit is refused and the scene is unchanged', () => {
    const s = store();
    const before = serializeStoryboard(s.doc);
    assert.throws(() => s.edit('Bad', d => { d.shots[0].lens_mm = -5; }));
    assert.equal(serializeStoryboard(s.doc), before);
});

test('saving shots numbers them in order and deleting renumbers', () => {
    const s = store();
    const id = s.edit('Save shot', d => ops.addShot(d, { camera: { position: [1, 2, 3], target: [0, 1, 0] }, lens_mm: 50 }));
    assert.equal(s.doc.shots.find(x => x.id === id).number, 5);
    s.edit('Delete shot 2', d => ops.deleteShot(d, 'shot_02'));
    assert.deepEqual(s.doc.shots.map(x => x.number), [1, 2, 3, 4]);
});

test('edit → save → reload is identical', () => {
    const s = store();
    s.edit('Move mug', d => ops.setTransform(d, 'obj_mug', { position: [-0.3, 0.94, 0.6], rotation_deg: [0, 40, 0] }));
    s.edit('Add shot', d => ops.addShot(d, { camera: { position: [2, 1.6, 3], target: [-1, 1, 1] }, lens_mm: 85, aspect: '2.39:1' }));
    const saved = serializeStoryboard(s.doc);
    const reopened = createSceneStore(parseStoryboardJSON(saved));
    assert.equal(serializeStoryboard(reopened.doc), saved);
});

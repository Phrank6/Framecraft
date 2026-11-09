import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateStoryboard, parseStoryboardJSON, serializeStoryboard } from '../src/schema/storyboard.schema.js';
import { cafeStoryboard } from '../src/data/cafe.storyboard.js';

const copy = () => structuredClone(cafeStoryboard);
const fails = (doc, word) => {
    const r = validateStoryboard(doc);
    assert.equal(r.success, false, 'expected the scene to be rejected');
    assert.ok(r.errors.some(e => `${e.path} ${e.message}`.includes(word)), JSON.stringify(r.errors, null, 2));
};

test('the café scene file validates', () => {
    const r = validateStoryboard(cafeStoryboard);
    assert.equal(r.success, true, JSON.stringify(r.errors, null, 2));
    assert.equal(r.data.objects.length, 17);
    assert.equal(r.data.shots.length, 4);
    assert.deepEqual(r.data.lights.map(l => l.type).sort(), ['fixture', 'lamp', 'sun', 'window']);
});

test('the checked-in JSON copy is identical to the generated café scene', () => {
    const onDisk = readFileSync(new URL('../examples/cafe.storyboard.json', import.meta.url), 'utf8');
    assert.equal(onDisk, serializeStoryboard(validateStoryboard(cafeStoryboard).data));
});

test('save → load gives back the same scene', () => {
    const doc = validateStoryboard(cafeStoryboard).data;
    const again = parseStoryboardJSON(serializeStoryboard(doc));
    assert.deepEqual(again, doc);
});

test('light spec keeps Linda\'s field names', () => {
    const fixture = cafeStoryboard.lights.find(l => l.type === 'fixture');
    assert.deepEqual(Object.keys(fixture).sort(), ['id', 'intensity', 'kelvin', 'position', 'softness', 'target', 'type']);
    const sun = cafeStoryboard.lights.find(l => l.type === 'sun');
    assert.deepEqual(Object.keys(sun).sort(), ['date', 'id', 'intensity', 'kelvin', 'lat', 'lon', 'softness', 'type']);
});

test('shots carry Yasin\'s storyboard fields', () => {
    for (const shot of validateStoryboard(cafeStoryboard).data.shots)
        for (const key of ['number', 'lens_mm', 'time', 'light_note', 'script_line'])
            assert.ok(key in shot, `${shot.id} missing ${key}`);
});

test('rejects softness above 1', () => { const d = copy(); d.lights[1].softness = 1.5; fails(d, 'softness'); });
test('rejects a sun without a date', () => { const d = copy(); delete d.lights[0].date; fails(d, 'date'); });
test('rejects a lamp without a position', () => { const d = copy(); delete d.lights[2].position; fails(d, 'position'); });
test('rejects duplicate object IDs', () => { const d = copy(); d.objects[3].id = d.objects[2].id; fails(d, 'Duplicate ID'); });
test('rejects duplicate shot numbers', () => { const d = copy(); d.shots[1].number = 1; fails(d, 'Duplicate shot number'); });
test('rejects a character without character info', () => { const d = copy(); const c = d.objects.find(o => o.kind === 'character'); delete c.character; fails(d, 'character'); });
test('rejects a bad time', () => { const d = copy(); d.shots[0].time = '9am'; fails(d, 'HH:MM'); });
test('rejects an ID without the right prefix', () => { const d = copy(); d.objects[0].id = 'floor_main'; fails(d, 'obj_'); });
test('parseStoryboardJSON explains bad files', () => {
    assert.throws(() => parseStoryboardJSON('{not json'), /Not a JSON file/);
    assert.throws(() => parseStoryboardJSON('{"format":"other"}'), /not valid/);
});

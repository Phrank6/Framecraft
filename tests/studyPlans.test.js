import test from 'node:test';
import assert from 'node:assert/strict';
import { VISUAL_STUDIES, STUDY_ORDER, getStudyFrames, assertControlledStudy } from '../src/renderer/studyPlans.js';
test('all three visual comparisons isolate exactly one targeted variable', () => {
    assert.deepEqual(STUDY_ORDER, ['tone', 'environment', 'shadows']);
    for (const name of STUDY_ORDER) {
        assert.equal(assertControlledStudy(name), true);
        const frames = getStudyFrames(name);
        assert.equal(frames.length, name === 'tone' ? 3 : 2);
        assert.equal(new Set(frames.map(f => f[name === 'tone' ? 'tone' : name])).size, frames.length);
        assert.equal(new Set(frames.map(f => f.shot)).size, 1);
        assert.equal(new Set(frames.map(f => f.exposure)).size, 1);
    }
});
test('comparison captions identify observable image differences', () => {
    for (const name of STUDY_ORDER) {
        const study = VISUAL_STUDIES[name];
        assert.match(study.subtitle, /Same camera/i);
        for (const frame of study.panels) {
            assert.ok(frame.label.length > 5);
            assert.ok(frame.caption.length > 15);
        }
    }
});
test('quality-independent comparison parameters do not mutate source plans', () => {
    const frames = getStudyFrames('environment');
    frames[0].tone = 'None';
    assert.equal(getStudyFrames('environment')[0].tone, 'AgX');
});

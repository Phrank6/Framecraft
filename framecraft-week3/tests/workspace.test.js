import test from 'node:test';
import assert from 'node:assert/strict';
import { renderWorkspace, icon } from '../src/ui/workspace.js';
import { wirePanelToggles } from '../src/ui/panels.js';
const markup = renderWorkspace();
const allIds = [...markup.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
const counts = allIds.reduce((acc, id) => (acc[id] = (acc[id] || 0) + 1, acc), {});
test('workspace includes each original renderer-control ID exactly once', () => {
    for (const id of [
        'app', 'viewport', 'viewport-loading', 'active-shot-label', 'fps-value', 'gpu-status', 'tone-badge',
        'schema-status', 'system-status', 'validation-text', 'hdri-origin', 'exposure', 'exposure-value',
        'toggle-hdri', 'toggle-sun', 'toggle-shadows', 'toggle-film', 'quality-detail',
        'camera-reset', 'export-frame', 'export-comparison', 'export-lighting', 'export-shadows', 'export-report',
    ]) {
        if (id === 'app')
            continue; // Created by index.html rather than the template.
        assert.equal(counts[id], 1, `Expected exactly one #${id}`);
    }
    for (const [id, count] of Object.entries(counts))
        assert.equal(count, 1, `Duplicate id #${id}`);
});
test('timeline and scene navigation offer both real shot IDs', () => {
    for (const id of ['shot_01', 'shot_02']) {
        assert.equal((markup.match(new RegExp(`data-shot="${id}"`, 'g')) ?? []).length, 2);
    }
    assert.equal((markup.match(/data-tone="/g) ?? []).length, 3);
    assert.equal((markup.match(/data-quality="/g) ?? []).length, 3);
    assert.ok(markup.indexOf('class="viewport"') < markup.indexOf('class="timeline"'));
});
test('visual controls have accessible labels and collapsible panes exist', () => {
    assert.match(markup, /id="toggle-scenes"[^>]+aria-controls="scene-panel"/);
    assert.match(markup, /id="toggle-inspector"[^>]+aria-controls="properties-panel"/);
    for (const side of ['scene-panel', 'properties-panel'])
        assert.ok(allIds.includes(side));
    assert.match(markup, /aria-label="Tone mapping"/);
    assert.match(markup, /aria-label="Exposure"/);
    assert.match(markup, /role="status"/);
    assert.throws(() => icon('not-an-icon'), /Unknown icon/);
});
class FakeButton extends EventTarget {
    constructor() { super(); this.attributes = {}; }
    setAttribute(name, value) { this.attributes[name] = value; }
    click() { this.dispatchEvent(new Event('click')); }
}
test('collapsing and reopening sidebars toggles body classes and aria-expanded', () => {
    const selected = new Set();
    const buttons = { 'toggle-scenes': new FakeButton(), 'toggle-inspector': new FakeButton() };
    const root = { body: { classList: { toggle(name) { if (selected.has(name)) {
                    selected.delete(name);
                    return false;
                } selected.add(name); return true; } } }, getElementById: id => buttons[id] };
    wirePanelToggles(root);
    buttons['toggle-scenes'].click();
    assert.equal(selected.has('scenes-collapsed'), true);
    assert.equal(buttons['toggle-scenes'].attributes['aria-expanded'], 'false');
    buttons['toggle-inspector'].click();
    assert.equal(selected.has('inspector-collapsed'), true);
    buttons['toggle-scenes'].click();
    buttons['toggle-inspector'].click();
    assert.equal(selected.size, 0);
    assert.equal(buttons['toggle-scenes'].attributes['aria-expanded'], 'true');
    assert.equal(buttons['toggle-inspector'].attributes['aria-expanded'], 'true');
});

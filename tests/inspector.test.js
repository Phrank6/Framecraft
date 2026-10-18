import test from 'node:test';
import assert from 'node:assert/strict';
import { wireInspector } from '../src/ui/inspector.js';
class StubElement extends EventTarget {
    constructor(dataset = {}) {
        super();
        this.dataset = dataset;
        this.value = '1.05';
        this.checked = true;
        this.textContent = '';
        this.innerHTML = '';
        this.attributes = {};
        const selected = new Set();
        this.classList = {
            toggle: (className, enabled) => { if (enabled)
                selected.add(className);
            else
                selected.delete(className); },
            contains: className => selected.has(className)
        };
    }
    setAttribute(key, value) { this.attributes[key] = value; }
    click() { this.dispatchEvent(new Event('click')); }
    change(checked) { this.checked = checked; this.dispatchEvent(new Event('change')); }
    input(value) { this.value = String(value); this.dispatchEvent(new Event('input')); }
}
function makeRoot() {
    const selectors = {};
    for (const [kind, values] of Object.entries({ tone: ['None', 'ACES', 'AgX'], quality: ['Draft', 'Review', 'Capture'], shot: ['shot_01', 'shot_02'] })) {
        selectors[`[data-${kind}]`] = values.map(value => new StubElement({ [kind]: value }));
    }
    const ids = ['tone-badge', 'quality-detail', 'exposure', 'exposure-value', 'active-shot-label', 'toggle-hdri', 'toggle-sun', 'toggle-shadows', 'toggle-film', 'camera-reset', 'export-frame', 'export-comparison', 'export-lighting', 'export-shadows', 'export-report'];
    const elements = Object.fromEntries(ids.map(id => [id, new StubElement()]));
    elements['toggle-film'].checked = false;
    return { root: { getElementById: id => elements[id], querySelectorAll: selector => selectors[selector] || [] }, selectors, elements };
}
function fakeRenderer() {
    const log = [];
    const methods = ['setTone', 'setExposure', 'setQuality', 'setEnvironment', 'setSun', 'setShadows', 'setFilm', 'setShot', 'screenshot', 'compare', 'exportStudy'];
    const renderer = Object.fromEntries(methods.map(method => [method, (...args) => { log.push([method, ...args]); return method === 'setQuality' ? { shadowResolution: 1024, pixelRatioCap: 1.5 } : undefined; }]));
    return { renderer, log };
}
test('inspector inputs respond immediately even before renderer attaches', () => {
    const { root, selectors, elements } = makeRoot();
    const statuses = [];
    const controller = wireInspector(root, msg => statuses.push(msg));
    selectors['[data-tone]'][1].click();
    elements['exposure'].input('1.65');
    selectors['[data-quality]'][2].click();
    elements['toggle-sun'].change(false);
    selectors['[data-shot]'][1].click();
    assert.equal(controller.isAttached(), false);
    assert.deepEqual(controller.getState(), { tone: 'ACES', exposure: 1.65, quality: 'Capture', hdri: true, sun: false, shadows: true, film: false, shot: 'shot_02' });
    assert.equal(controller.getActionCount(), 5);
    assert.equal(selectors['[data-tone]'][1].classList.contains('selected'), true);
    assert.equal(selectors['[data-quality]'][2].classList.contains('selected'), true);
    assert.equal(selectors['[data-shot]'][1].classList.contains('active'), true);
    assert.match(elements['tone-badge'].textContent, /ACES \/ 1.65/);
    assert.equal(elements['exposure-value'].textContent, '1.65');
    assert.match(statuses.at(-1), /queued/);
});
test('renderer attachment replays user-selected state then live controls invoke renderer', () => {
    const { root, selectors, elements } = makeRoot();
    const controller = wireInspector(root);
    selectors['[data-tone]'][0].click();
    elements['toggle-hdri'].change(false);
    const { renderer, log } = fakeRenderer();
    controller.attach(renderer);
    assert.equal(controller.isAttached(), true);
    assert.deepEqual(log[0], ['setTone', 'None']);
    assert.ok(log.some(([method, value]) => method === 'setEnvironment' && value === false));
    assert.ok(log.some(([method, value]) => method === 'setShot' && value === 'shot_01'));
    selectors['[data-tone]'][2].click();
    elements['exposure'].input('0.65');
    elements['toggle-shadows'].change(false);
    elements['export-frame'].click();
    elements['export-comparison'].click();
    elements['export-lighting'].click();
    elements['export-shadows'].click();
    elements['export-report'].click();
    assert.ok(log.some(([method, value]) => method === 'exportStudy' && value === 'all'));
    assert.ok(log.some(([method, value]) => method === 'exportStudy' && value === 'shadows'));
    assert.ok(log.some(([method, value]) => method === 'exportStudy' && value === 'environment'));
    assert.ok(log.some(([method, value]) => method === 'setTone' && value === 'AgX'));
    assert.ok(log.some(([method, value]) => method === 'setExposure' && value === 0.65));
    assert.ok(log.some(([method, value]) => method === 'setShadows' && value === false));
    assert.ok(log.some(([method]) => method === 'screenshot'));
    assert.ok(log.some(([method]) => method === 'compare'));
});
test('renderer method errors are surfaced without killing later controls', () => {
    const { root, selectors } = makeRoot();
    const statuses = [];
    const controller = wireInspector(root, msg => statuses.push(msg));
    const { renderer } = fakeRenderer();
    controller.attach(renderer);
    renderer.setTone = () => { throw new Error('Simulated shader failure'); };
    const oldError = console.error;
    console.error = () => { };
    try {
        selectors['[data-tone]'][1].click();
    }
    finally {
        console.error = oldError;
    }
    assert.match(statuses.at(-1), /Simulated shader failure/);
    selectors['[data-quality]'][0].click();
    assert.match(statuses.at(-1), /Quality: Draft · applied/);
});

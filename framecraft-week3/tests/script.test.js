import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseFountain, toSceneList, parseHeading } from '../src/script/fountain.js';
import { extractOffline, buildExtractionRequest, parseExtractionResponse, SceneBreakdownSchema, BREAKDOWN_JSON_SCHEMA } from '../src/script/extract.js';
import { breakdownToStoryboard, timeForScene } from '../src/script/toStoryboard.js';
import { validateStoryboard } from '../src/schema/storyboard.schema.js';
import { createServer } from '../server/ai-server.mjs';

const cafe = readFileSync(new URL('../examples/cafe.fountain', import.meta.url), 'utf8');
const list = toSceneList(parseFountain(cafe));

test('café script: title and two scenes', () => {
    assert.equal(list.title, 'Morning Coffee');
    assert.deepEqual(list.scenes.map(s => s.heading), ['INT. NEIGHBORHOOD CAFE - MORNING', 'EXT. CAFE STREET - CONTINUOUS']);
    assert.deepEqual(list.scenes.map(s => [s.int_ext, s.location, s.time_of_day]), [['INT', 'NEIGHBORHOOD CAFE', 'MORNING'], ['EXT', 'CAFE STREET', 'CONTINUOUS']]);
    assert.equal(list.scenes[0].line, 6);
});

test('café script: both characters and their lines', () => {
    const s1 = list.scenes[0];
    assert.deepEqual(s1.speakers, ['LEO', 'MAYA']);
    const lines = s1.elements.filter(e => e.type === 'dialogue').map(e => `${e.character}: ${e.text}`);
    assert.deepEqual(lines, ['LEO: Morning. The usual?', 'MAYA: One flat white, please.', 'MAYA: First quiet morning in a week.']);
    assert.ok(s1.elements.some(e => e.type === 'parenthetical' && e.text === '(quietly)'));
    assert.deepEqual(list.scenes[1].speakers, ['LEO'], "LEO (O.S.) counts as LEO");
});

test('Fountain details: forced heading, transition, notes, boneyard, centered, dual dialogue', () => {
    const src = 'INT. ROOM - NIGHT\n\nShe waits. [[a note]]\n\n/* cut this\n\nLONG GONE */\n\nCUT TO:\n\n.FLASHBACK\n\n>THE END<\n\nBRICK\nHi.\n\nSTEEL ^\nHey.\n\n@McCLANE\nYippee.\n';
    const p = toSceneList(parseFountain(src));
    assert.deepEqual(p.scenes.map(s => s.heading), ['INT. ROOM - NIGHT', 'FLASHBACK']);
    const all = p.scenes.flatMap(s => s.elements);
    assert.ok(all.some(e => e.type === 'transition' && e.text === 'CUT TO:'));
    assert.ok(!all.some(e => /note|LONG GONE/.test(e.text)), 'notes and boneyard are removed');
    assert.ok(all.some(e => e.type === 'centered' && e.text === 'THE END'));
    assert.ok(all.some(e => e.type === 'character' && e.name === 'STEEL' && e.dual));
    assert.ok(all.some(e => e.type === 'character' && e.name === 'MCCLANE'));
    // Line numbers survive the removed boneyard.
    assert.equal(all.find(e => e.type === 'transition').line, 9);
});

test('heading parts', () => {
    assert.deepEqual(parseHeading('INT./EXT. CAR - MOVING - DAY'), { int_ext: 'INT/EXT', location: 'CAR - MOVING', time_of_day: 'DAY' });
    assert.deepEqual(parseHeading('EXT. ROOFTOP'), { int_ext: 'EXT', location: 'ROOFTOP', time_of_day: null });
    assert.equal(timeForScene('MORNING'), '09:00');
    assert.equal(timeForScene('CONTINUOUS'), '12:00');
});

test('offline breakdown of the café scene: characters, props, tags and lines', () => {
    const b = extractOffline(list.scenes[0]);
    assert.deepEqual(b.characters.map(c => c.name).sort(), ['LEO', 'MAYA']);
    const leo = b.characters.find(c => c.name === 'LEO');
    assert.equal(leo.line, 8, 'LEO is introduced in the action on line 8');
    const props = Object.fromEntries(b.props.map(p => [p.catalog_id, p]));
    for (const id of ['table', 'chair', 'counter', 'display', 'mug', 'saucer'])
        assert.ok(props[id], `missing ${id}: ${b.props.map(p => p.catalog_id)}`);
    assert.equal(props.mug.tag, 'stated');
    assert.equal(props.mug.line, 18);
    assert.ok(b.actions.some(a => a.characters.includes('MAYA') && /smiles/.test(a.description)));
    assert.ok(SceneBreakdownSchema.safeParse(b).success);
});

test('offline breakdown marks location guesses as inferred', () => {
    const scene = toSceneList(parseFountain('INT. DINER - NIGHT\n\nRain on the glass.\n')).scenes[0];
    const b = extractOffline(scene);
    assert.ok(b.props.find(p => p.catalog_id === 'counter' && p.tag === 'inferred' && p.line === null));
});

test('the scene list becomes a valid starter storyboard scene', () => {
    const doc = breakdownToStoryboard({ projectTitle: list.title, scene: list.scenes[0], breakdown: extractOffline(list.scenes[0]) });
    assert.ok(validateStoryboard(doc).success);
    assert.equal(doc.objects.filter(o => o.kind === 'character').length, 2);
    const table = doc.objects.find(o => o.id === 'obj_table');
    const mug = doc.objects.find(o => o.id === 'obj_mug');
    assert.ok(mug.transform.position[1] > 0.9, 'mug sits on the table');
    assert.ok(Math.abs(mug.transform.position[0] - table.transform.position[0]) < 0.5);
    assert.equal(doc.shots[0].time, '09:00');
    assert.equal(doc.lights.find(l => l.type === 'sun').date, '2026-10-15T09:00:00-07:00');
    const street = breakdownToStoryboard({ projectTitle: list.title, scene: list.scenes[1], breakdown: extractOffline(list.scenes[1]) });
    assert.ok(street.objects.some(o => o.label === 'Bicycle' && o.asset.kind === 'block'));
    assert.ok(street.objects.some(o => o.label === 'Lamp post'));
    assert.ok(!street.lights.some(l => l.type === 'fixture'), 'exterior scenes start with the sun only');
});

test('AI request uses structured outputs and a strict schema', () => {
    const req = buildExtractionRequest(list.scenes[0]);
    assert.equal(req.output_config.format.type, 'json_schema');
    assert.ok(req.messages[0].content.includes('18: Leo sets a ceramic mug'));
    // Claude structured outputs require additionalProperties:false on every object and no min/max keywords.
    const walk = (node) => {
        if (node && typeof node === 'object') {
            if (node.type === 'object')
                assert.equal(node.additionalProperties, false);
            for (const bad of ['minimum', 'maximum', 'minLength', 'maxLength'])
                assert.ok(!(bad in node), `unsupported keyword ${bad}`);
            Object.values(node).forEach(walk);
        }
    };
    walk(BREAKDOWN_JSON_SCHEMA);
});

test('AI response parsing validates the result', () => {
    const good = { content: [{ type: 'text', text: JSON.stringify(extractOffline(list.scenes[0])) }] };
    assert.equal(parseExtractionResponse(good).characters.length, 2);
    assert.throws(() => parseExtractionResponse({ content: [{ type: 'text', text: '{"characters":[]}' }] }));
});

test('AI server: adds the key server-side and returns the breakdown (mocked Claude)', async () => {
    let seen;
    const fakeFetch = async (url, init) => {
        seen = { url, headers: init.headers, body: JSON.parse(init.body) };
        return { ok: true, json: async () => ({ content: [{ type: 'text', text: JSON.stringify(extractOffline(list.scenes[0])) }] }) };
    };
    const server = createServer({ apiKey: 'test-key-not-real', fetchImpl: fakeFetch });
    await new Promise(r => server.listen(0, '127.0.0.1', r));
    const { port } = server.address();
    try {
        const res = await fetch(`http://127.0.0.1:${port}/api/extract`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ scene: list.scenes[0] }) });
        const data = await res.json();
        assert.equal(res.status, 200, JSON.stringify(data));
        assert.equal(data.breakdown.characters.length, 2);
        assert.equal(seen.url, 'https://api.anthropic.com/v1/messages');
        assert.equal(seen.headers['x-api-key'], 'test-key-not-real');
        assert.ok(!JSON.stringify(data).includes('test-key-not-real'), 'the key never goes back to the browser');
        const missing = await fetch(`http://127.0.0.1:${port}/api/extract`, { method: 'POST', body: '{}' });
        assert.equal(missing.status, 400);
    }
    finally {
        server.close();
    }
});

import { z } from 'zod';
import { CATALOG, matchCatalog } from '../editor/catalog.js';

/**
 * Script → per-scene breakdown (characters, props, actions), each tagged
 * "stated" (written in the script) or "inferred" (a guess), with line numbers.
 *
 * Two ways to get it:
 *  - extractOffline(scene): rules only, no network, always available. Finds
 *    speakers, CAPITALISED character introductions and catalog words.
 *  - the AI route: buildExtractionRequest(scene) makes a Claude Messages API
 *    body with structured outputs (output_config.format = json_schema). The
 *    browser never calls Claude directly; it POSTs the scene to our server
 *    (server/ai-server.mjs), which adds the API key from an environment variable.
 * Both return the same shape, checked by SceneBreakdownSchema.
 */
const Tag = z.enum(['stated', 'inferred']);
export const SceneBreakdownSchema = z.strictObject({
    characters: z.array(z.strictObject({ name: z.string().min(1), tag: Tag, line: z.number().int().positive().nullable(), description: z.string() })),
    props: z.array(z.strictObject({ name: z.string().min(1), catalog_id: z.string().nullable(), tag: Tag, line: z.number().int().positive().nullable(), placement_hint: z.string() })),
    actions: z.array(z.strictObject({ description: z.string().min(1), characters: z.array(z.string()), props: z.array(z.string()), tag: Tag, line: z.number().int().positive().nullable() })),
});

/** JSON Schema for Claude structured outputs: every object needs additionalProperties:false; no min/max keywords. */
export const BREAKDOWN_JSON_SCHEMA = {
    type: 'object',
    additionalProperties: false,
    required: ['characters', 'props', 'actions'],
    properties: {
        characters: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['name', 'tag', 'line', 'description'], properties: {
                    name: { type: 'string', description: 'Character name in capitals, as the script writes it' },
                    tag: { type: 'string', enum: ['stated', 'inferred'] },
                    line: { anyOf: [{ type: 'integer' }, { type: 'null' }], description: 'Script line number where this is stated; null if inferred' },
                    description: { type: 'string', description: 'Look and age only if the script says so; otherwise empty' },
                } } },
        props: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['name', 'catalog_id', 'tag', 'line', 'placement_hint'], properties: {
                    name: { type: 'string' },
                    catalog_id: { anyOf: [{ type: 'string', enum: CATALOG.map(c => c.id) }, { type: 'null' }], description: 'Closest catalog item, or null if none fits' },
                    tag: { type: 'string', enum: ['stated', 'inferred'] },
                    line: { anyOf: [{ type: 'integer' }, { type: 'null' }] },
                    placement_hint: { type: 'string', description: 'Short hint like "on the table", "by the window"; empty if unknown' },
                } } },
        actions: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['description', 'characters', 'props', 'tag', 'line'], properties: {
                    description: { type: 'string' },
                    characters: { type: 'array', items: { type: 'string' } },
                    props: { type: 'array', items: { type: 'string' } },
                    tag: { type: 'string', enum: ['stated', 'inferred'] },
                    line: { anyOf: [{ type: 'integer' }, { type: 'null' }] },
                } } },
    },
};

export const DEFAULT_MODEL = 'claude-sonnet-5-5';

/** Scene text with line numbers, so the model can cite lines. */
export function sceneToNumberedText(scene) {
    const rows = [`${scene.line}: ${scene.heading}`];
    for (const el of scene.elements) {
        if (el.type === 'character')
            rows.push(`${el.line}: ${el.text}`);
        else if (el.type === 'dialogue' || el.type === 'parenthetical')
            rows.push(`${el.line}:     ${el.text}`);
        else if (el.type === 'action' || el.type === 'transition')
            rows.push(`${el.line}: ${el.text}`);
    }
    return rows.join('\n');
}

export function buildExtractionRequest(scene, { model = DEFAULT_MODEL } = {}) {
    return {
        model,
        max_tokens: 2000,
        system: 'You break down screenplay scenes for a 3D storyboard tool. Only list what a set builder needs. ' +
            'Tag an item "stated" only if the script text says it, with that line number; tag it "inferred" (line null) if you are guessing from context ' +
            '(for example, a café usually has a counter). Keep inferred items few and obvious. Never invent character descriptions. ' +
            `Map props to the closest catalog_id from: ${CATALOG.map(c => `${c.id} (${c.label})`).join(', ')}; use null if nothing fits.`,
        messages: [{ role: 'user', content: `Break down this scene. Line numbers are at the start of each line.\n\n${sceneToNumberedText(scene)}` }],
        output_config: { format: { type: 'json_schema', schema: BREAKDOWN_JSON_SCHEMA } },
    };
}

/** Read the JSON text block from a Messages API response and validate it. */
export function parseExtractionResponse(response) {
    const block = response?.content?.find(b => b.type === 'text');
    if (!block)
        throw new Error('AI response had no text block');
    const data = JSON.parse(block.text);
    return SceneBreakdownSchema.parse(data);
}

const CAPS_NAME = /\b([A-Z][A-Z'\-]{1,}(?: [A-Z][A-Z'\-]+)?)\s*\((?:\d{1,2}s|[^)]*\d[^)]*)\)/g;
const titleCase = s => s.charAt(0) + s.slice(1).toLowerCase();

/** Rules-only breakdown; no network. Good enough to build a first grey-block layout. */
export function extractOffline(scene) {
    const characters = new Map();
    const props = new Map();
    const actions = [];
    const addChar = (name, line, description = '') => {
        if (!characters.has(name))
            characters.set(name, { name, tag: 'stated', line, description });
    };
    for (const el of scene.elements) {
        if (el.type === 'character')
            addChar(el.name, el.line);
        if (el.type !== 'action')
            continue;
        for (const m of el.text.matchAll(CAPS_NAME))
            addChar(m[1], el.line, m[0].replace(m[1], '').trim().replace(/^\(|\)$/g, ''));
        const hits = matchCatalog(el.text);
        for (const { item } of hits) {
            if (!props.has(item.id))
                props.set(item.id, { name: item.label, catalog_id: item.id, tag: 'stated', line: el.line, placement_hint: '' });
        }
        // Actions mention a character by name in any case.
        const mentioned = [...characters.keys()].filter(n => new RegExp(`\\b${n}\\b`, 'i').test(el.text));
        if (mentioned.length)
            actions.push({ description: el.text, characters: mentioned, props: hits.map(h => h.item.label), tag: 'stated', line: el.line });
    }
    // A few obvious inferences from the location, marked as such.
    // Only for interiors: an exterior "CAFE STREET" should not get a café counter.
    const loc = scene.int_ext === 'EXT' ? '' : scene.location.toLowerCase();
    const inferIf = (cond, id) => {
        const item = CATALOG.find(c => c.id === id);
        if (cond && item && !props.has(id))
            props.set(id, { name: item.label, catalog_id: id, tag: 'inferred', line: null, placement_hint: '' });
    };
    inferIf(/caf[eé]|coffee|diner|bar\b/.test(loc), 'counter');
    inferIf(/caf[eé]|diner|restaurant|kitchen/.test(loc), 'table');
    inferIf(/bedroom/.test(loc), 'bed');
    inferIf(/living room|apartment/.test(loc), 'sofa');
    return SceneBreakdownSchema.parse({
        characters: [...characters.values()].map(c => ({ ...c, name: c.name.toUpperCase() })),
        props: [...props.values()],
        actions,
    });
}

export { titleCase };

import { z } from 'zod';
import { Vec3Schema } from './layout.schema.js';

/**
 * Storyboard scene file — format "framecraft.storyboard", version 1.
 *
 * One file = one scene of the script, ready to edit in the 3D editor:
 *   objects  — props, characters and set pieces with real-world transforms
 *   lights   — Linda's light spec, field names kept exactly
 *   shots    — saved cameras with Yasin's storyboard fields (number, lens_mm,
 *              time, light_note, script_line); `png` is produced at export time
 *
 * Units: meters, right-handed, +Y up, -Z north. Rotations in degrees.
 * This sits next to the v1 project contracts (project.schema.js) and does not
 * change them: `fromLegacyProject()` converts a v1 project scene into this format.
 */

export const StoryboardIdSchema = z.string().regex(/^[a-z][a-z0-9]*(?:_[a-z0-9]+)+$/, 'Use lowercase words joined by underscores, e.g. obj_table_1');
const prefixed = (prefix) => StoryboardIdSchema.refine(id => id.startsWith(prefix), { message: `ID must start with ${prefix}` });

export const SourceSchema = z.strictObject({
    // stated = written in the script, inferred = guessed by AI or a rule, user = placed by hand
    tag: z.enum(['stated', 'inferred', 'user']),
    line: z.number().int().positive().optional(),
    note: z.string().optional(),
});

export const AssetRefSchema = z.discriminatedUnion('kind', [
    z.strictObject({ kind: z.literal('procedural'), generator: z.string().min(1) }),
    z.strictObject({ kind: z.literal('block'), size_m: z.tuple([z.number().positive(), z.number().positive(), z.number().positive()]), color: z.string().default('#9aa0a6') }),
    z.strictObject({ kind: z.literal('gltf'), uri: z.string().min(1), catalog_id: z.string().optional() }),
]);

export const StoryboardTransformSchema = z.strictObject({
    position: Vec3Schema,
    rotation_deg: Vec3Schema.default([0, 0, 0]),
    scale: z.tuple([z.number().positive(), z.number().positive(), z.number().positive()]).default([1, 1, 1]),
});

export const CharacterInfoSchema = z.strictObject({
    name: z.string().min(1),
    height_m: z.number().positive().max(2.6).default(1.75),
    pose: z.enum(['standing', 'seated']).default('standing'),
    palette: z.strictObject({ skin: z.string(), clothes: z.string(), accent: z.string() }).optional(),
});

export const StoryboardObjectSchema = z.strictObject({
    id: prefixed('obj_'),
    kind: z.enum(['prop', 'character', 'set']),
    label: z.string().min(1),
    asset: AssetRefSchema,
    transform: StoryboardTransformSchema,
    character: CharacterInfoSchema.optional(),
    // Set pieces (floor, walls) are locked so a stray click cannot move the room.
    locked: z.boolean().default(false),
    source: SourceSchema.default({ tag: 'user' }),
}).superRefine((o, ctx) => {
    if (o.kind === 'character' && !o.character)
        ctx.addIssue({ code: 'custom', path: ['character'], message: 'Character objects need character info (name, height_m)' });
});

/** Linda's light spec. Keep these field names exactly: they are saved and printed on the storyboard. */
const LightBase = {
    id: prefixed('light_'),
    intensity: z.number().nonnegative(),
    kelvin: z.number().min(1000).max(12000),
    softness: z.number().min(0).max(1),
};
export const LightSpecSchema = z.discriminatedUnion('type', [
    z.strictObject({ ...LightBase, type: z.literal('sun'), lat: z.number().min(-90).max(90), lon: z.number().min(-180).max(180), date: z.string().refine(s => !Number.isNaN(Date.parse(s)), 'date must be an ISO date-time') }),
    z.strictObject({ ...LightBase, type: z.literal('lamp'), position: Vec3Schema }),
    z.strictObject({ ...LightBase, type: z.literal('fixture'), position: Vec3Schema, target: Vec3Schema }),
    z.strictObject({ ...LightBase, type: z.literal('window'), position: Vec3Schema, target: Vec3Schema }),
]);

export const ASPECTS = Object.freeze({ '16:9': 16 / 9, '2.39:1': 2.39 });

/** Yasin's shot fields + the camera that frames it. */
export const StoryboardShotSchema = z.strictObject({
    id: prefixed('shot_'),
    number: z.number().int().positive(),
    lens_mm: z.number().min(8).max(300),
    aspect: z.enum(['16:9', '2.39:1']).default('16:9'),
    time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'time is HH:MM, 24-hour').default('12:00'),
    light_note: z.string().default(''),
    script_line: z.string().default(''),
    description: z.string().default(''),
    camera: z.strictObject({ position: Vec3Schema, target: Vec3Schema }),
});

export const SensorSchema = z.strictObject({
    id: z.string().min(1),
    width_mm: z.number().positive(),
    height_mm: z.number().positive(),
});

export const StoryboardSceneSchema = z.strictObject({
    format: z.literal('framecraft.storyboard'),
    version: z.literal(1),
    project: z.strictObject({ id: z.string().min(1), title: z.string().min(1) }),
    scene: z.strictObject({
        id: prefixed('scene_'),
        number: z.number().int().positive(),
        heading: z.string().min(1),
        location: z.string().min(1),
        int_ext: z.enum(['INT', 'EXT', 'INT/EXT']).nullable(),
        time_of_day: z.string().nullable(),
        source_line: z.number().int().positive().optional(),
    }),
    sensor: SensorSchema.default({ id: 'super35', width_mm: 24.89, height_mm: 18.66 }),
    objects: z.array(StoryboardObjectSchema),
    lights: z.array(LightSpecSchema),
    shots: z.array(StoryboardShotSchema),
}).superRefine((doc, ctx) => {
    for (const [key, list] of [['objects', doc.objects], ['lights', doc.lights], ['shots', doc.shots]]) {
        const seen = new Set();
        list.forEach((item, i) => {
            if (seen.has(item.id))
                ctx.addIssue({ code: 'custom', path: [key, i, 'id'], message: `Duplicate ID ${item.id}` });
            seen.add(item.id);
        });
    }
    const numbers = new Set();
    doc.shots.forEach((shot, i) => {
        if (numbers.has(shot.number))
            ctx.addIssue({ code: 'custom', path: ['shots', i, 'number'], message: `Duplicate shot number ${shot.number}` });
        numbers.add(shot.number);
    });
});

export function validateStoryboard(input) {
    const result = StoryboardSceneSchema.safeParse(input);
    return result.success
        ? { success: true, data: result.data, errors: [] }
        : { success: false, data: null, errors: result.error.issues.map(issue => ({ path: issue.path.join('.'), message: issue.message })) };
}

/** Parse a saved .storyboard.json string. Throws a readable error when the file is not valid. */
export function parseStoryboardJSON(text) {
    let raw;
    try {
        raw = JSON.parse(text);
    }
    catch (error) {
        throw new Error(`Not a JSON file: ${error.message}`);
    }
    const result = validateStoryboard(raw);
    if (!result.success)
        throw new Error(`Scene file is not valid: ${result.errors.slice(0, 5).map(e => `${e.path || '(root)'} ${e.message}`).join('; ')}`);
    return result.data;
}

export function serializeStoryboard(doc) {
    return JSON.stringify(doc, null, 2) + '\n';
}

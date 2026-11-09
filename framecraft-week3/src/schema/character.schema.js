import { z } from 'zod';
import { IdSchema } from './common.schema.js';
/** A renderable character specification, NOT the script's CharacterSchema. */
export const CharacterSpecSchema = z.strictObject({
    id: IdSchema,
    asset_id: IdSchema,
    height_m: z.number().finite().positive().max(4),
    display_name: z.string().trim().min(1),
    description: z.string().trim().default(''),
    palette: z.object({ skin: z.string(), clothes: z.string(), accent: z.string() }).optional(),
    rig: z.enum(['static', 'humanoid']).default('static'),
});
export const CharacterSpecsSchema = z.array(CharacterSpecSchema);

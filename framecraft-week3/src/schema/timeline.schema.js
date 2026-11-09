import { z } from 'zod';
import { IdSchema } from './common.schema.js';
export const ShotClipSchema = z.strictObject({
    id: IdSchema,
    shot_id: IdSchema,
    start_seconds: z.number().finite().nonnegative(),
    duration_seconds: z.number().finite().positive(),
});
export const TimelineEventSchema = z.strictObject({
    id: IdSchema,
    action_id: IdSchema,
    start_seconds: z.number().finite().nonnegative(),
    duration_seconds: z.number().finite().nonnegative(),
});
export const TimelineSchema = z.strictObject({
    id: IdSchema,
    fps: z.number().int().min(1).max(120).default(24),
    duration_seconds: z.number().finite().positive(),
    clips: z.array(ShotClipSchema).min(1),
    events: z.array(TimelineEventSchema),
});

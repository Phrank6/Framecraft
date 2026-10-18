import { z } from 'zod';
import { IdSchema } from './common.schema.js';
export const Vec3Schema = z.tuple([z.number().finite(), z.number().finite(), z.number().finite()]);
export const TransformSchema = z.strictObject({
    position: Vec3Schema,
    rotation_deg: Vec3Schema.default([0, 0, 0]),
    scale: z.tuple([z.number().positive(), z.number().positive(), z.number().positive()]).default([1, 1, 1]),
});
export const SceneInstanceSchema = z.strictObject({
    id: IdSchema,
    entity_type: z.enum(['character', 'prop', 'environment']),
    entity_id: IdSchema.optional(),
    asset_id: IdSchema,
    transform: TransformSchema,
    visible: z.boolean().default(true),
});
export const CameraPoseSchema = z.strictObject({
    id: IdSchema,
    shot_id: IdSchema,
    position: Vec3Schema,
    target: Vec3Schema,
    fov_deg: z.number().min(10).max(110).default(40),
});
export const SceneLayoutSchema = z.strictObject({
    id: IdSchema,
    scene_id: IdSchema,
    units: z.literal('meters'),
    coordinate_system: z.literal('right-handed-y-up'),
    instances: z.array(SceneInstanceSchema).min(1),
    camera_poses: z.array(CameraPoseSchema).min(1),
});
export const SceneLayoutsSchema = z.array(SceneLayoutSchema).min(1);

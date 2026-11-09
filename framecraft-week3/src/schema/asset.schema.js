import { z } from 'zod';
import { IdSchema } from './common.schema.js';
const ProceduralSourceSchema = z.strictObject({
    kind: z.literal('procedural'),
    generator: z.enum(['avatar', 'cafe-table', 'cafe-chair', 'ceramic-mug', 'counter', 'plant', 'floor', 'architecture', 'pendant', 'stool', 'pastry-display', 'wall-art', 'shelf', 'cup-saucer']),
});
const GLTFSourceSchema = z.strictObject({
    kind: z.literal('gltf'),
    uri: z.string().min(1),
});
const PrimitiveSourceSchema = z.strictObject({
    kind: z.literal('primitive'),
    shape: z.enum(['box', 'sphere', 'cylinder', 'plane']),
});
export const AssetSpecSchema = z.strictObject({
    id: IdSchema,
    label: z.string().trim().min(1),
    category: z.enum(['character', 'prop', 'environment', 'architecture', 'light-fixture']),
    source: z.discriminatedUnion('kind', [ProceduralSourceSchema, GLTFSourceSchema, PrimitiveSourceSchema]),
    material: z.object({ color: z.string().min(1), roughness: z.number().min(0).max(1).default(0.6), metalness: z.number().min(0).max(1).default(0) }).optional(),
    dimensions_m: z.tuple([z.number().positive(), z.number().positive(), z.number().positive()]).optional(),
});
export const AssetManifestSchema = z.strictObject({
    id: IdSchema,
    assets: z.array(AssetSpecSchema).min(1),
});

import { z } from "zod";
import { IdSchema, EvidenceSchema } from "./common.schema.js";

export const ShotSchema = EvidenceSchema.extend({
  id: IdSchema,

  scene_id: IdSchema,

  character_ids: z.array(IdSchema),
  prop_ids: z.array(IdSchema),

  description: z.string().min(1),

  focal_length_mm: z.number().positive(),
  duration_seconds: z.number().positive()
});
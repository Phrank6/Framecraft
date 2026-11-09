import { z } from "zod";
import { IdSchema, EvidenceSchema } from "./common.schema.js";


export const CharacterSchema = EvidenceSchema.extend({
  id: IdSchema,
  name: z.string().min(1)
});

export const PropSchema = EvidenceSchema.extend({
  id: IdSchema,
  name: z.string().min(1)
});

export const SceneSchema = EvidenceSchema.extend({
  id: IdSchema,

  location: z.string().min(1),

  interior_exterior: z.enum(["INT", "EXT"]).nullable(),

  time_of_day: z.string().min(1).nullable(),

  character_ids: z.array(IdSchema),

  prop_ids: z.array(IdSchema)
});

export const ActionSchema = EvidenceSchema.extend({
  id: IdSchema,

  scene_id: IdSchema,

  character_ids: z.array(IdSchema),

  prop_ids: z.array(IdSchema),

  description: z.string().min(1)
});

export const EmotionSchema = EvidenceSchema.extend({
  id: IdSchema,

  scene_id: IdSchema,

  character_id: IdSchema,

  emotion: z.string().min(1),

  reason: z.string().min(1)
});

export const StoryBeatSchema = EvidenceSchema.extend({
  beat_id: IdSchema,

  scene_id: IdSchema,

  description: z.string().min(1)
});

export const BibleSchema = z.object({
  script_id: IdSchema,

  format: z.enum([
    "Fountain",
    "PDF",
    "FinalDraft",
    "PlainText",
    "Prose"
  ]),

  total_lines: z.number().int().positive(),

  scenes: z.array(SceneSchema).min(1),

  characters: z.array(CharacterSchema),

  props: z.array(PropSchema),

  actions: z.array(ActionSchema),

  emotions: z.array(EmotionSchema),

  story_beats: z.array(StoryBeatSchema)
});
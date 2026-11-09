import { z } from "zod";

export const IdSchema = z.string().min(1);

export const TagSchema = z.enum(["STATED", "INFERRED"]);

export const EvidenceSchema = z.object({
  line_number: z.number().int().positive(),
  tag: TagSchema
});
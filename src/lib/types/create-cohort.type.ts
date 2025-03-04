import { z } from "zod";

export const createCohortSchema = z.object({
  name: z.string().min(1, "Name is required"),
  slug: z.string().min(1, "Slug is required"),
  description: z.string().optional(),
  type: z.string().min(1, "Type is required"),
  alternateName: z.string().optional(),
  typeCode: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

export type CreateCohort = z.infer<typeof createCohortSchema>;

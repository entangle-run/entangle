import { z } from "zod";
import { filesystemPathSchema, identifierSchema } from "../common/primitives.js";

const packageSourceBaseSchema = z.object({
  packageSourceId: identifierSchema,
  admittedAt: z.string().optional()
});

export const packageSourceRecordSchema = z.discriminatedUnion("sourceKind", [
  packageSourceBaseSchema.extend({
    sourceKind: z.literal("local_path"),
    absolutePath: filesystemPathSchema
  }),
  packageSourceBaseSchema.extend({
    sourceKind: z.literal("local_archive"),
    archivePath: filesystemPathSchema
  })
]);

export type PackageSourceRecord = z.infer<typeof packageSourceRecordSchema>;

import { z } from "zod";
import {
  filesystemPathSchema,
  identifierSchema,
  nonEmptyStringSchema
} from "../common/primitives.js";

const sha256DigestSchema = nonEmptyStringSchema.regex(/^sha256:[0-9a-f]{64}$/u);

export const packageSourceMaterializationSchema = z.object({
  contentDigest: sha256DigestSchema,
  materializationKind: z.literal("immutable_store"),
  packageRoot: filesystemPathSchema,
  synchronizedAt: z.string()
});

const packageSourceBaseSchema = z.object({
  materialization: packageSourceMaterializationSchema.optional(),
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

export type PackageSourceMaterialization = z.infer<
  typeof packageSourceMaterializationSchema
>;
export type PackageSourceRecord = z.infer<typeof packageSourceRecordSchema>;

import { z } from "zod";
import {
  filesystemPathSchema,
  identifierSchema,
  nonEmptyStringSchema
} from "../common/primitives.js";

export const artifactBackendSchema = z.enum(["git", "wiki", "local_file"]);

export const artifactKindSchema = z.enum([
  "branch",
  "commit",
  "patch",
  "report_file",
  "wiki_page",
  "knowledge_summary",
  "local_output"
]);

export const artifactLifecycleStateSchema = z.enum([
  "declared",
  "materialized",
  "published",
  "superseded",
  "rejected",
  "failed"
]);

const artifactRefBaseSchema = z.object({
  artifactId: identifierSchema,
  artifactKind: artifactKindSchema.optional(),
  contentSummary: nonEmptyStringSchema.optional(),
  conversationId: identifierSchema.optional(),
  createdByNodeId: identifierSchema.optional(),
  preferred: z.boolean().default(true),
  sessionId: identifierSchema.optional(),
  status: artifactLifecycleStateSchema.optional()
});

export const gitArtifactLocatorSchema = z.object({
  branch: nonEmptyStringSchema,
  commit: nonEmptyStringSchema,
  gitServiceRef: identifierSchema.optional(),
  namespace: identifierSchema.optional(),
  path: nonEmptyStringSchema
});

export const wikiArtifactLocatorSchema = z.object({
  nodeId: identifierSchema,
  path: filesystemPathSchema
});

export const localFileArtifactLocatorSchema = z.object({
  path: filesystemPathSchema
});

export const artifactRefSchema = z.discriminatedUnion("backend", [
  artifactRefBaseSchema.extend({
    backend: z.literal("git"),
    locator: gitArtifactLocatorSchema
  }),
  artifactRefBaseSchema.extend({
    backend: z.literal("wiki"),
    locator: wikiArtifactLocatorSchema
  }),
  artifactRefBaseSchema.extend({
    backend: z.literal("local_file"),
    locator: localFileArtifactLocatorSchema
  })
]);

export const artifactMaterializationSchema = z
  .object({
    localPath: filesystemPathSchema.optional(),
    repoPath: filesystemPathSchema.optional()
  })
  .refine(
    (value) => value.localPath !== undefined || value.repoPath !== undefined,
    {
      message:
        "Artifact materialization metadata must include at least one local path."
    }
  );

export const artifactRecordSchema = z.object({
  createdAt: nonEmptyStringSchema,
  materialization: artifactMaterializationSchema.optional(),
  ref: artifactRefSchema,
  turnId: identifierSchema.optional(),
  updatedAt: nonEmptyStringSchema
});

export type ArtifactBackend = z.infer<typeof artifactBackendSchema>;
export type ArtifactKind = z.infer<typeof artifactKindSchema>;
export type ArtifactLifecycleState = z.infer<typeof artifactLifecycleStateSchema>;
export type GitArtifactLocator = z.infer<typeof gitArtifactLocatorSchema>;
export type WikiArtifactLocator = z.infer<typeof wikiArtifactLocatorSchema>;
export type LocalFileArtifactLocator = z.infer<typeof localFileArtifactLocatorSchema>;
export type ArtifactMaterialization = z.infer<typeof artifactMaterializationSchema>;
export type ArtifactRef = z.infer<typeof artifactRefSchema>;
export type ArtifactRecord = z.infer<typeof artifactRecordSchema>;

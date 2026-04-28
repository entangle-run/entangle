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

export const artifactContentPreviewSchema = z.discriminatedUnion("available", [
  z.object({
    available: z.literal(true),
    bytesRead: z.number().int().nonnegative(),
    content: z.string(),
    contentEncoding: z.literal("utf8"),
    contentType: z.enum(["text/markdown", "text/plain"]),
    truncated: z.boolean()
  }),
  z.object({
    available: z.literal(false),
    reason: nonEmptyStringSchema
  })
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
  repositoryName: identifierSchema.optional(),
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
        "Artifact materialization metadata must include at least one materialized path."
    }
  );

export const artifactPublicationStateSchema = z.enum([
  "not_requested",
  "published",
  "failed"
]);

export const artifactPublicationSchema = z
  .object({
    state: artifactPublicationStateSchema,
    lastAttemptAt: nonEmptyStringSchema.optional(),
    lastError: nonEmptyStringSchema.optional(),
    publishedAt: nonEmptyStringSchema.optional(),
    remoteName: identifierSchema.optional(),
    remoteUrl: nonEmptyStringSchema.optional()
  })
  .superRefine((value, context) => {
    if (value.state === "published") {
      if (!value.publishedAt) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Published artifact publication metadata must include publishedAt.",
          path: ["publishedAt"]
        });
      }

      if (!value.remoteName) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Published artifact publication metadata must include remoteName.",
          path: ["remoteName"]
        });
      }

      if (!value.remoteUrl) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Published artifact publication metadata must include remoteUrl.",
          path: ["remoteUrl"]
        });
      }
    }

    if (value.state === "failed") {
      if (!value.lastAttemptAt) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "Failed artifact publication metadata must include lastAttemptAt.",
          path: ["lastAttemptAt"]
        });
      }

      if (!value.lastError) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Failed artifact publication metadata must include lastError.",
          path: ["lastError"]
        });
      }
    }

    if (value.state !== "published" && value.publishedAt) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Only published artifact metadata may include publishedAt.",
        path: ["publishedAt"]
      });
    }

    if (value.state !== "failed" && value.lastError) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Only failed artifact metadata may include lastError.",
        path: ["lastError"]
      });
    }
  });

export const artifactRetrievalStateSchema = z.enum(["retrieved", "failed"]);

export const artifactRetrievalSchema = z
  .object({
    state: artifactRetrievalStateSchema,
    retrievedAt: nonEmptyStringSchema.optional(),
    lastAttemptAt: nonEmptyStringSchema.optional(),
    lastError: nonEmptyStringSchema.optional(),
    remoteName: identifierSchema.optional(),
    remoteUrl: nonEmptyStringSchema.optional()
  })
  .superRefine((value, context) => {
    if (value.state === "retrieved") {
      if (!value.retrievedAt) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Retrieved artifact metadata must include retrievedAt.",
          path: ["retrievedAt"]
        });
      }
    }

    if (value.state === "failed") {
      if (!value.lastAttemptAt) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Failed artifact retrieval metadata must include lastAttemptAt.",
          path: ["lastAttemptAt"]
        });
      }

      if (!value.lastError) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Failed artifact retrieval metadata must include lastError.",
          path: ["lastError"]
        });
      }
    }

    if (value.state !== "retrieved" && value.retrievedAt) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Only retrieved artifact metadata may include retrievedAt.",
        path: ["retrievedAt"]
      });
    }

    if (value.state !== "failed" && value.lastError) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Only failed artifact retrieval metadata may include lastError.",
        path: ["lastError"]
      });
    }
  });

export const artifactRecordSchema = z.object({
  createdAt: nonEmptyStringSchema,
  materialization: artifactMaterializationSchema.optional(),
  publication: artifactPublicationSchema.optional(),
  retrieval: artifactRetrievalSchema.optional(),
  ref: artifactRefSchema,
  turnId: identifierSchema.optional(),
  updatedAt: nonEmptyStringSchema
});

export type ArtifactBackend = z.infer<typeof artifactBackendSchema>;
export type ArtifactKind = z.infer<typeof artifactKindSchema>;
export type ArtifactLifecycleState = z.infer<typeof artifactLifecycleStateSchema>;
export type ArtifactContentPreview = z.infer<
  typeof artifactContentPreviewSchema
>;
export type GitArtifactLocator = z.infer<typeof gitArtifactLocatorSchema>;
export type WikiArtifactLocator = z.infer<typeof wikiArtifactLocatorSchema>;
export type LocalFileArtifactLocator = z.infer<typeof localFileArtifactLocatorSchema>;
export type ArtifactMaterialization = z.infer<typeof artifactMaterializationSchema>;
export type ArtifactPublicationState = z.infer<typeof artifactPublicationStateSchema>;
export type ArtifactPublication = z.infer<typeof artifactPublicationSchema>;
export type ArtifactRetrievalState = z.infer<typeof artifactRetrievalStateSchema>;
export type ArtifactRetrieval = z.infer<typeof artifactRetrievalSchema>;
export type ArtifactRef = z.infer<typeof artifactRefSchema>;
export type ArtifactRecord = z.infer<typeof artifactRecordSchema>;

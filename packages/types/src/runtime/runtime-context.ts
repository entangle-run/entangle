import { z } from "zod";
import { gitServiceProfileSchema, modelEndpointProfileSchema, relayProfileSchema } from "../resources/catalog.js";
import { externalPrincipalRecordSchema } from "../resources/external-principal.js";
import { edgeRelationSchema, runtimeProfileSchema } from "../common/topology.js";
import { filesystemPathSchema, identifierSchema, nonEmptyStringSchema } from "../common/primitives.js";
import { gitRepositoryTargetSchema } from "../artifacts/git-repository-target.js";
import { agentPackageManifestSchema } from "../package/package-manifest.js";
import { nodeAutonomyProfileSchema, nodeBindingSchema, nodeResourceBindingsSchema } from "../graph/graph-spec.js";
import { packageSourceRecordSchema } from "../package/package-source.js";
import { runtimeIdentityContextSchema } from "./runtime-identity.js";
import { resolvedSecretBindingSchema } from "./secret-delivery.js";

export const effectiveEdgeRouteSchema = z.object({
  channel: identifierSchema,
  edgeId: identifierSchema,
  peerNodeId: identifierSchema,
  relation: edgeRelationSchema,
  relayProfileRefs: z.array(identifierSchema).default([])
});

export const workspaceLayoutSchema = z.object({
  artifactWorkspaceRoot: filesystemPathSchema,
  injectedRoot: filesystemPathSchema,
  memoryRoot: filesystemPathSchema,
  packageRoot: filesystemPathSchema,
  root: filesystemPathSchema,
  runtimeRoot: filesystemPathSchema
});

export const effectiveNodeBindingSchema = z.object({
  bindingId: identifierSchema,
  externalPrincipals: z.array(externalPrincipalRecordSchema).default([]),
  graphId: identifierSchema,
  graphRevisionId: identifierSchema,
  node: nodeBindingSchema,
  packageSource: packageSourceRecordSchema.optional(),
  resolvedResourceBindings: nodeResourceBindingsSchema,
  runtimeProfile: runtimeProfileSchema,
  schemaVersion: z.literal("1")
});

export const relayRuntimeContextSchema = z.object({
  edgeRoutes: z.array(effectiveEdgeRouteSchema).default([]),
  primaryRelayProfileRef: identifierSchema.optional(),
  relayProfiles: z.array(relayProfileSchema).default([])
});

export const artifactRuntimeContextSchema = z.object({
  backends: z.array(z.enum(["git"])).default(["git"]),
  defaultNamespace: identifierSchema.optional(),
  gitPrincipalBindings: z
    .array(
      z.object({
        principal: externalPrincipalRecordSchema,
        signing: resolvedSecretBindingSchema.optional(),
        transport: resolvedSecretBindingSchema
      })
    )
    .default([]),
  gitServices: z.array(gitServiceProfileSchema).default([]),
  primaryGitPrincipalRef: identifierSchema.optional(),
  primaryGitRepositoryTarget: gitRepositoryTargetSchema.optional(),
  primaryGitServiceRef: identifierSchema.optional()
});

export const modelRuntimeContextSchema = z.object({
  modelEndpointProfile: modelEndpointProfileSchema.optional()
});

export const policyRuntimeContextSchema = z.object({
  autonomy: nodeAutonomyProfileSchema,
  notes: z.array(nonEmptyStringSchema).default([]),
  runtimeProfile: runtimeProfileSchema
});

export const effectiveRuntimeContextSchema = z.object({
  artifactContext: artifactRuntimeContextSchema,
  binding: effectiveNodeBindingSchema,
  generatedAt: nonEmptyStringSchema,
  identityContext: runtimeIdentityContextSchema,
  modelContext: modelRuntimeContextSchema,
  packageManifest: agentPackageManifestSchema.optional(),
  policyContext: policyRuntimeContextSchema,
  relayContext: relayRuntimeContextSchema,
  schemaVersion: z.literal("1"),
  workspace: workspaceLayoutSchema
});

export type EffectiveEdgeRoute = z.infer<typeof effectiveEdgeRouteSchema>;
export type WorkspaceLayout = z.infer<typeof workspaceLayoutSchema>;
export type EffectiveNodeBinding = z.infer<typeof effectiveNodeBindingSchema>;
export type RelayRuntimeContext = z.infer<typeof relayRuntimeContextSchema>;
export type ArtifactRuntimeContext = z.infer<typeof artifactRuntimeContextSchema>;
export type ModelRuntimeContext = z.infer<typeof modelRuntimeContextSchema>;
export type PolicyRuntimeContext = z.infer<typeof policyRuntimeContextSchema>;
export type EffectiveRuntimeContext = z.infer<typeof effectiveRuntimeContextSchema>;

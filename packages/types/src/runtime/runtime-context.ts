import { z } from "zod";
import {
  agentEngineProfileSchema,
  gitServiceProfileSchema,
  modelEndpointProfileSchema,
  relayProfileSchema
} from "../resources/catalog.js";
import { externalPrincipalRecordSchema } from "../resources/external-principal.js";
import { edgeRelationSchema, runtimeProfileSchema } from "../common/topology.js";
import { nostrPublicKeySchema } from "../common/crypto.js";
import { filesystemPathSchema, identifierSchema, nonEmptyStringSchema } from "../common/primitives.js";
import { gitRepositoryTargetSchema } from "../artifacts/git-repository-target.js";
import { agentPackageManifestSchema } from "../package/package-manifest.js";
import {
  nodeAgentRuntimeModeSchema,
  nodeAutonomyProfileSchema,
  nodeBindingSchema,
  nodeResourceBindingsSchema,
  defaultNodeSourceMutationPolicy,
  nodeSourceMutationPolicySchema
} from "../graph/graph-spec.js";
import { packageSourceRecordSchema } from "../package/package-source.js";
import { runtimeIdentityContextSchema } from "./runtime-identity.js";
import { resolvedSecretBindingSchema } from "./secret-delivery.js";

export const effectiveEdgeRouteSchema = z.object({
  channel: identifierSchema,
  edgeId: identifierSchema,
  peerNodeId: identifierSchema,
  peerPubkey: nostrPublicKeySchema.optional(),
  relation: edgeRelationSchema,
  relayProfileRefs: z.array(identifierSchema).default([])
});

export const workspaceLayoutSchema = z.object({
  artifactWorkspaceRoot: filesystemPathSchema,
  engineStateRoot: filesystemPathSchema.optional(),
  injectedRoot: filesystemPathSchema,
  memoryRoot: filesystemPathSchema,
  packageRoot: filesystemPathSchema,
  retrievalRoot: filesystemPathSchema,
  root: filesystemPathSchema,
  runtimeRoot: filesystemPathSchema,
  sourceWorkspaceRoot: filesystemPathSchema.optional(),
  wikiRepositoryRoot: filesystemPathSchema.optional()
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

export const modelRuntimeContextSchema = z
  .object({
    auth: resolvedSecretBindingSchema.optional(),
    modelEndpointProfile: modelEndpointProfileSchema.optional()
  })
  .superRefine((value, context) => {
    if (value.modelEndpointProfile && !value.auth) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Model runtime context must include a resolved auth binding when a model endpoint profile is present.",
        path: ["auth"]
      });
    }

    if (!value.modelEndpointProfile && value.auth) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Model runtime auth binding cannot exist without a model endpoint profile.",
        path: ["modelEndpointProfile"]
      });
    }

    if (
      value.modelEndpointProfile &&
      value.auth &&
      value.modelEndpointProfile.secretRef !== value.auth.secretRef
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Model runtime auth binding must reference the same secret as the model endpoint profile.",
        path: ["auth", "secretRef"]
      });
    }
  });

export const agentRuntimeContextSchema = z.object({
  mode: nodeAgentRuntimeModeSchema.default("coding_agent"),
  defaultAgent: identifierSchema.optional(),
  engineProfile: agentEngineProfileSchema,
  engineProfileRef: identifierSchema
}).superRefine((value, context) => {
  if (value.engineProfile.id !== value.engineProfileRef) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message:
        "Agent runtime context engineProfileRef must match the resolved engine profile id.",
      path: ["engineProfileRef"]
    });
  }
});

export const policyRuntimeContextSchema = z.object({
  autonomy: nodeAutonomyProfileSchema,
  notes: z.array(nonEmptyStringSchema).default([]),
  runtimeProfile: runtimeProfileSchema,
  sourceMutation: nodeSourceMutationPolicySchema.default(
    defaultNodeSourceMutationPolicy
  )
});

export const effectiveRuntimeContextSchema = z.object({
  agentRuntimeContext: agentRuntimeContextSchema,
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
export type AgentRuntimeContext = z.infer<typeof agentRuntimeContextSchema>;
export type PolicyRuntimeContext = z.infer<typeof policyRuntimeContextSchema>;
export type EffectiveRuntimeContext = z.infer<typeof effectiveRuntimeContextSchema>;

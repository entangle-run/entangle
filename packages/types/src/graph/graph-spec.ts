import { z } from "zod";
import { identifierSchema, nonEmptyStringSchema } from "../common/primitives.js";
import {
  edgeRelationSchema,
  nodeKindSchema,
  runtimeProfileSchema
} from "../common/topology.js";

export const nodeResourceBindingsSchema = z.object({
  relayProfileRefs: z.array(identifierSchema).default([]),
  primaryRelayProfileRef: identifierSchema.optional(),
  gitServiceRefs: z.array(identifierSchema).default([]),
  primaryGitServiceRef: identifierSchema.optional(),
  modelEndpointProfileRef: identifierSchema.optional(),
  externalPrincipalRefs: z.array(identifierSchema).default([])
});

export const nodeAutonomyProfileSchema = z.object({
  canInitiateSessions: z.boolean().default(false),
  canMutateGraph: z.boolean().default(false)
});

export const nodeAgentRuntimeModeSchema = z.enum([
  "disabled",
  "coding_agent"
]);

export const nodeAgentRuntimeSchema = z.object({
  mode: nodeAgentRuntimeModeSchema.optional(),
  engineProfileRef: identifierSchema.optional(),
  defaultAgent: identifierSchema.optional()
});

export const defaultNodeAgentRuntime = {};
export const defaultGraphAgentRuntime = {
  mode: "coding_agent" as const
};

export const nodeBindingSchema = z.object({
  nodeId: identifierSchema,
  displayName: nonEmptyStringSchema,
  nodeKind: nodeKindSchema,
  packageSourceRef: identifierSchema.optional(),
  resourceBindings: nodeResourceBindingsSchema.default({
    relayProfileRefs: [],
    gitServiceRefs: [],
    externalPrincipalRefs: []
  }),
  autonomy: nodeAutonomyProfileSchema.default({
    canInitiateSessions: false,
    canMutateGraph: false
  }),
  agentRuntime: nodeAgentRuntimeSchema.default(defaultNodeAgentRuntime)
});

export const edgeTransportPolicySchema = z.object({
  mode: z.literal("bidirectional_shared_set"),
  relayProfileRefs: z.array(identifierSchema).default([]),
  channel: identifierSchema.default("default")
});

export const edgeSchema = z.object({
  edgeId: identifierSchema,
  fromNodeId: identifierSchema,
  toNodeId: identifierSchema,
  relation: edgeRelationSchema,
  enabled: z.boolean().default(true),
  transportPolicy: edgeTransportPolicySchema.default({
    mode: "bidirectional_shared_set",
    relayProfileRefs: [],
    channel: "default"
  })
});

export const graphDefaultsSchema = z.object({
  resourceBindings: nodeResourceBindingsSchema.default({
    relayProfileRefs: [],
    gitServiceRefs: [],
    externalPrincipalRefs: []
  }),
  runtimeProfile: runtimeProfileSchema.default("local"),
  agentRuntime: nodeAgentRuntimeSchema.default(defaultGraphAgentRuntime)
});

export const graphSpecSchema = z.object({
  schemaVersion: z.literal("1"),
  graphId: identifierSchema,
  name: nonEmptyStringSchema,
  nodes: z.array(nodeBindingSchema).min(1),
  edges: z.array(edgeSchema).default([]),
  defaults: graphDefaultsSchema.default({
    resourceBindings: {
      relayProfileRefs: [],
      gitServiceRefs: [],
      externalPrincipalRefs: []
    },
    runtimeProfile: "local",
    agentRuntime: defaultGraphAgentRuntime
  })
});

export type NodeResourceBindings = z.infer<typeof nodeResourceBindingsSchema>;
export type NodeAgentRuntimeMode = z.infer<typeof nodeAgentRuntimeModeSchema>;
export type NodeAgentRuntime = z.infer<typeof nodeAgentRuntimeSchema>;
export type NodeBinding = z.infer<typeof nodeBindingSchema>;
export type EdgeTransportPolicy = z.infer<typeof edgeTransportPolicySchema>;
export type Edge = z.infer<typeof edgeSchema>;
export type GraphSpec = z.infer<typeof graphSpecSchema>;

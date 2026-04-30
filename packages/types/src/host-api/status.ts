import { z } from "zod";
import { identifierSchema, nonEmptyStringSchema } from "../common/primitives.js";
import { operatorRoleSchema } from "../federation/authority.js";
import { hostAuthoritySummarySchema } from "./authority.js";
import { runtimeReconciliationFindingCodeSchema } from "../runtime/reconciliation.js";
import { runtimeBackendKindSchema } from "../runtime/runtime-state.js";

export const currentStateLayoutVersion = 1;
export const minimumSupportedStateLayoutVersion = 1;

export const stateLayoutProductSchema = z.literal("entangle");

export const stateLayoutRecordSchema = z.object({
  createdAt: nonEmptyStringSchema,
  layoutVersion: z.number().int().nonnegative(),
  product: stateLayoutProductSchema,
  schemaVersion: z.literal("1"),
  updatedAt: nonEmptyStringSchema
});

export const stateLayoutInspectionStatusSchema = z.enum([
  "current",
  "missing",
  "upgrade_available",
  "unsupported_legacy",
  "unsupported_future",
  "unreadable"
]);

export const stateLayoutInspectionSchema = z.object({
  checkedAt: nonEmptyStringSchema,
  currentLayoutVersion: z.number().int().nonnegative(),
  detail: nonEmptyStringSchema.optional(),
  minimumSupportedLayoutVersion: z.number().int().nonnegative(),
  recordedAt: nonEmptyStringSchema.optional(),
  recordedLayoutVersion: z.number().int().nonnegative().optional(),
  status: stateLayoutInspectionStatusSchema
});

export const hostTransportPlaneStatusSchema = z.enum([
  "disabled",
  "not_started",
  "subscribed",
  "degraded",
  "stopped"
]);

export const hostTransportRelayStatusSchema = z.enum([
  "configured",
  "degraded",
  "disabled",
  "stopped",
  "subscribed"
]);

export const hostTransportRelayHealthSchema = z.object({
  lastFailureAt: nonEmptyStringSchema.optional(),
  lastFailureMessage: nonEmptyStringSchema.optional(),
  relayUrl: nonEmptyStringSchema,
  status: hostTransportRelayStatusSchema,
  subscribedAt: nonEmptyStringSchema.optional(),
  updatedAt: nonEmptyStringSchema
});

export const hostTransportPlaneHealthSchema = z.object({
  configuredRelayCount: z.number().int().nonnegative(),
  lastFailureAt: nonEmptyStringSchema.optional(),
  lastFailureMessage: nonEmptyStringSchema.optional(),
  relayUrls: z.array(nonEmptyStringSchema),
  relays: z.array(hostTransportRelayHealthSchema).default([]),
  status: hostTransportPlaneStatusSchema,
  subscribedAt: nonEmptyStringSchema.optional(),
  updatedAt: nonEmptyStringSchema
});

export const hostTransportHealthSchema = z.object({
  controlObserve: hostTransportPlaneHealthSchema
});

export const hostArtifactBackendCacheStatusSchema = z.object({
  available: z.boolean(),
  reason: nonEmptyStringSchema.optional(),
  repositoryCount: z.number().int().nonnegative(),
  totalSizeBytes: z.number().int().nonnegative(),
  updatedAt: nonEmptyStringSchema
});

export const hostArtifactBackendCacheSelectorSchema = z
  .object({
    gitServiceRef: identifierSchema.optional(),
    namespace: identifierSchema.optional(),
    repositoryName: identifierSchema.optional()
  })
  .superRefine((value, context) => {
    if ((value.namespace || value.repositoryName) && !value.gitServiceRef) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Artifact backend cache namespace/repository selectors require gitServiceRef.",
        path: ["gitServiceRef"]
      });
    }

    if (value.repositoryName && !value.namespace) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Artifact backend cache repository selectors require namespace.",
        path: ["namespace"]
      });
    }
  });

export const hostArtifactBackendCacheClearRequestSchema =
  hostArtifactBackendCacheSelectorSchema.extend({
    dryRun: z.boolean().optional(),
    maxSizeBytes: z.number().int().positive().optional(),
    olderThanSeconds: z.number().int().positive().optional()
  });

export const hostArtifactBackendCacheClearResponseSchema = z.object({
  completedAt: nonEmptyStringSchema,
  dryRun: z.boolean(),
  gitServiceRef: identifierSchema.optional(),
  matchedRepositoryCount: z.number().int().nonnegative().optional(),
  maxSizeBytes: z.number().int().positive().optional(),
  namespace: identifierSchema.optional(),
  olderThanSeconds: z.number().int().positive().optional(),
  repositoryName: identifierSchema.optional(),
  repositoryCount: z.number().int().nonnegative(),
  retainedRepositoryCount: z.number().int().nonnegative().optional(),
  retainedSizeBytes: z.number().int().nonnegative().optional(),
  status: z.enum(["cleared", "dry_run"]),
  totalSizeBytes: z.number().int().nonnegative()
});

export const hostOperatorSecurityStatusSchema = z.discriminatedUnion(
  "operatorAuthMode",
  [
    z.object({
      operatorAuthMode: z.literal("none")
    }),
    z.object({
      operatorAuthMode: z.literal("bootstrap_operator_token"),
      operatorId: identifierSchema,
      operatorRole: operatorRoleSchema
    }),
    z.object({
      operatorAuthMode: z.literal("bootstrap_operator_tokens"),
      operatorCount: z.number().int().positive(),
      operators: z
        .array(
          z.object({
            operatorId: identifierSchema,
            operatorRole: operatorRoleSchema
          })
        )
        .min(2)
    })
  ]
);

export const hostStatusResponseSchema = z.object({
  artifactBackendCache: hostArtifactBackendCacheStatusSchema.optional(),
  authority: hostAuthoritySummarySchema.optional(),
  service: z.literal("entangle-host"),
  security: hostOperatorSecurityStatusSchema,
  status: z.enum(["starting", "healthy", "degraded"]),
  graphRevisionId: identifierSchema.optional(),
  reconciliation: z.object({
    backendKind: runtimeBackendKindSchema,
    blockedRuntimeCount: z.number().int().nonnegative(),
    degradedRuntimeCount: z.number().int().nonnegative(),
    failedRuntimeCount: z.number().int().nonnegative(),
    findingCodes: z.array(runtimeReconciliationFindingCodeSchema),
    issueCount: z.number().int().nonnegative(),
    lastReconciledAt: nonEmptyStringSchema.optional(),
    managedRuntimeCount: z.number().int().nonnegative(),
    runningRuntimeCount: z.number().int().nonnegative(),
    stoppedRuntimeCount: z.number().int().nonnegative(),
    transitioningRuntimeCount: z.number().int().nonnegative()
  }),
  runtimeCounts: z.object({
    desired: z.number().int().nonnegative(),
    observed: z.number().int().nonnegative(),
    running: z.number().int().nonnegative()
  }),
  sessionDiagnostics: z
    .object({
      consistencyFindingCount: z.number().int().nonnegative(),
      inspectedSessionCount: z.number().int().nonnegative(),
      sessionsWithConsistencyFindings: z.number().int().nonnegative()
    })
    .optional(),
  stateLayout: stateLayoutInspectionSchema,
  timestamp: nonEmptyStringSchema,
  transport: hostTransportHealthSchema
});

export const runtimeStatusSchema = z.object({
  nodeId: identifierSchema,
  desiredState: z.enum(["running", "stopped"]),
  observedState: z.enum(["starting", "running", "stopped", "failed"])
});

export const traceEventSchema = z.object({
  eventId: identifierSchema,
  category: z.enum(["control_plane", "session", "runtime"]),
  message: nonEmptyStringSchema,
  timestamp: nonEmptyStringSchema
});

export type HostArtifactBackendCacheStatus = z.infer<
  typeof hostArtifactBackendCacheStatusSchema
>;
export type HostArtifactBackendCacheClearRequest = z.infer<
  typeof hostArtifactBackendCacheClearRequestSchema
>;
export type HostArtifactBackendCacheClearResponse = z.infer<
  typeof hostArtifactBackendCacheClearResponseSchema
>;
export type HostOperatorSecurityStatus = z.infer<
  typeof hostOperatorSecurityStatusSchema
>;
export type HostStatusResponse = z.infer<typeof hostStatusResponseSchema>;
export type HostTransportHealth = z.infer<typeof hostTransportHealthSchema>;
export type HostTransportPlaneHealth = z.infer<
  typeof hostTransportPlaneHealthSchema
>;
export type HostTransportPlaneStatus = z.infer<
  typeof hostTransportPlaneStatusSchema
>;
export type HostTransportRelayHealth = z.infer<
  typeof hostTransportRelayHealthSchema
>;
export type HostTransportRelayStatus = z.infer<
  typeof hostTransportRelayStatusSchema
>;
export type StateLayoutInspection = z.infer<
  typeof stateLayoutInspectionSchema
>;
export type StateLayoutRecord = z.infer<typeof stateLayoutRecordSchema>;
export type StateLayoutProduct = z.infer<typeof stateLayoutProductSchema>;
export type RuntimeStatus = z.infer<typeof runtimeStatusSchema>;
export type TraceEvent = z.infer<typeof traceEventSchema>;

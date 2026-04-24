import { z } from "zod";
import { identifierSchema, nonEmptyStringSchema } from "../common/primitives.js";
import {
  runtimeBackendKindSchema,
  runtimeDesiredStateSchema,
  runtimeObservedStateSchema
} from "../runtime/runtime-state.js";

const hostEventBaseSchema = z.object({
  eventId: identifierSchema,
  message: nonEmptyStringSchema,
  schemaVersion: z.literal("1"),
  timestamp: nonEmptyStringSchema
});

export const catalogUpdatedEventSchema = hostEventBaseSchema.extend({
  catalogId: identifierSchema,
  category: z.literal("control_plane"),
  type: z.literal("catalog.updated"),
  updateKind: z.enum(["bootstrap", "apply"])
});

export const packageSourceAdmittedEventSchema = hostEventBaseSchema.extend({
  category: z.literal("control_plane"),
  packageSourceId: identifierSchema,
  type: z.literal("package_source.admitted")
});

export const externalPrincipalUpdatedEventSchema = hostEventBaseSchema.extend({
  category: z.literal("control_plane"),
  principalId: identifierSchema,
  type: z.literal("external_principal.updated")
});

export const graphRevisionAppliedEventSchema = hostEventBaseSchema.extend({
  activeRevisionId: identifierSchema,
  category: z.literal("control_plane"),
  graphId: identifierSchema,
  type: z.literal("graph.revision.applied")
});

export const nodeBindingUpdatedEventSchema = hostEventBaseSchema.extend({
  activeRevisionId: identifierSchema,
  category: z.literal("control_plane"),
  graphId: identifierSchema,
  mutationKind: z.enum(["created", "replaced", "deleted"]),
  nodeId: identifierSchema,
  type: z.literal("node.binding.updated")
});

export const edgeUpdatedEventSchema = hostEventBaseSchema.extend({
  activeRevisionId: identifierSchema,
  category: z.literal("control_plane"),
  edgeId: identifierSchema,
  graphId: identifierSchema,
  mutationKind: z.enum(["created", "replaced", "deleted"]),
  type: z.literal("edge.updated")
});

export const runtimeDesiredStateChangedEventSchema = hostEventBaseSchema.extend({
  category: z.literal("runtime"),
  desiredState: runtimeDesiredStateSchema,
  graphId: identifierSchema,
  graphRevisionId: identifierSchema,
  nodeId: identifierSchema,
  previousDesiredState: runtimeDesiredStateSchema.optional(),
  previousReason: nonEmptyStringSchema.optional(),
  reason: nonEmptyStringSchema.optional(),
  type: z.literal("runtime.desired_state.changed")
});

export const runtimeObservedStateChangedEventSchema = hostEventBaseSchema.extend({
  backendKind: runtimeBackendKindSchema,
  category: z.literal("runtime"),
  desiredState: runtimeDesiredStateSchema,
  graphId: identifierSchema,
  graphRevisionId: identifierSchema,
  nodeId: identifierSchema,
  observedState: runtimeObservedStateSchema,
  previousObservedState: runtimeObservedStateSchema.optional(),
  runtimeHandle: nonEmptyStringSchema.optional(),
  statusMessage: nonEmptyStringSchema.optional(),
  type: z.literal("runtime.observed_state.changed")
});

export const hostReconciliationCompletedEventSchema = hostEventBaseSchema.extend({
  backendKind: runtimeBackendKindSchema,
  category: z.literal("reconciliation"),
  failedRuntimeCount: z.number().int().nonnegative(),
  graphId: identifierSchema.optional(),
  graphRevisionId: identifierSchema.optional(),
  managedRuntimeCount: z.number().int().nonnegative(),
  runningRuntimeCount: z.number().int().nonnegative(),
  stoppedRuntimeCount: z.number().int().nonnegative(),
  type: z.literal("host.reconciliation.completed")
});

export const hostEventRecordSchema = z.discriminatedUnion("type", [
  catalogUpdatedEventSchema,
  packageSourceAdmittedEventSchema,
  externalPrincipalUpdatedEventSchema,
  graphRevisionAppliedEventSchema,
  nodeBindingUpdatedEventSchema,
  edgeUpdatedEventSchema,
  runtimeDesiredStateChangedEventSchema,
  runtimeObservedStateChangedEventSchema,
  hostReconciliationCompletedEventSchema
]);

export const hostEventListQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(500).optional()
});

export const hostEventStreamQuerySchema = z.object({
  replay: z.coerce.number().int().nonnegative().max(500).optional()
});

export const hostEventListResponseSchema = z.object({
  events: z.array(hostEventRecordSchema)
});

export type CatalogUpdatedEvent = z.infer<typeof catalogUpdatedEventSchema>;
export type PackageSourceAdmittedEvent = z.infer<
  typeof packageSourceAdmittedEventSchema
>;
export type ExternalPrincipalUpdatedEvent = z.infer<
  typeof externalPrincipalUpdatedEventSchema
>;
export type GraphRevisionAppliedEvent = z.infer<
  typeof graphRevisionAppliedEventSchema
>;
export type NodeBindingUpdatedEvent = z.infer<
  typeof nodeBindingUpdatedEventSchema
>;
export type EdgeUpdatedEvent = z.infer<typeof edgeUpdatedEventSchema>;
export type RuntimeDesiredStateChangedEvent = z.infer<
  typeof runtimeDesiredStateChangedEventSchema
>;
export type RuntimeObservedStateChangedEvent = z.infer<
  typeof runtimeObservedStateChangedEventSchema
>;
export type HostReconciliationCompletedEvent = z.infer<
  typeof hostReconciliationCompletedEventSchema
>;
export type HostEventRecord = z.infer<typeof hostEventRecordSchema>;
export type HostEventListQuery = z.infer<typeof hostEventListQuerySchema>;
export type HostEventStreamQuery = z.infer<typeof hostEventStreamQuerySchema>;
export type HostEventListResponse = z.infer<typeof hostEventListResponseSchema>;

import { z } from "zod";
import { graphSpecSchema } from "../graph/graph-spec.js";
import { packageSourceRecordSchema } from "../package/package-source.js";
import {
  identifierSchema,
  nonEmptyStringSchema
} from "../common/primitives.js";
import { validationReportSchema } from "../common/validation.js";

export const hostStatusResponseSchema = z.object({
  service: z.literal("entangle-host"),
  status: z.enum(["starting", "healthy", "degraded"]),
  graphRevisionId: identifierSchema.optional(),
  runtimeCounts: z.object({
    desired: z.number().int().nonnegative(),
    observed: z.number().int().nonnegative(),
    running: z.number().int().nonnegative()
  }),
  timestamp: nonEmptyStringSchema
});

export const packageSourceAdmissionRequestSchema = z.discriminatedUnion(
  "sourceKind",
  [
    z.object({
      sourceKind: z.literal("local_path"),
      packageSourceId: identifierSchema.optional(),
      absolutePath: nonEmptyStringSchema
    }),
    z.object({
      sourceKind: z.literal("local_archive"),
      packageSourceId: identifierSchema.optional(),
      archivePath: nonEmptyStringSchema
    })
  ]
);

export const packageSourceAdmissionResponseSchema = z.object({
  packageSource: packageSourceRecordSchema,
  validation: validationReportSchema
});

export const graphInspectionResponseSchema = z.object({
  graph: graphSpecSchema.optional(),
  activeRevisionId: identifierSchema.optional()
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

export type HostStatusResponse = z.infer<typeof hostStatusResponseSchema>;
export type PackageSourceAdmissionRequest = z.infer<
  typeof packageSourceAdmissionRequestSchema
>;
export type PackageSourceAdmissionResponse = z.infer<
  typeof packageSourceAdmissionResponseSchema
>;
export type GraphInspectionResponse = z.infer<
  typeof graphInspectionResponseSchema
>;
export type RuntimeStatus = z.infer<typeof runtimeStatusSchema>;
export type TraceEvent = z.infer<typeof traceEventSchema>;

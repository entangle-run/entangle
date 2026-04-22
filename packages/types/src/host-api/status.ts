import { z } from "zod";
import { identifierSchema, nonEmptyStringSchema } from "../common/primitives.js";

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
export type RuntimeStatus = z.infer<typeof runtimeStatusSchema>;
export type TraceEvent = z.infer<typeof traceEventSchema>;

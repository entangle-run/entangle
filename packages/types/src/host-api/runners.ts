import { z } from "zod";
import { nostrPublicKeySchema } from "../common/crypto.js";
import { identifierSchema, nonEmptyStringSchema } from "../common/primitives.js";
import { runnerHeartbeatPayloadSchema } from "../protocol/observe.js";
import {
  runnerHelloPayloadSchema,
  runnerOperationalStateSchema,
  runnerRegistrationRecordSchema
} from "../federation/runner.js";

export const runnerLivenessStateSchema = z.enum([
  "online",
  "stale",
  "offline",
  "unknown"
]);

export const runnerHeartbeatSnapshotSchema = z.object({
  assignmentIds: z.array(identifierSchema).default([]),
  hostAuthorityPubkey: nostrPublicKeySchema,
  lastHeartbeatAt: nonEmptyStringSchema,
  operationalState: runnerOperationalStateSchema.default("ready"),
  runnerId: identifierSchema,
  runnerPubkey: nostrPublicKeySchema,
  schemaVersion: z.literal("1"),
  statusMessage: nonEmptyStringSchema.optional(),
  updatedAt: nonEmptyStringSchema
});

export const runnerRegistryEntrySchema = z.object({
  heartbeat: runnerHeartbeatSnapshotSchema.optional(),
  liveness: runnerLivenessStateSchema,
  offlineAfterSeconds: z.number().int().positive(),
  projectedAt: nonEmptyStringSchema,
  registration: runnerRegistrationRecordSchema,
  staleAfterSeconds: z.number().int().positive()
});

export const runnerRegistryListResponseSchema = z.object({
  generatedAt: nonEmptyStringSchema,
  runners: z.array(runnerRegistryEntrySchema)
});

export const runnerRegistryInspectionResponseSchema = z.object({
  runner: runnerRegistryEntrySchema
});

export const runnerTrustMutationRequestSchema = z.object({
  reason: nonEmptyStringSchema.optional(),
  trustedBy: identifierSchema.optional()
});

export const runnerTrustMutationResponseSchema = z.object({
  runner: runnerRegistryEntrySchema
});

export const runnerRevokeMutationRequestSchema = z.object({
  reason: nonEmptyStringSchema.optional(),
  revokedBy: identifierSchema.optional()
});

export const runnerRevokeMutationResponseSchema = z.object({
  runner: runnerRegistryEntrySchema
});

export const runnerHelloIngestRequestSchema = runnerHelloPayloadSchema;
export const runnerHeartbeatIngestRequestSchema = runnerHeartbeatPayloadSchema;

export type RunnerLivenessState = z.infer<typeof runnerLivenessStateSchema>;
export type RunnerHeartbeatSnapshot = z.infer<
  typeof runnerHeartbeatSnapshotSchema
>;
export type RunnerRegistryEntry = z.infer<typeof runnerRegistryEntrySchema>;
export type RunnerRegistryListResponse = z.infer<
  typeof runnerRegistryListResponseSchema
>;
export type RunnerRegistryInspectionResponse = z.infer<
  typeof runnerRegistryInspectionResponseSchema
>;
export type RunnerTrustMutationRequest = z.infer<
  typeof runnerTrustMutationRequestSchema
>;
export type RunnerTrustMutationResponse = z.infer<
  typeof runnerTrustMutationResponseSchema
>;
export type RunnerRevokeMutationRequest = z.infer<
  typeof runnerRevokeMutationRequestSchema
>;
export type RunnerRevokeMutationResponse = z.infer<
  typeof runnerRevokeMutationResponseSchema
>;

import { z } from "zod";
import { nostrPublicKeySchema } from "../common/crypto.js";
import {
  identifierSchema,
  nonEmptyStringSchema,
  websocketUrlSchema
} from "../common/primitives.js";
import { runtimeSecretDeliverySchema } from "../runtime/secret-delivery.js";
import { runnerCapabilitySchema } from "./runner.js";

export const runnerJoinIdentitySchema = z.object({
  publicKey: nostrPublicKeySchema.optional(),
  secretDelivery: runtimeSecretDeliverySchema
});

export const runnerJoinConfigSchema = z.object({
  authRequired: z.boolean().default(false),
  capabilities: runnerCapabilitySchema,
  hostAuthorityPubkey: nostrPublicKeySchema,
  identity: runnerJoinIdentitySchema,
  relayUrls: z.array(websocketUrlSchema).min(1),
  runnerId: identifierSchema,
  schemaVersion: z.literal("1")
});

export const runnerJoinStatusSchema = z.object({
  assignmentIds: z.array(identifierSchema).default([]),
  hostAuthorityPubkey: nostrPublicKeySchema,
  lastHelloEventId: nonEmptyStringSchema.optional(),
  relayUrls: z.array(websocketUrlSchema),
  runnerId: identifierSchema,
  runnerPubkey: nostrPublicKeySchema,
  schemaVersion: z.literal("1"),
  startedAt: nonEmptyStringSchema
});

export type RunnerJoinIdentity = z.infer<typeof runnerJoinIdentitySchema>;
export type RunnerJoinConfig = z.infer<typeof runnerJoinConfigSchema>;
export type RunnerJoinStatus = z.infer<typeof runnerJoinStatusSchema>;

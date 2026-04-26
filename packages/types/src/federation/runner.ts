import { z } from "zod";
import { nostrPublicKeySchema } from "../common/crypto.js";
import { identifierSchema, nonEmptyStringSchema } from "../common/primitives.js";
import { agentEngineProfileKindSchema } from "../resources/catalog.js";

export const runtimeNodeKindSchema = z.enum([
  "agent_runner",
  "human_interface",
  "service_runner",
  "external_gateway"
]);

export const runnerTrustStateSchema = z.enum([
  "pending",
  "trusted",
  "revoked"
]);

export const runnerOperationalStateSchema = z.enum([
  "unknown",
  "starting",
  "ready",
  "busy",
  "degraded",
  "offline"
]);

export const runnerCapabilitySchema = z
  .object({
    agentEngineKinds: z.array(agentEngineProfileKindSchema).default([]),
    labels: z.array(identifierSchema).default([]),
    maxAssignments: z.number().int().positive().default(1),
    runtimeKinds: z.array(runtimeNodeKindSchema).min(1),
    supportsLocalWorkspace: z.boolean().default(true),
    supportsNip59: z.boolean().default(true)
  })
  .superRefine((value, context) => {
    if (
      value.runtimeKinds.includes("agent_runner") &&
      value.agentEngineKinds.length === 0
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Runners that advertise agent_runner must list at least one agent engine kind.",
        path: ["agentEngineKinds"]
      });
    }
  });

export const runnerRegistrationRecordSchema = z
  .object({
    capabilities: runnerCapabilitySchema,
    firstSeenAt: nonEmptyStringSchema,
    hostAuthorityPubkey: nostrPublicKeySchema,
    lastSeenAt: nonEmptyStringSchema.optional(),
    publicKey: nostrPublicKeySchema,
    revokedAt: nonEmptyStringSchema.optional(),
    revocationReason: nonEmptyStringSchema.optional(),
    runnerId: identifierSchema,
    schemaVersion: z.literal("1"),
    trustState: runnerTrustStateSchema.default("pending"),
    updatedAt: nonEmptyStringSchema
  })
  .superRefine((value, context) => {
    if (value.trustState === "revoked" && !value.revokedAt) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Revoked runner registrations must include revokedAt.",
        path: ["revokedAt"]
      });
    }

    if (value.trustState !== "revoked" && value.revokedAt) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Only revoked runner registrations may include revokedAt.",
        path: ["revokedAt"]
      });
    }

    if (value.trustState !== "revoked" && value.revocationReason) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Only revoked runner registrations may include revocationReason.",
        path: ["revocationReason"]
      });
    }
  });

export const runnerHelloPayloadSchema = z.object({
  capabilities: runnerCapabilitySchema,
  eventType: z.literal("runner.hello"),
  hostAuthorityPubkey: nostrPublicKeySchema,
  issuedAt: nonEmptyStringSchema,
  nonce: nonEmptyStringSchema,
  protocol: z.literal("entangle.observe.v1"),
  runnerId: identifierSchema,
  runnerPubkey: nostrPublicKeySchema
});

export type RuntimeNodeKind = z.infer<typeof runtimeNodeKindSchema>;
export type RunnerTrustState = z.infer<typeof runnerTrustStateSchema>;
export type RunnerOperationalState = z.infer<
  typeof runnerOperationalStateSchema
>;
export type RunnerCapability = z.infer<typeof runnerCapabilitySchema>;
export type RunnerRegistrationRecord = z.infer<
  typeof runnerRegistrationRecordSchema
>;
export type RunnerHelloPayload = z.infer<typeof runnerHelloPayloadSchema>;

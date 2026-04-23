import { z } from "zod";
import { nostrPublicKeySchema } from "../common/crypto.js";
import { filesystemPathSchema, identifierSchema, nonEmptyStringSchema } from "../common/primitives.js";
import { runtimeSecretDeliverySchema } from "./secret-delivery.js";

export const runtimeIdentityContextSchema = z.object({
  algorithm: z.literal("nostr_secp256k1"),
  publicKey: nostrPublicKeySchema,
  secretDelivery: runtimeSecretDeliverySchema
});

export const runtimeIdentityRecordSchema = z.object({
  algorithm: z.literal("nostr_secp256k1"),
  createdAt: nonEmptyStringSchema,
  graphId: identifierSchema,
  nodeId: identifierSchema,
  publicKey: nostrPublicKeySchema,
  schemaVersion: z.literal("1"),
  secretStoragePath: filesystemPathSchema,
  updatedAt: nonEmptyStringSchema
});

export type RuntimeIdentitySecretDelivery = z.infer<
  typeof runtimeSecretDeliverySchema
>;
export type RuntimeIdentityContext = z.infer<typeof runtimeIdentityContextSchema>;
export type RuntimeIdentityRecord = z.infer<typeof runtimeIdentityRecordSchema>;

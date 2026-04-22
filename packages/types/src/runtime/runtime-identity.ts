import { z } from "zod";
import { nostrPublicKeySchema } from "../common/crypto.js";
import { filesystemPathSchema, identifierSchema, nonEmptyStringSchema } from "../common/primitives.js";

export const runtimeIdentitySecretDeliverySchema = z.discriminatedUnion("mode", [
  z.object({
    envVar: nonEmptyStringSchema,
    mode: z.literal("env_var")
  }),
  z.object({
    filePath: filesystemPathSchema,
    mode: z.literal("mounted_file")
  })
]);

export const runtimeIdentityContextSchema = z.object({
  algorithm: z.literal("nostr_secp256k1"),
  publicKey: nostrPublicKeySchema,
  secretDelivery: runtimeIdentitySecretDeliverySchema
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
  typeof runtimeIdentitySecretDeliverySchema
>;
export type RuntimeIdentityContext = z.infer<typeof runtimeIdentityContextSchema>;
export type RuntimeIdentityRecord = z.infer<typeof runtimeIdentityRecordSchema>;

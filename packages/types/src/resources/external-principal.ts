import { z } from "zod";
import { identifierSchema, nonEmptyStringSchema } from "../common/primitives.js";

export const externalPrincipalSystemKindSchema = z.enum(["git"]);

export const gitTransportAuthModeSchema = z.enum([
  "ssh_key",
  "https_token",
  "http_signature"
]);

export const gitAttributionProfileSchema = z.object({
  displayName: nonEmptyStringSchema,
  email: nonEmptyStringSchema.optional()
});

export const gitSigningProfileSchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("none")
  }),
  z.object({
    mode: z.literal("ssh_key"),
    secretRef: nonEmptyStringSchema
  })
]);

export const externalPrincipalRecordSchema = z.object({
  principalId: identifierSchema,
  displayName: nonEmptyStringSchema,
  systemKind: z.literal("git"),
  gitServiceRef: identifierSchema,
  subject: nonEmptyStringSchema,
  transportAuthMode: gitTransportAuthModeSchema,
  secretRef: nonEmptyStringSchema,
  attribution: gitAttributionProfileSchema.optional(),
  signing: gitSigningProfileSchema.optional()
});

export type ExternalPrincipalSystemKind = z.infer<
  typeof externalPrincipalSystemKindSchema
>;
export type GitTransportAuthMode = z.infer<typeof gitTransportAuthModeSchema>;
export type GitAttributionProfile = z.infer<typeof gitAttributionProfileSchema>;
export type GitSigningProfile = z.infer<typeof gitSigningProfileSchema>;
export type ExternalPrincipalRecord = z.infer<
  typeof externalPrincipalRecordSchema
>;

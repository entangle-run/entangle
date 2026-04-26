import { z } from "zod";
import {
  nostrEventIdSchema,
  nostrPublicKeySchema,
  nostrSignatureSchema,
  sha256DigestSchema
} from "../common/crypto.js";
import { identifierSchema, nonEmptyStringSchema } from "../common/primitives.js";

export const entangleProtocolDomainSchema = z.enum([
  "entangle.a2a.v1",
  "entangle.control.v1",
  "entangle.observe.v1"
]);

export const entangleSignedEnvelopeSchema = z.object({
  causationEventId: nostrEventIdSchema.optional(),
  correlationId: identifierSchema.optional(),
  createdAt: nonEmptyStringSchema,
  eventId: nostrEventIdSchema,
  payloadHash: sha256DigestSchema,
  protocol: entangleProtocolDomainSchema,
  recipientPubkey: nostrPublicKeySchema.optional(),
  schemaVersion: z.literal("1"),
  signature: nostrSignatureSchema,
  signerPubkey: nostrPublicKeySchema
});

export type EntangleProtocolDomain = z.infer<
  typeof entangleProtocolDomainSchema
>;
export type EntangleSignedEnvelope = z.infer<
  typeof entangleSignedEnvelopeSchema
>;

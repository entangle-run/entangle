import { z } from "zod";

const lowercaseHexPattern = /^[0-9a-f]+$/;

export const lowercaseHexSchema = z.string().regex(lowercaseHexPattern, {
  message: "Expected a lowercase hexadecimal string."
});

export const sha256DigestSchema = z.string().regex(/^[0-9a-f]{64}$/, {
  message: "Expected a lowercase SHA-256 digest."
});

export const nostrPublicKeySchema = z.string().regex(/^[0-9a-f]{64}$/, {
  message: "Expected a lowercase 64-character Nostr public key."
});

export const nostrEventIdSchema = z.string().regex(/^[0-9a-f]{64}$/, {
  message: "Expected a lowercase 64-character Nostr event id."
});

export const nostrSignatureSchema = z.string().regex(/^[0-9a-f]{128}$/, {
  message: "Expected a lowercase 64-byte Nostr Schnorr signature."
});

export type LowercaseHex = z.infer<typeof lowercaseHexSchema>;
export type Sha256Digest = z.infer<typeof sha256DigestSchema>;
export type NostrPublicKey = z.infer<typeof nostrPublicKeySchema>;
export type NostrEventId = z.infer<typeof nostrEventIdSchema>;
export type NostrSignature = z.infer<typeof nostrSignatureSchema>;

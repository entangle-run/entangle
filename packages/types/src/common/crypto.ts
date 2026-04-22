import { z } from "zod";

const lowercaseHexPattern = /^[0-9a-f]+$/;

export const lowercaseHexSchema = z.string().regex(lowercaseHexPattern, {
  message: "Expected a lowercase hexadecimal string."
});

export const nostrPublicKeySchema = z.string().regex(/^[0-9a-f]{64}$/, {
  message: "Expected a lowercase 64-character Nostr public key."
});

export const nostrEventIdSchema = z.string().regex(/^[0-9a-f]{64}$/, {
  message: "Expected a lowercase 64-character Nostr event id."
});

export type LowercaseHex = z.infer<typeof lowercaseHexSchema>;
export type NostrPublicKey = z.infer<typeof nostrPublicKeySchema>;
export type NostrEventId = z.infer<typeof nostrEventIdSchema>;

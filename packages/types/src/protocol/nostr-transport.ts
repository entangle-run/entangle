import { z } from "zod";

export const entangleNostrGiftWrapKind = 1059 as const;
export const entangleNostrRumorKind = 24159 as const;

export const entangleNostrGiftWrapKindSchema = z.literal(
  entangleNostrGiftWrapKind
);
export const entangleNostrRumorKindSchema = z.literal(entangleNostrRumorKind);
export const entangleNostrTransportModeSchema = z.enum(["nip59_gift_wrap"]);

export type EntangleNostrTransportMode = z.infer<
  typeof entangleNostrTransportModeSchema
>;

import { z } from "zod";
import { identifierSchema, nonEmptyStringSchema } from "../common/primitives.js";

export const focusedRegisterEntryStateSchema = z.object({
  carryCount: z.number().int().positive(),
  firstObservedTurnId: identifierSchema,
  lastObservedTurnId: identifierSchema,
  normalizedKey: nonEmptyStringSchema,
  text: nonEmptyStringSchema
});

export const focusedRegisterTransitionKindSchema = z.enum([
  "closed",
  "completed",
  "consolidated",
  "replaced",
  "resolved_overlap"
]);

export const focusedRegisterTransitionRegisterSchema = z.enum([
  "nextActions",
  "openQuestions"
]);

export const focusedRegisterTransitionStateSchema = z.object({
  kind: focusedRegisterTransitionKindSchema,
  observedAt: nonEmptyStringSchema,
  register: focusedRegisterTransitionRegisterSchema,
  resolutionTexts: z.array(nonEmptyStringSchema).default([]),
  sourceTexts: z.array(nonEmptyStringSchema).min(1),
  targetTexts: z.array(nonEmptyStringSchema).default([]),
  turnId: identifierSchema
});

export const focusedRegisterStateSchema = z.object({
  registers: z.object({
    nextActions: z.array(focusedRegisterEntryStateSchema).default([]),
    openQuestions: z.array(focusedRegisterEntryStateSchema).default([]),
    resolutions: z.array(focusedRegisterEntryStateSchema).default([])
  }),
  schemaVersion: z.literal("1"),
  transitionHistory: z.array(focusedRegisterTransitionStateSchema).default([]),
  updatedAt: nonEmptyStringSchema,
  updatedTurnId: identifierSchema
});

export type FocusedRegisterEntryState = z.infer<
  typeof focusedRegisterEntryStateSchema
>;
export type FocusedRegisterState = z.infer<typeof focusedRegisterStateSchema>;
export type FocusedRegisterTransitionState = z.infer<
  typeof focusedRegisterTransitionStateSchema
>;

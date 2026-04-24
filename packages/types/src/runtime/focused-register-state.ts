import { z } from "zod";
import { identifierSchema, nonEmptyStringSchema } from "../common/primitives.js";

export const focusedRegisterEntryStateSchema = z.object({
  carryCount: z.number().int().positive(),
  firstObservedTurnId: identifierSchema,
  lastObservedTurnId: identifierSchema,
  normalizedKey: nonEmptyStringSchema,
  text: nonEmptyStringSchema
});

export const focusedRegisterStateSchema = z.object({
  registers: z.object({
    nextActions: z.array(focusedRegisterEntryStateSchema).default([]),
    openQuestions: z.array(focusedRegisterEntryStateSchema).default([]),
    resolutions: z.array(focusedRegisterEntryStateSchema).default([])
  }),
  schemaVersion: z.literal("1"),
  updatedAt: nonEmptyStringSchema,
  updatedTurnId: identifierSchema
});

export type FocusedRegisterEntryState = z.infer<
  typeof focusedRegisterEntryStateSchema
>;
export type FocusedRegisterState = z.infer<typeof focusedRegisterStateSchema>;

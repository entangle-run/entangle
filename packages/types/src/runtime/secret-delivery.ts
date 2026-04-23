import { z } from "zod";
import {
  filesystemPathSchema,
  secretRefSchema
} from "../common/primitives.js";

export const runtimeSecretDeliverySchema = z.discriminatedUnion("mode", [
  z.object({
    envVar: z.string().trim().min(1),
    mode: z.literal("env_var")
  }),
  z.object({
    filePath: filesystemPathSchema,
    mode: z.literal("mounted_file")
  })
]);

export const resolvedSecretBindingStatusSchema = z.enum(["available", "missing"]);

export const resolvedSecretBindingSchema = z
  .object({
    delivery: runtimeSecretDeliverySchema.optional(),
    secretRef: secretRefSchema,
    status: resolvedSecretBindingStatusSchema
  })
  .superRefine((value, context) => {
    if (value.status === "available" && !value.delivery) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Available secret bindings must include delivery metadata."
      });
    }

    if (value.status === "missing" && value.delivery) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Missing secret bindings must not include delivery metadata."
      });
    }
  });

export type RuntimeSecretDelivery = z.infer<typeof runtimeSecretDeliverySchema>;
export type ResolvedSecretBindingStatus = z.infer<
  typeof resolvedSecretBindingStatusSchema
>;
export type ResolvedSecretBinding = z.infer<typeof resolvedSecretBindingSchema>;

import { z } from "zod";
import { nonEmptyStringSchema } from "../common/primitives.js";

export const hostErrorCodeSchema = z.enum([
  "bad_request",
  "not_found",
  "internal_error"
]);

export const hostErrorResponseSchema = z.object({
  code: hostErrorCodeSchema,
  message: nonEmptyStringSchema,
  details: z.record(z.string(), z.unknown()).optional()
});

export type HostErrorCode = z.infer<typeof hostErrorCodeSchema>;
export type HostErrorResponse = z.infer<typeof hostErrorResponseSchema>;

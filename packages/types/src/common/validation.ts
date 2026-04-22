import { z } from "zod";
import { identifierSchema, nonEmptyStringSchema } from "./primitives.js";

export const validationSeveritySchema = z.enum(["error", "warning"]);

export const validationFindingSchema = z.object({
  code: identifierSchema,
  severity: validationSeveritySchema,
  message: nonEmptyStringSchema,
  path: z.array(nonEmptyStringSchema).default([]),
  details: z.record(z.string(), z.unknown()).optional()
});

export const validationReportSchema = z.object({
  ok: z.boolean(),
  findings: z.array(validationFindingSchema).default([])
});

export type ValidationSeverity = z.infer<typeof validationSeveritySchema>;
export type ValidationFinding = z.infer<typeof validationFindingSchema>;
export type ValidationReport = z.infer<typeof validationReportSchema>;

export function buildValidationReport(
  findings: ValidationFinding[]
): ValidationReport {
  return {
    ok: !findings.some((finding) => finding.severity === "error"),
    findings
  };
}

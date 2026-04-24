import type { ValidationReport } from "@entangle/types";

export function summarizeValidationReport(
  report: ValidationReport
): string | null {
  if (report.ok) {
    return null;
  }

  const errors = report.findings.filter((finding) => finding.severity === "error");

  if (errors.length === 0) {
    return "The host rejected the candidate graph mutation.";
  }

  return errors
    .slice(0, 3)
    .map((finding) => finding.message)
    .join(" ");
}

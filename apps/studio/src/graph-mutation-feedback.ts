import type {
  ValidationFinding,
  ValidationReport,
  ValidationSeverity
} from "@entangle/types";

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

export function countValidationFindings(
  report: ValidationReport,
  severity: ValidationSeverity
): number {
  return report.findings.filter((finding) => finding.severity === severity).length;
}

export function formatValidationFindingLine(
  finding: ValidationFinding
): string {
  const path = finding.path.length > 0 ? ` [${finding.path.join(".")}]` : "";
  return `${finding.severity.toUpperCase()} ${finding.code}${path}: ${finding.message}`;
}

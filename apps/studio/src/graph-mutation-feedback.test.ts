import { describe, expect, it } from "vitest";
import type { ValidationReport } from "@entangle/types";
import {
  countValidationFindings,
  formatValidationFindingLine,
  summarizeValidationReport
} from "./graph-mutation-feedback.js";

describe("graph mutation feedback", () => {
  it("summarizes and formats validation findings for operator views", () => {
    const report: ValidationReport = {
      ok: false,
      findings: [
        {
          code: "missing_package_source",
          message: "Node 'worker-it' references a missing package source.",
          path: ["nodes", "worker-it", "packageSourceRef"],
          severity: "error"
        },
        {
          code: "unused_principal",
          message: "Principal 'git-main' is not referenced.",
          path: [],
          severity: "warning"
        }
      ]
    };

    expect(summarizeValidationReport(report)).toBe(
      "Node 'worker-it' references a missing package source."
    );
    expect(countValidationFindings(report, "error")).toBe(1);
    expect(countValidationFindings(report, "warning")).toBe(1);
    expect(formatValidationFindingLine(report.findings[0]!)).toBe(
      "ERROR missing_package_source [nodes.worker-it.packageSourceRef]: Node 'worker-it' references a missing package source."
    );
  });
});

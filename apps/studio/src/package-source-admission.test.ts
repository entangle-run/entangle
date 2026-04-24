import { describe, expect, it } from "vitest";
import type { PackageSourceInspectionResponse } from "@entangle/types";
import {
  buildPackageSourceAdmissionRequest,
  createEmptyPackageSourceAdmissionDraft,
  formatPackageSourceDetail,
  formatPackageSourceOptionLabel,
  sortPackageSourceInspections
} from "./package-source-admission.js";

function createPackageSource(
  packageSourceId: string,
  sourceKind: "local_archive" | "local_path"
): PackageSourceInspectionResponse {
  return {
    manifest: {
      capabilities: [],
      defaultNodeKind: "worker",
      entryPrompts: {
        interaction: "prompts/interaction.md",
        system: "prompts/system.md"
      },
      memoryProfile: {
        schemaPath: "memory/schema/AGENTS.md",
        wikiSeedPath: "memory/seed/wiki"
      },
      metadata: {
        tags: []
      },
      name: `${packageSourceId}-name`,
      packageId: `${packageSourceId}-template`,
      packageKind: "template",
      runtime: {
        capabilitiesPath: "runtime/capabilities.json",
        configPath: "runtime/config.json",
        toolsPath: "runtime/tools.json"
      },
      schemaVersion: "1",
      version: "0.1.0"
    },
    packageSource:
      sourceKind === "local_path"
        ? {
            absolutePath: `/tmp/${packageSourceId}`,
            materialization: {
              contentDigest: "sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
              materializationKind: "immutable_store",
              packageRoot: `/store/${packageSourceId}`,
              synchronizedAt: "2026-04-24T10:00:00.000Z"
            },
            packageSourceId,
            sourceKind: "local_path"
          }
        : {
            archivePath: `/tmp/${packageSourceId}.tar.gz`,
            packageSourceId,
            sourceKind: "local_archive"
          },
    validation: {
      findings: [],
      ok: true
    }
  };
}

describe("package source admission helpers", () => {
  it("builds canonical admission requests for both supported source kinds", () => {
    expect(
      buildPackageSourceAdmissionRequest({
        absolutePath: " /tmp/worker-it ",
        archivePath: "",
        packageSourceId: " worker-it-source ",
        sourceKind: "local_path"
      })
    ).toEqual({
      absolutePath: "/tmp/worker-it",
      packageSourceId: "worker-it-source",
      sourceKind: "local_path"
    });

    expect(
      buildPackageSourceAdmissionRequest({
        absolutePath: "",
        archivePath: " /tmp/worker-it.tar.gz ",
        packageSourceId: "",
        sourceKind: "local_archive"
      })
    ).toEqual({
      archivePath: "/tmp/worker-it.tar.gz",
      sourceKind: "local_archive"
    });
  });

  it("creates an empty draft with the canonical default source kind", () => {
    expect(createEmptyPackageSourceAdmissionDraft()).toEqual({
      absolutePath: "",
      archivePath: "",
      packageSourceId: "",
      sourceKind: "local_path"
    });
  });

  it("sorts and formats package source inspection rows deterministically", () => {
    const inspections = sortPackageSourceInspections([
      createPackageSource("marketing", "local_archive"),
      createPackageSource("it", "local_path")
    ]);

    expect(inspections.map((inspection) => inspection.packageSource.packageSourceId)).toEqual([
      "it",
      "marketing"
    ]);
    expect(formatPackageSourceOptionLabel(inspections[0]!)).toBe("it-name (it)");
    expect(formatPackageSourceDetail(inspections[0]!)).toContain("local_path");
    expect(formatPackageSourceDetail(inspections[0]!)).toContain("materialized immutable_store");
    expect(formatPackageSourceDetail(inspections[1]!)).toContain("/tmp/marketing.tar.gz");
  });
});

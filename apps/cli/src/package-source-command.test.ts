import { describe, expect, it } from "vitest";

import {
  buildPackageSourceAdmissionRequestFromCli,
  packageSourceCliSourceKinds
} from "./package-source-command.js";

describe("package-source-command", () => {
  it("builds a canonical local_path admission request", () => {
    const request = buildPackageSourceAdmissionRequestFromCli({
      inputPath: "./fixtures/worker-it",
      packageSourceId: " worker-it ",
      sourceKind: "local_path"
    });

    expect(request.sourceKind).toBe("local_path");
    expect(request.packageSourceId).toBe("worker-it");
    expect(request.absolutePath).toMatch(/fixtures\/worker-it$/);
  });

  it("builds a canonical local_archive admission request", () => {
    const request = buildPackageSourceAdmissionRequestFromCli({
      inputPath: "./fixtures/worker-it.tar.gz",
      sourceKind: "local_archive"
    });

    expect(request.sourceKind).toBe("local_archive");
    expect(request.archivePath).toMatch(/fixtures\/worker-it\.tar\.gz$/);
  });

  it("rejects unsupported source kinds with a deterministic error", () => {
    expect(() =>
      buildPackageSourceAdmissionRequestFromCli({
        inputPath: "./fixtures/worker-it",
        sourceKind: "remote_git"
      })
    ).toThrow(
      `Unsupported package source kind 'remote_git'. Expected one of: ${packageSourceCliSourceKinds.join(", ")}.`
    );
  });
});

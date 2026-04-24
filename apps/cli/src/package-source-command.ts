import path from "node:path";

import type { PackageSourceAdmissionRequest } from "@entangle/types";

export const packageSourceCliSourceKinds = [
  "local_archive",
  "local_path"
] as const;

export type PackageSourceCliSourceKind =
  (typeof packageSourceCliSourceKinds)[number];

export type PackageSourceCliAdmissionInput = {
  inputPath: string;
  packageSourceId?: string;
  sourceKind: string;
};

export function buildPackageSourceAdmissionRequestFromCli(
  input: PackageSourceCliAdmissionInput
): PackageSourceAdmissionRequest {
  const packageSourceId = input.packageSourceId?.trim();
  const resolvedInputPath = path.resolve(input.inputPath);

  switch (input.sourceKind) {
    case "local_archive":
      return {
        archivePath: resolvedInputPath,
        ...(packageSourceId ? { packageSourceId } : {}),
        sourceKind: "local_archive"
      };
    case "local_path":
      return {
        absolutePath: resolvedInputPath,
        ...(packageSourceId ? { packageSourceId } : {}),
        sourceKind: "local_path"
      };
    default:
      throw new Error(
        `Unsupported package source kind '${input.sourceKind}'. Expected one of: ${packageSourceCliSourceKinds.join(", ")}.`
      );
  }
}

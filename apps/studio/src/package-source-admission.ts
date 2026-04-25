import type { PackageSourceAdmissionRequest } from "@entangle/types";

export type PackageSourceAdmissionDraft = {
  absolutePath: string;
  archivePath: string;
  packageSourceId: string;
  sourceKind: "local_archive" | "local_path";
};

export function createEmptyPackageSourceAdmissionDraft(): PackageSourceAdmissionDraft {
  return {
    absolutePath: "",
    archivePath: "",
    packageSourceId: "",
    sourceKind: "local_path"
  };
}

export function buildPackageSourceAdmissionRequest(
  draft: PackageSourceAdmissionDraft
): PackageSourceAdmissionRequest {
  const packageSourceId = draft.packageSourceId.trim();

  if (draft.sourceKind === "local_path") {
    return {
      absolutePath: draft.absolutePath.trim(),
      ...(packageSourceId ? { packageSourceId } : {}),
      sourceKind: "local_path"
    };
  }

  return {
    archivePath: draft.archivePath.trim(),
    ...(packageSourceId ? { packageSourceId } : {}),
    sourceKind: "local_archive"
  };
}

export {
  collectPackageSourceReferenceNodeIds,
  formatPackageSourceDetail,
  formatPackageSourceOptionLabel,
  formatPackageSourceReferenceSummary,
  sortPackageSourceInspections
} from "@entangle/host-client";

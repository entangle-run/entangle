import type {
  GraphSpec,
  PackageSourceAdmissionRequest,
  PackageSourceInspectionResponse
} from "@entangle/types";

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

export function sortPackageSourceInspections(
  packageSources: PackageSourceInspectionResponse[]
): PackageSourceInspectionResponse[] {
  return [...packageSources].sort((left, right) =>
    left.packageSource.packageSourceId.localeCompare(
      right.packageSource.packageSourceId
    )
  );
}

export function formatPackageSourceOptionLabel(
  inspection: PackageSourceInspectionResponse
): string {
  const manifestName =
    inspection.manifest?.name ?? inspection.packageSource.packageSourceId;

  return `${manifestName} (${inspection.packageSource.packageSourceId})`;
}

export function formatPackageSourceDetail(
  inspection: PackageSourceInspectionResponse
): string {
  const sourcePath =
    inspection.packageSource.sourceKind === "local_path"
      ? inspection.packageSource.absolutePath
      : inspection.packageSource.archivePath;
  const materializationState = inspection.packageSource.materialization
    ? `materialized ${inspection.packageSource.materialization.materializationKind}`
    : "not yet materialized";

  return `${inspection.packageSource.sourceKind} · ${sourcePath} · ${materializationState}`;
}

export function collectPackageSourceReferenceNodeIds(
  graph: GraphSpec | undefined,
  packageSourceId: string
): string[] {
  return (graph?.nodes ?? [])
    .filter((node) => node.packageSourceRef === packageSourceId)
    .map((node) => node.nodeId)
    .sort((left, right) => left.localeCompare(right));
}

export function formatPackageSourceReferenceSummary(nodeIds: string[]): string {
  if (nodeIds.length === 0) {
    return "No active graph references";
  }

  const visibleNodeIds = nodeIds.slice(0, 3);
  const hiddenCount = nodeIds.length - visibleNodeIds.length;
  const suffix = hiddenCount > 0 ? `, +${hiddenCount} more` : "";
  const noun = nodeIds.length === 1 ? "node" : "nodes";

  return `Referenced by ${nodeIds.length} ${noun}: ${visibleNodeIds.join(", ")}${suffix}`;
}

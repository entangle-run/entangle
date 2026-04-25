import {
  collectExternalPrincipalReferenceNodeIds,
  collectPackageSourceReferenceNodeIds,
  formatExternalPrincipalDetail,
  formatExternalPrincipalLabel,
  formatExternalPrincipalReferenceSummary,
  formatPackageSourceDetail,
  formatPackageSourceOptionLabel,
  formatPackageSourceReferenceSummary
} from "@entangle/host-client";
import type {
  ExternalPrincipalInspectionResponse,
  GraphSpec,
  PackageSourceInspectionResponse
} from "@entangle/types";

export type PackageSourceCliSummary = {
  detail: string;
  label: string;
  manifest?: {
    name: string;
    packageId: string;
    version: string;
  };
  packageSourceId: string;
  referenceNodeIds: string[];
  referenceSummary: string;
  sourceKind: string;
  validationOk: boolean;
};

export type ExternalPrincipalCliSummary = {
  detail: string;
  gitServiceRef: string;
  label: string;
  principalId: string;
  referenceNodeIds: string[];
  referenceSummary: string;
  subject: string;
  systemKind: string;
  transportAuthMode: string;
  validationOk: boolean;
};

export function projectPackageSourceSummary(
  inspection: PackageSourceInspectionResponse,
  graph: GraphSpec | undefined
): PackageSourceCliSummary {
  const referenceNodeIds = collectPackageSourceReferenceNodeIds(
    graph,
    inspection.packageSource.packageSourceId
  );

  return {
    detail: formatPackageSourceDetail(inspection),
    label: formatPackageSourceOptionLabel(inspection),
    ...(inspection.manifest
      ? {
          manifest: {
            name: inspection.manifest.name,
            packageId: inspection.manifest.packageId,
            version: inspection.manifest.version
          }
        }
      : {}),
    packageSourceId: inspection.packageSource.packageSourceId,
    referenceNodeIds,
    referenceSummary: formatPackageSourceReferenceSummary(referenceNodeIds),
    sourceKind: inspection.packageSource.sourceKind,
    validationOk: inspection.validation.ok
  };
}

export function projectExternalPrincipalSummary(
  inspection: ExternalPrincipalInspectionResponse,
  graph: GraphSpec | undefined
): ExternalPrincipalCliSummary {
  const referenceNodeIds = collectExternalPrincipalReferenceNodeIds(
    graph,
    inspection.principal.principalId
  );

  return {
    detail: formatExternalPrincipalDetail(inspection),
    gitServiceRef: inspection.principal.gitServiceRef,
    label: formatExternalPrincipalLabel(inspection),
    principalId: inspection.principal.principalId,
    referenceNodeIds,
    referenceSummary: formatExternalPrincipalReferenceSummary(referenceNodeIds),
    subject: inspection.principal.subject,
    systemKind: inspection.principal.systemKind,
    transportAuthMode: inspection.principal.transportAuthMode,
    validationOk: inspection.validation.ok
  };
}

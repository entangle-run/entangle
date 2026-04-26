import type {
  HostAuthorityExportResponse,
  HostAuthorityImportResponse,
  HostAuthorityInspectionResponse
} from "@entangle/types";

export type HostAuthorityCliSummary = {
  authorityId: string;
  displayName?: string;
  keyRef?: string;
  publicKey: string;
  secretStatus: string;
  status: string;
  updatedAt: string;
};

export function projectHostAuthoritySummary(
  inspection: HostAuthorityInspectionResponse
): HostAuthorityCliSummary {
  return {
    authorityId: inspection.authority.authorityId,
    ...(inspection.authority.displayName
      ? { displayName: inspection.authority.displayName }
      : {}),
    ...(inspection.secret.keyRef ? { keyRef: inspection.secret.keyRef } : {}),
    publicKey: inspection.authority.publicKey,
    secretStatus: inspection.secret.status,
    status: inspection.authority.status,
    updatedAt: inspection.authority.updatedAt
  };
}

export function projectHostAuthorityExportSummary(
  response: HostAuthorityExportResponse
): HostAuthorityCliSummary & {
  exportedAt: string;
  secretKeyIncluded: boolean;
} {
  return {
    ...projectHostAuthoritySummary({
      authority: response.authority,
      checkedAt: response.exportedAt,
      secret: {
        ...(response.authority.keyRef ? { keyRef: response.authority.keyRef } : {}),
        status: "available"
      }
    }),
    exportedAt: response.exportedAt,
    secretKeyIncluded: true
  };
}

export function projectHostAuthorityImportSummary(
  response: HostAuthorityImportResponse
): HostAuthorityCliSummary & {
  importedAt: string;
} {
  return {
    authorityId: response.authority.authorityId,
    ...(response.authority.displayName
      ? { displayName: response.authority.displayName }
      : {}),
    ...(response.authority.keyRef ? { keyRef: response.authority.keyRef } : {}),
    importedAt: response.importedAt,
    publicKey: response.authority.publicKey,
    secretStatus: "available",
    status: response.authority.status,
    updatedAt: response.authority.updatedAt
  };
}

import type { HostEventAuditBundleResponse } from "@entangle/types";

export interface HostEventAuditBundleCliSummary {
  bundleHash: string;
  checkedEventCount: number;
  eventCount: number;
  eventsJsonlSha256: string;
  generatedAt: string;
  hostAuthorityPubkey: string;
  integrityReportHash: string;
  integrityStatus: HostEventAuditBundleResponse["signedIntegrityReport"]["integrity"]["status"];
}

export function projectHostEventAuditBundleSummary(
  bundle: HostEventAuditBundleResponse
): HostEventAuditBundleCliSummary {
  return {
    bundleHash: bundle.bundleHash,
    checkedEventCount:
      bundle.signedIntegrityReport.integrity.checkedEventCount,
    eventCount: bundle.eventCount,
    eventsJsonlSha256: bundle.eventsJsonlSha256,
    generatedAt: bundle.generatedAt,
    hostAuthorityPubkey: bundle.signedIntegrityReport.hostAuthorityPubkey,
    integrityReportHash: bundle.signedIntegrityReport.reportHash,
    integrityStatus: bundle.signedIntegrityReport.integrity.status
  };
}

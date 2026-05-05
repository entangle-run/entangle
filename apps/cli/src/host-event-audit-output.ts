import { createHash } from "node:crypto";
import type { HostEventAuditBundleResponse } from "@entangle/types";
import { hostEventAuditBundleResponseSchema } from "@entangle/types";
import { getEventHash, verifyEvent, type NostrEvent } from "nostr-tools";

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

type HashVerification = {
  actual: string;
  expected: string;
  matches: boolean;
};

type CountVerification = {
  actual: number;
  expected: number;
  matches: boolean;
};

type SignatureVerification = {
  actualEventId: string | undefined;
  actualSignerPubkey: string;
  eventIdMatches: boolean;
  expectedEventId: string;
  expectedSignerPubkey: string;
  matches: boolean;
  signatureValid: boolean;
  signerMatches: boolean;
};

export type HostEventAuditBundleVerification =
  | {
      issues: string[];
      schemaValid: false;
      status: "failed";
    }
  | {
      bundleHash: HashVerification;
      eventCount: CountVerification;
      eventsJsonlSha256: HashVerification;
      integrityReportHash: HashVerification;
      integrityReportSignature: SignatureVerification;
      integrityStatus: HostEventAuditBundleResponse["signedIntegrityReport"]["integrity"]["status"];
      issues: string[];
      schemaValid: true;
      signedContentMatchesReport: boolean;
      status: "failed" | "verified";
    };

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

function canonicalizeForHash(input: unknown): unknown {
  if (Array.isArray(input)) {
    return input.map(canonicalizeForHash);
  }

  if (input && typeof input === "object") {
    return Object.fromEntries(
      Object.entries(input)
        .filter(([, value]) => value !== undefined)
        .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
        .map(([key, value]) => [key, canonicalizeForHash(value)])
    );
  }

  return input;
}

function sha256Hex(content: string): string {
  return createHash("sha256").update(content, "utf8").digest("hex");
}

function serializeHostEventsAsCanonicalJsonl(
  events: HostEventAuditBundleResponse["events"]
): string {
  if (events.length === 0) {
    return "";
  }

  return `${events
    .map((event) => JSON.stringify(canonicalizeForHash(event)))
    .join("\n")}\n`;
}

function buildHashVerification(input: {
  actual: string;
  expected: string;
}): HashVerification {
  return {
    actual: input.actual,
    expected: input.expected,
    matches: input.actual === input.expected
  };
}

function verifySignedIntegrityReportSignature(
  signedReport: HostEventAuditBundleResponse["signedIntegrityReport"]
): SignatureVerification {
  const signedEvent = signedReport.signedEvent;
  const event: NostrEvent = {
    content: signedReport.signedContent,
    created_at: signedEvent.createdAtUnix,
    id: signedEvent.eventId,
    kind: signedEvent.kind,
    pubkey: signedEvent.signerPubkey,
    sig: signedEvent.signature,
    tags: signedEvent.tags
  };
  let actualEventId: string | undefined;
  let signatureValid: boolean;

  try {
    actualEventId = getEventHash(event);
    signatureValid = verifyEvent(event);
  } catch {
    actualEventId = undefined;
    signatureValid = false;
  }

  const signerMatches =
    signedEvent.signerPubkey === signedReport.hostAuthorityPubkey;
  const eventIdMatches = actualEventId === signedEvent.eventId;

  return {
    actualEventId,
    actualSignerPubkey: signedEvent.signerPubkey,
    eventIdMatches,
    expectedEventId: signedEvent.eventId,
    expectedSignerPubkey: signedReport.hostAuthorityPubkey,
    matches: signerMatches && eventIdMatches && signatureValid,
    signatureValid,
    signerMatches
  };
}

export function verifyHostEventAuditBundle(
  rawBundle: unknown
): HostEventAuditBundleVerification {
  const parseResult = hostEventAuditBundleResponseSchema.safeParse(rawBundle);

  if (!parseResult.success) {
    return {
      issues: parseResult.error.issues.map((issue) => issue.message),
      schemaValid: false,
      status: "failed"
    };
  }

  const bundle = parseResult.data;
  const signedReport = bundle.signedIntegrityReport;
  const eventsJsonl = serializeHostEventsAsCanonicalJsonl(bundle.events);
  const signedReportPayload = {
    generatedAt: signedReport.generatedAt,
    hostAuthorityPubkey: signedReport.hostAuthorityPubkey,
    integrity: signedReport.integrity,
    reportKind: signedReport.reportKind,
    schemaVersion: signedReport.schemaVersion
  };
  const canonicalSignedContent = JSON.stringify(
    canonicalizeForHash(signedReportPayload)
  );
  const bundlePayload = {
    bundleKind: bundle.bundleKind,
    eventCount: bundle.eventCount,
    events: bundle.events,
    eventsJsonlSha256: bundle.eventsJsonlSha256,
    generatedAt: bundle.generatedAt,
    schemaVersion: bundle.schemaVersion,
    signedIntegrityReport: bundle.signedIntegrityReport
  };
  const verification = {
    bundleHash: buildHashVerification({
      actual: sha256Hex(JSON.stringify(canonicalizeForHash(bundlePayload))),
      expected: bundle.bundleHash
    }),
    eventCount: {
      actual: bundle.events.length,
      expected: bundle.eventCount,
      matches: bundle.events.length === bundle.eventCount
    },
    eventsJsonlSha256: buildHashVerification({
      actual: sha256Hex(eventsJsonl),
      expected: bundle.eventsJsonlSha256
    }),
    integrityReportHash: buildHashVerification({
      actual: sha256Hex(signedReport.signedContent),
      expected: signedReport.reportHash
    }),
    integrityReportSignature:
      verifySignedIntegrityReportSignature(signedReport),
    integrityStatus: signedReport.integrity.status,
    signedContentMatchesReport:
      signedReport.signedContent === canonicalSignedContent
  };
  const issues = [
    verification.eventCount.matches
      ? undefined
      : "Bundle eventCount does not match the number of embedded events.",
    verification.eventsJsonlSha256.matches
      ? undefined
      : "Bundle eventsJsonlSha256 does not match the embedded events.",
    verification.integrityReportHash.matches
      ? undefined
      : "Signed integrity report hash does not match signedContent.",
    verification.signedContentMatchesReport
      ? undefined
      : "Signed integrity report content does not match reported integrity fields.",
    verification.integrityReportSignature.matches
      ? undefined
      : "Signed integrity report Nostr event is not valid for the Host Authority.",
    verification.bundleHash.matches
      ? undefined
      : "Bundle hash does not match the canonical bundle payload."
  ].filter((issue): issue is string => Boolean(issue));

  return {
    ...verification,
    issues,
    schemaValid: true,
    status: issues.length === 0 ? "verified" : "failed"
  };
}

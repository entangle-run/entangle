import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import type {
  HostEventAuditBundleResponse,
  HostEventRecord
} from "@entangle/types";
import {
  projectHostEventAuditBundleSummary,
  verifyHostEventAuditBundle
} from "./host-event-audit-output.js";

describe("host event audit output helpers", () => {
  function canonicalizeForHashForTest(input: unknown): unknown {
    if (Array.isArray(input)) {
      return input.map(canonicalizeForHashForTest);
    }

    if (input && typeof input === "object") {
      return Object.fromEntries(
        Object.entries(input)
          .filter(([, value]) => value !== undefined)
          .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
          .map(([key, value]) => [key, canonicalizeForHashForTest(value)])
      );
    }

    return input;
  }

  function sha256HexForTest(content: string): string {
    return createHash("sha256").update(content, "utf8").digest("hex");
  }

  function serializeEventsForTest(events: HostEventRecord[]): string {
    return `${events
      .map((event) => JSON.stringify(canonicalizeForHashForTest(event)))
      .join("\n")}\n`;
  }

  function buildBundle(): HostEventAuditBundleResponse {
    const events: HostEventRecord[] = [
      {
        catalogId: "catalog-main",
        category: "control_plane",
        eventId: "event-alpha",
        message: "Catalog updated.",
        schemaVersion: "1",
        timestamp: "2026-05-05T00:00:00.000Z",
        type: "catalog.updated",
        updateKind: "apply"
      },
      {
        category: "control_plane",
        eventId: "event-beta",
        message: "Package source admitted.",
        packageSourceId: "package-source-alpha",
        schemaVersion: "1",
        timestamp: "2026-05-05T00:00:01.000Z",
        type: "package_source.admitted"
      }
    ];
    const signedReportPayload = {
      generatedAt: "2026-05-05T00:00:02.000Z",
      hostAuthorityPubkey: "a".repeat(64),
      integrity: {
        checkedEventCount: 2,
        genesisHash: "b".repeat(64),
        lastAuditRecordHash: "c".repeat(64),
        schemaVersion: "1",
        status: "valid",
        unverifiableEventCount: 0
      },
      reportKind: "host_event_integrity",
      schemaVersion: "1"
    };
    const signedContent = JSON.stringify(
      canonicalizeForHashForTest(signedReportPayload)
    );
    const signedIntegrityReport = {
      ...signedReportPayload,
      reportHash: sha256HexForTest(signedContent),
      signedContent,
      signedEvent: {
        createdAt: "2026-05-05T00:00:02.000Z",
        createdAtUnix: 1777939202,
        eventId: "1".repeat(64),
        kind: 30078,
        signature: "2".repeat(128),
        signerPubkey: "a".repeat(64),
        tags: [["report", "host_event_integrity"]]
      }
    } satisfies HostEventAuditBundleResponse["signedIntegrityReport"];
    const bundlePayload = {
      bundleKind: "host_event_audit_bundle",
      eventCount: events.length,
      events,
      eventsJsonlSha256: sha256HexForTest(serializeEventsForTest(events)),
      generatedAt: "2026-05-05T00:00:02.000Z",
      schemaVersion: "1",
      signedIntegrityReport
    } satisfies Omit<HostEventAuditBundleResponse, "bundleHash">;

    return {
      ...bundlePayload,
      bundleHash: sha256HexForTest(
        JSON.stringify(canonicalizeForHashForTest(bundlePayload))
      )
    };
  }

  it("projects a compact audit-bundle summary without copying event payloads", () => {
    const bundle = buildBundle();

    expect(projectHostEventAuditBundleSummary(bundle)).toEqual({
      bundleHash: bundle.bundleHash,
      checkedEventCount: 2,
      eventCount: 2,
      eventsJsonlSha256: bundle.eventsJsonlSha256,
      generatedAt: "2026-05-05T00:00:02.000Z",
      hostAuthorityPubkey: "a".repeat(64),
      integrityReportHash: bundle.signedIntegrityReport.reportHash,
      integrityStatus: "valid"
    });
  });

  it("verifies a saved audit-bundle hash envelope", () => {
    const verification = verifyHostEventAuditBundle(buildBundle());

    expect(verification).toMatchObject({
      bundleHash: {
        matches: true
      },
      eventCount: {
        matches: true
      },
      eventsJsonlSha256: {
        matches: true
      },
      integrityReportHash: {
        matches: true
      },
      schemaValid: true,
      signedContentMatchesReport: true,
      status: "verified"
    });
  });

  it("reports tampered audit-bundle hash evidence", () => {
    const bundle = buildBundle();
    const verification = verifyHostEventAuditBundle({
      ...bundle,
      events: [
        ...bundle.events,
        {
          catalogId: "catalog-main",
          category: "control_plane",
          eventId: "event-gamma",
          message: "Tampered event.",
          schemaVersion: "1",
          timestamp: "2026-05-05T00:00:03.000Z",
          type: "catalog.updated",
          updateKind: "apply"
        }
      ]
    });

    expect(verification).toMatchObject({
      bundleHash: {
        matches: false
      },
      eventCount: {
        matches: false
      },
      eventsJsonlSha256: {
        matches: false
      },
      schemaValid: true,
      status: "failed"
    });
    expect(verification.issues).toContain(
      "Bundle eventCount does not match the number of embedded events."
    );
  });

  it("reports invalid audit-bundle schema", () => {
    expect(verifyHostEventAuditBundle({ product: "wrong" })).toMatchObject({
      schemaValid: false,
      status: "failed"
    });
  });
});

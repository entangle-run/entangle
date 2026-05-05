import { describe, expect, it } from "vitest";
import type { HostEventAuditBundleResponse } from "@entangle/types";
import { projectHostEventAuditBundleSummary } from "./host-event-audit-output.js";

describe("host event audit output helpers", () => {
  it("projects a compact audit-bundle summary without copying event payloads", () => {
    const bundle: HostEventAuditBundleResponse = {
      bundleHash: "f".repeat(64),
      bundleKind: "host_event_audit_bundle",
      eventCount: 2,
      events: [
        {
          category: "host",
          eventId: "event-alpha",
          message: "Host event alpha.",
          schemaVersion: "1",
          timestamp: "2026-05-05T00:00:00.000Z",
          type: "host.alpha"
        },
        {
          category: "runner",
          eventId: "event-beta",
          message: "Runner event beta.",
          nodeId: "worker-it",
          schemaVersion: "1",
          timestamp: "2026-05-05T00:00:01.000Z",
          type: "runner.beta"
        }
      ],
      eventsJsonlSha256: "e".repeat(64),
      generatedAt: "2026-05-05T00:00:02.000Z",
      schemaVersion: "1",
      signedIntegrityReport: {
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
        reportHash: "d".repeat(64),
        reportKind: "host_event_integrity",
        schemaVersion: "1",
        signedContent: "{\"reportKind\":\"host_event_integrity\"}",
        signedEvent: {
          createdAt: "2026-05-05T00:00:02.000Z",
          createdAtUnix: 1777939202,
          eventId: "1".repeat(64),
          kind: 30078,
          signature: "2".repeat(128),
          signerPubkey: "a".repeat(64),
          tags: [["report", "host_event_integrity"]]
        }
      }
    };

    expect(projectHostEventAuditBundleSummary(bundle)).toEqual({
      bundleHash: "f".repeat(64),
      checkedEventCount: 2,
      eventCount: 2,
      eventsJsonlSha256: "e".repeat(64),
      generatedAt: "2026-05-05T00:00:02.000Z",
      hostAuthorityPubkey: "a".repeat(64),
      integrityReportHash: "d".repeat(64),
      integrityStatus: "valid"
    });
  });
});

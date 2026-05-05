import { describe, expect, it } from "vitest";
import { formatHostEventIntegritySummary } from "./host-event-integrity.js";

describe("host event integrity presentation", () => {
  it("formats valid, unverifiable, and broken event integrity states", () => {
    expect(
      formatHostEventIntegritySummary({
        checkedEventCount: 4,
        genesisHash:
          "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        lastAuditRecordHash:
          "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        lastEventId: "evt-4",
        schemaVersion: "1",
        status: "valid",
        unverifiableEventCount: 0
      })
    ).toBe("valid chain - 4 events");

    expect(
      formatHostEventIntegritySummary({
        checkedEventCount: 4,
        firstUnverifiableEvent: {
          eventId: "evt-1",
          eventType: "catalog.updated",
          reason: "missing_audit_hash",
          timestamp: "2026-05-05T00:00:00.000Z"
        },
        genesisHash:
          "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        schemaVersion: "1",
        status: "unverifiable",
        unverifiableEventCount: 1
      })
    ).toBe("partially unverifiable - 1 of 4 events");

    expect(
      formatHostEventIntegritySummary({
        checkedEventCount: 4,
        firstBrokenEvent: {
          actualHash:
            "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
          eventId: "evt-3",
          eventType: "host.operator_request.completed",
          expectedHash:
            "dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
          reason: "record_hash_mismatch",
          timestamp: "2026-05-05T00:00:00.000Z"
        },
        genesisHash:
          "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        schemaVersion: "1",
        status: "broken",
        unverifiableEventCount: 0
      })
    ).toBe("broken chain - record_hash_mismatch - 4 events");
  });
});

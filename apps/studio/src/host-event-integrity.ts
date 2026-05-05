import type { HostEventIntegrityResponse } from "@entangle/types";

export function formatHostEventIntegritySummary(
  integrity: HostEventIntegrityResponse
): string {
  const count = `${integrity.checkedEventCount} events`;

  if (integrity.status === "valid") {
    return `valid chain - ${count}`;
  }

  if (integrity.status === "unverifiable") {
    return `partially unverifiable - ${integrity.unverifiableEventCount} of ${count}`;
  }

  const brokenReason = integrity.firstBrokenEvent?.reason ?? "unknown break";
  return `broken chain - ${brokenReason} - ${count}`;
}

import type { RunnerRegistryEntry } from "@entangle/types";

export type RunnerRegistryCliSummary = {
  assignmentIds: string[];
  lastSeenAt: string | undefined;
  liveness: string;
  operationalState: string;
  publicKey: string;
  runnerId: string;
  trustState: string;
};

export function sortRunnerRegistryEntriesForPresentation(
  runners: RunnerRegistryEntry[]
): RunnerRegistryEntry[] {
  return [...runners].sort((left, right) =>
    left.registration.runnerId.localeCompare(right.registration.runnerId)
  );
}

export function projectRunnerRegistrySummary(
  runner: RunnerRegistryEntry
): RunnerRegistryCliSummary {
  return {
    assignmentIds: runner.heartbeat?.assignmentIds ?? [],
    lastSeenAt:
      runner.heartbeat?.lastHeartbeatAt ?? runner.registration.lastSeenAt,
    liveness: runner.liveness,
    operationalState: runner.heartbeat?.operationalState ?? "unknown",
    publicKey: runner.registration.publicKey,
    runnerId: runner.registration.runnerId,
    trustState: runner.registration.trustState
  };
}

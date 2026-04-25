import type {
  SessionInspectionResponse,
  SessionLaunchResponse
} from "@entangle/types";
import {
  type HostSessionInspectionCliSummaryRecord,
  projectHostSessionInspectionSummary
} from "./runtime-session-output.js";

export type HostSessionWaitOutcome =
  | "cancelled"
  | "completed"
  | "failed"
  | "observing"
  | "session_timed_out"
  | "waiting_approval";

export interface HostSessionWaitCliSummary {
  elapsedMs: number;
  outcome: HostSessionWaitOutcome;
  pollCount: number;
  session?: HostSessionInspectionCliSummaryRecord;
  timedOut: boolean;
}

export interface HostSessionLaunchCliSummary {
  launch: SessionLaunchResponse & {
    nextCommands: string[];
  };
  wait?: HostSessionWaitCliSummary;
}

const failingWaitOutcomes = new Set<HostSessionWaitOutcome>([
  "cancelled",
  "failed",
  "session_timed_out"
]);

export function buildSessionLaunchNextCommands(
  launch: SessionLaunchResponse
): string[] {
  return [
    `entangle host sessions get ${launch.sessionId} --summary`,
    `entangle host runtimes turns ${launch.targetNodeId} --summary`,
    `entangle host runtimes artifacts ${launch.targetNodeId} --session-id ${launch.sessionId} --summary`
  ];
}

export function resolveHostSessionWaitOutcome(
  inspection: SessionInspectionResponse
): HostSessionWaitOutcome {
  const statuses = inspection.nodes.map((entry) => entry.session.status);

  if (statuses.includes("failed")) {
    return "failed";
  }

  if (statuses.includes("cancelled")) {
    return "cancelled";
  }

  if (statuses.includes("timed_out")) {
    return "session_timed_out";
  }

  if (statuses.includes("waiting_approval")) {
    return "waiting_approval";
  }

  if (statuses.length > 0 && statuses.every((status) => status === "completed")) {
    return "completed";
  }

  return "observing";
}

export function projectHostSessionWaitSummary(input: {
  elapsedMs: number;
  inspection?: SessionInspectionResponse;
  outcome: HostSessionWaitOutcome;
  pollCount: number;
  timedOut: boolean;
}): HostSessionWaitCliSummary {
  return {
    elapsedMs: input.elapsedMs,
    outcome: input.outcome,
    pollCount: input.pollCount,
    ...(input.inspection
      ? { session: projectHostSessionInspectionSummary(input.inspection) }
      : {}),
    timedOut: input.timedOut
  };
}

export function projectHostSessionLaunchSummary(input: {
  launch: SessionLaunchResponse;
  wait?: HostSessionWaitCliSummary;
}): HostSessionLaunchCliSummary {
  return {
    launch: {
      ...input.launch,
      nextCommands: buildSessionLaunchNextCommands(input.launch)
    },
    ...(input.wait ? { wait: input.wait } : {})
  };
}

export function shouldHostSessionWaitExitNonZero(
  wait: HostSessionWaitCliSummary
): boolean {
  return wait.timedOut || failingWaitOutcomes.has(wait.outcome);
}

import { describe, expect, it } from "vitest";
import type { HostSessionSummary } from "@entangle/types";
import {
  filterRuntimeSessions,
  formatRuntimeSessionDetail,
  formatRuntimeSessionLabel
} from "./runtime-session-inspection.js";

function createSession(
  sessionId: string,
  updatedAt: string,
  nodeStatus: HostSessionSummary["nodeStatuses"]
): HostSessionSummary {
  return {
    graphId: "team-alpha",
    nodeIds: nodeStatus.map((entry) => entry.nodeId),
    nodeStatuses: nodeStatus,
    sessionId,
    traceIds: [`trace-${sessionId}`],
    updatedAt
  };
}

describe("studio runtime session inspection helpers", () => {
  it("filters sessions for one runtime and sorts them by recency", () => {
    const sessions = [
      createSession("session-older", "2026-04-24T10:00:00.000Z", [
        { nodeId: "worker-it", status: "active" }
      ]),
      createSession("session-newer", "2026-04-24T11:00:00.000Z", [
        { nodeId: "worker-it", status: "synthesizing" }
      ]),
      createSession("session-foreign", "2026-04-24T12:00:00.000Z", [
        { nodeId: "worker-marketing", status: "active" }
      ])
    ];

    expect(filterRuntimeSessions(sessions, "worker-it").map((session) => session.sessionId)).toEqual([
      "session-newer",
      "session-older"
    ]);
  });

  it("formats session labels and detail summaries", () => {
    const session = createSession("session-alpha", "2026-04-24T11:00:00.000Z", [
      { nodeId: "worker-it", status: "active" },
      { nodeId: "lead-it", status: "planning" }
    ]);

    expect(formatRuntimeSessionLabel(session, "worker-it")).toBe(
      "session-alpha · active"
    );
    expect(formatRuntimeSessionDetail(session)).toContain("lead-it:planning");
    expect(formatRuntimeSessionDetail(session)).toContain("trace-session-alpha");
  });
});

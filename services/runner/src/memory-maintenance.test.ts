import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { buildAgentEngineTurnRequest, loadRuntimeContext } from "./runtime-context.js";
import { performPostTurnMemoryUpdate } from "./memory-maintenance.js";
import {
  buildInboundTaskRequest,
  cleanupRuntimeFixtures,
  createRuntimeFixture
} from "./test-fixtures.js";

afterEach(async () => {
  await cleanupRuntimeFixtures();
});

describe("post-turn memory maintenance", () => {
  it("writes deterministic task memory pages and exposes them to future turn assembly", async () => {
    const fixture = await createRuntimeFixture();
    const context = await loadRuntimeContext(fixture.contextPath);
    const envelope = buildInboundTaskRequest();

    const memoryUpdate = await performPostTurnMemoryUpdate({
      consumedArtifactIds: ["input-report"],
      context,
      envelope,
      producedArtifactIds: ["report-turn-001"],
      result: {
        assistantMessages: ["Reviewed the parser patch and found no blockers."],
        providerStopReason: "end_turn",
        stopReason: "completed",
        toolExecutions: [
          {
            outcome: "success",
            sequence: 1,
            toolCallId: "toolu_session",
            toolId: "inspect_session_state"
          },
          {
            outcome: "success",
            sequence: 2,
            toolCallId: "toolu_artifact",
            toolId: "inspect_artifact_input"
          }
        ],
        toolRequests: [],
        usage: {
          inputTokens: 10,
          outputTokens: 5
        }
      },
      turnRecord: {
        graphId: context.binding.graphId,
        nodeId: context.binding.node.nodeId,
        phase: "persisting",
        sourceChangeCandidateIds: ["source-change-parser"],
        sourceChangeSummary: {
          additions: 3,
          checkedAt: "2026-04-26T12:00:00.000Z",
          deletions: 1,
          diffExcerpt: "diff --git a/src/parser.ts b/src/parser.ts\n+next\n-old\n",
          fileCount: 1,
          filePreviews: [],
          files: [
            {
              additions: 3,
              deletions: 1,
              path: "src/parser.ts",
              status: "modified"
            }
          ],
          status: "changed",
          truncated: false
        },
        startedAt: "2026-04-26T12:00:00.000Z",
        triggerKind: "message",
        turnId: "turn-memory-001",
        updatedAt: "2026-04-26T12:01:00.000Z"
      },
      turnId: "turn-memory-001"
    });

    const [taskPage, logPage, indexPage, summaryPage, turnRequest] =
      await Promise.all([
        readFile(memoryUpdate.taskPagePath, "utf8"),
        readFile(memoryUpdate.logPath, "utf8"),
        readFile(memoryUpdate.indexPath, "utf8"),
        readFile(memoryUpdate.summaryPagePath, "utf8"),
        buildAgentEngineTurnRequest(context)
      ]);

    expect(taskPage).toContain("# Task Memory session-alpha / turn-memory-001");
    expect(taskPage).toContain("Reviewed the parser patch and found no blockers.");
    expect(taskPage).toContain("`input-report`");
    expect(taskPage).toContain("`report-turn-001`");
    expect(taskPage).toContain("- Provider stop reason: `end_turn`");
    expect(taskPage).toContain("- Token usage: input=10 output=5");
    expect(taskPage).toContain("- Tool executions:");
    expect(taskPage).toContain("#1 inspect_session_state [success]");
    expect(taskPage).toContain("#2 inspect_artifact_input [success]");
    expect(taskPage).toContain("## Source Changes");
    expect(taskPage).toContain("- Candidate ids: `source-change-parser`");
    expect(taskPage).toContain("- Source changes: `changed`");
    expect(taskPage).toContain("- Totals: files=1 additions=3 deletions=1");
    expect(taskPage).toContain("- Diff excerpt: available");
    expect(taskPage).toContain("- modified `src/parser.ts` +3 -1");
    expect(summaryPage).toContain("Source-change memory:");
    expect(summaryPage).toContain("- Candidate ids: `source-change-parser`");
    expect(summaryPage).toContain("- Totals: files=1 additions=3 deletions=1");
    expect(summaryPage).toContain("- modified `src/parser.ts` +3 -1");
    expect(logPage).toContain("runner turn | session-alpha / turn-memory-001");
    expect(indexPage).toContain(
      "[session-alpha / turn-memory-001](tasks/session-alpha/turn-memory-001.md)"
    );
    expect(indexPage).toContain("[Recent Work Summary](summaries/recent-work.md)");
    expect(turnRequest.memoryRefs).toEqual(
      expect.arrayContaining([
        path.join(context.workspace.memoryRoot, "wiki", "log.md"),
        memoryUpdate.summaryPagePath,
        memoryUpdate.taskPagePath
      ])
    );
  });

  it("keeps task-page links inside the Task Pages section when the wiki index already has later sections", async () => {
    const fixture = await createRuntimeFixture();
    const context = await loadRuntimeContext(fixture.contextPath);
    const envelope = buildInboundTaskRequest();
    const indexPath = path.join(context.workspace.memoryRoot, "wiki", "index.md");

    await writeFile(
      indexPath,
      [
        "# Wiki Index",
        "",
        "## Task Pages",
        "",
        "- [Existing Task](tasks/session-alpha/existing.md)",
        "",
        "## Concepts",
        "",
        "- [Relay Topology](concepts/relay-topology.md)",
        ""
      ].join("\n"),
      "utf8"
    );

    const memoryUpdate = await performPostTurnMemoryUpdate({
      consumedArtifactIds: [],
      context,
      envelope,
      producedArtifactIds: ["report-turn-002"],
      result: {
        assistantMessages: ["Summarized the task without blockers."],
        stopReason: "completed",
        toolExecutions: [],
        toolRequests: [],
        usage: {
          inputTokens: 8,
          outputTokens: 4
        }
      },
      turnId: "turn-memory-002"
    });

    const indexPage = await readFile(memoryUpdate.indexPath, "utf8");
    const taskSection = indexPage.match(/## Task Pages[\s\S]*?(?=\n## |$)/);

    expect(taskSection?.[0]).toContain(
      "[session-alpha / turn-memory-002](tasks/session-alpha/turn-memory-002.md)"
    );
    expect(taskSection?.[0]).not.toContain("## Concepts");
    expect(indexPage).toMatch(
      /- \[session-alpha \/ turn-memory-002\]\(tasks\/session-alpha\/turn-memory-002\.md\)\n\n## Concepts/
    );
  });

  it("rebuilds a recent-work summary page from the freshest task pages", async () => {
    const fixture = await createRuntimeFixture();
    const context = await loadRuntimeContext(fixture.contextPath);
    const firstEnvelope = buildInboundTaskRequest();
    const secondEnvelope = buildInboundTaskRequest({
      summary: "Summarize the recovery follow-up plan."
    });

    await performPostTurnMemoryUpdate({
      consumedArtifactIds: [],
      context,
      envelope: firstEnvelope,
      producedArtifactIds: ["report-turn-003"],
      result: {
        assistantMessages: ["Completed the first review pass and noted one follow-up."],
        stopReason: "completed",
        toolExecutions: [],
        toolRequests: [],
        usage: {
          inputTokens: 8,
          outputTokens: 4
        }
      },
      turnId: "turn-memory-003"
    });
    const secondUpdate = await performPostTurnMemoryUpdate({
      consumedArtifactIds: [],
      context,
      envelope: secondEnvelope,
      producedArtifactIds: ["report-turn-004"],
      result: {
        assistantMessages: ["Drafted the recovery plan and captured the next action."],
        providerStopReason: "end_turn",
        stopReason: "completed",
        toolExecutions: [
          {
            outcome: "success",
            sequence: 1,
            toolCallId: "toolu_session",
            toolId: "inspect_session_state"
          }
        ],
        toolRequests: [],
        usage: {
          inputTokens: 9,
          outputTokens: 5
        }
      },
      turnId: "turn-memory-004"
    });

    const summaryPage = await readFile(secondUpdate.summaryPagePath, "utf8");

    expect(summaryPage).toContain("# Recent Work Summary");
    expect(summaryPage).toContain("### session-alpha / turn-memory-004");
    expect(summaryPage).toContain("### session-alpha / turn-memory-003");
    expect(summaryPage).toContain("Drafted the recovery plan and captured the next action.");
    expect(summaryPage).toContain("Completed the first review pass and noted one follow-up.");
    expect(summaryPage).toContain("- Provider stop reason: `end_turn`");
    expect(summaryPage).toContain("- Token usage: input=9 output=5");
    expect(summaryPage).toContain("- Tool executions: 1");
    expect(summaryPage.indexOf("turn-memory-004")).toBeLessThan(
      summaryPage.indexOf("turn-memory-003")
    );
  });
});

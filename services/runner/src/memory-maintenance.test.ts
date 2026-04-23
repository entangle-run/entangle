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
        stopReason: "completed",
        toolRequests: [],
        usage: {
          inputTokens: 10,
          outputTokens: 5
        }
      },
      turnId: "turn-memory-001"
    });

    const [taskPage, logPage, indexPage, turnRequest] = await Promise.all([
      readFile(memoryUpdate.taskPagePath, "utf8"),
      readFile(memoryUpdate.logPath, "utf8"),
      readFile(memoryUpdate.indexPath, "utf8"),
      buildAgentEngineTurnRequest(context)
    ]);

    expect(taskPage).toContain("# Task Memory session-alpha / turn-memory-001");
    expect(taskPage).toContain("Reviewed the parser patch and found no blockers.");
    expect(taskPage).toContain("`input-report`");
    expect(taskPage).toContain("`report-turn-001`");
    expect(logPage).toContain("runner turn | session-alpha / turn-memory-001");
    expect(indexPage).toContain(
      "[session-alpha / turn-memory-001](tasks/session-alpha/turn-memory-001.md)"
    );
    expect(turnRequest.memoryRefs).toEqual(
      expect.arrayContaining([
        path.join(context.workspace.memoryRoot, "wiki", "log.md"),
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
});

import { describe, expect, it } from "vitest";
import type {
  RuntimeMemoryInspectionResponse,
  RuntimeMemoryPageInspectionResponse,
  RuntimeMemoryPageSummary
} from "@entangle/types";
import {
  projectRuntimeMemoryPagePreviewSummary,
  projectRuntimeMemorySummary,
  sortRuntimeMemoryPagesForCli
} from "./runtime-memory-command.js";

function page(
  path: string,
  kind: RuntimeMemoryPageSummary["kind"],
  updatedAt: string
): RuntimeMemoryPageSummary {
  return {
    kind,
    path,
    sizeBytes: 42,
    updatedAt
  };
}

describe("runtime memory CLI projection", () => {
  it("projects runtime memory inspection into focused summary records", () => {
    const workingContext = page(
      "wiki/summaries/working-context.md",
      "summary",
      "2026-04-25T12:00:00.000Z"
    );
    const task = page(
      "wiki/tasks/session-alpha/turn-001.md",
      "task",
      "2026-04-25T11:00:00.000Z"
    );
    const response: RuntimeMemoryInspectionResponse = {
      focusedRegisters: [workingContext],
      memoryRoot: "/tmp/entangle-runner/memory",
      nodeId: "worker-it",
      pages: [task, workingContext],
      taskPages: [task]
    };

    expect(projectRuntimeMemorySummary(response)).toMatchObject({
      focusedRegisters: [
        {
          kind: "summary",
          path: "wiki/summaries/working-context.md"
        }
      ],
      nodeId: "worker-it",
      pageCount: 2,
      taskPageCount: 1
    });
  });

  it("projects memory page previews without full content in summary mode", () => {
    const response: RuntimeMemoryPageInspectionResponse = {
      nodeId: "worker-it",
      page: page(
        "wiki/summaries/working-context.md",
        "summary",
        "2026-04-25T12:00:00.000Z"
      ),
      preview: {
        available: true,
        bytesRead: 27,
        content: "# Working Context Summary",
        contentEncoding: "utf8",
        contentType: "text/markdown",
        sourcePath:
          "/tmp/entangle-runner/memory/wiki/summaries/working-context.md",
        truncated: false
      }
    };

    expect(projectRuntimeMemoryPagePreviewSummary(response)).toMatchObject({
      page: {
        path: "wiki/summaries/working-context.md"
      },
      preview: {
        available: true,
        bytesRead: 27,
        contentType: "text/markdown",
        truncated: false
      }
    });
  });

  it("sorts task pages by freshness after focused summaries", () => {
    expect(
      sortRuntimeMemoryPagesForCli([
        page(
          "wiki/tasks/session-alpha/turn-001.md",
          "task",
          "2026-04-25T11:00:00.000Z"
        ),
        page(
          "wiki/tasks/session-alpha/turn-002.md",
          "task",
          "2026-04-25T12:00:00.000Z"
        ),
        page(
          "wiki/summaries/working-context.md",
          "summary",
          "2026-04-25T10:00:00.000Z"
        )
      ]).map((entry) => entry.path)
    ).toEqual([
      "wiki/summaries/working-context.md",
      "wiki/tasks/session-alpha/turn-002.md",
      "wiki/tasks/session-alpha/turn-001.md"
    ]);
  });
});

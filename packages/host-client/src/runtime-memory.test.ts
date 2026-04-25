import { describe, expect, it } from "vitest";
import type { RuntimeMemoryPageSummary } from "@entangle/types";
import {
  formatRuntimeMemoryPageDetail,
  formatRuntimeMemoryPageLabel,
  sortRuntimeMemoryPagesForPresentation
} from "./runtime-memory.js";

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

describe("runtime memory presentation", () => {
  it("orders focused summary pages before task pages and supporting wiki files", () => {
    const pages = [
      page("wiki/index.md", "wiki_index", "2026-04-25T09:00:00.000Z"),
      page(
        "wiki/tasks/session-alpha/turn-001.md",
        "task",
        "2026-04-25T10:00:00.000Z"
      ),
      page(
        "wiki/summaries/working-context.md",
        "summary",
        "2026-04-25T11:00:00.000Z"
      ),
      page(
        "wiki/tasks/session-alpha/turn-002.md",
        "task",
        "2026-04-25T12:00:00.000Z"
      )
    ];

    expect(sortRuntimeMemoryPagesForPresentation(pages).map((entry) => entry.path)).toEqual([
      "wiki/summaries/working-context.md",
      "wiki/tasks/session-alpha/turn-002.md",
      "wiki/tasks/session-alpha/turn-001.md",
      "wiki/index.md"
    ]);
  });

  it("formats memory page labels and details for operator surfaces", () => {
    const summary = page(
      "wiki/summaries/working-context.md",
      "summary",
      "2026-04-25T11:00:00.000Z"
    );

    expect(formatRuntimeMemoryPageLabel(summary)).toBe(
      "wiki/summaries/working-context.md · summary"
    );
    expect(formatRuntimeMemoryPageDetail(summary)).toBe(
      "42 bytes · updated 2026-04-25T11:00:00.000Z"
    );
  });
});

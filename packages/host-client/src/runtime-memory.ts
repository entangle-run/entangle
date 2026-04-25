import type { RuntimeMemoryPageKind, RuntimeMemoryPageSummary } from "@entangle/types";

const memoryPageKindOrder: Record<RuntimeMemoryPageKind, number> = {
  summary: 0,
  task: 1,
  wiki_log: 2,
  wiki_index: 3,
  wiki_page: 4,
  schema: 5
};

export function sortRuntimeMemoryPagesForPresentation(
  pages: RuntimeMemoryPageSummary[]
): RuntimeMemoryPageSummary[] {
  return [...pages].sort((left, right) => {
    const kindOrdering =
      memoryPageKindOrder[left.kind] - memoryPageKindOrder[right.kind];

    if (kindOrdering !== 0) {
      return kindOrdering;
    }

    if (left.kind === "task" && left.updatedAt !== right.updatedAt) {
      return right.updatedAt.localeCompare(left.updatedAt);
    }

    return left.path.localeCompare(right.path);
  });
}

export function formatRuntimeMemoryPageLabel(
  page: RuntimeMemoryPageSummary
): string {
  return `${page.path} · ${page.kind}`;
}

export function formatRuntimeMemoryPageDetail(
  page: RuntimeMemoryPageSummary
): string {
  return `${page.sizeBytes} bytes · updated ${page.updatedAt}`;
}

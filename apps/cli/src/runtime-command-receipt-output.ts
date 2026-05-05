import type { RuntimeCommandReceiptProjectionRecord } from "@entangle/types";

export type RuntimeCommandReceiptWikiConflictCliSummary = {
  commandId: string;
  currentSha256: string;
  currentShort: string;
  expectedSha256: string;
  expectedShort: string;
  path: string;
};

function shortHash(value: string): string {
  return value.slice(0, 12);
}

export function projectRuntimeCommandReceiptWikiConflictSummary(
  receipt: RuntimeCommandReceiptProjectionRecord
): RuntimeCommandReceiptWikiConflictCliSummary | undefined {
  if (
    receipt.commandEventType !== "runtime.wiki.upsert_page" ||
    receipt.receiptStatus !== "failed" ||
    !receipt.wikiPageExpectedSha256 ||
    !receipt.wikiPagePreviousSha256 ||
    receipt.wikiPageExpectedSha256 === receipt.wikiPagePreviousSha256
  ) {
    return undefined;
  }

  return {
    commandId: receipt.commandId,
    currentSha256: receipt.wikiPagePreviousSha256,
    currentShort: shortHash(receipt.wikiPagePreviousSha256),
    expectedSha256: receipt.wikiPageExpectedSha256,
    expectedShort: shortHash(receipt.wikiPageExpectedSha256),
    path: receipt.wikiPagePath ?? receipt.targetPath ?? "unknown"
  };
}

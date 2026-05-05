import { describe, expect, it } from "vitest";
import { parseRuntimeWikiUpsertPageBatchManifest } from "./runtime-wiki-command.js";

describe("runtime wiki CLI command helpers", () => {
  it("parses wiki page batch manifests and applies page defaults", () => {
    const manifest = parseRuntimeWikiUpsertPageBatchManifest(
      JSON.stringify({
        pages: [
          {
            content: "# Operator Note\n",
            path: "operator/notes.md",
            reason: "Replace operator notes.",
            requestedBy: "operator-main"
          },
          {
            content: "\nFollow-up note.\n",
            mode: "append",
            path: "operator/follow-up.md"
          }
        ]
      })
    );

    expect(manifest.pages.map((page) => page.mode)).toEqual([
      "replace",
      "append"
    ]);
  });

  it("rejects malformed wiki page batch manifest JSON", () => {
    expect(() => parseRuntimeWikiUpsertPageBatchManifest("{")).toThrow(
      "Runtime wiki batch manifest must be valid JSON"
    );
  });

  it("rejects empty wiki page batch manifests", () => {
    expect(() =>
      parseRuntimeWikiUpsertPageBatchManifest(JSON.stringify({ pages: [] }))
    ).toThrow();
  });
});

import { describe, expect, it } from "vitest";
import {
  parseRuntimeWikiPatchSetManifest,
  parseRuntimeWikiUpsertPageBatchManifest
} from "./runtime-wiki-command.js";

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

  it("parses wiki patch-set manifests and applies page defaults", () => {
    const manifest = parseRuntimeWikiPatchSetManifest(
      JSON.stringify({
        pages: [
          {
            content: "# Operator Note\n",
            path: "operator/notes.md"
          },
          {
            content: "\nFollow-up note.\n",
            mode: "append",
            path: "operator/follow-up.md"
          }
        ],
        reason: "Apply related wiki updates.",
        requestedBy: "operator-main"
      })
    );

    expect(manifest).toMatchObject({
      reason: "Apply related wiki updates.",
      requestedBy: "operator-main"
    });
    expect(manifest.pages.map((page) => page.mode)).toEqual([
      "replace",
      "append"
    ]);
  });

  it("rejects malformed wiki patch-set manifest JSON", () => {
    expect(() => parseRuntimeWikiPatchSetManifest("{")).toThrow(
      "Runtime wiki patch-set manifest must be valid JSON"
    );
  });
});

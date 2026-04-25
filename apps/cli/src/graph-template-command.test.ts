import { describe, expect, it } from "vitest";
import { getGraphTemplate, listGraphTemplates } from "./graph-template-command.js";

describe("graph template command helpers", () => {
  it("lists the canonical local preview graph template", () => {
    expect(listGraphTemplates()).toEqual([
      expect.objectContaining({
        graphPath: "examples/local-preview/graph.json",
        templateId: "local-preview"
      })
    ]);
  });

  it("resolves graph templates by id", () => {
    expect(getGraphTemplate("local-preview")?.description).toContain(
      "Local Preview"
    );
    expect(getGraphTemplate("missing-template")).toBeUndefined();
  });
});

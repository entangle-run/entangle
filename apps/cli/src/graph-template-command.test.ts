import { describe, expect, it } from "vitest";
import { getGraphTemplate, listGraphTemplates } from "./graph-template-command.js";

describe("graph template command helpers", () => {
  it("lists the canonical federated preview graph template", () => {
    expect(listGraphTemplates()).toEqual([
      expect.objectContaining({
        graphPath: "examples/federated-preview/graph.json",
        templateId: "federated-preview"
      })
    ]);
  });

  it("resolves graph templates by id", () => {
    expect(getGraphTemplate("federated-preview")?.description).toContain(
      "Federated Preview"
    );
    expect(getGraphTemplate("missing-template")).toBeUndefined();
  });
});

import { describe, expect, it } from "vitest";

import { buildCliMutationDryRun } from "./mutation-dry-run.js";

describe("buildCliMutationDryRun", () => {
  it("builds a deterministic dry-run payload with request and target metadata", () => {
    expect(
      buildCliMutationDryRun({
        mutation: "host.nodes.replace",
        request: {
          displayName: "Worker IT"
        },
        target: {
          nodeId: "worker-it"
        }
      })
    ).toEqual({
      dryRun: true,
      mutation: "host.nodes.replace",
      request: {
        displayName: "Worker IT"
      },
      target: {
        nodeId: "worker-it"
      }
    });
  });

  it("omits empty optional sections instead of inventing placeholder fields", () => {
    expect(
      buildCliMutationDryRun({
        mutation: "host.runtimes.restart",
        target: {}
      })
    ).toEqual({
      dryRun: true,
      mutation: "host.runtimes.restart"
    });
  });
});

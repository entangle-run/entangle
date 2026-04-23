import { afterEach, describe, expect, it } from "vitest";
import { loadRuntimeContext } from "./runtime-context.js";
import { cleanupRuntimeFixtures, createRuntimeFixture } from "./test-fixtures.js";
import { createBuiltinToolExecutor } from "./tool-executor.js";

afterEach(async () => {
  await cleanupRuntimeFixtures();
});

describe("runner builtin tool executor", () => {
  it("returns a structured preview for a declared inspect_artifact_input tool", async () => {
    const fixture = await createRuntimeFixture({
      toolCatalog: {
        schemaVersion: "1",
        tools: [
          {
            id: "inspect_artifact_input",
            description: "Inspect a retrieved inbound artifact by artifact id.",
            inputSchema: {
              type: "object",
              properties: {
                artifactId: {
                  type: "string"
                }
              },
              required: ["artifactId"]
            },
            execution: {
              kind: "builtin",
              builtinToolId: "inspect_artifact_input"
            }
          }
        ]
      }
    });
    const context = await loadRuntimeContext(fixture.contextPath);
    const executor = createBuiltinToolExecutor({
      context,
      toolCatalog: {
        schemaVersion: "1",
        tools: [
          {
            id: "inspect_artifact_input",
            description: "Inspect a retrieved inbound artifact by artifact id.",
            inputSchema: {
              type: "object",
              properties: {
                artifactId: {
                  type: "string"
                }
              },
              required: ["artifactId"]
            },
            execution: {
              kind: "builtin",
              builtinToolId: "inspect_artifact_input"
            }
          }
        ]
      }
    });

    const result = await executor.executeToolCall({
      artifactInputs: [
        {
          artifactId: "artifact-alpha",
          backend: "git",
          localPath: `${context.workspace.packageRoot}/prompts/interaction.md`,
          repoPath: context.workspace.packageRoot,
          sourceRef: {
            artifactId: "artifact-alpha",
            artifactKind: "report_file",
            backend: "git",
            locator: {
              branch: "worker-it/session-alpha/review",
              commit: "abc123",
              gitServiceRef: "local-gitea",
              namespace: "team-alpha",
              repositoryName: "graph-alpha",
              path: "reports/session-alpha/input.md"
            },
            preferred: true,
            status: "published"
          }
        }
      ],
      input: {
        artifactId: "artifact-alpha"
      },
      memoryRefs: [],
      nodeId: "worker-it",
      sessionId: "session-alpha",
      tool: {
        id: "inspect_artifact_input",
        description: "Inspect a retrieved inbound artifact by artifact id.",
        inputSchema: {
          type: "object"
        }
      },
      toolCallId: "toolu_01D7FLrfh4GYq7yT1ULFeyMV"
    });

    expect(result.isError).toBe(false);
    expect(result.content).toEqual(
      expect.objectContaining({
        artifactId: "artifact-alpha"
      })
    );
  });

  it("returns a deterministic error payload when the requested artifact is missing", async () => {
    const fixture = await createRuntimeFixture({
      toolCatalog: {
        schemaVersion: "1",
        tools: [
          {
            id: "inspect_artifact_input",
            description: "Inspect a retrieved inbound artifact by artifact id.",
            inputSchema: {
              type: "object"
            },
            execution: {
              kind: "builtin",
              builtinToolId: "inspect_artifact_input"
            }
          }
        ]
      }
    });
    const context = await loadRuntimeContext(fixture.contextPath);
    const executor = createBuiltinToolExecutor({
      context,
      toolCatalog: {
        schemaVersion: "1",
        tools: [
          {
            id: "inspect_artifact_input",
            description: "Inspect a retrieved inbound artifact by artifact id.",
            inputSchema: {
              type: "object"
            },
            execution: {
              kind: "builtin",
              builtinToolId: "inspect_artifact_input"
            }
          }
        ]
      }
    });

    const result = await executor.executeToolCall({
      artifactInputs: [],
      input: {
        artifactId: "missing-artifact"
      },
      memoryRefs: [],
      nodeId: "worker-it",
      sessionId: "session-alpha",
      tool: {
        id: "inspect_artifact_input",
        description: "Inspect a retrieved inbound artifact by artifact id.",
        inputSchema: {
          type: "object"
        }
      },
      toolCallId: "toolu_01D7FLrfh4GYq7yT1ULFeyMV"
    });

    expect(result.isError).toBe(true);
    expect(result.content).toEqual(
      expect.objectContaining({
        error: "artifact_not_found",
        requestedArtifactId: "missing-artifact"
      })
    );
  });
});

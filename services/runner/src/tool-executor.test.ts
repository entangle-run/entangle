import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
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

  it("returns a structured preview for a declared inspect_memory_ref tool using an exact memory ref", async () => {
    const fixture = await createRuntimeFixture({
      toolCatalog: {
        schemaVersion: "1",
        tools: [
          {
            id: "inspect_memory_ref",
            description: "Inspect a bounded memory reference by exact path.",
            inputSchema: {
              type: "object",
              properties: {
                memoryRef: {
                  type: "string"
                }
              },
              required: ["memoryRef"]
            },
            execution: {
              kind: "builtin",
              builtinToolId: "inspect_memory_ref"
            }
          }
        ]
      }
    });
    const context = await loadRuntimeContext(fixture.contextPath);
    const schemaPath = path.join(context.workspace.memoryRoot, "schema", "AGENTS.md");
    const executor = createBuiltinToolExecutor({
      context,
      toolCatalog: {
        schemaVersion: "1",
        tools: [
          {
            id: "inspect_memory_ref",
            description: "Inspect a bounded memory reference by exact path.",
            inputSchema: {
              type: "object",
              properties: {
                memoryRef: {
                  type: "string"
                }
              },
              required: ["memoryRef"]
            },
            execution: {
              kind: "builtin",
              builtinToolId: "inspect_memory_ref"
            }
          }
        ]
      }
    });

    const result = await executor.executeToolCall({
      artifactInputs: [],
      input: {
        memoryRef: schemaPath
      },
      memoryRefs: [schemaPath],
      nodeId: "worker-it",
      sessionId: "session-alpha",
      tool: {
        id: "inspect_memory_ref",
        description: "Inspect a bounded memory reference by exact path.",
        inputSchema: {
          type: "object"
        }
      },
      toolCallId: "toolu_01memoryrefexact"
    });

    expect(result.isError).toBe(false);
    expect(result.content).toEqual(
      expect.objectContaining({
        basename: "AGENTS.md",
        memoryRef: schemaPath
      })
    );
  });

  it("resolves a unique memory basename deterministically", async () => {
    const fixture = await createRuntimeFixture({
      toolCatalog: {
        schemaVersion: "1",
        tools: [
          {
            id: "inspect_memory_ref",
            description: "Inspect a bounded memory reference by basename.",
            inputSchema: {
              type: "object",
              properties: {
                basename: {
                  type: "string"
                }
              },
              required: ["basename"]
            },
            execution: {
              kind: "builtin",
              builtinToolId: "inspect_memory_ref"
            }
          }
        ]
      }
    });
    const context = await loadRuntimeContext(fixture.contextPath);
    const logPath = path.join(context.workspace.memoryRoot, "wiki", "log.md");
    await writeFile(logPath, "# Log\n\n- Entry\n", "utf8");
    const executor = createBuiltinToolExecutor({
      context,
      toolCatalog: {
        schemaVersion: "1",
        tools: [
          {
            id: "inspect_memory_ref",
            description: "Inspect a bounded memory reference by basename.",
            inputSchema: {
              type: "object",
              properties: {
                basename: {
                  type: "string"
                }
              },
              required: ["basename"]
            },
            execution: {
              kind: "builtin",
              builtinToolId: "inspect_memory_ref"
            }
          }
        ]
      }
    });

    const result = await executor.executeToolCall({
      artifactInputs: [],
      input: {
        basename: "log.md"
      },
      memoryRefs: [logPath],
      nodeId: "worker-it",
      sessionId: "session-alpha",
      tool: {
        id: "inspect_memory_ref",
        description: "Inspect a bounded memory reference by basename.",
        inputSchema: {
          type: "object"
        }
      },
      toolCallId: "toolu_01memoryrefbasename"
    });

    expect(result.isError).toBe(false);
    expect(result.content).toEqual(
      expect.objectContaining({
        basename: "log.md",
        memoryRef: logPath,
        preview: "# Log\n\n- Entry"
      })
    );
  });

  it("returns a deterministic not-found payload when the requested memory ref is unavailable", async () => {
    const fixture = await createRuntimeFixture({
      toolCatalog: {
        schemaVersion: "1",
        tools: [
          {
            id: "inspect_memory_ref",
            description: "Inspect a bounded memory reference by exact path.",
            inputSchema: {
              type: "object"
            },
            execution: {
              kind: "builtin",
              builtinToolId: "inspect_memory_ref"
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
            id: "inspect_memory_ref",
            description: "Inspect a bounded memory reference by exact path.",
            inputSchema: {
              type: "object"
            },
            execution: {
              kind: "builtin",
              builtinToolId: "inspect_memory_ref"
            }
          }
        ]
      }
    });
    const missingPath = path.join(
      context.workspace.memoryRoot,
      "wiki",
      "tasks",
      "missing.md"
    );

    const result = await executor.executeToolCall({
      artifactInputs: [],
      input: {
        memoryRef: missingPath
      },
      memoryRefs: [path.join(context.workspace.memoryRoot, "schema", "AGENTS.md")],
      nodeId: "worker-it",
      sessionId: "session-alpha",
      tool: {
        id: "inspect_memory_ref",
        description: "Inspect a bounded memory reference by exact path.",
        inputSchema: {
          type: "object"
        }
      },
      toolCallId: "toolu_01memoryrefmissing"
    });

    expect(result.isError).toBe(true);
    expect(result.content).toEqual(
      expect.objectContaining({
        error: "memory_ref_not_found",
        requestedMemoryRef: missingPath
      })
    );
  });

  it("rejects inspect_memory_ref calls that provide neither or both selector inputs", async () => {
    const fixture = await createRuntimeFixture({
      toolCatalog: {
        schemaVersion: "1",
        tools: [
          {
            id: "inspect_memory_ref",
            description: "Inspect a bounded memory reference.",
            inputSchema: {
              type: "object"
            },
            execution: {
              kind: "builtin",
              builtinToolId: "inspect_memory_ref"
            }
          }
        ]
      }
    });
    const context = await loadRuntimeContext(fixture.contextPath);
    const schemaPath = path.join(context.workspace.memoryRoot, "schema", "AGENTS.md");
    const executor = createBuiltinToolExecutor({
      context,
      toolCatalog: {
        schemaVersion: "1",
        tools: [
          {
            id: "inspect_memory_ref",
            description: "Inspect a bounded memory reference.",
            inputSchema: {
              type: "object"
            },
            execution: {
              kind: "builtin",
              builtinToolId: "inspect_memory_ref"
            }
          }
        ]
      }
    });

    const noSelectorResult = await executor.executeToolCall({
      artifactInputs: [],
      input: {},
      memoryRefs: [schemaPath],
      nodeId: "worker-it",
      sessionId: "session-alpha",
      tool: {
        id: "inspect_memory_ref",
        description: "Inspect a bounded memory reference.",
        inputSchema: {
          type: "object"
        }
      },
      toolCallId: "toolu_01memoryrefinvalid1"
    });
    const conflictingSelectorResult = await executor.executeToolCall({
      artifactInputs: [],
      input: {
        basename: "AGENTS.md",
        memoryRef: schemaPath
      },
      memoryRefs: [schemaPath],
      nodeId: "worker-it",
      sessionId: "session-alpha",
      tool: {
        id: "inspect_memory_ref",
        description: "Inspect a bounded memory reference.",
        inputSchema: {
          type: "object"
        }
      },
      toolCallId: "toolu_01memoryrefinvalid2"
    });

    expect(noSelectorResult.isError).toBe(true);
    expect(conflictingSelectorResult.isError).toBe(true);
    expect(noSelectorResult.content).toEqual(
      expect.objectContaining({
        error: "invalid_input"
      })
    );
    expect(conflictingSelectorResult.content).toEqual(
      expect.objectContaining({
        error: "invalid_input"
      })
    );
  });

  it("returns a deterministic error when a basename matches multiple memory refs", async () => {
    const fixture = await createRuntimeFixture({
      toolCatalog: {
        schemaVersion: "1",
        tools: [
          {
            id: "inspect_memory_ref",
            description: "Inspect a bounded memory reference by basename.",
            inputSchema: {
              type: "object"
            },
            execution: {
              kind: "builtin",
              builtinToolId: "inspect_memory_ref"
            }
          }
        ]
      }
    });
    const context = await loadRuntimeContext(fixture.contextPath);
    const firstTaskPath = path.join(
      context.workspace.memoryRoot,
      "wiki",
      "tasks",
      "alpha",
      "notes.md"
    );
    const secondTaskPath = path.join(
      context.workspace.memoryRoot,
      "wiki",
      "tasks",
      "beta",
      "notes.md"
    );
    await Promise.all([
      mkdir(path.dirname(firstTaskPath), { recursive: true }),
      mkdir(path.dirname(secondTaskPath), { recursive: true })
    ]);
    await Promise.all([
      writeFile(firstTaskPath, "# Alpha\n", "utf8"),
      writeFile(secondTaskPath, "# Beta\n", "utf8")
    ]);
    const executor = createBuiltinToolExecutor({
      context,
      toolCatalog: {
        schemaVersion: "1",
        tools: [
          {
            id: "inspect_memory_ref",
            description: "Inspect a bounded memory reference by basename.",
            inputSchema: {
              type: "object"
            },
            execution: {
              kind: "builtin",
              builtinToolId: "inspect_memory_ref"
            }
          }
        ]
      }
    });

    const result = await executor.executeToolCall({
      artifactInputs: [],
      input: {
        basename: "notes.md"
      },
      memoryRefs: [firstTaskPath, secondTaskPath],
      nodeId: "worker-it",
      sessionId: "session-alpha",
      tool: {
        id: "inspect_memory_ref",
        description: "Inspect a bounded memory reference by basename.",
        inputSchema: {
          type: "object"
        }
      },
      toolCallId: "toolu_01memoryrefambiguous"
    });

    expect(result.isError).toBe(true);
    expect(result.content).toEqual({
      error: "memory_ref_ambiguous",
      matchingMemoryRefs: [firstTaskPath, secondTaskPath],
      requestedBasename: "notes.md"
    });
  });
});

import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { afterEach, describe, expect, it } from "vitest";
import { AgentEngineExecutionError } from "@entangle/agent-engine";
import { sessionRecordSchema, type AgentEngineTurnRequest } from "@entangle/types";
import { loadRuntimeContext } from "./runtime-context.js";
import type { RunnerMemorySynthesisInput } from "./memory-synthesizer.js";
import { RunnerService } from "./service.js";
import {
  buildRunnerStatePaths,
  listArtifactRecords,
  readConversationRecord,
  readRunnerTurnRecord,
  readSessionRecord
} from "./state-store.js";
import {
  buildInboundTaskRequest,
  cleanupRuntimeFixtures,
  createPublishedGitArtifact,
  createRuntimeFixture,
  remotePublicKey,
  runnerSecretHex
} from "./test-fixtures.js";
import { InMemoryRunnerTransport } from "./transport.js";

afterEach(async () => {
  delete process.env.ENTANGLE_NOSTR_SECRET_KEY;
  await cleanupRuntimeFixtures();
});

describe("RunnerService", () => {
  it("retrieves published inbound git artifacts from the primary remote and passes them to the engine", async () => {
    const fixture = await createRuntimeFixture({
      remotePublication: "bare_repo"
    });
    process.env.ENTANGLE_NOSTR_SECRET_KEY = runnerSecretHex;

    if (!fixture.remoteRepositoryPath) {
      throw new Error("Expected a bare remote repository path for retrieval tests.");
    }

    const inboundArtifact = await createPublishedGitArtifact({
      remoteRepositoryPath: fixture.remoteRepositoryPath,
      summary: "Remote review notes.\n"
    });
    const runtimeContext = await loadRuntimeContext(fixture.contextPath);
    const transport = new InMemoryRunnerTransport();
    let capturedRequest: AgentEngineTurnRequest | undefined;
    const service = new RunnerService({
      context: runtimeContext,
      engine: {
        executeTurn(request) {
          capturedRequest = request;
          return Promise.resolve({
            assistantMessages: ["Retrieved inbound artifact successfully."],
            providerStopReason: "end_turn",
            stopReason: "completed",
            toolExecutions: [
              {
                outcome: "success",
                sequence: 1,
                toolCallId: "toolu_001",
                toolId: "inspect_artifact_input"
              }
            ],
            toolRequests: [],
            usage: {
              inputTokens: 0,
              outputTokens: 0
            }
          });
        }
      },
      transport
    });

    const result = await service.handleInboundEnvelope(
      buildInboundTaskRequest({
        artifactRefs: [inboundArtifact]
      })
    );

    expect(result.handled).toBe(true);
    expect(capturedRequest?.artifactInputs).toHaveLength(1);
    expect(capturedRequest?.artifactInputs[0]?.sourceRef.artifactId).toBe(
      inboundArtifact.artifactId
    );
    expect(capturedRequest?.artifactInputs[0]?.localPath).toContain(
      path.join("reports", "session-alpha", "input.md")
    );
    expect(capturedRequest?.artifactInputs[0]?.repoPath).toContain(
      runtimeContext.workspace.retrievalRoot
    );

    const statePaths = buildRunnerStatePaths(runtimeContext.workspace.runtimeRoot);
    const artifactRecords = await listArtifactRecords(statePaths);
    const retrievedArtifact = artifactRecords.find(
      (artifactRecord) => artifactRecord.ref.artifactId === inboundArtifact.artifactId
    );
    const producedArtifact = artifactRecords.find(
      (artifactRecord) => artifactRecord.ref.artifactId !== inboundArtifact.artifactId
    );
    const [turnRecordFile] = await readdir(statePaths.turnsRoot);
    const turnRecord = turnRecordFile
      ? await readRunnerTurnRecord(statePaths, turnRecordFile.replace(/\.json$/, ""))
      : undefined;

    expect(retrievedArtifact?.retrieval?.state).toBe("retrieved");
    expect(retrievedArtifact?.materialization?.repoPath).toContain(
      runtimeContext.workspace.retrievalRoot
    );
    expect(producedArtifact?.ref.backend).toBe("git");
    expect(turnRecord?.consumedArtifactIds).toContain(inboundArtifact.artifactId);
    expect(turnRecord?.engineOutcome).toEqual({
      providerMetadata: {
        adapterKind: "anthropic",
        modelId: "claude-opus",
        profileId: "shared-model"
      },
      providerStopReason: "end_turn",
      stopReason: "completed",
      toolExecutions: [
        {
          outcome: "success",
          sequence: 1,
          toolCallId: "toolu_001",
          toolId: "inspect_artifact_input"
        }
      ],
      usage: {
        inputTokens: 0,
        outputTokens: 0
      }
    });
  });

  it("retrieves published inbound git artifacts from a sibling repository on the primary service", async () => {
    const fixture = await createRuntimeFixture({
      remotePublication: "bare_repo"
    });
    process.env.ENTANGLE_NOSTR_SECRET_KEY = runnerSecretHex;

    if (!fixture.remoteRepositoryPath) {
      throw new Error("Expected a bare remote repository path for retrieval tests.");
    }

    const siblingRemoteRepositoryPath = path.join(
      path.dirname(fixture.remoteRepositoryPath),
      "review-artifacts.git"
    );
    spawnSync("git", ["init", "--bare", siblingRemoteRepositoryPath], {
      encoding: "utf8"
    });

    const inboundArtifact = await createPublishedGitArtifact({
      remoteRepositoryPath: siblingRemoteRepositoryPath,
      repositoryName: "review-artifacts",
      summary: "Sibling repository review notes.\n"
    });
    const runtimeContext = await loadRuntimeContext(fixture.contextPath);
    const transport = new InMemoryRunnerTransport();
    let capturedRequest: AgentEngineTurnRequest | undefined;
    const service = new RunnerService({
      context: runtimeContext,
      engine: {
        executeTurn(request) {
          capturedRequest = request;
          return Promise.resolve({
            assistantMessages: ["Retrieved sibling repository artifact successfully."],
            stopReason: "completed",
            toolExecutions: [],
            toolRequests: [],
            usage: {
              inputTokens: 0,
              outputTokens: 0
            }
          });
        }
      },
      transport
    });

    const result = await service.handleInboundEnvelope(
      buildInboundTaskRequest({
        artifactRefs: [inboundArtifact]
      })
    );

    expect(result.handled).toBe(true);
    expect(capturedRequest?.artifactInputs).toHaveLength(1);
    expect(capturedRequest?.artifactInputs[0]?.repoPath).toContain(
      path.join(
        runtimeContext.workspace.retrievalRoot,
        "local-gitea",
        "team-alpha",
        "review-artifacts"
      )
    );

    const statePaths = buildRunnerStatePaths(runtimeContext.workspace.runtimeRoot);
    const artifactRecords = await listArtifactRecords(statePaths);
    const retrievedArtifact = artifactRecords.find(
      (artifactRecord) => artifactRecord.ref.artifactId === inboundArtifact.artifactId
    );

    expect(retrievedArtifact?.retrieval?.state).toBe("retrieved");
    expect(retrievedArtifact?.retrieval?.remoteUrl).toBe(siblingRemoteRepositoryPath);
  });

  it("fails the turn and persists retrieval failure when inbound git handoff is invalid", async () => {
    const fixture = await createRuntimeFixture({
      remotePublication: "bare_repo"
    });
    process.env.ENTANGLE_NOSTR_SECRET_KEY = runnerSecretHex;

    if (!fixture.remoteRepositoryPath) {
      throw new Error("Expected a bare remote repository path for retrieval tests.");
    }

    const inboundArtifact = await createPublishedGitArtifact({
      remoteRepositoryPath: fixture.remoteRepositoryPath
    });
    delete inboundArtifact.locator.repositoryName;
    const runtimeContext = await loadRuntimeContext(fixture.contextPath);
    const transport = new InMemoryRunnerTransport();
    const service = new RunnerService({
      context: runtimeContext,
      transport
    });

    await expect(
      service.handleInboundEnvelope(
        buildInboundTaskRequest({
          artifactRefs: [inboundArtifact]
        })
      )
    ).rejects.toThrow("missing locator.repositoryName");

    const statePaths = buildRunnerStatePaths(runtimeContext.workspace.runtimeRoot);
    const sessionRecord = await readSessionRecord(statePaths, "session-alpha");
    const artifactRecords = await listArtifactRecords(statePaths);
    const failedArtifact = artifactRecords.find(
      (artifactRecord) => artifactRecord.ref.artifactId === inboundArtifact.artifactId
    );

    expect(sessionRecord?.status).toBe("failed");
    expect(failedArtifact?.retrieval?.state).toBe("failed");
    expect(failedArtifact?.retrieval?.lastError).toContain(
      "cannot resolve the remote repository"
    );
  });

  it("persists bounded engine failure metadata when model execution throws", async () => {
    const fixture = await createRuntimeFixture();
    process.env.ENTANGLE_NOSTR_SECRET_KEY = runnerSecretHex;

    const runtimeContext = await loadRuntimeContext(fixture.contextPath);
    const transport = new InMemoryRunnerTransport();
    const service = new RunnerService({
      context: runtimeContext,
      engine: {
        executeTurn() {
          throw new AgentEngineExecutionError(
            "Anthropic engine execution failed because authentication was rejected by the provider.",
            {
              classification: "auth_error"
            }
          );
        }
      },
      transport
    });

    await expect(service.handleInboundEnvelope(buildInboundTaskRequest())).rejects.toMatchObject({
      classification: "auth_error",
      name: "AgentEngineExecutionError"
    });

    const statePaths = buildRunnerStatePaths(runtimeContext.workspace.runtimeRoot);
    const [sessionRecord, turnRecord] = await Promise.all([
      readSessionRecord(statePaths, "session-alpha"),
      readRunnerTurnRecord(statePaths, (await readdir(statePaths.turnsRoot))[0]!.replace(/\.json$/, ""))
    ]);

    expect(sessionRecord?.status).toBe("failed");
    expect(turnRecord?.phase).toBe("errored");
    expect(turnRecord?.engineOutcome).toEqual({
      failure: {
        classification: "auth_error",
        message:
          "Anthropic engine execution failed because authentication was rejected by the provider."
      },
      providerMetadata: {
        adapterKind: "anthropic",
        modelId: "claude-opus",
        profileId: "shared-model"
      },
      stopReason: "error",
      toolExecutions: []
    });
  });

  it("persists engine outcome before artifact materialization so later failures remain inspectable", async () => {
    const fixture = await createRuntimeFixture();
    process.env.ENTANGLE_NOSTR_SECRET_KEY = runnerSecretHex;

    const runtimeContext = await loadRuntimeContext(fixture.contextPath);
    const transport = new InMemoryRunnerTransport();
    const service = new RunnerService({
      artifactBackend: {
        materializeTurnArtifacts() {
          return Promise.reject(new Error("synthetic artifact materialization failure"));
        },
        retrieveInboundArtifacts() {
          return Promise.resolve({
            artifactInputs: [],
            artifacts: []
          });
        }
      },
      context: runtimeContext,
      engine: {
        executeTurn() {
          return Promise.resolve({
            assistantMessages: ["Completed the core reasoning path."],
            stopReason: "completed",
            toolExecutions: [],
            toolRequests: [],
            usage: {
              inputTokens: 21,
              outputTokens: 9
            }
          });
        }
      },
      transport
    });

    await expect(service.handleInboundEnvelope(buildInboundTaskRequest())).rejects.toThrow(
      "synthetic artifact materialization failure"
    );

    const statePaths = buildRunnerStatePaths(runtimeContext.workspace.runtimeRoot);
    const [sessionRecord, turnRecord] = await Promise.all([
      readSessionRecord(statePaths, "session-alpha"),
      readRunnerTurnRecord(statePaths, (await readdir(statePaths.turnsRoot))[0]!.replace(/\.json$/, ""))
    ]);

    expect(sessionRecord?.status).toBe("failed");
    expect(turnRecord?.phase).toBe("errored");
    expect(turnRecord?.engineOutcome).toEqual({
      providerMetadata: {
        adapterKind: "anthropic",
        modelId: "claude-opus",
        profileId: "shared-model"
      },
      stopReason: "completed",
      toolExecutions: [],
      usage: {
        inputTokens: 21,
        outputTokens: 9
      }
    });
  });

  it("keeps the completed turn successful when optional memory synthesis throws", async () => {
    const fixture = await createRuntimeFixture();
    process.env.ENTANGLE_NOSTR_SECRET_KEY = runnerSecretHex;

    const runtimeContext = await loadRuntimeContext(fixture.contextPath);
    const transport = new InMemoryRunnerTransport();
    const service = new RunnerService({
      context: runtimeContext,
      engine: {
        executeTurn() {
          return Promise.resolve({
            assistantMessages: ["Handled the task successfully."],
            stopReason: "completed",
            toolExecutions: [],
            toolRequests: [],
            usage: {
              inputTokens: 0,
              outputTokens: 0
            }
          });
        }
      },
      memorySynthesizer: {
        synthesize() {
          throw new Error("synthetic memory synthesis failure");
        }
      },
      transport
    });

    const result = await service.handleInboundEnvelope(buildInboundTaskRequest());
    const statePaths = buildRunnerStatePaths(runtimeContext.workspace.runtimeRoot);
    const [sessionRecord, conversationRecord, logPage, turnFiles] = await Promise.all([
      readSessionRecord(statePaths, "session-alpha"),
      readConversationRecord(statePaths, "conv-alpha"),
      readFile(path.join(runtimeContext.workspace.memoryRoot, "wiki", "log.md"), "utf8"),
      readdir(statePaths.turnsRoot)
    ]);
    const turnRecord = turnFiles[0]
      ? await readRunnerTurnRecord(statePaths, turnFiles[0].replace(/\.json$/, ""))
      : undefined;

    expect(result.handled).toBe(true);
    expect(sessionRecord?.status).toBe("completed");
    expect(conversationRecord?.status).toBe("closed");
    expect(logPage).toContain("runner turn | session-alpha /");
    expect(turnRecord?.memorySynthesisOutcome?.status).toBe("failed");
    if (turnRecord?.memorySynthesisOutcome?.status !== "failed") {
      throw new Error("Expected a failed memory synthesis outcome.");
    }
    expect(turnRecord.memorySynthesisOutcome.errorMessage).toBe(
      "synthetic memory synthesis failure"
    );
    expect(turnRecord.memorySynthesisOutcome.updatedAt).toEqual(expect.any(String));
  });

  it("passes retrieved and produced artifact context into optional memory synthesis", async () => {
    const fixture = await createRuntimeFixture({
      remotePublication: "bare_repo"
    });
    process.env.ENTANGLE_NOSTR_SECRET_KEY = runnerSecretHex;

    if (!fixture.remoteRepositoryPath) {
      throw new Error("Expected a bare remote repository path for artifact-aware synthesis.");
    }

    const inboundArtifact = await createPublishedGitArtifact({
      remoteRepositoryPath: fixture.remoteRepositoryPath,
      summary: "Remote review notes.\n"
    });
    const runtimeContext = await loadRuntimeContext(fixture.contextPath);
    const transport = new InMemoryRunnerTransport();
    let capturedSynthesisInput: RunnerMemorySynthesisInput | undefined;
    let synthesisConversationStatus: string | undefined;
    let synthesisSessionStatus: string | undefined;
    const service = new RunnerService({
      context: runtimeContext,
      engine: {
        executeTurn() {
          return Promise.resolve({
            assistantMessages: ["Handled the task successfully."],
            stopReason: "completed",
            toolExecutions: [],
            toolRequests: [],
            usage: {
              inputTokens: 0,
              outputTokens: 0
            }
          });
        }
      },
      memorySynthesizer: {
        async synthesize(input) {
          capturedSynthesisInput = input;
          const statePaths = buildRunnerStatePaths(runtimeContext.workspace.runtimeRoot);
          const [sessionRecord, conversationRecord] = await Promise.all([
            readSessionRecord(statePaths, input.envelope.message.sessionId),
            readConversationRecord(statePaths, input.envelope.message.conversationId)
          ]);
          synthesisConversationStatus = conversationRecord?.status;
          synthesisSessionStatus = sessionRecord?.status;

          return Promise.resolve({
            ok: true,
            updatedSummaryPagePaths: [
              path.join(
                runtimeContext.workspace.memoryRoot,
                "wiki",
                "summaries",
                "working-context.md"
              ),
              path.join(
                runtimeContext.workspace.memoryRoot,
                "wiki",
                "summaries",
                "stable-facts.md"
              ),
              path.join(
                runtimeContext.workspace.memoryRoot,
                "wiki",
                "summaries",
                "open-questions.md"
              )
            ],
            workingContextPagePath: path.join(
              runtimeContext.workspace.memoryRoot,
              "wiki",
              "summaries",
              "working-context.md"
            )
          });
        }
      },
      transport
    });

    const result = await service.handleInboundEnvelope(
      buildInboundTaskRequest({
        artifactRefs: [inboundArtifact]
      })
    );
    const statePaths = buildRunnerStatePaths(runtimeContext.workspace.runtimeRoot);
    const turnFiles = await readdir(statePaths.turnsRoot);
    const turnRecord = turnFiles[0]
      ? await readRunnerTurnRecord(statePaths, turnFiles[0].replace(/\.json$/, ""))
      : undefined;

    expect(result.handled).toBe(true);
    expect(capturedSynthesisInput?.artifactInputs).toHaveLength(2);
    expect(capturedSynthesisInput?.artifactInputs.map((artifactInput) => artifactInput.artifactId))
      .toEqual([inboundArtifact.artifactId, expect.stringMatching(/^report-/)]);
    expect(capturedSynthesisInput?.artifactRefs).toHaveLength(2);
    expect(capturedSynthesisInput?.artifactRefs[0]?.artifactId).toBe(
      inboundArtifact.artifactId
    );
    expect(capturedSynthesisInput?.artifactInputs[0]?.localPath).toContain(
      path.join("reports", "session-alpha", "input.md")
    );
    expect(capturedSynthesisInput?.artifactInputs[1]?.localPath).toContain(
      path.join("reports", "session-alpha")
    );
    expect(synthesisConversationStatus).toBe("closed");
    expect(synthesisSessionStatus).toBe("completed");
    expect(turnRecord?.memorySynthesisOutcome?.status).toBe("succeeded");
    if (turnRecord?.memorySynthesisOutcome?.status !== "succeeded") {
      throw new Error("Expected a successful memory synthesis outcome.");
    }
    expect(turnRecord.memorySynthesisOutcome.updatedAt).toEqual(expect.any(String));
    expect(turnRecord.memorySynthesisOutcome.workingContextPagePath).toBe(
      path.join(
        runtimeContext.workspace.memoryRoot,
        "wiki",
        "summaries",
        "working-context.md"
      )
    );
    expect(turnRecord.memorySynthesisOutcome.updatedSummaryPagePaths).toEqual([
      path.join(
        runtimeContext.workspace.memoryRoot,
        "wiki",
        "summaries",
        "working-context.md"
      ),
      path.join(
        runtimeContext.workspace.memoryRoot,
        "wiki",
        "summaries",
        "stable-facts.md"
      ),
      path.join(
        runtimeContext.workspace.memoryRoot,
        "wiki",
        "summaries",
        "open-questions.md"
      )
    ]);
  });

  it("publishes git-backed artifacts to a configured preexisting remote repository", async () => {
    const fixture = await createRuntimeFixture({
      remotePublication: "bare_repo"
    });
    process.env.ENTANGLE_NOSTR_SECRET_KEY = runnerSecretHex;

    const runtimeContext = await loadRuntimeContext(fixture.contextPath);
    const transport = new InMemoryRunnerTransport();
    const service = new RunnerService({
      context: runtimeContext,
      transport
    });

    const result = await service.handleInboundEnvelope(buildInboundTaskRequest());

    expect(result.handled).toBe(true);

    const statePaths = buildRunnerStatePaths(runtimeContext.workspace.runtimeRoot);
    const artifactRecords = await listArtifactRecords(statePaths);
    expect(artifactRecords).toHaveLength(1);

    const artifactRecord = artifactRecords[0];
    if (
      !artifactRecord ||
      artifactRecord.ref.backend !== "git" ||
      !fixture.remoteRepositoryPath
    ) {
      throw new Error("Expected a published git artifact and a bare remote path.");
    }

    expect(artifactRecord.ref.status).toBe("published");
    expect(artifactRecord.publication?.state).toBe("published");
    expect(artifactRecord.publication?.remoteName).toBe("entangle-local-gitea");
    expect(artifactRecord.publication?.remoteUrl).toBe(fixture.remoteRepositoryPath);

    const remoteRef = spawnSync(
      "git",
      [
        "--git-dir",
        fixture.remoteRepositoryPath,
        "show-ref",
        "--verify",
        `refs/heads/${artifactRecord.ref.locator.branch}`
      ],
      {
        encoding: "utf8"
      }
    );

    expect(remoteRef.status).toBe(0);
    expect(remoteRef.stdout.trim().split(/\s+/)[0]).toBe(
      artifactRecord.ref.locator.commit
    );
  });

  it("processes an inbound task request and publishes a task result", async () => {
    const fixture = await createRuntimeFixture();
    process.env.ENTANGLE_NOSTR_SECRET_KEY = runnerSecretHex;

    const runtimeContext = await loadRuntimeContext(fixture.contextPath);
    const transport = new InMemoryRunnerTransport();
    const service = new RunnerService({
      context: runtimeContext,
      transport
    });

    await service.start();
    await transport.publish(buildInboundTaskRequest().message);

    const publishedEnvelopes = transport.listPublishedEnvelopes();
    const responseEnvelope = publishedEnvelopes.find(
      (envelope) =>
        envelope.message.messageType === "task.result" &&
        envelope.message.fromNodeId === "worker-it"
    );

    expect(responseEnvelope).toBeDefined();
    expect(responseEnvelope?.message.toNodeId).toBe("reviewer-it");
    expect(responseEnvelope?.message.parentMessageId).toBeDefined();
    expect(responseEnvelope?.message.toPubkey).toBe(remotePublicKey);

    const statePaths = buildRunnerStatePaths(runtimeContext.workspace.runtimeRoot);
    const sessionRecord = sessionRecordSchema.parse(
      await readSessionRecord(statePaths, "session-alpha")
    );
    const conversationRecord = await readConversationRecord(statePaths, "conv-alpha");
    const artifactRecords = await listArtifactRecords(statePaths);
    const turnIds = publishedEnvelopes
      .filter((envelope) => envelope.message.fromNodeId === "worker-it")
      .map((envelope) => envelope.message.turnId);
    const [turnRecordFile] = await readdir(statePaths.turnsRoot);
    const turnRecord = turnRecordFile
      ? await readRunnerTurnRecord(statePaths, turnRecordFile.replace(/\.json$/, ""))
      : undefined;

    expect(sessionRecord.status).toBe("completed");
    expect(sessionRecord.lastMessageType).toBe("task.result");
    expect(sessionRecord.rootArtifactIds).toHaveLength(1);
    expect(conversationRecord?.status).toBe("closed");
    expect(conversationRecord?.artifactIds).toEqual(sessionRecord.rootArtifactIds);
    expect(conversationRecord?.lastOutboundMessageId).toBe(responseEnvelope?.eventId);
    expect(conversationRecord?.followupCount).toBe(1);
    expect(turnIds).toHaveLength(1);
    expect(turnRecord?.producedArtifactIds).toEqual(sessionRecord.rootArtifactIds);
    expect(artifactRecords).toHaveLength(1);
    const artifactRecord = artifactRecords[0];
    if (!artifactRecord || artifactRecord.ref.backend !== "git") {
      throw new Error("Expected a git-backed artifact record.");
    }

    expect(responseEnvelope?.message.work.artifactRefs).toEqual(
      expect.arrayContaining([artifactRecord.ref])
    );
    expect(artifactRecord.ref.backend).toBe("git");
    expect(artifactRecord.ref.artifactKind).toBe("report_file");
    expect(artifactRecord.ref.status).toBe("materialized");
    expect(artifactRecord.publication?.state).toBe("not_requested");
    expect(artifactRecord.materialization?.repoPath).toBe(
      runtimeContext.workspace.artifactWorkspaceRoot
    );
    expect(artifactRecord.ref.locator).not.toHaveProperty("repoPath");

    const reportAbsolutePath = path.join(
      runtimeContext.workspace.artifactWorkspaceRoot,
      artifactRecord.ref.locator.path
    );
    const memoryTaskPagePath = path.join(
      runtimeContext.workspace.memoryRoot,
      "wiki",
      "tasks",
      "session-alpha",
      `${turnRecord?.turnId}.md`
    );
    const memoryLogPath = path.join(
      runtimeContext.workspace.memoryRoot,
      "wiki",
      "log.md"
    );
    const memorySummaryPath = path.join(
      runtimeContext.workspace.memoryRoot,
      "wiki",
      "summaries",
      "recent-work.md"
    );
    const [reportContent, memoryTaskPage, memoryLog, memorySummary] =
      await Promise.all([
        readFile(reportAbsolutePath, "utf8"),
        readFile(memoryTaskPagePath, "utf8"),
        readFile(memoryLogPath, "utf8"),
        readFile(memorySummaryPath, "utf8")
      ]);
    expect(reportContent).toContain("## Inbound Summary");
    expect(reportContent).toContain("Review the parser patch and summarize blocking issues.");
    expect(memoryTaskPage).toContain(`# Task Memory session-alpha / ${turnRecord?.turnId}`);
    expect(memoryTaskPage).toContain("## Produced Artifacts");
    expect(memoryLog).toContain(`runner turn | session-alpha / ${turnRecord?.turnId}`);
    expect(memorySummary).toContain("# Recent Work Summary");
    expect(memorySummary).toContain(`### session-alpha / ${turnRecord?.turnId}`);

    const gitDirectoryStats = await stat(
      path.join(runtimeContext.workspace.artifactWorkspaceRoot, ".git")
    );
    expect(gitDirectoryStats.isDirectory()).toBe(true);

    const headCommit = spawnSync(
      "git",
      ["-C", runtimeContext.workspace.artifactWorkspaceRoot, "rev-parse", "HEAD"],
      {
        encoding: "utf8"
      }
    );
    expect(headCommit.status).toBe(0);
    expect(headCommit.stdout.trim()).toBe(artifactRecord.ref.locator.commit);

    const authorEmail = spawnSync(
      "git",
      [
        "-C",
        runtimeContext.workspace.artifactWorkspaceRoot,
        "log",
        "-1",
        "--format=%ae"
      ],
      {
        encoding: "utf8"
      }
    );
    expect(authorEmail.status).toBe(0);
    expect(authorEmail.stdout.trim()).toBe("worker-it@entangle.local");

    await service.stop();
  });

  it("preserves the local artifact and records publication failure when the remote is unavailable", async () => {
    const fixture = await createRuntimeFixture({
      remotePublication: "missing_repo"
    });
    process.env.ENTANGLE_NOSTR_SECRET_KEY = runnerSecretHex;

    const runtimeContext = await loadRuntimeContext(fixture.contextPath);
    const transport = new InMemoryRunnerTransport();
    const service = new RunnerService({
      context: runtimeContext,
      transport
    });

    const result = await service.handleInboundEnvelope(buildInboundTaskRequest());

    expect(result.handled).toBe(true);

    const statePaths = buildRunnerStatePaths(runtimeContext.workspace.runtimeRoot);
    const artifactRecords = await listArtifactRecords(statePaths);
    expect(artifactRecords).toHaveLength(1);

    const artifactRecord = artifactRecords[0];
    if (
      !artifactRecord ||
      artifactRecord.ref.backend !== "git" ||
      !fixture.remoteRepositoryPath
    ) {
      throw new Error(
        "Expected a git artifact and a configured-but-missing remote path."
      );
    }

    expect(artifactRecord.ref.status).toBe("materialized");
    expect(artifactRecord.publication?.state).toBe("failed");
    expect(artifactRecord.publication?.remoteName).toBe("entangle-local-gitea");
    expect(artifactRecord.publication?.remoteUrl).toBe(fixture.remoteRepositoryPath);
    expect(artifactRecord.publication?.lastError).toContain("Git command failed");
    expect(artifactRecord.materialization?.repoPath).toBe(
      runtimeContext.workspace.artifactWorkspaceRoot
    );
  });

  it("does not publish a follow-up when the inbound response policy does not require one", async () => {
    const fixture = await createRuntimeFixture();
    process.env.ENTANGLE_NOSTR_SECRET_KEY = runnerSecretHex;

    const runtimeContext = await loadRuntimeContext(fixture.contextPath);
    const transport = new InMemoryRunnerTransport();
    const service = new RunnerService({
      context: runtimeContext,
      transport
    });

    const result = await service.handleInboundEnvelope(
      buildInboundTaskRequest({
        responsePolicy: {
          closeOnResult: true,
          maxFollowups: 0,
          responseRequired: false
        }
      })
    );

    expect(result).toEqual({
      handled: true,
      response: undefined
    });
    expect(transport.listPublishedEnvelopes()).toHaveLength(0);

    const statePaths = buildRunnerStatePaths(runtimeContext.workspace.runtimeRoot);
    const sessionRecord = await readSessionRecord(statePaths, "session-alpha");
    const conversationRecord = await readConversationRecord(statePaths, "conv-alpha");
    const artifactRecords = await listArtifactRecords(statePaths);
    const [turnRecordFile] = await readdir(statePaths.turnsRoot);
    const turnRecord = turnRecordFile
      ? await readRunnerTurnRecord(statePaths, turnRecordFile.replace(/\.json$/, ""))
      : undefined;

    expect(sessionRecord?.status).toBe("completed");
    expect(sessionRecord?.rootArtifactIds).toHaveLength(1);
    expect(conversationRecord?.status).toBe("closed");
    expect(conversationRecord?.artifactIds).toEqual(sessionRecord?.rootArtifactIds);
    expect(turnRecord?.phase).toBe("persisting");
    expect(turnRecord?.producedArtifactIds).toEqual(sessionRecord?.rootArtifactIds);
    expect(artifactRecords).toHaveLength(1);
    if (!artifactRecords[0]) {
      throw new Error("Expected an artifact record for the persisted turn.");
    }
    expect(artifactRecords[0].ref.backend).toBe("git");
    expect(artifactRecords[0].publication?.state).toBe("not_requested");
  });

  it("ignores envelopes addressed to another node id", async () => {
    const fixture = await createRuntimeFixture();
    process.env.ENTANGLE_NOSTR_SECRET_KEY = runnerSecretHex;

    const runtimeContext = await loadRuntimeContext(fixture.contextPath);
    const transport = new InMemoryRunnerTransport();
    const service = new RunnerService({
      context: runtimeContext,
      transport
    });

    const result = await service.handleInboundEnvelope(
      buildInboundTaskRequest({
        toNodeId: "worker-marketing"
      })
    );

    expect(result).toEqual({
      handled: false,
      reason: "wrong_node"
    });
  });

  it("ignores envelopes addressed to another pubkey", async () => {
    const fixture = await createRuntimeFixture();
    process.env.ENTANGLE_NOSTR_SECRET_KEY = runnerSecretHex;

    const runtimeContext = await loadRuntimeContext(fixture.contextPath);
    const transport = new InMemoryRunnerTransport();
    const service = new RunnerService({
      context: runtimeContext,
      transport
    });

    const result = await service.handleInboundEnvelope(
      buildInboundTaskRequest({
        toPubkey:
          "9039756d4d20ef2f01f196f0ff8e9a6bc036413f648f4f46fc47f4cefbfbd0e8"
      })
    );

    expect(result).toEqual({
      handled: false,
      reason: "wrong_pubkey"
    });
  });

  it("rejects syntactically invalid inbound messages before state mutation", async () => {
    const fixture = await createRuntimeFixture();
    process.env.ENTANGLE_NOSTR_SECRET_KEY = runnerSecretHex;

    const runtimeContext = await loadRuntimeContext(fixture.contextPath);
    const transport = new InMemoryRunnerTransport();
    const service = new RunnerService({
      context: runtimeContext,
      transport
    });

    const invalidEnvelope = buildInboundTaskRequest();
    invalidEnvelope.message.parentMessageId =
      "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
    invalidEnvelope.message.fromNodeId = invalidEnvelope.message.toNodeId;

    const result = await service.handleInboundEnvelope(invalidEnvelope);

    expect(result).toEqual({
      handled: false,
      reason: "invalid_message"
    });

    const statePaths = buildRunnerStatePaths(runtimeContext.workspace.runtimeRoot);
    expect(await readSessionRecord(statePaths, "session-alpha")).toBeUndefined();
  });

  it("starts idempotently and does not register duplicate subscriptions", async () => {
    const fixture = await createRuntimeFixture();
    process.env.ENTANGLE_NOSTR_SECRET_KEY = runnerSecretHex;

    const runtimeContext = await loadRuntimeContext(fixture.contextPath);
    const transport = new InMemoryRunnerTransport();
    const service = new RunnerService({
      context: runtimeContext,
      transport
    });

    const firstStart = await service.start();
    const secondStart = await service.start();

    expect(secondStart).toEqual(firstStart);

    await transport.publish(buildInboundTaskRequest().message);
    const responses = transport
      .listPublishedEnvelopes()
      .filter((envelope) => envelope.message.fromNodeId === "worker-it");

    expect(responses).toHaveLength(1);

    await service.stop();
  });
});

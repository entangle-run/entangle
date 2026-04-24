import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import type {
  AgentEngineToolExecutor
} from "@entangle/agent-engine";
import {
  engineToolExecutionResultSchema,
  type BuiltinToolId,
  type EffectiveRuntimeContext,
  type EngineToolExecutionRequest,
  type EngineToolExecutionResult,
  type PackageToolCatalog,
  type PackageToolDefinition,
  type RunnerTurnRecord
} from "@entangle/types";
import {
  buildRunnerStatePaths,
  listArtifactRecords,
  listConversationRecords,
  listRunnerTurnRecords,
  readSessionRecord
} from "./state-store.js";

const maxArtifactPreviewCharacters = 12_000;

type RunnerBuiltinToolHandler = (input: {
  context: EffectiveRuntimeContext;
  request: EngineToolExecutionRequest;
  toolDefinition: PackageToolDefinition;
}) => Promise<EngineToolExecutionResult>;

async function readTextFilePreview(
  filePath: string,
  maxCharacters = maxArtifactPreviewCharacters
): Promise<string | undefined> {
  const fileStat = await stat(filePath);

  if (!fileStat.isFile()) {
    return undefined;
  }

  const content = await readFile(filePath, "utf8");
  const trimmedContent = content.trim();

  if (trimmedContent.length === 0) {
    return "[Empty file]";
  }

  if (trimmedContent.length <= maxCharacters) {
    return trimmedContent;
  }

  return (
    `${trimmedContent.slice(0, maxCharacters)}\n\n` +
    `[Truncated ${trimmedContent.length - maxCharacters} additional characters.]`
  );
}

function coerceNonEmptyString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : undefined;
}

function buildInvalidInputResult(input: {
  message: string;
  details?: Record<string, unknown>;
}): EngineToolExecutionResult {
  return engineToolExecutionResultSchema.parse({
    content: {
      ...(input.details ?? {}),
      error: "invalid_input",
      message: input.message
    },
    isError: true
  });
}

function coerceBoundedPositiveInteger(
  value: unknown,
  input: {
    defaultValue: number;
    fieldName: string;
    maxValue: number;
  }
):
  | {
      ok: true;
      value: number;
    }
  | {
      ok: false;
      errorResult: EngineToolExecutionResult;
    } {
  if (value === undefined) {
    return {
      ok: true,
      value: input.defaultValue
    };
  }

  if (!Number.isInteger(value) || (value as number) <= 0 || (value as number) > input.maxValue) {
    return {
      ok: false,
      errorResult: buildInvalidInputResult({
        details: {
          fieldName: input.fieldName,
          maxValue: input.maxValue
        },
        message: `The inspect_session_state builtin requires '${input.fieldName}' to be an integer between 1 and ${input.maxValue}.`
      })
    };
  }

  return {
    ok: true,
    value: value as number
  };
}

function resolveRequestedMemoryRef(
  request: EngineToolExecutionRequest
):
  | {
      ok: true;
      resolvedMemoryRef: string;
    }
  | {
      ok: false;
      errorResult: EngineToolExecutionResult;
    } {
  const requestedMemoryRef = coerceNonEmptyString(request.input.memoryRef);
  const requestedBasename = coerceNonEmptyString(request.input.basename);

  if (
    (requestedMemoryRef && requestedBasename) ||
    (!requestedMemoryRef && !requestedBasename)
  ) {
    return {
      ok: false,
      errorResult: engineToolExecutionResultSchema.parse({
        content: {
          availableMemoryRefs: request.memoryRefs,
          error: "invalid_input",
          message:
            "The inspect_memory_ref builtin requires exactly one non-empty string input: 'memoryRef' or 'basename'."
        },
        isError: true
      })
    };
  }

  if (requestedMemoryRef) {
    const matchedMemoryRef = request.memoryRefs.find(
      (candidate) => candidate === requestedMemoryRef
    );

    if (!matchedMemoryRef) {
      return {
        ok: false,
        errorResult: engineToolExecutionResultSchema.parse({
          content: {
            availableMemoryRefs: request.memoryRefs,
            error: "memory_ref_not_found",
            requestedMemoryRef
          },
          isError: true
        })
      };
    }

    return {
      ok: true,
      resolvedMemoryRef: matchedMemoryRef
    };
  }

  const matchingMemoryRefs = request.memoryRefs.filter(
    (candidate) => path.basename(candidate) === requestedBasename
  );

  if (matchingMemoryRefs.length === 0) {
    return {
      ok: false,
      errorResult: engineToolExecutionResultSchema.parse({
        content: {
          availableMemoryRefs: request.memoryRefs,
          error: "memory_ref_not_found",
          requestedBasename
        },
        isError: true
      })
    };
  }

  if (matchingMemoryRefs.length > 1) {
    return {
      ok: false,
      errorResult: engineToolExecutionResultSchema.parse({
        content: {
          error: "memory_ref_ambiguous",
          matchingMemoryRefs,
          requestedBasename
        },
        isError: true
      })
    };
  }

  return {
    ok: true,
    resolvedMemoryRef: matchingMemoryRefs[0]!
  };
}

function summarizeTurnOutcome(
  record: RunnerTurnRecord
): Record<string, unknown> | undefined {
  if (!record.engineOutcome) {
    return undefined;
  }

  return {
    ...(record.engineOutcome.failure
      ? {
          failure: record.engineOutcome.failure
        }
      : {}),
    ...(record.engineOutcome.providerMetadata
      ? {
          providerMetadata: record.engineOutcome.providerMetadata
        }
      : {}),
    ...(record.engineOutcome.providerStopReason
      ? {
          providerStopReason: record.engineOutcome.providerStopReason
        }
      : {}),
    ...(record.engineOutcome.usage
      ? {
          usage: record.engineOutcome.usage
        }
      : {}),
    stopReason: record.engineOutcome.stopReason,
    toolExecutionCount: record.engineOutcome.toolExecutions.length
  };
}

function resolveRequestedSessionStateInput(
  request: EngineToolExecutionRequest
):
  | {
      ok: true;
      resolvedSessionId: string;
      maxArtifacts: number;
      maxRecentTurns: number;
    }
  | {
      ok: false;
      errorResult: EngineToolExecutionResult;
    } {
  const requestedSessionId = coerceNonEmptyString(request.input.sessionId);

  if (requestedSessionId && requestedSessionId !== request.sessionId) {
    return {
      ok: false,
      errorResult: buildInvalidInputResult({
        details: {
          requestedSessionId,
          sessionId: request.sessionId
        },
        message:
          "The inspect_session_state builtin may only inspect the current session."
      })
    };
  }

  const maxRecentTurnsResult = coerceBoundedPositiveInteger(
    request.input.maxRecentTurns,
    {
      defaultValue: 5,
      fieldName: "maxRecentTurns",
      maxValue: 10
    }
  );

  if (!maxRecentTurnsResult.ok) {
    return maxRecentTurnsResult;
  }

  const maxArtifactsResult = coerceBoundedPositiveInteger(
    request.input.maxArtifacts,
    {
      defaultValue: 10,
      fieldName: "maxArtifacts",
      maxValue: 20
    }
  );

  if (!maxArtifactsResult.ok) {
    return maxArtifactsResult;
  }

  return {
    ok: true,
    resolvedSessionId: request.sessionId,
    maxArtifacts: maxArtifactsResult.value,
    maxRecentTurns: maxRecentTurnsResult.value
  };
}

const builtinToolHandlers: Record<BuiltinToolId, RunnerBuiltinToolHandler> = {
  async inspect_artifact_input({ request }) {
    const artifactId =
      typeof request.input.artifactId === "string"
        ? request.input.artifactId.trim()
        : "";

    if (!artifactId) {
      return engineToolExecutionResultSchema.parse({
        content: {
          error: "invalid_input",
          message:
            "The inspect_artifact_input builtin requires a non-empty string property 'artifactId'."
        },
        isError: true
      });
    }

    const artifactInput = request.artifactInputs.find(
      (candidate) => candidate.artifactId === artifactId
    );

    if (!artifactInput) {
      return engineToolExecutionResultSchema.parse({
        content: {
          availableArtifactIds: request.artifactInputs.map(
            (candidate) => candidate.artifactId
          ),
          error: "artifact_not_found",
          requestedArtifactId: artifactId
        },
        isError: true
      });
    }

    const preview =
      (await readTextFilePreview(artifactInput.localPath)) ??
      "[Non-file artifact input omitted from inline tool execution.]";

    return engineToolExecutionResultSchema.parse({
      content: {
        artifactId: artifactInput.artifactId,
        backend: artifactInput.backend,
        localPath: artifactInput.localPath,
        ...(artifactInput.repoPath ? { repoPath: artifactInput.repoPath } : {}),
        preview,
        status: artifactInput.sourceRef.status
      }
    });
  },
  async inspect_memory_ref({ request }) {
    const resolvedMemoryRef = resolveRequestedMemoryRef(request);

    if (!resolvedMemoryRef.ok) {
      return resolvedMemoryRef.errorResult;
    }

    const preview = await readTextFilePreview(resolvedMemoryRef.resolvedMemoryRef);

    if (!preview) {
      return engineToolExecutionResultSchema.parse({
        content: {
          error: "memory_ref_not_readable",
          memoryRef: resolvedMemoryRef.resolvedMemoryRef
        },
        isError: true
      });
    }

    return engineToolExecutionResultSchema.parse({
      content: {
        basename: path.basename(resolvedMemoryRef.resolvedMemoryRef),
        memoryRef: resolvedMemoryRef.resolvedMemoryRef,
        preview
      }
    });
  },
  async inspect_session_state({ context, request }) {
    const resolvedInput = resolveRequestedSessionStateInput(request);

    if (!resolvedInput.ok) {
      return resolvedInput.errorResult;
    }

    const statePaths = buildRunnerStatePaths(context.workspace.runtimeRoot);
    const sessionRecord = await readSessionRecord(
      statePaths,
      resolvedInput.resolvedSessionId
    );

    if (!sessionRecord) {
      return engineToolExecutionResultSchema.parse({
        content: {
          error: "session_not_found",
          sessionId: resolvedInput.resolvedSessionId
        },
        isError: true
      });
    }

    const [conversationRecords, turnRecords, artifactRecords] = await Promise.all([
      listConversationRecords(statePaths),
      listRunnerTurnRecords(statePaths),
      listArtifactRecords(statePaths)
    ]);

    const sessionConversations = conversationRecords
      .filter((candidate) => candidate.sessionId === sessionRecord.sessionId)
      .sort((left, right) =>
        right.updatedAt.localeCompare(left.updatedAt) ||
        left.conversationId.localeCompare(right.conversationId)
      );
    const sessionTurns = turnRecords
      .filter((candidate) => candidate.sessionId === sessionRecord.sessionId)
      .sort((left, right) =>
        right.updatedAt.localeCompare(left.updatedAt) ||
        left.turnId.localeCompare(right.turnId)
      );

    const relatedArtifactIds = new Set<string>(sessionRecord.rootArtifactIds);

    for (const conversationRecord of sessionConversations) {
      for (const artifactId of conversationRecord.artifactIds) {
        relatedArtifactIds.add(artifactId);
      }
    }

    for (const turnRecord of sessionTurns) {
      for (const artifactId of turnRecord.consumedArtifactIds) {
        relatedArtifactIds.add(artifactId);
      }

      for (const artifactId of turnRecord.producedArtifactIds) {
        relatedArtifactIds.add(artifactId);
      }
    }

    const relatedArtifacts = artifactRecords
      .filter((candidate) => relatedArtifactIds.has(candidate.ref.artifactId))
      .sort((left, right) =>
        right.updatedAt.localeCompare(left.updatedAt) ||
        left.ref.artifactId.localeCompare(right.ref.artifactId)
      )
      .slice(0, resolvedInput.maxArtifacts);

    return engineToolExecutionResultSchema.parse({
      content: {
        artifacts: relatedArtifacts.map((artifactRecord) => ({
          artifactId: artifactRecord.ref.artifactId,
          artifactKind: artifactRecord.ref.artifactKind,
          backend: artifactRecord.ref.backend,
          publicationState: artifactRecord.publication?.state,
          retrievalState: artifactRecord.retrieval?.state,
          status: artifactRecord.ref.status,
          turnId: artifactRecord.turnId,
          updatedAt: artifactRecord.updatedAt
        })),
        conversations: sessionConversations.map((conversationRecord) => ({
          artifactIds: conversationRecord.artifactIds,
          conversationId: conversationRecord.conversationId,
          followupCount: conversationRecord.followupCount,
          initiator: conversationRecord.initiator,
          lastMessageType: conversationRecord.lastMessageType,
          peerNodeId: conversationRecord.peerNodeId,
          responsePolicy: conversationRecord.responsePolicy,
          status: conversationRecord.status,
          updatedAt: conversationRecord.updatedAt
        })),
        counts: {
          artifactCount: relatedArtifactIds.size,
          conversationCount: sessionConversations.length,
          recentTurnCount: Math.min(
            sessionTurns.length,
            resolvedInput.maxRecentTurns
          )
        },
        recentTurns: sessionTurns
          .slice(0, resolvedInput.maxRecentTurns)
          .map((turnRecord) => ({
            ...(turnRecord.conversationId
              ? {
                  conversationId: turnRecord.conversationId
                }
              : {}),
            ...(turnRecord.messageId
              ? {
                  messageId: turnRecord.messageId
                }
              : {}),
            ...(turnRecord.sessionId
              ? {
                  sessionId: turnRecord.sessionId
                }
              : {}),
            consumedArtifactIds: turnRecord.consumedArtifactIds,
            engineOutcome: summarizeTurnOutcome(turnRecord),
            phase: turnRecord.phase,
            producedArtifactIds: turnRecord.producedArtifactIds,
            triggerKind: turnRecord.triggerKind,
            turnId: turnRecord.turnId,
            updatedAt: turnRecord.updatedAt
          })),
        session: {
          activeConversationIds: sessionRecord.activeConversationIds,
          entrypointNodeId: sessionRecord.entrypointNodeId,
          intent: sessionRecord.intent,
          lastMessageType: sessionRecord.lastMessageType,
          ownerNodeId: sessionRecord.ownerNodeId,
          rootArtifactIds: sessionRecord.rootArtifactIds,
          sessionId: sessionRecord.sessionId,
          status: sessionRecord.status,
          updatedAt: sessionRecord.updatedAt,
          waitingApprovalIds: sessionRecord.waitingApprovalIds
        }
      }
    });
  }
};

function buildExecutionBindingMap(
  toolCatalog: PackageToolCatalog
): Map<string, PackageToolDefinition> {
  const bindings = new Map<string, PackageToolDefinition>();

  for (const toolDefinition of toolCatalog.tools) {
    if (toolDefinition.execution.kind !== "builtin") {
      continue;
    }

    bindings.set(toolDefinition.id, toolDefinition);
  }

  return bindings;
}

export function createBuiltinToolExecutor(input: {
  context: EffectiveRuntimeContext;
  toolCatalog: PackageToolCatalog;
}): AgentEngineToolExecutor {
  const executionBindings = buildExecutionBindingMap(input.toolCatalog);

  return {
    async executeToolCall(request) {
      const toolDefinition = executionBindings.get(request.tool.id);

      if (!toolDefinition) {
        return engineToolExecutionResultSchema.parse({
          content: {
            declaredToolIds: [...executionBindings.keys()],
            error: "tool_not_declared",
            toolId: request.tool.id
          },
          isError: true
        });
      }

      const handler = builtinToolHandlers[toolDefinition.execution.builtinToolId];

      try {
        return engineToolExecutionResultSchema.parse(
          await handler({
            context: input.context,
            request,
            toolDefinition
          })
        );
      } catch (error) {
        return engineToolExecutionResultSchema.parse({
          content: {
            error: "tool_execution_failed",
            message:
              error instanceof Error
                ? error.message
                : "Unknown builtin tool execution failure.",
            toolId: request.tool.id
          },
          isError: true
        });
      }
    }
  };
}

import { readFile, stat } from "node:fs/promises";
import type {
  AgentEngineToolExecutor
} from "@entangle/agent-engine";
import {
  engineToolExecutionResultSchema,
  type EffectiveRuntimeContext,
  type EngineToolExecutionRequest,
  type EngineToolExecutionResult,
  type PackageToolCatalog,
  type PackageToolDefinition
} from "@entangle/types";

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

const builtinToolHandlers: Record<string, RunnerBuiltinToolHandler> = {
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

    const handler = builtinToolHandlers[toolDefinition.execution.builtinToolId];

    if (!handler) {
      throw new Error(
        `Package tool '${toolDefinition.id}' references unsupported builtin tool '${toolDefinition.execution.builtinToolId}'.`
      );
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

      if (!handler) {
        return engineToolExecutionResultSchema.parse({
          content: {
            builtinToolId: toolDefinition.execution.builtinToolId,
            error: "builtin_tool_not_supported",
            toolId: request.tool.id
          },
          isError: true
        });
      }

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

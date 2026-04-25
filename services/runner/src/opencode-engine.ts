import { spawn as spawnChildProcess } from "node:child_process";
import type {
  ChildProcessWithoutNullStreams,
  SpawnOptionsWithoutStdio
} from "node:child_process";
import { constants as fsConstants } from "node:fs";
import { access, mkdir } from "node:fs/promises";
import path from "node:path";
import type { Readable } from "node:stream";
import {
  AgentEngineConfigurationError,
  AgentEngineExecutionError,
  type AgentEngine
} from "@entangle/agent-engine";
import {
  agentEngineTurnRequestSchema,
  agentEngineTurnResultSchema,
  type AgentEngineTurnRequest,
  type AgentEngineTurnResult,
  type EffectiveRuntimeContext,
  type EngineToolExecutionObservation
} from "@entangle/types";

type OpenCodeProcess = Pick<
  ChildProcessWithoutNullStreams,
  "kill" | "on" | "once" | "stderr" | "stdin" | "stdout"
>;

export type OpenCodeSpawn = (
  command: string,
  args: string[],
  options: SpawnOptionsWithoutStdio
) => OpenCodeProcess;

type OpenCodeRunEvent = {
  error?: unknown;
  part?: unknown;
  sessionID?: unknown;
  type?: unknown;
};

type OpenCodeRuntimePaths = {
  configDir: string;
  databasePath: string;
  engineStateRoot: string;
  homeRoot: string;
  xdgCacheHome: string;
  xdgConfigHome: string;
  xdgDataHome: string;
  xdgStateHome: string;
};

const maxCapturedStderrCharacters = 12_000;
const maxFailureMessageCharacters = 1_000;

const defaultOpenCodeSpawn: OpenCodeSpawn = (command, args, options) =>
  spawnChildProcess(command, args, {
    ...options,
    stdio: "pipe"
  });

function truncate(value: string, maxCharacters: number): string {
  const trimmed = value.trim();

  if (trimmed.length <= maxCharacters) {
    return trimmed;
  }

  return `${trimmed.slice(0, maxCharacters - 1)}…`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function extractErrorMessage(value: unknown): string | undefined {
  if (!value) {
    return undefined;
  }

  if (value instanceof Error) {
    return value.message;
  }

  if (typeof value === "string") {
    return value;
  }

  if (isRecord(value)) {
    if (typeof value.message === "string") {
      return value.message;
    }

    if (isRecord(value.data) && typeof value.data.message === "string") {
      return value.data.message;
    }

    if (typeof value.name === "string") {
      return value.name;
    }
  }

  try {
    return JSON.stringify(value);
  } catch {
    return "Unserializable OpenCode error.";
  }
}

function chooseOpenCodeWorkspace(context: EffectiveRuntimeContext): string {
  return (
    context.workspace.sourceWorkspaceRoot ??
    context.workspace.artifactWorkspaceRoot ??
    context.workspace.root
  );
}

function buildOpenCodeRuntimePaths(
  context: EffectiveRuntimeContext
): OpenCodeRuntimePaths {
  const engineStateRoot =
    context.workspace.engineStateRoot ?? context.workspace.runtimeRoot;
  const xdgRoot = path.join(engineStateRoot, "xdg");

  return {
    configDir: path.join(engineStateRoot, "config"),
    databasePath: path.join(engineStateRoot, "opencode.db"),
    engineStateRoot,
    homeRoot: path.join(engineStateRoot, "home"),
    xdgCacheHome: path.join(xdgRoot, "cache"),
    xdgConfigHome: path.join(xdgRoot, "config"),
    xdgDataHome: path.join(xdgRoot, "data"),
    xdgStateHome: path.join(xdgRoot, "state")
  };
}

async function prepareOpenCodeRuntime(input: {
  context: EffectiveRuntimeContext;
  workspace: string;
}): Promise<OpenCodeRuntimePaths> {
  const nodeId = input.context.binding.node.nodeId;
  const runtimePaths = buildOpenCodeRuntimePaths(input.context);

  try {
    await Promise.all([
      mkdir(runtimePaths.configDir, { recursive: true }),
      mkdir(runtimePaths.homeRoot, { recursive: true }),
      mkdir(runtimePaths.xdgCacheHome, { recursive: true }),
      mkdir(runtimePaths.xdgConfigHome, { recursive: true }),
      mkdir(runtimePaths.xdgDataHome, { recursive: true }),
      mkdir(runtimePaths.xdgStateHome, { recursive: true })
    ]);
    await Promise.all([
      access(input.workspace, fsConstants.R_OK | fsConstants.W_OK),
      access(runtimePaths.engineStateRoot, fsConstants.R_OK | fsConstants.W_OK)
    ]);
  } catch (error) {
    throw new AgentEngineExecutionError(
      `OpenCode runtime for node '${nodeId}' is not ready; workspace and engine-state directories must exist and be readable/writable.`,
      {
        cause: error,
        classification: "configuration_error"
      }
    );
  }

  return runtimePaths;
}

export function buildOpenCodePrompt(request: AgentEngineTurnRequest): string {
  const sections = [
    [
      "# Entangle Node Task",
      `Node: ${request.nodeId}`,
      `Session: ${request.sessionId}`
    ].join("\n"),
    ["## System", request.systemPromptParts.join("\n\n")].join("\n\n"),
    ["## Task", request.interactionPromptParts.join("\n\n")].join("\n\n")
  ];

  if (request.artifactRefs.length > 0) {
    sections.push(
      [
        "## Artifact References",
        ...request.artifactRefs.map(
          (artifactRef) =>
            `- ${artifactRef.artifactId}: ${artifactRef.artifactKind} (${artifactRef.status})`
        )
      ].join("\n")
    );
  }

  if (request.artifactInputs.length > 0) {
    sections.push(
      [
        "## Local Artifact Inputs",
        ...request.artifactInputs.map((artifactInput) =>
          [
            `- ${artifactInput.artifactId}`,
            `  localPath: ${artifactInput.localPath}`,
            artifactInput.repoPath ? `  repoPath: ${artifactInput.repoPath}` : undefined
          ]
            .filter((value): value is string => Boolean(value))
            .join("\n")
        )
      ].join("\n")
    );
  }

  if (request.memoryRefs.length > 0) {
    sections.push(
      [
        "## Memory References",
        ...request.memoryRefs.map((memoryRef) => `- ${memoryRef}`)
      ].join("\n")
    );
  }

  return sections.join("\n\n");
}

function parseOpenCodeRunEvent(line: string): OpenCodeRunEvent | undefined {
  if (!line.trim().startsWith("{")) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(line) as unknown;
    return isRecord(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

function collectTextMessage(
  event: OpenCodeRunEvent,
  assistantMessages: string[]
): void {
  if (event.type !== "text" || !isRecord(event.part)) {
    return;
  }

  const text = event.part.text;

  if (typeof text === "string" && text.trim()) {
    assistantMessages.push(text.trim());
  }
}

function collectToolExecution(
  event: OpenCodeRunEvent,
  toolExecutions: EngineToolExecutionObservation[]
): void {
  if (event.type !== "tool_use" || !isRecord(event.part)) {
    return;
  }

  const part = event.part;
  const state = isRecord(part.state) ? part.state : {};
  const status = state.status;
  const toolId = typeof part.tool === "string" ? part.tool : "unknown_tool";
  const toolCallId =
    typeof part.id === "string"
      ? part.id
      : `${toolId}-${toolExecutions.length + 1}`;

  toolExecutions.push({
    ...(status === "error"
      ? {
          errorCode: "tool_execution_failed" as const,
          message:
            extractErrorMessage(state.error) ?? "OpenCode tool execution failed."
        }
      : {}),
    outcome: status === "error" ? "error" : "success",
    sequence: toolExecutions.length + 1,
    toolCallId,
    toolId
  });
}

function collectError(event: OpenCodeRunEvent, errors: string[]): void {
  if (event.type !== "error") {
    return;
  }

  const message =
    extractErrorMessage(event.error) ?? "OpenCode emitted an error event.";
  errors.push(message);
}

function processOpenCodeStdoutLine(
  line: string,
  output: {
    assistantMessages: string[];
    engineSessionId: string | undefined;
    errors: string[];
    toolExecutions: EngineToolExecutionObservation[];
  }
): void {
  const event = parseOpenCodeRunEvent(line);

  if (!event) {
    return;
  }

  if (typeof event.sessionID === "string" && event.sessionID.trim()) {
    output.engineSessionId = event.sessionID.trim();
  }

  collectTextMessage(event, output.assistantMessages);
  collectToolExecution(event, output.toolExecutions);
  collectError(event, output.errors);
}

function attachLineReader(
  stream: Readable,
  onLine: (line: string) => void
): () => void {
  let buffer = "";

  stream.on("data", (chunk: Buffer | string) => {
    buffer += chunk.toString();
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      onLine(line);
    }
  });

  return () => {
    if (buffer.trim()) {
      onLine(buffer);
    }
  };
}

function buildOpenCodeArgs(input: {
  context: EffectiveRuntimeContext;
  request: AgentEngineTurnRequest;
  workspace: string;
}): string[] {
  const args = [
    "run",
    "--format=json",
    "--dir",
    input.workspace,
    "--title",
    `${input.request.nodeId}:${input.request.sessionId}`
  ];
  const agent =
    input.context.agentRuntimeContext.defaultAgent ??
    input.context.agentRuntimeContext.engineProfile.defaultAgent;
  const baseUrl = input.context.agentRuntimeContext.engineProfile.baseUrl;

  if (baseUrl) {
    args.push("--attach", baseUrl);
  }

  if (agent) {
    args.push("--agent", agent);
  }

  return args;
}

function buildOpenCodeEnv(input: {
  context: EffectiveRuntimeContext;
  runtimePaths: OpenCodeRuntimePaths;
}): NodeJS.ProcessEnv {
  return {
    ...process.env,
    ENTANGLE_GRAPH_ID: input.context.binding.graphId,
    ENTANGLE_NODE_ID: input.context.binding.node.nodeId,
    ENTANGLE_RUNTIME_PROFILE: input.context.binding.runtimeProfile,
    OPENCODE_CONFIG_DIR: input.runtimePaths.configDir,
    OPENCODE_DB: input.runtimePaths.databasePath,
    OPENCODE_DISABLE_AUTOUPDATE: "true",
    OPENCODE_DISABLE_LSP_DOWNLOAD: "true",
    OPENCODE_TEST_HOME: input.runtimePaths.homeRoot,
    XDG_CACHE_HOME: input.runtimePaths.xdgCacheHome,
    XDG_CONFIG_HOME: input.runtimePaths.xdgConfigHome,
    XDG_DATA_HOME: input.runtimePaths.xdgDataHome,
    XDG_STATE_HOME: input.runtimePaths.xdgStateHome
  };
}

export function createOpenCodeAgentEngine(input: {
  runtimeContext: EffectiveRuntimeContext;
  spawn?: OpenCodeSpawn;
}): AgentEngine {
  const profile = input.runtimeContext.agentRuntimeContext.engineProfile;

  if (profile.kind !== "opencode_server") {
    throw new AgentEngineConfigurationError(
      `Cannot create OpenCode agent engine for profile kind '${profile.kind}'.`
    );
  }

  const executable = profile.executable ?? "opencode";
  const spawn = input.spawn ?? defaultOpenCodeSpawn;

  return {
    async executeTurn(request): Promise<AgentEngineTurnResult> {
      const normalizedRequest = agentEngineTurnRequestSchema.parse(request);
      const workspace = chooseOpenCodeWorkspace(input.runtimeContext);
      const runtimePaths = await prepareOpenCodeRuntime({
        context: input.runtimeContext,
        workspace
      });
      const args = buildOpenCodeArgs({
        context: input.runtimeContext,
        request: normalizedRequest,
        workspace
      });
      const child = spawn(executable, args, {
        cwd: workspace,
        env: buildOpenCodeEnv({
          context: input.runtimeContext,
          runtimePaths
        })
      });
      const output = {
        assistantMessages: [] as string[],
        engineSessionId: undefined as string | undefined,
        errors: [] as string[],
        toolExecutions: [] as EngineToolExecutionObservation[]
      };
      const flushStdout = attachLineReader(child.stdout, (line) =>
        processOpenCodeStdoutLine(line, output)
      );
      let stderr = "";

      child.stderr.on("data", (chunk: Buffer | string) => {
        stderr = truncate(
          `${stderr}${chunk.toString()}`,
          maxCapturedStderrCharacters
        );
      });

      child.stdin.end(buildOpenCodePrompt(normalizedRequest));

      await new Promise<void>((resolve, reject) => {
        child.once("error", (error) => {
          reject(
            new AgentEngineExecutionError(
              `OpenCode engine process failed to start for node '${normalizedRequest.nodeId}'.`,
              {
                cause: error,
                classification: "configuration_error"
              }
            )
          );
        });
        child.once("close", (code, signal) => {
          flushStdout();

          if (code === 0) {
            resolve();
            return;
          }

          reject(
            new AgentEngineExecutionError(
              [
                `OpenCode engine process exited for node '${normalizedRequest.nodeId}'`,
                `code=${code ?? "unknown"}`,
                signal ? `signal=${signal}` : undefined,
                stderr ? `stderr=${stderr}` : undefined
              ]
                .filter((value): value is string => Boolean(value))
                .join("; "),
              {
                classification: "provider_unavailable"
              }
            )
          );
        });
      });

      if (output.errors.length > 0) {
        return agentEngineTurnResultSchema.parse({
          assistantMessages: output.assistantMessages,
          ...(output.engineSessionId
            ? { engineSessionId: output.engineSessionId }
            : {}),
          failure: {
            classification: "unknown_provider_error",
            message: truncate(
              output.errors.join("\n"),
              maxFailureMessageCharacters
            )
          },
          providerStopReason: "opencode_error_event",
          stopReason: "error",
          toolExecutions: output.toolExecutions,
          toolRequests: []
        });
      }

      return agentEngineTurnResultSchema.parse({
        assistantMessages: output.assistantMessages,
        ...(output.engineSessionId
          ? { engineSessionId: output.engineSessionId }
          : {}),
        providerStopReason: "opencode_process_exit_0",
        stopReason: "completed",
        toolExecutions: output.toolExecutions,
        toolRequests: []
      });
    }
  };
}

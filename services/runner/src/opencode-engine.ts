import { spawn as spawnChildProcess } from "node:child_process";
import type {
  ChildProcessWithoutNullStreams,
  SpawnOptionsWithoutStdio
} from "node:child_process";
import { constants as fsConstants } from "node:fs";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Readable } from "node:stream";
import {
  AgentEngineConfigurationError,
  AgentEngineExecutionError,
  type AgentEngine,
  type AgentEnginePermissionResponse,
  type AgentEngineTurnOptions
} from "@entangle/agent-engine";
import {
  agentEngineTurnRequestSchema,
  agentEngineTurnResultSchema,
  engineApprovalRequestDirectiveSchema,
  engineHandoffDirectiveSchema,
  type AgentEngineTurnRequest,
  type AgentEngineTurnResult,
  type EffectiveRuntimeContext,
  type EngineApprovalRequestDirective,
  type EngineHandoffDirective,
  type EnginePermissionObservation,
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

type OpenCodeServerEvent = {
  properties?: unknown;
  type?: unknown;
};

type OpenCodePermissionRequest = {
  always?: unknown;
  id: string;
  metadata?: unknown;
  patterns: string[];
  permission: string;
  sessionID: string;
  tool?: {
    callID?: unknown;
    messageID?: unknown;
  };
};

type OpenCodeHttpJson = Record<string, unknown> | Record<string, unknown>[];

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
const maxCapturedStdoutCharacters = 12_000;
const maxEntangleActionBlockCharacters = 8_000;
const maxEngineVersionCharacters = 200;
const maxFailureMessageCharacters = 1_000;
const maxToolInputSummaryCharacters = 600;
const maxToolOutputSummaryCharacters = 1_000;
const maxToolSummaryArrayEntries = 8;
const maxToolSummaryObjectEntries = 20;
const maxToolSummaryDepth = 4;
const maxToolTitleCharacters = 240;
const defaultOpenCodeProcessTimeoutMs = 120_000;
const opencodeSessionMapFileName = "entangle-opencode-session-map.json";
const opencodeDefaultDeniedPermissions = [
  "question",
  "plan_enter",
  "plan_exit"
] as const;
const opencodeAutoRejectedPermissionPattern =
  /permission requested:\s*([^(;]+?)\s*\((.*?)\);\s*auto-rejecting/i;
const sensitiveSummaryKeyPattern =
  /(authorization|api[_-]?key|credential|password|private[_-]?key|secret|token)/i;
const ansiEscapePattern = new RegExp(
  `${String.fromCharCode(27)}\\[[0-9;?]*[ -/]*[@-~]`,
  "g"
);
const entangleActionBlockPattern =
  /```entangle-actions\s*([\s\S]*?)```/giu;

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

function summarizeToolValue(
  value: unknown,
  maxCharacters: number
): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value === "string") {
    const summary = truncate(value, maxCharacters);
    return summary.length > 0 ? summary : undefined;
  }

  try {
    const summary = truncate(
      JSON.stringify(normalizeToolSummaryValue(value, 0)),
      maxCharacters
    );
    return summary.length > 0 ? summary : undefined;
  } catch {
    const summary = truncate(
      "Unserializable OpenCode tool value.",
      maxCharacters
    );
    return summary.length > 0 ? summary : undefined;
  }
}

function normalizeToolSummaryValue(value: unknown, depth: number): unknown {
  if (value === null || typeof value !== "object") {
    return value;
  }

  if (depth >= maxToolSummaryDepth) {
    return "[nested]";
  }

  if (Array.isArray(value)) {
    const entries = value
      .slice(0, maxToolSummaryArrayEntries)
      .map((entry) => normalizeToolSummaryValue(entry, depth + 1));

    if (value.length > maxToolSummaryArrayEntries) {
      entries.push(`[${value.length - maxToolSummaryArrayEntries} more]`);
    }

    return entries;
  }

  const output: Record<string, unknown> = {};
  const entries = Object.entries(value).slice(0, maxToolSummaryObjectEntries);

  for (const [key, entryValue] of entries) {
    output[key] = sensitiveSummaryKeyPattern.test(key)
      ? "[redacted]"
      : normalizeToolSummaryValue(entryValue, depth + 1);
  }

  const omittedCount = Object.keys(value).length - entries.length;
  if (omittedCount > 0) {
    output.__truncated = `${omittedCount} more keys`;
  }

  return output;
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

function buildOpenCodeSessionMapPath(runtimePaths: OpenCodeRuntimePaths): string {
  return path.join(runtimePaths.engineStateRoot, opencodeSessionMapFileName);
}

async function readOpenCodeSessionMap(
  runtimePaths: OpenCodeRuntimePaths
): Promise<Record<string, string>> {
  const mapPath = buildOpenCodeSessionMapPath(runtimePaths);

  try {
    const raw = await readFile(mapPath, "utf8");
    const parsed = JSON.parse(raw) as unknown;

    if (!isRecord(parsed)) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(parsed).filter(
        (entry): entry is [string, string] =>
          typeof entry[1] === "string" && entry[1].trim().length > 0
      )
    );
  } catch (error) {
    if (
      isRecord(error) &&
      typeof error.code === "string" &&
      error.code === "ENOENT"
    ) {
      return {};
    }

    throw new AgentEngineExecutionError(
      "OpenCode session continuity map could not be read.",
      {
        cause: error,
        classification: "configuration_error"
      }
    );
  }
}

async function findMappedOpenCodeSessionId(input: {
  entangleSessionId: string;
  runtimePaths: OpenCodeRuntimePaths;
}): Promise<string | undefined> {
  const sessionMap = await readOpenCodeSessionMap(input.runtimePaths);
  const mappedSessionId = sessionMap[input.entangleSessionId]?.trim();

  return mappedSessionId && mappedSessionId.length > 0
    ? mappedSessionId
    : undefined;
}

async function writeMappedOpenCodeSessionId(input: {
  entangleSessionId: string;
  openCodeSessionId: string;
  runtimePaths: OpenCodeRuntimePaths;
}): Promise<void> {
  const sessionMap = await readOpenCodeSessionMap(input.runtimePaths);
  sessionMap[input.entangleSessionId] = input.openCodeSessionId;
  await writeFile(
    buildOpenCodeSessionMapPath(input.runtimePaths),
    `${JSON.stringify(sessionMap, null, 2)}\n`,
    "utf8"
  );
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
        "## Materialized Artifact Inputs",
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

function stripAnsiCodes(value: string): string {
  return value.replace(ansiEscapePattern, "");
}

function mapOpenCodePermissionToEngineOperation(
  permission: string,
  patterns: readonly string[]
): EnginePermissionObservation["operation"] {
  const normalizedPermission = permission.trim().toLowerCase();

  if (["glob", "grep", "read"].includes(normalizedPermission)) {
    return "filesystem_read";
  }

  if (["apply_patch", "edit", "write"].includes(normalizedPermission)) {
    return "filesystem_write";
  }

  if (normalizedPermission === "external_directory") {
    return "filesystem_access";
  }

  if (normalizedPermission === "bash") {
    if (patterns.some((pattern) => isGitCommandPattern(pattern, "push"))) {
      return "git_push";
    }

    if (patterns.some((pattern) => isGitCommandPattern(pattern, "commit"))) {
      return "git_commit";
    }

    return "command_execution";
  }

  if (normalizedPermission === "task") {
    return "subagent_execution";
  }

  if (["webfetch", "websearch"].includes(normalizedPermission)) {
    return "network_access";
  }

  if (normalizedPermission === "workflow_tool_approval") {
    return "approval_request";
  }

  return "unknown";
}

function isGitCommandPattern(pattern: string, subcommand: string): boolean {
  const normalizedPattern = pattern.trim().toLowerCase();
  const expectedCommand = `git ${subcommand}`;

  return (
    normalizedPattern === expectedCommand ||
    normalizedPattern.startsWith(`${expectedCommand} `)
  );
}

function collectPermissionObservation(
  line: string,
  permissionObservations: EnginePermissionObservation[]
): void {
  const sanitizedLine = stripAnsiCodes(line);
  const match = sanitizedLine.match(opencodeAutoRejectedPermissionPattern);

  if (!match) {
    return;
  }

  const permission = match[1]?.trim();

  if (!permission) {
    return;
  }

  const patterns = (match[2] ?? "")
    .split(",")
    .map((pattern) => pattern.trim())
    .filter((pattern) => pattern.length > 0);

  permissionObservations.push({
    decision: "rejected",
    operation: mapOpenCodePermissionToEngineOperation(permission, patterns),
    patterns,
    permission,
    reason:
      "OpenCode one-shot CLI auto-rejected the permission request because Entangle has not enabled unsafe bypass or attached approval resumption."
  });
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
    typeof part.callID === "string"
      ? part.callID
      : typeof part.id === "string"
      ? part.id
      : `${toolId}-${toolExecutions.length + 1}`;
  const title =
    typeof state.title === "string"
      ? truncate(state.title, maxToolTitleCharacters)
      : undefined;
  const inputSummary = summarizeToolValue(
    state.input,
    maxToolInputSummaryCharacters
  );
  const outputSummary =
    status === "completed"
      ? summarizeToolValue(state.output, maxToolOutputSummaryCharacters)
      : undefined;
  const durationMs =
    isRecord(state.time) &&
    typeof state.time.start === "number" &&
    typeof state.time.end === "number" &&
    state.time.end >= state.time.start
      ? Math.round(state.time.end - state.time.start)
      : undefined;

  toolExecutions.push({
    ...(durationMs !== undefined ? { durationMs } : {}),
    ...(status === "error"
      ? {
          errorCode: "tool_execution_failed" as const,
          message:
            extractErrorMessage(state.error) ?? "OpenCode tool execution failed."
        }
      : {}),
    ...(inputSummary ? { inputSummary } : {}),
    outcome: status === "error" ? "error" : "success",
    ...(outputSummary ? { outputSummary } : {}),
    sequence: toolExecutions.length + 1,
    ...(title ? { title } : {}),
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

type EntangleActionDirectiveExtraction = {
  assistantMessages: string[];
  approvalRequestDirectives: EngineApprovalRequestDirective[];
  errors: string[];
  handoffDirectives: EngineHandoffDirective[];
};

export function extractEntangleActionDirectives(
  assistantMessages: string[]
): EntangleActionDirectiveExtraction {
  const approvalRequestDirectives: EngineApprovalRequestDirective[] = [];
  const errors: string[] = [];
  const handoffDirectives: EngineHandoffDirective[] = [];
  const sanitizedMessages = assistantMessages
    .map((message) =>
      message.replace(entangleActionBlockPattern, (_match, block: string) => {
        const payload = block.trim();

        if (payload.length > maxEntangleActionBlockCharacters) {
          errors.push("Entangle action block exceeds the bounded parse limit.");
          return "";
        }

        try {
          const parsed = JSON.parse(payload) as unknown;

          if (!isRecord(parsed)) {
            errors.push("Entangle action block must contain a JSON object.");
            return "";
          }

          const hasHandoffDirectives = "handoffDirectives" in parsed;
          const hasApprovalRequestDirectives =
            "approvalRequestDirectives" in parsed;

          if (!hasHandoffDirectives && !hasApprovalRequestDirectives) {
            errors.push(
              "Entangle action block must include handoffDirectives or approvalRequestDirectives."
            );
            return "";
          }

          if (hasHandoffDirectives) {
            const directives = engineHandoffDirectiveSchema.array().safeParse(
              parsed.handoffDirectives
            );

            if (!directives.success) {
              errors.push(
                `Entangle handoff directives are invalid: ${directives.error.issues
                  .map((issue) => issue.message)
                  .join("; ")}`
              );
              return "";
            }

            handoffDirectives.push(...directives.data);
          }

          if (hasApprovalRequestDirectives) {
            const directives = engineApprovalRequestDirectiveSchema
              .array()
              .safeParse(parsed.approvalRequestDirectives);

            if (!directives.success) {
              errors.push(
                `Entangle approval request directives are invalid: ${directives.error.issues
                  .map((issue) => issue.message)
                  .join("; ")}`
              );
              return "";
            }

            approvalRequestDirectives.push(...directives.data);
          }
        } catch (error) {
          errors.push(
            `Entangle action block is not valid JSON: ${extractErrorMessage(error)}`
          );
        }

        return "";
      })
    )
    .map((message) => message.trim())
    .filter((message) => message.length > 0);

  return {
    assistantMessages: sanitizedMessages,
    approvalRequestDirectives,
    errors,
    handoffDirectives
  };
}

function processOpenCodeStdoutLine(
  line: string,
  output: {
    assistantMessages: string[];
    engineSessionId: string | undefined;
    errors: string[];
    permissionObservations: EnginePermissionObservation[];
    toolExecutions: EngineToolExecutionObservation[];
  }
): void {
  collectPermissionObservation(line, output.permissionObservations);

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

function normalizeOpenCodePermissionRequest(
  event: OpenCodeServerEvent
): OpenCodePermissionRequest | undefined {
  if (event.type !== "permission.asked" || !isRecord(event.properties)) {
    return undefined;
  }

  const properties = event.properties;

  if (
    typeof properties.id !== "string" ||
    typeof properties.sessionID !== "string" ||
    typeof properties.permission !== "string" ||
    !Array.isArray(properties.patterns)
  ) {
    return undefined;
  }

  return {
    always: properties.always,
    id: properties.id,
    metadata: properties.metadata,
    patterns: properties.patterns.filter(
      (pattern): pattern is string => typeof pattern === "string"
    ),
    permission: properties.permission,
    sessionID: properties.sessionID,
    ...(isRecord(properties.tool) ? { tool: properties.tool } : {})
  };
}

function processOpenCodeServerEvent(input: {
  event: OpenCodeServerEvent;
  output: {
    assistantMessages: string[];
    engineSessionId: string | undefined;
    errors: string[];
    permissionObservations: EnginePermissionObservation[];
    toolExecutions: EngineToolExecutionObservation[];
  };
  sessionId: string;
}): "idle" | "continue" {
  const { event, output, sessionId } = input;

  if (!isRecord(event.properties)) {
    return "continue";
  }

  if (
    event.type === "session.status" &&
    event.properties.sessionID === sessionId &&
    isRecord(event.properties.status) &&
    event.properties.status.type === "idle"
  ) {
    return "idle";
  }

  if (
    event.type === "session.error" &&
    event.properties.sessionID === sessionId
  ) {
    collectError(
      {
        error: event.properties.error,
        type: "error"
      },
      output.errors
    );
    return "continue";
  }

  if (event.type !== "message.part.updated" || !isRecord(event.properties.part)) {
    return "continue";
  }

  const part = event.properties.part;

  if (part.sessionID !== sessionId) {
    return "continue";
  }

  output.engineSessionId = sessionId;

  if (part.type === "text") {
    collectTextMessage(
      {
        part,
        sessionID: sessionId,
        type: "text"
      },
      output.assistantMessages
    );
    return "continue";
  }

  if (part.type === "tool") {
    collectToolExecution(
      {
        part,
        sessionID: sessionId,
        type: "tool_use"
      },
      output.toolExecutions
    );
  }

  return "continue";
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

function collectStreamText(
  stream: Readable,
  maxCharacters: number
): () => string {
  let output = "";

  stream.on("data", (chunk: Buffer | string) => {
    output = truncate(`${output}${chunk.toString()}`, maxCharacters);
  });

  return () => output;
}

function firstNonEmptyLine(value: string): string | undefined {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.length > 0);
}

function buildOpenCodeServerHeaders(
  env: NodeJS.ProcessEnv
): Record<string, string> {
  const password = env.OPENCODE_SERVER_PASSWORD?.trim();

  if (!password) {
    return {};
  }

  const username = env.OPENCODE_SERVER_USERNAME?.trim() || "opencode";
  const token = Buffer.from(`${username}:${password}`).toString("base64");

  return {
    authorization: `Basic ${token}`
  };
}

function buildOpenCodeHttpHeaders(input: {
  contentType?: string;
  env: NodeJS.ProcessEnv;
  workspace: string;
}): Record<string, string> {
  return {
    ...buildOpenCodeServerHeaders(input.env),
    ...(input.contentType ? { "content-type": input.contentType } : {}),
    "x-opencode-directory": encodeURIComponent(input.workspace)
  };
}

function buildOpenCodeSessionPermissionRules(): Array<{
  action: "deny";
  pattern: string;
  permission: string;
}> {
  return opencodeDefaultDeniedPermissions.map((permission) => ({
    action: "deny",
    pattern: "*",
    permission
  }));
}

function formatOpenCodeEngineVersion(input: {
  cliVersion?: string | undefined;
  serverVersion?: string | undefined;
}): string | undefined {
  if (input.cliVersion && input.serverVersion) {
    return truncate(
      `${input.cliVersion}; server ${input.serverVersion}`,
      maxEngineVersionCharacters
    );
  }

  if (input.cliVersion) {
    return input.cliVersion;
  }

  return input.serverVersion
    ? truncate(`server ${input.serverVersion}`, maxEngineVersionCharacters)
    : undefined;
}

async function waitForOpenCodeProcess(input: {
  abortSignal?: AbortSignal;
  child: OpenCodeProcess;
  flushStdout?: () => void;
  nodeId: string;
  processLabel: string;
  stderr: () => string;
  timeoutMs: number;
}): Promise<void> {
  let settled = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let abortHandler: (() => void) | undefined;

  try {
    await new Promise<void>((resolve, reject) => {
      const settle = (operation: () => void): void => {
        if (settled) {
          return;
        }

        settled = true;
        if (timer) {
          clearTimeout(timer);
        }
        operation();
      };

      const rejectCancelled = (): void => {
        settle(() => {
          input.child.kill("SIGTERM");
          reject(
            new AgentEngineExecutionError(
              `OpenCode ${input.processLabel} was cancelled for node '${input.nodeId}'.`,
              {
                classification: "cancelled"
              }
            )
          );
        });
      };

      timer = setTimeout(() => {
        settle(() => {
          input.child.kill("SIGTERM");
          reject(
            new AgentEngineExecutionError(
              `OpenCode ${input.processLabel} timed out for node '${input.nodeId}' after ${input.timeoutMs}ms.`,
              {
                classification: "provider_unavailable"
              }
            )
          );
        });
      }, input.timeoutMs);
      abortHandler = rejectCancelled;

      if (input.abortSignal?.aborted) {
        rejectCancelled();
        return;
      }

      input.abortSignal?.addEventListener("abort", abortHandler, {
        once: true
      });

      input.child.once("error", (error) => {
        settle(() => {
          reject(
            new AgentEngineExecutionError(
              `OpenCode ${input.processLabel} failed to start for node '${input.nodeId}'.`,
              {
                cause: error,
                classification: "provider_unavailable"
              }
            )
          );
        });
      });
      input.child.once("close", (code, signal) => {
        input.flushStdout?.();

        if (code === 0) {
          settle(resolve);
          return;
        }

        settle(() => {
          const stderr = input.stderr();
          reject(
            new AgentEngineExecutionError(
              [
                `OpenCode ${input.processLabel} exited for node '${input.nodeId}'`,
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
    });
  } finally {
    if (timer) {
      clearTimeout(timer);
    }

    if (abortHandler) {
      input.abortSignal?.removeEventListener("abort", abortHandler);
    }
  }
}

async function probeOpenCodeVersion(input: {
  abortSignal?: AbortSignal;
  env: NodeJS.ProcessEnv;
  executable: string;
  nodeId: string;
  spawn: OpenCodeSpawn;
  timeoutMs: number;
  workspace: string;
}): Promise<string | undefined> {
  const child = input.spawn(input.executable, ["--version"], {
    cwd: input.workspace,
    env: input.env
  });
  const stdout = collectStreamText(child.stdout, maxCapturedStdoutCharacters);
  const stderr = collectStreamText(child.stderr, maxCapturedStderrCharacters);

  child.stdin.end();

  await waitForOpenCodeProcess({
    child,
    ...(input.abortSignal ? { abortSignal: input.abortSignal } : {}),
    nodeId: input.nodeId,
    processLabel: "version probe",
    stderr,
    timeoutMs: input.timeoutMs
  });

  const version = firstNonEmptyLine(stdout()) ?? firstNonEmptyLine(stderr());

  return version ? truncate(version, maxEngineVersionCharacters) : undefined;
}

async function probeOpenCodeServerHealth(input: {
  abortSignal?: AbortSignal;
  baseUrl: string;
  env: NodeJS.ProcessEnv;
  nodeId: string;
  timeoutMs: number;
}): Promise<string | undefined> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), input.timeoutMs);
  const abortHandler = (): void => controller.abort();

  input.abortSignal?.addEventListener("abort", abortHandler, { once: true });

  try {
    const response = await fetch(new URL("/global/health", input.baseUrl), {
      headers: buildOpenCodeServerHeaders(input.env),
      signal: controller.signal
    });
    const body = await response.text();

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${body}`);
    }

    const health = JSON.parse(body) as {
      healthy?: unknown;
      version?: unknown;
    };

    if (health.healthy !== true) {
      throw new Error("OpenCode server did not report healthy: true.");
    }

    return typeof health.version === "string"
      ? truncate(health.version, maxEngineVersionCharacters)
      : undefined;
  } catch (error) {
    if (input.abortSignal?.aborted) {
      throw new AgentEngineExecutionError(
        `OpenCode server health probe was cancelled for node '${input.nodeId}'.`,
        {
          classification: "cancelled"
        }
      );
    }

    throw new AgentEngineExecutionError(
      `OpenCode server '${input.baseUrl}' is not reachable or healthy for node '${input.nodeId}'.`,
      {
        cause: error,
        classification: "provider_unavailable"
      }
    );
  } finally {
    clearTimeout(timeout);
    input.abortSignal?.removeEventListener("abort", abortHandler);
  }
}

function buildOpenCodeUrl(input: {
  baseUrl: string;
  pathname: string;
}): URL {
  return new URL(input.pathname, input.baseUrl);
}

async function fetchOpenCodeJson(input: {
  abortSignal?: AbortSignal;
  baseUrl: string;
  body?: unknown;
  env: NodeJS.ProcessEnv;
  method: "GET" | "POST";
  nodeId: string;
  pathname: string;
  timeoutMs: number;
  workspace: string;
}): Promise<OpenCodeHttpJson> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), input.timeoutMs);
  const abortHandler = (): void => controller.abort();

  input.abortSignal?.addEventListener("abort", abortHandler, { once: true });

  try {
    const response = await fetch(
      buildOpenCodeUrl({
        baseUrl: input.baseUrl,
        pathname: input.pathname
      }),
      {
        ...(input.body === undefined
          ? {}
          : { body: JSON.stringify(input.body) }),
        headers: buildOpenCodeHttpHeaders({
          env: input.env,
          ...(input.body === undefined
            ? {}
            : { contentType: "application/json" }),
          workspace: input.workspace
        }),
        method: input.method,
        signal: controller.signal
      }
    );
    const text = await response.text();

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${text}`);
    }

    if (!text.trim()) {
      return {};
    }

    const parsed = JSON.parse(text) as unknown;

    if (!isRecord(parsed) && !Array.isArray(parsed)) {
      throw new Error("OpenCode response was not a JSON object or array.");
    }

    return parsed as OpenCodeHttpJson;
  } catch (error) {
    if (input.abortSignal?.aborted) {
      throw new AgentEngineExecutionError(
        `OpenCode HTTP request '${input.pathname}' was cancelled for node '${input.nodeId}'.`,
        {
          classification: "cancelled"
        }
      );
    }

    throw new AgentEngineExecutionError(
      `OpenCode HTTP request '${input.pathname}' failed for node '${input.nodeId}'.`,
      {
        cause: error,
        classification: "provider_unavailable"
      }
    );
  } finally {
    clearTimeout(timeout);
    input.abortSignal?.removeEventListener("abort", abortHandler);
  }
}

async function createOpenCodeServerSession(input: {
  abortSignal?: AbortSignal;
  baseUrl: string;
  env: NodeJS.ProcessEnv;
  nodeId: string;
  request: AgentEngineTurnRequest;
  timeoutMs: number;
  workspace: string;
}): Promise<string> {
  const response = await fetchOpenCodeJson({
    ...(input.abortSignal ? { abortSignal: input.abortSignal } : {}),
    baseUrl: input.baseUrl,
    body: {
      permission: buildOpenCodeSessionPermissionRules(),
      title: `${input.request.nodeId}:${input.request.sessionId}`
    },
    env: input.env,
    method: "POST",
    nodeId: input.nodeId,
    pathname: "/session",
    timeoutMs: input.timeoutMs,
    workspace: input.workspace
  });

  if (isRecord(response) && typeof response.id === "string") {
    return response.id;
  }

  throw new AgentEngineExecutionError(
    `OpenCode server did not return a session id for node '${input.nodeId}'.`,
    {
      classification: "provider_unavailable"
    }
  );
}

function parseOpenCodeServerEventPayload(payload: string): OpenCodeServerEvent | undefined {
  if (!payload.trim()) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(payload) as unknown;
    if (!isRecord(parsed)) {
      return undefined;
    }

    const candidate = isRecord(parsed.payload) ? parsed.payload : parsed;
    return isRecord(candidate) ? candidate : undefined;
  } catch {
    return undefined;
  }
}

function extractSseDataFrames(buffer: string): {
  frames: string[];
  remainder: string;
} {
  const frames: string[] = [];
  const chunks = buffer.split(/\r?\n\r?\n/);
  const remainder = chunks.pop() ?? "";

  for (const chunk of chunks) {
    const data = chunk
      .split(/\r?\n/)
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice("data:".length).trimStart())
      .join("\n");

    if (data.trim()) {
      frames.push(data);
    }
  }

  return {
    frames,
    remainder
  };
}

async function consumeOpenCodeEventStream(input: {
  abortSignal?: AbortSignal;
  baseUrl: string;
  env: NodeJS.ProcessEnv;
  nodeId: string;
  onEvent: (event: OpenCodeServerEvent) => Promise<boolean> | boolean;
  timeoutMs: number;
  workspace: string;
}): Promise<void> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), input.timeoutMs);
  const abortHandler = (): void => controller.abort();

  input.abortSignal?.addEventListener("abort", abortHandler, { once: true });

  try {
    const response = await fetch(
      buildOpenCodeUrl({
        baseUrl: input.baseUrl,
        pathname: "/event"
      }),
      {
        headers: buildOpenCodeHttpHeaders({
          env: input.env,
          workspace: input.workspace
        }),
        signal: controller.signal
      }
    );

    if (!response.ok || !response.body) {
      throw new Error(
        `HTTP ${response.status}: ${await response.text().catch(() => "")}`
      );
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const readResult = (await reader.read()) as unknown;

      if (!isRecord(readResult)) {
        throw new Error("OpenCode event stream returned an invalid chunk.");
      }

      if (readResult.done === true) {
        break;
      }

      if (!(readResult.value instanceof Uint8Array)) {
        throw new Error("OpenCode event stream returned a non-binary chunk.");
      }

      buffer += decoder.decode(readResult.value, { stream: true });
      const extracted = extractSseDataFrames(buffer);
      buffer = extracted.remainder;

      for (const frame of extracted.frames) {
        const event = parseOpenCodeServerEventPayload(frame);

        if (!event) {
          continue;
        }

        const shouldContinue = await input.onEvent(event);
        if (!shouldContinue) {
          await reader.cancel().catch(() => undefined);
          return;
        }
      }
    }
  } catch (error) {
    if (input.abortSignal?.aborted) {
      throw new AgentEngineExecutionError(
        `OpenCode event stream was cancelled for node '${input.nodeId}'.`,
        {
          classification: "cancelled"
        }
      );
    }

    throw new AgentEngineExecutionError(
      `OpenCode event stream failed for node '${input.nodeId}'.`,
      {
        cause: error,
        classification: "provider_unavailable"
      }
    );
  } finally {
    clearTimeout(timeout);
    input.abortSignal?.removeEventListener("abort", abortHandler);
  }
}

function buildOpenCodeArgs(input: {
  context: EffectiveRuntimeContext;
  mappedSessionId?: string | undefined;
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

  if (input.mappedSessionId) {
    args.push("--session", input.mappedSessionId);
  }

  if (
    input.context.agentRuntimeContext.engineProfile.permissionMode ===
    "auto_approve"
  ) {
    args.push("--dangerously-skip-permissions");
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

function buildOpenCodePermissionReason(
  request: OpenCodePermissionRequest
): string {
  const patterns =
    request.patterns.length > 0
      ? ` (${request.patterns.join(", ")})`
      : "";

  return `OpenCode requested permission '${request.permission}'${patterns}.`;
}

function mapEnginePermissionResponseToOpenCodeReply(
  response: AgentEnginePermissionResponse
): "once" | "reject" {
  return response.decision === "approved" ? "once" : "reject";
}

async function answerOpenCodePermission(input: {
  baseUrl: string;
  env: NodeJS.ProcessEnv;
  nodeId: string;
  permissionRequest: OpenCodePermissionRequest;
  response: AgentEnginePermissionResponse;
  timeoutMs: number;
  workspace: string;
  abortSignal?: AbortSignal;
}): Promise<void> {
  await fetchOpenCodeJson({
    ...(input.abortSignal ? { abortSignal: input.abortSignal } : {}),
    baseUrl: input.baseUrl,
    body: {
      ...(input.response.message ? { message: input.response.message } : {}),
      reply: mapEnginePermissionResponseToOpenCodeReply(input.response)
    },
    env: input.env,
    method: "POST",
    nodeId: input.nodeId,
    pathname: `/permission/${encodeURIComponent(
      input.permissionRequest.id
    )}/reply`,
    timeoutMs: input.timeoutMs,
    workspace: input.workspace
  });
}

async function resolveOpenCodePermission(input: {
  context: EffectiveRuntimeContext;
  output: {
    permissionObservations: EnginePermissionObservation[];
  };
  permissionRequest: OpenCodePermissionRequest;
  turnOptions?: AgentEngineTurnOptions | undefined;
}): Promise<AgentEnginePermissionResponse> {
  const operation = mapOpenCodePermissionToEngineOperation(
    input.permissionRequest.permission,
    input.permissionRequest.patterns
  );
  const reason = buildOpenCodePermissionReason(input.permissionRequest);

  if (
    input.context.agentRuntimeContext.engineProfile.permissionMode ===
    "auto_approve"
  ) {
    const response: AgentEnginePermissionResponse = {
      decision: "approved",
      message: "OpenCode permission was automatically approved by engine profile."
    };
    input.output.permissionObservations.push({
      decision: "allowed",
      operation,
      patterns: input.permissionRequest.patterns,
      permission: input.permissionRequest.permission,
      reason: response.message
    });
    return response;
  }

  if (
    input.context.agentRuntimeContext.engineProfile.permissionMode !==
    "entangle_approval" ||
    !input.turnOptions?.requestPermission
  ) {
    const response: AgentEnginePermissionResponse = {
      decision: "rejected",
      message:
        "OpenCode permission was rejected because the engine profile is not configured for Entangle approval bridging."
    };
    input.output.permissionObservations.push({
      decision: "rejected",
      operation,
      patterns: input.permissionRequest.patterns,
      permission: input.permissionRequest.permission,
      reason: response.message
    });
    return response;
  }

  input.output.permissionObservations.push({
    decision: "pending",
    operation,
    patterns: input.permissionRequest.patterns,
    permission: input.permissionRequest.permission,
    reason
  });

  const response = await input.turnOptions.requestPermission({
    ...(isRecord(input.permissionRequest.metadata)
      ? { metadata: input.permissionRequest.metadata }
      : {}),
    operation,
    patterns: input.permissionRequest.patterns,
    permission: input.permissionRequest.permission,
    reason,
    ...(typeof input.permissionRequest.tool?.callID === "string"
      ? { toolCallId: input.permissionRequest.tool.callID }
      : {})
  });
  input.output.permissionObservations.push({
    decision: response.decision === "approved" ? "allowed" : "rejected",
    operation,
    patterns: input.permissionRequest.patterns,
    permission: input.permissionRequest.permission,
    reason: response.message ?? reason
  });

  return response;
}

function buildOpenCodeTurnResult(input: {
  engineSessionId?: string | undefined;
  engineVersion?: string | undefined;
  output: {
    assistantMessages: string[];
    errors: string[];
    permissionObservations: EnginePermissionObservation[];
    toolExecutions: EngineToolExecutionObservation[];
  };
  providerStopReason: string;
}): AgentEngineTurnResult {
  const rejectedPermissions = input.output.permissionObservations.filter(
    (permissionObservation) =>
      permissionObservation.decision === "denied" ||
      permissionObservation.decision === "rejected"
  );
  const actionDirectives = extractEntangleActionDirectives(
    input.output.assistantMessages
  );

  if (actionDirectives.errors.length > 0) {
    return agentEngineTurnResultSchema.parse({
      assistantMessages:
        actionDirectives.assistantMessages.length > 0
          ? actionDirectives.assistantMessages
          : input.output.assistantMessages,
      ...(input.engineVersion ? { engineVersion: input.engineVersion } : {}),
      ...(input.engineSessionId
        ? { engineSessionId: input.engineSessionId }
        : {}),
      failure: {
        classification: "bad_request",
        message: truncate(
          actionDirectives.errors.join("\n"),
          maxFailureMessageCharacters
        )
      },
      permissionObservations: input.output.permissionObservations,
      providerStopReason: "entangle_action_directive_parse_error",
      stopReason: "error",
      toolExecutions: input.output.toolExecutions,
      toolRequests: []
    });
  }

  if (rejectedPermissions.length > 0) {
    const permissionSummary = rejectedPermissions
      .map((permissionObservation) => {
        const patterns =
          permissionObservation.patterns.length > 0
            ? ` (${permissionObservation.patterns.join(", ")})`
            : "";

        return `${permissionObservation.permission}${patterns}`;
      })
      .join("; ");

    return agentEngineTurnResultSchema.parse({
      assistantMessages: actionDirectives.assistantMessages,
      ...(input.engineVersion ? { engineVersion: input.engineVersion } : {}),
      ...(input.engineSessionId
        ? { engineSessionId: input.engineSessionId }
        : {}),
      failure: {
        classification: "policy_denied",
        message: truncate(
          `OpenCode requested permission and Entangle rejected it: ${permissionSummary}.`,
          maxFailureMessageCharacters
        )
      },
      permissionObservations: input.output.permissionObservations,
      providerStopReason: "opencode_permission_rejected",
      stopReason: "error",
      toolExecutions: input.output.toolExecutions,
      toolRequests: []
    });
  }

  if (input.output.errors.length > 0) {
    return agentEngineTurnResultSchema.parse({
      assistantMessages: actionDirectives.assistantMessages,
      ...(input.engineVersion ? { engineVersion: input.engineVersion } : {}),
      ...(input.engineSessionId
        ? { engineSessionId: input.engineSessionId }
        : {}),
      failure: {
        classification: "unknown_provider_error",
        message: truncate(
          input.output.errors.join("\n"),
          maxFailureMessageCharacters
        )
      },
      permissionObservations: input.output.permissionObservations,
      providerStopReason: "opencode_error_event",
      stopReason: "error",
      toolExecutions: input.output.toolExecutions,
      toolRequests: []
    });
  }

  return agentEngineTurnResultSchema.parse({
    assistantMessages: actionDirectives.assistantMessages,
    approvalRequestDirectives: actionDirectives.approvalRequestDirectives,
    ...(input.engineVersion ? { engineVersion: input.engineVersion } : {}),
    ...(input.engineSessionId ? { engineSessionId: input.engineSessionId } : {}),
    handoffDirectives: actionDirectives.handoffDirectives,
    permissionObservations: input.output.permissionObservations,
    providerStopReason: input.providerStopReason,
    stopReason: "completed",
    toolExecutions: input.output.toolExecutions,
    toolRequests: []
  });
}

async function executeOpenCodeServerTurn(input: {
  abortSignal?: AbortSignal;
  baseUrl: string;
  context: EffectiveRuntimeContext;
  env: NodeJS.ProcessEnv;
  mappedSessionId?: string | undefined;
  nodeId: string;
  request: AgentEngineTurnRequest;
  runtimePaths: OpenCodeRuntimePaths;
  serverVersion?: string | undefined;
  timeoutMs: number;
  turnOptions?: AgentEngineTurnOptions | undefined;
  workspace: string;
}): Promise<AgentEngineTurnResult> {
  const sessionId =
    input.mappedSessionId ??
    (await createOpenCodeServerSession({
      ...(input.abortSignal ? { abortSignal: input.abortSignal } : {}),
      baseUrl: input.baseUrl,
      env: input.env,
      nodeId: input.nodeId,
      request: input.request,
      timeoutMs: input.timeoutMs,
      workspace: input.workspace
    }));
  const output = {
    assistantMessages: [] as string[],
    engineSessionId: sessionId,
    errors: [] as string[],
    permissionObservations: [] as EnginePermissionObservation[],
    toolExecutions: [] as EngineToolExecutionObservation[]
  };
  const eventAbortController = new AbortController();
  const upstreamAbortHandler = (): void => eventAbortController.abort();
  input.abortSignal?.addEventListener("abort", upstreamAbortHandler, {
    once: true
  });
  const eventStream = consumeOpenCodeEventStream({
    abortSignal: eventAbortController.signal,
    baseUrl: input.baseUrl,
    env: input.env,
    nodeId: input.nodeId,
    onEvent: async (event) => {
      const permissionRequest = normalizeOpenCodePermissionRequest(event);

      if (permissionRequest && permissionRequest.sessionID === sessionId) {
        const response = await resolveOpenCodePermission({
          context: input.context,
          output,
          permissionRequest,
          turnOptions: input.turnOptions
        });
        await answerOpenCodePermission({
          ...(input.abortSignal ? { abortSignal: input.abortSignal } : {}),
          baseUrl: input.baseUrl,
          env: input.env,
          nodeId: input.nodeId,
          permissionRequest,
          response,
          timeoutMs: input.timeoutMs,
          workspace: input.workspace
        });
      }

      return (
        processOpenCodeServerEvent({
          event,
          output,
          sessionId
        }) !== "idle"
      );
    },
    timeoutMs: input.timeoutMs,
    workspace: input.workspace
  });

  try {
    await fetchOpenCodeJson({
      ...(input.abortSignal ? { abortSignal: input.abortSignal } : {}),
      baseUrl: input.baseUrl,
      body: {
        ...(input.context.agentRuntimeContext.defaultAgent ??
        input.context.agentRuntimeContext.engineProfile.defaultAgent
          ? {
              agent:
                input.context.agentRuntimeContext.defaultAgent ??
                input.context.agentRuntimeContext.engineProfile.defaultAgent
            }
          : {}),
        parts: [
          {
            text: buildOpenCodePrompt(input.request),
            type: "text"
          }
        ]
      },
      env: input.env,
      method: "POST",
      nodeId: input.nodeId,
      pathname: `/session/${encodeURIComponent(sessionId)}/prompt_async`,
      timeoutMs: input.timeoutMs,
      workspace: input.workspace
    });

    await eventStream;
  } catch (error) {
    eventAbortController.abort();
    await eventStream.catch(() => undefined);
    throw error;
  } finally {
    input.abortSignal?.removeEventListener("abort", upstreamAbortHandler);
  }

  await writeMappedOpenCodeSessionId({
    entangleSessionId: input.request.sessionId,
    openCodeSessionId: sessionId,
    runtimePaths: input.runtimePaths
  });

  return buildOpenCodeTurnResult({
    engineSessionId: sessionId,
    engineVersion: formatOpenCodeEngineVersion({
      serverVersion: input.serverVersion
    }),
    output,
    providerStopReason: "opencode_server_idle"
  });
}

export function createOpenCodeAgentEngine(input: {
  processTimeoutMs?: number;
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
  const processTimeoutMs =
    input.processTimeoutMs ?? defaultOpenCodeProcessTimeoutMs;
  const spawn = input.spawn ?? defaultOpenCodeSpawn;

  return {
    async executeTurn(
      request,
      options?: AgentEngineTurnOptions
    ): Promise<AgentEngineTurnResult> {
      const normalizedRequest = agentEngineTurnRequestSchema.parse(request);
      if (options?.abortSignal?.aborted) {
        throw new AgentEngineExecutionError(
          `OpenCode run was cancelled before launch for node '${normalizedRequest.nodeId}'.`,
          {
            classification: "cancelled"
          }
        );
      }

      const workspace = chooseOpenCodeWorkspace(input.runtimeContext);
      const runtimePaths = await prepareOpenCodeRuntime({
        context: input.runtimeContext,
        workspace
      });
      const mappedSessionId = await findMappedOpenCodeSessionId({
        entangleSessionId: normalizedRequest.sessionId,
        runtimePaths
      });
      const env = buildOpenCodeEnv({
        context: input.runtimeContext,
        runtimePaths
      });
      const serverVersion = profile.baseUrl
        ? await probeOpenCodeServerHealth({
            baseUrl: profile.baseUrl,
            env,
            nodeId: normalizedRequest.nodeId,
            timeoutMs: processTimeoutMs,
            ...(options?.abortSignal
              ? { abortSignal: options.abortSignal }
              : {})
          })
        : undefined;

      if (profile.baseUrl) {
        return executeOpenCodeServerTurn({
          ...(options?.abortSignal ? { abortSignal: options.abortSignal } : {}),
          baseUrl: profile.baseUrl,
          context: input.runtimeContext,
          env,
          ...(mappedSessionId ? { mappedSessionId } : {}),
          nodeId: normalizedRequest.nodeId,
          request: normalizedRequest,
          runtimePaths,
          ...(serverVersion ? { serverVersion } : {}),
          timeoutMs: processTimeoutMs,
          ...(options ? { turnOptions: options } : {}),
          workspace
        });
      }

      const args = buildOpenCodeArgs({
        context: input.runtimeContext,
        ...(mappedSessionId ? { mappedSessionId } : {}),
        request: normalizedRequest,
        workspace
      });
      const cliVersion = await probeOpenCodeVersion({
        env,
        executable,
        nodeId: normalizedRequest.nodeId,
        spawn,
        timeoutMs: processTimeoutMs,
        ...(options?.abortSignal ? { abortSignal: options.abortSignal } : {}),
        workspace
      });
      const engineVersion = formatOpenCodeEngineVersion({
        cliVersion
      });
      const child = spawn(executable, args, {
        cwd: workspace,
        env
      });
      const output = {
        assistantMessages: [] as string[],
        engineSessionId: undefined as string | undefined,
        errors: [] as string[],
        permissionObservations: [] as EnginePermissionObservation[],
        toolExecutions: [] as EngineToolExecutionObservation[]
      };
      const flushStdout = attachLineReader(child.stdout, (line) =>
        processOpenCodeStdoutLine(line, output)
      );
      const stderr = collectStreamText(
        child.stderr,
        maxCapturedStderrCharacters
      );

      child.stdin.end(buildOpenCodePrompt(normalizedRequest));

      await waitForOpenCodeProcess({
        child,
        flushStdout,
        nodeId: normalizedRequest.nodeId,
        processLabel: "run process",
        stderr,
        ...(options?.abortSignal ? { abortSignal: options.abortSignal } : {}),
        timeoutMs: processTimeoutMs
      });

      if (output.engineSessionId) {
        await writeMappedOpenCodeSessionId({
          entangleSessionId: normalizedRequest.sessionId,
          openCodeSessionId: output.engineSessionId,
          runtimePaths
        });
      }

      return buildOpenCodeTurnResult({
        ...(output.engineSessionId ? { engineSessionId: output.engineSessionId } : {}),
        ...(engineVersion ? { engineVersion } : {}),
        output,
        providerStopReason: "opencode_process_exit_0"
      });
    }
  };
}

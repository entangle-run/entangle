import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { spawnSync, type SpawnSyncReturns } from "node:child_process";
import {
  currentLocalStateLayoutVersion,
  localStateLayoutRecordSchema,
  minimumSupportedLocalStateLayoutVersion,
  type ExternalPrincipalListResponse,
  type HostStatusResponse,
  type RuntimeContextInspectionResponse,
  type RuntimeInspectionResponse,
  type RuntimeListResponse
} from "@entangle/types";

export type LocalDoctorCheckStatus = "pass" | "warn" | "fail";
export type LocalDoctorOverallStatus = LocalDoctorCheckStatus;

export interface LocalDoctorCheck {
  category: string;
  detail: string;
  remediation?: string | undefined;
  status: LocalDoctorCheckStatus;
  summary: string;
}

export interface LocalDoctorReport {
  checks: LocalDoctorCheck[];
  generatedAt: string;
  status: LocalDoctorOverallStatus;
  summary: {
    fail: number;
    pass: number;
    warn: number;
  };
}

export interface LocalDoctorOptions {
  giteaUrl?: string | undefined;
  hostUrl?: string | undefined;
  relayUrl?: string | undefined;
  repositoryRoot: string;
  runnerImage?: string | undefined;
  skipLive?: boolean | undefined;
  strict?: boolean | undefined;
  studioUrl?: string | undefined;
}

interface LocalDoctorHostClient {
  getRuntimeContext(nodeId: string): Promise<RuntimeContextInspectionResponse>;
  getHostStatus(): Promise<HostStatusResponse>;
  listExternalPrincipals(): Promise<ExternalPrincipalListResponse>;
  listRuntimes(): Promise<RuntimeListResponse>;
}

export interface LocalDoctorDeps {
  commandRunner?: (
    command: string,
    args: string[],
    options: { cwd: string }
  ) => Pick<SpawnSyncReturns<string>, "error" | "signal" | "status" | "stderr" | "stdout">;
  connectWebSocket?: (url: string) => Promise<string>;
  fileExists?: (filePath: string) => boolean;
  fetchUrl?: (url: string) => Promise<string>;
  hostClient?: LocalDoctorHostClient;
  now?: () => Date;
  readFile?: (filePath: string) => string;
}

const localProfileComposeFile = "deploy/local/compose/docker-compose.local.yml";

const requiredLocalProfilePaths = [
  localProfileComposeFile,
  "deploy/local/config/nginx.studio.conf",
  "deploy/local/config/strfry.local.conf",
  "deploy/local/docker/host.Dockerfile",
  "deploy/local/docker/runner.Dockerfile",
  "deploy/local/docker/studio.Dockerfile",
  "package.json",
  "pnpm-lock.yaml"
];

function normalizeCommandOutput(
  result: Pick<SpawnSyncReturns<string>, "error" | "signal" | "status" | "stderr" | "stdout">
): string {
  const stderr = (result.stderr ?? "").trim();
  const stdout = (result.stdout ?? "").trim();
  const output =
    result.status === 0 || stderr.length === 0
      ? `${stdout}${stderr}`.trim()
      : stderr;

  if (output.length > 0) {
    return output.split("\n")[0] ?? output;
  }

  if (result.error) {
    return result.error.message;
  }

  if (result.signal) {
    return `terminated by ${result.signal}`;
  }

  return "no output";
}

function runCommand(
  deps: Required<Pick<LocalDoctorDeps, "commandRunner">>,
  options: LocalDoctorOptions,
  command: string,
  args: string[]
) {
  return deps.commandRunner(command, args, {
    cwd: options.repositoryRoot
  });
}

function addCheck(checks: LocalDoctorCheck[], check: LocalDoctorCheck): void {
  checks.push(check);
}

function optionalFailureStatus(strict: boolean | undefined): LocalDoctorCheckStatus {
  return strict ? "fail" : "warn";
}

function buildLocalStateLayoutCheck(input: {
  fileExists: NonNullable<LocalDoctorDeps["fileExists"]>;
  hostStateFound: boolean;
  options: LocalDoctorOptions;
  readFile: NonNullable<LocalDoctorDeps["readFile"]>;
}): LocalDoctorCheck {
  const stateLayoutPath = path.join(
    input.options.repositoryRoot,
    ".entangle",
    "host",
    "state-layout.json"
  );

  if (!input.hostStateFound) {
    return {
      category: "state",
      detail: "no .entangle/host yet",
      remediation: "Start entangle-host once to initialize Local state.",
      status: "warn",
      summary: "Local state layout"
    };
  }

  if (!input.fileExists(stateLayoutPath)) {
    return {
      category: "state",
      detail: "missing .entangle/host/state-layout.json",
      remediation: "Start the upgraded entangle-host once to stamp the current Local state layout.",
      status: "warn",
      summary: "Local state layout"
    };
  }

  let rawRecord: unknown;
  try {
    rawRecord = JSON.parse(input.readFile(stateLayoutPath));
  } catch (error) {
    return {
      category: "state",
      detail:
        error instanceof Error ? error.message : "state layout record is unreadable",
      remediation: "Inspect .entangle/host/state-layout.json before starting Entangle Local.",
      status: "fail",
      summary: "Local state layout"
    };
  }

  const parseResult = localStateLayoutRecordSchema.safeParse(rawRecord);
  if (!parseResult.success) {
    return {
      category: "state",
      detail: "state layout record does not match the Entangle Local schema",
      remediation: "Back up .entangle/host, then inspect or repair state-layout.json.",
      status: "fail",
      summary: "Local state layout"
    };
  }

  const record = parseResult.data;
  if (record.layoutVersion > currentLocalStateLayoutVersion) {
    return {
      category: "state",
      detail: `layout ${record.layoutVersion} is newer than supported layout ${currentLocalStateLayoutVersion}`,
      remediation: "Upgrade Entangle before using this Local state directory.",
      status: "fail",
      summary: "Local state layout"
    };
  }

  if (record.layoutVersion < minimumSupportedLocalStateLayoutVersion) {
    return {
      category: "state",
      detail: `layout ${record.layoutVersion} is older than minimum supported layout ${minimumSupportedLocalStateLayoutVersion}`,
      remediation: "Use a compatible Entangle version or restore a supported Local state backup.",
      status: "fail",
      summary: "Local state layout"
    };
  }

  if (record.layoutVersion < currentLocalStateLayoutVersion) {
    return {
      category: "state",
      detail: `layout ${record.layoutVersion} can be upgraded to ${currentLocalStateLayoutVersion}`,
      remediation: "Back up .entangle/host, then start entangle-host to run the layout upgrade.",
      status: "warn",
      summary: "Local state layout"
    };
  }

  return {
    category: "state",
    detail: `layout ${record.layoutVersion} current`,
    status: "pass",
    summary: "Local state layout"
  };
}

function classifyLiveStateLayoutStatus(
  status: HostStatusResponse["stateLayout"]["status"]
): LocalDoctorCheckStatus {
  if (status === "current") {
    return "pass";
  }

  if (
    status === "unsupported_future" ||
    status === "unsupported_legacy" ||
    status === "unreadable"
  ) {
    return "fail";
  }

  return "warn";
}

function checkCommand(input: {
  args: string[];
  category: string;
  checks: LocalDoctorCheck[];
  command: string;
  deps: Required<Pick<LocalDoctorDeps, "commandRunner">>;
  options: LocalDoctorOptions;
  remediation: string;
  summary: string;
  required?: boolean;
}): boolean {
  const result = runCommand(input.deps, input.options, input.command, input.args);
  const detail = normalizeCommandOutput(result);

  if (result.status === 0) {
    addCheck(input.checks, {
      category: input.category,
      detail,
      status: "pass",
      summary: input.summary
    });
    return true;
  }

  addCheck(input.checks, {
    category: input.category,
    detail,
    remediation: input.remediation,
    status: input.required ? "fail" : optionalFailureStatus(input.options.strict),
    summary: input.summary
  });
  return false;
}

function sanitizeRuntimePath(
  message: string,
  context: RuntimeContextInspectionResponse
): string {
  const replacements = [
    [context.workspace.wikiRepositoryRoot, "<wiki_repository>"],
    [context.workspace.memoryRoot, "<memory>"],
    [context.workspace.runtimeRoot, "<runtime_state>"],
    [context.workspace.root, "<workspace>"]
  ].filter((entry): entry is [string, string] => Boolean(entry[0]));

  return replacements.reduce(
    (current, [target, replacement]) => current.replaceAll(target, replacement),
    message
  );
}

type RuntimeWikiRepositoryInspection =
  | {
      branch: string;
      commit: string;
      nodeId: string;
      status: "clean";
    }
  | {
      detail: string;
      nodeId: string;
      status:
        | "context_unavailable"
        | "dirty"
        | "git_error"
        | "not_configured"
        | "not_initialized"
        | "without_commit";
    };

function formatWikiRepositoryIssue(
  inspection: Exclude<RuntimeWikiRepositoryInspection, { status: "clean" }>
): string {
  return `${inspection.status}: ${inspection.nodeId} (${inspection.detail})`;
}

async function inspectRuntimeWikiRepository(input: {
  commandRunner: NonNullable<LocalDoctorDeps["commandRunner"]>;
  fileExists: NonNullable<LocalDoctorDeps["fileExists"]>;
  hostClient: LocalDoctorHostClient;
  options: LocalDoctorOptions;
  runtime: RuntimeInspectionResponse;
}): Promise<RuntimeWikiRepositoryInspection> {
  if (!input.runtime.contextAvailable) {
    return {
      detail: "runtime context is not available from the host",
      nodeId: input.runtime.nodeId,
      status: "context_unavailable"
    };
  }

  let context: RuntimeContextInspectionResponse;
  try {
    context = await input.hostClient.getRuntimeContext(input.runtime.nodeId);
  } catch (error) {
    return {
      detail:
        error instanceof Error ? error.message : "runtime context request failed",
      nodeId: input.runtime.nodeId,
      status: "context_unavailable"
    };
  }

  const wikiRepositoryRoot = context.workspace.wikiRepositoryRoot;
  if (!wikiRepositoryRoot) {
    return {
      detail: "runtime context does not define wikiRepositoryRoot",
      nodeId: input.runtime.nodeId,
      status: "not_configured"
    };
  }

  if (!input.fileExists(path.join(wikiRepositoryRoot, ".git"))) {
    return {
      detail: "wiki repository has not been initialized yet",
      nodeId: input.runtime.nodeId,
      status: "not_initialized"
    };
  }

  const statusResult = input.commandRunner(
    "git",
    ["-C", wikiRepositoryRoot, "status", "--porcelain"],
    { cwd: input.options.repositoryRoot }
  );
  if (statusResult.status !== 0) {
    return {
      detail: sanitizeRuntimePath(normalizeCommandOutput(statusResult), context),
      nodeId: input.runtime.nodeId,
      status: "git_error"
    };
  }

  const dirtyFiles = (statusResult.stdout ?? "")
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);
  if (dirtyFiles.length > 0) {
    return {
      detail: `${dirtyFiles.length} uncommitted changes`,
      nodeId: input.runtime.nodeId,
      status: "dirty"
    };
  }

  const branchResult = input.commandRunner(
    "git",
    ["-C", wikiRepositoryRoot, "rev-parse", "--abbrev-ref", "HEAD"],
    { cwd: input.options.repositoryRoot }
  );
  if (branchResult.status !== 0) {
    return {
      detail: sanitizeRuntimePath(normalizeCommandOutput(branchResult), context),
      nodeId: input.runtime.nodeId,
      status: "git_error"
    };
  }

  const commitResult = input.commandRunner(
    "git",
    ["-C", wikiRepositoryRoot, "rev-parse", "--verify", "HEAD"],
    { cwd: input.options.repositoryRoot }
  );
  if (commitResult.status !== 0) {
    return {
      detail: "wiki repository has no committed snapshot",
      nodeId: input.runtime.nodeId,
      status: "without_commit"
    };
  }

  return {
    branch: (branchResult.stdout ?? "").trim(),
    commit: (commitResult.stdout ?? "").trim(),
    nodeId: input.runtime.nodeId,
    status: "clean"
  };
}

async function addRuntimeWikiRepositoryChecks(input: {
  checks: LocalDoctorCheck[];
  commandRunner: NonNullable<LocalDoctorDeps["commandRunner"]>;
  fileExists: NonNullable<LocalDoctorDeps["fileExists"]>;
  hostClient: LocalDoctorHostClient;
  options: LocalDoctorOptions;
  runtimes: RuntimeInspectionResponse[];
}): Promise<void> {
  const inspections = await Promise.all(
    input.runtimes.map((runtime) =>
      inspectRuntimeWikiRepository({
        commandRunner: input.commandRunner,
        fileExists: input.fileExists,
        hostClient: input.hostClient,
        options: input.options,
        runtime
      })
    )
  );
  const issues = inspections.filter(
    (
      inspection
    ): inspection is Exclude<RuntimeWikiRepositoryInspection, { status: "clean" }> =>
      inspection.status !== "clean"
  );

  addCheck(input.checks, {
    category: "workspace",
    detail:
      issues.length === 0
        ? `${inspections.length} wiki repositories clean`
        : issues.slice(0, 5).map(formatWikiRepositoryIssue).join("; "),
    remediation:
      issues.length > 0
        ? "Run a node turn to initialize wiki snapshots, then inspect runtime turns or repair the runtime wiki repository."
        : undefined,
    status: issues.length === 0 ? "pass" : "warn",
    summary: "Runtime wiki repositories"
  });
}

async function defaultFetchUrl(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2_000);

  try {
    const response = await fetch(url, {
      signal: controller.signal
    });

    return `${response.status} ${response.statusText}`.trim();
  } finally {
    clearTimeout(timeout);
  }
}

type MinimalWebSocket = {
  close(code?: number, reason?: string): void;
  onerror: (() => void) | null;
  onopen: (() => void) | null;
};

type MinimalWebSocketConstructor = new (url: string) => MinimalWebSocket;

async function defaultConnectWebSocket(url: string): Promise<string> {
  const WebSocketCtor = (
    globalThis as typeof globalThis & {
      WebSocket?: MinimalWebSocketConstructor;
    }
  ).WebSocket;

  if (!WebSocketCtor) {
    throw new Error("WebSocket is not available in this Node runtime.");
  }

  return new Promise((resolve, reject) => {
    const socket = new WebSocketCtor(url);
    const timeout = setTimeout(() => {
      socket.close(1000, "entangle local doctor timeout");
      reject(new Error("WebSocket connection timed out."));
    }, 2_000);

    socket.onopen = () => {
      clearTimeout(timeout);
      socket.close(1000, "entangle local doctor complete");
      resolve("connected");
    };
    socket.onerror = () => {
      clearTimeout(timeout);
      reject(new Error("WebSocket connection failed."));
    };
  });
}

function summarizeReport(checks: LocalDoctorCheck[]): LocalDoctorReport["summary"] {
  return checks.reduce<LocalDoctorReport["summary"]>(
    (summary, check) => ({
      ...summary,
      [check.status]: summary[check.status] + 1
    }),
    {
      fail: 0,
      pass: 0,
      warn: 0
    }
  );
}

function overallStatus(summary: LocalDoctorReport["summary"]): LocalDoctorOverallStatus {
  if (summary.fail > 0) {
    return "fail";
  }

  if (summary.warn > 0) {
    return "warn";
  }

  return "pass";
}

async function addLiveChecks(input: {
  checks: LocalDoctorCheck[];
  deps: Required<
    Pick<
      LocalDoctorDeps,
      "commandRunner" | "connectWebSocket" | "fetchUrl" | "fileExists"
    >
  > &
    Pick<LocalDoctorDeps, "hostClient">;
  options: LocalDoctorOptions;
}): Promise<void> {
  if (input.options.skipLive) {
    addCheck(input.checks, {
      category: "live",
      detail: "live service checks skipped by request",
      status: "pass",
      summary: "Live services"
    });
    return;
  }

  if (input.deps.hostClient) {
    try {
      const status = await input.deps.hostClient.getHostStatus();
      addCheck(input.checks, {
        category: "host",
        detail: `host status ${status.status}`,
        status: status.status === "healthy" ? "pass" : "warn",
        summary: "Host API"
      });
      addCheck(input.checks, {
        category: "state",
        detail:
          `layout ${status.stateLayout.recordedLayoutVersion ?? "unknown"} ` +
          `${status.stateLayout.status}`,
        remediation:
          status.stateLayout.status === "current"
            ? undefined
            : "Back up .entangle/host, then resolve the reported Local state layout issue before continuing.",
        status: classifyLiveStateLayoutStatus(status.stateLayout.status),
        summary: "Host state layout"
      });
    } catch (error) {
      addCheck(input.checks, {
        category: "host",
        detail: error instanceof Error ? error.message : "host status failed",
        remediation: "Start the Local profile or pass the correct --host-url and token.",
        status: "warn",
        summary: "Host API"
      });
    }

    try {
      const runtimes = await input.deps.hostClient.listRuntimes();
      const degradedRuntimeIds = runtimes.runtimes
        .filter((runtime) => runtime.workspaceHealth?.status === "degraded")
        .map((runtime) => runtime.nodeId);
      addCheck(input.checks, {
        category: "workspace",
        detail:
          degradedRuntimeIds.length === 0
            ? `${runtimes.runtimes.length} runtimes inspected`
            : `degraded runtimes: ${degradedRuntimeIds.join(", ")}`,
        remediation:
          degradedRuntimeIds.length > 0
            ? "Inspect the listed runtimes with entangle host runtimes get --summary."
            : undefined,
        status: degradedRuntimeIds.length === 0 ? "pass" : "warn",
        summary: "Runtime workspace health"
      });

      await addRuntimeWikiRepositoryChecks({
        checks: input.checks,
        commandRunner: input.deps.commandRunner,
        fileExists: input.deps.fileExists,
        hostClient: input.deps.hostClient,
        options: input.options,
        runtimes: runtimes.runtimes
      });
    } catch (error) {
      addCheck(input.checks, {
        category: "workspace",
        detail:
          error instanceof Error ? error.message : "runtime workspace check failed",
        remediation: "Start entangle-host before checking live runtime workspaces.",
        status: "warn",
        summary: "Runtime workspace health"
      });
    }

    try {
      const principals = await input.deps.hostClient.listExternalPrincipals();
      addCheck(input.checks, {
        category: "git",
        detail: `${principals.principals.length} external principal records`,
        status: "pass",
        summary: "Git principals"
      });
    } catch (error) {
      addCheck(input.checks, {
        category: "git",
        detail:
          error instanceof Error ? error.message : "external principal check failed",
        remediation: "Start entangle-host before checking git principal bindings.",
        status: "warn",
        summary: "Git principals"
      });
    }
  }

  for (const service of [
    {
      category: "studio",
      summary: "Studio",
      url: input.options.studioUrl ?? "http://localhost:3000"
    },
    {
      category: "gitea",
      summary: "Gitea",
      url: input.options.giteaUrl ?? "http://localhost:3001"
    }
  ]) {
    try {
      addCheck(input.checks, {
        category: service.category,
        detail: `${service.url} ${await input.deps.fetchUrl(service.url)}`,
        status: "pass",
        summary: service.summary
      });
    } catch (error) {
      addCheck(input.checks, {
        category: service.category,
        detail: error instanceof Error ? error.message : `${service.url} failed`,
        remediation: `Start the Local profile and verify ${service.url}.`,
        status: "warn",
        summary: service.summary
      });
    }
  }

  const relayUrl = input.options.relayUrl ?? "ws://localhost:7777";
  try {
    addCheck(input.checks, {
      category: "relay",
      detail: `${relayUrl} ${await input.deps.connectWebSocket(relayUrl)}`,
      status: "pass",
      summary: "Nostr relay"
    });
  } catch (error) {
    addCheck(input.checks, {
      category: "relay",
      detail: error instanceof Error ? error.message : "relay connection failed",
      remediation: `Start the Local profile and verify ${relayUrl}.`,
      status: "warn",
      summary: "Nostr relay"
    });
  }
}

export async function buildLocalDoctorReport(
  options: LocalDoctorOptions,
  deps: LocalDoctorDeps = {}
): Promise<LocalDoctorReport> {
  const checks: LocalDoctorCheck[] = [];
  const fileExists = deps.fileExists ?? existsSync;
  const readFile =
    deps.readFile ?? ((filePath: string) => readFileSync(filePath, "utf8"));
  const commandRunner =
    deps.commandRunner ??
    ((command, args, commandOptions) =>
      spawnSync(command, args, {
        cwd: commandOptions.cwd,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"]
      }));

  for (const requiredPath of requiredLocalProfilePaths) {
    const absolutePath = path.join(options.repositoryRoot, requiredPath);
    const found = fileExists(absolutePath);
    addCheck(checks, {
      category: "profile",
      detail: found ? "found" : "missing required Local profile file",
      remediation: found ? undefined : "Restore the Local deployment profile file.",
      status: found ? "pass" : "fail",
      summary: requiredPath
    });
  }

  const nodeMajor = Number.parseInt(process.versions.node.split(".")[0] ?? "0", 10);
  addCheck(checks, {
    category: "toolchain",
    detail: `detected ${process.versions.node}; required >=22`,
    remediation: nodeMajor >= 22 ? undefined : "Install Node 22 or newer.",
    status: nodeMajor >= 22 ? "pass" : "fail",
    summary: "Node.js version"
  });

  const commandDeps = { commandRunner };
  checkCommand({
    args: ["--version"],
    category: "toolchain",
    checks,
    command: "pnpm",
    deps: commandDeps,
    options,
    remediation: "Install pnpm and run pnpm install --frozen-lockfile.",
    required: true,
    summary: "pnpm"
  });

  const dockerAvailable = checkCommand({
    args: ["--version"],
    category: "container",
    checks,
    command: "docker",
    deps: commandDeps,
    options,
    remediation: "Install Docker and ensure it is available on PATH.",
    summary: "Docker CLI"
  });

  if (dockerAvailable) {
    const composeAvailable = checkCommand({
      args: ["compose", "version"],
      category: "container",
      checks,
      command: "docker",
      deps: commandDeps,
      options,
      remediation: "Install Docker Compose v2.",
      summary: "Docker Compose"
    });

    checkCommand({
      args: ["info", "--format", "{{.ServerVersion}}"],
      category: "container",
      checks,
      command: "docker",
      deps: commandDeps,
      options,
      remediation: "Start the Docker daemon.",
      summary: "Docker daemon"
    });

    if (composeAvailable) {
      checkCommand({
        args: ["compose", "-f", localProfileComposeFile, "config", "--quiet"],
        category: "container",
        checks,
        command: "docker",
        deps: commandDeps,
        options,
        remediation: "Fix the Local Compose profile before starting Entangle Local.",
        summary: "Local Compose config"
      });
    }
  }

  checkCommand({
    args: ["image", "inspect", options.runnerImage ?? "entangle-runner:local"],
    category: "runner",
    checks,
    command: "docker",
    deps: commandDeps,
    options,
    remediation:
      "Build the runner image with docker compose --profile runner-build build runner-image.",
    summary: "Runner image"
  });

  if (dockerAvailable) {
    checkCommand({
      args: [
        "run",
        "--rm",
        "--entrypoint",
        "opencode",
        options.runnerImage ?? "entangle-runner:local",
        "--version"
      ],
      category: "runner",
      checks,
      command: "docker",
      deps: commandDeps,
      options,
      remediation:
        "Rebuild the runner image so the default OpenCode engine is available inside runtime containers.",
      summary: "Runner OpenCode"
    });
  }

  checkCommand({
    args: ["--version"],
    category: "engine",
    checks,
    command: "opencode",
    deps: commandDeps,
    options,
    remediation: "Install OpenCode or configure a node engine profile that can run.",
    summary: "OpenCode"
  });

  const hostStatePath = path.join(options.repositoryRoot, ".entangle", "host");
  const hostStateFound = fileExists(hostStatePath);
  addCheck(checks, {
    category: "state",
    detail: hostStateFound ? "found .entangle/host" : "no .entangle/host yet",
    remediation: hostStateFound ? undefined : "Start entangle-host once to initialize Local state.",
    status: hostStateFound ? "pass" : "warn",
    summary: "Local host state"
  });
  addCheck(
    checks,
    buildLocalStateLayoutCheck({
      fileExists,
      hostStateFound,
      options,
      readFile
    })
  );

  await addLiveChecks({
    checks,
    deps: {
      commandRunner,
      connectWebSocket: deps.connectWebSocket ?? defaultConnectWebSocket,
      fileExists,
      fetchUrl: deps.fetchUrl ?? defaultFetchUrl,
      ...(deps.hostClient ? { hostClient: deps.hostClient } : {})
    },
    options
  });

  const summary = summarizeReport(checks);
  return {
    checks,
    generatedAt: (deps.now ?? (() => new Date()))().toISOString(),
    status: overallStatus(summary),
    summary
  };
}

export function formatLocalDoctorText(report: LocalDoctorReport): string {
  const lines = [
    `Entangle Local doctor: ${report.status} (${report.summary.pass} pass, ${report.summary.warn} warn, ${report.summary.fail} fail)`
  ];

  for (const check of report.checks) {
    const prefix =
      check.status === "pass" ? "PASS" : check.status === "warn" ? "WARN" : "FAIL";
    lines.push(`${prefix} ${check.category}:${check.summary}: ${check.detail}`);
    if (check.remediation) {
      lines.push(`  remediation: ${check.remediation}`);
    }
  }

  return `${lines.join("\n")}\n`;
}

import { spawnSync, type SpawnSyncReturns } from "node:child_process";
import type {
  ExternalPrincipalListResponse,
  HostEventAuditBundleResponse,
  HostEventListResponse,
  HostStatusResponse,
  RuntimeApprovalListResponse,
  RuntimeArtifactListResponse,
  RuntimeContextInspectionResponse,
  RuntimeListResponse,
  RuntimeTurnListResponse
} from "@entangle/types";
import {
  buildDeploymentDoctorReport,
  type DeploymentDoctorDeps,
  type DeploymentDoctorOptions,
  type DeploymentDoctorReport
} from "./deployment-doctor-command.js";

export interface DeploymentDiagnosticsBundleOptions extends DeploymentDoctorOptions {
  eventLimit?: number | undefined;
  logTail?: number | undefined;
  maxCommandOutputChars?: number | undefined;
}

interface DeploymentDiagnosticsHostClient {
  getRuntimeContext(nodeId: string): Promise<RuntimeContextInspectionResponse>;
  getHostStatus(): Promise<HostStatusResponse>;
  listRuntimeApprovals(nodeId: string): Promise<RuntimeApprovalListResponse>;
  listRuntimeArtifacts(nodeId: string): Promise<RuntimeArtifactListResponse>;
  listRuntimeTurns(nodeId: string): Promise<RuntimeTurnListResponse>;
  listExternalPrincipals(): Promise<ExternalPrincipalListResponse>;
  exportHostEventAuditBundle(): Promise<HostEventAuditBundleResponse>;
  listHostEvents(limit?: number): Promise<HostEventListResponse>;
  listRuntimes(): Promise<RuntimeListResponse>;
}

export interface DeploymentDiagnosticsBundleDeps extends DeploymentDoctorDeps {
  commandRunner?: (
    command: string,
    args: string[],
    options: { cwd: string }
  ) => Pick<SpawnSyncReturns<string>, "error" | "signal" | "status" | "stderr" | "stdout">;
  hostClient?: DeploymentDiagnosticsHostClient;
  now?: () => Date;
}

export interface DeploymentDiagnosticsCommandCapture {
  args: string[];
  command: string;
  exitCode: number | null;
  signal?: string | undefined;
  stderr: string;
  stdout: string;
  summary: string;
}

export interface DeploymentDiagnosticsBundle {
  commands: DeploymentDiagnosticsCommandCapture[];
  doctor: DeploymentDoctorReport;
  generatedAt: string;
  host?: {
    auditBundle?: HostEventAuditBundleResponse | undefined;
    errors: string[];
    events?: HostEventListResponse | undefined;
    externalPrincipals?: ExternalPrincipalListResponse | undefined;
    runtimeEvidence?: DeploymentDiagnosticsRuntimeEvidence[] | undefined;
    runtimes?: RuntimeListResponse | undefined;
    status?: HostStatusResponse | undefined;
  };
  profile: {
    composeFile: string;
    eventLimit: number;
    logTail: number;
    maxCommandOutputChars: number;
    runnerImage: string;
  };
  redaction: {
    applied: true;
    placeholder: string;
  };
  schemaVersion: "1";
}

export interface DeploymentDiagnosticsRuntimeEvidence {
  approvalCount?: number | undefined;
  artifactCount?: number | undefined;
  errors: string[];
  latestTurns?: Array<{
    engineFailureClassification?: string | undefined;
    engineFailureMessage?: string | undefined;
    enginePermissionDecisions: string[];
    engineStopReason?: string | undefined;
    phase: string;
    producedArtifactIds: string[];
    requestedApprovalIds: string[];
    turnId: string;
    updatedAt: string;
  }>;
  nodeId: string;
  pendingApprovalIds?: string[] | undefined;
  turnCount?: number | undefined;
}

const federatedDevProfileComposeFile = "deploy/federated-dev/compose/docker-compose.federated-dev.yml";
const defaultEventLimit = 50;
const defaultLogTail = 200;
const defaultMaxCommandOutputChars = 64 * 1024;
const redactionPlaceholder = "<redacted>";

function defaultCommandRunner(
  command: string,
  args: string[],
  options: { cwd: string }
): Pick<SpawnSyncReturns<string>, "error" | "signal" | "status" | "stderr" | "stdout"> {
  return spawnSync(command, args, {
    cwd: options.cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
}

export function redactDeploymentDiagnosticsText(input: string): string {
  return input
    .replace(/(Bearer\s+)[A-Za-z0-9._~+/=-]+/gi, `$1${redactionPlaceholder}`)
    .replace(
      /((?:api[_-]?key|authorization|password|secret|token)\s*[:=]\s*)("[^"]*"|'[^']*'|[^\s,;]+)/gi,
      `$1${redactionPlaceholder}`
    )
    .replace(
      /((?:api[_-]?key|authorization|password|secret|token)"\s*:\s*)("[^"]*")/gi,
      `$1"${redactionPlaceholder}"`
    );
}

function truncateText(input: string, maxChars: number): string {
  if (input.length <= maxChars) {
    return input;
  }

  return `${input.slice(0, maxChars)}\n<truncated ${input.length - maxChars} chars>`;
}

function normalizeCommandCapture(input: {
  args: string[];
  command: string;
  maxCommandOutputChars: number;
  result: Pick<SpawnSyncReturns<string>, "error" | "signal" | "status" | "stderr" | "stdout">;
  summary: string;
}): DeploymentDiagnosticsCommandCapture {
  const stderr = redactDeploymentDiagnosticsText(
    truncateText(input.result.stderr ?? "", input.maxCommandOutputChars)
  );
  const stdout = redactDeploymentDiagnosticsText(
    truncateText(input.result.stdout ?? "", input.maxCommandOutputChars)
  );

  return {
    args: input.args,
    command: input.command,
    exitCode: input.result.status ?? null,
    ...(input.result.signal ? { signal: input.result.signal } : {}),
    stderr:
      stderr.length > 0
        ? stderr
        : input.result.error
          ? redactDeploymentDiagnosticsText(input.result.error.message)
          : "",
    stdout,
    summary: input.summary
  };
}

async function collectHostDiagnostics(input: {
  eventLimit: number;
  hostClient: DeploymentDiagnosticsHostClient | undefined;
  runtimeEvidenceLimit: number;
}): Promise<DeploymentDiagnosticsBundle["host"] | undefined> {
  if (!input.hostClient) {
    return undefined;
  }

  const errors: string[] = [];
  const host: NonNullable<DeploymentDiagnosticsBundle["host"]> = {
    errors
  };

  try {
    host.status = await input.hostClient.getHostStatus();
  } catch (error) {
    errors.push(
      `host status: ${error instanceof Error ? error.message : "request failed"}`
    );
  }

  try {
    host.runtimes = await input.hostClient.listRuntimes();
  } catch (error) {
    errors.push(
      `runtimes: ${error instanceof Error ? error.message : "request failed"}`
    );
  }

  if (host.runtimes) {
    host.runtimeEvidence = await collectRuntimeEvidence({
      hostClient: input.hostClient,
      runtimeEvidenceLimit: input.runtimeEvidenceLimit,
      runtimes: host.runtimes
    });
  }

  try {
    host.externalPrincipals = await input.hostClient.listExternalPrincipals();
  } catch (error) {
    errors.push(
      `external principals: ${
        error instanceof Error ? error.message : "request failed"
      }`
    );
  }

  try {
    host.events = await input.hostClient.listHostEvents(input.eventLimit);
  } catch (error) {
    errors.push(
      `events: ${error instanceof Error ? error.message : "request failed"}`
    );
  }

  try {
    host.auditBundle = await input.hostClient.exportHostEventAuditBundle();
  } catch (error) {
    errors.push(
      `event audit bundle: ${
        error instanceof Error ? error.message : "request failed"
      }`
    );
  }

  return host;
}

async function collectRuntimeEvidence(input: {
  hostClient: DeploymentDiagnosticsHostClient;
  runtimeEvidenceLimit: number;
  runtimes: RuntimeListResponse;
}): Promise<DeploymentDiagnosticsRuntimeEvidence[]> {
  const evidence: DeploymentDiagnosticsRuntimeEvidence[] = [];

  for (const runtime of input.runtimes.runtimes) {
    const runtimeEvidence: DeploymentDiagnosticsRuntimeEvidence = {
      errors: [],
      nodeId: runtime.nodeId
    };

    try {
      const turns = await input.hostClient.listRuntimeTurns(runtime.nodeId);
      runtimeEvidence.turnCount = turns.turns.length;
      runtimeEvidence.latestTurns = turns.turns
        .slice()
        .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
        .slice(0, input.runtimeEvidenceLimit)
        .map((turn) => ({
          ...(turn.engineOutcome?.failure
            ? {
                engineFailureClassification:
                  turn.engineOutcome.failure.classification,
                engineFailureMessage: redactDeploymentDiagnosticsText(
                  turn.engineOutcome.failure.message
                )
              }
            : {}),
          ...(turn.engineOutcome?.stopReason
            ? { engineStopReason: turn.engineOutcome.stopReason }
            : {}),
          enginePermissionDecisions:
            turn.engineOutcome?.permissionObservations?.map(
              (observation) => observation.decision
            ) ?? [],
          phase: turn.phase,
          producedArtifactIds: turn.producedArtifactIds,
          requestedApprovalIds: turn.requestedApprovalIds,
          turnId: turn.turnId,
          updatedAt: turn.updatedAt
        }));
    } catch (error) {
      runtimeEvidence.errors.push(
        `turns: ${error instanceof Error ? error.message : "request failed"}`
      );
    }

    try {
      const approvals = await input.hostClient.listRuntimeApprovals(runtime.nodeId);
      runtimeEvidence.approvalCount = approvals.approvals.length;
      runtimeEvidence.pendingApprovalIds = approvals.approvals
        .filter((approval) => approval.status === "pending")
        .slice(0, input.runtimeEvidenceLimit)
        .map((approval) => approval.approvalId);
    } catch (error) {
      runtimeEvidence.errors.push(
        `approvals: ${error instanceof Error ? error.message : "request failed"}`
      );
    }

    try {
      const artifacts = await input.hostClient.listRuntimeArtifacts(runtime.nodeId);
      runtimeEvidence.artifactCount = artifacts.artifacts.length;
    } catch (error) {
      runtimeEvidence.errors.push(
        `artifacts: ${error instanceof Error ? error.message : "request failed"}`
      );
    }

    evidence.push(runtimeEvidence);
  }

  return evidence;
}

export async function buildDeploymentDiagnosticsBundle(
  options: DeploymentDiagnosticsBundleOptions,
  deps: DeploymentDiagnosticsBundleDeps = {}
): Promise<DeploymentDiagnosticsBundle> {
  const commandRunner = deps.commandRunner ?? defaultCommandRunner;
  const eventLimit = options.eventLimit ?? defaultEventLimit;
  const logTail = options.logTail ?? defaultLogTail;
  const maxCommandOutputChars =
    options.maxCommandOutputChars ?? defaultMaxCommandOutputChars;
  const doctor = await buildDeploymentDoctorReport(options, deps);
  const commandInputs = [
    {
      args: ["compose", "-f", federatedDevProfileComposeFile, "ps"],
      command: "docker",
      summary: "Federated dev Compose services"
    },
    {
      args: [
        "compose",
        "-f",
        federatedDevProfileComposeFile,
        "logs",
        "--no-color",
        "--tail",
        String(logTail)
      ],
      command: "docker",
      summary: "Federated dev Compose logs"
    },
    {
      args: ["image", "inspect", options.runnerImage ?? "entangle-runner:federated-dev"],
      command: "docker",
      summary: "Runner image inspect"
    }
  ];
  const commands = commandInputs.map((commandInput) =>
    normalizeCommandCapture({
      ...commandInput,
      maxCommandOutputChars,
      result: commandRunner(commandInput.command, commandInput.args, {
        cwd: options.repositoryRoot
      })
    })
  );
  const host = await collectHostDiagnostics({
    eventLimit,
    hostClient: deps.hostClient,
    runtimeEvidenceLimit: 5
  });

  return {
    commands,
    doctor,
    generatedAt: (deps.now ?? (() => new Date()))().toISOString(),
    ...(host ? { host } : {}),
    profile: {
      composeFile: federatedDevProfileComposeFile,
      eventLimit,
      logTail,
      maxCommandOutputChars,
      runnerImage: options.runnerImage ?? "entangle-runner:federated-dev"
    },
    redaction: {
      applied: true,
      placeholder: redactionPlaceholder
    },
    schemaVersion: "1"
  };
}

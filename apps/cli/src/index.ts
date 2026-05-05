import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Command } from "commander";
import {
  createHostClient,
  filterHostEvents,
  formatHostArtifactBackendCacheClearSummary,
  hostEventMatchesFilter,
  sortExternalPrincipalInspections,
  sortGraphRevisions,
  sortHostSessionSummariesForPresentation,
  sortNodeInspectionsForPresentation,
  sortPackageSourceInspections,
  sortRuntimeInspectionsForPresentation,
  sortRuntimeSourceHistoryForPresentation,
  sortRuntimeTurnsForPresentation
} from "@entangle/host-client";
import { createAgentPackageScaffold } from "@entangle/package-scaffold";
import {
  artifactRefSchema,
  edgeCreateRequestSchema,
  edgeReplacementRequestSchema,
  externalPrincipalMutationRequestSchema,
  graphSpecSchema,
  hostAuthorityImportRequestSchema,
  type HostEventRecord,
  nodeCreateRequestSchema,
  nodeReplacementRequestSchema,
  runtimeArtifactRestoreRequestSchema,
  runtimeArtifactSourceChangeProposalRequestSchema,
  runtimeAssignmentOfferRequestSchema,
  runtimeAssignmentRevokeRequestSchema,
  runtimeRecoveryPolicyMutationRequestSchema,
  runtimeSourceHistoryPublishRequestSchema,
  runtimeSourceHistoryReconcileRequestSchema,
  runtimeSourceHistoryReplayRequestSchema,
  runtimeWikiPublishRequestSchema,
  runtimeWikiUpsertPageRequestSchema,
  sessionCancellationMutationRequestSchema,
  type SessionInspectionResponse,
  sessionLaunchRequestSchema,
  type UserNodeMessageRecord,
  userNodeMessagePublishRequestSchema
} from "@entangle/types";
import {
  formatValidationReport,
  validateGraphFile,
  validatePackageDirectory
} from "@entangle/validator";
import { buildGraphDiff } from "./graph-diff-command.js";
import {
  getGraphTemplate,
  listGraphTemplates
} from "./graph-template-command.js";
import { buildHostEventFilter } from "./host-event-inspection.js";
import { projectHostStatusSummary } from "./host-status-output.js";
import {
  buildDeploymentDoctorReport,
  formatDeploymentDoctorText
} from "./deployment-doctor-command.js";
import { buildDeploymentDiagnosticsBundle } from "./deployment-diagnostics-bundle-command.js";
import {
  createDeploymentBackup,
  restoreDeploymentBackup
} from "./deployment-backup-command.js";
import {
  buildDeploymentRepairReport,
  formatDeploymentRepairText
} from "./deployment-repair-command.js";
import {
  projectGraphExportSummary,
  projectGraphImportSummary,
  projectGraphRevisionInspectionSummary,
  projectGraphRevisionSummary,
  projectGraphSummary,
  projectNodeInspectionSummary,
  projectSortedGraphEdgeSummaries
} from "./graph-output.js";
import { buildCliMutationDryRun } from "./mutation-dry-run.js";
import {
  projectHostAuthorityExportSummary,
  projectHostAuthorityImportSummary,
  projectHostAuthoritySummary
} from "./authority-output.js";
import {
  projectRunnerRegistrySummary,
  sortRunnerRegistryEntriesForPresentation
} from "./runner-output.js";
import {
  buildRunnerJoinConfig,
  projectRunnerJoinConfigSummary,
  splitRepeatedCsvOptions
} from "./runner-join-config-command.js";
import {
  projectRuntimeAssignmentSummary,
  projectRuntimeAssignmentTimelineSummary,
  sortRuntimeAssignmentsForCli
} from "./assignment-output.js";
import {
  filterRuntimeCommandReceiptsForCli,
  parseRuntimeCommandReceiptStatusForCli,
  projectHostProjectionSummary,
  projectRuntimeCommandReceiptSummary,
  sortRuntimeCommandReceiptsForCli
} from "./projection-output.js";
import {
  buildUserNodeClientSummariesForCli,
  projectUserConversationSummary,
  projectUserNodeIdentitySummary,
  projectUserNodeMessageSummary,
  projectUserNodeMessagePublishSummary,
  sortUserConversationsForCli,
  sortUserNodeIdentitiesForCli
} from "./user-node-output.js";
import {
  buildUserNodeApprovalMetadata,
  buildUserNodeApprovalPublishRequestFromMessage,
  buildUserNodeSourceChangeReviewMetadata,
  buildUserNodeSourceChangeReviewPublishRequestFromMessage,
  hasUserNodeApprovalContextOptions
} from "./user-node-message-command.js";
import {
  buildNodeAgentRuntimeReplacementRequest,
  type NodeAgentRuntimeConfigurationOptions
} from "./node-agent-runtime-command.js";
import {
  buildPackageInitOptions,
  type PackageInitCliOptions
} from "./package-init-command.js";
import {
  buildAgentEngineProfileUpsertRequest,
  projectAgentEngineProfileSummary,
  projectAgentEngineProfileUpsertSummary,
  sortAgentEngineProfilesForCli,
  type CatalogAgentEngineUpsertOptions
} from "./catalog-agent-engine-command.js";
import { inspectPackageDirectory } from "./package-inspection-command.js";
import { buildPackageSourceAdmissionRequestFromCli } from "./package-source-command.js";
import {
  projectExternalPrincipalSummary,
  projectPackageSourceSummary
} from "./resource-inventory-output.js";
import {
  filterRuntimeArtifactsForCli,
  projectRuntimeArtifactDiffSummary,
  projectRuntimeArtifactHistorySummary,
  projectRuntimeArtifactPreviewSummary,
  projectRuntimeArtifactRestoreSummary,
  projectRuntimeArtifactSourceChangeProposalSummary,
  projectRuntimeArtifactSummary,
  sortRuntimeArtifactsForCli
} from "./runtime-artifact-command.js";
import {
  filterRuntimeApprovalsForCli,
  projectRuntimeApprovalSummary,
  sortRuntimeApprovalsForCli
} from "./runtime-approval-output.js";
import {
  projectHostSessionInspectionSummary,
  projectHostSessionSummary
} from "./runtime-session-output.js";
import {
  projectHostSessionLaunchSummary,
  projectHostSessionWaitSummary,
  resolveHostSessionWaitOutcome,
  shouldHostSessionWaitExitNonZero,
  type HostSessionWaitOutcome
} from "./session-wait.js";
import { projectRuntimeInspectionSummary } from "./runtime-inspection-output.js";
import {
  projectRuntimeMemoryPagePreviewSummary,
  projectRuntimeMemorySummary
} from "./runtime-memory-command.js";
import { projectRuntimeRecoverySummary } from "./runtime-recovery-output.js";
import {
  filterRuntimeSourceChangeCandidatesForCli,
  projectRuntimeSourceChangeCandidateDiffSummary,
  projectRuntimeSourceChangeCandidateFilePreviewSummary,
  projectRuntimeSourceChangeCandidateSummary,
  sortRuntimeSourceChangeCandidatesForCli
} from "./runtime-source-change-candidate-output.js";
import {
  projectRuntimeSourceHistorySummary
} from "./runtime-source-history-output.js";
import { projectRuntimeTurnSummary } from "./runtime-turn-output.js";
import { projectRuntimeTraceSummary } from "./runtime-trace-output.js";

async function readJsonDocument(filePath: string): Promise<unknown> {
  return JSON.parse(await readFile(filePath, "utf8")) as unknown;
}

async function writeJsonDocument(filePath: string, value: unknown): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../.."
);

function resolveCliPath(inputPath: string): string {
  if (path.isAbsolute(inputPath)) {
    return inputPath;
  }

  return path.resolve(process.env.INIT_CWD ?? process.cwd(), inputPath);
}

function resolveRepositoryPath(inputPath: string): string {
  return path.resolve(repositoryRoot, inputPath);
}

function printJson(value: unknown): void {
  console.log(JSON.stringify(value, null, 2));
}

function collectRepeatedOptionValue(value: string, previous: string[] = []): string[] {
  return [...previous, value];
}

function buildCliHostEventInspectionOptions(options: {
  category?: HostEventRecord["category"];
  nodeId?: string;
  operatorId?: string;
  recoveryOnly?: boolean;
  runtimeTraceOnly?: boolean;
  statusCode?: string;
  typePrefix: string[];
}) {
  return {
    ...(options.category ? { category: options.category } : {}),
    ...(options.nodeId ? { nodeId: options.nodeId } : {}),
    ...(options.operatorId ? { operatorId: options.operatorId } : {}),
    ...(options.recoveryOnly ? { recoveryOnly: true } : {}),
    ...(options.runtimeTraceOnly ? { runtimeTraceOnly: true } : {}),
    ...(options.statusCode
      ? {
          statusCode: parsePositiveIntegerOption(
            options.statusCode,
            "--status-code"
          )
        }
      : {}),
    ...(options.typePrefix.length > 0 ? { typePrefixes: options.typePrefix } : {})
  };
}

function renderCliHostEvents(events: HostEventRecord[], summary: boolean): void {
  if (!summary) {
    printJson({ events });
    return;
  }

  printJson({
    events: events.map((event) => projectRuntimeTraceSummary(event))
  });
}

function resolveHostUrl(command: Command): string {
  const commandOptions = command.opts<{ hostUrl?: string }>();
  const rootOptions = command.parent?.opts<{ hostUrl?: string }>();
  const nestedRootOptions = command.parent?.parent?.opts<{ hostUrl?: string }>();

  return (
    commandOptions.hostUrl ??
    rootOptions?.hostUrl ??
    nestedRootOptions?.hostUrl ??
    process.env.ENTANGLE_HOST_URL ??
    "http://localhost:7071"
  );
}

function resolveHostToken(command: Command): string | undefined {
  const commandOptions = command.opts<{ hostToken?: string }>();
  const rootOptions = command.parent?.opts<{ hostToken?: string }>();
  const nestedRootOptions = command.parent?.parent?.opts<{ hostToken?: string }>();
  const token =
    commandOptions.hostToken ??
    rootOptions?.hostToken ??
    nestedRootOptions?.hostToken ??
    process.env.ENTANGLE_HOST_TOKEN ??
    process.env.ENTANGLE_HOST_OPERATOR_TOKEN;
  const normalizedToken = token?.trim();

  return normalizedToken && normalizedToken.length > 0
    ? normalizedToken
    : undefined;
}

function createCliHostClient(command: Command) {
  const authToken = resolveHostToken(command);
  const baseUrl = resolveHostUrl(command);

  return createHostClient(
    authToken === undefined ? { baseUrl } : { authToken, baseUrl }
  );
}

function resolveDefaultHostTokenEnvVar(): string | undefined {
  if (process.env.ENTANGLE_HOST_TOKEN?.trim()) {
    return "ENTANGLE_HOST_TOKEN";
  }

  if (process.env.ENTANGLE_HOST_OPERATOR_TOKEN?.trim()) {
    return "ENTANGLE_HOST_OPERATOR_TOKEN";
  }

  return undefined;
}

function parsePositiveIntegerOption(value: string, optionName: string): number {
  if (!/^[1-9]\d*$/.test(value)) {
    throw new Error(`${optionName} must be a positive integer.`);
  }

  return Number.parseInt(value, 10);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function isMissingSessionInspectionError(error: unknown): boolean {
  return (
    error instanceof Error &&
    error.message.startsWith("Host request failed with 404")
  );
}

async function waitForHostSession(input: {
  client: ReturnType<typeof createCliHostClient>;
  intervalMs: number;
  sessionId: string;
  timeoutMs: number;
}): Promise<{
  elapsedMs: number;
  inspection?: SessionInspectionResponse;
  outcome: HostSessionWaitOutcome;
  pollCount: number;
  timedOut: boolean;
}> {
  const startedAt = Date.now();
  const deadline = startedAt + input.timeoutMs;
  let lastInspection: SessionInspectionResponse | undefined;
  let pollCount = 0;

  while (true) {
    pollCount += 1;

    try {
      lastInspection = await input.client.getSession(input.sessionId);
      const outcome = resolveHostSessionWaitOutcome(lastInspection);

      if (outcome !== "observing") {
        return {
          elapsedMs: Date.now() - startedAt,
          inspection: lastInspection,
          outcome,
          pollCount,
          timedOut: false
        };
      }
    } catch (error) {
      if (!isMissingSessionInspectionError(error)) {
        throw error;
      }
    }

    const remainingMs = deadline - Date.now();

    if (remainingMs <= 0) {
      return {
        elapsedMs: Date.now() - startedAt,
        ...(lastInspection ? { inspection: lastInspection } : {}),
        outcome: "observing",
        pollCount,
        timedOut: true
      };
    }

    await sleep(Math.min(input.intervalMs, remainingMs));
  }
}

async function findUserNodeMessageByEventId(input: {
  client: ReturnType<typeof createCliHostClient>;
  eventId: string;
  userNodeId: string;
}): Promise<UserNodeMessageRecord> {
  return (
    await input.client.getUserNodeMessage(input.userNodeId, input.eventId)
  ).message;
}

async function watchHostEvents(input: {
  command: Command;
  filterOptions: Parameters<typeof buildHostEventFilter>[0];
  replay: number;
  summary: boolean;
}): Promise<void> {
  const client = createCliHostClient(input.command);
  const filter = buildHostEventFilter(input.filterOptions);

  await new Promise<void>((resolve, reject) => {
    let settled = false;

    const cleanup = () => {
      process.off("SIGINT", handleSignal);
      process.off("SIGTERM", handleSignal);
    };

    const resolveOnce = () => {
      if (settled) {
        return;
      }

      settled = true;
      cleanup();
      resolve();
    };

    const rejectOnce = (error: Error) => {
      if (settled) {
        return;
      }

      settled = true;
      cleanup();
      reject(error);
    };

    const subscription = client.subscribeToEvents({
      replay: input.replay,
      onClose: () => {
        resolveOnce();
      },
      onError: (error) => {
        rejectOnce(error);
      },
      onEvent: (event) => {
        if (hostEventMatchesFilter(event, filter)) {
          printJson(
            input.summary ? projectRuntimeTraceSummary(event) : event
          );
        }
      }
    });

    const handleSignal = () => {
      subscription.close(1000, "Operator interrupted host event watch.");
      resolveOnce();
    };

    process.once("SIGINT", handleSignal);
    process.once("SIGTERM", handleSignal);
  });
}

const program = new Command();

program
  .name("entangle")
  .description("Thin CLI surface over Entangle validators, package scaffolding, and host operations.")
  .version("0.1.0");

const validateCommand = program
  .command("validate")
  .description("Run offline validation commands.");

validateCommand
  .command("package")
  .argument("<directory>", "Path to an AgentPackage directory.")
  .description("Validate an AgentPackage directory.")
  .action(async (directory: string) => {
    const report = await validatePackageDirectory(resolveCliPath(directory));
    console.log(formatValidationReport(report));
    process.exitCode = report.ok ? 0 : 1;
  });

validateCommand
  .command("graph")
  .argument("<file>", "Path to a graph JSON file.")
  .description("Validate a graph document.")
  .action(async (file: string) => {
    const report = await validateGraphFile(resolveCliPath(file));
    console.log(formatValidationReport(report));
    process.exitCode = report.ok ? 0 : 1;
  });

const packageCommand = program
  .command("package")
  .description("Create and inspect AgentPackage folders.");

packageCommand
  .command("init")
  .argument("<directory>", "Target directory for the new AgentPackage.")
  .option("--default-node-kind <kind>", "Default node kind for new graph bindings.")
  .option("--force", "Overwrite files generated by a previous scaffold.")
  .option("--name <name>", "Human-readable package name.")
  .option("--package-id <packageId>", "Explicit package identifier.")
  .description("Create a minimal AgentPackage scaffold.")
  .action(async (directory: string, options: PackageInitCliOptions) => {
    const result = await createAgentPackageScaffold(
      resolveCliPath(directory),
      buildPackageInitOptions(options)
    );
    printJson(result);
  });

packageCommand
  .command("inspect")
  .argument("<directory>", "Path to an AgentPackage directory.")
  .description("Inspect an AgentPackage manifest, package files, tool catalog, and validation state.")
  .action(async (directory: string) => {
    printJson({
      package: await inspectPackageDirectory(resolveCliPath(directory))
    });
  });

const deploymentCommand = program
  .command("deployment")
  .description("Inspect and operate an Entangle deployment profile.");

deploymentCommand
  .command("backup")
  .option("--force", "Replace an existing backup output directory.")
  .option(
    "--output <path>",
    "Entangle deployment profile backup bundle output directory.",
    "entangle-backup"
  )
  .description("Create a versioned Entangle deployment profile backup bundle without Entangle secrets.")
  .action(
    async (options: { force?: boolean; output: string }) => {
      const summary = await createDeploymentBackup({
        force: options.force,
        outputPath: resolveCliPath(options.output),
        repositoryRoot
      });

      printJson({
        backup: summary
      });
    }
  );

deploymentCommand
  .command("restore")
  .argument("<bundle>", "Path to an Entangle deployment profile backup bundle directory.")
  .option("--dry-run", "Validate the backup and report what would be restored.")
  .option("--force", "Replace the current .entangle/host state directory.")
  .description("Restore .entangle/host from a validated Entangle deployment profile backup bundle.")
  .action(
    async (
      bundle: string,
      options: {
        dryRun?: boolean;
        force?: boolean;
      }
    ) => {
      const summary = await restoreDeploymentBackup({
        dryRun: options.dryRun,
        force: options.force,
        inputPath: resolveCliPath(bundle),
        repositoryRoot
      });

      printJson({
        restore: summary
      });
    }
  );

deploymentCommand
  .command("repair")
  .option("--apply-safe", "Apply only conservative repair actions marked safe.")
  .option("--gitea-url <url>", "Expected Gitea URL.", "http://localhost:3001")
  .option("--host-token <token>", "Bearer token for a protected host.")
  .option("--host-url <url>", "Expected host API URL.", "http://localhost:7071")
  .option("--json", "Print the full machine-readable repair report.")
  .option("--relay-url <url>", "Expected Nostr relay URL.", "ws://localhost:7777")
  .option("--runner-image <image>", "Expected runner image.", "entangle-runner:federated-dev")
  .option("--skip-live", "Skip live host, Studio, Gitea, and relay checks.")
  .option("--strict", "Treat optional deployment infrastructure warnings as failures.")
  .option("--studio-url <url>", "Expected Studio URL.", "http://localhost:3000")
  .description("Preview or apply conservative Entangle deployment profile repair actions.")
  .action(
    async (
      options: {
        applySafe?: boolean;
        giteaUrl: string;
        hostToken?: string;
        hostUrl: string;
        json?: boolean;
        relayUrl: string;
        runnerImage: string;
        skipLive?: boolean;
        strict?: boolean;
        studioUrl: string;
      }
    ) => {
      const normalizedToken =
        options.hostToken?.trim() ??
        process.env.ENTANGLE_HOST_TOKEN?.trim() ??
        process.env.ENTANGLE_HOST_OPERATOR_TOKEN?.trim();
      const hostClient = options.skipLive
        ? undefined
        : createHostClient(
            normalizedToken && normalizedToken.length > 0
              ? { authToken: normalizedToken, baseUrl: options.hostUrl }
              : { baseUrl: options.hostUrl }
          );
      const report = await buildDeploymentRepairReport(
        {
          applySafe: options.applySafe,
          giteaUrl: options.giteaUrl,
          hostUrl: options.hostUrl,
          relayUrl: options.relayUrl,
          repositoryRoot,
          runnerImage: options.runnerImage,
          skipLive: options.skipLive,
          strict: options.strict,
          studioUrl: options.studioUrl
        },
        hostClient ? { hostClient } : {}
      );

      if (options.json) {
        printJson(report);
      } else {
        process.stdout.write(formatDeploymentRepairText(report));
      }

      if (report.status === "blocked") {
        process.exitCode = 1;
      }
    }
  );

deploymentCommand
  .command("doctor")
  .option("--gitea-url <url>", "Expected Gitea URL.", "http://localhost:3001")
  .option("--host-token <token>", "Bearer token for a protected host.")
  .option("--host-url <url>", "Expected host API URL.", "http://localhost:7071")
  .option("--json", "Print the full machine-readable doctor report.")
  .option("--relay-url <url>", "Expected Nostr relay URL.", "ws://localhost:7777")
  .option("--runner-image <image>", "Expected runner image.", "entangle-runner:federated-dev")
  .option("--skip-live", "Skip live host, Studio, Gitea, and relay checks.")
  .option("--strict", "Treat optional deployment infrastructure warnings as failures.")
  .option("--studio-url <url>", "Expected Studio URL.", "http://localhost:3000")
  .description("Run a read-only Entangle deployment profile doctor diagnostic.")
  .action(
    async (
      options: {
        giteaUrl: string;
        hostToken?: string;
        hostUrl: string;
        json?: boolean;
        relayUrl: string;
        runnerImage: string;
        skipLive?: boolean;
        strict?: boolean;
        studioUrl: string;
      }
    ) => {
      const normalizedToken =
        options.hostToken?.trim() ??
        process.env.ENTANGLE_HOST_TOKEN?.trim() ??
        process.env.ENTANGLE_HOST_OPERATOR_TOKEN?.trim();
      const hostClient = options.skipLive
        ? undefined
        : createHostClient(
            normalizedToken && normalizedToken.length > 0
              ? { authToken: normalizedToken, baseUrl: options.hostUrl }
              : { baseUrl: options.hostUrl }
          );
      const report = await buildDeploymentDoctorReport(
        {
          giteaUrl: options.giteaUrl,
          hostUrl: options.hostUrl,
          relayUrl: options.relayUrl,
          repositoryRoot,
          runnerImage: options.runnerImage,
          skipLive: options.skipLive,
          strict: options.strict,
          studioUrl: options.studioUrl
        },
        hostClient ? { hostClient } : {}
      );

      if (options.json) {
        printJson(report);
      } else {
        process.stdout.write(formatDeploymentDoctorText(report));
      }

      if (report.status === "fail") {
        process.exitCode = 1;
      }
    }
  );

deploymentCommand
  .command("diagnostics")
  .option("--event-limit <n>", "Maximum host events to include.", "50")
  .option("--gitea-url <url>", "Expected Gitea URL.", "http://localhost:3001")
  .option("--host-token <token>", "Bearer token for a protected host.")
  .option("--host-url <url>", "Expected host API URL.", "http://localhost:7071")
  .option("--log-tail <n>", "Tail lines to collect from Federated dev Compose logs.", "200")
  .option(
    "--max-command-output-chars <n>",
    "Maximum captured characters per command stream.",
    "65536"
  )
  .option(
    "--output <path>",
    "Diagnostics bundle JSON output path.",
    "entangle-diagnostics.json"
  )
  .option("--relay-url <url>", "Expected Nostr relay URL.", "ws://localhost:7777")
  .option("--runner-image <image>", "Expected runner image.", "entangle-runner:federated-dev")
  .option("--skip-live", "Skip live host, Studio, Gitea, and relay checks.")
  .option("--studio-url <url>", "Expected Studio URL.", "http://localhost:3000")
  .description("Write a redacted Entangle deployment profile diagnostics bundle.")
  .action(
    async (
      options: {
        eventLimit: string;
        giteaUrl: string;
        hostToken?: string;
        hostUrl: string;
        logTail: string;
        maxCommandOutputChars: string;
        output: string;
        relayUrl: string;
        runnerImage: string;
        skipLive?: boolean;
        studioUrl: string;
      }
    ) => {
      const normalizedToken =
        options.hostToken?.trim() ??
        process.env.ENTANGLE_HOST_TOKEN?.trim() ??
        process.env.ENTANGLE_HOST_OPERATOR_TOKEN?.trim();
      const hostClient = options.skipLive
        ? undefined
        : createHostClient(
            normalizedToken && normalizedToken.length > 0
              ? { authToken: normalizedToken, baseUrl: options.hostUrl }
              : { baseUrl: options.hostUrl }
          );
      const outputPath = resolveCliPath(options.output);
      const bundle = await buildDeploymentDiagnosticsBundle(
        {
          eventLimit: Number.parseInt(options.eventLimit, 10),
          giteaUrl: options.giteaUrl,
          hostUrl: options.hostUrl,
          logTail: Number.parseInt(options.logTail, 10),
          maxCommandOutputChars: Number.parseInt(
            options.maxCommandOutputChars,
            10
          ),
          relayUrl: options.relayUrl,
          repositoryRoot,
          runnerImage: options.runnerImage,
          skipLive: options.skipLive,
          studioUrl: options.studioUrl
        },
        hostClient ? { hostClient } : {}
      );

      await writeJsonDocument(outputPath, bundle);
      printJson({
        diagnostics: {
          commandCount: bundle.commands.length,
          generatedAt: bundle.generatedAt,
          hostErrorCount: bundle.host?.errors.length ?? 0,
          outputPath,
          status: bundle.doctor.status
        }
      });

      if (bundle.doctor.status === "fail") {
        process.exitCode = 1;
      }
    }
  );

const hostCommand = program
  .command("host")
  .description("Interact with a running entangle-host.")
  .option(
    "--host-url <url>",
    "Base URL for entangle-host.",
    process.env.ENTANGLE_HOST_URL ?? "http://localhost:7071"
  )
  .option(
    "--host-token <token>",
    "Bearer token for an entangle-host started with ENTANGLE_HOST_OPERATOR_TOKEN.",
    process.env.ENTANGLE_HOST_TOKEN ?? process.env.ENTANGLE_HOST_OPERATOR_TOKEN
  );

hostCommand
  .command("status")
  .option("--summary", "Print a compact operator-oriented host status summary.")
  .description("Fetch the current status from a running entangle-host.")
  .action(async (options: { summary?: boolean }, command: Command) => {
    const client = createCliHostClient(command);
    const response = await client.getHostStatus();
    printJson(
      options.summary ? { status: projectHostStatusSummary(response) } : response
    );
  });

hostCommand
  .command("artifact-backend-cache-clear")
  .option("--dry-run", "Inspect what would be cleared without deleting cache entries.")
  .option("--git-service <gitServiceRef>", "Clear only cache entries for one git service.")
  .option(
    "--older-than-seconds <n>",
    "Clear only derived cache repositories older than this age."
  )
  .option(
    "--namespace <namespace>",
    "Clear only cache entries for one git namespace. Requires --git-service."
  )
  .option(
    "--repository <repositoryName>",
    "Clear only cache entries for one git repository. Requires --git-service and --namespace."
  )
  .option(
    "--max-size-bytes <n>",
    "Clear oldest derived cache repositories until retained cache size is at or below this many bytes."
  )
  .option("--summary", "Print a compact operator-oriented cache clear summary.")
  .description("Clear Host's derived artifact backend cache.")
  .action(
    async (
      options: {
        dryRun?: boolean;
        gitService?: string;
        maxSizeBytes?: string;
        namespace?: string;
        olderThanSeconds?: string;
        repository?: string;
        summary?: boolean;
      },
      command: Command
    ) => {
      const client = createCliHostClient(command);
      const response = await client.clearArtifactBackendCache({
        dryRun: options.dryRun,
        ...(options.gitService ? { gitServiceRef: options.gitService } : {}),
        ...(options.maxSizeBytes
          ? {
              maxSizeBytes: parsePositiveIntegerOption(
                options.maxSizeBytes,
                "--max-size-bytes"
              )
            }
          : {}),
        ...(options.namespace ? { namespace: options.namespace } : {}),
        ...(options.olderThanSeconds
          ? {
              olderThanSeconds: parsePositiveIntegerOption(
                options.olderThanSeconds,
                "--older-than-seconds"
              )
            }
          : {}),
        ...(options.repository ? { repositoryName: options.repository } : {})
      });
      printJson(
        options.summary
          ? {
              artifactBackendCache: {
                ...response,
                summary: formatHostArtifactBackendCacheClearSummary(response)
              }
            }
          : response
      );
    }
  );

hostCommand
  .command("projection")
  .option("--summary", "Print compact federated projection summaries.")
  .description("Fetch the Host projection snapshot from entangle-host.")
  .action(async (options: { summary?: boolean }, command: Command) => {
    const client = createCliHostClient(command);
    const response = await client.getProjection();
    printJson(
      options.summary
        ? { projection: projectHostProjectionSummary(response) }
        : response
    );
  });

hostCommand
  .command("command-receipts")
  .option("--assignment-id <assignmentId>", "Filter to one runtime assignment.")
  .option("--node-id <nodeId>", "Filter to one graph node.")
  .option("--runner-id <runnerId>", "Filter to one joined runner.")
  .option("--type <commandEventType>", "Filter to one runtime command event type.")
  .option(
    "--status <status>",
    "Filter by command receipt status: received, completed, or failed."
  )
  .option("--limit <n>", "Maximum number of receipts to return.", "20")
  .option("--summary", "Print compact runtime command receipt summaries.")
  .description("List projected runtime command receipts from entangle-host.")
  .action(
    async (
      options: {
        assignmentId?: string;
        limit: string;
        nodeId?: string;
        runnerId?: string;
        status?: string;
        summary?: boolean;
        type?: string;
      },
      command: Command
    ) => {
      const limit = parsePositiveIntegerOption(options.limit, "--limit");
      const receiptStatus = parseRuntimeCommandReceiptStatusForCli(
        options.status
      );
      const client = createCliHostClient(command);
      const projection = await client.getProjection();
      const filteredReceipts = filterRuntimeCommandReceiptsForCli(
        projection.runtimeCommandReceipts,
        {
          ...(options.assignmentId
            ? { assignmentId: options.assignmentId }
            : {}),
          ...(options.nodeId ? { nodeId: options.nodeId } : {}),
          ...(options.runnerId ? { runnerId: options.runnerId } : {}),
          ...(receiptStatus ? { receiptStatus } : {}),
          ...(options.type ? { commandEventType: options.type } : {})
        }
      );
      const receipts = sortRuntimeCommandReceiptsForCli(filteredReceipts).slice(
        0,
        limit
      );

      printJson({
        returned: receipts.length,
        runtimeCommandReceipts: options.summary
          ? receipts.map(projectRuntimeCommandReceiptSummary)
          : receipts,
        totalMatched: filteredReceipts.length
      });
    }
  );

const authorityCommand = program
  .command("authority")
  .description("Inspect and move the Host Authority identity.")
  .option(
    "--host-url <url>",
    "Base URL for entangle-host.",
    process.env.ENTANGLE_HOST_URL ?? "http://localhost:7071"
  )
  .option(
    "--host-token <token>",
    "Bearer token for an entangle-host started with ENTANGLE_HOST_OPERATOR_TOKEN.",
    process.env.ENTANGLE_HOST_TOKEN ?? process.env.ENTANGLE_HOST_OPERATOR_TOKEN
  );

authorityCommand
  .command("show")
  .option("--summary", "Print a compact Host Authority summary.")
  .description("Show the current Host Authority public record and secret status.")
  .action(async (options: { summary?: boolean }, command: Command) => {
    const client = createCliHostClient(command);
    const response = await client.getHostAuthority();
    printJson(
      options.summary
        ? { authority: projectHostAuthoritySummary(response) }
        : response
    );
  });

authorityCommand
  .command("export")
  .option("--output <file>", "Write the portable authority export JSON to a file.")
  .option("--summary", "Print a compact export summary instead of the secret payload.")
  .description("Export the current Host Authority record and secret key.")
  .action(
    async (
      options: { output?: string; summary?: boolean },
      command: Command
    ) => {
      const client = createCliHostClient(command);
      const response = await client.exportHostAuthority();

      if (options.output) {
        await writeJsonDocument(resolveCliPath(options.output), response);
      }

      printJson(
        options.summary || options.output
          ? { authority: projectHostAuthorityExportSummary(response) }
          : response
      );
    }
  );

authorityCommand
  .command("import")
  .argument("<file>", "Path to an authority export JSON file.")
  .option("--summary", "Print a compact import summary.")
  .description("Import a Host Authority record and secret key.")
  .action(
    async (
      file: string,
      options: { summary?: boolean },
      command: Command
    ) => {
      const request = hostAuthorityImportRequestSchema.parse(
        await readJsonDocument(resolveCliPath(file))
      );
      const client = createCliHostClient(command);
      const response = await client.importHostAuthority(request);
      printJson(
        options.summary
          ? { authority: projectHostAuthorityImportSummary(response) }
          : response
      );
    }
  );

const runnersCommand = program
  .command("runners")
  .description("Inspect and manage federated runner registrations.")
  .option(
    "--host-url <url>",
    "Base URL for entangle-host.",
    process.env.ENTANGLE_HOST_URL ?? "http://localhost:7071"
  )
  .option(
    "--host-token <token>",
    "Bearer token for an entangle-host started with ENTANGLE_HOST_OPERATOR_TOKEN.",
    process.env.ENTANGLE_HOST_TOKEN ?? process.env.ENTANGLE_HOST_OPERATOR_TOKEN
  );

runnersCommand
  .command("join-config")
  .requiredOption("--runner <runnerId>", "Runner id to advertise in runner.hello.")
  .option("--output <file>", "Write the join config JSON to a file.")
  .option(
    "--relay-url <url>",
    "Relay URL to use. May be repeated or comma-separated. Defaults to Host status transport relays.",
    collectRepeatedOptionValue
  )
  .option(
    "--runtime-kind <kind>",
    "Runtime kind capability. May be repeated or comma-separated.",
    collectRepeatedOptionValue
  )
  .option(
    "--agent-engine-kind <kind>",
    "Agent engine kind capability. May be repeated or comma-separated.",
    collectRepeatedOptionValue
  )
  .option(
    "--label <label>",
    "Runner capability label. May be repeated or comma-separated.",
    collectRepeatedOptionValue
  )
  .option("--max-assignments <n>", "Maximum concurrent assignments.", "1")
  .option(
    "--heartbeat-interval-ms <ms>",
    "Runner heartbeat interval in milliseconds."
  )
  .option(
    "--secret-env-var <envVar>",
    "Env var that will hold the runner Nostr secret key on the runner machine.",
    "ENTANGLE_RUNNER_NOSTR_SECRET_KEY"
  )
  .option("--runner-public-key <pubkey>", "Expected runner Nostr public key.")
  .option("--host-api-url <url>", "Host API URL written into the join config.")
  .option(
    "--host-token-env-var <envVar>",
    "Env var that will hold the Host API bearer token on the runner machine."
  )
  .option("--no-host-api", "Omit Host API bootstrap settings from the config.")
  .option(
    "--no-runtime-identity-secret",
    "Do not let the runner fetch assigned node identity secrets through Host API."
  )
  .option("--auth-required", "Use AUTH-required Nostr relay publishing/subscription.")
  .option("--summary", "Print a compact join-config summary.")
  .description("Generate a generic entangle-runner join config from Host status.")
  .action(async (
    options: {
      agentEngineKind?: string[];
      authRequired?: boolean;
      heartbeatIntervalMs?: string;
      hostApi?: boolean;
      hostApiUrl?: string;
      hostTokenEnvVar?: string;
      label?: string[];
      maxAssignments: string;
      output?: string;
      relayUrl?: string[];
      runner: string;
      runnerPublicKey?: string;
      runtimeIdentitySecret?: boolean;
      runtimeKind?: string[];
      secretEnvVar: string;
      summary?: boolean;
    },
    command: Command
  ) => {
    const client = createCliHostClient(command);
    const status = await client.getHostStatus();
    const explicitRelayUrls = splitRepeatedCsvOptions(options.relayUrl);
    const relayUrls =
      explicitRelayUrls.length > 0
        ? explicitRelayUrls
        : status.transport.controlObserve.relayUrls;

    if (relayUrls.length === 0) {
      throw new Error(
        "No relay URLs are available. Pass --relay-url or configure Host relay profiles."
      );
    }

    if (!status.authority?.publicKey) {
      throw new Error(
        "Host status does not expose an active Host Authority public key."
      );
    }

    const hostApiAuthEnvVar =
      options.hostTokenEnvVar?.trim() || resolveDefaultHostTokenEnvVar();
    const config = buildRunnerJoinConfig({
      ...(options.agentEngineKind
        ? { agentEngineKinds: options.agentEngineKind }
        : {}),
      authRequired: options.authRequired ?? false,
      ...(hostApiAuthEnvVar ? { hostApiAuthEnvVar } : {}),
      hostApiBaseUrl: options.hostApiUrl ?? resolveHostUrl(command),
      ...(options.heartbeatIntervalMs
        ? {
            heartbeatIntervalMs: parsePositiveIntegerOption(
              options.heartbeatIntervalMs,
              "--heartbeat-interval-ms"
            )
          }
        : {}),
      hostAuthorityPubkey: status.authority.publicKey,
      includeHostApi: options.hostApi ?? true,
      includeRuntimeIdentitySecret: options.runtimeIdentitySecret ?? true,
      ...(options.label ? { labels: options.label } : {}),
      maxAssignments: parsePositiveIntegerOption(
        options.maxAssignments,
        "--max-assignments"
      ),
      relayUrls,
      runnerId: options.runner,
      ...(options.runnerPublicKey
        ? { runnerPublicKey: options.runnerPublicKey }
        : {}),
      ...(options.runtimeKind ? { runtimeKinds: options.runtimeKind } : {}),
      secretEnvVar: options.secretEnvVar
    });
    const outputPath = options.output
      ? resolveCliPath(options.output)
      : undefined;

    if (outputPath) {
      await writeJsonDocument(outputPath, config);
    }

    printJson(
      options.summary
        ? {
            joinConfig: projectRunnerJoinConfigSummary(config),
            ...(outputPath ? { outputPath } : {})
          }
        : outputPath
          ? { joinConfig: config, outputPath }
          : config
    );
  });

runnersCommand
  .command("list")
  .option("--summary", "Print compact runner summaries.")
  .description("List federated runner registrations.")
  .action(async (options: { summary?: boolean }, command: Command) => {
    const client = createCliHostClient(command);
    const response = await client.listRunners();
    printJson(
      options.summary
        ? {
            runners: sortRunnerRegistryEntriesForPresentation(
              response.runners
            ).map(projectRunnerRegistrySummary)
          }
        : response
    );
  });

runnersCommand
  .command("get")
  .argument("<runnerId>", "Runner registration identifier.")
  .option("--summary", "Print a compact runner summary.")
  .description("Inspect one federated runner registration.")
  .action(async (
    runnerId: string,
    options: { summary?: boolean },
    command: Command
  ) => {
    const client = createCliHostClient(command);
    const response = await client.getRunner(runnerId);
    printJson(
      options.summary
        ? { runner: projectRunnerRegistrySummary(response.runner) }
        : response
    );
  });

runnersCommand
  .command("trust")
  .argument("<runnerId>", "Runner registration identifier.")
  .option("--reason <reason>", "Operator note for the trust decision.")
  .option("--trusted-by <operatorId>", "Operator identifier for audit context.")
  .option("--summary", "Print a compact runner summary.")
  .description("Trust a pending or previously revoked runner registration.")
  .action(async (
    runnerId: string,
    options: { reason?: string; summary?: boolean; trustedBy?: string },
    command: Command
  ) => {
    const client = createCliHostClient(command);
    const response = await client.trustRunner(runnerId, {
      ...(options.reason ? { reason: options.reason } : {}),
      ...(options.trustedBy ? { trustedBy: options.trustedBy } : {})
    });
    printJson(
      options.summary
        ? { runner: projectRunnerRegistrySummary(response.runner) }
        : response
    );
  });

runnersCommand
  .command("revoke")
  .argument("<runnerId>", "Runner registration identifier.")
  .option("--reason <reason>", "Operator note for the revoke decision.")
  .option("--revoked-by <operatorId>", "Operator identifier for audit context.")
  .option("--summary", "Print a compact runner summary.")
  .description("Revoke a runner registration.")
  .action(async (
    runnerId: string,
    options: { reason?: string; revokedBy?: string; summary?: boolean },
    command: Command
  ) => {
    const client = createCliHostClient(command);
    const response = await client.revokeRunner(runnerId, {
      ...(options.reason ? { reason: options.reason } : {}),
      ...(options.revokedBy ? { revokedBy: options.revokedBy } : {})
    });
    printJson(
      options.summary
        ? { runner: projectRunnerRegistrySummary(response.runner) }
        : response
    );
  });

const assignmentsCommand = program
  .command("assignments")
  .description("Inspect and manage federated runtime assignments.")
  .option(
    "--host-url <url>",
    "Base URL for entangle-host.",
    process.env.ENTANGLE_HOST_URL ?? "http://localhost:7071"
  )
  .option(
    "--host-token <token>",
    "Bearer token for an entangle-host started with ENTANGLE_HOST_OPERATOR_TOKEN.",
    process.env.ENTANGLE_HOST_TOKEN ?? process.env.ENTANGLE_HOST_OPERATOR_TOKEN
  );

assignmentsCommand
  .command("list")
  .option("--summary", "Print compact assignment summaries.")
  .description("List federated runtime assignments.")
  .action(async (options: { summary?: boolean }, command: Command) => {
    const client = createCliHostClient(command);
    const response = await client.listAssignments();
    printJson(
      options.summary
        ? {
            assignments: sortRuntimeAssignmentsForCli(
              response.assignments
            ).map(projectRuntimeAssignmentSummary)
          }
        : response
    );
  });

assignmentsCommand
  .command("get")
  .argument("<assignmentId>", "Runtime assignment identifier.")
  .option("--summary", "Print a compact assignment summary.")
  .description("Inspect one federated runtime assignment.")
  .action(async (
    assignmentId: string,
    options: { summary?: boolean },
    command: Command
  ) => {
    const client = createCliHostClient(command);
    const response = await client.getAssignment(assignmentId);
    printJson(
      options.summary
        ? { assignment: projectRuntimeAssignmentSummary(response.assignment) }
        : response
    );
  });

assignmentsCommand
  .command("timeline")
  .argument("<assignmentId>", "Runtime assignment identifier.")
  .option("--summary", "Print compact assignment timeline summaries.")
  .description("Inspect assignment status and runner receipt timeline.")
  .action(async (
    assignmentId: string,
    options: { summary?: boolean },
    command: Command
  ) => {
    const client = createCliHostClient(command);
    const response = await client.getAssignmentTimeline(assignmentId);
    printJson(
      options.summary
        ? projectRuntimeAssignmentTimelineSummary(response)
        : response
    );
  });

assignmentsCommand
  .command("offer")
  .requiredOption("--node <nodeId>", "Node id to assign.")
  .requiredOption("--runner <runnerId>", "Trusted runner id to receive the node.")
  .option("--assignment-id <assignmentId>", "Explicit assignment id.")
  .option("--lease-duration-seconds <seconds>", "Lease duration in seconds.", "600")
  .option("--policy-revision-id <policyRevisionId>", "Optional policy revision id.")
  .option("--summary", "Print a compact assignment summary.")
  .description("Offer a runtime assignment to a trusted runner.")
  .action(async (
    options: {
      assignmentId?: string;
      leaseDurationSeconds: string;
      node: string;
      policyRevisionId?: string;
      runner: string;
      summary?: boolean;
    },
    command: Command
  ) => {
    const request = runtimeAssignmentOfferRequestSchema.parse({
      ...(options.assignmentId ? { assignmentId: options.assignmentId } : {}),
      leaseDurationSeconds: Number.parseInt(options.leaseDurationSeconds, 10),
      nodeId: options.node,
      ...(options.policyRevisionId
        ? { policyRevisionId: options.policyRevisionId }
        : {}),
      runnerId: options.runner
    });
    const client = createCliHostClient(command);
    const response = await client.offerAssignment(request);

    printJson(
      options.summary
        ? { assignment: projectRuntimeAssignmentSummary(response.assignment) }
        : response
    );
  });

assignmentsCommand
  .command("revoke")
  .argument("<assignmentId>", "Runtime assignment identifier.")
  .option("--reason <reason>", "Operator note for the revocation.")
  .option("--revoked-by <operatorId>", "Operator identifier for audit context.")
  .option("--summary", "Print a compact assignment summary.")
  .description("Revoke a runtime assignment.")
  .action(async (
    assignmentId: string,
    options: { reason?: string; revokedBy?: string; summary?: boolean },
    command: Command
  ) => {
    const request = runtimeAssignmentRevokeRequestSchema.parse({
      ...(options.reason ? { reason: options.reason } : {}),
      ...(options.revokedBy ? { revokedBy: options.revokedBy } : {})
    });
    const client = createCliHostClient(command);
    const response = await client.revokeAssignment(assignmentId, request);

    printJson(
      options.summary
        ? { assignment: projectRuntimeAssignmentSummary(response.assignment) }
        : response
    );
  });

const userNodesCommand = program
  .command("user-nodes")
  .description("Inspect User Node identities and publish signed User Node messages.")
  .option(
    "--host-url <url>",
    "Base URL for entangle-host.",
    process.env.ENTANGLE_HOST_URL ?? "http://localhost:7071"
  )
  .option(
    "--host-token <token>",
    "Bearer token for an entangle-host started with ENTANGLE_HOST_OPERATOR_TOKEN.",
    process.env.ENTANGLE_HOST_TOKEN ?? process.env.ENTANGLE_HOST_OPERATOR_TOKEN
  );

userNodesCommand
  .command("list")
  .option("--summary", "Print compact User Node summaries.")
  .description("List active graph User Node identities.")
  .action(async (options: { summary?: boolean }, command: Command) => {
    const client = createCliHostClient(command);
    const response = await client.listUserNodes();
    printJson(
      options.summary
        ? {
            userNodes: sortUserNodeIdentitiesForCli(response.userNodes).map(
              projectUserNodeIdentitySummary
            )
          }
        : response
    );
  });

userNodesCommand
  .command("get")
  .argument("<nodeId>", "User Node identifier.")
  .option("--summary", "Print a compact User Node summary.")
  .description("Inspect one User Node identity.")
  .action(async (
    nodeId: string,
    options: { summary?: boolean },
    command: Command
  ) => {
    const client = createCliHostClient(command);
    const response = await client.getUserNode(nodeId);
    printJson(
      options.summary
        ? { userNode: projectUserNodeIdentitySummary(response.userNode) }
        : response
    );
  });

userNodesCommand
  .command("clients")
  .option("--summary", "Print compact User Client runtime summaries.")
  .description("List User Client endpoints projected for active graph User Nodes.")
  .action(async (options: { summary?: boolean }, command: Command) => {
    const client = createCliHostClient(command);
    const [userNodes, projection] = await Promise.all([
      client.listUserNodes(),
      client.getProjection()
    ]);
    const clients = buildUserNodeClientSummariesForCli({
      projection,
      userNodes: userNodes.userNodes
    });

    printJson(options.summary ? { clients } : { generatedAt: projection.generatedAt, clients });
  });

userNodesCommand
  .command("message")
  .argument("<nodeId>", "User Node identifier.")
  .argument("<targetNodeId>", "Target runtime node id.")
  .argument("<summary>", "Message summary/body.")
  .option("--message-type <type>", "A2A message type.", "task.request")
  .option("--approval-id <approvalId>", "Approval id for approval.response messages.")
  .option(
    "--approval-decision <decision>",
    "Approval decision for approval.response messages."
  )
  .option(
    "--approval-operation <operation>",
    "Scoped policy operation for approval.response context."
  )
  .option(
    "--approval-reason <reason>",
    "Reason/context carried on the signed approval.response metadata."
  )
  .option(
    "--approval-resource-id <id>",
    "Scoped resource id for approval.response context."
  )
  .option(
    "--approval-resource-kind <kind>",
    "Scoped resource kind for approval.response context."
  )
  .option(
    "--approval-resource-label <label>",
    "Human-readable scoped resource label for approval.response context."
  )
  .option(
    "--source-candidate-id <candidateId>",
    "Source-change candidate id for source_change.review messages."
  )
  .option(
    "--source-review-decision <decision>",
    "Source-change review decision for source_change.review messages."
  )
  .option(
    "--source-review-reason <reason>",
    "Reason/context carried on signed source_change.review metadata."
  )
  .option("--conversation-id <conversationId>", "Conversation id to reuse.")
  .option("--session-id <sessionId>", "Session id to reuse.")
  .option("--turn-id <turnId>", "Turn id to use.")
  .option("--parent-message-id <eventId>", "Parent Nostr event id.")
  .option("--compact", "Print a compact publish summary.")
  .description("Publish a signed User Node A2A message through entangle-host.")
  .action(async (
    nodeId: string,
    targetNodeId: string,
    summary: string,
    options: {
      approvalDecision?: string;
      approvalId?: string;
      approvalOperation?: string;
      approvalReason?: string;
      approvalResourceId?: string;
      approvalResourceKind?: string;
      approvalResourceLabel?: string;
      compact?: boolean;
      conversationId?: string;
      messageType: string;
      parentMessageId?: string;
      sessionId?: string;
      sourceCandidateId?: string;
      sourceReviewDecision?: string;
      sourceReviewReason?: string;
      turnId?: string;
    },
    command: Command
  ) => {
    if (
      (options.approvalId ||
        options.approvalDecision ||
        hasUserNodeApprovalContextOptions(options)) &&
      (!options.approvalId || !options.approvalDecision)
    ) {
      throw new Error(
        "User Node approval messages require both --approval-id and --approval-decision."
      );
    }

    if (
      (options.sourceCandidateId ||
        options.sourceReviewDecision ||
        options.sourceReviewReason) &&
      (!options.sourceCandidateId || !options.sourceReviewDecision)
    ) {
      throw new Error(
        "User Node source review messages require both --source-candidate-id and --source-review-decision."
      );
    }

    if (
      (options.sourceCandidateId ||
        options.sourceReviewDecision ||
        options.sourceReviewReason) &&
      options.messageType !== "source_change.review"
    ) {
      throw new Error(
        "Use --message-type source_change.review with source review metadata."
      );
    }

    const request = userNodeMessagePublishRequestSchema.parse({
      ...(options.approvalId && options.approvalDecision
        ? {
            approval: buildUserNodeApprovalMetadata({
              approvalId: options.approvalId,
              decision: options.approvalDecision,
              options
            })
          }
        : {}),
      ...(options.sourceCandidateId && options.sourceReviewDecision
        ? {
            sourceChangeReview: buildUserNodeSourceChangeReviewMetadata({
              candidateId: options.sourceCandidateId,
              decision: options.sourceReviewDecision,
              ...(options.sourceReviewReason
                ? { reason: options.sourceReviewReason }
                : {})
            })
          }
        : {}),
      ...(options.conversationId
        ? { conversationId: options.conversationId }
        : {}),
      messageType: options.messageType,
      ...(options.parentMessageId
        ? { parentMessageId: options.parentMessageId }
        : {}),
      ...(options.sessionId ? { sessionId: options.sessionId } : {}),
      summary,
      targetNodeId,
      ...(options.turnId ? { turnId: options.turnId } : {})
    });
    const client = createCliHostClient(command);
    const response = await client.publishUserNodeMessage(nodeId, request);

    printJson(
      options.compact
        ? { message: projectUserNodeMessagePublishSummary(response) }
        : response
    );
  });

const inboxCommand = program
  .command("inbox")
  .description("Inspect User Node conversation projection.")
  .option(
    "--host-url <url>",
    "Base URL for entangle-host.",
    process.env.ENTANGLE_HOST_URL ?? "http://localhost:7071"
  )
  .option(
    "--host-token <token>",
    "Bearer token for an entangle-host started with ENTANGLE_HOST_OPERATOR_TOKEN.",
    process.env.ENTANGLE_HOST_TOKEN ?? process.env.ENTANGLE_HOST_OPERATOR_TOKEN
  );

inboxCommand
  .command("list")
  .requiredOption("--user-node <nodeId>", "User Node identifier.")
  .option("--summary", "Print compact conversation summaries.")
  .description("List projected conversations for one User Node.")
  .action(async (
    options: { summary?: boolean; userNode: string },
    command: Command
  ) => {
    const client = createCliHostClient(command);
    const inbox = await client.getUserNodeInbox(options.userNode);
    const conversations = sortUserConversationsForCli(inbox.conversations);

    printJson(
      options.summary
        ? {
            conversations: conversations.map(projectUserConversationSummary)
          }
        : { conversations }
    );
  });

inboxCommand
  .command("show")
  .argument("<conversationId>", "Projected conversation identifier.")
  .requiredOption("--user-node <nodeId>", "User Node identifier.")
  .option("--summary", "Print a compact conversation summary.")
  .description("Inspect one projected User Node conversation.")
  .action(async (
    conversationId: string,
    options: { summary?: boolean; userNode: string },
    command: Command
  ) => {
    const client = createCliHostClient(command);
    const detail = await client.getUserNodeConversation(
      options.userNode,
      conversationId
    );
    const conversation = detail.conversation;

    if (!conversation) {
      throw new Error(
        `Conversation '${conversationId}' was not found for User Node '${options.userNode}'.`
      );
    }

    printJson(
      options.summary
        ? {
            conversation: projectUserConversationSummary(conversation),
            messageCount: detail.messages.length,
            messages: detail.messages.map(projectUserNodeMessageSummary)
          }
        : {
            conversation,
            messages: detail.messages
          }
    );
  });

inboxCommand
  .command("read")
  .argument("<conversationId>", "Projected conversation identifier.")
  .requiredOption("--user-node <nodeId>", "User Node identifier.")
  .option("--summary", "Print the compact updated conversation summary.")
  .description("Mark one User Node conversation as read.")
  .action(async (
    conversationId: string,
    options: { summary?: boolean; userNode: string },
    command: Command
  ) => {
    const client = createCliHostClient(command);
    const response = await client.markUserNodeConversationRead(
      options.userNode,
      conversationId
    );

    printJson(
      options.summary && response.conversation
        ? {
            conversation: projectUserConversationSummary(response.conversation),
            read: response.read
          }
        : response
    );
  });

program
  .command("reply")
  .argument("<targetNodeId>", "Target runtime node id.")
  .argument("<summary>", "Reply body.")
  .requiredOption("--user-node <nodeId>", "Signing User Node identifier.")
  .option("--conversation-id <conversationId>", "Conversation id to reuse.")
  .option("--session-id <sessionId>", "Session id to reuse.")
  .option("--turn-id <turnId>", "Turn id to use.")
  .option("--parent-message-id <eventId>", "Parent Nostr event id.")
  .option("--compact", "Print a compact publish summary.")
  .option(
    "--host-url <url>",
    "Base URL for entangle-host.",
    process.env.ENTANGLE_HOST_URL ?? "http://localhost:7071"
  )
  .option(
    "--host-token <token>",
    "Bearer token for an entangle-host started with ENTANGLE_HOST_OPERATOR_TOKEN.",
    process.env.ENTANGLE_HOST_TOKEN ?? process.env.ENTANGLE_HOST_OPERATOR_TOKEN
  )
  .description("Publish a signed User Node reply.")
  .action(async (
    targetNodeId: string,
    summary: string,
    options: {
      compact?: boolean;
      conversationId?: string;
      parentMessageId?: string;
      sessionId?: string;
      turnId?: string;
      userNode: string;
    },
    command: Command
  ) => {
    const request = userNodeMessagePublishRequestSchema.parse({
      ...(options.conversationId
        ? { conversationId: options.conversationId }
        : {}),
      messageType: "answer",
      ...(options.parentMessageId
        ? { parentMessageId: options.parentMessageId }
        : {}),
      ...(options.sessionId ? { sessionId: options.sessionId } : {}),
      summary,
      targetNodeId,
      ...(options.turnId ? { turnId: options.turnId } : {})
    });
    const client = createCliHostClient(command);
    const response = await client.publishUserNodeMessage(
      options.userNode,
      request
    );

    printJson(
      options.compact
        ? { message: projectUserNodeMessagePublishSummary(response) }
        : response
    );
  });

program
  .command("approve")
  .argument("[approvalId]", "Approval identifier unless --from-message supplies it.")
  .requiredOption("--user-node <nodeId>", "Signing User Node identifier.")
  .option("--target-node <nodeId>", "Target runtime node id.")
  .option(
    "--from-message <eventId>",
    "Recorded inbound approval.request event id to reuse conversation and scoped context."
  )
  .option("--body <body>", "Approval response body.")
  .option(
    "--approval-operation <operation>",
    "Scoped policy operation carried on the signed approval.response metadata."
  )
  .option(
    "--approval-reason <reason>",
    "Reason/context carried on the signed approval.response metadata."
  )
  .option(
    "--approval-resource-id <id>",
    "Scoped resource id carried on the signed approval.response metadata."
  )
  .option(
    "--approval-resource-kind <kind>",
    "Scoped resource kind carried on the signed approval.response metadata."
  )
  .option(
    "--approval-resource-label <label>",
    "Human-readable scoped resource label carried on the signed approval.response metadata."
  )
  .option("--conversation-id <conversationId>", "Conversation id to reuse.")
  .option("--session-id <sessionId>", "Session id to reuse.")
  .option("--turn-id <turnId>", "Turn id to use.")
  .option("--parent-message-id <eventId>", "Parent Nostr event id.")
  .option("--compact", "Print a compact publish summary.")
  .option(
    "--host-url <url>",
    "Base URL for entangle-host.",
    process.env.ENTANGLE_HOST_URL ?? "http://localhost:7071"
  )
  .option(
    "--host-token <token>",
    "Bearer token for an entangle-host started with ENTANGLE_HOST_OPERATOR_TOKEN.",
    process.env.ENTANGLE_HOST_TOKEN ?? process.env.ENTANGLE_HOST_OPERATOR_TOKEN
  )
  .description("Publish a signed User Node approval response.")
  .action(async (
    approvalId: string | undefined,
    options: {
      body?: string;
      compact?: boolean;
      conversationId?: string;
      fromMessage?: string;
      approvalOperation?: string;
      approvalReason?: string;
      approvalResourceId?: string;
      approvalResourceKind?: string;
      approvalResourceLabel?: string;
      parentMessageId?: string;
      sessionId?: string;
      targetNode?: string;
      turnId?: string;
      userNode: string;
    },
    command: Command
  ) => {
    const client = createCliHostClient(command);
    const request = userNodeMessagePublishRequestSchema.parse(
      options.fromMessage
        ? buildUserNodeApprovalPublishRequestFromMessage({
            ...(approvalId ? { approvalId } : {}),
            decision: "approved",
            message: await findUserNodeMessageByEventId({
              client,
              eventId: options.fromMessage,
              userNodeId: options.userNode
            }),
            options,
            ...(options.body ? { summary: options.body } : {})
          })
        : (() => {
            if (!approvalId || !options.targetNode) {
              throw new Error(
                "Approval id and --target-node are required unless --from-message is supplied."
              );
            }

            return {
              approval: buildUserNodeApprovalMetadata({
                approvalId,
                decision: "approved",
                options
              }),
              ...(options.conversationId
                ? { conversationId: options.conversationId }
                : {}),
              messageType: "approval.response" as const,
              ...(options.parentMessageId
                ? { parentMessageId: options.parentMessageId }
                : {}),
              ...(options.sessionId ? { sessionId: options.sessionId } : {}),
              summary: options.body ?? `Approved ${approvalId}.`,
              targetNodeId: options.targetNode,
              ...(options.turnId ? { turnId: options.turnId } : {})
            };
          })()
    );
    const response = await client.publishUserNodeMessage(
      options.userNode,
      request
    );

    printJson(
      options.compact
        ? { message: projectUserNodeMessagePublishSummary(response) }
        : response
    );
  });

program
  .command("reject")
  .argument("[approvalId]", "Approval identifier unless --from-message supplies it.")
  .requiredOption("--user-node <nodeId>", "Signing User Node identifier.")
  .option("--target-node <nodeId>", "Target runtime node id.")
  .option(
    "--from-message <eventId>",
    "Recorded inbound approval.request event id to reuse conversation and scoped context."
  )
  .option("--reason <reason>", "Rejection reason.")
  .option(
    "--approval-operation <operation>",
    "Scoped policy operation carried on the signed approval.response metadata."
  )
  .option(
    "--approval-reason <reason>",
    "Reason/context carried on the signed approval.response metadata."
  )
  .option(
    "--approval-resource-id <id>",
    "Scoped resource id carried on the signed approval.response metadata."
  )
  .option(
    "--approval-resource-kind <kind>",
    "Scoped resource kind carried on the signed approval.response metadata."
  )
  .option(
    "--approval-resource-label <label>",
    "Human-readable scoped resource label carried on the signed approval.response metadata."
  )
  .option("--conversation-id <conversationId>", "Conversation id to reuse.")
  .option("--session-id <sessionId>", "Session id to reuse.")
  .option("--turn-id <turnId>", "Turn id to use.")
  .option("--parent-message-id <eventId>", "Parent Nostr event id.")
  .option("--compact", "Print a compact publish summary.")
  .option(
    "--host-url <url>",
    "Base URL for entangle-host.",
    process.env.ENTANGLE_HOST_URL ?? "http://localhost:7071"
  )
  .option(
    "--host-token <token>",
    "Bearer token for an entangle-host started with ENTANGLE_HOST_OPERATOR_TOKEN.",
    process.env.ENTANGLE_HOST_TOKEN ?? process.env.ENTANGLE_HOST_OPERATOR_TOKEN
  )
  .description("Publish a signed User Node rejection response.")
  .action(async (
    approvalId: string | undefined,
    options: {
      approvalOperation?: string;
      approvalReason?: string;
      approvalResourceId?: string;
      approvalResourceKind?: string;
      approvalResourceLabel?: string;
      compact?: boolean;
      conversationId?: string;
      fromMessage?: string;
      parentMessageId?: string;
      reason?: string;
      sessionId?: string;
      targetNode?: string;
      turnId?: string;
      userNode: string;
    },
    command: Command
  ) => {
    const client = createCliHostClient(command);
    const request = userNodeMessagePublishRequestSchema.parse(
      options.fromMessage
        ? buildUserNodeApprovalPublishRequestFromMessage({
            ...(approvalId ? { approvalId } : {}),
            decision: "rejected",
            message: await findUserNodeMessageByEventId({
              client,
              eventId: options.fromMessage,
              userNodeId: options.userNode
            }),
            options,
            ...(options.reason ? { summary: options.reason } : {})
          })
        : (() => {
            if (!approvalId || !options.targetNode) {
              throw new Error(
                "Approval id and --target-node are required unless --from-message is supplied."
              );
            }

            return {
              approval: buildUserNodeApprovalMetadata({
                approvalId,
                decision: "rejected",
                options
              }),
              ...(options.conversationId
                ? { conversationId: options.conversationId }
                : {}),
              messageType: "approval.response" as const,
              ...(options.parentMessageId
                ? { parentMessageId: options.parentMessageId }
                : {}),
              ...(options.sessionId ? { sessionId: options.sessionId } : {}),
              summary: options.reason ?? `Rejected ${approvalId}.`,
              targetNodeId: options.targetNode,
              ...(options.turnId ? { turnId: options.turnId } : {})
            };
          })()
    );
    const response = await client.publishUserNodeMessage(
      options.userNode,
      request
    );

    printJson(
      options.compact
        ? { message: projectUserNodeMessagePublishSummary(response) }
        : response
    );
  });

program
  .command("review-source-candidate")
  .argument("[candidateId]", "Source-change candidate id unless --from-message supplies it.")
  .requiredOption("--user-node <nodeId>", "Signing User Node identifier.")
  .requiredOption(
    "--decision <decision>",
    "Signed source review decision: accepted or rejected."
  )
  .option("--target-node <nodeId>", "Target runtime node id.")
  .option(
    "--from-message <eventId>",
    "Recorded inbound approval.request event id with a source_change_candidate resource."
  )
  .option("--reason <reason>", "Source review reason.")
  .option("--body <body>", "Source review body.")
  .option("--conversation-id <conversationId>", "Conversation id to reuse.")
  .option("--session-id <sessionId>", "Session id to reuse.")
  .option("--turn-id <turnId>", "Turn id to use.")
  .option("--parent-message-id <eventId>", "Parent Nostr event id.")
  .option("--compact", "Print a compact publish summary.")
  .option(
    "--host-url <url>",
    "Base URL for entangle-host.",
    process.env.ENTANGLE_HOST_URL ?? "http://localhost:7071"
  )
  .option(
    "--host-token <token>",
    "Bearer token for an entangle-host started with ENTANGLE_HOST_OPERATOR_TOKEN.",
    process.env.ENTANGLE_HOST_TOKEN ?? process.env.ENTANGLE_HOST_OPERATOR_TOKEN
  )
  .description("Publish a signed User Node source-change review.")
  .action(async (
    candidateId: string | undefined,
    options: {
      body?: string;
      compact?: boolean;
      conversationId?: string;
      decision: string;
      fromMessage?: string;
      parentMessageId?: string;
      reason?: string;
      sessionId?: string;
      targetNode?: string;
      turnId?: string;
      userNode: string;
    },
    command: Command
  ) => {
    const client = createCliHostClient(command);
    const request = userNodeMessagePublishRequestSchema.parse(
      options.fromMessage
        ? buildUserNodeSourceChangeReviewPublishRequestFromMessage({
            ...(candidateId ? { candidateId } : {}),
            decision: options.decision,
            message: await findUserNodeMessageByEventId({
              client,
              eventId: options.fromMessage,
              userNodeId: options.userNode
            }),
            ...(options.reason ? { reason: options.reason } : {}),
            ...(options.body ? { summary: options.body } : {})
          })
        : (() => {
            if (!candidateId || !options.targetNode || !options.parentMessageId) {
              throw new Error(
                "Candidate id, --target-node, and --parent-message-id are required unless --from-message is supplied."
              );
            }

            const review = buildUserNodeSourceChangeReviewMetadata({
              candidateId,
              decision: options.decision,
              ...(options.reason ? { reason: options.reason } : {})
            });

            return {
              ...(options.conversationId
                ? { conversationId: options.conversationId }
                : {}),
              messageType: "source_change.review" as const,
              parentMessageId: options.parentMessageId,
              responsePolicy: {
                closeOnResult: false,
                maxFollowups: 0,
                responseRequired: false
              },
              ...(options.sessionId ? { sessionId: options.sessionId } : {}),
              sourceChangeReview: review,
              summary:
                options.body ??
                `${review.decision === "accepted" ? "Accepted" : "Rejected"} source change ${candidateId}.`,
              targetNodeId: options.targetNode,
              ...(options.turnId ? { turnId: options.turnId } : {})
            };
          })()
    );
    const response = await client.publishUserNodeMessage(
      options.userNode,
      request
    );

    printJson(
      options.compact
        ? { message: projectUserNodeMessagePublishSummary(response) }
        : response
    );
  });

const hostEventsCommand = hostCommand
  .command("events")
  .description("Inspect and watch typed host events.");

hostEventsCommand
  .command("list")
  .option("--limit <n>", "Maximum number of events to fetch.", "100")
  .option("--category <category>", "Filter by host event category.")
  .option("--node-id <nodeId>", "Filter to one runtime or session node id.")
  .option("--operator-id <operatorId>", "Filter to one bootstrap operator id.")
  .option("--status-code <statusCode>", "Filter to one HTTP status code.")
  .option(
    "--type-prefix <prefix>",
    "Filter to event types that start with the given prefix. Repeatable.",
    collectRepeatedOptionValue,
    [] as string[]
  )
  .option(
    "--recovery-only",
    "Limit results to runtime recovery-related host events."
  )
  .option(
    "--runtime-trace-only",
    "Limit results to host-derived runtime trace events."
  )
  .option(
    "--summary",
    "Print structured runtime-trace summaries instead of raw host event objects."
  )
  .description("List typed host events from entangle-host with optional client-side filtering.")
  .action(
    async (
      options: {
        category?: HostEventRecord["category"];
        limit: string;
        nodeId?: string;
        operatorId?: string;
        recoveryOnly?: boolean;
        runtimeTraceOnly?: boolean;
        summary?: boolean;
        statusCode?: string;
        typePrefix: string[];
      },
      command: Command
    ) => {
      const client = createCliHostClient(command);
      const filter = buildHostEventFilter(
        buildCliHostEventInspectionOptions(options)
      );
      const response = await client.listHostEvents({
        ...(options.category ? { category: options.category } : {}),
        limit: parsePositiveIntegerOption(options.limit, "--limit"),
        ...(options.nodeId ? { nodeId: options.nodeId } : {}),
        ...(options.operatorId ? { operatorId: options.operatorId } : {}),
        ...(options.statusCode
          ? {
              statusCode: parsePositiveIntegerOption(
                options.statusCode,
                "--status-code"
              )
            }
          : {}),
        ...(filter.typePrefixes && filter.typePrefixes.length > 0
          ? { typePrefix: filter.typePrefixes }
          : {})
      });
      renderCliHostEvents(
        filterHostEvents(response.events, filter),
        options.summary === true
      );
    }
  );

hostEventsCommand
  .command("integrity")
  .option("--signed", "Print a Host Authority-signed integrity report.")
  .description("Verify the Host event audit hash chain.")
  .action(async (options: { signed?: boolean }, command: Command) => {
    const client = createCliHostClient(command);
    printJson(
      options.signed
        ? await client.exportSignedHostEventIntegrityReport()
        : await client.inspectHostEventIntegrity()
    );
  });

hostEventsCommand
  .command("audit-bundle")
  .description("Export Host events with a signed integrity report and bundle hashes.")
  .action(async (_options: Record<string, never>, command: Command) => {
    const client = createCliHostClient(command);
    printJson(await client.exportHostEventAuditBundle());
  });

hostEventsCommand
  .command("watch")
  .option("--replay <n>", "Replay the last N persisted events before streaming.", "20")
  .option("--category <category>", "Filter by host event category.")
  .option("--node-id <nodeId>", "Filter to one runtime or session node id.")
  .option("--operator-id <operatorId>", "Filter to one bootstrap operator id.")
  .option("--status-code <statusCode>", "Filter to one HTTP status code.")
  .option(
    "--type-prefix <prefix>",
    "Filter to event types that start with the given prefix. Repeatable.",
    collectRepeatedOptionValue,
    [] as string[]
  )
  .option(
    "--recovery-only",
    "Limit the live stream to runtime recovery-related host events."
  )
  .option(
    "--runtime-trace-only",
    "Limit the live stream to host-derived runtime trace events."
  )
  .option(
    "--summary",
    "Print structured runtime-trace summaries instead of raw host event objects."
  )
  .description("Stream typed host events from entangle-host until interrupted.")
  .action(
    async (
      options: {
        category?: HostEventRecord["category"];
        nodeId?: string;
        operatorId?: string;
        recoveryOnly?: boolean;
        replay: string;
        runtimeTraceOnly?: boolean;
        summary?: boolean;
        statusCode?: string;
        typePrefix: string[];
      },
      command: Command
    ) => {
      await watchHostEvents({
        command,
        filterOptions: buildCliHostEventInspectionOptions(options),
        replay: Number.parseInt(options.replay, 10),
        summary: options.summary === true
      });
    }
  );

const hostCatalogCommand = hostCommand
  .command("catalog")
  .description("Inspect and mutate the active deployment resource catalog.");

hostCatalogCommand
  .command("get")
  .description("Print the active deployment resource catalog and validation report.")
  .action(async (_options, command: Command) => {
    const client = createCliHostClient(command);
    printJson(await client.getCatalog());
  });

hostCatalogCommand
  .command("validate")
  .argument("<file>", "Path to a catalog JSON file.")
  .description("Validate a catalog document against the running host contract.")
  .action(async (file: string, _options, command: Command) => {
    const client = createCliHostClient(command);
    printJson(await client.validateCatalog(await readJsonDocument(resolveCliPath(file))));
  });

hostCatalogCommand
  .command("apply")
  .argument("<file>", "Path to a catalog JSON file.")
  .option(
    "--dry-run",
    "Print the canonical catalog-apply payload without mutating the host."
  )
  .description("Apply a catalog document through entangle-host.")
  .action(async (file: string, options: { dryRun?: boolean }, command: Command) => {
    const client = createCliHostClient(command);
    const request = await readJsonDocument(resolveCliPath(file));

    if (options.dryRun) {
      printJson(
        buildCliMutationDryRun({
          mutation: "host.catalog.apply",
          request
        })
      );
      return;
    }

    printJson(await client.applyCatalog(request));
  });

const hostCatalogAgentEngineCommand = hostCatalogCommand
  .command("agent-engine")
  .description("Manage agent engine profiles in the active deployment catalog.");

hostCatalogAgentEngineCommand
  .command("list")
  .option("--summary", "Print compact profile summaries.")
  .description("List agent engine profiles from the active deployment catalog.")
  .action(async (options: { summary?: boolean }, command: Command) => {
    const client = createCliHostClient(command);
    const inspection = await client.getCatalog();

    if (!inspection.catalog) {
      throw new Error("Host catalog is unavailable or invalid.");
    }

    const catalog = inspection.catalog;
    const profiles = sortAgentEngineProfilesForCli(catalog.agentEngineProfiles);

    printJson(
      options.summary
        ? {
            defaultAgentEngineProfileRef:
              catalog.defaults.agentEngineProfileRef,
            profiles: profiles.map((profile) =>
              projectAgentEngineProfileSummary({
                catalog,
                profile
              })
            )
          }
        : {
            defaultAgentEngineProfileRef:
              catalog.defaults.agentEngineProfileRef,
            profiles
          }
    );
  });

hostCatalogAgentEngineCommand
  .command("get")
  .argument("<profileId>", "Agent engine profile id.")
  .option("--summary", "Print a compact profile summary.")
  .description("Inspect one agent engine profile from the active deployment catalog.")
  .action(
    async (
      profileId: string,
      options: { summary?: boolean },
      command: Command
    ) => {
      const client = createCliHostClient(command);
      const inspection = await client.getCatalog();

      if (!inspection.catalog) {
        throw new Error("Host catalog is unavailable or invalid.");
      }

      const profile = inspection.catalog.agentEngineProfiles.find(
        (candidate) => candidate.id === profileId
      );

      if (!profile) {
        throw new Error(`Agent engine profile '${profileId}' was not found.`);
      }

      printJson(
        options.summary
          ? projectAgentEngineProfileSummary({
              catalog: inspection.catalog,
              profile
            })
          : {
              defaultAgentEngineProfileRef:
                inspection.catalog.defaults.agentEngineProfileRef,
              profile
            }
      );
    }
  );

hostCatalogAgentEngineCommand
  .command("upsert")
  .argument("<profileId>", "Agent engine profile id to create or update.")
  .option(
    "--kind <kind>",
    "Engine kind: opencode_server, external_process, or external_http."
  )
  .option("--display-name <name>", "Human-readable engine profile name.")
  .option("--executable <command>", "Process executable for process-backed engines.")
  .option("--clear-executable", "Remove the executable from the profile.")
  .option("--base-url <url>", "HTTP base URL for attached or HTTP engines.")
  .option("--clear-base-url", "Remove the base URL from the profile.")
  .option("--default-agent <agent>", "Default engine agent name.")
  .option("--clear-default-agent", "Remove the default engine agent.")
  .option(
    "--permission-mode <mode>",
    "OpenCode permission mode: auto_reject, auto_approve, or entangle_approval."
  )
  .option("--clear-permission-mode", "Remove the explicit permission mode.")
  .option("--state-scope <scope>", "Engine state scope: node or shared.")
  .option("--version <version>", "Version/operator note for the engine profile.")
  .option("--clear-version", "Remove the version/operator note.")
  .option("--set-default", "Set this profile as the catalog default agent engine.")
  .option(
    "--dry-run",
    "Print the canonical Host upsert request without mutating the host."
  )
  .option("--summary", "Print only the mutated profile and default ref.")
  .description(
    "Create or update an agent engine profile through entangle-host."
  )
  .action(
    async (
      profileId: string,
      options: CatalogAgentEngineUpsertOptions & {
        dryRun?: boolean;
        summary?: boolean;
      },
      command: Command
    ) => {
      const client = createCliHostClient(command);
      const request = buildAgentEngineProfileUpsertRequest(options);

      if (options.dryRun) {
        printJson(
          buildCliMutationDryRun({
            mutation: "host.catalog.agent_engine.upsert",
            request,
            target: {
              profileId
            }
          })
        );
        return;
      }

      const response = await client.upsertAgentEngineProfile(profileId, request);
      const appliedProfile = response.catalog?.agentEngineProfiles.find(
        (profile) => profile.id === profileId
      );

      printJson(
        options.summary && response.catalog && appliedProfile
          ? projectAgentEngineProfileUpsertSummary({
              catalog: response.catalog,
              profile: appliedProfile
            })
          : response
      );
    }
  );

const hostPackageSourcesCommand = hostCommand
  .command("package-sources")
  .description("Inspect and mutate package sources through entangle-host.");

hostPackageSourcesCommand
  .command("list")
  .option("--summary", "Print compact operator-oriented package-source summaries.")
  .description("List admitted package sources.")
  .action(async (options: { summary?: boolean }, command: Command) => {
    const client = createCliHostClient(command);
    const response = await client.listPackageSources();

    if (!options.summary) {
      printJson(response);
      return;
    }

    const graph = (await client.getGraph()).graph;
    printJson({
      packageSources: sortPackageSourceInspections(
        response.packageSources
      ).map((inspection) => projectPackageSourceSummary(inspection, graph))
    });
  });

hostPackageSourcesCommand
  .command("get")
  .argument("<packageSourceId>", "Package source identifier.")
  .option("--summary", "Print a compact operator-oriented package-source summary.")
  .description("Inspect one admitted package source.")
  .action(async (
    packageSourceId: string,
    options: { summary?: boolean },
    command: Command
  ) => {
    const client = createCliHostClient(command);
    const response = await client.getPackageSource(packageSourceId);

    if (!options.summary) {
      printJson(response);
      return;
    }

    const graph = (await client.getGraph()).graph;
    printJson({
      packageSource: projectPackageSourceSummary(response, graph)
    });
  });

hostPackageSourcesCommand
  .command("admit")
  .argument(
    "<path>",
    "Absolute or relative path to an AgentPackage directory or archive."
  )
  .option(
    "--source-kind <sourceKind>",
    "Package source kind to admit. Supported values: local_path, local_archive.",
    "local_path"
  )
  .option(
    "--package-source-id <packageSourceId>",
    "Optional explicit package source identifier."
  )
  .option(
    "--dry-run",
    "Print the canonical package-admission request without mutating the host."
  )
  .description(
    "Admit a canonical filesystem package path or archive into entangle-host desired state."
  )
  .action(
    async (
      inputPath: string,
      options: {
        dryRun?: boolean;
        packageSourceId?: string;
        sourceKind: string;
      },
      command: Command
    ) => {
      const client = createCliHostClient(command);
      const request = buildPackageSourceAdmissionRequestFromCli({
        inputPath,
        ...(options.packageSourceId
          ? { packageSourceId: options.packageSourceId }
          : {}),
        sourceKind: options.sourceKind
      });

      if (options.dryRun) {
        printJson(
          buildCliMutationDryRun({
            mutation: "host.package_sources.admit",
            request
          })
        );
        return;
      }

      printJson(await client.admitPackageSource(request));
    }
  );

hostPackageSourcesCommand
  .command("delete")
  .argument("<packageSourceId>", "Package source identifier.")
  .option(
    "--dry-run",
    "Print the canonical package-source deletion intent without mutating the host."
  )
  .description("Delete an unused package source from entangle-host desired state.")
  .action(
    async (
      packageSourceId: string,
      options: {
        dryRun?: boolean;
      },
      command: Command
    ) => {
      const client = createCliHostClient(command);

      if (options.dryRun) {
        printJson(
          buildCliMutationDryRun({
            mutation: "host.package_sources.delete",
            request: {
              packageSourceId
            }
          })
        );
        return;
      }

      printJson(await client.deletePackageSource(packageSourceId));
    }
  );

const hostExternalPrincipalsCommand = hostCommand
  .command("external-principals")
  .description("Inspect and mutate external principal bindings through entangle-host.");

hostExternalPrincipalsCommand
  .command("list")
  .option("--summary", "Print compact operator-oriented external-principal summaries.")
  .description("List bound external principals.")
  .action(async (options: { summary?: boolean }, command: Command) => {
    const client = createCliHostClient(command);
    const response = await client.listExternalPrincipals();

    if (!options.summary) {
      printJson(response);
      return;
    }

    const graph = (await client.getGraph()).graph;
    printJson({
      principals: sortExternalPrincipalInspections(response.principals).map(
        (inspection) => projectExternalPrincipalSummary(inspection, graph)
      )
    });
  });

hostExternalPrincipalsCommand
  .command("get")
  .argument("<principalId>", "External principal identifier.")
  .option("--summary", "Print a compact operator-oriented external-principal summary.")
  .description("Inspect one external principal.")
  .action(async (
    principalId: string,
    options: { summary?: boolean },
    command: Command
  ) => {
    const client = createCliHostClient(command);
    const response = await client.getExternalPrincipal(principalId);

    if (!options.summary) {
      printJson(response);
      return;
    }

    const graph = (await client.getGraph()).graph;
    printJson({
      principal: projectExternalPrincipalSummary(response, graph)
    });
  });

hostExternalPrincipalsCommand
  .command("apply")
  .argument("<file>", "Path to an external principal JSON file.")
  .option(
    "--dry-run",
    "Print the canonical external-principal mutation without mutating the host."
  )
  .description("Create or update one external principal through entangle-host.")
  .action(async (file: string, options: { dryRun?: boolean }, command: Command) => {
    const client = createCliHostClient(command);
    const request = externalPrincipalMutationRequestSchema.parse(
      await readJsonDocument(resolveCliPath(file))
    );

    if (options.dryRun) {
      printJson(
        buildCliMutationDryRun({
          mutation: "host.external_principals.upsert",
          request
        })
      );
      return;
    }

    printJson(await client.upsertExternalPrincipal(request));
  });

hostExternalPrincipalsCommand
  .command("delete")
  .argument("<principalId>", "External principal identifier.")
  .option(
    "--dry-run",
    "Print the canonical external-principal deletion intent without mutating the host."
  )
  .description("Delete an unused external principal from entangle-host desired state.")
  .action(
    async (
      principalId: string,
      options: {
        dryRun?: boolean;
      },
      command: Command
    ) => {
      const client = createCliHostClient(command);

      if (options.dryRun) {
        printJson(
          buildCliMutationDryRun({
            mutation: "host.external_principals.delete",
            request: {
              principalId
            }
          })
        );
        return;
      }

      printJson(await client.deleteExternalPrincipal(principalId));
    }
  );

const hostGraphCommand = hostCommand
  .command("graph")
  .description("Inspect and mutate the active graph through entangle-host.");

hostGraphCommand
  .command("get")
  .option("--summary", "Print a compact operator-oriented graph summary.")
  .description("Print the active graph and revision metadata.")
  .action(async (options: { summary?: boolean }, command: Command) => {
    const client = createCliHostClient(command);
    const response = await client.getGraph();
    printJson(
      options.summary ? { graph: projectGraphSummary(response) } : response
    );
  });

hostGraphCommand
  .command("export")
  .argument("<file>", "Destination graph JSON file.")
  .description("Write the active host graph to a graph JSON file.")
  .action(async (file: string, _options, command: Command) => {
    const client = createCliHostClient(command);
    const response = await client.getGraph();

    if (!response.graph) {
      throw new Error("No active graph is available to export.");
    }

    const outputPath = resolveCliPath(file);
    await writeJsonDocument(outputPath, response.graph);
    printJson(projectGraphExportSummary({ outputPath, response }));
  });

hostGraphCommand
  .command("import")
  .argument("<file>", "Path to a graph JSON file.")
  .option(
    "--dry-run",
    "Validate the import candidate without applying it to the host."
  )
  .description("Validate and apply a graph JSON file through entangle-host.")
  .action(async (
    file: string,
    options: { dryRun?: boolean },
    command: Command
  ) => {
    const client = createCliHostClient(command);
    const request = await readJsonDocument(resolveCliPath(file));
    const validation = await client.validateGraph(request);

    if (options.dryRun || !validation.validation.ok) {
      printJson(
        projectGraphImportSummary({
          applied: false,
          dryRun: Boolean(options.dryRun),
          response: validation
        })
      );

      if (!validation.validation.ok) {
        process.exitCode = 1;
      }

      return;
    }

    const applied = await client.applyGraph(request);
    printJson(
      projectGraphImportSummary({
        applied: true,
        dryRun: false,
        response: applied
      })
    );
  });

const hostGraphRevisionsCommand = hostGraphCommand
  .command("revisions")
  .description("Inspect persisted graph revisions through entangle-host.");

hostGraphRevisionsCommand
  .command("list")
  .option("--summary", "Print compact operator-oriented graph revision summaries.")
  .description("List persisted graph revisions.")
  .action(async (options: { summary?: boolean }, command: Command) => {
    const client = createCliHostClient(command);
    const response = await client.listGraphRevisions();
    printJson(
      options.summary
        ? {
            revisions: sortGraphRevisions(response.revisions).map(
              projectGraphRevisionSummary
            )
          }
        : response
    );
  });

hostGraphRevisionsCommand
  .command("get")
  .argument("<revisionId>", "Graph revision identifier.")
  .option("--summary", "Print a compact operator-oriented graph revision summary.")
  .description("Inspect one persisted graph revision.")
  .action(async (
    revisionId: string,
    options: { summary?: boolean },
    command: Command
  ) => {
    const client = createCliHostClient(command);
    const response = await client.getGraphRevision(revisionId);
    printJson(
      options.summary
        ? { revision: projectGraphRevisionInspectionSummary(response) }
        : response
    );
  });

hostGraphCommand
  .command("validate")
  .argument("<file>", "Path to a graph JSON file.")
  .description("Validate a graph candidate against the host catalog and admitted package sources.")
  .action(async (file: string, _options, command: Command) => {
    const client = createCliHostClient(command);
    printJson(await client.validateGraph(await readJsonDocument(resolveCliPath(file))));
  });

hostGraphCommand
  .command("apply")
  .argument("<file>", "Path to a graph JSON file.")
  .option(
    "--dry-run",
    "Print the canonical graph-apply payload without mutating the host."
  )
  .description("Apply a graph candidate through entangle-host.")
  .action(async (file: string, options: { dryRun?: boolean }, command: Command) => {
    const client = createCliHostClient(command);
    const request = await readJsonDocument(resolveCliPath(file));

    if (options.dryRun) {
      printJson(
        buildCliMutationDryRun({
          mutation: "host.graph.apply",
          request
        })
      );
      return;
    }

    printJson(await client.applyGraph(request));
  });

const hostNodesCommand = hostCommand
  .command("nodes")
  .description("Inspect and mutate applied managed node bindings through entangle-host.");

hostNodesCommand
  .command("list")
  .option("--summary", "Print compact operator-oriented node summaries.")
  .description("List applied non-user node bindings for the active graph.")
  .action(async (options: { summary?: boolean }, command: Command) => {
    const client = createCliHostClient(command);
    const response = await client.listNodes();
    printJson(
      options.summary
        ? {
            nodes: sortNodeInspectionsForPresentation(response.nodes).map(
              projectNodeInspectionSummary
            )
          }
        : response
    );
  });

hostNodesCommand
  .command("get")
  .argument("<nodeId>", "Node identifier in the active graph.")
  .option("--summary", "Print a compact operator-oriented node summary.")
  .description("Inspect one applied non-user node binding.")
  .action(async (
    nodeId: string,
    options: { summary?: boolean },
    command: Command
  ) => {
    const client = createCliHostClient(command);
    const response = await client.getNode(nodeId);
    printJson(
      options.summary
        ? { node: projectNodeInspectionSummary(response) }
        : response
    );
  });

hostNodesCommand
  .command("assign")
  .argument("<nodeId>", "Node identifier in the active graph.")
  .requiredOption("--runner <runnerId>", "Trusted runner id to receive the node.")
  .option("--assignment-id <assignmentId>", "Explicit assignment id.")
  .option("--lease-duration-seconds <seconds>", "Lease duration in seconds.", "600")
  .option("--policy-revision-id <policyRevisionId>", "Optional policy revision id.")
  .option("--summary", "Print a compact assignment summary.")
  .description("Offer a federated runtime assignment for one node.")
  .action(async (
    nodeId: string,
    options: {
      assignmentId?: string;
      leaseDurationSeconds: string;
      policyRevisionId?: string;
      runner: string;
      summary?: boolean;
    },
    command: Command
  ) => {
    const request = runtimeAssignmentOfferRequestSchema.parse({
      ...(options.assignmentId ? { assignmentId: options.assignmentId } : {}),
      leaseDurationSeconds: Number.parseInt(options.leaseDurationSeconds, 10),
      nodeId,
      ...(options.policyRevisionId
        ? { policyRevisionId: options.policyRevisionId }
        : {}),
      runnerId: options.runner
    });
    const client = createCliHostClient(command);
    const response = await client.offerAssignment(request);

    printJson(
      options.summary
        ? { assignment: projectRuntimeAssignmentSummary(response.assignment) }
        : response
    );
  });

hostNodesCommand
  .command("add")
  .argument("<file>", "Path to a managed node JSON file.")
  .option(
    "--dry-run",
    "Print the canonical node-create request without mutating the host."
  )
  .description("Create one managed non-user node in the active graph.")
  .action(async (file: string, options: { dryRun?: boolean }, command: Command) => {
    const client = createCliHostClient(command);
    const request = nodeCreateRequestSchema.parse(
      await readJsonDocument(resolveCliPath(file))
    );

    if (options.dryRun) {
      printJson(
        buildCliMutationDryRun({
          mutation: "host.nodes.create",
          request
        })
      );
      return;
    }

    printJson(await client.createNode(request));
  });

hostNodesCommand
  .command("replace")
  .argument("<nodeId>", "Node identifier in the active graph.")
  .argument("<file>", "Path to a managed-node replacement JSON file.")
  .option(
    "--dry-run",
    "Print the canonical node-replacement request without mutating the host."
  )
  .description(
    "Replace one managed non-user node binding in the active graph without renaming the node id."
  )
  .action(
    async (
      nodeId: string,
      file: string,
      options: { dryRun?: boolean },
      command: Command
    ) => {
      const client = createCliHostClient(command);
      const request = nodeReplacementRequestSchema.parse(
        await readJsonDocument(resolveCliPath(file))
      );

      if (options.dryRun) {
        printJson(
          buildCliMutationDryRun({
            mutation: "host.nodes.replace",
            request,
            target: {
              nodeId
            }
          })
        );
        return;
      }

      printJson(await client.replaceNode(nodeId, request));
    }
  );

hostNodesCommand
  .command("agent-runtime")
  .argument("<nodeId>", "Node identifier in the active graph.")
  .option(
    "--mode <mode>",
    "Set the node agent runtime mode: coding_agent or disabled."
  )
  .option(
    "--inherit-mode",
    "Clear the node-level mode override so graph defaults apply."
  )
  .option(
    "--engine-profile-ref <profileRef>",
    "Set the node-level agent engine profile reference."
  )
  .option(
    "--clear-engine-profile-ref",
    "Clear the node-level agent engine profile override."
  )
  .option("--default-agent <agent>", "Set the node-level default engine agent.")
  .option("--clear-default-agent", "Clear the node-level default engine agent.")
  .option(
    "--dry-run",
    "Print the canonical node-replacement request without mutating the host."
  )
  .option("--summary", "Print a compact operator-oriented node summary.")
  .description("Configure the agent-runtime binding for one managed node.")
  .action(
    async (
      nodeId: string,
      options: NodeAgentRuntimeConfigurationOptions,
      command: Command
    ) => {
      const client = createCliHostClient(command);
      const inspection = await client.getNode(nodeId);
      const request = buildNodeAgentRuntimeReplacementRequest(
        inspection,
        options
      );

      if (options.dryRun) {
        printJson(
          buildCliMutationDryRun({
            mutation: "host.nodes.agent_runtime.configure",
            request,
            target: {
              nodeId
            }
          })
        );
        return;
      }

      const response = await client.replaceNode(nodeId, request);
      printJson(
        options.summary && response.node
          ? { node: projectNodeInspectionSummary(response.node) }
          : response
      );
    }
  );

hostNodesCommand
  .command("delete")
  .argument("<nodeId>", "Node identifier in the active graph.")
  .option(
    "--dry-run",
    "Print the canonical node-delete intent without mutating the host."
  )
  .description(
    "Delete one managed non-user node from the active graph. This fails if graph edges still reference the node."
  )
  .action(async (nodeId: string, options: { dryRun?: boolean }, command: Command) => {
    const client = createCliHostClient(command);

    if (options.dryRun) {
      printJson(
        buildCliMutationDryRun({
          mutation: "host.nodes.delete",
          target: {
            nodeId
          }
        })
      );
      return;
    }

    printJson(await client.deleteNode(nodeId));
  });

const hostEdgesCommand = hostCommand
  .command("edges")
  .description("Inspect and mutate applied graph edges through entangle-host.");

hostEdgesCommand
  .command("list")
  .option("--summary", "Print compact operator-oriented edge summaries.")
  .description("List applied edges for the active graph.")
  .action(async (options: { summary?: boolean }, command: Command) => {
    const client = createCliHostClient(command);
    const response = await client.listEdges();
    printJson(
      options.summary
        ? { edges: projectSortedGraphEdgeSummaries(response.edges) }
        : response
    );
  });

hostEdgesCommand
  .command("add")
  .argument("<file>", "Path to an edge JSON file.")
  .option(
    "--dry-run",
    "Print the canonical edge-create request without mutating the host."
  )
  .description("Create one edge in the active graph.")
  .action(async (file: string, options: { dryRun?: boolean }, command: Command) => {
    const client = createCliHostClient(command);
    const request = edgeCreateRequestSchema.parse(
      await readJsonDocument(resolveCliPath(file))
    );

    if (options.dryRun) {
      printJson(
        buildCliMutationDryRun({
          mutation: "host.edges.create",
          request
        })
      );
      return;
    }

    printJson(await client.createEdge(request));
  });

hostEdgesCommand
  .command("replace")
  .argument("<edgeId>", "Edge identifier in the active graph.")
  .argument("<file>", "Path to an edge replacement JSON file.")
  .option(
    "--dry-run",
    "Print the canonical edge-replacement request without mutating the host."
  )
  .description("Replace one edge in the active graph without renaming the edge id.")
  .action(
    async (
      edgeId: string,
      file: string,
      options: { dryRun?: boolean },
      command: Command
    ) => {
    const client = createCliHostClient(command);
      const request = edgeReplacementRequestSchema.parse(
        await readJsonDocument(resolveCliPath(file))
      );

      if (options.dryRun) {
        printJson(
          buildCliMutationDryRun({
            mutation: "host.edges.replace",
            request,
            target: {
              edgeId
            }
          })
        );
        return;
      }

      printJson(await client.replaceEdge(edgeId, request));
  });

hostEdgesCommand
  .command("delete")
  .argument("<edgeId>", "Edge identifier in the active graph.")
  .option(
    "--dry-run",
    "Print the canonical edge-delete intent without mutating the host."
  )
  .description("Delete one edge from the active graph.")
  .action(async (edgeId: string, options: { dryRun?: boolean }, command: Command) => {
    const client = createCliHostClient(command);

    if (options.dryRun) {
      printJson(
        buildCliMutationDryRun({
          mutation: "host.edges.delete",
          target: {
            edgeId
          }
        })
      );
      return;
    }

    printJson(await client.deleteEdge(edgeId));
  });

const hostRuntimesCommand = hostCommand
  .command("runtimes")
  .description("Inspect and mutate desired runtime state through entangle-host.");

hostRuntimesCommand
  .command("list")
  .option("--summary", "Print compact operator-oriented runtime summaries.")
  .description("List runtime inspections for the active graph.")
  .action(async (options: { summary?: boolean }, command: Command) => {
    const client = createCliHostClient(command);
    const response = await client.listRuntimes();
    printJson(
      options.summary
        ? {
            runtimes: sortRuntimeInspectionsForPresentation(
              response.runtimes
            ).map(projectRuntimeInspectionSummary)
          }
        : response
    );
  });

hostRuntimesCommand
  .command("get")
  .argument("<nodeId>", "Node identifier in the active graph.")
  .option("--summary", "Print a compact operator-oriented runtime summary.")
  .description("Inspect one runtime in the active graph.")
  .action(async (
    nodeId: string,
    options: { summary?: boolean },
    command: Command
  ) => {
    const client = createCliHostClient(command);
    const response = await client.getRuntime(nodeId);
    printJson(
      options.summary
        ? { runtime: projectRuntimeInspectionSummary(response) }
        : response
    );
  });

hostRuntimesCommand
  .command("context")
  .argument("<nodeId>", "Node identifier in the active graph.")
  .description("Print the debug effective runtime context for one runtime.")
  .action(async (nodeId: string, _options, command: Command) => {
    const client = createCliHostClient(command);
    printJson(await client.getRuntimeContext(nodeId));
  });

hostRuntimesCommand
  .command("bootstrap-bundle")
  .argument("<nodeId>", "Node identifier in the active graph.")
  .description("Print the portable runtime bootstrap bundle for one runtime.")
  .action(async (nodeId: string, _options, command: Command) => {
    const client = createCliHostClient(command);
    printJson(await client.getRuntimeBootstrapBundle(nodeId));
  });

hostRuntimesCommand
  .command("turn")
  .argument("<nodeId>", "Node identifier in the active graph.")
  .argument("<turnId>", "Runner turn identifier to inspect.")
  .option("--summary", "Print a compact operator-oriented turn summary.")
  .description("Inspect one persisted runner turn.")
  .action(async (
    nodeId: string,
    turnId: string,
    options: { summary?: boolean },
    command: Command
  ) => {
    const client = createCliHostClient(command);
    const response = await client.getRuntimeTurn(nodeId, turnId);
    printJson(
      options.summary
        ? { turn: projectRuntimeTurnSummary(response.turn) }
        : response
    );
  });

hostRuntimesCommand
  .command("turns")
  .argument("<nodeId>", "Node identifier in the active graph.")
  .option("--summary", "Print compact operator-oriented turn summaries.")
  .description("Inspect persisted runner turns for one runtime.")
  .action(async (
    nodeId: string,
    options: { summary?: boolean },
    command: Command
  ) => {
    const client = createCliHostClient(command);
    const response = await client.listRuntimeTurns(nodeId);
    printJson(
      options.summary
        ? {
            turns: sortRuntimeTurnsForPresentation(response.turns).map(
              projectRuntimeTurnSummary
            )
          }
        : response
    );
  });

hostRuntimesCommand
  .command("artifact")
  .argument("<nodeId>", "Node identifier in the active graph.")
  .argument("<artifactId>", "Artifact identifier to inspect.")
  .option("--diff", "Include the bounded git diff when available.")
  .option("--from <commit>", "Base commit for --diff; defaults to the first parent.")
  .option("--history", "Include bounded git history when available.")
  .option("--limit <limit>", "Maximum history commits to return.", "20")
  .option("--preview", "Include the bounded text preview when available.")
  .option("--summary", "Print a compact operator-oriented artifact summary.")
  .description("Inspect one persisted runtime artifact.")
  .action(
    async (
      nodeId: string,
      artifactId: string,
      options: {
        diff?: boolean;
        from?: string;
        history?: boolean;
        limit: string;
        preview?: boolean;
        summary?: boolean;
      },
      command: Command
    ) => {
      const client = createCliHostClient(command);
      const selectedInspectionModes = [
        options.preview,
        options.history,
        options.diff
      ].filter(Boolean).length;

      if (selectedInspectionModes > 1) {
        throw new Error("Choose only one of --preview, --history, or --diff.");
      }

      if (options.from && !options.diff) {
        throw new Error("--from can only be used with --diff.");
      }

      if (!options.history && options.limit !== "20") {
        throw new Error("--limit can only be used with --history.");
      }

      if (options.preview) {
        const response = await client.getRuntimeArtifactPreview(nodeId, artifactId);
        printJson(
          options.summary
            ? projectRuntimeArtifactPreviewSummary(response)
            : response
        );
        return;
      }

      if (options.history) {
        const response = await client.getRuntimeArtifactHistory(nodeId, artifactId, {
          limit: parsePositiveIntegerOption(options.limit, "--limit")
        });
        printJson(
          options.summary
            ? projectRuntimeArtifactHistorySummary(response)
            : response
        );
        return;
      }

      if (options.diff) {
        const response = await client.getRuntimeArtifactDiff(nodeId, artifactId, {
          fromCommit: options.from
        });
        printJson(
          options.summary ? projectRuntimeArtifactDiffSummary(response) : response
        );
        return;
      }

      const response = await client.getRuntimeArtifact(nodeId, artifactId);
      printJson(
        options.summary
          ? { artifact: projectRuntimeArtifactSummary(response.artifact) }
          : response
      );
    }
  );

hostRuntimesCommand
  .command("artifact-restore")
  .argument("<nodeId>", "Node identifier in the active graph.")
  .argument("<artifactId>", "Artifact identifier to restore.")
  .option("--reason <reason>", "Operator-visible restore reason.")
  .option("--requested-by <operatorId>", "Operator id requesting restore.")
  .option("--restore-id <restoreId>", "Stable restore request id.")
  .option("--summary", "Print a compact operator-oriented restore summary.")
  .description(
    "Ask the assigned runner to restore one runtime artifact through federated control."
  )
  .action(
    async (
      nodeId: string,
      artifactId: string,
      options: {
        reason?: string;
        requestedBy?: string;
        restoreId?: string;
        summary?: boolean;
      },
      command: Command
    ) => {
      const client = createCliHostClient(command);
      const request = runtimeArtifactRestoreRequestSchema.parse({
        ...(options.reason ? { reason: options.reason } : {}),
        ...(options.requestedBy ? { requestedBy: options.requestedBy } : {}),
        ...(options.restoreId ? { restoreId: options.restoreId } : {})
      });
      const response = await client.restoreRuntimeArtifact(
        nodeId,
        artifactId,
        request
      );

      printJson(
        options.summary
          ? { restore: projectRuntimeArtifactRestoreSummary(response) }
          : response
      );
    }
  );

hostRuntimesCommand
  .command("artifact-source-proposal")
  .argument("<nodeId>", "Node identifier in the active graph.")
  .argument("<artifactId>", "Artifact identifier to propose as source work.")
  .option("--overwrite", "Allow the runner to overwrite existing target files.")
  .option("--proposal-id <proposalId>", "Stable source-change proposal id.")
  .option("--reason <reason>", "Operator-visible proposal reason.")
  .option("--requested-by <operatorId>", "Operator id requesting the proposal.")
  .option(
    "--target-path <targetPath>",
    "Relative source workspace path where artifact content should be copied."
  )
  .option("--summary", "Print a compact operator-oriented proposal summary.")
  .description(
    "Ask the assigned runner to propose one runtime artifact as a source change."
  )
  .action(
    async (
      nodeId: string,
      artifactId: string,
      options: {
        overwrite?: boolean;
        proposalId?: string;
        reason?: string;
        requestedBy?: string;
        summary?: boolean;
        targetPath?: string;
      },
      command: Command
    ) => {
      const client = createCliHostClient(command);
      const request = runtimeArtifactSourceChangeProposalRequestSchema.parse({
        ...(options.overwrite ? { overwrite: true } : {}),
        ...(options.proposalId ? { proposalId: options.proposalId } : {}),
        ...(options.reason ? { reason: options.reason } : {}),
        ...(options.requestedBy ? { requestedBy: options.requestedBy } : {}),
        ...(options.targetPath ? { targetPath: options.targetPath } : {})
      });
      const response = await client.proposeRuntimeArtifactSourceChange(
        nodeId,
        artifactId,
        request
      );

      printJson(
        options.summary
          ? {
              sourceChangeProposal:
                projectRuntimeArtifactSourceChangeProposalSummary(response)
            }
          : response
      );
    }
  );

hostRuntimesCommand
  .command("artifacts")
  .argument("<nodeId>", "Node identifier in the active graph.")
  .option("--backend <backend>", "Filter artifacts by backend.")
  .option("--kind <kind>", "Filter artifacts by artifact kind.")
  .option(
    "--lifecycle-state <lifecycleState>",
    "Filter artifacts by lifecycle state."
  )
  .option(
    "--publication-state <publicationState>",
    "Filter artifacts by publication state, including not_requested."
  )
  .option(
    "--retrieval-state <retrievalState>",
    "Filter artifacts by retrieval state, including not_retrieved."
  )
  .option("--session-id <sessionId>", "Filter artifacts by session id.")
  .option("--summary", "Print compact operator-oriented artifact summaries.")
  .description("Inspect persisted runtime artifacts for one runtime.")
  .action(
    async (
      nodeId: string,
      options: {
        backend?: "git" | "local_file" | "wiki";
        kind?:
          | "branch"
          | "commit"
          | "knowledge_summary"
          | "local_output"
          | "patch"
          | "report_file"
          | "wiki_page";
        lifecycleState?:
          | "declared"
          | "failed"
          | "materialized"
          | "published"
          | "rejected"
          | "superseded";
        publicationState?: "failed" | "not_requested" | "published";
        retrievalState?: "failed" | "not_retrieved" | "retrieved";
        sessionId?: string;
        summary?: boolean;
      },
      command: Command
    ) => {
      const client = createCliHostClient(command);
      const response = await client.listRuntimeArtifacts(nodeId);
      const artifacts = filterRuntimeArtifactsForCli(
        sortRuntimeArtifactsForCli(response.artifacts),
        options
      );

      printJson({
        artifacts: options.summary
          ? artifacts.map(projectRuntimeArtifactSummary)
          : artifacts
      });
    }
  );

hostRuntimesCommand
  .command("memory")
  .argument("<nodeId>", "Node identifier in the active graph.")
  .option("--summary", "Print a compact operator-oriented memory summary.")
  .description("Inspect persisted runner memory pages for one runtime.")
  .action(async (
    nodeId: string,
    options: { summary?: boolean },
    command: Command
  ) => {
    const client = createCliHostClient(command);
    const response = await client.getRuntimeMemory(nodeId);
    printJson(
      options.summary
        ? { memory: projectRuntimeMemorySummary(response) }
        : response
    );
  });

hostRuntimesCommand
  .command("memory-page")
  .argument("<nodeId>", "Node identifier in the active graph.")
  .argument("<path>", "Runtime memory page path relative to the memory root.")
  .option("--summary", "Print a compact operator-oriented memory page summary.")
  .description("Inspect one persisted runner memory page with a bounded preview.")
  .action(async (
    nodeId: string,
    pagePath: string,
    options: { summary?: boolean },
    command: Command
  ) => {
    const client = createCliHostClient(command);
    const response = await client.getRuntimeMemoryPage(nodeId, pagePath);
    printJson(
      options.summary
        ? projectRuntimeMemoryPagePreviewSummary(response)
        : response
    );
  });

hostRuntimesCommand
  .command("approval")
  .argument("<nodeId>", "Node identifier in the active graph.")
  .argument("<approvalId>", "Approval identifier to inspect.")
  .option("--summary", "Print a compact operator-oriented approval summary.")
  .description("Inspect one persisted runtime approval record.")
  .action(
    async (
      nodeId: string,
      approvalId: string,
      options: { summary?: boolean },
      command: Command
    ) => {
      const client = createCliHostClient(command);
      const response = await client.getRuntimeApproval(nodeId, approvalId);
      printJson(
        options.summary
          ? { approval: projectRuntimeApprovalSummary(response.approval) }
          : response
      );
    }
  );

hostRuntimesCommand
  .command("approvals")
  .argument("<nodeId>", "Node identifier in the active graph.")
  .option(
    "--status <status>",
    "Filter approvals by lifecycle status."
  )
  .option("--session-id <sessionId>", "Filter approvals by session id.")
  .option(
    "--conversation-id <conversationId>",
    "Filter approvals by conversation id."
  )
  .option(
    "--requested-by <requestedByNodeId>",
    "Filter approvals by requesting node id."
  )
  .option("--approver <approverNodeId>", "Filter approvals by approver node id.")
  .option("--summary", "Print compact operator-oriented approval summaries.")
  .description("Inspect persisted runtime approval records for one runtime.")
  .action(
    async (
      nodeId: string,
      options: {
        approver?: string;
        conversationId?: string;
        requestedBy?: string;
        sessionId?: string;
        status?:
          | "approved"
          | "expired"
          | "not_required"
          | "pending"
          | "rejected"
          | "withdrawn";
        summary?: boolean;
      },
      command: Command
    ) => {
      const client = createCliHostClient(command);
      const response = await client.listRuntimeApprovals(nodeId);
      const approvals = filterRuntimeApprovalsForCli(
        sortRuntimeApprovalsForCli(response.approvals),
        {
          ...(options.approver ? { approverNodeId: options.approver } : {}),
          ...(options.conversationId
            ? { conversationId: options.conversationId }
            : {}),
          ...(options.requestedBy
            ? { requestedByNodeId: options.requestedBy }
            : {}),
          ...(options.sessionId ? { sessionId: options.sessionId } : {}),
          ...(options.status ? { status: options.status } : {})
        }
      );

      printJson({
        approvals: options.summary
          ? approvals.map(projectRuntimeApprovalSummary)
          : approvals
      });
    }
  );

hostRuntimesCommand
  .command("source-candidate")
  .argument("<nodeId>", "Node identifier in the active graph.")
  .argument("<candidateId>", "Source change candidate identifier to inspect.")
  .option("--diff", "Include the bounded source diff when available.")
  .option("--file <path>", "Include a bounded preview for one changed source file.")
  .option("--summary", "Print a compact operator-oriented candidate summary.")
  .description("Inspect one persisted source change candidate.")
  .action(
    async (
      nodeId: string,
      candidateId: string,
      options: {
        diff?: boolean;
        file?: string;
        summary?: boolean;
      },
      command: Command
    ) => {
      const client = createCliHostClient(command);
      const selectedInspectionModes = [
        options.diff,
        Boolean(options.file)
      ].filter(Boolean).length;

      if (selectedInspectionModes > 1) {
        throw new Error("Use only one of --diff or --file.");
      }

      if (options.diff) {
        const response = await client.getRuntimeSourceChangeCandidateDiff(
          nodeId,
          candidateId
        );
        printJson(
          options.summary
            ? {
                candidate: projectRuntimeSourceChangeCandidateSummary(
                  response.candidate
                ),
                diff: projectRuntimeSourceChangeCandidateDiffSummary(response)
              }
            : response
        );
        return;
      }

      if (options.file) {
        const response = await client.getRuntimeSourceChangeCandidateFilePreview(
          nodeId,
          candidateId,
          options.file
        );
        printJson(
          options.summary
            ? {
                candidate: projectRuntimeSourceChangeCandidateSummary(
                  response.candidate
                ),
                filePreview:
                  projectRuntimeSourceChangeCandidateFilePreviewSummary(response)
              }
            : response
        );
        return;
      }

      const response = await client.getRuntimeSourceChangeCandidate(
        nodeId,
        candidateId
      );
      printJson(
        options.summary
          ? {
              candidate: projectRuntimeSourceChangeCandidateSummary(
                response.candidate
              )
            }
          : response
      );
    }
  );

hostRuntimesCommand
  .command("source-candidates")
  .argument("<nodeId>", "Node identifier in the active graph.")
  .option("--status <status>", "Filter candidates by review status.")
  .option("--session-id <sessionId>", "Filter candidates by session id.")
  .option("--turn-id <turnId>", "Filter candidates by turn id.")
  .option("--summary", "Print compact operator-oriented candidate summaries.")
  .description("Inspect persisted source change candidates for one runtime.")
  .action(
    async (
      nodeId: string,
      options: {
        sessionId?: string;
        status?: "accepted" | "pending_review" | "rejected" | "superseded";
        summary?: boolean;
        turnId?: string;
      },
      command: Command
    ) => {
      const client = createCliHostClient(command);
      const response = await client.listRuntimeSourceChangeCandidates(nodeId);
      const candidates = filterRuntimeSourceChangeCandidatesForCli(
        sortRuntimeSourceChangeCandidatesForCli(response.candidates),
        {
          ...(options.sessionId ? { sessionId: options.sessionId } : {}),
          ...(options.status ? { status: options.status } : {}),
          ...(options.turnId ? { turnId: options.turnId } : {})
        }
      );

      printJson({
        candidates: options.summary
          ? candidates.map(projectRuntimeSourceChangeCandidateSummary)
          : candidates
      });
    }
  );

hostRuntimesCommand
  .command("source-history")
  .argument("<nodeId>", "Node identifier in the active graph.")
  .option("--summary", "Print compact operator-oriented source history summaries.")
  .description("Inspect persisted source history for one runtime.")
  .action(
    async (
      nodeId: string,
      options: {
        summary?: boolean;
      },
      command: Command
    ) => {
      const client = createCliHostClient(command);
      const response = await client.listRuntimeSourceHistory(nodeId);
      const history = sortRuntimeSourceHistoryForPresentation(response.history);

      printJson({
        history: options.summary
          ? history.map(projectRuntimeSourceHistorySummary)
          : history
      });
    }
  );

hostRuntimesCommand
  .command("source-history-entry")
  .argument("<nodeId>", "Node identifier in the active graph.")
  .argument("<sourceHistoryId>", "Source history entry identifier to inspect.")
  .option("--summary", "Print a compact operator-oriented source history summary.")
  .description("Inspect one persisted source history entry.")
  .action(
    async (
      nodeId: string,
      sourceHistoryId: string,
      options: {
        summary?: boolean;
      },
      command: Command
    ) => {
      const client = createCliHostClient(command);
      const response = await client.getRuntimeSourceHistory(
        nodeId,
        sourceHistoryId
      );

      printJson(
        options.summary
          ? {
              sourceHistory: projectRuntimeSourceHistorySummary(response.entry)
            }
          : response
      );
    }
  );

hostRuntimesCommand
  .command("source-history-publish")
  .argument("<nodeId>", "Node identifier in the active graph.")
  .argument("<sourceHistoryId>", "Source history entry identifier to publish.")
  .option("--approval-id <approvalId>", "Approved source_publication approval id.")
  .option("--reason <reason>", "Operator-visible publication reason.")
  .option("--requested-by <operatorId>", "Operator id requesting publication.")
  .option(
    "--retry-failed-publication",
    "Retry source-history entries whose previous publication state is failed."
  )
  .option("--target-git-service <serviceRef>", "Git service ref for the publication target.")
  .option("--target-namespace <namespace>", "Git namespace for the publication target.")
  .option("--target-repository <repositoryName>", "Git repository for the publication target.")
  .description(
    "Ask the assigned runner to publish one source history entry through federated control."
  )
  .action(
    async (
      nodeId: string,
      sourceHistoryId: string,
      options: {
        approvalId?: string;
        reason?: string;
        requestedBy?: string;
        retryFailedPublication?: boolean;
        targetGitService?: string;
        targetNamespace?: string;
        targetRepository?: string;
      },
      command: Command
    ) => {
      const client = createCliHostClient(command);
      const target =
        options.targetGitService ||
        options.targetNamespace ||
        options.targetRepository
          ? {
              ...(options.targetGitService
                ? { gitServiceRef: options.targetGitService }
                : {}),
              ...(options.targetNamespace
                ? { namespace: options.targetNamespace }
                : {}),
              ...(options.targetRepository
                ? { repositoryName: options.targetRepository }
                : {})
            }
          : undefined;
      const request = runtimeSourceHistoryPublishRequestSchema.parse({
        ...(options.approvalId ? { approvalId: options.approvalId } : {}),
        ...(options.reason ? { reason: options.reason } : {}),
        ...(options.requestedBy ? { requestedBy: options.requestedBy } : {}),
        retryFailedPublication: options.retryFailedPublication ?? false,
        ...(target ? { target } : {})
      });
      printJson(
        await client.publishRuntimeSourceHistory(
          nodeId,
          sourceHistoryId,
          request
        )
      );
    }
  );

hostRuntimesCommand
  .command("source-history-replay")
  .argument("<nodeId>", "Node identifier in the active graph.")
  .argument("<sourceHistoryId>", "Source history entry identifier to replay.")
  .option("--approval-id <approvalId>", "Approved source_application approval id.")
  .option("--reason <reason>", "Operator-visible replay reason.")
  .option("--replayed-by <operatorId>", "Operator id requesting replay.")
  .option("--replay-id <replayId>", "Stable replay request id.")
  .description(
    "Ask the assigned runner to replay one source history entry through federated control."
  )
  .action(
    async (
      nodeId: string,
      sourceHistoryId: string,
      options: {
        approvalId?: string;
        reason?: string;
        replayedBy?: string;
        replayId?: string;
      },
      command: Command
    ) => {
      const client = createCliHostClient(command);
      const request = runtimeSourceHistoryReplayRequestSchema.parse({
        ...(options.approvalId ? { approvalId: options.approvalId } : {}),
        ...(options.reason ? { reason: options.reason } : {}),
        ...(options.replayedBy ? { replayedBy: options.replayedBy } : {}),
        ...(options.replayId ? { replayId: options.replayId } : {})
      });
      printJson(
        await client.replayRuntimeSourceHistory(
          nodeId,
          sourceHistoryId,
          request
        )
      );
    }
  );

hostRuntimesCommand
  .command("source-history-reconcile")
  .argument("<nodeId>", "Node identifier in the active graph.")
  .argument(
    "<sourceHistoryId>",
    "Source history entry identifier to reconcile with the current workspace."
  )
  .option("--approval-id <approvalId>", "Approved source_application approval id.")
  .option("--reason <reason>", "Operator-visible reconcile reason.")
  .option("--replayed-by <operatorId>", "Operator id requesting reconcile.")
  .option("--replay-id <replayId>", "Stable replay/reconcile request id.")
  .description(
    "Ask the assigned runner to merge one source history entry into the current workspace through federated control."
  )
  .action(
    async (
      nodeId: string,
      sourceHistoryId: string,
      options: {
        approvalId?: string;
        reason?: string;
        replayedBy?: string;
        replayId?: string;
      },
      command: Command
    ) => {
      const client = createCliHostClient(command);
      const request = runtimeSourceHistoryReconcileRequestSchema.parse({
        ...(options.approvalId ? { approvalId: options.approvalId } : {}),
        ...(options.reason ? { reason: options.reason } : {}),
        ...(options.replayedBy ? { replayedBy: options.replayedBy } : {}),
        ...(options.replayId ? { replayId: options.replayId } : {})
      });
      printJson(
        await client.reconcileRuntimeSourceHistory(
          nodeId,
          sourceHistoryId,
          request
        )
      );
    }
  );

hostRuntimesCommand
  .command("wiki-upsert-page")
  .argument("<nodeId>", "Node identifier in the active graph.")
  .argument("<path>", "POSIX markdown page path inside the runtime wiki.")
  .option("--content <markdownOrPatch>", "Markdown content or unified diff patch.")
  .option(
    "--content-file <path>",
    "Read markdown content or unified diff patch from a local file."
  )
  .option(
    "--expected-current-sha256 <digest>",
    "Only apply when the current page content has this SHA-256 digest."
  )
  .option("--append", "Append content to the page instead of replacing it.")
  .option("--patch", "Treat content as a unified diff patch for the page.")
  .option("--reason <reason>", "Operator-visible mutation reason.")
  .option("--requested-by <operatorId>", "Operator id requesting the mutation.")
  .description(
    "Ask the assigned runner to upsert a wiki page through federated control."
  )
  .action(
    async (
      nodeId: string,
      pagePath: string,
      options: {
        append?: boolean;
        content?: string;
        contentFile?: string;
        expectedCurrentSha256?: string;
        patch?: boolean;
        reason?: string;
        requestedBy?: string;
      },
      command: Command
    ) => {
      if (options.content !== undefined && options.contentFile) {
        throw new Error("Use either --content or --content-file, not both.");
      }

      const content =
        options.content ??
        (options.contentFile
          ? await readFile(path.resolve(options.contentFile), "utf8")
          : undefined);

      if (content === undefined) {
        throw new Error("Wiki page mutation requires --content or --content-file.");
      }

      if (options.append && options.patch) {
        throw new Error("Use only one of --append or --patch.");
      }

      const client = createCliHostClient(command);
      const request = runtimeWikiUpsertPageRequestSchema.parse({
        content,
        ...(options.expectedCurrentSha256
          ? { expectedCurrentSha256: options.expectedCurrentSha256 }
          : {}),
        mode: options.patch ? "patch" : options.append ? "append" : "replace",
        path: pagePath,
        ...(options.reason ? { reason: options.reason } : {}),
        ...(options.requestedBy ? { requestedBy: options.requestedBy } : {})
      });
      printJson(await client.upsertRuntimeWikiPage(nodeId, request));
    }
  );

hostRuntimesCommand
  .command("wiki-publish")
  .argument("<nodeId>", "Node identifier in the active graph.")
  .option("--reason <reason>", "Operator-visible publication reason.")
  .option("--requested-by <operatorId>", "Operator id requesting publication.")
  .option(
    "--retry-failed-publication",
    "Retry wiki publication when the previous artifact publication failed."
  )
  .option("--target-git-service <serviceRef>", "Git service ref for the publication target.")
  .option("--target-namespace <namespace>", "Git namespace for the publication target.")
  .option("--target-repository <repositoryName>", "Git repository for the publication target.")
  .description(
    "Ask the assigned runner to publish its wiki repository through federated control."
  )
  .action(
    async (
      nodeId: string,
      options: {
        reason?: string;
        requestedBy?: string;
        retryFailedPublication?: boolean;
        targetGitService?: string;
        targetNamespace?: string;
        targetRepository?: string;
      },
      command: Command
    ) => {
      const client = createCliHostClient(command);
      const target =
        options.targetGitService ||
        options.targetNamespace ||
        options.targetRepository
          ? {
              ...(options.targetGitService
                ? { gitServiceRef: options.targetGitService }
                : {}),
              ...(options.targetNamespace
                ? { namespace: options.targetNamespace }
                : {}),
              ...(options.targetRepository
                ? { repositoryName: options.targetRepository }
                : {})
            }
          : undefined;
      const request = runtimeWikiPublishRequestSchema.parse({
        ...(options.reason ? { reason: options.reason } : {}),
        ...(options.requestedBy ? { requestedBy: options.requestedBy } : {}),
        retryFailedPublication: options.retryFailedPublication ?? false,
        ...(target ? { target } : {})
      });
      printJson(await client.publishRuntimeWikiRepository(nodeId, request));
    }
  );

hostRuntimesCommand
  .command("source-history-replays")
  .argument("<nodeId>", "Node identifier in the active graph.")
  .option(
    "--source-history-id <sourceHistoryId>",
    "Filter replay records to one source history entry."
  )
  .description("List projected source history replay outcomes for a runtime.")
  .action(
    async (
      nodeId: string,
      options: { sourceHistoryId?: string },
      command: Command
    ) => {
      const client = createCliHostClient(command);
      printJson(
        await client.listRuntimeSourceHistoryReplays(nodeId, {
          ...(options.sourceHistoryId
            ? { sourceHistoryId: options.sourceHistoryId }
            : {})
        })
      );
    }
  );

hostRuntimesCommand
  .command("source-history-replay-get")
  .argument("<nodeId>", "Node identifier in the active graph.")
  .argument("<replayId>", "Source history replay identifier.")
  .description("Inspect one projected source history replay outcome.")
  .action(async (nodeId: string, replayId: string, command: Command) => {
    const client = createCliHostClient(command);
    printJson(await client.getRuntimeSourceHistoryReplay(nodeId, replayId));
  });

hostRuntimesCommand
  .command("recovery")
  .argument("<nodeId>", "Node identifier in the active graph.")
  .option("--limit <n>", "Maximum number of recovery records to return.", "50")
  .option("--summary", "Print a compact operator-oriented recovery summary.")
  .description("Inspect persisted runtime recovery history for one runtime.")
  .action(
    async (
      nodeId: string,
      options: {
        limit: string;
        summary?: boolean;
      },
      command: Command
    ) => {
      const client = createCliHostClient(command);
      const response = await client.getRuntimeRecovery(
        nodeId,
        Number.parseInt(options.limit, 10)
      );
      printJson(
        options.summary
          ? { recovery: projectRuntimeRecoverySummary(response) }
          : response
      );
    }
  );

hostRuntimesCommand
  .command("recovery-policy")
  .argument("<nodeId>", "Node identifier in the active graph.")
  .argument("<file>", "Path to a runtime recovery policy JSON file.")
  .option(
    "--dry-run",
    "Print the canonical recovery-policy mutation without mutating the host."
  )
  .description("Apply one runtime recovery policy through entangle-host.")
  .action(
    async (
      nodeId: string,
      file: string,
      options: { dryRun?: boolean },
      command: Command
    ) => {
    const client = createCliHostClient(command);
      const request = runtimeRecoveryPolicyMutationRequestSchema.parse(
        await readJsonDocument(resolveCliPath(file))
      );

      if (options.dryRun) {
        printJson(
          buildCliMutationDryRun({
            mutation: "host.runtimes.recovery_policy.set",
            request,
            target: {
              nodeId
            }
          })
        );
        return;
      }

      printJson(await client.setRuntimeRecoveryPolicy(nodeId, request));
  });

hostRuntimesCommand
  .command("start")
  .argument("<nodeId>", "Node identifier in the active graph.")
  .option(
    "--dry-run",
    "Print the canonical runtime-start intent without mutating the host."
  )
  .description("Set one runtime's desired state to running.")
  .action(async (nodeId: string, options: { dryRun?: boolean }, command: Command) => {
    const client = createCliHostClient(command);

    if (options.dryRun) {
      printJson(
        buildCliMutationDryRun({
          mutation: "host.runtimes.start",
          target: {
            nodeId
          }
        })
      );
      return;
    }

    printJson(await client.startRuntime(nodeId));
  });

hostRuntimesCommand
  .command("stop")
  .argument("<nodeId>", "Node identifier in the active graph.")
  .option(
    "--dry-run",
    "Print the canonical runtime-stop intent without mutating the host."
  )
  .description("Set one runtime's desired state to stopped.")
  .action(async (nodeId: string, options: { dryRun?: boolean }, command: Command) => {
    const client = createCliHostClient(command);

    if (options.dryRun) {
      printJson(
        buildCliMutationDryRun({
          mutation: "host.runtimes.stop",
          target: {
            nodeId
          }
        })
      );
      return;
    }

    printJson(await client.stopRuntime(nodeId));
  });

hostRuntimesCommand
  .command("restart")
  .argument("<nodeId>", "Node identifier in the active graph.")
  .option(
    "--dry-run",
    "Print the canonical runtime-restart intent without mutating the host."
  )
  .description("Request deterministic runtime recreation while keeping the desired state running.")
  .action(async (nodeId: string, options: { dryRun?: boolean }, command: Command) => {
    const client = createCliHostClient(command);

    if (options.dryRun) {
      printJson(
        buildCliMutationDryRun({
          mutation: "host.runtimes.restart",
          target: {
            nodeId
          }
        })
      );
      return;
    }

    printJson(await client.restartRuntime(nodeId));
  });

const hostSessionsCommand = hostCommand
  .command("sessions")
  .description("Inspect persisted runtime sessions through entangle-host.");

hostSessionsCommand
  .command("list")
  .option("--summary", "Print compact operator-oriented session summaries.")
  .description("List aggregated persisted sessions across the current host runtimes.")
  .action(async (options: { summary?: boolean }, command: Command) => {
    const client = createCliHostClient(command);
    const response = await client.listSessions();
    printJson(
      options.summary
        ? {
            sessions: sortHostSessionSummariesForPresentation(
              response.sessions
            ).map(projectHostSessionSummary)
          }
        : response
    );
  });

hostSessionsCommand
  .command("get")
  .argument("<sessionId>", "Session identifier in the current host runtime state.")
  .option("--summary", "Print a compact operator-oriented session summary.")
  .description("Inspect one persisted session aggregated across participating nodes.")
  .action(async (
    sessionId: string,
    options: { summary?: boolean },
    command: Command
  ) => {
    const client = createCliHostClient(command);
    const response = await client.getSession(sessionId);
    printJson(
      options.summary
        ? { session: projectHostSessionInspectionSummary(response) }
        : response
    );
  });

hostSessionsCommand
  .command("cancel")
  .argument("<sessionId>", "Session identifier to cancel.")
  .option("--cancellation-id <id>", "Explicit cancellation request id.")
  .option(
    "--node-id <nodeId>",
    "Runtime node id to target. Repeatable; if one node is supplied, the runtime-bound cancellation endpoint is used.",
    collectRepeatedOptionValue,
    [] as string[]
  )
  .option("--reason <reason>", "Operator-visible cancellation reason.")
  .option("--requested-by <operatorId>", "Operator id requesting cancellation.")
  .option("--summary", "Print a compact operator-oriented cancellation summary.")
  .description(
    "Request external cancellation for a persisted session through entangle-host."
  )
  .action(async (
    sessionId: string,
    options: {
      cancellationId?: string;
      nodeId: string[];
      reason?: string;
      requestedBy?: string;
      summary?: boolean;
    },
    command: Command
  ) => {
    const client = createCliHostClient(command);
    const request = sessionCancellationMutationRequestSchema.parse({
      ...(options.cancellationId
        ? { cancellationId: options.cancellationId }
        : {}),
      nodeIds: options.nodeId,
      ...(options.reason ? { reason: options.reason } : {}),
      ...(options.requestedBy ? { requestedBy: options.requestedBy } : {})
    });
    const response =
      options.nodeId.length === 1
        ? await client.cancelRuntimeSession(options.nodeId[0]!, sessionId, request)
        : await client.cancelSession(sessionId, request);

    printJson(
      options.summary
        ? {
            cancellation: {
              cancellations: response.cancellations.map((cancellation) => ({
                cancellationId: cancellation.cancellationId,
                nodeId: cancellation.nodeId,
                status: cancellation.status
              })),
              nextCommands: [
                `entangle host sessions get ${sessionId} --summary`,
                ...response.cancellations.map(
                  (cancellation) =>
                    `entangle host runtimes turns ${cancellation.nodeId} --summary`
                )
              ],
              sessionId: response.sessionId
            }
          }
        : response
    );
  });

hostSessionsCommand
  .command("launch")
  .argument("<nodeId>", "Target runtime node identifier.")
  .argument("<summary>", "Work summary to deliver as a task.request.")
  .option(
    "--artifact-ref-file <file>",
    "Path to an ArtifactRef JSON document to attach. Repeatable.",
    collectRepeatedOptionValue,
    [] as string[]
  )
  .option("--conversation-id <conversationId>", "Explicit conversation id.")
  .option("--from-node-id <nodeId>", "Explicit graph user node id.")
  .option("--intent <intent>", "Intent text. Defaults to the summary.")
  .option("--session-id <sessionId>", "Explicit session id.")
  .option("--turn-id <turnId>", "Explicit turn id.")
  .option(
    "--wait",
    "Poll the launched session until it completes, fails, waits for approval, or the wait deadline expires."
  )
  .option(
    "--wait-interval-ms <ms>",
    "Polling interval for --wait in milliseconds.",
    "1000"
  )
  .option(
    "--wait-timeout-ms <ms>",
    "Maximum time to wait for --wait in milliseconds.",
    "60000"
  )
  .description(
    "Launch a task session through entangle-host using host-resolved runtime context."
  )
  .action(
    async (
      nodeId: string,
      summary: string,
      options: {
        artifactRefFile: string[];
        conversationId?: string;
        fromNodeId?: string;
        intent?: string;
        sessionId?: string;
        turnId?: string;
        wait?: boolean;
        waitIntervalMs: string;
        waitTimeoutMs: string;
      },
      command: Command
    ) => {
      const client = createCliHostClient(command);
      const artifactRefs = await Promise.all(
        options.artifactRefFile.map(async (file) =>
          artifactRefSchema.parse(await readJsonDocument(resolveCliPath(file)))
        )
      );
      const launch = await client.launchSession(
        sessionLaunchRequestSchema.parse({
          artifactRefs,
          ...(options.conversationId
            ? { conversationId: options.conversationId }
            : {}),
          ...(options.fromNodeId ? { fromNodeId: options.fromNodeId } : {}),
          ...(options.intent ? { intent: options.intent } : {}),
          ...(options.sessionId ? { sessionId: options.sessionId } : {}),
          summary,
          targetNodeId: nodeId,
          ...(options.turnId ? { turnId: options.turnId } : {})
        })
      );

      if (!options.wait) {
        printJson(projectHostSessionLaunchSummary({ launch }));
        return;
      }

      const wait = projectHostSessionWaitSummary(
        await waitForHostSession({
          client,
          intervalMs: parsePositiveIntegerOption(
            options.waitIntervalMs,
            "--wait-interval-ms"
          ),
          sessionId: launch.sessionId,
          timeoutMs: parsePositiveIntegerOption(
            options.waitTimeoutMs,
            "--wait-timeout-ms"
          )
        })
      );

      printJson(projectHostSessionLaunchSummary({ launch, wait }));

      if (shouldHostSessionWaitExitNonZero(wait)) {
        process.exitCode = 1;
      }
    }
  );

const graphCommand = program
  .command("graph")
  .description("Inspect graph files from the terminal.");

const graphTemplatesCommand = graphCommand
  .command("templates")
  .description("Export built-in graph templates for federated workbench flows.");

graphTemplatesCommand
  .command("list")
  .description("List available graph templates.")
  .action(() => {
    printJson({
      templates: listGraphTemplates()
    });
  });

graphTemplatesCommand
  .command("export")
  .argument("<templateId>", "Graph template identifier.")
  .argument("<file>", "Destination graph JSON file.")
  .description("Write a graph template JSON file.")
  .action(async (templateId: string, file: string) => {
    const template = getGraphTemplate(templateId);

    if (!template) {
      throw new Error(`Unknown graph template '${templateId}'.`);
    }

    const graph = graphSpecSchema.parse(
      await readJsonDocument(resolveRepositoryPath(template.graphPath))
    );
    const outputPath = resolveCliPath(file);

    await writeJsonDocument(outputPath, graph);

    printJson({
      template: {
        ...template,
        edgeCount: graph.edges.length,
        graphId: graph.graphId,
        nodeCount: graph.nodes.length,
        outputPath
      }
    });
  });

graphCommand
  .command("inspect")
  .argument("<file>", "Path to a graph JSON file.")
  .description("Run offline validation and print the result for a graph file.")
  .action(async (file: string) => {
    const report = await validateGraphFile(resolveCliPath(file));
    console.log(formatValidationReport(report));
    process.exitCode = report.ok ? 0 : 1;
  });

graphCommand
  .command("diff")
  .argument("<fromFile>", "Path to the base graph JSON file.")
  .argument("<toFile>", "Path to the candidate graph JSON file.")
  .description("Compare two graph JSON files and print node, edge, and default changes.")
  .action(async (fromFile: string, toFile: string) => {
    const fromGraph = graphSpecSchema.parse(
      await readJsonDocument(resolveCliPath(fromFile))
    );
    const toGraph = graphSpecSchema.parse(
      await readJsonDocument(resolveCliPath(toFile))
    );

    printJson({
      diff: buildGraphDiff(fromGraph, toGraph)
    });
  });

await program.parseAsync(process.argv);

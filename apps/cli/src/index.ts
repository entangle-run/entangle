import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Command } from "commander";
import {
  createHostClient,
  filterHostEvents,
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
  type HostEventRecord,
  nodeCreateRequestSchema,
  nodeReplacementRequestSchema,
  runtimeApprovalDecisionMutationRequestSchema,
  runtimeRecoveryPolicyMutationRequestSchema,
  runtimeSourceChangeCandidateApplyMutationRequestSchema,
  runtimeSourceChangeCandidateReviewMutationRequestSchema,
  runtimeSourceHistoryPublishMutationRequestSchema,
  runtimeSourceHistoryReplayRequestSchema,
  runtimeWikiRepositoryPublicationRequestSchema,
  sessionCancellationMutationRequestSchema,
  type SessionInspectionResponse,
  sessionLaunchRequestSchema
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
  buildLocalDoctorReport,
  formatLocalDoctorText
} from "./local-doctor-command.js";
import { buildLocalDiagnosticsBundle } from "./local-diagnostics-bundle-command.js";
import {
  createLocalBackup,
  restoreLocalBackup
} from "./local-backup-command.js";
import {
  buildLocalRepairReport,
  formatLocalRepairText
} from "./local-repair-command.js";
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
  buildNodeAgentRuntimeReplacementRequest,
  type NodeAgentRuntimeConfigurationOptions
} from "./node-agent-runtime-command.js";
import {
  buildPackageInitOptions,
  type PackageInitCliOptions
} from "./package-init-command.js";
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
  projectRuntimeArtifactPromotionRecordSummary,
  projectRuntimeArtifactPromotionSummary,
  projectRuntimeArtifactRestoreRecordSummary,
  projectRuntimeArtifactRestoreSummary,
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
  projectRuntimeSourceHistoryReplaySummary,
  projectRuntimeSourceHistorySummary
} from "./runtime-source-history-output.js";
import { projectRuntimeWikiRepositoryPublicationSummary } from "./runtime-wiki-repository-output.js";
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
  recoveryOnly?: boolean;
  runtimeTraceOnly?: boolean;
  typePrefix: string[];
}) {
  return {
    ...(options.category ? { category: options.category } : {}),
    ...(options.nodeId ? { nodeId: options.nodeId } : {}),
    ...(options.recoveryOnly ? { recoveryOnly: true } : {}),
    ...(options.runtimeTraceOnly ? { runtimeTraceOnly: true } : {}),
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
  const rootOptions = command.parent?.opts<{ hostUrl?: string }>();
  const nestedRootOptions = command.parent?.parent?.opts<{ hostUrl?: string }>();

  return (
    rootOptions?.hostUrl ??
    nestedRootOptions?.hostUrl ??
    process.env.ENTANGLE_HOST_URL ??
    "http://localhost:7071"
  );
}

function resolveHostToken(command: Command): string | undefined {
  const rootOptions = command.parent?.opts<{ hostToken?: string }>();
  const nestedRootOptions = command.parent?.parent?.opts<{ hostToken?: string }>();
  const token =
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

const localCommand = program
  .command("local")
  .description("Inspect and operate the Entangle Local profile.");

localCommand
  .command("backup")
  .option("--force", "Replace an existing backup output directory.")
  .option(
    "--output <path>",
    "Entangle Local backup bundle output directory.",
    "entangle-local-backup"
  )
  .description("Create a versioned Entangle Local backup bundle without local secrets.")
  .action(
    async (options: { force?: boolean; output: string }) => {
      const summary = await createLocalBackup({
        force: options.force,
        outputPath: resolveCliPath(options.output),
        repositoryRoot
      });

      printJson({
        backup: summary
      });
    }
  );

localCommand
  .command("restore")
  .argument("<bundle>", "Path to an Entangle Local backup bundle directory.")
  .option("--dry-run", "Validate the backup and report what would be restored.")
  .option("--force", "Replace the current .entangle/host state directory.")
  .description("Restore .entangle/host from a validated Entangle Local backup bundle.")
  .action(
    async (
      bundle: string,
      options: {
        dryRun?: boolean;
        force?: boolean;
      }
    ) => {
      const summary = await restoreLocalBackup({
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

localCommand
  .command("repair")
  .option("--apply-safe", "Apply only conservative repair actions marked safe.")
  .option("--gitea-url <url>", "Expected local Gitea URL.", "http://localhost:3001")
  .option("--host-token <token>", "Bearer token for a protected local host.")
  .option("--host-url <url>", "Expected local host API URL.", "http://localhost:7071")
  .option("--json", "Print the full machine-readable repair report.")
  .option("--relay-url <url>", "Expected local Nostr relay URL.", "ws://localhost:7777")
  .option("--runner-image <image>", "Expected local runner image.", "entangle-runner:local")
  .option("--skip-live", "Skip live host, Studio, Gitea, and relay checks.")
  .option("--strict", "Treat optional local infrastructure warnings as failures.")
  .option("--studio-url <url>", "Expected local Studio URL.", "http://localhost:3000")
  .description("Preview or apply conservative Entangle Local repair actions.")
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
      const report = await buildLocalRepairReport(
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
        process.stdout.write(formatLocalRepairText(report));
      }

      if (report.status === "blocked") {
        process.exitCode = 1;
      }
    }
  );

localCommand
  .command("doctor")
  .option("--gitea-url <url>", "Expected local Gitea URL.", "http://localhost:3001")
  .option("--host-token <token>", "Bearer token for a protected local host.")
  .option("--host-url <url>", "Expected local host API URL.", "http://localhost:7071")
  .option("--json", "Print the full machine-readable doctor report.")
  .option("--relay-url <url>", "Expected local Nostr relay URL.", "ws://localhost:7777")
  .option("--runner-image <image>", "Expected local runner image.", "entangle-runner:local")
  .option("--skip-live", "Skip live host, Studio, Gitea, and relay checks.")
  .option("--strict", "Treat optional local infrastructure warnings as failures.")
  .option("--studio-url <url>", "Expected local Studio URL.", "http://localhost:3000")
  .description("Run a read-only Entangle Local doctor diagnostic.")
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
      const report = await buildLocalDoctorReport(
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
        process.stdout.write(formatLocalDoctorText(report));
      }

      if (report.status === "fail") {
        process.exitCode = 1;
      }
    }
  );

localCommand
  .command("diagnostics")
  .option("--event-limit <n>", "Maximum host events to include.", "50")
  .option("--gitea-url <url>", "Expected local Gitea URL.", "http://localhost:3001")
  .option("--host-token <token>", "Bearer token for a protected local host.")
  .option("--host-url <url>", "Expected local host API URL.", "http://localhost:7071")
  .option("--log-tail <n>", "Tail lines to collect from Local Compose logs.", "200")
  .option(
    "--max-command-output-chars <n>",
    "Maximum captured characters per command stream.",
    "65536"
  )
  .option(
    "--output <path>",
    "Diagnostics bundle JSON output path.",
    "entangle-local-diagnostics.json"
  )
  .option("--relay-url <url>", "Expected local Nostr relay URL.", "ws://localhost:7777")
  .option("--runner-image <image>", "Expected local runner image.", "entangle-runner:local")
  .option("--skip-live", "Skip live host, Studio, Gitea, and relay checks.")
  .option("--studio-url <url>", "Expected local Studio URL.", "http://localhost:3000")
  .description("Write a redacted Entangle Local diagnostics bundle.")
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
      const bundle = await buildLocalDiagnosticsBundle(
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

const hostEventsCommand = hostCommand
  .command("events")
  .description("Inspect and watch typed host events.");

hostEventsCommand
  .command("list")
  .option("--limit <n>", "Maximum number of events to fetch.", "100")
  .option("--category <category>", "Filter by host event category.")
  .option("--node-id <nodeId>", "Filter to one runtime or session node id.")
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
  .description("List typed host events from entangle-host with optional local filtering.")
  .action(
    async (
      options: {
        category?: HostEventRecord["category"];
        limit: string;
        nodeId?: string;
        recoveryOnly?: boolean;
        runtimeTraceOnly?: boolean;
        summary?: boolean;
        typePrefix: string[];
      },
      command: Command
    ) => {
      const client = createCliHostClient(command);
      const response = await client.listHostEvents(Number.parseInt(options.limit, 10));
      renderCliHostEvents(
        filterHostEvents(
          response.events,
          buildHostEventFilter(buildCliHostEventInspectionOptions(options))
        ),
        options.summary === true
      );
    }
  );

hostEventsCommand
  .command("watch")
  .option("--replay <n>", "Replay the last N persisted events before streaming.", "20")
  .option("--category <category>", "Filter by host event category.")
  .option("--node-id <nodeId>", "Filter to one runtime or session node id.")
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
        recoveryOnly?: boolean;
        replay: string;
        runtimeTraceOnly?: boolean;
        summary?: boolean;
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
    "Admit a canonical local package path or archive into entangle-host desired state."
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
  .description("Print the effective runtime context for one runtime.")
  .action(async (nodeId: string, _options, command: Command) => {
    const client = createCliHostClient(command);
    printJson(await client.getRuntimeContext(nodeId));
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
  .option("--overwrite", "Replace an existing restore target with the same id.")
  .option("--reason <reason>", "Operator reason for the restore attempt.")
  .option("--requested-by <nodeId>", "Node or operator identifier requesting restore.")
  .option("--restore-id <restoreId>", "Stable restore identifier.")
  .option("--summary", "Print a compact operator-oriented restore summary.")
  .description("Restore a git-backed runtime artifact into the artifact workspace.")
  .action(
    async (
      nodeId: string,
      artifactId: string,
      options: {
        overwrite?: boolean;
        reason?: string;
        requestedBy?: string;
        restoreId?: string;
        summary?: boolean;
      },
      command: Command
    ) => {
      const client = createCliHostClient(command);
      const response = await client.restoreRuntimeArtifact(nodeId, artifactId, {
        overwrite: options.overwrite ?? false,
        ...(options.reason ? { reason: options.reason } : {}),
        ...(options.requestedBy ? { requestedBy: options.requestedBy } : {}),
        ...(options.restoreId ? { restoreId: options.restoreId } : {})
      });

      printJson(
        options.summary ? projectRuntimeArtifactRestoreSummary(response) : response
      );
    }
  );

hostRuntimesCommand
  .command("artifact-restores")
  .argument("<nodeId>", "Node identifier in the active graph.")
  .option("--artifact-id <artifactId>", "Filter restore records by artifact id.")
  .option("--summary", "Print compact operator-oriented restore summaries.")
  .description("Inspect persisted runtime artifact restore attempts.")
  .action(
    async (
      nodeId: string,
      options: {
        artifactId?: string;
        summary?: boolean;
      },
      command: Command
    ) => {
      const client = createCliHostClient(command);
      const response = options.artifactId
        ? await client.listRuntimeArtifactRestoresForArtifact(
            nodeId,
            options.artifactId
          )
        : await client.listRuntimeArtifactRestores(nodeId);

      printJson({
        restores: options.summary
          ? response.restores.map(projectRuntimeArtifactRestoreRecordSummary)
          : response.restores
      });
    }
  );

hostRuntimesCommand
  .command("artifact-promote")
  .argument("<nodeId>", "Node identifier in the active graph.")
  .argument("<artifactId>", "Artifact identifier to promote.")
  .requiredOption(
    "--restore-id <restoreId>",
    "Restored artifact workspace identifier to promote."
  )
  .requiredOption(
    "--approval-id <approvalId>",
    "Approved source_application approval scoped to the artifact restore."
  )
  .option("--overwrite", "Replace existing source workspace files.")
  .option("--promoted-by <nodeId>", "Node or operator identifier promoting the artifact.")
  .option("--promotion-id <promotionId>", "Stable promotion identifier.")
  .option("--reason <reason>", "Operator reason for the promotion attempt.")
  .option("--summary", "Print a compact operator-oriented promotion summary.")
  .description("Promote a restored runtime artifact into the source workspace.")
  .action(
    async (
      nodeId: string,
      artifactId: string,
      options: {
        approvalId: string;
        overwrite?: boolean;
        promotedBy?: string;
        promotionId?: string;
        reason?: string;
        restoreId: string;
        summary?: boolean;
      },
      command: Command
    ) => {
      const client = createCliHostClient(command);
      const response = await client.promoteRuntimeArtifact(nodeId, artifactId, {
        approvalId: options.approvalId,
        overwrite: options.overwrite ?? false,
        ...(options.promotedBy ? { promotedBy: options.promotedBy } : {}),
        ...(options.promotionId ? { promotionId: options.promotionId } : {}),
        ...(options.reason ? { reason: options.reason } : {}),
        restoreId: options.restoreId,
        target: "source_workspace"
      });

      printJson(
        options.summary
          ? projectRuntimeArtifactPromotionSummary(response)
          : response
      );
    }
  );

hostRuntimesCommand
  .command("artifact-promotions")
  .argument("<nodeId>", "Node identifier in the active graph.")
  .option("--artifact-id <artifactId>", "Filter promotion records by artifact id.")
  .option("--summary", "Print compact operator-oriented promotion summaries.")
  .description("Inspect persisted runtime artifact promotion attempts.")
  .action(
    async (
      nodeId: string,
      options: {
        artifactId?: string;
        summary?: boolean;
      },
      command: Command
    ) => {
      const client = createCliHostClient(command);
      const response = options.artifactId
        ? await client.listRuntimeArtifactPromotionsForArtifact(
            nodeId,
            options.artifactId
          )
        : await client.listRuntimeArtifactPromotions(nodeId);

      printJson({
        promotions: options.summary
          ? response.promotions.map(projectRuntimeArtifactPromotionRecordSummary)
          : response.promotions
      });
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
  .command("approval-decision")
  .argument("<nodeId>", "Node identifier in the active graph.")
  .option("--approval-id <approvalId>", "Existing approval id to decide.")
  .option("--approver <approverNodeId>", "Approver node id.", "user")
  .option("--operation <operation>", "Policy operation for a new scoped approval.")
  .option("--reason <reason>", "Decision reason.")
  .option("--resource-id <resourceId>", "Policy resource id for a new scoped approval.")
  .option(
    "--resource-kind <resourceKind>",
    "Policy resource kind for a new scoped approval."
  )
  .option("--resource-label <resourceLabel>", "Human-readable resource label.")
  .option("--session-id <sessionId>", "Session id for a new scoped approval.")
  .option(
    "--status <status>",
    "Decision status: approved or rejected.",
    "approved"
  )
  .option("--summary", "Print a compact operator-oriented approval summary.")
  .description("Record an operator decision for a scoped runtime approval.")
  .action(
    async (
      nodeId: string,
      options: {
        approvalId?: string;
        approver: string;
        operation?: string;
        reason?: string;
        resourceId?: string;
        resourceKind?: string;
        resourceLabel?: string;
        sessionId?: string;
        status: string;
        summary?: boolean;
      },
      command: Command
    ) => {
      if (
        (options.resourceId || options.resourceKind || options.resourceLabel) &&
        (!options.resourceId || !options.resourceKind)
      ) {
        throw new Error(
          "Use --resource-id and --resource-kind together when setting approval scope."
        );
      }

      const decision = runtimeApprovalDecisionMutationRequestSchema.parse({
        ...(options.approvalId ? { approvalId: options.approvalId } : {}),
        approverNodeIds: [options.approver],
        ...(options.operation ? { operation: options.operation } : {}),
        ...(options.reason ? { reason: options.reason } : {}),
        ...(options.resourceId && options.resourceKind
          ? {
              resource: {
                id: options.resourceId,
                kind: options.resourceKind,
                ...(options.resourceLabel
                  ? { label: options.resourceLabel }
                  : {})
              }
            }
          : {}),
        ...(options.sessionId ? { sessionId: options.sessionId } : {}),
        status: options.status
      });
      const client = createCliHostClient(command);
      const response = await client.recordRuntimeApprovalDecision(
        nodeId,
        decision
      );

      printJson(
        options.summary
          ? { approval: projectRuntimeApprovalSummary(response.approval) }
          : response
      );
    }
  );

hostRuntimesCommand
  .command("source-candidate")
  .argument("<nodeId>", "Node identifier in the active graph.")
  .argument("<candidateId>", "Source change candidate identifier to inspect.")
  .option("--diff", "Include the bounded source diff when available.")
  .option("--file <path>", "Include a bounded preview for one changed source file.")
  .option("--apply", "Apply an accepted candidate into runtime source history.")
  .option(
    "--review <status>",
    "Review the candidate as accepted, rejected, or superseded."
  )
  .option("--reason <reason>", "Attach a review or application reason.")
  .option("--reviewed-by <operatorId>", "Attach the reviewing operator id.")
  .option("--applied-by <operatorId>", "Attach the applying operator id.")
  .option("--approval-id <approvalId>", "Attach an approved source application approval id.")
  .option(
    "--superseded-by <candidateId>",
    "Candidate id that supersedes this candidate when --review superseded is used."
  )
  .option("--summary", "Print a compact operator-oriented candidate summary.")
  .description("Inspect, review, or apply one persisted source change candidate.")
  .action(
    async (
      nodeId: string,
      candidateId: string,
      options: {
        appliedBy?: string;
        approvalId?: string;
        apply?: boolean;
        diff?: boolean;
        file?: string;
        reason?: string;
        review?: string;
        reviewedBy?: string;
        supersededBy?: string;
        summary?: boolean;
      },
      command: Command
    ) => {
      const client = createCliHostClient(command);
      const selectedInspectionModes = [
        options.apply,
        options.diff,
        Boolean(options.file),
        Boolean(options.review)
      ].filter(Boolean).length;

      if (selectedInspectionModes > 1) {
        throw new Error("Use only one of --apply, --diff, --file, or --review.");
      }

      if (options.reason && !options.review && !options.apply) {
        throw new Error(
          "Use --reason only with --review or --apply."
        );
      }

      if ((options.reviewedBy || options.supersededBy) && !options.review) {
        throw new Error("Use --reviewed-by or --superseded-by only with --review.");
      }

      if ((options.appliedBy || options.approvalId) && !options.apply) {
        throw new Error("Use --applied-by or --approval-id only with --apply.");
      }

      if (options.apply) {
        const apply =
          runtimeSourceChangeCandidateApplyMutationRequestSchema.parse({
            ...(options.approvalId ? { approvalId: options.approvalId } : {}),
            ...(options.appliedBy ? { appliedBy: options.appliedBy } : {}),
            ...(options.reason ? { reason: options.reason } : {})
          });
        const response = await client.applyRuntimeSourceChangeCandidate(
          nodeId,
          candidateId,
          apply
        );
        printJson(
          options.summary
            ? {
                sourceHistory: projectRuntimeSourceHistorySummary(response.entry)
              }
            : response
        );
        return;
      }

      if (options.review) {
        const review = runtimeSourceChangeCandidateReviewMutationRequestSchema.parse({
          ...(options.reason ? { reason: options.reason } : {}),
          ...(options.reviewedBy ? { reviewedBy: options.reviewedBy } : {}),
          status: options.review,
          ...(options.supersededBy
            ? { supersededByCandidateId: options.supersededBy }
            : {})
        });
        const response = await client.reviewRuntimeSourceChangeCandidate(
          nodeId,
          candidateId,
          review
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
        return;
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
  .command("wiki-publications")
  .argument("<nodeId>", "Node identifier in the active graph.")
  .option("--summary", "Print compact operator-oriented wiki publication summaries.")
  .description("Inspect persisted runtime wiki-repository publication attempts.")
  .action(
    async (
      nodeId: string,
      options: {
        summary?: boolean;
      },
      command: Command
    ) => {
      const client = createCliHostClient(command);
      const response = await client.listRuntimeWikiRepositoryPublications(nodeId);

      printJson({
        publications: options.summary
          ? response.publications.map(
              projectRuntimeWikiRepositoryPublicationSummary
            )
          : response.publications
      });
    }
  );

hostRuntimesCommand
  .command("wiki-publish")
  .argument("<nodeId>", "Node identifier in the active graph.")
  .option("--published-by <nodeId>", "Node or operator identifier requesting publication.")
  .option("--publication-id <publicationId>", "Stable publication attempt identifier.")
  .option("--reason <reason>", "Attach a publication reason.")
  .option("--retry", "Retry after a failed wiki-repository publication attempt.")
  .option("--target-git-service-ref <gitServiceRef>", "Target git service reference.")
  .option("--target-namespace <namespace>", "Target git namespace.")
  .option("--target-repository-name <repositoryName>", "Target git repository name.")
  .option("--summary", "Print a compact operator-oriented publication summary.")
  .description("Publish the runtime wiki repository as a git artifact.")
  .action(
    async (
      nodeId: string,
      options: {
        publishedBy?: string;
        publicationId?: string;
        reason?: string;
        retry?: boolean;
        summary?: boolean;
        targetGitServiceRef?: string;
        targetNamespace?: string;
        targetRepositoryName?: string;
      },
      command: Command
    ) => {
      const publish = runtimeWikiRepositoryPublicationRequestSchema.parse({
        ...(options.publicationId
          ? { publicationId: options.publicationId }
          : {}),
        ...(options.publishedBy ? { publishedBy: options.publishedBy } : {}),
        ...(options.reason ? { reason: options.reason } : {}),
        retry: Boolean(options.retry),
        ...(options.targetGitServiceRef
          ? { targetGitServiceRef: options.targetGitServiceRef }
          : {}),
        ...(options.targetNamespace
          ? { targetNamespace: options.targetNamespace }
          : {}),
        ...(options.targetRepositoryName
          ? { targetRepositoryName: options.targetRepositoryName }
          : {})
      });
      const client = createCliHostClient(command);
      const response = await client.publishRuntimeWikiRepository(
        nodeId,
        publish
      );

      printJson(
        options.summary
          ? {
              artifactId: response.artifact.ref.artifactId,
              publication: projectRuntimeWikiRepositoryPublicationSummary(
                response.publication
              )
            }
          : response
      );
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
  .command("source-history-replays")
  .argument("<nodeId>", "Node identifier in the active graph.")
  .option("--source-history-id <sourceHistoryId>", "Filter replay records by source history id.")
  .option("--summary", "Print compact operator-oriented replay summaries.")
  .description("Inspect persisted source-history replay attempts.")
  .action(
    async (
      nodeId: string,
      options: {
        sourceHistoryId?: string;
        summary?: boolean;
      },
      command: Command
    ) => {
      const client = createCliHostClient(command);
      const response = options.sourceHistoryId
        ? await client.listRuntimeSourceHistoryReplaysForEntry(
            nodeId,
            options.sourceHistoryId
          )
        : await client.listRuntimeSourceHistoryReplays(nodeId);

      printJson({
        replays: options.summary
          ? response.replays.map(projectRuntimeSourceHistoryReplaySummary)
          : response.replays
      });
    }
  );

hostRuntimesCommand
  .command("source-history-replay")
  .argument("<nodeId>", "Node identifier in the active graph.")
  .argument("<sourceHistoryId>", "Source history entry identifier to replay.")
  .option("--approval-id <approvalId>", "Attach an approved source application approval id.")
  .option("--replayed-by <operatorId>", "Attach the replaying operator id.")
  .option("--reason <reason>", "Attach a replay reason.")
  .option("--replay-id <replayId>", "Stable replay identifier.")
  .option("--summary", "Print a compact operator-oriented replay summary.")
  .description("Replay one source history entry into the source workspace.")
  .action(
    async (
      nodeId: string,
      sourceHistoryId: string,
      options: {
        approvalId?: string;
        reason?: string;
        replayedBy?: string;
        replayId?: string;
        summary?: boolean;
      },
      command: Command
    ) => {
      const client = createCliHostClient(command);
      const replay = runtimeSourceHistoryReplayRequestSchema.parse({
        ...(options.approvalId ? { approvalId: options.approvalId } : {}),
        ...(options.reason ? { reason: options.reason } : {}),
        ...(options.replayedBy ? { replayedBy: options.replayedBy } : {}),
        ...(options.replayId ? { replayId: options.replayId } : {})
      });
      const response = await client.replayRuntimeSourceHistory(
        nodeId,
        sourceHistoryId,
        replay
      );

      printJson(
        options.summary
          ? {
              replay: projectRuntimeSourceHistoryReplaySummary(response.replay),
              sourceHistory: projectRuntimeSourceHistorySummary(response.entry)
            }
          : response
      );
    }
  );

hostRuntimesCommand
  .command("source-history-entry")
  .argument("<nodeId>", "Node identifier in the active graph.")
  .argument("<sourceHistoryId>", "Source history entry identifier to inspect.")
  .option("--publish", "Publish the source history entry as a git artifact.")
  .option("--approval-id <approvalId>", "Attach an approved source publication approval id.")
  .option("--published-by <operatorId>", "Attach the publishing operator id.")
  .option("--reason <reason>", "Attach a publication reason.")
  .option("--retry", "Retry after a failed source history publication attempt.")
  .option(
    "--target-git-service <serviceId>",
    "Publish to a selected git service."
  )
  .option("--target-namespace <namespace>", "Publish to a selected git namespace.")
  .option(
    "--target-repository <repositoryName>",
    "Publish to a selected git repository."
  )
  .option("--summary", "Print a compact operator-oriented source history summary.")
  .description("Inspect or publish one persisted source history entry.")
  .action(
    async (
      nodeId: string,
      sourceHistoryId: string,
      options: {
        approvalId?: string;
        publish?: boolean;
        publishedBy?: string;
        reason?: string;
        retry?: boolean;
        summary?: boolean;
        targetGitService?: string;
        targetNamespace?: string;
        targetRepository?: string;
      },
      command: Command
    ) => {
      const client = createCliHostClient(command);
      if (
        (options.approvalId ||
          options.publishedBy ||
          options.reason ||
          options.retry ||
          options.targetGitService ||
          options.targetNamespace ||
          options.targetRepository) &&
        !options.publish
      ) {
        throw new Error(
          "Use --approval-id, --published-by, --reason, --retry, or target options only with --publish."
        );
      }

      if (options.publish) {
        const publish =
          runtimeSourceHistoryPublishMutationRequestSchema.parse({
            ...(options.approvalId ? { approvalId: options.approvalId } : {}),
            ...(options.publishedBy ? { publishedBy: options.publishedBy } : {}),
            ...(options.reason ? { reason: options.reason } : {}),
            retry: options.retry ?? false,
            ...(options.targetGitService
              ? { targetGitServiceRef: options.targetGitService }
              : {}),
            ...(options.targetNamespace
              ? { targetNamespace: options.targetNamespace }
              : {}),
            ...(options.targetRepository
              ? { targetRepositoryName: options.targetRepository }
              : {})
          });
        const response = await client.publishRuntimeSourceHistory(
          nodeId,
          sourceHistoryId,
          publish
        );

        printJson(
          options.summary
            ? {
                artifact: projectRuntimeArtifactSummary(response.artifact),
                sourceHistory: projectRuntimeSourceHistorySummary(response.entry)
              }
            : response
        );
        return;
      }

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
    "Launch a local task session through entangle-host using host-resolved runtime context."
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
  .description("Export built-in graph templates for local workbench flows.");

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

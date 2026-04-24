import { readFile } from "node:fs/promises";
import path from "node:path";
import { Command } from "commander";
import {
  createHostClient,
  filterHostEvents,
  hostEventMatchesFilter
} from "@entangle/host-client";
import { createAgentPackageScaffold } from "@entangle/package-scaffold";
import {
  edgeCreateRequestSchema,
  edgeReplacementRequestSchema,
  externalPrincipalMutationRequestSchema,
  type HostEventRecord,
  nodeCreateRequestSchema,
  nodeReplacementRequestSchema,
  runtimeRecoveryPolicyMutationRequestSchema
} from "@entangle/types";
import {
  formatValidationReport,
  validateGraphFile,
  validatePackageDirectory
} from "@entangle/validator";
import { buildHostEventFilter } from "./host-event-inspection.js";
import { buildPackageSourceAdmissionRequestFromCli } from "./package-source-command.js";

async function readJsonDocument(filePath: string): Promise<unknown> {
  return JSON.parse(await readFile(filePath, "utf8")) as unknown;
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
  typePrefix: string[];
}) {
  return {
    ...(options.category ? { category: options.category } : {}),
    ...(options.nodeId ? { nodeId: options.nodeId } : {}),
    ...(options.recoveryOnly ? { recoveryOnly: true } : {}),
    ...(options.typePrefix.length > 0 ? { typePrefixes: options.typePrefix } : {})
  };
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

async function watchHostEvents(input: {
  command: Command;
  filterOptions: Parameters<typeof buildHostEventFilter>[0];
  replay: number;
}): Promise<void> {
  const client = createHostClient({ baseUrl: resolveHostUrl(input.command) });
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
          printJson(event);
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
    const report = await validatePackageDirectory(path.resolve(directory));
    console.log(formatValidationReport(report));
    process.exitCode = report.ok ? 0 : 1;
  });

validateCommand
  .command("graph")
  .argument("<file>", "Path to a graph JSON file.")
  .description("Validate a graph document.")
  .action(async (file: string) => {
    const report = await validateGraphFile(path.resolve(file));
    console.log(formatValidationReport(report));
    process.exitCode = report.ok ? 0 : 1;
  });

const packageCommand = program
  .command("package")
  .description("Create and inspect AgentPackage folders.");

packageCommand
  .command("init")
  .argument("<directory>", "Target directory for the new AgentPackage.")
  .description("Create a minimal AgentPackage scaffold.")
  .action(async (directory: string) => {
    const result = await createAgentPackageScaffold(path.resolve(directory));
    printJson(result);
  });

const hostCommand = program
  .command("host")
  .description("Interact with a running entangle-host.")
  .option(
    "--host-url <url>",
    "Base URL for entangle-host.",
    process.env.ENTANGLE_HOST_URL ?? "http://localhost:7071"
  );

hostCommand
  .command("status")
  .description("Fetch the current status from a running entangle-host.")
  .action(async (_options, command: Command) => {
    const client = createHostClient({ baseUrl: resolveHostUrl(command) });
    printJson(await client.getHostStatus());
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
  .description("List typed host events from entangle-host with optional local filtering.")
  .action(
    async (
      options: {
        category?: HostEventRecord["category"];
        limit: string;
        nodeId?: string;
        recoveryOnly?: boolean;
        typePrefix: string[];
      },
      command: Command
    ) => {
      const client = createHostClient({ baseUrl: resolveHostUrl(command) });
      const response = await client.listHostEvents(Number.parseInt(options.limit, 10));

      printJson({
        events: filterHostEvents(
          response.events,
          buildHostEventFilter(buildCliHostEventInspectionOptions(options))
        )
      });
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
  .description("Stream typed host events from entangle-host until interrupted.")
  .action(
    async (
      options: {
        category?: HostEventRecord["category"];
        nodeId?: string;
        recoveryOnly?: boolean;
        replay: string;
        typePrefix: string[];
      },
      command: Command
    ) => {
      await watchHostEvents({
        command,
        filterOptions: buildCliHostEventInspectionOptions(options),
        replay: Number.parseInt(options.replay, 10)
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
    const client = createHostClient({ baseUrl: resolveHostUrl(command) });
    printJson(await client.getCatalog());
  });

hostCatalogCommand
  .command("validate")
  .argument("<file>", "Path to a catalog JSON file.")
  .description("Validate a catalog document against the running host contract.")
  .action(async (file: string, _options, command: Command) => {
    const client = createHostClient({ baseUrl: resolveHostUrl(command) });
    printJson(await client.validateCatalog(await readJsonDocument(path.resolve(file))));
  });

hostCatalogCommand
  .command("apply")
  .argument("<file>", "Path to a catalog JSON file.")
  .description("Apply a catalog document through entangle-host.")
  .action(async (file: string, _options, command: Command) => {
    const client = createHostClient({ baseUrl: resolveHostUrl(command) });
    printJson(await client.applyCatalog(await readJsonDocument(path.resolve(file))));
  });

const hostPackageSourcesCommand = hostCommand
  .command("package-sources")
  .description("Inspect and admit package sources through entangle-host.");

hostPackageSourcesCommand
  .command("list")
  .description("List admitted package sources.")
  .action(async (_options, command: Command) => {
    const client = createHostClient({ baseUrl: resolveHostUrl(command) });
    printJson(await client.listPackageSources());
  });

hostPackageSourcesCommand
  .command("get")
  .argument("<packageSourceId>", "Package source identifier.")
  .description("Inspect one admitted package source.")
  .action(async (packageSourceId: string, _options, command: Command) => {
    const client = createHostClient({ baseUrl: resolveHostUrl(command) });
    printJson(await client.getPackageSource(packageSourceId));
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
  .description(
    "Admit a canonical local package path or archive into entangle-host desired state."
  )
  .action(
    async (
      inputPath: string,
      options: {
        packageSourceId?: string;
        sourceKind: string;
      },
      command: Command
    ) => {
    const client = createHostClient({ baseUrl: resolveHostUrl(command) });
    printJson(
      await client.admitPackageSource(
        buildPackageSourceAdmissionRequestFromCli({
          inputPath,
          ...(options.packageSourceId
            ? { packageSourceId: options.packageSourceId }
            : {}),
          sourceKind: options.sourceKind
        })
      )
    );
    }
  );

const hostExternalPrincipalsCommand = hostCommand
  .command("external-principals")
  .description("Inspect and mutate external principal bindings through entangle-host.");

hostExternalPrincipalsCommand
  .command("list")
  .description("List bound external principals.")
  .action(async (_options, command: Command) => {
    const client = createHostClient({ baseUrl: resolveHostUrl(command) });
    printJson(await client.listExternalPrincipals());
  });

hostExternalPrincipalsCommand
  .command("get")
  .argument("<principalId>", "External principal identifier.")
  .description("Inspect one external principal.")
  .action(async (principalId: string, _options, command: Command) => {
    const client = createHostClient({ baseUrl: resolveHostUrl(command) });
    printJson(await client.getExternalPrincipal(principalId));
  });

hostExternalPrincipalsCommand
  .command("apply")
  .argument("<file>", "Path to an external principal JSON file.")
  .description("Create or update one external principal through entangle-host.")
  .action(async (file: string, _options, command: Command) => {
    const client = createHostClient({ baseUrl: resolveHostUrl(command) });
    printJson(
      await client.upsertExternalPrincipal(
        externalPrincipalMutationRequestSchema.parse(
          await readJsonDocument(path.resolve(file))
        )
      )
    );
  });

const hostGraphCommand = hostCommand
  .command("graph")
  .description("Inspect and mutate the active graph through entangle-host.");

hostGraphCommand
  .command("get")
  .description("Print the active graph and revision metadata.")
  .action(async (_options, command: Command) => {
    const client = createHostClient({ baseUrl: resolveHostUrl(command) });
    printJson(await client.getGraph());
  });

const hostGraphRevisionsCommand = hostGraphCommand
  .command("revisions")
  .description("Inspect persisted graph revisions through entangle-host.");

hostGraphRevisionsCommand
  .command("list")
  .description("List persisted graph revisions.")
  .action(async (_options, command: Command) => {
    const client = createHostClient({ baseUrl: resolveHostUrl(command) });
    printJson(await client.listGraphRevisions());
  });

hostGraphRevisionsCommand
  .command("get")
  .argument("<revisionId>", "Graph revision identifier.")
  .description("Inspect one persisted graph revision.")
  .action(async (revisionId: string, _options, command: Command) => {
    const client = createHostClient({ baseUrl: resolveHostUrl(command) });
    printJson(await client.getGraphRevision(revisionId));
  });

hostGraphCommand
  .command("validate")
  .argument("<file>", "Path to a graph JSON file.")
  .description("Validate a graph candidate against the host catalog and admitted package sources.")
  .action(async (file: string, _options, command: Command) => {
    const client = createHostClient({ baseUrl: resolveHostUrl(command) });
    printJson(await client.validateGraph(await readJsonDocument(path.resolve(file))));
  });

hostGraphCommand
  .command("apply")
  .argument("<file>", "Path to a graph JSON file.")
  .description("Apply a graph candidate through entangle-host.")
  .action(async (file: string, _options, command: Command) => {
    const client = createHostClient({ baseUrl: resolveHostUrl(command) });
    printJson(await client.applyGraph(await readJsonDocument(path.resolve(file))));
  });

const hostNodesCommand = hostCommand
  .command("nodes")
  .description("Inspect and mutate applied managed node bindings through entangle-host.");

hostNodesCommand
  .command("list")
  .description("List applied non-user node bindings for the active graph.")
  .action(async (_options, command: Command) => {
    const client = createHostClient({ baseUrl: resolveHostUrl(command) });
    printJson(await client.listNodes());
  });

hostNodesCommand
  .command("get")
  .argument("<nodeId>", "Node identifier in the active graph.")
  .description("Inspect one applied non-user node binding.")
  .action(async (nodeId: string, _options, command: Command) => {
    const client = createHostClient({ baseUrl: resolveHostUrl(command) });
    printJson(await client.getNode(nodeId));
  });

hostNodesCommand
  .command("add")
  .argument("<file>", "Path to a managed node JSON file.")
  .description("Create one managed non-user node in the active graph.")
  .action(async (file: string, _options, command: Command) => {
    const client = createHostClient({ baseUrl: resolveHostUrl(command) });
    printJson(
      await client.createNode(
        nodeCreateRequestSchema.parse(await readJsonDocument(path.resolve(file)))
      )
    );
  });

hostNodesCommand
  .command("replace")
  .argument("<nodeId>", "Node identifier in the active graph.")
  .argument("<file>", "Path to a managed-node replacement JSON file.")
  .description(
    "Replace one managed non-user node binding in the active graph without renaming the node id."
  )
  .action(async (nodeId: string, file: string, _options, command: Command) => {
    const client = createHostClient({ baseUrl: resolveHostUrl(command) });
    printJson(
      await client.replaceNode(
        nodeId,
        nodeReplacementRequestSchema.parse(
          await readJsonDocument(path.resolve(file))
        )
      )
    );
  });

hostNodesCommand
  .command("delete")
  .argument("<nodeId>", "Node identifier in the active graph.")
  .description(
    "Delete one managed non-user node from the active graph. This fails if graph edges still reference the node."
  )
  .action(async (nodeId: string, _options, command: Command) => {
    const client = createHostClient({ baseUrl: resolveHostUrl(command) });
    printJson(await client.deleteNode(nodeId));
  });

const hostEdgesCommand = hostCommand
  .command("edges")
  .description("Inspect and mutate applied graph edges through entangle-host.");

hostEdgesCommand
  .command("list")
  .description("List applied edges for the active graph.")
  .action(async (_options, command: Command) => {
    const client = createHostClient({ baseUrl: resolveHostUrl(command) });
    printJson(await client.listEdges());
  });

hostEdgesCommand
  .command("add")
  .argument("<file>", "Path to an edge JSON file.")
  .description("Create one edge in the active graph.")
  .action(async (file: string, _options, command: Command) => {
    const client = createHostClient({ baseUrl: resolveHostUrl(command) });
    printJson(
      await client.createEdge(
        edgeCreateRequestSchema.parse(await readJsonDocument(path.resolve(file)))
      )
    );
  });

hostEdgesCommand
  .command("replace")
  .argument("<edgeId>", "Edge identifier in the active graph.")
  .argument("<file>", "Path to an edge replacement JSON file.")
  .description("Replace one edge in the active graph without renaming the edge id.")
  .action(async (edgeId: string, file: string, _options, command: Command) => {
    const client = createHostClient({ baseUrl: resolveHostUrl(command) });
    printJson(
      await client.replaceEdge(
        edgeId,
        edgeReplacementRequestSchema.parse(
          await readJsonDocument(path.resolve(file))
        )
      )
    );
  });

hostEdgesCommand
  .command("delete")
  .argument("<edgeId>", "Edge identifier in the active graph.")
  .description("Delete one edge from the active graph.")
  .action(async (edgeId: string, _options, command: Command) => {
    const client = createHostClient({ baseUrl: resolveHostUrl(command) });
    printJson(await client.deleteEdge(edgeId));
  });

const hostRuntimesCommand = hostCommand
  .command("runtimes")
  .description("Inspect and mutate desired runtime state through entangle-host.");

hostRuntimesCommand
  .command("list")
  .description("List runtime inspections for the active graph.")
  .action(async (_options, command: Command) => {
    const client = createHostClient({ baseUrl: resolveHostUrl(command) });
    printJson(await client.listRuntimes());
  });

hostRuntimesCommand
  .command("get")
  .argument("<nodeId>", "Node identifier in the active graph.")
  .description("Inspect one runtime in the active graph.")
  .action(async (nodeId: string, _options, command: Command) => {
    const client = createHostClient({ baseUrl: resolveHostUrl(command) });
    printJson(await client.getRuntime(nodeId));
  });

hostRuntimesCommand
  .command("context")
  .argument("<nodeId>", "Node identifier in the active graph.")
  .description("Print the effective runtime context for one runtime.")
  .action(async (nodeId: string, _options, command: Command) => {
    const client = createHostClient({ baseUrl: resolveHostUrl(command) });
    printJson(await client.getRuntimeContext(nodeId));
  });

hostRuntimesCommand
  .command("recovery")
  .argument("<nodeId>", "Node identifier in the active graph.")
  .option("--limit <n>", "Maximum number of recovery records to return.", "50")
  .description("Inspect persisted runtime recovery history for one runtime.")
  .action(
    async (
      nodeId: string,
      options: {
        limit: string;
      },
      command: Command
    ) => {
      const client = createHostClient({ baseUrl: resolveHostUrl(command) });
      printJson(await client.getRuntimeRecovery(nodeId, Number.parseInt(options.limit, 10)));
    }
  );

hostRuntimesCommand
  .command("recovery-policy")
  .argument("<nodeId>", "Node identifier in the active graph.")
  .argument("<file>", "Path to a runtime recovery policy JSON file.")
  .description("Apply one runtime recovery policy through entangle-host.")
  .action(async (nodeId: string, file: string, _options, command: Command) => {
    const client = createHostClient({ baseUrl: resolveHostUrl(command) });
    printJson(
      await client.setRuntimeRecoveryPolicy(
        nodeId,
        runtimeRecoveryPolicyMutationRequestSchema.parse(
          await readJsonDocument(path.resolve(file))
        )
      )
    );
  });

hostRuntimesCommand
  .command("start")
  .argument("<nodeId>", "Node identifier in the active graph.")
  .description("Set one runtime's desired state to running.")
  .action(async (nodeId: string, _options, command: Command) => {
    const client = createHostClient({ baseUrl: resolveHostUrl(command) });
    printJson(await client.startRuntime(nodeId));
  });

hostRuntimesCommand
  .command("stop")
  .argument("<nodeId>", "Node identifier in the active graph.")
  .description("Set one runtime's desired state to stopped.")
  .action(async (nodeId: string, _options, command: Command) => {
    const client = createHostClient({ baseUrl: resolveHostUrl(command) });
    printJson(await client.stopRuntime(nodeId));
  });

hostRuntimesCommand
  .command("restart")
  .argument("<nodeId>", "Node identifier in the active graph.")
  .description("Request deterministic runtime recreation while keeping the desired state running.")
  .action(async (nodeId: string, _options, command: Command) => {
    const client = createHostClient({ baseUrl: resolveHostUrl(command) });
    printJson(await client.restartRuntime(nodeId));
  });

const hostSessionsCommand = hostCommand
  .command("sessions")
  .description("Inspect persisted runtime sessions through entangle-host.");

hostSessionsCommand
  .command("list")
  .description("List aggregated persisted sessions across the current host runtimes.")
  .action(async (_options, command: Command) => {
    const client = createHostClient({ baseUrl: resolveHostUrl(command) });
    printJson(await client.listSessions());
  });

hostSessionsCommand
  .command("get")
  .argument("<sessionId>", "Session identifier in the current host runtime state.")
  .description("Inspect one persisted session aggregated across participating nodes.")
  .action(async (sessionId: string, _options, command: Command) => {
    const client = createHostClient({ baseUrl: resolveHostUrl(command) });
    printJson(await client.getSession(sessionId));
  });

const graphCommand = program
  .command("graph")
  .description("Inspect graph files from the terminal.");

graphCommand
  .command("inspect")
  .argument("<file>", "Path to a graph JSON file.")
  .description("Run offline validation and print the result for a graph file.")
  .action(async (file: string) => {
    const report = await validateGraphFile(path.resolve(file));
    console.log(formatValidationReport(report));
    process.exitCode = report.ok ? 0 : 1;
  });

await program.parseAsync(process.argv);

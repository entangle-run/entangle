import { readFile } from "node:fs/promises";
import path from "node:path";
import { Command } from "commander";
import { createHostClient } from "@entangle/host-client";
import { createAgentPackageScaffold } from "@entangle/package-scaffold";
import {
  edgeCreateRequestSchema,
  edgeReplacementRequestSchema,
  externalPrincipalMutationRequestSchema,
  nodeCreateRequestSchema,
  nodeReplacementRequestSchema
} from "@entangle/types";
import {
  formatValidationReport,
  validateGraphFile,
  validatePackageDirectory
} from "@entangle/validator";

async function readJsonDocument(filePath: string): Promise<unknown> {
  return JSON.parse(await readFile(filePath, "utf8")) as unknown;
}

function printJson(value: unknown): void {
  console.log(JSON.stringify(value, null, 2));
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
  .command("admit")
  .argument("<directory>", "Absolute or relative path to an AgentPackage directory.")
  .description("Admit a local package directory into entangle-host desired state.")
  .action(async (directory: string, _options, command: Command) => {
    const client = createHostClient({ baseUrl: resolveHostUrl(command) });
    printJson(
      await client.admitPackageSource({
        sourceKind: "local_path",
        absolutePath: path.resolve(directory)
      })
    );
  });

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

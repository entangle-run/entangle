import { readFile } from "node:fs/promises";
import path from "node:path";
import { Command } from "commander";
import { createHostClient } from "@entangle/host-client";
import { createAgentPackageScaffold } from "@entangle/package-scaffold";
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

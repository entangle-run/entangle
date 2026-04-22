import path from "node:path";
import { Command } from "commander";
import { createHostClient } from "@entangle/host-client";
import { createAgentPackageScaffold } from "@entangle/package-scaffold";
import {
  formatValidationReport,
  validateGraphFile,
  validatePackageDirectory
} from "@entangle/validator";

const program = new Command();

program
  .name("entangle")
  .description("Thin CLI surface over Entangle validators, package scaffolding, and host inspection.")
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
    console.log(JSON.stringify(result, null, 2));
  });

const hostCommand = program
  .command("host")
  .description("Interact with a running entangle-host.");

hostCommand
  .command("status")
  .description("Fetch the current status from a running entangle-host.")
  .option(
    "--host-url <url>",
    "Base URL for entangle-host.",
    process.env.ENTANGLE_HOST_URL ?? "http://localhost:7071"
  )
  .action(async (options: { hostUrl: string }) => {
    const client = createHostClient({ baseUrl: options.hostUrl });
    const status = await client.getHostStatus();
    console.log(JSON.stringify(status, null, 2));
  });

const graphCommand = program
  .command("graph")
  .description("Inspect graph files from the terminal.");

graphCommand
  .command("inspect")
  .argument("<file>", "Path to a graph JSON file.")
  .description("Run validation and print the result for a graph file.")
  .action(async (file: string) => {
    const report = await validateGraphFile(path.resolve(file));
    console.log(formatValidationReport(report));
    process.exitCode = report.ok ? 0 : 1;
  });

await program.parseAsync(process.argv);

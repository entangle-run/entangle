import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { AgentPackageManifest, NodeKind } from "@entangle/types";

export interface CreateAgentPackageOptions {
  defaultNodeKind?: NodeKind;
  name?: string;
  packageId?: string;
}

export interface CreatedPackageScaffold {
  manifest: AgentPackageManifest;
  targetDirectory: string;
  writtenFiles: string[];
}

function toIdentifier(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

async function writeTextFile(filePath: string, contents: string): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, contents, "utf8");
}

export async function createAgentPackageScaffold(
  targetDirectory: string,
  options: CreateAgentPackageOptions = {}
): Promise<CreatedPackageScaffold> {
  const packageName = options.name ?? path.basename(targetDirectory);
  const packageId = options.packageId ?? toIdentifier(packageName);
  const defaultNodeKind = options.defaultNodeKind ?? "worker";

  const manifest: AgentPackageManifest = {
    schemaVersion: "1",
    packageId,
    name: packageName,
    version: "0.1.0",
    packageKind: "template",
    defaultNodeKind,
    capabilities: [],
    entryPrompts: {
      system: "prompts/system.md",
      interaction: "prompts/interaction.md"
    },
    memoryProfile: {
      wikiSeedPath: "memory/seed/wiki",
      schemaPath: "memory/schema/AGENTS.md"
    },
    runtime: {
      configPath: "runtime/config.json",
      capabilitiesPath: "runtime/capabilities.json",
      toolsPath: "runtime/tools.json"
    },
    metadata: {
      description: `${packageName} agent package scaffold.`,
      tags: []
    }
  };

  const fileMap = new Map<string, string>([
    [
      "manifest.json",
      `${JSON.stringify(manifest, null, 2)}\n`
    ],
    [
      "identity/profile.md",
      `# ${packageName}\n\n- Package id: \`${packageId}\`\n- Default node kind: \`${defaultNodeKind}\`\n`
    ],
    [
      "identity/role.md",
      "# Role\n\nDescribe what this agent is responsible for inside an Entangle graph.\n"
    ],
    [
      "prompts/system.md",
      "# System Prompt\n\nYou are an Entangle node. Follow your role, preserve artifact discipline, and communicate through the runner contract.\n"
    ],
    [
      "prompts/interaction.md",
      "# Interaction Prompt\n\nRespond to incoming tasks with explicit coordination, artifact awareness, and bounded follow-up behavior.\n"
    ],
    [
      "runtime/config.json",
      `${JSON.stringify(
        {
          runtimeProfile: "hackathon_local",
          toolBudget: {
            maxToolTurns: 8,
            maxOutputTokens: 4096
          }
        },
        null,
        2
      )}\n`
    ],
    [
      "runtime/capabilities.json",
      `${JSON.stringify(
        {
          capabilities: []
        },
        null,
        2
      )}\n`
    ],
    [
      "runtime/tools.json",
      `${JSON.stringify(
        {
          schemaVersion: "1",
          tools: []
        },
        null,
        2
      )}\n`
    ],
    [
      "memory/seed/wiki/index.md",
      "# Wiki Index\n\n- Create topic pages here as the agent accumulates working knowledge.\n"
    ],
    [
      "memory/seed/wiki/log.md",
      "# Wiki Log\n\n## Bootstrap\n\nInitialized the package scaffold.\n"
    ],
    [
      "memory/schema/AGENTS.md",
      "# Package Memory Rules\n\nMaintain the wiki as persistent working memory. Keep summaries concise, cross-link useful knowledge, and do not store secrets in markdown.\n"
    ]
  ]);

  const writtenFiles: string[] = [];

  for (const [relativePath, contents] of fileMap) {
    const absolutePath = path.join(targetDirectory, relativePath);
    await writeTextFile(absolutePath, contents);
    writtenFiles.push(relativePath);
  }

  return {
    manifest,
    targetDirectory,
    writtenFiles
  };
}

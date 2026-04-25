import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  agentPackageManifestSchema,
  type AgentPackageManifest,
  type NodeKind
} from "@entangle/types";

export interface CreateAgentPackageOptions {
  defaultNodeKind?: NodeKind;
  name?: string;
  overwrite?: boolean;
  packageId?: string;
}

export interface CreatedPackageScaffold {
  manifest: AgentPackageManifest;
  targetDirectory: string;
  writtenFiles: string[];
}

export class AgentPackageScaffoldConflictError extends Error {
  readonly filePath: string;
  readonly relativePath: string;

  constructor(relativePath: string, filePath: string) {
    super(
      `AgentPackage scaffold target already contains '${relativePath}'. Pass overwrite=true only when replacing generated scaffold files intentionally.`
    );
    this.name = "AgentPackageScaffoldConflictError";
    this.filePath = filePath;
    this.relativePath = relativePath;
  }
}

function toIdentifier(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function isFileAlreadyExistsError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "EEXIST"
  );
}

async function writeTextFile(
  filePath: string,
  relativePath: string,
  contents: string,
  overwrite: boolean
): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });

  try {
    await writeFile(filePath, contents, {
      encoding: "utf8",
      flag: overwrite ? "w" : "wx"
    });
  } catch (error: unknown) {
    if (!overwrite && isFileAlreadyExistsError(error)) {
      throw new AgentPackageScaffoldConflictError(relativePath, filePath);
    }

    throw error;
  }
}

export async function createAgentPackageScaffold(
  targetDirectory: string,
  options: CreateAgentPackageOptions = {}
): Promise<CreatedPackageScaffold> {
  const packageName = options.name ?? path.basename(targetDirectory);
  const packageId = options.packageId ?? toIdentifier(packageName);
  const defaultNodeKind = options.defaultNodeKind ?? "worker";
  const overwrite = options.overwrite ?? false;

  const manifest: AgentPackageManifest = agentPackageManifestSchema.parse({
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
  });

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
          runtimeProfile: "local",
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
    await writeTextFile(absolutePath, relativePath, contents, overwrite);
    writtenFiles.push(relativePath);
  }

  return {
    manifest,
    targetDirectory,
    writtenFiles
  };
}

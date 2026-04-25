import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import {
  agentPackageManifestSchema,
  packageToolCatalogSchema,
  type AgentPackageManifest,
  type ValidationFinding,
  type ValidationReport
} from "@entangle/types";
import { validatePackageDirectory } from "@entangle/validator";

export type PackagePathInspection = {
  byteLength?: number;
  exists: boolean;
  pathKind?: "directory" | "file" | "other";
  relativePath: string;
  role: string;
};

export type PackageToolCatalogInspection = {
  exists: boolean;
  path: string;
  toolCount?: number;
  toolIds?: string[];
  valid?: boolean;
};

export type PackageInspection = {
  directoryPath: string;
  files: PackagePathInspection[];
  manifest?: {
    capabilities: string[];
    defaultNodeKind: string;
    name: string;
    packageId: string;
    packageKind: string;
    tags: string[];
    version: string;
  };
  parseErrors: string[];
  toolCatalog?: PackageToolCatalogInspection;
  validation: {
    errorCount: number;
    findingCodes: string[];
    findings: ValidationFinding[];
    findingCount: number;
    ok: boolean;
    warningCount: number;
  };
};

async function readJsonFile(filePath: string): Promise<unknown> {
  return JSON.parse(await readFile(filePath, "utf8")) as unknown;
}

function summarizeValidation(report: ValidationReport): PackageInspection["validation"] {
  return {
    errorCount: report.findings.filter((finding) => finding.severity === "error")
      .length,
    findingCodes: report.findings.map((finding) => finding.code),
    findings: report.findings,
    findingCount: report.findings.length,
    ok: report.ok,
    warningCount: report.findings.filter(
      (finding) => finding.severity === "warning"
    ).length
  };
}

async function inspectRelativePath(input: {
  directoryPath: string;
  relativePath: string;
  role: string;
}): Promise<PackagePathInspection> {
  try {
    const pathStat = await stat(
      path.join(input.directoryPath, input.relativePath)
    );
    const pathKind = pathStat.isFile()
      ? "file"
      : pathStat.isDirectory()
        ? "directory"
        : "other";

    return {
      ...(pathStat.isFile() ? { byteLength: pathStat.size } : {}),
      exists: true,
      pathKind,
      relativePath: input.relativePath,
      role: input.role
    };
  } catch {
    return {
      exists: false,
      relativePath: input.relativePath,
      role: input.role
    };
  }
}

function uniquePackagePaths(
  paths: { relativePath: string; role: string }[]
): { relativePath: string; role: string }[] {
  const seen = new Set<string>();

  return paths.filter((entry) => {
    if (seen.has(entry.relativePath)) {
      return false;
    }

    seen.add(entry.relativePath);
    return true;
  });
}

function buildManifestPathList(
  manifest: AgentPackageManifest
): { relativePath: string; role: string }[] {
  return uniquePackagePaths([
    {
      relativePath: "manifest.json",
      role: "manifest"
    },
    {
      relativePath: manifest.entryPrompts.system,
      role: "system_prompt"
    },
    {
      relativePath: manifest.entryPrompts.interaction,
      role: "interaction_prompt"
    },
    {
      relativePath: manifest.runtime.configPath,
      role: "runtime_config"
    },
    {
      relativePath: manifest.runtime.capabilitiesPath,
      role: "runtime_capabilities"
    },
    {
      relativePath: manifest.runtime.toolsPath,
      role: "runtime_tools"
    },
    {
      relativePath: manifest.memoryProfile.schemaPath,
      role: "memory_schema"
    },
    {
      relativePath: manifest.memoryProfile.wikiSeedPath,
      role: "memory_seed"
    }
  ]);
}

async function inspectToolCatalog(input: {
  directoryPath: string;
  manifest: AgentPackageManifest;
}): Promise<PackageToolCatalogInspection> {
  const toolPath = input.manifest.runtime.toolsPath;
  const absoluteToolPath = path.join(input.directoryPath, toolPath);

  try {
    await stat(absoluteToolPath);
  } catch {
    return {
      exists: false,
      path: toolPath
    };
  }

  try {
    const parseResult = packageToolCatalogSchema.safeParse(
      await readJsonFile(absoluteToolPath)
    );

    if (!parseResult.success) {
      return {
        exists: true,
        path: toolPath,
        valid: false
      };
    }

    return {
      exists: true,
      path: toolPath,
      toolCount: parseResult.data.tools.length,
      toolIds: parseResult.data.tools.map((tool) => tool.id),
      valid: true
    };
  } catch {
    return {
      exists: true,
      path: toolPath,
      valid: false
    };
  }
}

export async function inspectPackageDirectory(
  directoryPath: string
): Promise<PackageInspection> {
  const validationReport = await validatePackageDirectory(directoryPath);
  const parseErrors: string[] = [];
  let manifest: AgentPackageManifest | undefined;

  try {
    const parseResult = agentPackageManifestSchema.safeParse(
      await readJsonFile(path.join(directoryPath, "manifest.json"))
    );

    if (parseResult.success) {
      manifest = parseResult.data;
    } else {
      parseErrors.push("manifest.json does not match the AgentPackage schema.");
    }
  } catch (error: unknown) {
    parseErrors.push(
      error instanceof Error
        ? `manifest.json could not be read: ${error.message}`
        : "manifest.json could not be read."
    );
  }

  const files =
    manifest === undefined
      ? [
          await inspectRelativePath({
            directoryPath,
            relativePath: "manifest.json",
            role: "manifest"
          })
        ]
      : await Promise.all(
          buildManifestPathList(manifest).map((entry) =>
            inspectRelativePath({
              directoryPath,
              relativePath: entry.relativePath,
              role: entry.role
            })
          )
        );

  return {
    directoryPath,
    files,
    ...(manifest
      ? {
          manifest: {
            capabilities: manifest.capabilities,
            defaultNodeKind: manifest.defaultNodeKind,
            name: manifest.name,
            packageId: manifest.packageId,
            packageKind: manifest.packageKind,
            tags: manifest.metadata.tags,
            version: manifest.version
          },
          toolCatalog: await inspectToolCatalog({
            directoryPath,
            manifest
          })
        }
      : {}),
    parseErrors,
    validation: summarizeValidation(validationReport)
  };
}

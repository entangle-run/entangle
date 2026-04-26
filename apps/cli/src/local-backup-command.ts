import {
  copyFile,
  lstat,
  mkdir,
  readdir,
  readFile,
  readlink,
  rm,
  symlink,
  writeFile
} from "node:fs/promises";
import path from "node:path";
import {
  currentLocalStateLayoutVersion,
  localStateLayoutRecordSchema,
  minimumSupportedLocalStateLayoutVersion,
  type LocalStateLayoutInspection
} from "@entangle/types";

export interface LocalBackupOptions {
  force?: boolean | undefined;
  now?: (() => Date) | undefined;
  outputPath: string;
  repositoryRoot: string;
}

export interface LocalRestoreOptions {
  dryRun?: boolean | undefined;
  force?: boolean | undefined;
  inputPath: string;
  now?: (() => Date) | undefined;
  repositoryRoot: string;
}

export interface LocalBackupCopyStats {
  bytes: number;
  directories: number;
  files: number;
  skipped: string[];
  symlinks: number;
}

export interface LocalBackupManifest {
  config: {
    includedPaths: string[];
    missingPaths: string[];
    path: "config";
  };
  createdAt: string;
  exclusions: {
    externalState: string[];
    paths: string[];
    secretsIncluded: false;
  };
  product: "entangle-local-backup";
  repository: {
    packageName: string;
    packageVersion: string;
  };
  restore: {
    stateTargetPath: ".entangle/host";
  };
  schemaVersion: "1";
  state: {
    layout: {
      currentLayoutVersion: number;
      minimumSupportedLayoutVersion: number;
      recordedAt?: string | undefined;
      recordedLayoutVersion?: number | undefined;
      status: LocalStateLayoutInspection["status"];
    };
    originalPath: ".entangle/host";
    path: "state/host";
    stats: LocalBackupCopyStats;
  };
}

export interface LocalBackupSummary {
  configIncludedPathCount: number;
  configMissingPathCount: number;
  createdAt: string;
  manifestPath: string;
  outputPath: string;
  stateLayoutStatus: LocalStateLayoutInspection["status"];
  stateLayoutVersion?: number | undefined;
  stateStats: LocalBackupCopyStats;
}

export interface LocalRestoreSummary {
  dryRun: boolean;
  inputPath: string;
  inspectedAt: string;
  restored: boolean;
  stateLayoutStatus: LocalStateLayoutInspection["status"];
  stateLayoutVersion?: number | undefined;
  stateStats: LocalBackupCopyStats;
  targetPath: string;
  warnings: string[];
}

const manifestFileName = "manifest.json";
const backupStatePath = "state/host";
const backupConfigPath = "config";
const localHostStatePath = ".entangle/host";
const localSecretsPath = ".entangle-secrets";

const localBackupConfigPaths = [
  "package.json",
  "pnpm-lock.yaml",
  "deploy/local/compose/docker-compose.local.yml",
  "deploy/local/config/nginx.studio.conf",
  "deploy/local/config/strfry.local.conf",
  "deploy/local/docker/host.Dockerfile",
  "deploy/local/docker/runner.Dockerfile",
  "deploy/local/docker/studio.Dockerfile"
];

function emptyCopyStats(): LocalBackupCopyStats {
  return {
    bytes: 0,
    directories: 0,
    files: 0,
    skipped: [],
    symlinks: 0
  };
}

function mergeCopyStats(
  target: LocalBackupCopyStats,
  source: LocalBackupCopyStats
): LocalBackupCopyStats {
  target.bytes += source.bytes;
  target.directories += source.directories;
  target.files += source.files;
  target.skipped.push(...source.skipped);
  target.symlinks += source.symlinks;
  return target;
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await lstat(filePath);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return false;
    }

    throw error;
  }
}

async function readJsonFile(filePath: string): Promise<unknown> {
  return JSON.parse(await readFile(filePath, "utf8")) as unknown;
}

async function writeJsonFile(filePath: string, value: unknown): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function isSafeRelativePath(inputPath: string): boolean {
  return (
    inputPath.length > 0 &&
    !path.isAbsolute(inputPath) &&
    !inputPath.split(/[\\/]+/u).includes("..")
  );
}

function resolveSafeBundlePath(bundleRoot: string, relativePath: string): string {
  if (!isSafeRelativePath(relativePath)) {
    throw new Error(`Backup manifest contains unsafe relative path '${relativePath}'.`);
  }

  return path.resolve(bundleRoot, relativePath);
}

function classifyLocalStateLayoutRecord(
  rawRecord: unknown
): Pick<
  LocalBackupManifest["state"]["layout"],
  | "currentLayoutVersion"
  | "minimumSupportedLayoutVersion"
  | "recordedAt"
  | "recordedLayoutVersion"
  | "status"
> {
  const parseResult = localStateLayoutRecordSchema.safeParse(rawRecord);

  if (!parseResult.success) {
    return {
      currentLayoutVersion: currentLocalStateLayoutVersion,
      minimumSupportedLayoutVersion: minimumSupportedLocalStateLayoutVersion,
      status: "unreadable"
    };
  }

  const record = parseResult.data;
  if (record.layoutVersion > currentLocalStateLayoutVersion) {
    return {
      currentLayoutVersion: currentLocalStateLayoutVersion,
      minimumSupportedLayoutVersion: minimumSupportedLocalStateLayoutVersion,
      recordedAt: record.updatedAt,
      recordedLayoutVersion: record.layoutVersion,
      status: "unsupported_future"
    };
  }

  if (record.layoutVersion < minimumSupportedLocalStateLayoutVersion) {
    return {
      currentLayoutVersion: currentLocalStateLayoutVersion,
      minimumSupportedLayoutVersion: minimumSupportedLocalStateLayoutVersion,
      recordedAt: record.updatedAt,
      recordedLayoutVersion: record.layoutVersion,
      status: "unsupported_legacy"
    };
  }

  if (record.layoutVersion < currentLocalStateLayoutVersion) {
    return {
      currentLayoutVersion: currentLocalStateLayoutVersion,
      minimumSupportedLayoutVersion: minimumSupportedLocalStateLayoutVersion,
      recordedAt: record.updatedAt,
      recordedLayoutVersion: record.layoutVersion,
      status: "upgrade_available"
    };
  }

  return {
    currentLayoutVersion: currentLocalStateLayoutVersion,
    minimumSupportedLayoutVersion: minimumSupportedLocalStateLayoutVersion,
    recordedAt: record.updatedAt,
    recordedLayoutVersion: record.layoutVersion,
    status: "current"
  };
}

async function inspectLocalStateLayout(
  hostStatePath: string
): Promise<LocalBackupManifest["state"]["layout"]> {
  const layoutPath = path.join(hostStatePath, "state-layout.json");

  if (!(await pathExists(layoutPath))) {
    return {
      currentLayoutVersion: currentLocalStateLayoutVersion,
      minimumSupportedLayoutVersion: minimumSupportedLocalStateLayoutVersion,
      status: "missing"
    };
  }

  try {
    return classifyLocalStateLayoutRecord(await readJsonFile(layoutPath));
  } catch {
    return {
      currentLayoutVersion: currentLocalStateLayoutVersion,
      minimumSupportedLayoutVersion: minimumSupportedLocalStateLayoutVersion,
      status: "unreadable"
    };
  }
}

async function copyEntryVerbatim(input: {
  relativePath?: string | undefined;
  sourcePath: string;
  targetPath: string;
}): Promise<LocalBackupCopyStats> {
  const entry = await lstat(input.sourcePath);
  const stats = emptyCopyStats();

  if (entry.isSymbolicLink()) {
    await mkdir(path.dirname(input.targetPath), { recursive: true });
    await symlink(await readlink(input.sourcePath), input.targetPath);
    stats.symlinks += 1;
    return stats;
  }

  if (entry.isDirectory()) {
    await mkdir(input.targetPath, { recursive: true });
    stats.directories += 1;

    const childEntries = await readdir(input.sourcePath, {
      withFileTypes: true
    });

    for (const childEntry of childEntries) {
      const childRelativePath = input.relativePath
        ? path.join(input.relativePath, childEntry.name)
        : childEntry.name;
      mergeCopyStats(
        stats,
        await copyEntryVerbatim({
          relativePath: childRelativePath,
          sourcePath: path.join(input.sourcePath, childEntry.name),
          targetPath: path.join(input.targetPath, childEntry.name)
        })
      );
    }

    return stats;
  }

  if (entry.isFile()) {
    await mkdir(path.dirname(input.targetPath), { recursive: true });
    await copyFile(input.sourcePath, input.targetPath);
    stats.bytes += entry.size;
    stats.files += 1;
    return stats;
  }

  stats.skipped.push(input.relativePath ?? path.basename(input.sourcePath));
  return stats;
}

async function copyConfigSnapshot(input: {
  repositoryRoot: string;
  targetRoot: string;
}): Promise<{ includedPaths: string[]; missingPaths: string[] }> {
  const includedPaths: string[] = [];
  const missingPaths: string[] = [];

  for (const relativePath of localBackupConfigPaths) {
    const sourcePath = path.join(input.repositoryRoot, relativePath);

    if (!(await pathExists(sourcePath))) {
      missingPaths.push(relativePath);
      continue;
    }

    const sourceStats = await lstat(sourcePath);
    if (!sourceStats.isFile()) {
      missingPaths.push(relativePath);
      continue;
    }

    const targetPath = path.join(input.targetRoot, relativePath);
    await mkdir(path.dirname(targetPath), { recursive: true });
    await copyFile(sourcePath, targetPath);
    includedPaths.push(relativePath);
  }

  return {
    includedPaths,
    missingPaths
  };
}

async function readRepositoryPackageMetadata(repositoryRoot: string): Promise<{
  packageName: string;
  packageVersion: string;
}> {
  try {
    const packageJson = (await readJsonFile(
      path.join(repositoryRoot, "package.json")
    )) as { name?: unknown; version?: unknown };

    return {
      packageName:
        typeof packageJson.name === "string" ? packageJson.name : "entangle",
      packageVersion:
        typeof packageJson.version === "string" ? packageJson.version : "unknown"
    };
  } catch {
    return {
      packageName: "entangle",
      packageVersion: "unknown"
    };
  }
}

function validateBackupManifest(rawManifest: unknown): LocalBackupManifest {
  if (!rawManifest || typeof rawManifest !== "object") {
    throw new Error("Backup manifest is not a JSON object.");
  }

  const manifest = rawManifest as Partial<LocalBackupManifest>;
  if (
    manifest.schemaVersion !== "1" ||
    manifest.product !== "entangle-local-backup"
  ) {
    throw new Error(
      "Backup manifest is not an Entangle local profile backup manifest."
    );
  }

  if (
    manifest.state?.path !== backupStatePath ||
    manifest.restore?.stateTargetPath !== localHostStatePath
  ) {
    throw new Error("Backup manifest does not describe a supported Local state bundle.");
  }

  if (manifest.exclusions?.secretsIncluded !== false) {
    throw new Error("Backup manifest does not explicitly exclude local secrets.");
  }

  return manifest as LocalBackupManifest;
}

function assertRestorableLayout(
  layout: LocalBackupManifest["state"]["layout"]
): void {
  if (layout.status === "current" || layout.status === "upgrade_available") {
    return;
  }

  throw new Error(
    `Cannot restore Entangle local profile backup with state layout status '${layout.status}'.`
  );
}

export async function createLocalBackup(
  options: LocalBackupOptions
): Promise<LocalBackupSummary> {
  const createdAt = (options.now ?? (() => new Date()))().toISOString();
  const outputPath = path.resolve(options.outputPath);
  const hostStatePath = path.join(options.repositoryRoot, localHostStatePath);
  const stateBundlePath = path.join(outputPath, backupStatePath);
  const configBundlePath = path.join(outputPath, backupConfigPath);

  if (!(await pathExists(hostStatePath))) {
    throw new Error(
      "Cannot create Entangle local profile backup because .entangle/host does not exist."
    );
  }

  if (await pathExists(outputPath)) {
    if (!options.force) {
      throw new Error(
        `Backup output path '${outputPath}' already exists. Use --force to replace it.`
      );
    }

    await rm(outputPath, { force: true, recursive: true });
  }

  await mkdir(outputPath, { recursive: true });
  await mkdir(configBundlePath, { recursive: true });

  const stateStats = await copyEntryVerbatim({
    sourcePath: hostStatePath,
    targetPath: stateBundlePath
  });
  const config = await copyConfigSnapshot({
    repositoryRoot: options.repositoryRoot,
    targetRoot: configBundlePath
  });
  const layout = await inspectLocalStateLayout(stateBundlePath);
  const manifest: LocalBackupManifest = {
    config: {
      ...config,
      path: backupConfigPath
    },
    createdAt,
    exclusions: {
      externalState: [
        "Docker containers",
        "Docker volumes",
        "Gitea service data outside .entangle/host",
        "strfry relay data outside .entangle/host"
      ],
      paths: [localSecretsPath],
      secretsIncluded: false
    },
    product: "entangle-local-backup",
    repository: await readRepositoryPackageMetadata(options.repositoryRoot),
    restore: {
      stateTargetPath: localHostStatePath
    },
    schemaVersion: "1",
    state: {
      layout,
      originalPath: localHostStatePath,
      path: backupStatePath,
      stats: stateStats
    }
  };
  const manifestPath = path.join(outputPath, manifestFileName);
  await writeJsonFile(manifestPath, manifest);

  return {
    configIncludedPathCount: config.includedPaths.length,
    configMissingPathCount: config.missingPaths.length,
    createdAt,
    manifestPath,
    outputPath,
    stateLayoutStatus: layout.status,
    stateLayoutVersion: layout.recordedLayoutVersion,
    stateStats
  };
}

export async function restoreLocalBackup(
  options: LocalRestoreOptions
): Promise<LocalRestoreSummary> {
  const inspectedAt = (options.now ?? (() => new Date()))().toISOString();
  const inputPath = path.resolve(options.inputPath);
  const manifest = validateBackupManifest(
    await readJsonFile(path.join(inputPath, manifestFileName))
  );
  const stateBundlePath = resolveSafeBundlePath(inputPath, manifest.state.path);
  const targetPath = path.join(options.repositoryRoot, localHostStatePath);
  const targetExists = await pathExists(targetPath);
  const layout = await inspectLocalStateLayout(stateBundlePath);
  const warnings = [
    "Local secrets are not included in Entangle local profile backups; restore or recreate .entangle-secrets separately if needed.",
    "External service state such as Docker volumes, Gitea internals, and relay data is not restored by this command."
  ];

  assertRestorableLayout(layout);

  if (!(await pathExists(stateBundlePath))) {
    throw new Error("Backup bundle is missing state/host.");
  }

  if (targetExists && !options.force && options.dryRun) {
    warnings.push("Current .entangle/host exists; actual restore would require --force.");
  }

  if (targetExists && !options.force && !options.dryRun) {
    throw new Error(
      `Target Local state '${targetPath}' already exists. Use --force to replace it.`
    );
  }

  if (!options.dryRun) {
    if (targetExists) {
      await rm(targetPath, { force: true, recursive: true });
    }

    await mkdir(path.dirname(targetPath), { recursive: true });
    await copyEntryVerbatim({
      sourcePath: stateBundlePath,
      targetPath
    });
  }

  return {
    dryRun: Boolean(options.dryRun),
    inputPath,
    inspectedAt,
    restored: !options.dryRun,
    stateLayoutStatus: layout.status,
    stateLayoutVersion: layout.recordedLayoutVersion,
    stateStats: manifest.state.stats,
    targetPath,
    warnings
  };
}

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
  currentStateLayoutVersion,
  stateLayoutRecordSchema,
  minimumSupportedStateLayoutVersion,
  type StateLayoutInspection
} from "@entangle/types";

export interface DeploymentBackupOptions {
  force?: boolean | undefined;
  now?: (() => Date) | undefined;
  outputPath: string;
  repositoryRoot: string;
}

export interface DeploymentRestoreOptions {
  dryRun?: boolean | undefined;
  force?: boolean | undefined;
  inputPath: string;
  now?: (() => Date) | undefined;
  repositoryRoot: string;
}

export interface DeploymentBackupCopyStats {
  bytes: number;
  directories: number;
  files: number;
  skipped: string[];
  symlinks: number;
}

export interface DeploymentBackupManifest {
  config: {
    includedPaths: string[];
    missingPaths: string[];
    path: "config";
  };
  createdAt: string;
  exclusions: {
    externalState: string[];
    externalVolumes: Array<{
      mountPath: string;
      service: string;
      volume: string;
    }>;
    paths: string[];
    secretsIncluded: false;
  };
  product: "entangle-backup";
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
      status: StateLayoutInspection["status"];
    };
    originalPath: ".entangle/host";
    path: "state/host";
    stats: DeploymentBackupCopyStats;
  };
}

export interface DeploymentBackupSummary {
  configIncludedPathCount: number;
  configMissingPathCount: number;
  createdAt: string;
  manifestPath: string;
  outputPath: string;
  stateLayoutStatus: StateLayoutInspection["status"];
  stateLayoutVersion?: number | undefined;
  stateStats: DeploymentBackupCopyStats;
}

export interface DeploymentRestoreSummary {
  dryRun: boolean;
  inputPath: string;
  inspectedAt: string;
  restored: boolean;
  stateLayoutStatus: StateLayoutInspection["status"];
  stateLayoutVersion?: number | undefined;
  stateStats: DeploymentBackupCopyStats;
  targetPath: string;
  warnings: string[];
}

const manifestFileName = "manifest.json";
const backupStatePath = "state/host";
const backupConfigPath = "config";
const hostStateRelativePath = ".entangle/host";
const secretsPath = ".entangle-secrets";
const excludedExternalVolumes = [
  {
    mountPath: "/data",
    service: "gitea",
    volume: "gitea-data"
  },
  {
    mountPath: "/app/strfry-db",
    service: "strfry",
    volume: "strfry-data"
  },
  {
    mountPath: "/entangle-secrets",
    service: "host",
    volume: "entangle-secret-state"
  }
] as const;

const deploymentBackupConfigPaths = [
  "package.json",
  "pnpm-lock.yaml",
  "deploy/federated-dev/compose/docker-compose.federated-dev.yml",
  "deploy/federated-dev/config/nginx.studio.conf",
  "deploy/federated-dev/config/strfry.federated-dev.conf",
  "deploy/federated-dev/docker/host.Dockerfile",
  "deploy/federated-dev/docker/runner.Dockerfile",
  "deploy/federated-dev/docker/studio.Dockerfile"
];

function emptyCopyStats(): DeploymentBackupCopyStats {
  return {
    bytes: 0,
    directories: 0,
    files: 0,
    skipped: [],
    symlinks: 0
  };
}

function mergeCopyStats(
  target: DeploymentBackupCopyStats,
  source: DeploymentBackupCopyStats
): DeploymentBackupCopyStats {
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

function classifyStateLayoutRecord(
  rawRecord: unknown
): Pick<
  DeploymentBackupManifest["state"]["layout"],
  | "currentLayoutVersion"
  | "minimumSupportedLayoutVersion"
  | "recordedAt"
  | "recordedLayoutVersion"
  | "status"
> {
  const parseResult = stateLayoutRecordSchema.safeParse(rawRecord);

  if (!parseResult.success) {
    return {
      currentLayoutVersion: currentStateLayoutVersion,
      minimumSupportedLayoutVersion: minimumSupportedStateLayoutVersion,
      status: "unreadable"
    };
  }

  const record = parseResult.data;
  if (record.layoutVersion > currentStateLayoutVersion) {
    return {
      currentLayoutVersion: currentStateLayoutVersion,
      minimumSupportedLayoutVersion: minimumSupportedStateLayoutVersion,
      recordedAt: record.updatedAt,
      recordedLayoutVersion: record.layoutVersion,
      status: "unsupported_future"
    };
  }

  if (record.layoutVersion < minimumSupportedStateLayoutVersion) {
    return {
      currentLayoutVersion: currentStateLayoutVersion,
      minimumSupportedLayoutVersion: minimumSupportedStateLayoutVersion,
      recordedAt: record.updatedAt,
      recordedLayoutVersion: record.layoutVersion,
      status: "unsupported_legacy"
    };
  }

  if (record.layoutVersion < currentStateLayoutVersion) {
    return {
      currentLayoutVersion: currentStateLayoutVersion,
      minimumSupportedLayoutVersion: minimumSupportedStateLayoutVersion,
      recordedAt: record.updatedAt,
      recordedLayoutVersion: record.layoutVersion,
      status: "upgrade_available"
    };
  }

  return {
    currentLayoutVersion: currentStateLayoutVersion,
    minimumSupportedLayoutVersion: minimumSupportedStateLayoutVersion,
    recordedAt: record.updatedAt,
    recordedLayoutVersion: record.layoutVersion,
    status: "current"
  };
}

async function inspectStateLayout(
  hostStatePath: string
): Promise<DeploymentBackupManifest["state"]["layout"]> {
  const layoutPath = path.join(hostStatePath, "state-layout.json");

  if (!(await pathExists(layoutPath))) {
    return {
      currentLayoutVersion: currentStateLayoutVersion,
      minimumSupportedLayoutVersion: minimumSupportedStateLayoutVersion,
      status: "missing"
    };
  }

  try {
    return classifyStateLayoutRecord(await readJsonFile(layoutPath));
  } catch {
    return {
      currentLayoutVersion: currentStateLayoutVersion,
      minimumSupportedLayoutVersion: minimumSupportedStateLayoutVersion,
      status: "unreadable"
    };
  }
}

async function copyEntryVerbatim(input: {
  relativePath?: string | undefined;
  sourcePath: string;
  targetPath: string;
}): Promise<DeploymentBackupCopyStats> {
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

  for (const relativePath of deploymentBackupConfigPaths) {
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

function validateBackupManifest(rawManifest: unknown): DeploymentBackupManifest {
  if (!rawManifest || typeof rawManifest !== "object") {
    throw new Error("Backup manifest is not a JSON object.");
  }

  const manifest = rawManifest as Partial<DeploymentBackupManifest>;
  if (
    manifest.schemaVersion !== "1" ||
    manifest.product !== "entangle-backup"
  ) {
    throw new Error(
      "Backup manifest is not an Entangle deployment profile backup manifest."
    );
  }

  if (
    manifest.state?.path !== backupStatePath ||
    manifest.restore?.stateTargetPath !== hostStateRelativePath
  ) {
    throw new Error("Backup manifest does not describe a supported Entangle state bundle.");
  }

  if (manifest.exclusions?.secretsIncluded !== false) {
    throw new Error("Backup manifest does not explicitly exclude Entangle secrets.");
  }

  return manifest as DeploymentBackupManifest;
}

function formatExternalVolumeWarning(
  volumes: DeploymentBackupManifest["exclusions"]["externalVolumes"] | undefined
): string {
  if (!Array.isArray(volumes) || volumes.length === 0) {
    return "No external service volume inventory was recorded in this backup manifest.";
  }

  const volumeList = volumes
    .map((volume) => `${volume.service}:${volume.volume}->${volume.mountPath}`)
    .join(", ");

  return `External service volumes are not restored by this command: ${volumeList}.`;
}

function assertRestorableLayout(
  layout: DeploymentBackupManifest["state"]["layout"]
): void {
  if (layout.status === "current" || layout.status === "upgrade_available") {
    return;
  }

  throw new Error(
    `Cannot restore Entangle deployment profile backup with state layout status '${layout.status}'.`
  );
}

export async function createDeploymentBackup(
  options: DeploymentBackupOptions
): Promise<DeploymentBackupSummary> {
  const createdAt = (options.now ?? (() => new Date()))().toISOString();
  const outputPath = path.resolve(options.outputPath);
  const hostStatePath = path.join(options.repositoryRoot, hostStateRelativePath);
  const stateBundlePath = path.join(outputPath, backupStatePath);
  const configBundlePath = path.join(outputPath, backupConfigPath);

  if (!(await pathExists(hostStatePath))) {
    throw new Error(
      "Cannot create Entangle deployment profile backup because .entangle/host does not exist."
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
  const layout = await inspectStateLayout(stateBundlePath);
  const manifest: DeploymentBackupManifest = {
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
      externalVolumes: [...excludedExternalVolumes],
      paths: [secretsPath],
      secretsIncluded: false
    },
    product: "entangle-backup",
    repository: await readRepositoryPackageMetadata(options.repositoryRoot),
    restore: {
      stateTargetPath: hostStateRelativePath
    },
    schemaVersion: "1",
    state: {
      layout,
      originalPath: hostStateRelativePath,
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

export async function restoreDeploymentBackup(
  options: DeploymentRestoreOptions
): Promise<DeploymentRestoreSummary> {
  const inspectedAt = (options.now ?? (() => new Date()))().toISOString();
  const inputPath = path.resolve(options.inputPath);
  const manifest = validateBackupManifest(
    await readJsonFile(path.join(inputPath, manifestFileName))
  );
  const stateBundlePath = resolveSafeBundlePath(inputPath, manifest.state.path);
  const targetPath = path.join(options.repositoryRoot, hostStateRelativePath);
  const targetExists = await pathExists(targetPath);
  const layout = await inspectStateLayout(stateBundlePath);
  const warnings = [
    "Entangle secrets are not included in Entangle deployment profile backups; restore or recreate .entangle-secrets separately if needed.",
    "External service state such as container volumes, Gitea internals, and relay data is not restored by this command.",
    formatExternalVolumeWarning(manifest.exclusions.externalVolumes)
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
      `Target Entangle state '${targetPath}' already exists. Use --force to replace it.`
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

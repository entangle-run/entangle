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
import { spawnSync, type SpawnSyncReturns } from "node:child_process";
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

type DeploymentServiceVolumeCommandResult = Pick<
  SpawnSyncReturns<string>,
  "error" | "signal" | "status" | "stderr" | "stdout"
>;

type DeploymentServiceVolumeCommandRunner = (
  command: string,
  args: string[],
  options: { cwd: string }
) => DeploymentServiceVolumeCommandResult;

export interface DeploymentServiceVolumeExportOptions {
  assumeServicesStopped?: boolean | undefined;
  commandRunner?: DeploymentServiceVolumeCommandRunner | undefined;
  dockerImage?: string | undefined;
  dryRun?: boolean | undefined;
  force?: boolean | undefined;
  now?: (() => Date) | undefined;
  outputPath: string;
  repositoryRoot: string;
}

export interface DeploymentServiceVolumeImportOptions {
  assumeServicesStopped?: boolean | undefined;
  commandRunner?: DeploymentServiceVolumeCommandRunner | undefined;
  dockerImage?: string | undefined;
  dryRun?: boolean | undefined;
  inputPath: string;
  now?: (() => Date) | undefined;
  repositoryRoot: string;
}

export interface DeploymentServiceVolumesStatusOptions {
  commandRunner?: DeploymentServiceVolumeCommandRunner | undefined;
  now?: (() => Date) | undefined;
  repositoryRoot: string;
}

export type DeploymentServiceVolumeMaintenanceAction = "start" | "stop";

export interface DeploymentServiceVolumeMaintenanceOptions {
  action: DeploymentServiceVolumeMaintenanceAction;
  apply?: boolean | undefined;
  commandRunner?: DeploymentServiceVolumeCommandRunner | undefined;
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
  externalVolumeCount: number;
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

export interface DeploymentServiceVolumeManifest {
  createdAt: string;
  dockerImage: string;
  product: "entangle-service-volume-backup";
  schemaVersion: "1";
  secretsIncluded: false;
  volumes: DeploymentServiceVolumeManifestEntry[];
}

export interface DeploymentServiceVolumeManifestEntry {
  archivePath: string;
  mountPath: string;
  service: string;
  volume: string;
}

export type DeploymentServiceVolumeOperationStatus =
  | "exported"
  | "imported"
  | "planned";

export interface DeploymentServiceVolumeOperationEntry {
  archivePath: string;
  archiveRelativePath: string;
  command: string[];
  mountPath: string;
  service: string;
  status: DeploymentServiceVolumeOperationStatus;
  volume: string;
}

export interface DeploymentServiceVolumeQuiescenceCheck {
  command: string[];
  runningContainers: string[];
  service: string;
  status: "clear";
  volume: string;
}

export type DeploymentServiceVolumeStatus =
  | "in_use"
  | "missing"
  | "ready"
  | "unavailable";

export interface DeploymentServiceVolumeStatusEntry {
  detail: string;
  exists: boolean;
  inspectCommand: string[];
  mountPath: string;
  runningContainers: string[];
  runningContainersCommand?: string[] | undefined;
  service: string;
  status: DeploymentServiceVolumeStatus;
  volume: string;
}

export interface DeploymentServiceVolumesStatusSummary {
  generatedAt: string;
  readyForExportImport: boolean;
  status: "blocked" | "ready";
  volumeCount: number;
  volumes: DeploymentServiceVolumeStatusEntry[];
}

export interface DeploymentServiceVolumeMaintenanceSummary {
  action: DeploymentServiceVolumeMaintenanceAction;
  applied: boolean;
  command: string[];
  generatedAt: string;
  serviceNames: string[];
  status: "applied" | "planned";
}

export interface DeploymentServiceVolumeOperationSummary {
  createdAt: string;
  dockerImage: string;
  dryRun: boolean;
  exported?: boolean | undefined;
  imported?: boolean | undefined;
  inputPath?: string | undefined;
  manifestPath: string;
  outputPath?: string | undefined;
  quiescenceChecks: DeploymentServiceVolumeQuiescenceCheck[];
  secretVolumeIncluded: false;
  serviceVolumeQuiescenceChecked: boolean;
  servicesStoppedAcknowledged: boolean;
  volumeCount: number;
  volumes: DeploymentServiceVolumeOperationEntry[];
}

const manifestFileName = "manifest.json";
const serviceVolumeManifestFileName = "manifest.json";
const backupStatePath = "state/host";
const backupConfigPath = "config";
const hostStateRelativePath = ".entangle/host";
const secretsPath = ".entangle-secrets";
const defaultServiceVolumeDockerImage = "alpine:3.20";
const federatedDevProfileComposeFile =
  "deploy/federated-dev/compose/docker-compose.federated-dev.yml";
const serviceVolumeMaintenanceServiceNames = ["gitea", "strfry"] as const;
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
const backupServiceVolumes = [
  {
    archivePath: "gitea-data.tar",
    mountPath: "/data",
    service: "gitea",
    volume: "gitea-data"
  },
  {
    archivePath: "strfry-data.tar",
    mountPath: "/app/strfry-db",
    service: "strfry",
    volume: "strfry-data"
  }
] as const satisfies readonly DeploymentServiceVolumeManifestEntry[];

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

function isSafeServiceVolumeArchivePath(inputPath: string): boolean {
  return (
    isSafeRelativePath(inputPath) &&
    inputPath
      .split(/[\\/]+/u)
      .every((segment) => /^[0-9A-Za-z._-]+$/u.test(segment))
  );
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

function validateServiceVolumeManifest(rawManifest: unknown): DeploymentServiceVolumeManifest {
  if (!rawManifest || typeof rawManifest !== "object") {
    throw new Error("Service volume backup manifest is not a JSON object.");
  }

  const manifest = rawManifest as Partial<DeploymentServiceVolumeManifest>;
  if (
    manifest.schemaVersion !== "1" ||
    manifest.product !== "entangle-service-volume-backup"
  ) {
    throw new Error(
      "Manifest is not an Entangle service-volume backup manifest."
    );
  }

  if (manifest.secretsIncluded !== false) {
    throw new Error("Service volume backup manifest must explicitly exclude secrets.");
  }

  if (!Array.isArray(manifest.volumes) || manifest.volumes.length === 0) {
    throw new Error("Service volume backup manifest does not contain volumes.");
  }

  for (const [index, volume] of manifest.volumes.entries()) {
    if (
      typeof volume?.service !== "string" ||
      typeof volume.volume !== "string" ||
      typeof volume.mountPath !== "string" ||
      typeof volume.archivePath !== "string"
    ) {
      throw new Error(
        `Service volume backup manifest volume ${index} is incomplete.`
      );
    }

    if (!isSafeServiceVolumeArchivePath(volume.archivePath)) {
      throw new Error(
        `Service volume backup manifest volume ${index} has unsafe archive path '${volume.archivePath}'.`
      );
    }
  }

  return {
    createdAt:
      typeof manifest.createdAt === "string"
        ? manifest.createdAt
        : new Date(0).toISOString(),
    dockerImage:
      typeof manifest.dockerImage === "string" && manifest.dockerImage
        ? manifest.dockerImage
        : defaultServiceVolumeDockerImage,
    product: "entangle-service-volume-backup",
    schemaVersion: "1",
    secretsIncluded: false,
    volumes: manifest.volumes
  };
}

function defaultCommandRunner(
  command: string,
  args: string[],
  options: { cwd: string }
): DeploymentServiceVolumeCommandResult {
  return spawnSync(command, args, {
    cwd: options.cwd,
    encoding: "utf8"
  });
}

function normalizeCommandResult(result: DeploymentServiceVolumeCommandResult): string {
  const stderr = (result.stderr ?? "").trim();
  const stdout = (result.stdout ?? "").trim();
  const output =
    result.status === 0 || stderr.length === 0
      ? `${stdout}${stderr}`.trim()
      : stderr;

  if (output.length > 0) {
    return output.split("\n")[0] ?? output;
  }

  if (result.error) {
    return result.error.message;
  }

  if (result.signal) {
    return `terminated by ${result.signal}`;
  }

  return "no output";
}

function buildServiceVolumeExportArgs(input: {
  archivePath: string;
  dockerImage: string;
  outputPath: string;
  volume: string;
}): string[] {
  return [
    "run",
    "--rm",
    "-v",
    `${input.volume}:/volume:ro`,
    "-v",
    `${input.outputPath}:/backup`,
    input.dockerImage,
    "sh",
    "-c",
    `cd /volume && tar -cf /backup/${input.archivePath} .`
  ];
}

function buildServiceVolumeImportArgs(input: {
  archivePath: string;
  dockerImage: string;
  inputPath: string;
  volume: string;
}): string[] {
  return [
    "run",
    "--rm",
    "-v",
    `${input.volume}:/volume`,
    "-v",
    `${input.inputPath}:/backup:ro`,
    input.dockerImage,
    "sh",
    "-c",
    `cd /volume && tar -xf /backup/${input.archivePath}`
  ];
}

function buildServiceVolumeInspectArgs(volume: string): string[] {
  return ["volume", "inspect", volume];
}

function buildServiceVolumeMaintenanceArgs(
  action: DeploymentServiceVolumeMaintenanceAction
): string[] {
  const prefix = ["compose", "-f", federatedDevProfileComposeFile];

  if (action === "stop") {
    return [...prefix, "stop", ...serviceVolumeMaintenanceServiceNames];
  }

  return [...prefix, "up", "-d", ...serviceVolumeMaintenanceServiceNames];
}

function buildServiceVolumeQuiescenceArgs(volume: string): string[] {
  return ["ps", "--filter", `volume=${volume}`, "--format", "{{.Names}}"];
}

function parseRunningContainerNames(stdout: string | undefined): string[] {
  return (stdout ?? "")
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function runServiceVolumeDockerCommand(input: {
  args: string[];
  commandRunner: DeploymentServiceVolumeCommandRunner;
  operation: "export" | "import";
  repositoryRoot: string;
  volume: string;
}): void {
  const result = input.commandRunner("docker", input.args, {
    cwd: input.repositoryRoot
  });

  if (result.status === 0 && !result.error && !result.signal) {
    return;
  }

  throw new Error(
    `Service volume ${input.operation} for '${input.volume}' failed: ${normalizeCommandResult(result)}`
  );
}

function inspectServiceVolumeQuiescence(input: {
  commandRunner: DeploymentServiceVolumeCommandRunner;
  repositoryRoot: string;
  service: string;
  volume: string;
}): DeploymentServiceVolumeQuiescenceCheck {
  const args = buildServiceVolumeQuiescenceArgs(input.volume);
  const result = input.commandRunner("docker", args, {
    cwd: input.repositoryRoot
  });

  if (result.status !== 0 || result.error || result.signal) {
    throw new Error(
      `Service volume quiescence check for '${input.volume}' failed: ${normalizeCommandResult(result)}`
    );
  }

  const runningContainers = parseRunningContainerNames(result.stdout);
  if (runningContainers.length > 0) {
    throw new Error(
      `Service volume '${input.volume}' for service '${input.service}' is still mounted by running container(s): ${runningContainers.join(", ")}. Stop or quiesce those services before retrying.`
    );
  }

  return {
    command: ["docker", ...args],
    runningContainers,
    service: input.service,
    status: "clear",
    volume: input.volume
  };
}

function inspectServiceVolumeQuiescenceForVolumes(input: {
  commandRunner: DeploymentServiceVolumeCommandRunner;
  repositoryRoot: string;
  volumes: readonly Pick<DeploymentServiceVolumeManifestEntry, "service" | "volume">[];
}): DeploymentServiceVolumeQuiescenceCheck[] {
  return input.volumes.map((volume) =>
    inspectServiceVolumeQuiescence({
      commandRunner: input.commandRunner,
      repositoryRoot: input.repositoryRoot,
      service: volume.service,
      volume: volume.volume
    })
  );
}

function inspectServiceVolumeStatus(input: {
  commandRunner: DeploymentServiceVolumeCommandRunner;
  repositoryRoot: string;
  volume: DeploymentServiceVolumeManifestEntry;
}): DeploymentServiceVolumeStatusEntry {
  const inspectArgs = buildServiceVolumeInspectArgs(input.volume.volume);
  const inspectResult = input.commandRunner("docker", inspectArgs, {
    cwd: input.repositoryRoot
  });
  const inspectCommand = ["docker", ...inspectArgs];

  if (inspectResult.status !== 0 || inspectResult.error || inspectResult.signal) {
    return {
      detail: normalizeCommandResult(inspectResult),
      exists: false,
      inspectCommand,
      mountPath: input.volume.mountPath,
      runningContainers: [],
      service: input.volume.service,
      status: "missing",
      volume: input.volume.volume
    };
  }

  const runningArgs = buildServiceVolumeQuiescenceArgs(input.volume.volume);
  const runningResult = input.commandRunner("docker", runningArgs, {
    cwd: input.repositoryRoot
  });
  const runningContainersCommand = ["docker", ...runningArgs];

  if (runningResult.status !== 0 || runningResult.error || runningResult.signal) {
    return {
      detail: normalizeCommandResult(runningResult),
      exists: true,
      inspectCommand,
      mountPath: input.volume.mountPath,
      runningContainers: [],
      runningContainersCommand,
      service: input.volume.service,
      status: "unavailable",
      volume: input.volume.volume
    };
  }

  const runningContainers = parseRunningContainerNames(runningResult.stdout);
  return {
    detail:
      runningContainers.length > 0
        ? `${runningContainers.length} running container(s) mounted`
        : "volume exists and is not mounted by running containers",
    exists: true,
    inspectCommand,
    mountPath: input.volume.mountPath,
    runningContainers,
    runningContainersCommand,
    service: input.volume.service,
    status: runningContainers.length > 0 ? "in_use" : "ready",
    volume: input.volume.volume
  };
}

function assertServiceVolumeMutationAcknowledged(input: {
  assumeServicesStopped: boolean | undefined;
  dryRun: boolean;
  operation: "export" | "import";
}): void {
  if (input.dryRun || input.assumeServicesStopped) {
    return;
  }

  throw new Error(
    `Non-dry-run service-volume ${input.operation} requires --assume-services-stopped because Gitea and relay services must be stopped or quiesced first.`
  );
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

export function inspectDeploymentServiceVolumes(
  options: DeploymentServiceVolumesStatusOptions
): DeploymentServiceVolumesStatusSummary {
  const commandRunner = options.commandRunner ?? defaultCommandRunner;
  const volumes = backupServiceVolumes.map((volume) =>
    inspectServiceVolumeStatus({
      commandRunner,
      repositoryRoot: options.repositoryRoot,
      volume
    })
  );
  const readyForExportImport = volumes.every((volume) => volume.status === "ready");

  return {
    generatedAt: (options.now ?? (() => new Date()))().toISOString(),
    readyForExportImport,
    status: readyForExportImport ? "ready" : "blocked",
    volumeCount: volumes.length,
    volumes
  };
}

export function planDeploymentServiceVolumeMaintenance(
  options: DeploymentServiceVolumeMaintenanceOptions
): DeploymentServiceVolumeMaintenanceSummary {
  const commandRunner = options.commandRunner ?? defaultCommandRunner;
  const args = buildServiceVolumeMaintenanceArgs(options.action);

  if (options.apply) {
    const result = commandRunner("docker", args, {
      cwd: options.repositoryRoot
    });

    if (result.status !== 0 || result.error || result.signal) {
      throw new Error(
        `Service-volume ${options.action} command failed: ${normalizeCommandResult(result)}`
      );
    }
  }

  return {
    action: options.action,
    applied: Boolean(options.apply),
    command: ["docker", ...args],
    generatedAt: (options.now ?? (() => new Date()))().toISOString(),
    serviceNames: [...serviceVolumeMaintenanceServiceNames],
    status: options.apply ? "applied" : "planned"
  };
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
    externalVolumeCount: manifest.exclusions.externalVolumes.length,
    manifestPath,
    outputPath,
    stateLayoutStatus: layout.status,
    stateLayoutVersion: layout.recordedLayoutVersion,
    stateStats
  };
}

export async function createDeploymentServiceVolumeExport(
  options: DeploymentServiceVolumeExportOptions
): Promise<DeploymentServiceVolumeOperationSummary> {
  const createdAt = (options.now ?? (() => new Date()))().toISOString();
  const outputPath = path.resolve(options.outputPath);
  const manifestPath = path.join(outputPath, serviceVolumeManifestFileName);
  const dockerImage = options.dockerImage ?? defaultServiceVolumeDockerImage;
  const dryRun = Boolean(options.dryRun);
  const commandRunner = options.commandRunner ?? defaultCommandRunner;
  assertServiceVolumeMutationAcknowledged({
    assumeServicesStopped: options.assumeServicesStopped,
    dryRun,
    operation: "export"
  });

  let outputPathExists = false;
  if (!dryRun && (await pathExists(outputPath))) {
    if (!options.force) {
      throw new Error(
        `Service volume backup output path '${outputPath}' already exists. Use --force to replace it.`
      );
    }

    outputPathExists = true;
  }

  const quiescenceChecks = dryRun
    ? []
    : inspectServiceVolumeQuiescenceForVolumes({
        commandRunner,
        repositoryRoot: options.repositoryRoot,
        volumes: backupServiceVolumes
      });

  if (!dryRun && outputPathExists) {
    await rm(outputPath, { force: true, recursive: true });
  }

  if (!dryRun) {
    await mkdir(outputPath, { recursive: true });
  }

  const volumes: DeploymentServiceVolumeOperationEntry[] = backupServiceVolumes.map(
    (volume) => {
      const args = buildServiceVolumeExportArgs({
        archivePath: volume.archivePath,
        dockerImage,
        outputPath,
        volume: volume.volume
      });

      return {
        archivePath: path.join(outputPath, volume.archivePath),
        archiveRelativePath: volume.archivePath,
        command: ["docker", ...args],
        mountPath: volume.mountPath,
        service: volume.service,
        status: dryRun ? "planned" : "exported",
        volume: volume.volume
      };
    }
  );

  if (!dryRun) {
    for (const volume of volumes) {
      runServiceVolumeDockerCommand({
        args: volume.command.slice(1),
        commandRunner,
        operation: "export",
        repositoryRoot: options.repositoryRoot,
        volume: volume.volume
      });
    }

    const manifest: DeploymentServiceVolumeManifest = {
      createdAt,
      dockerImage,
      product: "entangle-service-volume-backup",
      schemaVersion: "1",
      secretsIncluded: false,
      volumes: backupServiceVolumes.map((volume) => ({ ...volume }))
    };
    await writeJsonFile(manifestPath, manifest);
  }

  return {
    createdAt,
    dockerImage,
    dryRun,
    exported: !dryRun,
    manifestPath,
    outputPath,
    quiescenceChecks,
    secretVolumeIncluded: false,
    serviceVolumeQuiescenceChecked: !dryRun,
    servicesStoppedAcknowledged: Boolean(options.assumeServicesStopped),
    volumeCount: volumes.length,
    volumes
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

export async function createDeploymentServiceVolumeImport(
  options: DeploymentServiceVolumeImportOptions
): Promise<DeploymentServiceVolumeOperationSummary> {
  const inspectedAt = (options.now ?? (() => new Date()))().toISOString();
  const inputPath = path.resolve(options.inputPath);
  const manifestPath = path.join(inputPath, serviceVolumeManifestFileName);
  const manifest = validateServiceVolumeManifest(await readJsonFile(manifestPath));
  const dockerImage = options.dockerImage ?? manifest.dockerImage;
  const dryRun = Boolean(options.dryRun);
  const commandRunner = options.commandRunner ?? defaultCommandRunner;
  assertServiceVolumeMutationAcknowledged({
    assumeServicesStopped: options.assumeServicesStopped,
    dryRun,
    operation: "import"
  });
  const volumes: DeploymentServiceVolumeOperationEntry[] = manifest.volumes.map(
    (volume) => {
      const archivePath = resolveSafeBundlePath(inputPath, volume.archivePath);
      const args = buildServiceVolumeImportArgs({
        archivePath: volume.archivePath,
        dockerImage,
        inputPath,
        volume: volume.volume
      });

      return {
        archivePath,
        archiveRelativePath: volume.archivePath,
        command: ["docker", ...args],
        mountPath: volume.mountPath,
        service: volume.service,
        status: dryRun ? "planned" : "imported",
        volume: volume.volume
      };
    }
  );

  for (const volume of volumes) {
    if (!(await pathExists(volume.archivePath))) {
      throw new Error(
        `Service volume backup archive '${volume.archivePath}' is missing.`
      );
    }
  }

  const quiescenceChecks = dryRun
    ? []
    : inspectServiceVolumeQuiescenceForVolumes({
        commandRunner,
        repositoryRoot: options.repositoryRoot,
        volumes
      });

  if (!dryRun) {
    for (const volume of volumes) {
      runServiceVolumeDockerCommand({
        args: volume.command.slice(1),
        commandRunner,
        operation: "import",
        repositoryRoot: options.repositoryRoot,
        volume: volume.volume
      });
    }
  }

  return {
    createdAt: inspectedAt,
    dockerImage,
    dryRun,
    imported: !dryRun,
    inputPath,
    manifestPath,
    quiescenceChecks,
    secretVolumeIncluded: false,
    serviceVolumeQuiescenceChecked: !dryRun,
    servicesStoppedAcknowledged: Boolean(options.assumeServicesStopped),
    volumeCount: volumes.length,
    volumes
  };
}

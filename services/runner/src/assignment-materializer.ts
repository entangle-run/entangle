import { createHash } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import type {
  EffectiveRuntimeContext,
  EntangleControlEvent,
  RuntimeBootstrapBundleResponse,
  RuntimeBootstrapDirectorySnapshot,
  RuntimeIdentitySecretResponse,
  RuntimeAssignmentRecord,
  RunnerJoinHostApi
} from "@entangle/types";
import {
  effectiveRuntimeContextSchema,
  runtimeBootstrapBundleResponseSchema,
  runtimeIdentitySecretResponseSchema
} from "@entangle/types";
import type {
  RunnerAssignmentMaterializationResult,
  RunnerAssignmentMaterializer
} from "./join-service.js";

export type FileSystemAssignmentMaterializerInput = {
  clock?: () => string;
  hostApi?: RunnerJoinHostApi;
  stateRoot?: string;
};

export type AssignmentMaterializationRecord = {
  assignment: RuntimeAssignmentRecord;
  assignmentPath: string;
  controlEventPath: string;
  materializedAt: string;
  materializationPath: string;
  runtimeContextPath?: string;
  schemaVersion: "1";
};

function sanitizePathSegment(input: string): string {
  return (
    input
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .replace(/-{2,}/g, "-") || "assignment"
  );
}

function buildRuntimeIdentitySecretEnvVar(assignmentId: string): string {
  return `ENTANGLE_NODE_IDENTITY_${sanitizePathSegment(assignmentId)
    .toUpperCase()
    .replace(/[^A-Z0-9_]/g, "_")}`;
}

export function resolveRunnerAssignmentStateRoot(
  explicitRoot?: string
): string {
  return path.resolve(
    explicitRoot ??
      process.env.ENTANGLE_RUNNER_STATE_ROOT ??
      path.join(process.cwd(), ".entangle", "runner-state")
  );
}

async function writeJsonFile(filePath: string, value: unknown): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function buildAssignmentWorkspaceLayout(
  assignmentRoot: string,
  portableWorkspace: EffectiveRuntimeContext["workspace"]
): EffectiveRuntimeContext["workspace"] {
  const root = path.join(assignmentRoot, "workspace");

  return {
    artifactWorkspaceRoot: path.join(root, "artifact-workspace"),
    ...(portableWorkspace.engineStateRoot
      ? { engineStateRoot: path.join(root, "engine-state") }
      : {}),
    injectedRoot: path.join(root, "injected"),
    memoryRoot: path.join(root, "memory"),
    packageRoot: path.join(root, "package"),
    retrievalRoot: path.join(root, "retrieval"),
    root,
    runtimeRoot: path.join(root, "runtime"),
    ...(portableWorkspace.sourceWorkspaceRoot
      ? { sourceWorkspaceRoot: path.join(root, "source") }
      : {}),
    ...(portableWorkspace.wikiRepositoryRoot
      ? { wikiRepositoryRoot: path.join(root, "wiki-repository") }
      : {})
  };
}

function snapshotTargetRoot(input: {
  root: RuntimeBootstrapDirectorySnapshot["root"];
  workspace: EffectiveRuntimeContext["workspace"];
}): string {
  switch (input.root) {
    case "memory":
      return input.workspace.memoryRoot;
    case "package":
      return input.workspace.packageRoot;
  }
}

function resolveSnapshotFilePath(input: {
  relativePath: string;
  root: string;
}): string {
  const root = path.resolve(input.root);
  const filePath = path.resolve(root, input.relativePath);
  const rootPrefix = `${root}${path.sep}`;

  if (filePath !== root && !filePath.startsWith(rootPrefix)) {
    throw new Error(
      `Runtime bootstrap snapshot path '${input.relativePath}' escapes '${root}'.`
    );
  }

  return filePath;
}

async function materializeDirectorySnapshot(input: {
  snapshot: RuntimeBootstrapDirectorySnapshot;
  workspace: EffectiveRuntimeContext["workspace"];
}): Promise<void> {
  const root = snapshotTargetRoot({
    root: input.snapshot.root,
    workspace: input.workspace
  });

  await rm(root, { force: true, recursive: true });
  await mkdir(root, { recursive: true });

  for (const file of input.snapshot.files) {
    const content = Buffer.from(file.contentBase64, "base64");
    const digest = createHash("sha256").update(content).digest("hex");

    if (digest !== file.sha256) {
      throw new Error(
        `Runtime bootstrap snapshot file '${file.path}' failed sha256 verification.`
      );
    }

    if (content.byteLength !== file.sizeBytes) {
      throw new Error(
        `Runtime bootstrap snapshot file '${file.path}' size did not match metadata.`
      );
    }

    const filePath = resolveSnapshotFilePath({
      relativePath: file.path,
      root
    });
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, content);
  }
}

async function materializeWorkspaceFromBootstrapBundle(input: {
  assignmentRoot: string;
  bootstrapBundle: RuntimeBootstrapBundleResponse;
}): Promise<EffectiveRuntimeContext> {
  const workspace = buildAssignmentWorkspaceLayout(
    input.assignmentRoot,
    input.bootstrapBundle.runtimeContext.workspace
  );
  const workspaceDirectories = [
    workspace.root,
    workspace.artifactWorkspaceRoot,
    workspace.injectedRoot,
    workspace.memoryRoot,
    workspace.retrievalRoot,
    workspace.runtimeRoot,
    workspace.engineStateRoot,
    workspace.sourceWorkspaceRoot,
    workspace.wikiRepositoryRoot
  ].filter((candidate): candidate is string => candidate !== undefined);

  await Promise.all(
    workspaceDirectories.map((directory) =>
      mkdir(directory, { recursive: true })
    )
  );
  await Promise.all(
    input.bootstrapBundle.snapshots.map((snapshot) =>
      materializeDirectorySnapshot({
        snapshot,
        workspace
      })
    )
  );

  const packageSource = input.bootstrapBundle.runtimeContext.binding.packageSource;
  const localizedPackageSource =
    packageSource?.sourceKind === "local_path"
      ? {
          ...packageSource,
          absolutePath: workspace.packageRoot
        }
      : packageSource;

  return effectiveRuntimeContextSchema.parse({
    ...input.bootstrapBundle.runtimeContext,
    binding: {
      ...input.bootstrapBundle.runtimeContext.binding,
      ...(localizedPackageSource
        ? { packageSource: localizedPackageSource }
        : {})
    },
    workspace
  });
}

function buildHostApiHeaders(input: RunnerJoinHostApi): Record<string, string> {
  const headers: Record<string, string> = {
    accept: "application/json"
  };

  if (input.auth?.mode === "bearer_env") {
    const token = process.env[input.auth.envVar]?.trim();

    if (!token) {
      throw new Error(
        `Host API bearer token is missing from env var '${input.auth.envVar}'.`
      );
    }

    headers.authorization = `Bearer ${token}`;
  }

  return headers;
}

async function fetchHostRuntimeBootstrapBundle(input: {
  assignment: RuntimeAssignmentRecord;
  hostApi: RunnerJoinHostApi;
}): Promise<RuntimeBootstrapBundleResponse> {
  const url = new URL(
    `/v1/runtimes/${encodeURIComponent(input.assignment.nodeId)}/bootstrap-bundle`,
    input.hostApi.baseUrl
  );
  const response = await fetch(url, {
    headers: buildHostApiHeaders(input.hostApi)
  });

  if (!response.ok) {
    throw new Error(
      `Host runtime bootstrap bundle fetch failed for node '${input.assignment.nodeId}' with HTTP ${response.status}.`
    );
  }

  return runtimeBootstrapBundleResponseSchema.parse(await response.json());
}

async function fetchHostRuntimeIdentitySecret(input: {
  assignment: RuntimeAssignmentRecord;
  expectedPublicKey?: string;
  hostApi: RunnerJoinHostApi;
}): Promise<RuntimeIdentitySecretResponse | undefined> {
  if (!input.hostApi.runtimeIdentitySecret) {
    return undefined;
  }

  const url = new URL(
    `/v1/runtimes/${encodeURIComponent(input.assignment.nodeId)}/identity-secret`,
    input.hostApi.baseUrl
  );
  const response = await fetch(url, {
    headers: buildHostApiHeaders(input.hostApi)
  });

  if (!response.ok) {
    throw new Error(
      `Host runtime identity secret fetch failed for node '${input.assignment.nodeId}' with HTTP ${response.status}.`
    );
  }

  const identitySecret = runtimeIdentitySecretResponseSchema.parse(
    await response.json()
  );

  if (identitySecret.nodeId !== input.assignment.nodeId) {
    throw new Error(
      `Host runtime identity secret response was for node '${identitySecret.nodeId}', expected '${input.assignment.nodeId}'.`
    );
  }

  if (
    input.expectedPublicKey &&
    identitySecret.publicKey !== input.expectedPublicKey
  ) {
    throw new Error(
      `Host runtime identity secret for node '${input.assignment.nodeId}' does not match the fetched runtime context public key.`
    );
  }

  return identitySecret;
}

function installRuntimeIdentitySecret(input: {
  assignment: RuntimeAssignmentRecord;
  identitySecret: RuntimeIdentitySecretResponse;
  runtimeContext: EffectiveRuntimeContext;
}): EffectiveRuntimeContext {
  const envVar = buildRuntimeIdentitySecretEnvVar(input.assignment.assignmentId);
  const existingSecret = process.env[envVar]?.trim();

  if (existingSecret && existingSecret !== input.identitySecret.secretKey) {
    throw new Error(
      `Runtime identity env var '${envVar}' already contains different key material.`
    );
  }

  process.env[envVar] = input.identitySecret.secretKey;

  return effectiveRuntimeContextSchema.parse({
    ...input.runtimeContext,
    identityContext: {
      ...input.runtimeContext.identityContext,
      secretDelivery: {
        envVar,
        mode: "env_var"
      }
    }
  });
}

export async function materializeAssignmentToFileSystem(input: {
  assignment: RuntimeAssignmentRecord;
  clock?: () => string;
  controlEvent: EntangleControlEvent;
  hostApi?: RunnerJoinHostApi;
  stateRoot?: string;
}): Promise<AssignmentMaterializationRecord> {
  const materializedAt = input.clock?.() ?? new Date().toISOString();
  const assignmentRoot = path.join(
    resolveRunnerAssignmentStateRoot(input.stateRoot),
    "assignments",
    sanitizePathSegment(input.assignment.assignmentId)
  );
  const assignmentPath = path.join(assignmentRoot, "assignment.json");
  const controlEventPath = path.join(assignmentRoot, "control-event.json");
  const runtimeContextPath = input.hostApi
    ? path.join(assignmentRoot, "runtime-context.json")
    : undefined;
  const materializationPath = path.join(assignmentRoot, "materialization.json");
  const bootstrapBundle = input.hostApi
    ? await fetchHostRuntimeBootstrapBundle({
        assignment: input.assignment,
        hostApi: input.hostApi
      })
    : undefined;
  let runtimeContext = bootstrapBundle
    ? await materializeWorkspaceFromBootstrapBundle({
        assignmentRoot,
        bootstrapBundle
      })
    : undefined;

  if (input.hostApi && runtimeContext) {
    const identitySecret = await fetchHostRuntimeIdentitySecret({
      assignment: input.assignment,
      expectedPublicKey: runtimeContext.identityContext.publicKey,
      hostApi: input.hostApi
    });

    if (identitySecret) {
      runtimeContext = installRuntimeIdentitySecret({
        assignment: input.assignment,
        identitySecret,
        runtimeContext
      });
    }
  }

  const record: AssignmentMaterializationRecord = {
    assignment: input.assignment,
    assignmentPath,
    controlEventPath,
    materializedAt,
    materializationPath,
    ...(runtimeContextPath ? { runtimeContextPath } : {}),
    schemaVersion: "1"
  };

  await Promise.all([
    writeJsonFile(assignmentPath, input.assignment),
    writeJsonFile(controlEventPath, input.controlEvent),
    ...(runtimeContext && runtimeContextPath
      ? [writeJsonFile(runtimeContextPath, runtimeContext)]
      : []),
    writeJsonFile(materializationPath, record)
  ]);

  return record;
}

export function createFileSystemAssignmentMaterializer(
  input: FileSystemAssignmentMaterializerInput = {}
): RunnerAssignmentMaterializer {
  return async ({
    assignment,
    controlEvent
  }): Promise<RunnerAssignmentMaterializationResult> => {
    const record = await materializeAssignmentToFileSystem({
      assignment,
      ...(input.clock ? { clock: input.clock } : {}),
      controlEvent,
      ...(input.hostApi ? { hostApi: input.hostApi } : {}),
      ...(input.stateRoot ? { stateRoot: input.stateRoot } : {})
    });

    return {
      accepted: true,
      ...(assignment.lease ? { lease: assignment.lease } : {}),
      ...(record.runtimeContextPath
        ? { runtimeContextPath: record.runtimeContextPath }
        : {})
    };
  };
}

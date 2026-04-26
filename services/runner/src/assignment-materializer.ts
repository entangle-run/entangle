import { cp, mkdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import type {
  EffectiveRuntimeContext,
  EntangleControlEvent,
  RuntimeIdentitySecretResponse,
  RuntimeAssignmentRecord,
  RunnerJoinHostApi
} from "@entangle/types";
import {
  effectiveRuntimeContextSchema,
  runtimeContextInspectionResponseSchema,
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

async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await stat(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function copyDirectoryIfPresent(input: {
  source: string | undefined;
  target: string | undefined;
}): Promise<void> {
  if (!input.source || !input.target || !(await pathExists(input.source))) {
    return;
  }

  await rm(input.target, { force: true, recursive: true });
  await mkdir(path.dirname(input.target), { recursive: true });
  await cp(input.source, input.target, { dereference: true, recursive: true });
}

function buildAssignmentWorkspaceLayout(
  assignmentRoot: string,
  hostWorkspace: EffectiveRuntimeContext["workspace"]
): EffectiveRuntimeContext["workspace"] {
  const root = path.join(assignmentRoot, "workspace");

  return {
    artifactWorkspaceRoot: path.join(root, "artifact-workspace"),
    ...(hostWorkspace.engineStateRoot
      ? { engineStateRoot: path.join(root, "engine-state") }
      : {}),
    injectedRoot: path.join(root, "injected"),
    memoryRoot: path.join(root, "memory"),
    packageRoot: path.join(root, "package"),
    retrievalRoot: path.join(root, "retrieval"),
    root,
    runtimeRoot: path.join(root, "runtime"),
    ...(hostWorkspace.sourceWorkspaceRoot
      ? { sourceWorkspaceRoot: path.join(root, "source") }
      : {}),
    ...(hostWorkspace.wikiRepositoryRoot
      ? { wikiRepositoryRoot: path.join(root, "wiki-repository") }
      : {})
  };
}

async function materializeWorkspaceFromHostContext(input: {
  assignmentRoot: string;
  hostRuntimeContext: EffectiveRuntimeContext;
}): Promise<EffectiveRuntimeContext> {
  const workspace = buildAssignmentWorkspaceLayout(
    input.assignmentRoot,
    input.hostRuntimeContext.workspace
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
  await Promise.all([
    copyDirectoryIfPresent({
      source: input.hostRuntimeContext.workspace.packageRoot,
      target: workspace.packageRoot
    }),
    copyDirectoryIfPresent({
      source: input.hostRuntimeContext.workspace.memoryRoot,
      target: workspace.memoryRoot
    })
  ]);

  const packageSource = input.hostRuntimeContext.binding.packageSource;
  const localizedPackageSource =
    packageSource?.sourceKind === "local_path"
      ? {
          ...packageSource,
          absolutePath: workspace.packageRoot
        }
      : packageSource;

  return effectiveRuntimeContextSchema.parse({
    ...input.hostRuntimeContext,
    binding: {
      ...input.hostRuntimeContext.binding,
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

async function fetchHostRuntimeContext(input: {
  assignment: RuntimeAssignmentRecord;
  hostApi: RunnerJoinHostApi;
}): Promise<EffectiveRuntimeContext> {
  const url = new URL(
    `/v1/runtimes/${encodeURIComponent(input.assignment.nodeId)}/context`,
    input.hostApi.baseUrl
  );
  const response = await fetch(url, {
    headers: buildHostApiHeaders(input.hostApi)
  });

  if (!response.ok) {
    throw new Error(
      `Host runtime context fetch failed for node '${input.assignment.nodeId}' with HTTP ${response.status}.`
    );
  }

  return runtimeContextInspectionResponseSchema.parse(await response.json());
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
  const hostRuntimeContext = input.hostApi
    ? await fetchHostRuntimeContext({
        assignment: input.assignment,
        hostApi: input.hostApi
      })
    : undefined;
  let runtimeContext = hostRuntimeContext
    ? await materializeWorkspaceFromHostContext({
        assignmentRoot,
        hostRuntimeContext
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

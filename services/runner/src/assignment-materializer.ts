import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type {
  EffectiveRuntimeContext,
  EntangleControlEvent,
  RuntimeAssignmentRecord,
  RunnerJoinHostApi
} from "@entangle/types";
import { runtimeContextInspectionResponseSchema } from "@entangle/types";
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

async function fetchHostRuntimeContext(input: {
  assignment: RuntimeAssignmentRecord;
  hostApi: RunnerJoinHostApi;
}): Promise<EffectiveRuntimeContext> {
  const headers: Record<string, string> = {
    accept: "application/json"
  };

  if (input.hostApi.auth?.mode === "bearer_env") {
    const token = process.env[input.hostApi.auth.envVar]?.trim();

    if (!token) {
      throw new Error(
        `Host API bearer token is missing from env var '${input.hostApi.auth.envVar}'.`
      );
    }

    headers.authorization = `Bearer ${token}`;
  }

  const url = new URL(
    `/v1/runtimes/${encodeURIComponent(input.assignment.nodeId)}/context`,
    input.hostApi.baseUrl
  );
  const response = await fetch(url, {
    headers
  });

  if (!response.ok) {
    throw new Error(
      `Host runtime context fetch failed for node '${input.assignment.nodeId}' with HTTP ${response.status}.`
    );
  }

  return runtimeContextInspectionResponseSchema.parse(await response.json());
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
    ...(hostRuntimeContext && runtimeContextPath
      ? [writeJsonFile(runtimeContextPath, hostRuntimeContext)]
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

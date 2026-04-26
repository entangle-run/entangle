import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type {
  EntangleControlEvent,
  RuntimeAssignmentRecord
} from "@entangle/types";
import type {
  RunnerAssignmentMaterializationResult,
  RunnerAssignmentMaterializer
} from "./join-service.js";

export type FileSystemAssignmentMaterializerInput = {
  clock?: () => string;
  stateRoot?: string;
};

export type AssignmentMaterializationRecord = {
  assignment: RuntimeAssignmentRecord;
  assignmentPath: string;
  controlEventPath: string;
  materializedAt: string;
  materializationPath: string;
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

export async function materializeAssignmentToFileSystem(input: {
  assignment: RuntimeAssignmentRecord;
  clock?: () => string;
  controlEvent: EntangleControlEvent;
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
  const materializationPath = path.join(assignmentRoot, "materialization.json");
  const record: AssignmentMaterializationRecord = {
    assignment: input.assignment,
    assignmentPath,
    controlEventPath,
    materializedAt,
    materializationPath,
    schemaVersion: "1"
  };

  await Promise.all([
    writeJsonFile(assignmentPath, input.assignment),
    writeJsonFile(controlEventPath, input.controlEvent),
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
    await materializeAssignmentToFileSystem({
      assignment,
      ...(input.clock ? { clock: input.clock } : {}),
      controlEvent,
      ...(input.stateRoot ? { stateRoot: input.stateRoot } : {})
    });

    return {
      accepted: true,
      ...(assignment.lease ? { lease: assignment.lease } : {})
    };
  };
}

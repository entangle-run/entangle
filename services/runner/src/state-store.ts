import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import type {
  ArtifactRecord,
  ApprovalRecord,
  ConversationRecord,
  FocusedRegisterState,
  RunnerTurnRecord,
  SessionRecord
} from "@entangle/types";
import {
  artifactRecordSchema,
  approvalRecordSchema,
  conversationRecordSchema,
  focusedRegisterStateSchema,
  runnerTurnRecordSchema,
  sessionRecordSchema
} from "@entangle/types";

export type RunnerStatePaths = {
  approvalsRoot: string;
  artifactsRoot: string;
  conversationsRoot: string;
  memoryStateRoot: string;
  sessionsRoot: string;
  turnsRoot: string;
};

async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await stat(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function ensureDirectory(directoryPath: string): Promise<void> {
  await mkdir(directoryPath, { recursive: true });
}

async function readJsonFile<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, "utf8")) as T;
}

async function writeJsonFile(filePath: string, value: unknown): Promise<void> {
  await ensureDirectory(path.dirname(filePath));
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export function buildRunnerStatePaths(runtimeRoot: string): RunnerStatePaths {
  return {
    approvalsRoot: path.join(runtimeRoot, "approvals"),
    artifactsRoot: path.join(runtimeRoot, "artifacts"),
    conversationsRoot: path.join(runtimeRoot, "conversations"),
    memoryStateRoot: path.join(runtimeRoot, "memory-state"),
    sessionsRoot: path.join(runtimeRoot, "sessions"),
    turnsRoot: path.join(runtimeRoot, "turns")
  };
}

export async function ensureRunnerStatePaths(
  runtimeRoot: string
): Promise<RunnerStatePaths> {
  const statePaths = buildRunnerStatePaths(runtimeRoot);

  await Promise.all([
    ensureDirectory(statePaths.approvalsRoot),
    ensureDirectory(statePaths.artifactsRoot),
    ensureDirectory(statePaths.conversationsRoot),
    ensureDirectory(statePaths.memoryStateRoot),
    ensureDirectory(statePaths.sessionsRoot),
    ensureDirectory(statePaths.turnsRoot)
  ]);

  return statePaths;
}

function sessionRecordPath(statePaths: RunnerStatePaths, sessionId: string): string {
  return path.join(statePaths.sessionsRoot, `${sessionId}.json`);
}

function conversationRecordPath(
  statePaths: RunnerStatePaths,
  conversationId: string
): string {
  return path.join(statePaths.conversationsRoot, `${conversationId}.json`);
}

function approvalRecordPath(
  statePaths: RunnerStatePaths,
  approvalId: string
): string {
  return path.join(statePaths.approvalsRoot, `${approvalId}.json`);
}

function artifactRecordPath(
  statePaths: RunnerStatePaths,
  artifactId: string
): string {
  return path.join(statePaths.artifactsRoot, `${artifactId}.json`);
}

function runnerTurnRecordPath(
  statePaths: RunnerStatePaths,
  turnId: string
): string {
  return path.join(statePaths.turnsRoot, `${turnId}.json`);
}

function focusedRegisterStatePath(statePaths: RunnerStatePaths): string {
  return path.join(statePaths.memoryStateRoot, "focused-register-state.json");
}

export async function readSessionRecord(
  statePaths: RunnerStatePaths,
  sessionId: string
): Promise<SessionRecord | undefined> {
  const filePath = sessionRecordPath(statePaths, sessionId);

  if (!(await pathExists(filePath))) {
    return undefined;
  }

  return sessionRecordSchema.parse(await readJsonFile(filePath));
}

export async function writeSessionRecord(
  statePaths: RunnerStatePaths,
  record: SessionRecord
): Promise<void> {
  await writeJsonFile(
    sessionRecordPath(statePaths, record.sessionId),
    sessionRecordSchema.parse(record)
  );
}

export async function readConversationRecord(
  statePaths: RunnerStatePaths,
  conversationId: string
): Promise<ConversationRecord | undefined> {
  const filePath = conversationRecordPath(statePaths, conversationId);

  if (!(await pathExists(filePath))) {
    return undefined;
  }

  return conversationRecordSchema.parse(await readJsonFile(filePath));
}

export async function writeConversationRecord(
  statePaths: RunnerStatePaths,
  record: ConversationRecord
): Promise<void> {
  await writeJsonFile(
    conversationRecordPath(statePaths, record.conversationId),
    conversationRecordSchema.parse(record)
  );
}

export async function listConversationRecords(
  statePaths: RunnerStatePaths
): Promise<ConversationRecord[]> {
  if (!(await pathExists(statePaths.conversationsRoot))) {
    return [];
  }

  const fileNames = (await readdir(statePaths.conversationsRoot))
    .filter((fileName) => fileName.endsWith(".json"))
    .sort();

  return Promise.all(
    fileNames.map(async (fileName) =>
      conversationRecordSchema.parse(
        await readJsonFile<unknown>(
          path.join(statePaths.conversationsRoot, fileName)
        )
      )
    )
  );
}

export async function writeApprovalRecord(
  statePaths: RunnerStatePaths,
  record: ApprovalRecord
): Promise<void> {
  await writeJsonFile(
    approvalRecordPath(statePaths, record.approvalId),
    approvalRecordSchema.parse(record)
  );
}

export async function readArtifactRecord(
  statePaths: RunnerStatePaths,
  artifactId: string
): Promise<ArtifactRecord | undefined> {
  const filePath = artifactRecordPath(statePaths, artifactId);

  if (!(await pathExists(filePath))) {
    return undefined;
  }

  return artifactRecordSchema.parse(await readJsonFile(filePath));
}

export async function writeArtifactRecord(
  statePaths: RunnerStatePaths,
  record: ArtifactRecord
): Promise<void> {
  await writeJsonFile(
    artifactRecordPath(statePaths, record.ref.artifactId),
    artifactRecordSchema.parse(record)
  );
}

export async function listArtifactRecords(
  statePaths: RunnerStatePaths
): Promise<ArtifactRecord[]> {
  if (!(await pathExists(statePaths.artifactsRoot))) {
    return [];
  }

  const fileNames = (await readdir(statePaths.artifactsRoot))
    .filter((fileName) => fileName.endsWith(".json"))
    .sort();

  return Promise.all(
    fileNames.map(async (fileName) =>
      artifactRecordSchema.parse(
        await readJsonFile<unknown>(path.join(statePaths.artifactsRoot, fileName))
      )
    )
  );
}

export async function readRunnerTurnRecord(
  statePaths: RunnerStatePaths,
  turnId: string
): Promise<RunnerTurnRecord | undefined> {
  const filePath = runnerTurnRecordPath(statePaths, turnId);

  if (!(await pathExists(filePath))) {
    return undefined;
  }

  return runnerTurnRecordSchema.parse(await readJsonFile(filePath));
}

export async function readFocusedRegisterState(
  statePaths: RunnerStatePaths
): Promise<FocusedRegisterState | undefined> {
  const filePath = focusedRegisterStatePath(statePaths);

  if (!(await pathExists(filePath))) {
    return undefined;
  }

  return focusedRegisterStateSchema.parse(await readJsonFile(filePath));
}

export async function writeFocusedRegisterState(
  statePaths: RunnerStatePaths,
  record: FocusedRegisterState
): Promise<void> {
  await writeJsonFile(
    focusedRegisterStatePath(statePaths),
    focusedRegisterStateSchema.parse(record)
  );
}

export async function writeRunnerTurnRecord(
  statePaths: RunnerStatePaths,
  record: RunnerTurnRecord
): Promise<void> {
  await writeJsonFile(
    runnerTurnRecordPath(statePaths, record.turnId),
    runnerTurnRecordSchema.parse(record)
  );
}

export async function listRunnerTurnRecords(
  statePaths: RunnerStatePaths
): Promise<RunnerTurnRecord[]> {
  if (!(await pathExists(statePaths.turnsRoot))) {
    return [];
  }

  const fileNames = (await readdir(statePaths.turnsRoot))
    .filter((fileName) => fileName.endsWith(".json"))
    .sort();

  return Promise.all(
    fileNames.map(async (fileName) =>
      runnerTurnRecordSchema.parse(
        await readJsonFile<unknown>(path.join(statePaths.turnsRoot, fileName))
      )
    )
  );
}

import { existsSync, readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  currentLocalStateLayoutVersion,
  localStateLayoutRecordSchema,
  minimumSupportedLocalStateLayoutVersion,
  type LocalStateLayoutInspection
} from "@entangle/types";
import {
  buildLocalDoctorReport,
  type LocalDoctorDeps,
  type LocalDoctorOptions,
  type LocalDoctorReport
} from "./local-doctor-command.js";

export type LocalRepairActionRisk = "safe" | "manual";
export type LocalRepairActionStatus =
  | "applied"
  | "blocked"
  | "manual"
  | "pending"
  | "skipped";

export interface LocalRepairAction {
  actionId: string;
  category: string;
  detail: string;
  risk: LocalRepairActionRisk;
  status: LocalRepairActionStatus;
  summary: string;
}

export interface LocalRepairOptions extends LocalDoctorOptions {
  applySafe?: boolean | undefined;
}

export interface LocalRepairReport {
  actions: LocalRepairAction[];
  applied: boolean;
  doctor: LocalDoctorReport;
  generatedAt: string;
  repairRecordPath?: string | undefined;
  status: "blocked" | "clean" | "manual" | "repaired" | "would_repair";
  summary: {
    applied: number;
    blocked: number;
    manual: number;
    pending: number;
    skipped: number;
  };
}

const hostStateRelativePath = ".entangle/host";
const hostStateSkeletonDirectories = [
  "desired",
  "observed",
  "traces",
  "imports",
  "workspaces",
  "cache"
];

function repairTimestampPathSegment(timestamp: string): string {
  return timestamp.replace(/[^0-9A-Za-z-]+/gu, "-");
}

function buildCurrentStateLayoutRecord(timestamp: string) {
  return {
    createdAt: timestamp,
    layoutVersion: currentLocalStateLayoutVersion,
    product: "entangle",
    schemaVersion: "1",
    updatedAt: timestamp
  };
}

function inspectLocalStateLayout(repositoryRoot: string): {
  recordedLayoutVersion?: number | undefined;
  status: LocalStateLayoutInspection["status"];
} {
  const hostStatePath = path.join(repositoryRoot, hostStateRelativePath);
  const layoutPath = path.join(hostStatePath, "state-layout.json");

  if (!existsSync(hostStatePath)) {
    return {
      status: "missing"
    };
  }

  if (!existsSync(layoutPath)) {
    return {
      status: "missing"
    };
  }

  let rawRecord: unknown;
  try {
    rawRecord = JSON.parse(readFileSync(layoutPath, "utf8")) as unknown;
  } catch {
    return {
      status: "unreadable"
    };
  }

  const parseResult = localStateLayoutRecordSchema.safeParse(rawRecord);
  if (!parseResult.success) {
    return {
      status: "unreadable"
    };
  }

  const record = parseResult.data;
  if (record.layoutVersion > currentLocalStateLayoutVersion) {
    return {
      recordedLayoutVersion: record.layoutVersion,
      status: "unsupported_future"
    };
  }

  if (record.layoutVersion < minimumSupportedLocalStateLayoutVersion) {
    return {
      recordedLayoutVersion: record.layoutVersion,
      status: "unsupported_legacy"
    };
  }

  if (record.layoutVersion < currentLocalStateLayoutVersion) {
    return {
      recordedLayoutVersion: record.layoutVersion,
      status: "upgrade_available"
    };
  }

  return {
    recordedLayoutVersion: record.layoutVersion,
    status: "current"
  };
}

function buildRepairActions(input: {
  repositoryRoot: string;
}): LocalRepairAction[] {
  const actions: LocalRepairAction[] = [];
  const hostStatePath = path.join(input.repositoryRoot, hostStateRelativePath);
  const hostStateExists = existsSync(hostStatePath);
  const layout = inspectLocalStateLayout(input.repositoryRoot);

  if (!hostStateExists) {
    actions.push({
      actionId: "initialize_host_state_skeleton",
      category: "state",
      detail:
        "Create .entangle/host, the standard host state directory skeleton, and the current state-layout.json marker.",
      risk: "safe",
      status: "pending",
      summary: "Initialize Local host state skeleton"
    });
    return actions;
  }

  if (layout.status === "missing") {
    actions.push({
      actionId: "stamp_missing_state_layout",
      category: "state",
      detail: "Write the current state-layout.json marker without modifying existing state files.",
      risk: "safe",
      status: "pending",
      summary: "Stamp missing Local state layout"
    });
  }

  if (layout.status === "unreadable") {
    actions.push({
      actionId: "inspect_unreadable_state_layout",
      category: "state",
      detail:
        "state-layout.json exists but cannot be parsed as the current Entangle local profile layout record.",
      risk: "manual",
      status: "blocked",
      summary: "Inspect unreadable Local state layout"
    });
  }

  if (
    layout.status === "unsupported_future" ||
    layout.status === "unsupported_legacy"
  ) {
    actions.push({
      actionId: "resolve_unsupported_state_layout",
      category: "state",
      detail:
        `Layout ${layout.recordedLayoutVersion ?? "unknown"} is ${layout.status}; ` +
        "back up .entangle/host and use a compatible Entangle version before repair.",
      risk: "manual",
      status: "blocked",
      summary: "Resolve unsupported Local state layout"
    });
  }

  return actions;
}

async function applySafeRepairActions(input: {
  actions: LocalRepairAction[];
  generatedAt: string;
  repositoryRoot: string;
}): Promise<LocalRepairAction[]> {
  const hostStatePath = path.join(input.repositoryRoot, hostStateRelativePath);
  const layoutPath = path.join(hostStatePath, "state-layout.json");
  const appliedActions: LocalRepairAction[] = [];

  for (const action of input.actions) {
    if (action.risk !== "safe" || action.status !== "pending") {
      appliedActions.push(action);
      continue;
    }

    if (action.actionId === "initialize_host_state_skeleton") {
      await Promise.all(
        hostStateSkeletonDirectories.map((directory) =>
          mkdir(path.join(hostStatePath, directory), { recursive: true })
        )
      );
      await writeFile(
        layoutPath,
        `${JSON.stringify(buildCurrentStateLayoutRecord(input.generatedAt), null, 2)}\n`,
        "utf8"
      );
      appliedActions.push({
        ...action,
        status: "applied"
      });
      continue;
    }

    if (action.actionId === "stamp_missing_state_layout") {
      await mkdir(hostStatePath, { recursive: true });
      await writeFile(
        layoutPath,
        `${JSON.stringify(buildCurrentStateLayoutRecord(input.generatedAt), null, 2)}\n`,
        "utf8"
      );
      appliedActions.push({
        ...action,
        status: "applied"
      });
      continue;
    }

    appliedActions.push({
      ...action,
      status: "skipped"
    });
  }

  return appliedActions;
}

async function writeRepairRecord(input: {
  actions: LocalRepairAction[];
  generatedAt: string;
  repositoryRoot: string;
  status: LocalRepairReport["status"];
  summary: LocalRepairReport["summary"];
}): Promise<string> {
  const repairRecordPath = path.join(
    input.repositoryRoot,
    hostStateRelativePath,
    "traces",
    "local-repairs",
    `repair-${repairTimestampPathSegment(input.generatedAt)}.json`
  );
  await mkdir(path.dirname(repairRecordPath), { recursive: true });
  await writeFile(
    repairRecordPath,
    `${JSON.stringify(
      {
        actions: input.actions,
        generatedAt: input.generatedAt,
        schemaVersion: "1",
        status: input.status,
        summary: input.summary
      },
      null,
      2
    )}\n`,
    "utf8"
  );
  return repairRecordPath;
}

function summarizeRepairActions(
  actions: LocalRepairAction[]
): LocalRepairReport["summary"] {
  return actions.reduce<LocalRepairReport["summary"]>(
    (summary, action) => ({
      ...summary,
      [action.status]: summary[action.status] + 1
    }),
    {
      applied: 0,
      blocked: 0,
      manual: 0,
      pending: 0,
      skipped: 0
    }
  );
}

function resolveRepairStatus(input: {
  applySafe: boolean | undefined;
  summary: LocalRepairReport["summary"];
}): LocalRepairReport["status"] {
  if (input.summary.blocked > 0) {
    return "blocked";
  }

  if (input.summary.manual > 0) {
    return "manual";
  }

  if (input.summary.applied > 0) {
    return "repaired";
  }

  if (!input.applySafe && input.summary.pending > 0) {
    return "would_repair";
  }

  return "clean";
}

export async function buildLocalRepairReport(
  options: LocalRepairOptions,
  deps: LocalDoctorDeps = {}
): Promise<LocalRepairReport> {
  const generatedAt = (deps.now ?? (() => new Date()))().toISOString();
  const doctor = await buildLocalDoctorReport(options, deps);
  const plannedActions = buildRepairActions({
    repositoryRoot: options.repositoryRoot
  });
  const actions = options.applySafe
    ? await applySafeRepairActions({
        actions: plannedActions,
        generatedAt,
        repositoryRoot: options.repositoryRoot
      })
    : plannedActions;
  const summary = summarizeRepairActions(actions);
  const status = resolveRepairStatus({
    applySafe: options.applySafe,
    summary
  });
  const repairRecordPath =
    options.applySafe && summary.applied > 0
      ? await writeRepairRecord({
          actions,
          generatedAt,
          repositoryRoot: options.repositoryRoot,
          status,
          summary
        })
      : undefined;

  return {
    actions,
    applied: Boolean(options.applySafe),
    doctor,
    generatedAt,
    ...(repairRecordPath ? { repairRecordPath } : {}),
    status,
    summary
  };
}

export function formatLocalRepairText(report: LocalRepairReport): string {
  const mode = report.applied ? "apply-safe" : "dry-run";
  const lines = [
    `Entangle local profile repair: ${report.status} (${mode}; ${report.summary.applied} applied, ${report.summary.pending} pending, ${report.summary.blocked} blocked, ${report.summary.manual} manual)`
  ];

  if (report.repairRecordPath) {
    lines.push(`record: ${report.repairRecordPath}`);
  }

  for (const action of report.actions) {
    lines.push(
      `${action.status.toUpperCase()} ${action.category}:${action.summary}: ${action.detail}`
    );
  }

  if (report.actions.length === 0) {
    lines.push("No conservative local repair actions are currently needed.");
  }

  return `${lines.join("\n")}\n`;
}

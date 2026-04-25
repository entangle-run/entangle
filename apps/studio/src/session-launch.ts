import type {
  RuntimeInspectionResponse,
  SessionLaunchRequest
} from "@entangle/types";

export type SessionLaunchDraft = {
  intent: string;
  summary: string;
};

export function createDefaultSessionLaunchDraft(
  runtime: RuntimeInspectionResponse | null | undefined
): SessionLaunchDraft {
  return {
    intent: "",
    summary: runtime ? `Inspect local state for ${runtime.nodeId}.` : ""
  };
}

export function isSessionLaunchDraftReady(
  runtime: RuntimeInspectionResponse | null | undefined,
  draft: SessionLaunchDraft
): boolean {
  return Boolean(runtime?.contextAvailable) && draft.summary.trim().length > 0;
}

export function buildSessionLaunchRequest(
  runtime: RuntimeInspectionResponse,
  draft: SessionLaunchDraft
): SessionLaunchRequest {
  const intent = draft.intent.trim();

  return {
    ...(intent ? { intent } : {}),
    summary: draft.summary.trim(),
    targetNodeId: runtime.nodeId
  };
}

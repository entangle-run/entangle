import {
  filterRuntimeSourceChangeCandidatesForPresentation,
  formatRuntimeSourceChangeCandidateDetailLines,
  formatRuntimeSourceChangeCandidateDiffStatus,
  formatRuntimeSourceChangeCandidateFilePreviewStatus,
  formatRuntimeSourceChangeCandidateLabel,
  formatRuntimeSourceChangeCandidateStatus,
  sortRuntimeSourceChangeCandidatesForPresentation,
  type RuntimeSourceChangeCandidateFilter
} from "@entangle/host-client";
import type {
  RuntimeSourceChangeCandidateDiffResponse,
  RuntimeSourceChangeCandidateFilePreviewResponse,
  SourceChangeCandidateRecord
} from "@entangle/types";

export interface RuntimeSourceChangeCandidateSummaryRecord {
  candidateId: string;
  detailLines: string[];
  label: string;
  sessionId?: string;
  status: SourceChangeCandidateRecord["status"];
  summary: string;
  turnId: string;
  updatedAt: string;
}

export interface RuntimeSourceChangeCandidateDiffSummaryRecord {
  available: boolean;
  candidateId: string;
  contentType?: "text/x-diff";
  previewBytes?: number;
  status: string;
  truncated?: boolean;
}

export interface RuntimeSourceChangeCandidateFilePreviewSummaryRecord {
  available: boolean;
  candidateId: string;
  contentType?: "text/markdown" | "text/plain";
  path: string;
  previewBytes?: number;
  status: string;
  truncated?: boolean;
}

export function sortRuntimeSourceChangeCandidatesForCli(
  candidates: SourceChangeCandidateRecord[]
): SourceChangeCandidateRecord[] {
  return sortRuntimeSourceChangeCandidatesForPresentation(candidates);
}

export function filterRuntimeSourceChangeCandidatesForCli(
  candidates: SourceChangeCandidateRecord[],
  filter: RuntimeSourceChangeCandidateFilter = {}
): SourceChangeCandidateRecord[] {
  return filterRuntimeSourceChangeCandidatesForPresentation(candidates, filter);
}

export function projectRuntimeSourceChangeCandidateSummary(
  candidate: SourceChangeCandidateRecord
): RuntimeSourceChangeCandidateSummaryRecord {
  return {
    candidateId: candidate.candidateId,
    detailLines: formatRuntimeSourceChangeCandidateDetailLines(candidate),
    label: formatRuntimeSourceChangeCandidateLabel(candidate),
    ...(candidate.sessionId ? { sessionId: candidate.sessionId } : {}),
    status: candidate.status,
    summary: formatRuntimeSourceChangeCandidateStatus(candidate),
    turnId: candidate.turnId,
    updatedAt: candidate.updatedAt
  };
}

export function projectRuntimeSourceChangeCandidateDiffSummary(
  response: RuntimeSourceChangeCandidateDiffResponse
): RuntimeSourceChangeCandidateDiffSummaryRecord {
  return {
    available: response.diff.available,
    candidateId: response.candidate.candidateId,
    ...(response.diff.available
      ? {
          contentType: response.diff.contentType,
          previewBytes: response.diff.bytesRead,
          truncated: response.diff.truncated
        }
      : {}),
    status: formatRuntimeSourceChangeCandidateDiffStatus(response)
  };
}

export function projectRuntimeSourceChangeCandidateFilePreviewSummary(
  response: RuntimeSourceChangeCandidateFilePreviewResponse
): RuntimeSourceChangeCandidateFilePreviewSummaryRecord {
  return {
    available: response.preview.available,
    candidateId: response.candidate.candidateId,
    path: response.path,
    ...(response.preview.available
      ? {
          contentType: response.preview.contentType,
          previewBytes: response.preview.bytesRead,
          truncated: response.preview.truncated
        }
      : {}),
    status: formatRuntimeSourceChangeCandidateFilePreviewStatus(response)
  };
}

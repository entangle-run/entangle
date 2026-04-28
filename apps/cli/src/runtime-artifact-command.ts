import {
  filterRuntimeArtifactsForPresentation,
  formatRuntimeArtifactDetailLines,
  formatRuntimeArtifactDiffStatus,
  formatRuntimeArtifactHistoryLines,
  formatRuntimeArtifactHistoryStatus,
  formatRuntimeArtifactLabel,
  formatRuntimeArtifactLocator,
  formatRuntimeArtifactStatus,
  sortRuntimeArtifactsForPresentation,
  type RuntimeArtifactPresentationFilterOptions
} from "@entangle/host-client";
import type {
  ArtifactRecord,
  RuntimeArtifactDiffResponse,
  RuntimeArtifactHistoryResponse,
  RuntimeArtifactPreviewResponse
} from "@entangle/types";

export type RuntimeArtifactCliFilterOptions =
  RuntimeArtifactPresentationFilterOptions;

export const filterRuntimeArtifactsForCli =
  filterRuntimeArtifactsForPresentation;
export const sortRuntimeArtifactsForCli = sortRuntimeArtifactsForPresentation;

export interface RuntimeArtifactCliSummaryRecord {
  artifactId: string;
  backend: ArtifactRecord["ref"]["backend"];
  detailLines: string[];
  kind?: ArtifactRecord["ref"]["artifactKind"];
  label: string;
  lifecycleState?: ArtifactRecord["ref"]["status"];
  locator: string;
  publicationState: "not_requested" | NonNullable<
    ArtifactRecord["publication"]
  >["state"];
  retrievalState: "not_retrieved" | NonNullable<
    ArtifactRecord["retrieval"]
  >["state"];
  sessionId?: string;
  status: string;
  turnId?: string;
  updatedAt: string;
}

export function projectRuntimeArtifactSummary(
  artifact: ArtifactRecord
): RuntimeArtifactCliSummaryRecord {
  return {
    artifactId: artifact.ref.artifactId,
    backend: artifact.ref.backend,
    detailLines: formatRuntimeArtifactDetailLines(artifact),
    ...(artifact.ref.artifactKind ? { kind: artifact.ref.artifactKind } : {}),
    label: formatRuntimeArtifactLabel(artifact),
    locator: formatRuntimeArtifactLocator(artifact),
    ...(artifact.ref.status ? { lifecycleState: artifact.ref.status } : {}),
    publicationState: artifact.publication?.state ?? "not_requested",
    retrievalState: artifact.retrieval?.state ?? "not_retrieved",
    ...(artifact.ref.sessionId ? { sessionId: artifact.ref.sessionId } : {}),
    status: formatRuntimeArtifactStatus(artifact),
    ...(artifact.turnId ? { turnId: artifact.turnId } : {}),
    updatedAt: artifact.updatedAt
  };
}

export interface RuntimeArtifactCliPreviewSummaryRecord {
  artifact: RuntimeArtifactCliSummaryRecord;
  preview:
    | {
        available: true;
        bytesRead: number;
        contentType: Extract<
          RuntimeArtifactPreviewResponse["preview"],
          { available: true }
        >["contentType"];
        sourcePath?: string | undefined;
        truncated: boolean;
      }
    | {
        available: false;
        reason: string;
      };
}

export function projectRuntimeArtifactPreviewSummary(
  response: RuntimeArtifactPreviewResponse
): RuntimeArtifactCliPreviewSummaryRecord {
  return {
    artifact: projectRuntimeArtifactSummary(response.artifact),
    preview: response.preview.available
      ? {
          available: true,
          bytesRead: response.preview.bytesRead,
          contentType: response.preview.contentType,
          sourcePath: response.preview.sourcePath,
          truncated: response.preview.truncated
        }
      : {
          available: false,
          reason: response.preview.reason
        }
  };
}

export interface RuntimeArtifactCliHistorySummaryRecord {
  artifact: RuntimeArtifactCliSummaryRecord;
  history:
    | {
        available: true;
        commits: Array<{
          abbreviatedCommit: string;
          committedAt: string;
          subject: string;
        }>;
        inspectedPath: string;
        lines: string[];
        status: string;
        truncated: boolean;
      }
    | {
        available: false;
        reason: string;
        status: string;
      };
}

export function projectRuntimeArtifactHistorySummary(
  response: RuntimeArtifactHistoryResponse
): RuntimeArtifactCliHistorySummaryRecord {
  return {
    artifact: projectRuntimeArtifactSummary(response.artifact),
    history: response.history.available
      ? {
          available: true,
          commits: response.history.commits.map((commit) => ({
            abbreviatedCommit: commit.abbreviatedCommit,
            committedAt: commit.committedAt,
            subject: commit.subject
          })),
          inspectedPath: response.history.inspectedPath,
          lines: formatRuntimeArtifactHistoryLines(response.history),
          status: formatRuntimeArtifactHistoryStatus(response.history),
          truncated: response.history.truncated
        }
      : {
          available: false,
          reason: response.history.reason,
          status: formatRuntimeArtifactHistoryStatus(response.history)
        }
  };
}

export interface RuntimeArtifactCliDiffSummaryRecord {
  artifact: RuntimeArtifactCliSummaryRecord;
  diff:
    | {
        available: true;
        bytesRead: number;
        contentType: Extract<
          RuntimeArtifactDiffResponse["diff"],
          { available: true }
        >["contentType"];
        fromCommit: string;
        status: string;
        toCommit: string;
        truncated: boolean;
      }
    | {
        available: false;
        reason: string;
        status: string;
      };
}

export function projectRuntimeArtifactDiffSummary(
  response: RuntimeArtifactDiffResponse
): RuntimeArtifactCliDiffSummaryRecord {
  return {
    artifact: projectRuntimeArtifactSummary(response.artifact),
    diff: response.diff.available
      ? {
          available: true,
          bytesRead: response.diff.bytesRead,
          contentType: response.diff.contentType,
          fromCommit: response.diff.fromCommit,
          status: formatRuntimeArtifactDiffStatus(response.diff),
          toCommit: response.diff.toCommit,
          truncated: response.diff.truncated
        }
      : {
          available: false,
          reason: response.diff.reason,
          status: formatRuntimeArtifactDiffStatus(response.diff)
        }
  };
}

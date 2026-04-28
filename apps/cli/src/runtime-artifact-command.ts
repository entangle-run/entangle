import {
  filterRuntimeArtifactsForPresentation,
  formatRuntimeArtifactDetailLines,
  formatRuntimeArtifactDiffStatus,
  formatRuntimeArtifactHistoryLines,
  formatRuntimeArtifactHistoryStatus,
  formatRuntimeArtifactLabel,
  formatRuntimeArtifactLocator,
  formatRuntimeArtifactPromotionStatus,
  formatRuntimeArtifactRestoreStatus,
  formatRuntimeArtifactStatus,
  sortRuntimeArtifactsForPresentation,
  type RuntimeArtifactPresentationFilterOptions
} from "@entangle/host-client";
import type {
  ArtifactRecord,
  RuntimeArtifactDiffResponse,
  RuntimeArtifactHistoryResponse,
  RuntimeArtifactPromotionRecord,
  RuntimeArtifactPromotionResponse,
  RuntimeArtifactPreviewResponse,
  RuntimeArtifactRestoreRecord,
  RuntimeArtifactRestoreResponse
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

export interface RuntimeArtifactCliRestoreSummaryRecord {
  artifact: RuntimeArtifactCliSummaryRecord;
  restore:
    | {
        available: true;
        mode: RuntimeArtifactRestoreResponse["restore"]["mode"];
        restoredFileCount: number;
        restoredPath: string;
        restoreId: string;
        status: string;
      }
    | {
        available: false;
        reason: string;
        restoreId: string;
        status: string;
      };
}

export function projectRuntimeArtifactRestoreSummary(
  response: RuntimeArtifactRestoreResponse
): RuntimeArtifactCliRestoreSummaryRecord {
  return {
    artifact: projectRuntimeArtifactSummary(response.artifact),
    restore:
      response.restore.status === "restored"
        ? {
            available: true,
            mode: response.restore.mode,
            restoredFileCount: response.restore.restoredFileCount ?? 0,
            restoredPath: response.restore.restoredPath ?? "",
            restoreId: response.restore.restoreId,
            status: formatRuntimeArtifactRestoreStatus(response.restore)
          }
        : {
            available: false,
            reason:
              response.restore.unavailableReason ??
              "Artifact restore is unavailable.",
            restoreId: response.restore.restoreId,
            status: formatRuntimeArtifactRestoreStatus(response.restore)
          }
  };
}

export interface RuntimeArtifactCliRestoreRecordSummary {
  artifactId: string;
  createdAt: string;
  mode: RuntimeArtifactRestoreRecord["mode"];
  restoredFileCount?: number;
  restoredPath?: string;
  restoreId: string;
  source: RuntimeArtifactRestoreRecord["source"];
  status: string;
  unavailableReason?: string;
  updatedAt: string;
}

export function projectRuntimeArtifactRestoreRecordSummary(
  restore: RuntimeArtifactRestoreRecord
): RuntimeArtifactCliRestoreRecordSummary {
  return {
    artifactId: restore.artifactId,
    createdAt: restore.createdAt,
    mode: restore.mode,
    ...(restore.restoredFileCount !== undefined
      ? { restoredFileCount: restore.restoredFileCount }
      : {}),
    ...(restore.restoredPath ? { restoredPath: restore.restoredPath } : {}),
    restoreId: restore.restoreId,
    source: restore.source,
    status: formatRuntimeArtifactRestoreStatus(restore),
    ...(restore.unavailableReason
      ? { unavailableReason: restore.unavailableReason }
      : {}),
    updatedAt: restore.updatedAt
  };
}

export interface RuntimeArtifactCliPromotionSummaryRecord {
  artifact: RuntimeArtifactCliSummaryRecord;
  promotion:
    | {
        approvalId: string;
        available: true;
        promotedFileCount: number;
        promotedPath: string;
        promotionId: string;
        restoreId: string;
        status: string;
        target: RuntimeArtifactPromotionResponse["promotion"]["target"];
      }
    | {
        approvalId: string;
        available: false;
        promotionId: string;
        reason: string;
        restoreId: string;
        status: string;
        target: RuntimeArtifactPromotionResponse["promotion"]["target"];
      };
  restore: RuntimeArtifactCliRestoreRecordSummary;
}

export function projectRuntimeArtifactPromotionSummary(
  response: RuntimeArtifactPromotionResponse
): RuntimeArtifactCliPromotionSummaryRecord {
  return {
    artifact: projectRuntimeArtifactSummary(response.artifact),
    promotion:
      response.promotion.status === "promoted"
        ? {
            approvalId: response.promotion.approvalId,
            available: true,
            promotedFileCount: response.promotion.promotedFileCount ?? 0,
            promotedPath: response.promotion.promotedPath ?? "",
            promotionId: response.promotion.promotionId,
            restoreId: response.promotion.restoreId,
            status: formatRuntimeArtifactPromotionStatus(response.promotion),
            target: response.promotion.target
          }
        : {
            approvalId: response.promotion.approvalId,
            available: false,
            promotionId: response.promotion.promotionId,
            reason:
              response.promotion.unavailableReason ??
              "Artifact promotion is unavailable.",
            restoreId: response.promotion.restoreId,
            status: formatRuntimeArtifactPromotionStatus(response.promotion),
            target: response.promotion.target
          },
    restore: projectRuntimeArtifactRestoreRecordSummary(response.restore)
  };
}

export interface RuntimeArtifactCliPromotionRecordSummary {
  approvalId: string;
  artifactId: string;
  createdAt: string;
  promotedFileCount?: number;
  promotedPath?: string;
  promotionId: string;
  restoreId: string;
  status: string;
  target: RuntimeArtifactPromotionRecord["target"];
  unavailableReason?: string;
  updatedAt: string;
}

export function projectRuntimeArtifactPromotionRecordSummary(
  promotion: RuntimeArtifactPromotionRecord
): RuntimeArtifactCliPromotionRecordSummary {
  return {
    approvalId: promotion.approvalId,
    artifactId: promotion.artifactId,
    createdAt: promotion.createdAt,
    ...(promotion.promotedFileCount !== undefined
      ? { promotedFileCount: promotion.promotedFileCount }
      : {}),
    ...(promotion.promotedPath
      ? { promotedPath: promotion.promotedPath }
      : {}),
    promotionId: promotion.promotionId,
    restoreId: promotion.restoreId,
    status: formatRuntimeArtifactPromotionStatus(promotion),
    target: promotion.target,
    ...(promotion.unavailableReason
      ? { unavailableReason: promotion.unavailableReason }
      : {}),
    updatedAt: promotion.updatedAt
  };
}

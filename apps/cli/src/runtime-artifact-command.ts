import {
  filterRuntimeArtifactsForPresentation,
  formatRuntimeArtifactDetailLines,
  formatRuntimeArtifactLabel,
  formatRuntimeArtifactLocator,
  formatRuntimeArtifactStatus,
  sortRuntimeArtifactsForPresentation,
  type RuntimeArtifactPresentationFilterOptions
} from "@entangle/host-client";
import type { ArtifactRecord } from "@entangle/types";

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

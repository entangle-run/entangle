import { describe, expect, it } from "vitest";
import type {
  GraphRevisionInspectionResponse,
  GraphRevisionMetadata
} from "@entangle/types";
import {
  formatGraphRevisionDetail,
  formatGraphRevisionInspectionSummary,
  formatGraphRevisionLabel,
  sortGraphRevisions
} from "./graph-revision-inspection.js";

function createRevision(
  revisionId: string,
  appliedAt: string,
  isActive = false
): GraphRevisionMetadata {
  return {
    appliedAt,
    graphId: "team-alpha",
    isActive,
    revisionId
  };
}

describe("studio graph revision inspection helpers", () => {
  it("sorts graph revisions by newest apply time first", () => {
    const older = createRevision(
      "team-alpha-20260424-100000",
      "2026-04-24T10:00:00.000Z"
    );
    const newer = createRevision(
      "team-alpha-20260424-110000",
      "2026-04-24T11:00:00.000Z",
      true
    );

    expect(sortGraphRevisions([older, newer]).map((revision) => revision.revisionId)).toEqual([
      "team-alpha-20260424-110000",
      "team-alpha-20260424-100000"
    ]);
  });

  it("formats revision list and detail summaries", () => {
    const revision = createRevision(
      "team-alpha-20260424-110000",
      "2026-04-24T11:00:00.000Z",
      true
    );
    const inspection: GraphRevisionInspectionResponse = {
      graph: {
        defaults: {
          resourceBindings: {
            externalPrincipalRefs: [],
            gitServiceRefs: [],
            relayProfileRefs: []
          },
          runtimeProfile: "hackathon_local"
        },
        edges: [],
        graphId: "team-alpha",
        name: "Team Alpha",
        nodes: [
          {
            autonomy: {
              canInitiateSessions: false,
              canMutateGraph: false
            },
            displayName: "Worker",
            nodeId: "worker-it",
            nodeKind: "worker",
            packageSourceRef: "worker-it",
            resourceBindings: {
              externalPrincipalRefs: [],
              gitServiceRefs: [],
              relayProfileRefs: []
            }
          }
        ],
        schemaVersion: "1"
      },
      revision
    };

    expect(formatGraphRevisionLabel(revision)).toBe(
      "team-alpha-20260424-110000 · active"
    );
    expect(formatGraphRevisionDetail(revision)).toBe(
      "team-alpha · applied 2026-04-24T11:00:00.000Z"
    );
    expect(formatGraphRevisionInspectionSummary(inspection)).toBe(
      "1 nodes · 0 edges"
    );
  });
});

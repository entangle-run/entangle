import { afterEach, describe, expect, it, vi } from "vitest";
import type {
  RuntimeCommandReceiptProjectionRecord,
  UserNodeMessageRecord,
  WikiRefProjectionRecord
} from "@entangle/types";
import {
  buildWikiPageChangePreview,
  buildWikiPageConflictSummary,
  buildWikiPageDraftFromProjection,
  buildWikiPageNextContentPreview,
  buildUserClientReviewQueueGroups,
  buildUserClientReviewQueue,
  buildRuntimeApiUrl,
  chooseConversationId,
  computeUtf8Sha256Hex,
  fetchArtifactDiff,
  fetchArtifactHistory,
  fetchArtifactPreview,
  fetchSourceChangeDiff,
  fetchSourceChangeFilePreview,
  findLatestWikiPageConflictSummary,
  formatDeliveryLabel,
  formatRuntimeCommandReceiptDetailLines,
  formatSignerLabel,
  formatUserClientReviewQueueGroup,
  formatUserClientReviewQueueItem,
  formatUserClientWorkloadLines,
  formatWikiPageConflictSummaryLines,
  markConversationRead,
  normalizeApiBaseUrl,
  proposeArtifactSourceChange,
  publishApprovalResponse,
  publishSourceHistory,
  publishWikiRepository,
  patchWikiPages,
  reconcileSourceHistory,
  restoreArtifact,
  reviewSourceChangeCandidate,
  summarizeUserClientWorkload,
  type UserClientState,
  upsertWikiPage
} from "./runtime-api.js";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("user client runtime API helpers", () => {
  it("normalizes runtime API URLs for same-origin and proxied clients", () => {
    expect(normalizeApiBaseUrl(" http://127.0.0.1:4300/ ")).toBe(
      "http://127.0.0.1:4300"
    );
    expect(buildRuntimeApiUrl("/api/state", "")).toBe("/api/state");
    expect(buildRuntimeApiUrl("/api/state", "http://127.0.0.1:4300")).toBe(
      "http://127.0.0.1:4300/api/state"
    );
  });

  it("keeps a selected conversation only while it remains projected", () => {
    const conversations = [
      {
        conversationId: "conversation-alpha"
      },
      {
        conversationId: "conversation-beta"
      }
    ] as Parameters<typeof chooseConversationId>[0]["conversations"];

    expect(
      chooseConversationId({
        conversations,
        currentConversationId: "conversation-beta"
      })
    ).toBe("conversation-beta");
    expect(
      chooseConversationId({
        conversations,
        currentConversationId: "missing"
      })
    ).toBe("conversation-alpha");
  });

  it("formats delivery status without exposing relay internals by default", () => {
    expect(
      formatDeliveryLabel({
        direction: "inbound",
        publishedRelays: [],
        relayUrls: []
      } as unknown as Parameters<typeof formatDeliveryLabel>[0])
    ).toBe("received");
    expect(
      formatDeliveryLabel({
        deliveryStatus: "failed",
        direction: "outbound",
        publishedRelays: [],
        relayUrls: ["ws://relay.test"]
      } as unknown as Parameters<typeof formatDeliveryLabel>[0])
    ).toBe("failed 0/1");
  });

  it("formats message signer audit labels", () => {
    expect(
      formatSignerLabel({
        fromPubkey:
          "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        signerPubkey:
          "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
      } as Parameters<typeof formatSignerLabel>[0])
    ).toBe("signed aaaaaaaa");
    expect(
      formatSignerLabel({
        fromPubkey:
          "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        signerPubkey:
          "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
      } as Parameters<typeof formatSignerLabel>[0])
    ).toBe("signer mismatch");
    expect(
      formatSignerLabel({
        fromPubkey:
          "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
      } as Parameters<typeof formatSignerLabel>[0])
    ).toBeUndefined();
  });

  it("formats participant command receipt detail lines", () => {
    expect(
      formatRuntimeCommandReceiptDetailLines({
        assignmentId: "assignment-alpha",
        commandEventType: "runtime.wiki.upsert_page",
        commandId: "cmd-wiki-page",
        graphId: "graph-alpha",
        hostAuthorityPubkey:
          "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        nodeId: "worker-it",
        observedAt: "2026-05-05T12:00:00.000Z",
        projection: {
          source: "observation_event",
          updatedAt: "2026-05-05T12:00:00.000Z"
        },
        receiptStatus: "completed",
        requestedBy: "user-main",
        runnerId: "runner-alpha",
        runnerPubkey:
          "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        targetPath: "wiki/summaries/working-context.md",
        wikiArtifactId: "wiki-alpha",
        wikiPageExpectedSha256:
          "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
        wikiPageNextSha256:
          "dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
        wikiPagePath: "wiki/summaries/working-context.md",
        wikiPagePreviousSha256:
          "eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"
      })
    ).toEqual([
      "node worker-it",
      "runner runner-alpha",
      "assignment assignment-alpha",
      "observed 2026-05-05T12:00:00.000Z",
      "target wiki/summaries/working-context.md",
      "wiki artifact wiki-alpha",
      "wiki page wiki/summaries/working-context.md",
      "wiki expected cccccccccccc",
      "wiki previous eeeeeeeeeeee",
      "wiki next dddddddddddd"
    ]);
  });

  it("summarizes failed wiki page stale-edit receipts", () => {
    const receipt = {
      commandEventType: "runtime.wiki.upsert_page",
      commandId: "cmd-wiki-page",
      graphId: "graph-alpha",
      hostAuthorityPubkey:
        "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      nodeId: "worker-it",
      observedAt: "2026-05-05T12:00:00.000Z",
      projection: {
        source: "observation_event",
        updatedAt: "2026-05-05T12:00:00.000Z"
      },
      receiptStatus: "failed",
      runnerId: "runner-alpha",
      runnerPubkey:
        "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      targetPath: "wiki/summaries/working-context.md",
      wikiPageExpectedSha256:
        "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
      wikiPagePath: "wiki/summaries/working-context.md",
      wikiPagePreviousSha256:
        "eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"
    } as const;
    const summary = buildWikiPageConflictSummary(receipt);

    expect(summary).toEqual({
      commandId: "cmd-wiki-page",
      currentSha256:
        "eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
      currentShort: "eeeeeeeeeeee",
      expectedSha256:
        "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
      expectedShort: "cccccccccccc",
      path: "wiki/summaries/working-context.md"
    });
    expect(formatWikiPageConflictSummaryLines(summary!)).toEqual([
      "page wiki/summaries/working-context.md",
      "expected cccccccccccc",
      "current eeeeeeeeeeee",
      "command cmd-wiki-page"
    ]);
    expect(
      buildWikiPageConflictSummary({
        ...receipt,
        receiptStatus: "completed"
      })
    ).toBeUndefined();
  });

  it("selects the latest wiki conflict matching a page path", () => {
    const receipts = [
      {
        commandEventType: "runtime.wiki.upsert_page",
        commandId: "cmd-other",
        graphId: "graph-alpha",
        hostAuthorityPubkey:
          "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        nodeId: "worker-it",
        observedAt: "2026-05-05T12:01:00.000Z",
        projection: {
          source: "observation_event",
          updatedAt: "2026-05-05T12:01:00.000Z"
        },
        receiptStatus: "failed",
        runnerId: "runner-alpha",
        runnerPubkey:
          "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        wikiPageExpectedSha256:
          "1111111111111111111111111111111111111111111111111111111111111111",
        wikiPagePath: "wiki/other.md",
        wikiPagePreviousSha256:
          "2222222222222222222222222222222222222222222222222222222222222222"
      },
      {
        commandEventType: "runtime.wiki.patch_set",
        commandId: "cmd-target",
        graphId: "graph-alpha",
        hostAuthorityPubkey:
          "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        nodeId: "worker-it",
        observedAt: "2026-05-05T12:00:00.000Z",
        projection: {
          source: "observation_event",
          updatedAt: "2026-05-05T12:00:00.000Z"
        },
        receiptStatus: "failed",
        runnerId: "runner-alpha",
        runnerPubkey:
          "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        wikiPageExpectedSha256:
          "3333333333333333333333333333333333333333333333333333333333333333",
        wikiPagePath: "/wiki/summaries/working-context.md",
        wikiPagePreviousSha256:
          "4444444444444444444444444444444444444444444444444444444444444444"
      }
    ] as RuntimeCommandReceiptProjectionRecord[];

    expect(
      findLatestWikiPageConflictSummary({
        path: "wiki/summaries/working-context.md",
        receipts
      })
    ).toMatchObject({
      commandId: "cmd-target",
      currentShort: "444444444444",
      expectedShort: "333333333333",
      path: "/wiki/summaries/working-context.md"
    });
    expect(
      findLatestWikiPageConflictSummary({
        path: "wiki/missing.md",
        receipts
      })
    ).toBeUndefined();
    expect(findLatestWikiPageConflictSummary({ receipts })).toMatchObject({
      commandId: "cmd-other"
    });
  });

  it("summarizes User Client workload from projected state", () => {
    const state = {
      conversations: [
        {
          conversationId: "conversation-alpha",
          pendingApprovalIds: ["approval-alpha", "approval-beta"],
          projection: {
            source: "observation_event",
            updatedAt: "2026-05-05T12:00:00.000Z"
          },
          status: "working",
          unreadCount: 2
        },
        {
          conversationId: "conversation-beta",
          pendingApprovalIds: ["approval-alpha"],
          projection: {
            source: "observation_event",
            updatedAt: "2026-05-05T12:00:00.000Z"
          },
          status: "closed",
          unreadCount: 1
        }
      ],
      runtimeCommandReceipts: [
        {
          commandEventType: "runtime.wiki.publish",
          commandId: "cmd-received",
          graphId: "graph-alpha",
          hostAuthorityPubkey:
            "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          nodeId: "worker-it",
          observedAt: "2026-05-05T12:00:00.000Z",
          projection: {
            source: "observation_event",
            updatedAt: "2026-05-05T12:00:00.000Z"
          },
          receiptStatus: "received",
          runnerId: "runner-alpha",
          runnerPubkey:
            "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
        },
        {
          commandEventType: "runtime.wiki.publish",
          commandId: "cmd-completed",
          graphId: "graph-alpha",
          hostAuthorityPubkey:
            "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          nodeId: "worker-it",
          observedAt: "2026-05-05T12:00:01.000Z",
          projection: {
            source: "observation_event",
            updatedAt: "2026-05-05T12:00:01.000Z"
          },
          receiptStatus: "completed",
          runnerId: "runner-alpha",
          runnerPubkey:
            "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
        },
        {
          commandEventType: "runtime.wiki.publish",
          commandId: "cmd-failed",
          graphId: "graph-alpha",
          hostAuthorityPubkey:
            "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          nodeId: "worker-it",
          observedAt: "2026-05-05T12:00:02.000Z",
          projection: {
            source: "observation_event",
            updatedAt: "2026-05-05T12:00:02.000Z"
          },
          receiptStatus: "failed",
          runnerId: "runner-alpha",
          runnerPubkey:
            "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
        }
      ],
      sourceChangeRefs: [
        {
          candidateId: "candidate-alpha",
          status: "pending_review"
        }
      ],
      sourceHistoryRefs: [{}],
      targets: [{ channel: "graph", nodeId: "worker-it", relation: "delegates_to" }],
      wikiRefs: [{}, {}]
    } as unknown as UserClientState;
    const summary = summarizeUserClientWorkload(state);

    expect(summary).toMatchObject({
      commandReceipts: {
        completed: 1,
        failed: 1,
        received: 1
      },
      conversationCount: 2,
      openConversationCount: 1,
      pendingApprovalCount: 2,
      pendingSourceChangeCount: 1,
      sourceHistoryRefCount: 1,
      targetCount: 1,
      unreadCount: 3,
      wikiRefCount: 2
    });
    expect(formatUserClientWorkloadLines(summary)).toContain(
      "2 pending approvals"
    );
    expect(formatUserClientWorkloadLines(summary)).toContain(
      "1 received, 1 completed, 1 failed commands"
    );
  });

  it("builds a grouped participant review queue from projected state", () => {
    const state = {
      conversations: [
        {
          conversationId: "conversation-old",
          lastMessageAt: "2026-05-05T12:01:00.000Z",
          peerNodeId: "reviewer-it",
          pendingApprovalIds: ["approval-shared", "approval-old"],
          projection: {
            source: "observation_event",
            updatedAt: "2026-05-05T12:01:00.000Z"
          },
          status: "awaiting_approval",
          unreadCount: 1
        },
        {
          conversationId: "conversation-new",
          lastMessageAt: "2026-05-05T12:03:00.000Z",
          peerNodeId: "worker-it",
          pendingApprovalIds: ["approval-new", "approval-shared"],
          projection: {
            source: "observation_event",
            updatedAt: "2026-05-05T12:03:00.000Z"
          },
          status: "working",
          unreadCount: 2
        }
      ],
      runtimeCommandReceipts: [],
      sourceChangeRefs: [
        {
          candidate: {
            candidateId: "candidate-alpha",
            createdAt: "2026-05-05T12:00:00.000Z",
            graphId: "graph-alpha",
            nodeId: "worker-it",
            sourceChangeSummary: {
              additions: 8,
              deletions: 2,
              fileCount: 2,
              files: []
            },
            status: "pending_review",
            turnId: "turn-alpha",
            updatedAt: "2026-05-05T12:02:00.000Z"
          },
          candidateId: "candidate-alpha",
          nodeId: "worker-it",
          projection: {
            source: "observation_event",
            updatedAt: "2026-05-05T12:02:00.000Z"
          },
          sourceChangeSummary: {
            additions: 8,
            deletions: 2,
            fileCount: 2,
            files: []
          },
          status: "pending_review"
        },
        {
          candidateId: "candidate-done",
          nodeId: "worker-it",
          projection: {
            source: "observation_event",
            updatedAt: "2026-05-05T12:04:00.000Z"
          },
          status: "accepted"
        }
      ],
      sourceHistoryRefs: [],
      targets: [],
      wikiRefs: []
    } as unknown as UserClientState;
    const queue = buildUserClientReviewQueue(state);

    expect(queue.map((item) => item.id)).toEqual([
      "approval:approval-new",
      "approval:approval-shared",
      "approval:approval-old",
      "source_change:candidate-alpha"
    ]);
    expect(queue[1]).toMatchObject({
      approvalId: "approval-shared",
      conversationId: "conversation-new",
      kind: "approval",
      peerNodeId: "worker-it"
    });
    expect(formatUserClientReviewQueueItem(queue[3]!)).toBe(
      "source change candidate-alpha · worker-it · 2 files +8 -2 · conversation-new"
    );

    const groups = buildUserClientReviewQueueGroups(queue);

    expect(groups.map((group) => group.groupId)).toEqual([
      "peer:worker-it",
      "peer:reviewer-it"
    ]);
    expect(groups[0]).toMatchObject({
      approvalCount: 2,
      itemCount: 3,
      label: "worker-it",
      sourceChangeCount: 1
    });
    expect(groups[0]?.conversationIds).toEqual(["conversation-new"]);
    expect(formatUserClientReviewQueueGroup(groups[0]!)).toBe(
      "worker-it · 3 reviews · 2 approvals · 1 source change"
    );
  });

  it("builds wiki page drafts only from complete projected previews", () => {
    const baseRef = {
      artifactId: "wiki-page-alpha",
      artifactPreview: {
        available: true,
        bytesRead: 28,
        content: "# Working Context\n\nCurrent.",
        contentEncoding: "utf8",
        contentType: "text/markdown",
        truncated: false
      },
      artifactRef: {
        artifactId: "wiki-page-alpha",
        artifactKind: "wiki_page",
        backend: "wiki",
        contentSummary: "Working context",
        locator: {
          nodeId: "worker-it",
          path: "/wiki/working-context.md"
        },
        preferred: true,
        status: "materialized"
      },
      graphId: "graph-alpha",
      hostAuthorityPubkey:
        "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      nodeId: "worker-it",
      projection: {
        source: "observation_event",
        updatedAt: "2026-05-05T12:00:00.000Z"
      },
      runnerId: "runner-alpha",
      runnerPubkey:
        "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
    } satisfies WikiRefProjectionRecord;

    expect(buildWikiPageDraftFromProjection(baseRef)).toEqual({
      artifactId: "wiki-page-alpha",
      content: "# Working Context\n\nCurrent.",
      path: "wiki/working-context.md"
    });
    expect(
      buildWikiPageDraftFromProjection({
        ...baseRef,
        artifactPreview: {
          ...baseRef.artifactPreview,
          truncated: true
        }
      })
    ).toBeUndefined();
  });

  it("computes UTF-8 SHA-256 hashes for wiki page stale-edit guards", async () => {
    await expect(computeUtf8Sha256Hex("Current.")).resolves.toBe(
      "9bc87a3384e31a6c677862caf16d000f2fbd80613d8a6b7b3c70c9909c448f8a"
    );
  });

  it("builds wiki page change previews from reviewed draft content", () => {
    expect(
      buildWikiPageNextContentPreview({
        baseContent: "# Notes\n\nOld\n",
        content: "# Notes\n\nNew",
        mode: "replace"
      })
    ).toBe("# Notes\n\nNew\n");

    expect(
      buildWikiPageChangePreview({
        currentContent: "# Notes\n\nOld\n",
        nextContent: "# Notes\n\nNew\n"
      })
    ).toBe("--- current\n+++ draft\n # Notes\n \n-Old\n+New\n");
  });

  it("builds wiki append previews with runner-compatible spacing", () => {
    expect(
      buildWikiPageNextContentPreview({
        baseContent: "# Notes\n\nOld\n",
        content: "New",
        mode: "append"
      })
    ).toBe("# Notes\n\nOld\n\nNew\n");
  });

  it("preserves turn correlation when publishing approval responses", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            conversationId: "conversation-alpha",
            deliveryStatus: "published",
            eventId:
              "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
            fromNodeId: "user",
            fromPubkey:
              "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            messageType: "approval.response",
            publishedRelays: ["ws://relay.test"],
            relayUrls: ["ws://relay.test"],
            sessionId: "session-alpha",
            targetNodeId: "worker-it",
            toPubkey:
              "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
            turnId: "turn-alpha"
          }),
          {
            headers: {
              "content-type": "application/json"
            },
            status: 200
          }
        )
      )
    );
    const approvalRequest = {
      approval: {
        approvalId: "approval-alpha",
        approverNodeIds: ["user"],
        reason: "Needs human approval."
      },
      artifactRefs: [],
      conversationId: "conversation-alpha",
      createdAt: "2026-05-05T12:00:00.000Z",
      direction: "inbound",
      deliveryErrors: [],
      eventId:
        "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      fromNodeId: "worker-it",
      fromPubkey:
        "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
      messageType: "approval.request",
      peerNodeId: "worker-it",
      publishedRelays: [],
      relayUrls: ["ws://relay.test"],
      schemaVersion: "1",
      sessionId: "session-alpha",
      summary: "Approval requested.",
      toNodeId: "user",
      toPubkey:
        "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      turnId: "turn-alpha",
      userNodeId: "user"
    } satisfies UserNodeMessageRecord;

    await publishApprovalResponse({
      baseUrl: "http://127.0.0.1:4300",
      decision: "approved",
      message: approvalRequest
    });

    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "http://127.0.0.1:4300/api/messages"
    );
    expect(JSON.parse(fetchMock.mock.calls[0]?.[1]?.body as string)).toEqual({
      approval: {
        approvalId: "approval-alpha",
        decision: "approved",
        reason: "Needs human approval."
      },
      conversationId: "conversation-alpha",
      messageType: "approval.response",
      parentMessageId:
        "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      sessionId: "session-alpha",
      summary: "Approved approval-alpha.",
      targetNodeId: "worker-it",
      turnId: "turn-alpha"
    });
  });

  it("calls runtime-local review and preview JSON APIs", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            ok: true
          }),
          {
            headers: {
              "content-type": "application/json"
            },
            status: 200
          }
        )
      )
    );

    await fetchArtifactPreview({
      artifactId: "artifact-alpha",
      baseUrl: "http://127.0.0.1:4300",
      conversationId: "conversation-alpha",
      nodeId: "worker-it"
    });
    await fetchArtifactHistory({
      artifactId: "artifact-alpha",
      baseUrl: "http://127.0.0.1:4300",
      conversationId: "conversation-alpha",
      nodeId: "worker-it"
    });
    await fetchArtifactDiff({
      artifactId: "artifact-alpha",
      baseUrl: "http://127.0.0.1:4300",
      conversationId: "conversation-alpha",
      nodeId: "worker-it"
    });
    await restoreArtifact({
      artifactId: "artifact-alpha",
      baseUrl: "http://127.0.0.1:4300",
      conversationId: "conversation-alpha",
      nodeId: "worker-it",
      reason: "restore report",
      restoreId: "restore-alpha"
    });
    await proposeArtifactSourceChange({
      artifactId: "artifact-alpha",
      baseUrl: "http://127.0.0.1:4300",
      conversationId: "conversation-alpha",
      nodeId: "worker-it",
      overwrite: true,
      reason: "promote report",
      targetPath: "reports/review.md"
    });
    await publishWikiRepository({
      baseUrl: "http://127.0.0.1:4300",
      conversationId: "conversation-alpha",
      nodeId: "worker-it",
      reason: "publish memory",
      retryFailedPublication: true,
      target: {
        gitServiceRef: "gitea",
        namespace: "team-alpha",
        repositoryName: "wiki-public"
      }
    });
    await upsertWikiPage({
      baseUrl: "http://127.0.0.1:4300",
      content: "# Working Context\n\nUpdated.",
      conversationId: "conversation-alpha",
      expectedCurrentSha256:
        "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      mode: "patch",
      nodeId: "worker-it",
      path: "operator/notes.md",
      reason: "update reviewed page"
    });
    await patchWikiPages({
      baseUrl: "http://127.0.0.1:4300",
      conversationId: "conversation-alpha",
      nodeId: "worker-it",
      pages: [
        {
          content: "# Working Context\n\nUpdated.",
          path: "operator/notes.md"
        },
        {
          content: "\nFollow-up.",
          mode: "append",
          path: "operator/follow-up.md"
        }
      ],
      reason: "update related pages"
    });
    await publishSourceHistory({
      baseUrl: "http://127.0.0.1:4300",
      conversationId: "conversation-alpha",
      nodeId: "worker-it",
      reason: "publish source history",
      retryFailedPublication: true,
      sourceHistoryId: "source-history-alpha",
      target: {
        repositoryName: "graph-alpha-public"
      }
    });
    await reconcileSourceHistory({
      approvalId: "approval-source-history-alpha",
      baseUrl: "http://127.0.0.1:4300",
      conversationId: "conversation-alpha",
      nodeId: "worker-it",
      reason: "reconcile source history",
      replayId: "reconcile-alpha",
      sourceHistoryId: "source-history-alpha"
    });
    await fetchSourceChangeDiff({
      baseUrl: "http://127.0.0.1:4300",
      candidateId: "candidate-alpha",
      conversationId: "conversation-alpha",
      nodeId: "worker-it"
    });
    await fetchSourceChangeFilePreview({
      baseUrl: "http://127.0.0.1:4300",
      candidateId: "candidate-alpha",
      conversationId: "conversation-alpha",
      nodeId: "worker-it",
      path: "src/index.ts"
    });
    await markConversationRead({
      baseUrl: "http://127.0.0.1:4300",
      conversationId: "conversation-alpha"
    });
    await reviewSourceChangeCandidate({
      baseUrl: "http://127.0.0.1:4300",
      candidateId: "candidate-alpha",
      conversationId: "conversation-alpha",
      nodeId: "worker-it",
      parentMessageId:
        "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      reason: "looks good",
      sessionId: "session-alpha",
      status: "accepted",
      turnId: "turn-alpha"
    });

    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "http://127.0.0.1:4300/api/artifacts/preview?artifactId=artifact-alpha&conversationId=conversation-alpha&nodeId=worker-it"
    );
    expect(fetchMock.mock.calls[1]?.[0]).toBe(
      "http://127.0.0.1:4300/api/artifacts/history?artifactId=artifact-alpha&conversationId=conversation-alpha&nodeId=worker-it"
    );
    expect(fetchMock.mock.calls[2]?.[0]).toBe(
      "http://127.0.0.1:4300/api/artifacts/diff?artifactId=artifact-alpha&conversationId=conversation-alpha&nodeId=worker-it"
    );
    expect(fetchMock.mock.calls[3]?.[0]).toBe(
      "http://127.0.0.1:4300/api/artifacts/restore"
    );
    expect(fetchMock.mock.calls[3]?.[1]).toMatchObject({
      method: "POST"
    });
    expect(JSON.parse(fetchMock.mock.calls[3]?.[1]?.body as string)).toEqual({
      artifactId: "artifact-alpha",
      conversationId: "conversation-alpha",
      nodeId: "worker-it",
      reason: "restore report",
      restoreId: "restore-alpha"
    });
    expect(fetchMock.mock.calls[4]?.[0]).toBe(
      "http://127.0.0.1:4300/api/artifacts/source-change-proposal"
    );
    expect(fetchMock.mock.calls[4]?.[1]).toMatchObject({
      method: "POST"
    });
    expect(JSON.parse(fetchMock.mock.calls[4]?.[1]?.body as string)).toEqual({
      artifactId: "artifact-alpha",
      conversationId: "conversation-alpha",
      nodeId: "worker-it",
      overwrite: true,
      reason: "promote report",
      targetPath: "reports/review.md"
    });
    expect(fetchMock.mock.calls[5]?.[0]).toBe(
      "http://127.0.0.1:4300/api/wiki-repository/publish"
    );
    expect(fetchMock.mock.calls[5]?.[1]).toMatchObject({
      method: "POST"
    });
    expect(JSON.parse(fetchMock.mock.calls[5]?.[1]?.body as string)).toEqual({
      conversationId: "conversation-alpha",
      nodeId: "worker-it",
      reason: "publish memory",
      retryFailedPublication: true,
      target: {
        gitServiceRef: "gitea",
        namespace: "team-alpha",
        repositoryName: "wiki-public"
      }
    });
    expect(fetchMock.mock.calls[6]?.[0]).toBe(
      "http://127.0.0.1:4300/api/wiki/pages"
    );
    expect(fetchMock.mock.calls[6]?.[1]).toMatchObject({
      method: "POST"
    });
    expect(JSON.parse(fetchMock.mock.calls[6]?.[1]?.body as string)).toEqual({
      content: "# Working Context\n\nUpdated.",
      conversationId: "conversation-alpha",
      expectedCurrentSha256:
        "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      mode: "patch",
      nodeId: "worker-it",
      path: "operator/notes.md",
      reason: "update reviewed page"
    });
    expect(fetchMock.mock.calls[7]?.[0]).toBe(
      "http://127.0.0.1:4300/api/wiki/pages/patch-set"
    );
    expect(fetchMock.mock.calls[7]?.[1]).toMatchObject({
      method: "POST"
    });
    expect(JSON.parse(fetchMock.mock.calls[7]?.[1]?.body as string)).toEqual({
      conversationId: "conversation-alpha",
      nodeId: "worker-it",
      pages: [
        {
          content: "# Working Context\n\nUpdated.",
          mode: "replace",
          path: "operator/notes.md"
        },
        {
          content: "\nFollow-up.",
          mode: "append",
          path: "operator/follow-up.md"
        }
      ],
      reason: "update related pages"
    });
    expect(fetchMock.mock.calls[8]?.[0]).toBe(
      "http://127.0.0.1:4300/api/source-history/publish"
    );
    expect(fetchMock.mock.calls[8]?.[1]).toMatchObject({
      method: "POST"
    });
    expect(JSON.parse(fetchMock.mock.calls[8]?.[1]?.body as string)).toEqual({
      conversationId: "conversation-alpha",
      nodeId: "worker-it",
      reason: "publish source history",
      retryFailedPublication: true,
      sourceHistoryId: "source-history-alpha",
      target: {
        repositoryName: "graph-alpha-public"
      }
    });
    expect(fetchMock.mock.calls[9]?.[0]).toBe(
      "http://127.0.0.1:4300/api/source-history/reconcile"
    );
    expect(fetchMock.mock.calls[9]?.[1]).toMatchObject({
      method: "POST"
    });
    expect(JSON.parse(fetchMock.mock.calls[9]?.[1]?.body as string)).toEqual({
      approvalId: "approval-source-history-alpha",
      conversationId: "conversation-alpha",
      nodeId: "worker-it",
      reason: "reconcile source history",
      replayId: "reconcile-alpha",
      sourceHistoryId: "source-history-alpha"
    });
    expect(fetchMock.mock.calls[10]?.[0]).toBe(
      "http://127.0.0.1:4300/api/source-change-candidates/diff?candidateId=candidate-alpha&conversationId=conversation-alpha&nodeId=worker-it"
    );
    expect(fetchMock.mock.calls[11]?.[0]).toBe(
      "http://127.0.0.1:4300/api/source-change-candidates/file?candidateId=candidate-alpha&conversationId=conversation-alpha&nodeId=worker-it&path=src%2Findex.ts"
    );
    expect(fetchMock.mock.calls[12]?.[0]).toBe(
      "http://127.0.0.1:4300/api/conversations/conversation-alpha/read"
    );
    expect(fetchMock.mock.calls[12]?.[1]).toMatchObject({
      method: "POST"
    });
    expect(fetchMock.mock.calls[13]?.[0]).toBe(
      "http://127.0.0.1:4300/api/source-change-candidates/review"
    );
    expect(fetchMock.mock.calls[13]?.[1]).toMatchObject({
      method: "POST"
    });
    expect(
      JSON.parse(fetchMock.mock.calls[13]?.[1]?.body as string)
    ).toMatchObject({
      candidateId: "candidate-alpha",
      conversationId: "conversation-alpha",
      nodeId: "worker-it",
      parentMessageId:
        "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      reason: "looks good",
      sessionId: "session-alpha",
      status: "accepted",
      turnId: "turn-alpha"
    });
  });
});

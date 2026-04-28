import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildRuntimeApiUrl,
  chooseConversationId,
  fetchArtifactPreview,
  fetchSourceChangeDiff,
  formatDeliveryLabel,
  normalizeApiBaseUrl,
  reviewSourceChangeCandidate
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
      nodeId: "worker-it"
    });
    await fetchSourceChangeDiff({
      baseUrl: "http://127.0.0.1:4300",
      candidateId: "candidate-alpha",
      nodeId: "worker-it"
    });
    await reviewSourceChangeCandidate({
      baseUrl: "http://127.0.0.1:4300",
      candidateId: "candidate-alpha",
      nodeId: "worker-it",
      reason: "looks good",
      status: "accepted"
    });

    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "http://127.0.0.1:4300/api/artifacts/preview?artifactId=artifact-alpha&nodeId=worker-it"
    );
    expect(fetchMock.mock.calls[1]?.[0]).toBe(
      "http://127.0.0.1:4300/api/source-change-candidates/diff?candidateId=candidate-alpha&nodeId=worker-it"
    );
    expect(fetchMock.mock.calls[2]?.[0]).toBe(
      "http://127.0.0.1:4300/api/source-change-candidates/review"
    );
    expect(fetchMock.mock.calls[2]?.[1]).toMatchObject({
      method: "POST"
    });
    expect(JSON.parse(fetchMock.mock.calls[2]?.[1]?.body as string)).toMatchObject({
      candidateId: "candidate-alpha",
      nodeId: "worker-it",
      reason: "looks good",
      status: "accepted"
    });
  });
});

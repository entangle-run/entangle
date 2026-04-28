import { describe, expect, it } from "vitest";
import {
  buildRuntimeApiUrl,
  chooseConversationId,
  formatDeliveryLabel,
  normalizeApiBaseUrl
} from "./runtime-api.js";

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
});

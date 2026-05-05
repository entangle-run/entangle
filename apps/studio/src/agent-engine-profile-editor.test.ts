import { describe, expect, it } from "vitest";
import type { DeploymentResourceCatalog } from "@entangle/types";
import {
  buildAgentEngineProfileCatalogMutation,
  buildAgentEngineProfileEditorDraft,
  buildAgentEngineProfileUpsertRequestFromDraft,
  createEmptyAgentEngineProfileEditorDraft,
  isAgentEngineProfileDraftSaveDisabled
} from "./agent-engine-profile-editor.js";

function buildCatalog(): DeploymentResourceCatalog {
  return {
    agentEngineProfiles: [
      {
        displayName: "OpenCode",
        executable: "opencode",
        id: "opencode-default",
        kind: "opencode_server",
        permissionMode: "auto_reject",
        stateScope: "node"
      }
    ],
    catalogId: "default-catalog",
    defaults: {
      agentEngineProfileRef: "opencode-default",
      relayProfileRefs: ["preview-relay"]
    },
    gitServices: [],
    modelEndpoints: [],
    relays: [
      {
        authMode: "none",
        displayName: "Preview Relay",
        id: "preview-relay",
        readUrls: ["ws://relay.example"],
        writeUrls: ["ws://relay.example"]
      }
    ],
    schemaVersion: "1"
  };
}

describe("agent engine profile editor helpers", () => {
  it("builds a Host upsert request from a draft", () => {
    expect(
      buildAgentEngineProfileUpsertRequestFromDraft({
        ...createEmptyAgentEngineProfileEditorDraft(),
        baseUrl: "http://127.0.0.1:18081",
        defaultAgent: "general",
        displayName: "OpenCode Attached",
        executable: "",
        permissionMode: "entangle_approval",
        profileId: "opencode-attached",
        setDefault: true,
        version: "fake-opencode-1.0.0"
      })
    ).toEqual({
      baseUrl: "http://127.0.0.1:18081",
      clearBaseUrl: false,
      clearDefaultAgent: false,
      clearExecutable: true,
      clearPermissionMode: false,
      clearVersion: false,
      defaultAgent: "general",
      displayName: "OpenCode Attached",
      kind: "opencode_server",
      permissionMode: "entangle_approval",
      setDefault: true,
      stateScope: "node",
      version: "fake-opencode-1.0.0"
    });
  });

  it("builds a valid attached OpenCode catalog mutation", () => {
    const catalog = buildAgentEngineProfileCatalogMutation(buildCatalog(), {
      ...createEmptyAgentEngineProfileEditorDraft(),
      baseUrl: "http://127.0.0.1:18081",
      defaultAgent: "general",
      displayName: "OpenCode Attached",
      executable: "",
      permissionMode: "entangle_approval",
      profileId: "opencode-attached",
      setDefault: true,
      version: "fake-opencode-1.0.0"
    });

    expect(catalog.defaults.agentEngineProfileRef).toBe("opencode-attached");
    expect(catalog.agentEngineProfiles).toContainEqual({
      baseUrl: "http://127.0.0.1:18081",
      defaultAgent: "general",
      displayName: "OpenCode Attached",
      id: "opencode-attached",
      kind: "opencode_server",
      permissionMode: "entangle_approval",
      stateScope: "node",
      version: "fake-opencode-1.0.0"
    });
  });

  it("hydrates drafts from existing profiles", () => {
    const catalog = buildCatalog();
    const draft = buildAgentEngineProfileEditorDraft({
      catalog,
      profile: catalog.agentEngineProfiles[0]!
    });

    expect(draft).toEqual({
      baseUrl: "",
      defaultAgent: "",
      displayName: "OpenCode",
      executable: "opencode",
      kind: "opencode_server",
      permissionMode: "auto_reject",
      profileId: "opencode-default",
      setDefault: true,
      stateScope: "node",
      version: ""
    });
  });

  it("rejects invalid profiles through catalog validation", () => {
    expect(() =>
      buildAgentEngineProfileCatalogMutation(buildCatalog(), {
        ...createEmptyAgentEngineProfileEditorDraft(),
        executable: "",
        kind: "external_http",
        profileId: "external-http"
      })
    ).toThrow("HTTP agent engine profiles must declare a base URL.");
  });

  it("disables save until a profile id is present", () => {
    expect(
      isAgentEngineProfileDraftSaveDisabled(
        createEmptyAgentEngineProfileEditorDraft()
      )
    ).toBe(true);
    expect(
      isAgentEngineProfileDraftSaveDisabled({
        ...createEmptyAgentEngineProfileEditorDraft(),
        profileId: "opencode-attached"
      })
    ).toBe(false);
  });
});

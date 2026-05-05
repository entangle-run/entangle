import { describe, expect, it } from "vitest";
import type { DeploymentResourceCatalog } from "@entangle/types";
import {
  buildAgentEngineProfileUpsertRequest,
  buildAgentEngineProfileUpsertCatalog,
  projectAgentEngineProfileSummary,
  projectAgentEngineProfileUpsertSummary
} from "./catalog-agent-engine-command.js";

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

describe("catalog agent-engine command helpers", () => {
  it("builds Host atomic upsert requests from CLI options", () => {
    expect(
      buildAgentEngineProfileUpsertRequest({
        baseUrl: "http://127.0.0.1:18081",
        defaultAgent: "general",
        displayName: "OpenCode Attached",
        permissionMode: "entangle_approval",
        setDefault: true,
        stateScope: "shared",
        version: "fake-opencode-1.0.0"
      })
    ).toEqual({
      baseUrl: "http://127.0.0.1:18081",
      clearBaseUrl: false,
      clearDefaultAgent: false,
      clearExecutable: false,
      clearPermissionMode: false,
      clearVersion: false,
      defaultAgent: "general",
      displayName: "OpenCode Attached",
      permissionMode: "entangle_approval",
      setDefault: true,
      stateScope: "shared",
      version: "fake-opencode-1.0.0"
    });
  });

  it("adds an attached OpenCode profile and can make it default", () => {
    const result = buildAgentEngineProfileUpsertCatalog(
      buildCatalog(),
      "opencode-attached",
      {
        baseUrl: "http://127.0.0.1:18081",
        defaultAgent: "general",
        displayName: "OpenCode Attached",
        permissionMode: "entangle_approval",
        setDefault: true,
        version: "fake-opencode-1.0.0"
      }
    );

    expect(result.profile).toEqual({
      baseUrl: "http://127.0.0.1:18081",
      defaultAgent: "general",
      displayName: "OpenCode Attached",
      id: "opencode-attached",
      kind: "opencode_server",
      permissionMode: "entangle_approval",
      stateScope: "node",
      version: "fake-opencode-1.0.0"
    });
    expect(result.catalog.defaults.agentEngineProfileRef).toBe(
      "opencode-attached"
    );
  });

  it("updates and clears optional agent engine profile fields", () => {
    const result = buildAgentEngineProfileUpsertCatalog(
      buildAgentEngineProfileUpsertCatalog(
        buildCatalog(),
        "opencode-attached",
        {
          baseUrl: "http://127.0.0.1:18081",
          defaultAgent: "general",
          permissionMode: "entangle_approval",
          version: "fake-opencode-1.0.0"
        }
      ).catalog,
      "opencode-attached",
      {
        clearBaseUrl: true,
        clearDefaultAgent: true,
        clearPermissionMode: true,
        clearVersion: true,
        executable: "opencode"
      }
    );

    expect(result.profile).toEqual({
      displayName: "opencode-attached",
      executable: "opencode",
      id: "opencode-attached",
      kind: "opencode_server",
      stateScope: "node"
    });
  });

  it("rejects invalid engine profile combinations through catalog validation", () => {
    expect(() =>
      buildAgentEngineProfileUpsertCatalog(buildCatalog(), "http-engine", {
        kind: "external_http"
      })
    ).toThrow("HTTP agent engine profiles must declare a base URL.");
  });

  it("projects compact upsert summaries", () => {
    const result = buildAgentEngineProfileUpsertCatalog(
      buildCatalog(),
      "opencode-attached",
      {
        baseUrl: "http://127.0.0.1:18081",
        setDefault: true
      }
    );

    expect(projectAgentEngineProfileUpsertSummary(result)).toEqual({
      defaultAgentEngineProfileRef: "opencode-attached",
      profile: result.profile
    });
  });

  it("projects compact profile summaries with default marker", () => {
    const result = buildAgentEngineProfileUpsertCatalog(
      buildCatalog(),
      "opencode-attached",
      {
        baseUrl: "http://127.0.0.1:18081",
        defaultAgent: "general",
        permissionMode: "entangle_approval",
        setDefault: true,
        stateScope: "shared"
      }
    );

    expect(
      projectAgentEngineProfileSummary({
        catalog: result.catalog,
        profile: result.profile
      })
    ).toEqual({
      baseUrl: "http://127.0.0.1:18081",
      defaultAgent: "general",
      displayName: "opencode-attached",
      id: "opencode-attached",
      isDefault: true,
      kind: "opencode_server",
      permissionMode: "entangle_approval",
      stateScope: "shared"
    });
  });

  it("rejects conflicting clear and set flags", () => {
    expect(() =>
      buildAgentEngineProfileUpsertCatalog(buildCatalog(), "opencode-attached", {
        baseUrl: "http://127.0.0.1:18081",
        clearBaseUrl: true
      })
    ).toThrow("Use either --base-url or --clear-base-url, not both.");
  });

  it("rejects invalid state scopes explicitly", () => {
    expect(() =>
      buildAgentEngineProfileUpsertCatalog(buildCatalog(), "opencode-attached", {
        stateScope: "workspace"
      })
    ).toThrow("Agent engine state scope must be 'node' or 'shared'.");
  });
});

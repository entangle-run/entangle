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
      clearHealthUrl: false,
      clearHttpAuth: false,
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
        clearHttpAuth: true,
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

  it("stores external HTTP bearer auth as an environment variable reference", () => {
    const result = buildAgentEngineProfileUpsertCatalog(
      buildCatalog(),
      "external-http",
      {
        baseUrl: "https://engine.example/turn",
        displayName: "External HTTP",
        healthUrl: "https://engine.example/health",
        httpBearerTokenEnvVar: "ENTANGLE_EXTERNAL_HTTP_ENGINE_TOKEN",
        kind: "external_http",
        setDefault: true
      }
    );

    expect(result.profile).toMatchObject({
      baseUrl: "https://engine.example/turn",
      healthUrl: "https://engine.example/health",
      httpAuth: {
        mode: "bearer_env",
        tokenEnvVar: "ENTANGLE_EXTERNAL_HTTP_ENGINE_TOKEN"
      },
      id: "external-http",
      kind: "external_http"
    });
    expect(
      projectAgentEngineProfileSummary({
        catalog: result.catalog,
        profile: result.profile
      })
    ).toMatchObject({
      healthUrl: "https://engine.example/health",
      httpAuth: {
        mode: "bearer_env",
        tokenEnvVar: "ENTANGLE_EXTERNAL_HTTP_ENGINE_TOKEN"
      }
    });
  });

  it("rejects invalid engine profile combinations through catalog validation", () => {
    expect(() =>
      buildAgentEngineProfileUpsertCatalog(buildCatalog(), "http-engine", {
        kind: "external_http"
      })
    ).toThrow("HTTP agent engine profiles must declare a base URL.");

    expect(() =>
      buildAgentEngineProfileUpsertCatalog(buildCatalog(), "process-engine", {
        baseUrl: "http://127.0.0.1:18082",
        kind: "external_process"
      })
    ).toThrow(
      "External process agent engine profiles must declare an executable."
    );
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
    expect(() =>
      buildAgentEngineProfileUpsertRequest({
        clearHealthUrl: true,
        healthUrl: "https://engine.example/health"
      })
    ).toThrow("Use either --health-url or --clear-health-url, not both.");
  });

  it("rejects conflicting auth set and clear flags", () => {
    expect(() =>
      buildAgentEngineProfileUpsertRequest({
        clearHealthUrl: true,
        clearHttpAuth: true,
        httpBearerTokenEnvVar: "ENTANGLE_EXTERNAL_HTTP_ENGINE_TOKEN"
      })
    ).toThrow("Use either --http-bearer-token-env-var or --clear-http-auth, not both.");
  });

  it("rejects invalid state scopes explicitly", () => {
    expect(() =>
      buildAgentEngineProfileUpsertCatalog(buildCatalog(), "opencode-attached", {
        stateScope: "workspace"
      })
    ).toThrow("Agent engine state scope must be 'node' or 'shared'.");
  });
});

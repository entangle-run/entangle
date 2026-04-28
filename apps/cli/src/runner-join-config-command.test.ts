import { describe, expect, it } from "vitest";
import {
  buildRunnerJoinConfig,
  projectRunnerJoinConfigSummary,
  splitRepeatedCsvOptions
} from "./runner-join-config-command.js";

const authorityPubkey =
  "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const runnerPubkey =
  "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

describe("runner join config command helpers", () => {
  it("normalizes repeated comma-separated options", () => {
    expect(splitRepeatedCsvOptions(["agent_runner,human_interface", "agent_runner"]))
      .toEqual(["agent_runner", "human_interface"]);
  });

  it("builds a default OpenCode-capable runner join config", () => {
    const config = buildRunnerJoinConfig({
      hostApiAuthEnvVar: "ENTANGLE_HOST_TOKEN",
      hostApiBaseUrl: "http://localhost:7071",
      hostAuthorityPubkey: authorityPubkey,
      relayUrls: ["ws://localhost:7777"],
      runnerId: "runner-alpha",
      runnerPublicKey: runnerPubkey,
      secretEnvVar: "ENTANGLE_RUNNER_NOSTR_SECRET_KEY"
    });

    expect(config).toMatchObject({
      capabilities: {
        agentEngineKinds: ["opencode_server"],
        maxAssignments: 1,
        runtimeKinds: ["agent_runner", "human_interface"]
      },
      hostApi: {
        auth: {
          envVar: "ENTANGLE_HOST_TOKEN",
          mode: "bearer_env"
        },
        baseUrl: "http://localhost:7071",
        runtimeIdentitySecret: {
          mode: "host_api"
        }
      },
      hostAuthorityPubkey: authorityPubkey,
      identity: {
        publicKey: runnerPubkey,
        secretDelivery: {
          envVar: "ENTANGLE_RUNNER_NOSTR_SECRET_KEY",
          mode: "env_var"
        }
      },
      relayUrls: ["ws://localhost:7777"],
      runnerId: "runner-alpha",
      schemaVersion: "1"
    });
    expect(projectRunnerJoinConfigSummary(config)).toMatchObject({
      hostApiAuthEnvVar: "ENTANGLE_HOST_TOKEN",
      runtimeIdentitySecretFromHost: true,
      secretDelivery: "env:ENTANGLE_RUNNER_NOSTR_SECRET_KEY"
    });
  });

  it("can build a human-interface-only config without Host API", () => {
    const config = buildRunnerJoinConfig({
      agentEngineKinds: [],
      hostAuthorityPubkey: authorityPubkey,
      includeHostApi: false,
      relayUrls: ["ws://localhost:7777"],
      runnerId: "human-runner",
      runtimeKinds: ["human_interface"],
      secretEnvVar: "ENTANGLE_RUNNER_NOSTR_SECRET_KEY"
    });

    expect(config.capabilities.runtimeKinds).toEqual(["human_interface"]);
    expect(config.capabilities.agentEngineKinds).toEqual([]);
    expect(config.hostApi).toBeUndefined();
  });
});

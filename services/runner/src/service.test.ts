import { readdir } from "node:fs/promises";
import { afterEach, describe, expect, it } from "vitest";
import { sessionRecordSchema } from "@entangle/types";
import { loadRuntimeContext } from "./runtime-context.js";
import { RunnerService } from "./service.js";
import {
  buildRunnerStatePaths,
  readConversationRecord,
  readRunnerTurnRecord,
  readSessionRecord
} from "./state-store.js";
import {
  buildInboundTaskRequest,
  cleanupRuntimeFixtures,
  createRuntimeFixture,
  remotePublicKey,
  runnerSecretHex
} from "./test-fixtures.js";
import { InMemoryRunnerTransport } from "./transport.js";

afterEach(async () => {
  delete process.env.ENTANGLE_NOSTR_SECRET_KEY;
  await cleanupRuntimeFixtures();
});

describe("RunnerService", () => {
  it("processes an inbound task request and publishes a task result", async () => {
    const fixture = await createRuntimeFixture();
    process.env.ENTANGLE_NOSTR_SECRET_KEY = runnerSecretHex;

    const runtimeContext = await loadRuntimeContext(fixture.contextPath);
    const transport = new InMemoryRunnerTransport();
    const service = new RunnerService({
      context: runtimeContext,
      transport
    });

    await service.start();
    await transport.publish(buildInboundTaskRequest().message);

    const publishedEnvelopes = transport.listPublishedEnvelopes();
    const responseEnvelope = publishedEnvelopes.find(
      (envelope) =>
        envelope.message.messageType === "task.result" &&
        envelope.message.fromNodeId === "worker-it"
    );

    expect(responseEnvelope).toBeDefined();
    expect(responseEnvelope?.message.toNodeId).toBe("reviewer-it");
    expect(responseEnvelope?.message.parentMessageId).toBeDefined();
    expect(responseEnvelope?.message.toPubkey).toBe(remotePublicKey);

    const statePaths = buildRunnerStatePaths(runtimeContext.workspace.runtimeRoot);
    const sessionRecord = sessionRecordSchema.parse(
      await readSessionRecord(statePaths, "session-alpha")
    );
    const conversationRecord = await readConversationRecord(statePaths, "conv-alpha");
    const turnIds = publishedEnvelopes
      .filter((envelope) => envelope.message.fromNodeId === "worker-it")
      .map((envelope) => envelope.message.turnId);

    expect(sessionRecord.status).toBe("completed");
    expect(sessionRecord.lastMessageType).toBe("task.result");
    expect(conversationRecord?.status).toBe("closed");
    expect(conversationRecord?.lastOutboundMessageId).toBe(responseEnvelope?.eventId);
    expect(conversationRecord?.followupCount).toBe(1);
    expect(turnIds).toHaveLength(1);

    await service.stop();
  });

  it("does not publish a follow-up when the inbound response policy does not require one", async () => {
    const fixture = await createRuntimeFixture();
    process.env.ENTANGLE_NOSTR_SECRET_KEY = runnerSecretHex;

    const runtimeContext = await loadRuntimeContext(fixture.contextPath);
    const transport = new InMemoryRunnerTransport();
    const service = new RunnerService({
      context: runtimeContext,
      transport
    });

    const result = await service.handleInboundEnvelope(
      buildInboundTaskRequest({
        responsePolicy: {
          closeOnResult: true,
          maxFollowups: 0,
          responseRequired: false
        }
      })
    );

    expect(result).toEqual({
      handled: true,
      response: undefined
    });
    expect(transport.listPublishedEnvelopes()).toHaveLength(0);

    const statePaths = buildRunnerStatePaths(runtimeContext.workspace.runtimeRoot);
    const sessionRecord = await readSessionRecord(statePaths, "session-alpha");
    const conversationRecord = await readConversationRecord(statePaths, "conv-alpha");
    const [turnRecordFile] = await readdir(statePaths.turnsRoot);
    const turnRecord = turnRecordFile
      ? await readRunnerTurnRecord(statePaths, turnRecordFile.replace(/\.json$/, ""))
      : undefined;

    expect(sessionRecord?.status).toBe("completed");
    expect(conversationRecord?.status).toBe("closed");
    expect(turnRecord?.phase).toBe("persisting");
  });

  it("ignores envelopes addressed to another node id", async () => {
    const fixture = await createRuntimeFixture();
    process.env.ENTANGLE_NOSTR_SECRET_KEY = runnerSecretHex;

    const runtimeContext = await loadRuntimeContext(fixture.contextPath);
    const transport = new InMemoryRunnerTransport();
    const service = new RunnerService({
      context: runtimeContext,
      transport
    });

    const result = await service.handleInboundEnvelope(
      buildInboundTaskRequest({
        toNodeId: "worker-marketing"
      })
    );

    expect(result).toEqual({
      handled: false,
      reason: "wrong_node"
    });
  });

  it("ignores envelopes addressed to another pubkey", async () => {
    const fixture = await createRuntimeFixture();
    process.env.ENTANGLE_NOSTR_SECRET_KEY = runnerSecretHex;

    const runtimeContext = await loadRuntimeContext(fixture.contextPath);
    const transport = new InMemoryRunnerTransport();
    const service = new RunnerService({
      context: runtimeContext,
      transport
    });

    const result = await service.handleInboundEnvelope(
      buildInboundTaskRequest({
        toPubkey:
          "9039756d4d20ef2f01f196f0ff8e9a6bc036413f648f4f46fc47f4cefbfbd0e8"
      })
    );

    expect(result).toEqual({
      handled: false,
      reason: "wrong_pubkey"
    });
  });

  it("rejects syntactically invalid inbound messages before state mutation", async () => {
    const fixture = await createRuntimeFixture();
    process.env.ENTANGLE_NOSTR_SECRET_KEY = runnerSecretHex;

    const runtimeContext = await loadRuntimeContext(fixture.contextPath);
    const transport = new InMemoryRunnerTransport();
    const service = new RunnerService({
      context: runtimeContext,
      transport
    });

    const invalidEnvelope = buildInboundTaskRequest();
    invalidEnvelope.message.parentMessageId =
      "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
    invalidEnvelope.message.fromNodeId = invalidEnvelope.message.toNodeId;

    const result = await service.handleInboundEnvelope(invalidEnvelope);

    expect(result).toEqual({
      handled: false,
      reason: "invalid_message"
    });

    const statePaths = buildRunnerStatePaths(runtimeContext.workspace.runtimeRoot);
    expect(await readSessionRecord(statePaths, "session-alpha")).toBeUndefined();
  });

  it("starts idempotently and does not register duplicate subscriptions", async () => {
    const fixture = await createRuntimeFixture();
    process.env.ENTANGLE_NOSTR_SECRET_KEY = runnerSecretHex;

    const runtimeContext = await loadRuntimeContext(fixture.contextPath);
    const transport = new InMemoryRunnerTransport();
    const service = new RunnerService({
      context: runtimeContext,
      transport
    });

    const firstStart = await service.start();
    const secondStart = await service.start();

    expect(secondStart).toEqual(firstStart);

    await transport.publish(buildInboundTaskRequest().message);
    const responses = transport
      .listPublishedEnvelopes()
      .filter((envelope) => envelope.message.fromNodeId === "worker-it");

    expect(responses).toHaveLength(1);

    await service.stop();
  });
});

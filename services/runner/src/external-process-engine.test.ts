import { chmod, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { AgentEngineExecutionError } from "@entangle/agent-engine";
import {
  agentEngineTurnRequestSchema,
  type EffectiveRuntimeContext
} from "@entangle/types";
import { createExternalProcessAgentEngine } from "./external-process-engine.js";
import { runRunnerOnce } from "./index.js";
import {
  cleanupRuntimeFixtures,
  createRuntimeFixture,
  runnerSecretHex
} from "./test-fixtures.js";

const tempRoots: string[] = [];

function buildTurnRequest() {
  return agentEngineTurnRequestSchema.parse({
    artifactInputs: [],
    artifactRefs: [],
    executionLimits: {
      maxOutputTokens: 1024,
      maxToolTurns: 4
    },
    interactionPromptParts: ["Summarize the workspace."],
    memoryRefs: [],
    nodeId: "worker-it",
    sessionId: "session-alpha",
    systemPromptParts: ["You are an Entangle runtime node."],
    toolDefinitions: []
  });
}

async function writeExecutableScript(source: string): Promise<string> {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "entangle-external-engine-"));
  tempRoots.push(tempRoot);
  const scriptPath = path.join(tempRoot, "engine.mjs");
  await writeFile(scriptPath, source, "utf8");
  await chmod(scriptPath, 0o755);
  return scriptPath;
}

function createExternalRuntimeContext(
  context: EffectiveRuntimeContext,
  executable: string
): EffectiveRuntimeContext {
  return {
    ...context,
    agentRuntimeContext: {
      ...context.agentRuntimeContext,
      engineProfile: {
        displayName: "External Process",
        executable,
        id: "external-process-test",
        kind: "external_process" as const,
        stateScope: "node" as const
      },
      engineProfileRef: "external-process-test"
    }
  };
}

afterEach(async () => {
  await cleanupRuntimeFixtures();
  await Promise.all(
    tempRoots.splice(0).map((tempRoot) =>
      rm(tempRoot, { force: true, recursive: true })
    )
  );
});

describe("external process runner engine adapter", () => {
  it("executes one JSON stdin/stdout engine turn", async () => {
    const executable = await writeExecutableScript(`#!/usr/bin/env node
let input = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  input += chunk;
});
process.stdin.on("end", () => {
  const payload = JSON.parse(input);
  process.stdout.write(JSON.stringify({
    assistantMessages: [
      "external process handled " + payload.request.nodeId + " in " + payload.runtime.nodeId
    ],
    engineVersion: "external-process-fixture-1",
    stopReason: "completed"
  }));
});
`);
    const fixture = await createRuntimeFixture();
    const runtimeContext = createExternalRuntimeContext(
      fixture.context,
      executable
    );
    const engine = createExternalProcessAgentEngine({ runtimeContext });

    await expect(engine.executeTurn(buildTurnRequest())).resolves.toMatchObject({
      assistantMessages: ["external process handled worker-it in worker-it"],
      engineVersion: "external-process-fixture-1",
      stopReason: "completed"
    });
  });

  it("is selected by normal runner startup for external_process profiles", async () => {
    const executable = await writeExecutableScript(`#!/usr/bin/env node
process.stdin.resume();
process.stdin.on("end", () => {
  process.stdout.write(JSON.stringify({
    assistantMessages: ["runner startup selected external process"],
    stopReason: "completed"
  }));
});
`);
    const fixture = await createRuntimeFixture();
    const runtimeContext = createExternalRuntimeContext(
      fixture.context,
      executable
    );
    process.env.ENTANGLE_NOSTR_SECRET_KEY = runnerSecretHex;
    await writeFile(fixture.contextPath, JSON.stringify(runtimeContext, null, 2), "utf8");

    await expect(
      runRunnerOnce({ runtimeContextPath: fixture.contextPath })
    ).resolves.toMatchObject({
      result: {
        assistantMessages: ["runner startup selected external process"],
        stopReason: "completed"
      }
    });
  });

  it("classifies non-zero external process exits as provider unavailable", async () => {
    const executable = await writeExecutableScript(`#!/usr/bin/env node
process.stderr.write("external fixture failed");
process.exit(7);
`);
    const fixture = await createRuntimeFixture();
    const runtimeContext = createExternalRuntimeContext(
      fixture.context,
      executable
    );
    const engine = createExternalProcessAgentEngine({ runtimeContext });

    await expect(engine.executeTurn(buildTurnRequest())).rejects.toMatchObject({
      classification: "provider_unavailable",
      name: "AgentEngineExecutionError"
    } satisfies Partial<AgentEngineExecutionError>);
  });

  it("rejects invalid stdout as a tool protocol error", async () => {
    const executable = await writeExecutableScript(`#!/usr/bin/env node
process.stdout.write("not json");
`);
    const fixture = await createRuntimeFixture();
    const runtimeContext = createExternalRuntimeContext(
      fixture.context,
      executable
    );
    const engine = createExternalProcessAgentEngine({ runtimeContext });

    await expect(engine.executeTurn(buildTurnRequest())).rejects.toMatchObject({
      classification: "tool_protocol_error",
      name: "AgentEngineExecutionError"
    } satisfies Partial<AgentEngineExecutionError>);
  });

  it("rejects schema-invalid JSON results as a tool protocol error", async () => {
    const executable = await writeExecutableScript(`#!/usr/bin/env node
process.stdout.write(JSON.stringify({
  assistantMessages: "not-an-array",
  stopReason: "completed"
}));
`);
    const fixture = await createRuntimeFixture();
    const runtimeContext = createExternalRuntimeContext(
      fixture.context,
      executable
    );
    const engine = createExternalProcessAgentEngine({ runtimeContext });

    await expect(engine.executeTurn(buildTurnRequest())).rejects.toMatchObject({
      classification: "tool_protocol_error",
      name: "AgentEngineExecutionError"
    } satisfies Partial<AgentEngineExecutionError>);
  });
});

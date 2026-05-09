#!/usr/bin/env node
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createInterface } from "node:readline";

const workspaceRoot = await mkdtemp(
  path.join(os.tmpdir(), "entangle-fake-agent-engine-http-workspace-")
);
const generatedRelativePath = "src/fake-external-http-generated.ts";
const generatedContent = "export const fakeExternalHttpGenerated = true;\n";
const bearerTokenEnvVar = "ENTANGLE_FAKE_EXTERNAL_HTTP_BEARER_TOKEN";
const bearerToken = "fake-external-http-token";

const serverProcess = spawn(
  process.execPath,
  [
    "scripts/fake-agent-engine-http.mjs",
    "--port",
    "0",
    "--write-file",
    generatedRelativePath,
    "--write-content",
    generatedContent,
    "--engine-session-id",
    "external-http-smoke-session",
    "--approval-id",
    "approval-fake-external-http",
    "--approval-resource-id",
    "source-change-fake-external-http",
    "--bearer-token-env-var",
    bearerTokenEnvVar,
    "--json-log"
  ],
  {
    cwd: process.cwd(),
    env: {
      ...process.env,
      [bearerTokenEnvVar]: bearerToken
    },
    stdio: ["ignore", "pipe", "pipe"]
  }
);

try {
  const startup = await waitForStartup(serverProcess);
  await verifyHealth(startup.healthUrl);
  await verifyUnauthorizedTurn(startup.turnUrl);
  await verifyTurn(startup.turnUrl);
  await verifyWorkspaceWrite();
  await verifyDebugState(startup.baseUrl);
  console.log(`fake external HTTP agent engine smoke passed (${startup.turnUrl})`);
} finally {
  await Promise.all([
    stopServer(serverProcess),
    rm(workspaceRoot, { force: true, recursive: true })
  ]);
}

async function waitForStartup(child) {
  if (!child.stdout || !child.stderr) {
    throw new Error("Fake external HTTP engine did not expose stdout/stderr.");
  }

  const stderrLines = [];
  child.stderr.setEncoding("utf8");
  child.stderr.on("data", (chunk) => {
    stderrLines.push(chunk);
  });

  const reader = createInterface({
    input: child.stdout,
    terminal: false
  });

  const startupPromise = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(
        new Error(
          `Timed out waiting for fake external HTTP engine startup. stderr=${stderrLines.join("").trim()}`
        )
      );
    }, 5_000);

    reader.once("line", (line) => {
      clearTimeout(timeout);
      try {
        const parsed = JSON.parse(line);

        if (
          parsed?.event !== "listening" ||
          typeof parsed.baseUrl !== "string" ||
          typeof parsed.healthUrl !== "string" ||
          typeof parsed.turnUrl !== "string"
        ) {
          reject(new Error(`Unexpected startup payload: ${line}`));
          return;
        }

        resolve(parsed);
      } catch (error) {
        reject(
          error instanceof Error
            ? error
            : new Error("Failed to parse fake external HTTP engine startup.")
        );
      }
    });
  });

  const exitPromise = once(child, "exit").then(([code, signal]) => {
    throw new Error(
      `Fake external HTTP engine exited before startup: code=${code ?? "none"} signal=${signal ?? "none"} stderr=${stderrLines.join("").trim()}`
    );
  });

  return Promise.race([startupPromise, exitPromise]);
}

async function verifyHealth(healthUrl) {
  const response = await fetch(healthUrl);
  const body = await response.json();

  if (!response.ok || body.healthy !== true || typeof body.version !== "string") {
    throw new Error(`Health check failed: ${response.status}`);
  }
}

async function verifyTurn(turnUrl) {
  const response = await fetch(turnUrl, {
    body: JSON.stringify({
      request: {
        artifactInputs: [],
        artifactRefs: [],
        executionLimits: {
          maxOutputTokens: 1024,
          maxToolTurns: 4
        },
        interactionPromptParts: ["Run fake external HTTP engine smoke."],
        memoryRefs: [],
        nodeId: "worker-it",
        sessionId: "session-alpha",
        systemPromptParts: ["You are an Entangle runtime node."],
        toolDefinitions: []
      },
      runtime: {
        nodeId: "worker-it",
        workspace: {
          sourceWorkspaceRoot: workspaceRoot
        }
      },
      schemaVersion: 1
    }),
    headers: {
      authorization: `Bearer ${bearerToken}`,
      "content-type": "application/json"
    },
    method: "POST"
  });
  const body = await response.json();

  if (
    !response.ok ||
    body.stopReason !== "completed" ||
    body.engineSessionId !== "external-http-smoke-session" ||
    !Array.isArray(body.assistantMessages) ||
    !String(body.assistantMessages[0] ?? "").includes("request=worker-it") ||
    !Array.isArray(body.toolExecutions) ||
    body.toolExecutions[0]?.toolId !== "fake_workspace_write" ||
    body.toolExecutions[0]?.toolCallId !== "fake-workspace-write-1" ||
    body.toolExecutions[0]?.sequence !== 1 ||
    !Array.isArray(body.approvalRequestDirectives) ||
    body.approvalRequestDirectives[0]?.approvalId !==
      "approval-fake-external-http"
  ) {
    throw new Error(`Turn check failed: ${response.status}`);
  }
}

async function verifyUnauthorizedTurn(turnUrl) {
  const response = await fetch(turnUrl, {
    body: JSON.stringify({
      request: {
        artifactInputs: [],
        artifactRefs: [],
        executionLimits: {
          maxOutputTokens: 1024,
          maxToolTurns: 4
        },
        interactionPromptParts: ["Run unauthorized fake external HTTP check."],
        memoryRefs: [],
        nodeId: "worker-it",
        sessionId: "session-alpha",
        systemPromptParts: ["You are an Entangle runtime node."],
        toolDefinitions: []
      },
      runtime: {
        nodeId: "worker-it",
        workspace: {
          sourceWorkspaceRoot: workspaceRoot
        }
      },
      schemaVersion: 1
    }),
    headers: {
      "content-type": "application/json"
    },
    method: "POST"
  });

  if (response.status !== 401) {
    throw new Error(`Unauthorized turn check failed: ${response.status}`);
  }
}

async function verifyWorkspaceWrite() {
  const content = await readFile(
    path.join(workspaceRoot, generatedRelativePath),
    "utf8"
  );

  if (content !== generatedContent) {
    throw new Error("Fake external HTTP engine workspace write did not match.");
  }
}

async function verifyDebugState(baseUrl) {
  const response = await fetch(`${baseUrl}/debug/state`);
  const body = await response.json();

  if (!response.ok || !Array.isArray(body.requests) || body.requests.length !== 1) {
    throw new Error(`Debug state check failed: ${response.status}`);
  }
}

async function stopServer(child) {
  if (child.exitCode !== null || child.signalCode !== null) {
    return;
  }

  child.kill("SIGTERM");
  await Promise.race([
    once(child, "exit"),
    new Promise((resolve) => setTimeout(resolve, 1_000))
  ]);
}

#!/usr/bin/env node
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createInterface } from "node:readline";

const username = "entangle";
const password = "server-secret";
const workspaceRoot = await mkdtemp(
  path.join(os.tmpdir(), "entangle-fake-opencode-workspace-")
);
const generatedRelativePath = "src/fake-opencode-generated.ts";
const generatedContent = "export const fakeOpenCodeGenerated = true;\n";

const serverProcess = spawn(
  process.execPath,
  [
    "scripts/fake-opencode-server.mjs",
    "--port",
    "0",
    "--username",
    username,
    "--password",
    password,
    "--write-file",
    generatedRelativePath,
    "--write-content",
    generatedContent,
    "--json-log"
  ],
  {
    cwd: process.cwd(),
    stdio: ["ignore", "pipe", "pipe"]
  }
);

let startup;

try {
  startup = await waitForStartup(serverProcess);
  await verifyHealth(startup.healthUrl);
  await verifyTurnWithPermission(startup.baseUrl);
  await verifyWorkspaceWrite(workspaceRoot, generatedRelativePath);
  await verifyDebugState(startup.baseUrl);
  console.log(`fake OpenCode server smoke passed (${startup.baseUrl})`);
} finally {
  await Promise.all([
    stopServer(serverProcess),
    rm(workspaceRoot, { force: true, recursive: true })
  ]);
}

async function waitForStartup(child) {
  if (!child.stdout || !child.stderr) {
    throw new Error("Fake OpenCode process did not expose stdout/stderr.");
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
          `Timed out waiting for fake OpenCode startup. stderr=${stderrLines.join("").trim()}`
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
          typeof parsed.permissionId !== "string" ||
          typeof parsed.sessionId !== "string"
        ) {
          reject(new Error(`Unexpected startup payload: ${line}`));
          return;
        }

        resolve(parsed);
      } catch (error) {
        reject(
          error instanceof Error
            ? error
            : new Error("Failed to parse fake OpenCode startup payload.")
        );
      }
    });
  });

  const exitPromise = once(child, "exit").then(([code, signal]) => {
    throw new Error(
      `Fake OpenCode exited before startup: code=${code ?? "none"} signal=${signal ?? "none"} stderr=${stderrLines.join("").trim()}`
    );
  });

  return Promise.race([startupPromise, exitPromise]);
}

async function verifyHealth(healthUrl) {
  const response = await fetch(healthUrl, {
    headers: authorizationHeaders()
  });
  const body = await response.json();

  if (!response.ok || body.healthy !== true || typeof body.version !== "string") {
    throw new Error(`Health check failed: ${response.status}`);
  }
}

async function verifyTurnWithPermission(baseUrl) {
  const events = [];
  let permissionReplySent = false;
  let sawCompletionText = false;
  let sawIdle = false;
  let resolveEventStreamReady;
  const eventStreamReady = new Promise((resolve) => {
    resolveEventStreamReady = resolve;
  });

  const eventStreamPromise = consumeSseEvents(
    `${baseUrl}/event`,
    async (event) => {
      events.push(event);

      if (event.type === "permission.asked") {
        const requestId = event.properties?.id;

        if (requestId !== startup.permissionId) {
          throw new Error(`Unexpected permission id '${String(requestId)}'.`);
        }

        const replyResponse = await fetch(
          `${baseUrl}/permission/${encodeURIComponent(requestId)}/reply`,
          {
            body: JSON.stringify({
              message: "Approved by deterministic fake OpenCode smoke.",
              reply: "once"
            }),
            headers: jsonHeaders(),
            method: "POST"
          }
        );

        if (!replyResponse.ok) {
          throw new Error(`Permission reply failed: ${replyResponse.status}`);
        }

        permissionReplySent = true;
        return;
      }

      if (
        event.type === "message.part.updated" &&
        event.properties?.part?.text ===
          "Deterministic Entangle fake OpenCode response."
      ) {
        sawCompletionText = true;
        return;
      }

      if (
        event.type === "session.status" &&
        event.properties?.status?.type === "idle"
      ) {
        sawIdle = true;
      }
    },
    () => {
      resolveEventStreamReady();
    }
  );

  await Promise.race([eventStreamReady, eventStreamPromise]);

  const sessionResponse = await fetch(`${baseUrl}/session`, {
    body: JSON.stringify({
      permission: [
        {
          mode: "ask",
          permission: "bash"
        }
      ],
      title: "worker-it:session-alpha"
    }),
    headers: jsonHeaders({
      "x-opencode-directory": encodeURIComponent(workspaceRoot)
    }),
    method: "POST"
  });
  const sessionBody = await sessionResponse.json();

  if (!sessionResponse.ok || sessionBody.id !== startup.sessionId) {
    throw new Error(`Session create failed: ${sessionResponse.status}`);
  }

  const promptResponse = await fetch(
    `${baseUrl}/session/${encodeURIComponent(startup.sessionId)}/prompt_async`,
    {
      body: JSON.stringify({
        parts: [
          {
            text: "Run deterministic Entangle fake OpenCode smoke.",
            type: "text"
          }
        ]
      }),
      headers: jsonHeaders({
        "x-opencode-directory": encodeURIComponent(workspaceRoot)
      }),
      method: "POST"
    }
  );

  if (!promptResponse.ok) {
    throw new Error(`Prompt async failed: ${promptResponse.status}`);
  }

  await eventStreamPromise;

  if (!permissionReplySent || !sawCompletionText || !sawIdle) {
    throw new Error(
      `Incomplete fake OpenCode event flow: permissionReplySent=${permissionReplySent} sawCompletionText=${sawCompletionText} sawIdle=${sawIdle} events=${events.map((event) => event.type).join(",")}`
    );
  }
}

async function verifyWorkspaceWrite(workspace, relativePath) {
  const content = await readFile(path.join(workspace, relativePath), "utf8");

  if (content !== generatedContent) {
    throw new Error(`Unexpected fake OpenCode workspace content: ${content}`);
  }
}

async function verifyDebugState(baseUrl) {
  const response = await fetch(`${baseUrl}/debug/state`, {
    headers: authorizationHeaders()
  });
  const body = await response.json();

  if (
    !response.ok ||
    body.permissionReplies?.[startup.permissionId]?.reply !== "once" ||
    body.sessions?.[startup.sessionId]?.completed !== true
  ) {
    throw new Error(`Debug state check failed: ${response.status}`);
  }
}

async function consumeSseEvents(url, onEvent, onReady) {
  const response = await fetch(url, {
    headers: authorizationHeaders()
  });

  if (!response.ok || !response.body) {
    throw new Error(`Event stream check failed: ${response.status}`);
  }

  onReady();

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const result = await reader.read();

    if (result.done === true) {
      return;
    }

    buffer += decoder.decode(result.value, { stream: true });
    const extracted = extractSseDataFrames(buffer);
    buffer = extracted.remainder;

    for (const frame of extracted.frames) {
      await onEvent(JSON.parse(frame));
    }
  }
}

function extractSseDataFrames(buffer) {
  const frames = [];
  const chunks = buffer.split(/\r?\n\r?\n/);
  const remainder = chunks.pop() ?? "";

  for (const chunk of chunks) {
    const data = chunk
      .split(/\r?\n/)
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice("data:".length).trimStart())
      .join("\n");

    if (data.trim()) {
      frames.push(data);
    }
  }

  return {
    frames,
    remainder
  };
}

function authorizationHeaders() {
  return {
    authorization: `Basic ${Buffer.from(`${username}:${password}`).toString(
      "base64"
    )}`
  };
}

function jsonHeaders(extra = {}) {
  return {
    ...authorizationHeaders(),
    "content-type": "application/json",
    ...extra
  };
}

async function stopServer(child) {
  if (child.exitCode !== null || child.signalCode !== null) {
    return;
  }

  child.kill("SIGTERM");

  await Promise.race([
    once(child, "exit"),
    new Promise((resolve) => {
      setTimeout(resolve, 2_000);
    })
  ]);

  if (child.exitCode === null && child.signalCode === null) {
    child.kill("SIGKILL");
    await once(child, "exit");
  }
}

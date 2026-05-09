#!/usr/bin/env node
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createInterface } from "node:readline";

const apiKey = "entangle-test-key";
const providerProcess = spawn(
  process.execPath,
  [
    "scripts/fake-openai-compatible-provider.mjs",
    "--port",
    "0",
    "--api-key",
    apiKey,
    "--tool-call-on-first-request",
    "--json-log"
  ],
  {
    cwd: process.cwd(),
    stdio: ["ignore", "pipe", "pipe"]
  }
);

let startup;

try {
  startup = await waitForStartup(providerProcess);
  await verifyHealth(startup.healthUrl);
  await verifyModels(startup.baseUrl);
  await verifyChatCompletion(startup.baseUrl);
  await verifyChatToolLoop(startup.baseUrl);
  await verifyChatStream(startup.baseUrl);
  await verifyResponsesStream(startup.baseUrl);
  console.log(
    `fake OpenAI-compatible provider smoke passed (${startup.baseUrl})`
  );
} finally {
  await stopProvider(providerProcess);
}

async function waitForStartup(child) {
  if (!child.stdout || !child.stderr) {
    throw new Error("Provider process did not expose stdout/stderr.");
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
          `Timed out waiting for provider startup. stderr=${stderrLines.join("").trim()}`
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
          typeof parsed.healthUrl !== "string"
        ) {
          reject(new Error(`Unexpected startup payload: ${line}`));
          return;
        }

        resolve(parsed);
      } catch (error) {
        reject(
          error instanceof Error
            ? error
            : new Error("Failed to parse provider startup payload.")
        );
      }
    });
  });

  const exitPromise = once(child, "exit").then(([code, signal]) => {
    throw new Error(
      `Provider exited before startup: code=${code ?? "none"} signal=${signal ?? "none"} stderr=${stderrLines.join("").trim()}`
    );
  });

  return Promise.race([startupPromise, exitPromise]);
}

async function verifyHealth(healthUrl) {
  const response = await fetch(healthUrl);
  const body = await response.json();

  if (!response.ok || body.ok !== true) {
    throw new Error(`Health check failed: ${response.status}`);
  }
}

async function verifyModels(baseUrl) {
  const response = await fetch(`${baseUrl}/models`, {
    headers: authorizationHeaders()
  });
  const body = await response.json();

  if (!response.ok || body.data?.[0]?.id !== "entangle-deterministic-test") {
    throw new Error(`Model list check failed: ${response.status}`);
  }
}

async function verifyChatCompletion(baseUrl) {
  const response = await fetch(`${baseUrl}/chat/completions`, {
    body: JSON.stringify({
      messages: [
        {
          content: "hello",
          role: "user"
        }
      ],
      model: "entangle-deterministic-test"
    }),
    headers: jsonHeaders(),
    method: "POST"
  });
  const body = await response.json();

  if (
    !response.ok ||
    body.choices?.[0]?.message?.content !==
      "Deterministic Entangle test provider response."
  ) {
    throw new Error(`Chat completion check failed: ${response.status}`);
  }
}

async function verifyChatToolLoop(baseUrl) {
  const firstResponse = await fetch(`${baseUrl}/chat/completions`, {
    body: JSON.stringify({
      messages: [
        {
          content: "inspect artifact",
          role: "user"
        }
      ],
      model: "entangle-deterministic-test",
      tool_choice: "auto",
      tools: [
        {
          function: {
            description: "Inspect an artifact.",
            name: "inspect_artifact_input",
            parameters: {
              properties: {
                artifactId: {
                  type: "string"
                }
              },
              required: ["artifactId"],
              type: "object"
            }
          },
          type: "function"
        }
      ]
    }),
    headers: jsonHeaders(),
    method: "POST"
  });
  const firstBody = await firstResponse.json();
  const toolCall = firstBody.choices?.[0]?.message?.tool_calls?.[0];

  if (
    !firstResponse.ok ||
    firstBody.choices?.[0]?.finish_reason !== "tool_calls" ||
    toolCall?.function?.name !== "inspect_artifact_input" ||
    JSON.parse(toolCall.function.arguments).artifactId !== "artifact-alpha"
  ) {
    throw new Error(`Chat tool-call request check failed: ${firstResponse.status}`);
  }

  const secondResponse = await fetch(`${baseUrl}/chat/completions`, {
    body: JSON.stringify({
      messages: [
        {
          content: "inspect artifact",
          role: "user"
        },
        {
          content: null,
          role: "assistant",
          tool_calls: [toolCall]
        },
        {
          content: JSON.stringify({
            artifactId: "artifact-alpha",
            preview: "Artifact content."
          }),
          role: "tool",
          tool_call_id: toolCall.id
        }
      ],
      model: "entangle-deterministic-test",
      tools: [
        {
          function: {
            description: "Inspect an artifact.",
            name: "inspect_artifact_input",
            parameters: {
              properties: {
                artifactId: {
                  type: "string"
                }
              },
              required: ["artifactId"],
              type: "object"
            }
          },
          type: "function"
        }
      ]
    }),
    headers: jsonHeaders(),
    method: "POST"
  });
  const secondBody = await secondResponse.json();

  if (
    !secondResponse.ok ||
    secondBody.choices?.[0]?.message?.content !==
      "Deterministic Entangle test provider response."
  ) {
    throw new Error(`Chat tool-result completion check failed: ${secondResponse.status}`);
  }
}

async function verifyChatStream(baseUrl) {
  const response = await fetch(`${baseUrl}/chat/completions`, {
    body: JSON.stringify({
      messages: [
        {
          content: "stream",
          role: "user"
        }
      ],
      model: "entangle-deterministic-test",
      stream: true
    }),
    headers: jsonHeaders(),
    method: "POST"
  });
  const body = await response.text();

  if (
    !response.ok ||
    !body.includes("chat.completion.chunk") ||
    !body.includes("[DONE]")
  ) {
    throw new Error(`Chat stream check failed: ${response.status}`);
  }
}

async function verifyResponsesStream(baseUrl) {
  const response = await fetch(`${baseUrl}/responses`, {
    body: JSON.stringify({
      input: "stream",
      model: "entangle-deterministic-test",
      stream: true
    }),
    headers: jsonHeaders(),
    method: "POST"
  });
  const body = await response.text();

  if (
    !response.ok ||
    !body.includes("response.output_text.delta") ||
    !body.includes("[DONE]")
  ) {
    throw new Error(`Responses stream check failed: ${response.status}`);
  }
}

function authorizationHeaders() {
  return {
    authorization: `Bearer ${apiKey}`
  };
}

function jsonHeaders() {
  return {
    ...authorizationHeaders(),
    "content-type": "application/json"
  };
}

async function stopProvider(child) {
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

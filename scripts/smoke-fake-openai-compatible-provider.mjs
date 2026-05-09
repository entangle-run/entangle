#!/usr/bin/env node
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
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
  await verifyScriptedProvider();
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

async function verifyScriptedProvider() {
  const tempDir = await mkdtemp(join(tmpdir(), "entangle-fake-openai-script-"));
  const scriptPath = join(tempDir, "script.json");
  const script = {
    chatCompletions: [
      {
        content: "Scripted first chat reply."
      },
      {
        toolCall: {
          arguments: {
            artifactId: "artifact-scripted"
          },
          id: "call_scripted_001",
          name: "inspect_artifact_input"
        }
      },
      {
        content: "Scripted final chat reply."
      },
      {
        error: {
          message: "scripted_chat_rate_limit",
          status: 429,
          type: "rate_limit_exceeded"
        }
      }
    ],
    responses: [
      {
        content: "Scripted Responses API reply."
      },
      {
        error: {
          message: "scripted_responses_unavailable",
          status: 503,
          type: "provider_unavailable"
        }
      }
    ]
  };

  await writeFile(scriptPath, `${JSON.stringify(script, null, 2)}\n`, "utf8");

  const child = spawn(
    process.execPath,
    [
      "scripts/fake-openai-compatible-provider.mjs",
      "--port",
      "0",
      "--api-key",
      apiKey,
      "--script",
      scriptPath,
      "--json-log"
    ],
    {
      cwd: process.cwd(),
      stdio: ["ignore", "pipe", "pipe"]
    }
  );

  try {
    const scriptedStartup = await waitForStartup(child);
    await verifyScriptedChatSequence(scriptedStartup.baseUrl);
    await verifyScriptedResponsesBody(scriptedStartup.baseUrl);
    await verifyScriptedErrorBodies(scriptedStartup.baseUrl);
  } finally {
    await stopProvider(child);
    await rm(tempDir, { recursive: true, force: true });
  }
}

async function verifyScriptedChatSequence(baseUrl) {
  const firstResponse = await fetch(`${baseUrl}/chat/completions`, {
    body: JSON.stringify({
      messages: [
        {
          content: "script first",
          role: "user"
        }
      ],
      model: "entangle-deterministic-test"
    }),
    headers: jsonHeaders(),
    method: "POST"
  });
  const firstBody = await firstResponse.json();

  if (
    !firstResponse.ok ||
    firstBody.choices?.[0]?.message?.content !== "Scripted first chat reply."
  ) {
    throw new Error(`Scripted first chat check failed: ${firstResponse.status}`);
  }

  const secondResponse = await fetch(`${baseUrl}/chat/completions`, {
    body: JSON.stringify({
      messages: [
        {
          content: "script tool",
          role: "user"
        }
      ],
      model: "entangle-deterministic-test",
      tool_choice: "auto",
      tools: [
        {
          function: {
            name: "inspect_artifact_input",
            parameters: {
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
  const scriptedToolCall = secondBody.choices?.[0]?.message?.tool_calls?.[0];

  if (
    !secondResponse.ok ||
    secondBody.choices?.[0]?.finish_reason !== "tool_calls" ||
    scriptedToolCall?.id !== "call_scripted_001" ||
    scriptedToolCall?.function?.name !== "inspect_artifact_input" ||
    JSON.parse(scriptedToolCall.function.arguments).artifactId !==
      "artifact-scripted"
  ) {
    throw new Error(`Scripted tool-call check failed: ${secondResponse.status}`);
  }

  const thirdResponse = await fetch(`${baseUrl}/chat/completions`, {
    body: JSON.stringify({
      messages: [
        {
          content: "script tool",
          role: "user"
        },
        {
          content: null,
          role: "assistant",
          tool_calls: [scriptedToolCall]
        },
        {
          content: JSON.stringify({
            artifactId: "artifact-scripted",
            preview: "Scripted artifact content."
          }),
          role: "tool",
          tool_call_id: scriptedToolCall.id
        }
      ],
      model: "entangle-deterministic-test"
    }),
    headers: jsonHeaders(),
    method: "POST"
  });
  const thirdBody = await thirdResponse.json();

  if (
    !thirdResponse.ok ||
    thirdBody.choices?.[0]?.message?.content !== "Scripted final chat reply."
  ) {
    throw new Error(`Scripted final chat check failed: ${thirdResponse.status}`);
  }
}

async function verifyScriptedErrorBodies(baseUrl) {
  const chatResponse = await fetch(`${baseUrl}/chat/completions`, {
    body: JSON.stringify({
      messages: [
        {
          content: "script error",
          role: "user"
        }
      ],
      model: "entangle-deterministic-test"
    }),
    headers: jsonHeaders(),
    method: "POST"
  });
  const chatBody = await chatResponse.json();

  if (
    chatResponse.status !== 429 ||
    chatBody.error?.message !== "scripted_chat_rate_limit" ||
    chatBody.error?.type !== "rate_limit_exceeded"
  ) {
    throw new Error(`Scripted chat error check failed: ${chatResponse.status}`);
  }

  const responsesResponse = await fetch(`${baseUrl}/responses`, {
    body: JSON.stringify({
      input: "script response error",
      model: "entangle-deterministic-test"
    }),
    headers: jsonHeaders(),
    method: "POST"
  });
  const responsesBody = await responsesResponse.json();

  if (
    responsesResponse.status !== 503 ||
    responsesBody.error?.message !== "scripted_responses_unavailable" ||
    responsesBody.error?.type !== "provider_unavailable"
  ) {
    throw new Error(
      `Scripted Responses API error check failed: ${responsesResponse.status}`
    );
  }
}

async function verifyScriptedResponsesBody(baseUrl) {
  const response = await fetch(`${baseUrl}/responses`, {
    body: JSON.stringify({
      input: "script response",
      model: "entangle-deterministic-test"
    }),
    headers: jsonHeaders(),
    method: "POST"
  });
  const body = await response.json();

  if (
    !response.ok ||
    body.output_text !== "Scripted Responses API reply."
  ) {
    throw new Error(`Scripted Responses API check failed: ${response.status}`);
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

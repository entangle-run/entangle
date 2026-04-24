#!/usr/bin/env node

import { spawnSync } from "node:child_process";

const defaultHostUrl = "http://localhost:7071";
const defaultStudioUrl = "http://localhost:3000";
const defaultGiteaUrl = "http://localhost:3001";
const defaultRelayUrl = "ws://localhost:7777";
const defaultTimeoutMs = 5000;

const args = process.argv.slice(2);
const skipCompose = args.includes("--skip-compose");
const skipRunnerImage = args.includes("--skip-runner-image");

function readFlagValue(name) {
  const inlinePrefix = `${name}=`;
  const inline = args.find((arg) => arg.startsWith(inlinePrefix));

  if (inline) {
    return inline.slice(inlinePrefix.length);
  }

  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

function readTimeoutMs() {
  const rawTimeout =
    readFlagValue("--timeout-ms") ??
    process.env.ENTANGLE_LOCAL_SMOKE_TIMEOUT_MS ??
    String(defaultTimeoutMs);
  const timeoutMs = Number.parseInt(rawTimeout, 10);

  return Number.isInteger(timeoutMs) && timeoutMs > 0
    ? timeoutMs
    : defaultTimeoutMs;
}

const timeoutMs = readTimeoutMs();
const hostUrl = normalizeHttpUrl(
  process.env.ENTANGLE_HOST_URL ?? process.env.ENTANGLE_LOCAL_HOST_URL,
  defaultHostUrl
);
const studioUrl = normalizeHttpUrl(
  process.env.ENTANGLE_STUDIO_URL ?? process.env.ENTANGLE_LOCAL_STUDIO_URL,
  defaultStudioUrl
);
const giteaUrl = normalizeHttpUrl(
  process.env.ENTANGLE_GITEA_URL ?? process.env.ENTANGLE_LOCAL_GITEA_URL,
  defaultGiteaUrl
);
const relayUrl =
  process.env.ENTANGLE_STRFRY_URL ??
  process.env.ENTANGLE_LOCAL_RELAY_URL ??
  defaultRelayUrl;
const hostToken =
  process.env.ENTANGLE_HOST_TOKEN ?? process.env.ENTANGLE_HOST_OPERATOR_TOKEN;

const checks = [];

function normalizeHttpUrl(value, fallback) {
  const rawUrl = value && value.trim().length > 0 ? value.trim() : fallback;
  return rawUrl.endsWith("/") ? rawUrl.slice(0, -1) : rawUrl;
}

function addCheck(name, status, detail) {
  checks.push({ detail, name, status });
}

function run(command, argsForCommand) {
  return spawnSync(command, argsForCommand, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
}

function normalizeOutput(result) {
  return `${result.stdout ?? ""}${result.stderr ?? ""}`.trim();
}

function summarizeText(text) {
  const normalized = text.replace(/\s+/g, " ").trim();
  return normalized.length > 160
    ? `${normalized.slice(0, 157)}...`
    : normalized;
}

function withTimeout(promise, name) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`${name} timed out after ${timeoutMs}ms.`));
    }, timeoutMs);
  });

  return Promise.race([promise, timeout]).finally(() => {
    clearTimeout(timer);
  });
}

async function fetchText(url, options = {}) {
  const headers = { ...(options.headers ?? {}) };

  if (options.authToken) {
    headers.authorization = `Bearer ${options.authToken}`;
  }

  const response = await withTimeout(
    fetch(url, {
      headers
    }),
    `GET ${url}`
  );
  const body = await response.text();

  if (!response.ok) {
    throw new Error(
      `GET ${url} returned ${response.status}: ${summarizeText(body)}`
    );
  }

  return body;
}

async function checkHttpJson(name, url, validator, options = {}) {
  try {
    const body = await fetchText(url, options);
    const parsed = JSON.parse(body);
    const detail = validator(parsed);
    addCheck(name, "pass", detail);
  } catch (error) {
    addCheck(name, "fail", error instanceof Error ? error.message : String(error));
  }
}

async function checkHttpText(name, url, validator) {
  try {
    const body = await fetchText(url);
    const detail = validator(body);
    addCheck(name, "pass", detail);
  } catch (error) {
    addCheck(name, "fail", error instanceof Error ? error.message : String(error));
  }
}

function validateHostStatus(payload) {
  if (!payload || typeof payload !== "object") {
    throw new Error("Host status response was not a JSON object.");
  }

  if (payload.service !== "entangle-host") {
    throw new Error("Host status response did not identify entangle-host.");
  }

  if (!["starting", "healthy", "degraded"].includes(payload.status)) {
    throw new Error("Host status response carried an unknown status.");
  }

  if (!payload.reconciliation || typeof payload.reconciliation !== "object") {
    throw new Error("Host status response did not include reconciliation state.");
  }

  if (!payload.runtimeCounts || typeof payload.runtimeCounts !== "object") {
    throw new Error("Host status response did not include runtime counts.");
  }

  return `status=${payload.status}; backend=${payload.reconciliation.backendKind}`;
}

function validateHostEvents(payload) {
  if (!payload || typeof payload !== "object" || !Array.isArray(payload.events)) {
    throw new Error("Host events response did not include an events array.");
  }

  return `events=${payload.events.length}`;
}

function validateStudioHtml(body) {
  if (!body.includes("<div id=\"root\">") && !body.includes("<div id=\"root\"></div>")) {
    throw new Error("Studio response did not look like the Vite application shell.");
  }

  return "application shell loaded";
}

function validateGiteaVersion(payload) {
  if (!payload || typeof payload !== "object" || typeof payload.version !== "string") {
    throw new Error("Gitea version response did not include a version string.");
  }

  return `version=${payload.version}`;
}

function checkComposeServices() {
  if (skipCompose) {
    addCheck("compose:services", "warn", "skipped by --skip-compose");
    return;
  }

  const result = run("docker", [
    "compose",
    "-f",
    "deploy/compose/docker-compose.local.yml",
    "ps",
    "--status",
    "running",
    "--services"
  ]);

  if (result.status !== 0) {
    addCheck(
      "compose:services",
      "fail",
      normalizeOutput(result) || "docker compose ps failed"
    );
    return;
  }

  const runningServices = new Set(
    result.stdout
      .split("\n")
      .map((service) => service.trim())
      .filter(Boolean)
  );
  const missingServices = ["studio", "host", "strfry", "gitea"].filter(
    (service) => !runningServices.has(service)
  );

  if (missingServices.length > 0) {
    addCheck(
      "compose:services",
      "fail",
      `missing running services: ${missingServices.join(", ")}`
    );
    return;
  }

  addCheck(
    "compose:services",
    "pass",
    `running services: ${Array.from(runningServices).sort().join(", ")}`
  );
}

function checkRunnerImage() {
  if (skipRunnerImage) {
    addCheck("runner:image", "warn", "skipped by --skip-runner-image");
    return;
  }

  const result = run("docker", [
    "image",
    "inspect",
    "entangle-runner:local",
    "--format",
    "{{.Id}}"
  ]);

  if (result.status !== 0) {
    addCheck(
      "runner:image",
      "fail",
      "missing entangle-runner:local; build it with the runner-build Compose profile"
    );
    return;
  }

  addCheck("runner:image", "pass", normalizeOutput(result).slice(0, 24));
}

async function checkRelay() {
  if (!globalThis.WebSocket) {
    addCheck("relay:websocket", "fail", "global WebSocket is unavailable in this Node runtime");
    return;
  }

  try {
    await withTimeout(
      new Promise((resolve, reject) => {
        const subscriptionId = `entangle-smoke-${Date.now()}`;
        const socket = new WebSocket(relayUrl);
        let settled = false;

        function settle(callback, value) {
          if (settled) {
            return;
          }

          settled = true;
          try {
            socket.close(1000, "local smoke complete");
          } catch {
            // Ignore close failures after the check has already completed.
          }
          callback(value);
        }

        socket.addEventListener("open", () => {
          socket.send(JSON.stringify(["REQ", subscriptionId, { limit: 1 }]));
        });

        socket.addEventListener("message", (event) => {
          const data = typeof event.data === "string" ? event.data : "";

          try {
            const parsed = JSON.parse(data);
            const messageType = Array.isArray(parsed) ? parsed[0] : undefined;

            if (messageType === "EOSE" || messageType === "EVENT") {
              socket.send(JSON.stringify(["CLOSE", subscriptionId]));
              settle(resolve, messageType);
            }
          } catch {
            settle(reject, new Error("Relay returned a non-JSON Nostr frame."));
          }
        });

        socket.addEventListener("error", () => {
          settle(reject, new Error(`Could not connect to relay at ${relayUrl}.`));
        });

        socket.addEventListener("close", (event) => {
          if (!settled && event.code !== 1000) {
            settle(
              reject,
              new Error(`Relay closed before smoke completed with code ${event.code}.`)
            );
          }
        });
      }),
      `WebSocket ${relayUrl}`
    );

    addCheck("relay:websocket", "pass", `Nostr REQ/EOSE path responded at ${relayUrl}`);
  } catch (error) {
    addCheck(
      "relay:websocket",
      "fail",
      error instanceof Error ? error.message : String(error)
    );
  }
}

checkComposeServices();
checkRunnerImage();

await Promise.all([
  checkHttpJson(
    "host:status",
    `${hostUrl}/v1/host/status`,
    validateHostStatus,
    { authToken: hostToken }
  ),
  checkHttpJson(
    "host:events",
    `${hostUrl}/v1/events?limit=1`,
    validateHostEvents,
    { authToken: hostToken }
  ),
  checkHttpText("studio:http", studioUrl, validateStudioHtml),
  checkHttpJson("gitea:version", `${giteaUrl}/api/v1/version`, validateGiteaVersion),
  checkRelay()
]);

const hasFailure = checks.some((check) => check.status === "fail");

for (const check of checks) {
  const prefix =
    check.status === "pass" ? "PASS" : check.status === "warn" ? "WARN" : "FAIL";
  console.log(`${prefix} ${check.name}: ${check.detail}`);
}

if (hasFailure) {
  console.error("Local profile smoke failed.");
  process.exit(1);
}

console.log("Local profile smoke passed.");

#!/usr/bin/env node

import { mkdtemp, readFile, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";

const defaultHostUrl = "http://localhost:7071";
const defaultStudioUrl = "http://localhost:3000";
const defaultGiteaUrl = "http://localhost:3001";
const defaultRelayUrl = "ws://localhost:7777";

const hostUrl = normalizeHttpUrl(
  process.env.ENTANGLE_HOST_URL,
  defaultHostUrl
);
const studioUrl = normalizeHttpUrl(
  process.env.ENTANGLE_STUDIO_URL,
  defaultStudioUrl
);
const giteaUrl = normalizeHttpUrl(
  process.env.ENTANGLE_GITEA_URL,
  defaultGiteaUrl
);
const relayUrl =
  process.env.ENTANGLE_RELAY_URL ??
  process.env.ENTANGLE_STRFRY_URL ??
  defaultRelayUrl;

function normalizeHttpUrl(value, fallback) {
  const rawUrl = value && value.trim().length > 0 ? value.trim() : fallback;
  return rawUrl.endsWith("/") ? rawUrl.slice(0, -1) : rawUrl;
}

function formatOutput(result) {
  return `${result.stdout ?? ""}${result.stderr ?? ""}`.trim();
}

function assertDiagnosticsBundle(bundle) {
  if (!bundle || typeof bundle !== "object") {
    throw new Error("Diagnostics bundle was not a JSON object.");
  }

  if (bundle.schemaVersion !== "1") {
    throw new Error("Diagnostics bundle did not use schemaVersion 1.");
  }

  if (!bundle.doctor || typeof bundle.doctor !== "object") {
    throw new Error("Diagnostics bundle did not include a doctor report.");
  }

  if (!Array.isArray(bundle.commands) || bundle.commands.length === 0) {
    throw new Error("Diagnostics bundle did not include command captures.");
  }

  if (!bundle.redaction?.applied) {
    throw new Error("Diagnostics bundle did not record active redaction.");
  }
}

const tempRoot = await mkdtemp(path.join(os.tmpdir(), "entangle-diagnostics-"));
const outputPath = path.join(tempRoot, "bundle.json");

try {
  const result = spawnSync(
    "pnpm",
    [
      "--filter",
      "@entangle/cli",
      "dev",
      "deployment",
      "diagnostics",
      "--output",
      outputPath,
      "--host-url",
      hostUrl,
      "--studio-url",
      studioUrl,
      "--gitea-url",
      giteaUrl,
      "--relay-url",
      relayUrl,
      "--event-limit",
      "10",
      "--log-tail",
      "20",
      "--max-command-output-chars",
      "8192"
    ],
    {
      encoding: "utf8",
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"]
    }
  );

  if (result.status !== 0) {
    throw new Error(
      [
        `Deployment diagnostics command failed with exit code ${result.status ?? "unknown"}.`,
        formatOutput(result)
      ]
        .filter(Boolean)
        .join("\n")
    );
  }

  const bundleText = await readFile(outputPath, "utf8");
  const bundle = JSON.parse(bundleText);

  assertDiagnosticsBundle(bundle);
  console.log(
    `Deployment diagnostics smoke passed: ${bundle.commands.length} command captures, doctor=${bundle.doctor.status}.`
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
} finally {
  await rm(tempRoot, {
    force: true,
    recursive: true
  });
}

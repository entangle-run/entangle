#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import {
  mkdtemp,
  mkdir,
  rm,
  writeFile
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);
const composeFile = "deploy/compose/docker-compose.local.yml";
const defaultHostUrl = "http://localhost:7071";
const defaultTimeoutMs = 120_000;
const defaultPollIntervalMs = 2_000;

const args = process.argv.slice(2);
const suffix = Date.now().toString(36);
const packageId = `runtime-smoke-package-${suffix}`;
const packageSourceId = `runtime-smoke-source-${suffix}`;
const graphId = `runtime-smoke-graph-${suffix}`;
const userNodeId = `runtime-smoke-user-${suffix}`;
const workerNodeId = `runtime-smoke-worker-${suffix}`;
const edgeId = `runtime-smoke-edge-${suffix}`;
const modelEndpointId = `runtime-smoke-model-${suffix}`;
const secretRef = `secret://local/runtime-smoke-model-${suffix}`;
const hostPackagePath = `/tmp/${packageSourceId}`;
const smokeSecret = `runtime-smoke-secret-${suffix}`;

function readFlagValue(name) {
  const inlinePrefix = `${name}=`;
  const inline = args.find((arg) => arg.startsWith(inlinePrefix));

  if (inline) {
    return inline.slice(inlinePrefix.length);
  }

  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

function readPositiveInteger(name, fallback) {
  const rawValue = readFlagValue(name);
  const value = rawValue ? Number.parseInt(rawValue, 10) : fallback;

  return Number.isInteger(value) && value > 0 ? value : fallback;
}

function normalizeHttpUrl(value, fallback) {
  const rawUrl = value && value.trim().length > 0 ? value.trim() : fallback;
  return rawUrl.endsWith("/") ? rawUrl.slice(0, -1) : rawUrl;
}

const timeoutMs = readPositiveInteger("--timeout-ms", defaultTimeoutMs);
const pollIntervalMs = readPositiveInteger(
  "--poll-interval-ms",
  defaultPollIntervalMs
);
const hostUrl = normalizeHttpUrl(
  process.env.ENTANGLE_HOST_URL ?? process.env.ENTANGLE_LOCAL_HOST_URL,
  defaultHostUrl
);
const hostToken =
  process.env.ENTANGLE_HOST_TOKEN ?? process.env.ENTANGLE_HOST_OPERATOR_TOKEN;

function run(command, commandArgs, options = {}) {
  return spawnSync(command, commandArgs, {
    cwd: repositoryRoot,
    encoding: "utf8",
    stdio: options.capture ? ["ignore", "pipe", "pipe"] : "inherit"
  });
}

function formatCapturedOutput(result) {
  return `${result.stdout ?? ""}${result.stderr ?? ""}`.trim();
}

function requireSuccess(step, command, commandArgs) {
  const result = run(command, commandArgs, { capture: true });

  if (result.status !== 0) {
    throw new Error(
      [
        `${step} failed with exit code ${result.status ?? "unknown"}.`,
        formatCapturedOutput(result)
      ]
        .filter(Boolean)
        .join("\n")
    );
  }

  const output = formatCapturedOutput(result);

  if (output) {
    console.log(output);
  }
}

function sleep(milliseconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

async function writeJsonFile(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function writeSmokePackage(packageRoot) {
  await Promise.all([
    mkdir(path.join(packageRoot, "prompts"), { recursive: true }),
    mkdir(path.join(packageRoot, "runtime"), { recursive: true }),
    mkdir(path.join(packageRoot, "memory", "seed", "wiki"), { recursive: true }),
    mkdir(path.join(packageRoot, "memory", "schema"), { recursive: true })
  ]);

  await Promise.all([
    writeJsonFile(path.join(packageRoot, "manifest.json"), {
      schemaVersion: "1",
      packageId,
      name: "Runtime Smoke Package",
      version: "0.1.0",
      packageKind: "template",
      defaultNodeKind: "worker",
      capabilities: [],
      entryPrompts: {
        system: "prompts/system.md",
        interaction: "prompts/interaction.md"
      },
      memoryProfile: {
        wikiSeedPath: "memory/seed/wiki",
        schemaPath: "memory/schema/AGENTS.md"
      },
      runtime: {
        configPath: "runtime/config.json",
        capabilitiesPath: "runtime/capabilities.json",
        toolsPath: "runtime/tools.json"
      },
      metadata: {
        description: "Disposable package used by the local runtime lifecycle smoke.",
        tags: ["smoke"]
      }
    }),
    writeFile(
      path.join(packageRoot, "prompts", "system.md"),
      "# Runtime Smoke System\n",
      "utf8"
    ),
    writeFile(
      path.join(packageRoot, "prompts", "interaction.md"),
      "# Runtime Smoke Interaction\n",
      "utf8"
    ),
    writeJsonFile(path.join(packageRoot, "runtime", "config.json"), {
      runtimeProfile: "hackathon_local",
      toolBudget: {
        maxOutputTokens: 256,
        maxToolTurns: 2
      }
    }),
    writeJsonFile(path.join(packageRoot, "runtime", "capabilities.json"), {
      capabilities: []
    }),
    writeJsonFile(path.join(packageRoot, "runtime", "tools.json"), {
      schemaVersion: "1",
      tools: []
    }),
    writeFile(
      path.join(packageRoot, "memory", "seed", "wiki", "index.md"),
      "# Runtime Smoke Wiki\n",
      "utf8"
    ),
    writeFile(
      path.join(packageRoot, "memory", "schema", "AGENTS.md"),
      "# Runtime Smoke Memory Rules\n",
      "utf8"
    )
  ]);
}

async function hostRequest(method, route, body) {
  const headers = {};

  if (body !== undefined) {
    headers["content-type"] = "application/json";
  }

  if (hostToken?.trim()) {
    headers.authorization = `Bearer ${hostToken.trim()}`;
  }

  const response = await fetch(`${hostUrl}${route}`, {
    method,
    headers,
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  });
  const responseBody = await response.text();
  const parsedBody =
    responseBody.trim().length === 0 ? undefined : JSON.parse(responseBody);

  if (!response.ok) {
    throw new Error(
      `${method} ${route} returned ${response.status}: ${responseBody}`
    );
  }

  return parsedBody;
}

function assertValidationOk(label, response) {
  if (!response?.validation?.ok) {
    throw new Error(`${label} validation failed: ${JSON.stringify(response)}`);
  }
}

function buildSmokeCatalog(catalog) {
  return {
    ...catalog,
    modelEndpoints: [
      ...catalog.modelEndpoints.filter(
        (endpoint) => endpoint.id !== modelEndpointId
      ),
      {
        id: modelEndpointId,
        displayName: "Runtime Smoke Model Endpoint",
        adapterKind: "anthropic",
        baseUrl: "http://runtime-smoke-model.invalid",
        authMode: "header_secret",
        secretRef,
        defaultModel: "runtime-smoke-model"
      }
    ],
    defaults: {
      ...catalog.defaults,
      modelEndpointRef: modelEndpointId
    }
  };
}

function buildSmokeGraph(catalog) {
  const relayProfileRefs = catalog.defaults.relayProfileRefs;
  const primaryRelayProfileRef = relayProfileRefs[0];
  const gitServiceRef = catalog.defaults.gitServiceRef;

  return {
    schemaVersion: "1",
    graphId,
    name: "Runtime Smoke Graph",
    nodes: [
      {
        nodeId: userNodeId,
        displayName: "Runtime Smoke User",
        nodeKind: "user"
      },
      {
        nodeId: workerNodeId,
        displayName: "Runtime Smoke Worker",
        nodeKind: "worker",
        packageSourceRef: packageSourceId,
        resourceBindings: {
          relayProfileRefs,
          ...(primaryRelayProfileRef ? { primaryRelayProfileRef } : {}),
          gitServiceRefs: gitServiceRef ? [gitServiceRef] : [],
          ...(gitServiceRef ? { primaryGitServiceRef: gitServiceRef } : {}),
          modelEndpointProfileRef: modelEndpointId,
          externalPrincipalRefs: []
        }
      }
    ],
    edges: [
      {
        edgeId,
        fromNodeId: userNodeId,
        toNodeId: workerNodeId,
        relation: "delegates_to",
        enabled: true,
        transportPolicy: {
          mode: "bidirectional_shared_set",
          relayProfileRefs,
          channel: "runtime-smoke"
        }
      }
    ],
    defaults: {
      resourceBindings: {
        relayProfileRefs,
        ...(primaryRelayProfileRef ? { primaryRelayProfileRef } : {}),
        gitServiceRefs: gitServiceRef ? [gitServiceRef] : [],
        ...(gitServiceRef ? { primaryGitServiceRef: gitServiceRef } : {}),
        modelEndpointProfileRef: modelEndpointId,
        externalPrincipalRefs: []
      },
      runtimeProfile: "hackathon_local"
    }
  };
}

async function waitForRuntime(predicate, label) {
  const deadline = Date.now() + timeoutMs;
  let lastInspection;

  while (Date.now() <= deadline) {
    const inspection = await hostRequest("GET", `/v1/runtimes/${workerNodeId}`);
    lastInspection = inspection;

    if (predicate(inspection)) {
      return inspection;
    }

    await sleep(pollIntervalMs);
  }

  throw new Error(
    `${label} did not complete within ${timeoutMs}ms. Last inspection: ${JSON.stringify(lastInspection)}`
  );
}

function printPass(name, detail) {
  console.log(`PASS ${name}: ${detail}`);
}

async function assertRestartEvent(restartGeneration) {
  const response = await hostRequest("GET", "/v1/events?limit=100");
  const matchingEvent = response.events?.find(
    (event) =>
      event.type === "runtime.restart.requested" &&
      event.nodeId === workerNodeId &&
      event.restartGeneration === restartGeneration
  );

  if (!matchingEvent) {
    throw new Error(
      `No runtime.restart.requested host event was found for '${workerNodeId}' generation '${restartGeneration}'.`
    );
  }

  printPass(
    "runtime-smoke:restart-event",
    `event=${matchingEvent.eventId}; generation=${restartGeneration}`
  );
}

async function main() {
  let tempRoot;

  try {
    tempRoot = await mkdtemp(path.join(os.tmpdir(), "entangle-runtime-smoke-"));
    const packageRoot = path.join(tempRoot, packageId);
    await writeSmokePackage(packageRoot);

    requireSuccess("Remove stale host smoke package", "docker", [
      "compose",
      "-f",
      composeFile,
      "exec",
      "-T",
      "host",
      "sh",
      "-lc",
      `rm -rf ${hostPackagePath}`
    ]);
    requireSuccess("Copy smoke package into host container", "docker", [
      "compose",
      "-f",
      composeFile,
      "cp",
      packageRoot,
      `host:${hostPackagePath}`
    ]);
    requireSuccess("Write smoke model secret", "docker", [
      "compose",
      "-f",
      composeFile,
      "exec",
      "-T",
      "host",
      "sh",
      "-lc",
      [
        "mkdir -p /entangle-secrets/refs/local",
        `printf '%s\\n' '${smokeSecret}' > /entangle-secrets/refs/local/${secretRef.split("/").at(-1)}`,
        `chmod 600 /entangle-secrets/refs/local/${secretRef.split("/").at(-1)}`
      ].join(" && ")
    ]);
    printPass("runtime-smoke:host-fixtures", hostPackagePath);

    const catalogInspection = await hostRequest("GET", "/v1/catalog");

    if (!catalogInspection.catalog) {
      throw new Error("Host did not return an active deployment resource catalog.");
    }

    const catalogResponse = await hostRequest(
      "PUT",
      "/v1/catalog",
      buildSmokeCatalog(catalogInspection.catalog)
    );
    assertValidationOk("Runtime smoke catalog", catalogResponse);
    printPass("runtime-smoke:catalog", modelEndpointId);

    const packageResponse = await hostRequest("POST", "/v1/package-sources/admit", {
      sourceKind: "local_path",
      packageSourceId,
      absolutePath: hostPackagePath
    });
    assertValidationOk("Runtime smoke package source", packageResponse);
    printPass("runtime-smoke:package-source", packageSourceId);

    const graphResponse = await hostRequest(
      "PUT",
      "/v1/graph",
      buildSmokeGraph(catalogResponse.catalog)
    );
    assertValidationOk("Runtime smoke graph", graphResponse);
    printPass("runtime-smoke:graph", graphId);

    const startInspection = await hostRequest(
      "POST",
      `/v1/runtimes/${workerNodeId}/start`
    );
    if (!startInspection.contextAvailable) {
      throw new Error(`Runtime context was unavailable: ${JSON.stringify(startInspection)}`);
    }

    const runningInspection = await waitForRuntime(
      (inspection) =>
        inspection.desiredState === "running" &&
        inspection.observedState === "running" &&
        inspection.contextAvailable,
      "Runtime start"
    );
    printPass(
      "runtime-smoke:start",
      `observed=${runningInspection.observedState}; generation=${runningInspection.restartGeneration}`
    );

    const restartResponse = await hostRequest(
      "POST",
      `/v1/runtimes/${workerNodeId}/restart`
    );
    const expectedRestartGeneration = restartResponse.restartGeneration;
    const restartedInspection = await waitForRuntime(
      (inspection) =>
        inspection.desiredState === "running" &&
        inspection.observedState === "running" &&
        inspection.restartGeneration === expectedRestartGeneration,
      "Runtime restart"
    );
    printPass(
      "runtime-smoke:restart",
      `observed=${restartedInspection.observedState}; generation=${restartedInspection.restartGeneration}`
    );
    await assertRestartEvent(expectedRestartGeneration);

    await hostRequest("POST", `/v1/runtimes/${workerNodeId}/stop`);
    const stoppedInspection = await waitForRuntime(
      (inspection) =>
        inspection.desiredState === "stopped" &&
        inspection.observedState === "stopped",
      "Runtime stop"
    );
    printPass(
      "runtime-smoke:stop",
      `observed=${stoppedInspection.observedState}; generation=${stoppedInspection.restartGeneration}`
    );

    console.log("Local runtime lifecycle smoke passed.");
  } finally {
    if (tempRoot) {
      await rm(tempRoot, { force: true, recursive: true });
    }

    run(
      "docker",
      [
        "compose",
        "-f",
        composeFile,
        "exec",
        "-T",
        "host",
        "sh",
        "-lc",
        `rm -rf ${hostPackagePath}`
      ],
      { capture: true }
    );
  }
}

await main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});

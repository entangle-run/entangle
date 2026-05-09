#!/usr/bin/env node

import { spawn, spawnSync } from "node:child_process";
import { federatedDevProfileComposeFile } from "./federated-dev-profile-paths.mjs";

const rawArgs = process.argv.slice(2);
const separatorIndex = rawArgs.indexOf("--");
const args =
  separatorIndex >= 0 ? rawArgs.slice(0, separatorIndex) : rawArgs.slice();
const passThroughArgs =
  separatorIndex >= 0 ? rawArgs.slice(separatorIndex + 1) : [];

const help = args.includes("--help") || args.includes("-h");
const dryRun = args.includes("--dry-run");
const skipBuild = args.includes("--skip-build");
const skipRelay = args.includes("--skip-relay");
const withStudio = args.includes("--with-studio");
const fakeOpenCodeServer =
  args.includes("--fake-opencode-server") ||
  args.includes("--use-fake-opencode-server");
const fakeExternalHttpEngine =
  args.includes("--fake-external-http-engine") ||
  args.includes("--use-fake-external-http-engine");
const relayUrl =
  readFlagValue("--relay-url") ??
  process.env.ENTANGLE_RELAY_URL ??
  process.env.ENTANGLE_STRFRY_URL ??
  "ws://localhost:7777";
const timeoutMs = readFlagValue("--timeout-ms");
const userClientStaticDir = readFlagValue("--user-client-static-dir");
const studioHost = readFlagValue("--studio-host") ?? "0.0.0.0";
const studioPort = readFlagValue("--studio-port") ?? "3000";

function usage() {
  console.log(`Usage: pnpm ops:demo-user-node-runtime [options] [-- smoke args]

Build and run the fastest interactive Entangle graph-node demo.

The command builds the dedicated User Client app, starts the local development
relay unless skipped, and then runs the process-runner federated smoke in
--keep-running mode. The smoke prints the Host URL, operator token, both User
Client URLs, and useful CLI commands. Press Ctrl-C in the demo terminal to stop
Host and all joined runner processes.

Options:
  --relay-url <url>              Relay URL for Host and runners. Default: ws://localhost:7777
  --timeout-ms <milliseconds>    Timeout passed to the process-runner smoke.
  --user-client-static-dir <dir> Serve a specific built User Client directory.
  --fake-opencode-server         Use the deterministic attached fake OpenCode server profile.
  --fake-external-http-engine    Use the deterministic fake external_http engine profile.
  --with-studio                  Start Studio automatically after Host URL and token are known.
  --studio-host <host>           Studio dev server host when --with-studio is enabled. Default: 0.0.0.0
  --studio-port <port>           Studio dev server port when --with-studio is enabled. Default: 3000
  --skip-build                   Do not build apps/user-client before running.
  --skip-relay                   Do not start the local strfry service first.
  --dry-run                      Print the commands without running them.
  -h, --help                     Show this help.

Examples:
  pnpm ops:demo-user-node-runtime
  pnpm ops:demo-user-node-runtime --with-studio
  pnpm ops:demo-user-node-runtime:fake-opencode
  pnpm ops:demo-user-node-runtime:fake-external-http
  pnpm ops:demo-user-node-runtime -- --keep-temp
  pnpm ops:demo-user-node-runtime --skip-relay --relay-url ws://relay.example:7777
`);
}

function readFlagValue(name) {
  const inlinePrefix = `${name}=`;
  const inline = args.find((arg) => arg.startsWith(inlinePrefix));

  if (inline) {
    return inline.slice(inlinePrefix.length);
  }

  const index = args.indexOf(name);

  return index >= 0 ? args[index + 1] : undefined;
}

function run(label, command, commandArgs) {
  const printable = `${command} ${commandArgs.join(" ")}`;

  if (dryRun) {
    console.log(`[dry-run] ${label}: ${printable}`);
    return;
  }

  console.log(`[demo] ${label}: ${printable}`);
  const result = spawnSync(command, commandArgs, {
    encoding: "utf8",
    stdio: "inherit"
  });

  if (result.status !== 0) {
    process.exitCode = result.status ?? 1;
    throw new Error(
      `${label} failed with exit code ${result.status ?? "unknown"}.`
    );
  }
}

async function runWithStudio(command, commandArgs) {
  const studioOrigins = buildStudioCorsOrigins();
  const smoke = spawn(command, commandArgs, {
    env: {
      ...process.env,
      ENTANGLE_PROCESS_SMOKE_EXTRA_CORS_ORIGINS: studioOrigins.join(",")
    },
    stdio: ["inherit", "pipe", "pipe"]
  });

  let hostUrl;
  let hostToken;
  let outputBuffer = "";
  let studioProcess;
  let stopping = false;

  const stopChild = (child, signal) => {
    if (child && child.exitCode === null && child.signalCode === null) {
      child.kill(signal);
    }
  };

  const stopAll = (signal) => {
    stopping = true;
    stopChild(studioProcess, signal);
    stopChild(smoke, signal);
  };

  const startStudioIfReady = () => {
    if (studioProcess || !hostUrl || !hostToken) {
      return;
    }

    const studioArgs = [
      "--filter",
      "@entangle/studio",
      "dev",
      "--",
      "--host",
      studioHost,
      "--port",
      studioPort
    ];
    console.log(`[demo] Starting Studio admin surface: pnpm ${studioArgs.join(" ")}`);
    console.log(`[demo] Studio requested URL: http://localhost:${studioPort}`);
    studioProcess = spawn("pnpm", studioArgs, {
      env: {
        ...process.env,
        VITE_ENTANGLE_HOST_TOKEN: hostToken,
        VITE_ENTANGLE_HOST_URL: hostUrl
      },
      stdio: "inherit"
    });
    studioProcess.on("exit", (code, signal) => {
      if (stopping || smoke.exitCode !== null || smoke.signalCode !== null) {
        return;
      }

      if (code !== 0) {
        console.error(
          `[demo] Studio exited before the runtime demo stopped (code=${code ?? "null"}, signal=${signal ?? "none"}).`
        );
        stopAll("SIGTERM");
      }
    });
  };

  const inspectLine = (line) => {
    const hostMatch = line.match(/^PASS manual-host:\s+(.+)$/u);
    if (hostMatch) {
      hostUrl = hostMatch[1].trim();
      startStudioIfReady();
      return;
    }

    const tokenMatch = line.match(/^PASS manual-token:\s+(.+)$/u);
    if (tokenMatch) {
      hostToken = tokenMatch[1].trim();
      startStudioIfReady();
    }
  };

  const consumeStdout = (chunk) => {
    const text = chunk.toString();
    process.stdout.write(text);
    outputBuffer += text;
    const lines = outputBuffer.split(/\r?\n/u);
    outputBuffer = lines.pop() ?? "";
    for (const line of lines) {
      inspectLine(line);
    }
  };

  smoke.stdout.on("data", consumeStdout);
  smoke.stderr.on("data", (chunk) => process.stderr.write(chunk));

  const onSignal = (signal) => {
    stopAll(signal);
  };
  process.once("SIGINT", onSignal);
  process.once("SIGTERM", onSignal);

  await new Promise((resolve, reject) => {
    smoke.on("error", reject);
    smoke.on("exit", (code, signal) => {
      if (outputBuffer.length > 0) {
        inspectLine(outputBuffer);
        outputBuffer = "";
      }

      stopChild(studioProcess, "SIGTERM");
      process.off("SIGINT", onSignal);
      process.off("SIGTERM", onSignal);

      if (code === 0) {
        resolve();
        return;
      }

      const exitCode =
        typeof code === "number" ? code : signal === "SIGINT" ? 130 : 1;
      process.exitCode = exitCode;
      reject(
        new Error(
          `Runtime demo exited with code ${code ?? "null"} and signal ${signal ?? "none"}.`
        )
      );
    });
  });
}

if (fakeOpenCodeServer && fakeExternalHttpEngine) {
  console.error(
    "Choose either --fake-opencode-server or --fake-external-http-engine, not both."
  );
  process.exit(1);
}

function buildSmokeArgs() {
  const smokeArgs = [
    "ops:smoke-federated-process-runner",
    "--",
    "--keep-running",
    `--relay-url=${relayUrl}`
  ];

  if (timeoutMs) {
    smokeArgs.push(`--timeout-ms=${timeoutMs}`);
  }

  if (userClientStaticDir) {
    smokeArgs.push(`--user-client-static-dir=${userClientStaticDir}`);
  }

  if (
    fakeOpenCodeServer &&
    !passThroughArgs.includes("--use-fake-opencode-server")
  ) {
    smokeArgs.push("--use-fake-opencode-server");
  }

  if (
    fakeExternalHttpEngine &&
    !passThroughArgs.includes("--use-fake-external-http-engine")
  ) {
    smokeArgs.push("--use-fake-external-http-engine");
  }

  smokeArgs.push(...passThroughArgs);

  return smokeArgs;
}

function buildStudioCorsOrigins() {
  const origins = [`http://localhost:${studioPort}`, `http://127.0.0.1:${studioPort}`];
  const normalizedHost = studioHost.trim();

  if (
    normalizedHost.length > 0 &&
    normalizedHost !== "0.0.0.0" &&
    normalizedHost !== "::" &&
    normalizedHost !== "localhost" &&
    normalizedHost !== "127.0.0.1"
  ) {
    origins.push(`http://${normalizedHost}:${studioPort}`);
  }

  return [...new Set(origins)];
}

async function main() {
  if (help) {
    usage();
    return;
  }

  if (!skipBuild) {
    run("Build User Client app", "pnpm", [
      "--filter",
      "@entangle/user-client",
      "build"
    ]);
  }

  if (!skipRelay) {
    run("Start development relay", "docker", [
      "compose",
      "-f",
      federatedDevProfileComposeFile,
      "up",
      "-d",
      "strfry"
    ]);
  }

  if (!dryRun) {
    console.log(
      "[demo] Starting Host, one agent runner, and two User Node runtimes. Press Ctrl-C to stop."
    );
  }

  const smokeArgs = buildSmokeArgs();

  if (withStudio && dryRun) {
    console.log(
      "[dry-run] Studio admin surface would start after the smoke prints PASS manual-host and PASS manual-token"
    );
  }

  if (withStudio && !dryRun) {
    await runWithStudio("pnpm", smokeArgs);
    return;
  }

  run("Run interactive User Node runtime demo", "pnpm", smokeArgs);
}

try {
  await main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(process.exitCode && process.exitCode > 0 ? process.exitCode : 1);
}

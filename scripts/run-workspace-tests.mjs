#!/usr/bin/env node

import { readdirSync } from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);
const vitestBin = path.join(
  repositoryRoot,
  "node_modules",
  "vitest",
  "vitest.mjs"
);
const vitestConfig = path.join(repositoryRoot, "vitest.config.ts");
const coverage = process.argv.includes("--coverage");
const startupTimeoutMs = 15_000;
const timeoutRetryDelayMs = 1_000;

const workspaces = [
  {
    files: "src/*.test.ts",
    path: "packages/agent-engine",
    timeoutMs: 60_000
  },
  {
    files: "src/*.test.ts",
    path: "apps/cli",
    poolArgs: ["--pool=forks", "--maxWorkers=1"],
    timeoutMs: 120_000
  },
  {
    files: "src/*.test.ts",
    path: "packages/host-client",
    timeoutMs: 60_000
  },
  {
    files: "src/index.test.ts",
    path: "packages/nostr-fabric",
    timeoutMs: 60_000
  },
  {
    files: "src/index.test.ts",
    path: "packages/package-scaffold",
    timeoutMs: 60_000
  },
  {
    files: "src/*.test.ts",
    path: "apps/studio",
    poolArgs: ["--pool=forks"],
    timeoutMs: 60_000
  },
  {
    files: "src/index.test.ts",
    path: "packages/types",
    timeoutMs: 60_000
  },
  {
    files: "src/*.test.ts",
    path: "apps/user-client",
    poolArgs: ["--pool=forks", "--maxWorkers=1"],
    timeoutMs: 60_000
  },
  {
    files: "src/index.test.ts",
    path: "packages/validator",
    timeoutMs: 60_000
  },
  {
    files: "src/*.test.ts",
    path: "services/runner",
    poolArgs: ["--pool=forks", "--maxWorkers=1", "--testTimeout=30000"],
    timeoutMs: 180_000
  },
  {
    files: "src/*.test.ts",
    path: "services/host",
    poolArgs: ["--pool=forks", "--maxWorkers=1", "--testTimeout=30000"],
    splitFiles: true,
    timeoutMs: 180_000
  }
];

class WorkspaceCommandError extends Error {
  constructor(message, input = {}) {
    super(message);
    this.name = "WorkspaceCommandError";
    this.timedOut = input.timedOut === true;
  }
}

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function resolveTestFiles(workspace) {
  const workspaceRoot = path.join(repositoryRoot, workspace.path);

  if (workspace.files === "src/*.test.ts") {
    return readdirSync(path.join(workspaceRoot, "src"))
      .filter((entry) => entry.endsWith(".test.ts"))
      .sort()
      .map((entry) => path.join("src", entry));
  }

  return [workspace.files];
}

function runVitestCommand(input) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, input.args, {
      cwd: input.cwd,
      stdio: ["ignore", "pipe", "pipe"]
    });
    let timedOut = false;
    let timeoutMessage = `timed out after ${input.timeoutMs}ms`;
    let killTimer;
    const terminateChild = (message) => {
      timedOut = true;
      timeoutMessage = message;
      child.kill("SIGTERM");
      killTimer = setTimeout(() => {
        child.kill("SIGKILL");
      }, 5_000);
    };
    const startupTimer = setTimeout(() => {
      terminateChild(`produced no output after ${startupTimeoutMs}ms`);
    }, startupTimeoutMs);
    const timer = setTimeout(() => {
      terminateChild(`timed out after ${input.timeoutMs}ms`);
    }, input.timeoutMs);

    const forwardOutput = (stream, chunk) => {
      clearTimeout(startupTimer);
      stream.write(chunk);
    };
    child.stdout?.on("data", (chunk) => {
      forwardOutput(process.stdout, chunk);
    });
    child.stderr?.on("data", (chunk) => {
      forwardOutput(process.stderr, chunk);
    });

    child.on("error", (error) => {
      clearTimeout(startupTimer);
      clearTimeout(timer);
      if (killTimer) {
        clearTimeout(killTimer);
      }
      reject(error);
    });

    child.on("close", (code, signal) => {
      clearTimeout(startupTimer);
      clearTimeout(timer);
      if (killTimer) {
        clearTimeout(killTimer);
      }

      if (timedOut) {
        reject(
          new WorkspaceCommandError(timeoutMessage, {
            timedOut: true
          })
        );
        return;
      }

      if (code !== 0) {
        reject(
          new WorkspaceCommandError(
            signal
              ? `exited with signal ${signal}`
              : `exited with code ${code ?? "unknown"}`
          )
        );
        return;
      }

      resolve();
    });
  });
}

async function runWorkspaceTest(workspace) {
  const fileSets = workspace.splitFiles
    ? resolveTestFiles(workspace).map((testFile) => [testFile])
    : [resolveTestFiles(workspace)];

  for (const files of fileSets) {
    const args = [
      vitestBin,
      "run",
      "--config",
      vitestConfig,
      "--environment",
      "node",
      ...(workspace.poolArgs ?? []),
      ...files
    ];

    if (coverage) {
      args.push("--coverage.enabled", "true");
    }

    console.log(
      `\n[workspace-test] ${workspace.path}${
        files.length === 1 ? ` ${files[0]}` : ""
      }`
    );
    const maxAttempts = 2;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        await runVitestCommand({
          args,
          cwd: path.join(repositoryRoot, workspace.path),
          timeoutMs: workspace.timeoutMs
        });
        break;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const shouldRetry =
          error instanceof WorkspaceCommandError &&
          error.timedOut &&
          attempt < maxAttempts;

        if (!shouldRetry) {
          throw new Error(
            `Workspace test '${workspace.path}' failed to complete: ${message}`
          );
        }

        console.warn(
          `[workspace-test] ${workspace.path} ${files.join(
            " "
          )} timed out before completion; retrying once.`
        );
        await delay(timeoutRetryDelayMs);
      }
    }
  }
}

try {
  for (const workspace of workspaces) {
    await runWorkspaceTest(workspace);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

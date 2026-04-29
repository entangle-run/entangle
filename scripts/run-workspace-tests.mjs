#!/usr/bin/env node
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pnpmBin = process.platform === "win32" ? "pnpm.cmd" : "pnpm";

const suites = [
  {
    name: "@entangle/types",
    directory: "packages/types",
    timeoutMs: 120_000
  },
  {
    name: "@entangle/nostr-fabric",
    directory: "packages/nostr-fabric",
    timeoutMs: 120_000
  },
  {
    name: "@entangle/user-client",
    directory: "apps/user-client",
    timeoutMs: 120_000
  },
  {
    name: "@entangle/validator",
    directory: "packages/validator",
    timeoutMs: 120_000
  },
  {
    name: "@entangle/agent-engine",
    directory: "packages/agent-engine",
    timeoutMs: 120_000
  },
  {
    name: "@entangle/package-scaffold",
    directory: "packages/package-scaffold",
    timeoutMs: 120_000
  },
  {
    name: "@entangle/host-client",
    directory: "packages/host-client",
    timeoutMs: 120_000
  },
  {
    name: "@entangle/runner",
    directory: "services/runner",
    timeoutMs: 180_000
  },
  {
    name: "@entangle/host",
    directory: "services/host",
    timeoutMs: 180_000
  },
  {
    name: "@entangle/studio",
    directory: "apps/studio",
    timeoutMs: 120_000
  },
  {
    name: "@entangle/cli",
    directory: "apps/cli",
    timeoutMs: 120_000
  }
];

const interSuiteDelayMs = 1000;
let activeChild;

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function killActiveChild(signal = "SIGTERM") {
  if (!activeChild?.pid || activeChild.exitCode !== null) {
    return;
  }

  activeChild.kill(signal);
}

async function runSuite(suite) {
  console.log(`\n[workspace-test] ${suite.name}`);

  await new Promise((resolve, reject) => {
    let timedOut = false;
    const child = spawn(pnpmBin, ["--dir", suite.directory, "test"], {
      cwd: repoRoot,
      env: {
        ...process.env,
        CI: process.env.CI ?? "true"
      },
      stdio: "inherit"
    });
    activeChild = child;

    const timeout = setTimeout(() => {
      timedOut = true;
      console.error(
        `[workspace-test] ${suite.name} exceeded ${suite.timeoutMs}ms; terminating.`
      );
      killActiveChild("SIGTERM");
      setTimeout(() => killActiveChild("SIGKILL"), 5_000).unref();
    }, suite.timeoutMs);

    child.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });

    child.on("exit", (code, signal) => {
      clearTimeout(timeout);
      activeChild = undefined;

      if (timedOut) {
        reject(new Error(`${suite.name} timed out.`));
        return;
      }

      if (code === 0) {
        resolve();
        return;
      }

      reject(
        new Error(
          `${suite.name} failed${code === null ? "" : ` with exit code ${code}`}${
            signal ? ` and signal ${signal}` : ""
          }.`
        )
      );
    });
  });
}

process.on("SIGINT", () => {
  killActiveChild("SIGINT");
  process.exit(130);
});

process.on("SIGTERM", () => {
  killActiveChild("SIGTERM");
  process.exit(143);
});

try {
  for (const suite of suites) {
    await runSuite(suite);
    await sleep(interSuiteDelayMs);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}

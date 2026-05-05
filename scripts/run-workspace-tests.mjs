#!/usr/bin/env node

import { spawnSync } from "node:child_process";

const coverage = process.argv.includes("--coverage");

const workspaces = [
  {
    path: "packages/agent-engine",
    timeoutMs: 60_000
  },
  {
    path: "apps/cli",
    timeoutMs: 120_000
  },
  {
    path: "packages/host-client",
    timeoutMs: 60_000
  },
  {
    path: "packages/nostr-fabric",
    timeoutMs: 60_000
  },
  {
    path: "packages/package-scaffold",
    timeoutMs: 60_000
  },
  {
    path: "apps/studio",
    timeoutMs: 60_000
  },
  {
    path: "packages/types",
    timeoutMs: 60_000
  },
  {
    path: "apps/user-client",
    timeoutMs: 60_000
  },
  {
    path: "packages/validator",
    timeoutMs: 60_000
  },
  {
    path: "services/runner",
    timeoutMs: 180_000
  },
  {
    path: "services/host",
    timeoutMs: 180_000
  }
];

function runWorkspaceTest(workspace) {
  const args = ["-C", workspace.path, "test"];

  if (coverage) {
    args.push("--coverage.enabled", "true");
  }

  console.log(`\n[workspace-test] ${workspace.path}`);
  const result = spawnSync("pnpm", args, {
    encoding: "utf8",
    stdio: "inherit",
    timeout: workspace.timeoutMs
  });

  if (result.error) {
    const message =
      result.error.name === "Error" && result.error.message
        ? result.error.message
        : String(result.error);
    throw new Error(
      `Workspace test '${workspace.path}' failed to complete: ${message}`
    );
  }

  if (result.status !== 0) {
    throw new Error(
      `Workspace test '${workspace.path}' failed with exit code ${
        result.status ?? "unknown"
      }.`
    );
  }
}

try {
  for (const workspace of workspaces) {
    runWorkspaceTest(workspace);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

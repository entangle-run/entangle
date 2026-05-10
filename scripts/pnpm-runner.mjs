import { spawn, spawnSync } from "node:child_process";

const pinnedPnpmPackage = "pnpm@10.18.3";

export function resolvePnpmInvocation(args) {
  const pnpmExecPath = process.env.npm_execpath?.includes("pnpm")
    ? process.env.npm_execpath
    : undefined;

  if (pnpmExecPath) {
    return {
      args,
      command: pnpmExecPath
    };
  }

  return {
    args: ["exec", "--yes", pinnedPnpmPackage, "--", ...args],
    command: "npm"
  };
}

export function runPnpmSync(args, options = {}) {
  const invocation = resolvePnpmInvocation(args);

  return spawnSync(invocation.command, invocation.args, options);
}

export function spawnPnpm(args, options = {}) {
  const invocation = resolvePnpmInvocation(args);

  return spawn(invocation.command, invocation.args, options);
}

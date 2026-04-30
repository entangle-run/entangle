#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { chmod, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { normalizeDistributedProofProfile } from "./distributed-proof-profile.mjs";

const rawArgs = process.argv.slice(2);
const dryRun = hasFlag("--dry-run");
const help = hasFlag("--help") || hasFlag("-h");
const outputDir = path.resolve(
  readFlagValue("--output") ?? ".entangle/distributed-proof-kit"
);
const hostUrl =
  readFlagValue("--host-url") ??
  process.env.ENTANGLE_HOST_URL ??
  "http://localhost:7071";
const requestedHostTokenEnvVar = readFlagValue("--host-token-env-var");
const hostToken =
  readFlagValue("--host-token") ??
  (requestedHostTokenEnvVar ? process.env[requestedHostTokenEnvVar] : undefined) ??
  process.env.ENTANGLE_HOST_TOKEN ??
  process.env.ENTANGLE_HOST_OPERATOR_TOKEN;
const noHostTokenEnvVar = hasFlag("--no-host-token-env-var");
const hostTokenEnvVar = noHostTokenEnvVar
  ? undefined
  : requestedHostTokenEnvVar ?? (hostToken ? "ENTANGLE_HOST_TOKEN" : undefined);
const writeHostToken = hasFlag("--write-host-token");
const runnerSecretEnvVar =
  readFlagValue("--runner-secret-env-var") ?? "ENTANGLE_RUNNER_NOSTR_SECRET_KEY";
const relayUrls = splitRepeatedValues(readFlagValues("--relay-url"));
const gitServiceRefs = splitRepeatedValues(readFlagValues("--git-service-ref"));
const checkRelayHealth = hasFlag("--check-relay-health");
const checkGitBackendHealth = hasFlag("--check-git-backend-health");
const heartbeatIntervalMs = readFlagValue("--heartbeat-interval-ms") ?? "1000";
const requestedAgentEngineKinds = splitRepeatedValues(
  readFlagValues("--agent-engine-kind")
);
const proofAgentEngineKinds =
  requestedAgentEngineKinds.length > 0
    ? requestedAgentEngineKinds
    : ["opencode_server"];
const agentRunnerId = readFlagValue("--agent-runner") ?? "distributed-agent-runner";
const userRunnerId = readFlagValue("--user-runner") ?? "distributed-user-runner";
const reviewerUserRunnerId =
  readFlagValue("--reviewer-user-runner") ?? "distributed-reviewer-user-runner";
const agentNodeId = readFlagValue("--agent-node") ?? "builder";
const userNodeId = readFlagValue("--user-node") ?? "user";
const reviewerUserNodeId = readFlagValue("--reviewer-user-node") ?? "reviewer";

const runnerProfiles = [
  {
    agentEngineKinds: proofAgentEngineKinds,
    assignmentId: `assignment-${agentRunnerId}`,
    directory: "agent-runner",
    id: agentRunnerId,
    labels: ["distributed-proof", "agent"],
    nodeId: agentNodeId,
    runtimeKinds: ["agent_runner"]
  },
  {
    agentEngineKinds: [],
    assignmentId: `assignment-${userRunnerId}`,
    directory: "user-runner",
    id: userRunnerId,
    labels: ["distributed-proof", "human-interface"],
    nodeId: userNodeId,
    runtimeKinds: ["human_interface"]
  },
  {
    agentEngineKinds: [],
    assignmentId: `assignment-${reviewerUserRunnerId}`,
    directory: "reviewer-user-runner",
    id: reviewerUserRunnerId,
    labels: ["distributed-proof", "human-interface", "reviewer-user"],
    nodeId: reviewerUserNodeId,
    runtimeKinds: ["human_interface"]
  }
];

function usage() {
  console.log(`Usage: pnpm ops:distributed-proof-kit [options]

Generate a three-runner distributed proof kit for Entangle.

The command expects an already reachable Host. It asks the Host for authority
and relay defaults through the CLI, writes three runner join configs, creates
runner-local env/start scripts, and creates operator commands for trust,
assignment, User Node messaging, projection inspection, and User Client
discovery. Copy each runner directory to the intended machine and start it
there from an Entangle checkout.

Options:
  --output <dir>                    Output directory. Default: .entangle/distributed-proof-kit
  --host-url <url>                  Reachable Host API URL. Default: ENTANGLE_HOST_URL or http://localhost:7071
  --host-token <token>              Host bearer token used while generating configs.
  --host-token-env-var <envVar>     Env var runners will read for the Host token. Default: ENTANGLE_HOST_TOKEN when a token is available
  --no-host-token-env-var           Omit Host bearer-token env config for no-auth Hosts.
  --write-host-token                Write the Host token into generated runner/operator env files.
  --relay-url <url>                 Relay URL. May be repeated or comma-separated. Defaults to Host status relays.
  --check-relay-health              Include relay WebSocket health checks in the generated verifier command and proof profile. Requires at least one --relay-url.
  --git-service-ref <id>            Git service ref expected by the distributed proof. May be repeated or comma-separated.
  --check-git-backend-health        Include git backend health checks in the generated verifier command and proof profile.
  --heartbeat-interval-ms <ms>      Runner heartbeat interval in generated configs. Default: 1000
  --runner-secret-env-var <envVar>  Env var runners will read for their Nostr secret. Default: ENTANGLE_RUNNER_NOSTR_SECRET_KEY
  --agent-engine-kind <kind>         Agent runner engine kind. May be repeated or comma-separated. Default: opencode_server
  --agent-runner <id>               Agent runner id. Default: distributed-agent-runner
  --user-runner <id>                Primary User Node runner id. Default: distributed-user-runner
  --reviewer-user-runner <id>       Reviewer User Node runner id. Default: distributed-reviewer-user-runner
  --agent-node <nodeId>             Agent graph node id to assign. Default: builder
  --user-node <nodeId>              Primary User Node id to assign and message as. Default: user
  --reviewer-user-node <nodeId>     Reviewer User Node id to assign. Default: reviewer
  --dry-run                         Print commands without writing files.
  -h, --help                        Show this help.

Examples:
  ENTANGLE_HOST_TOKEN=dev-token pnpm ops:distributed-proof-kit --host-url http://host.example:7071 --relay-url ws://relay.example:7777
  pnpm ops:distributed-proof-kit --output /tmp/entangle-proof --host-token dev-token --write-host-token
`);
}

function hasFlag(name) {
  return rawArgs.includes(name);
}

function readFlagValue(name) {
  const inlinePrefix = `${name}=`;
  const inline = rawArgs.find((arg) => arg.startsWith(inlinePrefix));

  if (inline) {
    return inline.slice(inlinePrefix.length);
  }

  const index = rawArgs.indexOf(name);

  return index >= 0 ? rawArgs[index + 1] : undefined;
}

function readFlagValues(name) {
  const inlinePrefix = `${name}=`;
  const values = rawArgs
    .filter((arg) => arg.startsWith(inlinePrefix))
    .map((arg) => arg.slice(inlinePrefix.length));

  for (let index = 0; index < rawArgs.length; index += 1) {
    if (rawArgs[index] === name && rawArgs[index + 1]) {
      values.push(rawArgs[index + 1]);
    }
  }

  return values;
}

function splitRepeatedValues(values) {
  return [
    ...new Set(
      values
        .flatMap((value) => value.split(","))
        .map((value) => value.trim())
        .filter((value) => value.length > 0)
    )
  ];
}

function shellQuote(value) {
  return `'${String(value).replaceAll("'", "'\\''")}'`;
}

function randomSecretHex() {
  return randomBytes(32).toString("hex");
}

function buildCliEnv() {
  return {
    ...process.env,
    ...(hostToken ? { ENTANGLE_HOST_TOKEN: hostToken } : {})
  };
}

function buildRunnerJoinConfigArgs(profile) {
  const joinConfigPath = path.join(outputDir, profile.directory, "runner-join.json");
  const args = [
    "--filter",
    "@entangle/cli",
    "dev",
    "runners",
    "--host-url",
    hostUrl,
    "join-config",
    "--runner",
    profile.id,
    "--output",
    joinConfigPath,
    "--host-api-url",
    hostUrl,
    "--secret-env-var",
    runnerSecretEnvVar,
    "--heartbeat-interval-ms",
    heartbeatIntervalMs,
    "--summary"
  ];

  if (hostTokenEnvVar) {
    args.push("--host-token-env-var", hostTokenEnvVar);
  }

  for (const runtimeKind of profile.runtimeKinds) {
    args.push("--runtime-kind", runtimeKind);
  }

  for (const engineKind of profile.agentEngineKinds) {
    args.push("--agent-engine-kind", engineKind);
  }

  for (const label of profile.labels) {
    args.push("--label", label);
  }

  for (const relayUrl of relayUrls) {
    args.push("--relay-url", relayUrl);
  }

  return args;
}

function run(label, command, args) {
  const printableCommand = `${command} ${args.map(shellQuote).join(" ")}`;

  if (dryRun) {
    const envPrefix = hostToken ? "ENTANGLE_HOST_TOKEN=*** " : "";
    console.log(`[dry-run] ${label}: ${envPrefix}${printableCommand}`);
    return;
  }

  console.log(`[kit] ${label}: ${printableCommand}`);
  const result = spawnSync(command, args, {
    encoding: "utf8",
    env: buildCliEnv(),
    stdio: "inherit"
  });

  if (result.status !== 0) {
    throw new Error(`${label} failed with exit code ${result.status ?? "unknown"}.`);
  }
}

async function writeExecutable(filePath, content) {
  await writeFile(filePath, content, "utf8");
  await chmod(filePath, 0o755);
}

function buildRunnerEnvContent(profile, runnerSecret) {
  const hostTokenValue =
    writeHostToken && hostToken ? hostToken : "REPLACE_WITH_HOST_TOKEN";
  const hostTokenLine = hostTokenEnvVar
    ? [`export ${hostTokenEnvVar}=${shellQuote(hostTokenValue)}`]
    : ["# Host token env omitted because --no-host-token-env-var was used or no Host token was available."];

  return [
    `# Entangle distributed proof runner env for ${profile.id}.`,
    `export ${runnerSecretEnvVar}=${shellQuote(runnerSecret)}`,
    ...hostTokenLine,
    ""
  ].join("\n");
}

function buildRunnerStartScript(profile) {
  return `#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
ENTANGLE_REPO_ROOT="\${ENTANGLE_REPO_ROOT:-$(pwd)}"

set -a
# shellcheck disable=SC1091
. "$SCRIPT_DIR/runner.env"
set +a

${hostTokenEnvVar ? `if [ "\${${hostTokenEnvVar}:-}" = "REPLACE_WITH_HOST_TOKEN" ]; then
  echo "Set ${hostTokenEnvVar} in $SCRIPT_DIR/runner.env or the environment before starting this runner." >&2
  exit 1
fi` : "# Host bearer-token env is not configured for this no-auth proof kit."}

export ENTANGLE_RUNNER_STATE_ROOT="\${ENTANGLE_RUNNER_STATE_ROOT:-$SCRIPT_DIR/state}"

cd "$ENTANGLE_REPO_ROOT"
exec pnpm --filter @entangle/runner exec tsx src/index.ts join --config "$SCRIPT_DIR/runner-join.json"
`;
}

function buildOperatorEnvContent() {
  const hostTokenValue =
    writeHostToken && hostToken ? hostToken : "REPLACE_WITH_HOST_TOKEN";
  const hostTokenLine = hostToken
    ? [`export ENTANGLE_HOST_TOKEN=${shellQuote(hostTokenValue)}`]
    : ["# export ENTANGLE_HOST_TOKEN='REPLACE_WITH_HOST_TOKEN'"];

  return [
    "# Entangle distributed proof operator env.",
    `export ENTANGLE_HOST_URL=${shellQuote(hostUrl)}`,
    ...hostTokenLine,
    ""
  ].join("\n");
}

function buildOperatorCommandsScript() {
  const lines = [
    "#!/usr/bin/env bash",
    "set -euo pipefail",
    "",
    'SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"',
    'ENTANGLE_REPO_ROOT="${ENTANGLE_REPO_ROOT:-$(pwd)}"',
    "",
    "set -a",
    "# shellcheck disable=SC1091",
    '. "$SCRIPT_DIR/operator.env"',
    "set +a",
    "",
    hostToken ? 'if [ "${ENTANGLE_HOST_TOKEN:-}" = "REPLACE_WITH_HOST_TOKEN" ]; then' : "# No Host token was available when this kit was generated.",
    ...(hostToken
      ? [
    '  echo "Set ENTANGLE_HOST_TOKEN in $SCRIPT_DIR/operator.env or the environment before running operator commands." >&2',
    "  exit 1",
    "fi"
        ]
      : []),
    "",
    'cd "$ENTANGLE_REPO_ROOT"',
    "",
    'run_cli() {',
    '  pnpm --filter @entangle/cli dev "$@"',
    "}",
    "",
    "run_cli runners list --summary"
  ];

  for (const profile of runnerProfiles) {
    lines.push(
      `run_cli runners trust ${shellQuote(profile.id)} --trusted-by distributed-proof --reason ${shellQuote("Distributed proof runner")} --summary`
    );
  }

  for (const profile of runnerProfiles) {
    lines.push(
      `run_cli assignments offer --node ${shellQuote(profile.nodeId)} --runner ${shellQuote(profile.id)} --assignment-id ${shellQuote(profile.assignmentId)} --summary`
    );
  }

  lines.push(
    "run_cli assignments list --summary",
    "run_cli user-nodes clients --summary",
    `run_cli user-nodes message ${shellQuote(userNodeId)} ${shellQuote(agentNodeId)} ${shellQuote("Implement a small change and report what you changed.")} --message-type task.request --compact`,
    "run_cli host projection --summary",
    '"$SCRIPT_DIR/verify-topology.sh"',
    ""
  );

  return `${lines.join("\n")}\n`;
}

function buildVerifierCommand(options = {}) {
  const args = [
    'pnpm ops:distributed-proof-verify --profile "$SCRIPT_DIR/proof-profile.json"',
    '--host-url "$ENTANGLE_HOST_URL"',
    "--check-user-client-health",
    "--require-conversation"
  ];

  if (checkGitBackendHealth) {
    args.push("--check-git-backend-health");
  }

  if (checkRelayHealth) {
    args.push("--check-relay-health");
  }

  if (options.requireArtifactEvidence) {
    args.push("--require-artifact-evidence");
  }

  return args.join(" ");
}

function buildOperatorVerifierScript(options = {}) {
  const lines = [
    "#!/usr/bin/env bash",
    "set -euo pipefail",
    "",
    'SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"',
    'ENTANGLE_REPO_ROOT="${ENTANGLE_REPO_ROOT:-$(pwd)}"',
    "",
    "set -a",
    "# shellcheck disable=SC1091",
    '. "$SCRIPT_DIR/operator.env"',
    "set +a",
    "",
    hostToken ? 'if [ "${ENTANGLE_HOST_TOKEN:-}" = "REPLACE_WITH_HOST_TOKEN" ]; then' : "# No Host token was available when this kit was generated.",
    ...(hostToken
      ? [
    '  echo "Set ENTANGLE_HOST_TOKEN in $SCRIPT_DIR/operator.env or the environment before running verifier commands." >&2',
    "  exit 1",
    "fi"
        ]
      : []),
    "",
    'cd "$ENTANGLE_REPO_ROOT"',
    "",
    buildVerifierCommand(options),
    ""
  ];

  return `${lines.join("\n")}\n`;
}

function buildProofProfile() {
  return normalizeDistributedProofProfile({
    agentEngineKind: proofAgentEngineKinds[0],
    agentEngineKinds: proofAgentEngineKinds,
    agentNodeId,
    agentRunnerId,
    assignments: runnerProfiles.map((profile) => ({
      assignmentId: profile.assignmentId,
      nodeId: profile.nodeId,
      runnerId: profile.id,
      runtimeKinds: profile.runtimeKinds
    })),
    ...(checkRelayHealth ? { checkRelayHealth: true } : {}),
    ...(checkGitBackendHealth ? { checkGitBackendHealth: true } : {}),
    checkUserClientHealth: true,
    ...(gitServiceRefs.length > 0 ? { gitServiceRefs } : {}),
    hostUrl,
    relayUrls,
    requireConversation: true,
    reviewerUserNodeId,
    reviewerUserRunnerId,
    schemaVersion: 1,
    userNodeId,
    userRunnerId
  }, {
    sourceLabel: "Generated distributed proof profile"
  });
}

function buildReadme() {
  const runnerRows = runnerProfiles
    .map(
      (profile) =>
        `| ${profile.directory} | ${profile.id} | ${profile.runtimeKinds.join(", ")} | ${profile.agentEngineKinds.join(", ") || "none"} | ${profile.nodeId} |`
    )
    .join("\n");
  const relayText = relayUrls.length > 0 ? relayUrls.join(", ") : "Host status relay defaults";

  return `# Entangle Distributed Proof Kit

This kit is generated for a topology-faithful Entangle proof. Host, relay, git,
and runners do not need to share a filesystem. Each runner directory can be
copied to a different machine that has an Entangle checkout, Node, pnpm, git,
and network access to the Host API and relay.

## Generated Topology

Host API: ${hostUrl}
Relay URLs: ${relayText}
Git service refs: ${gitServiceRefs.length > 0 ? gitServiceRefs.join(", ") : "Host catalog default"}

| Directory | Runner id | Runtime kinds | Agent engine kinds | Graph node to assign |
| --- | --- | --- | --- | --- |
${runnerRows}

## Machine Steps

1. Keep Host running on the Host machine with a graph containing the node ids in
   the table, reachable relay configuration, reachable git artifact backend,
   and an operator token if Host auth is enabled.
2. Copy each runner directory to its intended runner machine.
3. On each runner machine, set \`ENTANGLE_REPO_ROOT\` to that machine's Entangle
   checkout, edit \`runner.env\` if the Host token is not written, then run
   \`./start.sh\` from that runner directory.
4. After the runners publish \`runner.hello\`, run
   \`operator/commands.sh\` from the Host/operator machine to trust runners,
   offer assignments, list User Client URLs, send a signed User Node task, and
   inspect Host projection and run the distributed proof verifier.
5. After the agent has produced projected work evidence, run
   \`operator/verify-artifacts.sh\` from the Host/operator machine to require
   projected artifact, source-change, source-history, or wiki evidence from
   the agent node.

## Files

- \`agent-runner/runner-join.json\`: generic agent runner join config for the configured engine kind(s).
- \`user-runner/runner-join.json\`: primary User Node Human Interface Runtime join config.
- \`reviewer-user-runner/runner-join.json\`: reviewer User Node Human Interface Runtime join config.
- \`*/runner.env\`: runner-local Nostr secret and Host token placeholder or value.
- \`*/start.sh\`: runner-machine start command.
- \`operator/operator.env\`: Host URL and Host token placeholder or value.
- \`operator/proof-profile.json\`: machine-readable runner, node, engine, relay, optional git-service, conversation, User Client health, and post-work evidence profile for the verifier.
- \`operator/commands.sh\`: operator commands for trust, assignment, user message, projection, and verification.
- \`operator/verify-topology.sh\`: repeatable topology, runtime, conversation, and optional relay/git verification.
- \`operator/verify-artifacts.sh\`: post-work verifier requiring projected artifact/source/wiki evidence from the agent node.

The generated runner join configs use the same generic \`entangle-runner join\`
path as local process and Docker proofs. If this kit only works when copied to
the Host machine, the proof has failed.
`;
}

async function writeKit() {
  if (dryRun) {
    console.log(`[dry-run] output: ${outputDir}`);
    for (const profile of runnerProfiles) {
      run(`Generate ${profile.id} join config`, "pnpm", buildRunnerJoinConfigArgs(profile));
    }
    console.log(`[dry-run] operator verifier command: ${buildVerifierCommand()}`);
    console.log(
      `[dry-run] operator artifact verifier command: ${buildVerifierCommand({
        requireArtifactEvidence: true
      })}`
    );
    console.log(`[dry-run] operator proof profile: ${JSON.stringify(buildProofProfile())}`);
    console.log(
      "[dry-run] would write runner env/start scripts, operator commands, verifier scripts, and README."
    );
    return;
  }

  await mkdir(outputDir, { recursive: true });

  for (const profile of runnerProfiles) {
    const profileDir = path.join(outputDir, profile.directory);
    await mkdir(profileDir, { recursive: true });
    run(`Generate ${profile.id} join config`, "pnpm", buildRunnerJoinConfigArgs(profile));
    await writeFile(
      path.join(profileDir, "runner.env"),
      buildRunnerEnvContent(profile, randomSecretHex()),
      "utf8"
    );
    await writeExecutable(path.join(profileDir, "start.sh"), buildRunnerStartScript(profile));
  }

  const operatorDir = path.join(outputDir, "operator");
  await mkdir(operatorDir, { recursive: true });
  await writeFile(path.join(operatorDir, "operator.env"), buildOperatorEnvContent(), "utf8");
  await writeFile(
    path.join(operatorDir, "proof-profile.json"),
    `${JSON.stringify(buildProofProfile(), null, 2)}\n`,
    "utf8"
  );
  await writeExecutable(path.join(operatorDir, "commands.sh"), buildOperatorCommandsScript());
  await writeExecutable(
    path.join(operatorDir, "verify-topology.sh"),
    buildOperatorVerifierScript()
  );
  await writeExecutable(
    path.join(operatorDir, "verify-artifacts.sh"),
    buildOperatorVerifierScript({
      requireArtifactEvidence: true
    })
  );
  await writeFile(path.join(outputDir, "README.md"), buildReadme(), "utf8");
  console.log(`[kit] Wrote distributed proof kit to ${outputDir}`);
}

if (help) {
  usage();
  process.exit(0);
}

try {
  if (checkRelayHealth && relayUrls.length === 0) {
    throw new Error(
      "--check-relay-health requires at least one explicit --relay-url so the generated proof profile can be verified from another machine."
    );
  }

  await writeKit();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

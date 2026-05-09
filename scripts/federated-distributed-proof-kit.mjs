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
const checkPublishedGitRef = hasFlag("--check-published-git-ref");
const requireExternalUserClientUrls = hasFlag(
  "--require-external-user-client-urls"
);
const requireExternalHostUrl = hasFlag("--require-external-host-url");
const requireUserClientBasicAuth = hasFlag("--require-user-client-basic-auth");
const userClientBasicAuthEnvVar =
  readFlagValue("--user-client-basic-auth-env-var") ??
  "ENTANGLE_HUMAN_INTERFACE_BASIC_AUTH";
const userClientBasicAuthPlaceholder = "REPLACE_WITH_USERNAME_PASSWORD";
const writeRunnerCompose = hasFlag("--write-runner-compose");
const runnerComposeImage =
  readFlagValue("--runner-compose-image") ?? "entangle-runner:federated-dev";
const runnerComposeNetwork =
  readFlagValue("--runner-compose-network") ?? "entangle-proof";
const runnerComposeExternalNetwork = hasFlag("--runner-compose-external-network");
const heartbeatIntervalMs = readFlagValue("--heartbeat-interval-ms") ?? "1000";
const requestedAgentEngineKinds = splitRepeatedValues(
  readFlagValues("--agent-engine-kind")
);
const fakeOpenCodeServerUrl = readFlagValue("--fake-opencode-server-url");
const fakeOpenCodeProfileId =
  readFlagValue("--fake-opencode-profile") ?? "distributed-fake-opencode";
const fakeOpenCodeUsername = readFlagValue("--fake-opencode-username");
const fakeOpenCodePassword = readFlagValue("--fake-opencode-password");
const externalProcessEngineExecutable = readFlagValue(
  "--external-process-engine-executable"
);
const externalHttpEngineUrl = readFlagValue("--external-http-engine-url");
const configuredCustomAgentEngineKind = externalHttpEngineUrl
  ? "external_http"
  : externalProcessEngineExecutable
    ? "external_process"
    : undefined;
const customAgentEngineProfileId =
  readFlagValue("--custom-agent-engine-profile") ??
  (configuredCustomAgentEngineKind === "external_http"
    ? "distributed-external-http"
    : "distributed-external-process");
const proofAgentEngineKinds =
  requestedAgentEngineKinds.length > 0
    ? requestedAgentEngineKinds
    : configuredCustomAgentEngineKind
      ? [configuredCustomAgentEngineKind]
      : ["opencode_server"];
const agentRunnerId = readFlagValue("--agent-runner") ?? "distributed-agent-runner";
const userRunnerId = readFlagValue("--user-runner") ?? "distributed-user-runner";
const reviewerUserRunnerId =
  readFlagValue("--reviewer-user-runner") ?? "distributed-reviewer-user-runner";
const agentNodeId = readFlagValue("--agent-node") ?? "builder";
const userNodeId = readFlagValue("--user-node") ?? "user";
const reviewerUserNodeId = readFlagValue("--reviewer-user-node") ?? "reviewer";

if (requireUserClientBasicAuth) {
  validateEnvVarName(
    userClientBasicAuthEnvVar,
    "--user-client-basic-auth-env-var"
  );
}

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
Generated verifier scripts write JUnit reports when ENTANGLE_PROOF_JUNIT_DIR
is set in the operator environment.

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
  --check-published-git-ref         Include git ls-remote checks for post-work published git artifact refs.
  --require-external-user-client-urls
                                    Include verifier checks that reject loopback or wildcard User Client URLs.
  --require-external-host-url       Include verifier checks that reject loopback or wildcard Host API URLs.
  --require-user-client-basic-auth  Add a required Human Interface Runtime Basic Auth env placeholder to generated User Node runner env files.
  --user-client-basic-auth-env-var <envVar>
                                    Source env var for generated User Client Basic Auth placeholders. Default: ENTANGLE_HUMAN_INTERFACE_BASIC_AUTH
  --write-runner-compose           Write docker-compose.runners.yml and container-native runner start scripts for same-machine container-boundary proofs.
  --runner-compose-image <image>   Runner image for generated runner Compose services. Default: entangle-runner:federated-dev
  --runner-compose-network <name>  Network name for generated runner Compose services. Default: entangle-proof
  --runner-compose-external-network
                                    Treat --runner-compose-network as an already-created external Docker network.
  --heartbeat-interval-ms <ms>      Runner heartbeat interval in generated configs. Default: 1000
  --runner-secret-env-var <envVar>  Env var runners will read for their Nostr secret. Default: ENTANGLE_RUNNER_NOSTR_SECRET_KEY
  --agent-engine-kind <kind>         Agent runner engine kind. May be repeated or comma-separated. Default: opencode_server
  --fake-opencode-server-url <url>  Configure operator commands for a deterministic attached fake OpenCode server.
  --fake-opencode-profile <id>      Agent engine profile id for the fake OpenCode server. Default: distributed-fake-opencode
  --fake-opencode-username <user>   Optional Basic auth username for the fake OpenCode server.
  --fake-opencode-password <pass>   Optional Basic auth password for the fake OpenCode server.
  --external-process-engine-executable <cmd>
                                    Configure operator commands for an external_process profile and bind the agent node to it.
  --external-http-engine-url <url>   Configure operator commands for an external_http profile and bind the agent node to it.
  --custom-agent-engine-profile <id> Agent engine profile id for external_process/external_http setup.
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

function validateEnvVarName(value, label) {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/u.test(value)) {
    throw new Error(`${label} must be a valid shell environment variable name.`);
  }
}

function isExternalHttpUrl(value) {
  let parsed;

  try {
    parsed = new URL(value);
  } catch {
    return false;
  }

  const hostname = parsed.hostname.toLowerCase();

  return (
    (parsed.protocol === "http:" || parsed.protocol === "https:") &&
    hostname !== "localhost" &&
    hostname !== "0.0.0.0" &&
    hostname !== "::" &&
    hostname !== "::1" &&
    !hostname.startsWith("127.")
  );
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
  const fakeOpenCodeLines =
    fakeOpenCodeServerUrl && profile.id === agentRunnerId
      ? [
          "",
          "# Optional attached fake OpenCode credentials for this proof.",
          ...(fakeOpenCodeUsername
            ? [`export OPENCODE_SERVER_USERNAME=${shellQuote(fakeOpenCodeUsername)}`]
            : [
                "# OPENCODE_SERVER_USERNAME omitted; fake OpenCode server is expected to allow unauthenticated requests."
              ]),
          ...(fakeOpenCodePassword
            ? [`export OPENCODE_SERVER_PASSWORD=${shellQuote(fakeOpenCodePassword)}`]
            : [
                "# OPENCODE_SERVER_PASSWORD omitted; fake OpenCode server is expected to allow unauthenticated requests."
              ])
        ]
      : [];
  const userClientBasicAuthEnvLine =
    `export ENTANGLE_HUMAN_INTERFACE_BASIC_AUTH="\${${userClientBasicAuthEnvVar}:-` +
    `${userClientBasicAuthPlaceholder}}"`;
  const userClientBasicAuthLines =
    requireUserClientBasicAuth && profile.runtimeKinds.includes("human_interface")
      ? [
          "",
          "# Required Basic Auth for this Human Interface Runtime User Client.",
          userClientBasicAuthEnvLine
        ]
      : [];

  return [
    `# Entangle distributed proof runner env for ${profile.id}.`,
    `export ${runnerSecretEnvVar}=${shellQuote(runnerSecret)}`,
    ...hostTokenLine,
    ...fakeOpenCodeLines,
    ...userClientBasicAuthLines,
    ""
  ].join("\n");
}

function buildUserClientBasicAuthStartCheck(profile) {
  if (
    !requireUserClientBasicAuth ||
    !profile.runtimeKinds.includes("human_interface")
  ) {
    return "";
  }

  const message = [
    `Set ${userClientBasicAuthEnvVar} in $SCRIPT_DIR/runner.env`,
    "or the environment before starting this User Client runner."
  ].join(" ");

  return [
    `if [ "\${ENTANGLE_HUMAN_INTERFACE_BASIC_AUTH:-}" = "${userClientBasicAuthPlaceholder}" ]; then`,
    `  echo ${shellQuote(message)} >&2`,
    "  exit 1",
    "fi"
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
${buildUserClientBasicAuthStartCheck(profile)}

export ENTANGLE_RUNNER_STATE_ROOT="\${ENTANGLE_RUNNER_STATE_ROOT:-$SCRIPT_DIR/state}"

cd "$ENTANGLE_REPO_ROOT"
exec pnpm --filter @entangle/runner exec tsx src/index.ts join --config "$SCRIPT_DIR/runner-join.json"
`;
}

function buildRunnerContainerStartScript(profile) {
  return `#!/usr/bin/env sh
set -eu

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"

set -a
# shellcheck disable=SC1091
. "$SCRIPT_DIR/runner.env"
set +a

${hostTokenEnvVar ? `if [ "\${${hostTokenEnvVar}:-}" = "REPLACE_WITH_HOST_TOKEN" ]; then
  echo "Set ${hostTokenEnvVar} in $SCRIPT_DIR/runner.env or the container environment before starting this runner." >&2
  exit 1
fi` : "# Host bearer-token env is not configured for this no-auth proof kit."}
${buildUserClientBasicAuthStartCheck(profile)}

export ENTANGLE_RUNNER_STATE_ROOT="\${ENTANGLE_RUNNER_STATE_ROOT:-$SCRIPT_DIR/state}"

exec node /app/dist/index.js join --config "$SCRIPT_DIR/runner-join.json"
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
    ...buildAgentEngineProfileOperatorCommands(),
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
    "run_cli user-nodes clients --summary --check-health",
    `run_cli user-nodes message ${shellQuote(userNodeId)} ${shellQuote(agentNodeId)} ${shellQuote("Implement a small change and report what you changed.")} --message-type task.request --compact`,
    "run_cli host projection --summary",
    '"$SCRIPT_DIR/verify-topology.sh"',
    ""
  );

  return `${lines.join("\n")}\n`;
}

function buildRunnerComposeServiceName(profile) {
  return profile.directory.replace(/[^a-zA-Z0-9_-]/gu, "-");
}

function buildRunnerComposeYaml() {
  const services = runnerProfiles
    .map((profile) => {
      const serviceName = buildRunnerComposeServiceName(profile);
      return [
        `  ${serviceName}:`,
        `    image: ${runnerComposeImage}`,
        "    command:",
        "      - /bin/sh",
        `      - /proof/${profile.directory}/start-container.sh`,
        "    volumes:",
        `      - ./${profile.directory}:/proof/${profile.directory}`,
        "    extra_hosts:",
        "      - host.docker.internal:host-gateway",
        "    networks:",
        "      - proof"
      ].join("\n");
    })
    .join("\n\n");
  const network = runnerComposeExternalNetwork
    ? [
        "  proof:",
        `    name: ${runnerComposeNetwork}`,
        "    external: true"
      ].join("\n")
    : ["  proof:", `    name: ${runnerComposeNetwork}`].join("\n");

  return [
    "services:",
    services,
    "",
    "networks:",
    network,
    ""
  ].join("\n");
}

function buildAgentEngineProfileOperatorCommands() {
  if (fakeOpenCodeServerUrl) {
    return buildFakeOpenCodeOperatorCommands();
  }

  if (externalProcessEngineExecutable || externalHttpEngineUrl) {
    return buildCustomAgentEngineOperatorCommands();
  }

  return [];
}

function buildFakeOpenCodeOperatorCommands() {
  if (!fakeOpenCodeServerUrl) {
    return [];
  }

  return [
    [
      "run_cli host catalog agent-engine upsert",
      shellQuote(fakeOpenCodeProfileId),
      "--kind opencode_server",
      "--display-name",
      shellQuote("Distributed Fake OpenCode"),
      "--base-url",
      shellQuote(fakeOpenCodeServerUrl),
      "--permission-mode entangle_approval",
      "--state-scope node",
      "--set-default",
      "--summary"
    ].join(" "),
    [
      "run_cli host nodes agent-runtime",
      shellQuote(agentNodeId),
      "--mode coding_agent",
      "--engine-profile-ref",
      shellQuote(fakeOpenCodeProfileId),
      "--summary"
    ].join(" "),
    ""
  ];
}

function buildCustomAgentEngineOperatorCommands() {
  const engineKind = configuredCustomAgentEngineKind;

  if (!engineKind) {
    return [];
  }

  const profileDisplayName =
    engineKind === "external_http"
      ? "Distributed External HTTP"
      : "Distributed External Process";
  const profileArgs =
    engineKind === "external_http"
      ? ["--base-url", shellQuote(externalHttpEngineUrl)]
      : ["--executable", shellQuote(externalProcessEngineExecutable)];

  return [
    [
      "run_cli host catalog agent-engine upsert",
      shellQuote(customAgentEngineProfileId),
      "--kind",
      engineKind,
      "--display-name",
      shellQuote(profileDisplayName),
      ...profileArgs,
      "--state-scope node",
      "--set-default",
      "--summary"
    ].join(" "),
    [
      "run_cli host nodes agent-runtime",
      shellQuote(agentNodeId),
      "--mode coding_agent",
      "--engine-profile-ref",
      shellQuote(customAgentEngineProfileId),
      "--summary"
    ].join(" "),
    ""
  ];
}

function buildVerifierCommand(options = {}) {
  const profileFile = options.profileFile ?? "proof-profile.json";
  const junitReportFile = options.junitReportFile ?? "topology.xml";
  const args = [
    `pnpm ops:distributed-proof-verify --profile "$SCRIPT_DIR/${profileFile}"`,
    '--host-url "$ENTANGLE_HOST_URL"',
    "--check-user-client-health",
    "--require-conversation",
    `\${ENTANGLE_PROOF_JUNIT_DIR:+--junit "$ENTANGLE_PROOF_JUNIT_DIR/${junitReportFile}"}`
  ];

  if (checkGitBackendHealth) {
    args.push("--check-git-backend-health");
  }

  if (checkRelayHealth) {
    args.push("--check-relay-health");
  }

  if (requireExternalUserClientUrls) {
    args.push("--require-external-user-client-urls");
  }

  if (requireExternalHostUrl) {
    args.push("--require-external-host-url");
  }

  if (options.requireArtifactEvidence) {
    args.push("--require-artifact-evidence");
    args.push("--require-published-git-artifact");
    if (checkPublishedGitRef) {
      args.push("--check-published-git-ref");
    }
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

function buildProofProfile(options = {}) {
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
    ...(options.checkPublishedGitRef ? { checkPublishedGitRef: true } : {}),
    checkUserClientHealth: true,
    ...(requireExternalHostUrl ? { requireExternalHostUrl: true } : {}),
    ...(requireExternalUserClientUrls
      ? { requireExternalUserClientUrls: true }
      : {}),
    ...(gitServiceRefs.length > 0 ? { gitServiceRefs } : {}),
    hostUrl,
    relayUrls,
    requireConversation: true,
    ...(options.requireArtifactEvidence ? { requireArtifactEvidence: true } : {}),
    ...(options.requirePublishedGitArtifact
      ? { requirePublishedGitArtifact: true }
      : {}),
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

${buildFakeOpenCodeReadmeSection()}
${buildCustomAgentEngineReadmeSection()}

## Machine Steps

1. Keep Host running on the Host machine with a graph containing the node ids in
   the table, reachable relay configuration, reachable git artifact backend,
   and an operator token if Host auth is enabled.
2. Copy each runner directory to its intended runner machine.
3. On each runner machine, set \`ENTANGLE_REPO_ROOT\` to that machine's Entangle
   checkout, edit \`runner.env\` if the Host token is not written, then run
   \`./start.sh\` from that runner directory.
   If the kit was generated with \`--require-user-client-basic-auth\`, set
   \`${userClientBasicAuthEnvVar}\` to \`username:password\` for each User Node
   runner before starting it.
4. After the runners publish \`runner.hello\`, run
   \`operator/commands.sh\` from the Host/operator machine to trust runners,
   offer assignments, list User Client URLs, send a signed User Node task, and
   inspect Host projection and run the distributed proof verifier.
5. After the agent has produced projected work evidence, run
   \`operator/verify-artifacts.sh\` from the Host/operator machine to require
   projected artifact, source-change, source-history, or wiki evidence plus
   published git artifact/source-history publication evidence from the agent
   node.
   If this kit was generated with \`--check-published-git-ref\`, the post-work
   verifier also runs \`git ls-remote\` from the operator machine against
   projected published git artifact locators.

Set \`ENTANGLE_PROOF_JUNIT_DIR\` before running \`operator/verify-topology.sh\`
or \`operator/verify-artifacts.sh\` to persist JUnit XML reports named
\`topology.xml\` and \`artifacts.xml\` in that directory.

${buildRunnerComposeReadmeSection()}

## Files

- \`agent-runner/runner-join.json\`: generic agent runner join config for the configured engine kind(s).
- \`user-runner/runner-join.json\`: primary User Node Human Interface Runtime join config.
- \`reviewer-user-runner/runner-join.json\`: reviewer User Node Human Interface Runtime join config.
- \`*/runner.env\`: runner-local Nostr secret and Host token placeholder or value.
  User Node runner env files also contain a User Client Basic Auth placeholder
  when the kit is generated with \`--require-user-client-basic-auth\`.
- \`*/start.sh\`: runner-machine start command.
- \`operator/operator.env\`: Host URL and Host token placeholder or value.
- \`operator/proof-profile.json\`: machine-readable runner, node, engine, relay, optional git-service, conversation, and User Client health profile for topology verification.
- \`operator/proof-profile-post-work.json\`: stricter profile that also requires projected work evidence and a published git artifact or source-history publication from the agent node.
- \`operator/commands.sh\`: operator commands for trust, assignment, user message, projection, and verification.
- \`operator/verify-topology.sh\`: repeatable topology, runtime, conversation, and optional relay/git verification.
- \`operator/verify-artifacts.sh\`: post-work verifier requiring projected artifact/source/wiki evidence and published git artifact evidence from the agent node.
${writeRunnerCompose ? "- `docker-compose.runners.yml`: optional same-machine runner-container proof boundary for the three generated runner directories.\n- `*/start-container.sh`: container-native runner entrypoint used by `docker-compose.runners.yml`.\n" : ""}

The generated runner join configs use the same generic \`entangle-runner join\`
path as local process and Docker proofs. If this kit only works when copied to
the Host machine, the proof has failed.
`;
}

function buildRunnerComposeReadmeSection() {
  if (!writeRunnerCompose) {
    return "";
  }

  const networkMode = runnerComposeExternalNetwork
    ? `external Docker network \`${runnerComposeNetwork}\``
    : `generated Docker network \`${runnerComposeNetwork}\``;

  return `## Optional Runner Compose Boundary

This kit also includes \`docker-compose.runners.yml\` for a same-machine proof
that still puts each runner behind a container boundary. Build or pull
\`${runnerComposeImage}\`, make sure the generated Host and relay URLs are
reachable from containers, then run:

\`\`\`bash
docker compose -f docker-compose.runners.yml up
\`\`\`

The generated runner services use the ${networkMode}. If Host, relay, or git
are already running in another Docker network, generate the kit with
\`--runner-compose-network <network>\` and
\`--runner-compose-external-network\`, or use Host/relay URLs reachable through
\`host.docker.internal\`.

`;
}

function buildFakeOpenCodeReadmeSection() {
  if (!fakeOpenCodeServerUrl) {
    return "";
  }

  const authFlags =
    fakeOpenCodeUsername && fakeOpenCodePassword
      ? ` --username ${shellQuote(fakeOpenCodeUsername)} --password ${shellQuote(fakeOpenCodePassword)}`
      : "";

  return `## Attached Fake OpenCode Path

This kit was generated with an attached fake OpenCode server profile:

- profile id: \`${fakeOpenCodeProfileId}\`
- base URL: \`${fakeOpenCodeServerUrl}\`

Start the deterministic fake server somewhere reachable from the agent runner.
For a server on the same machine as the agent runner:

\`\`\`bash
pnpm ops:fake-opencode-server -- --host 127.0.0.1 --port 18081${authFlags}
\`\`\`

\`operator/commands.sh\` upserts that profile through Host and binds
\`${agentNodeId}\` to it before runner assignment. The agent runner env file
contains the optional \`OPENCODE_SERVER_USERNAME\` and
\`OPENCODE_SERVER_PASSWORD\` values when they were supplied while generating
the kit.
`;
}

function buildCustomAgentEngineReadmeSection() {
  if (!configuredCustomAgentEngineKind) {
    return "";
  }

  const target =
    configuredCustomAgentEngineKind === "external_http"
      ? externalHttpEngineUrl
      : externalProcessEngineExecutable;
  const setupDescription =
    configuredCustomAgentEngineKind === "external_http"
      ? "POST endpoint"
      : "runner-machine executable";

  return `## Custom Agent Engine Path

This kit was generated with a custom ${configuredCustomAgentEngineKind} profile:

- profile id: \`${customAgentEngineProfileId}\`
- ${setupDescription}: \`${target}\`

\`operator/commands.sh\` upserts that profile through Host and binds
\`${agentNodeId}\` to it before runner assignment. The custom engine must
implement Entangle's shared \`AgentEngineTurnRequest\`/\`AgentEngineTurnResult\`
contract.
`;
}

async function writeKit() {
  if (dryRun) {
    console.log(`[dry-run] output: ${outputDir}`);
    for (const profile of runnerProfiles) {
      run(`Generate ${profile.id} join config`, "pnpm", buildRunnerJoinConfigArgs(profile));
    }
    if (fakeOpenCodeServerUrl) {
      console.log(
        `[dry-run] fake OpenCode profile: ${fakeOpenCodeProfileId} -> ${fakeOpenCodeServerUrl}`
      );
      console.log(
        `[dry-run] fake OpenCode operator setup: ${
          buildFakeOpenCodeOperatorCommands().filter(Boolean).join(" && ")
        }`
      );
      console.log(
        `[dry-run] fake OpenCode runner env: ${
          fakeOpenCodeUsername ? "OPENCODE_SERVER_USERNAME" : "no username"
        }, ${fakeOpenCodePassword ? "OPENCODE_SERVER_PASSWORD" : "no password"}`
      );
    }
    if (configuredCustomAgentEngineKind) {
      console.log(
        `[dry-run] custom agent engine profile: ${customAgentEngineProfileId} (${configuredCustomAgentEngineKind})`
      );
      console.log(
        `[dry-run] custom agent engine operator setup: ${
          buildCustomAgentEngineOperatorCommands().filter(Boolean).join(" && ")
        }`
      );
    }
    if (requireUserClientBasicAuth) {
      const authEnvSummary =
        "User Client Basic Auth required for human-interface runners via " +
        userClientBasicAuthEnvVar;
      console.log(
        `[dry-run] ${authEnvSummary}`
      );
    }
    if (writeRunnerCompose) {
      console.log(
        `[dry-run] runner compose: docker-compose.runners.yml (${runnerComposeImage}, network ${runnerComposeNetwork}${runnerComposeExternalNetwork ? ", external" : ""})`
      );
    }
    console.log(
      "[dry-run] operator client health command: run_cli user-nodes clients --summary --check-health"
    );
    console.log(`[dry-run] operator verifier command: ${buildVerifierCommand()}`);
    console.log(
      `[dry-run] operator artifact verifier command: ${buildVerifierCommand({
        junitReportFile: "artifacts.xml",
        profileFile: "proof-profile-post-work.json",
        requireArtifactEvidence: true
      })}`
    );
    console.log(`[dry-run] operator proof profile: ${JSON.stringify(buildProofProfile())}`);
    console.log(
      `[dry-run] operator post-work proof profile: ${JSON.stringify(
        buildProofProfile({
          checkPublishedGitRef,
          requireArtifactEvidence: true,
          requirePublishedGitArtifact: true
        })
      )}`
    );
    console.log(
      `[dry-run] would write runner env/start scripts${
        writeRunnerCompose ? ", runner compose files" : ""
      }, operator commands, verifier scripts, and README.`
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
    if (writeRunnerCompose) {
      await writeExecutable(
        path.join(profileDir, "start-container.sh"),
        buildRunnerContainerStartScript(profile)
      );
    }
  }

  const operatorDir = path.join(outputDir, "operator");
  await mkdir(operatorDir, { recursive: true });
  await writeFile(path.join(operatorDir, "operator.env"), buildOperatorEnvContent(), "utf8");
  await writeFile(
    path.join(operatorDir, "proof-profile.json"),
    `${JSON.stringify(buildProofProfile(), null, 2)}\n`,
    "utf8"
  );
  await writeFile(
    path.join(operatorDir, "proof-profile-post-work.json"),
    `${JSON.stringify(
      buildProofProfile({
        checkPublishedGitRef,
        requireArtifactEvidence: true,
        requirePublishedGitArtifact: true
      }),
      null,
      2
    )}\n`,
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
      junitReportFile: "artifacts.xml",
      profileFile: "proof-profile-post-work.json",
      requireArtifactEvidence: true
    })
  );
  await writeFile(path.join(outputDir, "README.md"), buildReadme(), "utf8");
  if (writeRunnerCompose) {
    await writeFile(
      path.join(outputDir, "docker-compose.runners.yml"),
      buildRunnerComposeYaml(),
      "utf8"
    );
  }
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

  if (requireExternalHostUrl && !isExternalHttpUrl(hostUrl)) {
    throw new Error(
      "--require-external-host-url requires --host-url to be a non-loopback http(s) URL reachable from other machines."
    );
  }

  if (fakeOpenCodeServerUrl && !proofAgentEngineKinds.includes("opencode_server")) {
    throw new Error(
      "--fake-opencode-server-url requires the agent runner to advertise opencode_server."
    );
  }

  if (fakeOpenCodeServerUrl && configuredCustomAgentEngineKind) {
    throw new Error(
      "Choose either --fake-opencode-server-url or a custom external agent engine profile, not both."
    );
  }

  if (externalProcessEngineExecutable && externalHttpEngineUrl) {
    throw new Error(
      "Choose either --external-process-engine-executable or --external-http-engine-url, not both."
    );
  }

  if (
    configuredCustomAgentEngineKind &&
    !proofAgentEngineKinds.includes(configuredCustomAgentEngineKind)
  ) {
    throw new Error(
      `--${configuredCustomAgentEngineKind === "external_http" ? "external-http-engine-url" : "external-process-engine-executable"} requires the agent runner to advertise ${configuredCustomAgentEngineKind}.`
    );
  }

  if (
    (fakeOpenCodeUsername && !fakeOpenCodePassword) ||
    (!fakeOpenCodeUsername && fakeOpenCodePassword)
  ) {
    throw new Error(
      "--fake-opencode-username and --fake-opencode-password must be supplied together."
    );
  }

  await writeKit();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

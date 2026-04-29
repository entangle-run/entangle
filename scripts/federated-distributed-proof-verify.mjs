#!/usr/bin/env node

import { setTimeout as delay } from "node:timers/promises";

const rawArgs = process.argv.slice(2);
const help = hasFlag("--help") || hasFlag("-h");
const selfTest = hasFlag("--self-test");
const jsonOutput = hasFlag("--json");
const hostUrl = trimTrailingSlash(
  readFlagValue("--host-url") ??
    process.env.ENTANGLE_HOST_URL ??
    "http://localhost:7071"
);
const hostToken =
  readFlagValue("--host-token") ??
  process.env.ENTANGLE_HOST_TOKEN ??
  process.env.ENTANGLE_HOST_OPERATOR_TOKEN;
const timeoutMs = parsePositiveInteger(readFlagValue("--timeout-ms") ?? "30000");
const pollIntervalMs = parsePositiveInteger(
  readFlagValue("--poll-interval-ms") ?? "1000"
);
const allowStaleRunners = hasFlag("--allow-stale-runners");
const allowNonRunningRuntimes = hasFlag("--allow-non-running-runtimes");
const checkUserClientHealth = hasFlag("--check-user-client-health");
const requireConversation = hasFlag("--require-conversation");
const selfTestRuntimeState =
  (readFlagValue("--self-test-runtime-state") ?? "running").trim() || "running";
const selfTestSharedUserClientUrl = hasFlag("--self-test-shared-user-client-url");
const selfTestWrongRuntimeKind = hasFlag("--self-test-wrong-runtime-kind");
const selfTestWrongAgentEngineKind = hasFlag("--self-test-wrong-agent-engine-kind");
const agentRunnerId = readFlagValue("--agent-runner") ?? "distributed-agent-runner";
const agentEngineKind = readFlagValue("--agent-engine-kind") ?? "opencode_server";
const userRunnerId = readFlagValue("--user-runner") ?? "distributed-user-runner";
const reviewerUserRunnerId =
  readFlagValue("--reviewer-user-runner") ?? "distributed-reviewer-user-runner";
const agentNodeId = readFlagValue("--agent-node") ?? "builder";
const userNodeId = readFlagValue("--user-node") ?? "user";
const reviewerUserNodeId = readFlagValue("--reviewer-user-node") ?? "reviewer";

const expectedProfiles = [
  {
    agentEngineKind,
    assignmentId: `assignment-${agentRunnerId}`,
    nodeId: agentNodeId,
    runnerId: agentRunnerId,
    runtimeKind: "agent_runner"
  },
  {
    assignmentId: `assignment-${userRunnerId}`,
    nodeId: userNodeId,
    runnerId: userRunnerId,
    runtimeKind: "human_interface"
  },
  {
    assignmentId: `assignment-${reviewerUserRunnerId}`,
    nodeId: reviewerUserNodeId,
    runnerId: reviewerUserRunnerId,
    runtimeKind: "human_interface"
  }
];

function usage() {
  console.log(`Usage: pnpm ops:distributed-proof-verify [options]

Verify a distributed Entangle proof from the operator machine.

The verifier reads Host status, runner registry, assignments, and projection
through Host HTTP APIs. It can also check User Client /health endpoints. It
does not read Host or runner files, so it is suitable for the generated
distributed proof kit after the runner directories have been copied to separate
machines and started.

Options:
  --host-url <url>                Reachable Host API URL. Default: ENTANGLE_HOST_URL or http://localhost:7071
  --host-token <token>            Host bearer token. Defaults to ENTANGLE_HOST_TOKEN or ENTANGLE_HOST_OPERATOR_TOKEN.
  --timeout-ms <ms>               Maximum wait time. Default: 30000
  --poll-interval-ms <ms>         Poll interval while waiting. Default: 1000
  --allow-stale-runners           Accept stale runner liveness instead of requiring online runners.
  --allow-non-running-runtimes    Accept runtime projections that are not observed as running.
  --check-user-client-health      Fetch /health for projected User Client URLs.
  --require-conversation          Require a projected conversation from the primary User Node to the agent node.
  --agent-runner <id>             Agent runner id. Default: distributed-agent-runner
  --user-runner <id>              Primary User Node runner id. Default: distributed-user-runner
  --reviewer-user-runner <id>     Reviewer User Node runner id. Default: distributed-reviewer-user-runner
  --agent-engine-kind <kind>       Expected agent runner engine kind. Default: opencode_server
  --agent-node <nodeId>           Agent graph node id. Default: builder
  --user-node <nodeId>            Primary User Node id. Default: user
  --reviewer-user-node <nodeId>   Reviewer User Node id. Default: reviewer
  --json                          Print machine-readable result.
  --self-test                     Verify the verifier against an embedded passing fixture.
  --self-test-runtime-state <s>    Runtime observedState to use in the self-test fixture. Default: running
  --self-test-shared-user-client-url
                                  Use one User Client URL for both Human Interface Runtime fixtures.
  --self-test-wrong-runtime-kind   Make the agent runner advertise the wrong runtime kind.
  --self-test-wrong-agent-engine-kind
                                  Make the agent runner advertise the wrong agent engine kind.
  -h, --help                      Show this help.

Examples:
  ENTANGLE_HOST_TOKEN=dev-token pnpm ops:distributed-proof-verify --host-url http://host.example:7071 --check-user-client-health
  pnpm ops:distributed-proof-verify --self-test --json
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

function parsePositiveInteger(value) {
  const parsed = Number.parseInt(value, 10);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Expected a positive integer, received '${value}'.`);
  }

  return parsed;
}

function trimTrailingSlash(value) {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function getArray(value, key) {
  return isObject(value) && Array.isArray(value[key]) ? value[key] : [];
}

function addCheck(checks, name, ok, detail) {
  checks.push({
    detail,
    name,
    ok
  });
}

async function fetchJson(path) {
  const response = await fetch(`${hostUrl}${path}`, {
    headers: {
      ...(hostToken ? { authorization: `Bearer ${hostToken}` } : {})
    }
  });

  if (!response.ok) {
    throw new Error(`GET ${path} failed with HTTP ${response.status}: ${await response.text()}`);
  }

  return response.json();
}

async function fetchSnapshot() {
  if (selfTest) {
    return buildSelfTestSnapshot();
  }

  const [status, runners, assignments, projection] = await Promise.all([
    fetchJson("/v1/host/status"),
    fetchJson("/v1/runners"),
    fetchJson("/v1/assignments"),
    fetchJson("/v1/projection")
  ]);

  return {
    assignments,
    projection,
    runners,
    status
  };
}

function buildSelfTestSnapshot() {
  const now = new Date().toISOString();

  return {
    assignments: {
      assignments: expectedProfiles.map((profile) => ({
        acceptedAt: now,
        assignmentId: profile.assignmentId,
        nodeId: profile.nodeId,
        runnerId: profile.runnerId,
        runtimeKind: profile.runtimeKind,
        status: "active",
        updatedAt: now
      }))
    },
    projection: {
      assignmentProjections: expectedProfiles.map((profile) => ({
        assignmentId: profile.assignmentId,
        nodeId: profile.nodeId,
        runnerId: profile.runnerId,
        status: "active"
      })),
      runtimeProjections: expectedProfiles.map((profile) => ({
        assignmentId: profile.assignmentId,
        clientUrl:
          profile.runtimeKind === "human_interface"
            ? selfTestSharedUserClientUrl
              ? "http://127.0.0.1/shared-user-client"
              : `http://127.0.0.1/${profile.nodeId}`
            : undefined,
        nodeId: profile.nodeId,
        observedState: selfTestRuntimeState,
        runnerId: profile.runnerId
      })),
      runnerProjections: expectedProfiles.map((profile) => ({
        assignmentIds: [profile.assignmentId],
        operationalState: "ready",
        runnerId: profile.runnerId,
        trustState: "trusted"
      })),
      userConversations: [
        {
          conversationId: "conversation-self-test",
          peerNodeId: agentNodeId,
          status: "opened",
          userNodeId
        }
      ]
    },
    runners: {
      runners: expectedProfiles.map((profile) => ({
        heartbeat: {
          assignmentIds: [profile.assignmentId],
          lastHeartbeatAt: now,
          operationalState: "ready"
        },
        liveness: "online",
        registration: {
          capabilities: {
            agentEngineKinds:
              selfTestWrongAgentEngineKind && profile.nodeId === agentNodeId
                ? [
                    profile.agentEngineKind === "opencode_server"
                      ? "external_process"
                      : "opencode_server"
                  ]
                : profile.agentEngineKind
                  ? [profile.agentEngineKind]
                  : [],
            runtimeKinds:
              selfTestWrongRuntimeKind && profile.nodeId === agentNodeId
                ? ["human_interface"]
                : [profile.runtimeKind]
          },
          runnerId: profile.runnerId,
          trustState: "trusted"
        }
      }))
    },
    status: {
      authority: {
        publicKey: "self-test-authority"
      },
      status: "ok"
    }
  };
}

function findRunnerEntry(snapshot, runnerId) {
  return getArray(snapshot.runners, "runners").find(
    (entry) => entry?.registration?.runnerId === runnerId
  );
}

function findAssignment(snapshot, profile) {
  return getArray(snapshot.assignments, "assignments").find(
    (assignment) =>
      assignment?.nodeId === profile.nodeId &&
      assignment?.runnerId === profile.runnerId
  );
}

function findAssignmentProjection(snapshot, profile) {
  return getArray(snapshot.projection, "assignmentProjections").find(
    (assignment) =>
      assignment?.nodeId === profile.nodeId &&
      assignment?.runnerId === profile.runnerId
  );
}

function findRuntimeProjection(snapshot, profile) {
  return getArray(snapshot.projection, "runtimeProjections").find(
    (runtime) =>
      runtime?.nodeId === profile.nodeId && runtime?.runnerId === profile.runnerId
  );
}

function isAcceptedAssignmentStatus(status) {
  return status === "accepted" || status === "active";
}

function isAcceptedLiveness(liveness) {
  return allowStaleRunners
    ? liveness === "online" || liveness === "stale"
    : liveness === "online";
}

function findDuplicateValues(values) {
  const seen = new Set();
  const duplicates = new Set();

  for (const value of values) {
    if (seen.has(value)) {
      duplicates.add(value);
      continue;
    }

    seen.add(value);
  }

  return [...duplicates].sort();
}

async function checkHealth(url) {
  if (selfTest) {
    return {
      ok: true,
      status: 200
    };
  }

  const response = await fetch(new URL("/health", url));

  return {
    ok: response.ok,
    status: response.status
  };
}

async function evaluateSnapshot(snapshot) {
  const checks = [];
  const userClientUrls = [];
  const authorityPubkey = snapshot.status?.authority?.publicKey;
  addCheck(
    checks,
    "host authority",
    typeof authorityPubkey === "string" && authorityPubkey.length > 0,
    authorityPubkey ? `authority=${authorityPubkey}` : "missing authority"
  );

  for (const profile of expectedProfiles) {
    const runner = findRunnerEntry(snapshot, profile.runnerId);
    addCheck(
      checks,
      `runner ${profile.runnerId} registered`,
      Boolean(runner),
      runner ? `liveness=${runner.liveness}` : "missing runner registry entry"
    );

    if (runner) {
      addCheck(
        checks,
        `runner ${profile.runnerId} trusted`,
        runner.registration?.trustState === "trusted",
        `trustState=${runner.registration?.trustState ?? "unknown"}`
      );
      addCheck(
        checks,
        `runner ${profile.runnerId} live`,
        isAcceptedLiveness(runner.liveness),
        `liveness=${runner.liveness ?? "unknown"}`
      );
      addCheck(
        checks,
        `runner ${profile.runnerId} supports ${profile.runtimeKind}`,
        Array.isArray(runner.registration?.capabilities?.runtimeKinds) &&
          runner.registration.capabilities.runtimeKinds.includes(profile.runtimeKind),
        `runtimeKinds=${
          (runner.registration?.capabilities?.runtimeKinds ?? []).join(",") ||
          "none"
        }`
      );
      if (profile.agentEngineKind) {
        addCheck(
          checks,
          `runner ${profile.runnerId} supports ${profile.agentEngineKind}`,
          Array.isArray(runner.registration?.capabilities?.agentEngineKinds) &&
            runner.registration.capabilities.agentEngineKinds.includes(
              profile.agentEngineKind
            ),
          `agentEngineKinds=${
            (runner.registration?.capabilities?.agentEngineKinds ?? []).join(
              ","
            ) || "none"
          }`
        );
      }
      addCheck(
        checks,
        `runner ${profile.runnerId} heartbeat assignment`,
        Array.isArray(runner.heartbeat?.assignmentIds) &&
          runner.heartbeat.assignmentIds.includes(profile.assignmentId),
        `assignments=${(runner.heartbeat?.assignmentIds ?? []).join(",") || "none"}`
      );
    }

    const assignment = findAssignment(snapshot, profile);
    addCheck(
      checks,
      `assignment ${profile.nodeId} -> ${profile.runnerId}`,
      Boolean(assignment) && isAcceptedAssignmentStatus(assignment.status),
      assignment
        ? `assignment=${assignment.assignmentId}; status=${assignment.status}`
        : "missing assignment"
    );

    const assignmentProjection = findAssignmentProjection(snapshot, profile);
    addCheck(
      checks,
      `assignment projection ${profile.nodeId}`,
      Boolean(assignmentProjection) &&
        isAcceptedAssignmentStatus(assignmentProjection.status),
      assignmentProjection
        ? `status=${assignmentProjection.status}`
        : "missing assignment projection"
    );

    const runtimeProjection = findRuntimeProjection(snapshot, profile);
    addCheck(
      checks,
      `runtime projection ${profile.nodeId}`,
      Boolean(runtimeProjection),
      runtimeProjection
        ? `observed=${runtimeProjection.observedState ?? "unknown"}`
        : "missing runtime projection"
    );

    if (runtimeProjection) {
      const observedState = runtimeProjection.observedState ?? "unknown";
      addCheck(
        checks,
        `runtime ${profile.nodeId} running`,
        allowNonRunningRuntimes || observedState === "running",
        allowNonRunningRuntimes
          ? `observed=${observedState}; non-running runtimes allowed`
          : `observed=${observedState}`
      );
    }

    if (profile.runtimeKind === "human_interface") {
      const clientUrl = runtimeProjection?.clientUrl;
      addCheck(
        checks,
        `user client url ${profile.nodeId}`,
        typeof clientUrl === "string" && clientUrl.length > 0,
        clientUrl ?? "missing clientUrl"
      );

      if (typeof clientUrl === "string" && clientUrl.length > 0) {
        userClientUrls.push(clientUrl);
      }

      if (checkUserClientHealth && typeof clientUrl === "string") {
        const health = await checkHealth(clientUrl);
        addCheck(
          checks,
          `user client health ${profile.nodeId}`,
          health.ok,
          `${clientUrl}/health -> ${health.status}`
        );
      }
    }
  }

  const expectedUserClientCount = expectedProfiles.filter(
    (profile) => profile.runtimeKind === "human_interface"
  ).length;

  if (expectedUserClientCount > 1) {
    const duplicateUserClientUrls = findDuplicateValues(userClientUrls);
    addCheck(
      checks,
      "user client urls distinct",
      duplicateUserClientUrls.length === 0,
      duplicateUserClientUrls.length > 0
        ? `duplicate urls=${duplicateUserClientUrls.join(",")}`
        : `urls=${userClientUrls.join(",") || "none"}`
    );
  }

  if (requireConversation) {
    const conversation = getArray(snapshot.projection, "userConversations").find(
      (record) =>
        record?.userNodeId === userNodeId && record?.peerNodeId === agentNodeId
    );
    addCheck(
      checks,
      `conversation ${userNodeId} -> ${agentNodeId}`,
      Boolean(conversation),
      conversation
        ? `conversation=${conversation.conversationId}`
        : "missing projected conversation"
    );
  }

  return {
    checks,
    ok: checks.every((check) => check.ok)
  };
}

function printResult(result) {
  if (jsonOutput) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  for (const check of result.checks) {
    console.log(`[${check.ok ? "pass" : "fail"}] ${check.name}: ${check.detail}`);
  }

  console.log(
    result.ok
      ? "Distributed proof verification passed."
      : "Distributed proof verification failed."
  );
}

async function verifyUntilReady() {
  if (selfTest) {
    return evaluateSnapshot(await fetchSnapshot());
  }

  const startedAt = Date.now();
  let lastResult;
  let lastError;

  while (Date.now() - startedAt <= timeoutMs) {
    try {
      const snapshot = await fetchSnapshot();
      lastResult = await evaluateSnapshot(snapshot);
      lastError = undefined;

      if (lastResult.ok) {
        return lastResult;
      }
    } catch (error) {
      lastError = error;
      lastResult = undefined;
    }

    await delay(pollIntervalMs);
  }

  if (lastResult) {
    return lastResult;
  }

  throw lastError ?? new Error("Verifier timed out before collecting a snapshot.");
}

if (help) {
  usage();
  process.exit(0);
}

try {
  const result = await verifyUntilReady();
  printResult(result);
  process.exit(result.ok ? 0 : 1);
} catch (error) {
  if (jsonOutput) {
    console.log(
      JSON.stringify(
        {
          error: error instanceof Error ? error.message : String(error),
          ok: false
        },
        null,
        2
      )
    );
  } else {
    console.error(error instanceof Error ? error.message : String(error));
  }
  process.exit(1);
}

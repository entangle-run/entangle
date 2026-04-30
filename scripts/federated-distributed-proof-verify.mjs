#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { setTimeout as delay } from "node:timers/promises";
import { normalizeDistributedProofProfile } from "./distributed-proof-profile.mjs";

const rawArgs = process.argv.slice(2);
const help = hasFlag("--help") || hasFlag("-h");
const proofProfilePath = readFlagValue("--profile");
const proofProfile = help ? undefined : readProofProfile(proofProfilePath);
const selfTest = hasFlag("--self-test");
const jsonOutput = hasFlag("--json");
const hostUrl = trimTrailingSlash(
  readFlagValue("--host-url") ??
    readProofProfileString("hostUrl") ??
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
const checkRelayHealth =
  hasFlag("--check-relay-health") || readProofProfileBoolean("checkRelayHealth");
const checkGitBackendHealth =
  hasFlag("--check-git-backend-health") ||
  readProofProfileBoolean("checkGitBackendHealth");
const checkPublishedGitRefHealth =
  hasFlag("--check-published-git-ref") ||
  readProofProfileBoolean("checkPublishedGitRef");
const checkUserClientHealth =
  hasFlag("--check-user-client-health") ||
  readProofProfileBoolean("checkUserClientHealth");
const requireConversation =
  hasFlag("--require-conversation") ||
  readProofProfileBoolean("requireConversation");
const requireArtifactEvidence =
  hasFlag("--require-artifact-evidence") ||
  readProofProfileBoolean("requireArtifactEvidence");
const requirePublishedGitArtifact =
  hasFlag("--require-published-git-artifact") ||
  readProofProfileBoolean("requirePublishedGitArtifact");
const selfTestRuntimeState =
  (readFlagValue("--self-test-runtime-state") ?? "running").trim() || "running";
const selfTestSharedUserClientUrl = hasFlag("--self-test-shared-user-client-url");
const selfTestFileGitBackend = hasFlag("--self-test-file-git-backend");
const selfTestWithoutArtifactEvidence = hasFlag(
  "--self-test-without-artifact-evidence"
);
const selfTestWrongRuntimeKind = hasFlag("--self-test-wrong-runtime-kind");
const selfTestWrongAgentEngineKind = hasFlag("--self-test-wrong-agent-engine-kind");
const selfTestWrongPublishedGitRef = hasFlag("--self-test-wrong-published-git-ref");
const agentRunnerId =
  readFlagValue("--agent-runner") ??
  readProofProfileString("agentRunnerId") ??
  "distributed-agent-runner";
const agentEngineKind =
  readFlagValue("--agent-engine-kind") ??
  readProofProfileString("agentEngineKind") ??
  "opencode_server";
const userRunnerId =
  readFlagValue("--user-runner") ??
  readProofProfileString("userRunnerId") ??
  "distributed-user-runner";
const reviewerUserRunnerId =
  readFlagValue("--reviewer-user-runner") ??
  readProofProfileString("reviewerUserRunnerId") ??
  "distributed-reviewer-user-runner";
const agentNodeId =
  readFlagValue("--agent-node") ?? readProofProfileString("agentNodeId") ?? "builder";
const userNodeId =
  readFlagValue("--user-node") ?? readProofProfileString("userNodeId") ?? "user";
const reviewerUserNodeId =
  readFlagValue("--reviewer-user-node") ??
  readProofProfileString("reviewerUserNodeId") ??
  "reviewer";
const requestedRelayUrls = splitRepeatedValues(readFlagValues("--relay-url"));
const relayUrls =
  requestedRelayUrls.length > 0 ? requestedRelayUrls : readProofProfileStringArray("relayUrls");
const requestedGitServiceRefs = splitRepeatedValues(readFlagValues("--git-service-ref"));
const gitServiceRefs =
  requestedGitServiceRefs.length > 0
    ? requestedGitServiceRefs
    : readProofProfileStringArray("gitServiceRefs");

const defaultExpectedProfiles = [
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
const expectedProfiles = buildExpectedProfilesFromProofProfile();

function usage() {
  console.log(`Usage: pnpm ops:distributed-proof-verify [options]

Verify a distributed Entangle proof from the operator machine.

The verifier reads Host status, runner registry, assignments, and projection
through Host HTTP APIs. It can also check User Client /health endpoints. It
does not read Host or runner files, so it is suitable for the generated
distributed proof kit after the runner directories have been copied to separate
machines and started.

Options:
  --profile <file>                Proof profile JSON generated by pnpm ops:distributed-proof-kit.
  --host-url <url>                Reachable Host API URL. Default: ENTANGLE_HOST_URL or http://localhost:7071
  --host-token <token>            Host bearer token. Defaults to ENTANGLE_HOST_TOKEN or ENTANGLE_HOST_OPERATOR_TOKEN.
  --timeout-ms <ms>               Maximum wait time. Default: 30000
  --poll-interval-ms <ms>         Poll interval while waiting. Default: 1000
  --allow-stale-runners           Accept stale runner liveness instead of requiring online runners.
  --allow-non-running-runtimes    Accept runtime projections that are not observed as running.
  --relay-url <url>               Relay URL for optional health checks. May be repeated or comma-separated. Defaults to profile relayUrls.
  --check-relay-health            Open each configured relay WebSocket.
  --git-service-ref <id>          Git service ref for optional health checks. May be repeated or comma-separated. Defaults to profile gitServiceRefs or Host catalog default.
  --check-git-backend-health      Check expected Host catalog git services and their public base URLs, and reject file-backed git remotes for distributed proof.
  --check-published-git-ref       Run git ls-remote against projected published git artifact refs from the agent node.
  --check-user-client-health      Fetch /health for projected User Client URLs. Defaults to profile checkUserClientHealth.
  --require-conversation          Require a projected conversation from the primary User Node to the agent node. Defaults to profile requireConversation.
  --require-artifact-evidence     Require projected artifact/source/wiki evidence from the agent node.
  --require-published-git-artifact
                                  Require a projected published git artifact or source-history publication from the agent node.
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
  --self-test-file-git-backend     Use a file-backed git service in the self-test fixture.
  --self-test-without-artifact-evidence
                                  Omit projected artifact/source/wiki evidence from the self-test fixture.
  --self-test-wrong-runtime-kind   Make the agent runner advertise the wrong runtime kind.
  --self-test-wrong-agent-engine-kind
                                  Make the agent runner advertise the wrong agent engine kind.
  --self-test-wrong-published-git-ref
                                  Make the published git ref self-test fixture advertise the wrong commit.
  -h, --help                      Show this help.

Examples:
  ENTANGLE_HOST_TOKEN=dev-token pnpm ops:distributed-proof-verify --host-url http://host.example:7071 --check-user-client-health
  pnpm ops:distributed-proof-verify --profile .entangle/distributed-proof-kit/operator/proof-profile.json
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

function readProofProfile(filePath) {
  if (!filePath) {
    return undefined;
  }

  const parsed = JSON.parse(readFileSync(filePath, "utf8"));

  if (!isObject(parsed)) {
    throw new Error(`Proof profile '${filePath}' must contain a JSON object.`);
  }

  return normalizeDistributedProofProfile(parsed, {
    sourceLabel: `Proof profile '${filePath}'`
  });
}

function readProofProfileString(key) {
  const value = proofProfile?.[key];

  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
}

function readProofProfileBoolean(key) {
  return proofProfile?.[key] === true;
}

function readProofProfileStringArray(key) {
  const value = proofProfile?.[key];

  return Array.isArray(value)
    ? value.filter((entry) => typeof entry === "string" && entry.trim().length > 0)
    : [];
}

function buildExpectedProfilesFromProofProfile() {
  if (
    !Array.isArray(proofProfile?.assignments) ||
    proofProfile.assignments.length === 0
  ) {
    return defaultExpectedProfiles;
  }

  return proofProfile.assignments.map((assignment) => {
    const defaultProfile = defaultExpectedProfiles.find(
      (profile) =>
        profile.nodeId === assignment.nodeId &&
        profile.runnerId === assignment.runnerId
    );
    const runtimeKind =
      defaultProfile?.runtimeKind ?? selectRuntimeKind(assignment.runtimeKinds);

    return {
      agentEngineKind:
        runtimeKind === "agent_runner" ? agentEngineKind : undefined,
      assignmentId: assignment.assignmentId,
      nodeId: assignment.nodeId,
      runnerId: assignment.runnerId,
      runtimeKind
    };
  });
}

function selectRuntimeKind(runtimeKinds) {
  for (const preferred of [
    "agent_runner",
    "human_interface",
    "service_runner",
    "external_gateway"
  ]) {
    if (runtimeKinds.includes(preferred)) {
      return preferred;
    }
  }

  return runtimeKinds[0];
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
  const catalog =
    checkGitBackendHealth || checkPublishedGitRefHealth
      ? await fetchJson("/v1/catalog")
      : undefined;

  return {
    assignments,
    ...(catalog ? { catalog } : {}),
    projection,
    runners,
    status
  };
}

function buildSelfTestSnapshot() {
  const now = new Date().toISOString();
  const publishedGitCommit = selfTestWrongPublishedGitRef ? "missing123" : "abc123";
  const artifactEvidence = selfTestWithoutArtifactEvidence
    ? {}
    : {
        artifactRefs: [
          {
            artifactId: "artifact-self-test",
            artifactRecord: {
              createdAt: now,
              publication: {
                publishedAt: now,
                remoteName: "origin",
                remoteUrl: "ssh://git@gitea.example:22/team-alpha/builder-artifacts.git",
                state: "published"
              },
              ref: {
                artifactId: "artifact-self-test",
                backend: "git",
                locator: {
                  branch: "main",
                  commit: publishedGitCommit,
                  gitServiceRef: "gitea",
                  namespace: "team-alpha",
                  path: "reports/self-test.md",
                  repositoryName: "builder-artifacts"
                },
                status: "published"
              },
              updatedAt: now
            },
            artifactRef: {
              artifactId: "artifact-self-test",
              backend: "git",
              locator: {
                branch: "main",
                commit: publishedGitCommit,
                gitServiceRef: "gitea",
                namespace: "team-alpha",
                path: "reports/self-test.md",
                repositoryName: "builder-artifacts"
              },
              status: "published"
            },
            nodeId: agentNodeId,
            runnerId: agentRunnerId
          }
        ],
        sourceChangeRefs: [
          {
            candidateId: "candidate-self-test",
            nodeId: agentNodeId,
            runnerId: agentRunnerId,
            status: "proposed"
          }
        ],
        sourceHistoryRefs: [
          {
            history: {
              publication: {
                artifactId: "artifact-self-test",
                branch: "main",
                publication: {
                  publishedAt: now,
                  remoteName: "origin",
                  remoteUrl:
                    "ssh://git@gitea.example:22/team-alpha/builder-artifacts.git",
                  state: "published"
                },
                requestedAt: now
              }
            },
            nodeId: agentNodeId,
            runnerId: agentRunnerId,
            sourceHistoryId: "source-history-self-test"
          }
        ],
        wikiRefs: [
          {
            artifactId: "wiki-artifact-self-test",
            nodeId: agentNodeId,
            runnerId: agentRunnerId
          }
        ]
      };

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
    catalog: {
      catalog: {
        catalogId: "self-test-catalog",
        defaults: {
          gitServiceRef: "gitea",
          relayProfileRefs: []
        },
        gitServices: [
          {
            authMode: "ssh_key",
            baseUrl: "http://gitea.example:3000",
            defaultNamespace: "team-alpha",
            displayName: "Self-test Gitea",
            id: "gitea",
            provisioning: {
              mode: "preexisting"
            },
            remoteBase: selfTestFileGitBackend
              ? "file:///tmp/entangle-proof"
              : "ssh://git@gitea.example:22",
            transportKind: selfTestFileGitBackend ? "file" : "ssh"
          }
        ],
        modelEndpoints: [],
        relays: [],
        schemaVersion: "1"
      },
      validation: {
        issues: [],
        ok: true
      }
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
      ],
      ...artifactEvidence
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

function countNodeProjectionRecords(snapshot, key, nodeId) {
  return getArray(snapshot.projection, key).filter(
    (record) => record?.nodeId === nodeId
  ).length;
}

function isPublishedGitArtifactRecord(record) {
  const artifactRef = record?.artifactRef ?? record?.artifactRecord?.ref;
  const publicationState = record?.artifactRecord?.publication?.state;
  const artifactStatus = artifactRef?.status;

  return (
    artifactRef?.backend === "git" &&
    (publicationState === "published" || artifactStatus === "published")
  );
}

function countPublishedGitArtifactRefs(snapshot, nodeId) {
  return getArray(snapshot.projection, "artifactRefs").filter(
    (record) => record?.nodeId === nodeId && isPublishedGitArtifactRecord(record)
  ).length;
}

function isPublishedSourceHistoryRecord(record) {
  const history = record?.history;
  const publicationRecords = [
    ...(Array.isArray(history?.publications) ? history.publications : []),
    ...(history?.publication ? [history.publication] : [])
  ];

  return publicationRecords.some(
    (publication) => publication?.publication?.state === "published"
  );
}

function countPublishedSourceHistoryRefs(snapshot, nodeId) {
  return getArray(snapshot.projection, "sourceHistoryRefs").filter(
    (record) => record?.nodeId === nodeId && isPublishedSourceHistoryRecord(record)
  ).length;
}

function buildGitRemoteUrl(input) {
  const parsed = new URL(input.remoteBase);
  const basePath = parsed.pathname.replace(/\/+$/, "");
  parsed.pathname = `${basePath}/${input.namespace}/${input.repositoryName}.git`;
  return parsed.toString();
}

function resolveGitRemoteUrlForArtifact(snapshot, artifactRef, artifactRecord) {
  const publicationRemoteUrl = artifactRecord?.publication?.remoteUrl;
  if (typeof publicationRemoteUrl === "string" && publicationRemoteUrl.length > 0) {
    return publicationRemoteUrl;
  }

  const locator = artifactRef?.locator;
  if (
    artifactRef?.backend !== "git" ||
    !locator?.gitServiceRef ||
    !locator?.namespace ||
    !locator?.repositoryName
  ) {
    return undefined;
  }

  const catalog = getCatalog(snapshot);
  const gitService = findGitService(catalog, locator.gitServiceRef);
  if (!gitService?.remoteBase) {
    return undefined;
  }

  return buildGitRemoteUrl({
    namespace: locator.namespace,
    remoteBase: gitService.remoteBase,
    repositoryName: locator.repositoryName
  });
}

function collectPublishedGitArtifactChecks(snapshot, nodeId) {
  return getArray(snapshot.projection, "artifactRefs")
    .filter((record) => record?.nodeId === nodeId && isPublishedGitArtifactRecord(record))
    .map((record) => {
      const artifactRef = record.artifactRef ?? record.artifactRecord?.ref;
      return {
        artifactId: artifactRef?.artifactId ?? record.artifactId ?? "unknown",
        branch: artifactRef?.locator?.branch,
        commit: artifactRef?.locator?.commit,
        remoteUrl: resolveGitRemoteUrlForArtifact(
          snapshot,
          artifactRef,
          record.artifactRecord
        )
      };
    });
}

function redactUrlCredentials(value) {
  try {
    const parsed = new URL(value);
    if (parsed.username || parsed.password) {
      parsed.username = parsed.username ? "***" : "";
      parsed.password = parsed.password ? "***" : "";
    }
    return parsed.toString();
  } catch {
    return value;
  }
}

function verifyPublishedGitRef(input) {
  if (!input.remoteUrl || !input.branch || !input.commit) {
    return {
      detail: `artifact=${input.artifactId}; missing remoteUrl, branch, or commit`,
      ok: false
    };
  }

  const safeRemoteUrl = redactUrlCredentials(input.remoteUrl);

  if (selfTest) {
    const ok = input.branch === "main" && input.commit === "abc123";
    return {
      detail: ok
        ? `self-test ${safeRemoteUrl} ${input.branch} -> ${input.commit}`
        : `self-test missing ${safeRemoteUrl} ${input.branch} -> ${input.commit}`,
      ok
    };
  }

  const result = spawnSync(
    "git",
    ["ls-remote", input.remoteUrl, input.branch, `refs/heads/${input.branch}`],
    {
      encoding: "utf8",
      timeout: 10000
    }
  );

  if (result.error) {
    return {
      detail: `${safeRemoteUrl} ${input.branch}: ${result.error.message}`,
      ok: false
    };
  }

  if (result.status !== 0) {
    const stderr = redactUrlCredentials(result.stderr?.trim() ?? "");
    return {
      detail: `${safeRemoteUrl} ${input.branch}: git ls-remote exited ${
        result.status ?? "unknown"
      }${stderr ? `: ${stderr}` : ""}`,
      ok: false
    };
  }

  const refs = result.stdout
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const found = refs.some((line) => line.startsWith(`${input.commit}\t`));

  return {
    detail: found
      ? `${safeRemoteUrl} ${input.branch} contains ${input.commit}`
      : `${safeRemoteUrl} ${input.branch} did not advertise ${input.commit}`,
    ok: found
  };
}

function getCatalog(snapshot) {
  return isObject(snapshot.catalog) && isObject(snapshot.catalog.catalog)
    ? snapshot.catalog.catalog
    : undefined;
}

function findGitService(catalog, gitServiceRef) {
  return getArray(catalog, "gitServices").find(
    (service) => service?.id === gitServiceRef
  );
}

function resolveGitServiceRefs(catalog) {
  if (gitServiceRefs.length > 0) {
    return gitServiceRefs;
  }

  const defaultGitServiceRef = catalog?.defaults?.gitServiceRef;
  return typeof defaultGitServiceRef === "string" &&
    defaultGitServiceRef.trim().length > 0
    ? [defaultGitServiceRef.trim()]
    : [];
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

async function checkGitServiceBaseUrl(service) {
  if (selfTest) {
    return {
      detail: "self-test git service health",
      ok: true
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort();
  }, 5000);

  try {
    const response = await fetch(service.baseUrl, {
      signal: controller.signal
    });

    return {
      detail: `${service.baseUrl} -> HTTP ${response.status}`,
      ok: response.status < 500
    };
  } catch (error) {
    return {
      detail: error instanceof Error ? error.message : String(error),
      ok: false
    };
  } finally {
    clearTimeout(timer);
  }
}

async function checkRelay(url) {
  if (selfTest) {
    return {
      detail: "self-test relay health",
      ok: true
    };
  }

  return new Promise((resolve) => {
    let settled = false;
    let socket;

    try {
      socket = new WebSocket(url);
    } catch (error) {
      resolve({
        detail: error instanceof Error ? error.message : String(error),
        ok: false
      });
      return;
    }

    const timer = setTimeout(() => {
      settle(false, "timeout");
    }, 5000);

    function settle(ok, detail) {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timer);

      try {
        socket.close(1000, "Entangle distributed proof relay health complete");
      } catch {
        // Ignore close errors after a failed connection attempt.
      }

      resolve({
        detail,
        ok
      });
    }

    socket.addEventListener("open", () => {
      settle(true, "websocket open");
    });
    socket.addEventListener("error", () => {
      settle(false, "websocket error");
    });
  });
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

  if (checkRelayHealth) {
    if (relayUrls.length === 0) {
      addCheck(checks, "relay urls configured", false, "no relay URLs configured");
    }

    for (const relayUrl of relayUrls) {
      const health = await checkRelay(relayUrl);
      addCheck(
        checks,
        `relay health ${relayUrl}`,
        health.ok,
        health.detail
      );
    }
  }

  if (checkGitBackendHealth) {
    const catalog = getCatalog(snapshot);
    addCheck(
      checks,
      "git catalog available",
      Boolean(catalog),
      catalog ? `catalog=${catalog.catalogId ?? "unknown"}` : "missing catalog"
    );

    const effectiveGitServiceRefs = resolveGitServiceRefs(catalog);
    addCheck(
      checks,
      "git service refs configured",
      effectiveGitServiceRefs.length > 0,
      effectiveGitServiceRefs.length > 0
        ? `gitServiceRefs=${effectiveGitServiceRefs.join(",")}`
        : "no git service refs configured"
    );

    for (const gitServiceRef of effectiveGitServiceRefs) {
      const gitService = findGitService(catalog, gitServiceRef);
      addCheck(
        checks,
        `git service ${gitServiceRef} exists`,
        Boolean(gitService),
        gitService
          ? `baseUrl=${gitService.baseUrl}; remoteBase=${gitService.remoteBase}`
          : "missing git service"
      );

      if (gitService) {
        const remoteBase = String(gitService.remoteBase ?? "");
        const transportKind = String(gitService.transportKind ?? "");
        const nonFileRemote =
          transportKind !== "file" && !remoteBase.startsWith("file:");
        addCheck(
          checks,
          `git service ${gitServiceRef} non-file remote`,
          nonFileRemote,
          `transportKind=${transportKind || "unknown"}; remoteBase=${
            remoteBase || "unknown"
          }`
        );

        if (typeof gitService.baseUrl === "string" && gitService.baseUrl.length > 0) {
          const health = await checkGitServiceBaseUrl(gitService);
          addCheck(
            checks,
            `git service ${gitServiceRef} base url health`,
            health.ok,
            health.detail
          );
        } else {
          addCheck(
            checks,
            `git service ${gitServiceRef} base url health`,
            false,
            "missing baseUrl"
          );
        }
      }
    }
  }

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

  if (requireArtifactEvidence) {
    const artifactRefCount = countNodeProjectionRecords(
      snapshot,
      "artifactRefs",
      agentNodeId
    );
    const sourceChangeRefCount = countNodeProjectionRecords(
      snapshot,
      "sourceChangeRefs",
      agentNodeId
    );
    const sourceHistoryRefCount = countNodeProjectionRecords(
      snapshot,
      "sourceHistoryRefs",
      agentNodeId
    );
    const wikiRefCount = countNodeProjectionRecords(snapshot, "wikiRefs", agentNodeId);
    const totalEvidenceCount =
      artifactRefCount +
      sourceChangeRefCount +
      sourceHistoryRefCount +
      wikiRefCount;

    addCheck(
      checks,
      `artifact evidence ${agentNodeId}`,
      totalEvidenceCount > 0,
      `artifactRefs=${artifactRefCount}; sourceChangeRefs=${sourceChangeRefCount}; ` +
        `sourceHistoryRefs=${sourceHistoryRefCount}; wikiRefs=${wikiRefCount}`
    );
  }

  if (requirePublishedGitArtifact) {
    const publishedGitArtifactRefCount = countPublishedGitArtifactRefs(
      snapshot,
      agentNodeId
    );
    const publishedSourceHistoryRefCount = countPublishedSourceHistoryRefs(
      snapshot,
      agentNodeId
    );
    const totalPublishedGitEvidenceCount =
      publishedGitArtifactRefCount + publishedSourceHistoryRefCount;

    addCheck(
      checks,
      `published git artifact ${agentNodeId}`,
      totalPublishedGitEvidenceCount > 0,
      `publishedGitArtifactRefs=${publishedGitArtifactRefCount}; ` +
        `publishedSourceHistoryRefs=${publishedSourceHistoryRefCount}`
    );
  }

  if (checkPublishedGitRefHealth) {
    const publishedGitArtifactChecks = collectPublishedGitArtifactChecks(
      snapshot,
      agentNodeId
    );
    addCheck(
      checks,
      `published git refs configured ${agentNodeId}`,
      publishedGitArtifactChecks.length > 0,
      publishedGitArtifactChecks.length > 0
        ? `artifactRefs=${publishedGitArtifactChecks.length}`
        : "no projected published git artifact refs with locators"
    );

    for (const publishedRef of publishedGitArtifactChecks) {
      const refCheck = verifyPublishedGitRef(publishedRef);
      addCheck(
        checks,
        `published git ref ${publishedRef.artifactId}`,
        refCheck.ok,
        refCheck.detail
      );
    }
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
